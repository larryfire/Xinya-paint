# 鑫亚涂装船舶管理系统 — 公网部署指南

## 📋 前置准备

在开始之前，请确保你具备以下条件：

| 项目 | 要求 |
|------|------|
| **云服务器** | 2核4G 起步（推荐阿里云/腾讯云），系统选 Ubuntu 22.04 / CentOS 8+ |
| **域名（可选）** | 用于 HTTPS 访问，需已备案 |
| **安全组规则** | 开放 80、443、3000（临时）端口 |
| **SSH 工具** | 能通过 SSH 登录到服务器 |

> 📍 **推荐配置：** 阿里云 ECS 2核4G（约 ¥100-200/月）或腾讯云轻量应用服务器（¥70-130/月）

---

## 🚀 快速部署（3 步完成）

### 第一步：上传项目到服务器

```bash
# 在本地电脑上，将代码打包上传到服务器
# 方式 A: 通过 Git
ssh root@你的服务器IP
mkdir -p /opt/xinya-paint && cd /opt/xinya-paint
git clone https://你的仓库地址 . && cd .

# 方式 B: 通过 scp 上传（在本地执行）
scp -r ./XinYa-paint root@你的服务器IP:/opt/xinya-paint
```

### 第二步：运行部署脚本

```bash
cd /opt/xinya-paint

# 1. 初始化服务器环境（Docker + Nginx）
chmod +x deploy/deploy.sh
./deploy/deploy.sh --setup

# 2. 重新登录使 docker 组权限生效
exit          # 退出 SSH
ssh root@你的服务器IP
cd /opt/xinya-paint

# 3. 一键部署
./deploy/deploy.sh
```

部署脚本会自动完成：
- ✅ 安装 Docker & Docker Compose
- ✅ 安装 Nginx
- ✅ 生成随机安全密码
- ✅ 构建 Docker 镜像
- ✅ 执行数据库迁移
- ✅ 初始化种子数据
- ✅ 配置 Nginx 反向代理
- ✅ 启动应用服务

### 第三步：验证部署

```bash
# 检查容器运行状态
docker compose ps

# 检查应用日志
docker compose logs -f app

# 测试 API（替换为你的服务器 IP）
curl http://你的服务器IP/api/auth/me
```

然后在浏览器中访问 `http://你的服务器IP`，应该能看到登录页面。

---

## 🔒 SSL/HTTPS 配置（强烈推荐）

```bash
# 先确保域名已解析到你的服务器 IP
ping 你的域名.com

# 配置 SSL 证书
./deploy/deploy.sh --ssl
# 按提示输入域名，脚本会自动：
#   1. 安装 certbot
#   2. 申请 Let's Encrypt SSL 证书
#   3. 配置 Nginx HTTPS
#   4. 设置自动续期
```

---

## 🛠️ 日常运维命令

```bash
# 查看运行状态
docker compose ps

# 查看实时日志
docker compose logs -f app

# 重启服务
docker compose restart

# 更新部署（拉取新代码后）
./deploy/deploy.sh

# 备份数据库
./deploy/deploy.sh --backup

# 停止服务
docker compose down

# 完全重建（清空数据卷）
docker compose down -v
./deploy/deploy.sh
```

---

## 📂 项目文件说明

```
XinYa-paint/
├── deploy/
│   ├── deploy.sh          # 一键部署脚本
│   ├── nginx.conf          # Nginx 反向代理配置
│   ├── .env.production     # 生产环境变量模板
│   └── DEPLOY.md           # 本文档
├── Dockerfile              # Docker 多阶段构建
├── docker-compose.yml      # Docker 服务编排
├── entrypoint.sh           # 容器启动脚本
└── ...
```

---

## 🔥 安全清单

部署完成后，务必检查以下安全事项：

- [ ] `.env.production` 中的 `JWT_SECRET` 已修改为随机值
- [ ] `.env.production` 中的数据库密码已修改
- [ ] MySQL 端口 3306 未暴露到公网（已在 docker-compose.yml 中屏蔽）
- [ ] 防火墙仅开放 80 / 443 端口（通过 Nginx 反向代理访问）
- [ ] 已配置 HTTPS 证书（强烈推荐）
- [ ] 管理员密码已从默认值修改

```bash
# 关闭 3000 端口的公网访问（配置完 Nginx 后）
# 修改 docker-compose.yml，将
#   ports: "3000:3000"
# 改为
#   ports: "127.0.0.1:3000:3000"
```

---

## 📊 架构图

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   公网用户    │────▶│  Nginx (80/443) │────▶│  Next.js App     │
│              │     │  反向代理 + SSL  │     │  (Docker :3000)  │
└──────────────┘     └─────────────────┘     └────────┬─────────┘
                                                      │
                                                      ▼
                                             ┌──────────────────┐
                                             │  MySQL 8.0       │
                                             │  (Docker 内部)   │
                                             └──────────────────┘
```

---

## 🆘 常见问题

### Q: 部署后页面 502 错误？
```bash
docker compose logs app    # 检查应用是否正常启动
docker compose logs mysql  # 检查数据库是否正常
```

### Q: 数据库连接失败？
- 确认 MySQL 容器的 healthcheck 已通过
- 检查 `DATABASE_URL` 中的用户名密码是否正确

### Q: 端口被占用？
```bash
sudo lsof -i :3000    # 查看占用 3000 端口的进程
sudo lsof -i :80      # 查看占用 80 端口的进程
```

### Q: 如何重置管理员密码？
```bash
# 进入应用容器
docker exec -it xinya-app sh
# 通过 Prisma Studio 或 API 修改
```

### Q: 需要接入 GitHub Actions CI/CD？
可在项目中添加 `.github/workflows/deploy.yml`，实现代码推送后自动部署。
