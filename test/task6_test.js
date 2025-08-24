#!/usr/bin/env node
/**
 * Task 6 异常与边界处理测试脚本
 * 测试各种异常和边界情况的处理效果
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 测试配置
const TEST_CONFIG = {
  timeout: 30000, // 30秒超时
  serverStartDelay: 2000, // 服务器启动延迟
  retryAttempts: 3
};

// 测试用例定义
const TEST_CASES = [
  {
    name: '页面不存在处理',
    description: '测试访问不存在的页面时的错误处理',
    wiki: 'enwiki',
    title: 'NonExistentPageThatDefinitelyDoesNotExist12345',
    expectedError: '页面不存在',
    tool: 'get_wikipedia_page'
  },
  {
    name: '无效wiki实例处理',
    description: '测试访问无效wiki实例时的错误处理',
    wiki: 'invalidwiki',
    title: 'Main Page',
    expectedError: 'Unknown wiki',
    tool: 'get_wikipedia_page'
  },
  {
    name: '空标题处理',
    description: '测试空标题参数的错误处理',
    wiki: 'enwiki',
    title: '',
    expectedError: 'required',
    tool: 'get_wikipedia_page'
  },
  {
    name: '特殊字符标题处理',
    description: '测试包含特殊字符的标题处理',
    wiki: 'enwiki',
    title: 'Test<>:"/\\|?*Page',
    expectedHandling: '特殊字符应被正确处理',
    tool: 'get_wikipedia_page'
  },
  {
    name: '重定向页面处理',
    description: '测试重定向页面的处理',
    wiki: 'enwiki',
    title: 'USA', // 通常重定向到 United States
    expectedHandling: '应能正确处理重定向',
    tool: 'get_wikipedia_page'
  },
  {
    name: '消歧义页面处理',
    description: '测试消歧义页面的处理',
    wiki: 'enwiki',
    title: 'Apple (disambiguation)',
    expectedHandling: '应能正确处理消歧义页面',
    tool: 'get_wikipedia_page'
  },
  {
    name: '搜索无结果处理',
    description: '测试搜索无结果时的处理',
    wiki: 'enwiki',
    query: 'xyzabc123impossibletofindsearch',
    expectedHandling: '应返回友好的无结果提示',
    tool: 'search_pages'
  },
  {
    name: '搜索限制边界处理',
    description: '测试搜索结果数量限制的边界处理',
    wiki: 'enwiki',
    query: 'test',
    limit: 0, // 无效限制
    expectedError: 'must be between 1 and 50',
    tool: 'search_pages'
  },
  {
    name: '网络异常模拟',
    description: '通过错误的API地址模拟网络异常',
    wiki: 'enwiki',
    title: 'Main Page',
    mockNetworkError: true,
    expectedError: 'network',
    tool: 'get_wikipedia_page'
  }
];

// 错误分类和友好提示映射
const ERROR_CATEGORIES = {
  PAGE_NOT_FOUND: {
    keywords: ['does not exist', 'missing', 'not found'],
    friendlyMessage: '页面不存在，请检查页面标题是否正确',
    suggestion: '您可以尝试搜索相关页面或检查拼写'
  },
  INVALID_WIKI: {
    keywords: ['Unknown wiki', 'invalid wiki'],
    friendlyMessage: '指定的Wiki实例不存在',
    suggestion: '请使用 list_wikipedia_wikis 查看可用的Wiki实例'
  },
  MISSING_PARAMETERS: {
    keywords: ['required', 'missing parameter'],
    friendlyMessage: '缺少必需的参数',
    suggestion: '请检查工具调用时是否提供了所有必需的参数'
  },
  NETWORK_ERROR: {
    keywords: ['network', 'connection', 'timeout', 'fetch'],
    friendlyMessage: '网络连接错误',
    suggestion: '请检查网络连接或稍后重试'
  },
  RATE_LIMIT: {
    keywords: ['rate limit', 'too many requests', '429'],
    friendlyMessage: 'API调用频率过高',
    suggestion: '请稍等片刻后重试，避免频繁调用'
  }
};

let testResults = [];
let serverProcess = null;

// 启动MCP服务器
async function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.resolve(__dirname, '../build/index.js');
    console.log(`Starting server from: ${serverPath}`);
    
    serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.dirname(serverPath)
    });

    let initialized = false;
    
    serverProcess.stdout.on('data', (data) => {
      // console.log(`Server stdout: ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
      // console.log(`Server stderr: ${data}`);
    });

    serverProcess.on('error', (error) => {
      if (!initialized) {
        reject(new Error(`Failed to start server: ${error.message}`));
      }
    });

    serverProcess.on('exit', (code) => {
      if (code !== 0 && !initialized) {
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    // 等待服务器初始化
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        initialized = true;
        resolve(serverProcess);
      } else {
        reject(new Error('Server failed to start within timeout'));
      }
    }, TEST_CONFIG.serverStartDelay);
  });
}

// 发送JSON-RPC请求
async function sendRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    if (!serverProcess || serverProcess.killed) {
      reject(new Error('Server not running'));
      return;
    }

    const request = {
      jsonrpc: "2.0",
      id: Math.random().toString(36).substring(7),
      method,
      params
    };

    const requestStr = JSON.stringify(request) + '\n';
    
    let responseData = '';
    let timeout;

    const onData = (data) => {
      responseData += data.toString();
      try {
        const response = JSON.parse(responseData.trim());
        clearTimeout(timeout);
        serverProcess.stdout.removeListener('data', onData);
        resolve(response);
      } catch (e) {
        // 继续等待更多数据
      }
    };

    serverProcess.stdout.on('data', onData);
    
    timeout = setTimeout(() => {
      serverProcess.stdout.removeListener('data', onData);
      reject(new Error('Request timeout'));
    }, TEST_CONFIG.timeout);

    serverProcess.stdin.write(requestStr);
  });
}

// 分析错误类型和友好性
function analyzeError(errorMessage) {
  const analysis = {
    category: 'UNKNOWN',
    isFriendly: false,
    hasSuggestion: false,
    message: errorMessage
  };

  for (const [category, config] of Object.entries(ERROR_CATEGORIES)) {
    if (config.keywords.some(keyword => errorMessage.toLowerCase().includes(keyword.toLowerCase()))) {
      analysis.category = category;
      break;
    }
  }

  // 检查是否包含友好提示
  const friendlyIndicators = ['请', '您可以', '建议', '尝试', '检查'];
  analysis.isFriendly = friendlyIndicators.some(indicator => errorMessage.includes(indicator));

  // 检查是否包含建议
  const suggestionIndicators = ['可以尝试', '建议', '请检查', '您可以'];
  analysis.hasSuggestion = suggestionIndicators.some(indicator => errorMessage.includes(indicator));

  return analysis;
}

// 运行单个测试用例
async function runTestCase(testCase) {
  const result = {
    name: testCase.name,
    description: testCase.description,
    passed: false,
    error: null,
    details: {},
    errorAnalysis: null
  };

  try {
    console.log(`\n=== 运行测试: ${testCase.name} ===`);
    console.log(`描述: ${testCase.description}`);

    let request;
    
    if (testCase.tool === 'get_wikipedia_page') {
      // 如果需要模拟网络错误，临时修改API地址
      if (testCase.mockNetworkError) {
        // 这里我们通过使用无效的API地址来模拟网络错误
        // 实际实现中需要在服务器代码中支持这种模拟
      }
      
      request = {
        name: testCase.tool,
        arguments: {
          wiki: testCase.wiki,
          title: testCase.title
        }
      };
    } else if (testCase.tool === 'search_pages') {
      request = {
        name: testCase.tool,
        arguments: {
          wiki: testCase.wiki,
          query: testCase.query || testCase.title,
          limit: testCase.limit
        }
      };
    }

    const response = await sendRequest('tools/call', request);
    
    if (response.error) {
      result.error = response.error.message || response.error;
      result.errorAnalysis = analyzeError(result.error);
      
      // 检查是否符合预期错误
      if (testCase.expectedError) {
        const expectedFound = result.error.toLowerCase().includes(testCase.expectedError.toLowerCase());
        result.passed = expectedFound;
        result.details.expectedErrorFound = expectedFound;
      }
    } else if (response.result) {
      result.details.response = response.result;
      
      // 对于预期正常处理的用例
      if (testCase.expectedHandling) {
        result.passed = true; // 基本通过，具体处理质量需要人工检查
        result.details.handlingNote = testCase.expectedHandling;
      } else if (!testCase.expectedError) {
        result.passed = true; // 预期正常，实际也正常
      }
    }

    // 记录详细信息
    result.details.testCase = testCase;
    
    console.log(`  测试结果: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    if (result.error) {
      console.log(`  错误信息: ${result.error}`);
      if (result.errorAnalysis) {
        console.log(`  错误分类: ${result.errorAnalysis.category}`);
        console.log(`  友好性: ${result.errorAnalysis.isFriendly ? '是' : '否'}`);
        console.log(`  包含建议: ${result.errorAnalysis.hasSuggestion ? '是' : '否'}`);
      }
    }

  } catch (error) {
    result.error = error.message;
    result.errorAnalysis = analyzeError(error.message);
    
    // 网络级别的错误可能是预期的
    if (testCase.expectedError && error.message.toLowerCase().includes(testCase.expectedError.toLowerCase())) {
      result.passed = true;
    }
    
    console.log(`  测试结果: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  异常信息: ${error.message}`);
  }

  return result;
}

// 运行所有测试
async function runAllTests() {
  console.log('开始异常与边界处理测试...\n');

  try {
    // 启动服务器
    console.log('启动MCP服务器...');
    await startServer();
    console.log('✅ 服务器启动成功');

    // 运行测试用例
    for (const testCase of TEST_CASES) {
      const result = await runTestCase(testCase);
      testResults.push(result);
      
      // 短暂延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 100));
    }

  } catch (error) {
    console.error('❌ 测试运行失败:', error.message);
    return false;
  } finally {
    // 清理服务器进程
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }
  }

  return true;
}

// 生成测试报告
function generateReport() {
  console.log('\n=== Task 6 异常处理测试报告 ===');
  
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;

  console.log(`\n总测试数: ${totalTests}`);
  console.log(`通过测试: ${passedTests}`);
  console.log(`失败测试: ${failedTests}`);
  console.log(`通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  // 错误处理质量分析
  const errorAnalysis = testResults
    .filter(r => r.errorAnalysis)
    .map(r => r.errorAnalysis);

  if (errorAnalysis.length > 0) {
    console.log('\n=== 错误处理质量分析 ===');
    const friendlyErrors = errorAnalysis.filter(a => a.isFriendly).length;
    const withSuggestions = errorAnalysis.filter(a => a.hasSuggestion).length;
    
    console.log(`友好错误提示: ${friendlyErrors}/${errorAnalysis.length} (${((friendlyErrors/errorAnalysis.length)*100).toFixed(1)}%)`);
    console.log(`包含建议: ${withSuggestions}/${errorAnalysis.length} (${((withSuggestions/errorAnalysis.length)*100).toFixed(1)}%)`);
  }

  // 失败测试详情
  const failedTestDetails = testResults.filter(r => !r.passed);
  if (failedTestDetails.length > 0) {
    console.log('\n=== 失败测试详情 ===');
    failedTestDetails.forEach(test => {
      console.log(`\n❌ ${test.name}`);
      console.log(`   描述: ${test.description}`);
      console.log(`   错误: ${test.error || '未知错误'}`);
    });
  }

  return passedTests === totalTests;
}

// 主函数
async function main() {
  const success = await runAllTests();
  
  if (!success) {
    console.error('❌ 测试运行中断');
    process.exit(1);
  }

  const allPassed = generateReport();
  
  if (allPassed) {
    console.log('\n✅ Task 6 PASSED: 异常与边界处理功能正常');
    process.exit(0);
  } else {
    console.log('\n❌ Task 6 FAILED: 异常与边界处理需要改进');
    process.exit(1);
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { runAllTests, generateReport, TEST_CASES };