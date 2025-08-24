#!/bin/bash

# 测试任务4：验证环境配置和代理支持功能

echo "Testing task 4: Environment configuration and proxy support"

# 先构建项目
echo "Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Task 4 FAILED: Build failed"
    exit 1
fi

# 使用Node.js测试脚本
node test/task4_test.js

# 检查退出状态
if [ $? -eq 0 ]; then
    echo "✅ Task 4 PASSED: Environment configuration and proxy support work correctly"
    exit 0
else
    echo "❌ Task 4 FAILED: Environment configuration or proxy support failed"
    exit 1
fi
