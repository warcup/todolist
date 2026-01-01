// 调试完整的AD认证流程
const adAuth = require('./server/ad-auth');
const config = require('./server/config');

// 测试完整认证流程
const testFullAuth = async (username, password) => {
    console.log(`\n=== 测试完整认证流程: ${username} ===`);
    
    try {
        // 1. 连接到AD
        console.log('1. 连接到AD...');
        const connected = await adAuth.connect();
        if (!connected) {
            console.error('无法连接到AD域');
            return false;
        }
        console.log('✓ 成功连接到AD域');
        
        // 2. 搜索用户
        console.log('\n2. 搜索用户...');
        const client = adAuth.client;
        let userDN = null;
        let foundUsername = null;
        
        const searchFilter = config.ad.searchFilter.replace('%(user)s', username);
        const opts = {
            filter: searchFilter,
            scope: 'sub',
            attributes: ['dn', 'sAMAccountName', 'cn']
        };
        
        await new Promise((resolve, reject) => {
            client.search(config.ad.searchBase, opts, (err, res) => {
                if (err) {
                    console.error('搜索错误:', err);
                    resolve();
                    return;
                }
                
                res.on('searchEntry', (entry) => {
                    console.log('找到用户:');
                    console.log('  输入的用户名:', username);
                    userDN = entry.dn;
                    console.log('  返回的DN:', userDN);
                    
                    // 获取返回的sAMAccountName
                    if (entry.object?.sAMAccountName) {
                        foundUsername = entry.object.sAMAccountName;
                    } else if (entry.attributes) {
                        const samAccountNameAttr = entry.attributes.find(a => 
                            a.type.toLowerCase() === 'samaccountname'
                        );
                        if (samAccountNameAttr && samAccountNameAttr.values && samAccountNameAttr.values.length > 0) {
                            foundUsername = samAccountNameAttr.values[0];
                        }
                    }
                    console.log('  返回的sAMAccountName:', foundUsername);
                    console.log('  用户名是否完全匹配:', username === foundUsername);
                });
                
                res.on('end', () => {
                    if (!userDN) {
                        console.error('✗ 未找到用户');
                    } else {
                        console.log('✓ 找到用户');
                    }
                    resolve();
                });
                
                res.on('error', (err) => {
                    console.error('搜索响应错误:', err);
                    resolve();
                });
            });
        });
        
        if (!userDN) {
            return false;
        }
        
        // 3. 使用用户DN和密码进行绑定
        console.log('\n3. 使用用户DN和密码进行绑定...');
        console.log('  使用的DN:', userDN);
        console.log('  使用的密码:', password ? '[已提供]' : '[未提供]');
        
        const authClient = require('ldapjs').createClient({ url: config.ad.url });
        
        const bindResult = await new Promise((resolve, reject) => {
            authClient.bind(userDN, password, (err) => {
                authClient.unbind();
                if (err) {
                    console.error('✗ 绑定失败:', err);
                    resolve(false);
                } else {
                    console.log('✓ 绑定成功');
                    resolve(true);
                }
            });
        });
        
        return bindResult;
        
    } catch (error) {
        console.error('测试过程中出错:', error);
        return false;
    } finally {
        // 断开连接
        adAuth.disconnect();
    }
};

// 测试两个用户
const runTests = async () => {
    console.log('=== 完整AD认证流程调试工具 ===');
    
    // 测试guacamole用户
    await testFullAuth('guacamole', 'vg0xlwU_vng4P1gmV9jAE');
    
    // 测试warcup.liao用户
    await testFullAuth('warcup.liao', 'Liaojianbo%1996');
    
    // 测试使用AD返回的实际用户名
    await testFullAuth('Warcup.Liao', 'Liaojianbo%1996');
    
    console.log('\n=== 所有测试完成 ===');
};

// 启动测试
runTests();