using AzangaraMods_Website_Back.Data;
using AzangaraMods_Website_Back.Models;

namespace AzangaraMods_Website_Back.Services.Discord;

public class DiscordService(MainDbContext db, IHttpClientFactory httpClientFactory) : IDiscordService
{
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient();

    private record SendWebhookMessageRequest(string username, string content, string thread_name);
    private record EditWebhookMessageRequest(string content, string thread_name);
    private record SendWebhookMessageResponse(string id, string channel_id);
    
    public async Task UpdateDiscordForum(Level level)
    {
        try
        {
            if (!level.Published)
            {
                if (level is { DiscordForumMessage: not null, DiscordForumThread: not null })
                {
                    await _httpClient.DeleteAsync(GetDiscordRequestUri($"/messages/{level.DiscordForumMessage.Value}?thread_id={level.DiscordForumThread.Value}"));
                    db.Entry(level).Property(x => x.DiscordForumMessage).CurrentValue = null;
                    await db.SaveChangesAsync();
                }
                return;
            }

            string title = $"{level.Name}";
            string text = $"{level.Name} made by {level.Author?.Username}\n\n{level.Description}";
            
            if (level is { DiscordForumMessage: not null, DiscordForumThread: not null })
            {
                var res = await _httpClient.PatchAsync(GetDiscordRequestUri( $"/messages/{level.DiscordForumMessage.Value}?thread_id={level.DiscordForumThread.Value}"), JsonContent.Create(new EditWebhookMessageRequest(text, title)));
            }
            else
            {
                var res = await _httpClient.PostAsync(GetDiscordRequestUri( $"?wait=true"), JsonContent.Create(new SendWebhookMessageRequest(level.Author?.Username ?? level.AuthorId.ToString(), text, title)));

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