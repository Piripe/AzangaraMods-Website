namespace AzangaraMods_Website_Back.Enums;

// Authors without UserFlags.VerifiedModder need a Verified level before they can publish it
public enum LevelVerificationStatus
{
    None = 0,
    Pending = 10,
    Verified = 20,
    Rejected = 30,
}
