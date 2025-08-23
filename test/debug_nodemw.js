import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const nodemw = require('nodemw');

console.log('Testing nodemw connection...');

const client = new nodemw({
  protocol: 'https',
  server: 'en.wikipedia.org',
  path: '/w',
  debug: true
});

console.log('Client created, testing getArticle...');

client.getArticle('Machine learning', (err, content) => {
  if (err) {
    console.error('Error:', err.message);
  } else {
    console.log('Success! Content length:', content ? content.length : 0);
    console.log('First 200 characters:', content ? content.substring(0, 200) : 'No content');
  }
  process.exit(0);
});

// 设置超时
setTimeout(() => {
  console.error('Test timed out after 15 seconds');
  process.exit(1);
}, 15000);
