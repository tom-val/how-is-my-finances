namespace HowAreMyFinances.Api.Models;

public sealed record Category(
    Guid Id,
    Guid UserId,
    string Name,
    string? Icon,
    int SortOrder,
    DateTime CreatedAt
);

public sealed record CreateCategoryRequest(string Name);

public sealed record UpdateCategoryRequest(string Name);
