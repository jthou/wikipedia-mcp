#!/usr/bin/env node

/**
 * 声呐技术知识库一体化下载工具
 * 使用MCP服务器的get_wikipedia_page接口下载MediaWiki格式内容
 * 整合了原本的三个脚本文件功能
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 声呐技术领域配置（内置，整合自sonar_research_config.json）
const SONAR_CONFIG = {
  // 研究档案
  profiles: {
    full: { 
      name: "完整研究", 
      max: 25, 
      domains: ["core", "hardware", "apps", "acoustics", "bio"],
      description: "全面的声呐技术知识库"
    },
    engineering: { 
      name: "工程重点", 
      max: 15, 
      domains: ["core", "hardware", "apps"],
      description: "专注于工程实现和硬件"
    },
    basic: { 
      name: "基础研究", 
      max: 10, 
      domains: ["acoustics", "bio", "core"],
      description: "声学基础和理论研究"
    }
  },
  
  // 领域文章（扩充版本，支持中英文）
  domains: {
    core: {
      name: "核心声呐技术",
      weight: 1.0,
      articles: {
        en: ["Sonar", "Active sonar", "Passive sonar", "Sonar dome", "Transducer", "Beam forming", "Sonar signal processing"],
        zh: ["声呐", "主动声呐", "被动声呐", "换能器", "波束成形", "水声定位"]
      }
    },
    hardware: {
      name: "传感器硬件", 
      weight: 0.8,
      articles: {
        en: ["Hydrophone", "Sonar transducer", "Towed array sonar", "Variable depth sonar", "Hull-mounted sonar", "Acoustic antenna"],
        zh: ["水听器", "声呐换能器", "拖曳阵声呐", "变深声呐"]
      }
    },
    apps: {
      name: "应用领域",
      weight: 0.9,
      articles: {
        en: ["Bathymetry", "Side-scan sonar", "Multibeam echosounder", "Fish finder", "Naval sonar", "Commercial sonar", "Geological survey"],
        zh: ["测深法", "侧扫声呐", "多波束测深", "探鱼器", "军用声呐"]
      }
    },
    acoustics: {
      name: "水下声学",
      weight: 0.7,
      articles: {
        en: ["Underwater acoustics", "Acoustic positioning system", "Sound Surveillance System", "Acoustic signature", "Acoustic torpedo", "Sound channel", "Acoustic propagation"],
        zh: ["水下声学", "声学定位系统", "声学鱼雷", "声传播"]
      }
    },
    bio: {
      name: "生物声学",
      weight: 0.6,
      articles: {
        en: ["Echolocation", "Biosonar", "Animal echolocation", "Dolphin echolocation", "Bat echolocation", "Marine mammal acoustics"],
        zh: ["回声定位", "生物声呐", "动物回声定位", "海豚回声定位", "蝙蝠回声定位"]
      }
    }
  },
  
  // 下载设置
  settings: {
    default_format: "mediawiki",
    include_metadata: true,
    retry_attempts: 3,
    delay_between_requests: 1000,
    min_content_length: 1000
  }
};

class SonarDownloader {
  constructor(options = {}) {
    this.options = {
      profile: options.profile || 'full',
      max: options.max || 25,
      output: options.output || '.wikipedia_en',
      verbose: options.verbose || false,
      language: options.language || 'en', // 新增语言配置
      ...options
    };
    
    this.results = { success: [], failed: [] };
    this.server = null;
    this.messageId = 1;
  }

  log(message, level = 'info') {
    if (level === 'verbose' && !this.options.verbose) return;
    console.log(message);
  }

  /**
   * 启动MCP服务器
   */
  startMcpServer() {
    const serverPath = path.join(__dirname, '..', 'build', 'index.js');
    
    if (!fs.existsSync(serverPath)) {
      throw new Error(`MCP服务器文件不存在: ${serverPath}`);
    }
    
    this.log('🚀 启动MCP服务器...', 'verbose');
    
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.dirname(serverPath)
    });
    
    this.server = server;
    
    server.stderr.on('data', (data) => {
      this.log(`MCP错误: ${data.toString()}`, 'verbose');
    });
    
    return server;
  }

  /**
   * 创建JSON-RPC请求
   */
  createJsonRpcRequest(method, params = {}) {
    return {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: method,
      params: params
    };
  }

  /**
   * 发送请求到MCP服务器
   */
  async sendRequest(request) {
    return new Promise((resolve, reject) => {
      if (!this.server || !this.server.stdin) {
        reject(new Error('MCP服务器未启动'));
        return;
      }
      
      const requestStr = JSON.stringify(request) + '\n';
      
      // 设置响应处理器
      const onData = (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const response = JSON.parse(line);
            if (response.id === request.id) {
              this.server.stdout.removeListener('data', onData);
              
              if (response.error) {
                reject(new Error(response.error.message || 'MCP请求失败'));
              } else {
                resolve(response);
              }
              return;
            }
          } catch (e) {
            // 忽略解析错误，可能是部分数据
          }
        }
      };
      
      this.server.stdout.on('data', onData);
      
      // 发送请求
      this.server.stdin.write(requestStr);
      
      // 设置更长的超时时间（60秒）
      setTimeout(() => {
        this.server.stdout.removeListener('data', onData);
        reject(new Error('MCP请求超时'));
      }, 60000); // 60秒超时
    });
  }

  async downloadArticle(title) {
    this.log(`📄 下载: ${title}`, 'verbose');
    
    try {
      // 设置wiki语言
      const wiki = this.options.language === 'zh' ? 'zhwiki' : 'enwiki';
      
      const downloadRequest = this.createJsonRpcRequest('tools/call', {
        name: 'get_wikipedia_page',
        arguments: {
          wiki: wiki,
          title: title,
          save_to_file: false // 我们自己处理文件保存
        }
      });

      const response = await this.sendRequest(downloadRequest);
      
      // 检查MCP服务器是否返回错误
      if (response.error) {
        this.log(`   ❌ ${title} - ${response.error.message || 'MCP服务器错误'}`);
        this.results.failed.push({ title, error: response.error.message || 'MCP服务器错误' });
        return false;
      }
      
      // 修复：正确处理MCP服务器返回的页面内容
      if (response.result && response.result.content && response.result.content.length > 0) {
        // 直接获取页面内容
        let content = '';
        let isErrorMessage = false;
        let errorMessage = '';
        
        // 遍历返回的内容，找到真正的页面内容
        for (const item of response.result.content) {
          if (item.type === 'text' && item.text) {
            // 检查是否是错误消息
            if (item.text.includes('Page does not exist') || 
                item.text.includes('Page "') && item.text.includes('" does not exist') ||
                item.text.includes('Error:') ||
                item.text.includes('网络连接出现问题') ||
                item.text.includes('抱歉，找不到您请求的页面') ||
                item.text.includes('Connection reset') ||
                item.text.includes('DNS resolution failed')) {
              isErrorMessage = true;
              // 提取更友好的错误消息
              if (item.text.includes('Page does not exist') || item.text.includes('找不到您请求的页面')) {
                errorMessage = '页面不存在';
              } else if (item.text.includes('网络连接出现问题') || item.text.includes('Connection reset') || item.text.includes('DNS resolution failed')) {
                errorMessage = '网络连接问题';
              } else {
                errorMessage = item.text;
              }
              break;
            }
            // 检查是否是真正的页面内容
            else if (!item.text.includes('Successfully retrieved page') && 
                     !item.text.includes('Content saved to') &&
                     !item.text.includes('does not exist')) {
              content = item.text;
            }
          }
        }
        
        // 如果是错误消息，直接处理错误
        if (isErrorMessage) {
          this.log(`   ❌ ${title} - ${errorMessage}`);
          this.results.failed.push({ title, error: errorMessage });
          return false;
        }
        
        // 检查是否有有效内容
        if (content && content.trim().length > 50) { // 至少要有50个字符才认为是有效内容
          // 检查是否是简单重定向页面
          const isSimpleRedirect = content.trim().startsWith('#重定向') || content.trim().startsWith('#REDIRECT');
          
          if (isSimpleRedirect) {
            // 尝试提取重定向目标
            const redirectMatch = content.match(/\[\[([^\]]+)\]\]/);
            if (redirectMatch) {
              const redirectTarget = redirectMatch[1];
              this.log(`   🔄 跟随重定向: ${title} → ${redirectTarget}`);
              return await this.downloadArticle(redirectTarget);
            }
            // 如果是重定向但没有找到目标，视为失败
            this.log(`   ❌ ${title} - 重定向页面无目标`);
            this.results.failed.push({ title, error: 'Redirect page with no target' });
            return false;
          }
          
          // 保存文件
          const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
          const filename = `${sanitizedTitle}.txt`;
          const filepath = path.join(this.options.output, filename);
          
          // 确保输出目录存在
          if (!fs.existsSync(this.options.output)) {
            fs.mkdirSync(this.options.output, { recursive: true });
          }
          
          fs.writeFileSync(filepath, content, 'utf8');
          
          this.log(`   ✅ ${title} (${Math.round(content.length / 1024)}KB)`);
          this.results.success.push({ 
            title: title,
            filename, 
            size: content.length,
            timestamp: new Date().toISOString() 
          });
          return true;
        } else if (content && content.trim().length > 0) {
          // 检查是否是MCP的响应消息，尝试从文件中读取内容
          for (const item of response.result.content) {
            if (item.type === 'text' && item.text) {
              const match = item.text.match(/Content saved to: (.+)/);
              if (match) {
                const filePath = match[1];
                if (fs.existsSync(filePath)) {
                  content = fs.readFileSync(filePath, 'utf8');
                  break;
                }
              }
            }
          }
          
          // 如果成功读取到内容，保存它
          if (content && content.trim().length > 50) {
            // 检查是否是简单重定向页面
            const isSimpleRedirect = content.trim().startsWith('#重定向') || content.trim().startsWith('#REDIRECT');
            
            if (isSimpleRedirect) {
              // 尝试提取重定向目标
              const redirectMatch = content.match(/\[\[([^\]]+)\]\]/);
              if (redirectMatch) {
                const redirectTarget = redirectMatch[1];
                this.log(`   🔄 跟随重定向: ${title} → ${redirectTarget}`);
                return await this.downloadArticle(redirectTarget);
              }
              // 如果是重定向但没有找到目标，视为失败
              this.log(`   ❌ ${title} - 重定向页面无目标`);
              this.results.failed.push({ title, error: 'Redirect page with no target' });
              return false;
            }
            
            // 保存文件
            const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
            const filename = `${sanitizedTitle}.txt`;
            const filepath = path.join(this.options.output, filename);
            
            // 确保输出目录存在
            if (!fs.existsSync(this.options.output)) {
              fs.mkdirSync(this.options.output, { recursive: true });
            }
            
            fs.writeFileSync(filepath, content, 'utf8');
            
            this.log(`   ✅ ${title} (${Math.round(content.length / 1024)}KB)`);
            this.results.success.push({ 
              title: title,
              filename, 
              size: content.length,
              timestamp: new Date().toISOString() 
            });
            return true;
          } else {
            this.log(`   ❌ ${title} - 无有效内容`);
            this.results.failed.push({ title, error: 'No valid content found' });
            return false;
          }
        } else {
          this.log(`   ❌ ${title} - 无有效内容`);
          this.results.failed.push({ title, error: 'No valid content found' });
          return false;
        }
      }
      
      this.log(`   ❌ ${title} - 无内容`);
      this.results.failed.push({ title, error: 'No content found' });
      return false;
      
    } catch (error) {
      // 添加更详细的错误信息
      this.log(`   ❌ ${title} - ${error.message}`);
      this.results.failed.push({ title, error: error.message });
      return false;
    }
  }

  async run() {
    try {
      // 启动MCP服务器
      this.log('🚀 启动MCP服务器...', 'verbose');
      this.startMcpServer();
      
      // 等待服务器启动
      this.log('⏳ 等待MCP服务器启动...', 'verbose');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 初始化MCP服务器
      this.log('🔧 初始化MCP服务器...', 'verbose');
      const initRequest = this.createJsonRpcRequest('initialize', {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "sonar-downloader",
          version: "1.0.0"
        }
      });
      
      await this.sendRequest(initRequest);
      this.log('✅ MCP服务器初始化成功\n', 'verbose');
      
      // 创建输出目录
      if (!fs.existsSync(this.options.output)) {
        fs.mkdirSync(this.options.output, { recursive: true });
      }
      
      // 获取配置
      const profile = SONAR_CONFIG.profiles[this.options.profile] || SONAR_CONFIG.profiles.full;
      const targetDomains = profile.domains;
      const maxArticles = this.options.max || profile.max;
      
      this.log('🔬 声呐技术知识库下载器 (MCP版本)');
      this.log('='.repeat(50));
      this.log(`📋 研究档案: ${profile.name}`);
      this.log(`📈 最大文章数: ${maxArticles}`);
      this.log(`🎯 目标领域: ${targetDomains.map(d => SONAR_CONFIG.domains[d]?.name).join(', ')}`);
      this.log(`📂 输出目录: ${this.options.output}`);
      this.log(`🌐 语言版本: ${this.options.language === 'zh' ? '中文' : '英文'}`);
      this.log(`🔧 下载方式: MCP服务器`);
      this.log('='.repeat(50));
      this.log('');
      
      let downloaded = 0;
      
      // 按领域下载
      for (const domainKey of targetDomains) {
        if (downloaded >= maxArticles) break;
        
        const domain = SONAR_CONFIG.domains[domainKey];
        if (!domain) continue;
        
        this.log(`📚 ${domain.name}:`);
        
        // 遍历该领域的文章
        const articles = domain.articles[this.options.language] || domain.articles['en'] || [];
        for (const article of articles) {
          if (downloaded >= maxArticles) break;
          
          this.log(`🔍 准备下载: ${article}`, 'verbose');
          const success = await this.downloadArticle(article);
          if (success) downloaded++;
          
          // 添加延迟以避免过于频繁的请求
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        this.log('');
      }
      
      this.log('🎉 下载完成！');
      this.log(`✅ 成功: ${this.results.success.length}篇`);
      this.log(`❌ 失败: ${this.results.failed.length}篇`);
      this.log(`🏆 成功率: ${Math.round((this.results.success.length / (this.results.success.length + this.results.failed.length || 1)) * 100)}%`);
      
      // 生成报告
      const report = {
        timestamp: new Date().toISOString(),
        profile: profile.name,
        config: this.options,
        downloadMethod: 'MCP Server',
        summary: {
          requested: maxArticles,
          successful: this.results.success.length,
          failed: this.results.failed.length,
          success_rate: Math.round((this.results.success.length / (this.results.success.length + this.results.failed.length || 1)) * 100)
        },
        domains: targetDomains.map(key => ({
          key,
          name: SONAR_CONFIG.domains[key]?.name,
          articles: SONAR_CONFIG.domains[key]?.articles
        })),
        results: {
          success: this.results.success,
          failed: this.results.failed
        }
      };
      
      fs.writeFileSync('sonar_download_report.json', JSON.stringify(report, null, 2));
      this.log(`📊 报告已保存: sonar_download_report.json`);
      
      // 检查文件
      if (fs.existsSync(this.options.output)) {
        const files = fs.readdirSync(this.options.output);
        this.log(`📁 ${this.options.output}/ 目录中有 ${files.length} 个文件`);
      }
      
    } catch (error) {
      this.log(`❌ 下载失败: ${error.message}`);
    } finally {
      // 关闭MCP服务器
      if (this.server) {
        this.server.kill();
        this.log('🔚 MCP服务器已关闭', 'verbose');
      }
    }
  }
}

// 显示帮助
function showHelp() {
  console.log(`
🔬 声呐技术知识库下载工具 (MCP版本)

用法: node sonar_downloader.cjs [选项]

选项:
  --profile PROFILE    研究档案 (full|engineering|basic) [默认: full]
  --max NUMBER         最大下载数量 [默认: 25]
  --output DIR         输出目录 [默认: .wikipedia_en]
  --language LANG      语言版本 (en|zh) [默认: en]
  --verbose            详细输出
  --help              显示帮助

研究档案:
  full        完整研究 (25篇) - 所有声呐技术领域
  engineering 工程重点 (15篇) - 核心技术+硬件+应用
  basic       基础研究 (10篇) - 理论基础+生物声学

语言选项:
  en          英文版 Wikipedia (默认)
  zh          中文版 Wikipedia

下载方式:
  🔧 使用MCP服务器的get_wikipedia_page接口
  📖 确保下载正宗的MediaWiki格式内容

示例:
  node sonar_downloader.cjs
  node sonar_downloader.cjs --language zh --output .wikipedia_zh
  node sonar_downloader.cjs --profile engineering --max 12 --language zh
  node sonar_downloader.cjs --verbose --output ./my_sonar_wiki
`);
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = args[i + 1];
    
    switch (arg) {
      case '--profile':
        options.profile = value;
        i++;
        break;
      case '--max':
        options.max = parseInt(value);
        i++;
        break;
      case '--output':
        options.output = value;
        i++;
        break;
      case '--language':
        options.language = value;
        i++;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          console.log(`未知选项: ${arg}`);
          console.log('使用 --help 查看帮助');
          process.exit(1);
        }
    }
  }
  
  return options;
}

// 主函数
async function main() {
  const options = parseArgs();
  const downloader = new SonarDownloader(options);
  await downloader.run();
}

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('❌ 程序异常:', error.message);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n👋 用户中断');
  process.exit(0);
});

// 启动
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  });
}

module.exports = { SonarDownloader, SONAR_CONFIG };