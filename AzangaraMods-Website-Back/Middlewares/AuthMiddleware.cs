using AzangaraMods_Website_Back.Attributes;
using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Services.Tokens;

namespace AzangaraMods_Website_Back.Middlewares;

public class AuthMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext ctx, ITokenService tokenService)
    {
        var endpoint = ctx.GetEndpoint();
        
        var user = await tokenService.ValidateToken(ctx.Request.Headers.Authorization.ToString());
        if (user == null)
        {
            var isPublic = endpoint?.Metadata.GetMetadata<PublicAttribute>() != null;
            
            if (isPublic) await next(ctx);
            else ctx.Response.StatusCode = 401;
            return;
        }
        if (endpoint?.Metadata.GetMetadata<AdminAttribute>() != null && !user.Flags.HasFlag(UserFlags.Admin))
        {
            ctx.Response.StatusCode = 403;
            await ctx.Response.WriteAsJsonAsync(new ErrorResponseModel("You are not an admin", ErrorCodes.AdminForbidden));
            return;
        }
        ctx.Items.Add(0, user);
        await next(ctx);
    }
}
