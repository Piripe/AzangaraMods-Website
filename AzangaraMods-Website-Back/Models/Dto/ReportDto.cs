using System.Text.Json.Serialization;
using AzangaraMods_Website_Back.Enums;

namespace AzangaraMods_Website_Back.Models.Dto;

public class ReportDto
{
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public required long Id { get; set; }
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public long LevelId { get; set; }
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public long LevelFileId { get; set; }
    public ReportCategories Category { get; set; }
    public string? Message { get; set; }
    public DateTime Created { get; set; }
    public ReportStatus Status { get; set; }
}

// Admin panel row: the reported level and file, and who sent the report
public class AdminReportDto : ReportDto
{
    public string? IpAddress { get; set; }
    public DateTime? StatusChanged { get; set; }
    public LevelPartialAuthorDto? Level { get; set; }
    public LevelFilePartialDto? LevelFile { get; set; }
    public UserPublicPartialDto? Reporter { get; set; }
}

public class ReportListDto
{
    public required AdminReportDto[] Hits { get; set; }
    public required int TotalHits { get; set; }
    public required int Offset { get; set; }
    public required int Limit { get; set; }
}

public class SiteSettingsDto
{
    public bool ReportsRequireAccount { get; set; }
}
