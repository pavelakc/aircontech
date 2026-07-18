#!/usr/bin/env python3
"""
AirconTech Build Script
Combines js/*.js files into a single index.html for deployment.

Usage:
  python3 build.py
  
Output:
  index.html  ← upload this to GitHub
"""
import os, sys

JS_FILES = [
    'js/sync.js',
    'js/ai.js', 
    'js/form.js',
    'js/timecard.js',
    'js/print.js',
    'js/inhaus.js',
    'js/db_editor.js',
    'js/supervisor.js',
    'js/main.js',
]

TEMPLATE = 'index_template.html'  # HTML-only shell
OUTPUT   = 'index.html'

def build():
    if not os.path.exists(TEMPLATE):
        print(f"ERROR: {TEMPLATE} not found")
        sys.exit(1)

    with open(TEMPLATE, encoding='utf-8') as f:
        html = f.read()

    # Collect JS
    parts = []
    for js_file in JS_FILES:
        if not os.path.exists(js_file):
            print(f"WARNING: {js_file} missing, skipping")
            continue
        with open(js_file, encoding='utf-8') as f:
            content = f.read()
        parts.append(f"// ══ {js_file} ══")
        parts.append(content)
        print(f"  ✔ {js_file} ({len(content)//1024}KB)")

    combined = '\n\n'.join(parts)

    # Inject into template
    placeholder = '<!-- BUILD:JS -->'
    if placeholder not in html:
        print(f"ERROR: '{placeholder}' not found in {TEMPLATE}")
        sys.exit(1)

    result = html.replace(placeholder, f'<script>\n{combined}\n</script>')

    with open(OUTPUT, 'w', encoding='utf-8') as f:
        f.write(result)

    print(f"\n✔ Built: {OUTPUT} ({len(result)//1024}KB)")
    print("  → Upload index.html to GitHub Pages")

if __name__ == '__main__':
    build()
