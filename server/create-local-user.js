const crypto = require('crypto');
const db = require('./db');

// 密码哈希函数
const hashPassword = (password) => {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16).toString('hex');
        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
            if (err) reject(err);
            resolve(`${salt}:${derivedKey.toString('hex')}`);
        });
    });
};

// 获取命令行参数
const args = process.argv.slice(2);
const username = args[0];
const password = args[1];

if (!username || !password) {
    console.error('请提供用户名和密码');
    console.log('使用方法: node server/create-local-user.js <username> <password>');
    process.exit(1);
}

// 检查用户是否已存在
db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) {
        console.error('数据库查询错误:', err);
        process.exit(1);
    }
    
    if (user) {
        console.error(`用户 ${username} 已存在`);
        process.exit(1);
    }
    
    // 创建新用户
    const createUser = async () => {
        try {
            const hashedPassword = await hashPassword(password);
            db.run(
                "INSERT INTO users (username, password, is_admin, is_disabled, user_type) VALUES (?, ?, ?, ?, ?)",
                [username, hashedPassword, 0, 0, 'local'],
                (err) => {
                    if (err) {
                        console.error('创建用户失败:', err);
                        process.exit(1);
                    }
                    
                    console.log(`用户 ${username} 已成功创建`);
                    
                    // 验证用户是否创建成功
                    db.get("SELECT * FROM users WHERE username = ?", [username], (err, result) => {
                        if (err) {
                            console.error('验证创建失败:', err);
                            process.exit(1);
                        }
                        
                        if (result) {
                            console.log(`验证结果: 用户 ${username} 已成功创建`);
                            console.log(`用户信息: 用户名=${result.username}, 管理员权限=${result.is_admin}, 禁用状态=${result.is_disabled}, 用户类型=${result.user_type}`);
                            process.exit(0);
                        } else {
                            console.error(`验证失败: 用户 ${username} 创建后未找到`);
                            process.exit(1);
                        }
                    });
                }
            );
        } catch (err) {
            console.error('密码哈希失败:', err);
            process.exit(1);
        }
    };
    
    createUser();
});
