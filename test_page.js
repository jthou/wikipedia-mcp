import { spawn } from 'child_process';

console.log('Testing page retrieval...');

// 启动MCP服务器
const server = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseCount = 0;

// 监听输出
server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`Response ${++responseCount}:`, JSON.stringify(output));
});

server.stderr.on('data', (data) => {
  const output = data.toString();
  console.log('STDERR:', output);
});

server.on('close', (code) => {
  console.log(`Server exited with code: ${code}`);
});

// 发送页面获取请求
setTimeout(() => {
  console.log('Sending get_wikipedia_page request...');
  server.stdin.write('{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_wikipedia_page","arguments":{"wiki":"enwiki","title":"Python (programming language)"}}}\n');
  
  // 等待10秒后结束
  setTimeout(() => {
    console.log('Test complete, killing server...');
    server.kill();
  }, 10000);
}, 1000);
