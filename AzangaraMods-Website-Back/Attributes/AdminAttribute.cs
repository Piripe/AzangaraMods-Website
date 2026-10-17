namespace AzangaraMods_Website_Back.Attributes;

// Restricts an endpoint to users with the Admin flag (checked in AuthMiddleware)
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class AdminAttribute : Attribute { }
