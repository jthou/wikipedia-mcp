# VS Code MCP 配置指南

本指南说明如何在 VS Code 中配置 Wikipedia MCP 服务器。

## 方式1：使用工作区配置（推荐用于项目开发）

1. **打开工作区文件**
   - 在 VS Code 中打开 `wikipedia-mcp.code-workspace` 文件
   - 选择 "Open Workspace" 

2. **确保项目已构建**
   ```bash
   npm run build
   ```

3. **安装 MCP 扩展**
   - 工作区会自动推荐安装 `modelcontextprotocol.mcp` 扩展
   - 或手动在扩展市场搜索 "MCP" 安装

## 方式2：全局用户配置

1. **打开 VS Code 设置**
   - `Ctrl/Cmd + ,` 打开设置
   - 点击右上角 "Open Settings (JSON)" 图标

2. **添加 MCP 服务器配置**
   ```json
   {
     "mcp.servers": {
       "wikipedia-mcp": {
         "command": "node",
         "args": [
           "/System/Volumes/Data/justin/dev/wikipedia-mcp/wikipedia-mcp/build/index.js"
         ]
       }
     }
   }
   ```

## 方式3：使用全局 MCP 配置文件

配置文件 `mcp-global-config.json` 已经包含了 `wikipedia-mcp` 服务器配置：

```json
"wikipedia-mcp": {
  "type": "stdio",
  "command": "node",
  "args": [
    "/System/Volumes/Data/justin/dev/wikipedia-mcp/wikipedia-mcp/build/index.js"
  ],
  "gallery": false
}
```

## 验证配置

1. **重启 VS Code** 或重新加载窗口
2. **检查 MCP 状态** 在 VS Code 状态栏或命令面板中查看 MCP 服务器状态
3. **测试功能** 在 AI 助手对话中尝试使用 Wikipedia 相关功能

## 可用的 Wikipedia MCP 工具

- `list_wikipedia_wikis` - 列出可用的 Wikipedia 实例
- `get_wikipedia_page` - 获取 Wikipedia 页面内容
- `wiki_wikipedia_operation` - 执行 Wikipedia 操作（获取/搜索）
- `search_pages` - 搜索 Wikipedia 页面

## 故障排除

1. **服务器启动失败**
   - 确保项目已正确构建：`npm run build`
   - 检查路径是否正确
   - 查看 VS Code 输出面板中的错误信息

2. **工具不可用**
   - 确认 MCP 扩展已安装并启用
   - 重启 VS Code
   - 检查服务器配置语法

3. **路径问题**
   - 使用绝对路径：`/System/Volumes/Data/justin/dev/wikipedia-mcp/wikipedia-mcp/build/index.js`
   - 或在工作区中使用相对路径：`./build/index.js`