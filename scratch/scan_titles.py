import glob
import re

for p in sorted(glob.glob('components/*/template.html')):
    with open(p, encoding='utf-8') as f:
        html = f.read()
    print(f'=== {p} ===')
    # Find all h1, h2, h3, h4 tags
    headings = re.findall(r'<(h[1-4])[^>]*>(.*?)</\1>', html, re.DOTALL | re.IGNORECASE)
    for tag, content in headings:
        clean = re.sub(r'<[^>]+>', ' ', content)
        clean = ' '.join(clean.split())
        print(f'  {tag.upper()}: {clean}')
    # Find all kickers
    kickers = re.findall(r'<span[^>]*class="[^"]*kicker[^"]*"[^>]*>(.*?)</span>', html, re.DOTALL | re.IGNORECASE)
    for k in kickers:
        clean = ' '.join(re.sub(r'<[^>]+>', ' ', k).split())
        print(f'  KICKER: {clean}')
    # Find section-header p
    sec_p = re.findall(r'<div[^>]*class="[^"]*section-header[^"]*"[^>]*>.*?<p[^>]*>(.*?)</p>', html, re.DOTALL | re.IGNORECASE)
    for sp in sec_p:
        clean = ' '.join(re.sub(r'<[^>]+>', ' ', sp).split())
        print(f'  SEC-P: {clean}')
