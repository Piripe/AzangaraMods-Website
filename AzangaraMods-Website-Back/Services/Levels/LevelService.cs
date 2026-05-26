using AzangaraMods_Website_Back.Data;
using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Services.Tokens;
using Microsoft.EntityFrameworkCore;

namespace AzangaraMods_Website_Back.Services.Levels;

public class LevelService(MainDbContext db) : ILevelService
{
    public Task<int> Insert(Level level)
    {
        db.Levels?.Add(level);
        return db.SaveChangesAsync();
    }

    public void SoftEditLevel(Level level)
    {
        level.LastEdit = DateTime.UtcNow;
    }
    public Task<int> EditLevel(Level level)
    {
        SoftEditLevel(level);
        return db.SaveChangesAsync();
    }

    public async Task<Level?> UpdateLevel(long levelId, string? newName, string? newDescription, bool? newPublished,
        LevelDifficulties? newDifficulty, short? newRoomAmount, string[]? newTags)
    {
        var level = db.Levels?.FirstOrDefault(x=>x.Id == levelId);
        if (level == null) return null;
        if (!string.IsNullOrWhiteSpace(newName)) level.Name = newName;
        if (!string.IsNullOrWhiteSpace(newDescription)) level.Description = newDescription;
        if (newPublished.HasValue) level.Published = newPublished.Value;
        if (newDifficulty.HasValue) level.Difficulty = newDifficulty.Value;
        if (newRoomAmount.HasValue) level.RoomAmount = newRoomAmount.Value;
        if (newTags != null) level.Tags = newTags;
        SoftEditLevel(level);
        await db.SaveChangesAsync();
        return level;
    }

    public Task<Level?> GetLevelById(long levelId)
    {
        return db.Levels?.FirstOrDefaultAsync(x=>x.Id == levelId)??Task.FromResult<Level?>(null);
    }

    public async Task<Level> FetchLevelFiles(Level level)
    {
        level.LevelFiles = await db.LevelFiles!.Where(x => x.LevelId == level.Id).ToArrayAsync();
        level.GalleryFiles = await db.GalleryFiles!.Where(x => x.LevelId == level.Id).ToArrayAsync();
        return level;
    }

    public Task<Level[]> GetPublicLevels()
    {
        return db.Levels?.Where(x=>x.Published).ToArrayAsync()??Task.FromResult<Level[]>([]);
    }

    public async Task<bool> UserOwnsLevel(long userId, long levelId)
    {
        return (await (db.Levels?.FirstOrDefaultAsync(x=>x.Id==levelId)??Task.FromResult<Level?>(null)))?.AuthorId == userId;
    }
}