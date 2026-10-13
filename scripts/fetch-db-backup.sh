#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.production}"
OUT_DIR="${OUT_DIR:-$HOME/mezon-tutors-backups}"
CLOUDINARY_FOLDER="${CLOUDINARY_FOLDER:-mezon-tutor/backup}"
PUBLIC_ID="${1:-${PUBLIC_ID:-}}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

env_get() {
  grep "^$1=" "$ENV_FILE" 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '\r"'"'"''
}

CLOUD_NAME="$(env_get CLOUDINARY_CLOUD_NAME)"
API_KEY="$(env_get CLOUDINARY_API_KEY)"
API_SECRET="$(env_get CLOUDINARY_API_SECRET)"
if [[ -z "$CLOUD_NAME" || -z "$API_KEY" || -z "$API_SECRET" ]]; then
  echo "CLOUDINARY_* keys not found in ${ENV_FILE}" >&2
  exit 1
fi

if [[ -z "$PUBLIC_ID" ]]; then
  PUBLIC_ID="$(curl -sS -f -u "${API_KEY}:${API_SECRET}" \
    "https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/raw?type=authenticated&prefix=${CLOUDINARY_FOLDER}&max_results=100" \
    | jq -r '.resources[].public_id' | sort | tail -n 1)"
  if [[ -z "$PUBLIC_ID" ]]; then
    echo "No backups found under ${CLOUDINARY_FOLDER}" >&2
    exit 1
  fi
elif [[ "$PUBLIC_ID" != */* ]]; then
  PUBLIC_ID="${CLOUDINARY_FOLDER}/${PUBLIC_ID}"
fi

SIG="$(printf '%s%s' "$PUBLIC_ID" "$API_SECRET" | openssl dgst -sha1 -binary | openssl base64 | tr '+/' '-_' | cut -c1-8)"
mkdir -p "$OUT_DIR"
OUT="${OUT_DIR}/$(basename "$PUBLIC_ID")"

echo "Downloading ${PUBLIC_ID}..."
curl -sS -f -L -o "$OUT" "https://res.cloudinary.com/${CLOUD_NAME}/raw/authenticated/s--${SIG}--/${PUBLIC_ID}"

if [[ "$(head -c 5 "$OUT")" != "PGDMP" ]]; then
  echo "Downloaded file is not a PostgreSQL custom dump: ${OUT}" >&2
  exit 1
fi

ls -lh "$OUT"
echo "DUMP=${OUT}"
