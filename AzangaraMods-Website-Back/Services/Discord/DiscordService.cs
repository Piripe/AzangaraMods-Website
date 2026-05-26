using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;
using AzangaraMods_Website_Back.Data;
using AzangaraMods_Website_Back.Enums;
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

    private readonly Dictionary<LevelDifficulties, string> _difficulties = new()
    {
        {LevelDifficulties.VeryEasy, "Very Easy"},
        {LevelDifficulties.Easy, "Easy"},
        {LevelDifficulties.Normal, "Normal"},
        {LevelDifficulties.Hard, "Hard"},
        {LevelDifficulties.VeryHard, "Very Hard"},
        {LevelDifficulties.Expert, "Expert"},
    };
    
    public async Task UpdateDiscordForum(Level level, bool onlyUpdate = false)
    {
        try
        {
            var latestFile = level.LevelFiles?.OrderByDescending(x=>x.UploadDate).FirstOrDefault();
            var downloadUrl = Environment.GetEnvironmentVariable("DOWNLOAD_URL") ?? "https://127.0.0.1:8080";
            var downloadPath = $"{downloadUrl}/level/{level.Id}/files/{latestFile?.Id}";

            var embeds = level.GalleryFiles
                ?.Select(x => new Embed(new EmbedImage($"{downloadUrl}/level/{x.LevelId}/gallery/{x.Id}"))).ToArray() ?? [];

            var downloadCount = level.LevelFiles?.Sum(x => x.Downloads) ?? 0;
            
            string title = $"{level.Name}";
            string text = $"""
                           **Level Name:** {level.Name}
                           **Creator:** {level.Author?.Username ?? level.AuthorId.ToString()}
                           **Size:** {level.RoomAmount} room{(level.RoomAmount == 1 ? "" : "s")} ({GetLevelSizeText(level.RoomAmount)})
                           **Difficulty:** {_difficulties[level.Difficulty]}
                           **Level Description:**  {level.Description}

                           **How to run:**
                           1. Put `{latestFile?.FileName}.pak` in your game folder (next to `game.exe`)
                           2. If started, restart the game.
                           3. Enter this command in the game's console:
                           ```
                           {(string.IsNullOrWhiteSpace(latestFile?.EntryPoint) ? "No entry point specified." : latestFile.EntryPoint.EndsWith(".exec") ? "exec " + latestFile.EntryPoint : "level " + latestFile.EntryPoint)}
                           ```
                           **Download:**
                            [{latestFile?.FileName}.pak]({downloadPath}) [{downloadCount:#,##0} download{(downloadCount==1?"":"s")}]
                           """;
            
            if (!level.Published || level.LevelFiles?.Count <= 0)
            {
                if (level.DiscordForumMessage == null || level.DiscordForumThread == null) return;

                embeds = [];
                text = "Unpublished level";
            }
            
            if (level.DiscordForumMessage.HasValue)
            {
                var res = await _httpClient.PatchAsync(GetDiscordRequestUri( $"/messages/{level.DiscordForumMessage.Value}?thread_id={level.DiscordForumThread!.Value}"), JsonContent.Create(new EditWebhookMessageRequest(text, embeds)));
            }
            else if (!onlyUpdate)
            {
                var res = await _httpClient.PostAsync(GetDiscordRequestUri( $"?wait=true" + (level.DiscordForumThread.HasValue ? $"&thread_id={level.DiscordForumThread.Value}" : "")), JsonContent.Create(new SendWebhookMessageRequest("Azanbot", text, level.DiscordForumThread.HasValue?null:title, embeds)));

                var messageInfos = await res.Content.ReadFromJsonAsync<SendWebhookMessageResponse>();
                if (messageInfos == null) return;
                
                db.Entry(level).Property(x => x.DiscordForumMessage).CurrentValue = long.Parse(messageInfos.id);
                db.Entry(level).Property(x => x.DiscordForumThread).CurrentValue = long.Parse(messageInfos.channel_id);
                await db.SaveChangesAsync();
            }
            else
            {
                Console.WriteLine("Updating Discord forum...\n"+text);
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

    private string GetLevelSizeText(int levelSize)
    {
        return levelSize switch
        {
            < 8 => "Very Small",
            < 16 => "Small",
            < 24 => "Medium",
            < 32 => "Large",
            _ => "Very Large"
        };
    }

    private static ConcurrentDictionary<long, CancellationTokenSource> _cancellations = [];
    public async Task PushWebhookUpdateTask(Level level)
    {
        if (_cancellations.TryRemove(level.Id, out var tokenSource))
        {
            await tokenSource.CancelAsync();
        }

        var cts = new CancellationTokenSource();
        _cancellations.TryAdd(level.Id, cts);
        
        await Task.Delay(60000, cts.Token).ContinueWith((_) =>{});
        
        if (cts.IsCancellationRequested) return;
        
        _cancellations.TryRemove(level.Id, out var _);
        await UpdateDiscordForum(level, true);
    }
}