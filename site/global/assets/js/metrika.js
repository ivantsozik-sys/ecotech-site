/* ЭКОТЕХ — Яндекс Метрика с согласием посетителя (решение владельца 14.10.2026).
   Без согласия счётчик не загружается и cookie Метрики не ставятся.
   Вебвизор выключен. Один файл для основного сайта и международной версии. */
(function (w, d) {
  'use strict';
  var ID = 0; /* номер счётчика Метрики; 0 — счётчик выключен, баннер не показывается */
  if (!ID) return;
  var KEY = 'ecotech_consent';
  var lang = (d.documentElement.lang || 'ru').slice(0, 2);
  var T = {
    ru: ['Мы используем cookie и Яндекс Метрику, чтобы понимать, какие страницы полезны, и улучшать сайт. Данные обрабатывает Яндекс в России.', 'Принять', 'Отказаться', 'Подробнее', '/politika/#cookie'],
    en: ['We use cookies and Yandex Metrica to see which pages are useful and to improve the site. Data is processed by Yandex in Russia.', 'Accept', 'Decline', 'Details', '/politika/#cookie'],
    zh: ['我们使用 cookie 和 Yandex Metrica 了解哪些页面有用并改进网站。数据由 Yandex 在俄罗斯处理。', '接受', '拒绝', '详情', '/politika/#cookie'],
    fr: ['Nous utilisons des cookies et Yandex Metrica pour savoir quelles pages sont utiles et améliorer le site. Les données sont traitées par Yandex en Russie.', 'Accepter', 'Refuser', 'Détails', '/politika/#cookie'],
    ar: ['نستخدم ملفات تعريف الارتباط وYandex Metrica لمعرفة الصفحات المفيدة وتحسين الموقع. تعالج Yandex البيانات في روسيا.', 'موافق', 'رفض', 'التفاصيل', '/politika/#cookie'],
    fa: ['ما از کوکی و Yandex Metrica استفاده می‌کنیم تا بفهمیم کدام صفحات مفیدند و سایت را بهتر کنیم. داده‌ها را Yandex در روسیه پردازش می‌کند.', 'پذیرفتن', 'نپذیرفتن', 'جزئیات', '/politika/#cookie']
  };
  var t = T[lang] || T.en;
  function get() { try { return w.localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { w.localStorage.setItem(KEY, v); } catch (e) {} }

  function goal(name) { if (w.ym) { try { w.ym(ID, 'reachGoal', name); } catch (e) {} } }

  function load() {
    if (w.ym) return;
    w.ym = function () { (w.ym.a = w.ym.a || []).push(arguments); };
    w.ym.l = 1 * new Date();
    var s = d.createElement('script');
    s.async = true; s.src = 'https://mc.yandex.ru/metrika/tag.js';
    d.head.appendChild(s);
    w.ym(ID, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: false });
    /* цели: заявка, опросный лист, звонок, почта, мессенджеры, переход к форме */
    d.addEventListener('ecotech:lead', function () { goal('lead'); });
    d.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a');
      if (!a) return;
      var h = a.getAttribute('href') || '';
      if (/Questionnaire_/.test(h)) goal('questionnaire');
      else if (/\.pdf$/i.test(h)) goal('pdf');
      else if (/^tel:/.test(h)) goal('call');
      else if (/^mailto:/.test(h)) goal('email');
      else if (/t\.me\/|max\.ru\/|vk\.com\/|wa\.me\//.test(h)) goal('messenger');
      else if (/#contact$/.test(h)) goal('to_form');
    });
  }

  function banner() {
    var b = d.createElement('div');
    b.className = 'cc'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-live', 'polite');
    b.setAttribute('aria-label', t[3]);
    var p = d.createElement('p'); p.textContent = t[0] + ' ';
    var more = d.createElement('a'); more.href = t[4]; more.textContent = t[3]; p.appendChild(more);
    var yes = d.createElement('button'); yes.type = 'button'; yes.className = 'cc-yes'; yes.textContent = t[1];
    var no = d.createElement('button'); no.type = 'button'; no.className = 'cc-no'; no.textContent = t[2];
    var row = d.createElement('div'); row.className = 'cc-row'; row.appendChild(yes); row.appendChild(no);
    b.appendChild(p); b.appendChild(row);
    yes.addEventListener('click', function () { set('yes'); b.remove(); load(); });
    no.addEventListener('click', function () { set('no'); b.remove(); });
    d.body.appendChild(b);
  }

  /* ?cookies=reset — снова показать выбор (ссылка в политике) */
  if (/[?&]cookies=reset\b/.test(location.search)) { try { w.localStorage.removeItem(KEY); } catch (e) {} }
  var c = get();
  if (c === 'yes') load();
  else if (c !== 'no') {
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', banner); else banner();
  }
})(window, document);
