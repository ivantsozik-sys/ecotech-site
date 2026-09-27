// Проверка сайта перед публикацией (сайт v1.0, многостраничный).
// Все страницы *.html: локальные ссылки и ресурсы существуют, нет внешних скриптов,
// стилей и шрифтов, встроенные скрипты совпадают с разрешённым хешем из .htaccess.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { createHash } from 'node:crypto';

const root = new URL('..', import.meta.url).pathname;
const SKIP = new Set(['.git', '.github', 'scripts', 'node_modules', 'dist', 'out']);
const required = ['index.html', '404.html', 'robots.txt', 'sitemap.xml', '.htaccess', 'assets/site.js', 'assets/site.css'];
const errors = [];

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  if (SKIP.has(n)) return [];
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = walk(root);
const pages = files.filter((f) => f.endsWith('.html'));
const cssFiles = files.filter((f) => f.endsWith('.css'));

for (const f of required) if (!existsSync(join(root, f))) errors.push(`нет файла: ${f}`);

const resolveRef = (from, ref) => {
  const clean = decodeURI(ref.split(/[?#]/)[0]);
  if (!clean) return null;
  let p = clean.startsWith('/') ? join(root, clean) : join(dirname(from), clean);
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  return p;
};
const isLocal = (ref) => !/^(https?:|mailto:|tel:|data:|#|javascript:)/i.test(ref);

// Разрешённые хеши встроенных скриптов берутся из заголовка CSP в .htaccess
const ht = existsSync(join(root, '.htaccess')) ? readFileSync(join(root, '.htaccess'), 'utf8') : '';
const allowed = new Set([...ht.matchAll(/'sha256-([A-Za-z0-9+/=]+)'/g)].map((m) => m[1]));

for (const page of pages) {
  const rel = relative(root, page);
  const html = readFileSync(page, 'utf8');
  for (const [, attr, ref] of html.matchAll(/\s(href|src)="([^"]+)"/g)) {
    if (isLocal(ref)) {
      const p = resolveRef(page, ref);
      if (p && !existsSync(p)) errors.push(`${rel}: нет ресурса ${ref}`);
    } else if (/^https?:/.test(ref) && attr === 'src') {
      errors.push(`${rel}: внешний ресурс ${ref}`);
    }
  }
  for (const [, ref] of html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="(https?:[^"]+)"/g)) errors.push(`${rel}: внешний стиль ${ref}`);
  for (const [, body] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    const h = createHash('sha256').update(body).digest('base64');
    if (!allowed.has(h)) errors.push(`${rel}: встроенный скрипт не разрешён в CSP (.htaccess), sha256-${h}`);
  }
  if (/\son[a-z]+="/.test(html)) errors.push(`${rel}: обработчик в атрибуте (запрещён CSP)`);
}

for (const f of cssFiles) {
  const text = readFileSync(f, 'utf8');
  for (const [, ref] of text.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) {
    if (/^https?:/.test(ref)) errors.push(`${relative(root, f)}: внешний ресурс ${ref}`);
    else if (!ref.startsWith('data:') && !ref.startsWith('#') && !existsSync(resolveRef(f, ref))) errors.push(`${relative(root, f)}: нет ресурса ${ref}`);
  }
}

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Проверка пройдена: ${pages.length} страниц, ${cssFiles.length} файлов стилей.`);
