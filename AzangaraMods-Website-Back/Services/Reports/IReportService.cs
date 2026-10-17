using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Models;

namespace AzangaraMods_Website_Back.Services.Reports;

public interface IReportService
{
    public Task<int> Insert(Report report);
    public Task<Report?> GetReportById(long reportId);
    // Whether this user, or this IP for anonymous reporters, already has an open report on the file
    public Task<bool> HasOpenReport(long levelFileId, long? reporterId, string ipAddress);
    // Newest first, with the level, its author, the file and the reporter loaded
    public Task<(Report[] reports, int total)> SearchReports(ReportStatus? status, int offset, int limit);
    public Task<int> CountReports(ReportStatus status);
    public Task<Report[]> GetUserReports(long userId);
    public Task<int> SetStatus(Report report, ReportStatus status);
    public Task<int> DeleteReport(Report report);
}
