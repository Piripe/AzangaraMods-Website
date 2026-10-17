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

// Author page header: the stats only count published levels
public class UserProfileDto : UserPublicPartialDto
{
    public int LevelCount { get; set; }
    public int Downloads { get; set; }
}

public class UserPublicDto : UserPublicPartialDto
{
    public virtual ICollection<LevelPartialDto>? Levels { get; set; }
}

public class UserPrivateDto : UserPublicDto
{
    public DateTime LastLogin { get; set; } = DateTime.UtcNow;

    public required string Email { get; set; }
    public bool Admin { get; set; } = false;
    
    public new ICollection<LevelDto>? Levels { get; set; }
}

// Admin panel row: the level counts include drafts
public class AdminUserDto : UserPublicPartialDto
{
    public DateTime LastLogin { get; set; }
    public required string Email { get; set; }
    public bool Admin { get; set; }
    public bool Disabled { get; set; }
    public bool Suspended { get; set; }
    public int LevelCount { get; set; }
    public int PublishedLevelCount { get; set; }
}

public class AdminUserListDto
{
    public required AdminUserDto[] Hits { get; set; }
    public required int TotalHits { get; set; }
    public required int Offset { get; set; }
    public required int Limit { get; set; }
}
