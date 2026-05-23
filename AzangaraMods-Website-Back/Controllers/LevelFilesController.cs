using System.IO.Compression;
using System.Text;
using System.Text.Json;
using AutoMapper;
using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Models.Dto;
using AzangaraMods_Website_Back.Services.Discord;
using AzangaraMods_Website_Back.Services.LevelFiles;
using AzangaraMods_Website_Back.Services.Levels;
using AzangaraMods_Website_Back.Utils;
using AzangaraTools;
using AzangaraTools.Models.File;
using AzangaraTools.Models.Script;
using AzangaraTools.Script;
using Microsoft.AspNetCore.Mvc;

namespace AzangaraMods_Website_Back.Controllers;

[Route("levels/{levelId:long}/files")]
public class LevelFilesController(IMapper mapper, ILevelService levelService, ILevelFileService levelFileService, IDiscordService discordService) : Controller
{
    public record PutLevelFileResponseData(string id, string[] files, string[] otherFiles);
    [HttpPut("")]
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
                    pakFiles = zip.Entries.Where(x=>!(string.IsNullOrWhiteSpace(x.FullName) || x.FullName.EndsWith('/')) ).Select(x => new ZipEntryFile(x)).ToArray<IFile>();
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
        
        // Level analysis
        List<AzangaraTools.Models.Script.Level> levelFiles = [];

        var entryPoints = pakFiles.Where(x=>
        {
            if (x.Path.EndsWith(".exec")) return true;
            if (!x.Path.EndsWith(".txt")) return false;
            try
            {
                var level = ScriptSerializer.Deserialize<AzangaraTools.Models.Script.Level>(x is PakFile ? new MemoryStream(x.ReadAllBytes()) : x.OpenRead());
                if (level == null) return false;
                levelFiles.Add(level);
            }
            catch (Exception ex)
            {
                return false;
            }
            return true;
        }).Select(x=>x.Path).ToList();

        string? missingPath = null;

        foreach (AzangaraTools.Models.Script.Level level in levelFiles)
        {
            foreach (LevelRoom room in level.Rooms)
            {
                void FindMissingPath(string path)
                {
                    for (var i = 0; i < path.Length; i++)
                    {
                        var cropPath = path[0..i];
                        if (pakFiles.All(x => cropPath + x.Path != path)) continue;

                        if (!string.IsNullOrWhiteSpace(cropPath) && cropPath.Length > missingPath?.Length) missingPath = cropPath;
                        return;
                    }
                }

                FindMissingPath(room.RoomFile);
            }
        }

        if (levelFiles.Count > 0)
        {
            _ = levelService.UpdateLevel(levelId, null, null, null, null, (short)levelFiles.First().Rooms.Length, null);
        }

        if (missingPath != null)
        {
            pakFiles = pakFiles.Select(IFile (x) => new VirtualStreamFile(missingPath + x.Path, x.OpenRead())).ToArray();
            entryPoints = entryPoints.Select(x=>missingPath + x).ToList();
        }
        
        // Save level
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
            FileSize = (int)pakStream.Position,
            EntryPoint = entryPoints.Count > 0 ?  entryPoints[0] : null,
        };
        
        await levelFileService.InsertLevelFile(levelFile);
        
        pakStream.Close();
        await finalZip.DisposeAsync();
        fileStream.Close();
        
        return Ok(new PutLevelFileResponseData(levelFileId.ToString(), entryPoints.ToArray(), pakFiles.Where(x=>!entryPoints.Contains(x.Path)).Select(x=>x.Path).ToArray()));
    }
    
    public record PatchLevelFileRequestData(string? fileName, string? entryPoint);

    [HttpPatch("{levelFileId}")]
    public async Task<IActionResult> PatchLevelFile([FromBody] PatchLevelFileRequestData partialLevelFile, [FromRoute] long levelId, [FromRoute] long levelFileId)
    {
        if (!await levelService.UserOwnsLevel((HttpContext.Items[0] as User)!.Id, levelId)) return Unauthorized(new ErrorResponseModel("It's not your level", ErrorCodes.LevelEditNotYours));
        if (partialLevelFile.entryPoint == null && partialLevelFile.fileName == null) return BadRequest(new ErrorResponseModel("Request is null", ErrorCodes.LevelFilePatchNull));
        var levelFile = await levelFileService.UpdateLevelFile(
            levelId,
            levelFileId,
            partialLevelFile.fileName,
            partialLevelFile.entryPoint);
        if (levelFile == null) return NotFound(new ErrorResponseModel("Level file not found", ErrorCodes.LevelFilePatchLevelNotFound));
        
        var level = levelFile.Level ?? await levelService.GetLevelById(levelFile.LevelId);
        if (level != null) await discordService.UpdateDiscordForum(level);
        
        return Ok(mapper.Map<LevelFileDto>(levelFile));
    }
    
    [HttpDelete("{levelFileId}")]
    public async Task<IActionResult> DeleteLevelFile([FromRoute] long levelId, [FromRoute] long levelFileId)
    {
        if (!await levelService.UserOwnsLevel((HttpContext.Items[0] as User)!.Id, levelId)) return Unauthorized(new ErrorResponseModel("It's not your level", ErrorCodes.LevelEditNotYours));
        var levelFile = await levelFileService.GetLevelFileById(levelId, levelFileId);
        if (levelFile == null) return NotFound(new ErrorResponseModel("Level file not found", ErrorCodes.LevelFileDeleteNotFound));
        await levelFileService.DeleteLevelFile(levelFile);
        System.IO.File.Delete(levelFileId.GetIdFilePath("zip"));
        
        var level = levelFile.Level ?? await levelService.GetLevelById(levelId);
        if (level == null) return StatusCode(StatusCodes.Status500InternalServerError, new ErrorResponseModel("Level not found but file deleted", ErrorCodes.LevelFileDeleteLevelNotFound));
        await discordService.UpdateDiscordForum(await levelService.FetchLevelFiles(level));
        return Ok(mapper.Map<LevelDto>(level));
    }
}