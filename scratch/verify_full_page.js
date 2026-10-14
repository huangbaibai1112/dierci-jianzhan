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
    '--user-data-dir=' + path.join(ROOT_DIR, 'scratch', 'edge_profile_full')
  ]);

  try {
    await sleep(1200);
    const wsUrl = await getWsUrl();
    const client = new CDPClient(wsUrl);
    await client.connect();

    // 1. Desktop Viewport (1440 x 900)
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1.5,
      mobile: false
    });

    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
    await sleep(2500);

    // Check DOM section order
    const sectionOrder = await client.send('Runtime.evaluate', {
      expression: `
        Array.from(document.querySelectorAll('section, footer')).map(s => ({
          tagName: s.tagName,
          className: s.className,
          id: s.id
        }))
      `,
      returnByValue: true
    });
    console.log('Sections order on page:', JSON.stringify(sectionOrder.result.value, null, 2));

    // Capture Section 1: Hero
    await client.send('Runtime.evaluate', {
      expression: `document.getElementById('hero')?.scrollIntoView({ behavior: 'instant', block: 'start' });`
    });
    await sleep(600);
    const shotHero = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'verify_01_hero.png'), Buffer.from(shotHero.data, 'base64'));

    // Capture Section 2: Film (Mobile Phone UI Showcase)
    await client.send('Runtime.evaluate', {
      expression: `document.getElementById('experience')?.scrollIntoView({ behavior: 'instant', block: 'start' });`
    });
    await sleep(600);
    const shotFilm = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'verify_02_film.png'), Buffer.from(shotFilm.data, 'base64'));

    // Capture Section 3: Hanging Cards (Platform Advantages)
    await client.send('Runtime.evaluate', {
      expression: `document.getElementById('platform-advantages')?.scrollIntoView({ behavior: 'instant', block: 'start' });`
    });
    await sleep(600);
    const shotHanging = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'verify_03_hanging_cards.png'), Buffer.from(shotHanging.data, 'base64'));

    // Trigger hover on Card 2 in Hanging Cards
    await client.send('Runtime.evaluate', {
      expression: `
        const cards = document.querySelectorAll('.hanging-card');
        if (cards[1]) {
          cards.forEach(c => c.classList.remove('is-active'));
          cards[1].classList.add('is-active');
        }
      `
    });
    await sleep(600);
    const shotHangingHover = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'verify_03_hanging_cards_hover.png'), Buffer.from(shotHangingHover.data, 'base64'));

    // Capture Section 4: Comparison
    await client.send('Runtime.evaluate', {
      expression: `document.getElementById('why-us')?.scrollIntoView({ behavior: 'instant', block: 'start' });`
    });
    await sleep(600);
    const shotComp = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'verify_04_comparison.png'), Buffer.from(shotComp.data, 'base64'));

    // Capture Section 5: Trust
    await client.send('Runtime.evaluate', {
      expression: `document.getElementById('safety')?.scrollIntoView({ behavior: 'instant', block: 'start' });`
    });
    await sleep(600);
    const shotTrust = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'verify_05_trust.png'), Buffer.from(shotTrust.data, 'base64'));

    // Capture Section 6: Footer
    await client.send('Runtime.evaluate', {
      expression: `document.querySelector('.comp-footer')?.scrollIntoView({ behavior: 'instant', block: 'start' });`
    });
    await sleep(600);
    const shotFooter = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'verify_06_footer.png'), Buffer.from(shotFooter.data, 'base64'));

    // 2. Mobile Viewport (390 x 844)
    console.log('Testing Mobile Viewport (390px)...');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(1000);

    // Scroll to hero on mobile
    await client.send('Runtime.evaluate', {
      expression: `document.getElementById('hero')?.scrollIntoView({ behavior: 'instant', block: 'start' });`
    });
    await sleep(600);
    const shotMobileHero = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'verify_mobile_hero.png'), Buffer.from(shotMobileHero.data, 'base64'));

    // Scroll to hanging cards on mobile
    await client.send('Runtime.evaluate', {
      expression: `document.getElementById('platform-advantages')?.scrollIntoView({ behavior: 'instant', block: 'start' });`
    });
    await sleep(600);
    const shotMobileHanging = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'verify_mobile_hanging_cards.png'), Buffer.from(shotMobileHanging.data, 'base64'));

    // Comprehensive Mobile Overflow Check across whole document
    const overflowResult = await client.send('Runtime.evaluate', {
      expression: `
        (function() {
          const docWidth = document.documentElement.clientWidth;
          const bodyWidth = document.body.scrollWidth;
          const overflows = [];
          document.querySelectorAll('*').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.right > docWidth + 1.5) {
              overflows.push({
                tag: el.tagName,
                class: el.className,
                id: el.id,
                right: Math.round(rect.right),
                docWidth
              });
            }
          });
          return {
            docWidth,
            bodyWidth,
            hasOverflow: bodyWidth > docWidth,
            overflowCount: overflows.length,
            overflowSamples: overflows.slice(0, 5)
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Mobile Overflow Evaluation:', JSON.stringify(overflowResult.result.value, null, 2));

    console.log('Verification completed successfully!');
    client.close();
  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    edgeProc.kill();
    server.close();
  }
}

run();
