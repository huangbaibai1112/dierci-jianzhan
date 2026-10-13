const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const page = list.find(t => t.type === 'page');
        if (page && page.webSocketDebuggerUrl) {
          return page.webSocketDebuggerUrl;
        }
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

  close() {
    this.ws.close();
  }
}

async function main() {
  const edgeProc = spawn(EDGE_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--window-size=1280,1000',
    '--disable-gpu',
    'about:blank'
  ]);

  try {
    const wsUrl = await getWsUrl();
    console.log("Connected to CDP:", wsUrl);
    const client = new CDPClient(wsUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('DOM.enable');

    console.log("Navigating to http://localhost:8080/...");
    await client.send('Page.navigate', { url: 'http://localhost:8080/' });
    await sleep(2500);

    // Test re-randomization on clicking the same scene (Scene 0 twice)
    console.log("Testing Scene 0 click 1...");
    await client.send('Runtime.evaluate', {
      expression: `
        (function() {
          var seg = document.querySelector('.timeline-segment[data-step="0"]');
          if (seg) seg.click();
          var player = document.getElementById('filmPlayer');
          if (player) {
            var top = player.getBoundingClientRect().top + window.pageYOffset - 20;
            window.scrollTo(0, top);
          }
        })();
      `
    });
    await sleep(1000);
    let ss = await client.send('Page.captureScreenshot');
    fs.writeFileSync(path.join(__dirname, 'scene_0_click1.png'), Buffer.from(ss.data, 'base64'));

    console.log("Testing Scene 0 click 2 (re-randomization)...");
    await client.send('Runtime.evaluate', {
      expression: `
        (function() {
          var seg = document.querySelector('.timeline-segment[data-step="0"]');
          if (seg) seg.click();
        })();
      `
    });
    await sleep(1000);
    ss = await client.send('Page.captureScreenshot');
    fs.writeFileSync(path.join(__dirname, 'scene_0_click2.png'), Buffer.from(ss.data, 'base64'));

    for (let scene = 1; scene < 6; scene++) {
      console.log(`Setting scene ${scene}...`);
      await client.send('Runtime.evaluate', {
        expression: `
          (function() {
            var seg = document.querySelector('.timeline-segment[data-step="${scene}"]');
            if (seg) seg.click();
          })();
        `
      });

      await sleep(2000); // allow full text bloom

      const screenshot = await client.send('Page.captureScreenshot');
      const buffer = Buffer.from(screenshot.data, 'base64');
      const outPath = path.join(__dirname, `scene_${scene}.png`);
      fs.writeFileSync(outPath, buffer);
      console.log(`Saved screenshot: ${outPath} (${buffer.length} bytes)`);
    }

    client.close();
  } finally {
    edgeProc.kill();
  }
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
