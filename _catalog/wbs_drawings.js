/**
 * wbs_drawings.js — a wiki page's Drawings gallery (.wbs-dw, make_wiki.py): each scan with its traced SVG laid over it.
 *
 * A card is <figure class="dw" data-f="<2026 path>" data-t="<sha16>" data-made="svg dxf kicad_sch" data-rot data-cl data-dxf>.
 * The trace is trace_overlay.js's (traceOverlay): each card keeps its control bar hidden and the gallery's own bar drives
 * them all: overlay on / off, the fader from the scan to the vector drawing, the centre lines. A scan that is not on the
 * website is fetched from the archive's Google Drive (wbsOff, drive_lookup.js); when it can't be, the trace stands alone.
 * Clicking a card opens it large with the full trace controls and the CAD saves; ◀ ▶ or the arrow keys go through them.
 * DXF: the "(traced).dxf" beside the drawing when it is there (the archive), else made here from the SVG (trace_cad.js).
 */
(() => {
  const gals = [...document.querySelectorAll('.wbs-dw')];
  if (!gals.length || !window.traceOverlay) return;
  const dl = [...document.scripts].find(s => /_catalog\/drive_lookup\.js/.test(s.src));
  const root = dl ? dl.src.replace(/_catalog\/drive_lookup\.js.*$/, '') : '';
  const enc = p => p.split('/').map(encodeURIComponent).join('/');

  document.head.insertAdjacentHTML('beforeend', `<style>
.wbs-dw { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:16px 14px; margin:10px 0 18px; align-items:start }
.wbs-dwbar { display:flex; flex-wrap:wrap; gap:4px 14px; align-items:center; font-size:13px; margin:6px 0 4px; padding:5px 8px;
  border:1px dotted var(--rule,#cfcabc); background:#f6f3e8 }
.wbs-dwbar label { white-space:nowrap; cursor:pointer } .wbs-dwbar input[type=range] { width:110px; vertical-align:middle } .wbs-dwbar input, .wbs-lb input { accent-color:#1f3f6b }
.wbs-dwbar .n { margin-left:auto; color:var(--faint,#6d6a63) }
.dw { margin:0; min-width:0 } .dw .frame { height:170px; display:grid; place-items:center; background:#fff; border:1px solid var(--rule,#cfcabc);
  box-shadow:0 2px 6px rgba(0,0,0,.12); overflow:hidden }
.dw .pg, .wbs-lb .pg { position:relative; display:block; aspect-ratio:var(--ar,1.3); background:#fff; cursor:zoom-in }
.dw .pg { width:min(100%, calc(168px * var(--ar,1.3))) } .dw .pg:hover { background:#fff; outline:2px solid var(--link,#1f3f6b) }
.dw .pg > img, .dw .pg > canvas, .wbs-lb .pg > img, .wbs-lb .pg > canvas { position:absolute; inset:0; width:100%; height:100%; display:block }
.dw:not([data-t]) .pg > img, .wbs-lb .pg.nt > img { object-fit:contain }
.dw .pg .offline, .wbs-lb .pg .offline { display:none }
.dw .pg:has(.offline)::after, .wbs-lb .pg:has(.offline)::after { content:"trace only"; position:absolute; right:0; bottom:0;
  font-size:9.5px; line-height:1.3; white-space:nowrap; color:var(--faint,#6d6a63); background:#fffd; padding:0 3px }
.pg:has(.offline) svg.trace { --ink:1 !important }   /* no scan: the trace stands alone, in full */
.dw:not([data-t]) .pg:has(.offline)::after { content:"scan kept in the archive"; inset:auto 0 45%; text-align:center }
.dw figcaption { font-size:11.5px; line-height:1.35; margin-top:5px; word-break:break-word }
.dw figcaption .tt { color:var(--faint,#6d6a63) } .dw .cad { display:block; margin-top:2px } .dw .cad a { margin-right:8px; white-space:nowrap; display:inline-block }
.wbs-dw .hb, .wbs-lb .hb { display:none !important }
.wbs-lb { position:fixed; inset:0; z-index:2147483000; background:rgba(28,27,25,.92); display:flex; flex-direction:column; align-items:center;
  padding:10px 10px 14px; gap:8px; overflow:auto; font:13px/1.4 "Courier Prime","Courier New",monospace }
.wbs-lb .box { background:var(--paper,#fbfaf4); color:var(--ink,#1f1e1c); padding:8px 12px; width:min(100%,1400px); box-shadow:0 10px 30px rgba(0,0,0,.5) }
.wbs-lb .head { display:flex; gap:8px 14px; align-items:baseline; flex-wrap:wrap; margin-bottom:6px }
.wbs-lb .head .t { flex:1; min-width:12em } .wbs-lb button { font:inherit; background:#2b2a27; color:#e8e4d8; border:1px solid #4a4843;
  border-radius:3px; padding:2px 9px; cursor:pointer } .wbs-lb .tracebar { margin-top:4px }
.wbs-lb .pg { cursor:default; width:min(100%, calc((100vh - 190px) * var(--ar,1.3))); margin:0 auto; box-shadow:0 10px 30px rgba(0,0,0,.5) }
@media (max-width:600px) { .wbs-dw { grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:12px 10px } .dw .frame { height:130px }
  .dw .pg { width:min(100%, calc(128px * var(--ar,1.3))) } .wbs-lb .pg { width:100% } .wbs-dwbar .n { margin-left:0 } }
</style>`);

  // the gallery's settings, shared by every card (and the large view starts from them)
  const st = { show: true, fade: 45, cl: false };
  const drive = (hb, sel, val) => {   // set one of a card's hidden trace controls as if by hand (traceOverlay listens on its bar)
    const el = hb.querySelector(sel);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = val; else el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const apply = (hb, s) => {   // "show" resets the scan, so on: show then fade; off: fade then hide
    drive(hb, '[data-l=cl]', s.cl);
    if (s.show) { drive(hb, '[data-a=show]', true); drive(hb, '[data-a=fade]', s.fade); }
    else { drive(hb, '[data-a=fade]', s.fade); drive(hb, '[data-a=show]', false); }
  };
  const later = (im, hb) => im.addEventListener('load', () => setTimeout(() => hb.then(b => b && apply(b, st))));   // a scan turned upright is a new canvas

  const scanImg = (fig, size) => {
    const im = document.createElement('img');
    im.alt = '';
    im.dataset.f = fig.dataset.f;
    im.dataset.size = size;
    if (fig.dataset.rot) { im.dataset.rot = fig.dataset.rot; im.onload = () => window.wbsTurn && window.wbsTurn(im); }
    if (!fig.dataset.t && !fig.style.getPropertyValue('--ar'))   // no trace to give the shape: the scan's own
      im.addEventListener('load', () => { const s = im.dataset.rot % 180 ? [im.naturalHeight, im.naturalWidth] : [im.naturalWidth, im.naturalHeight];
        if (s[1]) fig.style.setProperty('--ar', (s[0] / s[1]).toFixed(4)); });
    im.onerror = () => window.wbsOff ? window.wbsOff(im) : im.remove();
    im.src = root + enc(fig.dataset.f);
    return im;
  };

  // a card: its scan and trace, loaded when it comes into view
  const load = fig => fig._tr = fig._tr || (() => {
    const pg = fig.querySelector('.pg'), im = pg.appendChild(scanImg(fig, 480));
    if (!fig.dataset.t) return Promise.resolve(null);
    const hb = fig.appendChild(Object.assign(document.createElement('div'), { className: 'tracebar hb' }));
    const tr = window.traceOverlay(pg, fig.dataset.f, hb).then(ok => {
      if (!ok) { hb.remove(); return null; }
      const svg = pg.querySelector('svg.trace');
      if (svg && !fig.style.getPropertyValue('--ar')) { const v = svg.viewBox.baseVal; if (v && v.height) fig.style.setProperty('--ar', v.width / v.height); }
      apply(hb, st);
      return hb;
    });
    later(im, tr);
    return tr;
  })();
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { io.unobserve(e.target); load(e.target); }
  }), { rootMargin: '300px' }) : null;

  // save: the archive's "(traced).dxf" when it can be reached, else made from the trace (traceOverlay's save links)
  const save = (fig, s) => load(fig).then(hb => {
    const viaTrace = () => { const a = hb && hb.querySelector(`[data-s="${s}"]`); if (a) a.click(); else alert('No trace for this drawing yet.'); };
    if (s !== 'dxf' || !fig.dataset.dxf) return viaTrace();
    const href = root + enc(fig.dataset.dxf);
    fetch(href, { method: 'HEAD' }).then(r => {
      if (!r.ok) return viaTrace();
      const a = Object.assign(document.createElement('a'), { href, download: fig.dataset.dxf.split('/').pop() });
      document.body.appendChild(a); a.click(); a.remove();
    }).catch(viaTrace);
  });

  gals.forEach(gal => {
    const figs = [...gal.querySelectorAll('.dw')];
    const hasCl = figs.some(f => f.dataset.cl), nTr = +gal.dataset.traced || 0;
    const bar = document.createElement('div');
    bar.className = 'wbs-dwbar';
    bar.innerHTML = (nTr ? `<b>Traces:</b>
      <label><input type="checkbox" data-g="show" checked> overlay</label>
      <label title="From the scan as it is to the vector drawing">scan <input type="range" min="0" max="100" value="${st.fade}" data-g="fade"> vector</label>
      ${hasCl ? '<label title="The ink thinned to its centre lines (the CAD data)"><input type="checkbox" data-g="cl"> centre lines</label>' : ''}` : '')
      + `<span class="n">${figs.length} drawing${figs.length === 1 ? '' : 's'}${nTr ? `, ${nTr} traced` : ''}${+gal.dataset.n > figs.length ? ` (first ${figs.length} of ${gal.dataset.n})` : ''}</span>`;
    gal.before(bar);
    bar.addEventListener('input', e => {
      const g = e.target.dataset.g;
      if (!g) return;
      st[g] = e.target.type === 'checkbox' ? e.target.checked : +e.target.value;
      figs.forEach(f => f._tr && f._tr.then(hb => hb && apply(hb, st)));
    });
    figs.forEach((fig, i) => {
      const cad = fig.querySelector('.cad'), made = (fig.dataset.made || '').split(' ');
      if (fig.dataset.t) cad.insertAdjacentHTML('beforeend', `<a href="#" data-s="svg">SVG</a><a href="#" data-s="dxf"${fig.dataset.dxf
        ? ' title="the (traced).dxf beside the drawing"' : ''}>DXF</a>${made.includes('kicad_sch') ? '<a href="#" data-s="kicad_sch">KiCad</a>' : ''}`);
      cad.addEventListener('click', e => { if (e.target.dataset.s) { e.preventDefault(); save(fig, e.target.dataset.s); } });
      fig.querySelector('.pg').addEventListener('click', e => { if (e.ctrlKey || e.metaKey || e.shiftKey) return; e.preventDefault(); open(figs, i); });
      const frame = document.createElement('div');
      frame.className = 'frame';
      fig.prepend(frame);
      frame.appendChild(fig.querySelector('.pg'));
      io ? io.observe(fig) : load(fig);
    });
  });

  // the large view: one drawing, its trace with all of trace_overlay.js's controls and saves
  let lb = null;
  const close = () => { if (lb) { lb.remove(); lb = null; document.removeEventListener('keydown', key); } };
  const key = e => { if (!lb) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') lb._go(-1); if (e.key === 'ArrowRight') lb._go(1); };
  const open = (figs, i) => {
    close();
    const fig = figs[i];
    lb = document.createElement('div');
    lb.className = 'wbs-lb';
    lb.innerHTML = `<div class="box"><div class="head"><span class="t">${fig.querySelector('figcaption').innerHTML.replace(/<span class="cad">[\s\S]*$/, '')}</span>
      <span>${i + 1} / ${figs.length}</span><button data-go="-1" title="previous (←)">◀</button><button data-go="1" title="next (→)">▶</button>
      <a href="${fig.querySelector('.cad a').href}" style="color:var(--link,#1f3f6b)">open in viewer</a>
      ${fig.dataset.dxf ? '<a href="#" data-dxf style="color:var(--link,#1f3f6b)">(traced).dxf</a>' : ''}<button data-x title="close (Esc)">✕</button></div>
      <div class="tracebar" hidden></div></div><a class="pg"></a>`;
    const pg = lb.querySelector('.pg');
    const ar = fig.style.getPropertyValue('--ar');
    if (ar) pg.style.setProperty('--ar', ar);
    const im = pg.appendChild(scanImg(fig.cloneNode(false), 2000));
    if (!fig.dataset.t) pg.classList.add('nt');
    lb._go = d => open(figs, (i + d + figs.length) % figs.length);
    lb.addEventListener('click', e => {
      if (e.target === lb || e.target.dataset.x !== undefined) close();
      else if (e.target.dataset.go) lb._go(+e.target.dataset.go);
      else if (e.target.dataset.dxf !== undefined) { e.preventDefault(); save(fig, 'dxf'); }
    });
    document.addEventListener('keydown', key);
    document.body.appendChild(lb);
    if (fig.dataset.t) {
      const bar = lb.querySelector('.tracebar'), me = lb;
      later(im, window.traceOverlay(pg, fig.dataset.f, bar).then(ok => {
        if (!ok || lb !== me) return null;
        apply(bar, st);
        if (!ar) { const v = pg.querySelector('svg.trace').viewBox.baseVal; if (v && v.height) pg.style.setProperty('--ar', v.width / v.height); }
        return bar;
      }));
    }
  };
})();
