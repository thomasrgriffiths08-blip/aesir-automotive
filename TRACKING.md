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
/* ÆSIR ledger — paste this whole file into Apps Script.
   Replace the FOUR constants below. Nothing else needs changing. */

const SHEET_ID  = 'PASTE-YOUR-SHEET-ID';       // the long code in the Sheet URL
const NOTIFY    = ['you@example.com'];          // your email. Add Neil's LATER
const WRITE_KEY = 'change-me-write';            // must equal WEBHOOK_KEY in js/shared.js
const READ_KEY  = 'change-me-read';             // typed into dashboard.html. DIFFERENT, 16+ chars

const HEADERS = {
  Events:   ['When','Event','Visitor ref','Page','Source','Service','Booking ref'],
  Bookings: ['When','Booking ref','Visitor ref','Service','Day','Date','Time',
             'Name','Phone','Reg','Model','Source']
};

/* Creates the tab if it's missing, so a typo or a deleted tab can't take the
   ledger down silently. */
function tab(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(HEADERS[name]); }
  return sh;
}

function doPost(e) {
  try {
    if (!e || !e.postData) return ContentService.createTextOutput('no body');
    const d = JSON.parse(e.postData.contents);
    if (d.t !== WRITE_KEY) return ContentService.createTextOutput('bad key');

    const ss = SpreadsheetApp.openById(SHEET_ID);
    // ISO strings, not Date objects: a reformatted column can't then make rows
    // vanish from the dashboard.
    const when = new Date().toISOString();

    if (d.kind === 'event') {
      tab(ss, 'Events').appendRow([when, d.name || '', d.ref || '', d.page || '',
                                   d.source || '', d.svc || '', d.booking_ref || '']);
    } else if (d.kind === 'booking') {
      tab(ss, 'Bookings').appendRow([when, d.ref || '', d.visitor || '', d.svc || '',
        d.day || '', d.iso || '', d.time || '', d.name || '', d.phone || '',
        d.reg || '', d.model || '', d.source || '']);
      try {
        MailApp.sendEmail(NOTIFY.join(','),
          'BOOKING ' + d.ref + ' — ' + d.day + ' ' + d.time + ' — ' + d.svc,
          d.name + ' · ' + d.phone + (d.model ? ' · ' + d.model : '') +
          (d.reg ? ' · ' + d.reg : '') + '\nVisitor ref: ' + (d.visitor || '—') +
          '\n\nIt is already in the live diary. This email is the notification.');
      } catch (mailErr) {
        // The row matters more than the email — never lose the commission record
        console.error('mail failed: ' + mailErr);
      }
    } else {
      return ContentService.createTextOutput('ignored');   // unknown kind
    }
    return ContentService.createTextOutput('ok');
  } catch (err) {
    console.error(err);
    return ContentService.createTextOutput('error');
  }
}

/* Feeds dashboard.html. Requires READ_KEY — without this the whole ledger,
   including every customer's name and mobile number, would be readable by
   anyone who found the URL. Supports ?callback= for the JSONP fallback. */
function doGet(e) {
  const p = (e && e.parameter) || {};
  const out = body => {
    if (p.callback) return ContentService.createTextOutput(p.callback + '(' + body + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
  };
  if (p.key !== READ_KEY) return out(JSON.stringify({error: 'bad key'}));

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const MAX = 3000;
  const rows = name => {
    const sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return [];
    const first = Math.max(2, sh.getLastRow() - MAX + 1);
    return sh.getRange(first, 1, sh.getLastRow() - first + 1, sh.getLastColumn()).getValues();
  };
  const str = v => (v instanceof Date) ? v.toISOString() : String(v || '');
  const ev = rows('Events').map(r => ({
    ts: str(r[0]), name: r[1], ref: r[2], page: r[3], source: r[4], svc: r[5], booking_ref: r[6]
  })).filter(x => x.ts);
  const bk = rows('Bookings').map(r => ({
    ts: str(r[0]), ref: r[1], visitor: r[2], svc: r[3], day: r[4], iso: r[5],
    time: r[6], name: r[7], phone: r[8], reg: r[9], model: r[10]
  })).filter(x => x.ts);
  return out(JSON.stringify({events: ev, bookings: bk}));
}

/* Run this ONCE from the editor to create the tabs and trigger the Google
   permission prompts before any real traffic arrives. */
function smokeTest() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  tab(ss, 'Events'); tab(ss, 'Bookings');
  MailApp.sendEmail(NOTIFY.join(','), 'Aesir ledger — smoke test',
    'If you are reading this, the Sheet ID and email both work.');
  Logger.log('OK — sheet reachable, tabs ready, test email sent');
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
