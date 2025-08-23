#!/usr/bin/env node

console.log('🌐 Testing Wikipedia API directly...');

async function testWikipediaAPI() {
  try {
    const title = 'Apple';
    const apiUrl = 'https://en.wikipedia.org/w/api.php';
    
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      titles: title,
      prop: 'revisions|info',
      rvprop: 'content|timestamp|comment|user|size',
      rvslots: 'main',
      inprop: 'url|displaytitle',
      formatversion: '2'
    });

    console.log('📤 Making API request to:', `${apiUrl}?${params}`);
    
    const response = await fetch(`${apiUrl}?${params}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Wikipedia-MCP/0.1.0'
      }
    });

    console.log('📥 Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📝 Response received, keys:', Object.keys(data));
    
    if (data.error) {
      console.error('❌ API Error:', data.error.info);
      return false;
    }

    const pages = data.query?.pages;
    if (!pages || pages.length === 0) {
      console.error('❌ No pages found in response');
      return false;
    }

    const page = pages[0];
    console.log('📄 Page info:', {
      title: page.title,
      pageid: page.pageid,
      missing: page.missing
    });
    
    if (page.missing) {
      console.error('❌ Page not found');
      return false;
    }

    const revisions = page.revisions;
    if (!revisions || revisions.length === 0) {
      console.error('❌ No content found');
      return false;
    }

    const content = revisions[0].slots.main.content || '';
    console.log('✅ Content length:', content.length);
    console.log('📝 First 200 chars:', content.substring(0, 200));
    
    return true;
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('❌ Error details:', error.code, error.cause);
    return false;
  }
}

testWikipediaAPI()
  .then(success => {
    if (success) {
      console.log('✅ Wikipedia API test passed!');
      process.exit(0);
    } else {
      console.log('❌ Wikipedia API test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });
