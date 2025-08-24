/**
 * 异常处理和错误管理模块
 * 为 Wikipedia MCP 提供统一的异常处理、友好错误信息和建议
 */

import * as winston from 'winston';

// 错误类型枚举
export enum ErrorType {
    PAGE_NOT_FOUND = 'PAGE_NOT_FOUND',
    INVALID_WIKI = 'INVALID_WIKI',
    MISSING_PARAMETERS = 'MISSING_PARAMETERS',
    NETWORK_ERROR = 'NETWORK_ERROR',
    RATE_LIMIT = 'RATE_LIMIT',
    API_ERROR = 'API_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    REDIRECT_ERROR = 'REDIRECT_ERROR',
    DISAMBIGUATION_PAGE = 'DISAMBIGUATION_PAGE',
    ACCESS_DENIED = 'ACCESS_DENIED',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// 错误严重性级别
export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

// 错误信息接口
export interface ErrorInfo {
    type: ErrorType;
    severity: ErrorSeverity;
    originalError: string;
    friendlyMessage: string;
    suggestion: string;
    technicalDetails?: string;
    retryable: boolean;
    timestamp: string;
    context?: Record<string, any>;
}

// 错误处理配置
const ERROR_CONFIGS: Record<ErrorType, Omit<ErrorInfo, 'originalError' | 'timestamp' | 'context'>> = {
    [ErrorType.PAGE_NOT_FOUND]: {
        type: ErrorType.PAGE_NOT_FOUND,
        severity: ErrorSeverity.LOW,
        friendlyMessage: '抱歉，找不到您请求的页面',
        suggestion: '请检查页面标题的拼写，或者尝试使用搜索功能查找相关内容。您也可以访问主页浏览热门文章。',
        retryable: false
    },
    [ErrorType.INVALID_WIKI]: {
        type: ErrorType.INVALID_WIKI,
        severity: ErrorSeverity.MEDIUM,
        friendlyMessage: '指定的 Wikipedia 实例不存在或不受支持',
        suggestion: '请使用 list_wikipedia_wikis 工具查看所有支持的 Wikipedia 实例，目前支持英文版(enwiki)和中文版(zhwiki)。',
        retryable: false
    },
    [ErrorType.MISSING_PARAMETERS]: {
        type: ErrorType.MISSING_PARAMETERS,
        severity: ErrorSeverity.MEDIUM,
        friendlyMessage: '请求参数不完整',
        suggestion: '请确保提供了所有必需的参数。使用 get_wikipedia_page 需要 wiki 和 title 参数，使用 search_pages 需要 wiki 和 query 参数。',
        retryable: false
    },
    [ErrorType.NETWORK_ERROR]: {
        type: ErrorType.NETWORK_ERROR,
        severity: ErrorSeverity.HIGH,
        friendlyMessage: '网络连接出现问题',
        suggestion: '请检查您的网络连接状态，如果问题持续存在，请稍后重试。如果您在使用代理，请检查代理配置是否正确。',
        retryable: true
    },
    [ErrorType.RATE_LIMIT]: {
        type: ErrorType.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        friendlyMessage: 'API 调用频率过高，请稍后重试',
        suggestion: '为了保护 Wikipedia 服务器，请降低请求频率。建议在请求之间添加 1-2 秒的间隔。',
        retryable: true
    },
    [ErrorType.API_ERROR]: {
        type: ErrorType.API_ERROR,
        severity: ErrorSeverity.HIGH,
        friendlyMessage: 'Wikipedia API 服务出现错误',
        suggestion: '这可能是临时的服务器问题。请稍后重试，如果问题持续存在，可能是 Wikipedia 服务器正在维护。',
        retryable: true
    },
    [ErrorType.VALIDATION_ERROR]: {
        type: ErrorType.VALIDATION_ERROR,
        severity: ErrorSeverity.LOW,
        friendlyMessage: '输入参数格式不正确',
        suggestion: '请检查输入参数的格式。标题不能为空，搜索限制应在 1-50 之间，wiki 实例名称应为 enwiki 或 zhwiki。',
        retryable: false
    },
    [ErrorType.REDIRECT_ERROR]: {
        type: ErrorType.REDIRECT_ERROR,
        severity: ErrorSeverity.LOW,
        friendlyMessage: '页面发生了重定向',
        suggestion: '页面已重定向到新位置，系统已自动跟随重定向。如果内容不符合预期，请检查是否使用了正确的页面标题。',
        retryable: false
    },
    [ErrorType.DISAMBIGUATION_PAGE]: {
        type: ErrorType.DISAMBIGUATION_PAGE,
        severity: ErrorSeverity.LOW,
        friendlyMessage: '这是一个消歧义页面',
        suggestion: '该标题对应多个不同的页面。请查看返回的消歧义内容，选择您需要的具体页面，然后使用更精确的标题重新请求。',
        retryable: false
    },
    [ErrorType.ACCESS_DENIED]: {
        type: ErrorType.ACCESS_DENIED,
        severity: ErrorSeverity.MEDIUM,
        friendlyMessage: '访问被拒绝',
        suggestion: '该页面可能受到保护或需要特殊权限。请尝试访问其他页面，或检查是否需要登录验证。',
        retryable: false
    },
    [ErrorType.TIMEOUT_ERROR]: {
        type: ErrorType.TIMEOUT_ERROR,
        severity: ErrorSeverity.HIGH,
        friendlyMessage: '请求超时',
        suggestion: '网络响应较慢，请检查网络连接并稍后重试。如果问题持续存在，可能是服务器负载过高。',
        retryable: true
    },
    [ErrorType.UNKNOWN_ERROR]: {
        type: ErrorType.UNKNOWN_ERROR,
        severity: ErrorSeverity.HIGH,
        friendlyMessage: '出现了未知错误',
        suggestion: '这是一个意外的错误。请重试操作，如果问题持续存在，请检查输入参数或联系支持。',
        retryable: true
    }
};

// 日志记录器配置
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// 错误处理器类
export class ErrorHandler {
    /**
     * 分析错误并返回结构化的错误信息
     */
    static analyzeError(error: unknown, context?: Record<string, any>): ErrorInfo {
        const timestamp = new Date().toISOString();
        const errorMessage = error instanceof Error ? error.message : String(error);

        // 分析错误类型
        const errorType = this.classifyError(errorMessage);
        const config = ERROR_CONFIGS[errorType];

        const errorInfo: ErrorInfo = {
            ...config,
            originalError: errorMessage,
            timestamp,
            context
        };

        // 添加技术细节（仅在调试模式下）
        if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
            errorInfo.technicalDetails = error instanceof Error ? error.stack : undefined;
        }

        return errorInfo;
    }

    /**
     * 根据错误消息分类错误类型
     */
    private static classifyError(errorMessage: string): ErrorType {
        const lowerMessage = errorMessage.toLowerCase();

        // 页面不存在
        if (lowerMessage.includes('does not exist') ||
            lowerMessage.includes('missing') ||
            lowerMessage.includes('not found') ||
            lowerMessage.includes('page not found')) {
            return ErrorType.PAGE_NOT_FOUND;
        }

        // 无效的wiki实例
        if (lowerMessage.includes('unknown wiki') ||
            lowerMessage.includes('invalid wiki')) {
            return ErrorType.INVALID_WIKI;
        }

        // 缺少参数
        if (lowerMessage.includes('required') ||
            lowerMessage.includes('missing parameter') ||
            lowerMessage.includes('parameters are required')) {
            return ErrorType.MISSING_PARAMETERS;
        }

        // 网络错误
        if (lowerMessage.includes('network') ||
            lowerMessage.includes('connection') ||
            lowerMessage.includes('fetch') ||
            lowerMessage.includes('enotfound') ||
            lowerMessage.includes('timeout')) {
            return ErrorType.NETWORK_ERROR;
        }

        // 速率限制
        if (lowerMessage.includes('rate limit') ||
            lowerMessage.includes('too many requests') ||
            lowerMessage.includes('429')) {
            return ErrorType.RATE_LIMIT;
        }

        // API错误
        if (lowerMessage.includes('api error') ||
            lowerMessage.includes('server error') ||
            lowerMessage.includes('500') ||
            lowerMessage.includes('502') ||
            lowerMessage.includes('503')) {
            return ErrorType.API_ERROR;
        }

        // 验证错误
        if (lowerMessage.includes('must be between') ||
            lowerMessage.includes('invalid format') ||
            lowerMessage.includes('validation')) {
            return ErrorType.VALIDATION_ERROR;
        }

        // 访问拒绝
        if (lowerMessage.includes('access denied') ||
            lowerMessage.includes('forbidden') ||
            lowerMessage.includes('401') ||
            lowerMessage.includes('403')) {
            return ErrorType.ACCESS_DENIED;
        }

        // 超时错误
        if (lowerMessage.includes('timeout') ||
            lowerMessage.includes('timed out')) {
            return ErrorType.TIMEOUT_ERROR;
        }

        return ErrorType.UNKNOWN_ERROR;
    }

    /**
     * 记录错误
     */
    static logError(errorInfo: ErrorInfo): void {
        const logData = {
            type: errorInfo.type,
            severity: errorInfo.severity,
            message: errorInfo.originalError,
            context: errorInfo.context,
            timestamp: errorInfo.timestamp
        };

        switch (errorInfo.severity) {
            case ErrorSeverity.CRITICAL:
                logger.error('Critical error occurred', logData);
                break;
            case ErrorSeverity.HIGH:
                logger.error('High severity error', logData);
                break;
            case ErrorSeverity.MEDIUM:
                logger.warn('Medium severity error', logData);
                break;
            case ErrorSeverity.LOW:
                logger.info('Low severity error', logData);
                break;
        }
    }

    /**
     * 生成用户友好的错误响应
     */
    static generateErrorResponse(error: unknown, context?: Record<string, any>): any {
        const errorInfo = this.analyzeError(error, context);
        this.logError(errorInfo);

        const response = {
            content: [{
                type: "text",
                text: `❌ ${errorInfo.friendlyMessage}\n\n💡 建议：${errorInfo.suggestion}`
            }]
        };

        // 在调试模式下添加技术细节
        if (errorInfo.technicalDetails && (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development')) {
            response.content.push({
                type: "text",
                text: `\n🔧 技术细节：\n${errorInfo.technicalDetails}`
            });
        }

        return response;
    }

    /**
     * 包装异步函数，自动处理异常
     */
    static wrapAsyncFunction<T extends any[], R>(
        fn: (...args: T) => Promise<R>,
        context?: Record<string, any>
    ): (...args: T) => Promise<R | any> {
        return async (...args: T) => {
            try {
                return await fn(...args);
            } catch (error) {
                return this.generateErrorResponse(error, context);
            }
        };
    }

    /**
     * 验证参数
     */
    static validateParameters(params: Record<string, any>, required: string[]): void {
        const missing = required.filter(param => !params[param] || String(params[param]).trim() === '');

        if (missing.length > 0) {
            throw new Error(`Missing required parameters: ${missing.join(', ')}`);
        }
    }

    /**
     * 验证wiki实例
     */
    static validateWiki(wiki: string, validWikis: string[]): void {
        if (!validWikis.includes(wiki)) {
            throw new Error(`Unknown wiki: ${wiki}. Supported wikis: ${validWikis.join(', ')}`);
        }
    }

    /**
     * 验证搜索限制
     */
    static validateSearchLimit(limit: number): void {
        if (limit <= 0 || limit > 50) {
            throw new Error('Search limit must be between 1 and 50');
        }
    }
}

export default ErrorHandler;