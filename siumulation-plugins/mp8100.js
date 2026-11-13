/* =====================================================================
   MP (8100) series — 8100-chassis analog VU / PPM meter panels (Ward-Beck Systems, 1996|29 – 2016|49)
   Plugin for the WBS Device Simulator. Hardware only, no firmware.

   Sources (all in this archive, folder "#MP (8100) #SERIES"):
   - 8100 CHASSIS - #ARTWORK #DA #2016/8100MP-FRONT-SILK (CURVE).CDR + its CorelDRAW PDF export, 8100MP-REAR-SILK (CURVE).CDR
       (May 13/15) → assets/mp8100-front.svg (panel x 0–8.425″; the CDR keeps the title as live Hobo Std text, so the glyph
       outlines come from the CorelDRAW-exported PDF of the same file) and assets/mp8100-rear.svg (16.7″ × 3.27″, legend
       + cut-out guides from the CDR), 200 px/inch (2026|59 artwork pass; the older PNGs are no longer used)
   - 8100 CHASSIS - #Mechanical #DA #2016/PDF`S/8100MP-1…4 (RACK MOUNT PANEL).pdf, 8100-REAR ISS 2 (REAR PANEL).pdf
       → panel 19.000″ × 3.470″, meter cut-outs 3.100″ × 1.600″ centred 2.070″ up, rear 16.700″ × 3.270″
   - 8100 CHASSIS - #ARTWORK #DA #2016/Pics/MP4(VU) Front.jpg, MP2(PPM) Front.jpg, MP2(1V1P).jpg, MP4 Rear.jpg
   - MP4 METER PANEL - #Master/MP4-1 FINAL BOM.xlsx, BOM Structure MP4-1.pdf (SA-MP4-1 power supply & pad board)
   - PCB/MP4-1.DSN, MP4-1.PCB (1999), PCB/mp4-2.net (2002 relay board netlist), PCB/SA14-268 (VU light bar)
   - PCB/14-060/PPMDR_ISS5 (PPM driver; the ballistics core below is shared with ppm-driver.js)
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const ASSET = 'siumulation-plugins/assets/';
let KEY = '';
function logAct(name, lines){ M.log.unshift({name, t:SIM.t, lines}); if (M.log.length>40) M.log.length=40; SIM.refresh(); }

/* ======== PPM driver 14-060 core: identical derivation to ppm-driver.js ======== */
/* ---------------- component values (PPM_DRIVER.pdf / PPM_DRIVER.xls) ---------------- */
const C = {
  R3:15e3, R4:15e3, R5:270e3, R7:6490, R8:3570, R13:15e3, R14:15e3, R15:82.5e3, R16:82.5e3, R64:50e3,
  R17:10e3, R18:10e3, R19:10e3, R20:10e3, R21:10e3, R22:5e3, R29:15e3, R62:47.5e3, C9:150e-12, R63:15e3, R36:47.5e3,
  R49:1e3, R50:1e3, R51:1e3, R52:22.1e3, R53:2.2e6, R54:2.2e6, R55:2.2e6, C4:1e-6, R56:3320,
  R60:11e3, R61:12e3, Rm:600, Ifsd:1e-3, Vbe:0.65,
};
/* the log-law ladder in U1B's feedback: Qn conducts when U1B's output swings below its base by Vbe;
   the emitter resistor sets the extra feedback conductance, the collector resistor limits the current */
const LADDER = [
  {q:'Q1', set:'R23', lab:'SET 2', rb:'R30', rc:'R37', Rc:220e3, re:'R43', Re:62e3,  mark:-4},
  {q:'Q2', set:'R24', lab:'SET 3', rb:'R31', rc:'R38', Rc:100e3, re:'R44', Re:47.5e3,mark:0},
  {q:'Q3', set:'R25', lab:'SET 4', rb:'R32', rc:'R39', Rc:100e3, re:'R45', Re:30.1e3,mark:4},
  {q:'Q4', set:'R26', lab:'SET 5', rb:'R33', rc:'R40', Rc:30.1e3,re:'R46', Re:10e3,  mark:8},
  {q:'Q5', set:'R27', lab:'SET 6', rb:'R34', rc:'R41', Rc:30.1e3,re:'R47', Re:10e3,  mark:12},
  {q:'Q6', set:'R28', lab:'SET 7', rb:'R35', rc:'R42', Rc:22.1e3,re:'R48', Re:4.75e3,mark:null},
];
/* Sensitivity options: the schematic note "For other sensitivity settings substitute R7 with…" */
const par = (a,b)=> !isFinite(a)? b : !isFinite(b)? a : a*b/(a+b);
const SENS = {
  s4:   {lab:'+4 dBu — R7 6K49 via the R65 0R link (as built: H1, R8 DNI)', R:6490, nom:4},
  s8x:  {lab:'"+8 dBu" — jumper H1 2–3 + R8 3K57 fitted, R65 left in (R7‖R8)', R:par(6490,3570), nom:8},
  s8:   {lab:'+8 dBu — R65 removed, H1 2–3, R8 3K57', R:3570, nom:8},
  s0:   {lab:'0 dBu — R7 = 14K3', R:14300, nom:0},
  s14:  {lab:'+14 dBu — R7 = 1K58', R:1580, nom:14},
  sm6:  {lab:'−6 dBu — R7 open (= 0 dB @ 150 Ω)', R:Infinity, nom:-6},
};
/* The R7 table is consistent with a source of 23.5 kΩ effective series resistance into a 36 kΩ load
   (least-squares fit of all six table entries, error < 0.1 dB). */
const FIT = { RS:23.5e3, RL:36e3 };
/* Needle movements: 2nd-order fits to the step curves on the Sifam "Comparison of FR/PPM responses" chart. */
const MOVES = {
  PPM:  {lab:'Sifam full-specification PPM (600 Ω)', Rm:600, zeta:0.69, wn:28.9, src:'peaks ≈105 % at 0.15 s'},
  FR29: {lab:'Sifam Presentor FR29 fast response (465 Ω)', Rm:465, zeta:0.74, wn:17.3, src:'peaks ≈103 % at 0.27 s'},
  T29:  {lab:'Sifam standard 1 mA Type 29 (465 Ω)', Rm:465, zeta:1.0, wn:9.9, src:'no overshoot, 50 % at 0.17 s'},
  VU:   {lab:'ANSI C16.5 VU movement (for comparison)', Rm:600, zeta:0.81, wn:0, src:'99 % at 300 ms, ≈1.3 % overshoot'},
};
(function fitVU(){ // smallest ωn whose step response first reaches 99 % at 0.300 s
  const z=MOVES.VU.zeta; const y=(w,t)=>{ const wd=w*Math.sqrt(1-z*z); return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+z/Math.sqrt(1-z*z)*Math.sin(wd*t)); };
  let lo=2, hi=60; for (let k=0;k<50;k++){ const m=(lo+hi)/2; let hit=false; for(let t=0;t<=0.3;t+=0.0005) if (y(m,t)>=0.99){hit=true;break;} if(hit) hi=m; else lo=m; } MOVES.VU.wn=hi; })();

const MARKS = [-12,-8,-4,0,4,8,12];
const dialPos = m => 0.12 + (m+12)/24*0.80;    // −12 at 12 %, +12 at 92 % of the arc — inferred from the MP2 (PPM) photo
const dialDb  = d => (d-0.12)/0.80*24 - 12;

/* ---------------- device state ---------------- */
const D = {
  supply:16.2, sens:'s4', R64:25e3, kt:0.875, T:[1.3,1.8,2.4,2.9,3.4,4.0], C4:1e-6,
  level:4, freq:5000, stim:'burst', burstMs:10, move:'FR29', log:[], sel:'U1B', calibrated:false,
};
function rails(){
  const VCC = D.supply - 0.75;                                     // D7 1N4003; REG1 DNI, R70 0R bypass
  const VH = VCC*C.R61/(C.R60+C.R61) - C.Vbe;                      // R60/R61 divider + Q8 emitter follower
  const Voff = (VCC-VH)*C.R50/(C.R50+C.R52)*C.R55/C.R53;           // R52/R50 → R53 into U3B's summing node
  const Vmax = Math.min(VH-1.5, VCC-VH-1.5);                       // LF353 output swing (≈1.5 V from a rail) — inferred
  return {VCC, VH, Voff, Vmax};
}
const mv = ()=> MOVES[D.move];
const Rload = ()=> C.R56 + mv().Rm;
const Vt = m => rails().Voff + dialPos(m)*C.Ifsd*Rload();           // C4 voltage that puts the needle on mark m
const atten = R => { const Rp = isFinite(R)? R*FIT.RL/(R+FIT.RL) : FIT.RL; return Rp/(FIT.RS+Rp); };
const Gd = ()=> (C.R16 + D.R64)/C.R13;                              // U1A: (R16 + R64 rheostat) / R13
let KABS = 1;                                                       // absolute front-end scale — inferred (see calibrate)
const xPeak = dBu => 0.7746*Math.SQRT2*Math.pow(10,dBu/20)*atten(SENS[D.sens].R)*Gd()*KABS;

/* log shaper: input current i into U1B's summing node → |Vs| below VCC_HALF */
function fI(V, T){ let i = V/C.R36; for (let n=0;n<6;n++){ if (V>T[n]){ const L=LADDER[n]; const isat=Math.max(0,T[n]-C.Vbe+0.4)/L.Rc; i += Math.min((V-T[n])/L.Re, isat); } } return i; }
function shaper(i, T, Vmax){ if (i<=0) return 0; if (fI(Vmax,T)<=i) return Vmax; let lo=0, hi=Vmax; for (let k=0;k<44;k++){ const m=(lo+hi)/2; if (fI(m,T)<i) lo=m; else hi=m; } return (lo+hi)/2; }
const steadyV = dBu => shaper(xPeak(dBu)*D.kt/C.R63, D.T, rails().Vmax);
function activeQ(V){ let n=0; for (let k=0;k<6;k++) if (V>D.T[k]) n++; return n; }
function readingDb(Vc){ const r=rails(); const d = Math.max(0, Math.min(r.Vmax, Vc-r.Voff))/Rload()/C.Ifsd; return dialDb(d); }

/* factory calibration — the procedure is not documented (README), so this is an inferred one:
   CAL / THLD set the overall gain, then SET 2…SET 7 are trimmed so tones at −12, −10 … +12 dB
   (re line-up) read true. Each SET moves both where its transistor turns on and how much current it
   can add (its collector resistor limits it), so the trims interact; we fit them by coordinate descent. */
function lawCost(S){ let e=0; for (let a=-12;a<=12;a+=2){ const d=readingDb(steadyV(S+a))-a; e+=d*d*((a%4)?0.5:1); } return e; }
function calibrate(silent){
  const S = SENS[D.sens].nom, r = rails();
  let P = D.kt*Gd()*KABS; const setP = p=>{ D.kt = p/(Gd()*KABS); };
  const lo=[C.Vbe+0.02], hi=[r.Vmax];
  for (let pass=0; pass<7; pass++){
    const span = Math.pow(0.55, pass);
    // overall gain
    { let best=P, be=Infinity; for (let k=-30;k<=30;k++){ const p=P*Math.pow(10, k*span*0.6/30); setP(p); const e=lawCost(S); if (e<be){be=e;best=p;} } P=best; setP(P); }
    for (let n=0;n<6;n++){ let best=D.T[n], be=Infinity; const c0=D.T[n], w=(r.Vmax-C.Vbe)*span*0.5;
      for (let k=-30;k<=30;k++){ const v=Math.max(lo[0],Math.min(hi[0], c0+w*k/30)); D.T[n]=v; const e=lawCost(S); if (e<be){be=e;best=v;} } D.T[n]=best; }
  }
  // split the overall gain between CAL (R64) and THLD (R22 divider 0.75–1)
  D.R64 = Math.max(0, Math.min(C.R64, P/(0.875*KABS)*C.R13 - C.R16)); D.kt = Math.max(0.75, Math.min(1, P/(Gd()*KABS)));
  D.calibrated = true; KEY='';
  if (!silent) logAct('Factory calibration (inferred procedure)', [
    `Sensitivity ${SENS[D.sens].lab}: line-up ${S>=0?'+':''}${S} dBu reads 0`,
    `CAL R64 → ${(D.R64/1e3).toFixed(1)} kΩ: U1A gain (R16+R64)/R13 = ${Gd().toFixed(2)} (${(20*Math.log10(Gd())).toFixed(1)} dB); THLD R22 divider → ${D.kt.toFixed(3)}`,
    ...LADDER.map((L,n)=>`${L.lab} ${L.set}: ${L.q} base ${(D.T[n]-C.Vbe).toFixed(2)} V below VCC_HALF → on above |Vs| = ${D.T[n].toFixed(2)} V, adds up to ${(Math.max(0,D.T[n]-C.Vbe+0.4)/L.Rc*1e6).toFixed(0)} µA (${L.rc} ${L.Rc/1e3}k)`),
    `Residual law error ${Math.sqrt(lawCost(S)/13).toFixed(2)} dB rms over −12…+12`]);
}
function initK(){ // scale the front end so that the as-built board calibrates with CAL and THLD at mid-travel
  D.sens='s4'; D.R64=25e3; KABS=1; D.kt=0.875;
  const need = Vt(-8)*C.R63/(C.R36*0.875); KABS = need / xPeak(4-8);   // first guess: base slope alone
  calibrate(true);
  const P = D.kt*Gd()*KABS; D.R64=25e3; KABS = P/(0.875*Gd()); D.kt=0.875; KEY='';
}

/* ======== end of shared core ======== */

/* ---------------- panel configurations (8100MP-1…4 drawings + photos) ---------------- */
const CFG = {
  MP4V:  {lab:'MP4 (VU) — four VU meters (photo)',        draw:'8100MP-4', x:[3.455,7.485,11.515,15.545], types:['VU','VU','VU','VU']},
  MP2P:  {lab:'MP2 (PPM) — two PPM meters (photo)',       draw:'8100MP-2', x:[6.477,12.522], types:['PPM','PPM']},
  MP2VP: {lab:'MP2 (1V1P) — one VU + one PPM (photo)',     draw:'8100MP-2', x:[6.477,12.522], types:['VU','PPM']},
  MP4PV: {lab:'MP4 2P2V — two PPM + two VU (assembly DSN)',draw:'8100MP-4', x:[3.455,7.485,11.515,15.545], types:['PPM','PPM','VU','VU']},
  MP3V:  {lab:'MP-3 — three meters (drawing only)',        draw:'8100MP-3', x:[3.455,9.500,15.545], types:['VU','VU','VU']},
  MP1V:  {lab:'MP-1 — one meter (drawing only)',           draw:'8100MP-1', x:[9.500], types:['VU']},
};
const M = { cfg:'MP2VP', power:true, relay:true, level:4, freq:1000, stim:'prog', burstMs:10,
  ch:[0,1,2,3].map(k=>({off:[0,-3,-6,2][k], cal:0, conn:true})), sel:0, log:[] };
const types = ()=> CFG[M.cfg].types;

/* ---------------- VU channel (SA-MP4-1 + VU movement) ---------------- */
/* SA-MP4-1 per channel (BOM): 4 × 13K (R11–R13, R15) → unity difference buffer on NE5532N; R16 3K6 = the standard
   VU build-out resistor; R14 3K32; TRIM 50K (rear CAL hole). Topology from the values ${inf}: the 1999 netlist is in a
   binary OrCAD file. A VU movement is a 3900 Ω full-wave rectifier instrument: 0 VU = +4 dBu through 3600 Ω. */
const VUREF = 1.228*Math.SQRT2*2/Math.PI;           // mean |v| of a +4 dBu sine
const VU0 = Math.pow(10,-3/20);                     // 0 VU sits at 70.8 % of the arc (+3 VU = full scale)
const vuPos = vu => VU0*Math.pow(10, vu/20);
const vuOf  = th => th>0.005? 20*Math.log10(th/VU0) : -40;
const VUMARKS = [-20,-10,-7,-5,-3,-2,-1,0,1,2,3];
const PAD = -4;  // MP4-2 relay de-energised: SOT pad (R2/RV1/R3/R4) — value not in the netlist (SOT) ${inf}

/* ---------------- stimulus shared by every input ---------------- */
const STIM = {
  prog:   {lab:'Programme-like (synthetic speech)', env:t=>{ const s=Math.max(0,Math.sin(2*Math.PI*4.3*t)); const k=0.18+0.82*s*s*(0.55+0.45*Math.sin(2*Math.PI*0.9*t+1)); return (t>0.62&&t<0.625)?1.6:k; }},
  tone:   {lab:'Tone on at 50 ms', env:t=> t>=0.05?1:0},
  burst:  {lab:'Tone burst at 100 ms', env:t=> (t>=0.1&&t<0.1+M.burstMs/1000)?1:0},
  release:{lab:'Tone off at 50 ms', env:t=> t<0.05?1:0, pre:true},
};
function carrier(t){ if (M.stim!=='prog') return Math.sin(2*Math.PI*M.freq*t);
  return 1.8*(0.55*Math.sin(2*Math.PI*220*t)+0.3*Math.sin(2*Math.PI*660*t+1.1)+0.25*Math.sin(2*Math.PI*1530*t+2.3)+0.12*Math.sin(2*Math.PI*3300*t+0.4)); }  // scaled so programme peaks near line-up — inferred

const FS = 48000;
let SKEY='', SR=null;
function chLevel(k){ return M.level + M.ch[k].off; }
function simulate(){
  const key=[M.cfg,M.power,M.relay,M.level,M.freq,M.stim,M.burstMs,JSON.stringify(M.ch),D.move,D.T.join(','),D.kt,D.R64].join('|');
  if (key===SKEY) return SR; SKEY=key;
  const N=FS, dt=1/FS, env=STIM[M.stim].env, pre=!!STIM[M.stim].pre, r=rails();
  const tabN=2048, tV=new Float32Array(tabN), tI=new Float32Array(tabN); for (let k=0;k<tabN;k++){ tV[k]=r.Vmax*k/(tabN-1); tI[k]=fI(tV[k],D.T); }
  const look=i=>{ if(i<=0) return 0; if(i>=tI[tabN-1]) return tV[tabN-1]; let lo=0,hi=tabN-1; while(hi-lo>1){ const m=(lo+hi)>>1; if(tI[m]<i) lo=m; else hi=m; } return tV[lo]+(i-tI[lo])/(tI[hi]-tI[lo])*(tV[hi]-tV[lo]); };
  const env0 = new Float32Array(N), car = new Float32Array(N);
  for (let n=0;n<N;n++){ env0[n]=env(n*dt); car[n]=carrier(n*dt); }
  const out = types().map((ty,k)=>{
    const c=M.ch[k], on=M.power&&c.conn, Apk=0.7746*Math.SQRT2*Math.pow(10,(chLevel(k)+c.cal)/20);
    const th=new Float32Array(N), vc=new Float32Array(N), vin=new Float32Array(N);
    let x=0, om=0, v=0;
    if (ty==='VU'){
      const g = M.relay? 1 : Math.pow(10,PAD/20), Mv=MOVES.VU; const w=Mv.wn, z=Mv.zeta;
      if (pre && on){ x = Apk*2/Math.PI*g/VUREF*VU0; }
      for (let n=0;n<N;n++){ const s=on? Apk*env0[n]*car[n] : 0; vin[n]=s; const tgt=Math.abs(s)*g/VUREF*VU0;
        const a=w*w*(tgt-x)-2*z*w*om; om+=a*dt; x+=om*dt; if (x<-0.02){x=-0.02;om=0;} if (x>1.1){x=1.1;om=0;} th[n]=x; }
    } else {
      const g=atten(SENS[D.sens].R)*Gd()*KABS*D.kt/C.R63, ka=1-Math.exp(-dt/(C.R51*D.C4)), kd=Math.exp(-dt/(C.R54*D.C4)), Mv=mv(), w=Mv.wn, z=Mv.zeta, RL=C.R56+Mv.Rm;
      if (pre && on){ v=look(Apk*g); x=Math.max(0,Math.min(r.Vmax,v-r.Voff))/RL/C.Ifsd; }
      for (let n=0;n<N;n++){ const s=on? Apk*env0[n]*car[n] : 0; vin[n]=s; const V=look(Math.abs(s)*g); if (V>v) v+=(V-v)*ka; v*=kd; vc[n]=v;
        const tgt=Math.max(0,Math.min(r.Vmax,v-r.Voff))/RL/C.Ifsd; const a=w*w*(tgt-x)-2*z*w*om; om+=a*dt; x+=om*dt; if (x<-0.03){x=-0.03;om=0;} if (x>1.12){x=1.12;om=0;} th[n]=x; }
    }
    let mx=-1, tm=0; for (let n=0;n<N;n++) if (th[n]>mx){ mx=th[n]; tm=n*dt; }
    return {ty, th, vc, vin, max:mx, tMax:tm};
  });
  SR = {out}; return SR;
}
const idx = t => Math.max(0, Math.min(FS-1, Math.round(t*FS)));
const readOf = (ty,th)=> ty==='VU'? vuOf(th) : dialDb(th);
const fmtRead = (ty,th)=> ty==='VU'? (th<vuPos(-20)*0.9?'below −20 VU':(vuOf(th)>=0?'+':'')+vuOf(th).toFixed(1)+' VU') : (th<dialPos(-12)-0.02?'below −12':(dialDb(th)>=0?'+':'')+dialDb(th).toFixed(1)+' dB');

/* ---------------- actions ---------------- */
const A = {
  setCfg(k){ M.cfg=k; M.sel=0; logAct('Panel → '+CFG[k].lab, [`Front panel drawing ${CFG[k].draw}: cut-outs (3.100″ × 1.600″) centred at ${CFG[k].x.map(v=>v.toFixed(3)+'″').join(', ')}, 2.070″ up`,
    `Meters: ${CFG[k].types.map((t,i)=>'M'+(i+1)+' '+t).join(' · ')}. VU meters run from SA-MP4-1 channels; PPM meters each have a 14-060 PPM driver board on their studs ${inf}`]); },
  cal(k, dir){ const c=M.ch[k]; c.cal=Math.max(-6,Math.min(6,c.cal+dir*0.5)); const ty=types()[k];
    logAct(`Rear CAL${k+1} ${dir>0?'clockwise':'anticlockwise'}`, [ty==='VU'? `SA-MP4-1 TRIM${k+1} (PT10V-50K, fitted on the back of the board, reached through the rear CAL${k+1} hole): channel gain ${c.cal>=0?'+':''}${c.cal.toFixed(1)} dB ${inf}` : `CAL${k+1} on a PPM channel: modelled as a gain trim ahead of the 14-060 (its own CAL is R64) ${inf}: ${c.cal>=0?'+':''}${c.cal.toFixed(1)} dB`,
      `Steady +4 dBu tone now reads ${fmtRead(ty, ty==='VU'? vuPos(c.cal+(M.relay?0:PAD)) : dialPos(Math.max(-12,Math.min(12,readingDb(steadyV(4+c.cal))))))}`]); },
  conn(k){ const c=M.ch[k]; c.conn=!c.conn; logAct(`${c.conn?'Plug in':'Unplug'} METER${k+1} (Phoenix MCV1.5/3, + − G)`, [c.conn? `TB${k+1} → balanced input of channel ${k+1}` : `Input open: the needle returns to its stop (C1/C2 coupling, nothing driving)`]); },
  power(){ M.power=!M.power; logAct(M.power?'AC on':'AC off', [M.power? 'IEC inlet → fuse (1A SB, 115 VAC per the rear silk) → T1 TE70052 12 V 1.25 A toroid → D1–D4 1N4003 → C1, C2 470 µF 50 V → op-amps and PPM drivers' : 'Rails collapse; every needle drops to its stop']); },
  relay(){ M.relay=!M.relay; logAct(`MP4-2 range relays ${M.relay?'energised':'released'}`, [`P4 pins 1/2 → REL1, REL2 coils (pins 1/16, D1 1N4003 across)`, M.relay? 'COM (pins 13/4) → NO (9/8) → R1/R6/R15/R16 3K6 → IN: plain VU build-out' : `COM → NC (11/6) → R3 → T-pad R2+RV1 (2K) / R4 to INxGND: ${PAD} dB ${inf} (resistors marked SOT, select on test)`]); },
};

/* ---------------- drawing: meter faces ---------------- */
function faceSVG(ty, th, x, y, w, h, lab){
  const W=310, H=160, cx=W/2, cy=H+70, R=200, a0=-40, a1=40;
  const ang=d=>(a0+(a1-a0)*d)*Math.PI/180, P=(d,rr)=>[cx+rr*Math.sin(ang(d)), cy-rr*Math.cos(ang(d))];
  const vu = ty==='VU', ink = vu? '#2a1c08':'#f0d79a', face = vu? '#f7c84a':'#1a150c';
  const arc=(d0,d1,rr,col,wd)=>{ const [x0,y0]=P(d0,rr),[x1,y1]=P(d1,rr); return `<path d="M${x0} ${y0} A${rr} ${rr} 0 0 1 ${x1} ${y1}" fill="none" stroke="${col}" stroke-width="${wd}"/>`; };
  let s=`<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#050505"/><rect x="7" y="7" width="${W-14}" height="${H-14}" rx="4" fill="${face}"/>`;
  if (vu){ s+=arc(0,1,R-62,ink,1.4)+arc(vuPos(0),1,R-58,'#c0261b',6);
    VUMARKS.forEach(m=>{ const d=vuPos(m); if (d<0.06) return; const [x0,y0]=P(d,R-62),[x1,y1]=P(d,R-50),[tx,ty_]=P(d,R-38); s+=`<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${m>0?'#c0261b':ink}" stroke-width="1.6"/><text x="${tx}" y="${ty_}" font-size="11" fill="${m>0?'#c0261b':ink}" text-anchor="middle">${m>0?'+'+m:m}</text>`; });
    s+=`<text x="40" y="34" font-size="12" fill="${ink}" font-weight="700">VU</text><text x="${W-40}" y="34" font-size="12" fill="#c0261b" font-weight="700" text-anchor="end">VU</text>`;
  } else { s+=arc(0,1,R-62,'#d9b56a',1.2)+arc(dialPos(8),dialPos(12),R-58,'#e0a020',7);
    MARKS.forEach(m=>{ const d=dialPos(m),[x0,y0]=P(d,R-62),[x1,y1]=P(d,R-48),[tx,ty_]=P(d,R-36); s+=`<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${ink}" stroke-width="2"/><text x="${tx}" y="${ty_}" font-size="12" fill="${ink}" text-anchor="middle">${m>0?'+':''}${m}</text>`; }); }
  s+=`<rect x="${cx-22}" y="${H-58}" width="44" height="14" rx="3" fill="none" stroke="${ink}"/><text x="${cx}" y="${H-47}" font-size="10" text-anchor="middle" fill="${ink}" font-weight="700">WBS</text>`;
  const d=Math.max(-0.03,Math.min(1.12,th)), [nx,ny]=P(d,R-30), [bx,by]=P(d,R-160);
  s+=`<line x1="${bx}" y1="${by}" x2="${nx}" y2="${ny}" stroke="${vu?'#111':'#f4efe6'}" stroke-width="2.4" stroke-linecap="round"/>`;
  if (lab) s+=`<text x="${W-14}" y="${H-14}" font-size="10" fill="${ink}" text-anchor="end">${lab}</text>`;
  return s+'</svg>';
}
/* Front panel to scale: 200 units per inch. 19.000″ × 3.470″, WBS black (Sherwin-Williams Polane T F63B12 per the drawing notes). */
function frontSVG(t){
  const S=simulate(), n=idx(t), cf=CFG[M.cfg];
  let s=`<svg viewBox="0 0 3800 694" style="width:100%;display:block;border-radius:6px" role="img" aria-label="8100MP front panel">
   <rect width="3800" height="694" rx="8" fill="#1b1c1e"/><image href="${ASSET}mp8100-front.svg" width="1685" height="694"/>`;
  [[69,47],[69,647],[3731,47],[3731,647]].forEach(([x,y])=> s+=`<rect x="${x-41}" y="${y-25}" width="82" height="50" rx="25" fill="var(--bg)" stroke="#000" stroke-width="3"/>`);
  cf.x.forEach((xi,k)=>{ const cx=xi*200, cy=280, w=620, h=320; const o=S.out[k];
    s+=`<g class="mtr" data-k="${k}" style="cursor:pointer"><rect x="${cx-w/2-14}" y="${cy-h/2-14}" width="${w+28}" height="${h+28}" rx="10" fill="#0a0a0b" stroke="${M.sel===k?'#ffb43a':'#2b2c2e'}" stroke-width="${M.sel===k?8:4}"/>
      ${faceSVG(o.ty, o.th[n], cx-w/2, cy-h/2, w, h, 'M'+(k+1))}<title>Meter ${k+1} (${o.ty}) — click to select; it is fed from rear METER${k+1}</title></g>`; });
  s+=`<rect x="260" y="552" width="3280" height="74" rx="8" fill="#c9ccd0" stroke="#8a8d91"/><rect x="260" y="552" width="3280" height="18" rx="6" fill="#e9ebee"/><circle cx="296" cy="589" r="16" fill="#9a9da1" stroke="#555"/>`;
  return s+`</svg><div class="small muted">Front to scale from <span class="mono">${cf.draw}</span> (cut-outs) and ${SIM.src('#MP (8100) #SERIES/8100 CHASSIS - #ARTWORK #DA #2016/8100MP-FRONT-SILK (CURVE).CDR','8100MP-FRONT-SILK (CURVE).CDR')} (white legend, real artwork; Hobo Std glyphs from its CorelDRAW PDF export ${SIM.src('#MP (8100) #SERIES/8100 CHASSIS - #ARTWORK #DA #2016/8100MP-FRONT-SILK (CURVE).pdf','8100MP-FRONT-SILK (CURVE).pdf')}). The aluminium strip along the bottom is from the photos; its purpose is not documented.</div>`;
}
function rearSVG(){
  let s=`<svg viewBox="0 0 3340 654" style="width:100%;display:block;border-radius:6px" role="img" aria-label="8100 rear panel">
   <rect width="3340" height="654" rx="8" fill="#1b1c1e"/>`;
  [[34,104],[34,556],[3311,104],[3311,556]].forEach(([x,y])=> s+=`<circle cx="${x}" cy="${y}" r="16" fill="#8c8f93" stroke="#444" stroke-width="3"/><line x1="${x-10}" y1="${y}" x2="${x+10}" y2="${y}" stroke="#333" stroke-width="3"/>`);
  s+=`<g class="iec" style="cursor:pointer"><rect x="132" y="280" width="216" height="248" rx="10" fill="#0c0c0c" stroke="#555" stroke-width="3"/><rect x="152" y="300" width="176" height="120" rx="14" fill="#202020"/>
    ${[190,240,290].map((x,i)=>`<rect x="${x-9}" y="${i===1?318:346}" width="18" height="44" fill="#c9b27a"/>`).join('')}<rect x="160" y="440" width="160" height="70" rx="6" fill="#151515" stroke="#444"/>
    <circle cx="300" cy="300" r="10" fill="${M.power?'#7dff6a':'#333'}"/><title>IEC inlet with fuse drawer — click for AC on/off</title></g>`;
  const ch=types().length;
  [7.438,8.688,9.938,11.188].forEach((xi,j)=>{ const k=3-j, x=xi*200, y=442; const live=k<ch; const c=M.ch[k];
    s+=`<g class="cal" data-k="${k}" style="cursor:${live?'pointer':'default'}"><circle cx="${x}" cy="145" r="22" fill="#060606" stroke="#555" stroke-width="3"/>${live?`<line x1="${x-14}" y1="145" x2="${x+14}" y2="145" stroke="#bbb" stroke-width="4" transform="rotate(${c.cal*20} ${x} 145)"/>`:''}<rect x="${x-70}" y="103" width="140" height="84" fill="transparent"><title>CAL${k+1}: click left/right half to turn</title></rect></g>
      <g class="tb" data-k="${k}" style="cursor:${live?'pointer':'default'}"><rect x="${x-62}" y="${y-44}" width="124" height="88" rx="6" fill="${live?'#2aa05a':'#1f6e42'}" stroke="#0e4d25" stroke-width="3"/>${[-34,0,34].map(d=>`<rect x="${x+d-12}" y="${y-30}" width="24" height="34" fill="#0e3a1f"/>`).join('')}
      ${live&&c.conn?`<rect x="${x-56}" y="${y-2}" width="112" height="40" rx="4" fill="#3ec172"/><path d="M${x} ${y+38} v50" stroke="#2b5f9e" stroke-width="16"/>`:''}<title>METER${k+1} input (+ − G)${live?' — click to plug/unplug':' — not used in this configuration'}</title></g>`; });
  return s+`<image href="${ASSET}mp8100-rear.svg" width="3340" height="654"/></svg><div class="small muted">Rear to scale from <span class="mono">8100-REAR ISS 2</span> (16.700″ × 3.270″; IEC cut-out G, Phoenix cut-outs F at 1.25″ pitch) with the real ${SIM.src('#MP (8100) #SERIES/8100 CHASSIS - #ARTWORK #DA #2016/8100MP-REAR-SILK (CURVE).CDR','8100MP-REAR-SILK (CURVE).CDR')} legend and its cut-out guides (fuse inlet, CAL holes, Phoenix cut-outs, rack-ear holes).</div>`;
}
function bindPanels(root){
  root.querySelectorAll('.mtr').forEach(g=> g.onclick=()=>{ M.sel=+g.dataset.k; SIM.refresh(); });
  root.querySelectorAll('.cal').forEach(g=> g.addEventListener('click', e=>{ const k=+g.dataset.k; if (k>=types().length) return; const b=g.getBoundingClientRect(); A.cal(k, (e.clientX-b.left)/b.width<0.5?-1:1); }));
  root.querySelectorAll('.tb').forEach(g=> g.addEventListener('click', ()=>{ const k=+g.dataset.k; if (k<types().length) A.conn(k); }));
  const i=root.querySelector('.iec'); if (i) i.onclick=()=>A.power();
}

/* ---------------- timeline ---------------- */
function trace(c, X, t0, t1, y, h, arr, lo, hi, col){
  const fs=FS, x0=X(t0), W=Math.max(1,Math.round(X(t1)-x0)); c.strokeStyle=col; c.fillStyle=col; c.lineWidth=1.2;
  const Y=v=> y+h-2-(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo)*(h-4), spp=(t1-t0)*fs/W;
  if (spp<=2){ c.beginPath(); const a=Math.max(0,Math.floor(t0*fs)), b=Math.min(arr.length-1,Math.ceil(t1*fs)); for(let n=a;n<=b;n++){ const xx=X(n/fs), yy=Y(arr[n]); n===a?c.moveTo(xx,yy):c.lineTo(xx,yy);} c.stroke(); return; }
  for (let p=0;p<W;p++){ const a=Math.max(0,Math.floor((t0+(t1-t0)*p/W)*fs)), b=Math.min(arr.length-1,Math.floor((t0+(t1-t0)*(p+1)/W)*fs)); if (a>b) continue; let mn=Infinity,mx=-Infinity; for(let n=a;n<=b;n++){ const v=arr[n]; if(v<mn)mn=v; if(v>mx)mx=v; } const ya=Y(mx), yb=Y(mn); c.fillRect(x0+p, ya, 1, Math.max(1,yb-ya)); }
}
function lanes(){
  const S=simulate(), css=SIM.css, r=rails(), L=[];
  S.out.forEach((o,k)=>{
    const A_=0.7746*Math.SQRT2*Math.pow(10,(chLevel(k)+M.ch[k].cal+4)/20);
    if (k===M.sel){ L.push({label:`M${k+1} input (${chLevel(k)>=0?'+':''}${chLevel(k)} dBu)`, h:36, draw(c,X,t0,t1,y,h){ trace(c,X,t0,t1,y,h,o.vin,-A_,A_,css('--accent2')); }});
      if (o.ty==='PPM') L.push({label:`M${k+1} 14-060 C4 (V)`, h:36, draw(c,X,t0,t1,y,h){ trace(c,X,t0,t1,y,h,o.vc,0,r.Vmax,css('--accent')); }}); }
    const marks = o.ty==='VU'? [-20,-10,-5,0,3].map(vuPos) : MARKS.map(dialPos);
    L.push({label:`M${k+1} ${o.ty} needle`, h:k===M.sel?54:36, draw(c,X,t0,t1,y,h){ c.strokeStyle=css('--grid'); c.setLineDash([3,4]); marks.forEach(v=>{ const yy=y+h-2-(v+0.03)/1.15*(h-4); c.beginPath(); c.moveTo(X(t0),yy); c.lineTo(X(t1),yy); c.stroke(); }); c.setLineDash([]); trace(c,X,t0,t1,y,h,o.th,-0.03,1.12,o.ty==='VU'?css('--warn'):css('--play')); }});
  });
  return L;
}

/* ---------------- views ---------------- */
function card(t,b){ return `<div class="card"><h2>${t}</h2>${b}</div>`; }
function controls(){
  return `<div style="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center" class="small">
   <label>Panel <select id="cf">${Object.keys(CFG).map(k=>`<option value="${k}" ${k===M.cfg?'selected':''}>${CFG[k].lab}</option>`).join('')}</select></label>
   <label>Stimulus <select id="st">${Object.keys(STIM).map(k=>`<option value="${k}" ${k===M.stim?'selected':''}>${STIM[k].lab}</option>`).join('')}</select></label>
   <label>Burst <select id="bm">${[3,5,10,20,50,100,300].map(v=>`<option ${v===M.burstMs?'selected':''}>${v}</option>`).join('')}</select> ms</label>
   <label>Freq <select id="fq">${[100,1000,5000].map(v=>`<option value="${v}" ${v===M.freq?'selected':''}>${v} Hz</option>`).join('')}</select></label>
   <label>Line level <input type="range" id="lv" min="-20" max="16" step="1" value="${M.level}"> <span id="lvv" class="mono"></span></label>
   <label>PPM movement <select id="mvs">${['FR29','PPM','T29'].map(k=>`<option value="${k}" ${k===D.move?'selected':''}>${MOVES[k].lab}</option>`).join('')}</select></label>
   <label><input type="checkbox" id="rl" ${M.relay?'checked':''}> MP4-2 range relays energised</label></div>
   <div class="small muted" style="margin-top:4px">Each input runs at the line level plus its own offset (M1 0, M2 −3, M3 −6, M4 +2 dB) so the meters differ. Click a meter to follow it; on the rear, click CALn (left/right half), a METER plug, or the IEC inlet.</div>`;
}
function bindControls(m){
  const q=s=>m.querySelector(s), up=()=>{ q('#lvv').textContent=(M.level>=0?'+':'')+M.level+' dBu'; }; up();
  q('#cf').onchange=e=>A.setCfg(e.target.value);
  q('#st').onchange=e=>{ M.stim=e.target.value; SIM.refresh(); };
  q('#bm').onchange=e=>{ M.burstMs=+e.target.value; SIM.refresh(); };
  q('#fq').onchange=e=>{ M.freq=+e.target.value; SIM.refresh(); };
  q('#lv').oninput=e=>{ M.level=+e.target.value; up(); SIM.refresh(); };
  q('#mvs').onchange=e=>{ D.move=e.target.value; calibrate(true); logAct('PPM movement → '+MOVES[D.move].lab, ['14-060 recalibrated for the new terminal resistance (R56 3K32 + '+MOVES[D.move].Rm+' Ω)']); };
  q('#rl').onchange=()=>A.relay();
}
function logHTML(){ const e=M.log[0]; return e? `<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`+e.lines.map(l=>`<div>→ ${l}</div>`).join('') : '<div class="muted">Change the panel, the stimulus or a rear CAL trim; each change is traced through the hardware here.</div>'; }
function readTable(n){ const S=simulate(); return `<table class="kv">${S.out.map((o,k)=>`<tr class="${k===M.sel?'hl':''}"><th>M${k+1} ${o.ty}</th><td class="mono">${fmtRead(o.ty,o.th[n])}</td><td class="mono small">peak ${fmtRead(o.ty,o.max)} @ ${SIM.fmtDur(o.tMax)}</td><td class="small">${M.ch[k].conn?'':'unplugged'} CAL ${M.ch[k].cal>=0?'+':''}${M.ch[k].cal}</td></tr>`).join('')}</table>`; }

function viewSim(m){
  window.__mp8100Active=false;
  m.innerHTML=`${card('Front panel at the playhead', `<div id="fp"></div>`)}
   <div class="grid2"><div>${card('Rear panel', `<div id="rp"></div>`)}${card('Controls', controls())}</div>
   <div>${card('Readings', `<div id="rt"></div>`)}${card('What the hardware did', `<div id="tr" class="log"></div>`)}</div></div>
   ${card('One second, zoomable — click to seek', `<canvas id="tl"></canvas><p class="small muted">${FS/1000} kHz sample-by-sample model. PPM channels use the 14-060 circuit (charge R51·C4 = 1 ms, release R54·C4 = 2.2 s); VU channels use the ANSI movement (99 % in 300 ms).</p>`)}`;
  bindControls(m);
  SIM.on('time', ()=>{ const n=idx(SIM.t);
    m.querySelector('#fp').innerHTML=frontSVG(SIM.t); m.querySelector('#rp').innerHTML=rearSVG(); bindPanels(m);
    m.querySelector('#rt').innerHTML=readTable(n); m.querySelector('#tr').innerHTML=logHTML();
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:180}); });
}

const LESSONS = [
  {title:'Meet the MP panels', body:`<p>The MP series are 19″ two-unit meter panels on the 8100 chassis: one to four Sifam moving-coil meters, each either a <b>VU</b> (yellow face, −20…+3) or a <b>PPM</b> (dark face, −12…+12). Everything is analog; the rear has an IEC inlet, four <b>METER</b> inputs and four <b>CAL</b> holes.</p><p class="muted">No operator manual is in the archive; these steps follow the rear silk and the board BOMs ${inf}.</p>`, check:()=>true, auto:true},
  {title:'1 · Pick the panel', body:`<p>Choose <b>MP2 (1V1P)</b>: one VU and one PPM side by side, as in the photo <span class="mono">MP2(1V1P).jpg</span>. That is the best panel for seeing how differently the two meters move.</p>`, check:()=>M.cfg==='MP2VP', hint:'Panel = MP2 (1V1P).'},
  {title:'2 · Power and wiring', body:`<p>The IEC inlet takes 115 VAC with a 1 A slow-blow fuse (rear silk). Each meter's balanced feed goes to its 3-pin Phoenix plug: <b>+ − G</b>. Make sure both plugs are in and AC is on.</p>`, check:()=>M.power&&M.ch[0].conn&&M.ch[1].conn, hint:'Click the IEC inlet or METER plugs on the rear.'},
  {title:'3 · Line-up tone', body:`<p>Stimulus <b>Tone on at 50 ms</b>, 1 kHz, line level <b>+4 dBu</b>. M2's input is offset −3 dB in this demo, so judge by M1. The VU should settle on <b>0 VU</b>, the PPM on <b>0</b>.</p>`, check:()=>M.stim==='tone'&&M.level===4, hint:'Stimulus = tone; Line level = +4.'},
  {title:'4 · Trim with CAL', body:`<p>Turn rear <b>CAL1</b> (left/right half of the hole) and watch M1 move. Bring it back to 0 dB trim.</p><p><b>Goal:</b> turn CAL1 away from zero and back.</p>`, check:()=>M.log.some(e=>e.name.startsWith('Rear CAL1'))&&M.ch[0].cal===0, hint:'Click CAL1 on the right, then on the left.'},
  {title:'5 · Speech: VU vs PPM', body:`<p>Switch to <b>Programme-like</b>. Play the transport. The VU averages and lags; the PPM jumps to each syllable's peak and falls slowly. At 0.62 s there is a 5 ms transient: watch the PPM catch it and the VU barely notice.</p>`, check:()=>M.stim==='prog', hint:'Stimulus = Programme-like.'},
  {title:'6 · The 10 ms burst', body:`<p>Choose <b>Tone burst</b>, 10 ms. The PPM reads within a couple of dB of the steady value; the VU reads far lower. The <b>One second</b> tab plots this for every burst length.</p>`, check:()=>M.stim==='burst'&&M.burstMs===10, hint:'Stimulus = Tone burst, Burst = 10 ms.'},
  {title:'7 · Range relays', body:`<p>Later panels (mp4-2, 2002|35) add two relays that switch each VU between its plain 3K6 build-out and a padded path. Untick <b>range relays energised</b> and see the VU drop.</p>`, check:()=>!M.relay, hint:'Untick “MP4-2 range relays energised”.'},
  {title:'Done', body:`<p>That's the panel. <b>Block diagram</b> and <b>Schematics</b> show the power/pad board, the relay board and the PPM driver; <b>Findings</b> lists what the files reveal.</p>`, check:()=>true, auto:true},
];
let lesson=0;
function viewTut(m){
  window.__mp8100Active=false;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — installing and reading an MP panel', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lsn"></div>${card('What the hardware did', `<div id="tr" class="log"></div>`)}</div>
    <div>${card('Front', `<div id="fp"></div><div id="rt" style="margin-top:6px"></div>`)}${card('Rear', `<div id="rp"></div>`)}${card('Controls', controls())}</div></div>`;
  bindControls(m);
  SIM.on('time', ()=>{ const n=idx(SIM.t);
    m.querySelector('#fp').innerHTML=frontSVG(SIM.t); m.querySelector('#rp').innerHTML=rearSVG(); bindPanels(m);
    m.querySelector('#rt').innerHTML=readTable(n); m.querySelector('#tr').innerHTML=logHTML();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lesson?'font-weight:700;color:var(--accent)':''}">${l.title}${i<lesson?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{ lesson=+li.dataset.i; SIM.refresh(); });
    const L=LESSONS[lesson], ok=L.check();
    m.querySelector('#lsn').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${lesson?'':'disabled'}>◀ Back</button><button id="nx" ${lesson<LESSONS.length-1?'':'disabled'}>Next ▶</button></div>`;
    m.querySelector('#pv').onclick=()=>{ lesson=Math.max(0,lesson-1); SIM.refresh(); };
    m.querySelector('#nx').onclick=()=>{ lesson=Math.min(LESSONS.length-1,lesson+1); SIM.refresh(); };
  });
}

/* ---------------- one second: VU vs PPM ballistics ---------------- */
let BK='', BB=null;
function bench(){
  const k=[D.move,D.T.join(','),D.kt].join('|'); if (k===BK) return BB; BK=k;
  const save={cfg:M.cfg, stim:M.stim, burstMs:M.burstMs, level:M.level, freq:M.freq, relay:M.relay, ch:JSON.stringify(M.ch), power:M.power};
  M.cfg='MP2VP'; M.level=4; M.freq=5000; M.relay=true; M.power=true; M.ch.forEach(c=>{ c.off=0; c.cal=0; c.conn=true; });
  M.stim='tone'; SKEY=''; const st=simulate().out.map(o=>readOf(o.ty,o.th[FS-1]));
  const rows=[3,5,10,20,50,100,300].map(ms=>{ M.stim='burst'; M.burstMs=ms; SKEY=''; const o=simulate().out; return {ms, vu:readOf('VU',o[0].max)-st[0], ppm:readOf('PPM',o[1].max)-st[1]}; });
  M.stim='tone'; M.freq=1000; SKEY=''; const step=simulate().out.map(o=>Array.from(o.th.filter((_,i)=>i%96===0)));
  Object.assign(M,{cfg:save.cfg, stim:save.stim, burstMs:save.burstMs, level:save.level, freq:save.freq, relay:save.relay, power:save.power}); M.ch=JSON.parse(save.ch); SKEY='';
  BB={rows, step}; return BB;
}
function viewSecond(m){
  window.__mp8100Active=false;
  m.innerHTML=`${card('One second, broken down', `<div id="ld"></div>`)}
   <div class="grid2">${card('Tone burst: how much each meter misses (5 kHz at line-up)', `<canvas id="bc"></canvas><div id="bt"></div>`)}
   ${card('Tone switched on at 50 ms: needle against time', `<canvas id="sc"></canvas><p class="small muted">Orange: VU (ANSI C16.5: 99 % in 300 ms, ≈1.3 % overshoot). Red: PPM through the 14-060 and the ${D.move} movement.</p>`)}</div>
   ${card('Where the time constants come from', `<table class="kv small">
     <tr><th>PPM charge</th><td>14-060 R51 1K × C4 1 µF = 1 ms, only while Q7 conducts near each rectified peak</td></tr>
     <tr><th>PPM release</th><td>R54 2M2 × C4 1 µF = 2.2 s into U3B's virtual earth, acting on an already-logarithmic voltage</td></tr>
     <tr><th>PPM needle</th><td>Sifam ${MOVES[D.move].lab}: ζ ${MOVES[D.move].zeta}, ωn ${MOVES[D.move].wn.toFixed(1)} rad/s (fitted to the datasheet chart ${inf})</td></tr>
     <tr><th>VU</th><td>No electronics time constant: SA-MP4-1 is a unity buffer and 3K6 build-out; all the ballistics are the VU movement's own (ζ 0.81, ωn ${MOVES.VU.wn.toFixed(1)} rad/s from the 300 ms / 99 % definition). The meter's rectifier responds to the average, not the peak.</td></tr></table>`)}`;
  SIM.on('time', ()=>{
    const S=simulate(), B=bench(), n=idx(SIM.t);
    const rows=[['Model samples', FS.toLocaleString(), SIM.fmtDur(1/FS)], ['Carrier', M.stim==='prog'?'mixed':M.freq.toLocaleString()+' Hz', M.stim==='prog'?'':SIM.fmtDur(1/M.freq)], ...S.out.map((o,k)=>[`M${k+1} ${o.ty} at playhead`, fmtRead(o.ty,o.th[n]), 'peak '+fmtRead(o.ty,o.max)+' @ '+SIM.fmtDur(o.tMax)])];
    m.querySelector('#ld').innerHTML=`<table class="kv">${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td></tr>`).join('')}</table>`;
    const {c,w}=SIM.canvas(m.querySelector('#bc'),180), X=ms=>40+(Math.log10(ms)-Math.log10(2.5))/(Math.log10(400)-Math.log10(2.5))*(w-50), Y=d=>12+(-d)/24*150;
    c.strokeStyle=SIM.css('--grid'); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; [0,-2,-6,-12,-18,-24].forEach(d=>{ c.beginPath(); c.moveTo(40,Y(d)); c.lineTo(w-10,Y(d)); c.stroke(); c.fillText(d+' dB',2,Y(d)+3); });
    B.rows.forEach(r=>c.fillText(r.ms+' ms',X(r.ms)-10,176));
    [['vu',SIM.css('--warn')],['ppm',SIM.css('--play')]].forEach(([key,col])=>{ c.strokeStyle=col; c.lineWidth=2; c.beginPath(); B.rows.forEach((r,i)=>{ const yy=Y(Math.max(-24,r[key])); i?c.lineTo(X(r.ms),yy):c.moveTo(X(r.ms),yy); }); c.stroke(); }); c.lineWidth=1;
    m.querySelector('#bt').innerHTML=`<table class="kv small"><tr><th>burst</th>${B.rows.map(r=>`<td class="mono">${r.ms} ms</td>`).join('')}</tr><tr><th>VU</th>${B.rows.map(r=>`<td class="mono">${r.vu.toFixed(1)}</td>`).join('')}</tr><tr><th>PPM</th>${B.rows.map(r=>`<td class="mono">${r.ppm.toFixed(1)}</td>`).join('')}</tr></table>`;
    const sc=SIM.canvas(m.querySelector('#sc'),180), c2=sc.c, w2=sc.w, SX=i=>40+i/B.step[0].length*(w2-50), SY=v=>165-v*140;
    c2.strokeStyle=SIM.css('--grid'); c2.fillStyle=SIM.css('--ink2'); c2.font='10px sans-serif'; for (let t=0;t<=1;t+=0.1) c2.fillText(t.toFixed(1),SX(t*B.step[0].length)-6,178);
    [[0,SIM.css('--warn')],[1,SIM.css('--play')]].forEach(([k,col])=>{ c2.strokeStyle=col; c2.lineWidth=2; c2.beginPath(); B.step[k].forEach((v,i)=>{ i?c2.lineTo(SX(i),SY(v)):c2.moveTo(SX(i),SY(v)); }); c2.stroke(); }); c2.lineWidth=1;
  });
}

/* ---------------- block diagram ---------------- */
const BLK = {
  ac:{x:10,y:20,w:160,h:80,t:'AC inlet + fuse',s:['115 VAC, 1 A slow-blow','(rear silk)'],d:'IEC inlet with fuse drawer in cut-out G of 8100-REAR ISS 2. The rear silk reads “115 VAC, 1A SB.” and “CAUTION — disconnect power before replacing fuse or servicing”.'},
  psu:{x:200,y:20,w:180,h:80,t:'SA-MP4-1 power',s:['T1 TE70052 12 V 1.25 A','D1–D4 1N4003','C1, C2 470 µF 50 V'],d:'From the MP4-1 FINAL BOM. Two 470 µF reservoirs after a four-diode rectifier suggest split rails of about ±16 V ' + inf + '. The 1999 OrCAD schematic still shows two LM7805 regulators that the final BOM no longer lists.'},
  buf:{x:200,y:140,w:180,h:96,t:'SA-MP4-1 4 × buffer/pad',s:['NE5532N + 4 × 13K per ch','R16 3K6 VU build-out','TRIM 50K (rear CAL)'],d:'Per channel: R11/R12/R13/R15 13K (difference amplifier ' + inf + '), C13 22p / C14 33p compensation, C11/C12 33 µF 10 V tantalum, R14 3K32, R16 3K6 and a PT10V-50K trim fitted on the back of the board so it lines up with the rear CAL hole. Phoenix TB1–TB4 are also fitted on the back: they are the rear METER plugs.'},
  rly:{x:410,y:140,w:170,h:96,t:'mp4-2 relay board',s:['REL1, REL2 G5V-2','3K6 direct ↔ SOT pad','coil on P4'],d:'From PCB/mp4-2.net (2002|35): each relay switches two meters (METER1–4 on the commons) between a 3K6 build-out from INn and an L-pad (R2 + RV1 2K trim, R3, R4 to INnGND) with “SOT” (select-on-test) values.'},
  ppm:{x:410,y:20,w:170,h:96,t:'14-060 PPM driver',s:['one per PPM meter','1 ms / 2.2 s detector','dB-linear shaper'],d:'The PPM_DRIVER ISS5 project is copied into PCB/14-060. Its M1 footprint is the meter itself, so a PPM meter carries its own driver board. See the PPM Driver plugin for the circuit.'},
  mtr:{x:610,y:80,w:160,h:96,t:'Sifam meters',s:['VU: −20…+3, 3900 Ω','PPM: −12…+12, 1 mA','AL29W layout drawing'],d:'Mechanical: 8100 SIFAM METER AL29W-LAYOUT.dwg, VU mounting washer 8100-WASHER ISS 2. The faces carry a WBS mark (photos).'},
  lb:{x:610,y:210,w:160,h:60,t:'14-268 light bar',s:['4 × HLMP-2450, 2 × 150R'],d:'PCB/SA14-268 (2012|45). The README calls its function unknown; the schematic\'s document number is “VU Meter Light Bar”: four HLMP-2450 LED light bars with two 150 Ω ½ W resistors to light the meter faces.'},
};
const BW = [['ac','psu','AC'],['psu','buf','rails'],['psu','ppm','supply'],['buf','rly','INn'],['rly','mtr','METERn'],['buf','mtr','VU'],['ppm','mtr','PPM_OUT'],['psu','lb','?']];
function viewBlock(m){
  window.__mp8100Active=false; let sel='buf';
  m.innerHTML=`<div class="grid2">${card('Block diagram (click a block)', `<div id="bd"></div>`)}<div>${card('Block', `<div id="bi"></div>`)}${card('In one sentence', `<p>Mains → toroid and rectifier on SA-MP4-1 → per-channel balanced buffers with 3K6 VU build-outs (or a 14-060 PPM driver on each PPM) → Sifam meters, optionally through the mp4-2 range relays.</p>`)}</div></div>`;
  const draw=()=>{ const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 780 290" style="width:100%"><defs><marker id="ma" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    BW.forEach(([a,b,l])=>{ const A_=BLK[a],B_=BLK[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_); const cl=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const k=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9, dy?(bx.h/2)/Math.abs(dy):1e9); return [x+dx*k,y+dy*k]; }; [x1,y1]=cl(A_,x1,y1,x2,y2); [x2,y2]=cl(B_,x2,y2,x1,y1);
      const hot=sel===a||sel===b; s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#ma)"/><text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLK){ const b=BLK[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+36+i*15}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    m.querySelector('#bi').innerHTML=`<h3>${BLK[sel].t}</h3><p>${BLK[sel].d}</p>`; };
  draw();
}

/* ---------------- schematics ---------------- */
const RES=(x,y,lab,val,vert)=> vert? `<path d="M${x} ${y} v8 l5 3 -10 5 10 5 -10 5 10 5 -5 3 v8" fill="none" stroke="var(--ink)"/><text x="${x+9}" y="${y+22}" font-size="10" fill="var(--ink)">${lab}</text><text x="${x+9}" y="${y+34}" font-size="10" fill="var(--ink2)">${val}</text>`
  : `<path d="M${x} ${y} h8 l3 -5 5 10 5 -10 5 10 5 -10 3 5 h8" fill="none" stroke="var(--ink)"/><text x="${x+10}" y="${y-9}" font-size="10" fill="var(--ink)">${lab} <tspan fill="var(--ink2)">${val}</tspan></text>`;
const W=pts=>`<polyline points="${pts}" fill="none" stroke="var(--ink)"/>`;
const NL=(x,y,t,a)=>`<text x="${x}" y="${y}" font-size="10" fill="var(--accent2)" text-anchor="${a||'start'}">${t}</text>`;
const OPA=(x,y,lab)=>`<path d="M${x} ${y-26} L${x} ${y+26} L${x+52} ${y} Z" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+5}" y="${y-10}" font-size="11" fill="var(--ink)">−</text><text x="${x+5}" y="${y+16}" font-size="11" fill="var(--ink)">+</text><text x="${x+14}" y="${y+4}" font-size="9.5" fill="var(--ink)">${lab}</text>`;
function relayPair(x, n, rel){ // one meter path from mp4-2.net: [direct 3K6, series, to-relay, shunt, trim, NO, NC, COM]
  const R = {1:['R1','R2','R3','R4','RV1','REL1-9','REL1-11','REL1-13'],2:['R6','R7','R8','R5','RV2','REL1-8','REL1-6','REL1-4'],3:['R15','R13','R14','R12','RV4','REL2-9','REL2-11','REL2-13'],4:['R16','R10','R11','R9','RV3','REL2-8','REL2-6','REL2-4']}[n];
  const y0=40+(n-1)*104;
  return NL(20,y0+4,'IN'+n)+W(`40,${y0} 80,${y0}`)+RES(80,y0,R[0],'3K6')+W(`122,${y0} 340,${y0}`)+NL(250,y0-5,R[5]+' NO')+
    W(`60,${y0} 60,${y0+40} 80,${y0+40}`)+RES(80,y0+40,R[1]+'+'+R[4],'SOT+2K')+W(`122,${y0+40} 200,${y0+40}`)+W(`160,${y0+40} 160,${y0+52}`)+RES(160,y0+52,R[3],'SOT',true)+NL(150,y0+102,'IN'+n+'GND')+RES(200,y0+40,R[2],'SOT')+W(`242,${y0+40} 340,${y0+40}`)+NL(250,y0+35,R[6]+' NC')+
    `<circle cx="340" cy="${y0}" r="3" fill="var(--ink)"/><circle cx="340" cy="${y0+40}" r="3" fill="var(--ink)"/><circle cx="380" cy="${y0+20}" r="3.5" fill="var(--ink)"/><path d="M380 ${y0+20} L343 ${rel? y0+2 : y0+38}" stroke="var(--accent)" stroke-width="2.5"/>`+W(`380,${y0+20} 400,${y0+20}`)+NL(404,y0+24,R[7]+' COM → METER'+n);
}
const SHEETS = [
  {name:'1 · SA-MP4-1 channel (from BOM values)', note:'Inferred topology: the BOM gives four 13K per channel, a 3K32, a 3K6, two 33 µF tantalums, 22p and 33p, a 50K trim and one NE5532 half. The 1999 MP4-1.DSN is a binary OrCAD file whose nets could not be read; the 1999 schematic used LF353s.', svg:()=>
    NL(20,64,'METERn + (TBn)')+W('20,80 70,80')+`<text x="58" y="104" font-size="10" fill="var(--ink)">C11 33µ</text>`+W('70,72 70,88')+W('76,72 76,88')+W('76,80 100,80')+RES(100,80,'R11','13K')+W('142,80 200,80 200,84 220,84')+
    NL(20,164,'METERn − (TBn)')+W('20,180 70,180')+`<text x="58" y="204" font-size="10" fill="var(--ink)">C12 33µ</text>`+W('70,172 70,188')+W('76,172 76,188')+W('76,180 100,180')+RES(100,180,'R12','13K')+W('142,180 200,180 200,108 220,108')+
    W('200,180 200,200')+RES(200,200,'R15','13K',true)+NL(190,260,'G')+OPA(220,96,'U½ NE5532')+W('210,84 210,40 240,40')+RES(240,40,'R13','13K')+W('282,40 290,40 290,96 272,96')+NL(220,20,'C13 22p / C14 33p (stability)')+
    W('290,96 330,96')+RES(330,96,'TRIM 50K','(CALn)')+W('372,96 460,96')+RES(460,96,'R16','3K6')+W('502,96 580,96')+`<circle cx="600" cy="96" r="20" fill="none" stroke="var(--ink)"/><text x="590" y="100" font-size="10" fill="var(--ink)">VU</text>`+W('620,96 640,96 640,140')+NL(630,152,'G')+NL(560,130,'3900 Ω meter')+
    NL(300,240,'R14 3K32: also on the BOM (same value as the 14-060\'s R56); its place is not known '+'(inferred)')+NL(20,300,'Gain: R13/R11 = 13K/13K = 1 → 0 VU = +4 dBu through 3K6 + 3900 Ω, trimmed by the 50K CAL')
  },
  {name:'2 · mp4-2 range relays (netlist)', note:'Redrawn from PCB/mp4-2.net (P-CAD, Jan 2002). Relay pin roles (coil 1/16, COM 4/13, NC 6/11, NO 8/9) are the usual Omron G5V-2 layout (inferred). Values marked SOT are select-on-test in the netlist.', svg:()=>
    [1,2,3,4].map(n=>relayPair(0,n,M.relay)).join('')+NL(600,60,'REL1 / REL2 coils: pins 1 & 16')+NL(600,76,'P4-1 → NET00007 (coil +, D1 anode)')+NL(600,92,'P4-2 → NET00006 (coil −, D1 cathode)')+NL(600,120,'Relays '+(M.relay?'energised: 3K6 direct':'released: SOT pad'))
  },
  {name:'3 · Power (BOM)', note:'From MP4-1 FINAL BOM: T1 TE70052 (12 V 1.25 A toroid), D1–D4 1N4003, C1/C2 470 µF 50 V, AC IN Panduit MLSS-156-3. Split-rail arrangement inferred.', svg:()=>
    NL(20,94,'AC IN (MLSS-156-3)')+W('120,90 160,90')+`<circle cx="190" cy="90" r="22" fill="none" stroke="var(--ink)"/><circle cx="214" cy="90" r="22" fill="none" stroke="var(--ink)"/><text x="170" y="130" font-size="10" fill="var(--ink)">T1 TE70052 12 V 1.25 A</text>`+
    W('236,90 280,90')+`<rect x="280" y="60" width="70" height="60" fill="none" stroke="var(--ink)"/><text x="290" y="94" font-size="10" fill="var(--ink)">D1–D4 1N4003</text>`+W('350,70 420,70')+W('350,110 420,110')+NL(424,74,'+V ≈ +16 V (C1 470µ)')+NL(424,114,'−V ≈ −16 V (C2 470µ)')+NL(20,200,'Rail values inferred from 12 VAC × √2 − diode drop; no regulator on the final BOM (the 1999 schematic had two LM7805s).')
  },
  {name:'4 · 14-268 VU light bar', note:'From PCB/SA14-268/14-268-ISS2/Sheet1.SCHDOC (2012|45, DSB): DocumentNumber “VU Meter Light Bar”, ports + and −, DS1–DS4 HLMP-2450, R1/R2 150R ½ W. Series/parallel arrangement inferred.', svg:()=>
    NL(20,94,'+')+W('30,90 60,90')+RES(60,90,'R1','150R ½W')+W('102,90 130,90')+[0,1,2,3].map(i=>`<rect x="${130+i*110}" y="72" width="90" height="36" rx="3" fill="none" stroke="var(--ink)"/><text x="${140+i*110}" y="94" font-size="10" fill="var(--ink)">DS${i+1} HLMP-2450</text>`+(i<3?W(`${220+i*110},90 ${240+i*110},90`):'')).join('')+W('570,90 600,90')+RES(600,90,'R2','150R ½W')+W('642,90 680,90')+NL(684,94,'−')
  },
];
function viewSchem(m){
  window.__mp8100Active=false; let i=0;
  m.innerHTML=card('Schematic set — redrawn (not the original CAD)', `<div id="sb" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p><p class="small muted">The PPM driver's own sheets are in the PPM Driver 14-060 plugin.</p>`);
  const draw=()=>{ m.querySelector('#sb').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#sb button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 470" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="848" height="458" fill="none" stroke="var(--line)"/>${SHEETS[i].svg()}<text x="844" y="456" text-anchor="end" font-size="10" fill="var(--ink2)">8100 MP series · sheet ${i+1}/${SHEETS.length} · redrawn 2026|59</text></svg>`;
    m.querySelector('#sn').textContent=SHEETS[i].note; };
  draw();
}

/* ---------------- signal path ---------------- */
function viewPath(m){
  window.__mp8100Active=false;
  m.innerHTML=`<div class="grid2">${card('Signal path of the selected meter at the playhead', `<div id="sp"></div>`)}${card('Pick a meter', `<div id="fp"></div>`)}</div>`;
  SIM.on('time', ()=>{
    const S=simulate(), n=idx(SIM.t), k=Math.min(M.sel,S.out.length-1), o=S.out[k], r=rails(), c=M.ch[k];
    const st = o.ty==='VU'? [
      ['Rear METER'+(k+1), `${o.vin[n].toFixed(3)} V`, `${chLevel(k)>=0?'+':''}${chLevel(k)} dBu, ${c.conn?'plugged':'open'}`],
      ['SA-MP4-1 buffer', '× 1 (0 dB)', 'R13/R11 = 13K/13K, NE5532N (inferred topology)'],
      ['CAL'+(k+1)+' trim', `${c.cal>=0?'+':''}${c.cal} dB`, 'PT10V-50K on the back of the board'],
      ['mp4-2 relay', M.relay?'3K6 direct':`pad ${PAD} dB`, M.relay?'energised: COM → NO':'released: COM → NC (SOT values, inferred)'],
      ['VU rectifier + movement', `${(o.th[n]*100).toFixed(1)} % of arc`, '3900 Ω, full-wave average, ζ 0.81'],
      ['Reading', fmtRead('VU',o.th[n]), '0 VU = +4 dBu steady sine']]
     : [
      ['Rear METER'+(k+1), `${o.vin[n].toFixed(3)} V`, `${chLevel(k)>=0?'+':''}${chLevel(k)} dBu`],
      ['CAL'+(k+1), `${c.cal>=0?'+':''}${c.cal} dB`, 'modelled ahead of the driver (inferred)'],
      ['14-060 front end', `× ${(atten(SENS[D.sens].R)*Gd()).toFixed(3)}`, 'R7 6K49 shunt, U1A (R16+R64)/R13'],
      ['Log shaper U1B', `${activeQ(o.vc[n])} of 6`, 'ladder stages needed to hold the present C4 level (SET 2–7)'],
      ['C4 (peak hold)', `${o.vc[n].toFixed(3)} V`, 'charge R51·C4 1 ms, release R54·C4 2.2 s'],
      ['U3B → R56 3K32', `${Math.max(0,o.vc[n]-r.Voff).toFixed(3)} V`, `minus ${(r.Voff*1e3).toFixed(0)} mV dead zone`],
      ['Sifam movement', `${(o.th[n]*100).toFixed(1)} %`, MOVES[D.move].lab],
      ['Reading', fmtRead('PPM',o.th[n]), 'dial −12…+12, line-up = 0']];
    m.querySelector('#sp').innerHTML=`<p class="small">M${k+1} — ${o.ty}</p><svg viewBox="0 0 520 ${st.length*40+10}" style="width:100%">${st.map((x,i)=>`<rect x="6" y="${6+i*40}" width="508" height="32" rx="6" fill="var(--panel2)" stroke="var(--line)"/><text x="14" y="${20+i*40}" font-size="11.5" font-weight="700" fill="var(--ink)">${x[0]}</text><text x="210" y="${20+i*40}" font-size="11.5" font-family="var(--mono)" fill="var(--ink)">${x[1]}</text><text x="14" y="${33+i*40}" font-size="9.5" fill="var(--ink2)">${x[2]}</text>`).join('')}</svg>`;
    m.querySelector('#fp').innerHTML=frontSVG(SIM.t); bindPanels(m);
  });
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__mp8100Active=false;
  const B=bench(); const b10=B.rows.find(r=>r.ms===10);
  m.innerHTML=card('What the MP series is up to — findings', `<ol>
   <li><b>The “function unknown” board is the meter light bar.</b> The README marks <span class="mono">PCB/SA14-268</span> as unknown. Its schematic's DocumentNumber is “VU Meter Light Bar” (ISS.2, 2012|45, drawn by DSB): four HLMP-2450 LED light bars and two 150 Ω ½ W resistors (<span class="mono">Sheet1.SCHDOC</span>).</li>
   <li><b>A PPM meter brings its own driver.</b> <span class="mono">PCB/14-060/PPMDR_ISS5</span> is a byte-identical copy of the RD81 PPM driver. Its M1 footprint is the meter, so each PPM on an MP panel carries a 14-060 on its studs ${inf}. A 10 ms burst reads ${b10?b10.ppm.toFixed(1):'—'} dB on the PPM and ${b10?b10.vu.toFixed(1):'—'} dB on the VU next to it (One second tab).</li>
   <li><b>The 7 PPM marks match the 7 trimmers.</b> The MP2 (PPM) faces read −12, −8 … +12 (not the BBC 1–7 scale), evenly spaced, and the 14-060 has THLD/SET 1 plus SET 2…SET 7.</li>
   <li><b>Trim value changed.</b> <span class="mono">MP4-1.PCB</span> (Jul 1999) lists TRIM1–4 as PT10V-1K; the FINAL BOM lists PT10V-50K. Both TRIMs and the Phoenix TB1–4 are “INSTALL ON BACK OF BOARD”: that is how the trims line up with the rear CAL holes and the plugs with the METER cut-outs.</li>
   <li><b>Op-amps and regulators changed after 1999.</b> MP4-1.DSN uses LF353 and two LM7805 (REG1, REG2); the FINAL BOM has NE5532N and no regulators. The BOM also lists 8-pin sockets with “DO NOT INSTALL”.</li>
   <li><b>A 2002 range-switch board.</b> <span class="mono">mp4-2.net</span>: two G5V-2 relays, each switching two METER lines between a plain 3K6 build-out and an L-pad (2K trim + “SOT” resistors) ${inf} for the pin roles. The netlist has no values for the pads.</li>
   <li><b>3K6 is the textbook VU build-out.</b> R16/R26/R36/R46 3K6 and a 3900 Ω VU movement give the standard 0 VU = +4 dBu (1.228 V). R14…R44 3K32 is the same value as the PPM driver's R56.</li>
   <li><b>An openGear drawing in a meter folder.</b> <span class="mono">M6206A-ASSY - #Assembly.pdf</span> (P-CAD 2002, “Gear open”) is identical to <span class="mono">#OPENGEAR #SERIES/M6206 - #Engineering #OPENGEAR/PCB/M6206A-ASSY.pdf</span>: it is not an MP part.</li>
   <li><b>Misleading folder and duplicates.</b> <span class="mono">MP4 METER PANEL - #Master/MP3 - #Mechanical</span> only holds the MP4-1 BOM again; <span class="mono">MECHANICAL/</span> and <span class="mono">SILKS/</span> repeat the 2016 DA folders.</li>
   <li><b>115 V only.</b> The rear silk (May 13/15) prints only “115 VAC, 1A SB.”; no 230 V marking exists on the artwork.</li>
   <li><b>Artwork 2026|59: front/rear panels now from ${SIM.src('#MP (8100) #SERIES/8100 CHASSIS - #ARTWORK #DA #2016/8100MP-FRONT-SILK (CURVE).CDR','8100MP-FRONT-SILK (CURVE).CDR')} (2015-10-09) and ${SIM.src('#MP (8100) #SERIES/8100 CHASSIS - #ARTWORK #DA #2016/8100MP-REAR-SILK (CURVE).CDR','8100MP-REAR-SILK (CURVE).CDR')} (2015-10-08), both titled MAY 13/15.</b> Despite “(CURVE)” in its name, the front file still holds the title as live <i>Hobo Std</i> text, so the outlines come from its own CorelDRAW PDF export. The rear file is true curves; its guides put the four rack-ear holes at 0.17″ / 16.53″ across and 0.52″ / 2.78″ up (the model's screws were moved there) and the CAL trimmer holes 0.73″ down. The rear legend says <b>115 VAC, 1A SB</b> only, with no 230 V option. Identical copies sit in <span class="mono">SILKS/</span>.</li>
   <li><b>The front silk is one line.</b> 8100MP-FRONT-SILK is just “MP SERIES by WARD-BECK SYSTEMS” at 1:1 with the two left rack slots as reference; the panel drawings say “SILKSCREEN TO ARTWORK # 8100MP-FRONT-SILK”. The cut-outs were changed on Feb 13/14 (ISS 3, “changed cut-out F & H.W. E”).</li>
   <li><b>“1C2V”.</b> PCB/MP4(1C2V)ASS.DSN (2005|38) names a variant with one “C” meter and two VU; what “C” stands for (correlation?) is not stated ${inf}.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
   <li>SA-MP4-1 channel topology from BOM values; split rails ≈ ±16 V ${inf}.</li>
   <li>PPM channels: the 14-060 model from the PPM Driver plugin, as-built +4 dBu sensitivity, Sifam ${MOVES[D.move].lab} ${inf}.</li>
   <li>VU movement: ANSI C16.5 2nd-order fit (ζ 0.81, 99 % at 300 ms); 0 VU at 70.8 % of the arc.</li>
   <li>Relay pad −4 dB and per-input offsets are illustration values ${inf}. Meter-to-plug order: METER1 is the leftmost meter seen from the front.</li></ul>`)
   + card('Sources', `<ul class="small mono"><li>#MP (8100) #SERIES/8100 CHASSIS - #ARTWORK #DA #2016/*SILK (CURVE).pdf, Pics/*.jpg</li><li>…/8100 CHASSIS - #Mechanical #DA #2016/PDF\`S/8100MP-1…4, 8100-REAR ISS 2</li><li>…/MP4 METER PANEL - #Master/MP4-1 FINAL BOM.xlsx, BOM Structure MP4-1.pdf</li><li>…/PCB/MP4-1.DSN, MP4-1.PCB, mp4-2.net, SA14-268/14-268-ISS2/Sheet1.SCHDOC, 14-060/PPMDR_ISS5/*</li><li>…/M6206A-ASSY - #Assembly.pdf</li></ul>`);
}

initK();
SIM.register({
  id:'mp8100', name:'MP 8100 meter panels · rack VU/PPM meter panels (1996|29)', duration:1,
  product:'MP 8100 meter panels', year:1996, family:'Monitors, meters & tools', folder:'#MP (8100) #SERIES',
  summary:'Two-unit 19″ meter panels on the 8100 chassis carrying one to four Sifam VU or PPM meters. VU meters run from the SA-MP4-1 power-supply and buffer board through 3K6 build-outs; each PPM carries a 14-060 PPM driver. Drawings date from 1996|29 to 2016|49.',
  highlights:['Front and rear panels to scale with the real 2015 silk artwork','VU next to PPM, needle by needle, from the real circuit values','Rear CAL trims and METER plugs are clickable','Burst test: what a VU misses that a PPM catches','Unknown 14-268 board identified as the meter light bar'],
  depth:'Hardware model',
  stepUnits:[ {label:'10 ms', period:()=>0.01}, {label:'1 ms', period:()=>0.001}, {label:'1 model sample', period:()=>1/FS} ],
  zooms:[[1,'1 s (whole)'],[0.3,'300 ms (VU rise)'],[0.05,'50 ms'],[0.012,'12 ms'],[0.002,'2 ms']],
  defaultZoom:0,
  footnotes:[
    {text:"Despite “(CURVE)” in its name, 8100MP-FRONT-SILK keeps the title “MP SERIES by WARD-BECK SYSTEMS” as live Hobo Std text; only its CorelDRAW PDF export carries the glyph outlines.", src:"#MP (8100) #SERIES/8100 CHASSIS - #ARTWORK #DA #2016/8100MP-FRONT-SILK (CURVE).CDR"},
    {text:"The front silk is a single line of text plus two ellipses marking the left rack slots as a reference.", src:"#MP (8100) #SERIES/8100 CHASSIS - #ARTWORK #DA #2016/8100MP-FRONT-SILK (CURVE).CDR"},
    {text:"The rear legend states 115 VAC, 1A SB only; there is no 230 V marking.", src:"#MP (8100) #SERIES/8100 CHASSIS - #ARTWORK #DA #2016/8100MP-REAR-SILK (CURVE).CDR"},
    {text:"The rear silk's guides put the four rack-ear holes at 0.17 in / 16.53 in across and 0.52 in / 2.78 in up on the 16.7 in × 3.27 in plate.", src:"#MP (8100) #SERIES/8100 CHASSIS - #ARTWORK #DA #2016/8100MP-REAR-SILK (CURVE).CDR"},
    {text:"Both silk files are stored twice, in 8100 CHASSIS - #ARTWORK #DA #2016 and in SILKS.", src:"#MP (8100) #SERIES/SILKS/8100MP-REAR-SILK (CURVE).CDR"},
  ],
  tabs:[ {id:'sim',label:'Simulator',render:viewSim}, {id:'tutorial',label:'Tutorial',render:viewTut}, {id:'second',label:'One second: VU vs PPM',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock}, {id:'schematic',label:'Schematics',render:viewSchem}, {id:'software',label:'Signal path',render:viewPath}, {id:'findings',label:'Findings',render:viewNotes} ],
});
})();
