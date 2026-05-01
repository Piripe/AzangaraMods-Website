using System.Text.Json.Serialization;
using AzangaraMods_Website_Back.Data;
using AzangaraMods_Website_Back.Middlewares;
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

string[] publicRoutes = ["/register", "/login", "/logout"];

app.UseWhen(context => !publicRoutes.Any(x => context.Request.Path.StartsWithSegments(x)),
    appBuilder => { appBuilder.UseMiddleware<AuthMiddleware>(); });


app.MapControllers().RequireCors();


app.Run();

