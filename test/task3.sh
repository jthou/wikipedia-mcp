#!/bin/bash

# 测试任务3：验证list_wikis工具输出是否包含Wikipedia

echo "Testing task 3: Verify list_wikis includes Wikipedia instances"

# 启动MCP服务器并测试list_wikis工具
echo "Starting MCP server and testing list_wikis tool..."

# 使用MCP Inspector测试list_wikis工具
timeout 10s npx @modelcontextprotocol/inspector@latest --stdio node build/index.js > test_task3_output.log 2>&1 <<EOF
{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_wikis","arguments":{}}}
EOF

# 检查输出是否包含Wikipedia实例
if grep -q "enwiki" test_task3_output.log && grep -q "zhwiki" test_task3_output.log; then
    echo "✅ Task 3 PASSED: list_wikis correctly shows Wikipedia instances"
    exit 0
else
    echo "❌ Task 3 FAILED: list_wikis does not show Wikipedia instances correctly"
    cat test_task3_output.log
    exit 1
fi