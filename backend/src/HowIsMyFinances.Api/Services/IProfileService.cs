using HowIsMyFinances.Api.Models;

namespace HowIsMyFinances.Api.Services;

public interface IProfileService
{
    Task<Profile?> GetAsync(Guid userId);
    Task<Profile?> UpdateAsync(Guid userId, UpdateProfileRequest request);
}
