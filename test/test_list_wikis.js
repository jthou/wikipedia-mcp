import { spawn } from 'child_process';

// 启动MCP服务器
const server = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let response = '';
let listToolsReceived = false;
let callToolReceived = false;

// 监听服务器的stdout
server.stdout.on('data', (data) => {
  const output = data.toString();
  response += output;
  
  // 检查是否收到了tools/list响应
  if (output.includes('"method":"tools/list"') || output.includes('"result":{"tools"')) {
    listToolsReceived = true;
  }
  
  // 检查是否收到了tools/call响应
  if (output.includes('"method":"tools/call"') || output.includes('Available MediaWiki instances')) {
    callToolReceived = true;
  }
  
  // 检查是否收到了完整的响应
  if (listToolsReceived && callToolReceived) {
    // 检查响应中是否包含list_wikis工具和Wikipedia wiki
    if (response.includes('list_wikis') && response.includes('enwiki') && response.includes('zhwiki')) {
      console.log('✅ Task 1 PASSED: list_wikis tool is available and shows Wikipedia instances');
    } else {
      console.log('❌ Task 1 FAILED: list_wikis tool or Wikipedia instances not found in response');
    }
    console.log('Response:', response);
    
    // 关闭服务器
    server.kill();
  }
});

// 监听服务器的stderr
server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

// 向服务器发送请求
setTimeout(() => {
  const listToolsRequest = {"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}};
  const callToolRequest = {"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_wikis","arguments":{}}};
  
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  server.stdin.write(JSON.stringify(callToolRequest) + '\n');
}, 1000);

// 设置超时，如果5秒内没有收到响应则关闭服务器
setTimeout(() => {
  if (!listToolsReceived || !callToolReceived) {
    console.log('❌ Task 1 FAILED: Incomplete response received within 5 seconds');
    console.log('Response so far:', response);
    server.kill();
  }
}, 5000);