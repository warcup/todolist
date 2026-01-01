const adAuth = require('./server/ad-auth');

// 测试获取warcup.liao的下级用户
const testSubordinates = async () => {
    console.log('测试获取warcup.liao的下级用户...');
    
    try {
        const subordinates = await adAuth.getSubordinates('warcup.liao');
        console.log(`\n获取到 ${subordinates.length} 个下级用户:`);
        
        if (subordinates.length > 0) {
            subordinates.forEach((user, index) => {
                console.log(`\n${index + 1}. ${user.name} (${user.id})`);
                console.log(`   部门: ${user.department || 'N/A'}`);
                console.log(`   职位: ${user.title || 'N/A'}`);
                console.log(`   邮箱: ${user.email || 'N/A'}`);
            });
        } else {
            console.log('未找到任何下级用户');
        }
    } catch (error) {
        console.error('获取下级用户失败:', error);
    }
};

testSubordinates();