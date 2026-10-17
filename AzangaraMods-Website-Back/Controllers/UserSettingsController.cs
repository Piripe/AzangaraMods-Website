using System.IO.Compression;
using System.Text.Json;
using System.Text.Json.Serialization;
using AutoMapper;
using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Models.Dto;
using AzangaraMods_Website_Back.Services.Reports;
using AzangaraMods_Website_Back.Services.Tokens;
using AzangaraMods_Website_Back.Services.Users;
using AzangaraMods_Website_Back.Utils;
using ImageMagick;
using Microsoft.AspNetCore.Mvc;

namespace AzangaraMods_Website_Back.Controllers;

// Account settings of the logged in user
[Route("users/@me")]
public class UserSettingsController(IMapper mapper, IUserService userService, ITokenService tokenService, IReportService reportService) : Controller
{
    private const int AvatarSize = 256;
    private static readonly RateLimiter DataExportRateLimiter = new(3, TimeSpan.FromHours(1));
    private static readonly JsonSerializerOptions ExportJsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter() },
    };

    private User CurrentUser => (HttpContext.Items[0] as User)!;
    private long? CurrentTokenId => tokenService.GetTokenId(HttpContext.Request.Headers.Authorization.ToString());

    private async Task<UserPrivateDto> CurrentUserDto() => mapper.Map<UserPrivateDto>(await userService.FetchLevels(CurrentUser));

    private IActionResult WrongPassword() =>
        UnprocessableEntity(new ErrorResponseModel("Wrong password", ErrorCodes.UserSettingsWrongPassword));

    public record PatchUsernameRequestData(string username);

    [HttpPatch("username")]
    public async Task<IActionResult> PatchUsername([FromBody] PatchUsernameRequestData data)
    {
        var username = data.username?.Trim() ?? "";
        if (!UserValidation.IsValidUsername(username))
            return BadRequest(new ErrorResponseModel("Username must be 3 to 32 characters long", ErrorCodes.UserSettingsUsernameInvalid));
        if (await userService.UsernameTaken(username, CurrentUser.Id))
            return UnprocessableEntity(new ErrorResponseModel("This username is already taken", ErrorCodes.UserSettingsUsernameTaken));

        await userService.UpdateUsername(CurrentUser, username);
        return Ok(await CurrentUserDto());
    }

    public record PatchEmailRequestData(string email, string password);

    [HttpPatch("email")]
    public async Task<IActionResult> PatchEmail([FromBody] PatchEmailRequestData data)
    {
        if (!userService.CheckPassword(CurrentUser, data.password ?? "")) return WrongPassword();
        var email = data.email?.Trim() ?? "";
        if (!UserValidation.IsValidEmail(email))
            return BadRequest(new ErrorResponseModel("Invalid email address", ErrorCodes.UserSettingsEmailInvalid));
        if (await userService.EmailTaken(email, CurrentUser.Id))
            return UnprocessableEntity(new ErrorResponseModel("This email is already used", ErrorCodes.UserSettingsEmailTaken));

        await userService.UpdateEmail(CurrentUser, email);
        return Ok(await CurrentUserDto());
    }

    public record PatchPasswordRequestData(string currentPassword, string newPassword);

    // Logs out every other session
    [HttpPatch("password")]
    public async Task<IActionResult> PatchPassword([FromBody] PatchPasswordRequestData data)
    {
        if (!userService.CheckPassword(CurrentUser, data.currentPassword ?? "")) return WrongPassword();
        if (!UserValidation.IsValidPassword(data.newPassword))
            return BadRequest(new ErrorResponseModel("Password must be at least 8 characters long", ErrorCodes.UserSettingsPasswordTooShort));

        await userService.UpdatePassword(CurrentUser, data.newPassword!);
        await tokenService.RemoveUserTokens(CurrentUser.Id, CurrentTokenId);
        return Ok(await CurrentUserDto());
    }

    [HttpPut("avatar")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> PutAvatar([FromForm] IFormFile? file)
    {
        if (file is null) return BadRequest(new ErrorResponseModel("No file or file too big", ErrorCodes.UserAvatarPutNull));

        switch (file.ContentType)
        {
            case "image/avif":
            case "image/jpeg":
            case "image/png":
            case "image/webp":
                using (var image = new MagickImage(file.OpenReadStream()))
                {
                    image.AutoOrient();
                    // Drops EXIF data such as the location a photo was taken at
                    image.Strip();
                    image.Resize(new MagickGeometry(AvatarSize, AvatarSize) { FillArea = true });
                    image.Crop(AvatarSize, AvatarSize, Gravity.Center);
                    image.ResetPage();
                    image.Quality = 85;

                    var filePath = CurrentUser.Id.GetIdFilePath("avatar.webp");
                    Directory.CreateDirectory(Path.GetDirectoryName(filePath) ?? "");
                    await image.WriteAsync(filePath, MagickFormat.WebP);
                }

                await userService.SetHasProfilePicture(CurrentUser, true);
                return Ok(await CurrentUserDto());
            default:
                return BadRequest(new ErrorResponseModel("Invalid file type", ErrorCodes.UserAvatarPutInvalidFileType, file.ContentType));
        }
    }

    [HttpDelete("avatar")]
    public async Task<IActionResult> DeleteAvatar()
    {
        System.IO.File.Delete(CurrentUser.Id.GetIdFilePath("avatar.webp"));
        await userService.SetHasProfilePicture(CurrentUser, false);
        return Ok(await CurrentUserDto());
    }

    [HttpGet("sessions")]
    public async Task<IActionResult> GetSessions()
    {
        var currentTokenId = CurrentTokenId;
        var sessions = mapper.Map<SessionDto[]>(await tokenService.GetUserTokens(CurrentUser.Id));
        foreach (var session in sessions) session.Current = session.Id == currentTokenId;
        return Ok(sessions);
    }

    [HttpDelete("sessions/{sessionId}")]
    public async Task<IActionResult> DeleteSession([FromRoute] long sessionId)
    {
        if (await tokenService.RemoveUserToken(CurrentUser.Id, sessionId) == 0)
            return NotFound(new ErrorResponseModel("Session not found", ErrorCodes.UserSessionNotFound));
        return Ok();
    }

    // Logs out every session except the current one
    [HttpDelete("sessions")]
    public async Task<IActionResult> DeleteOtherSessions()
    {
        await tokenService.RemoveUserTokens(CurrentUser.Id, CurrentTokenId);
        return Ok();
    }

    public record PasswordConfirmRequestData(string password);

    // The account comes back by logging in again
    [HttpPost("disable")]
    public async Task<IActionResult> DisableAccount([FromBody] PasswordConfirmRequestData data)
    {
        if (!userService.CheckPassword(CurrentUser, data.password ?? "")) return WrongPassword();

        await userService.SetDisabled(CurrentUser, true);
        await tokenService.RemoveUserTokens(CurrentUser.Id);
        return Ok();
    }

    [HttpDelete("")]
    public async Task<IActionResult> DeleteAccount([FromBody] PasswordConfirmRequestData data)
    {
        if (!userService.CheckPassword(CurrentUser, data.password ?? "")) return WrongPassword();

        await userService.DeleteUser(CurrentUser);
        return Ok();
    }

    // Right of access and data portability (GDPR art. 15 and 20): a zip of everything stored about the user
    [HttpGet("data")]
    public async Task<IActionResult> ExportData()
    {
        var user = await userService.FetchLevels(CurrentUser);
        if (DataExportRateLimiter.IsLimited("data-export:" + user.Id))
            return StatusCode(StatusCodes.Status429TooManyRequests, new ErrorResponseModel("Too many data requests, try again later", ErrorCodes.UserDataExportRateLimited));

        var sessions = await tokenService.GetUserTokens(user.Id);
        var levels = user.Levels ?? [];

        // Built in a temporary file because level files can make the archive large
        var stream = new FileStream(Path.GetTempFileName(), FileMode.Create, FileAccess.ReadWrite, FileShare.None, 4096, FileOptions.DeleteOnClose);
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, true))
        {
            // IDs are written as strings like in the API, since they don't fit in a JavaScript number
            await WriteJsonEntry(zip, "account.json", new
            {
                Id = user.Id.ToString(),
                user.Username,
                user.Email,
                user.Creation,
                user.LastLogin,
                user.HasProfilePicture,
                Flags = Enum.GetValues<UserFlags>().Where(x => user.Flags.HasFlag(x)).Select(x => x.ToString()),
            });
            await WriteJsonEntry(zip, "sessions.json", sessions.Select(x => new
            {
                Id = x.Id.ToString(),
                x.Created,
                x.LastUsed,
                x.UserAgent,
                x.IpAddress,
            }));
            await WriteJsonEntry(zip, "levels.json", levels.Select(x => new
            {
                Id = x.Id.ToString(),
                x.Name,
                x.Description,
                x.Difficulty,
                x.RoomAmount,
                x.Tags,
                x.Published,
                x.LastEdit,
                x.Verification,
                x.VerificationRequested,
                x.VerificationNote,
                DiscordForumThread = x.DiscordForumThread?.ToString(),
                DiscordForumMessage = x.DiscordForumMessage?.ToString(),
                Files = (x.LevelFiles ?? []).Select(f => new { Id = f.Id.ToString(), f.FileName, f.FileSize, f.EntryPoint, f.UploadDate, f.Downloads }),
                Gallery = (x.GalleryFiles ?? []).Select(g => new { Id = g.Id.ToString(), g.FileName, g.Description, g.UploadDate }),
            }));

            await WriteJsonEntry(zip, "reports.json", (await reportService.GetUserReports(user.Id)).Select(x => new
            {
                Id = x.Id.ToString(),
                LevelId = x.LevelId.ToString(),
                LevelFileId = x.LevelFileId.ToString(),
                x.Category,
                x.Message,
                x.IpAddress,
                x.Created,
                x.Status,
            }));

            if (user.HasProfilePicture) await AddFileEntry(zip, user.Id.GetIdFilePath("avatar.webp"), "avatar.webp");
            foreach (var level in levels)
            {
                foreach (var file in level.LevelFiles ?? [])
                    await AddFileEntry(zip, file.Id.GetIdFilePath("zip"), $"levels/{level.Id}/files/{file.Id}-{file.FileName}.zip");
                foreach (var image in level.GalleryFiles ?? [])
                    await AddFileEntry(zip, image.Id.GetIdFilePath("webp"), $"levels/{level.Id}/gallery/{image.Id}-{image.FileName}");
            }
        }

        stream.Seek(0, SeekOrigin.Begin);
        return File(stream, "application/zip", $"azangaramods-data-{user.Username}.zip");
    }

    private static async Task WriteJsonEntry(ZipArchive zip, string name, object data)
    {
        await using var entry = await zip.CreateEntry(name).OpenAsync();
        await JsonSerializer.SerializeAsync(entry, data, ExportJsonOptions);
    }

    private static async Task AddFileEntry(ZipArchive zip, string path, string name)
    {
        // A file missing on disk shouldn't make the whole export fail
        if (!System.IO.File.Exists(path)) return;
        await zip.CreateEntryFromFileAsync(path, name, CompressionLevel.NoCompression);
    }
}
