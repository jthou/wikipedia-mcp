#!/bin/bash

# 测试任务1：验证list_wikis工具功能

echo "Testing task 1: Verify list_wikis tool functionality"

# 启动MCP服务器并测试list_wikis工具
echo "Starting MCP server and testing list_wikis tool..."

# 使用MCP Inspector测试list_wikis工具
npx @modelcontextprotocol/inspector@latest --stdio node build/index.js > test_task1_output.log 2>&1 <<EOF
{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_wikis","arguments":{}}}
EOF

# 等待一点时间让命令执行完成
sleep 3

# 检查输出是否包含list_wikis工具
if grep -q "list_wikis" test_task1_output.log; then
    echo "✅ Task 1 PASSED: list_wikis tool is available"
    
    # 检查输出是否包含Jthou wiki
    if grep -q "Jthou" test_task1_output.log; then
        echo "✅ Task 1 PASSED: list_wikis correctly shows Jthou wiki"
        exit 0
    else
        echo "❌ Task 1 FAILED: list_wikis does not show Jthou wiki"
        cat test_task1_output.log
        exit 1
    fi
else
    echo "❌ Task 1 FAILED: list_wikis tool is not available"
    cat test_task1_output.log
    exit 1
fi