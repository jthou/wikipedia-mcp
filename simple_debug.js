import { spawn } from 'child_process';

console.log('Starting simple debug test...');

// 启动MCP服务器
const server = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let hasResponse = false;

// 监听输出
server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('STDOUT:', JSON.stringify(output));
  hasResponse = true;
});

server.stderr.on('data', (data) => {
  const output = data.toString();
  console.log('STDERR:', JSON.stringify(output));
});

server.on('error', (error) => {
  console.log('ERROR:', error);
});

server.on('close', (code) => {
  console.log(`Server exited with code: ${code}`);
  process.exit(hasResponse ? 0 : 1);
});

// 等待1秒后发送tools/list请求
setTimeout(() => {
  console.log('Sending tools/list request...');
  server.stdin.write('{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\n');
  
  // 等待3秒后结束
  setTimeout(() => {
    console.log('Killing server...');
    server.kill();
  }, 3000);
}, 1000);
