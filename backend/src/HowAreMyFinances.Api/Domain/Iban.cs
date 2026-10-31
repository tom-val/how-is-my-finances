using System.Security.Cryptography;
using System.Text;

namespace HowAreMyFinances.Api.Domain;

public static class Iban
{
    /// <summary>Uppercase, without spaces.</summary>
    public static string? Clean(string? iban)
    {
        if (string.IsNullOrWhiteSpace(iban))
            return null;

        var cleaned = new string(iban.Where(c => !char.IsWhiteSpace(c)).ToArray()).ToUpperInvariant();
        return cleaned.Length == 0 ? null : cleaned;
    }

    /// <summary>Keeps the country code and the last four characters, e.g. <c>LT** **** **** **** 1234</c>.</summary>
    public static string? Mask(string? iban)
    {
        var cleaned = Clean(iban);
        if (cleaned is null)
            return null;

        if (cleaned.Length <= 6)
            return $"**** {cleaned[^Math.Min(4, cleaned.Length)..]}";

        return $"{cleaned[..2]}** **** **** **** {cleaned[^4..]}";
    }

    /// <summary>Lowercase hex sha256 of the cleaned IBAN; used to recognise the user's own accounts.</summary>
    public static string? Hash(string? iban)
    {
        var cleaned = Clean(iban);
        if (cleaned is null)
            return null;

        return Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(cleaned)));
    }
}
