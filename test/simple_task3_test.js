import { spawn } from 'child_process';

console.log('Testing task 3: Verify list_wikis includes Wikipedia instances');

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
    console.log('✅ Task 3 PASSED: list_wikis correctly shows Wikipedia instances');
    process.exit(0);
  } else {
    console.log('❌ Task 3 FAILED: list_wikis does not show Wikipedia instances correctly');
    console.log('Output:', allOutput);
    process.exit(1);
  }
}, 5000);

// 发送list_wikis请求
setTimeout(() => {
  const request = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_wikis","arguments":{}}}\n';
  server.stdin.write(request);
}, 1000);
