#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('Quick debug test for MCP server...');

const server = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let allOutput = '';

server.stdout.on('data', (data) => {
  allOutput += data.toString();
  console.log('STDOUT:', data.toString());
});

server.stderr.on('data', (data) => {
  allOutput += data.toString();
  console.log('STDERR:', data.toString());
});

// 发送工具列表请求
setTimeout(() => {
  console.log('Sending tools/list request...');
  const request = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  }) + '\n';
  server.stdin.write(request);
}, 1000);

// 发送quick_search请求  
setTimeout(() => {
  console.log('Sending quick_search request...');
  const request = JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: { 
      name: 'quick_search', 
      arguments: { wiki: 'enwiki', query: 'test', limit: 5 }
    }
  }) + '\n';
  server.stdin.write(request);
}, 2000);

setTimeout(() => {
  server.kill();
  console.log('\n=== COMPLETE OUTPUT ===');
  console.log(allOutput);
  
  const hasQuickSearch = allOutput.includes('quick_search');
  console.log('\nHas quick_search tool:', hasQuickSearch);
  
  process.exit(0);
}, 5000);