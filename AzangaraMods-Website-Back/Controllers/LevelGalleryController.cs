using AutoMapper;
using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Models.Dto;
using AzangaraMods_Website_Back.Services.Discord;
using AzangaraMods_Website_Back.Services.LevelGalleries;
using AzangaraMods_Website_Back.Services.Levels;
using AzangaraMods_Website_Back.Utils;
using ImageMagick;
using Microsoft.AspNetCore.Mvc;

namespace AzangaraMods_Website_Back.Controllers;

[Route("levels/{levelId:long}/gallery")]
public class LevelGalleryController(IMapper mapper, ILevelService levelService, ILevelGalleryService levelGalleryService, IDiscordService discordService) : Controller
{
    [HttpPut("")]
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
                
                await levelGalleryService.InsertGalleryFile(galleryFile);
                
                
                var level = galleryFile.Level ?? await levelService.GetLevelById(galleryFile.LevelId);
                if (level != null) await discordService.UpdateDiscordForum(await levelService.FetchLevelFiles(level));
                
                return Ok(mapper.Map<GalleryFileDto>(galleryFile));
            default:
                return BadRequest(new ErrorResponseModel("Invalid file type", ErrorCodes.LevelGalleryPutInvalidFileType, file.ContentType));
        }
    }
    
    [HttpDelete("{galleryFileId}")]
    public async Task<IActionResult> DeleteGalleryFile([FromRoute] long levelId, [FromRoute] long galleryFileId)
    {
        if (!await levelService.UserOwnsLevel((HttpContext.Items[0] as User)!.Id, levelId)) return Unauthorized(new ErrorResponseModel("It's not your level", ErrorCodes.LevelEditNotYours));
        var galleryFile = await levelGalleryService.GetGalleryFileById(levelId, galleryFileId);
        if (galleryFile == null) return NotFound(new ErrorResponseModel("Gallery file not found", ErrorCodes.LevelGalleryDeleteNotFound));
        await levelGalleryService.DeleteGalleryFile(galleryFile);
        System.IO.File.Delete(galleryFileId.GetIdFilePath("webp"));
        
        var level = galleryFile.Level ?? await levelService.GetLevelById(levelId);
        if (level == null) return StatusCode(StatusCodes.Status500InternalServerError, new ErrorResponseModel("Level not found but image deleted", ErrorCodes.LevelGalleryDeleteLevelNotFound));
        await discordService.UpdateDiscordForum(await levelService.FetchLevelFiles(level));
        return Ok(mapper.Map<LevelDto>(level));
    }
}