#!/usr/bin/env python3
"""
Decoupled Static Site Builder & Compliance Auditor
Assembles components declared in manifest files into production HTML pages
Supports multi-page architecture (index.html, how-it-works.html, etc.)
"""
import os
import json
import re
import sys

def load_text(path):
    if not os.path.exists(path):
        return ""
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def run_audit(html_content):
    html_lower = html_content.lower()
    
    # Read banned lists
    ai_banned = []
    if os.path.exists("ai-banned-wording.txt"):
        for line in load_text("ai-banned-wording.txt").splitlines():
            line = line.strip().lower()
            if line and not line.startswith("#"):
                ai_banned.append(line)
                
    prohibited = []
    if os.path.exists("banned-keywords.txt"):
        for line in load_text("banned-keywords.txt").splitlines():
            line = line.strip().lower()
            if line and not line.startswith("#"):
                prohibited.append(line)

    ai_hits = [w for w in ai_banned if re.search(r'\b' + re.escape(w) + r'\b', html_lower)]
    proh_hits = [w for w in prohibited if re.search(r'\b' + re.escape(w) + r'\b', html_lower)]
    
    return ai_hits, proh_hits

def build_page(manifest_path, output_file):
    print("=" * 60)
    print(f"  Building {output_file} from {manifest_path}")
    print("=" * 60)

    if not os.path.exists(manifest_path):
        print(f"Error: {manifest_path} not found!")
        sys.exit(1)

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    title = manifest.get("pageTitle", "Senior Dating Over 50")
    description = manifest.get("metaDescription", "")
    comp_order = manifest.get("componentsOrder", [])

    print(f"-> Active components: {', '.join(comp_order)}")

    # 1. Gather Styles
    css_bundles = []
    # Core styles first
    for core_file in ["core/variables.css", "core/reset.css"]:
        if os.path.exists(core_file):
            css_bundles.append(f"/* [CORE] {core_file} */\n" + load_text(core_file))

    # Component styles
    for cname in comp_order:
        c_css = os.path.join("components", cname, "style.css")
        if os.path.exists(c_css):
            css_bundles.append(f"/* [COMPONENT: {cname}] {c_css} */\n" + load_text(c_css))

    combined_css = "\n\n".join(css_bundles)

    # 2. Gather Component HTML Blocks
    html_blocks = []
    for cname in comp_order:
        c_tpl = os.path.join("components", cname, "template.html")
        if os.path.exists(c_tpl):
            block = f"""
  <!-- ======================================================== -->
  <!-- [COMPONENT START] {cname} (components/{cname}/template.html) -->
  <!-- ======================================================== -->
{load_text(c_tpl).strip()}
  <!-- [COMPONENT END] {cname} -->
"""
            html_blocks.append(block)
        else:
            print(f"Warning: Component template missing: {c_tpl}")

    body_html = "\n".join(html_blocks)

    # 3. Gather Scripts
    js_bundles = []
    # Core scripts first
    for core_js in ["core/config.js", "core/event-bus.js", "core/motion.js", "core/outbound-listener.js"]:
        if os.path.exists(core_js):
            js_bundles.append(f"// [CORE] {core_js}\n" + load_text(core_js))

    # Component scripts
    for cname in comp_order:
        c_js = os.path.join("components", cname, "script.js")
        if os.path.exists(c_js):
            js_bundles.append(f"// [COMPONENT: {cname}] {c_js}\n" + load_text(c_js))

    combined_js = "\n\n".join(js_bundles)

    # 4. Assemble HTML document
    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <meta name="robots" content="index, follow, max-image-preview:large">

  <!-- Fonts: High-Trust Display (Plus Jakarta Sans) + Clean Reading (Inter) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap" rel="stylesheet">

  <!-- Combined Scoped Component Stylesheet -->
  <style>
{combined_css}
  </style>
</head>
<body>

{body_html}

  <!-- Decoupled Event-Driven Component Scripts -->
  <script>
{combined_js}
  </script>
</body>
</html>
"""

    # 5. Audit Before Writing
    ai_hits, proh_hits = run_audit(full_html)
    if ai_hits:
        print(f"Audit Warning! Detected AI banned terms in {output_file}: {ai_hits}")
    if proh_hits:
        print(f"Audit Warning! Detected Prohibited keywords in {output_file}: {proh_hits}")

    if not ai_hits and not proh_hits:
        print(f"-> Audit Passed: 0 banned words, 0 AI cliches detected in {output_file}.")

    # 6. Write Output File
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(full_html)

    print(f"-> Successfully compiled {output_file} ({len(full_html)} bytes)")
    print("=" * 60)

def build_all():
    import glob
    # 1. Primary homepage
    if os.path.exists("site.manifest.json"):
        build_page("site.manifest.json", "index.html")

    # 2. Automatically discover all other [name].manifest.json pages
    for manifest_path in sorted(glob.glob("*.manifest.json")):
        basename = os.path.basename(manifest_path)
        if basename == "site.manifest.json":
            continue
        out_name = basename.replace(".manifest.json", ".html")
        build_page(manifest_path, out_name)

if __name__ == "__main__":
    if len(sys.argv) > 2:
        build_page(sys.argv[1], sys.argv[2])
    else:
        build_all()
