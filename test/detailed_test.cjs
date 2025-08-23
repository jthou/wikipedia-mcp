#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🔍 Detailed Task 4 Test');

const serverPath = path.join(__dirname, '..', 'build', 'index.js');

// 启动服务器
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let hasErrors = false;

// 监听输出
server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('📤 Server output:', output);
});

server.stderr.on('data', (data) => {
  const output = data.toString();
  console.log('🔍 Server stderr:', output);
});

// 发送测试请求
setTimeout(() => {
  console.log('📤 Testing get_wikipedia_page with Apple...');
  const request = JSON.stringify({
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_wikipedia_page",
      "arguments": {
        "wiki": "enwiki",
        "title": "Apple"
      }
    }
  }) + '\n';
  
  server.stdin.write(request);
}, 1000);

// 10秒后检查结果并清理
setTimeout(() => {
  console.log('🛑 Test complete, stopping server...');
  
  server.kill('SIGTERM');
  
  // 检查是否创建了目录
  const fs = require('fs');
  const baseDir = path.join(__dirname, '..');
  
  console.log('\n📂 Checking for output directories...');
  
  ['.wikipedia_en', '.wikipedia_zh'].forEach(dir => {
    const fullPath = path.join(baseDir, dir);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${dir} exists`);
      const files = fs.readdirSync(fullPath);
      console.log(`   Files: ${files.join(', ')}`);
    } else {
      console.log(`❌ ${dir} not found`);
    }
  });
  
  process.exit(hasErrors ? 1 : 0);
}, 10000);

// 错误处理
server.on('error', (err) => {
  console.error('Server error:', err);
  hasErrors = true;
});

server.on('exit', (code) => {
  console.log('Server exited with code:', code);
  if (code !== 0) hasErrors = true;
});
