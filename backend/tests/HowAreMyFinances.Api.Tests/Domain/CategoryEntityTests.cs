using HowAreMyFinances.Api.Domain;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Domain;

public class CategoryEntityTests
{
    [Fact]
    public void ValidateName_WithValidName_ReturnsSuccess()
    {
        // Act
        var result = CategoryEntity.ValidateName("Food");

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("Food", result.Value!.Name);
    }

    [Fact]
    public void ValidateName_TrimsWhitespace()
    {
        // Act
        var result = CategoryEntity.ValidateName("  Food  ");

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("Food", result.Value!.Name);
    }

    [Fact]
    public void ValidateName_WithEmptyString_ReturnsFailure()
    {
        // Act
        var result = CategoryEntity.ValidateName("");

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Category name", result.Error!);
    }

    [Fact]
    public void ValidateName_WithWhitespace_ReturnsFailure()
    {
        // Act
        var result = CategoryEntity.ValidateName("   ");

        // Assert
        Assert.False(result.IsSuccess);
    }

    [Fact]
    public void ValidateUpdate_WithValidName_ReturnsSuccess()
    {
        // Act
        var result = CategoryEntity.ValidateUpdate("Food");

        // Assert
        Assert.True(result.IsSuccess);
    }

    [Fact]
    public void ValidateUpdate_WithNullName_ReturnsSuccess()
    {
        // Act
        var result = CategoryEntity.ValidateUpdate(null);

        // Assert
        Assert.True(result.IsSuccess);
    }

    [Fact]
    public void ValidateUpdate_WithEmptyName_ReturnsFailure()
    {
        // Act
        var result = CategoryEntity.ValidateUpdate("");

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Category name", result.Error!);
    }

    [Fact]
    public void ValidateUpdate_WithWhitespaceName_ReturnsFailure()
    {
        // Act
        var result = CategoryEntity.ValidateUpdate("   ");

        // Assert
        Assert.False(result.IsSuccess);
    }
}
