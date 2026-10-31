using System.Text.Json;
using HowAreMyFinances.Api.Configuration;
using HowAreMyFinances.Api.Domain;
using HowAreMyFinances.Api.Models;
using Microsoft.Extensions.Options;
using Npgsql;
using NpgsqlTypes;

namespace HowAreMyFinances.Api.Infrastructure.Repositories;

public sealed class AiJobRepository : IAiJobRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly string _connectionString;

    public AiJobRepository(IOptions<SupabaseSettings> settings)
    {
        _connectionString = settings.Value.DbConnectionString;
    }

    public async Task<Guid> CreateAsync(Guid userId, string jobType, object requestBody)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            INSERT INTO public.ai_jobs (user_id, job_type, status, request_body)
            VALUES (@userId, @jobType, 'pending', @requestBody)
            RETURNING id
            """,
            connection);

        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("jobType", jobType);
        command.Parameters.Add(new NpgsqlParameter("requestBody", NpgsqlDbType.Jsonb)
        {
            Value = JsonSerializer.Serialize(requestBody, requestBody.GetType(), JsonOptions)
        });

        return (Guid)(await command.ExecuteScalarAsync())!;
    }

    public async Task<AiJobStatus?> GetStatusAsync(Guid userId, Guid jobId)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            SELECT status, error
            FROM public.ai_jobs
            WHERE id = @jobId AND user_id = @userId
            """,
            connection);

        command.Parameters.AddWithValue("jobId", jobId);
        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return null;

        return new AiJobStatus(reader.GetString(0), reader.IsDBNull(1) ? null : reader.GetString(1));
    }

    public async Task MarkFailedAsync(Guid userId, Guid jobId, string error)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(
            """
            UPDATE public.ai_jobs
            SET status = 'failed', error = @error, completed_at = now()
            WHERE id = @jobId AND user_id = @userId AND status = 'pending'
            """,
            connection);

        command.Parameters.AddWithValue("error", error);
        command.Parameters.AddWithValue("jobId", jobId);
        command.Parameters.AddWithValue("userId", userId);

        await command.ExecuteNonQueryAsync();
    }
}
