const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CDP_PORT = 9222;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json'
};

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURI(req.url.split('?')[0]);
      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
      const filePath = path.join(ROOT_DIR, reqPath);
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
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

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getWsUrl() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const page = list.find(t => t.type === 'page');
        if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
      }
    } catch (e) {}
    await sleep(300);
  }
  throw new Error("Failed to connect to Edge debugging port");
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
  }
  async connect() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(msg.error);
          else cb.resolve(msg.result);
        }
      };
    });
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws.close(); }
}

async function main() {
  const { server, port } = await startStaticServer();
  const edgeProc = spawn(EDGE_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--window-size=375,812',
    '--disable-gpu',
    'about:blank'
  ]);

  try {
    const wsUrl = await getWsUrl();
    const client = new CDPClient(wsUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('DOM.enable');

    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true
    });

    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
    await sleep(2500);

    const sections = [
      { name: 'hero', selector: '.comp-hero' },
      { name: 'film', selector: '.comp-film' },
      { name: 'comparison', selector: '.comp-comparison' },
      { name: 'showcase', selector: '.comp-showcase' },
      { name: 'trust', selector: '.comp-trust' },
      { name: 'faq', selector: '.comp-faq' }
    ];

    for (const s of sections) {
      const bounds = await client.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `
          (function() {
            var el = document.querySelector('${s.selector}');
            if (!el) return null;
            var r = el.getBoundingClientRect();
            return {
              x: r.left + window.scrollX,
              y: r.top + window.scrollY,
              width: r.width,
              height: r.height
            };
          })();
        `
      });

      const b = bounds.result.value;
      if (b) {
        // Set emulation height to cover the element or scroll
        await client.send('Runtime.evaluate', { expression: `window.scrollTo(0, ${b.y});` });
        await sleep(500);

        const ss = await client.send('Page.captureScreenshot', {
          clip: {
            x: 0,
            y: b.y,
            width: 375,
            height: Math.min(b.height, 2200),
            scale: 1
          },
          captureBeyondViewport: true
        });

        const outPath = path.join(__dirname, `mobile_full_${s.name}.png`);
        fs.writeFileSync(outPath, Buffer.from(ss.data, 'base64'));
        console.log(`Saved: mobile_full_${s.name}.png (height: ${b.height})`);
      }
    }

    client.close();
  } catch (err) {
    console.error('Error capturing mobile full:', err);
  } finally {
    edgeProc.kill();
    server.close();
  }
}

main();
