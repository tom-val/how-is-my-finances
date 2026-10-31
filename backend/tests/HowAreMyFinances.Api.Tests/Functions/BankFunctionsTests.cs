using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Functions;
using HowAreMyFinances.Api.Infrastructure.EnableBanking;
using HowAreMyFinances.Api.Models;
using HowAreMyFinances.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Options;
using NSubstitute;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Functions;

public class BankFunctionsTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 31, 12, 0, 0, TimeSpan.Zero);

    private readonly IEnableBankingClient _client = Substitute.For<IEnableBankingClient>();
    private readonly IBankConnectionRepository _connectionRepository = Substitute.For<IBankConnectionRepository>();
    private readonly IBankTransactionRepository _transactionRepository = Substitute.For<IBankTransactionRepository>();
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly IAiJobDispatcher _aiJobDispatcher = Substitute.For<IAiJobDispatcher>();
    private readonly IBankSyncService _syncService = Substitute.For<IBankSyncService>();
    private readonly TestTimeProvider _time = new(Now);
    private readonly Guid _userId = Guid.NewGuid();

    private static readonly IOptions<EnableBankingSettings> Configured = Options.Create(new EnableBankingSettings
    {
        ApplicationId = "app-id",
        PrivateKeyBase64 = "a2V5",
        ConsentDays = 180
    });

    private static readonly IOptions<EnableBankingSettings> NotConfigured = Options.Create(new EnableBankingSettings());

    public BankFunctionsTests()
    {
        _categoryRepository.GetAllAsync(Arg.Any<Guid>()).Returns(new List<Category>());
        _transactionRepository.GetStalePendingNotificationsAsync(Arg.Any<Guid>(), Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<int>())
            .Returns(new List<PendingBankNotification>());
    }

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

    private BankConnectionRecord PendingConnection(string state, DateTimeOffset createdAt, string status = "pending") =>
        new(Guid.NewGuid(), _userId, "Swedbank", "LT", "web", status, null, null, null, createdAt.UtcDateTime);

    private static BankTransactionRecord Record(
        string reviewStatus = "pending", string direction = BankDirection.Debit, Guid? suggestedCategoryId = null,
        string? suggestedVendor = null, string? counterpartyName = "MAXIMA LT X123") =>
        new(Guid.NewGuid(), "enable_banking", "parsed", reviewStatus, direction, 12.50m, new DateOnly(2026, 10, 28),
            counterpartyName, CounterpartyKey.Normalise(counterpartyName), null, suggestedCategoryId, suggestedVendor,
            suggestedCategoryId is null ? null : "ai");

    // --- Not configured ----------------------------------------------------------------------

    [Fact]
    public async Task GetAspsps_WhenNotConfigured_Returns503()
    {
        // Act
        var result = await BankFunctions.GetAspsps("LT", NotConfigured, _client);

        // Assert
        Assert.Equal(503, GetStatusCode(result));
        await _client.DidNotReceiveWithAnyArgs().GetAspspsAsync(default!);
    }

    [Fact]
    public async Task StartConnection_WhenNotConfigured_Returns503()
    {
        // Act
        var result = await BankFunctions.StartConnection(CreateContext(),
            new StartBankConnectionRequest("Swedbank", "LT", "web"), NotConfigured, _client, _connectionRepository, _time);

        // Assert
        Assert.Equal(503, GetStatusCode(result));
    }

    [Fact]
    public async Task Sync_WhenNotConfigured_Returns503()
    {
        // Act
        var result = await BankFunctions.Sync(CreateContext(), null, NotConfigured, _connectionRepository, _syncService);

        // Assert
        Assert.Equal(503, GetStatusCode(result));
        await _syncService.DidNotReceiveWithAnyArgs().SyncAsync(default, default, default!);
    }

    // --- Aspsps / start ------------------------------------------------------------------------

    [Fact]
    public async Task GetAspsps_ConvertsConsentSecondsToDays()
    {
        // Arrange
        _client.GetAspspsAsync("LT").Returns(Result<IReadOnlyList<EbAspsp>>.Success(
            [new EbAspsp("Swedbank", "LT", "https://logo", 15552000, ["personal"])]));

        // Act
        var result = await BankFunctions.GetAspsps("lt", Configured, _client);

        // Assert
        var ok = Assert.IsType<Ok<List<Aspsp>>>(result);
        var aspsp = Assert.Single(ok.Value!);
        Assert.Equal(180, aspsp.MaximumConsentDays);
    }

    [Fact]
    public async Task StartConnection_Native_PrefixesStateAndCapsConsent()
    {
        // Arrange
        _client.GetAspspsAsync("LT").Returns(Result<IReadOnlyList<EbAspsp>>.Success(
            [new EbAspsp("Swedbank", "LT", null, 90L * 86400, null)]));
        _client.StartAuthAsync(default!, default!, default!, default, default!)
            .ReturnsForAnyArgs(Result<EbStartAuthResponse>.Success(new EbStartAuthResponse("https://bank/auth", "a1")));

        // Act
        var result = await BankFunctions.StartConnection(CreateContext(),
            new StartBankConnectionRequest("Swedbank", "LT", "native"), Configured, _client, _connectionRepository, _time);

        // Assert
        var ok = Assert.IsType<Ok<StartBankConnectionResponse>>(result);
        Assert.Equal("https://bank/auth", ok.Value!.RedirectUrl);
        await _connectionRepository.Received(1).CreatePendingAsync(_userId, "Swedbank", "LT", "native",
            Arg.Is<string>(s => s.StartsWith("n.") && s.Length > 40));
        await _client.Received(1).StartAuthAsync("Swedbank", "LT", Arg.Is<string>(s => s.StartsWith("n.")),
            Now.AddDays(90), "https://finances.valiunas.dev/bank/callback", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task StartConnection_UnknownBank_Returns400()
    {
        // Arrange
        _client.GetAspspsAsync("LT").Returns(Result<IReadOnlyList<EbAspsp>>.Success([]));

        // Act
        var result = await BankFunctions.StartConnection(CreateContext(),
            new StartBankConnectionRequest("Nope", "LT", "web"), Configured, _client, _connectionRepository, _time);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Theory]
    [InlineData(null, "LT", "web")]
    [InlineData("Swedbank", "LTU", "web")]
    [InlineData("Swedbank", "LT", "desktop")]
    public async Task StartConnection_InvalidRequest_Returns400(string? name, string? country, string? client)
    {
        // Act
        var result = await BankFunctions.StartConnection(CreateContext(),
            new StartBankConnectionRequest(name, country, client), Configured, _client, _connectionRepository, _time);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public void CreateState_IsRandomBase64Url()
    {
        // Act
        var first = BankFunctions.CreateState(native: false);
        var second = BankFunctions.CreateState(native: false);

        // Assert
        Assert.NotEqual(first, second);
        Assert.Equal(43, first.Length); // 32 bytes, base64url without padding
        Assert.DoesNotContain('+', first);
        Assert.DoesNotContain('/', first);
        Assert.DoesNotContain('=', first);
    }

    // --- Complete ------------------------------------------------------------------------------

    [Fact]
    public async Task CompleteConnection_StateNotFound_Returns400()
    {
        // Arrange — the state belongs to another user (or doesn't exist): the lookup is scoped to the caller
        _connectionRepository.GetByStateAsync(_userId, "someone-elses").Returns((BankConnectionRecord?)null);

        // Act
        var result = await BankFunctions.CompleteConnection(CreateContext(),
            new CompleteBankConnectionRequest("code", "someone-elses"), Configured, _client, _connectionRepository, _time);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
        await _client.DidNotReceiveWithAnyArgs().CreateSessionAsync(default!);
    }

    [Fact]
    public async Task CompleteConnection_AlreadyUsedState_Returns400()
    {
        // Arrange
        _connectionRepository.GetByStateAsync(_userId, "s").Returns(PendingConnection("s", Now, status: "active"));

        // Act
        var result = await BankFunctions.CompleteConnection(CreateContext(),
            new CompleteBankConnectionRequest("code", "s"), Configured, _client, _connectionRepository, _time);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task CompleteConnection_StateOlderThan15Minutes_Returns400AndMarksFailed()
    {
        // Arrange
        var connection = PendingConnection("s", Now.AddMinutes(-16));
        _connectionRepository.GetByStateAsync(_userId, "s").Returns(connection);

        // Act
        var result = await BankFunctions.CompleteConnection(CreateContext(),
            new CompleteBankConnectionRequest("code", "s"), Configured, _client, _connectionRepository, _time);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
        await _connectionRepository.Received(1).SetStatusAsync(_userId, connection.Id, "failed", Arg.Any<string?>());
        await _client.DidNotReceiveWithAnyArgs().CreateSessionAsync(default!);
    }

    [Fact]
    public async Task CompleteConnection_Valid_StoresMaskedAccounts()
    {
        // Arrange
        var connection = PendingConnection("s", Now.AddMinutes(-2));
        _connectionRepository.GetByStateAsync(_userId, "s").Returns(connection);
        var validUntil = Now.AddDays(180);
        _client.CreateSessionAsync("code").Returns(Result<EbSessionResponse>.Success(new EbSessionResponse(
            "session-1",
            [new EbSessionAccount("uid-1", new EbAccountId("LT12 1000 0111 0100 1000"), "Main", "EUR"),
             new EbSessionAccount(null, null, "No uid", "EUR")],
            new EbAccess(validUntil))));
        var completed = new BankConnection(connection.Id, "Swedbank", "LT", "active", validUntil.UtcDateTime, null, null, []);
        _connectionRepository.CompleteAsync(_userId, connection.Id, "session-1", validUntil.UtcDateTime,
            Arg.Any<IReadOnlyList<NewBankAccount>>()).Returns(completed);

        // Act
        var result = await BankFunctions.CompleteConnection(CreateContext(),
            new CompleteBankConnectionRequest("code", "s"), Configured, _client, _connectionRepository, _time);

        // Assert
        Assert.IsType<Ok<BankConnection>>(result);
        await _connectionRepository.Received(1).CompleteAsync(_userId, connection.Id, "session-1", validUntil.UtcDateTime,
            Arg.Is<IReadOnlyList<NewBankAccount>>(a =>
                a.Count == 1 && a[0].ExternalUid == "uid-1" && a[0].IbanMasked == "LT** **** **** **** 1000"
                && a[0].IbanHash == Iban.Hash("LT121000011101001000")));
    }

    // --- Disconnect ----------------------------------------------------------------------------

    [Fact]
    public async Task DeleteConnection_UpstreamNotFound_StillRevokes()
    {
        // Arrange
        var connection = PendingConnection("s", Now, status: "active") with { SessionId = "session-1" };
        _connectionRepository.GetByIdAsync(_userId, connection.Id).Returns(connection);
        _client.DeleteSessionAsync("session-1").Returns(Result<bool>.Failure(EnableBankingErrors.NotFound));

        // Act
        var result = await BankFunctions.DeleteConnection(CreateContext(), connection.Id, Configured, _client, _connectionRepository);

        // Assert
        Assert.IsType<NoContent>(result);
        await _connectionRepository.Received(1).SetStatusAsync(_userId, connection.Id, "revoked", null);
    }

    // --- Sync ----------------------------------------------------------------------------------

    [Fact]
    public async Task Sync_WithJob_Returns202()
    {
        // Arrange
        var jobId = Guid.NewGuid();
        _syncService.SyncAsync(_userId, null, Arg.Any<PsuContext>(), Arg.Any<CancellationToken>())
            .Returns(new SyncResult(3, 0, 1, jobId, false, 0, 0, false));

        // Act
        var result = await BankFunctions.Sync(CreateContext(), null, Configured, _connectionRepository, _syncService);

        // Assert
        Assert.Equal(202, GetStatusCode(result));
    }

    [Fact]
    public async Task Sync_WithoutJob_Returns200()
    {
        // Arrange
        _syncService.SyncAsync(_userId, null, Arg.Any<PsuContext>(), Arg.Any<CancellationToken>())
            .Returns(new SyncResult(0, 0, 0, null, true, 0, 0, false));

        // Act
        var result = await BankFunctions.Sync(CreateContext(), null, Configured, _connectionRepository, _syncService);

        // Assert
        var ok = Assert.IsType<Ok<SyncResult>>(result);
        Assert.True(ok.Value!.Cooldown);
    }

    [Fact]
    public void GetPsuContext_UsesFirstForwardedForHop()
    {
        // Arrange
        var context = new DefaultHttpContext();
        context.Request.Headers["X-Forwarded-For"] = "203.0.113.7, 10.0.0.1";
        context.Request.Headers.UserAgent = "Finansai/1.0";

        // Act
        var psu = BankFunctions.GetPsuContext(context);

        // Assert
        Assert.Equal("203.0.113.7", psu.IpAddress);
        Assert.Equal("Finansai/1.0", psu.UserAgent);
    }

    // --- Review --------------------------------------------------------------------------------

    [Fact]
    public async Task Accept_NonPendingTransaction_Returns409()
    {
        // Arrange
        var record = Record(reviewStatus: "accepted");
        _transactionRepository.GetForReviewAsync(_userId, record.Id).Returns(record);

        // Act
        var result = await BankFunctions.Accept(CreateContext(), record.Id,
            new AcceptBankTransactionRequest("Groceries", Guid.NewGuid(), null, null, null, null), _transactionRepository);

        // Assert
        Assert.Equal(409, GetStatusCode(result));
        await _transactionRepository.DidNotReceiveWithAnyArgs().AcceptAsync(default, default, default!);
    }

    [Fact]
    public async Task Accept_NotFound_Returns404()
    {
        // Arrange
        var id = Guid.NewGuid();
        _transactionRepository.GetForReviewAsync(_userId, id).Returns((BankTransactionRecord?)null);

        // Act
        var result = await BankFunctions.Accept(CreateContext(), id,
            new AcceptBankTransactionRequest("Groceries", Guid.NewGuid(), null, null, null, null), _transactionRepository);

        // Assert
        Assert.Equal(404, GetStatusCode(result));
    }

    [Fact]
    public async Task Accept_RaceToNonPending_Returns409()
    {
        // Arrange — pending when read, reviewed by another request before the transaction locked it
        var record = Record();
        _transactionRepository.GetForReviewAsync(_userId, record.Id).Returns(record);
        _transactionRepository.AcceptAsync(_userId, record.Id, Arg.Any<AcceptBankTransactionCommand>())
            .Returns(Result<AcceptBankTransactionResponse>.Failure(BankReviewErrors.NotPending));

        // Act
        var result = await BankFunctions.Accept(CreateContext(), record.Id,
            new AcceptBankTransactionRequest("Groceries", Guid.NewGuid(), null, null, null, null), _transactionRepository);

        // Assert
        Assert.Equal(409, GetStatusCode(result));
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData("", true)]
    [InlineData("Groceries", false)]
    public async Task Accept_Debit_RequiresItemNameAndCategory(string? itemName, bool withCategory)
    {
        // Arrange
        var record = Record();
        _transactionRepository.GetForReviewAsync(_userId, record.Id).Returns(record);

        // Act
        var result = await BankFunctions.Accept(CreateContext(), record.Id,
            new AcceptBankTransactionRequest(itemName, withCategory ? Guid.NewGuid() : null, null, null, null, null),
            _transactionRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Accept_Debit_DefaultsDateToBookingDate()
    {
        // Arrange
        var record = Record();
        var categoryId = Guid.NewGuid();
        _transactionRepository.GetForReviewAsync(_userId, record.Id).Returns(record);
        var response = new AcceptBankTransactionResponse(Guid.NewGuid(), null, Guid.NewGuid());
        _transactionRepository.AcceptAsync(_userId, record.Id, Arg.Any<AcceptBankTransactionCommand>())
            .Returns(Result<AcceptBankTransactionResponse>.Success(response));

        // Act
        var result = await BankFunctions.Accept(CreateContext(), record.Id,
            new AcceptBankTransactionRequest(" Groceries ", categoryId, "Maxima", null, null, null), _transactionRepository);

        // Assert
        var ok = Assert.IsType<Ok<AcceptBankTransactionResponse>>(result);
        Assert.Equal(response.ExpenseId, ok.Value!.ExpenseId);
        await _transactionRepository.Received(1).AcceptAsync(_userId, record.Id,
            Arg.Is<AcceptBankTransactionCommand>(c =>
                c.ItemName == "Groceries" && c.CategoryId == categoryId && c.Date == new DateOnly(2026, 10, 28)));
    }

    [Fact]
    public async Task Accept_Credit_RequiresSource()
    {
        // Arrange
        var record = Record(direction: BankDirection.Credit);
        _transactionRepository.GetForReviewAsync(_userId, record.Id).Returns(record);

        // Act
        var result = await BankFunctions.Accept(CreateContext(), record.Id,
            new AcceptBankTransactionRequest(null, null, null, null, null, null), _transactionRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Dismiss_NonPending_Returns409()
    {
        // Arrange
        var id = Guid.NewGuid();
        _transactionRepository.DismissAsync(_userId, id).Returns(Result<bool>.Failure(BankReviewErrors.NotPending));

        // Act
        var result = await BankFunctions.Dismiss(CreateContext(), id, _transactionRepository);

        // Assert
        Assert.Equal(409, GetStatusCode(result));
    }

    [Fact]
    public async Task Dismiss_Pending_Returns204()
    {
        // Arrange
        var id = Guid.NewGuid();
        _transactionRepository.DismissAsync(_userId, id).Returns(Result<bool>.Success(true));

        // Act
        var result = await BankFunctions.Dismiss(CreateContext(), id, _transactionRepository);

        // Assert
        Assert.IsType<NoContent>(result);
    }

    [Fact]
    public async Task Link_ExpenseOfAnotherUser_Returns400()
    {
        // Arrange
        var id = Guid.NewGuid();
        var expenseId = Guid.NewGuid();
        _transactionRepository.LinkAsync(_userId, id, expenseId).Returns(Result<bool>.Failure(BankReviewErrors.ExpenseNotFound));

        // Act
        var result = await BankFunctions.Link(CreateContext(), id, new LinkBankTransactionRequest(expenseId), _transactionRepository);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Fact]
    public async Task Link_NonPending_Returns409()
    {
        // Arrange
        var id = Guid.NewGuid();
        var expenseId = Guid.NewGuid();
        _transactionRepository.LinkAsync(_userId, id, expenseId).Returns(Result<bool>.Failure(BankReviewErrors.NotPending));

        // Act
        var result = await BankFunctions.Link(CreateContext(), id, new LinkBankTransactionRequest(expenseId), _transactionRepository);

        // Assert
        Assert.Equal(409, GetStatusCode(result));
    }

    [Fact]
    public async Task AcceptBulk_AcceptsOnlyRowsWithSuggestedCategory()
    {
        // Arrange
        var categoryId = Guid.NewGuid();
        var withSuggestion = Record(suggestedCategoryId: categoryId, suggestedVendor: "Maxima");
        var withoutSuggestion = Record();
        var credit = Record(direction: BankDirection.Credit, suggestedCategoryId: categoryId);
        _transactionRepository.GetForReviewAsync(_userId, withSuggestion.Id).Returns(withSuggestion);
        _transactionRepository.GetForReviewAsync(_userId, withoutSuggestion.Id).Returns(withoutSuggestion);
        _transactionRepository.GetForReviewAsync(_userId, credit.Id).Returns(credit);
        _transactionRepository.AcceptAsync(_userId, withSuggestion.Id, Arg.Any<AcceptBankTransactionCommand>())
            .Returns(Result<AcceptBankTransactionResponse>.Success(new AcceptBankTransactionResponse(Guid.NewGuid(), null, Guid.NewGuid())));

        // Act
        var result = await BankFunctions.AcceptBulk(CreateContext(),
            new AcceptBulkRequest([withSuggestion.Id, withoutSuggestion.Id, credit.Id]), _transactionRepository);

        // Assert
        var ok = Assert.IsType<Ok<AcceptBulkResponse>>(result);
        Assert.Equal(1, ok.Value!.Accepted);
        Assert.Equal(2, ok.Value.Skipped);
        await _transactionRepository.Received(1).AcceptAsync(_userId, withSuggestion.Id,
            Arg.Is<AcceptBankTransactionCommand>(c => c.ItemName == "Maxima" && c.CategoryId == categoryId && c.Vendor == "Maxima"));
    }

    [Fact]
    public void BulkItemName_FallsBackToCounterparty()
    {
        // Act & Assert
        Assert.Equal("MAXIMA LT X123", BankFunctions.BulkItemName(Record(suggestedVendor: null)));
        Assert.Equal("Maxima", BankFunctions.BulkItemName(Record(suggestedVendor: "Maxima")));
    }

    // --- Notifications -------------------------------------------------------------------------

    private static BankNotificationInput Notification(string? externalId = "n-1", string? text = "Mokėjimas kortele 12,50 EUR MAXIMA",
        DateTimeOffset? postedAt = null) =>
        new(externalId, postedAt ?? Now, "Swedbank", text);

    [Fact]
    public async Task UploadNotifications_MoreThan50_Returns400()
    {
        // Arrange
        var notifications = Enumerable.Range(0, 51).Select(i => Notification($"n-{i}")).ToList();

        // Act
        var result = await BankFunctions.UploadNotifications(CreateContext(),
            new UploadBankNotificationsRequest(notifications), _transactionRepository, _categoryRepository, _aiJobDispatcher);

        // Assert
        Assert.Equal(400, GetStatusCode(result));
    }

    [Theory]
    [InlineData("n-1", "")]
    [InlineData("n-1", null)]
    [InlineData("", "text")]
    [InlineData(null, "text")]
    public void ValidateNotifications_RejectsMissingFields(string? externalId, string? text)
    {
        // Act
        var error = BankFunctions.ValidateNotifications([Notification(externalId, text)]);

        // Assert
        Assert.NotNull(error);
    }

    [Fact]
    public void ValidateNotifications_RejectsOverlongTextAndId()
    {
        // Act & Assert
        Assert.NotNull(BankFunctions.ValidateNotifications([Notification(text: new string('a', 1001))]));
        Assert.NotNull(BankFunctions.ValidateNotifications([Notification(externalId: new string('a', 201))]));
        Assert.NotNull(BankFunctions.ValidateNotifications([new BankNotificationInput("n", null, null, "text")]));
        Assert.Null(BankFunctions.ValidateNotifications([Notification(text: new string('a', 1000))]));
    }

    [Fact]
    public async Task UploadNotifications_NewRows_CreatesParseJobAndReturns202()
    {
        // Arrange
        var rowId = Guid.NewGuid();
        var jobId = Guid.NewGuid();
        _transactionRepository.InsertNotificationsAsync(_userId, Arg.Any<IReadOnlyList<NewBankNotification>>())
            .Returns(new List<InsertedBankNotification> { new(rowId, "n-1") });
        _categoryRepository.GetAllAsync(_userId).Returns(new List<Category>
        {
            new(Guid.NewGuid(), _userId, "Groceries", null, 0, false, DateTime.UtcNow),
            new(Guid.NewGuid(), _userId, "Old", null, 1, true, DateTime.UtcNow)
        });
        _aiJobDispatcher.DispatchAsync(_userId, AiJobTypes.ParseBankNotifications, Arg.Any<object>()).Returns(jobId);

        // Act
        var result = await BankFunctions.UploadNotifications(CreateContext(),
            new UploadBankNotificationsRequest([Notification(), Notification()]), _transactionRepository, _categoryRepository, _aiJobDispatcher);

        // Assert
        Assert.Equal(202, GetStatusCode(result));
        await _transactionRepository.Received(1).InsertNotificationsAsync(_userId,
            Arg.Is<IReadOnlyList<NewBankNotification>>(n => n.Count == 1)); // duplicate ids in one upload collapse
        await _aiJobDispatcher.Received(1).DispatchAsync(_userId, AiJobTypes.ParseBankNotifications,
            Arg.Is<ParseNotificationsJobRequest>(r =>
                                r.Categories.Count == 1 && r.Categories[0].Name == "Groceries"
                                && r.Notifications.Count == 1 && r.Notifications[0].Id == rowId));
    }

    [Fact]
    public async Task UploadNotifications_NothingNew_Returns200WithoutJob()
    {
        // Arrange
        _transactionRepository.InsertNotificationsAsync(_userId, Arg.Any<IReadOnlyList<NewBankNotification>>())
            .Returns(new List<InsertedBankNotification>());

        // Act
        var result = await BankFunctions.UploadNotifications(CreateContext(),
            new UploadBankNotificationsRequest([Notification()]), _transactionRepository, _categoryRepository, _aiJobDispatcher);

        // Assert
        var ok = Assert.IsType<Ok<UploadBankNotificationsResponse>>(result);
        Assert.Equal(0, ok.Value!.Received);
        Assert.Null(ok.Value.JobId);
        await _aiJobDispatcher.DidNotReceiveWithAnyArgs().DispatchAsync(default, default!, default!);
    }

    [Fact]
    public async Task UploadNotifications_NothingNewButStaleRows_RetriesThem()
    {
        // Arrange
        var staleId = Guid.NewGuid();
        _transactionRepository.InsertNotificationsAsync(_userId, Arg.Any<IReadOnlyList<NewBankNotification>>())
            .Returns(new List<InsertedBankNotification>());
        _transactionRepository.GetStalePendingNotificationsAsync(_userId, Arg.Any<IReadOnlyCollection<Guid>>(), 50)
            .Returns(new List<PendingBankNotification> { new(staleId, Now.AddHours(-1), "Swedbank", "Old text") });
        _aiJobDispatcher.DispatchAsync(_userId, AiJobTypes.ParseBankNotifications, Arg.Any<object>()).Returns(Guid.NewGuid());

        // Act
        var result = await BankFunctions.UploadNotifications(CreateContext(),
            new UploadBankNotificationsRequest([]), _transactionRepository, _categoryRepository, _aiJobDispatcher);

        // Assert
        Assert.Equal(202, GetStatusCode(result));
        await _aiJobDispatcher.Received(1).DispatchAsync(_userId, AiJobTypes.ParseBankNotifications,
            Arg.Is<ParseNotificationsJobRequest>(r => r.Notifications.Single().Id == staleId));
    }
}
