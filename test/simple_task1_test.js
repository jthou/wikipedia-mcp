import { spawn } from 'child_process';

console.log('Testing task 1: Verify list_wikis tool functionality');

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
  const hasListWikisTool = allOutput.includes('"name":"list_wikis"');
  const hasEnwiki = allOutput.includes('enwiki');
  const hasZhwiki = allOutput.includes('zhwiki');
  const hasAvailableWikis = allOutput.includes('Available MediaWiki instances') || allOutput.includes('Available wikis');
  
  console.log('Analysis:');
  console.log('  list_wikis tool present:', hasListWikisTool ? '✅' : '❌');
  console.log('  enwiki found:', hasEnwiki ? '✅' : '❌');
  console.log('  zhwiki found:', hasZhwiki ? '✅' : '❌');
  console.log('  Available wikis response:', hasAvailableWikis ? '✅' : '❌');
  
  if (hasListWikisTool && hasEnwiki && hasZhwiki) {
    console.log('✅ Task 1 PASSED: list_wikis tool is available and shows Wikipedia instances');
    process.exit(0);
  } else {
    console.log('❌ Task 1 FAILED: list_wikis tool or Wikipedia instances not found');
    console.log('Full output:', allOutput);
    process.exit(1);
  }
}, 5000);

// 发送请求
setTimeout(() => {
  const requests = [
    '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\n',
    '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_wikis","arguments":{}}}\n'
  ];
  
  for (const request of requests) {
    server.stdin.write(request);
  }
}, 1000);
