using AzangaraMods_Website_Back.Models;

namespace AzangaraMods_Website_Back.Services.Users;

public interface IUserService
{
    Task<int> Insert(User user);
    Task<User[]> GetUsers();
    Task<bool> Login(User user, string password);
    Task<User?> GetUserByEmail(string email);
    Task<bool> CheckUserExists(string? email, string? username);
}