using AzangaraMods_Website_Back.Models;

namespace AzangaraMods_Website_Back.Services.LevelGalleries;

public interface ILevelGalleryService
{
    public Task<int> InsertGalleryFile(GalleryFile file);
    public Task<GalleryFile?> UpdateGalleryFile(long levelId, long galleryFileId, string? newFilename, string? newDescription);
    public Task<GalleryFile?> GetGalleryFileById(long levelId, long galleryFileId);
    public Task<int> DeleteGalleryFile(GalleryFile galleryFile);
}