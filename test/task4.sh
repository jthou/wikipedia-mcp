#!/bin/bash

# 测试任务4：验证Wikipedia文章抓取功能

echo "Testing task 4: Verify Wikipedia article scraping functionality"

# 启动MCP服务器并测试文章抓取功能
echo "Starting MCP server and testing Wikipedia article scraping..."

# 使用Node.js测试脚本
node test/task4_test.js

# 检查退出状态
if [ $? -eq 0 ]; then
    echo "✅ Task 4 PASSED: Wikipedia article scraping works correctly"
    exit 0
else
    echo "❌ Task 4 FAILED: Wikipedia article scraping failed"
    exit 1
fi
