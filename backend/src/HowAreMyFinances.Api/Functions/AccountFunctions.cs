using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Middleware;
using Microsoft.Extensions.Options;

namespace HowAreMyFinances.Api.Functions;

public static class AccountFunctions
{
    /// <summary>
    /// DELETE /v1/account — permanently deletes the caller's account: revokes bank consents upstream
    /// (best effort), deletes all their data, then the sign-in user. Safe to retry: a second call after
    /// a partial failure finds no data and removes whatever is left.
    /// </summary>
    public static async Task<IResult> Delete(
        HttpContext context,
        IOptions<EnableBankingSettings> enableBankingSettings,
        IEnableBankingClient enableBankingClient,
        IBankConnectionRepository connectionRepository,
        IAccountRepository accountRepository,
        IAuthAdminClient authAdminClient,
        ILoggerFactory loggerFactory)
    {
        var userId = context.GetUserId();
        var logger = loggerFactory.CreateLogger(nameof(AccountFunctions));

        if (enableBankingSettings.Value.IsConfigured)
        {
            var connections = await connectionRepository.GetActiveAsync(userId, null);
            foreach (var connection in connections)
            {
                if (connection.SessionId is null) continue;
                var revoked = await enableBankingClient.DeleteSessionAsync(connection.SessionId);
                if (!revoked.IsSuccess)
                    logger.LogWarning("Could not revoke bank session for connection {ConnectionId}: {Error}",
                        connection.Id, revoked.Error);
            }
        }

        await accountRepository.DeleteAllDataAsync(userId);

        var deleted = await authAdminClient.DeleteUserAsync(userId);
        if (!deleted.IsSuccess)
            return Results.Json(new { error = "Your data was deleted, but the account could not be removed. Please try again." },
                statusCode: StatusCodes.Status502BadGateway);

        return Results.NoContent();
    }
}
