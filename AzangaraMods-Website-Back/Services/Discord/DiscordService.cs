using System.Collections.Concurrent;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
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
    private record EmbedThumbnail(string url);
    private record EmbedField(string name, string value, bool inline = true);
    private record AdminEmbed(
        string title,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? url,
        string description,
        int color,
        EmbedField[] fields,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] EmbedThumbnail? thumbnail,
        string timestamp);
    private record SendAdminWebhookMessageRequest(string username, AdminEmbed[] embeds);

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

            // The angle brackets stop Discord from adding a link preview next to the gallery embeds
            var frontUrl = Environment.GetEnvironmentVariable("FRONT_URL");
            var websiteLine = string.IsNullOrWhiteSpace(frontUrl) ? "" : $"\n**Website:** [View on Azangara Mods](<{frontUrl}/levels/{level.Id}>)";

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
                            [{latestFile?.FileName}.pak]({downloadPath}) [{downloadCount:#,##0} download{(downloadCount==1?"":"s")}]{websiteLine}
                           """;
            
            // A disabled author's levels are hidden like drafts
            if (!level.Published || level.LevelFiles?.Count <= 0 || (level.Author?.Flags.HasFlag(UserFlags.Disabled) ?? false))
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

    // Posts to the admin webhook (DISCORD_ADMIN_WEBHOOK), which is optional
    public async Task NotifyVerificationRequest(Level level)
    {
        try
        {
            var webhook = Environment.GetEnvironmentVariable("DISCORD_ADMIN_WEBHOOK");
            if (string.IsNullOrWhiteSpace(webhook))
            {
                Console.WriteLine($"No admin webhook set, verification requested for level {level.Id}");
                return;
            }

            var frontUrl = Environment.GetEnvironmentVariable("FRONT_URL") ?? "";
            var downloadUrl = Environment.GetEnvironmentVariable("DOWNLOAD_URL") ?? "https://127.0.0.1:8080";
            var reviewUrl = $"{frontUrl}/dashboard/admin?tab=pending";
            // Same thumbnail rule as the level search DTO: the oldest gallery image
            var thumbnail = level.GalleryFiles?.OrderBy(x => x.Id).FirstOrDefault();

            var embed = new AdminEmbed(
                "Verification requested",
                string.IsNullOrWhiteSpace(frontUrl) ? null : reviewUrl,
                $"**{level.Name}**",
                0xF1C40F,
                [
                    new EmbedField("Creator", level.Author?.Username ?? level.AuthorId.ToString()),
                    new EmbedField("Difficulty", _difficulties[level.Difficulty]),
                    new EmbedField("Size", $"{level.RoomAmount} room{(level.RoomAmount == 1 ? "" : "s")}"),
                    new EmbedField("Files", (level.LevelFiles?.Count ?? 0).ToString()),
                    new EmbedField("Review", $"[Open the admin panel]({reviewUrl})", false),
                ],
                thumbnail == null ? null : new EmbedThumbnail($"{downloadUrl}/level/{level.Id}/gallery/{thumbnail.Id}"),
                DateTime.UtcNow.ToString("o"));

            var res = await _httpClient.PostAsync(webhook + "?wait=true", JsonContent.Create(new SendAdminWebhookMessageRequest("Azanbot", [embed])));
            if (!res.IsSuccessStatusCode)
            {
                Console.WriteLine($"Admin webhook error: {(int)res.StatusCode} {await res.Content.ReadAsStringAsync()}");
                return;
            }

            var messageInfos = await res.Content.ReadFromJsonAsync<SendWebhookMessageResponse>();
            if (messageInfos == null) return;

            db.Entry(level).Property(x => x.VerificationDiscordMessage).CurrentValue = long.Parse(messageInfos.id);
            await db.SaveChangesAsync();
        }
        catch (Exception e)
        {
            Console.WriteLine("Admin webhook error: " + e.Message);
        }
    }

    // Removes the message posted by NotifyVerificationRequest
    public async Task DeleteVerificationRequest(Level level)
    {
        try
        {
            if (!level.VerificationDiscordMessage.HasValue) return;

            var webhook = Environment.GetEnvironmentVariable("DISCORD_ADMIN_WEBHOOK");
            if (!string.IsNullOrWhiteSpace(webhook))
            {
                var res = await _httpClient.DeleteAsync($"{webhook}/messages/{level.VerificationDiscordMessage.Value}");
                // 404 means the message is already gone, so the stored ID can be cleared anyway
                if (!res.IsSuccessStatusCode && res.StatusCode != HttpStatusCode.NotFound)
                {
                    Console.WriteLine($"Admin webhook error: {(int)res.StatusCode} {await res.Content.ReadAsStringAsync()}");
                    return;
                }
            }

            db.Entry(level).Property(x => x.VerificationDiscordMessage).CurrentValue = null;
            await db.SaveChangesAsync();
        }
        catch (Exception e)
        {
            Console.WriteLine("Admin webhook error: " + e.Message);
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