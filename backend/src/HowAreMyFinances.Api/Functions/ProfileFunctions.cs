using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Middleware;
using HowAreMyFinances.Api.Models;

namespace HowAreMyFinances.Api.Functions;

public static class ProfileFunctions
{
    public static async Task<IResult> Get(HttpContext context, IProfileRepository profileRepository)
    {
        var userId = context.GetUserId();
        var profile = await profileRepository.GetAsync(userId);

        return profile is null
            ? Results.NotFound(new { error = "Profile not found" })
            : Results.Ok(profile);
    }

    public static async Task<IResult> Update(HttpContext context, UpdateProfileRequest request, IProfileRepository profileRepository)
    {
        if (request.PreferredLanguage is not null && request.PreferredLanguage is not ("en" or "lt"))
        {
            return Results.BadRequest(new { error = "Preferred language must be 'en' or 'lt'" });
        }

        var userId = context.GetUserId();
        var profile = await profileRepository.UpdateAsync(userId, request);

        return profile is null
            ? Results.NotFound(new { error = "Profile not found" })
            : Results.Ok(profile);
    }
}
