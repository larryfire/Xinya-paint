#!/bin/bash
set -e

# ============================================
# 鑫亚涂装船舶管理系统 - 云服务器部署脚本
# ============================================
# 用法:
#   chmod +x deploy.sh
#   ./deploy.sh              # 首次部署 / 更新部署
#   ./deploy.sh --setup      # 初始化服务器环境
#   ./deploy.sh --backup     # 备份数据库
#   ./deploy.sh --ssl        # 配置 SSL 证书
# ============================================

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_title() { echo -e "\n${BLUE}============================================${NC}"; echo -e "${BLUE}$1${NC}"; echo -e "${BLUE}============================================${NC}\n"; }

# ============================================
# 0. 参数解析
# ============================================
SETUP_ONLY=false
BACKUP_ONLY=false
SSL_ONLY=false

for arg in "$@"; do
    case $arg in
        --setup) SETUP_ONLY=true ;;
        --backup) BACKUP_ONLY=true ;;
        --ssl) SSL_ONLY=true ;;
        --help|-h)
            echo "用法: ./deploy.sh [选项]"
            echo ""
            echo "选项:"
            echo "  (无参数)      首次部署或更新部署"
            echo "  --setup       仅初始化服务器环境 (Docker + Nginx)"
            echo "  --backup      仅备份数据库"
            echo "  --ssl         配置/更新 Let's Encrypt SSL 证书"
            echo "  --help, -h    显示帮助"
            exit 0
            ;;
        *)
            log_error "未知参数: $arg"
            exit 1
            ;;
    esac
done

cd "$(dirname "$0")/.."

# ============================================
# 1. 服务器环境初始化
# ============================================
setup_server() {
    log_title "初始化服务器环境"

    # 检测操作系统
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
    else
        log_error "无法检测操作系统"
        exit 1
    fi

    log_info "检测到操作系统: $OS"

    # 安装 Docker
    if ! command -v docker &> /dev/null; then
        log_info "正在安装 Docker..."
        if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
            sudo apt-get update
            sudo apt-get install -y ca-certificates curl gnupg
            sudo install -m 0755 -d /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/$OS/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            sudo chmod a+r /etc/apt/keyrings/docker.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "fedora" ]; then
            sudo yum install -y yum-utils
            sudo yum-config-manager --add-repo https://download.docker.com/linux/$OS/docker-ce.repo
            sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            sudo systemctl start docker
            sudo systemctl enable docker
        else
            log_error "不支持的操作系统: $OS，请手动安装 Docker"
            exit 1
        fi
        log_info "Docker 安装完成"
    else
        log_info "Docker 已安装: $(docker --version)"
    fi

    # 将当前用户加入 docker 组
    if ! groups | grep -q docker; then
        log_info "将当前用户加入 docker 组..."
        sudo usermod -aG docker "$USER"
        log_warn "请重新登录以使 docker 组生效，或执行: newgrp docker"
    fi

    # 安装 Nginx
    if ! command -v nginx &> /dev/null; then
        log_info "正在安装 Nginx..."
        if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
            sudo apt-get install -y nginx
        elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "fedora" ]; then
            sudo yum install -y nginx
        fi
        sudo systemctl start nginx
        sudo systemctl enable nginx
        log_info "Nginx 安装完成"
    else
        log_info "Nginx 已安装: $(nginx -v 2>&1)"
    fi

    log_info "服务器环境初始化完成！"
}

# ============================================
# 2. 数据库备份
# ============================================
backup_db() {
    log_title "备份数据库"

    BACKUP_DIR="./backups"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"

    if docker ps --format '{{.Names}}' | grep -q xinya-mysql; then
        log_info "正在导出数据库..."
        docker exec xinya-mysql mysqldump \
            -u root \
            -p"${MYSQL_ROOT_PASSWORD:?请先设置 MYSQL_ROOT_PASSWORD 环境变量}" \
            --databases xinya_paint \
            --single-transaction \
            --routines \
            --triggers \
            > "$BACKUP_FILE"
        log_info "备份完成: $BACKUP_FILE"
    else
        log_warn "MySQL 容器未运行，跳过备份"
    fi
}

# ============================================
# 3. SSL 证书配置
# ============================================
setup_ssl() {
    log_title "配置 SSL 证书 (Let's Encrypt)"

    DOMAIN="${1:-$DOMAIN}"

    if [ -z "$DOMAIN" ]; then
        echo -n "请输入你的域名: "
        read -r DOMAIN
    fi

    if [ -z "$DOMAIN" ]; then
        log_error "域名不能为空"
        exit 1
    fi

    # 安装 certbot
    if ! command -v certbot &> /dev/null; then
        log_info "正在安装 certbot..."
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            if [ "$ID" = "ubuntu" ] || [ "$ID" = "debian" ]; then
                sudo apt-get install -y certbot python3-certbot-nginx
            elif [ "$ID" = "centos" ] || [ "$ID" = "rhel" ]; then
                sudo yum install -y certbot python3-certbot-nginx
            fi
        fi
    fi

    log_info "正在申请 SSL 证书（域名: $DOMAIN）..."
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@${DOMAIN}"

    # 配置 Nginx
    if [ -f "./deploy/nginx.conf" ]; then
        log_info "正在更新 Nginx 配置..."
        sudo cp "./deploy/nginx.conf" "/etc/nginx/sites-available/xinya-paint"
        sudo sed -i "s/<YOUR_DOMAIN>/$DOMAIN/g" "/etc/nginx/sites-available/xinya-paint"

        # 启用 SSL 配置块（取消注释 443 server 块）
        sudo sed -i 's/# server {/server {/' "/etc/nginx/sites-available/xinya-paint"
        sudo sed -i "s/#     listen 443/    listen 443/" "/etc/nginx/sites-available/xinya-paint"
        sudo sed -i "s/#     server_name/    server_name/" "/etc/nginx/sites-available/xinya-paint"
        sudo sed -i "s/#     ssl_certificate/    ssl_certificate/" "/etc/nginx/sites-available/xinya-paint"
        sudo sed -i "s/#     ssl_certificate_key/    ssl_certificate_key/" "/etc/nginx/sites-available/xinya-paint"
        sudo sed -i "s/#     ssl_protocols/    ssl_protocols/" "/etc/nginx/sites-available/xinya-paint"
        sudo sed -i "s/#     ssl_ciphers/    ssl_ciphers/" "/etc/nginx/sites-available/xinya-paint"
        sudo sed -i "s/#     ssl_prefer/    ssl_prefer/" "/etc/nginx/sites-available/xinya-paint"
        sudo sed -i "s/#     client_max/    client_max/" "/etc/nginx/sites-available/xinya-paint"
        sudo sed -i "s/# }/}/" "/etc/nginx/sites-available/xinya-paint"
        sudo sed -i "s/<YOUR_DOMAIN>/$DOMAIN/g" "/etc/nginx/sites-available/xinya-paint"

        sudo nginx -t && sudo systemctl reload nginx
        log_info "SSL 证书配置完成！"
    fi

    # 设置自动续期
    log_info "设置 SSL 证书自动续期..."
    (sudo crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | sudo crontab -
}

# ============================================
# 4. 环境变量检查
# ============================================
check_env() {
    log_title "检查环境变量"

    # 检查是否存在 .env.production
    if [ ! -f ".env.production" ]; then
        if [ -f "./deploy/.env.production" ]; then
            log_info "首次部署，从模板创建 .env.production..."

            # 自动生成强密码（去除尾随换行符，避免 sed 命令中断）
            ROOT_PW=$(openssl rand -base64 24 2>/dev/null | tr -d '\n' || head -c 32 /dev/urandom | base64 | tr -d '\n')
            USER_PW=$(openssl rand -base64 24 2>/dev/null | tr -d '\n' || head -c 32 /dev/urandom | base64 | tr -d '\n')
            JWT_SECRET=$(openssl rand -base64 64 2>/dev/null | tr -d '\n' || head -c 64 /dev/urandom | base64 | tr -d '\n')

            cp "./deploy/.env.production" ".env.production"
            sed -i "s|__ROOT_PW__|$ROOT_PW|" ".env.production"
            sed -i "s|__USER_PW__|$USER_PW|" ".env.production"
            sed -i "s|__JWT_SECRET__|$JWT_SECRET|" ".env.production"

            log_info "已自动生成密码并保存到 .env.production"
            log_warn "请妥善保存 .env.production 文件中的密码！"
        else
            log_error "未找到 .env.production 模板文件"
            exit 1
        fi
    else
        log_info ".env.production 已存在，使用现有配置"
    fi
}

# ============================================
# 5. 主部署流程
# ============================================
deploy() {
    log_title "开始部署"

    # 加载环境变量
    set -a
    source .env.production
    set +a

    # 备份数据库（如果容器在运行）
    if docker ps --format '{{.Names}}' | grep -q xinya-mysql; then
        backup_db
    fi

    # 拉取最新代码（如果是 git 仓库）
    if [ -d ".git" ]; then
        log_info "拉取最新代码..."
        git pull origin master 2>/dev/null || log_warn "无法拉取代码（可能未配置远程仓库）"
    fi

    # 构建并启动
    log_info "正在构建 Docker 镜像..."
    docker compose build --no-cache

    log_info "正在启动服务..."
    docker compose up -d

    # 等待服务就绪
    log_info "等待服务就绪..."
    for i in $(seq 1 30); do
        if curl -s -o /dev/null http://localhost:3000/api/auth/me; then
            log_info "应用启动成功! (耗时 ${i}s)"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "应用启动超时，请检查日志: docker compose logs app"
            exit 1
        fi
        sleep 2
    done

    # 配置 Nginx（如果尚未配置）
    if [ -f "/etc/nginx/sites-enabled/default" ] || [ -f "/etc/nginx/conf.d/default.conf" ]; then
        if [ ! -f "/etc/nginx/sites-enabled/xinya-paint" ] && [ ! -f "/etc/nginx/conf.d/xinya-paint.conf" ]; then
            log_info "正在配置 Nginx 反向代理..."
            configure_nginx
        fi
    fi

    # 初始化数据库种子数据（仅首次）
    log_info "检查是否需要初始化种子数据..."
    USER_COUNT=$(docker exec xinya-mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -N -e "SELECT COUNT(*) FROM xinya_paint.Users;" 2>/dev/null || echo "error")
    if [ "$USER_COUNT" = "0" ] || [ "$USER_COUNT" = "error" ]; then
        log_info "数据库为空，正在初始化种子数据..."
        docker exec xinya-app npx prisma db seed
    else
        log_info "数据库中已有 $USER_COUNT 个用户，跳过种子数据初始化"
    fi

    log_title "🎉 部署完成！"
    echo ""
    log_info "访问地址: http://$(curl -s ifconfig.me 2>/dev/null || echo '你的服务器IP')"
    log_info "或通过 Nginx: http://你的服务器IP"
    echo ""
    log_info "查看日志: docker compose logs -f app"
    log_info "重启服务: docker compose restart"
    log_info "停止服务: docker compose down"
}

# ============================================
# 6. Nginx 配置
# ============================================
configure_nginx() {
    if [ -f /etc/nginx/sites-enabled/default ]; then
        # Debian/Ubuntu 风格
        sudo cp ./deploy/nginx.conf /etc/nginx/sites-available/xinya-paint
        sudo ln -sf /etc/nginx/sites-available/xinya-paint /etc/nginx/sites-enabled/
        sudo rm -f /etc/nginx/sites-enabled/default
    elif [ -f /etc/nginx/conf.d/default.conf ]; then
        # CentOS/RHEL 风格
        sudo cp ./deploy/nginx.conf /etc/nginx/conf.d/xinya-paint.conf
        sudo rm -f /etc/nginx/conf.d/default.conf
    fi

    sudo nginx -t && sudo systemctl reload nginx
    log_info "Nginx 配置完成"
}

# ============================================
# 主入口
# ============================================
if $SETUP_ONLY; then
    setup_server
    exit 0
fi

if $BACKUP_ONLY; then
    backup_db
    exit 0
fi

if $SSL_ONLY; then
    setup_ssl
    exit 0
fi

# 完整部署流程
check_env
deploy
