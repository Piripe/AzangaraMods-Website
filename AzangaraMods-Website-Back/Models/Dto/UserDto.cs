using System.Text.Json.Serialization;

namespace AzangaraMods_Website_Back.Models.Dto;

public class UserPublicPartialDto
{
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public required long Id { get; set; }

    public required string Username { get; set; } = "";
    
    public DateTime Creation { get; set; } = DateTime.UtcNow;

    public bool HasProfilePicture { get; set; } = false;
    public bool VerifiedModder { get; set; } = false;
}

public class UserPublicDto : UserPublicPartialDto
{
    public virtual ICollection<LevelPartialDto>? Levels { get; set; }
}

public class UserPrivateDto : UserPublicDto
{
    public DateTime LastLogin { get; set; } = DateTime.UtcNow;

    public required string Email { get; set; }
}