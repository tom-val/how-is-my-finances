using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Functions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using Xunit;

namespace HowAreMyFinances.Api.Tests.Functions;

public class AccountFunctionsTests
{
    private readonly IEnableBankingClient _client = Substitute.For<IEnableBankingClient>();
    private readonly IBankConnectionRepository _connectionRepository = Substitute.For<IBankConnectionRepository>();
    private readonly IAccountRepository _accountRepository = Substitute.For<IAccountRepository>();
    private readonly IAuthAdminClient _authAdmin = Substitute.For<IAuthAdminClient>();
    private readonly Guid _userId = Guid.NewGuid();

    private HttpContext CreateContext()
    {
        var context = new DefaultHttpContext();
        context.Items["UserId"] = _userId;
        return context;
    }

    private static IOptions<EnableBankingSettings> Settings(bool configured) =>
        Options.Create(configured
            ? new EnableBankingSettings { ApplicationId = "app", PrivateKeyBase64 = "key" }
            : new EnableBankingSettings());

    private Task<IResult> Delete(bool bankConfigured = true) =>
        AccountFunctions.Delete(CreateContext(), Settings(bankConfigured), _client, _connectionRepository,
            _accountRepository, _authAdmin, NullLoggerFactory.Instance);

    private BankConnectionRecord Connection(string? sessionId) =>
        new(Guid.NewGuid(), _userId, "Swedbank", "LT", "web", "active", sessionId, null, null, DateTime.UtcNow);

    [Fact]
    public async Task Delete_RevokesSessionsDeletesDataThenAuthUser_Returns204()
    {
        // Arrange
        _connectionRepository.GetActiveAsync(_userId, null).Returns([Connection("session-1"), Connection(null)]);
        _client.DeleteSessionAsync("session-1").Returns(Result<bool>.Success(true));
        _authAdmin.DeleteUserAsync(_userId).Returns(Result<bool>.Success(true));

        // Act
        var result = await Delete();

        // Assert
        Assert.IsType<NoContent>(result);
        await _client.Received(1).DeleteSessionAsync("session-1");
        Received.InOrder(() =>
        {
            _accountRepository.DeleteAllDataAsync(_userId);
            _authAdmin.DeleteUserAsync(_userId);
        });
    }

    [Fact]
    public async Task Delete_SessionRevokeFails_StillDeletesAccount()
    {
        // Arrange
        _connectionRepository.GetActiveAsync(_userId, null).Returns([Connection("session-1")]);
        _client.DeleteSessionAsync("session-1").Returns(Result<bool>.Failure("Bank provider error (500): boom"));
        _authAdmin.DeleteUserAsync(_userId).Returns(Result<bool>.Success(true));

        // Act
        var result = await Delete();

        // Assert
        Assert.IsType<NoContent>(result);
        await _accountRepository.Received(1).DeleteAllDataAsync(_userId);
    }

    [Fact]
    public async Task Delete_BankNotConfigured_SkipsRevokeAndDeletes()
    {
        // Arrange
        _authAdmin.DeleteUserAsync(_userId).Returns(Result<bool>.Success(true));

        // Act
        var result = await Delete(bankConfigured: false);

        // Assert
        Assert.IsType<NoContent>(result);
        await _connectionRepository.DidNotReceive().GetActiveAsync(Arg.Any<Guid>(), Arg.Any<Guid?>());
        await _accountRepository.Received(1).DeleteAllDataAsync(_userId);
    }

    [Fact]
    public async Task Delete_AuthAdminFails_Returns502()
    {
        // Arrange
        _authAdmin.DeleteUserAsync(_userId).Returns(Result<bool>.Failure("Auth admin API returned 500"));

        // Act
        var result = await Delete(bankConfigured: false);

        // Assert
        var status = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
        Assert.Equal(StatusCodes.Status502BadGateway, status.StatusCode);
        await _accountRepository.Received(1).DeleteAllDataAsync(_userId);
    }
}
