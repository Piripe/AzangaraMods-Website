namespace AzangaraMods_Website_Back.Enums;

public enum ReportStatus
{
    Open = 0,
    // An admin handled the report
    Resolved = 10,
    // An admin decided there was nothing to do
    Dismissed = 20,
}
