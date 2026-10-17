using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;

namespace AzangaraMods_Website_Back.Services.Discord;

// The user as they were when the role changed
public record RoleChangeTarget(long Id, string Username, bool HasProfilePicture);

public interface IDiscordService
{
    public Task UpdateDiscordForum(Level level, bool onlyUpdate = false);
    public Task NotifyVerificationRequest(Level level);
    public Task DeleteVerificationRequest(Level level);
    public Task NotifyReport(Level level, long reportId);
    public Task NotifyRoleChange(RoleChangeTarget user, UserFlags role, bool granted, string changedBy);
}