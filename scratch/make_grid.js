const fs = require('fs');
const path = require('path');

let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { margin: 0; background: #0F172A; display: flex; flex-wrap: wrap; gap: 30px; padding: 30px; font-family: -apple-system, sans-serif; color: #fff; }
  .box { display: flex; flex-direction: column; gap: 10px; }
  .screen-wrap { position: relative; width: 340px; height: 740px; background: #000; border: 4px solid #334155; border-radius: 20px; overflow: hidden; }
  img { width: 100%; height: 100%; object-fit: cover; }
  .r-line { position: absolute; left: 0; right: 0; border-top: 1px dashed rgba(239, 68, 68, 0.7); font-size: 11px; color: #FCA5A5; padding-left: 4px; pointer-events: none; }
  .c-line { position: absolute; top: 0; bottom: 0; border-left: 1px dashed rgba(59, 130, 246, 0.7); font-size: 11px; color: #93C5FD; padding-top: 4px; pointer-events: none; }
  .tag { font-weight: 800; font-size: 14px; color: #38BDF8; }
</style>
</head>
<body>
`;

const screens = [
  { step: 1, file: 'ui06-profile.jpg', title: '01: Onboarding & Profile Verification' },
  { step: 2, file: 'ui05-filters.png', title: '02: Discovery Filters' },
  { step: 3, file: 'ui02-daily-picks.jpg', title: '03: 9:00 AM Daily Picks' },
  { step: 4, file: 'ui07-conversation-starters.png', title: '04: Prompts & Voice' },
  { step: 5, file: 'ui03-voice.png', title: '05: Call Shield Voice' },
  { step: 6, file: 'ui04-coffee-event.jpg', title: '06: Daylight Meetup' }
];

screens.forEach(s => {
  html += `  <div class="box">
    <div class="tag">Step ${s.title}</div>
    <div class="screen-wrap">
      <img src="../assets/ui/${s.file}">
`;
  for (let y = 10; y <= 90; y += 10) {
    html += `      <div class="r-line" style="top: ${y}%;">Y: ${y}%</div>\n`;
  }
  for (let x = 20; x <= 80; x += 20) {
    html += `      <div class="c-line" style="left: ${x}%;">X: ${x}%</div>\n`;
  }
  html += `    </div>
  </div>\n`;
});

html += `</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'inspect_grid.html'), html);
console.log('inspect_grid.html generated');
