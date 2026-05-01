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


    public async Task<string> GenerateToken(User user)
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
        Span<byte> tokenContentSpan = new byte[24];
        if (!Convert.TryFromBase64String(token, tokenContentSpan, out int bytesWritten)) return null;

        if (bytesWritten != 24) return null;

        var tokenContent = tokenContentSpan.ToArray();

        var tokenId = BitConverter.ToInt64(tokenContent, 0);
        var tokenSecret = Encoding.ASCII.GetString(tokenContent, 8, 16);

        var tokenEntry = await db.Tokens?
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.Id == tokenId)!;

        if (tokenEntry == null) return null;
        return tokenEntry.Secret == tokenSecret ? tokenEntry.User : null;
    }

    public async Task<int> RemoveToken(string token)
    {
        Span<byte> tokenContentSpan = new byte[24];
        if (!Convert.TryFromBase64String(token, tokenContentSpan, out int bytesWritten)) return 0;

        if (bytesWritten != 24) return 0;

        var tokenContent = tokenContentSpan.ToArray();

        var tokenId = BitConverter.ToInt64(tokenContent, 0);
        var tokenSecret = Encoding.ASCII.GetString(tokenContent, 8, 16);


        db.Tokens!.Remove(
            db.Tokens!.First(x => x.Id == tokenId && x.Secret == tokenSecret)
        );

        return await db.SaveChangesAsync();
    }
}