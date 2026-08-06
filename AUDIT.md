# Æsir Automotive — Full Site Audit
**Date:** 6 Aug 2026 · **Auditor:** Claude (Tom's build session) · **Scope:** all 22 pages, booking stack, media, SEO/AEO, deploy

---

## Verdict

The site is **genuinely strong** — top-1% for an independent garage. Dark carbon theme, cinematic hero, real photos, working live-diary booking, PIN admin, 9 SEO service pages, FAQ/schema/AEO layer. What separates it from "masterpiece" is no longer design: it's **(1) the demo-grade backend holding real customer data, (2) promises the copy makes that no system keeps yet, and (3) business unlocks only Neil/Tom can do** (domain, listings, full-res photos, sign-off).

---

## Fixed in this session (6 Aug, evening)

| Fix | Detail |
|---|---|
| Logo lockup | Tricolor stripes now **touch the left edge of ÆSIR** (nav, footer, intro wordmark — all pages) |
| Booking: Saturdays | Widget offered Saturday slots while the whole site says Mon–Fri. Removed (admin diary matched). Re-enable in `buildDays()` if Neil confirms Sat hours |
| Booking: date bug | Slot keys used UTC (`toISOString`) — a booking made 00:00–00:59 BST saved under the wrong day. Now local-date keys in widget + admin |
| Gallery rebuilt | New **"claims, with the proof"** evidence section: 6 cards, each = photo + claim + plain-English explanation + "as posted · @aesir.automotive · date" |
| Clean photos | 11 photos pulled fresh from Instagram's CDN at full quality — replaced the old screenshot-crops (two had IG carousel dots baked in) |
| New evidence | **Workshop interior** (two-post lifts, blast cabinet, Snap-on wall — first photo proving the premises) and **machined S50 block with the F430 behind it** |
| Wrong caption killed | "Rolls-Royce Ghost engine block" was actually a BMW straight-six. Recaptioned truthfully; Rolls evidence is now the Spirit-of-Ecstasy bench shot (cropped clean of the play glyph) |
| CSS defect | `.shot` tile styles only existed inline in index.html — **gallery.html used them unstyled**. Moved to site.css, shared everywhere; captions now always visible on touch devices |
| About section | Now shows the real workshop interior under the "THE WORKSHOP · 3 RAMPS · POND FARM" plate |
| 404 + iOS icon | Branded self-contained 404.html; apple-touch-icon.png (brand stripes) |
| Verified end-to-end | Booking → cloud diary → admin cancel → slot reopens: all round-tripped against the live blob. Cinematic intro: letterbox → wordmark → dissolve confirmed |

## Deploy status ⚠

GitHub **Pages + Actions are in major outage** (confirmed githubstatus.com). Today's work is pushed (commit `1bbf052`) and a build is queued; the live URL still serves the older build (no gallery.html, no cloud booking). **A monitor is armed** — it will confirm the moment the new build serves. Local demo works fully meanwhile (`open index.html` — cloud sync works from file://).

---

## Scorecard

| Area | Score | Blocker to 10 |
|---|---|---|
| Design / brand | 9 | Neil's face missing; full-res photos would lift tiles |
| Content truth | 9 (was 7) | i8 photo shows a passer-by's face — needs Neil's OK or crop |
| Booking UX | 8.5 | No real SMS/email confirmation yet (see below) |
| Backend | **4** | JSONBlob = public-by-obscurity. Biggest risk on the site |
| SEO / AEO | 8 | Off-site listings not done (Bing/Foursquare/Yelp playbook in DEPLOY.md) |
| Performance | 7.5 | 7.7MB desktop hero video; two font families with many weights |
| Accessibility | 8 | Keyboard focus states on booking chips untested; otherwise solid (alts ✓, reduced-motion ✓) |
| Trust signals | 7 | Only 3 review quotes, no owner photo, no case studies |

---

## The three things that actually matter

### 1. Swap JSONBlob → Supabase **before any real customer books** 🔴
The diary blob URL is public. Anyone who views source can read **customer names + phone numbers** and wipe/vandalise the diary. It also expires after long inactivity. This was fine for the pitch; it is not fine live. The drop-in kit already exists (`supabase/` + `js/cloud.supabase.js` + UPGRADES.md runbook) — ~1 hour of work + a free Supabase account. The admin PIN (8177, visible in view-source) moves server-side with it.

### 2. Make the copy's promises true 🟠
The site says *"instant confirmation and a reminder text the day before."* Today: the confirmation is on-screen only, the reminder is **kept by hand** — Neil must check the admin diary daily and text people himself. Either:
- wire `BOOKING_WEBHOOK` (one paste — GHL/Make/Zapier → SMS), which makes it true automatically, or
- soften the copy until then.
Same for MOT "automatic reminders" on the services card — the reminders engine is staged behind admin, not live.

### 3. The business unlocks only you/Neil can do 🟠
Still blocked (all prepped, playbooks written):
- **Real domain** (aesirautomotive.co.uk) — every canonical/OG/sitemap is one swap away
- **Bing Webmaster + Bing Places + Foursquare + Yelp** — this is what gets Æsir into ChatGPT/AI-search local answers (playbook in DEPLOY.md)
- **Google Business Profile** website field → new URL
- **Neil's full-res photos + formal OK** to use his IG content (and the i8 face)
- Saturday hours confirmation; analytics choice; sign-off before paid promotion

---

## What to improve (ranked)

1. **Photos of Neil.** The about page sells "the person you speak to is the person under your bonnet" — with no photo of that person. One good portrait in the workshop + one wrenching shot would be the single biggest trust lift on the site.
2. **Case-study pages.** The 3 hero jobs (S85 big-ends, Z3 M engine-out, F430 misfires) each deserve a page: photo sequence → what it needed → outcome quote. This is also the strongest SEO content a specialist can publish (Neil's IG carousels already hold the photo sequences).
3. **Hero video weight.** 7.7MB desktop rendition; re-encode ~4MB CRF-28 or serve AV1/H.265 with H.264 fallback. Mobile 1.5MB rendition is already right.
4. **Reviews depth.** 20 five-star reviews exist; the site shows 3 quotes. Pull the best 8–10 with reviewer initials + service type; link "read all 20 on Google" prominently.
5. **Font diet.** Archivo (6 weights) + JetBrains Mono (3) — drop to Archivo 400/700/900 + Mono 400/700; saves ~100KB and a render pass.
6. **Booking ref generation** — `AES-` + length+random can collide; timestamp-based suffix is a 1-liner.
7. **Keyboard pass on the widget** — chips need visible :focus-visible rings.
8. **Reel as video tile.** The Nov 2023 post has a runner video (engine fired up). A 5-sec self-hosted loop in the gallery would out-punch any still.

## What to add
- **404 page ✓ (done today)** · **apple-touch-icon ✓ (done today)**
- Analytics with 4 events: booking confirmed, WhatsApp click, call click, IG click
- A "review us" QR card for the workshop counter (review engine already staged)
- `og:image` refresh once full-res photos arrive (current one is fine, not special)

## What to remove / retire
- **compare.html** — internal video-picker, still in the public repo (robots-disallowed, but delete or move under admin)
- **spirit.jpg ✓ removed** (play-glyph screenshot; clean crop `spirit-rolls.jpg` replaced it)
- **ghost-block.jpg ✓ removed** (was mislabelled; clean `s50-block.jpg` replaced it)
- The `wa-wait` interval poll in shared.js could hook the intro's `finish()` instead of polling every 200ms (cosmetic)

---

## Path to masterpiece (ordered, with effort)

| # | Step | Effort | Owner |
|---|---|---|---|
| 1 | Pages deploy confirms (monitor armed) | auto | — |
| 2 | Supabase swap + server-side PIN | ~1 hr | Tom |
| 3 | Wire BOOKING_WEBHOOK → SMS confirm + day-before reminder | ~1 hr | Tom (needs GHL/Twilio acct) |
| 4 | Domain + swap canonicals; Bing/Foursquare/Yelp listings | ~2 hrs | Tom + Neil |
| 5 | Neil portrait + full-res job photos + IG/i8 permission | shoot visit | Neil |
| 6 | 3 case-study pages from the hero jobs | ~2 hrs | Tom |
| 7 | Reviews expansion + counter QR | ~1 hr | Tom |
| 8 | Hero re-encode, font diet, focus rings, ref fix | ~1 hr | Tom |
| 9 | Analytics + conversion events | ~30 min | Tom |

After 1–4 the site is safely **live-grade**; after 5–9 it's the best independent-garage site either of us has seen.
