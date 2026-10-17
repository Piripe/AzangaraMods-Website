using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;

namespace AzangaraMods_Website_Back.Services.Levels;

public interface ILevelService
{
    public Task<int> Insert(Level level);
    public void SoftEditLevel(Level level);
    public Task<int> EditLevel(Level level);
    public Task<Level?> UpdateLevel(long levelId, string? newName, string? newDescription, bool? newPublished,
        LevelDifficulties? newDifficulty, short? newRoomAmount, string[]? newTags);
    public Task<Level?> GetLevelById(long levelId);
    public Task<Level> FetchLevelGallery(Level level);
    public Task<Level> FetchLevelFiles(Level level);
    public Task<Level> FetchLevelAuthor(Level level);
    public Task<Level[]> GetPublicLevels();
    public Task<Level[]> GetAllLevels();
    public Task<(Level[] levels, int total)> SearchLevels(bool? published, string? query, LevelDifficulties[] difficulties,
        string[] tags, LevelSortOrders sort, int offset, int limit, LevelVerificationStatus? verification = null);
    public Task<int> SetVerification(Level level, LevelVerificationStatus status, string? note = null);
    public Task<(string tag, int count)[]> GetPublicTags();
    public Task<bool> UserOwnsLevel(long userId, long levelId);
    public Task<bool> UserCanEditLevel(User user, long levelId);
    public Task<int> DeleteLevel(Level level);
    // Deletes the level, its files on disk and unpublishes its Discord post
    public Task PurgeLevel(Level level);
}