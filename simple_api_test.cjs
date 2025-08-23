const { spawn } = require('child_process');

// 简单测试Wikipedia API
async function testWikipediaAPI() {
    console.log("Testing Wikipedia API without proxy...");
    
    const url = "https://en.wikipedia.org/w/api.php?action=query&format=json&titles=Python&prop=revisions&rvprop=content&rvslots=main&formatversion=2";
    
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Wikipedia-MCP/0.1.0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("✅ API调用成功");
        console.log("Response keys:", Object.keys(data));
        
        if (data.query && data.query.pages) {
            const page = data.query.pages[0];
            console.log("Page title:", page.title);
            console.log("Content length:", page.revisions[0].slots.main.content.length);
            console.log("✅ 获取到页面内容");
        }
        
    } catch (error) {
        console.log("❌ API调用失败:", error.message);
        
        // 测试使用代理
        console.log("\nTesting with proxy...");
        
        return new Promise((resolve) => {
            const curlCmd = spawn('curl', [
                '-s',
                '-H', 'User-Agent: Wikipedia-MCP/0.1.0',
                '--proxy', 'http://localhost:7890',
                url
            ]);
            
            let output = '';
            curlCmd.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            curlCmd.on('close', (code) => {
                if (code === 0) {
                    try {
                        const data = JSON.parse(output);
                        console.log("✅ 代理API调用成功");
                        if (data.query && data.query.pages) {
                            const page = data.query.pages[0];
                            console.log("Page title:", page.title);
                            console.log("Content length:", page.revisions[0].slots.main.content.length);
                            console.log("✅ 通过代理获取到页面内容");
                        }
                    } catch (e) {
                        console.log("❌ 代理返回的不是有效JSON:", e.message);
                        console.log("Raw output:", output.substring(0, 200));
                    }
                } else {
                    console.log("❌ 代理调用也失败了, exit code:", code);
                }
                resolve();
            });
        });
    }
}

testWikipediaAPI();
