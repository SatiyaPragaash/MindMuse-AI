provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "pdf_bucket" {
  bucket = "mindmuse-guides"
  force_destroy = true

  tags = {
    Name = "MindMuse PDF Storage"
  }
}

data "aws_iam_role" "existing" {
  name = "LabRole"
}

resource "aws_lambda_function" "mindmuse_lambda" {
  function_name = "mindmuseLambda"
  runtime       = "nodejs18.x"
  handler       = "index.handler"
  filename      = "lambda_function.zip"
  source_code_hash = filebase64sha256("lambda_function.zip")
  role          = data.aws_iam_role.existing.arn
  timeout       = 50
  memory_size   = 512

  environment {
    variables = {
      BUCKET_NAME     = aws_s3_bucket.pdf_bucket.bucket
      GEMINI_API_KEY  = ""
    }
  }
}

resource "aws_cloudwatch_log_metric_filter" "lambda_error_filter" {
  name           = "LambdaErrorMetricFilter"
  log_group_name = "/aws/lambda/${aws_lambda_function.mindmuse_lambda.function_name}"
  pattern        = "ERROR"

  metric_transformation {
    name      = "LambdaErrorCount"
    namespace = "MindMuseApp"
    value     = "1"
  }
}

resource "aws_sns_topic" "lambda_alert_topic" {
  name = "lambda-error-alerts"
}

resource "aws_sns_topic_subscription" "lambda_email_alert" {
  topic_arn = aws_sns_topic.lambda_alert_topic.arn
  protocol  = "email"
  endpoint  = "satiyapragaash32@gmail.com"
}

resource "aws_cloudwatch_metric_alarm" "lambda_error_alarm" {
  alarm_name          = "LambdaErrorAlarm"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "LambdaErrorCount"
  namespace           = "MindMuseApp"
  period              = 60
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "Triggers when Lambda logs contain 'ERROR'"
  alarm_actions       = [aws_sns_topic.lambda_alert_topic.arn]
}

resource "aws_apigatewayv2_api" "mindmuse_api" {
  name          = "mindmuse-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id                   = aws_apigatewayv2_api.mindmuse_api.id
  integration_type         = "AWS_PROXY"
  integration_uri          = aws_lambda_function.mindmuse_lambda.invoke_arn
  integration_method       = "POST"
  payload_format_version   = "2.0"
}

resource "aws_apigatewayv2_route" "lambda_route" {
  api_id    = aws_apigatewayv2_api.mindmuse_api.id
  route_key = "POST /log"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "lambda_route_options" {
  api_id    = aws_apigatewayv2_api.mindmuse_api.id
  route_key = "OPTIONS /log"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "lambda_route_get" {
  api_id    = aws_apigatewayv2_api.mindmuse_api.id
  route_key = "GET /log"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_stage" "default_stage" {
  api_id      = aws_apigatewayv2_api.mindmuse_api.id
  name        = "$default"
  auto_deploy = true

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_lambda_permission" "allow_apigw_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.mindmuse_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.mindmuse_api.execution_arn}/*/*"
}

resource "aws_elastic_beanstalk_application" "frontend" {
  name = "frontend"
}

resource "aws_s3_object" "frontend_zip" {
  bucket = aws_s3_bucket.pdf_bucket.bucket
  key    = "frontend.zip"
  source = "frontend.zip"
  etag   = filemd5("frontend.zip")
}

resource "aws_elastic_beanstalk_application_version" "frontend_v4" {
  name        = "v4"
  application = aws_elastic_beanstalk_application.frontend.name
  description = "Frontend version 4"

  bucket = aws_s3_object.frontend_zip.bucket
  key    = aws_s3_object.frontend_zip.key

  depends_on = [aws_s3_object.frontend_zip]
}

resource "aws_elastic_beanstalk_environment" "frontend_env" {
  name                = "frontend-env"
  application         = aws_elastic_beanstalk_application.frontend.name
  solution_stack_name = "64bit Amazon Linux 2 v5.10.0 running Node.js 18"
  version_label       = aws_elastic_beanstalk_application_version.frontend_v4.name

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "IamInstanceProfile"
    value     = "aws-elasticbeanstalk-ec2-role"
  }

  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "REACT_APP_API_URL"
    value     = "${aws_apigatewayv2_api.mindmuse_api.api_endpoint}/log"
  }
}

resource "aws_dynamodb_table" "mood_logs" {
  name           = "MoodLogs"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Name = "MoodLogs"
  }
}
