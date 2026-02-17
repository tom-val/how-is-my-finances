using HowIsMyFinances.Api.Middleware;
using HowIsMyFinances.Api.Models;
using HowIsMyFinances.Api.Services;

namespace HowIsMyFinances.Api.Functions;

public static class ProfileFunctions
{
    public static async Task<IResult> Get(HttpContext context, IProfileService profileService)
    {
        var userId = context.GetUserId();
        var profile = await profileService.GetAsync(userId);

        return profile is null
            ? Results.NotFound(new { error = "Profile not found" })
            : Results.Ok(profile);
    }

    public static async Task<IResult> Update(HttpContext context, UpdateProfileRequest request, IProfileService profileService)
    {
        if (request.PreferredLanguage is not null && request.PreferredLanguage is not ("en" or "lt"))
        {
            return Results.BadRequest(new { error = "Preferred language must be 'en' or 'lt'" });
        }

        var userId = context.GetUserId();
        var profile = await profileService.UpdateAsync(userId, request);

        return profile is null
            ? Results.NotFound(new { error = "Profile not found" })
            : Results.Ok(profile);
    }
}
