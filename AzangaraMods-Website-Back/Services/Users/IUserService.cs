using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;

namespace AzangaraMods_Website_Back.Services.Users;

// LevelCount includes drafts
public record UserStats(User User, int LevelCount, int PublishedLevelCount);

public interface IUserService
{
    Task<int> Insert(User user);
    Task<User[]> GetUsers();
    Task<User?> GetUserById(long userId);
    // Admin user list; the query matches the username, the email or the exact ID
    Task<(UserStats[] users, int total)> SearchUsers(string? query, UserSortOrders sort, int offset, int limit);
    Task<UserStats> GetUserStats(User user);
    Task<bool> Login(User user, string password);
    bool CheckPassword(User user, string password);
    Task<User?> GetUserByEmail(string email);
    Task<bool> UsernameTaken(string username, long exceptUserId);
    Task<bool> EmailTaken(string email, long exceptUserId);
    Task<User> FetchLevels(User user);
    Task<int> UpdateUsername(User user, string username);
    Task<int> UpdateEmail(User user, string email);
    Task<int> UpdatePassword(User user, string password);
    Task<int> SetHasProfilePicture(User user, bool hasProfilePicture);
    // Disabling hides the user's levels and Discord posts, enabling shows them again
    Task SetDisabled(User user, bool disabled);
    // Suspending also disables the account, and lifting it enables it again
    Task SetSuspended(User user, bool suspended);
    Task<int> SetFlag(User user, UserFlags flag, bool value);
    // Deletes the user with their levels, files and profile picture
    Task DeleteUser(User user);
}
