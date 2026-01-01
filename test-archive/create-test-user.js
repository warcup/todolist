const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

// 创建测试用户
const username = 'admin';
const password = 'admin123';
const isAdmin = 1;

db.run(
    "INSERT OR REPLACE INTO users (username, password, is_admin, full_name, email, user_type) VALUES (?, ?, ?, ?, ?, ?)",
    [username, password, isAdmin, 'Admin User', 'admin@example.com', 'local'],
    (err) => {
        if (err) {
            console.error('创建测试用户失败:', err);
        } else {
            console.log('测试用户创建成功:', username);
        }
        db.close();
    }
);