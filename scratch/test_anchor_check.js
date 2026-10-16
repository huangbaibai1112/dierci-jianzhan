const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function testAnchorOverlap() {
  const edgePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  let edgePath = edgePaths.find(p => fs.existsSync(p));
  const port = 9334;
  const proc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=' + port,
    '--no-first-run',
    '--no-default-browser-check'
  ]);
  await new Promise(r => setTimeout(r, 1500));

  function getJSON(url) {
    return new Promise((resolve, reject) => {
      http.get(url, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });
  }

  const targets = await getJSON('http://127.0.0.1:' + port + '/json');
  const target = targets.find(t => t.type === 'page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let msgId = 1;
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      function onMsg(event) {
        const d = JSON.parse(event.data);
        if (d.id === id) {
          ws.removeEventListener('message', onMsg);
          resolve(d.result);
        }
      }
      ws.addEventListener('message', onMsg);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('DOM.enable');

  const fileUrl = 'file:///' + path.resolve('index.html').replace(/\\/g, '/');
  await send('Page.navigate', { url: fileUrl });
  await new Promise(r => setTimeout(r, 1200));

  const anchors = ['experience', 'standards', 'features', 'safety', 'faq'];
  for (const a of anchors) {
    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const header = document.querySelector('.comp-header');
        const headerHeight = header.getBoundingClientRect().height;
        const el = document.getElementById('${a}');
        if (!el) return { error: 'not found' };
        el.scrollIntoView({ behavior: 'instant' });
        const rect = el.getBoundingClientRect();
        return {
          id: '${a}',
          headerHeight,
          rectTop: rect.top,
          isCoveredByHeader: rect.top < headerHeight
        };
      })()`,
      returnByValue: true
    });
    console.log(res.result.value);
  }

  ws.close();
  proc.kill();
}
testAnchorOverlap().catch(console.error);
