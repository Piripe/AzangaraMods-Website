using System.Net.Mail;

namespace AzangaraMods_Website_Back.Utils;

// Account field rules shared by registration and the account settings
public static class UserValidation
{
    public static bool IsValidUsername(string username) =>
        username.Length is >= 3 and <= 32 && !username.Any(char.IsControl);

    public static bool IsValidEmail(string email) =>
        email.Length <= 256 && MailAddress.TryCreate(email, out var address) && address.Address == email;

    public static bool IsValidPassword(string? password) => (password?.Length ?? 0) >= 8;
}
