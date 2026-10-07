#!/usr/bin/env python3
"""Раздел «Статьи» основного сайта: /stati/ и /stati/<slug>/.
Оболочка (шапка, меню, подвал, стили) берётся из готовой страницы out/politika/index.html."""
import re, os, json, html, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/mainsite/out'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/home/claude/articles/out'
BASE = 'https://ecotechnew.ru'

shell = open(os.path.join(SRC, 'politika/index.html'), encoding='utf-8').read()
ms = shell.index('<main id="main" tabindex="-1">') + len('<main id="main" tabindex="-1">')
me = shell.index('</main>')
PRE, SUF = shell[:ms], shell[me:]
PRE = PRE.replace(' aria-current="page"', '')

ARROW = ('<svg class="" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" '
         'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>')

def esc(t): return html.escape(t, quote=True)

def head(pre, title, desc, path, ld):
    pre = re.sub(r'<title>.*?</title>', f'<title>{esc(title)}</title>', pre, count=1, flags=re.S)
    for pat, val in [(r'(<meta name="description" content=")[^"]*(")', esc(desc)),
                     (r'(<link rel="canonical" href=")[^"]*(")', BASE + path),
                     (r'(<meta property="og:url" content=")[^"]*(")', BASE + path),
                     (r'(<meta property="og:title" content=")[^"]*(")', esc(title)),
                     (r'(<meta property="og:description" content=")[^"]*(")', esc(desc))]:
        pre = re.sub(pat, lambda m: m.group(1) + val + m.group(2), pre, count=1)
    if ld:
        pre = pre.replace('</head>', '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>\n</head>', 1)
    return pre

ARTICLES = [{
    'slug': 'doochistka-stochnyh-vod-pokazateli',
    'title': 'Доочистка сточных вод: какие показатели смотреть при приёмке',
    'meta_title': 'Доочистка сточных вод: показатели при приёмке — ЭКОТЕХ',
    'desc': 'Какие показатели смотреть при приёмке доочистки стоков: БПК₅, ХПК, взвешенные вещества, фосфор, азот, нефтепродукты; нормативы ПП РФ № 644 и отбор проб.',
    'date': '2026-10-07', 'date_ru': '07.10.2026',
    'lead': 'Результат доочистки сточных вод оценивают по протоколам проб до и после установки и по нормативам, действующим для вашего места сброса. Ниже — какие показатели обычно входят в протокол, от чего зависят требования и как выглядит реальный пример.',
    'body': 'stoki',
}, {
    'slug': 'zhelezo-v-vode-iz-skvazhiny',
    'title': 'Железо в воде из скважины: как проверить результат очистки',
    'meta_title': 'Железо в воде из скважины: как проверить очистку — ЭКОТЕХ',
    'desc': 'Нормы СанПиН 1.2.3685-21 по железу, марганцу, мутности и цветности, отбор проб до и после очистки и пример с протоколами лаборатории.',
    'date': '2026-10-04', 'date_ru': '04.10.2026',
    'lead': 'Результат очистки воды проверяют по анализам проб до и после установки, а не по паспорту оборудования. Ниже — какие показатели смотреть, как отбирать пробы и как это выглядит на реальных протоколах.',
}]

def article_body(a):
    toc = [('normy', '1. Что нормируется'), ('proby', '2. Как отбирать пробы'),
           ('primer', '3. Пример: скважина на площадке ЭКОТЕХ'), ('postavshchik', '4. Что запросить у поставщика')]
    rows = [('Железо общее, мг/дм³', '0,92', '0,05', 'не более 0,3'),
            ('Мутность, ЕМФ', '9,7', '&lt; 1,0', 'не более 2,6'),
            ('Цветность, градусы цветности', '12', '3', 'не более 20')]
    trs = ''.join(f'<tr><td class="p">{p}</td><td data-l="До" class="mono">{b}</td><td data-l="После" class="mono">{c}</td>'
                  f'<td data-l="Норматив">{n}</td></tr>' for p, b, c, n in rows)
    return f'''<section class="page" data-page="stati" data-title="{esc(a['title'])} — ЭКОТЕХ"><div class="wrap"><nav class="crumbs" aria-label="Путь"><a href="/">Главная</a> / <a href="/stati/">Статьи</a> / <span>{esc(a['title'])}</span></nav></div><section class="hero--page"><div class="wrap"><p class="t-overline accent">Статья · {a['date_ru']}</p><h1 class="t-display u5">{esc(a['title'])}</h1><p class="t-lead">{esc(a['lead'])}</p></div></section><section class="sec sec--tight"><div class="wrap legal"><nav class="legal__toc" aria-label="Содержание"><p class="t-overline">Содержание</p><ol>{''.join(f'<li><a href="#{i}">{t}</a></li>' for i, t in toc)}</ol></nav><div class="legal__body">
<section id="normy" class="legal__sec"><h2 class="t-h3">1. Что нормируется</h2><p>Показатели качества питьевой воды установлены СанПиН 1.2.3685-21 «Гигиенические нормативы и требования к обеспечению безопасности и (или) безвредности для человека факторов среды обитания». Для воды из скважины с железом обычно смотрят четыре показателя:</p><ul><li>железо общее — не более 0,3 мг/дм³ (мг/л);</li><li>марганец общий — не более 0,1 мг/дм³;</li><li>мутность — не более 2,6 ЕМФ (единиц мутности по формазину);</li><li>цветность — не более 20 градусов цветности.</li></ul><p>Срок действия СанПиН 1.2.3685-21 ограничен 1 марта 2027 года. Перед приёмкой проверьте действующую редакцию нормативов.</p></section>
<section id="proby" class="legal__sec"><h2 class="t-h3">2. Как отбирать пробы</h2><ul><li>Пробы до и после установки отбирают в один день, чтобы сравнивать одну и ту же исходную воду, и записывают режим работы установки в момент отбора.</li><li>Анализы выполняет аккредитованная лаборатория; у каждого протокола — номер и дата. Тару, консервацию проб и сроки доставки определяет лаборатория по ГОСТ 31861-2012 «Вода. Общие требования к отбору проб».</li><li>Одна пара проб показывает результат в конкретный день. Для приёмки на объекте, как правило, используют серию проб за время испытаний — например, 8–12 недель непрерывной работы.</li><li>Критерии приёмки — какие показатели, по какому нормативу, сколько проб — согласуют до начала испытаний.</li></ul></section>
<section id="primer" class="legal__sec"><h2 class="t-h3">3. Пример: скважина на площадке ЭКОТЕХ</h2><p>Пробы воды из скважины до и после Экофильтра, площадка ЭКОТЕХ (п. ИФА РАН), 18.06.2026. Протоколы Пц-3012-1/26 и Пц-3012-2/26, Аналитический центр качества воды (ААЦ «Аналитика»). Статус данных — <strong>измерено</strong>.</p>
<div class="dt-wrap"><div class="dt-scroll"><table class="dt" aria-label="Вода из скважины до и после очистки"><thead><tr><th>Показатель</th><th>До</th><th>После</th><th>Норматив СанПиН</th></tr></thead><tbody>{trs}</tbody></table></div></div>
<p>До очистки вода не соответствовала нормативу по железу и мутности, после — соответствует по всем трём показателям. Это данные конкретных проб: на другой воде и в другом режиме работы результат может отличаться, поэтому результат на вашем объекте проверяется отдельно. Материал не является публичной офертой.</p><p>Все показатели с источниками — на странице <a href="/dokazatelstva/">«Результаты и документы»</a>, описание установки — на странице <a href="/ekofiltr/">«Экофильтр»</a>.</p></section>
<section id="postavshchik" class="legal__sec"><h2 class="t-h3">4. Что запросить у поставщика</h2><ul><li>номера и даты протоколов, название лаборатории;</li><li>точку и условия отбора проб, характеристики исходной воды;</li><li>программу испытаний на вашем объекте с критериями приёмки.</li></ul><p>Хотите проверить установку на своей воде — пришлите анализ вашей исходной воды.</p><p class="e404-gap"><a class="btn btn--primary" href="/kontakty/#pilot">Обсудить пилот{ARROW}</a></p></section>
</div></div></section></section>'''


def article_shell(a, sections):
    toc = ''.join(f'<li><a href="#{i}">{t}</a></li>' for i, t, _ in sections)
    body = ''.join(f'<section id="{i}" class="legal__sec"><h2 class="t-h3">{t}</h2>{h}</section>\n' for i, t, h in sections)
    return (f'<section class="page" data-page="stati" data-title="{esc(a['title'])} — ЭКОТЕХ"><div class="wrap"><nav class="crumbs" aria-label="Путь"><a href="/">Главная</a> / <a href="/stati/">Статьи</a> / <span>{esc(a['title'])}</span></nav></div>'
            f'<section class="hero--page"><div class="wrap"><p class="t-overline accent">Статья · {a['date_ru']}</p><h1 class="t-display u5">{esc(a['title'])}</h1><p class="t-lead">{esc(a['lead'])}</p></div></section>'
            f'<section class="sec sec--tight"><div class="wrap legal"><nav class="legal__toc" aria-label="Содержание"><p class="t-overline">Содержание</p><ol>{toc}</ol></nav><div class="legal__body">\n{body}</div></div></section></section>')

def table(label, head, rows):
    th = ''.join(f'<th>{h}</th>' for h in head)
    trs = ''.join('<tr><td class="p">' + r[0] + '</td>' + ''.join(f'<td data-l="{head[k+1]}" class="mono">{v}</td>' for k, v in enumerate(r[1:])) + '</tr>' for r in rows)
    return f'<div class="dt-wrap"><div class="dt-scroll"><table class="dt" aria-label="{label}"><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table></div></div>'

def article_body_stoki(a):
    rows = [('БПК₅, мг/дм³', '74', '2,8'), ('ХПК, мгО/дм³', '169', '6,2'), ('Взвешенные вещества, мг/дм³', '52', '4,0'),
            ('Фосфор общий, мг/дм³', '24,4', '0,85'), ('Азот общий, мг/дм³', 'более 100', '21,2'), ('Нефтепродукты, мг/дм³', '7,6', '0,20')]
    S = [
     ('sbros', '1. Куда сбрасываются стоки — от этого зависят нормативы',
      '<ul><li><strong>В централизованную канализацию.</strong> Требования к составу сточных вод установлены Правилами холодного водоснабжения и водоотведения (постановление Правительства РФ от 29.07.2013 № 644, приложения 5 и 7) и договором с организацией, осуществляющей водоотведение.</li>'
      '<li><strong>В водный объект.</strong> Требования задают нормативы допустимых сбросов и разрешение на сброс для конкретного объекта; как правило, они строже.</li></ul>'
      '<p>Конкретные значения — из документов вашего объекта. Перед приёмкой проверьте действующую редакцию нормативов и требования вашего водоканала.</p>'),
     ('pokazateli', '2. Какие показатели обычно смотрят',
      '<ul><li>БПК₅ — биохимическое потребление кислорода за 5 суток: показывает, сколько кислорода расходуют микроорганизмы на окисление биологически разлагаемой органики;</li>'
      '<li>ХПК — химическое потребление кислорода: суммарная окисляемость веществ химическим окислителем;</li>'
      '<li>взвешенные вещества;</li><li>фосфор общий и азот общий — биогенные элементы;</li><li>нефтепродукты.</li></ul>'
      '<p>Полный перечень задают ваши нормативы: в протоколах из примера ниже — 37 показателей.</p>'),
     ('proby', '3. Как организовать отбор проб',
      '<ul><li>Точки «до» и «после» установки отбирают синхронно и записывают режим работы установки и расход стоков.</li>'
      '<li>Анализы выполняет лаборатория, аккредитованная по нужным показателям; тару, консервацию и сроки доставки определяют ГОСТ 31861-2012 и методики лаборатории.</li>'
      '<li>Состав стоков меняется в течение суток и по дням, поэтому для приёмки используют усреднённые (смешанные) пробы и серию проб за период испытаний. В нашей программе пилота — непрерывная работа 8–12 недель с серией проб.</li>'
      '<li>Критерии приёмки — перечень показателей, нормативы, схему и число проб — согласуют до начала испытаний.</li></ul>'),
     ('primer', '4. Пример: хозяйственно-бытовые стоки на стенде ЭКОТЕХ',
      '<p>Пробы хозяйственно-бытовых стоков до и после Экофильтра, стенд ЭКОТЕХ (п. ИФА РАН), 27.08.2025. Протоколы № 5094 и № 5095, ООО «Лаб24» (аккредитация RA.RU.21AH50); нормативы протокола — для сброса в централизованную канализацию (ПП РФ № 644). Статус данных — <strong>измерено</strong>.</p>'
      + table('Хозяйственно-бытовые стоки до и после очистки', ['Показатель', 'До', 'После'], rows) +
      '<p>Это данные одной серии проб на стенде: состав стоков на вашем объекте другой, поэтому результат проверяется на месте. Материал не является публичной офертой.</p>'
      '<p>Все показатели с источниками — на странице <a href="/dokazatelstva/">«Результаты и документы»</a>; решения для предприятий — на странице <a href="/promyshlennost/">«Для промышленных предприятий»</a>.</p>'),
     ('postavshchik', '5. Что запросить у поставщика перед пилотом',
      '<ul><li>номера и даты протоколов, лабораторию и область её аккредитации;</li><li>откуда взяты стоки и по каким нормативам их сравнивали;</li>'
      '<li>программу испытаний на вашем объекте: схему отбора проб, усреднение, перечень показателей и критерии приёмки.</li></ul>'
      '<p>Пришлите анализ ваших стоков и требования к сбросу — подготовим программу испытаний.</p>'
      f'<p class="e404-gap"><a class="btn btn--primary" href="/kontakty/#pilot">Обсудить пилот{ARROW}</a></p>'),
    ]
    return article_shell(a, S)

def index_body():
    cards = ''.join(f'<li class="legal__sec"><p class="t-overline">{a["date_ru"]}</p><h2 class="t-h3"><a href="/stati/{a["slug"]}/">{esc(a["title"])}</a></h2><p>{esc(a["desc"])}</p></li>' for a in ARTICLES)
    return f'''<section class="page" data-page="stati" data-title="Статьи — ЭКОТЕХ"><div class="wrap"><nav class="crumbs" aria-label="Путь"><a href="/">Главная</a> / <span>Статьи</span></nav></div><section class="hero--page"><div class="wrap"><p class="t-overline accent">Статьи</p><h1 class="t-display u5">Статьи о водоподготовке и приёмке по измерениям</h1><p class="t-lead">Как проверять результат очистки воды и стоков: нормативы, отбор проб и примеры с протоколами лабораторий.</p></div></section><section class="sec sec--tight"><div class="wrap"><ul class="legal__body stati-list">{cards}</ul></div></section></section>'''

os.makedirs(os.path.join(OUT, 'stati'), exist_ok=True)
idx_pre = head(PRE, 'Статьи — ЭКОТЕХ', 'Статьи ЭКОТЕХ о водоподготовке: нормативы, отбор проб до и после очистки, приёмка по измерениям, примеры с протоколами лабораторий.', '/stati/', None)
open(os.path.join(OUT, 'stati/index.html'), 'w', encoding='utf-8').write(idx_pre + index_body() + SUF)
for a in ARTICLES:
    ld = {"@context": "https://schema.org", "@type": "Article", "headline": a['title'], "description": a['desc'],
          "datePublished": a['date'], "dateModified": a['date'], "inLanguage": "ru",
          "mainEntityOfPage": f"{BASE}/stati/{a['slug']}/",
          "author": {"@type": "Organization", "name": "ЭКОТЕХ", "url": BASE + "/"},
          "publisher": {"@type": "Organization", "name": "ООО «Экологические технологии»", "url": BASE + "/"},
          "image": BASE + "/assets/img/og-image.png"}
    p = head(PRE, a['meta_title'], a['desc'], f"/stati/{a['slug']}/", ld)
    os.makedirs(os.path.join(OUT, 'stati', a['slug']), exist_ok=True)
    open(os.path.join(OUT, 'stati', a['slug'], 'index.html'), 'w', encoding='utf-8').write(p + (article_body_stoki(a) if a.get('body') == 'stoki' else article_body(a)) + SUF)
print('ok', [a['slug'] for a in ARTICLES])
