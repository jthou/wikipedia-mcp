import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Testing task 4: Verify Wikipedia article scraping functionality');

// 启动MCP服务器
const server = spawn('node', ['./build/index.js'], {
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

// 测试用例
const testCases = [
  {
    name: 'get_wikipedia_page工具测试 - 获取English Wikipedia页面',
    request: {
      "jsonrpc": "2.0",
      "id": 1,
      "method": "tools/call",
      "params": {
        "name": "get_wikipedia_page",
        "arguments": {
          "wiki": "enwiki",
          "title": "Machine Learning"
        }
      }
    },
    expect: (output) => {
      return output.includes('Machine learning') || output.includes('artificial intelligence');
    }
  },
  {
    name: 'get_wikipedia_page工具测试 - 获取Chinese Wikipedia页面',
    request: {
      "jsonrpc": "2.0",
      "id": 2,
      "method": "tools/call",
      "params": {
        "name": "get_wikipedia_page",
        "arguments": {
          "wiki": "zhwiki",
          "title": "机器学习"
        }
      }
    },
    expect: (output) => {
      return output.includes('机器学习') || output.includes('人工智能');
    }
  },
  {
    name: 'wiki_wikipedia_operation工具测试 - get操作',
    request: {
      "jsonrpc": "2.0",
      "id": 3,
      "method": "tools/call",
      "params": {
        "name": "wiki_wikipedia_operation",
        "arguments": {
          "wiki": "enwiki",
          "action": "get",
          "title": "Artificial Intelligence"
        }
      }
    },
    expect: (output) => {
      return output.includes('artificial intelligence') || output.includes('AI');
    }
  },
  {
    name: '页面不存在测试',
    request: {
      "jsonrpc": "2.0",
      "id": 4,
      "method": "tools/call",
      "params": {
        "name": "get_wikipedia_page",
        "arguments": {
          "wiki": "enwiki",
          "title": "NonExistentPageThatShouldNotExist123456"
        }
      }
    },
    expect: (output) => {
      // 应该有错误处理或空内容返回
      return output.includes('error') || output.includes('not found') || output.includes('""');
    }
  }
];

let completedTests = 0;
let passedTests = 0;

// 设置10秒超时进行分析
setTimeout(() => {
  server.kill();
  
  console.log('\n=== Task 4 Test Results ===');
  
  // 基本功能检查
  const hasGetPageTool = allOutput.includes('"name":"get_wikipedia_page"');
  const hasWikiOperationTool = allOutput.includes('"name":"wiki_wikipedia_operation"');
  
  console.log('Basic tool availability:');
  console.log('  get_wikipedia_page tool present:', hasGetPageTool ? '✅' : '❌');
  console.log('  wiki_wikipedia_operation tool present:', hasWikiOperationTool ? '✅' : '❌');
  
  // 分析测试结果
  for (const testCase of testCases) {
    const testPassed = testCase.expect(allOutput);
    console.log(`  ${testCase.name}:`, testPassed ? '✅' : '❌');
    if (testPassed) passedTests++;
    completedTests++;
  }
  
  console.log(`\nTest Summary: ${passedTests}/${completedTests} tests passed`);
  
  // 检查本地保存功能
  const expectedDirs = ['.wikipedia_en', '.wikipedia_zh'];
  let savedFilesFound = false;
  
  console.log('\nLocal save mechanism check:');
  for (const dir of expectedDirs) {
    if (fs.existsSync(dir)) {
      console.log(`  Directory ${dir}:`, '✅ exists');
      const files = fs.readdirSync(dir);
      if (files.length > 0) {
        console.log(`    Files found: ${files.join(', ')}`);
        savedFilesFound = true;
      }
    } else {
      console.log(`  Directory ${dir}:`, '❌ not found');
    }
  }
  
  const allBasicTestsPassed = hasGetPageTool && hasWikiOperationTool;
  const majorityTestsPassed = passedTests >= Math.ceil(testCases.length * 0.5); // 至少50%通过
  
  if (allBasicTestsPassed && majorityTestsPassed) {
    console.log('\n✅ Task 4 PASSED: Wikipedia article scraping functionality works');
    process.exit(0);
  } else {
    console.log('\n❌ Task 4 FAILED: Some functionality issues detected');
    console.log('\nFull server output for debugging:');
    console.log(allOutput);
    process.exit(1);
  }
}, 10000);

// 发送测试请求
setTimeout(() => {
  console.log('Sending test requests...');
  
  // 先发送tools/list请求
  const listRequest = '{"jsonrpc":"2.0","id":0,"method":"tools/list","params":{}}\n';
  server.stdin.write(listRequest);
  
  // 逐个发送测试请求
  testCases.forEach((testCase, index) => {
    setTimeout(() => {
      console.log(`Sending: ${testCase.name}`);
      server.stdin.write(JSON.stringify(testCase.request) + '\n');
    }, (index + 1) * 1000); // 每秒发送一个请求
  });
}, 1000);
