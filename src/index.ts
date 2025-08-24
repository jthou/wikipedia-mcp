#!/usr/bin/env node

/**
 * MediaWiki MCP Server - 包含 list_wikipedia_wikis 和 get_wikipedia_page 功能
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// 导入 MediaWiki 客户端
import { MediaWikiClient, WikiConfig } from './wiki-client.js';

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

// 清理和归档旧抓取结果的功能
function cleanupOldFiles(wikiDir: string, maxFiles: number = 100, maxAgeDays: number = 30): void {
  if (!fs.existsSync(wikiDir)) {
    return;
  }

  try {
    const files = fs.readdirSync(wikiDir)
      .filter(file => file.endsWith('.txt'))
      .map(file => {
        const filepath = path.join(wikiDir, file);
        const stats = fs.statSync(filepath);
        return {
          name: file,
          path: filepath,
          mtime: stats.mtime,
          size: stats.size
        };
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()); // 按修改时间排序

    const now = new Date();
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000; // 转换为毫秒

    // 删除过旧文件
    const filesToDelete = files.filter(file => {
      const age = now.getTime() - file.mtime.getTime();
      return age > maxAge;
    });

    // 删除超出数量限制的文件
    if (files.length > maxFiles) {
      const excessFiles = files.slice(maxFiles);
      filesToDelete.push(...excessFiles);
    }

    // 执行删除
    filesToDelete.forEach(file => {
      try {
        fs.unlinkSync(file.path);
        // 同时删除对应的元数据文件
        const metadataPath = path.join(wikiDir, '.metadata', file.name.replace('.txt', '.json'));
        if (fs.existsSync(metadataPath)) {
          fs.unlinkSync(metadataPath);
        }
        console.log(`[CLEANUP] Deleted old file: ${file.name}`);
      } catch (error) {
        console.error(`[CLEANUP] Failed to delete ${file.name}:`, error);
      }
    });

    if (filesToDelete.length > 0) {
      console.log(`[CLEANUP] Cleaned up ${filesToDelete.length} old files from ${wikiDir}`);
    }
  } catch (error) {
    console.error(`[CLEANUP] Error during cleanup of ${wikiDir}:`, error);
  }
}

// 获取文件夹大小和统计信息
function getDirectoryStats(wikiDir: string): { fileCount: number, totalSize: number, oldestFile?: Date, newestFile?: Date } {
  if (!fs.existsSync(wikiDir)) {
    return { fileCount: 0, totalSize: 0 };
  }

  try {
    const files = fs.readdirSync(wikiDir)
      .filter(file => file.endsWith('.txt'))
      .map(file => {
        const filepath = path.join(wikiDir, file);
        const stats = fs.statSync(filepath);
        return {
          mtime: stats.mtime,
          size: stats.size
        };
      });

    if (files.length === 0) {
      return { fileCount: 0, totalSize: 0 };
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const sortedByTime = files.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

    return {
      fileCount: files.length,
      totalSize,
      oldestFile: sortedByTime[0].mtime,
      newestFile: sortedByTime[sortedByTime.length - 1].mtime
    };
  } catch (error) {
    console.error(`[STATS] Error getting directory stats for ${wikiDir}:`, error);
    return { fileCount: 0, totalSize: 0 };
  }
}
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

        // 优化文件命名：清理标题中的特殊字符，添加长度限制和时间戳
        let sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');

        // 限制文件名长度，避免文件系统限制
        const maxFilenameLength = 200;
        if (sanitizedTitle.length > maxFilenameLength) {
          sanitizedTitle = sanitizedTitle.substring(0, maxFilenameLength);
        }

        // 添加时间戳避免重复
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const baseFilename = sanitizedTitle;
        let filename = `${baseFilename}.txt`;
        let filepath = path.join(wikiDir, filename);

        // 检查文件是否已存在，如果存在则添加时间戳后缀
        if (fs.existsSync(filepath)) {
          filename = `${baseFilename}_${timestamp}.txt`;
          filepath = path.join(wikiDir, filename);
        }
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

    // 优化文件命名：清理标题中的特殊字符，添加长度限制和时间戳处理
    let sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');

    // 限制文件名长度，避免文件系统限制
    const maxFilenameLength = 200;
    if (sanitizedTitle.length > maxFilenameLength) {
      sanitizedTitle = sanitizedTitle.substring(0, maxFilenameLength);
    }

    // 添加时间戳避免重复
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const baseFilename = sanitizedTitle;
    let filename = `${baseFilename}.txt`;
    let filepath = path.join(wikiDir, filename);

    // 检查文件是否已存在，如果存在则添加时间戳后缀
    if (fs.existsSync(filepath)) {
      filename = `${baseFilename}_${timestamp}.txt`;
      filepath = path.join(wikiDir, filename);
    }

    // 写入页面内容到文件
    fs.writeFileSync(filepath, content, 'utf8');

    // 写入元数据文件
    const metadataFilename = `${baseFilename}.json`;
    const metadataFilepath = path.join(metadataDir, metadataFilename);
    const enhancedMetadata = {
      ...metadata,
      wiki: wiki,
      original_title: title,
      sanitized_title: sanitizedTitle,
      saved_at: new Date().toISOString(),
      content_length: content.length,
      filename: filename
    };
    fs.writeFileSync(metadataFilepath, JSON.stringify(enhancedMetadata, null, 2), 'utf8');

    // 执行清理旧文件（保留最近100个文件，30天内的文件）
    const maxFiles = Number(process.env.MAX_CACHED_FILES) || 100;
    const maxAgeDays = Number(process.env.MAX_FILE_AGE_DAYS) || 30;
    cleanupOldFiles(wikiDir, maxFiles, maxAgeDays);

    // 获取目录统计信息
    const dirStats = getDirectoryStats(wikiDir);

    console.error(`[DEBUG] Successfully saved page to ${filepath}`);

    return {
      content: [{
        type: "text",
        text: `Successfully retrieved page "${title}" from ${wiki}\nContent saved to: ${filepath}\nMetadata saved to: ${metadataFilepath}\nContent length: ${content.length} characters\n\nDirectory stats:\n- Files in cache: ${dirStats.fileCount}\n- Total cache size: ${(dirStats.totalSize / 1024 / 1024).toFixed(2)} MB\n- Oldest file: ${dirStats.oldestFile ? dirStats.oldestFile.toISOString() : 'N/A'}\n- Newest file: ${dirStats.newestFile ? dirStats.newestFile.toISOString() : 'N/A'}`
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
}

async function handleSearchPages(args: any): Promise<any> {
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
        description: "Perform various operations on Wikipedia pages (get, search)",
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
              enum: ["get", "search"]
            },
            title: {
              type: "string",
              description: "Page title or search query"
            },
            limit: {
              type: "number",
              description: "Maximum number of search results to return (for search action)",
              default: 10
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
    ]
  };
});

// 工具调用处理：处理 list_wikipedia_wikis, wiki_wikipedia_operation, get_wikipedia_page 和 search_pages
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