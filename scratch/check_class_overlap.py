import re
import os

components = ['header', 'hero', 'film', 'hanging-cards', 'comparison', 'trust', 'faq', 'footer']
globals_ok = {'btn', 'btn-primary', 'kicker', 'site-wrap', 'highlight', 'honey', 'w', 'chip-popup', 'chip-rose', 'chip-juniper', 'chip-amber', 'chip-sky', 'chip-voice'}

comp_classes = {}
for c in components:
    css_path = f'components/{c}/style.css'
    if not os.path.exists(css_path): continue
    with open(css_path, 'r', encoding='utf-8') as f:
        css = f.read()
    css = re.sub(r'/\*[\s\S]*?\*/', '', css)
    comp_classes[c] = set(re.findall(r'\.([a-zA-Z0-9_-]+)', css))

# Check for overlaps between component A's CSS and component B's template
conflicts = []
for c_css, classes in comp_classes.items():
    for c_tpl in components:
        if c_css == c_tpl: continue
        tpl_path = f'components/{c_tpl}/template.html'
        if not os.path.exists(tpl_path): continue
        with open(tpl_path, 'r', encoding='utf-8') as f:
            tpl = f.read()
        tpl_classes = set()
        for tc in re.findall(r'class=[\'"]([^\'"]+)[\'"]', tpl):
            for cls in tc.split():
                tpl_classes.add(cls)
        
        overlap = classes.intersection(tpl_classes) - globals_ok
        if overlap:
            conflicts.append((c_css, c_tpl, overlap))

if not conflicts:
    print('ZERO unintended class overlaps found between any component CSS and other component templates!')
else:
    print(f'Found {len(conflicts)} overlaps:')
    for c_css, c_tpl, overlap in conflicts:
        print(f'  CSS from [{c_css}] matches classes in [{c_tpl}] template: {overlap}')
