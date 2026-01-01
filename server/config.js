// AD域配置
const fs = require('fs');
const path = require('path');

// 默认AD配置 - 取消默认值
const defaultADConfig = {};

// 读取外部AD配置文件
let adConfig = null;
// 检查是否有环境变量配置
if (process.env.AD_URL) {
    adConfig = {
        url: process.env.AD_URL,
        baseDN: process.env.AD_BASE_DN || '',
        username: process.env.AD_USERNAME || '',
        password: process.env.AD_PASSWORD || '',
        searchBase: process.env.AD_SEARCH_BASE || '',
        searchFilter: process.env.AD_SEARCH_FILTER || '(sAMAccountName=%(user)s)',
        attributes: [
            'cn',
            'sn',
            'givenName',
            'mail',
            'telephoneNumber',
            'department',
            'title',
            'manager',
            'distinguishedName',
            'samaccountname'
        ]
    };
}
// 支持两种配置文件格式，优先使用 .config 文件
const configPaths = [
    path.join(__dirname, '.config'),
    path.join(__dirname, '.ad.config')
];

for (const configPath of configPaths) {
    try {
        if (fs.existsSync(configPath)) {
            const adConfigContent = fs.readFileSync(configPath, 'utf8');
            const externalConfig = JSON.parse(adConfigContent);
            if (externalConfig.ad) {
                adConfig = externalConfig.ad;
                // 确保属性完整性
                if (!adConfig.attributes) {
                    adConfig.attributes = [
                        'cn',
                        'sn',
                        'givenName',
                        'mail',
                        'telephoneNumber',
                        'department',
                        'title',
                        'manager',
                        'distinguishedName',
                        'samaccountname'
                    ];
                }
                if (!adConfig.searchFilter) {
                    adConfig.searchFilter = '(sAMAccountName=%(user)s)';
                }
                console.log('已加载外部AD配置文件:', configPath);
                break; // 找到一个有效的配置文件就停止
            }
        }
    } catch (error) {
        console.error('读取AD配置文件出错:', configPath, error.message);
        console.log('尝试读取下一个配置文件...');
    }
}

module.exports = {
    ad: adConfig,
    // JWT配置
    jwt: {
        secret: process.env.JWT_SECRET || 'you_code',
        expiresIn: process.env.JWT_EXPIRES_IN || '48h'
    },
    // 服务器配置
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || '0.0.0.0'
    }
};
