#!/usr/bin/env node

/**
 * MediaWiki MCP Server - 包含 list_wikipedia_wikis 和 get_wikipedia_page 功能
 */

import { TOOL_NAMES } from './constants.js';

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 解析命令行参数
const args = process.argv.slice(2);
let envFilePath = path.resolve(__dirname, '../.env'); // 默认路径

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-f' && i + 1 < args.length) {
    envFilePath = path.resolve(args[i + 1]);
    break;
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

// 导入 MediaWiki 客户端
import { MediaWikiClient, WikiConfig } from './wiki-client.js';

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
  const wiki = String(args?.wiki || '');
  const action = String(args?.action || '');
  const title = String(args?.title || '');

  if (!wiki || !action || !title) {
    throw new Error("Parameters 'wiki', 'action', and 'title' are required");
  }

  if (!wikiConfigs[wiki]) {
    throw new Error(`Unknown wiki: ${wiki}`);
  }

  const client = new MediaWikiClient(wikiConfigs[wiki]);

  try {
    switch (action) {
      case 'get':
        const pageContent = await client.getPage(title);

        // 获取输出目录：优先使用环境变量，然后使用当前工作目录
        const outputBaseDir = process.env.WIKI_OUTPUT_DIR || process.cwd();

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

        if (!fs.existsSync(wikiDir)) {
          fs.mkdirSync(wikiDir, { recursive: true });
        }

        // 优化文件命名：清理标题中的特殊字符
        const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
        const filename = `${sanitizedTitle}.txt`;
        const filepath = path.join(wikiDir, filename);
        fs.writeFileSync(filepath, pageContent, 'utf8');

        return {
          content: [{
            type: "text",
            text: `Successfully retrieved page "${title}" from ${wiki}\nSaved to: ${filepath}\nContent length: ${pageContent.length} characters`
          }]
        };

      case 'search':
        const limit = Number(args?.limit || 10);
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
    return {
      content: [{
        type: "text",
        text: `Error performing ${action} on page "${title}" from ${wiki}: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

async function handleListWikis(): Promise<any> {
  const wikis = Object.keys(wikiConfigs);
  return {
    content: [{
      type: "text",
      text: `Available MediaWiki instances (${wikis.length}):\n\n` +
        wikis.map(key => `- ${key}: ${wikiConfigs[key].apiUrl}`).join("\n")
    }]
  };
}

async function handleGetPage(args: any): Promise<any> {
  const wiki = String(args?.wiki || '');
  const title = String(args?.title || '');

  console.error(`[DEBUG] handleGetPage called with wiki: ${wiki}, title: ${title}`);

  if (!wiki || !title) {
    throw new Error("Both 'wiki' and 'title' parameters are required");
  }

  if (!wikiConfigs[wiki]) {
    throw new Error(`Unknown wiki: ${wiki}`);
  }

  try {
    console.error(`[DEBUG] Creating MediaWikiClient for ${wiki}`);
    const client = new MediaWikiClient(wikiConfigs[wiki]);

    console.error(`[DEBUG] Calling getPageWithMetadata for title: ${title}`);
    const { content, metadata } = await client.getPageWithMetadata(title);

    console.error(`[DEBUG] Got content, length: ${content.length}`);

    // 获取输出目录：优先使用环境变量，然后使用当前工作目录
    const outputBaseDir = process.env.WIKI_OUTPUT_DIR || process.cwd();

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

    console.error(`[DEBUG] Successfully saved page to ${filepath}`);

    return {
      content: [{
        type: "text",
        text: `Successfully retrieved page "${title}" from ${wiki}\nContent saved to: ${filepath}\nMetadata saved to: ${metadataFilepath}\nContent length: ${content.length} characters`
      }]
    };
  } catch (error) {
    console.error(`[DEBUG] Error in handleGetPage:`, error);
    return {
      content: [{
        type: "text",
        text: `Error retrieving page "${title}" from ${wiki}: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
} async function handleSearchPages(args: any): Promise<any> {
  const wiki = String(args?.wiki || '');
  const query = String(args?.query || '');
  const limit = Number(args?.limit || 10);
  const namespace = Array.isArray(args?.namespace) ? args.namespace.map(Number) : [0];

  if (!wiki || !query) {
    throw new Error("Both 'wiki' and 'query' parameters are required");
  }

  if (!wikiConfigs[wiki]) {
    throw new Error(`Unknown wiki: ${wiki}`);
  }

  if (limit <= 0 || limit > 50) {
    throw new Error("Limit must be between 1 and 50");
  }

  try {
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
    return {
      content: [{
        type: "text",
        text: `Error searching in ${wiki}: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

// 上传相关功能已移除
const clipboardType = String(args?.clipboardType || '');
const clipboardData = String(args?.clipboardData || '');
const title = String(args?.title || '');
const comment = String(args?.comment || `Uploaded from clipboard via MediaWiki MCP Server`);

// 验证参数
if (!wiki) {
  throw new Error("Parameter 'wiki' is required");
}

if (!wikiConfigs[wiki]) {
  throw new Error(`Unknown wiki: ${wiki}`);
}

if (!clipboardType) {
  throw new Error("Parameter 'clipboardType' is required");
}

if (!['image', 'file', 'text'].includes(clipboardType)) {
  throw new Error("clipboardType must be one of: image, file, text");
}

if (!clipboardData) {
  throw new Error("Parameter 'clipboardData' is required");
}

try {
  const client = new MediaWikiClient(wikiConfigs[wiki]);

  // 规范化文件标题
  let finalTitle = title;
  if (!finalTitle) {
    // 如果没有提供标题，生成一个默认标题
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').substring(0, 19);
    finalTitle = `Clipboard_${clipboardType}_${timestamp}`;
  }

  // 确保文件标题以"File:"开头
  if (!finalTitle.startsWith("File:")) {
    finalTitle = `File:${finalTitle}`;
  }

  // 清理文件名（处理空格和扩展名大小写）
  finalTitle = finalTitle.replace(/\s+/g, '_');

  // 根据剪贴板类型确定文件扩展名
  let extension = '';
  switch (clipboardType) {
    case 'image':
      extension = '.png';
      break;
    case 'text':
      extension = '.txt';
      break;
    case 'file':
      // 对于文件类型，如果没有提供扩展名，使用.bin作为默认
      extension = path.extname(finalTitle) || '.bin';
      break;
  }

  // 如果标题没有提供扩展名，则添加默认扩展名
  if (!path.extname(finalTitle)) {
    finalTitle += extension;
  }

  // 执行上传
  const result = await client.uploadFromClipboard(clipboardData, clipboardType, finalTitle, comment);

  // 检查上传结果
  if (result && result.result && result.result === "Success") {
    // 返回文件引用
    const fileRef = `[[${finalTitle}]]`;
    return {
      content: [{
        type: "text",
        text: `Successfully uploaded from clipboard. Reference: ${fileRef}`
      }]
    };
  } else {
    // 上传失败，返回详细错误信息
    const errorMsg = result && result.error ? result.error.info || JSON.stringify(result.error) : "Unknown error";
    throw new Error(`Upload failed: ${errorMsg}`);
  }
} catch (error) {
  // 提供更详细的错误信息
  const errorMessage = error instanceof Error ? error.message : String(error);

  // 特殊处理权限错误
  if (errorMessage.includes("readapidenied") || errorMessage.includes("permission")) {
    return {
      content: [{
        type: "text",
        text: `Permission denied: You don't have permission to upload files to this wiki. Please check your account permissions.`
      }]
    };
  }

  // 特殊处理网络错误
  if (errorMessage.includes("HTTP status")) {
    return {
      content: [{
        type: "text",
        text: `Network error: ${errorMessage}. Please check your network connection.`
      }]
    };
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
          name: TOOL_NAMES.LIST_WIKIS,
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
        }
        // ...existing code...
      ]
    };
  });

  // 工具调用处理：处理 list_wikipedia_wikis, wiki_wikipedia_operation, get_wikipedia_page 和 search_pages
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;

    switch (toolName) {
      case TOOL_NAMES.LIST_WIKIS:
        return await handleListWikis();

      case "wiki_wikipedia_operation":
        return await handleWikiOperation(request.params.arguments);
      case "get_wikipedia_page":
        // 直接调用 handleGetPage 以支持元数据保存
        return await handleGetPage(request.params.arguments);

      case "search_pages":
        return await handleSearchPages(request.params.arguments);

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