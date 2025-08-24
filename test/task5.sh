#!/bin/bash

# 测试任务5：验证本地保存机制优化功能

echo "Testing task 5: Local save mechanism optimization"

# 先构建项目
echo "Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Task 5 FAILED: Build failed"
    exit 1
fi

# 使用Node.js测试脚本
node test/task5_test.js

# 检查退出状态
if [ $? -eq 0 ]; then
    echo "✅ Task 5 PASSED: Local save mechanism optimization works correctly"
    exit 0
else
    echo "❌ Task 5 FAILED: Local save mechanism optimization failed"
    exit 1
fi