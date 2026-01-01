# Node.js 项目打包为可执行文件指南

## 概述

是的，Node.js 项目**完全可以**打包成单个可执行文件，无需在目标服务器上安装 Node.js 和依赖。本文档将介绍几种主流的打包工具和详细的使用方法。

## 主流打包工具对比

| 工具 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **pkg** | 支持多平台，配置简单，无需修改代码 | 打包文件较大，首次运行较慢 | 快速部署，跨平台分发 |
| **nexe** | 支持自定义 Node.js 版本，启动更快 | 配置复杂，依赖编译环境 | 对启动速度有要求的场景 |
| **ncc** | 打包为单个 JS 文件，体积小 | 需要目标服务器安装 Node.js | 快速部署到已有机房环境 |
| **zeit/pkg** | 支持 tree-shaking，体积较小 | 配置相对复杂 | 生产环境部署 |

## 方法一：使用 pkg 工具（推荐）

### 1. 安装 pkg

```bash
# 全局安装
npm install -g pkg

# 或项目内安装
npm install --save-dev pkg
```

### 2. 配置 package.json

在 `package.json` 中添加 `pkg` 配置：

```json
{
  "name": "glass-todo-local",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "build": "pkg ."
  },
  "pkg": {
    "scripts": ["server.js", "server/**/*.js"],
    "assets": ["public/**/*", "database.sqlite"],
    "targets": [
      "node16-linux-x64",
      "node16-win-x64",
      "node16-macos-x64"
    ],
    "outputPath": "dist"
  }
}
```

### 3. 创建 .pkgignore 文件

创建 `.pkgignore` 文件排除不必要的文件：

```
# 忽略的文件和目录
node_modules/
test/
bin/
*.log
.DS_Store
*.bak
*.tmp
.git/
.gitignore
.npmignore
*.zip
*.tar.gz
```

### 4. 执行打包

```bash
# 使用全局 pkg
pkg .

# 或使用 npm 脚本
npm run build
```

### 5. 运行打包后的文件

```bash
# Linux/macOS
chmod +x ./dist/glass-todo-local-linux
./dist/glass-todo-local-linux

# Windows
.dist\glass-todo-local-win.exe
```

## 方法二：使用 nexe 工具

### 1. 安装 nexe

```bash
npm install -g nexe
```

### 2. 直接打包

```bash
# 打包为 Linux 可执行文件
nexe server.js -t linux-x64-16.16.0 -o glass-todo-linux

# 打包为 Windows 可执行文件  
nexe server.js -t win-x64-16.16.0 -o glass-todo-win.exe

# 打包为 macOS 可执行文件
nexe server.js -t macos-x64-16.16.0 -o glass-todo-macos
```

## 方法三：使用 ncc 工具

### 1. 安装 ncc

```bash
npm install -g @vercel/ncc
```

### 2. 打包为单个 JS 文件

```bash
ncc build server.js -o dist
```

### 3. 运行

```bash
# 需要目标服务器安装 Node.js
node dist/index.js
```

## 方法四：Docker 容器化

### 1. 创建 Dockerfile

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

### 2. 构建 Docker 镜像

```bash
docker build -t glass-todo .
```

### 3. 运行 Docker 容器

```bash
docker run -p 3000:3000 glass-todo
```

## 注意事项

### 1. 资源文件处理

- 确保静态资源（如 HTML、CSS、JS 文件）被正确打包
- 使用 `__dirname` 或 `process.cwd()` 获取正确的文件路径

### 2. SQLite 数据库

```javascript
// 正确的数据库路径获取方式
const path = require('path');
const dbPath = path.join(
  process.pkg ? path.dirname(process.execPath) : process.cwd(),
  'database.sqlite'
);
```

### 3. 环境变量

```javascript
// 访问环境变量
const port = process.env.PORT || 3000;
```

### 4. 权限问题

```bash
# Linux 系统需要添加执行权限
chmod +x ./glass-todo-linux
```

## 故障排除

### 问题：打包文件过大

**解决方案：**
- 使用 `.pkgignore` 排除不必要的文件
- 选择更小的 Node.js 版本（如 node14 而非 node16）
- 考虑使用 ncc 生成单个 JS 文件

### 问题：打包后无法找到资源文件

**解决方案：**
- 检查 `pkg.assets` 配置是否正确
- 使用正确的路径获取方式

### 问题：首次运行缓慢

**解决方案：**
- pkg 首次运行需要解压资源，这是正常现象
- 考虑使用 nexe 工具，启动速度更快

### 问题：依赖原生模块（如 sqlite3）

**解决方案：**
- 使用 `--build-from-source` 参数重新编译依赖
- 确保打包时包含原生模块的二进制文件

## 最佳实践

1. **测试先行**：在打包前确保项目能正常运行
2. **增量更新**：只打包必要的文件，减少打包时间
3. **版本控制**：为不同平台生成不同版本的可执行文件
4. **性能监控**：关注打包文件的大小和启动时间

## 快速开始脚本

我们已经为您准备了自动化打包脚本：

```bash
# 修改脚本权限
chmod +x package-bundle.js

# 执行打包
node package-bundle.js
```

## 总结

Node.js 项目完全可以打包成单个可执行文件，实现"一键部署"的需求。推荐使用 `pkg` 工具，它配置简单，支持多平台，适合快速部署和分发。

如果您遇到网络问题导致 pkg 下载缓慢，可以尝试：
1. 手动下载 Node.js 二进制文件并放入 pkg 缓存目录
2. 使用国内镜像源
3. 选择其他打包工具（如 nexe 或 ncc）

根据您的具体需求，选择最合适的打包方案，实现 Node.js 项目的快速部署和分发。