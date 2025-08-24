#!/bin/bash

# 测试任务3：验证list_wikipedia_wikis工具输出是否包含Wikipedia

echo "Testing task 3: Verify list_wikipedia_wikis includes Wikipedia instances"

# 启动MCP服务器并测试list_wikipedia_wikis工具
echo "Starting MCP server and testing list_wikipedia_wikis tool..."

# 创建临时测试脚本
cat > /tmp/task3_test.js << 'EOF'
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
  
  // 分析输出，检查是否包含Wikipedia实例
  const hasEnwiki = allOutput.includes('enwiki');
  const hasZhwiki = allOutput.includes('zhwiki');
  
  if (hasEnwiki && hasZhwiki) {
    console.log('✅ Task 3 PASSED: list_wikipedia_wikis correctly shows Wikipedia instances');
    process.exit(0);
  } else {
    console.log('❌ Task 3 FAILED: list_wikipedia_wikis does not show Wikipedia instances correctly');
    process.exit(1);
  }
}, 5000);

// 发送 list_wikipedia_wikis 请求
setTimeout(() => {
  const request = '{"jsonrpc":"2.0","id":1,"method":"callTool","params":{"name":"list_wikipedia_wikis","arguments":{}}}\n';
  server.stdin.write(request);
}, 1000);
EOF

# 运行测试并清理
node /tmp/task3_test.js
TEST_RESULT=$?
rm /tmp/task3_test.js

# 检查结果
if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ Task 3 PASSED: list_wikipedia_wikis correctly shows Wikipedia instances"
    exit 0
else
    echo "❌ Task 3 FAILED: list_wikipedia_wikis does not show Wikipedia instances correctly"
    exit 1
fi