import { spawn } from 'child_process';

console.log('Testing task 2: Verify removed tools are no longer available');

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

// 设置5秒超时
setTimeout(() => {
  server.kill();
  
  console.log('Full server output:');
  console.log(allOutput);
  console.log('\n=== Analysis ===');
  
  // 分析输出
  const hasListWikis = allOutput.includes('"name":"list_wikis"');
  const hasWikiOperation = allOutput.includes('"name":"wiki_operation"');
  const hasGetPage = allOutput.includes('"name":"get_page"');
  const hasSearchPages = allOutput.includes('"name":"search_pages"');
  
  const hasUpdatePage = allOutput.includes('"name":"update_page"');
  const hasUploadFile = allOutput.includes('"name":"upload_file"');
  const hasUploadFromClipboard = allOutput.includes('"name":"upload_from_clipboard"');
  
  const updatePageError = allOutput.includes('Unknown tool: update_page');
  const uploadFileError = allOutput.includes('Unknown tool: upload_file');
  const uploadFromClipboardError = allOutput.includes('Unknown tool: upload_from_clipboard');
  
  console.log('Expected tools in list:');
  console.log('  list_wikis:', hasListWikis ? '✅' : '❌');
  console.log('  wiki_operation:', hasWikiOperation ? '✅' : '❌');
  console.log('  get_page:', hasGetPage ? '✅' : '❌');
  console.log('  search_pages:', hasSearchPages ? '✅' : '❌');
  
  console.log('Removed tools should NOT be in list:');
  console.log('  update_page:', hasUpdatePage ? '❌ STILL PRESENT' : '✅ REMOVED');
  console.log('  upload_file:', hasUploadFile ? '❌ STILL PRESENT' : '✅ REMOVED');
  console.log('  upload_from_clipboard:', hasUploadFromClipboard ? '❌ STILL PRESENT' : '✅ REMOVED');
  
  console.log('Error responses for removed tools:');
  console.log('  update_page error:', updatePageError ? '✅' : '❌');
  console.log('  upload_file error:', uploadFileError ? '✅' : '❌');
  console.log('  upload_from_clipboard error:', uploadFromClipboardError ? '✅' : '❌');
  
  const allExpectedPresent = hasListWikis && hasWikiOperation && hasGetPage && hasSearchPages;
  const allRemovedAbsent = !hasUpdatePage && !hasUploadFile && !hasUploadFromClipboard;
  const allErrorsPresent = updatePageError && uploadFileError && uploadFromClipboardError;
  
  if (allExpectedPresent && allRemovedAbsent && allErrorsPresent) {
    console.log('\n✅ Task 2 PASSED: All removed tools are properly removed');
    process.exit(0);
  } else {
    console.log('\n❌ Task 2 FAILED: Some issues detected');
    process.exit(1);
  }
}, 5000);

// 发送请求
setTimeout(() => {
  const requests = [
    '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\n',
    '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"update_page","arguments":{}}}\n',
    '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"upload_file","arguments":{}}}\n',
    '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"upload_from_clipboard","arguments":{}}}\n'
  ];
  
  for (const request of requests) {
    server.stdin.write(request);
  }
}, 1000);
