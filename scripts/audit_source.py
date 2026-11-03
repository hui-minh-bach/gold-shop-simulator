#!/usr/bin/env python3
"""Check imported source integrity, JS syntax and local HTML resources."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


class PageResources(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
        self.inline_scripts = []
        self.current = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('script', 'img', 'source') and attrs.get('src'):
            self.urls.append(attrs['src'])
        if tag == 'link' and attrs.get('rel') == 'stylesheet':
            self.urls.append(attrs['href'])
        if tag == 'script' and not attrs.get('src'):
            self.current = []

    def handle_data(self, data):
        if self.current is not None:
            self.current.append(data)

    def handle_endtag(self, tag):
        if tag == 'script' and self.current is not None:
            self.inline_scripts.append(''.join(self.current))
            self.current = None


def main():
    errors = []
    provenance = json.loads((ROOT / 'docs/SOURCE_PROVENANCE.json').read_text())
    for entry in provenance['files']:
        path = ROOT / entry['path']
        if not path.is_file():
            errors.append('missing_original:' + entry['path'])
        elif hashlib.sha256(path.read_bytes()).hexdigest() != entry['sha256']:
            errors.append('modified_original:' + entry['path'])

    page = PageResources()
    page.feed((ROOT / 'index.html').read_text())
    local = [url for url in page.urls if not urlsplit(url).scheme and not url.startswith('//')]
    for url in local:
        path = ROOT / unquote(urlsplit(url).path)
        if not path.is_file():
            errors.append('missing_html_resource:' + url)

    node = shutil.which('node')
    js_files = sorted(ROOT.glob('*.js'))
    if not node:
        errors.append('node_required_for_syntax_check')
    else:
        for path in js_files:
            result = subprocess.run([node, '--check', str(path)], capture_output=True)
            if result.returncode:
                errors.append('javascript_syntax:' + path.name)
        for index, script in enumerate(page.inline_scripts):
            result = subprocess.run([node, '--check'], input=script.encode(), capture_output=True)
            if result.returncode:
                errors.append('inline_javascript_syntax:' + str(index))

    patterns = [r'gh[pousr]_[A-Za-z0-9_]{20,}', r'github_pat_[A-Za-z0-9_]{20,}',
                r'sk-[A-Za-z0-9_-]{20,}', r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
                r'AKIA[A-Z0-9]{16}']
    scanned = 0
    for entry in provenance['files']:
        path = ROOT / entry['path']
        if path.suffix.lower() not in {'.js', '.html', '.css', '.json', '.txt', '.md'} or not path.is_file():
            continue
        scanned += 1
        contents = path.read_text(errors='replace')
        if any(re.search(pattern, contents) for pattern in patterns):
            errors.append('credential_pattern:' + entry['path'])

    report = {
        'result': 'PASS' if not errors else 'FAIL',
        'scope': 'static source import checks only; no browser/gameplay/WebGL verification',
        'original_files': len(provenance['files']),
        'javascript_files': len(js_files),
        'inline_scripts': len(page.inline_scripts),
        'local_html_resources': len(local),
        'text_files_scanned_for_common_credentials': scanned,
        'errors': errors,
        'known_gaps': [
            'Three.js and addon modules are fetched from external CDNs',
            'owner_m.glb and owner_f.glb production models are absent from original archive',
            'authentication and saves are local browser data, not server accounts',
            'runtime/gameplay/visual quality and remote asset licenses not fully revalidated'
        ]
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
