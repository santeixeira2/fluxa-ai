resource "aws_sns_topic" "fluxa_alerts" {
  name = "fluxa-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.fluxa_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_sns_topic_policy" "allow_eventbridge" {
  arn = aws_sns_topic.fluxa_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action    = "sns:Publish"
      Resource  = aws_sns_topic.fluxa_alerts.arn
    }]
  })
}

resource "aws_cloudwatch_event_rule" "instance_stopped" {
  name        = "fluxa-instance-stopped"
  description = "Fires when fluxa-server stops (EIP starts billing)"

  event_pattern = jsonencode({
    source      = ["aws.ec2"]
    "detail-type" = ["EC2 Instance State-change Notification"]
    detail = {
      state       = ["stopped"]
      instance-id = [aws_instance.fluxa_server.id]
    }
  })
}

resource "aws_cloudwatch_event_target" "notify_sns" {
  rule      = aws_cloudwatch_event_rule.instance_stopped.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.fluxa_alerts.arn
}
