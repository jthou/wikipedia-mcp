#!/usr/bin/env node

/**
 * 声呐技术知识库一体化下载工具
 * 使用已验证的直接API方法，集成配置和下载功能
 * 整合了原本的三个脚本文件功能
 */

const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');
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
  
  // 领域文章（扩充版本）
  domains: {
    core: {
      name: "核心声呐技术",
      weight: 1.0,
      articles: ["Sonar", "Active sonar", "Passive sonar", "Sonar dome", "Transducer", "Beam forming", "Sonar signal processing"]
    },
    hardware: {
      name: "传感器硬件", 
      weight: 0.8,
      articles: ["Hydrophone", "Sonar transducer", "Towed array sonar", "Variable depth sonar", "Hull-mounted sonar", "Acoustic antenna"]
    },
    apps: {
      name: "应用领域",
      weight: 0.9,
      articles: ["Bathymetry", "Side-scan sonar", "Multibeam echosounder", "Fish finder", "Naval sonar", "Commercial sonar", "Geological survey"]
    },
    acoustics: {
      name: "水下声学",
      weight: 0.7,
      articles: ["Underwater acoustics", "Acoustic positioning system", "Sound Surveillance System", "Acoustic signature", "Acoustic torpedo", "Sound channel", "Acoustic propagation"]
    },
    bio: {
      name: "生物声学",
      weight: 0.6,
      articles: ["Echolocation", "Biosonar", "Animal echolocation", "Dolphin echolocation", "Bat echolocation", "Marine mammal acoustics"]
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
      ...options
    };
    
    this.agent = new HttpsProxyAgent('http://localhost:7890');
    this.results = { success: [], failed: [] };
  }

  log(message, level = 'info') {
    if (level === 'verbose' && !this.options.verbose) return;
    console.log(message);
  }

  async downloadArticle(title) {
    this.log(`📄 下载: ${title}`, 'verbose');
    
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=${encodeURIComponent(title)}&rvprop=content&rvslots=*&format=json`;
      
      const data = await new Promise((resolve, reject) => {
        const req = https.request(url, { 
          agent: this.agent,
          headers: {
            'User-Agent': 'Wikipedia-MCP-Client/1.0 (https://github.com/user/wikipedia-mcp; user@example.com)',
            'Accept': 'application/json'
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve(data);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
            }
          });
        });
        
        req.on('error', reject);
        req.setTimeout(15000, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
        req.end();
      });
      
      const parsed = JSON.parse(data);
      const pages = parsed.query?.pages;
      
      if (pages) {
        const page = Object.values(pages)[0];
        if (page && !page.missing) {
          const content = page.revisions?.[0]?.slots?.main?.['*'];
          if (content) {
            // 保存文件
            const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
            const filename = `${sanitizedTitle}.txt`;
            const filepath = path.join(this.options.output, filename);
            
            fs.writeFileSync(filepath, content, 'utf8');
            
            this.log(`   ✅ ${title} (${Math.round(content.length / 1024)}KB)`);
            this.results.success.push({ 
              title, 
              filename, 
              size: content.length,
              timestamp: new Date().toISOString() 
            });
            return true;
          }
        }
      }
      
      this.log(`   ❌ ${title} - 无内容`);
      this.results.failed.push({ title, error: 'No content found' });
      return false;
      
    } catch (error) {
      this.log(`   ❌ ${title} - ${error.message}`);
      this.results.failed.push({ title, error: error.message });
      return false;
    }
  }

  async run() {
    try {
      // 创建输出目录
      if (!fs.existsSync(this.options.output)) {
        fs.mkdirSync(this.options.output, { recursive: true });
      }
      
      // 获取配置
      const profile = SONAR_CONFIG.profiles[this.options.profile] || SONAR_CONFIG.profiles.full;
      const targetDomains = profile.domains;
      const maxArticles = this.options.max || profile.max;
      
      this.log('🔬 声呐技术知识库下载器');
      this.log('='.repeat(50));
      this.log(`📋 研究档案: ${profile.name}`);
      this.log(`📈 最大文章数: ${maxArticles}`);
      this.log(`🎯 目标领域: ${targetDomains.map(d => SONAR_CONFIG.domains[d]?.name).join(', ')}`);
      this.log(`📂 输出目录: ${this.options.output}`);
      this.log('='.repeat(50));
      this.log('');
      
      let downloaded = 0;
      
      // 按领域下载
      for (const domainKey of targetDomains) {
        if (downloaded >= maxArticles) break;
        
        const domain = SONAR_CONFIG.domains[domainKey];
        if (!domain) continue;
        
        this.log(`📚 ${domain.name}:`);
        
        for (const article of domain.articles) {
          if (downloaded >= maxArticles) break;
          
          const success = await this.downloadArticle(article);
          if (success) downloaded++;
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        this.log('');
      }
      
      this.log('🎉 下载完成！');
      this.log(`✅ 成功: ${this.results.success.length}篇`);
      this.log(`❌ 失败: ${this.results.failed.length}篇`);
      this.log(`🏆 成功率: ${Math.round((this.results.success.length / (this.results.success.length + this.results.failed.length)) * 100)}%`);
      
      // 生成报告
      const report = {
        timestamp: new Date().toISOString(),
        profile: profile.name,
        config: this.options,
        summary: {
          requested: maxArticles,
          successful: this.results.success.length,
          failed: this.results.failed.length,
          success_rate: Math.round((this.results.success.length / (this.results.success.length + this.results.failed.length)) * 100)
        },
        domains: targetDomains.map(key => ({
          key,
          name: SONAR_CONFIG.domains[key]?.name,
          articles: SONAR_CONFIG.domains[key]?.articles
        })),
        results: this.results
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
    }
  }
}

// 显示帮助
function showHelp() {
  console.log(`
🔬 声呐技术知识库下载工具

用法: node sonar_downloader.cjs [选项]

选项:
  --profile PROFILE    研究档案 (full|engineering|basic) [默认: full]
  --max NUMBER         最大下载数量 [默认: 25]
  --output DIR         输出目录 [默认: .wikipedia_en]
  --verbose            详细输出
  --help              显示帮助

研究档案:
  full        完整研究 (25篇) - 所有声呐技术领域
  engineering 工程重点 (15篇) - 核心技术+硬件+应用
  basic       基础研究 (10篇) - 理论基础+生物声学

示例:
  node sonar_downloader.cjs
  node sonar_downloader.cjs --profile engineering --max 12
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