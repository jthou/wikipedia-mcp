#!/usr/bin/env node
/**
 * 调试搜索限制验证问题
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

async function testSearchLimit() {
  console.log('调试搜索限制验证...\n');
  
  const serverPath = path.resolve(projectRoot, 'build/index.js');
  const serverProcess = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // 等待服务器启动
  await new Promise(resolve => setTimeout(resolve, 2000));

  const tests = [
    {
      name: '限制为0',
      request: '{"jsonrpc":"2.0","id":"1","method":"tools/call","params":{"name":"search_pages","arguments":{"wiki":"enwiki","query":"test","limit":0}}}',
    },
    {
      name: '限制为-1',
      request: '{"jsonrpc":"2.0","id":"2","method":"tools/call","params":{"name":"search_pages","arguments":{"wiki":"enwiki","query":"test","limit":-1}}}',
    },
    {
      name: '限制为100',
      request: '{"jsonrpc":"2.0","id":"3","method":"tools/call","params":{"name":"search_pages","arguments":{"wiki":"enwiki","query":"test","limit":100}}}',
    }
  ];

  for (const test of tests) {
    console.log(`=== ${test.name} ===`);
    
    const result = await runTest(serverProcess, test);
    console.log(`响应: ${result.substring(0, 300)}...`);
    console.log('');
  }

  serverProcess.kill();
}

function runTest(serverProcess, test) {
  return new Promise((resolve) => {
    let responseData = '';
    let timeoutId;
    let dataListener;

    dataListener = (data) => {
      responseData += data.toString();
      
      // 检查是否有完整响应
      if (responseData.includes('"result"') || responseData.includes('"error"')) {
        clearTimeout(timeoutId);
        if (dataListener) {
          serverProcess.stdout.removeListener('data', dataListener);
        }
        resolve(responseData);
      }
    };

    serverProcess.stdout.on('data', dataListener);
    serverProcess.stderr.on('data', dataListener);
    
    timeoutId = setTimeout(() => {
      if (dataListener) {
        serverProcess.stdout.removeListener('data', dataListener);
        serverProcess.stderr.removeListener('data', dataListener);
      }
      resolve(responseData || 'No response received');
    }, 8000);

    // 发送请求
    serverProcess.stdin.write(test.request + '\n');
  });
}

testSearchLimit().catch(console.error);