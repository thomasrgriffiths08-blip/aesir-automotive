/* ÆSIR cloud store — shared availability + bookings across every device.
   Demo-grade JSON store; swap AESIR_DB_URL for a real backend (Supabase/GHL)
   without touching any other code. */
const AESIR_DB_URL = 'https://jsonblob.com/api/jsonBlob/019fd7e3-96c2-7b8a-b7a1-dddc5e3bcf06';

function dbNormal(d){
  d = d || {};
  return {blocked: d.blocked || {}, closedDays: d.closedDays || [], bookings: d.bookings || [], updated: d.updated || 0};
}
async function dbGet(){
  try {
    const r = await fetch(AESIR_DB_URL, {cache: 'no-store'});
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    localStorage.setItem('aesir_dbcache', JSON.stringify(d));
    return dbNormal(d);
  } catch(e){
    try { return dbNormal(JSON.parse(localStorage.getItem('aesir_dbcache'))); }
    catch(_) { return dbNormal(null); }
  }
}
async function dbPut(d){
  d.updated = Date.now();
  localStorage.setItem('aesir_dbcache', JSON.stringify(d));
  try {
    const r = await fetch(AESIR_DB_URL, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(d)});
    return r.ok;
  } catch(e){ return false; }
}
