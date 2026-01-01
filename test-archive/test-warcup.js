const ldap = require('ldapjs');
const config = require('./server/config');

// 测试warcup.liao用户的AD认证
const testUser = {
    username: 'warcup.liao',
    password: 'Liaojianbo%1996'
};

console.log('=== 测试warcup.liao用户AD认证 ===');
console.log('测试用户:', testUser.username);
console.log('测试密码:', testUser.password);
console.log('AD配置:', {
    url: config.ad.url,
    searchBase: config.ad.searchBase,
    searchFilter: config.ad.searchFilter,
    bindDN: config.ad.username
});
console.log('\n1. 连接AD域并绑定服务账号');

// 1. 连接AD域并绑定服务账号
const client = ldap.createClient({ url: config.ad.url });

client.on('error', (err) => {
    console.error('连接错误:', err);
    client.unbind();
});

client.bind(config.ad.username, config.ad.password, (err) => {
    if (err) {
        console.error('服务账号绑定失败:', err);
        client.unbind();
        return;
    }
    
    console.log('服务账号绑定成功');
    console.log('\n2. 搜索用户DN');
    
    // 2. 搜索用户DN
    const searchFilter = config.ad.searchFilter.replace('%(user)s', testUser.username);
    const opts = {
        filter: searchFilter,
        scope: 'sub',
        attributes: ['dn', 'sAMAccountName', 'userPrincipalName']
    };
    
    console.log('搜索过滤器:', searchFilter);
    console.log('搜索范围:', opts.scope);
    console.log('搜索属性:', opts.attributes);
    
    let userDN = null;
    let userPrincipalName = null;
    let samAccountName = null;
    
    client.search(config.ad.searchBase, opts, (err, res) => {
        if (err) {
            console.error('搜索失败:', err);
            client.unbind();
            return;
        }
        
        res.on('searchEntry', (entry) => {
            console.log('找到用户条目:');
            console.log('  DN:', entry.dn);
            console.log('  DN类型:', typeof entry.dn);
            console.log('  原始DN:', JSON.stringify(entry.dn));
            
            // 获取属性
            if (entry.attributes) {
                entry.attributes.forEach(attr => {
                    console.log(`  ${attr.type}:`, attr.values);
                    if (attr.type === 'userPrincipalName') {
                        userPrincipalName = attr.values[0];
                    }
                    if (attr.type === 'sAMAccountName') {
                        samAccountName = attr.values[0];
                    }
                });
            }
            
            userDN = entry.dn;
        });
        
        res.on('searchReference', (referral) => {
            console.log('搜索引用:', referral.uris);
        });
        
        res.on('error', (err) => {
            console.error('搜索过程错误:', err);
        });
        
        res.on('end', (result) => {
            console.log('搜索完成，结果状态:', result.status);
            
            if (result.status !== 0) {
                console.error('搜索失败，状态码:', result.status);
                client.unbind();
                return;
            }
            
            if (!userDN) {
                console.log('未找到用户:', testUser.username);
                client.unbind();
                return;
            }
            
            console.log('\n3. 验证用户DN和密码');
            console.log('用户DN:', userDN);
            console.log('sAMAccountName:', samAccountName);
            console.log('userPrincipalName:', userPrincipalName);
            console.log('密码:', testUser.password);
            
            // 3. 使用用户DN和密码进行绑定验证
            const authClient = ldap.createClient({ url: config.ad.url });
            
            authClient.on('error', (err) => {
                console.error('用户认证连接错误:', err);
                authClient.unbind();
            });
            
            // 测试不同的认证方式
            testAuth(authClient, userDN, testUser.password, '用户DN');
            
            // 如果有userPrincipalName，也测试一下
            if (userPrincipalName) {
                setTimeout(() => {
                    const upnAuthClient = ldap.createClient({ url: config.ad.url });
                    testAuth(upnAuthClient, userPrincipalName, testUser.password, 'UserPrincipalName');
                }, 500);
            }
            
            // 测试不同的用户名格式
            setTimeout(() => {
                const formatTestClient = ldap.createClient({ url: config.ad.url });
                const testUsername = testUser.username.toUpperCase();
                const formatSearchFilter = config.ad.searchFilter.replace('%(user)s', testUsername);
                testFormatSearch(formatTestClient, formatSearchFilter, testUsername, '大写用户名');
            }, 1000);
        });
    });
});

// 测试用户认证
function testAuth(client, dn, password, authType) {
    console.log(`\n3.1 使用${authType}认证`);
    console.log(`   ${authType}:`, dn);
    console.log(`   密码:`, password);
    console.log(`   密码长度:`, password.length);
    console.log(`   密码类型:`, typeof password);
    console.log(`   密码JSON:`, JSON.stringify(password));
    console.log(`   密码转义:`, escape(password));
    
    client.bind(dn, password, (err) => {
        client.unbind();
        
        if (err) {
            console.error(`   ${authType}认证失败:`, err);
            console.error(`   错误代码:`, err.code);
            console.error(`   错误消息:`, err.message);
            console.error(`   错误名称:`, err.name);
        } else {
            console.log(`   ${authType}认证成功!`);
        }
    });
}

// 测试不同格式的用户名搜索
function testFormatSearch(client, searchFilter, username, testName) {
    console.log(`\n4. 测试${testName}: ${username}`);
    console.log(`   搜索过滤器:`, searchFilter);
    
    const opts = {
        filter: searchFilter,
        scope: 'sub',
        attributes: ['dn', 'sAMAccountName']
    };
    
    client.bind(config.ad.username, config.ad.password, (err) => {
        if (err) {
            console.error(`   服务账号绑定失败:`, err);
            client.unbind();
            return;
        }
        
        client.search(config.ad.searchBase, opts, (err, res) => {
            if (err) {
                console.error(`   ${testName}搜索失败:`, err);
                client.unbind();
                return;
            }
            
            let found = false;
            res.on('searchEntry', (entry) => {
                found = true;
                console.log(`   ${testName}搜索成功:`);
                console.log(`   DN:`, entry.dn);
                console.log(`   sAMAccountName:`, entry.attributes.find(a => a.type === 'sAMAccountName')?.values[0]);
            });
            
            res.on('end', () => {
                if (!found) {
                    console.log(`   ${testName}搜索未找到用户`);
                }
                client.unbind();
            });
        });
    });
}

console.log('\n=== 测试开始 ===\n');
