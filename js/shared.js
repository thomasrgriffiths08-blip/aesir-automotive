/* ÆSIR shared behaviour: nav, reveal-on-scroll, toast, store helpers */
const nav = document.querySelector('nav.site');
addEventListener('scroll', () => nav && nav.classList.toggle('solid', scrollY > 30), {passive:true});
const burger = document.getElementById('burger');
if (burger) burger.onclick = () => document.getElementById('navLinks').classList.toggle('open');
document.querySelectorAll('#navLinks a').forEach(a => a.addEventListener('click', () => {
  document.getElementById('navLinks').classList.remove('open');
}));

const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting){ e.target.classList.add('on'); io.unobserve(e.target); }
}), {threshold:.12});
document.querySelectorAll('.rv').forEach(el => io.observe(el));

function toast(msg, ms = 3200){
  let t = document.querySelector('.toast');
  if (!t){ t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.innerHTML = '<span class="ok">✓</span><span>' + msg + '</span>';
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), ms);
}

/* localStorage helpers — every system persists under aesir_* */
const store = {
  get(k, fallback){ try { return JSON.parse(localStorage.getItem('aesir_' + k)) ?? fallback; } catch { return fallback; } },
  set(k, v){ localStorage.setItem('aesir_' + k, JSON.stringify(v)); }
};

/* typewriter for sms bubbles */
function typeInto(el, text, speed = 18){
  return new Promise(res => {
    el.textContent = '';
    let i = 0;
    (function tick(){
      el.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(tick, speed); else res();
    })();
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

/* nav tuck: hide going down, return going up (desktop only) */
(() => {
  if (!nav) return;
  if (matchMedia('(max-width: 960px)').matches || !matchMedia('(pointer:fine)').matches) return;
  let last = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    if (y > 200 && y > last + 14) nav.classList.add('tuck');
    else if (y < last - 14 || y < 200) nav.classList.remove('tuck');
    last = y;
  }, {passive:true});
})();

/* floating WhatsApp button — pre-filled message straight to the workshop */
(() => {
  const wa = document.createElement('a');
  wa.className = 'wa-fab';
  wa.href = 'https://wa.me/447956658177?text=' + encodeURIComponent(
    "Hi Neil — found you via the website. My car is a ");
  wa.target = '_blank'; wa.rel = 'noopener';
  wa.setAttribute('aria-label', 'WhatsApp the workshop');
  wa.innerHTML = '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M16 3C9.4 3 4 8.3 4 14.9c0 2.6.8 5 2.3 7L4 29l7.3-2.3c1.9 1 3.9 1.5 4.7 1.5 6.6 0 12-5.3 12-11.9S22.6 3 16 3zm0 21.8c-1.5 0-3.4-.5-5-1.4l-.4-.2-4.3 1.4 1.4-4.2-.3-.4c-1.3-1.7-2-3.8-2-5.9C5.4 9.4 10.2 4.7 16 4.7s10.6 4.7 10.6 10.4S21.8 24.8 16 24.8zm5.8-7.7c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.5-1.6-.9-.8-1.6-1.9-1.7-2.2-.2-.3 0-.5.1-.6l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6-.1-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7s1.2 3.1 1.3 3.4c.2.2 2.3 3.5 5.5 4.9.8.3 1.4.5 1.9.7.8.2 1.5.2 2 .1.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.2-.6-.4z"/></svg>';
  if (document.getElementById('cine')){
    wa.classList.add('wa-wait');
    const iv = setInterval(() => {
      if (document.body.classList.contains('ready')){ wa.classList.remove('wa-wait'); clearInterval(iv); }
    }, 200);
  }
  document.body.appendChild(wa);
})();
