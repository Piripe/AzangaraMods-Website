namespace AzangaraMods_Website_Back.Utils;

public static class FileUtils
{
    public static string GetIdFilePath(this long id, string extension)
    {
        var filePath = $"{id:x}";
        return Path.Combine(Environment.GetEnvironmentVariable("DATA_DIR") ?? "/data", filePath[..2], filePath[2..4], filePath[4..6], filePath[6..] + "." + extension);
    }
}