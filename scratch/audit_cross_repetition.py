import glob
import os
import re
from collections import Counter

texts = {}
components = ['header', 'hero', 'film', 'hanging-cards', 'comparison', 'trust', 'faq', 'footer']

for comp in components:
    path = f'components/{comp}/template.html'
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            clean = re.sub(r'<svg.*?</svg>', '', content, flags=re.DOTALL)
            clean = re.sub(r'<[^>]+>', ' ', clean)
            clean = re.sub(r'&nbsp;', ' ', clean)
            clean = re.sub(r'&amp;', '&', clean)
            clean = re.sub(r'&ndash;', '-', clean)
            clean = re.sub(r'\s+', ' ', clean).strip()
            texts[comp] = clean

print("=== CHECKING COMMON 3-WORD PHRASES ACROSS COMPONENTS ===")
comp_phrases = {}
for comp, text in texts.items():
    words = [re.sub(r'[^a-zA-Z0-9]', '', w.lower()) for w in text.split()]
    words = [w for w in words if w]
    phrases = set()
    for i in range(len(words)-2):
        p = " ".join(words[i:i+3])
        phrases.add(p)
    comp_phrases[comp] = phrases

generic_whitelist = {
    'singles over 50', 'for singles over', 'privacy policy terms', 'terms of service',
    'over 50 who', 'over 50 in', 'people over 50', 'mature singles over'
}

overlap_found = False
for i in range(len(components)):
    for j in range(i+1, len(components)):
        c1 = components[i]
        c2 = components[j]
        overlap = comp_phrases[c1].intersection(comp_phrases[c2]) - generic_whitelist
        if overlap:
            overlap_found = True
            print(f"\nOverlap between [{c1}] and [{c2}]:")
            for phrase in sorted(overlap):
                print(f"  - '{phrase}'")

if not overlap_found:
    print("No notable phrase overlap found!")
