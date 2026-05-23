using System.Text.Json.Serialization;
using AzangaraMods_Website_Back.Enums;

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
    public required LevelDifficulties Difficulty { get; set; }
    public required short RoomAmount { get; set; }
    public bool Published { get; set; } = false;
    
    public required string[] Tags { get; set; }
}

public class LevelPartialAuthorDto : LevelPartialDto
{
    public virtual UserPublicPartialDto? Author { get; set; }
}
public class LevelDto : LevelPartialDto
{
    public virtual ICollection<LevelFilePartialDto>? LevelFiles { get; set; }
    public virtual ICollection<GalleryFilePartialDto>? GalleryFiles { get; set; }
}