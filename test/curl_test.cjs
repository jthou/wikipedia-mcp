#!/usr/bin/env node

const { spawn } = require('child_process');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

console.log('🌐 Testing Wikipedia API via curl...');

async function testWikipediaAPICurl() {
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

    const url = `${apiUrl}?${params}`;
    console.log('📤 Making curl request...');
    
    const { stdout, stderr } = await exec(`curl -s --connect-timeout 10 "${url}"`);
    
    if (stderr) {
      console.error('❌ Curl stderr:', stderr);
      return false;
    }
    
    console.log('📥 Response received, length:', stdout.length);
    
    const data = JSON.parse(stdout);
    console.log('📝 Response parsed, keys:', Object.keys(data));
    
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
    return false;
  }
}

testWikipediaAPICurl()
  .then(success => {
    if (success) {
      console.log('✅ Wikipedia API test via curl passed!');
      process.exit(0);
    } else {
      console.log('❌ Wikipedia API test via curl failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });
