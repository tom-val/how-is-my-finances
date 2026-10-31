using HowAreMyFinances.Api.Domain;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Domain;

public class CounterpartyKeyTests
{
    [Theory]
    [InlineData("MAXIMA LT X123 VILNIUS", "maxima lt x vilnius")]
    [InlineData("  Circle   K\tKaunas  ", "circle k kaunas")]
    [InlineData("IKI *1234 Vilnius", "iki vilnius")]
    [InlineData("Bolt **** 5678", "bolt")]
    [InlineData("RIMI 516793******1234 KAUNAS", "rimi kaunas")]
    [InlineData("LIDL 1234567 KAUNAS", "lidl kaunas")]
    [InlineData("VIADA 12", "viada 12")]
    [InlineData("UAB ŠVYTURYS-UTENOS ALUS", "uab švyturys-utenos alus")]
    public void Normalise_ProducesStableKey(string input, string expected)
    {
        // Act
        var key = CounterpartyKey.Normalise(input);

        // Assert
        Assert.Equal(expected, key);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("*1234")]
    [InlineData("123456789")]
    public void Normalise_WhenNothingMeaningfulLeft_ReturnsNull(string? input)
    {
        // Act
        var key = CounterpartyKey.Normalise(input);

        // Assert
        Assert.Null(key);
    }

    [Fact]
    public void Normalise_IsIdempotent()
    {
        // Arrange
        var once = CounterpartyKey.Normalise("MAXIMA LT X123 VILNIUS *4321");

        // Act
        var twice = CounterpartyKey.Normalise(once);

        // Assert
        Assert.Equal(once, twice);
    }

    [Fact]
    public void Normalise_CapsLength()
    {
        // Act
        var key = CounterpartyKey.Normalise(new string('a', 500));

        // Assert
        Assert.Equal(CounterpartyKey.MaxLength, key!.Length);
    }

    [Theory]
    [InlineData("PIRKINYS 516793******1234 2026.10.28 5,99 EUR (512345) IKI VILNIUS", "IKI VILNIUS")]
    [InlineData("Card payment *1234 2026-10-28 12:34 MAXIMA LT X123", "MAXIMA LT X123")]
    [InlineData("BOLT.EU/O/2610281234", "BOLT.EU/O/2610281234")]
    public void ExtractMerchant_StripsCardPaymentNoise(string remittance, string expected)
    {
        // Act
        var merchant = CounterpartyKey.ExtractMerchant([remittance]);

        // Assert
        Assert.Equal(expected, merchant);
    }

    [Fact]
    public void ExtractMerchant_SkipsLinesWithoutLetters()
    {
        // Act
        var merchant = CounterpartyKey.ExtractMerchant(["", "2026.10.28 5,99 EUR", "Circle K"]);

        // Assert
        Assert.Equal("Circle K", merchant);
    }

    [Fact]
    public void ExtractMerchant_WhenNoRemittance_ReturnsNull()
    {
        // Act & Assert
        Assert.Null(CounterpartyKey.ExtractMerchant(null));
        Assert.Null(CounterpartyKey.ExtractMerchant([]));
    }
}
