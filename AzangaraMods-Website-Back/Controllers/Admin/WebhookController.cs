using AzangaraMods_Website_Back.Attributes;
using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Services.Discord;
using AzangaraMods_Website_Back.Services.Levels;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.Metrics;

namespace AzangaraMods_Website_Back.Controllers.Admin;

[Route("admin/webhook")]
public class WebhookController(ILevelService levelService, IDiscordService discordService) : Controller
{
    [HttpGet("reload_messages_task")]
    public async Task<IActionResult> ReloadMessagesTask()
    {
        if (!(HttpContext.Items[0] as User)!.Flags.HasFlag(UserFlags.Admin)) return Unauthorized("You are not an admin");

        var levels = await levelService.GetPublicLevels();
        
        foreach (var level in levels)
        {
            try
            {
                Console.WriteLine($"Reloading webhook messages {levels.IndexOf(level) + 1}/{levels.Length}");

                await discordService.UpdateDiscordForum(await levelService.FetchLevelFiles(level));
            }
            catch (Exception e)
            {
                Console.WriteLine(e.ToString());
            }

            await Task.Delay(100);
            
        }
        
        return Ok("Messages reloaded");
    }
}