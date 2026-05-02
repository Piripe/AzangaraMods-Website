using System.IO.Compression;
using System.Text;
using System.Text.Json.Serialization;
using AutoMapper;
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
    public record PutLevelRequestData(string name, string description, float difficulty, string tags);
    [HttpPut("")]
    public async Task<IActionResult> PutLevel([FromBody] PutLevelRequestData partialLevel)
    {
        if (partialLevel.name.Length >= 64) return BadRequest(new ErrorResponseModel("Name is too long"));
        if (partialLevel.description.Length >= 8192) return BadRequest(new ErrorResponseModel("Description is too long"));
        var tags = partialLevel.tags.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (tags.Length >= 10) return BadRequest(new ErrorResponseModel("Too many tags"));
        if (tags.Max(x=>x.Length) >= 32) return BadRequest(new ErrorResponseModel("Tag name is too long"));
        var level = new Level()
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
        if (!await levelService.UserOwnsLevel((HttpContext.Items[0] as User)!.Id, levelId)) return Unauthorized(new ErrorResponseModel("It's not your level"));
        if (
            partialLevel.name == null && 
            partialLevel.description == null && 
            partialLevel.published == null && 
            partialLevel.difficulty == null && 
            partialLevel.tags == null ) return BadRequest(new ErrorResponseModel("Request is null"));
        var level = await levelService.UpdateLevel(
            levelId,
            partialLevel.name,
            partialLevel.description,
            partialLevel.published,
            partialLevel.difficulty,
            partialLevel.tags);
        if (level == null) return BadRequest(new ErrorResponseModel("Level doesn't exists"));
        await discordService.UpdateDiscordForum(level);
        return Ok(mapper.Map<LevelDto>(level));
    }
    public record PutLevelFileResponseData(string id, string[] files);
    [HttpPut("{levelId}/files")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<IActionResult> PutLevelFile([FromForm] IFormFile? file, [FromRoute] long levelId)
    {
        if (file is null) return BadRequest(new ErrorResponseModel("No file or file too big"));
        if (!await levelService.UserOwnsLevel((HttpContext.Items[0] as User)!.Id, levelId)) return Unauthorized(new ErrorResponseModel("It's not your level"));

        IFile[] pakFiles;
        
        if (file.ContentType == "application/octet-stream")
        {
            // .pak
            // check if it's the right file format
            try
            {
                pakFiles = PakHelper.Read(file.OpenReadStream());
            }
            catch (Exception e)
            {
                return BadRequest(new ErrorResponseModel(e.Message));
            }
        } else if (file.ContentType == "application/zip")
        {
            // .zip
            var zip = await ZipArchive.CreateAsync(file.OpenReadStream(), ZipArchiveMode.Read, false, new UTF8Encoding());
            if (zip.Entries.Count > 1000) return BadRequest(new ErrorResponseModel("Too many files in the zip archive (use .pak instead)"));
            if (zip.Entries.Sum(x=>x.Length) > 1024*1024*1024) return BadRequest(new ErrorResponseModel("Decompressed file too big"));
            pakFiles = zip.Entries.Select(x => new ZipEntryFile(x)).ToArray();
        }
        else
        {
            return BadRequest(new ErrorResponseModel("Invalid file type"));
        }

        var levelFileId = await IdUtils.GenerateId();

        var filePath = levelFileId.GetIdFilePath("zip");

        Directory.CreateDirectory(Path.GetDirectoryName(filePath) ?? "");
        var fileStream = System.IO.File.Create(filePath);

        var finalZip = new ZipArchive(fileStream, ZipArchiveMode.Create);
        var pakEntry = finalZip.CreateEntry("level-data.pak");
        var pakStream = pakEntry.Open();
        PakHelper.Write(pakStream, pakFiles);

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

        var level = levelFile.Level ?? await levelService.GetLevelById(levelFile.LevelId);
        if (level != null) await discordService.UpdateDiscordForum(level);
        
        return Ok(new PutLevelFileResponseData(levelFileId.ToString(), pakFiles.Select(x=>x.Path).ToArray()));
    }
    
    public record PatchLevelFileRequestData(string? fileName, string? entryPoint);

    [HttpPatch("{levelId}/files/{levelFileId}")]
    public async Task<IActionResult> PatchLevelFile([FromBody] PatchLevelFileRequestData partialLevelFile, [FromRoute] long levelId, [FromRoute] long levelFileId)
    {
        if (!await levelService.UserOwnsLevel((HttpContext.Items[0] as User)!.Id, levelId)) return Unauthorized(new ErrorResponseModel("It's not your level"));
        if (partialLevelFile.entryPoint == null && partialLevelFile.fileName == null) return BadRequest(new ErrorResponseModel("Request is null"));
        var levelFile = await levelService.UpdateLevelFile(
            levelId,
            levelFileId,
            partialLevelFile.fileName,
            partialLevelFile.entryPoint);
        if (levelFile == null) return BadRequest(new ErrorResponseModel("Level file doesn't exists"));
        
        return Ok(mapper.Map<LevelFileDto>(levelFile));
    }
    
    
    [HttpPut("{levelId}/gallery")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> PutLevelGallery([FromForm] IFormFile? file, [FromRoute] long levelId)
    {
        if (file is null) return BadRequest(new ErrorResponseModel("No file or file too big"));
        if (!await levelService.UserOwnsLevel((HttpContext.Items[0] as User)!.Id, levelId)) return Unauthorized(new ErrorResponseModel("It's not your level"));

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
                if (level != null) await discordService.UpdateDiscordForum(level);
                
                return Ok(mapper.Map<GalleryFileDto>(galleryFile));
            default:
                return BadRequest(new ErrorResponseModel("Invalid file type"));
        }
    }
}