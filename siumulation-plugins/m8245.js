/* =====================================================================
   M8245 — ±22 V off-line switch-mode power supply card (Ward-Beck Systems)
   Plugin for the WBS Device Simulator (../siumulation.html) — hardware model

   Sources (folder "#SERIALBOX #SERIES/XXX - M8245 - #Master #OBSOLETE"):
   - M8245 Schematic Filtran.pdf  scan of "M8245 POWER SUPPLY SCHEMATIC" B 8245-02-001 ISS 8
                                  (Xerox WorkCentre 7232, 2011-01-20) -> assets/m8245-schematic.png
   - M8245 Drawing Filtran.pdf    scan of "M8245 POWER SUPPLY COMPONENT LAYOUT" B 8245-06-001 ISS 8,
                                  PCB 14-149 ISS 6 -> assets/m8245-layout.png (board area only)
   Related, elsewhere in the archive:
   - #SERIALBOX #SERIES/SERIALBOXX - #mf100/m8245aspecs.wpd  M8245A electrical characteristics
     (85–264 VAC, +21 V @ 4 A, −21 V @ 3 A, 80 % efficiency, hiccup current limit …)
   - #SERIALBOX #SERIES/M8245A.jpg (2008 photo), rd38-serialboxvsopengear.js (MF100 frame with 2 × M8245A)
   - #CONSOLES/MF250/MF250.BAK, MF251.PCB (frames whose PSU sockets match this card edge; see m8246 / mf250 plugins)
   Every part number and value below is read off the schematic scan. Anything else is marked "inferred".
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = (why)=>`<span class="tag-inf" title="Not stated in the source; inferred${why?' from '+why:''}">inferred</span>`;
const card = (t,b)=>`<div class="card"><h2>${t}</h2>${b}</div>`;
const KEY = '__m8245Active';

/* ---------------- values from B 8245-02-001 ISS 8 ---------------- */
const P = { RT:22e3, CT:1000e-12, C19:4.7e-6, R34:10e3, C45:820e-6, L:500e-6, COUT:2200e-6 };
const FOSC = 1.1/(P.RT*P.CT);                 // TL495 oscillator: 1.1/(R40 22K × C21 1000P) = 50 kHz
const FSW = FOSC/2;                           // push-pull outputs: each MJE13007 switches at 25 kHz
const TSS = P.R34*P.C19;                      // soft-start time constant on pin 4: 47 ms
const NT = 0.5;                               // T4 80-34 half-primary → secondary ratio (inferred, gives 30 % duty at 325 V bulk)
const DMAX = 0.45;                            // TL495 dead-time limit per output (inferred, TL495 data)
const PIN = {1:'A',2:'B',3:'C',4:'D',5:'E',6:'F',7:'H',8:'J',9:'K',10:'L',11:'M',12:'N'};
const EDGE = [['1,A','115/230 VAC (line)'],['4,D','115/230 VAC (neutral)'],['7,H','chassis / earth'],['10,L','−22 V'],['11,M','COM'],['12,N','+22 V']];

/* ---------------- device state ---------------- */
const D = { vac:120, hz:60, link:'115', on:true, startAt0:true, ins:false, ip:2.0, in:1.5, vout:0.5, ilim:0.55, short:false, ovf:false, fuses:true, log:[] };
function reset(){ Object.assign(D,{vac:120,hz:60,link:'115',on:true,startAt0:true,ins:false,ip:2.0,in:1.5,vout:0.5,ilim:0.55,short:false,ovf:false,fuses:true}); SK=''; }

/* ---------------- analog model ---------------- */
function vset(){ return 22*(0.92+0.16*D.vout); }                 // R54 2K V-OUT trims ±8 % (range inferred)
function plim(){ return 100+120*D.ilim; }                         // R20 5K I-LIMIT: 100…220 W total (range inferred)
function bulk(){
  if (!D.on || !D.fuses) return {v:0, rip:0, over:false};
  const pk = Math.SQRT2*D.vac - 2;
  const v = D.link==='115'? 2*pk : pk;                            // J1/J2 115 V link = voltage doubler on C4/C5
  const pout = 22*(D.ip+D.in), iin = pout/0.8/Math.max(50,v);
  const rip = D.link==='115'? iin/(D.hz*P.C45) : iin/(2*D.hz*P.C45/2);
  return { v, rip, over: v/2 > 200*1.15 };                         // C4/C5 are 820 µF / 200 V each
}
function demand(){ const vs=vset(); return D.short? Infinity : vs*(D.ip+D.in); }
function duty(vs){ const b=bulk(); const vsec=b.v/2*NT; if (vsec<=0) return 1; return (vs+1.8+0.15*(D.ip+D.in))/vsec; }
/* schedule of operating states over the second */
let SCH=null, SK='';
function schedule(){
  const key=[D.vac,D.hz,D.link,D.on,D.startAt0,D.ip,D.in,D.vout,D.ilim,D.short,D.ovf,D.fuses].join('|');
  if (key===SK) return SCH; SK=key;
  const seg=[]; const vs=vset(), b=bulk();
  const push=(t0,t1,k,o)=>{ if(t1>t0) seg.push(Object.assign({t0,t1,k},o||{})); };
  if (!D.on || !D.fuses){ push(0,1,'off'); SCH={seg}; return SCH; }
  if (b.over){ push(0,1,'off',{why:'C4/C5 over-voltage → F1/F2 open'}); SCH={seg}; return SCH; }
  const dneed=duty(vs), drop = dneed>DMAX;                       // not enough bulk voltage: output sags
  const vreg = drop? vs*DMAX/dneed : vs;
  const dem=demand(), lim=plim();
  let mode='run', vlim=vreg;
  if (D.ovf) mode='ov';
  else if (dem>lim){ vlim = D.short? 0 : vreg*lim/dem; mode = vlim < 0.5*vreg ? 'hiccup' : 'limit'; }
  let t = D.startAt0? 0 : -1;
  if (D.startAt0){ push(0,0.012,'startup'); t=0.012; }            // Q4/Q5 start-up (MPSW42 + 15 V zener) charges C15/C17 (inferred time)
  const ovTrip = 33.3;                                            // MC3423 2.6 V × (1 + R55 39K / R57 3K3) ≈ 33 V (divider placement inferred)
  if (mode==='run' || mode==='limit'){
    if (t>=0){ push(t, t+3*TSS, 'soft', {vt:mode==='run'?vreg:vlim}); t+=3*TSS; }
    push(Math.max(0,t),1, mode, {vt: mode==='run'?vreg:vlim});
  } else {
    let first=true;                                               // hiccup / crowbar cycles: try, fail, rest
    while (t<1){
      const t0=Math.max(0,t);
      if (mode==='ov'){ const tr = (first && t<0)? 0 : 0.6*TSS; push(t0, t+tr, 'soft',{vt:ovTrip, ov:true}); t+=tr; push(Math.max(0,t), t+0.004, 'crowbar'); t+=0.004; push(Math.max(0,t), t+0.05, 'hiccup',{vt:0}); t+=0.05; }
      else { push(t0, t+0.05, 'hiccup',{vt:vlim, on:true}); t+=0.05; }
      push(Math.max(0,t), t+0.30, 'rest'); t+=0.30;               // hiccup off-time (inferred; spec says “hiccup mode”)
      if (t<1 && mode!=='ov') { push(t, t+TSS, 'soft',{vt:vlim}); t+=TSS; }
      first=false;
    }
  }
  SCH={seg:seg.filter(s=>s.t1>0).map(s=>Object.assign(s,{t0:Math.max(0,s.t0),t1:Math.min(1,s.t1)})), vreg, vlim, mode, dneed, drop, ovTrip};
  return SCH;
}
function segAt(t){ const s=schedule().seg; return s.find(x=>t>=x.t0&&t<x.t1) || s[s.length-1]; }
function voutAt(t){ const g=segAt(t); if(!g) return 0;
  if (g.k==='soft'){ const f=1-Math.exp(-(t-g.t0)/TSS); return g.vt*Math.min(1,f*1.05); }
  if (g.k==='run'||g.k==='limit') return g.vt;
  if (g.k==='hiccup') return g.on? g.vt : 0.3;
  if (g.k==='crowbar') return 1.2;
  return 0; }
function dutyAt(t){ const g=segAt(t), sc=schedule(); if(!g) return 0;
  if (g.k==='soft'){ const f=1-Math.exp(-(t-g.t0)/TSS); return Math.min(DMAX, g.ov? DMAX*f : sc.dneed*f*1.05); }
  if (g.k==='run') return Math.min(DMAX, sc.dneed);
  if (g.k==='limit') return Math.min(DMAX, sc.dneed*sc.vlim/sc.vreg);
  if (g.k==='hiccup') return g.on? 0.08 : 0.02;
  return 0; }
const ledRed = t=>{ const k=segAt(t)?.k; return k==='limit'||k==='hiccup'||k==='crowbar'||k==='rest'&&D.on; };
const ledGrn = t=> voutAt(t) > 0.5*vset();
function rails(t){ const v=voutAt(t); const ib=(D.ip-D.in); return {p:v*(1-0.004*ib), n:-v*(1+0.004*ib)}; } // cross-regulation (inferred)

/* ---------------- actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,tr}); if(D.log.length>40) D.log.length=40; SIM.refresh(); }
const A = {
  link(k){ act(`Move J1/J2 to ${k} V`, tr=>{ D.link=k; tr(k==='115'? 'J1 (115V) closed: CR1 RS405L + C4/C5 820/200 form a voltage doubler' : 'J2 (230V) position: CR1 is a full bridge, C4 and C5 sit in series across it');
    const b=bulk(); tr(`Bulk = ${b.v.toFixed(0)} V DC (${(b.v/2).toFixed(0)} V per capacitor)${b.over?' — above the 200 V rating of C4/C5!':''}`); if(b.over){ D.fuses=false; tr('C4/C5 fail short, F1/F2 0.5 A open. Replace the fuses after fixing the link.'); } }); },
  vac(v){ act(`Set mains to ${v} V ${D.hz} Hz`, tr=>{ D.vac=v; const b=bulk(), sc=schedule(); tr(`Bulk ${b.v.toFixed(0)} V, ripple ${b.rip.toFixed(1)} V p-p`); if(b.over){ D.fuses=false; tr('Doubler on 230 V mains: C4/C5 over-voltage, F1/F2 open'); return; } tr(`TL495 duty per output needed: ${(sc.dneed*100).toFixed(1)} %${sc.drop?' — above the ~45 % dead-time limit, output sags':''}`); }); },
  hz(f){ act(`Mains ${f} Hz`, tr=>{ D.hz=f; tr(`Bulk ripple now at ${D.link==='115'?f:2*f} Hz: ${bulk().rip.toFixed(1)} V p-p`); }); },
  power(){ act(D.on?'Pull the card / remove mains':'Insert the card (mains on at t = 0)', tr=>{ D.on=!D.on; if(D.on){ D.startAt0=true; D.ins=true; tr('Mains reaches pins 1,A / 4,D → C1/C2 0.047/275 + T1 80-42 → CR1 → R1 1 Ω 5 W limits inrush into C4/C5'); tr('Q5 MPSW42 + CR10 15 V zener (via R26 10K 5W) start U1; T3 aux winding then takes over through CR11'); tr(`U1 TL495CN pin 4 soft-start: C19 4.7 µF × R34 10K = ${(TSS*1000).toFixed(0)} ms`); } else tr('All rails decay; DS2 GN goes out'); }); },
  load(r,a){ act(`Load ${r==='p'?'+22 V':'−22 V'} rail: ${a.toFixed(1)} A`, tr=>{ if(r==='p') D.ip=a; else D.in=a; const sc=schedule(); tr(`Total ${(22*(D.ip+D.in)).toFixed(0)} W vs I-LIMIT ${plim().toFixed(0)} W → ${sc.mode.toUpperCase()}`); tr(`T2 80-38 current transformer → CR6 → R19 47 / R20 → U2B comparator; duty ${(sc.dneed*100).toFixed(1)} %`); }); },
  vout(v){ act(`Trim R54 V-OUT to ${Math.round(v*100)} %`, tr=>{ D.vout=v; tr(`R54 2K / R52 2K2 / R53 4K3 divider → U2A LF353 error amp → U3 ILD-1 opto → U1 pin 1/2 → ${vset().toFixed(2)} V`); }); },
  ilim(v){ act(`Trim R20 I-LIMIT to ${Math.round(v*100)} %`, tr=>{ D.ilim=v; tr(`Limit ≈ ${plim().toFixed(0)} W total ${inf('range')}`); }); },
  short(){ act(D.short?'Remove the short':'Short the +22 V output', tr=>{ D.short=!D.short; tr(D.short? 'Output collapses; T2 sense trips, U1 dead-time pin pulled high → hiccup: 50 ms try, 300 ms rest '+inf('timings'):'Next soft-start brings the rails back'); }); },
  ovf(){ act(D.ovf?'Repair the feedback loop':'Open the U3 opto feedback (fault)', tr=>{ D.ovf=!D.ovf; tr(D.ovf? 'Without U3 the TL495 runs to full duty; when the output passes ≈ 33 V U4 MC3423P fires Q7 2N6238 SCR through R59 1 Ω 5 W, shorting the output; current limit then hiccups' : 'Loop closed again'); }); },
  fuses(){ act('Replace F1/F2 (0.5 A)', tr=>{ D.fuses=true; if(bulk().over){ D.fuses=false; tr('Link still wrong for this mains voltage: the new fuses blow at once'); } else tr('Fuses replaced'); }); },
};

/* ---------------- board view (component layout scan) ---------------- */
const BW=1556, BH=462;
const HOT = { ds1:[13,105], ds2:[13,133] };   // pixel positions measured on the scan
const finger = n=>[1545, 120+(n-1)*23.5];   // A (pin 1) at y 120 … N (pin 12) at y 378; fingers 1,4,7,8,9,10,11,12 are plated
function boardSVG(t){
  const g=ledGrn(t), r=ledRed(t);
  let s=`<svg viewBox="0 0 ${BW} ${BH}" style="width:100%;background:#fff;border-radius:6px"><image href="${ASSET}m8245-layout.png" x="0" y="0" width="${BW}" height="${BH}"/>
   <circle cx="${HOT.ds1[0]}" cy="${HOT.ds1[1]}" r="11" fill="${r?'#ff3b2f':'#5a1d1a'}" opacity=".85"><title>DS1 RD</title></circle>
   <circle cx="${HOT.ds2[0]}" cy="${HOT.ds2[1]}" r="11" fill="${g?'#3cff5a':'#1d4a22'}" opacity=".85"><title>DS2 GN</title></circle>
   <g data-act="r20" style="cursor:pointer"><rect x="56" y="55" width="116" height="34" fill="var(--accent)" fill-opacity=".18" stroke="var(--accent)"/><title>R20 5K I LIMIT — click left/right half</title></g>
   <g data-act="r54" style="cursor:pointer"><rect x="36" y="291" width="116" height="33" fill="var(--accent)" fill-opacity=".18" stroke="var(--accent)"/><title>R54 2K V OUT — click left/right half</title></g>
   <g data-act="link" style="cursor:pointer"><rect x="1245" y="235" width="54" height="36" rx="5" fill="var(--accent2)" fill-opacity=".2" stroke="var(--accent2)"/><text x="1272" y="230" text-anchor="middle" font-size="14" fill="var(--accent2)">J${D.link==='115'?'1 115V':'2 230V'}</text><title>J1/J2 power links (solder side) — click to move</title></g>
   ${!D.fuses?`<rect x="1100" y="78" width="270" height="50" fill="none" stroke="var(--bad)" stroke-width="3"/><text x="1150" y="148" font-size="16" fill="var(--bad)" font-weight="700">F1/F2 OPEN</text>`:''}`;
  [1,4,7,10,11,12].forEach(n=>{ const [x,y]=finger(n); const live= n===12? rails(t).p>1 : n===10? rails(t).n< -1 : n===11? false : D.on; s+=`<rect x="${x-14}" y="${y-9}" width="22" height="18" fill="${live?(n>=10?'#e8b100':'#e05a2b'):'#888'}" opacity=".6"><title>Pin ${n},${PIN[n]}</title></rect>`; });
  return s+'</svg>'; }
function bindBoard(root){
  const half=(g,e)=>{ const r=g.getBoundingClientRect(); return e.clientX>r.left+r.width/2? 0.1:-0.1; };
  root.querySelectorAll('[data-act="r20"]').forEach(g=>g.onclick=e=>A.ilim(Math.max(0,Math.min(1,Math.round((D.ilim+half(g,e))*10)/10))));
  root.querySelectorAll('[data-act="r54"]').forEach(g=>g.onclick=e=>A.vout(Math.max(0,Math.min(1,Math.round((D.vout+half(g,e))*10)/10))));
  root.querySelectorAll('[data-act="link"]').forEach(g=>g.onclick=()=>A.link(D.link==='115'?'230':'115'));
}
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin-top:8px">
  <label>Mains <input id="va" type="range" min="80" max="264" value="${D.vac}"> <span id="vav" class="mono"></span></label>
  <label><select id="hz"><option ${D.hz===60?'selected':''}>60</option><option ${D.hz===50?'selected':''}>50</option></select> Hz</label>
  <label>+22 V load <input id="lp" type="range" min="0" max="6" step="0.1" value="${D.ip}"> <span id="lpv" class="mono"></span></label>
  <label>−22 V load <input id="ln" type="range" min="0" max="5" step="0.1" value="${D.in}"> <span id="lnv" class="mono"></span></label>
  <button id="pw">${D.on?'Pull card':'Insert card (start at t=0)'}</button><button id="sh" class="${D.short?'on':''}">Short +22 V</button><button id="ov" class="${D.ovf?'on':''}">Open opto loop</button>${D.fuses?'':'<button id="fu">Replace F1/F2</button>'}<button id="rs">Factory state</button></div>`; }
function bindControls(m){ const q=s=>m.querySelector(s); if(!q('#va')) return;
  const u=()=>{ q('#vav').textContent=D.vac+' V'; q('#lpv').textContent=D.ip.toFixed(1)+' A'; q('#lnv').textContent=D.in.toFixed(1)+' A'; }; u();
  q('#va').oninput=e=>{D.vac=+e.target.value;u();}; q('#va').onchange=e=>A.vac(+e.target.value);
  q('#hz').onchange=e=>A.hz(+e.target.value);
  q('#lp').oninput=e=>{D.ip=+e.target.value;u();}; q('#lp').onchange=e=>A.load('p',+e.target.value);
  q('#ln').oninput=e=>{D.in=+e.target.value;u();}; q('#ln').onchange=e=>A.load('n',+e.target.value);
  q('#pw').onclick=()=>A.power(); q('#sh').onclick=()=>A.short(); q('#ov').onclick=()=>A.ovf(); if(q('#fu')) q('#fu').onclick=()=>A.fuses();
  q('#rs').onclick=()=>{ reset(); D.log.length=0; SIM.refresh(); }; }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].tr.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click R20, R54 or the J1/J2 link on the board, or use the controls.</div>'; }

/* ---------------- lanes ---------------- */
function lanes(){ const css=SIM.css, b=bulk(), sc=schedule(), Tosc=1/FOSC;
  const plot=(c,X,t0,t1,y,h,fn,lo,hi,col)=>{ c.strokeStyle=col; c.beginPath(); for(let i=0;i<=500;i++){ const tt=t0+(t1-t0)*i/500, v=fn(tt), yy=y+h-3-(v-lo)/(hi-lo)*(h-6); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy);} c.stroke(); };
  const dense=(X,t0,t1,per)=> (X(t0+per)-X(t0))<3;
  return [
    {label:`Mains ${D.vac} V ${D.hz} Hz`, h:34, draw(c,X,t0,t1,y,h){ if(!D.on){return;} plot(c,X,t0,t1,y,h,tt=>Math.sin(2*Math.PI*D.hz*tt),-1.1,1.1,css('--accent2')); }},
    {label:`Bulk C4+C5 (${b.v.toFixed(0)} V, ${b.rip.toFixed(1)} Vpp)`, h:30, draw(c,X,t0,t1,y,h){ const fr=D.link==='115'?D.hz:2*D.hz; plot(c,X,t0,t1,y,h,tt=>{ if(segAt(tt)?.k==='off') return 0; const ph=(tt*fr)%1; return b.v - b.rip*ph; },0,Math.max(10,b.v*1.05),css('--warn')); }},
    {label:`TL495 osc ${(FOSC/1000).toFixed(0)} kHz (RT 22K, CT 1n)`, h:28, draw(c,X,t0,t1,y,h){ if(dense(X,t0,t1,Tosc)){ SIM.pulses(c,X,t0,t1,y,h,Tosc,0,Tosc*0.5,css('--ink2'),'osc ramps'); return; } plot(c,X,t0,t1,y,h,tt=>(tt/Tosc)%1,0,1,css('--ink2')); }},
    {label:'Q1 MJE13007 drive (T3)', h:22, draw(c,X,t0,t1,y,h){ const d=dutyAt((t0+t1)/2); SIM.pulses(c,X,t0,t1,y,h,2*Tosc,0,d*Tosc,css('--accent'),`Q1 pulses, ${(d*100).toFixed(0)} % of a cycle`); }},
    {label:'Q2 MJE13007 drive (T3)', h:22, draw(c,X,t0,t1,y,h){ const d=dutyAt((t0+t1)/2); SIM.pulses(c,X,t0,t1,y,h,2*Tosc,Tosc,d*Tosc,css('--accent'),`Q2 pulses`); }},
    {label:'Duty per output (pin 4 soft-start)', h:30, draw(c,X,t0,t1,y,h){ plot(c,X,t0,t1,y,h,dutyAt,0,0.5,css('--accent')); }},
    {label:'+22 V rail (pin 12,N)', h:40, draw(c,X,t0,t1,y,h){ plot(c,X,t0,t1,y,h,tt=>rails(tt).p + (voutAt(tt)>1? 0.025*Math.sin(2*Math.PI*FOSC*tt)+0.01*Math.sin(2*Math.PI*2*D.hz*tt):0),0,36,css('--accent')); }},
    {label:'−22 V rail (pin 10,L)', h:40, draw(c,X,t0,t1,y,h){ plot(c,X,t0,t1,y,h,tt=>-rails(tt).n,0,36,css('--accent2')); }},
    {label:'State', h:24, draw(c,X,t0,t1,y,h){ const col={off:'--grid',startup:'--ink2',soft:'--accent2',run:'--accent',limit:'--warn',hiccup:'--bad',rest:'--grid',crowbar:'--bad'}; for(const g of schedule().seg){ if(g.t1<t0||g.t0>t1) continue; c.fillStyle=css(col[g.k]); c.fillRect(X(g.t0),y+4,Math.max(1,X(g.t1)-X(g.t0)),h-8); if(X(g.t1)-X(g.t0)>40){ c.fillStyle=css('--ink'); c.font='10px monospace'; c.fillText(g.k,X(Math.max(g.t0,t0))+3,y+h/2+3);} } }},
    {label:'DS1 RD / DS2 GN', h:22, draw(c,X,t0,t1,y,h){ for(let i=0;i<300;i++){ const tt=t0+(t1-t0)*i/300; c.fillStyle=ledRed(tt)?'#e33':'transparent'; c.fillRect(X(tt),y+3,(X(t1)-X(t0))/300+1,7); c.fillStyle=ledGrn(tt)?'#2c2':'transparent'; c.fillRect(X(tt),y+12,(X(t1)-X(t0))/300+1,7);} }},
  ]; }

/* ---------------- views ---------------- */
function inspHTML(t){ const b=bulk(), sc=schedule(), g=segAt(t), r=rails(t); return `<table class="kv">
  <tr><th>State at playhead</th><td class="mono">${g?g.k.toUpperCase():'—'}${g&&g.why?' ('+g.why+')':''}</td></tr>
  <tr><th>Rails</th><td class="mono">+${r.p.toFixed(2)} V / ${r.n.toFixed(2)} V (set ${vset().toFixed(2)} V)</td></tr>
  <tr><th>Bulk</th><td class="mono">${b.v.toFixed(0)} V · ${b.rip.toFixed(1)} V p-p · link ${D.link} V${b.over?' <b style="color:var(--bad)">OVER 2×200 V</b>':''}</td></tr>
  <tr><th>PWM</th><td class="mono">${(FOSC/1000).toFixed(1)} kHz osc · ${(FSW/1000).toFixed(1)} kHz per transistor · duty ${(dutyAt(t)*100).toFixed(1)} %${sc.drop?' (max — low line)':''}</td></tr>
  <tr><th>Load</th><td class="mono">${(22*(D.ip+D.in)).toFixed(0)} W of ${plim().toFixed(0)} W limit · input ≈ ${(22*(D.ip+D.in)/0.8).toFixed(0)} W</td></tr>
  <tr><th>LEDs</th><td class="mono">DS1 RD ${ledRed(t)?'ON':'off'} · DS2 GN ${ledGrn(t)?'ON':'off'}</td></tr></table>`; }
function viewSim(m){ window[KEY]=false;
  m.innerHTML = card('The card at the playhead — component layout B 8245-06-001 (scan); click R20, R54 and the J1/J2 link', `<div id="bd"></div>${controlsHTML()}`)
   + `<div class="grid2"><div>${card('Card edge (24 contacts, 1–12 / A–N)', `<table class="kv small">${EDGE.map(e=>`<tr><th>${e[0]}</th><td>${e[1]}</td></tr>`).join('')}</table><p class="small muted">Pin functions from the schematic's connector labels. The other contacts are unused on the drawing.</p>`)}${card('State at the playhead', `<div id="insp"></div>`)}</div>
     <div>${card('What changed in the circuit (last action)', `<div id="trace" class="log"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div></div>`
   + card('Timeline — one second (click to seek; zoom to 40 µs to see the 50 kHz PWM)', `<canvas id="tl"></canvas>`);
  bindControls(m);
  SIM.on('time', ()=>{ const t=SIM.t; m.querySelector('#bd').innerHTML=boardSVG(t); bindBoard(m.querySelector('#bd'));
    m.querySelector('#insp').innerHTML=inspHTML(t); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#log').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('')||'<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210}); });
}
const LESSONS = [
  { title:'1 · Set the link for your mains', body:`<p>The card has two solder-side power links, J1 (115 V) and J2 (230 V) (layout note 1). With 120 V mains, J1 must be in: CR1 and C4/C5 then double the line to about 330 V. Make sure the link reads <b>J1 115V</b>.</p>`, check:()=>D.link==='115'&&D.vac<150, hint:'Mains slider ≤ 150 V and the link on J1.' },
  { title:'2 · Power up and watch the soft start', body:`<p>Pull the card, then insert it again. Mains now arrives at t = 0. Scrub the first 200 ms: the start-up transistors (Q4/Q5) wake U1, and C19 (4.7 µF) on TL495 pin 4 opens the duty slowly over about 3 × 47 ms.</p>`, check:()=>D.on&&D.ins, hint:'Press Pull card, then Insert card.' },
  { title:'3 · Check the outputs', body:`<p>Move the playhead past 200 ms. DS2 (green) is on, and the rails read about ±22 V on pins 12,N and 10,L (COM on 11,M).</p>`, check:()=>ledGrn(SIM.t)&&SIM.t>0.2, hint:'Move the playhead to 0.3 s or later.' },
  { title:'4 · Trim V-OUT', body:`<p>R54 (2K, “VOUT”) sets the regulated voltage through U2A and the ILD-1 opto. Click the right or left half of R54 on the board until the set point is between 21.9 and 22.1 V.</p>`, check:()=>Math.abs(vset()-22)<0.1, hint:'R54 near 50 %.' },
  { title:'5 · Load it to the M8245A rating', body:`<p>The M8245A spec sheet allows <b>+21 V at 4 A</b> and <b>−21 V at 3 A</b>. Set the loads to 4.0 A and 3.0 A. The supply stays in RUN if I-LIMIT is high enough.</p>`, check:()=>D.ip>=4&&D.in>=3&&schedule().mode==='run', hint:'Loads 4.0 / 3.0 A; raise R20 I-LIMIT if the state shows LIMIT.' },
  { title:'6 · Brown-out', body:`<p>Drop the mains to <b>90 V</b>. The TL495 needs more duty to hold the output. Below about 85 V it hits the dead-time limit and the output starts to sag.</p>`, check:()=>D.vac<=90, hint:'Mains slider to 90 V.' },
  { title:'7 · Short circuit', body:`<p>Press <b>Short +22 V</b>. T2 senses the primary current and the card goes into hiccup: DS1 (red) flashes, the output tries every few hundred milliseconds.</p>`, check:()=>D.short&&schedule().mode==='hiccup', hint:'Press Short +22 V.' },
  { title:'8 · Over-voltage crowbar', body:`<p>Remove the short and press <b>Open opto loop</b>. Without feedback the duty runs up until U4 (MC3423P) fires Q7, a 2N6238 SCR, across the output.</p>`, check:()=>!D.short&&D.ovf, hint:'Release Short, press Open opto loop.' },
  { title:'9 · The wrong link', body:`<p>Repair the loop, then set the mains to <b>230 V</b> with the link still on J1. The doubler would put about 650 V on C4/C5 (2 × 200 V parts): the fuses go. Move the link to J2 and replace F1/F2.</p>`, check:()=>!D.ovf&&D.vac>200&&D.link==='230'&&D.fuses, hint:'Mains 230 V → fuses open → click the link to J2 → Replace F1/F2.' },
  { title:'Done', body:`<p>You have exercised the whole card. The M8246 plugin puts this card to work in the R2K console, and the MF250 plugin shows the frame that holds two of them.</p>`, check:()=>true, auto:true },
];
let li=0;
function viewTut(m){ window[KEY]=false;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — bench-testing an M8245 (from the schematic notes; no manual survives)', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
   <div>${card('The card', `<div id="bd"></div>${controlsHTML()}`)}${card('What changed', `<div id="trace" class="log"></div>`)}</div></div>`;
  bindControls(m);
  const draw=()=>{ m.querySelector('#bd').innerHTML=boardSVG(SIM.t); bindBoard(m.querySelector('#bd')); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===li?'font-weight:700;color:var(--accent)':''}">${l.title}${i<li?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(x=>x.onclick=()=>{li=+x.dataset.i;draw();});
    const L=LESSONS[li], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${li?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${li<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="st">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{li=Math.max(0,li-1);draw();}; m.querySelector('#nx').onclick=()=>{li=Math.min(LESSONS.length-1,li+1);draw();};
    m.querySelector('#st').onclick=()=>{ reset(); D.log.length=0; li=0; SIM.refresh(); }; };
  SIM.on('time', draw); }
function viewSecond(m){ window[KEY]=false;
  m.innerHTML=card('One second in slow motion — mains cycles, PWM, soft start and the outputs', `<canvas id="tl"></canvas>`)
   + `<div class="grid2">${card('Time scales on this card', `<table class="kv small">
     <tr><th>Mains</th><td>${D.hz} Hz: ${SIM.fmtDur(1/D.hz)} per cycle; bulk ripple at ${D.link==='115'?D.hz:2*D.hz} Hz</td></tr>
     <tr><th>TL495 oscillator</th><td>1.1 / (22 kΩ × 1000 pF) = ${(FOSC/1000).toFixed(1)} kHz → ${SIM.fmtDur(1/FOSC)} per ramp; ${Math.round(FOSC).toLocaleString()} ramps per second</td></tr>
     <tr><th>Half bridge</th><td>Q1 and Q2 alternate on each ramp: ${(FSW/1000).toFixed(1)} kHz each, output ripple at ${(FOSC/1000).toFixed(0)} kHz</td></tr>
     <tr><th>Soft start</th><td>C19 4.7 µF × R34 10K = ${(TSS*1000).toFixed(0)} ms (pin 4 dead-time control)</td></tr>
     <tr><th>Hiccup</th><td>about 50 ms on, 300 ms off ${inf('spec says only “hiccup mode”')}</td></tr></table>`)}${card('PWM at the playhead (two oscillator cycles)', `<canvas id="pw"></canvas>`)}</div>`;
  SIM.on('time', ()=>{ SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
    const {c,w,h}=SIM.canvas(m.querySelector('#pw'),160), d=dutyAt(SIM.t); const css=SIM.css; c.strokeStyle=css('--ink2'); c.beginPath(); for(let k=0;k<2;k++){ c.moveTo(10+k*(w-20)/2,120); c.lineTo(10+(k+1)*(w-20)/2,30);} c.stroke();
    const lvl=120-90*(1-d/0.5); c.strokeStyle=css('--warn'); c.beginPath(); c.moveTo(10,lvl); c.lineTo(w-10,lvl); c.stroke();
    c.fillStyle=css('--accent'); c.fillRect(10,135,(w-20)/2*d,10); c.fillStyle=css('--accent2'); c.fillRect(10+(w-20)/2,147,(w-20)/2*d,10);
    c.fillStyle=css('--ink'); c.font='11px monospace'; c.fillText(`ramp (CT) vs error/dead-time level · Q1 then Q2 on for ${(d*100).toFixed(1)} % of each ramp`,12,18); });
}
const BLOCKS={
  in:{x:10,y:30,w:130,h:70,t:'Mains in',s:['1,A / 4,D · 7,H','C1/C2 + T1 80-42'],d:'115/230 VAC 50/60 Hz on the card edge, EMI filtered by C1/C2 0.047/275 and the common-mode choke T1 80-42.'},
  bulk:{x:170,y:30,w:150,h:70,t:'CR1 + C4/C5',s:['RS405L, 2 × 820/200','R1 1 Ω inrush · J1/J2'],d:'J1 (115 V) makes CR1 + C4/C5 a doubler; J2 (230 V) a bridge. Either way ≈ 330 V DC bulk. F1/F2 0.5 A, R2/R3 40K bleeders.'},
  hb:{x:350,y:30,w:150,h:70,t:'Half bridge',s:['Q1/Q2 MJE13007','C10/C11 10/350'],d:'Two MJE13007 switch the bulk across T4 against the C10/C11 mid-point, driven in anti-phase by T3 80-35.'},
  t4:{x:530,y:30,w:120,h:70,t:'T4 80-34',s:['power transformer'],d:'Isolating power transformer. Secondary 5/6/7 to the output bridge, 8/9/10 aux winding for the control supply and DS1.'},
  out:{x:680,y:20,w:170,h:90,t:'Outputs',s:['CR13–16 MR821 bridge','L1/L2 500 µH, C24/C25','CR18/CR19 1N5404','±22 V on 12,N / 10,L'],d:'Full-wave rectified, LC filtered, then series diodes CR18/CR19 (so two cards can share a bus) and R61/R62 10K bleeders.'},
  pwm:{x:350,y:150,w:150,h:80,t:'U1 TL495CN',s:['50 kHz, push-pull','pin 4 soft-start C19','Q4/Q5 start-up'],d:'PWM controller. RT 22K, CT 1000 pF → 50 kHz. Soft start and dead time on pin 4. Start-up from the bulk via Q5 MPSW42 and the 15 V zener CR10.'},
  fb:{x:530,y:150,w:150,h:80,t:'Feedback',s:['U2 LF353N error amp','U3 ILD-1 opto','R54 V-OUT · R45 V-CAL'],d:'The output is compared in U2A; the ILD-1 optocoupler carries the error back across the isolation barrier to U1.'},
  prot:{x:700,y:150,w:150,h:80,t:'Protection',s:['T2 80-38 + R20 I-LIMIT','U4 MC3423P + Q7 SCR','DS1 RD / DS2 GN'],d:'Primary current sensed by T2 into the I-LIMIT comparator; MC3423P over-voltage crowbar fires Q7 2N6238 through R59 1 Ω 5 W.'},
  drv:{x:170,y:150,w:150,h:80,t:'T3 80-35 drive',s:['R4/R8 75 · R5/R9 510','R6/R10 15 or 75 Ω'],d:'Base-drive transformer. Note 4: R6/R10 may be 15 or 75 Ω because of supplier variation in T3.'},
};
const WIRES=[['in','bulk'],['bulk','hb'],['hb','t4'],['t4','out'],['out','fb'],['fb','pwm'],['pwm','drv'],['drv','hb'],['t4','prot'],['prot','pwm'],['bulk','pwm']];
let bsel='pwm';
function viewBlock(m){ window[KEY]=false;
  m.innerHTML=`<div class="grid2">${card('Block diagram (click a block)', `<div id="bd"></div>`)}${card('Block', `<div id="bi"></div>`)}</div>`;
  const draw=()=>{ const c=b=>[b.x+b.w/2,b.y+b.h/2]; let s=`<svg viewBox="0 0 860 250" style="width:100%">`;
    WIRES.forEach(([a,b])=>{ const [x1,y1]=c(BLOCKS[a]),[x2,y2]=c(BLOCKS[b]); const h=bsel===a||bsel===b; s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${h?'var(--accent)':'var(--ink2)'}" stroke-width="${h?2.5:1.2}"/>`; });
    for(const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${bsel===k?'var(--accent)':'var(--line)'}" stroke-width="${bsel===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{bsel=g.dataset.b;draw();});
    const b=BLOCKS[bsel]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`; };
  draw(); }
const T=(x,y,s,c,a,fs)=>`<text x="${x}" y="${y}" font-size="${fs||10.5}" fill="${c||'var(--ink)'}" ${a?'text-anchor="'+a+'"':''}>${s}</text>`, W_=d=>`<path d="${d}" fill="none" stroke="var(--ink)"/>`;
const BX=(x,y,w,h,t,sub)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)"/>${T(x+w/2,y+h/2,t,'var(--ink)','middle',12)}${sub?T(x+w/2,y+h/2+14,sub,'var(--ink2)','middle',10):''}`;
const SHEETS=[
  {name:'1 · Input & bulk', note:'Redrawn from B 8245-02-001 ISS 8 (top left). Values as on the scan.', svg:()=>
    `${T(20,90,'1,A')}${T(20,140,'7,H ⏚')}${T(20,190,'4,D')}${W_('M50 86 H120 M50 186 H120')}${BX(120,70,70,130,'C1/C2','0.047/275')}${BX(210,70,70,130,'T1','80-42')}${BX(300,70,60,130,'C3','0.047/275')}
     ${BX(380,80,90,110,'CR1','RS405L')}${W_('M470 100 H520 M470 170 H520')}${T(480,92,'R1 1Ω 5W')}${T(480,200,'F2 0.5A')}${T(540,72,'F1 0.5A')}
     ${BX(540,90,90,40,'C5 820/200')}${BX(540,150,90,40,'C4 820/200')}${T(645,112,'R3 40K 5W')}${T(645,172,'R2 40K 5W')}
     ${T(380,240,'J1 = 115 V (CR1 AC pin to C4/C5 mid-point: doubler) · J2 = 230 V (bridge)','var(--accent2)')}${T(660,135,'→ +HV / −HV to the half bridge','var(--accent2)')}` },
  {name:'2 · Half bridge & drive', note:'Q1/Q2 and the T3 drive network, redrawn. R6/R10 “maybe 15 or 75 ohms due to supplier variations in driver transformer T3” (note 4).', svg:()=>
    `${BX(80,60,120,60,'Q1 MJE13007','R12 5K6 1W · C8 330P 1KV')}${BX(80,190,120,60,'Q2 MJE13007','R14 5K6 1W · C9 330P 1KV')}${BX(290,110,110,90,'T3 80-35','base drive')}
     ${T(410,110,'R4 75 · R5 510 · R6 15 · R7 33 · CR2 1N4836')}${T(410,128,'R8 75 · R9 510 · R10 15 · R11 33 · CR3 1N4836')}${T(410,146,'C6/C7 0.33/100')}
     ${BX(600,110,110,90,'T4 80-34','pri 1–4')}${T(600,250,'C10 / C11 10/350 split + R16/R17 150K ½W balance')}${T(600,270,'T2 80-38 in series: current sense')}${W_('M200 90 H600 M200 220 H600 M400 155 H420')}` },
  {name:'3 · Secondary & outputs', note:'Output side, redrawn. MC3423 trip level = 2.6 V × (1 + R55/R57) ≈ 33 V is inferred from the part values; the divider placement is not legible enough to be sure.', svg:()=>
    `${BX(30,80,90,120,'T4','sec 5/6/7')}${BX(150,80,110,120,'CR13–16','MR821 + R63 100 C32 2200P')}${BX(290,60,90,40,'L1 500µH')}${BX(290,190,90,40,'L2 500µH')}
     ${BX(410,60,90,40,'C24 2200/25')}${BX(410,190,90,40,'C25 2200/25')}${BX(530,60,90,40,'CR18 1N5404')}${BX(530,190,90,40,'CR19 1N5404')}${W_('M260 80 H290 M380 80 H410 M500 80 H530 M260 210 H290 M380 210 H410 M500 210 H530 M620 80 H700 M620 210 H700')}
     ${T(705,84,'12,N +22V','var(--accent2)')}${T(705,148,'11,M COM','var(--accent2)')}${T(705,214,'10,L −22V','var(--accent2)')}
     ${BX(410,120,110,50,'U4 MC3423P','CR17 1N4753A 36V')}${BX(540,120,110,50,'Q7 2N6238','R59 1Ω 5W')}${T(30,270,'U3 ILD-1 · R54 2K VOUT · R52 2K2 · R53 4K3 1W · R55 39K · R57 3K3 · R58 100 · R60 3K3 3W · DS2 GN · R61/R62 10K · C28/C29 0.33/100')}` },
  {name:'4 · TL495 control', note:'U1 pins from the scan: 5 = CT C21 1000P, 6 = RT R40 22K, 4 = dead-time/soft-start (C19 4.7/16, R34 10K, Q6 P1086, CR12 1N4148, J5), 1/2 and 15/16 error amps, 8/11 outputs to T3.', svg:()=>
    `${BX(330,90,220,140,'U1 TL495CN','')}${T(320,120,'pin 8, 11 → T3 drive','var(--accent2)','end')}${T(320,150,'pin 12 VCC ← C15/C16, R32 100 3W','var(--accent2)','end')}${T(320,180,'pin 4 DTC ← C19 4.7/16, R34 10K, Q6','var(--accent2)','end')}${T(320,210,'pin 7, 9, 10 → 0 V','var(--accent2)','end')}
     ${T(560,120,'pin 6 RT ← R40 22K','var(--accent2)')}${T(560,150,'pin 5 CT ← C21 1000P 1KV','var(--accent2)')}${T(560,180,'pins 1/2 ← U3 opto, R41 10K, R39 470K/C20','var(--accent2)')}${T(560,210,'pins 15/16 ← U2B LF353 (I-LIMIT)','var(--accent2)')}
     ${T(20,270,'Start-up: Q4 MJE13007 + Q5 MPSW42, CR10 1N4744A 15 V, R26 10K 5W, R27/R28 24K 1W, R29/R30 47K, CR11 1N4003, C17 2.2/35 · f = 1.1/(RT·CT) = '+(FOSC/1000).toFixed(1)+' kHz')}` },
];
let si=0, orig=false;
function viewSchem(m){ window[KEY]=false;
  m.innerHTML=card('Schematics — redrawn (not the original CAD) · original scan alongside', `<div id="tb" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p>`);
  const draw=()=>{ m.querySelector('#tb').innerHTML=SHEETS.map((s,k)=>`<button class="${k===si&&!orig?'on':''}" data-i="${k}">${s.name}</button>`).join('')+`<button data-o="1" class="${orig?'on':''}">Original scan (B 8245-02-001 ISS 8)</button>`;
    m.querySelectorAll('#tb button').forEach(b=>b.onclick=()=>{ if(b.dataset.o) orig=true; else {orig=false; si=+b.dataset.i;} draw(); });
    if (orig){ m.querySelector('#sh').innerHTML=`<div style="background:#fff;border-radius:8px;padding:6px"><img src="${ASSET}m8245-schematic.png" style="width:100%;min-width:900px" alt="M8245 schematic scan"></div>`; m.querySelector('#sn').textContent='“M8245 Schematic Filtran.pdf”, a 2011 Xerox scan of WBS drawing B 8245-02-001 ISS 8 (cropped).'; return; }
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 300" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px">${SHEETS[si].svg()}<text x="850" y="292" text-anchor="end" font-size="10" fill="var(--ink2)">M8245 · sheet ${si+1}/${SHEETS.length} · redrawn 2026|59</text></svg>`;
    m.querySelector('#sn').textContent=SHEETS[si].note; };
  draw(); }
const STATES=[['off','OFF'],['startup','START-UP (Q4/Q5)'],['soft','SOFT START (pin 4)'],['run','REGULATE'],['limit','CURRENT LIMIT'],['hiccup','HICCUP'],['rest','REST'],['crowbar','CROWBAR (Q7)']];
function viewSoft(m){ window[KEY]=false;
  m.innerHTML=`<p class="small muted">The M8245 has no software. This tab shows the power path stage by stage and the protection state machine, live.</p><div class="grid2">${card('Power path, stage by stage', `<div id="sp"></div>`)}${card('Protection state machine (playhead)', `<div id="fsm"></div>`)}</div>`;
  SIM.on('time', ()=>{ const t=SIM.t, b=bulk(), r=rails(t), d=dutyAt(t);
    const st=[['Mains (1,A / 4,D)', D.on?D.vac+' V':'—'],['CR1 + C4/C5 bulk', b.v.toFixed(0)+' V'],['Half bridge Q1/Q2', (b.v/2).toFixed(0)+' V swing · '+(FSW/1000).toFixed(0)+' kHz'],['T4 secondary peak', (b.v/2*NT).toFixed(1)+' V '+'(ratio inferred)'],['PWM duty', (d*100).toFixed(1)+' %'],['MR821 + L1/C24', (voutAt(t)+0.9).toFixed(2)+' V'],['CR18 1N5404 → 12,N', '+'+r.p.toFixed(2)+' V'],['CR19 1N5404 → 10,L', r.n.toFixed(2)+' V']];
    let y=10, s=`<svg viewBox="0 0 520 ${st.length*40+20}" style="width:100%">`; st.forEach(x=>{ s+=`<rect x="10" y="${y}" width="500" height="32" rx="6" fill="var(--panel2)" stroke="var(--line)"/><text x="20" y="${y+21}" font-size="12" fill="var(--ink)">${x[0]}</text><text x="500" y="${y+21}" text-anchor="end" font-size="12.5" font-family="var(--mono)" fill="var(--ink)">${x[1]}</text>`; y+=40; });
    m.querySelector('#sp').innerHTML=s+'</svg>';
    const k=segAt(t)?.k; let f=`<svg viewBox="0 0 520 260" style="width:100%">`; STATES.forEach((x,i)=>{ const X=20+(i%3)*165, Y=20+Math.floor(i/3)*80; f+=`<rect x="${X}" y="${Y}" width="150" height="50" rx="10" fill="${k===x[0]?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${X+75}" y="${Y+30}" text-anchor="middle" font-size="11.5" fill="${k===x[0]?'#fff':'var(--ink)'}">${x[1]}</text>`; });
    f+=`<text x="20" y="250" font-size="10.5" fill="var(--ink2)">off → start-up → soft start → regulate ⇄ limit → hiccup ⇄ rest → soft start; over-voltage → crowbar → hiccup.</text></svg>`;
    m.querySelector('#fsm').innerHTML=f; });
}
function viewNotes(m){ window[KEY]=false;
  m.innerHTML=card('Findings — what the M8245 folder is up to', `<ol>
   <li><b>The “Filtran” drawings are Ward-Beck's own.</b> Both PDFs carry the WBS title block: “M8245 POWER SUPPLY SCHEMATIC” B 8245-02-001 ISS 8 and “COMPONENT LAYOUT” B 8245-06-001 ISS 8 (PCB 14-149 ISS 6). The folder README calls them “vendor (Filtran …) schematic and outline drawing”. More likely they were scanned in 2011 to send to Filtran, for a quote or a second source ${inf('file names and scan date')}.</li>
   <li><b>The magnetics are WBS part numbers.</b> T1 80-42, T2 80-38, T3 80-35, T4 80-34 and L1/L2 80-36 are WBS stock numbers. Those wound parts are the ones a magnetics maker like Filtran would supply.</li>
   <li><b>The card is ±22 V; its later spec sheet says ±21 V.</b> The schematic labels the outputs +22 V / −22 V. m8245aspecs.wpd (M8245A) gives +21 V @ 4 A and −21 V @ 3 A “with redundancy diodes”. The difference is about one 1N5404 drop (CR18/CR19), which are the redundancy diodes.</li>
   <li><b>A wrong link destroys the card.</b> With J1 (115 V) fitted on 230 V mains, the doubler puts ≈ 650 V on C4/C5, which are two 820 µF / 200 V parts. Layout note 1 hides the links on the solder side.</li>
   <li><b>Drive resistors depend on the transformer batch.</b> Note 4, repeated on the layout as “SEE NOTE 2”: R6 and R10 “may be 15 or 75 ohms due to supplier variations in driver transformer T3”.</li>
   <li><b>A 1 kV capacitor is used as the timing capacitor.</b> C21 (TL495 CT, 1000 pF) and C20 are marked “1KV”: high-voltage ceramics reused on the low-voltage control side, probably to share a BOM line with the snubbers (C8/C9 330P 1KV) ${inf('BOM practice')}.</li>
   <li><b>Last designations</b> on the sheet: C32, CR19, DS2, J5, L2, Q7, R63, T4 and U4. The layout matches (CR19 and R63 are present), so issue 8 schematic and issue 6 PCB agree.</li>
   <li><b>The same card edge fits the R2K frame.</b> The edge has 12 + 12 contacts (1–12 / A–N). MF250.BAK's PSU sockets use a 24-contact “EDAC24” pattern on a board derived from the MF8210 DA frame. That ties the M8245 to the R2K console supply (see the M8246 and MF250 plugins) ${inf('pattern names')}.</li></ol>`)
   + card('Assumptions in this model', `<ul class="small"><li>T4 turns ratio 0.5 (secondary per half-primary) and the 45 % maximum duty ${inf('TL495 data')}.</li><li>R54 trims ±8 %, R20 sets a 100–220 W limit ${inf('pot ranges')}.</li><li>Hiccup: 50 ms on, 300 ms off; start-up delay 12 ms ${inf('')}.</li><li>Efficiency 80 % (M8245A spec) used for input power and bulk ripple.</li><li>DS1 red = limit/fault, DS2 green = output present ${inf('LED position on the schematic')}.</li></ul>`)
   + card('Sources', `<ul class="small mono"><li>#SERIALBOX #SERIES/XXX - M8245 - #Master #OBSOLETE/M8245 Schematic Filtran.pdf · M8245 Drawing Filtran.pdf</li><li>…/#SERIALBOX #SERIES/SERIALBOXX - #mf100/m8245aspecs.wpd (identical copy in OBSOLETE - SERIALBOXX/mf100)</li><li>…/#CONSOLES - #OBSOLETE #Archive/MF250/MF250.BAK, MF251.PCB</li><li>assets: m8245-schematic.png, m8245-layout.png</li></ul>`);
}
SIM.register({
  id:'m8245', product:'M8245', name:'M8245 · ±22 V switch-mode power supply card (2011|44 scans)', year:2011,
  family:'Obsolete products', folder:'#SERIALBOX #SERIES/XXX - M8245 - #Master #OBSOLETE',
  summary:'An off-line half-bridge switch-mode supply on one plug-in card: TL495 PWM at 50 kHz, two MJE13007s, opto-isolated feedback, current-limit hiccup and an SCR crowbar, giving ±22 V. It powered WBS frames (the M8245A version in the MF100) and, inside the M8246, the R2K console.',
  highlights:['Component layout scan as the clickable board','50 kHz PWM, soft start and hiccup in slow motion','115/230 V link and doubler behaviour','Crowbar and current-limit tutorial','The “Filtran” drawings are WBS originals'],
  depth:'Hardware model', duration:1,
  stepUnits:[{label:'1 oscillator ramp (20 µs)',period:()=>1/FOSC},{label:'1 mains cycle',period:()=>1/D.hz},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s (whole second)'],[0.25,'250 ms (soft start)'],[1/60,'1 mains cycle'],[0.001,'1 ms'],[0.0001,'100 µs'],[0.00004,'40 µs (2 ramps)']],
  defaultZoom:0,
  init(){ SK=''; },
  tabs:[
    {id:'sim',label:'Simulator',render:viewSim},
    {id:'tutorial',label:'Tutorial: bench test',render:viewTut},
    {id:'second',label:'One second, slow motion',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock},
    {id:'schematic',label:'Schematics',render:viewSchem},
    {id:'software',label:'Power path',render:viewSoft},
    {id:'findings',label:'Findings',render:viewNotes},
  ],
});
})();
