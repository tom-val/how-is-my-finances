using System.Globalization;
using System.Text.RegularExpressions;

namespace HowAreMyFinances.Api.Domain;

/// <summary>
/// Deterministic normalisation of a counterparty (merchant/payee) name, used as the key for
/// per-user counterparty rules and for matching. It only needs to be stable for the same merchant;
/// the AI does the "understanding". Example: <c>MAXIMA LT X123 VILNIUS</c> → <c>maxima lt x vilnius</c>.
/// </summary>
public static partial class CounterpartyKey
{
    public const int MaxLength = 200;

    // Card masks such as *1234, 516793******1234, ****1234
    [GeneratedRegex(@"\d*\*+\d*")]
    private static partial Regex CardMaskRegex();

    // Runs of three or more digits (store numbers, terminal ids, references)
    [GeneratedRegex(@"\d{3,}")]
    private static partial Regex LongDigitRunRegex();

    [GeneratedRegex(@"\s+")]
    private static partial Regex WhitespaceRegex();

    // Dates such as 2026.10.28, 2026-10-28, 28.10.2026
    [GeneratedRegex(@"\b(\d{4}[.\-/]\d{2}[.\-/]\d{2}|\d{2}[.\-/]\d{2}[.\-/]\d{4})\b")]
    private static partial Regex DateRegex();

    // Times such as 12:34 or 12:34:56
    [GeneratedRegex(@"\b\d{1,2}:\d{2}(:\d{2})?\b")]
    private static partial Regex TimeRegex();

    // Amounts, optionally followed by a currency, e.g. 5,99 EUR
    [GeneratedRegex(@"-?\b\d+[.,]\d{1,2}\b(\s*(EUR|USD|GBP|PLN|SEK|NOK|DKK|CHF)\b)?", RegexOptions.IgnoreCase)]
    private static partial Regex AmountRegex();

    // Parenthesised authorisation codes, e.g. (123456)
    [GeneratedRegex(@"\(\s*\d+\s*\)")]
    private static partial Regex ParenCodeRegex();

    // Card-payment prefixes in Lithuanian and English remittance texts. A best guess until real
    // Swedbank samples are collected; unknown prefixes simply stay part of the merchant name.
    [GeneratedRegex(@"^(PIRKINYS|PIRKIMAS|MOKĖJIMAS KORTELE|KORTELĖS OPERACIJA|CARD PAYMENT|CARD PURCHASE|PURCHASE|POS)\b[:\s]*", RegexOptions.IgnoreCase)]
    private static partial Regex CardPrefixRegex();

    /// <summary>Normalises a counterparty name; returns null when nothing meaningful is left.</summary>
    public static string? Normalise(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var key = value.Trim().ToLower(CultureInfo.InvariantCulture);
        key = CardMaskRegex().Replace(key, " ");
        key = LongDigitRunRegex().Replace(key, "");
        key = WhitespaceRegex().Replace(key, " ").Trim();

        if (key.Length == 0)
            return null;

        return key.Length > MaxLength ? key[..MaxLength].TrimEnd() : key;
    }

    /// <summary>
    /// Extracts a merchant name from card-payment remittance information (used when the bank sends
    /// no creditor name). Strips payment prefixes, card masks, dates, times, amounts and codes.
    /// </summary>
    public static string? ExtractMerchant(IEnumerable<string>? remittanceInformation)
    {
        if (remittanceInformation is null)
            return null;

        foreach (var line in remittanceInformation)
        {
            if (string.IsNullOrWhiteSpace(line))
                continue;

            var text = line.Trim();
            text = CardPrefixRegex().Replace(text, "");
            text = CardMaskRegex().Replace(text, " ");
            text = DateRegex().Replace(text, " ");
            text = TimeRegex().Replace(text, " ");
            text = ParenCodeRegex().Replace(text, " ");
            text = AmountRegex().Replace(text, " ");
            text = WhitespaceRegex().Replace(text, " ").Trim(' ', ',', ';', '-', '/');

            if (text.Any(char.IsLetter))
                return text;
        }

        return null;
    }
}
