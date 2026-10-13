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
    '--window-size=480,900',
    '--disable-gpu',
    'about:blank'
  ]);

  try {
    const wsUrl = await getWsUrl();
    const client = new CDPClient(wsUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('DOM.enable');

    const testWidths = [360, 375, 390, 412, 480];

    for (const w of testWidths) {
      console.log(`\n================ Checking Viewport: ${w}px ================`);
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: w,
        height: 844,
        deviceScaleFactor: 2,
        mobile: true
      });

      await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
      await sleep(1500);

      const checkResult = await client.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `
          (function() {
            var docWidth = document.documentElement.offsetWidth;
            var scrollWidth = document.documentElement.scrollWidth;
            var winWidth = window.innerWidth;
            var isOverflowing = scrollWidth > winWidth + 1;

            var overflowingElements = [];
            var all = document.querySelectorAll('*');

            for (var i = 0; i < all.length; i++) {
              var el = all[i];
              // Skip script, style, meta, head, etc.
              if (['SCRIPT', 'STYLE', 'META', 'HEAD', 'TITLE', 'LINK'].includes(el.tagName)) continue;
              
              var r = el.getBoundingClientRect();
              // Check if right edge exceeds window.innerWidth by more than 1px
              if (r.right > winWidth + 1.5 || r.left < -1.5) {
                // Find parent section or component class
                var section = el.closest('section') || el.closest('header') || el.closest('footer') || el;
                var sectionClass = section ? (section.className || section.tagName) : 'unknown';
                
                overflowingElements.push({
                  tag: el.tagName,
                  id: el.id,
                  className: el.className ? String(el.className).slice(0, 80) : '',
                  section: sectionClass,
                  left: Math.round(r.left),
                  right: Math.round(r.right),
                  width: Math.round(r.width),
                  winWidth: winWidth,
                  overflowAmount: Math.round(r.right - winWidth),
                  outerHTMLSnippet: el.outerHTML.slice(0, 120)
                });
              }
            }

            return {
              winWidth: winWidth,
              scrollWidth: scrollWidth,
              isOverflowing: isOverflowing,
              overflowingCount: overflowingElements.length,
              elements: overflowingElements
            };
          })();
        `
      });

      const res = checkResult.result.value;
      console.log(`Window width: ${res.winWidth}px, Page scrollWidth: ${res.scrollWidth}px, Overflowing? ${res.isOverflowing}`);
      if (res.elements.length > 0) {
        console.log(`Found ${res.elements.length} elements exceeding viewport boundary:`);
        // Group by section
        const bySection = {};
        res.elements.forEach(el => {
          const key = el.section;
          if (!bySection[key]) bySection[key] = [];
          bySection[key].push(el);
        });

        for (const [sec, list] of Object.entries(bySection)) {
          console.log(`\n  [Section: ${sec}]`);
          list.slice(0, 10).forEach(item => {
            console.log(`    - <${item.tag.toLowerCase()} class="${item.className}"> right: ${item.right}px (exceeds by +${item.overflowAmount}px) w: ${item.width}px`);
          });
          if (list.length > 10) console.log(`    ... and ${list.length - 10} more`);
        }
      } else {
        console.log(`  -> Perfect! No elements overflowing at ${w}px.`);
      }
    }

    client.close();
  } catch (err) {
    console.error('Error running overflow inspection:', err);
  } finally {
    edgeProc.kill();
    server.close();
  }
}

main();
