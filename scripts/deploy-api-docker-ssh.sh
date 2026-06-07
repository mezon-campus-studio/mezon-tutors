#!/usr/bin/env bash
# Build API image locally, stream it to the server over SSH, reload, restart api service.
# Prereqs: Docker local + remote, SSH key for REMOTE, server has repo at REMOTE_DIR with
# docker-compose.api.prod.yml and .env.production (DATABASE_URL, etc.).
set -euo pipefail

IMAGE_NAME="${IMAGE_NAME:-mezon-tutors-api:latest}"
# VPS thường là x86_64; build trên Mac ARM mặc định ra arm64 → exec format error trên server.
DOCKER_PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"
REMOTE="${REMOTE:-root@165.22.251.164}"
REMOTE_DIR="${REMOTE_DIR:-/root/mezon-tutors}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.api.prod.yml}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Building ${IMAGE_NAME} (${DOCKER_PLATFORM})..."
docker build --platform "${DOCKER_PLATFORM}" -f Dockerfile.api -t "${IMAGE_NAME}" .

echo "Streaming image to ${REMOTE} (docker load)..."
docker save "${IMAGE_NAME}" | gzip -1 | ssh "${REMOTE}" 'gunzip -c | docker load'

echo "Recreating api container on ${REMOTE}..."
ssh "${REMOTE}" "cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} up -d --no-build --force-recreate api"

echo "Done."
