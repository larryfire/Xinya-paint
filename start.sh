#!/bin/bash
# ============================================
# 心雅涂装船舶管理系统 — 一键启动脚本
# ============================================
# 用法:
#   ./start.sh              # 本地开发模式
#   ./start.sh --remote     # 远程生产部署 (需要先配置服务器)
# ============================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_title() { echo -e "\n${BLUE}===${NC} $1 ${BLUE}===${NC}\n"; }

cd "$(dirname "$0")"

# ============================================
# 本地开发模式
# ============================================
start_local() {
    log_title "本地开发模式启动"

    # 检查 .env 文件
    if [ ! -f ".env" ]; then
        cp .env.example .env
        log_info "已从 .env.example 创建 .env（使用 SQLite）"
    fi

    # 安装依赖（如果需要）
    if [ ! -d "node_modules" ]; then
        log_info "安装依赖..."
        npm install
    fi

    # 生成 Prisma 客户端
    log_info "生成 Prisma 客户端..."
    npx prisma generate

    # 同步数据库
    log_info "同步数据库结构..."
    npx prisma db push

    log_info "启动开发服务器 → http://localhost:3000"
    npm run dev
}

# ============================================
# 远程生产部署
# ============================================
start_remote() {
    log_title "远程生产部署"

    # 检查服务器配置
    if [ ! -f ".env.production" ]; then
        log_info "首次部署，运行部署脚本生成配置..."
        chmod +x deploy/deploy.sh
        ./deploy/deploy.sh
        return
    fi

    # 加载环境变量
    set -a
    source .env.production
    set +a

    log_info "启动 Docker 容器..."
    docker compose up -d

    log_info "等待服务就绪..."
    for i in $(seq 1 30); do
        if curl -s -o /dev/null http://localhost:3000/; then
            log_info "服务启动成功! (耗时 ${i}s)"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}[ERROR]${NC} 启动超时，请检查日志: docker compose logs app"
            exit 1
        fi
        sleep 2
    done

    log_title "部署完成"
    echo "  访问地址: http://$(curl -s ifconfig.me 2>/dev/null || echo '服务器IP')"
    echo "  默认账号: admin / admin123"
}

# ============================================
# 主入口
# ============================================
case "${1:-}" in
    --remote|-r)
        start_remote
        ;;
    --help|-h)
        echo "用法: ./start.sh [选项]"
        echo ""
        echo "选项:"
        echo "  (无参数)      本地开发模式 (http://localhost:3000)"
        echo "  --remote, -r  远程生产部署 (Docker + MySQL)"
        echo "  --help, -h    显示帮助"
        ;;
    *)
        start_local
        ;;
esac
