using HowAreMyFinances.Api.Domain;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Domain;

public class ExpenseEntityTests
{
    [Fact]
    public void Create_WithValidData_ReturnsSuccess()
    {
        // Act
        var result = ExpenseEntity.Create("Coffee", 4.50m, Guid.NewGuid(), "Shop", new DateOnly(2026, 2, 19), null);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("Coffee", result.Value!.ItemName);
        Assert.Equal(4.50m, result.Value.Amount);
    }

    [Fact]
    public void Create_TrimsItemName()
    {
        // Act
        var result = ExpenseEntity.Create("  Coffee  ", 4.50m, Guid.NewGuid(), null, new DateOnly(2026, 2, 19), null);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("Coffee", result.Value!.ItemName);
    }

    [Fact]
    public void Create_WithEmptyItemName_ReturnsFailure()
    {
        // Act
        var result = ExpenseEntity.Create("", 4.50m, Guid.NewGuid(), null, new DateOnly(2026, 2, 19), null);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Item name", result.Error);
    }

    [Fact]
    public void Create_WithWhitespaceItemName_ReturnsFailure()
    {
        // Act
        var result = ExpenseEntity.Create("   ", 4.50m, Guid.NewGuid(), null, new DateOnly(2026, 2, 19), null);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Item name", result.Error);
    }

    [Fact]
    public void Create_WithZeroAmount_ReturnsFailure()
    {
        // Act
        var result = ExpenseEntity.Create("Coffee", 0m, Guid.NewGuid(), null, new DateOnly(2026, 2, 19), null);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Amount", result.Error);
    }

    [Fact]
    public void Create_WithNegativeAmount_ReturnsFailure()
    {
        // Act
        var result = ExpenseEntity.Create("Coffee", -5m, Guid.NewGuid(), null, new DateOnly(2026, 2, 19), null);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Amount", result.Error);
    }

    [Fact]
    public void ValidateUpdate_WithValidData_ReturnsSuccess()
    {
        // Act
        var result = ExpenseEntity.ValidateUpdate("Updated name", 10m);

        // Assert
        Assert.True(result.IsSuccess);
    }

    [Fact]
    public void ValidateUpdate_WithNullValues_ReturnsSuccess()
    {
        // Act
        var result = ExpenseEntity.ValidateUpdate(null, null);

        // Assert
        Assert.True(result.IsSuccess);
    }

    [Fact]
    public void ValidateUpdate_WithEmptyItemName_ReturnsFailure()
    {
        // Act
        var result = ExpenseEntity.ValidateUpdate("  ", null);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Item name", result.Error);
    }

    [Fact]
    public void ValidateUpdate_WithNegativeAmount_ReturnsFailure()
    {
        // Act
        var result = ExpenseEntity.ValidateUpdate(null, -5m);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Amount", result.Error);
    }
}
