#!/usr/bin/env sh
set -e
mkdir -p /data /data/images
echo "[start] running migrations"
bun /app/scripts/migrate.ts
echo "[start] launching server on :${PORT:-3000}"
exec bun /app/.output/server/index.mjs
