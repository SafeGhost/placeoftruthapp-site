#!/usr/bin/env python3
"""Checks every page: links and images resolve, title/description/canonical present, no old domain."""
import os, re, json, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bad, pages, warn = [], 0, []
def exists(url, here):
    url = url.split('#')[0].split('?')[0]
    if not url: return True
    p = os.path.join(ROOT, url.lstrip('/')) if url.startswith('/') else os.path.normpath(os.path.join(os.path.dirname(here), url))
    return os.path.isfile(p) or os.path.isfile(os.path.join(p, 'index.html'))
for dp, dn, fs in os.walk(ROOT):
    dn[:] = [d for d in dn if d not in ('.git', 'tools')]
    for f in fs:
        if not f.endswith('.html') or f.startswith('_'): continue
        p = os.path.join(dp, f); s = open(p, encoding='utf-8').read(); pages += 1
        rel = os.path.relpath(p, ROOT)
        for u in re.findall(r'(?:href|src)="([^"]+)"', s):
            if u.startswith(('http:', 'https:', 'mailto:', '#', 'data:', 'tel:')): continue
            if not exists(u, p): bad.append((rel, u))
        if f == '404.html': continue
        for need, rx in (('title', r'<title>[^<]{5,}</title>'), ('description', r'<meta name="description" content="[^"]{20,}"'), ('lang', r'<html lang="\w')):
            if not re.search(rx, s): warn.append((rel, 'no ' + need))
        if 'kuliktrade.com' in s.replace('support@kuliktrade.com', '').replace('admin@kuliktrade.com', ''):
            warn.append((rel, 'old domain'))
        for c in re.findall(r'<link rel="canonical" href="https://placeoftruthapp.com([^"]*)"', s):
            if not exists(c or '/', p): bad.append((rel, 'canonical ' + c))
for f in os.listdir(os.path.join(ROOT, 'assets/data')):
    json.load(open(os.path.join(ROOT, 'assets/data', f), encoding='utf-8'))
print('pages', pages, 'broken', len(bad), 'warnings', len(warn))
for b in bad[:30]: print('BROKEN', b)
from collections import Counter
print(Counter(w[1] for w in warn))
for w in warn[:15]: print('WARN', w)
