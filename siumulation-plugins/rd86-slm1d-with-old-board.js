/* =====================================================================
   RD86 — SLM-1D with old board (Ward-Beck Systems R&D, 2016|49)
   Plugin for the WBS Device Simulator (../siumulation.html)

   What RD86 is: one afternoon (25 Feb 2016) spent making the 2002 SLM-1
   ADSP-21065L + CS8427 "old board" drive the newer SLM1-4 57-LED meter head.
   The engineer took the digital master sharc/slm-1-v1.01 (June 2005), and grafted
   on the 57-LED display engine of sharc/slm1v102 analog (Nov 2006 = POD3A's code):
   the slm1_* tables, single-side 36-bit MM5450 frames, the DATA2 high-byte split
   and the +6 table offsets. Everything else was left as it was.

   Sources used (all in this archive):
   - ENGINEERING - 2016 RD FILES/RD86-SLM1D with old board/V030000/  slm-1-main.asm (2016-02-25 13:03),
       SLM-1n.dpj (13:00, "generated Thu Feb 25 16:11:47 2016"), SLM-1n.mak (13:12, VisualDSP 4.0),
       slm-1_INIT.ASM, slm-1_ISR_table.ASM, vumeter.asm, phasemeter.asm, cs8427_ctl_dat.dat,
       sdm_*_data*.dat, slm1_*_data*.dat, Debug/vms44_main.asm
   - #SLM #SERIES - To Delete/SLM - #Engineering - To Delete/SLM-1/sharc/ slm-1-v1.00, v1.01, v1.02,
       v1.02test, slm1v100/101/102 analog (the master copies compared by MD5)
   - #POD #SERIES/POD3A - #Master/POD3A - #Engineering/sharc/v100, working v101 (same slm1_* tables)
   - .../SLM-1/PCB/SLM-1-4/OBSOLETE/slm1-4iss1.net (U6 PHASE1-9, LOCK1-6, L, R nets; U102 receiver)
   - .../SLM-1/SLM1 MANUAL.pdf (2003: 41 LEDs, 7-LED phase, LOCK/ERROR), SLM1 MANUAL mod.pdf (2007),
       SLM1 MANUAL .doc (2014: 57 LEDs)
   - SLM & SLM-RMK1&2 - #ARTWORK #DA #2016/SLM-1M7-SILK(CURVE).cdr and SLM-1M2-SILK(CURVE).cdr
       (the cuts made for slm.js, copied here as rd86-slm1d-with-old-board-*.png), PICS/*.jpg
   - siumulation-plugins/slm.js and pod3a.js (their decoded tables and head wiring are reused)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const Y = y => SIM.year(y);
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const ASSET = 'siumulation-plugins/assets/rd86-slm1d-with-old-board-';
const ID = 'rd86-slm1d-with-old-board';

/* ---------------- constants from the source ---------------- */
const C = {
  VU:  {32000:0.0005754806, 44100:0.0004176153, 48000:0.0003836906, 96000:0.0001918637},   // VU_32 … VU_96
  ATT: {32000:0.03394912,   44100:0.02475070,   48000:0.02276277,   96000:0.01138138},     // PPM_ATTACK_*
  D1:  {32000:0.0000575630, 44100:0.0000417694, 48000:0.0000383757, 96000:0.0000191880},   // peak_decay_1_* "type2(3 seconds)"
  D2:  {32000:0.0001151226, 44100:0.000083537,  48000:0.0000767499, 96000:0.0000383757},   // peak_decay_2_* "type1(1 second)"
  EMU: {96000:301, 48000:598, 44100:647, 32000:897},  // sample_rate_calc: expected emuclk difference (32 k is a range test; 897 inferred)
  PK_HOLD: 200000, PPM_HOLD: 200000, PK_THRESH: 0.707,
  MUX: 300, SHIFT: 72, FLUSH: 107,
  ALPHA: 0.999, THRES: 1e-4,
  CCLK: 60e6,                    // inferred: 30 MHz CLKIN × 2 (21065L); not in the archive
  ISR_CYC: 260, TRANSLATE_CYC: 700,   // inferred cycle counts
  SPORT1_WORD: 24*2*4097/60e6,   // RDIV1 = 0x00171000: RFSDIV 23, RCLKDIV 4096 → one 10-bit word per 24 SCLK (inferred CCLK)
  BOOT: 0.010,                   // PROM boot + Init_dsp (100×75 flush, 10 000-loop reset delay) ≈ 10 ms, inferred
};
C.CS_POLL = 18*C.SPORT1_WORD;    // 18-word CS8427 control frame ≈ 59 ms per refresh of cs8427_in[]
const FSS = [32000, 44100, 48000, 96000];
const fsClass = fs => fs>=60000? 96000 : fs>=46000? 48000 : fs>=36000? 44100 : 32000;

/* ---------------- MD5 check against the master copies (computed 2026|59 from the archive) ---------------- */
const HCOLS = ['slm-1-v1.00','slm-1-v1.01','slm-1-v1.02','slm-1-v1.02test','slm1v100 analog','slm1v101 analog','slm1v102 analog','POD3A v100','POD3A working v101'];
const HASH = [  // [file, rd86 md5 (first 8), …per column: '=' same, '-' absent, else that copy's md5]
  ['slm-1-main.asm','26999e8c','32669b3d','32669b3d','d96c1dc5','33236349','d7238c5e','0ba6bb7d','60d0364e','16401085','463afc2b'],
  ['SLM-1n.dpj','113a9cc4','437c48b5','4822cf4e','1c03c4f4','33d3b482','-','-','-','-','-'],
  ['SLM-1n.mak','ede8ed9f','bce3fd9d','bce3fd9d','bce3fd9d','bce3fd9d','-','-','-','-','-'],
  ['slm-1_INIT.ASM','9bdac393','=','=','ef9b95ae','ad272115','f4af6a3a','f4af6a3a','f4af6a3a','f4af6a3a','680d2dc5'],
  ['vumeter.asm','e0655fbc','=','=','=','=','4ca5882e','4ca5882e','4ca5882e','4ca5882e','f7e339d4'],
  ['sdm_phase_data.dat','b2a57cd3','=','=','=','=','=','=','daf66900','daf66900','daf66900'],
  ['SLM-1.dpj','34ac6297','=','=','=','=','2b2826b1','47dc891f','039216fe','dd68f101','ac0ed6a7'],
  ['SLM-1.mak','fd973fcd','=','=','=','=','dc7aa5a3','36edcdd3','debbdd58','5e75922e','debbdd58'],
  ['math.asm','2fcfeb2a','=','=','=','=','=','=','=','=','d5798e1d'],
  ['phasemeter.asm','d959e2d1','=','=','=','=','=','=','=','=','d4939699'],
  ['slm1_vu_data1.dat','43bfda41','-','-','-','-','-','-','=','=','='],
  ['slm1_vu_data2.dat','c3356ac1','-','-','-','-','-','-','=','=','='],
  ['slm1_vu_data3.dat','bc518006','-','-','-','-','-','-','=','=','='],
  ['slm1_pk_data1.dat','42d6050f','-','-','-','-','-','-','=','=','='],
  ['slm1_pk_data2.dat','9cfe3cad','-','-','-','-','-','-','=','=','='],
  ['slm1_pk_data3.dat','eab91bce','-','-','-','-','-','-','=','=','='],
  ['slm1_vu_data.c','e171019c','-','-','-','-','-','-','=','=','='],
  ['slm1_vu_data1','57436e82','-','-','-','-','-','-','=','=','='],
  ['cs8427_ctl_dat.dat · cs8427_ctl_datx.dat','4e8661c3','=','=','=','=','=','=','=','=','='],
  ['sdm_vu/pk_data_1-3.dat (6 files)','…','=','=','=','=','=','=','=','=','='],
  ['def21065l.h · new65Ldefs.h · stddef.h · sysdef.h · math.h · phasemeter.h · vumeter.h','…','=','=','=','=','=','=','=','=','='],
  ['trim_data · volume_data · point_one_dB_table · halfdb_data (.dat)','…','=','=','=','=','=','=','=','=','='],
  ['slm-1_ISR_table.ASM · slm-1_LDF.LDF','…','=','=','=','=','=','=','=','=','='],
  ['Debug/vms44_main.asm','9e603279','=','=','=','=','=','=','=','=','='],
];

/* ---------------- device state ---------------- */
const D = {
  power: true, boot0: false,
  plugged: true, plugT: null,
  fs: 48000,
  src: 'tone', level: -20, freq: 1000, phase: 'in',
  dip: { bs1:false, bs0:false, cal1:true, cal0:true },   // true = ON. Manual default: CAL0/CAL1 ON = −20 dBFS; BS1 OFF = peak hold on
  eng: 'rd86',          // after-head engine: 'v101' (v1.01 unchanged) · 'rd86' (as archived) · 'fix' (what-if patch, inferred)
  view: 'eye',          // 'eye' or 'inst'
  hashRun: false,
  log: [],
};
const ENG = { v101:'v1.01 code unchanged (first try)', rd86:'RD86 as archived (25 Feb 2016)', fix:'What-if: RD86 + 9-LED phase table + lock bits ('+'inferred'+')' };
const flags = () => { const d=D.dip; return { f0:d.bs1?0:1, f1:d.bs0?0:1, f2:d.cal1?0:1, f3:d.cal0?0:1 }; };   // ON = contact to ground = 0 (inferred pull-ups)
const meterCal = () => { const f=flags(); return 4*(f.f2 + 2*f.f3) - 6; };     // read_dipswitch: ((astat & cal_mask)>>21)·4 − 6
const nominal = () => -20 + (meterCal()+6)/2;                                     // manual table 2: −20/−18/−16/−14 dBFS
const holdOn = () => flags().f0===1;
const conn = t => D.plugT===null? D.plugged : (t < D.plugT ? !D.plugged : D.plugged);
const pollT = t => Math.floor(t/C.CS_POLL)*C.CS_POLL;           // cs8427_in[] is refreshed once per 18-word DMA cycle
const lockSeen = t => conn(pollT(t) - 1e-9);

/* ---------------- the test source (not part of the meter) ---------------- */
function hsh(i){ i=(i|0)^61^((i|0)>>>16); i=(i+(i<<3))|0; i^=i>>>4; i=Math.imul(i,0x27d4eb2d); i^=i>>>15; return (i>>>0)/4294967296; }
const SRCS = { tone:'Steady tone', burst:'Tone burst 0.1–0.4 s', program:'Programme (music-like)', silence:'Silence' };
const PHS = { in:'in phase', '90':'90°', '180':'180° (polarity flip)', L:'left only', unc:'uncorrelated' };
function sig(n, fs){
  const t=n/fs, amp=Math.pow(10, D.level/20), w=2*Math.PI*D.freq;
  if (D.src==='silence') return [0,0];
  if (D.src==='tone' || D.src==='burst'){
    let g=1; if (D.src==='burst'){ const ph=t-Math.floor(t); g=(ph>=0.1&&ph<0.4)?1:0; }
    const L=g*amp*Math.sin(w*t);
    const R = D.phase==='in'? L : D.phase==='180'? -L : D.phase==='90'? g*amp*Math.sin(w*t-Math.PI/2) : D.phase==='L'? 0 : g*amp*Math.sin(w*1.5013*t+1);
    return [L,R];
  }
  const seg=Math.floor(t/0.125), tl=t-seg*0.125;
  const env=(0.25+0.75*hsh(seg*7+1))*Math.exp(-tl*6)+0.06, f=110*Math.pow(2,Math.floor(hsh(seg*7+2)*30)/12), k=2*Math.PI*f*t;
  const a=amp*2.2*env, L=a*(0.7*Math.sin(k)+0.25*Math.sin(2*k+1)+0.3*(hsh(n*3+11)-0.5)*2);
  let R; if (D.phase==='L') R=0; else if (D.phase==='unc'){ const s2=Math.floor(t/0.11), e2=(0.25+0.75*hsh(s2*9+3))*Math.exp(-(t-s2*0.11)*6)+0.06; R=amp*2.2*e2*(0.7*Math.sin(2*Math.PI*110*Math.pow(2,Math.floor(hsh(s2*9+4)*30)/12)*t)+0.3*(hsh(n*5+17)-0.5)*2); }
  else { R=a*(0.7*Math.sin(k+(D.phase==='90'?Math.PI/2:0.3))+0.25*Math.sin(2*k+1.4)+0.3*(hsh(n*5+17)-0.5)*2); if (D.phase==='180') R=-R; }
  return [Math.max(-1,Math.min(1,L)), Math.max(-1,Math.min(1,R))];
}

/* ---------------- the firmware, sample by sample (shared by both engines: vumeter.asm, phasemeter.asm,
   sample_rate_calc, read_dipswitch and the hold code are byte-identical in v1.01 and RD86) ---------------- */
const rawR = p => p>0 ? Math.min(255, Math.round(-20*Math.log10(p))) : 255;   // VUMeterGet: −2·10·log10, min 255
const clampR = r => Math.max(0, Math.min(255, r));
let S=null, SK='';
function sim(){
  const key = JSON.stringify([D.power,D.boot0,D.plugged,D.plugT,D.fs,D.src,D.level,D.freq,D.phase,D.dip]);
  if (key===SK && S) return S; SK=key;
  const fs=D.fs, N=fs, pre=D.boot0?0:fs, fc=fsClass(fs);
  const R = { fs, N, fc, xL:new Float32Array(N), xR:new Float32Array(N), vu:[new Float32Array(N),new Float32Array(N)], pp:[new Float32Array(N),new Float32Array(N)],
    hold:[new Uint8Array(N).fill(255),new Uint8Array(N).fill(255)], ov:[new Uint8Array(N),new Uint8Array(N)], ph:new Uint16Array(N).fill(128), y:new Float32Array(N), lk:new Uint8Array(N),
    frames:[], bootN: D.boot0? Math.round(C.BOOT*fs) : -Infinity, cal: meterCal(), resets:0 };
  const TV=C.VU[fc], TA=C.ATT[fc], TD = flags().f1===0? C.D1[fc] : C.D2[fc], cal=R.cal, hOn=holdOn();
  let vu=[0,0], pp=[0,0], sA=0, dA=0, mux=C.MUX, bit31=0, hold=[255,255], hcnt=[0,0], over=[0,0], ocnt=[1,1];
  for (let m=-pre; m<N; m++){
    const t=m/fs, c=conn(t);
    const x = (D.power && c)? sig(m,fs) : [0,0];          // CS8427 unlocked: SDOUT muted (inferred)
    if (m>=0){ R.xL[m]=x[0]; R.xR[m]=x[1]; }
    if (!D.power || m < R.bootN) continue;
    for (let ch=0; ch<2; ch++){ const p=x[ch]*x[ch]; vu[ch]+=(p-vu[ch])*TV; const a=pp[ch]+(p-pp[ch])*TA, d=pp[ch]+(p-pp[ch])*TD; pp[ch]=a>d?a:d; }
    sA = C.ALPHA*sA + (1-C.ALPHA)*Math.abs(x[0]+x[1]); dA = C.ALPHA*dA + (1-C.ALPHA)*Math.abs(x[0]-x[1]);
    const rv=[clampR(rawR(vu[0])+cal), clampR(rawR(vu[1])+cal)], rp=[clampR(rawR(pp[0])+cal), clampR(rawR(pp[1])+cal)];
    let yy=0; if (sA+dA>=C.THRES) yy=(sA-dA)/(sA+dA); yy=Math.max(-1,Math.min(1,yy)); const phN=Math.trunc(128*yy+128);
    const locked = lockSeen(t);
    if (--mux===0){                                         // mux_ctl → translate_meter_results
      bit31 ^= 1; mux=C.MUX;
      const F = { n:m, side: bit31?0:1, latch:m+C.SHIFT, vu:rv.slice(), pk:rp.slice(), hold:hold.slice(), over:over.slice(), ph:phN, locked };
      if (!locked){ F.vu=[255,255]; F.pk=[255,255]; F.hold=[255,255]; F.over=[0,0]; F.ph=255; hold=[255,255]; over=[0,0]; }   // "AES mode force meter off if no lock"
      R.frames.push(F);
    }
    for (let ch=0; ch<2; ch++){ if (hcnt[ch]) hcnt[ch]--; if (ocnt[ch]){ ocnt[ch]--; if (ocnt[ch]===0) over[ch]=0; } }
    for (let ch=0; ch<2; ch++) if (Math.abs(x[ch]) > C.PK_THRESH){ over[ch]=1; ocnt[ch]=C.PK_HOLD; }   // test_peaks_left_1 / right_1
    if (hOn){                                                // ppm_hold_l / ppm_hold_r, then "if ne jump bs1_is_off1" on R's flags
      const step = ch => { const pk=rp[ch]; if (pk<=hold[ch]){ const eq=pk===hold[ch]; hcnt[ch]=C.PPM_HOLD; hold[ch]=pk; return eq; } if (hcnt[ch]!==0) return false; hold[ch]=255; return true; };
      step(0); if (step(1)){ hold[0]=255; hold[1]=255; if (m>=0) R.resets++; }
    } else { hold[0]=255; hold[1]=255; }
    if (m>=0){ for (let ch=0; ch<2; ch++){ R.vu[ch][m]=vu[ch]; R.pp[ch][m]=pp[ch]; R.hold[ch][m]=hold[ch]; R.ov[ch][m]=over[ch]; } R.ph[m]=phN; R.y[m]=yy; R.lk[m]=locked?1:0; }
  }
  S=R; return S;
}
const idx = t => { const s=sim(); return Math.max(0, Math.min(s.N-1, Math.floor(t*s.fs))); };
function frameAt(t){ const s=sim(), F=s.frames, n=Math.floor(t*s.fs); let lo=0,hi=F.length-1,k=-1; while(lo<=hi){ const md=(lo+hi)>>1; if (F[md].latch<=n){k=md;lo=md+1;} else hi=md-1; } return k; }
function lastMux(t){ const s=sim(), F=s.frames, n=Math.floor(t*s.fs); let lo=0,hi=F.length-1,k=-1; while(lo<=hi){ const md=(lo+hi)>>1; if (F[md].n<=n){k=md;lo=md+1;} else hi=md-1; } return k; }

/* ---------------- lookup tables ----------------
   OLD (sdm_*_data*.dat, the 41-LED head): decoded row by row from the files.
   NEW (slm1_*_data*.dat, the 57-LED head): pod3a.js's formulas, which reproduce the files (r = index − 6). */
const word = top => top<1? 1 : (Math.pow(2,top+1)-1)>>>0;
const vu1o = i => word(i<13?16 : i>=43?0 : 15-Math.floor((i-13)/2));
const vu2o = i => word(i<45?16 : i<71? 15-Math.floor((i-45)/2) : i<75?2 : i<79?1 : 0);
const vu3o = i => word(i<83?8 : i<87?7 : i<91?6 : i<95?5 : i<99?4 : i<107?3 : i<115?2 : i<123?1 : 0);
const dot = b => b? ((1<<b)|1)>>>0 : 1;
const pk1o = i => dot(i<13?16 : i<43? 15-Math.floor((i-13)/2) : 0);
const pk2o = i => dot(i<43?0 : i<71? 16-Math.floor((i-43)/2) : i<75?2 : i<79?1 : 0);
const pk3o = i => dot(i<79?0 : i<83?8 : i<87?7 : i<91?6 : i<95?5 : i<99?4 : i<107?3 : i<115?2 : i<123?1 : 0);
const OLD_PH_ROWS = [[220,[12]],[184,[12,13]],[148,[11,12,13]],[108,[11,12,13,14]],[72,[11,12,13,14,15]],[36,[11,12,13,14,15,16]],[0,[11,12,13,14,15,16,17]]];
const oldPhaseBits = n => { for (const [lo,b] of OLD_PH_ROWS) if (n>=lo) return b; return OLD_PH_ROWS[6][1]; };
const oldPhaseWord = n => oldPhaseBits(n).reduce((a,b)=>a|(1<<b),0)>>>0;
const newPhaseBits = n => n>=255? [] : n>=218? [1] : n>=182? [1,2] : n>=146? [1,2,3] : n>=106? [1,2,3,4,5] : n>=70? [1,2,3,4,5,6] : n>=34? [1,2,3,4,5,6,7] : [1,2,3,4,5,6,7,8,9];
const bitsOf = (w, from, to) => { const a=[]; for (let b=from;b<=to;b++) a.push((w>>>b)&1); return a; };

/* the 36-bit streams on FLG4/5/6 for one translate_meter_results + shift_led_data */
function streams(f, eng){
  const d=[new Uint8Array(36),new Uint8Array(36),new Uint8Array(36)], why=[new Array(36).fill(''),new Array(36).fill(''),new Array(36).fill('')];
  if (eng==='v101'){
    const W = ch => { const vu=f.vu[ch], pk=f.pk[ch]+6, h=f.hold[ch]+6, ov=f.over[ch]?(1<<17):0;
      const w1 = (vu1o(vu)|pk1o(pk)|ov|(ch? pk1o(h) : (pk1o(h)&0xfffffffd)))>>>0;
      const w2 = (vu2o(vu)|pk2o(pk))>>>0;
      const w3 = ch? ((((vu3o(vu)|pk3o(pk))>>>1) | (f.locked? 0x100 : 0x200))>>>0) : ((vu3o(vu)|pk3o(pk)|oldPhaseWord(f.ph)|0x400)>>>0);
      return ch? [w1>>>1, w2>>>1, w3] : [w1,w2,w3]; };
    const Lw=W(0), Rw=W(1);
    for (let q=0;q<3;q++){ for (let p=0;p<18;p++){ d[q][p]=(Lw[q]>>>p)&1; d[q][18+p]=(Rw[q]>>>p)&1; } }
    d[0][17] && (why[0][17]='peak L'); d[0][34] && (why[0][34]='peak R');
    return {d, why, two:true};
  }
  const ch=f.side, rv=f.vu[ch], rp=f.pk[ch], rh=f.hold[ch];
  d[0][0]=d[1][0]=d[2][0]=1;
  for (let k=1;k<=26;k++) if (rv<=53-2*k){ d[0][k]=1; why[0][k]='vu'; }
  for (let k=1;k<=35;k++){ const T = k>=21 ? 121-2*k : 163-4*k; if (rv<=T){ d[1][k]=1; why[1][k]='vu'; } }
  for (let k=1;k<=26;k++) if (rp>=45-2*k && rp<=46-2*k){ d[0][k]=1; why[0][k]=why[0][k]||'pk'; }
  for (let k=17;k<=34;k++) if (rp>=113-2*k && rp<=114-2*k){ d[1][k]=1; why[1][k]=why[1][k]||'pk'; }
  for (let k=2;k<=16;k++) if (rp>=145-4*k && rp<=148-4*k){ d[1][k]=1; why[1][k]=why[1][k]||'pk'; }
  for (let k=2;k<=26;k++) if (rh>=45-2*k && rh<=46-2*k){ d[0][k]=1; why[0][k]=why[0][k]||'hold'; }
  if (f.over[ch]){ d[0][17]=1; why[0][17]=why[0][17]||'peak'; }
  const ph = eng==='fix'? newPhaseBits(f.ph) : oldPhaseBits(f.ph);
  ph.forEach(b=>{ d[2][b]=1; why[2][b]='phase'; });
  d[2][ch?16:17]=1; why[2][ch?16:17]=why[2][ch?16:17]||'select';
  if (eng==='fix'){ const lb=f.locked?10:11; d[2][lb]=1; why[2][lb]='lock'; }
  return {d, why, two:false};
}

/* ---------------- the two heads ---------------- */
// OLD 41-LED head (2002 SLM-1). Output map from the sdm_* table comments; layout inferred.
const OLD_LAB = [-38,-36,-32,-28,-26,-24,-22,-20, -18,-16,-15,-14,-13,-12,-11,-10,-9,-8,-7,-6,-5,-4,-3,-2, -1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14]; // j = 0 bottom … 39 top
const oldJ = (line, k) => line===2? (k>=1&&k<=8? k-1 : -1) : line===1? (k>=1&&k<=16? 7+k : -1) : (k>=1&&k<=16? 23+k : -1);
function oldHead(st){
  const P = { bar:[new Uint8Array(40),new Uint8Array(40)], peak:[0,0], phase:new Uint8Array(7), lock:0, err:0, test:0 };
  for (let line=0; line<3; line++) for (let side=0; side<2; side++) for (let k=1;k<=17;k++){
    const pos = side? 17+k : k; if (pos>35 || !st.d[line][pos]) continue;
    if (line===0 && k===17){ P.peak[side]=1; continue; }
    const j = oldJ(line,k); if (j>=0) P.bar[side][j]=1;
  }
  const PH_ORDER=[12,13,11,14,15,16,17];      // the order the table fills them, +1 → −1 (inferred wiring)
  PH_ORDER.forEach((b,q)=>{ if (st.d[2][b]) P.phase[q]=1; });
  P.lock = st.d[2][26]; P.err = st.d[2][27]; P.test = st.d[2][10];
  return P;
}
// NEW SLM1-4 57-LED head. U3 = DATA1, U5 = DATA2, U6 = DATA3 (slm1-4iss1.net, mapping as in slm.js).
const LAB57 = []; for (let v=20; v>=-20; v--) LAB57.push(v); for (let v=-22; v>=-52; v-=2) LAB57.push(v);
const kOf = L => L>=-20? 20-L : 40+(-L-20)/2;
const u5Lab = i => { const b=i-4, n = b>=16? 6+(30-b) : 22+2*(15-b); return -n; };
function newFrameOut(st){
  const o = { bar:new Uint8Array(57), why:new Array(57).fill(''), pr:0, mark:0, phase:new Uint8Array(9), lock:0, nolock:0, aux:[], sel:[st.d[2][17],st.d[2][16]] };
  for (let i=1;i<=26;i++) if (st.d[0][i]){ const k=kOf(i-6); o.bar[k]=1; o.why[k]=st.why[0][i]||'vu'; }
  for (let i=4;i<=34;i++) if (st.d[1][i]){ const k=kOf(u5Lab(i)); o.bar[k]=1; o.why[k]=st.why[1][i]||'vu'; }
  o.pr = st.d[1][1]; o.mark = st.d[1][2];
  for (let i=1;i<=9;i++) o.phase[i-1]=st.d[2][i];
  o.lock=st.d[2][10]; o.nolock=st.d[2][11];
  for (let i=12;i<=15;i++) if (st.d[2][i]) o.aux.push('LOCK'+(i-9));
  return o;
}

/* what both heads show at time t */
function display(t){
  const s=sim(), out = { on:D.power, booting:false, k:-1, old:null, nw:null };
  if (!D.power) return out;
  if (Math.floor(t*s.fs) < s.bootN){ out.booting=true; return out; }
  const k=frameAt(t); out.k=k; if (k<0) return out;
  const F=s.frames[k];
  out.old = oldHead(streams(F,'v101'));
  const fr = [F]; if (D.view==='eye' && k>0) fr.push(s.frames[k-1]);
  const N = { bar:[new Float32Array(57),new Float32Array(57)], why:[new Array(57).fill(''),new Array(57).fill('')], pr:[0,0], mark:[0,0], phase:new Float32Array(9), lock:0, nolock:0, aux:new Set(), sel:[0,0], frames:[] };
  const w = 1/fr.length;
  fr.forEach(f=>{ const o=newFrameOut(streams(f,D.eng)); N.frames.push(o);
    for (let c=0;c<2;c++) if (o.sel[c]){ N.sel[c]=1; for (let i=0;i<57;i++) if (o.bar[i]){ N.bar[c][i]+=w; N.why[c][i]=N.why[c][i]||o.why[i]; } if (o.pr) N.pr[c]+=w; if (o.mark) N.mark[c]+=w; }
    for (let q=0;q<9;q++) if (o.phase[q]) N.phase[q]+=w;
    if (o.lock) N.lock+=w; if (o.nolock) N.nolock+=w; o.aux.forEach(a=>N.aux.add(a)); });
  out.nw = N; out.F=F;
  return out;
}
const runTop = arr => { let top=null; for (let i=arr.length-1;i>=0;i--){ if (arr[i]>0) top=i; else break; } return top; };
const oldTop = (d,c) => { if (!d.old) return null; let top=null; for (let j=0;j<40;j++){ if (d.old.bar[c][j]) top=j; else break; } return top===null? null : OLD_LAB[top]; };
const newTop = (d,c) => { if (!d.nw) return null; const k=runTop(d.nw.bar[c]); return k===null? null : LAB57[k]; };
const fmtL = L => L==null? '—' : (L>0?'+'+L:String(L));

/* ---------------- user actions (each logs the code path) ---------------- */
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({ t:SIM.t, name, trace:tr }); if (D.log.length>60) D.log.length=60; SIM.refresh(); }
const DIPS = { bs1:['SW4','FLAG0','19'], bs0:['SW3','FLAG1','20'], cal1:['SW2','FLAG2','21'], cal0:['SW1','FLAG3','22'] };
const A = {
  dip(k){ D.dip[k]=!D.dip[k]; const on=D.dip[k], [sw,fl,bit]=DIPS[k];
    act(`Rear DIP ${k.toUpperCase()} (${sw}) → ${on?'ON':'OFF'}`, T=>{
      if (!D.power){ T('Unit is off: nothing reads the switch.'); return; }
      T(`${k.toUpperCase()} ${on?'grounds':'releases'} ${fl} → reads ${on?0:1} (ON = 0, pull-up ${inf}); Init_dsp made FLAG0-3 inputs: "bit clr mode2 FLG0O|FLG1O|FLG2O|FLG3O"`);
      T(`sport0_isr: dm(astat_save)=astat — ${fl} is ASTAT bit ${bit}, saved every sample`);
      if (k==='cal0'||k==='cal1'){ const f=flags(); T(`read_dipswitch: r1 = astat_save & cal_mask (b#…0110…, bits 21-22) → lshift −21 = ${f.f2+2*f.f3}; r1·4 − 6 → meter_cal = ${meterCal()}`);
        T(`main_vuloop: vu_results = clamp(VUMeterGet(VU) + meter_cal, 0, 255); both heads slide ${(meterCal()+6)/2} dB → 0 VU = ${nominal()} dBFS (manual table 2 ✓)`);
        T('Unchanged from v1.01: RD86 kept the digital "·4 − 6" (2-dB steps); the analog v102 code it borrowed from uses "·8 − 14" (4-dB steps).'); }
      if (k==='bs0') T(`update_meter_parameters_${fsClass(D.fs)===44100?'441':fsClass(D.fs)/1000}: astat_save & BS0 mask (bit 20) → ${flags().f1?'ne: peak_decay_2 (24 dB in 1.5 s, PPM Type 1)':'eq: peak_decay_1 (24 dB in 3 s, PPM Type 2)'}`);
      if (k==='bs1') T(`sport0_isr: astat_save & BS1 mask (bit 19) → ${holdOn()?'ne: call ppm_hold_l; call ppm_hold_r (200 000-sample hold)':'eq: jump bs1_is_off0 → ppm_hold_left = ppm_hold_right = 255 (no hold)'}`);
    }); },
  plug(on){ D.plugged=on; D.plugT=SIM.t;
    act(on?'Connect the AES input (BNC)':'Unplug the AES input', T=>{
      T(`At ${SIM.fmtT(SIM.t)} the AES3 signal ${on?'returns':'disappears'} at the CS8427 receiver`);
      T(`SPORT1 DMA (tcb2_rx1a / tcb6_tx1a, 18 words of cs8427_ctl_dat.dat) re-reads register 16 into cs8427_in[5] every ${(C.CS_POLL*1000).toFixed(0)} ms (${inf})`);
      T('refresh_lock_status: lock_status = (cs8427_in[5] & 8192) ? error (bit 9) : lock (bit 8)');
      T(`translate_meter_results: "AES mode force meter off if no lock" → vu/pk/phase results = 255, ppm_hold = 255, pk_led = 0, FLG10O ${on?'cleared':'set'} "FOR PIC"`);
      T('Before (v1.01): lock_status is ORed into shift7 → the old head\'s LOCK or ERROR LED.');
      T(D.eng==='fix'? 'What-if: lock bit 10 / 11 → U6 LOCK1 (LOCK) or LOCK2 (NO LOCK).' : 'After (RD86): the "//r0=dm(lock_status); r1=r0 or r1;" lines are commented out — no lock LED is ever sent to U6.');
    }); },
  power(){ D.power=!D.power; D.boot0=D.power;
    act(D.power?'Power on (6 V adapter)':'Power off', T=>{
      if (!D.power){ T('All LEDs go dark.'); return; }
      T('PROM boot: elfloader image built with -bPROM -fHEX -l 21k/ldr/065L_prom.dxe (SLM-1n.mak)');
      T('rst_svc (slm-1_ISR_table.ASM, headed "VMS44"): call Init_dsp; jump start');
      T('Init_dsp: secondary registers + stacks, FLAG0-3 in / 4-11 out, flush: 100 × (75 FLG7 toggles), 10 000-loop delay');
      T('SPORT0 I²S (SRCTL0 = 0x013c09f1) with tcb0_rx0a; SPORT1 0x000c0d71, RDIV1 0x00171000 → CS8427 control DMA');
      T('start: VUMeterInit; FLG11 set → "take cs8427 out of reset"; main: sample_rate_calc, VUMeterGet / PhaseMeterGet loop');
    }); },
  settle(){ D.boot0=false; act('Settle (1 s pre-roll)', T=>T('The second now starts with the meters settled.')); },
  setFs(fs){ D.fs=+fs; act(`AES sample rate → ${fs/1000} kHz`, T=>{ const c=fsClass(D.fs);
    T(`sport0_isr now runs every ${SIM.fmtDur(1/D.fs)}; it stores emuclk in emuclk_prev[] each time`);
    T(`main: sample_rate_calc: |emuclk − emuclk_prev| ≈ ${C.EMU[c]} → update_meter_parameters_${c===44100?'441':c/1000}: VU ${C.VU[c]}, attack ${C.ATT[c]}`);
    T('Ballistics stay 300 ms / 5 ms / 1.5 or 3 s per 24 dB at every rate — this is v1.01 code RD86 kept (the analog v102 it borrowed from has fixed _52 constants).');
    T(`Not scaled: pk_hold = ppm_hold = 200 000 samples = ${(200000/D.fs).toFixed(2)} s; mux 300 samples = ${SIM.fmtDur(300/D.fs)} per side`); }); },
  setSrc(k,v){ D[k]=(k==='level'||k==='freq')?+v:v; act(`Test source: ${k} → ${v}`, T=>{ T('(The signal generator feeding the meter — not part of it.)'); T('CS8427 → SPORT0 DMA dma_in_a[0..1] → float by −31 → audio_in_float[] → VUMeterCalc / PhaseMeterCalc'); }); },
  setEng(e){ D.eng=e; act('After head engine → '+ENG[e], T=>{
    if (e==='v101') T('v1.01 sends 18 bits of the left words and 18 bits of the right words in each 36-clock frame. U6 outputs 16/17 (R/L select) are only set when the phase is strongly negative, so the SLM1-4 head stays mostly dark.');
    if (e==='rd86') T('RD86: shift_led_data picks shift1-4 (left) or shift5-8 (right) by BIT31 and sends all 36 bits of one side; DATA3 carries bit 17 (left) / bit 16 (right) → U6 L / R select.');
    if (e==='fix') T(`What-if (${inf}): sdm_phase_data.dat swapped for the 9-LED analog v102 table, and lock bit 10 / 11 ORed into both frames, as the 21262 v102 does. Not in the archive.`); }); },
  view(v){ D.view=v; act(v==='eye'?'View: as the eye sees it':'View: the instant (multiplex)', T=>T(v==='eye'?'Each SLM1-4 bar is drawn from the last two frames that selected it.':'Only the frame latched now is drawn; L and R alternate every 300 samples.')); },
  hash(){ D.hashRun=true; act('Hash check: RD86 vs the SLM master copies', T=>{ T('md5 of every file in V030000/ compared with sharc/slm-1-v1.00 … v1.02test, slm1v100-102 analog and POD3A v100 / working v101');
    T('29 files are byte-identical to slm-1-v1.00 and v1.01 (June 2005) — the digital master'); T('8 files (slm1_* tables and slm1_vu_data.c) are not in any digital master; they are identical to slm1v102 analog and both POD3A copies');
    T('3 files are new: slm-1-main.asm (edited), SLM-1n.dpj and SLM-1n.mak (re-saved in VisualDSP 4.0)'); }); },
  reset(){ Object.assign(D,{power:true,boot0:false,plugged:true,plugT:null,fs:48000,src:'tone',level:-20,freq:1000,phase:'in',eng:'rd86',view:'eye'}); Object.assign(D.dip,{bs1:false,bs0:false,cal1:true,cal0:true}); D.log=[]; SK=''; SIM.refresh(); },
};

/* ================================================================
   PANELS
   After: the SLM1-4 head behind the real SLM-1M7 lens silk (2016|49), coordinates as measured for slm.js.
   Before: the 2002 41-LED head. No artwork for it survives, so it is drawn from the sdm_* table comments
   and the 2003 manual (41 LEDs, 7-LED phase, LOCK / ERROR); the layout is inferred.
   Rear: the real SLM-1M2 rear silk (BNC, power jack, 4-way DIP).
   ================================================================ */
const BAR_X=[128,189], LEDY=k=>178.5+15*k, ZONE=k=>k<=11?0:k<=27?1:2;
const ON_COL=['#ff3b4f','#ffc23a','#b6ff3c'], OFF_COL=['#3a1418','#3a2c10','#1d2c12'];
const PH_X=q=>97+q*15.25, PH_Y=1111;
function newSVG(){
  let s=`<svg viewBox="0 0 318 1344" class="rdNew" role="img" aria-label="SLM1-4 head behind the real SLM-1M7 lens silkscreen" style="width:190px;max-width:100%;display:block;border-radius:6px;cursor:pointer">
    <defs><filter id="rdGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="318" height="1344" fill="#0c0d0e"/><g filter="url(#rdGlow)">`;
  for (let c=0;c<2;c++) for (let k=0;k<57;k++) s+=`<rect id="rdN${c}_${k}" x="${BAR_X[c]-8}" y="${LEDY(k)-4.6}" width="16" height="9.2" rx="1.6" fill="${OFF_COL[ZONE(k)]}"/>`;
  s+=`<rect id="rdNM0" x="83" y="474" width="15" height="9.5" rx="2" fill="${OFF_COL[0]}"/><rect id="rdNM1" x="219" y="474" width="15" height="9.5" rx="2" fill="${OFF_COL[0]}"/>`;
  s+=`<rect id="rdNP0" x="${BAR_X[0]-8}" y="1061" width="16" height="11" rx="2" fill="#3a2a10"/><rect id="rdNP1" x="${BAR_X[1]-8}" y="1061" width="16" height="11" rx="2" fill="#3a2a10"/>`;
  for (let q=0;q<9;q++) s+=`<rect id="rdNF${q}" x="${PH_X(q)-5.5}" y="${PH_Y-5}" width="11" height="10" rx="1.6" fill="${OFF_COL[2]}"/>`;
  s+=`<rect id="rdNNL" x="262" y="678" width="12" height="10" rx="2" fill="${OFF_COL[0]}"/><rect id="rdNLK" x="262" y="786" width="12" height="10" rx="2" fill="${OFF_COL[2]}"/></g>
    <image href="${ASSET}front-green.png" width="318" height="1344"/><image href="${ASSET}front-white.png" width="318" height="1344"/>
    <text id="rdNmsg" x="159" y="1290" text-anchor="middle" font-size="22" fill="#ffb43a"></text></svg>`;
  return s;
}
const OLD_ZONE = L => L>0? 0 : L>=-10? 1 : 2;
const OLDY = j => 870 - j*17.5;
function oldSVG(){
  let s=`<svg viewBox="0 0 300 1000" class="rdOld" role="img" aria-label="2002 SLM-1 41-LED head, drawn (layout inferred)" style="width:170px;max-width:100%;display:block;border-radius:6px">
    <rect width="300" height="1000" rx="6" fill="#0c0d0e"/><rect x="40" y="70" width="220" height="880" rx="14" fill="none" stroke="#2f8a3c" stroke-width="2"/>
    <text x="150" y="44" text-anchor="middle" font-size="15" fill="#64d06f">WARD-BECK SYSTEMS</text>
    <text x="150" y="985" text-anchor="middle" font-size="12" fill="#8a8f93">2002|35 head · drawn, layout ${'inferred'}</text><g filter="url(#rdGlowO)">
    <defs><filter id="rdGlowO" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  const BX=[112,188];
  for (let c=0;c<2;c++) for (let j=0;j<40;j++) s+=`<rect id="rdO${c}_${j}" x="${BX[c]-11}" y="${OLDY(j)-5.5}" width="22" height="11" rx="2" fill="${OFF_COL[OLD_ZONE(OLD_LAB[j])]}"/>`;
  for (let c=0;c<2;c++) s+=`<rect id="rdOK${c}" x="${BX[c]-9}" y="${OLDY(41)-6}" width="18" height="12" rx="6" fill="${OFF_COL[0]}"/>`;
  for (let q=0;q<7;q++) s+=`<rect id="rdOF${q}" x="${96+q*18-6}" y="905" width="12" height="11" rx="2" fill="${OFF_COL[2]}"/>`;
  s+=`<rect id="rdOLK" x="244" y="470" width="14" height="11" rx="2" fill="${OFF_COL[2]}"/><rect id="rdOER" x="244" y="525" width="14" height="11" rx="2" fill="${OFF_COL[0]}"/></g>`;
  for (let j=0;j<40;j+=1) if (j<8 || j%2===1 || OLD_LAB[j]===0) s+=`<text x="150" y="${OLDY(j)+4}" text-anchor="middle" font-size="10" fill="#e8e8e8">${Math.abs(OLD_LAB[j])}</text>`;
  s+=`<text x="150" y="${OLDY(41)+4}" text-anchor="middle" font-size="10" fill="#e8e8e8">PEAK</text>
    <text x="112" y="${OLDY(-1)+14}" text-anchor="middle" font-size="12" fill="#e8e8e8">L</text><text x="188" y="${OLDY(-1)+14}" text-anchor="middle" font-size="12" fill="#e8e8e8">R</text>
    <text x="96" y="938" text-anchor="middle" font-size="11" fill="#e8e8e8">+1</text><text x="150" y="938" text-anchor="middle" font-size="11" fill="#e8e8e8">PHASE</text><text x="204" y="938" text-anchor="middle" font-size="11" fill="#e8e8e8">−1</text>
    <text x="236" y="465" text-anchor="end" font-size="10" fill="#e8e8e8" transform="rotate(0)">LOCK</text><text x="236" y="520" text-anchor="end" font-size="10" fill="#e8e8e8">ERROR</text>
    <text x="64" y="300" font-size="11" fill="#64d06f" transform="rotate(-90 64 300)">PEAK RANGE</text><text x="64" y="700" font-size="11" fill="#64d06f" transform="rotate(-90 64 700)">VU RANGE</text>
    <text id="rdOmsg" x="150" y="960" text-anchor="middle" font-size="16" fill="#ffb43a"></text></svg>`;
  return s;
}
function paint(root, t){
  const d=display(t);
  const cache = svg => { if (!svg._e){ svg._e={}; svg.querySelectorAll('[id^=rd]').forEach(e=>svg._e[e.id]=e); } return svg._e; };
  const set = (E,id,frac,col,off) => { const e=E[id]; if (!e) return; const f = frac>0? col : off, o = frac>0 && frac<0.99? '0.55' : '1'; if (e._f!==f+o){ e.setAttribute('fill',f); e.setAttribute('fill-opacity',o); e._f=f+o; } };
  const nv=root.querySelector('.rdNew'); if (nv){ const E=cache(nv), N=d.nw;
    for (let c=0;c<2;c++) for (let k=0;k<57;k++) set(E,`rdN${c}_${k}`, N?N.bar[c][k]:0, ON_COL[ZONE(k)], OFF_COL[ZONE(k)]);
    for (let c=0;c<2;c++){ set(E,'rdNM'+c, N?N.mark[c]:0, '#ff3040', OFF_COL[0]); set(E,'rdNP'+c, N?N.pr[c]:0, '#ff9a2a', '#3a2a10'); }
    for (let q=0;q<9;q++) set(E,'rdNF'+q, N?N.phase[q]:0, ON_COL[2], OFF_COL[2]);
    set(E,'rdNNL', N?N.nolock:0, '#ff3a30', OFF_COL[0]); set(E,'rdNLK', N?N.lock:0, '#a8ff3a', OFF_COL[2]);
    const msg=E.rdNmsg; if (msg) msg.textContent = !D.power? 'no power' : d.booting? 'booting' : (D.view==='inst' && d.F? `frame ${d.F.side?'R':'L'} · U6 sel ${N.sel[0]?'L':''}${N.sel[1]?'R':''}` : '');
  }
  const ov=root.querySelector('.rdOld'); if (ov){ const E=cache(ov), O=d.old;
    for (let c=0;c<2;c++) for (let j=0;j<40;j++) set(E,`rdO${c}_${j}`, O?O.bar[c][j]:0, ON_COL[OLD_ZONE(OLD_LAB[j])], OFF_COL[OLD_ZONE(OLD_LAB[j])]);
    for (let c=0;c<2;c++) set(E,'rdOK'+c, O?O.peak[c]:0, '#ff3040', OFF_COL[0]);
    for (let q=0;q<7;q++) set(E,'rdOF'+q, O?O.phase[q]:0, ON_COL[2], OFF_COL[2]);
    set(E,'rdOLK', O?O.lock:0, '#a8ff3a', OFF_COL[2]); set(E,'rdOER', O?O.err:0, '#ff3a30', OFF_COL[0]);
    const msg=E.rdOmsg; if (msg) msg.textContent = !D.power? 'no power' : d.booting? 'booting' : '';
  }
  return d;
}
function rearSVG(){
  const dipRow=(name,r)=>{ const y=665+25*r, on=D.dip[name];
    return `<g class="rdDip" data-d="${name}" style="cursor:pointer"><rect x="208" y="${y+2}" width="53" height="21" fill="#18191b"/><rect x="${on?211:236}" y="${y+5}" width="23" height="15" rx="2" fill="#e8e4d6"/><rect x="190" y="${y}" width="80" height="25" fill="transparent"><title>${DIPS[name][0]} ${name.toUpperCase()}: ${on?'ON':'OFF'} — click to toggle</title></rect></g>`; };
  const con=D.plugged;
  return `<svg viewBox="0 0 339 1367" role="img" aria-label="SLM-1D rear panel (real SLM-1M2 silkscreen)" style="width:150px;max-width:100%;display:block;border-radius:6px">
    <rect width="339" height="1367" fill="#141516"/><rect x="203" y="660" width="64" height="110" fill="#0d0e0f" stroke="#33363a"/>
    ${['bs1','bs0','cal1','cal0'].map(dipRow).join('')}<text x="221" y="785" font-size="11" fill="#bbb">ON</text>
    <g class="rdBnc" style="cursor:pointer"><circle cx="94.5" cy="1080" r="47" fill="#b8b9bb" stroke="#6d6f72" stroke-width="3"/><circle cx="94.5" cy="1080" r="30" fill="#d9dadc"/><circle cx="94.5" cy="1080" r="13" fill="#e9d48a" stroke="#7a6a2a" stroke-width="2"/>
      ${con?`<rect x="80" y="1080" width="29" height="287" fill="#1b4f8f"/><circle cx="94.5" cy="1080" r="36" fill="#2a64a8" stroke="#163f70" stroke-width="3"/><circle cx="94.5" cy="1080" r="14" fill="#1b4f8f"/>`:''}
      <rect x="40" y="1025" width="110" height="110" fill="transparent"><title>${con?'Click to unplug':'Click to plug in'} the AES input</title></rect></g>
    <g class="rdPwr" style="cursor:pointer"><rect x="194" y="1045" width="71" height="71" fill="#121314" stroke="#3b3e42" stroke-width="2"/><circle cx="229.5" cy="1080" r="17" fill="#050505" stroke="#555"/><circle cx="229.5" cy="1080" r="4" fill="#c9c9c9"/>
      ${D.power?`<rect x="219" y="1080" width="21" height="287" fill="#222"/><circle cx="229.5" cy="1080" r="22" fill="#2b2b2b" stroke="#111" stroke-width="3"/>`:''}
      <rect x="190" y="1040" width="80" height="80" fill="transparent"><title>6 V adapter — click to ${D.power?'unplug':'plug in'}</title></rect></g>
    <image href="${ASSET}rear-white.png" width="339" height="1367" style="pointer-events:none"/></svg>`;
}
function bindRear(root){
  root.querySelectorAll('.rdDip').forEach(g=>g.addEventListener('click',()=>A.dip(g.dataset.d)));
  const b=root.querySelector('.rdBnc'); if (b) b.addEventListener('click',()=>A.plug(!D.plugged));
  const p=root.querySelector('.rdPwr'); if (p) p.addEventListener('click',()=>A.power());
}
function controlsHTML(){
  const opt=(arr,cur)=>arr.map(([v,l])=>`<option value="${v}" ${String(v)===String(cur)?'selected':''}>${l}</option>`).join('');
  return `<div style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin-top:8px" class="small">
    <label>After-head engine <select data-c="eng">${opt(Object.entries(ENG),D.eng)}</select></label>
    <label>Source <select data-c="src">${opt(Object.entries(SRCS),D.src)}</select></label>
    <label>Level <input data-c="level" type="number" min="-70" max="0" step="1" value="${D.level}" style="width:60px"> dBFS</label>
    <label>Freq <select data-c="freq">${opt([[100,'100 Hz'],[1000,'1 kHz'],[10000,'10 kHz']],D.freq)}</select></label>
    <label>R vs L <select data-c="phase">${opt(Object.entries(PHS),D.phase)}</select></label>
    <label>AES rate <select data-c="fs">${opt(FSS.map(f=>[f,f/1000+' kHz']),D.fs)}</select></label>
    <button data-c="view">${D.view==='eye'?'Show the instant (multiplex)':'Back to the eye view'}</button>
    ${D.boot0?'<button data-c="settle">Settle (pre-roll)</button>':''}<button data-c="rst">Factory reset</button></div>
    <div class="small muted" style="margin-top:4px">Rear: click a DIP lever, the BNC (AES in) or the power jack. Keys: 1–4 DIP (BS1, BS0, CAL1, CAL0) · U plug/unplug · E next engine · V view · + / − level.</div>`;
}
function bindControls(root){
  root.querySelectorAll('[data-c]').forEach(e=>{ const c=e.dataset.c;
    if (e.tagName==='SELECT') e.onchange=()=>{ if (c==='eng') A.setEng(e.value); else if (c==='fs') A.setFs(e.value); else A.setSrc(c,e.value); };
    else if (e.tagName==='INPUT') e.onchange=()=>A.setSrc('level', Math.max(-70,Math.min(0,+e.value)));
    else e.onclick=()=>{ if (c==='view') A.view(D.view==='eye'?'inst':'eye'); else if (c==='settle') A.settle(); else if (c==='rst') A.reset(); };
  });
}
document.addEventListener('keydown', e=>{
  if (!window.__rd86Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase(), engs=Object.keys(ENG);
  const m={'1':()=>A.dip('bs1'),'2':()=>A.dip('bs0'),'3':()=>A.dip('cal1'),'4':()=>A.dip('cal0'),u:()=>A.plug(!D.plugged),e:()=>A.setEng(engs[(engs.indexOf(D.eng)+1)%engs.length]),v:()=>A.view(D.view==='eye'?'inst':'eye'),
    '+':()=>A.setSrc('level',Math.min(0,D.level+1)),'=':()=>A.setSrc('level',Math.min(0,D.level+1)),'-':()=>A.setSrc('level',Math.max(-70,D.level-1))};
  if (m[k]){ m[k](); e.preventDefault(); }
});

/* ---------------- timeline lanes ---------------- */
function plot(c,X,t0,t1,y,h,fn,lo,hi,col,pw){ const n=Math.max(80,Math.min(1400,Math.round(pw||800))); c.strokeStyle=col; c.lineWidth=1.4; c.beginPath();
  for (let i=0;i<=n;i++){ const t=t0+(t1-t0)*i/n; const v=Math.max(lo,Math.min(hi,fn(t))); const yy=y+h-3-(v-lo)/(hi-lo)*(h-6); i?c.lineTo(X(t),yy):c.moveTo(X(t),yy); } c.stroke(); }
function wave(c,X,t0,t1,y,h,arr,col){
  const s=sim(), fs=s.fs; let pk=arr._pk; if (pk===undefined){ pk=0; for (let i=0;i<arr.length;i+=3){ const v=Math.abs(arr[i]); if (v>pk) pk=v; } arr._pk=pk; }
  const x0=X(t0), pw=X(t1)-x0, n0=Math.floor(t0*fs), n1=Math.min(s.N-1,Math.ceil(t1*fs)), mid=y+h/2, k=(h/2-3)*(pk>1e-6?0.95/pk:1);
  c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; c.fillText(pk>1e-6?`peak ${(20*Math.log10(pk)).toFixed(1)} dBFS (scaled)`:'silence / muted', x0+4, y+10);
  c.strokeStyle=col; c.fillStyle=col;
  if (n1-n0 > pw*1.5){ c.globalAlpha=.55; for (let px=0;px<pw;px++){ const a=n0+Math.floor((n1-n0)*px/pw), b=n0+Math.floor((n1-n0)*(px+1)/pw); let lo=1,hi=-1; for (let j=a;j<=b;j++){ const v=arr[j]; if(v<lo)lo=v; if(v>hi)hi=v; } c.fillRect(x0+px, mid-hi*k, 1, Math.max(1,(hi-lo)*k)); } c.globalAlpha=1; return; }
  c.lineWidth=1.2; c.beginPath(); for (let j=n0;j<=n1;j++){ const xa=X(j/fs), xb=X((j+1)/fs), v=mid-arr[j]*k; j===n0?c.moveTo(xa,v):c.lineTo(xa,v); c.lineTo(xb,v); } c.stroke();
}
const scaleVU = (p,cal,old) => (old? (40-cal)/2 : (41-cal)/2) + 10*Math.log10(Math.max(p,1e-14));
const scalePK = (p,cal,old) => (old? (34-cal)/2 : (35-cal)/2) + 10*Math.log10(Math.max(p,1e-14));
function lanes(){
  const s=sim(), css=n=>SIM.css(n), fs=s.fs, lo=-60, hi=22;
  const ls=[];
  ls.push({label:'AES L (CS8427 → SPORT0)', h:32, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,s.xL,css('--accent')); }});
  ls.push({label:'AES R', h:32, draw(c,X,t0,t1,y,h){ wave(c,X,t0,t1,y,h,s.xR,css('--bad')); }});
  ls.push({label:'BNC signal / lock seen (cs8427_in[5])', h:24, draw(c,X,t0,t1,y,h){
    const n=Math.max(60,Math.min(900,(X(t1)-X(t0))/2)); for (let i=0;i<n;i++){ const t=t0+(t1-t0)*(i+.5)/n, xa=X(t0+(t1-t0)*i/n), w=(X(t1)-X(t0))/n+.5;
      c.fillStyle=conn(t)?css('--accent2'):css('--grid'); c.fillRect(xa,y+3,w,7); c.fillStyle=lockSeen(t)?css('--accent'):css('--bad'); c.fillRect(xa,y+13,w,7); }
    c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('top: AES present · bottom: firmware sees LOCK (green) / ERROR (red)', X(t0)+4, y+h-1); }});
  ls.push({label:'SPORT1 CS8427 control words (18 per cycle)', h:22, draw(c,X,t0,t1,y,h){ if (!D.power) return; SIM.pulses(c,X,t0,t1,y,h,C.SPORT1_WORD,0,C.SPORT1_WORD*10/24,css('--warn'),'10-bit word (inferred clock)'); }});
  ls.push({label:`sport0_isr (fs ${fs/1000} kHz)`, h:22, draw(c,X,t0,t1,y,h){ if (!D.power) return; SIM.pulses(c,X,Math.max(t0,s.bootN>0?s.bootN/fs:0),t1,y,h,1/fs,0,C.ISR_CYC/C.CCLK,css('--accent2'),'ISR (FLG9 high)'); }});
  ls.push({label:'Frames: AFTER side (BIT31) · BEFORE both', h:26, draw(c,X,t0,t1,y,h){
    const F=s.frames; c.font='10px sans-serif';
    for (let k=0;k<F.length;k++){ const a=F[k].latch/fs, b=(k+1<F.length?F[k+1].latch:s.N+C.MUX)/fs; if (b<t0||a>t1) continue;
      c.fillStyle=F[k].side?css('--bad'):css('--accent'); c.globalAlpha=.55; c.fillRect(X(a),y+3,Math.max(1,X(b)-X(a)-1),h/2-4); c.globalAlpha=.3; c.fillStyle=css('--accent2'); c.fillRect(X(a),y+h/2+1,Math.max(1,X(b)-X(a)-1),h/2-4); c.globalAlpha=1;
      if (X(b)-X(a)>18){ c.fillStyle=css('--ink'); c.fillText(F[k].side?'R':'L', X(a)+3, y+h/2-3); c.fillText('L+R', X(a)+3, y+h-3); } } }});
  ls.push({label:'MM5450 shift (FLG7, 36 clocks)', h:22, draw(c,X,t0,t1,y,h){ const F=s.frames; c.fillStyle=css('--warn');
    for (const f of F){ const a=f.n/fs, b=f.latch/fs; if (b<t0||a>t1) continue;
      if (X(b)-X(a)>140){ for (let q=0;q<C.SHIFT;q+=2){ const ta=(f.n+q+1)/fs; c.fillRect(X(ta),y+4,Math.max(1,X(ta+1/fs)-X(ta)),h-8); } } else c.fillRect(X(a),y+4,Math.max(1.5,X(b)-X(a)),h-8); } }});
  [0,1].forEach(ch=>ls.push({label:`VU / PPM ${ch?'R':'L'} (after-scale dB)`, h:38, draw(c,X,t0,t1,y,h,pw){
    c.strokeStyle=css('--grid'); [0,-20].forEach(v=>{ const yy=y+h-3-(v-lo)/(hi-lo)*(h-6); c.beginPath(); c.moveTo(X(t0),yy); c.lineTo(X(t1),yy); c.stroke(); });
    const ok = t => D.power && lockSeen(t);
    plot(c,X,t0,t1,y,h,t=>ok(t)?scaleVU(s.vu[ch][idx(t)],s.cal):lo,lo,hi,ch?css('--bad'):css('--accent'),pw);
    plot(c,X,t0,t1,y,h,t=>ok(t)?scalePK(s.pp[ch][idx(t)],s.cal):lo,lo,hi,css('--warn'),pw);
    c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('VU (solid) · PPM (orange) · grid 0 / −20', X(t0)+4, y+11); }}));
  ls.push({label:'PPM hold L / R (BS1)', h:24, draw(c,X,t0,t1,y,h,pw){ if (!holdOn()){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('BS1 ON → ppm_hold forced to 255 every sample', X(t0)+6, y+h/2+4); return; }
    [0,1].forEach(ch=>plot(c,X,t0,t1,y,h,t=>{ const r=s.hold[ch][idx(t)]; return r>=255?lo:(35-r)/2; },lo,hi,ch?css('--bad'):css('--accent'),pw)); }});
  ls.push({label:'Peak LED L / R (|x| > 0.707)', h:20, draw(c,X,t0,t1,y,h){ const n=Math.max(60,Math.min(800,(X(t1)-X(t0))/2));
    [0,1].forEach(ch=>{ c.fillStyle=ch?css('--bad'):css('--accent'); for (let i=0;i<n;i++){ const t=t0+(t1-t0)*(i+.5)/n; if (s.ov[ch][idx(t)]) c.fillRect(X(t0+(t1-t0)*i/n),y+2+ch*8,(X(t1)-X(t0))/n+.5,7); } }); }});
  ls.push({label:'Phase y = (Σ−Δ)/(Σ+Δ)', h:28, draw(c,X,t0,t1,y,h,pw){ c.strokeStyle=css('--grid'); c.beginPath(); c.moveTo(X(t0),y+h/2); c.lineTo(X(t1),y+h/2); c.stroke(); plot(c,X,t0,t1,y,h,t=>s.y[idx(t)],-1,1,css('--accent2'),pw); }});
  ls.push({label:'Bar top L: BEFORE (blue) vs AFTER (green)', h:40, draw(c,X,t0,t1,y,h,pw){
    const n=Math.max(80,Math.min(700,Math.round(pw/2)));
    const line=(fn,col)=>{ c.strokeStyle=col; c.lineWidth=1.6; c.beginPath(); for (let i=0;i<=n;i++){ const t=t0+(t1-t0)*i/n; let v=fn(display(t)); v=v==null?lo:v; const yy=y+h-3-(v-lo)/(hi-lo)*(h-6); i?c.lineTo(X(t),yy):c.moveTo(X(t),yy); } c.stroke(); };
    line(d=>oldTop(d,0), css('--accent2')); line(d=>newTop(d,0), css('--accent')); }});
  return ls;
}

/* ---------------- scope: the three serial lines of the frame at the playhead ---------------- */
let scopeEng='after';
function drawScope(cv, info, t){
  const s=sim(); const {c,w}=SIM.canvas(cv,200);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), warn=SIM.css('--warn'), grid=SIM.css('--grid');
  const k=lastMux(t);
  if (!D.power || k<0){ c.fillStyle=ink2; c.font='12px sans-serif'; c.fillText(D.power?'No frame yet (booting).':'No power.',10,20); info.innerHTML=''; return; }
  const f=s.frames[k], eng = scopeEng==='before'? 'v101' : D.eng, st=streams(f,eng), n=Math.floor(t*s.fs), pos=Math.min(C.SHIFT, n-f.n);
  const x0=86, cw=(w-x0-10)/36;
  const rows=[['FLG7 CLOCK',null],['FLG4 DATA1',st.d[0]],['FLG5 DATA2',st.d[1]],['FLG6 DATA3',st.d[2]]];
  rows.forEach(([nm,bits],r)=>{ const y=18+r*42; c.fillStyle=grid; c.fillRect(x0,y+22,w-x0-10,1); c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(nm,4,y+16);
    c.strokeStyle=r?acc:ink; c.lineWidth=1.4; c.beginPath();
    for (let b=0;b<36;b++){ const xa=x0+b*cw; if (!bits){ c.moveTo(xa,y+22); c.lineTo(xa+cw/2,y+22); c.lineTo(xa+cw/2,y+4); c.lineTo(xa+cw,y+4); c.lineTo(xa+cw,y+22); }
      else { const yy=bits[b]?y+4:y+22; c.moveTo(xa,yy); c.lineTo(xa+cw,yy); if (b<35 && bits[b]!==bits[b+1]) c.lineTo(xa+cw,bits[b+1]?y+4:y+22); } }
    c.stroke(); });
  c.fillStyle=ink2; c.font='9px sans-serif'; for (let b=0;b<36;b+=5) c.fillText(b,x0+b*cw+1,194);
  c.fillStyle=warn; c.globalAlpha=.15; c.fillRect(x0,14,cw,164); if (st.two) c.fillRect(x0+18*cw,14,1.5,164); c.globalAlpha=1;
  if (pos<C.SHIFT){ const bx=x0+(pos/2)*cw; c.strokeStyle=SIM.css('--play'); c.lineWidth=2; c.beginPath(); c.moveTo(bx,12); c.lineTo(bx,182); c.stroke(); }
  const on = line => { const a=[]; for (let b=1;b<36;b++) if (st.d[line][b]) a.push(b); return a.join(' ')||'—'; };
  let txt = `Frame #${k} (mux at sample ${f.n.toLocaleString()}, latched ${f.latch.toLocaleString()}) · ${pos<C.SHIFT?`shifting clock ${Math.floor(pos/2)}/36`:'latched'} · engine <b>${scopeEng==='before'?'BEFORE: v1.01 → 41-LED head':ENG[D.eng]+' → SLM1-4 head'}</b>`;
  txt += `<br>vu ${f.vu.join('/')} · pk ${f.pk.join('/')} · hold ${f.hold.join('/')} · peak ${f.over.join('/')} · phase ${f.ph} · ${f.locked?'locked':'NO LOCK'}`;
  txt += `<br>DATA1 bits: ${on(0)}<br>DATA2 bits: ${on(1)}<br>DATA3 bits: ${on(2)}`;
  if (st.two) txt += `<br><span class="muted">Bits 0–17 = left words (shift1/2/3), bits 18–35 = right words shifted down by one (shift5/6/7). DATA3: 1–8 bar, 10 "out10 test", 11–17 phase (left) · 26 LOCK / 27 ERROR (right).</span>`;
  else { const o=newFrameOut(st); txt += `<br><span class="muted">U6 decode: phase LEDs ${o.phase.reduce((a,v)=>a+v,0)} · LOCK ${o.lock} · NO LOCK ${o.nolock}${o.aux.length?' · '+o.aux.join(', ')+' (no LED, '+inf+')':''} · select ${o.sel[0]?'L ':''}${o.sel[1]?'R':''}${o.sel[0]&&o.sel[1]?' <b style="color:var(--bad)">both bars!</b>':''}${!o.sel[0]&&!o.sel[1]?' <b style="color:var(--bad)">none — frame invisible</b>':''}</span>`; }
  info.innerHTML = txt;
}

/* ================================================================ VIEWS ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function stateTable(t){
  const s=sim(), n=idx(t), cal=s.cal, d=display(t), k=lastMux(t), F=k>=0?s.frames[k]:null;
  const r=ch=>[clampR(rawR(s.vu[ch][n])+cal), clampR(rawR(s.pp[ch][n])+cal)];
  const hex=v=>{ let q=Math.round(v*8388607); if(q<0) q+=1<<24; return '0x'+q.toString(16).toUpperCase().padStart(6,'0'); };
  return `<table class="kv">
    <tr><th>Sample</th><td class="mono">${n.toLocaleString()} of ${s.N.toLocaleString()} · ${SIM.fmtDur(1/s.fs)} · ${(C.CCLK/s.fs).toFixed(0)} cycles at 60 MHz (${inf})</td></tr>
    <tr><th>dma_in_a (24-bit)</th><td class="mono">L ${hex(s.xL[n])} · R ${hex(s.xR[n])}</td></tr>
    <tr><th>vu_results / pk_results</th><td class="mono">L ${r(0).join(' / ')} · R ${r(1).join(' / ')}</td></tr>
    <tr><th>meter_cal · nominal</th><td class="mono">${cal} → 0 VU = ${nominal()} dBFS · decay ${flags().f1?'Type 1 (1.5 s)':'Type 2 (3 s)'} · ${fsClass(s.fs)/1000} kHz constants</td></tr>
    <tr><th>ppm_hold L/R</th><td class="mono">${holdOn()? s.hold[0][n]+' / '+s.hold[1][n] : 'off (BS1 ON)'}${holdOn()&&s.resets?` <span style="color:var(--warn)">· both reset by R's flags ${s.resets.toLocaleString()}×</span>`:''}</td></tr>
    <tr><th>Phase</th><td class="mono">y = ${s.y[n].toFixed(3)} → index ${s.ph[n]}</td></tr>
    <tr><th>CS8427</th><td class="mono">${conn(t)?'AES present':'no AES'} · firmware sees ${s.lk[n]?'LOCK':'ERROR'} (next refresh in ${((pollT(t)+C.CS_POLL-t)*1000).toFixed(0)} ms)</td></tr>
    <tr><th>Mux</th><td class="mono">${F?`BIT31 → ${F.side?'R':'L'} · mux_counter ${C.MUX-(n-F.n)} · ${n-F.n<C.SHIFT?'BIT30 shifting':'idle'}`:'—'}</td></tr>
    <tr><th>Bar tops L / R</th><td class="mono">BEFORE ${fmtL(oldTop(d,0))} / ${fmtL(oldTop(d,1))} · AFTER ${fmtL(newTop(d,0))} / ${fmtL(newTop(d,1))}</td></tr></table>`;
}
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Flip a DIP lever, unplug the BNC, change the AES rate or switch the after-head engine. Each step the firmware takes is listed here.</div>'; }
function headsHTML(){
  return `<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-start">
    <div style="width:170px"><div class="small"><b>BEFORE</b> · v1.01 (${Y(2005)}) · 41-LED head</div><div class="hOld">${oldSVG()}</div></div>
    <div style="width:190px"><div class="small"><b>AFTER</b> · <span class="engName">${ENG[D.eng]}</span> · SLM1-4 head</div><div class="hNew">${newSVG()}</div></div>
    <div style="width:150px"><div class="small"><b>Rear</b> · old board</div><div class="hRear">${rearSVG()}</div></div></div>`;
}
function mountHeads(m){
  const h=m.querySelector('#heads'); h.innerHTML=headsHTML(); bindRear(h);
  const nv=h.querySelector('.rdNew'); if (nv) nv.addEventListener('click',()=>A.view(D.view==='eye'?'inst':'eye'));
  let key='';
  return t=>{ const k=JSON.stringify([D.dip,D.plugged,D.power,D.eng]); if (k!==key){ key=k; h.querySelector('.hRear').innerHTML=rearSVG(); bindRear(h.querySelector('.hRear')); h.querySelector('.engName').textContent=ENG[D.eng]; } return paint(h,t); };
}

function viewSim(m){
  window.__rd86Active=true;
  m.innerHTML=`<div class="grid2"><div>${card('Before / after at the playhead — same old board, same signal, two heads', `<div id="heads"></div><div id="ctl"></div>`)}</div>
    <div>${card('What the firmware did (last action)', `<div id="trace" class="log"></div>`)}${card('State at the playhead', `<div id="insp"></div>`)}</div></div>
    ${card('Timeline — one second, zoomable (click to seek)', `<canvas id="tl"></canvas><p class="small muted">Computed sample by sample from the constants in slm-1-main.asm and vumeter.asm. Both heads are fed by the same DSP results; only translate_meter_results and shift_led_data differ.</p>`)}
    <div class="grid2">${card('Scope: the three MM5450 lines for the frame at the playhead', `<div class="small" style="margin-bottom:6px"><button id="sb" class="${scopeEng==='before'?'on':''}">Before</button> <button id="sa" class="${scopeEng==='after'?'on':''}">After</button></div><canvas id="scope"></canvas><div id="bits" class="small mono"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  const ctl=m.querySelector('#ctl'); let ck='';
  const paintH=mountHeads(m);
  m.querySelector('#sb').onclick=()=>{ scopeEng='before'; m.querySelector('#sb').classList.add('on'); m.querySelector('#sa').classList.remove('on'); SIM.refresh(); };
  m.querySelector('#sa').onclick=()=>{ scopeEng='after'; m.querySelector('#sa').classList.add('on'); m.querySelector('#sb').classList.remove('on'); SIM.refresh(); };
  SIM.on('time',()=>{ const t=SIM.t;
    const k=JSON.stringify([D.eng,D.src,D.level,D.freq,D.phase,D.fs,D.view,D.boot0]); if (k!==ck){ ck=k; ctl.innerHTML=controlsHTML(); bindControls(ctl); }
    paintH(t);
    m.querySelector('#insp').innerHTML=stateTable(t); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#log').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('')||'<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
    drawScope(m.querySelector('#scope'), m.querySelector('#bits'), t);
  });
}

/* ---------------- tutorial: the port, step by step, as the engineer did it ---------------- */
const dnow = () => display(SIM.t);
const LESSONS = [
  { title:'The job', body:`<p>It is 25 February ${Y(2016)}. Ward-Beck still sells the <b>SLM-1D</b>, an AES stereo loudness meter. Since 2007 it has been built from the <b>SLM1-5</b> board (ADSP-21262 + CS8416) and the <b>SLM1-4</b> 57-LED head. The R&amp;D task is RD86: <i>SLM1D with old board</i>. Make the 2002 board (ADSP-21065L + CS8427) drive today's head, so that old boards on the shelf can be used.</p>
    <p>On the left is the starting point: the 2002/2005 firmware on its own <b>41-LED head</b>. In the middle is the SLM1-4 head on the same old board. Both see the same AES signal.</p>`, check:()=>true, auto:true },
  { title:'1 · Line up on the master', body:`<p>Start from what works. A <b>1 kHz tone at −20 dBFS</b> is on the BNC. With CAL0 and CAL1 both ON, the manual says 0 VU = −20 dBFS. Check that the BEFORE head reads <b>0</b>.</p><p><b>Goal:</b> tone at −20 dBFS, before-head bar top at 0.</p>`,
    check:()=>D.src==='tone'&&D.level===-20&&oldTop(dnow(),0)===0, hint:'Factory reset, or Source = Steady tone, Level = −20.' },
  { title:'2 · Find the master copy by hash', body:`<p>Which sources did the engineer start from? The archive has seven SLM-1 SHARC trees and two POD3A ones. Comparing MD5 hashes tells you without guessing.</p><p><button id="hashBtn">Run the hash check</button></p><div id="hashOut"></div><p><b>Goal:</b> run the check.</p>`,
    check:()=>D.hashRun, hint:'Click "Run the hash check".' },
  { title:'3 · Plug the new head in unchanged', body:`<p>First try: keep the v1.01 code and just plug in the SLM1-4 head. Set the after-head engine to <b>v1.01 code unchanged</b>.</p><p>The head stays dark. v1.01 sends 18 bits for the left bar and 18 for the right in every frame. The SLM1-4 head needs a full 36-bit frame per bar, plus bit 17 or 16 on DATA3 to switch on the L or R bar (U6 outputs 16/17 → nets R and L in slm1-4iss1.net). Look at the scope with <b>After</b> selected.</p><p><b>Goal:</b> engine = v1.01 unchanged.</p>`,
    check:()=>D.eng==='v101', hint:'After-head engine → "v1.01 code unchanged".' },
  { title:'4 · Borrow the 57-LED display engine', body:`<p>The 57-LED display code already exists: the analog SLM-1A firmware (<span class="mono">slm1v102 analog</span>, Nov 2006, the same code as POD3A). RD86 copies in its six <span class="mono">slm1_*</span> tables and its <span class="mono">shift_led_data</span> / <span class="mono">translate_meter_results</span>. That means BIT31 picks shift1-4 or shift5-8, the DATA2 high-byte split (bits 32-35 from shift4/shift8), "+6" on every lookup, and the constant select bits. Set the engine to <b>RD86 as archived</b>.</p><p><b>Goal:</b> after-head bar top at 0 with the −20 dBFS tone.</p>`,
    check:()=>D.eng==='rd86'&&D.src==='tone'&&D.level===-20&&newTop(dnow(),0)===0, hint:'Engine → RD86; tone at −20 dBFS.' },
  { title:'5 · Keep the digital calibration', body:`<p>The analog code reads its CAL switches as "·8 − 14" (4-dB steps, dBu). RD86 kept v1.01's <span class="mono">read_dipswitch</span>: "·4 − 6" (2-dB steps, dBFS), as the manual's digital table needs. Flip <b>CAL1 OFF</b>: 0 VU becomes −18 dBFS, so the −20 dBFS tone now reads <b>−2</b> on both heads.</p><p><b>Goal:</b> CAL = −18 dBFS and the after head reads −2.</p>`,
    check:()=>nominal()===-18&&newTop(dnow(),0)===-2, hint:'Click the CAL1 lever on the rear (third from top), or press 3.' },
  { title:'6 · Keep the rate tracking', body:`<p>The analog code assumes a fixed 52 kHz. RD86 kept v1.01's <span class="mono">sample_rate_calc</span>, which measures the sample period with <span class="mono">emuclk</span> and loads 32 / 44.1 / 48 / 96 kHz constants. Set the AES rate to <b>96 kHz</b>: the reading stays put and the ballistics keep their timing.</p><p><b>Goal:</b> 96 kHz.</p>`,
    check:()=>D.fs===96000, hint:'AES rate → 96 kHz.' },
  { title:'7 · Test the phase meter', body:`<p>Set the rate back to 48 kHz and CAL1 back ON. Then set <b>R vs L = 180°</b>. The BEFORE head fills its 7-LED phase row. The AFTER head's 9 phase LEDs stay <b>dark</b>. The NO LOCK LED lights instead, and in the instant view both bars light from one frame.</p><p>Why: RD86 still uses the <b>old</b> <span class="mono">sdm_phase_data.dat</span> (hash b2a57cd3 = v1.01). Its bits 11-17 were the old head's phase LEDs. On U6 they are LOCK2 (= NO LOCK), LOCK3-6 and the R/L selects.</p><p><b>Goal:</b> 180° with engine RD86.</p>`,
    check:()=>D.phase==='180'&&D.eng==='rd86', hint:'R vs L → 180°; engine RD86.' },
  { title:'8 · Lose the signal', body:`<p>Put the phase back <b>in phase</b> and <b>unplug the BNC</b>. Within one CS8427 control cycle (about 59 ms, ${inf}), <span class="mono">translate_meter_results</span> blanks the bars. The BEFORE head lights <b>ERROR</b>. The AFTER head shows nothing: the lines that sent <span class="mono">lock_status</span> are commented out in RD86.</p><p><b>Goal:</b> BNC unplugged.</p>`,
    check:()=>!D.plugged, hint:'Click the BNC on the rear, or press U.' },
  { title:'9 · What was still missing', body:`<p>Plug the BNC back in. To finish the port, two more edits were needed. Swap in the 9-LED phase table that the analog code uses (bits 1-9). Then OR a lock bit (10 = LOCK, 11 = NO LOCK) into DATA3, as the 21262 v102 firmware does. Select <b>What-if: RD86 + fixes</b> and try 180° again. This patch is ${inf}: it is not in the archive.</p><p><b>Goal:</b> engine = what-if, connected, 180°, 9 phase LEDs lit.</p>`,
    check:()=>D.eng==='fix'&&D.plugged&&D.phase==='180'&&dnow().nw&&Array.from(dnow().nw.phase).filter(v=>v>0).length===9, hint:'Engine → What-if; plug the BNC; R vs L → 180°.' },
  { title:'Done', body:`<p>That is RD86: one main-file edit and a VisualDSP 4.0 project, saved over about twelve minutes. The <b>Findings</b> tab lists what was decided and what became of it. The <b>Software</b> tab shows the code changes line by line, and <b>One second</b> breaks a frame down clock by clock.</p>`, check:()=>true, auto:true },
];
let lessonIdx=0;
function hashTable(compact){
  const cell=(v,j)=> v==='='? '<td style="color:var(--accent)">=</td>' : v==='-'? '<td class="muted">–</td>' : `<td class="mono" style="color:var(--bad)">${compact?'≠':v}</td>`;
  return `<div class="scroll"><table class="kv small"><tr><th>File in V030000/</th><th>md5</th>${HCOLS.map(c=>`<th>${c}</th>`).join('')}</tr>${HASH.map(r=>`<tr><td class="mono">${r[0]}</td><td class="mono">${r[1]}</td>${r.slice(2).map(cell).join('')}</tr>`).join('')}</table></div>
    <p class="small muted">"=" byte-identical, "–" not in that tree, otherwise that copy's md5 (first 8 hex digits). Line endings were not normalised.</p>`;
}
function viewTutorial(m){
  window.__rd86Active=true;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial: porting the SLM-1D to the old board', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
    <div>${card('The unit', `<div id="heads"></div><div id="ctl"></div>`)}${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div></div>`;
  const paintH=mountHeads(m); let ck='', lk='';
  const draw=()=>{
    const k=JSON.stringify([D.eng,D.src,D.level,D.freq,D.phase,D.fs,D.view,D.boot0]); if (k!==ck){ ck=k; const c=m.querySelector('#ctl'); c.innerHTML=controlsHTML(); bindControls(c); }
    paintH(SIM.t); m.querySelector('#trace').innerHTML=traceHTML();
    const L=LESSONS[lessonIdx], ok=L.check();
    const sig=lessonIdx+'|'+ok+'|'+D.hashRun;
    if (sig===lk) return; lk=sig;
    m.querySelector('#lessons').innerHTML=LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=>li.onclick=()=>{ lessonIdx=+li.dataset.i; lk=''; draw(); });
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    const hb=m.querySelector('#hashBtn'); if (hb) hb.onclick=()=>A.hash();
    const ho=m.querySelector('#hashOut'); if (ho && D.hashRun) ho.innerHTML=hashTable(true)+`<p class="small">Result: base = <b>slm-1-v1.00 / v1.01</b> (29 identical files, not v1.02). The 8 added table files come from <b>slm1v102 analog</b> (= POD3A). Only <span class="mono">slm-1-main.asm</span> was edited.</p>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); lk=''; draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); lk=''; draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); D.hashRun=false; lessonIdx=0; lk=''; draw(); };
  };
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewSecond(m){
  window.__rd86Active=true;
  m.innerHTML=`${card('One second, broken down', `<div id="ladder"></div>`)}
    <div class="grid2">${card('As seen by the device', `<div id="dev"></div>`)}${card('As seen by the heads (click the SLM1-4 lens for the instant view)', `<div id="heads"></div><canvas id="duty"></canvas>`)}</div>`;
  const paintH=mountHeads(m);
  const draw=()=>{
    const t=SIM.t, s=sim(), fs=s.fs, fc=fsClass(fs), n=idx(t), k=lastMux(t), F=k>=0?s.frames[k]:null;
    const dB24=kk=>2.4*Math.LN10/(kk*fs);
    const rows=[
      ['DSP core (CCLK)', (C.CCLK/1e6)+' M', SIM.fmtDur(1/C.CCLK), `ADSP-21065L; clock ${inf} (not archived)`],
      ['sport0_isr calls = AES frames', fs.toLocaleString(), SIM.fmtDur(1/fs), `${(C.CCLK/fs).toFixed(0)} cycles per sample; ISR ≈ ${C.ISR_CYC} (${inf})`],
      ['CS8427 control words (SPORT1)', (1/C.SPORT1_WORD).toFixed(0), SIM.fmtDur(C.SPORT1_WORD), 'RDIV1 = 0x00171000, 10-bit words, DMA tcb2_rx1a / tcb6_tx1a'],
      ['cs8427_in[] refreshed (lock seen)', (1/C.CS_POLL).toFixed(1), SIM.fmtDur(C.CS_POLL), `18 words per cycle (${inf} clock)`],
      ['mux_ctl calls', (fs/C.MUX).toFixed(1), SIM.fmtDur(C.MUX/fs), '"300=80Hz mux rate at 48K"'],
      ['AFTER: frames per bar', (fs/C.MUX/2).toFixed(1), SIM.fmtDur(2*C.MUX/fs), 'L and R alternate (BIT31)'],
      ['BEFORE: frames per bar', (fs/C.MUX).toFixed(1), SIM.fmtDur(C.MUX/fs), 'both bars in every frame (18 + 18 bits)'],
      ['MM5450 clock while shifting', (fs/2).toLocaleString()+' Hz', SIM.fmtDur(2/fs), 'one FLG7 edge per ISR; 36 clocks = 72 samples'],
      ['translate flush loop', '—', SIM.fmtDur(C.FLUSH*5/C.CCLK), '"modified june 17, 2005": 107 FLG7 toggles with data 0'],
      ['VU, 24 dB', '—', dB24(C.VU[fc]).toFixed(3)+' s', `VU_${fc===44100?'441':fc/1000} = ${C.VU[fc]} ("vu=300mS/24db")`],
      ['PPM attack, 24 dB', '—', SIM.fmtDur(dB24(C.ATT[fc])), `PPM_ATTACK_${fc===44100?'441':fc/1000}`],
      ['PPM decay, 24 dB', '—', dB24(C.D2[fc]).toFixed(2)+' / '+dB24(C.D1[fc]).toFixed(2)+' s', 'BS0 OFF peak_decay_2 / ON peak_decay_1'],
      ['Peak LED and PPM hold', '—', (C.PK_HOLD/fs).toFixed(2)+' s', '200 000 samples, not scaled with the rate'],
    ];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table><p class="small muted">Step on the transport by one sample, one MM5450 clock, one mux frame or 10 ms.</p>`;
    const cyc=((t*fs)%1)*C.CCLK/fs, inIsr=cyc<C.ISR_CYC;
    m.querySelector('#dev').innerHTML=`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)} · sample ${n.toLocaleString()} · cycle ${cyc.toFixed(0)} of ${(C.CCLK/fs).toFixed(0)}</td></tr>
      <tr><th>SHARC</th><td class="mono">${!D.power?'off':n<s.bootN?'booting (PROM loader)':inIsr?'in sport0_isr':'main: sample_rate_calc, VUMeterGet ×4, PhaseMeterGet'}</td></tr>
      <tr><th>MM5450 ×3</th><td class="mono">${F?(n-F.n<C.SHIFT?`clocking bit ${Math.floor((n-F.n)/2)} of 36 (${F.side?'R':'L'} frame after, L+R before)`:'holding the latched frame'):'—'}</td></tr></table>${stateTable(t)}`;
    paintH(t);
    const {c,w}=SIM.canvas(m.querySelector('#duty'),46), span=0.02, a=Math.max(0,Math.min(1-span,t-span/2));
    c.font='10px sans-serif'; c.fillStyle=SIM.css('--ink2'); c.fillText('20 ms around the playhead: which SLM1-4 bar the latched frame selects (L green, R red, both orange)',4,10);
    for (let px=0;px<w;px++){ const tt=a+span*px/w, kk=frameAt(tt); if (kk<0||!D.power) continue; const o=newFrameOut(streams(s.frames[kk],D.eng)); c.fillStyle=o.sel[0]&&o.sel[1]?SIM.css('--warn'):o.sel[0]?SIM.css('--accent'):o.sel[1]?SIM.css('--bad'):SIM.css('--grid'); c.fillRect(px,14,1,14); }
    c.strokeStyle=SIM.css('--play'); c.lineWidth=2; c.beginPath(); c.moveTo((t-a)/span*w,12); c.lineTo((t-a)/span*w,42); c.stroke();
  };
  SIM.on('time', draw);
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  bnc:{x:20,y:30,w:150,h:70,t:'AES in',s:['BNC 75 Ω (SLM-1M2 rear)','or 110 Ω screw terminal'],d:'2003 manual: "AES/EBU 110 Ω transformer balanced screw terminal or 75 Ω unbalanced BNC", 0.2–5 V p-p, 30–96 kHz. The input transformer is not archived.'},
  cs:{x:210,y:20,w:170,h:90,t:'CS8427',s:['AES receiver','SPORT0: I²S audio','SPORT1: control port','FLG11 = reset'],d:'"take cs8427 out of reset" (start:, FLG11). Control frames: 18 × 10-bit words from cs8427_ctl_dat.dat (unmask errors, clock flow control, serial output format, then read register 16). cs8427_in[5] bit 8192 = the error/unlock flag the code tests.'},
  dsp:{x:420,y:20,w:200,h:120,t:'ADSP-21065L (old board)',s:['sport0_isr every sample','VUMeterCalc · PhaseMeterCalc','mux_ctl · shift_led_data','main: sample_rate_calc, Get'],d:'"SLM-1 Ward-Beck Systems ADSP-21065L MAIN, DSB NOV 13, 2002". RD86 keeps everything here from v1.01 except translate_meter_results and shift_led_data.'},
  rom:{x:420,y:180,w:200,h:60,t:'Boot PROM',s:['SLM-1n.ldr (Intel HEX, 065L_prom)'],d:'SLM-1n.mak: elfloader -bPROM -fHEX -l 21k/ldr/065L_prom.dxe → Debug/SLM-1n.ldr. No .ldr is archived.'},
  dip:{x:210,y:180,w:170,h:70,t:'Rear DIP (4)',s:['BS1 BS0 CAL1 CAL0','FLAG0-3 → ASTAT 19-22'],d:'Read every sample from ASTAT. CAL → read_dipswitch (·4 − 6, kept from v1.01). BS0 → PPM decay; BS1 → peak hold.'},
  pic:{x:20,y:180,w:150,h:70,t:'PIC (not archived)',s:['FLG10O "FOR PIC" = no lock','FLG9 = ISR marker'],d:`The code mentions "get the next 17 var's from pic" and sets FLG10O "FOR PIC" when unlocked. v1.02 moved FLG9 into a "pulse for PIC L/R test"; RD86 is based on v1.01 and does not have it. The PIC's job and code are unknown (${'inferred'}).`},
  oldh:{x:670,y:20,w:190,h:100,t:'BEFORE: 41-LED head',s:['3 shift chains, 18 L + 18 R bits','7-LED phase, LOCK, ERROR','FLG8 toggles per frame'],d:'The 2002/2003 SLM-1 head (2003 manual: "dual set of 41 LEDs", "seven segment LED phase indicator", LOCK and ERROR LEDs). Its output map comes from the sdm_* table comments; no drawing of it survives.'},
  newh:{x:670,y:150,w:190,h:110,t:'AFTER: SLM1-4 head',s:['U102 DS26LS32A receiver','U3 / U5 / U6 MM5450','U6 out 16/17 → R / L select','57 + 57 LEDs, 9 phase, LOCK1-6'],d:'slm1-4iss1.net: DATA_IN3 → U6-25 via U102 (a differential line receiver), CLOCK on U3/U5/U6 pin 24, PHASE1-9 on U6 pins 20…11, LOCK1-6 on pins 10…5, nets L and R on pins 3 and 4. The old board\'s FLG4-7 are single-ended flags, so a cable or line-driver adapter was needed ('+'inferred'+').'},
};
const WIRES=[['bnc','cs','AES3'],['cs','dsp','SPORT0 I²S'],['dsp','cs','SPORT1 ctl'],['rom','dsp','boot'],['dip','dsp','FLAG0-3'],['dsp','pic','FLG9/10'],['dsp','oldh','FLG4-8 (v1.01)'],['dsp','newh','FLG4-7 (RD86)']];
function viewBlock(m){
  window.__rd86Active=false; let sel='dsp';
  m.innerHTML=`<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div>`)}${card('What RD86 changed, in one picture', `<div id="chg"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 880 270" style="width:100%"><defs><marker id="rdar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      if (a==='cs'&&b==='dsp'){ y1-=14; y2-=14; } if (a==='dsp'&&b==='cs'){ y1+=14; y2+=14; }
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#rdar)"/>`;
      s+=`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}" ${k==='pic'?'stroke-dasharray="5 4"':''}/>
        <text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+10}" y="${b.y+37+i*15}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
  };
  const box=(x,y,w,t,sub,col)=>`<rect x="${x}" y="${y}" width="${w}" height="48" rx="6" fill="var(--panel2)" stroke="${col||'var(--line)'}" stroke-width="${col?2:1}"/><text x="${x+8}" y="${y+19}" font-size="12" font-weight="700" fill="var(--ink)">${t}</text><text x="${x+8}" y="${y+36}" font-size="10" fill="var(--ink2)">${sub}</text>`;
  m.querySelector('#chg').innerHTML=`<svg viewBox="0 0 880 200" style="width:100%">
    ${box(10,10,260,'slm-1-v1.01 (Jun 2005)','29 files kept byte-for-byte')}${box(10,80,260,'slm1v102 analog (Nov 2006)','8 table files + display code')}
    ${box(320,45,240,'RD86 slm-1-main.asm','25 Feb 2016 13:03','var(--accent)')}${box(610,10,260,'kept: CS8427, lock blanking,','sample_rate_calc, ·4−6 CAL')}${box(610,80,260,'not ported: 9-LED phase table,','lock bits on DATA3, v1.02 PIC pulse','var(--bad)')}
    <path d="M270 34 L320 64 M270 104 L320 74 M560 64 L610 34 M560 74 L610 104" stroke="var(--ink2)" fill="none"/>
    <text x="10" y="150" font-size="12" fill="var(--ink2)">Project: SLM-1n.dpj re-saved 25 Feb 2016 13:00 (schema 16, "generated Thu Feb 25 16:11:47 2016").</text>
    <text x="10" y="168" font-size="12" fill="var(--ink2)">SLM-1n.mak exported 13:12 for VisualDSP 4.0 (F:\\Program Files\\Analog Devices).</text>
    <text x="10" y="186" font-size="12" fill="var(--ink2)">No Debug/SLM-1n.dxe or .ldr survives; Debug/ holds only the stray vms44_main.asm.</text></svg>`;
  draw();
}

/* ---------------- schematics (redrawn) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([pin,net],i)=>{ const yy=y+22+i*18; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach(([pin,net],i)=>{ const yy=y+22+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
const SHEETS=[
  { name:'1 · SHARC flags and ports', note:'From slm-1_INIT.ASM ("flag 0-3 are dip switch inputs 1-4", "flag 4,5,6,7 are display I/F data1,2,3,clock", "flag11=cs8427 reset") and slm-1-main.asm. The old board is not archived, so pins are named by function, not number.', svg:()=>
    chip(330,50,200,'ADSP-21065L',[['FLAG0','BS1'],['FLAG1','BS0'],['FLAG2','CAL1'],['FLAG3','CAL0'],['DR0A / RFS0','CS8427 SDOUT / LRCK'],['DR1A / DT1A','CS8427 control'],['BMS','boot PROM']],
      [['FLAG4','DATA1'],['FLAG5','DATA2'],['FLAG6','DATA3'],['FLAG7','CLOCK'],['FLAG8','L/R (end of frame)'],['FLAG9','ISR marker'],['FLAG10','"FOR PIC" no lock'],['FLAG11','CS8427 reset']],'old SLM-1 DSP board')
    + `<text x="40" y="330" font-size="11" fill="var(--ink2)">SPORT0: SRCTL0 = STCTL0 = 0x013c09f1 (I²S), DMA tcb0_rx0a → dma_in_a[2], interrupt SPR0I only.</text>
       <text x="40" y="348" font-size="11" fill="var(--ink2)">SPORT1: SRCTL1 = STCTL1 = 0x000c0d71, RDIV1 = TDIV1 = 0x00171000, chained DMA tcb2_rx1a / tcb6_tx1a, 18 words.</text>
       <text x="40" y="366" font-size="11" fill="var(--ink2)">Unchanged by RD86 (slm-1_INIT.ASM md5 9bdac393 = v1.00/v1.01).</text>` },
  { name:'2 · CS8427 control frame', note:'cs8427_ctl_dat.dat, as sent by SPORT1 every cycle. Each register access is a "b#00" word followed by a 24-bit chip-address / register / data word. The receive copy cs8427_in[5] is the answer to the register-16 read.', svg:()=>{
    const rows=[['0-1','unmask all errors','b#1000 0000 0100 0100 0100 0000'],['2-3','write: set reg 15 address, auto-increment','b#1000 0010 0011 1100 …'],['4-5','partial read for reg 16','b#1000 0100 0000 …  → cs8427_in[5]'],['6-15','Clock Flow Control (4) "Audio Input", ×5','b#1000 0000 0001 0001 0010 0100'],['16-17','Serial Audio Output Port Data Format (6)','b#1000 0000 0001 1010 0001 0000']];
    let s='<text x="40" y="40" font-size="13" font-weight="700" fill="var(--ink)">cs8427_out[18] = "cs8427_ctl_dat.dat"</text>';
    rows.forEach((r,i)=>{ const y=70+i*44; s+=`<rect x="40" y="${y}" width="820" height="34" rx="5" fill="var(--panel2)" stroke="var(--line)"/><text x="52" y="${y+21}" font-size="11.5" fill="var(--ink)" class="mono">${r[0]}</text><text x="110" y="${y+21}" font-size="11.5" fill="var(--ink)">${r[1]}</text><text x="500" y="${y+21}" font-size="11" fill="var(--accent2)">${r[2]}</text>`; });
    return s+`<text x="40" y="310" font-size="11" fill="var(--ink2)">refresh_lock_status / translate_meter_results: (cs8427_in[5] &amp; 8192) ≠ 0 → error. The bit meaning within the register is ${'inferred'} from the code's use.</text>
      <text x="40" y="328" font-size="11" fill="var(--ink2)">A commented-out CS8420 version of the same frame follows in the file (cs8420reg1def …).</text>`; } },
  { name:'3 · BEFORE: 41-LED head drivers', note:'Rebuilt from the sdm_vu/pk_data comments and the v1.01 shifter (18 left bits, then 18 right bits shifted down by one). The head itself is not archived; output-to-LED wiring is inferred from the tables.', svg:()=>
    chip(120,50,170,'chain 1 (DATA1)',[['DATA','FLAG4'],['CLOCK','FLAG7']],[['OUT1…16','L −1 … +14'],['OUT17','L PEAK'],['OUT18…33','R −1 … +14'],['OUT34','R PEAK']])
    + chip(120,220,170,'chain 2 (DATA2)',[['DATA','FLAG5'],['CLOCK','FLAG7']],[['OUT1…16','L −18, −16, −15…−2'],['OUT18…33','R same']])
    + chip(560,50,170,'chain 3 (DATA3)',[['DATA','FLAG6'],['CLOCK','FLAG7']],[['OUT1…8','L −38…−20'],['OUT10','"out10 data3test"'],['OUT11…17','PHASE (7)'],['OUT18…25','R −38…−20'],['OUT26 / 27','LOCK / ERROR']])
    + `<text x="40" y="400" font-size="11" fill="var(--ink2)">One 36-clock frame carries both bars, so FLG8 (toggled after each frame) is not needed to multiplex the bars; its use on this head is unknown.</text>` },
  { name:'4 · AFTER: SLM1-4 head drivers', note:'From slm1-4iss1.net (U3, U5, U6, U102 DS26LS32A, nets PHASE1-9, LOCK1-6, L, R) and the bit layout of the slm1_* tables; matches slm.js and pod3a.js. Pin → output order follows the MM5450 package (pin 20 = output 1).', svg:()=>
    chip(120,50,170,'U3 MM5450',[['25','DATA_IN1'],['24','CLOCK']],[['OUT1…26','−5 … +20'],['OUT17','(+11: RD86 peak LED)'],['OUT27…35','n.c.']],'DATA1 = shift1 / shift5')
    + chip(120,220,170,'U5 MM5450',[['25','DATA_IN2'],['24','CLOCK']],[['OUT1','D0 = PR'],['OUT2','D1 marker ('+'inferred'+')'],['OUT4…34','−52 … −6'],['OUT32…35','from shift4 / shift8']],'DATA2 = shift2 + high byte')
    + chip(560,50,170,'U6 MM5450',[['25','DATA_IN3 (U102-5)'],['24','CLOCK']],[['20…13, 11','PHASE1 … PHASE9'],['10','LOCK1 = LOCK'],['9','LOCK2 = NO LOCK'],['8…5','LOCK3 … LOCK6'],['4','R → Q (bar R)'],['3','L → Q (bar L)']],'DATA3 = shift3 / shift7')
    + `<text x="560" y="300" font-size="11" fill="var(--bad)">RD86 sends old phase bits 11-17 here:</text><text x="560" y="316" font-size="11" fill="var(--bad)">they land on LOCK2-6 and the R/L selects.</text>` },
  { name:'5 · Rear DIP and polarity', note:'Legend from the 2003 / 2007 manuals; decode from read_dipswitch, update_meter_parameters_* and sport0_isr. ON = contact to ground = flag 0 (pull-ups) is inferred; it is the only sense that matches the manual.', svg:()=>{
    const rows=[['SW4 BS1','FLAG0','ASTAT 19','ON: no hold · OFF: ppm_hold_l / r'],['SW3 BS0','FLAG1','ASTAT 20','ON: peak_decay_1 (3 s) · OFF: peak_decay_2 (1.5 s)'],['SW2 CAL1','FLAG2','ASTAT 21','+4 half-dB when OFF'],['SW1 CAL0','FLAG3','ASTAT 22','+8 half-dB when OFF']];
    let s=''; rows.forEach((r,i)=>{ const y=60+i*60; s+=`<line x1="60" y1="${y}" x2="100" y2="${y}" stroke="var(--ink)"/><line x1="100" y1="${y}" x2="130" y2="${y-12}" stroke="var(--ink)"/><line x1="134" y1="${y}" x2="190" y2="${y}" stroke="var(--ink)"/><text x="40" y="${y+4}" font-size="11" text-anchor="end" fill="var(--ink)">⏚</text>
      <text x="200" y="${y+4}" font-size="11.5" fill="var(--ink)">${r[0]} → ${r[1]} (${r[2]})</text><text x="420" y="${y+4}" font-size="11" fill="var(--ink2)">${r[3]}</text>`; });
    return s+`<text x="40" y="320" font-size="11" fill="var(--ink2)">meter_cal = 4·(CAL1 + 2·CAL0) − 6 → −6 / −2 / +2 / +6 → 0 VU = −20 / −18 / −16 / −14 dBFS.</text><text x="40" y="338" font-size="11" fill="var(--ink2)">Live: meter_cal ${meterCal()} → ${nominal()} dBFS · hold ${holdOn()?'ON':'OFF'} · decay ${flags().f1?'1.5 s':'3 s'}.</text>`; } },
];
function viewSchem(m){
  window.__rd86Active=false; let i=0;
  m.innerHTML=card('Schematic set (redrawn from source and netlist names, not the original CAD)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p class="small muted" id="shn"></p>
    <p class="small muted">No schematic of the 2002 SLM-1 DSP board or its 41-LED head is archived. Sheets 1–3 are rebuilt from the firmware; sheet 4 from the SLM1-4 netlist.</p>`);
  const draw=()=>{
    m.querySelector('#tabs2').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 900 440" style="width:100%;min-width:660px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="888" height="428" fill="none" stroke="var(--line)"/><text x="884" y="428" text-anchor="end" font-size="10" fill="var(--ink2)">RD86 · sheet ${i+1}/${SHEETS.length} · redrawn ${Y(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent=SHEETS[i].note;
  };
  draw();
}

/* ---------------- software ---------------- */
const ISR=[
  ['sport0_isr entry','bit set mode1 SRRFL…; r10 = emuclk → emuclk_prev[]; astat_save = astat',12],
  ['FLG9 high · float inputs','f0 = float dma_in_a[0..1] by −31 → audio_in_float[]',10],
  ['_VUMeterCalc','VU += (in²−VU)·Tvu ; PPM = max(attack, decay) — 2 channels',40],
  ['_PhaseMeterCalc · FLG9 low','sumAVE / diffAVE ← 0.999·old + 0.001·|L±R|',26],
  ['mux_counter−− → mux_ctl','every 300th: toggle BIT31, set BIT30, translate_meter_results',14],
  ['ppm / pk counters','ppm_counter_*, pk_counter_*_1 count down; peak LED off at 0',16],
  ['test_peaks_left_1 / right_1','|in| > 0.707 → pk_led = bit 17, counter = 200000',14],
  ['shift_led_data (if BIT30)','toggle FLG7; on the low phase put one bit on FLG4/5/6',30],
  ['BS1 → ppm_hold_l / ppm_hold_r','hold the highest PPM index 200000 samples, or force 255',24],
  ['refresh_lock_status','lock_status = cs8427_in[5] & 8192 ? error : lock (RD86: never sent)',8],
  ['read_dipswitch · rti','meter_cal = 4·((astat & cal_mask) >> 21) − 6',14],
];
const HUNKS=[
  ['Tables (line 86)', `.var vu_data_1[256]="sdm_vu_data_1.dat";\n… pk_data_3[262]="sdm_pk_data_3.dat";`, `//.var vu_data_1[256]="sdm_vu_data_1.dat"; (×6 commented)\n.var vu_data_1[262]="slm1_vu_data1.dat";\n… pk_data_3[262]="slm1_pk_data3.dat";`, 'The 41-LED tables become the 57-LED ones (identical to slm1v102 analog / POD3A). phase_data[257]="sdm_phase_data.dat" is left alone.'],
  ['shift_led_data: half-frame point', `r7=18;  //clock is high, is shift1 complete?`, `//r7=18;\nr7=36;`, 'No more 18 + 18 split: the bit counter now only resets at the end of the 36-clock frame.'],
  ['shift_led_data: register base', `r1=shift1; r2=17; r4=0; r3=r2-r0;\nif lt r1=r1+1;  // register offset if anc data`, `bit tst ustat1 BIT31;\nif tf jump shift_left;\nr1=shift5;  //mux in right data\n…shift_left: r1=shift1;`, 'One whole side per frame: BIT31 picks shift1-4 (left) or shift5-8 (right).'],
  ['shift_led_data: DATA2 high byte', `btst r2 by r15;`, `r1=32; r1=r1-r15; if le jump high_byte;\nbtst r2 by r15; …\nhigh_byte: r1=r15-32; btst r4 by r1;`, '"since data2 has more than 32 leds split the data into 2 bytes": positions 32-35 of DATA2 come from shift4 / shift8.'],
  ['translate: +6 on every lookup', `r1=vu_data_1; r0=dm(vu_results);\nr1=r1+r0;`, `r1=vu_data_1; r0=dm(vu_results);\nr4=6; r0=r0+r4;\nr1=r1+r0;`, 'The slm1_* tables start 6 rows earlier (pk20…). v1.01 already added 6 to pk lookups; now VU too (×6 places).'],
  ['translate: DATA1/2/3 layout', `dm(shift3) = vu3|pk3|phase|b#…10000000000 (out10 test)`, `dm(shift4) = vu3|pk3;   // high byte of DATA2\ndm(shift3) = phase | b#…100000000000000001;`, 'DATA3 now carries the phase pattern + bit 17 (L select). The out10 test bit is commented out.'],
  ['translate: right channel', `r2=-1; r1=lshift r1 by r2;   (×3)\nr0=dm(lock_status); r1=r0 or r1;\ndm(shift7)=r1;`, `//r2=-1; //r1=lshift r1 by r2;\ndm(shift8)=r1;\n//r0=dm(lock_status); //r1=r0 or r1;\nr1=b#…10000000000000001;  r1 |= phase_data[phase];\ndm(shift7)=r1;`, 'No down-shift (each side has its own frame). DATA3 right = phase + bit 16 (R select). The lock_status lines are commented out, so no lock LED is sent.'],
  ['translate: right ppm hold mask', `r1=r1 or r2;\nr3=…11111101; r2=r3 and r2;  (mask after the OR: no effect)`, `r3=…11111101; r2=r3 and r2;\nr1=r1 or r2;`, 'A v1.01 slip fixed in passing: the "−1 mask" now applies to the right hold too (it keeps the hold dot off the −5 LED).'],
];
function viewSoft(m){
  window.__rd86Active=true;
  m.innerHTML=`<div class="grid2">${card('sport0_isr, one sample — the step running at the playhead is lit', `<div id="flow"></div>`)}
    <div>${card('Display state machine (mux_ctl / shift_led_data)', `<div id="fsm"></div>`)}${card('Background loop (main)', `<div id="mainl"></div>`)}</div></div>
    ${card('What RD86 changed in slm-1-main.asm (v1.01 → RD86, every hunk)', `<div id="hunks"></div>`)}
    <div class="grid2">${card('Which files differ from the SLM masters (MD5)', hashTable(false))}${card('U6 (DATA3) at the playhead, bit by bit', `<div id="u6"></div>`)}</div>`;
  m.querySelector('#hunks').innerHTML=`<div class="scroll"><table class="kv small"><tr><th>Where</th><th>v1.01 (Jun 2005)</th><th>RD86 (25 Feb 2016)</th><th>Why / effect</th></tr>${HUNKS.map(h=>`<tr><td><b>${h[0]}</b></td><td><pre class="mono" style="margin:0;white-space:pre-wrap;color:var(--bad)">${h[1].replace(/</g,'&lt;')}</pre></td><td><pre class="mono" style="margin:0;white-space:pre-wrap;color:var(--accent)">${h[2].replace(/</g,'&lt;')}</pre></td><td>${h[3]}</td></tr>`).join('')}</table></div>
    <p class="small muted">Lines 1–85 (header "DSB NOV 13,2002"), the ISR, sample_rate_calc, the hold code, read_dipswitch and refresh_lock_status are unchanged. 1000 lines in RD86 against 918 in v1.01.</p>`;
  const draw=()=>{
    const t=SIM.t, s=sim(), fs=s.fs, n=idx(t), per=C.CCLK/fs, cyc=((t*fs)%1)*per, k=lastMux(t), F=k>=0?s.frames[k]:null, isMux=F&&F.n===n;
    let acc=0, cur=-1; if (D.power && n>=s.bootN) for (let j=0;j<ISR.length;j++){ const dd=(ISR[j][2]+(j===4&&isMux?C.TRANSLATE_CYC/2.2:0))*2.2; if (cyc>=acc && cyc<acc+dd) cur=j; acc+=dd; }
    let sv=`<svg viewBox="0 0 540 ${ISR.length*38+60}" style="width:100%"><text x="10" y="18" font-size="11" fill="var(--ink)">Sample ${n.toLocaleString()} · cycle ${cyc.toFixed(0)} of ${per.toFixed(0)}${isMux?' · mux sample: translate runs':''}</text>`;
    ISR.forEach((p,j)=>{ const y=28+j*38, on=cur===j; sv+=`<rect x="20" y="${y}" width="500" height="31" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="${j===4||j===7?'var(--warn)':'var(--line)'}"/><text x="30" y="${y+13}" font-size="11.5" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${p[0]}</text><text x="30" y="${y+26}" font-size="10" fill="${on?'#fff':'var(--ink2)'}">${p[1]}</text>`; });
    sv+=`<text x="20" y="${28+ISR.length*38+16}" font-size="10.5" fill="var(--ink2)">${cur<0?(D.power?'Between interrupts: main runs.':'Powered off.'):'Inside sport0_isr.'} Orange outline = the two routines RD86 rewrote. Cycle counts ${inf}.</text></svg>`;
    m.querySelector('#flow').innerHTML=sv;
    const st=!F?'idle':(n-F.n<C.SHIFT?'shift':'show');
    const node=(x,y,l,on,sub)=>`<g><rect x="${x-72}" y="${y-26}" width="144" height="52" rx="10" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="${x}" y="${y-4}" text-anchor="middle" font-size="12" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${l}</text><text x="${x}" y="${y+13}" text-anchor="middle" font-size="9.5" fill="${on?'#fff':'var(--ink2)'}">${sub}</text></g>`;
    m.querySelector('#fsm').innerHTML=`<svg viewBox="0 0 480 170" style="width:100%"><defs><marker id="rdfa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      ${node(85,70,'SHOW',st==='show','BIT30=0 · FLG8 = '+(F?F.side:'–'))}${node(240,70,'mux_ctl',isMux,'BIT31 ^= 1, translate')}${node(395,70,'SHIFT',st==='shift',F?`clock ${Math.min(36,Math.floor((n-F.n)/2))}/36 · ${F.side?'shift5-8':'shift1-4'}`:'')}
      <path d="M157 64 H166" stroke="var(--ink2)" marker-end="url(#rdfa)"/><path d="M312 64 H321" stroke="var(--ink2)" marker-end="url(#rdfa)"/><path d="M395 98 Q240 160 85 98" fill="none" stroke="var(--ink2)" marker-end="url(#rdfa)"/>
      <text x="240" y="150" font-size="10" text-anchor="middle" fill="var(--ink2)">clock_counter = 36 → BIT30 clr, FLG8 = side</text><text x="10" y="16" font-size="11" fill="var(--ink)">${F?`Frame ${k}: AFTER sends ${F.side?'RIGHT':'LEFT'} · BEFORE would send both`:'no frame yet'}</text></svg>`;
    m.querySelector('#mainl').innerHTML=`<table class="kv"><tr><th>main</th><td class="mono small">call sample_rate_calc → ${fsClass(fs)===44100?'441':fsClass(fs)/1000} kHz constants (|Δemuclk| ≈ ${C.EMU[fsClass(fs)]})</td></tr>
      <tr><th>main_vuloop</th><td class="mono small">for r5 = 0,1: vu/pk_results = clamp(VUMeterGet + meter_cal, 0, 255); phase from channel 0</td></tr>
      <tr><th>Now</th><td class="mono small">L ${clampR(rawR(s.vu[0][n])+s.cal)} / ${clampR(rawR(s.pp[0][n])+s.cal)} · R ${clampR(rawR(s.vu[1][n])+s.cal)} / ${clampR(rawR(s.pp[1][n])+s.cal)} · phase ${s.ph[n]}</td></tr></table>`;
    if (F){ const st2=streams(F,D.eng);
      const lab=b=> b===0?'start' : b<=9?'PHASE'+b : b===10?'LOCK1 (LOCK)' : b===11?'LOCK2 (NO LOCK)' : b<=15?'LOCK'+(b-9)+' (n.c. '+'inferred'+')' : b===16?'R select' : b===17?'L select' : 'n.c.';
      m.querySelector('#u6').innerHTML=`<p class="small">Engine: <b>${ENG[D.eng]}</b> · ${F.side?'right':'left'} frame · phase index ${F.ph}</p><div style="max-height:320px;overflow:auto"><table class="kv small"><tr><th>bit</th><th>U6 output</th><th>value</th><th>set by</th></tr>${Array.from({length:18},(_,b)=>`<tr class="${st2.d[2][b]?'hl':''}"><td class="mono">${b}</td><td>${lab(b)}</td><td class="mono">${st2.d[2][b]}</td><td class="small">${st2.why[2][b]||(b===0?'start bit':'')}</td></tr>`).join('')}</table></div>`; }
    else m.querySelector('#u6').innerHTML='<p class="muted small">No frame yet.</p>';
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__rd86Active=false;
  m.innerHTML=card('What RD86 decided, and what became of it', `<ol>
    <li><b>Decided: start from the digital master v1.01, not v1.02.</b> By MD5, 29 of the 40 files in <span class="mono">V030000/</span> are byte-identical to <span class="mono">sharc/slm-1-v1.00</span> and <span class="mono">v1.01</span> (June 2005). <span class="mono">slm-1_INIT.ASM</span> (9bdac393) differs from v1.02 and v1.02test. So RD86 does not have v1.02's "move flg9 clear in isr to lengthen pulse for pic L/R test". If the old board's PIC relied on that pulse, RD86 lost it ${inf}.</li>
    <li><b>Decided: borrow the 57-LED display engine from the analog SLM-1A.</b> The eight added files (<span class="mono">slm1_vu_data1-3.dat</span>, <span class="mono">slm1_pk_data1-3.dat</span>, <span class="mono">slm1_vu_data.c</span>, <span class="mono">slm1_vu_data1</span>) are identical to <span class="mono">slm1v102 analog</span> and to both POD3A copies. They are not in any digital tree. The rewritten <span class="mono">shift_led_data</span> and <span class="mono">translate_meter_results</span> follow slm1v102 analog almost line for line (BIT31 side select, <span class="mono">high_byte</span>, "+6", select bits 17/16).</li>
    <li><b>Decided: keep the digital front end.</b> Everything AES-specific stays from v1.01: CS8427 SPORT1 control DMA, <span class="mono">refresh_lock_status</span>, "force meter off if no lock", FLG10O "FOR PIC", <span class="mono">sample_rate_calc</span> with 32/44.1/48/96 kHz constants, and <span class="mono">read_dipswitch</span> "·4 − 6", which gives the manual's −20/−18/−16/−14 dBFS. Also kept: v1.01's <span class="mono">vumeter.asm</span> (e0655fbc), not the analog 52 kHz one.</li>
    <li><b>Missed: the phase table.</b> <span class="mono">phase_data[257]="sdm_phase_data.dat"</span> is still the 41-LED version (b2a57cd3 = v1.01). The analog version (daf66900) drives bits 1-9. The old table sets bits 11-17. On the SLM1-4 head those are U6 LOCK2 (= NO LOCK LED), LOCK3-6 and the R/L selects (slm1-4iss1.net: LOCK2 on U6-9, R on U6-4, L on U6-3). Result: the 9 phase LEDs never light. NO LOCK lights whenever the correlation is below about +0.44, including silence. Below index 72 (strong anti-phase) a left frame also selects the right bar, and the other way round.</li>
    <li><b>Missed: the lock LEDs.</b> In the right-channel code, <span class="mono">//r0=dm(lock_status); //r1=r0 or r1;</span> is commented out and nothing else sends bit 10/11. The LOCK LED stays dark. With no AES the bars blank, and the phase row reads "in phase" (index 255 → bit 12 = LOCK3), so the NO LOCK LED actually goes <i>off</i>.</li>
    <li><b>Fixed in passing: the right-hand hold mask.</b> v1.01 ANDs the "−1 mask" into r2 after ORing r2 into the right word, so it did nothing. RD86 (like the analog code) masks first. The −1 mask on DATA2 that the analog code applies to bit 1 was <i>not</i> copied. On the SLM1-4 head, DATA2 bit 1 is D0 = the PR LED, so it now lights with any signal, as on the 21262 firmware.</li>
    <li><b>Kept from the analog code, with its quirks.</b> The peak LED (<span class="mono">pk_led_left_1_on</span> = bit 17 of DATA1) lights the <b>+11</b> bar segment, not a separate LED. The PPM dot can't show above +17 (rows 0–5 of slm1_pk_data1 are unreachable). The right channel's <span class="mono">ppm_hold_r</span> flags decide whether <i>both</i> holds reset. These are all the same as POD3A (see pod3a.js).</li>
    <li><b>Hardware question not answered in the archive.</b> The SLM1-4 head receives DATA_IN3 through U102 (a DS26LS32A differential receiver). The 21065L drives FLG4-7 single-ended. A line-driver cable or adapter is needed, and none is archived ${inf}.</li>
    <li><b>The 2016 session.</b> File times: <span class="mono">SLM-1n.dpj</span> 13:00:34, <span class="mono">slm-1-main.asm</span> 13:03:36, <span class="mono">SLM-1n.mak</span> 13:12:08, all on 25 Feb ${Y(2016)}. The .dpj header says "generated Thu Feb 25 16:11:47 2016", about 3 h 11 min after its file time (a clock or time-zone difference ${inf}). The makefile points at <b>VisualDSP 4.0</b> on F:, not 3.5 as in 2005 (the folder README guessed 5.x). Its loader option still reads "-Version>3.5". The makefile's link line lists every object twice. <span class="mono">SLM-1n.dpj</span> also differs from every master copy (113a9cc4), because VisualDSP re-saved it.</li>
    <li><b>What became of it.</b> Nothing went further. There is no <span class="mono">.dxe</span> or <span class="mono">.ldr</span>, and there is no later version folder. <span class="mono">R&amp;D_List.xls</span> stops at RD85, so RD86 is not in the register at all. The SLM-1D kept shipping on the SLM1-5 (21262 + CS8416) board, and the "To Delete" SLM folder holds no 21065L SLM1-4 build. With the phase and lock gaps above, this source could not have passed the SLM1 test report. It reads as an unfinished bench experiment ${inf}.</li>
    <li><b>Leftovers and naming.</b> The folder <span class="mono">V030000</span> does not match the v1.00–v1.02 names (perhaps "V03.00.00", ${inf}). <span class="mono">Debug/vms44_main.asm</span> is a stray POD22/VMS44 main ("DSB OCT4, 2002"), copied with every SLM-1 tree. <span class="mono">slm-1_ISR_table.ASM</span> is headed "VMS44" and keeps an AD1819 comment. The six <span class="mono">sdm_vu/pk</span> tables are still in the folder but commented out (the 2016 makefile no longer lists them), and <span class="mono">SLM-1.dpj</span> / <span class="mono">SLM-1.mak</span> are the untouched 2003 originals (H:\\SLM-1\\sharc\\slm-1-v1.00).</li>
  </ol>`)+card('Assumptions in this simulation', `<ul class="small">
    <li>CCLK = 60 MHz; ISR and translate cycle counts; the 59 ms CS8427 control cycle (from RDIV1); 10 ms boot (${inf}).</li>
    <li>DIP ON = contact closed = flag 0 (pull-ups, ${inf}). With no AES the CS8427 output is taken as zeros.</li>
    <li>The 41-LED head's output-to-LED wiring and layout come from the sdm_* table comments; the order of its 7 phase LEDs follows the order the table fills bits (12, 13, 11, 14…17) ${inf}.</li>
    <li>SLM1-4 head: U5 OUT2 = red marker beside the bar, LOCK3-6 drive no LED (${inf}, as in slm.js). Phase/lock LEDs show the last latched U6 frame; eye view averages the last two frames (half-lit = one of two).</li>
    <li>The "what-if" engine is not in the archive: it swaps in the analog sdm_phase_data.dat and ORs lock bit 10/11 into both frames.</li>
    <li>VUMeterGet results are taken as current every sample; the real main loop lags by a fraction of a sample.</li></ul>`)+card('Sources', `<ul class="small mono">
    <li>ENGINEERING - 2016 RD FILES/RD86-SLM1D with old board/V030000/ (all files; hashed)</li>
    <li>#SLM #SERIES - To Delete/SLM - #Engineering - To Delete/SLM-1/sharc/slm-1-v1.00, v1.01, v1.02, v1.02test, slm1v100/101/102 analog</li>
    <li>#POD #SERIES/POD3A - #Master/POD3A - #Engineering/sharc/v100, working v101</li>
    <li>…/SLM-1/PCB/SLM-1-4/OBSOLETE/slm1-4iss1.net · …/SLM-1/SLM1 MANUAL.pdf, SLM1 MANUAL mod.pdf, SLM1 MANUAL .doc</li>
    <li>SLM &amp; SLM-RMK1&amp;2 - #ARTWORK #DA #2016/SLM-1M7-SILK(CURVE).cdr, SLM-1M2-SILK(CURVE).cdr, PICS/</li>
    <li>ENGINEERING - 2016 RD FILES/README.md, R&amp;D_List.xls(.md)</li></ul>`);
}

/* ---------------- register plugin ---------------- */
SIM.register({
  id: ID, name:'RD86 · SLM-1D on the old ADSP-21065L board ('+Y(2016)+')', duration:1,
  product:'RD86 SLM-1D old board', year:2016, family:'R&D register',
  folder:'ENGINEERING - 2016 RD FILES/RD86-SLM1D with old board',
  summary:'A 2016 R&D attempt to drive the 57-LED SLM1-4 head from the 2002 SLM-1 board (ADSP-21065L + CS8427). The digital v1.01 firmware was merged with the analog SLM-1A display engine. Before/after simulator, MD5 comparison with every SLM master, and the two parts the port missed.',
  highlights:['Before (v1.01, 41-LED head) and after (RD86, SLM1-4 head) driven by the same samples','Hash check: 29 files = v1.01, 8 tables = slm1v102 analog / POD3A, only slm-1-main.asm edited','Old 7-LED phase table lands on U6 LOCK2-6 and the L/R selects','Lock LED never sent; ERROR only on the old head','MM5450 frames bit by bit, both layouts'],
  depth:'Full model',
  stepUnits:[
    {label:'1 sample', period:()=>1/D.fs},
    {label:'1 MM5450 clock (2 samples)', period:()=>2/D.fs},
    {label:'1 mux frame (300 samples)', period:()=>C.MUX/D.fs},
    {label:'10 ms', period:()=>0.01},
    {label:'1 CS8427 cycle', period:()=>C.CS_POLL},
  ],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[0.02,'20 ms (L/R cycles)'],[0.004,'4 ms (shift bursts)'],[0.0015,'1.5 ms (one shift)'],[0.0002,'200 µs (samples)']],
  defaultZoom:0,
  init(){ SK=''; },
  tabs:[
    {id:'sim', label:'Simulator (before / after)', render:viewSim},
    {id:'tutorial', label:'Tutorial: doing the port', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
