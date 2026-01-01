const axios = require('axios');
const https = require('https');

// 测试配置
const baseUrl = 'http://localhost:3000';
const username = 'testuser'; // 替换为实际的AD用户名
const password = 'testpassword'; // 替换为实际的AD密码

// 创建axios实例
const apiClient = axios.create({
    baseURL: baseUrl,
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    }),
    headers: {
        'Content-Type': 'application/json'
    }
});

// 生成Basic认证头
const generateAuthHeader = (username, password) => {
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    return { Authorization: `Basic ${auth}` };
};

// 测试登录
const testLogin = async () => {
    console.log('=== 测试登录 ===');
    try {
        const response = await apiClient.all('/api/login', {
            headers: {
                ...generateAuthHeader(username, password),
                'x-login-type': 'ad'
            }
        });
        console.log('登录成功:', response.data);
        return true;
    } catch (error) {
        console.error('登录失败:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
        } else if (error.request) {
            console.error('请求已发送但未收到响应:', error.request);
        }
        return false;
    }
};

// 测试注销
const testLogout = async () => {
    console.log('\n=== 测试注销 ===');
    try {
        const response = await apiClient.post('/api/logout', {}, {
            headers: generateAuthHeader(username, password)
        });
        console.log('注销成功:', response.data);
        return true;
    } catch (error) {
        console.error('注销失败:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
        } else if (error.request) {
            console.error('请求已发送但未收到响应:', error.request);
        }
        return false;
    }
};

// 测试完整流程：登录 -> 注销 -> 再次登录
const testFullFlow = async () => {
    console.log('开始测试注销后重登流程...\n');
    
    // 第一次登录
    const login1Success = await testLogin();
    if (!login1Success) {
        console.log('\n测试失败：第一次登录失败');
        return;
    }
    
    // 等待一段时间，模拟用户操作
    console.log('\n等待2秒...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 注销
    const logoutSuccess = await testLogout();
    if (!logoutSuccess) {
        console.log('\n测试失败：注销失败');
        return;
    }
    
    // 等待一段时间，模拟用户操作
    console.log('\n等待2秒...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 第二次登录（应该不会出现ECONNRESET错误）
    const login2Success = await testLogin();
    if (!login2Success) {
        console.log('\n测试失败：第二次登录失败，可能仍然存在ECONNRESET问题');
        return;
    }
    
    console.log('\n=== 测试成功！===');
    console.log('注销后重登流程正常，没有出现ECONNRESET错误。');
};

// 执行测试
testFullFlow().catch(error => {
    console.error('测试过程中出现未预期的错误:', error);
});
