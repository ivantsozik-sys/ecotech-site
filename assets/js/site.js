/* ЭКОТЕХ RC3 · поведение: тема, меню, шапка, фильтры реестра, форма. Без внешних зависимостей. */
(function () {
  var root = document.documentElement;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function isDark() {
    var t = root.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function syncTheme() {
    var d = isDark();
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-pressed', d ? 'true' : 'false');
      b.setAttribute('aria-label', d ? 'Включить светлую тему' : 'Включить тёмную тему');
    });
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next); store('et-theme', next); syncTheme();
    });
  });
  syncTheme();

  /* шапка */
  var hdr = document.getElementById('hdr');
  function onScroll() { if (!hdr) return; var y = window.scrollY, on = hdr.classList.contains('is-scrolled'); if (!on && y > 40) hdr.classList.add('is-scrolled'); else if (on && y < 2) hdr.classList.remove('is-scrolled'); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* мобильное меню */
  var m = document.getElementById('mnav'), opener = document.querySelector('[data-menu-open]');
  function setMenu(on) {
    if (!m) return;
    m.classList.toggle('on', on); document.body.classList.toggle('lock', on);
    ['hdr', 'main'].forEach(function (id) { var el = document.getElementById(id); if (el) { if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert'); } });
    var ft = document.querySelector('footer.ftr'); if (ft) { if (on) ft.setAttribute('inert', ''); else ft.removeAttribute('inert'); }
    if (opener) opener.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (on) { var f = m.querySelector('button'); if (f) f.focus(); } else if (opener) opener.focus();
  }
  if (opener) opener.addEventListener('click', function () { setMenu(true); });
  document.querySelectorAll('[data-menu-close]').forEach(function (b) { b.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && m && m.classList.contains('on')) setMenu(false); });
  if (m) m.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var f = m.querySelectorAll('a,button'); if (!f.length) return;
    var a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  });

  /* реестр: фильтры */
  var reg = document.getElementById('registry');
  if (reg) {
    var st = { d: 'all', ev: 'all', arch: false };
    var cnt = reg.closest('.dt-wrap').querySelector('[data-count]');
    function apply() {
      var rows = reg.querySelectorAll('tbody tr'), shown = 0;
      var collapsed = reg.classList.contains('dt--collapsed') && st.d === 'all' && st.ev === 'all' && !st.arch;
      rows.forEach(function (r) {
        var arch = r.hasAttribute('data-arch');
        if (collapsed && r.hasAttribute('data-extra')) { r.hidden = true; return; }
        var ok = (st.arch ? true : !arch) && (st.d === 'all' || r.dataset.d === st.d || (arch && st.arch && st.d === 'all')) && (st.ev === 'all' || r.dataset.ev === st.ev);
        r.hidden = !ok; if (ok) shown++;
      });
      var active = 0, archN = 0; rows.forEach(function (r) { if (r.hasAttribute('data-arch')) archN++; else active++; });
      if (cnt) cnt.textContent = collapsed ? ('Основные показатели: ' + shown + ' из ' + active)
        : (st.arch ? ('Показатели: ' + shown + ' · включая архив: ' + archN) : ((st.d === 'all' && st.ev === 'all') ? ('Показаны все действующие показатели: ' + shown) : ('Показатели: ' + shown + ' из ' + active)));
      if (more) more.parentNode.hidden = !(st.d === 'all' && st.ev === 'all' && !st.arch);
    }
    document.querySelectorAll('[data-filters] button.chip').forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.dataset.f; st[f] = b.dataset.v;
        document.querySelectorAll('[data-filters] button[data-f="' + f + '"]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        apply();
      });
    });
    var more = document.querySelector('[data-more]');
    if (more) more.addEventListener('click', function () {
      var c = reg.classList.toggle('dt--collapsed');
      more.setAttribute('aria-expanded', c ? 'false' : 'true');
      more.textContent = c ? 'Показать все показатели' : 'Свернуть до основных';
      apply();
    });
    var at = document.querySelector('[data-arch-toggle]');
    if (at) at.addEventListener('change', function () { st.arch = at.checked; apply(); });
    apply();
  }

  /* контакты: тема из якоря */
  var form = document.getElementById('form');
  if (form) {
    var h = (location.hash || '').replace('#', '');
    var r = document.getElementById('t-' + h); if (r) r.checked = true;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      function chk(id, cond) {
        var f = document.getElementById(id), inp = f.querySelector('input,textarea');
        if (!cond) { f.setAttribute('data-err', ''); ok = false; if (inp) inp.setAttribute('aria-invalid', 'true'); }
        else { f.removeAttribute('data-err'); if (inp) inp.removeAttribute('aria-invalid'); }
      }
      var name = form.name.value.trim(), email = form.email.value.trim(), phone = form.phone.value.trim(), task = form.task.value.trim();
      var hasEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), hasPhone = phone.replace(/\D/g, '').length >= 10;
      chk('f-name', name.length > 1);
      var cg = document.getElementById('f-contact'), none = !email && !phone;
      var badE = !!email && !hasEmail, badP = !!phone && !hasPhone;
      function mark(id, bad) { var f = document.getElementById(id), x = f.querySelector('input');
        if (bad) { f.setAttribute('data-err', ''); x.setAttribute('aria-invalid', 'true'); } else { f.removeAttribute('data-err'); x.removeAttribute('aria-invalid'); } }
      if (none) { cg.setAttribute('data-err', ''); ok = false; } else cg.removeAttribute('data-err');
      mark('f-email', badE); mark('f-phone', badP);
      if (badE || badP) ok = false;
      if (none) { document.getElementById('email').setAttribute('aria-invalid', 'true'); document.getElementById('phone').setAttribute('aria-invalid', 'true'); }
      chk('f-task', task.length > 4);
      chk('f-consent', document.getElementById('consent').checked);
      if (!ok) { var first = form.querySelector('[data-err] input, [data-err] textarea'); if (first) first.focus(); return; }
      var contact = [email, phone].filter(Boolean).join(', ');
      var topic = form.querySelector('input[name=topic]:checked'); var tl = topic ? topic.parentNode.textContent.trim() : 'Запрос';
      var body = 'Имя: ' + name + '\nОрганизация: ' + form.org.value.trim() + '\nКонтакт: ' + contact + '\n\nЗадача:\n' + form.task.value.trim();
      var href = 'mailto:info@ecotechnew.ru?subject=' + encodeURIComponent('ЭКОТЕХ · ' + tl) + '&body=' + encodeURIComponent(body);
      var okEl = document.getElementById('form-ok');
      okEl.textContent = 'Открываем письмо в вашей почтовой программе. Если оно не открылось, напишите на info@ecotechnew.ru или позвоните +7 916 278-87-84.';
      window.location.href = href;
      okEl.classList.add('on');
      
    });
  }
})();
(function(){var pages=[].slice.call(document.querySelectorAll('.page'));
function go(){var h=(location.hash||'').slice(1),parts=h.split('.'),tok=parts[0]||'glavnaya',sub=parts[1];
 var pg=pages.filter(function(p){return p.dataset.page===tok})[0];
 if(!pg){ if(h&&document.getElementById(h))return; pg=pages[0];tok='glavnaya'}
 pages.forEach(function(p){p.hidden=p!==pg}); document.title=pg.dataset.title;
 document.querySelectorAll('.nav a,.mnav li a').forEach(function(a){var t=(a.getAttribute('href')||'').slice(1).split('.')[0];
  var on=t===tok||(tok==='promyshlennost'||tok==='gosudarstvo'||tok==='investoram')&&t==='primenenie';if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
 var m=document.getElementById('mnav');if(m&&m.classList.contains('on')){m.classList.remove('on');document.body.classList.remove('lock')}
 if(tok==='kontakty'&&sub){var r=document.getElementById('t-'+sub);if(r)r.checked=true}
 var el=sub&&pg.querySelector('[id="'+sub+'"]'); if(el)el.scrollIntoView(); else window.scrollTo(0,0);}
addEventListener('hashchange',go);go();})();
