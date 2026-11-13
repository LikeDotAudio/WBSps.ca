/* =====================================================================
   RD53 — iDevice A-to-D adapter (Ward-Beck R&D register, Kevin / Engineering, status "?")
   Register text: "Develop adapter for IPOD/IPAD etc from mini TRS to digital bnc/xlr etc. broadcast
   digital output. So broadcast guys can use ipod or any device as a generator of audio."
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources (XXX - ENGINEERING - 2016 RD FILES/RD53-iDeviceAtoDAdapter/):
   - Notes.txt (18 Oct 2012): built-in battery charged over mini USB, NCP1851 Li-ion switching charger;
       mini TRS input (or Bluetooth / Wi-Fi)
   - Portable A-to-D.cdr / .pdf (17 Oct 2012): "A-to-D Adapter Concept" — 3.5 mm TRS audio input;
       Micro USB (power, charge, firmware?); LED (green good, yellow 10 %?, red 5 % power, red flash 1 %);
       Lithium ION battery (universal); high-quality A-to-D, fixed 48 kHz out; V2 with user-selectable SRC
       via DIP switch or toggle
   - #POD #SERIES/POD14A README (dual A-to-D, AES out, 32–192 kHz, −20 dBFS = +4 dBu calibration)
   Asset: assets/rd53-concept-sketch.png — the concept PDF rendered to greyscale (Ward-Beck's own sketch).
   Asset: assets/rd53-ideviceatodadapter-concept.svg — Portable A-to-D.cdr converted with Inkscape (2026|59 artwork pass).
   Battery, charger, ADC and AES-transmitter values not in those files are marked "inferred" on screen.
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
/* flow chart of steps; the step 'on' is highlighted (used for live loops) */
function flowSVG(steps, on, opts){
  opts = opts || {}; const w = opts.w || 520, rh = opts.rh || 34;
  return `<svg viewBox="0 0 ${w} ${steps.length*rh+10}" style="width:100%">${steps.map((s,i)=>{ const hot = i===on;
    return `<rect x="6" y="${6+i*rh}" width="${w-12}" height="${rh-8}" rx="6" fill="${hot?'color-mix(in srgb,var(--accent) 22%,var(--panel2))':'var(--panel2)'}" stroke="${hot?'var(--accent)':'var(--line)'}" stroke-width="${hot?2:1}"/>
      <text x="16" y="${6+i*rh+(rh-8)/2+4}" font-size="12" fill="var(--ink)">${s}</text>`; }).join('')}</svg>`;
}
/* hex dump rows of a byte array; mark = {index: css colour} */
function hexDump(bytes, mark){
  mark = mark || {}; let s = '';
  for (let o=0; o<bytes.length; o+=16){
    const row = bytes.slice(o, o+16);
    s += `<div><span class="muted">${o.toString(16).padStart(4,'0')}</span>  ${row.map((b,i)=>{ const c = mark[o+i]; return c? `<span style="color:${c};font-weight:700">${hex2(b)}</span>` : hex2(b); }).join(' ')}  <span class="muted">${row.map(b=> b>31&&b<127? String.fromCharCode(b).replace(/&/,'&amp;').replace(/</,'&lt;') : '.').join('')}</span></div>`;
  }
  return `<div class="log" style="max-height:260px">${s}</div>`;
}
/* x–y line plot in SVG; series = [{pts:[[x,y]...], col, label, dash}] */
function plotSVG(series, o){
  o = o || {}; const W = o.w||620, H = o.h||240, L = 46, R = 12, T = 14, B = 30;
  const xlog = !!o.xlog; const fx = v => xlog? Math.log10(v) : v;
  const [x0,x1] = o.xr, [y0,y1] = o.yr;
  const X = v => L + (fx(v)-fx(x0))/(fx(x1)-fx(x0))*(W-L-R), Yp = v => T + (1-(v-y0)/(y1-y0))*(H-T-B);
  let s = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:var(--lane);border:1px solid var(--line);border-radius:8px">`;
  (o.xt||[]).forEach(v=>{ s += `<line x1="${X(v)}" y1="${T}" x2="${X(v)}" y2="${H-B}" stroke="var(--grid)"/><text x="${X(v)}" y="${H-B+14}" font-size="10" text-anchor="middle" fill="var(--ink2)">${o.xf?o.xf(v):v}</text>`; });
  (o.yt||[]).forEach(v=>{ s += `<line x1="${L}" y1="${Yp(v)}" x2="${W-R}" y2="${Yp(v)}" stroke="var(--grid)"/><text x="${L-4}" y="${Yp(v)+3}" font-size="10" text-anchor="end" fill="var(--ink2)">${v}</text>`; });
  if (o.xl) s += `<text x="${(L+W-R)/2}" y="${H-3}" font-size="10.5" text-anchor="middle" fill="var(--ink2)">${o.xl}</text>`;
  if (o.yl) s += `<text x="10" y="${T+6}" font-size="10.5" fill="var(--ink2)">${o.yl}</text>`;
  (o.bands||[]).forEach(b=>{ s += `<rect x="${X(b[0])}" y="${T}" width="${Math.max(0,X(b[1])-X(b[0]))}" height="${H-T-B}" fill="${b[2]}" opacity="${b[3]||.15}"/>${b[4]?`<text x="${X(b[0])+4}" y="${T+12}" font-size="10" fill="var(--ink2)">${b[4]}</text>`:''}`; });
  series.forEach((sr,k)=>{ const d = sr.pts.filter(p=>isFinite(p[1])).map((p,i)=>`${i?'L':'M'}${X(p[0]).toFixed(1)},${Yp(clamp(p[1],y0,y1)).toFixed(1)}`).join('');
    s += `<path d="${d}" fill="none" stroke="${sr.col}" stroke-width="${sr.w||2}" ${sr.dash?`stroke-dasharray="${sr.dash}"`:''}/>`;
    if (sr.label) s += `<text x="${W-R-4}" y="${T+14+k*13}" font-size="10.5" text-anchor="end" fill="${sr.col}">${sr.label}</text>`; });
  (o.marks||[]).forEach(mk=>{ s += `<circle cx="${X(mk[0])}" cy="${Yp(clamp(mk[1],y0,y1))}" r="4" fill="${mk[2]||'var(--play)'}"/>${mk[3]?`<text x="${X(mk[0])+6}" y="${Yp(clamp(mk[1],y0,y1))-6}" font-size="10.5" fill="var(--ink)">${mk[3]}</text>`:''}`; });
  return s + '</svg>';
}

/* ================= product model ================= */
const ASSET = 'siumulation-plugins/assets/';
const CAL = { pro:{name:'Broadcast: +24 dBu = 0 dBFS (POD14A: +4 dBu = −20 dBFS)', fs0:24}, cons:{name:'Consumer: 2 V rms (+8.2 dBu) = 0 dBFS', fs0:8.2} };
const HP_MAX_DBU = 2.2;                                 // ≈ 1 V rms headphone out at full volume (inferred)
const BAT = { mAh:1200, run:95, chg:500 };              // cell, running current, USB charge current (inferred)
const D0 = () => ({ plug:true, vol:80, tone:-18, f:1000, cal:'pro', usb:false, soc:100, hours:0, src:48000, ver:1, out:'xlr', dip:0 });
let D = D0();
function reset(){ D=D0(); LOG.items=[]; SIM.refresh(); }
const RATES = [48000, 44100, 96000, 32000];
function volDb(){ return D.vol<=0? -120 : (D.vol-100)*0.5; }                     // device volume law (inferred: 0.5 dB per step %)
function chain(){
  const hp = D.plug? HP_MAX_DBU + D.tone + volDb() : -120;                       // analog level at the TRS
  const fs0 = CAL[D.cal].fs0, dbfs = hp - fs0;
  return { hp, dbfs, clip: dbfs>0, floor: -fs0 - 20 + 0, snrNote: fs0 };
}
function ledState(){ const s=D.soc; if (D.usb) return { col: s>=100?'#3ddc6a':'#ffb43a', blink:false, txt: s>=100?'charged':'charging' };
  if (s<=0) return { col:'#222', blink:false, txt:'off (flat)' };
  if (s<=1) return { col:'#e33', blink:true, txt:'red flash ≤ 1 %' }; if (s<=5) return { col:'#e33', blink:false, txt:'red ≤ 5 %' }; if (s<=10) return { col:'#ffcc33', blink:false, txt:'yellow ≤ 10 %' }; return { col:'#3ddc6a', blink:false, txt:'green — good' }; }
function cellV(s){ return 3.0 + 1.2*Math.pow(s/100,0.6) - 0.05*(s<15?(15-s)/15:0); }   // Li-ion OCV curve (inferred)
function runHours(){ return BAT.mAh/BAT.run; }
function outRate(){ return D.ver===1? 48000 : RATES[D.dip]; }
const A = {
  plug(){ act(D.plug?'Unplug the 3.5 mm TRS':'Plug in the iPod (3.5 mm TRS)', tr=>{ D.plug=!D.plug; const c=chain(); tr(D.plug? `L/R on tip/ring → A-to-D; ${c.hp.toFixed(1)} dBu → ${c.dbfs.toFixed(1)} dBFS` : 'input open: the A-to-D sends digital silence (AES still running)'); }); },
  usb(){ act(D.usb?'Unplug micro USB':'Plug micro USB (charge)', tr=>{ D.usb=!D.usb; tr(D.usb? `NCP1851 starts: pre-charge if V < 3.0 V, then constant current ${BAT.chg} mA, then constant voltage 4.2 V (charger profile inferred)` : 'running from the battery'); tr('LED → '+ledState().txt); }); },
  hours(v){ act(`Run time → ${v} h`, tr=>{ D.hours=v; D.soc=Math.max(0, Math.round(100 - v/runHours()*100)); tr(`${BAT.mAh} mAh ÷ ${BAT.run} mA = ${runHours().toFixed(1)} h; after ${v} h: ${D.soc} % (${cellV(D.soc).toFixed(2)} V)`); tr('LED → '+ledState().txt); }); },
  vol(v){ D.vol=v; SIM.refresh(); },
  tone(v){ act(`Generator app tone → ${v} dBFS`, tr=>{ D.tone=v; const c=chain(); tr(`iDevice ${v} dBFS × volume ${D.vol} % (${volDb().toFixed(1)} dB) → ${c.hp.toFixed(1)} dBu at the jack → ${c.dbfs.toFixed(1)} dBFS on the AES output${c.clip?' — <b style="color:var(--bad)">clips</b>':''}`); }); },
  cal(k){ act('A-to-D calibration → '+CAL[k].name, tr=>{ D.cal=k; const c=chain(); tr(`now ${c.dbfs.toFixed(1)} dBFS`); }); },
  ver(v){ act(v===2?'V2: user-selectable SRC':'V1: fixed 48 kHz', tr=>{ D.ver=v; tr(v===2? 'sketch: “V2 with user selectable SRC — SRC control VIA? DIP Switch or Toggle?”' : 'sketch: “High quality A-to-D — Fixed 48Khz out”'); tr(`output rate ${outRate()} Hz`); }); },
  dip(){ act('SRC DIP switch', tr=>{ if (D.ver!==2){ tr('V1 has no SRC switch'); return; } D.dip=(D.dip+1)%RATES.length; tr(`DIP = ${D.dip.toString(2).padStart(2,'0')} → ${outRate()} Hz (rate list inferred)`); }); },
  out(){ act('Output connector', tr=>{ D.out = D.out==='xlr'?'bnc':'xlr'; tr(D.out==='xlr'? 'XLR, 110 Ω balanced AES3 (2–7 V p-p)' : 'BNC, 75 Ω unbalanced AES-3id (1 V p-p)'); tr('register: “digital bnc/xlr”; the sketch shows one connector on the right'); }); },
  f(v){ D.f=v; SIM.refresh(); },
};

/* ---------------- views ---------------- */
const CDR_SRC = 'ENGINEERING - 2016 RD FILES/RD53-iDeviceAtoDAdapter/Portable A-to-D.cdr';
/* Device drawn on the CorelDRAW concept geometry (assets/rd53-ideviceatodadapter-concept.svg, CDR user units).
   Body 348–672 × 232–321; TRS jack 348–414 × 243–258; LED half-dome centre (348.5, 268.85) r 6.5;
   micro USB 349–382 × 281–316 (5 pins); output connector 672–715 × 254–299; A-to-D 445–614 × 238–274; battery 445–614 × 278–314. */
function deviceSVG(){
  const led=ledState(), on = !led.blink || Math.floor(SIM.t*4)%2===0, c=chain();
  const K=1.224, G=`transform="translate(150,62) scale(${K}) translate(-336,-226)"`;
  let s=`<svg viewBox="0 0 640 300" style="width:100%;display:block;border-radius:8px;background:var(--lane);border:1px solid var(--line)" role="img" aria-label="RD53 adapter on the CorelDRAW concept geometry">
    <text x="12" y="20" font-size="12" fill="var(--ink2)">Portable A-to-D.cdr geometry (concept sketch; size not given)</text>
    <g ${G}><image href="${ASSET}rd53-ideviceatodadapter-concept.svg" x="336" y="226" width="392" height="100"/>
    <text x="451" y="252" font-size="8.5" fill="#1b1918">High-quality A-to-D</text><text x="451" y="266" font-size="8.5" fill="#1d6b2c">${outRate()/1000} kHz out${D.ver===2?' (SRC)':' (fixed)'}</text>
    <text x="451" y="291" font-size="8.5" fill="#1b1918">Lithium-ion battery</text><rect x="451" y="297" width="${Math.max(1,D.soc*1.2)}" height="9" fill="${led.col}" stroke="#1b1918" stroke-width=".5"/><text x="609" y="305" font-size="8" text-anchor="end" fill="#1b1918">${D.soc} %</text>
    <g data-a="plug" style="cursor:pointer"><rect x="348.5" y="243.3" width="65.4" height="14.3" fill="transparent"/>${D.plug?`<rect x="300" y="247" width="58" height="7" rx="2" fill="#bbb" stroke="#555" stroke-width=".6"/><rect x="284" y="244" width="18" height="13" rx="2" fill="#555"/><path d="M284,250.5 C270,250 262,262 250,262" stroke="#444" stroke-width="3" fill="none"/>`:''}</g>
    <path d="M348.48,275.38 A6.54,6.54 0 0,1 348.48,262.31 Z" fill="${on?led.col:'#222'}" stroke="#1b1918" stroke-width="1"/>
    <g data-a="usb" style="cursor:pointer"><rect x="348.6" y="280.8" width="33.3" height="35.1" fill="transparent"/>${D.usb?`<rect x="318" y="292" width="31" height="13" rx="2" fill="#444"/><path d="M318,298.5 C300,298 290,312 276,312" stroke="#444" stroke-width="3" fill="none"/>`:''}</g>
    <g data-a="out" style="cursor:pointer"><rect x="672" y="254.2" width="42.8" height="44.9" fill="${D.out==='xlr'?'#a9a9a4':'#c9b469'}" fill-opacity=".55" stroke="none"/><text x="693.4" y="280" font-size="9" text-anchor="middle" font-weight="bold" fill="#1b1918">${D.out==='xlr'?'XLR':'BNC'}</text></g>
    ${D.ver===2?`<g data-a="dip" style="cursor:pointer"><rect x="626" y="296" width="36" height="17" fill="#c33" stroke="#333" stroke-width=".6"/>${[0,1].map(i=>`<rect x="${631+i*14}" y="299" width="10" height="11" fill="#eee"/><rect x="${632+i*14}" y="${(D.dip>>(1-i))&1?300:305}" width="8" height="4" fill="#333"/>`).join('')}</g>`:''}
    </g>
    <text x="12" y="78" font-size="11" fill="var(--ink)">3.5 mm TRS ${D.plug?'(iPod)':'(open)'}</text>
    <text x="12" y="132" font-size="11" fill="var(--ink)">LED: ${led.txt}</text>
    <text x="12" y="${D.usb?222:204}" font-size="11" fill="var(--ink)">Micro USB${D.usb?' (charger)':''}</text>
    <text x="520" y="200" font-size="11" fill="var(--ink)">${D.out==='xlr'?'XLR 110 Ω':'BNC 75 Ω'} AES out</text>
    ${D.ver===2?`<text x="400" y="216" font-size="11" fill="var(--ink)">SRC DIP → ${outRate()} Hz (position inferred)</text>`:''}`;
  s+=`<text x="12" y="250" font-size="11" fill="${c.clip?'var(--bad)':'var(--ink)'}">${D.plug?`${c.hp.toFixed(1)} dBu in → ${c.dbfs.toFixed(1)} dBFS out${c.clip?' (clipping)':''}`:'no input'}</text>
    <text x="12" y="288" font-size="10" fill="var(--ink2)">Click the jack, micro USB, output connector${D.ver===2?' and DIP switch':''}. Body fill colours are inferred; the sketch is line art.</text></svg>`;
  return s;
}
function ctlHTML(){ const c=chain();
  return `<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center">
    <label class="small">iDevice volume <input type="range" min="0" max="100" value="${D.vol}" data-r="vol"> <b class="mono">${D.vol} %</b></label>
    <label class="small">app tone <select data-r="tone">${[0,-6,-12,-18,-20,-24].map(v=>`<option ${v===D.tone?'selected':''}>${v}</option>`).join('')}</select> dBFS</label>
    <label class="small">run time <input type="range" min="0" max="${Math.ceil(runHours()+1)}" step="0.5" value="${D.hours}" data-r="hours"> <b class="mono">${D.hours} h</b></label></div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${Object.keys(CAL).map(k=>`<button data-a="cal" data-v="${k}" class="${D.cal===k?'on':''}">${CAL[k].name}</button>`).join('')}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"><button data-a="ver" data-v="1" class="${D.ver===1?'on':''}">V1 fixed 48 kHz</button><button data-a="ver" data-v="2" class="${D.ver===2?'on':''}">V2 with SRC</button></div>`; }
function levelSVG(){ const c=chain(); const W=600, X=v=>20+(v+60)/64*(W-40);
  const bar=(y,lab,v,col)=>`<text x="20" y="${y-4}" font-size="11" fill="var(--ink2)">${lab}</text><rect x="20" y="${y}" width="${W-40}" height="14" fill="var(--chip)"/><rect x="20" y="${y}" width="${Math.max(0,X(v)-20)}" height="14" fill="${col}"/><text x="${Math.min(W-60,X(v)+4)}" y="${y+11}" font-size="11" fill="var(--ink)">${v.toFixed(1)}</text>`;
  return `<svg viewBox="0 0 ${W} 120" style="width:100%">${bar(22,'Analog at the jack (dBu)',c.hp,'var(--accent2)')}${bar(62,'AES output (dBFS)',c.dbfs,c.clip?'var(--bad)':'var(--accent)')}<line x1="${X(0)}" y1="56" x2="${X(0)}" y2="84" stroke="var(--bad)"/><line x1="${X(-20)}" y1="56" x2="${X(-20)}" y2="84" stroke="var(--ink2)" stroke-dasharray="3 3"/><text x="${X(-20)}" y="98" font-size="10" text-anchor="middle" fill="var(--ink2)">−20 dBFS line-up (POD14A)</text><text x="${X(0)}" y="98" font-size="10" text-anchor="middle" fill="var(--bad)">0 dBFS</text></svg>`; }
function bindAll(root){ bindActs(root,{ plug:()=>A.plug(), usb:()=>A.usb(), out:()=>A.out(), dip:()=>A.dip(), cal:v=>A.cal(v), ver:v=>A.ver(+v) });
  root.querySelectorAll('[data-r]').forEach(e=>{ const k=e.dataset.r; e.onchange=()=>A[k](+e.value); }); }
/* AES3 subframe at time t (24-bit sample in the 20+4 bit field) */
function subframe(t){ const fs=outRate(), n=Math.floor(t*fs), c=chain(); const amp = D.plug? Math.pow(10,Math.min(0,c.dbfs)/20) : 0;
  const v = Math.round(amp*Math.sin(2*Math.PI*D.f*n/fs)*8388607); const fr=n%192; const cs0 = 0x85 | (fs===44100?0x40:fs===32000?0xC0:0) & 0xFF;
  const C = fr<8 ? (cs0>>fr)&1 : 0; const pre = fr===0?'Z (B)':'X (M)'; const u=v & 0xFFFFFF; let ones=0; for (let i=0;i<24;i++) ones+=(u>>i)&1; ones+=C; return { n, fr, v, u, C, V:0, U:0, P:ones&1, pre }; }
function lanes(){ const css=SIM.css, fs=outRate(), led=ledState();
  return [
    {label:`Tone in (${D.f} Hz)`, h:28, draw(c,X,t0,t1,y,h){ const span=t1-t0; if (span*D.f > (X(t1)-X(t0))/3){ laneText(c,X,t0,y,h,`${Math.round(span*D.f)} cycles`); return; } c.strokeStyle=css('--accent2'); c.beginPath(); for (let i=0;i<=500;i++){ const t=t0+span*i/500, yy=y+h/2-(D.plug?Math.sin(2*Math.PI*D.f*t):0)*(h/2-3); i?c.lineTo(X(t),yy):c.moveTo(X(t),yy);} c.stroke(); }},
    {label:`A-to-D samples (${fs/1000} kHz)`, h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/fs,0,0.4/fs,css('--accent'),'samples'); }},
    {label:'AES3 biphase cells (128 × fs)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/(128*fs),0,0.5/(128*fs),css('--ink2'),'cells'); }},
    {label:'Channel-status block (192 frames)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,192/fs,0,2/fs,css('--warn'),'Z preambles / blocks'); }},
    {label:`LED: ${led.txt}`, h:22, draw(c,X,t0,t1,y,h){ if (led.blink) SIM.pulses(c,X,t0,t1,y,h,0.5,0,0.25,'#e33','flashes (2 Hz, inferred)'); else bandAt(c,X,t0,t1,y,h,led.col,.8); }},
    {label:'Battery check (1 Hz, inferred)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1,0.1,0.002,css('--accent2'),'ADC reads'); }},
    {label:'Charger switching (NCP1851, inferred 3 MHz)', h:20, draw(c,X,t0,t1,y,h){ if (!D.usb){ laneText(c,X,t0,y,h,'USB not plugged'); return; } SIM.pulses(c,X,t0,t1,y,h,1/3e6,0,0.5/3e6,css('--warn'),'switching cycles'); }},
  ]; }
function viewSim(m){
  m.innerHTML = `<div class="grid2"><div>${card('The adapter (click jack, USB, connector, DIP)', `<div id="dev"></div><div class="small muted" style="margin:3px 0 6px">Artwork: ${SIM.src(CDR_SRC,'Portable A-to-D.cdr')} (17 Oct 2012), CorelDRAW vector geometry; leader lines and captions dropped, labels re-set.</div><div id="ctl"></div>`)}${card('Level from the iPod to the AES output', `<div id="lv"></div>`)}</div>
    <div>${card('The original concept sketch (Oct 2012)', `<img src="${ASSET}rd53-concept-sketch.png" alt="Portable A-to-D concept sketch" style="width:100%;border-radius:6px;border:1px solid var(--line);background:#fff">`)}${card('What the model did', `<div id="trace" class="log"></div>`)}</div></div>
    ${card('One second of output', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ const d=m.querySelector('#dev'); d.innerHTML=deviceSVG(); bindAll(d); const c=m.querySelector('#ctl'); if(!c.contains(document.activeElement)){ c.innerHTML=ctlHTML(); bindAll(c); }
    m.querySelector('#lv').innerHTML=levelSVG(); m.querySelector('#trace').innerHTML=traceHTML(); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220}); };
  SIM.on('time', draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'The idea', body:`<p>October 2012|45: broadcast engineers carry phones and iPods with tone-generator apps. Kevin sketched a pocket box: 3.5 mm in, AES out, battery inside, so “any device” becomes an AES test generator.</p>`, check:()=>true, auto:true },
  { title:'1 · Plug in', body:`<p>The iPod is plugged in. Set the app tone to <b>−18 dBFS</b> and the volume to <b>100 %</b>. With broadcast calibration the output sits near −40 dBFS: a headphone jack is far quieter than +4 dBu line level.</p>`, check:()=>D.tone===-18&&D.vol===100, hint:'tone −18, volume 100 %.' },
  { title:'2 · Calibrate for the source', body:`<p>Choose the <b>Consumer</b> calibration (2 V rms = 0 dBFS). The same tone now lands near −24 dBFS. The sketch does not say which way the A-to-D was to be scaled.</p>`, check:()=>D.cal==='cons', hint:'Press the Consumer button.' },
  { title:'3 · Run it down', body:`<p>Drag <b>run time</b> until the LED turns yellow (10 %), then red (5 %), then flashing (1 %), as written on the sketch.</p>`, check:()=>D.soc<=1, hint:'Drag run time to 12.5 h.' },
  { title:'4 · Charge', body:`<p>Click the <b>micro USB</b> port to plug a charger. The NCP1851 takes over; the timeline shows its switching.</p>`, check:()=>D.usb, hint:'Click Micro USB on the drawing.' },
  { title:'5 · Version 2', body:`<p>Press <b>V2 with SRC</b> and click the DIP switch to pick another output rate (“SRC control via DIP switch or toggle?”).</p>`, check:()=>D.ver===2&&D.dip>0, hint:'V2, then click the red DIP switch.' },
];
function viewTutorial(m){ tutorialView(m, LESSONS, tutor, { title:'Tutorial — the pocket AES generator', panelTitle:'Adapter', reset,
  panel(el){ if (el.contains(document.activeElement)) return; el.innerHTML = deviceSVG()+ctlHTML()+levelSVG(); bindAll(el); } }); }
function viewSecond(m){
  m.innerHTML = `${card('Events in one second', `<div id="ev"></div>`)}<div class="grid2">${card('AES3 subframe at the playhead (channel 1)', `<div id="sf"></div>`)}${card('Battery', `<div id="bt"></div>`)}</div>`;
  const draw=()=>{ const fs=outRate(), s=subframe(SIM.t);
    m.querySelector('#ev').innerHTML = tbl(['Event','per second','period'],[['A-to-D samples (per channel)',fs.toLocaleString(),SIM.fmtDur(1/fs)],['AES3 frames',fs.toLocaleString(),SIM.fmtDur(1/fs)],['Biphase cells',(128*fs).toLocaleString(),SIM.fmtDur(1/(128*fs))],['Channel-status blocks',(fs/192).toFixed(2),SIM.fmtDur(192/fs)],['Battery used',(BAT.run/3600).toFixed(4)+' mAh',''],['Tone cycles',D.f,SIM.fmtDur(1/D.f)]].map(r=>[r[0],`<span class="mono">${r[1]}</span>`,`<span class="mono">${r[2]}</span>`]));
    const bits=s.u.toString(2).padStart(24,'0');
    m.querySelector('#sf').innerHTML = kv([['Frame',`${s.n.toLocaleString()} (block frame ${s.fr})`,1],['Preamble',s.pre,1],['Sample (24-bit)',`${s.v} = 0x${s.u.toString(16).toUpperCase().padStart(6,'0')}`,1],['Bits 4–27 (LSB first)',bits.split('').reverse().join(''),1],['V U C P',`${s.V} ${s.U} ${s.C} ${s.P}`,1]])+`<p class="small muted">Channel-status byte 0 = 0x${hex2(0x85|(fs===44100?0x40:fs===32000?0xC0:0))} (professional, no emphasis, rate code) — AES3 layout ${inf}.</p>`;
    m.querySelector('#bt').innerHTML = kv([['Cell',`${BAT.mAh} mAh Li-ion ${inf}`],['Draw',`${BAT.run} mA running ${inf}`],['Runtime',runHours().toFixed(1)+' h'],['State of charge',D.soc+' %'],['Cell voltage',cellV(D.soc).toFixed(2)+' V '+inf],['LED',ledState().txt]]);
  };
  SIM.on('time', draw);
}
function viewBlock(m){
  const B={
    src:{x:20,y:40,w:140,h:70,t:'iPod / iPad',s:['tone app','headphone out'],d:'Any device with a 3.5 mm output (Notes: or Bluetooth / Wi-Fi).'},
    trs:{x:200,y:40,w:140,h:70,t:'3.5 mm TRS in',s:['unbalanced L/R'],d:'From the sketch.', live:()=>D.plug},
    adc:{x:380,y:40,w:160,h:70,t:'High-quality A-to-D',s:['fixed 48 kHz (V1)','SRC (V2)'],d:'Sketch: “High quality A-to-D, fixed 48Khz out”; V2 adds selectable SRC.'},
    aes:{x:580,y:40,w:150,h:70,t:'AES3 out',s:['BNC 75 Ω / XLR 110 Ω'],d:'Register: “digital bnc/xlr”. Transmitter part not named (inferred).'},
    usb:{x:200,y:170,w:140,h:70,t:'Micro USB',s:['power · charge · firmware?'],d:'Sketch, with a question mark on firmware.', live:()=>D.usb},
    chg:{x:380,y:170,w:160,h:70,t:'NCP1851 charger',s:['Li-ion switching'],d:'Notes.txt: “fully programmable lithium ion switching battery charger”.', live:()=>D.usb},
    bat:{x:580,y:170,w:150,h:70,t:'Li-ion cell',s:['“Universal”'],d:'Size not stated; 1200 mAh in the model is inferred.'},
    led:{x:20,y:170,w:140,h:70,t:'LED',s:['green / yellow / red / flash'],d:'Thresholds 10 %, 5 %, 1 % from the sketch.'},
  };
  blockView(m,B,[['src','trs',''],['trs','adc',''],['adc','aes',''],['usb','chg',''],['chg','bat',''],['bat','adc','power'],['bat','led','level']],{start:'adc',w:750,h:270,side:'<p>A battery-powered A-to-D in a pocket: everything POD14A does, minus the mains supply and the rate choices.</p>'});
}
const SHEETS=[
  { name:'1 · Audio path (concept)', note:'Only the connector, the 48 kHz rate and the SRC option are from the sketch; the chips are placeholders (inferred).', svg:()=>
    chip(80,90,150,'J1 3.5 mm TRS',[['T','L'],['R','R'],['S','GND']],[['L/R','to ADC']],'sketch') + chip(350,90,170,'ADC + AES Tx',[['AINL/AINR','unbalanced'],['MCLK','12.288 MHz (inferred)']],[['TXP/TXN','AES3'],['SRC_SEL','DIP (V2)']],'inferred') + chip(650,90,150,'J2 XLR / BNC',[['1','GND'],['2/3','AES ±']],[],'110 Ω / 75 Ω') },
  { name:'2 · Power (concept)', note:'NCP1851 from Notes.txt; everything else inferred.', svg:()=>
    chip(80,90,150,'J3 micro USB',[['VBUS','5 V'],['D+/D−','firmware?'],['GND','']],[['VBUS','to charger']],'sketch') + chip(350,90,170,'NCP1851',[['VBUS','5 V in'],['I2C','programming']],[['SW','buck to cell'],['BAT','4.2 V CV']],'Notes.txt') + chip(650,90,150,'Li-ion cell',[['+','3.0–4.2 V']],[['→ LDO','3.3 V rails']],'“universal”') },
];
function viewSchem(m){ sheetsView(m, SHEETS, 'the RD53 concept sketch and Notes.txt', 'RD53 never reached a schematic. These two sheets put the sketch’s parts in circuit order.'); }
function viewSoft(m){
  m.innerHTML = `<div class="grid2">${card('Battery / LED state machine (inferred firmware)', `<div id="sm"></div>`)}${card('Main loop (step at the playhead)', `<div id="ml"></div>`)}</div>`;
  const draw=()=>{ const st=['GOOD (> 10 %) — green','LOW (≤ 10 %) — yellow','VERY LOW (≤ 5 %) — red','CRITICAL (≤ 1 %) — red flash','CHARGING (USB) — amber/green'];
    const on = D.usb?4: D.soc>10?0: D.soc>5?1: D.soc>1?2:3;
    m.querySelector('#sm').innerHTML = flowSVG(st,on)+`<p class="small">Thresholds are the sketch’s; the state-machine form is ${inf}.</p>`;
    const ml=['read battery ADC (1 Hz)','update SOC estimate','set LED colour / blink','read SRC DIP (V2)','program SRC output rate','USB present? → charger status','sleep until next tick'];
    m.querySelector('#ml').innerHTML = flowSVG(ml, Math.floor(SIM.t*7)%7);
  };
  SIM.on('time', draw);
}
function viewFindings(m){
  m.innerHTML = card('What RD53 decided, and what became of it', `<ol>
    <li><b>Artwork 2026|59: the adapter drawing now comes from ${SIM.src(CDR_SRC,'Portable A-to-D.cdr')} (17 Oct 2012).</b> It is a concept sketch, not a panel: line art with no scale, colours or legends. Its geometry places the TRS jack and LED dome on the left end above the micro USB (5 pins drawn), the A-to-D and battery as two stacked blocks, and one unlabelled output connector with two tabs on the right end. No position is drawn for the V2 SRC DIP switch; the model puts it beside the battery (inferred). In libcdr the block captions overflow their boxes (“High quality A-to-D-Fixed 48Khz out”), so the labels are re-set by the plugin.</li>
    <li><b>Outcome: a one-page concept.</b> The sketch and notes date from 17–18 Oct 2012|45. The register stays at “?”; no schematic, part list or enclosure followed. The closest shipping product is <b>POD14A</b>, a mains-powered dual A-to-D with AES outputs (32–192 kHz, −20 dBFS = +4 dBu).</li>
    <li><b>Level is the real problem.</b> A phone’s headphone output is about 1 V rms at most ${inf}. Through a broadcast-calibrated A-to-D (+24 dBu = 0 dBFS) a −18 dBFS app tone arrives near −40 dBFS. The adapter needs consumer-level scaling or input gain. The sketch does not mention either.</li>
    <li><b>“Fixed 48 kHz” vs the V2 SRC.</b> V1 is fixed at 48 kHz. V2 adds a user-selectable sample-rate converter, with the control still an open question (“DIP switch or toggle?”).</li>
    <li><b>LED thresholds are partly open.</b> Green good, yellow 10 % (with a question mark), red 5 %, red flashing 1 %.</li>
    <li><b>Connector not chosen.</b> The register asks for “digital bnc/xlr”; the sketch draws a single unlabelled connector. The model lets you switch between the two.</li>
    <li><b>Firmware was in mind.</b> The sketch labels the micro USB “Power-Charge-Firmware?”. The sketch is stored twice, as the .cdr original and its .pdf export.</li>
    <li><b>Wireless was considered.</b> Notes.txt offers Bluetooth or Wi-Fi as alternatives to the TRS lead.</li>
    <li><b>Same week, same people.</b> RD53, RD54 (switcher) and RD56 (Raspberry Pi) all date from 17–19 Oct 2012, which looks like a single product-ideas session.</li>
  </ol>`) + card('Assumptions', `<ul class="small"><li>Battery size, current draw, charge current, cell curve and charger switching frequency ${inf}.</li><li>Headphone output level and the device volume law ${inf}.</li><li>AES3 channel-status layout is from the standard, not the archive ${inf}.</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>RD53-iDeviceAtoDAdapter/Notes.txt · Portable A-to-D.pdf / .cdr</li><li>#POD #SERIES/POD14A - #Master/README.md · R&amp;D_List.xls (RD53)</li><li>assets/rd53-concept-sketch.png (rendered from Portable A-to-D.pdf)</li><li>assets/rd53-ideviceatodadapter-concept.svg (geometry from ${SIM.src(CDR_SRC,'Portable A-to-D.cdr')})</li></ul>`);
}

SIM.register({
  id:'rd53-ideviceatodadapter', name:'RD53 iDevice A-to-D adapter · battery AES generator concept (2012|45)', duration:1,
  product:'RD53 iDevice A-to-D Adapter', year:2012, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD53-iDeviceAtoDAdapter',
  summary:'Kevin’s October 2012 sketch of a pocket adapter that turns an iPod’s headphone output into AES3, modelled from the sketch. Plug, charge and run down the battery, watch the LED states, and follow a tone from the app to dBFS on the AES output.',
  highlights:['Adapter redrawn from the concept sketch, clickable','LED thresholds 10 / 5 / 1 % from the sketch','Level path from iPod to AES dBFS','AES3 subframe at the playhead','V1 fixed 48 kHz vs V2 SRC'],
  depth:'Hardware model',
  footnotes:[
    { text:'Portable A-to-D.cdr is a line-art concept sketch, not a panel: no scale, colours or legends are given, so the drawing’s size and body colours are not from the archive.', src:'ENGINEERING - 2016 RD FILES/RD53-iDeviceAtoDAdapter/Portable A-to-D.cdr' },
    { text:'The block captions overflow their boxes in the CDR (“High quality A-to-D-Fixed 48Khz out”, “Lithium ION Battery-Universal”); the PDF export shows them wrapped onto two lines.', src:'ENGINEERING - 2016 RD FILES/RD53-iDeviceAtoDAdapter/Portable A-to-D.cdr' },
    { text:'The sketch draws one unlabelled output connector with two tabs on the right end, while the R&amp;D register asks for “digital bnc/xlr”.', src:'ENGINEERING - 2016 RD FILES/RD53-iDeviceAtoDAdapter/Portable A-to-D.cdr' },
    { text:'V2’s user-selectable SRC has no drawn position: the note asks “SRC control VIA? DIP Switch or Toggle?”.', src:'ENGINEERING - 2016 RD FILES/RD53-iDeviceAtoDAdapter/Portable A-to-D.cdr' },
    { text:'The LED yellow threshold carries a question mark (“Yellow 10%?”); red is 5 % and red flashing 1 %.', src:'ENGINEERING - 2016 RD FILES/RD53-iDeviceAtoDAdapter/Portable A-to-D.cdr' },
    { text:'Micro USB is labelled “Power-Charge-Firmware?”, the only hint that the adapter would carry updatable firmware.', src:'ENGINEERING - 2016 RD FILES/RD53-iDeviceAtoDAdapter/Portable A-to-D.cdr' },
    { text:'The same sketch is stored twice, as the CorelDRAW original and as a PDF export of it.', src:'ENGINEERING - 2016 RD FILES/RD53-iDeviceAtoDAdapter/Portable A-to-D.pdf' },
  ],
  stepUnits:[{label:'1 AES frame',period:()=>1/outRate()},{label:'1 channel-status block',period:()=>192/outRate()},{label:'0.25 s',period:()=>0.25}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.005,'5 ms'],[0.0002,'200 µs']],
  defaultZoom:2,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: pocket generator', render:viewTutorial},
    {id:'second', label:'One second of AES', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
