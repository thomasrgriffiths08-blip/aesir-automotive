# Æsir — Making the Systems Real

The site currently *demos* three automations. This file is the exact wiring to
make each one genuinely operational, in order of effort.

---

## 1. Missed-call text-back (the flagship) — ~1 hour in GoHighLevel

This is telephony, not web. The flow puts a tracking number in front of Neil's
phone; the site already displays whatever number you give it.

**GHL setup (your agency stack):**
1. Sub-account for Æsir → Phone Numbers → buy a UK local number (~£2/mo).
2. Number settings → forward calls to Neil's mobile `07956 658177`,
   ring time ~20s.
3. Workflow: **Trigger** = "Call Status: missed / no answer / voicemail"
   → **Wait 30 seconds** (in case he rings straight back)
   → **SMS**: use the site's exact voice:
   > Hi, it's Æsir Automotive — sorry we missed you, we're under a car.
   > What's the car doing? Reply here and we'll sort it 👊
4. Replies land in the GHL Conversations inbox → Neil gets the mobile app.
5. Swap the number **everywhere at once** (site, GBP, Instagram bio) —
   grep this repo for `07956 658177` / `447956658177` (14 hits incl. WhatsApp
   links — WhatsApp stays on Neil's real mobile).

**No-GHL alternative:** Twilio UK number (~£1/mo) + Studio flow
(Incoming call → Connect → on no-answer → Send SMS). Cheaper, but no
client-friendly inbox — GHL is the retainer play.

## 2. Booking notifications — 10 minutes

`index.html` → `const BOOKING_WEBHOOK = ''` → paste a GHL inbound-webhook
workflow URL (or Make/Zapier). Every booking POSTs
`{ref, svc, day, iso, time, name, phone, reg, model}`:
- → SMS to Neil: "NEW BOOKING: {{time}} {{day}} — {{svc}}, {{name}} {{phone}}"
- → SMS to customer: real confirmation (the site currently only *shows* one)
- → day-before reminder via workflow wait-until

Same webhook pattern later powers the MOT-reminder texts from the reminders
page (add a second webhook const there when ready).

## 3. Proper backend — Supabase, ~30 min with Tom's login

Current store is a public JSON blob (fine for demo; no real auth, expires if
unused for ~30 days). The upgrade kit is ready in this repo:

- `supabase/setup.sql` — run in the Supabase SQL editor of a NEW free project.
  Creates `diary` (single-row availability doc) + `bookings` table, RLS:
  public can read diary + insert bookings; only the service role / authed
  admin can update.
- `js/cloud.supabase.js` — drop-in replacement for `js/cloud.js`.
  Paste the project URL + anon key at the top, rename it to `cloud.js`, done —
  no other file changes. Admin PIN then becomes a Supabase-checked secret
  rather than client-side.

## 4. Front-end: what actually moves the needle next
1. **Neil's camera-roll originals** for the 11 photos (biggest visual jump).
2. **One case-study page per hero job** (S85 rebuild, Ghost, F430) — SEO + AI
   answers + sales proof in one; template already exists (`services/`).
3. **A 20-second phone-shot video of Neil talking** for the About page —
   beats every animation on trust.
4. **Servicing price-from menu** (needs Neil's numbers) — kills the #1
   pre-call question.
5. Self-host the two Google Fonts (perf; removes the last third-party call).
