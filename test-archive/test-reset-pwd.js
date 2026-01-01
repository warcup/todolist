const fetch = require('node-fetch');

// 测试密码重置功能
async function testResetPwd() {
    const adminUser = 'test';
    const adminPwd = '123456'; // 假设密码是123456
    const targetUser = 'ad'; // 本地用户，应该可以重置
    const targetUser2 = 'guacamole'; // 域用户，不应该可以重置
    
    // 构建登录请求
    const loginUrl = 'http://localhost:3000/api/login';
    const resetPwdUrl = 'http://localhost:3000/api/admin/reset-pwd';
    
    try {
        // 1. 登录获取JWT令牌
        console.log('登录管理员账号...');
        const basicToken = Buffer.from(`${adminUser}:${adminPwd}`).toString('base64');
        const loginRes = await fetch(loginUrl, {
            method: 'POST',
            headers: {
                'Authorization': basicToken,
                'x-login-type': 'local'
            }
        });
        
        if (!loginRes.ok) {
            console.error('登录失败:', loginRes.status);
            return;
        }
        
        const loginData = await loginRes.json();
        const jwtToken = loginData.token;
        console.log('登录成功，获取到JWT令牌:', jwtToken ? 'Yes' : 'No');
        
        // 2. 尝试重置本地用户密码
        console.log(`\n尝试重置本地用户 ${targetUser} 的密码...`);
        const resetLocalRes = await fetch(resetPwdUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ targetUser })
        });
        
        const resetLocalData = await resetLocalRes.json();
        console.log('重置本地用户密码结果:', resetLocalData);
        
        // 3. 尝试重置域用户密码
        console.log(`\n尝试重置域用户 ${targetUser2} 的密码...`);
        const resetAdRes = await fetch(resetPwdUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ targetUser: targetUser2 })
        });
        
        const resetAdData = await resetAdRes.json();
        console.log('重置域用户密码结果:', resetAdData);
        
    } catch (error) {
        console.error('测试过程中发生错误:', error);
    }
}

testResetPwd();