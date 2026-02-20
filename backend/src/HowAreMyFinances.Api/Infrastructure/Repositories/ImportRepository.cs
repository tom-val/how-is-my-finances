using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Models;
using Microsoft.Extensions.Options;
using Npgsql;

namespace HowAreMyFinances.Api.Infrastructure.Repositories;

public sealed class ImportRepository : IImportRepository
{
    private readonly string _connectionString;

    public ImportRepository(IOptions<SupabaseSettings> settings)
    {
        _connectionString = settings.Value.DbConnectionString;
    }

    public async Task<ImportResult> ImportAsync(Guid userId, ImportRequest request)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        try
        {
            await DeleteAllUserDataAsync(connection, userId);

            var categoryNameToId = await InsertCategoriesAsync(connection, userId, request.Categories);

            var monthsCreated = 0;
            var expensesCreated = 0;
            var incomesCreated = 0;

            foreach (var monthEntry in request.Months)
            {
                var monthId = await InsertMonthAsync(connection, userId, monthEntry);
                monthsCreated++;

                foreach (var expense in monthEntry.Expenses)
                {
                    var categoryId = categoryNameToId.GetValueOrDefault(expense.CategoryName);
                    if (categoryId == Guid.Empty)
                    {
                        // Category not found — skip this expense rather than fail the whole import
                        continue;
                    }

                    await InsertExpenseAsync(connection, userId, monthId, categoryId, expense);
                    expensesCreated++;
                }

                foreach (var income in monthEntry.Incomes)
                {
                    await InsertIncomeAsync(connection, userId, monthId, income);
                    incomesCreated++;
                }
            }

            await transaction.CommitAsync();

            return new ImportResult(
                CategoriesCreated: request.Categories.Count,
                MonthsCreated: monthsCreated,
                ExpensesCreated: expensesCreated,
                IncomesCreated: incomesCreated);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private static async Task DeleteAllUserDataAsync(NpgsqlConnection connection, Guid userId)
    {
        // Delete in FK-safe order: expenses/incomes first, then months, then recurring, then categories
        var tables = new[] { "expenses", "incomes", "months", "recurring_expenses", "categories" };

        foreach (var table in tables)
        {
            await using var command = new NpgsqlCommand(
                $"DELETE FROM public.{table} WHERE user_id = @userId",
                connection);
            command.Parameters.AddWithValue("userId", userId);
            await command.ExecuteNonQueryAsync();
        }
    }

    private static async Task<Dictionary<string, Guid>> InsertCategoriesAsync(
        NpgsqlConnection connection, Guid userId, IReadOnlyList<string> categories)
    {
        var nameToId = new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);

        for (var i = 0; i < categories.Count; i++)
        {
            var categoryName = categories[i];
            var categoryId = Guid.NewGuid();

            await using var command = new NpgsqlCommand(
                """
                INSERT INTO public.categories (id, user_id, name, sort_order, is_archived)
                VALUES (@id, @userId, @name, @sortOrder, false)
                """,
                connection);

            command.Parameters.AddWithValue("id", categoryId);
            command.Parameters.AddWithValue("userId", userId);
            command.Parameters.AddWithValue("name", categoryName);
            command.Parameters.AddWithValue("sortOrder", i);

            await command.ExecuteNonQueryAsync();
            nameToId[categoryName] = categoryId;
        }

        return nameToId;
    }

    private static async Task<Guid> InsertMonthAsync(
        NpgsqlConnection connection, Guid userId, ImportMonthEntry entry)
    {
        var monthId = Guid.NewGuid();

        await using var command = new NpgsqlCommand(
            """
            INSERT INTO public.months (id, user_id, year, month, salary)
            VALUES (@id, @userId, @year, @month, @salary)
            """,
            connection);

        command.Parameters.AddWithValue("id", monthId);
        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("year", entry.Year);
        command.Parameters.AddWithValue("month", entry.Month);
        command.Parameters.AddWithValue("salary", entry.Salary);

        await command.ExecuteNonQueryAsync();
        return monthId;
    }

    private static async Task InsertExpenseAsync(
        NpgsqlConnection connection, Guid userId, Guid monthId, Guid categoryId, ImportExpenseEntry expense)
    {
        await using var command = new NpgsqlCommand(
            """
            INSERT INTO public.expenses (id, user_id, month_id, category_id, item_name, amount, vendor, expense_date, comment, is_recurring_instance)
            VALUES (@id, @userId, @monthId, @categoryId, @itemName, @amount, @vendor, @expenseDate, @comment, false)
            """,
            connection);

        command.Parameters.AddWithValue("id", Guid.NewGuid());
        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("monthId", monthId);
        command.Parameters.AddWithValue("categoryId", categoryId);
        command.Parameters.AddWithValue("itemName", expense.ItemName);
        command.Parameters.AddWithValue("amount", expense.Amount);
        command.Parameters.AddWithValue("vendor", (object?)expense.Vendor ?? DBNull.Value);
        command.Parameters.AddWithValue("expenseDate", DateOnly.Parse(expense.ExpenseDate));
        command.Parameters.AddWithValue("comment", (object?)expense.Comment ?? DBNull.Value);

        await command.ExecuteNonQueryAsync();
    }

    private static async Task InsertIncomeAsync(
        NpgsqlConnection connection, Guid userId, Guid monthId, ImportIncomeEntry income)
    {
        await using var command = new NpgsqlCommand(
            """
            INSERT INTO public.incomes (id, user_id, month_id, source, amount, income_date, comment)
            VALUES (@id, @userId, @monthId, @source, @amount, @incomeDate, @comment)
            """,
            connection);

        command.Parameters.AddWithValue("id", Guid.NewGuid());
        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("monthId", monthId);
        command.Parameters.AddWithValue("source", income.Source);
        command.Parameters.AddWithValue("amount", income.Amount);
        command.Parameters.AddWithValue("incomeDate", DateOnly.Parse(income.IncomeDate));
        command.Parameters.AddWithValue("comment", (object?)income.Comment ?? DBNull.Value);

        await command.ExecuteNonQueryAsync();
    }
}
