const db = require('./db');

// 获取命令行参数
const args = process.argv.slice(2);
const targetUser = args[0];

if (!targetUser) {
    console.error('请提供要设置为管理员的用户名');
    console.log('使用方法: node server/set-admin.js <username>');
    process.exit(1);
}

// 检查用户是否存在
db.get("SELECT * FROM users WHERE username = ?", [targetUser], (err, user) => {
    if (err) {
        console.error('数据库查询错误:', err);
        process.exit(1);
    }
    
    if (!user) {
        console.error(`用户 ${targetUser} 不存在`);
        process.exit(1);
    }
    
    // 将用户设为管理员
db.run("UPDATE users SET is_admin = 1 WHERE username = ?", [targetUser], (err) => {
        if (err) {
            console.error('设置管理员权限失败:', err);
            process.exit(1);
        }
        
        console.log(`用户 ${targetUser} 已成功设置为管理员`);
        
        // 验证设置是否成功
db.get("SELECT is_admin FROM users WHERE username = ?", [targetUser], (err, result) => {
            if (err) {
                console.error('验证设置失败:', err);
                process.exit(1);
            }
            
            console.log(`验证结果: 用户 ${targetUser} 的is_admin值为 ${result.is_admin}`);
            process.exit(0);
        });
    });
});