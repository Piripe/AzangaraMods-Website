using System.IO.Compression;
using System.Text;
using System.Text.Json.Serialization;
using AutoMapper;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Models.Dto;
using AzangaraMods_Website_Back.Services.Levels;
using AzangaraMods_Website_Back.Utils;
using AzangaraTools;
using AzangaraTools.Models.File;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore.Metadata;

namespace AzangaraMods_Website_Back.Controllers;

[Route("[controller]")]
public class LevelsController(IMapper mapper, ILevelService levelService) : Controller
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
    public record PutLevelFileResponseData(string id, string[] files);
    [HttpPut("files/{levelId}")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<IActionResult> PutLevelFile([FromForm] IFormFile? file, [FromRoute] long levelId)
    {
        if (file is null) return BadRequest(new ErrorResponseModel("No file or file too big"));

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

        var filePath = string.Format("{0:x}", levelFileId);
        filePath = Path.Combine(Environment.GetEnvironmentVariable("DATA_DIR") ?? "/data", filePath[..2], filePath[2..4], filePath[4..6], filePath[6..] + ".zip");

        Directory.CreateDirectory(Path.GetDirectoryName(filePath) ?? "");
        var fileStream = System.IO.File.Create(filePath);

        var finalZip = new ZipArchive(fileStream, ZipArchiveMode.Create);
        var pakEntry = finalZip.CreateEntry("level-data.pak");
        var pakStream = pakEntry.Open();
        PakHelper.Write(pakStream, pakFiles);

        await levelService.InsertLevelFile(new LevelFile()
        {
            Id = levelFileId,
            LevelId = levelId,
            FileName = string.Concat(Path.GetFileNameWithoutExtension(file.FileName)
                .Split(Path.GetInvalidFileNameChars())),
            FileSize = (int)pakStream.Position
        });
        
        pakStream.Close();
        
        //PakHelper.Write();
        
        return Ok(new PutLevelFileResponseData(levelFileId.ToString(), pakFiles.Select(x=>x.Path).ToArray()));
    }
}