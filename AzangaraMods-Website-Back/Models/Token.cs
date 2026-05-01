using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace AzangaraMods_Website_Back.Models;

[Table("tokens")]
public class Token
{
    [Key]
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public required long Id { get; set; }

    [MaxLength(16)] [Required] public string Secret { get; set; } = "";
    [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString | JsonNumberHandling.WriteAsString)]
    public long UserId { get; set; }
    
    [ForeignKey("UserId")]
    public virtual User? User { get; set; }
}