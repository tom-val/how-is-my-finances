namespace HowAreMyFinances.Api.Models;

public sealed record Category(
    Guid Id,
    Guid UserId,
    string Name,
    string? Icon,
    int SortOrder,
    DateTime CreatedAt
);
