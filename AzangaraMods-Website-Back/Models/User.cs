using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using AzangaraMods_Website_Back.Enums;
using Microsoft.EntityFrameworkCore;

namespace AzangaraMods_Website_Back.Models;

[Table("users")]
public class User()
{
    [Key, DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public required long Id { get; set; }

    [MaxLength(64), Required] 
    public required string Username { get; set; } = "";
    
    public DateTime Creation { get; set; } = DateTime.UtcNow;
    public DateTime LastLogin { get; set; } = DateTime.UtcNow;

    [MaxLength(256), Required] 
    public required string Email { get; set; }

    public bool HasProfilePicture { get; set; } = false;
    public UserFlags Flags { get; set; } = 0;
    [MaxLength(128), JsonIgnore, Required] public string Password { get; set; } = "";
    
    [InverseProperty("Author"), DeleteBehavior(DeleteBehavior.Cascade), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public virtual ICollection<Level>? Levels { get; set; }
    [InverseProperty("User"), DeleteBehavior(DeleteBehavior.Cascade),JsonIgnore]
    public virtual ICollection<Token>? Tokens { get; set; }
}