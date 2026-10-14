const http = require('http');

(async () => {
  const res = await fetch('http://127.0.0.1:9222/json/list');
  const list = await res.json();
  const page = list.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = Math.floor(Math.random() * 100000);
      const handler = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const evalRes = await send('Runtime.evaluate', {
    expression: `
      ['#why-us', '.benchmark-stage-wrap', '.benchmark-stage', '#why-us .stage-master-canvas', '#safety', '.trust-stage', '#safety .stage-master-canvas', '#faq', '.faq-stage', '#faq .stage-master-canvas'].map(sel => {
        const el = document.querySelector(sel);
        if (!el) return { sel, found: false };
        const cs = window.getComputedStyle(el);
        return {
          sel,
          found: true,
          bg: cs.backgroundColor,
          bgImage: cs.backgroundImage.substring(0, 60),
          border: cs.border,
          boxShadow: cs.boxShadow,
          borderRadius: cs.borderRadius,
          width: el.offsetWidth,
          height: el.offsetHeight
        };
      })
    `,
    returnByValue: true
  });
  console.log(JSON.stringify(evalRes.result.value, null, 2));
  ws.close();
})();
