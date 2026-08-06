/* ÆSIR cloud store — Supabase edition.
   Drop-in replacement for js/cloud.js: same dbGet()/dbPut() interface, so no
   other file needs to change except swapping the <script src> on index.html
   and admin.html.

   WHY SWAP: the JSONBlob version keeps customer names and phone numbers in a
   world-readable document whose URL sits in this site's own source. This
   version lets the public site create a booking and see which slots are gone,
   but only a signed-in workshop account can read who booked them.

   SETUP — three steps, about ten minutes:
     1. Create a free project at supabase.com.
     2. SQL editor → paste and run supabase/setup.sql (creates the tables,
        the row-level security policies and the public taken-slots view).
     3. Project Settings → API → paste the two values below, then point
        index.html and admin.html at this file instead of cloud.js.
   The anon key is designed to be public — it can only do what the SQL policies
   permit. Never put the service_role key in a page. */

const SB_URL = 'https://YOUR-PROJECT.supabase.co';
const SB_KEY = 'YOUR-ANON-PUBLIC-KEY';

const SB_REST = SB_URL + '/rest/v1';
const SB_AUTH = SB_URL + '/auth/v1';
const sbTok = () => { try { return JSON.parse(sessionStorage.getItem('aesir_sb') || 'null'); } catch { return null; } };
function sbHeaders(json) {
  const t = sbTok();
  const h = { apikey: SB_KEY, Authorization: 'Bearer ' + ((t && t.access_token) || SB_KEY) };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

/* ---------- workshop sign-in (replaces the client-side PIN on admin.html) ---------- */
async function sbSignIn(email, password) {
  const r = await fetch(SB_AUTH + '/token?grant_type=password', {
    method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!r.ok) return false;
  const d = await r.json();
  if (!d.access_token) return false;
  sessionStorage.setItem('aesir_sb', JSON.stringify(d));
  return true;
}
function sbSignedIn() { return !!(sbTok() || {}).access_token; }
function sbSignOut() { sessionStorage.removeItem('aesir_sb'); }

/* ---------- shared shape, identical to the JSONBlob version ---------- */
function dbNormal(d) {
  d = d || {};
  return { blocked: d.blocked || {}, closedDays: d.closedDays || [], bookings: d.bookings || [], updated: d.updated || 0 };
}

/* Signed out, `bookings` carries only {iso,time} — enough to grey out taken
   slots, and nothing a stranger could misuse. Signed in, it carries the full
   record so Neil's diary can show names and numbers. */
async function dbGet() {
  try {
    const staff = sbSignedIn();
    const [diaryRes, bookRes] = await Promise.all([
      fetch(SB_REST + '/diary?id=eq.1&select=*', { headers: sbHeaders(), cache: 'no-store' }),
      fetch(SB_REST + (staff ? '/bookings?select=*' : '/taken_slots?select=iso,slot_time'),
            { headers: sbHeaders(), cache: 'no-store' })
    ]);
    if (!diaryRes.ok || !bookRes.ok) throw new Error('rest ' + diaryRes.status + '/' + bookRes.status);
    const diary = (await diaryRes.json())[0] || {};
    const rows = await bookRes.json();
    const out = dbNormal({
      blocked: diary.blocked,
      closedDays: diary.closed_days,
      bookings: rows.map(b => ({
        ref: b.ref, iso: b.iso, time: b.slot_time, svc: b.svc,
        name: b.name, phone: b.phone, reg: b.reg, model: b.model,
        day: b.day, ts: b.created_at ? Date.parse(b.created_at) : 0
      })),
      updated: Date.now()
    });
    localStorage.setItem('aesir_dbcache', JSON.stringify(out));
    return out;
  } catch (e) {
    try { return dbNormal(JSON.parse(localStorage.getItem('aesir_dbcache'))); }
    catch (_) { return dbNormal(null); }
  }
}

/* The public page only ever ADDS a booking; the admin diary also blocks slots,
   closes days and cancels. Both go through here, and what actually succeeds is
   decided by the database policies, not by this file. */
async function dbPut(d) {
  localStorage.setItem('aesir_dbcache', JSON.stringify(d));
  try {
    const staff = sbSignedIn();
    let known = [];
    if (staff) {
      const r = await fetch(SB_REST + '/bookings?select=ref', { headers: sbHeaders(), cache: 'no-store' });
      known = r.ok ? (await r.json()).map(x => x.ref) : [];
    } else {
      const r = await fetch(SB_REST + '/taken_slots?select=iso,slot_time', { headers: sbHeaders(), cache: 'no-store' });
      const taken = r.ok ? await r.json() : [];
      known = taken.map(t => t.iso + 'T' + t.slot_time);
    }

    /* new bookings — a 409 here means someone took the slot first, which the
       unique(iso,slot_time) constraint enforces at the database. */
    const isNew = b => staff ? !known.includes(b.ref) : !known.includes(b.iso + 'T' + b.time);
    for (const b of (d.bookings || []).filter(isNew)) {
      const res = await fetch(SB_REST + '/bookings', {
        method: 'POST', headers: sbHeaders(true),
        body: JSON.stringify({
          ref: b.ref, iso: b.iso, slot_time: b.time, svc: b.svc,
          name: b.name, phone: b.phone, reg: b.reg || null, model: b.model || null
        })
      });
      if (res.status === 409) return 'taken';
      if (!res.ok) return false;
    }

    if (!staff) return true;   /* anonymous visitors cannot change anything else */

    for (const ref of known.filter(r => !(d.bookings || []).some(b => b.ref === r))) {
      await fetch(SB_REST + '/bookings?ref=eq.' + encodeURIComponent(ref), { method: 'DELETE', headers: sbHeaders() });
    }
    const r = await fetch(SB_REST + '/diary?id=eq.1', {
      method: 'PATCH', headers: sbHeaders(true),
      body: JSON.stringify({ blocked: d.blocked, closed_days: d.closedDays, updated_at: new Date().toISOString() })
    });
    return r.ok;
  } catch (e) { return false; }
}
