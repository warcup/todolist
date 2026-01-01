const http = require('http');
const https = require('https');

// 测试配置
const baseUrl = 'http://localhost:3000';
const username = 'admin'; // 使用本地管理员用户
const password = 'admin123'; // 使用简单的密码

// 生成Basic认证头
const generateBasicAuthHeader = (username, password) => {
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    return `Basic ${auth}`;
};

// 发送HTTP请求
const sendRequest = (options, data = null) => {
    const protocol = baseUrl.startsWith('https') ? https : http;
    const url = new URL(options.path, baseUrl);
    
    const reqOptions = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: options.method,
        headers: options.headers || {}
    };
    
    return new Promise((resolve, reject) => {
        const req = protocol.request(reqOptions, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(responseData);
                    resolve({ status: res.statusCode, data: parsedData });
                } catch (error) {
                    resolve({ status: res.statusCode, data: responseData });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
};

// 测试登录并获取JWT令牌
const testLogin = async () => {
    console.log('=== 测试登录并获取JWT令牌 ===');
    try {
        const response = await sendRequest({
            path: '/api/login',
            method: 'POST',
            headers: {
                'Authorization': generateBasicAuthHeader(username, password),
                'Content-Type': 'application/json'
            }
        });
        
        console.log('登录响应状态:', response.status);
        console.log('登录响应数据:', response.data);
        
        if (response.status === 200 && response.data.success && response.data.token) {
            console.log('✓ 登录成功，获取到JWT令牌');
            return response.data.token;
        } else {
            console.error('✗ 登录失败');
            return null;
        }
    } catch (error) {
        console.error('✗ 登录请求失败:', error.message);
        return null;
    }
};

// 测试使用JWT令牌访问受保护资源
const testProtectedResource = async (token) => {
    console.log('\n=== 测试使用JWT令牌访问受保护资源 ===');
    try {
        const response = await sendRequest({
            path: '/api/data',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('访问受保护资源响应状态:', response.status);
        console.log('访问受保护资源响应数据:', response.data);
        
        if (response.status === 200 && response.data) {
            console.log('✓ 使用JWT令牌成功访问受保护资源');
            return true;
        } else {
            console.error('✗ 使用JWT令牌访问受保护资源失败');
            return false;
        }
    } catch (error) {
        console.error('✗ 访问受保护资源请求失败:', error.message);
        return false;
    }
};

// 测试使用无效令牌访问受保护资源
const testInvalidToken = async () => {
    console.log('\n=== 测试使用无效令牌访问受保护资源 ===');
    try {
        const response = await sendRequest({
            path: '/api/data',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer invalid_token',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('访问受保护资源响应状态:', response.status);
        console.log('访问受保护资源响应数据:', response.data);
        
        if (response.status === 401 && response.data.error) {
            console.log('✓ 无效令牌被正确拒绝');
            return true;
        } else {
            console.error('✗ 无效令牌测试失败');
            return false;
        }
    } catch (error) {
        console.error('✗ 访问受保护资源请求失败:', error.message);
        return false;
    }
};

// 测试注销功能
const testLogout = async (token) => {
    console.log('\n=== 测试注销功能 ===');
    try {
        const response = await sendRequest({
            path: '/api/logout',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('注销响应状态:', response.status);
        console.log('注销响应数据:', response.data);
        
        if (response.status === 200 && response.data.success) {
            console.log('✓ 注销成功');
            return true;
        } else {
            console.error('✗ 注销失败');
            return false;
        }
    } catch (error) {
        console.error('✗ 注销请求失败:', error.message);
        return false;
    }
};

// 执行所有测试
const runAllTests = async () => {
    console.log('开始测试JWT认证功能...\n');
    
    // 1. 测试登录并获取令牌
    const token = await testLogin();
    
    if (token) {
        // 2. 测试使用令牌访问受保护资源
        await testProtectedResource(token);
        
        // 3. 测试注销
        await testLogout(token);
        
        // 4. 测试使用无效令牌
        await testInvalidToken();
    }
    
    console.log('\n=== 所有测试完成 ===');
};

// 启动测试
runAllTests().catch(error => {
    console.error('测试过程中出现未预期的错误:', error);
});
