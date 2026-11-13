/* =====================================================================
   RD18 — PCB Designer (Ward-Beck R&D register, Peter, status Z = completed)
   Plugin for the WBS Device Simulator (../siumulation.html)

   RD18 was in-house PCB layout, signal-integrity and EMC self-study (2011|44–2012|45).
   The WBS-written notes are the core of this model:
   - RD18 …/Peter/TerminationNotes.txt  (AC/RC termination: R = Z0; "the RC time constant must be greater
       than twice the loaded propagation delay"; RC > round-trip time; not for RS-422 or current-mode drivers;
       pattern-dependent jitter)
   - RD18 …/Peter/BoardDesignNotes.txt  (layer count: continuous reference plane, even/balanced stack-up,
       dedicated layers, split planes next to a solid ground, flood outer layers)
   - RD18 …/Peter/SignalIntegritySWNotes.txt (Altium SI: IBIS 3.0 in Winter 09, IBIS 5.0 in the March 2012
       release, reflection + crosstalk only, to 1.25 GHz, ~$2,000 upgrade; the vendor's own FAE recommends HyperLynx)
   - RD18 …/Peter/GroundLoopDesignTechnique.txt.txt (hum at 50/60 Hz and harmonics; single-point ground;
       shield/chassis ring joined at one point; 2200 pF @ 2 kV for isolated supplies; star ground)
   - Reference PDFs in the folder: National AN-903 termination, IPC-2221, StackupExample.pdf,
       TU0113 Altium SI tutorial, HyperLynx "Pro Tune Up 4" labs (third-party; not reproduced).
   Vendor and designer names in the notes and LayoutDesignerContacts.xlsx are not reproduced.
   The transmission-line solver (method of characteristics) and the microstrip formula are inferred
   standard practice, marked as such on screen.
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

/* ================= product model ================= */
const TERMS = { none:'None (open CMOS input)', series:'Series (source) R', parallel:'Parallel R to GND', thevenin:'Thévenin (R1 to Vcc, R2 to GND)', ac:'AC / RC (R + C to GND)' };
const D = { term:'none', Z0:50, len:6, er:4.3, ro:10, rs:40, rp:50, rth1:100, rth2:100, rac:50, cac:100e-12, cin:5e-12, vcc:3.3, tr:1e-9, f:24.576e6, hum:false,
  w:0.012, h:0.0063, t:0.0014, layers:4 };
function reset(){ Object.assign(D,{term:'none',Z0:50,len:6,er:4.3,ro:10,rs:40,rp:50,rth1:100,rth2:100,rac:50,cac:100e-12,cin:5e-12,vcc:3.3,tr:1e-9,f:24.576e6,hum:false,w:0.012,h:0.0063,t:0.0014,layers:4}); KEY=''; LOG.items=[]; SIM.refresh(); }
/* microstrip (IPC-2141 form, inferred): Z0 = 87/√(εr+1.41)·ln(5.98h/(0.8w+t)); delay ≈ 85·√(0.475εr+0.67) ps/in */
const msZ0 = ()=> 87/Math.sqrt(D.er+1.41)*Math.log(5.98*D.h/(0.8*D.w+D.t));
const psPerIn = ()=> 85*Math.sqrt(0.475*D.er+0.67);
const Td = ()=> D.len*psPerIn()*1e-12;
const FREQS = [[12.288e6,'12.288 MHz (256·fs)'],[24.576e6,'24.576 MHz (512·fs)'],[27e6,'27 MHz (SD video)'],[74.25e6,'74.25 MHz (HD video)'],[148.5e6,'148.5 MHz (3G video)']];
/* ---------------- method-of-characteristics solver (lossless line) ---------------- */
let KEY='', SOL=null;
function solve(){
  const key=JSON.stringify(D); if (key===KEY) return SOL; KEY=key;
  const td=Td(), n=Math.max(20, Math.round(td/2e-12)); const dt=td/n; const T=1/D.f; const periods=6; const N=Math.ceil(periods*T/dt);
  const Rs = D.ro + (D.term==='series'? D.rs : 0), Z=D.Z0;
  const aH=new Float32Array(N), bH=new Float32Array(N), vA=new Float32Array(N), vB=new Float32Array(N);
  let vcin=0, vcac=0, pR=0;
  const src = t=>{ const ph=(t%T)/T; const hi=T/2; const tt=t%T; const r=D.tr; let v; if (tt<r) v=tt/r; else if (tt<hi) v=1; else if (tt<hi+r) v=1-(tt-hi)/r; else v=0; return v*D.vcc; };
  for (let k=0;k<N;k++){
    const t=k*dt; const b = k>=n ? bH[k-n] : 0;            // backward wave arriving at source
    const a = (src(t)*Z - b*(Z-Rs))/(Z+Rs); aH[k]=a; vA[k]=a+b;
    const f = k>=n ? aH[k-n] : 0;                           // forward wave arriving at load
    let G=0, I=0; const br=(R,V)=>{ G+=1/R; I+=V/R; };
    br(dt/D.cin, vcin);
    if (D.term==='parallel') br(D.rp,0);
    if (D.term==='thevenin'){ br(D.rth1,D.vcc); br(D.rth2,0); }
    if (D.term==='ac') br(D.rac + dt/D.cac, vcac);
    const Rth=1/G, Vth=I/G; const r=(f*(Rth-Z) + Vth*Z)/(Rth+Z); bH[k]=r; const v=f+r; vB[k]=v;
    if (D.term==='ac'){ const i=(v-vcac)/(D.rac+dt/D.cac); vcac+=i*dt/D.cac; pR+=i*i*D.rac*dt; }
    if (D.term==='parallel' && k*dt>=(periods-1)*T) pR+=v*v/D.rp*dt;
    if (D.term==='thevenin' && k*dt>=(periods-1)*T) pR+=((D.vcc-v)**2/D.rth1 + v*v/D.rth2)*dt;
    vcin=v;
  }
  // last period statistics
  const k0=Math.floor((periods-1)*T/dt); let mx=-1e9, mn=1e9; for (let k=k0;k<N;k++){ mx=Math.max(mx,vB[k]); mn=Math.min(mn,vB[k]); }
  const pw = D.term==='ac' ? pR/(periods*T) : pR/T;
  SOL={dt,n,N,T,vA,vB,over:mx-D.vcc,under:-mn,mx,mn,pw,periods,k0};
  return SOL;
}
function vAt(arr, t){ const S=SOL||solve(); let tt=t; if (tt >= S.periods*S.T) tt = (S.periods-1)*S.T + ((tt-(S.periods-1)*S.T) % S.T); const k=Math.min(S.N-1,Math.floor(tt/S.dt)); return arr[k]; }
function checks(){
  const td=Td(), S=solve(), rows=[];
  rows.push(['Line electrically long?', `Td ${SIM.fmtDur(td)} vs edge ${SIM.fmtDur(D.tr)}: ${td>D.tr/6?'<b>yes</b> (Td > tr/6) — terminate':'no — short enough to leave'} ${inf}`]);
  if (D.term==='series') rows.push(['Series R', `Ro + Rs = ${D.ro+D.rs} Ω vs Z0 ${D.Z0} Ω → ${Math.abs(D.ro+D.rs-D.Z0)<=5?'matched':'mismatch'} (source wave = Vcc/2, doubles at the open end)`]);
  if (D.term==='parallel') rows.push(['Parallel R', `${D.rp} Ω, average power ${fmt(S.pw*1e3,1)} mW — DC current while high`]);
  if (D.term==='thevenin') rows.push(['Thévenin', `R1‖R2 = ${fmt(D.rth1*D.rth2/(D.rth1+D.rth2),1)} Ω (should equal Z0), power ${fmt(S.pw*1e3,1)} mW always`]);
  if (D.term==='ac'){ const rc=D.rac*D.cac; rows.push(['RC rule (TerminationNotes.txt)', `RC = ${SIM.fmtDur(rc)} vs 2·Td = ${SIM.fmtDur(2*td)} → ${rc>2*td?'✓ RC > 2·Td':'<b style="color:var(--bad)">✗ too small: “acts as an edge generator, causing overshoot”</b>'}`]);
    rows.push(['R = Z0?', `${D.rac} Ω vs ${D.Z0} Ω ${D.rac===D.Z0?'✓':'✗'}`]); rows.push(['Power', `${fmt(S.pw*1e3,2)} mW (C blocks DC)`]); }
  rows.push(['Overshoot / undershoot at load', `${fmt(S.over,2)} V / ${fmt(S.under,2)} V (steady state)`]);
  return rows;
}
const A = {
  term(k){ act('Termination → '+TERMS[k], tr=>{ D.term=k; const S=solve(); tr(`Solver: ${S.n} steps per Td, ${S.periods} clock periods, then periodic`);
    if (k==='ac') tr('TerminationNotes.txt: “The value of R must match the Z0 of the line… the RC time constant must be greater than twice the loaded propagation delay”');
    if (k==='series') tr('Series: the wave leaves at half amplitude and doubles at the open load; no DC power');
    tr(`Load swings ${fmt(S.mn,2)} … ${fmt(S.mx,2)} V`); }); },
  set(k, d){ const steps={ len:[1,1,24], Z0:[5,25,100], rs:[5,0,100], rp:[5,25,200], rac:[5,25,200], ro:[5,0,60], er:[0.1,2,10] }; act(`${k} ${d>0?'+':'−'}`, tr=>{ const [st,lo,hi]=steps[k]; D[k]=+clamp(D[k]+d*st,lo,hi).toFixed(2); tr(`${k} = ${D[k]}`); if (k==='len'||k==='er') tr(`Td = ${D.len} in × ${fmt(psPerIn(),1)} ps/in = ${SIM.fmtDur(Td())}`); }); },
  cac(d){ act('C '+(d>0?'×2':'÷2'), tr=>{ D.cac=clamp(D.cac*(d>0?2:0.5),5e-12,10e-9); tr(`C = ${fmt(D.cac*1e12,0)} pF; RC = ${SIM.fmtDur(D.rac*D.cac)} vs 2·Td = ${SIM.fmtDur(2*Td())}`); }); },
  tr(d){ act('Edge '+(d>0?'slower':'faster'), tr=>{ D.tr=clamp(D.tr*(d>0?2:0.5),0.125e-9,8e-9); tr(`rise time ${SIM.fmtDur(D.tr)} (TSMV VCXO spec: 8 ns max below 50 MHz, 4 ns above — RD-HardwareImprovements/Oscillators/tsmv.pdf)`); }); },
  freq(v){ act('Clock '+FREQS[v][1], tr=>{ D.f=FREQS[v][0]; tr(`period ${SIM.fmtDur(1/D.f)}`); }); },
  geom(k,d){ act(`${k} ${d>0?'+':'−'}1 mil`, tr=>{ D[k]=clamp(D[k]+d*0.001,0.001,0.05); const z=msZ0(); tr(`Microstrip Z0 ≈ ${fmt(z,1)} Ω (w ${fmt(D.w*1000,0)} mil, h ${fmt(D.h*1000,1)} mil, εr ${D.er}) ${inf}`); D.Z0=Math.round(z); tr('Line Z0 set to the stack-up value'); }); },
  layers(d){ act('Layers', tr=>{ D.layers=clamp(D.layers+d*2,2,8); tr(`${D.layers} layers — BoardDesignNotes.txt: “The number of layers should be even, and the core and prepreg dielectric thicknesses should be balanced”`); if (D.layers===2) tr('Two layers: no continuous reference plane next to every signal layer → no controlled impedance (note 1)'); }); },
  hum(){ act(D.hum?'Ground loop removed':'Ground loop added', tr=>{ D.hum=!D.hum; tr(D.hum?'Two chassis on different outlets: hum at 60 Hz and harmonics (GroundLoopDesignTechnique.txt)':'Single-point ground: chassis joined to the circuit ground at one point'); }); },
};
/* ---------------- drawings ---------------- */
function circuitSVG(){
  const t=D.term, on=k=>t===k; const W=900,H=230;
  let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;background:var(--lane);border:1px solid var(--line);border-radius:8px" role="img" aria-label="driver, line, termination">
   <polygon points="40,90 40,150 90,120" fill="var(--panel2)" stroke="var(--ink)"/><text x="30" y="175" font-size="11" fill="var(--ink2)">driver Ro ${D.ro} Ω</text>
   <g data-a="term" data-v="series" style="cursor:pointer"><rect x="110" y="110" width="60" height="20" fill="${on('series')?'var(--accent)':'var(--panel2)'}" stroke="var(--ink)"/><text x="115" y="104" font-size="11" fill="var(--ink)">Rs ${D.rs}</text></g>
   <line x1="90" y1="120" x2="110" y2="120" stroke="var(--ink)"/><line x1="170" y1="120" x2="220" y2="120" stroke="var(--ink)"/>
   <rect x="220" y="108" width="380" height="24" rx="12" fill="color-mix(in srgb,var(--accent2) 25%,var(--panel2))" stroke="var(--ink)"/><text x="410" y="125" text-anchor="middle" font-size="12" fill="var(--ink)">Z0 ${D.Z0} Ω · ${D.len} in · Td ${SIM.fmtDur(Td())}</text>
   <line x1="600" y1="120" x2="800" y2="120" stroke="var(--ink)"/><polygon points="800,100 800,140 830,120" fill="var(--panel2)" stroke="var(--ink)"/><text x="790" y="165" font-size="11" fill="var(--ink2)">CMOS in ${fmt(D.cin*1e12,0)} pF</text>
   <g data-a="term" data-v="parallel" style="cursor:pointer"><line x1="640" y1="120" x2="640" y2="150" stroke="var(--ink)"/><rect x="630" y="150" width="20" height="40" fill="${on('parallel')?'var(--accent)':'var(--panel2)'}" stroke="var(--ink)"/><text x="604" y="210" font-size="11" fill="var(--ink)">Rp ${D.rp}</text></g>
   <g data-a="term" data-v="thevenin" style="cursor:pointer"><line x1="690" y1="120" x2="690" y2="80" stroke="var(--ink)"/><rect x="680" y="40" width="20" height="40" fill="${on('thevenin')?'var(--accent)':'var(--panel2)'}" stroke="var(--ink)"/><text x="660" y="32" font-size="11" fill="var(--ink)">R1 to Vcc</text><line x1="690" y1="120" x2="690" y2="150" stroke="var(--ink)"/><rect x="680" y="150" width="20" height="40" fill="${on('thevenin')?'var(--accent)':'var(--panel2)'}" stroke="var(--ink)"/><text x="672" y="210" font-size="11" fill="var(--ink)">R2</text></g>
   <g data-a="term" data-v="ac" style="cursor:pointer"><line x1="740" y1="120" x2="740" y2="150" stroke="var(--ink)"/><rect x="730" y="150" width="20" height="26" fill="${on('ac')?'var(--accent)':'var(--panel2)'}" stroke="var(--ink)"/><line x1="728" y1="184" x2="752" y2="184" stroke="var(--ink)" stroke-width="2"/><line x1="728" y1="190" x2="752" y2="190" stroke="var(--ink)" stroke-width="2"/><text x="722" y="210" font-size="11" fill="var(--ink)">R+C</text></g>
   <text x="20" y="22" font-size="12" fill="var(--ink)">Click a termination to fit it (selected: <tspan font-weight="700">${TERMS[t]}</tspan>)</text></svg>`;
  return s;
}
function stackSVG(){
  const n=D.layers, W=420; let s=`<svg viewBox="0 0 ${W} ${40+n*34}" style="width:100%">`;
  for (let i=0;i<n;i++){ const y=10+i*34; const plane = n>2 && (i===1 || i===n-2); const nm = i===0?'L1 signal (microstrip)':i===n-1?`L${n} signal`:plane?(i===1?`L${i+1} GND plane`:`L${i+1} power (split ok, next to GND)`):`L${i+1} inner signal`;
    s+=`<rect x="10" y="${y}" width="${W-20}" height="6" fill="${plane?'#b87333':'#d9a066'}"/><text x="14" y="${y+20}" font-size="11" fill="var(--ink)">${nm}</text>`; if (i<n-1) s+=`<rect x="10" y="${y+6}" width="${W-20}" height="28" fill="color-mix(in srgb,var(--accent) 8%,transparent)"/><text x="${W-120}" y="${y+24}" font-size="10" fill="var(--ink2)">${i%2?'prepreg':'core'}</text>`; }
  return s+`<text x="10" y="${30+n*34}" font-size="11" fill="var(--ink2)">${n} layers · balanced = ${n%2===0?'yes':'no'} · microstrip Z0 ≈ ${fmt(msZ0(),1)} Ω (${'IPC-2141 formula, inferred'})</text></svg>`;
}
function bounceSVG(){ // lattice diagram: first reflections
  const Rs=D.ro+(D.term==='series'?D.rs:0), Z=D.Z0; const gs=(Rs-Z)/(Rs+Z);
  let RL; if (D.term==='parallel') RL=D.rp; else if (D.term==='thevenin') RL=D.rth1*D.rth2/(D.rth1+D.rth2); else if (D.term==='ac') RL=D.rac; else RL=1e9;
  const gl=(RL-Z)/(RL+Z); const v0=D.vcc*Z/(Z+Rs); let s=`<svg viewBox="0 0 420 300" style="width:100%"><line x1="60" y1="20" x2="60" y2="290" stroke="var(--ink)"/><line x1="360" y1="20" x2="360" y2="290" stroke="var(--ink)"/><text x="40" y="14" font-size="11" fill="var(--ink)">source Γs ${fmt(gs,2)}</text><text x="300" y="14" font-size="11" fill="var(--ink)">load ΓL ${fmt(gl,2)}${D.term==='ac'?' (edge)':''}</text>`;
  let amp=v0, vL=0, vS=v0;
  for (let i=0;i<8;i++){ const y0=24+i*33, y1=y0+33; const fwd=i%2===0; s+=`<line x1="${fwd?60:360}" y1="${y0}" x2="${fwd?360:60}" y2="${y1}" stroke="var(--accent)" marker-end=""/><text x="${fwd?150:220}" y="${(y0+y1)/2-3}" font-size="10" fill="var(--accent)">${fmt(amp,2)} V</text>`;
    if (fwd){ vL+=amp*(1+gl); s+=`<text x="366" y="${y1+4}" font-size="10" fill="var(--ink)">VL ${fmt(vL,2)}</text>`; amp*=gl; } else { vS+=amp*(1+gs); s+=`<text x="4" y="${y1+4}" font-size="10" fill="var(--ink)">VS ${fmt(vS,2)}</text>`; amp*=gs; }
    if (Math.abs(amp)<0.005) break; }
  return s+`<text x="60" y="296" font-size="10" fill="var(--ink2)">each row = one Td (${SIM.fmtDur(Td())}); ideal step, lumped C ignored</text></svg>`;
}
function bindAll(r){ bindActs(r,{ term:v=>A.term(v), s:v=>{ const [k,d]=v.split(','); A.set(k,+d); }, c:v=>A.cac(+v), tr:v=>A.tr(+v), fq:v=>A.freq(+v), g:v=>{ const [k,d]=v.split(','); A.geom(k,+d); }, ly:v=>A.layers(+v), hum:()=>A.hum(), rst:()=>reset() }); }
function controlsHTML(){ const b=(k,l)=>`<span class="small muted">${l} ${D[k]}</span><button data-a="s" data-v="${k},-1">−</button><button data-a="s" data-v="${k},1">+</button>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin-top:8px">${Object.keys(TERMS).map(k=>`<button data-a="term" data-v="${k}" class="${D.term===k?'on':''}">${k}</button>`).join('')}</div>
  <div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin-top:6px">${b('len','length in')}${b('Z0','Z0 Ω')}${b('ro','Ro')}${b('rs','Rs')}${b('rp','Rp')}${b('rac','R(ac)')}<span class="small muted">C ${fmt(D.cac*1e12,0)} pF</span><button data-a="c" data-v="-1">÷2</button><button data-a="c" data-v="1">×2</button><span class="small muted">edge ${SIM.fmtDur(D.tr)}</span><button data-a="tr" data-v="-1">faster</button><button data-a="tr" data-v="1">slower</button>
  <select id="fq">${FREQS.map((f,i)=>`<option value="${i}" ${f[0]===D.f?'selected':''}>${f[1]}</option>`).join('')}</select><button data-a="hum">${D.hum?'remove ground loop':'add ground loop'}</button><button data-a="rst">defaults</button></div>`; }
function bindControls(r){ bindAll(r); const f=r.querySelector('#fq'); if (f) f.onchange=e=>A.freq(+e.target.value); }
function lanes(){
  const css=SIM.css, S=solve();
  const wv=(arr,col)=>({h:46, draw(c,X,t0,t1,y,h){ const span=t1-t0; if (span/S.T > 400){ laneText(c,X,t0,y,h,`${Math.round(span/S.T).toLocaleString()} clock cycles — zoom to “100 ns”`); return; }
      c.strokeStyle=css('--grid'); [0,D.vcc].forEach(v=>{ const yy=y+h-4-v/(D.vcc*1.6)*(h-8)-0.15*(h-8); c.beginPath(); c.moveTo(X(t0),yy); c.lineTo(X(t1),yy); c.stroke(); });
      c.strokeStyle=col; c.lineWidth=1.3; c.beginPath(); const N=Math.min(2000,Math.max(300,(X(t1)-X(t0))*2)); for(let i=0;i<=N;i++){ const t=t0+span*i/N; const v=vAt(arr,t); const yy=y+h-4-(v/(D.vcc*1.6)+0.15)*(h-8); i?c.lineTo(X(t),yy):c.moveTo(X(t),yy);} c.stroke(); c.lineWidth=1; }});
  return [
    Object.assign({label:`Clock ${fmt(D.f/1e6,3)} MHz edges`}, {h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/D.f,0,D.tr,css('--ink2'),'rising edges'); }}),
    Object.assign({label:'V at driver end (A)'}, wv(S.vA, css('--accent2'))),
    Object.assign({label:`V at load (B), ${D.term}`}, wv(S.vB, css('--accent'))),
    {label:'Round trips (2·Td)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,2*Td(),0,Td()*0.1,css('--warn'),'reflection arrivals'); }},
    {label:'Ground-loop hum 60/120/240 Hz', h:30, draw(c,X,t0,t1,y,h){ if(!D.hum){ laneText(c,X,t0,y,h,'single-point ground — no hum'); return; } c.strokeStyle=css('--bad'); c.beginPath(); const N=800; for(let i=0;i<=N;i++){ const t=t0+(t1-t0)*i/N; const v=Math.sin(2*Math.PI*60*t)+0.4*Math.sin(2*Math.PI*120*t)+0.2*Math.sin(2*Math.PI*240*t); const yy=y+h/2-v*(h/2-3)/1.6; i?c.lineTo(X(t),yy):c.moveTo(X(t),yy);} c.stroke(); }},
  ];
}
function viewSim(m){
  m.innerHTML = `<div class="grid2"><div>${card('The test board — driver, line, termination (click to fit)', `<div id="ck"></div><div id="ctl"></div>`)}${card('Design checks at these settings', `<div id="chk"></div>`)}</div>
    <div>${card('What the model did', `<div id="trace" class="log"></div>`)}${card('Bounce (lattice) diagram', `<div id="bd"></div>`)}${card('Stack-up (BoardDesignNotes.txt) — w / h / layers', `<div id="sk"></div><div style="display:flex;gap:5px;flex-wrap:wrap"><button data-a="g" data-v="w,-1">w −</button><button data-a="g" data-v="w,1">w +</button><button data-a="g" data-v="h,-1">h −</button><button data-a="g" data-v="h,1">h +</button><button data-a="ly" data-v="-1">layers −</button><button data-a="ly" data-v="1">layers +</button></div>`)}</div></div>
    ${card('Timeline — zoom from a second of hum to single nanoseconds', `<canvas id="tl"></canvas><p class="small muted">Lossless line solved by the method of characteristics (${inf}: the folder has the rules, not a solver). The first ${solve().periods} clock periods are simulated; after that the last period repeats.</p>`)}`;
  const draw=()=>{ const ck=m.querySelector('#ck'); ck.innerHTML=circuitSVG(); bindAll(ck); const ct=m.querySelector('#ctl'); ct.innerHTML=controlsHTML(); bindControls(ct);
    m.querySelector('#chk').innerHTML=kv(checks()); m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#bd').innerHTML=bounceSVG(); m.querySelector('#sk').innerHTML=stackSVG();
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200}); };
  bindAll(m); SIM.on('time', draw);
}
const tutor={i:0};
const LESSONS=[
  { title:'What RD18 was', body:`<p>In 2011|44 Peter set out to bring PCB layout and signal-integrity analysis in-house: Altium training, a HyperLynx course, application notes, and his own notes on stack-up, termination and ground loops. This tutorial replays the termination study on a 6-inch, 50 Ω clock line.</p>`, check:()=>true, auto:true },
  { title:'1 · See the ringing', body:`<p>Set the clock to <b>24.576 MHz</b> (the audio VCXO), no termination, and zoom to <b>100 ns</b>. The open CMOS input reflects everything: overshoot and ringing at every edge.</p>`, check:()=>D.term==='none'&&D.f===24.576e6&&SIM.win<=1.01e-7, hint:'Termination none; Zoom window → 100 ns.' },
  { title:'2 · Series termination', body:`<p>Fit a <b>series</b> resistor so Ro + Rs = Z0 (10 + 40 = 50 Ω). The wave leaves at half height and doubles cleanly at the load.</p>`, check:()=>D.term==='series'&&D.ro+D.rs===D.Z0, hint:'Click Rs in the drawing.' },
  { title:'3 · AC termination, done wrong', body:`<p>Choose <b>AC</b> termination and halve C until RC is <i>less</i> than twice the line delay. Peter’s note: a small C “acts as an edge generator, causing overshoot and undershoot”.</p>`, check:()=>D.term==='ac'&&D.rac*D.cac<2*Td(), hint:'Click R+C, then C ÷2 a few times.' },
  { title:'4 · AC termination, done right', body:`<p>Raise C until <b>RC &gt; 2·Td</b> and keep R = Z0. The load looks almost square and the C blocks DC, so there is little power in the resistor.</p>`, check:()=>D.term==='ac'&&D.rac*D.cac>2*Td()&&D.rac===D.Z0, hint:'C ×2 until the RC check turns ✓.' },
  { title:'5 · Stack-up', body:`<p>Set the board to <b>4 layers</b>: L2 a solid ground under the L1 microstrip, power split next to it. Note 1: controlled impedance needs a continuous reference plane next to the signal layer.</p>`, check:()=>D.layers===4, hint:'layers + / −.' },
  { title:'6 · Ground loop', body:`<p>Zoom out to <b>1 s</b> and add a ground loop. The note: hum at the mains frequency and its harmonics; fix it with a single-point ground and a chassis ring joined at one point.</p>`, check:()=>D.hum&&SIM.win>=0.5, hint:'Press “add ground loop”; Zoom window → 1 s.' },
  { title:'Done', body:`<p>RD18 is marked complete (Z). <b>Findings</b> says what the tool study concluded and where Altium shows up later.</p>`, check:()=>true, auto:true },
];
function viewTutorial(m){ tutorialView(m,LESSONS,tutor,{ title:'Tutorial — the termination study', panelTitle:'Test board', reset, panel(el){ el.innerHTML=circuitSVG()+controlsHTML()+kv(checks()); bindControls(el); } }); }
function viewSecond(m){
  m.innerHTML=card('One second on the test line', `<div id="lad"></div>`);
  const draw=()=>{ m.querySelector('#lad').innerHTML=tbl(['Event','per second','period'],[[`Clock edges (${fmt(D.f/1e6,3)} MHz)`,Math.round(D.f).toLocaleString(),SIM.fmtDur(1/D.f)],['Reflections (round trips)',Math.round(1/(2*Td())).toLocaleString(),SIM.fmtDur(2*Td())],['Mains cycles (hum)','60','16.67 ms'],['Solver steps per Td',''+solve().n,SIM.fmtDur(solve().dt)]].map(r=>[r[0],`<span class="mono">${r[1]}</span>`,`<span class="mono">${r[2]}</span>`])); };
  SIM.on('time',draw);
}
function viewBlock(m){
  blockView(m,{
    notes:{x:20,y:30,w:200,h:80,t:'Peter’s notes',s:['stack-up · termination','SI tools · ground loops'],d:'BoardDesignNotes.txt, TerminationNotes.txt, SignalIntegritySWNotes.txt, GroundLoopDesignTechnique.txt.txt.'},
    ref:{x:20,y:160,w:200,h:80,t:'Reference library',s:['AN-903, IPC-2221','StackupExample, LVDS'],d:'PDFs in Peter/ and gl/ (grounding, mixed-signal, EMC).'},
    train:{x:20,y:290,w:200,h:80,t:'Training',s:['Altium modules 1–20','HyperLynx PTU4 labs'],d:'Third-party course material (not reproduced).'},
    alt:{x:300,y:60,w:200,h:90,t:'Altium Designer',s:['IBIS 3.0 → 5.0 (2012)','reflection + crosstalk ≤ 1.25 GHz'],d:'From the vendor call notes: no power integrity; upgrade ~ $2,000.'},
    hl:{x:300,y:220,w:200,h:90,t:'HyperLynx SI/PI',s:['recommended even by Altium','PCB export path'],d:'The notes record that the Altium FAE himself recommended HyperLynx.'},
    board:{x:570,y:140,w:180,h:100,t:'WBS boards',s:['P-CAD 2002 → Altium','RD80, RD88 later'],d:'Later R&D (RD80 amplifier, RD88 mic pre) is in Altium (folder README).'},
  },[['notes','alt',''],['ref','alt',''],['train','hl',''],['alt','board',''],['hl','board','']],{start:'alt',h:400});
}
const SHEETS=[{ name:'1 · Termination options', note:'Redrawn from TerminationNotes.txt and the AN-903 topic list.', svg:()=>circuitSVG().replace(/<svg[^>]*>/,'<g transform="translate(-20,80)">').replace('</svg>','</g>') },
  { name:'2 · Isolated-supply grounding', note:'GroundLoopDesignTechnique.txt: chassis ring around the board, broken from the circuit ground, joined at one point; 2200 pF @ 2 kV for isolated supplies.', svg:()=>`<rect x="80" y="60" width="700" height="340" fill="none" stroke="var(--ink)" stroke-width="6"/><text x="90" y="52" font-size="12" fill="var(--ink)">chassis / connector-shield ring</text><rect x="140" y="120" width="580" height="220" fill="color-mix(in srgb,var(--accent) 10%,transparent)" stroke="var(--ink)"/><text x="150" y="140" font-size="12" fill="var(--ink)">circuit ground plane</text><line x1="430" y1="340" x2="430" y2="400" stroke="var(--bad)" stroke-width="3"/><text x="440" y="378" font-size="12" fill="var(--bad)">single connection (or 2200 pF / 2 kV)</text><circle cx="430" cy="230" r="8" fill="var(--ink)"/><text x="446" y="234" font-size="12" fill="var(--ink)">star point</text>` }];
function viewSchem(m){ sheetsView(m,SHEETS,'Peter’s RD18 notes','RD18 has no product schematics; these redraw the circuits the notes describe.'); }
function viewSoft(m){
  m.innerHTML=card('Solver (method of characteristics, per time step)', `<div class="mono small" id="eq"></div>`)+card('SI tool comparison, as recorded', tbl(['Question','Altium (Winter 09 / Mar 2012)','HyperLynx'],[['IBIS','3.0 → 5.03 (and “3.0 QWERT”, sic)','yes'],['Analyses','reflection, crosstalk only; no PI','SI + PI'],['Bandwidth','up to 1.25 GHz','—'],['Cost','~$2,000 upgrade (SI tool inclusion not asked)','—'],['Vendor advice','its own FAE recommends HyperLynx','“creme de la creme”']]));
  const draw=()=>{ const S=solve(); m.querySelector('#eq').innerHTML=[`dt = Td / ${S.n} = ${SIM.fmtDur(S.dt)}`,'a[k] = (Vs·Z0 − b[k−n]·(Z0 − Rs)) / (Z0 + Rs)        // source boundary','f[k] = a[k−n]                                        // forward wave at load','load = Σ branches (R, V): Cin → (dt/C, v_prev), Rp, R1‖R2, R + dt/C','r[k] = (f·(Rth − Z0) + Vth·Z0) / (Rth + Z0)          // reflected wave','v_load = f + r;  v_source = a + b'].map(x=>`<div>${x}</div>`).join(''); };
  SIM.on('time',draw);
}
function viewFindings(m){
  m.innerHTML=card('What RD18 decided, and what became of it',`<ol>
    <li><b>Register: RD18 “PCB Designer”, Peter, Z = completed</b> (no date). The folder is study material from 2011|44–2012|45; no board was designed in it.</li>
    <li><b>Tool verdict:</b> Altium’s built-in SI was limited (IBIS 3.0 until the March 2012 release; reflection and crosstalk only; 1.25 GHz; no power integrity), and Altium’s own field engineer recommended HyperLynx. A HyperLynx 8.2 package and a seminar (Pro Tune Up 4, 2011) are in the folder.</li>
    <li><b>What became of it:</b> later R&amp;D boards are Altium designs (RD80 amplifier, RD88 mic preamp, DEMUX-4), while older products stayed in P-CAD 2002. The RD18 README notes no record of which SI tool was finally standardised.</li>
    <li><b>A typo that changes the meaning.</b> TerminationNotes.txt says RS-422 drivers have a “typical 100V source impedance”. The source (an EDN article) means 100 Ω; the Ω was lost in a character-set conversion, as in the other garbled symbols in the file.</li>
    <li><b>Two rules for one capacitor.</b> The note gives both “RC &gt; twice the loaded propagation delay” and “RC &gt; the round-trip propagation time”. They are the same number (2·Td); the model checks it live.</li>
    <li><b>BoardDesignNotes.txt ends mid-topic</b> at the heading “DIFFERENTIAL PAIR ROUTING”, with nothing under it.</li>
    <li><b>Ground-loop note has two lists numbered 1–3 then 2–3 again</b>, a merge of two sources.</li>
    <li><b>Privacy:</b> LayoutDesignerContacts.xlsx (external layout designers) and the vendor contact named in the SI notes are not reproduced.</li>
  </ol>`)+card('Assumptions',`<ul class="small"><li>Lossless line, ideal trapezoid driver, 5 pF input (${inf}).</li><li>Microstrip Z0 and delay formulas (IPC-2141 form) are standard approximations, not from the notes (${inf}).</li><li>“Electrically long when Td &gt; tr/6” is a rule of thumb (${inf}).</li></ul>`)+card('Sources',`<ul class="small mono"><li>XXX - ENGINEERING - 2016 RD FILES/RD18-PCBDesigner/Peter/*.txt, *.pdf · gl/*.pdf · R&amp;D_List.xls</li><li>RD - HardwareImprovements/Oscillators/tsmv.pdf (edge times)</li></ul>`);
}
SIM.register({
  id:'rd18-pcbdesigner', name:'RD18 PCB Designer · termination and stack-up study (2012|45)', duration:1,
  product:'RD18 PCB Designer', year:2012, family:'R&D register', folder:'XXX - ENGINEERING - 2016 RD FILES/RD18-PCBDesigner',
  summary:'Peter’s 2011–2012 PCB and signal-integrity self-study, run as a working bench: a clock line with selectable termination solved in the time domain, his AC-termination rule checked live, a stack-up per his layer notes, and the ground-loop hum he wrote about.',
  highlights:['Time-domain transmission-line solver, five terminations','RC > 2·Td rule from TerminationNotes.txt','Bounce (lattice) diagram','Stack-up and microstrip impedance','Altium vs HyperLynx findings'],
  depth:'Hardware model',
  stepUnits:[{label:'1 Td',period:()=>Td()},{label:'1 clock period',period:()=>1/D.f},{label:'1 ns',period:()=>1e-9},{label:'1 mains cycle',period:()=>1/60}],
  zooms:[[1,'1 s (hum)'],[0.05,'50 ms'],[1e-6,'1 µs'],[1e-7,'100 ns'],[2e-8,'20 ns']],
  defaultZoom:3,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial: the termination study',render:viewTutorial},{id:'second',label:'One second, edge by edge',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewFindings}],
});

})();
