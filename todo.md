- **总则，在执行后续任何任务之前，先完成以下操作：**
   - **🗂️ 项目管理规范**
     - 在新的 git 分支下执行任务，分支名称为 task1, task2, ...
     - 在执行新任务前，先执行之前所有测试脚本，确保全部通过
     - 新任务结束后，保留新任务测试脚本
     - 提交代码前，执行完整回归测试
   - **🔄 回归测试执行规范**
     - **执行位置**: 在项目根目录下运行，使用命令 `bash test/regression.sh`
     - **执行时机**: 
       - 开始新任务前：确保所有前置任务测试通过
       - 完成任务后：验证新功能不破坏现有功能
       - 提交代码前：确保整体项目质量
     - **测试脚本结构**: 
       - `test/regression.sh` - 主回归测试脚本
       - `test/task1.sh`, `test/task2.sh`, ... - 各任务测试脚本
       - 所有测试脚本需支持从项目根目录调用
     - **验收标准**: 
       - 所有测试必须100%通过（7/7 PASSED）
       - 任何失败的测试必须先修复才能继续开发
       - 测试输出需包含详细的成功/失败信息
   - **🧪 测试脚本规范**
     - 当前目录下 ./test 目录是测试脚本目录
     - 每个任务都有对应测试脚本：./test/task1.sh, ./test/task2.sh 等
     - 测试脚本可以是任何格式：bash, python, js, cjs 等
     - 临时脚本，放在 ./temp 目录
     - **./test/scripts** 目录专门存放 JavaScript 相关脚本文件（.js, .cjs, .jsx 等）
     - 测试脚本应使用自动化方式验证功能，避免交互式测试
   - **🔄 TDD开发流程**
     - **阶段1 - 需求澄清**：创建测试文件，明确输入输出和边界条件
     - **阶段2 - 基础框架**：搭建工具schema和函数框架，实现基本逻辑
     - **阶段3 - 测试驱动**：写详细测试用例（功能、边界、异常、集成）
     - **阶段4 - 实现完善**：完成核心算法，让所有测试通过
     - **阶段5 - 重构优化**：在测试保护下优化代码结构和性能
   - **⚠️ Git分支管理规范**
     - 禁止擅自删除开发分支（如 task1, task2, task3 等）
     - 分支删除操作必须先征得明确同意
     - 保留所有历史开发分支用于追溯和回滚
   - **🎯 项目范围**
     - 本项目专注于 Wikipedia 支持，不支持其他 MediaWiki 实例（如 jthou.com）
     - 支持的语言版本包括英语维基百科（enwiki）和中文维基百科（zhwiki）
[x] 任务1：添加 list_wikipedia_wikis 工具（详细设计）
  - 目标：
    - [x] 在 MCP Server 工具列表中实现 list_wikipedia_wikis 工具，能够正确输出所有可用 wiki 实例（仅包括 Wikipedia）。
    - [x] 工具输出需包含 wiki 名称和对应 API 地址。
  - 步骤：
    - [x] 在 src/index.ts 中补全/实现 list_wikipedia_wikis 相关 handler（handleListWikis），确保能遍历 wikiConfigs 并输出所有 wiki。
    - [x] 在工具 schema 中注册 list_wikipedia_wikis 工具，描述其输入输出。
    - [x] 在 server 的工具调用分发逻辑中实现 list_wikipedia_wikis 的分支。
    - [x] 保证 list_wikipedia_wikis 工具无参数输入，输出格式清晰（如代码 列表）。
    - [x] 支持后续扩展 wikiConfigs，能自动反映新增 wiki。
  - 测试要求：
    - [x] 创建测试脚本 test/task1.sh，调用 list_wikipedia_wikis 工具，验证输出内容是否包含所有 wiki。
    - [x] 测试 wikiConfigs 变更后，list_wikipedia_wikis 输出是否同步更新。
    - [x] 测试异常情况（如 wikiConfigs 为空时的输出）。
  - 测试步骤：
    1. 编写 Node.js 测试脚本（如 test/test_list_wikis.js）启动 MCP 服务器
    2. 脚本自动向服务器发送 JSON-RPC 请求，包括 tools/list 和 tools/call
    3. 脚本验证返回结果中包含 list_wikipedia_wikis 工具及所有 wiki 配置
    4. 在 test/task1.sh 中调用测试脚本并检查结果
  - 交付标准：
    - [x] 代码提交在 task1 分支。
    - [x] 测试脚本 test/task1.sh 可自动化验证。
    - [x] 通过所有回归测试。
[x] 任务2：删除不需要的功能（详细设计）
  - 目标：
    - [x] 移除 update_wikipedia_page、upload_wikipedia_file、upload_wikipedia_from_clipboard 等相关工具和实现代码。
    - [x] 清理 schema、工具列表和相关测试脚本，确保只保留抓取和查询相关功能。
  - 步骤：
    - [x] 在 src/index.ts 中删除 update_wikipedia_page、upload_wikipedia_file、upload_wikipedia_from_clipboard 相关 handler 和工具注册。
    - [x] 清理工具 schema，移除上述功能的 schema 定义。
    - [x] 在 server 的工具调用分发逻辑中移除相关分支。
    - [x] 删除或重命名相关测试脚本（如 test/task_update_page.sh、test/task_upload_file.sh）。
    - [x] 检查 README.md 和文档，移除不再支持的功能说明。
  - 测试要求：
    - [x] 创建测试脚本 test/task2.sh，验证 update_page、upload_file、upload_from_clipboard 等功能已无法调用。
    - [x] 验证工具列表和 schema 中无上述功能。
    - [x] 回归测试，确保剩余功能正常。
  - 测试步骤：
    1. 编写自动化测试脚本启动 MCP 服务器
    2. 脚本自动向服务器发送 tools/call 请求，尝试调用被移除的工具
    3. 验证服务器返回错误信息，表明工具不存在
    4. 在 test/task2.sh 中调用测试脚本并检查结果
  - 交付标准：
    - [x] 代码提交在 task2 分支。
    - [x] 测试脚本 test/task2.sh 可自动化验证。
    - [x] 通过所有回归测试。
[x] 任务3：支持 Wikipedia 配置（详细设计）
  - 目标：
    - [x] 在 wikiConfigs 中添加 en.wikipedia.org、zh.wikipedia.org 等 Wikipedia 配置项。
    - [x] list_wikis 工具能正确显示 Wikipedia 实例。（已完成）
  - 步骤：
    - [x] 在 src/index.ts 的 wikiConfigs 中补充 enwiki、zhwiki 等 Wikipedia API 地址。（已完成）
    - [x] 保证 Wikipedia 配置无需用户名密码，支持匿名访问。（已完成）
    - [x] 测试 list_wikis 工具输出是否包含 Wikipedia。（已完成）
    - [x] 预留扩展接口，方便后续添加更多 Wikipedia 语言版本。（已完成）
  - 测试要求：
    - [x] 创建测试脚本 test/task3.sh，验证 list_wikis 工具输出包含 Wikipedia。（已完成）
    - [x] 测试添加/删除 Wikipedia 配置后，输出是否同步更新。（已完成）
    - [x] 验证 Wikipedia 配置无需登录即可抓取。（已完成）
  - 测试步骤：
    1. 编写自动化测试脚本启动 MCP 服务器
    2. 脚本自动向服务器发送 tools/call 请求，调用 list_wikis 工具
    3. 验证返回结果中包含 enwiki 和 zhwiki 配置
    4. 在 test/task3.sh 中调用测试脚本并检查结果
  - 交付标准：
    - [x] 代码提交在 task3 分支。（已完成）
    - [x] 测试脚本 test/task3.sh 可自动化验证。（已完成）
    - [x] 通过所有回归测试。（已完成）
[x] 任务4：实现 Wikipedia 文章抓取（详细设计）
  - 目标：
    - [x] 支持通过 get_wikipedia_page、wiki_wikipedia_operation 等工具抓取 Wikipedia 文章内容。
    - [x] 工具能正确获取并输出 Wikipedia 页面内容。
  - 步骤：
    - [x] 修改/实现 get_wikipedia_page、wiki_wikipedia_operation 工具，支持 Wikipedia API。
    - [x] 兼容 Wikipedia 页面不存在、重定向、消歧义等特殊情况。
    - [x] 输出内容保存到本地指定目录，按 wiki 分类。
    - [x] 优化输出格式，便于后续处理和查阅。
  - 测试要求：
    - [x] 创建测试脚本 test/task4.sh，抓取 Wikipedia 文章并验证内容正确。
    - [x] 测试抓取不存在页面、重定向、消歧义等边界情况。
    - [x] 验证本地保存机制和输出格式。
  - 测试步骤：
    1. 编写自动化测试脚本启动 MCP 服务器
    2. 脚本自动向服务器发送 tools/call 请求，调用 get_wikipedia_page 工具获取 Wikipedia 页面
    3. 验证返回结果正确，并且内容已保存到指定目录
    4. 在 test/task4.sh 中调用测试脚本并检查结果
  - 交付标准：
    - [x] 代码提交在 task4 分支。
    - [x] 测试脚本 test/task4.sh 可自动化验证。
    - [x] 通过所有回归测试。
[x] 任务5：本地保存机制优化（详细设计）
  - 目标：
    - [x] 按 wiki 分类保存抓取结果（如 .wikipedia_en、.wikipedia_zh 等目录）。
    - [x] 文件命名规范，便于查找和管理。
    - [x] **技术实现：使用 MediaWiki REST API 和原生 fetch API
  - 步骤：
    - [x] 修改本地保存逻辑，按 wiki 名称自动分目录保存。
    - [x] 优化文件命名规则，避免重复和冲突。
    - [x] 支持自定义输出目录（如通过环境变量或参数指定）。
    - [x] 清理和归档旧的抓取结果，避免冗余。
    - [x] **利用 MediaWiki REST API 提供的丰富元数据改进文件组织。
  - 测试要求：
    - [x] 创建测试脚本 test/task5.sh，验证不同 wiki 抓取结果能正确分类保存。
    - [x] 测试文件命名规范和查找便捷性。
    - [x] 验证自定义输出目录功能。
  - 测试步骤：
    1. 编写自动化测试脚本启动 MCP 服务器
    2. 脚本自动向服务器发送 tools/call 请求，调用 get_wikipedia_page 工具获取不同 wiki 的页面
    3. 验证内容已按 wiki 分类保存到正确目录
    4. 在 test/task5.sh 中调用测试脚本并检查结果
  - 交付标准：
    - [x] 代码提交在 task5 分支。
    - [x] 测试脚本 test/task5.sh 可自动化验证。
    - [x] 通过所有回归测试。
[x] 任务6：异常与边界处理（详细设计）
  - 目标：
    - [x] 增加对 Wikipedia API 异常（如页面不存在、速率限制、网络错误等）的处理。
    - [x] 工具输出友好提示，便于定位问题。
  - 步骤：
    - [x] 优化 get_wikipedia_page、wiki_wikipedia_operation 等工具的异常捕获和处理逻辑。
    - [x] 针对页面不存在、重定向、消歧义、API限流、网络异常等情况分别处理。
    - [x] 输出详细错误信息和建议。
    - [x] 增加日志记录，便于排查问题。
  - 测试要求：
    - [x] 创建测试脚本 test/task6.sh，验证各种异常和边界情况的处理效果。
    - [x] 测试速率限制、网络断开、页面不存在等场景。
    - [x] 验证错误提示和日志输出。
  - 测试步骤：
    1. 编写自动化测试脚本模拟各种异常情况
    2. 脚本自动向服务器发送 tools/call 请求，测试异常处理
    3. 验证返回友好的错误信息和适当的日志记录
    4. 在 test/task6.sh 中调用测试脚本并检查结果
  - 交付标准：
    - [x] 代码提交在 task6 分支。
    - [x] 测试脚本 test/task6.sh 可自动化验证。
    - [x] 通过所有回归测试。
[x] 任务7：文档与说明更新（详细设计）
  - 目标：
    - [x] 更新 README.md，说明支持 Wikipedia 抓取。
    - [x] 列出所有支持的 wiki 实例和用法。
    - [x] 补充工具使用示例和常见问题说明。
  - 步骤：
    - [x] 修改 README.md，补充 Wikipedia 相关说明和配置方法。
    - [x] 列出所有 wikiConfigs 支持的 wiki 实例。
    - [x] 补充 list_wikipedia_wikis、get_wikipedia_page、wiki_wikipedia_operation 等工具的使用示例。
    - [x] 说明异常处理和边界情况。
    - [x] 更新测试脚本和开发流程说明。
  - 测试要求：
    - [x] 创建测试脚本 test/task7.sh，验证文档内容完整性和准确性。
    - [x] 检查 README.md 是否包含所有要求内容。
    - [x] 验证工具使用示例可复现。
  - 测试步骤：
    1. 编写自动化测试脚本检查文档内容
    2. 验证 README.md 中包含所有必要的信息和使用示例
    3. 验证文档中描述的功能与实际实现一致
    4. 在 test/task7.sh 中调用测试脚本并检查结果
  - 交付标准：
    - [x] 代码提交在 task7 分支。
    - [x] 测试脚本 test/task7.sh 可自动化验证。
    - [x] 通过所有回归测试。
[ ] 任务8：快速Wikipedia搜索接口优化（详细设计）
  - 目标：
    - [ ] 基于MediaWiki API设计多层次搜索体系，显著提升搜索速度和准确性。
    - [ ] 实现智能搜索策略，根据查询类型自动选择最优搜索方法。
    - [ ] 提供多种搜索模式满足不同使用场景的需求。
  - 技术架构设计：
    - **搜索策略层次**：
      1. **OpenSearch API** - 快速自动完成建议（最快，<200ms）
      2. **Prefix Search** - 精确标题前缀匹配（快速，准确）
      3. **Full-text Search** - 全文内容搜索（当前已有，功能完整）
      4. **Smart Search** - 智能综合搜索（多策略并行+结果聚合）
    - **性能优化策略**：
      - 并行请求多个MediaWiki搜索API
      - 智能结果去重、排序和聚合
      - 自适应搜索策略选择（根据查询长度、类型等）
      - 结果缓存机制（可选）
  - 步骤：
    - [ ] 在 src/wiki-client.ts 中实现新的搜索方法：
      - `openSearch()` - 使用 action=opensearch 实现快速建议
      - `prefixSearch()` - 使用 action=query&list=prefixsearch 实现前缀匹配
      - `smartSearch()` - 智能综合搜索，结合多种策略
    - [ ] 在 src/constants.ts 中添加新工具常量定义
    - [ ] 在 src/index.ts 中实现新的工具处理器：
      - `handleQuickSearch()` - 处理快速搜索请求
      - `handleSmartSearch()` - 处理智能搜索请求
    - [ ] 在 MCP Server 工具列表中注册新工具：
      - `quick_search` - 快速搜索工具
      - `smart_search` - 智能搜索工具
    - [ ] 优化现有 `search_pages` 工具的性能和功能
    - [ ] 实现统一的搜索结果格式和错误处理
  - 接口设计规范：
    - **quick_search 工具**：
      - 输入：wiki, query, limit(可选)
      - 输出：快速建议列表（标题、描述、URL）
      - 特点：极速响应，适合实时搜索建议
    - **smart_search 工具**：
      - 输入：wiki, query, options(可选配置)
      - 输出：综合搜索结果（全文+建议+前缀匹配）
      - 特点：最全面结果，智能策略选择
    - **统一结果格式**：
      - 包含搜索策略信息、结果统计、性能指标
      - 支持结果分类和相关性排序
      - 提供搜索建议和错误处理信息
  - 测试要求：
    - [ ] 创建测试脚本 test/task8.sh，验证所有新搜索功能的正确性和性能。
    - [ ] 测试不同查询类型的搜索效果（短查询、长查询、精确匹配、模糊搜索）。
    - [ ] 验证搜索性能指标（响应时间、结果质量、准确性）。
    - [ ] 测试异常情况处理（空查询、无结果、API错误等）。
    - [ ] 对比测试新旧搜索接口的性能差异。
  - 测试步骤：
    1. 编写自动化测试脚本启动 MCP 服务器
    2. 测试 quick_search 工具的响应速度和建议质量
    3. 测试 smart_search 工具的综合搜索能力
    4. 验证搜索结果的准确性和相关性
    5. 性能基准测试（搜索速度、并发处理能力）
    6. 在 test/task8.sh 中整合所有测试并输出性能报告
  - 验收标准：
    - [ ] quick_search 平均响应时间 < 500ms
    - [ ] smart_search 结果准确性 > 90%
    - [ ] 所有搜索工具支持 enwiki 和 zhwiki
    - [ ] 完善的错误处理和用户友好提示
    - [ ] 100% 测试覆盖率，包括边界情况
  - 交付标准：
    - [ ] 代码提交在 task8 分支。
    - [ ] 测试脚本 test/task8.sh 可自动化验证。
    - [ ] 通过所有回归测试（包括性能基准）。
    - [ ] 更新 README.md 包含新搜索功能说明和使用示例。