// 测试ad-auth.js模块的修复
const adAuth = require('./server/ad-auth');

// 测试authenticate方法
console.log('正在测试authenticate方法...');
adAuth.authenticate('guacamole', 'vg0xlwU_vng4P1gmV9jAE')
    .then(result => {
        console.log('authenticate结果:', result);
        
        // 测试getUserInfo方法
        console.log('\n正在测试getUserInfo方法...');
        return adAuth.getUserInfo('warcup.liao');
    })
    .then(userInfo => {
        console.log('getUserInfo结果:', JSON.stringify(userInfo, null, 2));
    })
    .catch(err => {
        console.error('测试过程中出错:', err);
    })
    .finally(() => {
        console.log('\n测试完成');
    });