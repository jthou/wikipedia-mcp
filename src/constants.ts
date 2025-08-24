// 工具名称常量
export const TOOL_NAMES = {
    LIST_WIKIS: 'list_wikipedia_wikis',
    GET_PAGE: 'get_wikipedia_page',
    WIKI_OPERATION: 'wiki_wikipedia_operation'
} as const;

// 导出工具名称类型
export type ToolName = typeof TOOL_NAMES[keyof typeof TOOL_NAMES];
