using System.Text.Json.Serialization;

namespace AzangaraMods_Website_Back.Models.Dto;

public class LevelPartialDto
{
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public required long Id { get; set; }
    public required string Name { get; set; }
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public long AuthorId  { get; set; }
    public DateTime LastEdit { get; set; } = DateTime.UtcNow;
    public required string Description { get; set; }
    [JsonIgnore]
    public short RealDifficulty { get; set; }
    public required float Difficulty
    {
        get => Math.Max(0, (float)RealDifficulty) / short.MaxValue * 10f;
        set => RealDifficulty = (short)(Math.Clamp(value / 10f, 0, 1) * short.MaxValue);
    }
    
    public required string[] Tags { get; set; }
    
    public virtual UserPublicPartialDto? Author { get; set; }
}
public class LevelDto : LevelPartialDto
{
    public virtual ICollection<LevelFile>? LevelFiles { get; set; }
    public virtual ICollection<GalleryFile>? GalleryFiles { get; set; }
}