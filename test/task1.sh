#!/bin/bash

# 测试任务1：验证list_wikis工具功能

echo "Testing task 1: Verify list_wikis tool functionality"

# 启动MCP服务器并测试list_wikis工具
echo "Starting MCP server and testing list_wikis tool..."

# 使用自动化脚本测试list_wikis工具
node test/test_list_wikis.js > test_task1_output.log 2>&1

# 检查输出是否包含list_wikis工具
if grep -q "✅ Task 1 PASSED" test_task1_output.log; then
    echo "✅ Task 1 PASSED: list_wikis tool is available and shows Wikipedia instances"
    exit 0
elif grep -q "❌ Task 1 FAILED" test_task1_output.log; then
    echo "❌ Task 1 FAILED: list_wikis tool test failed"
    cat test_task1_output.log
    exit 1
else
    echo "❌ Task 1 FAILED: Unexpected test output"
    cat test_task1_output.log
    exit 1
fi
