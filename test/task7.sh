#!/bin/bash

# Task 7: Test documentation completeness and accuracy
# 验证文档内容完整性和准确性

echo "Testing task 7: Verify documentation completeness and accuracy"

# 设置颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试结果标记
TESTS_PASSED=0
TESTS_FAILED=0

# 检查函数
check_file_exists() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $description exists${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ $description missing${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

check_content_exists() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if [ -f "$file" ] && grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✅ $description found in $file${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ $description not found in $file${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

check_multiple_patterns() {
    local file=$1
    local description=$2
    shift 2
    local patterns=("$@")
    local all_found=true
    
    for pattern in "${patterns[@]}"; do
        if ! grep -q "$pattern" "$file" 2>/dev/null; then
            all_found=false
            break
        fi
    done
    
    if [ "$all_found" = true ]; then
        echo -e "${GREEN}✅ $description complete${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ $description incomplete${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "=========================================="
echo "🔍 Checking README.md documentation..."
echo "=========================================="

# 1. 检查基本文档文件存在
check_file_exists "../README.md" "Main documentation file"

# 2. 检查README.md标题更新
check_content_exists "../README.md" "Wikipedia MCP Server" "Updated title (Wikipedia MCP Server)"

# 3. 检查Wikipedia功能描述
check_multiple_patterns "../README.md" "Wikipedia feature descriptions" \
    "Wikipedia 支持" \
    "英文、中文等多语言版本" \
    "本地保存" \
    "异常处理"

# 4. 检查支持的Wikipedia实例列表
check_multiple_patterns "../README.md" "Supported Wikipedia instances" \
    "enwiki" \
    "zhwiki" \
    "英文维基百科" \
    "中文维基百科"

# 5. 检查工具列表更新
check_multiple_patterns "../README.md" "Tool documentation" \
    "list_wikipedia_wikis" \
    "get_wikipedia_page" \
    "wiki_wikipedia_operation" \
    "search_pages"

# 6. 检查工具使用示例
check_multiple_patterns "../README.md" "Tool usage examples" \
    "列出可用的 Wikipedia 实例" \
    "获取特定页面内容" \
    "搜索 Wikipedia 页面" \
    "通用 Wikipedia 操作"

# 7. 检查异常处理说明
check_multiple_patterns "../README.md" "Exception handling documentation" \
    "异常处理和边界情况" \
    "页面不存在" \
    "网络错误" \
    "代理问题" \
    "本地保存问题"

# 8. 检查测试配置更新
check_multiple_patterns "../README.md" "Test configuration" \
    "快速功能测试" \
    "Wikipedia 页面抓取测试" \
    "中文 Wikipedia 搜索测试" \
    "自动化测试脚本"

# 9. 检查项目结构更新
check_multiple_patterns "../README.md" "Project structure" \
    "wiki-client.ts" \
    "error-handler.ts" \
    "constants.ts" \
    ".wikipedia_en" \
    ".wikipedia_zh" \
    "todo.md"

# 10. 检查故障排除更新
check_multiple_patterns "../README.md" "Troubleshooting guide" \
    "list_wikipedia_wikis 工具无法使用" \
    "Wikipedia 页面获取失败" \
    "调试模式" \
    "性能优化"

echo ""
echo "=========================================="
echo "🔍 Checking project configuration files..."
echo "=========================================="

# 11. 检查关键项目文件存在
check_file_exists "../package.json" "Package configuration"
check_file_exists "../tsconfig.json" "TypeScript configuration"
check_file_exists "../todo.md" "Project task list"

# 12. 检查源代码文件存在
check_file_exists "../src/index.ts" "Main server implementation"
check_file_exists "../src/wiki-client.ts" "Wikipedia client implementation"
check_file_exists "../src/error-handler.ts" "Error handler module"
check_file_exists "../src/constants.ts" "Constants definition"

# 13. 检查测试脚本文件存在
check_file_exists "task1.sh" "Task 1 test script"
check_file_exists "task2.sh" "Task 2 test script"
check_file_exists "task3.sh" "Task 3 test script"
check_file_exists "task4.sh" "Task 4 test script"
check_file_exists "task5.sh" "Task 5 test script"
check_file_exists "task6.sh" "Task 6 test script"
check_file_exists "regression.sh" "Regression test script"

echo ""
echo "=========================================="
echo "🔍 Checking documentation consistency..."
echo "=========================================="

# 14. 检查工具列表与实际实现的一致性
if [ -f "../src/index.ts" ]; then
    # 检查实际实现的工具是否在文档中提到
    if grep -q "list_wikipedia_wikis" "../src/index.ts" && grep -q "list_wikipedia_wikis" "../README.md"; then
        echo -e "${GREEN}✅ list_wikipedia_wikis tool documented and implemented${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ list_wikipedia_wikis tool documentation mismatch${NC}"
        ((TESTS_FAILED++))
    fi
    
    if grep -q "get_wikipedia_page" "../src/index.ts" && grep -q "get_wikipedia_page" "../README.md"; then
        echo -e "${GREEN}✅ get_wikipedia_page tool documented and implemented${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ get_wikipedia_page tool documentation mismatch${NC}"
        ((TESTS_FAILED++))
    fi
    
    if grep -q "wiki_wikipedia_operation" "../src/index.ts" && grep -q "wiki_wikipedia_operation" "../README.md"; then
        echo -e "${GREEN}✅ wiki_wikipedia_operation tool documented and implemented${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ wiki_wikipedia_operation tool documentation mismatch${NC}"
        ((TESTS_FAILED++))
    fi
fi

# 15. 检查wiki配置与文档一致性
if [ -f "../src/index.ts" ]; then
    if grep -q "enwiki" "../src/index.ts" && grep -q "enwiki" "../README.md"; then
        echo -e "${GREEN}✅ enwiki configuration documented and implemented${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ enwiki configuration documentation mismatch${NC}"
        ((TESTS_FAILED++))
    fi
    
    if grep -q "zhwiki" "../src/index.ts" && grep -q "zhwiki" "../README.md"; then
        echo -e "${GREEN}✅ zhwiki configuration documented and implemented${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ zhwiki configuration documentation mismatch${NC}"
        ((TESTS_FAILED++))
    fi
fi

echo ""
echo "=========================================="
echo "📊 Documentation Test Summary"
echo "=========================================="

total_tests=$((TESTS_PASSED + TESTS_FAILED))
echo "Total tests run: $total_tests"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All documentation tests PASSED${NC}"
    echo -e "${GREEN}✅ Task 7 documentation is complete and accurate${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  Some documentation tests FAILED${NC}"
    echo -e "${RED}❌ Please fix documentation issues before proceeding${NC}"
    exit 1
fi