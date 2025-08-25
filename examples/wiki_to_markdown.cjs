#!/usr/bin/env node

/**
 * MediaWiki格式到Markdown格式转换工具
 * 将Wikipedia下载的WikiText内容转换为标准Markdown格式
 * 保持文件名一致，仅改变后缀名为.md
 */

const fs = require('fs');
const path = require('path');

class WikiToMarkdownConverter {
  constructor(options = {}) {
    this.options = {
      inputDir: options.inputDir || '.wikipedia_en',
      outputDir: options.outputDir || '.wikipedia_markdown',
      preserveOriginal: options.preserveOriginal !== false,
      verbose: options.verbose || false,
      ...options
    };
  }

  log(message, level = 'info') {
    if (level === 'verbose' && !this.options.verbose) return;
    console.log(message);
  }

  /**
   * 转换WikiText为Markdown
   * @param {string} wikiText - 原始WikiText内容
   * @returns {string} - 转换后的Markdown内容
   */
  convertWikiToMarkdown(wikiText) {
    let markdown = wikiText;

    // 1. 处理标题 (== 标题 == -> ## 标题)
    markdown = markdown.replace(/^====(.+?)====/gm, '#### $1');
    markdown = markdown.replace(/^===(.+?)===/gm, '### $1');
    markdown = markdown.replace(/^==(.+?)==/gm, '## $1');

    // 2. 处理内部链接 ([[链接|显示文本]] -> [显示文本](链接))
    markdown = markdown.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '[$2]($1)');
    markdown = markdown.replace(/\[\[([^\]]+)\]\]/g, '[$1]($1)');

    // 3. 处理外部链接 ([URL 显示文本] -> [显示文本](URL))
    markdown = markdown.replace(/\[([^\s]+)\s+([^\]]+)\]/g, '[$2]($1)');

    // 4. 处理文件引用 ([[File:xxx]] -> ![xxx](xxx))
    markdown = markdown.replace(/\[\[File:([^|\]]+)([^\]]*)\]\]/g, '![File: $1](File:$1)');
    markdown = markdown.replace(/\[\[Image:([^|\]]+)([^\]]*)\]\]/g, '![Image: $1](Image:$1)');

    // 5. 处理模板 ({{模板名|参数}} -> **模板：模板名**)
    markdown = markdown.replace(/\{\{([^|}]+)([^}]*)\}\}/g, '**Template: $1**');

    // 6. 处理粗体和斜体
    markdown = markdown.replace(/'''(.+?)'''/g, '**$1**');
    markdown = markdown.replace(/''(.+?)''/g, '*$1*');

    // 7. 处理引用 (<ref>...</ref> -> [^ref])
    let refCounter = 1;
    markdown = markdown.replace(/<ref[^>]*>([^<]*)<\/ref>/g, (match, content) => {
      return `[^${refCounter++}]`;
    });
    markdown = markdown.replace(/<ref[^>]*\/>/g, `[^${refCounter++}]`);

    // 8. 处理HTML标签
    markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
    markdown = markdown.replace(/<\/?[^>]+>/g, '');

    // 9. 处理列表
    markdown = markdown.replace(/^\*+\s(.+)$/gm, '- $1');
    markdown = markdown.replace(/^#+\s(.+)$/gm, (match, content, offset, string) => {
      const level = match.match(/^#+/)[0].length;
      return `${' '.repeat((level - 1) * 2)}1. ${content}`;
    });

    // 10. 处理表格（简化处理）
    markdown = markdown.replace(/\{\|([^}]*)\|\}/gs, (match) => {
      return '| Table Content |\n|---------------|\n';
    });

    // 11. 清理多余的空行
    markdown = markdown.replace(/\n{3,}/g, '\n\n');

    // 12. 清理行首行尾空格
    markdown = markdown.split('\n').map(line => line.trim()).join('\n');

    return markdown;
  }

  /**
   * 处理单个文件
   * @param {string} inputFile - 输入文件路径
   * @param {string} outputFile - 输出文件路径
   */
  async convertFile(inputFile, outputFile) {
    try {
      this.log(`📄 转换: ${path.basename(inputFile)}`, 'verbose');
      
      const wikiText = fs.readFileSync(inputFile, 'utf8');
      const markdown = this.convertWikiToMarkdown(wikiText);
      
      // 确保输出目录存在
      const outputDir = path.dirname(outputFile);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      fs.writeFileSync(outputFile, markdown, 'utf8');
      
      this.log(`   ✅ ${path.basename(outputFile)} (${Math.round(markdown.length / 1024)}KB)`);
      return true;
    } catch (error) {
      this.log(`   ❌ ${path.basename(inputFile)} - ${error.message}`);
      return false;
    }
  }

  /**
   * 批量转换目录中的所有文件
   */
  async convertDirectory() {
    try {
      if (!fs.existsSync(this.options.inputDir)) {
        throw new Error(`输入目录不存在: ${this.options.inputDir}`);
      }

      const files = fs.readdirSync(this.options.inputDir)
        .filter(file => file.endsWith('.txt'))
        .sort();

      if (files.length === 0) {
        this.log('❌ 输入目录中没有找到.txt文件');
        return;
      }

      this.log('📚 MediaWiki到Markdown转换工具');
      this.log('='.repeat(50));
      this.log(`📂 输入目录: ${this.options.inputDir}`);
      this.log(`📂 输出目录: ${this.options.outputDir}`);
      this.log(`📄 找到文件: ${files.length}个`);
      this.log('='.repeat(50));
      this.log('');

      let successCount = 0;
      let failCount = 0;

      for (const file of files) {
        const inputFile = path.join(this.options.inputDir, file);
        const baseName = path.basename(file, '.txt');
        const outputFile = path.join(this.options.outputDir, `${baseName}.md`);
        
        const success = await this.convertFile(inputFile, outputFile);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      this.log('');
      this.log('🎉 转换完成！');
      this.log(`✅ 成功: ${successCount}个文件`);
      this.log(`❌ 失败: ${failCount}个文件`);
      this.log(`🏆 成功率: ${Math.round((successCount / (successCount + failCount)) * 100)}%`);
      this.log(`📁 Markdown文件保存在: ${this.options.outputDir}/`);

    } catch (error) {
      this.log(`❌ 转换失败: ${error.message}`);
    }
  }

  /**
   * 转换单个文件
   * @param {string} inputFile - 输入文件路径
   */
  async convertSingleFile(inputFile) {
    try {
      if (!fs.existsSync(inputFile)) {
        throw new Error(`输入文件不存在: ${inputFile}`);
      }

      const inputDir = path.dirname(inputFile);
      const baseName = path.basename(inputFile, '.txt');
      const outputFile = path.join(inputDir, `${baseName}.md`);

      this.log('📚 MediaWiki到Markdown转换工具');
      this.log('='.repeat(50));
      this.log(`📄 输入文件: ${inputFile}`);
      this.log(`📄 输出文件: ${outputFile}`);
      this.log('='.repeat(50));
      this.log('');

      const success = await this.convertFile(inputFile, outputFile);
      
      if (success) {
        this.log('\n🎉 转换完成！');
        this.log(`📁 Markdown文件: ${outputFile}`);
      } else {
        this.log('\n❌ 转换失败');
      }

    } catch (error) {
      this.log(`❌ 转换失败: ${error.message}`);
    }
  }
}

// 显示帮助
function showHelp() {
  console.log(`
📚 MediaWiki到Markdown转换工具

用法: node wiki_to_markdown.cjs [选项] [文件]

选项:
  --input DIR          输入目录 [默认: .wikipedia_en]
  --output DIR         输出目录 [默认: .wikipedia_markdown]
  --file FILE          转换单个文件
  --verbose            详细输出
  --help              显示帮助

转换功能:
  - WikiText标题 (==) -> Markdown标题 (##)
  - 内部链接 [[]] -> [文本](链接)
  - 外部链接 [] -> [文本](URL)
  - 文件引用 [[File:]] -> ![](图片)
  - 模板语法 {{}} -> **Template:**
  - 粗体/斜体 '''/'' -> **/
  - HTML标签清理
  - 列表格式转换

示例:
  node wiki_to_markdown.cjs                                    # 转换默认目录
  node wiki_to_markdown.cjs --input ./wiki --output ./md      # 指定目录
  node wiki_to_markdown.cjs --file ./Sonar.txt               # 转换单个文件
  node wiki_to_markdown.cjs --verbose                        # 详细输出
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
      case '--input':
        options.inputDir = value;
        i++;
        break;
      case '--output':
        options.outputDir = value;
        i++;
        break;
      case '--file':
        options.singleFile = value;
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
        } else if (!options.singleFile) {
          // 如果没有使用--file参数，将其作为单个文件处理
          options.singleFile = arg;
        }
    }
  }
  
  return options;
}

// 主函数
async function main() {
  const options = parseArgs();
  const converter = new WikiToMarkdownConverter(options);
  
  if (options.singleFile) {
    await converter.convertSingleFile(options.singleFile);
  } else {
    await converter.convertDirectory();
  }
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

module.exports = { WikiToMarkdownConverter };