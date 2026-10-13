#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/mezon-tutors}"
PG_BIN="${PG_BIN:-/Applications/Postgres.app/Contents/Versions/17/bin}"
ENV_FILE="${ENV_FILE:-$APP_DIR/shared/.env.production}"

export PATH="$APP_DIR/tools/node/bin:$PG_BIN:/usr/bin:/bin:/usr/sbin:/sbin"
export NODE_ENV=production

load_env_file() {
  local line key value
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    [[ "$line" == *=* ]] || continue
    key="${line%%=*}"
    value="${line#*=}"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    if [[ "$value" =~ ^\"(.*)\"$ ]] || [[ "$value" =~ ^\'(.*)\'$ ]]; then
      value="${BASH_REMATCH[1]}"
    fi
    export "$key=$value"
  done < "$1"
}

load_env_file "$ENV_FILE"

for _ in $(seq 1 60); do
  if pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
pg_isready -h 127.0.0.1 -p 5432

cd "$APP_DIR/current/packages/db"
npx prisma migrate deploy

cd "$APP_DIR/current/apps/api"
exec node dist/main.js
