// Проверка перед выгрузкой: все локальные ссылки и ресурсы существуют,
// нет внешних скриптов, стилей и шрифтов (сайт полностью автономен).
// С 04.10.2026 каждый раздел — отдельный адрес /раздел/ (папка с index.html).
// Папка global/ (международная версия) проверяется своей проверкой и здесь не разбирается.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const skipDirs = new Set(['global', 'assets', 'scripts', '.github', '.git', 'node_modules', 'dist', 'out']);
const sections = readdirSync(root).filter((d) => !skipDirs.has(d) && !d.startsWith('.') &&
  statSync(join(root, d)).isDirectory() && existsSync(join(root, d, 'index.html')));
const pages = ['index.html', '404.html', ...sections.map((d) => `${d}/index.html`)];
const css = ['assets/css/fonts.css', 'assets/css/tokens.css', 'assets/css/site.css'];
const required = ['robots.txt', 'sitemap.xml', 'favicon.ico', '.htaccess', 'assets/js/site.js', 'assets/js/theme.js'];
const errors = [];

const local = (ref) => !/^(https?:|mailto:|tel:|data:|#)/.test(ref);
const resolve = (from, ref) => {
  const clean = ref.split(/[?#]/)[0];
  return clean.startsWith('/') ? join(root, clean) : join(root, dirname(from), clean);
};
const idsCache = new Map();
const idsOf = (file) => {
  if (!idsCache.has(file)) idsCache.set(file, new Set([...readFileSync(file, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  return idsCache.get(file);
};
const pageFile = (p) => (p.endsWith('/') ? join(p, 'index.html') : p);

for (const f of [...pages, ...css, ...required]) if (!existsSync(join(root, f))) errors.push(`нет файла: ${f}`);

for (const page of pages) {
  const html = readFileSync(join(root, page), 'utf8');
  const ids = idsOf(join(root, page));
  for (const [, attr, ref] of html.matchAll(/\s(href|src)="([^"]+)"/g)) {
    if (local(ref)) {
      const path = ref.split(/[?#]/)[0];
      if (path && !existsSync(resolve(page, ref))) { errors.push(`${page}: нет ресурса ${ref}`); continue; }
      const hash = ref.split('#')[1];
      // якорь на другой странице: проверяем id; темы формы (#pilot и т. п.) — радиокнопки t-<тема>
      if (hash && path.endsWith('/')) {
        const target = idsOf(pageFile(resolve(page, path)));
        if (!target.has(hash) && !target.has(`t-${hash}`)) errors.push(`${page}: нет якоря ${ref}`);
      }
    } else if (/^https?:/.test(ref) && attr === 'src') {
      errors.push(`${page}: внешний ресурс ${ref}`);
    }
  }
  for (const [, ref] of html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="(https?:[^"]+)"/g)) errors.push(`${page}: внешний стиль ${ref}`);
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) {
    if (!ids.has(id) && !ids.has(`t-${id}`)) errors.push(`${page}: нет якоря #${id}`);
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
console.log(`Проверка пройдена: ${pages.length} страниц, ${css.length} файла стилей.`);
