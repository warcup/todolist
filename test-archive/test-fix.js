const fetch = require('node-fetch').default;

const baseUrl = 'http://localhost:3000';

async function testSessionPersistence() {
    console.log('测试会话持久化...');
    
    // 1. 登录获取JWT令牌
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-login-type': 'local',
            'Authorization': 'Basic dXNlcjE6cGFzc3dvcmQx'
        }
    });
    
    if (!loginResponse.ok) {
        console.error('登录失败:', await loginResponse.text());
        return false;
    }
    
    const loginData = await loginResponse.json();
    console.log('登录成功，获取到JWT令牌:', loginData.token);
    
    // 2. 使用JWT令牌访问受保护的路由
    const jwtResponse = await fetch(`${baseUrl}/api/data`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${loginData.token}`
        }
    });
    
    if (jwtResponse.ok) {
        console.log('JWT令牌验证成功，会话持久化正常工作');
        return true;
    } else {
        console.error('JWT令牌验证失败:', await jwtResponse.text());
        return false;
    }
}

async function testADPasswordChange() {
    console.log('\n测试域账号修改密码...');
    
    // 假设我们有一个域账号用户
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-login-type': 'ad',
            'Authorization': 'Basic dXNlcjE6cGFzc3dvcmQx'
        }
    });
    
    if (!loginResponse.ok) {
        console.error('域账号登录失败:', await loginResponse.text());
        return false;
    }
    
    const loginData = await loginResponse.json();
    console.log('域账号登录成功');
    
    // 尝试修改密码
    const changePwdResponse = await fetch(`${baseUrl}/api/change-pwd`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginData.token}`
        },
        body: JSON.stringify({
            oldPassword: 'password1',
            newPassword: 'newpassword1'
        })
    });
    
    if (changePwdResponse.status === 403) {
        console.log('域账号修改密码被拒绝，符合预期');
        return true;
    } else {
        console.error('域账号修改密码应该被拒绝，但得到状态码:', changePwdResponse.status);
        return false;
    }
}

async function runTests() {
    console.log('开始测试修改效果...');
    
    const test1 = await testSessionPersistence();
    const test2 = await testADPasswordChange();
    
    console.log('\n测试结果:');
    console.log(`会话持久化测试: ${test1 ? '通过' : '失败'}`);
    console.log(`域账号密码修改测试: ${test2 ? '通过' : '失败'}`);
}

runTests();
