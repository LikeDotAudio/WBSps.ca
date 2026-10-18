/**
 * wbs_spice.js — each wiki device page draws its module live, as a SPICE subcircuit on the typed sheet.
 *
 * In the spirit of the Balanced Audio engine (spice-view.js, floating-meters.js): the netlist is generated from the
 * drawing's current values, every probe maps to a SPICE node, and the meters read those probes.
 *
 * With RTO-144 data (Engineering/RTO-144/<code>/<code>.rto144.json): the module is a subcircuit symbol with its balanced
 * audio pairs on the edge connector (pin numbers), power rails above and logic below. Inside, an ideal model:
 *   generator → R_IN (the RTO line-in impedance) → [60-x input transformer] → ideal E gain stage → [70-x output
 *   transformer] → R_OUT per leg → the rated load.  A VU meter (0 VU = +4 dBu) and a dBu / V readout on each output.
 * Without RTO data: the connection graph — the boards, transformers and sub-assemblies it is made of, and the modules,
 * consoles and jobs it is part of.
 *
 * Data: <script type="application/json" class="wbs-spice-data"> next to <div class="wbs-spice">.
 */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const REF = 0.7746;                                   // 0 dBu = 0.7746 V RMS
  const dbuToV = d => REF * Math.pow(10, d / 20), vToDbu = v => 20 * Math.log10(Math.max(v, 1e-9) / REF);
  const tier = d => d <= -30 ? 'mic' : d < -2 ? 'consumer' : d < 15 ? 'pro' : 'headroom';
  const TIER = { mic: '#b7791f', consumer: '#2b7a8c', pro: '#2e6b34', headroom: '#a8442a' };
  const CLIP = 24;                                      // +24 dBu: where a Ward-Beck ±25 V output stage runs out
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };
  const text = (parent, x, y, s, attrs = {}) => { const t = el('text', { x, y, ...attrs }, parent); t.textContent = s; return t; };
  const css = `
.wbs-spice { margin: 10px 0 18px; font-family: "Courier Prime", "Courier New", monospace }
.wbs-spice svg { width: 100%; height: auto; display: block; background: var(--paper, #fbfaf4) }
.wbs-spice .ctl { display: flex; flex-wrap: wrap; gap: 6px 16px; align-items: center; font-size: 13px; margin: 6px 0 }
.wbs-spice .ctl label { display: inline-flex; gap: 6px; align-items: center }
.wbs-spice .ctl input[type=range] { width: 120px; accent-color: var(--ink, #1f1e1c) }
.wbs-spice .ctl select, .wbs-spice .ctl button { font: inherit; background: transparent; border: 1px solid var(--rule, #cfcabc); padding: 1px 6px; color: inherit }
.wbs-spice .wire { fill: none; stroke-width: 1.6 }
.wbs-spice .flow { fill: none; stroke-width: 2.4; stroke-dasharray: 3 9; animation: wbs-flow var(--t, 1s) linear infinite }
.wbs-spice.off .flow { animation: none; opacity: .15 }
@keyframes wbs-flow { to { stroke-dashoffset: -24 } }
@media (prefers-reduced-motion: reduce) { .wbs-spice .flow { animation: none } }
.wbs-spice .sym { fill: none; stroke: var(--ink, #1f1e1c); stroke-width: 1.4 }
.wbs-spice text { fill: var(--ink, #1f1e1c); font-size: 14px }
.wbs-spice text.faint { fill: var(--faint, #6d6a63); font-size: 12px }
.wbs-spice text.big { font-size: 18px; font-weight: 700 }
.wbs-spice a text { fill: var(--link, #1f3f6b); text-decoration: underline }
.wbs-spice .probe { cursor: help }
.wbs-spice details { margin-top: 6px; font-size: 13px }
.wbs-spice pre { font-size: 12px; line-height: 1.45; overflow-x: auto; border-left: 3px solid var(--rule, #cfcabc); padding: 4px 0 4px 10px }
.wbs-spice table { font-size: 12.5px }
`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  function vuFace(g, x, y, label) {   // a Ward-Beck style VU: -20 … +3, red above 0 VU; returns a needle setter
    const r = 70, cx = x, cy = y + 84;
    el('rect', { x: x - 88, y, width: 176, height: 104, rx: 4, class: 'sym', fill: '#f4ecd2' }, g);
    const ang = vu => { const p = Math.min(1.15, Math.max(0, Math.pow(10, vu / 20)) / 1.4125); return (-50 + 100 * Math.min(1, p)) * Math.PI / 180; };
    for (const m of [-20, -10, -7, -5, -3, -2, -1, 0, 1, 2, 3]) {
      const a = ang(m), x1 = cx + Math.sin(a) * (r - 6), y1 = cy - Math.cos(a) * (r - 6), x2 = cx + Math.sin(a) * r, y2 = cy - Math.cos(a) * r;
      el('line', { x1, y1, x2, y2, stroke: m > 0 ? '#a8442a' : '#1f1e1c', 'stroke-width': m === 0 ? 1.6 : 1 }, g);
      if ([-20, -10, -5, 0, 3].includes(m)) text(g, cx + Math.sin(a) * (r + 7), cy - Math.cos(a) * (r + 7) + 3, m > 0 ? '+' + m : m,
        { 'text-anchor': 'middle', class: 'faint', style: m > 0 ? 'fill:#a8442a' : '' });
    }
    const a0 = ang(0), a3 = ang(3);
    el('path', { d: `M${cx + Math.sin(a0) * r},${cy - Math.cos(a0) * r} A${r},${r} 0 0 1 ${cx + Math.sin(a3) * r},${cy - Math.cos(a3) * r}`,
      stroke: '#a8442a', 'stroke-width': 3, fill: 'none' }, g);
    text(g, cx, y + 98, 'VU', { 'text-anchor': 'middle', class: 'faint' });
    text(g, cx, y + 122, label, { 'text-anchor': 'middle' });
    const needle = el('line', { x1: cx, y1: cy, x2: cx, y2: cy - r + 2, stroke: '#1f1e1c', 'stroke-width': 1.4 }, g);
    const read = text(g, cx, y + 140, '', { 'text-anchor': 'middle', class: 'faint' });
    let shown = -20;
    return (vu, dbu, volts, on) => {   // VU ballistics: 99 % of a step in about 300 ms
      const target = on ? vu : -40;
      shown += (target - shown) * 0.22;
      const a = ang(shown) * 180 / Math.PI;
      needle.setAttribute('transform', `rotate(${a.toFixed(2)} ${cx} ${cy})`);
      read.textContent = on ? `${dbu >= 0 ? '+' : ''}${dbu.toFixed(1)} dBu · ${volts < 1 ? (volts * 1000).toFixed(0) + ' mV' : volts.toFixed(2) + ' V'}` : '—';
      read.style.fill = dbu > CLIP - 1 ? '#a8442a' : '';
    };
  }

  function drawRTO(root, d) {
    // the signal name wins where the sheet's direction disagrees with it (M466 lists its OUT ports as "in")
    const dirOf = a => /(^|[^A-Z])(OUT|SEND)([^A-Z]|$)/i.test(a.signal) && !/OUT-IN|RETURN/i.test(a.signal) ? 'out'
      : /(^|[^A-Z])(IN|RETURN)([^A-Z]|$)/i.test(a.signal) ? 'in' : a.dir;
    d.rto.audio.forEach(a => { a.dir0 = a.dir; a.dir = dirOf(a); });
    const r = d.rto, ins = r.audio.filter(a => a.dir === 'in'), outs = r.audio.filter(a => a.dir === 'out'),
      ios = r.audio.filter(a => a.dir === 'io'), xfi = d.parts.filter(p => /^60-/.test(p.item)), xfo = d.parts.filter(p => /^70-/.test(p.item));
    const rin = (r.impedance && r.impedance.line_in) || 10000, rload = (r.impedance && r.impedance.out) || 600, rgen = 50, rout = 25;
    const micIn = a => /(^|[^A-Z])MIC([^A-Z]|$)/i.test(a.signal);
    const ctl = document.createElement('div'); ctl.className = 'ctl';
    ctl.innerHTML = `<label>Generator into <select class="s-in">${ins.map((a, i) => `<option value="${i}">${esc(a.port)} ${esc(a.signal)}</option>`).join('')}</select></label>
      <label>level <input type="range" class="s-lvl" min="-60" max="24" step="1"> <span class="s-lvlv"></span></label>
      <label>freq <select class="s-f"><option>100</option><option selected>1000</option><option>10000</option></select> Hz</label>
      <label>gain <input type="range" class="s-gain" min="-20" max="70" step="1"> <span class="s-gainv"></span></label>
      <button type="button" class="s-run">Stop</button>`;
    root.appendChild(ctl);
    const rows = Math.max(ins.length, outs.length + ios.length, 2), ROW = 46, metered = outs.slice(0, 4);
    const W = 820, H = 170 + rows * ROW + (metered.length ? 180 : 50) + Math.ceil((r.bus_out || []).length / 3) * 15 + ((r.bus_out || []).length ? 14 : 0);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${d.code} ideal SPICE model with RTO-144 connections` }, root);
    const g = el('g', {}, svg);
    // the subcircuit symbol
    const bx = 260, by = 104, bw = 300, bh = rows * ROW + 64;
    el('rect', { x: bx, y: by, width: bw, height: bh, class: 'sym' }, g);
    text(g, 6, 22, `X${d.code}  .subckt ${d.code}`, { class: 'big' });
    text(g, W - 6, 22, `${r.series || ''} ${r.type || ''} · ${r.derived ? 'from its documents' : 'RTO-144'}`, { 'text-anchor': 'end', class: 'faint' });
    const realPin = v => r.derived ? /^(P\d+-)?\d+$/.test(String(v || '')) : true;   // derived: a pin only where the page gave one
    // power rails above, logic and chassis below
    (r.power || []).forEach((p, i) => {
      const x = bx + 40 + i * 150;
      el('line', { x1: x, y1: by, x2: x, y2: by - 40, class: 'sym' }, g);
      text(g, x + 5, by - 32, `${p.rail} ${p.volts > 0 ? '+' : ''}${p.volts} V`, { class: 'faint' });
      text(g, x + 5, by - 17, realPin(p.supply) ? `pin ${p.supply}${p.max_a ? ` · ${p.max_a} A` : ''}` : 'named in its documents', { class: 'faint' });
    });
    (r.logic || []).concat(r.chassis ? [{ signal: 'CHASSIS', pin: r.chassis }] : []).forEach((l, i) => {
      const x = bx + 40 + i * 150;
      el('line', { x1: x, y1: by + bh, x2: x, y2: by + bh + 22, class: 'sym' }, g);
      text(g, x + 5, by + bh + 18, (l.pin ? `${l.signal} · pin ${l.pin}` : l.signal).slice(0, 26), { class: 'faint' });
    });
    // inside: the ideal chain
    const midY = by + bh / 2, chain = [];
    let lab = 0;   // labels alternate above and below the chain so they never run together
    const node = (x, label) => { chain.push(x); text(g, x, (lab++ % 2) ? midY - 26 : midY + 30, label, { 'text-anchor': 'middle', class: 'faint' }); };
    let x = bx + 34;
    el('rect', { x, y: midY - 7, width: 26, height: 14, class: 'sym' }, g); node(x + 13, `R_IN ${rin >= 1000 ? rin / 1000 + 'k' : rin} Ω`); x += 56;
    if (xfi.length) { drawXfmr(g, x, midY, xfi[0].item); node(x + 14, xfi[0].item); x += 56; }
    el('path', { d: `M${x},${midY - 18} L${x},${midY + 18} L${x + 36},${midY} Z`, class: 'sym' }, g); node(x + 16, 'E gain'); x += 62;
    if (xfo.length) { drawXfmr(g, x, midY, xfo[0].item); node(x + 14, xfo[0].item); x += 56; }
    el('rect', { x, y: midY - 7, width: 26, height: 14, class: 'sym' }, g); node(x + 13, `R_OUT ${rout} Ω ×2`);
    for (let k = 1; k < chain.length; k++) el('line', { x1: chain[k - 1] + 14, y1: midY, x2: chain[k] - 16, y2: midY, class: 'sym' }, g);
    // ports: inputs on the left, outputs and io on the right
    const pinY = i => by + 40 + i * ROW;
    const flows = [], meters = [];
    const port = (a, i, side) => {
      const y = pinY(i), xe = side === 'L' ? bx : bx + bw, xo = side === 'L' ? 60 : W - 60;
      el('line', { x1: xe, y1: y - 3, x2: xo, y2: y - 3, class: 'wire', stroke: '#1f1e1c' }, g);
      el('line', { x1: xe, y1: y + 3, x2: xo, y2: y + 3, class: 'wire', stroke: '#1f1e1c', 'stroke-dasharray': '1 2' }, g);
      const [fa, fb] = side === 'L' ? [xo, xe] : [xe, xo];   // the dots run with the signal: into the inputs, out of the outputs
      const f = el('line', { x1: fa, y1: y, x2: fb, y2: y, class: 'flow', stroke: 'transparent' }, g);
      const ta = side === 'L' ? 'start' : 'end';
      text(g, side === 'L' ? 6 : W - 6, y - 9, `${a.port} ${a.signal}`.slice(0, 28) + (a.dir0 && a.dir0 !== a.dir ? ' *' : ''), { 'text-anchor': ta });
      text(g, side === 'L' ? 6 : W - 6, y + 20, realPin(a.pos) ? (r.derived ? `pin ${a.pos}` : `+ pin ${a.pos}  − pin ${a.neg}`)
        : `named on page ${a.src_page || '?'}`, { 'text-anchor': ta, class: 'faint' });
      const t = el('title', {}, f); t.textContent = `V(${a.port}+, ${a.port}−)`;
      return f;
    };
    ins.forEach((a, i) => flows.push({ a, f: port(a, i, 'L'), kind: 'in' }));
    outs.concat(ios).forEach((a, i) => flows.push({ a, f: port(a, i, 'R'), kind: a.dir }));
    // summing buses it drives, in columns under the drawing
    const buses = r.bus_out || [], busRows = Math.ceil(buses.length / 3), busY = by + bh + 40;
    if (buses.length) text(g, 20, busY, 'Buses out:', { class: 'faint' });
    buses.forEach((b, i) => text(g, 110 + (i % 3) * 235, busY + Math.floor(i / 3) * 15, `${b.bus} → ${b.pos} / ${b.neg}`, { class: 'faint' }));
    // meters below the drawing, one per output (up to four)
    metered.forEach((a, i) => meters.push({ a, set: vuFace(g, 110 + i * 200, H - 158, `${a.port} ${a.signal}`.slice(0, 22)) }));
    if (!metered.length) text(g, 20, H - 22, 'No audio output on the edge connector to meter.', { class: 'faint' });
    if (r.audio.some(a => a.dir0 !== a.dir)) text(g, W - 6, H - 6, '* direction taken from the signal name; the RTO sheet says otherwise', { 'text-anchor': 'end', class: 'faint' });
    // SPICE netlist and probe table, written from the current values
    const det = document.createElement('details');
    det.innerHTML = '<summary>SPICE netlist (ideal model) and test points</summary><pre class="s-net"></pre><div class="s-pts"></div>';
    root.appendChild(det);
    const $ = s => root.querySelector(s);
    let running = true;
    const start = () => {
      const i0 = ins[+$('.s-in').value] || ins[0];
      $('.s-lvl').value = i0 && micIn(i0) ? -50 : 4;
      $('.s-gain').value = i0 && micIn(i0) ? 54 : 0;
    };
    $('.s-in').addEventListener('change', start);
    $('.s-run').addEventListener('click', () => { running = !running; $('.s-run').textContent = running ? 'Stop' : 'Run'; root.classList.toggle('off', !running); });
    start();
    function solve() {
      const lvl = +$('.s-lvl').value, gain = +$('.s-gain').value, f = +$('.s-f').value, src = ins[+$('.s-in').value] || ins[0];
      const vg = dbuToV(lvl), vin = vg * rin / (rin + rgen), vint = vin * Math.pow(10, gain / 20);
      const vclip = dbuToV(CLIP), vdrv = Math.min(vint, vclip), vout = vdrv * rload / (rload + 2 * rout);
      $('.s-lvlv').textContent = `${lvl >= 0 ? '+' : ''}${lvl} dBu`; $('.s-gainv').textContent = `${gain >= 0 ? '+' : ''}${gain} dB`;
      return { lvl, gain, f, src, vg, vin, vint, vdrv, vout, clip: vint > vclip };
    }
    function netlist(s) {
      const sp = s.src || { port: 'A1', pos: '1', neg: '2' };
      const lines = [`* ${d.code}${d.title ? ' — ' + d.title : ''}: ideal model from its RTO-144 connections`,
        `.subckt ${d.code} ${r.audio.map(a => `P${a.pos} P${a.neg}`).join(' ')}${(r.power || []).map(p => ` P${p.supply}`).join('')} P${(r.power || [])[0]?.ground || 0}`,
        `RIN   P${sp.pos} P${sp.neg} ${rin}        ; ${sp.port} ${sp.signal}: input impedance`,
        `EREC  n1 0 P${sp.pos} P${sp.neg} 1   ; ideal differential receiver`];
      if (xfi.length) lines.push(`* ${xfi[0].item} ${xfi[0].title || 'input transformer'}: ideal 1:1 (Ward-Beck's own winding)`);
      lines.push(`EGAIN n2 0 n1 0 ${Math.pow(10, s.gain / 20).toPrecision(4)}   ; ${s.gain} dB, clips at +${CLIP} dBu (±25 V rails)`);
      if (xfo.length) lines.push(`* ${xfo[0].item} ${xfo[0].title || 'output transformer'}: ideal 1:1`);
      outs.forEach(a => lines.push(`EO${a.port}P o${a.port}p 0 n2 0 0.5`, `EO${a.port}N o${a.port}n 0 n2 0 -0.5`,
        `RO${a.port}P o${a.port}p P${a.pos} ${rout}   ; ${a.port} ${a.signal}`, `RO${a.port}N o${a.port}n P${a.neg} ${rout}`));
      (r.power || []).forEach(p => lines.push(`* ${p.rail}: ${p.volts} V on pin ${p.supply}, ground pin ${p.ground}, ${p.max_a} A max`));
      lines.push('.ends', '', `VGEN  g 0 SIN(0 ${(s.vg * Math.SQRT2).toPrecision(4)} ${s.f})   ; ${s.lvl} dBu generator`,
        `RG    g gp ${rgen}`, `X1    gp 0 … ${d.code}`, ...outs.map(a => `RL${a.port}  P${a.pos} P${a.neg} ${rload}   ; rated load`),
        `.tran ${(1e6 / s.f / 50).toPrecision(3)}u ${(5e3 / s.f).toPrecision(3)}m`, '.end');
      return lines.join('\n');
    }
    let last = '';
    function frame() {
      const s = solve(), on = running;
      flows.forEach(({ a, f, kind }) => {
        const v = kind === 'in' ? (a === s.src ? s.vin : 0) : kind === 'out' ? s.vout : 0;
        const d2 = vToDbu(v), live = on && v > 0;
        f.setAttribute('stroke', live ? (s.clip && kind === 'out' ? TIER.headroom : TIER[tier(d2)]) : 'transparent');
        f.style.setProperty('--t', `${(1.6 - Math.log10(s.f) * 0.35).toFixed(2)}s`);
      });
      meters.forEach(m => { const d2 = vToDbu(s.vout); m.set(d2 - 4, d2, s.vout, on); });
      const key = JSON.stringify([s.lvl, s.gain, s.f, s.src && s.src.port]);
      if (key !== last) {
        last = key;
        $('.s-net').textContent = netlist(s);
        const pts = [['V(gp)', 'generator, after R_G', s.vg * rin / (rin + rgen)], ['V(n1)', 'after the receiver', s.vin],
          ['V(n2)', 'after the gain stage' + (s.clip ? ' (clipping)' : ''), s.vdrv], ...outs.map(a => [`V(P${a.pos},P${a.neg})`, `${a.port} ${a.signal} into ${rload} Ω`, s.vout])];
        $('.s-pts').innerHTML = '<table><tr><th>Test point</th><th>What it is</th><th>Reading</th></tr>' +
          pts.map(([n, w, v]) => `<tr><td>${esc(n)}</td><td>${esc(w)}</td><td>${vToDbu(v) >= 0 ? '+' : ''}${vToDbu(v).toFixed(1)} dBu · ${v.toFixed(3)} V</td></tr>`).join('') + '</table>';
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function drawXfmr(g, x, y, label) {   // two coils and a core: one of Ward-Beck's own transformers
    for (const dx of [0, 20]) for (let k = 0; k < 3; k++) el('path', { d: `M${x + dx},${y - 12 + k * 8} a4,4 0 0 ${dx ? 0 : 1} 0,8`, class: 'sym' }, g);
    el('line', { x1: x + 9, y1: y - 13, x2: x + 9, y2: y + 13, class: 'sym' }, g);
    el('line', { x1: x + 12, y1: y - 13, x2: x + 12, y2: y + 13, class: 'sym' }, g);
  }

  function drawGraph(root, d) {   // the module among what it is made of and what it is part of
    const left = d.parts.slice(0, 10), right = d.parents.slice(0, 10);
    const rows = Math.max(left.length, right.length, 1), W = 820, H = 60 + rows * 34;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${d.code} connections` }, root);
    const g = el('g', {}, svg), cx = W / 2, cy = H / 2;
    el('rect', { x: cx - 70, y: cy - 22, width: 140, height: 44, class: 'sym' }, g);
    text(g, cx, cy + 4, d.code, { 'text-anchor': 'middle', class: 'big' });
    text(g, 10, 16, 'made of', { class: 'faint' }); text(g, W - 10, 16, 'part of', { 'text-anchor': 'end', class: 'faint' });
    const side = (list, L) => list.forEach((n, i) => {
      const y = 40 + i * 34 + (rows - list.length) * 17, x = L ? 280 : W - 280;
      el('path', { d: `M${L ? x : x} ${y} C${(x + cx) / 2} ${y} ${(x + cx) / 2} ${cy} ${L ? cx - 70 : cx + 70} ${cy}`, class: 'wire', stroke: '#6d6a63' }, g);
      const a = el('a', { href: n.href }, g);
      text(a, L ? x - 6 : x + 6, y + 4, n.label.slice(0, 26), { 'text-anchor': L ? 'end' : 'start' });
      if (n.note) text(g, L ? x - 6 : x + 6, y + 15, n.note.slice(0, 30), { 'text-anchor': L ? 'end' : 'start', class: 'faint' });
    });
    side(left, true); side(right, false);
    if (!left.length && !right.length) text(g, cx, cy + 38, 'no connections traced yet', { 'text-anchor': 'middle', class: 'faint' });
  }

  document.querySelectorAll('.wbs-spice').forEach(root => {
    const data = root.nextElementSibling && root.nextElementSibling.matches('script.wbs-spice-data')
      ? JSON.parse(root.nextElementSibling.textContent) : null;
    if (!data) return;
    if (data.rto && data.rto.audio && data.rto.audio.length) drawRTO(root, data);
    if (data.parts.length || data.parents.length || !(data.rto && data.rto.audio && data.rto.audio.length)) drawGraph(root, data);
  });
})();
