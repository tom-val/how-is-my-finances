# Supabase module — provisions a Supabase project and retrieves API keys.

terraform {
  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }
}

resource "supabase_project" "this" {
  name              = "${var.project_name}-${var.environment}"
  organization_id   = var.organization_id
  database_password = var.database_password
  region            = var.region
}

data "supabase_apikeys" "this" {
  project_ref = supabase_project.this.id
}

locals {
  project_url          = "https://${supabase_project.this.id}.supabase.co"
  db_connection_string = "postgresql://postgres.${supabase_project.this.id}:${var.database_password}@aws-0-${var.region}.pooler.supabase.com:5432/postgres"
}
