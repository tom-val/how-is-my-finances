# Lambda module — .NET 10 Lambda function, IAM role, and CloudWatch log group.

resource "aws_iam_role" "lambda_execution" {
  name = "${var.project_name}-${var.environment}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}"
  retention_in_days = 14
}

resource "aws_lambda_function" "api" {
  function_name    = "${var.project_name}-${var.environment}"
  role             = aws_iam_role.lambda_execution.arn
  runtime          = "dotnet10"
  handler          = "HowIsMyFinances.Api"
  memory_size      = 1024
  timeout          = 30
  filename         = var.deployment_package_path
  source_code_hash = filebase64sha256(var.deployment_package_path)
  publish          = true

  snap_start {
    apply_on = "PublishedVersions"
  }

  environment {
    variables = {
      ASPNETCORE_ENVIRONMENT       = var.environment == "prod" ? "Production" : "Development"
      Supabase__Url                = var.supabase_url
      Supabase__ServiceKey         = var.supabase_service_key
      Supabase__DbConnectionString = var.supabase_db_connection_string
      Cors__AllowedOrigins__0      = var.cors_allowed_origins
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_cloudwatch_log_group.lambda,
  ]

  # Code is deployed via CI/CD (aws lambda update-function-code), not Terraform.
  # The dummy.zip is only used for initial creation.
  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

resource "aws_lambda_alias" "live" {
  name             = "live"
  description      = "Alias for the active SnapStart version."
  function_name    = aws_lambda_function.api.function_name
  function_version = aws_lambda_function.api.version

  # CI/CD publishes new versions and updates this alias.
  lifecycle {
    ignore_changes = [function_version]
  }
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  qualifier     = aws_lambda_alias.live.name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}
