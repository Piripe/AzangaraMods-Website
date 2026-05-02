using System.Text.Json.Serialization;
using AzangaraMods_Website_Back.Data;
using AzangaraMods_Website_Back.Middlewares;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Models.Dto;
using AzangaraMods_Website_Back.Services.Discord;
using AzangaraMods_Website_Back.Services.Levels;
using AzangaraMods_Website_Back.Services.Tokens;
using AzangaraMods_Website_Back.Services.Users;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddDbContextPool<MainDbContext>(options =>options.UseNpgsql(builder.Configuration.GetConnectionString("MainDatabase")));

builder.Services.AddControllersWithViews()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles);

builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<ILevelService, LevelService>();
builder.Services.AddScoped<IDiscordService, DiscordService>();

builder.Services.AddAutoMapper(cfg =>
{
    cfg.CreateMap<User, UserPublicPartialDto>();
    cfg.CreateMap<User, UserPublicDto>();
    cfg.CreateMap<User, UserPrivateDto>();
    cfg.CreateMap<Level, LevelPartialDto>();
    cfg.CreateMap<Level, LevelDto>();
    cfg.CreateMap<GalleryFile, GalleryFileDto>();
    cfg.CreateMap<GalleryFile, GalleryFilePartialDto>();
    cfg.CreateMap<LevelFile, LevelFileDto>();
    cfg.CreateMap<LevelFile, LevelFilePartialDto>();
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

app.UseCors();

string[] publicRoutes = ["/register", "/login", "/logout", "/download"];

app.UseWhen(context => !publicRoutes.Any(x => context.Request.Path.StartsWithSegments(x)),
    appBuilder => { appBuilder.UseMiddleware<AuthMiddleware>(); });


app.MapControllers().RequireCors();


app.Run();

