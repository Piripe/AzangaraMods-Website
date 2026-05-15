using System.Text;
using System.Text.Json;
using AzangaraMods_Website_Back.Data;
using AzangaraMods_Website_Back.Models;

namespace AzangaraMods_Website_Back.Services.Discord;

public class DiscordService(MainDbContext db, IHttpClientFactory httpClientFactory) : IDiscordService
{
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient();

    private record EmbedImage(string url, int width = 1920, int height = 1080);
    private record Embed(EmbedImage image);
    private record SendWebhookMessageRequest(string username, string content, string? thread_name, Embed[] embeds);
    private record EditWebhookMessageRequest(string content, Embed[] embeds);
    private record SendWebhookMessageResponse(string id, string channel_id);

    private readonly string[] _discordEmotes =
        (Environment.GetEnvironmentVariable("DISCORD_EMOTES") ??
         @"<:star1:1502028362464628867>\<:star2:1502028387206696991>\<:star3:1502028404034113696>\<:star4:1502028423131037766>")
        .Split('\\');
    
    public async Task UpdateDiscordForum(Level level)
    {
        try
        {
            if (!level.Published || level.LevelFiles?.Count <= 0)
            {
                if (level is { DiscordForumMessage: not null, DiscordForumThread: not null })
                {
                    await _httpClient.DeleteAsync(GetDiscordRequestUri($"/messages/{level.DiscordForumMessage.Value}?thread_id={level.DiscordForumThread.Value}"));
                    db.Entry(level).Property(x => x.DiscordForumMessage).CurrentValue = null;
                    await db.SaveChangesAsync();
                }
                return;
            }
            
            var latestFile = level.LevelFiles?.OrderByDescending(x=>x.UploadDate).FirstOrDefault();
            var downloadUrl = Environment.GetEnvironmentVariable("DOWNLOAD_URL") ?? "https://127.0.0.1:8080";
            var downloadPath = $"{downloadUrl}/level/{level.Id}/files/{latestFile?.Id}";

            var embeds = level.GalleryFiles
                ?.Select(x => new Embed(new ($"{downloadUrl}/level/{x.LevelId}/gallery/{x.Id}"))).ToArray() ?? [];
            
            string title = $"{level.Name}";
            string text = $"# {level.Name}\n{GetStarLine(level.Difficulty)}\n\n{level.Description}\n\n## How to run:\nEnter this command in the game's console:\n```\n{(string.IsNullOrWhiteSpace(latestFile?.EntryPoint) ? "No entry point specified." : latestFile.EntryPoint.EndsWith(".exec") ? "exec " + latestFile.EntryPoint : "level " + latestFile.EntryPoint)}\n```\n\n## Downloads:\n [{latestFile?.FileName}.pak]({downloadPath}) // [{latestFile?.FileName}.zip]({downloadPath}?ext=zip)";
            
            if (level.DiscordForumMessage.HasValue)
            {
                var res = await _httpClient.PatchAsync(GetDiscordRequestUri( $"/messages/{level.DiscordForumMessage.Value}?thread_id={level.DiscordForumThread!.Value}"), JsonContent.Create(new EditWebhookMessageRequest(text, embeds)));
            }
            else
            {
                var res = await _httpClient.PostAsync(GetDiscordRequestUri( $"?wait=true" + (level.DiscordForumThread.HasValue ? $"&thread_id={level.DiscordForumThread.Value}" : "")), JsonContent.Create(new SendWebhookMessageRequest(level.Author?.Username ?? level.AuthorId.ToString(), text, level.DiscordForumThread.HasValue?null:title, embeds)));

                var messageInfos = await res.Content.ReadFromJsonAsync<SendWebhookMessageResponse>();
                if (messageInfos == null) return;
                
                db.Entry(level).Property(x => x.DiscordForumMessage).CurrentValue = long.Parse(messageInfos.id);
                db.Entry(level).Property(x => x.DiscordForumThread).CurrentValue = long.Parse(messageInfos.channel_id);
                await db.SaveChangesAsync();
            }
        }
        catch (Exception e)
        {
            Console.WriteLine("Discord service error: " + e.Message);
        }
    }

    private Uri GetDiscordRequestUri(string path)
    {
        return new Uri((Environment.GetEnvironmentVariable("DISCORD_WEBHOOK") ?? throw new Exception("Can't find webhook URL")) + path);
    }

    private string GetStarLine(float value)
    {
        var res = new StringBuilder();
        for (int i = 0; i < 10; i++)
        {
            var val = 3-(int)Math.Round((i < value-1 ? 0.999f : i < value ? (value-0.001)%1 : 0)*3);
            res.Append(_discordEmotes[val]);
        }
        return res.ToString();
    }
}