using System.Text.Json.Serialization;
using AzangaraMods_Website_Back.Enums;
using AzangaraMods_Website_Back.Utils;

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
    public LevelVerificationStatus Verification { get; set; }
    public DateTime? VerificationRequested { get; set; }
    public string? VerificationNote { get; set; }
    
    public required string[] Tags { get; set; }

    public DateTime Created => IdUtils.GetIdDate(Id);
}

public class LevelPartialAuthorDto : LevelPartialDto
{
    public virtual UserPublicPartialDto? Author { get; set; }
}
public class LevelDto : LevelPartialAuthorDto
{
    public virtual ICollection<LevelFilePartialDto>? LevelFiles { get; set; }
    public virtual ICollection<GalleryFilePartialDto>? GalleryFiles { get; set; }

    public int Downloads => LevelFiles?.Sum(x => x.Downloads) ?? 0;
}