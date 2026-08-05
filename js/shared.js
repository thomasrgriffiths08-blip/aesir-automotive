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
