#!/bin/bash

# 测试任务1：验证list_wikis工具功能

echo "Testing task 1: Verify list_wikis tool functionality"

# 启动MCP服务器并测试list_wikis工具
echo "Starting MCP server and testing list_wikis tool..."

# 使用Node.js测试脚本
node test/simple_task1_test.js

# 检查退出状态
if [ $? -eq 0 ]; then
    echo "✅ Task 1 PASSED: list_wikis tool is available and shows Wikipedia instances"
    exit 0
else
    echo "❌ Task 1 FAILED: list_wikis tool test failed"
    exit 1
fi
