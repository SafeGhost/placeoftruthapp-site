#!/usr/bin/env python3
"""Builds the home page in 9 languages and the dream-search data.
Run from anywhere: python3 tools/build_home.py
Sources: tools/home.tpl.html, tools/home_strings.json,
the Miller dream book (merged.json) and the app's dream book (dreams_<lang>.json)."""
import json, os, re, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MILLER = os.path.expanduser('~/develop/oracle-apps/prototype-pulse-sistrum/tools/miller/merged.json')
APP = os.path.expanduser('~/develop/oracle-apps/android-mac/app-src/app/src/main/assets/content/dreams_{}.json')
APPSTR = os.path.expanduser('~/develop/oracle-apps/android-mac/app-src/app/src/main/assets/strings/{}.json')
LANGS = ['en', 'ru', 'es', 'pt', 'de', 'fr', 'it', 'tr', 'ja']
HREFLANG = {'pt': 'pt'}
POPULAR = ['snakes', 'teeth', 'water', 'wedding', 'flying', 'dog']
VER = '14'

RU_AM = {
    'udjat': ("Уджат", "Его носили все — от детей до фараонов — против болезней и сглаза.",
              "Уджат носили на шее и на запястье: верили, что Око Гора, исцелённое Тотом, бережёт от болезней и злого взгляда. Его надевали детям и брали в дорогу, его рисовали на носу лодок, чтобы лодка «видела» путь.", -1),
    'scarab': ("Скарабей", "Скарабея носили почти все египтяне — ради обновления и удачи.",
               "Скарабей был самым любимым амулетом Египта: его носили в перстнях и на шнурке, им ставили печати на письма и кувшины. Верили, что он, как Хепри, выкатывающий солнце, помогает начать заново. Аменхотеп III рассылал большие скарабеи с рассказами о своих делах, как объявления.", 1),
    'ankh': ("Анх", "Анх вплетали в украшения и вырезали на вещах, чтобы жизнь не иссякала.",
             "Анх носили в ожерельях и браслетах, вырезали на ручках зеркал и на сосудах для воды. Для египтян это был знак дыхания, которое дают боги: на стенах храмов боги подносят анх к лицу фараона.", -1),
}


def sentences(s, lang):
    if lang == 'ja':
        return [x + '。' for x in s.split('。') if x.strip()]
    return [x for x in re.split(r'(?<=[.!?])\s+', s) if x.strip()]


def amulets(lang):
    tr = {} if lang == 'ru' else json.load(open(APPSTR.format(lang), encoding='utf-8'))
    t = (lambda s: s) if lang == 'ru' else (lambda s: tr[s])
    out = {}
    for k, (name, belief, power, idx) in RU_AM.items():
        out[k] = {'name': t(name), 'note': t(belief) + ' ' + sentences(t(power), lang)[idx]}
    return out


def strip_article(name, lang):
    if lang == 'en':
        return re.sub(r'^(A|An|The) ', '', name)
    return name


def main():
    S = json.load(open(os.path.join(ROOT, 'tools/home_strings.json'), encoding='utf-8'))
    tpl = open(os.path.join(ROOT, 'tools/home.tpl.html'), encoding='utf-8').read()
    tpl = re.sub(r'\?v=\d+', '?v=' + VER, tpl)
    miller = [d for d in json.load(open(MILLER, encoding='utf-8')) if not d.get('adult')]
    os.makedirs(os.path.join(ROOT, 'assets/data'), exist_ok=True)

    # slugs exactly as the dream pages use them
    en_index = open(os.path.join(ROOT, 'dreams/index.html'), encoding='utf-8').read()
    page_slugs = dict((b, a) for a, b in re.findall(r'<a href="/dreams/([a-z0-9-]+)/">([^<]+)</a>', en_index))

    for lang in LANGS:
        prefix = '' if lang == 'en' else '/' + lang
        rows, names = [], {}
        for d in miller:
            e = d[lang]
            slug = page_slugs.get(d['en']['title'])
            if not slug:
                raise SystemExit('no page for ' + d['en']['title'])
            text = ' '.join(x for x in (e.get('dream'), e.get('omen'), e.get('gloss')) if x)
            rows.append([slug, e['title'], text, (e.get('keys', '') + ' ' + e.get('near', '')).strip()])
            names[slug] = e['title']
        json.dump(rows, open(os.path.join(ROOT, f'assets/data/dreams-{lang}.json'), 'w', encoding='utf-8'),
                  ensure_ascii=False, separators=(',', ':'))
        # words of dreams that live only in the app (Egyptian dreams and adult ones): never their texts
        app = json.load(open(APP.format(lang), encoding='utf-8'))['entries']
        site_ids = {d['id'] for d in miller}
        only = [x for x in app if x['id'] not in site_ids]
        keys = sorted({w for x in only for w in (x.get('keys', '') + ' ' + x['title']).lower().split() if len(w) > 2})
        json.dump(keys, open(os.path.join(ROOT, f'assets/data/app-keys-{lang}.json'), 'w', encoding='utf-8'),
                  ensure_ascii=False, separators=(',', ':'))

        st = dict(S[lang])
        am = amulets(lang)
        popular = [[s, strip_article(names[s], lang)] for s in POPULAR]
        st.update({
            'lang': lang, 'prefix': prefix, 'shots': lang,
            'am_scarab': am['scarab']['name'], 'am_ankh': am['ankh']['name'],
            'note_udjat': am['udjat']['note'],
            'chips': ''.join(f'<a href="{prefix}/dreams/{s}/">{html.escape(n)}</a>' for s, n in popular),
            'hreflang': '\n'.join(f'<link rel="alternate" hreflang="{HREFLANG.get(l, l)}" href="https://placeoftruthapp.com{"" if l == "en" else "/" + l}/">' for l in LANGS)
                        + '\n<link rel="alternate" hreflang="x-default" href="https://placeoftruthapp.com/">',
            'langlinks': ' · '.join(
                (f'<b>{S[l]["lang_name"]}</b>' if l == lang else
                 f'<a href="{"" if l == "en" else "/" + l}/" hreflang="{HREFLANG.get(l, l)}" lang="{l}">{S[l]["lang_name"]}</a>') for l in LANGS),
            'langmenu': '<details class="lang"><summary aria-label="' + html.escape(S[lang]['nav_lang']) + '">' + lang.upper() + '</summary><div>' + ''.join(
                f'<a href="{"" if l == "en" else "/" + l}/" hreflang="{HREFLANG.get(l, l)}" lang="{l}"' + (' aria-current="page"' if l == lang else '') + f'>{S[l]["lang_name"]}</a>' for l in LANGS) + '</div></details>',
        })
        i18n = {
            'lang': lang, 'prefix': prefix, 'v': VER,
            'popular': popular,
            'notes': {k: v['note'] for k, v in am.items()},
            's': {k: S[lang][k] for k in ('s_near', 's_none', 's_all', 's_pap', 's_open')},
        }
        st['i18n'] = json.dumps(i18n, ensure_ascii=False).replace('</', '<\\/')
        out = tpl
        for k, v in st.items():
            if k in ('chips', 'hreflang', 'langlinks', 'langmenu', 'i18n'):
                out = out.replace('{{' + k + '}}', v)
            else:
                out = out.replace('{{' + k + '}}', html.escape(v, quote=True) if k not in ('prefix', 'lang', 'shots') else v)
        left = re.findall(r'\{\{\w+\}\}', out)
        if left:
            raise SystemExit(f'{lang}: unfilled {left}')
        dst = os.path.join(ROOT, 'index.html' if lang == 'en' else f'{lang}/index.html')
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        open(dst, 'w', encoding='utf-8').write(out)
        print(lang, 'ok', len(rows), 'dreams,', len(keys), 'app-only words')


if __name__ == '__main__':
    main()
