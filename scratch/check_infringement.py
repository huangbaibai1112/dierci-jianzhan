import os
import re

with open('侵权词.txt', 'r', encoding='utf-8') as f:
    raw_lines = f.readlines()

keywords = []
for line in raw_lines:
    clean = line.replace('\xa0', ' ').strip()
    if clean and not clean.startswith('#'):
        keywords.append(clean)

# Deduplicate
unique_kw = list(dict.fromkeys([k.strip() for k in keywords if k.strip()]))

target_files = []
for root, dirs, files in os.walk('.'):
    # skip .git and scratch
    if '.git' in root or 'scratch' in root or '__pycache__' in root:
        continue
    for file in files:
        if file in ['侵权词.txt', 'banned-keywords.txt', 'ai-banned-wording.txt', '网站与APP功能清单.md']:
            continue
        ext = os.path.splitext(file)[1].lower()
        if ext in ['.html', '.js', '.css', '.json', '.py', '.txt']:
            target_files.append(os.path.join(root, file))

print(f"Scanning {len(target_files)} project files against {len(unique_kw)} keywords...\n")

findings = []

for filepath in target_files:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        continue
    
    lines = content.splitlines()
    for kw in unique_kw:
        pattern = r'\b' + re.escape(kw) + r'\b'
        for line_no, line_text in enumerate(lines, 1):
            matches = list(re.finditer(pattern, line_text, re.IGNORECASE))
            if matches:
                for m in matches:
                    matched_str = m.group(0)
                    findings.append({
                        'file': filepath,
                        'line': line_no,
                        'keyword': kw,
                        'matched': matched_str,
                        'line_content': line_text.strip()
                    })

if not findings:
    print(">>> NO INFRINGING KEYWORDS FOUND! <<<")
else:
    print(f">>> FOUND {len(findings)} POTENTIAL MATCHES! <<<\n")
    for item in findings:
        print(f"{item['file']}:{item['line']} | Keyword: '{item['keyword']}' | Matched: '{item['matched']}'")
        print(f"   Context: {item['line_content'][:140]}")
        print()
