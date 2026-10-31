using System.Text.Json;
using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Infrastructure;
using HowAreMyFinances.Api.Infrastructure.EnableBanking;
using HowAreMyFinances.Api.Models;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Infrastructure;

public class BankSyncServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 31, 12, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly Today = new(2026, 10, 31);

    private readonly IBankConnectionRepository _connectionRepository = Substitute.For<IBankConnectionRepository>();
    private readonly IBankTransactionRepository _transactionRepository = Substitute.For<IBankTransactionRepository>();
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly IEnableBankingClient _client = Substitute.For<IEnableBankingClient>();
    private readonly IAiJobDispatcher _aiJobDispatcher = Substitute.For<IAiJobDispatcher>();
    private readonly Guid _userId = Guid.NewGuid();
    private readonly BankConnectionRecord _connection;
    private readonly BankAccountRecord _account;

    public BankSyncServiceTests()
    {
        _connection = new BankConnectionRecord(Guid.NewGuid(), _userId, "Swedbank", "LT", "web", "active", "session-1",
            Now.AddDays(100).UtcDateTime, null, Now.AddDays(-1).UtcDateTime);
        _account = new BankAccountRecord(Guid.NewGuid(), _connection.Id, "uid-1", Iban.Hash("LT111111111111111111"), null);

        _connectionRepository.GetActiveAsync(_userId, null).Returns(new List<BankConnectionRecord> { _connection });
        _connectionRepository.GetEnabledAccountsAsync(_userId, _connection.Id).Returns(new List<BankAccountRecord> { _account });
        _connectionRepository.GetOwnIbanHashesAsync(_userId).Returns(new HashSet<string> { _account.IbanHash! });
        _transactionRepository.InsertAsync(_userId, _account.Id, Arg.Any<IReadOnlyList<NewBankTransaction>>())
            .Returns(call => call.Arg<IReadOnlyList<NewBankTransaction>>()
                .Select(t => new InsertedBankTransaction(Guid.NewGuid(), t.ExternalId, true)).ToList());
        _transactionRepository.GetUncategorisedPendingDebitsAsync(_userId, Arg.Any<int>())
            .Returns(new List<UncategorisedBankTransaction>());
        _categoryRepository.GetAllAsync(_userId).Returns(Categories(3));
        SetTransactions(EbTransactionStatus.Booked);
        SetTransactions(EbTransactionStatus.Pending);
    }

    private BankSyncService CreateService() => new(_connectionRepository, _transactionRepository, _categoryRepository,
        _client, _aiJobDispatcher, new TestTimeProvider(Now), NullLogger<BankSyncService>.Instance);

    private List<Category> Categories(int count, int archived = 0) =>
        Enumerable.Range(0, count + archived)
            .Select(i => new Category(Guid.NewGuid(), _userId, $"Category {i}", null, i, i >= count, DateTime.UtcNow))
            .ToList();

    private static EbTransaction Transaction(string id, string indicator = "DBIT", string status = "BOOK",
        string creditor = "MAXIMA", string? creditorIban = null)
    {
        var json = JsonSerializer.Serialize(new
        {
            entry_reference = id,
            transaction_amount = new { amount = "10.00", currency = "EUR" },
            credit_debit_indicator = indicator,
            status,
            booking_date = "2026-10-30",
            creditor = new { name = creditor },
            creditor_account = creditorIban is null ? null : new { iban = creditorIban }
        });
        return EnableBankingClient.ParseTransactionsPage(
            JsonDocument.Parse($$"""{ "transactions": [{{json}}] }""").RootElement).Transactions[0];
    }

    private void SetTransactions(string status, params EbTransaction[] transactions)
    {
        _client.GetTransactionsAsync("uid-1", Arg.Any<DateOnly>(), null, status, null, Arg.Any<PsuContext>(), Arg.Any<CancellationToken>())
            .Returns(Result<EbTransactionsPage>.Success(new EbTransactionsPage(transactions, null)));
    }

    private static UncategorisedBankTransaction Uncategorised() =>
        new(Guid.NewGuid(), "maxima", BankDirection.Debit, "MAXIMA", new string('d', 300), "5411", 10m);

    [Fact]
    public async Task Sync_ImportsNewRows_AndAppliesRules()
    {
        // Arrange
        SetTransactions(EbTransactionStatus.Booked, Transaction("a"), Transaction("b", indicator: "CRDT"));
        _transactionRepository.ApplyRulesAsync(_userId).Returns(1);

        // Act
        var result = await CreateService().SyncAsync(_userId, null, PsuContext.None);

        // Assert
        Assert.Equal(2, result.Imported);
        Assert.Equal(1, result.CategorisedByRule);
        Assert.Null(result.JobId);
        await _transactionRepository.Received(1).FlagDuplicatesAsync(_userId, Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.Count == 2));
        await _connectionRepository.Received(1).UpdateSyncStateAsync(_userId, _connection.Id, Now.UtcDateTime, null);
        await _connectionRepository.Received(1).UpdateAccountSyncedUntilAsync(_userId, _account.Id, Today);
    }

    [Fact]
    public async Task Sync_UsesThreeDayOverlapFromSyncedUntil()
    {
        // Arrange
        var account = _account with { SyncedUntil = new DateOnly(2026, 10, 20) };
        _connectionRepository.GetEnabledAccountsAsync(_userId, _connection.Id).Returns(new List<BankAccountRecord> { account });

        // Act
        await CreateService().SyncAsync(_userId, null, new PsuContext("203.0.113.7", "UA"));

        // Assert
        await _client.Received(1).GetTransactionsAsync("uid-1", new DateOnly(2026, 10, 17), null, EbTransactionStatus.Booked,
            null, new PsuContext("203.0.113.7", "UA"), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Sync_FirstSync_Looks90DaysBack()
    {
        // Act
        await CreateService().SyncAsync(_userId, null, PsuContext.None);

        // Assert
        await _client.Received(1).GetTransactionsAsync("uid-1", Today.AddDays(-93), null, EbTransactionStatus.Booked,
            null, Arg.Any<PsuContext>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Sync_SkipsTransfersBetweenOwnAccounts()
    {
        // Arrange
        SetTransactions(EbTransactionStatus.Booked, Transaction("own", creditorIban: "LT11 1111 1111 1111 1111"), Transaction("other"));

        // Act
        var result = await CreateService().SyncAsync(_userId, null, PsuContext.None);

        // Assert
        Assert.Equal(1, result.Imported);
        Assert.Equal(1, result.Skipped);
        await _transactionRepository.Received(1).InsertAsync(_userId, _account.Id,
            Arg.Is<IReadOnlyList<NewBankTransaction>>(rows => rows.Count == 1 && rows[0].ExternalId == "other"));
    }

    [Fact]
    public async Task Sync_InsertsPendingRows_AndRemovesStalePending()
    {
        // Arrange
        SetTransactions(EbTransactionStatus.Booked, Transaction("b1"));
        SetTransactions(EbTransactionStatus.Pending, Transaction("p1", status: "PDNG"));

        // Act
        await CreateService().SyncAsync(_userId, null, PsuContext.None);

        // Assert
        await _transactionRepository.Received(1).InsertAsync(_userId, _account.Id,
            Arg.Is<IReadOnlyList<NewBankTransaction>>(rows =>
                rows.Count == 2
                && rows[0].ExternalId == "b1" && rows[0].BookingStatus == BankBookingStatus.Booked
                && rows[1].ExternalId == "p1" && rows[1].BookingStatus == BankBookingStatus.Pending));
        await _transactionRepository.Received(1).DeleteStalePendingAsync(_userId, _account.Id,
            Arg.Is<IReadOnlyCollection<string>>(ids => ids.Count == 1 && ids.Contains("p1")));
        await _transactionRepository.Received(1).AutoLinkBookedAsync(_userId, Arg.Any<IReadOnlyCollection<Guid>>());
    }

    [Fact]
    public async Task Sync_WhenPendingFetchFails_KeepsExistingPendingRows()
    {
        // Arrange
        _client.GetTransactionsAsync("uid-1", Arg.Any<DateOnly>(), null, EbTransactionStatus.Pending, null, Arg.Any<PsuContext>(), Arg.Any<CancellationToken>())
            .Returns(Result<EbTransactionsPage>.Failure("Bank provider error (422): unsupported"));

        // Act
        await CreateService().SyncAsync(_userId, null, PsuContext.None);

        // Assert
        await _transactionRepository.DidNotReceiveWithAnyArgs().DeleteStalePendingAsync(default, default, default!);
    }

    [Fact]
    public async Task Sync_FollowsContinuationKey_UpToTenPages()
    {
        // Arrange
        _client.GetTransactionsAsync("uid-1", Arg.Any<DateOnly>(), null, EbTransactionStatus.Booked, Arg.Any<string?>(), Arg.Any<PsuContext>(), Arg.Any<CancellationToken>())
            .Returns(Result<EbTransactionsPage>.Success(new EbTransactionsPage([Transaction("x")], "more")));

        // Act
        await CreateService().SyncAsync(_userId, null, PsuContext.None);

        // Assert
        await _client.Received(10).GetTransactionsAsync("uid-1", Arg.Any<DateOnly>(), null, EbTransactionStatus.Booked,
            Arg.Any<string?>(), Arg.Any<PsuContext>(), Arg.Any<CancellationToken>());
        // Not every page was read, so synced_until must not advance
        await _connectionRepository.DidNotReceiveWithAnyArgs().UpdateAccountSyncedUntilAsync(default, default, default);
    }

    [Fact]
    public async Task Sync_NoUncategorisedRows_CreatesNoJob()
    {
        // Arrange
        SetTransactions(EbTransactionStatus.Booked, Transaction("a"));

        // Act
        var result = await CreateService().SyncAsync(_userId, null, PsuContext.None);

        // Assert
        Assert.Null(result.JobId);
        await _aiJobDispatcher.DidNotReceiveWithAnyArgs().DispatchAsync(default, default!, default!);
    }

    [Fact]
    public async Task Sync_FewerThanThreeActiveCategories_CreatesNoJob()
    {
        // Arrange
        _transactionRepository.GetUncategorisedPendingDebitsAsync(_userId, Arg.Any<int>())
            .Returns(new List<UncategorisedBankTransaction> { Uncategorised() });
        _categoryRepository.GetAllAsync(_userId).Returns(Categories(2, archived: 3));

        // Act
        var result = await CreateService().SyncAsync(_userId, null, PsuContext.None);

        // Assert
        Assert.Null(result.JobId);
        await _aiJobDispatcher.DidNotReceiveWithAnyArgs().DispatchAsync(default, default!, default!);
    }

    [Fact]
    public async Task Sync_UncategorisedRows_CreatesCategoriseJob()
    {
        // Arrange
        var jobId = Guid.NewGuid();
        var row = Uncategorised();
        _transactionRepository.GetUncategorisedPendingDebitsAsync(_userId, 200)
            .Returns(new List<UncategorisedBankTransaction> { row });
        _aiJobDispatcher.DispatchAsync(_userId, AiJobTypes.CategoriseBankTransactions, Arg.Any<object>()).Returns(jobId);

        // Act
        var result = await CreateService().SyncAsync(_userId, null, PsuContext.None);

        // Assert
        Assert.Equal(jobId, result.JobId);
        await _aiJobDispatcher.Received(1).DispatchAsync(_userId, AiJobTypes.CategoriseBankTransactions,
            Arg.Is<CategoriseJobRequest>(r =>
                                r.Categories.Count == 3
                                && r.Transactions.Single().Id == row.Id
                                && r.Transactions.Single().Description!.Length == 140));
    }

    [Fact]
    public async Task Sync_WithinCooldown_SkipsConnection()
    {
        // Arrange
        var recent = _connection with { LastSyncedAt = Now.AddMinutes(-2).UtcDateTime };
        _connectionRepository.GetActiveAsync(_userId, null).Returns(new List<BankConnectionRecord> { recent });

        // Act
        var result = await CreateService().SyncAsync(_userId, null, PsuContext.None);

        // Assert
        Assert.True(result.Cooldown);
        await _client.DidNotReceiveWithAnyArgs().GetTransactionsAsync(default!, default, default, default, default, default!);
        await _aiJobDispatcher.DidNotReceiveWithAnyArgs().DispatchAsync(default, default!, default!);
    }

    [Fact]
    public async Task Sync_ExpiredConsent_MarksConnectionExpired()
    {
        // Arrange
        var expired = _connection with { ConsentExpiresAt = Now.AddDays(-1).UtcDateTime };
        _connectionRepository.GetActiveAsync(_userId, null).Returns(new List<BankConnectionRecord> { expired });

        // Act
        var result = await CreateService().SyncAsync(_userId, null, PsuContext.None);

        // Assert
        Assert.Equal(1, result.ExpiredConnections);
        await _connectionRepository.Received(1).SetStatusAsync(_userId, expired.Id, "expired", Arg.Any<string?>());
        await _client.DidNotReceiveWithAnyArgs().GetTransactionsAsync(default!, default, default, default, default, default!);
    }

    [Fact]
    public async Task Sync_SessionExpiredUpstream_MarksConnectionExpired()
    {
        // Arrange
        _client.GetTransactionsAsync("uid-1", Arg.Any<DateOnly>(), null, EbTransactionStatus.Booked, null, Arg.Any<PsuContext>(), Arg.Any<CancellationToken>())
            .Returns(Result<EbTransactionsPage>.Failure(EnableBankingErrors.Expired));

        // Act
        var result = await CreateService().SyncAsync(_userId, null, PsuContext.None);

        // Assert
        Assert.Equal(1, result.ExpiredConnections);
        await _connectionRepository.Received(1).SetStatusAsync(_userId, _connection.Id, "expired", Arg.Any<string?>());
    }

    [Fact]
    public async Task Sync_RateLimited_ReportsAndRecordsError()
    {
        // Arrange
        _client.GetTransactionsAsync("uid-1", Arg.Any<DateOnly>(), null, EbTransactionStatus.Booked, null, Arg.Any<PsuContext>(), Arg.Any<CancellationToken>())
            .Returns(Result<EbTransactionsPage>.Failure(EnableBankingErrors.RateLimited));

        // Act
        var result = await CreateService().SyncAsync(_userId, null, PsuContext.None);

        // Assert
        Assert.True(result.RateLimited);
        await _connectionRepository.Received(1).UpdateSyncStateAsync(_userId, _connection.Id, Now.UtcDateTime,
            Arg.Is<string?>(e => e != null && e.Contains("rate limit")));
        await _transactionRepository.DidNotReceiveWithAnyArgs().InsertAsync(default, default, default!);
    }
}
