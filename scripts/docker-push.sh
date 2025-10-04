#!/usr/bin/env bash

set -euo pipefail

IMAGE_NAME="${1:-health-hub/app}"
IMAGE_TAG="${2:-latest}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

echo "==> Building image: $IMAGE_NAME:$IMAGE_TAG"
docker build -t "$IMAGE_NAME:$IMAGE_TAG" -f Dockerfile .

echo "==> Pushing image: $IMAGE_NAME:$IMAGE_TAG"
docker push "$IMAGE_NAME:$IMAGE_TAG"

echo "==> Done"


