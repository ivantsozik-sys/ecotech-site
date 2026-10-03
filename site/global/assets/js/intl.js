/* ЭКОТЕХ · международная версия · поведение страницы. Без библиотек; работает под CSP (только 'self'). */
(function () {
  'use strict';
  var d = document, root = d.documentElement, w = window;
  var rtl = root.dir === 'rtl';
  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');

  /* ---------- шапка, прогресс прокрутки, подсветка раздела ---------- */
  var hdr = d.getElementById('hdr');
  var bar = d.createElement('div'); bar.className = 'progress'; bar.setAttribute('aria-hidden', 'true'); d.body.appendChild(bar);
  var spyLinks = [].slice.call(d.querySelectorAll('[data-spy]'));
  var spyTargets = spyLinks.map(function (a) { return d.getElementById(a.getAttribute('data-spy')); });
  var psteps = d.querySelector('.psteps');
  function onScroll() {
    var y = w.scrollY || 0, h = d.documentElement.scrollHeight - w.innerHeight;
    if (hdr) hdr.classList.toggle('is-solid', y > 40 || (nav && nav.classList.contains('is-open')));
    bar.style.setProperty('--p', h > 0 ? Math.min(1, y / h).toFixed(4) : 0);
    var mark = y + w.innerHeight * 0.35, cur = -1, best = -1;
    spyTargets.forEach(function (s, i) {
      if (!s) return;
      var top = s.getBoundingClientRect().top + y;
      if (top <= mark && top > best) { best = top; cur = i; }
    });
    spyLinks.forEach(function (a, i) { a.classList.toggle('is-on', i === cur); });
    if (psteps) {
      var r = psteps.getBoundingClientRect();
      var f = (w.innerHeight * 0.85 - r.top) / (r.height + w.innerHeight * 0.3);
      psteps.style.setProperty('--fill', Math.max(0, Math.min(1, f)).toFixed(3));
    }
  }

  /* ---------- меню, язык, тема ---------- */
  var nav = d.getElementById('nav'), menu = d.getElementById('menu');
  if (menu && nav) {
    menu.addEventListener('click', function () {
      var open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open); menu.setAttribute('aria-expanded', open); onScroll();
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) { nav.classList.remove('is-open'); menu.setAttribute('aria-expanded', 'false'); }
    });
  }
  var lang = d.getElementById('lang');
  if (lang) {
    var lb = lang.querySelector('button'), ll = lang.querySelector('ul');
    lb.addEventListener('click', function (e) {
      e.stopPropagation(); var open = ll.hidden; ll.hidden = !open; lb.setAttribute('aria-expanded', open);
    });
    d.addEventListener('click', function (e) { if (!lang.contains(e.target)) { ll.hidden = true; lb.setAttribute('aria-expanded', 'false'); } });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') { ll.hidden = true; lb.setAttribute('aria-expanded', 'false'); lb.focus(); } });
  }
  var themeBtn = d.getElementById('theme');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var cur = root.getAttribute('data-theme') ||
      (w.matchMedia && w.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var next = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('et-theme', next); } catch (e) {}
  });

  /* ---------- появление блоков (контент видим без скрипта; анимация только при входе в экран) ---------- */
  var reveals = [].slice.call(d.querySelectorAll('.reveal, .dots'));
  if ('IntersectionObserver' in w && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in'); io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px 6% 0px', threshold: 0 });
    reveals.forEach(function (el, i) {
      if (el.getBoundingClientRect().top > w.innerHeight) { el.style.setProperty('--d', (i % 4) * 80 + 'ms'); io.observe(el); }
    });
  }

  /* ---------- подсветка карточек за курсором ---------- */
  [].forEach.call(d.querySelectorAll('.pcard'), function (c) {
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- форма: письмо в почтовом приложении ---------- */
  var form = d.getElementById('form');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements, err = d.getElementById('form-err');
    var ok = f.name.value.trim() && f.contact.value.trim() && f.task.value.trim() && f.consent.checked;
    if (!ok) { err.textContent = form.getAttribute('data-err'); err.hidden = false; return; }
    err.hidden = true;
    var body = [f.name.value, f.org.value, f.contact.value, '', f.task.value, '', '— ' + location.href].join('\n');
    location.href = 'mailto:' + form.getAttribute('data-to') + '?subject=' + encodeURIComponent('ECOTECH · ' + f.topic.value) + '&body=' + encodeURIComponent(body);
  });

  /* ---------- живой фон первого экрана: потоки воды, тепла и данных ---------- */
  var hero = d.querySelector('.hero-bg');
  if (hero && w.HTMLCanvasElement) {
    var cv = d.createElement('canvas'); cv.className = 'hero-canvas'; cv.setAttribute('aria-hidden', 'true');
    hero.insertBefore(cv, hero.querySelector(".hero-flows"));
    var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1, parts = [], running = true, t0 = 0;
    var streams = [
      { c: [107, 212, 224], y: 0.74, a: 0.10, f: 1.6, n: 70, v: 0.9 },  // вода
      { c: [196, 128, 58], y: 0.30, a: 0.09, f: 1.3, n: 45, v: 0.7 },   // тепло
      { c: [92, 168, 230], y: 0.52, a: 0.06, f: 2.1, n: 55, v: 1.2 }    // данные
    ];
    function size() {
      var r = cv.getBoundingClientRect(); dpr = Math.min(2, w.devicePixelRatio || 1);
      W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function seed() {
      parts = [];
      streams.forEach(function (s) {
        for (var i = 0; i < s.n * Math.max(0.5, Math.min(1.4, W / 1200)); i++) {
          parts.push({ s: s, x: Math.random(), o: (Math.random() - 0.5) * 0.09, r: 0.6 + Math.random() * 1.8, sp: (0.4 + Math.random()) * s.v, ph: Math.random() * 6.28 });
        }
      });
    }
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      var time = t / 1000;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i], s = p.s;
        if (!reduce) { p.x += p.sp * 0.0006; if (p.x > 1.05) p.x = -0.05; }
        var xx = rtl ? 1 - p.x : p.x;
        var y = (s.y + p.o + Math.sin(p.x * Math.PI * s.f + time * 0.4 + p.ph * 0.15) * s.a) * H;
        var tw = 0.35 + 0.35 * Math.sin(time * 1.4 + p.ph);
        ctx.beginPath(); ctx.arc(xx * W, y, p.r, 0, 6.283);
        ctx.fillStyle = 'rgba(' + s.c[0] + ',' + s.c[1] + ',' + s.c[2] + ',' + tw.toFixed(3) + ')';
        ctx.fill();
      }
    }
    function loop(t) { if (!running) return; draw(t || 0); requestAnimationFrame(loop); }
    size(); seed();
    if (reduce) draw(0); else requestAnimationFrame(loop);
    w.addEventListener('resize', function () { size(); seed(); if (reduce) draw(0); });
    if ('IntersectionObserver' in w && !reduce) {
      new IntersectionObserver(function (en) {
        var vis = en[0].isIntersecting;
        if (vis && !running) { running = true; requestAnimationFrame(loop); } else if (!vis) running = false;
      }).observe(hero);
    }
  }

  w.addEventListener('scroll', onScroll, { passive: true });
  w.addEventListener('resize', onScroll);
  onScroll();
})();
