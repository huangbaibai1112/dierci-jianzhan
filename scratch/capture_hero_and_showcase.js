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
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const page = list.find(t => t.type === 'page');
        if (page && page.webSocketDebuggerUrl) {
          return page.webSocketDebuggerUrl;
        }
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

  close() {
    this.ws.close();
  }
}

async function main() {
  const { server, port } = await startStaticServer();
  console.log(`Internal static server listening on http://127.0.0.1:${port}`);

  const edgeProc = spawn(EDGE_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--window-size=1280,1100',
    '--disable-gpu',
    'about:blank'
  ]);

  try {
    const wsUrl = await getWsUrl();
    console.log("Connected to CDP:", wsUrl);
    const client = new CDPClient(wsUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('DOM.enable');

    console.log(`Navigating to http://127.0.0.1:${port}/...`);
    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
    await sleep(2500);

    // 1. Capture Hero (Rhythm console + expanded collage card)
    await client.send('Runtime.evaluate', {
      expression: `
        (function() {
          var hero = document.getElementById('how-it-works') || document.querySelector('.comp-hero');
          if (hero) {
            hero.scrollIntoView({ behavior: 'instant', block: 'start' });
          }
        })();
      `
    });
    await sleep(1200);
    let ssHero = await client.send('Page.captureScreenshot');
    fs.writeFileSync(path.join(__dirname, 'hero_rhythm_flow.png'), Buffer.from(ssHero.data, 'base64'));
    console.log("Captured hero_rhythm_flow.png");

    // 2. Capture Showcase (Core Capabilities & Silver Select VIP)
    await client.send('Runtime.evaluate', {
      expression: `
        (function() {
          var showcase = document.getElementById('features') || document.querySelector('.comp-showcase');
          if (showcase) {
            showcase.scrollIntoView({ behavior: 'instant', block: 'start' });
          }
        })();
      `
    });
    await sleep(1200);
    let ssShowcase = await client.send('Page.captureScreenshot');
    fs.writeFileSync(path.join(__dirname, 'showcase_redesign.png'), Buffer.from(ssShowcase.data, 'base64'));
    console.log("Captured showcase_redesign.png");

    client.close();
  } finally {
    edgeProc.kill();
    server.close();
  }
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
