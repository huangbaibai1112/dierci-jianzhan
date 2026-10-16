import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('侵权词.txt', 'r', encoding='utf-8') as f:
    raw_lines = f.readlines()

keywords = []
for line in raw_lines:
    clean = line.replace('\xa0', ' ').strip()
    if clean and not clean.startswith('#'):
        keywords.append(clean)

# Deduplicate case-insensitively
seen = set()
unique_kw = []
for kw in keywords:
    low = kw.lower()
    if low not in seen:
        seen.add(low)
        unique_kw.append(kw)

files_to_check = []
for root, dirs, files in os.walk('.'):
    if '.git' in root or 'scratch' in root or '__pycache__' in root:
        continue
    for file in files:
        if file in ['侵权词.txt', 'banned-keywords.txt', 'ai-banned-wording.txt', '网站与APP功能清单.md']:
            continue
        ext = os.path.splitext(file)[1].lower()
        if ext in ['.html', '.js', '.css', '.json', '.py']:
            files_to_check.append(os.path.join(root, file))

print(f"Total files: {len(files_to_check)}, Total keywords: {len(unique_kw)}")

results = []

for fp in sorted(files_to_check):
    with open(fp, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.splitlines()
    for lno, line in enumerate(lines, 1):
        for kw in unique_kw:
            # 1. Word boundary match
            pattern = r'\b' + re.escape(kw) + r'\b'
            m = re.search(pattern, line, re.IGNORECASE)
            if m:
                results.append({
                    'file': fp,
                    'line_no': lno,
                    'kw': kw,
                    'match': m.group(0),
                    'type': 'exact_word',
                    'context': line.strip()
                })
            else:
                # 2. Check if keyword stem appears (e.g. 'spark' in 'sparks' or 'sparkles')
                if len(kw) >= 4 and kw.lower() in line.lower():
                    # check what substring matched
                    sub_m = re.search(re.escape(kw), line, re.IGNORECASE)
                    results.append({
                        'file': fp,
                        'line_no': lno,
                        'kw': kw,
                        'match': sub_m.group(0),
                        'type': 'stem_substring',
                        'context': line.strip()
                    })

print(f"\n--- SCAN COMPLETE: {len(results)} HITS FOUND ---")
for r in results:
    print(f"[{r['type']}] {r['file']}:{r['line_no']} | Key: '{r['kw']}' | Matched: '{r['match']}'")
    print(f"   Line: {r['context'][:120]}")
