using AzangaraMods_Website_Back.Models;

namespace AzangaraMods_Website_Back.Services.Levels;

public interface ILevelService
{
    public Task<int> Insert(Level level);
    public Task<Level?> UpdateLevel(long levelId, string? newName, string? newDescription, bool? newPublished, float? newDifficulty, string[]? newTags);
    public Task<Level?> GetLevelById(long levelId);
    public Task<Level> FetchLevelFiles(Level level);
    public Task<Level[]> GetPublicLevels();
    public Task<bool> UserOwnsLevel(long userId, long levelId);
    public Task<int> InsertLevelFile(LevelFile file);
    public Task<LevelFile?> UpdateLevelFile(long levelId, long levelFileId, string? newFilename, string? newEntrypoint);
    public Task<LevelFile?> GetLevelFileById(long levelId, long levelFileId);
    public Task<int> DeleteLevelFile(LevelFile levelFile);
    public Task<int> InsertGalleryFile(GalleryFile file);
    public Task<GalleryFile?> UpdateGalleryFile(long levelId, long galleryFileId, string? newFilename, string? newDescription);
    public Task<GalleryFile?> GetGalleryFileById(long levelId, long galleryFileId);
    public Task<int> DeleteGalleryFile(GalleryFile galleryFile);
}