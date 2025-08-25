#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('Testing search result format...');

const server = spawn('node', ['build/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
});

let allOutput = '';

server.stdout.on('data', (data) => {
    allOutput += data.toString();
});

server.stderr.on('data', (data) => {
    allOutput += data.toString();
});

setTimeout(() => {
    const request = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { 
            name: 'quick_search', 
            arguments: { wiki: 'enwiki', query: 'artificial', limit: 5 }
        }
    }) + '\n';
    
    server.stdin.write(request);
}, 1000);

setTimeout(() => {
    server.kill();
    console.log('=== QUICK SEARCH OUTPUT ===');
    console.log(allOutput);
}, 3000);