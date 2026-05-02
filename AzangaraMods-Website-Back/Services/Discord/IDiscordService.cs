using AzangaraMods_Website_Back.Models;

namespace AzangaraMods_Website_Back.Services.Discord;

public interface IDiscordService
{
    public Task UpdateDiscordForum(Level level);
}