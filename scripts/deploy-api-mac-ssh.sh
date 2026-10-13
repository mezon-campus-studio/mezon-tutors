#!/usr/bin/env bash
set -euo pipefail

REMOTE="${REMOTE:-mac-remote}"
REMOTE_USER="${REMOTE_USER:-macbook}"
REMOTE_HOME="${REMOTE_HOME:-/Users/${REMOTE_USER}}"
APP_DIR="${APP_DIR:-${REMOTE_HOME}/mezon-tutors}"
DATA_DIR="${DATA_DIR:-${REMOTE_HOME}/mezon-tutors-data}"
ENV_FILE="${ENV_FILE:-.env.production}"
REF="${REF:-HEAD}"
KEEP_RELEASES="${KEEP_RELEASES:-3}"
TURBO_VERSION="${TURBO_VERSION:-1.13.4}"
SYNC_FILES="${SYNC_FILES:-1}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SHA="$(git rev-parse --short "${REF}")"
RELEASE="${APP_DIR}/releases/$(date +%Y%m%d%H%M%S)-${SHA}"

retry() {
  local attempt=1 status
  while true; do
    "$@" && return 0
    status=$?
    if (( status != 255 || attempt >= 5 )); then
      return "$status"
    fi
    echo "Connection to ${REMOTE} dropped (attempt ${attempt}), retrying..." >&2
    sleep $(( attempt * 3 ))
    attempt=$(( attempt + 1 ))
  done
}

if [[ "$SYNC_FILES" == "1" ]]; then
  LOCAL_STAGE="$(mktemp -d)"
  trap 'rm -rf "${LOCAL_STAGE}"' EXIT
  mkdir -p "${LOCAL_STAGE}/bin" "${LOCAL_STAGE}/deploy" "${LOCAL_STAGE}/shared"
  cp deploy/mac/run-api.sh deploy/mac/db-env.sh "${LOCAL_STAGE}/bin/"
  cp scripts/backup-db-mac.sh "${LOCAL_STAGE}/bin/backup-db.sh"
  cp deploy/Caddyfile "${LOCAL_STAGE}/deploy/Caddyfile"
  cp "${ENV_FILE}" "${LOCAL_STAGE}/shared/.env.production"
  SYNC_DIR="${APP_DIR}/shared/.sync"

  sync_files() {
    COPYFILE_DISABLE=1 tar -C "${LOCAL_STAGE}" -cf - . | ssh "${REMOTE}" "set -e
rm -rf ${SYNC_DIR}
mkdir -m 700 ${SYNC_DIR}
tar -xf - -C ${SYNC_DIR}
install -m 755 ${SYNC_DIR}/bin/run-api.sh ${SYNC_DIR}/bin/backup-db.sh ${APP_DIR}/bin/
install -m 644 ${SYNC_DIR}/bin/db-env.sh ${APP_DIR}/bin/
install -m 600 ${SYNC_DIR}/shared/.env.production ${APP_DIR}/shared/.env.production
if ! cmp -s ${SYNC_DIR}/deploy/Caddyfile ${APP_DIR}/deploy/Caddyfile; then
  ${APP_DIR}/tools/caddy validate --config ${SYNC_DIR}/deploy/Caddyfile --adapter caddyfile
  install -m 644 ${SYNC_DIR}/deploy/Caddyfile ${APP_DIR}/deploy/Caddyfile
  echo 'Caddyfile changed, restarting caddy...'
  sudo launchctl kickstart -k system/com.mezonly.caddy
fi
rm -rf ${SYNC_DIR}"
  }

  echo "Syncing env, Caddyfile and helper scripts to ${REMOTE}..."
  retry sync_files
fi

upload_source() {
  git archive --format=tar "${REF}" | ssh "${REMOTE}" "rm -rf ${RELEASE} && mkdir -p ${RELEASE}/src && tar -x -C ${RELEASE}/src"
}

build_release() {
  ssh "${REMOTE}" "APP_DIR='${APP_DIR}' RELEASE='${RELEASE}' TURBO_VERSION='${TURBO_VERSION}' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail
export PATH="${APP_DIR}/tools/node/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
export YARN_ENABLE_IMMUTABLE_INSTALLS=false
export YARN_ENABLE_GLOBAL_CACHE=true
export NODE_OPTIONS=--max-old-space-size=2048

rm -rf "${RELEASE}/out" "${RELEASE}/app"
cd "${RELEASE}/src"
yarn dlx "turbo@${TURBO_VERSION}" prune @mezon-tutors/api --docker --out-dir "${RELEASE}/out"

mkdir -p "${RELEASE}/app/scripts"
cp -R "${RELEASE}/out/full/." "${RELEASE}/app/"
cp "${RELEASE}/src/tsconfig.base.json" "${RELEASE}/app/tsconfig.base.json"
printf 'process.exit(0);\n' > "${RELEASE}/app/scripts/postinstall.js"
printf '%s\n' 'DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dummy?schema=public' > "${RELEASE}/app/packages/db/.env"

if [[ -f "${RELEASE}/out/yarn.lock" ]]; then
  cp "${RELEASE}/out/yarn.lock" "${RELEASE}/app/yarn.lock"
fi

cd "${RELEASE}/app"
yarn install
yarn turbo run build --filter=@mezon-tutors/api
test -f apps/api/dist/main.js
rm -rf "${RELEASE}/src" "${RELEASE}/out"
REMOTE_SCRIPT
}

echo "Uploading source ${REF} (${SHA}) to ${RELEASE}..."
retry upload_source

echo "Building on ${REMOTE}..."
retry build_release

echo "Activating release..."
retry ssh "${REMOTE}" "set -e; ln -sfn ${RELEASE}/app ${APP_DIR}/current; sudo launchctl bootout system/com.mezonly.api >/dev/null 2>&1 || true; sudo launchctl bootstrap system /Library/LaunchDaemons/com.mezonly.api.plist"

echo "Waiting for the API to become healthy..."
retry ssh "${REMOTE}" "for i in \$(seq 1 60); do curl -fsS -o /dev/null http://127.0.0.1:4000/api/health && echo healthy && exit 0; sleep 3; done; echo 'api did not become healthy' >&2; tail -n 80 ${DATA_DIR}/logs/api.log >&2; exit 1"

echo "Pruning old releases (keeping ${KEEP_RELEASES})..."
retry ssh "${REMOTE}" "ls -1dt ${APP_DIR}/releases/*/ 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)) | xargs -I{} rm -rf {}"

echo "Done. Running release: ${RELEASE}"
