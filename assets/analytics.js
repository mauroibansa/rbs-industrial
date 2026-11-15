/* RBS · GoatCounter /count API: https://www.goatcounter.com/help/pixel
 * Loaded synchronously in <head>: contact clicks never wait for a third-party script.
 * Only page paths, fixed event names and explicit campaign labels are transmitted.
 */
(function () {
  'use strict';
  var endpoint = 'https://rbsindustrial.goatcounter.com/count';
  var query = new URLSearchParams(location.search);
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var test = query.get('prueba_estadisticas') || '';
  test = local && /^[a-z0-9-]{1,40}$/.test(test) ? test : '';
  var production = /^(www\.)?rbsindustrial\.com$/.test(location.hostname);
  var pendingKey = 'rbs-formulario-pendiente';
  var returned = false;
  var ignored = false;
  var images = [];

  // This preference is set only when the site administrator explicitly asks.
  try {
    if (query.get('estadisticas') === 'excluir') localStorage.setItem('skipgc', 't');
    if (query.get('estadisticas') === 'incluir') localStorage.removeItem('skipgc');
    ignored = localStorage.getItem('skipgc') === 't';
  } catch (_) { /* Storage restrictions must not break the site. */ }

  // A return is a browser signal, never proof that an email was delivered.
  try {
    var started = Number(sessionStorage.getItem(pendingKey));
    var age = Date.now() - started;
    returned = query.get('enviado') === '1' && started > 0 && age >= 0 && age < 1800000;
    if (query.has('enviado')) sessionStorage.removeItem(pendingKey);
  } catch (_) { /* No storage: omit the unconfirmed return event. */ }

  function pageReady() {
    var message = document.querySelector('.sent');
    if (message) message.hidden = !returned;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pageReady);
  else pageReady();

  document.addEventListener('submit', function (event) {
    if (!event.target.matches('form.form') || !event.target.checkValidity()) return;
    try { sessionStorage.setItem(pendingKey, String(Date.now())); } catch (_) {}
  });

  if ((!production && !test) || (ignored && !test)) return;

  // Retain campaign labels only; never transmit the full query or form fields.
  var campaign = new URLSearchParams();
  ['utm_campaign', 'utm_source', 'utm_medium'].forEach(function (key) {
    var value = query.get(key);
    if (value && /^[a-z0-9_.~-]{1,80}$/i.test(value)) campaign.set(key, value);
  });
  var referrer = '';
  try {
    var ref = new URL(document.referrer);
    if (ref.hostname.replace(/^www\./, '') !== location.hostname.replace(/^www\./, '')) referrer = ref.origin;
  } catch (_) {}

  function send(path, title, event) {
    var data = new URLSearchParams({
      p: test ? (event ? 'prueba-' + test + '-' + path : '/pruebas/' + test + '/') : path,
      t: test ? 'PRUEBA · ' + title : title,
      r: test ? 'prueba-local' : referrer,
      rnd: Math.random().toString(36).slice(2, 10)
    });
    if (event) data.set('e', 'true');
    if (campaign.toString()) data.set('q', '?' + campaign.toString());
    if (navigator.webdriver) data.set('b', '153');
    var url = endpoint + '?' + data.toString();
    try { if (navigator.sendBeacon && navigator.sendBeacon(url)) return; } catch (_) {}
    // Keep a reference until completion; this fallback never delays navigation.
    var pixel = new Image();
    images.push(pixel);
    pixel.onload = pixel.onerror = function () { images.splice(images.indexOf(pixel), 1); };
    pixel.referrerPolicy = 'no-referrer';
    pixel.src = url;
  }

  document.addEventListener('click', function (event) {
    if (event.button !== undefined && event.button !== 0) return;
    var anchor = event.target.closest && event.target.closest('a[href]');
    if (!anchor) return;
    var href = anchor.getAttribute('href'), type;
    if (/^tel:/i.test(href)) type = 'clic-llamar';
    else if (/^https:\/\/wa\.me\//i.test(href)) type = 'clic-whatsapp';
    else if (/^mailto:/i.test(href)) type = 'clic-email';
    else if (/^https:\/\/www\.google\.com\/maps(?:\/|\?)/i.test(href)) type = 'clic-maps';
    else return;
    var section = anchor.closest('section');
    var zone = anchor.closest('header') ? 'cabecera' : anchor.closest('.sticky') ? 'barra-movil' : section ? section.id || 'portada' : 'pie';
    send(type + '-' + zone, type + ' · ' + zone, true);
  }, true);

  function countVisit() {
    if (document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', countVisit);
    send(location.pathname === '/index.html' ? '/' : location.pathname, document.title, false);
    if (returned) send('retorno-formulario', 'Retorno tras enviar formulario (no confirma recepción)', true);
  }
  if (document.visibilityState === 'visible') countVisit();
  else document.addEventListener('visibilitychange', countVisit);
})();
