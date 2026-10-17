using AzangaraMods_Website_Back.Data;
using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;
using Microsoft.EntityFrameworkCore;

namespace AzangaraMods_Website_Back.Services.Reports;

public class ReportService(MainDbContext db) : IReportService
{
    public Task<int> Insert(Report report)
    {
        db.Reports!.Add(report);
        return db.SaveChangesAsync();
    }

    public Task<Report?> GetReportById(long reportId)
    {
        return db.Reports!.FirstOrDefaultAsync(x => x.Id == reportId);
    }

    public Task<bool> HasOpenReport(long levelFileId, long? reporterId, string ipAddress)
    {
        var reports = db.Reports!.Where(x => x.LevelFileId == levelFileId && x.Status == ReportStatus.Open);
        return reporterId.HasValue
            ? reports.AnyAsync(x => x.ReporterId == reporterId.Value)
            : reports.AnyAsync(x => x.ReporterId == null && x.IpAddress == ipAddress);
    }

    public async Task<(Report[] reports, int total)> SearchReports(ReportStatus? status, int offset, int limit)
    {
        var reports = db.Reports!.AsQueryable();
        if (status.HasValue) reports = reports.Where(x => x.Status == status.Value);

        var total = await reports.CountAsync();
        var page = await reports
            .OrderByDescending(x => x.Created)
            .ThenByDescending(x => x.Id)
            .Skip(offset)
            .Take(limit)
            .Include(x => x.Level).ThenInclude(x => x!.Author)
            .Include(x => x.LevelFile)
            .Include(x => x.Reporter)
            .AsSplitQuery()
            .ToArrayAsync();
        return (page, total);
    }

    public Task<int> CountReports(ReportStatus status)
    {
        return db.Reports!.CountAsync(x => x.Status == status);
    }

    public Task<Report[]> GetUserReports(long userId)
    {
        return db.Reports!.Where(x => x.ReporterId == userId).OrderBy(x => x.Created).ToArrayAsync();
    }

    public Task<int> SetStatus(Report report, ReportStatus status)
    {
        report.Status = status;
        report.StatusChanged = status == ReportStatus.Open ? null : DateTime.UtcNow;
        return db.SaveChangesAsync();
    }

    public Task<int> DeleteReport(Report report)
    {
        db.Reports!.Remove(report);
        return db.SaveChangesAsync();
    }
}
