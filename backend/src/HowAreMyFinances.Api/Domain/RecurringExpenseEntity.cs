namespace HowAreMyFinances.Api.Domain;

public sealed class RecurringExpenseEntity
{
    public string ItemName { get; }
    public decimal Amount { get; }
    public Guid CategoryId { get; }
    public int DayOfMonth { get; }

    private RecurringExpenseEntity(string itemName, decimal amount, Guid categoryId, int dayOfMonth)
    {
        ItemName = itemName;
        Amount = amount;
        CategoryId = categoryId;
        DayOfMonth = dayOfMonth;
    }

    public static Result<RecurringExpenseEntity> Create(
        string itemName, decimal amount, Guid categoryId,
        string? vendor, string? comment, int dayOfMonth)
    {
        if (string.IsNullOrWhiteSpace(itemName))
            return Result<RecurringExpenseEntity>.Failure("Item name is required");

        if (amount <= 0)
            return Result<RecurringExpenseEntity>.Failure("Amount must be greater than zero");

        if (dayOfMonth < 1 || dayOfMonth > 28)
            return Result<RecurringExpenseEntity>.Failure("Day of month must be between 1 and 28");

        return Result<RecurringExpenseEntity>.Success(
            new RecurringExpenseEntity(itemName.Trim(), amount, categoryId, dayOfMonth));
    }

    public static Result<bool> ValidateUpdate(string? itemName, decimal? amount, int? dayOfMonth)
    {
        if (itemName is not null && string.IsNullOrWhiteSpace(itemName))
            return Result<bool>.Failure("Item name is required");

        if (amount.HasValue && amount.Value <= 0)
            return Result<bool>.Failure("Amount must be greater than zero");

        if (dayOfMonth.HasValue && (dayOfMonth.Value < 1 || dayOfMonth.Value > 28))
            return Result<bool>.Failure("Day of month must be between 1 and 28");

        return Result<bool>.Success(true);
    }
}
