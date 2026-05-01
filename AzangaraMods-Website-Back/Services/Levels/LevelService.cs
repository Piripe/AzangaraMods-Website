using AzangaraMods_Website_Back.Data;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Services.Tokens;

namespace AzangaraMods_Website_Back.Services.Levels;

public class LevelService(MainDbContext db) : ILevelService
{
    public Task<int> Insert(Level level)
    {
        db.Levels?.Add(level);
        return db.SaveChangesAsync();
    }

    public async Task<int> UploadLevelFile()
    {
        throw new NotImplementedException();
    }
}