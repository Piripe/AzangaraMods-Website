using System.Collections.Concurrent;
using System.Threading.Channels;
using AzangaraMods_Website_Back.Data;
using AzangaraMods_Website_Back.Models;
using Microsoft.EntityFrameworkCore;

namespace AzangaraMods_Website_Back.Services.Discord;

// Jobs run one at a time, in order, each in its own scope: the request's DbContext is gone by then,
// and running them sequentially stops two updates of the same level from posting two messages
public class DiscordQueue(IServiceScopeFactory scopeFactory) : BackgroundService, IDiscordQueue
{
    private static readonly TimeSpan DebounceDelay = TimeSpan.FromMinutes(1);

    // Snapshot is used instead of loading the level from the DB, for levels that are being deleted
    private record Job(long LevelId, Func<IDiscordService, Level, Task> Run, Level? Snapshot = null);

    private readonly Channel<Job> _jobs = Channel.CreateUnbounded<Job>(new UnboundedChannelOptions { SingleReader = true });
    private readonly ConcurrentDictionary<long, CancellationTokenSource> _debounces = [];

    public void QueueForumUpdate(long levelId, bool onlyUpdate = false)
    {
        // This update already carries the latest download count
        if (_debounces.TryRemove(levelId, out var pending)) pending.Cancel();
        Enqueue(new Job(levelId, (discord, level) => discord.UpdateDiscordForum(level, onlyUpdate)));
    }

    public void QueueDebouncedForumUpdate(long levelId)
    {
        var cts = new CancellationTokenSource();
        _debounces.AddOrUpdate(levelId, cts, (_, old) =>
        {
            old.Cancel();
            return cts;
        });

        _ = Task.Delay(DebounceDelay, cts.Token).ContinueWith(_ =>
        {
            // Only removed if no newer call replaced it in the meantime
            if (_debounces.TryRemove(new KeyValuePair<long, CancellationTokenSource>(levelId, cts)))
                Enqueue(new Job(levelId, (discord, level) => discord.UpdateDiscordForum(level, true)));
        }, TaskContinuationOptions.OnlyOnRanToCompletion);
    }

    public void QueueVerificationRequest(long levelId)
    {
        Enqueue(new Job(levelId, (discord, level) => discord.NotifyVerificationRequest(level)));
    }

    public void QueueDeleteVerificationRequest(long levelId)
    {
        Enqueue(new Job(levelId, (discord, level) => discord.DeleteVerificationRequest(level)));
    }

    public void QueueLevelRemoval(Level level)
    {
        if (_debounces.TryRemove(level.Id, out var pending)) pending.Cancel();

        // Detached copy: the row will be gone when the job runs, so nothing is saved back
        var snapshot = new Level
        {
            Id = level.Id,
            Name = level.Name,
            AuthorId = level.AuthorId,
            Description = level.Description,
            Difficulty = level.Difficulty,
            RoomAmount = level.RoomAmount,
            Tags = level.Tags,
            Published = false,
            VerificationDiscordMessage = level.VerificationDiscordMessage,
            DiscordForumMessage = level.DiscordForumMessage,
            DiscordForumThread = level.DiscordForumThread,
        };
        Enqueue(new Job(level.Id, async (discord, l) =>
        {
            await discord.UpdateDiscordForum(l, true);
            await discord.DeleteVerificationRequest(l);
        }, snapshot));
    }

    private void Enqueue(Job job)
    {
        _jobs.Writer.TryWrite(job);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var job in _jobs.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<MainDbContext>();
                var discord = scope.ServiceProvider.GetRequiredService<IDiscordService>();

                // Loaded when the job runs, so the post shows the level as it is now
                var level = job.Snapshot ?? await db.Levels!
                    .Include(x => x.LevelFiles)
                    .Include(x => x.GalleryFiles)
                    .Include(x => x.Author)
                    .AsSplitQuery()
                    .FirstOrDefaultAsync(x => x.Id == job.LevelId, stoppingToken);
                if (level == null) continue;

                await job.Run(discord, level);
            }
            catch (Exception e)
            {
                Console.WriteLine($"Discord queue error for level {job.LevelId}: {e}");
            }

            // Keeps bulk reloads under Discord's webhook rate limit
            await Task.Delay(100, stoppingToken);
        }
    }
}
