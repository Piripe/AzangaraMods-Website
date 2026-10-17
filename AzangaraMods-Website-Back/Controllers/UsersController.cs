using AutoMapper;
using AzangaraMods_Website_Back.Attributes;
using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Models.Dto;
using AzangaraMods_Website_Back.Services.Levels;
using AzangaraMods_Website_Back.Services.Users;
using Microsoft.AspNetCore.Mvc;

namespace AzangaraMods_Website_Back.Controllers;

[Route("[controller]")]
public class UsersController(IMapper mapper, IUserService userService, ILevelService levelService) : Controller
{
    [HttpGet("@me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var user = HttpContext.Items[0] as User;
        if (user == null) return NotFound(new ErrorResponseModel("User not found", ErrorCodes.UserMeNotFound));
        
        return Ok(mapper.Map<UserPrivateDto>(await userService.FetchLevels(user)));
    }

    // Public author profile; disabled accounts are hidden like their levels
    [HttpGet("{userId:long}"), Public]
    public async Task<IActionResult> GetUser([FromRoute] long userId)
    {
        var user = await userService.GetUserById(userId);
        if (user == null || user.Flags.HasFlag(UserFlags.Disabled)) return NotFound(new ErrorResponseModel("User not found", ErrorCodes.UserGetNotFound));

        var profile = mapper.Map<UserProfileDto>(user);
        (profile.LevelCount, profile.Downloads) = await levelService.GetPublicAuthorStats(userId);
        return Ok(profile);
    }
}
