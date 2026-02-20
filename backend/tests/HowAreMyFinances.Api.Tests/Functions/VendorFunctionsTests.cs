using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Functions;
using HowAreMyFinances.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using NSubstitute;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Functions;

public class VendorFunctionsTests
{
    private readonly IVendorRepository _vendorRepository = Substitute.For<IVendorRepository>();
    private readonly Guid _userId = Guid.NewGuid();

    private HttpContext CreateContext()
    {
        var context = new DefaultHttpContext();
        context.Items["UserId"] = _userId;
        return context;
    }

    private static int GetStatusCode(IResult result)
    {
        var statusCodeResult = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
        return statusCodeResult.StatusCode!.Value;
    }

    [Fact]
    public async Task GetAll_ReturnsAllVendors()
    {
        // Arrange
        var vendors = new List<UserVendor>
        {
            new(Guid.NewGuid(), "Lidl", false),
            new(Guid.NewGuid(), "Maxima", true)
        };
        _vendorRepository.GetAllAsync(_userId).Returns(vendors);

        // Act
        var result = await VendorFunctions.GetAll(CreateContext(), _vendorRepository);

        // Assert
        var okResult = Assert.IsType<Ok<IReadOnlyList<UserVendor>>>(result);
        Assert.Equal(2, okResult.Value!.Count);
    }

    [Fact]
    public async Task GetVisible_ReturnsOnlyVisibleVendors()
    {
        // Arrange
        var vendors = new List<UserVendor>
        {
            new(Guid.NewGuid(), "Lidl", false)
        };
        _vendorRepository.GetVisibleAsync(_userId).Returns(vendors);

        // Act
        var result = await VendorFunctions.GetVisible(CreateContext(), _vendorRepository);

        // Assert
        var okResult = Assert.IsType<Ok<IReadOnlyList<UserVendor>>>(result);
        Assert.Single(okResult.Value!);
        Assert.False(okResult.Value![0].IsHidden);
    }

    [Fact]
    public async Task ToggleHidden_WhenExists_ReturnsUpdatedVendor()
    {
        // Arrange
        var vendorId = Guid.NewGuid();
        var request = new ToggleVendorRequest(true);
        var updated = new UserVendor(vendorId, "Lidl", true);
        _vendorRepository.SetHiddenAsync(_userId, vendorId, true).Returns(updated);

        // Act
        var result = await VendorFunctions.ToggleHidden(CreateContext(), vendorId, request, _vendorRepository);

        // Assert
        var okResult = Assert.IsType<Ok<UserVendor>>(result);
        Assert.True(okResult.Value!.IsHidden);
    }

    [Fact]
    public async Task ToggleHidden_WhenNotFound_ReturnsNotFound()
    {
        // Arrange
        var vendorId = Guid.NewGuid();
        var request = new ToggleVendorRequest(true);
        _vendorRepository.SetHiddenAsync(_userId, vendorId, true).Returns((UserVendor?)null);

        // Act
        var result = await VendorFunctions.ToggleHidden(CreateContext(), vendorId, request, _vendorRepository);

        // Assert
        Assert.Equal(404, GetStatusCode(result));
    }
}
