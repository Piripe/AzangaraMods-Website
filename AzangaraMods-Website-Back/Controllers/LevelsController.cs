using System.IO.Compression;
using System.Text;
using System.Text.Json.Serialization;
using AutoMapper;
using AzangaraMods_Website_Back.Attributes;
using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Middlewares;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Models.Dto;
using AzangaraMods_Website_Back.Services.Discord;
using AzangaraMods_Website_Back.Services.Levels;
using AzangaraMods_Website_Back.Utils;
using AzangaraTools;
using AzangaraTools.Models.File;
using ImageMagick;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore.Metadata;

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
    public record PutLevelFileResponseData(string id, string[] files);
    [HttpPut("{levelId}/files")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<IActionResult> PutLevelFile([FromForm] IFormFile? file, [FromRoute] long levelId)
    {
        if (file is null) return BadRequest(new ErrorResponseModel("No file or file too big", ErrorCodes.LevelFilePutNull));
        if (!await levelService.UserOwnsLevel((HttpContext.Items[0] as User)!.Id, levelId)) return Unauthorized(new ErrorResponseModel("It's not your level", ErrorCodes.LevelEditNotYours));

        IFile[] pakFiles;
        
        switch (file.ContentType)
        {
            case "application/octet-stream":
                // .pak
                try
                {
                    pakFiles = PakHelper.Read(file.OpenReadStream());
                    if (pakFiles.Sum(x=>(long)x.Size) > 1024*1024*1024) return BadRequest(new ErrorResponseModel("Decompressed file too big", ErrorCodes.LevelFilePutPakTooBig));
                
                }
                catch (Exception e)
                {
                    return BadRequest(new ErrorResponseModel("Error during pak processing", ErrorCodes.LevelFilePutPakError, e.Message));
                }

                break;
            case "application/zip":
            case "application/x-zip-compressed":
            {
                // .zip
                try
                {
                    var zip = await ZipArchive.CreateAsync(file.OpenReadStream(), ZipArchiveMode.Read, false, new UTF8Encoding());
                    if (zip.Entries.Count > 1000) return BadRequest(new ErrorResponseModel("Too many files in the zip archive (use .pak instead)", ErrorCodes.LevelFilePutZipTooManyFiles));
                    if (zip.Entries.Sum(x=>x.Length) > 1024*1024*1024) return BadRequest(new ErrorResponseModel("Decompressed file too big", ErrorCodes.LevelFilePutZipTooBig));
                    pakFiles = zip.Entries.Select(x => new ZipEntryFile(x)).ToArray();
                }
                catch (Exception e)
                {
                    return BadRequest(new ErrorResponseModel("Error during zip processing", ErrorCodes.LevelFilePutZipError, e.Message));
                }
                break;
            }
            default:
                return BadRequest(new ErrorResponseModel("Invalid file type", ErrorCodes.LevelFilePutInvalidFileType, file.ContentType));
        }

        var levelFileId = await IdUtils.GenerateId();

        var filePath = levelFileId.GetIdFilePath("zip");

        Directory.CreateDirectory(Path.GetDirectoryName(filePath) ?? "");
        var fileStream = System.IO.File.Create(filePath);

        var finalZip = new ZipArchive(fileStream, ZipArchiveMode.Create);
        var pakEntry = finalZip.CreateEntry("level-data.pak");
        var pakStream = await pakEntry.OpenAsync();
        try
        {
            PakHelper.Write(pakStream, pakFiles);
        }
        catch (Exception e)
        {
            return BadRequest(new ErrorResponseModel("Error during file processing", ErrorCodes.LevelFilePutPakWriteError, e.Message));
        }

        var levelFile = new LevelFile()
        {
            Id = levelFileId,
            LevelId = levelId,
            FileName = string.Concat(Path.GetFileNameWithoutExtension(file.FileName)
                .Split(Path.GetInvalidFileNameChars())),
            FileSize = (int)pakStream.Position
        };
        
        await levelService.InsertLevelFile(levelFile);
        
        pakStream.Close();
        await finalZip.DisposeAsync();
        fileStream.Close();
        
        return Ok(new PutLevelFileResponseData(levelFileId.ToString(), pakFiles.Select(x=>x.Path).ToArray()));
    }
    
    public record PatchLevelFileRequestData(string? fileName, string? entryPoint);

    [HttpPatch("{levelId}/files/{levelFileId}")]
    public async Task<IActionResult> PatchLevelFile([FromBody] PatchLevelFileRequestData partialLevelFile, [FromRoute] long levelId, [FromRoute] long levelFileId)
    {
        if (!await levelService.UserOwnsLevel((HttpContext.Items[0] as User)!.Id, levelId)) return Unauthorized(new ErrorResponseModel("It's not your level", ErrorCodes.LevelEditNotYours));
        if (partialLevelFile.entryPoint == null && partialLevelFile.fileName == null) return BadRequest(new ErrorResponseModel("Request is null", ErrorCodes.LevelFilePatchNull));
        var levelFile = await levelService.UpdateLevelFile(
            levelId,
            levelFileId,
            partialLevelFile.fileName,
            partialLevelFile.entryPoint);
        if (levelFile == null) return NotFound(new ErrorResponseModel("Level file not found", ErrorCodes.LevelFilePatchLevelNotFound));
        
        var level = levelFile.Level ?? await levelService.GetLevelById(levelFile.LevelId);
        if (level != null) await discordService.UpdateDiscordForum(level);
        
        return Ok(mapper.Map<LevelFileDto>(levelFile));
    }
    
    [HttpDelete("{levelId}/files/{levelFileId}")]
    public async Task<IActionResult> DeleteLevelFile([FromRoute] long levelId, [FromRoute] long levelFileId)
    {
        if (!await levelService.UserOwnsLevel((HttpContext.Items[0] as User)!.Id, levelId)) return Unauthorized(new ErrorResponseModel("It's not your level", ErrorCodes.LevelEditNotYours));
        var levelFile = await levelService.GetLevelFileById(levelId, levelFileId);
        if (levelFile == null) return NotFound(new ErrorResponseModel("Level file not found", ErrorCodes.LevelFileDeleteNotFound));
        await levelService.DeleteLevelFile(levelFile);
        System.IO.File.Delete(levelFileId.GetIdFilePath("zip"));
        
        var level = levelFile.Level ?? await levelService.GetLevelById(levelId);
        if (level == null) return StatusCode(StatusCodes.Status500InternalServerError, new ErrorResponseModel("Level not found but file deleted", ErrorCodes.LevelFileDeleteLevelNotFound));
        await discordService.UpdateDiscordForum(await levelService.FetchLevelFiles(level));
        return Ok(mapper.Map<LevelDto>(level));
    }
    
    
    [HttpPut("{levelId}/gallery")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> PutLevelGallery([FromForm] IFormFile? file, [FromRoute] long levelId)
    {
        if (file is null) return BadRequest(new ErrorResponseModel("No file or file too big", ErrorCodes.LevelGalleryPutNull));
        if (!await levelService.UserOwnsLevel((HttpContext.Items[0] as User)!.Id, levelId)) return Unauthorized(new ErrorResponseModel("It's not your level", ErrorCodes.LevelEditNotYours));

        switch (file.ContentType)
        {
            case "image/avif":
            case "image/jpeg":
            case "image/png":
            case "image/tiff":
            case "image/webp":
                var galleryImage = new MagickImage(file.OpenReadStream());
                var sizeRatio = Math.Sqrt((1920f * 1080f) / Math.Max(1,galleryImage.Width * galleryImage.Height));
                if (sizeRatio < 1)
                {
                    galleryImage.Resize((uint)(galleryImage.Width * sizeRatio),(uint)(galleryImage.Height * sizeRatio), FilterType.Lanczos);
                }
                
                var galleryImageId = await IdUtils.GenerateId();

                galleryImage.Quality = 85;
                var filePath = galleryImageId.GetIdFilePath("webp");
                Directory.CreateDirectory(Path.GetDirectoryName(filePath) ?? "");
                await galleryImage.WriteAsync(filePath, MagickFormat.WebP);

                var galleryFile = new GalleryFile
                {
                    Id = galleryImageId,
                    FileName = string.Concat(Path.GetFileNameWithoutExtension(file.FileName)
                        .Split(Path.GetInvalidFileNameChars())) + ".webp",
                    LevelId = levelId
                };
                
                await levelService.InsertGalleryFile(galleryFile);
                
                
                var level = galleryFile.Level ?? await levelService.GetLevelById(galleryFile.LevelId);
                if (level != null) await discordService.UpdateDiscordForum(await levelService.FetchLevelFiles(level));
                
                return Ok(mapper.Map<GalleryFileDto>(galleryFile));
            default:
                return BadRequest(new ErrorResponseModel("Invalid file type", ErrorCodes.LevelGalleryPutInvalidFileType, file.ContentType));
        }
    }
    
    [HttpDelete("{levelId}/gallery/{galleryFileId}")]
    public async Task<IActionResult> DeleteGalleryFile([FromRoute] long levelId, [FromRoute] long galleryFileId)
    {
        if (!await levelService.UserOwnsLevel((HttpContext.Items[0] as User)!.Id, levelId)) return Unauthorized(new ErrorResponseModel("It's not your level", ErrorCodes.LevelEditNotYours));
        var galleryFile = await levelService.GetGalleryFileById(levelId, galleryFileId);
        if (galleryFile == null) return NotFound(new ErrorResponseModel("Gallery file not found", ErrorCodes.LevelGalleryDeleteNotFound));
        await levelService.DeleteGalleryFile(galleryFile);
        System.IO.File.Delete(galleryFileId.GetIdFilePath("webp"));
        
        var level = galleryFile.Level ?? await levelService.GetLevelById(levelId);
        if (level == null) return StatusCode(StatusCodes.Status500InternalServerError, new ErrorResponseModel("Level not found but image deleted", ErrorCodes.LevelGalleryDeleteLevelNotFound));
        await discordService.UpdateDiscordForum(await levelService.FetchLevelFiles(level));
        return Ok(mapper.Map<LevelDto>(level));
    }
}