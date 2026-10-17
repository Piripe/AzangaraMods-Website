using AutoMapper;
using AzangaraMods_Website_Back.Attributes;
using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;
using AzangaraMods_Website_Back.Models.Dto;
using AzangaraMods_Website_Back.Services.Reports;
using Microsoft.AspNetCore.Mvc;

namespace AzangaraMods_Website_Back.Controllers.Admin;

[Route("admin/reports"), Admin]
public class ReportsController(IMapper mapper, IReportService reportService) : Controller
{
    [HttpGet("")]
    public async Task<IActionResult> GetReports(
        [FromQuery] ReportStatus? status,
        [FromQuery] int offset = 0,
        [FromQuery] int limit = 20)
    {
        offset = Math.Max(offset, 0);
        limit = Math.Clamp(limit, 1, 100);
        var (reports, total) = await reportService.SearchReports(status, offset, limit);
        return Ok(new ReportListDto
        {
            Hits = mapper.Map<AdminReportDto[]>(reports),
            TotalHits = total,
            Offset = offset,
            Limit = limit
        });
    }

    // Shown on the admin tabs whichever tab is open
    [HttpGet("count")]
    public async Task<IActionResult> GetOpenCount()
    {
        return Ok(await reportService.CountReports(ReportStatus.Open));
    }

    public record SetReportStatusRequestData(ReportStatus status);

    [HttpPost("{reportId}/status")]
    public async Task<IActionResult> SetStatus([FromRoute] long reportId, [FromBody] SetReportStatusRequestData data)
    {
        var report = await reportService.GetReportById(reportId);
        if (report == null) return NotFound(new ErrorResponseModel("Report not found", ErrorCodes.AdminReportNotFound));

        await reportService.SetStatus(report, data.status);
        return Ok(mapper.Map<ReportDto>(report));
    }

    [HttpDelete("{reportId}")]
    public async Task<IActionResult> DeleteReport([FromRoute] long reportId)
    {
        var report = await reportService.GetReportById(reportId);
        if (report == null) return NotFound(new ErrorResponseModel("Report not found", ErrorCodes.AdminReportNotFound));

        await reportService.DeleteReport(report);
        return Ok(mapper.Map<ReportDto>(report));
    }
}
