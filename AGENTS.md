<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 项目启动指南

## 本地开发

```bash
npm run dev
# → http://localhost:3000 （SQLite，开箱即用）
```

## 远程生产服务器

服务器: `ssh ubuntu@124.221.38.173` (密码见用户提供)

```bash
cd /opt/xinya-paint
# 若容器未运行，直接启动:
set -a && source .env.production && set +a
docker compose up -d

# 手动运行种子(若数据库为空):
docker exec xinya-app sh -c 'cd /app && timeout 120 npx tsx prisma/seed.ts'
```

公网: `http://124.221.38.173` (Nginx 80 → :3000)
默认账号: `admin` / `admin123`

## 部署架构

- 数据库: MariaDB 11 (Docker 内网, 不暴露端口)
- 反向代理: Nginx → localhost:3000
- 应用: Next.js 16 (Turbopack) + Prisma 7
- 开发用 SQLite, 生产用 MySQL (Dockerfile 构建时自动切换 provider)

## 关键配置注意

- Prisma 7 **不支持** schema 中写 `url` 字段，`url` 在 `prisma.config.ts` 中配置
- Prisma 7 **不支持** `env()` 在 `provider` 字段，通过 Dockerfile `sed` 切换
- 种子脚本 (`prisma/seed.ts`) 和 `src/lib/prisma.ts` 需根据 `DATABASE_URL` 前缀自动选适配器
- 健康检查用首页 `/` 而非 `/api/auth/me`（避免 401 导致 unhealthy）
