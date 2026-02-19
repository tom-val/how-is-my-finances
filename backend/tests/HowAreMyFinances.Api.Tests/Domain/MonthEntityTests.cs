using HowAreMyFinances.Api.Domain;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Domain;

public class MonthEntityTests
{
    [Fact]
    public void Create_WithValidData_ReturnsSuccess()
    {
        // Act
        var result = MonthEntity.Create(2026, 6, 3000m);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(2026, result.Value!.Year);
        Assert.Equal(6, result.Value.MonthNumber);
        Assert.Equal(3000m, result.Value.Salary);
    }

    [Fact]
    public void Create_WithZeroSalary_ReturnsSuccess()
    {
        // Act
        var result = MonthEntity.Create(2026, 1, 0m);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(0m, result.Value!.Salary);
    }

    [Fact]
    public void Create_WithYearBelow2000_ReturnsFailure()
    {
        // Act
        var result = MonthEntity.Create(1999, 1, 3000m);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Year", result.Error);
    }

    [Fact]
    public void Create_WithYearAbove2100_ReturnsFailure()
    {
        // Act
        var result = MonthEntity.Create(2101, 1, 3000m);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Year", result.Error);
    }

    [Fact]
    public void Create_WithMonthBelow1_ReturnsFailure()
    {
        // Act
        var result = MonthEntity.Create(2026, 0, 3000m);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Month", result.Error);
    }

    [Fact]
    public void Create_WithMonthAbove12_ReturnsFailure()
    {
        // Act
        var result = MonthEntity.Create(2026, 13, 3000m);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Month", result.Error);
    }

    [Fact]
    public void Create_WithNegativeSalary_ReturnsFailure()
    {
        // Act
        var result = MonthEntity.Create(2026, 1, -100m);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Salary", result.Error);
    }

    [Fact]
    public void ValidateSalary_WithNonNegative_ReturnsSuccess()
    {
        // Act
        var result = MonthEntity.ValidateSalary(5000m);

        // Assert
        Assert.True(result.IsSuccess);
    }

    [Fact]
    public void ValidateSalary_WithNegative_ReturnsFailure()
    {
        // Act
        var result = MonthEntity.ValidateSalary(-1m);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Salary", result.Error);
    }
}
