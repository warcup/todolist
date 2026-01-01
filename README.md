# Glass Todo 

## 项目简介

Glass Todo Local 是一个本地离线版的 Glass Todo 应用，提供了完整的任务管理功能，支持本地部署和使用，无需依赖外部云服务。

### 核心功能

- 📋 **任务管理**：创建、编辑、删除任务，支持任务分类
- 🔐 **用户认证**：本地账号登录 + AD域账号登录（可选）
- 📅 **日历视图**：按日期查看和管理任务
- 📎 **附件上传**：支持文件附件管理
- 🔔 **通知提醒**：支持Web Push通知
- 👥 **权限管理**：管理员和普通用户权限控制
- 🌐 **离线使用**：完全本地部署，无需网络连接

## 技术栈

- **后端**：Node.js + Express.js
- **数据库**：SQLite
- **前端**：HTML5 + CSS3 + JavaScript
- **认证**：JWT + AD域认证（可选）

## 安装指南

### 环境要求

- Node.js 16.x 或更高版本
- npm 或 yarn 包管理器

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone <repository-url>
   cd glass-todo-local
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动应用**
   ```bash
   npm start
   ```
   或使用提供的启动脚本：
   ```bash
   # Windows
   start.bat
   
   # Linux/macOS
   chmod +x start.sh
   ./start.sh
   ```

4. **访问应用**
   - 在浏览器中打开：`http://localhost:3000`
   - 默认管理员账号：`admin` / `admin123`
   - 首次登录后请修改管理员密码

## 使用指南

### 基本操作

1. **登录系统**
   - 使用本地账号或AD域账号（如已配置）登录
   - 首次登录管理员账号后，建议立即修改密码

2. **创建任务**
   - 点击"新建任务"按钮
   - 填写任务标题、描述、截止日期等信息
   - 点击"保存"完成创建

3. **管理任务**
   - 在任务列表中可以查看所有任务
   - 点击任务可以编辑详细信息
   - 使用状态标签（待办、进行中、已完成）标记任务进度
   - 可以为任务添加文件附件

4. **用户管理（管理员）**
   - 点击"管理"菜单进入用户管理界面
   - 可以创建、编辑、删除用户
   - 可以设置用户为管理员

### 日历视图

- 点击顶部"日历"标签切换到日历视图
- 在日历中可以查看每日任务
- 点击日期可以查看当天的详细任务列表

## 配置选项

### 环境变量

| 变量名 | 描述 | 默认值 |
|-------|------|-------|
| `PORT` | 服务器端口 | 3000 |
| `VAPID_PUBLIC_KEY` | Web Push公钥 | 空 |
| `VAPID_PRIVATE_KEY` | Web Push私钥 | 空 |
| `VAPID_SUBJECT` | Web Push主题 | mailto:admin@example.com |
| `ATTACHMENTS_DRIVER` | 附件存储驱动 | local |
| `ATTACHMENTS_DIR` | 附件存储目录 | ./storage/attachments |

### AD域集成配置

1. **创建配置文件**
   - 在`server`目录下创建`.ad.config`文件
   - 配置文件示例已提供：`server/.ad.config.example`
   - 复制示例文件并根据实际情况修改：
     ```bash
     # Windows
     copy server\.ad.config.example server\.ad.config
     
     # Linux/macOS
     cp server/.ad.config.example server/.ad.config
     ```
   - 完整配置示例：
     ```json
     {
       "ad": {
         "url": "ldap://your-ad-server:389",
         "baseDN": "dc=your-domain,dc=com",
         "username": "admin@your-domain.com",
         "password": "your-password",
         "filter": "(sAMAccountName={{username}})",
         "searchBase": "ou=Users,dc=your-domain,dc=com",
         "searchFilter": "(sAMAccountName={{username}})",
         "usernameField": "sAMAccountName",
         "emailField": "mail",
         "displayNameField": "displayName"
       }
     }
     ```

2. **配置项说明**
   - `url`: AD服务器地址（如：`ldap://ad.example.com:389`）
   - `baseDN`: 基础DN（如：`dc=example,dc=com`）
   - `username`: 用于查询AD的服务账号
   - `password`: 服务账号密码
   - `filter`: 登录验证过滤条件
   - `searchBase`: 用户搜索基础路径
   - `searchFilter`: 用户搜索过滤条件
   - `usernameField`: AD中的用户名字段
   - `emailField`: AD中的邮箱字段
   - `displayNameField`: AD中的显示名字段

3. **AD登录功能**
   - 当AD配置文件存在且格式正确时，登录界面会自动显示AD登录选项
   - 如果配置文件不存在或格式错误，登录界面将只显示本地登录选项
   - 无需重启服务器，配置变更会实时生效

### 配置文件样例

配置文件样例已提供在`server/.ad.config.example`，可以参考该文件创建自己的配置。

## 项目结构

```
glass-todo-local/
├── public/              # 前端静态文件
│   ├── css/            # 样式文件
│   ├── holidays/       # 节假日配置
│   ├── icons/          # 图标资源
│   ├── js/             # JavaScript文件
│   ├── config.json     # 前端配置
│   ├── index.html      # 主页面
│   ├── manifest.json   # Web应用清单
│   └── sw.js           # Service Worker
├── server/             # 后端代码
│   ├── .ad.config.example # AD域配置示例
│   ├── ad-auth.js      # AD域认证
│   ├── auth.js         # 认证逻辑
│   ├── config.js       # 配置管理
│   ├── db.js           # 数据库操作
│   ├── set-admin.js    # 设置管理员脚本
│   └── utils.js        # 工具函数
├── .gitignore          # Git忽略文件
├── .pkgignore          # pkg打包忽略文件
├── AD_DOMAIN_INTEGRATION.md # AD域集成文档
├── DEPLOYMENT_GUIDE.md # 部署指南
├── NODEJS_PACKAGE_GUIDE.md # Node.js打包指南
├── README.md           # 项目说明
├── package.json        # 项目依赖
├── server.js           # 服务器入口
├── start.bat           # Windows启动脚本
└── start.sh            # Linux/macOS启动脚本
```

## 管理员操作

### 设置管理员

如果需要重新设置管理员账号，可以运行：
```bash
node server/set-admin.js
```

### 数据库管理

- 数据库文件存储在应用根目录下的`.db`文件
- 可以使用SQLite工具直接操作数据库

## 安全注意事项

1. **密码安全**
   - 定期更换管理员密码
   - 使用强密码策略

2. **AD域配置**
   - 不要将实际的AD域配置文件提交到版本控制系统
   - 使用`.gitignore`忽略配置文件

3. **文件上传**
   - 限制附件大小（默认50MB）
   - 定期清理不需要的附件

## 故障排除

### 常见问题

1. **端口被占用**
   - 错误：`Error: listen EADDRINUSE: address already in use :::3000`
   - 解决：修改环境变量`PORT`或关闭占用该端口的程序

2. **AD登录失败**
   - 错误："AD配置未启用"
   - 解决：检查AD配置文件是否正确创建

3. **依赖安装失败**
   - 错误：`npm install` 失败
   - 解决：尝试使用国内镜像 `npm config set registry https://registry.npmmirror.com`

4. **验证码无法显示**
   - 解决：检查Node.js版本，确保在16.x或更高版本

## 更新日志

### v1.0.0
- 初始版本发布
- 支持本地任务管理
- 支持AD域集成
- 支持文件附件
- 支持Web Push通知

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过以下方式联系：
- 提交Issue：<repository-url>/issues
