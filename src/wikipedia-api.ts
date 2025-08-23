/**
 * 直接使用Wikipedia API的实现
 * 替代nodemw库，更轻量、更直接
 */

export interface WikipediaConfig {
    apiUrl: string;
    language: string;
}

export class WikipediaAPI {
    private config: WikipediaConfig;

    constructor(config: WikipediaConfig) {
        this.config = config;
    }

    /**
     * 获取页面内容
     */
    async getPage(title: string): Promise<string> {
        try {
            const url = new URL(this.config.apiUrl);
            url.searchParams.set('action', 'query');
            url.searchParams.set('prop', 'extracts');
            url.searchParams.set('format', 'json');
            url.searchParams.set('titles', title);
            url.searchParams.set('explaintext', 'true');
            url.searchParams.set('exsectionformat', 'wiki');

            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(`Wikipedia API Error: ${data.error.info}`);
            }

            const pages = data.query?.pages;
            if (!pages) {
                throw new Error('No pages found in response');
            }

            const pageId = Object.keys(pages)[0];
            if (pageId === '-1') {
                throw new Error(`Page "${title}" not found`);
            }

            const page = pages[pageId];
            return page.extract || '';

        } catch (error) {
            console.error(`Error fetching page "${title}":`, error);
            throw error;
        }
    }

    /**
     * 获取页面内容和元数据
     */
    async getPageWithMetadata(title: string): Promise<{ content: string, metadata: any }> {
        try {
            const url = new URL(this.config.apiUrl);
            url.searchParams.set('action', 'query');
            url.searchParams.set('prop', 'extracts|info|revisions');
            url.searchParams.set('format', 'json');
            url.searchParams.set('titles', title);
            url.searchParams.set('explaintext', 'true');
            url.searchParams.set('exsectionformat', 'wiki');
            url.searchParams.set('inprop', 'url|displaytitle');
            url.searchParams.set('rvprop', 'timestamp|user|comment');
            url.searchParams.set('rvlimit', '1');

            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(`Wikipedia API Error: ${data.error.info}`);
            }

            const pages = data.query?.pages;
            if (!pages) {
                throw new Error('No pages found in response');
            }

            const pageId = Object.keys(pages)[0];
            if (pageId === '-1') {
                throw new Error(`Page "${title}" not found`);
            }

            const page = pages[pageId];
            const content = page.extract || '';

            const metadata = {
                title: page.title,
                displaytitle: page.displaytitle || page.title,
                url: page.fullurl,
                pageid: page.pageid,
                lastRevision: page.revisions?.[0] || null,
                language: this.config.language
            };

            return { content, metadata };

        } catch (error) {
            console.error(`Error fetching page with metadata "${title}":`, error);
            throw error;
        }
    }

    /**
     * 搜索页面
     */
    async searchPages(query: string, limit: number = 10): Promise<any[]> {
        try {
            const url = new URL(this.config.apiUrl);
            url.searchParams.set('action', 'query');
            url.searchParams.set('list', 'search');
            url.searchParams.set('format', 'json');
            url.searchParams.set('srsearch', query);
            url.searchParams.set('srlimit', limit.toString());
            url.searchParams.set('srprop', 'title|snippet|size|timestamp');

            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(`Wikipedia API Error: ${data.error.info}`);
            }

            return data.query?.search || [];

        } catch (error) {
            console.error(`Error searching for "${query}":`, error);
            throw error;
        }
    }

    /**
     * 获取随机页面
     */
    async getRandomPage(): Promise<{ title: string, content: string }> {
        try {
            // 首先获取随机页面标题
            const randomUrl = new URL(this.config.apiUrl);
            randomUrl.searchParams.set('action', 'query');
            randomUrl.searchParams.set('list', 'random');
            randomUrl.searchParams.set('format', 'json');
            randomUrl.searchParams.set('rnnamespace', '0'); // 只要主命名空间的文章
            randomUrl.searchParams.set('rnlimit', '1');

            const randomResponse = await fetch(randomUrl.toString());
            if (!randomResponse.ok) {
                throw new Error(`HTTP ${randomResponse.status}: ${randomResponse.statusText}`);
            }

            const randomData = await randomResponse.json();
            if (randomData.error) {
                throw new Error(`Wikipedia API Error: ${randomData.error.info}`);
            }

            const randomPages = randomData.query?.random;
            if (!randomPages || randomPages.length === 0) {
                throw new Error('No random page found');
            }

            const title = randomPages[0].title;
            const content = await this.getPage(title);

            return { title, content };

        } catch (error) {
            console.error('Error getting random page:', error);
            throw error;
        }
    }
}

/**
 * Wikipedia实例配置
 */
export const wikipediaConfigs = {
    enwiki: {
        apiUrl: 'https://en.wikipedia.org/w/api.php',
        language: 'en'
    },
    zhwiki: {
        apiUrl: 'https://zh.wikipedia.org/w/api.php',
        language: 'zh'
    }
};
