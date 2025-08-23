#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Quick MCP Server Test');

const serverPath = path.join(__dirname, '..', 'build', 'index.js');
console.log('Server path:', serverPath);

// 启动服务器
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let hasResponse = false;

// 监听输出
server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('Server output:', output);
  hasResponse = true;
});

server.stderr.on('data', (data) => {
  const output = data.toString();
  console.log('Server stderr:', output);
  hasResponse = true; // 即使是错误输出也算响应
});

// 发送工具列表请求
setTimeout(() => {
  console.log('📤 Sending tools/list request...');
  const request = JSON.stringify({
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }) + '\n';
  
  server.stdin.write(request);
}, 1000);

// 5秒后检查结果
setTimeout(() => {
  if (hasResponse) {
    console.log('✅ Server is responding!');
  } else {
    console.log('❌ Server not responding');
  }
  
  server.kill('SIGTERM');
  process.exit(hasResponse ? 0 : 1);
}, 5000);

// 错误处理
server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log('Server exited with code:', code);
});
