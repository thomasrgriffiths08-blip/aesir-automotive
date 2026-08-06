# Moving the booking diary off JSONBlob

**Do this before a real customer books.** Right now `js/cloud.js` keeps every
booking — name, mobile number, registration — in a JSONBlob document whose URL is
written in this website's own source code. Anyone who views source can read the
whole diary, change it, or wipe it. It was fine for showing Neil a demo. It is not
fine once a member of the public types their phone number into the form.

Total time: about 15 minutes. No card required — the free tier covers this easily.

---

## 1. Create the project

1. Sign up at [supabase.com](https://supabase.com) and create a new project.
2. Pick the London (eu-west-2) region — the customers and the data are in the UK.
3. Wait for it to finish provisioning (a minute or two).

## 2. Create the tables and the security rules

1. Open **SQL Editor** in the left sidebar.
2. Paste the entire contents of `setup.sql` and run it.

What that file sets up, and why it matters:

- `diary` — the slots Neil has blocked and the days he's closed. World-readable,
  because it contains no personal data.
- `bookings` — the actual customer records. **Anyone can add one** (that is the
  public booking form) but **nobody anonymous can read, change or delete one.**
- `taken_slots` — a view exposing only the date and time of booked slots, so the
  website can grey out what's gone without ever seeing who booked it.
- A `unique (iso, slot_time)` constraint, which is a real double-booking guard.
  Two people submitting the same slot in the same second cannot both succeed,
  no matter what the browser does.
- `purge_old_bookings()` — deletes bookings older than 30 days, so the site keeps
  the retention promise the privacy notice makes.

## 3. Create Neil's login

1. **Authentication → Providers → Email**: turn **off** "Enable sign-ups". There
   should only ever be one account.
2. **Authentication → Users → Add user**: Neil's email address and a strong
   password. Give it to him however you'd hand over any password — not by
   putting it in a file in this repo.

This replaces the `8177` PIN, which is currently readable in `admin.html` source
by anyone who looks.

## 4. Point the site at it

1. **Project Settings → API.** Copy the **Project URL** and the **anon / public**
   key.
2. Paste both into the top of `js/cloud.supabase.js`.
3. In `index.html` and `admin.html`, change the script tag:
   ```html
   <script src="js/cloud.js"></script>          <!-- old -->
   <script src="js/cloud.supabase.js"></script> <!-- new -->
   ```
4. In `admin.html`, replace the PIN gate with a sign-in form that calls
   `sbSignIn(email, password)` and boots the diary when it resolves true.
   `sbSignedIn()` and `sbSignOut()` are there for the rest of the flow.

> The anon key is *meant* to be public. It can only do what the SQL policies in
> step 2 allow. The **service_role** key is the dangerous one — it bypasses every
> policy. Never put it in a page, and never commit it.

## 5. Check it worked

Open the live site in a private window (so you are signed out) and:

- Book a test slot. It should confirm and give you a reference.
- Open the browser devtools Network tab and request the bookings table directly:
  `…/rest/v1/bookings?select=*`. **You should get back an empty list**, not the
  booking you just made. If you can see the name and phone number while signed
  out, stop and re-run `setup.sql` — that is the whole point of the migration.
- Sign in on `admin.html` and confirm the booking is visible there, and that
  cancelling it frees the slot on the public page.
- Delete the test booking when you're done.

## 6. Afterwards

- Delete the old JSONBlob document, or at least wipe its contents — Tom's real
  test booking is still sitting in it.
- Remove `js/cloud.js` from the repo so nobody wires it back in by accident.
- Update the privacy notice's "where it's stored" section to name Supabase and
  the region.
