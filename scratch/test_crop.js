const fs = require('fs');
const path = require('path');
const http = require('http');

// Simple test page to see different crops of hero photo
const html = `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: sans-serif; background: #f0f0f0; padding: 20px; display: flex; gap: 20px; }
  .box { width: 490px; background: white; padding: 16px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
  .frame { border-radius: 16px; overflow: hidden; background: #FAFAF9; border: 1px solid #e2e8f0; position: relative; }
  img { width: 100%; display: block; object-fit: cover; }
  .badge { position: absolute; background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: bold; border: 1px solid #86efac; }
  .b-top-left { top: 12px; left: 12px; }
  .b-bottom-right { bottom: 12px; right: 12px; }
</style>
</head>
<body>
  <div class="box">
    <h3>Option A: height 360px, object-position: center 28%</h3>
    <div class="frame">
      <img src="/assets/ui/ui02-daily-picks.jpg" style="height: 360px; object-position: center 28%;">
      <span class="badge b-bottom-right">✓ ID Confirmed</span>
    </div>
  </div>
  <div class="box">
    <h3>Option B: height 380px, object-position: center 32%</h3>
    <div class="frame">
      <img src="/assets/ui/ui02-daily-picks.jpg" style="height: 380px; object-position: center 32%;">
      <span class="badge b-bottom-right">✓ ID Confirmed</span>
    </div>
  </div>
  <div class="box">
    <h3>Option C: height 400px, object-position: center 35%</h3>
    <div class="frame">
      <img src="/assets/ui/ui02-daily-picks.jpg" style="height: 400px; object-position: center 35%;">
      <span class="badge b-bottom-right">✓ ID Confirmed</span>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'test_crop.html'), html);
console.log('test_crop.html written');
