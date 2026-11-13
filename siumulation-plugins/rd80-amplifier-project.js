/* =====================================================================
   RD80 — Amplifier Project ("Universal Amp" → "QubeAmp", Ward-Beck R&D register, priority B)
   Plugin for the WBS Device Simulator (../siumulation.html)

   RD80 (2014|47–2015|48, Ali with Adam) designed and measured a small powered-speaker amplifier
   board: AES3 in → CS8416 → PCM5100A DAC, or an analog jack, → 74HC4053 / NE5532 mixer →
   TI TPA3124D2 class-D amp, single-ended (SE, stereo) or bridge-tied (BTL, one speaker).
   It became the QubeAmp board in the QUBE speaker and the AMS2 monitor (see qubeamp.js, ams2.js).
   The plugin models the bench investigation with the measured numbers:
   - Final Sweeps/01_D2A … 11_PowerAmp_SE_AnalogIn_Mixer.pdf (Audio Precision sweeps, 5–14 Nov 2014|47,
     project title "ali.at27"); Raw Material/With10dbLosspad, SE_NoPad, BTL_NoPad (27 Oct – 10 Nov 2014)
   - SA-QUBEAMP-MAIN-Assembly.pdf (QubeAmp ISS.2 assembly, 16 Nov 2014) → assets/rd80-amplifier-project-assembly.png
   - PCB/backup3…/Universal Amp.pdf (UNI-AMP-ISS1, Jul 2014), QubeAmp-ISS1.pdf (31 Jul 2014),
     QubeAmp - #ISS3/QubeAmp-ISS2.pdf (UNI-AMP-ISS2, 21 Sep 2014), QubeAmp - #ISS3/parts_cube22.xls (BTL / SE BOMs, prices)
   - currentOn3v3.txt (3.3 V rail per IC), Power Supply/power supply.xls (16 × 24 V supplies, Ali, Jul–Aug 2014)
   - Parts/tpa3124d2.pdf, pcm5100a.pdf, AK4430ET.pdf; Speaker/*.pdf (Tectonic BMR, 3.5″/5″ cones); Fostex/6301N_EN72.pdf
   - Acoustic Snapshots/*.PNG (pink-noise spectrograms, Jan 2015) → assets/rd80-amplifier-project-snap-*.jpg
   - Book1.xls (empty level/THD/phase template, Sep 2014), Toggle/, LED/, JACK/, Binding Post/ comparison sheets
   Values read off the sweep plots are to the plot resolution; anything else is marked "inferred".
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

/* ================= measured constants (Final Sweeps, read from the AP plots) ================= */
const ASSET = 'siumulation-plugins/assets/';
const FS = 48000, FPWM = 250e3, VCC = 24;
const M = {
  dacFS: 8.6,        // 01_D2A: 0 dBFS → +8.56 dBu (R) / +8.67 dBu (L)
  mixSEd: -0.6,      // 02: 0 dBFS → +7.96 dBu
  mixBTLd: 5.28,     // 04: 0 dBFS → +13.84 dBu (differential)
  mixSEa: -0.06,     // 03: +4 dBu → +3.94 dBu
  mixBTLa: 5.8,      // 05: +4 dBu → +9.80 dBu
  ampG: 19.55,        // 06/07/08/10/11: power stage +19.5…+19.7 dB (GAIN1:0 = 00, 20 dB nominal)
  ampFloor: -78,     // 09: output with −120 dBu in ≈ −78 dBu (TPA3124D2 datasheet: 125 µV, −78 dBV)
  dacFloor: -97,     // fitted to the 01 THD+N vs amplitude curve (inferred fit)
  seClip: 8.0,       // Vrms per SE output at 1 % THD+N: datasheet 8 W into 8 Ω at 24 V
};
const GAINS = {'00':[20,60],'01':[26,30],'10':[32,15],'11':[36,9]};   // tpa3124d2.pdf: GAIN1 GAIN0 → dB, input kΩ
const dBu2V = d => 0.7746*Math.pow(10,d/20), V2dBu = v => 20*Math.log10(Math.max(v,1e-12)/0.7746);
const SWEEPS = [
  ['01','01_D2A.pdf','5 Nov','D/A out (PCM5100A)','0 dBFS → +8.56 / +8.67 dBu; −20 dBFS → −11.45 dBu','0.0045 % at 1 kHz, 0.015 % near 6 kHz; −20 dBFS 0.011 %','sep. −89.5 dB (LF) → −79 dB at 20 kHz; L–R phase < 0.3°'],
  ['02','02_Miixer_SE_DigitalIn.pdf','12 Nov','Mixer, SE, digital in','0 dBFS → +7.96 dBu (−0.12 dB at 20 kHz)','—','separation sheet titled “Separatio”, “Rigth”'],
  ['03','03_Mixer_SE_AnalogIn.pdf','12 Nov','Mixer, SE, analog in','+4 dBu → +3.94 dBu (flat ±0.01 dB)','—','−10 dBV sweep too'],
  ['04','04_Mixer_BTL_DigitalIn.pdf','10 Nov','Mixer, BTL, digital in','0 dBFS → +13.84 dBu (Mix = R, L, MonoMix)','—','+5.9 dB over SE: the U4B inverted leg'],
  ['05','05_Mixer_BTL_AnalogIn.pdf','11 Nov','Mixer, BTL, analog in','+4 dBu → +9.80 dBu','—',''],
  ['06','06_PowerAmp_SE_DigitalIn.pdf','13 Nov','Power amp, SE, digital in','−9 dBFS → +18.65 dBu; +12.0 at 20 Hz; −2.4 dB at 20 kHz','≈0.5 % at 20 Hz, 0.02 % at 150 Hz, 0.17 % near 6.5 kHz','470 µF output capacitor high-pass'],
  ['07','07_PowerAmp_SE_AnalogIn.pdf','13 Nov','Power amp, SE, analog in','−1 dBu → +18.6 dBu','—',''],
  ['08','08_PowerAmp_BTL_DigitalIn.pdf','13 Nov','Power amp, BTL, digital in','−10 dBFS → +23.3 dBu; −2.1 dB at 20 kHz; flat to 20 Hz','≈0.05 % mid, 0.2 % near 6 kHz','11.3 Vrms = 16 W into 8 Ω'],
  ['09','09_PowerAmp_BTL_AnalogIn.pdf','13 Nov','Power amp, BTL, analog in (no mixer)','+4 dBu → +23.4 dBu; −2 dB at 20 kHz','0.01 % at 100 Hz, 0.15 % near 6 kHz; floor −78 dBu','phase +65° at 20 kHz; only 7 pages, no separation'],
  ['10','10_PowerAmp_BTL_AnalogIn_Mixer.pdf','14 Nov','Power amp, BTL, analog via mixer','−2 dBu → +23.3 dBu','—',''],
  ['11','11_PowerAmp_SE_AnalogIn_Mixer.pdf','14 Nov','Power amp, SE, analog via mixer','0 dBu → +19.5 dBu','—',''],
];
const DRIVERS = {
  TC2X4FC:{n:'Tectonic TC2X4FC00-08 (BMR, prelim. Jul 2014)', s:81.8, p:15, fs:95, z:'Zmin 10 Ω, Re 8.1 Ω', f:'Speaker/TC2X4FC00-08 Preliminary Spec Sheet'},
  TC2X4FB:{n:'Tectonic TC2X4FB00-08 (BMR)', s:79.1, p:10, fs:85, z:'Zmin 8 Ω, Re 6.2 Ω', f:'Speaker/TC2X4FB00-08 Spec Sheet Rev 1'},
  TC5FB:{n:'Tectonic TC5FB00-08 (1.5″ BMR)', s:78.6, p:5, fs:261, z:'Zmin 7.5 Ω', f:'Speaker/TC5FB00-08 Spec Sheet Rev 2'},
  REN5F:{n:'5″ cone REN5F, 8 Ω', s:91, p:12, fs:108, z:'8 Ω rated', f:'Speaker/REN5F.pdf'},
  RT0187:{n:'3.5″ cone RT0187, 8 Ω', s:88, p:10, fs:135, z:'8 Ω rated', f:'Speaker/RT0187.pdf'},
};
const FOSTEX = { sens:85, rated:20, max:98, band:'70 Hz–15 kHz', thd:'0.05 % (1 kHz, 1 W)' };   // Fostex/6301N_EN72.pdf spec table
const PSU = [ // Power Supply/power supply.xls (Ali, 6 Aug 2014): part, maker, A, ripple mV, eff, price, source
  ['RPS-60-24','Meanwell',2.5,240,0.85,19.30,'TRC'],['EPS-65-24','Meanwell',2.71,240,null,14.90,'TRC'],['MTA040024A','Iccnexergy',1.7,240,0.87,32.41,'Newark'],
  ['VCT60US24','XP',2.5,240,0.88,36.45,'Digikey'],['ECS60US24','XP',2.5,240,null,49.05,'Newark'],['ZPSA6024','TDK',2.5,240,null,33.88,'Newark'],['ZPS60-24','TDK',2.5,240,0.86,47.43,'Newark'],
  ['MB60S24K','SL Power',2.5,240,0.88,45.92,'Arrow'],['GB60S24K','SL Power',2.5,240,0.88,42.34,'Arrow'],['VMS-60-24','CUI',2.5,240,0.89,48.37,'Digikey'],['QPS-60-24','Qualtek',2.5,120,0.87,42.08,'Digikey'],
  ['MVAD065-24','Murata',2.71,240,0.89,41.27,'Digikey'],['MDS-065APS24 BA','Delta',2.71,240,null,37.32,'Digikey'],['MBC60-1024G','Power One',2.5,240,null,46.41,'Digikey'],['AES60O-24S','Arch',2.5,250,0.86,null,'—'],['SZA60-24A','Arch',2.5,250,0.88,null,'—'],
];
const RAIL33 = [['U1 SN65HVD30',76],['U2 CS8416',32.2],['U3 PCM5100A',45],['U10 74HC4053',0.1]];   // currentOn3v3.txt (U10 "small")
const FILTERS = { iss2:{n:'ISS.2 assembly drawing',L:47e-6,C:0.22e-6}, btl:{n:'parts_cube22 BTL BOM (QUBE)',L:22e-6,C:0.68e-6}, se:{n:'parts_cube22 SE BOM (AMS2)',L:33e-6,C:0.22e-6} };
const SNAPS = [['qube-orig','Qube, original driver'],['qube-trim','Qube, trimmed driver'],['ams2','AMS2'],['ams4','AMS4'],['ams8','AMS8'],['dayton','Dayton driver'],['fostex','Fostex 6301'],['psb','PSB speaker']];

/* ================= state ================= */
const D0 = { src:'aes', dbfs:-10, jack:-2, topo:'btl', probe:'amp', mix:'R', g1:0, g0:0, load:8, freq:1000, mode:'tone', driver:'TC2X4FC', psu:0, music:false, filt:'iss2', pick:'U12', snap:'qube-orig' };
const D = Object.assign({}, D0);
function reset(){ Object.assign(D, D0); LOG.items = []; SIM.refresh(); }
const gainCode = () => `${D.g1}${D.g0}`;
const ampNom = () => GAINS[gainCode()][0];

/* ================= the signal chain ================= */
/* stimulus at time t: AP-style tone, frequency sweep (31 log steps) or level sweep (21 steps of 5 dB) */
function stim(t){
  if (D.mode==='sweep'){ const k = Math.min(30, Math.floor(t*31)); return { f: 20*Math.pow(1000, k/30), off:0, k, t0:k/31 }; }
  if (D.mode==='level'){ const k = Math.min(20, Math.floor(t*21)); return { f:D.freq, off:-100+k*5, k, t0:k/21, abs:true }; }
  return { f:D.freq, off:0, k:0, t0:0 };
}
function hfRoll(f, a20){ return -a20*Math.pow(f/20000,2); }
function chain(f, off, abs){
  f = f || D.freq; off = off || 0;
  const st = [];
  let inLvl;
  if (D.src==='aes'){ const dbfs = abs ? off : D.dbfs + off; inLvl = dbfs;
    const d = dbfs + M.dacFS + hfRoll(f,0.15);
    st.push({k:'d2a', n:'P1 → T1 PE-65612 → U2 CS8416 → U3 PCM5100A', dBu:d, note:`${fmt(dbfs,1)} dBFS × 2.1 Vrms FS (01_D2A: 0 dBFS = +8.6 dBu)`});
  } else { const j = abs ? off+10 : D.jack + off; inLvl = j;
    st.push({k:'d2a', n:'P8 jack (analog in)', dBu:j, note:'DAC not in the path'}); }
  const mg = D.src==='aes' ? (D.topo==='btl'?M.mixBTLd:M.mixSEd) : (D.topo==='btl'?M.mixBTLa:M.mixSEa);
  const mx = st[0].dBu + mg + hfRoll(f,0.1);
  st.push({k:'mixer', n:`U10 74HC4053 → U8/U4 NE5532${D.topo==='btl'?' + U4B inverter (LEFT_N)':''}`, dBu:mx, note:`${mg>=0?'+':''}${fmt(mg,2)} dB measured (${D.topo==='btl'?'differential, both legs':'single-ended'}${D.topo==='btl'?' · Mix = '+({L:'Left',R:'Right',mono:'MonoMix'})[D.mix]:''})`});
  const [gn, zin] = GAINS[gainCode()];
  const ag = M.ampG + (gn-20);
  const fin = 1/(2*Math.PI*1e-6*zin*1e3);
  let lf = 20*Math.log10(f/Math.hypot(f,fin));
  const fco = 1/(2*Math.PI*470e-6*D.load);
  if (D.topo==='se') lf += 20*Math.log10(f/Math.hypot(f,fco));
  let a = mx + ag + lf + hfRoll(f, D.topo==='se'?2.4:2.1);
  const vclip = D.topo==='se' ? M.seClip : 2*M.seClip;   // BTL = two SE outputs in antiphase (doubling inferred)
  let v = dBu2V(a), over = 20*Math.log10(v/vclip), clip = over > 0;
  if (clip) v = vclip*Math.pow(10, Math.min(over,0.97)/20*0.25);   // hard limiting above the 1 % point
  st.push({k:'amp', n:`U12 TPA3124D2, GAIN1:0 = ${gainCode()} (${gn} dB nominal) → L1/L2 + C60/C61${D.topo==='se'?' → 470 µF':''}`, dBu:V2dBu(v), note:`${fmt(ag,1)} dB${D.topo==='se'?`; output-cap HPF ${fmt(fco,0)} Hz into ${D.load} Ω`:'; bridged, no output capacitor'}${clip?' — CLIPPING':''}`});
  const P = v*v/D.load;
  /* THD+N: distortion of each stage plus noise referred to the probe point */
  const dShape = f<=6500 ? (1+Math.pow(f/3000,2)) : (1+Math.pow(6500/3000,2))*Math.pow(6500/f,2);
  const thd = (k)=>{
    const sig = st.find(s=>s.k===k).dBu;
    let dist = 0.0045*(1+Math.pow(Math.min(f,6000)/4000,2))/100, noise = M.dacFloor;
    if (D.src!=='aes'){ dist = 0.002/100; noise = -100; }
    if (k!=='d2a'){ noise += mg; }
    if (k==='amp'){ dist = Math.hypot(dist, 0.03/100*dShape); noise = 10*Math.log10(Math.pow(10,(noise+ag)/10)+Math.pow(10,M.ampFloor/10));
      if (D.topo==='se' && f<60) dist = Math.hypot(dist, 0.005*Math.pow(60/f,2)/9);       // SE bass distortion seen in 06 (inferred shape)
      if (clip) dist = Math.max(dist, 0.01*Math.pow(10, over/0.97)); }
    const n = Math.pow(10,(noise-sig)/20);
    return Math.min(0.3, Math.hypot(dist, n))*100;
  };
  return { st, a:V2dBu(v), v, P, clip, over, vclip, thd, fco, inLvl, ag, mg };
}
function probeStage(c){ return c.st.find(s=>s.k===D.probe); }
function spl(c){ const dr = DRIVERS[D.driver]; const P = c.P; return { db: P>0? dr.s + 10*Math.log10(P) : -99, over: P > dr.p, dr }; }
function budget(c){
  const nOut = D.topo==='se' ? 2 : 1;
  const pAud = c.P*nOut*(D.music?1/8:1);                     // music: average ≈ peak/8 (crest factor, inferred)
  const p33 = RAIL33.reduce((a,r)=>a+r[1],0)/1000*3.3/0.85;    // R-78E3.3 efficiency 85 % (inferred)
  const pOp = 3*0.008*VCC;                                   // three NE5532 ≈ 8 mA each from VCC_P (inferred)
  const pIdle = 0.6;                                         // TPA3124D2 idle (inferred)
  const pin = pAud/0.88 + p33 + pOp + pIdle;                 // class-D efficiency 88 % (inferred)
  const I = pin/VCC, ps = PSU[D.psu];
  return { pAud, p33, pOp, pin, I, ps, ok: I <= ps[2], head: ps[2]-I };
}

/* ================= actions (each logs the circuit path it follows) ================= */
const A = {
  src(s){ act(s==='aes'?'Source → AES (P1)':'Source → analog jack (P8)', tr=>{ D.src=s;
    tr(s==='aes'?'P1 AES_RX → T1 PE-65612 pulse transformer → U2 CS8416 (hardware mode) → I²S → U3 PCM5100A, 2.1 Vrms ground-centred':'P8 JACK_L/JACK_R → 74HC4053 → NE5532; the CS8416/PCM5100A path is unused');
    tr(s==='aes'?'Reference: Fostex 6301N has the same pair (AES/EBU XLR + ¼″ phone), and the phone input takes priority':'Fostex 6301N: “Inputs connected to the analog input terminal are prioritized”; its LED lights orange'); }); },
  topo(t){ act(t==='btl'?'Bridge-tied load (BTL)':'Single-ended (SE)', tr=>{ D.topo=t;
    tr(t==='btl'?'R20 30R fitted: R_IN = LEFT_N from U4B, so LOUT and ROUT swing in antiphase across one speaker (P11)':'R21 fitted: R_IN = RIGHT; two speakers, each through a 470 µF output capacitor');
    const c=chain(); tr(`Power stage now ${fmt(c.a,2)} dBu = ${fmt(c.v,2)} Vrms → ${fmt(c.P,2)} W into ${D.load} Ω${c.clip?' (clipping)':''}`);
    tr(t==='btl'?'Sweeps 04/05/08/09/10 are this case':'Sweeps 02/03/06/07/11 are this case'); }); },
  probe(p){ act('AP probe → '+({d2a:'D/A output',mixer:'mixer output',amp:'power-amp output'})[p], tr=>{ D.probe=p; const c=chain(), s=probeStage(c);
    tr(`${s.n}: ${fmt(s.dBu,2)} dBu, THD+N ${fmt(c.thd(p),4)} %`);
    tr('Final Sweeps are named by this point: 01 D2A · 02–05 Mixer · 06–11 PowerAmp'); }); },
  mix(){ act('74HC4053 mix selection', tr=>{ D.mix = D.mix==='R'?'L':D.mix==='L'?'mono':'R';
    tr(`A/B/C_SEL → ${({L:'Left Channel',R:'Right Channel',mono:'MonoMix'})[D.mix]} (the three “Mix Selection” cases in sweeps 04, 05, 08, 10)`); }); },
  gain(bit){ act(`${bit==='g0'?'H4 (GAIN0)':'H5 (GAIN1)'} ${D[bit]?'removed':'fitted'}`, tr=>{ D[bit] = D[bit]?0:1;
    const [g,z]=GAINS[gainCode()]; tr(`TPA3124D2 pins 17/18 GAIN1:GAIN0 = ${gainCode()} → ${g} dB, input impedance ${z} kΩ (tpa3124d2.pdf gain table)`);
    tr(`C48/C49 1 µF into ${z} kΩ → input high-pass ${fmt(1/(2*Math.PI*1e-6*z*1e3),1)} Hz`);
    if (gainCode()!=='00') tr('The Nov 2014 sweeps all show ≈19.6 dB in the power stage, i.e. code 00 (20 dB); the 2015 AMS2 test of the production board measured 36 dB (see qubeamp.js)'); }); },
  level(v){ act('Level', tr=>{ if (D.src==='aes'){ D.dbfs = clamp(+v,-100,0); tr(`AP generator → ${D.dbfs} dBFS on AES3`); } else { D.jack = clamp(+v,-40,12); tr(`AP generator → ${D.jack} dBu analog`); } const c=chain(); tr(`power stage ${fmt(c.a,2)} dBu, ${fmt(c.P,2)} W${c.clip?' — over the 1 % point by '+fmt(c.over,1)+' dB':''}`); }); },
  freq(f){ act('Tone '+f+' Hz', tr=>{ D.freq=+f; const c=chain(); tr(`${f} Hz → ${fmt(c.a,2)} dBu at the power stage${D.topo==='se'?`; the 470 µF / ${D.load} Ω high-pass sits at ${fmt(c.fco,0)} Hz`:''}`); }); },
  mode(m){ act('Stimulus → '+m, tr=>{ D.mode=m; tr(m==='sweep'?'31 log-spaced frequencies across the second, as the AP “Output Amplitude vs. Input Frequency” sweep':m==='level'?'21 levels, 5 dB apart, as the “Output Amplitude / THD+N vs. Input Amplitude” sweep':'steady tone'); }); },
  load(r){ act('Load '+r+' Ω', tr=>{ D.load=+r; const c=chain(); tr(`${fmt(c.P,2)} W into ${r} Ω`); }); },
  driver(k){ act('Driver → '+k, tr=>{ D.driver=k; const c=chain(), s=spl(c); tr(`${s.dr.n}: ${s.dr.s} dB/1 W/1 m, ${s.dr.p} W rated, fs ${s.dr.fs} Hz (${s.dr.f})`); tr(`${fmt(c.P,2)} W → ${fmt(s.db,1)} dB SPL at 1 m${s.over?' — over the rated power':''}; Fostex 6301N reference: max ${FOSTEX.max} dB`); }); },
  psu(i){ act('Supply → '+PSU[+i][0], tr=>{ D.psu=+i; const b=budget(chain()); tr(`${b.ps[0]} (${b.ps[1]}): 24 V ${b.ps[2]} A, ripple ${b.ps[3]} mV, ${b.ps[5]!=null?'$'+b.ps[5].toFixed(2)+' ('+b.ps[6]+')':'no price'}`); tr(`Board draws ≈${fmt(b.I,2)} A at 24 V (${fmt(b.pin,1)} W in) → ${b.ok?'OK, '+fmt(b.head,2)+' A spare':'OVERLOADED'}`); }); },
  music(){ act(D.music?'Budget for a steady tone':'Budget for music (crest factor)', tr=>{ D.music=!D.music; tr(D.music?'Average power ≈ peak / 8 (≈9 dB crest factor, '+'inferred'+')':'Continuous sine at the set level: the worst case the sweeps imply'); }); },
  pick(p){ D.pick=p; const h=HOT.find(x=>x[0]===p); if (h && h[5]) h[5](); else SIM.refresh(); },
  snap(k){ D.snap=k; SIM.refresh(); },
};

/* ================= the board: QubeAmp ISS.2 assembly drawing with live overlays ================= */
// [ref, x, y, r, text, onClick]  — positions on assets/rd80-amplifier-project-assembly.png (1365 × 711 px at 130 dpi)
const HOT = [
  ['P1',360,60,46,'P1 AES_RX (PAN300): AES3 input',()=>A.src('aes')],
  ['T1',380,235,50,'T1 PE-65612 “AESPULSE”: AES input isolation'],
  ['T2',295,515,50,'T2 PE-65612: second pulse transformer, driven by U1 (AES thru out, '+'inferred'+')'],
  ['U1',290,360,26,'U1 SN65HVD30 RS-485 transceiver: draws 76 mA from 3.3 V (currentOn3v3.txt), the biggest load on the rail'],
  ['U2',160,255,40,'U2 CS8416 AES3 receiver, hardware mode, I²S out (32.2 mA)'],
  ['U3',105,450,40,'U3 PCM5100A DAC: 2.1 Vrms, 100 dB DNR, −90 dB THD+N (pcm5100a.pdf); 45 mA. Click to probe the D/A output',()=>A.probe('d2a')],
  ['R99',110,585,22,'R99/R86 6K81 (with R87/R88 4K64) DAC divider on the ISS.2 drawing'],
  ['P8',610,40,46,'P8 PAN400: analog jack in',()=>A.src('analog')],
  ['U10',650,210,40,'U10 74HC4053: source / mix select. Click to step L → MonoMix → R',()=>A.mix()],
  ['U8',535,345,34,'U8 NE5532: inverting 20K/20K mixer stages. Click to probe the mixer output',()=>A.probe('mixer')],
  ['U4',620,410,34,'U4 NE5532: VCC/2 buffer and U4B inverter making LEFT_N for BTL',()=>A.probe('mixer')],
  ['U9',755,345,30,'U9 NE5532: DNI on the ISS.2 drawing (QUBE build)'],
  ['R20',735,470,32,'R19 / R20 30R: R20 feeds R_IN from LEFT_N (BTL). Click to toggle SE / BTL',()=>A.topo(D.topo==='btl'?'se':'btl')],
  ['H4',1055,235,26,'H4: GAIN0 link (pin 18) — click to fit/remove',()=>A.gain('g0')],
  ['H5',1165,235,26,'H5: GAIN1 link (pin 17) — click to fit/remove',()=>A.gain('g1')],
  ['U12',1110,450,44,'U12 TPA3124D2 15 W stereo class-D. Click to probe the power-amp output',()=>A.probe('amp')],
  ['L1',945,390,72,'L1 output inductor: 47 µH on the ISS.2 drawing (22 µH BTL / 33 µH SE in parts_cube22)'],
  ['L2',1265,390,72,'L2 output inductor (as L1)'],
  ['C60',955,285,30,'C60/C61 0.22 µF film output-filter capacitors (0.68 µF in the BTL BOM)'],
  ['C57',950,575,70,'C57/C58 470 µF / 35 V: VCC_P bulk for the H-bridges'],
  ['P11',1110,60,46,'P11: speaker out'],['P10',1120,630,46,'P10: L_IN / R_IN header (per qubeamp.js)'],
  ['P14',805,655,46,'P14 PAN256: VCC_P 24 V in — click for the supply budget',()=>{ D.pick='P14'; SIM.refresh(); }],
  ['U13',435,620,40,'U13 R-78E3.3-0.5: 24 V → 3.3 V switcher (0.5 A); measured load ≈153 mA'],
];
function boardSVG(){
  const c = chain(), pb = D.probe==='d2a'?'U3':D.probe==='mixer'?'U8':'U12';
  let s = `<svg viewBox="0 0 1365 711" style="width:100%;display:block;border-radius:8px" role="img" aria-label="QubeAmp ISS.2 assembly drawing">
    <rect width="1365" height="711" rx="12" fill="#e9eee6"/><image href="${ASSET}rd80-amplifier-project-assembly.png" width="1365" height="711"/>`;
  const heat = clamp(c.P/16,0,1);
  s += `<circle cx="1110" cy="450" r="${46+40*heat}" fill="rgba(240,110,30,${0.10+0.40*heat})"><title>U12 dissipation (illustrative)</title></circle>`;
  // signal-path tint
  const pathOn = D.src==='aes' ? ['P1','T1','U2','U3'] : ['P8'];
  HOT.forEach(([k,x,y,r,t])=>{ const sel = D.pick===k, live = pathOn.includes(k) || (k==='U10'||k==='U8'||k==='U12') || (k==='U4'&&D.topo==='btl') || (k==='R20'&&D.topo==='btl');
    s += `<g data-hot="${k}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${r}" fill="${live?'rgba(46,140,220,.14)':'rgba(0,0,0,0.001)'}" stroke="${sel?'#1f6fd1':live?'rgba(46,140,220,.6)':'rgba(0,0,0,0)'}" stroke-width="${sel?5:2.5}"/><title>${t}</title></g>`; });
  // links fitted
  [['g0',1055,235],['g1',1165,235]].forEach(([b,x,y])=>{ if (D[b]) s += `<rect x="${x-12}" y="${y-30}" width="24" height="60" rx="5" fill="#222" opacity=".85" pointer-events="none"/>`; });
  // AP probe
  const ph = HOT.find(h=>h[0]===pb);
  s += `<g pointer-events="none"><path d="M${ph[1]+ph[3]*0.7},${ph[2]-ph[3]*0.7} l70,-70" stroke="#d12f2f" stroke-width="5"/><circle cx="${ph[1]+ph[3]*0.7}" cy="${ph[2]-ph[3]*0.7}" r="9" fill="#d12f2f"/>
    <rect x="${ph[1]+ph[3]*0.7+60}" y="${ph[2]-ph[3]*0.7-112}" width="210" height="40" rx="6" fill="#d12f2f"/><text x="${ph[1]+ph[3]*0.7+70}" y="${ph[2]-ph[3]*0.7-85}" font-size="24" fill="#fff" font-family="monospace">AP ${fmt(probeStage(c).dBu,2)} dBu</text></g>`;
  s += `<rect x="20" y="660" width="${D.topo==='btl'?380:420}" height="40" rx="6" fill="${D.topo==='btl'?'#1f6fd1':'#7a4bc2'}" opacity=".9"/><text x="34" y="688" font-size="22" fill="#fff">${D.topo==='btl'?'BTL: R20 → R_IN = LEFT_N, one speaker':'SE: R21 + 470 µF caps, two speakers'}</text>`;
  if (c.clip) s += `<text x="1000" y="140" font-size="34" font-weight="700" fill="#d12f2f">CLIP +${fmt(c.over,1)} dB</text>`;
  return s + '</svg>';
}
function bindBoard(root){ root.querySelectorAll('[data-hot]').forEach(g=> g.onclick = ()=>A.pick(g.dataset.hot)); }

/* ================= panels and controls ================= */
function controlsHTML(){
  const lv = D.src==='aes' ? D.dbfs : D.jack;
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px">
    <button data-a="src" data-v="aes" class="${D.src==='aes'?'on':''}">AES in</button><button data-a="src" data-v="analog" class="${D.src==='analog'?'on':''}">analog in</button>
    <button data-a="topo" data-v="se" class="${D.topo==='se'?'on':''}">SE</button><button data-a="topo" data-v="btl" class="${D.topo==='btl'?'on':''}">BTL</button>
    <span class="small muted">probe</span>${['d2a','mixer','amp'].map(p=>`<button data-a="probe" data-v="${p}" class="${D.probe===p?'on':''}">${({d2a:'D/A',mixer:'mixer',amp:'power amp'})[p]}</button>`).join('')}
    <label class="small">${D.src==='aes'?'dBFS':'dBu'} <input type="range" data-r="lvl" min="${D.src==='aes'?-100:-40}" max="${D.src==='aes'?0:12}" value="${lv}" style="width:120px"> <span class="mono">${lv}</span></label>
    <label class="small">tone <select data-s="freq">${[20,50,100,1000,6000,10000,20000].map(f=>`<option ${f===D.freq?'selected':''}>${f}</option>`).join('')}</select> Hz</label>
    <label class="small">stimulus <select data-s="mode">${[['tone','tone'],['sweep','frequency sweep'],['level','level sweep']].map(([k,l])=>`<option value="${k}" ${k===D.mode?'selected':''}>${l}</option>`).join('')}</select></label>
    <label class="small">load <select data-s="load">${[4,6,8].map(r=>`<option ${r===D.load?'selected':''}>${r}</option>`).join('')}</select> Ω</label>
    <button data-a="mix">mix: ${({L:'L',R:'R',mono:'Mono'})[D.mix]}</button><button data-a="h4" class="${D.g0?'on':''}">H4</button><button data-a="h5" class="${D.g1?'on':''}">H5</button><button data-a="rst">defaults</button></div>`;
}
function bindControls(root){
  bindActs(root, { src:v=>A.src(v), topo:v=>A.topo(v), probe:v=>A.probe(v), mix:()=>A.mix(), h4:()=>A.gain('g0'), h5:()=>A.gain('g1'), rst:()=>reset() });
  root.querySelectorAll('[data-r="lvl"]').forEach(r=> r.onchange = e=>A.level(e.target.value));
  root.querySelectorAll('[data-s]').forEach(s=> s.onchange = e=>{ const k=s.dataset.s, v=e.target.value; if (k==='freq') A.freq(v); else if (k==='mode') A.mode(v); else if (k==='load') A.load(v); else if (k==='driver') A.driver(v); else if (k==='psu') A.psu(v); });
}
function apHTML(){
  const s = stim(SIM.t), c = chain(s.f, s.off, s.abs), p = probeStage(c);
  return kv([
    ['Generator', `${D.src==='aes'?(s.abs?s.off:D.dbfs+s.off)+' dBFS AES3':(s.abs?s.off+10:D.jack)+' dBu analog'} · ${fmt(s.f,0)} Hz${D.mode!=='tone'?' (step '+(s.k+1)+')':''}`],
    ['Probe', ({d2a:'D/A output (01)',mixer:'mixer output (02–05)',amp:'power-amp output (06–11)'})[D.probe]],
    ['Level', `<b>${fmt(p.dBu,2)} dBu</b> = ${fmt(dBu2V(p.dBu),3)} Vrms`,1],
    ['THD+N', `${fmt(c.thd(D.probe),4)} %`,1],
    ['Speaker', D.probe==='amp'? `${fmt(c.P,2)} W into ${D.load} Ω ${D.topo==='btl'?'(bridged)':'(per channel)'}${c.clip?' · <b style="color:var(--bad)">clipping</b>':''}`:'—'],
  ]);
}
function stageTable(){ const c = chain(); return tbl(['Stage','dBu','Vrms','Note'], c.st.map(s=>[s.n, `<span class="mono">${fmt(s.dBu,2)}</span>`, `<span class="mono">${fmt(dBu2V(s.dBu),3)}</span>`, `<span class="small">${s.note}</span>`])); }
function speakerHTML(){
  const c = chain(), s = spl(c), b = budget(c);
  return kv([
    ['Driver', `<select data-s="driver">${Object.keys(DRIVERS).map(k=>`<option value="${k}" ${k===D.driver?'selected':''}>${DRIVERS[k].n}</option>`).join('')}</select>`],
    ['Driver data', `${s.dr.s} dB/1 W/1 m · ${s.dr.p} W · fs ${s.dr.fs} Hz · ${s.dr.z}`],
    ['SPL at 1 m', `<b>${fmt(s.db,1)} dB</b>${s.over?' <span style="color:var(--bad)">(over rated power)</span>':''} · Fostex 6301N: ${FOSTEX.max} dB max, ${FOSTEX.sens} dB/W, ${FOSTEX.rated} W, ${FOSTEX.band}`],
    ['24 V supply', `<select data-s="psu">${PSU.map((p,i)=>`<option value="${i}" ${i===D.psu?'selected':''}>${p[0]} · ${p[2]} A · ${p[5]!=null?'$'+p[5].toFixed(2):'—'}</option>`).join('')}</select> <button data-a="music" class="${D.music?'on':''}">music</button>`],
    ['Draw', `${fmt(b.pin,1)} W → <b>${fmt(b.I,2)} A</b> at 24 V: ${b.ok?'OK ('+fmt(b.head,2)+' A spare)':'<b style="color:var(--bad)">over the supply rating</b>'} <span class="small muted">(3.3 V logic ${fmt(b.p33,2)} W, op-amps ${fmt(b.pOp,2)} W ${inf})</span>`],
  ]);
}

/* ================= timeline ================= */
function wave(t, k){
  const s = stim(t), c = chain(s.f, s.off, s.abs), st = c.st.find(x=>x.k===k);
  const A_ = dBu2V(st.dBu)*Math.SQRT2;
  let v = A_*Math.sin(2*Math.PI*s.f*(t - s.t0));
  if (k==='amp'){ const lim = c.vclip*Math.SQRT2*1.02; v = clamp(v,-lim,lim); }
  return v;
}
function lanes(){
  const css = SIM.css, L = [];
  L.push({label:'AES3 frames (48 kHz)', h:22, draw(c,X,t0,t1,y,h){ if (D.src!=='aes'){ laneText(c,X,t0,y,h,'analog source: AES idle'); return; } SIM.pulses(c,X,t0,t1,y,h,1/FS,0,0.5/FS,css('--accent2'),'frame = 2 subframes × 32 bits'); }});
  L.push({label:'AP stimulus', h:22, draw(c,X,t0,t1,y,h){ if (D.mode==='tone'){ laneText(c,X,t0,y,h,`steady ${D.freq} Hz`); return; } const n = D.mode==='sweep'?31:21; for(let k=0;k<n;k++){ const a=k/n,b=(k+1)/n; if (b<t0||a>t1) continue; bandAt(c,X,a,b,y,h,k%2?css('--accent'):css('--accent2'),.35, D.mode==='sweep'? fmt(20*Math.pow(1000,Math.min(30,k)/30),0)+' Hz' : (-100+k*5)+''); } }});
  [['d2a','D/A out (U3)','--accent2'],['mixer','Mixer out (U8/U4)','--accent'],['amp','Speaker (after L1/L2)','--warn']].forEach(([k,lbl,col])=> L.push({label:lbl, h:40, draw(c,X,t0,t1,y,h){
    const span=t1-t0, px=Math.max(60,Math.floor(X(t1)-X(t0))); const full = k==='amp' ? chain().vclip*Math.SQRT2*1.05 : 6;
    c.strokeStyle = css(col); c.fillStyle = css(col); c.lineWidth=1;
    const sc = (h/2-3)/full;
    const fNow = stim(SIM.t).f;
    if (span*fNow > px/3){ c.globalAlpha=.55; for(let i=0;i<px;i+=2){ const tt=t0+span*i/px, s=stim(tt), cc=chain(s.f,s.off,s.abs); const st=cc.st.find(x=>x.k===k); let a=dBu2V(st.dBu)*Math.SQRT2; if(k==='amp') a=Math.min(a,cc.vclip*Math.SQRT2*1.02); a=clamp(a*sc,0,h/2-2); c.fillRect(X(t0)+i,y+h/2-a,2,2*a); } c.globalAlpha=1; }
    else { c.beginPath(); for(let i=0;i<=px;i++){ const tt=t0+span*i/px; const v=wave(tt,k); const yy=y+h/2-clamp(v*sc,-h/2+2,h/2-2); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy);} c.stroke(); }
    c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText(`±${fmt(full,1)} V`, X(t1)-48, y+10);
  }}));
  L.push({label:`TPA3124D2 PWM (${FPWM/1e3} kHz)`, h:30, draw(c,X,t0,t1,y,h){
    const span=t1-t0, per=1/FPWM; if (X(t0+per)-X(t0) < 3){ c.fillStyle=css('--accent'); c.globalAlpha=.25; c.fillRect(X(t0),y+4,X(t1)-X(t0),h-8); c.globalAlpha=1; laneText(c,X,t0,y,h,`${Math.round(span/per).toLocaleString()} switching periods in view (fOSC 250 kHz typ., datasheet) — zoom to 20 µs`); return; }
    const vcl = chain().vclip*Math.SQRT2; c.strokeStyle=css('--accent'); c.beginPath();
    for (let n=Math.floor(t0/per); n*per<t1; n++){ const ta=n*per; const m = clamp(wave(ta,'amp')/(D.topo==='btl'?2*vcl:vcl),-0.95,0.95); const duty=0.5+0.5*m; const tb=ta+duty*per;
      c.moveTo(X(ta),y+h-4); c.lineTo(X(ta),y+4); c.lineTo(X(tb),y+4); c.lineTo(X(tb),y+h-4); c.lineTo(X(ta+per),y+h-4); }
    c.stroke(); }});
  L.push({label:'Supply current (24 V)', h:26, draw(c,X,t0,t1,y,h){ const N=200; c.strokeStyle=css('--bad'); c.beginPath(); for(let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N; const s=stim(tt), cc=chain(s.f,s.off,s.abs); const b=budget(cc); const yy=y+h-3-clamp(b.I/3,0,1)*(h-6); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy);} c.stroke(); c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('0…3 A (average, model)', X(t1)-120, y+10); }});
  return L;
}

/* ================= views ================= */
function viewSim(m){
  m.innerHTML = `<div class="grid2"><div>
    ${card('QubeAmp ISS.2 on the bench (click parts: P1/P8 source, U3/U8/U12 probe, R20 SE/BTL, H4/H5 gain, U10 mix)', `<div id="bd"></div>${controlsHTML()}<p class="small muted">Drawing: SA-QUBEAMP-MAIN-Assembly.pdf (Altium, 16 Nov 2014|47), cut to the board outline. Highlights, probe and readouts are overlays.</p>`)}
    ${card('Stage by stage (measured gains)', `<div id="stg"></div>`)}</div><div>
    ${card('Audio Precision readout at the probe', `<div id="ap"></div>`)}
    ${card('What the circuit did (last action)', `<div id="trace" class="log"></div>`)}
    ${card('Driver, loudness and supply', `<div id="spk"></div>`)}</div></div>
    ${card('Timeline — one second of AP stimulus through the board (zoom to 20 µs for the PWM)', `<canvas id="tl"></canvas>`)}
    ${card('Action log', `<div id="log" class="log"></div>`)}`;
  bindControls(m);
  const draw = ()=>{
    const bd = m.querySelector('#bd'); bd.innerHTML = boardSVG(); bindBoard(bd);
    m.querySelector('#stg').innerHTML = stageTable(); m.querySelector('#ap').innerHTML = apHTML();
    const sp = m.querySelector('#spk'); sp.innerHTML = speakerHTML(); bindControls(sp);
    m.querySelector('#trace').innerHTML = traceHTML(); m.querySelector('#log').innerHTML = logHTML();
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:190});
  };
  SIM.on('time', draw);
}
const tutor = {i:0};
const LESSONS = [
  { title:'The question RD80 asked', body:`<p>In mid 2014|47 WBS wanted one small amplifier board for its powered speakers and monitors (AMS2, AMS4, the POD mechanicals and a cube speaker). The benchmark on the bench was the <b>Fostex 6301N</b>: AES/EBU and analog in, one 100 mm driver, 20 W, 98 dB max. Ali drew a “Universal Amp” (UNI-AMP-ISS1, July), cut it down to the <b>QubeAmp</b> (ISS1 31 Jul, ISS2 21 Sep) and measured every stage on an Audio Precision analyser in November. This tutorial repeats those 11 sweeps.</p>`, check:()=>true, auto:true },
  { title:'1 · The DAC alone', body:`<p>Select the <b>AES</b> input, put the probe on <b>U3</b> (D/A) and set <b>0 dBFS</b>. Sweep 01 read +8.56 dBu (right) and +8.67 dBu (left): the PCM5100A’s 2.1 Vrms. THD+N is 0.0045 % at 1 kHz.</p><p><b>Goal:</b> AES, probe D/A, 0 dBFS.</p>`, check:()=>D.src==='aes'&&D.probe==='d2a'&&D.dbfs===0, hint:'Click U3 on the board, then drag the dBFS slider to 0.' },
  { title:'2 · Through the mixer, single-ended', body:`<p>Choose <b>SE</b> and probe the <b>mixer</b> (U8). Sweep 02: +7.96 dBu, so the 74HC4053 and the NE5532 inverting pair cost 0.6 dB. The 7.85 dB divider of the original pick-and-place (6K81 / 4K64) is not in circuit here.</p><p><b>Goal:</b> SE, probe mixer, 0 dBFS.</p>`, check:()=>D.topo==='se'&&D.probe==='mixer'&&D.dbfs===0&&D.src==='aes', hint:'Buttons SE and “mixer”.' },
  { title:'3 · Bridged mixer', body:`<p>Switch to <b>BTL</b>. U4B now makes an inverted copy (LEFT_N) and the AP reads the two legs differentially: +13.84 dBu (sweep 04), 5.9 dB more. Click U10 to step the Mix Selection through L, MonoMix and R as the sweeps did.</p><p><b>Goal:</b> BTL, probe mixer.</p>`, check:()=>D.topo==='btl'&&D.probe==='mixer', hint:'Click R20 on the board or the BTL button.' },
  { title:'4 · Power amp, SE, the bass', body:`<p>Back to <b>SE</b>, probe <b>U12</b>, −9 dBFS, tone <b>50 Hz</b>. Sweep 06 shows +18.65 dBu mid-band but only about +16.5 at 50 Hz and +12 at 20 Hz: the 470 µF output capacitor into 8 Ω is a 42 Hz high-pass.</p><p><b>Goal:</b> SE, probe power amp, −9 dBFS, 50 Hz or lower.</p>`, check:()=>D.topo==='se'&&D.probe==='amp'&&D.dbfs===-9&&D.freq<=50, hint:'SE, “power amp”, slider to −9, tone 50.' },
  { title:'5 · Bridge it', body:`<p>Choose <b>BTL</b>, −10 dBFS, 1 kHz. Sweep 08: +23.3 dBu = 11.3 Vrms, <b>16 W into 8 Ω</b>, flat to 20 Hz because there is no output capacitor. That is the QUBE build.</p><p><b>Goal:</b> BTL, power amp, −10 dBFS, 1 kHz.</p>`, check:()=>D.topo==='btl'&&D.probe==='amp'&&D.dbfs===-10&&D.freq===1000, hint:'BTL, slider −10, tone 1000.' },
  { title:'6 · Find the clip', body:`<p>Raise the level until the board clips. The sweeps stop at −9 / −10 dBFS for a reason: with 20 dB in the power stage a full-scale AES signal would ask for 28 dBu SE or 33 dBu BTL, far past the 24 V rail. Watch the speaker lane flatten and THD+N jump.</p><p><b>Goal:</b> clipping.</p>`, check:()=>chain().clip, hint:'Slider toward 0 dBFS.' },
  { title:'7 · Analog in through the mixer', body:`<p>Select the <b>analog</b> input at <b>−2 dBu</b>, BTL. Sweep 10: +23.3 dBu, the same output as −10 dBFS digital. The two inputs were matched by design.</p><p><b>Goal:</b> analog, −2 dBu, BTL, probe power amp.</p>`, check:()=>D.src==='analog'&&D.jack===-2&&D.topo==='btl'&&D.probe==='amp', hint:'Click P8, then set the slider to −2.' },
  { title:'8 · Pick a driver', body:`<p>Go back to AES, −10 dBFS, BTL. Compare drivers in the loudness card. The Tectonic BMR TC2X4FC (81.8 dB/W, 15 W) reaches about 94 dB at 16 W; the 3.5″ cone (88 dB/W) would pass the Fostex’s 98 dB but is over its 10 W rating. Pick the <b>TC2X4FC</b>.</p><p><b>Goal:</b> driver TC2X4FC, AES, BTL.</p>`, check:()=>D.driver==='TC2X4FC'&&D.src==='aes'&&D.topo==='btl', hint:'Driver menu in the right-hand card.' },
  { title:'9 · Size the 24 V supply', body:`<p>Ali’s spreadsheet lists sixteen 60–65 W, 24 V bricks. Turn on <b>music</b> (crest factor) and pick the cheapest that still has headroom. The EPS-65-24 at $14.90 and RPS-60-24 at $19.30 both pass easily.</p><p><b>Goal:</b> music budget on, supply within rating.</p>`, check:()=>D.music&&budget(chain()).ok, hint:'Click “music”, then choose a supply.' },
  { title:'Done', body:`<p>That is the RD80 investigation: a board that measured clean (0.0045 % DAC, ≈0.03–0.2 % amp), 16 W bridged, and could be fitted SE for the AMS2 or BTL for the QUBE. The <b>Findings</b> tab says what became of it.</p>`, check:()=>true, auto:true },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — the RD80 bench sweeps', panelTitle:'Board, analyser and speaker', reset,
  panel(el){ el.innerHTML = `<div id="tb"></div>${controlsHTML()}<div style="margin-top:8px">${apHTML()}</div><div style="margin-top:8px">${speakerHTML()}</div>`; const tb=el.querySelector('#tb'); tb.innerHTML=boardSVG(); bindBoard(tb); bindControls(el); } }); }
function viewSecond(m){
  m.innerHTML = `${card('One second on the board', `<div id="lad"></div>`)}<div class="grid2">${card('At the playhead', `<div id="dev"></div>`)}${card('Acoustic snapshots (pink noise, Jan 2015|48) — click a name', `<div id="sn"></div>`)}</div>`;
  const draw = ()=>{ const t=SIM.t, s=stim(t), c=chain(s.f,s.off,s.abs);
    m.querySelector('#lad').innerHTML = tbl(['Event','per second','period','note'],[
      ['AES3 frames', '<span class="mono">48,000</span>', '<span class="mono">20.83 µs</span>', 'CS8416 recovers the clock; 192-frame blocks every 4 ms'],
      ['AES3 biphase cells', '<span class="mono">6,144,000</span>', '<span class="mono">163 ns</span>', '64 bits/frame × 2 cells'],
      ['I²S BCLK to the PCM5100A', '<span class="mono">3,072,000</span>', '<span class="mono">326 ns</span>', '64 fs '+inf],
      ['Class-D switching', '<span class="mono">250,000</span>', '<span class="mono">4 µs</span>', 'TPA3124D2 fOSC typ. (datasheet, 250–300 kHz)'],
      ['Output-filter corner', '', '', `ISS.2 drawing 47 µH / 0.22 µF → ${fmt(1/(2*Math.PI*Math.sqrt(47e-6*0.22e-6))/1e3,1)} kHz`],
      ['AP sweep points', D.mode==='sweep'?'31':D.mode==='level'?'21':'1', '', 'stimulus steps across the second'],
    ].map(r=>r.map((x,i)=>i===3?`<span class="small">${x}</span>`:x)));
    m.querySelector('#dev').innerHTML = kv([['Stimulus',`${fmt(s.f,0)} Hz, step ${s.k+1}`,1],['D/A',fmt(c.st[0].dBu,2)+' dBu',1],['Mixer',fmt(c.st[1].dBu,2)+' dBu',1],['Speaker',`${fmt(c.a,2)} dBu · ${fmt(c.P,2)} W`,1],['Instant speaker V',fmt(wave(t,'amp'),3)+' V',1],['THD+N (amp)',fmt(c.thd('amp'),3)+' %',1]]);
    const sn = m.querySelector('#sn');
    sn.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">${SNAPS.map(([k,l])=>`<button data-a="snap" data-v="${k}" class="${D.snap===k?'on':''}">${l}</button>`).join('')}</div><img src="${ASSET}rd80-amplifier-project-snap-${D.snap}.jpg" alt="${D.snap}" style="width:100%;border-radius:6px"><p class="small muted">Acoustic Snapshots/*.PNG: real-time spectrograms, 31 Hz–16 kHz left to right, time downward. Read by eye: the original Qube driver is strongest around 200 Hz; the trimmed driver adds a hot band near 16 kHz; AMS8 rings near 650 Hz and AMS4 near 1.4 kHz ${inf}.</p>`;
    bindActs(sn, { snap:v=>A.snap(v) });
  };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B = {
    aes:{x:20,y:20,w:170,h:66,t:'AES in (P1, T1)',s:['PE-65612 pulse xfmr'],d:'AES3 on PAN300 header P1, isolated by T1. T2 and U1 (SN65HVD30) form a second AES port, a thru output like the Fostex 6301N “DIGITAL THRU” '+inf+'.',live:()=>D.src==='aes'},
    rx:{x:220,y:20,w:170,h:66,t:'CS8416 (U2)',s:['hardware mode → I²S'],d:'Cirrus 192 kHz receiver. 32.2 mA on 3.3 V (currentOn3v3.txt).',live:()=>D.src==='aes'},
    dac:{x:420,y:20,w:170,h:66,t:'PCM5100A (U3)',s:['2.1 Vrms, 100 dB'],d:'TI DirectPath DAC, ground-centred output, 45 mA. AK4430 (104 dB, 2 Vrms) was the alternative in Parts/. Measured 0 dBFS = +8.6 dBu, 0.0045 % THD+N.',live:()=>D.src==='aes'},
    jack:{x:20,y:140,w:170,h:66,t:'Analog jack (P8)',s:['¼″ TRS jack'],d:'Jack comparison in JACK/audio jack.xls: the NRJ6HF (3C stereo, 3 × SPST NC switch contacts) is the cheapest at $0.69 and the one with Mouser part numbers listed.',live:()=>D.src==='analog'},
    mux:{x:220,y:140,w:170,h:66,t:'74HC4053 (U10)',s:['L / R / MonoMix'],d:'Three 2:1 switches choose the source and the mix sent to the amp.'},
    mix:{x:420,y:140,w:170,h:80,t:'NE5532 mixer',s:['U8 inverting 20K/20K','U4B → LEFT_N (BTL)'],d:'Single-supply op-amps biased at VCC/2. SE: −0.6 dB. BTL: +5.3 dB differential.'},
    amp:{x:620,y:80,w:170,h:86,t:'TPA3124D2 (U12)',s:['20/26/32/36 dB (H4/H5)','15 W/ch SE, 250 kHz'],d:'TI class-D, 10–26 V. Measured 19.6 dB in every sweep (gain code 00).'},
    lc:{x:620,y:200,w:170,h:66,t:'L1/L2 + C60/C61',s:['LC output filter'],d:'47 µH / 0.22 µF on the ISS.2 drawing; 22 µH / 0.68 µF (BTL) and 33 µH / 0.22 µF (SE) in parts_cube22.'},
    spk:{x:620,y:300,w:170,h:70,t:'Speaker (P11)',s:[D.topo==='btl'?'one, bridged':'two, via 470 µF'],d:'Drivers studied: Tectonic BMR TC2X4FB/FC, TC5FB; 3.5″ and 5″ cones.'},
    psu:{x:220,y:300,w:170,h:70,t:'24 V brick → P14',s:['R-78E3.3 → 3.3 V (U13)'],d:'Sixteen 24 V / 60–65 W supplies compared (power supply.xls). 3.3 V rail ≈153 mA measured.'},
  };
  blockView(m, B, [['aes','rx','AES3'],['rx','dac','I²S'],['dac','mux','DIGITAL_L/R'],['jack','mux','JACK_L/R'],['mux','mix',''],['mix','amp','L_IN/R_IN'],['amp','lc','LOUT/ROUT'],['lc','spk',''],['psu','amp','VCC_P']], {start:'amp', w:820, h:400, side:'<p>One board, two builds: fit R20 and bypass the output capacitors for a bridged single speaker (QUBE), or fit R21 and the 470 µF capacitors for stereo (AMS2).</p>'});
}
const SHEETS = [
  { name:'S1 · AES', note:'Redrawn from QubeAmp-ISS2.pdf sheet S1 and the ISS.2 assembly; pin names from the CS8416 / PCM5100A data in Parts/.', svg:()=> chip(120,70,150,'U2 CS8416',[['RXP0','AES_RX_P'],['RXN','AES_RX_N'],['RST','']],[['SDOUT','I2S_DATA'],['OSCLK','BCLK'],['OLRCK','LRCK'],['AUDIO','AUD_VAL']],'AES3 receiver')+chip(500,70,150,'U3 PCM5100A',[['DIN','I2S_DATA'],['BCK','BCLK'],['LRCK','LRCK'],['XSMT','3V3']],[['OUTL','DIGITAL_L'],['OUTR','DIGITAL_R']],'2.1 Vrms DAC')+chip(120,300,150,'U1 SN65HVD30',[['A/B','AES out pair'],['R','']],[['D','AES thru '+'(inf.)']],'RS-485 transceiver')+`<text x="500" y="300" font-size="12" fill="var(--ink)">R99 / R86 6K81 series, R87 / R88 4K64 shunt</text><text x="500" y="318" font-size="11" fill="var(--ink2)">(7.85 dB pad; not in circuit for the Nov 2014 sweeps)</text><text x="500" y="350" font-size="12" fill="var(--ink)">R14/R15 470R + C13/C14 2n2 → 154 kHz RC</text>` },
  { name:'S2 · Analog / mixer', note:'Redrawn from sheet S2 (ANALOG-MIXER); reference designators from the ISS.2 assembly.', svg:()=> chip(80,70,150,'U10 74HC4053',[['X0/X1','DIGITAL_L / JACK_L'],['Y0/Y1','DIGITAL_R / JACK_R'],['Z0/Z1','LEFT_FB'],['A/B/C','*_SEL']],[['X','to U8A'],['Y','to U8B'],['Z','to U4']],'analog mux')+chip(460,70,150,'U8 NE5532',[['−IN A','20K in / 20K fb'],['+IN A','VCC_P/2']],[['OUT A','LEFT'],['OUT B','RIGHT']],'inverting stages')+chip(460,260,150,'U4 NE5532',[['+IN A','VCC_P/2 ref'],['−IN B','LEFT']],[['OUT A','BIAS'],['OUT B','LEFT_N']],'bias + inverter')+`<text x="80" y="330" font-size="12" fill="var(--ink)">R19 30R: L_IN ← LEFT</text><text x="80" y="350" font-size="12" fill="${D.topo==='btl'?'var(--accent)':'var(--ink)'}">R20 30R: R_IN ← LEFT_N (BTL)</text><text x="80" y="370" font-size="12" fill="${D.topo==='se'?'var(--accent)':'var(--ink)'}">R21 30R: R_IN ← RIGHT (SE)</text>` },
  { name:'S3 · Power amp', note:'TPA3124D2 pin numbers from Parts/tpa3124d2.pdf; output parts from the ISS.2 assembly and parts_cube22.xls.', svg:()=> chip(330,50,190,'U12 TPA3124D2',[['5 LIN','L_IN (C48 1µ)'],['6 RIN','R_IN (C49 1µ)'],['17 GAIN1',D.g1?'H5 → GND':'R63 pull-up'],['18 GAIN0',D.g0?'H4 → GND':'R62 pull-up'],['2 SD','SHUTDOWN'],['4 MUTE','MUTE'],['7 BYPASS','C']],[['22 LOUT','L1 → OUT_1_P'],['15 ROUT','L2 → OUT_2_N'],['1,3 PVCCL','VCC_P'],['10,12 PVCCR','VCC_P'],['19,20 AVCC','VCC_P'],['21/16 BSL/BSR','bootstrap'],['11 VCLAMP','']],'24-TSSOP PowerPAD')+`<text x="40" y="380" font-size="12" fill="var(--ink)">Gain code ${gainCode()} → ${ampNom()} dB, input ${GAINS[gainCode()][1]} kΩ</text><text x="40" y="400" font-size="12" fill="var(--ink)">Filter: ${FILTERS[D.filt].n}: ${fmt(FILTERS[D.filt].L*1e6,0)} µH / ${fmt(FILTERS[D.filt].C*1e6,2)} µF</text>` },
  { name:'S4 · Power', note:'From sheet S4 (PWR-SUP-HEADER) and currentOn3v3.txt.', svg:()=> chip(120,90,170,'U13 R-78E3.3-0.5',[['Vin','VCC_P 24 V (P14)'],['GND','']],[['Vout','3V3 (0.5 A max)']],'switching regulator')+RAIL33.map((r,i)=>`<rect x="520" y="${80+i*44}" width="${Math.max(4,r[1]*2.4)}" height="26" fill="var(--accent)" opacity=".7"/><text x="520" y="${76+i*44}" font-size="11.5" fill="var(--ink)">${r[0]}: ${r[1]} mA</text>`).join('')+`<text x="520" y="290" font-size="12" fill="var(--ink)">Σ ≈ ${fmt(RAIL33.reduce((a,r)=>a+r[1],0),1)} mA · C57/C58 470 µF / 35 V bulk at U12</text>` },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'QubeAmp-ISS2 schematics, ISS.2 assembly and RD80 parts data', 'Four sheets as in the Altium project (S1 AES, S2 Analog-Mixer, S3 Power Amp, S4 Power Supply / Header). Net names as printed; the AES-thru role of U1/T2 is inferred.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('Frequency response at the probe — model (line) vs sweep readings (dots)', `<canvas id="bode"></canvas><p class="small muted">Dots are the values read off sweeps 01, 06 and 08. The line is this model.</p>`)}${card('THD+N vs level at the probe', `<canvas id="thd"></canvas><p class="small muted">Noise floor −78 dBu at the amp (sweep 09), DAC floor fitted to sweep 01 ${inf}.</p>`)}</div>
    ${card('The 11 Final Sweeps (Nov 2014|47)', `<div id="sw" class="scroll"></div>`)}
    <div class="grid2">${card('Output-filter versions', `<div id="lc"></div>`)}${card('Board history', `<div id="hist"></div>`)}</div>`;
  const draw = ()=>{
    const fr = f=>{ const c=chain(f,0); return probeStage(c).dBu; };
    { const {c,w,h} = SIM.canvas(m.querySelector('#bode'), 220); const ref = fr(1000), x=f=>40+(w-50)*Math.log10(f/20)/3, y=d=>20+(h-50)*(3-(d-ref))/15;
      c.strokeStyle=SIM.css('--grid'); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif';
      [20,50,100,200,500,1000,2000,5000,10000,20000].forEach(f=>{ c.beginPath(); c.moveTo(x(f),20); c.lineTo(x(f),h-30); c.stroke(); c.fillText(f>=1000?f/1000+'k':f, x(f)-6, h-16); });
      [3,0,-3,-6,-9,-12].forEach(d=>{ c.beginPath(); c.moveTo(40,y(ref+d)); c.lineTo(w-10,y(ref+d)); c.stroke(); c.fillText((d>0?'+':'')+d, 14, y(ref+d)+3); });
      c.strokeStyle=SIM.css('--accent'); c.lineWidth=2; c.beginPath(); for(let i=0;i<=200;i++){ const f=20*Math.pow(1000,i/200); const yy=y(fr(f)); i?c.lineTo(x(f),yy):c.moveTo(x(f),yy);} c.stroke(); c.lineWidth=1;
      const pts = D.probe==='amp' ? (D.topo==='se'?[[20,-6.65],[50,-2.1],[100,-0.6],[1000,0],[10000,-0.6],[20000,-2.4]]:[[20,0],[1000,0],[10000,-0.7],[20000,-2.1]]) : D.probe==='d2a'?[[20,0],[1000,0],[10000,-0.05],[20000,-0.15]]:[[20,0],[1000,0],[20000,-0.12]];
      c.fillStyle=SIM.css('--bad'); pts.forEach(([f,d])=>{ c.beginPath(); c.arc(x(f),y(ref+d),4,0,7); c.fill(); });
      c.fillStyle=SIM.css('--ink2'); c.fillText(`0 dB = ${fmt(ref,2)} dBu at 1 kHz · ${D.topo.toUpperCase()} · probe ${D.probe}`, 46, 14); }
    { const {c,w,h} = SIM.canvas(m.querySelector('#thd'), 220); const lo = D.src==='aes'?-100:-80, hi = D.src==='aes'?0:12, x=l=>40+(w-50)*(l-lo)/(hi-lo), y=p=>20+(h-50)*(Math.log10(30)-Math.log10(Math.max(p,0.001)))/(Math.log10(30)+3);
      c.strokeStyle=SIM.css('--grid'); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif';
      [30,10,1,0.1,0.01,0.001].forEach(p=>{ c.beginPath(); c.moveTo(40,y(p)); c.lineTo(w-10,y(p)); c.stroke(); c.fillText(p+'%',2,y(p)+3); });
      for(let l=lo;l<=hi;l+=10){ c.beginPath(); c.moveTo(x(l),20); c.lineTo(x(l),h-30); c.stroke(); c.fillText(l+(D.src==='aes'?' dBFS':' dBu'), x(l)-12, h-16); }
      c.strokeStyle=SIM.css('--accent'); c.lineWidth=2; c.beginPath(); for(let i=0;i<=120;i++){ const l=lo+(hi-lo)*i/120; const cc=chain(D.freq, D.src==='aes'?l:l-10, true); const p=cc.thd(D.probe); i?c.lineTo(x(l),y(p)):c.moveTo(x(l),y(p)); } c.stroke(); c.lineWidth=1;
      const cur = D.src==='aes'?D.dbfs:D.jack; c.fillStyle=SIM.css('--bad'); c.beginPath(); c.arc(x(clamp(cur,lo,hi)), y(chain().thd(D.probe)), 5, 0, 7); c.fill(); }
    m.querySelector('#sw').innerHTML = tbl(['#','File','2014','Point','Level','THD+N','Note'], SWEEPS.map(r=>[r[0],`<span class="mono small">${r[1]}</span>`,r[2],r[3],r[4],r[5],`<span class="small">${r[6]}</span>`]));
    const lc = m.querySelector('#lc');
    lc.innerHTML = tbl(['Set','L','C','f0','Q (8 Ω SE / 4 Ω per BTL half)',''], Object.keys(FILTERS).map(k=>{ const F=FILTERS[k], f0=1/(2*Math.PI*Math.sqrt(F.L*F.C)); return [F.n, fmt(F.L*1e6,0)+' µH', fmt(F.C*1e6,2)+' µF', fmt(f0/1e3,1)+' kHz', `${fmt(8*Math.sqrt(F.C/F.L),2)} / ${fmt(4*Math.sqrt(F.C/F.L),2)}`, `<button data-a="filt" data-v="${k}" class="${D.filt===k?'on':''}">show</button>`]; }));
    bindActs(lc, { filt:v=>{ D.filt=v; SIM.refresh(); } });
    m.querySelector('#hist').innerHTML = tbl(['Date','Design','Evidence'],[
      ['Jul 2014|47','UNI-AMP-ISS1 “Universal Amp”, 5 sheets','backup3/Universal Amp.pdf: 12 NE5532 references, two 74HC4053'],
      ['31 Jul 2014','QubeAmp-ISS1, 4 sheets','QubeAmp - #ISS1/QubeAmp-ISS1.pdf: 8 NE5532 references'],
      ['21 Sep 2014','QubeAmp-ISS2 (UNI-AMP-ISS2)','QubeAmp - #ISS3/QubeAmp-ISS2.pdf: 6 NE5532 references'],
      ['27 Oct – 14 Nov 2014','AP sweeps, with 10 dB pad → no pad → Final','Final Sweeps/ and Raw Material/'],
      ['16 Nov 2014','SA-QUBEAMP-MAIN and SA-AMS2-AMP assemblies','*-Assembly.pdf'],
      ['Jan 2015|48','Driver / enclosure listening','Acoustic Snapshots (zip newest 30 Jan 2015), Chamber/QubeSpeaker V3.stl'],
      ['2015–2016|49','Production: QUBE speaker + AMS2','#QUBE #SERIES, AMS2 - #Master (qubeamp.js, ams2.js)'],
    ]);
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  m.innerHTML = card('What RD80 decided, and what became of it', `<ol>
    <li><b>It shipped.</b> Register row RD80 (priority B, no completion date) led to the QubeAmp board in the QUBE powered speaker (SA-QUBEAMP-MAIN) and the AMS2 1RU monitor (SA-AMS2-AMP). Those products are modelled in <span class="mono">qubeamp.js</span> and <span class="mono">ams2.js</span>.</li>
    <li><b>One board, two topologies, chosen by fitting.</b> The sweeps were run in both SE and BTL. BTL gave +23.3 dBu (16 W into 8 Ω) and response flat to 20 Hz; SE lost about 2 dB at 50 Hz and 6.6 dB at 20 Hz to the 470 µF output capacitor. The QUBE uses BTL; the AMS2, with two speakers, SE.</li>
    <li><b>The power stage ran at 20 dB in 2014.</b> Every power-amp sweep shows 19.5–19.7 dB, the TPA3124D2’s GAIN1:0 = 00 setting. The 2015 AMS2 production test (see <span class="mono">qubeamp.js</span>) measured 36 dB, the pull-up default. The change is not recorded ${inf}.</li>
    <li><b>The test levels were chosen to dodge clipping.</b> Power-amp sweeps stop at −9 dBFS (SE) and −10 dBFS (BTL). At 20 dB gain, 0 dBFS would need +28 dBu SE or +33 dBu BTL from a 24 V rail; the datasheet’s 1 % point is 8 W into 8 Ω SE (8 Vrms, +20.3 dBu).</li>
    <li><b>The measured noise floor equals the datasheet.</b> Sweep 09 (analog in, no mixer) bottoms out at −78 dBu; the TPA3124D2 datasheet gives 125 µV / −78 dBV at 20 dB gain. On the AES path the PCM5100A’s own floor, raised 24.8 dB by the mixer and amp, lands near −67 to −72 dBu and dominates ${inf}. Either way the hiss is a few dB SPL at 1 m from the BMR driver, which is why RD84’s SABRE DACs would not help a powered speaker.</li>
    <li><b>The divider on the drawing was not in the tested circuit.</b> The ISS.2 assembly shows R99/R86 6K81; with R87/R88 4K64 that is a 7.85 dB pad. Sweeps 01→02 show only 0.6 dB loss from DAC to mixer. Production later used 0R / DNI (see <span class="mono">qubeamp.js</span>).</li>
    <li><b>The output filter moved three times.</b> ISS.2 drawing: 47 µH / 0.22 µF (49.5 kHz). parts_cube22 BTL: 22 µH / 0.68 µF (41 kHz). SE: 33 µH / 0.22 µF (59 kHz).</li>
    <li><b>The RS-485 chip is the hungriest part on 3.3 V.</b> currentOn3v3.txt: U1 SN65HVD30 76 mA, more than the CS8416 (32.2) and PCM5100A (45) together. With the second PE-65612 (T2) it looks like an AES thru output, as on the Fostex 6301N ${inf}.</li>
    <li><b>The Fostex 6301N was the yardstick.</b> Its manual is in <span class="mono">Fostex/</span>: AES/EBU + phone input with analog priority and an orange “phone inserted” LED, 20 W, 85 dB/W, 98 dB max, 70 Hz–15 kHz. The QubeAmp copies the input priority and the amber jack-insert LED (see <span class="mono">qubeamp.js</span>).</li>
    <li><b>Cost.</b> parts_cube22.xls prices the BTL board at $31.38 and the SE board at $32.43 in parts; the TPA3124D2 is $2.70, the CS8416 $5.40, the inductors $5.00–$5.40 a pair.</li>
    <li><b>Housekeeping.</b> “Miixer” in the file name of sweep 02, “Separatio” and “Rigth” in its page titles; <span class="mono">Raw Material/BTL_NoPad/Mixer_wrong.pdf</span> kept beside the right one; <span class="mono">Book1.xls</span> is an empty level/THD/phase template (Sep 2014); <span class="mono">PS-for-POD-QSP/pod-qsp-ps.xls</span> holds the same supply table as <span class="mono">power supply.xls</span> (different file, identical content); <span class="mono">sloa031.pdf</span> is in both the root and <span class="mono">Parts/</span> (identical files); the ISS3 folder still uses ISS2 file names.</li>
  </ol>`) + card('Assumptions in this model', `<ul class="small"><li>Plot readings are to the plot resolution (about 0.01–0.1 dB, ±10 % on THD+N).</li><li>BTL clip at twice the SE 1 % voltage; class-D efficiency 88 %; logic and op-amp draw; music crest factor (${inf}).</li><li>Frequency-response and THD shapes between the read points are fitted curves (${inf}).</li><li>Spectrogram features are read by eye.</li></ul>`) + card('Sources', `<ul class="small mono"><li>XXX - ENGINEERING - 2016 RD FILES/RD80-Amplifier Project/: Final Sweeps/*.pdf, SA-QUBEAMP-MAIN-Assembly.pdf, PCB/**/QubeAmp-ISS*.pdf, PCB/QubeAmp - #ISS3/parts_cube22.xls, currentOn3v3.txt, Power Supply/power supply.xls, Parts/tpa3124d2.pdf, pcm5100a.pdf, AK4430ET.pdf, Speaker/*.pdf, Fostex/6301N_EN72.pdf, Acoustic Snapshots/*.PNG, JACK/audio jack.xls · R&amp;D_List.xls</li></ul>`);
}

SIM.register({
  id:'rd80-amplifier-project', name:'RD80 Amplifier Project · QubeAmp class-D bench study (2014|47)', duration:1,
  product:'RD80 Amplifier Project', year:2014, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD80-Amplifier Project',
  summary:'The R&D behind the QubeAmp board: AES or analog in, PCM5100A DAC, NE5532 mixer and a TPA3124D2 class-D stage, measured single-ended and bridged on an Audio Precision analyser in November 2014. The model replays those 11 sweeps on the real ISS.2 assembly drawing, with driver loudness and 24 V supply sizing.',
  highlights:['All 11 Final Sweeps as a stage-by-stage model','SE vs BTL, gain links and clipping','Class-D PWM at 250 kHz in slow motion','Driver SPL vs the Fostex 6301N yardstick','Sixteen 24 V supplies against the power budget'],
  depth:'Hardware model',
  stepUnits:[{label:'1 PWM period (4 µs)',period:()=>1/FPWM},{label:'1 AES frame',period:()=>1/FS},{label:'1 ms',period:()=>0.001},{label:'1 sweep step',period:()=>1/31}],
  zooms:[[1,'1 s (whole sweep)'],[0.1,'100 ms'],[0.01,'10 ms'],[0.002,'2 ms'],[0.0002,'200 µs'],[0.00002,'20 µs (five PWM periods)']],
  defaultZoom:3,
  tabs:[
    {id:'sim', label:'Simulator (bench)', render:viewSim},
    {id:'tutorial', label:'Tutorial: the sweeps', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Signal path & measurements', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
