using AzangaraMods_Website_Back.Enums;

namespace AzangaraMods_Website_Back.Models;

public record ErrorResponseModel(string Error, ErrorCodes ErrorCode, string? AdditionalData = null);