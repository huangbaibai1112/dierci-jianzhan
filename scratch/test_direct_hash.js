const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function test() {
  const { server, port } = await new Promise(resolve => {
    const s = http.createServer((req, res) => {
      let p = req.url.split('?')[0];
      if (p === '/' || p === '') p = '/index.html';
      const file = path.join(process.cwd(), p);
      if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, {'Content-Type': 'text/html'});
      fs.createReadStream(file).pipe(res);
    });
    s.listen(0, '127.0.0.1', () => {
      resolve({ server: s, port: s.address().port });
    });
  });

  const edge = spawn(EDGE_PATH, ['--remote-debugging-port=9225', '--headless=new', 'about:blank']);
  await new Promise(r => setTimeout(r, 1500));

  const list = await (await fetch('http://127.0.0.1:9225/json/list')).json();
  const ws = new WebSocket(list[0].webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let msgId = 0;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++msgId;
      const onMsg = (e) => {
        const d = JSON.parse(e.data);
        if (d.id === id) {
          ws.removeEventListener('message', onMsg);
          resolve(d.result);
        }
      };
      ws.addEventListener('message', onMsg);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');

  const targets = ['#experience', '#standards', '#features', '#safety', '#faq'];
  for (const t of targets) {
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html${t}` });
    await new Promise(r => setTimeout(r, 1500));

    const evalRes = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (function() {
          var targetId = '${t.substring(1)}';
          var el = document.getElementById(targetId);
          return {
            target: targetId,
            scrollY: window.pageYOffset,
            hash: window.location.hash,
            elFound: !!el,
            elTop: el ? Math.round(el.getBoundingClientRect().top) : null
          };
        })()
      `
    });
    console.log(t, evalRes.result.value);
  }

  ws.close();
  edge.kill();
  server.close();
}
test().catch(console.error);
