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
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        } else {
          resolve(msg.result);
        }
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

async function getJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('============================================================');
  console.log('  STARTING COMPREHENSIVE VERIFICATION SUITE');
  console.log('============================================================');

  const { server, port } = await startServer();
  console.log(`Local static server listening at http://127.0.0.1:${port}`);

  const edgeProc = spawn(EDGE_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]);

  try {
    await sleep(1500);
    const targetList = await getJSON(`http://127.0.0.1:${CDP_PORT}/json`);
    const page = targetList.find(t => t.type === 'page');
    if (!page) throw new Error('No inspectable page found in Edge');

    const client = new CDPClient(page.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('DOM.enable');

    console.log('============================================================');
    console.log('  TEST SUITE 1: RESPONSIVE VIEWPORT PERFECTION (ZERO OVERFLOW)');
    console.log('============================================================');
    const pages = [
      'index.html',
      'how-it-works.html',
      'the-experience.html',
      'our-standards.html',
      'platform-features.html',
      'safety.html',
      'faq.html'
    ];
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
    console.log('  TEST SUITE 3: SUBPAGE DEDICATED ACTIVE NAVIGATION LINKS');
    console.log('============================================================');

    const subpageNavChecks = [
      { page: 'how-it-works.html', expectedText: 'How It Works', expectedHref: 'how-it-works.html' },
      { page: 'the-experience.html', expectedText: 'The Experience', expectedHref: 'the-experience.html' },
      { page: 'our-standards.html', expectedText: 'Our Standards', expectedHref: 'our-standards.html' },
      { page: 'platform-features.html', expectedText: 'Platform Features', expectedHref: 'platform-features.html' },
      { page: 'safety.html', expectedText: 'Trust & Safety', expectedHref: 'safety.html' },
      { page: 'faq.html', expectedText: 'FAQ', expectedHref: 'faq.html' }
    ];

    for (const sc of subpageNavChecks) {
      await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/${sc.page}` });
      await sleep(1000);

      const navEval = await client.send('Runtime.evaluate', {
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

      const actualText = navEval.result.value.activeText;
      const actualHref = navEval.result.value.activeHref;
      const matched = (actualText === sc.expectedText && actualHref.indexOf(sc.expectedHref) !== -1);
      console.log(`  Subpage: ${sc.page} -> Active Nav: "${actualText}" (${actualHref}) [${matched ? 'PASSED' : 'FAILED'}]`);
      if (!matched) {
        throw new Error(`Nav active check failed on ${sc.page}! Expected "${sc.expectedText}", got "${actualText}"`);
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
          var link = list.querySelector('a');
          link.click();
          var linkClickState = {
            isClosed: !list.classList.contains('is-open')
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
    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
    await sleep(1000);

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
    console.log('  TEST SUITE 6: CAPTURING MOBILE SCREENSHOTS (ALL 7 PAGES)');
    console.log('============================================================');
    const screenshotPages = [
      { file: 'index.html', out: 'verify_boost_index_mobile.png' },
      { file: 'how-it-works.html', out: 'verify_boost_hiw_mobile.png' },
      { file: 'the-experience.html', out: 'verify_boost_exp_mobile.png' },
      { file: 'our-standards.html', out: 'verify_boost_standards_mobile.png' },
      { file: 'platform-features.html', out: 'verify_boost_features_mobile.png' },
      { file: 'safety.html', out: 'verify_boost_safety_mobile.png' },
      { file: 'faq.html', out: 'verify_boost_faq_mobile.png' }
    ];

    for (const sp of screenshotPages) {
      await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/${sp.file}` });
      await sleep(1000);
      const ss = await client.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(ROOT_DIR, 'scratch', sp.out), Buffer.from(ss.data, 'base64'));
      console.log(`  Saved scratch/${sp.out}`);
    }

    console.log('\n============================================================');
    console.log('  TEST SUITE 7: SAFETY.HTML INTERACTIVE VERIFICATION');
    console.log('============================================================');
    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/safety.html` });
    await sleep(1000);

    const safetyInteractions = await client.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (function() {
          // 1. Check Trust & Safety nav link is active
          var navLinks = Array.from(document.querySelectorAll('#headerNavList a'));
          var activeLink = navLinks.find(l => l.classList.contains('is-active'));
          var isNavActive = activeLink && activeLink.getAttribute('href').indexOf('safety.html') !== -1;

          // 2. Test Tab Switch to Panel 2
          var tab2 = document.getElementById('sec-tab-2');
          if (tab2) tab2.click();
          var panel2 = document.getElementById('sec-panel-2');
          var panel2Active = panel2 && panel2.classList.contains('is-active') && !panel2.hasAttribute('hidden');

          // 3. Test Call Shield Simulator Toggle
          var btnTelecom = document.getElementById('toggleTelecomBtn');
          var btnShield = document.getElementById('toggleShieldBtn');
          var circuit = document.getElementById('circuitDisplay');

          if (btnTelecom) btnTelecom.click();
          var telecomActive = circuit && circuit.getAttribute('data-active-mode') === 'telecom';

          if (btnShield) btnShield.click();
          var shieldActive = circuit && circuit.getAttribute('data-active-mode') === 'shield';

          // 4. Test Checklist Checkbox & Reset
          var chk1 = document.getElementById('chk1');
          if (chk1) chk1.click();
          var chk1Checked = chk1 && chk1.checked;
          var chkCounter = document.getElementById('chkCounter');
          var counterTextBefore = chkCounter ? chkCounter.textContent : '';

          var resetBtn = document.getElementById('resetChecklistBtn');
          if (resetBtn) resetBtn.click();
          var chk1AfterReset = chk1 && !chk1.checked;
          var counterTextAfter = chkCounter ? chkCounter.textContent : '';

          // 5. Test Safety Report Modal Dialog Open/Close
          var reportBtn = document.querySelector('[data-action="safety-report"]');
          var modal = document.getElementById('safetyReportModal');
          if (reportBtn) reportBtn.click();
          var modalOpen = modal && !modal.hasAttribute('hidden');

          var closeBtn = document.getElementById('closeReportModalBtn');
          if (closeBtn) closeBtn.click();
          var modalClosed = modal && modal.hasAttribute('hidden');

          return {
            isNavActive: isNavActive,
            panel2Active: panel2Active,
            telecomActive: telecomActive,
            shieldActive: shieldActive,
            chk1Checked: chk1Checked,
            counterTextBefore: counterTextBefore,
            chk1AfterReset: chk1AfterReset,
            counterTextAfter: counterTextAfter,
            modalOpen: modalOpen,
            modalClosed: modalClosed
          };
        })()
      `
    });

    console.log('Safety interactive verification results:', safetyInteractions.result.value);
    const si = safetyInteractions.result.value;
    if (!si.isNavActive) throw new Error('safety.html nav item is not active!');
    if (!si.panel2Active) throw new Error('Panel 2 did not activate on tab click!');
    if (!si.telecomActive || !si.shieldActive) throw new Error('Call shield simulator toggle failed!');
    if (!si.chk1Checked) throw new Error('Checklist checkbox click failed!');
    if (!si.chk1AfterReset) throw new Error('Checklist reset failed!');
    if (!si.modalOpen || !si.modalClosed) throw new Error('Safety report modal dialog failed!');

    console.log('\n============================================================');
    console.log('  TEST SUITE 8: THE-EXPERIENCE.HTML INTERACTIVE VERIFICATION');
    console.log('============================================================');
    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/the-experience.html` });
    await sleep(1000);

    const expInteractions = await client.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (function() {
          // 1. Check The Experience nav link is active
          var navLinks = Array.from(document.querySelectorAll('#headerNavList a'));
          var activeLink = navLinks.find(l => l.classList.contains('is-active'));
          var isNavActive = activeLink && activeLink.getAttribute('href').indexOf('the-experience.html') !== -1;

          // 2. Test Tab Switch to Stage 3 (Dialogue & Voice)
          var tab3 = document.getElementById('stage-tab-3');
          if (tab3) tab3.click();
          var panel3 = document.getElementById('exp-panel-3');
          var panel3Active = panel3 && panel3.classList.contains('is-active') && !panel3.hasAttribute('hidden');

          // 3. Test Tab Switch to Stage 6 (Silver Select VIP)
          var tab6 = document.getElementById('stage-tab-6');
          if (tab6) tab6.click();
          var panel6 = document.getElementById('exp-panel-6');
          var panel6Active = panel6 && panel6.classList.contains('is-active') && !panel6.hasAttribute('hidden');

          // Switch back to tab 1 for simulator test
          var tab1 = document.getElementById('stage-tab-1');
          if (tab1) tab1.click();

          // 4. Test Morning Batch Simulator Advance
          var passBtn = document.getElementById('simPassBtn');
          var initialName = document.querySelector('.sim-name') ? document.querySelector('.sim-name').textContent : '';
          if (passBtn) passBtn.click();
          var nextName = document.querySelector('.sim-name') ? document.querySelector('.sim-name').textContent : '';

          // 5. Test Audio Voice Simulator Play Toggle
          var audioToggle = document.getElementById('audioPlayToggle');
          var audioSim = document.getElementById('audioPlayerSim');
          if (audioToggle) audioToggle.click();
          var isPlaying = audioSim && audioSim.classList.contains('is-playing');
          if (audioToggle) audioToggle.click(); // Pause

          // 6. Test Itinerary Calculator Update
          var venueSel = document.getElementById('venueSelect');
          var timeSel = document.getElementById('timeSelect');
          if (venueSel) {
            venueSel.value = 'museum';
            venueSel.dispatchEvent(new Event('change', { bubbles: true }));
          }
          if (timeSel) {
            timeSel.value = 'lunch';
            timeSel.dispatchEvent(new Event('change', { bubbles: true }));
          }
          var planTitle = document.getElementById('planTitle') ? document.getElementById('planTitle').textContent : '';
          var planTiming = document.getElementById('planTiming') ? document.getElementById('planTiming').textContent : '';

          return {
            isNavActive: isNavActive,
            panel3Active: panel3Active,
            panel6Active: panel6Active,
            initialName: initialName,
            nextName: nextName,
            profileAdvanced: (initialName !== nextName),
            isPlaying: isPlaying,
            planTitle: planTitle,
            planTiming: planTiming
          };
        })()
      `
    });

    console.log('The Experience interactive results:', expInteractions.result.value);
    const ei = expInteractions.result.value;
    if (!ei.isNavActive) throw new Error('the-experience.html nav item is not active!');
    if (!ei.panel3Active || !ei.panel6Active) throw new Error('Stage tab switching failed!');
    if (!ei.profileAdvanced) throw new Error('Morning batch profile advance failed!');
    if (!ei.isPlaying) throw new Error('Audio simulator play toggle failed!');
    if (ei.planTitle.indexOf('Museum') === -1) throw new Error('Itinerary calculator venue update failed!');

    console.log('\n============================================================');
    console.log('  TEST SUITE 9: CROSS-PAGE BRIDGE NAVIGATION (ALL 5 BRIDGES)');
    console.log('============================================================');
    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
    await sleep(1000);

    const bridgeTest = await client.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (function() {
          var expBridge = document.querySelector('.film-experience-bridge a');
          var stdBridge = document.querySelector('.hanging-standards-bridge a');
          var featBridge = document.querySelector('.comparison-features-bridge a');
          var safetyBridge = document.querySelector('.trust-safety-bridge a');
          var faqBridge = document.querySelector('.faq-knowledge-bridge a');
          return {
            hasExpBridge: !!expBridge && expBridge.getAttribute('href') === 'the-experience.html',
            hasStdBridge: !!stdBridge && stdBridge.getAttribute('href') === 'our-standards.html',
            hasFeatBridge: !!featBridge && featBridge.getAttribute('href') === 'platform-features.html',
            hasSafetyBridge: !!safetyBridge && safetyBridge.getAttribute('href') === 'safety.html',
            hasFaqBridge: !!faqBridge && faqBridge.getAttribute('href') === 'faq.html'
          };
        })()
      `
    });

    console.log('Cross-page bridge verification:', bridgeTest.result.value);
    const bt = bridgeTest.result.value;
    if (!bt.hasExpBridge || !bt.hasStdBridge || !bt.hasFeatBridge || !bt.hasSafetyBridge || !bt.hasFaqBridge) {
      throw new Error('One or more cross-page bridge links missing on index.html!');
    }

    console.log('\n============================================================');
    console.log('  TEST SUITE 10: NEW SUBPAGES INTERACTIVE VERIFICATION');
    console.log('============================================================');

    // 10A: our-standards.html
    console.log('\nTesting our-standards.html structure:');
    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/our-standards.html` });
    await sleep(1000);

    const stdCheck = await client.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (function() {
          var pillars = document.querySelectorAll('.standard-pillar-block');
          var rules = document.querySelectorAll('.prule-item');
          var stats = document.querySelectorAll('.pstat-item');
          return {
            pillarCount: pillars.length,
            ruleCount: rules.length,
            statCount: stats.length
          };
        })()
      `
    });
    console.log('  Standards checks:', stdCheck.result.value);
    const scVal = stdCheck.result.value;
    if (scVal.pillarCount !== 4 || scVal.ruleCount !== 4 || scVal.statCount !== 3) {
      throw new Error('our-standards.html structural elements count mismatch!');
    }

    // 10B: platform-features.html
    console.log('\nTesting platform-features.html category filters:');
    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/platform-features.html` });
    await sleep(1000);

    const featCheck = await client.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (function() {
          var allCards = Array.from(document.querySelectorAll('.feature-card'));
          var totalCount = allCards.length;

          // Click privacy filter
          var privacyBtn = document.querySelector('.filter-tab-btn[data-filter="privacy"]');
          if (privacyBtn) privacyBtn.click();
          var visibleAfterPrivacy = allCards.filter(c => !c.hasAttribute('hidden')).length;

          // Click silver filter
          var silverBtn = document.querySelector('.filter-tab-btn[data-filter="silver"]');
          if (silverBtn) silverBtn.click();
          var visibleAfterSilver = allCards.filter(c => !c.hasAttribute('hidden')).length;

          // Click all filter
          var allBtn = document.querySelector('.filter-tab-btn[data-filter="all"]');
          if (allBtn) allBtn.click();
          var visibleAfterAll = allCards.filter(c => !c.hasAttribute('hidden')).length;

          return {
            totalCount: totalCount,
            visibleAfterPrivacy: visibleAfterPrivacy,
            visibleAfterSilver: visibleAfterSilver,
            visibleAfterAll: visibleAfterAll
          };
        })()
      `
    });
    console.log('  Features filter checks:', featCheck.result.value);
    const fcVal = featCheck.result.value;
    if (fcVal.totalCount !== 18 || fcVal.visibleAfterPrivacy === 0 || fcVal.visibleAfterSilver === 0 || fcVal.visibleAfterAll !== 18) {
      throw new Error('platform-features.html interactive filter test failed!');
    }

    // 10C: faq.html
    console.log('\nTesting faq.html live search & category pills:');
    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/faq.html` });
    await sleep(1000);

    const faqCheck = await client.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (function() {
          var allFaq = Array.from(document.querySelectorAll('.faq-item'));
          var totalCount = allFaq.length;

          // 1. Live search test
          var searchInput = document.getElementById('faqSearchInput');
          if (searchInput) {
            searchInput.value = 'selfie';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          var visibleAfterSearch = allFaq.filter(f => !f.hasAttribute('hidden')).length;

          // Clear search
          if (searchInput) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          var visibleAfterClear = allFaq.filter(f => !f.hasAttribute('hidden')).length;

          // 2. Category pill test
          var safetyPill = document.querySelector('.cat-pill-btn[data-category="safety"]');
          if (safetyPill) safetyPill.click();
          var visibleAfterSafetyPill = allFaq.filter(f => !f.hasAttribute('hidden')).length;

          // Reset to all
          var allPill = document.querySelector('.cat-pill-btn[data-category="all"]');
          if (allPill) allPill.click();

          // 3. Details accordion expand test on initially closed second item
          var secondItem = allFaq[1];
          var secondSummary = secondItem ? secondItem.querySelector('summary') : null;
          var secondBeforeClick = secondItem ? secondItem.hasAttribute('open') : false;
          if (secondSummary) secondSummary.click();
          var secondAfterClick = secondItem ? secondItem.hasAttribute('open') : false;

          return {
            totalCount: totalCount,
            visibleAfterSearch: visibleAfterSearch,
            visibleAfterClear: visibleAfterClear,
            visibleAfterSafetyPill: visibleAfterSafetyPill,
            accordionToggled: (!secondBeforeClick && secondAfterClick)
          };
        })()
      `
    });
    console.log('  FAQ checks:', faqCheck.result.value);
    const faqVal = faqCheck.result.value;
    if (faqVal.totalCount !== 16 || faqVal.visibleAfterSearch === 0 || faqVal.visibleAfterSearch >= 16 || faqVal.visibleAfterClear !== 16 || faqVal.visibleAfterSafetyPill === 0 || !faqVal.accordionToggled) {
      throw new Error('faq.html interactive live search & accordion test failed!');
    }

    console.log('\n>>> ALL 10 TEST SUITES PASSED FLAWLESSLY! <<<');

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
