namespace AzangaraMods_Website_Back.Utils;

/* ID structure
    0b11111111111111111111111111111111111111111111 11111111111111 111111
      Current time << 3 & ~0xfffffL (44b)          Counter (14b)  Future use (6b)
      
    Theorical max ID generation rate: 1 245 184/s
 */
public static class IdUtils
{
    private static short _counter;
    private static short _generatedIdsCount;
    private static readonly Lock CounterLock = new Lock();

    private const short CounterLimit = 0x4000;
    private const long DateMask = 0xfffffL;
    
    
    public static async Task<long> GenerateId()
    {
        while (_generatedIdsCount > CounterLimit)
        {
            await Task.Delay(1); // Wait until the ID generator is free
        }


        lock (CounterLock)
        {
            _generatedIdsCount++;

            _counter++;
            if (_counter >= CounterLimit) _counter = 0;

            Task.Delay(new TimeSpan((DateMask >> 3))) // Wait for the next "tick"
                .ContinueWith(_ =>
                {
                    lock (CounterLock)
                    {
                        _generatedIdsCount--;
                    }
                });
        return (DateTime.Now.Ticks << 3 & ~DateMask) | ((long)_counter << 6);
        }
    }
}