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

async function main() {
  const { server, port } = await startServer();
  const edgeProc = spawn(EDGE_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--window-size=480,900',
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

    console.log('=== [1] RESPONSIVE VIEWPORT PERFECTION AUDIT ===');
    const pagesToTest = ['index.html', 'how-it-works.html'];
    const widths = [360, 375, 390, 412];

    for (const pageName of pagesToTest) {
      console.log(`\nTesting page: ${pageName}`);
      for (const w of widths) {
        await client.send('Emulation.setDeviceMetricsOverride', {
          width: w,
          height: 844,
          deviceScaleFactor: 2,
          mobile: true
        });

        await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/${pageName}` });
        await sleep(1200);

        const evalRes = await client.send('Runtime.evaluate', {
          returnByValue: true,
          expression: `
            (function() {
              var docEl = document.documentElement;
              var winW = window.innerWidth;
              var scrollW = docEl.scrollWidth;
              var clientW = docEl.clientWidth;
              return {
                winW: winW,
                scrollW: scrollW,
                clientW: clientW,
                isPerfect: (scrollW === clientW && scrollW === winW)
              };
            })()
          `
        });

        const v = evalRes.result.value;
        const passStatus = v.isPerfect ? 'PASSED (0 overflow)' : 'FAILED (OVERFLOW)';
        console.log(`  Width ${w}px -> clientW: ${v.clientW}px, scrollW: ${v.scrollW}px | Status: ${passStatus}`);
        if (!v.isPerfect) {
          throw new Error(`Overflow detected on ${pageName} at ${w}px!`);
        }
      }
    }

    console.log('\n=== [2] NAVIGATION & MULTI-PAGE ROUTING INTEGRATION AUDIT ===');
    // Test index.html navigation links
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1200,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });

    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
    await sleep(1000);

    // Verify all targets exist on index.html
    const targetChecks = await client.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (function() {
          var results = {};
          var ids = ['hero', 'experience', 'standards', 'features', 'platform-advantages', 'safety', 'faq'];
          ids.forEach(function(id) {
            results[id] = !!document.getElementById(id);
          });
          return results;
        })()
      `
    });
    console.log('Target element existence on index.html:');
    for (const [id, exists] of Object.entries(targetChecks.result.value)) {
      console.log(`  #${id}: ${exists ? 'EXISTS (OK)' : 'MISSING (ERROR)'}`);
    }

    // Verify clicking #features scrolls into view
    const clickFeatureTest = await client.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (function() {
          var link = document.querySelector('.header-nav-list a[href*="#features"]');
          if (!link) return { ok: false, msg: 'Link not found' };
          link.click();
          var featEl = document.getElementById('features');
          var r = featEl.getBoundingClientRect();
          return {
            ok: true,
            linkText: link.textContent,
            hash: window.location.hash,
            featureTop: Math.round(r.top)
          };
        })()
      `
    });
    console.log('Clicking Platform Features on index.html:', clickFeatureTest.result.value);

    // Test mobile drawer toggle and auto-close
    console.log('\n=== [3] MOBILE MENU INTERACTION & AUTO-CLOSE AUDIT ===');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
    await sleep(1000);

    const mobileMenuTest = await client.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (function() {
          var btn = document.getElementById('headerMenuBtn');
          var list = document.getElementById('headerNavList');
          if (!btn || !list) return { ok: false, msg: 'Elements missing' };

          // Step 1: Click button to open
          btn.click();
          var opened = list.classList.contains('is-open');

          // Step 2: Click a nav item
          var link = list.querySelector('a[href*="#standards"]');
          link.click();
          var closedAfterClick = !list.classList.contains('is-open');

          return {
            ok: true,
            openedOnBtnClick: opened,
            closedAfterLinkClick: closedAfterClick,
            currentHash: window.location.hash
          };
        })()
      `
    });
    console.log('Mobile drawer interaction test:', mobileMenuTest.result.value);

    console.log('\n=== [4] CAPTURING MOBILE VERIFICATION SCREENSHOTS ===');
    // Capture mobile index.html
    const ssIndex = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'verify_boost_index_mobile.png'), Buffer.from(ssIndex.data, 'base64'));
    console.log('Saved scratch/verify_boost_index_mobile.png');

    // Navigate to how-it-works.html and capture
    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/how-it-works.html` });
    await sleep(1200);
    const ssHiw = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'verify_boost_hiw_mobile.png'), Buffer.from(ssHiw.data, 'base64'));
    console.log('Saved scratch/verify_boost_hiw_mobile.png');

    client.close();
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exitCode = 1;
  } finally {
    edgeProc.kill();
    server.close();
  }
}

main();
