#!/usr/bin/env python3
"""Run once on the day Place of Truth opens to everyone on Google Play.
Turns every "Coming soon on Google Play" on the site into a real link.
Usage: python3 tools/play-live.py [--dry]"""
import os, re, sys, json, html
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
# home pages: the Google Play badge becomes a real link, the App Store badge keeps its "coming soon" message
S = json.load(open(os.path.join(ROOT, "tools/home_strings.json"), encoding="utf-8"))
LIVE = {"en": "On Google Play now · App Store coming soon", "ru": "Уже в Google Play · скоро в App Store",
        "es": "Ya en Google Play · pronto en App Store", "pt": "Já no Google Play · em breve na App Store",
        "de": "Jetzt bei Google Play · bald im App Store", "fr": "Déjà sur Google Play · bientôt sur l’App Store",
        "it": "Già su Google Play · presto su App Store", "tr": "Google Play’de yayında · yakında App Store’da",
        "ja": "Google Playで公開中・App Storeは近日公開"}
FIN = {"en": "Place of Truth is on Google Play.", "ru": "Place of Truth уже в Google Play.",
       "es": "Place of Truth ya está en Google Play.", "pt": "Place of Truth já está no Google Play.",
       "de": "Place of Truth ist jetzt bei Google Play.", "fr": "Place of Truth est sur Google Play.",
       "it": "Place of Truth è su Google Play.", "tr": "Place of Truth artık Google Play’de.",
       "ja": "Place of TruthはGoogle Playで公開中です。"}
for lang in GET:
    p = os.path.join(ROOT, "index.html" if lang == "en" else os.path.join(lang, "index.html"))
    s = open(p, encoding="utf-8").read()
    t = re.sub(r'<button type="button" class="store gp" data-msg="[^"]*">(.*?)</button>', rf'<a class="store gp" href="{PLAY}">\1</a>', s)
    t = t.replace(html.escape(S[lang]["st_soon"]), html.escape(LIVE[lang])).replace(html.escape(S[lang]["fin_p"]), html.escape(FIN[lang]))
    if t != s:
        n += 1
        if not dry: open(p, "w", encoding="utf-8").write(t)
# after this, also put LIVE/FIN into tools/home_strings.json (st_soon, fin_p) so a rebuild keeps them
print(("would change" if dry else "changed"), n, "files")
