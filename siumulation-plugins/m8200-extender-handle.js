/* =====================================================================
   M8200 — E8200D module extender, card handle and BNC terminations (Ward-Beck, 1998–2015|31–48)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (#MF8200 #SERIES/M8200 Extender, handle  - #Master #MF82/…):
   - M8200 - E8200D EXtender - #MECHANICAL/M8200 - E8200D EXtender .pdf  (2005|38, CorelDRAW 10: the pin map
       1–15 / 20–34 ↔ edge 1–15 / A–S, drawn to scale here)
   - M8200 - Handle #MECHANICAL/M8200-004 handle.dwg  (2013|46 text: 8200 CUSTOM PCB HANDLE, WITH TOGGLE SWITCH,
       1 PLACE .250 DIA., INSIDE BEND RADIUS .030", FINISH: CLEAR ZINC PLATE, TYPE #4 FINISH GRAINED)
   - M8200 - TERMINATIONS - BNC - #Engineering/BNC-XX.PCB, …BNC 1 2 3 4/BNC-1234.PCB, …BNC 5 6 7 8/BNC-5678.PCB,
       …BNC 5 - 6/BNC-56.PCB (Tango ASCII: BNC, CON20SS, PHEN3, H1X3/H1X4B positions in mils), BNC-5/6/78 (P-CAD 2002)
   - 8200 Series Rear Module options graphical Guides…/*.pdf (which card uses BNC1–BNC4)
   - Card pin functions: D8204C - #Engineering/D8204C - #PCB/D8204C-ISS1.net (exact) and the D8204B ISS3 schematic
       printed in D8204 - #Engineering/D8204 March 13 2012 Complete Manual.pdf (sheet 2 P1 table)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const card = (t,b,cls)=>`<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`;

/* ---------------- the 30 contacts ---------------- */
const LET = ['A','B','C','D','E','F','H','J','K','L','M','N','P','R','S'];       // no G, I, O, Q
// three numbering schemes for one contact: edge label, E8200D drawing number, schematic P1-n (D8204B / D8204C)
const CONTACTS = [];
for (let k=1;k<=15;k++){ CONTACTS.push({edge:String(k), ext:k, sch:2*k}); CONTACTS.push({edge:LET[k-1], ext:19+k, sch:2*k-1}); }
// D8204C-ISS1.net (exact) — schematic pin → net
const NET_C = {1:'AES IN − (T1-2)',2:'IN+ (C16)',7:'OUT1−',8:'OUT1+',9:'OUT2−',10:'OUT2+',11:'OUT3−',12:'OUT3+',13:'OUT4−',14:'OUT4+',15:'B1−',16:'B1+',17:'A1−',18:'A1+',19:'B2−',20:'B2+ / ALARM (H1)',21:'A2−',22:'A2+',23:'A2−',24:'A2+',25:'V− (F1)',26:'V− (F1)',27:'GNDD',28:'GNDD',29:'V+ (F2)',30:'V+ (F2)'};
// D8204B ISS3 sheet 2 (2012 manual) — edge label → net, as printed
const NET_B = {'A':'P1A AES in +','1':'P1_1 AES in −','B':'GNDD','2':'P1_2','C':'P1C','3':'P1_3','D':'P1D OUT4','E':'P1E OUT4','F':'P1F OUT3','H':'P1H OUT3','J':'P1J OUT1','8':'P1_8','K':'P1K OUT1','9':'P1_9','L':'P1L OUT2','10':'P1_10','M':'P1M OUT2 / NO_LOCK','11':'P1_11','N':'P1N','12':'P1_12','13':'V− (F3 → LM337)','14':'GND','R':'GND','S':'GND','15':'V+ (F2 → LM2596)'};
function kindOf(net){ if(!net) return 'nc'; if(/V\+/.test(net)) return 'vp'; if(/V−/.test(net)) return 'vn'; if(/GND/.test(net)) return 'gnd'; if(/ALARM|NO_LOCK/.test(net)) return 'tally'; if(/^[AB][12]/.test(net)) return 'analog'; if(/OUT|IN|P1[A-Z]/.test(net)) return 'aes'; return 'nc'; }

/* ---------------- BNC rear modules (Tango positions, mils) ---------------- */
const MODS = {
  BNC1:{src:'BNC-XX.PCB (INPUTB set)', cards:'D8204, D8205/6/7 (MF82/12)', bnc:[['IN',6850,4525],['1',7290,4065],['2',6850,3605],['3',7290,3145],['4',6850,2685],['5',7290,2225],['6',6850,1765]], ph:[]},
  BNC2:{src:'BNC-XX.PCB (INPUTBD set, PHEN3 R39A/R40A)', cards:'D8204A, D8203 (MF82/12)', bnc:[['IN',6850,8225],['1',7290,7765],['2',6850,7305],['3',7290,6845],['4',6850,6385]], ph:[['ANALOG L',6800,5825],['ANALOG R',6800,5375]]},
  BNC3:{src:'BNC-XX.PCB (INPUT / LOOP set)', cards:'D8204, D8205/6/7 — MF82/10 only', bnc:[['IN',4300,4525],['LOOP',4925,4525],['1',4300,3825],['2',4925,3825],['3',4300,3125],['4',4925,3125],['5',4300,2425],['6',4925,2425],['7',4300,1725],['8',4925,1725]], ph:[]},
  BNC4:{src:'BNC-XX.PCB (INPUTA / LOOPA set, PHEN3 R39–R42)', cards:'D8204A, D8203 — MF82/10 only', bnc:[['IN',4300,8225],['LOOP',4925,8225],['1',4300,7525],['2',4925,7525],['3',4300,6825],['4',4925,6825]], ph:[['L OUT1',4400,6150],['L OUT2',4400,5625],['R OUT1',4875,6150],['R OUT2',4875,5625]]},
};
const PANELS = [
  ['BNC-XX.PCB','1998|31','Tango, 5.6 × 7.4 in: one BNC1, BNC2, BNC3, BNC4 each (52 parts)'],
  ['BNC-1234.PCB','2000|33','Tango, 11.2 × 7.4 in: four BNC3 + BNC4 pairs (120 parts) — despite the name'],
  ['BNC-5678.PCB','1999|32','Tango, 14.9 × 16.4 in: BNC1/BNC2 set + four BNC3/BNC4 pairs (142 parts)'],
  ['BNC-56.PCB','1999|32','Tango, 8.9 × 7.2 in: eight BNC1 modules (64 parts)'],
  ['BNC-5.pcb / BNC-6.pcb','2015|48','P-CAD 2002, one footprint each (BNCDHOLE / CON20SS) + Gerber zips — split re-issue'],
  ['BNC-78.pcb','2006|39','P-CAD 2002 + Gerbers (TOP/BOT/SLK/masks/drill): PHEN3, H1X4B, BNC, CON20SS'],
];

/* ---------------- state ---------------- */
const D = { ext:true, card:'D8204C', probe:'15', mod:'BNC3', term:'75', loop:'open', inPlugged:true, len:100, log:[] };
function reset(){ Object.assign(D,{ext:true,card:'D8204C',probe:'15',mod:'BNC3',term:'75',loop:'open',inPlugged:true,len:100}); }
const K = { RAIL:22, R_EXT:0.15, I_CARD:{D8204C:0.06, D8204:0.047} };   // extender trace+contact resistance per path — inferred

function netAt(c){ return D.card==='D8204C' ? NET_C[c.sch] : NET_B[c.edge]; }
function probeValue(t){
  const c = CONTACTS.find(x=>x.edge===D.probe), net=netAt(c), k=kindOf(net), I=K.I_CARD[D.card]||0.05, drop = D.ext? I*K.R_EXT*2 : 0;
  if (k==='vp') return {k, v:K.RAIL-drop, txt:`+${(K.RAIL-drop).toFixed(3)} V DC (frame +22 V minus ${(drop*1000).toFixed(1)} mV ${D.ext?'across the extender':''})`};
  if (k==='vn') return {k, v:-(K.RAIL-drop), txt:`−${(K.RAIL-drop).toFixed(3)} V DC`};
  if (k==='gnd') return {k, v:0, txt:'0 V (GNDD)'};
  if (k==='aes') return {k, v:Math.sign(Math.sin(2*Math.PI*3.072e6*t)), txt:'AES3 biphase-mark, 6.144 Mbaud at 48 kHz'};
  if (k==='analog') return {k, v:Math.sin(2*Math.PI*1000*t), txt:'balanced analog audio (1 kHz test tone)'};
  if (k==='tally') return {k, v:0, txt:'open collector: high-Z when locked, pulled low on NO LOCK'};
  return {k, v:0, txt:'no net on this card'};
}
function moduleState(){
  const m=MODS[D.mod], hasLoop=m.bnc.some(b=>b[0]==='LOOP');
  let lvl=1, note='matched 75 Ω';
  if (!D.inPlugged) return {lvl:0, note:'no input'};
  if (hasLoop && D.loop==='75'){ if (D.term==='75'){ lvl=0.5; note='double-terminated (card 75 Ω + loop load): −6 dB'; } else note='HiZ card, line terminated downstream: correct loop-through'; }
  else if (D.term==='HIZ'){ lvl=2; note='unterminated line: reflections, the eye closes'; }
  return {lvl, note};
}

/* ---------------- actions ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,tr}); if(D.log.length>50) D.log.length=50; SIM.refresh(); }
const A = {
  probe(e){ act('Probe contact '+e, tr=>{ D.probe=e; const c=CONTACTS.find(x=>x.edge===e); tr(`Edge contact ${e} = E8200D drawing pin ${c.ext} = schematic P1-${c.sch}`); tr(`${D.card}: ${netAt(c)||'not connected'}`); tr(probeValue(SIM.t).txt); }); },
  ext(){ act(D.ext?'Card back into the frame':'Card out on the E8200D extender', tr=>{ D.ext=!D.ext; tr(D.ext?'Extender’s gold fingers in the backplane socket; card plugs into the extender socket, now outside the frame with every contact reachable':'Card straight in the backplane EDAC 30-way socket'); }); },
  card(v){ act('Card on the extender: '+v, tr=>{ D.card=v; tr(v==='D8204C'?'Pin functions from D8204C-ISS1.net (exact)':'Pin functions from the D8204B ISS3 sheet 2 printed in the 2012 D8204 manual'); }); },
  mod(v){ act('Rear module: '+v, tr=>{ D.mod=v; tr(`${v}: ${MODS[v].cards}. Layout from ${MODS[v].src}`); }); },
  term(v){ act('Card input termination '+v, tr=>{ D.term=v; tr(moduleState().note); }); },
  loop(){ act('Loop BNC '+(D.loop==='75'?'opened':'cabled to a terminated device'), tr=>{ D.loop=D.loop==='75'?'open':'75'; tr(moduleState().note); }); },
  plug(){ act((D.inPlugged?'Unplug':'Plug')+' input BNC', tr=>{ D.inPlugged=!D.inPlugged; tr('BNC centre → CON20SS → backplane → card input contact'); }); },
  reset(){ act('Start over', tr=>{ reset(); tr('Card D8204C on the extender, probe on contact 15 (V+)'); }); },
};

/* ---------------- drawings ---------------- */
// E8200D drawing, redrawn to the PDF geometry: circles (pins 1–15, 20–34) on the left, edge pads (1–15 / A–S) on the right.
function extenderSVG(){
  const rows = []; for (let k=1;k<=15;k++){ rows.push([k, String(k)]); rows.push([19+k, LET[k-1]]); }
  let s=`<svg viewBox="0 0 560 ${rows.length*17+60}" style="width:100%;max-width:560px"><text x="200" y="22" font-size="16" fill="var(--ink)">E8200D MODULE EXTENDER</text>`;
  rows.forEach(([n,e],i)=>{ const y=44+i*17, c=CONTACTS.find(x=>x.edge===e), net=netAt(c), k=kindOf(net), sel=e===D.probe;
    const col = {vp:'#e0533d',vn:'#3d6be0',gnd:'#777',aes:'var(--accent)',analog:'var(--accent2)',tally:'var(--warn)',nc:'var(--line)'}[k];
    s+=`<g class="xpin" data-e="${e}" style="cursor:pointer"><title>Pin ${n} ↔ edge ${e} (P1-${c.sch}) — ${net||'n.c.'}</title><text x="40" y="${y+4}" font-size="11" text-anchor="end" fill="var(--ink)">${n}</text><circle cx="58" cy="${y}" r="6" fill="${sel?'var(--play)':'var(--panel)'}" stroke="var(--ink)"/><line x1="64" y1="${y}" x2="380" y2="${y}" stroke="${col}" stroke-width="${sel?3:1.4}"/><rect x="380" y="${y-6}" width="34" height="12" fill="#d4af37" stroke="var(--ink)" stroke-width=".6"/><text x="420" y="${y+4}" font-size="11" fill="var(--ink)">${e}</text><text x="440" y="${y+4}" font-size="10" fill="${col==='var(--line)'?'var(--ink2)':col}">${(net||'—').slice(0,22)}</text></g>`; });
  return s+`<text x="10" y="${rows.length*17+56}" font-size="10.5" fill="var(--ink2)">Redrawn from M8200 - E8200D EXtender .pdf (2005|38). Net colours: red V+, blue V−, grey GND, green AES, blue audio, orange tally. Click a pin to probe it.</text></svg>`;
}
function handleSVG(){
  // M8200-004: “8200 CUSTOM PCB HANDLE”, 1 place .250 dia hole, inside bend .030″, clear zinc; outline proportions inferred
  return `<svg viewBox="0 0 300 200" style="width:100%;max-width:300px"><path d="M40 30 h60 v140 h-60 z" fill="#c9cbc4" stroke="#777"/><path d="M100 30 h70 q10 0 10 10 v120 q0 10 -10 10 h-70" fill="none" stroke="#777" stroke-width="6"/><circle cx="70" cy="60" r="10" fill="var(--panel)" stroke="#555"/><text x="70" y="64" font-size="8" text-anchor="middle" fill="#333">.250</text><text x="70" y="120" font-size="11" text-anchor="middle" fill="#333" transform="rotate(90 70 120)">D8204C</text><text x="190" y="40" font-size="10.5" fill="var(--ink)">8200 custom PCB handle</text><text x="190" y="56" font-size="10" fill="var(--ink2)">clear zinc plate</text><text x="190" y="72" font-size="10" fill="var(--ink2)">#4 grained finish</text><text x="190" y="88" font-size="10" fill="var(--ink2)">bend radius .030″</text><text x="190" y="104" font-size="10" fill="var(--ink2)">.250″ hole: toggle</text><text x="190" y="120" font-size="10" fill="var(--ink2)">switch version</text><text x="10" y="190" font-size="9.5" fill="var(--ink2)">Outline ${'inferred'}; notes from M8200-004 handle.dwg</text></svg>`;
}
/* ---------------- rear-module artwork (CorelDRAW, 2026|59 pass) ----------------
   BNC1/BNC3 from “D8204 - rear module options.cdr”, BNC2/BNC4 from “D8204A - rear module options.cdr” (both 2012-01-16),
   converted with Inkscape into assets/m8200-extender-handle-bnc1…4.svg. BNC centres are the connector rings in those files. */
const RO_D8204 = '#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/D8204 - rear module options.cdr', RO_D8204A = '#MF8200 #SERIES/8200 Series Rear Module options graphical Guides - #Engineering #Artwork #manual #MF82 #TERMINATION/D8204A - rear module options.cdr';
const MOD_ART = {
  BNC1:{vb:[328,192,112,208], src:RO_D8204, at:{IN:[373.4,229.2],'1':[396.4,253.3],'2':[373.4,277.6],'3':[396.4,301.7],'4':[373.3,326.1],'5':[396.7,351.0],'6':[373.3,375.5]}},
  BNC2:{vb:[294.5,192,186,222], src:RO_D8204A, at:{IN:[359.7,228.7],'1':[382.5,252.6],'2':[359.7,276.8],'3':[382.5,300.9],'4':[359.6,325.1]}},
  BNC3:{vb:[512,196,124,204], src:RO_D8204, at:{IN:[556.9,227.5],LOOP:[589.7,227.5],'1':[556.9,264.2],'2':[589.7,264.2],'3':[556.9,300.9],'4':[589.7,300.9],'5':[556.9,338.3],'6':[589.7,338.3],'7':[556.9,375.7],'8':[589.7,375.7]}},
  BNC4:{vb:[481,200,190,214], src:RO_D8204A, at:{IN:[547.4,227.2],LOOP:[580.4,227.2],'1':[547.3,264.1],'2':[580.3,264.1],'3':[547.4,301.0],'4':[580.4,301.0]}},
};
function moduleArtSVG(){ const m=MODS[D.mod], a=MOD_ART[D.mod], [x,y,w,h]=a.vb, ms=moduleState();
  let s=`<svg viewBox="${x} ${y} ${w} ${h}" style="width:100%;max-width:340px;display:block;margin:auto;border-radius:4px" role="img" aria-label="${D.mod} from the CorelDRAW rear-module sheet"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/><image href="siumulation-plugins/assets/m8200-extender-handle-${D.mod.toLowerCase()}.svg" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
  m.bnc.forEach(([n])=>{ const p=a.at[n]; if (!p) return; const isIn=n==='IN', isLoop=n==='LOOP', live=isIn?D.inPlugged:isLoop?D.loop==='75':ms.lvl>0;
    s+=`<g class="${isIn?'xin':isLoop?'xloop':''}" style="cursor:${isIn||isLoop?'pointer':'default'}"><title>${isIn?'INPUT — click to plug/unplug':isLoop?'INPUT LOOP — click to cable/uncable':'OUT '+n}</title><circle cx="${p[0]}" cy="${p[1]}" r="14" fill="rgba(0,0,0,0)"/>${live?`<circle cx="${p[0]}" cy="${p[1]}" r="13.6" fill="none" stroke="${isIn||isLoop?'#2f7de1':'#18b84a'}" stroke-width="2.2"/>`:''}</g>`; });
  return s+`</svg><div class="small muted" style="text-align:center">CorelDRAW artwork: ${D.mod} on ${SIM.src(a.src,a.src.split('/').pop())} (2012-01-16). ${ms.note} <label><input type="checkbox" class="xdrawn"> drawn from the Tango PCB</label></div>`; }
function moduleSVG(){
  if (!D.modDrawn) return moduleArtSVG();
  const m=MODS[D.mod], pts=m.bnc.concat(m.ph), xs=pts.map(p=>p[1]), ys=pts.map(p=>p[2]); const x0=Math.min(...xs)-450, x1=Math.max(...xs)+450, y0=Math.min(...ys)-450, y1=Math.max(...ys)+450, S=0.07;
  const X=v=>20+(v-x0)*S, Y=v=>20+(y1-v)*S, ms=moduleState();
  let s=`<svg viewBox="0 0 ${(x1-x0)*S+200} ${(y1-y0)*S+40}" style="width:100%;max-width:340px"><rect x="20" y="20" width="${(x1-x0)*S}" height="${(y1-y0)*S}" rx="4" fill="#26292c"/>`;
  m.bnc.forEach(([n,x,y])=>{ const isIn=n==='IN', isLoop=n==='LOOP', live=isIn?D.inPlugged:isLoop?D.loop==='75':ms.lvl>0;
    s+=`<g class="${isIn?'xin':isLoop?'xloop':''}" style="cursor:${isIn||isLoop?'pointer':'default'}"><title>${n}</title><circle cx="${X(x)}" cy="${Y(y)}" r="15" fill="#b9bcbf" stroke="#666"/><circle cx="${X(x)}" cy="${Y(y)}" r="9" fill="#1a1a1a"/><circle cx="${X(x)}" cy="${Y(y)}" r="3" fill="${live?'var(--led-g)':'#555'}"/><text x="${X(x)}" y="${Y(y)+27}" font-size="8.5" text-anchor="middle" fill="#ddd">${n}</text></g>`; });
  m.ph.forEach(([n,x,y])=>{ s+=`<g><title>Phoenix 3-way (PHEN3): ${n}</title><rect x="${X(x)-14}" y="${Y(y)-7}" width="28" height="14" fill="#2b8a3e"/><text x="${X(x)}" y="${Y(y)+20}" font-size="8" text-anchor="middle" fill="#ddd">${n}</text></g>`; });
  return s+`<text x="${(x1-x0)*S+30}" y="40" font-size="13" font-weight="700" fill="var(--ink)">${D.mod}</text><text x="${(x1-x0)*S+30}" y="58" font-size="10" fill="var(--ink2)">${m.cards}</text><text x="${(x1-x0)*S+30}" y="76" font-size="10" fill="var(--ink2)">${m.src}</text><text x="${(x1-x0)*S+30}" y="100" font-size="10.5" fill="var(--ink)">${ms.note}</text></svg><div class="small muted"><label><input type="checkbox" class="xdrawn" checked> drawn from the Tango PCB</label></div>`;
}
function bindPanel(m){ m.querySelectorAll('.xpin').forEach(g=>g.onclick=()=>A.probe(g.dataset.e)); m.querySelectorAll('.xin').forEach(g=>g.onclick=()=>A.plug()); m.querySelectorAll('.xloop').forEach(g=>g.onclick=()=>A.loop()); m.querySelectorAll('.xdrawn').forEach(c=>c.onchange=()=>{ D.modDrawn=c.checked; SIM.refresh(); }); }
function controlsHTML(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:8px;align-items:center">
  <label>Card <select id="xc"><option ${D.card==='D8204C'?'selected':''}>D8204C</option><option value="D8204" ${D.card==='D8204'?'selected':''}>D8204 (2012 / D8204B board)</option></select></label>
  <label>Rear module <select id="xm">${Object.keys(MODS).map(k=>`<option ${k===D.mod?'selected':''}>${k}</option>`).join('')}</select></label>
  <label>Card input <select id="xt">${['75','HIZ'].map(v=>`<option ${v===D.term?'selected':''}>${v}</option>`).join('')}</select></label>
  <button id="xe">${D.ext?'Put card back in the frame':'Put card on the extender'}</button><button id="xr">Start over</button></div>`; }
function bindControls(m){ const q=s=>m.querySelector(s); if(!q('#xc')) return; q('#xc').onchange=e=>A.card(e.target.value); q('#xm').onchange=e=>A.mod(e.target.value); q('#xt').onchange=e=>A.term(e.target.value); q('#xe').onclick=()=>A.ext(); q('#xr').onclick=()=>A.reset(); }

/* ---------------- lanes ---------------- */
function lanes(){ const css=SIM.css; return [
  {label:'Probe: contact '+D.probe, h:60, draw(c,X,t0,t1,y,h){ const pv=probeValue((t0+t1)/2); c.strokeStyle=css('--play'); c.beginPath();
    if (pv.k==='vp'||pv.k==='vn'||pv.k==='gnd'||pv.k==='nc'||pv.k==='tally'){ const yy=y+h/2-pv.v/25*h*0.45; c.moveTo(X(t0),yy); c.lineTo(X(t1),yy); c.stroke(); c.fillStyle=css('--ink'); c.font='11px monospace'; c.fillText(pv.txt,X(t0)+6,y+12); return; }
    const f = pv.k==='aes'? 3.072e6 : 1000; if ((t1-t0)*f > 300){ c.fillStyle=css('--accent'); c.globalAlpha=.3; c.fillRect(X(t0),y+8,X(t1)-X(t0),h-16); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px monospace'; c.fillText(pv.txt+' — zoom in',X(t0)+6,y+h/2+4); return; }
    for (let i=0;i<=800;i++){ const t=t0+(t1-t0)*i/800; let v=pv.k==='aes'? Math.sign(Math.sin(2*Math.PI*f*t+((Math.floor(t*f*2)*2654435761)%7>3?Math.PI:0))) : Math.sin(2*Math.PI*f*t); const yy=y+h/2-v*h*0.4; i?c.lineTo(X(t),yy):c.moveTo(X(t),yy); } c.stroke(); }},
  {label:'Module input level', h:24, draw(c,X,t0,t1,y,h){ const ms=moduleState(); c.fillStyle=ms.lvl===1?css('--accent'):ms.lvl===0?css('--ink2'):css('--warn'); c.globalAlpha=.5; c.fillRect(X(t0),y+4,X(t1)-X(t0),h-8); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px sans-serif'; c.fillText('×'+ms.lvl+' — '+ms.note,X(t0)+6,y+h/2+4); }},
];}

/* ---------------- views ---------------- */
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].tr.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click any pin of the extender to probe it; click IN / LOOP on the rear module.</div>'; }
function viewSim(m){
  m.innerHTML=`<div class="grid2"><div>${card('E8200D module extender — click a pin to probe it', `<div id="ex"></div>${controlsHTML()}`)}</div><div>${card('Probe reading', `<div id="pr"></div>`)}${card('What happened', `<div id="tr" class="log"></div>`)}${card('Rear module (BNC terminations folder)', `<div id="md"></div>`)}${card('Card handle M8200-004', `<div id="hd"></div>`)}</div></div>
   ${card('Timeline — the probed contact in slow motion', `<canvas id="tl"></canvas><p class="small muted">Zoom to 1 µs to see AES bit cells, or 5 ms for analog audio. DC rails show the drop across the extender: ${K.R_EXT} Ω per path ${inf}.</p>`)}`;
  bindControls(m);
  SIM.on('time',()=>{ const t=SIM.t, pv=probeValue(t), c=CONTACTS.find(x=>x.edge===D.probe);
    m.querySelector('#ex').innerHTML=extenderSVG(); m.querySelector('#md').innerHTML=moduleSVG(); m.querySelector('#hd').innerHTML=handleSVG(); bindPanel(m);
    m.querySelector('#pr').innerHTML=`<table class="kv"><tr><th>Contact</th><td class="mono">edge ${c.edge} · extender pin ${c.ext} · schematic P1-${c.sch}</td></tr><tr><th>${D.card}</th><td class="mono">${netAt(c)||'n.c.'}</td></tr><tr><th>Reading</th><td class="mono">${pv.txt}</td></tr><tr><th>Card position</th><td>${D.ext?'on the extender, outside the frame':'in the frame (no probe access)'}</td></tr></table>`;
    m.querySelector('#tr').innerHTML=traceHTML(); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:170}); });
}
let lesson=0;
const LESSONS=[
  {title:'What these parts are', body:`<p>Three accessories shared by the whole 8200 series: the <b>E8200D extender</b> (lets a technician run a card outside the frame), the <b>M8200-004 handle</b> fitted to every card, and the <b>BNC termination</b> boards (rear modules BNC1–BNC4).</p>`, check:()=>true, auto:true},
  {title:'1 · Put a card on the extender', body:`<p>Pull the card, plug the E8200D into the empty slot, and plug the card into the extender. Pins 1 and A stay at the top.</p><p><b>Goal:</b> card on the extender.</p>`, check:()=>D.ext, hint:'Button “Put card on the extender”.'},
  {title:'2 · Check the supply', body:`<p>Probe the <b>V+</b> contact. On the D8204C netlist that is schematic P1-29/30 — edge contacts <b>S</b> and <b>15</b>, extender pins <b>34</b> and <b>15</b>.</p><p><b>Goal:</b> probe edge contact S.</p>`, check:()=>D.probe==='S', hint:'Click the row “34 … S”.'},
  {title:'3 · Follow an output', body:`<p>Probe <b>OUT1+</b> (schematic P1-8 = edge 4) and zoom to 1 µs to see the AES bit cells.</p><p><b>Goal:</b> probe edge contact 4 with the D8204C.</p>`, check:()=>D.probe==='4'&&D.card==='D8204C', hint:'Click the row “4 … 4”.'},
  {title:'4 · Terminate the loop correctly', body:`<p>On BNC3/BNC4 the input has a LOOP BNC. If you loop on to another device, set this card's input to HiZ and terminate at the end of the line.</p><p><b>Goal:</b> BNC3, loop cabled, card HIZ.</p>`, check:()=>D.mod==='BNC3'&&D.loop==='75'&&D.term==='HIZ', hint:'Rear module BNC3, click LOOP, Card input → HIZ.'},
  {title:'Done', body:`<p>See <b>Findings</b> for the three pin-numbering schemes and the mis-named BNC panels.</p>`, check:()=>true, auto:true},
];
function viewTut(m){
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — servicing a card with the E8200D', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lz"></div>${card('Rear module', `<div id="md"></div>`)}</div><div>${card('Extender', `<div id="ex"></div>${controlsHTML()}`)}${card('What happened', `<div id="tr" class="log"></div>`)}</div></div>`;
  bindControls(m);
  const draw=()=>{ m.querySelector('#ex').innerHTML=extenderSVG(); m.querySelector('#md').innerHTML=moduleSVG(); bindPanel(m); m.querySelector('#tr').innerHTML=traceHTML();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lesson?'font-weight:700;color:var(--accent)':''}">${l.title}${i<lesson?' ✓':''}</li>`).join(''); m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{lesson=+li.dataset.i;draw();});
    const L=LESSONS[lesson], ok=L.check(); m.querySelector('#lz').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div><div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${lesson?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${lesson<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="r0">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{lesson=Math.max(0,lesson-1);draw();}; m.querySelector('#nx').onclick=()=>{lesson=Math.min(LESSONS.length-1,lesson+1);draw();}; m.querySelector('#r0').onclick=()=>{A.reset();lesson=0;draw();}; };
  SIM.on('time',draw);
}
function viewSecond(m){
  m.innerHTML=`<div class="grid3">${card('Through the extender in one second', `<table class="kv"><tr><th>AES bit cells per output</th><td class="mono">6 144 000 (48 kHz)</td></tr><tr><th>Contacts carrying AES</th><td class="mono">${CONTACTS.filter(c=>kindOf(netAt(c))==='aes').length}</td></tr><tr><th>Analog contacts</th><td class="mono">${CONTACTS.filter(c=>kindOf(netAt(c))==='analog').length}</td></tr></table>`)}${card('Extra path length', `<table class="kv"><tr><th>Trace + contact R</th><td class="mono">${K.R_EXT} Ω ${inf}</td></tr><tr><th>Rail drop</th><td class="mono">${((K.I_CARD[D.card]||0.05)*K.R_EXT*2e3).toFixed(1)} mV</td></tr><tr><th>AES delay</th><td class="mono">≈ 1.5 ns for ~25 cm ${inf}</td></tr></table>`)}${card('Numbering', `<table class="kv"><tr><th>Edge</th><td class="mono">1–15, A–S (no G I O Q)</td></tr><tr><th>E8200D</th><td class="mono">1–15, 20–34</td></tr><tr><th>Schematics</th><td class="mono">P1-1…30 (A=1, 1=2, B=3 …)</td></tr></table>`)}</div>${card('Probe', `<canvas id="tl"></canvas>`)}`;
  SIM.on('time',()=>SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:170}));
}
const BLOCKS={ bp:{x:10,y:60,w:140,h:60,t:'Backplane socket',s:['EDAC 307-030, 30-way'],d:'One per slot on MF8212BP.'}, ext:{x:190,y:60,w:160,h:60,t:'E8200D extender',s:['fingers ↔ socket','30 straight traces'],d:'Pin n ↔ the same contact; only the numbering differs.'}, cd:{x:390,y:60,w:140,h:60,t:'Card under test',s:['P1 EDGE30/156'],d:'Runs normally outside the frame.'}, rm:{x:10,y:170,w:140,h:60,t:'Rear module',s:['BNC1–4 · CON20SS'],d:'Plugs into the SSW-120 20-way socket behind the slot.'} };
const WIRES=[['bp','ext',''],['ext','cd',''],['rm','bp','20-way']];
function viewBlock(m){ let sel='ext'; const draw=()=>{ const ctr=b=>[b.x+b.w/2,b.y+b.h/2]; let s=`<svg viewBox="0 0 560 250" style="width:100%"><defs><marker id="xa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
  WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_); const clip=(bx,x,y,tx,ty)=>{const dx=tx-x,dy=ty-y,k=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9,dy?(bx.h/2)/Math.abs(dy):1e9);return[x+dx*k,y+dy*k];}; [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" marker-end="url(#xa)"/>${l?`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`:''}`; });
  for(const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.4:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+35+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
  m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{sel=g.dataset.b;draw();}); m.querySelector('#bi').innerHTML=`<h3>${BLOCKS[sel].t}</h3><p>${BLOCKS[sel].d}</p>`; };
  m.innerHTML=`<div class="grid2">${card('Where the parts sit — click a block', `<div id="bd"></div>`)}${card('Block', `<div id="bi"></div>`)}</div>`; draw(); }
function viewSchem(m){ let i=0; const SH=[
  {name:'1 · E8200D pin map', note:'Redrawn 1:1 from the PDF; colours follow the selected card.', svg:()=>`<g transform="translate(150,0) scale(1)">${extenderSVG().replace(/^<svg[^>]*>/,'').replace(/<\/svg>.*$/s,'')}</g>`},
  {name:'2 · BNC module panels', note:'Every board in the BNC terminations folder, with the module types found by matching component positions to the rear-module guide drawings.', svg:()=>PANELS.map((p,k)=>`<text x="40" y="${50+k*50}" font-size="13" font-weight="700" font-family="var(--mono)" fill="var(--accent2)">${p[0]}</text><text x="250" y="${50+k*50}" font-size="12" fill="var(--ink2)">${p[1]}</text><text x="40" y="${68+k*50}" font-size="12" fill="var(--ink)">${p[2]}</text>`).join('')},
  {name:'3 · BNC3 routing', note:'BNC3 positions from BNC-XX.PCB; CON20SS J12A at (5900, 4075). Which CON20 pin feeds which BNC is not recoverable from the Tango file here — the order shown is inferred.', svg:()=>{ const m=MODS.BNC3; let s=''; m.bnc.forEach(([n,x,y],k)=>{ const yy=40+k*32; s+=`<circle cx="120" cy="${yy}" r="11" fill="none" stroke="var(--ink)"/><text x="90" y="${yy+4}" text-anchor="end" font-size="11" fill="var(--ink)">${n}</text><line x1="131" y1="${yy}" x2="520" y2="${yy}" stroke="var(--ink)"/><text x="530" y="${yy+4}" font-size="11" fill="var(--accent2)">CON20 pin ${k+1} ${k===1?'(loop: same net as IN)':''}</text>`; }); return s+`<text x="120" y="380" font-size="11" fill="var(--ink2)">IN and LOOP are paralleled on the module; the card's own jumper sets 75 Ω / 110 Ω / HiZ.</text>`; }},
]; m.innerHTML=card('Drawings (redrawn — not the original CAD)', `<div id="st" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p>`);
  const draw=()=>{ m.querySelector('#st').innerHTML=SH.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join(''); m.querySelectorAll('#st button').forEach(b=>b.onclick=()=>{i=+b.dataset.i;draw();}); m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 600" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><text x="840" y="590" text-anchor="end" font-size="10" fill="var(--ink2)">M8200 · sheet ${i+1}/${SH.length} · redrawn 2026|59</text>${SH[i].svg()}</svg>`; m.querySelector('#sn').textContent=SH[i].note; bindPanel(m); }; draw(); }
function viewSoft(m){
  m.innerHTML=`<div class="grid2">${card('Contact table for the card on the extender (signal path, no software)', `<div class="scroll" style="max-height:520px"><table class="kv small"><tr><th>Edge</th><th>E8200D</th><th>P1-n</th><th>${D.card}</th></tr>${CONTACTS.map(c=>`<tr class="${c.edge===D.probe?'hl':''}"><td class="mono">${c.edge}</td><td class="mono">${c.ext}</td><td class="mono">${c.sch}</td><td>${netAt(c)||'—'}</td></tr>`).join('')}</table></div>`)}${card('Rear modules in this folder', `<table class="kv small"><tr><th>Module</th><th>Cards</th><th>Layout source</th></tr>${Object.keys(MODS).map(k=>`<tr><td class="mono">${k}</td><td>${MODS[k].cards}</td><td class="mono">${MODS[k].src}</td></tr>`).join('')}</table>`)}</div>`;
}
function viewNotes(m){
  m.innerHTML=card('What these accessories are up to — findings', `<ol>
   <li><b>Three numbering schemes for the same 30 contacts.</b> Edge fingers are 1–15 and A–S (no G, I, O, Q); the E8200D drawing numbers its side 1–15 and 20–34 (16–19 skipped); P-CAD schematics use P1-1…30 interleaved (A = 1, 1 = 2, B = 3 …). V+ on a D8204C is “P1-29/30” = edges S and 15 = extender pins 34 and 15.</li>
   <li><b>Artwork ${SIM.year(2026)}: the four BNC modules now come from the CorelDRAW rear-module sheets.</b> BNC1/BNC3 are from ${SIM.src(RO_D8204,'D8204 - rear module options.cdr')} and BNC2/BNC4 from ${SIM.src(RO_D8204A,'D8204A - rear module options.cdr')} (both 2012-01-16), and every BNC hotspot sits on its connector in those drawings. The Tango-coordinate drawing is on the checkbox. The extender and the handle have no CorelDRAW art: only the mechanical PDFs/DWGs, which stay as redrawn.</li>
   <li><b>The sheet’s BNC2 has twice the analog terminals of the board file.</b> The D8204A sheet draws BNC2 with four 3-way pluggable blocks: ANALOG L. OUT1, L. OUT2, R. OUT1 and R. OUT2. The BNC2 set in BNC-XX.PCB has only two PHEN3 positions (R39A/R40A). BNC4 has four on both.</li>
   <li><b>An analog output that doubles as an alarm.</b> On both BNC2 and BNC4, ANALOG R. OUT2 + is also “CONFIDENCE” and OUT2 − is “NO-LOCK”, with the note “*THIS OUTPUT CAN BE USED AS AN ALARM BY SETTING THE JUMPERS”. The sheet captions the card “1x4 AES/EBU Distribution Amplifier & Digital to Analog Converter”.</li>
   <li><b>Panel names don't match the modules.</b> <span class="mono">BNC-1234.PCB</span> holds four BNC3 + BNC4 pairs (no BNC1 or BNC2), <span class="mono">BNC-56.PCB</span> is eight BNC1 modules, <span class="mono">BNC-XX.PCB</span> is one of each type. The folder names describe panel numbers, not module types.</li>
   <li><b>The 2015|48 re-issue is split.</b> <span class="mono">BNC-5.pcb</span> holds only the BNC footprint and <span class="mono">BNC-6.pcb</span> only CON20SS — two halves of one board, with separate Gerber zips (“BNC 5 - 6”). The BNC-78 folder is named “BNC 7 - 7”.</li>
   <li><b>The handle drawing describes a toggle-switch version.</b> M8200-004 notes “WITH TOGGLE SWITCH” and a .250″ hole, kept in an “ERWIN/ODD DRAWINGS” folder; the frame master has a separate 8205-004 handle.</li>
   <li><b>LOOP is just a parallel BNC.</b> Termination lives on the card (75 / 110 Ω / HiZ jumper), so a looped BNC3/BNC4 input relies on the installer setting HiZ — the D8204 manual says so.</li>
  </ol>`)+card('Assumptions', `<ul class="small"><li>Extender resistance ${K.R_EXT} Ω and propagation delay ${inf}.</li><li>Handle outline ${inf}; only its notes are recovered from the DWG.</li><li>D8204B pin names follow the scanned 2012 sheet; a few are illegible and shown as printed labels.</li><li>CON20 pin ↔ BNC order ${inf}.</li></ul>`)
  +card('Sources', `<ul class="small mono"><li>M8200 - E8200D EXtender - #MECHANICAL/M8200 - E8200D EXtender .pdf</li><li>M8200 - Handle #MECHANICAL/M8200-004 handle.dwg</li><li>M8200 - TERMINATIONS - BNC - #Engineering/*.PCB, *.pcb, Gerbers</li><li>D8204C-ISS1.net · D8204 March 13 2012 Complete Manual.pdf · rear module options PDFs</li></ul>`);
}
SIM.register({
  id:'m8200-extender-handle', name:'M8200 · E8200D extender, handle, BNC terminations (2005|38)', duration:1,
  product:'M8200 Extender, handle', year:2005, family:'8200 Distribution Series',
  folder:'#MF8200 #SERIES/M8200 Extender, handle  - #Master #MF82',
  summary:'Service and connection parts shared by every 8200-series card: the E8200D extender that runs a card outside the frame, the M8200-004 card handle, and the BNC1–BNC4 rear termination boards. Probe any edge contact of a card on the extender and wire the BNC loop correctly.',
  highlights:['E8200D pin map redrawn to scale','Probe any of the 30 contacts','BNC1–BNC4 from Tango coordinates','Three pin-numbering schemes','Mis-named BNC panels'],
  footnotes:[
    {text:'The D8204A sheet draws BNC2 with four 3-way analog blocks; the BNC-XX.PCB BNC2 set has only two PHEN3 positions.', src:RO_D8204A},
    {text:'ANALOG R. OUT2 +/− doubles as the CONFIDENCE / NO-LOCK alarm pair “by setting the jumpers” on both BNC2 and BNC4.', src:RO_D8204A},
    {text:'The D8204A sheet calls the card a “1x4 AES/EBU Distribution Amplifier & Digital to Analog Converter”.', src:RO_D8204A},
    {text:'BNC3 and BNC4 are both marked “*MF8210 Only”; only they have an INPUT LOOP BNC.', src:RO_D8204},
    {text:'No CorelDRAW art exists for the E8200D extender or the M8200-004 handle; they are drawn from the mechanical PDFs.', src:'#MF8200 #SERIES/M8200 Extender, handle  - #Master #MF82/M8200 - Handle #MECHANICAL/M8200-004 handle.pdf'},
  ],
  depth:'Hardware model',
  stepUnits:[{label:'1 µs',period:()=>1e-6},{label:'1 ms',period:()=>0.001},{label:'10 ms',period:()=>0.01}],
  zooms:[[1,'1 s'],[0.005,'5 ms (audio)'],[0.000002,'2 µs (AES cells)']],
  defaultZoom:1,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Drawings',render:viewSchem},{id:'software',label:'Pin & signal path',render:viewSoft},{id:'findings',label:'Findings',render:viewNotes}],
});
})();
