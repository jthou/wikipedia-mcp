#!/bin/bash

# Task 6: 异常与边界处理测试脚本
# 验证各种异常和边界情况的处理效果

echo "Testing task 6: Exception and boundary handling"

# 构建项目
echo "Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "开始异常与边界处理测试..."

# 创建临时测试脚本
cat > /tmp/task6_test.js << 'EOF'
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = process.cwd(); // 使用当前工作目录

let testResults = [];

async function runDirectTest() {
  console.log('开始直接异常处理功能测试...\n');
  
  const serverPath = path.resolve(projectRoot, 'build/index.js');
  console.log(`使用服务器: ${serverPath}`);
  
  const serverProcess = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // 测试用例
  const tests = [
    {
      name: '无效wiki测试',
      request: '{"jsonrpc":"2.0","id":"1","method":"tools/call","params":{"name":"get_wikipedia_page","arguments":{"wiki":"invalidwiki","title":"Test"}}}',
      expectedKeywords: ['Unknown wiki', '建议', '指定的 Wikipedia']
    },
    {
      name: '空标题测试',
      request: '{"jsonrpc":"2.0","id":"2","method":"tools/call","params":{"name":"get_wikipedia_page","arguments":{"wiki":"enwiki","title":""}}}',
      expectedKeywords: ['参数', '建议', '必需']
    },
    {
      name: '搜索限制边界测试',
      request: '{"jsonrpc":"2.0","id":"3","method":"tools/call","params":{"name":"search_pages","arguments":{"wiki":"enwiki","query":"test","limit":0}}}',
      expectedKeywords: ['must be between 1 and 50', '建议']
    },
    {
      name: '空搜索查询测试',
      request: '{"jsonrpc":"2.0","id":"4","method":"tools/call","params":{"name":"search_pages","arguments":{"wiki":"enwiki","query":""}}}',
      expectedKeywords: ['参数', '建议', '必需']
    },
    {
      name: '页面不存在测试',
      request: '{"jsonrpc":"2.0","id":"5","method":"tools/call","params":{"name":"get_wikipedia_page","arguments":{"wiki":"enwiki","title":"XyzAbcNonExistentPage"}}}',
      expectedKeywords: ['does not exist', '建议', '抱歉']
    }
  ];

  for (const test of tests) {
    console.log(`\n=== ${test.name} ===`);
    
    const result = await testSingleCase(serverProcess, test);
    testResults.push(result);
    
    if (result.passed) {
      console.log('✅ PASSED - 异常处理正常，包含友好提示');
    } else {
      console.log('❌ FAILED - 异常处理需要改进');
      console.log(`响应片段: ${result.response.substring(0, 150)}...`);
    }
  }

  serverProcess.kill();
  
  // 总结
  const passedCount = testResults.filter(r => r.passed).length;
  const totalCount = testResults.length;
  
  console.log(`\n=== 异常处理测试总结 ===`);
  console.log(`通过: ${passedCount}/${totalCount}`);
  console.log(`通过率: ${(passedCount/totalCount*100).toFixed(1)}%`);
  
  // 分析错误处理质量
  const responsesWithSuggestions = testResults.filter(r => 
    r.response.includes('建议') || r.response.includes('💡')
  ).length;
  
  const responsesWithFriendlyMessages = testResults.filter(r => 
    r.response.includes('抱歉') || r.response.includes('请') || r.response.includes('您')
  ).length;
  
  console.log(`\n=== 错误处理质量分析 ===`);
  console.log(`包含建议的响应: ${responsesWithSuggestions}/${totalCount}`);
  console.log(`友好错误提示: ${responsesWithFriendlyMessages}/${totalCount}`);
  
  if (passedCount === totalCount) {
    console.log('\n✅ Task 6 PASSED: 异常与边界处理功能正常');
    return true;
  } else {
    console.log('\n❌ Task 6 FAILED: 异常与边界处理需要改进');
    return false;
  }
}

function testSingleCase(serverProcess, testCase) {
  return new Promise((resolve) => {
    let responseData = '';
    let timeoutId;
    let dataListener;

    dataListener = (data) => {
      responseData += data.toString();
      
      // 检查是否包含完整的JSON响应
      if (responseData.includes('"result"') || responseData.includes('"error"')) {
        clearTimeout(timeoutId);
        serverProcess.stdout.removeListener('data', dataListener);
        
        // 分析响应
        const hasExpectedKeywords = testCase.expectedKeywords.some(keyword => 
          responseData.toLowerCase().includes(keyword.toLowerCase())
        );
        
        const hasFriendlyMessage = responseData.includes('建议') || 
                                  responseData.includes('💡') ||
                                  responseData.includes('抱歉') ||
                                  responseData.includes('请');
        
        resolve({
          name: testCase.name,
          passed: hasExpectedKeywords && hasFriendlyMessage,
          response: responseData,
          hasExpectedKeywords,
          hasFriendlyMessage
        });
      }
    };

    serverProcess.stdout.on('data', dataListener);
    
    timeoutId = setTimeout(() => {
      if (dataListener) {
        serverProcess.stdout.removeListener('data', dataListener);
      }
      resolve({
        name: testCase.name,
        passed: false,
        response: responseData || 'No response received',
        hasExpectedKeywords: false,
        hasFriendlyMessage: false,
        error: 'Timeout'
      });
    }, 12000); // 12秒超时

    // 发送请求
    serverProcess.stdin.write(testCase.request + '\n');
  });
}

// 运行测试
runDirectTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});
EOF

# 运行测试并清理
node /tmp/task6_test.js
TEST_RESULT=$?
rm /tmp/task6_test.js

# 检查测试结果
if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ Task 6 PASSED: 异常与边界处理功能正常"
else
    echo "❌ Task 6 FAILED: 异常与边界处理需要改进"
    exit 1
fi