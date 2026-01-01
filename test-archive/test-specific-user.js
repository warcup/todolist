// 测试特定用户的AD认证
const adAuth = require('./server/ad-auth');

// 测试warcup.liao用户认证
const testUser = 'warcup.liao';
const testPassword = 'Liaojianbo%1996';

console.log(`正在测试用户 ${testUser} 的认证...`);
adAuth.authenticate(testUser, testPassword)
    .then(result => {
        console.log(`认证结果: ${result}`);
        if (result) {
            console.log('认证成功！');
            // 如果认证成功，获取用户信息
            return adAuth.getUserInfo(testUser);
        } else {
            console.log('认证失败！');
            return null;
        }
    })
    .then(userInfo => {
        if (userInfo) {
            console.log('\n用户信息:');
            console.log(JSON.stringify(userInfo, null, 2));
        }
    })
    .catch(err => {
        console.error('测试过程中出错:', err);
    })
    .finally(() => {
        console.log('\n测试完成');
    });
