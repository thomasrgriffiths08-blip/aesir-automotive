/* ÆSIR shared behaviour: nav, reveal-on-scroll, toast, store helpers */
const nav = document.querySelector('nav.site');
addEventListener('scroll', () => nav && nav.classList.toggle('solid', scrollY > 30), {passive:true});
const burger = document.getElementById('burger');
if (burger) burger.onclick = () => document.getElementById('navLinks').classList.toggle('open');
document.querySelectorAll('#navLinks a').forEach(a => a.addEventListener('click', () => {
  document.getElementById('navLinks').classList.remove('open');
}));

const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting){ e.target.classList.add('on'); io.unobserve(e.target); }
}), {threshold:.12});
document.querySelectorAll('.rv').forEach(el => io.observe(el));

function toast(msg, ms = 3200){
  let t = document.querySelector('.toast');
  if (!t){ t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  /* msg can carry customer-supplied text — set it as text, never as markup */
  t.textContent = '';
  const ok = document.createElement('span'); ok.className = 'ok'; ok.textContent = '✓';
  const m = document.createElement('span'); m.textContent = msg;
  t.append(ok, m);
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), ms);
}

/* localStorage helpers — every system persists under aesir_* */
const store = {
  get(k, fallback){ try { return JSON.parse(localStorage.getItem('aesir_' + k)) ?? fallback; } catch { return fallback; } },
  set(k, v){ localStorage.setItem('aesir_' + k, JSON.stringify(v)); }
};

/* ============ ATTRIBUTION + EVENTS ============
   Tom is paid commission on jobs that come through this site, so every contact
   route carries a visitor reference (W-XXXX) and every meaningful action emits
   an event. Two sinks, both optional and independent:
   - ANALYTICS_ID: paste an Umami Cloud website id and every page gets a
     cookieless dashboard (pageviews + the events below). No consent banner
     needed, but update privacy.html per TRACKING.md when you switch it on.
   - EVENT_WEBHOOK: paste the Google Apps Script URL from TRACKING.md and every
     event also lands as a row in your own spreadsheet — clicks, bookings,
     failures — with the visitor ref, so you can match WhatsApp messages
     arriving on Neil's phone to the click that produced them. */
const ANALYTICS_ID = '';
const EVENT_WEBHOOK = '';
/* Shared secret that must match WRITE_KEY in the Apps Script. Without it the
   ledger endpoint is an open door: anyone could post fake bookings into the
   sheet you invoice from and fire emails at Neil. It only permits writing —
   reading needs the separate READ_KEY, which never appears in this file. */
const WEBHOOK_KEY = '';
/* Your own visits to the diary and the dashboard must never enter the ledger:
   the numbers you bill from can't include your own clicks. */
const IS_BACKOFFICE = /(admin|dashboard)\.html$/.test(location.pathname);

/* one ref per visitor, stable across pages and days — the commission key */
const VISITOR_REF = (() => {
  let r = store.get('ref', null);
  if (!r){
    r = 'W-' + Date.now().toString(36).slice(-4).toUpperCase() +
        Math.floor(Math.random() * 36).toString(36).toUpperCase();
    store.set('ref', r);
  }
  return r;
})();

if (ANALYTICS_ID){
  const s = document.createElement('script');
  s.defer = true; s.src = 'https://cloud.umami.is/script.js';
  s.setAttribute('data-website-id', ANALYTICS_ID);
  document.head.appendChild(s);
}

function track(name, props){
  if (IS_BACKOFFICE) return;
  const data = Object.assign({ref: VISITOR_REF, page: location.pathname.split('/').pop() || 'index'}, props || {});
  try { if (window.umami && umami.track) umami.track(name, data); } catch(e){}
  if (!EVENT_WEBHOOK) return;
  const body = JSON.stringify({kind: 'event', t: WEBHOOK_KEY, name, ts: Date.now(), ...data});
  try {
    /* sendBeacon sends text/plain, so it is a "simple" request and never
       triggers a CORS preflight — which Apps Script cannot answer. Some
       content blockers kill the Beacon API, hence the fetch fallback. */
    if (!(navigator.sendBeacon && navigator.sendBeacon(EVENT_WEBHOOK, body))){
      fetch(EVENT_WEBHOOK, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'},
                            body, keepalive: true}).catch(() => {});
    }
  } catch(e){}
}

/* The funnel needs a denominator. Without a pageview event, "visitors" would
   count only people who already made contact, and the conversion percentages
   would read over 100%. */
if (!IS_BACKOFFICE) track('pageview', {});

/* ============ DYNAMIC WHATSAPP MESSAGES ============
   Every wa.me link on the site rebuilds its message at click time from what
   the visitor has actually told us — name, car, reg, the service and slot they
   picked in the booking widget, or the service page they're reading — and
   stamps it with the visitor ref. A half-filled booking form still turns into
   a complete, specific WhatsApp message instead of a generic one. */
function waMessage(){
  const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const sel = id => { const el = document.getElementById(id); const c = el && el.querySelector('.chip.sel'); return c ? c.textContent.trim() : ''; };
  const name = val('fName'), reg = val('fReg').toUpperCase(), model = val('fModel');
  const svc = sel('svcChips'), day = sel('dayChips'), time = sel('timeChips');

  let m = 'Hi Neil' + (name ? ', it’s ' + name.split(' ')[0] : '') + ' — ';
  const car = model && reg ? model + ' (' + reg + ')' : (model || (reg ? 'car, reg ' + reg : ''));

  const tag = '[web ' + VISITOR_REF + ']';
  if (svc || car || day){
    m += 'I’d like to book ' + (car ? 'my ' + car : 'my car') + ' in';
    if (svc) m += ' for ' + svc;
    if (day && time) m += ', ideally ' + day + ' at ' + time;
    else if (day) m += ', ideally ' + day;
    m += '. ' + tag;
  } else {
    /* Open-ended messages leave the visitor typing their car at the end, so
       the ref goes mid-sentence — otherwise their words land after the tag. */
    const ms = location.pathname.match(/services\/([a-z-]+)\.html/);
    if (ms){
      const label = ms[1] === 'mot-prep' ? 'MOT prep' : ms[1].replace(/-/g, ' ');
      m += 'I’m after ' + label + ' for my car ' + tag + ' — it’s a ';
    } else {
      m += 'found you via the website ' + tag + '. My car is a ';
    }
  }
  return 'https://wa.me/447956658177?text=' + encodeURIComponent(m);
}

/* wire every WhatsApp link, present or future, through the composer */
addEventListener('click', e => {
  const a = e.target.closest('a[href*="wa.me"]');
  if (!a) return;
  a.href = waMessage();
  track('whatsapp_click', {
    source: a.classList.contains('wa-fab') ? 'fab' :
            a.closest('#widget') ? 'booking-widget' :
            a.closest('#wFail') ? 'booking-fail' : 'page-link',
    svc: (document.querySelector('#svcChips .chip.sel') || {textContent: ''}).textContent.trim() || undefined
  });
}, true);

/* the calls matter to commission too */
addEventListener('click', e => {
  const a = e.target.closest('a[href^="tel:"]');
  if (a) track('call_click', {});
  const ig = e.target.closest('a[href*="instagram.com"]');
  if (ig) track('ig_click', {});
}, true);

/* typewriter for sms bubbles */
function typeInto(el, text, speed = 18){
  return new Promise(res => {
    el.textContent = '';
    let i = 0;
    (function tick(){
      el.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(tick, speed); else res();
    })();
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

/* nav tuck: hide going down, return going up (desktop only) */
(() => {
  if (!nav) return;
  if (matchMedia('(max-width: 960px)').matches || !matchMedia('(pointer:fine)').matches) return;
  let last = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    if (y > 200 && y > last + 14) nav.classList.add('tuck');
    else if (y < last - 14 || y < 200) nav.classList.remove('tuck');
    last = y;
  }, {passive:true});
})();

/* ============ TRICOLOR PAGE TRANSITION ============
   Sweeps the brand stripes across on the way out, and off again on arrival.
   Skipped entirely under reduced-motion, and it never blocks navigation:
   if the page is slow, the browser leaves before the animation finishes,
   which is the correct priority. */
(() => {
  const wipe = document.createElement('div');
  wipe.className = 'wipe-nav';
  wipe.setAttribute('aria-hidden', 'true');
  wipe.innerHTML = '<i></i><i></i><i></i>';
  document.body.appendChild(wipe);

  /* Arrival: only clear the panels off if we actually came from another page
     on this site. On a fresh visit there was no sweep out, and flashing the
     colours across for no reason would just look like a bug. */
  if (sessionStorage.getItem('aesir_wipe')){
    sessionStorage.removeItem('aesir_wipe');
    wipe.classList.add('go');
    requestAnimationFrame(() => {
      wipe.classList.add('clear');
      setTimeout(() => wipe.classList.remove('go', 'clear'), 760);
    });
  }

  let leaving = false;
  addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || leaving || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || a.target === '_blank') return;
    const href = a.getAttribute('href');
    if (!href || /^(https?:|tel:|mailto:|#)/.test(href)) return;
    if (a.origin && a.origin !== location.origin) return;
    /* a same-page anchor is not a navigation — let it scroll */
    if (href.includes('#') && href.split('#')[0] === location.pathname.split('/').pop()) return;
    e.preventDefault();
    leaving = true;
    sessionStorage.setItem('aesir_wipe', '1');   /* tells the next page to clear them off */
    wipe.classList.remove('clear');
    wipe.classList.add('go');
    setTimeout(() => { location.href = href; }, 380);
  });

  /* coming back via the browser's back button restores the page from cache —
     clear the panels or the visitor lands behind a wall of colour */
  addEventListener('pageshow', e => {
    if (e.persisted){ leaving = false; wipe.classList.remove('go', 'clear'); }
  });
})();

/* floating WhatsApp button — pre-filled message straight to the workshop */
(() => {
  const wa = document.createElement('a');
  wa.className = 'wa-fab';
  wa.href = 'https://wa.me/447956658177?text=' + encodeURIComponent(
    "Hi Neil — found you via the website. My car is a ");
  wa.target = '_blank'; wa.rel = 'noopener';
  wa.setAttribute('aria-label', 'WhatsApp the workshop');
  wa.innerHTML = '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M16 3C9.4 3 4 8.3 4 14.9c0 2.6.8 5 2.3 7L4 29l7.3-2.3c1.9 1 3.9 1.5 4.7 1.5 6.6 0 12-5.3 12-11.9S22.6 3 16 3zm0 21.8c-1.5 0-3.4-.5-5-1.4l-.4-.2-4.3 1.4 1.4-4.2-.3-.4c-1.3-1.7-2-3.8-2-5.9C5.4 9.4 10.2 4.7 16 4.7s10.6 4.7 10.6 10.4S21.8 24.8 16 24.8zm5.8-7.7c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.5-1.6-.9-.8-1.6-1.9-1.7-2.2-.2-.3 0-.5.1-.6l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6-.1-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7s1.2 3.1 1.3 3.4c.2.2 2.3 3.5 5.5 4.9.8.3 1.4.5 1.9.7.8.2 1.5.2 2 .1.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.2-.6-.4z"/></svg>';
  if (document.getElementById('cine')){
    wa.classList.add('wa-wait');
    const iv = setInterval(() => {
      if (document.body.classList.contains('ready')){ wa.classList.remove('wa-wait'); clearInterval(iv); }
    }, 200);
  }
  document.body.appendChild(wa);
})();
