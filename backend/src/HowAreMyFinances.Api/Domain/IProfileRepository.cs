using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Domain;

public interface IProfileRepository
{
    Task<Profile?> GetAsync(Guid userId);
    Task<Profile?> UpdateAsync(Guid userId, UpdateProfileRequest request);
}
