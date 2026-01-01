// 测试OU筛选功能
const adAuth = require('../server/ad-auth');
const config = require('../server/config');

console.log('=== 测试OU筛选功能 ===');
console.log('当前搜索基础:', config.ad.searchBase);
console.log('搜索过滤器:', config.ad.searchFilter);

// 测试不同的用户
const testUsers = [
    { username: 'warcup.liao', password: 'Liaojianbo%1996', shouldAllow: true }, // 应该允许的用户
    { username: 'guacamole', password: 'vg0xlwU_vng4P1gmV9jAE', shouldAllow: false } // 来自ou=common的用户，应该拒绝
];

// 连接AD域
adAuth.connect()
    .then(connected => {
        if (connected) {
            console.log('AD域连接成功');
            
            // 依次测试每个用户
            let testIndex = 0;
            const testNextUser = () => {
                if (testIndex >= testUsers.length) {
                    console.log('\n=== 所有用户测试完成 ===');
                    adAuth.disconnect();
                    return;
                }
                
                const testUser = testUsers[testIndex++];
                console.log(`\n--- 测试用户 ${testIndex}/${testUsers.length} ---`);
                console.log(`用户名: ${testUser.username}`);
                console.log(`预期结果: ${testUser.shouldAllow ? '允许' : '拒绝'}`);
                
                // 测试认证
                adAuth.authenticate(testUser.username, testUser.password)
                    .then(authenticated => {
                        console.log(`认证结果: ${authenticated ? '成功' : '失败'}`);
                        
                        const result = authenticated === testUser.shouldAllow;
                        console.log(`测试结果: ${result ? '✓ 通过' : '✗ 失败'}`);
                        
                        if (!result) {
                            console.log(`  预期: ${testUser.shouldAllow ? '允许' : '拒绝'}`);
                            console.log(`  实际: ${authenticated ? '允许' : '拒绝'}`);
                        }
                        
                        // 继续测试下一个用户
                        testNextUser();
                    })
                    .catch(err => {
                        console.error('测试过程中出错:', err);
                        testNextUser();
                    });
            };
            
            // 开始测试
            testNextUser();
            
        } else {
            console.error('AD域连接失败');
            adAuth.disconnect();
        }
    })
    .catch(err => {
        console.error('测试过程中出错:', err);
        adAuth.disconnect();
    });