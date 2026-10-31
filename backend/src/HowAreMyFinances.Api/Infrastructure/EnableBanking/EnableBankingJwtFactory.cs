using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Text;
using HowAreMyFinances.Api.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace HowAreMyFinances.Api.Infrastructure.EnableBanking;

/// <summary>
/// Creates the RS256 application JWT that authenticates every Enable Banking request.
/// The token lives one hour and is reused until five minutes before it expires.
/// </summary>
public sealed class EnableBankingJwtFactory : IDisposable
{
    public const string Issuer = "enablebanking.com";
    public const string Audience = "api.enablebanking.com";
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(1);
    public static readonly TimeSpan RefreshBeforeExpiry = TimeSpan.FromMinutes(5);

    private readonly EnableBankingSettings _settings;
    private readonly TimeProvider _timeProvider;
    private readonly object _lock = new();
    private RSA? _rsa;
    private string? _token;
    private DateTimeOffset _expiresAt;

    public EnableBankingJwtFactory(IOptions<EnableBankingSettings> settings, TimeProvider timeProvider)
    {
        _settings = settings.Value;
        _timeProvider = timeProvider;
    }

    public string GetToken()
    {
        lock (_lock)
        {
            var now = _timeProvider.GetUtcNow();
            if (_token is not null && now < _expiresAt - RefreshBeforeExpiry)
                return _token;

            _rsa ??= LoadKey();

            var issuedAt = now.ToUnixTimeSeconds();
            var expiresAt = now.Add(Lifetime);

            var key = new RsaSecurityKey(_rsa) { KeyId = _settings.ApplicationId };
            var credentials = new SigningCredentials(key, SecurityAlgorithms.RsaSha256);
            var header = new JwtHeader(credentials); // alg RS256, kid, typ JWT
            var payload = new JwtPayload
            {
                { JwtRegisteredClaimNames.Iss, Issuer },
                { JwtRegisteredClaimNames.Aud, Audience },
                { JwtRegisteredClaimNames.Iat, issuedAt },
                { JwtRegisteredClaimNames.Exp, expiresAt.ToUnixTimeSeconds() }
            };

            _token = new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(header, payload));
            _expiresAt = expiresAt;
            return _token;
        }
    }

    private RSA LoadKey()
    {
        string pem;
        if (!string.IsNullOrWhiteSpace(_settings.PrivateKeyBase64))
            pem = Encoding.UTF8.GetString(Convert.FromBase64String(_settings.PrivateKeyBase64.Trim()));
        else if (!string.IsNullOrWhiteSpace(_settings.PrivateKeyPath))
            pem = File.ReadAllText(ExpandHome(_settings.PrivateKeyPath));
        else
            throw new InvalidOperationException("Enable Banking private key is not configured");

        var rsa = RSA.Create();
        rsa.ImportFromPem(pem);
        return rsa;
    }

    private static string ExpandHome(string path) =>
        path.StartsWith("~/", StringComparison.Ordinal)
            ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), path[2..])
            : path;

    public void Dispose() => _rsa?.Dispose();
}
