#!/usr/bin/env bash
set -euo pipefail

REMOTE="${REMOTE:-mac-remote}"
REMOTE_USER="${REMOTE_USER:-macbook}"
REMOTE_HOME="${REMOTE_HOME:-/Users/${REMOTE_USER}}"
APP_DIR="${APP_DIR:-${REMOTE_HOME}/mezon-tutors}"
DATA_DIR="${DATA_DIR:-${REMOTE_HOME}/mezon-tutors-data}"
DUMP="${DUMP:-${1:-}}"

if [[ -z "$DUMP" ]]; then
  echo "DUMP is required, e.g. DUMP=~/mezon-tutors-backups/mezon-20261012.dump $0" >&2
  exit 1
fi
if [[ ! -f "$DUMP" ]]; then
  echo "Dump file not found: $DUMP" >&2
  exit 1
fi

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

wait_for_postgres() {
  ssh "${REMOTE}" "APP_DIR='${APP_DIR}' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail
. "${APP_DIR}/bin/db-env.sh"
for _ in $(seq 1 30); do
  pg_isready >/dev/null 2>&1 && exit 0
  sleep 2
done
echo "postgres never became ready" >&2
exit 1
REMOTE_SCRIPT
}

restore_dump() {
  gzip -1 -c "$DUMP" | ssh "${REMOTE}" "bash -c '. ${APP_DIR}/bin/db-env.sh && gunzip -c | pg_restore -d \"\$PGDATABASE\" --clean --if-exists --no-owner --no-acl'"
}

row_counts() {
  ssh "${REMOTE}" "APP_DIR='${APP_DIR}' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail
. "${APP_DIR}/bin/db-env.sh"
psql -tA -c "SELECT 'users' AS t, count(*) FROM users
UNION ALL SELECT 'tutor_profiles', count(*) FROM tutor_profiles
UNION ALL SELECT 'transactions', count(*) FROM transactions
UNION ALL SELECT 'applied_migrations', count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL"
REMOTE_SCRIPT
}

echo "Stopping api so nothing writes during the restore..."
retry ssh "${REMOTE}" "sudo launchctl bootout system/com.mezonly.api >/dev/null 2>&1 || true"

echo "Waiting for postgres..."
retry wait_for_postgres

echo "Restoring $(basename "$DUMP")..."
retry restore_dump

echo "Row counts after restore:"
retry row_counts

if retry ssh "${REMOTE}" "test -e ${APP_DIR}/current"; then
  echo "Starting api (run-api.sh runs prisma migrate deploy first)..."
  retry ssh "${REMOTE}" "sudo launchctl bootstrap system /Library/LaunchDaemons/com.mezonly.api.plist"
  retry ssh "${REMOTE}" "for i in \$(seq 1 60); do curl -fsS -o /dev/null http://127.0.0.1:4000/api/health && echo healthy && exit 0; sleep 3; done; echo 'api did not become healthy' >&2; tail -n 80 ${DATA_DIR}/logs/api.log >&2; exit 1"
else
  echo "No release deployed yet; run ./scripts/deploy-api-mac-ssh.sh next."
fi

echo "Done."
