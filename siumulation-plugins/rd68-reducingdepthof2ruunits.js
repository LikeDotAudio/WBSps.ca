/* =====================================================================
   RD68 — Reducing Depth of 2RU Units (Ward-Beck R&D register: priority B, Apr–Jul 2013)
   Plugin for the WBS Device Simulator (../siumulation.html)

   ScopeOfProject.txt (16 Apr 2013): "1. reduce the depth of the AMS16 by a minimum of 4 inches but go
   further if possible. 2. use standard metal work for all our 2RU units: ams82, ams16, xtm4".
   RD68/AutoCAD holds the prototype covers, sides and flat layouts (June 2013), and plot.log shows them
   printed between 17 and 28 June 2013. The outcome is in the AMS16 mechanical folder: "AMS16-8 INCH
   BOTTOM PAN", drawn 02 07 2013, an 8.000 in pan against the 12.000 in AMS16A2-M5.
   This plugin lays the real hole patterns out to scale, lets you cut the pan, and shows what had to move.
   Sources (all in this archive):
   - RD68-ReducingDepthOf2RUUnits/ScopeOfProject.txt · AutoCAD/*.dwg (recovered text: hole schedules) ·
       AutoCAD/plot.log (dates only) · README.md · R&D_List.xls (row 68)
   - AMS16 - #Master/AMS16 - #Mechanical #DA #2016/AMS16A2-M5 ISS.3 (BOTTOM PAN).pdf (17.250 × 12.000 in,
       holes A–E, revisions 2 "for 3G" 17/04/14 and 3 "new speaker box" 22/11/15)
     … AMS16-8 BOTTOM ISS 1 (8 INCH PAN) .pdf (17.250 × 8.000 in, drawn 02 07 2013, holes A–E)
     … AMS16-8 TOP / WING .dwg (recovered text: AMS8E-7 ISS.1 power supply connector; wing = "rlm series/RLM24
       LEFT/RIGHT SIDE PLATE", 46 countersinks, 35 pitches)
   - AMS82 - #Master/AMS82 - #Mechanical #DA #2016/AMS82-M12 ISS 1 (SIDE PLATE).dwg (same RLM24 side-plate text)
   - XTM4 - #MASTER/XTM4 - #Mechanical #DA #2016/XTM4-BOTTOM ISS 1 (PAN).pdf (17.120 × 10.024 in, 26 06 01)
   - XTM4 manual: 19" × 3.5" × 10.75" deep
   Hole positions are read off the drawings' ordinate dimensions; a few unlabelled ones are estimated
   from the drawing (marked inferred). The AMS82 pan depth is not in the archive.
   ===================================================================== */
(function(){
'use strict';
const SIM = window.SIM;
/* ---------- shared view kit (copied into each R&D plugin; no globals) ---------- */
const inf = '<span class="tag-inf" title="Not stated in the archive; inferred">inferred</span>';
const infW = why => `<span class="tag-inf" title="Inferred: ${String(why).replace(/"/g,'&quot;')}">inferred</span>`;
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function kv(rows){ return `<table class="kv">${rows.map(r=>`<tr><th>${r[0]}</th><td${r[2]?' class="mono"':''}>${r[1]}</td></tr>`).join('')}</table>`; }
function tbl(head, rows, cls){ return `<table class="kv ${cls||''}"><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table>`; }
const Y = y => SIM.year(y);
const fmt = (v,d) => (v==null||isNaN(v)) ? '—' : (+v).toFixed(d==null?2:d);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const hex2 = v => (v&0xFF).toString(16).toUpperCase().padStart(2,'0');
const hex3 = v => (v&0x3FF).toString(16).toUpperCase().padStart(3,'0');

/* action log: every user action records the code/document path it follows */
const LOG = { items: [] };
function act(name, fn){
  const trace = []; const tr = s => trace.push(s);
  try { fn(tr); } catch(e){ tr('error: '+e.message); console.error(e); }
  LOG.items.unshift({ t: SIM.t, name, trace });
  if (LOG.items.length > 60) LOG.items.length = 60;
  SIM.refresh();
}
function traceHTML(){
  const e = LOG.items[0];
  return e ? `<div><b>${e.name}</b> <span class="muted">at ${SIM.fmtT(e.t)}</span></div>` + e.trace.map(s=>`<div>→ ${s}</div>`).join('')
           : '<div class="muted">Use the controls. Each step the model takes (and the file or function it comes from) is listed here.</div>';
}
function logHTML(){ return LOG.items.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>'; }

/* generic clickable block diagram */
function blockView(m, B, W, opts){
  opts = opts || {};
  let sel = opts.start || Object.keys(B)[0];
  const vw = opts.w || 760, vh = opts.h || 470;
  m.innerHTML = `<div class="grid2"><div>${card(opts.title||'Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${opts.side? card(opts.sideTitle||'In one sentence', opts.side) : ''}</div></div>`;
  const draw = ()=>{
    const ctr = b=>[b.x+b.w/2, b.y+b.h/2];
    let s = `<svg viewBox="0 0 ${vw} ${vh}" style="width:100%"><defs><marker id="arBD" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    W.forEach(([a,b,l])=>{ const A_=B[a], B_=B[b]; if(!A_||!B_) return; let [x1,y1]=ctr(A_), [x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x, dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k, y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1);
      const hot = sel===a || sel===b;
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#arBD)"/>`;
      if (l) s += `<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`; });
    for (const k in B){ const b = B[k]; const on = sel===k; const live = b.live && b.live();
      s += `<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${live?'color-mix(in srgb,var(--accent) 14%,var(--panel2))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?2.5:1.2}"/>
        <text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>
        ${(b.s||[]).map((l,i)=>`<text x="${b.x+10}" y="${b.y+37+i*15}" font-size="11" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    s += '</svg>';
    m.querySelector('#bd').innerHTML = s;
    m.querySelectorAll('[data-b]').forEach(g=> g.onclick = ()=>{ sel = g.dataset.b; draw(); });
    const b = B[sel]; m.querySelector('#bdinfo').innerHTML = `<h3>${b.t}</h3><p>${b.d}</p>${b.src?`<p class="small muted mono">${b.src}</p>`:''}`;
  };
  draw();
  SIM.on('time', draw);
}

/* schematic sheets (redrawn, net-label style) */
function chip(x,y,w,name,left,right,sub){
  const n = Math.max(left.length, right.length), h = 26 + n*18;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
function sheetsView(m, SHEETS, label, caption){
  let i = 0;
  m.innerHTML = card(`Schematic set — redrawn from ${label}, not the original CAD`, `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p><p class="small muted">${caption}</p>`);
  const draw = ()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=> b.onclick = ()=>{ i = +b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 860 470" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px">
      <rect x="6" y="6" width="848" height="458" fill="none" stroke="var(--line)"/><text x="840" y="455" text-anchor="end" font-size="10" fill="var(--ink2)">${label} · sheet ${i+1}/${SHEETS.length} · redrawn 2026|59</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').innerHTML = SHEETS[i].note;
  };
  draw();
  SIM.on('time', draw);
}

/* tutorial engine: lessons with live goal checks and hints */
function tutorialView(m, L, st, opts){
  m.innerHTML = `<div class="grid2">
    <div>${card(opts.title, `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
    <div>${card(opts.panelTitle||'The model', `<div id="tpanel"></div>`)}${card('What the model did (last action)', `<div id="trace" class="log"></div>`)}</div></div>`;
  const draw = ()=>{
    opts.panel(m.querySelector('#tpanel'));
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#lessons').innerHTML = L.map((l,i)=>`<li style="cursor:pointer;${i===st.i?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<st.i?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick = ()=>{ st.i = +li.dataset.i; draw(); });
    const l = L[st.i]; let ok = false; try { ok = !!l.check(); } catch(e){ ok = false; }
    m.querySelector('#lesson').innerHTML = `<h2>${l.title}</h2>${l.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok? (l.auto?'Ready.':'✓ Goal reached.') : '◻ Not yet. <span class="muted">Hint: '+(l.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${st.i?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${st.i<L.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick = ()=>{ st.i = Math.max(0, st.i-1); draw(); };
    m.querySelector('#nxt').onclick = ()=>{ st.i = Math.min(L.length-1, st.i+1); draw(); };
    m.querySelector('#rs').onclick = ()=>{ opts.reset(); st.i = 0; draw(); };
  };
  SIM.on('time', draw);
}

/* small helpers for the timeline */
function laneText(c, X, t0, y, h, s, col){ c.fillStyle = col || SIM.css('--ink2'); c.font = '11px '+SIM.css('--sans'); c.fillText(s, X(t0)+6, y+h/2+4); }
function bandAt(c, X, a, b, y, h, col, alpha, label){ c.fillStyle = col; c.globalAlpha = alpha==null?.6:alpha; c.fillRect(X(a), y+3, Math.max(1, X(b)-X(a)), h-6); c.globalAlpha = 1; if (label && X(b)-X(a) > c.measureText(label).width+8){ c.fillStyle = '#fff'; c.font = '10px '+SIM.css('--sans'); c.fillText(label, X(a)+4, y+h/2+3); } }
/* bind [data-a] buttons inside root to a map of functions */
function bindActs(root, map){ root.querySelectorAll('[data-a]').forEach(b=>{ const f = map[b.dataset.a]; if (f) b.onclick = e=>{ e.preventDefault(); f(b.dataset.v, b); }; }); }
const plink = (id, txt) => `<a href="siumulation.html?plugin=${id}">${txt}</a>`;
/* level-per-symbol waveform (NRZ/NRZI/biphase cells); falls back to a counted band when too dense */
function bitsLane(c, X, t0, t1, y, h, T, levelFn, col, label){
  const px = X(t0+T)-X(t0);
  if (px < 2){ return SIM.pulses(c, X, t0, t1, y, h, T, 0, T/2, col, label); }
  const n0 = Math.floor(t0/T), n1 = Math.ceil(t1/T);
  c.strokeStyle = col; c.lineWidth = 1.5; c.beginPath();
  let prev = null;
  for (let n=n0; n<=n1; n++){ const v = levelFn(n); const yy = y+4+(1-v)*(h-8); const xa = X(n*T), xb = X((n+1)*T);
    if (prev===null) c.moveTo(xa, yy); else c.lineTo(xa, yy); c.lineTo(xb, yy); prev = v; }
  c.stroke(); c.lineWidth = 1;
}
/* smooth function lane: fn(t) in −1…1 */
function waveLane(c, X, t0, t1, y, h, fn, col, N){
  N = N || 600; c.strokeStyle = col; c.lineWidth = 1.4; c.beginPath();
  for (let i=0;i<=N;i++){ const t=t0+(t1-t0)*i/N; const v=fn(t); const yy=y+h/2-v*(h/2-3); i?c.lineTo(X(t),yy):c.moveTo(X(t),yy); }
  c.stroke(); c.lineWidth = 1;
}
/* deterministic pseudo-random 0/1 for symbol n (so the picture does not flicker) */
const prand = n => { let x = (n*2654435761)>>>0; x ^= x>>>13; x = Math.imul(x, 0x5bd1e995)>>>0; x ^= x>>>15; return x & 1; };

/* ================= drawings (inches; x from left flange, y from REAR edge, front at y = depth) ================= */
const H = { A:'.114 csk (cover screws)', B:'.167 flange insert S-440-0', C:'.167 insert TSO-440×250 standoff', D:'.167 insert SO-440-14 (main board)', E:'.213 insert TSO-6440×250 (power supply)', S:'speaker-box screw (A)' };
const PANS = {
  ams16a2:{ name:'AMS16A2-M5 ISS 3 (2007–2015)', w:17.25, d:12.0, date:'20 09 2007', src:'AMS16A2-M5 ISS.3 (BOTTOM PAN).pdf',
    holes:[ ...[1.125,6.125,11.125,16.125].map(x=>['A',x,0.4]), ...[0.9,6.0,11.0,16.0].map(x=>['A',x,11.6,1]),
      ['D',2.537,1.781],['D',8.542,1.781],['D',2.537,6.231],['D',8.542,6.231],
      ['E',11.865,1.875],['E',16.435,1.875],['E',11.865,4.445],['E',16.435,4.445],
      ['C',9.696,2.0,1],['C',10.646,2.0,1],['C',10.146,3.9,1],['C',6.960,9.953],['C',8.460,9.953],['C',9.672,9.953],['C',11.172,9.953],
      ['A',7.427,7.177],['A',8.177,7.177],['A',10.139,7.177],['A',10.889,7.177],
      ...[0.385,3.835,13.415,16.865].flatMap(x=>[['S',x,7.3],['S',x,9.7]]) ],
    flange:[1.0,6.0,11.0] },
  ams168:{ name:'AMS16-8 ISS 1 (RD68 result)', w:17.25, d:8.0, date:'02 07 2013', src:'AMS16-8 BOTTOM ISS 1 (8 INCH PAN) .pdf',
    holes:[ ...[1.125,6.125,11.125,16.125].map(x=>['A',x,0.4]), ...[1.125,6.125,11.125,16.125].map(x=>['A',x,7.6]), ['A',9.036,1.851],['A',9.036,4.101],
      ['D',2.537,1.781],['D',8.542,1.781],['D',2.537,6.231],['D',8.542,6.231],
      ['E',10.730,1.0],['E',15.300,1.0],['E',10.730,3.570],['E',15.300,3.570],
      ['C',9.780,4.570],['C',10.730,4.570],['C',10.230,6.670] ],
    flange:[1.0,4.0,7.0] },
  xtm4:{ name:'XTM4-BOTTOM ISS 1 (2001)', w:17.12, d:10.024, date:'26 06 2001', src:'XTM4-BOTTOM ISS 1 (PAN).pdf',
    holes:[ ...[0.61,5.91,11.21,16.51].flatMap(x=>[['A',x,0.3],['A',x,9.72]]), ['C',1.06,1.937,1],['C',16.06,1.937,1],['C',8.56,5.087],['C',1.26,8.687,1],['C',16.06,8.687,1] ],
    flange:[0.687,5.012,9.337] },
};
/* RD68 prototype hole schedule (AutoCAD/bottom cover prototype.dwg recovered text) */
const PROTO = { A:8, C:3, D:4, E:4, Dnote:'TSO-440X.437 OR SO-440-14', top:'top cover flat layout: 24 × (A), 4 × (C)' };
const UNITS = { ams16:{ name:'AMS16 (AMS16A2)', d:12.0, src:'AMS16A2-M5 pan', plug:'ams16' }, ams82:{ name:'AMS8-2', d:null, src:'not in the archive', plug:'ams82' }, xtm4:{ name:'XTM4', d:10.024, src:'XTM4-BOTTOM pan; manual 10.75 in overall', plug:'xtm4' } };

/* ================= state ================= */
const D = { pan:'ams16a2', cut:12.0, sel:null, show:'both', heat:30 };
function reset(){ Object.assign(D,{ pan:'ams16a2', cut:12.0, sel:null, show:'both', heat:30 }); LOG.items=[]; SIM.refresh(); }
const P = ()=> PANS[D.pan];
/* what falls off when the chosen pan is cut to depth `cut` (front flange and cover screws move with the front) */
function cutReport(){
  const p=P(), lost=p.holes.filter(h=>h[2] > D.cut-0.35 && !(h[0]==='A'&&h[2]>p.d-0.5));
  const groups={}; lost.forEach(h=>{ groups[h[0]]=(groups[h[0]]||0)+1; });
  const boardOK = D.cut >= 6.231+0.4;
  return { lost, groups, boardOK, saved:p.d-D.cut, meets: (12.0-D.cut)>=4 };
}
const A = {
  pan(v){ act('Drawing → '+PANS[v].name, tr=>{ D.pan=v; D.cut=PANS[v].d; const p=P(); tr(`${p.src}: ${p.w.toFixed(3)} × ${p.d.toFixed(3)} in, drawn ${p.date}`); tr(`${p.holes.length} holes; flange inserts (B) at ${p.flange.join(', ')} in from the rear`); }); },
  cut(v){ act(`Cut ${P().name.split(' ')[0]} to ${v} in deep`, tr=>{ D.cut=+v; const r=cutReport(); tr(`Saves ${r.saved.toFixed(3)} in on this pan; vs the 12.000 in AMS16: ${(12-D.cut).toFixed(3)} in → ${r.meets?'meets':'<b style="color:var(--bad)">misses</b>'} “a minimum of 4 inches”`); tr(r.lost.length?`Must move: ${Object.entries(r.groups).map(([k,n])=>n+' × '+k+' ('+H[k]+')').join(', ')}`:'Nothing has to move'); tr(r.boardOK?'Main board (D holes, 1.781–6.231 in from rear) still fits':'<b style="color:var(--bad)">Main-board standoffs (D) fall off the pan</b>'); }); },
  hole(i){ act('Hole '+(+i+1), tr=>{ D.sel=+i; const h=P().holes[+i]; tr(`${h[0]}: ${H[h[0]]} at x ${h[1].toFixed(3)}, ${h[2].toFixed(3)} in from rear ${h[3]?inf:''}`); }); },
  heat(v){ act(`Assumed dissipation → ${v} W`, tr=>{ D.heat=+v; tr('Power is not stated for the AMS16; the AMS8E-1 test sheet gives 0.35–0.74 A at +5 V for one main board '+inf); }); },
};

/* ================= drawing ================= */
const COL = { A:'#888', B:'#5b8bd6', C:'#d9a33a', D:'#2bb36b', E:'#d64b4b', S:'#a970d6' };
function panSVG(key, opts){
  opts=opts||{}; const p=PANS[key], U=44, pad=30, W=p.w*U, Hh=p.d*U, cut=opts.cut;
  let s=`<svg viewBox="0 0 ${W+2*pad} ${12*U+2*pad+30}" style="width:100%;display:block" role="img" aria-label="${p.name}, top view to scale">
    <text x="${pad}" y="18" font-size="14" fill="var(--ink)">${p.name} · ${p.w.toFixed(3)} × ${p.d.toFixed(3)} in · REAR ↑</text>
    <rect x="${pad}" y="${pad}" width="${W}" height="${Hh}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.5"/>`;
  if (cut!=null && cut<p.d) s+=`<rect x="${pad}" y="${pad+cut*U}" width="${W}" height="${(p.d-cut)*U}" fill="color-mix(in srgb,var(--bad) 18%,transparent)" stroke="var(--bad)" stroke-dasharray="8 6"/><text x="${pad+8}" y="${pad+cut*U+18}" font-size="13" fill="var(--bad)">cut at ${cut} in — removed</text>`;
  s+=`<rect x="${pad+2.537*U-12}" y="${pad+1.781*U-12}" width="${6.005*U+24}" height="${4.45*U+24}" rx="6" fill="none" stroke="#2bb36b" stroke-dasharray="4 4"/><text x="${pad+2.537*U}" y="${pad+1.781*U-16}" font-size="11" fill="#2bb36b">main board (D)</text>`;
  p.holes.forEach((h,i)=>{ const x=pad+h[1]*U, y=pad+h[2]*U, sel=opts.sel===i; const gone = cut!=null && cut<p.d && h[2]>cut-0.35 && !(h[0]==='A'&&h[2]>p.d-0.5);
    s+=`<g data-a="hole" data-v="${i}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${h[0]==='E'?8:6}" fill="${gone?'var(--bad)':COL[h[0]]}" stroke="${sel?'var(--accent)':'#222'}" stroke-width="${sel?3:1}" ${h[3]?'stroke-dasharray="2 2"':''}/><text x="${x+9}" y="${y-6}" font-size="10" fill="var(--ink2)">${h[0]==='S'?'A':h[0]}</text><title>${h[0]}: ${H[h[0]]} (${h[1]}, ${h[2]})${h[3]?' — position estimated':''}</title></g>`; });
  p.flange.forEach(y=>{ s+=`<circle cx="${pad-12}" cy="${pad+y*U}" r="5" fill="${COL.B}"/>`; });
  s+=`<text x="${pad+W/2}" y="${pad+Hh+20}" text-anchor="middle" font-size="13" fill="var(--ink2)">FRONT</text>
    <text x="${pad}" y="${12*U+2*pad+24}" font-size="12" fill="var(--ink2)">${p.src} · dashed = estimated position (inferred) · blue = flange inserts (B)</text></svg>`;
  return s;
}
function sideSVG(){
  const U=34, rows=[['AMS16A2 pan',12.0],['XTM4 pan',10.024],['AMS16-8 pan (RD68)',8.0],['Your cut',D.cut]];
  let s=`<svg viewBox="0 0 640 ${rows.length*44+40}" style="width:100%" role="img" aria-label="Depth comparison">`;
  rows.forEach(([n,d],i)=>{ const y=10+i*44; s+=`<text x="6" y="${y+22}" font-size="12" fill="var(--ink)">${n}</text><rect x="160" y="${y+6}" width="${d*U}" height="26" rx="3" fill="${i===2?'color-mix(in srgb,var(--accent) 40%,var(--panel2))':i===3?'color-mix(in srgb,var(--warn) 40%,var(--panel2))':'var(--panel2)'}" stroke="var(--line)"/><text x="${166+d*U}" y="${y+24}" font-size="12" fill="var(--ink2)">${d.toFixed(3)} in</text>`; });
  s+=`<line x1="${160+8*U}" y1="0" x2="${160+8*U}" y2="${rows.length*44+10}" stroke="var(--accent)" stroke-dasharray="4 4"/><text x="${160+8*U+4}" y="${rows.length*44+30}" font-size="11" fill="var(--accent)">12 − 4 = 8 in target</text></svg>`;
  return s;
}
function ctlHTML(){
  const b=(a,v,l,on)=>`<button data-a="${a}" data-v="${v}" class="${on?'on':''}">${l}</button>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span class="small muted">drawing</span>${Object.keys(PANS).map(k=>b('pan',k,PANS[k].name.split(' (')[0],D.pan===k)).join('')}
    <span class="small muted">| cut depth</span>${[12,10.024,9,8,7,6].filter(v=>v<=P().d+1e-9).map(v=>b('cut',v,v+' in',Math.abs(D.cut-v)<1e-6)).join('')}</div>`;
}
function bindAll(root){ bindActs(root,{ pan:v=>A.pan(v), cut:v=>A.cut(+v), hole:v=>A.hole(v), heat:v=>A.heat(+v) }); }

/* ================= timeline: what one second means for a shallower box ================= */
/* steady temperature rise of the internal air by natural convection through the vents is not modelled;
   instead the lanes compare stored air and the time for the dissipated energy to warm it (inferred physics). */
function air(){ const vol=P().w*D.cut*3.2; const m=vol*16.387e-6*1.2; return { vol, m, dTps: D.heat/(m*1005) }; }
function lanes(){
  const css=SIM.css, a=air();
  return [
    { label:'Inside, unchanged: 48 kHz audio', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/48000,0,1/96000,css('--accent'),'samples'); } },
    { label:'Inside, unchanged: SDI fields (59.94 Hz)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1001/60000,0,0.0005,css('--accent2'),'fields'); } },
    { label:`Heat in: ${D.heat} W ${'(inferred)'}`, h:22, draw(c,X,t0,t1,y,h){ bandAt(c,X,t0,t1,y,h,css('--warn'),.35,`${(D.heat*(t1-t0)).toFixed(3)} J in this window`); } },
    { label:`Enclosed air ${a.vol.toFixed(0)} in³ (${(a.m*1000).toFixed(0)} g)`, h:30, draw(c,X,t0,t1,y,h){ c.strokeStyle=css('--bad'); c.beginPath(); for(let i=0;i<=200;i++){ const t=t0+(t1-t0)*i/200; const dT=a.dTps*t; const yy=y+h-3-Math.min(1,dT/10)*(h-6); i?c.lineTo(X(t),yy):c.moveTo(X(t),yy);} c.stroke(); laneText(c,X,t0,y,h,`unvented air would warm ${a.dTps.toFixed(2)} °C per second ${'(inferred)'}`,css('--ink2')); } },
  ];
}

/* ================= views ================= */
function viewSim(m){
  m.innerHTML = `${card('Bottom pan, top view, to scale — click a hole', `<div id="pan"></div><div id="ctl" style="margin-top:6px"></div>`)}
   <div class="grid2">${card('Depth comparison', `<div id="side"></div>`)}<div>${card('Cut report', `<div id="rep"></div>`)}${card('What the model did', `<div id="trace" class="log"></div>`)}</div></div>
   ${card('Timeline — the electronics do not care; the air does', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ const pn=m.querySelector('#pan'); pn.innerHTML=panSVG(D.pan,{cut:D.cut,sel:D.sel}); bindAll(pn); const c=m.querySelector('#ctl'); c.innerHTML=ctlHTML(); bindAll(c);
    m.querySelector('#side').innerHTML=sideSVG(); const r=cutReport();
    m.querySelector('#rep').innerHTML=kv([['Pan',P().name],['Cut to',D.cut.toFixed(3)+' in'],['Saved vs AMS16 12.000 in',(12-D.cut).toFixed(3)+' in'+(r.meets?' ✓ ≥ 4 in':' ✗ < 4 in')],['Holes that must move',r.lost.length?Object.entries(r.groups).map(([k,n])=>`${n} × ${k}`).join(', '):'none'],['Main board',r.boardOK?'fits':'does not fit']]);
    m.querySelector('#trace').innerHTML=traceHTML(); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:240}); };
  SIM.on('time', draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'The brief', body:`<p>16 Apr 2013|46: take at least 4 inches out of the AMS16, and make one set of metalwork for all the 2RU units (AMS82, AMS16, XTM4). Start where the engineer started: the existing AMS16A2 bottom pan, 12.000 in deep.</p>`, check:()=>true, auto:true },
  { title:'1 · Just cut it', body:`<p>With the <b>AMS16A2-M5</b> drawing selected, cut to <b>8 in</b>. Everything forward of 7.65 in turns red: the front speaker-box screws (row 9.700; the box itself spans 7.300–9.700 and straddles the cut) and the four C standoffs at 9.953. The main-board pattern D survives.</p>`, check:()=>D.pan==='ams16a2'&&Math.abs(D.cut-8)<1e-6, hint:'Press 8 in.' },
  { title:'2 · Too far', body:`<p>Try <b>6 in</b>. Now the main board's front standoffs (D at 6.231 in) are gone: 8 in is about as shallow as the AMS16 can go without moving its main board.</p>`, check:()=>Math.abs(D.cut-6)<1e-6, hint:'Press 6 in.' },
  { title:'3 · The answer that was drawn', body:`<p>Select the <b>AMS16-8</b> drawing (drawn 2 Jul 2013). Same main-board pattern D, the power-supply pattern E moved to 1.000–3.570 in from the rear and 4.9 in to the left, three C standoffs, no speaker box.</p>`, check:()=>D.pan==='ams168', hint:'Press AMS16-8 ISS 1.' },
  { title:'4 · Check the prototype', body:`<p>Click an <b>E</b> hole (red). The prototype drawing in RD68 lists exactly 4 × E (.213, TSO-6440×.250), 4 × D, 3 × C, and 8 × A countersinks; the issued pan has 10 A. See the Software tab for the side-by-side.</p>`, check:()=>D.pan==='ams168'&&D.sel!=null&&P().holes[D.sel][0]==='E', hint:'Click one of the four red circles on the right.' },
  { title:'5 · Common metalwork', body:`<p>Select the <b>XTM4</b> pan: 17.120 × 10.024 in from 2001, with a different width and its own hole grid. Making it share the AMS16-8 metal means new XTM4 brackets, not a cut.</p>`, check:()=>D.pan==='xtm4', hint:'Press XTM4-BOTTOM ISS 1.' },
  { title:'Done', body:`<p>The 8-inch AMS16 pan, top and wing exist; the common-metal part is the shared RLM24 side plate. See the Findings tab, and ${plink('ams16','AMS16')}, ${plink('ams82','AMS8-2')}, ${plink('xtm4','XTM4')}.</p>`, check:()=>true, auto:true },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — taking 4 inches out of the AMS16', panelTitle:'Pan drawing and cut', reset,
  panel(el){ el.innerHTML = panSVG(D.pan,{cut:D.cut,sel:D.sel})+ctlHTML(); bindAll(el); } }); }
function viewSecond(m){
  m.innerHTML = `${card('One second in a shallower box', `<div id="lad"></div><div style="display:flex;gap:6px;margin-top:6px"><span class="small muted">assumed dissipation</span>${[15,30,45].map(v=>`<button data-a="heat" data-v="${v}" class="${D.heat===v?'on':''}">${v} W</button>`).join('')}</div>`)}`;
  const draw=()=>{ const a=air(), full={vol:17.25*12*3.2}; m.querySelector('#lad').innerHTML = tbl(['Quantity','value','note'],[
      ['Audio samples per channel','48,000','unchanged by depth'],['SDI fields','59.94','unchanged'],
      ['Energy dissipated',`${D.heat} J`,inf],['Enclosed air',`${a.vol.toFixed(0)} in³ (${((1-a.vol/full.vol)*100).toFixed(0)} % less than 12 in)`,'pan area × 3.2 in internal height '+inf],
      ['Unvented warming rate',`${a.dTps.toFixed(2)} °C/s`,'why vents and the heatsink cut-out (“FOR HEATSINK” on the AMS16-8 drawing) matter'],
    ]); bindAll(m); };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B={
    scope:{x:20,y:20,w:220,h:80,t:'Scope (16 Apr 2013)',s:['AMS16 −4 in minimum','one metal set for 2RU'],d:'ScopeOfProject.txt.'},
    proto:{x:300,y:20,w:220,h:80,t:'RD68 prototypes',s:['bottom, top, sides','flat layouts, “petermod”'],d:'AutoCAD/*.dwg, June 2013; plot.log 17–28 Jun 2013.'},
    pan8:{x:580,y:20,w:220,h:80,t:'AMS16-8 pan / top / wing',s:['8.000 in deep','drawn 02 07 2013'],d:'The issued 8-inch parts in the AMS16 mechanical folder.'},
    mb:{x:300,y:160,w:220,h:80,t:'Main board (D)',s:['2.537–8.542 × 1.781–6.231 in','same in both pans'],d:'The SO-440-14 standoff pattern does not move.'},
    psu:{x:580,y:160,w:220,h:80,t:'Power supply (E)',s:['AMS8E-7 ISS 1 connector','moved rear-left'],d:'AMS16-8 drawings name the AMS8E-7 ISS.1 power-supply connector.'},
    spk:{x:20,y:160,w:220,h:80,t:'Speaker box',s:['A rows 7.3 / 9.7 in','absent in AMS16-8'],d:'The 12-in pan carries a speaker box; the 8-in pan has no mounting holes for it.'},
    side:{x:300,y:300,w:220,h:80,t:'Side plate (RLM24)',s:['46 csk, 35 pitches','AMS16-8 wing = AMS82-M12'],d:'Both drawings carry the “rlm series/RLM24 LEFT/RIGHT SIDE PLATE” text: the common metal.'},
  };
  blockView(m,B,[['scope','proto',''],['proto','pan8',''],['pan8','mb','keeps'],['pan8','psu','moves'],['pan8','spk','drops'],['pan8','side','shares']],{start:'pan8',w:820,h:400,side:'<p>The 8-inch AMS16 keeps its main board where it was and moves or drops everything in front of 7.6 in.</p>'});
}
const SHEETS=[
  { name:'1 · Hole schedules compared', note:'Redrawn as a table-sheet: RD68 prototype text vs the two issued pans.', svg:()=>{
    const rows=[['Hole','RD68 prototype (dwg text)','AMS16-8 ISS 1','AMS16A2-M5 ISS 3'],['A .114 csk','8','10','8 + 8 speaker box'],['C .167 TSO-440×250','3','3','7'],['D .167 SO-440-14','4 (“TSO-440X.437 OR SO-440-14”)','4','4'],['E .213 TSO-6440×250','4','4','4'],['B flange S-440-0','—','6 (1, 4, 7 in)','6 (1, 6, 11 in)']];
    return rows.map((r,i)=>r.map((c,j)=>`<text x="${30+[0,170,450,620][j]}" y="${50+i*36}" font-size="${i?12:13}" font-weight="${i?400:700}" fill="var(--ink)">${c}</text>`).join('')+`<line x1="24" y1="${58+i*36}" x2="840" y2="${58+i*36}" stroke="var(--line)"/>`).join(''); } },
  { name:'2 · AMS16-8 pan, dimensioned', note:'Ordinates from the AMS16-8 drawing (inches from the left flange and the rear edge).', svg:()=> {
    const p=PANS.ams168, U=44, ox=40, oy=40; let s=`<rect x="${ox}" y="${oy}" width="${p.w*U}" height="${p.d*U}" fill="none" stroke="var(--ink)"/>`;
    p.holes.forEach(h=>{ s+=`<circle cx="${ox+h[1]*U}" cy="${oy+h[2]*U}" r="4" fill="none" stroke="var(--ink)"/><text x="${ox+h[1]*U+6}" y="${oy+h[2]*U+4}" font-size="9" fill="var(--accent2)">${h[0]} ${h[1]},${h[2]}</text>`; });
    return s+`<text x="${ox}" y="${oy-8}" font-size="11" fill="var(--ink2)">17.250 × 8.000 · .036 CRS 20 ga · WBS black texture</text>`; } },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'the RD68 and AMS16 mechanical drawings', 'A mechanical project: these “schematics” are the hole schedules and the dimensioned pan, redrawn from the PDFs and the DWG text.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('Design steps (RD68 file dates)', `<div id="st"></div>`)}${card('Both AMS16 pans, same scale', `<div id="two"></div>`)}</div>`;
  const draw=()=>{ const st=[['16 Apr 2013','ScopeOfProject.txt'],['29 May 2013','sides prototype.dwg'],['17–18 Jun 2013','bottom cover prototype.dwg plotted 4×'],['21 Jun 2013','top cover prototype / flat layout'],['27 Jun 2013','top cover flat layout petermod'],['28 Jun 2013','petermod2, bottom cover flat'],['2 Jul 2013','AMS16-8 BOTTOM ISS 1 drawn'],['19 Mar 2014','AMS16-8 top/bottom DWG saved'],['17 Apr 2014','AMS16A2-M5 rev 2 “for 3G”']];
    const k=Math.min(st.length-1, Math.floor(SIM.t*st.length));
    m.querySelector('#st').innerHTML = `<svg viewBox="0 0 520 ${st.length*34+10}" style="width:100%">${st.map((s,i)=>`<rect x="6" y="${6+i*34}" width="508" height="26" rx="6" fill="${i===k?'color-mix(in srgb,var(--accent) 30%,var(--panel2))':'var(--panel2)'}" stroke="var(--line)"/><text x="16" y="${24+i*34}" font-size="12" fill="var(--ink)">${s[0]} — ${s[1]}</text>`).join('')}</svg><p class="small muted">The playhead steps through the dates (1 s = the whole project).</p>`;
    m.querySelector('#two').innerHTML = panSVG('ams16a2',{cut:8}) + panSVG('ams168',{});
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  m.innerHTML = card('What RD68 decided, and what became of it', `<ol>
    <li><b>Done for the AMS16: exactly 4 inches.</b> The AMS16A2 pan is 12.000 in deep; the AMS16-8 pan, drawn 2 Jul 2013 a week after the RD68 prototypes were plotted, is 8.000 in. The scope's “go further if possible” did not happen: the main-board standoffs at 6.231 in leave little room.</li>
    <li><b>The RD68 prototype is the AMS16-8.</b> The prototype's recovered hole schedule (4 × D “TSO-440X.437 OR SO-440-14”, 4 × E .213, 3 × C) matches the issued AMS16-8 pan. Only the A countersinks differ (8 vs 10: the issued pan adds two at x 9.036).</li>
    <li><b>What moved.</b> The main board (D) stays put. The supply pattern E (same 4.570 × 2.570 in spacing) moves to the rear-left, the C standoffs drop from 7 to 3, and the speaker-box holes disappear. The AMS16-8 drawings also name an AMS8E-7 ISS 1 power-supply connector and a heatsink cut-out.</li>
    <li><b>“Standard metal work” is the side plate.</b> The AMS16-8 WING and the AMS82-M12 side plate both carry the text “rlm series/RLM24 LEFT/RIGHT SIDE PLATE”, 46 countersinks and 35 pitches: one side plate shared across 2RU units. No 8-inch XTM4 or AMS82 pan is in the archive.</li>
    <li><b>The 12-inch pan lived on.</b> AMS16A2-M5 was still revised after RD68: issue 2 (17/04/14) changed four TSO-440×250 inserts to SO-440-14 “for 3G” (the same D-hole option the RD68 prototype already listed), and issue 3 (22/11/15) moved 8 holes for a new speaker box.</li>
    <li><b>Register status.</b> R&amp;D_List.xls keeps RD68 at priority B with no completion mark, although the 8-inch parts were drawn.</li>
  </ol>`) + card('Assumptions', `<ul class="small"><li>Positions of a few unlabelled holes (AMS16A2 front A row and three C holes; XTM4 inserts) are read from the drawing (${inf}).</li><li>The AMS82 pan depth is not in the archive.</li><li>Internal height 3.2 in, dissipation and the air-warming figure are illustrative (${inf}).</li></ul>`) +
  card('Sources', `<ul class="small mono"><li>XXX - ENGINEERING - 2016 RD FILES/RD68-ReducingDepthOf2RUUnits/ScopeOfProject.txt, AutoCAD/*.dwg, plot.log</li><li>AMS16 - #Master/AMS16 - #Mechanical #DA #2016/AMS16A2-M5 ISS.3 (BOTTOM PAN).pdf, AMS16-8 BOTTOM ISS 1 (8 INCH PAN) .pdf, AMS16-8 TOP/WING .dwg</li><li>AMS82 - #Master/AMS82 - #Mechanical #DA #2016/AMS82-M12 ISS 1 (SIDE PLATE).dwg</li><li>XTM4 - #MASTER/XTM4 - #Mechanical #DA #2016/XTM4-BOTTOM ISS 1 (PAN).pdf; XTM4 manual</li></ul>`);
}

SIM.register({
  id:'rd68-reducingdepthof2ruunits', name:'RD68 Reducing Depth of 2RU Units · AMS16 12-in → 8-in pan ('+Y(2013)+')', duration:1,
  product:'RD68 shallower 2RU chassis', year:2013, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD68-ReducingDepthOf2RUUnits',
  summary:'The 2013 project to take at least 4 inches out of the AMS16 and share metalwork across the 2RU units. The real bottom-pan hole patterns are drawn to scale: cut the 12-inch pan and see what has to move, then compare it with the 8-inch AMS16-8 pan the project produced and the RD68 prototype hole schedule.',
  highlights:['AMS16A2, AMS16-8 and XTM4 pans to scale from the drawings','Interactive cut: which standoffs and screws must move','Prototype hole schedule matches the issued 8-inch pan','Shared RLM24 side plate = the “standard metal work”','Project dates from the DWG files'],
  depth:'Hardware model',
  stepUnits:[{label:'1 field',period:()=>1001/60000},{label:'10 ms',period:()=>0.01},{label:'100 ms',period:()=>0.1}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms'],[0.001,'1 ms']],
  defaultZoom:0,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: taking 4 inches out', render:viewTutorial},
    {id:'second', label:'One second, heat', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Drawings', render:viewSchem},
    {id:'software', label:'Design steps', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
