const adAuth = require('./server/ad-auth');

// 测试warcup.liao用户的AD认证
const testUser = {
    username: 'warcup.liao',
    password: 'Liaojianbo%1996'
};

console.log('=== 测试ad-auth.js模块 ===');
console.log('测试用户:', testUser.username);
console.log('测试密码:', testUser.password);

// 连接AD域
adAuth.connect()
    .then(connected => {
        if (connected) {
            console.log('AD域连接成功');
            
            // 测试认证
            return adAuth.authenticate(testUser.username, testUser.password);
        } else {
            console.error('AD域连接失败');
            return false;
        }
    })
    .then(authenticated => {
        console.log('认证结果:', authenticated ? '成功' : '失败');
        
        // 获取用户信息
        return adAuth.getUserInfo(testUser.username);
    })
    .then(userInfo => {
        console.log('用户信息:', JSON.stringify(userInfo, null, 2));
        
        // 断开连接
        adAuth.disconnect();
    })
    .catch(err => {
        console.error('测试过程中出错:', err);
        adAuth.disconnect();
    });
