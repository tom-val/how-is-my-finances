namespace HowAreMyFinances.Api.Domain;

/// <summary>An existing expense that a bank transaction might duplicate.</summary>
public sealed record DuplicateCandidate(
    Guid ExpenseId,
    string ItemName,
    decimal Amount,
    string? Vendor,
    DateOnly ExpenseDate,
    bool IsRecurringInstance
);

/// <summary>
/// Flags a bank debit as a possible duplicate of an expense with the same amount, an expense date
/// within ±3 days and a similar vendor (or one generated from a recurring template).
/// </summary>
public static class DuplicateDetector
{
    public const int DayWindow = 3;

    public static Guid? FindDuplicate(
        decimal amount,
        DateOnly bookingDate,
        string? counterpartyKey,
        IEnumerable<DuplicateCandidate> candidates,
        ISet<Guid>? alreadyClaimed = null)
    {
        return candidates
            .Where(c => c.Amount == amount)
            .Where(c => Math.Abs(c.ExpenseDate.DayNumber - bookingDate.DayNumber) <= DayWindow)
            .Where(c => alreadyClaimed is null || !alreadyClaimed.Contains(c.ExpenseId))
            .Where(c => c.IsRecurringInstance
                        || IsSimilar(counterpartyKey, c.Vendor)
                        || IsSimilar(counterpartyKey, c.ItemName))
            .OrderBy(c => Math.Abs(c.ExpenseDate.DayNumber - bookingDate.DayNumber))
            .ThenBy(c => c.IsRecurringInstance) // a vendor match beats a recurring-only match
            .Select(c => (Guid?)c.ExpenseId)
            .FirstOrDefault();
    }

    /// <summary>
    /// Loose comparison of a counterparty key with an expense's vendor or item name: one contains
    /// the other, or both start with the same word (letters and digits) of at least three characters.
    /// </summary>
    public static bool IsSimilar(string? counterpartyKey, string? name)
    {
        var key = CounterpartyKey.Normalise(counterpartyKey);
        var other = CounterpartyKey.Normalise(name);
        if (key is null || other is null)
            return false;

        if (key.Contains(other, StringComparison.Ordinal) || other.Contains(key, StringComparison.Ordinal))
            return true;

        var keyWord = FirstWord(key);
        var otherWord = FirstWord(other);
        return keyWord.Length >= 3 && keyWord == otherWord;
    }

    private static string FirstWord(string value)
    {
        var end = 0;
        while (end < value.Length && char.IsLetterOrDigit(value[end]))
            end++;
        return value[..end];
    }
}
