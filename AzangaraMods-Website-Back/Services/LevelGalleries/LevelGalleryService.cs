using AzangaraMods_Website_Back.Data;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Services.Levels;
using Microsoft.EntityFrameworkCore;

namespace AzangaraMods_Website_Back.Services.LevelGalleries;

public class LevelGalleryService(MainDbContext db, ILevelService levelService) : ILevelGalleryService
{
    public async Task<int> InsertGalleryFile(GalleryFile file)
    {
        db.GalleryFiles?.Add(file);
        var level = await levelService.GetLevelById(file.LevelId);
        if (level != null) levelService.SoftEditLevel(level);
        return await db.SaveChangesAsync();
    }

    public async Task<GalleryFile?> UpdateGalleryFile(long levelId, long galleryFileId, string? newFilename, string? newDescription)
    {
        var galleryFile = db.GalleryFiles?.FirstOrDefault(x=>x.Id == galleryFileId&&x.LevelId == levelId);
        if (galleryFile == null) return null;
        if (newFilename != null) galleryFile.FileName = newFilename;
        if (newDescription != null) galleryFile.Description = newDescription;
        var level = await levelService.GetLevelById(galleryFile.LevelId);
        if (level != null) levelService.SoftEditLevel(level);
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
        var level = await levelService.GetLevelById(galleryFile.LevelId);
        if (level != null) levelService.SoftEditLevel(level);
        return await db.SaveChangesAsync();
    }

    public async Task<bool> UserOwnsLevel(long userId, long levelId)
    {
        return (await (db.Levels?.FirstOrDefaultAsync(x=>x.Id==levelId)??Task.FromResult<Level?>(null)))?.AuthorId == userId;
    }
}