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
