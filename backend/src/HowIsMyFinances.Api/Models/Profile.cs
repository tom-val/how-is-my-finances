namespace HowIsMyFinances.Api.Models;

public sealed record Profile(
    Guid Id,
    string? DisplayName,
    string PreferredLanguage,
    string PreferredCurrency,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public sealed record UpdateProfileRequest(
    string? DisplayName,
    string? PreferredLanguage,
    string? PreferredCurrency
);
