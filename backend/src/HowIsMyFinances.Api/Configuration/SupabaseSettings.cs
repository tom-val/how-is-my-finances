using System.ComponentModel.DataAnnotations;

namespace HowIsMyFinances.Api.Configuration;

public sealed class SupabaseSettings
{
    public const string SectionName = "Supabase";

    [Required]
    public string Url { get; set; } = string.Empty;

    [Required]
    public string ServiceKey { get; set; } = string.Empty;

    [Required]
    public string DbConnectionString { get; set; } = string.Empty;
}
