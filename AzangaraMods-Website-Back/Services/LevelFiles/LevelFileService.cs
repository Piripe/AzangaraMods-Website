using AzangaraMods_Website_Back.Data;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Services.Levels;
using Microsoft.EntityFrameworkCore;

namespace AzangaraMods_Website_Back.Services.LevelFiles;

public class LevelFileService(MainDbContext db, ILevelService levelService) : ILevelFileService
{
    public async Task<int> InsertLevelFile(LevelFile file)
    {
        db.LevelFiles?.Add(file);
        var level = await levelService.GetLevelById(file.LevelId);
        if (level != null) levelService.SoftEditLevel(level);
        return await db.SaveChangesAsync();
    }

    public async Task<LevelFile?> UpdateLevelFile(long levelId, long levelFileId, string? newFilename, string? newEntrypoint)
    {
        var levelFile = db.LevelFiles?.FirstOrDefault(x=>x.Id == levelFileId&&x.LevelId == levelId);
        if (levelFile == null) return null;
        if (newFilename != null) levelFile.FileName = newFilename;
        if (newEntrypoint != null) levelFile.EntryPoint = newEntrypoint;
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
}