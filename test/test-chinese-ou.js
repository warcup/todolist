// 测试中文OU是否影响认证
const ldap = require('ldapjs');

// 测试中文OU认证
const testChineseOu = async () => {
    const config = {
        url: 'ldap://10.100.30.100:389'
    };
    
    // 测试用户
    const username = 'warcup.liao';
    const password = 'Liaojianbo%1996';
    
    // 手动构造的DN（包含中文OU）
    const userDN = 'CN=廖建博,OU=运维组,OU=平台研发部,OU=盛业（大陆）,DC=SYF,DC=com';
    
    console.log('=== 测试中文OU认证 ===');
    console.log('AD服务器:', config.url);
    console.log('用户DN:', userDN);
    console.log('用户名:', username);
    console.log('密码:', password);
    
    // 创建客户端
    const client = ldap.createClient({ url: config.url });
    
    try {
        // 直接尝试认证
        console.log('\n尝试直接认证...');
        
        await new Promise((resolve, reject) => {
            client.bind(userDN, password, (err) => {
                if (err) {
                    console.error('✗ 认证失败:', err.message);
                    reject(err);
                } else {
                    console.log('✓ 认证成功!');
                    resolve();
                }
            });
        });
        
    } catch (error) {
        console.error('测试失败:', error.message);
    } finally {
        client.unbind();
    }
    
    console.log('\n=== 测试完成 ===');
};

// 运行测试
testChineseOu();