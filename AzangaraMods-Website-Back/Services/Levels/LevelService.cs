using AzangaraMods_Website_Back.Data;
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

    public async Task<Level?> UpdateLevel(long levelId, string? newName, string? newDescription, bool? newPublished,
        float? newDifficulty, string[]? newTags)
    {
        var level = db.Levels?.FirstOrDefault(x=>x.Id == levelId);
        if (newName != null) level?.Name = newName;
        if (newDescription != null) level?.Description = newDescription;
        if (newPublished.HasValue) level?.Published = newPublished.Value;
        if (newDifficulty.HasValue) level?.Difficulty = newDifficulty.Value;
        if (newTags != null) level?.Tags = newTags;
        await db.SaveChangesAsync();
        return level;
    }

    public Task<Level?> GetLevelById(long levelId)
    {
        return db.Levels?.FirstOrDefaultAsync(x=>x.Id == levelId)??Task.FromResult<Level?>(null);
    }

    public Task<int> InsertLevelFile(LevelFile file)
    {
        db.LevelFiles?.Add(file);
        return db.SaveChangesAsync();
    }

    public async Task<LevelFile?> UpdateLevelFile(long levelId, long levelFileId, string? newFilename, string? newEntrypoint)
    {
        var levelFile = db.LevelFiles?.FirstOrDefault(x=>x.Id == levelFileId&&x.LevelId == levelId);
        if (newFilename != null) levelFile?.FileName = newFilename;
        if (newEntrypoint != null) levelFile?.EntryPoint = newEntrypoint;
        await db.SaveChangesAsync();
        return levelFile;
    }

    public Task<LevelFile?> GetLevelFileById(long levelId, long levelFileId)
    {
        return db.LevelFiles?.FirstOrDefaultAsync(x=>x.Id == levelFileId&&x.LevelId == levelId)??Task.FromResult<LevelFile?>(null);

    }

    public Task<int> InsertGalleryFile(GalleryFile file)
    {
        db.GalleryFiles?.Add(file);
        return db.SaveChangesAsync();
    }

    public async Task<GalleryFile?> UpdateGalleryFile(long levelId, long galleryFileId, string? newFilename, string? newDescription)
    {
        var galleryFile = db.GalleryFiles?.FirstOrDefault(x=>x.Id == galleryFileId&&x.LevelId == levelId);
        if (newFilename != null) galleryFile?.FileName = newFilename;
        if (newDescription != null) galleryFile?.Description = newDescription;
        await db.SaveChangesAsync();
        return galleryFile;
    }

    public async Task<bool> UserOwnsLevel(long userId, long levelId)
    {
        return (await (db.Levels?.FirstOrDefaultAsync(x=>x.Id==levelId)??Task.FromResult<Level?>(null)))?.AuthorId == userId;
    }
}