using AzangaraMods_Website_Back.Attributes;
using AzangaraMods_Website_Back.Services.Discord;
using AzangaraMods_Website_Back.Services.Levels;
using Microsoft.AspNetCore.Mvc;

namespace AzangaraMods_Website_Back.Controllers.Admin;

[Route("admin/webhook"), Admin]
public class WebhookController(ILevelService levelService, IDiscordService discordService) : Controller
{
    [HttpPost("reload_messages")]
    public async Task<IActionResult> ReloadMessages()
    {
        var levels = await levelService.GetPublicLevels();
        var errors = new List<string>();
        
        foreach (var level in levels)
        {
            try
            {
                Console.WriteLine($"Reloading webhook messages {Array.IndexOf(levels, level) + 1}/{levels.Length}");

                await discordService.UpdateDiscordForum(await levelService.FetchLevelAuthor(await levelService.FetchLevelFiles(level)));
            }
            catch (Exception e)
            {
                Console.WriteLine(e.ToString());
                errors.Add($"{level.Name}: {e.Message}");
            }

            await Task.Delay(100);
            
        }
        
        return Ok(new LevelsController.AdminTaskResponseData(levels.Length - errors.Count, errors.Count, errors.ToArray()));
    }
}
