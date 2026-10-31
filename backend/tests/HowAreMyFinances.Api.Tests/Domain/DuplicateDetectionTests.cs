using HowAreMyFinances.Api.Domain;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Domain;

public class DuplicateDetectionTests
{
    private static readonly DateOnly BookingDate = new(2026, 10, 15);

    private static DuplicateCandidate Candidate(decimal amount, DateOnly date, string? vendor = null,
        string itemName = "Something", bool recurring = false) =>
        new(Guid.NewGuid(), itemName, amount, vendor, date, recurring);

    [Fact]
    public void FindDuplicate_SameAmountSimilarVendorWithinWindow_Matches()
    {
        // Arrange
        var candidate = Candidate(12.50m, BookingDate.AddDays(2), vendor: "Maxima");

        // Act
        var match = DuplicateDetector.FindDuplicate(12.50m, BookingDate, "maxima lt x vilnius", [candidate]);

        // Assert
        Assert.Equal(candidate.ExpenseId, match);
    }

    [Fact]
    public void FindDuplicate_OutsideThreeDays_DoesNotMatch()
    {
        // Arrange
        var candidate = Candidate(12.50m, BookingDate.AddDays(4), vendor: "Maxima");

        // Act
        var match = DuplicateDetector.FindDuplicate(12.50m, BookingDate, "maxima", [candidate]);

        // Assert
        Assert.Null(match);
    }

    [Fact]
    public void FindDuplicate_DifferentAmount_DoesNotMatch()
    {
        // Arrange
        var candidate = Candidate(12.49m, BookingDate, vendor: "Maxima");

        // Act
        var match = DuplicateDetector.FindDuplicate(12.50m, BookingDate, "maxima", [candidate]);

        // Assert
        Assert.Null(match);
    }

    [Fact]
    public void FindDuplicate_DifferentVendor_DoesNotMatch()
    {
        // Arrange
        var candidate = Candidate(12.50m, BookingDate, vendor: "Rimi", itemName: "Groceries");

        // Act
        var match = DuplicateDetector.FindDuplicate(12.50m, BookingDate, "maxima", [candidate]);

        // Assert
        Assert.Null(match);
    }

    [Fact]
    public void FindDuplicate_RecurringInstance_MatchesWithoutVendor()
    {
        // Arrange
        var candidate = Candidate(500m, BookingDate.AddDays(-1), itemName: "Rent", recurring: true);

        // Act
        var match = DuplicateDetector.FindDuplicate(500m, BookingDate, "uab landlord", [candidate]);

        // Assert
        Assert.Equal(candidate.ExpenseId, match);
    }

    [Fact]
    public void FindDuplicate_MatchesOnItemNameWhenVendorEmpty()
    {
        // Arrange
        var candidate = Candidate(9.99m, BookingDate, vendor: null, itemName: "Netflix subscription");

        // Act
        var match = DuplicateDetector.FindDuplicate(9.99m, BookingDate, "netflix.com", [candidate]);

        // Assert
        Assert.Equal(candidate.ExpenseId, match);
    }

    [Fact]
    public void FindDuplicate_PrefersClosestDate_AndSkipsClaimed()
    {
        // Arrange
        var far = Candidate(10m, BookingDate.AddDays(3), vendor: "Iki");
        var near = Candidate(10m, BookingDate.AddDays(1), vendor: "Iki");

        // Act
        var first = DuplicateDetector.FindDuplicate(10m, BookingDate, "iki vilnius", [far, near]);
        var second = DuplicateDetector.FindDuplicate(10m, BookingDate, "iki vilnius", [far, near], new HashSet<Guid> { near.ExpenseId });

        // Assert
        Assert.Equal(near.ExpenseId, first);
        Assert.Equal(far.ExpenseId, second);
    }

    [Theory]
    [InlineData("maxima lt x vilnius", "Maxima", true)]
    [InlineData("circle k kaunas", "Circle K", true)]
    [InlineData("bolt", "Bolt Food", true)]
    [InlineData("iki", "Rimi", false)]
    [InlineData(null, "Maxima", false)]
    [InlineData("maxima", null, false)]
    public void IsSimilar_ComparesLoosely(string? key, string? name, bool expected)
    {
        // Act & Assert
        Assert.Equal(expected, DuplicateDetector.IsSimilar(key, name));
    }
}
