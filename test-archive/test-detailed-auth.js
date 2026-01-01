// 详细测试AD认证
const adAuth = require('./server/ad-auth');

// 测试warcup.liao用户的不同格式和密码
const testCases = [
    {
        username: 'warcup.liao',
        password: 'Liaojianbo%1996',
        description: '小写用户名格式'
    },
    {
        username: 'Warcup.Liao',
        password: 'Liaojianbo%1996',
        description: '首字母大写用户名格式'
    },
    {
        username: 'WARCUP.LIAO',
        password: 'Liaojianbo%1996',
        description: '全大写用户名格式'
    },
    {
        username: 'warcup',
        password: 'Liaojianbo%1996',
        description: '短用户名格式'
    }
];

// 测试用户名查找
console.log('=== 测试用户名查找 ===');
adAuth.getUserInfo('warcup.liao')
    .then(userInfo => {
        console.log('warcup.liao 用户信息:');
        console.log(JSON.stringify(userInfo, null, 2));
        
        // 测试不同格式的用户名认证
        console.log('\n=== 测试不同格式的用户名认证 ===');
        let index = 0;
        
        const runNextTest = () => {
            if (index >= testCases.length) {
                console.log('\n=== 所有测试完成 ===');
                return;
            }
            
            const testCase = testCases[index++];
            console.log(`\n--- 测试 ${index}: ${testCase.description} ---`);
            console.log(`用户名: ${testCase.username}`);
            console.log(`密码: ${testCase.password}`);
            
            adAuth.authenticate(testCase.username, testCase.password)
                .then(result => {
                    console.log(`认证结果: ${result}`);
                    if (result) {
                        console.log('✅ 认证成功！');
                    } else {
                        console.log('❌ 认证失败！');
                    }
                    
                    // 继续下一个测试
                    runNextTest();
                })
                .catch(err => {
                    console.error('❌ 认证过程中出错:', err.message);
                    
                    // 继续下一个测试
                    runNextTest();
                });
        };
        
        // 开始运行测试
        runNextTest();
    })
    .catch(err => {
        console.error('获取用户信息失败:', err);
    });
