using AzangaraMods_Website_Back.Data;
using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Services.Discord;
using AzangaraMods_Website_Back.Utils;
using Microsoft.EntityFrameworkCore;

namespace AzangaraMods_Website_Back.Services.Levels;

public class LevelService(MainDbContext db, IDiscordService discordService) : ILevelService
{
    public Task<int> Insert(Level level)
    {
        db.Levels?.Add(level);
        return db.SaveChangesAsync();
    }

    public void SoftEditLevel(Level level)
    {
        level.LastEdit = DateTime.UtcNow;
    }
    public Task<int> EditLevel(Level level)
    {
        SoftEditLevel(level);
        return db.SaveChangesAsync();
    }

    public async Task<Level?> UpdateLevel(long levelId, string? newName, string? newDescription, bool? newPublished,
        LevelDifficulties? newDifficulty, short? newRoomAmount, string[]? newTags)
    {
        var level = db.Levels?.FirstOrDefault(x=>x.Id == levelId);
        if (level == null) return null;
        if (!string.IsNullOrWhiteSpace(newName)) level.Name = newName;
        if (!string.IsNullOrWhiteSpace(newDescription)) level.Description = newDescription;
        if (newPublished.HasValue) level.Published = newPublished.Value;
        if (newDifficulty.HasValue) level.Difficulty = newDifficulty.Value;
        if (newRoomAmount.HasValue) level.RoomAmount = newRoomAmount.Value;
        if (newTags != null) level.Tags = newTags;
        SoftEditLevel(level);
        await db.SaveChangesAsync();
        return level;
    }

    public Task<Level?> GetLevelById(long levelId)
    {
        return db.Levels?.FirstOrDefaultAsync(x=>x.Id == levelId)??Task.FromResult<Level?>(null);
    }

    public async Task<Level> FetchLevelGallery(Level level)
    {
        level.GalleryFiles = await db.GalleryFiles!.Where(x => x.LevelId == level.Id).ToArrayAsync();
        return level;
    }

    public async Task<Level> FetchLevelFiles(Level level)
    {
        level.LevelFiles = await db.LevelFiles!.Where(x => x.LevelId == level.Id).ToArrayAsync();
        level.GalleryFiles = await db.GalleryFiles!.Where(x => x.LevelId == level.Id).ToArrayAsync();
        return level;
    }

    public async Task<Level> FetchLevelAuthor(Level level)
    {
        level.Author = await db.Users!.FirstAsync(x => x.Id == level.AuthorId);
        return level;
    }

    public Task<Level[]> GetPublicLevels()
    {
        return db.Levels?.Where(x=>x.Published).ToArrayAsync()??Task.FromResult<Level[]>([]);
    }

    public Task<Level[]> GetAllLevels()
    {
        return db.Levels?.ToArrayAsync()??Task.FromResult<Level[]>([]);
    }

    // published == null searches every level, drafts included (admin panel)
    public async Task<(Level[] levels, int total)> SearchLevels(bool? published, string? query, LevelDifficulties[] difficulties,
        string[] tags, LevelSortOrders sort, int offset, int limit, LevelVerificationStatus? verification = null, long? authorId = null)
    {
        var levels = db.Levels!.AsQueryable();
        if (published.HasValue) levels = levels.Where(x => x.Published == published.Value);
        // Public searches hide the levels of disabled accounts
        if (published == true) levels = levels.Where(x => (x.Author!.Flags & UserFlags.Disabled) == 0);
        if (verification.HasValue) levels = levels.Where(x => x.Verification == verification.Value);
        if (authorId.HasValue) levels = levels.Where(x => x.AuthorId == authorId.Value);

        string? pattern = null;
        if (!string.IsNullOrWhiteSpace(query))
        {
            pattern = "%" + EscapeLikePattern(query.Trim()) + "%";
            levels = levels.Where(x => EF.Functions.ILike(x.Name, pattern, "\\") || EF.Functions.ILike(x.Description, pattern, "\\"));
        }
        if (difficulties.Length > 0) levels = levels.Where(x => difficulties.Contains(x.Difficulty));
        foreach (var tag in tags) levels = levels.Where(x => x.Tags.Contains(tag));

        var total = await levels.CountAsync();

        levels = sort switch
        {
            LevelSortOrders.Newest => levels.OrderByDescending(x => x.Id),
            LevelSortOrders.Updated => levels.OrderByDescending(x => x.LastEdit),
            LevelSortOrders.VerificationRequested => levels.OrderBy(x => x.VerificationRequested).ThenBy(x => x.Id),
            LevelSortOrders.Downloads => levels.OrderByDescending(x => x.LevelFiles!.Sum(f => f.Downloads)).ThenByDescending(x => x.Id),
            // Name matches rank above description-only matches
            _ when pattern != null => levels
                .OrderByDescending(x => EF.Functions.ILike(x.Name, pattern, "\\"))
                .ThenByDescending(x => x.LevelFiles!.Sum(f => f.Downloads))
                .ThenByDescending(x => x.Id),
            _ => levels.OrderByDescending(x => x.LevelFiles!.Sum(f => f.Downloads)).ThenByDescending(x => x.Id),
        };

        var page = await levels
            .Skip(offset)
            .Take(limit)
            .Include(x => x.Author)
            .Include(x => x.LevelFiles)
            .Include(x => x.GalleryFiles)
            .AsSplitQuery()
            .ToArrayAsync();
        return (page, total);
    }

    public async Task<(string tag, int count)[]> GetPublicTags()
    {
        var tags = await db.Levels!.Where(x => x.Published && (x.Author!.Flags & UserFlags.Disabled) == 0).Select(x => x.Tags).ToArrayAsync();
        return tags
            .SelectMany(x => x)
            .Where(x => x.Length > 0)
            .GroupBy(x => x)
            .Select(x => (x.Key, x.Count()))
            .OrderByDescending(x => x.Item2)
            .ThenBy(x => x.Key)
            .ToArray();
    }

    public async Task<(int levels, int downloads)> GetPublicAuthorStats(long authorId)
    {
        var levels = db.Levels!.Where(x => x.AuthorId == authorId && x.Published);
        return (await levels.CountAsync(), await levels.SelectMany(x => x.LevelFiles!).SumAsync(f => f.Downloads));
    }

    public Task<int> SetVerification(Level level, LevelVerificationStatus status, string? note = null)
    {
        level.Verification = status;
        level.VerificationNote = note;
        if (status == LevelVerificationStatus.Pending) level.VerificationRequested = DateTime.UtcNow;
        return db.SaveChangesAsync();
    }

    private static string EscapeLikePattern(string text)
    {
        return text.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
    }

    public async Task<bool> UserOwnsLevel(long userId, long levelId)
    {
        return (await (db.Levels?.FirstOrDefaultAsync(x=>x.Id==levelId)??Task.FromResult<Level?>(null)))?.AuthorId == userId;
    }

    public async Task<bool> UserCanEditLevel(User user, long levelId)
    {
        return user.Flags.HasFlag(UserFlags.Admin) || await UserOwnsLevel(user.Id, levelId);
    }

    public async Task<int> DeleteLevel(Level level)
    {
        // Loads the files so EF deletes their rows along with the level
        await FetchLevelFiles(level);
        db.Levels?.Remove(level);
        return await db.SaveChangesAsync();
    }

    public async Task PurgeLevel(Level level)
    {
        level = await FetchLevelAuthor(await FetchLevelFiles(level));

        // Turns the Discord post into "Unpublished level" before the row disappears
        level.Published = false;
        await discordService.UpdateDiscordForum(level, true);
        await discordService.DeleteVerificationRequest(level);

        var filePaths = (level.LevelFiles ?? []).Select(x => x.Id.GetIdFilePath("zip"))
            .Concat((level.GalleryFiles ?? []).Select(x => x.Id.GetIdFilePath("webp")))
            .ToArray();

        await DeleteLevel(level);
        foreach (var path in filePaths) File.Delete(path);
    }
}
