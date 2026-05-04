variable "aws_region" {
  default = "us-east-1"
}

variable "instance_type" {
  default = "t2.micro"
}

variable "key_pair_name" {
  default = "fluxa-key"
}

variable "ssh_allowed_cidr" {
  description = "Your IP in CIDR notation (ex: 189.x.x.x/32)"
  type        = string
}

variable "alert_email" {
  description = "Email to receive infrastructure alerts"
  type        = string
  default     = "santhiago2k17@gmail.com"
}
