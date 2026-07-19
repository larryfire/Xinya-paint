#!/bin/sh
set -e

echo "=== Entrypoint Starting ==="
echo "DATABASE_URL: ${DATABASE_URL:-(not set)}"
echo "NODE_ENV: ${NODE_ENV:-(not set)}"

# 使用 prisma db push 从 schema 同步表结构（无需迁移文件）
echo ">>> Syncing database schema with Prisma..."
npx prisma db push --accept-data-loss

echo ">>> Running seed if needed..."
timeout 30 npx prisma db seed 2>/dev/null || echo "(seed skipped, failed, or timed out)"

echo ">>> Starting Next.js..."
exec node_modules/.bin/next start
