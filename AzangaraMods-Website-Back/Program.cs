using System.Net;
using System.Text.Json.Serialization;
using AzangaraMods_Website_Back.Data;
using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Middlewares;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Models.Dto;
using AzangaraMods_Website_Back.Services.Discord;
using AzangaraMods_Website_Back.Services.LevelFiles;
using AzangaraMods_Website_Back.Services.LevelGalleries;
using AzangaraMods_Website_Back.Services.Levels;
using AzangaraMods_Website_Back.Services.Tokens;
using AzangaraMods_Website_Back.Services.Users;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using IPNetwork = Microsoft.AspNetCore.HttpOverrides.IPNetwork;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddDbContextPool<MainDbContext>(options =>options.UseNpgsql(builder.Configuration.GetConnectionString("MainDatabase")));

builder.Services.AddControllersWithViews()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles);

builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<ILevelService, LevelService>();
builder.Services.AddScoped<ILevelFileService, LevelFileService>();
builder.Services.AddScoped<ILevelGalleryService, LevelGalleryService>();
builder.Services.AddScoped<IDiscordService, DiscordService>();
builder.Services.AddSingleton<DiscordQueue>();
builder.Services.AddSingleton<IDiscordQueue>(sp => sp.GetRequiredService<DiscordQueue>());
builder.Services.AddHostedService(sp => sp.GetRequiredService<DiscordQueue>());

builder.Services.AddAutoMapper(cfg =>
{
    cfg.CreateMap<User, UserPublicPartialDto>()
        .ForMember(d => d.VerifiedModder, o => o.MapFrom(s => s.Flags.HasFlag(UserFlags.VerifiedModder)));
    cfg.CreateMap<User, UserProfileDto>()
        .ForMember(d => d.VerifiedModder, o => o.MapFrom(s => s.Flags.HasFlag(UserFlags.VerifiedModder)));
    cfg.CreateMap<User, UserPublicDto>()
        .ForMember(d => d.VerifiedModder, o => o.MapFrom(s => s.Flags.HasFlag(UserFlags.VerifiedModder)));
    cfg.CreateMap<User, UserPrivateDto>()
        .ForMember(d => d.VerifiedModder, o => o.MapFrom(s => s.Flags.HasFlag(UserFlags.VerifiedModder)))
        .ForMember(d => d.Admin, o => o.MapFrom(s => s.Flags.HasFlag(UserFlags.Admin)));
    cfg.CreateMap<Level, LevelPartialDto>();
    cfg.CreateMap<Level, LevelDto>();
    cfg.CreateMap<Level, LevelSearchHitDto>()
        .ForMember(d => d.Downloads, o => o.MapFrom(s => s.LevelFiles == null ? 0 : s.LevelFiles.Sum(f => f.Downloads)))
        .ForMember(d => d.ThumbnailId, o => o.MapFrom(s => s.GalleryFiles == null ? null : s.GalleryFiles.OrderBy(g => g.Id).Select(g => (long?)g.Id).FirstOrDefault()));
    cfg.CreateMap<Level, AdminLevelHitDto>()
        .IncludeBase<Level, LevelSearchHitDto>()
        .ForMember(d => d.FileCount, o => o.MapFrom(s => s.LevelFiles == null ? 0 : s.LevelFiles.Count))
        .ForMember(d => d.HasDiscordMessage, o => o.MapFrom(s => s.DiscordForumMessage.HasValue))
        .ForMember(d => d.LatestFileId, o => o.MapFrom(s => s.LevelFiles == null ? null : s.LevelFiles.OrderByDescending(f => f.UploadDate).Select(f => (long?)f.Id).FirstOrDefault()))
        .ForMember(d => d.LatestFileName, o => o.MapFrom(s => s.LevelFiles == null ? null : s.LevelFiles.OrderByDescending(f => f.UploadDate).Select(f => f.FileName).FirstOrDefault()));
    cfg.CreateMap<GalleryFile, GalleryFileDto>();
    cfg.CreateMap<GalleryFile, GalleryFilePartialDto>();
    cfg.CreateMap<LevelFile, LevelFileDto>();
    cfg.CreateMap<LevelFile, LevelFilePartialDto>();
    cfg.CreateMap<Token, SessionDto>();
});

builder.Services.AddHttpClient();


builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(Environment.GetEnvironmentVariable("FRONT_URL") ?? "");
        policy.AllowAnyHeader();
        policy.AllowAnyMethod();
    });
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
    options.KnownIPNetworks.Add(new (IPAddress.Parse("192.168.0.0"), 16));
    
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<MainDbContext>();
        context.Database.Migrate();
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while migrating the database.");
    }
}

app.UseRouting();

app.UseCors();

app.UseForwardedHeaders();

app.UseMiddleware<AuthMiddleware>();

app.MapControllers().RequireCors();


app.Run();

