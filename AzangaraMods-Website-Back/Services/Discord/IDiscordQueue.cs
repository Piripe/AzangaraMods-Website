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
    // For a level about to be deleted: marks its post as unpublished and removes its verification request
    public void QueueLevelRemoval(Level level);
}
