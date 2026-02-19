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
}
