// 简单的Wikipedia API测试
async function testWikipediaAPI() {
  try {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      titles: 'Python (programming language)',
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      formatversion: '2'
    });

    const apiUrl = 'https://en.wikipedia.org/w/api.php';
    const url = `${apiUrl}?${params}`;
    
    console.log('Fetching URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Wikipedia-MCP/0.1.0'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Response data structure:', Object.keys(data));
    
    if (data.query && data.query.pages) {
      console.log('Pages found:', data.query.pages.length);
      if (data.query.pages.length > 0) {
        const page = data.query.pages[0];
        console.log('Page keys:', Object.keys(page));
        console.log('Page title:', page.title);
        if (page.revisions) {
          console.log('Revisions found:', page.revisions.length);
          if (page.revisions.length > 0) {
            const content = page.revisions[0].slots.main.content;
            console.log('Content length:', content ? content.length : 'No content');
            console.log('Content preview:', content ? content.substring(0, 200) + '...' : 'No content');
          }
        }
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testWikipediaAPI();
