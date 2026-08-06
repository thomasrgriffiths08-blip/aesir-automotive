/* Drop-in Supabase replacement for cloud.js
   1. Create a free project at supabase.com, run supabase/setup.sql
   2. Paste the two values below (Settings → API)
   3. Rename this file to cloud.js (replacing the JSONBlob version) */
const SB_URL = 'https://YOUR-PROJECT.supabase.co';
const SB_KEY = 'YOUR-ANON-KEY';
const H = {apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json'};

function dbNormal(diary, bookings){
  return {blocked: (diary && diary.blocked) || {}, closedDays: (diary && diary.closed_days) || [],
          bookings: bookings || [], updated: Date.now()};
}
async function dbGet(){
  try {
    const [d, b] = await Promise.all([
      fetch(SB_URL + '/rest/v1/diary?id=eq.1', {headers: H}).then(r => r.json()),
      fetch(SB_URL + '/rest/v1/bookings?select=*', {headers: H}).then(r => r.json())
    ]);
    const out = dbNormal(d[0], b);
    localStorage.setItem('aesir_dbcache', JSON.stringify(out));
    return out;
  } catch(e){
    try { return JSON.parse(localStorage.getItem('aesir_dbcache')); } catch(_){ return dbNormal(); }
  }
}
/* index.html only ever ADDS a booking; admin updates the diary doc + deletes bookings */
async function dbPut(d){
  localStorage.setItem('aesir_dbcache', JSON.stringify(d));
  try {
    const cur = await fetch(SB_URL + '/rest/v1/bookings?select=ref', {headers: H}).then(r => r.json());
    const have = new Set(cur.map(x => x.ref));
    for (const b of d.bookings.filter(x => !have.has(x.ref)))
      await fetch(SB_URL + '/rest/v1/bookings', {method: 'POST', headers: H, body: JSON.stringify({
        ref: b.ref, iso: b.iso, time: b.time, svc: b.svc, name: b.name, phone: b.phone, reg: b.reg, model: b.model})});
    for (const r of [...have].filter(ref => !d.bookings.some(x => x.ref === ref)))
      await fetch(SB_URL + '/rest/v1/bookings?ref=eq.' + encodeURIComponent(r), {method: 'DELETE', headers: H});
    await fetch(SB_URL + '/rest/v1/diary?id=eq.1', {method: 'PATCH', headers: H,
      body: JSON.stringify({blocked: d.blocked, closed_days: d.closedDays, updated_at: new Date().toISOString()})});
    return true;
  } catch(e){ return false; }
}
