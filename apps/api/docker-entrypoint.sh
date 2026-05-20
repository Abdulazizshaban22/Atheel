#!/bin/sh
set -e

# Wave40: optional auto-migration (recommended to run as a separate deploy step)
if [ "${MIGRATE_ON_START}" = "true" ] || [ "${MIGRATE_ON_START}" = "1" ]; then
  echo "[atheel-api] running prisma migrate deploy..."
  pnpm --filter @madar/db prisma:generate
  pnpm --filter @madar/db prisma:migrate:deploy
fi

exec pnpm --filter @madar/api start:prod
