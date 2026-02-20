namespace HowAreMyFinances.Api.Models;

public sealed record UserVendor(Guid Id, string Name, bool IsHidden);

public sealed record ToggleVendorRequest(bool IsHidden);
