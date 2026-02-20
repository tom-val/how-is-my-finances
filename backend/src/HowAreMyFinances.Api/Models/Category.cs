namespace HowAreMyFinances.Api.Models;

public sealed record Category(
    Guid Id,
    Guid UserId,
    string Name,
    string? Icon,
    int SortOrder,
    bool IsArchived,
    DateTime CreatedAt
);

public sealed record CreateCategoryRequest(string Name);

public sealed record UpdateCategoryRequest(string? Name, bool? IsArchived);
