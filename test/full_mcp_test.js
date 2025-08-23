import { spawn } from 'child_process';

console.log('Full MCP protocol test for get_page tool');

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

// 设置10秒超时
setTimeout(() => {
  console.log('Killing server after timeout');
  server.kill();
  process.exit(0);
}, 10000);

// 按MCP协议发送请求
setTimeout(() => {
  console.log('1. Sending initialize request...');
  const initRequest = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  };
  server.stdin.write(JSON.stringify(initRequest) + '\n');
}, 1000);

setTimeout(() => {
  console.log('2. Sending initialized notification...');
  const initializedNotification = {
    "jsonrpc": "2.0",
    "method": "notifications/initialized"
  };
  server.stdin.write(JSON.stringify(initializedNotification) + '\n');
}, 2000);

setTimeout(() => {
  console.log('3. Sending tools/list request...');
  const toolsListRequest = {
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  };
  server.stdin.write(JSON.stringify(toolsListRequest) + '\n');
}, 3000);

setTimeout(() => {
  console.log('4. Sending get_page request...');
  const getPageRequest = {
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get_page",
      "arguments": {
        "wiki": "enwiki",
        "title": "Test"
      }
    }
  };
  server.stdin.write(JSON.stringify(getPageRequest) + '\n');
}, 4000);
