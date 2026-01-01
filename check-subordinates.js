const config = require('./server/config');
// 直接使用已经实现的ADAuth类
const adAuth = require('./server/ad-auth');

// 检查用户是否在指定OU中
const checkUserInOU = (userDN, ouList) => {
    if (!userDN) {
        return { inAllowedOU: false, ou: null };
    }
    
    const userDNLower = userDN.toLowerCase();
    
    for (const ou of ouList) {
        const ouLower = ou.toLowerCase();
        if (userDNLower.includes(ouLower)) {
            return { inAllowedOU: true, ou: ou };
        }
    }
    
    return { inAllowedOU: false, ou: null };
};

// 主函数
const main = async () => {
    const targetUser = 'warcup.liao';
    const allowedOUs = config.ad.searchBase.split('|').map(ou => ou.trim()).filter(ou => ou);
    
    console.log('=' .repeat(60));
    console.log('检查用户下级脚本');
    console.log('=' .repeat(60));
    console.log(`目标用户: ${targetUser}`);
    console.log(`允许的OU: ${allowedOUs.join(', ')}`);
    console.log('=' .repeat(60));
    
    try {
        // 使用adAuth类获取用户信息
        console.log('\n1. 获取用户信息...');
        const userInfo = await adAuth.getUserInfo(targetUser);
        
        if (!userInfo || !userInfo.distinguishedName) {
            console.error('无法获取用户DN:', targetUser);
            return;
        }
        
        console.log('✓ 用户信息:');
        console.log(`  DN: ${userInfo.distinguishedName}`);
        console.log(`  姓名: ${userInfo.fullName}`);
        console.log(`  部门: ${userInfo.department}`);
        console.log(`  职位: ${userInfo.title}`);
        console.log(`  邮箱: ${userInfo.email}`);
        
        // 使用adAuth类获取用户下级
        console.log('\n2. 获取用户下级...');
        const subordinates = await adAuth.getSubordinates(targetUser);
        
        console.log(`✓ 找到 ${subordinates.length} 个下级用户`);
        
        // 检查每个下级是否在指定OU中
        console.log('\n' + '=' .repeat(60));
        console.log('下级用户OU检查结果:');
        console.log('=' .repeat(60));
        
        if (subordinates.length > 0) {
            subordinates.forEach(user => {
                console.log(`${user.name} (${user.id})`);
                console.log(`  部门: ${user.department || 'N/A'}`);
                console.log(`  职位: ${user.title || 'N/A'}`);
                console.log(`  邮箱: ${user.email || 'N/A'}`);
            });
        } else {
            console.log('未找到任何下级用户');
        }
        
        // 直接使用adAuth的方法获取所有下级（包括不在OU中的）
        console.log('\n' + '=' .repeat(60));
        console.log('直接使用adAuth的getUserInfo和搜索所有用户的对比:');
        console.log('=' .repeat(60));
        
        // 手动在整个域中搜索所有manager为当前用户的用户
        console.log('\n3. 手动在整个域中搜索所有下级用户...');
        
        // 这里我们将直接输出adAuth.getSubordinates的内部日志
        console.log('注意: 查看服务器日志以获取完整的搜索过程...');
        
    } catch (error) {
        console.error('执行过程中出错:', error);
        console.error('错误详细信息:', error.stack);
        process.exit(1);
    }
};

// 执行主函数
main();