using System.Collections.Concurrent;

namespace AzangaraMods_Website_Back.Utils;

public class RateLimiter(int howMany, TimeSpan inTime)
{
    private static readonly string[] Whitelist = [];//["192.168.1.1", "192.168.1.254"];

    private static readonly ConcurrentDictionary<string, ConcurrentQueue<DateTime>> RateLimits = new();
    
    private readonly long _inTimeTicks = inTime.Ticks;
    
    public bool IsLimited(string identifier)
    {
        if (Whitelist.Contains(identifier)) return false;
        if (!RateLimits.TryGetValue(identifier, out var lastRates))
        {
            lastRates = [];
            RateLimits.GetOrAdd(identifier, lastRates);
        }
        
        lastRates.Enqueue(DateTime.UtcNow);
        if (lastRates.Count <= howMany) return false;
        var lastTicks = long.MaxValue;

        while (lastTicks > _inTimeTicks)
        {
            lastRates.TryPeek(out var rateTime);
            lastTicks = (DateTime.UtcNow - rateTime).Ticks;
            if (lastTicks > _inTimeTicks) lastRates.TryDequeue(out _);
        }
            
        return lastRates.Count > howMany;
    }
}