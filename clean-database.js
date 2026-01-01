const sqlite3 = require('sqlite3').verbose();

// 连接到数据库
const db = new sqlite3.Database('database.sqlite', (err) => {
    if (err) {
        console.error('连接数据库失败:', err.message);
        return;
    }
    console.log('已连接到SQLite数据库');
});

// 查看所有表
console.log('\n1. 查看数据库表结构:');
db.all('SELECT name FROM sqlite_master WHERE type="table"', (err, tables) => {
    if (err) {
        console.error('查询表失败:', err.message);
        return;
    }
    
    console.log('数据库表列表:', tables.map(t => t.name));
    
    // 查看每个表的内容
    tables.forEach(table => {
        console.log(`\n2. 表 ${table.name} 的内容:`);
        db.all(`SELECT * FROM ${table.name}`, (err, rows) => {
            if (err) {
                console.error(`查询表 ${table.name} 失败:`, err.message);
                return;
            }
            console.log(rows);
            
            // 如果是users表，只保留管理员用户
            if (table.name === 'users') {
                console.log(`\n3. 清理表 ${table.name}:`);
                // 只删除非管理员用户
                db.run('DELETE FROM users WHERE is_admin = 0', (err) => {
                    if (err) {
                        console.error('清理用户表失败:', err.message);
                        return;
                    }
                    console.log('已清理非管理员用户');
                });
            } 
            // 如果是tasks或checklists表，清空所有数据
            else if (table.name === 'tasks' || table.name === 'checklists' || table.name === 'checklist_shares') {
                console.log(`\n3. 清理表 ${table.name}:`);
                db.run(`DELETE FROM ${table.name}`, (err) => {
                    if (err) {
                        console.error(`清空表 ${table.name} 失败:`, err.message);
                        return;
                    }
                    console.log(`已清空表 ${table.name}`);
                });
            }
            // 其他表保留
        });
    });
    
    // 关闭数据库连接
    setTimeout(() => {
        db.close((err) => {
            if (err) {
                console.error('关闭数据库失败:', err.message);
                return;
            }
            console.log('\n已关闭数据库连接');
        });
    }, 1000);
});
