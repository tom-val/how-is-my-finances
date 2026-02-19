namespace HowAreMyFinances.Api.Domain;

public sealed class ExpenseEntity
{
    public string ItemName { get; }
    public decimal Amount { get; }
    public Guid CategoryId { get; }
    public string? Vendor { get; }
    public DateOnly ExpenseDate { get; }
    public string? Comment { get; }

    private ExpenseEntity(string itemName, decimal amount, Guid categoryId,
        string? vendor, DateOnly expenseDate, string? comment)
    {
        ItemName = itemName;
        Amount = amount;
        CategoryId = categoryId;
        Vendor = vendor;
        ExpenseDate = expenseDate;
        Comment = comment;
    }

    public static Result<ExpenseEntity> Create(string itemName, decimal amount,
        Guid categoryId, string? vendor, DateOnly expenseDate, string? comment)
    {
        if (string.IsNullOrWhiteSpace(itemName))
            return Result<ExpenseEntity>.Failure("Item name is required");

        if (amount <= 0)
            return Result<ExpenseEntity>.Failure("Amount must be greater than zero");

        return Result<ExpenseEntity>.Success(
            new ExpenseEntity(itemName.Trim(), amount, categoryId, vendor, expenseDate, comment));
    }

    public static Result<bool> ValidateUpdate(string? itemName, decimal? amount)
    {
        if (itemName is not null && string.IsNullOrWhiteSpace(itemName))
            return Result<bool>.Failure("Item name cannot be empty");

        if (amount.HasValue && amount.Value <= 0)
            return Result<bool>.Failure("Amount must be greater than zero");

        return Result<bool>.Success(true);
    }
}
