#!/bin/bash

# 测试任务2：验证已删除的功能无法调用

echo "Testing task 2: Verify removed tools are no longer available"

# 启动MCP服务器并测试已删除的工具
echo "Starting MCP server and testing removed tools..."

# 创建临时测试脚本
cat > /tmp/task2_test.js << 'EOF'
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
  const hasUpdatePage = allOutput.includes('"name":"update_page"');
  const hasUploadFile = allOutput.includes('"name":"upload_file"');
  const hasUploadFromClipboard = allOutput.includes('"name":"upload_from_clipboard"');
  
  const updatePageError = allOutput.includes('Unknown tool: update_page');
  const uploadFileError = allOutput.includes('Unknown tool: upload_file');
  const uploadFromClipboardError = allOutput.includes('Unknown tool: upload_from_clipboard');
  
  const allRemovedAbsent = !hasUpdatePage && !hasUploadFile && !hasUploadFromClipboard;
  const allErrorsPresent = updatePageError && uploadFileError && uploadFromClipboardError;
  
  if (allRemovedAbsent && allErrorsPresent) {
    console.log('✅ Task 2 PASSED: All removed tools are properly removed');
    process.exit(0);
  } else {
    console.log('❌ Task 2 FAILED: Some issues detected');
    process.exit(1);
  }
}, 5000);

// 发送请求
setTimeout(() => {
  const requests = [
    '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\n',
    '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"update_page","arguments":{}}}\n',
    '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"upload_file","arguments":{}}}\n',
    '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"upload_from_clipboard","arguments":{}}}\n'
  ];
  
  for (const request of requests) {
    server.stdin.write(request);
  }
}, 1000);
EOF

# 运行测试并清理
node /tmp/task2_test.js
TEST_RESULT=$?
rm /tmp/task2_test.js

# 检查结果
if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ Task 2 PASSED: Removed tools are no longer available"
    exit 0
else
    echo "❌ Task 2 FAILED: Some removed tools are still available"
    exit 1
fi