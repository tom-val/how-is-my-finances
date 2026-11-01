using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using HowAreMyFinances.Api.Domain;

namespace HowAreMyFinances.Api.Infrastructure.EnableBanking;

/// <summary>Maps Enable Banking transactions to bank_transactions rows.</summary>
public static partial class TransactionMapper
{
    public const int MaxCounterpartyLength = 200;
    public const int MaxDescriptionLength = 1000;

    /// <summary>Card payments are booked a few days after the purchase; older dates in the text are something else.</summary>
    public const int MaxPurchaseDateLagDays = 14;

    // A masked card number, e.g. 516793******4160 or ****4160: marks the text as a card payment.
    [GeneratedRegex(@"\d*\*{2,}\d{4}")]
    private static partial Regex CardMaskRegex();

    // Purchase dates in card-payment texts: 2026.10.28, 2026-10-28 or 28.10.2026.
    [GeneratedRegex(@"\b(?:(?<y>\d{4})[.\-/](?<m>\d{2})[.\-/](?<d>\d{2})|(?<d>\d{2})[.\-/](?<m>\d{2})[.\-/](?<y>\d{4}))\b")]
    private static partial Regex DateRegex();

    /// <summary>
    /// Returns null for transactions that can't become a suggestion: zero amount, unknown direction,
    /// or a status other than booked/pending (cancelled, rejected, scheduled…).
    /// </summary>
    /// <param name="requestedStatus">The status filter used for the request; applied when the bank omits <c>status</c>.</param>
    /// <param name="today">Fallback date for pending items without any date.</param>
    public static NewBankTransaction? Map(EbTransaction transaction, string requestedStatus, DateOnly today)
    {
        var bookingStatus = (transaction.Status ?? requestedStatus) switch
        {
            EbTransactionStatus.Booked => BankBookingStatus.Booked,
            EbTransactionStatus.Pending => BankBookingStatus.Pending,
            _ => null
        };
        if (bookingStatus is null)
            return null;

        var rawAmount = transaction.TransactionAmount?.Amount ?? 0m;
        var amount = Math.Round(Math.Abs(rawAmount), 2, MidpointRounding.AwayFromZero);
        if (amount == 0m)
            return null;

        var direction = transaction.CreditDebitIndicator switch
        {
            "DBIT" => BankDirection.Debit,
            "CRDT" => BankDirection.Credit,
            // Some banks omit the indicator and sign the amount instead
            _ when rawAmount < 0 => BankDirection.Debit,
            _ => null
        };
        if (direction is null)
            return null;

        // The bank's own date for the row: booked rows the booking date, pending rows the transaction or value date.
        // It keys the hash id below, so it must stay as it was when earlier syncs stored the row.
        var bankDate = bookingStatus == BankBookingStatus.Booked
            ? transaction.BookingDate ?? transaction.ValueDate ?? transaction.TransactionDate
            : transaction.TransactionDate ?? transaction.ValueDate ?? transaction.BookingDate;

        var isDebit = direction == BankDirection.Debit;
        var party = isDebit ? transaction.Creditor : transaction.Debtor;
        var partyAccount = isDebit ? transaction.CreditorAccount : transaction.DebtorAccount;

        var description = JoinRemittance(transaction.RemittanceInformation);

        // The date the money was spent, which is what the expense should carry: the transaction date when the
        // bank sends one, else the purchase date in a card payment's text (Swedbank books cards 2-3 days later).
        var spentDate = transaction.TransactionDate ?? PurchaseDate(description, bankDate) ?? bankDate;

        var counterpartyName = Clean(party?.Name);
        if (counterpartyName is null && isDebit)
        {
            // Card payments often carry the merchant only in the remittance text
            counterpartyName = Clean(CounterpartyKey.ExtractMerchant(transaction.RemittanceInformation));
        }
        counterpartyName = Truncate(counterpartyName, MaxCounterpartyLength);

        var currency = string.IsNullOrWhiteSpace(transaction.TransactionAmount?.Currency)
            ? "EUR"
            : transaction.TransactionAmount!.Currency!.Trim().ToUpperInvariant();

        var externalId = Clean(transaction.EntryReference)
            ?? Clean(transaction.TransactionId)
            ?? HashId(bankDate, amount, direction, counterpartyName, description);

        return new NewBankTransaction(
            ExternalId: externalId,
            BookingStatus: bookingStatus,
            Direction: direction,
            Amount: amount,
            Currency: currency,
            BookingDate: spentDate ?? today,
            CounterpartyName: counterpartyName,
            CounterpartyKey: CounterpartyKey.Normalise(counterpartyName ?? description),
            CounterpartyIbanHash: Iban.Hash(partyAccount?.Iban),
            Description: Truncate(description, MaxDescriptionLength),
            MerchantCategoryCode: Clean(transaction.MerchantCategoryCode),
            RawJson: transaction.RawJson);
    }

    /// <summary>
    /// The purchase date in a card payment's remittance text, e.g. <c>PIRKINYS 516793******4160 2026.10.28 12.38 EUR</c>.
    /// Only for texts with a masked card number, and only up to <see cref="MaxPurchaseDateLagDays"/> days before the
    /// bank's date (never after it), so other dates in a text (invoice periods, due dates) are ignored.
    /// </summary>
    public static DateOnly? PurchaseDate(string? remittance, DateOnly? bankDate)
    {
        if (remittance is null || bankDate is not { } latest || !CardMaskRegex().IsMatch(remittance))
            return null;

        foreach (Match match in DateRegex().Matches(remittance))
        {
            if (!DateOnly.TryParseExact(
                    $"{match.Groups["y"].Value}-{match.Groups["m"].Value}-{match.Groups["d"].Value}",
                    "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
                continue;

            if (date <= latest && date >= latest.AddDays(-MaxPurchaseDateLagDays))
                return date;
        }

        return null;
    }

    /// <summary>sha256(booking_date|amount|direction|counterparty|description), used when the bank gives no id.</summary>
    public static string HashId(DateOnly? bookingDate, decimal amount, string direction, string? counterparty, string? description)
    {
        var input = string.Join('|',
            bookingDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "",
            amount.ToString("0.00", CultureInfo.InvariantCulture),
            direction,
            counterparty ?? "",
            description ?? "");

        return "h:" + Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(input)));
    }

    private static string? JoinRemittance(List<string>? remittance)
    {
        if (remittance is null || remittance.Count == 0)
            return null;

        return Clean(string.Join(' ', remittance.Where(r => !string.IsNullOrWhiteSpace(r)).Select(r => r.Trim())));
    }

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string? Truncate(string? value, int maxLength) =>
        value is null || value.Length <= maxLength ? value : value[..maxLength];
}
