using AzangaraMods_Website_Back.Attributes;
using AzangaraMods_Website_Back.Services.Discord;
using AzangaraMods_Website_Back.Services.Levels;
using Microsoft.AspNetCore.Mvc;

namespace AzangaraMods_Website_Back.Controllers.Admin;

[Route("admin/webhook"), Admin]
public class WebhookController(ILevelService levelService, IDiscordQueue discordQueue) : Controller
{
    [HttpPost("reload_messages")]
    public async Task<IActionResult> ReloadMessages()
    {
        var levels = await levelService.GetPublicLevels();
        foreach (var level in levels) discordQueue.QueueForumUpdate(level.Id);

        // The messages are updated in the background, so this counts the queued levels
        return Ok(new LevelsController.AdminTaskResponseData(levels.Length, 0, []));
    }
}
