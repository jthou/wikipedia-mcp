#!/bin/bash

# 测试任务3：验证list_wikis工具输出是否包含Wikipedia

echo "Testing task 3: Verify list_wikis includes Wikipedia instances"

# 启动MCP服务器并测试list_wikis工具
echo "Starting MCP server and testing list_wikis tool..."

# 使用Node.js测试脚本
node test/simple_task3_test.js

# 检查退出状态
if [ $? -eq 0 ]; then
    echo "✅ Task 3 PASSED: list_wikis correctly shows Wikipedia instances"
    exit 0
else
    echo "❌ Task 3 FAILED: list_wikis does not show Wikipedia instances correctly"
    exit 1
fi