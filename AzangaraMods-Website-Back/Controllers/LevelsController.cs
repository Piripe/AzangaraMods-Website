using AutoMapper;
using AzangaraMods_Website_Back.Attributes;
using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Models.Dto;
using AzangaraMods_Website_Back.Services.Discord;
using AzangaraMods_Website_Back.Services.Levels;
using AzangaraMods_Website_Back.Utils;
using Microsoft.AspNetCore.Mvc;
using Level = AzangaraMods_Website_Back.Models.Level;

namespace AzangaraMods_Website_Back.Controllers;

[Route("[controller]")]
public class LevelsController(IMapper mapper, ILevelService levelService, IDiscordQueue discordQueue) : Controller
{
    [HttpGet(""), Public]
    public async Task<IActionResult> GetLevels(
        [FromQuery] string? q,
        [FromQuery] LevelDifficulties[] difficulty,
        [FromQuery] string[] tag,
        [FromQuery] long? author,
        [FromQuery] LevelSortOrders sort = LevelSortOrders.Relevance,
        [FromQuery] int offset = 0,
        [FromQuery] int limit = 20)
    {
        offset = Math.Max(offset, 0);
        limit = Math.Clamp(limit, 1, 100);
        var (levels, total) = await levelService.SearchLevels(true, q, difficulty, tag.Take(10).ToArray(), sort, offset, limit, authorId: author);
        return Ok(new LevelSearchResultDto<LevelSearchHitDto>
        {
            Hits = mapper.Map<LevelSearchHitDto[]>(levels),
            TotalHits = total,
            Offset = offset,
            Limit = limit
        });
    }
    [HttpGet("tags"), Public]
    public async Task<IActionResult> GetTags()
    {
        return Ok((await levelService.GetPublicTags()).Select(x => new TagCountDto(x.tag, x.count)));
    }
    [HttpGet("{levelId}"), Public]
    public async Task<IActionResult> GetLevel([FromRoute] long levelId)
    {
        var level = await levelService.GetLevelById(levelId);
        if (level == null) return NotFound(new ErrorResponseModel("Level not found", ErrorCodes.LevelGetNotFound));
        level = await levelService.FetchLevelAuthor(level);
        var user = HttpContext.Items[0] as User;
        var isPublic = level.Published && !(level.Author?.Flags.HasFlag(UserFlags.Disabled) ?? false);
        if (isPublic || level.AuthorId == user?.Id || (user?.Flags.HasFlag(UserFlags.Admin) ?? false)) return Ok(mapper.Map<LevelDto>(await levelService.FetchLevelFiles(level)));
        return Unauthorized(new ErrorResponseModel("Level is restricted", ErrorCodes.LevelGetRestricted));
    }
    public record PutLevelRequestData(string name, string description, LevelDifficulties difficulty, string tags);
    [HttpPut("")]
    public async Task<IActionResult> PutLevel([FromBody] PutLevelRequestData partialLevel)
    {
        if (partialLevel.name.Length >= 64) return BadRequest(new ErrorResponseModel("Name is too long", ErrorCodes.LevelPutNameTooLong));
        if (partialLevel.name.Length <= 3) return BadRequest(new ErrorResponseModel("Name is too short", ErrorCodes.LevelPutNameTooShort));
        if (partialLevel.description.Length >= 8192) return BadRequest(new ErrorResponseModel("Description is too long", ErrorCodes.LevelPutDescriptionTooLong));
        if (partialLevel.description.Length <= 5) return BadRequest(new ErrorResponseModel("Description is too short", ErrorCodes.LevelPutDescriptionTooShort));
        var tags = partialLevel.tags.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (tags.Length > 10) return BadRequest(new ErrorResponseModel("Too many tags", ErrorCodes.LevelPutTooManyTags));
        if (tags.Length > 0 && tags.Max(x=>x.Length) > 32) return BadRequest(new ErrorResponseModel("Tag name is too long", ErrorCodes.LevelPutTagTooLong));
        var level = new Level
        {
            Id = await IdUtils.GenerateId(),
            AuthorId = (HttpContext.Items[0] as User)!.Id,
            Name = partialLevel.name,
            Description = partialLevel.description,
            Difficulty = partialLevel.difficulty,
            Tags = tags
        };
        
        await levelService.Insert(level);
        return Ok(mapper.Map<LevelPartialDto>(level));
    }
    public record PatchLevelRequestData(string? name, string? description, bool? published, LevelDifficulties? difficulty, short? roomAmount, string[]? tags);

    [HttpPatch("{levelId}")]
    public async Task<IActionResult> PatchLevel([FromBody] PatchLevelRequestData partialLevel, [FromRoute] long levelId)
    {
        var user = (HttpContext.Items[0] as User)!;
        if (!await levelService.UserCanEditLevel(user, levelId)) return Unauthorized(new ErrorResponseModel("It's not your level", ErrorCodes.LevelEditNotYours));
        if (partialLevel.published == true && !user.Flags.HasFlag(UserFlags.VerifiedModder) && !user.Flags.HasFlag(UserFlags.Admin))
        {
            var current = await levelService.GetLevelById(levelId);
            if (current is { Published: false, Verification: not LevelVerificationStatus.Verified })
                return StatusCode(StatusCodes.Status403Forbidden, new ErrorResponseModel("This level must be verified before it can be published", ErrorCodes.LevelPublishVerificationRequired));
        }
        if (
            string.IsNullOrWhiteSpace(partialLevel.name) && 
            string.IsNullOrWhiteSpace(partialLevel.description) && 
            partialLevel.published == null && 
            partialLevel.difficulty == null &&
            partialLevel.roomAmount == null &&
            partialLevel.tags == null ) return BadRequest(new ErrorResponseModel("Request is null", ErrorCodes.LevelPatchNull));
        if (partialLevel.roomAmount < 0) return BadRequest(new ErrorResponseModel("Room amount can't be negative", ErrorCodes.LevelPatchInvalidRoomAmount));
        var level = await levelService.UpdateLevel(
            levelId,
            partialLevel.name,
            partialLevel.description,
            partialLevel.published,
            partialLevel.difficulty,
            partialLevel.roomAmount,
            partialLevel.tags);
        if (level == null) return NotFound(new ErrorResponseModel("Level not found", ErrorCodes.LevelPatchNotFound));
        await levelService.FetchLevelFiles(level);
        discordQueue.QueueForumUpdate(level.Id);
        return Ok(mapper.Map<LevelDto>(level));
    }

    // Asks an admin to verify the level so an author who isn't a Verified Modder can publish it
    [HttpPost("{levelId}/verification")]
    public async Task<IActionResult> RequestVerification([FromRoute] long levelId)
    {
        if (!await levelService.UserCanEditLevel((HttpContext.Items[0] as User)!, levelId)) return Unauthorized(new ErrorResponseModel("It's not your level", ErrorCodes.LevelEditNotYours));
        var level = await levelService.GetLevelById(levelId);
        if (level == null) return NotFound(new ErrorResponseModel("Level not found", ErrorCodes.LevelVerificationNotFound));
        if (level.Verification == LevelVerificationStatus.Verified) return BadRequest(new ErrorResponseModel("Level is already verified", ErrorCodes.LevelVerificationAlreadyVerified));
        if (level.Verification == LevelVerificationStatus.Pending) return BadRequest(new ErrorResponseModel("A verification is already pending", ErrorCodes.LevelVerificationAlreadyPending));
        level = await levelService.FetchLevelAuthor(await levelService.FetchLevelFiles(level));
        if (level.LevelFiles?.Count is null or 0) return BadRequest(new ErrorResponseModel("Upload a file before asking for a verification", ErrorCodes.LevelVerificationNoFiles));

        await levelService.SetVerification(level, LevelVerificationStatus.Pending);
        discordQueue.QueueVerificationRequest(level.Id);
        return Ok(mapper.Map<LevelDto>(level));
    }

    [HttpDelete("{levelId}/verification")]
    public async Task<IActionResult> CancelVerification([FromRoute] long levelId)
    {
        if (!await levelService.UserCanEditLevel((HttpContext.Items[0] as User)!, levelId)) return Unauthorized(new ErrorResponseModel("It's not your level", ErrorCodes.LevelEditNotYours));
        var level = await levelService.GetLevelById(levelId);
        if (level == null) return NotFound(new ErrorResponseModel("Level not found", ErrorCodes.LevelVerificationNotFound));
        if (level.Verification != LevelVerificationStatus.Pending) return BadRequest(new ErrorResponseModel("No verification is pending", ErrorCodes.LevelVerificationNotPending));

        await levelService.SetVerification(level, LevelVerificationStatus.None);
        discordQueue.QueueDeleteVerificationRequest(level.Id);
        return Ok(mapper.Map<LevelDto>(await levelService.FetchLevelAuthor(await levelService.FetchLevelFiles(level))));
    }

    // Deletes the level with all its files and screenshots
    [HttpDelete("{levelId}")]
    public async Task<IActionResult> DeleteLevel([FromRoute] long levelId)
    {
        if (!await levelService.UserCanEditLevel((HttpContext.Items[0] as User)!, levelId)) return Unauthorized(new ErrorResponseModel("It's not your level", ErrorCodes.LevelEditNotYours));
        var level = await levelService.GetLevelById(levelId);
        if (level == null) return NotFound(new ErrorResponseModel("Level not found", ErrorCodes.LevelDeleteNotFound));
        await levelService.PurgeLevel(level);

        return Ok(mapper.Map<LevelPartialDto>(level));
    }
}
