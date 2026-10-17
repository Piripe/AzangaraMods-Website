using AutoMapper;
using AzangaraMods_Website_Back.Attributes;
using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Models.Dto;
using AzangaraMods_Website_Back.Services.Discord;
using AzangaraMods_Website_Back.Services.LevelFiles;
using AzangaraMods_Website_Back.Services.Levels;
using AzangaraMods_Website_Back.Utils;
using Microsoft.AspNetCore.Mvc;

namespace AzangaraMods_Website_Back.Controllers.Admin;

[Route("admin/levels"), Admin]
public class LevelsController(IMapper mapper, ILevelService levelService, ILevelFileService levelFileService, IDiscordService discordService) : Controller
{
    public record AdminTaskResponseData(int succeeded, int failed, string[] errors);

    [HttpGet("")]
    public async Task<IActionResult> GetLevels(
        [FromQuery] string? q,
        [FromQuery] bool? published,
        [FromQuery] LevelVerificationStatus? verification,
        [FromQuery] LevelSortOrders sort = LevelSortOrders.Updated,
        [FromQuery] int offset = 0,
        [FromQuery] int limit = 20)
    {
        offset = Math.Max(offset, 0);
        limit = Math.Clamp(limit, 1, 100);
        var (levels, total) = await levelService.SearchLevels(published, q, [], [], sort, offset, limit, verification);
        return Ok(new LevelSearchResultDto<AdminLevelHitDto>
        {
            Hits = mapper.Map<AdminLevelHitDto[]>(levels),
            TotalHits = total,
            Offset = offset,
            Limit = limit
        });
    }

    // Verifies a pending level and publishes it
    [HttpPost("{levelId}/verification/approve")]
    public async Task<IActionResult> ApproveVerification([FromRoute] long levelId)
    {
        var level = await levelService.GetLevelById(levelId);
        if (level == null) return NotFound(new ErrorResponseModel("Level not found", ErrorCodes.AdminLevelNotFound));
        if (level.Verification != LevelVerificationStatus.Pending) return BadRequest(new ErrorResponseModel("No verification is pending", ErrorCodes.LevelVerificationNotPending));

        level.Published = true;
        levelService.SoftEditLevel(level);
        await levelService.SetVerification(level, LevelVerificationStatus.Verified);
        await discordService.UpdateDiscordForum(await levelService.FetchLevelAuthor(await levelService.FetchLevelFiles(level)));
        return Ok(mapper.Map<LevelPartialDto>(level));
    }

    public record RejectVerificationRequestData(string? note);

    [HttpPost("{levelId}/verification/reject")]
    public async Task<IActionResult> RejectVerification([FromRoute] long levelId, [FromBody] RejectVerificationRequestData data)
    {
        var note = string.IsNullOrWhiteSpace(data.note) ? null : data.note.Trim();
        if (note?.Length > 1024) return BadRequest(new ErrorResponseModel("Note is too long", ErrorCodes.AdminVerificationNoteTooLong));
        var level = await levelService.GetLevelById(levelId);
        if (level == null) return NotFound(new ErrorResponseModel("Level not found", ErrorCodes.AdminLevelNotFound));
        if (level.Verification != LevelVerificationStatus.Pending) return BadRequest(new ErrorResponseModel("No verification is pending", ErrorCodes.LevelVerificationNotPending));

        await levelService.SetVerification(level, LevelVerificationStatus.Rejected, note);
        return Ok(mapper.Map<LevelPartialDto>(level));
    }

    [HttpPost("{levelId}/reprocess")]
    public async Task<IActionResult> ReprocessLevel([FromRoute] long levelId)
    {
        var level = await levelService.GetLevelById(levelId);
        if (level == null) return NotFound(new ErrorResponseModel("Level not found", ErrorCodes.AdminLevelNotFound));

        var result = await ReprocessLevelFiles(level);
        _ = discordService.UpdateDiscordForum(level);
        return Ok(result);
    }

    [HttpPost("{levelId}/files/{levelFileId}/reprocess")]
    public async Task<IActionResult> ReprocessLevelFile([FromRoute] long levelId, [FromRoute] long levelFileId)
    {
        var level = await levelService.GetLevelById(levelId);
        if (level == null) return NotFound(new ErrorResponseModel("Level not found", ErrorCodes.AdminLevelNotFound));
        level = await levelService.FetchLevelAuthor(await levelService.FetchLevelFiles(level));

        var levelFile = level.LevelFiles?.FirstOrDefault(x => x.Id == levelFileId);
        if (levelFile == null) return NotFound(new ErrorResponseModel("Level file not found", ErrorCodes.AdminLevelFileNotFound));

        try
        {
            await levelFileService.ReprocessLevelFile(level, levelFile);
        }
        catch (Exception e)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                new ErrorResponseModel("Error during file processing", ErrorCodes.AdminReprocessError, e.ToString()));
        }

        _ = discordService.UpdateDiscordForum(level);
        return Ok(new AdminTaskResponseData(1, 0, []));
    }

    [HttpPost("reprocess")]
    public async Task<IActionResult> ReprocessAllLevels()
    {
        var levels = await levelService.GetAllLevels();
        var results = new List<AdminTaskResponseData>();

        foreach (var level in levels)
        {
            Console.WriteLine($"Reprocessing levels {results.Count + 1}/{levels.Length}");
            results.Add(await ReprocessLevelFiles(level));
            await discordService.UpdateDiscordForum(level);
            await Task.Delay(100);
        }

        return Ok(new AdminTaskResponseData(
            results.Sum(x => x.succeeded),
            results.Sum(x => x.failed),
            results.SelectMany(x => x.errors).ToArray()));
    }

    [HttpPost("{levelId}/discord")]
    public async Task<IActionResult> RefreshDiscordMessage([FromRoute] long levelId)
    {
        var level = await levelService.GetLevelById(levelId);
        if (level == null) return NotFound(new ErrorResponseModel("Level not found", ErrorCodes.AdminLevelNotFound));

        await discordService.UpdateDiscordForum(await levelService.FetchLevelAuthor(await levelService.FetchLevelFiles(level)));
        return Ok(new AdminTaskResponseData(1, 0, []));
    }

    [HttpDelete("{levelId}")]
    public async Task<IActionResult> DeleteLevel([FromRoute] long levelId)
    {
        var level = await levelService.GetLevelById(levelId);
        if (level == null) return NotFound(new ErrorResponseModel("Level not found", ErrorCodes.AdminLevelNotFound));
        level = await levelService.FetchLevelAuthor(await levelService.FetchLevelFiles(level));

        // Turns the Discord post into "Unpublished level" before the row disappears
        level.Published = false;
        await discordService.UpdateDiscordForum(level, true);

        var filePaths = (level.LevelFiles ?? []).Select(x => x.Id.GetIdFilePath("zip"))
            .Concat((level.GalleryFiles ?? []).Select(x => x.Id.GetIdFilePath("webp")))
            .ToArray();

        await levelService.DeleteLevel(level);
        foreach (var path in filePaths) System.IO.File.Delete(path);

        return Ok(mapper.Map<LevelPartialDto>(level));
    }

    // Reprocesses every file of a level and leaves it with its files, gallery and author loaded
    private async Task<AdminTaskResponseData> ReprocessLevelFiles(Level level)
    {
        level = await levelService.FetchLevelAuthor(await levelService.FetchLevelFiles(level));

        var errors = new List<string>();
        foreach (var levelFile in level.LevelFiles ?? [])
        {
            try
            {
                await levelFileService.ReprocessLevelFile(level, levelFile);
            }
            catch (Exception e)
            {
                Console.WriteLine(e.ToString());
                errors.Add($"{level.Name} / {levelFile.FileName}: {e.Message}");
            }
        }

        return new AdminTaskResponseData((level.LevelFiles?.Count ?? 0) - errors.Count, errors.Count, errors.ToArray());
    }
}
