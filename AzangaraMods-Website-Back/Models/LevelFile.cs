using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace AzangaraMods_Website_Back.Models;

[Table("level_files")]
public class LevelFile
{
    [Key]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public required long Id { get; set; }
    [Required]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public required long LevelId  { get; set; }
    public DateTime UploadDate { get; set; } = DateTime.UtcNow;
    [MaxLength(128)]
    public string? EntryPoint { get; set; }
    [MaxLength(128)]
    public required string FileName { get; set; }
    public required int FileSize { get; set; }
    
    [ForeignKey("LevelId"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public virtual Level? Level { get; set; }
}