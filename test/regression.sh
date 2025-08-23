#!/bin/bash

# 回归测试脚本 - 运行所有已完成的任务测试

echo "🧪 Starting regression tests for completed tasks..."
echo "=================================================="

# 计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 函数：运行单个测试
run_test() {
    local test_name="$1"
    local test_script="$2"
    
    echo ""
    echo "🔍 Running $test_name..."
    echo "----------------------------------------"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if $test_script; then
        echo "✅ $test_name PASSED"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo "❌ $test_name FAILED"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# 运行所有测试
run_test "Task 1" "./test/task1.sh"
run_test "Task 2" "./test/task2.sh"
run_test "Task 3" "./test/task3.sh"

# 总结
echo ""
echo "=================================================="
echo "📊 Regression Test Summary"
echo "=================================================="
echo "Total tests run: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo "🎉 All regression tests PASSED!"
    echo "✅ Ready to proceed with next tasks"
    exit 0
else
    echo ""
    echo "⚠️  Some regression tests FAILED"
    echo "❌ Please fix failing tests before proceeding"
    exit 1
fi
