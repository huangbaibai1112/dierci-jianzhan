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
      if (reqPath === '/' || reqPath === '') reqPath = '/how-it-works.html';
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
  const { server, port } = await startStaticServer();
  console.log(`Static server running on http://127.0.0.1:${port}`);

  const edgeProc = spawn(EDGE_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(ROOT_DIR, 'scratch', 'edge_profile_hiw')
  ]);

  try {
    await sleep(1500);
    const wsUrl = await getWsUrl();
    const cdp = new CDPClient(wsUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');

    // Desktop Viewport
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/how-it-works.html` });
  await sleep(1500);

  // Capture Desktop Overview
  const shot1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'verify_hiw_desktop_top.png'), Buffer.from(shot1.data, 'base64'));
  console.log('Saved scratch/verify_hiw_desktop_top.png');

  // Capture Living Stage Phase 1
  await cdp.send('Runtime.evaluate', {
    expression: "document.querySelector('.master-console-section').scrollIntoView();"
  });
  await sleep(600);
  const shotStage1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'verify_hiw_console_p1.png'), Buffer.from(shotStage1.data, 'base64'));

  // Click tab 2 (9:00 AM Dispatch) and capture
  await cdp.send('Runtime.evaluate', {
    expression: "document.getElementById('tab-phase-dispatch').click();"
  });
  await sleep(600);
  const shotStage2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'verify_hiw_console_p2.png'), Buffer.from(shotStage2.data, 'base64'));

  // Scroll to Editorial Broadside (Pure Typography)
  await cdp.send('Runtime.evaluate', {
    expression: "document.querySelector('.editorial-manifesto-section').scrollIntoView();"
  });
  await sleep(600);
  const shotBroadside = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'verify_hiw_editorial_broadside.png'), Buffer.from(shotBroadside.data, 'base64'));

  // Scroll to Editorial Inquiries (Pure Typography)
  await cdp.send('Runtime.evaluate', {
    expression: "document.querySelector('.editorial-inquiries-section').scrollIntoView();"
  });
  await sleep(600);
  const shotInquiries = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'verify_hiw_editorial_inquiries.png'), Buffer.from(shotInquiries.data, 'base64'));
  console.log('Saved all console & editorial screenshots');

  // Test Mobile Viewport 390px
  console.log('Testing Mobile Viewport (390px)...');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/how-it-works.html` });
  await sleep(1200);

  const overflowEval = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const docW = document.documentElement.clientWidth;
      const bodyW = document.body.clientWidth;
      const elts = Array.from(document.querySelectorAll('*'));
      let bad = [];
      elts.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.right > docW + 1) {
          bad.push({
            tag: el.tagName,
            class: el.className,
            id: el.id,
            right: Math.round(r.right),
            docWidth: docW
          });
        }
      });
      return {
        docWidth: docW,
        bodyWidth: bodyW,
        hasOverflow: bad.length > 0,
        overflowCount: bad.length,
        overflowSamples: bad.slice(0, 5)
      };
    })()`,
    returnByValue: true
  });

  console.log('Mobile Overflow Evaluation:', JSON.stringify(overflowEval.result.value, null, 2));

  const shotMob = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'verify_hiw_mobile.png'), Buffer.from(shotMob.data, 'base64'));
  console.log('Saved scratch/verify_hiw_mobile.png');

  } finally {
    try { if (cdp) cdp.close(); } catch (e) {}
    try { edgeProc.kill(); } catch (e) {}
    try { server.close(); } catch (e) {}
  }
  console.log('Verification completed successfully!');
}

run().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
