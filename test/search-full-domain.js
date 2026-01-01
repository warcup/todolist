// 搜索整个域查找warcup.liao用户
const adAuth = require('../server/ad-auth');
const config = require('../server/config');

console.log('=== 搜索整个域查找warcup.liao用户 ===');
console.log('AD服务器:', config.ad.url);
console.log('完整搜索基础:', 'DC=SYF,DC=com');
console.log('搜索过滤器:', config.ad.searchFilter.replace('%(user)s', 'warcup.liao'));

// 连接AD域
adAuth.connect()
    .then(connected => {
        if (connected) {
            console.log('AD域连接成功');
            
            // 创建自定义搜索方法，直接搜索整个域
            return new Promise((resolve, reject) => {
                const searchFilter = config.ad.searchFilter.replace('%(user)s', 'warcup.liao');
                const opts = {
                    filter: searchFilter,
                    scope: 'sub',
                    attributes: ['dn', 'distinguishedName', 'cn', 'samaccountname', 'userPrincipalName']
                };
                
                console.log('开始搜索整个域...');
                adAuth.client.search('DC=SYF,DC=com', opts, (err, res) => {
                    if (err) {
                        console.error('搜索失败:', err);
                        reject(err);
                        return;
                    }
                    
                    let foundUser = null;
                    
                    res.on('searchEntry', (entry) => {
                        console.log('找到用户条目:');
                        console.log('  DN对象:', entry.dn);
                        console.log('  条目原始数据:', JSON.stringify(entry, null, 2));
                        
                        // 使用与ad-auth.js相同的方式解析条目
                        try {
                            let dnValue = null;
                            let samAccountName = null;
                            let userPrincipalName = null;
                            let cn = null;
                            
                            // 处理DN
                            if (entry.dn) {
                                if (typeof entry.dn === 'string') {
                                    dnValue = entry.dn;
                                } else if (entry.dn.toString) {
                                    dnValue = entry.dn.toString();
                                }
                            }
                            
                            // 处理属性
                            if (entry.object) {
                                samAccountName = entry.object.samaccountname || entry.object.sAMAccountName;
                                userPrincipalName = entry.object.userPrincipalName;
                                cn = entry.object.cn;
                            } else if (entry.attributes) {
                                const getAttributeValue = (attrName) => {
                                    const attr = entry.attributes.find(a => 
                                        a.type.toLowerCase() === attrName.toLowerCase()
                                    );
                                    return attr && attr.values && attr.values.length > 0 ? attr.values[0] : undefined;
                                };
                                
                                samAccountName = getAttributeValue('samaccountname');
                                userPrincipalName = getAttributeValue('userPrincipalName');
                                cn = getAttributeValue('cn');
                            }
                            
                            console.log('  解析后的DN:', dnValue);
                            console.log('  解析后的用户名:', samAccountName);
                            console.log('  解析后的UPN:', userPrincipalName);
                            console.log('  解析后的姓名:', cn);
                            
                            foundUser = {
                                entry: entry,
                                dn: dnValue,
                                username: samAccountName,
                                upn: userPrincipalName,
                                cn: cn
                            };
                        } catch (error) {
                            console.error('解析条目时出错:', error);
                        }
                    });
                    
                    res.on('end', (result) => {
                        if (foundUser) {
                            console.log('\n搜索完成，找到用户!');
                            resolve(foundUser);
                        } else {
                            console.log('\n搜索完成，未找到用户');
                            resolve(null);
                        }
                    });
                    
                    res.on('error', (err) => {
                        console.error('搜索过程中出错:', err);
                        reject(err);
                    });
                });
            });
        } else {
            console.error('AD域连接失败');
            return null;
        }
    })
    .then(foundUser => {
        if (foundUser && foundUser.dn) {
            // 检查用户是否在指定OU中
            const userDN = foundUser.dn;
            const targetOU = 'OU=盛业（大陆）,DC=SYF,DC=com';
            
            console.log('\n=== 用户位置检查 ===');
            console.log('用户DN:', userDN);
            console.log('目标OU:', targetOU);
            
            if (userDN.includes(targetOU)) {
                console.log('✓ 用户确实在目标OU中!');
            } else {
                console.log('✗ 用户不在目标OU中');
                console.log('  用户实际DN:', userDN);
                console.log('  建议检查用户实际所在的OU路径');
            }
        } else {
            console.log('未找到用户或无法解析DN，无法进行位置检查');
        }
        
        // 断开连接
        adAuth.disconnect();
    })
    .catch(err => {
        console.error('测试过程中出错:', err);
        adAuth.disconnect();
    });