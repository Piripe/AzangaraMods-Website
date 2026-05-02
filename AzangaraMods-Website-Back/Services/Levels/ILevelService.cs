using AzangaraMods_Website_Back.Models;

namespace AzangaraMods_Website_Back.Services.Levels;

public interface ILevelService
{
    public Task<int> Insert(Level level);
    public Task<int> InsertLevelFile(LevelFile file);
    public Task<LevelFile?> UpdateLevelFile(long levelId, long levelFileId, string? newFilename, string? newEntrypoint);
    public Task<int> InsertGalleryFile(GalleryFile file);
    public Task<GalleryFile?> UpdateGalleryFile(long levelId, long galleryFileId, string? newFilename, string? newDescription);
    public Task<bool> UserOwnsLevel(long userId, long levelId);
}