# Tracking, attribution & commission — how it works and how to switch it on

You're paid commission on jobs that come through this site, so the site now
treats attribution as a first-class feature. This file is the whole system.

## What's already built into the code (live once deployed)

1. **Every visitor gets a reference** like `W-4K7M`, stored in their browser and
   stable across pages and return visits.
2. **Every WhatsApp button composes its message at click time** from whatever
   the visitor has entered — name, car, reg, chosen service and slot from the
   booking widget, or the service page they were reading — and ends it with
   `[web W-4K7M]`. A half-filled booking form becomes a complete, specific
   WhatsApp message instead of a generic one.
3. **Events fire on everything that matters:** `whatsapp_click` (with source:
   fab / booking-widget / booking-fail / page-link), `call_click`, `ig_click`,
   `booking_started`, `booking_confirmed` (with the booking ref),
   `booking_failed`.
4. **Online bookings carry the visitor ref** in the webhook payload, so the
   ledger can tie a confirmed booking back to the same visitor's earlier clicks.

The events currently go nowhere — two constants at the top of `js/shared.js`
switch the sinks on. Both are one-line pastes. Use either or both.

---

## The honest limit — read this first

**No website can see whether someone actually pressed *send* inside WhatsApp.**
The wa.me link opens the WhatsApp app with the message prefilled; from that
moment the site is out of the picture. What you CAN know, reliably:

- that they **clicked** (the `whatsapp_click` event), and
- that the message **arrived** — because when it did, it says `[web W-4K7M]`
  on Neil's phone.

Click count vs. arrived-ref count IS your send-through rate, measured at the
only two points that can be measured. Any job that starts with a `[web …]`
message is yours beyond argument. That's the commission mechanism, and it
doesn't depend on any analytics vendor.

> Upgrade path if you ever need automated delivery receipts: the WhatsApp
> Business Platform (via Twilio or Meta Cloud API). Real infrastructure, monthly
> cost, template approval — not worth it until volume justifies it.

---

## Sink 1 — your own spreadsheet ledger (free, ~10 minutes)

One Google Apps Script gives you: a **Bookings** sheet (the commission ledger),
an **Events** sheet (every click with its ref), and an **email to you and Neil
the moment a booking lands.**

1. Create a Google Sheet named `Aesir ledger`. Add two tabs: `Bookings` and `Events`.
2. Extensions → Apps Script, delete the boilerplate, paste:

```javascript
const SHEET_ID = 'PASTE-YOUR-SHEET-ID';          // from the sheet's URL
const NOTIFY = ['you@example.com'];               // add Neil's email when he's ready

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.openById(SHEET_ID);
  if (d.kind === 'event') {
    ss.getSheetByName('Events').appendRow([
      new Date(), d.name, d.ref || '', d.page || '', d.source || '', d.svc || ''
    ]);
  } else {   // a booking from the widget webhook
    ss.getSheetByName('Bookings').appendRow([
      new Date(), d.ref || '', d.visitor || '', d.svc || '', d.day || '',
      d.time || '', d.name || '', d.phone || '', d.reg || '', d.model || '', d.source || ''
    ]);
    MailApp.sendEmail(NOTIFY.join(','),
      'BOOKING ' + d.ref + ' — ' + d.day + ' ' + d.time + ' — ' + d.svc,
      d.name + ' · ' + d.phone + (d.model ? ' · ' + d.model : '') +
      (d.reg ? ' · ' + d.reg : '') + '\nVisitor ref: ' + (d.visitor || '—') +
      '\n\nIt is already in the live diary. This email is the notification.');
  }
  return ContentService.createTextOutput('ok');
}

// Feeds dashboard.html. Same URL, with ?summary=1
// Supports ?callback=fn so the dashboard can fall back to JSONP if a plain
// cross-origin fetch is ever blocked.
function doGet(e) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const rows = name => {
    const sh = ss.getSheetByName(name);
    return sh ? sh.getDataRange().getValues() : [];   // missing tab != crash
  };
  const ev = rows('Events').map(r => ({
    ts: r[0], name: r[1], ref: r[2], page: r[3], source: r[4], svc: r[5]
  })).filter(x => x.ts instanceof Date);
  const bk = rows('Bookings').map(r => ({
    ts: r[0], ref: r[1], visitor: r[2], svc: r[3], day: r[4], time: r[5],
    name: r[6], phone: r[7], reg: r[8], model: r[9]
  })).filter(x => x.ts instanceof Date);

  const payload = JSON.stringify({events: ev, bookings: bk});
  const cb = e && e.parameter && e.parameter.callback;
  if (cb) {
    return ContentService.createTextOutput(cb + '(' + payload + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}
```

> **Why `text/plain` on the website's side:** the booking POST and the event
> beacon both send their JSON with a `text/plain` content type. That is
> deliberate. An `application/json` content type makes the browser send a CORS
> preflight `OPTIONS` request first, and Apps Script web apps do not answer
> `OPTIONS` — so the request would be blocked and the notification would
> silently never arrive. Apps Script reads the body from `e.postData.contents`
> regardless of the declared type, so nothing is lost.

3. Deploy → New deployment → type **Web app** → execute as **Me**, access
   **Anyone**. Copy the `/exec` URL.
4. Paste that URL into **all three**:
   - `EVENT_WEBHOOK` at the top of `js/shared.js`
   - `BOOKING_WEBHOOK` at the top of the booking script in `index.html`
   - `LEDGER_URL` at the top of the script in `dashboard.html`
5. Commit and push. Done — bookings email you both instantly, everything
   accumulates in the sheet, and **`/dashboard.html` (PIN 8177) becomes your
   read-out**: a visitors → started → booked → WhatsApp → call funnel with
   conversion percentages, the commission ledger, and the last 60 contact
   clicks with their visitor refs. That page is where you look at all of this.

**This also solves "I need to know when jobs go through"** for online bookings:
the email *is* the notification, and it closes the biggest operational gap in
the booking system (Neil currently has to remember to open the diary).

## Sink 2 — a dashboard (optional, nicer graphs)

[Umami Cloud](https://umami.is) free tier: create a website, copy the website
id, paste it into `ANALYTICS_ID` in `js/shared.js`. Cookieless, no consent
banner needed, and every event above appears with its properties. Plausible
(~£9/mo) is the equally good paid alternative. Skip entirely if the
spreadsheet is enough.

**When you activate either sink**, add this to `privacy.html` §07 (currently it
truthfully says there's no analytics, and it must stay truthful):

> The site records anonymous usage events — pages viewed and buttons pressed —
> against a random reference like "W-4K7M" so we know our website is working.
> This isn't advertising tracking, no cookies are used, and it's never linked
> to your name unless you contact us, when the reference in your message lets
> us connect it to your booking.

## The weekly commission routine

1. Open the **Bookings** tab — every online booking, timestamped, with refs.
2. Ask Neil to scroll WhatsApp for messages containing `[web` — thirty seconds.
   Each one is a website job; note it against its `W-…` ref.
3. Jobs Neil took by phone: ask "did they mention the website?" — imperfect,
   but the call_click count tells you how many the site sent to the phone.
4. Sheet total × your rate = the invoice. The refs make it non-arguable.

## Friction notes (already live)

- WhatsApp is one tap from everywhere via the floating button, and the message
  is now pre-written *for* them — the visitor only has to press send.
- The booking widget's WhatsApp fallback carries everything they'd already
  typed, so abandoning the form doesn't mean starting over.
- The sticky mobile bar keeps Call and Book visible at all times.
