/**
 * MediaWiki REST API 客户端
 * 使用原生 fetch API，不依赖任何第三方库
 * 集成增强的异常处理机制
 */

import { Agent as HttpsAgent } from 'https';
import { Agent as HttpAgent } from 'http';
import { HttpsProxyAgent } from 'https-proxy-agent/dist/index.js';
import { HttpProxyAgent } from 'http-proxy-agent/dist/index.js';
import ErrorHandler, { ErrorType } from './error-handler.js';

export interface WikiConfig {
    apiUrl: string;
    username?: string;
    password?: string;
}

export class MediaWikiClient {
    private apiUrl: string;
    private agent: HttpsAgent | HttpAgent | undefined;
    private userAgent: string;

    constructor(config: WikiConfig) {
        this.apiUrl = config.apiUrl;
        this.userAgent = process.env.USER_AGENT || 'Wikipedia-MCP-Server/1.0';

        // 配置代理
        if (process.env.HTTPS_PROXY) {
            this.agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
        } else if (process.env.HTTP_PROXY) {
            this.agent = new HttpProxyAgent(process.env.HTTP_PROXY);
        }
    }

    private async apiRequest(params: Record<string, string>): Promise<any> {
        const queryString = new URLSearchParams({
            ...params,
            format: 'json'
        }).toString();

        const url = `${this.apiUrl}?${queryString}`;

        const options = {
            headers: {
                'User-Agent': this.userAgent,
            },
            agent: this.agent
        };

        try {
            const response = await fetch(url, options);

            // 检查 HTTP 状态码
            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error(`Rate limit exceeded. Please wait before making more requests.`);
                } else if (response.status >= 500) {
                    throw new Error(`Wikipedia server error (${response.status}). The service may be temporarily unavailable.`);
                } else if (response.status === 403) {
                    throw new Error(`Access denied (${response.status}). You may not have permission to access this resource.`);
                } else {
                    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
                }
            }

            const data = await response.json();

            // 检查 API 错误
            if (data.error) {
                throw new Error(`Wikipedia API error: ${data.error.info || data.error.code}`);
            }

            return data;
        } catch (error) {
            // 网络错误处理
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error(`Network connection failed. Please check your internet connection and try again.`);
            }

            // 超时错误处理
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Request timed out. Please try again later.`);
            }

            // 重新抛出原错误，交由上层处理
            throw error;
        }
    }

    async getPage(title: string): Promise<string> {
        if (!title || title.trim() === '') {
            throw new Error('Page title cannot be empty');
        }

        const params = {
            action: 'query',
            prop: 'revisions',
            titles: title.trim(),
            rvprop: 'content',
            rvslots: '*'
        };

        try {
            const data = await this.apiRequest(params);

            const pages = data.query?.pages;
            if (!pages) {
                throw new Error('No pages in API response');
            }

            const page = Object.values(pages)[0] as any;

            // 检查页面是否存在
            if (!page || 'missing' in page) {
                throw new Error(`Page "${title}" does not exist`);
            }

            // 检查是否是重定向页面
            if ('redirect' in page) {
                // 如果是重定向，提供友好的信息
                const redirectTo = page.title;
                console.warn(`Page "${title}" redirects to "${redirectTo}"`);
            }

            const content = page.revisions?.[0]?.slots?.main?.content;
            if (!content) {
                throw new Error(`No content found for page "${title}"`);
            }

            // 检查是否是消歧义页面
            if (content.toLowerCase().includes('disambiguation') ||
                content.toLowerCase().includes('消歧义') ||
                title.toLowerCase().includes('disambiguation')) {
                console.warn(`Page "${title}" appears to be a disambiguation page`);
            }

            return content;
        } catch (error) {
            // 添加上下文信息
            const context = { title, apiUrl: this.apiUrl };
            const enhancedError = error instanceof Error ?
                new Error(`${error.message}`) :
                new Error(`Unknown error while fetching page "${title}"`);

            throw enhancedError;
        }
    }

    async search(query: string, limit: number = 10): Promise<Array<{ title: string, snippet: string }>> {
        const params = {
            action: 'query',
            list: 'search',
            srsearch: query,
            srlimit: String(limit),
            srprop: 'snippet'
        };

        const data = await this.apiRequest(params);

        return (data.query?.search || []).map((result: any) => ({
            title: result.title,
            snippet: this.cleanSnippet(result.snippet)
        }));
    }

    private cleanSnippet(snippet: string): string {
        return snippet.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
    }

    async getPageWithMetadata(title: string): Promise<{ content: string; metadata: any }> {
        if (!title || title.trim() === '') {
            throw new Error('Page title cannot be empty');
        }

        const params = {
            action: 'query',
            prop: 'revisions|info',
            titles: title.trim(),
            rvprop: 'content|ids|timestamp|flags',
            rvslots: '*',
            inprop: 'url|displaytitle|varianttitles|protection'
        };

        try {
            const data = await this.apiRequest(params);

            const pages = data.query?.pages;
            if (!pages) {
                throw new Error('No pages in API response');
            }

            const page = Object.values(pages)[0] as any;

            // 检查页面是否存在
            if (!page || 'missing' in page) {
                throw new Error(`Page "${title}" does not exist`);
            }

            // 检查是否是重定向页面
            let redirectInfo = null;
            if ('redirect' in page) {
                redirectInfo = {
                    isRedirect: true,
                    originalTitle: title,
                    redirectTo: page.title
                };
                console.warn(`Page "${title}" redirects to "${page.title}"`);
            }

            const content = page.revisions?.[0]?.slots?.main?.content;
            if (!content) {
                throw new Error(`No content found for page "${title}"`);
            }

            // 检查是否是消歧义页面
            const isDisambiguation = content.toLowerCase().includes('disambiguation') ||
                content.toLowerCase().includes('消歧义') ||
                title.toLowerCase().includes('disambiguation');

            if (isDisambiguation) {
                console.warn(`Page "${title}" appears to be a disambiguation page`);
            }

            // 构建丰富的元数据
            const metadata = {
                pageid: page.pageid,
                title: page.title,
                displaytitle: page.displaytitle || page.title,
                namespace: page.ns,
                url: page.fullurl,
                lastrevid: page.lastrevid,
                length: page.length,
                touched: page.touched,
                retrieved_at: new Date().toISOString(),
                revision: {
                    id: page.revisions[0].revid,
                    timestamp: page.revisions[0].timestamp,
                    flags: page.revisions[0].flags || []
                },
                protection: page.protection || [],
                variants: page.varianttitles || {},
                // 添加新的元数据字段
                redirect: redirectInfo,
                isDisambiguation,
                contentType: isDisambiguation ? 'disambiguation' : 'article'
            };

            return {
                content,
                metadata
            };
        } catch (error) {
            // 添加上下文信息
            const context = { title, apiUrl: this.apiUrl };
            const enhancedError = error instanceof Error ?
                new Error(`${error.message}`) :
                new Error(`Unknown error while fetching page with metadata "${title}"`);

            throw enhancedError;
        }
    }

    async searchPages(query: string, limit: number = 10, namespace: number[] = [0]): Promise<any> {
        // 参数验证
        if (!query || query.trim() === '') {
            throw new Error('Search query cannot be empty');
        }

        if (limit <= 0 || limit > 50) {
            throw new Error('Search limit must be between 1 and 50');
        }

        if (!Array.isArray(namespace) || namespace.length === 0) {
            namespace = [0]; // 默认主名称空间
        }

        const params = {
            action: 'query',
            list: 'search',
            srsearch: query.trim(),
            srlimit: String(limit),
            srnamespace: namespace.join('|'),
            srprop: 'snippet|wordcount|size|timestamp|score'
        };

        try {
            const data = await this.apiRequest(params);

            const searchResults = data.query?.search || [];

            // 处理搜索结果
            const formattedResults = searchResults.map((item: any) => ({
                title: item.title,
                snippet: this.cleanSnippet(item.snippet),
                score: item.score,
                wordcount: item.wordcount,
                size: item.size,
                timestamp: item.timestamp
            }));

            const result = {
                results: formattedResults,
                total: formattedResults.length,
                query: query.trim(),
                limit: limit,
                namespace: namespace,
                hasResults: formattedResults.length > 0
            };

            // 如果没有结果，提供友好的提示
            if (formattedResults.length === 0) {
                console.warn(`No search results found for query: "${query}"`);
            }

            return result;
        } catch (error) {
            // 添加上下文信息
            const context = { query: query.trim(), limit, namespace, apiUrl: this.apiUrl };
            const enhancedError = error instanceof Error ?
                new Error(`${error.message}`) :
                new Error(`Unknown error while searching for "${query}"`);

            throw enhancedError;
        }
    }
}