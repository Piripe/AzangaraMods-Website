using AzangaraMods_Website_Back.Data;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Utils;
using Microsoft.EntityFrameworkCore;

namespace AzangaraMods_Website_Back.Services.Users;

public class UserService(MainDbContext db) : IUserService
{
    public Task<int> Insert(User user)
    {
        db.Users?.Add(user);
        return db.SaveChangesAsync();
    }

    public Task<User[]> GetUsers()
    {
        return db.Users!.ToArrayAsync();
    }

    public async Task<bool> Login(User user, string password)
    {
        if (user.Password != HashUtils.HashString(password)) return false;
        
        db.Entry(user).Property(x => x.LastLogin).CurrentValue = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return true;
    }

    public Task<bool> CheckUserExists(string? email, string? username)
    {
        return db.Users!.AnyAsync(x => x.Email == email || x.Username == username);
    }
    public Task<User?> GetUserByEmail(string email)
    {
        return db.Users!.FirstOrDefaultAsync(x => x.Email == email);
    }
}