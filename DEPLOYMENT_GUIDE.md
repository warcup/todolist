# Glass Todo Linux 部署指南

本指南将帮助您将 Glass Todo 应用快速部署到 Linux 系统上。

## 一、环境要求

- Linux 系统 (Ubuntu/CentOS/Debian 等)
- Node.js 16.x 或更高版本
- npm 或 yarn 包管理器

## 二、快速部署方案

### 方案一：直接运行（推荐）

1. **下载或复制项目文件**
   将项目文件完整复制到 Linux 服务器的目标目录。

2. **运行启动脚本**
   ```bash
   cd /path/to/glass-todo
   ./start.sh
   ```
   
   启动脚本会自动：
   - 检查 Node.js 环境
   - 安装项目依赖
   - 启动应用服务

3. **访问应用**
   在浏览器中访问：`http://服务器IP:3000`

### 方案二：手动运行

1. **安装 Node.js**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install nodejs npm
   
   # CentOS/RHEL
   sudo yum install nodejs npm
   ```

2. **安装依赖**
   ```bash
   cd /path/to/glass-todo
   npm install
   ```

3. **启动服务**
   ```bash
   # 直接运行
   node server.js
   
   # 或使用环境变量
   PORT=3000 node server.js
   ```

## 三、项目结构说明

```
glass-todo/
├── public/          # 前端静态文件
├── server/          # 后端代码
├── database.sqlite  # SQLite 数据库文件
├── package.json     # 项目配置和依赖
├── server.js        # 应用入口文件
├── start.sh         # Linux 启动脚本
└── start.bat        # Windows 启动脚本
```

## 四、环境变量配置

应用支持通过环境变量进行配置：

| 变量名 | 说明 | 默认值 |
|-------|------|-------|
| PORT | 服务端口 | 3000 |
| DB_PATH | 数据库文件路径 | ./database.sqlite |
| VAPID_PUBLIC_KEY | Web Push 公钥 | 空 |
| VAPID_PRIVATE_KEY | Web Push 私钥 | 空 |
| VAPID_SUBJECT | Web Push 主题 | mailto:admin@example.com |
| ATTACHMENTS_DRIVER | 附件存储驱动 | local |
| ATTACHMENTS_DIR | 本地附件存储目录 | ./storage/attachments |

## 五、安全建议

1. **生产环境配置**
   - 使用反向代理（如 Nginx）对外提供服务
   - 配置 HTTPS 证书
   - 设置复杂的管理员密码

2. **数据库备份**
   定期备份 `database.sqlite` 文件：
   ```bash
   cp database.sqlite database_$(date +%Y%m%d_%H%M%S).bak
   ```

## 六、常见问题

### 1. 端口被占用
```bash
# 查看端口占用情况
lsof -i :3000

# 或使用不同端口启动
PORT=3001 ./start.sh
```

### 2. 依赖安装失败
```bash
# 清理缓存并重新安装
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 3. 权限问题
```bash
# 确保文件有执行权限
chmod +x start.sh
```

## 七、停止服务

1. 按 `Ctrl + C` 停止当前运行的服务

2. 如果服务在后台运行：
   ```bash
   # 查找进程 ID
   ps aux | grep node
   
   # 终止进程
   kill <PID>
   ```

## 八、更新应用

1. 备份现有数据
   ```bash
   cp database.sqlite database_backup.sqlite
   ```

2. 替换项目文件
   ```bash
   # 解压新文件并替换旧文件
   unzip glass-todo-new.zip -d glass-todo-new
   cp -r glass-todo-new/* glass-todo/
   ```

3. 重新安装依赖并启动
   ```bash
   cd glass-todo
   npm install
   ./start.sh
   ```

---

使用此部署指南，您可以在几分钟内将 Glass Todo 应用部署到 Linux 服务器上。如果遇到问题，请检查日志输出或联系技术支持。
