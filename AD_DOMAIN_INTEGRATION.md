# AD域集成使用说明

## 功能概述

该系统现已支持与Active Directory (AD) 域控对接，实现企业级用户认证和信息管理：

1. **AD域用户认证**：用户可使用AD域账号登录系统
2. **用户信息自动同步**：自动从AD域同步用户详细信息（姓名、邮箱、部门、职位等）
3. **组织结构管理**：获取并展示企业组织结构信息
4. **企业级用户管理**：支持基于AD域信息的用户管理

## 安装依赖

系统需要安装LDAP客户端库来与AD域通信：

```bash
npm install ldapjs --save
```

## 配置AD域连接

### 配置文件方式

编辑 `server/config.js` 文件，修改AD域配置：

```javascript
module.exports = {
    ad: {
        url: 'ldap://your-ad-server.domain.com', // AD域服务器地址
        baseDN: 'dc=your-domain,dc=com', // 基础DN
        username: 'admin@your-domain.com', // AD域管理员账号
        password: 'admin-password', // AD域管理员密码
        searchBase: 'ou=Users,dc=your-domain,dc=com', // 用户搜索基准
        searchFilter: '(samaccountname={{username}})', // 用户搜索过滤器
        attributes: [ // 需要同步的AD域属性
            'cn',
            'sn',
            'givenName',
            'mail',
            'telephoneNumber',
            'department',
            'title',
            'manager',
            'distinguishedName',
            'samaccountname'
        ]
    },
    // 服务器配置
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || '0.0.0.0'
    }
};
```

### 环境变量方式

也可以通过环境变量配置AD域连接：

```bash
# AD域配置
AD_URL=ldap://your-ad-server.domain.com
AD_BASE_DN=dc=your-domain,dc=com
AD_USERNAME=admin@your-domain.com
AD_PASSWORD=admin-password
AD_SEARCH_BASE=ou=Users,dc=your-domain,dc=com
AD_SEARCH_FILTER='(samaccountname={{username}})'

# 服务器配置
PORT=3000
HOST=0.0.0.0
```

## 使用说明

### 用户登录

用户可以使用AD域账号登录系统：

1. 在登录页面输入AD域用户名（通常是samaccountname）和密码
2. 系统首先尝试本地认证，如果失败则尝试AD域认证
3. AD认证成功后，系统会自动创建用户账号并同步AD域信息

### 用户信息同步

系统会在以下时机同步用户AD域信息：

1. 用户登录时自动同步
2. 用户手动点击同步按钮（如果提供）
3. 可以通过API端点 `/api/user/sync-ad` 手动触发同步

### 企业级功能

#### 1. 获取用户列表

API端点：`GET /api/users`

返回所有用户的基本信息，包括：
- 用户名
- 姓名
- 邮箱
- 部门
- 职位

#### 2. 获取当前用户信息

API端点：`GET /api/user/profile`

返回当前登录用户的详细信息，包括AD域同步的所有信息。

#### 3. 获取组织结构

API端点：`GET /api/organization`

返回从AD域获取的组织结构信息。

#### 4. 同步AD信息

API端点：`POST /api/user/sync-ad`

手动触发当前用户的AD信息同步。

## 注意事项

1. **权限设置**：确保AD域管理员账号具有足够的权限来搜索和读取用户信息
2. **网络配置**：确保服务器能够访问AD域服务器（端口通常是389）
3. **安全考虑**：生产环境中建议使用LDAPS（LDAP over SSL/TLS）来加密通信
4. **性能优化**：如果用户数量较多，可以考虑缓存AD域信息以提高性能
5. **回退机制**：当AD域不可用时，系统会自动回退到本地认证模式

## 故障排除

### 连接失败

1. 检查AD域服务器地址和端口是否正确
2. 检查网络连接是否正常
3. 检查AD域管理员账号和密码是否正确
4. 检查防火墙设置是否允许LDAP流量

### 认证失败

1. 检查用户名和密码是否正确
2. 检查AD域搜索过滤器是否正确
3. 检查用户是否存在于AD域中
4. 检查用户账号是否被锁定

### 信息同步失败

1. 检查AD域属性配置是否正确
2. 检查AD域管理员账号是否具有读取用户属性的权限
3. 检查用户是否具有需要同步的属性值

## 扩展建议

1. **群组同步**：可以扩展系统以同步AD域群组信息，实现基于群组的权限管理
2. **单点登录**：可以集成SAML或OAuth 2.0实现单点登录
3. **动态组织结构**：可以实现动态的组织结构展示和管理
4. **审批流程**：可以基于AD域信息实现工作流审批功能
5. **报表功能**：可以基于AD域信息生成部门或团队的工作报表
