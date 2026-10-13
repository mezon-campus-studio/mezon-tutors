#!/usr/bin/env bash
set -euo pipefail

REMOTE="${REMOTE:-mac-remote}"
REMOTE_USER="${REMOTE_USER:-macbook}"
REMOTE_HOME="${REMOTE_HOME:-/Users/${REMOTE_USER}}"
APP_DIR="${APP_DIR:-${REMOTE_HOME}/mezon-tutors}"
DATA_DIR="${DATA_DIR:-${REMOTE_HOME}/mezon-tutors-data}"
ENV_FILE="${ENV_FILE:-.env.production}"
NODE_VERSION="${NODE_VERSION:-22.23.3}"
YARN_VERSION="${YARN_VERSION:-4.11.0}"
POSTGRES_APP_VERSION="${POSTGRES_APP_VERSION:-2.9.6}"
CLOUDFLARED_VERSION="${CLOUDFLARED_VERSION:-2026.10.0}"
CADDY_DOWNLOAD_URL="${CADDY_DOWNLOAD_URL:-https://caddyserver.com/api/download?os=darwin&arch=amd64&p=github.com%2Fcaddyserver%2Freplace-response}"
CLOUDFLARE_TUNNEL_TOKEN="${CLOUDFLARE_TUNNEL_TOKEN:-}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing ${ENV_FILE} in ${ROOT}" >&2
  exit 1
fi

STAGE="${REMOTE_HOME}/.mezon-bootstrap"

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

LOCAL_STAGE="$(mktemp -d)"
trap 'rm -rf "${LOCAL_STAGE}"' EXIT
mkdir -p "${LOCAL_STAGE}/bin" "${LOCAL_STAGE}/deploy" "${LOCAL_STAGE}/shared"
cp deploy/mac/com.mezonly.*.plist "${LOCAL_STAGE}/"
cp deploy/mac/run-api.sh deploy/mac/db-env.sh "${LOCAL_STAGE}/bin/"
cp scripts/backup-db-mac.sh "${LOCAL_STAGE}/bin/backup-db.sh"
cp deploy/Caddyfile "${LOCAL_STAGE}/deploy/Caddyfile"
cp "${ENV_FILE}" "${LOCAL_STAGE}/shared/.env.production"
if [[ -n "$CLOUDFLARE_TUNNEL_TOKEN" ]]; then
  (umask 077 && printf '%s' "$CLOUDFLARE_TUNNEL_TOKEN" > "${LOCAL_STAGE}/tunnel-token")
fi

stage_files() {
  COPYFILE_DISABLE=1 tar -C "${LOCAL_STAGE}" -cf - . | ssh "${REMOTE}" "set -e
mkdir -p ${APP_DIR}/bin ${APP_DIR}/deploy ${APP_DIR}/shared ${APP_DIR}/tools ${APP_DIR}/releases ${DATA_DIR}/logs ${DATA_DIR}/backups ${DATA_DIR}/caddy ${STAGE}
chmod 700 ${STAGE}
tar -xf - -C ${STAGE}
install -m 755 ${STAGE}/bin/run-api.sh ${STAGE}/bin/backup-db.sh ${APP_DIR}/bin/
install -m 644 ${STAGE}/bin/db-env.sh ${APP_DIR}/bin/
install -m 644 ${STAGE}/deploy/Caddyfile ${APP_DIR}/deploy/Caddyfile
install -m 600 ${STAGE}/shared/.env.production ${APP_DIR}/shared/.env.production
rm -rf ${STAGE}/bin ${STAGE}/deploy ${STAGE}/shared"
}

run_bootstrap() {
  ssh "${REMOTE}" "REMOTE_USER='${REMOTE_USER}' REMOTE_HOME='${REMOTE_HOME}' APP_DIR='${APP_DIR}' DATA_DIR='${DATA_DIR}' STAGE='${STAGE}' NODE_VERSION='${NODE_VERSION}' YARN_VERSION='${YARN_VERSION}' POSTGRES_APP_VERSION='${POSTGRES_APP_VERSION}' CLOUDFLARED_VERSION='${CLOUDFLARED_VERSION}' CADDY_DOWNLOAD_URL='${CADDY_DOWNLOAD_URL}' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

PG_BIN=/Applications/Postgres.app/Contents/Versions/17/bin
export PATH="${APP_DIR}/tools/node/bin:${PG_BIN}:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

. "${APP_DIR}/bin/db-env.sh"
if [[ -z "$PGPASSWORD" ]]; then
  echo "POSTGRES_PASSWORD missing in ${APP_DIR}/shared/.env.production" >&2
  exit 1
fi

echo "== Node ${NODE_VERSION}"
if [[ "$("${APP_DIR}/tools/node/bin/node" -v 2>/dev/null || true)" != "v${NODE_VERSION}" ]]; then
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-x64.tar.gz" -o "${STAGE}/node.tar.gz"
  rm -rf "${STAGE}/node-extract"
  mkdir -p "${STAGE}/node-extract"
  tar -xzf "${STAGE}/node.tar.gz" -C "${STAGE}/node-extract"
  rm -rf "${APP_DIR}/tools/node"
  mv "${STAGE}/node-extract/node-v${NODE_VERSION}-darwin-x64" "${APP_DIR}/tools/node"
  rm -rf "${STAGE}/node.tar.gz" "${STAGE}/node-extract"
fi
corepack enable
corepack prepare "yarn@${YARN_VERSION}" --activate
echo "node $(node -v), yarn $(cd / && yarn -v)"

echo "== Postgres.app ${POSTGRES_APP_VERSION}"
if [[ ! -x "${PG_BIN}/postgres" ]]; then
  curl -fsSL "https://github.com/PostgresApp/PostgresApp/releases/download/v${POSTGRES_APP_VERSION}/Postgres-${POSTGRES_APP_VERSION}-17.dmg" -o "${STAGE}/postgres.dmg"
  MOUNT="${STAGE}/pgmount"
  mkdir -p "${MOUNT}"
  hdiutil attach -nobrowse -quiet -mountpoint "${MOUNT}" "${STAGE}/postgres.dmg"
  sudo rm -rf /Applications/Postgres.app
  sudo cp -R "${MOUNT}/Postgres.app" /Applications/
  hdiutil detach -quiet "${MOUNT}"
  rm -rf "${STAGE}/postgres.dmg" "${MOUNT}"
fi
"${PG_BIN}/postgres" --version

echo "== Caddy"
if [[ ! -x "${APP_DIR}/tools/caddy" ]]; then
  curl -fsSL "${CADDY_DOWNLOAD_URL}" -o "${APP_DIR}/tools/caddy.download"
  chmod +x "${APP_DIR}/tools/caddy.download"
  mv "${APP_DIR}/tools/caddy.download" "${APP_DIR}/tools/caddy"
fi
"${APP_DIR}/tools/caddy" version
if ! "${APP_DIR}/tools/caddy" list-modules | grep -qx 'http.handlers.replace_response'; then
  echo "Caddy binary lacks the replace_response module" >&2
  exit 1
fi
"${APP_DIR}/tools/caddy" validate --config "${APP_DIR}/deploy/Caddyfile" --adapter caddyfile

echo "== cloudflared ${CLOUDFLARED_VERSION}"
if [[ "$(/usr/local/bin/cloudflared --version 2>/dev/null | awk '{print $3}' || true)" != "${CLOUDFLARED_VERSION}" ]]; then
  curl -fsSL "https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/cloudflared-darwin-amd64.tgz" -o "${STAGE}/cloudflared.tgz"
  tar -xzf "${STAGE}/cloudflared.tgz" -C "${STAGE}"
  sudo mkdir -p /usr/local/bin
  sudo install -m 755 "${STAGE}/cloudflared" /usr/local/bin/cloudflared
  rm -f "${STAGE}/cloudflared.tgz" "${STAGE}/cloudflared"
fi
/usr/local/bin/cloudflared --version

echo "== PostgreSQL data directory"
if [[ ! -f "${DATA_DIR}/pg17/PG_VERSION" ]]; then
  PWFILE="${STAGE}/pgpass.txt"
  (umask 077 && printf '%s\n' "$PGPASSWORD" > "${PWFILE}")
  "${PG_BIN}/initdb" -D "${DATA_DIR}/pg17" -U "$PGUSER" --auth-local=scram-sha-256 --auth-host=scram-sha-256 --pwfile="${PWFILE}" -E UTF-8 --locale=en_US.UTF-8
  rm -f "${PWFILE}"
  printf "listen_addresses = 'localhost'\nport = 5432\n" >> "${DATA_DIR}/pg17/postgresql.conf"
fi

echo "== LaunchDaemons"
daemon_loaded() {
  sudo launchctl print "system/$1" >/dev/null 2>&1
}
install_daemon() {
  local label="$1" rendered="${STAGE}/$1.rendered.plist" target="/Library/LaunchDaemons/$1.plist"
  sed -e "s#__HOME__#${REMOTE_HOME}#g" -e "s#__USER__#${REMOTE_USER}#g" "${STAGE}/${label}.plist" > "${rendered}"
  plutil -lint "${rendered}" >/dev/null
  if sudo cmp -s "${rendered}" "${target}"; then
    return 1
  fi
  sudo install -o root -g wheel -m 644 "${rendered}" "${target}"
  return 0
}
reload_daemon() {
  sudo launchctl bootout "system/$1" >/dev/null 2>&1 || true
  sudo launchctl bootstrap system "/Library/LaunchDaemons/$1.plist"
  echo "loaded $1"
}
sync_daemon() {
  local label="$1" changed=0
  install_daemon "${label}" && changed=1
  if [[ "${changed}" == 1 ]] || ! daemon_loaded "${label}"; then
    reload_daemon "${label}"
  else
    echo "unchanged $label"
  fi
}

sync_daemon com.mezonly.postgres
sync_daemon com.mezonly.caddy
sync_daemon com.mezonly.backup
if [[ -e "${APP_DIR}/current" ]]; then
  sync_daemon com.mezonly.api
else
  install_daemon com.mezonly.api || true
  echo "com.mezonly.api installed but not started: no release deployed yet"
fi

echo "== Database ${PGDATABASE}"
for _ in $(seq 1 30); do
  pg_isready >/dev/null 2>&1 && break
  sleep 2
done
pg_isready
if ! psql -d postgres -tAc "select 1 from pg_database where datname = '${PGDATABASE}'" | grep -qx 1; then
  createdb "${PGDATABASE}"
  echo "created database ${PGDATABASE}"
fi

echo "== Power settings"
sudo pmset -c sleep 0 disksleep 0 displaysleep 5
sudo pmset -a disablesleep 1 womp 1
sudo pmset -a autorestart 1 >/dev/null 2>&1 || true

echo "== Cloudflare Tunnel"
if [[ -s "${STAGE}/tunnel-token" ]]; then
  TOKEN="$(cat "${STAGE}/tunnel-token")"
  rm -f "${STAGE}/tunnel-token"
  if [[ -f /Library/LaunchDaemons/com.cloudflare.cloudflared.plist ]]; then
    sudo /usr/local/bin/cloudflared service uninstall >/dev/null 2>&1 || true
  fi
  sudo /usr/local/bin/cloudflared service install "${TOKEN}"
  echo "cloudflared service installed"
elif [[ -f /Library/LaunchDaemons/com.cloudflare.cloudflared.plist ]]; then
  echo "cloudflared service already installed, token not changed"
else
  echo "no CLOUDFLARE_TUNNEL_TOKEN given: tunnel not installed yet"
fi

echo
echo "Daemons:"
for label in com.mezonly.postgres com.mezonly.caddy com.mezonly.backup com.mezonly.api com.cloudflare.cloudflared; do
  if daemon_loaded "${label}"; then
    echo "  ${label}: loaded"
  else
    echo "  ${label}: not loaded"
  fi
done
REMOTE_SCRIPT
}

echo "Staging files on ${REMOTE}..."
retry stage_files

echo "Bootstrapping ${REMOTE}..."
retry run_bootstrap

echo
echo "Bootstrap done. Next:"
echo "  DUMP=<file> ./scripts/restore-db-mac.sh    # load the latest Cloudinary dump"
echo "  ./scripts/deploy-api-mac-ssh.sh            # build + start the API"
