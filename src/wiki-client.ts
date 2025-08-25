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
    private cache: Map<string, { data: any, timestamp: number }> = new Map();
    private cacheTimeout: number = 5 * 60 * 1000; // 5分钟缓存

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

    private getCacheKey(params: Record<string, string>): string {
        return `${this.apiUrl}:${JSON.stringify(params)}`;
    }

    private getCachedData(cacheKey: string): any | null {
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        if (cached) {
            this.cache.delete(cacheKey); // 清理过期缓存
        }
        return null;
    }

    private setCachedData(cacheKey: string, data: any): void {
        this.cache.set(cacheKey, { data, timestamp: Date.now() });

        // 限制缓存大小，保持最近100个结果
        if (this.cache.size > 100) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    private async apiRequest(params: Record<string, string>): Promise<any> {
        const cacheKey = this.getCacheKey(params);

        // 检查缓存
        const cachedData = this.getCachedData(cacheKey);
        if (cachedData) {
            return cachedData;
        }

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

            // 缓存成功的响应
            this.setCachedData(cacheKey, data);

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

    /**
     * OpenSearch API - 快速自动完成建议 (最快，<200ms)
     * 使用 action=opensearch 实现快速建议
     */
    async openSearch(query: string, limit: number = 10): Promise<any> {
        // 参数验证
        if (!query || query.trim() === '') {
            throw new Error('Search query cannot be empty');
        }

        if (limit <= 0 || limit > 50) {
            throw new Error('Search limit must be between 1 and 50');
        }

        const params = {
            action: 'opensearch',
            search: query.trim(),
            limit: String(limit),
            namespace: '0', // 主名称空间
            format: 'json'
        };

        try {
            const startTime = Date.now();
            const data = await this.apiRequest(params);
            const responseTime = Date.now() - startTime;

            // OpenSearch返回数组格式: [query, titles, descriptions, urls]
            const [searchQuery, titles, descriptions, urls] = data;

            const results = titles.map((title: string, index: number) => ({
                title,
                description: descriptions[index] || '',
                url: urls[index] || '',
                type: 'opensearch'
            }));

            return {
                query: searchQuery,
                results,
                total: results.length,
                responseTime,
                strategy: 'opensearch'
            };
        } catch (error) {
            const enhancedError = error instanceof Error ?
                new Error(`OpenSearch error: ${error.message}`) :
                new Error(`Unknown error in OpenSearch for "${query}"`);

            throw enhancedError;
        }
    }

    /**
     * Prefix Search - 精确标题前缀匹配 (快速，准确)
     * 使用 action=query&list=prefixsearch 实现前缀匹配
     */
    async prefixSearch(prefix: string, limit: number = 10, namespace: number[] = [0]): Promise<any> {
        // 参数验证
        if (!prefix || prefix.trim() === '') {
            throw new Error('Search prefix cannot be empty');
        }

        if (limit <= 0 || limit > 50) {
            throw new Error('Search limit must be between 1 and 50');
        }

        const params = {
            action: 'query',
            list: 'prefixsearch',
            pssearch: prefix.trim(),
            pslimit: String(limit),
            psnamespace: namespace.join('|')
        };

        try {
            const startTime = Date.now();
            const data = await this.apiRequest(params);
            const responseTime = Date.now() - startTime;

            const searchResults = data.query?.prefixsearch || [];

            const results = searchResults.map((item: any) => ({
                title: item.title,
                pageid: item.pageid,
                type: 'prefixsearch'
            }));

            return {
                query: prefix.trim(),
                results,
                total: results.length,
                responseTime,
                strategy: 'prefixsearch',
                namespace
            };
        } catch (error) {
            const enhancedError = error instanceof Error ?
                new Error(`Prefix search error: ${error.message}`) :
                new Error(`Unknown error in prefix search for "${prefix}"`);

            throw enhancedError;
        }
    }

    /**
     * Smart Search - 智能综合搜索 (多策略并行+结果聚合)
     * 结合多种策略并行请求，智能聚合结果
     */
    async smartSearch(query: string, options: any = {}): Promise<any> {
        // 参数验证
        if (!query || query.trim() === '') {
            throw new Error('Search query cannot be empty');
        }

        const {
            limit = 10,
            namespace = [0],
            includeFulltext = true,
            includePrefix = true,
            includeOpenSearch = true,
            timeout = 10000  // 10秒超时，适应网络延迟
        } = options;

        const startTime = Date.now();
        const searchPromises: Promise<any>[] = [];
        const strategies: string[] = [];

        try {
            // 智能策略选择：根据查询特点优化策略
            const queryLength = query.trim().length;
            const isShortQuery = queryLength <= 3;
            const isExactMatch = /^[A-Z][a-z]/.test(query); // 首字母大写的可能是精确标题

            // 总是使用 OpenSearch，它速度快且结果好
            if (includeOpenSearch) {
                strategies.push('opensearch');
                searchPromises.push(
                    this.openSearch(query, Math.min(limit, 10))
                        .catch(error => ({ error: error.message, strategy: 'opensearch' }))
                );
            }

            // 对于短查询或精确匹配，优先使用 PrefixSearch
            if (includePrefix && (isShortQuery || isExactMatch)) {
                strategies.push('prefixsearch');
                searchPromises.push(
                    this.prefixSearch(query, Math.min(limit, 10), namespace)
                        .catch(error => ({ error: error.message, strategy: 'prefixsearch' }))
                );
            }

            // 对于长查询或复杂查询，添加全文搜索
            if (includeFulltext && (!isShortQuery || queryLength > 5)) {
                strategies.push('fulltext');
                searchPromises.push(
                    this.searchPages(query, Math.min(limit, 10), namespace)
                        .catch(error => ({ error: error.message, strategy: 'fulltext' }))
                );
            }

            // 如果没有全文搜索但用户要求，添加上
            if (includeFulltext && strategies.length === 1) {
                strategies.push('fulltext');
                searchPromises.push(
                    this.searchPages(query, Math.min(limit, 10), namespace)
                        .catch(error => ({ error: error.message, strategy: 'fulltext' }))
                );
            }

            // 如果没有PrefixSearch但用户要求，添加上
            if (includePrefix && !strategies.includes('prefixsearch')) {
                strategies.push('prefixsearch');
                searchPromises.push(
                    this.prefixSearch(query, Math.min(limit, 10), namespace)
                        .catch(error => ({ error: error.message, strategy: 'prefixsearch' }))
                );
            }

            // 添加超时控制
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Search timeout')), timeout);
            });

            // 等待所有搜索完成或超时
            const searchResults = await Promise.race([
                Promise.all(searchPromises),
                timeoutPromise
            ]) as any[];

            const responseTime = Date.now() - startTime;

            // 聚合和去重结果
            const aggregatedResults = this.aggregateSearchResults(searchResults, limit);

            return {
                query: query.trim(),
                results: aggregatedResults.results,
                total: aggregatedResults.total,
                responseTime,
                strategy: 'smart',
                strategies: strategies,
                performance: {
                    totalStrategies: strategies.length,
                    successfulStrategies: searchResults.filter(r => !r.error).length,
                    averageResponseTime: responseTime / strategies.length,
                    queryOptimization: {
                        queryLength,
                        isShortQuery,
                        isExactMatch,
                        selectedStrategies: strategies
                    }
                },
                debug: searchResults
            };
        } catch (error) {
            const enhancedError = error instanceof Error ?
                new Error(`Smart search error: ${error.message}`) :
                new Error(`Unknown error in smart search for "${query}"`);

            throw enhancedError;
        }
    }

    /**
     * 聚合和去重搜索结果
     */
    private aggregateSearchResults(searchResults: any[], limit: number): any {
        const seenTitles = new Set<string>();
        const aggregatedResults: any[] = [];
        const strategyStats: { [key: string]: number } = {};

        // 按策略优先级处理结果 (opensearch > prefixsearch > fulltext)
        const priorityOrder = ['opensearch', 'prefixsearch', 'fulltext'];

        for (const strategy of priorityOrder) {
            const strategyResult = searchResults.find(r => r.strategy === strategy && !r.error);
            if (!strategyResult) continue;

            strategyStats[strategy] = 0;
            const results = strategyResult.results || [];

            for (const result of results) {
                if (seenTitles.has(result.title)) continue;
                if (aggregatedResults.length >= limit) break;

                seenTitles.add(result.title);
                aggregatedResults.push({
                    ...result,
                    source: strategy,
                    relevanceScore: this.calculateRelevanceScore(result, strategy)
                });
                strategyStats[strategy]++;
            }
        }

        // 按相关性排序
        aggregatedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

        return {
            results: aggregatedResults.slice(0, limit),
            total: aggregatedResults.length,
            strategyStats
        };
    }

    /**
     * 计算相关性评分
     */
    private calculateRelevanceScore(result: any, strategy: string): number {
        let score = 0;

        // 基础策略权重
        const strategyWeights: { [key: string]: number } = {
            'opensearch': 0.8,    // 高权重，因为是精确匹配
            'prefixsearch': 0.9,  // 最高权重，因为是前缀匹配
            'fulltext': 0.7       // 较低权重，因为可能包含不相关结果
        };

        score += strategyWeights[strategy] || 0.5;

        // 如果有API返回的评分，加入计算
        if (result.score) {
            score += result.score * 0.1;
        }

        // 页面大小权重 (较大的页面可能更重要)
        if (result.size && result.size > 1000) {
            score += 0.1;
        }

        return score;
    }
}