import os

with open('侵权词.txt', 'r', encoding='utf-8') as f:
    raw_lines = f.readlines()

keywords = []
for line in raw_lines:
    clean = line.replace('\xa0', ' ').strip().lower()
    if clean and not clean.startswith('#'):
        keywords.append(clean)

keywords = list(dict.fromkeys(keywords))

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

print(f"Checking {len(files_to_check)} files for exact case-insensitive phrase occurrences of {len(keywords)} items...")

matches_found = []

# Exclude very short 2-letter tokens from raw substring search (e.g. 'sa', 'cp') because they would match inside normal English words like 'same', 'tcp', 'script' etc.
# But for all phrases >= 3 characters, let's do a substring and word-boundary check.
for kw in keywords:
    for fp in files_to_check:
        with open(fp, 'r', encoding='utf-8') as f:
            content = f.read().lower()
        
        if len(kw) <= 2:
            import re
            if re.search(r'\b' + re.escape(kw) + r'\b', content):
                matches_found.append((fp, kw, "word-boundary"))
        else:
            if kw in content:
                matches_found.append((fp, kw, "substring"))

if not matches_found:
    print("\n>>> ABSOLUTELY ZERO INFRINGING KEYWORDS OR PHRASES FOUND! <<<")
else:
    print(f"\n[!] Found {len(matches_found)} potential occurrences:")
    for m in matches_found:
        print(f"   File: {m[0]} | Keyword: '{m[1]}' ({m[2]})")
