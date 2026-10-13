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
    '--window-size=1440,1050',
    '--disable-gpu',
    'about:blank'
  ]);

  try {
    const wsUrl = await getWsUrl();
    const client = new CDPClient(wsUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('DOM.enable');

    const widths = [1400, 1200, 1024, 768, 480];

    for (const w of widths) {
      console.log(`\n================ Testing Viewport Width: ${w}px ================`);
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: w,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: w <= 768
      });

      await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
      // Allow fonts to load and initial entry unblur animations to settle
      await sleep(2200);

      const result = await client.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `
          (function() {
            var targets = Array.from(document.querySelectorAll('h1, h2, h3, h4, .section-header p, .hero-why, .b-title, .b-desc, .pillar-title, .pillar-desc, .scene-title, .scene-desc, .footer-cta-heading, .footer-cta-text, .trust-stage-title, .trust-stage-lead, .faq-stage-title, .faq-stage-lead, .showcase-stage-title, .showcase-stage-lead, .benchmark-stage-title, .benchmark-stage-lead, .shield-title, .shield-desc'));
            var issues = [];

            targets.forEach(function(el) {
              if (el.offsetParent === null) return; // not visible
              var text = el.innerText.trim();
              if (!text || text.split(/\\s+/).length <= 2) return;

              // Break text into words using Range to detect line breaks
              var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
              var node;
              var lines = [];

              while (node = walker.nextNode()) {
                var words = node.nodeValue.split(/(\\s+)/);
                var offset = 0;
                words.forEach(function(word) {
                  var clean = word.trim();
                  if (clean.length > 0) {
                    var range = document.createRange();
                    range.setStart(node, offset);
                    range.setEnd(node, offset + word.length);
                    var rect = range.getBoundingClientRect();
                    var wordTop = rect.top;
                    
                    // Match existing line within 6px threshold
                    var matchedLine = lines.find(l => Math.abs(l.top - wordTop) < 8);
                    if (matchedLine) {
                      matchedLine.words.push(clean);
                    } else {
                      lines.push({ top: wordTop, words: [clean] });
                    }
                  }
                  offset += word.length;
                });
              }

              // Sort lines by vertical position
              lines.sort((a,b) => a.top - b.top);

              if (lines.length > 1) {
                var lastLine = lines[lines.length - 1];
                // Check if last line has only 1 word
                if (lastLine.words.length === 1) {
                  issues.push({
                    tag: el.tagName,
                    id: el.id || el.className,
                    text: text,
                    lines: lines.map(l => l.words.join(' ')),
                    orphan: lastLine.words[0]
                  });
                }
              }
            });

            return issues;
          })();
        `
      });

      const issues = result.result.value || [];
      if (issues.length === 0) {
        console.log(`  -> Perfect! No orphan words found at width ${w}px.`);
      } else {
        console.log(`  -> Found ${issues.length} orphan word issues at width ${w}px:`);
        issues.forEach(iss => {
          console.log(`     [${iss.tag}#${iss.id}] Orphan word: "${iss.orphan}"`);
          console.log(`     Lines:`);
          iss.lines.forEach((l, idx) => console.log(`       Line ${idx+1}: "${l}"`));
        });
      }
    }

    client.close();
  } catch (err) {
    console.error('Error running test:', err);
  } finally {
    edgeProc.kill();
    server.close();
  }
}

main();
