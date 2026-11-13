/* =====================================================================
   RD58 — 8-channel A/D + D/A with 16-channel metering, POD form factor
   (Ward-Beck R&D register: Kevin / engineering, status "?", 17 Dec 2012)
   Plugin for the WBS Device Simulator (../siumulation.html)

   ProjectDescription.txt (740 bytes) is the whole study: a POD-style box, ideally ½ RU wide, with 8 ch
   digital→analog and 8 ch analog→digital at the same time, 16 meters (8 + 8), maybe an external supply,
   a higher-density connector or a full 1 RU if the rear runs out of room, built on the AMS8E-1 main board
   and the AMS8 meter board. This plugin models that idea with the parts the archive has.
   Sources (all in this archive):
   - RD58-AtoD-DtoA-8chanwithMetering/ProjectDescription.txt · R&D_List.xls (row 58)
   - #POD #SERIES/README.md (POD case 8.69" W × 1.73" H × 7.0" D; POD13A dual D/A, POD14A dual A/D)
   - siumulation-plugins/pod13a.js (CAL: −20 dBFS = +4 dBu, −18 dBFS option) · pod14a.js / POD14A README (AK5394A ADCs)
   - siumulation-plugins/ams8e.js: AMS8E-1 ISS5 parts (H9–H12 AES1–16 in/out headers, U101/104/107/110 CS4334 DACs
       → NE5532 analog outputs), AMS8E-4 meter board (8 bars × 22 LEDs, 3.66″ × 1.50″), ams81_vu_data.dat segment labels,
       vumeter.asm TCONST_VU 0.000319752
   - siumulation-plugins/32me.js: SHARC v050000 LED multiplex (TPERIOD1 12000 at 49.152 MHz = 244 µs per step, 16 steps)
   - xxx-OBSOLETE …/AVB VID BUDDY/AVBManual.doc ("0VU = +4 dBu", "0VU = −20 dBFS": the house alignment)
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

/* ================= constants from the sources ================= */
const FS = 48000;
const POD = { w:8.69, h:1.73, d:7.0 };                   // #POD #SERIES/README.md
const RACK = { w:17.0 };                                 // usable 1 RU rear width between ears (inferred)
const MB = { w:3.66, h:1.50, bars:8, leds:22 };          // AMS8E-4 (ams8e.js)
const SEG_LBL = ['-36','-26','-20','-16','-12','-10','-8','-6','-4','-3','-2','-1','0','+1','+2','+3','+4','+6','+8','+10','+12','+14'];
const SEG_DB = SEG_LBL.map(Number);
const kVU = 0.000319752;                                 // vumeter.asm TCONST_VU (per sample)
const TAU_VU = 1/(kVU*FS);                               // ≈ 65 ms
const MUX = 12000/49.152e6;                              // 32ME SHARC v050000 TPERIOD1 → 244 µs per LED step
/* rear-panel footprints in inches along the panel (inferred from common connector sizes, see Findings) */
const CONN = {
  xlr:{ name:'XLR-3 (one per channel)', per:1, w:1.06, rows:1 },
  phx:{ name:'Phoenix 3-pin (POD style)', per:1, w:0.62, rows:1 },
  db25:{ name:'DB25 (8 channels)', per:8, w:2.09, rows:1 },
  bnc:{ name:'BNC 75 Ω (one per AES pair)', per:2, w:0.625, rows:2 },
  xlr110:{ name:'XLR 110 Ω (one per AES pair)', per:2, w:1.06, rows:1 },
  db25aes:{ name:'DB25 AES (8 pairs)', per:16, w:2.09, rows:1 },
};
const PSU = { ext:{ name:'external supply (DC jack)', w:0.55 }, int:{ name:'internal (IEC inlet + switch)', w:1.9 } };

/* ================= state ================= */
const D = { width:'half', ana:'xlr', dig:'bnc', psu:'int', ref:-20, ain:[4,4,0,-6,-10,4,8,-20], din:[-20,-20,-24,-30,-18,-12,-40,-20], sel:0, tone:false };
function reset(){ Object.assign(D,{ width:'half', ana:'xlr', dig:'bnc', psu:'int', ref:-20, ain:[4,4,0,-6,-10,4,8,-20], din:[-20,-20,-24,-30,-18,-12,-40,-20], sel:0, tone:false }); LOG.items=[]; SIM.refresh(); }
const fs0 = ()=> 4 - D.ref;                              // dBu at 0 dBFS (+24 for −20 alignment)
/* channel list: 0–7 = A/D (analog in → AES out), 8–15 = D/A (AES in → analog out) */
function chan(k){
  if (k<8){ const dbu=D.ain[k], dbfs=Math.min(0, dbu - fs0()); return { k, kind:'A/D', label:'IN '+(k+1), dbu, dbfs, clip: dbu - fs0() > 0, out:`AES ${Math.floor(k/2)+1} ${k%2?'R':'L'}` }; }
  const j=k-8, dbfs=D.din[j], dbu=dbfs+fs0(); return { k, kind:'D/A', label:'AES '+(Math.floor(j/2)+1)+(j%2?'R':'L'), dbu, dbfs, clip:false, out:`OUT ${j+1}` };
}
/* VU level (dB rel. 0 VU) at time t: tone bursts switch on at 0.10 s and off at 0.60 s; one-pole with the vumeter.asm constant */
function vuAt(k, t){ const c=chan(k); const ref=c.dbfs - D.ref; if (!D.tone) return ref;
  const on=0.10, off=0.60; const lin=Math.pow(10, ref/20);
  let v; if (t<on) v=0; else if (t<off) v=lin*(1-Math.exp(-(t-on)/TAU_VU)); else v=lin*(1-Math.exp(-(off-on)/TAU_VU))*Math.exp(-(t-off)/TAU_VU);
  return v>1e-6 ? 20*Math.log10(v) : -99; }
const litSegs = db => SEG_DB.filter(s=> db >= s - 0.01).length;

/* rear-panel budget */
function rear(){
  const items=[]; const add=(grp,c,n)=>{ const count=Math.ceil(n/c.per); const cols=Math.ceil(count/c.rows); items.push({grp, name:c.name, count, w:cols*c.w}); };
  add('Analog in (8)', CONN[D.ana], 8); add('Analog out (8)', CONN[D.ana], 8);
  const dg = CONN[D.dig]; add('AES in (4 pairs)', dg, 8); add('AES out (4 pairs)', dg, 8);
  if (dg===CONN.db25aes){ items.splice(-2,2); items.push({grp:'AES in + out', name:dg.name, count:1, w:dg.w}); }
  if (D.ana==='db25'){ /* one DB25 carries 8 channels: in and out each need one */ }
  items.push({grp:'Power', name:PSU[D.psu].name, count:1, w:PSU[D.psu].w}); items.push({grp:'REF in', name:'BNC', count:1, w:0.625});
  const need=items.reduce((a,b)=>a+b.w,0)+0.6, have=(D.width==='half'?POD.w:RACK.w);
  return { items, need, have, fits: need<=have };
}
const A = {
  width(v){ act('Case width → '+(v==='half'?'½ RU POD':'full 1 RU'), tr=>{ D.width=v; const r=rear(); tr(`Rear width available ${r.have} in; connectors need ${r.need.toFixed(2)} in → ${r.fits?'<b>fits</b>':'<b style="color:var(--bad)">does not fit</b>'}`); tr(v==='half'?'POD case 8.69 × 1.73 × 7.0 in (#POD #SERIES README)':'Kevin: “maybe … goto a full 1rU wide unit”'); }); },
  ana(v){ act('Analog connectors → '+CONN[v].name, tr=>{ D.ana=v; const r=rear(); tr(`need ${r.need.toFixed(2)} in of ${r.have}`); if (v==='db25') tr('Kevin: “maybe we use a higher density connector”'); }); },
  dig(v){ act('AES connectors → '+CONN[v].name, tr=>{ D.dig=v; const r=rear(); tr(`need ${r.need.toFixed(2)} in of ${r.have}`); }); },
  psu(v){ act('Power → '+PSU[v].name, tr=>{ D.psu=v; tr(v==='ext'?'Anthony’s suggestion in the meeting: an external power supply':'Mains inside the case, as on the POD13A/POD14A'); const r=rear(); tr(`need ${r.need.toFixed(2)} in of ${r.have}`); }); },
  ref(v){ act(`Alignment → ${v} dBFS = +4 dBu`, tr=>{ D.ref=+v; tr(`0 dBFS = +${fs0()} dBu (POD13A CAL switch convention, pod13a.js)`); }); },
  sel(k){ act('Meter '+(k+1)+' selected', tr=>{ D.sel=k; const c=chan(k); tr(`${c.kind} ${c.label}: ${fmt(c.dbu,1)} dBu ↔ ${fmt(c.dbfs,1)} dBFS → ${c.out}${c.clip?' — <b style="color:var(--bad)">ADC clips</b>':''}`); tr(`Meter bar ${k<8?k+1:k-7} on AMS8E-4 board ${k<8?'A':'B'} (U${2+Math.floor((k%8)/2)} driver, ${MB.leds} LEDs)`); }); },
  lvl(k, v){ act(`${chan(k).label} → ${v} ${k<8?'dBu':'dBFS'}`, tr=>{ if (k<8) D.ain[k]=+v; else D.din[k-8]=Math.min(0,+v); const c=chan(k); tr(`${fmt(c.dbu,1)} dBu ↔ ${fmt(c.dbfs,1)} dBFS; VU ${fmt(c.dbfs-D.ref,1)} dB → ${litSegs(c.dbfs-D.ref)} of 22 LEDs (ams81_vu_data.dat labels)`); if (c.clip) tr('<b style="color:var(--bad)">over 0 dBFS: the ADC clips</b>'); }); },
  tone(){ act('Test burst '+(D.tone?'off (steady levels)':'on (0.10–0.60 s)'), tr=>{ D.tone=!D.tone; tr(`VU ballistics: one pole, TCONST_VU = ${kVU} per sample → τ ≈ ${(TAU_VU*1000).toFixed(0)} ms (vumeter.asm)`); }); },
};

/* ================= panels ================= */
function frontSVG(){
  const U=100, W=(D.width==='half'?POD.w:19)*U, H=POD.h*U, t=SIM.t;
  const bw=MB.w*U, x0=(D.width==='half'?0.62*U:5.5*U), y0=(H-MB.h*U)/2;
  let s=`<svg viewBox="0 0 ${W} ${H+28}" style="width:100%;display:block" role="img" aria-label="Front panel with two AMS8E-4 meter boards">
    <rect x="0" y="0" width="${W}" height="${H}" rx="5" fill="#26292c" stroke="#111"/>`;
  for (let b=0;b<2;b++){ const bx=x0+b*bw;
    s+=`<rect x="${bx}" y="${y0}" width="${bw}" height="${MB.h*U}" fill="#0c0d0e" stroke="#333"/><text x="${bx+6}" y="${y0+12}" font-size="10" fill="#9aa">${b?'D/A · AES IN → OUT':'A/D · IN → AES OUT'}</text>`;
    for (let i=0;i<8;i++){ const k=b*8+i, cx=bx+(i+0.5)*bw/8, lit=litSegs(vuAt(k,t)), on=D.sel===k;
      s+=`<g data-a="sel" data-v="${k}" style="cursor:pointer">`;
      for (let j=0;j<22;j++){ const yy=y0+MB.h*U-14-j*5.4; const col=j<12?'#36d05a':j<17?'#ffd23a':'#ff3b2f'; s+=`<rect x="${cx-7}" y="${yy}" width="14" height="3.6" fill="${j<lit?col:'#262a26'}"/>`; }
      s+=`<text x="${cx}" y="${y0+MB.h*U-2}" text-anchor="middle" font-size="9" fill="${on?'#fff':'#aaa'}">${k<8?k+1:k-7}</text>${on?`<rect x="${cx-11}" y="${y0+16}" width="22" height="${MB.h*U-18}" fill="none" stroke="var(--accent)" stroke-width="2"/>`:''}<title>${chan(k).label}</title></g>`; } }
  const px = D.width==='half'? x0+2*bw+0.12*U : x0+2*bw+1*U;
  s+=`<circle cx="${px+10}" cy="${H/2-12}" r="6" fill="#2bd46b"/><text x="${px}" y="${H/2+14}" font-size="10" fill="#bbb">PWR</text>`;
  s+=`<text x="4" y="${H+20}" font-size="12" fill="var(--ink2)">${D.width==='half'?'½ RU POD front 8.69 × 1.73 in':'19 in × 1 RU front'}, to scale. Two AMS8E-4 boards (3.66 × 1.50 in each) = ${(2*MB.w).toFixed(2)} in of meters. Click a bar.</text></svg>`;
  return s;
}
function rearSVG(){
  const r=rear(), U=100, have=r.have, W=Math.max(have, r.need)*U, H=POD.h*U;
  let s=`<svg viewBox="0 0 ${W+10} ${H+30}" style="width:100%;display:block" role="img" aria-label="Rear connector budget, to scale">
    <rect x="0" y="0" width="${have*U}" height="${H}" rx="5" fill="var(--dev)" stroke="${r.fits?'var(--line)':'var(--bad)'}" stroke-width="3"/>`;
  if (!r.fits) s+=`<rect x="${have*U}" y="0" width="${(r.need-have)*U}" height="${H}" fill="color-mix(in srgb,var(--bad) 25%,transparent)" stroke="var(--bad)" stroke-dasharray="8 6"/>`;
  let x=0.3*U; const col={ 'Analog in (8)':'#5b8bd6','Analog out (8)':'#7aa7e8','AES in (4 pairs)':'#c9b469','AES out (4 pairs)':'#e0cc7a','AES in + out':'#c9b469','Power':'#999','REF in':'#c9b469' };
  r.items.forEach(it=>{ const w=it.w*U; s+=`<rect x="${x}" y="14" width="${w-6}" height="${H-28}" rx="6" fill="${col[it.grp]||'#888'}" opacity=".85"/><text x="${x+6}" y="34" font-size="13" fill="#111">${it.grp}</text><text x="${x+6}" y="52" font-size="11" fill="#111">${it.count} × ${it.name.split(' (')[0]}</text><text x="${x+6}" y="${H-22}" font-size="11" fill="#111">${it.w.toFixed(2)} in</text>`; x+=w; });
  s+=`<text x="4" y="${H+22}" font-size="13" fill="var(--ink2)">Rear: ${r.need.toFixed(2)} in needed of ${have} in available — ${r.fits?'fits':'does NOT fit'} (connector widths ${'inferred'}).</text></svg>`;
  return s;
}
function ctlHTML(){
  const b=(a,v,l,on)=>`<button data-a="${a}" data-v="${v}" class="${on?'on':''}">${l}</button>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
   <span class="small muted">case</span>${b('width','half','½ RU POD',D.width==='half')}${b('width','full','full 1 RU',D.width==='full')}
   <span class="small muted">| analog</span>${b('ana','xlr','XLR',D.ana==='xlr')}${b('ana','phx','Phoenix',D.ana==='phx')}${b('ana','db25','DB25',D.ana==='db25')}
   <span class="small muted">| AES</span>${b('dig','bnc','BNC',D.dig==='bnc')}${b('dig','xlr110','XLR',D.dig==='xlr110')}${b('dig','db25aes','DB25',D.dig==='db25aes')}
   <span class="small muted">| power</span>${b('psu','int','internal',D.psu==='int')}${b('psu','ext','external',D.psu==='ext')}
   <span class="small muted">| align</span>${b('ref','-20','−20 dBFS',D.ref===-20)}${b('ref','-18','−18 dBFS',D.ref===-18)}
   ${b('tone','','test burst '+(D.tone?'on':'off'),D.tone)}</div>`;
}
function levelHTML(){
  const c=chan(D.sel);
  return `<div class="small" style="margin-top:6px">Selected: <b>${c.kind} ${c.label}</b> → ${c.out}. Set level:
    ${(D.sel<8?[-20,-10,0,4,10,20,26]:[-40,-30,-20,-18,-10,-1,0]).map(v=>`<button data-a="lvl" data-v="${v}" class="${(D.sel<8?D.ain[D.sel]:D.din[D.sel-8])===v?'on':''}">${v>0?'+':''}${v} ${D.sel<8?'dBu':'dBFS'}</button>`).join('')}</div>`;
}
function bindAll(root){ bindActs(root,{ width:v=>A.width(v), ana:v=>A.ana(v), dig:v=>A.dig(v), psu:v=>A.psu(v), ref:v=>A.ref(v), sel:v=>A.sel(+v), lvl:v=>A.lvl(D.sel,+v), tone:()=>A.tone() }); }

/* ================= timeline ================= */
function lanes(){
  const css=SIM.css, k=D.sel, c=chan(k), f=1000;
  return [
    { label:'48 kHz sample clock', h:22, draw(cx,X,t0,t1,y,h){ SIM.pulses(cx,X,t0,t1,y,h,1/FS,0,1/(2*FS),css('--accent'),'samples'); } },
    { label:`${c.label} signal (1 kHz burst)`, h:34, draw(cx,X,t0,t1,y,h){ const a=Math.pow(10,(c.dbfs)/20);
      if ((X(t0+1/f)-X(t0))<3){ bandAt(cx,X,Math.max(t0,0.10),Math.min(t1,0.60),y,h,css('--accent2'),.5,`1 kHz at ${fmt(c.dbfs,1)} dBFS`); return; }
      waveLane(cx,X,t0,t1,y,h,t=> (!D.tone||(t>=0.1&&t<0.6))? Math.max(-1,Math.min(1,a*Math.sin(2*Math.PI*f*t)))/Math.max(a,0.05)*Math.min(1,a*4+0.2) : 0, c.clip?css('--bad'):css('--accent2'), 800); } },
    { label:`${k<8?'ADC (AK5394A-class)':'DAC (CS4334)'} → ${c.out}`, h:24, draw(cx,X,t0,t1,y,h){ SIM.pulses(cx,X,t0,t1,y,h,1/FS,0,1/FS*0.5,css('--warn'),k<8?'AES frames out':'DAC samples'); } },
    { label:'VU level (vumeter.asm, τ ≈ 65 ms)', h:40, draw(cx,X,t0,t1,y,h){ cx.strokeStyle=css('--accent'); cx.beginPath(); for(let i=0;i<=400;i++){ const t=t0+(t1-t0)*i/400; const v=clamp(vuAt(k,t),-36,14); const yy=y+h-3-(v+36)/50*(h-6); i?cx.lineTo(X(t),yy):cx.moveTo(X(t),yy);} cx.stroke(); laneText(cx,X,t0,y,10,'−36 … +14 dB VU',css('--ink2')); } },
    { label:'Meter update (1 ms)', h:20, draw(cx,X,t0,t1,y,h){ SIM.pulses(cx,X,t0,t1,y,h,0.001,0,0.0002,css('--ink2'),'meter samples'); } },
    { label:'LED mux step (244 µs, 32ME SHARC)', h:22, draw(cx,X,t0,t1,y,h){ SIM.pulses(cx,X,t0,t1,y,h,MUX,0,MUX*0.8,css('--accent2'),'mux steps'); } },
  ];
}

/* ================= views ================= */
function viewSim(m){
  m.innerHTML = `${card('Front — 16 meters on two AMS8E-4 boards', `<div id="fr"></div><div id="ctl" style="margin-top:6px"></div><div id="lv"></div>`)}
    ${card('Rear — does the I/O fit?', `<div id="rr"></div><div id="rt"></div>`)}
    <div class="grid2">${card('Channel table', `<div id="ct"></div>`)}${card('What the model did', `<div id="trace" class="log"></div>`)}</div>
    ${card('Timeline — the selected channel', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ const fr=m.querySelector('#fr'); fr.innerHTML=frontSVG(); bindAll(fr); const ct=m.querySelector('#ctl'); ct.innerHTML=ctlHTML(); bindAll(ct); const lv=m.querySelector('#lv'); lv.innerHTML=levelHTML(); bindAll(lv);
    m.querySelector('#rr').innerHTML=rearSVG(); const r=rear(); m.querySelector('#rt').innerHTML=tbl(['Group','Connector','Count','Width'], r.items.map(i=>[i.grp,i.name,i.count,i.w.toFixed(2)+' in']));
    m.querySelector('#ct').innerHTML=tbl(['#','Path','dBu','dBFS','VU now'], Array.from({length:16},(_,k)=>{ const c=chan(k); return [k+1, `${c.kind} ${c.label} → ${c.out}`, fmt(c.dbu,1), `<span style="${c.clip?'color:var(--bad);font-weight:700':''}">${fmt(c.dbfs,1)}</span>`, fmt(Math.max(-99,vuAt(k,SIM.t)),1)]; }));
    m.querySelector('#trace').innerHTML=traceHTML(); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220}); };
  SIM.on('time', draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'The idea', body:`<p>17 Dec 2012|45, a meeting between Kevin and Anthony: one POD-sized box with <b>8 channels of D/A and 8 of A/D</b> running at once, and <b>16 meters</b>. Open questions in the note: can the I/O fit on a ½ RU rear, should the supply be external, and can it all run on the AMS8E-1 main board with the AMS8 meter board?</p><p>Work through it the way the engineer would have.</p>`, check:()=>true, auto:true },
  { title:'1 · Will the meters fit?', body:`<p>Look at the front. Two AMS8E-4 meter boards side by side take ${(2*MB.w).toFixed(2)} in of the 8.69 in POD front, leaving under an inch for power and status LEDs. The 1.50 in board height fits inside the 1.73 in case. Select meter <b>9</b> (the first D/A bar).</p>`, check:()=>D.sel===8, hint:'Click the first bar on the right-hand board.' },
  { title:'2 · The rear with XLRs', body:`<p>Choose <b>½ RU POD</b>, <b>XLR</b> analog and <b>BNC</b> AES. Sixteen XLRs alone need about 17 in, so the rear overflows.</p>`, check:()=>D.width==='half'&&D.ana==='xlr'&&!rear().fits, hint:'Press ½ RU POD and XLR.' },
  { title:'3 · Higher-density connectors', body:`<p>Kevin's first fallback: “a higher density connector”. Switch analog to <b>DB25</b> (8 channels per connector).</p>`, check:()=>D.ana==='db25', hint:'Press DB25 under analog.' },
  { title:'4 · External supply', body:`<p>Anthony's suggestion: move the supply outside. Choose <b>external</b> power and see the rear fit in ½ RU.</p>`, check:()=>D.psu==='ext'&&D.width==='half'&&rear().fits, hint:'Press external; keep ½ RU.' },
  { title:'5 · Line up a channel', body:`<p>Select meter <b>1</b> and set <b>+4 dBu</b>. With the house alignment (−20 dBFS = +4 dBu, as in the POD13A and the VidBuddy manual) the AES output is −20 dBFS and the bar sits at 0 VU.</p>`, check:()=>D.sel===0&&D.ain[0]===4, hint:'Click bar 1, then +4 dBu.' },
  { title:'6 · Overload', body:`<p>Set channel 1 to <b>+26 dBu</b>. 0 dBFS is +24 dBu, so the ADC clips: the table turns red and the timeline waveform is flattened.</p>`, check:()=>D.ain[0]===26, hint:'Press +26 dBu.' },
  { title:'7 · EBU alignment', body:`<p>Change the alignment to <b>−18 dBFS</b>. 0 dBFS becomes +22 dBu, giving 2 dB less headroom. This is the POD13A's second CAL setting.</p>`, check:()=>D.ref===-18, hint:'Press −18 dBFS.' },
  { title:'8 · Watch the ballistics', body:`<p>Turn the <b>test burst on</b> and move the playhead from 0.1 s to 0.6 s. The VU lane rises with the vumeter.asm time constant (about 65 ms) and falls the same way after 0.6 s.</p>`, check:()=>D.tone&&SIM.t>0.15, hint:'Press test burst, then drag the playhead past 0.15 s.' },
  { title:'Done', body:`<p>RD58 stopped at the idea. The same functions were sold as separate PODs (POD13A dual D/A, POD14A dual A/D), and the AMS8E-1 board went on to carry the AMS81/82, MLC8 and 32ME. See ${plink('pod13a','POD13A')}, ${plink('pod14a','POD14A')} and ${plink('ams8e','AMS8E')}.</p>`, check:()=>true, auto:true },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — sizing the 8+8 POD', panelTitle:'Front, rear and controls', reset,
  panel(el){ el.innerHTML = frontSVG()+ctlHTML()+levelHTML()+`<div style="margin-top:8px">${rearSVG()}</div>`; bindAll(el); } }); }
function viewSecond(m){
  m.innerHTML = `${card('One second inside the box', `<div id="lad"></div>`)}${card('At the playhead', `<div id="dev"></div>`)}`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#lad').innerHTML = tbl(['Event','per second','period','source'],[
      ['Audio samples per channel','48,000','20.83 µs','AES3 at 48 kHz'],['Samples converted (16 ch)','768,000','—','8 ADC + 8 DAC channels'],
      ['AES3 frames out (4 pairs)','192,000','—','4 × 48,000'],['AES3 biphase cells per pair','6,144,000','163 ns','128 per frame'],
      ['Meter samples','1,000','1 ms','vumeter.asm rate'],['LED mux steps','4,096','244 µs','32ME TPERIOD1 12000 / 49.152 MHz'],['Full LED refreshes','256','3.9 ms','16 steps'],
    ].map(r=>[r[0],`<span class="mono">${r[1]}</span>`,`<span class="mono">${r[2]}</span>`,`<span class="small">${r[3]}</span>`]));
    m.querySelector('#dev').innerHTML = kv([['Samples so far',Math.floor(t*FS).toLocaleString(),1],['LED step',(Math.floor(t/MUX)%16)+' of 16',1],['Meter 1 VU',fmt(Math.max(-99,vuAt(0,t)),1)+' dB',1],['Lit LEDs, all 16 bars',Array.from({length:16},(_,k)=>litSegs(vuAt(k,t))).reduce((a,b)=>a+b,0)+' of 352',1]]);
  };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B={
    ain:{x:20,y:30,w:170,h:70,t:'8 analog inputs',s:['balanced, +4 dBu nominal'],d:'XLR, Phoenix or DB25 (planner). Not on the AMS8E-1: needs an input/ADC board like the POD14A front end (NE5532 + AK5394A).'},
    adc:{x:250,y:30,w:180,h:70,t:'4 × stereo ADC',s:['AK5394A class '+'(POD14A)'],d:'POD14A uses AK5394A converters. The AMS8E-1 has no ADC, so this is an add-on board (inferred).'},
    fpga:{x:480,y:120,w:200,h:90,t:'AMS8E-1 main board',s:['Cyclone IV FPGA','AES1–16 in/out (H9–H12)','SHARC meters'],d:'From ams8e.js: U4 Cyclone IV routes the AES receivers; H9–H12 carry AES1–16 in/out; U1 SHARC runs vumeter.asm and the LED shifter.'},
    aesout:{x:740,y:30,w:150,h:70,t:'4 AES outputs',s:['BNC / XLR / DB25'],d:'The A/D half delivered as AES pairs.'},
    aesin:{x:740,y:230,w:150,h:70,t:'4 AES inputs',s:['BNC / XLR / DB25'],d:'Digital audio to be converted to analog.'},
    dac:{x:250,y:230,w:180,h:70,t:'4 × CS4334 DACs',s:['U101/104/107/110','→ NE5532 ×8'],d:'Already on the AMS8E-1 (ams8e.js) as the monitor outputs: the D/A half exists on the board.'},
    aout:{x:20,y:230,w:170,h:70,t:'8 analog outputs',s:['+4 dBu nominal'],d:'Balanced outputs from the NE5532 stages.'},
    met:{x:480,y:330,w:200,h:80,t:'2 × AMS8E-4',s:['16 bars × 22 LEDs','244 µs mux steps'],d:'The AMS8 meter board, 8 bars each. 32ME firmware already drives four boards (32 bars).'},
    psu:{x:20,y:360,w:170,h:60,t:'Power',s:['internal or external'],d:'Anthony raised an external supply to free rear space.'},
  };
  blockView(m,B,[['ain','adc',''],['adc','fpga','I2S'],['fpga','aesout',''],['aesin','fpga',''],['fpga','dac','I2S'],['dac','aout',''],['fpga','met','MD1–8'],['psu','fpga','']],{start:'fpga',w:900,h:440,side:'<p>The D/A half and the AES I/O already exist on the AMS8E-1; the A/D half and the analog inputs would be new.</p>'});
}
const SHEETS=[
  { name:'1 · Converters on the AMS8E-1', note:'Part references from ams8e.js (AMS8E-1 ISS5 IPC netlist); the ADC block is the proposed addition, drawn after the POD14A (inferred).', svg:()=>
    chip(80,60,180,'U101/104/107/110 CS4334',[['SDATA','I2S from FPGA'],['LRCK','48 kHz'],['MCLK','24.576 MHz (X3)']],[['AOUTL','→ NE5532'],['AOUTR','→ NE5532']],'×4, stereo DAC') +
    chip(520,60,200,'U4 Cyclone IV',[['H9','AES1–4 in/out'],['H10','AES5–8'],['H11','AES9–12'],['H12','AES13–16']],[['I2S','to DACs'],['I2S','from ADC (new)'],['H3','MD1–8 meters']],'EP4CE40F23C6N') +
    chip(80,300,180,'ADC ×4 (new)',[['AINL','← input amp'],['AINR','← input amp']],[['SDATA','I2S to FPGA']],'AK5394A class, inferred') },
  { name:'2 · Meter boards', note:'AMS8E-4: 8 bars × 22 LEDs, four 16-bit constant-current drivers U2–U5 and four P-FET row switches (ams8e.js). Two boards give the 16 meters RD58 asks for.', svg:()=>
    chip(120,80,200,'AMS8E-4 board A',[['MD1–4','from H3'],['ROW1–4','P-FET']],[['bars 1–8','A/D channels']],'TLC5926 ×4') + chip(520,80,200,'AMS8E-4 board B',[['MD5–8','from H3'],['ROW1–4','P-FET']],[['bars 9–16','D/A channels']],'TLC5926 ×4') },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'ams8e.js part data and the RD58 note', 'RD58 has no schematic. These sheets redraw the existing AMS8E-1 and AMS8E-4 circuits it would have reused, plus the missing ADC block.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('Signal path, stage by stage (selected channel)', `<div id="sp"></div>`)}${card('Meter mapping (ams81_vu_data.dat labels)', `<div id="mm"></div>`)}</div>`;
  const draw=()=>{ const c=chan(D.sel);
    const rows = D.sel<8 ? [['Analog input',`${fmt(c.dbu,1)} dBu`],['Input amp (balanced → ADC)',`unity ${inf}`],['ADC full scale',`0 dBFS = +${fs0()} dBu`],['AES out',`${fmt(c.dbfs,1)} dBFS ${c.clip?'(CLIPPED)':''}`],['Meter',`${fmt(c.dbfs-D.ref,1)} dB VU → ${litSegs(c.dbfs-D.ref)} LEDs`]]
                         : [['AES in',`${fmt(c.dbfs,1)} dBFS`],['CS4334 DAC',`0 dBFS → +${fs0()} dBu after NE5532 ${inf}`],['Analog output',`${fmt(c.dbu,1)} dBu`],['Meter',`${fmt(c.dbfs-D.ref,1)} dB VU → ${litSegs(c.dbfs-D.ref)} LEDs`]];
    m.querySelector('#sp').innerHTML = `<svg viewBox="0 0 520 ${rows.length*46+10}" style="width:100%">${rows.map((r,i)=>`<rect x="6" y="${6+i*46}" width="508" height="36" rx="6" fill="${/CLIP/.test(r[1])?'color-mix(in srgb,var(--bad) 30%,var(--panel2))':'var(--panel2)'}" stroke="var(--line)"/><text x="16" y="${29+i*46}" font-size="12" fill="var(--ink)">${r[0]}</text><text x="505" y="${29+i*46}" text-anchor="end" font-size="12" fill="var(--accent)">${r[1].replace(/<[^>]+>/g,'')}</text>`).join('')}</svg>`;
    const v=c.dbfs-D.ref; m.querySelector('#mm').innerHTML = tbl(['LED','dB VU','lit'], SEG_LBL.map((l,i)=>[i+1,l, v>=SEG_DB[i]-0.01?'●':'○']).reverse());
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  m.innerHTML = card('What RD58 decided, and what became of it', `<ol>
    <li><b>Never started.</b> R&amp;D_List.xls row 58 (“8 chan A-D / D-A converter with 16 chan metering. POD form factor.”, Kevin / engineering) has status “?”. The folder holds only the 17 Dec 2012|45 meeting note.</li>
    <li><b>Half the hardware already existed.</b> The AMS8E-1 main board carries AES1–16 inputs and outputs on H9–H12 and four CS4334 stereo DACs (U101/104/107/110) feeding NE5532 stages: 8 analog outputs from AES. What it lacks is analog inputs and ADCs.</li>
    <li><b>The meters fit, just.</b> Two AMS8E-4 boards (3.66 × 1.50 in) need 7.32 in of the POD's 8.69 × 1.73 in front, leaving about 0.7 in per side for power and status.</li>
    <li><b>The rear was the real problem.</b> With XLR or Phoenix connectors, 16 analog plus 8 AES connections do not fit a ½ RU rear in this model. DB25s and an external supply make it fit, which are exactly the two fallbacks in the note (connector widths ${inf}).</li>
    <li><b>What shipped instead.</b> The same functions were sold as separate PODs: POD13A (dual AES → analog D/A) and POD14A (dual analog → AES A/D). Each is a dual stereo converter (POD13A: converters A and B, each L/R; POD14A: two AK5394 stereo ADCs), so eight channels each way takes two of each: four ½ RU PODs, 2 RU when racked in pairs.</li>
    <li><b>The board-reuse idea did happen elsewhere.</b> RD60 (AMS81/82 on AMS8E-1 iss5) and RD66 (MLC8 on iss5) both completed, and the 32ME drives four AMS8E-4 boards, so a 16-meter build was within the firmware's reach.</li>
  </ol>`) + card('Assumptions', `<ul class="small"><li>Connector footprints (XLR 1.06 in, Phoenix 0.62 in, DB25 2.09 in, BNC 0.625 in in two rows) and the 17 in usable 1 RU rear width are model values (${inf}). The BNC pitch matches the T6301 row spacing.</li><li>ADC type and analog gain structure follow the POD14A/POD13A (${inf}).</li><li>The 1 kHz test burst is a model stimulus.</li></ul>`) +
  card('Sources', `<ul class="small mono"><li>XXX - ENGINEERING - 2016 RD FILES/RD58-AtoD-DtoA-8chanwithMetering/ProjectDescription.txt · R&amp;D_List.xls</li><li>#POD #SERIES/README.md · POD13A / POD14A READMEs</li><li>siumulation-plugins/ams8e.js, 32me.js, pod13a.js (parts, meter tables, calibration)</li><li>xxx-OBSOLETE - To Delete/XXX- AVB  VID BUDDY - #OBSOLETE #Archive/AVBManual.doc (0VU = +4 dBu, 0VU = −20 dBFS)</li></ul>`);
}

SIM.register({
  id:'rd58-adda-8ch-metering', name:'RD58 8-ch A/D + D/A with 16 meters · POD-size converter study ('+Y(2012)+')', duration:1,
  product:'RD58 8+8 converter POD', year:2012, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD58-AtoD-DtoA-8chanwithMetering',
  summary:'A December 2012 idea: one ½ RU POD with 8 channels of A/D, 8 of D/A and 16 meters, built on the AMS8E-1 main board and AMS8 meter boards. The model sizes the front and rear to scale, runs the levels through the house −20 dBFS = +4 dBu alignment, and shows the meters with the real VU ballistics.',
  highlights:['Front to scale with two live AMS8E-4 meter boards','Rear-panel connector budget: ½ RU vs 1 RU, XLR vs DB25, external PSU','dBu ↔ dBFS level chain with clipping','vumeter.asm VU time constant in slow motion','Shows which half of the hardware already existed'],
  depth:'Hardware model',
  stepUnits:[{label:'1 sample',period:()=>1/FS},{label:'1 LED mux step',period:()=>MUX},{label:'1 ms (meter sample)',period:()=>0.001},{label:'10 ms',period:()=>0.01},{label:'50 ms',period:()=>0.05}],
  zooms:[[1,'1 s'],[0.25,'250 ms'],[0.02,'20 ms'],[0.004,'4 ms (LED refresh)'],[0.001,'1 ms'],[1e-4,'100 µs']],
  defaultZoom:0,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: sizing the POD', render:viewTutorial},
    {id:'second', label:'One second inside', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Signal path', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
