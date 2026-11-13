/* =====================================================================
   VMS44 — Video / audio monitoring system (Ward-Beck Systems, 2002|35)
   Plugin for the WBS Device Simulator (../siumulation.html)

   What the VMS44 is: a 3RU-style monitoring panel with four small video
   displays and, under each one, a 28-segment stereo VU/peak LED meter with a
   5-LED phase (correlation) column and VIDEO / AES / ERROR indicators. Four
   stereo inputs, each analog or AES (chosen by DIP switch), are metered by an
   ADSP-21065L SHARC. A PIC16F874 runs the panel, the DIP switches and the
   video power; an EPM3128A CPLD glues the audio clocks and serial ports.

   Sources used (all in this archive):
   - XXX - VMS - #Engineering #OBSOLETE/vms-44/sharc/v103/vms44_main.asm
       start, main, main_vuloop, sport0_isr, sport1_isr, shift_led_data,
       mux_ctl, input_gain, synch_test, translate_meter_results,
       refresh_lock_status, update_phase_audio, every .var and table
   - .../v103/vms44_INIT.ASM (Init_dsp, flags, SPORT0/1 control words, DMA TCBs)
   - .../v103/vms44_ISR_table.ASM, vms44_LDF.LDF, vms44v100.dpj/.mak (link order)
   - .../v103/vumeter.asm/.h (VUMeterCalc/Get/Edit/Init, TCONST_*),
     phasemeter.asm/.h (PhaseMeterCalc/Get, PHMETER_ALPHA, SIGNAL_THRES), math.asm
   - .../v103/vms44_vu_data.dat, vms44_pk_data.dat, vms44_phase_data.dat,
     trim_data.dat, halfdb_data.dat, vms44_vu_data_29.dat / _pk_data_29.dat
   - .../sharc/v1.00, v1.00/i2s version, v100, v101, v102 (version history, diffed)
   - .../vms-44/readme.txt (shipment log), vms.zip → vms/vms44-1-bom.txt,
     vms44-2-bom.txt, vms44-1 centroid.txt (LED positions on the meter board)
   - .../vms-44/vms1frt.dxf (VMS1 FRONT PANEL: display windows, holes)
   - .../vms33/VMS33 Manual.wpd (DIP switches, video auto-off, specs) and
     VMS33MANU.cdr (cover drawing; rendered to assets/vms-vms33-cover.png)
   - XXX - SMS - #Engineering #OBSOLETE/SMS - #SOFTWARE #Altera/v100/vms44-1.rpt
     (the VMS44 CPLD: pin numbers, equations; filed with the SMS4 project)
   - WBS software listings (VMS44 PIC/Altera/SHARC version names)
   The PIC16F874 and Altera sources for the VMS44 are not in the archive.
   Anything not stated in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';

/* ---------------- constants from the source ---------------- */
const C = {
  FS: 48000,                 // sysdef.h SAMPLE_RATE; "mux_counter=300 //300=80Hz mux rate at 48K"
  CYC: 60e6,                 // sysdef.h CYCLE_FREQ 60 MHz
  MCLK: 12.288e6,            // CPLD 'audio-clock' = 256 fs — INFERRED from the counter: TFSO = clk/128, lrclock = TFSO/2 = fs
  MUX: 300,                  // mux_rate
  SHIFT_CLKS: 36,            // "36 clock pulses required" (MM5450: start bit + 35 data bits)
  TVU: 0.000319752,          // TCONST_VU
  TPA: 0.009548227,          // TCONST_PPM_ATTACK
  TPD: 0.000031979,          // TCONST_PPM_DECAY
  ALPHA: 0.999,              // PHMETER_ALPHA
  IN_GAIN: 1.412537,         // sport0_isr "+3dB offset"
  OUT_GAIN: 0.7079457,       // "-3dB correction"
  PH_SCALE: 0.7,             // update_phase_audio (v102+)
  // timing below is INFERRED (cycle counts estimated from the instruction listing; boot times not in the source)
  PIC_BOOT: 0.0200,          // PIC releases SHARC_RESET (pic5) — inferred
  PROM_BOOT: 0.0105,         // 8-bit PROM boot of the .ldr from AM29LV040 — inferred
  INIT_CYC: 7900,            // Init_dsp: flush loop 100 × (75+4) cycles + setup ≈ 7 900 cycles
  ISR_CYC: 300, ISR_SHIFT_CYC: 40, ISR_MUX_CYC: 230,
  MAIN_CYC: 1550,            // one pass of main: (see STEPS) — inferred
  PIC_PERIOD: 0.010, PIC_FIRST: 0.0225, PIC_XFER: 0.0017,   // SPORT1 frames from the PIC — inferred cadence
  NFLOOR: 1e-5,              // analog input noise floor ≈ −100 dBFS — inferred
};
C.T_INIT = C.PIC_BOOT + C.PROM_BOOT;                // reset vector → call Init_dsp
C.T_CLK = C.T_INIT + C.INIT_CYC / C.CYC;            // start: bit set astat FLG0 (audio clocks run)
const DEC = 24;                                     // trace decimation (0.5 ms)
const NDEC = Math.ceil(C.FS / DEC) + 1;

/* table breakpoints copied from vms44_vu_data.dat (same in vms44_pk_data.dat): index → lit segments from the −38 end */
const BP = [[0,28],[13,27],[17,26],[21,25],[23,24],[25,23],[27,22],[29,21],[31,20],[33,19],[35,18],[37,17],[39,16],[41,15],[43,14],[45,13],[47,12],[49,11],[51,10],[53,9],[55,8],[57,7],[61,6],[65,5],[73,4],[85,3],[97,2],[109,1],[121,0]];
const COUNT = new Uint8Array(262);
(function(){ for (let i=0;i<262;i++){ let c=0; for (const [a,n] of BP) if (i>=a) c=n; COUNT[i]=c; } })();
const SCALE = [-38,-32,-26,-20,-16,-12,-10,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9,10,12,14];
const RED_POS = [15,16,17,26,27,28];                 // vms44-1 centroid: RED LEDs at bar positions 15–17 and 26–28
/* halfdb_data[248..255] as IEEE-754 words: what vu_data[-1..-8] reads before v103's clamp (declaration order) */
const HALFDB_TAIL = [0x41a91441,0x41b31902,0x41bdb5bc,0x41c8f36f,0x41d4dba6,0x41e1787c,0x41eed4a3,0x41fcfb72];
const PH_OOB = 0x3c1c702b;                           // vumeter_wspace[0] = TCONST_PPM_ATTACK — what phase_data[256] reads (inferred placement)
function vuWord(idx){                                // vu_data[idx] → 32-bit word (bit 0 start bit, bits 1–28 = +14 … −38)
  if (idx < 0){ const k=Math.min(8,-idx); return HALFDB_TAIL[8-k] >>> 0; }
  const c = COUNT[Math.min(255,idx)]; let w = 1;
  for (let s=1; s<=c; s++) w |= (1 << (29-s));
  return w >>> 0;
}
function pkWord(idx){                                // pk_data[idx], idx = pk + 6 (0…261)
  if (idx < 0){ const k=Math.min(8,-idx); return HALFDB_TAIL[8-k] >>> 0; }
  const c = COUNT[Math.min(261,idx)]; return (c ? (1 | (1 << (29-c))) : 1) >>> 0;
}
function phaseBits(idx){ if (idx>=256) return PH_OOB & 0x7f; return idx<=50?0x1f: idx<=101?0x0f: idx<=153?0x07: idx<=204?0x03: 0x01; }
function trimDb(i){ return -15 + i*15/128; }         // trim_data.dat: index 0 = −15 dB, 128 = 0 dB, 255 = +14.88 dB
const VERS = ['v1.00','v100','v101','v102','v103'];
const VER_TXT = {
  'v1.00':'Jul 3 2002 · DSB · LED test only, no metering',
  'v100':'Jul 29 2002 · Allard Designs VU/peak + phase meter added',
  'v101':'Nov 19 2002 · shipped #60059–60061 · translate moved into mux_ctl, channels swapped',
  'v102':'Nov 27 2002 · shipped #60099 · idle added, phase audio × 0.7',
  'v103':'Dec 2 2002 · shipped #60173–60174 · clamp 0–255, phase threshold 1e-4 → 4e-4',
};
/* audio_in_float order (comments: "changed rights are first now!", update_phase_audio): R1 R2 L1 L2 R3 R4 L3 L4 */
const IDX = { R:[0,1,4,5], L:[2,3,6,7] };
const MODES = { tone:'Tone, L = R (identical)', quad:'Tone, R 90° behind L', anti:'Tone, R inverted (anti-phase)', lonly:'Tone on L only', ronly:'Tone on R only', uncor:'Noise, L and R uncorrelated', burst:'Tone bursts (200, 10, 50 ms)', silence:'Silence' };
const FREQS = [100, 1000, 10000];
const SIDE = ['L','R'];

/* ---------------- device state ---------------- */
function defaults(){
  return {
    ver: 'v103',
    dip: [true,true,false,false,false,true,false,false,true],   // true = switch UP. SW1–4 up = analog, down = digital (manual: "down=digital")
    pairs: [
      {mode:'tone',  lvl:-20, f:1000, ana:true,  aes:false},
      {mode:'burst', lvl:-14, f:1000, ana:true,  aes:false},
      {mode:'anti',  lvl:-20, f:1000, ana:false, aes:true},
      {mode:'uncor', lvl:-26, f:1000, ana:false, aes:true},
    ],
    video: [true,true,true,false],
    remote: false,            // DB-9 pin 1 closed to pin 6
    btn: null,                // front button override: null | 'on' | 'off'
    autoExpired: false,
    sel: 0,                   // pair shown in the detail controls / lanes
    chainSel: 0,              // MM5450 chain shown in the scope
    strobe: false,            // show the L/R multiplex as it really is at the playhead
    log: [],
  };
}
let D = defaults();
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';

/* ---------------- PIC16F874 model (source missing → whole block inferred from the manual and the SHARC/CPLD side) ---------------- */
function isDigital(k){ return !D.dip[k]; }                       // SW1..SW4 down = digital
function autoMode(){ const b0 = D.dip[6], b1 = D.dip[7]; return [0,10,60,180][(b1?2:0)+(b0?1:0)]; }
function screensOff(){
  if (D.btn) return D.btn==='off';
  return D.remote || (autoMode()>0 && D.autoExpired);
}
function videoOn(m){ return D.video[m] && !screensOff(); }
function lockBits(k){                                           // anc_data[4+k] — bit0 VIDEO, bit1 AES, bit2 ERROR (inferred LED order from the manual)
  let b = 0; if (D.video[k]) b |= 1;
  if (isDigital(k)) b |= D.pairs[k].aes ? 2 : 4;
  return b;
}
function picFrameData(){                                        // 17 ten-bit words → input_cal_fix[8], anc_data[8], spare17
  const cal = new Array(8).fill(128);
  for (let k=0;k<4;k++) if (isDigital(k) && D.dip[4]){ cal[IDX.L[k]] = 111; cal[IDX.R[k]] = 111; }   // SW5 up = −18 dBFS → −2 dB trim (inferred)
  const anc = [0,0,0,0,0,0,0,0];
  for (let m=0;m<4;m++) anc[m] = videoOn(m) ? 0x20 : 0;
  for (let k=0;k<4;k++) anc[4+k] = lockBits(k);
  return {cal, anc, spare:0};
}
const CAL0 = [0,1,0,1,0,0,0,0], ANC0 = [0,0,0,0,2,2,2,2];      // .var initial values in vms44_main.asm

/* ---------------- signal sources ---------------- */
function hash(n, s){ let x = (n*374761393 + s*668265263) | 0; x = (x ^ (x>>>13)) * 1274126177 | 0; return ((x ^ (x>>>16)) >>> 0) / 4294967296; }
function gauss(n, s){ return (hash(n,s)+hash(n,s+17)+hash(n,s+31)+hash(n,s+47)-2) * 1.2247; }   // rms ≈ 0.707
function burstGate(tt){ const p = tt % 1; return (p>=0.10&&p<0.30) || (p>=0.55&&p<0.56) || (p>=0.75&&p<0.80); }
function rawSig(k, side, n){                                     // pair k, side 0 = L, 1 = R — in FS units (±1)
  const P = D.pairs[k], tt = n / C.FS;
  const dig = isDigital(k);
  if (dig ? !P.aes : !P.ana) return dig ? 0 : C.NFLOOR*gauss(n, 90+k*2+side);
  const A = Math.pow(10, P.lvl/20), w = 2*Math.PI*P.f*tt;
  let v = 0;
  switch (P.mode){
    case 'tone': v = A*Math.sin(w); break;
    case 'quad': v = side ? -A*Math.cos(w) : A*Math.sin(w); break;
    case 'anti': v = side ? -A*Math.sin(w) : A*Math.sin(w); break;
    case 'lonly': v = side ? 0 : A*Math.sin(w); break;
    case 'ronly': v = side ? A*Math.sin(w) : 0; break;
    case 'uncor': v = A*gauss(n, 10+k*2+side); break;
    case 'burst': v = burstGate(tt) ? A*Math.sin(w) : 0; break;
    default: v = 0;
  }
  if (!dig) v += C.NFLOOR*gauss(n, 90+k*2+side);                 // ADC noise keeps analog L and R from being bit-identical
  return Math.max(-1, Math.min(1 - 1/8388608, v));
}

/* ---------------- timing of the SHARC over the simulated second ---------------- */
function isrT(k){ return C.T_CLK + k / C.FS; }                   // k-th SPORT0 receive DMA interrupt (4 words done)
function verN(){ return VERS.indexOf(D.ver); }                   // 0 = v1.00 … 4 = v103
function passLen(){ return verN()>=3 ? 2/C.FS : (C.MAIN_CYC + 1.2*C.ISR_CYC)/C.CYC; }   // v102+: idle syncs main to the ISR
function picFrames(){
  const out=[]; for (let t=C.PIC_FIRST; t<1; t+=C.PIC_PERIOD) out.push({t0:t, t1:t+C.PIC_XFER, rx: t >= C.T_CLK});
  return out;
}

/* ---------------- the model: run vms44_main.asm over one second ---------------- */
let MODEL = null, MKEY = '';
function key(){ return JSON.stringify([D.ver, D.dip, D.pairs, D.video, D.remote, D.btn, D.autoExpired]); }
function model(){
  const k_ = key(); if (k_ === MKEY && MODEL) return MODEL; MKEY = k_;
  const vn = verN(), FS = C.FS;
  const frames = picFrames(), PF = picFrameData();
  const firstRx = frames.find(f => f.rx);                          // first PIC frame the SHARC can receive
  const tCal = firstRx ? firstRx.t1 : 2;
  const nStart = 1, nEnd = Math.floor((1 - C.T_CLK) * FS);
  const vu = new Float64Array(8), ppm = new Float64Array(8), S = new Float64Array(4), Df = new Float64Array(4);
  const ph = new Float64Array(8);                                   // phase_audio (held, written by main)
  const x = new Float64Array(8);
  const vuDb = new Float32Array(NDEC*8).fill(-140), ppmDb = new Float32Array(NDEC*8).fill(-140), phY = new Float32Array(NDEC*4), lvl = new Float32Array(NDEC*8);
  const nMux = Math.floor(nEnd / C.MUX);
  const mux = { t: new Float64Array(nMux), side: new Uint8Array(nMux), main: new Uint32Array(nMux*4), anc: new Uint32Array(nMux*4),
                vu: new Int16Array(nMux*8), pk: new Int16Array(nMux*8), ph: new Int16Array(nMux*4), cal: [], ancd: [] };
  // persistent "memory" of meterN_left/right/ancl/ancr as the code keeps it
  const mem = { left:[1,1,1,1], right:[1,1,1,1], ancl:[0x20,0x20,0x20,0x20], ancr:[0x20,0x20,0x20,0x20] };
  let side = 0;                                                     // BIT31 (0 after Init_dsp) — mux_ctl toggles it first → right data first
  let ledTest = 0, testDelay = 24000, testAnc = 0;                  // v1.00 testing_leds
  const thres = vn>=4 ? 4e-4 : 1e-4, phs = vn>=3 ? C.PH_SCALE : 1;
  let j = 0;
  const getParm = (p)=>{ if (p<=0) return Infinity; return -2*10*Math.log10(p); };
  const fix = (f, clamp)=>{ let r = Math.round(Math.min(f, 255)); if (clamp) r = Math.max(0, r); return r; };
  const vuR = new Int16Array(8), pkR = new Int16Array(8), phR = new Int16Array(4);
  const gOf = cal => cal.map(v => C.IN_GAIN * Math.pow(10, trimDb(v)/20)), g0 = gOf(CAL0), gPF = gOf(PF.cal);
  for (let n = nStart; n <= nEnd; n++){
    const t = isrT(n);
    const cal = t >= tCal ? PF.cal : CAL0, gain = t >= tCal ? gPF : g0;
    // sport0_isr: float, +3 dB, calibrate
    for (let k=0;k<4;k++){ for (let s=0;s<2;s++){ const i = s? IDX.R[k] : IDX.L[k]; x[i] = rawSig(k, s, n) * gain[i]; } }
    if (vn >= 1){
      for (let i=0;i<8;i++){ const sq = x[i]*x[i]; vu[i] += (sq - vu[i])*C.TVU; const d = sq - ppm[i]; ppm[i] += Math.max(d*C.TPA, d*C.TPD); }
      // update_phase_audio runs in main → phase_audio is refreshed once per pass (every 2 samples in v102+)
      if (vn < 3 || (n & 1)) for (let k=0;k<4;k++){ ph[2*k] = x[IDX.R[k]]*phs; ph[2*k+1] = x[IDX.L[k]]*phs; }
      for (let k=0;k<4;k++){ const a = ph[2*k], b = ph[2*k+1]; S[k] = S[k]*C.ALPHA + (1-C.ALPHA)*Math.abs(a+b); Df[k] = Df[k]*C.ALPHA + (1-C.ALPHA)*Math.abs(a-b); }
    }
    if (n % DEC === 0){ const q = n/DEC; for (let i=0;i<8;i++){ vuDb[q*8+i] = vu[i]>0? 10*Math.log10(vu[i]) : -140; ppmDb[q*8+i] = ppm[i]>0? 10*Math.log10(ppm[i]) : -140; lvl[q*8+i]=x[i]; }
      for (let k=0;k<4;k++){ const den=S[k]+Df[k]; phY[q*4+k] = den>=thres ? (S[k]-Df[k])/den : 0; } }
    if (vn === 0){ testDelay--; if (testDelay === 0){ testDelay = 4000; ledTest++; if (ledTest===29) ledTest=0;
        const wv = vuWord(ledTest), wp = pkWord(ledTest);
        for (let c=0;c<4;c++){ mem.left[c]=wv; mem.right[c]=wp; }
        if (ledTest===0) testAnc = 0; else testAnc = ({0:1,1:2,2:4,4:8,8:16,16:32,32:1})[testAnc] || 1;
        for (let c=0;c<4;c++){ mem.ancl[c]=testAnc; mem.ancr[c]=testAnc; } } }
    if (n % C.MUX === 0 && j < nMux){
      // main_vuloop results (the last main pass before this ISR)
      const clamp = vn >= 4;
      for (let i=0;i<8;i++){ vuR[i] = fix(getParm(vu[i]), clamp); pkR[i] = fix(getParm(ppm[i]), clamp); }
      for (let k=0;k<4;k++){ const den=S[k]+Df[k]; let y = den>=thres ? (S[k]-Df[k])/den : 0; y = Math.max(-1, Math.min(1, y)); phR[k] = Math.trunc(y*128 + 128); }
      const anc = t >= tCal ? PF.anc : ANC0;
      if (vn >= 1){
        // refresh_lock_status (each main pass)
        mem.ancl[0] = ((mem.ancl[0] & 0xffffffd8) | anc[4] | anc[0]) >>> 0;
        mem.ancr[0] = ((mem.ancr[0] & 0xffffffd8) | anc[5] | anc[0]) >>> 0;
        mem.ancl[3] = ((mem.ancl[3] & 0xffffffd8) | anc[6] | anc[3]) >>> 0;
        mem.ancr[3] = ((mem.ancr[3] & 0xffffffd8) | anc[7] | anc[3]) >>> 0;
        // translate_meter_results (inside mux_ctl from v101; every main pass in v100 — same result at the mux instant)
        const pairsL = vn>=2 ? [0,1,4,5] : [2,3,6,7], pairsR = vn>=2 ? [2,3,6,7] : [0,1,4,5];
        for (let c=0;c<4;c++){ mem.left[c] = (vuWord(vuR[pairsL[c]]) | pkWord(pkR[pairsL[c]]+6)) >>> 0; mem.right[c] = (vuWord(vuR[pairsR[c]]) | pkWord(pkR[pairsR[c]]+6)) >>> 0; }
        const pw = k=> phaseBits(phR[k]);
        mem.ancl[1] = ((mem.ancl[1] & 0xffffffc0) | pw(0) | anc[1]) >>> 0;
        mem.ancr[1] = ((mem.ancr[1] & 0xffffffc0) | pw(1) | anc[1]) >>> 0;
        mem.ancl[2] = ((mem.ancl[2] & 0xffffffc0) | pw(2) | anc[2]) >>> 0;
        mem.ancr[2] = ((mem.ancr[2] & 0xffffffc0) | pw(3) | anc[2]) >>> 0;
      }
      side ^= 1;                                                     // bit tgl ustat1 BIT31
      mux.t[j] = t; mux.side[j] = side;                              // side 1 = right data (meterN_right, ancr)
      for (let c=0;c<4;c++){ mux.main[j*4+c] = side? mem.right[c] : mem.left[c]; mux.anc[j*4+c] = side? mem.ancr[c] : mem.ancl[c]; }
      for (let i=0;i<8;i++){ mux.vu[j*8+i]=vuR[i]; mux.pk[j*8+i]=pkR[i]; }
      for (let k=0;k<4;k++) mux.ph[j*4+k]=phR[k];
      mux.cal[j] = cal; mux.ancd[j] = anc;
      j++;
    }
  }
  // synch_test: r1=dma_in_a loads the ADDRESS → always fails → 20th pass jumps to Init_dsp once
  const resyncT = vn >= 1 ? C.T_CLK + 20*passLen() + 1/C.FS : null;
  MODEL = { mux, nMux: j, vuDb, ppmDb, phY, lvl, frames, tCal, resyncT };
  return MODEL;
}
/* the multiplexed LED frame that is latched at time t, for one side (or the current side) */
const LATCH = (C.SHIFT_CLKS*2 - 0.5) / C.FS;                        // 36 clocks, one toggle per ISR
function muxIndexAt(t){ const M = model(); const a = M.mux.t; let lo=0, hi=M.nMux-1, r=-1;
  while (lo<=hi){ const m=(lo+hi)>>1; if (a[m] + LATCH <= t){ r=m; lo=m+1; } else hi=m-1; } return r; }
function frameAt(t, side){ const M=model(); let j = muxIndexAt(t); if (side===undefined) return j; while (j>=0 && M.mux.side[j]!==side) j--; return j; }
function ledState(t){                                               // what each meter cluster shows
  const M = model(), cur = muxIndexAt(t);
  const out = [];
  const jl = frameAt(t,0), jr = frameAt(t,1);
  for (let m=0;m<4;m++){
    const o = { bars:[[],[]], pk:[[],[]], phase:[0,0,0,0,0], lock:[0,0,0], video:false };
    const take = (j, s)=>{
      if (j<0) return;
      if (D.strobe && cur>=0 && M.mux.side[cur]!==s) return;
      const w = M.mux.main[j*4+m];
      for (let p=1;p<=28;p++) o.bars[s][p-1] = (w >>> (29-p)) & 1;
      // phase LEDs: meter1/2 ← chain 2 (ancl/ancr), meter3/4 ← chain 3; lock LEDs: meter1/2 ← chain 1, meter3/4 ← chain 4
      const phChain = m<2 ? 1 : 2, lkChain = m<2 ? 0 : 3, phSide = m%2, lkSide = m%2;
      if (s===phSide){ const a = M.mux.anc[j*4+phChain]; for (let b=0;b<5;b++) o.phase[b] = (a>>>b)&1; }
      if (s===lkSide){ const a = M.mux.anc[j*4+lkChain]; for (let b=0;b<3;b++) o.lock[b] = (a>>>b)&1; }
    };
    take(jl,0); take(jr,1);
    const jj = cur; if (jj>=0) o.video = ((M.mux.anc[jj*4+m] >>> 5) & 1) === 1;
    out.push(o);
  }
  return out;
}
function resultsAt(t){ const M=model(), j=muxIndexAt(t); if (j<0) return null;
  return { j, t:M.mux.t[j], side:M.mux.side[j], vu:Array.from(M.mux.vu.slice(j*8,j*8+8)), pk:Array.from(M.mux.pk.slice(j*8,j*8+8)), ph:Array.from(M.mux.ph.slice(j*4,j*4+4)),
           main:Array.from(M.mux.main.slice(j*4,j*4+4)), anc:Array.from(M.mux.anc.slice(j*4,j*4+4)), cal:M.mux.cal[j], ancd:M.mux.ancd[j] }; }
function traceAt(arr, t, i, w){ const n = Math.round((t - C.T_CLK)*C.FS/DEC); if (n<0||n>=NDEC) return null; return arr[n*w+i]; }

/* ---------------- main-loop and ISR steps ---------------- */
const STEPS = [
  ['call input_gain', 60, 'input_cal_fix[i] (10-bit, from the PIC) → trim[] table → input_cal_float[i]'],
  ['call synch_test', 12, 'checks "dma_in_a" & 0xFE = 0xFE — but loads the address, not the sample (see Findings)'],
  ['call update_phase_audio', 36, 'copy audio_in_float × 0.7 into phase_audio as R1 L1 R2 L2 …'],
  ['call refresh_lock_status', 34, 'anc_data[4..7] lock bits and anc_data[0], [3] video bits into meter1/meter4 anc words'],
  ['main_vuloop: _VUMeterGet (VU, PPM) × 8', 1152, 'MathLn → dB → parm = −2·dB, then r0 = max(r0,0); min(r0,255) (v103)'],
  ['main_vuloop: _PhaseMeterGet × 4 (even r5)', 192, 'y = (sumAVE − diffAVE)/(sumAVE + diffAVE) → 128·y + 128'],
  ['idle', 64, 'wait for the next SPORT0 interrupt (v102+)'],
];
const STEP_CYC = STEPS.reduce((a,s)=>a+s[1],0);
const ISR_STEPS = [
  ['bit set astat FLG2 · alternate registers', 6], ['float r0 by −31 · ×1.412537 · × input_cal_float (8 ch)', 48],
  ['fix × 0.7079457 → dma_out_a/b (AES outputs)', 50], ['ccall _VUMeterCalc (8 ch)', 90], ['ccall _PhaseMeterCalc (4 pairs)', 60],
  ['mux_counter − 1 → mux_ctl → translate_meter_results', 30], ['shift_led_data (one clock edge)', 40], ['bit clr astat FLG2 · rti', 6],
];
function stateAt(t){
  if (t < C.PIC_BOOT) return {phase:'pic', txt:'PIC16F874 holds SHARC_RESET (pic5) low, reads the DIP switches through the CPLD 74165 '+'(inferred timing)'};
  if (t < C.T_INIT) return {phase:'boot', txt:'SHARC boots: 8-bit PROM loader copies the .ldr image from the AM29LV040 flash (inferred length)'};
  if (t < C.T_CLK) return {phase:'init', txt:'Init_dsp: stacks, flags, flush the MM5450 shift registers (100 × 75-cycle clocks), SPORT0/1, DMA chains'};
  const M = model();
  if (verN()>=1 && M.resyncT && t >= M.resyncT && t < M.resyncT + C.INIT_CYC/C.CYC) return {phase:'resync', txt:'synch_test failed 20 passes → jump Init_dsp (runs once; the counter is never reset, see Findings)'};
  const k = Math.floor((t - C.T_CLK)*C.FS), tk = isrT(k);
  const isMux = k>0 && k % C.MUX === 0;
  const shifting = k>0 && (k % C.MUX) < 72;
  const isrLen = (C.ISR_CYC + (shifting?C.ISR_SHIFT_CYC:0) + (isMux?C.ISR_MUX_CYC:0)) / C.CYC;
  if (k >= 1 && t - tk < isrLen){
    const f = (t - tk)/isrLen; let acc = 0, idx = 0; const tot = ISR_STEPS.reduce((a,s)=>a+s[1],0);
    for (let i=0;i<ISR_STEPS.length;i++){ if (f*tot >= acc) idx=i; acc += ISR_STEPS[i][1]; }
    return {phase:'isr', k, isMux, shifting, step: idx, isrLen};
  }
  // main: fraction of the pass
  const pl = passLen(), p0 = C.T_CLK + 1/C.FS;
  const pass = Math.floor((t - p0)/pl), rel = (t - p0 - pass*pl)/pl;
  let s = 0, acc = 0; const work = verN()>=3 ? 0.62 : 1;           // v102+: ≈ 62 % of the two-sample window is work, the rest idle
  const f = rel < work ? rel/work * (STEP_CYC - STEPS[6][1]) : STEP_CYC;
  for (let i=0;i<STEPS.length;i++){ if (f >= acc) s=i; acc += STEPS[i][1]; }
  if (verN()<3 && s===6) s = 5;
  return {phase:'main', pass, step:s, k};
}

/* ---------------- user actions (what each control does in the code) ---------------- */
function act(name, fn){
  const tr = []; fn(s=>tr.push(s));
  D.log.unshift({ t:SIM.t, name, trace:tr }); if (D.log.length>60) D.log.length=60;
  MKEY=''; SIM.refresh();
}
const A = {
  dip(i){ act(`DIP SW${i+1} → ${D.dip[i]?'down':'up'}`, tr=>{
    D.dip[i] = !D.dip[i];
    tr('CPLD 74165 (|74165:194|): dip1…dip9 are parallel-loaded while pic9 is low, then clocked out on pic4 → pic2 to the PIC');
    if (i<4){ const dig = isDigital(i);
      tr(`PIC (source missing, ${'inferred'}): input ${i+1} select = ${dig?'1 (AES)':'0 (analog)'}; shifted out on pic8 with clock pic7 and latched by pic6`);
      tr(`CPLD latch ${['_LC031','_LC024','_LC027','_LC022'][i]} → DR0${i<2?'A':'B'} = ${dig?'aes_data_in':'a/d_data_in'}${i+1} during the ${i%2?'TFSO-low':'TFSO-high'} slot`);
      tr(dig ? (D.pairs[i].aes ? 'CS8420 locked → AES LED (anc_data bit 1) on the next PIC frame' : 'No AES signal on input '+(i+1)+' → ERROR LED (anc_data bit 2), meter falls to "no audio"') : 'CS5333 ADC '+(i+1)+' feeds the SHARC; AES/ERROR LEDs go out');
    } else if (i===4){ tr(`SW5 ${D.dip[4]?'up = −18 dBFS':'down = −20 dBFS'} reference for digital inputs (manual)`);
      tr(`PIC sends input_cal_fix = ${D.dip[4]?111:128} for digital inputs → input_gain → trim[${D.dip[4]?111:128}] = ${trimDb(D.dip[4]?111:128).toFixed(2)} dB (mapping ${'inferred'})`);
    } else if (i===6 || i===7){ const am = autoMode(); tr(`SW7/SW8 Video Auto Off = ${am? am+' minutes':'disabled'} (manual table)`); D.autoExpired = false; tr('The auto-off timer restarts'); }
    else tr(`SW${i+1}: ${i===5?'"Reserved" in the VMS33 manual':'dip9 is wired to the CPLD 74165 serial input; no function known'}`);
  }); },
  mode(k, m){ act(`Input ${k+1}: ${MODES[m]}`, tr=>{ D.pairs[k].mode = m; tr('Test signal changed. The SHARC sees it in audio_in_float['+IDX.L[k]+'] (L) and ['+IDX.R[k]+'] (R).'); }); },
  level(k, v){ act(`Input ${k+1} level ${v} dBFS`, tr=>{ D.pairs[k].lvl = v; tr(`${v} dBFS peak = ${v+24} dBu on an analog input (${'inferred'}: +24 dBu = 0 dBFS, so +4 dBu reads 0 like a −20 dBFS AES signal)`); }); },
  freq(k, f){ act(`Input ${k+1} frequency ${f} Hz`, tr=>{ D.pairs[k].f = f; }); },
  plugAes(k){ act(`${D.pairs[k].aes?'Unplug':'Plug in'} AES IN ${k+1}`, tr=>{ D.pairs[k].aes = !D.pairs[k].aes;
    tr(`CS8420 #${k+1} ${D.pairs[k].aes?'locks (SRC to 48 kHz)':'loses lock'}; PIC updates anc_data[${4+k}] on its next frame (${'inferred'})`);
    if (!isDigital(k)) tr('SW'+(k+1)+' is up (analog), so the meter still shows the analog input'); }); },
  plugAna(k){ act(`${D.pairs[k].ana?'Unplug':'Plug in'} ANALOG IN ${k+1} (L+R)`, tr=>{ D.pairs[k].ana = !D.pairs[k].ana; tr(D.pairs[k].ana?'CS5333 ADC '+(k+1)+' gets signal':'Only the ADC noise floor remains'); if (isDigital(k)) tr('SW'+(k+1)+' is down (digital), so this input is not metered'); }); },
  plugVideo(k){ act(`${D.video[k]?'Unplug':'Plug in'} VIDEO IN ${k+1}`, tr=>{ D.video[k] = !D.video[k];
    tr(`GS4982 sync separator (shared through the 74HC4052 mux, ${'inferred'}) ${D.video[k]?'finds':'loses'} sync on input ${k+1}`);
    tr(`Manual: "Auto Synch Detect — the video screen will automatically be powered down if no video synch is detected"`);
    tr(`PIC → anc_data[${k}] = ${videoOn(k)?'0x20':'0x00'} → SHARC ORs it into meter${k+1} anc words → MM5450 #${k+1} output 34 (video on ${k+1})`);
    if (D.video[k]) D.autoExpired = false; }); },
  remote(){ act(`DB-9 pin 1 ${D.remote?'opened':'closed to pin 6'}`, tr=>{ D.remote = !D.remote; D.btn = null;
    tr('Manual: "a closure to ground turns all 3 screens off and overrides the Auto Off"'); tr(`All four anc_data[0..3] video bits = ${screensOff()?'0':'0x20 (where sync is present)'}`); }); },
  button(){ act('Press front VIDEO ON/OFF button', tr=>{ const off = screensOff(); D.btn = off ? 'on' : 'off';
    tr('Manual: "The front panel push button will act as an alternate action on/off control" and "overrides the rear panel control"');
    tr(`Screens → ${D.btn.toUpperCase()} (PIC, ${'inferred'}) → anc_data[0..3] bit 5`); }); },
  expire(){ act('Jump ahead: Auto Off timer runs out', tr=>{ if (!autoMode()){ tr('Auto Off is disabled (SW7 and SW8 down): nothing happens'); return; } D.autoExpired = true; D.btn = null; tr(`${autoMode()} minutes without a change → all screens off (manual)`); }); },
  version(v){ act(`Load SHARC firmware ${v}`, tr=>{ D.ver = v; tr(VER_TXT[v]); }); },
  reset(){ const keep = D.log; D = defaults(); D.log = keep; act('Factory defaults', tr=>tr('All inputs, DIP switches and connections back to the defaults')); },
};

/* ---------------- panels ---------------- */
const WIN_CX = [237.7, 649.2, 1060.7, 1472.2];                        // vms1frt.dxf window centres (inches×100 from the panel's left edge)
const MM = 100/25.4;                                                  // mm → panel units (0.01")
function cluster(cx, cy, st, m, hot){                                 // one meter cluster, LED positions from vms44-1 centroid.txt
  let s = '';
  const bx = p => cx + (80.207 + (p-1)*2.54 - 114.497)*MM;
  const yL = cy - (133.858-130.683)*MM, yR = cy - (127.508-130.683)*MM;   // P-CAD Y is up: the 133.858 row is the upper bar
  const led = (x,y,on,red,w,h)=>`<rect x="${(x-w/2).toFixed(1)}" y="${(y-h/2).toFixed(1)}" width="${w}" height="${h}" rx="1" fill="${on?(red?'#ff4a3a':'var(--led-g)'):(red?'#3a1d1b':'var(--led-off)')}" ${on?'filter="url(#vglow)"':''}/>`;
  for (let p=1;p<=28;p++){ const red = RED_POS.includes(p);
    s += led(bx(p), yL, st.bars[0][p-1], red, 6.3, 12.6) + led(bx(p), yR, st.bars[1][p-1], red, 6.3, 12.6);
    s += `<text x="${bx(p).toFixed(1)}" y="${cy+2.6}" font-size="6.4" text-anchor="middle" fill="#d9d6ce">${Math.abs(SCALE[p-1])}</text>`; }
  const px = cx + (74.295-114.497)*MM;
  [125.603,128.143,130.683,133.223,135.763].forEach((y,b)=>{ s += led(px, cy-(y-130.683)*MM, st.phase[4-b], b<2, 12.6, 6.3); });   // bit 0 (always on when in phase) = top '+1'; bits 3–4 = red '−1' end
  const lx = cx + (154.686-114.497)*MM;
  [135.763,130.683,125.603].forEach((y,b)=>{ s += led(lx, cy-(y-130.683)*MM, st.lock[b], false, 12.6, 6.3); });
  s += `<text x="${px-14}" y="${cy-(135.763-130.683)*MM+3}" font-size="7" text-anchor="end" fill="#d9d6ce">+1</text><text x="${px-14}" y="${cy+3}" font-size="7" text-anchor="end" fill="#d9d6ce">0</text><text x="${px-14}" y="${cy+(130.683-125.603)*MM+3}" font-size="7" text-anchor="end" fill="#d9d6ce">−1</text>
    <text x="${bx(1)-9}" y="${yL+3}" font-size="7.5" text-anchor="end" fill="#d9d6ce">L</text><text x="${bx(1)-9}" y="${yR+3}" font-size="7.5" text-anchor="end" fill="#d9d6ce">R</text>
    <text x="${lx+11}" y="${cy-(135.763-130.683)*MM+3}" font-size="7" fill="#d9d6ce">VIDEO</text><text x="${lx+11}" y="${cy+3}" font-size="7" fill="#d9d6ce">AES</text><text x="${lx+11}" y="${cy+(130.683-125.603)*MM+3}" font-size="7" fill="#d9d6ce">ERROR</text>
    <text x="${bx(4)}" y="${yR+19}" font-size="6.5" fill="#a9a59c">VU RANGE</text><text x="${bx(17)}" y="${yR+19}" font-size="6.5" fill="#a9a59c">PEAK RANGE</text>`;
  if (hot) s += `<rect class="vsel" data-m="${m}" x="${cx-190}" y="${cy-32}" width="380" height="66" fill="transparent" style="cursor:pointer"><title>Meter ${m+1}: click to pick input ${m+1} for the signal controls</title></rect>`;
  return s;
}
function lcd(x, y, w, h, m, on){
  if (!on) return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#050606"/><text x="${x+w/2}" y="${y+h/2+4}" font-size="12" text-anchor="middle" fill="#2f3436">${D.video[m]?'screen off':'no sync'}</text>`;
  const cols = ['#c0c0c0','#c0c000','#00c0c0','#00c000','#c000c0','#c00000','#0000c0'];
  let s = ''; const bw = w/7;
  cols.forEach((c,i)=> s += `<rect x="${(x+i*bw).toFixed(1)}" y="${y}" width="${(bw+0.6).toFixed(1)}" height="${h*0.72}" fill="${c}"/>`);
  s += `<rect x="${x}" y="${y+h*0.72}" width="${w}" height="${h*0.28}" fill="#101418"/><text x="${x+w/2}" y="${y+h*0.9}" font-size="15" text-anchor="middle" fill="#e8e8e8" font-family="var(--mono)">VIDEO ${m+1}</text>`;
  return s;
}
function frontSVG(t, opts){
  opts = opts || {};
  const st = (t < C.T_CLK || !model().nMux) ? [0,1,2,3].map(()=>({bars:[[],[]],phase:[0,0,0,0,0],lock:[0,0,0],video:false})) : ledState(t);
  const X0 = 95, Y0 = 30, PW = 1710, PH = 339.8;
  let s = `<svg viewBox="0 0 1900 525" role="img" aria-label="VMS44 front panel, drawn to scale from vms1frt.dxf and the vms44-1 LED centroid" style="width:100%;border-radius:8px;display:block">
    <defs><filter id="vglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1900" height="525" rx="8" fill="#1a1c1e"/>
    <rect x="0" y="0" width="70" height="525" fill="#232629"/><rect x="1830" y="0" width="70" height="525" fill="#232629"/>
    ${[60,465].map(y=>`<rect x="22" y="${y-14}" width="26" height="28" rx="13" fill="#0c0d0e"/><rect x="1852" y="${y-14}" width="26" height="28" rx="13" fill="#0c0d0e"/>`).join('')}
    <rect x="${X0}" y="${Y0}" width="${PW}" height="${PH}" fill="#121314" stroke="#3a3d40" stroke-width="2"/>`;
  // DXF mounting holes (crosshair centres)
  [[53.5,92.2],[53.5,209.2],[422,71.9],[422,247.7],[465,92.2],[465,209.2],[833.5,71.9],[833.5,247.7],[876.5,92.2],[876.5,209.2],[1245,71.9],[1245,247.7],[1288,92.2],[1288,209.2],[1656.5,71.9],[1656.5,247.7]]
    .forEach(([x,y])=> s += `<circle cx="${X0+x}" cy="${Y0+y}" r="6.5" fill="#2b2e31" stroke="#45494d"/>`);
  for (let m=0;m<4;m++){
    const cx = X0 + WIN_CX[m], wx = cx-148, wy = Y0+45.2;
    s += `<rect x="${wx}" y="${wy}" width="296" height="218" fill="#000" stroke="#4a4e52" stroke-width="2"/>` + lcd(wx+3, wy+3, 290, 212, m, st[m].video);
    s += `<text x="${cx}" y="${Y0+PH-14}" font-size="11" text-anchor="middle" fill="#8d918f">${m+1}</text>`;
  }
  s += `<text x="${X0+18}" y="${Y0+24}" font-size="13" fill="#cfcac0" letter-spacing="1">WARD-BECK SYSTEMS</text><text x="${X0+PW-18}" y="${Y0+24}" font-size="13" text-anchor="end" fill="#cfcac0" letter-spacing="1">VMS44</text>`;
  // meter strip (VMS33 cover drawing: a strip under the displays) — placement inferred
  s += `<rect x="${X0}" y="${Y0+PH+12}" width="${PW}" height="128" fill="#191b1d" stroke="#3a3d40" stroke-width="2"/>`;
  for (let m=0;m<4;m++) s += cluster(X0 + WIN_CX[m], Y0+PH+12+64, st[m], m, true);
  s += `<g class="vbtn" style="cursor:pointer"><circle cx="1787" cy="${Y0+PH+76}" r="16" fill="#0b0c0d" stroke="#565a5e" stroke-width="2"/><circle cx="1787" cy="${Y0+PH+76}" r="10" fill="${screensOff()?'#3a3d40':'#7a8085'}"/><text x="1787" y="${Y0+PH+46}" font-size="8" text-anchor="middle" fill="#d9d6ce">VIDEO</text><title>Front panel VIDEO on/off push button (alternate action). Location ${'inferred'}.</title></g>`;
  if (t < C.T_CLK) s += `<text x="950" y="${Y0+PH+120}" font-size="12" text-anchor="middle" fill="#ffb43a">${t<C.PIC_BOOT?'PIC start-up — SHARC held in reset':'SHARC booting — MM5450 outputs off'}</text>`;
  s += (opts.hot||'') + `</svg>`;
  return s;
}
function rearSVG(){
  const bnc = (x,y,on,cls,k,lbl,tip)=>`<g class="${cls}" data-k="${k}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="27" fill="#9c8233" stroke="#5e4d1c" stroke-width="2"/><circle cx="${x}" cy="${y}" r="16" fill="#d8c27a"/><circle cx="${x}" cy="${y}" r="5" fill="#7a5f12"/>
     ${on?`<rect x="${x-10}" y="${y+18}" width="20" height="38" fill="#2b5f9e"/><rect x="${x-17}" y="${y+10}" width="34" height="18" rx="5" fill="#3a74b8"/>`:''}
     <text x="${x}" y="${y-34}" font-size="10" text-anchor="middle" fill="#d9d6ce">${lbl}</text><title>${tip}</title></g>`;
  const phx = (x,y,on,cls,k,lbl,tip)=>`<g class="${cls}" data-k="${k}" style="${cls?'cursor:pointer':''}"><rect x="${x-30}" y="${y-14}" width="60" height="28" rx="3" fill="#1f8a45" stroke="#0e4d25"/>${[-18,0,18].map(d=>`<circle cx="${x+d}" cy="${y}" r="6" fill="#0d3a1c"/>`).join('')}
     ${on?`<rect x="${x-26}" y="${y+14}" width="52" height="16" fill="#3a3d40"/>`:''}<text x="${x}" y="${y+46}" font-size="10" text-anchor="middle" fill="#d9d6ce">${lbl}</text>${tip?`<title>${tip}</title>`:''}</g>`;
  let s = `<svg viewBox="0 0 1900 420" role="img" aria-label="VMS44 rear panel (layout inferred from the BOM connector list)" style="width:100%;border-radius:8px;display:block">
    <rect width="1900" height="420" rx="8" fill="#1d2023"/>`;
  for (let k=0;k<4;k++){
    const x0 = 110 + k*380, P = D.pairs[k];
    s += `<rect x="${x0-50}" y="30" width="350" height="340" rx="6" fill="none" stroke="#3a3d40" stroke-dasharray="4 4"/><text x="${x0+125}" y="22" font-size="13" text-anchor="middle" fill="#ffffff" font-weight="700">INPUT ${k+1}</text>`;
    s += bnc(x0, 95, D.video[k], 'rjv', k, 'VIDEO IN', 'Click to '+(D.video[k]?'unplug':'plug in')+' video '+(k+1));
    s += bnc(x0+125, 95, P.aes, 'rja', k, 'AES IN 75Ω', 'Click to '+(P.aes?'unplug':'plug in')+' AES '+(k+1));
    s += bnc(x0+250, 95, false, '', k, 'AES OUT 75Ω', 'AES output of this input (the SHARC copies audio_in to dma_out; CS8420 transmitter)');
    s += phx(x0+30, 240, P.ana, 'rjn', k, 'ANALOG L', 'Click to '+(P.ana?'unplug':'plug in')+' analog '+(k+1));
    s += phx(x0+125, 240, P.ana, 'rjn', k, 'ANALOG R', 'Click to '+(P.ana?'unplug':'plug in')+' analog '+(k+1));
    s += phx(x0+220, 240, P.aes, 'rja', k, 'AES 110Ω', 'Balanced AES input (PE65612 transformer); same receiver as the BNC');
    s += `<text x="${x0+125}" y="340" font-size="11" text-anchor="middle" fill="${isDigital(k)?'#ffb43a':'#7dff6a'}">metering: ${isDigital(k)?'AES (SW'+(k+1)+' down)':'analog (SW'+(k+1)+' up)'}</text>`;
  }
  s += `<g class="rdb" style="cursor:pointer"><rect x="1625" y="70" width="110" height="46" rx="10" fill="#9aa0a6" stroke="#55595c" stroke-width="2"/><rect x="1640" y="80" width="80" height="26" rx="6" fill="#30343a"/>${D.remote?'<rect x="1648" y="112" width="64" height="40" fill="#3a74b8"/>':''}
       <text x="1680" y="62" font-size="11" text-anchor="middle" fill="#d9d6ce">REMOTE (DB-9)</text><text x="1680" y="172" font-size="10" text-anchor="middle" fill="${D.remote?'#ffb43a':'#a3a9ae'}">pin 1–6 ${D.remote?'CLOSED':'open'}</text><title>Click to close/open pin 1 (video off) to pin 6 (GND)</title></g>
     <rect x="1620" y="230" width="120" height="80" rx="6" fill="#0b0c0d" stroke="#45494d"/><rect x="1645" y="248" width="70" height="44" rx="4" fill="#26292c"/><text x="1680" y="330" font-size="10" text-anchor="middle" fill="#d9d6ce">IEC 90–230 V · fuse</text>`;
  return s + `</svg>`;
}
function dipSVG(){
  let s = `<svg viewBox="0 0 560 168" style="width:100%;max-width:560px;display:block"><rect x="10" y="20" width="540" height="96" rx="6" fill="#b4232c" stroke="#6d1218"/>
    <text x="20" y="14" font-size="11" fill="var(--ink)">SW1 on the VMS44-2 main board (BOM: DIP8) + dip9 → CPLD 74165 → PIC</text><text x="530" y="162" text-anchor="end" font-size="10" fill="var(--ink2)">up / down as in the VMS33 manual</text>`;
  const names = ['IN1 A/D','IN2 A/D','IN3 A/D','IN4 A/D','−18/−20','reserved','auto b0','auto b1','dip9'];
  for (let i=0;i<9;i++){ const x = 30 + i*58, up = D.dip[i];
    s += `<g class="dsw" data-i="${i}" style="cursor:pointer"><rect x="${x}" y="32" width="34" height="62" rx="3" fill="#f2f0ea"/><rect x="${x+5}" y="${up?37:64}" width="24" height="26" rx="2" fill="#2c2f31"/>
      <text x="${x+17}" y="108" font-size="10" text-anchor="middle" fill="#fff">${i+1}</text><text x="${x+17}" y="134" font-size="9" text-anchor="middle" fill="var(--ink2)">${names[i]}</text><title>SW${i+1}: ${up?'up':'down'} — click to flip</title></g>`; }
  return s + `</svg>`;
}
function bindPanels(root){
  root.querySelectorAll('.vsel').forEach(g=> g.addEventListener('click', ()=>{ D.sel = +g.dataset.m; SIM.refresh(); }));
  root.querySelectorAll('.vbtn').forEach(g=> g.addEventListener('click', ()=>A.button()));
  root.querySelectorAll('.rjv').forEach(g=> g.addEventListener('click', ()=>A.plugVideo(+g.dataset.k)));
  root.querySelectorAll('.rja').forEach(g=> g.addEventListener('click', ()=>A.plugAes(+g.dataset.k)));
  root.querySelectorAll('.rjn').forEach(g=> g.addEventListener('click', ()=>A.plugAna(+g.dataset.k)));
  root.querySelectorAll('.rdb').forEach(g=> g.addEventListener('click', ()=>A.remote()));
  root.querySelectorAll('.dsw').forEach(g=> g.addEventListener('click', ()=>A.dip(+g.dataset.i)));
}
function controlsHTML(){
  const k = D.sel, P = D.pairs[k];
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
    <span class="small muted">Input</span>${[0,1,2,3].map(i=>`<button data-sel="${i}" class="${i===k?'on':''}">${i+1}</button>`).join('')}
    <label class="small">Signal <select id="vmMode">${Object.keys(MODES).map(m=>`<option value="${m}" ${m===P.mode?'selected':''}>${MODES[m]}</option>`).join('')}</select></label>
    <label class="small">Level <input id="vmLvl" type="range" min="-60" max="0" step="1" value="${P.lvl}" style="width:120px;vertical-align:middle"> <span class="mono">${P.lvl} dBFS · ${P.lvl+24} dBu</span></label>
    <label class="small">Freq <select id="vmF">${FREQS.map(f=>`<option ${f===P.f?'selected':''}>${f}</option>`).join('')}</select></label>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
    <button id="vmBtn">Front VIDEO button</button><button id="vmExp">Auto Off timer expires</button>
    <label class="small"><input type="checkbox" id="vmStrobe" ${D.strobe?'checked':''}> show the L/R multiplex as it is at the playhead</label>
    <label class="small">SHARC firmware <select id="vmVer">${VERS.map(v=>`<option ${v===D.ver?'selected':''}>${v}</option>`).join('')}</select></label>
    <button id="vmRst">Factory defaults</button>
  </div>
  <div class="small muted" style="margin-top:4px">Click a meter to pick its input. Click rear BNCs and Phoenix blocks to plug or unplug, the DB-9 to close the remote video-off pin, and the DIP switches to flip them. Keys: 1–4 pick an input, M next signal, V the VIDEO button, S strobe.</div>`;
}
function bindControls(root){
  root.querySelectorAll('[data-sel]').forEach(b=> b.onclick=()=>{ D.sel=+b.dataset.sel; SIM.refresh(); });
  const q = s=>root.querySelector(s);
  if (q('#vmMode')) q('#vmMode').onchange = e=>A.mode(D.sel, e.target.value);
  if (q('#vmLvl')) q('#vmLvl').onchange = e=>A.level(D.sel, +e.target.value);
  if (q('#vmF')) q('#vmF').onchange = e=>A.freq(D.sel, +e.target.value);
  if (q('#vmBtn')) q('#vmBtn').onclick = ()=>A.button();
  if (q('#vmExp')) q('#vmExp').onclick = ()=>A.expire();
  if (q('#vmStrobe')) q('#vmStrobe').onchange = e=>{ D.strobe = e.target.checked; SIM.refresh(); };
  if (q('#vmVer')) q('#vmVer').onchange = e=>A.version(e.target.value);
  if (q('#vmRst')) q('#vmRst').onclick = ()=>A.reset();
}
document.addEventListener('keydown', e=>{
  if (!window.__vmsActive || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k = e.key.toLowerCase();
  if ('1234'.includes(k) && k.length===1){ D.sel = +k-1; SIM.refresh(); e.preventDefault(); }
  else if (k==='m'){ const ms=Object.keys(MODES); A.mode(D.sel, ms[(ms.indexOf(D.pairs[D.sel].mode)+1)%ms.length]); e.preventDefault(); }
  else if (k==='v'){ A.button(); e.preventDefault(); }
  else if (k==='s'){ D.strobe=!D.strobe; SIM.refresh(); e.preventDefault(); }
});

/* ---------------- timeline lanes ---------------- */
function lanes(){
  const css = n=>SIM.css(n), M = model(), k = D.sel;
  const txt = (c,x,y,s,col)=>{ c.fillStyle=col||css('--ink'); c.font='11px '+css('--mono'); c.fillText(s,x,y); };
  const ls = [];
  ls.push({label:'Boot: PIC → PROM boot → Init_dsp', h:26, draw(c,X,t0,t1,y,h){
    const seg=(a,b,col,l)=>{ if (b<t0||a>t1) return; c.fillStyle=col; c.globalAlpha=.6; c.fillRect(X(a),y+4,Math.max(1,X(b)-X(a)),h-8); c.globalAlpha=1; if (X(b)-X(a)>60) txt(c,Math.max(X(a),X(t0))+4,y+h/2+4,l); };
    seg(0,C.PIC_BOOT,css('--ink2'),'PIC init, SHARC_RESET low (inferred)'); seg(C.PIC_BOOT,C.T_INIT,css('--warn'),'PROM boot (inferred)'); seg(C.T_INIT,C.T_CLK,css('--accent2'),'Init_dsp');
    if (M.resyncT) seg(M.resyncT, M.resyncT+C.INIT_CYC/C.CYC, css('--bad'), 'synch_test → Init_dsp again');
    if (t0 > C.T_CLK + 0.002 && !(M.resyncT && t1>M.resyncT && t0<M.resyncT+0.001)) txt(c, X(t0)+6, y+h/2+4, 'running (FLG0 set at '+SIM.fmtDur(C.T_CLK)+')', css('--ink2'));
  }});
  ls.push({label:'CPLD clocks: sclock · TFSO · lrclock', h:34, draw(c,X,t0,t1,y,h){
    if (t1 < C.T_CLK) return txt(c, X(t0)+6, y+h/2+4, 'counter held in reset (pic5 & reset_counter / FLG0 = 0)', css('--ink2'));
    const a = Math.max(t0, C.T_CLK), span=t1-a, pw = X(t1)-X(a);
    if (span*96000 < pw/3){
      const lv = (tt, f)=> Math.floor((tt - C.T_CLK)*f*2) % 2 === 0;
      [[6.144e6,0,'sclock'],[96000,1,'TFSO'],[48000,2,'lrclock']].forEach(([f,r,l])=>{ if (span*f > pw/2) { txt(c,X(a)+4,y+9+r*11,l+' '+(f/1e6).toFixed(3)+' MHz (too dense)',css('--ink2')); return; }
        c.strokeStyle=[css('--ink2'),css('--accent2'),css('--accent')][r]; c.beginPath(); const N=Math.min(4000,Math.ceil(span*f*2)+2); let prev=null;
        for (let i=0;i<=N;i++){ const tt=a+span*i/N; const v=lv(tt,f); const yy=y+3+r*11+(v?0:8); if(i===0) c.moveTo(X(tt),yy); else { if(v!==prev) c.lineTo(X(tt),y+3+r*11+(prev?0:8)); c.lineTo(X(tt),yy);} prev=v; } c.stroke(); });
    } else { SIM.pulses(c,X,a,t1,y,h,1/48000,C.T_CLK,0.5/48000,css('--accent'),'lrclock periods (fs = 48 kHz; sclock 6.144 MHz, TFSO 96 kHz)'); }
  }});
  ls.push({label:'SPORT0 DR0A slots (in1 / in2)', h:26, draw(c,X,t0,t1,y,h){
    if (t1 < C.T_CLK) return; const span=t1-t0, sl=1/96000/2, pw=X(t1)-X(t0);
    if (span/sl > pw/6) return void SIM.pulses(c,X,Math.max(t0,C.T_CLK),t1,y,h,1/C.FS,C.T_CLK,1/C.FS*0.95,css('--accent2'),'4 words per sample → DMA tcb0_rx0a → sport0_isr');
    const n0=Math.floor((t0-C.T_CLK)/sl), n1=Math.ceil((t1-C.T_CLK)/sl);
    for (let n=Math.max(0,n0);n<=n1;n++){ const a=C.T_CLK+n*sl; const slot=n%4; c.fillStyle= slot%2? css('--accent2') : css('--accent'); c.globalAlpha=.55; c.fillRect(X(a)+1,y+4,X(a+sl)-X(a)-2,h-8); c.globalAlpha=1;
      if (X(a+sl)-X(a)>70) txt(c,X(a)+4,y+h/2+4,`${['in1','in2','in1','in2'][slot]} ${slot<2?'L':'R'} (${['pair 1','pair 2'][slot%2]})${slot%2?'':' + sync 0xFF'}`,'#fff'); }
  }});
  ls.push({label:'sport0_isr (FLAG2 high)', h:24, draw(c,X,t0,t1,y,h){
    if (t1 < C.T_CLK) return; const a=Math.max(t0,C.T_CLK+1/C.FS); const pxs = (X(t0+1/C.FS)-X(t0));
    if (pxs < 2.2) return void SIM.pulses(c,X,a,t1,y,h,1/C.FS,C.T_CLK,C.ISR_CYC/C.CYC,css('--accent'),'ISR runs');
    const n0=Math.ceil((a-C.T_CLK)*C.FS), n1=Math.floor((t1-C.T_CLK)*C.FS);
    for (let n=n0;n<=n1;n++){ const tk=isrT(n); const mx = n%C.MUX===0, sh=(n%C.MUX)<72; const len=(C.ISR_CYC+(sh?C.ISR_SHIFT_CYC:0)+(mx?C.ISR_MUX_CYC:0))/C.CYC;
      c.fillStyle = mx? css('--warn') : css('--accent'); c.fillRect(X(tk), y+4, Math.max(1,X(tk+len)-X(tk)), h-8);
      if (X(tk+len)-X(tk) > 110) txt(c, X(tk)+3, y+h/2+4, mx? 'ISR + mux_ctl/translate' : 'ISR '+SIM.fmtDur(len), '#fff'); }
  }});
  ls.push({label:'main loop passes'+(verN()>=3?' (idle-synced)':' (free-running)'), h:30, draw(c,X,t0,t1,y,h){
    if (t1 < C.T_CLK) return; const pl=passLen(), p0=C.T_CLK+1/C.FS, pxp=X(t0+pl)-X(t0);
    if (pxp < 3) return void txt(c, X(Math.max(t0,p0))+6, y+h/2+4, `${Math.round((t1-Math.max(t0,p0))/pl).toLocaleString()} passes in view · one every ${SIM.fmtDur(pl)} (${inf.replace(/<[^>]+>/g,'')})`);
    const n0=Math.max(0,Math.floor((t0-p0)/pl)), n1=Math.ceil((t1-p0)/pl);
    for (let n=n0;n<=n1;n++){ const a=p0+n*pl; let tt=a; const work = verN()>=3? 0.62*pl : pl;
      STEPS.forEach((s,i)=>{ const d = i===6 ? (verN()>=3? pl-work : 0) : s[1]/(STEP_CYC-STEPS[6][1])*work; if (d<=0) return;
        c.fillStyle = i===6? css('--grid') : i===1? css('--bad') : i>=4? css('--accent2') : css('--accent'); c.globalAlpha = i%2? .55:.85; c.fillRect(X(tt),y+4,Math.max(1,X(tt+d)-X(tt)-0.5),h-8); c.globalAlpha=1;
        if (X(tt+d)-X(tt) > 90) txt(c, X(tt)+3, y+h/2+4, s[0].replace('call ','').slice(0,24), i===6?css('--ink'):'#fff'); tt+=d; }); }
  }});
  ls.push({label:'mux_ctl every 300 samples (L/R)', h:24, draw(c,X,t0,t1,y,h){
    const pxm = X(t0+C.MUX/C.FS)-X(t0);
    for (let j=0;j<M.nMux;j++){ const a=M.mux.t[j]; if (a<t0-0.01||a>t1) continue; const sd=M.mux.side[j];
      c.fillStyle = sd? css('--warn') : css('--accent'); c.globalAlpha=.35; c.fillRect(X(a+LATCH), y+4, X(a+LATCH+C.MUX/C.FS)-X(a+LATCH), h-8); c.globalAlpha=1; c.fillRect(X(a), y+2, 2, h-4);
      if (pxm > 60) txt(c, X(a+LATCH)+3, y+h/2+4, sd? 'RIGHT rows lit (FLG9)':'LEFT rows lit (FLG8)'); }
  }});
  ls.push({label:'LED shift: FLG10 clock, 36 bits', h:26, draw(c,X,t0,t1,y,h){
    const half = 1/C.FS, pxh = X(t0+half)-X(t0);
    for (let j=0;j<M.nMux;j++){ const a=M.mux.t[j]; if (a+72/C.FS<t0||a>t1) continue;
      if (pxh < 2){ c.fillStyle=css('--accent2'); c.fillRect(X(a),y+5,Math.max(1,X(a+72/C.FS)-X(a)),h-10); continue; }
      c.strokeStyle=css('--accent2'); c.beginPath();
      for (let e=0;e<72;e++){ const ta=a+e/C.FS, hi=(e%2===0); const yy=hi?y+5:y+h-5; if (e===0) c.moveTo(X(ta),y+h-5); c.lineTo(X(ta),yy); c.lineTo(X(ta+half),yy); }
      c.stroke(); }
    if (pxh<2 && X(t1)-X(t0)>200) txt(c, X(t0)+6, y+h/2+4, '1.5 ms bursts (72 ISR toggles ≈ 24 kHz clock) every 6.25 ms', css('--ink'));
  }});
  ls.push({label:'SPORT1 ↔ PIC (17 × 10-bit)', h:22, draw(c,X,t0,t1,y,h){
    M.frames.forEach(f=>{ if (f.t1<t0||f.t0>t1) return; c.fillStyle = f.rx? css('--accent2') : css('--ink2'); c.globalAlpha=f.rx?.8:.35; c.fillRect(X(f.t0),y+4,Math.max(1.5,X(f.t1)-X(f.t0)),h-8); c.globalAlpha=1;
      if (X(f.t1)-X(f.t0)>140) txt(c,X(f.t0)+3,y+h/2+4,'input_cal_fix[8] anc_data[8] spare17 ↔ pic_out_data[17]','#fff'); });
    if (X(t1)-X(t0) > 300) txt(c, X(t1)-250, y+h/2+4, 'frame rate set by the PIC (inferred 100/s)', css('--ink2'));
  }});
  [0,1].forEach(sd=> ls.push({label:`Input ${k+1} ${SIDE[sd]}: audio_in_float`, h:34, draw(c,X,t0,t1,y,h){
    const i = sd? IDX.R[k] : IDX.L[k]; const span=t1-t0, pw=X(t1)-X(t0); const P=D.pairs[k];
    c.strokeStyle = sd? css('--bad') : css('--accent'); c.beginPath();
    if (span*Math.max(P.f,1000) < pw/2){ const N=Math.min(1500, Math.max(200,pw)); for (let q=0;q<=N;q++){ const tt=t0+span*q/N; const n=Math.round((tt-C.T_CLK)*C.FS); const v = tt<C.T_CLK? 0 : rawSig(k,sd,n)*C.IN_GAIN; const yy=y+h/2-Math.max(-1,Math.min(1,v))*(h/2-3); q?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); }
    else { const N=Math.min(800,pw); for (let q=0;q<N;q++){ const tt=t0+span*(q+.5)/N; const v=traceAt(M.vuDb,tt,i,8); if (v===null) continue; const a=Math.pow(10,v/20)*1.414; c.fillStyle=sd?css('--bad'):css('--accent'); c.globalAlpha=.4; const hh=Math.min(1,a)*(h/2-3); c.fillRect(X(t0)+q*pw/N,y+h/2-hh,pw/N+0.6,2*hh); c.globalAlpha=1; } }
  }}));
  ls.push({label:`Input ${k+1}: VU (solid) · PPM (thin), dB`, h:60, draw(c,X,t0,t1,y,h){
    const pw=X(t1)-X(t0), N=Math.min(900,pw); const Y = db=> y+3 + (Math.max(-60, Math.min(6, db)) - 6)/-66*(h-6);
    c.strokeStyle=css('--grid'); [0,-20,-40].forEach(d=>{ c.beginPath(); c.moveTo(X(t0),Y(d)); c.lineTo(X(t1),Y(d)); c.stroke(); txt(c,X(t0)+2,Y(d)-1,d+' dB',css('--ink2')); });
    [[M.vuDb,2.5],[M.ppmDb,1]].forEach(([arr,lw])=>{ [0,1].forEach(sd=>{ const i= sd? IDX.R[k]:IDX.L[k]; c.strokeStyle= sd? css('--bad'):css('--accent'); c.lineWidth=lw; c.beginPath(); let st=false;
      for (let q=0;q<=N;q++){ const tt=t0+(t1-t0)*q/N; const v=traceAt(arr,tt,i,8); if (v===null){ st=false; continue; } const yy=Y(v); st? c.lineTo(X(tt),yy) : c.moveTo(X(tt),yy); st=true; } c.stroke(); }); });
    c.lineWidth=1; txt(c, X(t1)-210, y+12, '10·log10(state): −20 = meter "0"', css('--ink2'));
  }});
  ls.push({label:`Input ${k+1}: phase y = (S−D)/(S+D)`, h:30, draw(c,X,t0,t1,y,h){
    const pw=X(t1)-X(t0), N=Math.min(900,pw); c.strokeStyle=css('--grid'); c.beginPath(); c.moveTo(X(t0),y+h/2); c.lineTo(X(t1),y+h/2); c.stroke();
    c.strokeStyle=css('--accent2'); c.lineWidth=2; c.beginPath(); let st=false; for (let q=0;q<=N;q++){ const tt=t0+(t1-t0)*q/N; const v=traceAt(M.phY,tt,k,4); if (v===null){st=false;continue;} const yy=y+h/2-v*(h/2-3); st?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); st=true; } c.stroke(); c.lineWidth=1;
    txt(c,X(t0)+2,y+10,'+1',css('--ink2')); txt(c,X(t0)+2,y+h-2,'−1',css('--ink2'));
  }});
  ls.push({label:`Video ${k+1}: fields · screen power`, h:24, draw(c,X,t0,t1,y,h){
    if (D.video[k]) SIM.pulses(c,X,t0,t1,y,h*0.5,1001/60000,0,0.0006,css('--accent2'),'NTSC fields (59.94/s)'); else txt(c,X(t0)+6,y+10,'no video sync',css('--ink2'));
    const pw=X(t1)-X(t0), N=Math.min(400,pw); c.fillStyle=css('--warn');
    for (let q=0;q<N;q++){ const tt=t0+(t1-t0)*(q+.5)/N; const j=muxIndexAt(tt); if (j>=0 && ((M.mux.anc[j*4+k]>>>5)&1)) c.fillRect(X(t0)+q*pw/N, y+h*0.62, pw/N+.6, h*0.3); }
  }});
  ls.push({label:`Meter ${k+1}: lit segments L / R`, h:34, draw(c,X,t0,t1,y,h){
    for (let j=0;j<M.nMux;j++){ const a=M.mux.t[j]+LATCH, b=(j+2<M.nMux? M.mux.t[j+2]+LATCH : 1); if (b<t0||a>t1) continue; const sd=M.mux.side[j]; const w=M.mux.main[j*4+k];
      let cnt=0; for (let p=1;p<=28;p++) if ((w>>>(29-p))&1) cnt=p; const hh=cnt/28*(h/2-3);
      c.fillStyle = sd? css('--bad'):css('--accent'); c.globalAlpha=.7; c.fillRect(X(a), sd? y+h/2+1 : y+h/2-1-hh, Math.max(1,X(b)-X(a)), hh); c.globalAlpha=1; }
  }});
  return ls;
}

/* ---------------- scopes ---------------- */
function drawSportScope(cv, info, t){
  const {c,w} = SIM.canvas(cv, 150), ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), a2=SIM.css('--accent2'), warn=SIM.css('--warn');
  if (t < C.T_CLK){ c.fillStyle=ink2; c.font='12px sans-serif'; c.fillText('Audio clocks not running yet (FLG0 = 0).', 10, 30); info.innerHTML=''; return; }
  const n = Math.max(1, Math.round((t-C.T_CLK)*C.FS)); const k = D.sel;
  const pairA = k<2 ? [0,1] : [2,3];
  const words = [[pairA[0],0],[pairA[1],0],[pairA[0],1],[pairA[1],1]].map(([p,sd],slot)=>{
    const v = rawSig(p, sd, n), q = Math.round(v*8388607) & 0xffffff; let w = (q << 8) >>> 0; if (slot%2===0) w = (w | 0xff) >>> 0; return {p, sd, w, v}; });
  const cw = (w-20)/128;
  words.forEach((o,s)=>{ for (let b=0;b<32;b++){ const bit = (o.w >>> (31-b)) & 1, x = 10 + (s*32+b)*cw;
      c.fillStyle = b>=24 && s%2===0 ? warn : (s%2? a2 : acc); c.globalAlpha = .15; c.fillRect(x, 20, cw, 70); c.globalAlpha = 1;
      c.strokeStyle = ink; c.beginPath(); c.moveTo(x, bit? 30:80); c.lineTo(x+cw, bit? 30:80); c.stroke(); }
    c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`in${s%2+1} ${SIDE[o.sd]} → input ${o.p+1}`, 12+s*32*cw, 14); });
  c.fillStyle=ink2; c.font='11px '+SIM.css('--mono'); c.fillText(`DR0${k<2?'A':'B'} for sample ${n.toLocaleString()} · 4 × 32-bit words (TFSO high = in1, low = in2) · one bit = ${SIM.fmtDur(1/6.144e6)}`, 10, 110);
  c.fillText('orange = low byte forced to 1 by the CPLD (_LC017 & _LC018 & TFSO): the sync pattern synch_test meant to check', 10, 128);
  info.innerHTML = words.map(o=>`input ${o.p+1} ${SIDE[o.sd]}: ${o.v.toFixed(5)} FS → 0x${o.w.toString(16).padStart(8,'0').toUpperCase()}`).join(' · ');
}
function drawShiftScope(cv, info, t){
  const {c,w} = SIM.canvas(cv, 140), ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), a2=SIM.css('--accent2'), warn=SIM.css('--warn');
  const j = muxIndexAt(t), ch = D.chainSel, M = model();
  if (j < 0){ c.fillStyle=ink2; c.font='12px sans-serif'; c.fillText('No LED frame has been shifted out yet.', 10, 30); info.innerHTML=''; return; }
  const main = M.mux.main[j*4+ch], anc = M.mux.anc[j*4+ch];
  const bits = []; for (let b=0;b<=28;b++) bits.push((main>>>b)&1); for (let b=0;b<7;b++) bits.push((anc>>>b)&1);
  const cw = (w-20)/36;
  bits.forEach((bit,i)=>{ const x=10+i*cw; c.fillStyle = i===0? warn : i<=28? acc : i<=33? a2 : (i===34? warn : ink2); c.globalAlpha=.16; c.fillRect(x,18,cw-1,60); c.globalAlpha=1;
    c.strokeStyle=ink; c.beginPath(); c.moveTo(x, bit?26:70); c.lineTo(x+cw, bit?26:70); c.stroke();
    if (cw > 14){ c.fillStyle=ink2; c.font='9px '+SIM.css('--mono'); c.fillText(i===0?'S': i<=28? String(SCALE[28-i]) : i<=33? 'a'+(i-29) : i===34? 'V':'–', x+2, 92); } });
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono');
  c.fillText(`MM5450 chain ${ch+1} (FLG${4+ch} data, FLG10 clock) · frame ${j} · ${M.mux.side[j]?'meter'+(ch+1)+'_right + ancr':'meter'+(ch+1)+'_left + ancl'}`, 10, 12);
  c.fillStyle=ink2; c.fillText('S = start bit · bits 1–28 = segments +14 … −38 · a0–a4 = '+(ch===1||ch===2?'phase LEDs':'lock LEDs (VIDEO, AES, ERROR)')+' · V = output 34 (video on '+(ch+1)+')', 10, 112);
  info.innerHTML = `word 0x${main.toString(16).padStart(8,'0').toUpperCase()} · anc 0x${anc.toString(16).padStart(2,'0').toUpperCase()} · shifted ${SIM.fmtDur(M.mux.t[j])} → latched ${SIM.fmtDur(M.mux.t[j]+LATCH)}`;
}

/* ---------------- views ---------------- */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ return D.log[0] ? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>` + D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Flip a switch, plug a cable or change a signal. The code path is listed here.</div>'; }
const hx = (v,n)=> '0x'+(v>>>0).toString(16).padStart(n||8,'0').toUpperCase();
function inspectorHTML(t){
  const st = stateAt(t), R = resultsAt(t), M = model();
  const where = st.phase==='isr' ? `sport0_isr #${st.k.toLocaleString()} · ${ISR_STEPS[st.step][0]}${st.isMux?' (mux sample)':''}` : st.phase==='main' ? `main pass #${st.pass.toLocaleString()} · ${STEPS[st.step][0]}` : st.txt;
  let s = `<table class="kv"><tr><th>At the playhead</th><td class="mono small">${where}</td></tr>
    <tr><th>Firmware</th><td class="mono small">${D.ver} — ${VER_TXT[D.ver]}</td></tr>`;
  if (R){
    const cal = R.cal, anc = R.ancd;
    s += `<tr><th>input_cal_fix[8]</th><td class="mono small">${cal.join(', ')} → ${cal.map(v=>trimDb(v).toFixed(1)).join(' ')} dB${t<M.tCal?' <span style="color:var(--warn)">(boot values: no PIC frame yet)</span>':''}</td></tr>
      <tr><th>anc_data[8]</th><td class="mono small">${anc.map(v=>hx(v,2)).join(' ')}</td></tr>
      <tr><th>vu_results[8]</th><td class="mono small">${R.vu.join(', ')}  <span class="muted">(order R1 R2 L1 L2 R3 R4 L3 L4; dB = −value/2)</span></td></tr>
      <tr><th>pk_results[8]</th><td class="mono small">${R.pk.join(', ')}  <span class="muted">(read as pk_data[pk+6])</span></td></tr>
      <tr><th>phase_results[4]</th><td class="mono small">${R.ph.join(', ')}${R.ph.some(v=>v>=256)?' <span style="color:var(--bad)">256 → phase_data[256] is past the table</span>':''}</td></tr>
      <tr><th>Last LED frame</th><td class="mono small">#${R.j} ${R.side?'RIGHT':'LEFT'} · main ${R.main.map(v=>hx(v)).join(' ')} · anc ${R.anc.map(v=>hx(v,2)).join(' ')}</td></tr>`;
  } else s += `<tr><th>Meters</th><td class="small muted">No mux frame yet (first at ${SIM.fmtDur(isrT(C.MUX))}).</td></tr>`;
  s += `<tr><th>Screens</th><td class="mono small">${[0,1,2,3].map(m=>`${m+1}: ${videoOn(m)?'on':'off'}`).join(' · ')} · auto off ${autoMode()?autoMode()+' min':'disabled'}${D.btn?' · button override '+D.btn:''}${D.remote?' · DB-9 closed':''}</td></tr></table>`;
  return s;
}
function viewSim(m){
  window.__vmsActive = true;
  m.innerHTML = `
  <div class="grid2">
    <div>${card('Front panel at the playhead — four displays, four stereo meters', `<div id="fp"></div><div id="ctl" style="margin-top:8px"></div>`)}
      ${card('Rear panel and main-board DIP switch', `<div id="rp"></div><div id="dip" style="margin-top:8px"></div>`)}</div>
    <div>${card('What the code did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}</div>
  </div>
  ${card('Timeline — the first second after power-on (zoom with the wheel, click to seek)', `<canvas id="tl"></canvas>
    <p class="small muted">The SHARC takes one interrupt per sample (48 kHz) when the SPORT0 DMA has the four words of a frame. The ISR does all the filtering; <span class="mono">main</span> turns the filter states into 0–255 numbers and goes <span class="mono">idle</span>. Every 300 samples <span class="mono">mux_ctl</span> loads the next LED frame and the ISR clocks it out to the four MM5450 drivers one edge per sample, then swaps the LEFT/RIGHT row select. Boot timings, cycle counts and the PIC frame rate are ${inf}; everything else comes from the source.</p>`)}
  <div class="grid2">
    ${card('Scope: SPORT0 receive data for one sample (from the CPLD)', `<canvas id="sc1"></canvas><div id="sc1i" class="small mono"></div>`)}
    ${card('Scope: one MM5450 frame', `<div style="margin-bottom:4px">${[0,1,2,3].map(i=>`<button data-ch="${i}" class="${i===D.chainSel?'on':''}">chain ${i+1}</button>`).join(' ')}</div><canvas id="sc2"></canvas><div id="sc2i" class="small mono"></div>`)}
  </div>
  ${card('Action log', `<div id="log" class="log"></div>`)}`;
  m.querySelectorAll('[data-ch]').forEach(b=> b.onclick=()=>{ D.chainSel=+b.dataset.ch; m.querySelectorAll('[data-ch]').forEach(x=>x.classList.toggle('on', x===b)); SIM.refresh(); });
  let lastCtl = '';
  const draw = ()=>{
    const t = SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t); m.querySelector('#rp').innerHTML = rearSVG(); m.querySelector('#dip').innerHTML = dipSVG(); bindPanels(m);
    const ck = JSON.stringify([D.sel, D.pairs[D.sel], D.ver, D.strobe]); if (ck!==lastCtl){ lastCtl=ck; m.querySelector('#ctl').innerHTML = controlsHTML(); bindControls(m.querySelector('#ctl')); }
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#insp').innerHTML = inspectorHTML(t);
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
    drawSportScope(m.querySelector('#sc1'), m.querySelector('#sc1i'), t);
    drawShiftScope(m.querySelector('#sc2'), m.querySelector('#sc2i'), t);
  };
  SIM.on('time', draw);
}

/* ---------------- tutorial (VMS33 manual + VMS44 code) ---------------- */
const LESSONS = [
  { title:'Meet the VMS44', body:`<p>The VMS44 is a <b>video and audio monitoring system</b>: four small video screens, each with a stereo audio meter underneath. It sat in a rack or on a desk so an operator could see four feeds and hear-check their levels at a glance.</p>
     <img src="${ASSET}vms-vms33-cover.png" alt="VMS33 manual cover drawing" style="width:100%;background:#fff;border-radius:6px"><p class="small muted">The archive keeps the manual of the three-screen sister model, the VMS33 (cover drawing above, rendered from VMS33MANU.cdr). The VMS44 is the four-screen version: four inputs, four meters, the same controls.</p>
     <p>Each meter has two rows of 28 LEDs (L on top, R below) from −38 to +14, a five-LED <b>phase</b> column on the left (+1 in phase, −1 out of phase) and <b>VIDEO / AES / ERROR</b> lamps on the right.</p>`, check:()=>true, auto:true },
  { title:'1 · Line up a tone at reference level', body:`<p>Input 1 is analog. <b>0 on the meter = +4 dBu</b> (manual: "Meter Level 0 VU = +4 dBu"), which the meter tables place at −20 dBFS.</p><p>Click meter 1 (or press 1), choose <b>Tone, L = R</b> and set the level to <b>−20 dBFS (+4 dBu)</b>. Both bars stop exactly at <b>0</b>.</p>`, check:()=>D.pairs[0].mode==='tone'&&D.pairs[0].lvl===-20, hint:'Input 1 → Signal "Tone, L = R", Level −20.' },
  { title:'2 · VU bar and peak dot', body:`<p>Each row shows two things at once: a <b>bar</b> (VU, slow) and a single <b>dot</b> (peak programme meter, fast attack, slow fall). In the code they are two tables ORed together: <span class="mono">vu_data[vu] | pk_data[pk+6]</span>.</p><p>Set input 2 to <b>Tone bursts</b>. Play the timeline and watch the 10 ms burst at 0.55 s: the peak dot jumps, the VU bar hardly moves.</p>`, check:()=>D.pairs[1].mode==='burst', hint:'Pick input 2, Signal "Tone bursts".' },
  { title:'3 · Read the phase column', body:`<p>The phase column compares L+R with L−R. In phase lights one LED (+1). Unrelated signals light three (0). Anti-phase lights all five, the two red ones at the −1 end.</p><p>Set input 3 to <b>Tone, R inverted</b> and check that meter 3's column is full. Then try <b>R 90° behind L</b> (about three LEDs).</p>`, check:()=>D.pairs[2].mode==='anti', hint:'Pick input 3, Signal "Tone, R inverted".' },
  { title:'4 · Switch an input to AES', body:`<p>The DIP switch inside picks analog or AES for each input (manual: "SW1 channel one analog/digital select (down=digital)").</p><p>Flip <b>SW1 down</b>. Input 1 has no AES cable yet, so the <b>ERROR</b> lamp lights and the bars drop. Then click <b>AES IN 75Ω</b> for input 1 on the rear panel: AES lights instead and the meter comes back.</p>`, check:()=>!D.dip[0]&&D.pairs[0].aes, hint:'Click switch 1 on the DIP, then the AES IN BNC of input 1.' },
  { title:'5 · Choose the digital reference level', body:`<p>SW5 sets where <b>0</b> sits for digital inputs: down = −20 dBFS, up = −18 dBFS.</p><p>Flip <b>SW5 up</b>. The input-1 bars drop by about 2 dB: the PIC now sends a smaller calibration number and <span class="mono">input_gain</span> turns it into −2 dB (${inf}: the PIC code is missing).</p>`, check:()=>D.dip[4]&&!D.dip[0], hint:'Keep SW1 down and flip SW5 up.' },
  { title:'6 · Lose a picture', body:`<p>"Auto Synch Detect — the video screen will automatically be powered down if no video synch is detected."</p><p>Unplug <b>VIDEO IN 2</b> on the rear. Screen 2 goes dark and meter 2's VIDEO lamp goes out. In the code, the PIC clears <span class="mono">anc_data[1]</span> bit 5 and the SHARC shifts that bit to MM5450 output 34.</p>`, check:()=>!D.video[1], hint:'Click the VIDEO IN BNC of input 2.' },
  { title:'7 · Turn the screens off from the remote', body:`<p>The rear DB-9 has a video-off pin: pin 1 closed to pin 6 turns all the screens off.</p><p>Click the <b>REMOTE (DB-9)</b> connector to close the contact.</p>`, check:()=>D.remote&&screensOff(), hint:'Click the DB-9 on the rear panel.' },
  { title:'8 · Override with the front button', body:`<p>"The front panel push button overrides the rear panel control." Press the <b>VIDEO</b> button on the front (or V). The screens come back even though the remote contact is still closed.</p>`, check:()=>D.remote&&D.btn==='on', hint:'Click the round VIDEO button at the right end of the meter strip.' },
  { title:'9 · Auto Off', body:`<p>SW7 and SW8 set the Auto Off time: off, 10, 60 or 180 minutes. It protects the LCDs, which last about 15 000 hours.</p><p>Open the remote contact again, set <b>SW7 up</b> (10 minutes), then click <b>Auto Off timer expires</b>.</p>`, check:()=>autoMode()>0&&D.autoExpired&&screensOff(), hint:'DB-9 open, SW7 up, then the "Auto Off timer expires" button.' },
  { title:'Done', body:`<p>You have used every control the manual describes. The other tabs show the same unit from the inside: <b>One second</b> breaks the metering down to the sample, <b>Software</b> follows each step of the SHARC code, and <b>Findings</b> lists what the code really does.</p>`, check:()=>true, auto:true },
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__vmsActive = true;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — operating the VMS44', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
    <div>${card('The unit', `<div id="fp"></div><div id="ctl" style="margin-top:6px"></div><div id="rp" style="margin-top:8px"></div><div id="dip" style="margin-top:6px"></div>`)}${card('What the code did', `<div id="trace" class="log"></div>`)}</div></div>`;
  let lastCtl = '';
  const draw = ()=>{
    m.querySelector('#fp').innerHTML = frontSVG(Math.max(SIM.t, 0.2)); m.querySelector('#rp').innerHTML = rearSVG(); m.querySelector('#dip').innerHTML = dipSVG(); bindPanels(m);
    const ck = JSON.stringify([D.sel, D.pairs[D.sel], D.ver, D.strobe]); if (ck!==lastCtl){ lastCtl=ck; m.querySelector('#ctl').innerHTML = controlsHTML(); bindControls(m.querySelector('#ctl')); }
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L = LESSONS[lessonIdx], ok = L.check();
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>
      <p class="small muted">The panel shows the playhead (at least 0.2 s, after boot). Press Play to see the meters move.</p>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); lessonIdx=0; draw(); };
  };
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewSecond(m){
  window.__vmsActive = false;
  m.innerHTML = `${card('One second, broken down (counts per second at 48 kHz)', `<div id="ladder"></div>`)}
  <div class="grid2">${card('As seen by the SHARC at the playhead', `<div id="dev"></div>`)}${card('As seen by the operator', `<div id="fp"></div><p class="small muted">Each LED row is lit only half the time: LEFT rows for 6.25 ms, then RIGHT rows for 6.25 ms (80 Hz each). Tick "strobe" in the Simulator tab to see the instant view.</p>`)}</div>
  ${card('Zoom ladder at the playhead', `<canvas id="zl"></canvas>`)}`;
  const draw = ()=>{
    const t = SIM.t, M = model();
    const rows = [
      ['CPLD audio-clock (MCLK)', '12 288 000 '+inf, SIM.fmtDur(1/C.MCLK), 'From the PLL1700E (27 MHz crystal). lpm_counter divides it.'],
      ['sclock1…4 / TCLK0 / RCLK0', '6 144 000', SIM.fmtDur(1/6.144e6), 'dffs0 of the counter = MCLK/2. sclock2/4 are gated by !TFSO.'],
      ['TFSO = RFS0 (SPORT0 frame sync)', '96 000', SIM.fmtDur(1/96000), 'dffs6 = MCLK/128. High half = input 1/3 slot, low half = input 2/4 slot.'],
      ['lrclock1…4 = fs', '48 000', SIM.fmtDur(1/48000), 'Toggles on each TFSO rising edge.'],
      ['SPORT0 words (DR0A + DR0B)', '384 000', SIM.fmtDur(1/192000), '32-bit words, DMA tcb0/tcb1, 4 + 4 per sample.'],
      ['sport0_isr calls', '48 000', SIM.fmtDur(1/48000), 'One per DMA block of 4 words: float, calibrate, VUMeterCalc, PhaseMeterCalc.'],
      ['main passes', (Math.round(1/passLen())).toLocaleString()+' '+inf, SIM.fmtDur(passLen()), verN()>=3? 'Synced by idle: about 1 550 cycles of work every two samples.' : 'No idle before v102: main free-runs.'],
      ['VUMeterGet calls', (Math.round(16/passLen())).toLocaleString(), '', '16 per pass, each with a MathLn (two MathDiv).'],
      ['mux_ctl / translate_meter_results', '160', SIM.fmtDur(C.MUX/C.FS), 'mux_counter = 300 → 160 frames/s, 80 per side.'],
      ['LED shift clock edges (FLG10)', (160*72).toLocaleString(), SIM.fmtDur(1/C.FS), '36 clocks per frame, one edge per ISR (24 kHz clock in 1.5 ms bursts).'],
      ['MM5450 bits shifted', (160*36*4).toLocaleString(), '', 'Four chains at once on FLG4–FLG7.'],
      ['SPORT1 frames to/from the PIC', '100 '+inf, SIM.fmtDur(C.PIC_PERIOD), '17 ten-bit words each way (MRCS1 = 0x1FFFF).'],
      ['NTSC video fields per input', '59.94', SIM.fmtDur(1001/60000), 'GS4982 sync separator (one, shared through the 74HC4052, inferred).'],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>notes</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    const st = stateAt(t), R = resultsAt(t), k = D.sel;
    const iL = IDX.L[k], iR = IDX.R[k];
    const vL = traceAt(M.vuDb,t,iL,8), vR = traceAt(M.vuDb,t,iR,8), pL = traceAt(M.ppmDb,t,iL,8), pR = traceAt(M.ppmDb,t,iR,8);
    m.querySelector('#dev').innerHTML = `<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)} · sample ${t<C.T_CLK?'—':Math.floor((t-C.T_CLK)*C.FS).toLocaleString()}</td></tr>
      <tr><th>Running</th><td class="small">${st.phase==='isr'? 'sport0_isr — '+ISR_STEPS[st.step][0] : st.phase==='main'? 'main — '+STEPS[st.step][0] : st.txt}</td></tr>
      <tr><th>Input ${k+1} VU state</th><td class="mono">L ${vL===null?'—':vL.toFixed(1)} dB · R ${vR===null?'—':vR.toFixed(1)} dB → parm ${vL===null?'—':Math.min(255,Math.round(-2*vL))} / ${vR===null?'—':Math.min(255,Math.round(-2*vR))}</td></tr>
      <tr><th>Input ${k+1} PPM state</th><td class="mono">L ${pL===null?'—':pL.toFixed(1)} dB · R ${pR===null?'—':pR.toFixed(1)} dB (shown 3 dB lower: pk_data[pk+6])</td></tr>
      <tr><th>Phase y</th><td class="mono">${(traceAt(M.phY,t,k,4)??0).toFixed(3)}</td></tr>
      <tr><th>LED frame</th><td class="mono small">${R? '#'+R.j+' '+(R.side?'RIGHT':'LEFT')+' latched at '+SIM.fmtDur(R.t+LATCH) : '—'}</td></tr></table>`;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanels(m);
    drawLadder(m.querySelector('#zl'), t);
  };
  SIM.on('time', draw);
}
function drawLadder(cv, t){
  const levels = [['1 s',1],['100 ms',0.1],['12.5 ms (one L+R mux cycle)',0.0125],['1.5 ms (one LED shift)',0.0015],['41.7 µs (one main pass)',2/48000],['20.8 µs (one sample)',1/48000],['10.4 µs (one TFSO)',1/96000]];
  const {c,w} = SIM.canvas(cv, levels.length*40+10), ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), play=SIM.css('--play');
  levels.forEach(([l,span],i)=>{
    const y = 6+i*40, x0 = 230, pw = w-x0-10; const t0 = Math.max(0, Math.min(1-span, t-span/2));
    c.fillStyle=ink; c.font='12px sans-serif'; c.fillText(l, 6, y+20);
    c.fillStyle=SIM.css('--lane'); c.fillRect(x0,y,pw,32);
    const X = tt => x0 + (tt-t0)/span*pw;
    if (span >= 0.0125){ for (let j=Math.max(0,Math.floor((t0-C.T_CLK)*C.FS/C.MUX)); ; j++){ const a=C.T_CLK+j*C.MUX/C.FS; if (a>t0+span) break; c.fillStyle= j%2? SIM.css('--warn'):acc; c.globalAlpha=.5; c.fillRect(X(a),y+4,Math.max(1,X(a+C.MUX/C.FS)-X(a)-0.5),24); c.globalAlpha=1; } }
    else { const p = span>1.5e-5 ? 1/C.FS : 1/6.144e6; const n0=Math.ceil((t0-C.T_CLK)/p); for (let n=n0; ; n++){ const a=C.T_CLK+n*p; if (a>t0+span) break; if (a<C.T_CLK) continue; c.fillStyle=acc; c.fillRect(X(a), y+4, Math.max(1, (span>1.5e-5? C.ISR_CYC/C.CYC : p/2)/span*pw), 24); } }
    c.strokeStyle=play; c.beginPath(); c.moveTo(X(t),y); c.lineTo(X(t),y+32); c.stroke();
    c.fillStyle=ink2; c.font='10px '+SIM.css('--mono'); c.fillText(span >= 0.0125 ? 'mux frames (green L, orange R)' : span>1.5e-5 ? 'sport0_isr' : 'sclock edges', x0+4, y+30);
  });
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  ana:{x:20,y:20,w:190,h:70,t:'Analog in × 4 (L/R)',s:['NE5532 buffers ×4','CS5333 24-bit ADC ×4'],d:'Phoenix 3-pin inputs, >20 kΩ balanced (manual). Four NE5532 dual op-amps buffer eight channels into four CS5333 stereo ADCs (VMS44-2 BOM). reset_adc comes from the PIC through the CPLD (pic3 → pin 65).'},
  aes:{x:20,y:110,w:190,h:80,t:'AES in/out × 4',s:['PE65612 transformers ×8','CS8420 SRC transceivers ×4','30–96 kHz → 48 kHz'],d:'Four CS8420 sample-rate-converting transceivers: AES in (75 Ω BNC or 110 Ω Phoenix) is converted to 48 kHz; the transmit side sends the SHARC\'s dma_out data back out as AES (manual: digital output, 24 bit, 48 kHz, 75 Ω).'},
  vid:{x:20,y:400,w:190,h:80,t:'Video × 4',s:['74HC4052 mux · GS4982 sync','EL2280C buffers ×2','→ 4 LCD panels'],d:'Four NTSC inputs. One GS4982 sync separator behind a 74HC4052 4-way mux lets the PIC test each input for sync (inferred from the BOM). Two dual EL2280C amplifiers drive the four LCDs. The LCD supply follows MM5450 output 34 ("video on").'},
  cpld:{x:270,y:40,w:210,h:130,t:'EPM3128ATC144 CPLD',s:['lpm_counter: MCLK → sclock, TFSO, lrclock','DR0A/DR0B slot mux (AES or A/D)','74165 DIP shifter · select latches','PIC ↔ SPORT1 wiring'],d:'vms44-1.rpt (MAX+plus II 9.6, filed in the SMS folder): 52 of 128 macrocells. Divides the audio clock, time-multiplexes two stereo inputs onto each SPORT0 data line, forces the sync byte, latches the PIC\'s analog/digital selects and loads the DIP switches into a 74165.'},
  pll:{x:270,y:220,w:210,h:50,t:'PLL1700E + 27 MHz',s:['audio-clock (12.288 MHz, inferred)'],d:'X1 27 MHz crystal and a PLL1700E multi-clock generator (BOM). The CPLD audio-clock input (pin 107) is assumed to be 256 fs.'},
  dsp:{x:540,y:40,w:210,h:130,t:'ADSP-21065L SHARC',s:['60 MHz, boots from AM29LV040','sport0_isr: VU/PPM/phase','main: Get → tables → LEDs','FLG4–11 → LED shift bus'],d:'vms44_main.asm (DSB, Jul 2002) + Allard Designs vumeter.asm / phasemeter.asm. SPORT0 (I²S-style, 32-bit, DMA chained A+B) carries the audio; SPORT1 (multichannel, 17 × 10-bit) talks to the PIC. FLAG0 starts the audio clocks, FLAG2 marks the ISR.'},
  pic:{x:540,y:220,w:210,h:70,t:'PIC16F874',s:['DIPs, video sync, timers','front button, DB-9 remote'],d:'Firmware VMS44V104 / VMS43V200 (software listings). The source is not in the archive (vms-44/pic/vms44se is empty). It resets the SHARC (pic5), reads the DIPs, sets the input selects and sends calibration and status words over SPORT1.'},
  led:{x:800,y:40,w:180,h:130,t:'VMS44-1 meter board',s:['DS26LS32A receivers ×2','MM5450 LED drivers ×4','259 LEDs (202 green, 57 red)','2N4401/4403 row switches'],d:'From vms44-1-bom.txt and the centroid file. The DS26LS31C drivers on the main board and the DS26LS32A receivers here carry the eight flag lines (data ×4, LEFT, RIGHT, clock, enable) to four MM5450s. Each MM5450 drives 28 bar LEDs + 5 phase or lock LEDs + the video-on output, multiplexed between the L and R rows.'},
  lcd:{x:800,y:400,w:180,h:60,t:'4 LCD displays',s:['windows 2.93 × 2.16 in'],d:'vms1frt.dxf: four windows on a 4.115 in pitch, with a note to trim the plastic mounting frame by 0.020 in. The meter board uses the same 104.52 mm (4.115 in) pitch.'},
  panel:{x:270,y:310,w:210,h:56,t:'Panel / remote',s:['VIDEO button · DB-9 · DIP SW1'],d:'Manual: front push button (alternate action), DB-9 pin 1 video off, DIP SW1–SW8.'},
};
const WIRES = [['ana','cpld','a/d_data_in1–4'],['aes','cpld','aes_data_in1–4'],['cpld','aes','data_out1–4'],['pll','cpld','audio-clock'],['cpld','dsp','DR0A/B, TFSO, RCLK0'],['dsp','cpld','DT0A/B'],['pic','cpld','pic1–9'],['cpld','pic',''],['dsp','led','FLG4–11 (DS26LS31C)'],['led','lcd','video on'],['vid','lcd',''],['vid','pic','sync'],['panel','pic','']];
function viewBlock(m){
  window.__vmsActive = false; let sel='dsp';
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${card('Signal flow', `<p>Audio enters as analog (ADC) or AES (CS8420). The <b>CPLD</b> picks one per input and packs two stereo inputs onto each SHARC serial line. The <b>SHARC</b> filters every sample and once every 6.25 ms shifts a 36-bit frame into each of four <b>MM5450</b> LED drivers. The <b>PIC</b> handles the switches, the screens and the calibration, and talks to the SHARC over a second serial port.</p>`)}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 1000 500" style="width:100%"><defs><marker id="var" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#var)"/>`;
      if (l) s+=`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML = s+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    m.querySelector('#bdinfo').innerHTML = `<h3>${BLOCKS[sel].t}</h3><p>${BLOCKS[sel].d}</p>`;
  };
  draw();
}

/* ---------------- schematics (redrawn from net names) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*17; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*17; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x-34}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*17; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x+w+34}" y="${yy+4}" font-size="10" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  return s;
}
function meterBoardSVG(){
  // vms44-1 centroid (mm): x 60…480, y 115…190; drawn 1.7 px/mm
  const sx = v=> 20 + (v-60)*1.9, sy = v=> 420 - (v-110)*4.2;
  let s = `<rect x="${sx(62)}" y="${sy(192)}" width="${(480-62)*1.9}" height="${(192-116)*4.2}" fill="none" stroke="var(--ink2)" stroke-dasharray="5 4"/>`;
  [120.269,224.79,329.311,433.832].forEach((x,i)=> s += `<rect x="${sx(x)-15}" y="${sy(178.4)-15}" width="30" height="30" fill="var(--panel2)" stroke="var(--ink)"/><text x="${sx(x)}" y="${sy(178.4)+4}" font-size="9" text-anchor="middle" fill="var(--ink)">U${[1,4,5,6][i]}</text><text x="${sx(x)}" y="${sy(178.4)-19}" font-size="9" text-anchor="middle" fill="var(--accent2)">MM5450 #${i+1}</text>`);
  [[158.877,'U2'],[172.847,'U3']].forEach(([x,n])=> s += `<rect x="${sx(x)-8}" y="${sy(182.8)-6}" width="16" height="12" fill="var(--panel2)" stroke="var(--ink)"/><text x="${sx(x)}" y="${sy(182.8)-9}" font-size="8" text-anchor="middle" fill="var(--ink2)">${n}</text>`);
  s += `<text x="${sx(166)}" y="${sy(188)}" font-size="9" text-anchor="middle" fill="var(--accent2)">DS26LS32A</text>`;
  [114.703,219.224,323.745,428.266,271.294].forEach((x,i)=> s += `<rect x="${sx(x)-24}" y="${sy(126.9)+22}" width="48" height="8" fill="var(--chip)" stroke="var(--ink2)"/><text x="${sx(x)}" y="${sy(126.9)+42}" font-size="8" text-anchor="middle" fill="var(--ink2)">H${i+1} ZIF30</text>`);
  for (let m=0;m<4;m++){ const off = m*104.521;
    for (let p=0;p<28;p++){ const x=80.207+p*2.54+off, red=RED_POS.includes(p+1); [133.858,127.508].forEach(y=> s += `<rect x="${sx(x)-2}" y="${sy(y)-4}" width="4" height="8" fill="${red?'#d33a2c':'#2f9e44'}"/>`); }
    [125.603,128.143,130.683,133.223,135.763].forEach((y,b)=> s += `<rect x="${sx(74.295+off)-4}" y="${sy(y)-2}" width="8" height="4" fill="${b<2?'#d33a2c':'#2f9e44'}"/>`);
    [125.603,130.683,135.763].forEach(y=> s += `<rect x="${sx(154.686+off)-4}" y="${sy(y)-2}" width="8" height="4" fill="#2f9e44"/>`);
  }
  [[84.074,149.543,'#2f9e44'],[134.874,149.86,'#d33a2c'],[109.474,152.464,'#2f9e44']].forEach(([x,y,c])=> s += `<circle cx="${sx(x)}" cy="${sy(y)}" r="3" fill="${c}"/>`);
  s += `<text x="${sx(84)}" y="${sy(155)}" font-size="9" fill="var(--ink2)">L257–L259 (function not traced)</text>`;
  return s + `<text x="30" y="40" font-size="11" fill="var(--ink2)">VMS44-1 meter board, to scale from "vms44-1 centroid.txt" (mm; P-CAD Y up). Meter pitch 104.521 mm = 4.115 in = the LCD window pitch in vms1frt.dxf.</text>`;
}
const SHEETS = [
  { name:'1 · CPLD (vms44-1.rpt pins)', note:'EPM3128ATC144-10, pin numbers and node names from the MAX+plus II report (filed under XXX - SMS …/SMS - #SOFTWARE #Altera/v100). Equations summarised on the right.', svg:()=>
    chip(300,40,200,'EPM3128ATC144-10',[
      ['107','audio-clock'],['25/42/45/63','a/d_data_in1–4'],['29/38/55/69','aes_data_in1–4'],['27/44/53/67','sclock1–4'],['28/37/54/68','lrclock1–4'],['30/39/56/70','omck1–4'],['31/40/60/71','rmck1–4 (unused)'],['32/41/61/72','data_out1–4'],['86…78, 74','dip1–dip9'],['23,22,21,18,16,15,14,11,10','pic1–pic9'],['65','reset_adc'],['109','reset_counter (FLAG0)'],['110–112','flag1–3 (unused)'],
    ],[
      ['143 / 142','DR0A / DR0B'],['139 / 138','DT0A / DT0B'],['141','TFSO (→ RFS0 5)'],['6 / 140','RCLK0 / TCLK0'],['134 / 131','DR1A / DT1A'],['137 / 133','RFS1 / tfs1'],['136 / 132','RCLK1 / TCLK1'],['7','SHARC_RESET'],
    ],'MAX+plus II 9.6 · 52/128 LCs · compiled 11/17/2006')
    + `<text x="40" y="325" font-size="10.5" fill="var(--ink2)">DR0A = TFSO ? (sel1 ? aes1 : a/d1) : (sel2 ? aes2 : a/d2)</text>
       <text x="40" y="342" font-size="10.5" fill="var(--ink2)">        + (dffs5 & dffs4 & TFSO) → sync byte</text>
       <text x="40" y="359" font-size="10.5" fill="var(--ink2)">data_out1 = DT0A & TFSO · data_out2 = DT0A & !TFSO</text>
       <text x="40" y="376" font-size="10.5" fill="var(--ink2)">lrclock = T-flip-flop on TFSO · sclock2/4 = sclock3 & !TFSO</text>
       <text x="40" y="393" font-size="10.5" fill="var(--ink2)">DR1A = pic8 · pic1 = DT1A · RFS1 = pic6 · RCLK1 = pic7</text>
       <text x="40" y="410" font-size="10.5" fill="var(--ink2)">SHARC_RESET = pic5 · reset_adc = pic3 · counter clear = !(pic5 & reset_counter)</text>
       <text x="40" y="427" font-size="10.5" fill="var(--ink2)">74165: load on !pic9, clock pic4, out → pic2 (dip1…dip8, dip9 = serial in)</text>` },
  { name:'2 · SHARC', note:'ADSP-21065L connections from vms44_INIT.ASM (control words, flags) and the CPLD node names. Flag functions from the comments in vms44_main.asm.', svg:()=>
    chip(320,50,210,'ADSP-21065L (U6)',[
      ['DR0A / DR0B','← CPLD 143 / 142'],['RFS0 / RCLK0','← TFSO / sclock'],['DT0A / DT0B','→ CPLD 139 / 138'],['DR1A / RFS1 / RCLK1','← pic8 / pic6 / pic7'],['DT1A','→ pic1'],['RESET','← SHARC_RESET (pic5)'],['BMS / data','AM29LV040 8-bit PROM boot'],
    ],[
      ['FLAG0','→ reset_counter (audio clocks)'],['FLAG2','→ CPLD 111 (ISR marker)'],['FLG4–FLG7','→ MM5450 data 1–4'],['FLG8','→ LEFT row select'],['FLG9','→ RIGHT row select'],['FLG10','→ LED shift clock'],['FLG11','→ clock enable'],
    ],'60 MHz · SRCTL0 = 0x013C09F1 · SRCTL1 = 0x108C1090')
    + `<text x="40" y="330" font-size="10.5" fill="var(--ink2)">SPORT0: SLEN = 32 bits, receive A+B with DMA chaining (tcb0_rx0a, tcb1_rx0b, 4 words each); "sport0 is I2S Mode" (the multichannel set-up is commented out).</text>
       <text x="40" y="348" font-size="10.5" fill="var(--ink2)">SPORT1: SLEN = 10 bits, multichannel (MCE), MRCS1 = MTCS1 = 0x1FFFF = 17 channels, chained DMA into input_cal_fix and out of pic_out_data.</text>
       <text x="40" y="366" font-size="10.5" fill="var(--ink2)">Bit names for SRCTL decoded from the ADSP-21065L register layout (${'inferred'}): bit 0 SPEN_A, bits 4–8 SLEN, bits 18–21 DMA/chain A+B, bit 24 SPEN_B; SRCTL1 bit 23 MCE.</text>` },
  { name:'3 · Meter board VMS44-1', note:'Placement redrawn from the P-CAD centroid file in vms.zip. Part values from vms44-1-bom.txt. Net connections between the parts are not in the archive.', svg:()=> meterBoardSVG() },
  { name:'4 · Main board VMS44-2 (BOM)', note:'Parts list from vms44-2-bom.txt (P-CAD, Jul 2002). The board is 11.96 × 5.07 in (vms44-2.sta: 320 components, 344 nets, 4 signal layers). Connections inferred from part roles.', svg:()=>{
    const rows = [['U6','ADSP21065 MQFP208','SHARC DSP'],['U7','AM29LV040B-120J','boot flash'],['U2','EPM3128-144','CPLD'],['U8','PIC16F874 QFP44','panel / control'],['U1…','CS5333 ×4','stereo ADCs'],['U3…','CS8420 ×4','AES SRC transceivers'],['T1…','PE65612 ×8','AES transformers'],['U12 / X1','PLL1700E / 27 MHz','audio clock'],['U23','GS4982','video sync separator'],['U24','74HC4052','4-way video mux'],['U21…','EL2280C ×2','video amplifiers'],['U13…','DS26LS31C ×2','LED bus drivers'],['U9','75176','RS-485 transceiver (use not traced)'],['U11…','NE5532 ×4','analog input buffers'],['SW1','DIP8','analog/digital, level, auto-off'],['BNC1…','BNC ×12','video in, AES in, AES out'],['TB1…','Phoenix 3P ×12','analog L/R, AES 110 Ω'],['REG1…','LM1117-3.3 ×2, 79L05','3.3 V, −5 V']];
    return `<text x="40" y="36" font-size="12" font-weight="700" fill="var(--ink)">VMS44-2 key parts</text>` + rows.map((r,i)=>`<text x="40" y="${60+i*21}" font-size="11" fill="var(--accent2)" font-family="var(--mono)">${r[0]}</text><text x="130" y="${60+i*21}" font-size="11" fill="var(--ink)">${r[1]}</text><text x="370" y="${60+i*21}" font-size="11" fill="var(--ink2)">${r[2]}</text>`).join(''); } },
  { name:'5 · Front panel (DXF)', note:'vms1frt.dxf "VMS1 FRONT PANEL" (AutoCAD 2000, 25 Apr 2002): 17.100 × 3.398 in, 1.250 in flange, 0.047 in CRS, four "A" holes 2.160 × 2.930 in. The meter strip under it is placed after the VMS33 cover drawing (inferred).', svg:()=>{
    const k=0.48, X=v=>20+v*k, Y=v=>80+v*k; let s=`<rect x="${X(0)}" y="${Y(0)}" width="${1710*k}" height="${339.8*k}" fill="none" stroke="var(--ink)" stroke-width="1.4"/>`;
    WIN_CX.forEach(cx=>{ s+=`<rect x="${X(cx-148)}" y="${Y(45.2)}" width="${296*k}" height="${218*k}" fill="none" stroke="var(--accent2)"/><line x1="${X(cx-17)}" y1="${Y(153)}" x2="${X(cx+17)}" y2="${Y(153)}" stroke="var(--ink2)"/><line x1="${X(cx)}" y1="${Y(136)}" x2="${X(cx)}" y2="${Y(170)}" stroke="var(--ink2)"/><text x="${X(cx)}" y="${Y(300)}" font-size="10" text-anchor="middle" fill="var(--ink2)">A @ ${(cx/100).toFixed(3)}</text>`; });
    s+=`<text x="${X(0)}" y="${Y(-14)}" font-size="10" fill="var(--ink2)">0.000</text><text x="${X(1710)}" y="${Y(-14)}" font-size="10" text-anchor="end" fill="var(--ink2)">17.100</text><text x="${X(1720)}" y="${Y(339.8)}" font-size="10" fill="var(--ink2)">3.398</text>
       <text x="20" y="300" font-size="11" fill="var(--ink2)">NOTE: MODIFY THE PLASTIC MOUNTING FRAME FOR THE VIDEO DISPLAY PRIOR TO INSTALLING. REMOVE .020 FROM THE TOP AND BOTTOM EDGE</text>
       <text x="20" y="320" font-size="11" fill="var(--ink2)">The same DXF also carries text from an IMPM05 "IMPEDANCE MATCHING PANEL (20 TB-3 WAY)" drawing (see Findings).</text>`;
    return s; } },
];
function viewSchem(m){
  window.__vmsActive = false; let i=0;
  m.innerHTML = card('Schematic set (redrawn from net names, BOM and centroid files — not the original P-CAD drawings)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The P-CAD board files themselves (vms44-1.pcb, vms44-2.pcb) are not in the archive; only their reports are (BOMs, centroids, vms44-2.sta/.tst/.atr). Blue labels are net or node names.</p>`);
  const draw=()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 900 460" style="width:100%;min-width:660px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="888" height="448" fill="none" stroke="var(--line)"/><text x="884" y="448" text-anchor="end" font-size="10" fill="var(--ink2)">VMS44 · sheet ${i+1}/${SHEETS.length} · redrawn 2026|59</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent = SHEETS[i].note;
  };
  draw();
}

/* ---------------- software ---------------- */
function viewSoft(m){
  window.__vmsActive = true;
  m.innerHTML = `<div class="grid2">
    ${card('main — the box lit up is running at the playhead', `<div id="flow"></div>`)}
    ${card('sport0_isr — once per sample', `<div id="isr"></div>`)}</div>
  <div class="grid2">
    ${card('LED multiplex state machine (mux_ctl + shift_led_data)', `<div id="fsm"></div>`)}
    ${card('Data maps', `<div id="maps"></div>`)}</div>
  <div class="grid2">
    ${card('Lookup tables (vms44_vu_data / pk_data / phase_data)', `<canvas id="tabs3"></canvas><p class="small muted">Bar: lit segments for each VU value (0–255, dB = −value/2). Phase: LEDs lit against 128·y + 128. The peak dot uses the same breakpoints read 6 entries later, so it reads 3 dB lower, which cancels the ISR's +3 dB for a sine peak.</p>`)}
    ${card('How the controls did things', `<div id="btn"></div>`)}</div>
  ${card('Firmware versions (folders diffed)', `<div id="ver"></div>`)}`;
  const draw=()=>{
    const st = stateAt(SIM.t);
    let s=`<svg viewBox="0 0 520 ${STEPS.length*44+70}" style="width:100%"><defs><marker id="va2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <rect x="120" y="6" width="280" height="26" rx="13" fill="var(--chip)" stroke="var(--line)"/><text x="260" y="24" text-anchor="middle" font-size="11.5" fill="var(--ink)">start: ccall _VUMeterInit · bit set astat FLG0</text>`;
    STEPS.forEach((p,j)=>{ const y=44+j*44, on = st.phase==='main' && st.step===j, bad = j===1;
      s+=`<line x1="260" y1="${y-12}" x2="260" y2="${y}" stroke="var(--ink2)" marker-end="url(#va2)"/><rect x="30" y="${y}" width="460" height="32" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="${bad?'var(--bad)':'var(--line)'}"/>
        <text x="40" y="${y+14}" font-size="11.5" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${p[0]}</text><text x="40" y="${y+27}" font-size="9.8" fill="${on?'#eef':'var(--ink2)'}">${p[2].slice(0,92)}</text>`; });
    const yb=44+STEPS.length*44; s+=`<path d="M490 ${yb-28} h18 V40 h-18" fill="none" stroke="var(--ink2)" marker-end="url(#va2)"/><text x="40" y="${yb+16}" font-size="10.5" fill="var(--ink2)">jump main · ${st.phase==='main'?'pass #'+st.pass.toLocaleString():st.phase==='isr'?'(interrupted by sport0_isr)':st.txt.slice(0,60)}</text></svg>`;
    m.querySelector('#flow').innerHTML = s;
    let r=`<svg viewBox="0 0 440 ${ISR_STEPS.length*38+40}" style="width:100%">`;
    ISR_STEPS.forEach((p,j)=>{ const y=10+j*38, on = st.phase==='isr' && st.step===j; const dim = (j===5 && !(st.isMux)) || (j===6 && !(st.shifting));
      r+=`<rect x="10" y="${y}" width="420" height="30" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" opacity="${dim&&!on?0.6:1}"/><text x="20" y="${y+19}" font-size="11" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${p[0]}</text>`; });
    r+=`<text x="10" y="${ISR_STEPS.length*38+30}" font-size="10.5" fill="var(--ink2)">${st.phase==='isr'? 'ISR #'+st.k.toLocaleString()+(st.isMux?' · mux sample':'')+(st.shifting?' · shifting':'')+' · '+SIM.fmtDur(st.isrLen)+' ('+inf.replace(/<[^>]+>/g,'')+')' : 'Not in the ISR at the playhead.'}</text></svg>`;
    m.querySelector('#isr').innerHTML = r;
    const t=SIM.t, j=muxIndexAt(t), M=model(); const kk = t<C.T_CLK? -1 : Math.floor((t-C.T_CLK)*C.FS) % C.MUX;
    const node=(x,y,l,on,sub)=>`<g><rect x="${x-70}" y="${y-24}" width="140" height="48" rx="10" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="${x}" y="${y-3}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${l}</text><text x="${x}" y="${y+13}" text-anchor="middle" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${sub}</text></g>`;
    const sd = j>=0 ? M.mux.side[j] : 0, shifting = kk>=0 && kk<72;
    m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 460 210" style="width:100%">${node(90,50,'mux_ctl',kk===0,'every 300 ISRs')}${node(320,50,'shift 36 bits',shifting,'BIT30 set, FLG10 toggles')}${node(320,160,sd?'RIGHT rows':'LEFT rows',!shifting&&kk>=0,sd?'FLG9 = 1, FLG8 = 0':'FLG8 = 1, FLG9 = 0')}${node(90,160,'wait',!shifting&&kk>0,'mux_counter − 1')}
      <path d="M160 50 H248" stroke="var(--ink2)" marker-end="url(#va2)"/><path d="M320 74 V134" stroke="var(--ink2)"/><path d="M250 160 H162" stroke="var(--ink2)"/><path d="M90 136 V76" stroke="var(--ink2)"/>
      <text x="200" y="40" font-size="9.5" text-anchor="middle" fill="var(--ink2)">tgl BIT31, translate</text><text x="326" y="108" font-size="9.5" fill="var(--ink2)">clock_counter = 36</text><text x="10" y="200" font-size="10.5" fill="var(--ink2)">Sample ${kk<0?'—':kk} of 300 in this mux period · frame ${j<0?'—':j} · ${j<0?'':sd?'RIGHT':'LEFT'} data</text></svg>`;
    m.querySelector('#maps').innerHTML = `<table class="kv small"><tr><th>dma_in_a[4]</th><td class="mono">(R1) (R2) (L1) (L2) — "changed rights are first now!"</td></tr><tr><th>dma_in_b[4]</th><td class="mono">(R3) (R4) (L3) (L4)</td></tr>
      <tr><th>audio_in_float[8]</th><td class="mono">R1 R2 L1 L2 R3 R4 L3 L4 (×1.412537 × trim)</td></tr><tr><th>phase_audio[8]</th><td class="mono">R1 L1 R2 L2 R3 L3 R4 L4 (×0.7)</td></tr>
      <tr><th>SPORT1 rx (17)</th><td class="mono">input_cal_fix[0..7] · anc_data[0..7] · spare17</td></tr><tr><th>anc_data</th><td class="mono">[0..3] = 0x20 video on meter 1–4 · [4..7] = lock bits b0 b1 b2 (${inf})</td></tr>
      <tr><th>MM5450 frame</th><td class="mono">clk 1 start · 2–29 segments +14…−38 · 30–34 anc bits 0–4 · 35 anc bit 5 = video on · 36 anc bit 6</td></tr>
      <tr><th>anc word owners</th><td class="mono">chain 1: lock meter 1 (L) / 2 (R) · chain 2: phase pair 1 / 2 · chain 3: phase pair 3 / 4 · chain 4: lock meter 3 / 4</td></tr></table>`;
    drawTables(m.querySelector('#tabs3'));
    m.querySelector('#btn').innerHTML = `<table class="kv"><tr><th>Operator does</th><th>Path</th><th>Result</th></tr>
      <tr><td>Flips SW1–SW4</td><td class="mono small">74165 → pic2 → PIC → pic8/pic7/pic6 → _LC031/_LC024/_LC027/_LC022</td><td class="small">DR0A/B takes aes_data_inN instead of a/d_data_inN</td></tr>
      <tr><td>Flips SW5</td><td class="mono small">PIC → SPORT1 → input_cal_fix → input_gain → trim[]</td><td class="small">−2 dB trim on digital inputs (${inf})</td></tr>
      <tr><td>Unplugs video</td><td class="mono small">GS4982 → PIC → anc_data[m] = 0 → refresh_lock_status / translate → bit 34</td><td class="small">MM5450 output 34 off → LCD dark</td></tr>
      <tr><td>DB-9 / VIDEO button / SW7–8</td><td class="mono small">PIC timers → anc_data[0..3]</td><td class="small">All screens off or on</td></tr>
      <tr><td>Feeds audio</td><td class="mono small">sport0_isr → _VUMeterCalc / _PhaseMeterCalc → main_vuloop → mux_ctl → shift_led_data</td><td class="small">Bars, peak dot, phase LEDs, 6.25 ms later at most</td></tr></table>`;
    m.querySelector('#ver').innerHTML = `<table class="kv"><tr><th>Folder</th><th>Date / shipped</th><th>What changed (diff against the previous folder)</th></tr>
      <tr><td class="mono">v1.00</td><td>Jul 3 2002</td><td class="small">Bring-up. No meter maths: <span class="mono">testing_leds</span> steps a pattern through every 4000 samples. <span class="mono">phase_data</span> is loaded from <span class="mono">vms44_pk_data.dat</span>. SPORT0 in multichannel mode; the <span class="mono">i2s version</span> sub-folder switches to I²S with 2-word DMA blocks.</td></tr>
      <tr><td class="mono">v100</td><td>Jul 29 2002</td><td class="small">Allard Designs VU/peak and phase meter modules, alternate stack for ccall, I²S SPORT0, <span class="mono">synch_test</span> filled in, translate called from main.</td></tr>
      <tr><td class="mono">v101</td><td>Nov 19 2002 · #60059–60061</td><td class="small">translate_meter_results moved into mux_ctl; every vu/pk index swapped (0↔2, 1↔3, 4↔6, 5↔7) to match "rights are first now". INIT header dated V1.01.</td></tr>
      <tr><td class="mono">v102</td><td>Nov 27 2002 · #60099</td><td class="small"><span class="mono">idle</span> at the end of main; update_phase_audio scales by 0.7.</td></tr>
      <tr><td class="mono">v103</td><td>Dec 2 2002 · #60173–60174</td><td class="small">r0 = max(r0,0); min(r0,255) after each _VUMeterGet (the phase clamp is left commented out). SIGNAL_THRES 1e-4 → 4e-4. LDF sdram width 16 → 32. The .dpj was re-saved in VisualDSP++ 3.0.</td></tr></table>
      <p class="small muted">Pick a version in the Simulator tab: v1.00 runs the LED test, v100–v102 lose the clamp and the higher phase threshold.</p>`;
  };
  SIM.on('time', draw);
}
function drawTables(cv){
  const {c,w} = SIM.canvas(cv, 190), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), a2=SIM.css('--accent2'), grid=SIM.css('--grid');
  const x0=40, pw=w-60, h=150;
  c.strokeStyle=grid; c.strokeRect(x0,10,pw,h);
  c.strokeStyle=acc; c.lineWidth=2; c.beginPath(); for (let i=0;i<256;i++){ const x=x0+i/255*pw, y=10+h-COUNT[i]/28*h; i?c.lineTo(x,y):c.moveTo(x,y); } c.stroke();
  c.strokeStyle=a2; c.beginPath(); for (let i=0;i<=256;i++){ const n = i>=256? 0 : [5,4,3,2,1][[50,101,153,204,255].findIndex(b=>i<=b)]; const x=x0+i/256*pw, y=10+h-n/5*h*0.5; i?c.lineTo(x,y):c.moveTo(x,y); } c.stroke(); c.lineWidth=1;
  c.fillStyle=ink2; c.font='10px '+SIM.css('--mono');
  [0,40,80,121,200,255].forEach(i=>c.fillText(String(i), x0+i/255*pw-6, 10+h+14));
  c.fillText('28', 8, 18); c.fillText('0', 20, 10+h); c.fillText('bar segments (green) · phase LEDs ×½ (blue) vs table index', x0+6, 24);
  c.fillText('index 40 = −20 dB = "0" · 121+ = no audio', x0+pw-270, 10+h-6);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__vmsActive = false;
  m.innerHTML = card('What the VMS44 is up to — findings from the code and files', `<ol class="small">
    <li><b>The sync check reads an address, not a sample.</b> <span class="mono">synch_test</span> does <span class="mono">r1=dma_in_a; r1=r0 and r1</span>. In SHARC assembly that loads the <i>address</i> of the buffer. The CPLD really does force the low byte of the input-1/3 slot to ones (<span class="mono">_LC017 & _LC018 & TFSO</span> in vms44-1.rpt), so the intended check was possible. With the link order in the .mak (math, phasemeter, INIT with its 200-word stacks, then main) <span class="mono">dma_in_a</span> sits near 0xC0C8, so the test always fails ${inf}.</li>
    <li><b>…and the failure only fires once.</b> <span class="mono">synch_test_count</span> is reset only on success, and the reset path is <span class="mono">if eq jump Init_dsp</span> at exactly 20. So 20 main passes after start-up (≈ 0.8 ms) the SHARC re-runs Init_dsp once (re-flushing the LED shift registers and re-arming the DMA while it runs, then <span class="mono">rts</span> back into main), and the count then runs past 20 for ever. The PIC still sees "sync OK": <span class="mono">pic_out_data[16]</span> is initialised to 170 = 0xAA, the same value the success path writes.</li>
    <li><b>v103's clamp fixes a table overrun.</b> <span class="mono">_VUMeterGet</span> limits its result to 255 but not to 0. With the +3 dB offset in the ISR and up to +14.9 dB of trim, a hot input gives a negative value, and <span class="mono">vu_data[−n]</span> then reads the end of <span class="mono">halfdb_data</span> as LED bits. v103 adds <span class="mono">max(r0,0)</span>. The peak dot was already safe for overs up to 3 dB, because it reads <span class="mono">pk_data[pk+6]</span> from a 262-entry table.</li>
    <li><b>The phase table can still overrun.</b> <span class="mono">PhaseMeterGet</span> returns <span class="mono">trunc(128·y + 128)</span>, and y can be exactly 1.0 (bit-identical L and R, for example a mono AES source), giving 256. The v103 clamp for phase is commented out and <span class="mono">phase_data</span> is declared [256] (the .dat file has 256 entries plus a blank line). Index 256 is the next variable; if the linker keeps declaration order that is <span class="mono">vumeter_wspace[0]</span>, and the meter shows LEDs 1, 2 and 4 instead of LED 1 ${inf}. Analog inputs never hit it because ADC noise keeps L ≠ R. Try "Tone, L = R" on an AES input.</li>
    <li><b>Comments and code disagree about which chain carries what.</b> The declarations say meter3 anc = lock bits and meter4 anc = phase bits. The code does the opposite: <span class="mono">translate_meter_results</span> writes phase pairs 3/4 into <span class="mono">meter3_ancl/ancr</span>, and <span class="mono">refresh_lock_status</span> writes locks 3/4 into <span class="mono">meter4_ancl/ancr</span>. Since units shipped, the board must follow the code.</li>
    <li><b>Left and right are crossed in the naming.</b> v101 swapped every result index because "rights are first now". After the swap, <span class="mono">meter1_left</span> takes <span class="mono">vu_results[0]</span>, which <span class="mono">update_phase_audio</span> calls "right 1". Either the comments or the row naming is crossed; this simulator assumes the shipped panel showed L on the upper row ${inf}. The comments in <span class="mono">update_phase_audio</span> also label index 5 "left 4" where it is right 4. <span class="mono">input_cal_fix</span> is commented (L1),(L2),(R1),(R2) but is applied in audio_in_float order (R first).</li>
    <li><b>The phase meter sees a held signal.</b> <span class="mono">update_phase_audio</span> runs in <span class="mono">main</span>, but <span class="mono">_PhaseMeterCalc</span> runs every ISR. Since v102's <span class="mono">idle</span> makes main run once per two samples, the phase meter averages each held value twice. Harmless at audio frequencies, but it is not the per-sample design the module expects.</li>
    <li><b>Boot calibration is −15 dB.</b> <span class="mono">input_cal_fix</span> starts as 0,1,0,1,0,0,0,0, i.e. <span class="mono">trim[0]</span> = −15 dB. Until the PIC's first SPORT1 frame arrives, the meters read about 15 dB low; the <span class="mono">input_cal_float</span> initialiser (1.41) is overwritten on the first pass. <span class="mono">anc_data</span> starts with the AES lamp bits on (0x02) and the video bits off, so the screens stay dark until the PIC speaks.</li>
    <li><b>The peak offset is deliberate.</b> The ISR multiplies every sample by 1.412537 (+3 dB) so the VU (a mean-square detector) reads a sine's peak level; the peak table is read 6 half-dB steps later to take those 3 dB back off. So 0 on the scale is −20 dBFS sine peak on both the bar and the dot.</li>
    <li><b>Peak mode is dead code.</b> <span class="mono">VUMeterEdit</span> (PPM/PEAK mode, peak hold 0–200) is never called, so the meter is always in PPM mode (attack 2.2 ms, decay ≈ 6.7 dB/s on the power average). The original decay constant (0.000959364) is still in a comment.</li>
    <li><b>Leftovers.</b> <span class="mono">bit set ustat1 FLG5; //testing</span> in <span class="mono">shift_led_data</span> sets chain 2's data line at clock 29, while the clock is already high, so it does nothing. <span class="mono">bit clr ustat1 FLG4|FLG5|FLG4|FLG5</span> in mux_ctl repeats two flags (FLG6/FLG7 meant). The header comment says FLAG9 is the clock, the code uses FLG10. The two "testing" writes to <span class="mono">dma_out_a</span> are overwritten a few lines later. vms44_INIT.ASM is headed "INTERRUPT VECTOR TABLE". The spt1 vector still carries Analog Devices' AD1819 codec demo comments. <span class="mono">sport1_isr</span> is a bare <span class="mono">rti</span> and SPR1I stays masked: SPORT1 runs on DMA alone.</li>
    <li><b>The AES outputs are a by-product.</b> The ISR also writes every calibrated input (×0.708, cancelling the +3 dB) into <span class="mono">dma_out_a/b</span>, which the CPLD sends to <span class="mono">data_out1–4</span> (<span class="mono">DT0A & TFSO</span> …) and the CS8420s transmit. An analog input therefore also appears as 48 kHz AES at the rear, including any PIC trim.</li>
    <li><b>v1.00's LED test no longer matches its tables.</b> <span class="mono">testing_leds</span> walks <span class="mono">led_test_counter</span> 0…28, written for the 29-entry <span class="mono">vms44_vu_data_29.dat</span>, but those includes are commented out and the 256-entry tables are loaded, so the sweep only covers +14 down to +7. It also loads <span class="mono">phase_data</span> from the pk file.</li>
    <li><b>Where the files are.</b> The VMS44 CPLD project (<span class="mono">vms44-1/-2/-3</span>) is filed in the SMS folder, compiled in 2006 from <span class="mono">h:\\sms\\altera\\v100</span>: the SMS4 was rebuilt on the VMS44-3 board and shares SHARC image VMS443V103. The PIC source is missing (<span class="mono">vms-44/pic/vms44se/</span> is empty). <span class="mono">vms1frt.dxf</span> is titled "VMS1 FRONT PANEL" but still contains text from an IMPM05 impedance-matching-panel drawing ("20 TB -3 WAY", "PUNCH 0.500 SQ - 20 REQ'D", "19 PITCHES OF 0.800"), so it was started from that drawing. The VMS33 manual (2006 files) covers the three-screen model only.</li>
    <li><b>Hardware details from the reports.</b> The meter board has 259 LEDs: 4 × (56 bar + 5 phase + 3 lamp) + 3 more (L257–L259) whose job is not known. Red LEDs sit at −1, 0, +1 and +10 … +14 on each bar and at the −1 end of each phase column. Its meter pitch (104.521 mm) equals the DXF window pitch (4.115 in). The readme notes R2/R3 changed to 39 K on later units.</li>
  </ol>`)
  + card('Main inferred assumptions', `<ul class="small">
    <li>PIC behaviour (DIP decoding, calibration numbers, lock-bit meaning, video logic, 10 ms frame cadence): its source is missing; modelled from the VMS33 manual and the SHARC/CPLD side.</li>
    <li>audio-clock = 12.288 MHz (256 fs), which makes lrclock = 48 kHz as the code expects.</li>
    <li>Cycle counts of the ISR and main loop, boot and PROM-load times.</li>
    <li>+24 dBu = 0 dBFS for analog inputs, so 0 VU = +4 dBu = −20 dBFS.</li>
    <li>Front-panel layout outside the DXF: the meter strip under the displays, button position, rack ears; the rear-panel layout comes only from the BOM connector counts.</li>
    <li>Upper LED row = L, lower = R; phase LED order (+1 at the top, red −1 at the bottom) from the centroid colours and the VMS33 drawing.</li>
  </ul>`)
  + card('Files used', `<ul class="small mono">
    <li>XXX - VMS - #Engineering #OBSOLETE/vms-44/sharc/v1.00, v1.00/i2s version, v100, v101, v102, v103/*</li>
    <li>…/vms-44/readme.txt · vms.zip (vms/vms44-1-bom.txt, vms44-2-bom.txt, vms44-1 centroid.txt, vms44-2 centroid.txt)</li>
    <li>…/vms-44/vms1frt.dxf · vms44-2.sta · vms44-2.tst · vms44-12 - #PNP #2016/vms44-1_2_iss2-pnp-T.prg</li>
    <li>…/vms33/VMS33 Manual.wpd · VMS33MANU.cdr (→ assets/vms-vms33-cover.png)</li>
    <li>XXX - SMS - #Engineering #OBSOLETE/SMS - #SOFTWARE #Altera/v100/vms44-1.rpt</li>
    <li>SOFTWARE LISTINGS - #Engineering.xls (VMS44 / VMS33 / VMS44SE rows)</li></ul>`);
}

/* ---------------- register ---------------- */
SIM.register({
  id:'vms', product:'VMS', name:'VMS44 · video and audio monitoring system (2002|35)', year:2002, duration:1,
  folder:'XXX - VMS - #Engineering #OBSOLETE', family:'Obsolete products', depth:'Full model',
  summary:'A four-screen video monitor with a 28-segment stereo VU/peak meter, phase column and status lamps under each screen. An ADSP-21065L SHARC meters four analog or AES stereo inputs and drives four MM5450 LED drivers; a CPLD makes the clocks and a PIC runs the switches and screens.',
  highlights:['Runs the real VU, PPM and phase filters and lookup tables at 48 kHz over the first second after power-on','Panel drawn to scale from vms1frt.dxf and the meter-board LED centroid file','Bit-level scopes of the CPLD serial slots and the 36-bit MM5450 frames','Firmware versions v1.00 to v103 selectable, including the LED test','Findings: an address-instead-of-data sync check, table overruns, crossed comments'],
  stepUnits:[{label:'1 sample (20.8 µs)', period:()=>1/C.FS},{label:'1 main pass', period:()=>passLen()},{label:'1 LED frame (6.25 ms)', period:()=>C.MUX/C.FS},{label:'1 ms',period:()=>0.001},{label:'1 SPORT0 bit (163 ns)', period:()=>1/6.144e6}],
  zooms:[[1,'1 s (whole)'],[0.1,'100 ms'],[0.025,'25 ms (4 LED frames)'],[0.002,'2 ms (one LED shift)'],[0.0002,'200 µs (10 samples)'],[0.00003,'30 µs (one sample)'],[0.000003,'3 µs (bits)']],
  defaultZoom:0,
  init(){ SIM.seek(0.25); },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the VMS44', render:viewTutorial},
    {id:'second', label:'One second, sample by sample', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
