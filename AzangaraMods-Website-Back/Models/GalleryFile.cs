using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace AzangaraMods_Website_Back.Models;

[Table("gallery_files")]
public class GalleryFile
{
    [Key]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public required long Id { get; set; }
    public long LevelId  { get; set; }
    public DateTime UploadDate { get; set; } = DateTime.UtcNow;
    [MaxLength(256)]
    public required string Description { get; set; }
    [MaxLength(128)]
    public required string FileName { get; set; }
    
    [ForeignKey("LevelId"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault), Required]
    public virtual required Level Level { get; set; }
}