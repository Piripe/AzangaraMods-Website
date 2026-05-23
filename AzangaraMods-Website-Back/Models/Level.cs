using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using AzangaraMods_Website_Back.Enums;
using Microsoft.EntityFrameworkCore;

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
    [Required]
    public LevelDifficulties Difficulty { get; set; }
    
    [Required]
    public short RoomAmount { get; set; }
    
    [MaxLength(32)]
    [Column(TypeName = "varchar(32)[]")]
    public required string[] Tags { get; set; }

    public bool Published { get; set; } = false;
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public long? DiscordForumMessage { get; set; } = null;
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public long? DiscordForumThread { get; set; } = null;
    
    [ForeignKey("AuthorId"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public virtual User? Author { get; set; }
    [InverseProperty("Level"), DeleteBehavior(DeleteBehavior.Cascade), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public virtual ICollection<LevelFile>? LevelFiles { get; set; }
    [InverseProperty("Level"), DeleteBehavior(DeleteBehavior.Cascade), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public virtual ICollection<GalleryFile>? GalleryFiles { get; set; }
}