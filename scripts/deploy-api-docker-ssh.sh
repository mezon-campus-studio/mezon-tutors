set -euo pipefail

IMAGE_NAME="${IMAGE_NAME:-mezon-tutors-api:latest}"
DOCKER_PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"
REMOTE="${REMOTE:-root@167.233.106.79}"
REMOTE_DIR="${REMOTE_DIR:-/root/mezon-tutors}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.api.prod.yml}"
SYNC_FILES="${SYNC_FILES:-1}"
DEPLOY_NGINX="${DEPLOY_NGINX:-1}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ "$SYNC_FILES" == "1" ]]; then
  echo "Syncing compose, nginx, and env files to ${REMOTE}:${REMOTE_DIR}..."
  ssh "${REMOTE}" "mkdir -p ${REMOTE_DIR}/deploy"
  scp "${COMPOSE_FILE}" .env.production "${REMOTE}:${REMOTE_DIR}/"
  scp deploy/nginx-mezonly.com.conf deploy/nginx-mezonly.com.phase1-http.conf "${REMOTE}:${REMOTE_DIR}/deploy/"
fi

echo "Building ${IMAGE_NAME} (${DOCKER_PLATFORM})..."
docker build --platform "${DOCKER_PLATFORM}" -f Dockerfile.api -t "${IMAGE_NAME}" .

echo "Streaming image to ${REMOTE} (docker load)..."
docker save "${IMAGE_NAME}" | gzip -1 | ssh "${REMOTE}" 'gunzip -c | docker load'

echo "Recreating postgres/api containers on ${REMOTE}..."
ssh "${REMOTE}" "cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} up -d --no-build --force-recreate postgres api"

if [[ "$DEPLOY_NGINX" == "1" ]]; then
  echo "Recreating nginx container on ${REMOTE}..."
  ssh "${REMOTE}" "cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} up -d --no-build --force-recreate nginx"
else
  echo "Skipping nginx recreate because DEPLOY_NGINX=${DEPLOY_NGINX}."
fi

echo "Done."
