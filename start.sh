#!/bin/bash

# Glass Todo Linux 启动脚本
# 用于在Linux环境中快速部署和启动应用

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 切换到当前目录
cd "$(dirname "$0")"

# 2. 设置默认环境变量
PORT=${PORT:-3000}
USE_LOCAL_STORAGE=false
VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_SUBJECT="mailto:admin@example.com"

# 显示欢迎信息
echo -e "${GREEN}========================================================${NC}"
echo -e "${GREEN}        Glass Todo Linux 快速启动脚本${NC}"
echo -e "${GREEN}========================================================${NC}"
echo

# 3. 检查 Node.js 环境
echo -e "${YELLOW}[环境检查]${NC} 正在检查 Node.js 环境..."
if command -v node > /dev/null 2>&1; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}[环境检查]${NC} 找到 Node.js: $NODE_VERSION"
else
    echo -e "${RED}[错误]${NC} 未找到 Node.js 环境！"
    echo -e "${YELLOW}请先安装 Node.js (建议版本 16.x 或更高)${NC}"
    echo -e "${YELLOW}安装命令示例: sudo apt-get install nodejs npm${NC}"
    exit 1
fi

# 检查 npm
if command -v npm > /dev/null 2>&1; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}[环境检查]${NC} 找到 npm: $NPM_VERSION"
else
    echo -e "${RED}[错误]${NC} 未找到 npm！"
    echo -e "${YELLOW}请先安装 npm${NC}"
    exit 1
fi

# 4. 检查依赖 (node_modules)
echo -e "\n${YELLOW}[依赖检查]${NC} 正在检查项目依赖..."
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[依赖检查]${NC} 首次运行，正在安装依赖..."
    echo -e "${YELLOW}[依赖检查]${NC} (可能需要几分钟，请耐心等待)${NC}"
    
    # 设置国内镜像加速
    npm config set registry https://registry.npmmirror.com
    
    if npm install; then
        echo -e "${GREEN}[依赖检查]${NC} 依赖安装成功！"
    else
        echo -e "${RED}[错误]${NC} 依赖安装失败！"
        echo -e "${YELLOW}请检查网络连接或 npm 配置${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}[依赖检查]${NC} 依赖已存在，跳过安装"
fi

# 5. 启动服务
echo -e "\n${GREEN}========================================================${NC}"
echo -e "${GREEN}        服务即将启动${NC}"
echo -e "${GREEN}        访问地址: http://localhost:${PORT}${NC}"
echo -e "${GREEN}========================================================${NC}"
echo

# 导出环境变量
export PORT

exec node server.js
