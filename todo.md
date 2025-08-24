- **总则，在执行后续任何任务之前，先完成以下操作：**
   - **🗂️ 项目管理规范**
     - 在新的 git 分支下执行任务，分支名称为 task1, task2, ...
     - 在执行新任务前，先执行之前所有测试脚本，确保全部通过
     - 新任务结束后，保留新任务测试脚本
     - 提交代码前，执行完整回归测试
   - **🧪 测试脚本规范**
     - 当前目录下 ./test 目录是测试脚本目录
     - 每个任务都有对应测试脚本：./test/task1.sh, ./test/task2.sh 等
     - 测试脚本可以是任何格式：bash, python, js, cjs 等
     - 临时脚本，放在 ./scripts 目录
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
     - **技术实现：使用 MediaWiki REST API 和原生 fetch API
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
    1. 编写 Node.js 测试脚本（如 test/test_list_wikipedia_wikis.js）启动 MCP 服务器
    2. 脚本自动向服务器发送 JSON-RPC 请求，包括 ListTools 和 callTool
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
    2. 脚本自动向服务器发送 callTool 请求，尝试调用被移除的工具
    3. 验证服务器返回错误信息，表明工具不存在
    4. 在 test/task2.sh 中调用测试脚本并检查结果
  - 交付标准：
    - [x] 代码提交在 task2 分支。
    - [x] 测试脚本 test/task2.sh 可自动化验证。
    - [x] 通过所有回归测试。
[x] 任务3：支持 Wikipedia 配置（详细设计）
  - 目标：
    - [x] 在 wikiConfigs 中添加 en.wikipedia.org、zh.wikipedia.org 等 Wikipedia 配置项。
    - [x] list_wikipedia_wikis 工具能正确显示 Wikipedia 实例。（已完成）
  - 步骤：
    - [x] 在 src/index.ts 的 wikiConfigs 中补充 enwiki、zhwiki 等 Wikipedia API 地址。（已完成）
    - [x] 保证 Wikipedia 配置无需用户名密码，支持匿名访问。（已完成）
    - [x] 测试 list_wikipedia_wikis 工具输出是否包含 Wikipedia。（已完成）
    - [x] 预留扩展接口，方便后续添加更多 Wikipedia 语言版本。（已完成）
  - 测试要求：
    - [x] 创建测试脚本 test/task3.sh，验证 list_wikipedia_wikis 工具输出包含 Wikipedia。（已完成）
    - [x] 测试添加/删除 Wikipedia 配置后，输出是否同步更新。（已完成）
    - [x] 验证 Wikipedia 配置无需登录即可抓取。（已完成）
  - 测试步骤：
    1. 编写自动化测试脚本启动 MCP 服务器
    2. 脚本自动向服务器发送 callTool 请求，调用 list_wikipedia_wikis 工具
    3. 验证返回结果中包含 enwiki 和 zhwiki 配置
    4. 在 test/task3.sh 中调用测试脚本并检查结果
  - 交付标准：
    - [x] 代码提交在 task3 分支。（已完成）
    - [x] 测试脚本 test/task3.sh 可自动化验证。（已完成）
    - [x] 通过所有回归测试。（已完成）
[ ] 任务4：添加环境配置和代理支持（详细设计）
  - 目标：
    - [ ] 在 index.ts 中集成 dotenv 支持，实现环境变量配置管理。
    - [ ] 将代理配置从硬编码改为 .env 文件配置，提高配置灵活性。
    - [ ] 支持 HTTP/HTTPS 代理配置，解决网络访问问题。
  - 步骤：
    - [ ] 安装 dotenv 依赖包到 package.json。
    - [ ] 在 src/index.ts 中导入并初始化 dotenv 配置。
    - [ ] 创建 .env.example 模板文件，包含代理配置示例。
    - [ ] 重写 WikipediaClient 类，使用原生 fetch API 和 MediaWiki REST API。
    - [ ] 从环境变量读取代理配置（HTTPS_PROXY, HTTP_PROXY）。
    - [ ] 添加环境变量验证和默认值处理逻辑。
    - [ ] 更新 .gitignore 确保 .env 文件不被提交。
  - 测试要求：
    - [ ] 创建测试脚本 test/task4.sh，验证环境变量配置生效。
    - [ ] 测试有代理和无代理两种情况下的 Wikipedia REST API 访问。
    - [ ] 验证 .env 文件配置正确读取和应用。
    - [ ] 测试环境变量缺失时的默认行为。
  - 测试步骤：
    1. 编写自动化测试脚本创建不同的 .env 配置文件
    2. 脚本自动启动 MCP 服务器并测试代理配置生效
    3. 验证有无代理配置时 Wikipedia REST API 调用的行为差异
    5. 在 test/task4.sh 中调用测试脚本并检查结果
  - 交付标准：
    - [ ] 代码提交在 task4 分支。
    - [ ] 测试脚本 test/task4.sh 可自动化验证。
    - [ ] 通过所有回归测试。
[ ] 任务5：Wikipedia API 基础连通性测试（详细设计）
  - 目标：
    - [ ] 验证 Wikipedia REST API 端点的基本可访问性和响应正常性。
    - [ ] 测试英文和中文 Wikipedia REST API 的连接状态。
    - [ ] 建立基础的 REST API 调用验证机制。
    - [ ] **确保完全基于 MediaWiki REST API，不依赖任何第三方库。**
  - 步骤：
    - [ ] 创建独立的 REST API 连通性测试脚本，直接调用 Wikipedia REST API 端点。
    - [ ] 测试 https://en.wikipedia.org/w/api.php 和 https://zh.wikipedia.org/w/api.php 的基本响应。
    - [ ] 使用简单的 REST API 查询（如 action=query&meta=siteinfo）验证 API 功能正常。
    - [ ] 检测代理配置对 REST API 访问的影响，记录网络环境要求。
    - [ ] 验证 REST API 返回格式和基本元数据正确性。
    - [ ] 测试错误处理（如无效请求、网络超时等情况）。
  - 测试要求：
    - [ ] 创建测试脚本 test/task5.sh，自动化验证两个 Wikipedia REST API 端点。
    - [ ] 测试有代理和无代理环境下的 REST API 访问成功率。
    - [ ] 验证 REST API 响应时间和数据格式符合预期。
    - [ ] 测试网络异常情况下的错误处理机制。
    - [ ] 确认使用原生 fetch API 实现，无第三方依赖。
  - 测试步骤：
    1. 编写简单的 HTTP 客户端脚本直接调用 Wikipedia REST API
    2. 使用 action=query&meta=siteinfo 获取站点基本信息
    3. 验证返回的 JSON 数据包含预期的站点元数据
    4. 测试不同网络环境（有/无代理）下的连接稳定性
    5. 确认实现完全基于原生 fetch API
    6. 在 test/task5.sh 中调用测试脚本并检查结果
  - 交付标准：
    - [ ] 代码提交在 task5 分支。
    - [ ] 测试脚本 test/task5.sh 可自动化验证。
    - [ ] 通过所有回归测试。
[ ] 任务6：实现 Wikipedia 文章抓取（详细设计）
  - 目标：
    - [ ] 支持通过 get_wikipedia_page、wiki_wikipedia_operation 等工具抓取 Wikipedia 文章内容。
    - [ ] 工具能正确获取并输出 Wikipedia 页面内容。
    - [ ] **完全基于 MediaWiki REST API 实现，不使用任何第三方库。**
  - 步骤：
    - [ ] 重写 get_wikipedia_page、wiki_wikipedia_operation 工具，使用 MediaWiki REST API。
    - [ ] 兼容 Wikipedia 页面不存在、重定向、消歧义等特殊情况。
    - [ ] 输出内容保存到本地指定目录，按 wiki 分类。
    - [ ] 优化输出格式，便于后续处理和查阅。
    - [ ] **确保所有网络请求都通过原生 fetch API 实现。**
  - 测试要求：
    - [ ] 创建测试脚本 test/task6.sh，抓取 Wikipedia 文章并验证内容正确。
    - [ ] 测试抓取不存在页面、重定向、消歧义等边界情况。
    - [ ] 验证本地保存机制和输出格式。
    - [ ] 确认使用 MediaWiki REST API 和原生 fetch API。
  - 测试步骤：
    1. 编写自动化测试脚本启动 MCP 服务器
    2. 脚本自动向服务器发送 callTool 请求，调用 get_wikipedia_page 工具获取 Wikipedia 页面
    3. 验证返回结果正确，并且内容已保存到指定目录
    4. 确认所有网络请求都通过原生 fetch API 和 MediaWiki REST API
    5. 在 test/task6.sh 中调用测试脚本并检查结果
  - 交付标准：
    - [ ] 代码提交在 task6 分支。
    - [ ] 测试脚本 test/task6.sh 可自动化验证。
    - [ ] 通过所有回归测试。
[ ] 任务7：本地保存机制优化（详细设计）
  - 目标：
    - [ ] 按 wiki 分类保存抓取结果（如 .wikipedia_en、.wikipedia_zh 等目录）。
    - [ ] 文件命名规范，便于查找和管理。
    - [ ] **基于 MediaWiki REST API 获取的元数据优化保存机制。**
  - 步骤：
    - [ ] 修改本地保存逻辑，按 wiki 名称自动分目录保存。
    - [ ] 优化文件命名规则，避免重复和冲突。
    - [ ] 支持自定义输出目录（如通过环境变量或参数指定）。
    - [ ] 清理和归档旧的抓取结果，避免冗余。
    - [ ] **利用 MediaWiki REST API 提供的丰富元数据改进文件组织。**
  - 测试要求：
    - [ ] 创建测试脚本 test/task7.sh，验证不同 wiki 抓取结果能正确分类保存。
    - [ ] 测试文件命名规范和查找便捷性。
    - [ ] 验证自定义输出目录功能。
  - 测试步骤：
    1. 编写自动化测试脚本启动 MCP 服务器
    2. 脚本自动向服务器发送 callTool 请求，调用 get_wikipedia_page 工具获取不同 wiki 的页面
    3. 验证内容已按 wiki 分类保存到正确目录
    4. 在 test/task7.sh 中调用测试脚本并检查结果
  - 交付标准：
    - [ ] 代码提交在 task7 分支。
    - [ ] 测试脚本 test/task7.sh 可自动化验证。
    - [ ] 通过所有回归测试。
[ ] 任务8：异常与边界处理（详细设计）
  - 目标：
    - [ ] 增加对 Wikipedia REST API 异常（如页面不存在、速率限制、网络错误等）的处理。
    - [ ] 工具输出友好提示，便于定位问题。
    - [ ] **针对 MediaWiki REST API 的特定错误响应进行优化处理。**
  - 步骤：
    - [ ] 优化 get_wikipedia_page、wiki_wikipedia_operation 等工具的异常捕获和处理逻辑。
    - [ ] 针对页面不存在、重定向、消歧义、API限流、网络异常等情况分别处理。
    - [ ] 输出详细错误信息和建议。
    - [ ] 增加日志记录，便于排查问题。
    - [ ] **处理 MediaWiki REST API 特有的错误代码和响应格式。**
  - 测试要求：
    - [ ] 创建测试脚本 test/task8.sh，验证各种异常和边界情况的处理效果。
    - [ ] 测试速率限制、网络断开、页面不存在等场景。
    - [ ] 验证错误提示和日志输出。
  - 测试步骤：
    1. 编写自动化测试脚本模拟各种异常情况
    2. 脚本自动向服务器发送 callTool 请求，测试异常处理
    3. 验证返回友好的错误信息和适当的日志记录
    4. 在 test/task8.sh 中调用测试脚本并检查结果
  - 交付标准：
    - [ ] 代码提交在 task8 分支。
    - [ ] 测试脚本 test/task8.sh 可自动化验证。
    - [ ] 通过所有回归测试。
[ ] 任务9：文档与说明更新（详细设计）
  - 目标：
    - [ ] 更新 README.md，说明支持 Wikipedia 抓取。
    - [ ] 列出所有支持的 wiki 实例和用法。
    - [ ] 补充工具使用示例和常见问题说明。
    - [ ] **强调基于 MediaWiki REST API 的原生实现优势。**
  - 步骤：
    - [ ] 修改 README.md，补充 Wikipedia 相关说明和配置方法。
    - [ ] 列出所有 wikiConfigs 支持的 wiki 实例。
    - [ ] 补充 list_wikipedia_wikis、get_wikipedia_page、wiki_wikipedia_operation 等工具的使用示例。
    - [ ] 说明异常处理和边界情况。
    - [ ] 更新测试脚本和开发流程说明。
    - [ ] **说明移除 nodemw 库，改用 MediaWiki REST API 的技术决策和优势。**
  - 测试要求：
    - [ ] 创建测试脚本 test/task9.sh，验证文档内容完整性和准确性。
    - [ ] 检查 README.md 是否包含所有要求内容。
    - [ ] 验证工具使用示例可复现。
  - 测试步骤：
    1. 编写自动化测试脚本检查文档内容
    2. 验证 README.md 中包含所有必要的信息和使用示例
    3. 验证文档中描述的功能与实际实现一致
    4. 在 test/task9.sh 中调用测试脚本并检查结果
  - 交付标准：
    - [ ] 代码提交在 task9 分支。
    - [ ] 测试脚本 test/task9.sh 可自动化验证。
    - [ ] 通过所有回归测试。