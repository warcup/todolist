// 简单的LDAP认证测试脚本
const ldap = require('ldapjs');

// AD配置
const adConfig = {
    url: 'ldap://10.100.30.100:389',
    bindDN: 'cn=guacamole,ou=common,dc=syf,dc=com',
    bindPassword: 'vg0xlwU_vng4P1gmV9jAE',
    searchBase: 'dc=syf,dc=com',
    searchFilter: '(sAMAccountName=%(user)s)'
};

// 测试用户信息
const testUser = {
    username: 'warcup.liao',
    password: 'Liaojianbo%1996'
};

console.log('=== 简单LDAP认证测试 ===');
console.log(`测试用户: ${testUser.username}`);
console.log(`密码: ${testUser.password}`);

// 创建客户端
const client = ldap.createClient({ url: adConfig.url });

// 错误处理
client.on('error', (err) => {
    console.error('LDAP客户端错误:', err);
});

// 先绑定到AD服务器
client.bind(adConfig.bindDN, adConfig.bindPassword, (err) => {
    if (err) {
        console.error('❌ 绑定到AD服务器失败:', err);
        client.unbind();
        return;
    }
    
    console.log('✅ 成功绑定到AD服务器');
    
    // 搜索用户
    const searchFilter = adConfig.searchFilter.replace('%(user)s', testUser.username);
    const opts = {
        filter: searchFilter,
        scope: 'sub',
        attributes: ['dn', 'sAMAccountName']
    };
    
    console.log('\n🔍 搜索用户...');
    console.log('搜索过滤器:', searchFilter);
    
    client.search(adConfig.searchBase, opts, (err, res) => {
        if (err) {
            console.error('❌ 搜索用户失败:', err);
            client.unbind();
            return;
        }
        
        let userDN = null;
        
        res.on('searchEntry', (entry) => {
            console.log('✅ 找到用户条目');
            console.log('条目DN:', entry.dn);
            console.log('条目属性:', entry.attributes);
            userDN = entry.dn;
        });
        
        res.on('end', (result) => {
            console.log('\n📋 搜索完成');
            console.log('搜索结果状态:', result.status);
            
            if (!userDN) {
                console.error('❌ 未找到用户:', testUser.username);
                client.unbind();
                return;
            }
            
            console.log('\n🔐 尝试用户认证...');
            console.log('用户DN:', userDN);
            
            // 创建新的客户端进行用户认证
            const authClient = ldap.createClient({ url: adConfig.url });
            
            authClient.bind(userDN, testUser.password, (err) => {
                authClient.unbind();
                
                if (err) {
                    console.error('❌ 用户认证失败:', err);
                    console.error('错误代码:', err.code);
                    console.error('错误消息:', err.message);
                } else {
                    console.log('✅ 用户认证成功！');
                }
                
                // 关闭原始客户端
                client.unbind();
                console.log('\n=== 测试完成 ===');
            });
        });
        
        res.on('error', (err) => {
            console.error('❌ 搜索过程中出错:', err);
            client.unbind();
        });
    });
});
