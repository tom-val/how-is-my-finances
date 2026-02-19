using HowAreMyFinances.Api.Domain;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Domain;

public class IncomeEntityTests
{
    [Fact]
    public void Create_WithValidData_ReturnsSuccess()
    {
        // Act
        var result = IncomeEntity.Create("Freelance", 500m, new DateOnly(2026, 2, 19), "Web project");

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("Freelance", result.Value!.Source);
        Assert.Equal(500m, result.Value.Amount);
    }

    [Fact]
    public void Create_TrimsSource()
    {
        // Act
        var result = IncomeEntity.Create("  Bonus  ", 200m, new DateOnly(2026, 2, 19), null);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("Bonus", result.Value!.Source);
    }

    [Fact]
    public void Create_WithEmptySource_ReturnsFailure()
    {
        // Act
        var result = IncomeEntity.Create("", 500m, new DateOnly(2026, 2, 19), null);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Source", result.Error);
    }

    [Fact]
    public void Create_WithWhitespaceSource_ReturnsFailure()
    {
        // Act
        var result = IncomeEntity.Create("   ", 500m, new DateOnly(2026, 2, 19), null);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Source", result.Error);
    }

    [Fact]
    public void Create_WithZeroAmount_ReturnsFailure()
    {
        // Act
        var result = IncomeEntity.Create("Freelance", 0m, new DateOnly(2026, 2, 19), null);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Amount", result.Error);
    }

    [Fact]
    public void Create_WithNegativeAmount_ReturnsFailure()
    {
        // Act
        var result = IncomeEntity.Create("Freelance", -100m, new DateOnly(2026, 2, 19), null);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Amount", result.Error);
    }

    [Fact]
    public void ValidateUpdate_WithValidData_ReturnsSuccess()
    {
        // Act
        var result = IncomeEntity.ValidateUpdate("Updated source", 300m);

        // Assert
        Assert.True(result.IsSuccess);
    }

    [Fact]
    public void ValidateUpdate_WithNullValues_ReturnsSuccess()
    {
        // Act
        var result = IncomeEntity.ValidateUpdate(null, null);

        // Assert
        Assert.True(result.IsSuccess);
    }

    [Fact]
    public void ValidateUpdate_WithEmptySource_ReturnsFailure()
    {
        // Act
        var result = IncomeEntity.ValidateUpdate("  ", null);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Source", result.Error);
    }

    [Fact]
    public void ValidateUpdate_WithNegativeAmount_ReturnsFailure()
    {
        // Act
        var result = IncomeEntity.ValidateUpdate(null, -5m);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Amount", result.Error);
    }
}
