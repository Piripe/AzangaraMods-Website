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
public class LevelsController(IMapper mapper, ILevelService levelService, IDiscordService discordService) : Controller
{
    [HttpGet(""), Public]
    public async Task<IActionResult> GetLevels()
    {
        return Ok(mapper.Map<LevelPartialDto[]>(await levelService.GetPublicLevels()).OrderByDescending(x=>x.Published));
    }
    [HttpGet("{levelId}"), Public]
    public async Task<IActionResult> GetLevel([FromRoute] long levelId)
    {
        var level = await levelService.GetLevelById(levelId);
        if (level == null) return NotFound(new ErrorResponseModel("Level not found", ErrorCodes.LevelGetNotFound));
        if (level.Published || level.AuthorId == (HttpContext.Items[0] as User)!.Id) return Ok(mapper.Map<LevelDto>(await levelService.FetchLevelFiles(level)));
        return Unauthorized(new ErrorResponseModel("Level is restricted", ErrorCodes.LevelGetRestricted));
    }
    public record PutLevelRequestData(string name, string description, float difficulty, string tags);
    [HttpPut("")]
    public async Task<IActionResult> PutLevel([FromBody] PutLevelRequestData partialLevel)
    {
        if (partialLevel.name.Length >= 64) return BadRequest(new ErrorResponseModel("Name is too long", ErrorCodes.LevelPutNameTooLong));
        if (partialLevel.name.Length <= 3) return BadRequest(new ErrorResponseModel("Name is too short", ErrorCodes.LevelPutNameTooShort));
        if (partialLevel.description.Length >= 8192) return BadRequest(new ErrorResponseModel("Description is too long", ErrorCodes.LevelPutDescriptionTooLong));
        if (partialLevel.description.Length <= 5) return BadRequest(new ErrorResponseModel("Description is too short", ErrorCodes.LevelPutDescriptionTooShort));
        var tags = partialLevel.tags.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (tags.Length >= 10) return BadRequest(new ErrorResponseModel("Too many tags", ErrorCodes.LevelPutTooManyTags));
        if (tags.Length > 0 && tags.Max(x=>x.Length) >= 32) return BadRequest(new ErrorResponseModel("Tag name is too long", ErrorCodes.LevelPutTagTooLong));
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
    public record PatchLevelRequestData(string? name, string? description, bool? published, float? difficulty, string[]? tags);

    [HttpPatch("{levelId}")]
    public async Task<IActionResult> PatchLevel([FromBody] PatchLevelRequestData partialLevel, [FromRoute] long levelId)
    {
        if (!await levelService.UserOwnsLevel((HttpContext.Items[0] as User)!.Id, levelId)) return Unauthorized(new ErrorResponseModel("It's not your level", ErrorCodes.LevelEditNotYours));
        if (
            string.IsNullOrWhiteSpace(partialLevel.name) && 
            string.IsNullOrWhiteSpace(partialLevel.description) && 
            partialLevel.published == null && 
            partialLevel.difficulty == null && 
            partialLevel.tags == null ) return BadRequest(new ErrorResponseModel("Request is null", ErrorCodes.LevelPatchNull));
        var level = await levelService.UpdateLevel(
            levelId,
            partialLevel.name,
            partialLevel.description,
            partialLevel.published,
            partialLevel.difficulty,
            partialLevel.tags);
        if (level == null) return NotFound(new ErrorResponseModel("Level not found", ErrorCodes.LevelPatchNotFound));
        await discordService.UpdateDiscordForum(await levelService.FetchLevelFiles(level));
        return Ok(mapper.Map<LevelDto>(level));
    }
}