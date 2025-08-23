#!/usr/bin/env node

/**
 * Wikipedia MCP Server - 专注于Wikipedia只读访问
 * 使用纯Wikipedia API，无第三方依赖
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Wikipedia配置
const wikiConfigs: {
  [key: string]: {
    apiUrl: string;
    language: string;
  }
} = {
  enwiki: {
    apiUrl: "https://en.wikipedia.org/w/api.php",
    language: "en"
  },
  zhwiki: {
    apiUrl: "https://zh.wikipedia.org/w/api.php",
    language: "zh"
  }
};

// Wikipedia API客户端类
class WikipediaClient {
  private apiUrl: string;
  private language: string;

  constructor(config: { apiUrl: string; language: string }) {
    this.apiUrl = config.apiUrl;
    this.language = config.language;
  }

  // 获取页面内容（wiki格式）
  async getPage(title: string): Promise<string> {
    try {
      const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        titles: title,
        prop: 'revisions',
        rvprop: 'content',
        rvslots: 'main',
        formatversion: '2'
      });

      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

      const response = await fetch(`${this.apiUrl}?${params}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Wikipedia-MCP/0.1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`Wikipedia API Error: ${data.error.info}`);
      }

      const pages = data.query?.pages;
      if (!pages || pages.length === 0) {
        throw new Error('No pages found in response');
      }

      const page = pages[0];
      if (page.missing) {
        throw new Error(`Page "${title}" not found`);
      }

      const revisions = page.revisions;
      if (!revisions || revisions.length === 0) {
        throw new Error(`No content found for page "${title}"`);
      }

      return revisions[0].slots.main.content || '';

    } catch (error) {
      throw error;
    }
  }

  // 获取页面内容和元数据
  async getPageWithMetadata(title: string): Promise<{ content: string, metadata: any }> {
    try {
      const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        titles: title,
        prop: 'revisions|info',
        rvprop: 'content|timestamp|comment|user|size',
        rvslots: 'main',
        inprop: 'url|displaytitle',
        formatversion: '2'
      });

      const response = await fetch(`${this.apiUrl}?${params}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Wikipedia-MCP/0.1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`Wikipedia API Error: ${data.error.info}`);
      }

      const pages = data.query?.pages;
      if (!pages || pages.length === 0) {
        throw new Error('No pages found in response');
      }

      const page = pages[0];
      if (page.missing) {
        throw new Error(`Page "${title}" not found`);
      }

      const revisions = page.revisions;
      if (!revisions || revisions.length === 0) {
        throw new Error(`No content found for page "${title}"`);
      }

      const content = revisions[0].slots.main.content || '';
      const revision = revisions[0];

      const metadata = {
        title: page.title,
        displaytitle: page.displaytitle || page.title,
        pageid: page.pageid,
        url: page.fullurl,
        language: this.language,
        size: revision.size || content.length,
        timestamp: revision.timestamp,
        user: revision.user,
        comment: revision.comment,
        retrieved_at: new Date().toISOString(),
        content_length: content.length
      };

      return { content, metadata };

    } catch (error) {
      throw error;
    }
  }

  // 搜索页面
  async searchPages(query: string, limit: number = 10): Promise<any> {
    try {
      const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        list: 'search',
        srsearch: query,
        srlimit: limit.toString(),
        srprop: 'snippet|titlesnippet|size|wordcount|timestamp',
        formatversion: '2'
      });

      const response = await fetch(`${this.apiUrl}?${params}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Wikipedia-MCP/0.1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`Wikipedia API Error: ${data.error.info}`);
      }

      const searchResults = data.query?.search || [];

      const formattedResults = searchResults.map((item: any) => ({
        title: item.title,
        snippet: this.cleanSnippet(item.snippet || ''),
        size: item.size || 0,
        wordcount: item.wordcount || 0,
        timestamp: item.timestamp || ''
      }));

      return {
        results: formattedResults,
        total: formattedResults.length,
        query: query,
        limit: limit
      };

    } catch (error) {
      throw error;
    }
  }

  private cleanSnippet(snippet: string): string {
    // 清理HTML标签和特殊字符
    return snippet.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
  }
}

// 工具处理函数
async function handleListWikis(): Promise<any> {
  const wikis = Object.keys(wikiConfigs);
  return {
    content: [{
      type: "text",
      text: `Available Wikipedia instances (${wikis.length}):\n\n` +
        wikis.map(key => `- ${key}: ${wikiConfigs[key].apiUrl} (${wikiConfigs[key].language})`).join("\n")
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
    throw new Error(`Unknown wiki: ${wiki}. Available wikis: ${Object.keys(wikiConfigs).join(', ')}`);
  }

  try {
    console.error(`[DEBUG] Creating WikipediaClient for ${wiki}`);
    const client = new WikipediaClient(wikiConfigs[wiki]);

    console.error(`[DEBUG] Calling getPageWithMetadata for title: ${title}`);
    const { content, metadata } = await client.getPageWithMetadata(title);

    console.error(`[DEBUG] Got content, length: ${content.length}`);

    // 获取输出目录
    const outputBaseDir = process.env.WIKI_OUTPUT_DIR || process.cwd();

    // 按wiki分类保存
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

    // 文件命名
    const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
    const filename = `${sanitizedTitle}.txt`;
    const filepath = path.join(wikiDir, filename);

    // 保存内容
    fs.writeFileSync(filepath, content, 'utf8');

    // 保存元数据
    const metadataFilename = `${sanitizedTitle}.json`;
    const metadataFilepath = path.join(metadataDir, metadataFilename);
    const enhancedMetadata = {
      ...metadata,
      wiki: wiki,
      original_title: title,
      sanitized_title: sanitizedTitle,
      saved_at: new Date().toISOString(),
      content_file: filepath
    };
    fs.writeFileSync(metadataFilepath, JSON.stringify(enhancedMetadata, null, 2), 'utf8');

    console.error(`[DEBUG] Successfully saved page to ${filepath}`);

    return {
      content: [{
        type: "text",
        text: `Successfully retrieved page "${title}" from ${wiki}\nContent saved to: ${filepath}\nMetadata saved to: ${metadataFilepath}\nContent length: ${content.length} characters\nPage URL: ${metadata.url}`
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

async function handleWikiOperation(args: any): Promise<any> {
  const wiki = String(args?.wiki || '');
  const action = String(args?.action || '');
  const title = String(args?.title || '');

  if (!wiki || !action || !title) {
    throw new Error("Parameters 'wiki', 'action', and 'title' are required");
  }

  if (!wikiConfigs[wiki]) {
    throw new Error(`Unknown wiki: ${wiki}. Available wikis: ${Object.keys(wikiConfigs).join(', ')}`);
  }

  if (action !== 'get') {
    throw new Error(`Only 'get' action is supported. Requested action: ${action}`);
  }

  // 对于get操作，直接调用handleGetPage
  return await handleGetPage({ wiki, title });
}

async function handleSearchPages(args: any): Promise<any> {
  const wiki = String(args?.wiki || '');
  const query = String(args?.query || '');
  const limit = Number(args?.limit || 10);

  if (!wiki || !query) {
    throw new Error("Both 'wiki' and 'query' parameters are required");
  }

  if (!wikiConfigs[wiki]) {
    throw new Error(`Unknown wiki: ${wiki}. Available wikis: ${Object.keys(wikiConfigs).join(', ')}`);
  }

  if (limit <= 0 || limit > 50) {
    throw new Error("Limit must be between 1 and 50");
  }

  try {
    const client = new WikipediaClient(wikiConfigs[wiki]);
    const searchResult = await client.searchPages(query, limit);

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
      resultText += `   Size: ${result.size} bytes, Words: ${result.wordcount}\n`;
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
  { name: "wikipedia-mcp", version: "0.1.0" },
  { capabilities: { tools: { listChanged: true } } }
);

// 工具定义
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
        name: "wiki_wikipedia_operation",
        description: "Perform get operation on Wikipedia pages",
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
              description: "Operation to perform (only 'get' is supported)",
              enum: ["get"]
            },
            title: {
              type: "string",
              description: "Page title"
            }
          },
          required: ["wiki", "action", "title"]
        }
      },
      {
        name: "search_pages",
        description: "Search for pages in Wikipedia",
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
              description: "Maximum number of results to return (1-50)",
              default: 10,
              minimum: 1,
              maximum: 50
            }
          },
          required: ["wiki", "query"]
        }
      }
    ]
  };
});

// 工具调用处理
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;

  switch (toolName) {
    case "list_wikipedia_wikis":
      return await handleListWikis();

    case "get_wikipedia_page":
      return await handleGetPage(request.params.arguments);

    case "wiki_wikipedia_operation":
      return await handleWikiOperation(request.params.arguments);

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
