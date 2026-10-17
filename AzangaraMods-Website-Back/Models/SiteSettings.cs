using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AzangaraMods_Website_Back.Models;

// Settings changed from the admin panel. The table holds a single row, with Id SingletonId
[Table("site_settings")]
public class SiteSettings
{
    public const int SingletonId = 1;

    [Key, DatabaseGenerated(DatabaseGeneratedOption.None)]
    public int Id { get; set; } = SingletonId;

    // Off by default, so anyone can report; turned on by admins if anonymous reports get spammy
    public bool ReportsRequireAccount { get; set; } = false;
}
