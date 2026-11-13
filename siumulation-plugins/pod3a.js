/* =====================================================================
   POD3A — Analog stereo loudness meter (Ward-Beck Systems, 2004|37)
   Plugin for the WBS Device Simulator (../siumulation.html)

   What POD3A is: the 2004 redesign of the 2002 POD3 analog LED meter. The
   POD3A is a DSP meter: balanced analog L/R in → ADC → ADSP-21065L SHARC
   ("SLM-1 Analog") → three MM5450 LED drivers, multiplexed between two
   57-segment bars (−52 … +20), plus a 9-LED phase column. The SHARC project
   filed in the POD3A folder IS POD3A's own firmware (see the Findings tab).

   Sources used (all in this archive, #POD #SERIES/POD3A - #Master/):
   - POD3A - #Engineering/sharc/working v101/slm-1-main.asm  (sport0_isr, mux_ctl,
       translate_meter_results, shift_led_data, test_peaks_*, ppm_hold_l/r,
       update_meter_parameters, read_dipswitch, the *_52 constants)
   - .../sharc/working v101/vumeter.asm (VUMeterCalc/Get, TCONST_*), phasemeter.asm
     (PhaseMeterCalc/Get), slm-1_INIT.ASM (flags, TIMER0 MCLK, SPORT0 I²S),
     slm-1_ISR_table.ASM, slm1_vu_data1-3.dat, slm1_pk_data1-3.dat, sdm_phase_data.dat
   - .../sharc/v100/ANALOG1 (Intel-HEX EPROM image, 23 Mar 2004) and v100 sources
   - .../MANUAL/pod3.pdf (2002 POD3 manual), POD3AMANUAL.cdr (2006), POD3A - Functional Diagram.cdr (2004)
   - .../PCB/pod3iss3.bom/.net (the 2003 analog POD3 predecessor)
   - POD3A - #ARTWORK #DA #2016/POD3A-FRONT&REAR-SILK (CURVE).pdf, Pics/POD3A Front.jpg, Rear.jpg
   - POD3A - #Mechanical #DA #2016/POD3A-FRONT ISS 1 (PANEL) .pdf, POD3A-REAR ISS 1 (PANEL).pdf
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const Y = y => SIM.year(y);
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';

/* ---------------- constants from the source ---------------- */
const FS = 52000;                 // the firmware's "_52" constants assume 52 kHz (inferred: crystal not archived)
const C = {
  TVU: 0.0003541811,              // TCONST_VU (vumeter.asm)  = VU_48 × 48/52
  TPA: 0.02103034,                // TCONST_PPM_ATTACK        = PPM_ATTACK_48 × 48/52
  DEC_SLOW: 0.0000354238,         // peak_decay_1_52 "type2 (3 seconds)"
  DEC_FAST: 0.0000708463,         // peak_decay_2_52 "type1 (1 second)"
  PK_THRESH: 0.707,               // pk_thresh in test_peaks_left_1
  PK_HOLD: 200000,                // pk_hold (over LED)  — samples
  PPM_HOLD: 200000,               // ppm_hold            — samples
  MUX: 300,                       // mux_counter / mux_rate
  SHIFT: 72,                      // 36 MM5450 clocks, one clock edge per ISR
  FLUSH: 107,                     // translate_meter_results flush loop ("modified june 17, 2005")
  ALPHA: 0.999,                   // PHMETER_ALPHA
  THRES: 1e-4,                    // SIGNAL_THRES
  REF_DBU: 24,                    // 0 dBFS = +24 dBu (inferred from "meter_cal=-6 //-6=-20dBFS" at +4 dBu)
  BOOT: 0.010,                    // EPROM boot + Init_dsp ≈ 10 ms (inferred)
  MISMATCH: 1.01,                 // R input gain vs L: 1 % resistor tolerance (inferred)
  NOISE: 1e-5,                    // analog noise floor ≈ −100 dBFS (inferred)
  CCLK: FS*1024,                  // SPORT0 RDIV0 0x001f000f → fs = CCLK/1024; TIMER0 TPERIOD0=4 → MCLK = CCLK/4 = 256·fs
};
const N = FS;                     // samples simulated (1 s)
/* the 57 scale points printed between the bars */
const LBL = Array.from({length:57}, (_,i)=> i<17 ? -52+2*i : i-36);
const SEGX = [506.5,520.5,535.5,550.5,565.5,580.5,595.5,610.5,625.5,641,655.5,671,685.5,700.5,715.5,730.5,745.5,761,775.5,790.5,805.5,820.5,835.5,850.5,865.5,880.5,895.5,911,925.5,940.5,956,970.5,985.5,1001,1015.5,1030.5,1045.5,1060.5,1075.5,1090.5,1105.5,1120.5,1136,1150.5,1166,1180.5,1195.5,1210.5,1225.5,1240.5,1255.5,1271.5,1285.5,1300.5,1315.5,1330.5,1345.5];
const segCol = s => s>=9 ? '#ff3f86' : s>=-6 ? '#ffd23a' : '#c3d81a';     // from Pics/POD3A Front.jpg
const CAL_DBU = {'-14':0, '-6':4, '2':8, '10':12};

/* ---------------- device state ---------------- */
const D = {
  power: true,
  boot0: false,                  // true = the second starts at power-on (no pre-roll)
  conn: [true, true],            // Phoenix L / R plugged
  dip: { bs1:true, bs0:true, cal1:false, cal0:true },   // true = ON. Factory-style: +4 dBu, hold off, slow decay
  src: 'tone', mode: 'mono', level: 4, freq: 1000,
  view: 'eye',                   // 'eye' (persistence of vision) | 'inst' (what the LEDs do this instant)
  log: [], lastTrace: [],
};
/* DIP switches are read as ASTAT FLAG0..3 (bits 19-22). ON = contact closed = flag 0 (inferred pull-ups;
   it is the only polarity that makes both rear legends agree with the code). */
function flags(){ const d=D.dip; return { f0:d.bs1?0:1, f1:d.bs0?0:1, f2:d.cal1?0:1, f3:d.cal0?0:1 }; }
function meterCal(){ const f=flags(); const v=f.f2 + 2*f.f3; return 8*v - 14; }   // read_dipswitch
function calDbu(){ return CAL_DBU[String(meterCal())]; }
function holdOn(){ return flags().f0===1; }                 // BS1 OFF → ppm_hold_l/r run
function decayK(){ return flags().f1===0 ? C.DEC_SLOW : C.DEC_FAST; }   // update_meter_parameters
const SRCS = { tone:'Steady tone', burst:'Tone burst 100–400 ms', program:'Program (noise, syllabic envelope)', silence:'Silence' };
const MODES = { mono:'Mono (L = R)', lonly:'Left only', ronly:'Right only', anti:'Anti-phase (R = −L)', quad:'90° / partly correlated', wide:'Wide stereo (uncorrelated)' };

/* ---------------- signal generator (the test set plugged into the rear) ---------------- */
function hash(n){ n = (n ^ 61) ^ (n >>> 16); n = (n + (n << 3)) | 0; n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296 * 2 - 1; }
function makeGen(){
  const A = Math.pow(10, (D.level - C.REF_DBU)/20);                 // sine dBu → peak re full scale
  const lp = [0,0];
  const env = t => { const sy = Math.max(0, Math.sin(2*Math.PI*3.1*t)); const ph = ((t%0.5)+0.5)%0.5; return 0.35 + 0.65*Math.pow(sy,1.5) + (ph<0.08 ? 1.4*Math.exp(-ph/0.02) : 0); };
  const noise = (m, ch) => { const w = hash(m*2 + ch + 7919); lp[ch] += 0.12*(w - lp[ch]); return 1.6*lp[ch] + 0.25*w; };
  return m => {
    const t = m/FS; let l = 0, r = 0;
    if (D.src==='tone' || (D.src==='burst' && t>=0.1 && t<0.4)){
      const w = 2*Math.PI*D.freq*t; l = A*Math.sin(w);
      r = D.mode==='anti' ? -l : D.mode==='quad' ? A*Math.sin(w+Math.PI/2) : D.mode==='wide' ? A*Math.sin(2*Math.PI*D.freq*1.5*t) : l;
    } else if (D.src==='program'){
      const e = env(t), n0 = noise(m,0), n1 = noise(m,1);
      l = A*0.5*e*n0;
      r = D.mode==='anti' ? -l : D.mode==='quad' ? A*0.5*e*(0.6*n0+0.8*n1) : D.mode==='wide' ? A*0.5*e*n1 : l;
    }
    if (D.mode==='lonly') r = 0; if (D.mode==='ronly') { r = l; l = 0; }
    r *= C.MISMATCH;
    if (!D.conn[0]) l = 0; if (!D.conn[1]) r = 0;
    l += C.NOISE*hash(m*3+11); r += C.NOISE*hash(m*3+12);
    return [Math.max(-1,Math.min(1,l)), Math.max(-1,Math.min(1,r))];
  };
}

/* ---------------- the firmware, sample by sample ---------------- */
const rawR = p => p>0 ? Math.min(255, Math.round(-20*Math.log10(p))) : 255;   // VUMeterGet: −2·10·log10(val)
const clampR = r => Math.max(0, Math.min(255, r));
let S = null, SK = '';
function sim(){
  const key = JSON.stringify([D.power,D.boot0,D.conn,D.dip,D.src,D.mode,D.level,D.freq]);
  if (key === SK) return S; SK = key;
  const pre = D.boot0 ? 0 : FS;                        // 1 s pre-roll so the meters are settled at t = 0
  const R = { xL:new Float32Array(N), xR:new Float32Array(N), vu:[new Float32Array(N),new Float32Array(N)], pp:[new Float32Array(N),new Float32Array(N)],
    hold:[new Uint8Array(N).fill(255),new Uint8Array(N).fill(255)], hc:[new Int32Array(N),new Int32Array(N)], ov:[new Uint8Array(N),new Uint8Array(N)], oc:[new Int32Array(N),new Int32Array(N)],
    ph:new Uint16Array(N).fill(128), y:new Float32Array(N), frames:[], bootN: D.boot0 ? Math.round(C.BOOT*FS) : -Infinity, cal: meterCal(), resets:0 };
  const g = makeGen();
  const cal = R.cal, hOn = holdOn(), TPD = decayK();
  let vu=[0,0], pp=[0,0], sA=0, dA=0, mux=C.MUX, bit31=0;
  let hold=[255,255], hcnt=[0,0], over=[0,0], ocnt=[1,1];
  for (let m=-pre; m<N; m++){
    const [xl, xr] = g(m); const x=[xl,xr];
    if (m>=0){ R.xL[m]=xl; R.xR[m]=xr; }
    if (!D.power || m < R.bootN) continue;
    // _VUMeterCalc (per channel): VU = VU + (in²−VU)·Tvu ; PPM = max(PPM+(in²−PPM)·TppmA, PPM+(in²−PPM)·TppmD)
    for (let ch=0; ch<2; ch++){ const p=x[ch]*x[ch]; vu[ch] += (p-vu[ch])*C.TVU; const a=pp[ch]+(p-pp[ch])*C.TPA, d=pp[ch]+(p-pp[ch])*TPD; pp[ch]=a>d?a:d; }
    // _PhaseMeterCalc: sumAVE/diffAVE single-pole averages
    sA = C.ALPHA*sA + (1-C.ALPHA)*Math.abs(xl+xr); dA = C.ALPHA*dA + (1-C.ALPHA)*Math.abs(xl-xr);
    // main loop results (VUMeterGet / PhaseMeterGet) — taken as current (the background loop runs ~2× per sample, inferred)
    const rv=[clampR(rawR(vu[0])+cal), clampR(rawR(vu[1])+cal)], rp=[clampR(rawR(pp[0])+cal), clampR(rawR(pp[1])+cal)];
    let yy = 0; if (sA+dA >= C.THRES) yy = (sA-dA)/(sA+dA); yy = Math.max(-1,Math.min(1,yy)); const phN = Math.trunc(128*yy+128);
    // mux_counter → mux_ctl → translate_meter_results
    if (--mux === 0){ bit31 ^= 1; R.frames.push({ n:m, side: bit31?0:1, latch:m+C.SHIFT, vu:rv.slice(), pk:rp.slice(), hold:hold.slice(), over:over.slice(), ph:phN }); mux = C.MUX; }
    // ppm hold counters and peak (over) counters
    for (let ch=0; ch<2; ch++){ if (hcnt[ch]) hcnt[ch]--; if (ocnt[ch]) ocnt[ch]--; if (ocnt[ch]===0) over[ch]=0; }
    // test_peaks_left_1 / right_1
    for (let ch=0; ch<2; ch++) if (Math.abs(x[ch]) > C.PK_THRESH){ over[ch]=1; ocnt[ch]=C.PK_HOLD; }
    // BS1: ppm_hold_l / ppm_hold_r — then "if ne jump bs1_is_off1" tests the flags ppm_hold_r left behind
    if (hOn){
      const step = ch => { const pk=rp[ch]; if (pk <= hold[ch]){ const eq = pk===hold[ch]; hcnt[ch]=C.PPM_HOLD; hold[ch]=pk; return eq; } if (hcnt[ch]!==0) return false; hold[ch]=255; return true; };
      step(0); if (step(1)){ hold[0]=255; hold[1]=255; if (m>=0) R.resets++; }
    } else { hold[0]=255; hold[1]=255; }
    if (m>=0){ for (let ch=0; ch<2; ch++){ R.vu[ch][m]=vu[ch]; R.pp[ch][m]=pp[ch]; R.hold[ch][m]=hold[ch]; R.hc[ch][m]=hcnt[ch]; R.ov[ch][m]=over[ch]; R.oc[ch][m]=ocnt[ch]; } R.ph[m]=phN; R.y[m]=yy; }
  }
  S = R; return S;
}
const idx = t => Math.max(0, Math.min(N-1, Math.floor(t*FS)));
function frameAt(t){                                   // index of the last latched frame
  const F = sim().frames, n = Math.floor(t*FS); let lo=0, hi=F.length-1, k=-1;
  while (lo<=hi){ const md=(lo+hi)>>1; if (F[md].latch<=n){ k=md; lo=md+1; } else hi=md-1; }
  return k;
}
function lastMux(t){ const F = sim().frames, n=Math.floor(t*FS); let lo=0, hi=F.length-1, k=-1; while(lo<=hi){ const md=(lo+hi)>>1; if (F[md].n<=n){k=md;lo=md+1;} else hi=md-1; } return k; }

/* ---------------- lookup tables → MM5450 bit streams ----------------
   Formulas reproduce slm1_vu_data1-3.dat / slm1_pk_data1-3.dat / sdm_phase_data.dat exactly
   (r = table index − 6). DATA1 bit k (1-26) → scale k−6; DATA2 bit k (4-34) → panel segment k−4. */
function phaseBits(n){ if (n>=255) return []; if (n>=218) return [1]; if (n>=182) return [1,2]; if (n>=146) return [1,2,3]; if (n>=106) return [1,2,3,4,5]; if (n>=70) return [1,2,3,4,5,6]; if (n>=34) return [1,2,3,4,5,6,7]; return [1,2,3,4,5,6,7,8,9]; }
function words(f, ch){
  const d1=new Uint8Array(36), d2=new Uint8Array(36), d3=new Uint8Array(36), why1=new Array(36).fill(''), why2=new Array(36).fill('');
  d1[0]=d2[0]=d3[0]=1;
  const rv=f.vu[ch], rp=f.pk[ch], rh=f.hold[ch];
  for (let k=1;k<=26;k++) if (rv <= 53-2*k){ d1[k]=1; why1[k]='vu'; }
  for (let k=1;k<=35;k++){ const T = k>=21 ? 121-2*k : 163-4*k; if (rv<=T){ d2[k]=1; why2[k]='vu'; } }
  for (let k=1;k<=26;k++) if (rp>=45-2*k && rp<=46-2*k){ d1[k]=1; why1[k]=why1[k]||'pk'; }
  for (let k=17;k<=34;k++) if (rp>=113-2*k && rp<=114-2*k){ d2[k]=1; why2[k]=why2[k]||'pk'; }
  for (let k=2;k<=16;k++) if (rp>=145-4*k && rp<=148-4*k){ d2[k]=1; why2[k]=why2[k]||'pk'; }
  for (let k=2;k<=26;k++) if (rh>=45-2*k && rh<=46-2*k){ d1[k]=1; why1[k]=why1[k]||'hold'; }   // "-1 mask" clears bit 1
  if (f.over[ch]){ d1[17]=1; why1[17]=why1[17]||'over'; }
  phaseBits(f.ph).forEach(b=>d3[b]=1); d3[ch===0?17:16]=1;
  return {d1,d2,d3,why1,why2};
}
function segsOf(w){ const s=new Array(57); for (let i=0;i<57;i++) s[i] = i>=31 ? (w.d1[i-30]? (w.why1[i-30]||'vu') : '') : (w.d2[i+4]? (w.why2[i+4]||'vu') : ''); return s; }
function vuTop(r){ let top=null; for (let i=0;i<57;i++){ const T = i>=31 ? 53-2*(i-30) : (i+4>=21 ? 121-2*(i+4) : 163-4*(i+4)); if (r<=T) top=i; } return top; }
const scaleVU = (p,cal) => (41-cal)/2 + 10*Math.log10(Math.max(p,1e-14));
const scalePK = (p,cal) => (35-cal)/2 + 10*Math.log10(Math.max(p,1e-14));

/* what both bars show at time t */
function display(t){
  const s = sim(); const out = { on:D.power, side:null, bars:[null,null], pr:[0,0], phase:0, booting:false };
  if (!D.power) return out;
  if (Math.floor(t*FS) < s.bootN){ out.booting=true; return out; }
  const k = frameAt(t); if (k<0) return out;
  const F = s.frames[k]; out.side = F.side;
  const show = (f)=>{ const w=words(f,f.side); out.bars[f.side] = {segs:segsOf(w), w, f}; out.phase = phaseBits(f.ph).length; out.pr[f.side]=1; };
  if (D.view==='eye' && k>0) show(s.frames[k-1]);
  show(F);
  if (D.view==='eye') out.pr=[1,1];
  return out;
}

/* ---------------- user actions (what the switches do in code) ---------------- */
function act(name, fn){
  D.lastTrace = [];
  const tr = s => D.lastTrace.push(s);
  fn(tr);
  D.log.unshift({ t:SIM.t, name, trace:D.lastTrace.slice(), state:stateLine() });
  if (D.log.length>60) D.log.length=60;
  SIM.refresh();
}
function stateLine(){ return `CAL ${calDbu()>0?'+':''}${calDbu()} dBu · hold ${holdOn()?'ON':'OFF'} · decay ${decayK()===C.DEC_SLOW?'SLOW':'FAST'} · ${SRCS[D.src].split(' (')[0]} ${D.src==='silence'?'':(D.level>0?'+':'')+D.level+' dBu'}`; }
const DIPS = [['bs1','BS1','FLAG0','19'],['bs0','BS0','FLAG1','20'],['cal1','CAL1','FLAG2','21'],['cal0','CAL0','FLAG3','22']];
const A = {
  dip(i){ const [k,lbl,fl,bit] = DIPS[i]; D.dip[k] = !D.dip[k]; const on = D.dip[k];
    act(`Rear DIP ${lbl} → ${on?'ON':'OFF'}`, tr=>{
      tr(`${lbl} contact ${on?'closes':'opens'} → ${fl} pin reads ${on?0:1} (ON = closed = 0, ${inf} pull-up)`);
      tr(`next sport0_isr: dm(astat_save)=astat — ${fl} appears in ASTAT bit ${bit}`);
      if (k==='cal1'||k==='cal0'){ const f=flags(); tr(`read_dipswitch: r1 = astat & cal_mask (bits 21-22) → lshift −21 = ${f.f2+2*f.f3}`);
        tr(`meter_cal = 8·${f.f2+2*f.f3} − 14 = ${meterCal()} half-dB steps → 0 VU now = ${calDbu()>0?'+':''}${calDbu()} dBu (rear legend)`);
        tr(`main: r0 = VUMeterGet(...) + r3 (meter_cal) for VU and PPM; table index = r + 6`); }
      if (k==='bs0'){ tr(`update_meter_parameters: r0 = astat & BS0 mask (bit 20) → ${flags().f1?'ne':'eq'}`);
        tr(`dm(vumeter_wspace+VUMETER_WS_PPM_DECAY) = ${flags().f1? 'peak_decay_2_52 = 0.0000708463 (FAST, 24 dB in 1.5 s)':'peak_decay_1_52 = 0.0000354238 (SLOW, 24 dB in 3 s)'}`); }
      if (k==='bs1'){ tr(`sport0_isr: r0 = astat_save & BS1 mask (bit 19) → ${flags().f0?'ne: call ppm_hold_l; call ppm_hold_r':'eq: jump bs1_is_off0 → ppm_hold_left = ppm_hold_right = 255 every sample'}`);
        tr(flags().f0? 'PEAK HOLD ON: the held PPM index is ORed into DATA1 (pk_data_1 & "-1 mask") for 200 000 samples ≈ 3.85 s' : 'PEAK HOLD OFF: index 255 → pk_data_1[261] = start bit only, no hold dot'); }
    }); },
  plug(ch){ D.conn[ch] = !D.conn[ch]; act(`${D.conn[ch]?'Connect':'Disconnect'} INPUT ${ch?'R':'L'} (Phoenix)`, tr=>{
      tr(`${ch?'Right':'Left'} channel ${D.conn[ch]?'carries the generator signal':'falls to the analog noise floor (≈ −100 dBFS, '+inf+')'}`);
      tr('ADC → SPORT0 DMA dma_in_a[' + ch + '] → float r0 by −31 → audio_in_float[' + ch + ']');
      tr(D.conn[ch]? 'VUMeterCalc / PhaseMeterCalc pick it up on the next sample' : 'PhaseMeterGet: one channel silent → sumAVE = diffAVE → y = 0 → index 128 → phase column reads 0');
      if (!D.conn[1] && D.conn[0]) tr('Note: the R channel\'s ppm_hold_r flags now decide whether BOTH holds are reset (see Findings)');
    }); },
  power(){ D.power = !D.power; D.boot0 = D.power; act(D.power?'Mains on (IEC inlet)':'Mains off (IEC inlet)', tr=>{
      if (!D.power){ tr('All LEDs go dark; the SHARC stops.'); return; }
      tr('BMS boot: the 21065L loads 256 instructions from the 8-bit EPROM (ANALOG1 image), the loader kernel pulls in the rest');
      tr('rst_svc: call Init_dsp → flags 0-3 inputs, 4-11 outputs; flush the MM5450s (100 × 75 clock toggles); reset_delay 10 000 loops');
      tr('TIMER0 PWMOUT, TPERIOD0 = 4 → ADC MCLK = CCLK/4; SPORT0 I²S, DMA tcb0_rx0a; then start: VUMeterInit, FLG11 → ADC out of reset');
      tr(`The second now starts at power-on: boot ≈ ${C.BOOT*1000} ms (${inf}), meters rise from zero`);
    }); },
  settle(){ D.boot0 = false; act('Settle (1 s pre-roll)', tr=>tr('The simulated second now starts with the meters already settled on the signal')); },
  setSrc(v){ D.src=v; act('Generator → '+SRCS[v], tr=>tr('Test signal at the rear INPUT: '+SRCS[v])); },
  setMode(v){ D.mode=v; act('Generator → '+MODES[v], tr=>{ tr('L/R relation: '+MODES[v]); tr('PhaseMeterCalc: sumAVE = AVE|L+R|, diffAVE = AVE|L−R|; PhaseMeterGet: y = (sum−diff)/(sum+diff) → 128·y+128'); }); },
  setLevel(v){ D.level=v; act(`Generator level → ${v>0?'+':''}${v} dBu`, tr=>{ tr(`= ${(v-C.REF_DBU).toFixed(0)} dBFS at the ADC (0 dBFS = +${C.REF_DBU} dBu, ${inf})`); if (v>=C.REF_DBU) tr('The ADC clips'); }); },
  setFreq(v){ D.freq=v; act(`Generator frequency → ${v>=1000?v/1000+' kHz':v+' Hz'}`, tr=>tr('The meter is frequency-flat; the timeline shows the cycles')); },
  view(v){ D.view=v; act(v==='eye'?'View: as the eye sees it':'View: what the LEDs do this instant', tr=>tr(v==='eye'? 'Both bars drawn from their latest frames (persistence of vision)' : 'Only the side selected by FLG8 is lit; L and R alternate every 300 samples (5.77 ms)')); },
  reset(){ Object.assign(D, {power:true, boot0:false, src:'tone', mode:'mono', level:4, freq:1000, view:'eye'}); D.conn=[true,true]; D.dip={bs1:true,bs0:true,cal1:false,cal0:true}; D.log=[]; SK=''; SIM.refresh(); },
};

/* ================================================================
   DRAWING: front and rear panels on the real silkscreen
   POD3A-FRONT&REAR-SILK (CURVE).pdf (Jun.19/14) cut by tools/silk_extract.py at 200 dpi between the
   crop marks (x 275-1989; FRONT GREEN y 214-535, FRONT WHITE y 746-1067, REAR WHITE y 1194-1515) =
   1714 × 321 px = the 8.570 × 1.606 in panel of POD3A-FRONT ISS 1 (PANEL).pdf. LED columns sit on the 57
   printed scale numbers; LED rows, phase column and PR LEDs are measured from Pics/POD3A Front.jpg.
   Rear cut-outs (DIP 4.025 in, Phoenix 5.347/5.822 in, IEC 7.415 in) come from POD3A-REAR ISS 1 (PANEL).pdf.
   ================================================================ */
const ASSET = 'siumulation-plugins/assets/';
/* Artwork 2026|59: both panels now come straight from the CorelDRAW sheet POD3A-FRONT&REAR-SILK (CURVE).cdr (same Jun.19/14
   artwork the PDF was printed from, text as curves). Inkscape → plain SVG, then tools/make_panel (scratch) cut the FRONT GREEN,
   FRONT WHITE and REAR WHITE plates out at their outline (x 98.95 pt; y 77.18 / 268.79 / 429.76 pt; 617.04 × 115.63 pt =
   8.570 × 1.606 in), registered the two front plates on one face, inked them POD green rgb(52,168,83) / white rgb(240,240,236),
   and kept the cut-outs, screw holes and centre marks as faint geometry. 1 pt = 200/72 px, so the art lands on the same
   1714 × 321 grid the controls were laid out on: every LED, DIP, Phoenix and IEC overlay still sits on its hole. */
const ART_SRC = '#POD #SERIES/POD3A - #Master/POD3A - #ARTWORK #DA #2016/POD3A-FRONT&REAR-SILK (CURVE).cdr';
const ART_CAP = `<div class="small muted" style="margin-top:4px">Front and rear artwork: ${SIM.src(ART_SRC, 'POD3A-FRONT&REAR-SILK (CURVE).cdr')} (CorelDRAW, Jun.19/14 · ${Y(2014)}), green and white plates registered on one panel.</div>`;
function frontSVG(t, opts){
  opts = opts||{};
  const d = display(t);
  let s = `<svg viewBox="0 0 1714 321" role="img" aria-label="POD3A front panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block;cursor:pointer" class="p3front">
    <defs><filter id="p3g" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1714" height="321" rx="10" fill="#0e0b09"/>
    <rect x="478" y="112" width="884" height="98" rx="3" fill="#15100c" stroke="#2a2018"/>
    <rect x="400" y="90" width="26" height="140" rx="2" fill="#15100c" stroke="#2a2018"/>`;
  const led = (x,y,w,h,on,col)=>`<rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="1.5" fill="${on?col:'#2a2116'}" ${on?'filter="url(#p3g)"':''}/>`;
  [131,191].forEach((y,side)=>{
    const b = d.bars[side];
    for (let i=0;i<57;i++) s += led(SEGX[i], y, 11, 16, b && b.segs[i], segCol(LBL[i]));
    s += led(460, y, 11, 16, d.on && !d.booting && d.pr[side], '#ffb43a');
  });
  const ph = d.on && d.side!==null ? d.phase : 0;
  for (let j=0;j<9;j++) s += led(413, 99+15*j, 14, 11, j<ph, '#c3d81a');
  // two red board LEDs seen through the bronze plexiglass in the photo (function not traced)
  s += led(1030, 100, 10, 6, d.on, '#ff2a40') + led(1030, 222, 10, 6, d.on, '#ff2a40');
  s += `<image href="${ASSET}pod3a-front.svg" width="1714" height="321" preserveAspectRatio="none" style="pointer-events:none"/>`;
  [50,337,1477,1663].forEach(x=> s += `<circle cx="${x}" cy="161" r="13" fill="#3a3a38"/><path d="M${x-7} 161h14M${x} 154v14" stroke="#1d1d1c" stroke-width="2.5"/>`);
  if (d.booting) s += `<text x="900" y="300" fill="#ffb43a" font-size="20" text-anchor="middle">booting (EPROM → SHARC)</text>`;
  if (!D.power) s += `<text x="900" y="300" fill="#777" font-size="20" text-anchor="middle">no mains</text>`;
  if (D.view==='inst' && d.side!==null) s += `<text x="1660" y="${d.side?232:92}" fill="#ffb43a" font-size="18" text-anchor="end">FLG8 → ${d.side?'R':'L'}</text>`;
  return s + (opts.hot||'') + `</svg>`;
}
function rearSVG(){
  let s = `<svg viewBox="0 0 1714 321" role="img" aria-label="POD3A rear panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <rect width="1714" height="321" rx="10" fill="#141516"/>`;
  // DIP switch (CTS 209-style, 4 positions) in cut-out A
  s += `<rect x="760" y="70" width="90" height="50" rx="3" fill="#0b0b0b" stroke="#333"/>`;
  DIPS.forEach(([k,lbl],i)=>{ const x=776+20*i, on=D.dip[k];
    s += `<g class="dipl" data-i="${i}" style="cursor:pointer"><rect x="${x-9}" y="74" width="18" height="42" fill="#222"/><rect x="${x-7}" y="${on?97:77}" width="14" height="16" rx="2" fill="#e8e2c8"/><rect x="${x-12}" y="66" width="24" height="60" fill="transparent"><title>${lbl}: ${on?'ON':'OFF'} — click to flip</title></rect></g>`; });
  // Phoenix inputs (cut-outs B), green 3-way: G, −, + from top (silk "+ - G")
  [[1069,0],[1164,1]].forEach(([x,ch])=>{ const c=D.conn[ch];
    s += `<g class="phx" data-c="${ch}" style="cursor:pointer"><rect x="${x-27}" y="193" width="54" height="84" rx="3" fill="#5cbf62" stroke="#2f7a33" stroke-width="2"/>${[207,235,263].map(y=>`<rect x="${x-14}" y="${y-9}" width="22" height="18" fill="#1d4d20"/>`).join('')}
      ${c?`<path d="M${x+27} 235 h40 q20 0 20 30 v60" stroke="#c9c9c9" stroke-width="10" fill="none"/>`:''}<circle cx="${x+34}" cy="185" r="8" fill="${c?'var(--accent)':'#555'}"/><rect x="${x-30}" y="180" width="60" height="110" fill="transparent"><title>INPUT ${ch?'R':'L'}: ${c?'connected — click to unplug':'unplugged — click to connect'}</title></rect></g>`; });
  // IEC inlet with fuse drawer (½ A slow-blow per silk)
  s += `<g class="iec" style="cursor:pointer"><rect x="1358" y="45" width="250" height="210" rx="16" fill="#0b0b0c" stroke="#2f3236" stroke-width="2"/><rect x="1380" y="80" width="56" height="140" rx="6" fill="#16181a" stroke="#3a3d40"/><rect x="1462" y="78" width="122" height="150" rx="10" fill="#050505"/>
    ${[[1496,120],[1550,120],[1523,182]].map(([x,y])=>`<rect x="${x-5}" y="${y-14}" width="10" height="28" fill="#b9b9b9"/>`).join('')}
    ${D.power?`<rect x="1470" y="250" width="100" height="71" fill="#222"/><rect x="1462" y="230" width="116" height="34" rx="6" fill="#2b2b2b"/>`:''}<circle cx="1595" cy="62" r="8" fill="${D.power?'var(--accent)':'#555'}"/>
    <rect x="1358" y="45" width="250" height="210" fill="transparent"><title>Mains: click to ${D.power?'unplug':'plug in'}</title></rect></g>`;
  [50,150,1291,1663].forEach(x=> s += `<circle cx="${x}" cy="160" r="12" fill="#3a3a38"/><path d="M${x-6} 160h12M${x} 154v12" stroke="#1d1d1c" stroke-width="2.5"/>`);
  s += `<image href="${ASSET}pod3a-rear.svg" width="1714" height="321" preserveAspectRatio="none" style="pointer-events:none"/></svg>`;
  return s + ART_CAP;
}
function bindPanel(root){
  root.querySelectorAll('.dipl').forEach(g=>g.addEventListener('click', ()=>A.dip(+g.dataset.i)));
  root.querySelectorAll('.phx').forEach(g=>g.addEventListener('click', ()=>A.plug(+g.dataset.c)));
  const i=root.querySelector('.iec'); if (i) i.addEventListener('click', ()=>A.power());
  const f=root.querySelector('.p3front'); if (f) f.addEventListener('click', ()=>A.view(D.view==='eye'?'inst':'eye'));
}
function genHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px" class="small">
    <label>Signal <select data-g="src">${Object.keys(SRCS).map(k=>`<option value="${k}" ${k===D.src?'selected':''}>${SRCS[k]}</option>`).join('')}</select></label>
    <label>L/R <select data-g="mode">${Object.keys(MODES).map(k=>`<option value="${k}" ${k===D.mode?'selected':''}>${MODES[k]}</option>`).join('')}</select></label>
    <label>Freq <select data-g="freq">${[100,400,1000,10000].map(f=>`<option value="${f}" ${f===D.freq?'selected':''}>${f>=1000?f/1000+' kHz':f+' Hz'}</option>`).join('')}</select></label>
    <label>Level <input data-g="level" type="range" min="-60" max="28" step="1" value="${D.level}" style="width:150px;vertical-align:middle"> <b class="mono" data-g="lv">${D.level>0?'+':''}${D.level} dBu</b></label>
    <button data-a="view">${D.view==='eye'?'Show the multiplex (instant view)':'Back to the eye view'}</button>
    ${D.boot0?'<button data-a="settle">Settle (pre-roll)</button>':''}<button data-a="rst">Factory reset</button></div>
    <div class="small muted" style="margin-top:4px">Rear: click a DIP lever to flip it, a green Phoenix block to unplug that input, the IEC inlet for mains. Keys: 1–4 DIP levers · L / R plug · + / − level · V view.</div>`;
}
function bindGen(root){
  root.querySelectorAll('[data-g]').forEach(e=>{
    if (e.tagName==='SELECT') e.onchange = ()=>{ const g=e.dataset.g; if (g==='src') A.setSrc(e.value); else if (g==='mode') A.setMode(e.value); else A.setFreq(+e.value); };
    if (e.type==='range'){ e.oninput = ()=>{ const lv=root.querySelector('[data-g="lv"]'); if (lv) lv.textContent=(e.value>0?'+':'')+e.value+' dBu'; }; e.onchange = ()=>A.setLevel(+e.value); }
  });
  root.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{ const a=b.dataset.a; if (a==='view') A.view(D.view==='eye'?'inst':'eye'); else if (a==='settle') A.settle(); else if (a==='rst') A.reset(); });
}
document.addEventListener('keydown', e=>{
  if (!window.__pod3aActive || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase();
  const m={'1':()=>A.dip(0),'2':()=>A.dip(1),'3':()=>A.dip(2),'4':()=>A.dip(3),l:()=>A.plug(0),r:()=>A.plug(1),'+':()=>A.setLevel(Math.min(28,D.level+1)),'=':()=>A.setLevel(Math.min(28,D.level+1)),'-':()=>A.setLevel(Math.max(-60,D.level-1)),v:()=>A.view(D.view==='eye'?'inst':'eye')};
  if (m[k]){ m[k](); e.preventDefault(); }
});

/* ---------------- timeline lanes ---------------- */
function plot(c,X,t0,t1,y,h,fn,lo,hi,col,pw){
  const n = Math.max(80, Math.min(1400, Math.round(pw||800)));
  c.strokeStyle=col; c.lineWidth=1.4; c.beginPath();
  for (let i=0;i<=n;i++){ const t=t0+(t1-t0)*i/n; const v=Math.max(lo,Math.min(hi,fn(t))); const yy=y+h-3-(v-lo)/(hi-lo)*(h-6); i?c.lineTo(X(t),yy):c.moveTo(X(t),yy); }
  c.stroke();
}
function wave(c,X,t0,t1,y,h,arr,col){
  let pk=arr._pk; if (pk===undefined){ pk=0; for (let i=0;i<arr.length;i+=3){ const v=Math.abs(arr[i]); if(v>pk) pk=v; } arr._pk=pk; }
  const x0=X(t0), x1=X(t1), pw=x1-x0, n0=Math.floor(t0*FS), n1=Math.min(N-1,Math.ceil(t1*FS)), mid=y+h/2, k=(h/2-3)*(pk>1e-4?0.95/pk:1);
  c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; c.fillText(pk>1e-4?`peak ${(20*Math.log10(pk)).toFixed(1)} dBFS (scaled to fit)`:'≈ silence', X(t0)+4, y+10);
  c.strokeStyle=col; c.fillStyle=col;
  if (n1-n0 > pw*1.5){ c.globalAlpha=.55; for (let px=0;px<pw;px++){ const a=n0+Math.floor((n1-n0)*px/pw), b=n0+Math.floor((n1-n0)*(px+1)/pw); let lo=1,hi=-1; for (let j=a;j<=b;j++){ const v=arr[j]; if(v<lo)lo=v; if(v>hi)hi=v; } c.fillRect(x0+px, mid-hi*k, 1, Math.max(1,(hi-lo)*k)); } c.globalAlpha=1; return; }
  c.lineWidth=1.2; c.beginPath(); for (let j=n0;j<=n1;j++){ const xa=X(j/FS), xb=X((j+1)/FS), v=mid-arr[j]*k; j===n0?c.moveTo(xa,v):c.lineTo(xa,v); c.lineTo(xb,v); } c.stroke();
}
function lanes(){
  const s = sim(), css=n=>SIM.css(n), cal=s.cal; const lo=-60, hi=24;
  const ls = [];
  const norm = arr => arr;   // samples already in full-scale units
  ls.push({label:'INPUT L (ADC samples)', h:34, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,s.xL,css('--accent')); }});
  ls.push({label:'INPUT R (ADC samples)', h:34, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,s.xR,css('--bad')); }});
  ls.push({label:`sport0_isr every sample (fs ${FS/1000} kHz)`, h:22, draw(c,X,t0,t1,y,h){ if(!D.power) return; const ph = s.bootN>0? s.bootN/FS : 0; SIM.pulses(c,X,Math.max(t0,ph),t1,y,h,1/FS,0,230/C.CCLK,css('--accent2'),'ISR (FLG9 high ≈ 100 cycles, inferred)'); }});
  ls.push({label:'FLG8 side select (mux)', h:24, draw(c,X,t0,t1,y,h){
    const F=s.frames; c.font='10px sans-serif';
    for (let k=0;k<F.length;k++){ const a=F[k].latch/FS, b=(k+1<F.length?F[k+1].latch:N+C.MUX)/FS; if (b<t0||a>t1) continue; c.fillStyle = F[k].side? css('--bad') : css('--accent'); c.globalAlpha=.55; c.fillRect(X(a),y+4,Math.max(1,X(b)-X(a)-1),h-8); c.globalAlpha=1; if (X(b)-X(a)>18){ c.fillStyle='#fff'; c.fillText(F[k].side?'R':'L', X(a)+3, y+h/2+4); } } }});
  ls.push({label:'MM5450 shift (FLG7 clock, 36 bits)', h:24, draw(c,X,t0,t1,y,h){
    const F=s.frames; c.fillStyle=css('--warn');
    for (const f of F){ const a=f.n/FS, b=f.latch/FS; if (b<t0||a>t1) continue;
      if (X(b)-X(a) > 140){ for (let q=0;q<C.SHIFT;q+=2){ const ta=(f.n+q+1)/FS; c.fillRect(X(ta), y+4, Math.max(1,X(ta+1/FS)-X(ta)), h-8); } }
      else c.fillRect(X(a), y+4, Math.max(1.5,X(b)-X(a)), h-8); } }});
  [0,1].forEach(ch=>{
    ls.push({label:`VU ${ch?'R':'L'} → scale dB (bar)`, h:40, draw(c,X,t0,t1,y,h,pw){
      c.strokeStyle=css('--grid'); [0,-20].forEach(v=>{ const yy=y+h-3-(v-lo)/(hi-lo)*(h-6); c.beginPath(); c.moveTo(X(t0),yy); c.lineTo(X(t1),yy); c.stroke(); });
      plot(c,X,t0,t1,y,h,t=>D.power?scaleVU(s.vu[ch][idx(t)],cal):lo,lo,hi,ch?css('--bad'):css('--accent'),pw);
      plot(c,X,t0,t1,y,h,t=>D.power?scalePK(s.pp[ch][idx(t)],cal):lo,lo,hi,css('--warn'),pw);
      c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('VU (solid) · PPM (orange) · grid 0 / −20', X(t0)+4, y+11); }});
  });
  ls.push({label:'PPM hold L / R (BS1)', h:26, draw(c,X,t0,t1,y,h,pw){
    if (!holdOn()){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('BS1 ON → hold forced to 255 every sample (off)', X(t0)+6, y+h/2+4); return; }
    [0,1].forEach(ch=>plot(c,X,t0,t1,y,h,t=>{ const r=s.hold[ch][idx(t)]; return r>=255?lo:(35-r)/2; },lo,hi,ch?css('--bad'):css('--accent'),pw)); }});
  ls.push({label:'Over LED (+11 seg) L / R', h:22, draw(c,X,t0,t1,y,h){
    const n=Math.max(60,Math.min(800,(X(t1)-X(t0))/2)); [0,1].forEach(ch=>{ c.fillStyle=ch?css('--bad'):css('--accent'); for (let i=0;i<n;i++){ const t=t0+(t1-t0)*(i+.5)/n; if (s.ov[ch][idx(t)]) c.fillRect(X(t0+(t1-t0)*i/n), y+3+ch*9, (X(t1)-X(t0))/n+.5, 7); } }); }});
  ls.push({label:'Phase y = (Σ−Δ)/(Σ+Δ)', h:30, draw(c,X,t0,t1,y,h,pw){ c.strokeStyle=css('--grid'); c.beginPath(); c.moveTo(X(t0),y+h/2); c.lineTo(X(t1),y+h/2); c.stroke(); plot(c,X,t0,t1,y,h,t=>s.y[idx(t)],-1,1,css('--accent2'),pw); }});
  ls.push({label:'Displayed bar top L / R (latched)', h:36, draw(c,X,t0,t1,y,h){
    const F=s.frames; [0,1].forEach(ch=>{ c.strokeStyle=ch?css('--bad'):css('--accent'); c.lineWidth=1.6; c.beginPath(); let started=false;
      for (let k=0;k<F.length;k++){ if (F[k].side!==ch) continue; const a=F[k].latch/FS; let b=N/FS; for (let q=k+1;q<F.length;q++) if (F[q].side===ch){ b=F[q].latch/FS; break; } if (b<t0||a>t1) continue;
        const top=vuTop(F[k].vu[ch]); const v = top===null? lo : LBL[top]; const yy=y+h-3-(v-lo)/(hi-lo)*(h-6); if(!started){c.moveTo(X(Math.max(a,t0)),yy);started=true;} else c.lineTo(X(a),yy); c.lineTo(X(Math.min(b,t1)),yy); }
      c.stroke(); }); }});
  return ls;
}

/* ---------------- MM5450 scope ---------------- */
function drawScope(cv, info, t){
  const s=sim(); const {c,w} = SIM.canvas(cv, 196);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), warn=SIM.css('--warn'), grid=SIM.css('--grid');
  const k = lastMux(t);
  if (!D.power || k<0){ c.fillStyle=ink2; c.font='12px sans-serif'; c.fillText(D.power?'No frame yet (booting).':'No mains.', 10, 20); info.innerHTML=''; return; }
  const f = s.frames[k], wds = words(f, f.side), n=Math.floor(t*FS), pos = Math.min(C.SHIFT, n - f.n);
  const x0=70, cw=(w-x0-10)/36;
  const rows = [['FLG7 CLK',null],['FLG4 DATA1',wds.d1],['FLG5 DATA2',wds.d2],['FLG6 DATA3',wds.d3]];
  rows.forEach(([nm,bits],r)=>{ const y=18+r*42; c.fillStyle=grid; c.fillRect(x0,y+22,w-x0-10,1); c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(nm, 4, y+16);
    c.strokeStyle= r? acc : ink; c.lineWidth=1.4; c.beginPath();
    for (let b=0;b<36;b++){ const xa=x0+b*cw;
      if (!bits){ c.moveTo(xa,y+22); c.lineTo(xa+cw/2,y+22); c.lineTo(xa+cw/2,y+4); c.lineTo(xa+cw,y+4); c.lineTo(xa+cw,y+22); }
      else { const yy = bits[b]? y+4 : y+22; c.moveTo(xa,yy); c.lineTo(xa+cw,yy); if (b<35 && bits[b]!==bits[b+1]){ c.lineTo(xa+cw, bits[b+1]?y+4:y+22); } } }
    c.stroke(); });
  c.fillStyle=ink2; c.font='9px sans-serif'; for (let b=0;b<36;b+=5) c.fillText(b, x0+b*cw+1, 190);
  c.fillStyle=warn; c.globalAlpha=.15; c.fillRect(x0, 14, cw, 164); c.globalAlpha=1;
  if (pos < C.SHIFT){ const bx = x0 + (pos/2)*cw; c.strokeStyle=SIM.css('--play'); c.lineWidth=2; c.beginPath(); c.moveTo(bx,12); c.lineTo(bx,180); c.stroke(); }
  const segList = (bits,base,from,to)=>{ const o=[]; for (let b=from;b<=to;b++) if (bits[b]) o.push(base(b)); return o; };
  const d1 = segList(wds.d1, b=>LBL[b+30], 1, 26), d2 = segList(wds.d2, b=>LBL[b-4], 4, 34);
  info.innerHTML = `Frame #${k} for the <b>${f.side?'RIGHT':'LEFT'}</b> bar (mux at sample ${f.n.toLocaleString()}, latched at ${f.latch.toLocaleString()}) · ${pos<C.SHIFT?`shifting: clock ${Math.floor(pos/2)}/36`:'latched; next mux in '+(C.MUX-(n-f.n))+' samples'}
    <br>vu_results = ${f.vu[f.side]} · pk_results = ${f.pk[f.side]} · ppm_hold = ${f.hold[f.side]} · over = ${f.over[f.side]} · phase index ${f.ph}
    <br>DATA1 bits → ${d1.length? d1.join(' '):'—'} <span class="muted">(scale −5…+20; bit 17 = +11 = over LED)</span>
    <br>DATA2 bits → ${d2.length? (d2.length>10? d2.slice(0,3).join(' ')+' … '+d2.slice(-3).join(' ')+' ('+d2.length+' segs)' : d2.join(' ')) :'—'} <span class="muted">(scale −52…−6; bits 1-3 = −58…−54 and bit 35 drive nothing)</span>
    <br>DATA3 → phase ${phaseBits(f.ph).length} LEDs + PR bit ${f.side?16:17} · bit 0 of every frame is the MM5450 start bit (shaded)`;
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function stateTable(t){
  const s=sim(), n=idx(t), cal=s.cal; const d=display(t);
  const r = ch => [clampR(rawR(s.vu[ch][n])+cal), clampR(rawR(s.pp[ch][n])+cal)];
  const hex = v => { let q=Math.round(v*8388607); if(q<0) q+=1<<24; return '0x'+q.toString(16).toUpperCase().padStart(6,'0'); };
  const k=lastMux(t), F=k>=0?s.frames[k]:null;
  const top = ch => { const b=d.bars[ch]; if(!b) return '—'; let tp=null; b.segs.forEach((v,i)=>{ if (v==='vu') tp=i; }); return tp===null?'(none)':(LBL[tp]>0?'+':'')+LBL[tp]; };
  return `<table class="kv">
    <tr><th>Sample</th><td class="mono">${n.toLocaleString()} of ${N.toLocaleString()} · ${SIM.fmtDur(1/FS)} each · CCLK ≈ ${(C.CCLK/1e6).toFixed(2)} MHz (${inf})</td></tr>
    <tr><th>ADC words (24-bit)</th><td class="mono">L ${hex(s.xL[n])} · R ${hex(s.xR[n])}</td></tr>
    <tr><th>vu_results / pk_results</th><td class="mono">L ${r(0).join(' / ')} · R ${r(1).join(' / ')} <span class="muted">(index = r + 6; 0 = top)</span></td></tr>
    <tr><th>VU / PPM, scale dB</th><td class="mono">L ${scaleVU(s.vu[0][n],cal).toFixed(1)} / ${scalePK(s.pp[0][n],cal).toFixed(1)} · R ${scaleVU(s.vu[1][n],cal).toFixed(1)} / ${scalePK(s.pp[1][n],cal).toFixed(1)}</td></tr>
    <tr><th>meter_cal (CAL)</th><td class="mono">${cal} → 0 VU = ${calDbu()>0?'+':''}${calDbu()} dBu · decay ${decayK()} (${decayK()===C.DEC_SLOW?'SLOW':'FAST'})</td></tr>
    <tr><th>ppm_hold L/R · counters</th><td class="mono">${holdOn()? `${s.hold[0][n]} / ${s.hold[1][n]} · ${s.hc[0][n]} / ${s.hc[1][n]}` : 'off (BS1 ON)'}${holdOn()&&s.resets?` <span style="color:var(--warn)">· both reset by R's flags ${s.resets.toLocaleString()}× this second</span>`:''}</td></tr>
    <tr><th>Over LED L/R</th><td class="mono">${s.ov[0][n]} / ${s.ov[1][n]} · pk_counter ${s.oc[0][n]} / ${s.oc[1][n]}</td></tr>
    <tr><th>Phase</th><td class="mono">y = ${s.y[n].toFixed(3)} → index ${s.ph[n]} → ${phaseBits(s.ph[n]).length} LEDs${s.ph[n]>=255?' <span style="color:var(--warn)">(past the 255-word table)</span>':''}</td></tr>
    <tr><th>Mux</th><td class="mono">${F? `BIT31 side ${F.side?'R':'L'} · mux_counter ${C.MUX-(n-F.n)} · ${n-F.n<C.SHIFT?'BIT30 shifting':'idle'}` : '—'}</td></tr>
    <tr><th>Bar top shown</th><td class="mono">L ${top(0)} · R ${top(1)}</td></tr></table>`;
}
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Flip a rear DIP lever, unplug an input or change the test signal. Each step the firmware takes is listed here.</div>'; }

function viewSim(m){
  window.__pod3aActive = true;
  m.innerHTML = `
  <div class="grid2">
    <div>
      ${card('Front panel at the playhead — what the operator sees', `<div id="fp"></div>${genHTML()}`)}
      ${card('Rear panel — DIP switch, inputs, mains', `<div id="rp"></div>`)}
    </div>
    <div>
      ${card('What the firmware did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
    </div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek)', `<canvas id="tl"></canvas>
    <p class="small muted">Every lane is computed sample by sample from the firmware's own constants at ${FS/1000} kHz (${inf}: the constants are named <span class="mono">_52</span>). The bar only changes when a new MM5450 frame latches: L and R take turns every 300 samples, so each bar is refreshed ${(FS/C.MUX/2).toFixed(1)} times a second.</p>`)}
  <div class="grid2">
    ${card('Scope: the MM5450 serial frame at the playhead (36 clocks, start bit + 35 data bits)', `<canvas id="scope"></canvas><div id="bits" class="small mono"></div>`)}
    ${card('Action log', `<div id="log" class="log"></div>`)}
  </div>`;
  const draw = ()=>{
    const t=SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#insp').innerHTML = stateTable(t);
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span> → ${e.state}</div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200});
    drawScope(m.querySelector('#scope'), m.querySelector('#bits'), t);
  };
  bindGen(m);
  SIM.on('time', draw);
}

/* ---------------- tutorial ---------------- */
const topNow = ch => { const d=display(SIM.t), b=d.bars[ch]; if(!b) return null; let tp=null; b.segs.forEach((v,i)=>{ if (v==='vu') tp=i; }); return tp===null?null:LBL[tp]; };
const anyNow = (ch, kind) => { const d=display(SIM.t), b=d.bars[ch]; return !!(b && b.segs.some(v=>v===kind)); };
const LESSONS = [
  { title:'Meet the POD3A', body:`<p>The POD3A is a half-rack <b>stereo loudness meter</b> for analog lines. Two 57-LED bars (left above, right below) read from <b>−52</b> to <b>+20 dB</b> around a reference you set on the rear. The left part of the scale is labelled <b>VU RANGE</b>, the right part <b>PEAK RANGE</b>. The 9-LED <b>PHASE</b> column on the left reads from +1 (in phase) to −1 (out of phase).</p>
     <p>Each bar shows two things: a solid <b>VU bar</b> (average loudness, about 300 ms) and a single <b>PPM dot</b> (fast peaks, 5 ms attack). Inside, a SHARC DSP computes both, sample by sample.</p>
     <p class="muted">The 2002 manual (pod3.pdf) covers the older analog POD3. The POD3A steps here follow the rear legend and the firmware. Hover over the panel on the right.</p>`, check:()=>true, auto:true },
  { title:'1 · Read a line-up tone', body:`<p>A <b>1 kHz tone at +4 dBu</b> is plugged into both inputs, and the rear CAL switches are set to <b>+4 dBu</b> (CAL1 OFF, CAL0 ON). The bar should stop exactly at <b>0</b>, with the PPM dot on top of it.</p><p><b>Goal:</b> left bar top at 0.</p>`, check:()=>D.src==='tone'&&topNow(0)===0, hint:'Factory reset, or set Signal = Steady tone, Level = +4 dBu, CAL1 OFF, CAL0 ON.' },
  { title:'2 · Recalibrate for a 0 dBu plant', body:`<p>Some plants line up at 0 dBu. Flip <b>CAL1</b> to ON (both CAL switches ON = 0 dBu). The firmware's <span class="mono">read_dipswitch</span> moves the table index by 8 half-dB steps, so the same +4 dBu tone now reads <b>+4</b>.</p><p><b>Goal:</b> CAL = 0 dBu and the bar reads +4.</p>`, check:()=>calDbu()===0&&topNow(0)===4, hint:'Click the third DIP lever (CAL1) or press 3.' },
  { title:'3 · Find the headroom', body:`<p>Raise the level. Above +9 the bar runs into the red <b>PEAK RANGE</b>. Keep going to <b>+22 dBu</b>: every sample above 0.707 of full scale (−3 dBFS) lights the <b>+11 LED</b> on its own for 3.85 s. This is the "peak" lamp of the SLM-1 code, and it lands on the +11 segment.</p><p>Notice that the PPM dot stops at +17 even when the bar reaches +20 (see Findings).</p><p><b>Goal:</b> make the over LED light.</p>`, check:()=>anyNow(0,'over')||sim().ov[0][idx(SIM.t)]===1, hint:'Drag Level to +22 dBu or more (or press + repeatedly).' },
  { title:'4 · Watch the ballistics', body:`<p>Set CAL back to <b>+4 dBu</b>, the level to <b>+4 dBu</b> and the signal to <b>Tone burst</b> (on from 100 to 400 ms). Play or scrub the timeline: the PPM dot jumps up within about 5 ms, the VU bar takes about 300 ms to rise, and after the burst both fall away.</p><p><b>Goal:</b> tone burst at CAL +4.</p>`, check:()=>D.src==='burst'&&calDbu()===4, hint:'Signal → Tone burst; CAL1 OFF + CAL0 ON.' },
  { title:'5 · Peak hold', body:`<p>Flip <b>BS1</b> to OFF (PEAK HOLD ON). Now <span class="mono">ppm_hold_l/r</span> remember the highest PPM index for 200 000 samples (3.85 s): after the burst ends, a held dot stays at 0 while the bar falls.</p><p>The hold dot only lives on the top 26 LEDs (−4…+17). Try a quiet burst at −20 dBu: no hold dot.</p><p><b>Goal:</b> hold on, with a held dot after 0.5 s.</p>`, check:()=>holdOn()&&D.src==='burst', hint:'Click the first DIP lever (BS1) or press 1, then scrub past 0.5 s.' },
  { title:'6 · Decay speed', body:`<p><b>BS0</b> picks how fast the PPM dot falls: ON = <b>SLOW</b> (24 dB in 3 s), OFF = <b>FAST</b> (24 dB in 1.5 s). Flip BS0 OFF and compare the orange PPM curves on the timeline after 400 ms.</p><p><b>Goal:</b> FAST decay.</p>`, check:()=>decayK()===C.DEC_FAST, hint:'Click the second DIP lever (BS0) or press 2.' },
  { title:'7 · Phase', body:`<p>Set the signal back to <b>Steady tone</b>, then choose <b>Anti-phase (R = −L)</b>. The phase column fills down to <b>−1</b>: the signals cancel if summed to mono. In-phase lights only the top LED; 90° fills to the middle.</p><p><b>Goal:</b> full phase column.</p>`, check:()=>D.mode==='anti'&&display(SIM.t).phase===9, hint:'L/R → Anti-phase. Make sure both inputs are connected.' },
  { title:'8 · Lose a channel', body:`<p>Set L/R back to <b>Mono</b>, then <b>unplug the R input</b> on the rear. The right bar drops out and the phase column settles at <b>0</b>: with one channel silent, sum and difference are equal, so <span class="mono">PhaseMeterGet</span> returns 128.</p><p><b>Goal:</b> R unplugged.</p>`, check:()=>!D.conn[1], hint:'Click the green R Phoenix block on the rear (or press R).' },
  { title:'9 · See the multiplex', body:`<p>Plug R back in. Click the front panel (or press V) to switch to the <b>instant view</b>. Only one bar is lit at any moment: the three MM5450 drivers are shared, and <span class="mono">mux_ctl</span> swaps L and R every 300 samples (5.77 ms). Set the zoom to 20 ms and step through the frames.</p><p><b>Goal:</b> instant view with both inputs connected.</p>`, check:()=>D.view==='inst'&&D.conn[1]&&D.conn[0], hint:'Click the front panel; reconnect R.' },
  { title:'Done', body:`<p>You've used every control on the POD3A. The <b>Software</b> tab follows one sample through the interrupt routine, <b>One second</b> breaks the display refresh into frames, and <b>Findings</b> explains why the hold dot can vanish and what the SHARC code is doing in a "POD3" folder.</p>`, check:()=>true, auto:true },
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__pod3aActive = true;
  m.innerHTML = `<div class="grid2">
    <div>${card('Tutorial — how an operator used the POD3A', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}
      <div class="card" id="lesson"></div></div>
    <div>${card('The unit', `<div id="fp"></div>${genHTML()}<div id="rp" style="margin-top:8px"></div>`)}
      ${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div></div>`;
  const hot = `<g>
    <rect x="360" y="80" width="80" height="190" fill="transparent"><title>PHASE: 9 LEDs, +1 (top) in phase … −1 out of phase (sdm_phase_data.dat)</title></rect>
    <rect x="480" y="110" width="880" height="100" fill="transparent"><title>Two 57-LED bars, L above / R below: VU bar + PPM dot (+ hold dot, + over LED at +11)</title></rect>
    <rect x="445" y="115" width="30" height="95" fill="transparent"><title>PR LEDs: fixed bits 17/16 of DATA3 — lit whenever that side's frame is shown</title></rect></g>`;
  const draw = ()=>{
    m.querySelector('#fp').innerHTML = frontSVG(SIM.t, {hot}); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L = LESSONS[lessonIdx], ok = L.check();
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok? (L.auto?'Ready.':'✓ Goal reached.') : '◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over (factory reset)</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); lessonIdx=0; draw(); };
  };
  bindGen(m);
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewSecond(m){
  window.__pod3aActive = true;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">${card('As seen by the device', `<div id="dev"></div>`)}${card('As seen by the display', `<div id="fp"></div><p class="small muted">Click the panel to switch between the eye view and the instant (multiplexed) view.</p><canvas id="duty"></canvas>`)}</div>
  ${card('Zoom ladder at the playhead (input L, with the latched L-bar top in red)', `<canvas id="zl"></canvas>`)}`;
  const dB24 = k => (2.4*Math.LN10/(k*FS));
  const rows = [
    ['DSP core clock (CCLK)', (C.CCLK/1e6).toFixed(3)+' M', SIM.fmtDur(1/C.CCLK), `fs × 1024 (RDIV0 = 0x001f000f: SCLK = CCLK/32, frame = 32 SCLK). ${inf}: crystal not archived`],
    ['ADC MCLK (TIMER0 PWMOUT)', (C.CCLK/4/1e6).toFixed(3)+' M', SIM.fmtDur(4/C.CCLK), 'TPERIOD0 = 4, TPWIDTH0 = 2 → CCLK/4 = 256 × fs'],
    ['Samples per channel = sport0_isr calls', FS.toLocaleString(), SIM.fmtDur(1/FS), 'SPORT0 I²S RX DMA (tcb0_rx0a) → VUMeterCalc + PhaseMeterCalc'],
    ['MM5450 clock edges (FLG7) while shifting', (FS/2).toLocaleString()+' Hz', SIM.fmtDur(2/FS), 'one edge per ISR: 36 clocks take 72 samples'],
    ['mux_ctl calls (L ⇄ R swaps)', (FS/C.MUX).toFixed(1), SIM.fmtDur(C.MUX/FS), 'mux_counter = 300 ("300=80Hz mux rate at 48K")'],
    ['Frames per bar', (FS/C.MUX/2).toFixed(1), SIM.fmtDur(2*C.MUX/FS), 'each bar lit 50 % of the time'],
    ['Shift burst', '—', SIM.fmtDur(C.SHIFT/FS), 'MM5450 outputs change only when the 36th bit lands'],
    ['VU rise/fall, 24 dB', '—', dB24(C.TVU).toFixed(3)+' s', 'TCONST_VU 0.0003541811 ("vu=300mS/24db")'],
    ['PPM attack, 24 dB', '—', SIM.fmtDur(dB24(C.TPA)), 'TCONST_PPM_ATTACK 0.02103034 ("pk attack=5mS/24db")'],
    ['PPM decay, 24 dB', '—', dB24(C.DEC_FAST).toFixed(2)+' / '+dB24(C.DEC_SLOW).toFixed(2)+' s', 'BS0 OFF peak_decay_2_52 / BS0 ON peak_decay_1_52'],
    ['PPM hold and over LED', '—', (C.PPM_HOLD/FS).toFixed(2)+' s', 'ppm_hold = pk_hold = 200 000 samples'],
    ['Phase averaging', '—', SIM.fmtDur(1/((1-C.ALPHA)*FS)), 'PHMETER_ALPHA 0.999 → 1000-sample time constant'],
  ];
  const draw = ()=>{
    const t=SIM.t, s=sim(), n=idx(t), k=lastMux(t), F=k>=0?s.frames[k]:null;
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Use <b>Step</b> on the transport to move one sample, one MM5450 clock, one mux frame or 10 ms at a time.</p>`;
    const inIsr = ((t*FS)%1) < 230/1024;
    m.querySelector('#dev').innerHTML = `<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)} · sample ${n.toLocaleString()} · ${((t*FS)%1*1024).toFixed(0)} / 1024 cycles into it</td></tr>
      <tr><th>SHARC</th><td class="mono">${!D.power?'off':n<s.bootN?'booting from EPROM':inIsr?'in sport0_isr (FLG9 high, then mux/counters/shift)':'main loop: VUMeterGet × 4, PhaseMeterGet'}</td></tr>
      <tr><th>MM5450 ×3</th><td class="mono">${F? (n-F.n<C.SHIFT? `clocking in the ${F.side?'R':'L'} frame: bit ${Math.floor((n-F.n)/2)} of 36` : `holding the ${F.side?'R':'L'} frame; FLG8 = ${F.side}`) : '—'}</td></tr>
      <tr><th>Next mux</th><td class="mono">${F? (C.MUX-(n-F.n))+' samples ('+SIM.fmtDur((C.MUX-(n-F.n))/FS)+')' : '—'}</td></tr></table>${stateTable(t)}`;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    // duty strip: which side lights over the 20 ms around the playhead
    const {c,w} = SIM.canvas(m.querySelector('#duty'), 46); const span=0.02, a=Math.max(0,Math.min(1-span,t-span/2));
    c.font='10px sans-serif'; c.fillStyle=SIM.css('--ink2'); c.fillText('20 ms around the playhead: which bar is lit (L green / R red); orange = shifting', 4, 10);
    for (let px=0;px<w;px++){ const tt=a+span*px/w; const kk=frameAt(tt); if (kk<0||!D.power) continue; const f=s.frames[kk]; c.fillStyle= f.side? SIM.css('--bad') : SIM.css('--accent'); c.fillRect(px,14,1,14); const km=lastMux(tt); if (km>=0 && Math.floor(tt*FS)-s.frames[km].n < C.SHIFT){ c.fillStyle=SIM.css('--warn'); c.fillRect(px,30,1,8); } }
    c.strokeStyle=SIM.css('--play'); c.lineWidth=2; c.beginPath(); c.moveTo((t-a)/span*w,12); c.lineTo((t-a)/span*w,42); c.stroke();
    drawLadder(m.querySelector('#zl'), t);
  };
  SIM.on('time', draw);
}
function drawLadder(cv, t){
  const s=sim(); const levels=[['1 second',1],['100 ms',0.1],['1 mux cycle (L+R)',2*C.MUX/FS],['1 shift burst',C.SHIFT/FS],['1 sample',1/FS]];
  const H=levels.length*44+10, {c,w}=SIM.canvas(cv,H);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), play=SIM.css('--play'), grid=SIM.css('--grid'), bad=SIM.css('--bad');
  let pk=0; for (let i=0;i<N;i+=7) pk=Math.max(pk,Math.abs(s.xL[i])); const g = pk>0? 0.95/pk : 1;
  levels.forEach(([nm,span],i)=>{
    const y=8+i*44, t0=Math.max(0,Math.min(1-span,t-span/2));
    c.fillStyle=ink; c.font='12px sans-serif'; c.fillText(nm+' ('+SIM.fmtDur(span)+')',6,y+14); c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText('input L, scaled',6,y+28);
    const x0=170, pw=w-x0-10; c.strokeStyle=grid; c.strokeRect(x0,y+2,pw,30);
    c.strokeStyle=acc; c.beginPath(); const NN=Math.min(900,pw);
    for (let q=0;q<=NN;q++){ const tt=t0+span*q/NN; const v=s.xL[idx(tt)]*g; const yy=y+17-v*13; q?c.lineTo(x0+pw*q/NN,yy):c.moveTo(x0,yy); } c.stroke();
    c.strokeStyle=bad; c.beginPath(); for (let q=0;q<=NN;q++){ const tt=t0+span*q/NN; const kk=frameAt(tt); let v=-60; if (kk>=0){ let f=s.frames[kk]; if (f.side!==0 && kk>0) f=s.frames[kk-1]; const tp=vuTop(f.vu[0]); if (tp!==null) v=LBL[tp]; } const yy=y+31-(v+60)/84*28; q?c.lineTo(x0+pw*q/NN,yy):c.moveTo(x0,yy); } c.stroke();
    const px=x0+(t-t0)/span*pw; c.strokeStyle=play; c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+34); c.stroke();
    if (i<levels.length-1){ const ns=levels[i+1][1]; const a=x0+(Math.max(0,Math.min(1-ns,t-ns/2))-t0)/span*pw; c.fillStyle=play; c.globalAlpha=.15; c.fillRect(a,y+2,Math.max(2,ns/span*pw),30); c.globalAlpha=1; }
  });
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  in:{x:20,y:30,w:160,h:80,t:'INPUT L / R',s:['Phoenix 3-way (+ − G)','balanced, +4 dBu nominal'],d:'Two green Phoenix plugs in cut-outs B of POD3A-REAR ISS 1 (0.332 × 0.528 in at 5.347 / 5.822 in). The 2004 functional diagram draws XLRs and says "INPUTS +4dBm NOMINAL". The input stage is not archived; a balanced receiver is inferred.'},
  adc:{x:220,y:30,w:170,h:80,t:'Stereo ADC',s:['24-bit I²S, MCLK = 256·fs','reset on FLG11'],d:'"ANALOG TO DIGITAL CONVERTER" in POD3A - Functional Diagram.cdr. Its MCLK comes from the SHARC TIMER0 (TPERIOD0 = 4, PWMOUT0); start: sets FLG11 to "take adc out of reset". The part number is not in the archive (inferred 24-bit from the "float r0 by −31" scaling).'},
  dsp:{x:430,y:20,w:200,h:120,t:'ADSP-21065L SHARC',s:['sport0_isr every sample','VUMeterCalc · PhaseMeterCalc','mux_ctl · shift_led_data','main: VUMeterGet / PhaseMeterGet'],d:'"SLM-1 Analog — ADSP-21065L MAIN — DSB Oct 13, 2003". All the work happens in the SPORT0 receive interrupt; the background loop only converts the averages to 0-255 table indexes. VisualDSP++ 3.5 project SLM-1.dpj (v101 saved as H:\\POD\\POD3\\sharc\\v101).'},
  rom:{x:430,y:180,w:200,h:60,t:'Boot EPROM',s:['ANALOG1: 512 KB image, 26 KB used'],d:'sharc/v100/ANALOG1 is an Intel-HEX image (dated 23 Mar 2004) for a 4-Mbit 8-bit EPROM: the 21065L boots 256 instructions via BMS, then its loader pulls in the rest. The image holds the 52 kHz constants of vumeter.asm / slm-1-main.asm.'},
  dip:{x:220,y:180,w:170,h:80,t:'Rear DIP (4)',s:['BS1 BS0 CAL1 CAL0','→ FLAG0-3 → ASTAT 19-22'],d:'Read every sample from ASTAT (astat_save). CAL1/CAL0 → read_dipswitch → meter_cal = 8·v − 14 (0 / +4 / +8 / +12 dBu). BS0 → PPM decay; BS1 → peak hold.'},
  drv:{x:670,y:20,w:180,h:120,t:'3 × MM5450',s:['FLG4 DATA1: bar −5…+20','FLG5 DATA2: bar −52…−6','FLG6 DATA3: phase + PR','FLG7 CLOCK (shared)'],d:'"bit 0 is always 1 for start bit in mm5450 serial protocol". 36 clocks per frame, one clock edge per sample. The same three drivers serve both bars.'},
  mux:{x:670,y:180,w:180,h:60,t:'L / R select',s:['FLG8: 0 = left, 1 = right'],d:'Set at the end of each shift (sel_left: bit clr FLG8). The switching transistors are not archived (inferred).'},
  leds:{x:890,y:20,w:180,h:220,t:'Front LEDs',s:['L bar 57 LEDs','R bar 57 LEDs','PHASE 9 LEDs','PR (L, R)','behind bronze plexiglass'],d:'Scale −52…−20 in 2 dB steps, −19…+20 in 1 dB steps (57 printed numbers). Colours from the photo: yellow-green to −7, amber −6…+8, red +9…+20. The panel is 0.125 in bronze plexiglass (POD3A-FRONT ISS 1).'},
  psu:{x:20,y:180,w:160,h:60,t:'Mains 90–230 VAC',s:['IEC inlet, ½ A slow-blow'],d:'Rear silk: "90-230 VAC, 50-60 Hz, ½ A.S.B." The supply is not archived (the old POD3 used a TE70063 transformer with LM317/LM337).'},
};
const WIRES = [['in','adc','L / R'],['adc','dsp','SPORT0 I²S'],['dsp','adc','MCLK, reset'],['rom','dsp','boot'],['dip','dsp','FLAG0-3'],['dsp','drv','FLG4-7'],['dsp','mux','FLG8'],['drv','leds','segments'],['mux','leds','commons'],['psu','adc','']];
function viewBlock(m){
  window.__pod3aActive = false;
  let sel='dsp';
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div>`)}${card('The predecessor: POD3 (pod3iss3, 2003|36)', `<div id="old"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${card('Signal flow in one sentence', `<p>The <b>ADC</b> hands the SHARC one stereo sample every ${SIM.fmtDur(1/FS)}. In the interrupt the <b>SHARC</b> squares it into running VU and PPM averages, and every 300 samples it looks the results up in bit-pattern tables and clocks one bar's pattern into the three <b>MM5450</b> drivers. It then switches <b>FLG8</b> so that pattern lights the left or the right bar.</p>`)}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 1090 270" style="width:100%"><defs><marker id="p3ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      if (a==='dsp'&&b==='adc'){ y1+=22; y2+=22; } if (a==='adc'&&b==='dsp'){ y1-=12; y2-=12; }
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#p3ar)"/>`;
      if (l) s+=`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
        <text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+10}" y="${b.y+37+i*15}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
  };
  const box=(x,y,w,t,s)=>`<rect x="${x}" y="${y}" width="${w}" height="46" rx="6" fill="var(--panel2)" stroke="var(--line)"/><text x="${x+8}" y="${y+18}" font-size="12" font-weight="700" fill="var(--ink)">${t}</text><text x="${x+8}" y="${y+34}" font-size="10" fill="var(--ink2)">${s}</text>`;
  const arr=(x1,x2,y)=>`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="var(--ink2)" marker-end="url(#p3ar2)"/>`;
  m.querySelector('#old').innerHTML = `<svg viewBox="0 0 900 90" style="width:100%"><defs><marker id="p3ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
    ${box(0,20,130,'XLR1 / XLR2','balanced bridging')}${arr(130,150,43)}${box(150,20,140,'U1 / U3 OP275','input amps')}${arr(290,310,43)}${box(310,20,160,'OPA2064 ×4','VU and PPM detectors')}${arr(470,490,43)}${box(490,20,150,'U15 PHA-2UEE','rear VU/PPM button')}${arr(640,660,43)}${box(660,20,230,'LM3915 ×4 + LM3916 ×2','25 LEDs per bar, −36…+25 dBu')}</svg>
    <p class="small muted">Redrawn from PCB/pod3iss3.bom and .net (nets LEFT-HIGH, LEFT-LOW, VU_R, PPM_R). This is the product the 2002 manual (pod3.pdf) describes. The POD3A replaced all of it with the ADC + SHARC chain above, keeping the half-rack case and the "extended range" idea.</p>`;
  draw();
}

/* ---------------- schematics (redrawn) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
const SHEETS = [
  { name:'1 · SHARC and its flags', note:'ADSP-21065L pin use copied from the comments and code of slm-1_INIT.ASM and slm-1-main.asm. Pin numbers are not in the archive, so pins are named by function.', svg:()=>
    chip(330,50,200,'ADSP-21065L',[['FLAG0','BS1'],['FLAG1','BS0'],['FLAG2','CAL1 (-20/-18)'],['FLAG3','CAL0'],['DR0A','ADC SDATA'],['RCLK0 / RFS0','ADC BCLK / LRCK'],['BMS / ADDR / DATA','EPROM (ANALOG1)'],['CLKIN','crystal (not archived)']],
      [['FLAG4','DATA1 → MM5450 #1'],['FLAG5','DATA2 → MM5450 #2'],['FLAG6','DATA3 → MM5450 #3'],['FLAG7','CLOCK (all three)'],['FLAG8','L/R select'],['FLAG9','ISR marker (test)'],['FLAG10','"clock enable" (unused)'],['FLAG11','ADC reset'],['TIMER0 (PWMOUT0)','ADC MCLK']],'"SLM-1 Analog", VisualDSP++ 3.5')
    + `<text x="40" y="385" font-size="11" fill="var(--ink2)">SPORT0: SRCTL0 = 0x013c0df1 (I²S, 32-bit slots, DMA), RDIV0 = 0x001f000f.</text><text x="40" y="402" font-size="11" fill="var(--ink2)">Interrupts: only SPR0I unmasked (spr0_svc → jump sport0_isr). The reset vector runs Init_dsp, then start.</text>` },
  { name:'2 · LED drivers and multiplex', note:'From the shift_led_data comments ("flag 4,5,6,7 = data1,2,3,clock", "bit 0 is always 1 for start bit") and the bit layout of the slm1_*_data tables. Segment-to-output wiring is deduced from the tables; driver reference designators and the L/R switch are inferred.', svg:()=>{
    let s = chip(120,40,150,'MM5450 #1',[['DATA','FLAG4'],['CLOCK','FLAG7']],[['OUT1…6','−5 … 0'],['OUT7…26','+1 … +20'],['OUT17','(+11 = over LED)'],['OUT27…34','n.c.']],'DATA1 (shift1 / shift5)')
      + chip(120,200,150,'MM5450 #2',[['DATA','FLAG5'],['CLOCK','FLAG7']],[['OUT1…3','−58…−54 (not on panel)'],['OUT4…20','−52 … −20 (2 dB)'],['OUT21…34','−19 … −6'],['bit 35','(dropped)']],'DATA2 (shift2+shift4 / shift6+shift8)')
      + chip(560,40,150,'MM5450 #3',[['DATA','FLAG6'],['CLOCK','FLAG7']],[['OUT1…9','PHASE +1 … −1'],['OUT16','PR (right)'],['OUT17','PR (left)']],'DATA3 (shift3 / shift7)');
    s += `<rect x="560" y="230" width="220" height="70" fill="none" stroke="var(--ink)"/><text x="670" y="256" text-anchor="middle" font-size="12" fill="var(--ink)">L / R common switch (${'inferred'})</text><text x="670" y="276" text-anchor="middle" font-size="11" fill="var(--accent2)">FLAG8: 0 = left bar, 1 = right bar</text>
      <text x="560" y="330" font-size="11" fill="var(--ink2)">Both bars share drivers #1 and #2; mux_ctl swaps sides every 300 samples.</text>`;
    return s; } },
  { name:'3 · Input and ADC', note:'Only the functional diagram (2004) and the firmware describe this stage: "INPUTS + 4dBm NOMINAL", "ANALOG TO DIGITAL CONVERTER", TIMER0 MCLK, FLG11 reset, 24-bit I²S words. The receiver circuit and ADC part are inferred.', svg:()=>{
    let s=''; [0,1].forEach(ch=>{ const y=80+ch*150;
      s+=`<text x="40" y="${y-20}" font-size="12" font-weight="700" fill="var(--ink)">INPUT ${ch?'R':'L'} (Phoenix)</text>${['+','−','G'].map((p,i)=>`<circle cx="60" cy="${y+i*22}" r="6" fill="none" stroke="var(--ink)"/><text x="40" y="${y+4+i*22}" font-size="11" fill="var(--ink)">${p}</text>`).join('')}
        <line x1="66" y1="${y}" x2="180" y2="${y}" stroke="var(--ink)"/><line x1="66" y1="${y+22}" x2="180" y2="${y+22}" stroke="var(--ink)"/><polygon points="180,${y-18} 180,${y+40} 240,${y+11}" fill="none" stroke="var(--ink)"/><text x="186" y="${y+60}" font-size="10" fill="var(--ink2)">balanced receiver (inferred)</text><line x1="240" y1="${y+11}" x2="380" y2="${y+11}" stroke="var(--ink)"/><text x="300" y="${y+5}" font-size="10" fill="var(--accent2)">AIN${ch?'R':'L'}</text>`; });
    s += chip(380,70,160,'Stereo ADC',[['AINL',''],['AINR',''],['MCLK','TIMER0 (CCLK/4)'],['RST','FLAG11']],[['SDATA','DR0A'],['BCLK','RCLK0'],['LRCK','RFS0']],'24-bit, 256·fs (part inferred)');
    return s + `<text x="380" y="330" font-size="11" fill="var(--ink2)">0 dBFS ≈ +24 dBu (inferred from "meter_cal=-6 //-6=-20dBFS" at the +4 dBu setting).</text>`; } },
  { name:'4 · Rear DIP and polarity', note:'Legend from the rear silk and POD3AMANUAL.cdr; decode from read_dipswitch / update_meter_parameters / sport0_isr. ON = contact to ground = flag 0 is inferred (pull-ups); it is the only reading that makes both legend tables match the code.', svg:()=>{
    const rows=[['SW1 BS1','FLAG0','ASTAT 19','ON: hold forced 255 (OFF) · OFF: ppm_hold_l/r (ON)'],['SW2 BS0','FLAG1','ASTAT 20','ON: peak_decay_1_52 SLOW · OFF: peak_decay_2_52 FAST'],['SW3 CAL1','FLAG2','ASTAT 21','v bit 0'],['SW4 CAL0','FLAG3','ASTAT 22','v bit 1 → meter_cal = 8·v − 14']];
    let s=''; rows.forEach((r,i)=>{ const y=60+i*60; s+=`<line x1="60" y1="${y}" x2="100" y2="${y}" stroke="var(--ink)"/><line x1="100" y1="${y}" x2="130" y2="${y-12}" stroke="var(--ink)"/><line x1="134" y1="${y}" x2="190" y2="${y}" stroke="var(--ink)"/><text x="40" y="${y+4}" font-size="11" fill="var(--ink)" text-anchor="end">⏚</text><text x="104" y="${y-18}" font-size="11" fill="var(--ink)">${r[0]}</text><rect x="190" y="${y-6}" width="30" height="12" fill="none" stroke="var(--ink)"/><text x="190" y="${y-10}" font-size="9" fill="var(--ink2)">pull-up (inf.)</text><line x1="220" y1="${y}" x2="300" y2="${y}" stroke="var(--ink)"/><text x="306" y="${y+4}" font-size="11" fill="var(--accent2)">${r[1]} → ${r[2]}</text><text x="470" y="${y+4}" font-size="11" fill="var(--ink)">${r[3]}</text>`; });
    return s + `<text x="40" y="320" font-size="11" fill="var(--ink2)">v = CAL1 + 2·CAL0 (flag levels): 0 → 0 dBu, 1 → +4 dBu, 2 → +8 dBu, 3 → +12 dBu (meter_cal −14 / −6 / +2 / +10 half-dB).</text>
      <text x="40" y="340" font-size="11" fill="var(--ink2)">Live: CAL ${calDbu()>0?'+':''}${calDbu()} dBu · hold ${holdOn()?'ON':'OFF'} · decay ${decayK()===C.DEC_SLOW?'SLOW':'FAST'}.</text>`; } },
  { name:'5 · Predecessor POD3 (iss3, 2003|36)', note:'Redrawn from PCB/pod3iss3.net and pod3iss3.bom (P-CAD 2002, May 2003). This board is the analog POD3 of the 2002 manual, not the POD3A. Only named nets are shown.', svg:()=>
    chip(60,60,120,'XLR1 / XLR2',[],[['2/3','R3 / R11 · R15 / R23'],['1','GNDA']],'XLR3F inputs')
    + chip(330,60,140,'U1, U3 OP275',[['in','from XLR'],['RV1/RV2','gain trim']],[['out','to detectors']],'input amplifiers')
    + chip(330,200,140,'U2,U4,U12,U14',[['OPA2064','rectifiers']],[['PPM_R / U4-7','PPM detector'],['VU_R / U14-7','VU detector']],'VU / PPM detectors')
    + chip(620,60,150,'U15 PHA-2UEE',[['1','PPM_R'],['5','VU_R'],['6','U12-7']],[['3','RIGHT-HIGH'],['4','LEFT-HIGH']],'rear VU/PPM push button')
    + chip(620,230,150,'U6-U11',[['5','LEFT/RIGHT-HIGH/LOW'],['7/8','ref adj. (R40-R47)']],[['1,10-18','H1-H4 LED headers']],'LM3915 ×4, LM3916 ×2')
    + `<text x="40" y="390" font-size="11" fill="var(--ink2)">Power: T1 TE70063, D5-D8 1N4004, REG1 LM317 / REG2 LM337 (±V), PWRLED green.</text><text x="40" y="406" font-size="11" fill="var(--ink2)">Trims VU_LEFT/VU_RIGHT 500R, PPM_LEFT/PPM_RIGHT 20K.</text>` },
];
function viewSchem(m){
  window.__pod3aActive = false;
  let i=0;
  m.innerHTML = card('Schematic set (redrawn from source and netlist names — not the original CAD)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">No POD3A schematic is archived: <span class="mono">PCB/pod3iss3.sch</span> is the older analog POD3. Sheets 1–4 are rebuilt from the firmware's flag, timer and SPORT settings and from the functional diagram, so treat pin-level details as ${inf}. Blue labels are nets or signals.</p>`);
  const draw=()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 900 440" style="width:100%;min-width:660px;background:var(--lane);border:1px solid var(--line);border-radius:8px">
      <rect x="6" y="6" width="888" height="428" fill="none" stroke="var(--line)"/><text x="884" y="428" text-anchor="end" font-size="10" fill="var(--ink2)">POD3A · sheet ${i+1}/${SHEETS.length} · redrawn ${Y(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent = SHEETS[i].note;
  };
  draw();
}

/* ---------------- software ---------------- */
const ISR = [
  ['sport0_isr entry', 'bit set mode1 SRRFL…; r10 = emuclk → emuclk_prev[]; astat_save = astat', 12],
  ['FLG9 high · float inputs', 'f0 = float dma_in_a[0..1] by −31 → audio_in_float[]', 10],
  ['_VUMeterCalc', 'VU += (in²−VU)·Tvu ; PPM = max(attack, decay path) — 2 channels', 40],
  ['_PhaseMeterCalc · FLG9 low', 'sumAVE, diffAVE ← 0.999·old + 0.001·|L±R|', 26],
  ['mux_counter−− → mux_ctl', 'every 300th: toggle BIT31, set BIT30, translate_meter_results (107-clock flush + table ORs)', 14],
  ['ppm / pk counters', 'ppm_counter_left/right, pk_counter_left_1/right_1 count down; LED off at 0', 16],
  ['test_peaks_left_1 / right_1', '|in| > 0.707 → pk_led = bit 17, pk_counter = 200000', 14],
  ['shift_led_data (if BIT30)', 'toggle FLG7; on low phase put bit[bit_test_counter] on FLG4/5/6', 30],
  ['BS1 → ppm_hold_l / ppm_hold_r', 'hold the highest PPM index for 200000 samples, or force 255', 24],
  ['update_meter_parameters', 'BS0 → peak_decay_1_52 / peak_decay_2_52 into vumeter_wspace[2]', 10],
  ['read_dipswitch · rti', 'meter_cal = 8·((astat & cal_mask) >> 21) − 14', 14],
];
const ISR_T = ISR.reduce((a,s)=>a+s[2],0);
function viewSoft(m){
  window.__pod3aActive = true;
  m.innerHTML = `<div class="grid2">
    ${card('sport0_isr, one sample — the box lit up is running at the playhead', `<div id="flow"></div>`)}
    <div>${card('Display state machine (mux_ctl / shift_led_data)', `<div id="fsm"></div>`)}${card('Background loop (main)', `<div id="main"></div>`)}</div></div>
  <div class="grid2">${card('How the switches did things — lever → code → LEDs', `<div id="btn"></div>`)}${card('dB → table index → LED, live', `<div id="tab"></div>`)}</div>
  ${card('MM5450 frame map (current frame, both bars)', `<div id="map" class="scroll"></div>`)}`;
  const draw=()=>{
    const t=SIM.t, s=sim(), n=idx(t), frac=(t*FS)%1, cyc=frac*1024, k=lastMux(t), F=k>=0?s.frames[k]:null, isMux = F && F.n===n;
    const tot = ISR_T*(isMux?1:1) + (isMux? C.FLUSH*4+120 : 0);
    let acc=0, cur=-1; if (D.power && n>=s.bootN) for (let j=0;j<ISR.length;j++){ const d = ISR[j][2] + (j===4&&isMux? C.FLUSH*4+120:0); if (cyc>=acc && cyc<acc+d*2.2) { cur=j; } acc+=d*2.2; }
    let sv=`<svg viewBox="0 0 540 ${ISR.length*40+70}" style="width:100%"><defs><marker id="p3a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <text x="10" y="18" font-size="11" fill="var(--ink)">Sample ${n.toLocaleString()} · ${cyc.toFixed(0)} of 1024 cycles${isMux?' · <tspan fill="var(--warn)">mux sample (translate runs)</tspan>':''}</text>`;
    ISR.forEach((p,j)=>{ const y=30+j*40, on=cur===j; sv+=`<rect x="20" y="${y}" width="500" height="32" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="30" y="${y+14}" font-size="11.5" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${p[0]}</text><text x="30" y="${y+27}" font-size="10" fill="${on?'#eef':'var(--ink2)'}">${p[1]}</text>${j<ISR.length-1?`<line x1="270" y1="${y+32}" x2="270" y2="${y+40}" stroke="var(--ink2)" marker-end="url(#p3a2)"/>`:''}`; });
    const yb=30+ISR.length*40; sv+=`<text x="20" y="${yb+16}" font-size="10.5" fill="var(--ink2)">${cur<0?(D.power?'Between interrupts: the background loop (VUMeterGet / PhaseMeterGet) runs.':'Powered off.'):'Inside the interrupt.'} Cycle budget per step is inferred (about ${Math.round(ISR_T*2.2)} of 1024 cycles; ~${C.FLUSH*4+120} more on a mux sample).</text></svg>`;
    m.querySelector('#flow').innerHTML=sv;
    const st = !F? 'idle' : (n-F.n < C.SHIFT ? 'shift' : 'show');
    const node=(x,y,l,on,sub)=>`<g><rect x="${x-70}" y="${y-26}" width="140" height="52" rx="10" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="${x}" y="${y-4}" text-anchor="middle" font-size="12" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${l}</text><text x="${x}" y="${y+13}" text-anchor="middle" font-size="10" fill="${on?'#fff':'var(--ink2)'}">${sub}</text></g>`;
    m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 480 170" style="width:100%">${node(85,70,'SHOW',st==='show','BIT30=0 · FLG8 = '+(F?F.side:'–'))}${node(240,70,'mux_ctl',isMux,'toggle BIT31, flush, translate')}${node(395,70,'SHIFT',st==='shift','36 clocks / 72 samples')}
      <path d="M155 64 H168" stroke="var(--ink2)" marker-end="url(#p3a2)"/><path d="M310 64 H323" stroke="var(--ink2)" marker-end="url(#p3a2)"/><path d="M395 98 Q240 160 85 98" fill="none" stroke="var(--ink2)" marker-end="url(#p3a2)"/>
      <text x="155" y="54" font-size="10" fill="var(--ink2)">counter=0</text><text x="240" y="150" font-size="10" text-anchor="middle" fill="var(--ink2)">clock_counter = 36 → BIT30 clr, FLG8 = side</text>
      <text x="10" y="16" font-size="11" fill="var(--ink)">${F? `Frame ${k}: ${F.side?'RIGHT':'LEFT'} · mux_counter ${C.MUX-(n-F.n)}` : 'no frame yet'}</text><defs><marker id="p3a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs></svg>`;
    m.querySelector('#main').innerHTML = `<table class="kv"><tr><th>main_vuloop</th><td class="mono small">for r5 = 0,1: vu_results[r5] = clamp(VUMeterGet(VU) + meter_cal, 0, 255); pk_results[r5] = clamp(VUMeterGet(PPMPEAK) + meter_cal)</td></tr>
      <tr><th>VUMeterGet</th><td class="mono small">MathLn(val) · 4.342944819 → dB; parm = min(−2·dB, 255); fix → 0 = 0 dBFS power, 255 = silence</td></tr>
      <tr><th>PhaseMeterGet (ch 0)</th><td class="mono small">y = (sumAVE−diffAVE)/(sumAVE+diffAVE), or 0 if the sum &lt; 1e-4 → trunc(128·y + 128)</td></tr>
      <tr><th>Now</th><td class="mono small">L ${clampR(rawR(s.vu[0][n])+s.cal)} / ${clampR(rawR(s.pp[0][n])+s.cal)} · R ${clampR(rawR(s.vu[1][n])+s.cal)} / ${clampR(rawR(s.pp[1][n])+s.cal)} · phase ${s.ph[n]}</td></tr></table>`;
    m.querySelector('#btn').innerHTML = `<table class="kv"><tr><th>Operator does</th><th>Firmware path</th><th>What changes on the LEDs</th></tr>
      <tr><td>CAL1 / CAL0</td><td class="mono small">FLAG2/3 → ASTAT 21/22 → read_dipswitch → meter_cal</td><td class="small">Every table index moves 8 steps (4 dB): the whole scale slides</td></tr>
      <tr><td>BS0</td><td class="mono small">FLAG1 → update_meter_parameters → vumeter_wspace[VUMETER_WS_PPM_DECAY]</td><td class="small">PPM dot falls 16 dB/s (OFF) or 8 dB/s (ON)</td></tr>
      <tr><td>BS1</td><td class="mono small">FLAG0 → ppm_hold_l/r, or ppm_hold_left/right = 255</td><td class="small">Held dot on DATA1 for 200 000 samples</td></tr>
      <tr><td>Signal &gt; −3 dBFS</td><td class="mono small">test_peaks_* → pk_led_*_1 = bit 17</td><td class="small">The +11 LED lights for 3.85 s</td></tr>
      <tr><td>Nothing (every 300 samples)</td><td class="mono small">mux_ctl → translate_meter_results → shift_led_data</td><td class="small">One bar re-drawn; FLG8 swaps sides</td></tr></table>
      <p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none yet — use the Simulator or Tutorial tab'}</b></p>`;
    const cal=s.cal, rv=clampR(rawR(s.vu[0][n])+cal), rp=clampR(rawR(s.pp[0][n])+cal);
    const rowsT = []; for (let i=56;i>=0;i-=1){ const Tv = i>=31 ? 53-2*(i-30) : (i+4>=21 ? 121-2*(i+4) : 163-4*(i+4)); let pkR=''; const kk = i>=31? i-30 : i+4; if (i>=31) pkR=`${45-2*kk}–${46-2*kk}`; else if (kk>=17) pkR=`${113-2*kk}–${114-2*kk}`; else if (kk>=2) pkR=`${145-4*kk}–${148-4*kk}`; rowsT.push([LBL[i], i>=31?'DATA1 '+kk:'DATA2 '+kk, '≤ '+Tv, pkR, rv<=Tv, (()=>{ const [a,b]=pkR.split('–').map(Number); return pkR&&rp>=a&&rp<=b; })()]); }
    m.querySelector('#tab').innerHTML = `<p class="small">Left channel now: vu_results <b class="mono">${rv}</b>, pk_results <b class="mono">${rp}</b> (meter_cal ${cal}). A segment is lit while vu_results ≤ its threshold; the PPM dot sits on the segment whose range contains pk_results.</p>
      <div style="max-height:300px;overflow:auto"><table class="kv"><tr><th>Scale</th><th>Driver bit</th><th>VU lit if r</th><th>PPM dot r</th></tr>${rowsT.map(r=>`<tr class="${r[4]||r[5]?'hl':''}"><td class="mono">${r[0]>0?'+':''}${r[0]}</td><td class="mono small">${r[1]}</td><td class="mono small">${r[2]}${r[4]?' ●':''}</td><td class="mono small">${r[3]||'—'}${r[5]?' ◆':''}</td></tr>`).join('')}</table></div>`;
    const d = display(t); let mp='';
    [0,1].forEach(ch=>{ const b=d.bars[ch]; mp += `<div class="small" style="margin:4px 0"><b>${ch?'Right':'Left'}</b> ${b?`(frame at sample ${b.f.n.toLocaleString()})`:'(not shown)'}</div>`;
      if (b){ ['d1','d2','d3'].forEach((kk,q)=>{ mp+=`<div class="mono small" style="white-space:nowrap">DATA${q+1} ${Array.from(b.w[kk]).map((v,j)=>`<span title="bit ${j}" style="display:inline-block;width:13px;text-align:center;border-radius:3px;${v?'background:var(--accent);color:#fff':'color:var(--ink2)'}">${j===0?'S':v}</span>`).join('')}</div>`; }); } });
    m.querySelector('#map').innerHTML = mp + `<p class="small muted">S = start bit. DATA1 bits 1–26 = −5…+20; DATA2 bits 4–34 = −52…−6 (bits 1–3 and 35 are never wired to panel LEDs); DATA3 bits 1–9 = phase, 16/17 = PR.</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__pod3aActive = false;
  m.innerHTML = card('What POD3A is up to — findings from the source', `
  <ol>
    <li><b>The SHARC code in this folder is POD3A's own firmware.</b> The POD3A of the 2004 drawings, the 2012 photos and the 2014 silk is a DSP meter, not the LM3915 board of the 2002 manual. The evidence:
      <ul class="small">
        <li>The header of <span class="mono">slm-1-main.asm</span> reads "SLM-1 <b>Analog</b>". The init code clocks an ADC from TIMER0 and takes it out of reset on FLG11.</li>
        <li><span class="mono">read_dipswitch</span> gives <span class="mono">meter_cal = 8·v − 14</span>: four 4-dB steps. That is exactly POD3A's rear legend (0 / +4 / +8 / +12 dBu with the same CAL1/CAL0 pattern). POD11A's legend steps by 2 dB (−20…−14 dBFS), which this code cannot produce.</li>
        <li>BS1 "PEAK HOLD" and BS0 "PPM DECAY SLOW/FAST" match <span class="mono">ppm_hold_l/r</span> and <span class="mono">update_meter_parameters</span>, with the same ON/OFF sense.</li>
        <li>The v101 project file was saved as <span class="mono">H:\\POD\\POD3\\sharc\\v101\\SLM-1.dpj</span> (20 Aug 2007|40).</li>
        <li><span class="mono">sharc/v100/ANALOG1</span> is a burned EPROM image: Intel HEX, 512 KB, about 26 KB used, dated 23 Mar 2004|37. That is the same week as the panel drawings (POD3A-FRONT 24/03/04, POD3A-REAR 29/03/04). The image contains the exact 52 kHz floats of <span class="mono">TCONST_VU</span>, <span class="mono">TCONST_PPM_ATTACK</span> and both <span class="mono">peak_decay_*_52</span> values. So a binary <i>is</i> archived, although the Engineering README says none is.</li>
        <li><span class="mono">POD3A - Functional Diagram.cdr</span> (Jun 2004) draws inputs → ADC → DSP → stereo LED meter assembly, with four set-up switches.</li></ul></li>
    <li><b>How it relates to POD3 and POD11A.</b> The old <b>POD3</b> (2002 manual; <span class="mono">pod3iss3</span> P-CAD board, May 2003) is purely analog: OP275/OPA2064 detectors, a rear PHA-2UEE VU/PPM button, and LM3915/LM3916 drivers for 25 LEDs from −36 to +25 dBu. The POD3A kept the name and the half-rack case and replaced everything else. <b>POD11A</b> (2014 silk) is the AES-input sister: the same front, plus LOCK/ERROR, and a CAL table in dBFS. The code still carries traces of that digital branch: <span class="mono">emuclk_prev</span> "to calculate sample rate", cycle counts for 32/44.1/48/96 kHz, <span class="mono">cs8427_ctl_dat.dat</span>, the unused <span class="mono">com/sr441/sr48/sr96</span> LED bits, and a commented-out <span class="mono">lock_status</span>. So POD11A ran a variant of this code, and that variant is not archived. The pod11a plugin borrows this analog build as a stand-in. POD33's SHARC project <span class="mono">slm1-1.dpj</span> was cloned from the same SLM-1 tree.</li>
    <li><b>It runs at 52 kHz, not 48 kHz.</b> <span class="mono">TCONST_VU</span> and <span class="mono">TCONST_PPM_ATTACK</span> in vumeter.asm equal the <span class="mono">VU_48</span> and <span class="mono">PPM_ATTACK_48</span> values scaled by exactly 48/52, and the decay pair in use is <span class="mono">peak_decay_1_52/2_52</span>. Meanwhile <span class="mono">sysdef.h</span> still says 48000 Hz and 60 MHz, and the mux comment says "300=80Hz mux rate at 48K". The SPORT dividers give fs = CCLK/1024 and TIMER0 gives MCLK = 256·fs, so the board clock is probably about 53.25 MHz (${inf}).</li>
    <li><b>The PPM dot can't go above +17.</b> <span class="mono">main</span> clamps <span class="mono">pk_results</span> at 0 before adding 6. Table rows 0–5 of <span class="mono">slm1_pk_data1.dat</span> (pk20, pk19, pk18) can therefore never be read. The VU bar reaches +20, but the dot stops at +17. Try +22 dBu at CAL 0 dBu.</li>
    <li><b>Below −20 the PPM dot reads low, and below about −48 it vanishes.</b> <span class="mono">slm1_pk_data2.dat</span> keeps 1-dB steps for three more driver bits than <span class="mono">slm1_vu_data2.dat</span> does. From −22 down, the dot lands 2–5 dB below the bar top, and its last positions are DATA2 bits 2–3, which the tables call −56/−54 and which have no LED on the panel. Both tables were built for a 60-dB scale: their comments run to "−60", like the older <span class="mono">sdm_*</span> tables.</li>
    <li><b>Peak hold only covers the top 26 LEDs.</b> <span class="mono">translate_meter_results</span> ORs the held index (via <span class="mono">pk_data_1</span> and the "−1 mask") into DATA1 only, so a hold below −4 is never shown.</li>
    <li><b>The right channel can wipe the left channel's hold.</b> After <span class="mono">call ppm_hold_l; call ppm_hold_r</span>, the test <span class="mono">bs1_is_off0: if ne jump bs1_is_off1</span> uses the ALU flags that <span class="mono">ppm_hold_r</span> left. Two cases leave "eq": the right peak index equals its held value (any steady tone), or the right hold timer has expired. Either one resets <i>both</i> holds to 255. With a steady tone on R, or R silent, the L hold dot is re-captured every other sample and stops holding. The Simulator counts these resets in “State at the playhead”.</li>
    <li><b>A leftover "peak" lamp lights the +11 segment.</b> <span class="mono">test_peaks_left_1</span> sets <span class="mono">pk_led_left_1_on = bit 17</span> for 200 000 samples when |in| &gt; 0.707. In this build DATA1 bit 17 is the +11 segment. A −3 dBFS sample (about +21 dBu) therefore leaves +11 lit for 3.85 s.</li>
    <li><b>The phase table is one entry short.</b> <span class="mono">phase_data[257]</span> is filled from <span class="mono">sdm_phase_data.dat</span>, which has 255 words, yet <span class="mono">PhaseMeterGet</span> returns up to 256 (its last comment says "get returns 256"). If y &gt; 0.992 (L and R matched to better than about 0.4 %), the index reads uninitialised words, and the phase column goes dark instead of showing +1 (${inf}: zero-filled). Normal analog mismatch hides it. The simulator assumes 1 %.</li>
    <li><b>Silence reads "0" on the phase meter.</b> When sumAVE + diffAVE &lt; 1e-4 (−80 dBFS), <span class="mono">PhaseMeterGet</span> returns 128. A silent or unplugged channel looks the same, because Σ = Δ.</li>
    <li><b>The comments don't match the constants.</b> "type1 (1 second)" is 24 dB in 1.5 s and "type2 (3 seconds)" is 24 dB in 3 s. The VU is a single-pole mean-square average (300 ms per 24 dB), not a rectifier VU. The "3 dB correction" lives in the 3-dB offset between the vu and pk tables, so a steady sine puts the PPM dot on the bar top.</li>
    <li><b>The manuals describe other products.</b> <span class="mono">MANUAL/pod3.pdf</span> (2002) is the analog POD3: 25 LEDs, −36…+25 dBu, XLR inputs, a rear VU/PPM push-button. <span class="mono">POD3AMANUAL.cdr</span> (Nov 2006) draws a front with LOCK, COM, 44.1K, 48K, 96K and ERROR lamps that the shipped silk does not have. They match the unused <span class="mono">com/sr441/sr48/sr96</span> bits, so the drawing shows the AES variant.</li>
    <li><b>The rear DIP labels disagree with the switch.</b> The silk prints OFF above ON, but the switch body in <span class="mono">Pics/POD3A Rear.jpg</span> has its own "ON" at the top. The legend tables and the code only agree if ON = closed = flag 0 (${inf}: pull-ups), so one of the two markings is upside down.</li>
    <li><b>Leftovers from other projects.</b> <span class="mono">slm-1_ISR_table.ASM</span> is headed "VMS44" and <span class="mono">Debug/vms44_main.asm</span> (Feb 2003) is still in the tree. The spt1 vector carries Analog Devices EZ-KIT AD1819 codec comments. FLG11 is "cs8427 reset" in Init_dsp but "take adc out of reset" in start. <span class="mono">input_cal_float</span>, <span class="mono">trim[]</span>, <span class="mono">volume[]</span>, <span class="mono">halfdb_data[]</span> and <span class="mono">point_one_db_table[]</span> are loaded and never used. "FLG9" is described as both "right select" and "clock".</li>
    <li><b>Artwork ${Y(2026)}: front/rear panels now from ${SIM.src(ART_SRC,'POD3A-FRONT&REAR-SILK (CURVE).cdr')} (Jun.19/14).</b> The same file is filed twice, byte for byte, in ${SIM.src('#POD #SERIES/POD3A - #Master/POD3A - #Engineering/SILK/POD3A-FRONT&REAR-SILK (CURVE).cdr','#Engineering/SILK')}. The sheet holds three plates: FRONT GREEN (the top bar, the WBS logo box and "Ward-Beck Systems"), FRONT WHITE (scale, ranges, PHASE, model name) and REAR WHITE. Its front plates carry no cut-out outline at all: the LED window and the phase column are not drawn, so their positions still come from the photo. The rear plate draws the DIP and Phoenix cut-outs and the IEC opening, and they line up with the existing overlays. The rear "+ - G" is printed rotated beside the R input only, so the L plug relies on the same legend. ${SIM.src('#POD #SERIES/POD3A - #Master/POD3A - #ARTWORK #DA #2016/POD3-SILK-NEW.cdr','POD3-SILK-NEW.cdr')} (21 Sep 2006|39) is the older live-text version of the same legend.</li>
    <li><b>v100 and v101 barely differ.</b> v101 only adds <span class="mono">.end</span> labels (VisualDSP++ 3.5 wants them) and two commented-out mask lines; the README says five sources differ. The MM5450 flush loop ("modified june 17, 2005") is newer than the ANALOG1 EPROM image, so the archived binary predates the archived source.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>fs = 52 kHz (the <span class="mono">_52</span> constants), CCLK = 1024·fs. ISR step cycle counts and the 10 ms boot are ${inf}.</li>
    <li>0 dBFS = +24 dBu sine; ADC noise floor −100 dBFS; R channel gain +1 % (${inf}).</li>
    <li>DIP ON = contact closed = flag 0 (pull-ups, ${inf}).</li>
    <li>The background loop's <span class="mono">VUMeterGet</span> results are taken as current at every sample. The real loop lags by a fraction of a sample.</li>
    <li>LED colours are from the photo. PR LEDs = fixed DATA3 bits 17/16. The phase column is lit top-down from bit 1. The two red board LEDs seen through the plexiglass are drawn lit whenever there is power (not traced).</li>
    <li>Program material is shaped noise, not real audio.</li></ul>`) + card('Sources', `<ul class="small mono">
    <li>#POD #SERIES/POD3A - #Master/POD3A - #Engineering/sharc/working v101/slm-1-main.asm, vumeter.asm, phasemeter.asm, slm-1_INIT.ASM, slm-1_ISR_table.ASM, SLM-1.dpj, slm1_vu_data1-3.dat, slm1_pk_data1-3.dat, sdm_phase_data.dat, sysdef.h</li>
    <li>…/sharc/v100/ANALOG1 (EPROM image), v100 sources, Debug/vms44_main.asm</li>
    <li>…/MANUAL/pod3.pdf · POD3AMANUAL.cdr · POD3A - Functional Diagram.cdr (converted with Inkscape)</li>
    <li>…/PCB/pod3iss3.bom, pod3iss3.net, pod3iss3.ECO (predecessor)</li>
    <li>${SIM.src(ART_SRC,'POD3A - #ARTWORK #DA #2016/POD3A-FRONT&REAR-SILK (CURVE).cdr')} (panel artwork) · .pdf · Pics/POD3A Front.jpg, POD3A Rear.jpg</li>
    <li>POD3A - #Mechanical #DA #2016/POD3A-FRONT ISS 1 (PANEL) .pdf, POD3A-REAR ISS 1 (PANEL).pdf</li>
    <li>../POD11A - #Master/POD11A - #ARTWORK #DA #2016 (rear CAL legend, for comparison)</li></ul>`);
}

/* ---------------- register plugin ---------------- */
SIM.register({
  footnotes:[{text:"The panel artwork POD3A-FRONT&amp;REAR-SILK (CURVE).cdr is stored twice, byte for byte: in #ARTWORK #DA #2016 and in #Engineering/SILK.", src:"#POD #SERIES/POD3A - #Master/POD3A - #Engineering/SILK/POD3A-FRONT&REAR-SILK (CURVE).cdr"},
  {text:"The front plates draw no outline for the LED window or the phase column; only the scale numbers place them, so the simulator takes the LED rows from the photo.", src:"#POD #SERIES/POD3A - #Master/POD3A - #ARTWORK #DA #2016/POD3A-FRONT&REAR-SILK (CURVE).cdr"},
  {text:"POD3-SILK-NEW.cdr (21 Sep 2006) is an older live-text version of the same POD-3A legend, eight years before the curve sheet.", src:"#POD #SERIES/POD3A - #Master/POD3A - #ARTWORK #DA #2016/POD3-SILK-NEW.cdr"},
  {text:"The rear \"+ - G\" terminal legend is printed once, rotated beside the R input; the L input has none of its own.", src:"#POD #SERIES/POD3A - #Master/POD3A - #ARTWORK #DA #2016/POD3A-FRONT&REAR-SILK (CURVE).cdr"},
  {text:"The sheet prints the DIP legend OFF above ON, while the switch body in the photo has its ON at the top.", src:"#POD #SERIES/POD3A - #Master/POD3A - #ARTWORK #DA #2016/Pics/POD3A Rear.jpg"}],
  id:'pod3a', name:'POD3A · Analog stereo loudness meter ('+Y(2004)+')', duration:1,
  product:'POD3A', year:2004, family:'POD series',
  folder:'#POD #SERIES/POD3A - #Master',
  summary:'Half-rack stereo meter: balanced analog inputs feed an ADC and an ADSP-21065L SHARC, which drives two multiplexed 57-LED bars (VU bar + PPM dot, −52…+20) and a 9-LED phase column. The "SLM-1 Analog" SHARC project in the folder, and its 2004 EPROM image, are POD3A\'s own firmware; the 2002 manual describes the older analog POD3.',
  highlights:['Real silkscreen panels; rear DIP sets CAL, peak hold and decay','Sample-by-sample model of sport0_isr at 52 kHz','L/R LED multiplex and the MM5450 serial frames, bit by bit','Hold reset bug: the right channel clears both holds','Identifies the SLM-1 code and ANALOG1 EPROM as POD3A\'s firmware'],
  depth:'Full model',
  stepUnits:[
    {label:'1 sample (19.2 µs)', period:()=>1/FS},
    {label:'1 MM5450 clock (2 samples)', period:()=>2/FS},
    {label:'1 mux frame (300 samples)', period:()=>C.MUX/FS},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[0.02,'20 ms (≈ 2 L/R cycles)'],[0.004,'4 ms (shift bursts)'],[0.0015,'1.5 ms (one shift)'],[0.0002,'200 µs (samples)']],
  defaultZoom:0,
  init(){ SK=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the POD3A', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
