namespace AzangaraMods_Website_Back.Enums;

public enum UserFlags
{
    VerifiedModder = 1,
    Admin = 1 << 1,
    // Set by the user from the settings; hides their levels until they log in again
    Disabled = 1 << 2,
    // Set by an admin along with Disabled; the user can't log in until an admin lifts it
    Suspended = 1 << 3,
}