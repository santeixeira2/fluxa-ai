#!/bin/bash
# Usage: ./infra/deploy.sh <EC2_IP>
# Builds images locally, pushes to Docker Hub, and deploys to EC2.
# Requires: docker login (run once before first deploy)

set -e

EC2_IP="${1:?Usage: $0 <EC2_IP>}"
EC2_USER="ubuntu"
KEY="$HOME/fluxa/infra/.fluxa-key.pem"
DOCKERHUB_USER="santeixeira2"

echo "==> Building images..."
docker build -t "$DOCKERHUB_USER/fluxa-api:latest" ./fluxa-api
docker build -t "$DOCKERHUB_USER/fluxa-ui:latest" ./fluxa-ui

echo "==> Pushing to Docker Hub..."
docker push "$DOCKERHUB_USER/fluxa-api:latest"
docker push "$DOCKERHUB_USER/fluxa-ui:latest"

echo "==> Deploying to EC2 ($EC2_IP)..."
ssh -i "$KEY" "$EC2_USER@$EC2_IP" "
  cd ~/fluxa &&
  git pull &&
  docker compose pull &&
  docker compose up -d
"

echo "==> Done. App running at http://$EC2_IP"
