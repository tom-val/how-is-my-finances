variable "supabase_access_token" {
  description = "Supabase management API access token."
  type        = string
  sensitive   = true
}

variable "supabase_organization_id" {
  description = "Supabase organisation ID."
  type        = string
}

variable "supabase_database_password" {
  description = "Password for the Supabase database."
  type        = string
  sensitive   = true
}
