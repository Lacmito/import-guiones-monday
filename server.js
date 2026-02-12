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
const ADMIN_KEY = process.env.ADMIN_KEY || 'cdr-admin-2026';
const LOG_FILE = path.join(__dirname, 'import-log.json');

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

// --- Log: lectura/escritura ---

function readLog() {
  try {
    const data = fs.readFileSync(LOG_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function appendLog(entry) {
  const log = readLog();
  log.push(entry);
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf8');
}

function handleLogPost(req, res) {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    try {
      const entry = JSON.parse(body);
      entry.timestamp = new Date().toISOString();
      appendLog(entry);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }
  });
}

function handleLogGet(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const key = url.searchParams.get('key');
  if (key !== ADMIN_KEY) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Acceso denegado. Usá ?key=TU_CLAVE_ADMIN');
    return;
  }
  const log = readLog();
  const format = url.searchParams.get('format');
  if (format === 'json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(log, null, 2));
    return;
  }
  // HTML table
  let rows = '';
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i];
    const cls = e.success ? 'ok' : 'fail';
    rows += `<tr class="${cls}">
      <td>${e.timestamp || '—'}</td>
      <td>${esc(e.filename || '—')}</td>
      <td>${esc(e.episode || '—')}</td>
      <td>${esc(e.obra || '—')}</td>
      <td>${e.personajes ?? '—'}</td>
      <td>${e.loops ?? '—'}</td>
      <td>${e.success ? 'OK' : 'ERROR'}</td>
      <td>${esc(e.error || '')}</td>
    </tr>`;
  }
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Import Log</title>
<style>
  body{font-family:system-ui;background:#1a1d23;color:#e0e0e0;padding:2rem}
  h1{font-size:1.3rem;color:#14B8A6}
  table{border-collapse:collapse;width:100%;font-size:.85rem}
  th,td{padding:.5rem .75rem;border:1px solid #333;text-align:left}
  th{background:#252a32;color:#b8c4cc}
  tr.ok td:nth-child(7){color:#5eead4}
  tr.fail td:nth-child(7){color:#f87171}
  .count{color:#b8c4cc;font-size:.9rem;margin-bottom:1rem}
</style></head><body>
  <h1>Import Guiones — Log</h1>
  <p class="count">${log.length} registro(s)</p>
  <table><thead><tr>
    <th>Fecha/Hora</th><th>Archivo</th><th>Episodio</th><th>Obra</th>
    <th>Personajes</th><th>Loops</th><th>Resultado</th><th>Error</th>
  </tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// --- Config endpoint ---

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
  const parsedUrl = req.url.split('?')[0];
  if (req.method === 'GET' && parsedUrl === '/api/config') {
    apiConfig(req, res);
    return;
  }
  if (req.method === 'POST' && parsedUrl === '/api/monday') {
    proxyMonday(req, res);
    return;
  }
  if (req.method === 'POST' && parsedUrl === '/api/log') {
    handleLogPost(req, res);
    return;
  }
  if (req.method === 'GET' && parsedUrl === '/admin/log') {
    handleLogGet(req, res);
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
