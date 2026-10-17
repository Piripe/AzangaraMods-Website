using AzangaraMods_Website_Back.Attributes;
using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Services.Tokens;
using AzangaraMods_Website_Back.Services.Users;
using AzangaraMods_Website_Back.Utils;
using Microsoft.AspNetCore.Mvc;

namespace AzangaraMods_Website_Back.Controllers;

public class AuthController(IUserService userService, ITokenService tokenService) : Controller
{
    public record LoginResponseData(string Token, User User);
    public record LoginRequestData(string Email, string Password);
    
    [HttpPost("/login"), Public]
    public async Task<IActionResult> Login([FromBody] LoginRequestData req)
    {
        var user = await userService.GetUserByEmail(req.Email?.Trim() ?? "");

        if (user == null || !userService.CheckPassword(user, req.Password ?? ""))
        {
            return UnprocessableEntity(new ErrorResponseModel("Invalid email or password", ErrorCodes.AuthLoginInvalid));
        }
        // Only told once the password is right, so it doesn't reveal which emails have an account
        if (user.Flags.HasFlag(UserFlags.Suspended))
            return StatusCode(StatusCodes.Status403Forbidden, new ErrorResponseModel("This account has been suspended by an admin", ErrorCodes.AuthLoginSuspended));

        await userService.Login(user, req.Password ?? "");

        // Logging in brings back an account disabled from the settings
        if (user.Flags.HasFlag(UserFlags.Disabled)) await userService.SetDisabled(user, false);

        return Ok(await CreateSession(user));
    }
    
    public record RegisterRequestData(string Username, string Email, string Password);
    
    // Logs the new user in right away
    [HttpPost("/register"), Public]
    public async Task<IActionResult> Register([FromBody] RegisterRequestData req)
    {
        var username = req.Username?.Trim() ?? "";
        var email = req.Email?.Trim() ?? "";

        if (!UserValidation.IsValidUsername(username))
            return BadRequest(new ErrorResponseModel("Username must be 3 to 32 characters long", ErrorCodes.UserSettingsUsernameInvalid));
        if (!UserValidation.IsValidEmail(email))
            return BadRequest(new ErrorResponseModel("Invalid email address", ErrorCodes.UserSettingsEmailInvalid));
        if (!UserValidation.IsValidPassword(req.Password))
            return BadRequest(new ErrorResponseModel("Password must be at least 8 characters long", ErrorCodes.UserSettingsPasswordTooShort));
        if (await userService.UsernameTaken(username, 0))
            return UnprocessableEntity(new ErrorResponseModel("This username is already taken", ErrorCodes.UserSettingsUsernameTaken));
        if (await userService.EmailTaken(email, 0))
            return UnprocessableEntity(new ErrorResponseModel("This email is already used", ErrorCodes.UserSettingsEmailTaken));

        User user = new()
        {
            Id = await IdUtils.GenerateId(),
            Username = username,
            Email = email,
            Password = HashUtils.HashString(req.Password)
        };
        await userService.Insert(user);

        return Ok(await CreateSession(user));
    }

    private async Task<LoginResponseData> CreateSession(User user)
    {
        var token = await tokenService.GenerateToken(user, Request.Headers.UserAgent.ToString(), HttpContext.Connection.RemoteIpAddress?.ToString());
        return new LoginResponseData(token, await userService.FetchLevels(user));
    }

    [HttpGet("/logout")]
    public async Task<IActionResult> GetCurrentUser()
    {
        if (await tokenService.RemoveToken(HttpContext.Request.Headers.Authorization.ToString()) == 0)
        {
            return BadRequest(new ErrorResponseModel("Can't logout this token", ErrorCodes.AuthLogoutNoChange)); // 0 row changed == not logged out
        }
        
        return Ok("Thank for your contribution"); // Thank the user for releasing some data from the db.
    }
}   