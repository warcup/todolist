const config = require('./config');
const db = require('./db');
let ldap = null;

// 尝试加载ldapjs库
let ldapAvailable = false;
try {
    ldap = require('ldapjs');
    ldapAvailable = true;
} catch (error) {
    console.warn('LDAP库不可用，将回退到本地认证模式:', error.message);
}

// 转义LDAP过滤器中的特殊字符
const escapeLdapFilter = (str) => {
    if (!str) return str;
    return str.replace(/[\\\*\(\)=,+"-]/g, (match) => `\\${match}`);
};

class ADAuth {
    constructor() {
        this.client = null;
        this.connecting = false;
    }

    // 连接到AD域
    connect() {
        if (!ldapAvailable) {
            return Promise.resolve(false);
        }

        return new Promise((resolve, reject) => {
            // 如果已存在连接，先关闭它
            if (this.client) {
                try {
                    this.client.unbind();
                } catch (error) {
                    console.error('关闭旧连接时出错:', error);
                }
                this.client = null;
            }

            this.client = ldap.createClient({
                url: config.ad.url
            });

            // 非阻塞的错误处理，避免连接错误导致整个应用崩溃
            this.client.on('error', (err) => {
                console.error('AD域连接错误:', err);
                // 特别处理ECONNRESET错误，这通常表示连接已被重置
                if (err.code === 'ECONNRESET') {
                    console.error('AD域连接被重置，将在下次请求时重新连接');
                }
                // 只在连接过程中发生错误时才reject
                if (this.connecting) {
                    this.connecting = false;
                    reject(err);
                } else {
                    // 连接后发生的错误，重置客户端以便下次操作时重新连接
                    this.client = null;
                }
            });

            this.connecting = true;
            this.client.bind(config.ad.username, config.ad.password, (err) => {
                this.connecting = false;
                if (err) {
                    console.error('AD域绑定失败:', err);
                    this.client = null;
                    reject(err);
                } else {
                    console.log('成功连接到AD域');
                    resolve(true);
                }
            });
        });
    }

    // 关闭AD域连接
    disconnect() {
        if (this.client && ldapAvailable) {
            this.client.unbind();
            this.client = null;
        }
    }

    // 多OU搜索辅助方法
    searchInMultipleOUs(searchBase, filter, opts, callback) {
        // 分割searchBase字符串为多个OU
        const searchBases = searchBase.split('|').map(ou => ou.trim()).filter(ou => ou);
        
        if (searchBases.length === 0) {
            return callback(new Error('没有可用的搜索基础'));
        }

        console.log(`多OU搜索配置: ${JSON.stringify({ searchBases, filter, opts }, null, 2)}`);

        // 简化方法：搜索整个域，然后检查用户DN是否在指定OU中
        console.log('搜索整个域，然后筛选指定OU中的用户...');
        this.client.search(config.ad.baseDN, {
            ...opts,
            filter: filter
        }, (err, res) => {
            if (err) {
                console.error('搜索整个域失败:', err);
                return callback(null, null);
            }

            const foundEntries = [];

            res.on('searchEntry', (entry) => {
                console.log(`找到用户条目: ${entry.dn}`);
                foundEntries.push(entry);
            });

            res.on('end', (result) => {
                console.log(`整个域搜索完成，结果状态: ${result.status}`);
                console.log(`共找到 ${foundEntries.length} 个匹配用户`);
                
                // 筛选出DN包含指定OU的用户
                let matchedUser = null;
                for (const entry of foundEntries) {
                    console.log(`找到用户条目，尝试匹配...`);
                    
                    let userDN = null;
                    
                    // 尝试获取用户的完整DN
                    if (entry.object && entry.object.distinguishedName) {
                        userDN = entry.object.distinguishedName;
                    } else if (entry.dn) {
                        if (typeof entry.dn === 'string') {
                            userDN = entry.dn;
                        } else if (entry.dn.toString) {
                            userDN = entry.dn.toString();
                        }
                    }
                    
                    if (userDN) {
                        console.log(`用户DN: ${userDN}`);
                        
                        // 检查用户DN是否在任何一个指定的OU中
                        const isInAllowedOU = searchBases.some(ou => {
                            console.log(`比较OU: ${ou}`);
                            console.log(`比较DN: ${userDN}`);
                            
                            // 方法1: 直接比较完整路径
                            const ouLower = ou.toLowerCase();
                            const dnLower = userDN.toLowerCase();
                            
                            if (dnLower.includes(ouLower)) {
                                console.log('✓ 通过完整路径匹配成功');
                                return true;
                            }
                            
                            // 方法2: 提取OU名称进行比较（忽略括号和DC部分）
                            // 例如：从 "OU=盛业（大陆）,DC=SYF,DC=com" 提取 "盛业"
                            const extractOUName = (ouStr) => {
                                // 移除OU=前缀和DC部分
                                const ouPart = ouStr.replace(/^ou=/i, '').replace(/,dc=.*$/i, '').trim();
                                // 移除所有括号和内容
                                return ouPart.replace(/[\(\)\（\）\[\]\【\】].*?[\(\)\（\）\[\]\【\】]/g, '').trim();
                            };
                            
                            const targetOUName = extractOUName(ouLower);
                            
                            // 检查DN是否包含目标OU名称
                            if (dnLower.includes(targetOUName.toLowerCase())) {
                                console.log(`✓ 通过OU名称"${targetOUName}"匹配成功`);
                                return true;
                            }
                            
                            // 方法3: 检查DN中是否包含"盛业"和指定的地理位置（大陆或香港）
                            if (targetOUName.includes('盛业')) {
                                // 提取地理位置
                                const location = ou.match(/[\(\)\（\）](.*?)[\(\)\（\）]/);
                                if (location) {
                                    const locationName = location[1].toLowerCase();
                                    console.log(`检查地理位置: ${locationName}`);
                                    
                                    // 检查DN中是否包含地理位置的Unicode转义序列
                                    if (locationName === '大陆' && dnLower.includes('\\ef\\bc\\88\\e5\\a4\\a7\\e9\\99\\86\\ef\\bc\\89')) {
                                        console.log('✓ 通过Unicode转义序列匹配到"（大陆）"');
                                        return true;
                                    } else if (locationName === '香港' && dnLower.includes('\\ef\\bc\\88\\e9\\a6\\99\\e6\\b8\\af\\ef\\bc\\89')) {
                                        console.log('✓ 通过Unicode转义序列匹配到"（香港）"');
                                        return true;
                                    }
                                }
                            }
                            
                            return false;
                        });
                        
                        if (isInAllowedOU) {
                            console.log(`✓ 用户在允许的OU中: ${userDN}`);
                            matchedUser = entry;
                            break; // 只返回第一个匹配的用户
                        } else {
                            console.log(`✗ 用户不在允许的OU中: ${userDN}`);
                            console.log(`  允许的OU: ${JSON.stringify(searchBases)}`);
                        }
                    } else {
                        console.error('无法获取用户DN');
                    }
                }
                
                if (matchedUser) {
                    callback(null, matchedUser);
                } else {
                    console.log('没有用户在指定的OU中');
                    callback(null, null);
                }
            });

            res.on('error', (err) => {
                console.error('搜索过程中出错:', err);
                callback(null, null);
            });
        });
    }

    // 验证AD域用户凭据
    authenticate(username, password) {
        if (!ldapAvailable) {
            return Promise.resolve(false);
        }

        if (!this.client) {
            return this.connect()
                .then(() => this.authenticate(username, password))
                .catch(err => {
                    console.error('AD认证过程中连接失败，将回退到本地认证:', err);
                    return false;
                });
        }

        return new Promise((resolve, reject) => {
            // 首先搜索用户DN
            const searchFilter = config.ad.searchFilter.replace('%(user)s', username);
            const opts = {
                filter: searchFilter,
                scope: 'sub',
                attributes: ['dn', 'sAMAccountName', 'userPrincipalName']
            };

            // 使用多OU搜索方法
            this.searchInMultipleOUs(config.ad.searchBase, searchFilter, opts, (err, entry) => {
                if (err) {
                    console.error('AD域用户搜索失败:', err);
                    resolve(false);
                    return;
                }

                if (!entry) {
                    console.log('AD域用户不存在:', username);
                    resolve(false);
                    return;
                }

                let userDN = null;

                try {
                    // 尝试多种方式获取用户DN或UPN
                    let dnValue = null;
                    let upnValue = null;
                    let samAccountName = null;
                    
                    // 1. 尝试获取DN字符串
                    if (entry.dn) {
                        if (typeof entry.dn === 'string') {
                            dnValue = entry.dn;
                        } else if (entry.dn.toString) {
                            // 处理LDAP.js v2返回的LdapDn对象
                            dnValue = entry.dn.toString();
                        } else if (entry.dn.toStringDN) {
                            // 处理其他LDAP库的DN对象
                            dnValue = entry.dn.toStringDN();
                        }
                    } 
                    
                    // 2. 从attributes中获取各种属性
                    if (entry.attributes) {
                        // 获取DN
                        const dnAttr = entry.attributes.find(attr => attr.type.toLowerCase() === 'dn');
                        if (dnAttr && dnAttr.values && dnAttr.values.length > 0) {
                            dnValue = dnAttr.values[0];
                        }
                        
                        // 获取userPrincipalName
                        const upnAttr = entry.attributes.find(attr => attr.type.toLowerCase() === 'userprincipalname');
                        if (upnAttr && upnAttr.values && upnAttr.values.length > 0) {
                            upnValue = upnAttr.values[0];
                        }
                        
                        // 获取sAMAccountName
                        const samAttr = entry.attributes.find(attr => attr.type.toLowerCase() === 'samaccountname');
                        if (samAttr && samAttr.values && samAttr.values.length > 0) {
                            samAccountName = samAttr.values[0];
                        }
                    }
                    
                    // 3. 构建UPN作为首选认证方式
                    if (upnValue) {
                        userDN = upnValue;
                    } 
                    // 4. 如果没有UPN，尝试构建
                    else if (samAccountName) {
                        userDN = samAccountName + '@SYF.com';
                    }
                    // 5. 最后使用DN
                    else if (dnValue) {
                        userDN = dnValue;
                    }
                    
                    // 调试：显示用户信息
                    console.log('找到用户:');
                    console.log('  DN:', dnValue);
                    console.log('  UPN:', upnValue);
                    console.log('  sAMAccountName:', samAccountName);
                    console.log('  最终认证标识:', userDN);
                    console.log('  用户DN类型:', typeof userDN);
                    
                    if (userDN) {
                        console.log('DN字符编码:', escape(userDN));
                    }
                } catch (error) {
                    console.error('解析用户DN时出错:', error);
                    console.error('条目对象:', JSON.stringify(entry, null, 2));
                    resolve(false);
                    return;
                }

                if (!userDN) {
                    console.log('无法获取用户认证标识:', username);
                    resolve(false);
                    return;
                }

                // 使用用户DN和密码进行绑定验证
                const authClient = ldap.createClient({ url: config.ad.url });

                authClient.bind(userDN, password, (err) => {
                    authClient.unbind();

                    if (err) {
                        console.error('AD域用户认证失败:', err);
                        resolve(false);
                        return;
                    }

                    // 认证成功后，检查用户是否被禁用
                    const db = require('./db');
                    db.get('SELECT is_disabled FROM users WHERE username = ?', [username], (err, row) => {
                        if (err) {
                            console.error('查询用户禁用状态失败:', err);
                            // 出现错误时，默认允许登录
                            console.log('AD域用户认证成功:', username);
                            resolve(true);
                            return;
                        }

                        if (row && row.is_disabled) {
                            console.log('用户已被禁用:', username);
                            resolve(false);
                        } else {
                            console.log('AD域用户认证成功:', username);
                            resolve(true);
                        }
                    });
                });
            });
        });
    }

    // 获取AD域用户信息
    getUserInfo(username) {
        if (!ldapAvailable) {
            return Promise.resolve(null);
        }

        if (!this.client) {
            return this.connect()
                .then(() => this.getUserInfo(username))
                .catch(err => {
                    console.error('获取AD用户信息过程中连接失败:', err);
                    return null;
                });
        }

        return new Promise((resolve, reject) => {
            const searchFilter = config.ad.searchFilter.replace('%(user)s', username);
            const opts = {
                filter: searchFilter,
                scope: 'sub',
                attributes: config.ad.attributes
            };

            // 使用多OU搜索方法
            this.searchInMultipleOUs(config.ad.searchBase, searchFilter, opts, (err, entry) => {
                if (err) {
                    console.error('获取AD域用户信息失败:', err);
                    resolve(null);
                    return;
                }

                if (!entry) {
                    console.log('AD域用户不存在:', username);
                    resolve(null);
                    return;
                }

                let userInfo = null;

                try {
                    userInfo = {};
                    
                    // 尝试从entry.object获取属性
                    if (entry.object) {
                        userInfo.username = entry.object.samaccountname || entry.object.sAMAccountName;
                        userInfo.fullName = entry.object.cn;
                        userInfo.firstName = entry.object.givenName;
                        userInfo.lastName = entry.object.sn;
                        userInfo.email = entry.object.mail;
                        userInfo.phone = entry.object.telephoneNumber;
                        userInfo.department = entry.object.department;
                        userInfo.title = entry.object.title;
                        userInfo.manager = entry.object.manager;
                        userInfo.distinguishedName = entry.object.distinguishedName;
                    } else if (entry.attributes) {
                        // 从attributes数组中获取属性
                        const getAttributeValue = (attrName) => {
                            const attr = entry.attributes.find(a => 
                                a.type.toLowerCase() === attrName.toLowerCase()
                            );
                            return attr && attr.values && attr.values.length > 0 ? attr.values[0] : undefined;
                        };
                        
                        userInfo.username = getAttributeValue('samaccountname');
                        userInfo.fullName = getAttributeValue('cn');
                        userInfo.firstName = getAttributeValue('givenName');
                        userInfo.lastName = getAttributeValue('sn');
                        userInfo.email = getAttributeValue('mail');
                        userInfo.phone = getAttributeValue('telephoneNumber');
                        userInfo.department = getAttributeValue('department');
                        userInfo.title = getAttributeValue('title');
                        userInfo.manager = getAttributeValue('manager');
                        userInfo.distinguishedName = getAttributeValue('distinguishedName');
                    }
                    
                    console.log('获取到用户信息:', JSON.stringify(userInfo, null, 2));
                } catch (error) {
                    console.error('解析用户信息时出错:', error);
                    console.error('条目对象:', JSON.stringify(entry, null, 2));
                    resolve(null);
                    return;
                }

                resolve(userInfo);
            });
        });
    }

    // 获取AD域组织结构
    getOrganizationStructure() {
        if (!ldapAvailable) {
            return Promise.resolve([]);
        }

        if (!this.client) {
            return this.connect()
                .then(() => this.getOrganizationStructure())
                .catch(() => []);
        }

        return new Promise((resolve, reject) => {
            const opts = {
                filter: '(objectClass=organizationalUnit)',
                scope: 'sub',
                attributes: ['ou', 'description']
            };

            this.client.search(config.ad.baseDN, opts, (err, res) => {
                if (err) {
                    console.error('获取AD域组织结构失败:', err);
                    // 重置客户端，以便下次请求时重新连接
                    this.client = null;
                    resolve([]);
                    return;
                }

                const orgUnits = [];

                res.on('searchEntry', (entry) => {
                    orgUnits.push({
                        name: entry.object.ou,
                        description: entry.object.description,
                        dn: entry.object.dn
                    });
                });

                res.on('end', (result) => {
                    resolve(orgUnits);
                });

                res.on('error', (err) => {
                    console.error('获取AD域组织结构搜索错误:', err);
                    // 重置客户端，以便下次请求时重新连接
                    this.client = null;
                    resolve([]);
                });
            });
        });
    }

    // 获取用户的下级
    getSubordinates(username) {
        if (!ldapAvailable) {
            return Promise.resolve([]);
        }

        if (!this.client) {
            return this.connect()
                .then(() => this.getSubordinates(username))
                .catch(() => []);
        }

        return new Promise((resolve, reject) => {
            // 首先获取当前用户的DN
            this.getUserInfo(username)
                .then(userInfo => {
                    if (!userInfo || !userInfo.distinguishedName) {
                        console.error('无法获取用户DN:', username);
                        resolve([]);
                        return;
                    }

                    // 清理DN中的空格和特殊字符
                    const userDN = userInfo.distinguishedName.replace(/\s+/g, '').trim();
                    console.log('使用用户DN:', userDN);
                    
                    // 直接使用原始DN构建过滤器（不进行额外转义）
                    // 注意：在某些LDAP服务器中，manager字段可能不区分大小写或格式
                    const filter = `(&(manager=${userDN})(objectClass=user))`;
                    
                    // 尝试多种过滤器格式以提高兼容性
                    const filters = [
                        filter, // 原始DN格式
                        `(&(manager=${escapeLdapFilter(userDN)})(objectClass=user))`, // 转义格式
                        `(&(manager=cn=${escapeLdapFilter(userInfo.fullName)}*)(objectClass=user))` // 只匹配姓名的模糊搜索
                    ];
                    
                    const opts = {
                        scope: 'sub',
                        attributes: ['cn', 'samaccountname', 'mail', 'title', 'department', 'distinguishedName']
                    };

                    console.log('搜索过滤器列表:', filters);
                    
                    // 使用多过滤器搜索
                    const searchWithFilter = (filterIndex) => {
                        if (filterIndex >= filters.length) {
                            resolve([]);
                            return;
                        }
                        
                        const currentFilter = filters[filterIndex];
                        console.log(`使用过滤器 ${filterIndex + 1}: ${currentFilter}`);

                        this.client.search(config.ad.baseDN, {
                            ...opts,
                            filter: currentFilter
                        }, (err, res) => {
                            if (err) {
                                console.error(`使用过滤器 ${filterIndex + 1} 搜索失败:`, err);
                                // 尝试下一个过滤器
                                searchWithFilter(filterIndex + 1);
                                return;
                            }

                            const subordinates = [];
                            let foundEntries = false;

                            res.on('searchEntry', (entry) => {
                                foundEntries = true;
                                try {
                                    let userData = {};
                                    let entryDN = null;

                                    // 尝试从entry.object获取属性
                                    if (entry.object) {
                                        entryDN = entry.object.distinguishedName;
                                        userData = {
                                            id: entry.object.samaccountname || entry.object.sAMAccountName,
                                            name: entry.object.cn,
                                            email: entry.object.mail,
                                            title: entry.object.title,
                                            department: entry.object.department,
                                            dn: entryDN
                                        };
                                    } else if (entry.attributes) {
                                        // 从attributes数组中获取属性
                                        const getAttributeValue = (attrName) => {
                                            const attr = entry.attributes.find(a => 
                                                a.type.toLowerCase() === attrName.toLowerCase()
                                            );
                                            return attr && attr.values && attr.values.length > 0 ? attr.values[0] : undefined;
                                        };

                                        entryDN = getAttributeValue('distinguishedName');
                                        userData = {
                                            id: getAttributeValue('samaccountname'),
                                            name: getAttributeValue('cn'),
                                            email: getAttributeValue('mail'),
                                            title: getAttributeValue('title'),
                                            department: getAttributeValue('department'),
                                            dn: entryDN
                                        };
                                    }

                                    console.log('找到潜在下级用户:', userData.name, 'DN:', entryDN);
                                    
                                    // 在JavaScript中进行OU过滤，确保只有指定OU的用户才会被添加
                                    if (userData.id && entryDN) {
                                        // 获取配置的搜索基础（指定OU）
                                        const searchBases = config.ad.searchBase.split('|').map(ou => ou.trim()).filter(ou => ou);
                                        
                                        // 检查用户DN是否属于指定的OU
                                        const isInAllowedOU = searchBases.some(ou => {
                                            console.log(`检查用户DN: ${entryDN} 是否在OU: ${ou} 中`);
                                            // 对OU和DN进行统一清理和比较
                                            const cleanOU = ou.replace(/\s+/g, '').toLowerCase();
                                            const cleanDN = entryDN.replace(/\s+/g, '').toLowerCase();
                                            return cleanDN.includes(cleanOU);
                                        });
                                        
                                        // 只有属于指定OU的用户才会被添加
                                        if (isInAllowedOU) {
                                            console.log('用户在允许的OU中，添加到下级列表');
                                            subordinates.push(userData);
                                        } else {
                                            console.log('用户不在允许的OU中，跳过');
                                        }
                                    }
                                } catch (error) {
                                    console.error('解析下级用户信息时出错:', error);
                                }
                            });

                            res.on('end', (result) => {
                                console.log(`过滤器 ${filterIndex + 1} 搜索完成，找到 ${subordinates.length} 个有效下级用户`);
                                
                                if (subordinates.length > 0) {
                                    // 找到有效用户，直接返回
                                    console.log('下级用户列表:', JSON.stringify(subordinates, null, 2));
                                    resolve(subordinates);
                                } else if (foundEntries) {
                                    // 找到了用户但都不在允许OU中
                                    console.log('找到下级用户但都不在允许的OU中');
                                    resolve([]);
                                } else {
                                    // 没有找到用户，尝试下一个过滤器
                                    console.log('没有找到用户，尝试下一个过滤器');
                                    searchWithFilter(filterIndex + 1);
                                }
                            });

                            res.on('error', (err) => {
                                console.error(`获取下级用户搜索错误:`, err);
                                // 尝试下一个过滤器
                                searchWithFilter(filterIndex + 1);
                            });
                        });
                    };
                    
                    // 开始使用第一个过滤器搜索
                    searchWithFilter(0);
                })
                .catch(err => {
                    console.error('获取用户信息失败:', err);
                    resolve([]);
                });
        });
    }

    // 同步AD域用户信息到本地数据库
    syncADUsers() {
        if (!ldapAvailable) {
            return Promise.resolve({ updated: 0, disabled: 0, errors: 0 });
        }

        return new Promise((resolve, reject) => {
            this.connect()
                .then(connected => {
                    if (!connected) {
                        console.error('AD域连接失败，无法同步用户信息');
                        resolve({ updated: 0, disabled: 0, errors: 1 });
                        return;
                    }

                    console.log('开始同步AD域用户信息...');
                    const now = Math.floor(Date.now() / 1000);
                    const db = require('./db');
                    let updatedCount = 0;
                    let disabledCount = 0;
                    let errorsCount = 0;

                    // 第一步：获取本地数据库中所有域用户（user_type = 'ad'）
                    db.all('SELECT * FROM users WHERE user_type = ?', ['ad'], (err, localUsers) => {
                        if (err) {
                            console.error('获取本地域用户失败:', err);
                            this.disconnect();
                            resolve({ updated: 0, disabled: 0, errors: 1 });
                            return;
                        }

                        console.log(`从本地数据库获取到 ${localUsers.length} 个域用户`);

                        if (localUsers.length === 0) {
                            console.log('没有本地域用户需要同步');
                            this.disconnect();
                            resolve({ updated: 0, disabled: 0, errors: 0 });
                            return;
                        }

                        // 第二步：依次处理每个本地域用户
                        let index = 0;
                        const processNextUser = () => {
                            if (index >= localUsers.length) {
                                // 所有用户处理完成
                                console.log(`AD域用户同步完成: 更新 ${updatedCount} 个用户, 禁用 ${disabledCount} 个用户, 错误 ${errorsCount} 个`);
                                this.disconnect();
                                resolve({ updated: updatedCount, disabled: disabledCount, errors: errorsCount });
                                return;
                            }

                            const localUser = localUsers[index];
                            index++;

                            console.log(`处理用户: ${localUser.username}`);

                            // 第三步：根据本地用户名搜索AD域用户
                            const searchFilter = config.ad.searchFilter.replace('%(user)s', localUser.username);
                            const opts = {
                                scope: 'sub',
                                attributes: ['dn', 'sAMAccountName', 'cn', 'mail', 'telephoneNumber', 'department', 'title', 'manager', 'distinguishedName']
                            };

                            // 使用searchInMultipleOUs方法进行搜索和OU筛选
                            this.searchInMultipleOUs(config.ad.searchBase, searchFilter, opts, (err, entry) => {
                                if (err) {
                                    console.error(`搜索用户 ${localUser.username} 失败:`, err);
                                    errorsCount++;
                                    processNextUser();
                                    return;
                                }

                                if (!entry) {
                                    // 第四步：没找到对应域用户，将本地用户标记为禁用
                                    console.log(`未在AD域找到用户 ${localUser.username}，将其标记为禁用`);
                                    db.run('UPDATE users SET is_disabled = 1 WHERE username = ? AND user_type = ?', 
                                        [localUser.username, 'ad'], (err) => {
                                            if (err) {
                                                console.error(`标记用户 ${localUser.username} 为禁用失败:`, err);
                                                errorsCount++;
                                            } else {
                                                disabledCount++;
                                            }
                                            processNextUser();
                                        });
                                    return;
                                }

                                try {
                                    // 第五步：找到了对应域用户，提取域用户信息
                                    let adUserData = {};
                                    
                                    // 从entry.object获取属性
                                    if (entry.object) {
                                        adUserData = {
                                            username: entry.object.sAMAccountName || entry.object.samaccountname,
                                            full_name: entry.object.cn,
                                            email: entry.object.mail,
                                            phone: entry.object.telephoneNumber,
                                            department: entry.object.department,
                                            title: entry.object.title,
                                            manager: entry.object.manager,
                                            ad_dn: entry.object.distinguishedName
                                        };
                                    } else if (entry.attributes) {
                                        // 从attributes数组中获取属性
                                        const getAttributeValue = (attrName) => {
                                            const attr = entry.attributes.find(a => 
                                                a.type.toLowerCase() === attrName.toLowerCase()
                                            );
                                            return attr && attr.values && attr.values.length > 0 ? attr.values[0] : undefined;
                                        };

                                        adUserData = {
                                            username: getAttributeValue('sAMAccountName'),
                                            full_name: getAttributeValue('cn'),
                                            email: getAttributeValue('mail'),
                                            phone: getAttributeValue('telephoneNumber'),
                                            department: getAttributeValue('department'),
                                            title: getAttributeValue('title'),
                                            manager: getAttributeValue('manager'),
                                            ad_dn: getAttributeValue('distinguishedName')
                                        };
                                    }

                                    // 第六步：比较本地信息和域信息是否一致
                                    const isDifferent = 
                                        localUser.full_name !== adUserData.full_name ||
                                        localUser.email !== adUserData.email ||
                                        localUser.phone !== adUserData.phone ||
                                        localUser.department !== adUserData.department ||
                                        localUser.title !== adUserData.title ||
                                        localUser.manager !== adUserData.manager ||
                                        localUser.ad_dn !== adUserData.ad_dn ||
                                        localUser.is_disabled === 1;

                                    if (isDifferent) {
                                        // 信息不一致，更新本地数据库
                                        console.log(`更新用户 ${localUser.username} 的信息`);
                                        const sql = `
                                            UPDATE users SET 
                                                full_name = ?, email = ?, phone = ?, department = ?, 
                                                title = ?, manager = ?, ad_dn = ?, last_ad_sync = ?, 
                                                is_disabled = ? 
                                            WHERE username = ? AND user_type = ?
                                        `;
                                        
                                        db.run(sql, [
                                            adUserData.full_name,
                                            adUserData.email,
                                            adUserData.phone,
                                            adUserData.department,
                                            adUserData.title,
                                            adUserData.manager,
                                            adUserData.ad_dn,
                                            now,
                                            0, // 启用用户
                                            localUser.username,
                                            'ad'
                                        ], (err) => {
                                            if (err) {
                                                console.error(`更新用户 ${localUser.username} 失败:`, err);
                                                errorsCount++;
                                            } else {
                                                updatedCount++;
                                            }
                                            processNextUser();
                                        });
                                    } else {
                                        // 信息一致，只更新同步时间
                                        db.run('UPDATE users SET last_ad_sync = ? WHERE username = ? AND user_type = ?', 
                                            [now, localUser.username, 'ad'], (err) => {
                                                if (err) {
                                                    console.error(`更新用户 ${localUser.username} 同步时间失败:`, err);
                                                    errorsCount++;
                                                }
                                                processNextUser();
                                            });
                                    }
                                } catch (error) {
                                    console.error(`处理用户 ${localUser.username} 时出错:`, error);
                                    errorsCount++;
                                    processNextUser();
                                }
                            });
                        };

                        // 开始处理第一个用户
                        processNextUser();
                    });
                })
                .catch(err => {
                    console.error('AD域连接失败:', err);
                    resolve({ updated: 0, disabled: 0, errors: 1 });
                });
        });
    }
}

module.exports = new ADAuth();
