using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using AzangaraMods_Website_Back.Enums;
using Microsoft.EntityFrameworkCore;

namespace AzangaraMods_Website_Back.Models;

// A user report on a level file, reviewed from the admin panel
[Table("reports")]
public class Report
{
    [Key]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public required long Id { get; set; }
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public required long LevelId { get; set; }
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public required long LevelFileId { get; set; }
    // Null for anonymous reports, and once the reporter deletes their account
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public long? ReporterId { get; set; }
    // Kept to spot spam from anonymous reporters
    [MaxLength(64)]
    public string? IpAddress { get; set; }

    public required ReportCategories Category { get; set; }
    [MaxLength(1024)]
    public string? Message { get; set; }
    public DateTime Created { get; set; } = DateTime.UtcNow;
    public ReportStatus Status { get; set; } = ReportStatus.Open;
    public DateTime? StatusChanged { get; set; }

    [ForeignKey("LevelId"), DeleteBehavior(DeleteBehavior.Cascade), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public virtual Level? Level { get; set; }
    [ForeignKey("LevelFileId"), DeleteBehavior(DeleteBehavior.Cascade), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public virtual LevelFile? LevelFile { get; set; }
    [ForeignKey("ReporterId"), DeleteBehavior(DeleteBehavior.SetNull), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public virtual User? Reporter { get; set; }
}
