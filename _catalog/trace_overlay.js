/**
 * trace_overlay.js — the drawing tracer's vectors laid over the drawing (trace_drawings.py makes them).
 *
 *   traceLookup(path)        → Promise<[sha16, "svg dxf kicad_sch …"] | null>   (_catalog/traces/xx.json, 1-in-256 slices)
 *   traceOverlay(pg, path, bar)   puts the traced SVG over the picture inside `pg` (position:relative, the picture upright)
 *                                 and its controls in `bar`: show / hide, how strongly, which layers, the CAD downloads.
 *                                 Called again (the next page) it replaces the last one, keeping the fader and layers.
 * A PDF is traced page by page: path "<file>.pdf#p3" is its page 3, drawn into a canvas in `pg` (the viewer, with pdf.js):
 *   tracePages(path)         → Promise<[pages, [traced page numbers]] | null>   ("<file>.pdf#pages")
 *   tracePdfJs()             → Promise<pdfjsLib>   pdf.js, from _catalog/pdfjs/ (copied there by trace_drawings.py)
 * A fader runs from the scan as it is to the vector drawing: the traced ink comes in, then the old lettering is covered
 * and the words read on it are typed in its place.
 * The website keeps the traces gzipped (name.gz); they are unpacked here, in the browser. The CAD files are made here
 * too, from the SVG, by trace_cad.js (extractors/src/traceCad.ts), loaded the first time one is asked for.
 */
(() => {
  const here = document.currentScript ? document.currentScript.src : '';
  const cat = here ? here.replace(/trace_overlay\.js(\?.*)?$/, '') : '_catalog/';   // …/_catalog/
  const root = cat.replace(/_catalog\/$/, '');
  const shards = {};
  const shardOf = key => {   // FNV-1a over UTF-8, low byte, as in make_drive_links.py
    let h = 0x811c9dc5;
    for (const b of new TextEncoder().encode(key)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
    return (h & 0xff).toString(16).padStart(2, '0');
  };
  window.traceLookup = path => {
    const s = shardOf(path);
    shards[s] = shards[s] || fetch(cat + 'traces/' + s + '.json').then(r => (r.ok ? r.json() : {})).catch(() => ({}));
    return shards[s].then(m => m[path] || null);
  };
  window.tracePages = path => window.traceLookup(path + '#pages');
  let pdfjs = null;
  window.tracePdfJs = () => pdfjs = pdfjs || import(cat + 'pdfjs/pdf.min.mjs').then(lib => {
    lib.GlobalWorkerOptions.workerSrc = cat + 'pdfjs/pdf.worker.min.mjs';
    return lib;
  });
  const keep = { fade: 45, off: new Set(['cl']), hide: false };   // the controls as last set, for the next page
  const unzip = r => new Response(r.body.pipeThrough(new DecompressionStream('gzip')));
  // the file as it is (the local archive), else its .gz (the website)
  const getFile = name => fetch(root + '_traces/' + name).then(r => r.ok ? r
    : fetch(root + '_traces/' + name + '.gz').then(z => z.ok ? unzip(z) : null)).catch(() => null);

  const css = `.trace{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.trace .line{fill:var(--tr-line,#e0218a);opacity:var(--ink,.7)}.trace .tb{fill:var(--tr-tb,#e08a00);opacity:var(--ink,.7)}
.trace .text{fill:var(--tr-text,#1e7fd6);opacity:var(--old,.7)}
.trace .block{fill:#16a34a1c;stroke:#16a34a;stroke-width:3;opacity:var(--ink,.7)}
.trace .mask{fill:#fbfaf6;opacity:var(--mask,0)}.trace .ocr{fill:#1f1e1c;font-family:"Courier Prime","Courier New",monospace;font-weight:700;opacity:var(--new,0)}
.tracebar .fader input{width:160px}
.trace.only{background:#fff}.trace .cl path{fill:none;stroke:#0b8f3a;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.trace:not(.l-line) .line,.trace:not(.l-text) .text,.trace:not(.l-tb) .tb,.trace:not(.l-block) .block,.trace:not(.l-ocr) .ocr,.trace:not(.l-ocr) .mask,.trace:not(.l-cl) .cl{display:none}
.tracebar{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;font-size:13px}
.tracebar label{white-space:nowrap}.tracebar input[type=range]{width:90px;vertical-align:middle}
.tracebar .sw{display:inline-block;width:.8em;height:.8em;border-radius:2px;vertical-align:-1px;margin-right:3px}`;
  const LAYERS = [['line', 'Lines', '#e0218a'], ['text', 'Lettering', '#1e7fd6'], ['tb', 'Title block', '#e08a00'],
                  ['block', 'Blocks', '#16a34a'], ['ocr', 'Typed words', '#1f1e1c'], ['cl', 'Centre lines', '#0b8f3a']];
  const SAVE = { dxf: 'DXF (AutoCAD)', kicad_sch: 'KiCad schematic' };
  let cad = null;
  const loadCad = () => cad = cad || new Promise((ok, bad) => window.TraceCad ? ok(window.TraceCad)
    : document.head.appendChild(Object.assign(document.createElement('script'), { src: cat + 'trace_cad.js', onload: () => ok(window.TraceCad), onerror: bad })));

  window.traceOverlay = (pg, path, bar) => (pg.dataset.trace = path, window.traceLookup(path)).then(t => {
    if (!t) return false;
    const [tag, made] = t;
    return getFile(tag + '.svg').then(r => r && r.text()).then(svg => {
      if (!svg || pg.dataset.trace !== path) return false;   // none, or the viewer has moved on to another page
      pg.querySelectorAll(':scope > .trace').forEach(o => o.remove());
      if (!document.getElementById('trace-css')) document.head.insertAdjacentHTML('beforeend', `<style id="trace-css">${css}</style>`);
      const box = document.createElement('div');
      box.innerHTML = svg;
      const el = box.firstElementChild;
      el.classList.add('trace', ...LAYERS.map(([c]) => 'l-' + c).filter(c => !keep.off.has(c.slice(2))));
      if (keep.hide) el.style.display = 'none';
      el.setAttribute('preserveAspectRatio', 'none');
      // behind every word read, a paper patch: as the fader moves to "vector" it covers the scan's own lettering
      el.querySelectorAll('text.ocr').forEach(w => {
        const x = +w.getAttribute('x'), y = +w.getAttribute('y'), fs = +w.getAttribute('font-size'), wl = +w.getAttribute('textLength');
        const m = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        Object.entries({ class: 'mask', x: x - 2, y: y - fs / .9 - 1, width: wl + 4, height: fs / .9 + 4 }).forEach(([k, v]) => m.setAttribute(k, v));
        w.before(m);
      });
      pg.appendChild(el);
      const scan = () => pg.querySelector('img, canvas');
      const has = c => el.querySelector('.' + c);
      const pn = (path.match(/#p(\d+)$/) || [])[1];   // a PDF's page
      const name = path.replace(/#p\d+$/, '').split('/').pop().replace(/\.[^.]+$/, '') + (pn ? ' p' + pn : '');
      const kicad = made.split(' ').includes('kicad_sch');
      bar.innerHTML = `<b>Traced ${pn ? 'page ' + pn : 'drawing'}:</b>
        <label><input type="checkbox" data-a="show"${keep.hide ? '' : ' checked'}> show</label>
        <label class="fader" title="Slide from the scan as it is to the vector drawing: the old lettering is covered and typed again">scan
          <input type="range" min="0" max="100" value="${keep.fade}" data-a="fade"> vector</label>
        ${LAYERS.filter(([c]) => has(c)).map(([c, n, col]) =>
          `<label><input type="checkbox" data-l="${c}"${keep.off.has(c) ? '' : ' checked'}><span class="sw" style="background:${col}"></span>${n}</label>`).join('')}
        <span>Save: <a href="#" data-s="svg">SVG</a> · <a href="#" data-s="dxf">DXF (CAD)</a>${kicad ? ' · <a href="#" data-s="kicad_sch">KiCad schematic</a>' : ''}
          · <a href="#" data-s="pdf">PDF (vector)</a> · <a href="#" data-s="pptx">PowerPoint</a></span>`;
      bar.hidden = false;
      // the fader: 0 the scan alone · the traced ink comes in · past half the old lettering is covered and typed anew
      const fade = v => {
        const im = scan();
        if (im) im.style.opacity = 1 - .9 * v;
        el.style.setProperty('--ink', Math.min(1, v * 1.6));
        el.style.setProperty('--old', v < .5 ? Math.min(.8, v * 1.6) : Math.max(0, (1 - v) * 1.6));
        el.style.setProperty('--new', Math.max(0, (v - .45) * 1.9));
        el.style.setProperty('--mask', Math.max(0, Math.min(1, (v - .4) * 2.5)));
      };
      if (keep.hide) { if (scan()) scan().style.opacity = 1; } else fade(keep.fade / 100);
      // handlers set, not added: a PDF's next page takes the bar over
      bar.oninput = e => {
        const a = e.target.dataset.a, l = e.target.dataset.l;
        if (a === 'show') { keep.hide = !e.target.checked; el.style.display = e.target.checked ? '' : 'none';
          if (scan()) scan().style.opacity = e.target.checked ? '' : 1; if (e.target.checked) fade(keep.fade / 100); }
        if (a === 'fade') { keep.fade = +e.target.value; fade(e.target.value / 100); }
        if (l) { el.classList.toggle('l-' + l, e.target.checked); keep.off[e.target.checked ? 'delete' : 'add'](l); }
      };
      bar.onclick = e => {
        const s = e.target.dataset.s;
        if (!s) return;
        e.preventDefault();
        const done = blob => {
          const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${name} (traced).${s}` });
          document.body.appendChild(a); a.click(); a.remove();
        };
        if (s === 'svg') return done(new Blob([svg], { type: 'image/svg+xml' }));
        loadCad().then(async C => {   // made from the SVG, here
          const t = C.parseTrace(svg);
          if (s === 'dxf') return done(new Blob([C.toDxf(t)], { type: 'application/dxf' }));
          if (s === 'kicad_sch') return done(new Blob([C.toKicadSch(t)], { type: 'text/plain' }));
          if (s === 'pdf') return done(new Blob([C.toPdf(t)], { type: 'application/pdf' }));
          if (s === 'pptx') return done(await C.toPptx(t, await inkPng(svg, t), path));
        }).catch(err => alert('The converter (trace_cad.js) did not work: ' + err));
      };
      return true;
    });
  });
  // the trace drawn in ink on white, as a picture (for the PowerPoint slide)
  const inkPng = (svg, t) => new Promise((ok, bad) => {
    const ink = svg.replace(/<svg\b/, '<svg width="' + t.W + '" height="' + t.H + '"').replace('</svg>',
      '<style>path{fill:#1f1e1c}.cl,.block,text,.mask{display:none}</style></svg>');
    const im = new Image();
    im.onload = () => {
      const cv = Object.assign(document.createElement('canvas'), { width: t.W, height: t.H }), g = cv.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, t.W, t.H); g.drawImage(im, 0, 0);
      ok(cv.toDataURL('image/png'));
    };
    im.onerror = bad;
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ink);
  });
})();
