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
      const cleanPath = reqPath.replace(/^\//, '');
      const filePath = path.join(ROOT_DIR, cleanPath);
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

    console.log('============================================================');
    console.log('  TEST SUITE 1: RESPONSIVE VIEWPORT PERFECTION (ZERO OVERFLOW)');
    console.log('============================================================');
    const pages = ['index.html', 'how-it-works.html'];
    const widths = [360, 375, 390, 412, 480];

    for (const p of pages) {
      console.log(`\nPage: ${p}`);
      for (const w of widths) {
        await client.send('Emulation.setDeviceMetricsOverride', {
          width: w,
          height: 844,
          deviceScaleFactor: 2,
          mobile: true
        });
        await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/${p}` });
        await sleep(1000);

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
        const status = v.isPerfect ? 'PASSED (0 overflow)' : 'FAILED (OVERFLOW)';
        console.log(`  Width ${w}px -> clientW: ${v.clientW}px, scrollW: ${v.scrollW}px | ${status}`);
        if (!v.isPerfect) throw new Error(`Overflow on ${p} at ${w}px!`);
      }
    }

    console.log('\n============================================================');
    console.log('  TEST SUITE 2: SECTION ANCHOR IDs & TOP-LEVEL ALIGNMENT');
    console.log('============================================================');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1200,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
    await sleep(1000);

    const anchorCheck = await client.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (function() {
          var expectedIds = [
            'hero',
            'experience',
            'standards',
            'platform-advantages',
            'features',
            'why-us',
            'safety',
            'faq'
          ];
          var results = {};
          expectedIds.forEach(function(id) {
            var el = document.getElementById(id);
            results[id] = {
              exists: !!el,
              tagName: el ? el.tagName : null,
              offsetTop: el ? el.offsetTop : null
            };
          });
          return results;
        })()
      `
    });

    console.log('Anchor verification on index.html:');
    for (const [id, info] of Object.entries(anchorCheck.result.value)) {
      console.log(`  #${id}: ${info.exists ? 'FOUND (' + info.tagName + ', offsetTop=' + info.offsetTop + 'px)' : 'MISSING'}`);
      if (!info.exists) throw new Error(`Required anchor #${id} missing!`);
    }

    console.log('\n============================================================');
    console.log('  TEST SUITE 3: SCROLLSPY RE-VERIFICATION (EVERY SECTION LIGHTS UP)');
    console.log('============================================================');

    const expectedSequence = [
      { id: 'experience', label: 'The Experience' },
      { id: 'standards', label: 'Our Standards' },
      { id: 'features', label: 'Platform Features' },
      { id: 'safety', label: 'Trust & Safety' },
      { id: 'faq', label: 'FAQ' }
    ];

    for (const target of expectedSequence) {
      await client.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `
          (function() {
            var el = document.getElementById('${target.id}');
            if (el) el.scrollIntoView({ behavior: 'instant' });
          })()
        `
      });
      await sleep(250);

      const spyCheck = await client.send('Runtime.evaluate', {
        returnByValue: true,
        expression: `
          (function() {
            var active = document.querySelector('.header-nav-list a.is-active');
            return {
              activeText: active ? active.textContent.trim() : 'NONE',
              activeHref: active ? active.getAttribute('href') : 'NONE'
            };
          })()
        `
      });

      const actualLabel = spyCheck.result.value.activeText;
      const matched = actualLabel === target.label;
      console.log(`  Scrolled to #${target.id} -> Expected: "${target.label}" | Actual: "${actualLabel}" [${matched ? 'PASSED' : 'FAILED'}]`);
      if (!matched) {
        throw new Error(`ScrollSpy failed on #${target.id}! Expected "${target.label}", got "${actualLabel}"`);
      }
    }

    console.log('\n============================================================');
    console.log('  TEST SUITE 4: MOBILE MENU & BACKDROP ACCESSIBILITY');
    console.log('============================================================');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
    await sleep(1000);

    const drawerTest = await client.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (function() {
          var btn = document.getElementById('headerMenuBtn');
          var list = document.getElementById('headerNavList');
          var backdrop = document.getElementById('headerNavBackdrop');

          // 1. Open drawer
          btn.click();
          var openState = {
            isOpen: list.classList.contains('is-open'),
            ariaExpanded: btn.getAttribute('aria-expanded'),
            backdropActive: backdrop ? backdrop.classList.contains('is-active') : false
          };

          // 2. Press Escape
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          var escapeState = {
            isClosed: !list.classList.contains('is-open'),
            ariaExpanded: btn.getAttribute('aria-expanded'),
            backdropInactive: backdrop ? !backdrop.classList.contains('is-active') : false
          };

          // 3. Open drawer again and click a link
          btn.click();
          var link = list.querySelector('a[href*="#standards"]');
          link.click();
          var linkClickState = {
            isClosed: !list.classList.contains('is-open'),
            currentHash: window.location.hash
          };

          return {
            openTest: openState,
            escapeTest: escapeState,
            linkClickTest: linkClickState
          };
        })()
      `
    });

    console.log('Mobile Drawer Interaction Results:', JSON.stringify(drawerTest.result.value, null, 2));
    const dRes = drawerTest.result.value;
    if (!dRes.openTest.isOpen || !dRes.escapeTest.isClosed || !dRes.linkClickTest.isClosed) {
      throw new Error('Mobile drawer interaction test failed!');
    }

    console.log('\n============================================================');
    console.log('  TEST SUITE 5: ORPHAN WORD VERIFICATION');
    console.log('============================================================');
    const orphanCheck = await client.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (function() {
          var hTitle = document.querySelector('.hanging-title');
          var fTitle = document.querySelector('#faqTitle');

          function getLines(el) {
            if (!el) return [];
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
                  var matched = lines.find(l => Math.abs(l.top - rect.top) < 8);
                  if (matched) matched.words.push(clean);
                  else lines.push({ top: rect.top, words: [clean] });
                }
                offset += word.length;
              });
            }
            return lines;
          }

          var hLines = getLines(hTitle);
          var fLines = getLines(fTitle);

          var hLastLine = hLines.length ? hLines[hLines.length - 1].words : [];
          var fLastLine = fLines.length ? fLines[fLines.length - 1].words : [];

          return {
            hangingTitleLines: hLines.map(l => l.words.join(' ')),
            hangingLastCount: hLastLine.length,
            faqTitleLines: fLines.map(l => l.words.join(' ')),
            faqLastCount: fLastLine.length
          };
        })()
      `
    });

    console.log('Orphan words check at 390px:');
    console.log('  Hanging Title lines:', orphanCheck.result.value.hangingTitleLines);
    console.log('  FAQ Title lines:', orphanCheck.result.value.faqTitleLines);
    console.log('  Hanging Title last line word count:', orphanCheck.result.value.hangingLastCount, '(>= 2 is required)');
    console.log('  FAQ Title last line word count:', orphanCheck.result.value.faqLastCount, '(>= 2 is required)');

    if (orphanCheck.result.value.hangingLastCount < 2 || orphanCheck.result.value.faqLastCount < 2) {
      throw new Error('Orphan word detected!');
    }

    console.log('\n============================================================');
    console.log('  TEST SUITE 6: CAPTURING MOBILE SCREENSHOTS');
    console.log('============================================================');
    const ssIndex = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'verify_boost_index_mobile.png'), Buffer.from(ssIndex.data, 'base64'));
    console.log('  Saved scratch/verify_boost_index_mobile.png');

    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/how-it-works.html` });
    await sleep(1000);
    const ssHiw = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'verify_boost_hiw_mobile.png'), Buffer.from(ssHiw.data, 'base64'));
    console.log('  Saved scratch/verify_boost_hiw_mobile.png');

    console.log('\n>>> ALL 6 TEST SUITES PASSED FLAWLESSLY! <<<');

    client.close();
  } finally {
    edgeProc.kill();
    server.close();
  }
}

main().catch(err => {
  console.error('\nTEST FAILED:', err);
  process.exit(1);
});
