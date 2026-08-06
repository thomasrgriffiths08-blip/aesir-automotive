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

/* ============ AWARD LAYER ============ */
const fine = matchMedia('(pointer:fine)').matches;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* nav tuck: hide going down, return going up */
(() => {
  if (!nav) return;
  let last = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    nav.classList.toggle('tuck', y > 160 && y > last + 2);
    if (y < last - 2 || y < 160) nav.classList.remove('tuck');
    last = y;
  }, {passive:true});
})();

/* custom cursor with contextual labels */
(() => {
  if (!fine || still) return;
  document.body.classList.add('has-cursor');
  const dot = document.createElement('div'); dot.className = 'cur';
  const ring = document.createElement('div'); ring.className = 'cur-ring';
  document.body.append(dot, ring);
  let mx = innerWidth/2, my = innerHeight/2, rx = mx, ry = my;
  addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px,${my}px)`;
    const t = e.target.closest('[data-cursor]');
    const act = e.target.closest('a,button,summary,.chip,input,textarea');
    if (t){ ring.classList.add('label'); ring.classList.remove('on'); ring.dataset.label = t.dataset.cursor; }
    else { ring.classList.remove('label'); ring.classList.toggle('on', !!act); }
  }, {passive:true});
  (function follow(){
    rx += (mx - rx) * .16; ry += (my - ry) * .16;
    ring.style.transform = `translate(${rx}px,${ry}px)`;
    requestAnimationFrame(follow);
  })();
})();

/* magnetic buttons */
(() => {
  if (!fine || still) return;
  document.querySelectorAll('.btn').forEach(b => {
    b.addEventListener('mousemove', e => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width/2) * .18}px,${(e.clientY - r.top - r.height/2) * .3}px)`;
    });
    b.addEventListener('mouseleave', () => { b.style.transform = ''; });
    b.style.transition = 'background .2s, transform .25s cubic-bezier(.2,.7,.2,1)';
  });
})();

/* split-line reveal on h2s */
(() => {
  if (still) return;
  const wrapNode = (node) => {
    const frag = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/^\s+$/.test(part)){ frag.append(document.createTextNode(' ')); return; }
      const w = document.createElement('span'); w.className = 'w';
      const i = document.createElement('i'); i.textContent = part;
      w.append(i); frag.append(w);
    });
    node.replaceWith(frag);
  };
  document.querySelectorAll('h2:not(.no-split)').forEach(h => {
    [...h.childNodes].forEach(n => {
      if (n.nodeType === 3) wrapNode(n);
      else if (n.nodeType === 1 && n.tagName !== 'BR'){
        const w = document.createElement('span'); w.className = 'w';
        const i = document.createElement('i');
        n.replaceWith(w); i.append(n); w.append(i);
      }
    });
    let d = 0;
    h.querySelectorAll('.w>i').forEach(i => { i.style.transitionDelay = (d += 70) + 'ms'; });
  });
  const hio = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting){ e.target.classList.add('split-in'); hio.unobserve(e.target); }
  }), {threshold:.4});
  document.querySelectorAll('h2:not(.no-split)').forEach(h => hio.observe(h));
})();

/* ghost-word parallax */
(() => {
  if (still) return;
  const gw = [...document.querySelectorAll('.ghostword')];
  if (!gw.length) return;
  let ticking = false;
  const move = () => {
    gw.forEach(g => {
      const r = g.parentElement.getBoundingClientRect();
      g.style.transform = `translate(-50%, ${(r.top - innerHeight/2) * .12}px)`;
    });
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking){ ticking = true; requestAnimationFrame(move); } }, {passive:true});
  move();
})();

/* tricolor wipe on internal navigation */
(() => {
  const wipe = document.createElement('div');
  wipe.className = 'wipe-nav';
  wipe.innerHTML = '<i></i><i></i><i></i>';
  document.body.appendChild(wipe);
  addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    const href = a.getAttribute('href');
    if (/^(https?:|tel:|mailto:|#)/.test(href)) return;
    if (href.includes('#') && href.split('#')[0] === location.pathname.split('/').pop()) return;
    e.preventDefault();
    wipe.classList.add('go');
    setTimeout(() => { location.href = href; }, 400);
  });
  addEventListener('pageshow', e => { if (e.persisted) wipe.classList.remove('go'); });
})();
