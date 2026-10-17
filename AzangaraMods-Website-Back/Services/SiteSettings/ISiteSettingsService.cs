namespace AzangaraMods_Website_Back.Services.SiteSettings;

public interface ISiteSettingsService
{
    public Task<Models.SiteSettings> GetSettings();
    // Null values are left unchanged
    public Task<Models.SiteSettings> UpdateSettings(bool? reportsRequireAccount);
}
