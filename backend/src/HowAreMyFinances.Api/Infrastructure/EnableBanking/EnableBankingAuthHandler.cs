using System.Net.Http.Headers;

namespace HowAreMyFinances.Api.Infrastructure.EnableBanking;

/// <summary>Attaches the application JWT to every Enable Banking request.</summary>
public sealed class EnableBankingAuthHandler : DelegatingHandler
{
    private readonly EnableBankingJwtFactory _jwtFactory;

    public EnableBankingAuthHandler(EnableBankingJwtFactory jwtFactory)
    {
        _jwtFactory = jwtFactory;
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _jwtFactory.GetToken());
        return base.SendAsync(request, cancellationToken);
    }
}
