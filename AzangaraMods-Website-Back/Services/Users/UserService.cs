using AzangaraMods_Website_Back.Data;
using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Services.Discord;
using AzangaraMods_Website_Back.Services.Levels;
using AzangaraMods_Website_Back.Utils;
using Microsoft.EntityFrameworkCore;

namespace AzangaraMods_Website_Back.Services.Users;

public class UserService(MainDbContext db, ILevelService levelService, IDiscordQueue discordQueue) : IUserService
{
    public Task<int> Insert(User user)
    {
        db.Users?.Add(user);
        return db.SaveChangesAsync();
    }

    public Task<User[]> GetUsers()
    {
        return db.Users!.ToArrayAsync();
    }

    public Task<User?> GetUserById(long userId)
    {
        return db.Users!.FirstOrDefaultAsync(x => x.Id == userId);
    }

    public async Task<(UserStats[] users, int total)> SearchUsers(string? query, UserSortOrders sort, int offset, int limit)
    {
        var users = db.Users!.AsQueryable();
        if (!string.IsNullOrWhiteSpace(query))
        {
            var text = query.Trim();
            var pattern = "%" + text.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";
            users = long.TryParse(text, out var id)
                ? users.Where(x => x.Id == id || EF.Functions.ILike(x.Username, pattern, "\\") || EF.Functions.ILike(x.Email, pattern, "\\"))
                : users.Where(x => EF.Functions.ILike(x.Username, pattern, "\\") || EF.Functions.ILike(x.Email, pattern, "\\"));
        }

        var total = await users.CountAsync();

        users = sort switch
        {
            UserSortOrders.Oldest => users.OrderBy(x => x.Creation).ThenBy(x => x.Id),
            UserSortOrders.Username => users.OrderBy(x => x.Username.ToLower()).ThenBy(x => x.Id),
            UserSortOrders.Levels => users.OrderByDescending(x => x.Levels!.Count).ThenByDescending(x => x.Id),
            UserSortOrders.LastLogin => users.OrderByDescending(x => x.LastLogin).ThenByDescending(x => x.Id),
            _ => users.OrderByDescending(x => x.Creation).ThenByDescending(x => x.Id),
        };

        var page = await users
            .Skip(offset)
            .Take(limit)
            .Select(x => new { User = x, LevelCount = x.Levels!.Count, PublishedLevelCount = x.Levels!.Count(l => l.Published) })
            .ToArrayAsync();
        return (page.Select(x => new UserStats(x.User, x.LevelCount, x.PublishedLevelCount)).ToArray(), total);
    }

    public async Task<UserStats> GetUserStats(User user)
    {
        var levels = db.Levels!.Where(x => x.AuthorId == user.Id);
        return new UserStats(user, await levels.CountAsync(), await levels.CountAsync(x => x.Published));
    }

    public async Task<bool> Login(User user, string password)
    {
        if (!CheckPassword(user, password)) return false;

        db.Entry(user).Property(x => x.LastLogin).CurrentValue = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return true;
    }

    public bool CheckPassword(User user, string password)
    {
        return user.Password == HashUtils.HashString(password);
    }

    public Task<bool> UsernameTaken(string username, long exceptUserId)
    {
        return db.Users!.AnyAsync(x => x.Id != exceptUserId && x.Username.ToLower() == username.ToLower());
    }

    public Task<bool> EmailTaken(string email, long exceptUserId)
    {
        return db.Users!.AnyAsync(x => x.Id != exceptUserId && x.Email.ToLower() == email.ToLower());
    }

    public async Task<User> FetchLevels(User user)
    {
        user.Levels = await db.Levels!.Where(x => x.AuthorId == user.Id).Include(x=>x.LevelFiles).Include(x=>x.GalleryFiles).ToArrayAsync();
        return user;
    }

    public Task<User?> GetUserByEmail(string email)
    {
        return db.Users!.FirstOrDefaultAsync(x => x.Email.ToLower() == email.ToLower());
    }

    public async Task<int> UpdateUsername(User user, string username)
    {
        db.Entry(user).Property(x => x.Username).CurrentValue = username;
        var changes = await db.SaveChangesAsync();

        // Discord posts show the creator's name
        foreach (var level in (await FetchLevels(user)).Levels!.Where(x => x.DiscordForumMessage.HasValue))
            discordQueue.QueueForumUpdate(level.Id, true);
        return changes;
    }

    public Task<int> UpdateEmail(User user, string email)
    {
        db.Entry(user).Property(x => x.Email).CurrentValue = email;
        return db.SaveChangesAsync();
    }

    public Task<int> UpdatePassword(User user, string password)
    {
        db.Entry(user).Property(x => x.Password).CurrentValue = HashUtils.HashString(password);
        return db.SaveChangesAsync();
    }

    public Task<int> SetHasProfilePicture(User user, bool hasProfilePicture)
    {
        db.Entry(user).Property(x => x.HasProfilePicture).CurrentValue = hasProfilePicture;
        return db.SaveChangesAsync();
    }

    public Task SetDisabled(User user, bool disabled)
    {
        return SetFlags(user, disabled ? user.Flags | UserFlags.Disabled : user.Flags & ~UserFlags.Disabled);
    }

    public Task SetSuspended(User user, bool suspended)
    {
        const UserFlags flags = UserFlags.Suspended | UserFlags.Disabled;
        return SetFlags(user, suspended ? user.Flags | flags : user.Flags & ~flags);
    }

    public Task<int> SetFlag(User user, UserFlags flag, bool value)
    {
        db.Entry(user).Property(x => x.Flags).CurrentValue = value ? user.Flags | flag : user.Flags & ~flag;
        return db.SaveChangesAsync();
    }

    private async Task SetFlags(User user, UserFlags flags)
    {
        if (flags == user.Flags) return;
        var visibilityChanged = (flags ^ user.Flags).HasFlag(UserFlags.Disabled);
        db.Entry(user).Property(x => x.Flags).CurrentValue = flags;
        await db.SaveChangesAsync();
        if (!visibilityChanged) return;

        foreach (var level in (await FetchLevels(user)).Levels!.Where(x => x.Published))
            discordQueue.QueueForumUpdate(level.Id, true);
    }

    public async Task DeleteUser(User user)
    {
        // Detached from the user first: EF can't remove the deleted levels from the fixed-size array FetchLevels sets
        var levels = (await FetchLevels(user)).Levels!.ToArray();
        user.Levels = null;
        foreach (var level in levels)
        {
            await levelService.PurgeLevel(level);
        }

        if (user.HasProfilePicture) File.Delete(user.Id.GetIdFilePath("avatar.webp"));

        // Tokens are removed by the cascade
        db.Users!.Remove(user);
        await db.SaveChangesAsync();
    }
}
