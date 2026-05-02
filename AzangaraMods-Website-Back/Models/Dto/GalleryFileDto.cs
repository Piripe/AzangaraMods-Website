using System.Text.Json.Serialization;

namespace AzangaraMods_Website_Back.Models.Dto;

public class GalleryFilePartialDto
{
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public required long Id { get; set; }
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public long LevelId  { get; set; }
    public DateTime UploadDate { get; set; } = DateTime.UtcNow;
    public string Description { get; set; } = "";
    public required string FileName { get; set; }
}
public class GalleryFileDto : GalleryFilePartialDto
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public virtual LevelPartialDto? Level { get; set; }
}