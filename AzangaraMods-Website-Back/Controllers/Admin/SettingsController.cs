using AutoMapper;
using AzangaraMods_Website_Back.Attributes;
using AzangaraMods_Website_Back.Models.Dto;
using AzangaraMods_Website_Back.Services.SiteSettings;
using Microsoft.AspNetCore.Mvc;

namespace AzangaraMods_Website_Back.Controllers.Admin;

[Route("admin/settings"), Admin]
public class SettingsController(IMapper mapper, ISiteSettingsService siteSettingsService) : Controller
{
    public record PatchSettingsRequestData(bool? reportsRequireAccount);

    [HttpPatch("")]
    public async Task<IActionResult> PatchSettings([FromBody] PatchSettingsRequestData data)
    {
        return Ok(mapper.Map<SiteSettingsDto>(await siteSettingsService.UpdateSettings(data.reportsRequireAccount)));
    }
}
