namespace HowAreMyFinances.Api.Models;

public sealed record Income(
    Guid Id,
    Guid UserId,
    Guid MonthId,
    string Source,
    decimal Amount,
    DateOnly IncomeDate,
    string? Comment,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public sealed record CreateIncomeRequest(
    string Source,
    decimal Amount,
    DateOnly IncomeDate,
    string? Comment
);

public sealed record UpdateIncomeRequest(
    string? Source,
    decimal? Amount,
    DateOnly? IncomeDate,
    string? Comment
);
