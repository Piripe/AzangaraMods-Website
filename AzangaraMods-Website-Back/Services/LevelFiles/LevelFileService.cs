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

    public void SoftEditLevel(Level level)
    {
        db.Entry(level).Property(x => x.LastEdit).CurrentValue = DateTime.UtcNow;
    }
    public Task<int> EditLevel(Level level)
    {
        SoftEditLevel(level);
        return db.SaveChangesAsync();
    }

    public async Task<Level?> UpdateLevel(long levelId, string? newName, string? newDescription, bool? newPublished,
        float? newDifficulty, string[]? newTags)
    {
        var level = db.Levels?.FirstOrDefault(x=>x.Id == levelId);
        if (level == null) return null;
        if (!string.IsNullOrWhiteSpace(newName)) level.Name = newName;
        if (!string.IsNullOrWhiteSpace(newDescription)) level.Description = newDescription;
        if (newPublished.HasValue) level.Published = newPublished.Value;
        if (newDifficulty.HasValue) level.Difficulty = newDifficulty.Value;
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

    public async Task<int> InsertLevelFile(LevelFile file)
    {
        db.LevelFiles?.Add(file);
        var level = await GetLevelById(file.LevelId);
        if (level != null) SoftEditLevel(level);
        return await db.SaveChangesAsync();
    }

    public async Task<LevelFile?> UpdateLevelFile(long levelId, long levelFileId, string? newFilename, string? newEntrypoint)
    {
        var levelFile = db.LevelFiles?.FirstOrDefault(x=>x.Id == levelFileId&&x.LevelId == levelId);
        if (levelFile == null) return null;
        if (newFilename != null) levelFile.FileName = newFilename;
        if (newEntrypoint != null) levelFile.EntryPoint = newEntrypoint;
        var level = await GetLevelById(levelFile.LevelId);
        if (level != null) SoftEditLevel(level);
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
        var level = await GetLevelById(levelFile.LevelId);
        if (level != null) SoftEditLevel(level);
        return await db.SaveChangesAsync();
    }

    public async Task<int> InsertGalleryFile(GalleryFile file)
    {
        db.GalleryFiles?.Add(file);
        var level = await GetLevelById(file.LevelId);
        if (level != null) SoftEditLevel(level);
        return await db.SaveChangesAsync();
    }

    public async Task<GalleryFile?> UpdateGalleryFile(long levelId, long galleryFileId, string? newFilename, string? newDescription)
    {
        var galleryFile = db.GalleryFiles?.FirstOrDefault(x=>x.Id == galleryFileId&&x.LevelId == levelId);
        if (galleryFile == null) return null;
        if (newFilename != null) galleryFile.FileName = newFilename;
        if (newDescription != null) galleryFile.Description = newDescription;
        var level = await GetLevelById(galleryFile.LevelId);
        if (level != null) SoftEditLevel(level);
        await db.SaveChangesAsync();
        return galleryFile;
    }

    public Task<GalleryFile?> GetGalleryFileById(long levelId, long galleryFileId)
    {
        return db.GalleryFiles?.FirstOrDefaultAsync(x=>x.Id == galleryFileId&&x.LevelId == levelId)??Task.FromResult<GalleryFile?>(null);
    }

    public async Task<int> DeleteGalleryFile(GalleryFile galleryFile)
    {
        db.GalleryFiles?.Remove(galleryFile);
        var level = await GetLevelById(galleryFile.LevelId);
        if (level != null) SoftEditLevel(level);
        return await db.SaveChangesAsync();
    }

    public async Task<bool> UserOwnsLevel(long userId, long levelId)
    {
        return (await (db.Levels?.FirstOrDefaultAsync(x=>x.Id==levelId)??Task.FromResult<Level?>(null)))?.AuthorId == userId;
    }
}