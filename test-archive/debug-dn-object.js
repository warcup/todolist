// 调试DN对象结构
const ldap = require('ldapjs');
const config = require('./server/config');

// 测试DN对象结构
const debugDnObject = async () => {
    console.log('=== 调试DN对象结构 ===');
    
    // 创建客户端
    const client = ldap.createClient({ url: config.ad.url });
    
    try {
        // 绑定到AD
        await new Promise((resolve, reject) => {
            client.bind(config.ad.username, config.ad.password, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
        
        console.log('✓ 成功绑定到AD');
        
        // 搜索用户
        await new Promise((resolve, reject) => {
            client.search(config.ad.searchBase, {
                filter: config.ad.searchFilter.replace('%(user)s', 'guacamole'),
                scope: 'sub',
                attributes: ['dn', 'sAMAccountName']
            }, (err, res) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                res.on('searchEntry', (entry) => {
                    console.log('\n=== 搜索结果 ===');
                    console.log('原始entry.dn:', entry.dn);
                    console.log('entry.dn类型:', typeof entry.dn);
                    console.log('entry.dn.toString():', entry.dn.toString());
                    console.log('entry.dn.inspect():', require('util').inspect(entry.dn));
                    console.log('JSON.stringify(entry.dn):', JSON.stringify(entry.dn));
                    console.log('Object.keys(entry.dn):', Object.keys(entry.dn));
                    
                    // 检查entry.dn的属性
                    console.log('\n=== entry.dn属性 ===');
                    for (const key in entry.dn) {
                        if (entry.dn.hasOwnProperty(key)) {
                            console.log(`${key}:`, entry.dn[key]);
                        }
                    }
                    
                    // 检查entry.object
                    console.log('\n=== entry.object ===');
                    console.log('entry.object:', entry.object);
                    
                    // 检查entry.raw
                    console.log('\n=== entry.raw ===');
                    console.log('entry.raw:', entry.raw);
                    
                    // 检查entry.attributes
                    console.log('\n=== entry.attributes ===');
                    console.log('entry.attributes:', entry.attributes);
                });
                
                res.on('end', () => resolve());
                res.on('error', (e) => reject(e));
            });
        });
        
    } catch (error) {
        console.error('错误:', error);
    } finally {
        // 断开连接
        client.unbind();
    }
    
    console.log('\n=== 测试完成 ===');
};

// 运行测试
debugDnObject();