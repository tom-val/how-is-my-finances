using System.Text.RegularExpressions;

namespace HowAreMyFinances.Api.Domain;

/// <summary>A new booked bank row that may be the settled form of an accepted reservation.</summary>
public sealed record BookedBankRow(
    Guid Id, Guid AccountId, string Direction, decimal Amount, DateOnly Date, string? CounterpartyKey, string? CardCode);

/// <summary>A pending (reserved) bank row the user accepted, with the expense or income it created.</summary>
public sealed record AcceptedPendingBankRow(
    Guid Id, Guid AccountId, string Direction, decimal Amount, DateOnly Date, string? CounterpartyKey, string? CardCode,
    Guid? ExpenseId, Guid? IncomeId);

/// <summary>
/// Pairs booked rows with the accepted reservation they settle, so a payment isn't suggested twice. The bank
/// gives reservations no id and words the merchant differently once booked, but a card payment's text carries
/// the same authorisation code in both states:
/// <c>PIRKINYS 516793******4160 02.11.26 02:53 3.35 EUR (226202) AWS EMEA LUXEMBOURG LU</c> reserved,
/// <c>PIRKINYS 516793******4160 2026.11.01 3.35 EUR (226202) AWS EMEA L1855 LUXEMBOURG</c> booked.
/// </summary>
public static partial class PendingBookedMatcher
{
    /// <summary>Without a shared card code: how far apart the dates may be when the merchants match.</summary>
    public const int DayWindow = 3;

    /// <summary>With a shared card code: card payments can settle weeks later; the code and amount decide.</summary>
    public const int CardCodeDayWindow = 30;

    [GeneratedRegex(@"\d*\*{2,}\d{4}")]
    private static partial Regex CardMaskRegex();

    [GeneratedRegex(@"\(\s*(\d{4,8})\s*\)")]
    private static partial Regex CardCodeRegex();

    /// <summary>The authorisation code in a card payment's text, or null when it isn't a card payment or has none.</summary>
    public static string? ExtractCardCode(string? description)
    {
        if (description is null || !CardMaskRegex().IsMatch(description))
            return null;

        var match = CardCodeRegex().Match(description);
        return match.Success ? match.Groups[1].Value : null;
    }

    /// <summary>Different card codes mean two separate purchases, whatever else matches.</summary>
    public static bool AreDifferentPayments(string? cardCode, string? otherCardCode) =>
        cardCode is not null && otherCardCode is not null && cardCode != otherCardCode;

    /// <summary>One-to-one pairs: a shared card code first, then identical merchants, then the closest dates.</summary>
    public static IReadOnlyList<(BookedBankRow Booked, AcceptedPendingBankRow Pending)> Match(
        IReadOnlyCollection<BookedBankRow> booked, IReadOnlyCollection<AcceptedPendingBankRow> pending)
    {
        var candidates =
            from b in booked
            from p in pending
            where p.AccountId == b.AccountId && p.Direction == b.Direction && p.Amount == b.Amount
            where !AreDifferentPayments(p.CardCode, b.CardCode)
            let distance = Math.Abs(p.Date.DayNumber - b.Date.DayNumber)
            let sameCode = p.CardCode is not null && p.CardCode == b.CardCode
            let identical = p.CounterpartyKey == b.CounterpartyKey
            where sameCode
                ? distance <= CardCodeDayWindow
                : distance <= DayWindow && (identical || DuplicateDetector.IsSimilar(p.CounterpartyKey, b.CounterpartyKey))
            orderby sameCode descending, identical descending, distance
            select (Booked: b, Pending: p);

        var usedBooked = new HashSet<Guid>();
        var usedPending = new HashSet<Guid>();
        var matches = new List<(BookedBankRow, AcceptedPendingBankRow)>();
        foreach (var (b, p) in candidates)
        {
            if (usedBooked.Contains(b.Id) || usedPending.Contains(p.Id))
                continue;

            usedBooked.Add(b.Id);
            usedPending.Add(p.Id);
            matches.Add((b, p));
        }

        return matches;
    }
}
