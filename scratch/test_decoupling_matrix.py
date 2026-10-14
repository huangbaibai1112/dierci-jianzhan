import json
import subprocess
import os

components = [
    "header",
    "hero",
    "film",
    "hanging-cards",
    "comparison",
    "trust",
    "faq",
    "footer"
]

manifest_path = "site.manifest.json"
with open(manifest_path, "r", encoding="utf-8") as f:
    original_manifest = json.load(f)

print("=== STARTING COMPONENT DECOUPLING ISOLATION AUDIT ===")
all_passed = True

for comp in components:
    test_manifest = dict(original_manifest)
    test_manifest["componentsOrder"] = [c for c in components if c != comp]
    
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(test_manifest, f, indent=2)
        
    res = subprocess.run(["python", "build.py"], capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[FAIL] Removing [{comp}] broke build.py! Error: {res.stderr}")
        all_passed = False
    else:
        print(f"[PASS] Successfully assembled page without [{comp}] (Size: {len(res.stdout)} chars output)")

# Restore original manifest
with open(manifest_path, "w", encoding="utf-8") as f:
    json.dump(original_manifest, f, indent=2)

subprocess.run(["python", "build.py"], capture_output=True, text=True)
print("=== DECOUPLING AUDIT COMPLETE: ALL MODULES INDEPENDENT ===" if all_passed else "=== FAILURES DETECTED ===")
