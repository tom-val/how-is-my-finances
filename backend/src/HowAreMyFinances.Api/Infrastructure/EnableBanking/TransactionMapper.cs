using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using HowAreMyFinances.Api.Domain;

namespace HowAreMyFinances.Api.Infrastructure.EnableBanking;

/// <summary>Maps Enable Banking transactions to bank_transactions rows.</summary>
public static class TransactionMapper
{
    public const int MaxCounterpartyLength = 200;
    public const int MaxDescriptionLength = 1000;

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

        // Booked rows use the booking date; pending rows the transaction or value date.
        var bookingDate = bookingStatus == BankBookingStatus.Booked
            ? transaction.BookingDate ?? transaction.ValueDate ?? transaction.TransactionDate
            : transaction.TransactionDate ?? transaction.ValueDate ?? transaction.BookingDate;

        var isDebit = direction == BankDirection.Debit;
        var party = isDebit ? transaction.Creditor : transaction.Debtor;
        var partyAccount = isDebit ? transaction.CreditorAccount : transaction.DebtorAccount;

        var description = JoinRemittance(transaction.RemittanceInformation);

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
            ?? HashId(bookingDate, amount, direction, counterpartyName, description);

        return new NewBankTransaction(
            ExternalId: externalId,
            BookingStatus: bookingStatus,
            Direction: direction,
            Amount: amount,
            Currency: currency,
            BookingDate: bookingDate ?? today,
            CounterpartyName: counterpartyName,
            CounterpartyKey: CounterpartyKey.Normalise(counterpartyName ?? description),
            CounterpartyIbanHash: Iban.Hash(partyAccount?.Iban),
            Description: Truncate(description, MaxDescriptionLength),
            MerchantCategoryCode: Clean(transaction.MerchantCategoryCode),
            RawJson: transaction.RawJson);
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
