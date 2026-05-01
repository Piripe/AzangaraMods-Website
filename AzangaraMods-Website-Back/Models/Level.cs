using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace AzangaraMods_Website_Back.Models;

[Table("levels")]
public class Level
{
    [Key]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public required long Id { get; set; }
    [MaxLength(64)]
    public required string Name { get; set; }
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public long AuthorId  { get; set; }
    public DateTime LastEdit { get; set; } = DateTime.UtcNow;
    [MaxLength(8192)]
    public required string Description { get; set; }
    public required short Difficulty { get; set; }
    [MaxLength(8192)]
    public required string[] Tags { get; set; }
    
    [ForeignKey("AuthorId"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public virtual required User Author { get; set; }
    [InverseProperty("Level"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public virtual ICollection<LevelFile>? LevelFiles { get; set; }
    [InverseProperty("Level"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public virtual ICollection<GalleryFile>? GalleryFiles { get; set; }
}