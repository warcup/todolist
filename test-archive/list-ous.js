// 列出AD域中的所有OU，以确认正确的OU路径
const adAuth = require('../server/ad-auth');
const config = require('../server/config');

console.log('=== 列出AD域中的所有OU ===');
console.log('AD服务器:', config.ad.url);
console.log('搜索基础:', config.ad.baseDN);

// 连接AD域
adAuth.connect()
    .then(connected => {
        if (connected) {
            console.log('AD域连接成功');
            
            // 搜索所有OU
            return new Promise((resolve, reject) => {
                const opts = {
                    filter: '(objectClass=organizationalUnit)',
                    scope: 'sub',
                    attributes: ['ou', 'distinguishedName']
                };
                
                console.log('开始搜索所有OU...');
                adAuth.client.search(config.ad.baseDN, opts, (err, res) => {
                    if (err) {
                        console.error('搜索OU失败:', err);
                        reject(err);
                        return;
                    }
                    
                    const ous = [];
                    
                    res.on('searchEntry', (entry) => {
                        try {
                            let ouName = null;
                            let dn = null;
                            
                            // 尝试获取OU名称
                            if (entry.object) {
                                ouName = entry.object.ou;
                                dn = entry.object.distinguishedName || entry.dn;
                            } else if (entry.attributes) {
                                const getAttributeValue = (attrName) => {
                                    const attr = entry.attributes.find(a => 
                                        a.type.toLowerCase() === attrName.toLowerCase()
                                    );
                                    return attr && attr.values && attr.values.length > 0 ? attr.values[0] : undefined;
                                };
                                
                                ouName = getAttributeValue('ou');
                                dn = getAttributeValue('distinguishedName') || entry.dn;
                            }
                            
                            if (ouName && dn) {
                                ous.push({
                                    name: ouName,
                                    dn: dn,
                                    escapedDn: escape(dn)
                                });
                            }
                        } catch (error) {
                            console.error('解析OU条目时出错:', error);
                        }
                    });
                    
                    res.on('end', (result) => {
                        console.log(`搜索完成，找到 ${ous.length} 个OU`);
                        resolve(ous);
                    });
                    
                    res.on('error', (err) => {
                        console.error('搜索过程中出错:', err);
                        reject(err);
                    });
                });
            });
        } else {
            console.error('AD域连接失败');
            return [];
        }
    })
    .then(ous => {
        // 打印所有OU信息
        if (ous.length > 0) {
            console.log('\n=== 找到的OU列表 ===');
            ous.forEach((ou, index) => {
                console.log(`${index + 1}. 名称: ${ou.name}`);
                console.log(`   DN: ${ou.dn}`);
                console.log(`   编码形式: ${ou.escapedDn}`);
                console.log('   ---');
            });
            
            // 查找包含"盛业"的OU
            const syOus = ous.filter(ou => ou.name.includes('盛业') || ou.dn.includes('盛业'));
            if (syOus.length > 0) {
                console.log('\n=== 包含"盛业"的OU ===');
                syOus.forEach((ou, index) => {
                    console.log(`${index + 1}. 名称: ${ou.name}`);
                    console.log(`   DN: ${ou.dn}`);
                    console.log('   ---');
                });
            }
        } else {
            console.log('未找到任何OU');
        }
        
        // 断开连接
        adAuth.disconnect();
    })
    .catch(err => {
        console.error('测试过程中出错:', err);
        adAuth.disconnect();
    });