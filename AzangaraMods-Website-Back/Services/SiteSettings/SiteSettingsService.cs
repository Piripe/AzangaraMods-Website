using AzangaraMods_Website_Back.Data;
using Microsoft.EntityFrameworkCore;

namespace AzangaraMods_Website_Back.Services.SiteSettings;

public class SiteSettingsService(MainDbContext db) : ISiteSettingsService
{
    public async Task<Models.SiteSettings> GetSettings()
    {
        // The row is seeded by the migration, this only covers a database where it was removed
        var settings = await db.SiteSettings!.FirstOrDefaultAsync(x => x.Id == Models.SiteSettings.SingletonId);
        if (settings != null) return settings;

        settings = new Models.SiteSettings();
        db.SiteSettings!.Add(settings);
        await db.SaveChangesAsync();
        return settings;
    }

    public async Task<Models.SiteSettings> UpdateSettings(bool? reportsRequireAccount)
    {
        var settings = await GetSettings();
        if (reportsRequireAccount.HasValue) settings.ReportsRequireAccount = reportsRequireAccount.Value;
        await db.SaveChangesAsync();
        return settings;
    }
}
