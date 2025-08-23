#!/bin/bash

# 测试任务1：验证list_wikipedia_wikis工具功能

echo "Testing task 1: Verify list_wikipedia_wikis tool functionality"

# 启动MCP服务器并测试list_wikipedia_wikis工具
echo "Starting MCP server and testing list_wikipedia_wikis tool..."

# 创建临时测试脚本
cat > /tmp/task1_test.js << 'EOF'
import { spawn } from 'child_process';

// 启动MCP服务器
const server = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let allOutput = '';

// 监听输出
server.stdout.on('data', (data) => {
  allOutput += data.toString();
});

server.stderr.on('data', (data) => {
  allOutput += data.toString();
});

// 设置5秒超时进行分析
setTimeout(() => {
  server.kill();
  
  // 分析输出
  const hasListWikisTool = allOutput.includes('"name":"list_wikipedia_wikis"');
  const hasEnwiki = allOutput.includes('enwiki');
  const hasZhwiki = allOutput.includes('zhwiki');
  
  if (hasListWikisTool && hasEnwiki && hasZhwiki) {
    console.log('✅ Task 1 PASSED: list_wikipedia_wikis tool is available and shows Wikipedia instances');
    process.exit(0);
  } else {
    console.log('❌ Task 1 FAILED: list_wikipedia_wikis tool or Wikipedia instances not found');
    process.exit(1);
  }
}, 5000);

// 发送请求
setTimeout(() => {
  const requests = [
    '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\n',
    '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_wikipedia_wikis","arguments":{}}}\n'
  ];
  
  for (const request of requests) {
    server.stdin.write(request);
  }
}, 1000);
EOF

# 运行测试并清理
node /tmp/task1_test.js
TEST_RESULT=$?
rm /tmp/task1_test.js

# 检查结果
if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ Task 1 PASSED: list_wikipedia_wikis tool is available and shows Wikipedia instances"
    exit 0
else
    echo "❌ Task 1 FAILED: list_wikipedia_wikis tool test failed"
    exit 1
fi
