#!/usr/bin/env node

/**
 * MediaWiki MCP Server - 专注于Wikipedia只读访问
 * 简化版本，移除编辑功能，只保留读取和搜索
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    ListToolsRequestSchema,
    CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { createRequire } from 'module';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);
const nodemw = require('nodemw');

// Wikipedia配置 - 简化版本，只需要API URL
const wikiConfigs: {
    [key: string]: {
        apiUrl: string;
    }
} = {
    enwiki: {
        apiUrl: "https://en.wikipedia.org/w/api.php"
    },
    zhwiki: {
        apiUrl: "https://zh.wikipedia.org/w/api.php"
    }
};

// 简化的Wikipedia客户端类 - 只保留读取功能
class WikipediaClient {
    private client: any;

    constructor(config: { apiUrl: string }) {
        const url = new URL(config.apiUrl);

        this.client = new nodemw({
            protocol: url.protocol.replace(':', ''),
            server: url.hostname,
            path: url.pathname.replace('/api.php', ''),
            debug: false
            // 不需要用户名和密码，Wikipedia支持匿名访问
        });
    }

    async getPage(title: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Request timeout: Failed to retrieve page "${title}" within 10 seconds`));
            }, 10000);

            this.client.getArticle(title, (err: Error, content: string) => {
                clearTimeout(timeout);
                if (err) {
                    reject(err);
                } else {
                    resolve(content || '');
                }
            });
        });
    }

    async getPageWithMetadata(title: string): Promise<{ content: string, metadata: any }> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Request timeout: Failed to retrieve page "${title}" within 10 seconds`));
            }, 10000);

            this.client.getArticle(title, (err: Error, content: string) => {
                clearTimeout(timeout);

                if (err) {
                    reject(err);
                    return;
                }

                const metadata = {
                    title: title,
                    retrieved_at: new Date().toISOString(),
                    size: content ? content.length : 0
                };

                resolve({
                    content: content || '',
                    metadata: metadata
                });
            });
        });
    }

    async searchPages(query: string, limit: number = 10): Promise<any> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Search timeout: Failed to search for "${query}" within 10 seconds`));
            }, 10000);

            this.client.search(query, (err: Error, data: any) => {
                clearTimeout(timeout);

                if (err) {
                    reject(err);
                } else {
                    const searchResults = data || [];
                    const filteredResults = searchResults.slice(0, limit);

                    const formattedResults = filteredResults.map((item: any) => ({
                        title: item.title || item,
                        snippet: this.cleanSnippet(item.snippet || ''),
                        score: item.score || 0,
                        wordcount: item.wordcount || 0,
                        size: item.size || 0,
                        timestamp: item.timestamp || ''
                    }));

                    resolve({
                        results: formattedResults,
                        total: formattedResults.length,
                        query: query,
                        limit: limit
                    });
                }
            });
        });
    }

    private cleanSnippet(snippet: string): string {
        return snippet.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
    }
}

// 简化的wiki操作处理函数 - 只支持get操作
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

    // 只支持get操作
    if (action !== 'get') {
        throw new Error(`Only 'get' action is supported. Received: ${action}`);
    }

    const client = new WikipediaClient(wikiConfigs[wiki]);

    try {
        const pageContent = await client.getPage(title);

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

        if (!fs.existsSync(wikiDir)) {
            fs.mkdirSync(wikiDir, { recursive: true });
        }

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

    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Error retrieving page "${title}" from ${wiki}: ${error instanceof Error ? error.message : String(error)}`
            }]
        };
    }
}

async function handleListWikis(): Promise<any> {
    const wikis = Object.keys(wikiConfigs);
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
}

async function handleSearchPages(args: any): Promise<any> {
    const wiki = String(args?.wiki || '');
    const query = String(args?.query || '');
    const limit = Number(args?.limit || 10);

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
    { name: "wikipedia-mcp", version: "0.1.0" },
    { capabilities: { tools: { listChanged: true } } }
);

// 列出可用工具：简化版本，只保留读取功能
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
                description: "Perform get operation on Wikipedia pages (only reading supported)",
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

// 工具调用处理：只处理读取相关的工具
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;

    switch (toolName) {
        case "list_wikipedia_wikis":
            return await handleListWikis();

        case "wiki_wikipedia_operation":
            return await handleWikiOperation(request.params.arguments);

        case "get_wikipedia_page":
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
