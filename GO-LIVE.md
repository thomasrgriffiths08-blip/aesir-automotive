# Æsir Automotive — Go-Live Runbook

**Repo:** `/Users/tom/Applications/bmw-specialist` · **Live:** `https://thomasrgriffiths08-blip.github.io/aesir-automotive/`
**Prepared:** 6 August 2026 · verified against the working tree at commit `26ac694`

---

## Verdict

**No. This site cannot safely take a real customer booking today, and it is currently taking them.** Both `index.html:821` and `admin.html:106` still load `js/cloud.js`, which reads and writes every booking — name, mobile, registration, and the exact date the customer's car will be away from home — to `https://jsonblob.com/api/jsonBlob/019fd7e3-96c2-7b8a-b7a1-dddc5e3bcf06`, a URL hard-coded in shipped client JavaScript that anyone can read with a browser and overwrite with one `curl -X PUT`. I fetched it just now: it currently holds one record (your own test booking, `AES-1023`), and the response header `x-jsonblob-expires-at: 2026-08-07T16:24:04.589Z` means the entire diary self-deletes tomorrow afternoon whether anyone touches it or not. On top of that, a booking notifies nobody — `BOOKING_WEBHOOK` is empty at `index.html:891` — and `index.html:981` discards the return value of `dbPut()`, so a customer whose booking never reached the store is still shown a tick, "You're booked in", and a reference number. The first genuine member of the public who books turns AESIR AUTOMOTIVE LTD (company 12705996, Neil as sole director and data controller) into the controller of a live unauthorised-disclosure incident, on a site he has never signed off. Stop taking bookings today; everything else follows from that.

**On legal points throughout:** I am your developer, not your solicitor. The statutory references below are accurate as far as I can state them, but Neil's specific circumstances — his VAT position, his insurance, his qualifications, whether the ICO fee applies to him — need confirming with the ICO's own self-assessment tool and, where money is at stake, a solicitor. Do not hand a client a developer's summary as legal advice.

---

## STATUS — already done since this runbook was generated

Ticked off in commits `7d4592f`, `26ac694`, `a94f1d1` and later. **Re-read the
runbook steps below with these in mind — several are already complete.**

- **Step 4 — JSONBlob emptied.** Done. It was publicly exposing Tom's own name
  and mobile number from an earlier test booking. Wiped; verified empty.
- **Step 5 — untrue copy removed.** Done. All seven "SMS confirmation" /
  "reminder the day before" claims corrected, including the JSON-LD FAQ answer
  and the mocked SMS bubble. MOT "automatic reminder texts" corrected on the
  service page, its meta description and its schema.
- **Step 8 — silent failure fixed.** Done. `dbPut()`'s result is captured; a
  failed save now shows a distinct "Not booked" panel with call and WhatsApp,
  never the tick. Verified headless.
- **Step 9 — reference generation fixed.** Done. Timestamp-based, no collisions.
- **Step 10 — admin output escaped.** Done. Customer fields go through
  `createElement`/`textContent`; `toast()` in shared.js likewise. Phone numbers
  became tap-to-call and WhatsApp links while I was in there.
- **Step 11 — customer records no longer cached on visitors' devices.** Done.
  `dbGet`/`dbPut` strip bookings to `{iso,time}` for anyone not on admin.html.
- **Step 13 — closed days checked at submit.** Done.
- **Step 14 — validation and abuse controls.** Done. Honeypot, UK mobile format
  check, `maxlength` on all four inputs, aria-labels. Verified headless.
- **Supabase kit corrected** (prerequisite for steps 6 and 7). The staged
  version would have leaked the same data via a `bookings public read` policy.
  Rewritten: insert-only for the public, staff-only reads, a `taken_slots` view
  exposing only date and time, a `unique(iso,slot_time)` double-booking guard,
  and a 30-day purge function. `supabase/README.md` is a 15-minute runbook.
- **Privacy notice published** (`privacy.html`) and linked from every footer.
- **Companies Act trading disclosure** added to all 17 page footers, verified
  against the Companies House register.
- **Kill switch added.** `BOOKINGS_OPEN` at the top of the booking script in
  `index.html`. Set it to `false` and redeploy to replace the widget with call +
  WhatsApp, without touching anything else — that is step 1 as a one-line edit.
  Currently `true`; changing it is a client-facing decision, so it was left to Tom.

**Still open and still the gate: steps 6, 7, 15, 19 and 21.** Supabase, the
notification webhook, Neil's sign-off, and the domain.

---

---

## Correction to the audit before you start

**The Supabase kit in the repo has already been rewritten and is now safe.** Several findings say `supabase/setup.sql:30` grants `bookings public read` — that is stale. The current file (commit `26ac694`, "Rewrite the Supabase migration kit — the staged one leaked the same data") has:

- `setup.sql:52` — `bookings insert` `with check (true)` (public may create)
- `setup.sql:53` — `bookings staff read` `using (auth.role() = 'authenticated')` (only signed-in reads)
- `setup.sql:54` — `bookings staff write` for **delete**, authenticated only
- `setup.sql:42-44` — `diary` readable by all, updatable only when authenticated
- `setup.sql:61-63` — a `taken_slots` view exposing **only** `iso` and `slot_time` to anon
- `setup.sql:69-72` — a `purge_old_bookings()` function deleting rows older than 30 days
- `setup.sql:31` — `unique (iso, slot_time)`, which kills double-booking at the database

`js/cloud.supabase.js` was rewritten to match: it has a real `sbSignIn()` (line 34), reads `taken_slots` when signed out and full `bookings` when signed in (line 62), and returns `'taken'` on a 409 (line 114).

Two live traps remain in that kit, and they are why Step 7 is not a five-minute job:

1. `cloud.supabase.js:20-21` still hold `YOUR-PROJECT` / `YOUR-ANON-PUBLIC-KEY`.
2. **`admin.html` never calls `sbSignIn()`.** It still runs the PIN gate at `admin.html:109` (`const PIN = '8177'`). Swap the script tag without rewriting that gate and Neil is anonymous to Supabase — his block-slot and close-day `PATCH` to `diary` (`cloud.supabase.js:123`) and his cancel `DELETE` (`:121`) will both be refused by RLS, while `setSync()` in `admin.html:134` keeps painting **"LIVE — SYNCED"**. Silent, total loss of admin control. This must be done in one commit with the swap.

`UPGRADES.md:45-46` still describes the old kit and says the blob "expires if unused for ~30 days" — the live headers contradict that. Fix the doc in the same pass.

---

## Things the site currently says that are not true

These are trust failures and advertising-compliance exposure at the same time. They are broken out here because they are the only category where doing nothing actively misleads a customer.

| Where | What it says | Reality |
|---|---|---|
| `services/mot-prep.html:73` | "our reminder system texts you four weeks before your next MOT is due, again a week out, and the day before your slot" | No SMS provider is wired anywhere. `BOOKING_WEBHOOK` is empty. Nothing sends. |
| `services/mot-prep.html:65` | "we…remind you automatically next year" | Same. |
| `llms.txt:30` | "with automatic MOT/service text reminders" | Same — and this file exists specifically to be quoted by ChatGPT and Perplexity. |
| `faq.html:66` **and its JSON-LD twin at `faq.html:16`** | "reply to your confirmation" to change a booking | No confirmation is ever sent. The customer has nothing to reply to. |
| `services/mot-prep.html:98` | Links customers to `../systems/reminders.html` | A demo that collects reg, mobile and MOT date and stores it in the visitor's own browser. Neil never sees it. |
| `admin.html:134` | "OFFLINE — CHANGES QUEUED LOCALLY" | Nothing is queued. The next `dbGet()` overwrites the local copy. Neil's edit is gone. |
| `index.html:660-663` | "You're booked in", tick, reference | Shown unconditionally, including when the save failed (`index.html:981`). |
| `privacy.html:146` | localStorage is used for "two strictly functional things", described as diary state | `js/cloud.js:15` caches the **whole document including other customers' names and mobile numbers** into every visitor's browser. The notice is inaccurate on this exact point. |
| `privacy.html:139` | "we rely on the safeguards those providers have in place for international transfers" | There is no DPA with JSONBlob and no identifiable counterparty. Untrue as written. |
| `faq.html` (warranty answer) + `services/servicing.html` schema | Warranty stated as an unqualified "No —" and "we update the digital service history the same way a dealer does" | The block-exemption position is broadly right but not unconditional; the DSH claim depends on access Neil may or may not have. Both need qualifying/confirming. |
| `index.html:780` "Saturday · By appointment", `contact.html:71` "Weekend · By arrangement", `faq.html:68` + JSON-LD | Weekend availability | `index.html:44` `openingHoursSpecification` says Mon–Fri. Nobody has asked Neil. |
| `systems/textback.html` | "System 01 · Live on this number" | Not live. No customer route reaches this page (noindex, robots-disallowed, linked only from `admin.html:98`), so this is a **client**-honesty problem in the pitch, not customer harm. |

---

# A. Must happen before a real customer books

*This is the legal and safety gate. Nothing in B, C or D matters if a customer books into the current system first.*

### 1. Take the booking submit path out of service — today
**Who:** Claude · **Time:** 20 min · **Unblocks:** everything; stops the clock running
Replace the `#wSubmit` handler's write path with the phone/WhatsApp route already sitting in the page at `index.html:649` (`wa.me/447956658177`, prefilled). Keep the day/time picker visible as a shop window if you like, but nothing may reach `dbPut()`. **This, not noindex, is the containment action** — the blob URL is in shipped JS forever, so hiding the page from search does not close the hole.

### 2. Noindex the public pages
**Who:** Claude · **Time:** 15 min · **Unblocks:** limits new discovery while A runs
Add `<meta name="robots" content="noindex,nofollow">` to `index.html`, `about.html`, `contact.html`, `faq.html`, `gallery.html`, `reviews.html`, `why-us.html`, `cars-we-work-on.html`, and all nine `services/*.html`. **`privacy.html` currently declares `content="index,follow"` at line 11 — change it, don't just add.** `admin.html`, all three `systems/` pages, `compare.html` and `404.html` already carry a noindex; leave them. Removing these is the last commit before launch.

### 3. Tell Neil, in writing, today
**Who:** Tom · **Time:** 20 min · **Unblocks:** step 19; his liability, his decision
He is the data controller. He needs to know the site is live with his real trading name, address, mobile and Google rating on it, that it was taking bookings, and what you have just done about it. Say plainly that no member of the public has booked — the only record in the blob is your own test — so there is nothing to notify anyone about, and that you have closed it before one arrived.

### 4. Empty the JSONBlob
**Who:** Tom · **Time:** 5 min · **Unblocks:** removes your own personal data from a public URL
`PUT` `{"blocked":{},"closedDays":[],"bookings":[],"updated":0}` over it. Abandoning it is not enough while it is still readable. It self-expires 2026-08-07T16:24:04Z anyway, but do not rely on that.

### 5. Delete the untrue copy that is live right now
**Who:** Claude · **Time:** 45 min · **Unblocks:** removes the misleading-advertising exposure
- Strip the reminder promise from `services/mot-prep.html:65`, `:73` and `llms.txt:30`. `:82` ("A reminder from Neil when your MOT is due") is a defensible manual promise — keep it, confirm with Neil.
- Remove the `../systems/reminders.html` card at `services/mot-prep.html:98`.
- Rewrite `faq.html:66` **and the matching answer inside the JSON-LD at `faq.html:16`** to "Yes, free — call or WhatsApp 07956 658177 with your booking reference and we'll move it."
- Qualify the warranty answer: the retained Motor Vehicle Block Exemption (Commission Reg 461/2010 as retained, extended to 31 May 2029) means a manufacturer cannot void a warranty merely because an independent serviced the car — provided the schedule is followed and parts meet the required standard. Add that extended warranties and Service Inclusive contracts carry their own terms. Drop the absolute "every time".
- Fix the `admin.html:134` string to "NOT SAVED — TAP TO RETRY" with a visible retry, and stop the automatic cache overwrite while a write is pending.

### 6. Create the Supabase project and run the corrected SQL
**Who:** Tom · **Time:** 45 min · **Unblocks:** steps 7-11, and the whole of section B
- supabase.com → New project → **Region: London (eu-west-2)** (this is the setting that removes the international-transfer question).
- SQL Editor → paste and run `supabase/setup.sql` unmodified. It is now correct. Do **not** add any `using (true)` select policy on `bookings`.
- Authentication → Providers → Email on, **"Enable sign-ups" OFF**.
- Authentication → Users → Add user → Neil's email + a strong password (this replaces `8177`).
- Project Settings → API → copy the Project URL and the **anon/public** key. Never the `service_role` key.
- Note: `setup.sql:20` makes `ref` the PRIMARY KEY, so step 9 must land before or with the migration or colliding refs will start throwing INSERT failures.

### 7. Wire Supabase in and replace the admin PIN gate
**Who:** Claude (code) + Tom (keys) · **Time:** 2 hrs · **Unblocks:** every remaining data-protection item
- Paste the URL and anon key into `js/cloud.supabase.js:20-21`.
- Point `index.html:821` and `admin.html:106` at `js/cloud.supabase.js`.
- **Rewrite the `admin.html` PIN gate (lines 61-119) to call `sbSignIn(email, password)` and delete `const PIN = '8177'` entirely.** Without this the diary silently stops working (see the correction section above). A client-side secret is never a secret.
- Test the full round trip before committing: book as anon → confirm the row appears → sign in as Neil → confirm the name and phone are visible → sign out → confirm `/rest/v1/bookings?select=*` with the anon key returns nothing.
- Correct `UPGRADES.md:43-56` to describe what the kit actually does now.

### 8. Stop lying to the customer when the save fails
**Who:** Claude · **Time:** 30 min · **Unblocks:** the worst failure mode on the site
`index.html:981` is `await dbPut(DB);` with the result thrown away. Capture it — and note the Supabase client returns **three** values, so a truthiness check is not enough:

```js
const res = await dbPut(DB);
if (res === 'taken') { /* someone beat them to it — re-render times, tell them */ }
else if (res !== true) { /* failure panel: no tick, no "booked in" */ }
```

On failure show a clear "we couldn't save that" state with the tap-to-call and the prefilled WhatsApp link carrying service/day/time/name/reg, so the customer finishes it by hand. Same treatment for `save()` at `admin.html:136`.

### 9. Fix booking reference generation and cancel-by-key
**Who:** Claude · **Time:** 20 min · **Unblocks:** step 6's primary key; stops silent double-cancellation
`index.html:978` builds the ref from `DB.bookings.length` — a counter that *falls* when bookings are cancelled, so values get reissued and collisions get more likely the longer it runs. Two customers with the same ref means Neil cancels one and both vanish. Replace with:

```js
const ref = 'AES-' + Date.now().toString(36).slice(-4).toUpperCase()
          + Math.random().toString(36).slice(2,4).toUpperCase();
```

Change the admin cancel (the `t.dataset.ref` branch in `admin.html`) to act on exactly one row by primary key.

### 10. Escape output in the admin diary
**Who:** Claude · **Time:** 45 min · **Unblocks:** removes the stored-XSS path into Neil's browser
`admin.html:155-165` interpolates `b.name`, `b.svc`, `b.model`, `b.phone` and `b.ref` straight into `innerHTML`. A booking named `<img src=x onerror=…>` runs arbitrary script on the site's own origin the moment Neil opens the diary — exfiltrating the full customer list to any domain, rewriting the diary, or repainting the page he is looking at. Build the rows with `createElement`/`textContent`, or route every interpolated value through an escape helper. Also fix `js/shared.js:18`, where `toast()` assigns its message via `innerHTML` — `admin.html` feeds it `b.time` from the store. (`index.html` is already clean here: `doneLine` uses `textContent` and `typeInto()` at `shared.js:33` assigns `textContent`.)

### 11. Stop caching customer records on visitors' devices, and fix the privacy notice to match
**Who:** Claude · **Time:** 20 min · **Unblocks:** the Art 5(1)(c)/(f) data-minimisation point
`js/cloud.js:15` and `:24` write the whole document to `localStorage.aesir_dbcache` — a persistent copy of other customers' names and mobiles on a stranger's machine, surviving browser restart. Step 7 largely self-heals this on the public page (anon only ever receives `iso` + `slot_time`), but `cloud.supabase.js:78` still caches the **full** record for a signed-in admin. Cache availability only, rename the key so it is obvious it holds no personal data, and **rewrite `privacy.html:146`**, which describes this storage as "strictly functional" without disclosing what was in it.

### 12. Fix the processor and transfer wording in the privacy notice
**Who:** Claude (draft) + Neil (approve) · **Time:** 30 min · **Unblocks:** step 19
`privacy.html:139` currently claims reliance on providers' international-transfer safeguards. Once the data is in Supabase eu-west-2 with their published DPA signed, name Supabase and GitHub Pages as processors and say the booking data is held in the UK. **UK GDPR Art 28(3) requires a written contract with any processor** — that is a hard requirement, and it is one reason JSONBlob can never be the answer: there is no DPA and no identifiable counterparty. If you end up with a non-UK region, the transfer question comes back and needs proper advice rather than a paragraph from me.

### 13. Check closed days at submit time
**Who:** Claude · **Time:** 10 min · **Unblocks:** customers driving to a locked gate
`index.html:971` re-reads the diary fresh but the guard at `:972` only calls `isTaken()`. Add the closure check so a day Neil closed while the customer had the widget open cannot be booked, with a message that distinguishes "that day just closed" from "that slot just went".

### 14. Basic form validation and abuse controls
**Who:** Claude · **Time:** 45 min · **Unblocks:** honest junk data reaching Neil
`maxlength` on all four inputs (name 60, phone 20, reg 10, model 40), a UK mobile format check, a hidden honeypot, and a minimum time-on-form. These stop mistyped numbers and casual junk — real rate limiting has to be enforced server-side and rides along with a future edge function.

### 15. Wire the booking notification
**Who:** Tom · **Time:** 1 hr · **Unblocks:** the entire feature being operationally usable
The payload is already assembled at `index.html:982-985` and the POST is already written — `BOOKING_WEBHOOK` at `index.html:891` is just empty. Paste an inbound webhook URL from GoHighLevel, Make or Zapier and build **one** workflow: SMS to 07956 658177 on every booking, containing time, day, service, name, phone, reg. Without this the system is pull-only forever: a customer books 08:00 tomorrow at 11:58pm, Neil doesn't open the diary, and a stranger arrives at Pond Farm with a car he knows nothing about. Add a customer-facing confirmation SMS in the same workflow — that is also what makes the corrected `faq.html:66` answer eventually upgradeable.

### 16. Neil's capacity model
**Who:** Neil (15 min conversation) then Claude (3 hrs) · **Unblocks:** a deliverable diary
Two questions: how many cars a day will he actually accept, and which services need a whole day or longer? Then encode per-service durations so a booking consumes the slots it spans, cap bookings per day, and set a minimum lead time (e.g. nothing inside 12 hours). **Bench the big jobs** — Engine Rebuilds and Classics should be an enquiry/callback, not a self-serve slot. Right now an S85 V10 rebuild and an oil change occupy the same 30-minute slot and the widget will sell forty of them a week to one man with three ramps.

### 17. Publish an email address
**Who:** Neil (supplies) → Claude (publishes) · **Time:** 5 min · **Unblocks:** an e-commerce disclosure duty
There is no `mailto:` anywhere in the repo — I grepped. **Reg 6(1)(c) of the Electronic Commerce (EC Directive) Regulations 2002 requires a service provider to give contact details "including his electronic mail address."** It is the one channel named in the regulation and a WhatsApp link does not satisfy it. Put it on `contact.html`, in the footer, in `privacy.html §01` and in the JSON-LD.

### 18. Backup and restore, proved once
**Who:** Tom · **Time:** 1 hr · **Unblocks:** the availability half of Art 32
Supabase free tier does not include automated backups. Add a scheduled export (nightly `pg_dump` or a CSV dump of `bookings`) **and restore it once before go-live** so you know it works. Schedule `purge_old_bookings()` (already in `setup.sql:69`) with pg_cron or run it manually so personal data doesn't accumulate indefinitely.

### 19. Neil signs off — the actual gate
**Who:** Neil · **Time:** 45-min call + a 30-min visit · **Unblocks:** removing the noindex
One session, everything on the agenda:
- **Privacy notice** — read `privacy.html` line by line. He is publishing binding positions on retention (six years, matching HMRC's record-keeping period), a one-month DSAR response (matching UK GDPR Art 12(3)) and a no-marketing commitment. The document is sound; he just has to have read it.
- **Photographs** — written approval for the 13 Instagram-sourced images, photo by photo, including his position on customer cars and readable plates. Specifically: `img/i8.jpg` shows an identifiable person (posing, so consent is plausible — but confirm) and is also a bad evidence choice for the electrical-coding card since it's a forecourt shot, not workshop work. The Ferrari-event photo is not a job, not at Pond Farm and not a customer's car, on the one page arguing that everything on it is.
- **Substantiation** — what does "Master Technician" refer to (IMI? BMW's programme? time served?); what diagnostic platform backs "dealer-level" (used ~15 times across the site); what refrigerants does his air-con machine cover and what qualification does he hold; can he actually write to BMW's digital service history, or does he stamp a book and reset the interval? Keep proof on file — Trading Standards asks for exactly that. Where a claim can't be substantiated, replace it with something true and equally strong.
- **Hours** — does he take weekend work, on what terms? Then make all five surfaces plus `buildDays()` agree.
- **Prices** — the diagnostic/inspection fee, a "from" for an interim and a full service, and his VAT status. If VAT-registered, **reg 6(1)(f) of the E-Commerce Regs requires the VAT number on the site.** Also confirm or drop the `"priceRange": "££"` at `index.html:63` — it is a public positioning statement he has never seen.
- **ICO fee** — under the Data Protection (Charges and Information) Regulations 2018 most controllers processing personal data electronically must pay; several purposes are exempt, so run the ICO's own self-assessment rather than assuming. Tier 1 is £52/year (£47 by direct debit). Put the registration number in the privacy notice if it applies.
- **The BMW M tricolour.** `css/site.css:20-21` comments the palette as sampled from Æsir's existing logo, so the site is reproducing his brand, not creating this. That means changing three CSS variables changes the website and leaves the real exposure — signage, van, Instagram — untouched. Referring to "BMW" descriptively is protected under s.11(2) Trade Marks Act 1994 and the "NOT AFFILIATED WITH BMW AG" footer helps; the *stripe device used as his own mark* is a different question. It is his brand, his risk, his call — but he should be making it knowingly, and the website is the cheapest place to start if he decides to shift.
- **Sign-off in writing** before anything comes off noindex.

### 20. Launch commit
**Who:** Claude · **Time:** 15 min
Remove the noindex from the eleven public pages, set `privacy.html` back to indexable, deploy, verify. Do this in the same commit as the domain swap (step 21) so the URLs are right first time.

---

# B. Must happen before promoting the site anywhere

*Sequencing matters here more than anywhere else: submitting the business to directories against a `github.io` URL poisons the citation graph, and Foursquare/Yelp edits take weeks to propagate.*

### 21. Buy and wire the custom domain
**Who:** Tom (Neil pays / owns) · **Time:** 30 min work + up to 24h DNS/HTTPS wait · **Unblocks:** 22, 23, 24, 25
**Buy `aesirautomotive.co.uk` in Neil's name** (Cloudflare Registrar or Namecheap, ~£8-12/yr) — check availability first. Then:
1. Create a file named exactly `CNAME` (no extension) in the repo root containing one line: `aesirautomotive.co.uk` — no `https://`, no trailing slash.
2. GitHub repo → **Settings → Pages → Custom domain** → `aesirautomotive.co.uk` → Save.
3. Registrar DNS panel → four **A** records on the apex (`@` or blank): `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`. If IPv6 offered, **AAAA**: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`.
4. One **CNAME** record: host `www` → `thomasrgriffiths08-blip.github.io.` (with the trailing dot).
5. Wait for GitHub's DNS check to go green, then tick **Enforce HTTPS**. The Let's Encrypt cert can take up to 24h — if the box is greyed out, come back tomorrow.
6. Rewrite the absolute URLs. **The `/aesir-automotive` path prefix disappears** — a custom domain on a project repo serves at the domain root. There are currently **82 occurrences across 20 files** (I counted):
   ```
   cd /Users/tom/Applications/bmw-specialist && \
   grep -rl 'thomasrgriffiths08-blip.github.io/aesir-automotive' . --exclude-dir=.git | \
   xargs sed -i '' 's|https://thomasrgriffiths08-blip.github.io/aesir-automotive|https://aesirautomotive.co.uk|g'
   ```
   Then grep for any stray `thomasrgriffiths08-blip` and fix by hand — `robots.txt:53` has a Sitemap line and a commented replacement at `:54-55`.

GitHub 301-redirects the old URLs automatically, so nothing indexed is lost.

**Also move the repo** to an account Neil controls or a named agency org. His business's entire web presence currently lives inside your personal GitHub account; if it is renamed or closed, the site and every indexed URL die and he has no recovery route.

### 22. Fix the dangling schema entity
**Who:** Claude · **Time:** 15 min · **Unblocks:** consistent entity identity across the site
`index.html:24` declares `"@id": "https://aesirautomotive.co.uk/#business"`. All nine service pages declare `"provider": {"@id": "https://thomasrgriffiths08-blip.github.io/aesir-automotive/#business"}`. They do not match, so nothing reconciles. **The sed in step 21 fixes this automatically** — after it, grep `#business` across the repo and confirm every occurrence is byte-identical, then validate `index.html` and one service page in Google's Rich Results Test. (Note: matching @ids does not make the service pages *inherit* address/phone/rating — Google parses per page, so a bare `@id` reference to a node defined elsewhere stays an unresolved stub. What it buys is a consistent identifier for cross-page reconciliation. Worth having, but don't oversell it.)

### 23. Complete the business entity in schema
**Who:** Claude · **Time:** 15 min · **Unblocks:** knowledge panels and AI answer cards
The `AutoRepair` node in `index.html` has no `url`, no `image` and no `logo` — I checked. Add, with absolute URLs (relative paths are invalid in JSON-LD image fields):
```json
"url": "https://aesirautomotive.co.uk/",
"image": ["https://aesirautomotive.co.uk/img/workshop.jpg",
          "https://aesirautomotive.co.uk/img/v10-engine.jpg",
          "https://aesirautomotive.co.uk/img/og.jpg"],
"logo": "https://aesirautomotive.co.uk/apple-touch-icon.png"
```
Do it in the same pass as step 21.

### 24. Google Business Profile
**Who:** Neil (owns the listing) + Tom · **Time:** 45-60 min · **Unblocks:** the single biggest local lever
**Verify the website field is actually empty before telling Neil it is** — the evidence for that is an unticked box in your own notes, not an observation. Then, at `business.google.com`:
1. **Settings → People and access** → add Tom as Manager.
2. **Website** → `https://aesirautomotive.co.uk`.
3. **Primary category** → "Auto repair shop". Secondary → "Car repair and maintenance service", "Engine rebuilding service", "Auto machine shop", "Auto electrical service", "Auto air conditioning service", "Brake shop". **Do not add "BMW dealer" — he isn't one.**
4. **Hours** → whatever step 19 settled, plus Special Hours for bank holidays.
5. **Drag the map pin onto the actual unit** at Pond Farm, not the farm entrance off Newyears Green Lane.
6. **Service areas** → Uxbridge, Harefield, Ickenham, Ruislip, Denham, Rickmansworth, Hillingdon.
7. **Description** (750 chars) → reuse `llms.txt:3-7`, keeping "independent BMW specialist", "Uxbridge" and "engine rebuilds".
8. **Services** → all nine, named identically to the site's service pages.
9. **Photos** → 15-20 of Neil's originals plus logo and cover.
10. Copy the short review link (Business Profile → "Ask for reviews") and keep it.
11. **Appointment/booking link → only after step 7 has landed.** Setting it now routes Google's own booking traffic straight into the public JSONBlob.
12. Add the GBP share link (Business Profile → Share) to the `sameAs` array at `index.html:59` — that array currently has Instagram and Companies House but not the Maps listing, which is the strongest entity-reconciliation signal available.

If Neil has lost access to the listing: find it in Maps → "Claim this business" → ownership request → 7-day wait. Start this early.

### 25. Search Console and Bing
**Who:** Tom · **Time:** 25 min setup · **Unblocks:** any visibility into whether this works
`robots.txt` and `llms.txt` currently sit at `/aesir-automotive/robots.txt`, not the host root, so **no crawler has ever read either of them** — the entire AI-crawler allow-list at `robots.txt:11-49` and the Sitemap line at `:53` are decorative. Step 21 fixes that by itself. Then:
1. `search.google.com/search-console` → Add property → **Domain** (not URL prefix) → `aesirautomotive.co.uk` → copy the TXT record into the registrar's DNS → Verify. (The Domain property type is only available because you now control DNS — another reason the domain comes first.)
2. Sitemaps → `sitemap.xml` → Submit. It currently lists 18 URLs.
3. URL Inspection → Request Indexing for the homepage and engine-rebuilds, diagnostics, servicing.
4. `bing.com/webmasters` → Add site → **"Import from Google Search Console"** (one click, carries verification) → submit the sitemap.
5. `bingplaces.com` → **"Import from Google My Business"** → review and publish. This one action covers most of ChatGPT's local answers and all of Copilot.
6. Verify afterwards: `curl https://aesirautomotive.co.uk/robots.txt` and `.../llms.txt`.

### 26. Terms and complaints route
**Who:** Claude (draft) + Neil (approves the commercial terms) · **Time:** 3 hrs + sign-off
Write `terms.html` and link it in the footer next to the privacy notice. The most useful thing it does is state plainly that **the online booking is an appointment only and the repair contract is agreed in person at the workshop** — which is what actually removes the distance-selling question. (No payment is taken, no price is quoted anywhere on the site, and `faq.html:72` already says the price is agreed before work starts after inspection, so the repair contract is concluded on-premises. On-premises contracts carry no cancellation right, so the 14-day/reg 36 scenario the audit worried about doesn't arise on these facts. Publishing terms is commercially worth doing regardless.) Cover: price agreed before work starts; additional work authorised separately; payment terms; **storage charges for cars left after completion**; the **lien over an unpaid vehicle**; and a complaints route (who to contact, in writing to the registered office and by email, an acknowledgement timescale, escalation). Those middle items are what actually cause garage disputes, and they are Neil's commercial decisions, not drafting. Note that reg 19 of the ADR Regulations 2015 already requires per-dispute signposting once an internal complaints process is exhausted; joining The Motor Ombudsman is optional, but if he joins, saying so on the site becomes mandatory.

### 27. Delete `compare.html`
**Who:** Claude · **Time:** 2 min
An internal clip-shopping tool with your working notes in it, sitting on the client's public site in the client's branding, listing `hero.mp4` beside three Pexels URLs. It's noindexed and robots-disallowed so nobody will stumble on it via search, but `robots.txt:9` points straight at it. Delete the file and that Disallow line. (`DEPLOY.md:70` is the file that states the hero is stock outright, and that one isn't deployed.)

### 28. Replace `img/og.jpg`
**Who:** Claude (once Neil supplies a photo) · **Time:** 10 min
It is a frame from the stock hero video — a foreign car in Iceland. It is the share image on 17 of the 24 HTML files, so every WhatsApp, Facebook and LinkedIn share of the site shows a car that isn't Neil's, in a country that isn't the UK. One file, all 17 pages fixed. Also reword `gallery.html:67` so the "no stock photos" claim scopes to the gallery, and get 20 seconds of Neil's own footage to replace the hero when you can.

### 29. Fix the service-page nav and footers
**Who:** Claude · **Time:** 1 hr
The nine service pages run a different nav from every other page (Services / Workshop / **Systems** / Reviews / Find us vs Services / Work / Why us / Reviews / Contact), and the Systems item points at a homepage anchor that no longer exists. Point them at `../gallery.html`, `../why-us.html`, `../reviews.html`, `../contact.html`, and replace the thin footer with a real one containing every top-level page — that single change also de-orphans `faq.html`, which carries 14 marked-up questions and is currently reachable from almost nowhere. Add a "Where we are" NAP line linking to `contact.html` at the foot of each service page.

### 30. Add real structured data to `contact.html`
**Who:** Claude · **Time:** 45 min
It is the highest local-intent page on the site — where they are, what the hours are, what the number is — with the full NAP as visible text at `contact.html:66-73` and nothing machine-readable. **Emit the full `AutoRepair` node there** (reusing the same `@id` so both pages describe one entity), not just a reference to it — a bare `@id` pointing at a node defined on another page gives a per-page parser nothing. Add a `BreadcrumbList` matching the pattern at `services/engine-rebuilds.html:16`. Same treatment for `about.html` (plus `AboutPage`), `reviews.html`, `gallery.html`, `why-us.html`, `cars-we-work-on.html`.

---

# C. Makes it genuinely good

### 31. Get a photograph of Neil
**Who:** Neil + Tom · **Time:** 30-min visit
The entire trust argument is "you deal with the mechanic" and the mechanic is invisible. One workshop portrait, one shot of him working, one 20-second phone video for the About page. Cheapest item on this list, largest effect on bookings. Take them on the sign-off visit.

### 32. Get the camera-roll originals
**Who:** Neil (AirDrop) + Claude · **Time:** 30 min to ask, 2-3 hrs to process
The site's photos are Instagram-resized copies — 640px at best, and three are smaller (332px, 332px, 400px). They were correctly sized for a phone and are now badly undersized for the desktop editorial layout, up to 2.93× upscaled (5.85× on a retina screen). Ask for ~1600px sources for the essay plates and ~1400px for the services stage, then generate 2-3 renditions each and add `srcset`/`sizes` plus `width`/`height` to every `<img>`. Interim: cap `.row-open .pl-img` and `.row-wide .pl-img` heights so the upscale stays under ~1.2×, and move `z3-sunset` (332×229) out of the 4:5 portrait stage. Separate real bug worth fixing here: `css/site.css:271` sets `.lb img{max-width:88vw;max-height:74vh}` — those are ceilings, so clicking a thumbnail to enlarge it can render the image *smaller* than the grid thumbnail was.

### 33. Fix the keyboard-invisible focus ring
**Who:** Claude · **Time:** 30 min
`css/site.css:283` sets `:focus-visible{outline:2px solid var(--acc);outline-offset:3px}` — but `.btn` at `css/site.css:106` carries `clip-path:polygon(...)`, which clips the outline away. A keyboard user tabbing to "Confirm booking" sees nothing, on every CTA on the site. Use an inset ring, which survives clipping:
```css
.btn:focus-visible{outline:none;box-shadow:inset 0 0 0 2px #fff, inset 0 0 0 4px var(--acc)}
```
Verify against both `.btn` (blue fill) and `.btn.ghost` (transparent), and mirror into `404.html`. This is a **WCAG 2.4.7 Focus Visible (AA) failure**. To be accurate with Neil: the Equality Act 2010 applies to him as a service provider and imposes a duty to make **reasonable adjustments** — it does not make WCAG conformance a legal requirement. The regulations that do mandate WCAG AA (PSBAR 2018) apply to public sector bodies, not private limited companies. Present it as a real accessibility failure and reasonable-adjustments exposure, not as breaking the law.

### 34. Make the gallery lightbox keyboard-operable
**Who:** Claude · **Time:** 1-2 hrs
The 12 `.shot` divs in `gallery.html:126-137` (and the rest of the grid) are `<div>`s with no `tabindex` and no key handler — a keyboard or switch-access user cannot open a single photo on the page the site itself calls "the proof". Meanwhile the closed dialog leaves three invisible tab stops announced as "Close", "Previous", "Next". Make the thumbnails `<button type="button">`, toggle `hidden` on `#lb` alongside `.open`, add `aria-modal="true"`, move focus to `.lb-x` on open and restore it to the originating thumbnail on close. **WCAG 2.1.1 (A) and 4.1.2.**

### 35. Progressive enhancement for the page reveal
**Who:** Claude · **Time:** 1-2 hrs
Everything below the hero — services, reviews, booking widget, phone number — is `opacity:0` until JS succeeds. A blocked script, a content blocker, or one transient 404 on GitHub's CDN leaves the customer looking at a hero image and a void. Make `.rv` an enhancement: leave elements visible by default and have `shared.js` add a `js` class to `<html>` that switches on the `opacity:0` start state. Same for `.veil` and `.hero-inner>*`. Wrap the booking bootstrap in try/catch leaving the WhatsApp link and phone number as the visible fallback. (`css/site.css:103` already exempts `.rv` under `prefers-reduced-motion: reduce`, and `#cine` carries `hidden` in markup, so there are no black bars in the no-JS state — but the H1, CTAs and nav still don't appear.)

### 36. Form labels and contrast
**Who:** Claude · **Time:** 1 hr
The four booking inputs (`index.html:640-644`) have placeholders and four semantically inert orphan `<label>` elements. The inputs *do* get accessible names from the placeholder fallback, so screen readers and voice control aren't dead — but the hint vanishes the moment the customer types, so someone who tabs away and back can't tell which box holds the phone number and which holds the reg. Add real `<label for="…">` elements, convert the orphan labels to `<span>` + `aria-labelledby` + `role="group"` on the chip containers, and lift `::placeholder` above 4.5:1 (roughly `#737e91` or lighter — `#6f7a8c` measures 4.42:1 on `--bg2` and still fails). **WCAG 1.3.1 (A) and 1.4.3 (AA).**

Separately, `--dim` at `css/site.css:11` is `#5b6472`, which measures **3.29:1** and is used for real body copy at 13.5px — under the 18.66px bold / 24px regular threshold where the large-text allowance would apply. Lift it toward `#7d8797` (5.42:1, so there's headroom to go darker if it reads too close to `--mut`), or move the eight body-copy usages to `--mut`.

### 37. Announce booking errors and success
**Who:** Claude · **Time:** 1 hr
`index.html:964-967` writes the validation message into the button label for 1.8 seconds — nothing is announced, so a screen-reader user pressing Confirm with a field missing perceives no reaction at all. And at `:992-993` the form is hidden while focus is on the now-hidden button, so focus falls to `<body>` and the customer never hears "You're booked in" or the reference. Add a persistent `<div role="alert" aria-live="assertive">` above the button, give the success panel `role="status"` + `tabindex="-1"` + `.focus()`, and mark `#wStep` (`:951`) `aria-live="polite"`. **WCAG 4.1.3 (AA).**

### 38. Respect reduced-motion, add a video pause
**Who:** Claude · **Time:** 1 hr
`prefers-reduced-motion: reduce` should pause the marquee's `animation-play-state`, set `scroll-behavior:auto`, and — in the video bootstrap at `index.html:837-855` — simply never call `startVideo()`. `.hero-poster` already fills the frame, so the fallback is free. Then add a small pause/play toggle in the hero corner for everyone else. **WCAG 2.2.2 Pause/Stop/Hide (A)** requires a mechanism for auto-starting motion running over 5 seconds; the looping hero video and the 32s marquee both qualify. (The `#cine` intro does **not** — it has a Skip button at `index.html:398` wired at `:874` and self-terminates at 2.2s.)

### 39. Cut the hero video weight
**Who:** Claude · **Time:** 2-3 hrs including re-encodes
Desktop first load is 8.14 MB, 7.74 MB of it the hero video, and **GitHub Pages hard-codes a 10-minute cache ceiling with no override**, so a customer who returns the next day downloads all of it again. Note the page does *not* hang on it — `index.html:122-123` keeps the video at `opacity:0` and `index.html:424` paints `video/poster.jpg` (141 KB) immediately, and browsers give media requests low network priority. The real costs are the customer's data allowance and bandwidth contention with the photos. Three changes: set `preload="none"` **and remove `autoplay`** (the attribute alone changes nothing while `index.html:853`/`:878-879` call `vid.play()` explicitly), start on `canplay`; re-encode at `-crf 30 -preset slow -vf scale=1600:-2 -movflags +faststart` (1920×1080 at 4.76 Mbps for a 13-second silent loop is ~3× over-bitrate) with a VP9/AV1 sibling via `<source>`; and switch the rendition test from viewport width to `navigator.connection.effectiveType`/`saveData` with the 820px query as fallback, so a laptop on a hotspot doesn't get the full-fat file. Don't bother stripping audio — `ffprobe` shows both renditions already have a single video stream.

### 40. Trim the intro
**Who:** Claude + Neil's opinion · **Time:** 1 hr
It's not a black screen — the poster, wordmark and caption show through the letterbox from frame one, there's a Skip button, and it's `sessionStorage`-gated so it plays once per session. But it still holds the H1 and CTAs for ~2.6s with a full settle at ~3.5s. Cut the hold from 2200ms to ~900ms, reveal the hero content in parallel with the bars retracting rather than after, drop the `reloaded` branch at `index.html:830-831` so a hard refresh doesn't replay it, and wrap `#cine` in `@media (prefers-reduced-motion: no-preference)`. **Show Neil both versions before deciding** — it's a real brand asset, currently priced in seconds of customer patience.

### 41. Self-host the fonts
**Who:** Claude · **Time:** 1 hr across 23 pages
Two variable fonts, 66 KB — the payload is fine. The cost is a render-blocking stylesheet on a third-party origin: DNS + TLS + request before first paint even with preconnect, typically 200-500ms on 4G. Download the two latin `.woff2` into `/fonts`, add `@font-face` with `font-display:swap` to `css/site.css`, preload both, and delete the three `fonts.googleapis.com` lines from every page. This also removes the last third-party call from the site. (Minor: `→` is U+2192, outside Google's latin subset, so every arrow already falls back to a system glyph.)

### 42. Make the admin diary Neil's actual diary
**Who:** Claude · **Time:** 3 hrs · **This is what decides whether the feature survives month two**
Today Neil can only delete a booking, never move it, and can't add one at all — so when someone books over the phone (which is how most of his work arrives) he can only block the slot, losing who it is and what car. He ends up keeping a paper diary and the website's becomes an unreliable duplicate he stops opening. Add: an **add-booking form** (name, phone, car, service, slot); a **reschedule** action that moves a booking rather than deleting it; a **one-tap call/WhatsApp link on every row** so cancelling or moving always ends in contacting the customer; and a **"today and tomorrow" summary at the top**, so the first thing he sees is his next 24 hours, not 14 days of grid. Also make the admin horizon match or exceed the widget's, and move `TIMES`, the day horizon and the weekday rule into `js/cloud.js` (loaded by both pages) so the public widget and the admin grid can't silently desynchronise.

### 43. Give the customer something that survives a refresh
**Who:** Claude · **Time:** 2 hrs
The on-screen confirmation at `index.html:991` does end with "Need to change it? Call or WhatsApp 07956 658177", and there's a WhatsApp link at `:649` — so they're not left with nothing. But refresh the page and the reference is gone. Add an optional email field and a client-side generated **"Add to calendar" .ics** download, which works with no backend and puts the address, ref and time straight into their phone's calendar. Make the reference block copyable.

### 44. Consent wiring before the first number is collected
**Who:** Claude + Neil's decision · **Time:** 1 hr
Nothing is sent today so nothing is currently infringing — but the refusal mechanism has to be on the form **before** the first mobile number is captured, because a number collected without it cannot be brought inside the soft opt-in retrospectively. **PECR reg 22 requires consent before unsolicited direct marketing by electronic mail, which includes SMS.** The soft opt-in relief needs three things together: the number obtained in the course of a sale or negotiations for a sale, marketing for similar products or services, **and** a simple free means of refusing given both at collection and in every subsequent message. Add: "We'll text you about this booking. Tick here if you'd also like MOT and service reminders — you can stop them any time by replying STOP." Record the choice with the booking, honour it in any future workflow, put STOP in every marketing text. Booking confirmations and day-before reminders for work already booked are service messages and need none of this — keep them separate from the marketing flag. An MOT-due reminder that also promotes booking the work in is marketing; that distinction is where garages get caught.

### 45. Kill the review-gating design before it ships
**Who:** Neil's decision, in writing · **Time:** 1 hr to redesign
`systems/reviews.html` routes sub-four-star customers away from the public review form. Nothing is deployed (noindex, robots-disallowed, linked only from `admin.html:100`), but it is being pitched to Neil as a feature. **Google's own review policies prohibit it**, and the 5.0/20-review listing is the single strongest asset the whole site is built on — putting it at risk of removal is not worth any upside. (The stronger claim that it's "a banned practice under the DMCC Act 2024" isn't supportable — Schedule 20 bans fake reviews, commissioning them, publishing without reasonable screening steps, and concealed incentivised reviews; gating isn't listed. The CMA's position is that selectively soliciting only satisfied customers can be a misleading practice under the general prohibitions — fact-specific, not per se. Google's policy is enough on its own.) Send everyone the same link; use the private follow-up for everyone rather than as a filter.

### 46. Homepage title and H1
**Who:** Claude · **Time:** 20 min
`index.html:6` leads with a brand nobody is searching for yet, and `index.html:435` renders an H1 with no location in it. Nobody in Uxbridge types "Æsir Automotive" — they type "BMW specialist Uxbridge". Use `BMW Specialist Uxbridge — Servicing, Diagnostics & Engine Rebuilds` (66 chars — the longer version with the brand tacked on runs to 84 and truncates at ~60 in Google's results, cutting off the very brand it was trying to keep). Change the H1 to "Independent BMW Specialists, Uxbridge". Revisit in 6-12 months — once the brand has recognition, leading with it becomes right.

### 47. Reconcile the hard-coded review figures
**Who:** Claude · **Time:** 30 min
"5.0" and "20" appear in ~26 places including the `aggregateRating` at `index.html:47`. It's presumably accurate today, so nothing is currently false — but the day a 21st review or a four-star lands, 26 places are wrong at once. Hold both numbers in one place in `js/shared.js` and inject them so a single edit updates the schema, the hero badge, `reviews.html` and `llms.txt` together. Date-stamp the claim ("as at August 2026"). Replace the static "5 months ago" with a fixed date or nothing. Set a quarterly reminder to reconcile against the live GBP count. **Don't promise Neil star ratings in search results from this markup** — Google doesn't show review snippets from a business's own markup about itself for LocalBusiness.

Two review-integrity fixes that are not maintenance: `index.html:687` presents *"I was recommended to Neil by another garage that couldn't economically fix my BMW 320i. The service was professional, fairly priced, and completed to a high standard."* as a single quote from Jagdeep — that splices Jagdeep's opening sentence onto the sentence `reviews.html:92` attributes to an unnamed reviewer. **A composite quote attributed to a named real person, on the homepage, is a worse problem than the anonymous one.** Fix both: link each quote to its actual Google review, and drop or properly attribute the unattributed one. Also reconcile the demo seed data in `systems/reviews.html`, which records a named reviewer at four stars, directly contradicting "Twenty reviews, not one below five stars" at `why-us.html:81`.

### 48. Captions the photographs don't support
**Who:** Claude + Neil · **Time:** 20 min
`img/spirit-rolls.jpg` is a 400×235 crop showing a gold panel above a chrome "ROLLS" plaque. It cannot support `gallery.html:110-111`'s caption about "the gold-finished housing for the retracting mascot mechanism, off the car and on the bench next to the Ghost's grille" — cut the caption back to what's visible or get the original frame. And confirm whether the V10 car was a saloon or a Touring: "E60 M5 Touring" (`gallery.html:78`, `:127`, `llms.txt:33`) is a contradiction in terms the target customer spots instantly, on the flagship engine-rebuild story, repeated in the file that feeds AI search. Also get a current photo of the premises — the only workshop shot is nearly four years old and appears to show a fit-out in progress, on a site whose whole argument is "this is a real workshop".

### 49. Location pages
**Who:** Claude (needs Neil's input) · **Time:** 2-3 hrs for two real pages
Someone in Ruislip searching "BMW garage Ruislip" finds nothing with those words on it — `areaServed` in schema is a claim, not content, and engines rank pages. **Do not mass-produce near-identical town pages**; thin doorway pages are penalised and would undo the work. Write two genuinely different ones — Harefield and Ruislip are nearest and the real catchment — each with its own driving directions from that town, a job actually done for a customer from there, and which BMW models are common locally. That needs Neil's input. Note the cheap half is already partly done: `index.html:746` renders "between Harefield, Ickenham and Ruislip on the north-west edge of London" as visible copy and `contact.html:60` reads "on the green lane between Harefield and Ickenham" — what's genuinely missing is Ruislip/Rickmansworth/Watford in body copy on the subpages.

### 50. Remaining tidy-ups
**Who:** Claude · **Time:** ~2 hrs total
- **Landmarks and skip links** — no `<main>` and no skip link on any public page, so a screen-reader user re-traverses the logo and five nav links every time. Wrap each page's body content in `<main id="main">` and add an off-screen-until-focus skip link. On `gallery.html`, promote `.ev-txt b.t` to `<h2>` and give the photo grid a visually-hidden heading — heading navigation currently surfaces one item for the entire document.
- **CSP** — add `<meta http-equiv="Content-Security-Policy">` with a restrictive `default-src` and a `connect-src` limited to the Supabase origin, plus `<meta name="referrer" content="strict-origin-when-cross-origin">`. Not a legal requirement, but it's the standard second line of defence behind step 10, and its absence is what an assessor notes after finding an XSS. Full header control (including `frame-ancestors`, which meta tags can't set) needs a host that sets headers — Cloudflare Pages or Netlify would give that free at the same time as the domain.
- **Cookie/storage** — self-hosting the fonts (step 41) removes the Google transfer entirely. Replace the Maps iframe with a static image or a "Show map" button that only loads the iframe on click, and the remaining first-party storage is covered by the privacy notice with no banner needed at all. **PECR reg 6 covers localStorage and sessionStorage, not just cookies.** In fairness the exposure is about as low as it gets: no analytics, no ad pixel, no tracking; `aesir_dbcache` is arguably strictly necessary for the booking feature the visitor asked for (reg 6(4)), leaving the intro-animation flag as the only genuinely non-exempt item.
- **Sitemap** — add `<lastmod>` to each entry, drop every `<priority>` (Google ignores them) and the stray `changefreq` at `sitemap.xml:21`. Add `og:url` to each subpage matching its existing canonical. Do it in the same commit as step 21.
- **Compositor load** — change `body::after` from `inset:-100%` to `inset:0` and drive the grain with `background-position`; bake `saturate(.9) contrast(1.06)` into the video encode (`-vf eq=saturation=0.9:contrast=1.06`) rather than paying for it at runtime; disable the ken-burns and the nav/mobar `backdrop-filter` under `(max-width:960px)`. All cheap and sensible — but note nothing here was profiled, so treat it as tidying rather than a fix for a demonstrated problem.
- **Duplicate FAQ schema** — `index.html:66-85` and `faq.html:16` both carry `FAQPage`. Google restricted FAQ rich results to government and health sites in August 2023, so neither will produce one. It's not causing harm and AI answer engines do parse it — leave both, stop treating it as an SEO lever, and don't expand it.
- **Areas served** — `index.html:43` lists Rickmansworth and Watford; the nine service pages don't. Agree the list with Neil, make all eleven files plus `llms.txt` identical, and put a plain "areas we cover" line on `contact.html`.
- **Address rendering** — I checked the Companies House record for 12705996: the registered office is "Aesir Automotive Ltd, 3d Pond Farm New Years Green Lane, Harefield, Uxbridge, England, UB9 6LX", and **every footer already matches it exactly**, so reg 25 of the Companies (Trading Disclosures) Regulations 2015 is satisfied on all four required elements. **Do not touch the footer string.** The variants are in `contact.html:66` ("Newyears Green Lane, Newyears Green") and `privacy.html:94` ("New Years Green Lane, Harefield") and the JSON-LD at `index.html:34` — normalise those *toward* the footer. This is an SEO/NAP-consistency nit, not a compliance item.

---

# D. Ongoing operations

*Answer these before launch, not after. "Who checks the diary" is the question that decides whether this feature is real.*

### 51. Who checks the diary, and when
**Neil.** Once in the morning before the first car, once at end of day. That's the routine — but it only works because of step 15: the webhook means he doesn't *have* to remember, he gets a text. Without the webhook, this system is pull-only forever for a man who spends the day under a car, and it will fail. **The webhook is not an optimisation; it is the thing that makes the diary trustworthy.**

### 52. What happens when someone books at 11pm
The webhook texts Neil's mobile immediately. He reads it whenever he next looks at his phone — but the booking is already in Supabase and already in the diary, so the 08:00 slot is genuinely held. Set a minimum lead time in step 16 so nobody can book inside 12 hours and turn up before Neil has seen the text. Beyond that, decide with Neil whether first-time customers get a slot or a callback — an anonymous stranger with an unvalidated number holding tomorrow's first ramp and not appearing is the whole margin on that job, and Neil finds out at 08:15 with no time to backfill. A day-before reminder text (same workflow as step 15) is the single most effective thing against no-shows.

### 53. Backups
Nightly export running (step 18), **restore proved once**. Check the export is still producing files at the 30-day review. Free-tier Supabase gives you no automated backups, so this is your only copy.

### 54. Data retention
`purge_old_bookings()` (`setup.sql:69-72`) drops rows older than 30 days. Schedule it, or run it monthly. Keep an archive/export *before* deleting so Neil retains a customer history — but that archive is personal data too, so it lives somewhere private, not in the repo. Whatever you settle on must match what `privacy.html` says.

### 55. The maintenance list — put it in a calendar reminder, quarterly
- Reconcile the review count and rating against the live Google listing (until step 47's single-source change lands, that's ~26 places).
- Check Search Console → Indexing → Pages for exclusions.
- Check the nightly export is still running.
- Update `<lastmod>` in `sitemap.xml` when pages change.
- Re-read the MOT-prep and FAQ copy against what the business actually does — those are the two pages that drifted into untruth once already.

### 56. Annual
- ICO fee renewal, if step 19 determined it applies.
- Domain renewal (~£8-12), **in Neil's name**.
- Re-check the substantiation file — qualifications, diagnostic platform licence, F-Gas attestation — is current.

---

## The shortest honest summary for Neil

*"The site's built and it's good. Before a single customer books through it I'm moving the booking data off a temporary store onto a proper database in the UK, wiring it so you get a text the moment anyone books, and getting your sign-off on a handful of things only you can answer — your hours, your qualifications, your prices, and which of your customers' cars you're happy having on the website. Until that's done the booking form points at your phone and WhatsApp, which is where the work was coming from anyway."*