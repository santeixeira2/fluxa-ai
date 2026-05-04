output "public_ip" {
  value = aws_eip.fluxa_eip.public_ip
}

output "ssh_command" {
  value = "ssh -i ../infra/.fluxa-key.pem ubuntu@${aws_eip.fluxa_eip.public_ip}"
}
