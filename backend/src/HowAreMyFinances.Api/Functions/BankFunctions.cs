using System.Security.Cryptography;
using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Middleware;
using HowAreMyFinances.Api.Models;
using Microsoft.Extensions.Options;

namespace HowAreMyFinances.Api.Functions;

public static class BankFunctions
{
    public static readonly TimeSpan StateLifetime = TimeSpan.FromMinutes(15);
    public const string NativeStatePrefix = "n.";
    public const int MaxNotificationsPerUpload = 50;
    public const int MaxNotificationTextLength = 1000;
    public const int MaxNotificationTitleLength = 200;
    public const int MaxExternalIdLength = 200;
    public const int MaxBulkIds = 200;

    private static IResult NotConfigured() =>
        Results.Json(new { error = "Bank integration is not configured" }, statusCode: StatusCodes.Status503ServiceUnavailable);

    private static IResult BankError(string? error) => error switch
    {
        EnableBankingErrors.RateLimited => Results.Json(
            new { error = "The bank's rate limit was reached; try again in a few hours" }, statusCode: StatusCodes.Status429TooManyRequests),
        EnableBankingErrors.Expired => Results.Json(
            new { error = "The bank rejected the request or the session has expired" }, statusCode: StatusCodes.Status502BadGateway),
        EnableBankingErrors.NotFound => Results.Json(
            new { error = "The bank provider could not find the requested resource" }, statusCode: StatusCodes.Status502BadGateway),
        _ => Results.Json(new { error = error ?? "Bank provider error" }, statusCode: StatusCodes.Status502BadGateway)
    };

    private static IResult ReviewError(string? error) => error switch
    {
        BankReviewErrors.NotFound => Results.NotFound(new { error = "Transaction not found" }),
        BankReviewErrors.NotPending => Results.Conflict(new { error = "Transaction has already been reviewed" }),
        BankReviewErrors.CategoryNotFound => Results.BadRequest(new { error = "Category not found" }),
        BankReviewErrors.ExpenseNotFound => Results.BadRequest(new { error = "Expense not found" }),
        _ => Results.BadRequest(new { error })
    };

    // ---------------------------------------------------------------------------------------------
    // Banks and connections
    // ---------------------------------------------------------------------------------------------

    public static async Task<IResult> GetAspsps(
        string? country,
        IOptions<EnableBankingSettings> settings,
        IEnableBankingClient client)
    {
        if (!settings.Value.IsConfigured)
            return NotConfigured();

        if (!IsCountryCode(country))
            return Results.BadRequest(new { error = "Country must be a two-letter country code" });

        var result = await client.GetAspspsAsync(country!.ToUpperInvariant());
        if (!result.IsSuccess)
            return BankError(result.Error);

        var aspsps = result.Value!
            .Select(a => new Aspsp(a.Name, a.Country, a.Logo, ToConsentDays(a.MaximumConsentValidity)))
            .OrderBy(a => a.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
        return Results.Ok(aspsps);
    }

    public static async Task<IResult> GetConnections(HttpContext context, IBankConnectionRepository connectionRepository)
    {
        var userId = context.GetUserId();
        var connections = await connectionRepository.GetAllAsync(userId);
        return Results.Ok(connections);
    }

    public static async Task<IResult> StartConnection(
        HttpContext context,
        StartBankConnectionRequest request,
        IOptions<EnableBankingSettings> settings,
        IEnableBankingClient client,
        IBankConnectionRepository connectionRepository,
        TimeProvider timeProvider)
    {
        var config = settings.Value;
        if (!config.IsConfigured)
            return NotConfigured();

        var aspspName = request.AspspName?.Trim();
        if (string.IsNullOrEmpty(aspspName) || aspspName.Length > 200)
            return Results.BadRequest(new { error = "Bank name is required" });
        if (!IsCountryCode(request.AspspCountry))
            return Results.BadRequest(new { error = "Country must be a two-letter country code" });
        var clientType = string.IsNullOrWhiteSpace(request.Client) ? "web" : request.Client.Trim();
        if (clientType is not ("web" or "native"))
            return Results.BadRequest(new { error = "Client must be 'web' or 'native'" });

        var country = request.AspspCountry!.Trim().ToUpperInvariant();

        var aspsps = await client.GetAspspsAsync(country);
        if (!aspsps.IsSuccess)
            return BankError(aspsps.Error);

        var aspsp = aspsps.Value!.FirstOrDefault(a => string.Equals(a.Name, aspspName, StringComparison.Ordinal));
        if (aspsp is null)
            return Results.BadRequest(new { error = "Bank not found" });

        var consentDays = Math.Max(1, config.ConsentDays);
        if (ToConsentDays(aspsp.MaximumConsentValidity) is { } maxDays)
            consentDays = Math.Min(consentDays, maxDays);
        var validUntil = timeProvider.GetUtcNow().AddDays(consentDays);

        var state = CreateState(clientType == "native");
        var connectionId = await connectionRepository.CreatePendingAsync(context.GetUserId(), aspsp.Name, country, clientType, state);

        var auth = await client.StartAuthAsync(aspsp.Name, country, state, validUntil, config.RedirectUrl);
        if (!auth.IsSuccess)
        {
            await connectionRepository.SetStatusAsync(context.GetUserId(), connectionId, BankConnectionStatuses.Failed, auth.Error);
            return BankError(auth.Error);
        }

        return Results.Ok(new StartBankConnectionResponse(auth.Value!.Url));
    }

    public static async Task<IResult> CompleteConnection(
        HttpContext context,
        CompleteBankConnectionRequest request,
        IOptions<EnableBankingSettings> settings,
        IEnableBankingClient client,
        IBankConnectionRepository connectionRepository,
        TimeProvider timeProvider)
    {
        if (!settings.Value.IsConfigured)
            return NotConfigured();

        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.State))
            return Results.BadRequest(new { error = "Code and state are required" });

        var userId = context.GetUserId();
        var connection = await connectionRepository.GetByStateAsync(userId, request.State.Trim());
        if (connection is null || connection.Status != BankConnectionStatuses.Pending)
            return Results.BadRequest(new { error = "Invalid or already used state" });

        if (connection.CreatedAt < timeProvider.GetUtcNow().UtcDateTime - StateLifetime)
        {
            await connectionRepository.SetStatusAsync(userId, connection.Id, BankConnectionStatuses.Failed, "Authorisation timed out");
            return Results.BadRequest(new { error = "The bank authorisation took too long; please connect again" });
        }

        var session = await client.CreateSessionAsync(request.Code.Trim());
        if (!session.IsSuccess)
        {
            await connectionRepository.SetStatusAsync(userId, connection.Id, BankConnectionStatuses.Failed, session.Error);
            return BankError(session.Error);
        }

        var accounts = (session.Value!.Accounts ?? [])
            .Where(a => !string.IsNullOrWhiteSpace(a.Uid))
            .Select(a => new NewBankAccount(
                ExternalUid: a.Uid!,
                IbanMasked: Iban.Mask(a.AccountId?.Iban),
                IbanHash: Iban.Hash(a.AccountId?.Iban),
                Name: string.IsNullOrWhiteSpace(a.Name) ? null : a.Name.Trim(),
                Currency: string.IsNullOrWhiteSpace(a.Currency) ? "EUR" : a.Currency.Trim().ToUpperInvariant()))
            .ToList();

        var completed = await connectionRepository.CompleteAsync(
            userId, connection.Id, session.Value.SessionId, session.Value.Access?.ValidUntil?.UtcDateTime, accounts);

        return completed is null
            ? Results.Conflict(new { error = "Connection has already been completed" })
            : Results.Ok(completed);
    }

    public static async Task<IResult> DeleteConnection(
        HttpContext context,
        Guid id,
        IOptions<EnableBankingSettings> settings,
        IEnableBankingClient client,
        IBankConnectionRepository connectionRepository)
    {
        if (!settings.Value.IsConfigured)
            return NotConfigured();

        var userId = context.GetUserId();
        var connection = await connectionRepository.GetByIdAsync(userId, id);
        if (connection is null)
            return Results.NotFound(new { error = "Connection not found" });

        if (connection.SessionId is not null && connection.Status != BankConnectionStatuses.Revoked)
        {
            var deleted = await client.DeleteSessionAsync(connection.SessionId);
            if (!deleted.IsSuccess && deleted.Error is not (EnableBankingErrors.NotFound or EnableBankingErrors.Expired))
                return BankError(deleted.Error);
        }

        await connectionRepository.SetStatusAsync(userId, id, BankConnectionStatuses.Revoked);
        return Results.NoContent();
    }

    public static async Task<IResult> UpdateAccount(
        HttpContext context,
        Guid id,
        UpdateBankAccountRequest request,
        IBankConnectionRepository connectionRepository)
    {
        var account = await connectionRepository.SetAccountEnabledAsync(context.GetUserId(), id, request.IsEnabled);
        return account is null
            ? Results.NotFound(new { error = "Account not found" })
            : Results.Ok(account);
    }

    // ---------------------------------------------------------------------------------------------
    // Sync and AI jobs
    // ---------------------------------------------------------------------------------------------

    public static async Task<IResult> Sync(
        HttpContext context,
        SyncRequest? request,
        IOptions<EnableBankingSettings> settings,
        IBankConnectionRepository connectionRepository,
        IBankSyncService syncService)
    {
        if (!settings.Value.IsConfigured)
            return NotConfigured();

        var userId = context.GetUserId();
        var connectionId = request?.ConnectionId;
        if (connectionId is not null && await connectionRepository.GetByIdAsync(userId, connectionId.Value) is null)
            return Results.NotFound(new { error = "Connection not found" });

        var result = await syncService.SyncAsync(userId, connectionId, GetPsuContext(context), context.RequestAborted);

        return result.JobId is { } jobId
            ? Results.Accepted($"/v1/bank/ai-jobs/{jobId}", result)
            : Results.Ok(result);
    }

    public static async Task<IResult> GetAiJob(HttpContext context, Guid jobId, IAiJobRepository aiJobRepository)
    {
        var status = await aiJobRepository.GetStatusAsync(context.GetUserId(), jobId);
        return status is null
            ? Results.NotFound(new { error = "Job not found" })
            : Results.Ok(status);
    }

    // ---------------------------------------------------------------------------------------------
    // Inbox
    // ---------------------------------------------------------------------------------------------

    public static async Task<IResult> GetTransactions(
        HttpContext context,
        IBankTransactionRepository transactionRepository,
        string? status = "pending")
    {
        if (!string.IsNullOrEmpty(status) && status != "pending")
            return Results.BadRequest(new { error = "Only status=pending is supported" });

        var transactions = await transactionRepository.GetPendingAsync(context.GetUserId());
        return Results.Ok(transactions);
    }

    public static async Task<IResult> GetPendingCount(HttpContext context, IBankTransactionRepository transactionRepository)
    {
        var count = await transactionRepository.GetPendingCountAsync(context.GetUserId());
        return Results.Ok(count);
    }

    public static async Task<IResult> Accept(
        HttpContext context,
        Guid id,
        AcceptBankTransactionRequest? request,
        IBankTransactionRepository transactionRepository)
    {
        var userId = context.GetUserId();
        var record = await transactionRepository.GetForReviewAsync(userId, id);
        if (record is null)
            return ReviewError(BankReviewErrors.NotFound);
        if (record.ReviewStatus != "pending" || record.ParseStatus != "parsed" || record.Amount is null || record.BookingDate is null)
            return ReviewError(BankReviewErrors.NotPending);

        request ??= new AcceptBankTransactionRequest(null, null, null, null, null, null);
        var date = request.Date ?? record.BookingDate.Value;
        AcceptBankTransactionCommand command;

        if (record.Direction == BankDirection.Debit)
        {
            if (request.CategoryId is null)
                return Results.BadRequest(new { error = "Category is required" });

            var validation = ExpenseEntity.Create(request.ItemName ?? "", record.Amount.Value, request.CategoryId.Value,
                request.Vendor, date, request.Comment);
            if (!validation.IsSuccess)
                return Results.BadRequest(new { error = validation.Error });

            command = new AcceptBankTransactionCommand(request.ItemName!.Trim(), request.CategoryId, request.Vendor,
                request.Comment, date, null);
        }
        else
        {
            var validation = IncomeEntity.Create(request.Source ?? "", record.Amount.Value, date, request.Comment);
            if (!validation.IsSuccess)
                return Results.BadRequest(new { error = validation.Error });

            command = new AcceptBankTransactionCommand(request.Source!.Trim(), null, null, request.Comment, date, request.Source.Trim());
        }

        var result = await transactionRepository.AcceptAsync(userId, id, command);
        return result.IsSuccess ? Results.Ok(result.Value) : ReviewError(result.Error);
    }

    public static async Task<IResult> Dismiss(HttpContext context, Guid id, IBankTransactionRepository transactionRepository)
    {
        var result = await transactionRepository.DismissAsync(context.GetUserId(), id);
        return result.IsSuccess ? Results.NoContent() : ReviewError(result.Error);
    }

    public static async Task<IResult> Link(
        HttpContext context,
        Guid id,
        LinkBankTransactionRequest request,
        IBankTransactionRepository transactionRepository)
    {
        if (request.ExpenseId == Guid.Empty)
            return Results.BadRequest(new { error = "Expense is required" });

        var result = await transactionRepository.LinkAsync(context.GetUserId(), id, request.ExpenseId);
        return result.IsSuccess ? Results.NoContent() : ReviewError(result.Error);
    }

    public static async Task<IResult> AcceptBulk(
        HttpContext context,
        AcceptBulkRequest request,
        IBankTransactionRepository transactionRepository)
    {
        var ids = (request.Ids ?? []).Distinct().ToList();
        if (ids.Count == 0)
            return Results.BadRequest(new { error = "At least one transaction is required" });
        if (ids.Count > MaxBulkIds)
            return Results.BadRequest(new { error = $"At most {MaxBulkIds} transactions can be accepted at once" });

        var userId = context.GetUserId();
        var accepted = 0;
        var skipped = 0;

        foreach (var id in ids)
        {
            var record = await transactionRepository.GetForReviewAsync(userId, id);
            var itemName = record is null ? null : BulkItemName(record);
            if (record is null
                || record.ReviewStatus != "pending" || record.ParseStatus != "parsed"
                || record.Direction != BankDirection.Debit
                || record.SuggestedCategoryId is null || record.BookingDate is null
                || itemName is null)
            {
                skipped++;
                continue;
            }

            var command = new AcceptBankTransactionCommand(itemName, record.SuggestedCategoryId, record.SuggestedVendor,
                null, record.BookingDate.Value, null);
            var result = await transactionRepository.AcceptAsync(userId, id, command);
            if (result.IsSuccess) accepted++;
            else skipped++;
        }

        return Results.Ok(new AcceptBulkResponse(accepted, skipped));
    }

    /// <summary>Item name for bulk accept: the suggested vendor, else the counterparty, else the description.</summary>
    public static string? BulkItemName(BankTransactionRecord record)
    {
        var name = new[] { record.SuggestedVendor, record.CounterpartyName, record.Description }
            .FirstOrDefault(n => !string.IsNullOrWhiteSpace(n))?.Trim();
        return name is { Length: > 200 } ? name[..200] : name;
    }

    // ---------------------------------------------------------------------------------------------
    // Android notifications
    // ---------------------------------------------------------------------------------------------

    public static async Task<IResult> UploadNotifications(
        HttpContext context,
        UploadBankNotificationsRequest request,
        IBankTransactionRepository transactionRepository,
        ICategoryRepository categoryRepository,
        IAiJobDispatcher aiJobDispatcher)
    {
        var notifications = request.Notifications ?? [];
        var validation = ValidateNotifications(notifications);
        if (validation is not null)
            return Results.BadRequest(new { error = validation });

        var userId = context.GetUserId();

        var rows = notifications
            .GroupBy(n => n.ExternalId!.Trim(), StringComparer.Ordinal)
            .Select(g => g.First())
            .Select(n => new NewBankNotification(
                ExternalId: n.ExternalId!.Trim(),
                PostedAt: n.PostedAt!.Value,
                Title: string.IsNullOrWhiteSpace(n.Title)
                    ? null
                    : n.Title.Trim() is { Length: > MaxNotificationTitleLength } t ? t[..MaxNotificationTitleLength] : n.Title.Trim(),
                Text: n.Text!.Trim()))
            .ToList();

        var inserted = await transactionRepository.InsertNotificationsAsync(userId, rows);

        // Also retry older rows whose parse job failed as a whole (they stay parse_status 'pending').
        var insertedIds = inserted.Select(i => i.Id).ToList();
        var stale = await transactionRepository.GetStalePendingNotificationsAsync(
            userId, insertedIds, MaxNotificationsPerUpload - inserted.Count);

        if (inserted.Count == 0 && stale.Count == 0)
            return Results.Ok(new UploadBankNotificationsResponse(0, null));

        var byExternalId = rows.ToDictionary(r => r.ExternalId, StringComparer.Ordinal);
        var jobNotifications = inserted
            .Select(i =>
            {
                var row = byExternalId[i.ExternalId];
                return new ParseNotificationsJobNotification(i.Id, row.PostedAt, row.Title, row.Text);
            })
            .Concat(stale.Select(s => new ParseNotificationsJobNotification(s.Id, s.PostedAt, s.Title, s.Text)))
            .Take(MaxNotificationsPerUpload)
            .ToList();

        var categories = (await categoryRepository.GetAllAsync(userId))
            .Where(c => !c.IsArchived)
            .Select(c => new AiJobCategory(c.Id, c.Name))
            .ToList();

        var jobId = await aiJobDispatcher.DispatchAsync(userId, AiJobTypes.ParseBankNotifications,
            new ParseNotificationsJobRequest(categories, jobNotifications));

        var response = new UploadBankNotificationsResponse(inserted.Count, jobId);
        return jobId is { } id
            ? Results.Accepted($"/v1/bank/ai-jobs/{id}", response)
            : Results.Ok(response);
    }

    /// <summary>Returns an error message, or null when the upload is valid.</summary>
    public static string? ValidateNotifications(IReadOnlyList<BankNotificationInput> notifications)
    {
        if (notifications.Count > MaxNotificationsPerUpload)
            return $"At most {MaxNotificationsPerUpload} notifications can be uploaded at once";

        foreach (var notification in notifications)
        {
            if (string.IsNullOrWhiteSpace(notification.ExternalId))
                return "Notification externalId is required";
            if (notification.ExternalId.Trim().Length > MaxExternalIdLength)
                return $"Notification externalId must be at most {MaxExternalIdLength} characters";
            if (notification.PostedAt is null)
                return "Notification postedAt is required";
            if (string.IsNullOrWhiteSpace(notification.Text))
                return "Notification text is required";
            if (notification.Text.Trim().Length > MaxNotificationTextLength)
                return $"Notification text must be at most {MaxNotificationTextLength} characters";
        }

        return null;
    }

    // ---------------------------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------------------------

    /// <summary>
    /// The user's IP (first hop of X-Forwarded-For, as set by API Gateway) and user agent, forwarded
    /// to the bank as PSU headers.
    /// </summary>
    public static PsuContext GetPsuContext(HttpContext context)
    {
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].ToString();
        var ip = forwardedFor.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()
            ?? context.Connection.RemoteIpAddress?.ToString();
        var userAgent = context.Request.Headers.UserAgent.ToString();

        return new PsuContext(
            string.IsNullOrWhiteSpace(ip) ? null : ip,
            string.IsNullOrWhiteSpace(userAgent) ? null : userAgent);
    }

    /// <summary>Random 32-byte base64url state; prefixed "n." for the native app's bounce.</summary>
    public static string CreateState(bool native)
    {
        var state = Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        return native ? NativeStatePrefix + state : state;
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static int? ToConsentDays(long? seconds) =>
        seconds is > 0 ? (int)Math.Max(1, seconds.Value / 86400) : null;

    private static bool IsCountryCode(string? country) =>
        country is not null && country.Trim().Length == 2 && country.Trim().All(char.IsAsciiLetter);
}
