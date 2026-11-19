#!/usr/bin/env python3
"""Run once on the day Place of Truth opens to everyone on Google Play.
Turns every "Coming soon on Google Play" on the site into a real link.
Usage: python3 tools/play-live.py [--dry]"""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAY = "https://play.google.com/store/apps/details?id=com.oracleapps.placeoftruth"
GET = {"en": "Get it on Google Play", "ru": "Скачать в Google Play", "es": "Disponible en Google Play",
       "pt": "Disponível no Google Play", "de": "Jetzt bei Google Play", "fr": "Disponible sur Google Play",
       "it": "Disponibile su Google Play", "tr": "Google Play'den indir", "ja": "Google Playで手に入れよう"}
dry = "--dry" in sys.argv
n = 0
for lang in GET:
    base = os.path.join(ROOT, "dreams" if lang == "en" else os.path.join(lang, "dreams"))
    for dp, _, fs in os.walk(base):
        for f in fs:
            if not f.endswith(".html"): continue
            p = os.path.join(dp, f); s = open(p, encoding="utf-8").read()
            t = re.sub(r'<p class="soon">[^<]*</p>', f'<p class="soon"><a href="{PLAY}">{GET[lang]}</a></p>', s)
            if t != s:
                n += 1
                if not dry: open(p, "w", encoding="utf-8").write(t)
p = os.path.join(ROOT, "index.html"); s = open(p, encoding="utf-8").read()
t = re.sub(r'<span class="play([^"]*)" aria-label="Coming soon on Google Play">', rf'<a class="play\1" href="{PLAY}">', s)
t = re.sub(r'<span class="play( [^"]*)?">(<svg)', lambda m: f'<a class="play{m.group(1) or ""}" href="{PLAY}">{m.group(2)}', t)
t = t.replace("<small>Coming soon on</small>Google Play</span></span>", "<small>Get it on</small>Google Play</span></a>")
t = t.replace("Place of Truth is coming soon to Google Play.", "Place of Truth is on Google Play.")
if t != s:
    n += 1
    if not dry: open(p, "w", encoding="utf-8").write(t)
print(("would change" if dry else "changed"), n, "files")
