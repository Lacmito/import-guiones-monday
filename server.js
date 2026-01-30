/**
 * Servidor local: sirve la app y hace de proxy a la API de Monday (evita CORS).
 * Uso: node server.js   → http://localhost:3000
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const MONDAY_API = 'https://api.monday.com/v2';

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res) {
  let file = req.url === '/' ? '/index.html' : req.url;
  file = path.join(__dirname, file.replace(/\?.*$/, ''));
  const ext = path.extname(file);
  const type = MIME[ext] || 'application/octet-stream';
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
}

function apiConfig(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    boardId: process.env.MONDAY_BOARD_ID || '',
    groupId: process.env.MONDAY_GROUP_ID || '',
    subitemsBoardId: process.env.MONDAY_SUBITEMS_BOARD_ID || '',
  }));
}

function proxyMonday(req, res) {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ errors: [{ message: 'Invalid JSON' }] }));
      return;
    }
    const { query, variables, token } = payload;
    const apiToken = process.env.MONDAY_API_TOKEN || token || '';
    if (!apiToken || !query) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ errors: [{ message: 'Missing token or query. Configurá MONDAY_API_TOKEN en el servidor.' }] }));
      return;
    }
    const postData = JSON.stringify({ query, variables: variables || {} });
    const url = new URL(MONDAY_API);
    const opts = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiToken,
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    const lib = url.protocol === 'https:' ? require('https') : require('http');
    const proxyReq = lib.request(opts, (proxyRes) => {
      let data = '';
      proxyRes.on('data', (chunk) => { data += chunk; });
      proxyRes.on('end', () => {
        res.writeHead(proxyRes.statusCode || 200, { 'Content-Type': 'application/json' });
        res.end(data);
      });
    });
    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ errors: [{ message: err.message || 'Proxy error' }] }));
    });
    proxyReq.write(postData);
    proxyReq.end();
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/config') {
    apiConfig(req, res);
    return;
  }
  if (req.method === 'POST' && req.url === '/api/monday') {
    proxyMonday(req, res);
    return;
  }
  if (req.method === 'GET') {
    serveStatic(req, res);
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, HOST, () => {
  const url = process.env.RENDER_EXTERNAL_URL || `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;
  console.log(`Import Guiones → Monday: ${url}`);
  console.log('(Las llamadas a Monday pasan por el proxy para evitar CORS.)');
});
