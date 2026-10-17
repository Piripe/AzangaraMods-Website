using AutoMapper;
using AzangaraMods_Website_Back.Attributes;
using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Models.Dto;
using AzangaraMods_Website_Back.Services.Discord;
using AzangaraMods_Website_Back.Services.LevelFiles;
using AzangaraMods_Website_Back.Services.Levels;
using AzangaraMods_Website_Back.Services.Reports;
using AzangaraMods_Website_Back.Services.SiteSettings;
using AzangaraMods_Website_Back.Utils;
using Microsoft.AspNetCore.Mvc;

namespace AzangaraMods_Website_Back.Controllers;

[Route("levels/{levelId:long}/files/{levelFileId:long}/reports")]
public class ReportsController(
    IMapper mapper,
    ILevelService levelService,
    ILevelFileService levelFileService,
    IReportService reportService,
    ISiteSettingsService siteSettingsService,
    IDiscordQueue discordQueue) : Controller
{
    // Keyed by user ID, or by IP for anonymous reporters
    private static readonly RateLimiter ReportRateLimiter = new(5, TimeSpan.FromHours(1));

    public record PostReportRequestData(ReportCategories category, string? message);

    // Anonymous reports are allowed unless an admin turned on SiteSettings.ReportsRequireAccount
    [HttpPost(""), Public]
    public async Task<IActionResult> PostReport([FromRoute] long levelId, [FromRoute] long levelFileId, [FromBody] PostReportRequestData data)
    {
        var user = HttpContext.Items[0] as User;
        if (user == null && (await siteSettingsService.GetSettings()).ReportsRequireAccount)
            return Unauthorized(new ErrorResponseModel("Log in to report a level", ErrorCodes.ReportAccountRequired));

        if (!Enum.IsDefined(data.category)) return BadRequest(new ErrorResponseModel("Invalid report category", ErrorCodes.ReportInvalidCategory));
        var message = string.IsNullOrWhiteSpace(data.message) ? null : data.message.Trim();
        if (data.category == ReportCategories.Other && message == null) return BadRequest(new ErrorResponseModel("Describe the problem", ErrorCodes.ReportMessageRequired));
        if (message?.Length > 1024) return BadRequest(new ErrorResponseModel("Message is too long", ErrorCodes.ReportMessageTooLong));

        // Same visibility rule as GET /levels/{id}: nobody else can see a draft to report it
        var level = await levelService.GetLevelById(levelId);
        if (level == null) return NotFound(new ErrorResponseModel("Level not found", ErrorCodes.ReportLevelNotFound));
        level = await levelService.FetchLevelAuthor(level);
        var isPublic = level.Published && !(level.Author?.Flags.HasFlag(UserFlags.Disabled) ?? false);
        if (!isPublic && level.AuthorId != user?.Id && !(user?.Flags.HasFlag(UserFlags.Admin) ?? false))
            return NotFound(new ErrorResponseModel("Level not found", ErrorCodes.ReportLevelNotFound));
        var levelFile = await levelFileService.GetLevelFileById(levelId, levelFileId);
        if (levelFile == null) return NotFound(new ErrorResponseModel("Level file not found", ErrorCodes.ReportLevelFileNotFound));

        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "0.0.0.0";
        if (await reportService.HasOpenReport(levelFileId, user?.Id, ipAddress))
            return Conflict(new ErrorResponseModel("You already reported this file", ErrorCodes.ReportAlreadySent));
        if (ReportRateLimiter.IsLimited("report:" + (user?.Id.ToString() ?? ipAddress)))
            return StatusCode(StatusCodes.Status429TooManyRequests, new ErrorResponseModel("Too many reports, try again later", ErrorCodes.ReportRateLimited));

        var report = new Report
        {
            Id = await IdUtils.GenerateId(),
            LevelId = levelId,
            LevelFileId = levelFileId,
            ReporterId = user?.Id,
            IpAddress = ipAddress,
            Category = data.category,
            Message = message,
        };
        await reportService.Insert(report);
        discordQueue.QueueReportNotification(levelId, report.Id);

        return Ok(mapper.Map<ReportDto>(report));
    }
}
