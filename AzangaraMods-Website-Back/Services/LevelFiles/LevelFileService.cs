using System.IO.Compression;
using System.Runtime.CompilerServices;
using System.Text;
using AzangaraMods_Website_Back.Data;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Services.Discord;
using AzangaraMods_Website_Back.Services.Levels;
using AzangaraMods_Website_Back.Utils;
using AzangaraTools;
using AzangaraTools.Models;
using AzangaraTools.Models.File;
using AzangaraTools.Script;
using Microsoft.EntityFrameworkCore;
using Level = AzangaraTools.Models.Script.Level;

namespace AzangaraMods_Website_Back.Services.LevelFiles;

public class LevelFileService(MainDbContext db, ILevelService levelService, IDiscordService discordService) : ILevelFileService
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

    private static readonly RateLimiter UsersDownloadRateLimiter = new(10, TimeSpan.FromHours(1));
    private static readonly RateLimiter DownloadRateLimiter = new(1, TimeSpan.FromHours(1));
    public async Task<int> DownloadLevelFile(LevelFile levelFile, string ipAddress)
    {
        if (UsersDownloadRateLimiter.IsLimited(ipAddress)) return 0;
        if (DownloadRateLimiter.IsLimited(levelFile.LevelId + ipAddress)) return 0;
        
        db.Entry(levelFile).Property(x => x.Downloads).CurrentValue++;

        _ = discordService.PushWebhookUpdateTask(levelFile.Level!);
        
        return await db.SaveChangesAsync();
    }

    public (List<string>, List<Level>, IFile[], string) ProcessLevelFile(IFile[] files, long levelId)
    {
        files = files.Where(x=>!(string.IsNullOrWhiteSpace(x.Path) || x.Path.EndsWith('/'))).ToArray();
        
        // Fix caps path
        
        var upperPaths = files
            .Where(x=>x.Path.Any(char.IsUpper))
            .Select(x=>(
                Encoding.ASCII.GetBytes(x.Path),
                Encoding.ASCII.GetBytes(x.Path.ToLowerInvariant()),
                x.Path)
            ).ToList();

        if (upperPaths.Count > 0)
        {
            files = files.Select(file =>
            {
                if (file.Path.EndsWith(".room") || file.Path.EndsWith(".sav"))
                {
                    var data = file.ReadAllBytes();

                    foreach (var paths in upperPaths)
                    {
                        int i = 0;
                        while (i <= data.Length - paths.Item1.Length)
                        {
                            // Check if searchBytes matches at position i
                            bool match = true;
                            for (int j = 0; j < paths.Item1.Length; j++)
                            {
                                if (data[i + j] != paths.Item1[j])
                                {
                                    match = false;
                                    break;
                                }
                            }

                            if (match)
                            {
                                Array.Copy(paths.Item2, 0, data, i, paths.Item2.Length);
                                i += paths.Item2.Length;
                            }
                            else
                            {
                                i++;
                            }
                        }
                    }

                    return new VirtualFile(file.Path.ToLowerInvariant(), data);
                }
                if (file.Path.EndsWith(".txt") || file.Path.EndsWith(".exec") || file.Path.EndsWith(".part"))
                {
                    return new VirtualFile(
                        file.Path.ToLowerInvariant(),
                        Encoding.ASCII.GetBytes(
                            upperPaths.Aggregate(
                                Encoding.ASCII.GetString(file.ReadAllBytes()),
                                (current, path) => current.Replace(path.Path, path.Path.ToLowerInvariant())
                                )
                            )
                        );
                }

                file.Rename(file.Path.ToLowerInvariant());
                return file;
            }).ToArray();
        }

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
            foreach (var file in files)
            {
                file.Rename(missingPath + file.Path);
            }
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
       await levelService.UpdateLevel(levelId, null, null, null, null, (short)roomAmount,
            null);
    }

    // Runs a stored level file through ProcessLevelFile again. The level must have its LevelFiles loaded.
    // On failure the original file is restored and the exception is rethrown.
    public async Task ReprocessLevelFile(Models.Level level, LevelFile levelFile)
    {
        var filePath = levelFile.Id.GetIdFilePath("zip");
        var tempPath = filePath + ".temp";

        File.Move(filePath, tempPath, true);
        try
        {
            IFile[] pakFiles;
            string missingPath;
            List<Level> levels;
            int fileSize;

            await using (var zipFile = File.OpenRead(tempPath))
            await using (var zip = await ZipArchive.CreateAsync(zipFile, ZipArchiveMode.Read, false, new UTF8Encoding()))
            {
                var entry = zip.Entries.FirstOrDefault();
                await using var pakStream = entry != null ? await entry.OpenAsync() : new MemoryStream();
                pakFiles = PakHelper.Read(new SubStream(pakStream, entry?.Length ?? 0));

                (_, levels, pakFiles, missingPath) = ProcessLevelFile(pakFiles, level.Id);

                // Files are read lazily from the old archive, so write the new one while it is still open
                await using var fileStream = File.Create(filePath);
                await using var finalZip = new ZipArchive(fileStream, ZipArchiveMode.Create);
                await using var newPakStream = await finalZip.CreateEntry("level-data.pak").OpenAsync();
                PakHelper.Write(newPakStream, pakFiles);
                fileSize = (int)newPakStream.Position;
            }

            if (levelFile.Id == level.LevelFiles?.MaxBy(x => x.Id)?.Id)
            {
                await UpdateRoomCount(levels, level.Id);
            }

            var newEntryPoint = missingPath.Length > 0 && pakFiles.All(x => x.Path != levelFile.EntryPoint)
                ? missingPath + levelFile.EntryPoint
                : null;
            await UpdateLevelFile(level.Id, levelFile.Id, null, newEntryPoint, fileSize);

            File.Delete(tempPath);
        }
        catch
        {
            File.Move(tempPath, filePath, true);
            throw;
        }
    }
}
