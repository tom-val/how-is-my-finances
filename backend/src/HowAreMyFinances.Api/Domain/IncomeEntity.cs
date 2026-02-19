namespace HowAreMyFinances.Api.Domain;

public sealed class IncomeEntity
{
    public string Source { get; }
    public decimal Amount { get; }
    public DateOnly IncomeDate { get; }
    public string? Comment { get; }

    private IncomeEntity(string source, decimal amount, DateOnly incomeDate, string? comment)
    {
        Source = source;
        Amount = amount;
        IncomeDate = incomeDate;
        Comment = comment;
    }

    public static Result<IncomeEntity> Create(string source, decimal amount,
        DateOnly incomeDate, string? comment)
    {
        if (string.IsNullOrWhiteSpace(source))
            return Result<IncomeEntity>.Failure("Source is required");

        if (amount <= 0)
            return Result<IncomeEntity>.Failure("Amount must be greater than zero");

        return Result<IncomeEntity>.Success(
            new IncomeEntity(source.Trim(), amount, incomeDate, comment));
    }

    public static Result<bool> ValidateUpdate(string? source, decimal? amount)
    {
        if (source is not null && string.IsNullOrWhiteSpace(source))
            return Result<bool>.Failure("Source cannot be empty");

        if (amount.HasValue && amount.Value <= 0)
            return Result<bool>.Failure("Amount must be greater than zero");

        return Result<bool>.Success(true);
    }
}
