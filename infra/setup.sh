#!/bin/bash
set -e

echo "==> Updating system..."
sudo sed -i 's|http://archive.ubuntu.com|http://us-east-1.ec2.archive.ubuntu.com|g' /etc/apt/sources.list.d/ubuntu.sources 2>/dev/null || true
sudo apt-get update -q

echo "==> Installing Docker..."
sudo apt-get install -y -q ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt-get update -q
sudo apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "==> Configuring Docker..."
sudo usermod -aG docker "$USER"

echo "==> Cloning repository..."
if [ -d ~/fluxa ]; then
  echo "    repo already exists, pulling latest..."
  git -C ~/fluxa pull
else
  git clone https://github.com/santeixeira2/fluxa.git ~/fluxa
fi

echo ""
echo "========================================"
echo "  Setup concluido!"
echo "========================================"
echo ""
echo "Proximos passos:"
echo "  1. Crie os arquivos .env:"
echo "       ~/fluxa/fluxa-api/.env"
echo "       ~/fluxa/fluxa-ml/.env"
echo ""
echo "  2. Saia e reconecte para aplicar o grupo docker:"
echo "       exit"
echo "       ssh -i fluxa-key.pem ubuntu@16.59.121.219"
echo ""
echo "  3. Suba a aplicacao:"
echo "       cd ~/fluxa && docker compose up --build -d"
echo ""
