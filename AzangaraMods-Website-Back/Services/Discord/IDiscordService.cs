using AzangaraMods_Website_Back.Models;

namespace AzangaraMods_Website_Back.Services.Discord;

public interface IDiscordService
{
    public Task UpdateDiscordForum(Level level, bool onlyUpdate = false);
    public Task NotifyVerificationRequest(Level level);
    public Task DeleteVerificationRequest(Level level);
}