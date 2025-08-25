#!/bin/bash

# 测试任务9：网络连接诊断工具

echo "Testing task 9: Network connection diagnostic tool"

# 先构建项目
echo "Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Task 9 FAILED: Build failed"
    exit 1
fi

echo "开始网络连接诊断工具测试..."

# 创建测试脚本
cat > test/scripts/task9_test.js << 'EOF'
#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Testing task 9: Network connection diagnostic tool');

// 测试配置
const testConfigs = [
    {
        name: "基础网络诊断测试",
        description: "验证基础网络连接诊断功能",
        tests: [
            {
                name: "基础诊断测试",
                tool: "network_diagnostic",
                args: { 
                    target: "auto", 
                    level: "basic", 
                    timeout: 5000 
                },
                expectations: {
                    responseTime: 12000, // ms - 适应网络延迟增加超时
                    hasEnvironmentCheck: true,
                    hasNetworkCheck: true,
                    hasAnalysis: true,
                    hasRecommendations: true
                }
            },
            {
                name: "Wikipedia诊断测试",
                tool: "network_diagnostic", 
                args: { 
                    target: "wikipedia", 
                    level: "standard", 
                    timeout: 10000 
                },
                expectations: {
                    responseTime: 18000, // ms - 适应网络延迟增加超时
                    hasEnvironmentCheck: true,
                    hasNetworkCheck: true,
                    hasHTTPCheck: true,
                    hasAPICheck: true,
                    hasAnalysis: true
                }
            }
        ]
    },
    {
        name: "深度诊断测试",
        description: "验证深度网络诊断和性能分析功能",
        tests: [
            {
                name: "深度诊断测试",
                tool: "network_diagnostic",
                args: {
                    target: "enwiki",
                    level: "deep",
                    timeout: 15000
                },
                expectations: {
                    responseTime: 25000, // ms - 适应网络延迟增加超时
                    hasPerformanceMetrics: true,
                    hasDetailedAnalysis: true,
                    hasRecommendations: true,
                    hasDiagnosticSummary: true
                }
            }
        ]
    },
    {
        name: "边界条件测试",
        description: "测试异常情况和边界条件处理",
        tests: [
            {
                name: "无效目标测试",
                tool: "network_diagnostic",
                args: { 
                    target: "invalid_target", 
                    level: "basic", 
                    timeout: 5000 
                },
                expectError: true,
                errorMessage: "不支持的诊断目标"
            },
            {
                name: "无效级别测试",
                tool: "network_diagnostic",
                args: { 
                    target: "auto", 
                    level: "invalid_level", 
                    timeout: 5000 
                },
                expectError: true,
                errorMessage: "不支持的诊断级别"
            },
            {
                name: "超时测试",
                tool: "network_diagnostic",
                args: { 
                    target: "auto", 
                    level: "basic", 
                    timeout: 0 
                },
                expectError: true,
                errorMessage: "超时时间必须大于0"
            }
        ]
    }
];

// 测试统计
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const diagnosticResults = [];

// 测试工具函数
async function runSingleTest(testConfig, test) {
    totalTests++;
    
    console.log(`\n=== ${test.name} ===`);
    console.log(`描述: ${testConfig.description}`);
    
    return new Promise((resolve) => {
        // 启动MCP服务器
        const server = spawn('node', ['build/index.js'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let allOutput = '';
        let testPassed = false;
        let testResult = {};

        // 监听输出
        server.stdout.on('data', (data) => {
            allOutput += data.toString();
            
            // 检查是否收到完整的JSON响应
            if (allOutput.includes('"jsonrpc":"2.0"') && allOutput.includes('"id":1')) {
                // 立即处理响应
                setTimeout(() => {
                    if (!testResult.processed) {
                        testResult.processed = true;
                        clearTimeout(timeout);
                        server.kill();
                        
                        const responseTime = Date.now() - testResult.startTime;
                        testResult.responseTime = responseTime;
                        
                        // 分析测试结果
                        try {
                            const success = analyzeTestResult(test, allOutput, responseTime);
                            if (success) {
                                console.log(`✅ ${test.name} - PASSED (${responseTime}ms)`);
                                passedTests++;
                                testPassed = true;
                                
                                // 记录诊断数据
                                diagnosticResults.push({
                                    test: test.name,
                                    tool: test.tool,
                                    responseTime: responseTime,
                                    target: test.args.target,
                                    level: test.args.level
                                });
                            } else {
                                console.log(`❌ ${test.name} - FAILED`);
                                failedTests++;
                            }
                        } catch (error) {
                            console.log(`❌ ${test.name} - FAILED: ${error.message}`);
                            failedTests++;
                        }
                        
                        resolve(testPassed);
                    }
                }, 100); // 短暂延迟确保数据完整
            }
        });

        server.stderr.on('data', (data) => {
            allOutput += data.toString();
        });

        // 动态超时，适应诊断级别，增加额外缓冲时间
        const timeoutDuration = test.args.timeout + 8000; // 额外8秒缓冲
        const timeout = setTimeout(() => {
            server.kill();
            console.log(`❌ ${test.name} - FAILED: Timeout (${timeoutDuration}ms)`);
            failedTests++;
            resolve(false);
        }, timeoutDuration);

        // 发送测试请求
        setTimeout(() => {
            testResult.startTime = Date.now();
            const request = JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'tools/call',
                params: { 
                    name: test.tool, 
                    arguments: test.args 
                }
            }) + '\n';
            
            server.stdin.write(request);
        }, 1000);
    });
}

// 分析测试结果
function analyzeTestResult(test, output, responseTime) {
    // 检查是否期望错误
    if (test.expectError) {
        const hasError = output.includes('error') || output.includes('Error');
        const hasExpectedMessage = test.errorMessage ? output.includes(test.errorMessage) : true;
        return hasError && hasExpectedMessage;
    }
    
    // 检查是否有成功响应
    if (!output.includes('"result"')) {
        console.log(`  调试信息: 未找到结果响应`);
        return false;
    }

    const expectations = test.expectations;
    if (!expectations) return true;

    // 响应时间检查（仅警告，不视为错误）
    if (expectations.responseTime && responseTime > expectations.responseTime) {
        console.log(`  ⚠️  性能警告: ${responseTime}ms > ${expectations.responseTime}ms (仅提示，不影响测试结果)`);
        // 不返回false，继续测试
    }

    try {
        // 解析JSON响应
        const jsonMatch = output.match(/\{"result".*?\}(?=\n|$)/);
        if (!jsonMatch) {
            console.log(`  调试信息: 无法解析JSON响应`);
            return false;
        }

        const result = JSON.parse(jsonMatch[0]);
        const content = result.result?.content?.[0]?.text || '';
        
        // 诊断内容检查
        if (expectations.hasEnvironmentCheck && !content.includes('环境层诊断') && !content.includes('Environment Layer')) {
            console.log(`  诊断检查失败: 缺少环境层诊断信息`);
            return false;
        }

        if (expectations.hasNetworkCheck && !content.includes('网络层诊断') && !content.includes('Network Layer')) {
            console.log(`  诊断检查失败: 缺少网络层诊断信息`);
            return false;
        }

        if (expectations.hasHTTPCheck && !content.includes('HTTP层诊断') && !content.includes('HTTP Layer')) {
            console.log(`  诊断检查失败: 缺少HTTP层诊断信息`);
            return false;
        }

        if (expectations.hasAPICheck && !content.includes('API层诊断') && !content.includes('API Layer')) {
            console.log(`  诊断检查失败: 缺少API层诊断信息`);
            return false;
        }

        if (expectations.hasAnalysis && !content.includes('分析结果') && !content.includes('Analysis')) {
            console.log(`  分析检查失败: 缺少分析结果`);
            return false;
        }

        if (expectations.hasRecommendations && !content.includes('建议') && !content.includes('Recommendations')) {
            console.log(`  建议检查失败: 缺少解决建议`);
            return false;
        }

        if (expectations.hasPerformanceMetrics && !content.includes('性能指标') && !content.includes('Performance')) {
            console.log(`  性能指标检查失败: 缺少性能指标信息`);
            return false;
        }

        if (expectations.hasDiagnosticSummary && !content.includes('诊断总结') && !content.includes('Summary')) {
            console.log(`  总结检查失败: 缺少诊断总结`);
            return false;
        }

        console.log(`  所有检查通过 - 响应时间: ${responseTime}ms`);
        return true;

    } catch (error) {
        console.log(`  解析错误: ${error.message}`);
        return false;
    }
}

// 运行所有测试
async function runAllTests() {
    console.log('开始网络连接诊断工具测试...\n');
    
    for (const testConfig of testConfigs) {
        console.log(`\n========================================`);
        console.log(`🔍 ${testConfig.name}`);
        console.log(`========================================`);
        
        for (const test of testConfig.tests) {
            await runSingleTest(testConfig, test);
        }
    }
    
    // 诊断性能分析
    console.log(`\n========================================`);
    console.log(`📊 诊断性能分析`);
    console.log(`========================================`);
    
    const basicResults = diagnosticResults.filter(r => r.level === 'basic');
    const standardResults = diagnosticResults.filter(r => r.level === 'standard');
    const deepResults = diagnosticResults.filter(r => r.level === 'deep');
    
    if (basicResults.length > 0) {
        const avgBasic = basicResults.reduce((sum, r) => sum + r.responseTime, 0) / basicResults.length;
        console.log(`基础诊断平均响应时间: ${avgBasic.toFixed(2)}ms`);
        console.log(`基础诊断性能基准: < 5000ms ${avgBasic < 5000 ? '✅ 优秀' : '⚠️ 较慢但可接受'}`);
    }
    
    if (standardResults.length > 0) {
        const avgStandard = standardResults.reduce((sum, r) => sum + r.responseTime, 0) / standardResults.length;
        console.log(`标准诊断平均响应时间: ${avgStandard.toFixed(2)}ms`);
        console.log(`标准诊断性能基准: < 10000ms ${avgStandard < 10000 ? '✅ 优秀' : '⚠️ 较慢但可接受'}`);
    }
    
    if (deepResults.length > 0) {
        const avgDeep = deepResults.reduce((sum, r) => sum + r.responseTime, 0) / deepResults.length;
        console.log(`深度诊断平均响应时间: ${avgDeep.toFixed(2)}ms`);
        console.log(`深度诊断性能基准: < 15000ms ${avgDeep < 15000 ? '✅ 优秀' : '⚠️ 较慢但可接受'}`);
    }
    
    console.log(`\n📌 注意: 性能指标仅作为参考，网络环境和服务器响应时间可能影响诊断速度`);
    
    // 总结测试结果
    console.log(`\n========================================`);
    console.log(`📋 Task 9 测试总结`);
    console.log(`========================================`);
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过: ${passedTests}`);
    console.log(`失败: ${failedTests}`);
    console.log(`通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    const allPassed = failedTests === 0;
    
    if (allPassed) {
        console.log(`\n🎉 Task 9 PASSED: 网络连接诊断工具功能正常`);
        console.log(`✅ Task 9 PASSED: Network connection diagnostic tool works correctly`);
        process.exit(0);
    } else {
        console.log(`\n❌ Task 9 FAILED: ${failedTests}个测试失败`);
        process.exit(1);
    }
}

// 运行测试
runAllTests().catch(error => {
    console.error('测试执行错误:', error);
    process.exit(1);
});
EOF

# 运行测试
echo "执行Task 9网络诊断工具测试..."
node test/scripts/task9_test.js
TEST_RESULT=$?

# 清理测试文件
rm -f test/scripts/task9_test.js

# 检查结果
if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ Task 9 PASSED: 网络连接诊断工具功能测试通过"
    exit 0
else
    echo "❌ Task 9 FAILED: 网络连接诊断工具功能测试失败"
    exit 1
fi