import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Testing task 4: Environment configuration and proxy support');

// 测试不同环境配置的用例
const testEnvironments = [
  {
    name: '默认环境配置测试',
    envFile: null, // 不使用.env文件
    expectedBehavior: '使用默认配置连接Wikipedia'
  },
  {
    name: '自定义环境配置测试',
    envFile: 'test_custom.env',
    envContent: [
      'WIKIPEDIA_EN_API=https://en.wikipedia.org/w/api.php',
      'WIKIPEDIA_ZH_API=https://zh.wikipedia.org/w/api.php',
      'USER_AGENT=Test-Wikipedia-MCP-Server/1.0',
      'REQUEST_TIMEOUT=15000'
    ].join('\n'),
    expectedBehavior: '使用自定义配置连接Wikipedia'
  },
  {
    name: '代理环境配置测试',
    envFile: 'test_proxy.env', 
    envContent: [
      'WIKIPEDIA_EN_API=https://en.wikipedia.org/w/api.php',
      'WIKIPEDIA_ZH_API=https://zh.wikipedia.org/w/api.php',
      '# HTTP_PROXY=http://proxy.example.com:8080',
      '# HTTPS_PROXY=https://proxy.example.com:8080',
      'USER_AGENT=Proxy-Test-Wikipedia-MCP-Server/1.0'
    ].join('\n'),
    expectedBehavior: '模拟代理环境配置'
  }
];

let currentTestIndex = 0;
let passedTests = 0;

// 运行单个测试环境
function runSingleTest(testEnv) {
  return new Promise((resolve) => {
    console.log(`\n=== 运行测试: ${testEnv.name} ===`);
    
    // 创建测试用的.env文件（如果需要）
    if (testEnv.envFile && testEnv.envContent) {
      fs.writeFileSync(testEnv.envFile, testEnv.envContent);
      console.log(`创建测试环境文件: ${testEnv.envFile}`);
    }

    // 启动MCP服务器
    const serverArgs = ['build/index.js'];
    if (testEnv.envFile) {
      serverArgs.push('-f', testEnv.envFile);
    }
    
    const server = spawn('node', serverArgs, {
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

    // 设置测试超时
    setTimeout(() => {
      server.kill();
      
      // 清理测试文件
      if (testEnv.envFile && fs.existsSync(testEnv.envFile)) {
        fs.unlinkSync(testEnv.envFile);
      }
      
      // 检查测试结果
      const hasListWikisTool = allOutput.includes('"name":"list_wikipedia_wikis"');
      const hasGetPageTool = allOutput.includes('"name":"get_wikipedia_page"');
      const serverStarted = allOutput.includes('list_wikipedia_wikis') || hasListWikisTool;
      
      console.log(`  工具可用性检查:`);
      console.log(`    list_wikipedia_wikis: ${hasListWikisTool ? '✅' : '❌'}`);
      console.log(`    get_wikipedia_page: ${hasGetPageTool ? '✅' : '❌'}`);
      console.log(`    服务器启动: ${serverStarted ? '✅' : '❌'}`);
      
      const testPassed = hasListWikisTool && hasGetPageTool && serverStarted;
      
      if (testPassed) {
        console.log(`  ✅ ${testEnv.name} - PASSED`);
        passedTests++;
      } else {
        console.log(`  ❌ ${testEnv.name} - FAILED`);
        console.log(`    输出片段: ${allOutput.substring(0, 200)}...`);
      }
      
      resolve(testPassed);
    }, 5000);

    // 发送测试请求
    setTimeout(() => {
      const requests = [
        '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\n',
        '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_wikipedia_wikis","arguments":{}}}\n'
      ];
      
      for (const request of requests) {
        server.stdin.write(request);
      }
    }, 1000);
  });
}

// 运行所有测试
async function runAllTests() {
  console.log('开始环境配置和代理支持测试...');
  
  for (const testEnv of testEnvironments) {
    await runSingleTest(testEnv);
    currentTestIndex++;
  }
  
  // 额外测试：验证原生fetch API使用
  console.log('\n=== 验证实现技术 ===');
  const indexContent = fs.readFileSync('src/index.ts', 'utf8');
  const wikiClientContent = fs.existsSync('src/wiki-client.ts') ? fs.readFileSync('src/wiki-client.ts', 'utf8') : '';
  
  const usesNodeMW = indexContent.includes('nodemw') || wikiClientContent.includes('nodemw');
  const usesFetch = indexContent.includes('fetch') || wikiClientContent.includes('fetch');
  const usesProxy = wikiClientContent.includes('HttpsProxyAgent') || wikiClientContent.includes('HttpProxyAgent');
  const usesDotenv = indexContent.includes('dotenv') && indexContent.includes('config');
  
  console.log(`  移除nodemw依赖: ${!usesNodeMW ? '✅' : '❌'}`);
  console.log(`  使用原生fetch: ${usesFetch ? '✅' : '❌'}`);
  console.log(`  支持代理配置: ${usesProxy ? '✅' : '❌'}`);
  console.log(`  集成dotenv: ${usesDotenv ? '✅' : '❌'}`);
  
  const techCheckPassed = !usesNodeMW && usesFetch && usesProxy && usesDotenv;
  
  if (techCheckPassed) {
    passedTests++;
  }
  
  // 总结测试结果
  console.log(`\n=== Task 4 测试总结 ===`);
  console.log(`通过测试: ${passedTests}/${testEnvironments.length + 1}`);
  
  const allTestsPassed = passedTests === (testEnvironments.length + 1);
  
  if (allTestsPassed) {
    console.log('✅ Task 4 PASSED: 环境配置和代理支持功能正常');
    process.exit(0);
  } else {
    console.log('❌ Task 4 FAILED: 部分功能存在问题');
    process.exit(1);
  }
}

// 启动测试
runAllTests().catch(err => {
  console.error('测试执行错误:', err);
  process.exit(1);
});
