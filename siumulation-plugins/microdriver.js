/* =====================================================================
   microDriver (POD6 ISS4, R&D RD76) — stereo balanced-in line / headphone driver
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive):
   - microDriver - POD6 - #Master turned into microdriver/POD6 - #RD #RD76/SMT_Upgrade/
       backup12-final/POD6-ISS4/POD6-ISS4-S1.pdf   "MICRO DRIVER POD6-ISS4", 2/2/2016 (every R/C value below)
       backup12-final/POD6-ISS4/parts_pod6.xls       BOM (POD6 / BOM_MAIN / MASTER_BOM sheets: DNI parts, part numbers)
       backup12-final/POD6-ISS4/POD6-ISS4-Assembly.pdf + Pick Place for POD6-ISS4-PANEL.csv  (board drawing, part positions)
       ISS3/POD6.pdf                                  "POD6 STEREO AUDIO AMPLIFIER MODULE SCHEMATIC", OCT 24 1996 (ISS3 topology)
       pod6 rj-45 pinout.png                          RJ-45 / StudioHub pin-out
   - #POD #SERIES/POD PARTS - #Mechanical #DA #2016/
       SILKS/POD6-001/POD6-001-SILK CURVE).pdf        front (under-table bracket) silk  -> assets/microdriver-front-white.png
       SILKS/POD6-001& POD6-002 ISS.2(FINAL CURVE).cdr rear panel silk (converted to PDF) -> assets/microdriver-rear-white.png
       SILKS/POD6-001/POD6-001.jpg                    product photo -> assets/microdriver-photo.jpg
       PDF`S/POD6-001 ISS 5 (UNDER TABLE MTG. BRKT).pdf, PDF`S/POD6-002 ISS 2 (REAR PANEL).pdf  (dimensions, hole sizes)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const ASSET = 'siumulation-plugins/assets/';

/* ---------------- circuit constants (POD6-ISS4-S1.pdf, parts_pod6.xls) ---------------- */
const K = {
  VCC: 24,                    // VCC_24V on P2 pin 7
  R27: 100e3, R28: 100e3, C15: 22e-6, C22: 100e-9, C23: 100e-9,  // VCC_HALF divider and decoupling
  Rin: 100e3, Rf: 20e3, Rsh: 20e3, Cin: 47e-6, Cf1: 22e-12,      // receiver U1B: R6/R5 100K, R2/R7 20K, R3/R4 20K, C2/C3 47u, C1 22p
  Cout1: 47e-6,               // C4 47u -> LEFT (P1-1)
  R9: 10e3, R10: 82.5e3, C5: 47e-6, C6: 22e-12,                 // driver U1A
  R1: 3010, R29: 110, Re: 10, C7: 470e-6, R8: 100e3,            // output stage ISS4
  SWING: 2.0,                 // NE5532 output stays ≈2 V from each rail (datasheet, ±13 V on ±15 V)
  ILIM: 0.038,                // NE5532 short-circuit output current, typ 38 mA (datasheet)
  POT: 10e3,                  // volume pot value — INFERRED (no pot on the PCB; see Findings)
  SR: 96000,                  // simulation sample rate for the precomputed second
};
K.TAU_HALF = (K.R27*K.R28/(K.R27+K.R28)) * (K.C15 + K.C22 + K.C23);   // 50 k × 22.2 µF = 1.11 s
const G1 = K.Rf / K.Rin;      // 0.2  (−13.98 dB)
const G2 = K.R10 / K.R9;      // 8.25 (+18.33 dB)

const LOADS = {
  hp32:  {name:'32 Ω headphones',  R:32,   plug:true},
  hp300: {name:'300 Ω headphones', R:300,  plug:true},
  line600:{name:'600 Ω line input', R:600, plug:true},
  spk8:  {name:'8 Ω speaker (POD6A use)', R:8, plug:true},
  open:  {name:'nothing plugged in', R:K.R8, plug:false},
};
const TOPO = {
  iss4: {name:'ISS4 as drawn (U1A pin 1 tied to the emitter node)', Re:10},
  iss3: {name:'ISS3 1996 topology, POD6 (10 Ω 3 W emitter resistors)', Re:10},
  iss3a:{name:'ISS3 1996 topology, POD6A (1.5 Ω emitter resistors, 8 Ω loads)', Re:1.5},
};

/* ---------------- device state ---------------- */
const D = {
  power: true, cold: true,          // cold: power is applied at t = 0 of the simulated second
  inL: true, inR: true,             // XLR inputs connected
  dBu: 4, freq: 1000,               // source tone (balanced, dBu)
  pot: 0.75, usePot: true,          // volume knob position 0..1 (pot is inferred); false = P1 LEFT↔LEFT_NORM jumpered
  load: 'hp32', topo: 'iss4',
  log: [],
};
function potGainOf(P){ if (!P.usePot) return {g:1, Rth:0}; const g=(Math.pow(10,2*P.pot)-1)/99; return {g, Rth:g*(1-g)*K.POT}; }
function potGain(){ return potGainOf(D); }
function stage2Gain(){ const {g,Rth}=potGain(); return g * K.R10/(K.R9+Rth); }
const dBu = v => v>0 ? 20*Math.log10(v/0.7746) : -Infinity;      // rms volts -> dBu
const fmtdB = x => !isFinite(x)? '−∞' : (x>=0?'+':'')+x.toFixed(1);

/* ---------------- precompute one second at SR (key-cached) ---------------- */
let SIMR=null, KEY='';
function hpA(tau,sr){ return tau/(tau + 1/sr); }
/* One second of the LEFT channel. P = a copy of the relevant state, SR = sample rate. */
function runSecond(P, SR){
  const N=SR, dt=1/SR;
  const vh=new Float32Array(N), vin=new Float32Array(N), v1=new Float32Array(N), vn=new Float32Array(N), v2=new Float32Array(N), vl=new Float32Array(N), il=new Float32Array(N), fl=new Uint8Array(N);
  const RL=LOADS[P.load].R, topo=TOPO[P.topo];
  const Vpk = P.inL ? 0.7746*Math.pow(10,P.dBu/20)*Math.SQRT2 : 0;
  const {g,Rth}=potGainOf(P);
  // C4 (47 µF) into the pot (10 k to ground, inferred); C5 (47 µF) + R9 + wiper impedance into U1A's virtual ground (= VCC_HALF); C7 into the load
  const a4 = hpA(K.Cout1*K.POT,SR), a5 = hpA(K.C5*(K.R9+Rth),SR), a7 = hpA(K.C7*RL,SR);
  let x4p=0,y4=0,x5p=0,y5=0,x7p=0,y7=0, pk=0, rail=0;
  for (let n=0;n<N;n++){
    const t=n*dt, on=P.power, Vcc=on?K.VCC:0;
    const Vh = !on? 0 : P.cold? (K.VCC/2)*(1-Math.exp(-t/K.TAU_HALF)) : K.VCC/2;
    const lo = Math.min(K.SWING, Vh), hi = Math.max(Vcc-K.SWING, Vh);   // the op-amp cannot follow below ~2 V; while VCC_HALF is lower it is assumed to track it (inferred)
    const s = Vpk*Math.sin(2*Math.PI*P.freq*t);
    // U1B: −0.2 × (P − N) around VCC_HALF. Its input caps charge in common mode, which the difference amplifier rejects.
    let a = Vh - G1*s, f=0; if (on){ if (a>hi){a=hi;f|=1;} if (a<lo){a=lo;f|=1;} } else a=0;
    y4 = a4*(y4 + a - x4p); x4p = a;                 // pot top
    const wiper = g*y4;
    const x5 = wiper - Vh;                            // C5 must charge to VCC_HALF through R9: this current also flows in R10
    y5 = a5*(y5 + x5 - x5p); x5p = x5;
    let b = Vh - (K.R10/(K.R9+Rth))*y5;
    if (on){ if (b>hi){b=hi;f|=2;} if (b<lo){b=lo;f|=2;} } else b=0;
    y7 = a7*(y7 + b - x7p); x7p = b;
    let vL = y7, iL = vL/RL;
    if (P.topo==='iss4'){ if (Math.abs(iL)>K.ILIM && RL<K.R8){ iL=Math.sign(iL)*K.ILIM; vL=iL*RL; y7=vL; f|=4; } }
    else { const vmax=Math.max(0,(hi-lo)/2-0.7)*RL/(RL+topo.Re); if (Math.abs(vL)>vmax && RL<K.R8){ vL=Math.sign(vL)*vmax; iL=vL/RL; y7=vL; f|=2; } }
    vh[n]=Vh; vin[n]=s; v1[n]=a; vn[n]=wiper; v2[n]=b; vl[n]=vL; il[n]=iL; fl[n]=f;
    if (t>0.5) pk=Math.max(pk,Math.abs(vL));
    if (on && b>=hi-1e-6 && Vpk===0) rail=t;
  }
  let tpk=0; for (let n=0;n<N;n++) tpk=Math.max(tpk,Math.abs(vl[n]));
  return {vh,vin,v1,vn,v2,vl,il,fl,pk,tpk,rail,RL};
}
function simulate(){
  const key=[D.power,D.cold,D.inL,D.dBu,D.freq,D.pot,D.usePot,D.load,D.topo].join('|');
  if (key===KEY) return SIMR; KEY=key; SIMR=runSecond(D, K.SR); return SIMR;
}
/* Power-on with no signal, for the Findings and the tutorial: how long U1A sits on its top rail, and the peak bump in the load */
let TO=null, TOK='';
function turnOn(load){
  const k=[D.pot,D.usePot,D.topo,load||D.load].join('|'); if (k===TOK) return TO; TOK=k;
  const r=runSecond(Object.assign({},D,{power:true,cold:true,inL:false,load:load||D.load}), 24000);
  TO={rail:r.rail, peak:r.tpk}; return TO;
}
function idx(t){ return Math.max(0,Math.min(K.SR-1,Math.round(t*K.SR))); }

/* ---------------- steady-state analysis (gains, headroom, impedances) ---------------- */
function analysis(){
  const RL=LOADS[D.load].R, g2=stage2Gain(), topo=TOPO[D.topo];
  const vin = D.inL? 0.7746*Math.pow(10,D.dBu/20) : 0;           // rms
  const v1 = G1*vin, v2 = g2*v1;
  const fcOut = 1/(2*Math.PI*RL*K.C7);
  const hp = D.freq/Math.sqrt(D.freq*D.freq+fcOut*fcOut);
  const swingPk = K.VCC/2 - K.SWING;                              // 10 V peak
  let vLmaxPk = swingPk, why='rail swing (NE5532 ≈2 V from each rail)';
  if (D.topo==='iss4' && RL<K.R8 && K.ILIM*RL < vLmaxPk){ vLmaxPk = K.ILIM*RL; why='NE5532 output current limit (≈38 mA)'; }
  if (D.topo!=='iss4' && RL<K.R8){ const v=(swingPk-0.7)*RL/(RL+topo.Re); if (v<vLmaxPk){ vLmaxPk=v; why=`booster swing − Vbe, less I·Re (${topo.Re} Ω)`; } }
  const vL = Math.min(v2*hp, vLmaxPk/Math.SQRT2);
  const head = vLmaxPk/Math.SQRT2 / Math.max(1e-9, v2*hp);
  const Zp = 1/(1/K.Rin + 1/K.Rsh), Zn = 1/(1/(K.Rin+K.Rsh) + 1/K.Rsh);
  return { vin, v1, v2, vL, iL:vL/RL, P:vL*vL/RL, head:20*Math.log10(head), clipping: head<1, why, vLmaxPk, fcOut, Zp, Zn, g2,
    clipIn: dBu(vLmaxPk/Math.SQRT2/(G1*g2*hp)) };
}
/* Bias of the output transistors: R1 current shared between R29 (110 Ω) and D1 (1N4003, n≈1.9, Is≈3 nA — inferred diode model) */
function biasAt(vout){
  const IR1 = Math.max(0,(K.VCC - vout - 0.45)/K.R1);
  let lo=0, hi=0.9; for (let i=0;i<40;i++){ const v=(lo+hi)/2; const I=v/K.R29 + 3e-9*(Math.exp(v/(1.9*0.02585))-1); if (I>IR1) hi=v; else lo=v; }
  const vb = lo;                                       // base-to-node voltage of Q1
  let ic=0; if (D.topo==='iss4'){ // emitter sits on the same node through 10 Ω: solve Vbe + Ic·Re = vb
    let a=0,b=0.2; for (let i=0;i<40;i++){ const I=(a+b)/2; const vbe=0.02585*Math.log(I/1e-13+1); if (vbe+I*K.Re>vb) b=I; else a=I; } ic=a; }
  return {IR1, vb, ic};
}

/* ---------------- actions: each logs the circuit path it exercises ---------------- */
function act(name, fn){
  const tr=[]; fn(s=>tr.push(s));
  D.log.unshift({t:SIM.t, name, trace:tr}); if (D.log.length>40) D.log.length=40;
  SIM.refresh();
}
const A = {
  power(){ act(D.power?'Unplug +24 VDC':'Plug in +24 VDC', tr=>{
    D.power=!D.power;
    if (D.power){ tr('Rear DC jack (POD6-002 “+ 24 VDC”, .312 in hole) → harness → P2 pin 7 = VCC_24V; P2 pins 3/6/8 = GND');
      tr(`VCC_HALF = R27/R28 (100K/100K) divider, held by C15 22 µF + C22/C23 100 nF → τ = 50 kΩ × 22.2 µF = ${K.TAU_HALF.toFixed(2)} s`);
      tr('U1B follows VCC_HALF smoothly: its two input caps charge in common mode, which the difference amplifier rejects');
      tr('U1A cannot: C5 (47 µF) has to charge to VCC_HALF through R9, and R10 (82.5 kΩ) turns that ≈0.5 mA into a demand of ≈42 V, so U1A sits on its top rail');
      tr(`That step reaches the load through C7: model peak ${turnOn().peak.toFixed(2)} V into ${LOADS[D.load].name} (instant 24 V supply assumed)`);
      D.cold=true; }
    else tr('VCC_24V collapses; C15 discharges through R28; outputs fall to 0 V');
  }); },
  plugIn(ch){ act((ch?'RIGHT':'LEFT')+' XLR '+((ch?D.inR:D.inL)?'unplugged':'plugged in'), tr=>{
    if (ch) D.inR=!D.inR; else D.inL=!D.inL;
    const on = ch? D.inR : D.inL;
    tr(`Rear ${ch?'RIGHT':'LEFT'} XLR (Neutrik D-size, .950 in hole) → P2 pins ${ch?'4/5 = RIGHT_IN_P/N':'1/2 = LEFT_IN_P/N'}`);
    tr(on? `${ch?'C8/C9':'C2/C3'} 47 µF → ${ch?'R14/R15':'R6/R5'} 100 kΩ → ${ch?'U2A pins 2/3':'U1B pins 6/5'}; gain −${ch?'R18':'R2'}/${ch?'R14':'R6'} = −20k/100k = −0.2 (−14.0 dB)` : 'Input open: R3/R4 (20 kΩ) hold both legs at ground, the stage outputs only VCC_HALF');
    if (ch) tr('The timeline shows the LEFT channel; RIGHT is the same circuit (U2A/U2B, Q3/Q4, C14)');
  }); },
  level(v){ D.dBu=v; KEY=''; SIM.refresh(); },
  freq(v){ D.freq=v; SIM.refresh(); },
  turn(d){ act(`Turn the volume knob ${d>0?'up':'down'}`, tr=>{
    D.pot=Math.max(0,Math.min(1,D.pot+d*0.05)); const {g,Rth}=potGain();
    tr(`Front knob (.250 in hole, POD6-001) — a pot between P1 pin 1 LEFT and pin 2 LEFT_NORM ${inf}`);
    tr(`Wiper ratio ${g.toFixed(3)} (${fmtdB(20*Math.log10(Math.max(g,1e-6)))} dB, log taper ${inf}); wiper source impedance ${(Rth/1000).toFixed(2)} kΩ adds to R9`);
    tr(`U1A gain = −R10/(R9 + Rwiper) = −82.5k/${((K.R9+Rth)/1000).toFixed(2)}k = ${(-K.R10/(K.R9+Rth)).toFixed(2)}`);
  }); },
  setLoad(k){ act('Headphone jack: '+LOADS[k].name, tr=>{
    D.load=k; const R=LOADS[k].R;
    tr(k==='open'? 'Nothing on the jack: LEFT_OUT sees only R8 100 kΩ (the bleed resistor that keeps C7 charged)' :
      `Front jack (.390 in hole) → JPH1/P3: T = LEFT_OUT, R = RIGHT_OUT, S = GND (JPH1 itself is DNI on the board; the jack is panel-mounted ${inf})`);
    tr(`C7 470 µF into ${R} Ω: −3 dB at ${(1/(2*Math.PI*R*K.C7)).toFixed(R>1000?3:1)} Hz`);
    if (D.topo==='iss4' && R<1000) tr(`ISS4: the NE5532 (U1A pin 1) drives the load itself; ${ (K.ILIM*R).toFixed(2)} V peak before its ≈38 mA limit`);
  }); },
  setTopo(k){ act('Output stage: '+TOPO[k].name, tr=>{
    D.topo=k;
    if (k==='iss4'){ tr('POD6-ISS4-S1: U1A pin 1, the D1/D2 midpoint, the R29/R30 junction and the R11/R12 emitter node are all one net (LEFT_OUT side of C7)');
      tr('Q1 base can sit at most one 1N4003 drop above its own emitter node, with R29 110 Ω shunting it → Vbe ≈ 0.42 V at idle: Q1/Q2 stay off'); }
    else { tr('ISS3 (POD6.pdf, 1996): U1A drives only the diode midpoint; Q1/Q2 emitters reach the output through R11/R12; feedback R10 is taken after them');
      tr(k==='iss3a'? 'Note on ISS3: “POD6A — use 1.5 Ω 1/4 W for 8 Ω loads”' : 'Note on ISS3: “POD6 — use 10 Ω 3 W for headset module”'); }
  }); },
  coldToggle(){ D.cold=!D.cold; SIM.refresh(); },
  reset(){ Object.assign(D,{power:true,cold:true,inL:true,inR:true,dBu:4,freq:1000,pot:0.75,usePot:true,load:'hp32',topo:'iss4',log:[]}); KEY=''; SIM.refresh(); },
};

/* ================================================================
   PANELS — real silkscreen (POD6-001 front, POD6-002 ISS 2 rear), 200 px per inch
   ================================================================ */
function frontSVG(){
  const ang = -135 + 270*D.pot, rad = ang*Math.PI/180;
  const plugged = LOADS[D.load].plug;
  return `<svg viewBox="0 0 950 295" role="img" aria-label="microDriver front (POD6-001 bracket face, real silkscreen)" style="width:100%;max-width:760px;display:block;border-radius:6px">
   <defs><radialGradient id="mdk" cx=".4" cy=".35"><stop offset="0" stop-color="#3a3c3f"/><stop offset="1" stop-color="#0b0c0d"/></radialGradient></defs>
   <rect width="950" height="295" fill="var(--dev)"/>
   <image href="${ASSET}microdriver-front-white.png" width="950" height="295"/>
   <g class="mdj" style="cursor:pointer"><title>Headphone jack (.390 in hole) — click to plug or unplug</title>
     <circle cx="210" cy="138" r="54" fill="transparent"/>
     <polygon points="${[0,1,2,3,4,5].map(i=>{const a=Math.PI/3*i+Math.PI/6;return (210+40*Math.cos(a)).toFixed(1)+','+(138+40*Math.sin(a)).toFixed(1);}).join(' ')}" fill="#2a2c2e" stroke="#555"/>
     <circle cx="210" cy="138" r="27" fill="#141516" stroke="#4a4d50" stroke-width="3"/>
     ${plugged? `<circle cx="210" cy="138" r="24" fill="#6c6f73"/><circle cx="210" cy="138" r="18" fill="#9a9da1"/><circle cx="210" cy="138" r="7" fill="#c7c9cc"/>
       <text x="210" y="226" text-anchor="middle" font-size="20" fill="#e8e8e2">${LOADS[D.load].R} Ω</text>` : `<circle cx="210" cy="138" r="12" fill="#000"/>`}
   </g>
   <g class="mdknob" style="cursor:pointer"><title>Volume (inferred pot) — click left half to turn down, right half to turn up, or use the wheel</title>
     <circle cx="730" cy="138" r="70" fill="transparent"/>
     ${Array.from({length:24},(_,i)=>{const a=i/24*2*Math.PI;return `<line x1="${730+50*Math.cos(a)}" y1="${138+50*Math.sin(a)}" x2="${730+56*Math.cos(a)}" y2="${138+56*Math.sin(a)}" stroke="#2b2d30" stroke-width="5"/>`;}).join('')}
     <circle cx="730" cy="138" r="52" fill="url(#mdk)" stroke="#000"/>
     <circle cx="730" cy="138" r="30" fill="#141516"/>
     <line x1="730" y1="138" x2="${(730+46*Math.sin(rad)).toFixed(1)}" y2="${(138-46*Math.cos(rad)).toFixed(1)}" stroke="#eee" stroke-width="5" stroke-linecap="round"/>
   </g>
   <text x="12" y="285" font-size="14" fill="#8b8f93">POD6-001 ISS 2 · 4.750 × 1.475 in</text>
  </svg>`;
}
function rearSVG(){
  const xlr=(x,on,ch)=>`<g class="mdx" data-ch="${ch}" style="cursor:pointer"><title>${ch?'RIGHT':'LEFT'} input XLR — click to ${on?'unplug':'plug in'}</title>
    <circle cx="${x}" cy="141" r="93" fill="#b9bcc0" stroke="#5c5f62" stroke-width="3"/><circle cx="${x}" cy="141" r="74" fill="#1b1c1e"/>
    ${[[-24,-18],[24,-18],[0,26]].map(([dx,dy])=>`<circle cx="${x+dx}" cy="${141+dy}" r="9" fill="#000" stroke="#777"/>`).join('')}
    <rect x="${x-10}" y="56" width="20" height="16" rx="3" fill="#7d8084"/>
    ${on?`<circle cx="${x}" cy="141" r="78" fill="none" stroke="var(--accent)" stroke-width="10" opacity=".85"/>`:''}</g>`;
  return `<svg viewBox="0 0 877 282" role="img" aria-label="microDriver rear panel (POD6-002 ISS 2, real silkscreen)" style="width:100%;max-width:760px;display:block;border-radius:6px">
    <rect width="877" height="282" fill="var(--dev)"/>
    ${xlr(156,D.inL,0)}${xlr(360,D.inR,1)}
    <g class="mdp" style="cursor:pointer"><title>+24 VDC input — click to ${D.power?'unplug':'plug in'}</title>
      <circle cx="789" cy="70" r="40" fill="transparent"/><circle cx="789" cy="70" r="30" fill="#2a2c2e" stroke="#777" stroke-width="3"/><circle cx="789" cy="70" r="12" fill="#000"/><circle cx="789" cy="70" r="4" fill="#bbb"/>
      ${D.power?`<circle cx="789" cy="70" r="26" fill="#333" stroke="var(--accent)" stroke-width="6"/>`:''}</g>
    <image href="${ASSET}microdriver-rear-white.png" width="877" height="282"/>
    <text x="12" y="274" font-size="14" fill="#8b8f93">POD6-002 ISS 2 (“POD 6C rear panel”) · 4.370 × 1.410 in</text>
  </svg>`;
}
function bindPanels(root){
  root.querySelectorAll('.mdj').forEach(g=>g.onclick=()=>A.setLoad(LOADS[D.load].plug?'open':'hp32'));
  root.querySelectorAll('.mdknob').forEach(g=>{
    g.onclick=e=>{ const r=g.getBoundingClientRect(); A.turn((e.clientX-r.left)/r.width<0.5?-1:1); };
    g.addEventListener('wheel',e=>{ e.preventDefault(); A.turn(e.deltaY<0?1:-1); },{passive:false});
  });
  root.querySelectorAll('.mdx').forEach(g=>g.onclick=()=>A.plugIn(+g.dataset.ch));
  root.querySelectorAll('.mdp').forEach(g=>g.onclick=()=>A.power());
}

/* ---------------- waveform lane helper (min/max envelope per pixel) ---------------- */
function wave(c,X,t0,t1,y,h,arr,vmin,vmax,color,fl,mask){
  const x0=X(t0), x1=X(t1), Y=v=>y+h-2-(v-vmin)/(vmax-vmin)*(h-4);
  const i0=idx(t0), i1=idx(t1), per=(i1-i0)/Math.max(1,x1-x0);
  c.strokeStyle=color; c.lineWidth=1.2;
  if (per<=1.5){ c.beginPath(); for(let i=i0;i<=i1;i++){ const xx=X(i/K.SR), yy=Y(arr[i]); i===i0?c.moveTo(xx,yy):c.lineTo(xx,yy);} c.stroke(); }
  else { c.beginPath(); for(let px=Math.floor(x0);px<x1;px++){ const a=i0+Math.floor((px-x0)*per), b=Math.min(i1,a+Math.ceil(per)); let mn=1e9,mx=-1e9; for(let i=a;i<=b;i++){ const v=arr[i]; if(v<mn)mn=v; if(v>mx)mx=v; } c.moveTo(px+.5,Y(mx)); c.lineTo(px+.5,Y(mn)+0.5);} c.stroke(); }
  if (fl){ c.fillStyle=SIM.css('--bad'); const step=Math.max(1,Math.floor(per)); for(let i=i0;i<=i1;i+=step){ if(fl[i]&mask) c.fillRect(X(i/K.SR),y+1,Math.max(1,step/per),3); } }
}
function lanes(){
  const S=simulate(), css=n=>SIM.css(n), RL=S.RL;
  const Vpk=0.7746*Math.pow(10,D.dBu/20)*Math.SQRT2 || 1;
  const iMax=Math.max(0.05, ...[K.ILIM*1.3]);
  return [
    {label:'VCC_24V / VCC_HALF (V)', h:46, draw(c,X,t0,t1,y,h){ c.strokeStyle=css('--warn'); c.setLineDash([4,3]); const yy=y+4; c.beginPath(); c.moveTo(X(t0),D.power?yy:y+h-2); c.lineTo(X(t1),D.power?yy:y+h-2); c.stroke(); c.setLineDash([]); wave(c,X,t0,t1,y,h,S.vh,0,24,css('--accent2')); c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText(D.cold&&D.power?`VCC_HALF τ = ${K.TAU_HALF.toFixed(2)} s (R27‖R28 × C15)`:'steady state', X(t0)+6, y+h-6); }},
    {label:'LEFT_IN P−N (source)', h:40, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,S.vin,-Vpk*1.1,Vpk*1.1,css('--ink')); }},
    {label:'U1B pin 7 (receiver, V)', h:46, draw(c,X,t0,t1,y,h){ c.fillStyle=css('--grid'); c.fillRect(X(t0),y,X(t1)-X(t0),3); wave(c,X,t0,t1,y,h,S.v1,0,24,css('--accent'),S.fl,1); }},
    {label:'LEFT_NORM (after pot, V)', h:40, draw(c,X,t0,t1,y,h){ const m=Math.max(0.05,G1*Vpk*potGain().g*1.3); wave(c,X,t0,t1,y,h,S.vn,-m,m,css('--accent2')); }},
    {label:'U1A pin 1 / output node (V)', h:50, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,S.v2,0,24,css('--accent'),S.fl,2|4); c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('red ticks = clipping / current limit', X(t1)-190, y+12); }},
    {label:`Load voltage after C7 (${RL>=K.R8?'R8 only':RL+' Ω'})`, h:50, draw(c,X,t0,t1,y,h){ const m=Math.max(0.3,Math.min(12,S.pk*1.25||1)); wave(c,X,t0,t1,y,h,S.vl,-m,m,css('--bad')); c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText(`±${m.toFixed(2)} V full scale`, X(t0)+6, y+11); }},
    {label:'Load current (mA)', h:40, draw(c,X,t0,t1,y,h){ const m=Math.max(5e-3, Math.min(1, (S.pk/RL)*1.3||0.01)); const Y=v=>y+h/2-v/m*(h/2-2); if (D.topo==='iss4'){ c.strokeStyle=css('--warn'); c.setLineDash([3,3]); [K.ILIM,-K.ILIM].forEach(v=>{ if(Math.abs(v)<m){ c.beginPath(); c.moveTo(X(t0),Y(v)); c.lineTo(X(t1),Y(v)); c.stroke(); }}); c.setLineDash([]); } wave(c,X,t0,t1,y,h,S.il,-m,m,css('--warn')); c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText(`±${(m*1000).toFixed(0)} mA`, X(t0)+6, y+11); }},
  ];
}

/* ================================================================ VIEWS ================================================================ */
function card(t,b){ return `<div class="card"><h2>${t}</h2>${b}</div>`; }
function stageTable(){
  const a=analysis(), t=SIM.t, S=simulate(), i=idx(t), b=biasAt(S.v2[i]);
  return `<table class="kv">
   <tr><th>Stage</th><th>Parts</th><th>Gain</th><th>Level (rms)</th></tr>
   <tr><td>Source</td><td class="small">XLR → P2-1/2</td><td></td><td class="mono">${D.inL? fmtdB(D.dBu)+' dBu':'—'}</td></tr>
   <tr><td>Receiver U1B</td><td class="small">R6/R5 100k, R2/R7 20k</td><td class="mono">×−0.20 (−14.0 dB)</td><td class="mono">${fmtdB(dBu(a.v1))} dBu</td></tr>
   <tr><td>Volume ${D.usePot?inf:''}</td><td class="small">${D.usePot?'10 kΩ log pot P1-1 → P1-2':'P1-1 ↔ P1-2 jumper'}</td><td class="mono">${fmtdB(20*Math.log10(Math.max(1e-6,potGain().g)))} dB</td><td></td></tr>
   <tr><td>Driver U1A</td><td class="small">R9 10k, R10 82k5</td><td class="mono">×${(-a.g2/potGain().g||-G2).toFixed(2)}</td><td class="mono">${fmtdB(dBu(a.v2))} dBu</td></tr>
   <tr><td>Load</td><td class="small">C7 470 µF → ${LOADS[D.load].name}</td><td class="mono">fc ${a.fcOut<1?a.fcOut.toFixed(2):a.fcOut.toFixed(1)} Hz</td><td class="mono">${a.vL.toFixed(3)} V · ${(a.P*1000).toFixed(a.P<0.01?2:1)} mW</td></tr>
   <tr><th>Headroom</th><td colspan="3" class="mono">${a.clipping?'<b style="color:var(--bad)">CLIPPING</b> ':''}${fmtdB(a.head)} dB · clips at ${fmtdB(a.clipIn)} dBu in · limit: ${a.why}</td></tr>
   <tr><th>Input Z</th><td colspan="3" class="mono">P leg ${(a.Zp/1000).toFixed(1)} kΩ · N leg ${(a.Zn/1000).toFixed(1)} kΩ (R3/R4 20k to ground)</td></tr>
   <tr><th>At playhead</th><td colspan="3" class="mono">VCC_HALF ${S.vh[i].toFixed(2)} V · node ${S.v2[i].toFixed(2)} V · load ${S.vl[i].toFixed(3)} V / ${(S.il[i]*1000).toFixed(1)} mA</td></tr>
   <tr><th>Q1 bias</th><td colspan="3" class="mono">${D.topo==='iss4'? `R1 ${(b.IR1*1000).toFixed(2)} mA → V(R29‖D1) ${b.vb.toFixed(3)} V → Q1 Ic ≈ ${b.ic<1e-3?(b.ic*1e6).toFixed(b.ic<1e-5?2:0)+' µA (off)':(b.ic*1e3).toFixed(1)+' mA (Q1 pushes against U1A)'}` : 'ISS3: U1A drives the bias midpoint; Q1/Q2 follow as emitter followers'}</td></tr>
  </table>`;
}
function traceHTML(){ const e=D.log[0]; return e? `<div><b>${e.name}</b> at ${SIM.fmtT(e.t)}</div>`+e.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click the panels: knob, headphone jack, XLR inputs, DC jack. Each action lists the parts and nets it goes through.</div>'; }
function controls(){
  return `<div style="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-top:8px" class="small">
    <label>Source <input type="range" id="lv" min="-20" max="24" step="1" value="${D.dBu}"> <span id="lvv" class="mono"></span></label>
    <label>Freq <select id="fq">${[50,100,1000,10000].map(f=>`<option value="${f}" ${f===D.freq?'selected':''}>${f>=1000?f/1000+' k':f} Hz</option>`).join('')}</select></label>
    <label>Load <select id="ld">${Object.keys(LOADS).map(k=>`<option value="${k}" ${k===D.load?'selected':''}>${LOADS[k].name}</option>`).join('')}</select></label>
    <label>Output stage <select id="tp">${Object.keys(TOPO).map(k=>`<option value="${k}" ${k===D.topo?'selected':''}>${TOPO[k].name}</option>`).join('')}</select></label>
    <label><input type="checkbox" id="cd" ${D.cold?'checked':''}> power applied at t = 0</label>
    <label><input type="checkbox" id="up" ${D.usePot?'checked':''}> volume pot fitted ${inf}</label>
    <button id="rs">Reset</button></div>`;
}
function bindControls(m){
  const q=s=>m.querySelector(s);
  const upd=()=>{ q('#lvv').textContent=(D.dBu>=0?'+':'')+D.dBu+' dBu'; };
  q('#lv').oninput=e=>{ A.level(+e.target.value); upd(); };
  q('#fq').onchange=e=>A.freq(+e.target.value);
  q('#ld').onchange=e=>A.setLoad(e.target.value);
  q('#tp').onchange=e=>A.setTopo(e.target.value);
  q('#cd').onchange=()=>A.coldToggle();
  q('#up').onchange=e=>{ D.usePot=e.target.checked; SIM.refresh(); };
  q('#rs').onclick=()=>A.reset();
  upd();
}
function viewSim(m){
  window.__microdriverActive=false;
  m.innerHTML = `<div class="grid2"><div>
     ${card('Front (POD6-001 under-table bracket) — click the jack and the knob', `<div id="fp"></div>`)}
     ${card('Rear (POD6-002) — click the XLRs and the +24 VDC jack', `<div id="rp"></div>`)}
     ${card('Source and options', controls())}
   </div><div>
     ${card('Signal at each stage (LEFT channel; RIGHT is identical)', `<div id="st"></div>`)}
     ${card('Circuit path of the last action', `<div id="tr" class="log"></div>`)}
   </div></div>
   ${card('Timeline — one second from power-on (zoom in to see single cycles)', `<canvas id="tl"></canvas><p class="small muted">Precomputed at ${K.SR/1000} kHz from the schematic values. The op-amp is ideal apart from its ≈2 V output swing limit and ≈38 mA current limit (NE5532 datasheet). The 47 µF / 470 µF couplings are modelled as first-order high-passes. The source is a balanced tone into LEFT_IN_P/N.</p>`)}`;
  bindControls(m);
  SIM.on('time', ()=>{
    m.querySelector('#fp').innerHTML=frontSVG(); m.querySelector('#rp').innerHTML=rearSVG(); bindPanels(m);
    m.querySelector('#st').innerHTML=stageTable(); m.querySelector('#tr').innerHTML=traceHTML();
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:190});
  });
}

/* ---------------- tutorial ---------------- */
const LESSONS = [
  {title:'Meet the microDriver', body:`<p>The microDriver is the 2016|49 surface-mount re-spin (R&D RD76, board <b>POD6-ISS4</b>) of the POD6, a Ward-Beck stereo headphone amplifier from 1996|29. It mounts under a desk in the POD6-001 bracket. The front has a headphone jack and a volume knob. The rear (POD6-002) has LEFT and RIGHT XLR inputs and a +24 VDC jack.</p><p>Inside, each channel has two NE5532 stages: a balanced receiver at −14 dB, then an inverting driver at up to +18.3 dB into a 470 µF output capacitor.</p><p class="muted">No operator manual for the POD6 is in the archive. These steps come from the panels, the schematics and the BOM.</p>`, check:()=>true, auto:true},
  {title:'1 · Power it', body:`<p>Click the <b>+24 VDC</b> jack on the rear panel so it shows a plug. Watch the first lane of the timeline: VCC_HALF climbs to 12 V with τ = 1.11 s, set by R27/R28 (100 kΩ each) and C15 (22 µF).</p><p><b>Goal:</b> powered.</p>`, check:()=>D.power, hint:'Click the round DC jack on the right of the rear panel.'},
  {title:'2 · Connect both inputs', body:`<p>Click the <b>LEFT</b> and <b>RIGHT</b> XLRs so each shows a green ring. A balanced line feed goes to LEFT_IN_P/N and RIGHT_IN_P/N on P2.</p><p><b>Goal:</b> both inputs connected.</p>`, check:()=>D.inL&&D.inR, hint:'Click each large XLR circle on the rear panel.'},
  {title:'3 · Line-up level', body:`<p>Set the source to <b>+4 dBu</b>, the usual line-up level. The receiver drops it 14 dB to −10 dBu, which keeps the op-amp far from its rails.</p><p><b>Goal:</b> source = +4 dBu.</p>`, check:()=>D.dBu===4, hint:'Use the Source slider under the panels.'},
  {title:'4 · Plug in headphones', body:`<p>Click the <b>headphone jack</b> on the front, then pick <b>32 Ω headphones</b> in the Load menu. The 470 µF capacitor into 32 Ω passes everything above 10.6 Hz.</p><p><b>Goal:</b> 32 Ω headphones plugged in.</p>`, check:()=>D.load==='hp32', hint:'Click the jack (left round part of the front panel).'},
  {title:'5 · Find the clip point', body:`<p>Turn the <b>volume knob</b> fully clockwise (click its right half or use the mouse wheel). In ISS4 the NE5532 drives the 32 Ω load by itself and runs into its ≈38 mA current limit. The stage table then shows <b>CLIPPING</b>, and the timeline shows red ticks.</p><p><b>Goal:</b> volume at maximum and clipping.</p>`, check:()=>D.pot>=0.999 && analysis().clipping, hint:'Keep clicking the right half of the knob, or raise the source level.'},
  {title:'6 · Compare the 1996 output stage', body:`<p>Switch <b>Output stage</b> to the ISS3 topology. Now U1A drives only the bias diodes, and the TIP transistors carry the load current. The same setting no longer clips: the limit becomes the rail swing.</p><p><b>Goal:</b> ISS3 selected and not clipping.</p>`, check:()=>D.topo!=='iss4' && !analysis().clipping, hint:'Use the Output stage menu (choose either ISS3 option).'},
  {title:'7 · Watch the turn-on thump', body:()=>`<p>Tick <b>power applied at t = 0</b> and set the zoom window to <b>1 s</b>. VCC_HALF rises slowly (τ = 1.11 s), but U1A does not follow it. C5 has to charge to VCC_HALF through R9, and the 82.5 kΩ feedback resistor turns that small charging current into a demand of about 42 V. U1A therefore sits on its top rail through the whole second, and the jump reaches the load through C7. The model puts the bump at <b>${turnOn().peak.toFixed(2)} V</b> peak into ${LOADS[D.load].name}. Try 300 Ω or a 600 Ω line input to see it grow.</p><p><b>Goal:</b> cold start on, 1 s zoom window.</p>`, check:()=>D.cold && SIM.win>=1, hint:'Zoom window menu in the transport bar → 1 s.'},
  {title:'Done', body:`<p>You have powered the unit, fed it, loaded it, found its headroom and compared two output stages. The <b>Signal path</b> tab follows the level through each part. <b>Findings</b> explains why ISS4's output transistors never turn on.</p>`, check:()=>true, auto:true},
];
let li=0;
function viewTut(m){
  window.__microdriverActive=false;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — using the microDriver', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="le"></div></div>
   <div>${card('The unit', `<div id="fp"></div><div id="rp" style="margin-top:8px"></div>${controls()}`)}${card('Signal', `<div id="st"></div>`)}${card('Circuit path', `<div id="tr" class="log"></div>`)}</div></div>`;
  bindControls(m);
  const draw=()=>{
    m.querySelector('#fp').innerHTML=frontSVG(); m.querySelector('#rp').innerHTML=rearSVG(); bindPanels(m);
    m.querySelector('#st').innerHTML=stageTable(); m.querySelector('#tr').innerHTML=traceHTML();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===li?'font-weight:700;color:var(--accent)':''}">${l.title}${i<li?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(e=>e.onclick=()=>{ li=+e.dataset.i; draw(); });
    const L=LESSONS[li], ok=L.check();
    m.querySelector('#le').innerHTML=`<h2>${L.title}</h2>${typeof L.body==='function'?L.body():L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${li?'':'disabled'}>◀ Back</button><button id="nx" ${li<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="r0">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{li=Math.max(0,li-1);draw();}; m.querySelector('#nx').onclick=()=>{li=Math.min(LESSONS.length-1,li+1);draw();};
    m.querySelector('#r0').onclick=()=>{ A.reset(); D.power=false; D.inL=D.inR=false; D.load='open'; D.pot=0.4; li=0; KEY=''; SIM.refresh(); };
  };
  SIM.on('time', draw);
}

/* ---------------- one second ---------------- */
function viewSecond(m){
  window.__microdriverActive=false;
  m.innerHTML=`${card('One second of a microDriver, from power-on', `<div id="ld"></div>`)}
   <div class="grid2">${card('The panels at the playhead', `<div id="fp"></div><img src="${ASSET}microdriver-photo.jpg" alt="microDriver in its POD6-001 under-table bracket (archive photo)" style="width:100%;max-width:420px;border-radius:8px;margin-top:8px"><div class="small muted">Archive photo <span class="mono">SILKS/POD6-001/POD6-001.jpg</span></div>`)}
   ${card('Scope at the playhead (LEFT, 4 cycles)', `<canvas id="sc"></canvas><div id="sci" class="small mono"></div>`)}</div>
   ${card('Timeline', `<canvas id="tl"></canvas>`)}`;
  SIM.on('time', ()=>{
    const a=analysis(), S=simulate(), RL=S.RL, i=idx(SIM.t);
    const rows=[
      ['VCC_HALF settles (5 τ)', (5*K.TAU_HALF).toFixed(2)+' s', 'R27‖R28 = 50 kΩ × (C15 22 µF + C22/C23 0.2 µF): longer than the simulated second'],
      ['C7 → load time constant', SIM.fmtDur(RL*K.C7), `${RL>=K.R8?'R8 100 kΩ':RL+' Ω'} × 470 µF; −3 dB at ${a.fcOut.toFixed(2)} Hz`],
      ['C4 → pot → C5 couplings', SIM.fmtDur(K.Cout1*(K.POT+K.R9)), '47 µF × (10 k pot + R9 10 k) '+'— pot value '+inf],
      ['Input coupling C2/C3', SIM.fmtDur(K.Cin*K.Rin), '47 µF × 100 kΩ → −3 dB at 0.034 Hz'],
      ['Receiver HF pole', SIM.fmtDur(K.Rf*K.Cf1), 'R2 20 kΩ × C1 22 pF → 362 kHz'],
      ['Driver HF pole', SIM.fmtDur(K.R10*K.C6), 'R10 82.5 kΩ × C6 22 pF → 87.7 kHz'],
      ['Tone cycles in the second', D.freq.toLocaleString(), SIM.fmtDur(1/D.freq)+' each'],
      ['Turn-on bump into the load', turnOn().peak.toFixed(2)+' V peak', 'U1A rails while C5 charges to VCC_HALF through R9 (≈0.5 mA × R10 82.5 k); model, instant 24 V supply '+inf],
      ['U1A on its top rail after power-on', turnOn().rail>=0.999?'≥ 1 s':SIM.fmtDur(turnOn().rail), 'until C5 has charged: 47 µF × (R9 + Rwiper) = '+SIM.fmtDur(K.C5*(K.R9+potGain().Rth))+' time constant, driven by the 1.11 s ramp'],
    ];
    m.querySelector('#ld').innerHTML=`<table class="kv"><tr><th>Event</th><th>time</th><th>from</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="small">${r[2]}</td></tr>`).join('')}</table>
      <p class="small muted">There is no clock or processor. The only things that happen “in time” are the bias settling, the coupling capacitors charging and the audio itself. Use Step → 1 cycle to walk through the tone.</p>`;
    m.querySelector('#fp').innerHTML=frontSVG(); bindPanels(m);
    const {c,w}=SIM.canvas(m.querySelector('#sc'),170); const span=4/D.freq, t0=Math.max(0,Math.min(1-span,SIM.t-span/2));
    const tr=[[S.v2,0,24,SIM.css('--accent'),'U1A out (0–24 V)'],[S.vl,-Math.max(0.3,S.pk*1.2),Math.max(0.3,S.pk*1.2),SIM.css('--bad'),'load']];
    c.strokeStyle=SIM.css('--grid'); c.strokeRect(4,4,w-8,162);
    tr.forEach(([arr,lo,hi,col,lb],k)=>{ c.strokeStyle=col; c.lineWidth=1.5; c.beginPath(); for(let p=0;p<=400;p++){ const tt=t0+span*p/400, v=arr[idx(tt)]; const yy=8+(1-(v-lo)/(hi-lo))*150; p?c.lineTo(8+(w-16)*p/400,yy):c.moveTo(8,yy);} c.stroke(); c.fillStyle=col; c.font='11px sans-serif'; c.fillText(lb, 10, 18+k*14); });
    const px=8+(w-16)*(SIM.t-t0)/span; c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(px,4); c.lineTo(px,166); c.stroke();
    m.querySelector('#sci').innerHTML=`t = ${SIM.fmtT(SIM.t)} · node ${S.v2[i].toFixed(3)} V · load ${S.vl[i].toFixed(4)} V · ${(S.il[i]*1000).toFixed(2)} mA${S.fl[i]?' · <b style="color:var(--bad)">limited</b>':''}`;
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:190});
  });
}

/* ---------------- block diagram + board ---------------- */
const BL = {
  xlr:{x:10,y:40,w:120,h:60,t:'XLR L / R',s:['POD6-002 rear'],d:'Two Neutrik D-size XLRs (.950 in holes, POD6-002 ISS 2), wired to P2. The RJ-45 variant (pod6 rj-45 pinout.png) uses pin 1/2 = L+/L−, 3/6 = R+/R−, 4 = GND.'},
  p2:{x:160,y:40,w:110,h:60,t:'P2 PAN1000',s:['MLSS-100-10'],d:'10-way locking header (BOM: MLSS-100-10, “PAN1000” is the footprint name). 1 LEFT_IN_P, 2 LEFT_IN_N, 4 RIGHT_IN_P, 5 RIGHT_IN_N, 7 VCC_24V, 3/6/8 GND, 9/10 not connected.'},
  rx:{x:300,y:20,w:150,h:100,t:'Receivers U1B / U2A',s:['NE5532, gain −0.2','R6/R5 100k, R2/R7 20k','C1 22p → 362 kHz'],d:'Balanced-input difference amplifiers biased at VCC_HALF. LEFT_IN_P goes to the inverting input, so the stage inverts (−14 dB). R3/R4 20 kΩ to ground load each leg; C18–C21 (1 nF RF shunts) are DNI.'},
  p1:{x:480,y:40,w:120,h:60,t:'P1 PAN600',s:['LEFT → LEFT_NORM'],d:'6-way header: 1 LEFT, 2 LEFT_NORM, 4 RIGHT, 5 RIGHT_NORM, 3/6 GND. The receiver output leaves the board and comes back. A jumper or the front volume pot goes here (inferred from the photo’s knob; no pot is on the PCB).'},
  dr:{x:630,y:20,w:150,h:100,t:'Drivers U1A / U2B',s:['NE5532, gain −8.25','R9 10k, R10 82k5','C6 22p → 87.7 kHz'],d:'Inverting amplifiers, +18.3 dB. In ISS4 the op-amp output is tied straight to the output node (see Findings).'},
  out:{x:630,y:170,w:150,h:90,t:'Output stage',s:['Q1 TIP31C / Q2 TIP32C','D1/D2 1N4003, R29/R30 110R','R11/R12 10R 1 W'],d:'Complementary emitter followers with diode bias. ISS3 (1996) drove the loads through them; in ISS4 as drawn they are bypassed.'},
  cap:{x:480,y:180,w:120,h:70,t:'C7 / C14 470 µF',s:['R8/R20 100k bleed'],d:'Output coupling capacitors (35 V). R8/R20 keep the outer side at 0 V so plugging in does not click.'},
  p3:{x:300,y:180,w:150,h:70,t:'P3 PAN600 → jack',s:['LEFT_OUT, RIGHT_OUT ×2'],d:'P3: 1/4 LEFT_OUT, 2/5 RIGHT_OUT, 3/6 GND, to the front jack. JPH1 (on-board TRS footprint, tip/ring switches unused) is DNI.'},
  pw:{x:10,y:180,w:250,h:70,t:'VCC_24V, VCC_HALF',s:['R27/R28 100k, C15 22µ, C22/C23 100n','τ = 1.11 s'],d:'Single +24 V supply from the rear jack. VCC_HALF = 12 V biases all four op-amp stages. C16/C17 100 nF decouple U2/U1.'},
};
const BW=[['xlr','p2'],['p2','rx'],['rx','p1'],['p1','dr'],['dr','out'],['out','cap'],['cap','p3'],['pw','rx'],['pw','dr']];
/* Part positions from Pick Place for POD6-ISS4-PANEL.csv (first board), mapped onto the 120 dpi assembly drawing */
const PNP = {U1:[2385,1780],U2:[2385,2705],Q1:[3350,1655],Q2:[4495,1655],Q3:[3350,2820],Q4:[4495,2820],D1:[3767,1460],D2:[4077,1460],R29:[3795,1595],R30:[4050,1595],R11:[3725,1860],R12:[4125,1860],R1:[3570,1500],R13:[4275,1500],C7:[4925,1620],C14:[4925,2855],R8:[5240,1595],P1:[2780,2240],P2:[1458,2238],P3:[3455,2240],JPH1:[5000,2245],C15:[1845,2235],R27:[2135,2305],R28:[2135,2160],C2:[1850,1675],C3:[1850,1920],R6:[2015,1785],R5:[2065,1920],R2:[2185,1785],R7:[2210,1920],R9:[2795,1625],R10:[2710,1625],C4:[2710,1885],C5:[2955,1885],C18:[1545,1640],C19:[1665,1815]};
const PART = {U1:'NE5532D8 — U1B receiver L, U1A driver L',U2:'NE5532D8 — U2A receiver R, U2B driver R',Q1:'TIP31C (KSH31C DPAK) NPN',Q2:'TIP32C (KSH32C DPAK) PNP',Q3:'TIP31C NPN (right)',Q4:'TIP32C PNP (right)',D1:'1N4003 (S1D) bias diode',D2:'1N4003 (S1D) bias diode',R29:'110 Ω 1206 — shunts D1',R30:'110 Ω 1206 — shunts D2',R11:'10 Ω 1 W 2512 emitter',R12:'10 Ω 1 W 2512 emitter',R1:'3K01 bias pull-up',R13:'3K01 bias pull-down',C7:'470 µF 35 V output L',C14:'470 µF 35 V output R',R8:'100 kΩ bleed',P1:'PAN600 MLSS-100-6: LEFT/LEFT_NORM/RIGHT/RIGHT_NORM',P2:'PAN1000 MLSS-100-10: inputs + 24 V',P3:'PAN600 MLSS-100-6: outputs',JPH1:'Headphone jack footprint — DNI',C15:'22 µF VCC_HALF reservoir',R27:'100 kΩ divider top',R28:'100 kΩ divider bottom',C2:'47 µF input coupling (P)',C3:'47 µF input coupling (N)',R6:'100 kΩ input (P → −)',R5:'100 kΩ input (N → +)',R2:'20 kΩ feedback',R7:'20 kΩ to VCC_HALF',R9:'10 kΩ driver input',R10:'82.5 kΩ driver feedback',C4:'47 µF receiver output',C5:'47 µF driver input',C18:'1 nF RF shunt — DNI',C19:'1 nF RF shunt — DNI'};
function viewBlock(m){
  window.__microdriverActive=false; let sel='dr', part='Q1';
  m.innerHTML=`<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bi"></div>`)}</div></div>
   ${card('The board — POD6-ISS4-Assembly.pdf with part positions from the pick-and-place file (click a part)', `<div id="bo"></div><div id="pi" class="small" style="margin-top:6px"></div><p class="small muted">Board ≈ 4.28 × 1.89 in (scale from the drawing matched to the pick-and-place coordinates, 0.294 px per mil at 120 dpi). Made six-up on POD6-ISS4-PANEL.</p>`)}`;
  const draw=()=>{
    let s=`<svg viewBox="0 0 800 280" style="width:100%"><defs><marker id="mda" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    BW.forEach(([a,b])=>{ const A_=BL[a],B_=BL[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_); const clip=(bx,x,y,tx,ty)=>{const dx=tx-x,dy=ty-y; const k=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9, dy?(bx.h/2)/Math.abs(dy):1e9); return [x+dx*k,y+dy*k];}; [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.4:1.2}" marker-end="url(#mda)"/>`; });
    for (const k in BL){ const b=BL[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.4:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{sel=g.dataset.b; draw();});
    const b=BL[sel]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
    const P=(X,Y)=>[322+(X-2385)*0.294, 418-(Y-1780)*0.294];
    let o=`<svg viewBox="0 0 1258 557" style="width:100%;background:#fff;border-radius:6px"><image href="${ASSET}microdriver-board-asm.png" width="1258" height="557"/>`;
    for (const k in PNP){ const [x,y]=P(...PNP[k]); o+=`<g data-p="${k}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="${k[0]==='P'||k==='JPH1'||k[0]==='C'&&/C7|C14/.test(k)?34:20}" fill="${part===k?'rgba(31,122,77,.35)':'rgba(13,92,140,.08)'}" stroke="${part===k?'#1f7a4d':'rgba(13,92,140,.4)'}" stroke-width="2"/><title>${k}: ${PART[k]}</title></g>`; }
    m.querySelector('#bo').innerHTML=o+'</svg>';
    m.querySelectorAll('[data-p]').forEach(g=>g.onclick=()=>{part=g.dataset.p; draw();});
    m.querySelector('#pi').innerHTML=`<b>${part}</b> — ${PART[part]} <span class="muted">(pick-and-place X ${PNP[part][0]} mil, Y ${PNP[part][1]} mil)</span>`;
  };
  draw();
}

/* ---------------- schematics (redrawn) ---------------- */
function res(x,y,lbl,v,vert){ return vert? `<path d="M${x} ${y} v8 l6 3 -12 6 12 6 -12 6 12 6 -6 3 v8" fill="none" stroke="var(--ink)"/><text x="${x+10}" y="${y+24}" font-size="10.5" fill="var(--ink)">${lbl}</text><text x="${x+10}" y="${y+36}" font-size="10" fill="var(--ink2)">${v}</text>`
  : `<path d="M${x} ${y} h8 l3 -6 6 12 6 -12 6 12 6 -12 6 12 3 -6 h8" fill="none" stroke="var(--ink)"/><text x="${x+14}" y="${y-10}" font-size="10.5" fill="var(--ink)">${lbl} ${v}</text>`; }
function cap(x,y,lbl,v,vert){ return vert? `<path d="M${x} ${y} v14 M${x-9} ${y+14} h18 M${x-9} ${y+19} h18 M${x} ${y+19} v14" fill="none" stroke="var(--ink)"/><text x="${x+12}" y="${y+20}" font-size="10" fill="var(--ink)">${lbl} ${v}</text>`
  : `<path d="M${x} ${y} h14 M${x+14} ${y-9} v18 M${x+19} ${y-9} v18 M${x+19} ${y} h14" fill="none" stroke="var(--ink)"/><text x="${x}" y="${y-13}" font-size="10" fill="var(--ink)">${lbl} ${v}</text>`; }
function opamp(x,y,name,pins){ return `<path d="M${x} ${y-36} L${x} ${y+36} L${x+66} ${y} Z" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+6}" y="${y-16}" font-size="13" fill="var(--ink)">−</text><text x="${x+6}" y="${y+24}" font-size="13" fill="var(--ink)">+</text><text x="${x+18}" y="${y-40}" font-size="11" font-weight="700" fill="var(--ink)">${name}</text><text x="${x-14}" y="${y-22}" font-size="9" fill="var(--ink2)">${pins[0]}</text><text x="${x-14}" y="${y+30}" font-size="9" fill="var(--ink2)">${pins[1]}</text><text x="${x+68}" y="${y-6}" font-size="9" fill="var(--ink2)">${pins[2]}</text>`; }
const net=(x,y,t,anchor)=>`<text x="${x}" y="${y}" font-size="10.5" fill="var(--accent2)" text-anchor="${anchor||'start'}">${t}</text>`;
const gnd=(x,y)=>`<path d="M${x} ${y} v6 M${x-8} ${y+6} h16 M${x-5} ${y+10} h10 M${x-2} ${y+14} h4" stroke="var(--ink)" fill="none"/>`;
const SHEETS=[
  {name:'1 · Balanced receiver (U1B)', note:'LEFT channel. RIGHT is U2A with C8/C9, R14/R15, R16–R19, C10. Values from POD6-ISS4-S1.pdf. C18/C19 are DNI in parts_pod6.xls.', svg:()=>
    net(20,96,'LEFT_IN_P')+`<path d="M90 92 H150" stroke="var(--ink)"/>`+cap(150,92,'C2','47µ')+res(183,92,'R6','100K')+`<path d="M241 92 H380 V150" stroke="var(--ink)"/>`
   +net(20,226,'LEFT_IN_N')+`<path d="M90 222 H150" stroke="var(--ink)"/>`+cap(150,222,'C3','47µ')+res(183,222,'R5','100K')+`<path d="M241 222 H380 V196" stroke="var(--ink)"/>`
   +`<path d="M120 92 V120" stroke="var(--ink)"/>`+res(120,120,'R3','20K',true)+gnd(120,170)+`<path d="M110 222 V250" stroke="var(--ink)"/>`+res(110,250,'R4','20K',true)+gnd(110,300)
   +`<path d="M300 222 V260" stroke="var(--ink)"/>`+res(300,260,'R7','20K',true)+net(285,330,'VCC_HALF')
   +opamp(380,173,'U1B NE5532',['6','5','7'])+`<path d="M446 173 H600" stroke="var(--ink)"/>`+cap(600,173,'C4','47µ')+`<path d="M633 173 H700" stroke="var(--ink)"/>`+net(704,177,'LEFT → P1-1')
   +`<path d="M340 92 V50 H380" stroke="var(--ink)"/>`+res(380,50,'R2','20K')+`<path d="M438 50 H520 V173" stroke="var(--ink)"/><text x="380" y="30" font-size="10.5" fill="var(--ink)">C1 22p in parallel with R2</text>`
   +`<text x="40" y="400" font-size="12" fill="var(--ink)">Gain (P−N) → out = −R2/R6 = −0.2 · HF pole R2·C1 (22 pF across R2) = 362 kHz · LF pole C2·R6 = 0.034 Hz</text>`
   +`<text x="40" y="420" font-size="12" fill="var(--ink)">Leg impedances: P = R6‖R3 = 16.7 kΩ, N = (R5+R7)‖R4 = 17.1 kΩ · CMRR with 1 % resistors ≥ 20·log(1.2/0.04) ≈ 29.5 dB worst case</text>`},
  {name:'2 · Driver and output stage (U1A, ISS4)', note:'As drawn in POD6-ISS4-S1.pdf: U1A pin 1, the D1/D2 midpoint, the R29/R30 junction and the R11/R12 node are one net. Shown here with that net highlighted.', svg:()=>
    net(20,166,'LEFT_NORM')+`<path d="M90 162 H120" stroke="var(--ink)"/>`+cap(120,162,'C5','47µ')+res(153,162,'R9','10K')+`<path d="M211 162 H250" stroke="var(--ink)"/>`+opamp(250,185,'U1A NE5532',['2','3','1'])+net(200,230,'VCC_HALF → 3')
   +`<path d="M230 162 V90 H290" stroke="var(--ink)"/>`+res(290,90,'R10','82K5')+`<path d="M348 90 H660 V185" stroke="var(--ink)"/>`
   +`<path d="M470 30 V40" stroke="var(--ink)"/>`+res(470,40,'R1','3K01',true)+`<path d="M470 86 V105 H517" stroke="var(--ink)"/>`
   +`<path d="M470 105 V140" stroke="var(--ink)"/><polygon points="462,140 478,140 470,154" fill="var(--ink)"/><path d="M462 154 h16" stroke="var(--ink)"/><text x="440" y="150" font-size="10" fill="var(--ink)">D1</text><path d="M470 154 V185" stroke="var(--ink)"/>`
   +`<path d="M500 105 V120" stroke="var(--ink)"/>`+res(500,120,'R29','110R',true)+`<path d="M500 166 V185" stroke="var(--ink)"/>`
   +`<path d="M470 185 V220" stroke="var(--ink)"/><polygon points="462,220 478,220 470,234" fill="var(--ink)"/><path d="M462 234 h16" stroke="var(--ink)"/><text x="440" y="230" font-size="10" fill="var(--ink)">D2</text><path d="M470 234 V265 H517" stroke="var(--ink)"/>`
   +`<path d="M500 185 V200" stroke="var(--ink)"/>`+res(500,200,'R30','110R',true)+`<path d="M500 246 V265" stroke="var(--ink)"/><path d="M470 265 V280" stroke="var(--ink)"/>`+res(470,280,'R13','3K01',true)+gnd(470,326)
   +`<circle cx="530" cy="105" r="13" fill="none" stroke="var(--ink)"/><text x="590" y="100" font-size="10.5" fill="var(--ink)">Q1 TIP31C</text><path d="M538 95 L560 83 V30 H470" stroke="var(--ink)" fill="none"/><path d="M538 115 L560 127" stroke="var(--ink)"/>`+res(560,127,'R11','10R',true)+`<path d="M560 173 V197" stroke="var(--ink)"/>`
   +`<circle cx="530" cy="265" r="13" fill="none" stroke="var(--ink)"/><text x="590" y="280" font-size="10.5" fill="var(--ink)">Q2 TIP32C</text>`+res(560,197,'R12','10R',true)+`<path d="M560 243 L538 255 M538 275 L560 287 V320" stroke="var(--ink)"/>`+gnd(560,320)
   +`<path d="M316 185 H640" stroke="var(--bad)" stroke-width="3"/>`+[470,500,560].map(x=>`<circle cx="${x}" cy="185" r="4" fill="var(--bad)"/>`).join('')
   +net(400,26,'VCC_24V')+`<path d="M640 185 H670" stroke="var(--ink)"/>`+cap(670,185,'C7','470µ')+`<path d="M703 185 H740" stroke="var(--ink)"/>`+net(744,189,'LEFT_OUT')+net(744,203,'→ P3-1/4')+`<path d="M720 185 V220" stroke="var(--ink)"/>`+res(720,220,'R8','100K',true)+gnd(720,266)
   +`<text x="40" y="380" font-size="12" fill="var(--bad)">Red: the single net that ties U1A’s output to the emitter node. Q1 base is then at most V(R29‖D1) ≈ 0.42 V above its own emitter → off.</text>`
   +`<text x="40" y="400" font-size="12" fill="var(--ink)">Gain −R10/R9 = −8.25 (+18.3 dB) · HF pole R10·C6 = 87.7 kHz · LF: C5·R9 = 0.34 Hz · output: C7 into the load</text>`},
  {name:'3 · ISS3 (1996) output stage, for comparison', note:'From ISS3/POD6.pdf (OCT 24, 1996): U1A drives only the diode/RD midpoint; the emitters reach the output through R11/R12, and R10 feedback is taken after them. RD1/RD2 were 120R, C7 1000/25, TIPP29B/TIP30B.', svg:()=>
    opamp(150,185,'U1A NE5532',['2','3','1'])+`<path d="M216 185 H300" stroke="var(--accent)" stroke-width="3"/><circle cx="300" cy="185" r="4" fill="var(--accent)"/><path d="M300 130 V240" stroke="var(--ink)"/><text x="250" y="160" font-size="10" fill="var(--ink)">D1 ‖ RD1 120R</text><text x="250" y="222" font-size="10" fill="var(--ink)">D2 ‖ RD2 120R</text>`
   +`<circle cx="360" cy="130" r="13" fill="none" stroke="var(--ink)"/><path d="M300 130 H347" stroke="var(--ink)"/><text x="378" y="124" font-size="10.5" fill="var(--ink)">Q1 TIPP29B</text><circle cx="360" cy="240" r="13" fill="none" stroke="var(--ink)"/><path d="M300 240 H347" stroke="var(--ink)"/><text x="378" y="254" font-size="10.5" fill="var(--ink)">Q2 TIP30B</text>`
   +`<path d="M368 140 L390 152 H430" stroke="var(--ink)"/>`+res(430,152,'R11','*')+`<path d="M368 230 L390 218 H430" stroke="var(--ink)"/>`+res(430,218,'R12','*')+`<path d="M488 152 H520 V218 H488 M520 185 H600" stroke="var(--ink)"/>`+cap(600,185,'C7','1000/25')+net(640,189,'out')
   +`<path d="M520 152 V70 H120 V162 H150" stroke="var(--accent)" stroke-width="2"/><text x="200" y="64" font-size="10.5" fill="var(--accent)">R10 82K feedback from the true output</text>`
   +`<text x="40" y="330" font-size="12" fill="var(--ink)">* “POD6 — USE 10 OHM 3 WATT FOR HEADSET MODULE” · “POD6A — USE 1.5 OHM 1/4 WATT FOR 8 OHM LOADS” (notes on the ISS3 sheet)</text>`
   +`<text x="40" y="350" font-size="12" fill="var(--ink)">Headphone jack J1 SN49B-12B marked “JACK NOT INSTALLED”, “0 dBu”.</text>`},
  {name:'4 · Bias, connectors, jack', note:'VCC_HALF network and the three headers, from POD6-ISS4-S1.pdf. Header part numbers from parts_pod6.xls.', svg:()=>
    net(40,40,'VCC_24V')+`<path d="M70 46 V70" stroke="var(--ink)"/>`+res(70,70,'R27','100K',true)+`<path d="M70 120 V140 H200" stroke="var(--ink)"/>`+res(70,140,'R28','100K',true)+gnd(70,190)+cap(130,140,'C23','100n',true)+gnd(130,173)+cap(200,140,'C15','22µ',true)+gnd(200,173)+net(210,136,'VCC_HALF = 12 V')
   +[['P1 PAN600 (MLSS-100-6)',['LEFT','LEFT_NORM','GND','RIGHT','RIGHT_NORM','GND']],['P2 PAN1000 (MLSS-100-10)',['LEFT_IN_P','LEFT_IN_N','GND','RIGHT_IN_P','RIGHT_IN_N','GND','VCC_24V','GND','nc','nc']],['P3 PAN600 (MLSS-100-6)',['LEFT_OUT','RIGHT_OUT','GND','LEFT_OUT','RIGHT_OUT','GND']]].map(([n,p],k)=>{ const x=340+k*170; return `<text x="${x}" y="40" font-size="11" font-weight="700" fill="var(--ink)">${n}</text>`+p.map((s,i)=>`<rect x="${x}" y="${50+i*20}" width="22" height="18" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+11}" y="${63+i*20}" font-size="10" text-anchor="middle" fill="var(--ink)">${i+1}</text><text x="${x+28}" y="${63+i*20}" font-size="10" fill="var(--accent2)">${s}</text>`).join(''); }).join('')
   +`<text x="40" y="300" font-size="11" font-weight="700" fill="var(--ink)">JPH1 HEADPHONE-JACK (DNI)</text><text x="40" y="318" font-size="10.5" fill="var(--ink)">T → LEFT_OUT · R → RIGHT_OUT · S → GND · TS / RS switch contacts not connected</text>
     <text x="40" y="350" font-size="11" font-weight="700" fill="var(--ink)">RJ-45 variant (pod6 rj-45 pinout.png)</text><text x="40" y="368" font-size="10.5" fill="var(--ink)">1 L+ (wht/org) · 2 L− (org) · 3 R+ (wht/grn) · 4 GND (blu) · 6 R− (grn) · 5/7/8 NC</text>`},
];
function viewSchem(m){
  window.__microdriverActive=false; let i=0;
  m.innerHTML=card('Schematic set — redrawn from POD6-ISS4-S1.pdf and ISS3/POD6.pdf (not the original Altium / P-CAD drawings)', `<div id="sb" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p>`);
  const draw=()=>{ m.querySelector('#sb').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join(''); m.querySelectorAll('#sb button').forEach(b=>b.onclick=()=>{i=+b.dataset.i; draw();});
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 880 440" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="4" y="4" width="872" height="432" fill="none" stroke="var(--line)"/><g fill="none">${SHEETS[i].svg()}</g><text x="870" y="430" text-anchor="end" font-size="10" fill="var(--ink2)">MICRO DRIVER POD6-ISS4 · sheet ${i+1}/${SHEETS.length} · redrawn 2026|59</text></svg>`;
    m.querySelector('#sn').textContent=SHEETS[i].note; };
  draw();
}

/* ---------------- signal path (hardware product: no software) ---------------- */
function viewPath(m){
  window.__microdriverActive=false;
  m.innerHTML=`${card('Signal path, stage by stage (live)', `<div id="sp"></div>${controls()}`)}<div class="grid2">${card('Level diagram (LEFT)', `<canvas id="lvd"></canvas>`)}${card('Frequency response, source → load', `<canvas id="fr"></canvas>`)}</div>
   <p class="small muted">The microDriver has no processor or firmware. This tab follows the analog signal stage by stage, as the brief asks for hardware-only products.</p>`;
  bindControls(m);
  SIM.on('time', ()=>{
    const a=analysis();
    m.querySelector('#sp').innerHTML=stageTable();
    // level diagram
    const {c,w}=SIM.canvas(m.querySelector('#lvd'),220); const st=[['in',dBu(a.vin)],['U1B',dBu(a.v1)],['pot',dBu(a.v1*potGain().g)],['U1A',dBu(a.v2)],['load',dBu(a.vL)]];
    const Y=v=>200-((Math.max(-40,Math.min(30,v))+40)/70)*180; c.strokeStyle=SIM.css('--grid'); c.font='10px sans-serif'; c.fillStyle=SIM.css('--ink2');
    for(let d=-40;d<=30;d+=10){ c.beginPath(); c.moveTo(40,Y(d)); c.lineTo(w-10,Y(d)); c.stroke(); c.fillText(d+' dBu',2,Y(d)+3); }
    const clipU = dBu((K.VCC/2-K.SWING)/Math.SQRT2); c.strokeStyle=SIM.css('--bad'); c.setLineDash([5,3]); c.beginPath(); c.moveTo(40,Y(clipU)); c.lineTo(w-10,Y(clipU)); c.stroke(); c.setLineDash([]); c.fillStyle=SIM.css('--bad'); c.fillText('rail clip '+clipU.toFixed(1)+' dBu',w-120,Y(clipU)-4);
    c.strokeStyle=SIM.css('--accent'); c.lineWidth=2; c.beginPath(); st.forEach(([n,v],i)=>{ const x=60+i*(w-100)/4; i?c.lineTo(x,Y(v)):c.moveTo(x,Y(v)); }); c.stroke(); c.lineWidth=1;
    st.forEach(([n,v],i)=>{ const x=60+i*(w-100)/4; c.fillStyle=SIM.css('--accent'); c.beginPath(); c.arc(x,Y(v),4,0,7); c.fill(); c.fillStyle=SIM.css('--ink'); c.fillText(n+' '+(isFinite(v)?v.toFixed(1):'—'),x-20,215); });
    // frequency response
    const f2=SIM.canvas(m.querySelector('#fr'),220), cc=f2.c, W=f2.w, RL=LOADS[D.load].R; const {Rth}=potGain();
    const H=f=>{ const s=(fc)=>f/Math.sqrt(f*f+fc*fc), l=(fc)=>1/Math.sqrt(1+(f/fc)*(f/fc));
      return s(1/(2*Math.PI*K.Cin*K.Rin))*s(1/(2*Math.PI*K.Cout1*(K.POT+K.R9)))*s(1/(2*Math.PI*K.C5*(K.R9+Rth)))*s(1/(2*Math.PI*K.C7*RL))*l(1/(2*Math.PI*K.Rf*K.Cf1))*l(1/(2*Math.PI*K.R10*K.C6)); };
    const FX=f=>40+(Math.log10(f)-0)/(6-0)*(W-50), FY=d=>20+(-d)/30*180;
    cc.strokeStyle=SIM.css('--grid'); cc.fillStyle=SIM.css('--ink2'); cc.font='10px sans-serif';
    [1,10,100,1e3,1e4,1e5,1e6].forEach(f=>{ cc.beginPath(); cc.moveTo(FX(f),20); cc.lineTo(FX(f),200); cc.stroke(); cc.fillText(f>=1e3?f/1e3+'k':f,FX(f)+2,212); });
    [0,-3,-10,-20,-30].forEach(d=>{ cc.beginPath(); cc.moveTo(40,FY(d)); cc.lineTo(W-10,FY(d)); cc.stroke(); cc.fillText(d+' dB',4,FY(d)+3); });
    cc.strokeStyle=SIM.css('--accent2'); cc.lineWidth=2; cc.beginPath(); for(let p=0;p<=300;p++){ const f=Math.pow(10,6*p/300); const d=20*Math.log10(H(f)); p?cc.lineTo(FX(f),FY(Math.max(-30,d))):cc.moveTo(FX(f),FY(Math.max(-30,d))); } cc.stroke(); cc.lineWidth=1;
    cc.fillStyle=SIM.css('--ink'); cc.fillText(`relative to midband · load ${RL} Ω: −3 dB at ${(1/(2*Math.PI*K.C7*RL)).toFixed(2)} Hz (C7)`,44,14);
  });
}

/* ---------------- findings ---------------- */
function viewFindings(m){
  window.__microdriverActive=false;
  const b=biasAt(12);
  m.innerHTML=card('What the microDriver is up to — findings from the archive', `<ol>
   <li><b>ISS4's output transistors are bypassed as drawn.</b> In <span class="mono">POD6-ISS4-S1.pdf</span>, U1A pin 1 connects to the D1/D2 midpoint, the R29/R30 junction <i>and</i> the R11/R12 emitter node (junction dots on all four). Q1's base can then sit only V(R29‖D1) above its own emitter. At idle that is R1's ${(b.IR1*1000).toFixed(1)} mA × 110 Ω ≈ ${b.vb.toFixed(2)} V, so Q1 conducts about ${(b.ic*1e6).toFixed(1)} µA. The NE5532 drives the headphones alone and current-limits near 38 mA: about 1.2 V peak, or 23 mW, into 32 Ω. In the 1996 ISS3 drawing (<span class="mono">ISS3/POD6.pdf</span>) the op-amp drives only the bias midpoint, and feedback R10 is taken after R11/R12. That is a working class-AB booster. Whether the ISS4 copper repeats the schematic could not be checked (the PcbDoc is binary). The Simulator tab lets you switch between the two topologies.</li>
   <li><b>The README calls the 1N4003s “protection” and the 470 µF / 47 µF parts “bulk”.</b> The schematic shows D1–D4 as output-stage bias diodes, C7/C14 470 µF as output coupling capacitors, and the 47 µF parts as signal couplings. The only bulk part is C15 (22 µF on VCC_HALF).</li>
   <li><b>“PAN600” / “PAN1000” are connectors, not 600 Ω / 1 kΩ options.</b> The README infers impedance variants from these labels. In <span class="mono">parts_pod6.xls</span> they are the 6-way and 10-way locking headers MLSS-100-6 / MLSS-100-10. The names come from the Panduit-style footprint.</li>
   <li><b>No volume control on the PCB, yet the photo shows a knob.</b> P1 sends the receiver output out (LEFT, pin 1) and takes the driver input back in (LEFT_NORM, pin 2). The front knob (.250 in hole in POD6-001) is presumably a pot wired across that loop, so this model treats it as one ${inf}. Without the pot, a jumper on P1 gives a fixed overall gain of 0.2 × 8.25 = 1.65 (+4.35 dB).</li>
   <li><b>The receiver inverts, and the driver inverts back.</b> LEFT_IN_P feeds R6 into the <i>inverting</i> input, so stage 1 is −0.2. Stage 2 is −8.25, which makes the overall polarity correct. Anyone who used stage 1 alone (P1 LEFT) would get inverted polarity.</li>
   <li><b>The input is lightly loaded and slightly unbalanced.</b> R3/R4 (20 kΩ to ground) on each leg give 16.7 kΩ on P and 17.1 kΩ on N. The 1 nF RF shunts C18–C21 are DNI.</li>
   <li><b>The headphone jack on the board is DNI.</b> JPH1 (TRS with TS/RS switches, unconnected) is “DNI” in the BOM. The outputs leave on P3, twice (pins 1/2 and 4/5), presumably to the panel jack and to a second outlet ${inf}. ISS3's J1 was also marked “JACK NOT INSTALLED”.</li>
   <li><b>Small BOM slips.</b> The 20 kΩ line in BOM_MAIN says “1/8W” in its description and “1/4W” in its part number. The transistor part numbers are TIP29/SM and TIP30/SM, but the values are TIP31C/TIP32C (KSH31C/KSH32C DPAK). ISS3 used TIPP29B/TIP30B.</li>
   <li><b>Turn-on: U1A rails, and the step reaches the headphones.</b> VCC_HALF ramps slowly (100 kΩ/100 kΩ, 22 µF, τ = 1.11 s; ISS3 used 10 kΩ/10 kΩ, τ ≈ 0.11 s). U1B tracks it cleanly, because its input caps charge in common mode. U1A's input capacitor C5, though, has to charge to VCC_HALF through R9. With R10 = 82.5 kΩ that ≈0.5 mA charging current asks for about 42 V, so U1A sits on its top rail for more than the first second. The model gives a bump of ${turnOn('hp32').peak.toFixed(2)} V into 32 Ω (current-limited), ${turnOn('hp300').peak.toFixed(1)} V into 300 Ω and ${turnOn('line600').peak.toFixed(1)} V into a 600 Ω line input. This assumes the 24 V supply rises instantly ${inf}. A slow wall supply, or a muting relay, would soften it. Neither is shown in the archive.</li>
   <li><b>Misfiled.</b> The archive audit already notes that this POD-series product lives outside <span class="mono">#POD #SERIES</span>. Its panels and bracket (POD6-001/002/003) are in <span class="mono">#POD #SERIES/POD PARTS - #Mechanical #DA #2016</span>. The silk for POD6-003 calls it “POD6C HEADPHONE AMP”.</li></ol>`)
  + card('Assumptions in this simulation', `<ul class="small">
   <li>NE5532: ideal gain, output swing to within 2 V of each rail, current limit ±38 mA (typical, datasheet). Slew rate and noise are ignored.</li>
   <li>Volume pot 10 kΩ log taper between P1-1 and P1-2 ${inf}. The supply is assumed to rise instantly; only VCC_HALF ramps.</li>
   <li>1N4003 diode model (Is ≈ 3 nA, n ≈ 1.9) and TIP31C Is ≈ 1e-13 A, for the bias estimate ${inf}.</li>
   <li>Couplings are first-order high-passes. The ISS3 booster limit is (swing − 0.7 V) × RL / (RL + Re).</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>microDriver - POD6 - #Master turned into microdriver/POD6 - #RD #RD76/SMT_Upgrade/backup12-final/POD6-ISS4/POD6-ISS4-S1.pdf, parts_pod6.xls, POD6-ISS4-Assembly.pdf, Pick Place for POD6-ISS4-PANEL.csv</li><li>…/SMT_Upgrade/ISS3/POD6.pdf · …/pod6 rj-45 pinout.png · …/plot.log</li><li>#POD #SERIES/POD PARTS - #Mechanical #DA #2016/SILKS/POD6-001/POD6-001-SILK CURVE).pdf, POD6-001.jpg · SILKS/POD6-001& POD6-002 ISS.2(FINAL CURVE).cdr · PDF\`S/POD6-001 ISS 5, POD6-002 ISS 2</li></ul>`);
}

SIM.register({
  id:'microdriver', name:'microDriver · POD6 ISS4 stereo line / headphone driver (2016|49)', duration:1,
  product:'microDriver (POD6)', year:2016, family:'Monitors, meters & tools',
  folder:'microDriver - POD6 - #Master turned into microdriver',
  summary:'The surface-mount re-spin (RD76, POD6-ISS4) of Ward-Beck’s 1996|29 POD6 headphone amplifier. Each channel has an NE5532 balanced receiver (−14 dB), then an NE5532 driver (+18.3 dB) into a 470 µF output capacitor, all on a single +24 V supply. The model follows the level, headroom and turn-on through every stage, using the schematic values.',
  highlights:['Real POD6-001 / POD6-002 silkscreen panels','Power-on: VCC_HALF ramp and U1A rail-out','Headroom and current limit for each load','ISS4 vs ISS3 output stage: the TIP transistors never turn on in ISS4','Clickable board from the assembly drawing and pick-and-place'],
  depth:'Hardware model',
  stepUnits:[ {label:'1 tone cycle', period:()=>1/D.freq}, {label:'1 ms', period:()=>0.001}, {label:'10 ms', period:()=>0.01}, {label:'1 sample @ 96k', period:()=>1/K.SR}, {label:'100 ms', period:()=>0.1} ],
  zooms:[[1,'1 s (power-on)'],[0.1,'100 ms'],[0.01,'10 ms'],[0.004,'4 ms (4 cycles at 1 kHz)'],[0.001,'1 ms']],
  defaultZoom:0,
  init(){ KEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial', render:viewTut},
    {id:'second', label:'One second', render:viewSecond},
    {id:'block', label:'Block diagram & board', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Signal path', render:viewPath},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
