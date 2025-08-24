#!/bin/bash

# Task 6: 异常与边界处理测试脚本
# 验证各种异常和边界情况的处理效果

echo "Testing task 6: Exception and boundary handling"

# 构建项目
echo "Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "开始异常与边界处理测试..."

# 运行直接测试脚本
node test/direct_task6_test.js

# 检查测试结果
if [ $? -eq 0 ]; then
    echo "✅ Task 6 PASSED: 异常与边界处理功能正常"
else
    echo "❌ Task 6 FAILED: 异常与边界处理需要改进"
    exit 1
fi