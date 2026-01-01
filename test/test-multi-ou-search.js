// 测试多OU搜索功能
const adAuth = require('../server/ad-auth');
const config = require('../server/config');

console.log('=== 测试多OU搜索功能 ===');
console.log('当前搜索基础:', config.ad.searchBase);
console.log('搜索过滤器:', config.ad.searchFilter);

// 测试用户
const testUser = {
    username: 'warcup.liao',
    password: 'Liaojianbo%1996'
};

// 连接AD域
adAuth.connect()
    .then(connected => {
        if (connected) {
            console.log('AD域连接成功');
            
            // 测试认证 - 这将使用多OU搜索
            return adAuth.authenticate(testUser.username, testUser.password);
        } else {
            console.error('AD域连接失败');
            return false;
        }
    })
    .then(authenticated => {
        console.log('认证结果:', authenticated ? '成功' : '失败');
        
        // 获取用户信息 - 这将使用多OU搜索
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