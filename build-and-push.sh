#!/bin/bash

# FaceBlog - Build and Push Script for Registry
# Builds Docker images and pushes to registry.fbrlive.xyz

set -e

# Configuration
REGISTRY="registry.fbrlive.xyz"
PROJECT="faceblog"
TAG="${1:-$(date +%Y-%m-%d)}"

echo "🚀 Building and pushing FaceBlog images..."
echo "Registry: $REGISTRY"
echo "Tag: $TAG"

# Build Backend
echo "📦 Building backend image..."
cd backend
docker build -t $REGISTRY/$PROJECT-backend:$TAG .
docker build -t $REGISTRY/$PROJECT-backend:latest .

# Build Frontend
echo "📦 Building frontend image..."
cd ../frontend
docker build -t $REGISTRY/$PROJECT-frontend:$TAG .
docker build -t $REGISTRY/$PROJECT-frontend:latest .

# Push images
echo "⬆️ Pushing images to registry..."
docker push $REGISTRY/$PROJECT-backend:$TAG
docker push $REGISTRY/$PROJECT-backend:latest
docker push $REGISTRY/$PROJECT-frontend:$TAG
docker push $REGISTRY/$PROJECT-frontend:latest

echo "✅ Build and push completed!"
echo ""
echo "Images pushed:"
echo "  - $REGISTRY/$PROJECT-backend:$TAG"
echo "  - $REGISTRY/$PROJECT-frontend:$TAG"
echo ""
echo "Update docker-compose.yml with:"
echo "  backend: image: $REGISTRY/$PROJECT-backend:$TAG"
echo "  frontend: image: $REGISTRY/$PROJECT-frontend:$TAG"
