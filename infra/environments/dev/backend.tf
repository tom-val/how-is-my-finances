terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.27.0"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }

  backend "s3" {
    bucket         = "how-is-my-finances-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "eu-central-1"
    encrypt        = true
    dynamodb_table = "how-is-my-finances-terraform-locks"
  }
}

provider "aws" {
  region = "eu-central-1"
}

provider "supabase" {
  access_token = var.supabase_access_token
}
