using HowAreMyFinances.Api.Domain;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Domain;

public class PendingBookedMatcherTests
{
    private static readonly Guid Account = Guid.NewGuid();
    private static readonly DateOnly Date = new(2026, 11, 1);

    private static BookedBankRow Booked(decimal amount, string? key, string? code = null, DateOnly? date = null, Guid? account = null) =>
        new(Guid.NewGuid(), account ?? Account, BankDirection.Debit, amount, date ?? Date, key, code);

    private static AcceptedPendingBankRow Pending(decimal amount, string? key, string? code = null, DateOnly? date = null) =>
        new(Guid.NewGuid(), Account, BankDirection.Debit, amount, date ?? Date, key, code, Guid.NewGuid(), null);

    [Theory]
    [InlineData("PIRKINYS 516793******4160 02.11.26 02:53 3.35 EUR (226202) AWS EMEA LUXEMBOURG LU", "226202")]
    [InlineData("PIRKINYS 516793******4160 2026.11.01 3.35 EUR (226202) AWS EMEA L1855 LUXEMBOURG", "226202")]
    [InlineData("Saskaita (226202) UAB Telia", null)] // no masked card: not a card payment
    [InlineData("PIRKINYS 516793******4160 2026.11.01 3.35 EUR MAXIMA", null)]
    [InlineData(null, null)]
    public void ExtractCardCode_ReadsTheAuthorisationCode(string? text, string? expected)
    {
        // Act
        var code = PendingBookedMatcher.ExtractCardCode(text);

        // Assert
        Assert.Equal(expected, code);
    }

    [Theory] // The real pairs that became duplicates: same code, differently worded merchants.
    [InlineData(3.35, "aws emea luxembourg lu", "aws emea l luxembourg", "226202")]
    [InlineData(11.35, "pc versme rokiskio r. lt", "pc versme rokiskio r.", "221975")]
    [InlineData(61.71, "patreon* membership internet ie", "patreon* membership dublin 2 internet", "695843")]
    [InlineData(20.60, "kavine \"pupele\" terasarokiskis lt", "kavine \"pupele\" terasa rokiskis", "753445")]
    public void Match_SameCardCode_Links(decimal amount, string pendingKey, string bookedKey, string code)
    {
        // Arrange
        var booked = Booked(amount, bookedKey, code);
        var pending = Pending(amount, pendingKey, code);

        // Act
        var match = Assert.Single(PendingBookedMatcher.Match([booked], [pending]));

        // Assert
        Assert.Equal(booked.Id, match.Booked.Id);
        Assert.Equal(pending.Id, match.Pending.Id);
    }

    [Fact]
    public void Match_SameCardCodeDifferentMerchantAndLateBooking_Links()
    {
        // Act
        var matches = PendingBookedMatcher.Match(
            [Booked(5m, "something else", "111111", Date.AddDays(20))], [Pending(5m, "merchant", "111111")]);

        // Assert
        Assert.Single(matches);
    }

    [Fact]
    public void Match_DifferentCardCodes_NeverLinks()
    {
        // Arrange: two coffees of the same price at the same place
        var matches = PendingBookedMatcher.Match([Booked(3.20m, "caffeine", "111111")], [Pending(3.20m, "caffeine", "222222")]);

        // Assert
        Assert.Empty(matches);
    }

    [Fact]
    public void Match_TwoSamePricePurchases_EachLinksItsOwnCode()
    {
        // Arrange
        var firstBooked = Booked(3.20m, "caffeine", "111111");
        var secondBooked = Booked(3.20m, "caffeine", "222222");
        var firstPending = Pending(3.20m, "caffeine", "111111");
        var secondPending = Pending(3.20m, "caffeine", "222222");

        // Act
        var matches = PendingBookedMatcher.Match([firstBooked, secondBooked], [secondPending, firstPending]);

        // Assert
        Assert.Equal(2, matches.Count);
        Assert.Contains(matches, m => m.Booked.Id == firstBooked.Id && m.Pending.Id == firstPending.Id);
        Assert.Contains(matches, m => m.Booked.Id == secondBooked.Id && m.Pending.Id == secondPending.Id);
    }

    [Fact]
    public void Match_NoCardCode_FallsBackToSimilarMerchantWithinThreeDays()
    {
        // Act
        var near = PendingBookedMatcher.Match([Booked(9m, "maxima lt vilnius", date: Date.AddDays(3))], [Pending(9m, "maxima")]);
        var far = PendingBookedMatcher.Match([Booked(9m, "maxima lt vilnius", date: Date.AddDays(4))], [Pending(9m, "maxima")]);

        // Assert
        Assert.Single(near);
        Assert.Empty(far);
    }

    [Fact]
    public void Match_NoCardCodeDifferentMerchant_DoesNotLink()
    {
        // Act
        var matches = PendingBookedMatcher.Match([Booked(9m, "telia")], [Pending(9m, "maxima")]);

        // Assert
        Assert.Empty(matches);
    }

    [Fact]
    public void Match_OtherAccount_DoesNotLink()
    {
        // Act
        var matches = PendingBookedMatcher.Match([Booked(9m, "maxima", "111111", account: Guid.NewGuid())], [Pending(9m, "maxima", "111111")]);

        // Assert
        Assert.Empty(matches);
    }

    [Fact]
    public void Match_OneReservation_LinksOnlyOneBookedRow()
    {
        // Act
        var matches = PendingBookedMatcher.Match([Booked(9m, "maxima"), Booked(9m, "maxima")], [Pending(9m, "maxima")]);

        // Assert
        Assert.Single(matches);
    }
}
