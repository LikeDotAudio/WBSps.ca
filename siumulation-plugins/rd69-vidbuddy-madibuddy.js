/* =====================================================================
   RD69 — Vid Buddy / MADI Buddy (Ward-Beck R&D register: status "?", 16 Apr 2013)
   Plugin for the WBS Device Simulator (../siumulation.html)

   RD69-Scope.txt (148 bytes): "1. hand held device with built in battery 2. power connector 3 pin
   3. our cost to be $750 or less 4. utilizing demux4 board for SDI and MADI 5." (item 5 left blank).
   It is a successor to the 2002 AVB1 "VIDBuddy" portable monitor (SD-SDI only), rebuilt around the
   SA-DEMUX4 3G/HD/SD de-embedder, whose Issue 2 was being laid out with MADI parts that same spring.
   The model: a handheld on the Demux4 board, its battery budget against the old VIDBuddy's measured hours,
   its cost against the $750 target, and the SDI/MADI signal it would show.
   Sources (all in this archive):
   - RD69-VidBuddy_MADIBuddy/RD69-Scope.txt · README.md · R&D_List.xls (row 69)
   - xxx-OBSOLETE - To Delete/XXX- AVB  VID BUDDY - #OBSOLETE #Archive/AVBManual.doc and README.md (AVB1: 4.50 × 8.00 ×
       3.75 in, 1.6 kg, 12 V NiCd, battery life 2.0 / 2.5 / 3.0 / 4.0 h by mode, 3.0 h charge, SDI 270 Mb/s only,
       GS9023 de-embedder, CS8415 AES receiver, 600 × 234 LCD, stereo PPM bargraph, PIC16F874/747 firmware)
   - SA-DEMUX4 - #Master/README.md; …/DEMUX-4 - #ISS1 - Prototype QUOTE/DEMUX-4 - wardbeck.demux4 quote 011013.xlsx
       (assembled board $219.80 @ 25, $214.55 @ 50, $203.70 @ 100; stencils $550, programming $100)
   - SA-DEMUX4 - #Master/Demux4 - #RD #NOTES #RD31 #ARCHIVE /PCB/Demux4-BNC version/history.xls (backup9 "madi parts
       added on sheet 9", backup10 2013-07-15 iss2), backup10/DEMUX-4-ISS2-ALL-PARTS.xls (U20 M31285 MADI reclocker, DNI),
       parts/demux4_parts_plus_madi.xls (MADI_IN_FPGA C20/C22, MADI_OUT_FPGA C17/A17, MADI_OUT_GTP B16/A16)
   - siumulation-plugins/demux4.js (board 4.400 in square, BNC1/2 LMH0394 inputs, BNC3 GS2988 output, two AES BNCs,
       P3 PAN500 power, ATmega128L main loop 25–45 ms per pass)
   Power figures for the new design, battery capacities and the non-board costs are not in the archive: inferred.
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

/* ================= sources' numbers ================= */
const AVB1 = { w:4.5, h:8.0, d:3.75, kg:1.6, v:12, life:{ sdi:2.0, avAes:2.5, avAn:3.0, audio:4.0 }, charge:3.0 };
const QUOTE = { 25:219.80, 50:214.55, 100:203.70, nre:650 };
const FMTS = {
  '3g':  { name:'3G-SDI 1080p 59.94', lines:1125, rate:60000/1001, bits:2.97e9/1.001, pkts:'up to 2 audio packets per line pair '+'(inferred)' },
  'hd':  { name:'HD-SDI 1080i 29.97', lines:1125, rate:30000/1001, bits:1.485e9/1.001, pkts:'1 audio packet per line (typ.)' },
  'sd':  { name:'SD-SDI 525i 29.97', lines:525, rate:30000/1001, bits:270e6, pkts:'1 audio packet per line (typ.)' },
  'madi':{ name:'MADI 64 ch 48 kHz', lines:0, rate:48000, bits:125e6, pkts:'64 subframes per frame' },
};
/* inferred power budget of the new handheld (W) */
const PWR = { board:4.0, madi:0.35, lcd:3.0, meters:0.6, phones:0.5, mcu:0.2 };
const BATT = { nicd:{ name:'12 V NiCd (as AVB1), 1.8 Ah', wh:21.6, kg:0.55 }, li:{ name:'Li-ion 4S, 2.6 Ah', wh:38.5, kg:0.25 } };
const COST = { lcd:95, batt:85, case:120, panel:60, conn:45, assy:55 };    // inferred, USD 2013

/* ================= state ================= */
const D = { fmt:'hd', grp:1, pair:1, lcd:true, batt:'nicd', qty:100, sdiIn:true, ch:1, madiFit:false, level:-20 };
function reset(){ Object.assign(D,{ fmt:'hd', grp:1, pair:1, lcd:true, batt:'nicd', qty:100, sdiIn:true, ch:1, madiFit:false, level:-20 }); LOG.items=[]; SIM.refresh(); }
const F = ()=> FMTS[D.fmt];
function power(){ let p=PWR.board+PWR.mcu+PWR.meters+PWR.phones; if (D.lcd) p+=PWR.lcd; if (D.fmt==='madi') p+=PWR.madi; return p; }
function hours(){ return BATT[D.batt].wh*0.85/power(); }
/* implied AVB1 power from its manual table, if its pack were 21.6 Wh (inferred) */
const avb1W = h => 21.6/h;
function cost(){ const board=QUOTE[D.qty]; const rest=Object.values(COST).reduce((a,b)=>a+b,0) + (D.madiFit?18:0); return { board, rest, nre:QUOTE.nre/D.qty, total: board+rest+QUOTE.nre/D.qty }; }
function lock(){ if (!D.sdiIn) return false; if (D.fmt==='madi') return D.madiFit; return true; }

const A = {
  fmt(v){ act('Input → '+FMTS[v].name, tr=>{ D.fmt=v; const f=F();
    if (v==='madi'){ tr('MADI enters on BNC1: LMH0394 (U2) equaliser → MADI_IN_FPGA_P/N on FPGA pins C20/C22 (demux4_parts_plus_madi.xls) '+inf); tr(D.madiFit?'U20 M31285 fitted: MADI reclocked out via MADI_OUT_FPGA (C17/A17) or MADI_OUT_GTP (B16/A16)':'<b style="color:var(--bad)">U20 M31285 is DNI on Issue 2</b>: the board as built has no MADI path; fit U20 and add MADI logic to the FPGA'); }
    else { tr(`LMH0394 → Spartan-6 GTP (XAPP1076 triple-rate RX) → ${f.name}, ${Math.round(f.bits/1e6)} Mb/s`); tr('demux4.js: HANC audio → aes_tx ×4 → AES BNCs'); if (v==='3g') tr('The 2002 AVB1 (GS9023) could only take 270 Mb/s SD-SDI'); } }); },
  grp(v){ act('Audio group '+v, tr=>{ D.grp=+v; tr('Stand-alone DIP selects the group pair (getSaGrpSel in demux4.c, see demux4.js)'); }); },
  pair(v){ act('AES pair '+v+' to meters/phones', tr=>{ D.pair=+v; }); },
  lcd(){ act('LCD '+(D.lcd?'off':'on'), tr=>{ D.lcd=!D.lcd; tr('AVB1 manual: “To turn off the LCD Monitor, select the video source pushbutton that is illuminated”'); tr(`Power now ${power().toFixed(2)} W → ${hours().toFixed(1)} h`); }); },
  batt(v){ act('Battery → '+BATT[v].name, tr=>{ D.batt=v; tr(`${BATT[v].wh} Wh × 85 % usable / ${power().toFixed(2)} W = ${hours().toFixed(1)} h ${inf}`); tr('Scope item 1: “hand held device with built in battery”'); }); },
  qty(v){ act(`Build quantity → ${v}`, tr=>{ D.qty=+v; const c=cost(); tr(`Sencore quote 2013-01-10: assembled DEMUX-4 $${QUOTE[v].toFixed(2)} each at ${v}`); tr(`Total ≈ $${c.total.toFixed(0)} vs $750 target → ${c.total<=750?'within':'<b style="color:var(--bad)">over</b>'}`); }); },
  madiFit(){ act((D.madiFit?'Leave U20 unfitted (DNI)':'Fit U20 M31285 MADI reclocker'), tr=>{ D.madiFit=!D.madiFit; tr('DEMUX-4-ISS2-ALL-PARTS.xls: “M31285 | 3G/HD/SD/MADI Reclocker with Integrated Cable Driver | U20 | DNI | QFN32”'); }); },
  plug(){ act(D.sdiIn?'Unplug input':'Plug input', tr=>{ D.sdiIn=!D.sdiIn; tr(D.sdiIn?'demux4.c processLockStatus: lock after debounce':'No lock: AVB1 manual “SDI flashing … absence of a viable SDI signal”'); }); },
};

/* ================= panels ================= */
function unitSVG(){
  const U=60, W=AVB1.w*U, Hh=AVB1.h*U, t=SIM.t, lk=lock(), f=F();
  const lvl = lk ? D.level + 6*Math.sin(2*Math.PI*1.3*t) : -99;
  let s=`<svg viewBox="0 0 ${W+260} ${Hh+40}" style="width:100%;max-width:640px;display:block;margin:auto" role="img" aria-label="Handheld, drawn to the AVB1 size">
   <rect x="0" y="0" width="${W}" height="${Hh}" rx="22" fill="#2a2d31" stroke="#111" stroke-width="3"/>
   <rect x="${0.35*U}" y="${0.5*U}" width="${3.8*U}" height="${2.9*U}" rx="6" fill="${D.lcd?(lk&&D.fmt!=='madi'?'#3d6c9e':'#0b0c0d'):'#050505'}" stroke="#555"/>`;
  if (D.lcd){ s+= lk&&D.fmt!=='madi' ? `<rect x="${0.35*U}" y="${2.3*U}" width="${3.8*U}" height="${1.1*U}" fill="#d9c27a" opacity=".8"/><text x="${0.5*U}" y="${0.85*U}" font-size="14" fill="#fff" font-family="monospace">${f.name}</text>` : `<text x="${0.5*U}" y="${1.9*U}" font-size="15" fill="${lk?'#2bd46b':'#ff4d4d'}" font-family="monospace">${D.fmt==='madi'?(lk?'MADI LOCK 64ch':'MADI: NO PATH'):'NO SDI'}</text>`; }
  for (let ch=0; ch<2; ch++){ const x=(0.9+ch*1.6)*U, n=lk?Math.max(0,Math.round((lvl+40)/2)):0;
    for (let j=0;j<20;j++){ const y=Hh-1.3*U-j*0.16*U; s+=`<rect x="${x}" y="${y}" width="${1.1*U}" height="${0.1*U}" fill="${j<n?(j<14?'#36d05a':j<18?'#ffd23a':'#ff3b2f'):'#262a26'}"/>`; }
    s+=`<text x="${x+0.55*U}" y="${Hh-0.9*U}" text-anchor="middle" font-size="12" fill="#ccc">${ch?'R':'L'}</text>`; }
  [['3G','3g'],['HD','hd'],['SD','sd'],['MADI','madi']].forEach(([l,v],i)=>{ const x=(0.35+i*0.98)*U, y=Hh-0.65*U, on=D.fmt===v;
    s+=`<g data-a="fmt" data-v="${v}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${0.85*U}" height="${0.42*U}" rx="5" fill="${on?'#2bd46b':'#555'}"/><text x="${x+0.425*U}" y="${y+0.28*U}" text-anchor="middle" font-size="13" fill="#111">${l}</text></g>`; });
  s+=`<g data-a="lcd" style="cursor:pointer"><rect x="${0.35*U}" y="${3.55*U}" width="${1.2*U}" height="0.38" fill="none"/><rect x="${0.35*U}" y="${3.55*U}" width="${1.2*U}" height="${0.38*U}" rx="5" fill="${D.lcd?'#d9c27a':'#555'}"/><text x="${0.95*U}" y="${3.8*U}" text-anchor="middle" font-size="12" fill="#111">LCD</text></g>`;
  /* right-side connector panel (like the AVB1's recessed side panel) */
  const cx=W+40; s+=`<rect x="${W+10}" y="${0.4*U}" width="210" height="${Hh-0.8*U}" rx="12" fill="#1c1f22" stroke="#111"/><text x="${W+20}" y="${0.4*U+22}" font-size="12" fill="#aaa">side panel (Demux4 BNCs)</text>`;
  [['SDI IN 1 / MADI IN','in',D.sdiIn],['SDI IN 2','in2',false],['SDI OUT (GS2988)','out',lk&&D.fmt!=='madi'],['AES 1','a1',lk],['AES 2','a2',lk]].forEach(([l,k,live],i)=>{ const y=(1.3+i*1.15)*U;
    s+=`<g ${k==='in'?'data-a="plug" style="cursor:pointer"':''}><circle cx="${cx}" cy="${y}" r="20" fill="#c9b469" stroke="#7a5f12" stroke-width="3"/><circle cx="${cx}" cy="${y}" r="7" fill="${live?'#2bd46b':'#222'}"/><text x="${cx+30}" y="${y+5}" font-size="12" fill="#ddd">${l}</text></g>`; });
  const py=(1.3+5*1.15)*U; s+=`<circle cx="${cx}" cy="${py}" r="16" fill="#111" stroke="#888" stroke-width="3"/>${[0,1,2].map(i=>`<circle cx="${cx-7+i*7}" cy="${py+(i===1?-5:3)}" r="2.5" fill="#ccc"/>`).join('')}<text x="${cx+30}" y="${py+5}" font-size="12" fill="#ddd">3-pin power</text>`;
  s+=`<text x="0" y="${Hh+28}" font-size="13" fill="var(--ink2)">Drawn to the AVB1 size (4.50 × 8.00 in, AVBManual.doc); layout ${'inferred'}. Click format keys, LCD, or SDI IN 1.</text></svg>`;
  return s;
}
function ctlHTML(){
  const b=(a,v,l,on)=>`<button data-a="${a}" data-v="${v}" class="${on?'on':''}">${l}</button>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span class="small muted">group</span>${[1,2,3,4].map(v=>b('grp',v,'G'+v,D.grp===v)).join('')}
   <span class="small muted">| battery</span>${Object.keys(BATT).map(k=>b('batt',k,BATT[k].name,D.batt===k)).join('')}
   <span class="small muted">| build qty</span>${[25,50,100].map(v=>b('qty',v,v,D.qty===v)).join('')}
   ${b('madiFit','',D.madiFit?'U20 fitted':'U20 DNI',D.madiFit)}${b('lcd','',D.lcd?'LCD on':'LCD off',D.lcd)}</div>`;
}
function bindAll(root){ bindActs(root,{ fmt:v=>A.fmt(v), grp:v=>A.grp(v), pair:v=>A.pair(v), lcd:()=>A.lcd(), batt:v=>A.batt(v), qty:v=>A.qty(v), madiFit:()=>A.madiFit(), plug:()=>A.plug() }); }
function budgetHTML(){
  const c=cost(), p=power();
  return `<div class="grid2"><div>${tbl(['Cost item','USD'],[['DEMUX-4 assembled (Sencore quote, '+D.qty+')',c.board.toFixed(2)],['Stencils + programming NRE / unit',c.nre.toFixed(2)],['LCD, battery, case, panel, connectors, assembly '+inf,c.rest.toFixed(0)],['<b>Total</b>',`<b style="color:${c.total<=750?'var(--accent)':'var(--bad)'}">${c.total.toFixed(0)} of 750</b>`]])}</div>
    <div>${tbl(['Power item '+inf,'W'],[['Demux4 board (Spartan-6 + GTPs + clocks)',PWR.board],['MCU',PWR.mcu],['LED meters',PWR.meters],['Headphone amp',PWR.phones],['LCD',D.lcd?PWR.lcd:0],['M31285 (MADI)',D.fmt==='madi'?PWR.madi:0],['<b>Total</b>',`<b>${p.toFixed(2)}</b>`]])}
    <p class="small">${BATT[D.batt].name}: <b>${hours().toFixed(1)} h</b>. AVB1 manual, SDI with embedded audio: <b>2.0 h</b> (minimum stated).</p></div></div>`;
}

/* ================= timeline ================= */
function lanes(){
  const css=SIM.css, f=F(), lk=lock();
  const L=[];
  if (D.fmt==='madi'){ L.push({label:'MADI frames (20.8 µs)', h:22, draw(c,X,t0,t1,y,h){ if(!lk){ laneText(c,X,t0,y,h,'no MADI path (U20 DNI)',css('--bad')); return; } SIM.pulses(c,X,t0,t1,y,h,1/48000,0,0.9/48000,css('--accent'),'frames'); }});
    L.push({label:'Subframes 64 × 320 ns', h:20, draw(c,X,t0,t1,y,h){ if(lk) SIM.pulses(c,X,t0,t1,y,h,1/48000/64,0,1/48000/64*0.9,css('--accent2'),'subframes'); }}); }
  else { L.push({label:`${f.name} ${f.lines?'frames':''}`, h:22, draw(c,X,t0,t1,y,h){ if(!lk){ laneText(c,X,t0,y,h,'no input',css('--bad')); return; } SIM.pulses(c,X,t0,t1,y,h,1/f.rate,0,1/f.rate*0.04,css('--accent'),'frames'); }});
    L.push({label:`Lines (${f.lines} per frame)`, h:20, draw(c,X,t0,t1,y,h){ if(lk) SIM.pulses(c,X,t0,t1,y,h,1/(f.rate*f.lines),0,1/(f.rate*f.lines)*0.12,css('--ink2'),'lines'); }});
    L.push({label:`HANC audio packets, group ${D.grp}`, h:20, draw(c,X,t0,t1,y,h){ if(lk) SIM.pulses(c,X,t0,t1,y,h,1/(f.rate*f.lines),1/(f.rate*f.lines)*0.02,1/(f.rate*f.lines)*0.05,css('--warn'),'audio packets'); }}); }
  L.push({label:'AES3 out (48 kHz frames)', h:20, draw(c,X,t0,t1,y,h){ if(lk) SIM.pulses(c,X,t0,t1,y,h,1/48000,0,0.5/48000,css('--accent2'),'AES frames'); }});
  L.push({label:'Demux4 MCU main-loop passes (25–45 ms)', h:20, draw(c,X,t0,t1,y,h){ for(let t=0,k=0;t<1;k++){ const d=0.025+0.02*prand(k); if(t+d>=t0&&t<=t1) bandAt(c,X,t,t+d*0.95,y,h,css('--line'),.8,'pass '+k); t+=d; } }});
  L.push({label:`Battery: ${power().toFixed(1)} W`, h:24, draw(c,X,t0,t1,y,h){ const wh=BATT[D.batt].wh*0.85; laneText(c,X,t0,y,h,`${(power()*(t1-t0)).toFixed(4)} J in this window — ${(power()/3600/wh*100*(t1-t0)).toExponential(2)} % of the pack`,css('--ink')); }});
  return L;
}

/* ================= views ================= */
function viewSim(m){
  m.innerHTML = `<div class="grid2"><div>${card('The handheld (Demux4 inside)', `<div id="u"></div>`)}</div><div>${card('Controls', `<div id="ctl"></div>`)}${card('What the model did', `<div id="trace" class="log"></div>`)}</div></div>
    ${card('Budget: cost ($750 target) and battery', `<div id="bud"></div>`)}${card('Timeline — the input, the audio and the battery', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ const u=m.querySelector('#u'); u.innerHTML=unitSVG(); bindAll(u); const c=m.querySelector('#ctl'); c.innerHTML=ctlHTML(); bindAll(c); m.querySelector('#bud').innerHTML=budgetHTML(); m.querySelector('#trace').innerHTML=traceHTML(); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:240}); };
  SIM.on('time', draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'The scope', body:`<p>16 Apr 2013|46: a handheld tester with a built-in battery, a 3-pin power connector, a cost of $750 or less, built on the Demux4 board “for SDI and MADI”. Item 5 was never written. The old VIDBuddy (2002) is the reference: same job, SD-SDI only.</p>`, check:()=>true, auto:true },
  { title:'1 · 3G-SDI', body:`<p>Press <b>3G</b> on the unit. The Demux4 GTP receiver handles 3G/HD/SD; the 2002 AVB1's GS9023 handled only 270 Mb/s.</p>`, check:()=>D.fmt==='3g', hint:'Click the 3G key at the bottom of the unit.' },
  { title:'2 · MADI', body:`<p>Press <b>MADI</b>. On Issue 2 as built, the MADI reclocker U20 is fitted DNI, so the display says there is no path.</p>`, check:()=>D.fmt==='madi', hint:'Click MADI.' },
  { title:'3 · Fit U20', body:`<p>Press <b>U20 DNI</b> to fit the M31285. MADI now locks (64 channels). The FPGA still needs MADI logic; none is archived.</p>`, check:()=>D.fmt==='madi'&&D.madiFit, hint:'Press the U20 button.' },
  { title:'4 · Battery life', body:`<p>With the AVB1's kind of NiCd pack the model gives about 2.2 h, barely the AVB1's 2.0 h. Switch to <b>Li-ion</b>: more energy, less weight.</p>`, check:()=>D.batt==='li', hint:'Press the Li-ion button.' },
  { title:'5 · Save power like the AVB1', body:`<p>Turn the <b>LCD off</b>, the old VIDBuddy's trick for audio-only work (4.0 h instead of 2.0 h).</p>`, check:()=>!D.lcd, hint:'Press LCD.' },
  { title:'6 · The $750 question', body:`<p>Set the build quantity to <b>25</b>. The assembled Demux4 alone is $219.80, plus $26 of NRE per unit. The rest of the box is estimated, so the margin is only as good as those estimates.</p>`, check:()=>D.qty===25, hint:'Press 25.' },
  { title:'Done', body:`<p>RD69 never left the scope note. See Findings, the old unit (${plink('avb-vid-buddy','AVB1 VIDBuddy')}) and the board (${plink('demux4','SA-DEMUX4')}).</p>`, check:()=>true, auto:true },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — specifying the Buddy', panelTitle:'Unit and budget', reset,
  panel(el){ el.innerHTML = unitSVG()+ctlHTML()+budgetHTML(); bindAll(el); } }); }
function viewSecond(m){
  m.innerHTML = `${card('One second in the handheld', `<div id="lad"></div>`)}${card('Old vs new', `<div id="cmp"></div>`)}`;
  const draw=()=>{ const f=F();
    m.querySelector('#lad').innerHTML = tbl(['Event','per second','note'], (D.fmt==='madi'?[['MADI frames','48,000','64 subframes each'],['Line symbols','125,000,000','AES10 '+inf]]:[['Video frames',f.rate.toFixed(3),f.name],['Lines',Math.round(f.rate*f.lines).toLocaleString(),f.pkts],['Serial bits',Math.round(f.bits).toLocaleString(),'']]).concat([['AES3 frames out','48,000','per pair'],['MCU passes','≈ 28','25–45 ms each (demux4.js)'],['Energy used',`${power().toFixed(2)} J`,inf]]));
    m.querySelector('#cmp').innerHTML = tbl(['','AVB1 VIDBuddy (2002)','RD69 Buddy (2013 idea)'],[['SDI','270 Mb/s (GS9023), 4 groups','3G/HD/SD (Demux4), 2 groups out as AES'],['MADI','—','via U20 M31285 (DNI on Issue 2)'],['Battery','12 V NiCd, 2.0–4.0 h','built-in; '+hours().toFixed(1)+' h modelled'],['Power in','AC mains 90–230 V internal','3-pin power connector'],['Size','4.50 × 8.00 × 3.75 in, 1.6 kg','“hand held”'],['Cost','—','≤ $750 (our cost)']]);
  };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B={
    in1:{x:20,y:60,w:160,h:70,t:'BNC1 SDI/MADI in',s:['LMH0394 (U2)'],d:'demux4.js: SDI IN 1 through the LMH0394 equaliser; the R&D parts sheet also routes MADI_IN_FPGA from this sheet.'},
    in2:{x:20,y:170,w:160,h:70,t:'BNC2 SDI in',s:['LMH0394 (U9)'],d:'Second SDI input.'},
    fpga:{x:240,y:100,w:200,h:100,t:'XC6SLX45T',s:['GTP RX: 3G/HD/SD','HANC demux, aes_tx ×4','MADI pins C20/C22'],d:'The Demux4 FPGA.',live:()=>lock()},
    u20:{x:240,y:250,w:200,h:70,t:'U20 M31285',s:['MADI reclocker + driver','DNI on Issue 2'],d:'DEMUX-4-ISS2-ALL-PARTS.xls.',live:()=>D.madiFit},
    mcu:{x:500,y:20,w:180,h:70,t:'ATmega128L',s:['demux4.c main loop'],d:'Boots the FPGA, tunes clocks, reads DIP or UART.'},
    aes:{x:500,y:130,w:180,h:70,t:'AES out ×2',s:['to meters / phones'],d:'Two AES BNCs on the board.'},
    ui:{x:740,y:130,w:180,h:90,t:'Handheld UI',s:['LCD, LED meters','headphones'],d:'Display, meters and headphone amp (inferred, after the AVB1).'},
    bat:{x:500,y:260,w:180,h:70,t:'Battery + 3-pin in',s:['built-in, charger'],d:'Scope items 1 and 2.'},
  };
  blockView(m,B,[['in1','fpga',''],['in2','fpga',''],['fpga','u20','MADI_OUT'],['in1','u20',''],['mcu','fpga','SPI'],['fpga','aes',''],['aes','ui',''],['bat','ui','power'],['bat','fpga','']],{start:'fpga',w:940,h:350,side:'<p>The whole signal path is the existing Demux4 board; the handheld adds a battery, a screen and meters.</p>'});
}
const SHEETS=[
  { name:'1 · Demux4 Issue 2 MADI nets', note:'From demux4_parts_plus_madi.xls (FPGA PINS) and DEMUX-4-ISS2-ALL-PARTS.xls.', svg:()=>
    chip(330,70,220,'U1 XC6SLX45T',[['C20','MADI_IN_FPGA_P'],['C22','MADI_IN_FPGA_N']],[['C17','MADI_OUT_FPGA_P'],['A17','MADI_OUT_FPGA_N'],['B16','MADI_OUT_GTP_P'],['A16','MADI_OUT_GTP_N']],'2.5 V banks; GTP 123') +
    chip(600,300,170,'U20 M31285 (DNI)',[['31/32','MADI_OUT_FPGA'],['2/3','MADI_OUT_GTP']],[['OUT','MADI BNC']],'QFN32 4×4') + chip(140,300,150,'U2 LMH0394',[['IN','SDI_IN_BNC_1']],[['10/11','MADI_IN_FPGA']],'') },
  { name:'2 · Power entry', note:'Demux4 power comes in on P3 (PAN500, demux4.js). The 3-pin connector and battery switch-over are the RD69 additions (inferred).', svg:()=>
    chip(140,90,180,'3-pin power in',[['1','+V'],['2','GND'],['3','sense / charge '+'(inferred)']],[['→','charger']],'scope item 2') + chip(520,90,200,'Battery pack',[['+','from charger']],[['→','P3 PAN500 (Demux4)'],['→','LCD, meters']],'built-in') },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'Demux4 Issue 2 parts lists and the RD69 scope', 'RD69 has no schematic. These sheets show the Demux4 nets it relied on for MADI and the power entry the scope adds.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('Battery hours: AVB1 table and the new budget', `<div id="bh"></div>`)}${card('Input decision path', `<div id="dp"></div>`)}</div>`;
  const draw=()=>{ const rows=[['AVB1 SDI + embedded audio',AVB1.life.sdi],['AVB1 analog video + AES',AVB1.life.avAes],['AVB1 analog video + analog',AVB1.life.avAn],['AVB1 audio only (LCD off)',AVB1.life.audio],['RD69 model, now',hours()]];
    m.querySelector('#bh').innerHTML = `<svg viewBox="0 0 520 ${rows.length*36+10}" style="width:100%">${rows.map((r,i)=>`<text x="6" y="${26+i*36}" font-size="12" fill="var(--ink)">${r[0]}</text><rect x="230" y="${10+i*36}" width="${r[1]*50}" height="22" rx="4" fill="${i===4?'var(--accent)':'var(--accent2)'}" opacity=".75"/><text x="${236+r[1]*50}" y="${26+i*36}" font-size="12" fill="var(--ink2)">${r[1].toFixed(1)} h${i<4?' ≈ '+avb1W(r[1]).toFixed(1)+' W '+'*':''}</text>`).join('')}</svg><p class="small muted">* if the AVB1 pack held 21.6 Wh (${inf}).</p>`;
    const st=D.fmt==='madi'?['BNC1 → LMH0394','MADI_IN_FPGA (C20/C22)',D.madiFit?'M31285 lock → FPGA MADI deframer (not written)':'U20 DNI → no MADI','meters / phones']:['BNC1 → LMH0394','GTP RX (XAPP1076)','processLockStatus debounce (demux4.c)','HANC group '+D.grp+' → aes_tx','meters / phones'];
    m.querySelector('#dp').innerHTML = `<svg viewBox="0 0 520 ${st.length*40+10}" style="width:100%">${st.map((s,i)=>`<rect x="6" y="${6+i*40}" width="508" height="30" rx="6" fill="${/DNI|not written/.test(s)?'color-mix(in srgb,var(--bad) 25%,var(--panel2))':'var(--panel2)'}" stroke="var(--line)"/><text x="16" y="${26+i*40}" font-size="12" fill="var(--ink)">${s}</text>`).join('')}</svg>`;
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  m.innerHTML = card('What RD69 decided, and what became of it', `<ol>
    <li><b>Four lines and a blank.</b> RD69-Scope.txt (16 Apr 2013|46) stops at “5.”; the register keeps RD69 at “?”. No handheld built on the Demux4 exists in the archive.</li>
    <li><b>It was timed to the Demux4 respin.</b> The Demux4 BNC-version history adds “madi parts … on sheet 9” in backup9 and closes Issue 2 on 2013-07-15, three months after this scope. Issue 2 carries U20, an M31285 “3G/HD/SD/MADI Reclocker with Integrated Cable Driver”, fitted DNI, so the MADI half was drawn but never built.</li>
    <li><b>The board fits the budget on paper.</b> The Jan 2013 Sencore quote puts an assembled DEMUX-4 at $203.70–219.80, under a third of the $750 target; the rest of the handheld (screen, battery, case) is not costed anywhere (${inf}).</li>
    <li><b>Battery is the hard target.</b> The AVB1 promised only 2.0 h with SDI and embedded audio from a 12 V NiCd pack; a Spartan-6 board with GTP receivers plus an LCD needs a larger or lithium pack to match (${inf}).</li>
    <li><b>“3-pin power connector”</b> replaces the AVB1's internal AC mains supply (90–230 V) with an external supply.</li>
    <li><b>Naming.</b> “Vid Buddy” revives the AVB1 “VIDBuddy” name; the AVB1 is filed as “XXX- AVB VID BUDDY” (two spaces) in xxx-OBSOLETE, unrelated to RD63's AVB (Audio Video Bridging).</li>
  </ol>`) + card('Assumptions', `<ul class="small"><li>New-design power figures, battery capacities and non-board costs are model values (${inf}).</li><li>MADI on BNC1 follows the R&amp;D parts sheet (MADI_IN_FPGA on the SDI I/O sheet); the exact routing is inferred.</li><li>Display, meter and button layout is drawn after the AVB1 size; it is not a design.</li></ul>`) +
  card('Sources', `<ul class="small mono"><li>XXX - ENGINEERING - 2016 RD FILES/RD69-VidBuddy_MADIBuddy/RD69-Scope.txt · R&amp;D_List.xls</li><li>xxx-OBSOLETE - To Delete/XXX- AVB  VID BUDDY - #OBSOLETE #Archive/AVBManual.doc, README.md</li><li>SA-DEMUX4 - #Master/DEMUX-4 - #ISS1 - Prototype QUOTE/DEMUX-4 - wardbeck.demux4 quote 011013.xlsx; …/PCB/Demux4-BNC version/history.xls, backup10/DEMUX-4-ISS2-ALL-PARTS.xls; parts/demux4_parts_plus_madi.xls</li><li>siumulation-plugins/demux4.js</li></ul>`);
}

SIM.register({
  id:'rd69-vidbuddy-madibuddy', name:'RD69 Vid Buddy / MADI Buddy · handheld tester on the Demux4 board ('+Y(2013)+')', duration:1,
  product:'RD69 Vid/MADI Buddy', year:2013, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD69-VidBuddy_MADIBuddy',
  summary:'An April 2013 scope for a battery handheld that de-embeds SDI and reads MADI, built on the SA-DEMUX4 board for $750 or less. The model puts the Demux4 in an AVB1-sized case, tests its battery life against the 2002 VIDBuddy’s measured hours, costs it from the real Demux4 assembly quote, and shows that the MADI reclocker on Issue 2 was never fitted.',
  highlights:['3G/HD/SD and MADI inputs, with the unfitted U20 MADI reclocker','Battery hours vs the AVB1 VIDBuddy manual table','Cost from the Jan 2013 Demux4 assembly quote vs $750','Signal timing: lines, HANC packets, AES frames, MCU passes','Old VIDBuddy vs new Buddy comparison'],
  depth:'Hardware model',
  stepUnits:[{label:'1 line',period:()=>F().lines?1/(F().rate*F().lines):1/48000},{label:'1 AES frame',period:()=>1/48000},{label:'1 video frame',period:()=>1/F().rate},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[1001/30000,'1 frame'],[0.001,'1 ms'],[1e-4,'100 µs']],
  defaultZoom:1,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: specifying the Buddy', render:viewTutorial},
    {id:'second', label:'One second, old vs new', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
