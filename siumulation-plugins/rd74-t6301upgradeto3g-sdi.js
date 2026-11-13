/* =====================================================================
   RD74 — T6301 Upgrade to 3G-SDI (Ward-Beck R&D register: Peter, status "?", June 2013)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Notes.doc (18 Jun 2013), "T6301 M6203 Tests": "Max Cable length achieved on M6203 using T6301 was
   66meters. Which does not meet spec." The BNC on the T6301 is BNC-OG (manufacturer's PN 112586-10)
   and "is spec'd up to 1Ghz only". The note stops at "Part number".
   This plugin rebuilds that bench: an M6203A SDI reclocking DA on a T6301 rear, a cable reel on the input,
   and the 3G/HD/SD formats from the M6203A test procedure, calibrated to the archive's measured reaches.
   Sources (all in this archive):
   - RD74-T6301UpgradeTo3G-SDI/Notes.doc · README.md · R&D_List.xls (row 74)
   - #OPENGEAR #SERIES/M6203A - #Master #OPENGEAR/M6203A - #TESTREPORT/
       M6203A-V1001-17NOV11.pdf ("Tests were performed to see if it can be specified for 3G signals";
         rear "Ross 3G A"; input max cable 3G-A 75 m, 3G-B 75 m, HD 140 m, SD 400 m; output driver 150/150/225/450 m;
         "Rise Time Error: In 3G formats … should be less than 135ps but in M6203 it is 143ps. But the Ross card
         (SRA-8601A) does not have this problem"; frame current notes)
       M6203A-V1001-09JAN12.pdf (new issue 3 PCB "should improve the eye pattern"; input 75/75/150/400 m,
         output 125/150/210/465 m; Delco 394167 cable; eye limits per format)
       M6203A-03AC0000-17JUN13.pdf (the day before Notes.doc; custom build)
   - #OPENGEAR #SERIES/M6203 - #Master #OPENGEAR/…/atmel/v101/M6203A.c, M6203.h (SR_270 = 2, SR_1G5 = 5, SR_3G0 = 6,
       lock filter, LED and mute port bits) and README (GS2974A EQ, GS2975A reclocker, GS2978 drivers)
   - siumulation-plugins/t6301.js (T6301 ISS4 BNC positions, 4n7 series inductors, 75 Ω across seven BNCs;
       the rear-module guides name a "T6301A-3G"; the T6301A-3G folder holds only an M6205A-3G rear photo)
   - SA-DEMUX4 - #Master/…/parts/demux4_parts_plus_madi.xls (BNC1–5 = "BNC-CE3G" on the 2013 Demux4)
   Cable loss coefficients, the connector penalty curve, return-loss masks and the "spec" length are model
   values calibrated to these numbers: marked inferred.
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

/* ================= measured data ================= */
const FMT = {
  '3ga':{ name:'3G-A 1080p 59.94', rate:2.97e9/1.001, ss:6, led:'SR_3G0', meas:75, out11:150, out12:125, rise:135 },
  '3gb':{ name:'3G-B 1080p 59.94', rate:2.97e9/1.001, ss:6, led:'SR_3G0', meas:75, out11:150, out12:150, rise:135 },
  'hd': { name:'HD 1080i 59.94',   rate:1.485e9/1.001, ss:5, led:'SR_1G5', meas:145, out11:225, out12:210, rise:270, measNote:'140 m (Nov 2011), 150 m (Jan 2012)' },
  'sd': { name:'SD 525i 59.94',    rate:270e6, ss:2, led:'SR_270', meas:400, out11:450, out12:465, rise:1500 },
};
const RD74_T6301 = 66;                         // Notes.doc
/* cable loss at the Nyquist frequency, dB per 100 m (Belden-1694A-class coax; inferred) */
const lossPer100 = fMHz => 0.48*Math.sqrt(fMHz) + 0.0009*fMHz;
const nyq = f => FMT[f].rate/2/1e6;
const loss = (f, m) => lossPer100(nyq(f))*m/100;
/* EQ budget per format, calibrated so the Ross 3G rear reproduces the 2011/2012 measured reach */
const budget = f => loss(f, FMT[f].meas);
/* connector penalty: nothing below the rated frequency, rising above it; calibrated to 66 m on the T6301 */
const K3G = loss('3ga',75) - loss('3ga',RD74_T6301);
const REARS = {
  t6301:{ name:'T6301 ISS4 (BNC-OG 112586-10, 1 GHz)', rated:1000, k:K3G },
  ross:{ name:'“Ross 3G A” rear (2011–12 tests)', rated:3000, k:0 },
  t6301a:{ name:'T6301A-3G (3G-rated BNC, e.g. BNC-CE3G)', rated:3000, k:0 },
};
const penalty = (rear, f) => { const r=REARS[rear], fm=nyq(f); return fm<=r.rated ? 0 : r.k*Math.pow((fm-r.rated)/(1485/1.001-1000),2); };
const reach = (rear, f) => { const b=budget(f)-penalty(rear,f); return b/lossPer100(nyq(f))*100; };

/* ================= state ================= */
const D = { rear:'t6301', fmt:'3ga', len:66, spec:100, bnc:0, lock60:0 };
function reset(){ Object.assign(D,{ rear:'t6301', fmt:'3ga', len:66, spec:100, bnc:0 }); LOG.items=[]; SIM.refresh(); }
function state(){ const L=loss(D.fmt,D.len), P=penalty(D.rear,D.fmt), B=budget(D.fmt); const margin=B-(L+P); return { L, P, B, margin, lock: margin>=-0.05, reach: reach(D.rear,D.fmt), eye: clamp(0.25+margin/4,0,0.95) }; }
const A = {
  rear(v){ act('Rear module → '+REARS[v].name, tr=>{ D.rear=v; const s=state(); tr(`Connector penalty at ${nyq(D.fmt).toFixed(0)} MHz: ${s.P.toFixed(2)} dB ${inf}`); tr(`Modelled max input cable: ${s.reach.toFixed(0)} m (${FMT[D.fmt].name})`); if (v==='t6301') tr('Notes.doc: “I have discovered that the 75ohm BNC used on the T6301 is spec’d up to 1Ghz only.”'); }); },
  fmt(v){ act('Test signal → '+FMT[v].name, tr=>{ D.fmt=v; const f=FMT[v]; tr(`${(f.rate/1e9).toFixed(3)} Gb/s, Nyquist ${nyq(v).toFixed(0)} MHz, cable loss ${lossPer100(nyq(v)).toFixed(1)} dB/100 m ${inf}`); tr(`Measured input reach on a Ross 3G rear: ${f.measNote||f.meas+' m'} (M6203A test reports)`); }); },
  len(v){ act(`Cable reel → ${v} m`, tr=>{ D.len=+v; const s=state(); tr(`Loss ${s.L.toFixed(1)} dB + connector ${s.P.toFixed(1)} dB vs EQ budget ${s.B.toFixed(1)} dB → margin ${s.margin.toFixed(1)} dB`);
    tr(`GS2975A lock → PA4 ${s.lock?'high':'low'}; PROCESS_SDI_LOCK_STATUS_UPDATE counts ${s.lock?'≥ 95 of 101':'< 95'} → lock60 = ${s.lock?'0x10':'0x00'}`);
    tr(s.lock?`ss = ${FMT[D.fmt].ss} → ${FMT[D.fmt].led}_LED_ON; DDO_MUTE_DISABLED; SDI_OUTPUTS_ENABLED`:'NO_LOCK_LED_ON; DDO_MUTE_ENABLED; SDI_OUTPUTS_DISABLED'); }); },
  spec(v){ act(`Assumed 3G spec length → ${v} m`, tr=>{ D.spec=+v; tr('The spec length is not written in Notes.doc; the 3G test steps stop at 100 m '+inf); }); },
  bnc(k){ act('BNC'+(+k+1)+' selected', tr=>{ D.bnc=+k; tr(`T6301 ISS4 BNC${+k+1}: ${['IN1','n/c','OUT1','OUT5','OUT2','OUT6','OUT3','OUT7','OUT4','OUT8'][+k]} on the M6203A; series L ${BNCS[+k][2]}${BNCS[+k][3]?' with 75 Ω across':''} (t6301.js)`); }); },
};

/* ================= panels ================= */
const BNCS = [[0.238,0.505,'L2 4n7',1],[0.863,0.505,'L1 4n7',1],[0.238,1.13,'L4 4n7',0],[0.863,1.13,'L3 4n7',1],[0.238,1.755,'L6 4n7',0],[0.863,1.755,'L5 4n7',1],[0.238,2.38,'L8 4n7',1],[0.863,2.38,'L7 4n7',0],[0.238,3.005,'L10 4n7',1],[0.863,3.005,'L9 4n7',1]];
const ROLE = ['IN1','n/c','OUT1','OUT5','OUT2','OUT6','OUT3','OUT7','OUT4','OUT8'];
function rearSVG(){
  const s0=state(), U=150, W=1.34*U, H=3.391*U, gold = D.rear==='t6301' ? '#c9b469' : D.rear==='ross' ? '#b8bcc0' : '#e3cf6d';
  let s=`<svg viewBox="-10 -10 ${W+20} ${H+40}" style="width:100%;max-width:220px;display:block;margin:auto" role="img" aria-label="Rear module, to scale">
   <rect x="0" y="0" width="${W}" height="${H}" rx="4" fill="${D.rear==='ross'?'#2b3a52':'#1d4a2c'}" stroke="#0d2b18"/>`;
  BNCS.forEach((p,k)=>{ const x=p[0]*U, y=p[1]*U, live = k===0 ? true : k>=2 && s0.lock; const on=D.bnc===k;
    s+=`<g data-a="bnc" data-v="${k}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="30" fill="${gold}" stroke="${on?'var(--accent)':'#7a5f12'}" stroke-width="${on?6:3}"/><circle cx="${x}" cy="${y}" r="11" fill="${live?'#2bd46b':'#222'}"/><text x="${x}" y="${y+46}" text-anchor="middle" font-size="15" fill="#e8ecef">${ROLE[k]}</text></g>`; });
  s+=`<text x="${W/2}" y="${H+26}" text-anchor="middle" font-size="12" fill="var(--ink2)">${D.rear==='ross'?'Ross rear (layout as T6301, inferred)':'T6301 ISS4, 1.34 × 3.391 in'}</text></svg>`;
  return s;
}
function cardEdge(){
  const s0=state(), f=FMT[D.fmt], led=(on,col,l)=>`<g><circle cx="0" cy="0" r="8" fill="${on?col:'#333'}"/><text x="14" y="5" font-size="12" fill="var(--ink)">${l}</text></g>`;
  const L=[[s0.lock,'#2bd46b','LOCK (PB0)'],[!s0.lock,'#ff3b2f','NO LOCK (PB4)'],[s0.lock&&f.ss===2,'#ffd23a','270 (PB1)'],[s0.lock&&f.ss===5,'#ffd23a','1G5 (PB2)'],[s0.lock&&f.ss===6,'#ffd23a','3G0 (PB3)']];
  return `<svg viewBox="0 0 520 70" style="width:100%">${L.map((l,i)=>`<g transform="translate(${14+i*104},35)">${led(...l)}</g>`).join('')}</svg>`;
}
function eyeSVG(){
  const s0=state(), W=520, H=220, o=s0.lock?s0.eye:0.02, ui=1e12/FMT[D.fmt].rate;
  let p=''; for (let k=0;k<14;k++){ const j=(prand(k*13)-0.5)*(1-o)*60, a=(0.5+0.5*o)*(H/2-20)*(prand(k*7)?1:-1)*(0.85+0.15*prand(k*3));
    p+=`<path d="M0,${H/2-a} C${W*0.25+j},${H/2-a} ${W*0.25+j},${H/2+a} ${W/2},${H/2+a} S${W*0.75-j},${H/2-a} ${W},${H/2-a}" fill="none" stroke="var(--accent)" stroke-opacity=".5"/>`; p+=`<path d="M0,${H/2+a} C${W*0.25-j},${H/2+a} ${W*0.25-j},${H/2-a} ${W/2},${H/2-a} S${W*0.75+j},${H/2+a} ${W},${H/2+a}" fill="none" stroke="var(--accent)" stroke-opacity=".5"/>`; }
  return `<svg viewBox="0 0 ${W} ${H+24}" style="width:100%;background:var(--lane);border-radius:6px" role="img" aria-label="Eye at the equaliser output">${p}
    <text x="8" y="${H+18}" font-size="12" fill="var(--ink2)">1 UI = ${ui.toFixed(1)} ps · margin ${s0.margin.toFixed(1)} dB · eye opening ≈ ${Math.round(o*100)} % (model, ${'inferred'})</text></svg>`;
}
function ctlHTML(){
  const b=(a,v,l,on)=>`<button data-a="${a}" data-v="${v}" class="${on?'on':''}">${l}</button>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span class="small muted">rear</span>${Object.keys(REARS).map(k=>b('rear',k,REARS[k].name.split(' (')[0],D.rear===k)).join('')}
   <span class="small muted">| signal</span>${Object.keys(FMT).map(k=>b('fmt',k,FMT[k].name.split(' ')[0],D.fmt===k)).join('')}
   <span class="small muted">| cable</span>${[10,25,50,66,75,100,150,200,400].map(v=>b('len',v,v+' m',D.len===v)).join('')}
   <span class="small muted">| spec</span>${[70,100].map(v=>b('spec',v,v+' m',D.spec===v)).join('')}</div>`;
}
function bindAll(root){ bindActs(root,{ rear:v=>A.rear(v), fmt:v=>A.fmt(v), len:v=>A.len(+v), spec:v=>A.spec(+v), bnc:v=>A.bnc(v) }); }
function reachTable(){
  return tbl(['Format','Ross 3G rear (measured)','T6301 (model)','T6301A-3G (model)','Spec '+D.spec+' m ('+'inferred'+')'], Object.keys(FMT).map(k=>{ const t=reach('t6301',k); return [FMT[k].name, FMT[k].measNote||FMT[k].meas+' m', `${t.toFixed(0)} m${k.startsWith('3g')?' (RD74: 66 m)':''}`, reach('t6301a',k).toFixed(0)+' m', k.startsWith('3g') ? (t>=D.spec?'✓':'<span style="color:var(--bad)">✗</span>') : '—']; }));
}

/* ================= timeline ================= */
const LOOP = { T: 20e-6 + 101*1.5e-6 + 8e-6 + 1000*6/8e6 + 120e-6 };   // as in RD57 (inferred cycle counts)
function lanes(){
  const css=SIM.css, f=FMT[D.fmt], s0=state(), UI=1/f.rate, frame = D.fmt==='sd'?1001/30000:1001/60000, lines = D.fmt==='sd'?525:1125;
  return [
    { label:`${f.name}: frames`, h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,frame,0,frame*0.03,css('--accent2'),'frames'); } },
    { label:`Lines (${lines})`, h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,frame/lines,0,frame/lines*0.1,css('--ink2'),'lines'); } },
    { label:`Serial bits (1 UI = ${(UI*1e12).toFixed(0)} ps)`, h:28, draw(c,X,t0,t1,y,h){ bitsLane(c,X,t0,t1,y,h,UI,n=>prand(n),css('--ink'),'bits'); } },
    { label:`After ${D.len} m + rear (eye ${Math.round(s0.eye*100)} %)`, h:28, draw(c,X,t0,t1,y,h){ if ((X(t0+UI)-X(t0))<2){ bandAt(c,X,t0,t1,y,h,css(s0.lock?'--accent':'--bad'),.35,s0.lock?'equalised, reclocked':'EQ out of range: no lock'); return; } const o=s0.eye; bitsLane(c,X,t0+UI*0.3,t1,y,h,UI,n=>0.5+(prand(n)-0.5)*(0.3+o*0.7)+(prand(n-1)-0.5)*(1-o)*0.25,css(s0.lock?'--accent':'--bad'),'bits'); } },
    { label:'M6203A loop: lock60 / outputs', h:24, draw(c,X,t0,t1,y,h){ const n0=Math.floor(t0/LOOP.T), n1=Math.ceil(t1/LOOP.T); if (n1-n0>300){ bandAt(c,X,t0,t1,y,h,css(s0.lock?'--accent':'--bad'),.4,s0.lock?`lock60 = 0x10 · ${f.led}_LED_ON · outputs on`:'lock60 = 0x00 · DDO_MUTE_ENABLED · outputs off'); return; } for(let k=n0;k<=n1;k++) bandAt(c,X,k*LOOP.T,k*LOOP.T+LOOP.T*0.95,y,h,css(s0.lock?'--accent':'--bad'),.45,s0.lock?'lock60=0x10':'lock60=0x00'); } },
  ];
}

/* ================= views ================= */
function viewSim(m){
  m.innerHTML = `<div class="grid2"><div>${card('Rear module (click a BNC)', `<div id="rear"></div>`)}</div>
    <div>${card('Bench: generator → cable reel → BNC1 → M6203A', `<div id="ctl"></div><div id="edge" style="margin-top:8px"></div><div id="eye" style="margin-top:6px"></div>`)}${card('What the model did', `<div id="trace" class="log"></div>`)}</div></div>
    ${card('Maximum input cable by rear module', `<div id="rt"></div>`)}${card('Timeline — bits, the cable and the firmware', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ const r=m.querySelector('#rear'); r.innerHTML=rearSVG(); bindAll(r); const c=m.querySelector('#ctl'); c.innerHTML=ctlHTML(); bindAll(c);
    m.querySelector('#edge').innerHTML=cardEdge(); m.querySelector('#eye').innerHTML=eyeSVG(); m.querySelector('#rt').innerHTML=reachTable(); m.querySelector('#trace').innerHTML=traceHTML(); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220}); };
  SIM.on('time', draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'The task', body:`<p>June 2013|46, owner Peter: can the T6301 rear module carry 3G-SDI? The bench: an M6203A reclocking DA on a T6301, a 3G generator, and a reel of cable on the input. The 2011 tests on a Ross 3G rear had reached 75 m.</p>`, check:()=>true, auto:true },
  { title:'1 · 3G on the T6301', body:`<p>Select the <b>T6301</b> rear, <b>3G-A</b>, and <b>66 m</b>. The card locks: LOCK and 3G0 light. This is the RD74 result.</p>`, check:()=>D.rear==='t6301'&&D.fmt==='3ga'&&D.len===66&&state().lock, hint:'Press T6301 ISS4, 3G-A and 66 m.' },
  { title:'2 · One more reel', body:`<p>Press <b>75 m</b>. The T6301 loses lock: NO LOCK, outputs muted by <span class="mono">PROCESS_SDI_LOCK_STATUS</span>. On the Ross rear the same card had reached 75 m.</p>`, check:()=>D.rear==='t6301'&&D.len===75&&!state().lock, hint:'Press 75 m.' },
  { title:'3 · Same cable, other rear', body:`<p>Switch to the <b>Ross 3G A</b> rear. The card locks again at 75 m: the difference is the connector.</p>`, check:()=>D.rear==='ross'&&D.len===75, hint:'Press “Ross 3G A” rear.' },
  { title:'4 · Why the BNC matters only at 3G', body:`<p>Back to the <b>T6301</b>, then select <b>HD</b> and <b>150 m</b>. HD's Nyquist frequency (742 MHz) is inside the BNC's 1 GHz rating; 3G's (1.485 GHz) is not.</p>`, check:()=>D.rear==='t6301'&&D.fmt==='hd'&&D.len===150, hint:'T6301, HD, 150 m.' },
  { title:'5 · The fix', body:`<p>Choose <b>T6301A-3G</b> with <b>3G-A</b> and <b>75 m</b>: a 3G-rated BNC (the Demux4 of the same year used “BNC-CE3G”) gives back the Ross reach.</p>`, check:()=>D.rear==='t6301a'&&D.fmt==='3ga'&&D.len===75&&state().lock, hint:'T6301A-3G, 3G-A, 75 m.' },
  { title:'6 · Against a spec', body:`<p>Set the spec to <b>100 m</b>, the longest 3G step on the test sheet. Even the Ross rear does not reach it; the limit is then the GS2974A equaliser (see Findings).</p>`, check:()=>D.spec===100, hint:'Press spec 100 m.' },
  { title:'Done', body:`<p>See ${plink('t6301','T6301')} for the module itself and the Findings tab for what followed.</p>`, check:()=>true, auto:true },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — the RD74 cable test', panelTitle:'Bench', reset,
  panel(el){ el.innerHTML = ctlHTML()+cardEdge()+eyeSVG()+reachTable(); bindAll(el); } }); }
function viewSecond(m){
  m.innerHTML = `${card('One second of the test signal', `<div id="lad"></div>`)}${card('Output side (test reports)', `<div id="out"></div>`)}`;
  const draw=()=>{ const f=FMT[D.fmt], frame=D.fmt==='sd'?1001/30000:1001/60000, lines=D.fmt==='sd'?525:1125;
    m.querySelector('#lad').innerHTML = tbl(['Event','per second','period'],[['Serial bits',Math.round(f.rate).toLocaleString(),SIM.fmtDur(1/f.rate)],['Frames',(1/frame).toFixed(3),SIM.fmtDur(frame)],['Lines',Math.round(lines/frame).toLocaleString(),SIM.fmtDur(frame/lines)],['M6203A loop passes',Math.round(1/LOOP.T),SIM.fmtDur(LOOP.T)+' '+inf],['Lock reads of PA4',Math.round(101/LOOP.T).toLocaleString(),'101 per pass']]);
    m.querySelector('#out').innerHTML = tbl(['Format','Rise-time limit','Output driver reach Nov 2011','Jan 2012 (iss 3 PCB)'], Object.keys(FMT).map(k=>[FMT[k].name, FMT[k].rise+' ps'+(k.startsWith('3g')?' — M6203 measured 143 ps':''), FMT[k].out11+' m', FMT[k].out12+' m'])) + '<p class="small muted">Nov 2011 notes: the Phabrix 3G eye option was “not accurate”, so 3G output lengths are uncertain.</p>';
  };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B={
    gen:{x:20,y:140,w:150,h:70,t:'Generator',s:['3G / HD / SD bars'],d:'Test reports: TG2000 SDI matrix or Phabrix check field.'},
    cab:{x:210,y:140,w:150,h:70,t:'Cable reel',s:['Delco 394167'],d:'The test procedures name Delco 394167 cable.'},
    rear:{x:400,y:140,w:170,h:70,t:'Rear module',s:['BNC1 IN1','BNC-OG 1 GHz'],d:'T6301 ISS4 (4n7 series L, 75 Ω across seven BNCs, t6301.js) or a 3G-rated rear.',live:()=>D.rear!=='t6301'},
    eq:{x:610,y:60,w:170,h:70,t:'GS2974A EQ',s:['adaptive equaliser'],d:'M6203A README.',live:()=>state().lock},
    rc:{x:610,y:160,w:170,h:70,t:'GS2975A reclocker',s:['lock → PA4','rate → PA1–3'],d:'SR_270 = 2, SR_1G5 = 5, SR_3G0 = 6 (M6203.h).'},
    mcu:{x:610,y:260,w:170,h:70,t:'AT90CAN128',s:['V101 lock filter','LEDs, mute'],d:'M6203A.c PROCESS_SDI_LOCK_STATUS(_UPDATE).'},
    drv:{x:820,y:160,w:150,h:70,t:'GS2978 ×n',s:['8 outputs','143 ps rise at 3G'],d:'Nov 2011 test: rise time 143 ps vs 135 ps limit.'},
  };
  blockView(m,B,[['gen','cab',''],['cab','rear',''],['rear','eq',''],['eq','rc',''],['rc','mcu','lock'],['mcu','drv','DDO_MUTE'],['rc','drv','']],{start:'rear',w:990,h:350,side:'<p>RD74 isolates one block, the BNC on the rear module, by changing it while the card stays the same.</p>'});
}
const SHEETS=[
  { name:'1 · T6301 BNC1 input network', note:'From t6301.js (ISS4 netlist): BNC1 → L2 4n7 series (with R3 75 Ω across) → card connector IN1. The BNC part is BNC-OG, PN 112586-10 (Notes.doc).', svg:()=>
    chip(180,70,160,'BNC1 BNC-OG',[['shell','GND (AC)']],[['centre','BNC1_SIG']],'112586-10, rated 1 GHz') + chip(420,210,140,'L2 ‖ R3',[['1','BNC1_SIG']],[['2','IN1']],'4n7 ‖ 75 Ω') + chip(580,350,140,'M6203A',[['IN1','from rear']],[['EQ','GS2974A']],'card edge') },
  { name:'2 · M6203A lock and rate bits', note:'M6203.h (v101).', svg:()=>
    chip(330,70,220,'AT90CAN128',[['PA4','LOCK'],['PA3..1','ss: 2 = 270, 5 = 1G5, 6 = 3G0'],['PD7','SD/HD']],[['PB0','LOCK LED'],['PB1/2/3','270 / 1G5 / 3G0 LEDs'],['PB4','NO LOCK LED'],['PA6','DDO_MUTE'],['PD4','SDI outputs enable']],'V101') },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'T6301 ISS4 netlist and M6203A V101 source', 'RD74 left no drawings; these sheets show the input path under test and the firmware bits that report the result.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('Loss budget at the Nyquist frequency', `<canvas id="lb"></canvas>`)}${card('Return-loss picture (connector vs mask)', `<canvas id="rl"></canvas>`)}</div>${card('Stage by stage', `<div id="st"></div>`)}`;
  const draw=()=>{ const s0=state();
    { const {c,w,h}=SIM.canvas(m.querySelector('#lb'),220); const bars=[['cable',s0.L,'--accent2'],['connector',s0.P,'--warn'],['budget',s0.B,'--accent']]; const mx=Math.max(s0.L+s0.P,s0.B)*1.15||1;
      bars.forEach((b,i)=>{ const x=60+i*((w-80)/3), bh=b[1]/mx*(h-50); c.fillStyle=SIM.css(b[2]); c.fillRect(x,h-30-bh,(w-80)/3-20,bh); c.fillStyle=SIM.css('--ink'); c.font='12px '+SIM.css('--sans'); c.fillText(`${b[0]} ${b[1].toFixed(1)} dB`,x,h-12); }); }
    { const {c,w,h}=SIM.canvas(m.querySelector('#rl'),220); const fx=f=>40+f/3000*(w-60), ry=r=>10+r/40*(h-40); c.strokeStyle=SIM.css('--grid'); c.strokeRect(40,10,w-60,h-40);
      c.strokeStyle=SIM.css('--bad'); c.beginPath(); c.moveTo(fx(5),ry(15)); c.lineTo(fx(1485),ry(15)); c.lineTo(fx(1485),ry(10)); c.lineTo(fx(2970),ry(10)); c.stroke();
      const r=REARS[D.rear]; c.strokeStyle=SIM.css('--accent'); c.beginPath(); for(let f=5;f<=3000;f+=25){ const v= f<=r.rated ? 28-4*f/r.rated : 24-(f-r.rated)/150; const yy=ry(Math.max(2,v)); f===5?c.moveTo(fx(f),yy):c.lineTo(fx(f),yy);} c.stroke();
      c.fillStyle=SIM.css('--ink2'); c.font='11px '+SIM.css('--sans'); c.fillText('0 dB',4,14); c.fillText('40 dB',4,h-30); c.fillText('3 GHz',w-50,h-14); c.fillText('red: SMPTE 424M-style mask; green: connector (shape inferred)',44,h-14); }
    m.querySelector('#st').innerHTML = tbl(['Stage','Value'],[['Signal',FMT[D.fmt].name],['Nyquist',nyq(D.fmt).toFixed(0)+' MHz'],['Cable '+D.len+' m',s0.L.toFixed(2)+' dB '+inf],['Rear module',REARS[D.rear].name+': '+s0.P.toFixed(2)+' dB'],['EQ budget (calibrated)',s0.B.toFixed(2)+' dB'],['Result',s0.lock?'lock, outputs on':'no lock, outputs muted']]);
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  m.innerHTML = card('What RD74 found, and what became of it', `<ol>
    <li><b>The finding: 66 m, and the connector.</b> Notes.doc (18 Jun 2013): 66 m maximum on an M6203 with the T6301, “which does not meet spec”; the T6301's BNC-OG (112586-10) is rated to 1 GHz. 3G-SDI's Nyquist frequency is 1.485 GHz. The note ends mid-sentence at “Part number”: the replacement part was never written down.</li>
    <li><b>The card was already known to be 3G-capable.</b> The 17 Nov 2011 M6203A test was run “to see if it can be specified for 3G signals” on a “Ross 3G A” rear: 75 m on 3G-A and 3G-B, 140 m HD, 400 m SD. RD74 changed only the rear and lost 9 m.</li>
    <li><b>A second 3G problem sits on the output.</b> Same report: 3G rise time 143 ps against a 135 ps limit, “But the Ross card (SRA-8601A) does not have this problem.” The Jan 2012 issue-3 PCB was meant to “improve the eye pattern”.</li>
    <li><b>Spec length is never stated.</b> The test sheets step 3G cable to 100 m; neither the note nor the reports say which length is “spec”. Even the Ross-rear result (75 m) is below 100 m (${inf}).</li>
    <li><b>What followed.</b> The rear-module guides name a “T6301A-3G” (t6301.js), but its folder holds only a photo labelled “M6205A-3G Rear Module (T6302A-3G)”; both M6203A-3G manual folders are empty; the register keeps RD74 at “?”. The Demux4 designed in 2013 used parts named “BNC-CE3G” for all five BNCs.</li>
    <li><b>Same week, same bench.</b> M6203A-03AC0000-17JUN13 (custom build) was tested the day before Notes.doc. The RD74 cable test was probably run alongside it (${inf}).</li>
    <li><b>The T6301's compensation cannot fix this.</b> ISS4's 4n7 series inductors with 75 Ω across seven BNCs tune pad capacitance (t6301.js); they do not raise the connector's own rating (${inf}).</li>
  </ol>`) + card('Assumptions', `<ul class="small"><li>Cable loss per 100 m (0.48√f + 0.0009 f, f in MHz), the per-format EQ budgets (fitted to the measured reach), and the connector penalty (fitted to 66 m) are model values (${inf}).</li><li>Return-loss curve shape and the SMPTE-style mask are illustrative (${inf}).</li><li>Main-loop timing uses estimated cycle counts at 8 MHz (${inf}).</li></ul>`) +
  card('Sources', `<ul class="small mono"><li>XXX - ENGINEERING - 2016 RD FILES/RD74-T6301UpgradeTo3G-SDI/Notes.doc · R&amp;D_List.xls</li><li>#OPENGEAR #SERIES/M6203A - #Master #OPENGEAR/M6203A - #TESTREPORT/M6203A-V1001-17NOV11.pdf, -09JAN12.pdf, -03AC0000-17JUN13.pdf</li><li>#OPENGEAR #SERIES/M6203 - #Master #OPENGEAR/…/atmel/v101/M6203A.c, M6203.h; README.md</li><li>siumulation-plugins/t6301.js · SA-DEMUX4 - #Master/…/parts/demux4_parts_plus_madi.xls</li></ul>`);
}

SIM.register({
  id:'rd74-t6301upgradeto3g-sdi', name:'RD74 T6301 Upgrade to 3G-SDI · rear-module cable-reach test ('+Y(2013)+')', duration:1,
  product:'RD74 T6301 → 3G', year:2013, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD74-T6301UpgradeTo3G-SDI',
  summary:'June 2013: an M6203A on a T6301 rear reached only 66 m of 3G-SDI cable, because the T6301’s BNC is rated to 1 GHz. The model rebuilds that bench, calibrated to the M6203A test reports (75 m on a Ross 3G rear), so you can swap rear modules, formats and cable and watch the card lock or mute.',
  highlights:['T6301 rear to scale, BNCs clickable','Cable reach calibrated to the 2011–2013 test reports','M6203A lock filter, rate LEDs and mute from the V101 source','3G vs HD: why only 3G suffers','Rise-time and output-reach data alongside'],
  depth:'Hardware model',
  stepUnits:[{label:'1 UI',period:()=>1/FMT[D.fmt].rate},{label:'1 line',period:()=>(D.fmt==='sd'?1001/30000/525:1001/60000/1125)},{label:'1 loop pass',period:()=>LOOP.T},{label:'1 frame',period:()=>1001/60000}],
  zooms:[[1,'1 s'],[0.02,'20 ms'],[0.002,'2 ms'],[3e-5,'30 µs (2 lines)'],[5e-9,'5 ns (bits)']],
  defaultZoom:2,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: the cable test', render:viewTutorial},
    {id:'second', label:'One second, in and out', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Signal path', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
