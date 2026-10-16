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
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(file).pipe(res);
    });
    s.listen(0, '127.0.0.1', () => {
      resolve({ server: s, port: s.address().port });
    });
  });

  const edge = spawn(EDGE_PATH, ['--remote-debugging-port=9227', '--headless=new', 'about:blank']);
  await new Promise(r => setTimeout(r, 1500));

  const list = await (await fetch('http://127.0.0.1:9227/json/list')).json();
  const ws = new WebSocket(list[0].webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let msgId = 0;
  function send(method, params = {}) {
    return new Promise((resolve) => {
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
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html#experience` });
  await new Promise(r => setTimeout(r, 2000));

  const res = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: JSON.stringify({
      run: true
    }) ? `
      (function() {
        var el = document.getElementById('experience');
        var r = el ? el.getBoundingClientRect() : null;
        var activeLink = document.querySelector('.header-nav-list a.is-active');
        return {
          scrollY: window.pageYOffset,
          elTop: r ? Math.round(r.top) : null,
          activeText: activeLink ? activeLink.textContent : 'NONE'
        };
      })()
    ` : ''
  });
  console.log('Cold load /index.html#experience ->', res.result.value);

  ws.close();
  edge.kill();
  server.close();
}
test().catch(console.error);
