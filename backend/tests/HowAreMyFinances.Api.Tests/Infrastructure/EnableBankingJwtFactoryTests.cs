using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Text;
using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Infrastructure.EnableBanking;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Infrastructure;

public class EnableBankingJwtFactoryTests
{
    private const string ApplicationId = "00000000-1111-2222-3333-444444444444";
    private static readonly DateTimeOffset Start = new(2026, 10, 31, 12, 0, 0, TimeSpan.Zero);

    private readonly RSA _rsa = RSA.Create(2048);
    private readonly TestTimeProvider _time = new(Start);

    private EnableBankingJwtFactory CreateFactory()
    {
        var pem = _rsa.ExportPkcs8PrivateKeyPem();
        var settings = new EnableBankingSettings
        {
            ApplicationId = ApplicationId,
            PrivateKeyBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(pem))
        };
        return new EnableBankingJwtFactory(Options.Create(settings), _time);
    }

    [Fact]
    public void GetToken_HasExpectedHeaderAndClaims()
    {
        // Arrange
        using var factory = CreateFactory();

        // Act
        var token = new JwtSecurityTokenHandler().ReadJwtToken(factory.GetToken());

        // Assert
        Assert.Equal("RS256", token.Header.Alg);
        Assert.Equal("JWT", token.Header.Typ);
        Assert.Equal(ApplicationId, token.Header.Kid);
        Assert.Equal("enablebanking.com", token.Issuer);
        Assert.Equal(["api.enablebanking.com"], token.Audiences);
        Assert.Equal(Start.ToUnixTimeSeconds(), long.Parse(token.Payload[JwtRegisteredClaimNames.Iat].ToString()!));
        Assert.Equal(Start.AddHours(1).ToUnixTimeSeconds(), token.Payload.Expiration);
    }

    [Fact]
    public void GetToken_IsSignedWithThePrivateKey()
    {
        // Arrange
        using var factory = CreateFactory();
        var token = factory.GetToken();
        var publicKey = new RsaSecurityKey(_rsa.ExportParameters(false));

        // Act
        var handler = new JwtSecurityTokenHandler();
        handler.ValidateToken(token, new TokenValidationParameters
        {
            IssuerSigningKey = publicKey,
            ValidIssuer = "enablebanking.com",
            ValidAudience = "api.enablebanking.com",
            ValidateLifetime = false
        }, out var validated);

        // Assert
        Assert.NotNull(validated);
    }

    [Fact]
    public void GetToken_IsCachedUntilFiveMinutesBeforeExpiry()
    {
        // Arrange
        using var factory = CreateFactory();
        var first = factory.GetToken();

        // Act
        _time.Advance(TimeSpan.FromMinutes(54));
        var cached = factory.GetToken();
        _time.Advance(TimeSpan.FromMinutes(1) + TimeSpan.FromSeconds(1));
        var refreshed = factory.GetToken();

        // Assert
        Assert.Equal(first, cached);
        Assert.NotEqual(first, refreshed);
        var refreshedToken = new JwtSecurityTokenHandler().ReadJwtToken(refreshed);
        Assert.Equal(_time.Now.AddHours(1).ToUnixTimeSeconds(), refreshedToken.Payload.Expiration);
    }

    [Fact]
    public void GetToken_ReadsKeyFromPath()
    {
        // Arrange
        var path = Path.Combine(Path.GetTempPath(), $"eb-test-{Guid.NewGuid():N}.pem");
        File.WriteAllText(path, _rsa.ExportPkcs8PrivateKeyPem());
        try
        {
            var settings = new EnableBankingSettings { ApplicationId = ApplicationId, PrivateKeyPath = path };
            using var factory = new EnableBankingJwtFactory(Options.Create(settings), _time);

            // Act
            var token = new JwtSecurityTokenHandler().ReadJwtToken(factory.GetToken());

            // Assert
            Assert.Equal(ApplicationId, token.Header.Kid);
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Theory]
    [InlineData("", "", "", false)]
    [InlineData("app", "", "", false)]
    [InlineData("app", "a2V5", "", true)]
    [InlineData("app", "", "/tmp/key.pem", true)]
    [InlineData("", "a2V5", "/tmp/key.pem", false)]
    public void IsConfigured_RequiresApplicationIdAndAKey(string applicationId, string keyBase64, string keyPath, bool expected)
    {
        // Arrange
        var settings = new EnableBankingSettings
        {
            ApplicationId = applicationId,
            PrivateKeyBase64 = keyBase64,
            PrivateKeyPath = keyPath
        };

        // Act & Assert
        Assert.Equal(expected, settings.IsConfigured);
    }
}
