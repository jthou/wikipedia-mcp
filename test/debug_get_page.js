import { spawn } from 'child_process';

console.log('Simple debug test for get_page tool');

// 启动MCP服务器
const server = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let allOutput = '';

// 监听输出
server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('STDOUT:', output);
  allOutput += output;
});

server.stderr.on('data', (data) => {
  const output = data.toString();
  console.log('STDERR:', output);
  allOutput += output;
});

// 设置5秒超时
setTimeout(() => {
  console.log('Killing server after timeout');
  server.kill();
  process.exit(0);
}, 5000);

// 发送单个测试请求
setTimeout(() => {
  console.log('Sending get_page request...');
  const request = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_page",
      "arguments": {
        "wiki": "enwiki",
        "title": "Test"
      }
    }
  };
  server.stdin.write(JSON.stringify(request) + '\n');
}, 1000);
