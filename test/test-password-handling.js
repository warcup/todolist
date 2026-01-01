// 测试密码中的特殊字符处理
const adAuth = require('./server/ad-auth');
const config = require('./server/config');
const ldap = require('ldapjs');

// 测试密码处理
const testPasswordHandling = async () => {
    const username = 'warcup.liao';
    const password = 'Liaojianbo%1996';
    
    console.log('=== 测试密码处理 ===');
    console.log('原始密码:', password);
    console.log('密码类型:', typeof password);
    console.log('密码长度:', password.length);
    
    // 测试URL编码/解码
    const encoded = encodeURIComponent(password);
    const decoded = decodeURIComponent(password);
    
    console.log('URL编码:', encoded);
    console.log('URL解码:', decoded);
    console.log('解码后与原始密码是否相同:', decoded === password);
    
    // 测试bind操作
    console.log('\n=== 测试直接bind操作 ===');
    
    // 连接到AD
    const connected = await adAuth.connect();
    if (!connected) {
        console.error('无法连接到AD');
        return;
    }
    
    // 搜索用户
    let userDN = null;
    
    await new Promise((resolve) => {
        adAuth.client.search(config.ad.searchBase, {
            filter: config.ad.searchFilter.replace('%(user)s', username),
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
                console.log('找到用户DN:', userDN);
            });
            
            res.on('end', () => resolve());
            res.on('error', (e) => { console.error('搜索响应错误:', e); resolve(); });
        });
    });
    
    if (!userDN) {
        console.log('用户未找到');
        return;
    }
    
    // 测试不同的密码处理
    const testPasswords = [
        { password: password, label: '原始密码' },
        { password: password.replace('%', '\%'), label: '转义%符号' },
        { password: Buffer.from(password).toString('utf-8'), label: 'UTF-8编码' },
        { password: password + ' ', label: '密码后加空格' }
    ];
    
    for (const test of testPasswords) {
        console.log(`\n测试: ${test.label}`);
        console.log(`密码: ${JSON.stringify(test.password)}`);
        console.log(`密码长度: ${test.password.length}`);
        
        const authClient = ldap.createClient({ url: config.ad.url });
        
        try {
            await new Promise((resolve) => {
                authClient.bind(userDN, test.password, (err) => {
                    if (err) {
                        console.log(`✗ 绑定失败: ${err.message}`);
                        console.log(`错误详情: ${JSON.stringify(err)}`);
                    } else {
                        console.log('✓ 绑定成功!');
                    }
                    resolve();
                });
            });
        } catch (e) {
            console.error(`绑定过程中出错: ${e.message}`);
        } finally {
            authClient.unbind();
        }
    }
    
    // 断开连接
    adAuth.disconnect();
    
    console.log('\n=== 测试完成 ===');
};

// 运行测试
testPasswordHandling();