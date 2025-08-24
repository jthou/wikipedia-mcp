/**
 * MediaWiki REST API 客户端
 * 使用原生 fetch API，不依赖任何第三方库
 */

import { Agent as HttpsAgent } from 'https';
import { Agent as HttpAgent } from 'http';
import { HttpsProxyAgent } from 'https-proxy-agent/dist/index.js';
import { HttpProxyAgent } from 'http-proxy-agent/dist/index.js';

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

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Failed to fetch from MediaWiki API: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async getPage(title: string): Promise<string> {
        const params = {
            action: 'query',
            prop: 'revisions',
            titles: title,
            rvprop: 'content',
            rvslots: '*'
        };

        const data = await this.apiRequest(params);

        const pages = data.query?.pages;
        if (!pages) {
            throw new Error('No pages in response');
        }

        const page = Object.values(pages)[0] as any;
        if (!page || 'missing' in page) {
            throw new Error(`Page "${title}" does not exist`);
        }

        const content = page.revisions?.[0]?.slots?.main?.content;
        if (!content) {
            throw new Error(`No content found for page "${title}"`);
        }

        return content;
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
        const params = {
            action: 'query',
            prop: 'revisions|info',
            titles: title,
            rvprop: 'content|ids|timestamp|flags',
            rvslots: '*',
            inprop: 'url|displaytitle|varianttitles|protection'
        };

        const data = await this.apiRequest(params);

        const pages = data.query?.pages;
        if (!pages) {
            throw new Error('No pages in response');
        }

        const page = Object.values(pages)[0] as any;
        if (!page || 'missing' in page) {
            throw new Error(`Page "${title}" does not exist`);
        }

        const content = page.revisions?.[0]?.slots?.main?.content;
        if (!content) {
            throw new Error(`No content found for page "${title}"`);
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
            variants: page.varianttitles || {}
        };

        return {
            content,
            metadata
        };
    }

    async searchPages(query: string, limit: number = 10, namespace: number[] = [0]): Promise<any> {
        const params = {
            action: 'query',
            list: 'search',
            srsearch: query,
            srlimit: String(limit),
            srnamespace: namespace.join('|'),
            srprop: 'snippet|wordcount|size|timestamp|score'
        };

        const data = await this.apiRequest(params);

        const searchResults = data.query?.search || [];
        const formattedResults = searchResults.map((item: any) => ({
            title: item.title,
            snippet: this.cleanSnippet(item.snippet),
            score: item.score,
            wordcount: item.wordcount,
            size: item.size,
            timestamp: item.timestamp
        }));

        return {
            results: formattedResults,
            total: formattedResults.length,
            query: query,
            limit: limit,
            namespace: namespace
        };
    }
}