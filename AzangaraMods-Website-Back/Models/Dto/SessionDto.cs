using System.Text.Json.Serialization;

namespace AzangaraMods_Website_Back.Models.Dto;

public class SessionDto
{
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public required long Id { get; set; }
    public DateTime Created { get; set; }
    public DateTime LastUsed { get; set; }
    public string? UserAgent { get; set; }
    public string? IpAddress { get; set; }
    // True for the token that made the request
    public bool Current { get; set; }
}
