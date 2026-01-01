const db = require('./server/db');

console.log('查询用户表信息：');

// 检查用户表结构
db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err) {
        console.error('查询表结构错误:', err);
        process.exit(1);
    }
    
    console.log('\n用户表字段：');
    columns.forEach(col => {
        console.log(`- ${col.name} (${col.type}) ${col.notnull ? '(NOT NULL)' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });
    
    // 查询所有用户数据
db.all("SELECT * FROM users", (err, users) => {
        if (err) {
            console.error('查询用户数据错误:', err);
            process.exit(1);
        }
        
        console.log(`\n找到 ${users.length} 个用户：`);
        users.forEach((user, index) => {
            console.log(`\n${index + 1}. 用户名: ${user.username}`);
            console.log(`   管理员权限: ${user.is_admin}`);
            console.log(`   用户类型: ${user.user_type}`);
            console.log(`   全名: ${user.full_name}`);
            console.log(`   邮箱: ${user.email}`);
        });
        
        process.exit(0);
    });
});