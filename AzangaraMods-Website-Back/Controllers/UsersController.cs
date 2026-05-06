using AutoMapper;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Models.Dto;
using AzangaraMods_Website_Back.Services.Levels;
using AzangaraMods_Website_Back.Services.Users;
using Microsoft.AspNetCore.Mvc;

namespace AzangaraMods_Website_Back.Controllers;

[Route("[controller]")]
public class UsersController(IMapper mapper, IUserService userService) : Controller
{


    [HttpGet("@me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var user = HttpContext.Items[0] as User;
        if (user == null) return NotFound(new ErrorResponseModel("User not found"));
        
        return Ok(mapper.Map<UserPrivateDto>(await userService.FetchLevels(user)));
    }
}