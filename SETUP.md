# ÆSIR AUTOMOTIVE — Commission Tracking: The Setup Document

**Repo:** `/Users/tom/Applications/bmw-specialist`
**Live site:** https://thomasrgriffiths08-blip.github.io/aesir-automotive/
**GitHub:** https://github.com/thomasrgriffiths08-blip/aesir-automotive (branch `main`)

This replaces the setup half of `TRACKING.md`. Follow it top to bottom, once. Do not skip a SMOKE TEST — every failure in this system is silent, and the only defence is proving each link before you build the next one.

**Total time: about 70 minutes.** ~25 min editing files, ~20 min in Google, ~10 min waiting on Google/GitHub, ~15 min testing.

**Current verified state (checked just now):** working tree is clean, `HEAD == origin/main == a50b274`, so the live site matches your local files. All five constants are empty and at the lines quoted below. The `text/plain` CORS fix for the booking POST is already in and already deployed. Nothing in Stage 1 is re-doing work.


> **⚠️ Note on Stage 1:** the code edits described in Stage 1 have **already been
> applied and pushed** — the write key, the read key, the pageview event, the
> back-office guard, the `text/plain` CORS fix, the JSONP fallback and the
> hardened Apps Script are all in the repo now. The five constants are still
> empty and waiting for your values. So **skip Stage 1's edits** and start at
> Stage 0 (choosing your two keys), then fill in the constants listed in Stage 5.

---

## How to read the edits

Every edit gives you a **full absolute path**, a **line number**, the **exact text to find**, and the **exact text to replace it with**.

> **Within each file, do the edits in the order printed.** They are ordered bottom-of-file first, so the line numbers stay accurate as you go. If a number ever looks wrong, use your editor's Find (Cmd+F) on the BEFORE text — that never goes stale.

---

## Stage 0 — Two decisions, made now (3 minutes)

You need two random strings. Make them up now, write them in your password manager under "Æsir ledger", and use them consistently for the rest of this document.

1. **WRITE_KEY** — goes into the website files. It will be publicly visible in your source. That is accepted: its only job is to stop a drive-by scanner that finds the bare `/exec` URL from writing junk into the ledger you invoice from. Example: `aesir-w-7Q2vX9kR`
2. **READ_KEY** — this one is a real secret. It **never goes into any file you push**. You type it into the dashboard once per browser session. It is what stops your customers' names and phone numbers being world-readable JSON. Example: `aesir-r-4mZp8LtQ2w`

Make them different from each other. Make the READ_KEY at least 16 characters.

> The old `PIN = '8177'` is being removed. It was decorative — it sat in plain JavaScript on a public page, and it is the last four digits of the workshop phone number, which is printed on every page of the site.

---

## Stage 1 — Code edits (25 minutes)

All of these happen in your editor. Nothing touches Google yet, and nothing gets pushed until Stage 6.

### 1A · `/Users/tom/Applications/bmw-specialist/js/shared.js` — four edits

---

**Edit 1 of 4 — line 209–210.** The floating WhatsApp button must not appear on the back-office pages. Right now `dashboard.html` and `admin.html` both load this file, so opening your own stats page grows a WhatsApp button, and one tap writes a `whatsapp_click` into the exact ledger you invoice from.

FIND (lines 209–210 — note there is a nearly identical `(() => {` at line 165; this is the one directly under the comment `/* floating WhatsApp button …`):
```javascript
(() => {
  const wa = document.createElement('a');
```

REPLACE WITH:
```javascript
(() => {
  if (IS_BACKOFFICE) return;               /* never on dashboard.html / admin.html */
  const wa = document.createElement('a');
```

---

**Edit 2 of 4 — line 165–166.** Same reason: no page-transition wipe on the stats pages.

FIND (lines 165–166, directly under the comment `/* ============ TRICOLOR PAGE TRANSITION ============`):
```javascript
(() => {
  const wipe = document.createElement('div');
```

REPLACE WITH:
```javascript
(() => {
  if (IS_BACKOFFICE) return;               /* never on dashboard.html / admin.html */
  const wipe = document.createElement('div');
```

---

**Edit 3 of 4 — lines 66–75.** This is the big one. It does four things: stops the back-office pages polluting the ledger, adds the write key, adds a fallback for when `sendBeacon` refuses to queue, and — most importantly — **emits a pageview**. Without a pageview event the dashboard's "Visitors" figure is not visitors at all; it counts only people who *already made contact*, so every percentage on your commission dashboard is inflated and the headline rate routinely prints over 100%.

FIND (lines 66–75, the whole `track` function):
```javascript
function track(name, props){
  const data = Object.assign({ref: VISITOR_REF, page: location.pathname.split('/').pop() || 'index'}, props || {});
  try { if (window.umami && umami.track) umami.track(name, data); } catch(e){}
  if (EVENT_WEBHOOK){
    try {
      navigator.sendBeacon(EVENT_WEBHOOK,
        JSON.stringify({kind: 'event', name, ts: Date.now(), ...data}));
    } catch(e){}
  }
}
```

REPLACE WITH:
```javascript
function track(name, props){
  if (IS_BACKOFFICE) return;               /* the back office never appears in its own ledger */
  const data = Object.assign({ref: VISITOR_REF, page: location.pathname.split('/').pop() || 'index'}, props || {});
  try { if (window.umami && umami.track) umami.track(name, data); } catch(e){}
  if (EVENT_WEBHOOK){
    /* A STRING payload is sent as text/plain;charset=UTF-8, which is CORS-
       safelisted, so no OPTIONS preflight is sent. NEVER wrap this in a Blob
       with type application/json — that flips the request to CORS mode, and
       Apps Script answers OPTIONS with a bare 405, so the event vanishes. */
    const body = JSON.stringify({kind: 'event', t: WEBHOOK_KEY, name, ts: Date.now(), ...data});
    let queued = false;
    try { queued = !!(navigator.sendBeacon && navigator.sendBeacon(EVENT_WEBHOOK, body)); } catch(e){}
    if (!queued){
      /* beacon queue full, or blocked by a content blocker — same safelisted
         content type, and keepalive lets it outlive the navigation */
      try {
        fetch(EVENT_WEBHOOK, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'},
                              body, keepalive: true}).catch(() => {});
      } catch(e){}
    }
  }
}

/* One row per page load. Without this the dashboard has no denominator, and
   every percentage on it is measured against "people who already made
   contact" — which is how you get a conversion rate above 100%. */
track('pageview', {});
```

---

**Edit 4 of 4 — line 46.** Declare the write key and the back-office flag. (`EVENT_WEBHOOK` stays empty for now — Stage 5 fills it.)

FIND (line 46):
```javascript
const EVENT_WEBHOOK = '';
```

REPLACE WITH (put YOUR write key from Stage 0 in the middle line):
```javascript
const EVENT_WEBHOOK = '';
const WEBHOOK_KEY = 'aesir-w-7Q2vX9kR';   /* Stage 0 WRITE_KEY — public by design */

/* dashboard.html and admin.html load this file too. They are not visitor
   surfaces: no floating button, no page wipe, and above all no events. */
const IS_BACKOFFICE = /(dashboard|admin)\.html$/.test(location.pathname);
```

> Leave `ANALYTICS_ID` on line 45 as `''`. That one is Umami (optional, see the end of this document). Do not paste your Apps Script URL into it.

---

### 1B · `/Users/tom/Applications/bmw-specialist/index.html` — two edits

---

**Edit 1 of 2 — lines 1120–1123.** The content type here is already correct (`text/plain`, which dodges the preflight that Apps Script cannot answer — do not change it back). Two things are missing: an explicit `kind`, because the hardened `doPost` will refuse anything it can't identify, and any signal at all when the ledger leg fails. Right now `.catch(() => {})` means a failed webhook is invisible, which is exactly how a commission ledger silently under-counts.

FIND (lines 1120–1123):
```javascript
    if (BOOKING_WEBHOOK) fetch(BOOKING_WEBHOOK, {
      method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({source: 'aesir-website', ...booking})
    }).catch(() => {});
```

REPLACE WITH:
```javascript
    if (BOOKING_WEBHOOK) fetch(BOOKING_WEBHOOK, {
      method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({kind: 'booking', t: WEBHOOK_KEY, source: 'aesir-website', ...booking}),
      keepalive: true
    })
      .then(r => r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status)))
      .then(t => { if (String(t).trim() !== 'ok') return Promise.reject(new Error(String(t))); })
      .catch(err => {
        /* The slot IS in the diary — only the ledger/email leg failed. Say so
           out loud rather than silently under-invoicing. */
        console.error('[aesir] ledger webhook failed for ' + ref, err);
        track('ledger_webhook_failed', {booking_ref: ref});
      });
```

---

**Edit 2 of 2 — lines 1103–1114.** `saved === 'taken'` is unreachable: `dbPut` in `/Users/tom/Applications/bmw-specialist/js/cloud.js` line 34 returns `r.ok` (a boolean) or `false`, never the string `'taken'`. So the only double-booking guard is the optimistic check at line 1090, with a genuine last-writer-wins race behind it — and a lost booking is a lost invoice line, for a customer who was told they were booked.

FIND (lines 1103–1114 — the whole span from `const saved` to the closing brace of the `!saved` block):
```javascript
    const saved = await dbPut(DB);
    if (saved === 'taken'){
      DB = await dbGet(); renderTimes(); step();
      btn.textContent = 'That slot just went — pick another ↑';
      setTimeout(() => btn.textContent = 'Confirm booking →', 2400);
      return;
    }
    if (!saved){
      track('booking_failed', {svc: state.svc});
      fail('We couldn’t reach the diary just now, so this booking has NOT been saved. Call or WhatsApp and we’ll put you straight in.');
      return;
    }
```

REPLACE WITH:
```javascript
    const saved = await dbPut(DB);
    if (!saved){
      track('booking_failed', {svc: state.svc});
      fail('We couldn’t reach the diary just now, so this booking has NOT been saved. Call or WhatsApp and we’ll put you straight in.');
      return;
    }
    /* The store is last-writer-wins, so a PUT that reports ok can still have
       been overwritten by someone confirming the same second. Read it back and
       check our row survived before telling anyone they are booked. Matched on
       iso+time, not ref, because the public read path strips personal fields
       (js/cloud.js lines 13-16). */
    const after = await dbGet();
    if (!after.bookings.some(b => b.iso === iso && b.time === time)){
      DB = after; renderTimes(); step();
      track('booking_failed', {svc: state.svc, reason: 'overwritten'});
      btn.textContent = 'That slot just went — pick another ↑';
      setTimeout(() => btn.textContent = 'Confirm booking →', 2400);
      return;
    }
```

---

### 1C · `/Users/tom/Applications/bmw-specialist/dashboard.html` — four edits

---

**Edit 1 of 4 — lines 107 to 206 (the entire `<script>` block, from `<script>` through `</script>`).** Select from line 107 to line 206 inclusive and replace the lot. This single replacement fixes: the fake PIN, the wrong funnel denominator, conversion rates over 100%, pageviews burying the contact-clicks table, the "not connected" message that always blames the wrong constant, the missing cache-buster, a blank page during the fallback wait, and a latent temporal-dead-zone crash (`within` and `pct` were declared with `const` *below* the code that calls them).

REPLACE LINES 107–206 WITH:
```html
<script>
/* ============ CONFIG ============
   LEDGER_URL is the Apps Script /exec URL. It is public and that is fine:
   doGet refuses to answer without the ledger key, and the key is never written
   into any file that gets pushed — you type it once per browser session. */
const LEDGER_URL = '';

let KEY = sessionStorage.getItem('aesir_key') || '';
let DATA = {events: [], bookings: []}, DAYS = 30;

/* function declarations, not const arrows — they hoist, so render() is safe to
   call from anywhere including before this point in the file */
function pct(a, b){ return b ? Math.round(a / b * 100) + '%' : ''; }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function within(ts){ return (Date.now() - new Date(ts).getTime()) / 86400000 <= DAYS; }
function fmt(ts){
  const d = new Date(ts);
  return d.toLocaleDateString('en-GB', {day:'numeric', month:'short'}) + ' ' +
         d.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});
}

function setupMsg(msg){
  const box = document.getElementById('setup');
  box.style.display = 'block';
  box.querySelector('h3').textContent = 'Ledger not reading';
  box.querySelector('p').textContent = msg;
}

/* A plain cross-origin GET to /exec normally works — both hops of the Apps
   Script redirect send access-control-allow-origin: *. JSONP is only the
   fallback so a redirect quirk is never the thing you debug at 11pm.
   Keep this a plain fetch with NO custom headers: that is what keeps it a
   CORS-simple request. Adding Content-Type or Authorization here would trigger
   the OPTIONS preflight that Apps Script answers with a bare 405. */
function load(){
  const q = '?summary=1&key=' + encodeURIComponent(KEY) + '&_=' + Date.now();
  return fetch(LEDGER_URL + q, {cache: 'no-store'})
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' — is that /exec URL the current deployment?');
      const ct = r.headers.get('content-type') || '';
      if (!/json|javascript/i.test(ct)) throw new Error('the ledger returned HTML, not JSON — the script threw, or you edited it without publishing a new version');
      return r.json();
    })
    .catch(first => new Promise((resolve, reject) => {
      const cb = 'aesirLedger' + Date.now().toString(36);
      const t = setTimeout(() => { cleanup(); reject(first); }, 6000);
      function cleanup(){ clearTimeout(t); delete window[cb]; s.remove(); }
      window[cb] = d => { cleanup(); resolve(d); };
      const s = document.createElement('script');
      s.src = LEDGER_URL + q + '&callback=' + cb;
      s.onerror = () => { cleanup(); reject(first); };
      document.head.appendChild(s);
    }));
}

function render(){
  const ev = (DATA.events || []).filter(e => within(e.ts));
  const bk = (DATA.bookings || []).filter(b => within(b.ts));
  const n = name => ev.filter(e => e.name === name).length;
  /* the real denominator: one pageview row per page load (js/shared.js) */
  const visitors = new Set(ev.filter(e => e.name === 'pageview').map(e => e.ref).filter(Boolean)).size;
  const wa = n('whatsapp_click'), call = n('call_click');

  const steps = [
    ['Visitors', visitors, ''],
    ['Started booking', n('booking_started'), visitors ? pct(n('booking_started'), visitors) : ''],
    ['Booked online', bk.length, visitors ? pct(bk.length, visitors) : ''],
    ['WhatsApp taps', wa, visitors ? pct(wa, visitors) : ''],
    ['Call taps', call, visitors ? pct(call, visitors) : ''],
  ];
  const max = Math.max(1, ...steps.map(s => s[1]));
  document.getElementById('funnel').innerHTML = steps.map(([label, v, p]) =>
    `<div class="fcell"><b>${v}</b><span>${label}</span>${p ? `<i>${p}</i>` : ''}
     <div class="bar" style="width:${Math.round(v / max * 100)}%"></div></div>`).join('');

  /* distinct PEOPLE who made contact, not raw taps. One person who taps
     WhatsApp and then Call is one enquiry, and this can never exceed 100%. */
  const contactRefs = new Set([
    ...ev.filter(e => e.name === 'whatsapp_click' || e.name === 'call_click').map(e => e.ref),
    ...bk.map(b => b.visitor)
  ].filter(Boolean));
  document.getElementById('rate').textContent = visitors
    ? `${contactRefs.size} of ${visitors} visitors made contact — ${pct(contactRefs.size, visitors)}. ${wa} WhatsApp taps and ${call} call taps in total. Every WhatsApp message carries its visitor ref, so anything Neil receives tagged [web …] traces back to a row below.`
    : ((DATA.events || []).length
        ? 'Nothing in this date range — try a wider one.'
        : 'Connected to the ledger — no activity recorded yet. If you have just switched tracking on, this is what success looks like.');

  document.querySelector('#bookings tbody').innerHTML = bk.length ? bk.slice().reverse().map(b =>
    `<tr><td>${fmt(b.ts)}</td><td class="ref">${esc(b.ref)}</td><td class="ref">${esc(b.visitor || '—')}</td>
     <td><b>${esc(b.svc)}</b></td><td>${esc(b.day)} ${esc(b.time)}</td>
     <td>${esc(b.name)}<br><span class="muted">${esc(b.phone)}</span></td>
     <td>${esc([b.model, b.reg].filter(Boolean).join(' · ') || '—')}</td></tr>`).join('')
    : '<tr><td colspan="7" style="color:var(--dim)">No online bookings in this range.</td></tr>';

  /* pageviews are the denominator, not a contact — they would bury this table */
  const contactEv = ev.filter(e => e.name !== 'pageview');
  document.querySelector('#events tbody').innerHTML = contactEv.length ? contactEv.slice(-60).reverse().map(e =>
    `<tr><td>${fmt(e.ts)}</td>
     <td>${e.name === 'whatsapp_click' ? '<span class="tagged">WHATSAPP</span>' : esc(e.name.replace(/_/g,' '))}</td>
     <td class="ref">${esc(e.ref || '—')}</td><td>${esc(e.source || '—')}</td><td>${esc(e.page || '—')}</td></tr>`).join('')
    : '<tr><td colspan="5" style="color:var(--dim)">No contact clicks in this range.</td></tr>';
}

async function boot(){
  document.querySelectorAll('#range button').forEach(b => b.onclick = () => {
    document.querySelectorAll('#range button').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); DAYS = +b.dataset.days; render();
  });
  render();                                   /* paint the shell first — never a blank page */
  document.getElementById('rate').textContent = 'Reading the ledger…';

  if (!LEDGER_URL){
    setupMsg('LEDGER_URL at the top of the script in dashboard.html is still an empty string. Paste your Apps Script /exec URL between the quotes — see the setup document, stage 5.');
    render(); return;
  }
  try {
    DATA = await load();
    if (DATA && DATA.error){
      sessionStorage.removeItem('aesir_key');
      throw new Error('the ledger rejected that key — reload this page and type it again');
    }
    if (!DATA || !Array.isArray(DATA.events)) throw new Error('the ledger answered, but not with the expected {events, bookings} shape');
  } catch(err){
    DATA = {events: [], bookings: []};
    setupMsg('Could not read the ledger — ' + err.message +
      '. Next check: open the /exec URL with ?key=YOUR-READ-KEY in a private window. A Google sign-in page means "Who has access" is set to "Anyone with Google account" instead of "Anyone". An error page means the script threw — Apps Script → "Executions" shows why. And after ANY script edit: Deploy → Manage deployments → pencil → Version: New version.');
  }
  render();
}

/* --- gate runs LAST, so everything it calls is already defined ----------- */
const gate = document.getElementById('gate');
if (KEY){ gate.remove(); boot(); }
else {
  const keyBox = document.getElementById('keyBox');
  keyBox.focus();
  keyBox.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !keyBox.value.trim()) return;
    KEY = keyBox.value.trim();
    sessionStorage.setItem('aesir_key', KEY);
    gate.remove(); boot();
  });
}
</script>
```

---

**Edit 2 of 4 — lines 94 to 103 (the `<div class="setup">` block).** Its instructions currently blame `EVENT_WEBHOOK` and omit the re-deploy step.

FIND (lines 94–103):
```html
  <div class="setup" id="setup" style="display:none">
    <h3>Not connected yet</h3>
    <p>This page is reading from nothing because <code>EVENT_WEBHOOK</code> hasn't been set. Ten minutes fixes it:</p>
    <ol>
      <li>Follow <b>TRACKING.md</b> to deploy the Google Apps Script and get its <code>/exec</code> URL.</li>
      <li>Paste that URL into <code>LEDGER_URL</code> at the top of this file's script, into <code>EVENT_WEBHOOK</code> in <code>js/shared.js</code>, and into <code>BOOKING_WEBHOOK</code> in <code>index.html</code>.</li>
      <li>Push. Data starts arriving immediately and appears here.</li>
    </ol>
    <p class="muted">Nothing is recorded retrospectively — every day it's off is data you can't get back.</p>
  </div>
```

REPLACE WITH:
```html
  <div class="setup" id="setup" style="display:none">
    <h3>Ledger not reading</h3>
    <p>This page has nothing to read from yet.</p>
    <ol>
      <li>Follow <b>SETUP.md</b> to deploy the Google Apps Script and get its <code>/exec</code> URL.</li>
      <li>Paste that URL — <i>between the quotes that are already there</i> — into <code>LEDGER_URL</code> in this file, <code>EVENT_WEBHOOK</code> in <code>js/shared.js</code>, and <code>BOOKING_WEBHOOK</code> in <code>index.html</code>.</li>
      <li>After <i>any</i> edit to the Apps Script: Deploy → Manage deployments → pencil → Version: <b>New version</b> → Deploy. Saving in the editor alone changes nothing on the live <code>/exec</code> URL.</li>
    </ol>
    <p class="muted">Nothing is recorded retrospectively — every day it's off is data you can't get back.</p>
  </div>
```

---

**Edit 3 of 4 — line 77.** The ledger read is capped at the most recent 3000 rows per tab, so "All" is not literally all.

FIND (line 77):
```html
      <button data-days="9999">All</button>
```

REPLACE WITH:
```html
      <button data-days="9999">All (recent)</button>
```

---

**Edit 4 of 4 — lines 53 to 56.** Swap the four PIN boxes for a single key field.

FIND (lines 53–56):
```html
  <p>Enter PIN</p>
  <div class="pin-row" id="pinRow">
    <input inputmode="numeric" maxlength="1"><input inputmode="numeric" maxlength="1"><input inputmode="numeric" maxlength="1"><input inputmode="numeric" maxlength="1">
  </div>
```

REPLACE WITH:
```html
  <p>Ledger key — press Enter</p>
  <div class="pin-row">
    <input id="keyBox" type="password" autocomplete="off" spellcheck="false" style="width:min(340px,78vw);height:56px;font-size:15px;font-weight:500;letter-spacing:.06em">
  </div>
```

---

### 1D · `/Users/tom/Applications/bmw-specialist/privacy.html` — REQUIRED, not optional

The site currently states, truthfully, that there is no analytics on it. The moment you paste the webhook URL that stops being true, and the page becomes a false statement about data handling on a UK business site.

It is also **already slightly wrong today**: `js/shared.js` lines 49–57 write a persistent per-visitor identifier (`aesir_ref`, e.g. `W-4K7M`) to local storage on every page load, whether or not any sink is configured. That is a third use, and it is the one a visitor would actually care about. Fix both lines in the same commit as everything else.

**Edit 1 of 3 — line 146.**

FIND:
```html
        <p>It does use your browser's <b>local storage</b> for two strictly functional things: remembering the current state of the booking diary so the page still works if your connection drops, and remembering that the introduction animation has already played so you don't sit through it twice. These are necessary for features you asked for, and they stay on your own device. Clearing your browser data removes them.</p>
```

REPLACE WITH:
```html
        <p>It does use your browser's <b>local storage</b> for three strictly functional things: remembering the current state of the booking diary so the page still works if your connection drops; remembering that the introduction animation has already played so you don't sit through it twice; and holding a short random reference such as &ldquo;W-4K7M&rdquo; so that if you message us from this website we can tell the enquiry came from here rather than somewhere else. That reference is not linked to your name unless you choose to contact us. All three stay on your own device, and clearing your browser data removes them.</p>
```

**Edit 2 of 3 — line 145.**

FIND:
```html
        <p>This site does not use advertising or tracking cookies, and there is no analytics or advertising pixel on it.</p>
```

REPLACE WITH:
```html
        <p>This site does not use advertising or tracking cookies, and there is no advertising pixel on it. It does record anonymous usage events — pages viewed and buttons pressed — against the random reference described below, so we can tell whether the website is working. This is not advertising tracking, no cookies are used for it, and it is never linked to your name unless you contact us, at which point the reference in your message lets us connect it to your booking.</p>
```

**Edit 3 of 3 — line 167.**

FIND:
```html
        <p class="updated" style="margin-top:30px">Last updated 6 August 2026</p>
```

REPLACE WITH (use the date you actually do this):
```html
        <p class="updated" style="margin-top:30px">Last updated 8 August 2026</p>
```

---

### ✅ SMOKE TEST 1 — the site still runs (2 minutes)

The single most dangerous thing you can do in Stage 1 is break a quote in `js/shared.js`. That file is loaded by every page, so a syntax error takes down the nav, the WhatsApp button, the page transitions and the booking widget — not just tracking.

1. Open `/Users/tom/Applications/bmw-specialist/index.html` in your browser (double-click it, or drag it into a tab).
2. Press **F12** → **Console** tab.
3. **What you should see:** no red errors. Type each of these and press Enter:

| Type this | Expected right now |
|---|---|
| `EVENT_WEBHOOK` | `''` (empty string — correct, you haven't pasted it yet) |
| `WEBHOOK_KEY` | your Stage 0 write key |
| `IS_BACKOFFICE` | `false` |
| `BOOKING_WEBHOOK` | `''` |

4. **If any of them says `Uncaught ReferenceError: … is not defined`,** you have a syntax error above it in `js/shared.js`. The Console's first red line gives the line number. Fix it before going on.
5. The booking widget should still respond: click a service chip, a day, a time. The floating green WhatsApp button should be bottom-right.
6. Now open `/Users/tom/Applications/bmw-specialist/dashboard.html`. **You should see** a single password box saying "Ledger key — press Enter", **no** floating WhatsApp button, and **no** colour-wipe animation. Type anything and press Enter — you should land on the stats page with the amber "Ledger not reading" panel telling you `LEDGER_URL` is empty. That is correct.

---

## Stage 2 — The Google Sheet (2 minutes)

1. Go to **https://sheets.new** — a blank spreadsheet opens.
2. Click **"Untitled spreadsheet"** (top left) and rename it `Aesir ledger`.
3. **You do not need to create or rename any tabs.** The script builds `Events` and `Bookings` itself, with headers, the first time it needs each one. (A hand-typed tab with a trailing space or a lower-case `e` is invisible in the tab strip and silently swallows every booking — so the script no longer trusts you to get it right.)
4. Copy the **SHEET_ID** out of the address bar. The URL looks like this:

```
https://docs.google.com/spreadsheets/d/1QPvcIcmNU1QbZYRF__rrjIC4C1F0Ir3KI-YtIRCCWws/edit?gid=0#gid=0
                                       └───────────── this bit only, ~44 chars ─────────────┘
```

   It is the long random string **between `/d/` and the next `/`**. Do **not** include the slashes, do **not** include `/edit`, and do **not** include `?gid=0#gid=0` — that last part identifies a tab, not the file. Paste it somewhere temporary.

5. Optional but 20 seconds: **"File"** → **"Settings"** → **"Time zone"** → **"(GMT+00:00) United Kingdom"** → **"Save settings"**. This no longer affects correctness (column A is written as a UTC text string on purpose) but it makes anything else you add to the sheet read correctly.

### ✅ SMOKE TEST 2

Your browser tab is titled `Aesir ledger`, and you have a ~44-character string in your clipboard or notes that contains **no** slashes and **no** `?` or `#`.

---

## Stage 3 — The Apps Script (8 minutes)

1. In the Sheet, click **"Extensions"** → **"Apps Script"**. A new tab opens with a file called `Code.gs` containing an empty `myFunction()`.
2. Click into the code area, select everything (Cmd+A) and delete it.
3. Paste this **entire** script:

```javascript
/* =========================================================================
   ÆSIR AUTOMOTIVE — commission ledger, booking notifications, dashboard feed
   ========================================================================= */

const SHEET_ID  = 'PASTE-YOUR-SHEET-ID';          // the bit between /d/ and /edit
const NOTIFY    = ['thomasrgriffiths08@gmail.com']; // who gets the booking email
const WRITE_KEY = 'aesir-w-7Q2vX9kR';             // Stage 0 WRITE_KEY — public, anti-scanner only
const READ_KEY  = 'aesir-r-4mZp8LtQ2w';           // Stage 0 READ_KEY — never goes in a pushed file

/* Column layout. Each tab is created with these headers the first time it is
   needed, so a missing or mistyped tab can never silently swallow a row. */
const HEAD = {
  Events:   ['Received (UTC)','Event','Visitor ref','Page','Source','Service','Booking ref'],
  Bookings: ['Received (UTC)','Booking ref','Visitor ref','Service','Day','Date (ISO)',
             'Time','Name','Phone','Reg','Model','Source']
};

function sheet(name){
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(name);
  if (!sh){
    sh = ss.insertSheet(name);
    sh.appendRow(HEAD[name]);
    sh.setFrozenRows(1);
  }
  return sh;
}

const reply = s => ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT);

/* --- writes ------------------------------------------------------------- */
function doPost(e){
  try {
    if (!e || !e.postData || !e.postData.contents) return reply('no body');
    const d = JSON.parse(e.postData.contents);
    if (d.t !== WRITE_KEY) return reply('bad key');

    /* An ISO-8601 UTC STRING, never a live Date object. A cell only comes back
       from getValues() as a Date while Sheets still thinks it is one — format
       the column as text, or export and re-import the sheet, and those rows
       would silently disappear from the ledger with no error anywhere. */
    const now = new Date().toISOString();

    if (d.kind === 'event'){
      sheet('Events').appendRow([
        now,
        String(d.name        || '').slice(0, 60),
        String(d.ref         || '').slice(0, 20),
        String(d.page        || '').slice(0, 80),
        String(d.source      || '').slice(0, 40),
        String(d.svc         || '').slice(0, 60),
        String(d.booking_ref || '').slice(0, 20)
      ]);
      return reply('ok');
    }

    if (d.kind === 'booking'){
      /* two people confirming in the same second must not interleave appends */
      const lock = LockService.getScriptLock();
      lock.waitLock(20000);
      try {
        sheet('Bookings').appendRow([
          now, d.ref || '', d.visitor || '', d.svc || '', d.day || '', d.iso || '',
          d.time || '', d.name || '', d.phone || '', d.reg || '', d.model || '', d.source || ''
        ]);
      } finally { lock.releaseLock(); }

      /* The ROW is the commission record; the email is only the nudge. The row
         is written first and the mail is wrapped, so hitting the Gmail daily
         quota can never cost you a ledger row. */
      try {
        MailApp.sendEmail(NOTIFY.join(','),
          'BOOKING ' + d.ref + ' — ' + d.day + ' ' + d.time + ' — ' + d.svc,
          d.name + ' · ' + d.phone + (d.model ? ' · ' + d.model : '') +
          (d.reg ? ' · ' + d.reg : '') + '\nVisitor ref: ' + (d.visitor || '—') +
          '\n\nIt is already in the live diary. This email is the notification.');
      } catch (mailErr){ console.error('mail failed: ' + mailErr); }
      return reply('ok');
    }

    return reply('ignored');          // unknown kind never becomes a ledger row
  } catch (err){
    console.error(err);
    return reply('error');            // never throw a 500 — a beacon cannot retry
  }
}

/* --- reads (feeds dashboard.html) ---------------------------------------
   /exec?summary=1&key=READ_KEY   — ?summary=1 is a marker for you, not a
   switch; doGet always returns the same shape. &callback=fn returns JSONP,
   which the dashboard uses as a fallback. --------------------------------- */
function doGet(e){
  const p = (e && e.parameter) || {};
  const cb = p.callback;
  const out = s => cb
    ? ContentService.createTextOutput(cb + '(' + s + ')').setMimeType(ContentService.MimeType.JAVASCRIPT)
    : ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);

  if (p.key !== READ_KEY) return out(JSON.stringify({error: 'bad key'}));

  const MAX_ROWS = 3000;              // bounds the payload; the Sheet stays the full archive

  const read = (name, cols) => {
    const sh = sheet(name);
    const last = sh.getLastRow();
    if (last < 2) return [];          // header only, or brand new → [] not a crash
    const width = Math.min(cols, sh.getMaxColumns());
    const start = Math.max(2, last - MAX_ROWS + 1);
    return sh.getRange(start, 1, last - start + 1, width).getValues()
      /* any legacy row still holding a real Date is normalised to a string */
      .map(r => r.map(v => v instanceof Date ? v.toISOString() : v))
      /* a validity test, NOT a type test — a text-formatted timestamp counts */
      .filter(r => r[0] && !isNaN(Date.parse(r[0])));
  };

  const ev = read('Events', 7).map(r => ({
    ts: r[0], name: r[1], ref: r[2], page: r[3], source: r[4], svc: r[5], booking_ref: r[6]
  }));

  /* The dashboard is a public HTML file. Full names and mobile numbers stay in
     the Sheet, behind your Google account — the browser only ever sees enough
     to invoice from and to match a WhatsApp message to a row. */
  const bk = read('Bookings', 12).map(r => ({
    ts: r[0], ref: r[1], visitor: r[2], svc: r[3], day: r[4], iso: r[5], time: r[6],
    name:  String(r[7] || '').split(' ')[0],
    phone: r[8] ? '···' + String(r[8]).slice(-4) : '',
    reg: r[9], model: r[10]
  }));

  return out(JSON.stringify({events: ev, bookings: bk}));
}

/* Run this from the editor before deploying anything. It proves SHEET_ID is
   right and the permissions are granted, while errors are still visible. */
function smokeTest(){
  Logger.log('Events rows: ' + sheet('Events').getLastRow());
  Logger.log('Bookings rows: ' + sheet('Bookings').getLastRow());
  Logger.log('OK — SHEET_ID resolves and both tabs exist.');
}
```

4. **Replace the four constants at the top.** This is the step people skip, and skipping it is invisible:
   - `SHEET_ID` — the string from Stage 2.
   - `NOTIFY` — your own email. **Leave Neil out until Stage 7 passes** — you don't want him getting emails about test bookings. `you@example.com` is a reserved domain that hard-bounces, so leaving the placeholder means no email ever arrives.
   - `WRITE_KEY` — your Stage 0 write key, exactly as it appears in `js/shared.js`.
   - `READ_KEY` — your Stage 0 read key.
5. Click the project name (**"Untitled project"**, top left) and rename it `Aesir ledger`. This name appears on the authorisation screen, so it is worth doing.
6. Press **Cmd+S** to save.
7. Optional, 20 seconds: click the **gear icon** ("Project Settings") in the left sidebar and tick **"Show 'appsscript.json' manifest file in editor"**, then set `"timeZone": "Europe/London"`. Not required — timestamps are written as UTC strings — but it makes `Logger` output readable.
8. In the toolbar, set the function dropdown (it currently says `doPost`) to **`smokeTest`**, then click **"Run"**.

### The scary screen — expected, not an error

The first Run triggers Google's authorisation flow, because this script needs Sheets and Gmail access:

1. A dialog appears: click **"Review permissions"**.
2. An account chooser opens in a popup — pick the Google account that owns the Sheet. (If nothing happens, your browser blocked the popup. Allow it and click again.)
3. You get a full-page warning: **"Google hasn't verified this app"**. This is normal. It means *you* wrote this script and never paid Google to review it. **Do not click "Back to safety".**
4. Click **"Advanced"** — it is small, bottom-left of that panel.
5. Click the link that appears: **"Go to Aesir ledger (unsafe)"**. "unsafe" here means "unreviewed", not "malicious".
6. A permission list appears — *"See, edit, create, and delete all your Google Sheets spreadsheets"* and *"Send email as you"*. Since January 2025 this may show individual tick-boxes with a **"Select all"** control instead of a single button; if so, tick everything.
7. Click **"Continue"** / **"Allow"**.

You do this once per Google account. It reappears only if you later add code needing a new permission.

### ✅ SMOKE TEST 3

After Run finishes, look at the **"Execution log"** panel at the bottom of the editor.

- ✅ **You should see:** `Events rows: 1`, `Bookings rows: 1`, `OK — SHEET_ID resolves and both tabs exist.`, and `Execution completed`. Switch to the Sheet tab — **two new tabs, `Events` and `Bookings`, now exist with bold frozen header rows.** That is the script proving it can reach your spreadsheet.
- ❌ `Exception: Unexpected error while getting the method or property openById` or `… is missing (perhaps it was deleted?)` → `SHEET_ID` is wrong. You almost certainly pasted the whole URL, or included `/edit` or `?gid=0`. Go back to Stage 2 step 4.
- ❌ `You do not have permission to call MailApp.sendEmail` → the authorisation didn't complete. Run again and work through the consent screens.

> Do **not** try to Run `doPost` from the editor. It needs a real HTTP request body and will always throw `Cannot read properties of undefined (reading 'postData')`. That is not a bug.

---

## Stage 4 — Deploy (6 minutes)

1. Click **"Deploy"** (blue button, top right) → **"New deployment"**.
2. Next to **"Select type"**, click the **gear icon** (tooltip: "Enable deployment types") and choose **"Web app"**.
3. Fill in **"Deployment configuration"**:
   - **"Description"**: `Aesir ledger v1` — free text, for your own reference.
   - **"Execute as"**: **"Me (your@gmail.com)"** — **not** "User accessing the web app". This is what lets the script write to your Sheet and send mail on your behalf.
   - **"Who has access"**: **"Anyone"** — *the bare word, on its own.*

> ⚠️ **This is the highest-consequence click in the whole document.** There is a second option in that dropdown, sitting immediately above it, reading **"Anyone with Google account"**. Do **not** pick that one. It forces every visitor to be signed in to Google, so every event and every booking from the public site is silently rejected — **and it will still work perfectly for you**, because you are signed in. You would discover it weeks later, with an empty ledger. Older tutorials call the correct option "Anyone, even anonymous"; Google shortened the label.

4. Click **"Deploy"**.
5. The dialog becomes **"Deployment successfully updated"** and shows a **"Deployment ID"** and, below it, **"Web app"** with a **"URL"** and a **"Copy"** button. Click **"Copy"**, then **"Done"**.

Your URL ends in **`/exec`** and looks like:
```
https://script.google.com/macros/s/AKfycb................/exec
```

> ⚠️ **Never use the `/dev` URL.** "Deploy" → **"Test deployments"** gives you a URL ending `/dev`. It is tempting because it always runs your latest saved code with no re-deploy. But it is only reachable by accounts with edit access on the script. It works flawlessly in your browser and returns a Google sign-in page to every real customer — so the ledger stays empty and nothing tells you why. **Before you push, check all three pasted constants end in `/exec`.**

> To find the URL again later: **"Deploy"** → **"Manage deployments"**.

> On a Google Workspace account rather than a personal Gmail, if **"Anyone"** is missing or greyed out, an admin policy has disabled public web apps. Use a personal Gmail account for this script.

### ✅ SMOKE TEST 4 — the deployment is public and returns JSON (1 minute)

1. Paste this into a browser address bar (your `/exec` URL, then your READ_KEY):
```
https://script.google.com/macros/s/YOUR-ID/exec?summary=1&key=YOUR-READ-KEY
```
   ✅ **You should see:** `{"events":[],"bookings":[]}` — plain text, nothing else. This is exactly what "working, but no data yet" looks like.

2. Now try it **without** the key:
```
https://script.google.com/macros/s/YOUR-ID/exec?summary=1
```
   ✅ **You should see:** `{"error":"bad key"}`. That is your customers' data being refused to the internet.

3. Now open the **first** URL again in a **private / incognito window**. ✅ **You should see the same `{"events":[],"bookings":[]}`** — this proves it works for someone who is not signed in as you. **This is the single most valuable test in this document**, because it is the only one that distinguishes "Anyone" from "Anyone with Google account".

- ❌ **A Google sign-in page** → either you copied the `/dev` URL, or "Who has access" is "Anyone with Google account". Fix: "Deploy" → "Manage deployments" → pencil icon → correct it → "Deploy".
- ❌ **A grey "Script function not found: doGet"** page → the deployment is pinned to a version from before you pasted the code. See Stage 9.

---

## Stage 5 — Paste the URL into three files (5 minutes)

Paste the same `/exec` URL into all three constants. **In each file, use Find (Cmd+F) on the constant name** — line numbers shift as you edit, names don't.

> ⚠️ **Paste the URL BETWEEN the two quote marks that are already there.** Do not replace the whole line. Do not add a trailing slash. Getting this wrong in `js/shared.js` is a syntax error that takes the whole website's JavaScript down — nav, WhatsApp button, booking widget.

| Find | In this file | ~line | Should end up looking like |
|---|---|---|---|
| `EVENT_WEBHOOK` | `/Users/tom/Applications/bmw-specialist/js/shared.js` | 46 | `const EVENT_WEBHOOK = 'https://script.google.com/macros/s/AKfycb…/exec';` |
| `BOOKING_WEBHOOK` | `/Users/tom/Applications/bmw-specialist/index.html` | 947 | `const BOOKING_WEBHOOK = 'https://script.google.com/macros/s/AKfycb…/exec';` |
| `LEDGER_URL` | `/Users/tom/Applications/bmw-specialist/dashboard.html` | ~112 | `const LEDGER_URL = 'https://script.google.com/macros/s/AKfycb…/exec';` |

> **Careful:** in `js/shared.js`, `ANALYTICS_ID` is on the line **directly above** `EVENT_WEBHOOK` (line 45). That one is for Umami and must stay `''` unless you are using it.
>
> **Do not** put `READ_KEY` in any of these files. The dashboard asks you to type it.

### ✅ SMOKE TEST 5

Run this in your terminal:

```bash
grep -n "EVENT_WEBHOOK\s*=\|WEBHOOK_KEY\s*=\|ANALYTICS_ID\s*=" /Users/tom/Applications/bmw-specialist/js/shared.js
grep -n "BOOKING_WEBHOOK\s*=" /Users/tom/Applications/bmw-specialist/index.html
grep -n "LEDGER_URL\s*=" /Users/tom/Applications/bmw-specialist/dashboard.html
```

✅ **You should see** three URLs, all ending `/exec';`, plus `ANALYTICS_ID = '';` and your `WEBHOOK_KEY`. No `/dev`. No `READ_KEY` anywhere.

Then reload `/Users/tom/Applications/bmw-specialist/index.html` in the browser with the Console open. ✅ **No red errors**, and typing `EVENT_WEBHOOK` prints your URL.

---

## Stage 6 — Commit and push (5 minutes, including the wait)

1. Add a one-line pointer at the top of `/Users/tom/Applications/bmw-specialist/TRACKING.md` so nobody follows the old checklist. Insert after line 4:

```markdown
> **Setup instructions live in `SETUP.md`.** The numbered checklist in "Sink 1"
> below is superseded — it omits the SHEET_ID/NOTIFY replacement, the re-deploy
> step, and the "Anyone" vs "Anyone with Google account" trap. The explanatory
> sections (the honest limit, the weekly commission routine) are still current.
```

2. Commit and push:

```bash
cd /Users/tom/Applications/bmw-specialist
git add -A
git commit -m "Wire the commission ledger: pageview denominator, back-office guard, keyed Apps Script, honest privacy notice"
git push origin main
```

3. **Wait about 60–90 seconds.** GitHub Pages rebuilds after the push; it is not instant. https://github.com/thomasrgriffiths08-blip/aesir-automotive/actions shows a green tick when the deploy is live.

### ✅ SMOKE TEST 6 — the browser is actually running the new file (2 minutes)

GitHub Pages serves `js/shared.js` with a ten-minute browser cache. A normal reload will happily hand you the old file with `EVENT_WEBHOOK = ''`, and you will spend those ten minutes debugging Apps Script for no reason.

1. Open https://thomasrgriffiths08-blip.github.io/aesir-automotive/
2. **F12** → **Console** → type `EVENT_WEBHOOK` and press Enter.

- ✅ **It prints your `/exec` URL.** Good.
- ❌ **It prints `''`** → you are on the cached file. Open a **private/incognito window** and check again. If incognito shows the URL, it was just cache; hard-reload (Cmd+Shift+R) your normal window.
- ❌ **`Uncaught ReferenceError: EVENT_WEBHOOK is not defined`** → you broke the quotes in `js/shared.js` and the whole site's JavaScript is down. Scroll up in the Console for the real error and its line number.

3. Same trick per page: `BOOKING_WEBHOOK` on the home page, `LEDGER_URL` on the dashboard page. All three are top-level `const`s, so typing the bare name works.

---

## Stage 7 — The live end-to-end test (12 minutes)

### 7A — Events (2 minutes)

1. On https://thomasrgriffiths08-blip.github.io/aesir-automotive/, just **reload the page**.
2. Switch to the Sheet, `Events` tab.

✅ **Within about 3 seconds a row appears:** an ISO timestamp like `2026-08-08T09:12:33.000Z`, event `pageview`, a visitor ref like `W-4K7M`, page `index`. Column A is deliberately a **text string**, not a Sheets date — that is what stops rows silently vanishing if the column ever gets reformatted.

3. Now tap the floating WhatsApp button. You can close WhatsApp immediately — the event fires on the tap, not on send.

✅ **A second row appears:** `whatsapp_click`, the same `W-` ref, page `index`, source `fab`.

- ❌ **No row at all** → open the Apps Script tab → **"Executions"** in the left sidebar (clock icon). A row there marked **"Failed"** shows the real error. **No** row there at all means the request never arrived — go back to Smoke Test 6.

### 7B — Bookings (8 minutes)

> ⚠️ **There is no test mode. A booking made on the live site is a real booking.** It writes into the shared diary that every visitor reads (`/Users/tom/Applications/bmw-specialist/js/cloud.js` line 4), so that slot is genuinely unavailable to real customers from that moment, and it emails everyone in `NOTIFY`.
>
> So: **pick a slot several weeks out**, use **your own** name and mobile, and confirm `NOTIFY` still contains only your address.

1. Make the booking on the live site.
2. Check **three** places:

| Where | ✅ What you should see |
|---|---|
| Sheet → `Bookings` tab | One row: ISO timestamp, an `AES-…` booking ref, your `W-…` visitor ref, the service, the day label, the ISO date, time, your name, your number, reg, model, `aesir-website` |
| Sheet → `Events` tab | A `booking_started` row and a `booking_confirmed` row, the latter carrying the `AES-…` ref in the "Booking ref" column |
| Your inbox | Subject `BOOKING AES-… — Mon 12 Oct 14:00 — …`, body with name, phone, car and visitor ref |

3. **Cancel the test booking.** Open https://thomasrgriffiths08-blip.github.io/aesir-automotive/admin.html, find your booking, click **Cancel**. If you skip this, that slot shows as taken to real customers forever.
4. **Now** add Neil's address to `NOTIFY` in the Apps Script — and re-deploy (Stage 9). Not before.

- ❌ **Row appears but no email** → check spam. Then Apps Script → "Executions" for a `mail failed:` log line. `NOTIFY` still saying `you@example.com` is the usual cause — example.com is a reserved domain and bounces.
- ❌ **No row, but the site showed a confirmation** → open the site's Console. With Stage 1B's edit in place you will now see a red `[aesir] ledger webhook failed for AES-…` with the reason, instead of the silence you'd have got before.

---

## Stage 8 — The dashboard (3 minutes)

1. Open **https://thomasrgriffiths08-blip.github.io/aesir-automotive/dashboard.html**

   > Note the `/aesir-automotive/` in the path. This is a GitHub *project* site, so a bare `/dashboard.html` is a 404. Bookmark the full URL.

2. Type your **READ_KEY** (Stage 0) and press **Enter**.

### ✅ SMOKE TEST 8

✅ **You should see:**
- A funnel with **Visitors: 1** (or however many page loads you generated), **Booked online: 1**, **WhatsApp taps: 1**.
- A sentence underneath reading something like *"1 of 1 visitors made contact — 100%. 1 WhatsApp taps and 0 call taps in total…"* — a real percentage against a real denominator, which can never exceed 100%.
- A **Bookings** row showing your first name only and your phone as `···8177`. That is deliberate: the full details stay in the Sheet, behind your Google account. The `AES-` ref and `W-` visitor ref — the parts the commission argument actually rests on — are shown in full.
- A **Contact clicks** table showing the WhatsApp tap. **No `pageview` rows** — they are the denominator, not a contact, and they would bury this table.
- **No floating WhatsApp button on this page.** If you see one, the `IS_BACKOFFICE` guard didn't take.

❌ **Amber "Ledger not reading" panel** → read the message; it now names the actual fault. Then go to Troubleshooting.

---

## Stage 9 — After ANY edit to the Apps Script (reference — read it now, use it later)

**This is the step everyone misses, and it will cost you an evening if you don't know it.**

Saving the script does **not** change what your `/exec` URL serves. That URL is pinned to a *version* — a frozen snapshot. Editing the code does not create one. You will fix a genuine bug, save, reload the dashboard, see the identical failure, and conclude the whole system is broken.

Every time you change a single character:

1. **Cmd+S** to save.
2. **"Deploy"** (blue, top right) → **"Manage deployments"**.
3. Click the row for your deployment, then the **pencil / Edit icon** at the top right of that panel.
4. Open the **"Version"** dropdown — it currently reads `1`. Change it to **"New version"**.
5. Click **"Deploy"**, then **"Done"**.

The `/exec` URL does **not** change, so you never re-paste it into the three files.

> ⚠️ If you use "Deploy" → **"New deployment"** instead, you get a **different** `/exec` URL, and the site keeps posting to the old, now-stale one — which still returns `200` and still looks fine.

**Self-test:** change `'OK — SHEET_ID resolves'` in `smokeTest` to something else, re-deploy as above, and reload the dashboard. If nothing changed, you created a version but didn't point the deployment at it — repeat step 4.

---

## Troubleshooting, by symptom

### "The dashboard shows all zeros"
- **The date range.** Default is 30 days. Click **"All (recent)"**.
- **You are looking at real data and there isn't any yet.** The sentence under the funnel distinguishes these: *"Connected to the ledger — no activity recorded yet"* means the read worked and the sheet is empty. That is Stage 4's success state, not a fault.
- **You're on a back-office page and expecting your own visits to count.** They deliberately don't — `IS_BACKOFFICE` blocks all events from `dashboard.html` and `admin.html`, because your own clicks polluting the ledger you invoice from is worse than missing them.

### "The dashboard says 'Ledger not reading'"
The message now names the fault. In order of likelihood:
- *"the ledger rejected that key"* → you typed the READ_KEY wrong, or it doesn't match the Apps Script. The key is cleared automatically; reload and retype.
- *"HTTP 302/404"* or *"Failed to fetch"* → the `/exec` URL is wrong or stale. Verify with Smoke Test 4.
- *"the ledger returned HTML, not JSON"* → the script threw, **or you edited it without publishing a new version** (Stage 9). Check Apps Script → **"Executions"**.
- *"LEDGER_URL … is still an empty string"* → you pasted into the wrong file, or you're on a cached copy (Smoke Test 6).

### "Bookings appear in the Sheet but events don't"
Different transports, so they fail independently. Bookings use `fetch`; events use `navigator.sendBeacon`.
- **A content blocker / privacy extension** is eating the beacon. Test in a private window with extensions off. (The Stage 1A edit adds a `fetch` fallback for exactly this, but some blockers kill both.)
- **You are testing from `dashboard.html` or `admin.html`** — events are suppressed there by design.
- **`WEBHOOK_KEY` in `js/shared.js` does not match `WRITE_KEY` in the Apps Script.** The script replies `bad key` and drops the row. Compare them character by character — this is the most common cause.

### "Events appear but bookings don't"
- **`WEBHOOK_KEY` mismatch again**, or the `kind: 'booking'` from Stage 1B Edit 1 didn't get saved. Without an explicit `kind`, the hardened `doPost` returns `ignored` and writes nothing. Check the browser Console during a test booking — you'll see the `[aesir] ledger webhook failed` line.
- **Someone reverted the content type to `application/json`.** Confirm `/Users/tom/Applications/bmw-specialist/index.html` line ~1121 still says `'text/plain;charset=utf-8'`. `application/json` is not CORS-safelisted, so the browser sends an `OPTIONS` preflight first; Apps Script web apps answer `OPTIONS` with a bare `405` and no CORS headers, so the POST is never sent. There is no fix for that on the Apps Script side — `TextOutput` has no `setHeaders` method, so every "just add a `doOptions()`" answer you'll find online throws `TypeError`. `text/plain` is the working approach.

### "No email arrived"
1. Check spam.
2. `NOTIFY` still says `you@example.com` — a reserved domain that hard-bounces.
3. Apps Script → **"Executions"** → look for `mail failed:`. Most likely the daily quota (see Limits below).
4. **Note the row is still there.** The append runs before the mail, and the mail is wrapped in `try/catch` — losing the email never loses the commission record.

### "Everything worked for me but nothing comes in from real customers"
Almost certainly one of exactly two things:
- **"Who has access" is "Anyone with Google account"**, not **"Anyone"**. Every anonymous visitor gets a sign-in page. Fix: "Deploy" → "Manage deployments" → pencil → change → "Deploy". **Confirm with a private window** (Smoke Test 4 step 3).
- **You pasted the `/dev` URL** instead of `/exec`. Same symptom. `grep -n "script.google.com" /Users/tom/Applications/bmw-specialist/js/shared.js /Users/tom/Applications/bmw-specialist/index.html /Users/tom/Applications/bmw-specialist/dashboard.html` — all three must end `/exec`.

### "Rows are in the Sheet but the dashboard shows nothing"
- **`MAX_ROWS`.** The read is capped at the most recent 3000 rows per tab. The Sheet is the full archive; the dashboard is the read-out. For a true all-time total, sum the `Bookings` tab in the Sheet.
- **Column A was reformatted.** If someone formatted it as a date or pasted over it, `Date.parse` may fail and those rows are filtered out. Column A must contain ISO strings like `2026-08-08T09:12:33.000Z`.

### "The site is broken — no nav, no WhatsApp button, booking widget dead"
A JavaScript syntax error in `js/shared.js`, which every page loads. F12 → Console → the first red line names the file and line. 99% of the time it's a quote mark lost while pasting the `/exec` URL.

### "I fixed the script and nothing changed"
Stage 9. You saved but didn't publish a new version.

### "The percentages are over 100%"
The Stage 1A Edit 3 (`track('pageview', {})`) or the Stage 1C dashboard replacement didn't take. Without a pageview event, "Visitors" counts only people who *already made contact*, so one person who taps WhatsApp twice and then calls renders as "3 enquiries from 1 visitors — 300%".

### "My own clicks are showing in the ledger"
The `IS_BACKOFFICE` guard didn't take. Check `/Users/tom/Applications/bmw-specialist/js/shared.js` — it must be declared near line 48 and referenced at the top of `track()` and at the top of both IIFEs (page wipe, WhatsApp button).

### "'Google hasn't verified this app'"
Expected. See Stage 3. It means you wrote the script yourself and never paid Google to review it. "Advanced" → "Go to Aesir ledger (unsafe)" → "Allow".

### Cross-referencing an older tutorial?
Two things changed recently and older screenshots are wrong. Since January 2025 the permission screen may show individual tick-boxes with a **"Select all"** control instead of a single **"Allow"** button. Since January 2026 the old Rhino runtime is dead — any script you create today is V8, so there is nothing to change. And **"Anyone, even anonymous"** in old screenshots is now just **"Anyone"**.

---

## Limits (none of these will bother a one-man garage)

| Limit | Personal gmail.com | Workspace |
|---|---|---|
| **Email recipients per day** | **100** | **1,500** |
| Script runtime | 6 min / execution | 6 min |
| Simultaneous executions | 30 | 30 |
| UrlFetch calls/day (script calling out — we make none) | 20,000 | 100,000 |

Only the first row matters. With two addresses in `NOTIFY` that's 2 recipients per booking, so roughly 50 bookings a day before mail stops. Because the deployment runs as **"Execute as: Me"**, every visitor's request spends *your* quota, not theirs. Inbound `doGet`/`doPost` hits are not themselves rate-limited.

---

## What this system can and cannot prove

**It can prove:** every online booking, timestamped, with a `W-` visitor ref and an `AES-` booking ref. Every WhatsApp tap and call tap with the visitor ref behind it. And — the commercially important one — **every WhatsApp message that reaches Neil's phone carries `[web W-4K7M]` in its text.** A job that starts with a `[web …]` message is yours beyond argument.

**It cannot prove:** whether someone actually pressed *send* inside WhatsApp. The `wa.me` link opens WhatsApp with the message prefilled and the site is out of the picture from that moment. Click count versus arrived-ref count is your send-through rate, measured at the only two points that can be measured.

**Weekly routine:** open the `Bookings` tab; ask Neil to search WhatsApp for `[web` (thirty seconds); note each against its ref; sheet total × your rate = the invoice.

---

## Optional: Umami (5 minutes, skip if the spreadsheet is enough)

Nicer graphs, no consent banner (cookieless). Free tier at **https://umami.is** — create a website, copy the website id, paste it into `ANALYTICS_ID` at line 45 of `/Users/tom/Applications/bmw-specialist/js/shared.js`. Every event above appears there too, with its properties. The privacy wording from Stage 1D already covers it.

---

## Final checklist

**Stage 0 — decisions**
- [ ] WRITE_KEY chosen and saved in the password manager
- [ ] READ_KEY chosen, different, ≥16 chars, saved in the password manager

**Stage 1 — code**
- [ ] `js/shared.js` — WhatsApp-button IIFE guarded with `IS_BACKOFFICE`
- [ ] `js/shared.js` — page-wipe IIFE guarded with `IS_BACKOFFICE`
- [ ] `js/shared.js` — `track()` replaced: guard + `WEBHOOK_KEY` + beacon fallback
- [ ] `js/shared.js` — **`track('pageview', {})` added** (the funnel denominator)
- [ ] `js/shared.js` — `WEBHOOK_KEY` and `IS_BACKOFFICE` declared after line 46
- [ ] `index.html` — booking POST sends `kind: 'booking'` + `t: WEBHOOK_KEY`, and logs failures
- [ ] `index.html` — dead `saved === 'taken'` branch replaced with a read-back check
- [ ] `dashboard.html` — whole `<script>` block replaced
- [ ] `dashboard.html` — setup panel text replaced
- [ ] `dashboard.html` — "All" → "All (recent)"
- [ ] `dashboard.html` — PIN boxes → single key field
- [ ] **`privacy.html` — lines 145, 146 and the updated date rewritten** ← required
- [ ] SMOKE TEST 1 passed: no console errors, `WEBHOOK_KEY` prints, no FAB on the dashboard

**Stages 2–4 — Google**
- [ ] Sheet `Aesir ledger` created, SHEET_ID extracted (no slashes, no `/edit`, no `?gid=`)
- [ ] Script pasted; all **four** constants replaced (`SHEET_ID`, `NOTIFY`, `WRITE_KEY`, `READ_KEY`)
- [ ] `NOTIFY` is **your** address only — Neil added later
- [ ] `smokeTest` Run succeeded; `Events` and `Bookings` tabs auto-created
- [ ] Authorisation completed ("Advanced" → "Go to Aesir ledger (unsafe)" → "Allow")
- [ ] Deployed as **"Web app"**, "Execute as: **Me**", "Who has access: **Anyone**" (the bare word)
- [ ] `/exec` URL copied — **not** `/dev`
- [ ] SMOKE TEST 4: JSON with the key, `{"error":"bad key"}` without it, **and it works in a private window**

**Stages 5–8 — wiring and proof**
- [ ] URL pasted between the existing quotes in all three files
- [ ] `grep` confirms three `/exec` URLs and no READ_KEY in any file
- [ ] Committed and pushed; GitHub Actions shows green
- [ ] SMOKE TEST 6: `EVENT_WEBHOOK` prints the URL in the live site's console
- [ ] A `pageview` row appeared in `Events` from a live page load
- [ ] A `whatsapp_click` row appeared from a live tap
- [ ] Test booking → `Bookings` row + `booking_confirmed` event + email received
- [ ] **Test booking cancelled in `admin.html`**
- [ ] Neil's email added to `NOTIFY` **and re-deployed as a New version** (Stage 9)
- [ ] Dashboard loads with the READ_KEY, funnel shows real numbers, no pageviews in the contact-clicks table, no floating WhatsApp button
- [ ] https://thomasrgriffiths08-blip.github.io/aesir-automotive/dashboard.html bookmarked

**Filed for later**
- [ ] Stage 9 (re-deploy after every script edit) read and understood — it will save you an evening