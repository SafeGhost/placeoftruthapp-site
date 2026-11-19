#!/usr/bin/env python3
"""Adds the smart dream search to every dream book page (index and dream pages)
and points 'About the app' links to the home page in the same language.
Safe to run again: it replaces its own block between SEARCH markers."""
import json, os, re, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = json.load(open(os.path.join(ROOT, 'tools/home_strings.json'), encoding='utf-8'))
LANGS = ['en', 'ru', 'es', 'pt', 'de', 'fr', 'it', 'tr', 'ja']
POPULAR = ['snakes', 'teeth', 'water', 'wedding', 'flying', 'dog']
VER = '13'
ANOTHER = {
    'en': 'Look up another dream', 'ru': 'Найти другой сон', 'es': 'Busca otro sueño', 'pt': 'Procure outro sonho',
    'de': 'Einen anderen Traum suchen', 'fr': 'Chercher un autre rêve', 'it': 'Cerca un altro sogno',
    'tr': 'Başka bir rüya ara', 'ja': 'ほかの夢をさがす',
}
A, B = '<!--SEARCH-->', '<!--/SEARCH-->'


def block(lang, prefix, popular, heading):
    st = S[lang]
    cfg = {'lang': lang, 'prefix': prefix, 'v': VER, 'popular': popular,
           's': {k: st[k] for k in ('s_near', 's_none', 's_all', 's_pap', 's_open')}}
    h = (f'{A}<div class="dsearch">' + (f'<h2>{html.escape(heading)}</h2>' if heading else '') +
         f'<form class="search" action="{prefix}/dreams/" role="search" autocomplete="off">'
         f'<label for="q" class="sr">{html.escape(st["dr_label"])}</label>'
         f'<input id="q" name="q" type="search" placeholder="{html.escape(st["dr_placeholder"])}" aria-autocomplete="list" aria-controls="results">'
         f'<ul id="results" role="listbox"></ul></form></div>'
         '<script id="i18n" type="application/json">' + json.dumps(cfg, ensure_ascii=False).replace('</', '<\\/') + '</script>'
         f'<script src="/assets/dream-search.js?v={VER}" defer></script>{B}')
    return h


def main():
    n = 0
    for lang in LANGS:
        prefix = '' if lang == 'en' else '/' + lang
        base = os.path.join(ROOT, 'dreams' if lang == 'en' else f'{lang}/dreams')
        rows = json.load(open(os.path.join(ROOT, f'assets/data/dreams-{lang}.json'), encoding='utf-8'))
        names = {r[0]: r[1] for r in rows}
        popular = [[s, re.sub(r'^(A|An|The) ', '', names[s]) if lang == 'en' else names[s]] for s in POPULAR]
        for dp, _, fs in os.walk(base):
            for f in fs:
                if f != 'index.html':
                    continue
                p = os.path.join(dp, f)
                s = open(p, encoding='utf-8').read()
                o = s
                SLOT = '<!--SEARCHSLOT-->'
                s = re.sub(re.escape(A) + '.*?' + re.escape(B), SLOT, s, flags=re.S)
                is_index = os.path.abspath(dp) == os.path.abspath(base)
                blk = block(lang, prefix, popular, '' if is_index else ANOTHER[lang])
                if SLOT in s:
                    s = s.replace(SLOT, blk)
                elif is_index:
                    s = re.sub(r'<input id="q" type="search"[^>]*>', lambda m: blk, s)
                    s = re.sub(r"<script>\s*const q=document.getElementById\('q'\).*?</script>\s*", '', s, flags=re.S)
                else:
                    s = s.replace('<aside class="cta">', blk + '\n<aside class="cta">', 1)
                s = s.replace('<a class="btn" href="/">', f'<a class="btn" href="{prefix}/">')
                s = s.replace('<br><a href="/">Place of Truth</a></footer>', f'<br><a href="{prefix}/">Place of Truth</a></footer>')
                s = re.sub(r'/dreams/dreams\.css\?v=\d+', '/dreams/dreams.css?v=' + VER, s)
                if s != o:
                    open(p, 'w', encoding='utf-8').write(s)
                    n += 1
    print('patched', n, 'pages')


if __name__ == '__main__':
    main()
