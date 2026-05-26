using System.Runtime.CompilerServices;
using AzangaraMods_Website_Back.Data;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Services.Levels;
using AzangaraMods_Website_Back.Utils;
using AzangaraTools.Models.File;
using AzangaraTools.Script;
using Microsoft.EntityFrameworkCore;
using Level = AzangaraTools.Models.Script.Level;

namespace AzangaraMods_Website_Back.Services.LevelFiles;

public class LevelFileService(MainDbContext db, ILevelService levelService) : ILevelFileService
{
    private ILevelFileService _levelFileServiceImplementation;

    public async Task<int> InsertLevelFile(LevelFile file)
    {
        db.LevelFiles?.Add(file);
        var level = await levelService.GetLevelById(file.LevelId);
        if (level != null) levelService.SoftEditLevel(level);
        return await db.SaveChangesAsync();
    }

    public async Task<LevelFile?> UpdateLevelFile(long levelId, long levelFileId, string? newFilename, string? newEntrypoint, int? newFileSize)
    {
        var levelFile = db.LevelFiles?.FirstOrDefault(x=>x.Id == levelFileId&&x.LevelId == levelId);
        if (levelFile == null) return null;
        if (newFilename != null) levelFile.FileName = newFilename;
        if (newEntrypoint != null) levelFile.EntryPoint = newEntrypoint;
        if (newFileSize.HasValue) levelFile.FileSize = newFileSize.Value;
        var level = await levelService.GetLevelById(levelFile.LevelId);
        if (level != null) levelService.SoftEditLevel(level);
        await db.SaveChangesAsync();
        return levelFile;
    }

    public Task<LevelFile?> GetLevelFileById(long levelId, long levelFileId)
    {
        return db.LevelFiles?.FirstOrDefaultAsync(x=>x.Id == levelFileId&&x.LevelId == levelId)??Task.FromResult<LevelFile?>(null);

    }

    public async Task<int> DeleteLevelFile(LevelFile levelFile)
    {
        db.LevelFiles?.Remove(levelFile);
        var level = await levelService.GetLevelById(levelFile.LevelId);
        if (level != null) levelService.SoftEditLevel(level);
        return await db.SaveChangesAsync();
    }

    private static readonly RateLimiter DownloadRateLimiter = new(1, TimeSpan.FromHours(1));
    public async Task<int> DownloadLevelFile(LevelFile levelFile, string ipAddress)
    {
        if (DownloadRateLimiter.IsLimited(ipAddress)) return 0;
        
        db.Entry(levelFile).Property(x => x.Downloads).CurrentValue++;
        
        return await db.SaveChangesAsync();
    }

    public (List<string>, List<Level>, IFile[], string) ProcessLevelFile(IFile[] files, long levelId)
    {

        // Level analysis
        List<AzangaraTools.Models.Script.Level> levelFiles = [];

        var entryPoints = files.Where(x =>
        {
            if (x.Path.EndsWith(".exec")) return true;
            if (!x.Path.EndsWith(".txt")) return false;
            try
            {
                var level = ScriptSerializer.Deserialize<AzangaraTools.Models.Script.Level>(x is PakFile
                    ? new MemoryStream(x.ReadAllBytes())
                    : x.OpenRead());
                if (level == null) return false;
                levelFiles.Add(level);
            }
            catch (Exception ex)
            {
                return false;
            }

            return true;
        }).Select(x => x.Path).ToList();

        string missingPath = "";

        foreach (AzangaraTools.Models.Script.Level level in levelFiles)
        {
            foreach (var room in level.Rooms)
            {
                void FindMissingPath(string path)
                {
                    if (files.Any(x => missingPath + x.Path == path)) return;
                    for (var i = 0; i < path.Length; i++)
                    {
                        var cropPath = path[0..i];
                        if (files.All(x => cropPath + x.Path != path)) continue;

                        if ((!string.IsNullOrWhiteSpace(cropPath)) && (cropPath.Length > missingPath.Length))
                            missingPath = cropPath;
                        return;
                    }
                }

                FindMissingPath(room.RoomFile);
            }
        }


        if (!string.IsNullOrWhiteSpace(missingPath))
        {
            files = files.Select(IFile (x) => new VirtualStreamFile(missingPath + x.Path, x.OpenRead()))
                .ToArray();
            entryPoints = entryPoints.Select(x => missingPath + x).ToList();
        }

        return (entryPoints, levelFiles, files.ToArray(), missingPath);
    }

    public async Task UpdateRoomCount(List<Level> levels, long levelId)
    {
        if (levels.Count <= 0) return;
        
        var roomAmount = levels
            .Sum(levelFile => 
                levelFile.Maze
                    .SelectMany(x=>x.Split(','))
                    .Count(x => int.TryParse(x, out var mazeRoomId) && levelFile.Rooms.Any(y => y.Id == mazeRoomId))
            );
        Console.WriteLine($"Room Amount: {roomAmount}");
        await levelService.UpdateLevel(levelId, null, null, null, null, (short)roomAmount,
            null);
    }
}