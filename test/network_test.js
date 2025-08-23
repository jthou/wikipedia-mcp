import https from 'https';

console.log('Testing direct connection to Wikipedia API...');

const url = 'https://en.wikipedia.org/w/api.php?action=query&titles=Test&prop=revisions&rvprop=content&format=json';

const req = https.get(url, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response received, length:', data.length);
    console.log('First 200 chars:', data.substring(0, 200));
    process.exit(0);
  });
});

req.on('error', (err) => {
  console.error('Request error:', err);
  process.exit(1);
});

// 设置5秒超时
req.setTimeout(5000, () => {
  console.error('Request timeout');
  req.destroy();
  process.exit(1);
});
