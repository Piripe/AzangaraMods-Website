using AzangaraMods_Website_Back.Models;

namespace AzangaraMods_Website_Back.Services.Tokens;

public interface ITokenService
{
    public Task<string> GenerateToken(User user, string? userAgent = null, string? ipAddress = null);
    public Task<User?> ValidateToken(string token);
    public Task<int> RemoveToken(string token);
    public long? GetTokenId(string token);
    public Task<Token[]> GetUserTokens(long userId);
    public Task<int> RemoveUserToken(long userId, long tokenId);
    // Removes every token of the user except exceptTokenId (null removes them all)
    public Task<int> RemoveUserTokens(long userId, long? exceptTokenId = null);
}
