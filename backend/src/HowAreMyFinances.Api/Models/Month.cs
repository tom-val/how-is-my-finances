namespace HowAreMyFinances.Api.Models;

public sealed record Month(
    Guid Id,
    Guid UserId,
    int Year,
    int MonthNumber,
    decimal Salary,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public sealed record MonthDetail(
    Guid Id,
    Guid UserId,
    int Year,
    int MonthNumber,
    decimal Salary,
    string? Notes,
    decimal TotalSpent,
    decimal PlannedSpent,
    decimal TotalIncome,
    decimal Remaining,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public sealed record CreateMonthRequest(int Year, int Month, decimal Salary);

public sealed record UpdateMonthRequest(decimal? Salary, string? Notes);
