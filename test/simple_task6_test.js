#!/usr/bin/env node
/**
 * 简化的任务6异常处理测试
 * 直接测试MCP服务器，不使用复杂的JSON-RPC通信
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 测试用例
const testCases = [
  {
    name: '无效wiki处理',
    input: '{"jsonrpc":"2.0","id":"1","method":"tools/call","params":{"name":"get_wikipedia_page","arguments":{"wiki":"invalidwiki","title":"Test"}}}',
    expectContains: ['Unknown wiki', '建议', '💡']
  },
  {
    name: '空标题处理', 
    input: '{"jsonrpc":"2.0","id":"2","method":"tools/call","params":{"name":"get_wikipedia_page","arguments":{"wiki":"enwiki","title":""}}}',
    expectContains: ['required', '建议', '💡']
  },
  {
    name: '页面不存在处理',
    input: '{"jsonrpc":"2.0","id":"3","method":"tools/call","params":{"name":"get_wikipedia_page","arguments":{"wiki":"enwiki","title":"NonExistentPageThatDefinitelyDoesNotExist12345"}}}',
    expectContains: ['does not exist', '建议', '💡']
  },
  {
    name: '搜索限制边界处理',
    input: '{"jsonrpc":"2.0","id":"4","method":"tools/call","params":{"name":"search_pages","arguments":{"wiki":"enwiki","query":"test","limit":0}}}',
    expectContains: ['must be between 1 and 50', '建议', '💡']
  }
];

let serverProcess;

async function runTest() {
  console.log('开始简化异常处理测试...\n');
  
  try {
    // 启动服务器
    console.log('启动MCP服务器...');
    const serverPath = path.resolve(__dirname, '../build/index.js');
    
    serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.dirname(serverPath)
    });

    console.log('✅ 服务器启动成功\n');

    let passedTests = 0;
    let totalTests = testCases.length;

    for (const testCase of testCases) {
      console.log(`=== 测试: ${testCase.name} ===`);
      
      try {
        const result = await runSingleTest(testCase);
        if (result.success) {
          console.log('  ✅ PASSED');
          passedTests++;
        } else {
          console.log('  ❌ FAILED');
          console.log(`  原因: ${result.reason}`);
          console.log(`  响应: ${result.response?.substring(0, 200)}...`);
        }
      } catch (error) {
        console.log('  ❌ FAILED');
        console.log(`  异常: ${error.message}`);
      }
      
      console.log('');
    }

    console.log('=== 测试总结 ===');
    console.log(`通过: ${passedTests}/${totalTests}`);
    console.log(`通过率: ${((passedTests/totalTests)*100).toFixed(1)}%`);

    if (passedTests === totalTests) {
      console.log('\n✅ Task 6 PASSED: 异常与边界处理功能正常');
      return true;
    } else {
      console.log('\n❌ Task 6 FAILED: 异常与边界处理需要改进');
      return false;
    }

  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

async function runSingleTest(testCase) {
  return new Promise((resolve) => {
    let responseData = '';
    let timeoutId;

    const onData = (data) => {
      responseData += data.toString();
      
      try {
        const lines = responseData.split('\n').filter(line => line.trim());
        for (const line of lines) {
          if (line.trim()) {
            const response = JSON.parse(line);
            if (response.id) {
              clearTimeout(timeoutId);
              serverProcess.stdout.removeListener('data', onData);
              
              // 检查响应是否包含预期内容
              const responseText = JSON.stringify(response);
              const hasExpectedContent = testCase.expectContains.every(expected => 
                responseText.includes(expected)
              );
              
              resolve({
                success: hasExpectedContent,
                reason: hasExpectedContent ? 'Success' : 'Missing expected content',
                response: responseText
              });
              return;
            }
          }
        }
      } catch (e) {
        // 继续等待更多数据
      }
    };

    serverProcess.stdout.on('data', onData);
    
    timeoutId = setTimeout(() => {
      serverProcess.stdout.removeListener('data', onData);
      resolve({
        success: false,
        reason: 'Timeout',
        response: responseData
      });
    }, 10000); // 10秒超时

    // 发送请求
    serverProcess.stdin.write(testCase.input + '\n');
  });
}

// 直接运行测试
runTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});