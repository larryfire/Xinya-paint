FROM node:22-alpine AS base

# 1. 依赖安装阶段
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# 2. 构建阶段
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# 生产环境使用 MySQL/MariaDB，构建时替换 provider
RUN sed -i 's/provider = "sqlite"/provider = "mysql"/' prisma/schema.prisma
RUN npx prisma generate
RUN npm run build

# 3. 运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated/prisma ./src/generated/prisma
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./

# 创建数据目录并授权（Volume 挂载点，需要可写）
RUN mkdir -p /data && chmod 777 /data

# 启动脚本（数据库迁移 + Next.js 启动）
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

ENTRYPOINT ["/bin/sh", "./entrypoint.sh"]
