#!/usr/bin/env node

/**
 * MediaWiki MCP Server - 包含 list_wikis 和 get_page 功能
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

const require = createRequire(import.meta.url);
const nodemw = require('nodemw');

// 可用的 wiki 配置
const wikiConfigs: {
  [key: string]: {
    apiUrl: string;
    username?: string;
    password?: string;
  }
} = {
  Jthou: {
    apiUrl: process.env.JTHOU_API_URL || "http://www.jthou.com/mediawiki/api.php",
    username: process.env.JTHOU_USERNAME,
    password: process.env.JTHOU_PASSWORD
  },
  // 添加Wikipedia配置项，支持匿名访问
  enwiki: {
    apiUrl: "https://en.wikipedia.org/w/api.php"
    // Wikipedia不需要用户名和密码，支持匿名访问
  },
  zhwiki: {
    apiUrl: "https://zh.wikipedia.org/w/api.php"
    // Wikipedia不需要用户名和密码，支持匿名访问
  }
};

// MediaWiki 客类
class MediaWikiClient {
  private client: any;
  private config: any;
  private isLoggedIn: boolean = false;

  constructor(config: { apiUrl: string; username?: string; password?: string }) {
    const url = new URL(config.apiUrl);

    this.config = {
      protocol: url.protocol.replace(':', ''),
      server: url.hostname,
      path: url.pathname.replace('/api.php', ''),
      debug: false
    };

    if (config.username && config.password) {
      this.config.username = config.username;
      this.config.password = config.password;
    }

    this.client = new nodemw(this.config);
  }

  async login(): Promise<void> {
    if (!this.config.username || !this.config.password) {
      // 无需登录，跳过
      return;
    }

    if (this.isLoggedIn) {
      // 已经登录，跳过
      return;
    }

    return new Promise((resolve, reject) => {
      this.client.logIn((err: Error) => {
        if (err) {
          reject(new Error(`Login failed: ${err.message}`));
        } else {
          this.isLoggedIn = true;
          resolve();
        }
      });
    });
  }

  async getPage(title: string): Promise<string> {
    // 先尝试登录（如果需要）
    await this.login();

    return new Promise((resolve, reject) => {
      this.client.getArticle(title, (err: Error, content: string) => {
        if (err) {
          reject(err);
        } else {
          resolve(content || '');
        }
      });
    });
  }

  async getPageWithMetadata(title: string): Promise<{ content: string, metadata: any }> {
    // 先尝试登录（如果需要）
    await this.login();

    return new Promise((resolve, reject) => {
      // 先获取页面内容，确保这部分工作
      this.client.getArticle(title, (err: Error, content: string) => {
        if (err) {
          reject(err);
          return;
        }

        // 创建最简元数据（版本号 + 时间戳）
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

  async updatePage(title: string, content: string, summary: string, mode: 'replace' | 'append' | 'prepend' = 'replace', minor: boolean = false): Promise<any> {
    // 先尝试登录（如果需要）
    await this.login();

    // 添加重试机制
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await new Promise((resolve, reject) => {
          const callback = (err: Error, result: any) => {
            if (err) {
              // 检查是否是token过期错误
              if (err.message.includes('badtoken') || err.message.includes('Invalid token')) {
                // 尝试重新登录以刷新token
                this.isLoggedIn = false;
                this.login().then(() => {
                  // 重新尝试操作
                  const retryCallback = (retryErr: Error, retryResult: any) => {
                    if (retryErr) {
                      reject(retryErr);
                    } else {
                      resolve(retryResult);
                    }
                  };
                  
                  switch (mode) {
                    case 'append':
                      this.client.append(title, content, summary, retryCallback);
                      break;
                    case 'prepend':
                      this.client.prepend(title, content, summary, retryCallback);
                      break;
                    case 'replace':
                    default:
                      this.client.edit(title, content, summary, minor, retryCallback);
                      break;
                  }
                }).catch(loginError => {
                  reject(new Error(`Token refresh failed: ${(loginError as Error).message}`));
                });
              } else {
                reject(err);
              }
            } else {
              resolve(result);
            }
          };

          switch (mode) {
            case 'append':
              this.client.append(title, content, summary, callback);
              break;
            case 'prepend':
              this.client.prepend(title, content, summary, callback);
              break;
            case 'replace':
            default:
              this.client.edit(title, content, summary, minor, callback);
              break;
          }
        });

        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`Update attempt ${attempt} failed:`, error);
        
        // 如果是最后一次尝试，或者不是网络错误/token错误，则不重试
        if (attempt === maxRetries || 
            (!(error as Error).message.includes('ETIMEDOUT') && 
             !(error as Error).message.includes('ENOTFOUND') && 
             !(error as Error).message.includes('ECONNRESET') &&
             !(error as Error).message.includes('badtoken') && 
             !(error as Error).message.includes('Invalid token'))) {
          break;
        }
        
        // 等待一段时间再重试
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    // 所有重试都失败了
    throw new Error(`Failed to update page after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  async deletePage(title: string, reason: string): Promise<any> {
    await this.login();

    return new Promise((resolve, reject) => {
      this.client.delete(title, reason, (err: Error, result: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  async movePage(fromTitle: string, toTitle: string, summary: string): Promise<any> {
    await this.login();

    return new Promise((resolve, reject) => {
      this.client.move(fromTitle, toTitle, summary, (err: Error, result: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  async searchPages(query: string, limit: number = 10, namespace: number[] = [0]): Promise<any> {
    await this.login();

    return new Promise((resolve, reject) => {
      // 使用 nodemw 的 search 方法
      this.client.search(query, (err: Error, data: any) => {
        if (err) {
          reject(err);
        } else {
          // nodemw search 方法返回的数据结构
          const searchResults = data || [];

          // 限制结果数量和应用命名空间过滤（如果需要）
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
            limit: limit,
            namespace: namespace
          });
        }
      });
    });
  }
  
  // 添加文件信息获取方法
  async getFileInfo(filename: string): Promise<any> {
    await this.login();
    
    return new Promise((resolve, reject) => {
      this.client.getImageInfo(`File:${filename}`, (err: Error, data: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(data || null);
        }
      });
    });
  }
  
  // 添加文件上传方法（从本地文件）
  async uploadFile(localPath: string, title: string, comment: string): Promise<any> {
    await this.login();
    
    // 读取文件内容
    const content = fs.readFileSync(localPath);
    
    return new Promise((resolve, reject) => {
      // 使用 nodemw 的 upload 方法
      this.client.upload(title, content, comment, (err: Error, data: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
  
  // 添加从URL上传文件的方法
  async uploadFileFromUrl(url: string, title: string, comment: string): Promise<any> {
    await this.login();
    
    return new Promise((resolve, reject) => {
      // 使用 nodemw 的 uploadByUrl 方法
      this.client.uploadByUrl(title, url, comment, (err: Error, data: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
  
  // 添加从剪贴板数据上传的方法
  async uploadFromClipboard(clipboardData: string, clipboardType: string, title: string, comment: string): Promise<any> {
    await this.login();
    
    // 根据剪贴板类型确定文件扩展名
    let extension = '';
    switch (clipboardType) {
      case 'image':
        extension = '.png';
        break;
      case 'text':
        extension = '.txt';
        break;
      default:
        extension = '.bin';
    }
    
    // 如果标题没有提供扩展名，则添加默认扩展名
    if (title && !path.extname(title)) {
      title += extension;
    }
    
    return new Promise((resolve, reject) => {
      // 使用 nodemw 的 upload 方法
      this.client.upload(title, clipboardData, comment, (err: Error, data: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  private cleanSnippet(snippet: string): string {
    // 清理HTML标签和特殊字符
    return snippet.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
  }
}

// 通用 wiki 操作处理函数
async function handleWikiOperation(args: any): Promise<any> {
  const wiki = String(args?.wiki || '');
  const action = String(args?.action || '');
  const title = String(args?.title || '');
  const content = String(args?.content || '');
  const summary = String(args?.summary || '');
  const options = args?.options || {};

  if (!wiki || !action || !title) {
    throw new Error("Parameters 'wiki', 'action', and 'title' are required");
  }

  if (!wikiConfigs[wiki]) {
    throw new Error(`Unknown wiki: ${wiki}`);
  }

  const client = new MediaWikiClient(wikiConfigs[wiki]);

  try {
    let result: any;

    switch (action) {
      case 'get':
        const pageContent = await client.getPage(title);

        // 获取输出目录：优先使用环境变量，然后使用当前工作目录
        const outputBaseDir = process.env.WIKI_OUTPUT_DIR || process.cwd();
        const wikiDir = path.join(outputBaseDir, '.jthou_wiki');

        if (!fs.existsSync(wikiDir)) {
          fs.mkdirSync(wikiDir, { recursive: true });
        }

        // 写入页面内容到文件
        const filename = `${title}.txt`;
        const filepath = path.join(wikiDir, filename);
        fs.writeFileSync(filepath, pageContent, 'utf8');

        return {
          content: [{
            type: "text",
            text: `Successfully retrieved page "${title}" from ${wiki} and saved to ${filepath}`
          }]
        };

      case 'create':
      case 'update':
      case 'append':
      case 'prepend':
        if (!content) {
          throw new Error("Content is required for create/update operations");
        }
        if (!summary) {
          throw new Error("Summary is required for create/update operations");
        }

        const mode = action === 'create' ? 'replace' :
          action === 'update' ? 'replace' : action as 'append' | 'prepend';
        const minor = options.minor || false;

        result = await client.updatePage(title, content, summary, mode, minor);

        return {
          content: [{
            type: "text",
            text: `Successfully ${action}d page "${title}" on ${wiki}. Revision ID: ${result.newrevid}`
          }]
        };

      case 'delete':
        const reason = options.reason || summary || 'Deleted via MCP';
        result = await client.deletePage(title, reason);

        return {
          content: [{
            type: "text",
            text: `Successfully deleted page "${title}" from ${wiki}. Reason: ${reason}`
          }]
        };

      case 'move':
        const newTitle = options.newTitle;
        if (!newTitle) {
          throw new Error("newTitle is required in options for move operation");
        }

        result = await client.movePage(title, newTitle, summary || 'Moved via MCP');

        return {
          content: [{
            type: "text",
            text: `Successfully moved page "${title}" to "${newTitle}" on ${wiki}`
          }]
        };

      default:
        throw new Error(`Unknown action: ${action}. Supported actions: get, create, update, append, prepend, delete, move`);
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

// 工具处理函数
async function handleUpdatePage(args: any): Promise<any> {
  const wiki = String(args?.wiki || '');
  const title = String(args?.title || '');
  const content = String(args?.content || '');
  const fromFile = String(args?.fromFile || '');
  const summary = String(args?.summary || '');
  const mode = String(args?.mode || 'replace') as 'replace' | 'append' | 'prepend';
  const minor = Boolean(args?.minor || false);
  const conflictResolution = String(args?.conflictResolution || 'detect');

  if (!wiki || !title || !summary) {
    throw new Error("Parameters 'wiki', 'title', and 'summary' are required");
  }

  // 确定内容来源：fromFile 优先
  let finalContent = content;
  if (fromFile) {
    try {
      finalContent = fs.readFileSync(fromFile, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read file ${fromFile}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!finalContent) {
    throw new Error("Either 'content' or 'fromFile' parameter is required");
  }

  if (!wikiConfigs[wiki]) {
    throw new Error(`Unknown wiki: ${wiki}`);
  }

  if (!['replace', 'append', 'prepend'].includes(mode)) {
    throw new Error("Mode must be one of: replace, append, prepend");
  }

  try {
    const client = new MediaWikiClient(wikiConfigs[wiki]);

    // 如果使用 fromFile，执行冲突检测
    if (fromFile && conflictResolution === 'detect') {
      // 获取当前服务器版本
      const { content: serverContent, metadata: serverMetadata } = await client.getPageWithMetadata(title);

      // 检查是否有元数据文件（本地版本信息）
      const metadataDir = path.join(path.dirname(fromFile), '.metadata');
      const metadataFile = path.join(metadataDir, `${title}.json`);

      if (fs.existsSync(metadataFile)) {
        const localMetadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));

        // 简单的冲突检测：比较大小
        if (serverMetadata.size !== localMetadata.size) {
          // 生成合并文档和最新远程版本
          const mergeDir = path.join(path.dirname(fromFile), '.merge');
          if (!fs.existsSync(mergeDir)) {
            fs.mkdirSync(mergeDir, { recursive: true });
          }

          // 保存最新远程版本
          const remoteFile = path.join(mergeDir, `${title}.remote.txt`);
          fs.writeFileSync(remoteFile, serverContent, 'utf8');

          // 生成合并文档
          const mergeFile = path.join(mergeDir, `${title}.merge.txt`);
          const mergeContent = `<<<<<<< LOCAL (${localMetadata.retrieved_at})\n${finalContent}\n=======\n${serverContent}\n>>>>>>> REMOTE (${serverMetadata.retrieved_at})\n`;
          fs.writeFileSync(mergeFile, mergeContent, 'utf8');

          return {
            content: [{
              type: "text",
              text: `⚠️ Conflict detected for page "${title}":\n` +
                `Local metadata size: ${localMetadata.size}, Server size: ${serverMetadata.size}\n` +
                `Merge document created: ${mergeFile}\n` +
                `Remote version saved: ${remoteFile}\n` +
                `Use conflictResolution: "force" to override, or edit the merge document.`
            }]
          };
        }
      }
    }

    const result = await client.updatePage(title, finalContent, summary, mode, minor);

    return {
      content: [{
        type: "text",
        text: `Successfully updated page "${title}" on ${wiki} (mode: ${mode})${fromFile ? ` from file ${fromFile}` : ''}. Revision ID: ${result.newrevid}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error updating page "${title}" on ${wiki}: ${error instanceof Error ? error.message : String(error)}`
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

  if (!wiki || !title) {
    throw new Error("Both 'wiki' and 'title' parameters are required");
  }

  if (!wikiConfigs[wiki]) {
    throw new Error(`Unknown wiki: ${wiki}`);
  }

  try {
    const client = new MediaWikiClient(wikiConfigs[wiki]);
    const { content, metadata } = await client.getPageWithMetadata(title);

    // 获取输出目录：优先使用环境变量，然后使用当前工作目录
    const outputBaseDir = process.env.WIKI_OUTPUT_DIR || process.cwd();
    const wikiDir = path.join(outputBaseDir, '.jthou_wiki');
    const metadataDir = path.join(wikiDir, '.metadata');

    // 创建目录
    if (!fs.existsSync(wikiDir)) {
      fs.mkdirSync(wikiDir, { recursive: true });
    }
    if (!fs.existsSync(metadataDir)) {
      fs.mkdirSync(metadataDir, { recursive: true });
    }

    // 写入页面内容到文件
    const filename = `${title}.txt`;
    const filepath = path.join(wikiDir, filename);
    fs.writeFileSync(filepath, content, 'utf8');

    // 写入元数据文件
    const metadataFilename = `${title}.json`;
    const metadataFilepath = path.join(metadataDir, metadataFilename);
    fs.writeFileSync(metadataFilepath, JSON.stringify(metadata, null, 2), 'utf8');

    return {
      content: [{
        type: "text",
        text: `Successfully retrieved page "${title}" from ${wiki} and saved to ${filepath}\nMetadata saved to ${metadataFilepath}`
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

// 添加文件上传处理函数
async function handleUploadFile(args: any): Promise<any> {
  const wiki = String(args?.wiki || '');
  const fromFile = String(args?.fromFile || '');
  const fromUrl = String(args?.fromUrl || '');
  const title = String(args?.title || '');
  const comment = String(args?.comment || `Uploaded via MediaWiki MCP Server`);

  // 验证参数
  if (!wiki) {
    throw new Error("Parameter 'wiki' is required");
  }

  if (!wikiConfigs[wiki]) {
    throw new Error(`Unknown wiki: ${wiki}`);
  }

  if (!fromFile && !fromUrl) {
    throw new Error("Either 'fromFile' or 'fromUrl' parameter is required");
  }

  if (fromFile && fromUrl) {
    throw new Error("Only one of 'fromFile' or 'fromUrl' can be specified");
  }

  try {
    const client = new MediaWikiClient(wikiConfigs[wiki]);
    
    // 规范化文件标题
    let finalTitle = title;
    if (!finalTitle) {
      // 如果没有提供标题，从文件路径或URL中提取
      if (fromFile) {
        finalTitle = path.basename(fromFile);
      } else {
        try {
          const urlObj = new URL(fromUrl);
          finalTitle = path.basename(urlObj.pathname);
        } catch (urlError) {
          throw new Error(`Invalid URL: ${fromUrl}`);
        }
      }
    }
    
    // 确保文件标题以"File:"开头
    if (!finalTitle.startsWith("File:")) {
      finalTitle = `File:${finalTitle}`;
    }
    
    // 清理文件名（处理空格和扩展名大小写）
    finalTitle = finalTitle.replace(/\s+/g, '_');
    
    // 执行上传前检查
    let result: any;
    if (fromFile) {
      // 检查文件是否存在
      if (!fs.existsSync(fromFile)) {
        throw new Error(`File not found: ${fromFile}`);
      }
      
      // 检查文件类型和大小（简单检查）
      const fileStats = fs.statSync(fromFile);
      if (fileStats.size > 10 * 1024 * 1024) { // 10MB限制
        throw new Error(`File too large: ${fromFile}. Maximum size is 10MB.`);
      }
      
      // 执行文件上传
      result = await client.uploadFile(fromFile, finalTitle, comment);
    } else {
      // URL上传
      // 简单的URL scheme检查
      if (!fromUrl.startsWith('http://') && !fromUrl.startsWith('https://')) {
        throw new Error(`Invalid URL scheme. Only http:// and https:// are supported.`);
      }
      
      // 执行URL上传
      result = await client.uploadFileFromUrl(fromUrl, finalTitle, comment);
    }
    
    // 检查上传结果
    if (result && result.result && result.result === "Success") {
      // 返回文件引用
      const fileRef = `[[${finalTitle}]]`;
      return {
        content: [{
          type: "text",
          text: `Successfully uploaded file. Reference: ${fileRef}`
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
          text: `Network error: ${errorMessage}. Please check your network connection or the URL.`
        }]
      };
    }
    
    return {
      content: [{
        type: "text",
        text: `Error uploading file: ${errorMessage}`
      }]
    };
  }
}

// 添加从剪贴板上传处理函数
async function handleUploadFromClipboard(args: any): Promise<any> {
  const wiki = String(args?.wiki || '');
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
    
    return {
      content: [{
        type: "text",
        text: `Error uploading from clipboard: ${errorMessage}`
      }]
    };
  }
}

// 创建 MCP 服务器实例
const server = new Server(
  { name: "mediawiki-mcp", version: "0.1.0" },
  { capabilities: { tools: { listChanged: true } } }
);

// 列出可用工具：list_wikis 和 wiki_operation
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_wikis",
        description: "List all available MediaWiki instances",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "wiki_operation",
        description: "Perform various operations on MediaWiki pages (get, create, update, append, prepend, delete, move)",
        inputSchema: {
          type: "object",
          properties: {
            wiki: {
              type: "string",
              description: "Wiki instance name",
              enum: ["Jthou", "enwiki", "zhwiki"]
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
        name: "update_page",
        description: "Update content of a MediaWiki page from Jthou wiki",
        inputSchema: {
          type: "object",
          properties: {
            wiki: {
              type: "string",
              description: "Wiki instance name",
              enum: ["Jthou", "enwiki", "zhwiki"]
            },
            title: {
              type: "string",
              description: "Page title"
            },
            content: {
              type: "string",
              description: "New page content (alternative to fromFile)"
            },
            fromFile: {
              type: "string",
              description: "Path to file containing new page content (alternative to content)"
            },
            summary: {
              type: "string",
              description: "Edit summary describing the changes"
            },
            mode: {
              type: "string",
              description: "Update mode",
              enum: ["replace", "append", "prepend"],
              default: "replace"
            },
            minor: {
              type: "boolean",
              description: "Mark as minor edit",
              default: false
            },
            conflictResolution: {
              type: "string",
              description: "How to handle conflicts when using fromFile",
              enum: ["detect", "force", "merge"],
              default: "detect"
            }
          },
          required: ["wiki", "title", "summary"]
        }
      },
      {
        name: "get_page",
        description: "Get content of a MediaWiki page from Jthou wiki (legacy, use wiki_operation with action='get' instead)",
        inputSchema: {
          type: "object",
          properties: {
            wiki: {
              type: "string",
              description: "Wiki instance name (currently only 'Jthou' is supported)"
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
        description: "Search for pages in MediaWiki that contain specific terms",
        inputSchema: {
          type: "object",
          properties: {
            wiki: {
              type: "string",
              description: "Wiki instance name",
              enum: ["Jthou", "enwiki", "zhwiki"]
            },
            query: {
              type: "string",
              description: "Search terms or query"
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return",
              default: 10,
              minimum: 1,
              maximum: 50
            },
            namespace: {
              type: "array",
              description: "Namespaces to search (0=main, 1=talk, etc.)",
              items: {
                type: "number"
              },
              default: [0]
            }
          },
          required: ["wiki", "query"]
        }
      },
      {
        name: "upload_file",
        description: "Upload a file to MediaWiki and return a direct pasteable reference like [[File:XXX]]",
        inputSchema: {
          type: "object",
          properties: {
            wiki: {
              type: "string",
              description: "Wiki instance name",
              enum: ["Jthou", "enwiki", "zhwiki"]
            },
            fromFile: {
              type: "string",
              description: "Path to local file to upload (mutually exclusive with fromUrl)"
            },
            fromUrl: {
              type: "string",
              description: "URL of file to upload (mutually exclusive with fromFile)"
            },
            title: {
              type: "string",
              description: "File title (if not provided, will be derived from filename or URL)"
            },
            comment: {
              type: "string",
              description: "Upload comment",
              default: "Uploaded via MediaWiki MCP Server"
            }
          },
          required: ["wiki"]
        }
      },
      {
        name: "upload_from_clipboard",
        description: "Upload content from clipboard to MediaWiki and return a direct pasteable reference like [[File:XXX]]",
        inputSchema: {
          type: "object",
          properties: {
            wiki: {
              type: "string",
              description: "Wiki instance name",
              enum: ["Jthou", "enwiki", "zhwiki"]
            },
            clipboardType: {
              type: "string",
              description: "Type of clipboard content",
              enum: ["image", "file", "text"]
            },
            clipboardData: {
              type: "string",
              description: "Base64 encoded clipboard data"
            },
            title: {
              type: "string",
              description: "File title (if not provided, will be generated automatically)"
            },
            comment: {
              type: "string",
              description: "Upload comment",
              default: "Uploaded from clipboard via MediaWiki MCP Server"
            }
          },
          required: ["wiki", "clipboardType", "clipboardData"]
        }
      }
    ]
  };
});

// 工具调用处理：处理 list_wikis, wiki_operation, update_page 和 get_page（向后兼容）
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;

  switch (toolName) {
    case "list_wikis":
      return await handleListWikis();

    case "wiki_operation":
      return await handleWikiOperation(request.params.arguments);

    case "update_page":
      return await handleUpdatePage(request.params.arguments);

    case "get_page":
      // 直接调用 handleGetPage 以支持元数据保存
      return await handleGetPage(request.params.arguments);

    case "search_pages":
      return await handleSearchPages(request.params.arguments);
      
    case "upload_file":
      return await handleUploadFile(request.params.arguments);
      
    case "upload_from_clipboard":
      return await handleUploadFromClipboard(request.params.arguments);

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