# Æsir Automotive — Going Live

The whole site is static files. Any of these gets it online in ~10 minutes.

## Fastest: Netlify Drop (no account gymnastics)
1. Go to https://app.netlify.com/drop
2. Drag the whole `bmw-specialist` folder onto the page.
3. Done — you get a live URL like `aesir-automotive.netlify.app` immediately.
4. (Optional) Site settings → Domain management → add the custom domain.

## Alternative: GitHub Pages
1. Push this folder to a GitHub repo (it's already a git repo — `git remote add origin … && git push`).
2. Repo Settings → Pages → Deploy from branch → main → root.
3. Live at `https://<user>.github.io/<repo>/`.

## The domain (~£10/yr)
Buy `aesirautomotive.co.uk` (Namecheap / Cloudflare / Google Domains), point it
at the host, then find-and-replace the placeholder domain in:
- `index.html` (canonical tag — currently commented out; uncomment it)
- `sitemap.xml`
- `robots.txt` (Sitemap line)

## After it's live — 15-minute checklist
- [ ] Google Search Console → add property → submit sitemap.xml
- [ ] Point the Google Business Profile "Website" field at the domain
      (this is the big local-SEO unlock — Neil's profile currently has NO website)
- [ ] Test the WhatsApp link and phone links from a real phone
- [ ] Make the booking real: paste a webhook URL into `BOOKING_WEBHOOK`
      (top of the booking script in index.html). Any GoHighLevel inbound
      webhook / Make.com / Zapier hook works — bookings arrive as JSON.
- [ ] Add analytics if wanted: one script tag (Plausible is the clean option).
- [ ] Make og:image absolute (https://domain/img/og.jpg) and uncomment the
      canonical tag in index.html.

## Getting found by ChatGPT & AI search — the real playbook
On-site signals are DONE (robots.txt welcomes OAI-SearchBot/PerplexityBot/
ClaudeBot etc., llms.txt published, AutoRepair + FAQ schema). What moves the
needle now is off-site, because ChatGPT's local answers pull from **Bing's
index, Foursquare's Places API and Yelp** — not just websites:

1. [ ] **Bing Webmaster Tools** (bing.com/webmasters) — verify the domain,
       submit the sitemap. ChatGPT Search runs on Bing's index; no Bing = no
       ChatGPT. Enable IndexNow if the host supports it.
2. [ ] **Bing Places for Business** (bingplaces.com) — claim/create the
       listing, can import straight from the Google Business Profile.
3. [ ] **Foursquare listing** (foursquare.com/add-place) — ChatGPT's local
       results lean heavily on Foursquare's Places API. Free, 10 minutes.
4. [ ] **Yelp UK listing** (biz.yelp.com) — second major AI data source.
5. [ ] **NAP consistency** — the name, address and phone must be IDENTICAL
       everywhere: "Aesir Automotive Ltd · 3d Pond Farm, Newyears Green Lane,
       Uxbridge UB9 6LX · 07956 658177". Inconsistencies make AI engines
       drop the business from answers.
6. [ ] **UK citations** — Yell.com, Thomson Local, FreeIndex, Checkatrade/
       TrustATrader if Neil wants them. (Already listed on PreferredMechanic.)
7. [ ] **Keep Google reviews coming** — AI answers quote review language.
       Reviews that say "BMW specialist near Uxbridge" literally feed the
       phrasing engines repeat. The site's review-engine system does this.
8. [ ] Reality check: no code makes anyone "the best in the area" on every
       engine — rankings come from listings + reviews + consistency + time.
       Everything technical that CAN be done on-site is done; the 7 steps
       above are account work (~1 hour total) that needs Tom or Neil.

## Housekeeping notes
- `admin.html` (Neil's diary) and `compare.html` (clip picker) are noindexed
  and disallowed in robots.txt, but NOT password-protected — bookings are only
  stored in each visitor's own browser until the webhook backend exists, so
  there's nothing sensitive there yet. Revisit when a real backend lands.
- The hero video is self-hosted (`video/hero.mp4`, 7.7MB). If mobile data
  matters later, add a smaller 720p rendition + media query.
- Licences: hero video + gallery images from Pexels/Unsplash (free commercial
  use, no attribution required). Workshop photos are the client's own Instagram
  content — confirm with Neil before commercial launch.
