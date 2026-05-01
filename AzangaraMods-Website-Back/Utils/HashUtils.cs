using System.Security.Cryptography;
using System.Text;

namespace AzangaraMods_Website_Back.Utils;

public static class HashUtils
{
    public static string HashString(string stringToHash)
    {
        using var sha512 = SHA512.Create();
        var bytes = sha512.ComputeHash(Encoding.UTF8.GetBytes(stringToHash));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}