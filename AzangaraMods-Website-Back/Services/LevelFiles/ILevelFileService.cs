using AzangaraMods_Website_Back.Models;

namespace AzangaraMods_Website_Back.Services.LevelFiles;

public interface ILevelFileService
{
    public Task<int> InsertLevelFile(LevelFile file);
    public Task<LevelFile?> UpdateLevelFile(long levelId, long levelFileId, string? newFilename, string? newEntrypoint);
    public Task<LevelFile?> GetLevelFileById(long levelId, long levelFileId);
    public Task<int> DeleteLevelFile(LevelFile levelFile);
}