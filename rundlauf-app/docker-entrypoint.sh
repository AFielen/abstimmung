#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] Running database migrations…"
  npx --no-install tsx ./lib/db/migrate.ts
else
  echo "[entrypoint] WARNING: DATABASE_URL not set – skipping migrations"
fi

echo "[entrypoint] Starting Next.js…"
exec "$@"
