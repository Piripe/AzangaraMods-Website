using AutoMapper;
using AzangaraMods_Website_Back.Attributes;
using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Models.Dto;
using AzangaraMods_Website_Back.Services.Discord;
using AzangaraMods_Website_Back.Services.Tokens;
using AzangaraMods_Website_Back.Services.Users;
using AzangaraMods_Website_Back.Utils;
using Microsoft.AspNetCore.Mvc;

namespace AzangaraMods_Website_Back.Controllers.Admin;

// Unlike the account settings, nothing here asks for the user's password
[Route("admin/users"), Admin]
public class UsersController(IMapper mapper, IUserService userService, ITokenService tokenService, IDiscordQueue discordQueue) : Controller
{
    private User CurrentUser => (HttpContext.Items[0] as User)!;

    private AdminUserDto ToDto(UserStats stats)
    {
        var dto = mapper.Map<AdminUserDto>(stats.User);
        dto.LevelCount = stats.LevelCount;
        dto.PublishedLevelCount = stats.PublishedLevelCount;
        return dto;
    }

    private IActionResult UserNotFound() =>
        NotFound(new ErrorResponseModel("User not found", ErrorCodes.AdminUserNotFound));

    // Keeps admins from locking themselves out; they use the account settings instead
    private IActionResult NotOnSelf(string message) =>
        BadRequest(new ErrorResponseModel(message, ErrorCodes.AdminUserSelf));

    [HttpGet("")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? q,
        [FromQuery] UserSortOrders sort = UserSortOrders.Newest,
        [FromQuery] int offset = 0,
        [FromQuery] int limit = 20)
    {
        offset = Math.Max(offset, 0);
        limit = Math.Clamp(limit, 1, 100);
        var (users, total) = await userService.SearchUsers(q, sort, offset, limit);
        return Ok(new AdminUserListDto
        {
            Hits = users.Select(ToDto).ToArray(),
            TotalHits = total,
            Offset = offset,
            Limit = limit
        });
    }

    // Every field is optional; only the ones sent are changed
    public record PatchUserRequestData(string? username, string? email, string? password, bool? verifiedModder, bool? admin, bool? suspended);

    [HttpPatch("{userId:long}")]
    public async Task<IActionResult> PatchUser([FromRoute] long userId, [FromBody] PatchUserRequestData data)
    {
        var user = await userService.GetUserById(userId);
        if (user == null) return UserNotFound();
        var isSelf = user.Id == CurrentUser.Id;

        // Everything is checked before anything is saved, so a bad field doesn't leave a half-applied edit
        var username = data.username?.Trim();
        if (username != null && username != user.Username)
        {
            if (!UserValidation.IsValidUsername(username))
                return BadRequest(new ErrorResponseModel("Username must be 3 to 32 characters long", ErrorCodes.UserSettingsUsernameInvalid));
            if (await userService.UsernameTaken(username, user.Id))
                return UnprocessableEntity(new ErrorResponseModel("This username is already taken", ErrorCodes.UserSettingsUsernameTaken));
        }
        var email = data.email?.Trim();
        if (email != null && email != user.Email)
        {
            if (!UserValidation.IsValidEmail(email))
                return BadRequest(new ErrorResponseModel("Invalid email address", ErrorCodes.UserSettingsEmailInvalid));
            if (await userService.EmailTaken(email, user.Id))
                return UnprocessableEntity(new ErrorResponseModel("This email is already used", ErrorCodes.UserSettingsEmailTaken));
        }
        if (!string.IsNullOrEmpty(data.password) && !UserValidation.IsValidPassword(data.password))
            return BadRequest(new ErrorResponseModel("Password must be at least 8 characters long", ErrorCodes.UserSettingsPasswordTooShort));
        if (isSelf && data.admin == false) return NotOnSelf("You can't remove your own admin rights");
        if (isSelf && data.suspended == true) return NotOnSelf("You can't suspend your own account");

        if (username != null && username != user.Username) await userService.UpdateUsername(user, username);
        if (email != null && email != user.Email) await userService.UpdateEmail(user, email);
        if (!string.IsNullOrEmpty(data.password))
        {
            await userService.UpdatePassword(user, data.password);
            // The admin's own session survives a change of their own password
            await tokenService.RemoveUserTokens(user.Id, isSelf ? tokenService.GetTokenId(HttpContext.Request.Headers.Authorization.ToString()) : null);
        }
        await SetRole(user, UserFlags.VerifiedModder, data.verifiedModder);
        await SetRole(user, UserFlags.Admin, data.admin);
        if (data.suspended.HasValue)
        {
            await userService.SetSuspended(user, data.suspended.Value);
            if (data.suspended.Value) await tokenService.RemoveUserTokens(user.Id);
        }

        return Ok(ToDto(await userService.GetUserStats(user)));
    }

    // Only a real change is posted to the admin webhook
    private async Task SetRole(User user, UserFlags role, bool? value)
    {
        if (!value.HasValue || user.Flags.HasFlag(role) == value.Value) return;
        await userService.SetFlag(user, role, value.Value);
        discordQueue.QueueRoleChangeNotification(user, role, value.Value, CurrentUser);
    }

    // For pictures that break the rules
    [HttpDelete("{userId:long}/avatar")]
    public async Task<IActionResult> DeleteAvatar([FromRoute] long userId)
    {
        var user = await userService.GetUserById(userId);
        if (user == null) return UserNotFound();

        // File.Delete throws when the user never had a picture, as its folder doesn't exist
        var path = user.Id.GetIdFilePath("avatar.webp");
        if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
        await userService.SetHasProfilePicture(user, false);
        return Ok(ToDto(await userService.GetUserStats(user)));
    }

    // Logs the user out everywhere
    [HttpDelete("{userId:long}/sessions")]
    public async Task<IActionResult> DeleteSessions([FromRoute] long userId)
    {
        var user = await userService.GetUserById(userId);
        if (user == null) return UserNotFound();
        if (user.Id == CurrentUser.Id) return NotOnSelf("Log out your other sessions from the account settings");

        await tokenService.RemoveUserTokens(user.Id);
        return Ok(ToDto(await userService.GetUserStats(user)));
    }

    // Deletes the user with their levels, files and profile picture
    [HttpDelete("{userId:long}")]
    public async Task<IActionResult> DeleteUser([FromRoute] long userId)
    {
        var user = await userService.GetUserById(userId);
        if (user == null) return UserNotFound();
        if (user.Id == CurrentUser.Id) return NotOnSelf("Delete your own account from the account settings");

        var dto = ToDto(await userService.GetUserStats(user));
        await userService.DeleteUser(user);
        return Ok(dto);
    }
}
