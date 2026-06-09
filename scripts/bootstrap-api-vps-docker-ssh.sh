#!/usr/bin/env bash
# First-time Docker deployment for the API VPS.
# It installs Docker if missing, syncs deploy files, uploads the locally-built API image,
# starts postgres/api, issues TLS certs via Dockerized certbot, and starts nginx.
set -euo pipefail

IMAGE_NAME="${IMAGE_NAME:-mezon-tutors-api:latest}"
DOCKER_PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"
REMOTE="${REMOTE:-root@167.233.106.79}"
REMOTE_DIR="${REMOTE_DIR:-/root/mezon-tutors}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.api.prod.yml}"
DOMAINS="${DOMAINS:-api.mezonly.com gw.mezonly.com}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
CERTBOT_STAGING="${CERTBOT_STAGING:-0}"

if [[ -z "$CERTBOT_EMAIL" ]]; then
  echo "CERTBOT_EMAIL is required, e.g. CERTBOT_EMAIL=mezonly.support@gmail.com $0" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Preparing Docker on ${REMOTE}..."
ssh "${REMOTE}" '
  set -e
  export DEBIAN_FRONTEND=noninteractive
  if ! command -v docker >/dev/null 2>&1; then
    apt-get update
    apt-get install -y docker.io
  fi
  if ! docker compose version >/dev/null 2>&1; then
    apt-get update
    apt-get install -y docker-compose-v2 || apt-get install -y docker-compose-plugin
  fi
  systemctl enable --now docker
'

echo "Syncing compose, nginx, and env files to ${REMOTE}:${REMOTE_DIR}..."
ssh "${REMOTE}" "mkdir -p ${REMOTE_DIR}/deploy"
scp "${COMPOSE_FILE}" .env.production "${REMOTE}:${REMOTE_DIR}/"
scp deploy/nginx-mezonly.com.conf deploy/nginx-mezonly.com.phase1-http.conf "${REMOTE}:${REMOTE_DIR}/deploy/"

echo "Building ${IMAGE_NAME} (${DOCKER_PLATFORM})..."
docker build --platform "${DOCKER_PLATFORM}" -f Dockerfile.api -t "${IMAGE_NAME}" .

echo "Streaming image to ${REMOTE} (docker load)..."
docker save "${IMAGE_NAME}" | gzip -1 | ssh "${REMOTE}" 'gunzip -c | docker load'

echo "Starting postgres/api..."
ssh "${REMOTE}" "cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} up -d --no-build postgres api"

echo "Starting HTTP bootstrap nginx for ACME challenges..."
ssh "${REMOTE}" "cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} --profile bootstrap up -d nginx-bootstrap"

CERTBOT_EXTRA_ARGS=""
if [[ "$CERTBOT_STAGING" == "1" ]]; then
  CERTBOT_EXTRA_ARGS="--staging"
fi

for domain in $DOMAINS; do
  echo "Issuing/refreshing TLS certificate for ${domain}..."
  ssh "${REMOTE}" "cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} run --rm certbot certonly --webroot -w /var/www/certbot -d ${domain} --email ${CERTBOT_EMAIL} --agree-tos --no-eff-email --non-interactive --keep-until-expiring ${CERTBOT_EXTRA_ARGS}"
done

echo "Switching from bootstrap nginx to HTTPS nginx..."
ssh "${REMOTE}" "cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} --profile bootstrap stop nginx-bootstrap && docker compose -f ${COMPOSE_FILE} --profile bootstrap rm -f nginx-bootstrap && docker compose -f ${COMPOSE_FILE} up -d --no-build nginx"

echo "Current remote containers:"
ssh "${REMOTE}" "cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} ps"

echo "Done."
