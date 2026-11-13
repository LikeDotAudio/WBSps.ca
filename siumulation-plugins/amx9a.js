/* =====================================================================
   AMX9A — 1RU nine-input analog mixing monitor ("AMX SERIES", Ward-Beck Systems, 2009|42)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Hardware only: there is no code in the product, so the "software" view is the signal path,
   stage by stage, with the real reference designators, nets and values.
   Sources (all under #AMX #SERIES/XXX - AMX9A - #Master #OBSOLETE/):
   - AMX9A - #SalesInfo/AMX9A Manual ISSUE2 - June 21 2010.pdf (and #Archive/AMX9A Manual - June 21 2010.pdf,
     #Archive/AMX9A Manual.pdf (2009), #Archive/amx9 #MANUAL.pdf (AMX9, 2002))
   - AMX9A - #PCB/AMX9A-ISS2.net, AMX9A-ISS2.ECO, WORKING/AMX9A-ISS3.net + .ECO, OBSOLETE/AMX9A-ISS1.net,
     WORKING/AMX9-iss2.bom (2009), WORKING/AMX9A-iss3.pcb (pad positions in its embedded DRC text),
     GERBERS/AMX9A-ISS3.TOP/.BOT/.TSS -> assets/amx9a-pcb-iss3.png (rendered, 110 px per inch)
   - AMX9A - #Mechanical #DA #2016/AMX9A BOM .pdf (TOCOS 10K log pots, LM4766, LAM SCD601515, EN5F + B1S speakers)
   - AMX9A - #MECHANICS/AMX9A-FRONT ISS 3 (FRONT PANEL).pdf, AMX9A-REAR ISS 2 (REAR PANEL).pdf (to-scale panels)
   - AMX9A - #ARTWORK #DA #2016/AMX9A-FRONT & REAR(CURVE).cdr (NOV.26/15), converted with Inkscape, guides dropped
     -> assets/amx9a-front-green.png, amx9a-front-white.png, amx9a-rear-white.png (100 px per inch, 17.1 × 1.648 in);
     ink colours sampled from AMX9A - #Photos/AMX9A-FRONT.jpg
   - AMX9A - #Functional/AMX9A ISS2 - Functional - June 16 2010.cdr, AMX9A - #Archive/AMX9A Rear Logo for CTV.cdr
   - AMX9 - Redesign #RD #RD78/THAT_1510-1512_Datasheet.pdf (RD78 stub)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = (why)=>`<span class="tag-inf" title="${why?('Inferred: '+why):'Not stated in the source; inferred'}">inferred</span>`;

/* ---------------- constants from the archive ---------------- */
const DBU = 0.7746;                       // 0 dBu = 0.7746 V rms
const VSAT = 13.0;                        // NE5532 peak swing on ±15 V — inferred (rails from LAM SCD601515 part number)
const LMSAT = 12.5;                       // LM4766 peak swing on ±15 V into 8 Ω — inferred
const SPK_Z = 8;                          // EN5F woofer / B1S tweeter impedance — inferred
const C_TW = 2.2e-6;                      // C61 / C63 2.2 µF 100 V non-polar in series with each tweeter (BOM + nets)
const RX = 10e3;                          // R40… input mix resistors, R59 master input, pot value (TOCOS dual 10K log)
const RECV = 5.1e3/20e3;                  // U101 diff receivers: R63/R64 = 5K1/20K
const LMG = 1 + 20e3/5.1e3;               // LM4766 non-inverting gain 1 + R69/R68
const ROUT = 30;                          // R41/R44/R52/R55 30R build-outs: 60 Ω balanced
/* per issue, from the three P-CAD netlists and the ECO logs */
const ISS = {
  ISS1:{ label:'ISS1 (Jun 2009|42)', R45:20e3, R58:20e3, linePot:false, lineOri:+1, monOri:-1, rStrap:-1,
         src:'OBSOLETE/AMX9A-ISS1.net + AMX9-iss2.bom (17 Jun 2009): R45 = R58 = 20K, H3 1×3 line-source link, JUMP1/JUMP2 straps' },
  ISS2:{ label:'ISS2 (Jun 2010|43)', R45:36.2e3, R58:10e3, linePot:true, lineOri:-1, monOri:-1, rStrap:+1,
         src:'AMX9A-ISS2.net: R45 = 36K2 (the ECO of 8 Jun 2010 changed it to 39K2), R58 = 10K, P6 LINE pot, H3 1×4' },
  ISS3:{ label:'ISS3 (25 Jun 2010|43)', R45:39.2e3, R58:10e3, linePot:true, lineOri:+1, monOri:+1, rStrap:+1,
         src:'WORKING/AMX9A-ISS3.net + ECO (24–25 Jun 2010): TB10/TB11 pins 1↔2 swapped, 27p caps, right-angle Phoenix, R45 = 39K2' },
};
/* input channels traced from AMX9A-ISS3.net: op-amp half, resistors, terminal block, ribbon pins */
const CH = [
 {u:'U1B',pin:[5,6,7],rp:'R7', rn:'R1', sh:'R11',shc:'C6', fb:'R2', fbc:'C1', tb:'TB1',rmix:'R40',inP:'P1-16',wP:'P1-6'},
 {u:'U1A',pin:[3,2,1],rp:'R20',rn:'R17',sh:'R23',shc:'C12',fb:'R14',fbc:'C9', tb:'TB4',rmix:'R42',inP:'P1-15',wP:'P1-5'},
 {u:'U2B',pin:[5,6,7],rp:'R32',rn:'R29',sh:'R35',shc:'C22',fb:'R26',fbc:'C19',tb:'TB7',rmix:'R46',inP:'P1-14',wP:'P1-4'},
 {u:'U2A',pin:[3,2,1],rp:'R8', rn:'R3', sh:'R12',shc:'C7', fb:'R4', fbc:'C2', tb:'TB2',rmix:'R47',inP:'P1-13',wP:'P1-3'},
 {u:'U3B',pin:[5,6,7],rp:'R21',rn:'R18',sh:'R24',shc:'C14',fb:'R15',fbc:'C10',tb:'TB5',rmix:'R49',inP:'P1-12',wP:'P1-2'},
 {u:'U3A',pin:[3,2,1],rp:'R33',rn:'R30',sh:'R36',shc:'C23',fb:'R27',fbc:'C20',tb:'TB8',rmix:'R51',inP:'P1-11',wP:'P1-1'},
 {u:'U4B',pin:[5,6,7],rp:'R9', rn:'R5', sh:'R13',shc:'C8', fb:'R6', fbc:'C3', tb:'TB3',rmix:'R53',inP:'P2-13',wP:'P2-6'},
 {u:'U4A',pin:[3,2,1],rp:'R22',rn:'R19',sh:'R25',shc:'C15',fb:'R16',fbc:'C11',tb:'TB6',rmix:'R56',inP:'P2-12',wP:'P2-5'},
 {u:'U5B',pin:[5,6,7],rp:'R34',rn:'R31',sh:'R37',shc:'C24',fb:'R28',fbc:'C21',tb:'TB9',rmix:'R57',inP:'P2-11',wP:'P2-4'},
];
const PCB_TB_X = {TB1:5165,TB4:5715,TB7:6265,TB2:6815,TB5:7365,TB8:7915,TB3:8465,TB6:9015,TB9:9565,TB10:10115,TB11:10665}; // mils, ISS3 .pcb
const FREQS=[100,250,440,1000,2500,5000,10000];

/* ---------------- device state ---------------- */
function freshInputs(){ return Array.from({length:9},(_,i)=>({on:i===2||i===6, src:i===6?'speech':'tone', lvl:4, f:[1000,440,1000,250,2500,440,1000,5000,100][i], pot:i===2?0.75:(i===6?0.6:0.0), mic:false, micG:40})); }
const D = {
  iss:'ISS3', in:freshInputs(), line:0.75, mon:0.55, phones:false, muteJ:true, lineLoad:'10k', monLoad:'10k',
  iss1Link:'pre',          // ISS1 only: H3 link 1-2 (line = mix bus) or 2-3 (line follows master) — inferred use of H3
  sel:2, view:'mon', log:[], ver:1, rd78:false,
};
const ISSX = ()=>ISS[D.iss];
function bump(){ D.ver++; STATS=null; }

/* ---------------- analog model ---------------- */
const clip=(v,s)=> v>s? s : v<-s? -s : v;
const taper = th => th<=0? 0 : (Math.pow(10,2*th)-1)/99;          // 10K log (≈10 % at mid travel) — inferred A-law
const dbu = vrms => vrms>1e-9? 20*Math.log10(vrms/DBU) : -150;
const fromDbu = d => DBU*Math.pow(10,d/20);
function hash(n){ n=(n^61)^(n>>>16); n=n+(n<<3); n=n^(n>>>4); n=Math.imul(n,0x27d4eb2d); return ((n^(n>>>15))>>>0)/4294967296; }
/* talkback-like source: noise-ish partials under a ~4.3 Hz syllable envelope (deterministic) */
const SPEECH = Array.from({length:9},(_,i)=>Array.from({length:6},(_,k)=>({f:150+hash(i*31+k)*2200, p:hash(i*17+k+5)*6.28})));
function src(i,t){
  const c=D.in[i]; if (!c.on || c.src==='off') return 0;
  const A=fromDbu(c.lvl)*Math.SQRT2;
  if (c.src==='tone') return A*Math.sin(2*Math.PI*c.f*t);
  const env=Math.pow(Math.max(0,Math.sin(2*Math.PI*(4.3+i*0.21)*t+i)),2)*(0.55+0.45*Math.sin(2*Math.PI*0.9*t+i));
  let s=0; SPEECH[i].forEach((q,k)=>{ s+=Math.sin(2*Math.PI*q.f*t+q.p)/(k+1); });
  return A*1.6*env*s/1.6;
}
function micGain(c){ return c.mic? Math.pow(10,c.micG/20) : 1; }       // RD78 what-if: THAT1512 replaces the unity diff amp
function potLoad(a){ return a/(RX + a*(1-a)*RX); }                       // wiper Thevenin into a 10K virtual-earth resistor
/* every node, instantaneous (volts). Single-ended op-amp outputs unless named "diff". */
function nodes(t){
  const X=ISSX(), n={in:[],u:[],mixI:0};
  for (let i=0;i<9;i++){ const v=src(i,t); n.in.push(v); const u=clip(v*micGain(D.in[i]),VSAT); n.u.push(u); n.mixI += potLoad(taper(D.in[i].pot))*u; }
  n.mix = clip(-X.R45*n.mixI, VSAT);                                         // U6A pin 1, net MASTER
  const am=taper(D.mon);
  n.u6b = clip(-X.R58*potLoad(am)*n.mix, VSAT);                              // U6B pin 7 (RV10 wiper -> R59)
  let ls; if (X.linePot) ls = taper(D.line)*n.mix; else ls = D.iss1Link==='pre'? n.mix : n.u6b;
  n.u7a = clip(ls,VSAT); n.u7b = clip(-n.u7a,VSAT);                          // U7A follower, U7B inverter (R38/R39)
  n.u8a = clip(n.u6b,VSAT); n.u8b = clip(-n.u8a,VSAT);                       // U8A follower, U8B inverter (R48/R50)
  const ld = z=> z==='open'? 1 : z==='600'? 600/(600+2*ROUT) : 10e3/(10e3+2*ROUT);
  n.lineDiff = X.lineOri*(n.u7b-n.u7a)*ld(D.lineLoad);                       // TB10 pin1 - pin2
  n.monDiff  = X.monOri*(n.u8a-n.u8b)*ld(D.monLoad);                         // TB11 pin1 - pin2
  const recv = RECV*(n.u8a-n.u8b);                                           // U101A / U101B
  const muted = !D.muteJ;
  n.ampL = muted? 0 : clip(LMG*recv, LMSAT);
  n.ampR = muted? 0 : clip(LMG*recv*X.rStrap, LMSAT);
  n.spk = D.phones? 0 : 1;
  return n;
}
/* statistics over the second (rms / peak per stage), cached per state */
let STATS=null;
function stats(){
  if (STATS) return STATS;
  const N=6000, acc={}; const add=(k,v)=>{ const a=acc[k]||(acc[k]={s:0,p:0}); a.s+=v*v; const m=Math.abs(v); if(m>a.p)a.p=m; };
  for (let k=0;k<N;k++){ const t=(k+0.37)/N*0.999+Math.sin(k)*1e-5+0.0005;
    const n=nodes(t);
    for (let i=0;i<9;i++){ add('in'+i,n.in[i]); add('u'+i,n.u[i]); }
    ['mix','u6b','u7a','u8a','lineDiff','monDiff','ampL','ampR'].forEach(q=>add(q,n[q])); }
  const r={}; for (const k in acc){ r[k]={rms:Math.sqrt(acc[k].s/N), pk:acc[k].p}; }
  r.clip = { u:[...Array(9)].map((_,i)=>r['u'+i].pk>=VSAT*0.999), mix:r.mix.pk>=VSAT*0.999, u6b:r.u6b.pk>=VSAT*0.999, u7a:r.u7a.pk>=VSAT*0.999, u8a:r.u8a.pk>=VSAT*0.999, amp:r.ampL.pk>=LMSAT*0.999 };
  r.spkW = D.phones? 0 : r.ampL.rms*r.ampL.rms/SPK_Z;
  STATS=r; return r;
}
const CLIP_DBU = dbu(VSAT/Math.SQRT2);           // +21.5 dBu single-ended
const anyClip = s => s.clip.u.some(x=>x)||s.clip.mix||s.clip.u6b||s.clip.u7a||s.clip.u8a||s.clip.amp;
function chGainDb(i){ const a=taper(D.in[i].pot); return a<=0? -Infinity : 20*Math.log10(ISSX().R45*potLoad(a)*micGain(D.in[i])); }

/* ---------------- actions: each logs the copper path it touches ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t,name,trace:tr}); if (D.log.length>40) D.log.length=40; bump(); SIM.refresh(); }
const A = {
  pot(i,v){ v=Math.max(0,Math.min(1,v)); if (i===9){ D.mon=v; } else if (i===10){ D.line=v; } else D.in[i].pot=v; bump(); },
  potLog(i){ act(i===9? 'MONITOR level' : i===10? 'LINE level' : `Input ${i+1} level`, tr=>{
    if (i<9){ const c=CH[i], a=taper(D.in[i].pot);
      tr(`RV${i+1} (TOCOS dual 10K log, one gang used) top = IN_${i+1} ← H${i<6?1:2}-${c.inP.split('-')[1]} ← 16-way ribbon ← ${c.inP} IN${i+1} = ${c.u} pin ${c.pin[2]}`);
      tr(`wiper WIPER_${i+1} → ribbon → ${c.wP} WIPER${i+1} → ${c.rmix} 10K → U6 pin 2 (virtual earth, NET00063)`);
      tr(`rotation ${(D.in[i].pot*100).toFixed(0)} % → wiper ${(a*100).toFixed(1)} % of IN${i+1} ${inf('log law')} → channel gain ${isFinite(chGainDb(i))?chGainDb(i).toFixed(1)+' dB':'OFF'} to the MASTER bus (R45 ${ISSX().R45/1e3}K)`);
    } else if (i===9){ tr('RV10 (MONITOR, black cap) top = MASTER_H ← H2-1 ← P2-1 MASTER (U6 pin 1); wiper MASTER_WIPER_H → H2-2 → P2-2 → R59 10K → U6 pin 6');
      tr(`U6B gain −R58/R59 = −${ISSX().R58/1e3}K/10K; U6 pin 7 → R54 → U8A follower / U8B inverter → R52/R55 30R → TB11 MONITOR + P3 → amplifier`);
    } else { tr(ISSX().linePot? 'LINE pot (top-level BOM item, flying lead) on P6: P6-1 MASTER, P6-2 wiper → R43 10K → U7 pin 3, P6-3 GNDD' : 'ISS1 has no LINE pot: H3 link sets the line source');
      tr('U7A follower → R44 30R, U7B inverter (R38/R39) → R41 30R → TB10 LINE OUTPUT'); }
  }); },
  plug(i){ act(`Input ${i+1}: ${D.in[i].on?'unplugged':'source connected'}`, tr=>{ D.in[i].on=!D.in[i].on; D.sel=i; const c=CH[i];
    tr(`Rear plug "${i+1}" = ${c.tb} (PHEN3PRA-3.81 right-angle header, Euroblock plug) — pin 1 (+) → ${c.rp} 10K → ${c.u} pin ${c.pin[0]}, pin 2 (−) → ${c.rn} 10K → pin ${c.pin[1]}, pin 3 → GNDD`);
    tr(`${c.u}: difference amp, gain ${c.fb}/${c.rn} = 1, ${c.sh} 10K to ground; input impedance 20 kΩ differential (manual: "greater than 20kΩ balanced")`); }); },
  phones(){ act(D.phones?'Headset unplugged':'Headset plugged into the T/R/S jack', tr=>{ D.phones=!D.phones;
    tr('N114B T/R/S jack on P101: tip ← LM4766 out A (P101-1), ring ← out B (P101-2); the jack\'s normalling contacts return on P101-3/P101-4');
    tr(D.phones? 'Plug in: normals open → P103/P104 speaker feeds (woofer direct, tweeter via C63/C61 2.2 µF) go dead — speakers muted' : 'Plug out: normals close → both speakers fed again'); }); },
  iss(v){ act(`Board issue → ${ISS[v].label}`, tr=>{ D.iss=v; tr(ISS[v].src); }); },
  mute(){ act(D.muteJ?'P107 jumper removed':'P107 jumper fitted', tr=>{ D.muteJ=!D.muteJ;
    tr('P107: pin 1 MUTE (R77 3K3 → LM4766 pins 6/11), pin 2 VEE, pin 3 GND. The ISS2 ECO replaced the hard JP1 (VEE–MUTE) link with this header.');
    tr(D.muteJ? 'Jumper 1–2: mute pins pull current to VEE → amplifier plays' : `No jumper: LM4766 stays in mute — speakers and headset silent ${inf('LM4766 mute behaviour from its datasheet, not in the archive')}`); }); },
  load(which){ act(`${which==='line'?'LINE':'MONITOR'} output load changed`, tr=>{ const k=which==='line'?'lineLoad':'monLoad'; const o=['10k','600','open']; D[k]=o[(o.indexOf(D[k])+1)%3];
    tr(`${which==='line'?'TB10':'TB11'}: two 30R build-outs = 60 Ω balanced source (manual: "60Ω balanced"). Load now ${D[k]==='open'?'open':D[k]+' Ω'}.`); }); },
  reset(){ D.iss='ISS3'; D.in=freshInputs(); D.line=0.75; D.mon=0.55; D.phones=false; D.muteJ=true; D.lineLoad='10k'; D.monLoad='10k'; D.iss1Link='pre'; D.sel=2; D.log=[]; D.rd78=false; bump(); SIM.refresh(); },
};

/* ---------------- panels (to scale, 100 px per inch) ---------------- */
/* FRONT: AMX9A-FRONT ISS 3 (FRONT PANEL).pdf — 17.100 × 1.648 in; C .265 pot holes at x 4.625 + n·0.800, y 1.121;
   LINE pot .265 at (11.900, .440 from the top edge) ("ISSUE 2: .265 DIA. HOLE ADDED", 07 06 2010); LED B .130 at (4.125, 1.172);
   jack D .390 at (12.775, .824); hex grills (Detail L: 3.300 wide, 12 pitches @ .275, 6 pitches @ .159) centred x 2.100 and 15.000 */
const P=100, FX=95, FY=5;
function knobSVG(id,cx,cy,rot,cap,label,dim){
  const ang=-150+300*rot, r=19.7;
  return `<g class="amxk" data-k="${id}" style="cursor:ns-resize${dim?';opacity:.35':''}"><title>${label}: ${(rot*100).toFixed(0)} % — drag up/down or use the wheel</title>
   <circle cx="${cx}" cy="${cy}" r="${r+1.5}" fill="#0b0b0c"/>${[...Array(18)].map((_,k)=>{const a=k*20*Math.PI/180; return `<line x1="${cx+Math.cos(a)*(r-1)}" y1="${cy+Math.sin(a)*(r-1)}" x2="${cx+Math.cos(a)*(r+1.4)}" y2="${cy+Math.sin(a)*(r+1.4)}" stroke="#2b2c2e" stroke-width="2"/>`;}).join('')}
   <circle cx="${cx}" cy="${cy}" r="${r}" fill="#151617"/><circle cx="${cx}" cy="${cy}" r="13.8" fill="${cap}"/>
   <g transform="rotate(${ang} ${cx} ${cy})"><line x1="${cx}" y1="${cy-2}" x2="${cx}" y2="${cy-r+2}" stroke="#f2f2ee" stroke-width="2.6" stroke-linecap="round"/></g></g>`;
}
function hexGrill(cx){
  let s=''; const r=12.5, h=r*Math.sqrt(3)/2;
  for (let i=0;i<13;i++) for (let j=0;j<7;j++){ if ((i+j)%2) continue; const x=FX+(cx-1.65+i*0.275)*P, y=FY+(0.824-0.477+j*0.159)*P;
    s+=`<polygon points="${[0,60,120,180,240,300].map(a=>{const q=a*Math.PI/180; return (x+r*Math.cos(q)).toFixed(1)+','+(y+r*Math.sin(q)*0.86).toFixed(1);}).join(' ')}" fill="#050506"/>`; }
  return s;
}
function frontSVG(){
  const X=ISSX(), s=stats();
  let g=`<svg viewBox="0 0 1900 175" role="img" aria-label="AMX9A front panel" style="width:100%;display:block">
   <defs><linearGradient id="amxSheen" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2a2b2d"/><stop offset=".5" stop-color="#202123"/><stop offset="1" stop-color="#18191a"/></linearGradient>
   <filter id="amxGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   ${[0,1805].map(x=>`<rect x="${x}" y="1" width="95" height="172" rx="3" fill="#1d1e20" stroke="#0c0c0d"/>${[25,150].map(y=>`<rect x="${x+(x?36:22)}" y="${y-9}" width="38" height="18" rx="9" fill="#e9e9e4"/>`).join('')}`).join('')}
   <rect x="${FX}" y="${FY}" width="1710" height="164.8" fill="url(#amxSheen)" stroke="#0b0b0c"/>
   ${hexGrill(2.1)}${hexGrill(15.0)}
   <image href="${ASSET}amx9a-front-green.png" x="${FX}" y="${FY}" width="1710" height="165"/><image href="${ASSET}amx9a-front-white.png" x="${FX}" y="${FY}" width="1710" height="165"/>
   <circle cx="${FX+4.125*P}" cy="${FY+1.172*P}" r="7" fill="#c9ff8a" filter="url(#amxGlow)"><title>LED1 power (green, R10 1K5 from +VA)</title></circle>`;
  for (let i=0;i<9;i++){ const cx=FX+(4.625+0.8*i)*P, cy=FY+1.121*P;
    if (i===D.sel) g+=`<circle cx="${cx}" cy="${cy}" r="27" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-dasharray="4 3"/>`;
    if (s.clip.u[i]) g+=`<circle cx="${cx}" cy="${cy}" r="25" fill="none" stroke="#ff4a3a" stroke-width="3"/>`;
    g+=knobSVG(i,cx,cy,D.in[i].pot,'#62a865',`Input ${i+1} level (RV${i+1})`); }
  g+=knobSVG(9,FX+11.9*P,FY+1.121*P,D.mon,'#1a1a1b','MONITOR level (RV10)');
  g+=X.linePot? knobSVG(10,FX+11.9*P,FY+0.440*P,D.line,'#1a1a1b','LINE level (pot on P6)')
              : `<g><circle cx="${FX+11.9*P}" cy="${FY+0.440*P}" r="13" fill="#0a0a0a"/><text x="${FX+11.9*P}" y="${FY+0.440*P+4}" font-size="9" text-anchor="middle" fill="#ff9d7a">no pot</text><title>ISS1 (2009): no LINE pot hole yet — front ISS 2 (07 06 2010) added it</title></g>`;
  const jx=FX+12.775*P, jy=FY+0.824*P;
  g+=`<g id="amxJack" style="cursor:pointer"><title>T/R/S headset jack — click to ${D.phones?'unplug':'plug in'} a headset</title><circle cx="${jx}" cy="${jy}" r="27" fill="#0e0e0f" stroke="#3a3b3d"/>${[...Array(24)].map((_,k)=>{const a=k*15*Math.PI/180;return `<line x1="${jx+Math.cos(a)*23}" y1="${jy+Math.sin(a)*23}" x2="${jx+Math.cos(a)*27}" y2="${jy+Math.sin(a)*27}" stroke="#48494b" stroke-width="2"/>`;}).join('')}<circle cx="${jx}" cy="${jy}" r="19.5" fill="#050505"/><circle cx="${jx}" cy="${jy}" r="12.5" fill="#000" stroke="#555"/>
   ${D.phones?`<circle cx="${jx}" cy="${jy}" r="12" fill="#bdbdb5"/><rect x="${jx-9}" y="${jy-9}" width="18" height="18" rx="4" fill="#2c2c2e"/><path d="M${jx} ${jy+9} C ${jx+10} ${jy+60}, ${jx+80} ${jy+40}, ${jx+90} ${jy+75}" stroke="#2c2c2e" stroke-width="7" fill="none"/>`:''}</g>`;
  if (!D.phones && s.spkW>0.0005){ const a=Math.min(1,Math.sqrt(s.spkW/9)); [2.1,15.0].forEach(c=>{ g+=`<ellipse cx="${FX+c*P}" cy="${FY+82}" rx="${150*a+10}" ry="${40*a+4}" fill="var(--accent)" opacity="${0.08+0.25*a}"><title>speaker output ≈ ${s.spkW.toFixed(2)} W</title></ellipse>`; }); }
  return g+`</svg>`;
}
/* REAR: AMX9A-REAR ISS 2 (REAR PANEL).pdf — 17.100 × 1.648 in; Detail B 1.080 × 1.240 (IEC inlet) at x .840; C .114 stud at 1.880;
   14 × .093 × 1.000 slots, 3.900–5.400 and 5.900–7.400 at .250; Detail E 6.030 × .332 rect from x 8.695 (centre .415 above the bottom) */
function rearSVG(){
  const s=stats(); const H=164.8;
  let g=`<svg viewBox="0 0 1710 165" role="img" aria-label="AMX9A rear panel" style="width:100%;display:block"><rect width="1710" height="${H}" fill="url(#amxSheenR)" stroke="#0b0b0c"/>
   <defs><linearGradient id="amxSheenR" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#262729"/><stop offset="1" stop-color="#18191a"/></linearGradient></defs>
   <rect x="${30}" y="${21.4}" width="108" height="124" rx="6" fill="#141415" stroke="#3b3c3e"/><rect x="40" y="30" width="88" height="56" rx="5" fill="#070707"/>
   ${[[64,58],[84,48],[104,58]].map(([x,y])=>`<rect x="${x-3}" y="${y-8}" width="6" height="16" fill="#c9c9c4"/>`).join('')}<rect x="44" y="94" width="80" height="42" rx="4" fill="#202122" stroke="#444"/><text x="84" y="119" font-size="9" fill="#888" text-anchor="middle">fuse 1A S.B.</text>
   <circle cx="188" cy="82.4" r="7" fill="#9c9c96" stroke="#555"><title>ground stud (FH440-5 insert)</title></circle>`;
  for (let k=0;k<14;k++){ const x=(k<7? 3.9+k*0.25 : 5.9+(k-7)*0.25)*P; g+=`<rect x="${x-4.65}" y="${32.4}" width="9.3" height="100" rx="4.6" fill="#040404"/>`; }
  g+=`<image href="${ASSET}amx9a-rear-white.png" x="0" y="0" width="1710" height="165"/>`;
  const order=['TB11','TB10',...[9,8,7,6,5,4,3,2,1].map(n=>CH[n-1].tb)];
  order.forEach((tb,k)=>{ const cx=(8.695+0.275+0.55*k)*P, y0=106.7, isIn=k>=2, ch=isIn? 10-k : -1;
    const on=isIn? D.in[ch].on : true; const col=isIn? (on?'#66c06e':'#4a8f50') : '#66c06e';
    g+=`<g class="amxtb" data-tb="${tb}" data-ch="${ch}" style="cursor:pointer"><title>${tb} — ${isIn?`input ${ch+1} (${on?'connected: click to unplug':'click to connect a source'})`:(tb==='TB10'?'LINE output (click: change load)':'MONITOR output (click: change load)')}</title>
      <rect x="${cx-24}" y="${y0}" width="48" height="33" rx="2" fill="${col}" stroke="#2c5d31"/>${[-15,0,15].map(d=>`<rect x="${cx+d-5}" y="${y0+4}" width="10" height="10" fill="#d8eed8" stroke="#3a6b3e"/><rect x="${cx+d-4}" y="${y0+19}" width="8" height="10" fill="#1d3a20"/>`).join('')}
      ${isIn&&on?`<circle cx="${cx}" cy="${y0+16}" r="27" fill="none" stroke="${ch===D.sel?'var(--accent)':'#7fd3ff'}" stroke-width="3"/>`:''}
</g>`; });
  return g+`</svg>`;
}
function bindPanels(m){
  m.querySelectorAll('.amxk').forEach(k=>{
    const id=+k.dataset.k;
    const get=()=> id===9? D.mon : id===10? D.line : D.in[id].pot;
    k.onwheel=e=>{ e.preventDefault(); A.pot(id,get()-Math.sign(e.deltaY)*0.03); if (id<9) D.sel=id; SIM.refresh(); clearTimeout(k._t); k._t=setTimeout(()=>A.potLog(id),400); };
    k.onpointerdown=e=>{ e.preventDefault(); const y0=e.clientY, v0=get(); if (id<9) D.sel=id;
      const mv=ev=>{ A.pot(id, v0+(y0-ev.clientY)/160); SIM.refresh(); };
      const up=()=>{ window.removeEventListener('pointermove',mv); window.removeEventListener('pointerup',up); A.potLog(id); };
      window.addEventListener('pointermove',mv); window.addEventListener('pointerup',up); };
  });
  const j=m.querySelector('#amxJack'); if (j) j.onclick=()=>A.phones();
  m.querySelectorAll('.amxtb').forEach(t=>t.onclick=()=>{ const ch=+t.dataset.ch; if (ch>=0) A.plug(ch); else A.load(t.dataset.tb==='TB10'?'line':'mon'); });
}
let PANV=-1;
function drawPanels(m, force){ if (!force && PANV===D.ver) return; PANV=D.ver; const f=m.querySelector('#amxF'), r=m.querySelector('#amxR'); if (f) f.innerHTML=frontSVG(); if (r) r.innerHTML=rearSVG(); bindPanels(m); }

/* ---------------- shared UI pieces ---------------- */
const card=(t,b,id)=>`<div class="card"${id?` id="${id}"`:''}><h2>${t}</h2>${b}</div>`;
const fmtDb = v => !isFinite(v)? 'OFF' : Math.abs(v)<0.05? '0.0' : (v>=0?'+':'')+v.toFixed(1);
function inputsTable(){
  const s=stats();
  return `<table class="kv"><tr><th>In</th><th>Source</th><th>Level dBu</th><th>Freq</th><th>Knob</th><th>Gain to bus</th><th>Stage pk</th>${D.rd78?'<th>RD78 mic</th>':''}</tr>${D.in.map((c,i)=>`<tr class="${i===D.sel?'hl':''}">
    <td><button data-sel="${i}" title="show in timeline">${i+1}</button></td>
    <td><select data-src="${i}">${['tone','speech','off'].map(o=>`<option ${c.src===o?'selected':''}>${o}</option>`).join('')}</select>${c.on?'':' <span class="muted small">(unplugged)</span>'}</td>
    <td><input type="range" data-lv="${i}" min="-40" max="26" step="1" value="${c.lvl}" style="width:80px"> <span class="mono">${c.lvl>0?'+':''}${c.lvl}</span></td>
    <td><select data-f="${i}">${FREQS.map(f=>`<option value="${f}" ${f===c.f?'selected':''}>${f>=1000?f/1000+'k':f}</option>`).join('')}</select></td>
    <td><input type="range" data-pot="${i}" min="0" max="1" step="0.01" value="${c.pot}" style="width:80px"></td>
    <td class="mono">${fmtDb(chGainDb(i))}</td>
    <td class="mono" style="${s.clip.u[i]?'color:var(--bad);font-weight:700':''}">${c.on?dbu(s['u'+i].pk/Math.SQRT2).toFixed(1)+(s.clip.u[i]?' CLIP':''):'—'}</td>
    ${D.rd78?`<td><label><input type="checkbox" data-mic="${i}" ${c.mic?'checked':''}> <input type="range" data-mg="${i}" min="0" max="60" value="${c.micG}" style="width:60px"> ${c.micG} dB</label></td>`:''}</tr>`).join('')}</table>`;
}
function bindInputs(m){
  const R=()=>{ bump(); SIM.refresh(); };
  m.querySelectorAll('[data-sel]').forEach(b=>b.onclick=()=>{ D.sel=+b.dataset.sel; R(); });
  m.querySelectorAll('[data-src]').forEach(b=>b.onchange=e=>{ const i=+b.dataset.src; D.in[i].src=e.target.value; if (e.target.value!=='off') D.in[i].on=true; R(); });
  m.querySelectorAll('[data-lv]').forEach(b=>b.onchange=e=>{ D.in[+b.dataset.lv].lvl=+e.target.value; R(); });
  m.querySelectorAll('[data-f]').forEach(b=>b.onchange=e=>{ D.in[+b.dataset.f].f=+e.target.value; R(); });
  m.querySelectorAll('[data-pot]').forEach(b=>b.onchange=e=>{ const i=+b.dataset.pot; A.pot(i,+e.target.value); D.sel=i; A.potLog(i); });
  m.querySelectorAll('[data-mic]').forEach(b=>b.onchange=e=>{ D.in[+b.dataset.mic].mic=e.target.checked; R(); });
  m.querySelectorAll('[data-mg]').forEach(b=>b.onchange=e=>{ D.in[+b.dataset.mg].micG=+e.target.value; R(); });
}
function outputsHTML(){
  const s=stats(), X=ISSX();
  const row=(n,v,clipd,extra)=>`<tr><th>${n}</th><td class="mono" style="${clipd?'color:var(--bad);font-weight:700':''}">${v}${clipd?' CLIP':''}</td><td class="small">${extra||''}</td></tr>`;
  return `<table class="kv">
   ${row('MIX bus (U6A, MASTER)', dbu(s.mix.rms).toFixed(1)+' dBu', s.clip.mix, `headroom ${(CLIP_DBU-dbu(s.mix.pk/Math.SQRT2)).toFixed(1)} dB to +21.5 dBu`)}
   ${row('LINE OUTPUT (TB10)', dbu(s.lineDiff.rms).toFixed(1)+' dBu bal.', s.clip.u7a, `${X.lineOri>0?'in polarity':'<b style="color:var(--warn)">polarity inverted</b>'} · load ${D.lineLoad}`)}
   ${row('MONITOR OUTPUT (TB11)', dbu(s.monDiff.rms).toFixed(1)+' dBu bal.', s.clip.u8a||s.clip.u6b, `${X.monOri>0?'in polarity':'<b style="color:var(--warn)">polarity inverted</b>'} · load ${D.monLoad}`)}
   ${row('LM4766 out A / B', (s.ampL.rms).toFixed(2)+' V rms', s.clip.amp, D.muteJ? (X.rStrap>0?'L and R in phase':'<b style="color:var(--warn)">R anti-phase (ISS1 JUMP straps)</b>') : '<b>muted (no P107 jumper)</b>')}
   ${row('Speakers', D.phones? 'muted by headset plug' : (s.spkW*1000<1? (s.spkW*1000).toFixed(2)+' mW' : s.spkW.toFixed(2)+' W')+' each', false, D.phones?'normalling contacts open':'5″ EN5F + 1″ B1S per side, 8 Ω '+inf('speaker impedance'))}
   ${row('Headset', D.phones? (s.ampL.rms).toFixed(2)+' V rms per ear' : 'no plug', false, D.phones && s.ampL.rms>1? '<b style="color:var(--warn)">very loud: no series resistor between the LM4766 and the jack</b>':'')}</table>`;
}
function traceHTML(){ const e=D.log[0]; return e? `<div><b>${e.name}</b> at ${SIM.fmtT(e.t)}</div>`+e.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Drag a knob (or use the wheel), click a rear terminal block, or click the headset jack. Each action lists the nets and parts it goes through.</div>'; }
function issControls(){ return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-top:8px">
   <label>Board issue <select id="aIss">${Object.keys(ISS).map(k=>`<option value="${k}" ${k===D.iss?'selected':''}>${ISS[k].label}</option>`).join('')}</select></label>
   ${D.iss==='ISS1'?`<label>H3 link ${inf('use of the 1×3 header')} <select id="aLink"><option value="pre" ${D.iss1Link==='pre'?'selected':''}>1–2: line = mix bus</option><option value="post" ${D.iss1Link==='post'?'selected':''}>2–3: line follows MASTER</option></select></label>`:''}
   <label><input type="checkbox" id="aMute" ${D.muteJ?'checked':''}> P107 jumper (amp un-muted)</label>
   <label><input type="checkbox" id="aRd" ${D.rd78?'checked':''}> RD78 what-if: THAT1512 mic pre per input ${inf('RD78 was only a datasheet')}</label>
   <button id="aRst">Reset</button></div>`; }
function bindIss(m){
  const q=s=>m.querySelector(s);
  if (q('#aIss')) q('#aIss').onchange=e=>A.iss(e.target.value);
  if (q('#aLink')) q('#aLink').onchange=e=>{ D.iss1Link=e.target.value; bump(); SIM.refresh(); };
  if (q('#aMute')) q('#aMute').onchange=()=>A.mute();
  if (q('#aRd')) q('#aRd').onchange=e=>{ D.rd78=e.target.checked; if(!D.rd78) D.in.forEach(c=>c.mic=false); bump(); SIM.refresh(); };
  if (q('#aRst')) q('#aRst').onclick=()=>A.reset();
}

/* ---------------- timeline lanes ---------------- */
const VIEWS={
  mon:['src','u','mix','u6b','monDiff','amp'],
  line:['src','u','mix','u7a','lineDiff'],
  all:['src','u','mix','u6b','u7a','lineDiff','monDiff','amp'],
};
function lanes(){
  const css=SIM.css, i=D.sel, ch=CH[i];
  const wave=(get,scale,col,label)=>function(c,X,t0,t1,y,h){
    const pw=X(t1)-X(t0); const Np=Math.min(1200,Math.max(300,Math.round(pw*1.5))); const Y=v=>y+h/2-v/scale*(h/2-3);
    c.strokeStyle=css('--grid'); c.beginPath(); c.moveTo(X(t0),y+h/2); c.lineTo(X(t1),y+h/2); c.stroke();
    const sat = label==='amp'? LMSAT : VSAT;
    c.fillStyle='rgba(211,58,44,.10)'; c.fillRect(X(t0),y,pw,Math.max(0,Y(sat)-y)); c.fillRect(X(t0),Y(-sat),pw,Math.max(0,y+h-Y(-sat)));
    c.strokeStyle=col; c.lineWidth=1.1; c.beginPath();
    // dense: draw a min/max envelope per pixel column
    const dt=(t1-t0)/Np;
    for (let p=0;p<=Np;p++){ const tt=t0+dt*p; const v=get(nodes(tt)); p?c.lineTo(X(tt),Y(v)):c.moveTo(X(tt),Y(v)); }
    c.stroke(); };
  const sc = v=>Math.max(1.5, Math.min(30, v*1.15));
  const s=stats();
  const L={
    src:{label:`In ${i+1} at ${ch.tb} (diff, V)`, h:44, draw:wave(n=>n.in[i], sc(s['in'+i].pk||1), css('--accent2'))},
    u:{label:`${ch.u} pin ${ch.pin[2]} IN${i+1}`, h:44, draw:wave(n=>n.u[i], sc(Math.max(s['u'+i].pk,1)), css('--accent2'))},
    mix:{label:'U6 pin 1 MASTER (mix bus)', h:50, draw:wave(n=>n.mix, sc(Math.max(s.mix.pk,1)), css('--accent'))},
    u6b:{label:'U6 pin 7 (after MONITOR pot)', h:44, draw:wave(n=>n.u6b, sc(Math.max(s.u6b.pk,1)), css('--accent'))},
    u7a:{label:'U7 pin 1 (after LINE pot)', h:44, draw:wave(n=>n.u7a, sc(Math.max(s.u7a.pk,1)), css('--accent'))},
    lineDiff:{label:'TB10 LINE + − (diff)', h:44, draw:wave(n=>n.lineDiff, sc(Math.max(s.lineDiff.pk,1)), css('--warn'))},
    monDiff:{label:'TB11 MONITOR + − (diff)', h:44, draw:wave(n=>n.monDiff, sc(Math.max(s.monDiff.pk,1)), css('--warn'))},
    amp:{label:D.phones?'LM4766 A → headset tip':'LM4766 A → left speaker', h:48, draw:wave(n=>n.ampL*(D.phones?1:n.spk), sc(Math.max(s.ampL.pk,1)), css('--bad'), 'amp')},
  };
  return VIEWS[D.view].map(k=>L[k]);
}
function viewSel(){ return `<label class="small">Lanes <select id="aView">${[['mon','monitor path'],['line','line path'],['all','every stage']].map(([k,l])=>`<option value="${k}" ${k===D.view?'selected':''}>${l}</option>`).join('')}</select></label>
  <label class="small">Show input <select id="aSel">${D.in.map((_,i)=>`<option value="${i}" ${i===D.sel?'selected':''}>${i+1}</option>`).join('')}</select></label>`; }
function bindViewSel(m){ const v=m.querySelector('#aView'); if (v) v.onchange=e=>{ D.view=e.target.value; SIM.refresh(); }; const s=m.querySelector('#aSel'); if (s) s.onchange=e=>{ D.sel=+e.target.value; bump(); SIM.refresh(); }; }

/* ---------------- tabs ---------------- */
function panelsHTML(){ return `<div id="amxF"></div><div class="small muted" style="margin:3px 0 10px">Front: to scale from <span class="mono">AMX9A-FRONT ISS 3 (FRONT PANEL).pdf</span> (17.100 × 1.648 in; ears ${inf('RMK2 mounting wings drawn generic')}), silk = real green + white separations from <span class="mono">AMX9A-FRONT &amp; REAR(CURVE).cdr</span> (NOV.26/15).</div>
  <div id="amxR"></div><div class="small muted" style="margin-top:3px">Rear (viewed from behind): to scale from <span class="mono">AMX9A-REAR ISS 2 (REAR PANEL).pdf</span>, real white silk. Green Phoenix plugs as in <span class="mono">#Photos/AMX9A-REAR.jpg</span>. Order left → right = TB11, TB10, TB9, TB6, TB3, TB8, TB5, TB2, TB7, TB4, TB1 (ISS3 board seen from the back).</div>`; }
function viewSim(m){
  m.innerHTML=`${card('AMX9A — front and rear (drag knobs, click jack and terminals)', panelsHTML()+issControls())}
   <div class="grid2"><div>${card('Inputs (rear terminals 1–9)', `<div id="aIn"></div>`)}</div>
   <div>${card('Outputs and speakers (over the whole second)', `<div id="aOut"></div>`)}${card('What the last action touched', `<div id="aTr" class="log"></div>`)}</div></div>
   ${card('One second, stage by stage', `<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:6px">${viewSel()}</div><canvas id="tl"></canvas><p class="small muted">Red bands = op-amp rails (±${VSAT} V peak on ±15 V ${inf('supply voltage from the LAM SCD601515 part number')}). Zoom to 10 ms or 1 ms to see the waveforms; at 1 s the speech envelopes (~4 syllables per second) show.</p>`)}`;
  bindIss(m); bindViewSel(m); PANV=-1;
  let IV=-1;
  SIM.on('time',()=>{ drawPanels(m);
    if (IV!==D.ver){ IV=D.ver; m.querySelector('#aIn').innerHTML=inputsTable(); bindInputs(m); m.querySelector('#aOut').innerHTML=outputsHTML(); m.querySelector('#aTr').innerHTML=traceHTML(); }
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:190}); });
}

/* Tutorial — follows the manual (front: nine level controls, master/monitor, line output control, T/R/S headset jack normalled to the speakers; rear: pluggable screw terminals) */
const LESSONS=[
  {title:'Meet the AMX9A', body:`<p>The manual: "a versatile analog audio mixing monitor system… monitoring and mixing of nine mono audio signals." On the front are nine green level knobs, a black <b>MONITOR</b> knob (called MASTER on 2009 units), a black <b>LINE</b> knob above it (added in June 2010), and a T/R/S headset jack. Behind the two hex grilles sit a 5″ woofer and a 1″ tweeter on each side.</p><p>The rear has nine input terminals plus LINE and MONITOR outputs, all on pluggable Phoenix (Euroblock) screw terminals.</p>`, check:()=>true, auto:true},
  {title:'1 · Wire a source into input 3', body:'<p>Start clean: press <b>Start over</b>. Then on the <b>rear panel</b>, click terminal <b>3</b> (labels run 9 → 1 from left to right). Balanced: + to pin 1, − to pin 2, shield to G.</p>', check:()=>D.in[2].on && D.in[2].src!=='off', hint:'Rear panel: the 7th green plug from the left is input 3.'},
  {title:'2 · Bring up input 3', body:'<p>Drag knob <b>3</b> on the front up (or use the mouse wheel) to about three-quarters. The pot is a 10K log type feeding R46 into the mix amplifier, U6A.</p>', check:()=>D.in[2].on && D.in[2].pot>=0.6, hint:'Front panel, third green knob. Drag upward.'},
  {title:'3 · Listen on the speakers', body:'<p>Turn <b>MONITOR</b> up until the speakers give at least 0.5 W. The amplifier is an LM4766 dual power amplifier on its own board.</p>', check:()=>!D.phones && D.muteJ && stats().spkW>=0.5, hint:'Black knob under "LINE", next to the jack — it needs to be near the top. If nothing happens, check the P107 jumper box.'},
  {title:'4 · Plug in a headset', body:'<p>Click the headset jack. "The speaker feeds are normalled through this jack to automatically mute the speakers when a headset is plugged in." The speaker readout drops to zero and the headset gets the amplifier outputs directly.</p>', check:()=>D.phones, hint:'The large round jack right of the knobs.'},
  {title:'5 · Set the line output to +4 dBu', body:'<p>The LINE knob sets the level at rear terminal LINE (TB10) independently of MONITOR. Set it so the LINE OUTPUT reads between +2 and +6 dBu.</p>', check:()=>{ const v=dbu(stats().lineDiff.rms); return ISSX().linePot && v>=2 && v<=6; }, hint:'Black knob above MONITOR. ISS1 boards have no LINE pot, so pick ISS2 or ISS3.'},
  {title:'6 · Mix in a second source', body:'<p>Connect input <b>7</b> (talkback-style "speech") and bring its knob up. Both sources now sum on the MASTER bus; each knob only sets its own share.</p>', check:()=>D.in[6].on && D.in[6].src!=='off' && D.in[6].pot>0.4 && D.in[2].pot>0.4, hint:'Rear: the 3rd input plug from the left of the inputs group is 7.'},
  {title:'7 · Find the headroom', body:'<p>Set input 3’s level to <b>+24 dBu</b> in the Inputs table. The manual allows "+22dBu max": the unity-gain input stage clips at about +21.5 dBu on ±15 V rails. Watch the red ring on knob 3 and "CLIP" in the table, then turn the level back down to +4.</p>', check:()=>D.in[2].lvl<=8 && LESSONS[7].seen, hint:'Inputs table, Level slider for input 3.', onTime:()=>{ if (stats().clip.u[2]) LESSONS[7].seen=true; }},
  {title:'Done', body:'<p>That is the whole front panel. The Software tab follows the signal through every op-amp; the Findings tab covers the polarity fixes between board issues.</p>', check:()=>true, auto:true},
];
let li=0;
function viewTut(m){
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — operating the AMX9A (from the 2010 manual)', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="le"></div></div>
   <div>${card('Outputs', `<div id="aOut"></div>`)}${card('Inputs', `<div id="aIn"></div>`)}</div></div>${card('The unit', panelsHTML()+issControls())}`;
  bindIss(m); PANV=-1; let IV=-1;
  const draw=()=>{ drawPanels(m); LESSONS.forEach(l=>l.onTime&&l.onTime());
    if (IV!==D.ver){ IV=D.ver; m.querySelector('#aOut').innerHTML=outputsHTML(); m.querySelector('#aIn').innerHTML=inputsTable(); bindInputs(m); }
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===li?'font-weight:700;color:var(--accent)':''}">${l.title}${l.check()&&!l.auto?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(e=>e.onclick=()=>{ li=+e.dataset.i; draw(); });
    const L=LESSONS[li], ok=L.check();
    m.querySelector('#le').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
     <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${li?'':'disabled'}>◀ Back</button><button id="nx" ${li<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="r0">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{li=Math.max(0,li-1);draw();}; m.querySelector('#nx').onclick=()=>{li=Math.min(LESSONS.length-1,li+1);draw();};
    m.querySelector('#r0').onclick=()=>{ A.reset(); D.in.forEach(c=>{c.on=false;c.pot=0;}); D.mon=0.3; D.line=0.3; LESSONS[7].seen=false; li=1; bump(); SIM.refresh(); };
  };
  SIM.on('time',draw);
}

/* One second: rates, the instant at the playhead, a 5 ms scope */
function viewSecond(m){
  m.innerHTML=`<div class="grid2">${card('What happens in one second', `<div id="rt"></div>`)}${card('At the playhead', `<div id="ph"></div>`)}</div>
   ${card('Scope: 5 ms around the playhead (MIX bus, TB10, TB11, LM4766 A)', `<canvas id="sc"></canvas>`)}
   ${card('Timeline', `<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:6px">${viewSel()}</div><canvas id="tl"></canvas>`)}`;
  bindViewSel(m);
  SIM.on('time',()=>{ const s=stats();
    const rows=D.in.map((c,i)=>c.on&&c.src!=='off'?[`Input ${i+1} (${c.src})`, c.src==='tone'? c.f.toLocaleString()+' cycles' : `≈${(4.3+i*0.21).toFixed(1)} syllables`, c.src==='tone'? SIM.fmtDur(1/c.f) : SIM.fmtDur(1/(4.3+i*0.21))]:null).filter(Boolean);
    const fc=1/(2*Math.PI*C_TW*SPK_Z);
    m.querySelector('#rt').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td></tr>`).join('')}
      <tr><td>Clock, processor, sampling</td><td colspan="2">none: the AMX9A is all analog, so nothing is clocked. Every lane is continuous signal.</td></tr>
      <tr><td>Tweeter crossover (C61/C63 2.2 µF into 8 Ω ${inf('impedance')})</td><td class="mono" colspan="2">first-order high-pass at ${(fc/1000).toFixed(2)} kHz</td></tr>
      <tr><td>Op-amp small-signal bandwidth</td><td colspan="2">NE5532 with 22p/27p feedback caps across 10K: pole at ${(1/(2*Math.PI*10e3*27e-12)/1000).toFixed(0)} kHz (ISS3 27p) / ${(1/(2*Math.PI*10e3*22e-12)/1000).toFixed(0)} kHz (ISS2 22p)</td></tr>
      <tr><td>LED1</td><td colspan="2">steady: R10 1K5 from +VA ≈ ${((15-2)/1.5).toFixed(1)} mA ${inf('+15 V rail')}</td></tr></table>`;
    const n=nodes(SIM.t), V=v=>`${v>=0?'+':''}${v.toFixed(3)} V`;
    m.querySelector('#ph').innerHTML=`<table class="kv"><tr><th>Node</th><th>Instant</th><th>Whole-second rms</th></tr>
      <tr><td>In ${D.sel+1} (${CH[D.sel].tb} diff)</td><td class="mono">${V(n.in[D.sel])}</td><td class="mono">${dbu(s['in'+D.sel].rms).toFixed(1)} dBu</td></tr>
      <tr><td>${CH[D.sel].u} out IN${D.sel+1}</td><td class="mono">${V(n.u[D.sel])}</td><td class="mono">${dbu(s['u'+D.sel].rms).toFixed(1)} dBu</td></tr>
      <tr><td>Mix-amp input current (Σ through R40…R57)</td><td class="mono">${(n.mixI*1e6).toFixed(2)} µA</td><td></td></tr>
      <tr><td>U6A MASTER</td><td class="mono">${V(n.mix)}</td><td class="mono">${dbu(s.mix.rms).toFixed(1)} dBu</td></tr>
      <tr><td>U6B (post MONITOR)</td><td class="mono">${V(n.u6b)}</td><td class="mono">${dbu(s.u6b.rms).toFixed(1)} dBu</td></tr>
      <tr><td>TB10 LINE diff</td><td class="mono">${V(n.lineDiff)}</td><td class="mono">${dbu(s.lineDiff.rms).toFixed(1)} dBu</td></tr>
      <tr><td>TB11 MONITOR diff</td><td class="mono">${V(n.monDiff)}</td><td class="mono">${dbu(s.monDiff.rms).toFixed(1)} dBu</td></tr>
      <tr><td>LM4766 A / B</td><td class="mono">${V(n.ampL)} / ${V(n.ampR)}</td><td class="mono">${s.ampL.rms.toFixed(2)} V rms</td></tr></table>`;
    const {c,w}=SIM.canvas(m.querySelector('#sc'),200); const t0=Math.max(0,Math.min(SIM.duration-0.005,SIM.t-0.0025)), H=200;
    const sigs=[['mix',SIM.css('--accent')],['lineDiff',SIM.css('--warn')],['monDiff',SIM.css('--accent2')],['ampL',SIM.css('--bad')]];
    c.strokeStyle=SIM.css('--grid'); for (let k=0;k<=10;k++){ c.beginPath(); c.moveTo(k*w/10,0); c.lineTo(k*w/10,H); c.stroke(); } c.beginPath(); c.moveTo(0,H/2); c.lineTo(w,H/2); c.stroke();
    const sc=Math.max(1, ...sigs.map(([k])=>s[k].pk))*1.1;
    sigs.forEach(([k,col])=>{ c.strokeStyle=col; c.lineWidth=1.3; c.beginPath(); for (let p=0;p<=600;p++){ const tt=t0+0.005*p/600, v=nodes(Math.max(0,tt))[k]; const x=p/600*w, y=H/2-v/sc*(H/2-4); p?c.lineTo(x,y):c.moveTo(x,y); } c.stroke(); });
    c.fillStyle=SIM.css('--ink2'); c.font='11px '+SIM.css('--mono'); c.fillText(`±${sc.toFixed(1)} V full scale · 0.5 ms/div · green MIX, amber LINE, blue MONITOR, red LM4766 A`,6,14);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:190}); });
}

/* Block diagram (clickable) + real board + assembly */
const BLOCKS=[
  {id:'in',x:20,y:40,w:120,h:250,t:'9 × balanced in',d:'TB1…TB9 · Phoenix 3.81',info:()=>`Rear terminals; pin 1 +, pin 2 −, pin 3 G. Designators are not in channel order: inputs 1–9 = ${CH.map(c=>c.tb).join(', ')}.`},
  {id:'dif',x:170,y:40,w:130,h:250,t:'9 × diff amp',d:'U1–U5 NE5532 · gain 1',info:()=>'Each input: NE5532 half, 10K/10K/10K/10K difference amplifier (unity), 22p (ISS2) / 27p (ISS3) across the feedback and shunt. U5A is spare: output tied to −in, +in grounded.'},
  {id:'pot',x:330,y:40,w:130,h:250,t:'9 level pots',d:'RV1–RV9 TOCOS 10K log',info:()=>'Level-control PCB (SA-AMX9A-2) on two 16-way ribbons: P1/H1 (inputs 1–6 + LED), P2/H2 (7–9 + MASTER). Wiper back to the main board.'},
  {id:'mix',x:480,y:120,w:150,h:90,t:'Mix amp U6A',d:()=>`R40…R57 10K → R45 ${ISSX().R45/1e3}K`,info:()=>`Virtual-earth summing amplifier. Gain per input at full knob = ${ISSX().R45/1e3}K/10K = ${(20*Math.log10(ISSX().R45/1e4)).toFixed(1)} dB. Net MASTER.`},
  {id:'line',x:660,y:40,w:150,h:80,t:'LINE pot + U7',d:'P6 pot · U7A/U7B · R41/R44',info:()=>'LINE pot on a flying lead to P6 (BOM: top-level dual 10K log pot + black knob). U7A follows the wiper, U7B inverts it; two 30R build-outs give 60 Ω balanced at TB10.'},
  {id:'mon',x:660,y:170,w:150,h:80,t:'MONITOR pot + U6B, U8',d:'RV10 · R59/R58 · R52/R55',info:()=>`RV10 sits on the pot board (black cap). U6B inverts (gain ${ISSX().R58/1e3}K/10K), U8A/U8B make the balanced TB11 MONITOR output and the P3 feed to the amplifier.`},
  {id:'tb10',x:850,y:40,w:110,h:80,t:'LINE OUTPUT',d:'TB10 · 60 Ω bal.',info:()=>'Rear terminal "LINE".'},
  {id:'tb11',x:850,y:150,w:110,h:60,t:'MONITOR OUT',d:'TB11 · 60 Ω bal.',info:()=>'Rear terminal "MONITOR".'},
  {id:'amp',x:850,y:230,w:110,h:80,t:'Amp board',d:'U101 + LM4766',info:()=>'SA-AMX9A-3: U101 (NE5532) balanced receivers, gain 5K1/20K = −11.9 dB, into an LM4766 (gain 1 + 20K/5K1 = +13.8 dB). H3 jumpers feed the one mono signal to both halves; P107 jumper releases mute.'},
  {id:'jack',x:990,y:230,w:110,h:80,t:'Headset jack',d:'N114B T/R/S',info:()=>'Tip and ring straight from the amplifier outputs; the normals pass the signal on to the speakers until a plug is inserted.'},
  {id:'spk',x:1130,y:200,w:110,h:110,t:'2 × speakers',d:'EN5F 5″ + B1S 1″',info:()=>'Per side: woofer full-range on P103/P104 pin 2, tweeter via C63/C61 2.2 µF non-polar on pin 1.'},
  {id:'psu',x:490,y:250,w:130,h:60,t:'PSU',d:'LAM SCD601515 60 W',info:()=>`Switching supply, 90–230 VAC per the manual. ±15 V ${inf('from the part number')} to P4/P5 (+VA/−VA) and P108 (VCC/VEE).`},
];
let BSEL='mix';
function blockSVG(){
  const ar=(x1,y1,x2,y2)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" stroke-width="1.5" marker-end="url(#amxA)"/>`;
  return `<svg viewBox="0 0 1260 330" style="width:100%"><defs><marker id="amxA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
   ${ar(140,165,168,165)}${ar(300,165,328,165)}${ar(460,165,488,165)}${ar(620,150,658,80)}${ar(620,170,658,210)}${ar(810,80,848,80)}${ar(810,200,848,180)}${ar(810,230,848,260)}${ar(960,270,988,270)}${ar(1100,270,1128,255)}
   ${BLOCKS.map(b=>`<g class="amxb" data-b="${b.id}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${BSEL===b.id?'color-mix(in srgb,var(--accent) 22%,var(--panel2))':'var(--panel2)'}" stroke="${BSEL===b.id?'var(--accent)':'var(--line)'}" stroke-width="${BSEL===b.id?2:1}"/>
     <text x="${b.x+8}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text><text x="${b.x+8}" y="${b.y+38}" font-size="10.5" fill="var(--ink2)">${typeof b.d==='function'?b.d():b.d}</text></g>`).join('')}
   <text x="20" y="320" font-size="11" fill="var(--ink2)">After the manual's functional page (AMX9A ISS2 - Functional - June 16 2010.cdr), with the part numbers from AMX9A-ISS3.net and the 2016 BOM. Click a block.</text></svg>`;
}
const PCB_PARTS=[ // ISS3 pad positions (mils) from the .pcb's embedded DRC text; image px = (x/1000 − 4.94)·110, (20.75 − y/1000)·110
  ...Object.entries(PCB_TB_X).map(([k,x])=>({id:k,x:x+110,y:19660,t:k==='TB10'?'TB10 LINE OUT':k==='TB11'?'TB11 MONITOR OUT':`${k} = input ${CH.findIndex(c=>c.tb===k)+1}`})),
  ...[...Array(10)].map((_,i)=>({id:'RV'+(i+1),x:i<9?5490+800*i:12765,y:16685,t:i<9?`RV${i+1} input ${i+1} level`:'RV10 MONITOR'})),
  {id:'LED1',x:5095,y:16510,t:'LED1 power'},{id:'P1',x:7240,y:18115,t:'P1 ribbon (inputs 1–6)'},{id:'P2',x:8500,y:18115,t:'P2 ribbon (7–9, MASTER)'},
  {id:'P6',x:10035,y:18835,t:'P6 LINE pot'},{id:'P3',x:9920,y:17950,t:'P3 → amp board'},{id:'P5',x:10455,y:17950,t:'P5 power'},{id:'P4',x:11325,y:18190,t:'P4 power'},
];
function pcbSVG(){
  return `<svg viewBox="0 0 1020 568" style="width:100%;display:block;border-radius:6px"><image href="${ASSET}amx9a-pcb-iss3.png" width="1020" height="568"/>
   ${PCB_PARTS.map(p=>{ const x=(p.x/1000-4.94)*110, y=(20.75-p.y/1000)*110; return `<g><circle cx="${x}" cy="${y}" r="9" fill="rgba(255,210,80,.25)" stroke="#ffd250" stroke-width="1.5"><title>${p.t}</title></circle></g>`; }).join('')}
   <rect x="0" y="544" width="560" height="24" fill="rgba(0,0,0,.6)"/><text x="10" y="561" font-size="12" fill="#fff">Three boards on one panel: main (top left), amplifier (top right), level control (bottom). Hover the rings.</text></svg>`;
}
function viewBlock(m){
  m.innerHTML=card('Block diagram (click a block)', `<div id="bd"></div><div id="bi" class="small" style="margin-top:6px"></div>`)
   + card('The real board: AMX9A ISS3 Gerbers (top copper, bottom copper, top silk), rendered from GERBERS/AMX9A-ISS3.*', pcbSVG()+`<p class="small muted">Rendered by this plugin's build from the RS-274-D files, 110 px per inch. Ring positions are the pad coordinates printed in the DRC text inside <span class="mono">WORKING/AMX9A-iss3.pcb</span>. TB1…TB11 run along the rear edge in the order 1, 4, 7, 2, 5, 8, 3, 6, 9, 10, 11 — which is inputs 1 → 9, then LINE, MONITOR.</p>`)
   + card('Assembly and mechanics', `<table class="kv"><tr><th>Part</th><th>Source</th><th>Notes</th></tr>
     <tr><td>Front panel 17.100 × 1.648 in, .047 CRS, WBS black (Sherwin-Williams Polane T F63B12)</td><td class="mono">AMX9A-FRONT ISS 3</td><td>Drawn 16 07 09 (IZ / E.S.). ISS 2 07 06 2010: ".265 DIA. HOLE ADDED" (LINE pot). ISS 3 26 11 2015: "NEW STYLE SPEAKER GRILLS" (hex, 2 × ≈45 holes).</td></tr>
     <tr><td>Rear panel 17.100 × 1.648 in</td><td class="mono">AMX9A-REAR ISS 2</td><td>IEC inlet with fuse (723W-X2/02), ground stud (ISS 2: changed to FH440-5 insert), 14 vent slots, one 6.030 × .332 window for 11 right-angle Phoenix headers.</td></tr>
     <tr><td>Top / bottom pans</td><td class="mono">AMX9A-TOP ISS 2, -BOTTOM ISS 2</td><td>1RU, 19″ × 1¾″ × 10¾″, 10 lb (manual). Side panels are AMS4-SIDE "SELECT SERIES" parts.</td></tr>
     <tr><td>Speakers</td><td>BOM</td><td>2 × EN5F 5″ neodymium + 2 × Swan B1S 1″ on AMS8-M7 tweeter brackets, AMS8-M16 foam, AMS8-M8 shims, AMS8-M9 washers, AMS8-M12 heatsink support — borrowed from the AMS81.</td></tr>
     <tr><td>Wiring</td><td class="mono">#WIRING DIAGRAM/AMX9A-wiring diagram-iss2.dwg</td><td>2 × 16-way ribbons, Panduit .100/.156 harnesses (CE100F22-3/5, CE156F22-3/5/6), TR64 18 ga mains wiring.</td></tr></table>`);
  const draw=()=>{ m.querySelector('#bd').innerHTML=blockSVG(); const b=BLOCKS.find(x=>x.id===BSEL); m.querySelector('#bi').innerHTML=`<b>${b.t}</b> — ${b.info()}`;
    m.querySelectorAll('.amxb').forEach(g=>g.onclick=()=>{ BSEL=g.dataset.b; draw(); }); };
  draw();
}

/* Schematic set, redrawn from the netlists */
function opamp(x,y,name,pins,flip){ // triangle pointing right; pins [+, −, out]
  return `<g><path d="M${x} ${y-26} L${x} ${y+26} L${x+52} ${y} Z" fill="var(--panel)" stroke="var(--ink)"/>
   <text x="${x+5}" y="${y-10}" font-size="11" fill="var(--ink)">${flip?'−':'+'}</text><text x="${x+5}" y="${y+16}" font-size="11" fill="var(--ink)">${flip?'+':'−'}</text>
   <text x="${x+8}" y="${y-30}" font-size="10.5" fill="var(--accent2)">${name}</text>
   <text x="${x-14}" y="${y-14}" font-size="8.5" fill="var(--ink2)">${pins[flip?1:0]}</text><text x="${x-14}" y="${y+24}" font-size="8.5" fill="var(--ink2)">${pins[flip?0:1]}</text><text x="${x+52}" y="${y-5}" font-size="8.5" fill="var(--ink2)">${pins[2]}</text></g>`;
}
function resH(x,y,len,label,val){ const m=x+len/2; return `<path d="M${x} ${y} H${m-15} l2.5 -6 5 12 5 -12 5 12 5 -12 5 12 2.5 -6 H${x+len}" fill="none" stroke="var(--ink)"/><text x="${m-14}" y="${y-9}" font-size="9.5" fill="var(--ink)">${label} ${val}</text>`; }
function resV(x,y,len,label,val){ const m=y+len/2; return `<path d="M${x} ${y} V${m-15} l-6 2.5 12 5 -12 5 12 5 -12 5 12 5 -6 2.5 V${y+len}" fill="none" stroke="var(--ink)"/><text x="${x+9}" y="${m+3}" font-size="9.5" fill="var(--ink)">${label} ${val}</text>`; }
function capH(x,y,label,val){ return `<path d="M${x} ${y} H${x+12} M${x+12} ${y-8} V${y+8} M${x+17} ${y-8} V${y+8} M${x+17} ${y} H${x+29}" fill="none" stroke="var(--ink)"/><text x="${x}" y="${y-11}" font-size="9" fill="var(--ink2)">${label} ${val}</text>`; }
const gnd=(x,y)=>`<path d="M${x} ${y} v6 M${x-8} ${y+6} h16 M${x-5} ${y+10} h10 M${x-2} ${y+14} h4" stroke="var(--ink)" fill="none"/>`;
const net=(x,y,t,a)=>`<text x="${x}" y="${y}" font-size="10" fill="var(--warn)" ${a?`text-anchor="${a}"`:''} font-family="var(--mono)">${t}</text>`;
function sheetInput(i){
  const c=CH[i], cap=D.iss==='ISS3'?'27p':'22p', W=(d)=>`<path d="${d}" stroke="var(--ink)" fill="none"/>`, dot=(x,y)=>`<circle cx="${x}" cy="${y}" r="3" fill="var(--ink)"/>`;
  return `<svg viewBox="0 0 900 320" style="width:100%;background:var(--lane);border:1px solid var(--line);border-radius:8px">
   <text x="12" y="20" font-size="13" font-weight="700" fill="var(--ink)">Sheet 1 — input ${i+1} (one of nine identical channels)</text>
   ${net(14,154,c.tb+'-1 (+)')}${net(14,254,c.tb+'-2 (−)')}${net(14,300,c.tb+'-3 G → GNDD')}
   ${W('M90 150 H110')}${resH(110,150,70,c.rp,'10K')}${W('M180 150 H300 V187 H420')}${dot(260,150)}
   ${resV(260,150,60,c.sh,'10K ∥ '+c.shc+' '+cap)}${gnd(260,210)}
   ${W('M90 250 H110')}${resH(110,250,70,c.rn,'10K')}${W('M180 250 H380 V213 H420')}${dot(380,250)}
   ${opamp(420,200,c.u,[c.pin[0],c.pin[1],c.pin[2]])}
   ${W('M380 250 V280 H400')}${resH(400,280,70,c.fb,'10K')}${W('M470 280 H530 V200')}
   ${W('M380 280 V310 H415')}${capH(415,310,c.fbc,cap)}${W('M444 310 H530 V280')}${dot(380,280)}${dot(530,280)}
   ${W('M472 200 H560 V140 H640 V150')}${dot(530,200)}${net(565,132,'IN'+(i+1))}
   <rect x="630" y="150" width="20" height="100" fill="none" stroke="var(--ink)"/>${W('M640 250 V262')}${gnd(640,262)}
   <text x="600" y="120" font-size="10.5" fill="var(--accent2)">RV${i+1} 10K log (pin 4 top, 5 wiper, 6 GND)</text>
   <text x="470" y="175" font-size="9.5" fill="var(--ink2)">${c.inP} → ribbon → H${i<6?1:2}-${c.inP.split('-')[1]} IN_${i+1}</text>
   ${W('M720 200 H654 M654 200 l8 -5 M654 200 l8 5')}${net(662,192,'WIPER_'+(i+1))}<text x="662" y="222" font-size="9.5" fill="var(--ink2)">H${i<6?1:2}-${c.wP.split('-')[1]} → ${c.wP} WIPER${i+1}</text>
   ${W('M720 200 H740')}${resH(740,200,70,c.rmix,'10K')}${W('M810 200 H830')}${net(832,204,'U6-2')}${net(832,218,'NET00063')}
   <text x="12" y="45" font-size="10.5" fill="var(--bad)">Redrawn from AMX9A-${D.iss}.net (P-CAD 2002), not the original CAD sheet.</text></svg>`;
}
function sheetMix(){
  const X=ISSX(), W=(d)=>`<path d="${d}" stroke="var(--ink)" fill="none"/>`, dot=(x,y)=>`<circle cx="${x}" cy="${y}" r="3" fill="var(--ink)"/>`;
  const l1 = X.lineOri>0? ['TB10-2 (−)','TB10-1 (+)'] : ['TB10-1 (+)','TB10-2 (−)'];
  const m1 = X.monOri>0? ['TB11-1 (+)','TB11-2 (−)'] : ['TB11-2 (−)','TB11-1 (+)'];
  return `<svg viewBox="0 0 900 420" style="width:100%;background:var(--lane);border:1px solid var(--line);border-radius:8px">
   <text x="12" y="20" font-size="13" font-weight="700" fill="var(--ink)">Sheet 2 — mix bus, MONITOR and LINE outputs (${X.label})</text>
   ${net(14,102,'R40…R57 (NET00063)')}${W('M20 110 H140')}${dot(120,110)}
   ${opamp(140,122,'U6A mix',[3,2,1],true)}${W('M140 135 H128 V142')}${gnd(128,142)}
   ${W('M120 110 V60 H150')}${resH(150,60,80,'R45',(X.R45/1e3)+'K')}${W('M230 60 H250 V122')}${W('M192 122 H300')}${dot(250,122)}${net(256,116,'MASTER')}
   ${W('M300 122 V60 H330')}${net(334,64,X.linePot?'→ P6-1 LINE pot, wiper P6-2 →':'→ H3-1 / H3-2 link (ISS1) →')}
   ${resH(480,80,70,'R43','10K')}${W('M550 80 H570 V49 H600')}
   ${opamp(600,62,'U7A',[3,2,1])}${W('M600 75 H590 V95 H670 V62')}${W('M652 62 H700')}${dot(670,62)}
   ${W('M700 62 V40 H720')}${resH(720,40,60,'R44','30R')}${W('M780 40 H800')}${net(804,44,l1[0])}
   ${W('M700 62 V119 H715')}${dot(700,62)}${resH(715,119,60,'R38','10K')}${W('M775 119 H790')}
   ${opamp(790,132,'U7B',[5,6,7],true)}${W('M790 145 H780 V152')}${gnd(780,152)}
   ${W('M842 132 H870 V180')}<text x="700" y="196" font-size="9.5" fill="var(--ink2)">R39 10K feedback · out → R41 30R →</text>${net(800,212,l1[1])}
   ${W('M300 122 V250 H320')}${net(324,254,'→ P2-1 MASTER → RV10 (pot board) → P2-2 MASTER_WIPER')}
   ${net(260,294,'MASTER_WIPER')}${W('M340 302 H350')}${resH(350,302,70,'R59','10K')}${W('M420 302 H450 V289 H470')}${dot(450,289)}
   ${opamp(470,302,'U6B',[5,6,7],true)}${W('M470 315 H460 V322')}${gnd(460,322)}
   ${W('M450 289 V350 H470')}${resH(470,350,70,'R58',(X.R58/1e3)+'K')}${W('M540 350 H560 V302')}${W('M522 302 H580')}${dot(560,302)}
   ${resH(580,302,60,'R54','10K')}${W('M640 302 H650 V289 H670')}
   ${opamp(670,302,'U8A',[3,2,1])}${W('M670 315 H660 V335 H735 V302')}${W('M722 302 H750')}${dot(735,302)}
   ${W('M750 302 V270 H760')}${resH(760,270,60,'R52','30R')}${W('M820 270 H830')}${net(834,274,m1[0])}
   ${W('M750 302 V360 H760')}${dot(750,302)}<text x="700" y="380" font-size="9.5" fill="var(--ink2)">R48 → U8B (R50 fb) → R55 30R →</text>${net(834,364,m1[1])}
   ${net(560,402,'P3-1 = U8A, P3-2 = U8B, P3-3 GNDD → amplifier P106')}
   <text x="12" y="402" font-size="10" fill="var(--bad)">Redrawn from the P-CAD netlist. C29–C40 (22p/27p) omitted.</text></svg>`;
}
function sheetAmp(){
  return `<svg viewBox="0 0 900 300" style="width:100%;background:var(--lane);border:1px solid var(--line);border-radius:8px">
   <text x="12" y="20" font-size="13" font-weight="700" fill="var(--ink)">Sheet 3 — amplifier board SA-AMX9A-3 (one of two identical halves shown: A)</text>
   ${net(14,74,'P106-1 / H3-1')}${net(14,154,'P106-2 / H3-3')}
   ${resH(110,70,70,'R66','20K')}${resH(110,150,70,'R64','20K')}<path d="M180 70 H220 V96 H240 M180 150 H220 V122 H240" stroke="var(--ink)" fill="none"/>
   ${resV(205,70,50,'R67','5K1')}${gnd(205,120)}${opamp(240,109,'U101A',[3,2,1])}
   <path d="M225 150 V200 H250" stroke="var(--ink)" fill="none"/>${resH(250,200,60,'R63','5K1')}<path d="M310 200 H330 V109 H292" stroke="var(--ink)" fill="none"/>
   <path d="M330 109 H360" stroke="var(--ink)" fill="none"/>${resH(360,109,60,'R65','1K')}<path d="M420 109 H440 V96 H470" stroke="var(--ink)" fill="none"/>
   <path d="M470 70 L470 150 L560 110 Z" fill="var(--panel)" stroke="var(--ink)" stroke-width="2"/><text x="478" y="105" font-size="11" fill="var(--accent2)">U102 LM4766</text><text x="478" y="120" font-size="9" fill="var(--ink2)">pin 8 +, 7 −, out 3</text>
   <path d="M560 110 H700" stroke="var(--ink)" stroke-width="1.5" fill="none"/>${net(705,114,'P101-1 tip · P102-1 · P105-1')}
   <path d="M600 110 V200 H560" stroke="var(--ink)" fill="none"/>${resH(490,200,70,'R69','20K')}<path d="M490 200 H460 V124 H470" stroke="var(--ink)" fill="none"/>${resV(460,200,50,'R68','5K1')}
   <path d="M460 250 V258" stroke="var(--ink)" fill="none"/><text x="470" y="262" font-size="9" fill="var(--ink2)">C72 68µ/10 to GND (DC gain 1)</text>
   <path d="M640 110 V150" stroke="var(--ink)" fill="none"/>${resV(640,150,40,'R61','30R')}<text x="650" y="205" font-size="9" fill="var(--ink2)">+ C62 6800p to GND</text>
   ${net(705,170,'jack normal → P101-3 → P103-2 woofer')}${net(705,190,'→ C63 2.2µ NP → P103-1 tweeter')}
   ${net(470,40,'pins 6/11 MUTE → R77 3K3 → P107-1; P107-2 = VEE')}
   <text x="12" y="290" font-size="10.5" fill="var(--bad)">Redrawn from AMX9A-ISS3.net. Half B: R75/R71/R76/R70/R72 → U102 pin 13/12, out pin 1, R74/R73/C79, R62/C65, C61 → P104.</text></svg>`;
}
const RIBBON=[[1,'WIPER6','WIPER_6',1,'MASTER','MASTER_H'],[2,'WIPER5','WIPER_5',2,'MASTER_WIPER','MASTER_WIPER_H'],[3,'WIPER4','WIPER_4',3,'—','—'],[4,'WIPER3','WIPER_3',4,'WIPER9','WIPER_9'],[5,'WIPER2','WIPER_2',5,'WIPER8','WIPER_8'],[6,'WIPER1','WIPER_1',6,'WIPER7','WIPER_7'],[7,'GNDD','GNDD',7,'GNDD','GNDD'],[8,'GNDD','GNDD',8,'GNDD','GNDD'],[9,'R10 (LED +)','LED1-1',9,'GNDD','GNDD'],[10,'R10 (LED +)','LED1-1',10,'GNDD','GNDD'],[11,'IN6','IN_6',11,'IN9','IN_9'],[12,'IN5','IN_5',12,'IN8','IN_8'],[13,'IN4','IN_4',13,'IN7','IN_7'],[14,'IN3','IN_3',14,'—','—'],[15,'IN2','IN_2',15,'—','—'],[16,'IN1','IN_1',16,'—','—']];
function viewSchem(m){
  m.innerHTML=`<div class="card"><h2>Schematic set — redrawn from the P-CAD netlists, not the original CAD</h2><p class="small">Sources: <span class="mono">AMX9A-ISS2.net</span>, <span class="mono">WORKING/AMX9A-ISS3.net</span>, <span class="mono">OBSOLETE/AMX9A-ISS1.net</span> (187–188 parts, 127 nets), ECO logs and the 2016 BOM. Issue: <select id="sIss">${Object.keys(ISS).map(k=>`<option ${k===D.iss?'selected':''}>${k}</option>`).join('')}</select> · input channel <select id="sCh">${CH.map((_,i)=>`<option value="${i}" ${i===D.sel?'selected':''}>${i+1}</option>`).join('')}</select></p></div>
   ${card('Sheet 1 — input channel', `<div id="s1"></div><table class="kv small" style="margin-top:8px"><tr><th>Input</th><th>Terminal</th><th>Op-amp</th><th>+ / − / shunt / fb</th><th>Mix R</th><th>Ribbon IN / WIPER</th></tr>${CH.map((c,i)=>`<tr><td>${i+1}</td><td class="mono">${c.tb}</td><td class="mono">${c.u} (${c.pin.join(',')})</td><td class="mono">${c.rp} / ${c.rn} / ${c.sh} / ${c.fb}</td><td class="mono">${c.rmix}</td><td class="mono">${c.inP} / ${c.wP}</td></tr>`).join('')}</table>`)}
   ${card('Sheet 2 — mix, MONITOR and LINE', `<div id="s2"></div>`)}
   ${card('Sheet 3 — amplifier board', sheetAmp())}
   ${card('Sheet 4 — interconnect: main board P1/P2 ↔ level board H1/H2 (16-way ribbons)', `<table class="kv small"><tr><th>pin</th><th>P1 net (main)</th><th>H1 net (pots)</th><th>pin</th><th>P2 net (main)</th><th>H2 net (pots)</th></tr>${RIBBON.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td>${r[3]}</td><td class="mono">${r[4]}</td><td class="mono">${r[5]}</td></tr>`).join('')}</table>
     <p class="small">Power: P4 (PAN556) 1 −VA, 2–3 +VA, 4–5 GNDD · P5 (PAN356) +VA, −VA, GNDD · P108 (amp) VCC, VEE, GND · C41/C42 22µ/35 rail bulk on the main board, C66/C68 470µ/50 on the amp board. P6 LINE pot: MASTER, wiper, GNDD.</p>`)}`;
  const draw=()=>{ m.querySelector('#s1').innerHTML=sheetInput(D.sel); m.querySelector('#s2').innerHTML=sheetMix(); };
  m.querySelector('#sIss').onchange=e=>{ D.iss=e.target.value; bump(); draw(); };
  m.querySelector('#sCh').onchange=e=>{ D.sel=+e.target.value; bump(); draw(); };
  draw();
}

/* "Software": the signal path stage by stage (no code in this product) */
function stageRows(){
  const s=stats(), X=ISSX(), i=D.sel, c=CH[i], a=taper(D.in[i].pot);
  const r=(name,parts,gain,k,clipLim,note)=>({name,parts,gain,lv:s[k]?dbu(s[k].rms):-150,pk:s[k]?dbu(s[k].pk/Math.SQRT2):-150,clipLim,note});
  return [
    r(`Input ${i+1} at ${c.tb}`, `${c.tb} pins 1/2/3`, '—', 'in'+i, 22, 'manual: +22 dBu max, >20 kΩ balanced'),
    r(`Diff amp ${c.u}`, `${c.rp}, ${c.rn}, ${c.sh}, ${c.fb} 10K`, D.in[i].mic? `+${D.in[i].micG} dB (RD78 what-if)` : '0 dB', 'u'+i, CLIP_DBU, 'NE5532, ±13 V swing'),
    r(`Level RV${i+1} → ${c.rmix} → U6A`, `RV${i+1} 10K log, ${c.rmix} 10K, R45 ${X.R45/1e3}K`, isFinite(chGainDb(i)-20*Math.log10(micGain(D.in[i])))? fmtDb(chGainDb(i)-20*Math.log10(micGain(D.in[i])))+' dB' : 'OFF', 'mix', CLIP_DBU, `wiper ${(a*100).toFixed(1)} %; sum of all nine inputs`),
    r('MONITOR RV10 → R59 → U6B', `RV10, R59 10K, R58 ${X.R58/1e3}K`, (()=>{ const am=taper(D.mon); return am<=0?'OFF':fmtDb(20*Math.log10(X.R58*potLoad(am)))+' dB'; })(), 'u6b', CLIP_DBU, 'inverting'),
    r('U8A / U8B → TB11', 'R54, R48, R50, R52/R55 30R', '+6.0 dB (balanced)', 'monDiff', CLIP_DBU+6, X.monOri>0?'pin 1 in polarity':'pin 1 inverted'),
    r(X.linePot? 'LINE pot (P6) → U7A/U7B' : 'H3 link → U7A/U7B', 'R43, R38, R39', X.linePot? (taper(D.line)<=0?'OFF':fmtDb(20*Math.log10(taper(D.line)))+' dB') : '0 dB', 'u7a', CLIP_DBU, 'high-impedance wiper load (R43 into U7 pin 3)'),
    r('→ TB10 LINE OUTPUT', 'R41/R44 30R', '+6.0 dB (balanced)', 'lineDiff', CLIP_DBU+6, X.lineOri>0?'pin 1 in polarity':'pin 1 inverted'),
    r('Amp: U101 receiver + LM4766', 'R63/R64, R65, R68/R69, U102', fmtDb(20*Math.log10(RECV*2*LMG))+' dB from U8A', 'ampL', dbu(LMSAT/Math.SQRT2), D.muteJ? `${(LMSAT*LMSAT/2/SPK_Z).toFixed(1)} W max into 8 Ω` : 'muted'),
  ];
}
function viewSoft(m){
  m.innerHTML=`<div class="card"><h2>Signal path, stage by stage (the AMX9A has no code: these are its "functions")</h2><div style="display:flex;gap:14px;flex-wrap:wrap">${viewSel()}</div><div id="st"></div></div>
   <div class="grid2">${card('Level diagram (dBu rms per stage; red = clip point)', `<canvas id="lv"></canvas>`)}${card('Copper path of the selected input', `<div id="cp" class="log"></div>`)}</div>
   ${card('Panel', panelsHTML()+issControls())}`;
  bindViewSel(m); bindIss(m); PANV=-1;
  SIM.on('time',()=>{ drawPanels(m); const rows=stageRows(), s=stats();
    m.querySelector('#st').innerHTML=`<table class="kv"><tr><th>#</th><th>Stage</th><th>Parts</th><th>Gain</th><th>Level</th><th>Peak (as rms)</th><th>Clip at</th><th>Headroom</th><th>Note</th></tr>${rows.map((r,k)=>{ const hr=r.clipLim-r.pk; return `<tr><td>${k+1}</td><td>${r.name}</td><td class="mono small">${r.parts}</td><td class="mono">${r.gain}</td><td class="mono">${r.lv.toFixed(1)}</td><td class="mono">${r.pk.toFixed(1)}</td><td class="mono">${r.clipLim.toFixed(1)}</td><td class="mono" style="${hr<0.05?'color:var(--bad);font-weight:700':hr<6?'color:var(--warn)':''}">${r.lv<-140?'—':hr<0.05?'CLIPPING':hr.toFixed(1)+' dB'}</td><td class="small">${r.note}</td></tr>`; }).join('')}</table>
     <p class="small muted">Noise floor per the manual: "better than 85 dBu @ unity gain" (read as −85 dBu). S/N at the line output now ≈ ${(dbu(s.lineDiff.rms)+85).toFixed(0)} dB. Clip points assume ±15 V rails ${inf('LAM SCD601515')}. Levels are the rms over the whole simulated second.</p>`;
    const {c,w}=SIM.canvas(m.querySelector('#lv'),230); const Y=d=>20+(30-d)/80*190, xs=k=>50+k*(w-80)/(rows.length-1);
    c.strokeStyle=SIM.css('--grid'); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif';
    for (let d=30;d>=-50;d-=10){ c.beginPath(); c.moveTo(45,Y(d)); c.lineTo(w-10,Y(d)); c.stroke(); c.fillText((d>0?'+':'')+d,8,Y(d)+3); }
    c.strokeStyle=SIM.css('--bad'); c.setLineDash([4,3]); c.beginPath(); rows.forEach((r,k)=>{ k?c.lineTo(xs(k),Y(r.clipLim)):c.moveTo(xs(k),Y(r.clipLim)); }); c.stroke(); c.setLineDash([]);
    c.strokeStyle=SIM.css('--accent'); c.lineWidth=2; c.beginPath(); rows.forEach((r,k)=>{ const v=Math.max(-50,r.lv); k?c.lineTo(xs(k),Y(v)):c.moveTo(xs(k),Y(v)); }); c.stroke(); c.lineWidth=1;
    rows.forEach((r,k)=>{ c.fillStyle=r.pk>=r.clipLim-0.05?SIM.css('--bad'):SIM.css('--accent'); c.beginPath(); c.arc(xs(k),Y(Math.max(-50,r.lv)),4,0,7); c.fill(); c.fillStyle=SIM.css('--ink2'); c.fillText(String(k+1),xs(k)-3,224); });
    const i=D.sel, ch=CH[i];
    m.querySelector('#cp').innerHTML=[`${ch.tb}-1/-2 → ${ch.rp}/${ch.rn} → ${ch.u} (pins ${ch.pin.join(', ')})`,`${ch.u} out = net IN${i+1} → ${ch.inP} → 16-way ribbon → H${i<6?1:2} IN_${i+1} → RV${i+1} pin 4`,`RV${i+1} pin 5 WIPER_${i+1} → ribbon → ${ch.wP} WIPER${i+1} → ${ch.rmix} → U6-2 NET00063`,`U6-1 MASTER (R45 ${ISSX().R45/1e3}K feedback) → P2-1 → RV10 top, and → ${ISSX().linePot?'P6-1 LINE pot':'H3-1 link'}`,`RV10 wiper → P2-2 MASTER_WIPER → R59 → U6B → R54 → U8A/U8B → R52/R55 → TB11, P3`,`P3 → harness → amp P106 → U101 → LM4766 → P101 jack → normals → P103/P104 speakers`].map(x=>`<div>${x}</div>`).join('');
  });
}

/* Findings */
function viewFindings(m){
  m.innerHTML=card('What the AMX9A files show', `<ol>
   <li><b>Both outputs were wired backwards on ISS2, and ISS3 fixed them.</b> The only netlist change from <span class="mono">AMX9A-ISS2.net</span> to <span class="mono">WORKING/AMX9A-ISS3.net</span> is pins 1 and 2 of TB10 and TB11 swapping (ECO log of 24 Jun 2010, NET00044/54/55/70). Following the signal through the inverting mix amp (U6A) and U6B shows that on ISS2 pin 1 ("+") of both LINE and MONITOR carries the inverted mix. ISS1 had LINE right but MONITOR inverted. ISS2 then swapped the U8 outputs and TB10, which fixed MONITOR on P3 but broke LINE. Try it with the Board issue selector.</li>
   <li><b>The mix gain changed three times.</b> The 2009 BOM (<span class="mono">AMX9-iss2.bom</span>, 17 Jun 2009) and the ISS1 netlist have R45 = R58 = 20K. The ISS2 netlist has R45 = 36K2, R58 = 10K. The ISS2 ECO sets R45 to 39K2 at 11:36 on 8 Jun 2010, but the ISS2 <span class="mono">.net</span> in the folder was exported at 08:45 that morning and was never regenerated, so it still says 36K2. ISS3 and the 2016 BOM have 39K2. At full knob, 39K2/10K = +11.9 dB, plus 6 dB from the balanced output stage = +17.9 dB. That matches the June 2010 manual's "Input Gain OFF to +17dB". The 2009 manual says "OFF to +9 dB" and "Master Gain OFF to +9 dB", which neither the ISS1 values (+6 dB mix, +6 dB master) nor any later issue gives exactly.</li>
   <li><b>The LINE knob arrived in June 2010.</b> ISS1 has no P6. Instead, a 1×3 header H3 sits between MASTER, the line buffer input (R43) and the post-MONITOR amp (U6-7), so a link chose a fixed or a MONITOR-following line output ${inf('purpose of the link')}. The front drawing's ISS 2 (07 06 2010) is ".265 DIA. HOLE ADDED". The ISS2 schematic adds P6, and the BOM lists one extra TOCOS pot with a black knob at top level, wired on a flying lead. The 2009 manual (<span class="mono">AMX9A Manual.pdf</span>) lists only "a master level control"; the 2010 manual adds "a separate line output control". The two photos show both builds: <span class="mono">AMX9A-FRONT.jpg</span> (MASTER only) and <span class="mono">AMX9A-FRONT-line output.jpg</span> (LINE + MONITOR).</li>
   <li><b>ISS1 drove the right speaker in anti-phase.</b> In ISS1 the amplifier inputs are linked by JUMP1 (P106-1 L+ ↔ P106-4 R−) and JUMP2 (P106-2 L− ↔ P106-3 R+), so the right half gets the inverted mono signal. The ISS2 ECO deletes JUMP1/JUMP2 and puts the four nets on a 1×4 header H3 in the order L+, R+, L−, R−. Jumpers on 1–2 and 3–4 (the BOM lists three 2-pin jumpers: two here, one on P107) then give in-phase L and R ${inf('jumper placement')}.</li>
   <li><b>Rear numbering runs 9 → 1.</b> The pads in <span class="mono">AMX9A-iss3.pcb</span> place TB1, TB4, TB7, TB2, TB5, TB8, TB3, TB6, TB9, TB10, TB11 left to right on the component side. These are inputs 1–9, then LINE and MONITOR. Seen from behind, that becomes MONITOR, LINE, 9 … 1, which is what the 2015 silk, the older <span class="mono">#SILK/OBSOLETE</span> labels ("OUTPUTS 2 1 INPUTS 9 … 1") and <span class="mono">AMX9A Rear Logo for CTV.cdr</span> (a sheet of 18 stick-on "MON LINE 9 … 1" strips for CTV) all print. But <span class="mono">#Photos/AMX9A-REAR.jpg</span> (2009) shows "INPUTS 1 … 9, OUTPUT 1 2" left to right. The early units were labelled in the opposite order to the copper, and CTV units got relabelling strips ${inf('purpose of the CTV strips')}.</li>
   <li><b>The designators are scrambled.</b> TB1/TB4/TB7 feed inputs 1/2/3, so a service tech reading "TB2" on the board is looking at input 4. On the ribbon, P1/P2 carry IN1, WIPER1 and MASTER, while the pot board names the same wires IN_1, WIPER_1 and MASTER_H. They are separate nets joined only by the cable, and the DRC text in the .pcb reports GNDD in partitions.</li>
   <li><b>No series resistor on the headset.</b> The jack's tip and ring come straight off the LM4766 outputs (P101-1/2). With the MONITOR knob high, a headset gets the same several volts rms that drive the 5″ woofers.</li>
   <li><b>The tweeter crossover is one capacitor.</b> C61/C63 (2.2 µF 100 V non-polar) sit between the normalled speaker feed and the 1″ Swan B1S tweeters. Into 8 Ω that is a first-order 9 kHz high-pass, and the 5″ EN5F runs full-range ${inf('8 Ω')}.</li>
   <li><b>Mute became a jumper.</b> The ISS2 ECO deletes JP1 (a hard VEE–MUTE link) and adds P107 (MUTE, VEE, GND). Without its jumper the LM4766 stays muted ${inf('LM4766 mute behaviour')}. This may have been meant for an external cough/talkback mute.</li>
   <li><b>The 'Imported AMX9-ISS2' Altium project is the old AMX9, not the AMX9A.</b> <span class="mono">#PCB/WORKING/ALTIUM/…AMX9-iss2.PCBDOC</span> (saved 03/06/2010) has XLR3F, TDA power amps, a toroid, 2200 µF caps, 1N4003 diodes and a 110/220 selector: the linear-supply AMX9 of the 2002 manual ("HOT MIC MIXING SYSTEM", RJ11-6 USOC inputs, S/N 70 dB, 115/230 V switch).</li>
   <li><b>Spec drift in the manuals.</b> "Noise better than 85 dBu" is missing its minus sign in both AMX9A editions. Input level is "+24dBu max" in 2009 and "+22dBu max" in 2010 (a unity input stage on ±15 V clips near +21.5 dBu). Mains is "90-230 VAC" in the manuals and the 2009 photo, but the 2015 rear silk says "100-240 VAC". The rear label text from the photo ("WARD-BECK SYSTEMS LTD / MADE IN CANADA / AMX-9A / CE") is not in the 2015 silk at all.</li>
   <li><b>Borrowed parts.</b> The 2016 BOM pulls the speaker hardware from the AMS81 (AMS8-M7/M8/M9/M12/M16) and the side panels from the AMS4 (AMS4-SIDE "SELECT SERIES"). Its product line reads "9 Channel Hot Mic Mixer" / "8+1 Channel Mono Line Mixer".</li>
   <li><b>RD78 never got past a datasheet.</b> <span class="mono">AMX9 - Redesign #RD #RD78/</span> holds only <span class="mono">THAT_1510-1512_Datasheet.pdf</span> (2013|46). The same file also sits in RD88 (PREmo mic pre). A THAT1512 (gain 0.5 + 5 kΩ/RG, 1 nV/√Hz at 60 dB) would have turned the line inputs into mic inputs. The "RD78 what-if" switch models that ${inf('not built')}.</li>
   <li><b>Duplicates.</b> <span class="mono">XXX - AMX9A</span> and <span class="mono">XXX - AMX9A (1)</span> are byte-identical to <span class="mono">AMX9A - #Archive</span> (10 files each). Their <span class="mono">amx9.pdf</span> is the archive's <span class="mono">amx9 #MANUAL.pdf</span> under another name. The two #SILK/#ARTWORK JPEG previews are identical. The two <span class="mono">FRONT &amp; REAR(CURVE).cdr</span> files (#ARTWORK and #SILK) are not byte-identical. Rendered, they show the same artwork, but the #SILK copy adds the note "NEED NEW FILM / GREEN SILK WAS MOVED FOR NEW SPEAKER GRILL".</li></ol>`)
  + card('Assumptions in this simulation', `<ul class="small">
   <li>Rails ±15 V (LAM SCD601515), NE5532 swing ±13 V peak, LM4766 ±12.5 V peak ${inf()}.</li>
   <li>TOCOS "10K log" law modelled as (10^(2θ) − 1)/99, about 10 % at mid travel ${inf()}. Each wiper drives a 10K resistor into a virtual earth, so the pot's source resistance a(1−a)·10K is included.</li>
   <li>Speakers 8 Ω resistive. Tweeter level is not shown separately ${inf()}.</li>
   <li>Sources are ideal: tones, or "speech" (fixed partials under a ~4 Hz syllable envelope).</li>
   <li>Panels: front and rear outline, holes and slots from the ISS 3 / ISS 2 mechanical PDFs. Silk from the 2015 CURVE artwork, recoloured to the photo's green and white inks. Knobs, jack and Phoenix plugs are drawn after the photos and the BOM (Elma 10 mm knobs, 7 mm caps).</li></ul>`);
}

SIM.register({
  id:'amx9a', name:'AMX9A · 9-input analog mixing monitor (2009|42)', duration:1,
  product:'AMX9A', year:2009, family:'Obsolete products', folder:'#AMX #SERIES/XXX - AMX9A - #Master #OBSOLETE',
  summary:'A 1RU analog monitor that mixes nine balanced mono inputs, each with its own level knob, into balanced LINE and MONITOR outputs, a built-in LM4766 speaker amplifier and a headset jack that mutes the speakers. Modelled stage by stage from the P-CAD netlists of all three board issues.',
  highlights:['Real 2015 front and rear silk on to-scale panels','Every op-amp stage: level, clipping and headroom','ISS1 → ISS2 → ISS3: output polarity bugs and the fix','Rendered ISS3 Gerbers with real pad positions','RD78 THAT1512 mic-pre what-if'],
  depth:'Hardware model',
  stepUnits:[{label:'0.1 ms', period:()=>1e-4},{label:'1 ms', period:()=>1e-3},{label:'1 cycle of 1 kHz', period:()=>1e-3},{label:'10 ms', period:()=>0.01},{label:'1 syllable (~230 ms)', period:()=>0.23}],
  zooms:[[1,'1 s'],[0.25,'250 ms'],[0.05,'50 ms'],[0.01,'10 ms'],[0.003,'3 ms'],[0.001,'1 ms']], defaultZoom:4,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTut},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram & board',render:viewBlock},{id:'schematic',label:'Schematics (redrawn)',render:viewSchem},{id:'software',label:'Signal path',render:viewSoft},{id:'findings',label:'Findings',render:viewFindings}],
});
})();
