/* =====================================================================
   QTP — Quad Twisted Pair DB25 ↔ RJ45 adapters (Ward-Beck Systems, 2015|48)
   Plugin for the WBS Device Simulator (../siumulation.html)
   Sources used (all in this archive, under "#QTP #SERIES/QTP - DB25M -  DB25F - DB25Y - DB25S - #Engineering"):
   - QTP-DB25 - #PCB Rev 4.4 - IN PRODUCTION #Eagle/QTP DB25 - Rev 4.4.sch / .brd and Rev 4.5.sch / .brd
       (EAGLE 6.6 XML: every pin map below is read from the <net>/<pinref> elements, the CON-QTP
        pin→pad table and the board <element> positions and silk <text>)
   - …/QTP - DB 25 - REV 4.4 - BOM.csv
   - …/QTP - DB 25 - REV 4.4 - #ISS1 #Gerber/QTP DB25 - Rev 4.4.cmpsilk, .stc, .dim → assets/qtp-panel-*.png
   - QTP-DB25 - #PCB #Archive #Eagle/ REV 3, REV 3.1, REV 4 schematics (history)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf">inferred</span>';

/* ---------------- pin maps (from the Rev 4.4 schematic) ---------------- */
const PAIR_PAD = { '+1':2, '-1':1, '+2':4, '-2':5, '+3':6, '-3':3, '+4':8, '-4':7 };   // CON-QTP: PAIR±n → RJ45 pad (P$9–P$12 = shield tabs → GROUND)
const PAIR_COL = { 1:['orange','#f08a24','SUN'], 2:['blue','#2f6fd6','SKY'], 3:['green','#2fa84a','GRASS'], 4:['brown','#8a5a2b','DIRT'] };  // silk names for the striped wire
const TASCAM = { // DB25 pin for each channel, + / − (M, F, S variants: identical in REV 3 … 4.5)
  1:[24,12],2:[10,23],3:[21,9],4:[7,20],5:[18,6],6:[4,17],7:[15,3],8:[1,14] };
const TASCAM_GND = [2,5,8,11,13,16,19,22,25];
const YAMAHA = { 1:[1,14],2:[2,15],3:[3,16],4:[4,17],5:[5,18],6:[6,19],7:[7,20],8:[8,21] };
const YAMAHA_GND = [9,10,11,12,13,22,23,24,25];
const VARIANTS = {
  M:{name:'QTP-DB25M', db:'DB-MALE1/2/3 (M25HP)', rj:['M_1-1 “CH1-4”','M_5-8 “CH5-8”'], map:TASCAM, gnd:TASCAM_GND, rjLbl:['CH1-4','CH5-8'], sex:'male', cells:[[0,0],[1,0],[2,0]]},
  S:{name:'QTP-DB25S', db:'DB-MALE (Rev 4.5: DB-MALE-SHIELD) + SHEILD+ jumper', rj:['M_1-4 “CH1-4”','M_5-6 “CH5-8”'], map:TASCAM, gnd:TASCAM_GND, rjLbl:['CH1-4','CH5-8'], sex:'male', cells:[[0,1]]},
  F:{name:'QTP-DB25F', db:'DB-FEMALE (F25HP)', rj:['F_1-4 “CH1-4”','F_5-6 “CH5-8”'], map:TASCAM, gnd:TASCAM_GND, rjLbl:['CH1-4','CH5-8'], sex:'female', cells:[[1,1]]},
  Y:{name:'QTP-25YMH', db:'DB-MALE_YAMAHA (M25HP)', rj:['YMH_IN “IN”','YMH_OUT “OUT”'], map:YAMAHA, gnd:YAMAHA_GND, rjLbl:['IN','OUT'], sex:'male', cells:[[2,1]]},
};
/* channel → (jack 0/1, pair 1..4) */
const chJack = ch => ({ jack: ch<=4?0:1, pair: ((ch-1)%4)+1 });

/* ---------------- Cat5 line model (TIA-568 typical values — not in the archive, inferred) ---------------- */
const CAT = { C:52e-12, Rdc:0.094, Z0:100, vf:0.69 };   // per metre per pair; 24 AWG; velocity factor
/* ---------------- state ---------------- */
const D = { variant:'M', sel:{kind:'ch', v:1}, len:30, sig:'analog', srcZ:50, loadZ:10000, level:4, shield:false, log:[] };
const V = () => VARIANTS[D.variant];

function trace(){
  const v=V(); let ch=null;
  if (D.sel.kind==='ch') ch=D.sel.v;
  else if (D.sel.kind==='db'){ for (const c in v.map){ if (v.map[c].includes(D.sel.v)) ch=+c; } }
  else if (D.sel.kind==='rj'){ const [jack,pad]=D.sel.v; for (const k in PAIR_PAD){ if (PAIR_PAD[k]===pad){ const pair=+k[1]; ch = jack*4+pair; } } }
  if (!ch) return {ch:null, gnd: D.sel.kind==='db' && v.gnd.includes(D.sel.v)};
  const {jack,pair}=chJack(ch), [hot,cold]=v.map[ch];
  return {ch, jack, pair, hot, cold, padHot:PAIR_PAD['+'+pair], padCold:PAIR_PAD['-'+pair], col:PAIR_COL[pair]};
}
function line(){
  const L=D.len, C=CAT.C*L, R=2*CAT.Rdc*L, delay=L/(CAT.vf*3e8);
  const fc = 1/(2*Math.PI*(D.srcZ+R)*C);                         // analog: source R driving the pair capacitance
  const att = 20*Math.log10(D.loadZ/(D.loadZ+D.srcZ+R));          // resistive divider at DC
  const gamma = (D.loadZ-CAT.Z0)/(D.loadZ+CAT.Z0);                // AES: reflection at the load
  const aesAtt = 4.1*Math.sqrt(3.072/4)*L/100;                     // ≈ Cat5e insertion loss scaled from 4.1 dB/100 m at 4 MHz (inferred)
  return {C,R,delay,fc,att,gamma,aesAtt};
}

/* ---------------- actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,trace:tr}); if (D.log.length>40) D.log.length=40; SIM.refresh(); }
const A = {
  variant(k){ act('Pick '+VARIANTS[k].name, tr=>{ D.variant=k; tr(`DB25: ${VARIANTS[k].db}; RJ45: ${VARIANTS[k].rj.join(', ')}`); tr(k==='Y'?'Yamaha pinout: hot 1–8, cold 14–21, ground 9–13 and 22–25':'TASCAM (AES59) pinout: ch1 24/12 … ch8 1/14, grounds 2,5,8,11,13,16,19,22,25'); }); },
  pickCh(c){ act('Trace channel '+c, tr=>{ D.sel={kind:'ch',v:c}; const t=trace(); tr(`DB25 pin ${t.hot} (+) and ${t.cold} (−) → ${V().rjLbl[t.jack]} jack, pair ${t.pair}: RJ-${t.padHot} ${t.col[0]} (+), RJ-${t.padCold} ${t.col[2]} (−)`); }); },
  pickDb(p){ act('Trace DB25 pin '+p, tr=>{ D.sel={kind:'db',v:p}; const t=trace(); if (t.ch) tr(`Pin ${p} is channel ${t.ch} ${p===t.hot?'+':'−'} → ${V().rjLbl[t.jack]} RJ-${p===t.hot?t.padHot:t.padCold}`); else tr(t.gnd? `Pin ${p} is ground: tied to every RJ45 shield tab (P$9–P$12) and the copper pour`+(p===13&&D.variant!=='Y'?' — TASCAM leaves pin 13 unconnected; QTP grounds it':'') : `Pin ${p} is not connected`); }); },
  pickRj(j,pad){ act(`Trace ${V().rjLbl[j]} RJ45 pin ${pad}`, tr=>{ D.sel={kind:'rj',v:[j,pad]}; const t=trace(); tr(`RJ-${pad} → channel ${t.ch} ${pad===t.padHot?'+':'−'} → DB25 pin ${pad===t.padHot?t.hot:t.cold}`); }); },
  shield(){ act(D.shield?'Open the SHEILD+ jumper':'Bridge the SHEILD+ solder jumper', tr=>{ D.shield=!D.shield; tr('SHEILD+ (SJW) pad 2 = GND; pad 1 = net N$444, which has no other connection in the schematic or the board (no copper pour on it)'); tr(D.shield?'Bridging it therefore changes nothing electrically in Rev 4.4/4.5 as drawn (see Findings)':'Open: as shipped'); }); },
};

/* ---------------- drawing ---------------- */
const ASSET='siumulation-plugins/assets/';
/* panel from the Rev 4.4 ISS1 Gerbers at 100 dpi: 810 × 480 px = 8.10″ × 4.80″ (board 205.74 × 116.84 mm from y = 20 px) */
function panelSVG(){
  let s=`<svg viewBox="0 0 810 480" style="width:100%;max-width:900px;display:block;border-radius:6px" role="img" aria-label="QTP Rev 4.4 panel from the Gerbers"><rect width="810" height="480" fill="#17407a"/><image href="${ASSET}qtp-panel-pads.png" width="810" height="480"/><image href="${ASSET}qtp-panel-silk.png" width="810" height="480"/>`;
  for (const k in VARIANTS) VARIANTS[k].cells.forEach(([cx,cy])=>{ const x=cx*270, y=20+cy*230, on=D.variant===k;
    s+=`<rect class="cell" data-v="${k}" x="${x+2}" y="${y+2}" width="266" height="226" fill="${on?'rgba(255,210,80,.12)':'transparent'}" stroke="${on?'#ffd250':'rgba(255,255,255,.15)'}" stroke-width="${on?3:1}" style="cursor:pointer"><title>${VARIANTS[k].name} — click to select</title></rect>`; });
  [135,270,405,540,675].forEach(x=>s+=`<line x1="${x}" y1="20" x2="${x}" y2="480" stroke="rgba(255,90,90,.5)" stroke-dasharray="6 5"/>`);
  s+=`<line x1="0" y1="250" x2="810" y2="250" stroke="rgba(255,90,90,.5)" stroke-dasharray="6 5"/><text x="4" y="14" font-size="11" fill="#fcc">dashed: the “V - cut” lines of the .brd dimension layer (every 34.29 mm and at 58.42 mm)</text>`;
  if (D.variant==='S') s+=`<circle cx="${63.881/25.4*100}" cy="${480-(48.1584/25.4*100)}" r="9" fill="${D.shield?'#d8b04a':'none'}" stroke="#ffd250" stroke-width="2"><title>SHEILD+ jumper</title></circle>`;
  return s+'</svg>';
}
/* DB25 face (front view) and two RJ45 faces, drawn schematically to show the routing */
function dbX(p){ return p<=13? 40+(13-p)*34 : 57+(25-p)*34; }   // front view of a male plug: pin 1 at the right of the top row (female mirrors)
function dbY(p){ return p<=13? 60 : 100; }
function connSVG(){
  const v=V(), t=trace(), fem=v.sex==='female';
  const X = p => fem? 40+ (40+12*34) - dbX(p) + 0 : dbX(p);
  let s=`<svg viewBox="0 0 900 330" style="width:100%;display:block" role="img" aria-label="Pin trace">
    <text x="20" y="22" font-size="13" font-weight="700" fill="var(--ink)">${v.name}: DB25 ${v.sex} (face view) ↔ two RJ45 jacks (face view, T568B colours)</text>
    <path d="M24,38 h456 l-20,90 h-416 z" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.5"/>`;
  for (let p=1;p<=25;p++){ const isG=v.gnd.includes(p); let col='var(--ink2)', role='nc';
    for (const c in v.map){ if (v.map[c][0]===p){ role='+'; col=PAIR_COL[chJack(+c).pair][1]; } if (v.map[c][1]===p){ role='−'; col=PAIR_COL[chJack(+c).pair][1]; } }
    if (isG) { role='G'; col='#777'; }
    const hl = t.ch && (p===t.hot||p===t.cold) || (D.sel.kind==='db' && D.sel.v===p);
    s+=`<g class="dbp" data-p="${p}" style="cursor:pointer"><circle cx="${X(p)}" cy="${dbY(p)}" r="${hl?13:10}" fill="${role==='−'?'#fff':col}" stroke="${col}" stroke-width="${role==='−'?4:2}"/>${hl?`<circle cx="${X(p)}" cy="${dbY(p)}" r="16" fill="none" stroke="var(--warn)" stroke-width="3"/>`:''}<text x="${X(p)}" y="${dbY(p)+ (p<=13?-16:28)}" text-anchor="middle" font-size="10" fill="var(--ink)">${p}</text><title>DB25 pin ${p}: ${role==='G'?'ground':role==='nc'?'not connected':role}</title></g>`; }
  [0,1].forEach(j=>{ const x0=540+j*180; s+=`<rect x="${x0}" y="40" width="150" height="110" rx="8" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.5"/><rect x="${x0+45}" y="125" width="60" height="25" fill="var(--panel)" stroke="var(--ink)"/><text x="${x0+75}" y="172" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${v.rjLbl[j]}</text>`;
    for (let pad=1;pad<=8;pad++){ let pair=0, sign=''; for (const k in PAIR_PAD) if (PAIR_PAD[k]===pad){ pair=+k[1]; sign=k[0]; }
      const col=PAIR_COL[pair][1], hl = t.ch && t.jack===j && (pad===t.padHot||pad===t.padCold);
      const x=x0+14+(pad-1)*17.5; s+=`<g class="rjp" data-j="${j}" data-pad="${pad}" style="cursor:pointer"><rect x="${x-6}" y="${hl?52:58}" width="12" height="${hl?52:44}" fill="${sign==='-'?'#fff':col}" stroke="${col}" stroke-width="3"/><text x="${x}" y="118" text-anchor="middle" font-size="10" fill="var(--ink)">${pad}</text><title>RJ-${pad}: pair ${pair} ${sign==='+'?'+ '+PAIR_COL[pair][0]:'− '+PAIR_COL[pair][2]+' (white/'+PAIR_COL[pair][0]+')'} → ch ${j*4+pair}</title></g>`; } });
  if (t.ch){ const j=t.jack, x0=540+j*180, xh=x0+14+(t.padHot-1)*17.5, xc=x0+14+(t.padCold-1)*17.5;
    s+=`<path d="M${X(t.hot)},${dbY(t.hot)} C${X(t.hot)},230 ${xh},230 ${xh},104" fill="none" stroke="${t.col[1]}" stroke-width="3"/><path d="M${X(t.cold)},${dbY(t.cold)} C${X(t.cold)},260 ${xc},260 ${xc},104" fill="none" stroke="${t.col[1]}" stroke-width="3" stroke-dasharray="7 5"/>
      <text x="20" y="300" font-size="12" fill="var(--ink)">Channel ${t.ch}: DB25 ${t.hot} (+) / ${t.cold} (−) → ${v.rjLbl[j]} RJ-${t.padHot} ${t.col[0]} (+) / RJ-${t.padCold} ${t.col[2]} = white/${t.col[0]} (−) · ground: RJ45 shield tabs + DB25 ${v.gnd.join(', ')}</text>`; }
  else if (t.gnd) s+=`<text x="20" y="300" font-size="12" fill="var(--ink)">Ground pin: joined to every RJ45 shield tab (P$9–P$12) and the copper pour.</text>`;
  return s+`<text x="20" y="322" font-size="10" fill="var(--ink2)">Filled = + (solid colour), white with coloured ring = − (striped wire). Click any pin.</text></svg>`;
}
function bindAll(root){
  root.querySelectorAll('.cell').forEach(c=>c.addEventListener('click',()=>A.variant(c.dataset.v)));
  root.querySelectorAll('.dbp').forEach(c=>c.addEventListener('click',()=>A.pickDb(+c.dataset.p)));
  root.querySelectorAll('.rjp').forEach(c=>c.addEventListener('click',()=>A.pickRj(+c.dataset.j,+c.dataset.pad)));
}
function controls(){
  return `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
   <span class="small muted">Channel</span>${[1,2,3,4,5,6,7,8].map(c=>`<button data-ch="${c}" class="${trace().ch===c?'on':''}">${c}</button>`).join('')}
   <label class="small">Cable <input type="range" id="ln" min="1" max="300" value="${D.len}"> <span class="mono" id="lnv">${D.len} m</span></label>
   <label class="small">Signal <select id="sg"><option value="analog" ${D.sig==='analog'?'selected':''}>analog line (+4 dBu)</option><option value="aes" ${D.sig==='aes'?'selected':''}>AES3 48 kHz</option></select></label>
   <label class="small">Source Z <select id="sz">${[50,100,600].map(z=>`<option ${z===D.srcZ?'selected':''}>${z}</option>`).join('')}</select> Ω</label>
   <label class="small">Load Z <select id="lz">${[110,600,10000].map(z=>`<option ${z===D.loadZ?'selected':''}>${z}</option>`).join('')}</select> Ω</label>
   ${D.variant==='S'?`<button id="sj" class="${D.shield?'on':''}">SHEILD+ jumper</button>`:''}</div>`;
}
function bindControls(m){
  m.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>A.pickCh(+b.dataset.ch));
  const q=s=>m.querySelector(s);
  q('#ln').oninput=e=>{ D.len=+e.target.value; q('#lnv').textContent=D.len+' m'; SIM.refresh(); };
  q('#sg').onchange=e=>{ D.sig=e.target.value; if (D.sig==='aes'){ D.loadZ=110; D.srcZ=110; } else { D.loadZ=10000; D.srcZ=50; } SIM.refresh(); };
  q('#sz').onchange=e=>{ D.srcZ=+e.target.value; SIM.refresh(); }; q('#lz').onchange=e=>{ D.loadZ=+e.target.value; SIM.refresh(); };
  const sj=q('#sj'); if (sj) sj.onclick=()=>A.shield();
}
function syncCh(m){ const c=trace().ch; m.querySelectorAll('[data-ch]').forEach(b=>b.classList.toggle('on', +b.dataset.ch===c)); }
function lineTable(){ const l=line();
  return `<table class="kv"><tr><th>Pair capacitance</th><td class="mono">${(l.C*1e9).toFixed(2)} nF (${(CAT.C*1e12).toFixed(0)} pF/m ${'inferred'})</td></tr><tr><th>Loop resistance</th><td class="mono">${l.R.toFixed(2)} Ω (24 AWG)</td></tr><tr><th>Delay</th><td class="mono">${SIM.fmtDur(l.delay)} (VF ${CAT.vf})</td></tr>
   ${D.sig==='analog'?`<tr><th>−3 dB corner</th><td class="mono">${l.fc>1e6?(l.fc/1e6).toFixed(2)+' MHz':(l.fc/1e3).toFixed(1)+' kHz'} (source ${D.srcZ} Ω into the pair)</td></tr><tr><th>DC level loss</th><td class="mono">${l.att.toFixed(3)} dB into ${D.loadZ} Ω</td></tr>`
     :`<tr><th>Reflection at the load</th><td class="mono">Γ = ${l.gamma.toFixed(3)} (return loss ${(-20*Math.log10(Math.abs(l.gamma)||1e-9)).toFixed(1)} dB; 110 Ω AES on 100 Ω Cat5)</td></tr><tr><th>Loss at 3.07 MHz</th><td class="mono">≈ ${l.aesAtt.toFixed(2)} dB ${'(inferred)'}</td></tr>`}</table>`; }

/* ---------------- timeline ---------------- */
function lanes(){
  const css=SIM.css, l=line(), t=trace(), L=[];
  const f = D.sig==='aes'? 128*48000 : 1000;     // AES biphase cell rate or a 1 kHz tone
  const shape=(tt)=> D.sig==='aes'? (Math.floor(tt*f*0.73+Math.sin(tt*9e5))%2?1:-1) : Math.sin(2*Math.PI*f*tt);
  const lag = tt => { // first-order response of the line (analog) / edge rounding (AES)
    if (D.sig==='analog') return shape(tt);
    const tau = D.srcZ*l.C/2 + 5e-9*Math.sqrt(D.len); return shape(tt) * (1-Math.exp(-((tt*f)%1)/(tau*f+1e-9)));
  };
  const drawW=(c,X,t0,t1,y,h,fn,col)=>{ const pw=X(t1)-X(t0), span=t1-t0; if (span*f>pw/2){ c.fillStyle=col; c.globalAlpha=.3; c.fillRect(X(t0),y+4,pw,h-8); c.globalAlpha=1; c.fillStyle=SIM.css('--ink'); c.font='10px sans-serif'; c.fillText(D.sig==='aes'?'AES3 bit cells (163 ns): zoom to 2 µs':'1 kHz tone: zoom in',X(t0)+4,y+h/2+4); return; }
    c.strokeStyle=col; c.beginPath(); for (let i=0;i<=700;i++){ const tt=t0+span*i/700; const v=fn(tt); const yy=y+h/2-v*(h/2-3); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); };
  const col = t.ch? t.col[1] : css('--accent');
  L.push({label:`DB25 pin ${t.ch?t.hot:'?'} (+) at the source`, h:34, draw(c,X,t0,t1,y,h){ drawW(c,X,t0,t1,y,h,tt=>0.5*shape(tt),col); }});
  L.push({label:`DB25 pin ${t.ch?t.cold:'?'} (−) at the source`, h:34, draw(c,X,t0,t1,y,h){ drawW(c,X,t0,t1,y,h,tt=>-0.5*shape(tt),css('--ink2')); }});
  L.push({label:`RJ-${t.ch?t.padHot:'?'}/${t.ch?t.padCold:'?'} at the far end (${D.len} m later)`, h:40, draw(c,X,t0,t1,y,h){ drawW(c,X,t0,t1,y,h,tt=>lag(tt-l.delay)*Math.pow(10,(D.sig==='aes'?-l.aesAtt:l.att)/20),css('--warn')); }});
  return L;
}

/* ================================================================ VIEWS ================================================================ */
const card=(t,b)=>`<div class="card"><h2>${t}</h2>${b}</div>`;
function viewSim(m){
  window.__qtpActive=false;
  m.innerHTML = `<div class="grid2">${card('The Rev 4.4 production panel (from the Gerbers): click a board to pick the variant','<div id="pn"></div>')}${card('Selected','<div id="info" class="small"></div><div id="tr" class="log" style="margin-top:6px"></div>')}</div>`
   + card('Pin tracer: click a DB25 pin, an RJ45 pin or a channel', '<div id="cn"></div><div style="margin-top:8px" id="ctl">'+controls()+'</div>')
   + `<div class="grid2">${card('The cable','<div id="cable"></div>')}${card('Pin map, '+'all 8 channels','<div id="map"></div>')}</div>`
   + card('Timeline (a passive adapter: what goes in comes out, delayed and filtered by the cable)','<canvas id="tl"></canvas>');
  bindControls(m); let lastV=D.variant;
  SIM.on('time',()=>{ const v=V();
    m.querySelector('#pn').innerHTML=panelSVG(); m.querySelector('#cn').innerHTML=connSVG(); bindAll(m);
    if (lastV!==D.variant && (lastV==='S'||D.variant==='S')){ m.querySelector('#ctl').innerHTML=controls(); bindControls(m); } lastV=D.variant; syncCh(m);
    m.querySelector('#info').innerHTML=`<b>${v.name}</b><br>DB25: ${v.db}<br>RJ45: ${v.rj.join(' · ')}<br>Pinout: ${v.map===YAMAHA?'Yamaha':'TASCAM (AES59)'}`;
    m.querySelector('#tr').innerHTML = D.log[0]? `<div><b>${D.log[0].name}</b></div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click a pin.</div>';
    m.querySelector('#cable').innerHTML=lineTable();
    m.querySelector('#map').innerHTML=`<table class="kv"><tr><th>Ch</th><th>DB25 + / −</th><th>RJ45</th><th>pins + / −</th><th>wires</th></tr>${[1,2,3,4,5,6,7,8].map(c=>{ const {jack,pair}=chJack(c), [h,k]=v.map[c]; return `<tr class="${trace().ch===c?'hl':''}"><td class="mono">${c}</td><td class="mono">${h} / ${k}</td><td>${v.rjLbl[jack]}</td><td class="mono">${PAIR_PAD['+'+pair]} / ${PAIR_PAD['-'+pair]}</td><td class="small">${PAIR_COL[pair][0]} / white-${PAIR_COL[pair][0]} (“${PAIR_COL[pair][2]}”)</td></tr>`; }).join('')}</table><p class="small muted">Grounds: DB25 ${v.gnd.join(', ')}.</p>`;
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:230}); });
}
const LESSONS=[
  {title:'What a QTP is', body:`<p>A QTP carries eight balanced audio channels from a DB25 over two ordinary Cat5/6 cables: four channels per RJ45, one channel per twisted pair. It is entirely passive: just two connectors and copper. No manual is archived; this tutorial follows the board silk and the schematic.</p>`, check:()=>true, auto:true},
  {title:'1 · Choose the right board', body:`<p>Most consoles and interfaces use the <b>TASCAM</b> DB25 pinout: take the <b>QTP-DB25M</b> (male) or <b>QTP-DB25F</b> (female) to match the cable you would otherwise use. A Yamaha card needs the <b>QTP-25YMH</b>.</p><p><b>Goal:</b> pick the female board on the panel.</p>`, check:()=>D.variant==='F', hint:'Click the middle board in the bottom row (F).'},
  {title:'2 · Find channel 6', body:`<p>Click channel <b>6</b>. It is on the <b>CH5-8</b> jack, pair 2 (blue): RJ-4 (+) and RJ-5 (−), from DB25 pins 4 and 17.</p><p><b>Goal:</b> channel 6 traced.</p>`, check:()=>trace().ch===6, hint:'Channel buttons under the tracer.'},
  {title:'3 · Check a pin from the DB25 side', body:`<p>Click DB25 pin <b>13</b>. TASCAM leaves it unconnected; the QTP grounds it with the other ground pins.</p><p><b>Goal:</b> pin 13 selected.</p>`, check:()=>D.sel.kind==='db'&&D.sel.v===13, hint:'Pin 13 is at the end of the top row.'},
  {title:'4 · Run the cable', body:`<p>Set 100 m of Cat5 with a 50 Ω line output into 10 kΩ. The pair capacitance (about 5 nF) puts the corner far above audio. Try a 600 Ω source to see it move down.</p><p><b>Goal:</b> 100 m or more, 600 Ω source.</p>`, check:()=>D.len>=100&&D.srcZ===600, hint:'Cable slider and Source Z.'},
  {title:'5 · AES over Cat5', body:`<p>Switch the signal to <b>AES3</b>: 110 Ω equipment on 100 Ω cable reflects about 5 % of each edge (return loss ≈ 26 dB). Zoom the timeline to 2 µs to see the bit cells arrive later.</p><p><b>Goal:</b> AES selected.</p>`, check:()=>D.sig==='aes', hint:'Signal menu.'},
  {title:'Done', body:'<p>You can now wire any of the six boards on the panel. The Findings tab has the oddities in the design files.</p>', check:()=>true, auto:true},
];
let LI=0;
function viewTut(m){
  window.__qtpActive=false;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial: wiring with a QTP','<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>')}<div class="card" id="lesson"></div></div><div>${card('Panel and tracer','<div id="pn"></div><div id="cn"></div><div id="ctl">'+controls()+'</div><div id="cable" style="margin-top:6px"></div>')}</div></div>`;
  bindControls(m); let lastV=D.variant;
  const draw=()=>{ m.querySelector('#pn').innerHTML=panelSVG(); m.querySelector('#cn').innerHTML=connSVG(); bindAll(m); if (lastV!==D.variant && (lastV==='S'||D.variant==='S')){ m.querySelector('#ctl').innerHTML=controls(); bindControls(m); } lastV=D.variant; syncCh(m); m.querySelector('#cable').innerHTML=lineTable();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===LI?'font-weight:700;color:var(--accent)':''}">${l.title}${i<LI?' ✓':''}</li>`).join(''); m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{ LI=+li.dataset.i; draw(); });
    const L=LESSONS[LI], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div><div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${LI?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${LI<LESSONS.length-1?'':'disabled'}>Next ▶</button></div>`;
    m.querySelector('#pv').onclick=()=>{ LI=Math.max(0,LI-1); draw(); }; m.querySelector('#nx').onclick=()=>{ LI=Math.min(LESSONS.length-1,LI+1); draw(); }; };
  SIM.on('time',draw);
}
function viewSecond(m){
  window.__qtpActive=false;
  m.innerHTML=card('One second through a QTP','<div id="lad"></div><p class="small muted">The adapter has no clock and no state. Everything that happens in a second is the signal passing through, delayed by the cable.</p>')+card('Timeline','<canvas id="tl"></canvas>');
  SIM.on('time',()=>{ const l=line();
    const rows=[['Tone cycles at 1 kHz','1,000','1 ms'],['AES3 frames (48 kHz)','48,000','20.83 µs'],['AES3 biphase cells','6,144,000','163 ns'],[`Cable delay (${D.len} m)`,'',SIM.fmtDur(l.delay)],['AES cells in flight on the cable','',(l.delay*6.144e6).toFixed(1)]];
    m.querySelector('#lad').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period / value</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td></tr>`).join('')}</table>`;
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:230}); });
}
function viewBlock(m){
  window.__qtpActive=false;
  m.innerHTML=card('How a QTP pair is used (click a block)','<div id="bd"></div><div id="bi" class="small" style="margin-top:8px"></div>');
  const B=[['dev','Device with a DB25',20,'Console, interface or patch bay with TASCAM (or Yamaha) DB25 I/O.'],['q1','QTP (M/F/Y)',200,'DB25 to 2 × RJ45. Channels 1–4 on one jack, 5–8 on the other. Grounds to the RJ45 shield tabs.'],['cat','2 × Cat5/6',380,'One balanced channel per twisted pair. Shielded cable carries the ground on the shield; unshielded cable leaves the grounds unconnected end to end ('+'inferred'+').'],['q2','QTP at the far end',560,'A second QTP, or any jack wired the same way (e.g. a wall plate).'],['dev2','Device with a DB25',740,'Pin-for-pin the same channel order as the source.']];
  let sel='cat'; const draw=()=>{ let s='<svg viewBox="0 0 900 120" style="width:100%">'; B.forEach(([k,t,x],i)=>{ s+=`<g data-k="${k}" style="cursor:pointer"><rect x="${x}" y="30" width="150" height="60" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/><text x="${x+75}" y="65" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${t}</text></g>${i<4?`<line x1="${x+150}" y1="60" x2="${x+180}" y2="60" stroke="var(--ink2)" stroke-width="2"/>`:''}`; });
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-k]').forEach(g=>g.onclick=()=>{ sel=g.dataset.k; draw(); }); const b=B.find(x=>x[0]===sel); m.querySelector('#bi').innerHTML=`<b>${b[1]}</b>: ${b[3]}`; };
  draw();
}
function viewSchem(m){
  window.__qtpActive=false; let k=D.variant;
  m.innerHTML=card('Schematic (redrawn from the EAGLE Rev 4.4 netlist; not the EAGLE drawing)','<div id="t2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div>');
  const draw=()=>{ const v=VARIANTS[k];
    m.querySelector('#t2').innerHTML=Object.keys(VARIANTS).map(x=>`<button class="${x===k?'on':''}" data-k="${x}">${VARIANTS[x].name}</button>`).join(''); m.querySelectorAll('#t2 button').forEach(b=>b.onclick=()=>{ k=b.dataset.k; draw(); });
    let s=`<svg viewBox="0 0 860 420" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="80" y="30" width="110" height="${25*14+20}" fill="var(--panel2)" stroke="var(--ink)"/><text x="135" y="22" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${v.db.split(' ')[0]}</text>`;
    for (let p=1;p<=25;p++){ const y=48+(p-1)*14; s+=`<text x="185" y="${y+4}" font-size="10" text-anchor="end" fill="var(--ink)">${p}</text><line x1="190" y1="${y}" x2="230" y2="${y}" stroke="var(--ink)"/>`; if (v.gnd.includes(p)) s+=`<text x="236" y="${y+4}" font-size="10" fill="var(--ink2)">GND</text>`; }
    [0,1].forEach(j=>{ const y0=40+j*190; s+=`<rect x="620" y="${y0}" width="120" height="150" fill="var(--panel2)" stroke="var(--ink)"/><text x="680" y="${y0-6}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${v.rj[j]}</text>`;
      for (let pad=1;pad<=8;pad++){ const y=y0+14+(pad-1)*15; s+=`<line x1="590" y1="${y}" x2="620" y2="${y}" stroke="var(--ink)"/><text x="626" y="${y+4}" font-size="10" fill="var(--ink)">${pad}</text>`; }
      s+=`<text x="626" y="${y0+140}" font-size="10" fill="var(--ink2)">P$9–12 shield → GND</text>`;
      for (let pair=1;pair<=4;pair++){ const ch=j*4+pair, [h,c]=v.map[ch]; [[h,PAIR_PAD['+'+pair]],[c,PAIR_PAD['-'+pair]]].forEach(([p,pad],z)=>{ const y1=48+(p-1)*14, y2=y0+14+(pad-1)*15; s+=`<path d="M230,${y1} C420,${y1} 420,${y2} 590,${y2}" fill="none" stroke="${PAIR_COL[pair][1]}" stroke-width="1.6" ${z?'stroke-dasharray="5 3"':''}/>`; }); } });
    s+=`<text x="20" y="410" font-size="10" fill="var(--ink2)">${v.name} · REV 4.4 · solid = +, dashed = − · redrawn 2026|59</text></svg>`;
    m.querySelector('#sh').innerHTML=s; };
  draw();
}
function viewSoft(m){
  window.__qtpActive=false;
  m.innerHTML=card('Signal path, stage by stage (no logic: a passive adapter)','<div id="sp"></div>')+card('Revision history (from the EAGLE files)','<table class="kv"><tr><th>Rev</th><th>parts</th><th>change</th></tr><tr><td>REV 3</td><td>3 boards: M, F, Yamaha</td><td>pin map as today</td></tr><tr><td>REV 3.1</td><td>+ 3 more male boards (DB-MALE1–3)</td><td>6-up panel; RJ names M_1-1 / M_5-1 …</td></tr><tr><td>REV 4</td><td>+ SHEILD+ solder jumper</td><td>M_5-1 renamed M_5-8 (but M_5-2, M_5-3 kept)</td></tr><tr><td>REV 4.4</td><td>production, Gerbers ISS1</td><td>BOM CSV</td></tr><tr><td>REV 4.5</td><td>DB-MALE → DB-MALE-SHIELD</td><td>no Gerbers; silk still reads “REV 4.4”</td></tr></table>');
  SIM.on('time',()=>{ const t=trace(), l=line(), v=V();
    m.querySelector('#sp').innerHTML = t.ch? `<table class="kv"><tr><th>1 · Source</th><td>channel ${t.ch}, ${D.sig==='aes'?'AES3, 110 Ω':'balanced line, '+D.srcZ+' Ω'}</td></tr><tr><th>2 · DB25 ${v.sex}</th><td class="mono">pin ${t.hot} (+), pin ${t.cold} (−)</td></tr><tr><th>3 · PCB track</th><td>${v.name}, net from the schematic, no components</td></tr><tr><th>4 · RJ45 ${v.rjLbl[t.jack]}</th><td class="mono">RJ-${t.padHot} (+), RJ-${t.padCold} (−), pair ${t.pair} ${t.col[0]}</td></tr><tr><th>5 · Cable</th><td class="mono">${D.len} m: ${SIM.fmtDur(l.delay)}, ${(l.C*1e9).toFixed(2)} nF, ${l.R.toFixed(2)} Ω loop</td></tr><tr><th>6 · Far end</th><td>${D.sig==='aes'?'Γ '+l.gamma.toFixed(3)+', ≈'+l.aesAtt.toFixed(2)+' dB at 3 MHz':'−3 dB at '+(l.fc/1e3).toFixed(0)+' kHz'}</td></tr></table>` : '<p class="muted">Select a channel on the Simulator tab.</p>'; });
}
function viewNotes(m){
  window.__qtpActive=false;
  m.innerHTML=card('What the QTP files are up to: findings', `<ol>
   <li><b>The pinout is TASCAM, and it never changed.</b> REV 3, 3.1, 4, 4.4 and 4.5 all route ch1 24/12, ch2 10/23, ch3 21/9, ch4 7/20, ch5 18/6, ch6 4/17, ch7 15/3, ch8 1/14. The Yamaha board uses hot 1–8 / cold 14–21.</li>
   <li><b>Pin 13 is grounded.</b> TASCAM's pinout leaves pin 13 unconnected; every QTP TASCAM board ties it to ground with 2, 5, 8, 11, 16, 19, 22, 25.</li>
   <li><b>The shield jumper goes nowhere.</b> SHEILD+ (spelled so, SJW) has pad 2 on GND and pad 1 on net N$444, which has no other pin in the schematic and no copper or pour on the board (Rev 4.4 and 4.5). As drawn, bridging it does nothing. The DB25 shell lugs are not in the netlist.</li>
   <li><b>The shielded variant existed before Rev 4.5.</b> The README says DB25S was added in Rev 4.5, but the Rev 4.4 board already prints “QTP-DB25S” and the large “S” on the bottom-left board, and already has SHEILD+. Rev 4.5 only renames DB-MALE to DB-MALE-SHIELD.</li>
   <li><b>Rev 4.5 still says REV 4.4.</b> All six “REV 4.4” silk texts are unchanged in the Rev 4.5 board.</li>
   <li><b>Designators drift.</b> The second jack is M_5-6 / F_5-6 on two boards, M_5-8 on one and M_5-2 / M_5-3 on the others (the REV 4 rename of M_5-1 to M_5-8 was not carried through).</li>
   <li><b>Colour names on the silk.</b> The legends name the striped wires SUN, SKY, GRASS and DIRT (white-orange, white-blue, white-green, white-brown), with + always on the solid colour. The pair order is T568B: pair 1 on RJ-1/2, pair 2 on RJ-4/5, pair 3 on RJ-3/6, pair 4 on RJ-7/8.</li>
   <li><b>The Yamaha board's IN/OUT are just channel halves.</b> “IN” carries channels 1–4 and “OUT” channels 5–8 of the Yamaha DB25.</li>
   <li><b>The BOM is connectors only.</b> 6 DB25, 12 RJ45 and one solder jumper; no ordering codes (Farnell/Newark “unknown”).</li>
   <li><b>Ownership marks.</b> The silk carries “QuadTwistedPair.com”, “Ward-Beck.com” and “APK”.</li></ol>`)
  + card('Assumptions', `<ul class="small"><li>Cat5 capacitance 52 pF/m, 0.094 Ω/m, velocity factor 0.69, and 4.1 dB/100 m at 4 MHz: typical TIA-568 values, not in the archive (${inf}).</li><li>The face-view pin layout of the drawn DB25 follows the standard D-sub numbering; the EAGLE package orientation on the board is not used for it.</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>#QTP #SERIES/QTP - DB25M -  DB25F - DB25Y - DB25S - #Engineering/QTP-DB25 - #PCB Rev 4.4 - IN PRODUCTION #Eagle/QTP DB25 - Rev 4.4.sch, .brd, Rev 4.5.sch, .brd, BOM.csv, #ISS1 #Gerber/*</li><li>…/QTP-DB25 - #PCB #Archive #Eagle/REV 3, REV 3.1, REV 4 schematics</li></ul>`);
}
SIM.register({
  id:'qtp', name:'QTP · DB25 ↔ RJ45 quad-twisted-pair adapters (2015|48)', duration:1,
  product:'QTP adapters', year:2015, family:'Monitors, meters & tools', folder:'#QTP #SERIES/QTP - DB25M -  DB25F - DB25Y - DB25S - #Engineering',
  summary:'Passive adapter boards that carry eight balanced channels from a DB25 over two Cat5 cables, one channel per twisted pair. One production panel holds three male TASCAM boards, a shielded male, a female and a Yamaha-pinout board. Pins can be traced end to end, and the cable model shows what the run does to analog and AES signals.',
  highlights:['Production panel drawn from the Rev 4.4 Gerbers','Click-to-trace DB25 ↔ RJ45 pins for all four variants','TASCAM and Yamaha maps read from the EAGLE netlist','Cat5 cable model for analog and AES3','A shield jumper wired to nothing'],
  depth:'Hardware model',
  stepUnits:[{label:'1 AES bit cell (163 ns)',period:()=>1/(128*48000)},{label:'1 µs',period:()=>1e-6},{label:'1 ms',period:()=>0.001}],
  zooms:[[0.002,'2 ms (two tone cycles)'],[0.00002,'20 µs'],[0.000002,'2 µs (AES bit cells)'],[1,'1 s']],
  defaultZoom:0,
  tabs:[{id:'sim',label:'Simulator (pin tracer)',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Signal path & revisions',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
