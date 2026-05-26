using System.IO.Compression;
using System.Text;
using AzangaraMods_Website_Back.Attributes;
using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Services.Discord;
using AzangaraMods_Website_Back.Services.LevelFiles;
using AzangaraMods_Website_Back.Services.Levels;
using AzangaraMods_Website_Back.Utils;
using AzangaraTools;
using AzangaraTools.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.Metrics;
using Level = AzangaraTools.Models.Script.Level;

namespace AzangaraMods_Website_Back.Controllers.Admin;

[Route("admin/levels")]
public class LevelsController(ILevelService levelService, ILevelFileService levelFileService, IDiscordService discordService) : Controller
{
    [HttpGet("reload_level_file/{levelId}/{levelFileId}")]
    public async Task<IActionResult> ReloadLevelFile([FromRoute] long levelId, [FromRoute] long levelFileId)
    {
        if (!(HttpContext.Items[0] as User)!.Flags.HasFlag(UserFlags.Admin))
            return Unauthorized("You are not an admin");

        var levelFile = await levelFileService.GetLevelFileById(levelId, levelFileId);
        var level = await levelService.GetLevelById(levelId);
        
        if (level == null || levelFile == null) return NotFound("Level or file not found");

        level = await levelService.FetchLevelFiles(level);

        var filePath = levelFileId.GetIdFilePath("zip");
        var tempPath = filePath + ".temp";
        
        System.IO.File.Move(filePath, tempPath);
        
        
        var zipFile = System.IO.File.OpenRead(tempPath);
        var zip = await ZipArchive.CreateAsync(zipFile, ZipArchiveMode.Read, false, new UTF8Encoding());

        var pakStream =
            await (zip.Entries.FirstOrDefault()?.OpenAsync() ?? Task.FromResult<Stream>(new MemoryStream()));
        var pakFiles = PakHelper.Read(new SubStream(pakStream, zip.Entries.FirstOrDefault()?.Length??0));

        Console.WriteLine($"Processing level file {filePath}...");
        
        (List<string> entryPoints, List<Level> levels, pakFiles, string missingPath) = levelFileService.ProcessLevelFile(pakFiles, levelId);
        
        Console.WriteLine($"Processed level file. Levels in it: {levels.Count}\tUnique rooms in it: {levels.SelectMany(x => x.Rooms).Count()}");
        
        if (levelFile.Id == level.LevelFiles?.OrderByDescending(x => x.Id).First().Id)
        {        
            Console.WriteLine($"It's latest file, updating room amount...");
            levelFileService.UpdateRoomCount(levels, levelId);
        }
        
        Console.WriteLine($"Saving level file {filePath}...");
        
        // Save level
        var fileStream = System.IO.File.Create(filePath);

        var finalZip = new ZipArchive(fileStream, ZipArchiveMode.Create);
        var pakEntry = finalZip.CreateEntry("level-data.pak");
        var newPakStream = await pakEntry.OpenAsync();
        try
        {
            PakHelper.Write(newPakStream, pakFiles);
        }
        catch (Exception e)
        {
            System.IO.File.Delete(tempPath);
            return BadRequest(new ErrorResponseModel("Error during file processing",
                ErrorCodes.LevelFilePutPakWriteError, e.ToString()));
        }

        await levelFileService.UpdateLevelFile(levelId, levelFileId, null, missingPath.Length > 0 ? (pakFiles.Any(x=>x.Path == levelFile.EntryPoint) ? null : missingPath + levelFile.EntryPoint) : null, (int)newPakStream.Position);

        pakStream.Close();
        await zip.DisposeAsync();
        zipFile.Close();
        
        System.IO.File.Delete(tempPath);
        
        newPakStream.Close();
        await finalZip.DisposeAsync();
        fileStream.Close();
        
        return Ok("Level reprocessed");
    }
}