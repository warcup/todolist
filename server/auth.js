const crypto = require('crypto');
const db = require('./db');
const adAuth = require('./ad-auth');
const config = require('./config');
const jwt = require('jsonwebtoken');

// 登录尝试记录，用于防账号爆破
const loginAttempts = {}; // { username: { count: 0, lastAttempt: 0, locked: false } }
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000; // 30分钟锁定时间

// 密码哈希和验证工具函数
const hashPassword = (password) => {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16).toString('hex');
        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
            if (err) reject(err);
            resolve(`${salt}:${derivedKey.toString('hex')}`);
        });
    });
};

const verifyPassword = (password, hash) => {
    return new Promise((resolve, reject) => {
        const [salt, key] = hash.split(':');
        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
            if (err) reject(err);
            resolve(key === derivedKey.toString('hex'));
        });
    });
};

// 检查密码是否已哈希
const isPasswordHashed = (password) => {
    return password && password.includes(':') && password.split(':').length === 2;
};

// 生成邀请码工具
const generateInviteCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();

// 获取或初始化邀请码
const getOrInitInviteCode = (cb) => {
    db.get("SELECT value FROM settings WHERE key = 'invite_code'", (err, row) => {
        if (row) {
            cb(row.value);
        } else {
            const newCode = generateInviteCode();
            db.run("INSERT INTO settings (key, value) VALUES ('invite_code', ?)", [newCode], () => cb(newCode));
        }
    });
};

// 生成JWT令牌
const generateToken = (user) => {
    return jwt.sign(
        { username: user.username, is_admin: user.is_admin },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );
};

// 验证JWT令牌
const verifyToken = (token) => {
    try {
        return jwt.verify(token, config.jwt.secret);
    } catch (error) {
        return null;
    }
};

// 更新用户AD信息
const updateUserADInfo = (username, adInfo) => {
    if (!adInfo) return;
    
    const lastSync = Date.now();
    db.run(
        "UPDATE users SET full_name = ?, email = ?, department = ?, title = ?, phone = ?, manager = ?, ad_dn = ?, last_ad_sync = ? WHERE username = ?",
        [adInfo.fullName, adInfo.email, adInfo.department, adInfo.title, adInfo.phone, adInfo.manager, adInfo.distinguishedName, lastSync, username],
        (err) => {
            if (err) {
                console.error('更新用户AD信息失败:', err);
            } else {
                console.log('用户AD信息已更新:', username);
            }
        }
    );
};

// 核心鉴权中间件
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

    const token = authHeader.replace('Basic ', '');
    let creds;
    try {
        creds = Buffer.from(token, 'base64').toString('utf8');
    } catch (e) {
        return res.status(401).json({ error: "Invalid token" });
    }
    
    const [username, password] = creds.split(':');
    if (!username || !password) return res.status(401).json({ error: "Invalid credentials" });
    
    // 获取登录类型
    const loginType = req.headers['x-login-type'] || 'local';

    // 根据登录类型选择认证方式
    if (loginType === 'local') {
        // 本地认证
        
        // 检查登录尝试记录
        const attempt = loginAttempts[username] || { count: 0, lastAttempt: 0, locked: false };
        
        // 检查账号是否被锁定
        if (attempt.locked && Date.now() - attempt.lastAttempt < LOCK_TIME) {
            const lockTimeLeft = Math.ceil((LOCK_TIME - (Date.now() - attempt.lastAttempt)) / (60 * 1000));
            return res.status(401).json({ 
                error: `账号已锁定，请${lockTimeLeft}分钟后再试`,
                locked: true
            });
        }
        
        // 如果账号被锁定但已经过了锁定时间，解锁账号
        if (attempt.locked && Date.now() - attempt.lastAttempt >= LOCK_TIME) {
            attempt.count = 0;
            attempt.locked = false;
            loginAttempts[username] = attempt;
        }
        
        db.get("SELECT * FROM users WHERE username = ? AND user_type = 'local'", [username], (err, user) => {
            if (err) return res.status(500).json({ error: "DB Error" });
            
            if (user) {
                // 检查用户是否被禁用
                if (user.is_disabled) {
                    console.log('用户已被禁用:', username);
                    return res.status(401).json({ error: "用户已被禁用" });
                }
                
                // 已有本地用户，验证密码
                const verifyPasswordAsync = async () => {
                    try {
                        let isValid = false;
                        if (isPasswordHashed(user.password)) {
                            // 使用哈希验证
                            isValid = await verifyPassword(password, user.password);
                        } else {
                            // 旧密码是明文，进行验证并更新为哈希
                            isValid = user.password === password;
                            if (isValid) {
                                // 更新为哈希密码
                                const hashedPassword = await hashPassword(password);
                                db.run(
                                    "UPDATE users SET password = ? WHERE username = ? AND user_type = 'local'",
                                    [hashedPassword, username]
                                );
                            }
                        }
                        
                        if (isValid) {
                            // 登录成功，重置登录尝试次数
                            delete loginAttempts[username];
                            req.user = user;
                            next();
                        } else {
                            // 登录失败，更新登录尝试次数
                            attempt.count++;
                            attempt.lastAttempt = Date.now();
                            
                            // 检查是否达到最大尝试次数
                            if (attempt.count >= MAX_ATTEMPTS) {
                                attempt.locked = true;
                                res.status(401).json({ 
                                    error: "密码错误次数过多，账号已锁定30分钟",
                                    locked: true,
                                    showCaptcha: true
                                });
                            } else {
                                const remainingAttempts = MAX_ATTEMPTS - attempt.count;
                                // 本地账号登录总是需要验证码
                                res.status(401).json({ 
                                    error: `用户名或密码错误，剩余${remainingAttempts}次尝试`,
                                    remainingAttempts,
                                    showCaptcha: true
                                });
                            }
                            
                            loginAttempts[username] = attempt;
                        }
                    } catch (err) {
                        console.error('密码验证失败:', err);
                        res.status(500).json({ error: "密码验证失败" });
                    }
                };
                
                verifyPasswordAsync();
            } else {
                // 新本地用户注册，需要验证邀请码和验证码
                const inviteCode = req.headers['x-invite-code'];
                const captcha = req.headers['x-captcha'];
                
                // 检查验证码
                if (!captcha) {
                    return res.status(401).json({ 
                        error: "请输入验证码", 
                        needInvite: true,
                        showCaptcha: true
                    });
                }
                
                // 从验证码字符串中解析出captchaId和captchaText
                // 假设前端发送的captcha格式为 "captchaId:captchaText"
                const [captchaId, captchaText] = captcha.split(':');
                
                // 检查captchaId和captchaText是否存在
                if (!captchaId || !captchaText) {
                    return res.status(401).json({ 
                        error: "验证码格式错误", 
                        needInvite: true,
                        showCaptcha: true
                    });
                }
                
                // 验证验证码
                const storedCaptcha = require('../server').captchaStore[captchaId];
                if (!storedCaptcha || Date.now() - storedCaptcha.timestamp > 5 * 60 * 1000) {
                    // 验证码已过期或不存在
                    return res.status(401).json({ 
                        error: "验证码已过期", 
                        needInvite: true,
                        showCaptcha: true
                    });
                }
                
                if (storedCaptcha.text !== captchaText.toLowerCase()) {
                    // 验证码错误
                    return res.status(401).json({ 
                        error: "验证码错误", 
                        needInvite: true,
                        showCaptcha: true
                    });
                }
                
                // 验证码验证通过，删除已使用的验证码
                delete require('../server').captchaStore[captchaId];
                
                // 获取或初始化邀请码
                    getOrInitInviteCode((correctCode) => {
                        if (!inviteCode || inviteCode.toUpperCase() !== correctCode) {
                            // 邀请码错误或未提供
                            return res.status(401).json({ 
                                error: "邀请码错误", 
                                needInvite: true,
                                showCaptcha: true
                            });
                        }
                        
                        // 邀请码正确，创建新用户并哈希密码
                        const isAdmin = 0;
                        const createUserWithHash = async () => {
                            try {
                                const hashedPassword = await hashPassword(password);
                                db.run(
                                    "INSERT INTO users (username, password, is_admin, is_disabled, user_type) VALUES (?, ?, ?, ?, ?)",
                                    [username, hashedPassword, isAdmin, 0, 'local'],
                                    (err) => {
                                        if (err) return res.status(500).json({ error: "创建用户失败" });
                                        
                                        // 设置用户信息
                                        req.user = { username, is_admin: isAdmin, user_type: 'local', is_disabled: 0 };
                                        next();
                                    }
                                );
                            } catch (err) {
                                console.error('密码哈希失败:', err);
                                res.status(500).json({ error: "密码处理失败" });
                            }
                        };
                        
                        createUserWithHash();
                    });
            }
        });
    } else if (loginType === 'ad') {
        // AD域认证
        // 检查AD配置是否存在
        if (!config.ad) {
            return res.status(401).json({ error: "AD配置未启用" });
        }
        adAuth.authenticate(username, password).then(adAuthenticated => {
            if (adAuthenticated) {
                // AD认证成功，获取用户信息
                adAuth.getUserInfo(username).then(adInfo => {
                    // 检查AD用户是否已存在（只查找user_type='ad'的记录）
                    db.get("SELECT * FROM users WHERE username = ? AND user_type = 'ad'", [username], (err, user) => {
                        if (err) return res.status(500).json({ error: "DB Error" });
                        
                        if (user) {
                            // 更新现有AD用户信息
                            db.run(
                                "UPDATE users SET full_name = ?, email = ?, department = ?, title = ?, phone = ?, manager = ?, ad_dn = ?, last_ad_sync = ? WHERE username = ? AND user_type = 'ad'",
                                [adInfo?.fullName, adInfo?.email, adInfo?.department, adInfo?.title, adInfo?.phone, adInfo?.manager, adInfo?.distinguishedName, Date.now(), username],
                                (err) => {
                                    if (err) {
                                        console.error('更新AD用户信息失败:', err);
                                    }
                                    db.get("SELECT * FROM users WHERE username = ? AND user_type = 'ad'", [username], (err, updatedUser) => {
                                        if (err) {
                                            console.error('查询更新后用户失败:', err);
                                            // 如果查询失败，至少设置基本的用户信息
                                            req.user = { 
                                                username: username, 
                                                is_admin: user.is_admin 
                                            };
                                        } else {
                                            req.user = updatedUser;
                                        }
                                        next();
                                    });
                                }
                            );
                        } else {
                            // 新AD用户注册
                            const isAdmin = 0;
                            
                            db.run(
                                "INSERT INTO users (username, password, is_admin, is_disabled, full_name, email, department, title, phone, manager, ad_dn, last_ad_sync, user_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ad')",
                                [username, password, isAdmin, 0, adInfo?.fullName, adInfo?.email, adInfo?.department, adInfo?.title, adInfo?.phone, adInfo?.manager, adInfo?.distinguishedName, Date.now()],
                                (err) => {
                                    if (err) {
                                        console.error('创建AD用户失败:', err);
                                        return res.status(500).json({ error: "Register failed" });
                                    }
                                    
                                    // 设置完整的用户信息
                                    req.user = {
                                        username: username,
                                        is_admin: isAdmin,
                                        full_name: adInfo?.fullName,
                                        email: adInfo?.email,
                                        department: adInfo?.department,
                                        title: adInfo?.title,
                                        phone: adInfo?.phone,
                                        manager: adInfo?.manager,
                                        ad_dn: adInfo?.distinguishedName,
                                        last_ad_sync: Date.now(),
                                        user_type: 'ad'
                                    };
                                    next();
                                }
                            );
                        }
                    });
                }).catch(err => {
                    console.error('获取AD用户信息失败:', err);
                    // 如果获取用户信息失败，仍允许登录
                    db.get("SELECT * FROM users WHERE username = ? AND user_type = 'ad'", [username], (err, user) => {
                        if (err) return res.status(500).json({ error: "DB Error" });
                        
                        if (user) {
                            req.user = user;
                            next();
                        } else {
                            // 新AD用户但无法获取详细信息
                            const isAdmin = 0;
                            
                            db.run(
                                "INSERT INTO users (username, password, is_admin, is_disabled, last_ad_sync, user_type) VALUES (?, ?, ?, ?, ?, 'ad')",
                                [username, password, isAdmin, 0, Date.now()],
                                (err) => {
                                    if (err) return res.status(500).json({ error: "Register failed" });
                                    req.user = { username, is_admin: isAdmin };
                                    next();
                                }
                            );
                        }
                    });
                });
            } else {
                // AD认证失败，尝试检查是否有同名的本地用户
                // 注意：这只是为了提供更好的错误信息，实际认证已经失败
                db.get("SELECT * FROM users WHERE username = ? AND user_type = 'local'", [username], (err, user) => {
                    if (user) {
                        // 有同名本地用户，提示用户可能需要切换登录类型
                        res.status(401).json({ 
                            error: "域账号或密码错误",
                            hasLocalAccount: true
                        });
                    } else {
                        // 没有同名本地用户，直接返回错误
                        res.status(401).json({ error: "域账号或密码错误" });
                    }
                });
            }
        }).catch(err => {
            console.error('AD认证错误:', err);
            res.status(401).json({ error: "域认证服务不可用" });
        });
    } else {
        // 未知登录类型
        res.status(400).json({ error: "Invalid login type" });
    }
};

const requireAdmin = (req, res, next) => {
    if (!req.user || !req.user.is_admin) return res.status(403).json({ error: "需要管理员权限" });
    next();
};

// JWT验证中间件
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        
        if (decoded) {
            // 验证用户是否被禁用
            db.get("SELECT is_disabled FROM users WHERE username = ?", [decoded.username], (err, user) => {
                if (err) {
                    console.error('JWT验证时查询用户失败:', err);
                    return res.status(500).json({ error: "服务器错误" });
                }
                
                if (user && user.is_disabled) {
                    console.log('用户已被禁用，拒绝访问:', decoded.username);
                    return res.status(401).json({ error: "用户已被禁用" });
                }
                
                req.user = decoded;
                next();
            });
        } else {
            res.status(401).json({ error: "无效的令牌" });
        }
    } else {
        res.status(401).json({ error: "缺少认证令牌" });
    }
};

module.exports = { 
    authenticate, 
    authenticateJWT,
    requireAdmin, 
    generateInviteCode, 
    getOrInitInviteCode,
    generateToken,
    verifyToken
 };