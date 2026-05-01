using AzangaraMods_Website_Back.Services.Tokens;

namespace AzangaraMods_Website_Back.Middlewares;

public class AuthMiddleware(RequestDelegate next)
{

    public async Task InvokeAsync(HttpContext ctx, ITokenService tokenService)
    {
        var user = await tokenService.ValidateToken(ctx.Request.Headers.Authorization.ToString());
        if (user == null)
        {
            ctx.Response.StatusCode = 401;
            return;
        }
        ctx.Items.Add(0, user);
        
        await next(ctx);
    }
}