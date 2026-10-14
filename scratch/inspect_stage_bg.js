const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = process.cwd();
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(ROOT_DIR, reqPath);
  if (!fs.existsSync(filePath)) { res.writeHead(404); res.end(); return; }
  const ext = path.extname(filePath);
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const edge = spawn(EDGE_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,900',
    `http://127.0.0.1:${port}/index.html`
  ]);

  await new Promise(r => setTimeout(r, 2000));
  const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
  const page = list.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = Math.floor(Math.random() * 100000);
      const handler = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  // Scroll to why-us
  await send('Runtime.evaluate', {
    expression: `document.getElementById('why-us')?.scrollIntoView({ behavior: 'instant', block: 'start' });`
  });
  await new Promise(r => setTimeout(r, 600));

  // Find all elements visible in viewport and their background/borders
  const inspected = await send('Runtime.evaluate', {
    expression: `
      (function() {
        const els = [];
        document.querySelectorAll('#why-us, #why-us *').forEach(el => {
          const rect = el.getBoundingClientRect();
          const cs = window.getComputedStyle(el);
          if (rect.width > 0 && rect.height > 0) {
            const hasBg = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent';
            const hasBgImg = cs.backgroundImage !== 'none';
            const hasBorder = cs.borderWidth !== '0px' && cs.borderColor !== 'transparent';
            const hasShadow = cs.boxShadow !== 'none';
            if (hasBg || hasBgImg || hasBorder || hasShadow) {
              els.push({
                tag: el.tagName,
                id: el.id,
                className: typeof el.className === 'string' ? el.className : '',
                rect: { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) },
                bg: cs.backgroundColor,
                bgImg: cs.backgroundImage.substring(0, 60),
                borderRadius: cs.borderRadius,
                boxShadow: cs.boxShadow,
                border: cs.border
              });
            }
          }
        });
        return els;
      })()
    `,
    returnByValue: true
  });

  console.log('Inspected elements in #why-us:');
  console.log(JSON.stringify(inspected.result.value.slice(0, 8), null, 2));

  ws.close();
  edge.kill();
  server.close();
});
