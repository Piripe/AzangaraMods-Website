using System.Text.Json;
using AzangaraMods_Website_Back.Data;
using AzangaraMods_Website_Back.Models;

namespace AzangaraMods_Website_Back.Services.Discord;

public class DiscordService(MainDbContext db, IHttpClientFactory httpClientFactory) : IDiscordService
{
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient();

    private record EmbedImage(string url, int width = 1920, int height = 1080);
    private record Embed(EmbedImage image);
    private record SendWebhookMessageRequest(string username, string content, string thread_name, Embed[] embeds);
    private record EditWebhookMessageRequest(string content, Embed[] embeds);
    private record SendWebhookMessageResponse(string id, string channel_id);
    
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
            string text = $"{level.Name} made by {level.Author?.Username}\n\n{level.Description}\n\nDownload: [{latestFile?.FileName}.pak]({downloadPath}) // [{latestFile?.FileName}.zip]({downloadPath}?ext=zip)";
            
            if (level is { DiscordForumMessage: not null, DiscordForumThread: not null })
            {
                var res = await _httpClient.PatchAsync(GetDiscordRequestUri( $"/messages/{level.DiscordForumMessage.Value}?thread_id={level.DiscordForumThread.Value}"), JsonContent.Create(new EditWebhookMessageRequest(text, embeds)));
                Console.WriteLine(JsonSerializer.Serialize(new EditWebhookMessageRequest(text, embeds)));
                Console.WriteLine(await res.Content.ReadAsStringAsync());
            }
            else
            {
                var res = await _httpClient.PostAsync(GetDiscordRequestUri( $"?wait=true"), JsonContent.Create(new SendWebhookMessageRequest(level.Author?.Username ?? level.AuthorId.ToString(), text, title, embeds)));

                Console.WriteLine(await res.Content.ReadAsStringAsync());

                var messageInfos = await res.Content.ReadFromJsonAsync<SendWebhookMessageResponse>();
                if (messageInfos == null) return;
                
                db.Entry(level).Property(x => x.DiscordForumMessage).CurrentValue = long.Parse(messageInfos.id);
                db.Entry(level).Property(x => x.DiscordForumThread).CurrentValue = long.Parse(messageInfos.channel_id);
                await db.SaveChangesAsync();
            }
        }
        catch (Exception e)
        {
            // ignored
        }
    }

    private Uri GetDiscordRequestUri(string path)
    {
        return new Uri((Environment.GetEnvironmentVariable("DISCORD_WEBHOOK") ?? throw new Exception("Can't find webhook URL")) + path);
    }
}