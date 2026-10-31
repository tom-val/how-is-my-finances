using System.Net;
using System.Text.Json;
using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Infrastructure.EnableBanking;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Infrastructure;

public class TransactionMappingTests
{
    private static readonly DateOnly Today = new(2026, 10, 31);

    private static EbTransaction Parse(string json)
    {
        var page = EnableBankingClient.ParseTransactionsPage(
            JsonDocument.Parse($$"""{ "transactions": [{{json}}] }""").RootElement);
        return Assert.Single(page.Transactions);
    }

    [Fact]
    public void Map_Debit_UsesCreditorAndEntryReference()
    {
        // Arrange
        var transaction = Parse("""
            {
              "entry_reference": "2026102800123",
              "transaction_id": "tx-1",
              "transaction_amount": { "amount": "12.50", "currency": "EUR" },
              "credit_debit_indicator": "DBIT",
              "status": "BOOK",
              "booking_date": "2026-10-28",
              "value_date": "2026-10-27",
              "creditor": { "name": "MAXIMA LT X123 VILNIUS" },
              "creditor_account": { "iban": "LT12 1000 0111 0100 1000" },
              "remittance_information": ["Pirkinys", "Vilnius"],
              "merchant_category_code": "5411"
            }
            """);

        // Act
        var row = TransactionMapper.Map(transaction, EbTransactionStatus.Booked, Today)!;

        // Assert
        Assert.Equal("2026102800123", row.ExternalId);
        Assert.Equal(BankDirection.Debit, row.Direction);
        Assert.Equal(BankBookingStatus.Booked, row.BookingStatus);
        Assert.Equal(12.50m, row.Amount);
        Assert.Equal("EUR", row.Currency);
        Assert.Equal(new DateOnly(2026, 10, 28), row.BookingDate);
        Assert.Equal("MAXIMA LT X123 VILNIUS", row.CounterpartyName);
        Assert.Equal("maxima lt x vilnius", row.CounterpartyKey);
        Assert.Equal("Pirkinys Vilnius", row.Description);
        Assert.Equal("5411", row.MerchantCategoryCode);
        Assert.Equal(Iban.Hash("LT121000011101001000"), row.CounterpartyIbanHash);
        Assert.Contains("\"entry_reference\"", row.RawJson);
    }

    [Fact]
    public void Map_Credit_UsesDebtorName()
    {
        // Arrange
        var transaction = Parse("""
            {
              "transaction_id": "tx-2",
              "transaction_amount": { "amount": "1500.00", "currency": "EUR" },
              "credit_debit_indicator": "CRDT",
              "status": "BOOK",
              "booking_date": "2026-10-25",
              "debtor": { "name": "UAB Employer" },
              "creditor": { "name": "Me" }
            }
            """);

        // Act
        var row = TransactionMapper.Map(transaction, EbTransactionStatus.Booked, Today)!;

        // Assert
        Assert.Equal("tx-2", row.ExternalId);
        Assert.Equal(BankDirection.Credit, row.Direction);
        Assert.Equal(1500m, row.Amount);
        Assert.Equal("UAB Employer", row.CounterpartyName);
    }

    [Fact]
    public void Map_Pending_UsesTransactionDateAndPendingStatus()
    {
        // Arrange
        var transaction = Parse("""
            {
              "transaction_id": "p-1",
              "transaction_amount": { "amount": "4.20", "currency": "EUR" },
              "credit_debit_indicator": "DBIT",
              "status": "PDNG",
              "transaction_date": "2026-10-30",
              "value_date": "2026-11-01",
              "creditor": { "name": "Caffeine" }
            }
            """);

        // Act
        var row = TransactionMapper.Map(transaction, EbTransactionStatus.Pending, Today)!;

        // Assert
        Assert.Equal(BankBookingStatus.Pending, row.BookingStatus);
        Assert.Equal(new DateOnly(2026, 10, 30), row.BookingDate);
    }

    [Fact]
    public void Map_WhenStatusMissing_UsesRequestedStatus()
    {
        // Arrange
        var transaction = Parse("""
            { "transaction_id": "p-2", "transaction_amount": { "amount": "1.00" }, "credit_debit_indicator": "DBIT" }
            """);

        // Act
        var row = TransactionMapper.Map(transaction, EbTransactionStatus.Pending, Today)!;

        // Assert
        Assert.Equal(BankBookingStatus.Pending, row.BookingStatus);
        Assert.Equal(Today, row.BookingDate);
        Assert.Equal("EUR", row.Currency);
    }

    [Fact]
    public void Map_WithoutIds_UsesDeterministicHash()
    {
        // Arrange
        const string json = """
            {
              "transaction_amount": { "amount": "7.99", "currency": "EUR" },
              "credit_debit_indicator": "DBIT",
              "status": "BOOK",
              "booking_date": "2026-10-20",
              "creditor": { "name": "Spotify" },
              "remittance_information": ["Subscription"]
            }
            """;

        // Act
        var first = TransactionMapper.Map(Parse(json), EbTransactionStatus.Booked, Today)!;
        var second = TransactionMapper.Map(Parse(json), EbTransactionStatus.Booked, Today)!;

        // Assert
        Assert.StartsWith("h:", first.ExternalId);
        Assert.Equal(first.ExternalId, second.ExternalId);
        Assert.Equal(
            TransactionMapper.HashId(new DateOnly(2026, 10, 20), 7.99m, BankDirection.Debit, "Spotify", "Subscription"),
            first.ExternalId);
    }

    [Fact]
    public void Map_CardPaymentWithoutCreditor_TakesMerchantFromRemittance()
    {
        // Arrange
        var transaction = Parse("""
            {
              "entry_reference": "e-3",
              "transaction_amount": { "amount": "5.99", "currency": "EUR" },
              "credit_debit_indicator": "DBIT",
              "status": "BOOK",
              "booking_date": "2026-10-28",
              "remittance_information": ["PIRKINYS 516793******1234 2026.10.28 5,99 EUR (512345) IKI VILNIUS"]
            }
            """);

        // Act
        var row = TransactionMapper.Map(transaction, EbTransactionStatus.Booked, Today)!;

        // Assert
        Assert.Equal("IKI VILNIUS", row.CounterpartyName);
        Assert.Equal("iki vilnius", row.CounterpartyKey);
    }

    [Fact]
    public void Map_SignedAmountWithoutIndicator_IsDebitWithAbsoluteAmount()
    {
        // Arrange
        var transaction = Parse("""
            { "entry_reference": "e-4", "transaction_amount": { "amount": "-3.10" }, "status": "BOOK", "booking_date": "2026-10-28" }
            """);

        // Act
        var row = TransactionMapper.Map(transaction, EbTransactionStatus.Booked, Today)!;

        // Assert
        Assert.Equal(BankDirection.Debit, row.Direction);
        Assert.Equal(3.10m, row.Amount);
    }

    [Theory]
    [InlineData("""{ "entry_reference": "x", "transaction_amount": { "amount": "1.00" }, "credit_debit_indicator": "DBIT", "status": "CNCL" }""")]
    [InlineData("""{ "entry_reference": "x", "transaction_amount": { "amount": "0.00" }, "credit_debit_indicator": "DBIT", "status": "BOOK" }""")]
    [InlineData("""{ "entry_reference": "x", "transaction_amount": { "amount": "1.00" }, "status": "BOOK" }""")]
    public void Map_UnusableTransactions_ReturnNull(string json)
    {
        // Act
        var row = TransactionMapper.Map(Parse(json), EbTransactionStatus.Booked, Today);

        // Assert
        Assert.Null(row);
    }

    [Fact]
    public void ParseTransactionsPage_ReadsContinuationKey()
    {
        // Arrange
        var root = JsonDocument.Parse("""{ "transactions": [], "continuation_key": "abc" }""").RootElement;

        // Act
        var page = EnableBankingClient.ParseTransactionsPage(root);

        // Assert
        Assert.Empty(page.Transactions);
        Assert.Equal("abc", page.ContinuationKey);
    }

    [Theory]
    [InlineData(HttpStatusCode.TooManyRequests, "ASPSP_RATE_LIMIT_EXCEEDED", EnableBankingErrors.RateLimited)]
    [InlineData(HttpStatusCode.BadRequest, "ASPSP_RATE_LIMIT_EXCEEDED", EnableBankingErrors.RateLimited)]
    [InlineData(HttpStatusCode.Unauthorized, "EXPIRED_SESSION", EnableBankingErrors.Expired)]
    [InlineData(HttpStatusCode.BadRequest, "EXPIRED_SESSION", EnableBankingErrors.Expired)]
    [InlineData(HttpStatusCode.BadRequest, "REVOKED_SESSION", EnableBankingErrors.Expired)]
    [InlineData(HttpStatusCode.NotFound, "SESSION_DOES_NOT_EXIST", EnableBankingErrors.NotFound)]
    public void MapError_MapsKnownErrors(HttpStatusCode status, string? code, string expected)
    {
        // Act
        var error = EnableBankingClient.MapError(status, new EbError("message", (int)status, code, null));

        // Assert
        Assert.Equal(expected, error);
    }

    [Fact]
    public void MapError_BareUnauthorizedIsNotExpired()
    {
        // A 401 without a session code is the app JWT being rejected, not the user's consent ending.

        // Act
        var error = EnableBankingClient.MapError(HttpStatusCode.Unauthorized, new EbError("Invalid JWT", 401, null, null));

        // Assert
        Assert.NotEqual(EnableBankingErrors.Expired, error);
        Assert.StartsWith("Bank provider error (401)", error);
    }

    [Fact]
    public void Iban_MaskKeepsCountryAndLastFour()
    {
        // Act & Assert
        Assert.Equal("LT** **** **** **** 1000", Iban.Mask("lt12 1000 0111 0100 1000"));
        Assert.Equal(Iban.Hash("LT121000011101001000"), Iban.Hash("lt12 1000 0111 0100 1000"));
        Assert.Null(Iban.Mask(null));
    }
}
