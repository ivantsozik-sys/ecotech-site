/* Выбор языка на корневой странице: на рабочем домене переводит на язык браузера; список языков остаётся доступным без скрипта. */
(function () {
  try {
    if (!/ecotechnew\.ru$/.test(location.hostname)) return;
    if (sessionStorage.getItem('et-lang-chosen')) return;
    var have = ['ru', 'en', 'zh', 'fr', 'ar', 'fa'];
    var prefs = navigator.languages || [navigator.language || 'en'];
    for (var i = 0; i < prefs.length; i++) {
      var code = String(prefs[i]).toLowerCase().slice(0, 2);
      if (have.indexOf(code) > -1) { sessionStorage.setItem('et-lang-chosen', '1'); location.replace(code + '/'); return; }
    }
  } catch (e) {}
})();
