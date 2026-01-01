#!/usr/bin/env node

// Node.js 项目打包脚本
// 使用 pkg 工具将项目打包为单个可执行文件

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=' .repeat(60));
console.log('Node.js 项目打包工具');
console.log('=' .repeat(60));

// 项目根目录
const rootDir = path.join(__dirname, '.');

// 检查是否已安装 pkg
console.log('\n1. 检查打包工具 pkg...');
try {
    execSync('npx pkg --version', { stdio: 'ignore' });
    console.log('✓ pkg 已安装');
} catch (error) {
    console.log('✗ pkg 未安装，正在安装...');
    execSync('npm install -g pkg', { stdio: 'inherit' });
    console.log('✓ pkg 安装成功');
}

// 读取并修改 package.json
console.log('\n2. 配置 package.json...');
const packageJsonPath = path.join(rootDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 添加 pkg 配置
const updatedPackageJson = {
    ...packageJson,
    pkg: {
        "scripts": ["server.js", "server/**/*.js"],
        "assets": ["public/**/*", "database.sqlite"],
        "targets": [
            "node16-linux-x64",
            "node16-win-x64",
            "node16-macos-x64"
        ],
        "outputPath": "dist"
    }
};

fs.writeFileSync(packageJsonPath, JSON.stringify(updatedPackageJson, null, 2));
console.log('✓ package.json 配置完成');

// 创建 .pkgignore 文件
console.log('\n3. 创建 .pkgignore 文件...');
const pkgIgnoreContent = `
# 忽略的文件和目录
node_modules/
test/
bin/
*.log
.DS_Store
*.bak
*.tmp
.git/
.gitignore
.npmignore
*.zip
*.tar.gz
`;

fs.writeFileSync(path.join(rootDir, '.pkgignore'), pkgIgnoreContent.trim() + '\n');
console.log('✓ .pkgignore 文件创建完成');

// 执行打包命令
console.log('\n4. 开始打包项目...');
console.log('提示: 打包过程可能需要几分钟，请耐心等待...');

// 创建 dist 目录
if (!fs.existsSync(path.join(rootDir, 'dist'))) {
    fs.mkdirSync(path.join(rootDir, 'dist'));
}

// 只执行Windows版本的打包
const platform = 'win';
console.log(`
正在打包 ${platform} 版本...`);
try {
    execSync(`npx pkg -t node16-${platform}-x64 server.js`, { stdio: 'inherit' });
    console.log(`✓ ${platform} 版本打包完成`);
} catch (error) {
    console.error(`✗ ${platform} 版本打包失败: ${error.message}`);
}

// 恢复原始 package.json
console.log('\n5. 恢复原始配置...');
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('✓ 配置已恢复');

// 显示打包结果
console.log('\n' + '=' .repeat(60));
console.log('打包完成！');
console.log('=' .repeat(60));

const distDir = path.join(rootDir, 'dist');
if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    console.log('\n生成的可执行文件:');
    files.forEach(file => {
        const filePath = path.join(distDir, file);
        const stats = fs.statSync(filePath);
        const size = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`- ${file} (${size} MB)`);
    });
}

console.log('\n使用说明:');
console.log('1. 将生成的可执行文件复制到目标服务器');
console.log('2. 赋予执行权限 (Linux/macOS): chmod +x ./glass-todo-local');
console.log('3. 直接运行: ./glass-todo-local (Linux/macOS) 或 glass-todo-local.exe (Windows)');
console.log('4. 访问地址: http://服务器IP:3000');
console.log('\n注意事项:');
console.log('- 生成的可执行文件已包含 Node.js 运行时');
console.log('- 静态文件和数据库已打包到可执行文件中');
console.log('- 首次运行时会自动解压必要文件');
