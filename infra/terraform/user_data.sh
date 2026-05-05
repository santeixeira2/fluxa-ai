#!/bin/bash
set -e

# 2GB swap to prevent OOM on t2.micro
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

sed -i 's|http://archive.ubuntu.com|http://us-east-1.ec2.archive.ubuntu.com|g' /etc/apt/sources.list.d/ubuntu.sources 2>/dev/null || true
apt-get update -q

apt-get install -y -q ca-certificates curl gnupg git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | tee /etc/apt/sources.list.d/docker.list
apt-get update -q
apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin

usermod -aG docker ubuntu

sudo -u ubuntu git clone https://github.com/santeixeira2/fluxa-ai.git /home/ubuntu/fluxa

# After provisioning, complete setup manually:
#   1. scp -i <key.pem> fluxa-api/.env ubuntu@<IP>:~/fluxa/fluxa-api/.env
#   2. ssh in and run: cd ~/fluxa && docker compose pull && docker compose up -d
