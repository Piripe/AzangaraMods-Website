using System.Text;
using AzangaraMods_Website_Back.Data;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Utils;
using Microsoft.EntityFrameworkCore;

namespace AzangaraMods_Website_Back.Services.Tokens;

public class TokenService(MainDbContext db) : ITokenService
{
    /* Token string structure (in base64)
        0xffffffffffffffff  ffffffffffffffffffffffffffffffff
          Token ID (8B)     Token Secret (16B)
    */


    private const string MagicChars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

    // LastUsed is only written when it is older than this, so most requests don't hit the DB twice
    private static readonly TimeSpan LastUsedPrecision = TimeSpan.FromMinutes(5);


    public async Task<string> GenerateToken(User user, string? userAgent = null, string? ipAddress = null)
    {
        var token = new Token()
        {
            Id = await IdUtils.GenerateId(),
            UserId = user.Id,
            Secret = new string(
                Enumerable.Repeat(' ', 16)
                    .Select(x => MagicChars[Random.Shared.Next(MagicChars.Length)])
                    .ToArray()
            ),
            UserAgent = userAgent?.Length > 256 ? userAgent[..256] : userAgent,
            IpAddress = ipAddress,
        };

        db.Tokens?.Add(token);
        await db.SaveChangesAsync();

        return Convert.ToBase64String(
        [
            ..BitConverter.GetBytes(token.Id),
            ..Encoding.ASCII.GetBytes(token.Secret)
        ]);
    }

    public async Task<User?> ValidateToken(string token)
    {
        if (!TryParseToken(token, out var tokenId, out var tokenSecret)) return null;

        var tokenEntry = await db.Tokens?
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.Id == tokenId)!;

        if (tokenEntry == null || tokenEntry.Secret != tokenSecret) return null;

        if (DateTime.UtcNow - tokenEntry.LastUsed > LastUsedPrecision)
        {
            tokenEntry.LastUsed = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
        return tokenEntry.User;
    }

    public async Task<int> RemoveToken(string token)
    {
        if (!TryParseToken(token, out var tokenId, out var tokenSecret)) return 0;

        db.Tokens!.Remove(
            db.Tokens!.First(x => x.Id == tokenId && x.Secret == tokenSecret)
        );

        return await db.SaveChangesAsync();
    }

    public long? GetTokenId(string token)
    {
        return TryParseToken(token, out var tokenId, out _) ? tokenId : null;
    }

    public Task<Token[]> GetUserTokens(long userId)
    {
        return db.Tokens!.Where(x => x.UserId == userId).OrderByDescending(x => x.LastUsed).ToArrayAsync();
    }

    public Task<int> RemoveUserToken(long userId, long tokenId)
    {
        return db.Tokens!.Where(x => x.UserId == userId && x.Id == tokenId).ExecuteDeleteAsync();
    }

    public Task<int> RemoveUserTokens(long userId, long? exceptTokenId = null)
    {
        return db.Tokens!.Where(x => x.UserId == userId && x.Id != exceptTokenId).ExecuteDeleteAsync();
    }

    private static bool TryParseToken(string token, out long tokenId, out string tokenSecret)
    {
        tokenId = 0;
        tokenSecret = "";

        Span<byte> tokenContentSpan = new byte[24];
        if (!Convert.TryFromBase64String(token, tokenContentSpan, out int bytesWritten)) return false;

        if (bytesWritten != 24) return false;

        var tokenContent = tokenContentSpan.ToArray();

        tokenId = BitConverter.ToInt64(tokenContent, 0);
        tokenSecret = Encoding.ASCII.GetString(tokenContent, 8, 16);
        return true;
    }
}
