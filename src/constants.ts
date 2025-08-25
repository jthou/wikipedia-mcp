// 工具名称常量
export const TOOL_NAMES = {
  LIST_WIKIS: 'list_wikipedia_wikis',
  GET_PAGE: 'get_wikipedia_page',
  WIKI_OPERATION: 'wiki_wikipedia_operation',
  SEARCH_PAGES: 'search_pages',
  QUICK_SEARCH: 'quick_search',
  SMART_SEARCH: 'smart_search',
  NETWORK_DIAGNOSTIC: 'network_diagnostic'
} as const;

// 导出工具名称类型
export type ToolName = typeof TOOL_NAMES[keyof typeof TOOL_NAMES];

// 网络诊断相关常量
export const DIAGNOSTIC_CONSTANTS = {
  // 诊断级别
  LEVELS: {
    BASIC: 'basic',
    STANDARD: 'standard',
    DEEP: 'deep'
  },

  // 诊断目标
  TARGETS: {
    AUTO: 'auto',
    WIKIPEDIA: 'wikipedia',
    ENWIKI: 'enwiki',
    ZHWIKI: 'zhwiki',
    CUSTOM: 'custom'
  },

  // 诊断层次
  LAYERS: {
    ENVIRONMENT: 'environment',
    NETWORK: 'network',
    HTTP: 'http',
    API: 'api'
  },

  // 超时配置
  TIMEOUTS: {
    BASIC: 5000,    // 5秒
    STANDARD: 10000, // 10秒
    DEEP: 15000     // 15秒
  }
} as const;

// 网络诊断类型定义
export type DiagnosticLevel = typeof DIAGNOSTIC_CONSTANTS.LEVELS[keyof typeof DIAGNOSTIC_CONSTANTS.LEVELS];
export type DiagnosticTarget = typeof DIAGNOSTIC_CONSTANTS.TARGETS[keyof typeof DIAGNOSTIC_CONSTANTS.TARGETS];
export type DiagnosticLayer = typeof DIAGNOSTIC_CONSTANTS.LAYERS[keyof typeof DIAGNOSTIC_CONSTANTS.LAYERS];
