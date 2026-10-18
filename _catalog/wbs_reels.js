/**
 * wbs_reels.js — a wiki page's pictures as two slide shows, one in each margin beside the sheet (wide screens only).
 *
 * The pictures are the page's Pictures grid (.thumbs, make_html.py): alternately into the left and the right reel.
 * Each reel plays by itself; ⏮ back to the first, ◀ back one, ⏸ / ▶ stop and play, ▶▶ on one; the strip of small
 * pictures under it picks any one. Clicking the picture opens it in the viewer. A picture that is not on the website
 * is fetched from the archive's Google Drive (drive_lookup.js), and one the rotation audit turns is shown upright.
 *
 * In the grid itself: resting the pointer on a picture fetches its neighbours (from Google) ahead of time, and after a
 * long rest (2.5 s) opens it full screen; ◀ ▶ or the arrow keys go through them; moving off the picture, Esc or a click
 * beside it closes it.
 */
(() => {
  const grid = document.querySelector('.thumbs');
  if (!grid) return;
  const dl = [...document.scripts].find(s => /_catalog\/drive_lookup\.js/.test(s.src));
  const root = dl ? dl.src.replace(/_catalog\/drive_lookup\.js.*$/, '') : '';
  const enc = p => p.split('/').map(encodeURIComponent).join('/');
  const items = [...grid.querySelectorAll('a')].map(a => {
    const el = a.querySelector('img, canvas');
    if (!el || !el.dataset.f) return null;
    const turned = (el.title || '').match(/turned (\d+)/);
    return { href: a.href, path: el.dataset.f, name: el.dataset.f.split('/').pop(), deg: +(el.dataset.rot || (turned && turned[1]) || 0) };
  }).filter(Boolean);
  if (!items.length) return;

  const css = `
.reel { position:fixed; top:16px; bottom:16px; width:var(--rw); z-index:2; display:none; flex-direction:column; gap:6px;
  font:12px/1.35 "Courier Prime","Courier New",monospace; color:#e8e4d8 }
.reel.l { left:calc((100vw - var(--sheet)) / 4 - var(--rw) / 2) } .reel.r { right:calc((100vw - var(--sheet)) / 4 - var(--rw) / 2) }
@media (min-width: 1240px) { .reel { display:flex } }
.reel .frame { display:grid; place-items:center; background:#fbfaf6; box-shadow:0 10px 26px rgba(0,0,0,.5); padding:6px; cursor:pointer; flex:none;
  max-height:46vh; overflow:hidden }
.reel .frame img { display:block; width:100%; height:auto; max-height:calc(46vh - 12px); object-fit:contain; transition:opacity .35s }
.reel .frame img.side { width:auto; max-width:calc(46vh - 12px); max-height:calc(var(--rw) - 12px) }
.reel .cap { max-height:2.7em; overflow:hidden; word-break:break-word; opacity:.85; flex:none }
.reel .ctl { display:flex; gap:4px; align-items:center; flex:none }
.reel button { font:inherit; font-size:13px; background:#2b2a27; color:#e8e4d8; border:1px solid #4a4843; border-radius:3px; padding:2px 7px; cursor:pointer }
.reel button:hover { background:#3a3934 } .reel .n { margin-left:auto; opacity:.7 }
.reel .strip { display:flex; gap:4px; overflow-x:auto; padding-bottom:4px; scrollbar-width:thin; flex:none }
.reel .strip img { flex:none; width:40px; height:40px; object-fit:cover; background:#fbfaf6; opacity:.55; cursor:pointer; border:2px solid transparent }
.reel .strip img.on { opacity:1; border-color:#e8e4d8 } .reel .strip img.gone { display:none }
.reel .ocr { flex:1 1 auto; min-height:0; overflow:auto; white-space:pre-wrap; word-break:break-word; font-size:11px; line-height:1.4;
  color:#cfcabb; border-top:1px dotted #4a4843; padding-top:6px; scrollbar-width:thin }
.reel .ocr:empty { display:none } .reel .ocr b { color:#e8e4d8; font-weight:700 }`;
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);

  // the picture itself, else its Drive copy; a picture that is neither is dropped from the reel
  const load = (img, it, size) => {
    img.src = root + enc(it.path);
    img.onerror = () => {
      img.onerror = () => { it.gone = true; img.classList.add('gone'); };
      (window.driveLookup ? window.driveLookup(it.path) : Promise.resolve(null)).then(d => {
        if (d) img.src = window.driveThumb(d, size); else img.onerror();
      });
    };
  };

  // what was read on a picture, from its note (<file>.md): its title block and the OCR text, spilled out under the reel
  const notes = new Map();
  const esc = t => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const noteText = it => {
    if (!notes.has(it.path)) notes.set(it.path, fetch(root + enc(it.path) + '.md').then(r => r.ok ? r.text() : '').then(md => {
      const tb = (md.match(/## Title block[^\n]*\n([\s\S]*?)(?=\n## |\n- \*\*Original)/) || [])[1] || '';
      const full = (md.match(/## (?:Full text|Text recovered by OCR)\n([\s\S]*?)(?=\n## |$)/) || [])[1] || '';
      const clean = full.replace(/```\w*\n?/g, '').replace(/^### (.*)$/gm, '\u0000$1\u0001').replace(/^> /gm, '').trim();
      const head = tb.trim() ? '<b>Title block</b>\n' + esc(tb.replace(/\*\*/g, '').replace(/^- /gm, '').trim()) + '\n\n' : '';
      return head + (clean ? '<b>Read on it</b>\n' + esc(clean).replace(/\u0000(.*?)\u0001/g, '<b>$1</b>') : '');
    }).catch(() => ''));
    return notes.get(it.path);
  };

  const sheet = document.querySelector('.sheet');
  const fit = () => {
    const w = sheet ? sheet.getBoundingClientRect().width : 820, margin = (innerWidth - w) / 2;
    document.documentElement.style.setProperty('--sheet', w + 'px');
    document.documentElement.style.setProperty('--rw', Math.max(160, Math.min(320, margin - 48)) + 'px');
  };
  fit();
  addEventListener('resize', fit);

  const reel = (list, side, delay) => {
    const box = document.createElement('aside');
    box.className = 'reel ' + side;
    box.setAttribute('aria-label', 'Pictures slide show');
    box.innerHTML = `<div class="frame" title="Open in the viewer"><img alt=""></div><div class="cap"></div>
      <div class="ctl"><button data-a="first" title="Back to the first">⏮</button><button data-a="prev" title="Back one">◀</button>
      <button data-a="play" title="Stop">⏸</button><button data-a="next" title="On one">▶▶</button><span class="n"></span></div>
      <div class="strip"></div><div class="ocr" aria-label="What was read on it"></div>`;
    document.body.appendChild(box);
    const img = box.querySelector('.frame img'), cap = box.querySelector('.cap'), n = box.querySelector('.n');
    const play = box.querySelector('[data-a=play]'), strip = box.querySelector('.strip'), ocr = box.querySelector('.ocr');
    const thumbs = list.map((it, i) => {
      const t = Object.assign(document.createElement('img'), { loading: 'lazy', alt: '', title: it.name });
      t.style.transform = it.deg ? `rotate(${-it.deg}deg)` : '';
      load(t, it, 120);
      t.addEventListener('click', () => { stop(); show(i); });
      strip.appendChild(t);
      return t;
    });
    let at = -1, timer = null, hover = false;
    const show = i => {
      const live = list.map((it, k) => k).filter(k => !list[k].gone);
      if (!live.length) return box.remove();
      i = ((i % list.length) + list.length) % list.length;
      if (list[i].gone) i = live.find(k => k >= i) ?? live[0];
      at = i;
      const it = list[i];
      img.style.opacity = 0;
      img.onload = () => { img.style.opacity = 1; };
      img.className = it.deg === 90 || it.deg === 270 ? 'side' : '';
      img.style.transform = it.deg ? `rotate(${-it.deg}deg)` : '';
      load(img, it, 800);
      cap.textContent = it.name;
      noteText(it).then(t => { if (list[at] === it) ocr.innerHTML = t; });
      n.textContent = `${i + 1} / ${list.length}`;
      thumbs.forEach((t, k) => t.classList.toggle('on', k === i));
      thumbs[i].scrollIntoView({ block: 'nearest', inline: 'center' });
    };
    const step = d => { let i = at; do { i = (i + d + list.length) % list.length; } while (list[i].gone && i !== at); show(i); };
    const start = () => { clearInterval(timer); timer = setInterval(() => hover || step(1), 4500); play.textContent = '⏸'; play.title = 'Stop'; };
    const stop = () => { clearInterval(timer); timer = null; play.textContent = '▶'; play.title = 'Play'; };
    box.addEventListener('mouseenter', () => (hover = true));
    box.addEventListener('mouseleave', () => (hover = false));
    box.querySelector('.ctl').addEventListener('click', e => {
      const a = e.target.dataset.a;
      if (a === 'first') { stop(); show(0); }
      if (a === 'prev') { stop(); step(-1); }
      if (a === 'next') { stop(); step(1); }
      if (a === 'play') timer ? stop() : (step(1), start());
    });
    box.querySelector('.frame').addEventListener('click', () => { location.href = list[at].href; });
    show(0);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setTimeout(start, delay); else stop();   // the two reels turn in turn
  };
  if (items.length >= 2) {
    reel(items.filter((_, i) => i % 2 === 0), 'l', 0);
    reel(items.filter((_, i) => i % 2 === 1), 'r', 2250);
  }

  // ---- the grid: neighbours fetched ahead, full screen after a long rest of the pointer ----
  const BIG = 2000, AHEAD = 6, REST = 2500;   // a long rest on one picture before it opens full screen
  const cache = new Map();   // path → Image being fetched at full-screen size
  const fetchBig = it => {
    if (!cache.has(it.path)) { const im = new Image(); load(im, it, BIG); cache.set(it.path, im); }
    return cache.get(it.path);
  };
  const around = i => { for (let d = 0; d <= AHEAD; d++) [i + d, i - d].forEach(k => k >= 0 && k < items.length && fetchBig(items[k])); };
  document.head.insertAdjacentHTML('beforeend', `<style>
.wbs-full { position:fixed; inset:0; z-index:20; background:rgba(20,19,17,.94); display:grid; grid-template-rows:minmax(0,1fr) auto;
  font:13px/1.4 "Courier Prime","Courier New",monospace; color:#e8e4d8 }
.wbs-full .stage { display:grid; place-items:center; min-height:0; padding:18px 70px 6px; overflow:hidden }
.wbs-full .stage img { max-width:100%; max-height:100%; object-fit:contain; background:#fff; box-shadow:0 10px 40px #000a }
.wbs-full .stage img.side { max-width:calc(100vh - 90px); max-height:calc(100vw - 140px) }
.wbs-full .bar { display:flex; gap:14px; align-items:center; justify-content:center; padding:8px 16px 14px; flex-wrap:wrap }
.wbs-full .bar a { color:#9cc3ec } .wbs-full button { font:inherit; font-size:18px; background:#2b2a27; color:#e8e4d8;
  border:1px solid #4a4843; border-radius:4px; padding:4px 12px; cursor:pointer }
.wbs-full .nav { position:absolute; top:50%; transform:translateY(-50%) } .wbs-full .prev { left:12px } .wbs-full .next { right:12px }
.wbs-full .close { position:absolute; top:10px; right:12px }
</style>`);
  let full = null, at = 0, rest = null, armed = true;
  const open = i => {
    at = (i + items.length) % items.length;
    const it = items[at];
    if (!full) {
      full = document.createElement('div');
      full.className = 'wbs-full';
      full.setAttribute('role', 'dialog');
      full.innerHTML = `<div class="stage"><img alt=""></div><div class="bar"><span class="cap"></span><span class="n"></span>
        <a class="view" href="#">open in the viewer</a></div><button class="nav prev" title="Back one (←)">◀</button>
        <button class="nav next" title="On one (→)">▶</button><button class="close" title="Close (Esc)">✕</button>`;
      full.addEventListener('click', e => {
        if (e.target.closest('.prev')) open(at - 1);
        else if (e.target.closest('.next')) open(at + 1);
        else if (e.target.closest('.close') || e.target.classList.contains('stage') || e.target === full) close();
      });
      document.body.appendChild(full);
    }
    const img = full.querySelector('.stage img'), big = fetchBig(it);
    img.className = it.deg === 90 || it.deg === 270 ? 'side' : '';
    img.style.transform = it.deg ? `rotate(${-it.deg}deg)` : '';
    img.src = big.src || '';
    if (!big.complete) big.addEventListener('load', () => { if (items[at] === it) img.src = big.src; }, { once: true });
    full.querySelector('.cap').textContent = it.name;
    full.querySelector('.n').textContent = `${at + 1} / ${items.length}`;
    full.querySelector('.view').href = it.href;
    around(at);
  };
  const close = () => { if (full) { full.remove(); full = null; armed = false; } };
  // let go: once the pointer moves off the picture (and off its buttons), the full-screen view closes
  addEventListener('pointermove', e => {
    if (!full) return;
    const t = document.elementFromPoint(e.clientX, e.clientY);
    if (!t || !(t.closest('.wbs-full .stage img') || t.closest('.wbs-full button') || t.closest('.wbs-full .bar'))) close();
  }, { passive: true });
  addEventListener('keydown', e => {
    if (!full) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') open(at - 1);
    if (e.key === 'ArrowRight') open(at + 1);
  });
  const cells = [...grid.querySelectorAll('a')].filter(a => a.querySelector('img, canvas'));
  cells.forEach(a => {
    const i = items.findIndex(it => it.href === a.href);
    if (i < 0) return;
    a.addEventListener('mouseenter', () => {
      around(i);
      clearTimeout(rest);
      if (armed) rest = setTimeout(() => open(i), REST);
    });
    a.addEventListener('mouseleave', () => { clearTimeout(rest); armed = true; });   // closed over this one: move off to open again
  });
})();
