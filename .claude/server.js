const http = require('http');
const fs = require('fs');
const path = require('path');
const root = '/Users/wilianleao/Desktop/Site da nova';
const mime = { html:'text/html', css:'text/css', js:'application/javascript', png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', mp4:'video/mp4', webm:'video/webm', woff2:'font/woff2', woff:'font/woff', svg:'image/svg+xml', ico:'image/x-icon' };
http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';
  const file = path.join(root, url);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(file).slice(1).toLowerCase();
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(3333, '127.0.0.1', () => console.log('Server running on http://localhost:3333'));
