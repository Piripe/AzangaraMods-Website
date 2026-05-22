using AzangaraMods_Website_Back.Models;

namespace AzangaraMods_Website_Back.Services.Levels;

public interface ILevelService
{
    public Task<int> Insert(Level level);
    public void SoftEditLevel(Level level);
    public Task<int> EditLevel(Level level);
    public Task<Level?> UpdateLevel(long levelId, string? newName, string? newDescription, bool? newPublished, float? newDifficulty, string[]? newTags);
    public Task<Level?> GetLevelById(long levelId);
    public Task<Level> FetchLevelFiles(Level level);
    public Task<Level[]> GetPublicLevels();
    public Task<bool> UserOwnsLevel(long userId, long levelId);
}