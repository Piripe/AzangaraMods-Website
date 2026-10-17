using AutoMapper;
using AzangaraMods_Website_Back.Attributes;
using AzangaraMods_Website_Back.Models.Dto;
using AzangaraMods_Website_Back.Services.SiteSettings;
using Microsoft.AspNetCore.Mvc;

namespace AzangaraMods_Website_Back.Controllers;

// Site settings the frontend needs, such as whether reporting requires an account
[Route("[controller]")]
public class SettingsController(IMapper mapper, ISiteSettingsService siteSettingsService) : Controller
{
    [HttpGet(""), Public]
    public async Task<IActionResult> GetSettings()
    {
        return Ok(mapper.Map<SiteSettingsDto>(await siteSettingsService.GetSettings()));
    }
}
