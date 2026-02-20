using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Domain;

public interface IVendorRepository
{
    Task<IReadOnlyList<UserVendor>> GetAllAsync(Guid userId);
    Task<IReadOnlyList<UserVendor>> GetVisibleAsync(Guid userId);
    Task EnsureExistsAsync(Guid userId, string? vendor);
    Task EnsureManyExistAsync(Guid userId, IEnumerable<string> vendors);
    Task<UserVendor?> SetHiddenAsync(Guid userId, Guid vendorId, bool isHidden);
}
