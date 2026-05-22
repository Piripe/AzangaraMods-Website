using System.IO.Compression;
using System.Text;
using AzangaraMods_Website_Back.Attributes;
using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Services.LevelFiles;
using AzangaraMods_Website_Back.Services.LevelGalleries;
using AzangaraMods_Website_Back.Services.Levels;
using AzangaraMods_Website_Back.Utils;
using Microsoft.AspNetCore.Mvc;

namespace AzangaraMods_Website_Back.Controllers;

[Route("[controller]"), Public]
public class DownloadController(ILevelService levelService, ILevelFileService levelFileService, ILevelGalleryService levelGalleryService) : Controller
{
    
    [HttpGet("level/{levelId}/files/{levelFileId}")]
    public async Task<IActionResult> DownloadLevelFile([FromRoute] long levelId, [FromRoute] long levelFileId, [FromQuery] string ext = "pak")
    {
        var level = await levelService.GetLevelById(levelId);
        if (level == null) return NotFound(new ErrorResponseModel("Level not found", ErrorCodes.DownloadLevelNotFound));
        if (!level.Published && (HttpContext.Items[0] as User)!.Id != level.AuthorId) return Unauthorized(new ErrorResponseModel("Level is restricted", ErrorCodes.DownloadLevelRestricted));
        var levelFile = level?.LevelFiles?.FirstOrDefault(x=>x.Id == levelFileId) ?? await levelFileService.GetLevelFileById(levelId, levelFileId);
        if (levelFile == null) return NotFound(new ErrorResponseModel("Level file not found", ErrorCodes.DownloadLevelFileNotFound));

        var zipFile = System.IO.File.OpenRead(levelFileId.GetIdFilePath("zip"));
        
        switch (ext)
        {
            case "zip":
                return File(zipFile, "application/zip", levelFile.FileName + ".zip");
            case "pak":
                var zip = await ZipArchive.CreateAsync(zipFile, ZipArchiveMode.Read, false, new UTF8Encoding());
                
                return File(await (zip.Entries.FirstOrDefault()?.OpenAsync() ?? Task.FromResult<Stream>(new MemoryStream())), "application/octet-stream", levelFile.FileName + ".pak");
            default:
                return BadRequest(new ErrorResponseModel("Unsupported file type", ErrorCodes.DownloadLevelFileUnsupportedType));
        }
        
    }
    
    [HttpGet("level/{levelId}/gallery/{galleryFileId}")]
    public async Task<IActionResult> DownloadLevelFile([FromRoute] long levelId, [FromRoute] long galleryFileId)
    {
        var level = await levelService.GetLevelById(levelId);
        if (level == null)  return NotFound(new ErrorResponseModel("Level not found", ErrorCodes.DownloadLevelNotFound));
        //if (!level.Published && (HttpContext.Items[0] as User)?.Id != level.AuthorId) return Unauthorized(new ErrorResponseModel("Level is restricted"));
        var galleryFile = level?.GalleryFiles?.FirstOrDefault(x=>x.Id == galleryFileId) ?? await levelGalleryService.GetGalleryFileById(levelId, galleryFileId);
        if (galleryFile == null) return NotFound(new ErrorResponseModel("Gallery file not found", ErrorCodes.DownloadGalleryFileNotFound));

        var imageFile = System.IO.File.OpenRead(galleryFileId.GetIdFilePath("webp"));
        
        Response.ContentType = "image/webp";
        return Ok(imageFile);
        
    }
}