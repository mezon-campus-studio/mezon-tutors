#!/bin/bash
set -eu

APP_DIR="${APP_DIR:-$HOME/mezon-tutors}"
DATA_DIR="${DATA_DIR:-$HOME/mezon-tutors-data}"
BACKUP_DIR="${BACKUP_DIR:-$DATA_DIR/backups}"
CLOUDINARY_FOLDER="${CLOUDINARY_FOLDER:-mezon-tutor/backup}"
KEEP_DAYS="${KEEP_DAYS:-7}"

. "$APP_DIR/bin/db-env.sh"

CLOUD_NAME="$(env_get CLOUDINARY_CLOUD_NAME)"
API_KEY="$(env_get CLOUDINARY_API_KEY)"
API_SECRET="$(env_get CLOUDINARY_API_SECRET)"

if [ -z "$CLOUD_NAME" ] || [ -z "$API_KEY" ] || [ -z "$API_SECRET" ]; then
  echo "ERROR: CLOUDINARY_* keys not found in $ENV_FILE" >&2
  exit 1
fi

TODAY="$(date +%Y%m%d)"
FILE="$BACKUP_DIR/mezon-$TODAY.dump"
mkdir -p "$BACKUP_DIR"

pg_dump -Fc "$PGDATABASE" > "$FILE"

TS="$(date +%s)"
PUBLIC_ID="mezon-$TODAY.dump"
SIG="$(printf 'folder=%s&public_id=%s&timestamp=%s&type=authenticated%s' \
  "$CLOUDINARY_FOLDER" "$PUBLIC_ID" "$TS" "$API_SECRET" | shasum -a 1 | cut -d' ' -f1)"

curl -sS -f -o /dev/null -X POST "https://api.cloudinary.com/v1_1/$CLOUD_NAME/raw/upload" \
  -F "file=@$FILE" \
  -F "api_key=$API_KEY" \
  -F "timestamp=$TS" \
  -F "public_id=$PUBLIC_ID" \
  -F "folder=$CLOUDINARY_FOLDER" \
  -F "type=authenticated" \
  -F "signature=$SIG"

find "$BACKUP_DIR" -name 'mezon-*.dump' -mtime +"$KEEP_DAYS" -delete

OLD_ID="$CLOUDINARY_FOLDER/mezon-$(date -v-$((KEEP_DAYS + 1))d +%Y%m%d).dump"
TS="$(date +%s)"
SIG="$(printf 'public_id=%s&timestamp=%s&type=authenticated%s' "$OLD_ID" "$TS" "$API_SECRET" | shasum -a 1 | cut -d' ' -f1)"
curl -sS -o /dev/null -X POST "https://api.cloudinary.com/v1_1/$CLOUD_NAME/raw/destroy" \
  -F "api_key=$API_KEY" \
  -F "timestamp=$TS" \
  -F "public_id=$OLD_ID" \
  -F "type=authenticated" \
  -F "signature=$SIG" || true

echo "$(date '+%Y-%m-%d %H:%M:%S') OK: $FILE ($(du -h "$FILE" | cut -f1)) -> Cloudinary $CLOUDINARY_FOLDER/mezon-$TODAY.dump"
