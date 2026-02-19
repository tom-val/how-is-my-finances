output "project_url" {
  description = "Supabase project URL."
  value       = local.project_url
}

output "anon_key" {
  description = "Supabase anonymous API key (safe to expose in frontend)."
  value       = nonsensitive(data.supabase_apikeys.this.anon_key)
}

output "service_role_key" {
  description = "Supabase service role key (backend only, never expose)."
  value       = data.supabase_apikeys.this.service_role_key
  sensitive   = true
}

output "db_connection_string" {
  description = "PostgreSQL connection string via Supabase connection pooler."
  value       = local.db_connection_string
  sensitive   = true
}

output "project_ref" {
  description = "Supabase project reference ID."
  value       = supabase_project.this.id
}
