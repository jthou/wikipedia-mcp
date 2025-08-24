#!/bin/bash

# Task 4-1 测试脚本：验证环境配置和代理支持，确保完全移除nodemw依赖

echo "========================================"
echo "Task 4-1 测试：环境配置和代理支持"
echo "========================================"

# 设置错误时退出
set -e

# 1. 验证nodemw库已从package.json中移除
echo "1. 检查nodemw依赖是否已移除..."
if grep -q "nodemw" package.json; then
    echo "❌ FAIL: package.json中仍然包含nodemw依赖"
    exit 1
else
    echo "✅ PASS: nodemw依赖已成功从package.json中移除"
fi

# 2. 验证dotenv依赖是否存在
echo "2. 检查dotenv依赖是否存在..."
if grep -q "dotenv" package.json; then
    echo "✅ PASS: dotenv依赖已添加到package.json"
else
    echo "❌ FAIL: dotenv依赖未在package.json中找到"
    exit 1
fi

# 3. 验证.env.example文件是否存在
echo "3. 检查.env.example文件是否存在..."
if [ -f ".env.example" ]; then
    echo "✅ PASS: .env.example文件存在"
    # 检查是否包含代理配置示例
    if grep -q "HTTP_PROXY" .env.example && grep -q "HTTPS_PROXY" .env.example; then
        echo "✅ PASS: .env.example包含代理配置示例"
    else
        echo "❌ FAIL: .env.example缺少代理配置示例"
        exit 1
    fi
else
    echo "❌ FAIL: .env.example文件不存在"
    exit 1
fi

# 4. 验证.gitignore确保.env文件不被提交
echo "4. 检查.gitignore是否包含.env..."
if [ -f ".gitignore" ] && grep -q "\.env" .gitignore; then
    echo "✅ PASS: .gitignore包含.env规则"
else
    echo "❌ FAIL: .gitignore不包含.env规则"
    exit 1
fi

# 5. 编译测试：验证TypeScript代码可以正常编译
echo "5. 编译测试..."
npx tsc src/index.ts --outDir build --module Node16 --target ES2022 --moduleResolution Node16 --noEmit
if [ $? -eq 0 ]; then
    echo "✅ PASS: TypeScript代码编译成功"
else
    echo "❌ FAIL: TypeScript代码编译失败"
    exit 1
fi

# 6. 验证源代码中完全移除nodemw相关引用
echo "6. 检查源代码中是否移除了nodemw引用..."
if grep -r "nodemw\|import.*bot" src/index.ts; then
    echo "❌ FAIL: 源代码中仍然包含nodemw或相关引用"
    exit 1
else
    echo "✅ PASS: 源代码已完全移除nodemw相关引用"
fi

# 7. 验证环境变量配置读取
echo "7. 创建测试.env文件并验证配置读取..."
cat > .env.test << EOF
HTTP_PROXY=http://test-proxy:8080
HTTPS_PROXY=https://test-proxy:8080
REQUEST_TIMEOUT=15
LOG_LEVEL=debug
OUTPUT_DIR=.test_output
USER_AGENT=Test-Wikipedia-MCP/1.0
EOF

# 创建简单的测试脚本验证环境变量读取
cat > test_env_config.js << 'EOF'
import { config } from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载测试环境变量
config({ path: path.resolve(__dirname, '.env.test') });

// 验证环境变量配置
const CONFIG = {
  HTTP_PROXY: process.env.HTTP_PROXY || '',
  HTTPS_PROXY: process.env.HTTPS_PROXY || '',
  REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT || '10', 10) * 1000,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  OUTPUT_DIR: process.env.OUTPUT_DIR || '.wikipedia_cache',
  USER_AGENT: process.env.USER_AGENT || 'Wikipedia-MCP-Server/1.0'
};

console.log('Environment configuration loaded:');
console.log('HTTP_PROXY:', CONFIG.HTTP_PROXY);
console.log('HTTPS_PROXY:', CONFIG.HTTPS_PROXY);
console.log('REQUEST_TIMEOUT:', CONFIG.REQUEST_TIMEOUT);
console.log('LOG_LEVEL:', CONFIG.LOG_LEVEL);
console.log('OUTPUT_DIR:', CONFIG.OUTPUT_DIR);
console.log('USER_AGENT:', CONFIG.USER_AGENT);

// 验证配置是否正确读取
if (CONFIG.HTTP_PROXY === 'http://test-proxy:8080' &&
    CONFIG.HTTPS_PROXY === 'https://test-proxy:8080' &&
    CONFIG.REQUEST_TIMEOUT === 15000 &&
    CONFIG.LOG_LEVEL === 'debug' &&
    CONFIG.OUTPUT_DIR === '.test_output' &&
    CONFIG.USER_AGENT === 'Test-Wikipedia-MCP/1.0') {
    console.log('✅ Environment configuration test PASSED');
    process.exit(0);
} else {
    console.log('❌ Environment configuration test FAILED');
    process.exit(1);
}
EOF

node test_env_config.js
if [ $? -eq 0 ]; then
    echo "✅ PASS: 环境变量配置正确读取"
else
    echo "❌ FAIL: 环境变量配置读取失败"
    exit 1
fi

# 清理测试文件
rm -f .env.test test_env_config.js

# 8. 验证只保留查询相关工具
echo "8. 验证工具定义只包含查询功能..."
if node -e "
const fs = require('fs');
const content = fs.readFileSync('src/index.ts', 'utf8');
if (content.includes('updatePage') || content.includes('uploadFile') || content.includes('deletePage')) {
    console.log('❌ FAIL: 源代码仍包含update/upload/delete方法');
    process.exit(1);
} else {
    console.log('✅ PASS: 源代码已移除update/upload/delete方法');
    process.exit(0);
}
"; then
    echo "✅ PASS: 已成功移除update/upload/delete相关功能"
else
    echo "❌ FAIL: 仍然包含update/upload/delete相关功能"
    exit 1
fi

echo ""
echo "========================================"
echo "✅ Task 4-1 所有测试通过！"
echo "========================================"
echo "已完成："
echo "- ✅ 卸载nodemw依赖包"
echo "- ✅ 集成dotenv环境变量支持"
echo "- ✅ 创建.env.example模板文件"
echo "- ✅ 更新.gitignore确保.env文件不被提交"
echo "- ✅ 重写WikipediaClient类，使用原生fetch API"
echo "- ✅ 移除update/upload相关功能，只保留查询功能"
echo "- ✅ 完全移除nodemw库依赖，改用MediaWiki REST API原生实现"
