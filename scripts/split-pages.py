#!/usr/bin/env python3
"""Разделение одностраничного сайта ЭКОТЕХ (переключение по #раздел) на отдельные адреса /раздел/.

Источник: index.html (как в репозитории), assets/js/site.js, assets/css/site.css.
Результат: out/ — index.html, <раздел>/index.html, sitemap.xml, assets/js/site.js, assets/css/site.css, scripts/check.mjs.
Тексты разделов не меняются: переносится только разметка; меняются адреса ссылок, <title>, описание,
canonical, og:url/og:title/og:description и отметка текущего пункта меню.
"""
import re, html, os, sys, shutil, datetime

SRC = sys.argv[1] if len(sys.argv) > 1 else 'src'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'out'
BASE = 'https://ecotechnew.ru'
TODAY = datetime.date.today().isoformat()

s = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()
ms = s.index('<main id="main" tabindex="-1">') + len('<main id="main" tabindex="-1">')
me = s.index('</main>')
prefix, body, suffix = s[:ms], s[ms:me], s[me:]

chunks = re.split(r'(?=<section class="page" data-page=")', body)
assert chunks[0].strip() == '', 'перед первым разделом есть разметка'
pages = []
for c in chunks[1:]:
    tok = re.match(r'<section class="page" data-page="([^"]+)"', c).group(1)
    title = html.unescape(re.search(r'data-title="([^"]+)"', c).group(1))
    pages.append({'tok': tok, 'title': title, 'html': c})
toks = [p['tok'] for p in pages]
assert toks[0] == 'glavnaya'

# где лежит каждый id
owner = {}
for p in pages:
    for i in re.findall(r'\sid="([^"]+)"', p['html']):
        owner.setdefault(i, p['tok'])
shell_ids = set(re.findall(r'\sid="([^"]+)"', prefix + suffix))

def url(tok):
    return '/' if tok == 'glavnaya' else f'/{tok}/'

def rewrite(markup, cur):
    def rep(m):
        ref = m.group(1)
        if ref in shell_ids:            # #main и т. п. — элементы общей оболочки
            return m.group(0)
        tok, _, sub = ref.partition('.')
        if tok in toks:
            target = url(tok) + (f'#{sub}' if sub else '')
            if tok == cur and sub:
                target = f'#{sub}'
            return f'href="{target}"'
        if ref in owner:                # якорь внутри другого раздела
            t = owner[ref]
            return f'href="#{ref}"' if t == cur else f'href="{url(t)}#{ref}"'
        raise SystemExit(f'неизвестный якорь #{ref} (раздел {cur})')
    return re.sub(r'href="#([^"]+)"', rep, markup)

AUD = {'promyshlennost', 'gosudarstvo', 'investoram'}
def mark_current(markup, cur):
    markup = markup.replace(' aria-current="page"', '')
    targets = {url(cur)} | ({url('primenenie')} if cur in AUD else set())
    def rep(m):
        a = m.group(0)
        href = re.search(r'href="([^"]+)"', a).group(1)
        return a.replace('<a ', '<a aria-current="page" ', 1) if href in targets else a
    # только пункты меню шапки и мобильного меню
    def in_nav(block):
        return re.sub(r'<li><a href="[^"]+">', rep, block)
    markup = re.sub(r'<ul class="nav">.*?</ul>', lambda m: in_nav(m.group(0)), markup, flags=re.S)
    markup = re.sub(r'(<div class="mnav" id="mnav".*?<ul>)(.*?)(</ul>)', lambda m: m.group(1) + in_nav(m.group(2)) + m.group(3), markup, flags=re.S)
    return markup

# ссылки на международную версию
LANGS = [('en', 'EN', 'English'), ('zh', '中文', '中文'), ('fr', 'FR', 'Français'), ('ar', 'AR', 'العربية'), ('fa', 'FA', 'فارسی')]
def lang_links(full=False):
    out = []
    for code, short, name in LANGS:
        hl = 'zh-Hans' if code == 'zh' else code
        label = name if full else short
        out.append(f'<a href="/global/{code}/" hreflang="{hl}" lang="{hl}"><bdi>{label}</bdi></a>')
    return ' · '.join(out)
GLOBE = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" '
         'stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>')
_first, _rest = lang_links().split(' · ', 1)
HDR_LANG = f'<p class="hdr__lang" lang="en" aria-label="International versions">{GLOBE}{_first}<span class="hdr__lang-more"> · {_rest}</span></p>\n'
MNAV_LANG = f'<p class="mnav__lang"><span lang="en">International:</span> {lang_links(True)}</p>'
FTR_LANG = f'<span class="ftr__lang"><span lang="en">International:</span> {lang_links(True)}</span>'

def add_lang(markup):
    assert markup.count('<div class="hdr__act">') == 1
    markup = markup.replace('<div class="hdr__act">\n', '<div class="hdr__act">\n' + HDR_LANG, 1)
    markup = re.sub(r'(<p class="mnav__meta">)', MNAV_LANG + r'\n\1', markup, count=1)
    return markup

def add_lang_footer(markup):
    markup = markup.replace('<li><a href="#proekty.voprosy">Вопросы и ответы</a></li>',
                            '<li><a href="#proekty.voprosy">Вопросы и ответы</a></li><li><a href="/stati/">Статьи</a></li>', 1)
    return re.sub(r'(<span>Версия [^<]*</span>)', FTR_LANG + r'\1', markup, count=1)

def lead(sec):
    for p in re.findall(r'<p class="t-lead[^"]*"[^>]*>(.*?)</p>', sec, re.S) + re.findall(r'<p[^>]*>(.*?)</p>', sec, re.S):
        t = html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', p))).strip()
        if len(t) >= 60:
            return t
    return ''

def clip(t, n=165):
    if len(t) <= n:
        return t
    cut = t[:n]
    k = max(cut.rfind('. '), cut.rfind('; '))
    return (cut[:k + 1] if k > 60 else cut[:cut.rfind(' ')] + '…').strip()

def esc(t):
    return html.escape(t, quote=True)

def set_meta(head, title, desc, path):
    head = re.sub(r'<title>.*?</title>', f'<title>{esc(title)}</title>', head, count=1, flags=re.S)
    head = re.sub(r'(<meta name="description" content=")[^"]*(")', lambda m: m.group(1) + esc(desc) + m.group(2), head, count=1)
    head = re.sub(r'(<link rel="canonical" href=")[^"]*(")', lambda m: m.group(1) + BASE + path + m.group(2), head, count=1)
    head = re.sub(r'(<meta property="og:url" content=")[^"]*(")', lambda m: m.group(1) + BASE + path + m.group(2), head, count=1)
    head = re.sub(r'(<meta property="og:title" content=")[^"]*(")', lambda m: m.group(1) + esc(title) + m.group(2), head, count=1)
    head = re.sub(r'(<meta property="og:description" content=")[^"]*(")', lambda m: m.group(1) + esc(desc) + m.group(2), head, count=1)
    return head

os.makedirs(OUT, exist_ok=True)
report = []
for p in pages:
    tok = p['tok']
    sec = re.sub(r'(<section class="page" data-page="[^"]+" data-title="[^"]+") hidden>', r'\1>', p['html'], count=1)
    pre, suf = add_lang(prefix), add_lang_footer(suffix)
    if tok == 'glavnaya':
        title = re.search(r'<title>(.*?)</title>', s, re.S).group(1)
        desc = html.unescape(re.search(r'<meta name="description" content="([^"]*)"', s).group(1))
        pre = pre  # главная: метаданные как в исходном файле
    else:
        title = p['title']
        desc = clip(lead(sec))
        pre = set_meta(pre, title, desc, url(tok))
    page = rewrite(pre, tok) + rewrite(sec, tok) + rewrite(suf, tok)
    page = mark_current(page, tok)
    path = os.path.join(OUT, 'index.html' if tok == 'glavnaya' else f'{tok}/index.html')
    os.makedirs(os.path.dirname(path) or OUT, exist_ok=True)
    open(path, 'w', encoding='utf-8').write(page)
    report.append((url(tok), html.unescape(title), desc))

# 404: ссылки шапки не трогаем (там только "/")
# карта сайта
EXTRA = ['/stati/', '/stati/zhelezo-v-vode-iz-skvazhiny/', '/stati/doochistka-stochnyh-vod-pokazateli/']  # раздел «Статьи» (04.10.2026)
items = ''.join(f'<url><loc>{BASE}{u}</loc><lastmod>{TODAY}</lastmod></url>' for u in [r[0] for r in report] + EXTRA)
open(os.path.join(OUT, 'sitemap.xml'), 'w', encoding='utf-8').write(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + items + '</urlset>\n')

# site.js: переключатель разделов → перенаправление старых адресов #раздел на /раздел/
js = open(os.path.join(SRC, 'assets/js/site.js'), encoding='utf-8').read()
k = js.index("(function(){var pages=[].slice.call(document.querySelectorAll('.page'));")
router = ("(function(){var P=" + repr([t for t in toks if t != 'glavnaya']).replace("'", '"') + ";\n"
          " var h=(location.hash||'').slice(1);if(!h)return;var p=h.split('.'),t=p[0],sub=p[1];\n"
          " if(location.pathname==='/'&&P.indexOf(t)>-1){location.replace('/'+t+'/'+(sub?'#'+sub:''));return}\n"
          " if(location.pathname==='/'&&t==='glavnaya'){history.replaceState(null,'','/');window.scrollTo(0,0);return}\n"
          " var r=document.getElementById('t-'+(sub||t));if(r)r.checked=true;\n"
          " if(sub){var el=document.getElementById(sub);if(el)el.scrollIntoView()}})();\n")
os.makedirs(os.path.join(OUT, 'assets/js'), exist_ok=True)
open(os.path.join(OUT, 'assets/js/site.js'), 'w', encoding='utf-8').write(js[:k] + router)

css = open(os.path.join(SRC, 'assets/css/site.css'), encoding='utf-8').read()
css += ("\n/* Ссылки на международную версию (04.10.2026) */\n"
        ".hdr__lang{display:flex;align-items:center;gap:6px;margin:0 var(--space-8) 0 0;font:500 13px/20px var(--font-sans);color:var(--ink-muted);white-space:nowrap}\n"
        ".hdr__lang svg{width:16px;height:16px;flex:none}\n"
        ".hdr__lang a{color:var(--ink-muted);text-decoration:none}\n"
        ".hdr__lang a:hover{color:var(--accent);text-decoration:underline;text-underline-offset:3px}\n"
        "@media (max-width:1599px){.hdr__lang-more{display:none}}\n"
        "@media (max-width:1023px){.hdr__lang{display:none}}\n"
        ".mnav__lang{margin-top:var(--space-21);font:400 14px/22px var(--font-sans);color:var(--ink-muted)}\n"
        ".mnav__lang a{color:var(--ink)}\n"
        ".ftr__lang a{color:#A7B3C2;text-decoration:underline;text-underline-offset:3px}\n"
        "/* Раздел «Статьи» (04.10.2026) */\n"
        ".stati-list{list-style:none;margin:0;padding:0}\n"
        ".stati-list h2 a{color:var(--ink);text-decoration:none}\n"
        ".stati-list h2 a:hover{color:var(--accent);text-decoration:underline;text-underline-offset:3px}\n"
        ".legal__sec .dt-wrap{margin-top:var(--space-21);margin-bottom:var(--space-21)}\n"
        ".legal__sec a.btn--primary{color:var(--on-accent);text-decoration:none}\n")
os.makedirs(os.path.join(OUT, 'assets/css'), exist_ok=True)
open(os.path.join(OUT, 'assets/css/site.css'), 'w', encoding='utf-8').write(css)

for u, t, d in report:
    print(f'{u:18} | {t} | {len(d)} | {d}')
