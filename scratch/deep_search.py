import os
import re

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

terms = [
    'seek', 'seeks', 'seeking', 'spark', 'arrangement', 'arrangements', 
    'luxy', 'ourtime', 'hypergamy', 'sugar', 'bitch', 'cp', 'sa', 'pthc',
    'jailbait', 'fag', 'faggot', 'cunt', 'negro', 'nigga', 'nigger', 'honky'
]

print(f"Checking {len(files_to_check)} files for high-risk single word roots...")
for term in terms:
    pattern = r'\b' + re.escape(term) + r'\b'
    matches = []
    for fp in files_to_check:
        with open(fp, 'r', encoding='utf-8') as f:
            for lno, line in enumerate(f, 1):
                if re.search(pattern, line, re.IGNORECASE):
                    matches.append((fp, lno, line.strip()))
    if matches:
        print(f"\n[!] Term '{term}': {len(matches)} matches found!")
        for m in matches[:10]:
            print(f"   {m[0]}:{m[1]} -> {m[2][:120]}")
    else:
        print(f"[OK] '{term}': 0 matches.")
