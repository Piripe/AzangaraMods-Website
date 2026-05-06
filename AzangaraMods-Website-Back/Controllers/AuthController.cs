using AzangaraMods_Website_Back.Attributes;
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
        var user = await userService.GetUserByEmail(req.Email);

        if (user == null || !await userService.Login(user, req.Password))
        {
            return UnprocessableEntity(new ErrorResponseModel("Invalid username or password"));
        }

        return Ok(new LoginResponseData(await tokenService.GenerateToken(user), user));
    }
    
    public record RegisterResponseData(string Status);
    public record RegisterRequestData(string Username, string Email, string Password);
    
    [HttpPost("/register"), Public]
    public async Task<IActionResult> Register([FromBody] RegisterRequestData req)
    {
        if (await userService.CheckUserExists(req.Email, req.Username)) return UnprocessableEntity(new ErrorResponseModel("Can't register user"));

        await userService.Insert(new ()
        {
            Id = await IdUtils.GenerateId(),
            Username = req.Username,
            Email = req.Email,
            Password = HashUtils.HashString(req.Password)
        });

        return Ok(new RegisterResponseData("Created"));
    }
    [HttpGet("/logout")]
    public async Task<IActionResult> GetCurrentUser()
    {
        if (await tokenService.RemoveToken(HttpContext.Request.Headers.Authorization.ToString()) == 0)
        {
            return BadRequest("Can't logout this token"); // 0 row changed == not logged out
        }
        
        return Ok("Thank for your contribution"); // Thank the user for releasing some data from the db.
    }
}   