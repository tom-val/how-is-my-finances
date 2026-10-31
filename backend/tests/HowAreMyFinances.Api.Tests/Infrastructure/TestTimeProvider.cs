namespace HowAreMyFinances.Api.Tests.Infrastructure;

public sealed class TestTimeProvider : TimeProvider
{
    public DateTimeOffset Now { get; set; }

    public TestTimeProvider(DateTimeOffset now)
    {
        Now = now;
    }

    public override DateTimeOffset GetUtcNow() => Now;

    public void Advance(TimeSpan by) => Now = Now.Add(by);
}
