namespace HowAreMyFinances.Api.Domain;

public sealed class MonthEntity
{
    public int Year { get; }
    public int MonthNumber { get; }
    public decimal Salary { get; }

    private MonthEntity(int year, int monthNumber, decimal salary)
    {
        Year = year;
        MonthNumber = monthNumber;
        Salary = salary;
    }

    public static Result<MonthEntity> Create(int year, int monthNumber, decimal salary)
    {
        if (year < 2000 || year > 2100)
            return Result<MonthEntity>.Failure("Year must be between 2000 and 2100");

        if (monthNumber < 1 || monthNumber > 12)
            return Result<MonthEntity>.Failure("Month must be between 1 and 12");

        if (salary < 0)
            return Result<MonthEntity>.Failure("Salary must be non-negative");

        return Result<MonthEntity>.Success(new MonthEntity(year, monthNumber, salary));
    }

    public static Result<decimal> ValidateSalary(decimal salary)
    {
        return salary < 0
            ? Result<decimal>.Failure("Salary must be non-negative")
            : Result<decimal>.Success(salary);
    }
}
