// Проверка перед выгрузкой: все локальные ссылки и ресурсы существуют,
// нет внешних скриптов, стилей и шрифтов (сайт полностью автономен).
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const pages = ['index.html', '404.html'];
const css = ['assets/css/fonts.css', 'assets/css/tokens.css', 'assets/css/site.css'];
const required = ['robots.txt', 'sitemap.xml', 'favicon.ico', '.htaccess', 'assets/js/site.js', 'assets/js/theme.js'];
const errors = [];

const local = (ref) => !/^(https?:|mailto:|tel:|data:|#)/.test(ref);
const resolve = (from, ref) => {
  const clean = ref.split(/[?#]/)[0];
  return clean.startsWith('/') ? join(root, clean) : join(root, dirname(from), clean);
};

for (const f of [...pages, ...css, ...required]) if (!existsSync(join(root, f))) errors.push(`нет файла: ${f}`);

for (const page of pages) {
  const html = readFileSync(join(root, page), 'utf8');
  for (const [, attr, ref] of html.matchAll(/\s(href|src)="([^"]+)"/g)) {
    if (local(ref)) {
      if (ref.split(/[?#]/)[0] && !existsSync(resolve(page, ref))) errors.push(`${page}: нет ресурса ${ref}`);
    } else if (/^https?:/.test(ref) && attr === 'src') {
      errors.push(`${page}: внешний ресурс ${ref}`);
    }
  }
  for (const [, ref] of html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="(https?:[^"]+)"/g)) errors.push(`${page}: внешний стиль ${ref}`);
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const pagesIds = new Set([...html.matchAll(/\sdata-page="([^"]+)"/g)].map((m) => m[1]));
  // Адреса вида #страница или #страница.якорь (страницы переключаются по data-page)
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) {
    const [pg, sub] = id.split('.');
    const ok = ids.has(id) || (pagesIds.has(pg) && (!sub || ids.has(sub) || id.startsWith('kontakty.')));
    if (!ok) errors.push(`${page}: нет якоря #${id}`);
  }
  if (/\sstyle="/.test(html)) errors.push(`${page}: встроенный атрибут style (запрещён CSP)`);
  if (/<script(?![^>]*\ssrc=)(?![^>]*application\/ld\+json)[^>]*>/.test(html)) errors.push(`${page}: встроенный скрипт (запрещён CSP)`);
  if (/\son[a-z]+="/.test(html)) errors.push(`${page}: обработчик в атрибуте (запрещён CSP)`);
}

for (const f of css) {
  const text = readFileSync(join(root, f), 'utf8');
  for (const [, ref] of text.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) {
    if (/^https?:/.test(ref)) errors.push(`${f}: внешний ресурс ${ref}`);
    else if (!ref.startsWith('data:') && !existsSync(resolve(f, ref))) errors.push(`${f}: нет ресурса ${ref}`);
  }
}

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Проверка пройдена: ${pages.length} страницы, ${css.length} файла стилей.`);
