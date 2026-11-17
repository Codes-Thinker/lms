#!/usr/bin/env bash
# Postgres backup helper for Codes Thinker LMS.
# Requires: pg_dump, DATABASE_URL in env (or apps/api/.env).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${BACKUP_DIR:-$ROOT/backups}"
mkdir -p "$OUT_DIR"
FILE="$OUT_DIR/lms-$STAMP.sql.gz"

echo "Writing $FILE"
pg_dump "$DATABASE_URL" --no-owner --format=plain | gzip -c > "$FILE"
echo "Done ($(du -h "$FILE" | awk '{print $1}'))"
echo "Restore example:"
echo "  gunzip -c \"$FILE\" | psql \"\$DATABASE_URL\""
