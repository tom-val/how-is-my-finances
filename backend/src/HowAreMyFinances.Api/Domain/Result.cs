namespace HowAreMyFinances.Api.Domain;

public sealed class Result<T>
{
    public T? Value { get; }
    public string? Error { get; }
    public bool IsSuccess => Error is null;

    private Result(T value)
    {
        Value = value;
        Error = null;
    }

    private Result(string error)
    {
        Value = default;
        Error = error;
    }

    public static Result<T> Success(T value) => new(value);
    public static Result<T> Failure(string error) => new(error);
}
