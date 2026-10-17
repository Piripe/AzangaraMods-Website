using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;

namespace AzangaraMods_Website_Back.Services.Discord;

// Runs the IDiscordService calls in the background so requests don't wait for the webhook
public interface IDiscordQueue
{
    public void QueueForumUpdate(long levelId, bool onlyUpdate = false);
    // Waits for a minute without any other call before updating, used for download counts
    public void QueueDebouncedForumUpdate(long levelId);
    public void QueueVerificationRequest(long levelId);
    public void QueueDeleteVerificationRequest(long levelId);
    public void QueueReportNotification(long levelId, long reportId);
    // Tells the admin webhook that an admin gave or took the Admin or VerifiedModder flag
    public void QueueRoleChangeNotification(User user, UserFlags role, bool granted, User changedBy);
    // For a level about to be deleted: marks its post as unpublished and removes its verification request
    public void QueueLevelRemoval(Level level);
}
