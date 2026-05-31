// Minimal dev server — serves www/ with COOP/COEP headers (no SW needed)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const WWW = path.join(__dirname, 'www');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
};

http.createServer(function (req, res) {
  var url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';
  var file = path.join(WWW, url);

  fs.readFile(file, function (err, data) {
    if (err) {
      res.writeHead(404);
      res.end('404');
      return;
    }
    var ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(data);
  });
}).listen(PORT, function () {
  console.log('server running at http://127.0.0.1:' + PORT + '/');
  console.log('COOP/COEP headers set — no service worker needed');
});
