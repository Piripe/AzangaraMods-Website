using AzangaraMods_Website_Back.Models;
using AzangaraTools.Models.File;
using Level = AzangaraTools.Models.Script.Level;

namespace AzangaraMods_Website_Back.Services.LevelFiles;

public interface ILevelFileService
{
    public Task<int> InsertLevelFile(LevelFile file);
    public Task<LevelFile?> UpdateLevelFile(long levelId, long levelFileId, string? newFilename, string? newEntrypoint, int? newFileSize);
    public Task<LevelFile?> GetLevelFileById(long levelId, long levelFileId);
    public Task<int> DeleteLevelFile(LevelFile levelFile);
    public Task<int> DownloadLevelFile(LevelFile levelFile, string ipAddress);
    public (List<string>, List<Level>, IFile[], string) ProcessLevelFile(IFile[] files, long levelId);
    public void UpdateRoomCount(List<Level> levels, long levelId);
}