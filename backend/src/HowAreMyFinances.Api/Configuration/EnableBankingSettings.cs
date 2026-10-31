namespace HowAreMyFinances.Api.Configuration;

/// <summary>
/// Enable Banking (PSD2 aggregator) settings. Not required at startup: when the application ID or
/// private key is missing, the bank endpoints that call Enable Banking answer 503.
/// </summary>
public sealed class EnableBankingSettings
{
    public const string SectionName = "EnableBanking";

    /// <summary>Enable Banking application ID, used as the JWT <c>kid</c>.</summary>
    public string ApplicationId { get; set; } = string.Empty;

    /// <summary>Base64 of the PEM private key (deployed environments).</summary>
    public string PrivateKeyBase64 { get; set; } = string.Empty;

    /// <summary>Path to the PEM private key file (local development).</summary>
    public string PrivateKeyPath { get; set; } = string.Empty;

    public string BaseUrl { get; set; } = "https://api.enablebanking.com";

    public string RedirectUrl { get; set; } = "https://finances.valiunas.dev/bank/callback";

    /// <summary>Requested consent length; capped by the bank's <c>maximum_consent_validity</c>.</summary>
    public int ConsentDays { get; set; } = 180;

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(ApplicationId)
        && (!string.IsNullOrWhiteSpace(PrivateKeyBase64) || !string.IsNullOrWhiteSpace(PrivateKeyPath));
}
