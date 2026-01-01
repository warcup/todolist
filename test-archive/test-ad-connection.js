// 简化的AD域连接测试脚本
const config = require('./server/config');

// 检查是否安装了LDAP库
try {
    const ldap = require('ldapjs');
    
    console.log('正在测试AD域连接...');
    console.log('配置信息:');
    console.log(`  URL: ${config.ad.url}`);
    console.log(`  SearchBase: ${config.ad.searchBase}`);
    console.log(`  SearchFilter: ${config.ad.searchFilter}`);
    console.log('');
    
    // 创建LDAP客户端
    const client = ldap.createClient({
        url: config.ad.url
    });
    
    // 错误事件处理
    client.on('error', (err) => {
        console.error('❌ AD域连接错误:', err.message);
        process.exit(1);
    });
    
    // 绑定到AD域
    client.bind(config.ad.username, config.ad.password, (err) => {
        if (err) {
            console.error('❌ AD域绑定失败:', err.message);
            client.unbind();
            process.exit(1);
        } else {
            console.log('✅ 成功绑定到AD域');
            
            // 测试搜索基础是否存在
            console.log('\n正在验证搜索基础（searchBase）是否存在...');
            const baseValidationOpts = {
                filter: '(objectClass=*)',
                scope: 'base',
                attributes: ['objectClass']
            };
            
            client.search(config.ad.searchBase, baseValidationOpts, (baseErr, baseRes) => {
                if (baseErr) {
                    console.error('❌ 搜索基础（searchBase）验证失败:', baseErr.message);
                    client.unbind();
                    process.exit(1);
                }
                
                let baseFound = false;
                baseRes.on('searchEntry', () => {
                    baseFound = true;
                });
                
                baseRes.on('end', (baseResult) => {
                    if (baseFound && baseResult.status === 0) {
                        console.log('✅ 搜索基础（searchBase）验证通过');
                        
                        // 直接测试特定用户搜索
                        console.log('\n正在测试特定用户搜索...');
                        const testUsername = 'guacamole';
                        const specificSearchOpts = {
                            filter: config.ad.searchFilter.replace('%(user)s', testUsername),
                            scope: 'sub',
                            attributes: config.ad.attributes
                        };
                        
                        console.log('搜索用户名:', testUsername);
                        console.log('搜索过滤器:', specificSearchOpts.filter);
                        
                        client.search(config.ad.searchBase, specificSearchOpts, (err, res) => {
                            if (err) {
                                console.error('❌ 特定用户搜索失败:', err.message);
                                console.error('   错误详情:', JSON.stringify(err, null, 2));
                                client.unbind();
                                process.exit(1);
                            }
                            
                            let foundUser = null;
                            
                            res.on('searchEntry', (entry) => {
                                foundUser = entry;
                            });
                            
                            res.on('error', (err) => {
                                console.error('❌ 特定用户搜索过程中发生错误:', err.message);
                            });
                            
                            res.on('end', (result) => {
                                client.unbind();
                                
                                if (result.status === 0) {
                                    if (foundUser) {
                                        console.log('✅ 成功找到特定用户！');
                                        console.log('用户对象类型:', typeof foundUser);
                                        console.log('用户详细信息:');
                                        console.log(`  dn: ${foundUser.dn}`);
                                        
                                        // 尝试打印用户属性
                                        if (foundUser.attributes) {
                                            console.log('  属性:');
                                            foundUser.attributes.forEach(attr => {
                                                if (attr.values && attr.values.length > 0) {
                                                    console.log(`    ${attr.type}: ${attr.values.join(', ')}`);
                                                }
                                            });
                                        }
                                        console.log('\n✅ AD域配置测试成功！');
                                    } else {
                                        console.log('❌ 特定用户搜索完成，但未找到指定用户');
                                        console.log(`搜索的用户名: ${testUsername}`);
                                    }
                                } else {
                                    console.log('\n❌ 特定用户搜索操作返回错误状态:', result.status);
                                }
                            });
                        });
                    } else {
                        console.error('❌ 搜索基础（searchBase）验证失败');
                        client.unbind();
                        process.exit(1);
                    }
                });
            });
        }
    });
    
} catch (error) {
    console.error('❌ LDAP库不可用:', error.message);
    console.error('请安装LDAP库: npm install ldapjs');
    process.exit(1);
}