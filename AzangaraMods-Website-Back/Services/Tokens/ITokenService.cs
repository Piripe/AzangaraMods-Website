using AzangaraMods_Website_Back.Models;

namespace AzangaraMods_Website_Back.Services.Tokens;

public interface ITokenService
{
    public Task<string> GenerateToken(User user);
    public Task<User?> ValidateToken(string token);
    public Task<int> RemoveToken(string token);
}