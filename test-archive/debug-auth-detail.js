// 详细调试AD认证问题
const adAuth = require('./server/ad-auth');
const config = require('./server/config');
const ldap = require('ldapjs');

// 测试不同的用户名格式和密码处理
const testAuthVariations = async () => {
    const username = 'warcup.liao';
    const password = 'Liaojianbo%1996';
    
    // 测试不同的用户名格式
    const usernameVariations = [
        username,              // 原始格式
        'Warcup.Liao',         // AD返回的实际格式
        'warcup.liao@syf.com', // 带域名格式
        'WARCUP.LIAO'          // 全大写格式
    ];
    
    console.log('=== 测试不同用户名格式和密码处理 ===');
    console.log('原始用户名:', username);
    console.log('密码:', password);
    console.log('AD配置:', JSON.stringify(config.ad, null, 2));
    
    // 重置连接
    adAuth.client = null;
    
    // 先搜索用户获取准确信息
    console.log('\n1. 搜索用户获取准确信息:');
    try {
        const connected = await adAuth.connect();
        if (connected) {
            await new Promise((resolve) => {
                adAuth.client.search(config.ad.searchBase, {
                    filter: config.ad.searchFilter.replace('%(user)s', username),
                    scope: 'sub',
                    attributes: ['dn', 'sAMAccountName', 'userPrincipalName']
                }, (err, res) => {
                    if (err) {
                        console.error('搜索错误:', err);
                        resolve();
                        return;
                    }
                    
                    res.on('searchEntry', (entry) => {
                        const userDN = entry.dn.toString();
                        console.log('  找到用户:');
                        console.log('    DN:', userDN);
                        console.log('    DN字符编码:', escape(userDN));
                        console.log('    sAMAccountName:', entry.object?.sAMAccountName);
                        console.log('    userPrincipalName:', entry.object?.userPrincipalName);
                        
                        // 直接测试转义序列解码逻辑
                        console.log('\n    测试转义序列解码:');
                        console.log('    解码前:', userDN);
                        console.log('    解码前字符数组:', Array.from(userDN).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')));
                        
                        // 处理实际的ESC控制字符序列（ASCII 27）
                        let decodedDN = '';
                        let i = 0;
                        while (i < userDN.length) {
                            if (userDN.charCodeAt(i) === 27 && i + 2 < userDN.length) { // ESC字符
                                const hex = userDN.substr(i + 1, 2);
                                try {
                                    const charCode = parseInt(hex, 16);
                                    decodedDN += String.fromCharCode(charCode);
                                    i += 3; // 跳过ESC和两个十六进制字符
                                } catch (e) {
                                    decodedDN += userDN.charAt(i);
                                    i++;
                                }
                            } else {
                                decodedDN += userDN.charAt(i);
                                i++;
                            }
                        }
                        
                        console.log('    解码后:', decodedDN);
                        console.log('    解码后字符编码:', escape(decodedDN));
                        console.log('    解码后字符数组:', Array.from(decodedDN).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')));
                    });
                    
                    res.on('end', () => resolve());
                    res.on('error', (e) => { console.error('搜索响应错误:', e); resolve(); });
                });
            });
        }
    } catch (err) {
        console.error('搜索用户时出错:', err);
    }
    
    // 断开连接
    adAuth.disconnect();
    
    // 测试不同用户名格式
    for (const testUsername of usernameVariations) {
        console.log(`\n=== 测试用户名格式: ${testUsername} ===`);
        
        try {
            // 创建新连接
            const connected = await adAuth.connect();
            if (!connected) {
                console.error('无法连接到AD');
                continue;
            }
            
            // 搜索用户
            let userDN = null;
            await new Promise((resolve) => {
                adAuth.client.search(config.ad.searchBase, {
                    filter: config.ad.searchFilter.replace('%(user)s', testUsername),
                    scope: 'sub',
                    attributes: ['dn']
                }, (err, res) => {
                    if (err) {
                        console.error('搜索错误:', err);
                        resolve();
                        return;
                    }
                    
                    res.on('searchEntry', (entry) => {
                        userDN = entry.dn.toString();
                        console.log('  找到用户DN:', userDN);
                    });
                    
                    res.on('end', () => resolve());
                    res.on('error', (e) => { console.error('搜索响应错误:', e); resolve(); });
                });
            });
            
            if (!userDN) {
                console.log('  用户未找到');
                continue;
            }
            
            // 尝试手动绑定，检查密码处理
            console.log('  正在尝试绑定...');
            
            // 创建新的认证客户端
            const authClient = ldap.createClient({ url: config.ad.url });
            
            // 测试不同的密码处理方式
            const passwordVariations = [
                password,                  // 原始密码
                encodeURIComponent(password), // URL编码密码
                password.replace('%', '\%')  // 转义%符号
            ];
            
            for (const testPassword of passwordVariations) {
                console.log(`    测试密码: ${testPassword}`);
                
                try {
                    await new Promise((resolve, reject) => {
                        authClient.bind(userDN, testPassword, (err) => {
                            if (err) {
                                console.log(`    ✗ 绑定失败: ${err.message}`);
                                resolve();
                            } else {
                                console.log('    ✓ 绑定成功!');
                                resolve();
                            }
                        });
                    });
                } catch (e) {
                    console.error(`    绑定过程中出错: ${e.message}`);
                }
            }
            
            authClient.unbind();
            
        } catch (err) {
            console.error('测试过程中出错:', err);
        } finally {
            // 断开连接
            adAuth.disconnect();
        }
    }
    
    console.log('\n=== 测试完成 ===');
};

// 运行测试
testAuthVariations();