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
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
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
  const { server, port } = await startStaticServer();
  console.log(`Server started on port ${port}`);

  const edgeProc = spawn(EDGE_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]);

  try {
    const wsUrl = await getWsUrl();
    console.log(`Connected to CDP at: ${wsUrl}`);
    const client = new CDPClient(wsUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('DOM.enable');

    // 1. Desktop Viewport
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1360,
      height: 1200,
      deviceScaleFactor: 2,
      mobile: false
    });

    console.log('Navigating to index.html...');
    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
    await sleep(2000);

    // Scroll to hanging stage in Hero
    await client.send('Runtime.evaluate', {
      expression: `
        const el = document.getElementById('heroHangingStage');
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
      `
    });
    await sleep(800);

    console.log('Capturing desktop hanging stage...');
    const shot1 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'hero_hanging_cards_desktop.png'), Buffer.from(shot1.data, 'base64'));

    // 2. Hover on Card #02 (Honey theme / Voice)
    console.log('Hovering on Card 2...');
    await client.send('Runtime.evaluate', {
      expression: `
        const units = document.querySelectorAll('.hanging-card-unit');
        if (units[1]) {
          const card = units[1].querySelector('.unit-card');
          units.forEach(u => u.querySelector('.unit-card').classList.remove('is-active'));
          card.classList.add('is-active');
        }
      `
    });
    await sleep(600);

    const shot2 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'hero_hanging_cards_hover.png'), Buffer.from(shot2.data, 'base64'));

    // 3. Mobile Viewport
    console.log('Switching to mobile viewport (390px)...');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(1000);

    await client.send('Runtime.evaluate', {
      expression: `
        const el = document.getElementById('heroHangingStage');
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
      `
    });
    await sleep(600);

    const shot3 = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'hero_hanging_cards_mobile.png'), Buffer.from(shot3.data, 'base64'));

    // Check overflow on mobile
    const overflowResult = await client.send('Runtime.evaluate', {
      expression: `
        (function() {
          const docWidth = document.documentElement.clientWidth;
          const bodyWidth = document.body.scrollWidth;
          const overflows = [];
          document.querySelectorAll('*').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.right > docWidth + 1) {
              overflows.push({ tag: el.tagName, class: el.className, right: rect.right, max: docWidth });
            }
          });
          return { docWidth, bodyWidth, hasOverflow: bodyWidth > docWidth, overflows: overflows.slice(0, 5) };
        })()
      `,
      returnByValue: true
    });
    console.log('Mobile overflow check result:', JSON.stringify(overflowResult.result.value, null, 2));

    console.log('All hero screenshots captured successfully!');
    client.close();
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    edgeProc.kill();
    server.close();
  }
}

run();
