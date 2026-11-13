/* =====================================================================
   RD57 — MADI Distribution Amplifier (Ward-Beck R&D register: Eugene / Wayne / Engineering, status "?")
   Plugin for the WBS Device Simulator (../siumulation.html)

   The whole RD57 folder is one 198-byte note (Notes.txt, 25 Oct 2012): WBS analog-video, digital-audio
   and digital-video DAs were tried with an RME MADI source/analyser and none passed MADI; a customer of
   Wayne's asked. This plugin re-runs that bench test with the three DA types and explains each failure
   from the cards' own code and parts, then shows what a MADI DA needs.
   Sources (all in this archive):
   - RD57-MADI_DistributionAmplifier/Notes.txt · R&D_List.xls (row 57)
   - #OPENGEAR #SERIES/M6203 - #Master #OPENGEAR/README.md and …/M6203A/Software/atmel/v101/
       v100w.c (main loop: READ_GS2975_STATUS, PROCESS_SDI_LOCK_STATUS_UPDATE, PROCESS_SDI_LOCK_STATUS, wait(1000),
       CAN_FUNCTIONS), M6203A.c (lock60 counting, DDO_MUTE_ENABLED, SDI_OUTPUTS_DISABLED), M6203.h (port bits, SR_270/1G5/3G0)
   - siumulation-plugins/t6301.js data (T6301 ISS4 BNC positions; M6203A / D6201A / AV6201A rear pinouts)
   - siumulation-plugins/d6201a.js (CS8416 AES receiver) · av6201a.js (GB4571 clamp, LMH1981 sync detect)
   - 32ME-MADI/ClockDescription.txt (DirectOut i64 module: 56/64 ch, 48k/96k frame, X602 "active loop-through",
       4 ns jitter from its 250 MHz internal clock)
   - SA-DEMUX4 - #Master/…RD31…/PCB/Demux4-BNC version/backup10/DEMUX-4-ISS2-ALL-PARTS.xls (U20 M31285
       "3G/HD/SD/MADI Reclocker with Integrated Cable Driver", DNI), history.xls (backup9: "madi parts added on sheet 9"),
       parts/demux4_parts_plus_madi.xls (MADI_IN_FPGA / MADI_OUT_FPGA / MADI_OUT_GTP pins)
   MADI line numbers (125 Mbaud, 4B5B, NRZI, 32-bit subframes) are AES10 figures, not archive text: marked inferred.
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

/* ================= model ================= */
const BAUD = 125e6, TB = 1/BAUD;                 // AES10 line rate (inferred: standard, not in the archive)
const FS = 48000;
/* T6301 ISS4 BNC centres (inches, card side), from t6301.js DATA.issues.iss4.pos; board 1.34 × 3.391 in */
const BNC = [[0.238,0.505],[0.863,0.505],[0.238,1.13],[0.863,1.13],[0.238,1.755],[0.863,1.755],[0.238,2.38],[0.863,2.38],[0.238,3.005],[0.863,3.005]];
const ROLE = ['IN1','n/c','OUT1','OUT5','OUT2','OUT6','OUT3','OUT7','OUT4','OUT8'];     // same for M6203A, D6201A, AV6201A (t6301.js cards)
const DAS = {
  av6201a:{ name:'AV6201A analog video DA', kind:'analog video', short:'AV6201A', plug:'av6201a',
    path:['BNC1 IN1','differential input','GB4571 clamp (U3) keyed by LMH1981 sync','0–300 m video EQ','8 × 75 Ω line drivers'] },
  d6201a:{ name:'D6201A AES reclocking DA', kind:'digital audio', short:'D6201A', plug:'d6201a',
    path:['BNC1 IN1','AES equaliser','CS8416 AES3 receiver (≤ 192 kHz)','FPGA reclock','8 × 75 Ω AES drivers'] },
  m6203a:{ name:'M6203A SDI reclocking DA', kind:'digital video', short:'M6203A', plug:null,
    path:['BNC1 IN1','GS2974A adaptive EQ','GS2975A reclocker (lock → PA4)','GS2978 cable drivers','8 × 75 Ω SDI outputs'] },
  madi:{ name:'MADI DA (the RD57 idea)', kind:'MADI', short:'MADI DA', plug:null,
    path:['BNC IN','cable EQ','M31285 3G/HD/SD/MADI reclocker','integrated cable driver','fan-out to 8 × 75 Ω'] },
};
const D = { da:'m6203a', on:true, cableIn:10, cableOut:2, ch:64, frame:48, clamp:true, bw:30, out:0,
  lock60:0, lockCnt:0, passes:0 };
function reset(){ Object.assign(D,{ da:'m6203a', on:true, cableIn:10, cableOut:2, ch:64, frame:48, clamp:true, bw:30, out:0, lock60:0, lockCnt:0, passes:0 }); LOG.items=[]; tutor.done={}; SIM.refresh(); }

/* MADI frame arithmetic (AES10 figures; inferred) */
function madi(){
  const sub = D.ch, symPerSub = 32*5/4;                 // 32 bits → 40 symbols after 4B5B
  const frameT = 1/FS;                                  // 20.833 µs per 48 kHz frame (96k frame = smux2 in the same rate, ClockDescription.txt)
  const slots = BAUD*frameT;                            // 2604.2 symbol slots per frame
  const used = sub*symPerSub;                           // 2560 (64 ch) or 2240 (56 ch)
  return { sub, symPerSub, frameT, slots, used, fill: slots-used, payload: sub*32*FS, subT: symPerSub*TB };
}
/* coax loss at the MADI fundamental (62.5 MHz): ≈ 3.6 dB / 100 m for 1694A-class cable (inferred) */
const lossDb = m => 3.6*m/100;
/* what reaches the analyser through each DA */
function evaluate(){
  const r = { lock:false, out:false, eye:0, why:[], code:[] };
  if (!D.on){ r.why.push('Source off: nothing on the cable.'); return r; }
  const inLoss = lossDb(D.cableIn), outLoss = lossDb(D.cableOut);
  if (D.da==='m6203a'){
    r.code.push('READ_GS2975_STATUS(): ss = (PINA & (BIT3|BIT2|BIT1)) >> 1 → not SR_270 (2), SR_1G5 (5) or SR_3G0 (6)');
    r.code.push(`PROCESS_SDI_LOCK_STATUS_UPDATE(): lock60 = 0x00 → counts PA4 high in 101 reads (i = 0…100); needs ≥ lock60_lock_limit = 95`);
    r.code.push('PA4 (GS2975A lock) stays low at 125 Mbaud '+inf+' → lock60_counter = 0 → lock60 stays 0x00');
    r.code.push('PROCESS_SDI_LOCK_STATUS(): NO_LOCK_LED_ON · BYPASS_MODE_OFF · DDO_MUTE_ENABLED (PA6 low) · SDI_OUTPUTS_DISABLED (PD4 low)');
    r.why.push('The reclocker only reports lock at SDI rates; with no lock the V101 firmware mutes the cable drivers. BYPASS_MODE_ON is defined in M6203.h but never called, so there is no pass-through.');
    return r;
  }
  if (D.da==='d6201a'){
    r.code.push('CS8416 input: AES3 biphase at ≤ 192 kHz → ≤ 24.576 Mcells/s; MADI is 125 Mbaud (≈ 5×) '+inf);
    r.code.push('CS8416 never sets lock → no recovered clock for the FPGA → outputs carry no AES frames');
    r.why.push('An AES DA decodes and re-encodes AES3. MADI is not AES3, so there is nothing for the receiver to decode.');
    return r;
  }
  if (D.da==='av6201a'){
    const tau = 1/(2*Math.PI*D.bw*1e6), eyeBW = Math.tanh(TB/(2*tau));            // first-order roll-off ISI (inferred model)
    const clampHit = D.clamp ? 0.55 : 0;                                          // clamp pulled on random data (inferred)
    r.eye = clamp(eyeBW*Math.pow(10,-(inLoss+outLoss)/20) - clampHit, 0, 1);
    r.code.push(`LMH1981 sync separator: no H sync in a MADI stream → GB4571 clamp ${D.clamp?'fires on data edges':'jumpered OFF'} ${inf}`);
    r.code.push(`Video path bandwidth ${D.bw} MHz ${inf} vs MADI fundamental 62.5 MHz → eye ${Math.round(eyeBW*100)} % before cable loss`);
    r.lock = r.out = r.eye > 0.35;
    r.why.push(r.out ? 'With the clamp off and enough bandwidth the linear path could carry MADI (not tested in the archive).' : 'The clamp and the video bandwidth close the MADI eye; the analyser loses sync.');
    return r;
  }
  /* MADI DA */
  const m = madi(); const reach = 0.5*(1-Math.min(1,(inLoss)/14));
  r.eye = clamp(0.9 - inLoss/14, 0, 0.9);
  r.code.push(`Cable in ${D.cableIn} m → ${inLoss.toFixed(1)} dB at 62.5 MHz ${inf}; EQ budget ≈ 14 dB ${inf}`);
  r.code.push('M31285 locks at 125 Mbaud, retimes the NRZI stream and drives fresh edges (part named in DEMUX-4-ISS2-ALL-PARTS.xls)');
  r.code.push(`Fan-out: 8 outputs, ${m.sub} channels × 32 bits × ${FS} Hz = ${(m.payload/1e6).toFixed(3)} Mb/s payload, untouched`);
  r.lock = r.out = r.eye > 0.2;
  r.why.push(r.out ? 'A reclocker that knows 125 Mbaud regenerates the stream: every output is a clean copy.' : 'Too much input cable: the equaliser cannot open the eye.');
  void reach; return r;
}

const A = {
  da(k){ act('Card in the frame → '+DAS[k].name, tr=>{ D.da=k; D.lock60=0; const r=evaluate(); tr('Rear module: T6301 (BNC1 = IN1, BNC2 not connected, BNC3–10 = OUT1–8 in the order 1,5,2,6,3,7,4,8)'); r.code.forEach(tr); tr('RME analyser: '+(r.out?'<b>sync, no errors</b>':'<b style="color:var(--bad)">no sync</b>')); }); },
  src(){ act('RME source '+(D.on?'off':'on'), tr=>{ D.on=!D.on; tr(D.on?`MADI out: ${D.ch} ch, ${D.frame} kHz frame`:'Source muted'); }); },
  ch(v){ act(`Source channel mode → ${v}`, tr=>{ D.ch=+v; const m=madi(); tr(`${m.sub} subframes × 40 symbols = ${m.used} of ${m.slots.toFixed(1)} symbol slots per frame; ${m.fill.toFixed(1)} filled with sync symbols`); tr('i64 module: jumper Aux 1-2 sets 56 ch (ClockDescription.txt)'); }); },
  frame(v){ act(`Source frame → ${v} kHz`, tr=>{ D.frame=+v; tr(v==96?'96k frame: the i64 detects it and outputs the audio as smux2 (ClockDescription.txt). The line rate does not change.':'48k frame (1FS)'); }); },
  cable(v){ act(`Input cable → ${v} m`, tr=>{ D.cableIn=+v; tr(`${lossDb(+v).toFixed(1)} dB at 62.5 MHz ${inf}`); }); },
  clampT(){ act('AV6201A clamp jumper '+(D.clamp?'OFF':'ON'), tr=>{ D.clamp=!D.clamp; tr('av6201a.js: the clamp jumper switches GB4571 (U3) in or out'); }); },
  bw(v){ act(`Assumed video-path bandwidth → ${v} MHz`, tr=>{ D.bw=+v; tr('Not in the archive; a sweep to see what would be needed '+inf); }); },
  out(k){ act(`Analyser on ${ROLE[k]}`, tr=>{ D.out=k; const pos=BNC[k]; tr(`T6301 ${'BNC'+(k+1)} at (${pos[0]}, ${pos[1]}) in → ${ROLE[k]}`); if (k===1) tr('BNC2 is not connected on a 1×8 card'); if (k===0) tr('That is the input BNC'); }); },
};

/* ---------------- panels ---------------- */
function rearSVG(){
  const r = evaluate(), U = 150, W = 1.34*U, H = 3.391*U;
  let s = `<svg viewBox="-10 -10 ${W+20} ${H+40}" style="width:100%;max-width:230px;display:block;margin:auto" role="img" aria-label="T6301 rear, to scale">
    <rect x="0" y="0" width="${W}" height="${H}" rx="4" fill="#1d4a2c" stroke="#0d2b18"/>`;
  BNC.forEach((p,k)=>{ const x=p[0]*U, y=p[1]*U, isOut=k>=2, live = k===0 ? D.on : (isOut && r.out);
    const on = D.out===k;
    s += `<g data-a="out" data-v="${k}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="30" fill="#c9b469" stroke="${on?'var(--accent)':'#7a5f12'}" stroke-width="${on?6:3}"/><circle cx="${x}" cy="${y}" r="11" fill="${live?'#2bd46b':'#222'}"/>
      <text x="${x}" y="${y+46}" text-anchor="middle" font-size="15" fill="#e8ecef">${ROLE[k]}</text><title>BNC${k+1}: ${ROLE[k]}</title></g>`; });
  s += `<text x="${W/2}" y="${H+26}" text-anchor="middle" font-size="13" fill="var(--ink2)">T6301 ISS4, 1.34 × 3.391 in</text></svg>`;
  return s;
}
function benchSVG(){
  const r = evaluate(), dd = DAS[D.da], m = madi();
  const g = (x,y,w,h,t,sub,col,act_,v)=>`<g ${act_?`data-a="${act_}" data-v="${v||''}" style="cursor:pointer"`:''}><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${col||'var(--panel2)'}" stroke="var(--line)"/><text x="${x+10}" y="${y+22}" font-size="14" font-weight="700" fill="var(--ink)">${t}</text>${(sub||[]).map((l,i)=>`<text x="${x+10}" y="${y+42+i*16}" font-size="12" fill="var(--ink2)">${l}</text>`).join('')}</g>`;
  let s = `<svg viewBox="0 0 900 250" style="width:100%" role="img" aria-label="Bench: RME source, DA, RME analyser"><defs><marker id="ar57" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
  s += g(10,60,170,110,'RME MADI source',[D.on?`${m.sub} ch · ${D.frame} kHz frame`:'OFF','125 Mbaud NRZI '+'(AES10)','click to switch'],D.on?'color-mix(in srgb,var(--accent) 14%,var(--panel2))':'var(--panel2)','src');
  s += `<line x1="180" y1="115" x2="300" y2="115" stroke="var(--ink2)" stroke-width="2" marker-end="url(#ar57)"/><text x="190" y="105" font-size="12" fill="var(--ink2)">${D.cableIn} m coax</text>`;
  s += g(300,20,300,200,dd.name,dd.path,r.out?'color-mix(in srgb,var(--accent) 12%,var(--panel2))':'color-mix(in srgb,var(--bad) 10%,var(--panel2))');
  s += `<line x1="600" y1="115" x2="720" y2="115" stroke="${r.out?'var(--accent)':'var(--bad)'}" stroke-width="2" ${r.out?'':'stroke-dasharray="6 5"'} marker-end="url(#ar57)"/><text x="610" y="105" font-size="12" fill="var(--ink2)">${ROLE[D.out]}</text>`;
  s += g(720,60,170,110,'RME analyser',[r.out?'SYNC · no errors':'NO SYNC',r.out?`${m.sub} ch decoded`:'—',r.eye?`eye ≈ ${Math.round(r.eye*100)} %`:'eye closed'],r.out?'color-mix(in srgb,var(--accent) 20%,var(--panel2))':'color-mix(in srgb,var(--bad) 18%,var(--panel2))');
  s += '</svg>';
  return s;
}
function ctlHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
    ${Object.keys(DAS).map(k=>`<button data-a="da" data-v="${k}" class="${D.da===k?'on':''}">${DAS[k].short}</button>`).join('')}
    <span class="small muted">| source</span><button data-a="ch" data-v="64" class="${D.ch===64?'on':''}">64 ch</button><button data-a="ch" data-v="56" class="${D.ch===56?'on':''}">56 ch</button>
    <button data-a="frame" data-v="48" class="${D.frame===48?'on':''}">48k frame</button><button data-a="frame" data-v="96" class="${D.frame===96?'on':''}">96k frame</button>
    <span class="small muted">| cable in</span>${[2,10,50,100,150].map(v=>`<button data-a="cable" data-v="${v}" class="${D.cableIn===v?'on':''}">${v} m</button>`).join('')}
    ${D.da==='av6201a'?`<span class="small muted">| AV6201A</span><button data-a="clampT" class="${D.clamp?'on':''}">clamp ${D.clamp?'ON':'OFF'}</button>${[30,60,100].map(v=>`<button data-a="bw" data-v="${v}" class="${D.bw===v?'on':''}">${v} MHz ${'*'}</button>`).join('')}`:''}
  </div><p class="small muted">* bandwidth of the AV6201A video path is not in the archive (${inf}).</p>`;
}
function bindAll(root){ bindActs(root,{ da:v=>A.da(v), src:()=>A.src(), ch:v=>A.ch(v), frame:v=>A.frame(v), cable:v=>A.cable(v), clampT:()=>A.clampT(), bw:v=>A.bw(v), out:v=>A.out(+v) }); }

/* ---------------- timeline ---------------- */
/* M6203A V101 main loop (v100w.c): AT90CAN128 at 8 MHz (CAN.c comment "1 Mbps for a 8.000 MHz clock"). Cycle counts inferred. */
const LOOP = { read:20e-6, update:101*1.5e-6, status:8e-6, wait:1000*6/8e6, can:120e-6 };
LOOP.T = LOOP.read+LOOP.update+LOOP.status+LOOP.wait+LOOP.can;
function lanes(){
  const css = SIM.css, m = madi(), r = evaluate();
  const sym = n => { const f = Math.floor(n / m.slots); const k = n - Math.floor(f*m.slots); return k < m.used ? prand(n) : (k%2); };
  let nrzi = 0, lastN = -1;   // NRZI: a 1 toggles the line (drawn as transitions)
  const ls = [];
  ls.push({ label:'MADI frames (48 kHz)', h:24, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,m.frameT,0,m.used*TB,css('--accent'),'frames'); }});
  ls.push({ label:`Subframes (${m.sub} × 320 ns)`, h:24, draw(c,X,t0,t1,y,h){
    const n0=Math.floor(t0/m.frameT), n1=Math.ceil(t1/m.frameT);
    if ((X(t0+m.subT)-X(t0)) < 2){ SIM.pulses(c,X,t0,t1,y,h,m.frameT/m.sub*0.98,0,m.subT*0.9,css('--accent2'),'subframes'); return; }
    for (let f=n0; f<=n1; f++) for (let k=0;k<m.sub;k++){ const a=f*m.frameT+k*m.subT; if (a>t1||a+m.subT<t0) continue; bandAt(c,X,a,a+m.subT*0.96,y,h,css('--accent2'),.55,'ch '+(k+1)); }
    for (let f=n0; f<=n1; f++){ const a=f*m.frameT+m.used*TB; bandAt(c,X,a,(f+1)*m.frameT,y,h,css('--warn'),.35,'sync fill'); } }});
  ls.push({ label:'Line (NRZI, 8 ns symbols)', h:30, draw(c,X,t0,t1,y,h){ if (!D.on){ laneText(c,X,t0,y,h,'source off'); return; }
    bitsLane(c,X,t0,t1,y,h,TB,n=>{ if (n!==lastN+1){ nrzi=prand(n*7); } if (sym(n)) nrzi^=1; lastN=n; return nrzi; },css('--ink'),'symbols'); }});
  ls.push({ label:`${DAS[D.da].short} output (${ROLE[D.out]})`, h:30, draw(c,X,t0,t1,y,h){
    if (!r.out){ c.strokeStyle=css('--bad'); c.beginPath(); c.moveTo(X(t0),y+h/2); c.lineTo(X(t1),y+h/2); c.stroke(); laneText(c,X,t0,y,h, D.da==='m6203a'?'muted: DDO_MUTE_ENABLED, SDI_OUTPUTS_DISABLED':D.da==='d6201a'?'no AES frames (CS8416 unlocked)':'eye closed — analyser has no sync', css('--bad')); return; }
    let lv=0, ln=-9; bitsLane(c,X,t0+3e-9,t1,y,h,TB,n=>{ if(n!==ln+1) lv=prand(n*7); if (sym(n)) lv^=1; ln=n; return 0.5+(lv-0.5)*Math.max(0.2,r.eye); },css('--accent'),'symbols out'); }});
  ls.push({ label:'M6203A firmware loop (V101)', h:26, draw(c,X,t0,t1,y,h){
    const n0=Math.floor(t0/LOOP.T), n1=Math.ceil(t1/LOOP.T);
    if (X(t0+LOOP.T)-X(t0) < 3){ SIM.pulses(c,X,t0,t1,y,h,LOOP.T,0,LOOP.update,css('--warn'),'main-loop passes'); return; }
    for (let n=n0;n<=n1;n++){ let a=n*LOOP.T; [['READ_GS2975_STATUS',LOOP.read,'--accent2'],['LOCK_UPDATE ×101',LOOP.update,'--warn'],['STATUS',LOOP.status,'--bad'],['wait(1000)',LOOP.wait,'--line'],['CAN',LOOP.can,'--accent']].forEach(([l,d,col])=>{ bandAt(c,X,a,a+d,y,h,css(col),.6,l); a+=d; }); } }});
  ls.push({ label:'M6203A PA4 lock / PA6 DDO_MUTE', h:24, draw(c,X,t0,t1,y,h){ const locked = D.da==='m6203a' ? false : r.lock;
    laneText(c,X,t0,y,h, D.da==='m6203a' ? 'PA4 = 0 every read → lock60 = 0x00 → PA6 low (mute), PD4 low (drivers off)' : `(only the M6203A has this loop; ${DAS[D.da].short} ${locked?'passes':'fails'})`, D.da==='m6203a'?css('--bad'):css('--ink2')); }});
  return ls;
}

/* ---------------- views ---------------- */
function viewSim(m){
  m.innerHTML = `${card('Bench — the RD57 test, re-run', `<div id="bench"></div><div id="ctl" style="margin-top:6px"></div>`)}
    <div class="grid2"><div>${card('Rear module of the card under test (click a BNC)', `<div id="rear"></div>`)}</div>
    <div>${card('What the model did', `<div id="trace" class="log"></div>`)}${card('MADI stream', `<div id="mk"></div>`)}</div></div>
    ${card('Timeline — MADI line, DA output and the M6203A loop', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ const b=m.querySelector('#bench'); b.innerHTML=benchSVG(); bindAll(b); const c=m.querySelector('#ctl'); c.innerHTML=ctlHTML(); bindAll(c);
    const rr=m.querySelector('#rear'); rr.innerHTML=rearSVG(); bindAll(rr); m.querySelector('#trace').innerHTML=traceHTML();
    const mm=madi(); m.querySelector('#mk').innerHTML=kv([['Line rate','125 Mbaud, 4B5B + NRZI '+inf],['Frame','20.83 µs (48 kHz)'],['Payload',`${mm.sub} × 32 bit × 48 kHz = ${(mm.payload/1e6).toFixed(3)} Mb/s`],['Symbols / frame',`${mm.used} data + ${mm.fill.toFixed(1)} sync`],['Frames so far',Math.floor(SIM.t*FS).toLocaleString(),1]]);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210}); };
  SIM.on('time', draw);
}
const tutor = { i:0, done:{} };
const LESSONS = [
  { title:'The question', body:`<p>October 2012|45. A customer of Wayne's asked whether a Ward-Beck DA could distribute MADI. The test technician put an RME MADI source and analyser on each family of WBS DA. Notes.txt: <i>“none of them passed MADI.”</i></p><p>This tutorial repeats the test, then asks what a MADI DA would need.</p>`, check:()=>true, auto:true },
  { title:'1 · The SDI DA', body:`<p>Select <b>M6203A</b>. The trace walks the V101 firmware: the GS2975A never reports an SDI rate, <span class="mono">lock60</span> stays 0, and <span class="mono">PROCESS_SDI_LOCK_STATUS</span> mutes the drivers.</p>`, check:()=>D.da==='m6203a'&&LOG.items.some(e=>/M6203A/.test(e.name)), hint:'Press the M6203A button (even if it is already lit).' },
  { title:'2 · Look at an output', body:`<p>Click <b>OUT5</b> on the T6301 rear (second column, second row). The timeline lane for the DA output is flat: the drivers are disabled.</p>`, check:()=>D.out===3, hint:'OUT5 is BNC4, right column, second from the top.' },
  { title:'3 · The AES DA', body:`<p>Select <b>D6201A</b>. Its CS8416 receiver expects AES3 biphase at up to 192 kHz; MADI arrives about five times faster and is not AES3 at all.</p>`, check:()=>D.da==='d6201a', hint:'Press D6201A.' },
  { title:'4 · The analog video DA', body:`<p>Select <b>AV6201A</b>. A linear path is the only one that could carry an unknown bit stream. Turn the <b>clamp OFF</b> and try the bandwidth buttons. The archive has no bandwidth figure, so this part is a what-if.</p>`, check:()=>D.da==='av6201a'&&!D.clamp, hint:'Press AV6201A, then the clamp button.' },
  { title:'5 · What a MADI DA needs', body:`<p>Select <b>MADI DA</b>: an equaliser and a reclocker that know 125 Mbaud. Demux4 Issue 2 (2013|46) carries exactly such a part as U20, an M31285 “3G/HD/SD/MADI reclocker with integrated cable driver”, fitted DNI.</p>`, check:()=>D.da==='madi', hint:'Press MADI DA.' },
  { title:'6 · Cable reach', body:`<p>Set the input cable to <b>150 m</b>. The equaliser runs out of budget (${inf} figures) and the analyser loses sync even with the right reclocker.</p>`, check:()=>D.da==='madi'&&D.cableIn===150, hint:'Press 150 m with MADI DA selected.' },
  { title:'Done', body:`<p>No MADI DA was built. MADI arrived at WBS as an input instead: the 32ME-MADI monitor with the i64 module (see ${plink('32me','32ME')} and ${plink('ams8e','AMS8E')}). The Findings tab has the details.</p>`, check:()=>true, auto:true },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — repeating the RD57 bench test', panelTitle:'Bench and rear module', reset,
  panel(el){ el.innerHTML = benchSVG() + ctlHTML() + `<div style="max-width:200px;margin:auto">${rearSVG()}</div>`; bindAll(el); } }); }
function viewSecond(m){
  m.innerHTML = `${card('One second of MADI, by layer', `<div id="lad"></div>`)}${card('At the playhead', `<div id="dev"></div>`)}`;
  const draw=()=>{ const mm=madi(), t=SIM.t;
    m.querySelector('#lad').innerHTML = tbl(['Layer','per second','period','note'],[
      ['Line symbols','125,000,000','8 ns','4B5B + NRZI '+inf],['Data bits',`${(mm.payload).toLocaleString()}`,'—',`${mm.sub} ch × 32 bit × 48 kHz`],
      ['Frames','48,000','20.83 µs','96k audio rides as smux2 in the same frames (ClockDescription.txt)'],['Subframes',(mm.sub*48000).toLocaleString(),'320 ns','40 symbols each'],
      ['M6203A loop passes',Math.round(1/LOOP.T).toLocaleString(),SIM.fmtDur(LOOP.T),'V101 main loop (cycle counts '+inf+')'],['M6203A lock reads',Math.round(101/LOOP.T).toLocaleString(),'—','101 per pass; 95 needed to lock'],
    ].map(r=>r.map((c,i)=>i===1||i===2?`<span class="mono">${c}</span>`:c)));
    const f=Math.floor(t*FS), within=(t*FS-f)*mm.slots, k=Math.floor(within/40);
    m.querySelector('#dev').innerHTML = kv([['Frame',f.toLocaleString(),1],['Symbol slot in frame',Math.floor(within)+' / '+mm.slots.toFixed(1),1],['Carrying', k<mm.sub?`channel ${k+1}, bit ${Math.floor((within%40)*4/5)}`:'sync fill symbols'],['M6203A pass',Math.floor(t/LOOP.T).toLocaleString(),1]]);
  };
  SIM.on('time', draw);
}
function viewBlock(m){
  const live = k => ()=> D.da===k;
  const B = {
    src:{x:20,y:180,w:150,h:80,t:'RME source',s:['56/64 ch','48k / 96k frame'],d:'From Notes.txt: “Source/analyzer was RME.”'},
    av:{x:230,y:20,w:220,h:90,t:'AV6201A',s:['GB4571 clamp, LMH1981 sync','video EQ, 8 drivers'],d:'Analog video DA. A clamp keyed by video sync and a video-bandwidth path (bandwidth not in the archive).',live:live('av6201a')},
    d6:{x:230,y:130,w:220,h:90,t:'D6201A',s:['CS8416 AES receiver','FPGA reclock, 8 outputs'],d:'AES reclocking DA: decodes AES3, so a non-AES stream gives no output.',live:live('d6201a')},
    m6:{x:230,y:240,w:220,h:90,t:'M6203A',s:['GS2974A → GS2975A → GS2978','AT90CAN128 V101 firmware'],d:'SDI reclocking DA. Firmware mutes the outputs whenever the reclocker is not locked (M6203A.c).',live:live('m6203a')},
    md:{x:230,y:350,w:220,h:90,t:'MADI DA (idea)',s:['M31285 MADI-capable reclocker','8 outputs'],d:'What RD57 needed. The part appears, unfitted, on Demux4 Issue 2 (U20).',live:live('madi')},
    rear:{x:510,y:180,w:150,h:80,t:'T6301 rear',s:['IN1 + OUT1–8'],d:'All three cards use the 10-BNC T6301 with the same 1×8 pinout (t6301.js).'},
    an:{x:700,y:180,w:150,h:80,t:'RME analyser',s:['sync / errors'],d:'Pass = analyser syncs with no errors.'},
    i64:{x:510,y:330,w:220,h:90,t:'i64 module (32ME-MADI)',s:['X602 pins 3–4: active loop-through','4 ns jitter (250 MHz clock)'],d:'ClockDescription.txt: a MADI RX→TX loop on the DirectOut module the 32ME used. One output, and the received subcode must be error-free.'},
  };
  blockView(m,B,[['src','av',''],['src','d6',''],['src','m6',''],['src','md',''],['av','rear',''],['d6','rear',''],['m6','rear',''],['md','rear',''],['rear','an',''],['src','i64','alt.']],{start:'m6',h:460,w:870,side:'<p>The source feeds one card at a time; every card in the test shares the T6301 rear and its pinout.</p>'});
}
const SHEETS = [
  { name:'1 · M6203A lock and mute (AT90CAN128)', note:'Port bits from M6203.h (v101). lock60_mask is BIT4 although its comment says “PA2”.', svg:()=>
    chip(330,70,220,'MCU AT90CAN128 (M6203A)',[['PA4','LOCK (GS2975A)'],['PA3..1','SS rate bits'],['PD7','SD/HD'],['PE7','RC_BYP']],[['PA0','BYPASS (never ON)'],['PA6','DDO_MUTE'],['PA7','DATA/CLOCK'],['PD4','SDI_OUTPUTS EN'],['PB0..4','LOCK/1G5/3G0/270/NO LOCK LEDs']],'V101 firmware, port map') +
    chip(200,330,160,'GS2975A',[['IN','from GS2974A EQ']],[['LOCK','→ PA4'],['SS0-2','→ PA1-3']],'reclocker') + chip(530,330,150,'GS2978 ×n',[['IN','reclocked data'],['DDO_MUTE','← PA6']],[['OUT','T6301 BNC3–10']],'cable drivers') },
  { name:'2 · Demux4 Issue 2 MADI nets', note:'From demux4_parts_plus_madi.xls (FPGA PINS sheet) and DEMUX-4-ISS2-ALL-PARTS.xls. U20 is fitted DNI.', svg:()=>
    chip(330,80,220,'U1 XC6SLX45T',[['C20','MADI_IN_FPGA_P'],['C22','MADI_IN_FPGA_N']],[['C17','MADI_OUT_FPGA_P'],['A17','MADI_OUT_FPGA_N'],['B16','MADI_OUT_GTP_P'],['A16','MADI_OUT_GTP_N']],'bank 1 / bank 0 at 2.5 V; GTP bank 123') +
    chip(560,300,150,'U20 M31285 (DNI)',[['31/32','MADI_OUT_FPGA'],['2/3','MADI_OUT_GTP']],[['OUT','MADI BNC']],'3G/HD/SD/MADI reclocker + driver') + chip(170,300,150,'U2 LMH0394',[['IN','SDI_IN_BNC_1']],[['10/11','MADI_IN_FPGA']],'equaliser') },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'M6203A V101 source and the Demux4 Issue 2 parts lists', 'RD57 has no drawings of its own. These sheets redraw the two circuits that decide the answer: why the SDI DA mutes, and where WBS later put a MADI-capable reclocker.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('M6203A V101 main loop (v100w.c) — running step highlighted', `<div id="fl"></div>`)}${card('Lock state machine (M6203A.c)', `<div id="sm"></div>`)}</div>${card('Why each card fails', `<div id="why"></div>`)}`;
  const draw=()=>{ const ph=(SIM.t%LOOP.T); let acc=0, cur=0; const st=[['READ_GS2975_STATUS()',LOOP.read],['PROCESS_SDI_LOCK_STATUS_UPDATE() — 101 reads of PA4',LOOP.update],['PROCESS_SDI_LOCK_STATUS() — LEDs, mute, drivers',LOOP.status],['wait(1000) — WDR() loop',LOOP.wait],['CAN_FUNCTIONS() — DashBoard',LOOP.can]];
    st.forEach((s,i)=>{ if (ph>=acc) cur=i; acc+=s[1]; });
    m.querySelector('#fl').innerHTML = `<svg viewBox="0 0 520 ${st.length*40+10}" style="width:100%">${st.map((s,i)=>`<rect x="6" y="${6+i*40}" width="508" height="30" rx="6" fill="${i===cur?'color-mix(in srgb,var(--accent) 30%,var(--panel2))':'var(--panel2)'}" stroke="var(--line)"/><text x="16" y="${26+i*40}" font-size="12" fill="var(--ink)">${s[0]}</text><text x="505" y="${26+i*40}" text-anchor="end" font-size="11" fill="var(--ink2)">${SIM.fmtDur(s[1])}</text>`).join('')}</svg><p class="small muted">Durations from an 8 MHz clock and estimated cycle counts (${inf}).</p>`;
    const locked = D.da!=='m6203a'?null:false;
    m.querySelector('#sm').innerHTML = `<svg viewBox="0 0 520 170" style="width:100%"><rect x="20" y="50" width="180" height="60" rx="10" fill="${locked===false?'color-mix(in srgb,var(--bad) 25%,var(--panel2))':'var(--panel2)'}" stroke="var(--line)"/><text x="110" y="76" text-anchor="middle" font-size="13" fill="var(--ink)">lock60 = 0x00</text><text x="110" y="96" text-anchor="middle" font-size="11" fill="var(--ink2)">mute · drivers off</text>
      <rect x="320" y="50" width="180" height="60" rx="10" fill="var(--panel2)" stroke="var(--line)"/><text x="410" y="76" text-anchor="middle" font-size="13" fill="var(--ink)">lock60 = 0x10</text><text x="410" y="96" text-anchor="middle" font-size="11" fill="var(--ink2)">outputs on</text>
      <defs><marker id="ar57b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs><path d="M200,65 L320,65" stroke="var(--ink2)" marker-end="url(#ar57b)"/><text x="260" y="58" text-anchor="middle" font-size="11" fill="var(--ink2)">≥ 95 of 101 high</text>
      <path d="M320,98 L200,98" stroke="var(--ink2)"/><text x="260" y="118" text-anchor="middle" font-size="11" fill="var(--ink2)">≥ 5 of 101 low</text>
      <text x="20" y="150" font-size="11" fill="var(--ink2)">With MADI on the input the counter never reaches 95: the card stays on the left.</text></svg>`;
    m.querySelector('#why').innerHTML = tbl(['Card','First stage that rejects MADI','Evidence'],[
      ['AV6201A','GB4571 clamp with no video sync; video bandwidth','av6201a.js (clamp jumper, LMH1981). Bandwidth: not in the archive '+inf],
      ['D6201A','CS8416 AES3 receiver','d6201a.js; MADI is not AES3'],
      ['M6203A','GS2975A lock → firmware mute','M6203A.c PROCESS_SDI_LOCK_STATUS; M6203.h'],
      ['MADI DA','— passes —','M31285 named on Demux4 Issue 2'],
    ]);
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  m.innerHTML = card('What RD57 found, and what became of it', `<ol>
    <li><b>The study is one note.</b> Notes.txt (198 bytes, 25 Oct 2012|45): every WBS DA type failed with an RME source and analyser. The register entry (owner “Eugene / Wayne / Engineering”) never left status “?”, and no MADI DA exists in the archive.</li>
    <li><b>The SDI DA fails in firmware, not only in silicon.</b> <span class="mono">PROCESS_SDI_LOCK_STATUS()</span> in M6203A.c drives <span class="mono">DDO_MUTE_ENABLED</span> and <span class="mono">SDI_OUTPUTS_DISABLED</span> whenever <span class="mono">lock60 == 0</span>. Even if the GS2975A could pass 125 Mbaud unretimed, the card would still switch its drivers off.</li>
    <li><b>Bypass was never used.</b> <span class="mono">BYPASS_MODE_ON</span> is defined in M6203.h but no version (Prototype, v100, v101, C030000) ever calls it; every branch writes <span class="mono">BYPASS_MODE_OFF</span>. A DashBoard “bypass reclocker” option, the usual way to pass non-SDI data, was not available.</li>
    <li><b>Lock-filter comment and code disagree.</b> The header of <span class="mono">PROCESS_SDI_LOCK_STATUS_UPDATE</span> says lock is lost after “10 … out of 100”; the code sets <span class="mono">lock60_nolock_limit = 5</span>, and the loop <span class="mono">for (i=0; i&lt;=lock60_loop; i++)</span> takes 101 samples. <span class="mono">lock60_mask</span> is <span class="mono">BIT4</span> although its comment says “PA2”.</li>
    <li><b>The MADI-capable part appeared a year later, on another board.</b> Demux4 Issue 2 (history.xls: backup9 “madi parts added on sheet 9”, backup10 dated 2013-07-15) carries U20 = M31285 “3G/HD/SD/MADI Reclocker with Integrated Cable Driver”, fitted DNI, with <span class="mono">MADI_IN_FPGA</span>, <span class="mono">MADI_OUT_FPGA</span> and <span class="mono">MADI_OUT_GTP</span> nets. That is the RD57 circuit, never populated. RD69 (Vid Buddy / MADI Buddy) planned to use it.</li>
    <li><b>The i64 module already had a one-output “MADI DA”.</b> ClockDescription.txt (32ME-MADI): a jumper on X602 pins 3–4 “sets the active loop-through”, with the caveat that the received subcode must be error-free. The same note gives 4 ns of clock/data jitter from a 250 MHz internal clock, which is half a symbol at 125 Mbaud (${inf}: the line rate is from AES10).</li>
    <li><b>Where MADI went.</b> MADI became an input on the 32ME monitor (RD22, ${plink('32me','32ME')}) built on the AMS8E-1 board (${plink('ams8e','AMS8E')}); see also ${plink('t6301','T6301')} for the rear module every tested card used.</li>
  </ol>`) + card('Assumptions', `<ul class="small"><li>MADI line figures (125 Mbaud, 4B5B, NRZI, 40 symbols per subframe) are from AES10, not the archive (${inf}).</li><li>That the GS2975A lock output stays low at 125 Mbaud is inferred from the three SR_ rate codes the firmware knows (${inf}).</li><li>AV6201A bandwidth, clamp effect and cable loss at 62.5 MHz are model assumptions (${inf}).</li><li>Main-loop step durations use an 8 MHz clock (CAN.c comment) and estimated cycle counts (${inf}).</li></ul>`) +
  card('Sources', `<ul class="small mono"><li>XXX - ENGINEERING - 2016 RD FILES/RD57-MADI_DistributionAmplifier/Notes.txt · R&amp;D_List.xls</li><li>#OPENGEAR #SERIES/M6203 - #Master #OPENGEAR/M6203 - #Engineering/M6203A/Software/atmel/v101/v100w.c, M6203A.c, M6203.h</li><li>32ME-MADI/ClockDescription.txt</li><li>SA-DEMUX4 - #Master/Demux4 - #RD #NOTES #RD31 #ARCHIVE /PCB/Demux4-BNC version/history.xls, backup10/DEMUX-4-ISS2-ALL-PARTS.xls; parts/demux4_parts_plus_madi.xls</li><li>siumulation-plugins/t6301.js, d6201a.js, av6201a.js (card facts)</li></ul>`);
}

SIM.register({
  id:'rd57-madi-distributionamplifier', name:'RD57 MADI Distribution Amplifier · bench test of WBS DAs with MADI ('+Y(2012)+')', duration:1,
  product:'RD57 MADI DA', year:2012, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD57-MADI_DistributionAmplifier',
  summary:'In October 2012 a customer asked whether a Ward-Beck DA could distribute MADI; the analog-video, AES and SDI DAs were all tried and none passed. This model re-runs that bench test, shows why each card rejects a 125 Mbaud MADI stream (down to the M6203A firmware that mutes its outputs), and what a real MADI DA needs.',
  highlights:['RME source → DA → analyser bench with three real WBS cards','M6203A V101 lock filter and mute traced line by line','MADI frames, subframes and NRZI symbols in slow motion','T6301 rear drawn to scale, outputs clickable','MADI reclocker later drawn on Demux4 Issue 2 (fitted DNI)'],
  depth:'Hardware model',
  stepUnits:[{label:'1 symbol (8 ns)',period:()=>TB},{label:'1 subframe (320 ns)',period:()=>40*TB},{label:'1 MADI frame',period:()=>1/FS},{label:'1 M6203A loop pass',period:()=>LOOP.T},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.01,'10 ms'],[0.002,'2 ms (loop passes)'],[1e-4,'100 µs'],[1/FS,'1 frame'],[2e-6,'2 µs (subframes)'],[2e-7,'200 ns (symbols)']],
  defaultZoom:4,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: repeating the test', render:viewTutorial},
    {id:'second', label:'One second of MADI', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
