#!/usr/bin/env node

/**
 * MediaWiki MCP Server - 包含 list_wikipedia_wikis 和 get_wikipedia_page 功能
 */

import { TOOL_NAMES, DIAGNOSTIC_CONSTANTS, DiagnosticLevel, DiagnosticTarget } from './constants.js';

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { createRequire } from 'module';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import os from 'os';

// 导入 MediaWiki 客户端和异常处理器
import { MediaWikiClient, WikiConfig } from './wiki-client.js';
import ErrorHandler from './error-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 解析命令行参数
const args = process.argv.slice(2);
let envFilePath = path.resolve(__dirname, '../.env'); // 默认路径

// 处理命令行参数
for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--help' || arg === '-h') {
    console.log(`
🔬 MediaWiki MCP Server

用法: node build/index.js [选项]

选项:
  -f FILE           指定环境变量文件路径 [默认: .env]
  --help, -h        显示帮助信息

功能:
  🔧 通过MCP协议提供Wikipedia访问接口
  📖 支持页面搜索、获取、编辑等操作
  🌐 支持英文和中文Wikipedia
  🔍 提供快速搜索和智能搜索功能
  🩺 内置网络诊断工具

可用工具:
  - list_wikipedia_wikis      列出可用的Wiki实例
  - get_wikipedia_page        获取Wikipedia页面内容
  - search_pages              搜索Wikipedia页面
  - quick_search              快速搜索建议
  - smart_search              智能多策略搜索
  - network_diagnostic        网络连接诊断

环境变量:
  HTTP_PROXY                  HTTP代理地址
  HTTPS_PROXY                 HTTPS代理地址
  WIKIPEDIA_EN_API            英文Wikipedia API地址
  WIKIPEDIA_ZH_API            中文Wikipedia API地址
  WIKI_OUTPUT_DIR             输出目录

示例:
  node build/index.js                    # 启动MCP服务器
  node build/index.js -f custom.env      # 使用自定义环境变量文件
`);
    process.exit(0);
  }

  if (arg === '-f' && i + 1 < args.length) {
    envFilePath = path.resolve(args[i + 1]);
    i++; // 跳过下一个参数，因为它是文件路径
  }
}

// 加载环境变量
config({ path: envFilePath });

// 初始化环境变量
const envVars = {
  httpProxy: process.env.HTTP_PROXY,
  httpsProxy: process.env.HTTPS_PROXY,
  wikipediaEnApi: process.env.WIKIPEDIA_EN_API || 'https://en.wikipedia.org/w/api.php',
  wikipediaZhApi: process.env.WIKIPEDIA_ZH_API || 'https://zh.wikipedia.org/w/api.php'
};

// 创建fetch配置
const fetchConfig = {
  agent: envVars.httpsProxy ? new (await import('https-proxy-agent')).HttpsProxyAgent(envVars.httpsProxy) : undefined
};

// 可用的 wiki 配置
const wikiConfigs: {
  [key: string]: WikiConfig
} = {
  // Wikipedia配置项，支持匿名访问
  enwiki: {
    apiUrl: process.env.WIKIPEDIA_EN_API || "https://en.wikipedia.org/w/api.php"
  },
  zhwiki: {
    apiUrl: process.env.WIKIPEDIA_ZH_API || "https://zh.wikipedia.org/w/api.php"
  }
};

// MediaWiki 客类
// MediaWiki 客户端类已移到 src/wiki-client.ts

// 通用 wiki 操作处理函数
async function handleWikiOperation(args: any): Promise<any> {
  try {
    // 参数验证
    ErrorHandler.validateParameters(args, ['wiki', 'action', 'title']);

    const wiki = String(args.wiki);
    const action = String(args.action);
    const title = String(args.title);

    // 验证wiki实例
    ErrorHandler.validateWiki(wiki, Object.keys(wikiConfigs));

    const client = new MediaWikiClient(wikiConfigs[wiki]);

    switch (action) {
      case 'get':
        const pageContent = await client.getPage(title);

        // 获取输出目录：优先使用环境变量，然后使用用户主目录下的knowledge文件夹，最后使用当前工作目录
        const outputBaseDir = process.env.WIKI_OUTPUT_DIR || path.join(os.homedir(), 'knowledge') || process.cwd();

        // 按wiki分类保存：enwiki -> .wikipedia_en, zhwiki -> .wikipedia_zh
        let wikiDirName;
        switch (wiki) {
          case 'enwiki':
            wikiDirName = '.wikipedia_en';
            break;
          case 'zhwiki':
            wikiDirName = '.wikipedia_zh';
            break;
          default:
            wikiDirName = `.wikipedia_${wiki}`;
            break;
        }

        const wikiDir = path.join(outputBaseDir, wikiDirName);
        const metadataDir = path.join(wikiDir, '.metadata');

        // 创建目录
        if (!fs.existsSync(wikiDir)) {
          fs.mkdirSync(wikiDir, { recursive: true });
        }
        if (!fs.existsSync(metadataDir)) {
          fs.mkdirSync(metadataDir, { recursive: true });
        }

        // 优化文件命名：清理标题中的特殊字符
        const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
        const filename = `${sanitizedTitle}.txt`;
        const filepath = path.join(wikiDir, filename);

        // 写入页面内容到文件
        fs.writeFileSync(filepath, pageContent, 'utf8');

        // 写入元数据文件
        const metadataFilename = `${sanitizedTitle}.json`;
        const metadataFilepath = path.join(metadataDir, metadataFilename);
        const metadata = {
          title: title,
          retrieved_at: new Date().toISOString(),
          content_length: pageContent.length
        };
        fs.writeFileSync(metadataFilepath, JSON.stringify(metadata, null, 2), 'utf8');

        return {
          content: [{
            type: "text",
            text: `Successfully retrieved page "${title}" from ${wiki}\nContent saved to: ${filepath}\nMetadata saved to: ${metadataFilepath}\nContent length: ${pageContent.length} characters`
          }]
        };

      case 'search':
        const limit = args?.limit !== undefined ? Number(args.limit) : 10;
        // 验证搜索限制
        ErrorHandler.validateSearchLimit(limit);

        const searchResults = await client.searchPages(title, limit);
        return {
          content: [{
            type: "text",
            text: `Found ${searchResults.total} results for "${title}" in ${wiki}`
          }, {
            type: "code",
            text: JSON.stringify(searchResults, null, 2),
            language: "json"
          }]
        };

      default:
        throw new Error(`Unknown action: ${action}. Supported actions: get, search`);
    }
  } catch (error) {
    return ErrorHandler.generateErrorResponse(error, { tool: 'wiki_wikipedia_operation', args });
  }
}

async function handleListWikis(): Promise<any> {
  const wikis = Object.keys(wikiConfigs);
  console.log(`Listing wikis: ${wikis.join(', ')}`);
  return {
    content: [{
      type: "text",
      text: `Available Wikipedia instances (${wikis.length}):\n\n` +
        wikis.map(key => `- ${key}: ${wikiConfigs[key].apiUrl}`).join("\n")
    }]
  };
}

async function handleGetPage(args: any): Promise<any> {
  try {
    // 参数验证
    ErrorHandler.validateParameters(args, ['wiki', 'title']);

    const wiki = String(args.wiki);
    const title = String(args.title);
    // 新增参数：是否保存到文件
    const saveToFile = args.save_to_file !== undefined ? Boolean(args.save_to_file) : true;

    console.debug(`[DEBUG] handleGetPage called with wiki: ${wiki}, title: ${title}`);

    // 验证wiki实例
    ErrorHandler.validateWiki(wiki, Object.keys(wikiConfigs));

    console.debug(`[DEBUG] Creating MediaWikiClient for ${wiki}`);
    const client = new MediaWikiClient(wikiConfigs[wiki]);

    console.debug(`[DEBUG] Calling getPageWithMetadata for title: ${title}`);
    const { content, metadata } = await client.getPageWithMetadata(title);

    console.debug(`[DEBUG] Got content, length: ${content.length}`);

    // 如果不需要保存到文件，直接返回内容
    if (!saveToFile) {
      return {
        content: [{
          type: "text",
          text: content
        }]
      };
    }

    // 获取输出目录：优先使用环境变量，然后使用用户主目录下的knowledge文件夹，最后使用当前工作目录
    const outputBaseDir = process.env.WIKI_OUTPUT_DIR || path.join(os.homedir(), 'knowledge') || process.cwd();
    console.debug(`[DEBUG] outputBaseDir: ${outputBaseDir}`);

    // 按wiki分类保存：enwiki -> .wikipedia_en, zhwiki -> .wikipedia_zh
    let wikiDirName;
    switch (wiki) {
      case 'enwiki':
        wikiDirName = '.wikipedia_en';
        break;
      case 'zhwiki':
        wikiDirName = '.wikipedia_zh';
        break;
      default:
        wikiDirName = `.wikipedia_${wiki}`;
        break;
    }

    const wikiDir = path.join(outputBaseDir, wikiDirName);
    const metadataDir = path.join(wikiDir, '.metadata');

    console.debug(`[DEBUG] wikiDir: ${wikiDir}`);
    console.debug(`[DEBUG] metadataDir: ${metadataDir}`);

    // 创建目录
    if (!fs.existsSync(wikiDir)) {
      console.debug(`[DEBUG] Creating wikiDir: ${wikiDir}`);
      fs.mkdirSync(wikiDir, { recursive: true });
    }
    if (!fs.existsSync(metadataDir)) {
      console.debug(`[DEBUG] Creating metadataDir: ${metadataDir}`);
      fs.mkdirSync(metadataDir, { recursive: true });
    }

    // 优化文件命名：清理标题中的特殊字符，避免文件系统问题
    const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
    const filename = `${sanitizedTitle}.txt`;
    const filepath = path.join(wikiDir, filename);

    // 写入页面内容到文件
    fs.writeFileSync(filepath, content, 'utf8');

    // 写入元数据文件
    const metadataFilename = `${sanitizedTitle}.json`;
    const metadataFilepath = path.join(metadataDir, metadataFilename);
    const enhancedMetadata = {
      ...metadata,
      wiki: wiki,
      original_title: title,
      sanitized_title: sanitizedTitle,
      saved_at: new Date().toISOString(),
      content_length: content.length
    };
    fs.writeFileSync(metadataFilepath, JSON.stringify(enhancedMetadata, null, 2), 'utf8');

    console.debug(`[DEBUG] Successfully saved page to ${filepath}`);

    return {
      content: [{
        type: "text",
        text: `Successfully retrieved page "${title}" from ${wiki}\nContent saved to: ${filepath}\nMetadata saved to: ${metadataFilepath}\nContent length: ${content.length} characters`
      }]
    };
  } catch (error) {
    console.debug(`[DEBUG] Error in handleGetPage:`, error);
    return ErrorHandler.generateErrorResponse(error, { tool: 'get_wikipedia_page', args });
  }
} async function handleSearchPages(args: any): Promise<any> {
  try {
    // 参数验证
    ErrorHandler.validateParameters(args, ['wiki', 'query']);

    const wiki = String(args.wiki);
    const query = String(args.query);
    const limit = args?.limit !== undefined ? Number(args.limit) : 10;
    const namespace = Array.isArray(args?.namespace) ? args.namespace.map(Number) : [0];

    // 验证wiki实例
    ErrorHandler.validateWiki(wiki, Object.keys(wikiConfigs));

    // 验证搜索限制
    ErrorHandler.validateSearchLimit(limit);

    const client = new MediaWikiClient(wikiConfigs[wiki]);
    const searchResult = await client.searchPages(query, limit, namespace);

    if (searchResult.results.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No results found for "${query}" in ${wiki} wiki.`
        }]
      };
    }

    // 格式化搜索结果输出
    let resultText = `Found ${searchResult.total} result(s) for "${query}" in ${wiki} wiki:\n\n`;

    searchResult.results.forEach((result: any, index: number) => {
      resultText += `${index + 1}. **${result.title}**\n`;
      if (result.snippet) {
        resultText += `   ${result.snippet}\n`;
      }
      resultText += `   Score: ${result.score}, Size: ${result.size} bytes, Words: ${result.wordcount}\n`;
      if (result.timestamp) {
        resultText += `   Last modified: ${new Date(result.timestamp).toLocaleString()}\n`;
      }
      resultText += '\n';
    });

    if (searchResult.total === limit) {
      resultText += `\nShowing first ${limit} results. Use a larger limit to see more results.`;
    }

    return {
      content: [{
        type: "text",
        text: resultText
      }]
    };
  } catch (error) {
    return ErrorHandler.generateErrorResponse(error, { tool: 'search_pages', args });
  }
}

/**
 * 处理快速搜索请求 (OpenSearch API)
 */
async function handleQuickSearch(args: any): Promise<any> {
  try {
    // 参数验证
    ErrorHandler.validateParameters(args, ['wiki', 'query']);

    const wiki = String(args.wiki);
    const query = String(args.query);
    const limit = args?.limit !== undefined ? Number(args.limit) : 10;

    // 验证wiki实例
    ErrorHandler.validateWiki(wiki, Object.keys(wikiConfigs));

    // 验证搜索限制
    ErrorHandler.validateSearchLimit(limit);

    const client = new MediaWikiClient(wikiConfigs[wiki]);
    const searchResult = await client.openSearch(query, limit);

    if (searchResult.results.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No quick search results found for "${query}" in ${wiki} wiki.`
        }]
      };
    }

    // 格式化快速搜索结果输出
    let resultText = `Quick Search Results for "${query}" in ${wiki} wiki (${searchResult.responseTime}ms):\n\n`;

    searchResult.results.forEach((result: any, index: number) => {
      resultText += `${index + 1}. **${result.title}**\n`;
      if (result.description) {
        resultText += `   ${result.description}\n`;
      }
      if (result.url) {
        resultText += `   URL: ${result.url}\n`;
      }
      resultText += '\n';
    });

    resultText += `\nSearch Strategy: ${searchResult.strategy}\n`;
    resultText += `Response Time: ${searchResult.responseTime}ms\n`;
    resultText += `Total Results: ${searchResult.total}`;

    return {
      content: [{
        type: "text",
        text: resultText
      }]
    };
  } catch (error) {
    return ErrorHandler.generateErrorResponse(error, { tool: 'quick_search', args });
  }
}

/**
 * 处理智能搜索请求 (Smart Search)
 */
async function handleSmartSearch(args: any): Promise<any> {
  try {
    // 参数验证
    ErrorHandler.validateParameters(args, ['wiki', 'query']);

    const wiki = String(args.wiki);
    const query = String(args.query);
    const options = args?.options || {};
    const limit = options.limit !== undefined ? Number(options.limit) : 10;

    // 验证wiki实例
    ErrorHandler.validateWiki(wiki, Object.keys(wikiConfigs));

    // 验证搜索限制
    ErrorHandler.validateSearchLimit(limit);

    const client = new MediaWikiClient(wikiConfigs[wiki]);
    const searchResult = await client.smartSearch(query, { ...options, limit });

    if (searchResult.results.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No smart search results found for "${query}" in ${wiki} wiki.`
        }]
      };
    }

    // 格式化智能搜索结果输出
    let resultText = `Smart Search Results for "${query}" in ${wiki} wiki (${searchResult.responseTime}ms):\n\n`;

    searchResult.results.forEach((result: any, index: number) => {
      resultText += `${index + 1}. **${result.title}** [${result.source}]\n`;
      if (result.snippet) {
        resultText += `   ${result.snippet}\n`;
      }
      if (result.description) {
        resultText += `   ${result.description}\n`;
      }
      resultText += `   Relevance Score: ${result.relevanceScore?.toFixed(3) || 'N/A'}\n`;
      if (result.size) {
        resultText += `   Size: ${result.size} bytes`;
      }
      if (result.wordcount) {
        resultText += `, Words: ${result.wordcount}`;
      }
      resultText += '\n\n';
    });

    resultText += `Search Performance:\n`;
    resultText += `- Total Strategies: ${searchResult.performance.totalStrategies}\n`;
    resultText += `- Successful Strategies: ${searchResult.performance.successfulStrategies}\n`;
    resultText += `- Strategies Used: ${searchResult.strategies.join(', ')}\n`;
    resultText += `- Total Response Time: ${searchResult.responseTime}ms\n`;
    resultText += `- Average Strategy Time: ${searchResult.performance.averageResponseTime.toFixed(2)}ms\n`;
    resultText += `- Total Results: ${searchResult.total}`;

    return {
      content: [{
        type: "text",
        text: resultText
      }]
    };
  } catch (error) {
    return ErrorHandler.generateErrorResponse(error, { tool: 'smart_search', args });
  }
}

/**
 * 网络连接诊断工具处理器
 */
async function handleNetworkDiagnostic(args: any): Promise<any> {
  try {
    // 参数验证
    const target = args?.target || DIAGNOSTIC_CONSTANTS.TARGETS.AUTO;
    const level = args?.level || DIAGNOSTIC_CONSTANTS.LEVELS.STANDARD;
    const timeout = args?.timeout !== undefined ? args.timeout : DIAGNOSTIC_CONSTANTS.TIMEOUTS.STANDARD;

    // 验证参数
    if (!Object.values(DIAGNOSTIC_CONSTANTS.TARGETS).includes(target)) {
      throw new Error(`不支持的诊断目标: ${target}`);
    }
    if (!Object.values(DIAGNOSTIC_CONSTANTS.LEVELS).includes(level)) {
      throw new Error(`不支持的诊断级别: ${level}`);
    }
    if (timeout <= 0) {
      throw new Error(`超时时间必须大于0: ${timeout}`);
    }

    const startTime = Date.now();
    const diagnosticResult = await performNetworkDiagnostic(target, level, timeout);
    const totalTime = Date.now() - startTime;

    // 格式化诊断结果
    return {
      content: [{
        type: "text",
        text: formatDiagnosticReport(diagnosticResult, totalTime, target, level)
      }]
    };
  } catch (error) {
    return ErrorHandler.generateErrorResponse(error, { tool: 'network_diagnostic', args });
  }
}

/**
 * 使用原生https模块的代理请求方法，用于网络诊断
 */
async function proxyAwareRequestForDiagnostic(url: string, timeout: number, method: string = 'GET'): Promise<{ statusCode: number, headers: any, data?: any, responseTime: number }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const requestModule = isHttps ? https : http;

    const startTime = Date.now();

    const options: any = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'User-Agent': 'wikipedia-mcp-diagnostic/1.0',
        'Accept': 'application/json',
        'Connection': 'close'
      },
      timeout: timeout
    };

    // 在代理环境下使用agent
    if (fetchConfig.agent) {
      options.agent = fetchConfig.agent;
      console.debug(`[Diagnostic] Using proxy agent for request to ${urlObj.hostname}`);
    }

    const req = requestModule.request(options, (res) => {
      let data = '';
      const responseTime = Date.now() - startTime;

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const result = {
          statusCode: res.statusCode || 0,
          headers: res.headers,
          responseTime: responseTime
        };

        // 如果是JSON响应，尝试解析
        if (res.headers['content-type']?.includes('application/json') && data) {
          try {
            (result as any).data = JSON.parse(data);
          } catch (parseError) {
            // 忽略JSON解析错误，只返回状态码
          }
        }

        resolve(result);
      });
    });

    req.on('error', (error: any) => {
      const responseTime = Date.now() - startTime;
      let errorMessage = 'Network connection failed';

      if (error.code === 'ENOTFOUND') {
        errorMessage = 'DNS resolution failed';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused';
      } else if (error.code === 'ECONNRESET') {
        errorMessage = 'Connection reset';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Connection timed out';
      } else if (error.message && error.message.includes('proxy')) {
        errorMessage = 'Proxy connection failed';
      }

      reject(new Error(`${errorMessage}: ${error.message || error.code}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out after ${timeout}ms`));
    });

    req.end();
  });
}

/**
 * 执行分层网络诊断
 */
async function performNetworkDiagnostic(target: string, level: string, timeout: number): Promise<any> {
  const results: any = {
    environment: {},
    network: {},
    http: {},
    api: {},
    analysis: {},
    recommendations: [] as string[]
  };

  // 获取目标URL列表
  const targetUrls = getTargetUrls(target);

  try {
    // 阶段1：环境层诊断
    results.environment = await diagnoseEnvironment();

    // 阶段2：网络层诊断
    if (level === DIAGNOSTIC_CONSTANTS.LEVELS.BASIC ||
      level === DIAGNOSTIC_CONSTANTS.LEVELS.STANDARD ||
      level === DIAGNOSTIC_CONSTANTS.LEVELS.DEEP) {
      results.network = await diagnoseNetwork(targetUrls, timeout);
    }

    // 阶段3：HTTP层诊断
    if (level === DIAGNOSTIC_CONSTANTS.LEVELS.STANDARD ||
      level === DIAGNOSTIC_CONSTANTS.LEVELS.DEEP) {
      results.http = await diagnoseHTTP(targetUrls, timeout);
    }

    // 阶段4：API层诊断
    if (level === DIAGNOSTIC_CONSTANTS.LEVELS.DEEP) {
      results.api = await diagnoseAPI(targetUrls, timeout);
    }

    // 分析和建议生成
    results.analysis = analyzeResults(results);
    results.recommendations = generateRecommendations(results);

  } catch (error: any) {
    results.analysis = { error: error?.message || '未知错误' };
    results.recommendations = ['诊断过程中出现错误，建议检查网络连接后重试'];
  }

  return results;
}

/**
 * 获取诊断目标URL列表
 */
function getTargetUrls(target: string): string[] {
  const urls = [];

  switch (target) {
    case DIAGNOSTIC_CONSTANTS.TARGETS.AUTO:
    case DIAGNOSTIC_CONSTANTS.TARGETS.WIKIPEDIA:
      urls.push('https://en.wikipedia.org/w/api.php');
      urls.push('https://zh.wikipedia.org/w/api.php');
      break;
    case DIAGNOSTIC_CONSTANTS.TARGETS.ENWIKI:
      urls.push('https://en.wikipedia.org/w/api.php');
      break;
    case DIAGNOSTIC_CONSTANTS.TARGETS.ZHWIKI:
      urls.push('https://zh.wikipedia.org/w/api.php');
      break;
    default:
      urls.push('https://en.wikipedia.org/w/api.php'); // 默认
      break;
  }

  return urls;
}

/**
 * 环境层诊断
 */
async function diagnoseEnvironment() {
  const result = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    proxy: {
      http: process.env.HTTP_PROXY || 'Not set',
      https: process.env.HTTPS_PROXY || 'Not set'
    },
    environment: {
      wikipediaEnApi: process.env.WIKIPEDIA_EN_API || 'Using default',
      wikipediaZhApi: process.env.WIKIPEDIA_ZH_API || 'Using default'
    },
    status: 'OK'
  };

  return result;
}

/**
 * 网络层诊断
 */
async function diagnoseNetwork(urls: string[], timeout: number) {
  const results = [];

  for (const url of urls) {
    const urlObj = new URL(url);
    const result = {
      url: url,
      hostname: urlObj.hostname,
      port: urlObj.port || '443',
      dnsResolution: 'Unknown',
      connectivity: 'Unknown',
      responseTime: 0
    };

    try {
      const response = await proxyAwareRequestForDiagnostic(
        url + '?action=query&meta=siteinfo&format=json&formatversion=2',
        timeout,
        'HEAD'
      );

      result.responseTime = response.responseTime;
      if (response.statusCode >= 200 && response.statusCode < 400) {
        result.dnsResolution = 'OK';
        result.connectivity = 'OK';
      } else {
        result.dnsResolution = 'OK'; // DNS解析成功了，但连接有问题
        result.connectivity = 'Failed';
      }

    } catch (error: any) {
      result.responseTime = timeout;
      if (error.message.includes('DNS resolution failed')) {
        result.dnsResolution = 'Failed';
        result.connectivity = 'Failed';
      } else {
        result.dnsResolution = 'OK';
        result.connectivity = 'Failed';
      }
    }

    results.push(result);
  }

  return { targets: results, status: results.every(r => r.connectivity === 'OK') ? 'OK' : 'Failed' };
}

/**
 * HTTP层诊断
 */
async function diagnoseHTTP(urls: string[], timeout: number) {
  const results = [];

  for (const url of urls) {
    const result = {
      url: url,
      httpStatus: 0,
      headers: {},
      sslStatus: 'Unknown',
      responseTime: 0,
      contentType: 'Unknown'
    };

    try {
      const response = await proxyAwareRequestForDiagnostic(
        url + '?action=query&meta=siteinfo&format=json&formatversion=2',
        timeout,
        'GET'
      );

      result.responseTime = response.responseTime;
      result.httpStatus = response.statusCode;
      result.contentType = response.headers['content-type'] || 'Unknown';
      result.sslStatus = 'OK';
      result.headers = {
        'content-type': response.headers['content-type'],
        'server': response.headers['server'],
        'cache-control': response.headers['cache-control']
      };

    } catch (error) {
      result.httpStatus = 0;
      result.sslStatus = 'Failed';
      result.responseTime = timeout;
    }

    results.push(result);
  }

  return { targets: results, status: results.every(r => r.httpStatus === 200) ? 'OK' : 'Failed' };
}

/**
 * API层诊断
 */
async function diagnoseAPI(urls: string[], timeout: number) {
  const results = [];

  for (const url of urls) {
    const result = {
      url: url,
      apiResponse: 'Unknown',
      apiData: {},
      responseTime: 0,
      dataValid: false
    };

    try {
      const response = await proxyAwareRequestForDiagnostic(
        url + '?action=query&meta=siteinfo&format=json&formatversion=2',
        timeout,
        'GET'
      );

      result.responseTime = response.responseTime;

      if (response.statusCode >= 200 && response.statusCode < 300 && response.data) {
        result.apiResponse = 'OK';
        result.dataValid = response.data && response.data.query && response.data.query.general;
        result.apiData = {
          sitename: response.data?.query?.general?.sitename || 'Unknown',
          generator: response.data?.query?.general?.generator || 'Unknown',
          phpversion: response.data?.query?.general?.phpversion || 'Unknown'
        };
      } else {
        result.apiResponse = `HTTP ${response.statusCode}`;
      }

    } catch (error) {
      result.apiResponse = 'Failed';
      result.responseTime = timeout;
    }

    results.push(result);
  }

  return { targets: results, status: results.every(r => r.apiResponse === 'OK' && r.dataValid) ? 'OK' : 'Failed' };
}

/**
 * 分析诊断结果
 */
function analyzeResults(results: any): any {
  const analysis: any = {
    overallStatus: 'Unknown',
    issues: [] as string[],
    performance: {},
    summary: ''
  };

  // 计算整体状态
  const layers = ['environment', 'network', 'http', 'api'];
  const layerStatuses = layers.map(layer => results[layer]?.status).filter(Boolean);

  if (layerStatuses.every(status => status === 'OK')) {
    analysis.overallStatus = 'OK';
    analysis.summary = '✅ 所有诊断层次都正常，网络连接状态良好';
  } else {
    analysis.overallStatus = 'Issues Detected';
    analysis.summary = '⚠️ 检测到网络连接问题，需要进一步排查';
  }

  // 识别具体问题
  if (results.network?.status !== 'OK') {
    analysis.issues.push('网络连接异常');
  }
  if (results.http?.status !== 'OK') {
    analysis.issues.push('HTTP层连接问题');
  }
  if (results.api?.status !== 'OK') {
    analysis.issues.push('API接口响应异常');
  }

  // 性能分析
  const allResponseTimes: number[] = [];
  ['network', 'http', 'api'].forEach(layer => {
    if (results[layer]?.targets) {
      results[layer].targets.forEach((target: any) => {
        if (target.responseTime > 0) {
          allResponseTimes.push(target.responseTime);
        }
      });
    }
  });

  if (allResponseTimes.length > 0) {
    analysis.performance = {
      averageResponseTime: allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length,
      maxResponseTime: Math.max(...allResponseTimes),
      minResponseTime: Math.min(...allResponseTimes)
    };
  }

  return analysis;
}

/**
 * 生成解决建议
 */
function generateRecommendations(results: any): string[] {
  const recommendations: string[] = [];

  // 基于环境层问题的建议
  if (results.environment?.proxy?.http !== 'Not set' || results.environment?.proxy?.https !== 'Not set') {
    recommendations.push('💡 检测到代理配置，如遇连接问题请验证代理服务器状态');
  }

  // 基于网络层问题的建议
  if (results.network?.status !== 'OK') {
    recommendations.push('🔧 网络连接异常，建议：1) 检查网络连接 2) 验证DNS设置 3) 检查防火墙规则');
  }

  // 基于HTTP层问题的建议
  if (results.http?.status !== 'OK') {
    recommendations.push('🔧 HTTP连接问题，建议：1) 检查HTTPS证书 2) 验证代理配置 3) 确认端口443可访问');
  }

  // 基于API层问题的建议
  if (results.api?.status !== 'OK') {
    recommendations.push('🔧 API接口异常，建议：1) 检查API地址正确性 2) 验证请求格式 3) 确认服务器状态');
  }

  // 性能建议
  if (results.analysis?.performance?.averageResponseTime > 5000) {
    recommendations.push('⚡ 响应时间较慢，建议：1) 检查网络带宽 2) 考虑使用CDN 3) 优化请求参数');
  }

  // 如果没有问题，提供维护建议
  if (recommendations.length === 0) {
    recommendations.push('✅ 网络连接状态良好，建议定期运行诊断以确保稳定性');
  }

  return recommendations;
}

/**
 * 格式化诊断报告
 */
function formatDiagnosticReport(results: any, totalTime: number, target: string, level: string): string {
  let report = `# 网络连接诊断报告\n\n`;
  report += `📋 **诊断配置**\n`;
  report += `- 目标: ${target}\n`;
  report += `- 级别: ${level}\n`;
  report += `- 总耗时: ${totalTime}ms\n\n`;

  // 环境层诊断结果
  if (results.environment) {
    report += `## 🏗️ 环境层诊断\n\n`;
    report += `- Node.js版本: ${results.environment.nodeVersion}\n`;
    report += `- 平台: ${results.environment.platform} (${results.environment.arch})\n`;
    report += `- HTTP代理: ${results.environment.proxy.http}\n`;
    report += `- HTTPS代理: ${results.environment.proxy.https}\n`;
    report += `- 状态: ${results.environment.status === 'OK' ? '✅ 正常' : '❌ 异常'}\n\n`;
  }

  // 网络层诊断结果
  if (results.network) {
    report += `## 🌐 网络层诊断\n\n`;
    results.network.targets?.forEach((target: any, index: number) => {
      report += `**目标 ${index + 1}: ${target.hostname}**\n`;
      report += `- DNS解析: ${target.dnsResolution === 'OK' ? '✅ 正常' : '❌ 失败'}\n`;
      report += `- 连通性: ${target.connectivity === 'OK' ? '✅ 正常' : '❌ 失败'}\n`;
      report += `- 响应时间: ${target.responseTime}ms\n\n`;
    });
    report += `状态: ${results.network.status === 'OK' ? '✅ 正常' : '❌ 异常'}\n\n`;
  }

  // HTTP层诊断结果
  if (results.http) {
    report += `## 🔗 HTTP层诊断\n\n`;
    results.http.targets?.forEach((target: any, index: number) => {
      report += `**目标 ${index + 1}: ${new URL(target.url).hostname}**\n`;
      report += `- HTTP状态: ${target.httpStatus === 200 ? '✅ 200 OK' : `❌ ${target.httpStatus}`}\n`;
      report += `- SSL状态: ${target.sslStatus === 'OK' ? '✅ 正常' : '❌ 异常'}\n`;
      report += `- 内容类型: ${target.contentType}\n`;
      report += `- 响应时间: ${target.responseTime}ms\n\n`;
    });
    report += `状态: ${results.http.status === 'OK' ? '✅ 正常' : '❌ 异常'}\n\n`;
  }

  // API层诊断结果
  if (results.api) {
    report += `## 🔌 API层诊断\n\n`;
    results.api.targets?.forEach((target: any, index: number) => {
      report += `**目标 ${index + 1}: ${new URL(target.url).hostname}**\n`;
      report += `- API响应: ${target.apiResponse === 'OK' ? '✅ 正常' : `❌ ${target.apiResponse}`}\n`;
      report += `- 数据有效性: ${target.dataValid ? '✅ 有效' : '❌ 无效'}\n`;
      if (target.apiData?.sitename) {
        report += `- 站点名称: ${target.apiData.sitename}\n`;
      }
      report += `- 响应时间: ${target.responseTime}ms\n\n`;
    });
    report += `状态: ${results.api.status === 'OK' ? '✅ 正常' : '❌ 异常'}\n\n`;
  }

  // 分析结果
  if (results.analysis) {
    report += `## 📊 分析结果\n\n`;
    report += `${results.analysis.summary}\n\n`;

    if (results.analysis.performance?.averageResponseTime) {
      report += `**性能指标:**\n`;
      report += `- 平均响应时间: ${results.analysis.performance.averageResponseTime.toFixed(2)}ms\n`;
      report += `- 最大响应时间: ${results.analysis.performance.maxResponseTime}ms\n`;
      report += `- 最小响应时间: ${results.analysis.performance.minResponseTime}ms\n\n`;
    }

    if (results.analysis.issues?.length > 0) {
      report += `**发现的问题:**\n`;
      results.analysis.issues.forEach((issue: string) => {
        report += `- ${issue}\n`;
      });
      report += `\n`;
    }
  }

  // 解决建议
  if (results.recommendations?.length > 0) {
    report += `## 💡 解决建议\n\n`;
    results.recommendations.forEach((rec: string) => {
      report += `${rec}\n\n`;
    });
  }

  // 诊断总结
  report += `## 📋 诊断总结\n\n`;
  report += `本次诊断针对 **${target}** 进行了 **${level}** 级别的网络连接分析。\n\n`;

  if (results.analysis?.overallStatus === 'OK') {
    report += `🎉 **诊断结果**: 网络连接状态良好，所有检查项目均正常。\n`;
  } else {
    report += `⚠️ **诊断结果**: 发现网络连接问题，需要进一步排查和处理。\n`;
  }

  report += `⏱️ **诊断耗时**: ${totalTime}ms\n`;

  if (results.analysis?.performance?.averageResponseTime) {
    report += `📊 **平均响应时间**: ${results.analysis.performance.averageResponseTime.toFixed(2)}ms\n`;
  }

  if (results.analysis?.issues?.length > 0) {
    report += `🔍 **发现问题**: ${results.analysis.issues.length}个\n`;
  } else {
    report += `✅ **状态**: 未发现明显问题\n`;
  }

  report += `---\n`;
  report += `*诊断完成时间: ${new Date().toLocaleString()}*`;

  return report;
}

// 创建 MCP 服务器实例
const server = new Server(
  { name: "mediawiki-mcp", version: "0.1.0" },
  { capabilities: { tools: { listChanged: true } } }
);

// 列出可用工具：list_wikipedia_wikis 和 wiki_wikipedia_operation
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_wikipedia_wikis",
        description: "List all available Wikipedia instances",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "wiki_wikipedia_operation",
        description: "Perform various operations on Wikipedia pages (get, create, update, append, prepend, delete, move)",
        inputSchema: {
          type: "object",
          properties: {
            wiki: {
              type: "string",
              description: "Wiki instance name",
              enum: ["enwiki", "zhwiki"]
            },
            action: {
              type: "string",
              description: "Operation to perform",
              enum: ["get", "create", "update", "append", "prepend", "delete", "move"]
            },
            title: {
              type: "string",
              description: "Page title"
            },
            content: {
              type: "string",
              description: "Page content (required for create/update/append/prepend operations)"
            },
            summary: {
              type: "string",
              description: "Edit summary (required for create/update/append/prepend/move operations)"
            },
            options: {
              type: "object",
              description: "Additional options specific to the operation",
              properties: {
                minor: {
                  type: "boolean",
                  description: "Mark as minor edit (for update operations)",
                  default: false
                },
                newTitle: {
                  type: "string",
                  description: "New title for move operation"
                },
                reason: {
                  type: "string",
                  description: "Reason for delete operation (fallback to summary if not provided)"
                }
              }
            }
          },
          required: ["wiki", "action", "title"]
        }
      },
      {
        name: "get_wikipedia_page",
        description: "Get Wikipedia page content with metadata",
        inputSchema: {
          type: "object",
          properties: {
            wiki: {
              type: "string",
              description: "Wiki instance name",
              enum: ["enwiki", "zhwiki"]
            },
            title: {
              type: "string",
              description: "Page title"
            }
          },
          required: ["wiki", "title"]
        }
      },
      {
        name: "search_pages",
        description: "Search for pages in MediaWiki",
        inputSchema: {
          type: "object",
          properties: {
            wiki: {
              type: "string",
              description: "Wiki instance name",
              enum: ["enwiki", "zhwiki"]
            },
            query: {
              type: "string",
              description: "Search query"
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return",
              default: 10
            }
          },
          required: ["wiki", "query"]
        }
      },
      {
        name: "quick_search",
        description: "Fast OpenSearch API for quick suggestions (optimized for speed <500ms)",
        inputSchema: {
          type: "object",
          properties: {
            wiki: {
              type: "string",
              description: "Wiki instance name",
              enum: ["enwiki", "zhwiki"]
            },
            query: {
              type: "string",
              description: "Search query for quick suggestions"
            },
            limit: {
              type: "number",
              description: "Maximum number of suggestions to return",
              default: 10,
              minimum: 1,
              maximum: 50
            }
          },
          required: ["wiki", "query"]
        }
      },
      {
        name: "smart_search",
        description: "Intelligent multi-strategy search with parallel execution and result aggregation",
        inputSchema: {
          type: "object",
          properties: {
            wiki: {
              type: "string",
              description: "Wiki instance name",
              enum: ["enwiki", "zhwiki"]
            },
            query: {
              type: "string",
              description: "Search query for comprehensive search"
            },
            options: {
              type: "object",
              description: "Search configuration options",
              properties: {
                limit: {
                  type: "number",
                  description: "Maximum number of results to return",
                  default: 10,
                  minimum: 1,
                  maximum: 50
                },
                includeFulltext: {
                  type: "boolean",
                  description: "Include full-text search results",
                  default: true
                },
                includePrefix: {
                  type: "boolean",
                  description: "Include prefix search results",
                  default: true
                },
                includeOpenSearch: {
                  type: "boolean",
                  description: "Include OpenSearch suggestions",
                  default: true
                }
              }
            }
          },
          required: ["wiki", "query"]
        }
      },
      {
        name: "network_diagnostic",
        description: "Intelligent network connection diagnostic tool with layered analysis",
        inputSchema: {
          type: "object",
          properties: {
            target: {
              type: "string",
              description: "Diagnostic target",
              enum: ["auto", "wikipedia", "enwiki", "zhwiki", "custom"],
              default: "auto"
            },
            level: {
              type: "string",
              description: "Diagnostic depth level",
              enum: ["basic", "standard", "deep"],
              default: "standard"
            },
            timeout: {
              type: "number",
              description: "Timeout in milliseconds",
              default: 10000,
              minimum: 1000,
              maximum: 30000
            }
          }
        }
      }
    ]
  };
});

// 工具调用处理：处理 list_wikipedia_wikis, wiki_wikipedia_operation, get_wikipedia_page, search_pages, quick_search 和 smart_search
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;

  switch (toolName) {
    case "list_wikipedia_wikis":
      return await handleListWikis();

    case "wiki_wikipedia_operation":
      return await handleWikiOperation(request.params.arguments);

    case "get_wikipedia_page":
      // 直接调用 handleGetPage 以支持元数据保存
      return await handleGetPage(request.params.arguments);

    case "search_pages":
      return await handleSearchPages(request.params.arguments);

    case "quick_search":
      return await handleQuickSearch(request.params.arguments);

    case "smart_search":
      return await handleSmartSearch(request.params.arguments);

    case "network_diagnostic":
      return await handleNetworkDiagnostic(request.params.arguments);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  console.error("Server error:", err);
  process.exit(1);
});