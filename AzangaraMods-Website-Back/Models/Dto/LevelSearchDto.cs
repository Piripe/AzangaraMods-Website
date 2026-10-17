using System.Text.Json.Serialization;

namespace AzangaraMods_Website_Back.Models.Dto;

public class LevelSearchHitDto : LevelPartialAuthorDto
{
    public int Downloads { get; set; }
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public long? ThumbnailId { get; set; }
}

public class AdminLevelHitDto : LevelSearchHitDto
{
    public int FileCount { get; set; }
    public bool HasDiscordMessage { get; set; }
}

public class LevelSearchResultDto<T> where T : LevelSearchHitDto
{
    public required T[] Hits { get; set; }
    public required int TotalHits { get; set; }
    public required int Offset { get; set; }
    public required int Limit { get; set; }
}

public record TagCountDto(string Tag, int Count);
