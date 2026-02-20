using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Middleware;
using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Functions;

public static class VendorFunctions
{
    public static async Task<IResult> GetAll(HttpContext context, IVendorRepository vendorRepository)
    {
        var userId = context.GetUserId();
        var vendors = await vendorRepository.GetAllAsync(userId);
        return Results.Ok(vendors);
    }

    public static async Task<IResult> GetVisible(HttpContext context, IVendorRepository vendorRepository)
    {
        var userId = context.GetUserId();
        var vendors = await vendorRepository.GetVisibleAsync(userId);
        return Results.Ok(vendors);
    }

    public static async Task<IResult> ToggleHidden(
        HttpContext context,
        Guid id,
        ToggleVendorRequest request,
        IVendorRepository vendorRepository)
    {
        var userId = context.GetUserId();
        var vendor = await vendorRepository.SetHiddenAsync(userId, id, request.IsHidden);

        return vendor is null
            ? Results.NotFound(new { error = "Vendor not found" })
            : Results.Ok(vendor);
    }
}
