// 调试OU搜索问题的详细测试脚本
const adAuth = require('../server/ad-auth');
const config = require('../server/config');

console.log('=== 详细调试OU搜索问题 ===');
console.log('AD服务器:', config.ad.url);

// 连接AD域
adAuth.connect()
    .then(connected => {
        if (connected) {
            console.log('AD域连接成功');
            
            // 测试不同的OU处理方式
            const testOUs = [
                'OU=盛业（大陆）,DC=SYF,DC=com',  // 原始OU名称
                'OU=盛业\28大陆\29,DC=SYF,DC=com',  // 转义括号
                'OU=\e7\9b\9b\e4\b8\9a\ef\bc\88\e5\a4\a7\e9\99\86\ef\bc\89,DC=SYF,DC=com'  // UTF-8编码
            ];
            
            let testIndex = 0;
            const testNextOU = () => {
                if (testIndex >= testOUs.length) {
                    console.log('\n=== 所有OU测试完成 ===');
                    adAuth.disconnect();
                    return;
                }
                
                const currentOU = testOUs[testIndex++];
                console.log(`\n--- 测试第 ${testIndex}/${testOUs.length} 个OU格式 ---`);
                console.log(`OU格式: ${currentOU}`);
                console.log(`原始格式: OU=盛业（大陆）,DC=SYF,DC=com`);
                console.log(`编码比较: ${escape(currentOU)} vs ${escape('OU=盛业（大陆）,DC=SYF,DC=com')}`);
                
                // 尝试直接搜索这个OU
                const opts = {
                    filter: '(objectClass=*)',
                    scope: 'base',  // 只搜索当前OU本身
                    attributes: ['ou', 'distinguishedName']
                };
                
                console.log('尝试搜索OU本身...');
                adAuth.client.search(currentOU, opts, (err, res) => {
                    if (err) {
                        console.error('搜索OU本身失败:', err);
                        console.error('错误详情:', JSON.stringify(err, null, 2));
                    } else {
                        let found = false;
                        res.on('searchEntry', (entry) => {
                            console.log('✓ 成功找到OU:', entry.object.ou || 'Unknown');
                            console.log('  DN:', entry.object.distinguishedName || entry.dn);
                            found = true;
                        });
                        
                        res.on('end', (result) => {
                            if (!found) {
                                console.log('✗ 未找到OU');
                            }
                            console.log('搜索结果状态:', result.status);
                        });
                        
                        res.on('error', (err) => {
                            console.error('搜索过程中出错:', err);
                        });
                    }
                    
                    // 测试搜索这个OU下的用户
                    console.log('\n尝试搜索OU下的用户...');
                    const userOpts = {
                        filter: '(sAMAccountName=warcup.liao)',
                        scope: 'sub',
                        attributes: ['dn', 'sAMAccountName']
                    };
                    
                    adAuth.client.search(currentOU, userOpts, (err, res) => {
                        if (err) {
                            console.error('搜索用户失败:', err);
                        } else {
                            let found = false;
                            res.on('searchEntry', (entry) => {
                                console.log('✓ 在OU中找到用户:', entry.object.sAMAccountName || entry.dn);
                                console.log('  用户DN:', entry.dn);
                                found = true;
                            });
                            
                            res.on('end', (result) => {
                                if (!found) {
                                    console.log('✗ 在OU中未找到用户');
                                }
                                console.log('用户搜索结果状态:', result.status);
                                
                                // 继续下一个测试
                                testNextOU();
                            });
                            
                            res.on('error', (err) => {
                                console.error('用户搜索过程中出错:', err);
                                testNextOU();
                            });
                        }
                    });
                });
            };
            
            // 开始测试
            testNextOU();
            
        } else {
            console.error('AD域连接失败');
            adAuth.disconnect();
        }
    })
    .catch(err => {
        console.error('测试过程中出错:', err);
        adAuth.disconnect();
    });