const db = require('./server/db');

console.log('查询data表内容：');
db.all("SELECT * FROM data", (err, rows) => {
    if (err) {
        console.error('查询错误:', err);
        process.exit(1);
    }
    
    console.log(`找到 ${rows.length} 条记录:`);
    rows.forEach((row, index) => {
        console.log(`\n${index + 1}. 用户名: ${row.username}`);
        console.log(`   数据长度: ${row.json_data.length} 字符`);
        console.log(`   版本: ${row.version}`);
        
        // 尝试解析JSON数据，查看是否包含任务/日程信息
        try {
            const data = JSON.parse(row.json_data);
            console.log(`   数据类型: ${typeof data}`);
            if (Array.isArray(data)) {
                console.log(`   数组长度: ${data.length}`);
            } else if (typeof data === 'object') {
                console.log(`   对象键: ${Object.keys(data).join(', ')}`);
            }
        } catch (parseErr) {
            console.log(`   JSON解析错误: ${parseErr.message}`);
        }
    });
    
    process.exit(0);
});