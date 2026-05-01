using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Services.Users;
using Microsoft.AspNetCore.Mvc;

namespace AzangaraMods_Website_Back.Controllers;

[Route("[controller]")]
public class UsersController(IUserService userService) : Controller
{


    [HttpGet("@me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var user = HttpContext.Items[0] as User;
        
        return Ok(user);
    }
}