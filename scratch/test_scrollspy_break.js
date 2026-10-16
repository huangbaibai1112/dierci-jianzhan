const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CDP_PORT = 9223;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json'
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURI(req.url.split('?')[0]);
      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
      const filePath = path.join(ROOT_DIR, reqPath);
      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 0;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const cb = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) cb.reject(msg.error);
        else cb.resolve(msg.result);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function run() {
  const { server, port } = await startServer();
  const edgeProc = spawn(EDGE_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--window-size=1200,900',
    '--disable-gpu',
    'about:blank'
  ]);

  try {
    await sleep(1500);
    const listRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const list = await listRes.json();
    const page = list.find(t => t.type === 'page');
    const client = new CDPClient(page.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('DOM.enable');

    const hashes = ['#experience', '#standards', '#features', '#safety', '#faq'];

    for (const h of hashes) {
      console.log(`\nTesting deep link: /index.html${h}`);
      await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html${h}` });
      await sleep(1500);

      const res = await client.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `
          (function() {
            var targetId = '${h.substring(1)}';
            var el = document.getElementById(targetId);
            var header = document.querySelector('.comp-header');
            var headerRect = header ? header.getBoundingClientRect() : { bottom: 0 };
            var elRect = el ? el.getBoundingClientRect() : null;
            var scrollY = window.pageYOffset || document.documentElement.scrollTop;
            
            // Check active nav link
            var activeLink = document.querySelector('.header-nav-list a.is-active');

            return {
              scrollY: Math.round(scrollY),
              headerBottom: Math.round(headerRect.bottom),
              elementTop: elRect ? Math.round(elRect.top) : null,
              isOccluded: elRect ? (elRect.top < headerRect.bottom) : null,
              activeLinkText: activeLink ? activeLink.textContent : null,
              activeLinkHref: activeLink ? activeLink.getAttribute('href') : null
            };
          })()
        `
      });

      console.log('Result:', res.result.value);
    }

    // Now test scrolling to test ScrollSpy specifically!
    console.log('\n=== TESTING SCROLLSPY DURING SYSTEMATIC SCROLL ===');
    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
    await sleep(1000);

    const testSections = ['experience', 'features', 'standards', 'safety', 'faq'];
    for (const sid of testSections) {
      const scrollRes = await client.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `
          (function() {
            var el = document.getElementById('${sid}');
            if (!el) return { error: 'Element not found: ${sid}' };
            el.scrollIntoView({ behavior: 'instant' });
            return {
              targetId: '${sid}',
              offsetTop: el.offsetTop
            };
          })()
        `
      });
      await sleep(200);

      const spyRes = await client.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `
          (function() {
            var activeLink = document.querySelector('.header-nav-list a.is-active');
            return {
              activeText: activeLink ? activeLink.textContent : 'NONE',
              activeHref: activeLink ? activeLink.getAttribute('href') : 'NONE'
            };
          })()
        `
      });
      console.log(`Scrolled to #${sid} (offsetTop: ${scrollRes.result.value.offsetTop}): Active nav item is -> "${spyRes.result.value.activeText}" (${spyRes.result.value.activeHref})`);
    }

    client.close();
  } finally {
    edgeProc.kill();
    server.close();
  }
}

run().catch(console.error);
