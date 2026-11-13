/* =====================================================================
   PPM Driver 14-060 ISS5 (RD81) — discrete peak-programme-meter driver
   Ward-Beck Systems, 2015|48. Plugin for the WBS Device Simulator.

   Sources (all in this archive):
   - #PPM #SERIES/PPM Driver - #RD #RD81/PCB/PPMDR_ISS5/PPM_DRIVER.pdf  (schematic, "14-060 PPM Driver",
       ISS5, 2/11/2015) — every net and part value below is read off this sheet
   - .../PPMDR_ISS5/PPM_DRIVER.xls  (BOM: sheets "14-060" and "BOM_MAIN", fitted / DNI parts)
   - .../PPMDR_ISS5/Pick Place for PPM_DRIVER.csv  (part positions, used to place the overlays)
   - .../PPMDR_ISS5/PPM_DRIVER_ASSEMBLY.pdf  (assembly drawing = the board artwork, assets/ppm-driver-assy-white.png)
   - .../PPM Driver #Datasheet/Sifam PPM Meter - Presentor_FR_Meters_web #Datasheet.pdf  (1 mA FSD,
       600 Ω PPM / 465 Ω FR terminal resistance, "Comparison of FR/PPM responses" step curves)
   - #PPM #SERIES/PPM Driver - #TESTREPORT/14-060 - PPM DRIVER-14-060-27AUG15.pdf
   - #MP (8100) #SERIES/8100 CHASSIS - #ARTWORK #DA #2016/Pics/MP2(PPM) Front.jpg  (the −12…+12 dial)
   No firmware: the "software" tab is the analog signal path stage by stage.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const ASSET = 'siumulation-plugins/assets/';

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

/* ---------------- stimulus ---------------- */
const STIM = {
  burst:  {lab:'Tone burst (IEC test)', env:t=> (t>=0.1 && t<0.1+D.burstMs/1000)?1:0},
  tone:   {lab:'Tone switched on at 50 ms', env:t=> t>=0.05?1:0},
  release:{lab:'Tone switched off at 50 ms (fall)', env:t=> t<0.05?1:0, pre:true},
  prog:   {lab:'Programme-like (synthetic speech envelope)', env:t=> progEnv(t)},
};
function progEnv(t){ const s=Math.max(0,Math.sin(2*Math.PI*4.3*t)); const k=0.18+0.82*s*s*(0.55+0.45*Math.sin(2*Math.PI*0.9*t+1)); return (t>0.62&&t<0.625)?1.6:k; }
function carrier(t){ if (D.stim!=='prog') return Math.sin(2*Math.PI*D.freq*t);
  return 1.8*(0.55*Math.sin(2*Math.PI*220*t)+0.3*Math.sin(2*Math.PI*660*t+1.1)+0.25*Math.sin(2*Math.PI*1530*t+2.3)+0.12*Math.sin(2*Math.PI*3300*t+0.4)); }  // scaled so programme peaks near line-up — inferred

/* ---------------- the simulated second ---------------- */
const FS = 96000;
let KEY='', SIMR=null;
function buildTable(r){ const N=2048, V=new Float32Array(N), I=new Float32Array(N); for (let k=0;k<N;k++){ V[k]=r.Vmax*k/(N-1); I[k]=fI(V[k],D.T); } return {V,I,N}; }
function lookup(tab, i){ if (i<=0) return 0; const I=tab.I; if (i>=I[tab.N-1]) return tab.V[tab.N-1]; let lo=0, hi=tab.N-1; while(hi-lo>1){ const m=(lo+hi)>>1; if (I[m]<i) lo=m; else hi=m; } const f=(i-I[lo])/(I[hi]-I[lo]); return tab.V[lo]+f*(tab.V[hi]-tab.V[lo]); }
function runSim(opts){
  opts = opts||{};
  const fs = opts.fs||FS, dur = opts.dur||1, N = Math.round(fs*dur), dt = 1/fs, r = rails(), M = mv();
  const env = opts.env || STIM[D.stim].env, pre = opts.pre!==undefined? opts.pre : !!STIM[D.stim].pre;
  const lvl = opts.level!==undefined? opts.level : D.level, f = opts.freq||D.freq;
  const A = 0.7746*Math.SQRT2*Math.pow(10,lvl/20), g = atten(SENS[D.sens].R)*Gd()*KABS*D.kt/C.R63;
  const tab = buildTable(r);
  const ka = 1-Math.exp(-dt/(C.R51*D.C4)), kd = Math.exp(-dt/(C.R54*D.C4));
  const w = M.wn, z = M.zeta, RL = C.R56 + M.Rm;
  const out = opts.light? null : { vin:new Float32Array(N), x:new Float32Array(N), vs:new Float32Array(N), vc:new Float32Array(N), th:new Float32Array(N), q:new Uint8Array(N), nq:new Uint8Array(N) };
  let vc=0, th=0, om=0, maxTh=0, tMax=0, maxVc=0;
  if (pre){ vc = shaper(A*(opts.prog?1:1)*g, D.T, r.Vmax); th = Math.max(0,Math.min(r.Vmax,vc-r.Voff))/RL/C.Ifsd; }
  const carr = opts.carrier || (D.stim==='prog' && !opts.env ? carrier : (t=>Math.sin(2*Math.PI*f*t)));
  for (let n=0;n<N;n++){
    const t=n*dt, v = A*env(t)*carr(t), x = Math.abs(v)*atten(SENS[D.sens].R)*Gd()*KABS;
    const V = lookup(tab, Math.abs(v)*g);
    let q=0; if (V>vc){ vc += (V-vc)*ka; q=1; } vc *= kd;
    const tgt = Math.max(0, Math.min(r.Vmax, vc-r.Voff))/RL/C.Ifsd;
    const acc = w*w*(tgt-th) - 2*z*w*om; om += acc*dt; th += om*dt;
    if (th < -0.03){ th=-0.03; om=0; } if (th > 1.12){ th=1.12; om=0; }    // end stops — inferred
    if (th>maxTh){ maxTh=th; tMax=t; } if (vc>maxVc) maxVc=vc;
    if (out){ out.vin[n]=v; out.x[n]=x; out.vs[n]=V; out.vc[n]=vc; out.th[n]=th; out.q[n]=q; out.nq[n]=activeQ(V); }
  }
  return { fs, N, out, maxTh, tMax, maxVc, vcEnd:vc, thEnd:th };
}
function sim(){ const k=[D.supply,D.sens,D.R64,D.kt,D.T.join(','),D.C4,D.level,D.freq,D.stim,D.burstMs,D.move,KABS].join('|'); if (k!==KEY){ KEY=k; SIMR=runSim(); } return SIMR; }
const idx = t => Math.max(0, Math.min(SIMR.N-1, Math.round(t*FS)));

/* ---------------- ballistics bench (IEC 60268-10 / ANSI style tests) ---------------- */
let BKEY='', BENCH=null;
function bench(){
  const k=[D.supply,D.sens,D.R64,D.kt,D.T.join(','),D.C4,D.move,KABS].join('|'); if (k===BKEY) return BENCH; BKEY=k;
  const S = SENS[D.sens].nom;
  const steady = runSim({light:true, fs:48000, dur:1.2, env:t=>1, pre:true, level:S, freq:5000});
  const ref = dialDb(steady.thEnd), refC = readingDb(steady.vcEnd);
  const durs = [0.5,1,1.5,3,5,10,20,50,100,300];
  const bursts = durs.map(ms=>{ const s=runSim({light:true, fs:96000, dur:0.8, env:t=>(t>=0.02&&t<0.02+ms/1000)?1:0, pre:false, level:S, freq:5000}); return {ms, db:dialDb(s.maxTh)-ref, dbC:readingDb(s.maxVc)-refC, t:s.tMax}; });
  const it2=key=>{ let r=null; for (let k2=1;k2<bursts.length;k2++){ const a=bursts[k2-1], b=bursts[k2]; if (r===null && a[key]<=-2 && b[key]>-2){ const f=(-2-a[key])/(b[key]-a[key]); r=Math.exp(Math.log(a.ms)+f*(Math.log(b.ms)-Math.log(a.ms))); } } return r; };
  const integ=it2('db'), integC=it2('dbC');
  // fall: steady at +12 mark level, then off; record dial reading every 10 ms for 4 s
  const fall = runSim({fs:4000, dur:4, env:t=>t<0.05?1:0, pre:true, level:S+12, freq:1000});
  const fr=[]; let t24=null, t20=null; const r0=dialDb(fall.out.th[150]);
  for (let n=0;n<fall.N;n+=40){ const d=dialDb(fall.out.th[n]); fr.push([n/4000, d, readingDb(fall.out.vc[n])]); }
  for (let n=200;n<fall.N;n++){ const d=readingDb(fall.out.vc[n]); if (t20===null && d<=12-20) t20=n/4000-0.05; if (t24===null && d<=-12) t24=n/4000-0.05; }
  // movement step responses (current step to 80 %)
  const steps = {}; for (const key in MOVES){ const M=MOVES[key], pts=[]; let th=0, om=0, dt=1/4000; for (let n=0;n<2000;n++){ const a=M.wn*M.wn*(1-th)-2*M.zeta*M.wn*om; om+=a*dt; th+=om*dt; if(n%8===0) pts.push(th); } steps[key]=pts; }
  BENCH = { ref, bursts, integ, integC, fall:fr, t20, t24, steps, tauA:C.R51*D.C4, tauD:C.R54*D.C4 };
  return BENCH;
}

/* ---------------- actions (each logs the hardware path) ---------------- */
function logAct(name, lines){ D.log.unshift({name, t:SIM.t, lines}); if (D.log.length>40) D.log.length=40; SIM.refresh(); }
const A = {
  turnTrim(id, dir){
    const r=rails();
    if (id==='R64'){ const o=D.R64; D.R64=Math.max(0,Math.min(C.R64,D.R64+dir*2500)); KEY='';
      logAct(`Turn CAL (R64) ${dir>0?'clockwise':'anticlockwise'}`, [`R64 50K rheostat (wiper tied to pin 3) ${(o/1e3).toFixed(1)} → ${(D.R64/1e3).toFixed(1)} kΩ in series with R16 82K5`,
        `U1A gain = (R16+R64)/R13 = ${Gd().toFixed(3)} → ${(20*Math.log10(Gd())).toFixed(2)} dB; every mark moves by the same dB`,
        `C8 22p across the whole feedback path keeps U1A's bandwidth ≈ ${(1/(2*Math.PI*22e-12*(C.R16+D.R64))/1e3).toFixed(0)} kHz`]); return; }
    if (id==='R22'){ const o=D.kt; D.kt=Math.max(0.75,Math.min(1,D.kt+dir*0.0125)); KEY='';
      logAct(`Turn THLD / SET 1 (R22) ${dir>0?'up':'down'}`, [`R22 5K + R29 15K to VCC_HALF divide U2B's rectified output: ${o.toFixed(4)} → ${D.kt.toFixed(4)}`,
        `R63 15K into U1B: base slope −R36/R63 = −${(C.R36/C.R63).toFixed(3)} × ${D.kt.toFixed(3)} — moves the −12 and −8 marks`]); return; }
    const n = LADDER.findIndex(L=>L.set===id); if (n<0) return; const L=LADDER[n];
    const o=D.T[n]; D.T[n]=Math.max(C.Vbe+0.02, Math.min(r.Vmax, D.T[n]+dir*0.04)); KEY='';
    logAct(`Turn ${L.lab} (${id}) ${dir>0?'up':'down'}`, [`${id} 20K wiper (between VCC_HALF and GND) → ${L.rb} 47K5 → ${L.q} base: ${(o-C.Vbe).toFixed(2)} → ${(D.T[n]-C.Vbe).toFixed(2)} V below VCC_HALF`,
      `${L.q} turns on when U1B's output is ${D.T[n].toFixed(2)} V below VCC_HALF; then ${L.re} ${(L.Re/1e3)} k adds 1/${(L.Re/1e3)}k of feedback (current limited to ${(Math.max(0,D.T[n]-C.Vbe+0.4)/L.Rc*1e6).toFixed(1)} µA by ${L.rc} ${(L.Rc/1e3)}k)`,
      `Steady reading of the ${L.mark!==null?(L.mark>0?'+':'')+L.mark+' mark':'over-range'} tone is now ${L.mark!==null? readingDb(steadyV(SENS[D.sens].nom+L.mark)).toFixed(2)+' dB on the dial':'—'}`]);
  },
  setSens(s){ D.sens=s; KEY=''; logAct('Sensitivity link → '+SENS[s].lab, [`Shunt across the balanced pair after R3/R4 (15K each) = ${isFinite(SENS[s].R)?(SENS[s].R/1e3).toFixed(2)+' kΩ':'open'} ‖ R5 270K`,
    `Attenuation ${(20*Math.log10(atten(SENS[s].R))).toFixed(2)} dB (fitted source 23.5 kΩ / load 36 kΩ); relative to the 6K49 build: ${(20*Math.log10(atten(SENS[s].R)/atten(6490))).toFixed(2)} dB`,
    s==='s8x'? 'R65 0R still shorts H1 pins 1–2, so R7 stays in parallel with R8: the panel reads about 3 dB higher than the label says (see Findings)' : 'Re-run the calibration (button) to bring the dial back on the marks']); },
  setMove(k){ D.move=k; KEY=''; logAct('Meter movement → '+MOVES[k].lab, [`M1 terminal resistance ${MOVES[k].Rm} Ω + R56 3K32 → full scale (1 mA) at ${(Rload()/1000).toFixed(2)} V from U3B`, `Needle: ζ = ${MOVES[k].zeta}, ωn = ${MOVES[k].wn.toFixed(1)} rad/s (${MOVES[k].src})`]); },
  setC4(v){ D.C4=v; KEY=''; logAct(`What-if: C4 = ${(v*1e6).toFixed(2)} µF`, [`attack τ = R51·C4 = ${(C.R51*v*1e3).toFixed(2)} ms; release τ = R54·C4 = ${(C.R54*v).toFixed(2)} s (as built 1 µF: 1 ms / 2.2 s)`]); },
  supply(v){ D.supply=v; KEY=''; const r=rails(); logAct(`Supply → ${v.toFixed(1)} V`, [`VCC = SUPPLY − D7 = ${r.VCC.toFixed(2)} V (REG1 LM317L not fitted, R70 0R bypass)`, `VCC_HALF = VCC·R61/(R60+R61) − Vbe(Q8) = ${r.VH.toFixed(2)} V; dead-zone offset into U3B = ${(r.Voff*1e3).toFixed(0)} mV`, `U3B can swing ${r.Vmax.toFixed(2)} V: full scale needs ${(Rload()*C.Ifsd).toFixed(2)} V`]); },
};

/* ---------------- drawing helpers ---------------- */
function card(t,b){ return `<div class="card"><h2>${t}</h2>${b}</div>`; }
function trace(c, X, t0, t1, y, h, arr, lo, hi, col, fill){
  const fs=FS, x0=X(t0), x1=X(t1), W=Math.max(1,Math.round(x1-x0)); c.strokeStyle=col; c.fillStyle=col; c.lineWidth=1.2;
  const Y=v=> y+h-2-(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo)*(h-4);
  const spp=(t1-t0)*fs/W;
  if (spp<=2){ c.beginPath(); const a=Math.max(0,Math.floor(t0*fs)), b=Math.min(arr.length-1,Math.ceil(t1*fs)); for(let n=a;n<=b;n++){ const xx=X(n/fs), yy=Y(arr[n]); n===a?c.moveTo(xx,yy):c.lineTo(xx,yy);} c.stroke(); return; }
  for (let p=0;p<W;p++){ const a=Math.max(0,Math.floor((t0+(t1-t0)*p/W)*fs)), b=Math.min(arr.length-1,Math.floor((t0+(t1-t0)*(p+1)/W)*fs)); if (a>b) continue; let mn=Infinity,mx=-Infinity; for(let n=a;n<=b;n++){ const v=arr[n]; if(v<mn)mn=v; if(v>mx)mx=v; } const ya=Y(mx), yb=Y(mn); c.fillRect(x0+p, ya, 1, Math.max(1,yb-ya)); }
}
/* Sifam-style PPM dial, −12…+12, as on the MP2 (PPM) photo (no maker's logo reproduced) */
function meterSVG(th, opts){
  opts=opts||{}; const W=310, H=160, cx=W/2, cy=H+70, R=200, a0=-38, a1=38;
  const ang = d=> (a0+(a1-a0)*d)*Math.PI/180, P=(d,rr)=>[cx+rr*Math.sin(ang(d)), cy-rr*Math.cos(ang(d))];
  let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${opts.max||330}px;display:block;border-radius:8px" role="img" aria-label="PPM meter">
   <defs><linearGradient id="pfg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2316"/><stop offset="1" stop-color="#0f0c08"/></linearGradient></defs>
   <rect width="${W}" height="${H}" rx="8" fill="#060606"/><rect x="8" y="8" width="${W-16}" height="${H-16}" rx="5" fill="url(#pfg)" stroke="#3a3326"/>`;
  const arc=(d0,d1,rr,col,wd)=>{ const [x0,y0]=P(d0,rr),[x1,y1]=P(d1,rr); return `<path d="M${x0} ${y0} A${rr} ${rr} 0 0 1 ${x1} ${y1}" fill="none" stroke="${col}" stroke-width="${wd}"/>`; };
  s+=arc(0,1,R-62,'#d9b56a',1.2)+arc(dialPos(8),dialPos(12),R-58,'#e0a020',7);
  MARKS.forEach(m=>{ const d=dialPos(m), [x0,y0]=P(d,R-62), [x1,y1]=P(d,R-48), [tx,ty]=P(d,R-36); s+=`<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#f0d79a" stroke-width="2"/><text x="${tx}" y="${ty}" font-size="12" fill="#f0d79a" text-anchor="middle">${m>0?'+':''}${m}</text>`; });
  for (let m=-12;m<=12;m+=2) if (m%4){ const d=dialPos(m), [x0,y0]=P(d,R-62),[x1,y1]=P(d,R-55); s+=`<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#d9b56a"/>`; }
  s+=`<rect x="${cx-22}" y="${H-58}" width="44" height="14" rx="3" fill="none" stroke="#d9b56a"/><text x="${cx}" y="${H-47}" font-size="10" text-anchor="middle" fill="#d9b56a" font-weight="700">WBS</text><text x="22" y="${H-16}" font-size="9" fill="#a89060">dB</text>`;
  const d=Math.max(-0.03,Math.min(1.12,th)), [nx,ny]=P(d,R-30), [bx,by]=P(d,R-150);
  s+=`<line x1="${bx}" y1="${by}" x2="${nx}" y2="${ny}" stroke="#f4efe6" stroke-width="2.4" stroke-linecap="round"/>`;
  if (opts.label) s+=`<text x="${W-14}" y="${H-14}" font-size="10" fill="#a89060" text-anchor="end">${opts.label}</text>`;
  return s+'</svg>';
}

/* ---------------- the board (real assembly artwork) ---------------- */
const BX = X => 419 + (X-3050)*0.5667, BY = Y => 99 + (4425-Y)*0.5667;     // Pick Place mil → artwork pixels
const TRIMS = [ ['R22',3050,4425,'THLD / SET 1'], ...LADDER.map((L,k)=>[L.set,[3440,3830,4220,4610,5000,5390][k],4425,L.lab]), ['R64',2755,3345,'CAL'] ];
const PROBES = { U1A:[3855,3805,'U1A out',-330,-150], U2B:[2825,3850,'U2B |x|',-120,110], U1B:[4140,3800,'U1B Vs',-60,140], C4:[5210,3812,'C4',-260,-150], OUT:[5040,3730,'PPM_OUT',-200,200] };
function trimPos(id){ if (id==='R64') return D.R64/C.R64; if (id==='R22') return (1-D.kt)/0.25; const n=LADDER.findIndex(L=>L.set===id); const r=rails(); return 1-(D.T[n]-C.Vbe)/r.VH; }
function boardSVG(t){
  const s0=sim(), n=idx(t), o=s0.out, r=rails();
  let s=`<svg viewBox="0 0 2096 1265" style="width:100%;display:block;border-radius:8px" role="img" aria-label="PPM Driver 14-060 ISS5 board (assembly artwork)">
   <rect width="2096" height="1265" rx="14" fill="#155a34"/><image href="${ASSET}ppm-driver-assy-white.png" width="2096" height="1265"/>`;
  TRIMS.forEach(([id,x,y,lab])=>{ const cx=BX(x), cy=BY(y), p=trimPos(id), a=(-135+270*Math.max(0,Math.min(1,p)))*Math.PI/180;
    const w = id==='R64'?150:150, h=id==='R64'?100:96;
    s+=`<g class="trim" data-id="${id}" style="cursor:pointer"><rect x="${cx-w/2}" y="${cy-h/2}" width="${w}" height="${h}" rx="6" fill="#2b4fa8" stroke="#0d1d44" stroke-width="3"/>
      <circle cx="${cx}" cy="${cy}" r="30" fill="#c9cdd2" stroke="#555"/><line x1="${cx-26*Math.cos(a)}" y1="${cy-26*Math.sin(a)}" x2="${cx+26*Math.cos(a)}" y2="${cy+26*Math.sin(a)}" stroke="#333" stroke-width="7"/>
      <text x="${cx}" y="${cy+h/2+26}" font-size="22" text-anchor="middle" fill="#ffe9a8" font-weight="700">${lab}</text><title>${id} ${lab}: click left half to turn down, right half to turn up (wheel works too)</title></g>`; });
  // H1 sensitivity link
  const h1x=BX(3045), h1y=BY(2685); const pos = D.sens==='s8'||D.sens==='s8x'? 'b' : 'a';
  s+=`<g class="h1" style="cursor:pointer"><rect x="${h1x-24}" y="${h1y-80}" width="48" height="160" rx="4" fill="#111" opacity=".85"/>${[-50,0,50].map(d=>`<circle cx="${h1x}" cy="${h1y+d}" r="9" fill="#d4af37"/>`).join('')}
    <rect x="${h1x-18}" y="${h1y+(pos==='a'?-62:-12)}" width="36" height="74" rx="6" fill="#222" stroke="#e6e6e6" stroke-width="3"/>
    ${D.sens==='s8'?'':`<rect x="${BX(2945)-16}" y="${BY(2745)-34}" width="32" height="68" fill="#666" stroke="#ddd" stroke-width="2"/>`}
    <title>H1 sensitivity link (DNI on the BOM). Click to cycle +4 / +8 (R65 in) / +8 (R65 out)</title></g>`;
  // probes with live voltages
  const vals = { U1A: o.vin[n]*atten(SENS[D.sens].R)*Gd()*KABS, U2B:o.x[n], U1B:-o.vs[n], C4:-o.vc[n], OUT: Math.max(0,Math.min(r.Vmax,o.vc[n]-r.Voff)) };
  for (const k in PROBES){ const [x,y,lab,dx,dy]=PROBES[k]; const cx=BX(x), cy=BY(y); const on=D.sel===k, lx=cx+dx, ly=cy+dy;
    s+=`<g class="probe" data-p="${k}" style="cursor:pointer"><line x1="${cx}" y1="${cy}" x2="${lx+20}" y2="${ly}" stroke="#ffd34d" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="${on?24:18}" fill="${on?'#ff5a4a':'#ffd34d'}" stroke="#000" stroke-width="3"/>
      <rect x="${lx}" y="${ly-30}" width="390" height="56" rx="8" fill="rgba(0,0,0,.8)" stroke="#ffd34d"/><text x="${lx+14}" y="${ly+9}" font-size="34" fill="#fff" font-family="monospace">${lab} ${vals[k]>=0?'+':''}${vals[k].toFixed(3)} V</text></g>`; }
  // ladder transistors lit when conducting
  const nq=o.nq[n]; LADDER.forEach((L,k)=>{ const x=[3346,3736,4126,4516,4906,5302][k]; if (k<nq) s+=`<rect x="${BX(x)-26}" y="${BY(4250)-40}" width="52" height="80" rx="8" fill="none" stroke="#ff5a4a" stroke-width="6"/>`; });
  if (o.q[n]) s+=`<rect x="${BX(4298)-26}" y="${BY(3820)-50}" width="52" height="100" rx="8" fill="none" stroke="#ffb43a" stroke-width="6"><title>Q7 conducting: C4 charging through R51</title></rect>`;
  return s+`<text x="20" y="1250" font-size="22" fill="#cfe8d8">Artwork: PPM_DRIVER_ASSEMBLY.pdf (14-060 ISS.5). Values are relative to VCC_HALF. Red boxes: ladder transistors conducting; amber: Q7 charging C4.</text></svg>`;
}
function bindBoard(root){
  root.querySelectorAll('.trim').forEach(g=>{ const id=g.dataset.id;
    g.addEventListener('click', e=>{ const b=g.getBoundingClientRect(); A.turnTrim(id, (e.clientX-b.left)/b.width<0.5?-1:1); });
    g.addEventListener('wheel', e=>{ e.preventDefault(); A.turnTrim(id, e.deltaY<0?1:-1); }, {passive:false}); });
  const h=root.querySelector('.h1'); if (h) h.addEventListener('click', ()=>{ const order=['s4','s8x','s8']; const i=order.indexOf(D.sens); A.setSens(order[(i+1)%3]); });
  root.querySelectorAll('.probe').forEach(g=> g.addEventListener('click', ()=>{ D.sel=g.dataset.p; SIM.refresh(); }));
}

/* ---------------- timeline lanes ---------------- */
function lanes(){
  const s0=sim(), o=s0.out, r=rails(), css=SIM.css, Am=0.7746*Math.SQRT2*Math.pow(10,(D.level+3)/20);
  const markLines=(c,X,t0,t1,y,h,lo,hi,vals,col)=>{ c.strokeStyle=col; c.setLineDash([3,4]); c.lineWidth=1; vals.forEach(v=>{ const yy=y+h-2-(v-lo)/(hi-lo)*(h-4); c.beginPath(); c.moveTo(X(t0),yy); c.lineTo(X(t1),yy); c.stroke(); }); c.setLineDash([]); };
  return [
    {label:`Input (balanced, ${D.level>=0?'+':''}${D.level} dBu)`, h:44, draw(c,X,t0,t1,y,h){ trace(c,X,t0,t1,y,h,o.vin,-Am,Am,css('--accent2')); }},
    {label:'U2A/U2B full-wave |x| (V)', h:40, draw(c,X,t0,t1,y,h){ trace(c,X,t0,t1,y,h,o.x,0,Math.max(0.5,xPeak(D.level+3)),css('--accent')); }},
    {label:'U1B log shaper |Vs| (V) · marks dashed', h:52, draw(c,X,t0,t1,y,h){ markLines(c,X,t0,t1,y,h,0,r.Vmax,MARKS.map(Vt),css('--grid')); trace(c,X,t0,t1,y,h,o.vs,0,r.Vmax,css('--warn')); }},
    {label:'Ladder Q1–Q6 conducting', h:30, draw(c,X,t0,t1,y,h){ trace(c,X,t0,t1,y,h,o.nq,0,6,css('--bad')); }},
    {label:'Q7 on: C4 charging (R51 1K)', h:22, draw(c,X,t0,t1,y,h){ trace(c,X,t0,t1,y,h,o.q,0,1,css('--warn')); }},
    {label:`C4 hold voltage (τ ${(C.R51*D.C4*1e3).toFixed(1)} ms / ${(C.R54*D.C4).toFixed(1)} s)`, h:52, draw(c,X,t0,t1,y,h){ markLines(c,X,t0,t1,y,h,0,r.Vmax,[r.Voff],css('--ink2')); markLines(c,X,t0,t1,y,h,0,r.Vmax,MARKS.map(Vt),css('--grid')); trace(c,X,t0,t1,y,h,o.vc,0,r.Vmax,css('--accent')); }},
    {label:'Needle (dial dB) · '+D.move, h:58, draw(c,X,t0,t1,y,h){ markLines(c,X,t0,t1,y,h,-0.03,1.12,MARKS.map(dialPos),css('--grid')); trace(c,X,t0,t1,y,h,o.th,-0.03,1.12,css('--play')); c.fillStyle=css('--ink2'); c.font='10px sans-serif'; MARKS.forEach(m=>{ const yy=y+h-2-(dialPos(m)+0.03)/1.15*(h-4); c.fillText((m>0?'+':'')+m, X(t0)+3, yy-1); }); }},
  ];
}

/* ---------------- views ---------------- */
function controls(){
  return `<div style="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center" class="small">
   <label>Stimulus <select id="st">${Object.keys(STIM).map(k=>`<option value="${k}" ${k===D.stim?'selected':''}>${STIM[k].lab}</option>`).join('')}</select></label>
   <label>Burst <select id="bm">${[0.5,1.5,3,5,10,20,50,100,300].map(v=>`<option ${v===D.burstMs?'selected':''}>${v}</option>`).join('')}</select> ms</label>
   <label>Freq <select id="fq">${[100,1000,5000,10000].map(v=>`<option value="${v}" ${v===D.freq?'selected':''}>${v>=1000?v/1000+' k':v}</option>`).join('')}</select>Hz</label>
   <label>Level <input type="range" id="lv" min="-24" max="24" step="1" value="${D.level}"> <span id="lvv" class="mono"></span></label>
   <label>Movement <select id="mvs">${Object.keys(MOVES).map(k=>`<option value="${k}" ${k===D.move?'selected':''}>${MOVES[k].lab}</option>`).join('')}</select></label>
   <label>Sensitivity <select id="sn">${Object.keys(SENS).map(k=>`<option value="${k}" ${k===D.sens?'selected':''}>${SENS[k].lab}</option>`).join('')}</select></label>
   <label>What-if C4 <select id="c4">${[0.47e-6,1e-6,2.2e-6].map(v=>`<option value="${v}" ${v===D.C4?'selected':''}>${v*1e6} µF${v===1e-6?' (as built)':''}</option>`).join('')}</select></label>
   <label>Supply <input type="range" id="sp" min="12" max="30" step="0.5" value="${D.supply}"> <span id="spv" class="mono"></span></label>
   <button id="cal">Factory calibrate</button></div>`;
}
function bindControls(m){
  const q=s=>m.querySelector(s); const up=()=>{ if(q('#lvv')) q('#lvv').textContent=(D.level>=0?'+':'')+D.level+' dBu'; if(q('#spv')) q('#spv').textContent=D.supply.toFixed(1)+' V '; };
  up();
  q('#st').onchange=e=>{ D.stim=e.target.value; logAct('Stimulus → '+STIM[D.stim].lab, ['Generator into PPM_IN_P / PPM_IN_N (P3), through C1/C2 22µ and R3/R4 15K']); };
  q('#bm').onchange=e=>{ D.burstMs=+e.target.value; SIM.refresh(); };
  q('#fq').onchange=e=>{ D.freq=+e.target.value; SIM.refresh(); };
  q('#lv').oninput=e=>{ D.level=+e.target.value; up(); SIM.refresh(); };
  q('#mvs').onchange=e=>A.setMove(e.target.value);
  q('#sn').onchange=e=>A.setSens(e.target.value);
  q('#c4').onchange=e=>A.setC4(+e.target.value);
  q('#sp').onchange=e=>{ A.supply(+e.target.value); up(); };
  q('#cal').onclick=()=>calibrate();
}
function logHTML(){ const e=D.log[0]; return e? `<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`+e.lines.map(l=>`<div>→ ${l}</div>`).join('') : '<div class="muted">Turn a trimmer on the board, move the link or change the stimulus. Each change is traced through the circuit here.</div>'; }

function viewSim(m){
  window.__ppmdrvActive=false;
  m.innerHTML = `<div class="grid2"><div>${card('The board — 14-060 PPM Driver ISS5 (click trimmers, the H1 link, or a probe)', `<div id="bd"></div>`)}</div>
    <div>${card('The meter at the playhead (M1)', `<div id="mt"></div><div id="rd" class="small mono" style="margin-top:6px"></div>`)}${card('What the hardware did', `<div id="tr" class="log"></div>`)}</div></div>
    ${card('Stimulus and options', controls())}
    ${card('One second, zoomable — click to seek', `<canvas id="tl"></canvas><p class="small muted">Sample-by-sample model at ${FS/1000} kHz: real component values; supply ${inf} (${D.supply} V); dial positions ${inf}. Charge τ = R51·C4, release τ = R54·C4.</p>`)}`;
  bindControls(m);
  SIM.on('time', ()=>{
    const s0=sim(), n=idx(SIM.t), o=s0.out;
    m.querySelector('#bd').innerHTML=boardSVG(SIM.t); bindBoard(m.querySelector('#bd'));
    m.querySelector('#mt').innerHTML=meterSVG(o.th[n],{label:D.move});
    m.querySelector('#rd').innerHTML=`needle ${(o.th[n]*100).toFixed(1)} % · reads ${o.th[n]<dialPos(-12)-0.02?'below −12 (rest)':dialDb(o.th[n]).toFixed(2)+' dB'} · C4 ${o.vc[n].toFixed(3)} V (dial value ${readingDb(o.vc[n]).toFixed(2)} dB)<br>peak needle this second ${dialDb(s0.maxTh).toFixed(2)} dB at ${SIM.fmtDur(s0.tMax)}`;
    m.querySelector('#tr').innerHTML=logHTML();
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200});
  });
}

const LESSONS = [
  {title:'Meet the PPM Driver', body:`<p>The 14-060 is a small analog board that sits on the back of a moving-coil PPM. It takes a balanced line, rectifies it, bends it into a <b>dB-linear</b> law with six transistor break points, catches the peaks on a capacitor and drives the meter through 3K32.</p><p>There is no microcontroller. Everything you set is a trimmer: <b>CAL</b> (R64), <b>THLD / SET 1</b> (R22) and <b>SET 2…SET 7</b> (R23–R28).</p><p class="muted">The calibration procedure is not in the archive (README); these steps are the obvious one ${inf}.</p>`, check:()=>true, auto:true},
  {title:'1 · Choose the sensitivity', body:`<p>The input level that reads <b>0</b> is set by one shunt resistor. As built, R7 6K49 is linked in by R65 (0R), giving <b>+4 dBu</b>. H1 and R8 are not fitted.</p><p><b>Goal:</b> leave it at +4 dBu, or click the H1 link on the board to see what the “+8” jumper does with R65 still fitted.</p>`, check:()=>D.sens==='s4'||D.sens==='s8', hint:'Choose “+4 dBu” or “+8 dBu — R65 removed” in Sensitivity.'},
  {title:'2 · Line-up tone', body:`<p>Set the stimulus to <b>Tone switched on at 50 ms</b>, 1 kHz, at the line-up level (+4 dBu for the as-built board).</p><p><b>Goal:</b> a steady tone at the sensitivity level.</p>`, check:()=>D.stim==='tone'&&D.level===SENS[D.sens].nom, hint:'Stimulus = tone; Level slider = the sensitivity value.'},
  {title:'3 · Upset the calibration', body:`<p>Turn <b>CAL</b> a few clicks either way. Watch the needle and the C4 lane: CAL changes U1A's gain, so every mark shifts by the same number of dB.</p><p><b>Goal:</b> make the 0 dB tone read off by more than 1 dB.</p>`, check:()=>{ const v=steadyV(SENS[D.sens].nom); return Math.abs(readingDb(v))>1; }, hint:'Click the right half of the CAL trimmer two or three times.'},
  {title:'4 · Calibrate', body:`<p>Press <b>Factory calibrate</b>. It sets CAL and THLD for the −8 mark, then SET 2…SET 6 one at a time so −4, 0, +4, +8 and +12 each read true, and starts SET 7's over-range knee just above +12.</p><p><b>Goal:</b> the line-up tone reads 0 ±0.2 dB.</p>`, check:()=>Math.abs(readingDb(steadyV(SENS[D.sens].nom)))<0.2, hint:'Press Factory calibrate.'},
  {title:'5 · A 10 ms burst', body:`<p>Choose <b>Tone burst</b>, 10 ms, 5 kHz, at the line-up level. This is the IEC 60268-10 integration test: a Type II (BBC/EBU) PPM should read 2 dB low on a 10 ms burst.</p><p>Zoom in on the C4 lane: C4 charges through R51 in about a millisecond, then holds. The needle needs ~0.2 s to get there.</p><p><b>Goal:</b> run a 10 ms burst.</p>`, check:()=>D.stim==='burst'&&D.burstMs===10, hint:'Stimulus = Tone burst, Burst = 10 ms.'},
  {title:'6 · Shorter bursts', body:`<p>Try 1.5 ms and 0.5 ms. The reading drops: C4 only charges near each rectified peak, and the needle then has to swing up while C4 is already bleeding away. The bench on the <b>One second</b> tab finds the burst that reads −2 dB: about 5–7 ms with the PPM and FR29 movements, between the IEC Type I (5 ms) and Type II (10 ms) figures.</p><p><b>Goal:</b> a burst of 1.5 ms or less.</p>`, check:()=>D.stim==='burst'&&D.burstMs<=1.5, hint:'Burst = 1.5 or 0.5 ms.'},
  {title:'7 · The fall', body:`<p>Choose <b>Tone switched off at 50 ms</b> at +12 dB above line-up. C4 now bleeds into U3B's virtual earth through R54 2M2 (τ = 2.2 s). Because the stored voltage is already “in dB”, the fall is fast at the top of the scale and slower near −12.</p><p><b>Goal:</b> release from +12.</p>`, check:()=>D.stim==='release'&&D.level>=SENS[D.sens].nom+12, hint:'Stimulus = Tone switched off; Level = sensitivity + 12.'},
  {title:'8 · Different movements', body:`<p>Switch the movement between full-spec PPM, FR29 and the slow Type 29. The electronics are identical; the overshoot and rise come from the meter.</p><p><b>Goal:</b> pick the full-specification PPM movement.</p>`, check:()=>D.move==='PPM', hint:'Movement = Sifam full-specification PPM.'},
  {title:'Done', body:`<p>You've set up and calibrated the 14-060. The <b>Signal path</b> tab follows the tone stage by stage, and <b>Findings</b> lists what the drawings show that the README missed.</p>`, check:()=>true, auto:true},
];
let lesson=0;
function viewTut(m){
  window.__ppmdrvActive=false;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — setting up a PPM driver', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lsn"></div>${card('What the hardware did', `<div id="tr" class="log"></div>`)}</div>
   <div>${card('Board', `<div id="bd"></div>`)}${card('Meter', `<div id="mt"></div>`)}${card('Controls', controls())}</div></div>`;
  bindControls(m);
  SIM.on('time', ()=>{
    const s0=sim(), n=idx(SIM.t);
    m.querySelector('#bd').innerHTML=boardSVG(SIM.t); bindBoard(m.querySelector('#bd'));
    m.querySelector('#mt').innerHTML=meterSVG(s0.out.th[n],{max:300});
    m.querySelector('#tr').innerHTML=logHTML();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lesson?'font-weight:700;color:var(--accent)':''}">${l.title}${i<lesson?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{ lesson=+li.dataset.i; SIM.refresh(); });
    const L=LESSONS[lesson], ok=L.check();
    m.querySelector('#lsn').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${lesson?'':'disabled'}>◀ Back</button><button id="nx" ${lesson<LESSONS.length-1?'':'disabled'}>Next ▶</button></div>`;
    m.querySelector('#pv').onclick=()=>{ lesson=Math.max(0,lesson-1); SIM.refresh(); };
    m.querySelector('#nx').onclick=()=>{ lesson=Math.min(LESSONS.length-1,lesson+1); SIM.refresh(); };
  });
}

/* ---------------- one second + ballistics bench ---------------- */
function viewSecond(m){
  window.__ppmdrvActive=false;
  m.innerHTML=`${card('One second, broken down', `<div id="ld"></div>`)}
   <div class="grid2">${card('Burst response (5 kHz bursts at line-up level) — IEC 60268-10 integration test', `<canvas id="bc"></canvas><div id="bt"></div>`)}
   ${card('Fall from +12 after the tone stops', `<canvas id="fc"></canvas><div id="ft" class="small"></div>`)}</div>
   <div class="grid2">${card('Needle movements: step response (fitted to the Sifam chart)', `<canvas id="mc"></canvas><p class="small muted">Curves are 2nd-order fits to the “Comparison of FR/PPM responses” chart in the Sifam datasheet (read off by eye) ${inf}; VU from the ANSI C16.5 definition.</p>`)}
   ${card('How the time constants come from the parts', derivationHTML())}</div>`;
  SIM.on('time', ()=>{
    const B=bench(), r=rails(), s0=sim();
    const rows=[ ['Carrier cycles ('+(D.stim==='prog'?'programme':D.freq+' Hz')+')', D.stim==='prog'?'mixed':D.freq.toLocaleString(), D.stim==='prog'?'':SIM.fmtDur(1/D.freq), 'U2 rectifies both halves: '+(D.stim==='prog'?'':(2*D.freq).toLocaleString()+' peaks/s')],
      ['C4 charge time constant', '', SIM.fmtDur(C.R51*D.C4), 'R51 1K × C4 '+(D.C4*1e6)+' µF, only while Q7 conducts (Vs below C4)'],
      ['C4 release time constant', '', (C.R54*D.C4).toFixed(2)+' s', 'R54 2M2 × C4 into U3B virtual earth'],
      ['Needle natural period', '', SIM.fmtDur(2*Math.PI/mv().wn), mv().lab+' (ζ '+mv().zeta+')'],
      ['Model samples', FS.toLocaleString(), SIM.fmtDur(1/FS), 'one solver step: shaper → detector → U3B → movement'],
      ['Peak needle this second', '', dialDb(s0.maxTh).toFixed(2)+' dB', 'at '+SIM.fmtDur(s0.tMax)] ];
    m.querySelector('#ld').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period / value</th><th>where</th></tr>${rows.map(x=>`<tr><td>${x[0]}</td><td class="mono">${x[1]}</td><td class="mono">${x[2]}</td><td class="small">${x[3]}</td></tr>`).join('')}</table>`;
    // bursts
    const {c,w}=SIM.canvas(m.querySelector('#bc'),190); const ink=SIM.css('--ink2'), acc=SIM.css('--accent'), grid=SIM.css('--grid'), warn=SIM.css('--warn');
    const X=ms=> 40+(Math.log10(ms)-Math.log10(0.4))/(Math.log10(400)-Math.log10(0.4))*(w-50), Y=db=> 15+(-db)/20*150;
    c.strokeStyle=grid; c.fillStyle=ink; c.font='10px sans-serif';
    [0,-2,-5,-10,-15,-20].forEach(d=>{ c.beginPath(); c.moveTo(40,Y(d)); c.lineTo(w-10,Y(d)); c.stroke(); c.fillText(d+' dB',2,Y(d)+3); });
    [0.5,1,2,5,10,20,50,100,300].forEach(ms=>{ c.fillText(ms+'',X(ms)-6,180); });
    c.fillStyle=warn; [[5,-2,'Type I'],[10,-2,'Type II']].forEach(([ms,d,l])=>{ c.beginPath(); c.arc(X(ms),Y(d),4,0,7); c.fill(); c.fillText(l,X(ms)+5,Y(d)-5); });
    c.strokeStyle=acc; c.lineWidth=2; c.beginPath(); B.bursts.forEach((b,k)=>{ const xx=X(b.ms), yy=Y(Math.max(-20,b.db)); k?c.lineTo(xx,yy):c.moveTo(xx,yy); }); c.stroke(); c.lineWidth=1;
    m.querySelector('#bt').innerHTML=`<table class="kv small"><tr><th>burst</th>${B.bursts.map(b=>`<td class="mono">${b.ms} ms</td>`).join('')}</tr><tr><th>needle</th>${B.bursts.map(b=>`<td class="mono">${b.db.toFixed(1)}</td>`).join('')}</tr><tr><th>C4 only</th>${B.bursts.map(b=>`<td class="mono">${b.dbC.toFixed(1)}</td>`).join('')}</tr></table>
      <p class="small">Integration time (burst that reads −2 dB): needle <b>${B.integ? B.integ.toFixed(1)+' ms':'&lt; 0.5 ms'}</b>, C4 alone <b>${B.integC? B.integC.toFixed(1)+' ms':'&lt; 0.5 ms'}</b> (the 1 ms R51·C4 only charges near each rectified peak, so a 5 kHz tone charges more slowly than 1 ms). IEC 60268-10 reference (standard, not from the archive): Type I 5 ms, Type II 10 ms. ${mv().zeta<0.8?'Overshoot of the movement can make long bursts read slightly above steady.':''}</p>`;
    // fall
    const f=SIM.canvas(m.querySelector('#fc'),190), fc=f.c, fw=f.w; const FX=t=>40+t/4*(fw-50), FY=d=>10+(14-d)/30*170;
    fc.strokeStyle=grid; fc.fillStyle=ink; fc.font='10px sans-serif'; MARKS.concat([-16]).forEach(d=>{ fc.beginPath(); fc.moveTo(40,FY(d)); fc.lineTo(fw-10,FY(d)); fc.stroke(); fc.fillText((d>0?'+':'')+d,4,FY(d)+3); });
    for (let t=0;t<=4;t+=0.5){ fc.fillText(t+' s',FX(t)-8,186); }
    fc.strokeStyle=SIM.css('--accent2'); fc.beginPath(); B.fall.forEach((p,k)=>{ const yy=FY(Math.max(-16,p[2])); k?fc.lineTo(FX(p[0]),yy):fc.moveTo(FX(p[0]),yy); }); fc.stroke();
    fc.strokeStyle=SIM.css('--play'); fc.lineWidth=2; fc.beginPath(); B.fall.forEach((p,k)=>{ const yy=FY(Math.max(-16,p[1])); k?fc.lineTo(FX(p[0]),yy):fc.moveTo(FX(p[0]),yy); }); fc.stroke(); fc.lineWidth=1;
    fc.strokeStyle=warn; fc.setLineDash([4,4]); fc.beginPath(); fc.moveTo(FX(0.05),FY(12)); fc.lineTo(FX(2.85),FY(-12)); fc.stroke(); fc.setLineDash([]);
    m.querySelector('#ft').innerHTML=`Red: needle; blue: C4 value on the dial. Dashed: BBC/EBU Type II return, 24 dB in 2.8 s (standard reference). This board: <b>+12 → −12 in ${B.t24? B.t24.toFixed(2)+' s':'> 4 s'}</b>; first 20 dB in ${B.t20?B.t20.toFixed(2)+' s':'—'}. The release is an RC exponential of a voltage that is already logarithmic, so it is quick at the top and slow at the bottom.`;
    // movements
    const mm=SIM.canvas(m.querySelector('#mc'),190), mc=mm.c, mw=mm.w; const MX=k=>40+k/250*(mw-50), MY=v=>170-v*140;
    mc.strokeStyle=grid; mc.fillStyle=ink; mc.font='10px sans-serif'; [0,0.5,1].forEach(v=>{ mc.beginPath(); mc.moveTo(40,MY(v)); mc.lineTo(mw-10,MY(v)); mc.stroke(); mc.fillText(v*100+'%',4,MY(v)+3); });
    for (let t=0;t<=0.5;t+=0.1) mc.fillText(t.toFixed(1)+' s', MX(t*500)-8, 186);
    const cols={PPM:SIM.css('--ink'),FR29:SIM.css('--bad'),T29:SIM.css('--accent2'),VU:SIM.css('--accent')}; let lx=50;
    for (const k in B.steps){ mc.strokeStyle=cols[k]; mc.lineWidth=k===D.move?2.5:1.2; mc.beginPath(); B.steps[k].forEach((v,i)=>{ i?mc.lineTo(MX(i),MY(v)):mc.moveTo(MX(i),MY(v)); }); mc.stroke(); mc.fillStyle=cols[k]; mc.fillText(k,lx,14); lx+=50; }
  });
}
function derivationHTML(){
  const r=rails();
  return `<table class="kv small">
   <tr><th>Attack</th><td>U3A forces Q7's emitter onto the shaped signal; while the signal is below C4, Q7 (2N3906) pulls C4 down through <b>R51 1K</b>: τ<sub>a</sub> = 1 kΩ × 1 µF = <b>1.0 ms</b>. D4 stops Q7's base-emitter junction being reverse-broken when U3A swings the other way. Because C4 only charges near each rectified peak, the effective charge on a sine is slower than 1 ms.</td></tr>
   <tr><th>Hold / release</th><td>Q7 then turns off, the emitter node only sees U3A's JFET input, and C4 discharges through <b>R54 2M2</b> into U3B's virtual earth: τ<sub>r</sub> = 2.2 MΩ × 1 µF = <b>2.2 s</b>.</td></tr>
   <tr><th>Read-out</th><td>U3B: gain −R55/R54 = −1, D6 lets only the useful polarity through (D5 clamps the other), R56 3K32 + meter (600 Ω PPM / 465 Ω FR) → 1 mA full scale at ${(Rload()*1e-3).toFixed(2)} V.</td></tr>
   <tr><th>Dead zone</th><td>R52 22K1 / R50 1K lift a node ${(r.Voff*1e3).toFixed(0)} mV above VCC_HALF; R53 2M2 feeds it to U3B, so C4 must exceed ${(r.Voff*1e3).toFixed(0)} mV before the needle leaves its stop.</td></tr>
   <tr><th>Law</th><td>U1B: −R36/R63 = −3.17 to start; each Qn adds 1/R<sub>E</sub> of feedback (${LADDER.map(L=>L.re+' '+(L.Re/1e3)+'k').join(', ')}) until its collector resistor (${LADDER.map(L=>L.rc+' '+(L.Rc/1e3)+'k').join(', ')}) saturates it, so each stage adds a bounded current step. Small-signal gain after each break point: ${(()=>{ let g=1/C.R36, out=[(1/C.R63/g).toFixed(2)]; LADDER.forEach(L=>{ g+=1/L.Re; out.push((1/C.R63/g).toFixed(3)); }); return out.join(' → '); })()}. Unsaturated, the gain ratios at each break are ${(()=>{ let g=1/C.R36, prev=1/C.R63/g, o=[]; LADDER.forEach(L=>{ g+=1/L.Re; const nw=1/C.R63/g; o.push((nw/prev).toFixed(2)); prev=nw; }); return o.join(', '); })()}; a 4 dB-per-mark dial needs about 0.63, and the current limits shape the rest.</td></tr>
   <tr><th>Movement</th><td>Sifam datasheet: “In each case the FSD is 1 mA”, 600 Ω ±5 % (PPM) / 465 Ω ±15 % (Presentor FR). Rise and overshoot from its response chart (see left).</td></tr></table>`;
}

/* ---------------- block diagram ---------------- */
const BLK = {
  in:{x:10,y:30,w:150,h:84,t:'Balanced input',s:['P3: PPM_IN_P/N','C1, C2 22µ · R3, R4 15K','R7 6K49 shunt (R65 link)'],d:'The line arrives on P3 (or P1 pins 7/9, DNI). C1/C2 block DC, R3/R4 15K and the shunt R7 (selected by H1/R65) set the sensitivity. R1/R2 47K5 bias the coupling caps to ground; R5 270K is a fixed shunt.'},
  diff:{x:190,y:30,w:150,h:84,t:'U1A difference amp',s:['LF353, gain (R16+R64)/R13','CAL R64 50K rheostat','C8 22p'],d:'R13/R14 15K in, R16 82K5 + R64 (0–50K) feedback, R15 82K5 to VCC_HALF. Gain 5.5–8.8 (14.8–18.9 dB). CAL trims the whole scale.'},
  rect:{x:370,y:30,w:150,h:84,t:'U2A/U2B full-wave',s:['precision rectifier','R17–R21 10K, D1, D2','output = |x| above VCC_HALF'],d:'C3 22µ couples in. U2A with D1/D2 is a half-wave stage; U2B sums it with the input (R18, R19, R20, R21 all 10K) to give the absolute value. No diode drop reaches the meter.'},
  log:{x:550,y:30,w:170,h:84,t:'U1B log shaper',s:['−R36/R63 + 6 transistor breaks','SET 1 (THLD) … SET 7','D3 clamp'],d:'R22 THLD scales the rectified signal (R29 15K to VCC_HALF), C9/R62 add a little HF lift. U1B inverts with gain −R36/R63; Q1–Q6 (2N3904, bases from SET 2–7 via 47K5) add feedback as the output swings further, turning a linear voltage into a dB-linear one.'},
  det:{x:550,y:170,w:170,h:84,t:'U3A + Q7 peak detector',s:['R49 1K in · D4','Q7 2N3906 → R51 1K → C4 1µ','τ 1 ms charge'],d:'U3A drives Q7 as an emitter follower inside its loop; C4 (tantalum, + to VCC_HALF) charges through R51. Q7 can only pull down, so C4 holds the most negative excursion = the biggest peak.'},
  out:{x:370,y:170,w:150,h:84,t:'U3B read-out',s:['R54 2M2 → virtual earth (τ 2.2 s)','R53 offset · D5, D6','R56 3K32 → PPM_OUT'],d:'Unity-gain inverting read-out of C4 with a precision half-wave output (D6 inside the loop through R55). R53 adds the dead-zone offset from R52/R50.'},
  mtr:{x:190,y:170,w:150,h:84,t:'M1 Sifam PPM',s:['1 mA FSD','600 Ω (PPM) / 465 Ω (FR)','other side to VCC_HALF'],d:'PPM_OUT → R56 → meter → VCC_HALF (via R67/R68 0R; R66/R69 DNI). The board mounts on the meter studs: the PPM_METER footprint M1 sits in the middle of the PCB.'},
  pwr:{x:10,y:170,w:150,h:84,t:'Power',s:['SUPPLY → D7 1N4003','REG1 LM317L DNI, R70 0R','Q8 → VCC_HALF'],d:'P2/P5 bring SUPPLY in and daisy-chain it. D7 protects against reversal. The LM317L footprint is not fitted; R70 bridges it. R60 11K / R61 12K and Q8 make the mid-rail VCC_HALF, decoupled by C7 47µ.'},
};
const BW = [['in','diff','balanced'],['diff','rect','x'],['rect','log','|x|'],['log','det','−log|x|'],['det','out','C4'],['out','mtr','1 mA FS'],['pwr','mtr','VCC_HALF']];
function viewBlock(m){
  window.__ppmdrvActive=false; let sel='log';
  m.innerHTML=`<div class="grid2">${card('Block diagram (click a block)', `<div id="bd"></div>`)}<div>${card('Block', `<div id="bi"></div>`)}${card('In one sentence', `<p>Balanced line → difference amp (CAL) → full-wave rectifier → six-break-point log shaper → peak detector (1 ms in, 2.2 s out) → unity read-out → 1 mA meter.</p>`)}</div></div>`;
  const draw=()=>{ const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 740 280" style="width:100%"><defs><marker id="pa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    BW.forEach(([a,b,l])=>{ const A_=BLK[a],B_=BLK[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_); const cl=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const k=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9, dy?(bx.h/2)/Math.abs(dy):1e9); return [x+dx*k,y+dy*k]; }; [x1,y1]=cl(A_,x1,y1,x2,y2); [x2,y2]=cl(B_,x2,y2,x1,y1);
      const hot=sel===a||sel===b; s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#pa)"/><text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLK){ const b=BLK[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+36+i*15}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    m.querySelector('#bi').innerHTML=`<h3>${BLK[sel].t}</h3><p>${BLK[sel].d}</p>`; };
  draw();
}

/* ---------------- schematics (redrawn) ---------------- */
const RES=(x,y,lab,val,vert)=> vert? `<path d="M${x} ${y} v8 l5 3 -10 5 10 5 -10 5 10 5 -5 3 v8" fill="none" stroke="var(--ink)"/><text x="${x+9}" y="${y+22}" font-size="10" fill="var(--ink)">${lab}</text><text x="${x+9}" y="${y+34}" font-size="10" fill="var(--ink2)">${val}</text>`
  : `<path d="M${x} ${y} h8 l3 -5 5 10 5 -10 5 10 5 -10 3 5 h8" fill="none" stroke="var(--ink)"/><text x="${x+10}" y="${y-9}" font-size="10" fill="var(--ink)">${lab} <tspan fill="var(--ink2)">${val}</tspan></text>`;
const OPA=(x,y,lab)=>`<path d="M${x} ${y-26} L${x} ${y+26} L${x+52} ${y} Z" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+5}" y="${y-10}" font-size="11" fill="var(--ink)">−</text><text x="${x+5}" y="${y+16}" font-size="11" fill="var(--ink)">+</text><text x="${x+14}" y="${y+4}" font-size="9.5" fill="var(--ink)">${lab}</text>`;
const W=(pts)=>`<polyline points="${pts}" fill="none" stroke="var(--ink)"/>`;
const NL=(x,y,t,anc)=>`<text x="${x}" y="${y}" font-size="10" fill="var(--accent2)" text-anchor="${anc||'start'}">${t}</text>`;
const DIO=(x,y,lab,dir)=>{ const d=dir||1; return `<path d="M${x} ${y-6} L${x} ${y+6} L${x+12*d} ${y} Z" fill="var(--ink)"/><line x1="${x+12*d}" y1="${y-6}" x2="${x+12*d}" y2="${y+6}" stroke="var(--ink)" stroke-width="2"/><text x="${x}" y="${y-10}" font-size="10" fill="var(--ink)">${lab}</text>`; };
const SHEETS = [
  {name:'1 · Input, CAL, rectifier', note:'Redrawn from PPM_DRIVER.pdf grid A1–B3. Values as on the sheet; R8 and H1 are DNI on the BOM, R65 (0R) is fitted.', svg:()=>
    NL(18,72,'PPM_IN_N')+W('20,80 88,80')+W('88,72 88,88')+W('94,72 94,88')+`<text x="80" y="104" font-size="10" fill="var(--ink)">C1 22µ</text>`+W('94,80 120,80')+RES(120,80,'R3','15K')+W('162,80 260,80')+RES(260,80,'R13','15K')+W('302,80 380,80 380,84')+
    NL(18,232,'PPM_IN_P')+W('20,240 88,240')+W('88,232 88,248')+W('94,232 94,248')+`<text x="80" y="264" font-size="10" fill="var(--ink)">C2 22µ</text>`+W('94,240 120,240')+RES(120,240,'R4','15K')+W('162,240 230,240')+
    W('210,80 210,110')+RES(210,110,'R7 6K49','via R65 0R = +4 dBu',true)+W('210,154 210,240 230,240 230,170 260,170')+RES(260,170,'R14','15K')+W('302,170 360,170 360,108 380,108')+
    W('340,170 340,190')+RES(340,190,'R15','82K5',true)+NL(330,250,'VCC_HALF')+
    OPA(380,96,'U1A')+W('370,84 370,30 400,30')+W('370,84 380,84')+RES(400,30,'R16 82K5','+ R64 50K CAL')+W('442,30 452,30 452,96 432,96')+NL(462,60,'C8 22p across')+
    NL(30,300,'Other links: R8 3K57 via H1 2–3 ("+8 dBu", DNI) · R5 270K across the pair · R1/R2 47K5 bias C1/C2')+
    W('452,96 470,96')+W('470,88 470,104')+W('476,88 476,104')+`<text x="462" y="120" font-size="10" fill="var(--ink)">C3</text>`+W('476,96 500,96')+RES(510,96,'R18','10K')+W('500,96 510,96')+W('552,96 600,96 600,84 640,84')+
    W('500,96 500,130')+RES(500,130,'R17','10K',true)+W('500,174 500,300 540,300')+W('500,200 520,200')+OPA(520,212,'U2A')+NL(500,236,'+ VCC_HALF','end')+
    W('572,212 590,212')+DIO(590,212,'D2')+W('602,212 620,212')+W('590,212 590,260')+DIO(590,260,'D1',-1)+W('578,260 500,260')+
    W('620,84 620,110')+RES(620,110,'R20','10K',true)+W('620,154 620,300 582,300')+RES(540,300,'R19','10K')+
    OPA(640,96,'U2B')+NL(648,140,'+ VCC_HALF')+W('630,84 630,46 660,46')+RES(660,46,'R21','10K')+W('702,46 710,46 710,96 692,96')+W('710,96 740,96')+NL(744,100,'|x| → THLD')+
    NL(500,350,'U2A + D1/D2 = half-wave; U2B sums it with the input → |x| above VCC_HALF')
  },
  {name:'2 · Log shaper (U1B + Q1–Q6)', note:'Redrawn from grid A3–C4. Each SETn trimmer (20K, VCC_HALF to GND) biases one 2N3904 base through 47K5.', svg:()=>{
    let s=NL(20,74,'|x| from U2B')+RES(80,70,'R22 THLD 5K','')+W('122,70 150,70')+RES(150,70,'R63','15K')+W('192,70 240,70 240,84')+OPA(240,96,'U1B')+W('292,96 340,96')+NL(342,99,'Vs → R49 → U3A')+W('240,108 230,108 230,120')+NL(200,130,'VCC_HALF')+
      W('240,70 240,40 260,40')+RES(260,40,'R36','47K5')+W('302,40 320,40 320,96')+DIO(270,18,'D3',-1)+W('240,40 240,18 258,18')+W('282,18 320,18 320,40')+NL(20,130,'C9 150p + R62 47K5')+NL(20,144,'across R63 (HF lift)');
    LADDER.forEach((L,k)=>{ const y=170+k*48; s+=W(`210,70 210,${y}`)+RES(210,y,L.rc,(L.Rc/1e3)+'k')+`<circle cx="285" cy="${y}" r="13" fill="none" stroke="var(--ink)"/><text x="280" y="${y+4}" font-size="9.5" fill="var(--ink)">${L.q}</text>`+W(`252,${y} 272,${y}`)+W(`298,${y} 310,${y}`)+RES(310,y,L.re,(L.Re/1e3)+'k')+W(`352,${y} 360,${y} 360,96`)+W(`285,${y+13} 285,${y+22} 400,${y+22}`)+RES(400,y+22,L.rb,'47K5')+NL(450,y+25,L.set+' '+L.lab+' (20K VCC_HALF↔GND)'); });
    return s+NL(560,110,'Qn conducts when U1B out < VCC_HALF − (Vbase + Vbe),')+NL(560,126,'adds 1/R_E of feedback until R_C saturates it:')+NL(560,142,'each stage is a bounded current step.');
  }},
  {name:'3 · Peak detector and read-out', note:'Redrawn from grid A5–B6. C4 is a 1 µF 35 V tantalum, + to VCC_HALF.', svg:()=>
    NL(20,99,'Vs')+RES(40,96,'R49','1K')+W('82,96 120,96 120,108')+OPA(120,96,'U3A')+W('172,96 190,96')+DIO(202,96,'D4',-1)+W('202,96 240,96')+`<circle cx="255" cy="96" r="14" fill="none" stroke="var(--ink)"/><text x="245" y="100" font-size="9" fill="var(--ink)">Q7</text><text x="236" y="126" font-size="10" fill="var(--ink2)">2N3906</text>`+
    W('262,84 262,40 110,40 110,84 120,84')+W('262,108 262,130')+NL(256,142,'GND')+W('262,40 300,40 300,160')+RES(300,160,'R51','1K')+W('342,160 380,160')+W('380,160 380,120')+`<line x1="370" y1="120" x2="390" y2="120" stroke="var(--ink)"/><path d="M370 112 Q380 106 390 112" fill="none" stroke="var(--ink)"/><text x="394" y="114" font-size="10" fill="var(--ink)">C4 1µ (+ to VCC_HALF)</text>`+
    W('380,160 400,160')+RES(400,160,'R54','2M2')+W('442,160 480,160 480,172')+OPA(480,184,'U3B')+W('532,184 550,184')+DIO(550,184,'D6')+W('562,184 600,184')+RES(600,184,'R56','3K32')+W('642,184 680,184')+NL(682,188,'PPM_OUT → M1 → VCC_HALF')+
    W('580,184 580,240 470,240 470,172')+NL(500,254,'R55 2M2 feedback')+W('470,172 480,172')+DIO(520,130,'D5 clamp: U3B out ↔ (−)')+NL(400,60,'VCC → R52 22K1 → node ← R50 1K ← VCC_HALF')+NL(400,76,'node → R53 2M2 → U3B (−): dead-zone offset')
  },
  {name:'4 · Power and connectors', note:'Redrawn from grid C3–D5. BOM: REG1, R71, R72, C5, P1, P4 DNI.', svg:()=>
    NL(20,74,'SUPPLY (P2 / P5)')+W('112,70 140,70')+DIO(140,70,'D7 1N4003')+W('152,70 300,70')+`<rect x="180" y="90" width="80" height="44" fill="none" stroke="var(--ink2)" stroke-dasharray="4 3"/><text x="186" y="116" font-size="10" fill="var(--ink2)">REG1 LM317L DNI</text>`+NL(180,150,'R70 0R bridges VI→VO')+
    W('300,70 300,100')+RES(300,100,'R60','11K',true)+W('300,144 300,160')+RES(300,160,'R61','12K',true)+W('300,204 300,220')+NL(290,232,'GND')+W('300,152 340,152')+`<circle cx="352" cy="152" r="12" fill="none" stroke="var(--ink)"/><text x="345" y="156" font-size="9" fill="var(--ink)">Q8</text>`+W('364,160 420,160')+NL(424,164,'VCC_HALF (C7 47µ)')+W('364,144 364,70 300,70')+NL(370,62,'VCC')+
    NL(30,280,'P3: PPM_IN_P, PPM_IN_N, GND · P2/P5: SUPPLY, GND (daisy-chain) · P1 2×5 (DNI): PPM_OUT, SUPPLY, VCC_HALF, PPM_IN_N/P · P4 (DNI): PPM_OUT, VCC_HALF')
  },
];
function viewSchem(m){
  window.__ppmdrvActive=false; let i=0;
  m.innerHTML=card('Schematic set — redrawn from PPM_DRIVER.pdf (not the Altium original)', `<div id="sb" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p>
   <p class="small muted">The original is <span class="mono">#PPM #SERIES/PPM Driver - #RD #RD81/PCB/PPMDR_ISS5/PPM_DRIVER.SchDoc</span> (one tabloid sheet). These sheets regroup it by function; designators and values are copied from it.</p>`);
  const draw=()=>{ m.querySelector('#sb').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#sb button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 470" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="848" height="458" fill="none" stroke="var(--line)"/>${SHEETS[i].svg()}<text x="844" y="456" text-anchor="end" font-size="10" fill="var(--ink2)">14-060 PPM Driver ISS5 · sheet ${i+1}/${SHEETS.length} · redrawn 2026|59</text></svg>`;
    m.querySelector('#sn').textContent=SHEETS[i].note; };
  draw();
}

/* ---------------- signal path (no firmware) ---------------- */
function viewPath(m){
  window.__ppmdrvActive=false;
  m.innerHTML=`<div class="grid2">${card('Signal path at the playhead — stage by stage', `<div id="sp"></div>`)}
    <div>${card('Detector state', `<div id="fsm"></div>`)}${card('Law: dial reading vs applied level (steady 1 kHz)', `<canvas id="lw"></canvas><div id="lwt" class="small"></div>`)}</div></div>`;
  SIM.on('time', ()=>{
    const s0=sim(), n=idx(SIM.t), o=s0.out, r=rails(), at=atten(SENS[D.sens].R);
    const nq=o.nq[n]; let g=1/C.R36; for (let k=0;k<nq;k++) g+=1/LADDER[k].Re;
    const st=[
      ['Input', `${o.vin[n].toFixed(3)} V`, `${D.level>=0?'+':''}${D.level} dBu ${D.stim==='prog'?'programme':D.freq+' Hz'} · env ${STIM[D.stim].lab}`],
      ['Sensitivity network', `× ${at.toFixed(4)} (${(20*Math.log10(at)).toFixed(2)} dB)`, `R3/R4 15K into ${isFinite(SENS[D.sens].R)?(SENS[D.sens].R/1e3).toFixed(2)+'K':'open'} ‖ R5 (fitted 23.5K/36K) ${inf}`],
      ['U1A difference amp', `× ${Gd().toFixed(3)} (${(20*Math.log10(Gd())).toFixed(2)} dB)`, `(R16 82K5 + R64 ${(D.R64/1e3).toFixed(1)}K) / R13 15K; absolute scale ${inf}`],
      ['U2 full-wave rectifier', `${o.x[n].toFixed(3)} V`, '|x| above VCC_HALF (unity)'],
      ['THLD R22 + R63', `× ${D.kt.toFixed(3)} → ${(o.x[n]*D.kt/C.R63*1e6).toFixed(2)} µA`, 'current into U1B summing node'],
      ['U1B log shaper', `${(-o.vs[n]).toFixed(3)} V`, `${nq} of 6 ladder stages on · small-signal gain ${(1/C.R63/g).toFixed(3)}`],
      ['U3A / Q7 detector', o.q[n]?'<b style="color:var(--warn)">CHARGING</b>':'holding', o.q[n]?'Q7 on: C4 → Vs through R51 (τ 1 ms)':'Q7 off: C4 bleeds into R54 (τ 2.2 s)'],
      ['C4', `${(-o.vc[n]).toFixed(3)} V`, `dial value ${readingDb(o.vc[n]).toFixed(2)} dB`],
      ['U3B → R56', `${Math.max(0,Math.min(r.Vmax,o.vc[n]-r.Voff)).toFixed(3)} V`, `minus ${(r.Voff*1e3).toFixed(0)} mV dead zone; swing limit ${r.Vmax.toFixed(2)} V`],
      ['Meter current', `${(Math.max(0,Math.min(r.Vmax,o.vc[n]-r.Voff))/Rload()*1e3).toFixed(3)} mA`, `R56 3K32 + ${mv().Rm} Ω; 1 mA = full scale`],
      ['Needle', `${(o.th[n]*100).toFixed(1)} % → ${dialDb(o.th[n]).toFixed(2)} dB`, `ζ ${mv().zeta}, ωn ${mv().wn.toFixed(1)} rad/s`],
    ];
    m.querySelector('#sp').innerHTML=`<svg viewBox="0 0 520 ${st.length*40+10}" style="width:100%">${st.map((x,k)=>{ const hot=(k===6&&o.q[n])||(k===5&&nq>0); return `<rect x="6" y="${6+k*40}" width="508" height="32" rx="6" fill="${hot?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="14" y="${20+k*40}" font-size="11.5" font-weight="700" fill="${hot?'#fff':'var(--ink)'}">${x[0]}</text><text x="190" y="${20+k*40}" font-size="11.5" font-family="var(--mono)" fill="${hot?'#fff':'var(--ink)'}">${x[1].replace(/<[^>]+>/g,'')}</text><text x="14" y="${33+k*40}" font-size="9.5" fill="${hot?'#fff':'var(--ink2)'}">${x[2].replace(/<[^>]+>/g,'')}</text>`; }).join('')}</svg>`;
    const ch=o.q[n];
    m.querySelector('#fsm').innerHTML=`<svg viewBox="0 0 440 130" style="width:100%"><g><circle cx="90" cy="65" r="44" fill="${ch?'var(--warn)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="90" y="62" text-anchor="middle" font-size="12" font-weight="700" fill="${ch?'#fff':'var(--ink)'}">CHARGE</text><text x="90" y="78" text-anchor="middle" font-size="10" fill="${ch?'#fff':'var(--ink2)'}">Q7 on, τ 1 ms</text></g>
      <g><circle cx="340" cy="65" r="44" fill="${!ch?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="340" y="62" text-anchor="middle" font-size="12" font-weight="700" fill="${!ch?'#fff':'var(--ink)'}">HOLD</text><text x="340" y="78" text-anchor="middle" font-size="10" fill="${!ch?'#fff':'var(--ink2)'}">R54 bleed, τ 2.2 s</text></g>
      <path d="M134 50 Q215 15 296 50" fill="none" stroke="var(--ink2)"/><text x="215" y="22" text-anchor="middle" font-size="10" fill="var(--ink2)">|Vs| falls below C4</text><path d="M296 82 Q215 118 134 82" fill="none" stroke="var(--ink2)"/><text x="215" y="122" text-anchor="middle" font-size="10" fill="var(--ink2)">|Vs| rises above C4</text></svg>`;
    // law
    const {c,w}=SIM.canvas(m.querySelector('#lw'),200); const S=SENS[D.sens].nom; const X=v=>40+(v+16)/32*(w-50), Y=v=>10+(16-v)/32*170;
    c.strokeStyle=SIM.css('--grid'); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; MARKS.forEach(mk=>{ c.beginPath(); c.moveTo(X(mk),10); c.lineTo(X(mk),180); c.moveTo(40,Y(mk)); c.lineTo(w-10,Y(mk)); c.stroke(); c.fillText((mk>0?'+':'')+mk,X(mk)-6,194); c.fillText((mk>0?'+':'')+mk,10,Y(mk)+3); });
    c.strokeStyle=SIM.css('--ink2'); c.setLineDash([3,3]); c.beginPath(); c.moveTo(X(-16),Y(-16)); c.lineTo(X(16),Y(16)); c.stroke(); c.setLineDash([]);
    c.strokeStyle=SIM.css('--accent'); c.lineWidth=2; c.beginPath(); let worst=0; const errs=[];
    for (let a=-16;a<=16.01;a+=0.25){ const rd=readingDb(steadyV(S+a)); if (a>=-12&&a<=12) worst=Math.max(worst,Math.abs(rd-a)); a===-16?c.moveTo(X(a),Y(rd)):c.lineTo(X(a),Y(rd)); } c.stroke(); c.lineWidth=1;
    MARKS.forEach(mk=>errs.push(((readingDb(steadyV(S+mk))-mk)>=0?'+':'')+(readingDb(steadyV(S+mk))-mk).toFixed(2)));
    m.querySelector('#lwt').innerHTML=`Error at the marks −12…+12: <span class="mono">${errs.join(' ')}</span> dB · worst between marks ${worst.toFixed(2)} dB. Horizontal: applied level re line-up; vertical: steady dial reading. Below −12 the reading falls into the dead zone; above +12 SET 7 (Q6) compresses.`;
  });
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__ppmdrvActive=false;
  const r=rails();
  m.innerHTML=card('What the 14-060 is up to — findings from the drawings', `<ol>
   <li><b>It is one channel, and the “repeated stages” are a log converter.</b> The README guesses the repeated Q/D stages might be one per channel. They are not: Q1–Q6 with R37–R48 and SET 2–SET 7 (R23–R28) form a six-break-point ladder in U1B's feedback. The emitter resistors (62K, 47K5, 30K1, 10K, 10K, 4K75) cut the gain by ≈0.57–0.66× at each break, close to the 0.63× that a 4 dB-per-mark dial needs. Seven trimmers (THLD/SET 1 … SET 7) match the seven marks −12…+12 on the MP2 (PPM) dial. <span class="mono">PPM_DRIVER.SchDoc</span>.</li>
   <li><b>Time constants straight from the parts.</b> Charge R51 1K × C4 1 µF = 1 ms; release R54 2M2 × C4 = 2.2 s. The release acts on a voltage that is already in dB, so the fall is not a constant dB/s: in the model +12 → −12 takes ${bench().t24?bench().t24.toFixed(1):'>4'} s (BBC/EBU Type II asks 2.8 s for 24 dB) and the first 20 dB ${bench().t20?bench().t20.toFixed(1):'—'} s (DIN Type I asks 1.5 s), with most of the time spent near the bottom of the scale. The burst that reads −2 dB is ${bench().integ?bench().integ.toFixed(1):'—'} ms with the ${D.move} movement: between Type I (5 ms) and Type II (10 ms) (One second tab).</li>
   <li><b>The “+8 dB” option needs a part removed.</b> R65 (0R) permanently joins H1 pins 1–2, so R7 6K49 is always across the input. Fitting the “+8dB (600 OHM)” jumper (H1 2–3) and R8 3K57 puts R8 <i>in parallel</i> with R7: 2K30, about +11 dB, not +8. The BOM fits R65 and leaves H1 and R8 DNI, so as built the board is +4 dBu only. Select “+8 jumper… R65 left in” on the Simulator tab.</li>
   <li><b>The sensitivity table is self-consistent.</b> All six R7 values in the schematic note (open … 1K58, for 600 Ω and 150 Ω references) fit one source/load model (23.5 kΩ effective series, 36 kΩ load) to within 0.1 dB, and “+14 dB (150 Ω)” and “+8 dB (600 Ω)” both use 3K57 because they are the same voltage.</li>
   <li><b>The regulator is not fitted.</b> REG1 (LM317L), R71, R72 and C5 are DNI; R70 0R bridges input to output. VCC is SUPPLY minus D7 (1N4003). VCC_HALF comes from R60 11K / R61 12K through Q8, so it is VCC·0.522 − 0.65 V (${r.VH.toFixed(2)} V at the ${D.supply} V supply assumed here) rather than exactly half.</li>
   <li><b>A deliberate dead zone.</b> R52 22K1 / R50 1K raise a node ${(r.Voff*1e3).toFixed(0)} mV above VCC_HALF and R53 2M2 feeds it into U3B, so small residues on C4 never lift the needle off its stop.</li>
   <li><b>Each ladder stage is a current step, not a resistor</b> ${inf}. A stage's collector resistor (R37 220K … R42 22K1) lets its transistor add only about (V<sub>base</sub>+0.4 V)/R<sub>C</sub> before it saturates; after that the extra emitter current comes from the SET wiper through the 47K5 base resistor, not from U1B's summing node. So each SET trimmer sets both where its step starts and how tall it is (calibrated: ${LADDER.map((L,n)=>(Math.max(0,D.T[n]-C.Vbe+0.4)/L.Rc*1e6).toFixed(0)).join(', ')} µA), and the steps grow roughly ×1.6 per mark, which is what a dB-linear dial needs. That is why the collector resistors fall from 220K to 22K1.</li>
   <li><b>Transistors: drawing, BOM and test report disagree.</b> The schematic and BOM call for 2N3904/2N3906; the parts list inside the SchDoc also names MMBT4403; the 27 Aug 2015 test report says 2N4401/2N4403 SMT parts were tried and raise the 20 kHz response by about 1 dB (C9 150p / R62 47K5 already lift the top end).</li>
   <li><b>BOM typos.</b> Sheet “14-060” lists C10–C12 as “100n - 5V” with part C50C-105 (a 1 µF code); BOM_MAIN lists C100C-104K (100 nF 50 V). The 22 µF parts are described as “CAP ELEC 25UF”. 47K5 parts carry a “-5%” part number but a “1%” description.</li>
   <li><b>C4 is a tantalum.</b> A 1 µF 35 V tantalum may leak a few hundred nA (typical maximum 0.01·C·V ≈ 0.35 µA), comparable to the ≈1 µA R54 draws at 2 V, so a leaky part would shorten the hold ${inf}.</li>
   <li><b>The board mounts on the meter.</b> The PPM_METER footprint M1 sits in the middle of the board between four mounting holes, and R66–R69 (two DNI) choose which M1 pad goes to VCC_HALF / PPM_OUT ${inf}.</li>
   <li><b>Fifteen copies.</b> PCB/backup1 … backup14-final each hold a full PPMDR_ISS5 project; backup14-final and the 14-060 copy under #MP (8100) #SERIES/PCB/ are identical to the released files (same SHA-256 for the SchDoc).</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
   <li>Supply ${D.supply} V ${inf}: not stated for the board. A rectified 12 VAC rail like the MP4-1 power board's would give about this.</li>
   <li>The front end's absolute gain is scaled so that the as-built board calibrates with CAL and THLD at mid-travel ${inf}; the relative effect of every resistor is from the drawing.</li>
   <li>Dial positions: −12 at 12 % and +12 at 92 % of the arc, evenly spaced, as on the MP2 (PPM) photo ${inf}.</li>
   <li>Needle dynamics are 2nd-order fits to the Sifam response chart ${inf}. Op-amps ideal except a ±1.5 V swing limit; diodes ideal in the precision loops.</li>
   <li>IEC 60268-10 and ANSI C16.5 figures (5 ms / 10 ms integration, 24 dB in 2.8 s, 300 ms VU) are the standards' values, quoted for comparison, not archive data.</li></ul>`)
   + card('Sources', `<ul class="small mono"><li>#PPM #SERIES/PPM Driver - #RD #RD81/PCB/PPMDR_ISS5/PPM_DRIVER.pdf, .SchDoc, .xls, PPM_DRIVER_ASSEMBLY.pdf, Pick Place for PPM_DRIVER.csv</li><li>…/PPM Driver #Datasheet/Sifam PPM Meter - Presentor_FR_Meters_web #Datasheet.pdf</li><li>#PPM #SERIES/PPM Driver - #TESTREPORT/14-060 - PPM DRIVER-14-060-27AUG15.pdf</li><li>#MP (8100) #SERIES/8100 CHASSIS - #ARTWORK #DA #2016/Pics/MP2(PPM) Front.jpg</li></ul>`);
}

initK();
SIM.register({
  id:'ppm-driver', name:'PPM Driver 14-060 · discrete PPM meter driver (2015|48)', duration:1,
  product:'PPM Driver 14-060 (RD81)', year:2015, family:'Monitors, meters & tools', folder:'#PPM #SERIES',
  summary:'Analog board that turns a balanced line into Sifam PPM ballistics: difference amp, precision full-wave rectifier, a six-transistor dB-linear shaper and a 1 ms / 2.2 s peak detector driving a 1 mA movement. Issue 5 (RD81) is the 2015|48 surface-mount redesign.',
  highlights:['Real board artwork with clickable CAL / THLD / SET trimmers','Attack and release derived from R51, R54 and C4','IEC burst and fall tests on a simulated bench','Log law from the ladder resistor values','Four needle movements fitted to the Sifam chart'],
  depth:'Hardware model',
  stepUnits:[ {label:'1 ms', period:()=>0.001}, {label:'10 ms', period:()=>0.01}, {label:'1 carrier cycle', period:()=>1/D.freq}, {label:'1 model sample', period:()=>1/FS} ],
  zooms:[[1,'1 s (whole)'],[0.3,'300 ms (needle swing)'],[0.05,'50 ms'],[0.012,'12 ms (a 10 ms burst)'],[0.002,'2 ms (C4 charging)'],[0.0004,'400 µs (5 kHz cycles)']],
  defaultZoom:0,
  tabs:[ {id:'sim',label:'Simulator',render:viewSim}, {id:'tutorial',label:'Tutorial: setting up',render:viewTut}, {id:'second',label:'One second & ballistics',render:viewSecond},
    {id:'block',label:'Block diagram',render:viewBlock}, {id:'schematic',label:'Schematics',render:viewSchem}, {id:'software',label:'Signal path',render:viewPath}, {id:'findings',label:'Findings',render:viewNotes} ],
});
})();
