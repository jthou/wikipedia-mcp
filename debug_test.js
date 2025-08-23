import { spawn } from 'child_process';

console.log('Starting debug test...');

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

server.on('close', (code) => {
  console.log(`Server exited with code: ${code}`);
});

// 等待启动后发送请求
setTimeout(() => {
  console.log('Sending tools/list request...');
  server.stdin.write('{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\n');
  
  setTimeout(() => {
    console.log('Sending get_wikipedia_page request...');
    server.stdin.write('{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_wikipedia_page","arguments":{"wiki":"enwiki","title":"Wikipedia"}}}\n');
    
    setTimeout(() => {
      console.log('Killing server...');
      server.kill();
    }, 5000);
  }, 1000);
}, 1000);
