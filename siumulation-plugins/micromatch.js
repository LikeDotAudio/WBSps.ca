/* =====================================================================
   microMATCH — "micro" series stereo level-matching box (silk 2015|48, covers 2016|49)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, microMATCH - #MASTER/):
   - MICRO MATCH - #Silks/MICROMATCH(FINAL CURVE).cdr (MAR.16/15): GREEN and WHITE separations of the top cover
       plus 1:1 views of the front edge and the right-hand end. Converted to PDF and cut with
       tools/silk_extract.py -> assets/micromatch-top-green.png, assets/micromatch-top-white.png (200 px per inch)
   - MICRO MATCH - #Silks/MICROMATCH.cdr (text-object copy: the labels below are read from it)
   - MICROMATCH-TOP (COVER) ISS.1.dwg, MICROMATCH-BOTTOM (COVER) ISS.1.dwg (+ #MECHANICAL copies, #ARCHIVE layouts):
       sidecar text only ("SAND 120 GRIT AND PAINT", "SHERWIN WILLIAMS POLANE T F63B120", "2 PLC`S (FROM OTHER SIDE)",
       "4 PLC`S (FROM THIS SIDE)", "ALL BENDS ARE 90 DEG.") — no DWG converter was available
   There is NO schematic, PCB or BOM for microMATCH in the archive. The electrical model is built from the
   silkscreen labels alone and is marked "inferred" throughout.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const ASSET = 'siumulation-plugins/assets/';

/* Geometry measured off the 1:1 CorelDRAW views (inches), 200 px per inch */
const GEO = {
  top:{w:4.32,h:2.56}, front:{w:4.32,h:0.95}, end:{w:0.95,h:2.50},
  pwrRect:{x:0.154,y:0.51,w:0.330,h:0.140},     // rectangular cut-out under "POWER"
  led:{x:0.696,y:0.430,d:0.130},                 // .130 round hole (3 mm LED)
  term:{x:0.898,y:0.324,w:2.130,h:0.332},        // terminal-block window under OUT / IN
  trs:{x:3.3925,y:0.5145,d:0.203},               // .203 round hole under "T R S"
  pots:[{y:0.50,lbl:'R'},{y:1.50,lbl:'L'}],      // two .250 holes in the end, labelled ADJUST R (top) / L
};
/* Terminal positions: x of each silk label on the top cover (px at 200 dpi), in order left → right */
const TERMS = [
  {x:212,lb:'+',grp:'R OUT'},{x:236,lb:'−',grp:'R OUT'},{x:258,lb:'G',grp:'R OUT'},
  {x:319,lb:'+',grp:'L OUT'},{x:342,lb:'−',grp:'L OUT'},{x:364,lb:'G',grp:'L OUT'},
  {x:426,lb:'+',grp:'MONO OUT'},{x:447,lb:'−',grp:'MONO OUT'},{x:469,lb:'G',grp:'MONO OUT'},
  {x:520,lb:'L',grp:'IN'},{x:552,lb:'G',grp:'IN'},{x:586,lb:'R',grp:'IN'},
];

/* ---------------- inferred electrical model ---------------- */
const M = {
  NOM_IN: -10,          // consumer line level, dBV — inferred from the name "MATCH"
  NOM_OUT: 4,           // professional line level, dBu — inferred
  TRIM_MIN: 0, TRIM_MAX: 20,   // ADJUST range in dB — inferred
  SUPPLIES: { usb:{name:'5 V single supply (micro-USB-sized cut-out)', rail:5, sw:0.2}, pm15:{name:'±15 V supply', rail:30, sw:1.5} },
};
const D = {
  power:true, supply:'usb', src:'trs',     // trs | term | none
  lvl:-10, fL:1000, fR:1000, phaseR:0,     // source dBV and frequency per channel; R polarity (0 or 180)
  trimL:11.8, trimR:11.8,                  // ADJUST L / R, dB
  outs:{R:true, L:true, MONO:false},       // which outputs have a load connected
  log:[],
};
const dBV2V = d => Math.pow(10,d/20);          // rms
const V2dBu = v => v>0? 20*Math.log10(v/0.7746) : -Infinity;
const fmt = x => !isFinite(x)? '−∞' : (x>=0?'+':'')+x.toFixed(1);
function sup(){ return M.SUPPLIES[D.supply]; }
function maxDiffPk(){ const s=sup(); return D.power? (s.rail - 2*s.sw) : 0; }     // each leg swings rail − 2·sw p-p; differential peak = that
function inV(ch,t){ if (!D.power && false) return 0; if (D.src==='none') return 0; const A=dBV2V(D.lvl)*Math.SQRT2; return ch? A*Math.sin(2*Math.PI*D.fR*t + (D.phaseR?Math.PI:0)) : A*Math.sin(2*Math.PI*D.fL*t); }
function clipD(v){ const m=maxDiffPk(); return Math.max(-m,Math.min(m,v)); }
function outDiff(which,t){
  if (!D.power) return 0;
  const gL=dBV2V(D.trimL), gR=dBV2V(D.trimR);
  const L=inV(0,t)*gL, R=inV(1,t)*gR;
  return clipD(which==='L'?L: which==='R'?R : (L+R)/2);
}
function legs(which,t){ const d=outDiff(which,t); return {p:d/2, n:-d/2}; }     // symmetric active balanced driver, inferred
function levels(){
  const vin=D.src==='none'?0:dBV2V(D.lvl);
  const L=vin*dBV2V(D.trimL), R=vin*dBV2V(D.trimR);
  const sameF = D.fL===D.fR;
  const mono = sameF ? Math.abs(L + (D.phaseR?-1:1)*R)/2 : Math.sqrt(L*L+R*R)/2;
  const lim = maxDiffPk()/Math.SQRT2;
  return {vin, L, R, mono, lim, clipL:L>lim, clipR:R>lim, clipM:mono>lim};
}

function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,trace:tr}); if (D.log.length>40) D.log.length=40; SIM.refresh(); }
const A = {
  power(){ act(D.power?'Unplug power':'Plug in power', tr=>{ D.power=!D.power;
    tr(`Front edge cut-out under “POWER” (0.330 × 0.140 in): it fits a micro-USB socket or a small slide switch ${inf}`);
    tr(`The .130 in hole next to it takes a 3 mm LED: ${D.power?'lit':'off'} ${inf}`); }); },
  plugTRS(){ act(D.src==='trs'?'Unplug the 3.5 mm TRS':'Plug a 3.5 mm TRS into IN', tr=>{ D.src = D.src==='trs'?'none':'trs';
    tr('Front edge .203 in hole under “T R S” / “L R G”: tip = L, ring = R, sleeve = G (the silk says so)');
    tr(`Assumed wired in parallel with the IN “L G R” terminals ${inf}`); }); },
  useTerm(){ act('Wire the source to the IN L G R terminals', tr=>{ D.src='term'; tr('Terminal positions 10–12: L, G, R (note the order: G in the middle)'); }); },
  trim(ch,d){ act(`Turn ADJUST ${ch} ${d>0?'up':'down'}`, tr=>{ const k=ch==='L'?'trimL':'trimR'; D[k]=Math.max(M.TRIM_MIN,Math.min(M.TRIM_MAX,+(D[k]+d).toFixed(1)));
    tr(`End-panel .250 in hole “${ch}” (${ch==='R'?'upper':'lower'}): a trimmer setting the ${ch} gain ${inf}`);
    tr(`${ch} gain = ${fmt(D[k])} dB → output ${fmt(V2dBu(levels()[ch]))} dBu`); }); },
  toggleOut(o){ act(`${D.outs[o]?'Disconnect':'Connect'} the ${o} output`, tr=>{ D.outs[o]=!D.outs[o];
    tr(`Terminal block, ${o} “+ − G”: balanced output ${inf}`); if (o==='MONO') tr('MONO = (L + R) / 2: L and R in opposite polarity cancel here'); }); },
  reset(){ Object.assign(D,{power:true,supply:'usb',src:'trs',lvl:-10,fL:1000,fR:1000,phaseR:0,trimL:11.8,trimR:11.8,outs:{R:true,L:true,MONO:false},log:[]}); SIM.refresh(); },
};

/* ---------------- drawing: top cover (real silk), front edge, end ---------------- */
function topSVG(){
  return `<svg viewBox="0 0 864 512" role="img" aria-label="microMATCH top cover, real silkscreen" style="width:100%;max-width:640px;display:block;border-radius:6px">
    <rect width="864" height="512" fill="var(--dev)"/>
    <image href="${ASSET}micromatch-top-green.svg" width="864" height="512"/><image href="${ASSET}micromatch-top-white.svg" width="864" height="512"/>
    ${[110,412].map(y=>`<circle cx="59" cy="${y}" r="9" fill="#555a5e"><title>Cover screw (“2 PLC'S (FROM OTHER SIDE)” in MICROMATCH-TOP ISS.1)</title></circle>`).join('')}
    </svg><div class="small muted">Top cover · 4.32 × 2.56 in · black (Polane T F63B120), green + white ink (real separations)</div>`;
}
function frontSVG(){
  const k=200, g=GEO; const lit=D.power;
  let s=`<svg viewBox="0 0 864 190" role="img" aria-label="microMATCH front edge (drawn to scale from the silk file's 1:1 view)" style="width:100%;max-width:640px;display:block;border-radius:6px"><rect width="864" height="190" fill="var(--dev)"/>
    <g class="mmp" style="cursor:pointer"><title>POWER — click to plug or unplug</title><rect x="${g.pwrRect.x*k}" y="${g.pwrRect.y*k}" width="${g.pwrRect.w*k}" height="${g.pwrRect.h*k}" rx="4" fill="#0a0a0b" stroke="#777"/>${D.power?`<rect x="${g.pwrRect.x*k+6}" y="${g.pwrRect.y*k+5}" width="${g.pwrRect.w*k-12}" height="${g.pwrRect.h*k-10}" fill="var(--accent)"/>`:''}</g>
    <circle cx="${g.led.x*k}" cy="${g.led.y*k}" r="${g.led.d*k/2}" fill="${lit?'#7dff6a':'var(--led-off)'}" stroke="#000"/>
    <rect x="${g.term.x*k}" y="${g.term.y*k}" width="${g.term.w*k}" height="${g.term.h*k}" fill="#1f7a3a" stroke="#0b3b1c" stroke-width="2"/>`;
  TERMS.forEach((tm,i)=>{ const out=tm.grp.split(' ')[0]; const con = tm.grp==='IN'? D.src==='term' : D.outs[out];
    s+=`<g class="mmt" data-g="${tm.grp}" style="cursor:pointer"><title>${tm.grp} ${tm.lb} — click to ${con?'disconnect':'connect'}</title><rect x="${tm.x-10}" y="${g.term.y*k+6}" width="20" height="${g.term.h*k-12}" fill="#2aa04f" stroke="#0b3b1c"/><circle cx="${tm.x}" cy="${g.term.y*k+g.term.h*k/2}" r="7" fill="#c9cdd1" stroke="#555"/><line x1="${tm.x-5}" y1="${g.term.y*k+g.term.h*k/2}" x2="${tm.x+5}" y2="${g.term.y*k+g.term.h*k/2}" stroke="#555" stroke-width="2"/>
      ${con?`<line x1="${tm.x}" y1="${g.term.y*k+g.term.h*k}" x2="${tm.x}" y2="186" stroke="${tm.lb==='G'?'#888':tm.lb==='−'||tm.lb==='R'?'#d33':'#eee'}" stroke-width="4"/>`:''}
      <text x="${tm.x}" y="${g.term.y*k-6}" font-size="12" text-anchor="middle" fill="#e8e8e2">${tm.lb}</text></g>`; });
  s+=`<g class="mmj" style="cursor:pointer"><title>3.5 mm TRS input — click to plug or unplug</title><circle cx="${g.trs.x*k}" cy="${g.trs.y*k}" r="${g.trs.d*k/2+6}" fill="#2a2c2e" stroke="#666"/><circle cx="${g.trs.x*k}" cy="${g.trs.y*k}" r="${g.trs.d*k/2-6}" fill="${D.src==='trs'?'#9a9da1':'#000'}"/></g>
    <text x="${g.term.x*k}" y="30" font-size="12" fill="#e8e8e2">R OUT · L OUT · MONO · IN</text><text x="${g.trs.x*k}" y="40" font-size="12" text-anchor="middle" fill="#e8e8e2">TRS</text><text x="12" y="40" font-size="12" fill="#e8e8e2">POWER</text>
    </svg><div class="small muted">Front edge · 4.32 × 0.95 in (1:1 view in MICROMATCH(FINAL CURVE).cdr)</div>`;
  return s;
}
function endSVG(){
  const k=200;
  return `<svg viewBox="0 0 190 500" role="img" aria-label="microMATCH end with the two ADJUST holes" style="width:100%;max-width:110px;display:block;border-radius:6px"><rect width="190" height="500" fill="var(--dev)"/>
    ${GEO.pots.map(p=>{ const v=p.lbl==='L'?D.trimL:D.trimR; const a=(-135+270*(v-M.TRIM_MIN)/(M.TRIM_MAX-M.TRIM_MIN))*Math.PI/180;
      return `<g class="mmk" data-ch="${p.lbl}" style="cursor:pointer"><title>ADJUST ${p.lbl} — click the top half to turn up, the bottom half to turn down</title><circle cx="90" cy="${p.y*k}" r="40" fill="transparent"/><circle cx="90" cy="${p.y*k}" r="25" fill="#1d1f21" stroke="#777"/><circle cx="90" cy="${p.y*k}" r="17" fill="#c9cdd1"/><line x1="${90-14*Math.sin(a)}" y1="${p.y*k+14*Math.cos(a)}" x2="${90+14*Math.sin(a)}" y2="${p.y*k-14*Math.cos(a)}" stroke="#333" stroke-width="4"/><text x="90" y="${p.y*k+48}" text-anchor="middle" font-size="16" fill="#e8e8e2">${p.lbl} ${fmt(v)}</text></g>`; }).join('')}
    </svg><div class="small muted">End · 0.95 × 2.50 in</div>`;
}
function bind(root){
  root.querySelectorAll('.mmp').forEach(g=>g.onclick=()=>A.power());
  root.querySelectorAll('.mmj').forEach(g=>g.onclick=()=>A.plugTRS());
  root.querySelectorAll('.mmt').forEach(g=>g.onclick=()=>{ const grp=g.dataset.g; if (grp==='IN') A.useTerm(); else A.toggleOut(grp.split(' ')[0]); });
  root.querySelectorAll('.mmk').forEach(g=>{ g.onclick=e=>{ const r=g.getBoundingClientRect(); A.trim(g.dataset.ch, (e.clientY-r.top)/r.height<0.5? 0.5 : -0.5); };
    g.addEventListener('wheel',e=>{ e.preventDefault(); A.trim(g.dataset.ch, e.deltaY<0?0.5:-0.5); },{passive:false}); });
}

/* ---------------- lanes ---------------- */
function waveLane(fn, lo, hi, color, lim){ return function(c,X,t0,t1,y,h){
  const pw=X(t1)-X(t0), N=Math.max(2,Math.floor(pw)), span=t1-t0, Y=v=>y+h/2-(v/(hi))*(h/2-3);
  const dense = span*Math.max(D.fL,D.fR) > pw/3;
  if (lim){ c.strokeStyle=SIM.css('--bad'); c.setLineDash([3,3]); [lim,-lim].forEach(v=>{ if(Math.abs(v)<hi){ c.beginPath(); c.moveTo(X(t0),Y(v)); c.lineTo(X(t1),Y(v)); c.stroke(); }}); c.setLineDash([]); }
  c.strokeStyle=color; c.lineWidth=1.2; c.beginPath();
  if (dense){ for(let p=0;p<N;p++){ let mn=1e9,mx=-1e9; for(let q=0;q<6;q++){ const v=fn(t0+span*(p+q/6)/N + (q*0.000137)); if(v<mn)mn=v; if(v>mx)mx=v; } c.moveTo(X(t0)+p+.5,Y(mx)); c.lineTo(X(t0)+p+.5,Y(mn)+.5); } }
  else for(let p=0;p<=N;p++){ const tt=t0+span*p/N, v=fn(tt); p?c.lineTo(X(tt),Y(v)):c.moveTo(X(tt),Y(v)); }
  c.stroke(); }; }
function lanes(){
  const Ain=Math.max(0.05,dBV2V(D.lvl)*Math.SQRT2*1.2), lim=maxDiffPk(), l=levels(), pk=Math.max(l.L,l.R,l.mono)*Math.SQRT2, Aout=Math.max(0.3,Math.min(lim*1.15,pk*1.6));
  return [
    {label:'IN L (V)', h:36, draw:waveLane(t=>inV(0,t),-Ain,Ain,SIM.css('--ink'))},
    {label:'IN R (V)', h:36, draw:waveLane(t=>inV(1,t),-Ain,Ain,SIM.css('--ink2'))},
    {label:'L OUT + / − legs', h:44, draw(c,X,t0,t1,y,h){ waveLane(t=>legs('L',t).p,-Aout,Aout,SIM.css('--accent'),lim/2)(c,X,t0,t1,y,h); waveLane(t=>legs('L',t).n,-Aout,Aout,SIM.css('--bad'))(c,X,t0,t1,y,h); }},
    {label:'L OUT differential', h:40, draw:waveLane(t=>outDiff('L',t),-Aout,Aout,SIM.css('--accent'),lim)},
    {label:'R OUT differential', h:40, draw:waveLane(t=>outDiff('R',t),-Aout,Aout,SIM.css('--accent2'),lim)},
    {label:'MONO OUT (L+R)/2', h:40, draw:waveLane(t=>outDiff('MONO',t),-Aout,Aout,SIM.css('--warn'),lim)},
    {label:'POWER LED', h:20, draw(c,X,t0,t1,y,h){ c.fillStyle=D.power?'#3fbf5f':SIM.css('--grid'); c.fillRect(X(t0),y+5,X(t1)-X(t0),h-10); }},
  ];
}

/* ---------------- views ---------------- */
const card=(t,b)=>`<div class="card"><h2>${t}</h2>${b}</div>`;
function stageTable(){
  const l=levels();
  const row=(n,v,clip)=>`<tr><td>${n}</td><td class="mono">${v>0?fmt(V2dBu(v))+' dBu':'—'}</td><td class="mono">${v>0?(v).toFixed(3)+' V rms':''}</td><td>${clip?'<b style="color:var(--bad)">CLIPS</b>':v>0?fmt(20*Math.log10(l.lim/v))+' dB headroom':''}</td></tr>`;
  return `<table class="kv"><tr><th>Point</th><th>Level</th><th></th><th></th></tr>
    <tr><td>Source (${D.src==='none'?'nothing plugged in':D.src==='trs'?'3.5 mm TRS':'IN terminals'})</td><td class="mono">${l.vin?fmt(D.lvl)+' dBV':'—'}</td><td class="mono">${l.vin?fmt(V2dBu(l.vin))+' dBu':''}</td><td></td></tr>
    ${row('L OUT (trim '+fmt(D.trimL)+' dB)', l.L, l.clipL)}${row('R OUT (trim '+fmt(D.trimR)+' dB)', l.R, l.clipR)}${row('MONO OUT', l.mono, l.clipM)}
    <tr><th>Clip point</th><td colspan="3" class="mono">${D.power? fmt(V2dBu(l.lim))+' dBu differential on '+sup().name : 'unpowered'} ${inf}</td></tr></table>`;
}
function traceHTML(){ const e=D.log[0]; return e? `<div><b>${e.name}</b> at ${SIM.fmtT(e.t)}</div>`+e.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click the power cut-out, the TRS jack, the terminals or the two ADJUST trimmers.</div>'; }
function controls(){
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-top:8px">
   <label>Source <input type="range" id="mlv" min="-30" max="6" step="1" value="${D.lvl}"> <span id="mlvv" class="mono"></span></label>
   <label>L <select id="mfl">${[100,440,1000].map(f=>`<option ${f===D.fL?'selected':''}>${f}</option>`).join('')}</select> Hz</label>
   <label>R <select id="mfr">${[100,440,1000,1200].map(f=>`<option ${f===D.fR?'selected':''}>${f}</option>`).join('')}</select> Hz</label>
   <label><input type="checkbox" id="mph" ${D.phaseR?'checked':''}> R polarity inverted</label>
   <label>Supply ${inf} <select id="msu">${Object.keys(M.SUPPLIES).map(k=>`<option value="${k}" ${k===D.supply?'selected':''}>${M.SUPPLIES[k].name}</option>`).join('')}</select></label>
   <button id="mrs">Reset</button></div>`;
}
function bindControls(m){
  const q=s=>m.querySelector(s); const up=()=>{ q('#mlvv').textContent=fmt(D.lvl)+' dBV'; };
  q('#mlv').oninput=e=>{ D.lvl=+e.target.value; up(); SIM.refresh(); }; q('#mfl').onchange=e=>{D.fL=+e.target.value; SIM.refresh();}; q('#mfr').onchange=e=>{D.fR=+e.target.value; SIM.refresh();};
  q('#mph').onchange=e=>{ D.phaseR=e.target.checked?1:0; SIM.refresh(); }; q('#msu').onchange=e=>{ D.supply=e.target.value; SIM.refresh(); }; q('#mrs').onclick=()=>A.reset(); up();
}
function unitHTML(){ return `<div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap"><div style="flex:1;min-width:260px"><div id="tp"></div><div id="fe" style="margin-top:6px"></div><div class="small muted" style="margin-top:4px">Top-cover artwork: ${SIM.src('microMATCH - #MASTER/MICRO MATCH - #Silks/MICROMATCH(FINAL CURVE).cdr','MICROMATCH(FINAL CURVE).cdr')} (MAR.16/15), GREEN + WHITE plates as vector art; grey lines are the cover outline guides.</div></div><div id="en"></div></div>`; }
function drawUnit(m){ m.querySelector('#tp').innerHTML=topSVG(); m.querySelector('#fe').innerHTML=frontSVG(); m.querySelector('#en').innerHTML=endSVG(); bind(m); }
function viewSim(m){
  m.innerHTML=`<div class="grid2"><div>${card('microMATCH: top cover (real silk), front edge and ADJUST end, drawn to scale', unitHTML()+controls())}</div>
    <div>${card('Levels '+inf, `<div id="st"></div>`)}${card('What the last action touched', `<div id="tr" class="log"></div>`)}</div></div>
    ${card('Timeline (one second; zoom in to see the cycles)', `<canvas id="tl"></canvas><p class="small muted">The archive holds no circuit for microMATCH. The function (consumer −10 dBV in, balanced +4 dBu out, a mono sum, L/R trims) comes from the silkscreen labels, and every level is ${inf}. The panels and their hole positions are real.</p>`)}`;
  bindControls(m);
  SIM.on('time',()=>{ drawUnit(m); m.querySelector('#st').innerHTML=stageTable(); m.querySelector('#tr').innerHTML=traceHTML(); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:170}); });
}
const LESSONS=[
  {title:'Meet the microMATCH', body:`<p>A small “micro” series box: a folded black cover (4.32 × 2.56 × 0.95 in) printed with a green <b>micro</b> and a white <b>WBS MATCH</b>. On the front edge are a POWER input and LED, a 12-way terminal block (<b>OUT R, L, MONO</b> as + − G, then <b>IN L G R</b>) and a 3.5 mm <b>TRS</b> jack. The end has two holes marked <b>ADJUST R / L</b>.</p><p class="muted">No manual or circuit survives. This is how the labels suggest it was used ${inf}.</p>`, check:()=>true, auto:true},
  {title:'1 · Power it', body:'<p>Click the POWER cut-out on the front edge. The LED lights.</p>', check:()=>D.power, hint:'The small rectangle at the left of the front edge.'},
  {title:'2 · Plug in a consumer source', body:'<p>Plug a 3.5 mm stereo cable (a computer, phone or CD player) into the <b>TRS</b> jack. Set the source to <b>−10 dBV</b>.</p>', check:()=>D.src!=='none' && D.lvl===-10, hint:'Click the round TRS jack at the right; use the Source slider.'},
  {title:'3 · Connect the L and R outputs', body:'<p>Click a terminal of the <b>L</b> and <b>R</b> OUT groups to wire them to the balanced inputs of the console.</p>', check:()=>D.outs.L&&D.outs.R, hint:'Click any of the + − G screws under R and L.'},
  {title:'4 · Match to +4 dBu', body:'<p>Turn <b>ADJUST L</b> and <b>ADJUST R</b> until both outputs read +4 dBu, within 0.5 dB. At −10 dBV in, that needs about +11.8 dB of gain.</p>', check:()=>{ const l=levels(); return Math.abs(V2dBu(l.L)-4)<=0.5 && Math.abs(V2dBu(l.R)-4)<=0.5; }, hint:'Click the top half of each trimmer on the end view to turn it up; the bottom half turns it down.'},
  {title:'5 · Use the MONO output', body:'<p>Connect <b>MONO</b>. It carries (L+R)/2. Now tick <b>R polarity inverted</b>: with the same tone on both channels, MONO nearly vanishes. A polarity error in the source wiring kills a mono feed this way.</p>', check:()=>D.outs.MONO && D.phaseR===1 && levels().mono<0.05*levels().L, hint:'Connect MONO, tick the polarity box, and keep the L and R trims equal.'},
  {title:'Done', body:'<p>That covers every label on the box. The Findings tab lists what the silkscreen and cover drawings reveal, and what is missing from the archive.</p>', check:()=>true, auto:true},
];
let li=0;
function viewTut(m){
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — using a microMATCH '+inf, `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="le"></div></div><div>${card('The unit', unitHTML()+controls())}${card('Levels', `<div id="st"></div>`)}</div></div>`;
  bindControls(m);
  const draw=()=>{ drawUnit(m); m.querySelector('#st').innerHTML=stageTable();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===li?'font-weight:700;color:var(--accent)':''}">${l.title}${i<li?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(e=>e.onclick=()=>{ li=+e.dataset.i; draw(); });
    const L=LESSONS[li], ok=L.check();
    m.querySelector('#le').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${li?'':'disabled'}>◀ Back</button><button id="nx" ${li<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="r0">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{li=Math.max(0,li-1);draw();}; m.querySelector('#nx').onclick=()=>{li=Math.min(LESSONS.length-1,li+1);draw();};
    m.querySelector('#r0').onclick=()=>{ A.reset(); D.power=false; D.src='none'; D.trimL=D.trimR=0; D.outs={R:false,L:false,MONO:false}; li=0; SIM.refresh(); };
  };
  SIM.on('time',draw);
}
function viewSecond(m){
  m.innerHTML=`${card('One second in a microMATCH', `<div id="ld"></div>`)}<div class="grid2">${card('Scope at the playhead: L OUT legs, 3 cycles', `<canvas id="sc"></canvas><div id="si" class="small mono"></div>`)}${card('Unit', unitHTML())}</div>${card('Timeline', `<canvas id="tl"></canvas>`)}`;
  SIM.on('time',()=>{
    const l=levels();
    m.querySelector('#ld').innerHTML=`<table class="kv"><tr><th>What happens</th><th>per second</th><th>notes</th></tr>
      <tr><td>L tone cycles</td><td class="mono">${D.fL}</td><td>${SIM.fmtDur(1/D.fL)} each</td></tr><tr><td>R tone cycles</td><td class="mono">${D.fR}</td><td>${D.fL===D.fR?'same frequency: MONO adds them '+(D.phaseR?'out of phase (cancels)':'in phase (+6 dB over one, then halved)'):'different frequencies: MONO beats at '+Math.abs(D.fL-D.fR)+' Hz'}</td></tr>
      <tr><td>Processing</td><td class="mono">none</td><td>No clock, no firmware: an analog box ${inf}. The “second” is just the audio passing through.</td></tr></table>`;
    const {c,w}=SIM.canvas(m.querySelector('#sc'),160), span=3/D.fL, t0=Math.max(0,Math.min(1-span,SIM.t-span/2)), A=Math.max(0.5,maxDiffPk()*0.6);
    c.strokeStyle=SIM.css('--grid'); c.strokeRect(4,4,w-8,152);
    [[t=>legs('L',t).p,SIM.css('--accent'),'+ leg'],[t=>legs('L',t).n,SIM.css('--bad'),'− leg'],[t=>inV(0,t),SIM.css('--ink2'),'IN L']].forEach(([f,col,lb],k)=>{ c.strokeStyle=col; c.beginPath(); for(let p=0;p<=300;p++){ const tt=t0+span*p/300, yy=80-f(tt)/A*70; p?c.lineTo(8+(w-16)*p/300,yy):c.moveTo(8,yy);} c.stroke(); c.fillStyle=col; c.font='11px sans-serif'; c.fillText(lb,10,18+k*13); });
    const px=8+(w-16)*(SIM.t-t0)/span; c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(px,4); c.lineTo(px,156); c.stroke();
    const g=legs('L',SIM.t); m.querySelector('#si').textContent=`t = ${SIM.fmtT(SIM.t)} · IN L ${inV(0,SIM.t).toFixed(3)} V · L+ ${g.p.toFixed(3)} V · L− ${g.n.toFixed(3)} V`;
    drawUnit(m); SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:170});
  });
}
const BL={src:{x:10,y:70,w:140,h:70,t:'IN',s:['3.5 mm TRS (T=L R=R S=G)','terminals L G R']},tr:{x:190,y:20,w:150,h:70,t:'ADJUST L',s:['end trimmer (lower)','gain (inferred)']},tr2:{x:190,y:120,w:150,h:70,t:'ADJUST R',s:['end trimmer (upper)','gain (inferred)']},bl:{x:380,y:20,w:150,h:70,t:'Balanced driver L',s:['L OUT + − G']},br:{x:380,y:120,w:150,h:70,t:'Balanced driver R',s:['R OUT + − G']},mo:{x:570,y:70,w:150,h:70,t:'Mono sum',s:['(L+R)/2 → MONO + − G']},pw:{x:10,y:200,w:200,h:50,t:'POWER',s:['cut-out 0.33 × 0.14 in + LED']}};
const BW=[['src','tr'],['src','tr2'],['tr','bl'],['tr2','br'],['tr','mo'],['tr2','mo']];
function viewBlock(m){
  m.innerHTML=card('Block diagram '+inf+' (from the silkscreen labels only)', `<div id="bd"></div><p class="small">Every block here comes from a printed label. The circuit inside each block is unknown: the archive has no schematic, PCB or BOM for microMATCH.</p>`)+card('Mechanical assembly (MICROMATCH-TOP / -BOTTOM (COVER) ISS.1)', `<div id="mech"></div>`);
  let s=`<svg viewBox="0 0 740 270" style="width:100%"><defs><marker id="mma" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
  const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
  BW.forEach(([a,b])=>{ const [x1,y1]=ctr(BL[a]),[x2,y2]=ctr(BL[b]); s+=`<line x1="${BL[a].x+BL[a].w}" y1="${y1}" x2="${BL[b].x}" y2="${y2}" stroke="var(--ink2)" marker-end="url(#mma)"/>`; });
  for (const k in BL){ const b=BL[k]; s+=`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="var(--line)"/><text x="${b.x+8}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+38+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}`; }
  m.querySelector('#bd').innerHTML=s+'</svg>';
  const k=60; // px per inch
  m.querySelector('#mech').innerHTML=`<svg viewBox="0 0 760 300" style="width:100%">
    <text x="10" y="16" font-size="12" font-weight="700" fill="var(--ink)">Exploded view, to scale (60 px per inch)</text>
    <rect x="40" y="40" width="${4.32*k}" height="${2.56*k}" fill="var(--panel2)" stroke="var(--ink)"/><text x="${40+2.16*k}" y="${40+1.28*k}" text-anchor="middle" font-size="12" fill="var(--ink)">TOP COVER (silk side)</text>
    <circle cx="${40+0.295*k}" cy="${40+0.55*k}" r="4" fill="var(--ink)"/><circle cx="${40+0.295*k}" cy="${40+2.06*k}" r="4" fill="var(--ink)"/><text x="${40+0.4*k}" y="${40+2.4*k}" font-size="10" fill="var(--ink2)">2 PLC'S (FROM OTHER SIDE)</text>
    <rect x="40" y="${60+2.56*k}" width="${4.32*k}" height="${0.95*k}" fill="var(--panel2)" stroke="var(--ink)"/><text x="${40+2.16*k}" y="${60+2.56*k+0.55*k}" text-anchor="middle" font-size="11" fill="var(--ink)">front edge: POWER · LED · terminals · TRS</text>
    <rect x="${80+4.32*k}" y="40" width="${0.95*k}" height="${2.5*k}" fill="var(--panel2)" stroke="var(--ink)"/><circle cx="${80+4.32*k+0.45*k}" cy="${40+0.5*k}" r="${0.125*k}" fill="none" stroke="var(--ink)"/><circle cx="${80+4.32*k+0.45*k}" cy="${40+1.5*k}" r="${0.125*k}" fill="none" stroke="var(--ink)"/><text x="${80+4.32*k}" y="${55+2.5*k}" font-size="10" fill="var(--ink2)">end: ADJUST R / L</text>
    <rect x="${120+5.27*k}" y="40" width="${4.32*k*0.7}" height="${2.56*k*0.7}" fill="none" stroke="var(--ink)" stroke-dasharray="5 3"/><text x="${125+5.27*k}" y="${60}" font-size="11" fill="var(--ink)">BOTTOM COVER ISS.1</text><text x="${125+5.27*k}" y="${76}" font-size="10" fill="var(--ink2)">“4 PLC'S (FROM THIS SIDE)”: inserts for the PCB (inferred)</text><text x="${125+5.27*k}" y="${92}" font-size="10" fill="var(--ink2)">“ALL BENS ARE 90 DEG.” (sic)</text>
    <text x="10" y="290" font-size="11" fill="var(--ink2)">Both covers: “SAND 120 GRIT AND PAINT”, “SHERWIN WILLIAMS POLANE T F63B120” (the earlier archive copy says “F63B120R”).</text></svg>`;
}
function viewSchem(m){
  m.innerHTML=card('Schematic set — a conceptual sheet, redrawn from the silkscreen labels, NOT from a circuit', `<svg viewBox="0 0 860 380" style="width:100%;background:var(--lane);border:1px solid var(--line);border-radius:8px"><g fill="none">
    ${[['TRS T','L',60],['TRS R','R',220]].map(([a,b,y])=>`<text x="20" y="${y}" font-size="11" fill="var(--accent2)">${a} / IN ${b}</text><path d="M120 ${y-4} H200" stroke="var(--ink)"/><path d="M200 ${y-30} V${y+22} L260 ${y-4} Z" stroke="var(--ink)" fill="var(--panel2)"/><text x="206" y="${y+40}" font-size="10" fill="var(--ink)">ADJUST ${b} (gain) ${''}</text><path d="M260 ${y-4} H340" stroke="var(--ink)"/><path d="M340 ${y-30} V${y+22} L400 ${y-4} Z" stroke="var(--ink)" fill="var(--panel2)"/><text x="344" y="${y+40}" font-size="10" fill="var(--ink)">balanced driver</text><path d="M400 ${y-14} H520 M400 ${y+6} H520" stroke="var(--ink)"/><text x="526" y="${y-10}" font-size="11" fill="var(--accent2)">${b} OUT +</text><text x="526" y="${y+10}" font-size="11" fill="var(--accent2)">${b} OUT −</text><path d="M300 ${y-4} V140" stroke="var(--ink2)" stroke-dasharray="3 3"/>`).join('')}
    <path d="M300 140 H600" stroke="var(--ink2)"/><path d="M600 112 V168 L660 140 Z" stroke="var(--ink)" fill="var(--panel2)"/><text x="600" y="186" font-size="10" fill="var(--ink)">(L+R)/2 → MONO + − G</text>
    <text x="20" y="300" font-size="12" fill="var(--ink)">Every G terminal and the TRS sleeve: common ground ${''}</text>
    <text x="20" y="330" font-size="12" fill="var(--bad)">Conceptual only: the topology, gains and supply are inferred. The archive has no microMATCH schematic.</text></g></svg>`)
   + card('Pin-out from the silkscreen (fact)', `<table class="kv"><tr><th>Terminal (left → right)</th><th>Label</th></tr>${TERMS.map((t,i)=>`<tr><td class="mono">${i+1}</td><td>${t.grp} ${t.lb}</td></tr>`).join('')}<tr><td class="mono">TRS</td><td>T = L, R = R, S = G</td></tr></table>`);
}
function viewPath(m){
  m.innerHTML=card('Signal path, stage by stage (no software: a hardware-only product)', `<div id="st"></div>${controls()}`)+card('Level diagram', `<canvas id="lv"></canvas>`);
  bindControls(m);
  SIM.on('time',()=>{ m.querySelector('#st').innerHTML=stageTable(); const l=levels(); const {c,w}=SIM.canvas(m.querySelector('#lv'),200);
    const pts=[['source',l.vin],['L out',l.L],['R out',l.R],['mono',l.mono]]; const Y=v=>180-((Math.max(-40,Math.min(30,v))+40)/70)*165;
    c.strokeStyle=SIM.css('--grid'); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; for(let d=-40;d<=30;d+=10){ c.beginPath(); c.moveTo(50,Y(d)); c.lineTo(w-10,Y(d)); c.stroke(); c.fillText(d+' dBu',4,Y(d)+3); }
    c.strokeStyle=SIM.css('--bad'); c.setLineDash([4,3]); c.beginPath(); c.moveTo(50,Y(V2dBu(l.lim))); c.lineTo(w-10,Y(V2dBu(l.lim))); c.stroke(); c.setLineDash([]);
    pts.forEach(([n,v],i)=>{ const x=80+i*(w-120)/3, d=V2dBu(v); c.fillStyle=SIM.css('--accent'); c.fillRect(x-14,Y(isFinite(d)?d:-40),28,180-Y(isFinite(d)?d:-40)); c.fillStyle=SIM.css('--ink'); c.fillText(n+' '+(isFinite(d)?d.toFixed(1):'—'),x-24,196); }); });
}
function viewFindings(m){
  m.innerHTML=card('What the archive says about microMATCH', `<ol>
   <li><b>Artwork 2026|59: top cover now from ${SIM.src('microMATCH - #MASTER/MICRO MATCH - #Silks/MICROMATCH(FINAL CURVE).cdr','MICROMATCH(FINAL CURVE).cdr')} (MAR.16/15).</b> The GREEN and WHITE plates are drawn as vector art (assets/micromatch-top-green.svg, -top-white.svg) on the same frame as the earlier cut, so the terminals, TRS and trims stay on their legends. Two green screw marks sit at the left edge, matching the top-cover drawing's “2 PLC'S”.</li>
   <li><b>Only the outside survives.</b> The folder holds the silkscreen (2 CorelDRAW files, MAR.16/15) and the cover drawings (ISS.1, March–April 2016|49). There is no schematic, PCB, BOM or manual. A search of the whole archive's sidecars finds no other file that mentions microMATCH. Everything electrical in this plugin is ${inf}.</li>
   <li><b>The silk was drawn a year before the covers.</b> The silk is dated MAR.16/15 (2015|48). The covers are ISS.1 from 15 March 2016 (bottom) and 7 April 2016 (top and the flat layout). The artwork came first.</li>
   <li><b>The labels define the interface.</b> POWER (with a 0.33 × 0.14 in cut-out and a .130 in LED hole), a 12-way terminal block (OUT R + − G, L + − G, MONO + − G, IN L G R), a 3.5 mm TRS (T = L, R = R, S = G), and two .250 in end holes marked ADJUST R (upper) and L (lower). That is consistent with a consumer-to-professional stereo matching interface with a mono sum.</li>
   <li><b>Odd orders.</b> The outputs run <b>R before L</b>, left to right. The IN terminals read <b>L G R</b> (ground in the middle), while the TRS label under them reads <b>L R G</b>. Anyone wiring from the labels has to read each group carefully.</li>
   <li><b>Two-colour wordmark across separations.</b> The green separation holds the “micro” wordmark and its frame. The white separation holds the WBS letters and “MATCH”. The white WBS sits inside the green frame. The microIMP4 silk uses the same arrangement.</li>
   <li><b>Cover screws match the silk.</b> The top-cover drawing calls for “2 PLC'S (FROM OTHER SIDE)”, and the silk carries exactly two screw marks at the left edge. The bottom cover has “4 PLC'S (FROM THIS SIDE)”, presumably the PCB standoffs ${inf}.</li>
   <li><b>Spelling and paint codes.</b> The bottom-cover note reads “ALL BENS ARE 90 DEG.”. The paint is “POLANE T F63B120”. The earlier archive copy of the top cover says “F63B120R”, and POD-series parts use F63B12. The same code family appears on AMS16 parts.</li>
   <li><b>Duplicates.</b> The two ISS.1 DWGs in the folder root are identical copies of those in <span class="mono">MICRO MATCH - #MECHANICAL/</span>.</li></ol>`)
   + card('Assumptions in this simulation', `<ul class="small"><li>Consumer −10 dBV in, +4 dBu out, L/R trims 0 to +20 dB, symmetric active balanced outputs, MONO = (L+R)/2 ${inf}.</li><li>Supply: 5 V (a micro-USB-sized cut-out) or ±15 V, selectable; outputs clip 0.2 V or 1.5 V from each rail ${inf}.</li><li>Panel drawings: positions measured from the 1:1 views in MICROMATCH(FINAL CURVE).cdr. The ink is the real separation.</li></ul>`);
}
SIM.register({
  footnotes:[
    {text:'The outputs are labelled R before L, left to right.', src:'microMATCH - #MASTER/MICRO MATCH - #Silks/MICROMATCH(FINAL CURVE).cdr'},
    {text:'The IN terminals read L G R (ground in the middle), but the TRS legend beside them reads L R G.', src:'microMATCH - #MASTER/MICRO MATCH - #Silks/MICROMATCH(FINAL CURVE).cdr'},
    {text:'The silk is dated MAR.16/15, a year before the ISS.1 cover drawings (March–April 2016).', src:'microMATCH - #MASTER/MICRO MATCH - #Silks/MICROMATCH(FINAL CURVE).cdr'},
    {text:'The bottom-cover note reads “ALL BENS ARE 90 DEG.” (for BENDS).', src:'microMATCH - #MASTER'},
    {text:'The two ISS.1 DWGs in the folder root duplicate those in MICRO MATCH - #MECHANICAL/.', src:'microMATCH - #MASTER'},
    {text:'The silk was kept as a live-text MICROMATCH.cdr and a curve copy MICROMATCH(FINAL CURVE).cdr.', src:'microMATCH - #MASTER/MICRO MATCH - #Silks/MICROMATCH.cdr'}],
  id:'micromatch', name:'microMATCH · stereo level-matching box (2015|48)', duration:1,
  product:'microMATCH', year:2015, family:'Monitors, meters & tools', folder:'microMATCH - #MASTER',
  summary:'A small Ward-Beck “micro” box. The archive keeps only its silkscreen and cover drawings: POWER, a 3.5 mm TRS input, a 12-way terminal block (OUT R, L, MONO as + − G, IN L G R) and two ADJUST trimmers. The plugin shows the real artwork and holes to scale, and models the consumer-to-pro matching that those labels suggest.',
  highlights:['Real green + white silk on the top cover','Front edge and trimmer end drawn 1:1 from the CorelDRAW views','Clickable power, TRS, terminals and ADJUST trims','Mono sum and polarity cancellation (inferred circuit)'],
  depth:'Hardware model',
  stepUnits:[{label:'1 cycle (L)', period:()=>1/D.fL},{label:'1 ms', period:()=>0.001},{label:'10 ms', period:()=>0.01}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms'],[0.003,'3 ms'],[0.001,'1 ms']], defaultZoom:3,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram & assembly',render:viewBlock},{id:'schematic',label:'Schematic (conceptual)',render:viewSchem},{id:'software',label:'Signal path',render:viewPath},{id:'findings',label:'Findings',render:viewFindings}],
});
})();
