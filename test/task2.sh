#!/bin/bash

# 测试任务2：验证已删除的功能无法调用

echo "Testing task 2: Verify removed tools are no longer available"

# 启动MCP服务器并测试已删除的工具
echo "Starting MCP server and testing removed tools..."

# 使用Node.js测试脚本
node test/test_removed_tools.js

# 检查退出状态
if [ $? -eq 0 ]; then
    echo "✅ Task 2 PASSED: Removed tools are no longer available"
    exit 0
else
    echo "❌ Task 2 FAILED: Some removed tools are still available"
    exit 1
fi