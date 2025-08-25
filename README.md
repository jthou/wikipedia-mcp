# Wikipedia MCP Server

一个基于 Model Context Protocol (MCP) 的 Wikipedia 内容抓取服务器，为 AI 助手提供搜索、读取 Wikipedia 页面内容的能力。

## 功能特性

- **🌍 Wikipedia 支持**: 专门支持 Wikipedia 内容抓取（英文、中文等多语言版本）
- **📋 实例列表**: 查看所有可用的 Wikipedia 实例
- **🔍 页面搜索**: 使用关键词搜索 Wikipedia 页面
- **⚡ 快速搜索**: 优化的快速建议搜索（<2秒响应）
- **🧠 智能搜索**: 多策略并行执行 + 结果聚合的综合搜索
- **📄 获取页面内容**: 检索特定页面的完整内容和元数据
- **💾 本地保存**: 按 wiki 分类自动保存抓取结果到本地目录
- **🛡️ 异常处理**: 完善的错误处理和友好提示
- **🌐 代理支持**: 可配置 HTTP/HTTPS 代理支持
- **📊 性能优化**: 内存缓存机制和智能策略选择

---

## 第一部分：部署与使用

### 环境要求

- Node.js 18+
- npm 或 yarn

### 快速安装

1. 克隆或下载此仓库
2. 安装依赖：
   ```bash
   npm install
   ```
3. 构建项目：
   ```bash
   npm run build
   ```

### 环境配置

创建 `.env` 文件（可选）：

```env
# Wikipedia API 端点（可选，使用默认配置即可）
WIKIPEDIA_EN_API=https://en.wikipedia.org/w/api.php
WIKIPEDIA_ZH_API=https://zh.wikipedia.org/w/api.php

# 可选：HTTP 代理配置
HTTP_PROXY=http://your-proxy-host:port
HTTPS_PROXY=http://your-proxy-host:port

# 可选：输出目录配置
WIKI_OUTPUT_DIR=/path/to/output/directory

# 可选：缓存管理配置
MAX_CACHED_FILES=100
MAX_FILE_AGE_DAYS=30

# 可选：网络超时配置（适应网络延迟）
API_TIMEOUT=10000
TEST_TIMEOUT=15000
```

### 在 Tencent CodeBuddy IDE 中使用

1. **打开 MCP 设置**
   - 在 CodeBuddy 中，点击设置 → MCP 服务器

2. **添加 Wikipedia MCP 服务器**
   ```json
   {
     "name": "wikipedia-mcp",
     "command": "node",
     "args": ["/path/to/your/wikipedia-mcp/build/index.js"],
     "env": {}
   }
   ```

3. **启用服务器**
   - 保存配置后，服务器将自动启动
   - 在 AI 对话中即可使用 Wikipedia 功能

### 在 VS Code 中使用

项目提供了多种在 VS Code 中配置 Wikipedia MCP 服务器的方式：

#### 方式1：使用工作区配置（推荐）

1. **打开工作区文件**
   ```bash
   # 在项目根目录打开工作区
   code wikipedia-mcp.code-workspace
   ```

2. **确保项目已构建**
   ```bash
   npm run build
   ```

3. **安装 MCP 扩展**
   - 工作区会自动推荐安装 `modelcontextprotocol.mcp` 扩展
   - 或手动在扩展市场搜索 "MCP" 安装

#### 方式2：全局用户配置

1. **打开 VS Code 设置**
   - 使用 `Ctrl/Cmd + ,` 打开设置
   - 点击右上角 "Open Settings (JSON)" 图标

2. **添加 MCP 服务器配置**
   ```json
   {
     "mcp.servers": {
       "wikipedia-mcp": {
         "command": "node",
         "args": [
           "/path/to/your/wikipedia-mcp/build/index.js"
         ]
       }
     }
   }
   ```

#### 方式3：项目特定配置

在项目 `.vscode/settings.json` 中添加：
```json
{
  "mcp.servers": {
    "wikipedia-mcp": {
      "command": "node",
      "args": [
        "./build/index.js"
      ],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

#### 验证配置

1. **重启 VS Code** 或重新加载窗口
2. **检查 MCP 状态** 在状态栏或命令面板中查看 MCP 服务器状态
3. **测试功能** 在 AI 助手对话中尝试使用以下命令：
   - "列出可用的 Wikipedia 实例"
   - "获取人工智能的 Wikipedia 页面"
   - "搜索机器学习相关的中文 Wikipedia 页面"

#### 故障排除

- **服务器启动失败**: 确保项目已构建 (`npm run build`) 且路径正确
- **工具不可用**: 确认 MCP 扩展已安装并启用
- **路径问题**: 使用绝对路径或确保工作目录正确设置

### 支持的 Wikipedia 实例

本项目专门针对 Wikipedia 内容抓取进行优化，支持以下 Wikipedia 语言版本：

| Wiki 实例 | 名称 | API 地址 | 说明 |
|-----------|------|--------|---------|
| `enwiki` | 英文维基百科 | https://en.wikipedia.org/w/api.php | 默认英文版本 |
| `zhwiki` | 中文维基百科 | https://zh.wikipedia.org/w/api.php | 简体中文版本 |

未来可以通过扩展 `wikiConfigs` 配置添加更多语言版本。

### 可用工具

| 工具名称 | 功能 | 参数 | 说明 |
|---------|------|------|--------|
| `list_wikipedia_wikis` | 列出所有可用 Wikipedia 实例 | 无 | 查看支持的 wiki 列表 |
| `get_wikipedia_page` | 获取 Wikipedia 页面内容 | `wiki`(必需), `title`(必需) | 支持元数据和本地保存 |
| `wiki_wikipedia_operation` | 执行 Wikipedia 操作 | `wiki`(必需), `action`(必需), `title`(必需), `limit`(可选) | 支持 get/search 操作 |
| `search_pages` | 搜索 Wikipedia 页面 | `wiki`(必需), `query`(必需), `limit`(可选) | 高级搜索功能 |
| `quick_search` | 快速搜索建议 | `wiki`(必需), `query`(必需), `limit`(可选) | 优化速度 < 2秒，适合实时建议 |
| `smart_search` | 智能综合搜索 | `wiki`(必需), `query`(必需), `options`(可选) | 多策略并行+结果聚合，最全面的搜索结果 |

### 使用示例

#### 1. 列出可用的 Wikipedia 实例
```
工具：list_wikipedia_wikis
返回：
- enwiki: https://en.wikipedia.org/w/api.php
- zhwiki: https://zh.wikipedia.org/w/api.php
```

#### 2. 获取特定页面内容
```
工具：get_wikipedia_page
参数：
- wiki: "enwiki"  # 或 "zhwiki"
- title: "Artificial intelligence"

结果：
- 页面内容保存到 .wikipedia_en/Artificial_intelligence.txt
- 元数据保存到 .wikipedia_en/.metadata/Artificial_intelligence.json
- 返回详细信息和统计数据
```

#### 3. 搜索 Wikipedia 页面
```
工具：search_pages
参数：
- wiki: "zhwiki"
- query: "人工智能"
- limit: 5

结果：返回排名前5的相关页面，包含摘要和评分
```

#### 4. 快速搜索建议（优化速度）
```
工具：quick_search
参数：
- wiki: "enwiki"
- query: "machine"
- limit: 8

结果：
- 响应时间 < 2秒
- 返回相关建议列表，包含标题、描述、URL
- 适合实时搜索建议场景
```

#### 5. 智能综合搜索（最全面结果）
```
工具：smart_search
参数：
- wiki: "enwiki"
- query: "deep learning"
- options: {
    limit: 15,
    includeFulltext: true,
    includePrefix: true,
    includeOpenSearch: true
  }

结果：
- 多策略并行执行：OpenSearch + PrefixSearch + FulltextSearch
- 结果聚合去重，按相关性排序
- 包含性能指标和策略统计信息
- 适合需要最全面搜索结果的场景
```

#### 4. 通用 Wikipedia 操作
```
工具：wiki_wikipedia_operation
获取页面：
- wiki: "enwiki"
- action: "get"
- title: "Machine learning"

搜索页面：
- wiki: "zhwiki"
- action: "search"
- title: "机器学习"
- limit: 10
```

### 本地保存机制

项目自动按 wiki 实例分类保存抓取的内容：

- **英文 Wikipedia**: `.wikipedia_en/` 目录
- **中文 Wikipedia**: `.wikipedia_zh/` 目录
- **元数据**: `.wikipedia_xx/.metadata/` 目录

每个文件包含：
- 页面内容（.txt 文件）
- 详细元数据（.json 文件）
- 自动清理旧文件（保留最近100个文件，30天内）

### 异常处理和边界情况

项目包含完善的异常处理机制：

#### 支持的异常类型
- **页面不存在**: 友好提示和建议
- **网络错误**: 自动重试和连接超时处理
- **API 限流**: 智能等待和重试机制
- **参数验证**: 严格的输入参数检查
- **代理问题**: 自动检测和配置建议

#### 特殊情况处理
- **页面重定向**: 自动跟随并提示重定向信息
- **消歧义页面**: 标记并提供相关链接
- **空搜索结果**: 提供搜索建议和替代方案
- **文件系统错误**: 自动创建目录和权限处理

---

## 第二部分：开发与测试配置

### 开发环境设置

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd mediawiki-mcp
   ```

2. **安装开发依赖**
   ```bash
   npm install
   ```

3. **开发模式构建**
   ```bash
   npm run build
   # 或监听模式
   npm run build -- --watch
   ```

### 项目结构

```
wikipedia-mcp/
├── src/
│   ├── index.ts          # 主服务器实现
│   ├── wiki-client.ts    # Wikipedia 客户端实现
│   ├── error-handler.ts  # 异常处理模块
│   └── constants.ts      # 常量定义
├── build/
│   └── index.js          # 编译后的 JavaScript
├── test/
│   ├── task1.sh          # 任务1测试脚本
│   ├── task2.sh          # 任务2测试脚本
│   ├── task3.sh          # 任务3测试脚本
│   ├── task4.sh          # 任务4测试脚本
│   ├── task5.sh          # 任务5测试脚本
│   ├── task6.sh          # 任务6测试脚本
│   └── regression.sh     # 回归测试脚本
├── .wikipedia_en/        # 英文 Wikipedia 内容缓存
├── .wikipedia_zh/        # 中文 Wikipedia 内容缓存
├── wikipedia-mcp.code-workspace  # VS Code 工作区配置
├── vscode-settings-example.json  # VS Code 用户设置示例
├── VSCODE_SETUP.md       # VS Code 详细配置指南
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript 配置
├── todo.md               # 任务列表和项目管理
├── .gitignore           # Git 忽略规则
└── README.md            # 项目文档
```

### 配置文件说明

项目包含多种 VS Code MCP 配置文件：

- **`wikipedia-mcp.code-workspace`** - VS Code 工作区配置文件，包含项目特定的 MCP 设置
- **`vscode-settings-example.json`** - 用户设置示例文件，展示如何在全局设置中配置 MCP
- **`VSCODE_SETUP.md`** - 详细的 VS Code 配置指南，包含故障排除

这些文件使得在不同场景下配置 VS Code MCP 服务器变得简单快捷。

### 测试配置

#### 1. 快速功能测试

```bash
# 测试服务器基本功能（列出 Wikipedia 实例）
node -e "
const { spawn } = require('child_process');
const server = spawn('node', ['build/index.js']);
setTimeout(() => {
  server.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: 'list_wikipedia_wikis', arguments: {} }
  }) + '\n');
}, 100);
server.stdout.on('data', (data) => {
  console.log('Response:', data.toString());
  server.kill();
});
"
```

#### 2. Wikipedia 页面抓取测试

```bash
# 测试英文 Wikipedia 页面读取
node -e "
const { spawn } = require('child_process');
const server = spawn('node', ['build/index.js']);
setTimeout(() => {
  server.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'get_wikipedia_page',
      arguments: { wiki: 'enwiki', title: 'Artificial intelligence' }
    }
  }) + '\n');
}, 100);
server.stdout.on('data', (data) => {
  const response = JSON.parse(data.toString());
  if (response.result) {
    console.log('✅ 成功获取页面内容');
    console.log('页面保存在 .wikipedia_en/ 目录');
  }
  server.kill();
});
"
```

#### 3. 中文 Wikipedia 搜索测试

```bash
# 测试中文维基百科搜索
node -e "
const { spawn } = require('child_process');
const server = spawn('node', ['build/index.js']);
setTimeout(() => {
  server.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'search_pages',
      arguments: { wiki: 'zhwiki', query: '人工智能', limit: 3 }
    }
  }) + '\n');
}, 100);
server.stdout.on('data', (data) => {
  const response = JSON.parse(data.toString());
  if (response.result) {
    console.log('✅ 成功搜索中文页面');
    console.log('搜索结果:', response.result.content[0].text);
  }
  server.kill();
});
"
```

#### 4. 自动化测试脚本

```bash
# 运行单个任务测试
cd test
./task1.sh  # 测试 list_wikipedia_wikis 工具
./task4.sh  # 测试 Wikipedia 页面抓取
./task5.sh  # 测试本地保存机制
./task6.sh  # 测试异常处理

# 运行完整回归测试
./regression.sh
```

#### 5. MCP Inspector 调试

```bash
# 启动 MCP Inspector（用于深入调试）
npx @modelcontextprotocol/inspector node build/index.js
```

### 代理环境配置

如果在需要代理的环境中开发：

```bash
# 设置代理环境变量
export HTTP_PROXY=http://your-proxy-host:port
export HTTPS_PROXY=http://your-proxy-host:port

# 构建和测试
npm run build
```

### 调试模式

启用详细日志：

```bash
DEBUG=mediawiki-mcp node build/index.js
```

### 常见开发问题

1. **TypeScript 编译错误**
   - 检查 `tsconfig.json` 配置
   - 确保所有依赖已安装

2. **代理连接问题**
   - 验证代理服务器是否运行
   - 检查代理 URL 格式
   - 确认 localhost 是否需要绕过代理

3. **MCP 协议调试**
   - 使用 MCP Inspector 工具
   - 检查 JSON-RPC 消息格式
   - 验证工具参数类型

### 故障排除

#### 常见问题

1. **list_wikipedia_wikis 工具无法使用**
   - 检查服务器是否正常启动
   - 确认构建成功：`npm run build`
   - 检查工具列表：发送 `tools/list` 请求

2. **Wikipedia 页面获取失败**
   - 检查网络连接
   - 验证 wiki 参数：必须为 `enwiki` 或 `zhwiki`
   - 检查页面标题拼写是否正确
   - 查看错误日志了解具体原因

3. **代理连接问题**
   - 确保代理服务器正在运行
   - 验证代理 URL 格式：`http://your-proxy-host:port`
   - 检查 localhost 是否需要绕过代理
   - 检查环境变量：`HTTP_PROXY`、`HTTPS_PROXY`

4. **本地保存问题**
   - 检查目录权限：确保可写入当前目录
   - 检查磁盘空间：确保有足够空间保存文件
   - 自定义输出目录：设置 `WIKI_OUTPUT_DIR` 环境变量

5. **搜索结果为空**
   - 检查搜索关键词拼写
   - 尝试使用更广泛的关键词
   - 检查 wiki 参数是否正确（中文关键词用 zhwiki）
   - 调整 limit 参数获取更多结果

6. **MCP 协议调试**
   - 使用 MCP Inspector 工具调试
   - 检查 JSON-RPC 消息格式
   - 验证工具参数类型和值

#### 调试模式

启用详细日志：

```bash
# 在 Linux/macOS 上
DEBUG=mediawiki-mcp node build/index.js

# 在 Windows 上
set DEBUG=mediawiki-mcp && node build/index.js
```

#### 性能优化

1. **缓存管理**
   - 调整最大缓存文件数：`MAX_CACHED_FILES=200`
   - 调整文件保留时间：`MAX_FILE_AGE_DAYS=60`
   - 定期清理老旧文件释放空间

2. **网络优化**
   - 使用稳定的代理服务器
   - 选择地理位置较近的 Wikipedia 服务器
   - 适当调整搜索结果数量减少网络延迟

### 贡献指南

1. Fork 项目仓库
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -m "Add new feature"`
4. 推送分支：`git push origin feature/new-feature`
5. 创建 Pull Request

## 许可证

MIT License - 详见 LICENSE 文件

## 技术支持

如有问题或疑问：
- 查看故障排除部分
- 参考 TESTING_GUIDE.md 中的详细测试示例
- 在项目仓库中提交 issue