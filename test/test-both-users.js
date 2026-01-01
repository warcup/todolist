// 同时测试两个用户
const adAuth = require('./server/ad-auth');

// 测试用户列表
const testUsers = [
    { username: 'guacamole', password: 'vg0xlwU_vng4P1gmV9jAE', label: 'guacamole用户' },
    { username: 'warcup.liao', password: 'Liaojianbo%1996', label: 'warcup.liao用户' }
];

// 逐个测试用户
const runTests = async () => {
    console.log('=== 测试多个AD用户认证 ===\n');
    
    for (const test of testUsers) {
        console.log(`--- 测试: ${test.label} (${test.username}) ---`);
        
        try {
            // 重置连接
            adAuth.client = null;
            
            // 测试认证
            const result = await adAuth.authenticate(test.username, test.password);
            
            console.log(`认证结果: ${result}`);
            if (result) {
                console.log('✓ 认证成功！');
            } else {
                console.log('✗ 认证失败！');
            }
            
        } catch (err) {
            console.error('认证过程中出错:', err);
        } finally {
            // 断开连接
            adAuth.disconnect();
            console.log('');
        }
    }
    
    console.log('=== 所有测试完成 ===');
};

// 运行测试
runTests();