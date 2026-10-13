APP_DIR="${APP_DIR:-$HOME/mezon-tutors}"
PG_BIN="${PG_BIN:-/Applications/Postgres.app/Contents/Versions/17/bin}"
ENV_FILE="${ENV_FILE:-$APP_DIR/shared/.env.production}"

export PATH="$PG_BIN:$PATH"

env_get() {
  grep "^$1=" "$ENV_FILE" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '\r"'"'"''
}

export PGHOST=127.0.0.1
export PGPORT=5432
PGUSER="$(env_get POSTGRES_USER)"
export PGUSER="${PGUSER:-postgres}"
PGDATABASE="$(env_get POSTGRES_DB)"
export PGDATABASE="${PGDATABASE:-mezon-tutors}"
PGPASSWORD="$(env_get POSTGRES_PASSWORD)"
export PGPASSWORD
