// 调试AD搜索问题
const adAuth = require('./server/ad-auth');
const config = require('./server/config');

// 测试搜索不同用户
const testUsers = ['guacamole', 'warcup.liao'];

// 批量测试用户搜索
const testUserSearch = async (username) => {
    console.log(`\n=== 测试用户搜索: ${username} ===`);
    
    try {
        // 连接到AD
        const connected = await adAuth.connect();
        if (!connected) {
            console.error('无法连接到AD域');
            return;
        }
        
        // 手动执行搜索
        const client = adAuth.client;
        const searchFilter = config.ad.searchFilter.replace('%(user)s', username);
        const opts = {
            filter: searchFilter,
            scope: 'sub',
            attributes: ['dn', 'sAMAccountName', 'cn']
        };
        
        console.log('搜索配置:');
        console.log('  Base DN:', config.ad.searchBase);
        console.log('  Filter:', searchFilter);
        console.log('  Scope:', opts.scope);
        
        await new Promise((resolve, reject) => {
            client.search(config.ad.searchBase, opts, (err, res) => {
                if (err) {
                    console.error('搜索错误:', err);
                    resolve();
                    return;
                }
                
                let found = false;
                
                res.on('searchEntry', (entry) => {
                    found = true;
                    console.log('找到用户:');
                    console.log('  DN:', entry.dn);
                    console.log('  sAMAccountName:', entry.object?.sAMAccountName || entry.attributes?.find(a => a.type === 'sAMAccountName')?.values?.[0]);
                    console.log('  CN:', entry.object?.cn || entry.attributes?.find(a => a.type === 'cn')?.values?.[0]);
                });
                
                res.on('end', (result) => {
                    if (!found) {
                        console.log('未找到用户');
                        console.log('搜索结果:', result);
                    }
                    resolve();
                });
                
                res.on('error', (err) => {
                    console.error('搜索响应错误:', err);
                    resolve();
                });
            });
        });
        
    } catch (error) {
        console.error('测试过程中出错:', error);
    } finally {
        // 断开连接
        adAuth.disconnect();
    }
};

// 执行测试
console.log('=== AD搜索调试工具 ===');
console.log('AD配置:');
console.log('  URL:', config.ad.url);
console.log('  绑定账号:', config.ad.username);
console.log('  搜索基础:', config.ad.searchBase);
console.log('  搜索过滤器:', config.ad.searchFilter);

// 测试所有用户
const runTests = async () => {
    for (const user of testUsers) {
        await testUserSearch(user);
    }
    console.log('\n=== 所有测试完成 ===');
};

runTests();