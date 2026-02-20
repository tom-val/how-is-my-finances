using HowAreMyFinances.Api.Domain;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Domain;

public class RecurringExpenseEntityTests
{
    [Fact]
    public void Create_WithValidInputs_ReturnsSuccess()
    {
        // Act
        var result = RecurringExpenseEntity.Create("Rent", 500m, Guid.NewGuid(), null, null, 1);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("Rent", result.Value!.ItemName);
        Assert.Equal(500m, result.Value.Amount);
        Assert.Equal(1, result.Value.DayOfMonth);
    }

    [Fact]
    public void Create_TrimsItemName()
    {
        // Act
        var result = RecurringExpenseEntity.Create("  Rent  ", 500m, Guid.NewGuid(), null, null, 1);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("Rent", result.Value!.ItemName);
    }

    [Fact]
    public void Create_WithEmptyItemName_ReturnsFailure()
    {
        // Act
        var result = RecurringExpenseEntity.Create("", 500m, Guid.NewGuid(), null, null, 1);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Item name", result.Error!);
    }

    [Fact]
    public void Create_WithWhitespaceItemName_ReturnsFailure()
    {
        // Act
        var result = RecurringExpenseEntity.Create("   ", 500m, Guid.NewGuid(), null, null, 1);

        // Assert
        Assert.False(result.IsSuccess);
    }

    [Fact]
    public void Create_WithZeroAmount_ReturnsFailure()
    {
        // Act
        var result = RecurringExpenseEntity.Create("Rent", 0m, Guid.NewGuid(), null, null, 1);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Amount", result.Error!);
    }

    [Fact]
    public void Create_WithNegativeAmount_ReturnsFailure()
    {
        // Act
        var result = RecurringExpenseEntity.Create("Rent", -100m, Guid.NewGuid(), null, null, 1);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Amount", result.Error!);
    }

    [Fact]
    public void Create_WithDayOfMonth0_ReturnsFailure()
    {
        // Act
        var result = RecurringExpenseEntity.Create("Rent", 500m, Guid.NewGuid(), null, null, 0);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Day of month", result.Error!);
    }

    [Fact]
    public void Create_WithDayOfMonth29_ReturnsFailure()
    {
        // Act
        var result = RecurringExpenseEntity.Create("Rent", 500m, Guid.NewGuid(), null, null, 29);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Day of month", result.Error!);
    }

    [Fact]
    public void Create_WithDayOfMonth1_ReturnsSuccess()
    {
        // Act
        var result = RecurringExpenseEntity.Create("Rent", 500m, Guid.NewGuid(), null, null, 1);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(1, result.Value!.DayOfMonth);
    }

    [Fact]
    public void Create_WithDayOfMonth28_ReturnsSuccess()
    {
        // Act
        var result = RecurringExpenseEntity.Create("Rent", 500m, Guid.NewGuid(), null, null, 28);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(28, result.Value!.DayOfMonth);
    }

    [Fact]
    public void ValidateUpdate_WithAllNull_ReturnsSuccess()
    {
        // Act
        var result = RecurringExpenseEntity.ValidateUpdate(null, null, null);

        // Assert
        Assert.True(result.IsSuccess);
    }

    [Fact]
    public void ValidateUpdate_WithValidPartialFields_ReturnsSuccess()
    {
        // Act
        var result = RecurringExpenseEntity.ValidateUpdate("New name", 100m, 15);

        // Assert
        Assert.True(result.IsSuccess);
    }

    [Fact]
    public void ValidateUpdate_WithEmptyItemName_ReturnsFailure()
    {
        // Act
        var result = RecurringExpenseEntity.ValidateUpdate("  ", null, null);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Item name", result.Error!);
    }

    [Fact]
    public void ValidateUpdate_WithNegativeAmount_ReturnsFailure()
    {
        // Act
        var result = RecurringExpenseEntity.ValidateUpdate(null, -5m, null);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Amount", result.Error!);
    }

    [Fact]
    public void ValidateUpdate_WithInvalidDayOfMonth_ReturnsFailure()
    {
        // Act
        var result = RecurringExpenseEntity.ValidateUpdate(null, null, 30);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Day of month", result.Error!);
    }
}
