/* =====================================================================
   SLM series — SLM-1D stereo loudness meter (Ward-Beck Systems)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Main model: SLM-1D (AES input, 75 Ω BNC) built from
     SLM1-5 DSP board (ADSP-21262 + CS8416), firmware slm-1-5dsp__slm1_4led v102 (1 Jun 2007|40)
     SLM1-4 LED head (3× MM5450, 57-LED bars) and the 2016|49 SLM-1M7 lens / SLM-1M2 rear silks.
   Comparison engine: the original SLM-1, ADSP-21065L, sharc/slm-1-v1.02 ("DSB Nov 13 2002").

   Sources used (all under "#SLM #SERIES - To Delete/"):
   - SLM - #Engineering - To Delete/SLM-1/slm1-5_dsp board software/slm-1-5dsp__slm1_4led/v102/
       backgnd.c (main, refresh), sample.c (SampleInit, SampleIRQ), vumeter.asm, phasemeter.asm,
       SSensor.asm, slm1_vu_data.c (slm_4_vu/pk tables), configdai.c (InitDAI), cs8416_ctl_dat.c,
       timer.c/.h, sysdef.h, slm1-1.dpj/.mak (what is actually built), shifter.asm, SS_tallies.c,
       spi.c, refresh.c, rlm24_proc.c (RLM24 "shell262" leftovers)
   - .../SLM-1/slm1-6_dsp board software/v102A/  (SLM1-6 analog board, AK5381)
   - .../SLM-1/sharc/slm-1-v1.02/ slm-1-main.asm, slm-1_INIT.ASM, sdm_*_data*.dat, vumeter.asm, phasemeter.asm
   - .../SLM-1/PCB/SLM-1-5/PCB/slm1-5iss3.net + SLM1-5iss3.bom, SLM-1-4/OBSOLETE/slm1-4iss1.net, SLM1-4iss2.bom
   - .../SLM-1/SLM1 MANUAL mod.pdf (21 Feb 2007|40), SLM1 MANUAL.pdf (2003|36), SLM1 MANUAL .doc (2014|47)
   - SLM & SLM-RMK1&2 - #ARTWORK #DA #2016/SLM-1M7-SILK(CURVE).cdr, SLM-1M2-SILK(CURVE).cdr, PICS/*.jpg
   - SLM1 - #TESTREPORT/SLM1A-V101A-25JAN10.pdf
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const Y = y => SIM.year(y);
const inf = '<span class="tag-inf" title="Not stated in the source; inferred — see the note next to it">inferred</span>';
const ASSET = 'siumulation-plugins/assets/';

/* ---------------- constants from the source ---------------- */
const C = {
  XTAL: 24.576e6,                 // X1 on SLM1-5iss3.bom
  CCLK: 24.576e6*6,               // INFERRED: CLK_CFG default 6:1 → 147.456 MHz (fits DIV2 "100 Hz FS" and DIV4 below)
  TIMER_RATE: 100000/2,           // timer.h: "1 msec rate based on 100MHZ system freq"
  MUX_TICKS: 10, BLANK_TICKS: 2, HOLD_TICKS: 3000,          // backgnd.c SetTimer(GP_TIMER1,10) / (GP_TIMER0,2) / (GP_TIMER2,3000)
  TCONST_VU: 0.000319752,         // vumeter.asm VUMeterInit (v102 never overrides it)
  TCONST_PPM_ATTACK: 0.02276277,
  DECAY_T2_48: 0.0000383757,      // backgnd.c peak_decay_2_48 "type2(3 seconds)"
  DECAY_T1_48: 0.0000767499,      // backgnd.c peak_decay_1_48 "type1(1 second)" (really 1.5 s)
  VUGET_K: 0.96275853891,         // vumeter.asm VUMeterGet "DSB Feb20,2006"
  PH_ALPHA_V102: 0.9999, PH_ALPHA_G1: 0.999, PH_THRES: 1e-4,
  SS_T: 0.99968, SS_THRES: 0.000001, SS_DET: 48000*2,         // SSensor.asm TCONST_RMS, DEFAULT_THRES, SAMPLE_RATE*2
  DIV4: 183, FRAME_BITS: 128,     // sample.c SetIOP(DIV4,183); display_data_A/B/C[4] × 32 bits
  CS_POLL: 0.09,                  // INFERRED: SPORT2 I²S at "100 Hz FS" (DIV2) × 9 frames for the 18-word table
  ISR_CYC: [['dispatch (interrupts())',110],['swap TDM buffers · float by −31',24],['PhaseMeterCalc',32],['VUMeterCalc',38],['return',90]], // INFERRED cycle counts
  BG_CYC: 640,                    // INFERRED background while(1) pass, cycles
  G1: {                            // slm-1-main.asm (ADSP-21065L)
    VU:  {32000:0.0005754806, 44100:0.0004176153, 48000:0.0003836906, 96000:0.0001918637},
    ATT: {32000:0.03394912,   44100:0.02475070,   48000:0.02276277,   96000:0.01138138},
    D1:  {32000:0.0000575630, 44100:0.0000417694, 48000:0.0000383757, 96000:0.0000191880},  // "type2(3 seconds)"
    D2:  {32000:0.0001151226, 44100:0.000083537,  48000:0.0000767499, 96000:0.0000383757},  // "type1(1 second)"
    EMU: {96000:301, 48000:598, 44100:647, 32000:897}, // sample_rate_calc compares the emuclk difference (32k: range test, value inferred)
    PK_HOLD: 200000, PK_THRESH: 0.707, MUX: 300, SHIFT_ISRS: 72, CORE: 60e6, ISR_CYC: 260, TRANSLATE_CYC: 700,
  },
};
const SCLK4 = () => C.CCLK/(4*(C.DIV4+1));          // ≈ 200.3 kHz (inferred clock)
const FRAME = () => C.FRAME_BITS/SCLK4();             // ≈ 0.639 ms
const FSS = [32000, 44100, 48000, 96000];

/* ---------------- display tables (run-length copies of slm1_vu_data.c and sdm_*_data*.dat) ---------------- */
function rle(len, runs){ const a=new Array(len); let j=0; for(let i=0;i<len;i++){ while(j+1<runs.length && runs[j+1][0]<=i) j++; a[i]=runs[j][1]; } return a; }
const VU1 = rle(282,[[0,20],[7,19],[9,18],[11,17],[13,16],[15,15],[17,14],[19,13],[21,12],[23,11],[25,10],[27,9],[29,8],[31,7],[33,6],[35,5],[37,4],[39,3],[41,2],[43,1],[45,0],[47,-1],[49,-2],[51,-3],[53,-4],[55,-5],[57,null]]);
const VU2 = rle(279,[[0,-6],[59,-7],[61,-8],[63,-9],[65,-10],[67,-11],[69,-12],[71,-13],[73,-14],[75,-15],[77,-16],[79,-17],[81,-18],[83,-19],[85,-20],[87,-22],[91,-24],[95,-26],[99,-28],[103,-30],[107,-32],[111,-34],[115,-36],[119,-38],[123,-40],[127,-42],[131,-44],[135,-46],[139,-48],[143,-50],[147,-52],[151,null]]);
const VU3 = rle(279,[[0,'pr'],[161,null]]);
const PK1 = rle(276,[[0,20],[1,19],[3,18],[5,17],[7,16],[9,15],[11,14],[13,13],[15,12],[17,11],[19,10],[21,9],[23,8],[25,7],[27,6],[29,5],[31,4],[33,3],[35,2],[37,1],[39,0],[41,-1],[43,-2],[45,-3],[47,-4],[49,-5],[51,null]]);
const PK2 = rle(273,[[0,null],[51,-6],[53,-7],[55,-8],[57,-9],[59,-10],[61,-11],[63,-12],[65,-13],[67,-14],[69,-15],[71,-16],[73,-17],[75,-18],[77,-19],[79,-20],[81,-22],[85,-24],[89,-26],[93,-28],[97,-30],[101,-32],[105,-34],[109,-36],[113,-38],[117,-40],[121,-42],[125,-44],[129,-46],[133,-48],[137,-50],[141,-52],[145,null]]);
const G1VU = rle(256,[[0,14],[13,13],[15,12],[17,11],[19,10],[21,9],[23,8],[25,7],[27,6],[29,5],[31,4],[33,3],[35,2],[37,1],[39,0],[41,-1],[43,-2],[45,-3],[47,-4],[49,-5],[51,-6],[53,-7],[55,-8],[57,-9],[59,-10],[61,-11],[63,-12],[65,-13],[67,-14],[69,-15],[71,-16],[75,-18],[79,-20],[83,-22],[87,-24],[91,-26],[95,-28],[99,-32],[107,-36],[115,-38],[123,null]]);
const G1PK = rle(262,[[0,14],[13,13],[15,12],[17,11],[19,10],[21,9],[23,8],[25,7],[27,6],[29,5],[31,4],[33,3],[35,2],[37,1],[39,0],[41,-1],[43,-2],[45,-3],[47,-4],[49,-5],[51,-6],[53,-7],[55,-8],[57,-9],[59,-10],[61,-11],[63,-12],[65,-13],[67,-14],[69,-15],[71,-16],[75,-18],[79,-20],[83,-22],[87,-24],[91,-26],[95,-28],[99,-32],[107,-36],[115,-38],[123,null]]);
const G1PH = rle(257,[[0,7],[36,6],[72,5],[108,4],[148,3],[184,2],[220,1]]);
const at = (arr,i)=> arr[Math.max(0,Math.min(arr.length-1,i))];

/* bit patterns rebuilt from the #defines in slm1_vu_data.c */
const vu1Bits = N => N==null? 0 : (Math.pow(2,N+7)-1)>>>0;                              // vu20=0x07ffffff … vu_5=0x3
const vu2Bits = N => { if(N==null) return 0; const n=-N, c = n<=20? 31-(n-6) : 16-(n-22)/2; return (Math.pow(2,c)-1)>>>0; }; // vu_6=0x7fffffff … vu_52=1
const pk1Bits = N => N==null? 0 : (Math.pow(2,N+6)+1)>>>0;                              // pk20=0x04000001 … pk_5=0x3
const pk2Bits = N => { if(N==null) return 0; const n=-N, b = n<=20? 30-(n-6) : 15-(n-22)/2; return Math.pow(2,b)>>>0; };
const PR_BITS = 0xF0000000>>>0;
const PH = [0x002,0x006,0x00e,0x01e,0x03e,0x07e,0x0fe,0x1fe,0x3fe];                       // backgnd.c ph1..ph9
const LOCK1 = 0x400, LOCK2 = 0x800;

/* 57-LED scale (SLM-1M7 silk): k = 0 at +20 … k = 56 at −52 */
const LAB57 = []; for(let v=20; v>=-20; v--) LAB57.push(v); for(let v=-22; v>=-52; v-=2) LAB57.push(v);
const kOf = L => L==null? null : (L>=-20? 20-L : 40+(-L-20)/2);
const fmtL = L => L==null? '—' : (L>0? '+'+L : String(L));

/* ---------------- device state ---------------- */
const D = {
  power: true,
  plugged: true, plugT: null,            // AES cable; plugT = sim time of the last plug/unplug (null = always)
  fs: 48000,
  src: 'program', level: -20, freq: 1000, phase: 'in',
  dip: { bs1:false, bs0:false, cal1:true, cal0:true },   // true = ON (switch closed to GNDD). Manual default: 0VU = −20 dBFS
  eng: 'v102',                           // 'v102' = ADSP-21262 SLM1-5 board (main) · 'g1' = ADSP-21065L v1.02 (comparison)
  tick: 'xtal',                          // 'xtal' = 50 000 cycles at 147.456 MHz (inferred) · 'comment' = 1 ms as timer.h says
  ss: false,                             // what-if: enable SSensorCalc (commented out in sample.c)
  view: 'eye',                           // 'eye' = persistence of vision · 'mux' = what a high-speed camera sees
  log: [],
};
const tick = () => D.tick==='comment'? 1e-3 : C.TIMER_RATE/C.CCLK;
const conn = t => D.plugT===null? D.plugged : (t < D.plugT ? !D.plugged : D.plugged);
const calx = () => { const c = (D.dip.cal0?0:0x100000) | (D.dip.cal1?0:0x400000);           // FLAG10 = DIP1 = CAL0, FLAG11 = DIP2 = CAL1
  return c===0? 0 : c===0x100000? 8 : c===0x400000? 4 : 12; };
const g1cal = () => 4*((D.dip.cal1?0:1) + 2*(D.dip.cal0?0:1)) - 6;                          // read_dipswitch: ((astat&cal_mask)>>21)*4 − 6
const nominal = () => -20 + (D.eng==='g1'? (g1cal()+6) : calx())/2;
const fsClass = fs => fs>=60000? 96000 : fs>=46000? 48000 : fs>=36000? 44100 : 32000;      // sample_rate_calc ranges

/* ---------------- the test source (not part of the SLM) ---------------- */
function hsh(i){ i = (i|0) ^ 61 ^ ((i|0) >>> 16); i = (i + (i << 3))|0; i ^= i >>> 4; i = Math.imul(i, 0x27d4eb2d); i ^= i >>> 15; return (i>>>0)/4294967296; }
function sig(n, fs){
  const t = n/fs, amp = Math.pow(10, D.level/20), w = 2*Math.PI*D.freq;
  if (D.src==='silence') return [0,0];
  if (D.src==='tone' || D.src==='burst'){
    let g = 1; if (D.src==='burst'){ const ph = t - Math.floor(t); g = (ph>=0.1 && ph<0.4)? 1 : 0; }
    const L = g*amp*Math.sin(w*t);
    const R = D.phase==='in'? L : D.phase==='180'? -L : D.phase==='90'? g*amp*Math.sin(w*t - Math.PI/2) : D.phase==='L'? 0 : g*amp*Math.sin(w*1.5013*t + 1);
    return [L,R];
  }
  // programme: a deterministic "music-like" signal, notes every 125 ms
  const seg = Math.floor(t/0.125), tl = t - seg*0.125;
  const env = (0.25 + 0.75*hsh(seg*7+1))*Math.exp(-tl*6) + 0.06;
  const f = 110*Math.pow(2, Math.floor(hsh(seg*7+2)*30)/12), k = 2*Math.PI*f*t;
  const ns = hsh(seg*13+5)<0.35? 1 : 0.25;
  const a = amp*2.2*env;
  const L = a*(0.7*Math.sin(k) + 0.25*Math.sin(2*k+1) + 0.35*ns*(hsh(n*3+11)-0.5)*2);
  let R;
  if (D.phase==='L') R = 0;
  else if (D.phase==='unc'){ const s2=Math.floor(t/0.11), e2=(0.25+0.75*hsh(s2*9+3))*Math.exp(-(t-s2*0.11)*6)+0.06, f2=110*Math.pow(2,Math.floor(hsh(s2*9+4)*30)/12);
    R = amp*2.2*e2*(0.7*Math.sin(2*Math.PI*f2*t) + 0.35*(hsh(n*5+17)-0.5)*2); }
  else { R = a*(0.7*Math.sin(k + (D.phase==='90'? Math.PI/2 : 0.3)) + 0.25*Math.sin(2*k+1.4) + 0.35*ns*(hsh(n*5+17)-0.5)*2); if (D.phase==='180') R = -R; }
  return [Math.max(-1,Math.min(1,L)), Math.max(-1,Math.min(1,R))];
}

/* ================================================================
   DSP SIMULATION — every sample of a 2 s pre-roll and the 1 s on show
   pass 1 = the interrupt (SampleIRQ / sport0_isr), pass 2 = the background loop
   ================================================================ */
const PRE = 2.0;
let SN = null, SN_KEY = '';
function simKey(){ return [D.fs,D.src,D.level,D.freq,D.phase,D.dip.bs0,D.dip.bs1,D.dip.cal0,D.dip.cal1,D.eng,D.tick,D.plugged,D.plugT,D.power].join('|'); }
function simulate(){
  const key = simKey(); if (key===SN_KEY && SN) return SN; SN_KEY = key;
  const fs = D.fs, g1 = D.eng==='g1', fc = fsClass(fs);
  const Tvu = g1? C.G1.VU[fc] : C.TCONST_VU;
  const TA  = g1? C.G1.ATT[fc] : C.TCONST_PPM_ATTACK;
  const TD  = g1? (D.dip.bs0? C.G1.D1[fc] : C.G1.D2[fc]) : (D.dip.bs0? C.DECAY_T2_48 : C.DECAY_T1_48);
  const aPh = g1? C.PH_ALPHA_G1 : C.PH_ALPHA_V102;
  const DEC = Math.max(1, Math.round(fs/4000));
  const n0 = -Math.round(PRE*fs), n1 = Math.round(1.0*fs)+DEC;
  const M = Math.ceil((n1-n0)/DEC)+1;
  const S = { fs, DEC, n0, M, t0:n0/fs, dt:DEC/fs, g1, Tvu, TA, TD, aPh,
    vu:[new Float32Array(M),new Float32Array(M)], ppm:[new Float32Array(M),new Float32Array(M)],
    sum:new Float32Array(M), dif:new Float32Array(M), pkAbs:[new Float32Array(M),new Float32Array(M)],
    ss:[new Float32Array(M),new Float32Array(M)], ssCnt:[new Int32Array(M),new Int32Array(M)], ssSt:[new Uint8Array(M),new Uint8Array(M)],
    g1led:[new Uint8Array(M),new Uint8Array(M)], g1ledCnt:[new Int32Array(M),new Int32Array(M)],
    hold:[new Int16Array(M),new Int16Array(M)], holdLeft:[new Float32Array(M),new Float32Array(M)] };
  let vu=[0,0], ppm=[0,0], sm=0, df=0, ms=[0,0], cnt=[C.SS_DET,C.SS_DET], st=[1,1], pc=[0,0], pkMax=[0,0];
  let j = 0;
  for (let n=n0; n<n1; n++){
    const t = n/fs; let x = (D.power && conn(t))? sig(n,fs) : [0,0];
    // PhaseMeterCalc: sumAVE/diffAVE single-pole IIR of |L+R| and |L−R|
    sm = aPh*sm + (1-aPh)*Math.abs(x[0]+x[1]); df = aPh*df + (1-aPh)*Math.abs(x[0]-x[1]);
    for (let c=0;c<2;c++){
      const x2 = x[c]*x[c];
      vu[c] += (x2-vu[c])*Tvu;                                   // VU = VU + (in²−VU)·Tvu
      const d = x2-ppm[c]; ppm[c] += Math.max(d*TA, d*TD);         // PPM = max(PPMA, PPMD)
      ms[c] = (ms[c]-x2)*C.SS_T + x2;                             // SSensorCalc MS
      if (ms[c] <= C.SS_THRES) cnt[c] = Math.max(cnt[c]-1, 0); else cnt[c] = C.SS_DET;
      if (cnt[c]===0) st[c] = 0;
      if (g1){ if (pc[c]>0){ pc[c]--; } if (Math.abs(x[c]) > C.G1.PK_THRESH) pc[c] = C.G1.PK_HOLD; } // test_peaks_left_1/right_1
      pkMax[c] = Math.max(pkMax[c], Math.abs(x[c]));
    }
    if ((n-n0)%DEC===0){
      for (let c=0;c<2;c++){ S.vu[c][j]=vu[c]; S.ppm[c][j]=ppm[c]; S.ss[c][j]=ms[c]; S.ssCnt[c][j]=cnt[c]; S.ssSt[c][j]=st[c]; S.g1led[c][j]=pc[c]>0?1:0; S.g1ledCnt[c][j]=pc[c]; S.pkAbs[c][j]=pkMax[c]; pkMax[c]=0; }
      S.sum[j]=sm; S.dif[j]=df; j++;
    }
  }
  S.M = j;
  // ---- pass 2: background loop hold logic ----
  const T = tick();
  let hold=[255,255], until=[-1e9,-1e9];                 // v102 pk_hold[] with GP_TIMER2/3
  let gh=[255,255], gc=[0,0];                             // g1 ppm_hold_left/right with ppm_counter_*
  for (let i=0;i<S.M;i++){
    const t = S.t0 + i*S.dt;
    if (!g1){
      const pk = [pkIdx(S,0,i), pkIdx(S,1,i)];
      for (let c=0;c<2;c++){
        if (!D.dip.bs1){                                   // flag_reg & 0x04000000 != 0 → DIP4 (BS1) OFF → hold on
          if (pk[c] < hold[c]){ hold[c] = pk[c]; until[c] = t + C.HOLD_TICKS*T; }
          else if (t >= until[c]) hold[c] = 0xff;
        } else hold[c] = 0xff;
        S.hold[c][i] = hold[c]; S.holdLeft[c][i] = Math.max(0, until[c]-t);
      }
    } else {
      const pk = [g1Pk(S,0,i), g1Pk(S,1,i)];
      for (let c=0;c<2;c++) gc[c] = Math.max(0, gc[c]-DEC);
      if (!D.dip.bs1){                                     // astat bit 19 (FLG0 = BS1) set → OFF → peak hold on
        const fl = [];
        for (let c=0;c<2;c++){
          if (pk[c] <= gh[c]){ fl[c] = (pk[c]!==gh[c]); gc[c] = C.G1.PK_HOLD; gh[c] = pk[c]; }   // ppm_hold_left0: comp(r0,r1) leaves NE/EQ
          else if (gc[c]!==0) fl[c] = true;                                                      // "r0=pass r0; if ne rts"
          else { gh[c] = 255; fl[c] = false; }                                                   // counter 0 → hold off, flags EQ
        }
        if (!fl[1]){ gh[0] = 255; gh[1] = 255; }           // bs1_is_off0: "if ne jump" sees the RIGHT routine's flags
      } else { gh[0]=255; gh[1]=255; }
      for (let c=0;c<2;c++){ S.hold[c][i] = gh[c]; S.holdLeft[c][i] = gc[c]/S.fs; }
    }
  }
  SN = S; return S;
}
function snapI(t){ const S = simulate(); return Math.max(0, Math.min(S.M-1, Math.floor((t - S.t0)/S.dt + 1e-9))); }
function vuGet(ms, k){ const f = ms*(k||1); if (!(f>0)) return 255; const p = Math.min(-20*Math.log10(f), 255); return Math.round(p); } // VUMeterGet: −2·10log10, min 255, fix
function vuIdx(S,c,i){ return Math.max(vuGet(S.vu[c][i], C.VUGET_K) + calx(), 6); }          // backgnd.c
function pkIdx(S,c,i){ return Math.max(vuGet(S.ppm[c][i], C.VUGET_K) + calx(), 0); }
function g1Vu(S,c,i){ return Math.max(0, Math.min(255, vuGet(S.vu[c][i]) + g1cal())); }       // main_vuloop: max(r14), min(r15)
function g1Pk(S,c,i){ return Math.max(0, Math.min(255, vuGet(S.ppm[c][i]) + g1cal())); }
function phaseR(S,i){ const s=S.sum[i], d=S.dif[i]; let y = (s+d >= C.PH_THRES)? (s-d)/(s+d) : 0; y = Math.max(-1,Math.min(1,y)); return Math.trunc(y*128+128); } // PhaseMeterGet
function phaseN(r){ return r>224?1 : r>196?2 : r>168?3 : r>140?4 : r>112?5 : r>84?6 : r>56?7 : r>28?8 : 9; }
const readVU = (ms) => D.eng==='g1'? (40 - (-20*Math.log10(Math.max(ms,1e-13)) + g1cal()))/2 : (46 - (-20*Math.log10(Math.max(ms*C.VUGET_K,1e-13)) + calx()))/2;
const readPK = (ms) => D.eng==='g1'? (34 - (-20*Math.log10(Math.max(ms,1e-13)) + g1cal()))/2 : (40 - (-20*Math.log10(Math.max(ms*C.VUGET_K,1e-13)) + calx()))/2;

/* lock as seen by the firmware: the CS8416 RERR register is fetched once per control-port cycle */
const pollT = t => Math.floor((t - 0.08)/C.CS_POLL)*C.CS_POLL + 0.08;
const lockSeen = t => conn(pollT(t));

/* ---------------- MM5450 emulation (datasheet behaviour, inferred): the first '1' is the start bit,
   the next 35 bits are latched to outputs 1–35. No '1' in the frame → outputs keep their old state. ---------------- */
function mm5450(words){
  const bit = p => (words[(p>>5)%words.length] >>> (p&31)) & 1;
  let p=-1; for (let i=0;i<128;i++) if (bit(i)){ p=i; break; }
  if (p<0) return null;
  const o = new Uint8Array(36); for (let i=1;i<=35;i++) o[i] = bit(p+i); o.start = p; return o;
}

/* ---------------- v102 display: blank / refresh events ---------------- */
function v102Words(i, m, t){
  const S = simulate(), c = m;
  const vu = vuIdx(S,c,i), pk = pkIdx(S,c,i), hold = S.hold[c][i];
  let data = pk1Bits(at(PK1,pk)) | (pk1Bits(at(PK1,hold)) & 0xffffffc0);
  let A0 = (vu1Bits(at(VU1,vu)) | data)>>>0;
  let B1 = (vu2Bits(at(VU2,vu)) | pk2Bits(at(PK2,pk)))>>>0;
  let B0 = ((at(VU3,vu)?PR_BITS:0) | (at(VU3,pk)?PR_BITS:0) | 0x10000000)>>>0;
  const locked = lockSeen(t);
  if (!locked){ B0 = 0x10000000; B1 = 0; A0 = 1; }
  const lock_stat = locked? LOCK1 : LOCK2;
  const ph = PH[phaseN(phaseR(S,i))-1];
  const C0 = (m===0? (0x20001|ph) : (0x10001|lock_stat))>>>0;
  return { A:[A0,0,0,0], B:[B0,B1,0,0], C:[C0,0,0,0], vu, pk, hold, locked, ph, m,
    vuL: at(VU1,vu)!=null? at(VU1,vu) : at(VU2,vu), pkL: at(PK1,pk)!=null? at(PK1,pk) : at(PK2,pk), holdL: at(PK1,hold) };
}
const BLANK = { A:[1,0,0,0], B:[0x10000000,0,0,0], C:[1,0,0,0], blank:true };
function latchAll(w, prev){
  const o = { A: mm5450(w.A), B: mm5450(w.B), C: mm5450(w.C) };
  for (const k of ['A','B','C']) if (!o[k]) o[k] = prev? prev[k] : new Uint8Array(36);
  return o;
}
const EVC = new Map(); let EVK = '', BLANK_OUT = null;
function v102Event(k){            // k-th mux cycle: blank at 10k ticks, refresh at 10k+2 ticks
  simulate(); if (EVK!==SN_KEY){ EVC.clear(); EVK = SN_KEY; }
  if (EVC.has(k)) return EVC.get(k);
  const T = tick(), tr = (10*k+2)*T, m = ((k+1)%2+2)%2;   // mux_count toggles 0→1 on the first refresh: R first
  const i = snapI(tr);
  const w = v102Words(i, m, tr);
  if (!BLANK_OUT) BLANK_OUT = latchAll(BLANK);
  const out = latchAll(w, BLANK_OUT);                      // every refresh follows a blank frame
  const ev = { k, t: tr, m, w, out };
  if (EVC.size > 6000) EVC.clear();
  EVC.set(k, ev); return ev;
}
/* LED state of the panel at time t */
function panelAt(t){
  const P = { bar:[new Uint8Array(57),new Uint8Array(57)], side:[0,0], pr:[0,0], phase:new Uint8Array(9), lock:0, nolock:0, power:D.power,
    info:{} };
  if (!D.power) return P;
  if (D.eng==='g1') return g1PanelAt(t, P);
  const T = tick(), F = FRAME(), u = (t - F)/T;
  const k = Math.floor((u-2)/10), inBlank = (u - 10*Math.floor(u/10)) < 2;
  const cur = v102Event(k), prev = v102Event(k-1);
  const apply = (out, ch) => {
    for (let i=1;i<=26;i++) if (out.A[i]) P.bar[ch][kOf(i-6)] = 1;                     // U3 outputs 1–26 = D34…D59 = −5 … +20
    for (let i=4;i<=34;i++) if (out.B[i]){ const b=i-4, n = b>=16? 6+(30-b) : 22+2*(15-b); P.bar[ch][kOf(-n)] = 1; } // U5 outputs 4–34 = D3…D33
    if (out.B[1]) P.pr[ch] = 1; if (out.B[2]) P.side[ch] = 1;                          // D0 = PR, D1 = red marker (inferred)
  };
  const applyC = (out, which) => {
    if (which!=='lock') for (let i=1;i<=9;i++) if (out.C[i]) P.phase[i-1] = 1;
    if (which!=='phase'){ if (out.C[10]) P.lock = 1; if (out.C[11]) P.nolock = 1; }
  };
  if (D.view==='mux'){
    if (!inBlank){ apply(cur.out, cur.out.C[17]? 0 : 1); applyC(cur.out, 'all'); }
  } else {
    const L = cur.m===0? cur : prev, R = cur.m===1? cur : prev;
    apply(L.out, 0); apply(R.out, 1); applyC(L.out,'phase'); applyC(R.out,'lock');
  }
  P.info = { k, inBlank, cur, prev, T, F };
  return P;
}
/* the 2002 ADSP-21065L engine mapped onto this panel's scale (comparison only) */
function g1PanelAt(t, P){
  const S = simulate(), fs = D.fs, n = Math.floor(t*fs);
  const m = Math.floor((n - C.G1.SHIFT_ISRS)/C.G1.MUX);         // translate_meter_results every 300 ISRs, visible after 72 more
  const tt = m*C.G1.MUX/fs, i = snapI(tt);
  const locked = lockSeen(tt);
  const info = { m, tt, locked, vu:[], pk:[], hold:[] };
  for (let c=0;c<2;c++){
    let vu = g1Vu(S,c,i), pk = g1Pk(S,c,i), hold = S.hold[c][i];
    if (!locked){ vu = pk = hold = 255; }
    const vL = at(G1VU,vu), pL = at(G1PK,pk+6), hL = at(G1PK,hold+6);
    if (vL!=null) for (let kk=kOf(vL); kk<=kOf(-38); kk++) P.bar[c][kk]=1;
    if (pL!=null) P.bar[c][kOf(pL)] = 1;
    if (hL!=null) P.bar[c][kOf(hL)] = 1;
    P.side[c] = (locked && S.g1led[c][snapI(t)])? 1 : 0;
    P.pr[c] = 0;
    info.vu[c]=vL; info.pk[c]=pL; info.hold[c]=hL;
  }
  const n7 = locked? at(G1PH, phaseR(S,i)) : at(G1PH,128);
  const n9 = Math.round(1+(n7-1)*8/6); for (let q=0;q<n9;q++) P.phase[q]=1;
  P.lock = locked?1:0; P.nolock = locked?0:1; info.n7 = n7;
  P.info = info; return P;
}
/* numbers the operator would read off the bars (for the tutorial and inspector) */
function readingAt(t){
  const S = simulate(), i = snapI(t);
  if (D.eng==='g1'){ const P = g1PanelAt(t, {bar:[new Uint8Array(57),new Uint8Array(57)],side:[0,0],pr:[0,0],phase:new Uint8Array(9)}); return { vu:P.info.vu, pk:P.info.pk, hold:P.info.hold, locked:P.info.locked, phaseN:P.info.n7, i }; }
  const r = [0,1].map(c=>{ const vu=vuIdx(S,c,i), pk=pkIdx(S,c,i), h=S.hold[c][i]; return { vu: at(VU1,vu)!=null?at(VU1,vu):at(VU2,vu), pk: at(PK1,pk)!=null?at(PK1,pk):at(PK2,pk), hold: at(PK1,h) }; });
  return { vu:[r[0].vu,r[1].vu], pk:[r[0].pk,r[1].pk], hold:[r[0].hold,r[1].hold], locked: lockSeen(t), phaseN: phaseN(phaseR(S,i)), i };
}

/* ================================================================
   ACTIONS — each one logs the firmware path it takes
   ================================================================ */
function act(name, fn){
  const tr = []; const T = s => tr.push(s);
  fn(T);
  D.log.unshift({ t: SIM.t, name, trace: tr }); if (D.log.length>60) D.log.length = 60;
  SIM.refresh();
}
const DIPS = { cal0:{sw:1, flag:'FLAG10', mask:'0x00100000', pin:'DAI_P1', r:'R8', g1:'FLG3 (ASTAT bit 22)'},
               cal1:{sw:2, flag:'FLAG11', mask:'0x00400000', pin:'DAI_P2', r:'R9', g1:'FLG2 (ASTAT bit 21)'},
               bs0:{sw:3, flag:'FLAG12', mask:'0x01000000', pin:'DAI_P3', r:'R12', g1:'FLG1 (ASTAT bit 20)'},
               bs1:{sw:4, flag:'FLAG13', mask:'0x04000000', pin:'DAI_P4', r:'R14', g1:'FLG0 (ASTAT bit 19)'} };
const A = {
  dip(name){ const d = DIPS[name]; D.dip[name] = !D.dip[name]; const on = D.dip[name];
    act(`DIP ${name.toUpperCase()} (SW${d.sw}) → ${on?'ON':'OFF'}`, T=>{
      if (!D.power){ T('Unit is off: the switch moves, nothing reads it.'); return; }
      if (D.eng==='v102'){
        T(`SW1 pin ${9-d.sw} ${on?'grounds':'releases'} net ${d.pin} (pulled up by DAI_PIN_PULLUP = 0xfffff, via ${d.r}) → ${on?'0':'1'}`);
        T(`InitDAI(): SRU(DAI_PB0${d.sw}_O, ${d.flag}_I) — the DIP is read as a core flag`);
        T(`refresh() ends with asm("r0=FLAGS;dm(_flag_reg)=r0;") → flag_reg bit ${d.mask} = ${on?0:1} (seen within one mux period, ${SIM.fmtDur(C.MUX_TICKS*tick())})`);
        if (name==='cal0'||name==='cal1'){ T(`main while(1): cal = flag_reg & 0x00500000 → calx = ${calx()}`);
          T(`vu_results[k] = max(VUMeterGet(&vumeter_info,k,VUMETER_PARM_VU) + calx, 6): the bar moves ${calx()/2} dB down from the −20 dBFS base`);
          T(`0 VU now = ${nominal()} dBFS (manual table 2: ${nominal()} dBFS ✓)`); }
        if (name==='bs0'){ T(`if ((flag_reg & 0x01000000)==0) testppm = peak_decay_2_48 else testppm = peak_decay_1_48`);
          T(`vumeter_wspace[VUMETER_WS_PPM_DECAY] = ${on? '0.0000383757 → 24 dB in 3.0 s (PPM Type 2)' : '0.0000767499 → 24 dB in 1.5 s (PPM Type 1)'}`); }
        if (name==='bs1'){ T(`if ((flag_reg & 0x04000000) != 0) → ${on? 'false: pk_hold[0] = pk_hold[1] = 0xff (Peak Hold Off)' : 'true: pk_results < pk_hold → pk_hold = pk_results; SetTimer(GP_TIMER2/3, 3000) "3 second hold"'}`);
          if (!on) T(`3000 GP-timer ticks = ${SIM.fmtDur(C.HOLD_TICKS*tick())} with the ${D.tick==='xtal'?'crystal-derived (inferred)':'commented 1 ms'} tick`); }
      } else {
        T(`ADSP-21065L: DIP drives ${d.g1}; sport0_isr saves it every sample: dm(astat_save)=astat`);
        if (name==='cal0'||name==='cal1') T(`read_dipswitch: meter_cal = ((astat_save & cal_mask) >> 21)·4 − 6 = ${g1cal()} → 0 VU = ${nominal()} dBFS`);
        if (name==='bs0') T(`sample_rate_calc → update_meter_parameters_${fsClass(D.fs)/1000|0}: BS0 mask b#…100000000000000000000 → ${on?'peak_decay_1 (3 s, Type 2)':'peak_decay_2 (1.5 s, Type 1)'}`);
        if (name==='bs1') T(`sport0_isr: BS1 mask b#…10000000000000000000 → ${on?'jump bs1_is_off0: ppm_hold_left/right = 255':'call ppm_hold_l; call ppm_hold_r (200000-sample hold)'}`);
      }
    }); },
  plug(on){ D.plugged = on; D.plugT = SIM.t;
    act(on? 'Connect the AES input (BNC)' : 'Unplug the AES input', T=>{
      T(`At ${SIM.fmtT(SIM.t)} the AES3 signal ${on?'returns':'disappears'} at T1 (PE-65612) → CS8416 (U4) RXP0`);
      if (D.eng==='v102'){
        T(on? 'CS8416 re-locks; its SDOUT drives SPORT0 again (DAI_P10_SDATA1) and SampleIRQ resumes with audio' : 'CS8416 loses lock: SDOUT muted (zeros, inferred), Receiver Error register (0x0C) UNLOCK bit 0x10 = 1');
        T('SPORT2/3 DMA loop (tx2a_tcb1, 18 words, "100 Hz FS") re-reads registers 0x0B/0x0C into cs8416_ctl_data_in[17] once per cycle (≈90 ms, inferred)');
        T(`refresh(): if ((cs8416_ctl_data_in[17] & 0x10)!=0) → display_data_A/B blanked, lock_stat = lock2 (0x800 → U6 LOCK2 = NO LOCK LED)`);
        T(on? 'else lock_stat = lock1 (0x400 → U6 LOCK1 = LOCK LED); the bars come back on the next refresh' : 'The phase LEDs keep showing ph5 (half bar): PhaseMeterGet returns 128 with no signal');
      } else {
        T('CS8427 status word cs8427_in+5 bit 8192 → refresh_lock_status: lock_status = error (bit 9) — the 2003 ERROR LED');
        T('translate_meter_results: "AES mode force meter off if no lock" → vu/pk/phase results = 255, bit set ustat1 FLG10O "for PIC"');
      }
      T('Scrub the timeline to watch the moment the firmware notices it.');
    }); },
  power(){ D.power = !D.power;
    act(D.power? 'Power on (6 V adapter)' : 'Power off', T=>{
      if (!D.power){ T('All LEDs go dark.'); return; }
      if (D.eng==='v102'){
        T('ADSP-21262 boots from AT25F512A SPI flash (elfloader -bspiflash -HostWidth8, 26x_spi.dxe kernel)');
        T('main(): mode1 CBUFEN/NESTM cleared · PLL change commented out in v102 (v102A for SLM1-6 enables PLLM8)');
        T('InitDAI(): pull-ups, DIPs → FLAG10–13, CS8416 held in reset (DAI_PB14 LOW), SPORT4/5 → DAI_P16–20 display link');
        T('TimerInit(): interrupt(SIG_TMZ,TimerIRQ); timer_set(TIMER_RATE,TIMER_RATE) — TIMER_RATE = 100000/2');
        T('SampleInit(): VUMeterInit · SPCTL0 = 0x00cc89f1 (CS8416 audio in) · SPCTL4 = 0x03bc75f9, DIV4 = 183 · SPCTL5 = 0x038c31f9 · DMA chains · interrupts(SIG_SP0,SampleIRQ) · CS8416 out of reset');
        T('while(1): read DIPs (flag_reg), set PPM decay, VUMeterGet/PhaseMeterGet, peak hold, display mux');
      } else T('Init_dsp: flags, 100×75 clock flush of the shift registers, SPORT0/1 + CS8427 DMA → start: VUMeterInit, CS8427 out of reset (FLG11) → main');
    }); },
  setFs(fs){ D.fs = +fs; act(`AES sample rate → ${(fs/1000)} kHz`, T=>{
      T(`CS8416 recovers the new clock; SPORT0 (slave) now interrupts every ${SIM.fmtDur(1/fs)} → SampleIRQ ×${fs.toLocaleString()} per second`);
      if (D.eng==='v102'){ T('vumeter.asm time constants are per-sample and fixed for 48 kHz (TCONST_VU, TCONST_PPM_ATTACK, testppm = peak_decay_*_48)');
        if (fs!==48000) T(`→ every ballistic runs ${(fs/48000).toFixed(2)}× ${fs>48000?'faster':'slower'}: VU 24 dB fall in ${(0.36*48000/fs).toFixed(2)} s, PPM decay ${(D.dip.bs0?3:1.5)*48000/fs} s/24 dB (see Findings)`);
        T(`SSensor DET_TIME = SAMPLE_RATE·2 = 96000 samples = ${(96000/fs).toFixed(2)} s here (sysdef.h SAMPLE_RATE 48000)`); }
      else { const e = C.G1.EMU[fsClass(fs)]; T(`main: sample_rate_calc: |emuclk − emuclk_prev| ≈ ${e} → update_meter_parameters_${fsClass(fs)===44100?'441':fsClass(fs)/1000}`);
        T(`VU = ${C.G1.VU[fsClass(fs)]}, PPM attack = ${C.G1.ATT[fsClass(fs)]}: ballistics stay 300 ms / 5 ms / ${D.dip.bs0?3:1.5} s per 24 dB at any rate`);
        T(`pk_hold = 200000 samples is NOT scaled: peak LED hold = ${(200000/fs).toFixed(2)} s`); }
    }); },
  setSrc(k,v){ D[k] = (k==='level'||k==='freq')? +v : v; act(`Test source: ${k} → ${v}`, T=>{
      T('(This is the signal generator feeding the SLM — not part of the SLM.)');
      const r = readingAt(SIM.t);
      T(`SampleIRQ → VUMeterCalc / PhaseMeterCalc on every sample; background VUMeterGet → vu_results L = ${fmtL(r.vu[0])}, pk_results L = ${fmtL(r.pk[0])} (scale units)`);
      T(`PhaseMeterGet → phase LEDs = ${r.phaseN} of 9 from “+1”`);
    }); },
  setEng(e){ D.eng = e; act(e==='g1'? 'Engine → 2002 ADSP-21065L v1.02 (comparison)' : 'Engine → v102 ADSP-21262 (SLM1-5 board)', T=>{
      T(e==='g1'? 'The 2002|35 SLM-1 used 41-LED heads (+14 … −38). Its readings are drawn on this 57-LED panel by scale label — that pairing never shipped.' : 'Back to the firmware that matches this panel art (slm_4_* tables, 57 LEDs).');
    }); },
  setTick(m){ D.tick = m; act(`GP-timer tick → ${m==='xtal'?'50 000 cycles at 147.456 MHz':'1 ms (as commented)'}`, T=>{
      T(`timer.h: #define TIMER_RATE 100000/2 // 1 msec rate based on 100MHZ system freq`);
      T(m==='xtal'? `X1 = 24.576 MHz × 6 (default CLK_CFG, inferred) = 147.456 MHz → tick = ${SIM.fmtDur(tick())}: mux ${SIM.fmtDur(10*tick())}, hold ${SIM.fmtDur(3000*tick())}` : 'As the comment intends: mux 10 ms (50 Hz per bar — would flicker), hold 3 s');
    }); },
  setSS(on){ D.ss = on; act(`What-if: SSensorCalc ${on?'enabled':'disabled'}`, T=>{
      T(on? 'Shows what SSensor.asm would do if sample.c called SSensorInit/SSensorCalc (both are commented out in v102).' : 'As shipped: SSensorCalc is commented out, ss_results never filled.'); }); },
  reset(){ Object.assign(D, { power:true, plugged:true, plugT:null, fs:48000, src:'program', level:-20, freq:1000, phase:'in', eng:'v102', tick:'xtal', ss:false, view:'eye' });
    Object.assign(D.dip, { bs1:false, bs0:false, cal1:true, cal0:true }); D.log = []; SN_KEY=''; SIM.refresh(); },
};

/* ================================================================
   PANELS on the real silkscreen (SLM-1M7 lens, SLM-1M2 rear), 200 dpi px
   ================================================================ */
const BAR_X = [128, 189], LEDY = k => 178.5 + 15*k;
const ZONE = k => k<=11? 0 : k<=27? 1 : 2;                  // red 20…9, amber 8…−7, green −8…−52 (measured on PICS/SLM1 (SLM-1M7).jpg)
const ON_COL = ['#ff3b4f','#ffc23a','#b6ff3c'], OFF_COL = ['#3a1418','#3a2c10','#1d2c12'];
const PH_X = q => 97 + q*15.25, PH_Y = 1111;
function frontSVG(){
  let s = `<svg viewBox="0 0 318 1344" class="slmFront" role="img" aria-label="SLM-1D front lens (real SLM-1M7 silkscreen)" style="width:100%;max-width:230px;display:block;border-radius:6px">
    <defs><filter id="slmGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="318" height="1344" fill="#0c0d0e"/><g filter="url(#slmGlow)">`;
  for (let c=0;c<2;c++) for (let k=0;k<57;k++) s += `<rect id="slmB${c}_${k}" x="${BAR_X[c]-8}" y="${LEDY(k)-4.6}" width="16" height="9.2" rx="1.6" fill="${OFF_COL[ZONE(k)]}"/>`;
  s += `<rect id="slmS0" x="83" y="474" width="15" height="9.5" rx="2" fill="${OFF_COL[0]}"/><rect id="slmS1" x="219" y="474" width="15" height="9.5" rx="2" fill="${OFF_COL[0]}"/>`;
  s += `<rect id="slmP0" x="${BAR_X[0]-8}" y="1061" width="16" height="11" rx="2" fill="#3a2a10"/><rect id="slmP1" x="${BAR_X[1]-8}" y="1061" width="16" height="11" rx="2" fill="#3a2a10"/>`;
  for (let q=0;q<9;q++) s += `<rect id="slmF${q}" x="${PH_X(q)-5.5}" y="${PH_Y-5}" width="11" height="10" rx="1.6" fill="${OFF_COL[2]}"/>`;
  s += `<rect id="slmNL" x="262" y="678" width="12" height="10" rx="2" fill="${OFF_COL[0]}"/><rect id="slmLK" x="262" y="786" width="12" height="10" rx="2" fill="${OFF_COL[2]}"/></g>
    <image href="${ASSET}slm-front-green.png" width="318" height="1344"/><image href="${ASSET}slm-front-white.png" width="318" height="1344"/>
    <g class="slmHot"></g></svg>`;
  return s;
}
function paintFront(root, t){
  const svg = root.querySelector('.slmFront'); if (!svg) return;
  const P = panelAt(t);
  if (!svg._e){ svg._e = {}; svg.querySelectorAll('[id^=slm]').forEach(e=> svg._e[e.id]=e); }
  const E = svg._e, set = (id, on, col, off) => { const e=E[id]; if (!e) return; const f = on? col : off; if (e._f!==f){ e.setAttribute('fill', f); e._f=f; } };
  for (let c=0;c<2;c++) for (let k=0;k<57;k++) set(`slmB${c}_${k}`, P.bar[c][k], ON_COL[ZONE(k)], OFF_COL[ZONE(k)]);
  for (let c=0;c<2;c++){ set('slmS'+c, P.side[c], '#ff3040', OFF_COL[0]); set('slmP'+c, P.pr[c], '#ff9a2a', '#3a2a10'); }
  for (let q=0;q<9;q++) set('slmF'+q, P.phase[q], ON_COL[2], OFF_COL[2]);
  set('slmNL', P.nolock, '#ff3a30', OFF_COL[0]); set('slmLK', P.lock, '#a8ff3a', OFF_COL[2]);
  return P;
}
/* rear: SLM-1M2-SILK (75/110). BNC, power jack, 4-way DIP (ON = left, measured from PICS/SLM-1M2-75.jpg) */
function rearSVG(){
  const dipRow = (name, r) => { const y = 665 + 25*r; const on = D.dip[name];
    return `<g class="slmDip" data-d="${name}" style="cursor:pointer"><rect x="208" y="${y+2}" width="53" height="21" fill="#18191b"/><rect x="${on?211:236}" y="${y+5}" width="23" height="15" rx="2" fill="#e8e4d6"/><rect x="190" y="${y}" width="80" height="25" fill="transparent"><title>SW${4-r} ${name.toUpperCase()}: ${on?'ON':'OFF'} — click to toggle</title></rect></g>`; };
  const con = D.plugT===null? D.plugged : D.plugged;
  return `<svg viewBox="0 0 339 1367" class="slmRear" role="img" aria-label="SLM-1D rear panel (real SLM-1M2 silkscreen)" style="width:100%;max-width:240px;display:block;border-radius:6px">
    <rect width="339" height="1367" fill="#141516"/>
    <rect x="203" y="660" width="64" height="110" fill="#0d0e0f" stroke="#33363a"/>
    ${['bs1','bs0','cal1','cal0'].map(dipRow).join('')}
    <text x="221" y="785" font-size="11" fill="#bbb" font-family="sans-serif">ON</text><text x="240" y="785" font-size="9" fill="#888">←</text>
    <g class="slmBnc" style="cursor:pointer"><circle cx="94.5" cy="1080" r="47" fill="#b8b9bb" stroke="#6d6f72" stroke-width="3"/><circle cx="94.5" cy="1080" r="30" fill="#d9dadc"/><circle cx="94.5" cy="1080" r="13" fill="#e9d48a" stroke="#7a6a2a" stroke-width="2"/>
      ${con? `<rect x="80" y="1080" width="29" height="287" fill="#1b4f8f"/><circle cx="94.5" cy="1080" r="36" fill="#2a64a8" stroke="#163f70" stroke-width="3"/><circle cx="94.5" cy="1080" r="14" fill="#1b4f8f"/>` : ''}
      <rect x="40" y="1025" width="110" height="110" fill="transparent"><title>${con?'Click to unplug':'Click to plug in'} the AES input</title></rect></g>
    <g class="slmPwr" style="cursor:pointer"><rect x="194" y="1045" width="71" height="71" fill="#121314" stroke="#3b3e42" stroke-width="2"/><circle cx="229.5" cy="1080" r="17" fill="#050505" stroke="#555"/><circle cx="229.5" cy="1080" r="4" fill="#c9c9c9"/>
      ${D.power? `<rect x="219" y="1080" width="21" height="287" fill="#222"/><circle cx="229.5" cy="1080" r="22" fill="#2b2b2b" stroke="#111" stroke-width="3"/>` : ''}
      <rect x="190" y="1040" width="80" height="80" fill="transparent"><title>6 V adapter — click to ${D.power?'unplug (power off)':'plug in (power on)'}</title></rect></g>
    <circle cx="169.5" cy="1200" r="18" fill="#2a2b2d" stroke="#555"/><circle cx="169.5" cy="60" r="18" fill="#2a2b2d" stroke="#555"/><circle cx="169.5" cy="1308" r="18" fill="#2a2b2d" stroke="#555"/>
    <image href="${ASSET}slm-rear-white.png" width="339" height="1367"/>
  </svg>`;
}
function bindRear(root){
  root.querySelectorAll('.slmDip').forEach(g=> g.addEventListener('click', ()=>A.dip(g.dataset.d)));
  const b = root.querySelector('.slmBnc'); if (b) b.addEventListener('click', ()=>A.plug(!D.plugged));
  const p = root.querySelector('.slmPwr'); if (p) p.addEventListener('click', ()=>A.power());
}
function sourceHTML(){
  const opt = (arr, cur) => arr.map(([v,l])=>`<option value="${v}" ${String(v)===String(cur)?'selected':''}>${l}</option>`).join('');
  return `<div class="slmSrc"><div style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center">
    <label class="small">Source <select data-s="src">${opt([['program','Programme (music-like)'],['tone','Steady tone'],['burst','Tone burst 0.1–0.4 s'],['silence','Silence']],D.src)}</select></label>
    <label class="small">Level <input data-s="level" type="number" min="-70" max="0" step="1" value="${D.level}" style="width:64px"> dBFS</label>
    <label class="small">Freq <select data-s="freq">${opt([[100,'100 Hz'],[400,'400 Hz'],[1000,'1 kHz'],[10000,'10 kHz']],D.freq)}</select></label>
    <label class="small">R vs L <select data-s="phase">${opt([['in','in phase'],['90','90°'],['180','180° (polarity flip)'],['L','left only'],['unc','uncorrelated']],D.phase)}</select></label>
    <label class="small">AES rate <select data-s="fs">${opt(FSS.map(f=>[f,(f/1000)+' kHz']),D.fs)}</select></label>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin-top:6px">
    <label class="small">Engine <select data-s="eng">${opt([['v102','v102 · ADSP-21262 (this panel)'],['g1','2002 ADSP-21065L v1.02 (comparison)']],D.eng)}</select></label>
    <label class="small">GP tick <select data-s="tick">${opt([['xtal','0.339 ms (crystal, inferred)'],['comment','1 ms (timer.h comment)']],D.tick)}</select></label>
    <label class="small">LED view <select data-s="view">${opt([['eye','as the eye sees it'],['mux','true multiplex (camera)']],D.view)}</select></label>
    <label class="small"><input type="checkbox" data-s="ss" ${D.ss?'checked':''}> what-if: silence sensor on</label>
    <button data-s="reset">Defaults</button>
  </div>
  <div class="small muted" style="margin-top:4px">Rear panel: click a DIP rocker, the INPUT BNC (unplug / plug) or the PWR jack. Keys: <span class="mono">1–4</span> DIP SW1–SW4 · <span class="mono">U</span> unplug · <span class="mono">[ ]</span> level ∓1 dB · <span class="mono">V</span> LED view.</div></div>`;
}
function bindSource(root){
  root.querySelectorAll('[data-s]').forEach(e=>{
    const k = e.dataset.s;
    if (k==='reset'){ e.onclick = ()=>A.reset(); return; }
    e.onchange = ()=>{
      if (k==='fs') A.setFs(e.value); else if (k==='eng') A.setEng(e.value); else if (k==='tick') A.setTick(e.value);
      else if (k==='ss') A.setSS(e.checked); else if (k==='view'){ D.view = e.value; SIM.refresh(); }
      else A.setSrc(k, e.value);
    };
  });
}
document.addEventListener('keydown', e=>{
  if (!window.__slmKeys || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k = e.key.toLowerCase();
  const m = { '1':()=>A.dip('cal0'), '2':()=>A.dip('cal1'), '3':()=>A.dip('bs0'), '4':()=>A.dip('bs1'), 'u':()=>A.plug(!D.plugged),
    '[':()=>A.setSrc('level', Math.max(-70, D.level-1)), ']':()=>A.setSrc('level', Math.min(0, D.level+1)), 'v':()=>{ D.view = D.view==='eye'?'mux':'eye'; SIM.refresh(); } };
  if (m[k]){ m[k](); e.preventDefault(); }
});

/* ================================================================
   TIMELINE LANES
   ================================================================ */
function curveLane(label, h, getter, cols, range){
  return { label, h, draw(c,X,t0,t1,y,hh){
    const S = simulate(), [lo,hi] = range, Yv = v => y+hh-3 - (Math.max(lo,Math.min(hi,v))-lo)/(hi-lo)*(hh-6);
    c.strokeStyle = SIM.css('--grid'); c.lineWidth=1; c.setLineDash([3,3]);
    const z = Yv(0); c.beginPath(); c.moveTo(X(t0),z); c.lineTo(X(t1),z); c.stroke(); c.setLineDash([]);
    const i0 = Math.max(0, Math.floor((t0-S.t0)/S.dt)-1), i1 = Math.min(S.M-1, Math.ceil((t1-S.t0)/S.dt)+1);
    const step = Math.max(1, Math.floor((i1-i0)/1500));
    getter.forEach((g,gi)=>{ c.strokeStyle = cols[gi]; c.lineWidth = 1.4; c.beginPath(); let first=true;
      for (let i=i0;i<=i1;i+=step){ const tt=S.t0+i*S.dt, v=g(S,i,tt); if (v==null){ first=true; continue; } const xx=X(tt), yy=Yv(v); if(first){c.moveTo(xx,yy);first=false;} else c.lineTo(xx,yy); } c.stroke(); });
    c.fillStyle = SIM.css('--ink2'); c.font = '10px '+SIM.css('--mono'); c.fillText(`${hi>0?'+':''}${hi}`, X(t0)+3, y+10); c.fillText(String(lo), X(t0)+3, y+hh-3);
  }};
}
function lanes(){
  const css = SIM.css, S = simulate(), fs = D.fs, g1 = D.eng==='g1', T = tick();
  const acc=css('--accent'), a2=css('--accent2'), warn=css('--warn'), bad=css('--bad'), ink=css('--ink'), ink2=css('--ink2');
  const text = (c,s,x,y)=>{ c.fillStyle=ink; c.font='11px '+css('--mono'); c.fillText(s,x,y); };
  const L = [];
  L.push({ label:'AES input L / R (and cable)', h:40, draw(c,X,t0,t1,y,h){
    const span=t1-t0, pw=X(t1)-X(t0);
    // cable state
    c.fillStyle=bad; c.globalAlpha=.15; const N=200; for(let i=0;i<N;i++){ const tt=t0+span*i/N; if(!conn(tt)) c.fillRect(X(tt),y,pw/N+1,h); } c.globalAlpha=1;
    if (span*D.freq > pw/3 && D.src!=='program'){ // envelope
      [0,1].forEach(ch=>{ c.fillStyle= ch?bad:acc; c.globalAlpha=.3; for(let px=0;px<pw;px+=2){ const ta=t0+span*px/pw, i=snapI(ta); const a=S.pkAbs[ch][Math.min(S.M-1,i+1)]; c.fillRect(X(t0)+px, y+h/2-a*(h/2-2), 2, 2*a*(h/2-2)); } c.globalAlpha=1; }); return; }
    if (span*fs > 4*pw){ [0,1].forEach(ch=>{ c.fillStyle= ch?bad:acc; c.globalAlpha=.35; for(let px=0;px<pw;px+=2){ const ta=t0+span*px/pw; let a=0; const i0=snapI(ta), i1=snapI(ta+span*2/pw); for(let i=i0;i<=i1;i++) a=Math.max(a,S.pkAbs[ch][i]); c.fillRect(X(t0)+px, y+h/2-a*(h/2-2), 2, 2*a*(h/2-2)); } c.globalAlpha=1; }); return; }
    [0,1].forEach(ch=>{ c.strokeStyle= ch?bad:acc; c.lineWidth=1.2; c.beginPath(); const n0=Math.floor(t0*fs), n1=Math.ceil(t1*fs);
      for(let n=n0;n<=n1;n++){ const tt=n/fs, v=(D.power&&conn(tt))? sig(n,fs)[ch]:0, yy=y+h/2-v*(h/2-2); if(n===n0) c.moveTo(X(tt),yy); else c.lineTo(X(tt),yy); c.lineTo(X((n+1)/fs),yy); } c.stroke(); });
  }});
  L.push({ label:`AES3 frames (${fs/1000} kHz) · blocks of 192`, h:22, draw(c,X,t0,t1,y,h){ const pxB = X(t0+192/fs)-X(t0);
    if (pxB>6) SIM.pulses(c,X,t0,t1,y,h,1/fs,0,0.5/fs,ink2,'frames');
    SIM.pulses(c,X,t0,t1,y,h,192/fs,0,1/fs,warn,'blocks (Z preamble)'); }});
  if (!g1){
    L.push({ label:'SampleIRQ (SIG_SP0) inside', h:30, draw(c,X,t0,t1,y,h){
      const per=1/fs, pxS=X(t0+per)-X(t0), cols=[ink2,a2,acc,warn,ink2];
      if (pxS < 30){ SIM.pulses(c,X,t0,t1,y,h,per,0,C.ISR_CYC.reduce((a,b)=>a+b[1],0)/C.CCLK,acc,'SampleIRQ: Phase/VUMeterCalc'); return; }
      const n0=Math.floor(t0*fs), n1=Math.ceil(t1*fs);
      for (let n=n0;n<=n1;n++){ let tt=n/fs; C.ISR_CYC.forEach(([nm,cy],j)=>{ const d=cy/C.CCLK; c.fillStyle=cols[j]; c.fillRect(X(tt),y+4,Math.max(1,X(tt+d)-X(tt)),h-8); if (X(tt+d)-X(tt)>70){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(nm,X(tt)+2,y+h/2+3);} tt+=d; }); }
      if (pxS>200) { c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText(`cycle counts ${'inferred'}: ≈${C.ISR_CYC.reduce((a,b)=>a+b[1],0)} cycles at 147.456 MHz`, X(n0/fs)+6+ (X(t0+per)-X(t0))*0.3, y+h-2); }
    }});
    L.push({ label:'Background while(1) passes', h:20, draw(c,X,t0,t1,y,h){ const per=C.BG_CYC/C.CCLK; if (X(t0+per)-X(t0) < 3){ c.fillStyle=a2; c.globalAlpha=.25; c.fillRect(X(t0),y+5,X(t1)-X(t0),h-10); c.globalAlpha=1; text(c,`≈${Math.round(1/per).toLocaleString()} passes/s (${SIM.fmtDur(per)} each, inferred): VUMeterGet ×4, PhaseMeterGet ×2, hold, timers`, X(t0)+6, y+h/2+4); return; }
      SIM.pulses(c,X,t0,t1,y,h,per,0,per*0.92,a2,'passes'); }});
    L.push({ label:`Core timer TMZ (tick ${SIM.fmtDur(T)})`, h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,T,0,Math.min(T*0.05,2e-6),ink2,'TimerIRQ ticks'); }});
    L.push({ label:'Display mux: blank / L / R', h:26, draw(c,X,t0,t1,y,h){
      const P=10*T, k0=Math.floor(t0/P)-1, k1=Math.ceil(t1/P);
      if (X(t0+P)-X(t0) < 2){ c.fillStyle=acc; c.globalAlpha=.3; c.fillRect(X(t0),y+4,X(t1)-X(t0),h-8); c.globalAlpha=1; text(c,`${Math.round((t1-t0)/P)} mux cycles (10 ticks each: 2 blank + 8 lit, L and R alternate)`, X(t0)+6,y+h/2+4); return; }
      for (let k=k0;k<=k1;k++){ const tb=k*P, tr=tb+2*T, m=((k+1)%2+2)%2;
        c.fillStyle=ink2; c.globalAlpha=.35; c.fillRect(X(tb),y+4,X(tr)-X(tb),h-8); c.globalAlpha=.8;
        c.fillStyle= m? bad : acc; c.fillRect(X(tr),y+4,X(tb+P)-X(tr)-1,h-8); c.globalAlpha=1;
        if (X(tb+P)-X(tr) > 26){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(m?'R':'L', X(tr)+4, y+h/2+4); if (X(tb+P)-X(tr)>140) c.fillText(m?'refresh(): mux_count=1 · C=0x10001|lock':'refresh(): mux_count=0 · C=0x20001|phase', X(tr)+16, y+h/2+4); }
      } }});
    L.push({ label:`SPORT4/5 → 3× MM5450 (${(SCLK4()/1000).toFixed(1)} kHz)`, h:22, draw(c,X,t0,t1,y,h){ const F=FRAME(); const pxF=X(t0+F)-X(t0);
      if (pxF > 128*3){ const b=1/SCLK4(); const n0=Math.floor(t0/b), n1=Math.ceil(t1/b); for(let n=n0;n<=n1;n++){ const pos=((n%128)+128)%128; c.fillStyle= pos<32? warn : ink2; c.fillRect(X(n*b),y+5,Math.max(1,X(n*b+b*0.5)-X(n*b)),h-10); if (pos%32===0){ c.fillStyle=ink; c.font='10px sans-serif'; c.fillText(`word ${pos>>5}`, X(n*b)+2, y+9); } } return; }
      SIM.pulses(c,X,t0,t1,y,h,F,0,32/SCLK4(),warn,'128-bit DMA frames (word 0 orange)'); }});
  } else {
    L.push({ label:'sport0_isr (21065L)', h:24, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/fs,0,C.G1.ISR_CYC/C.G1.CORE,acc,'sport0_isr'); }});
    L.push({ label:'mux_ctl → translate_meter_results (every 300)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,300/fs,0,C.G1.TRANSLATE_CYC/C.G1.CORE,warn,'translate (incl. 107-toggle flush)'); }});
    L.push({ label:'shift_led_data: FLG7 clock, 1 edge per ISR', h:24, draw(c,X,t0,t1,y,h){ const per=1/fs, n0=Math.floor(t0*fs), n1=Math.ceil(t1*fs);
      if (X(t0+per)-X(t0) < 2.5){ SIM.pulses(c,X,t0,t1,y,h,300/fs,0,72/fs,a2,'72-ISR shift bursts'); return; }
      c.strokeStyle=a2; c.lineWidth=1.3; c.beginPath(); for(let n=n0;n<=n1;n++){ const ph=((n%300)+300)%300; const lv = ph<72? (ph%2) : 0; const yy = y+(lv? 5 : h-5); if(n===n0) c.moveTo(X(n/fs),yy); else c.lineTo(X(n/fs),yy); c.lineTo(X((n+1)/fs),yy); } c.stroke(); }});
  }
  L.push(curveLane('VU L / R (scale units)', 58, [(S,i)=>readVU(S.vu[0][i]), (S,i)=>readVU(S.vu[1][i])], [acc,bad], [-52,20]));
  L.push(curveLane('PPM L / R + hold (dots)', 58, [(S,i)=>readPK(S.ppm[0][i]), (S,i)=>readPK(S.ppm[1][i]), (S,i)=>{ const h=S.hold[0][i]; const l = g1? at(G1PK,h+6) : at(PK1,h); return l==null? null : l; }], [acc,bad,warn], [-52,20]));
  L.push({ label:g1? 'ppm_counter (200 000 samples)' : 'GP_TIMER2 / 3 peak hold', h:22, draw(c,X,t0,t1,y,h){
    const S=simulate(), full = g1? 200000/fs : C.HOLD_TICKS*T; [0,1].forEach(ch=>{ c.fillStyle= ch?bad:acc; c.globalAlpha=.55; const N=Math.min(800,X(t1)-X(t0)); for(let i=0;i<N;i++){ const tt=t0+(t1-t0)*i/N, v=S.holdLeft[ch][snapI(tt)]/full; if(v>0) c.fillRect(X(tt), y+(ch?h/2:2)+ (1-v)*(h/2-3), (X(t1)-X(t0))/N+.5, v*(h/2-3)); } c.globalAlpha=1; });
    if (D.dip.bs1) text(c,'BS1 ON → Peak Hold Off', X(t0)+6, y+h/2+4); }});
  L.push({ label:`Phase (PhaseMeterGet 0–256)`, h:30, draw(c,X,t0,t1,y,h){ const S=simulate(); c.strokeStyle=a2; c.lineWidth=1.4; c.beginPath(); const N=Math.min(1200,X(t1)-X(t0));
    for(let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N, r=phaseR(S,snapI(tt)), yy=y+h-3-r/256*(h-6); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy);} c.stroke(); c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText('+1',X(t0)+3,y+10); c.fillText('−1',X(t0)+3,y+h-3); }});
  L.push({ label:'CS8416 control port (SPORT2/3)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,0.01,0,0.0005,ink2,'I²S frames at 100 Hz');
    const p0=Math.floor((t0-0.08)/C.CS_POLL), p1=Math.ceil((t1-0.08)/C.CS_POLL); for(let p=p0;p<=p1;p++){ const tt=p*C.CS_POLL+0.08; c.fillStyle= conn(tt)? acc : bad; c.fillRect(X(tt)-1,y+2,3,h-4); }
    if (D.plugT!==null && D.plugT>=t0 && D.plugT<=t1){ c.fillStyle=bad; c.fillRect(X(D.plugT),y,2,h); text(c, D.plugged?'plugged':'unplugged', X(D.plugT)+4, y+h/2+4); } }});
  L.push({ label:'LEDs: bar top L (as displayed)', h:44, draw(c,X,t0,t1,y,h){ ledStrip(c,X,t0,t1,y,h,0); }});
  L.push({ label:'LEDs: bar top R', h:44, draw(c,X,t0,t1,y,h){ ledStrip(c,X,t0,t1,y,h,1); }});
  L.push({ label: D.ss? 'Silence sensor (what-if)' : 'Silence sensor (not called)', h:24, draw(c,X,t0,t1,y,h){
    if (!D.ss){ c.fillStyle=ink2; c.font='11px sans-serif'; c.fillText('sample.c: //SSensorCalc(&ssensor_info);  — dormant in v102. Tick “what-if” to run it.', X(t0)+6, y+h/2+4); return; }
    const S=simulate(); const N=Math.min(800,X(t1)-X(t0)); for(let i=0;i<N;i++){ const tt=t0+(t1-t0)*i/N, j=snapI(tt); [0,1].forEach(ch=>{ const cnt=S.ssCnt[ch][j]; c.fillStyle = cnt===0? bad : cnt<C.SS_DET? warn : acc; c.fillRect(X(tt), y+2+ch*(h/2-1), (X(t1)-X(t0))/N+.5, h/2-3); }); } }});
  return L;
}
function ledStrip(c,X,t0,t1,y,h,ch){
  const N = Math.min(500, Math.floor(X(t1)-X(t0))); const w=(X(t1)-X(t0))/N;
  for (let i=0;i<N;i++){ const tt=t0+(t1-t0)*(i+0.5)/N; const P=panelAt(tt); const bar=P.bar[ch];
    for (let k=0;k<57;k++) if (bar[k]){ c.fillStyle = ON_COL[ZONE(k)]; c.fillRect(X(t0)+i*w, y+2+k*(h-4)/57, w+0.4, (h-4)/57+0.3); } }
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click a DIP switch, the BNC or the power jack, or change the test source. Each step the DSP firmware takes is listed here.</div>'; }
function inspectorHTML(t){
  const S = simulate(), i = snapI(t), r = readingAt(t), fs=D.fs;
  const n = Math.floor(t*fs), wsp = [S.Tvu, S.TA, S.TD, 'junk1', 'junk2', S.ppm[0][i], S.vu[0][i], S.ppm[1][i], S.vu[1][i]];
  const P = panelAt(t);
  const muxTxt = !D.power? 'off' : D.eng==='g1'? `translate #${P.info.m} (every 300 ISRs, +72 to shift)` : (P.info.inBlank? 'BLANK (GP_TIMER0 = 2)' : `showing ${P.info.cur.m? 'R':'L'} · refresh #${P.info.k}`);
  return `<table class="kv">
    <tr><th>AES sample</th><td class="mono">#${n.toLocaleString()} · frame ${((n%192)+192)%192}/191 · ${conn(t)?'cable in':'<b style="color:var(--bad)">cable out</b>'} · firmware sees ${r.locked?'LOCK':'<b style="color:var(--bad)">UNLOCK</b>'}</td></tr>
    <tr><th>VU / PPM / hold (L · R)</th><td class="mono">${fmtL(r.vu[0])} / ${fmtL(r.pk[0])} / ${fmtL(r.hold[0])} · ${fmtL(r.vu[1])} / ${fmtL(r.pk[1])} / ${fmtL(r.hold[1])}</td></tr>
    <tr><th>vu_results / pk_results</th><td class="mono">${D.eng==='g1'? `${g1Vu(S,0,i)}, ${g1Vu(S,1,i)} / ${g1Pk(S,0,i)}, ${g1Pk(S,1,i)} (meter_cal ${g1cal()})` : `${vuIdx(S,0,i)}, ${vuIdx(S,1,i)} / ${pkIdx(S,0,i)}, ${pkIdx(S,1,i)} (calx ${calx()})`} · 0.5 dB per step</td></tr>
    <tr><th>phase_results</th><td class="mono">${phaseR(S,i)} → ${r.phaseN} LED${r.phaseN>1?'s':''} from “+1”</td></tr>
    <tr><th>wspace (vumeter.asm)</th><td class="mono small">${wsp.map(v=>typeof v==='number'? v.toExponential(3) : v).join(' · ')}</td></tr>
    <tr><th>Display</th><td class="mono">${muxTxt}</td></tr>
    <tr><th>Settings</th><td class="mono">0 VU = ${nominal()} dBFS · PPM ${D.dip.bs0?'Type 2 (3 s)':'Type 1 (1.5 s)'} /24 dB at 48 kHz · hold ${D.dip.bs1?'off':'on'} · ${fs/1000} kHz</td></tr>
  </table>`;
}
function bitmapHTML(t){
  if (D.eng==='g1') return `<p class="small">The 21065L builds <span class="mono">shift1…shift3</span> (left) and <span class="mono">shift5…shift7</span> (right) in <span class="mono">translate_meter_results</span>, then <span class="mono">shift_led_data</span> clocks bits 0–17 of each, one FLG7 edge per sample interrupt, out on FLG4/5/6. Bit-level copies of the 41-LED <span class="mono">sdm_*</span> tables are summarised by label here.</p>`;
  const P = panelAt(t); if (!P.info || !P.info.cur) return '<p class="muted">Unit off.</p>';
  const w = P.info.inBlank && D.view==='mux'? BLANK : P.info.cur.w;
  const row = (name, val, lab) => `<tr><th class="mono">${name}</th><td class="mono small" style="white-space:nowrap">${[...Array(32)].map((_,b)=>{ const bb=31-b, on=(val>>>bb)&1; return `<span title="bit ${bb}: ${lab(bb)}" style="display:inline-block;width:11px;text-align:center;border-radius:2px;${on?'background:var(--accent);color:#fff':''}">${on}</span>`; }).join('')}</td><td class="mono small">0x${(val>>>0).toString(16).padStart(8,'0')}</td></tr>`;
  const labA = b => b===0? 'start bit' : b<=26? `U3 out ${b} → D${33+b} → LED ${fmtL(b-6)}` : `U3 out ${b} (unused)`;
  const labB0 = b => b<28? 'ignored (before start bit)' : b===28? 'start bit (0x10000000)' : `U5 out ${b-28} → D${b-29} (${b===29?'PR LED':b===30?'red marker':'spare'}, inferred)`;
  const labB1 = b => { if (b>30) return 'U5 out 35 (unused)'; const n = b>=16? 6+(30-b) : 22+2*(15-b); return `U5 out ${b+4} → D${b+3} → LED −${n}`; };
  const labC = b => b===0? 'start bit' : b<=9? `U6 out ${b} → PHASE${b}` : b<=15? `U6 out ${b} → LOCK${b-9}${b===10?' (LOCK LED)':b===11?' (NO LOCK LED)':''}` : b===16? 'right select (0x10000)' : b===17? 'left select (0x20000)' : 'unused';
  return `<table class="kv">${row('A[0]',w.A[0],labA)}${row('B[0]',w.B[0],labB0)}${row('B[1]',w.B[1],labB1)}${row('C[0]',w.C[0],labC)}</table>
    <p class="small muted">SPORT4 sends display_data_A on DA (DAI_P17 → DATA_IN1 → U3) and display_data_B on DB (DAI_P20 → DATA_IN2 → U5); SPORT5 sends display_data_C (DAI_P16 → DATA_IN3 → U6). LSB first (SPCTL4 bit 3 LSBF), 32-bit words, 4 words per line, DMA chained to itself so the frame repeats forever. Hover a bit for its LED.
    ${P.info.cur.w.A[0] & 1 ? '' : '<br><b style="color:var(--warn)">A[0] has no start bit now:</b> U3 keeps the blank it latched 2 ticks ago — this is why the peak-hold dot disappears below −5 (see Findings).'}</p>`;
}

/* ---------------- Simulator tab ---------------- */
function viewSim(m){
  window.__slmKeys = true;
  m.innerHTML = `
  <div class="grid2">
    <div>${card('SLM-1D at the playhead — front lens and rear panel (real 2016|49 silkscreens)', `
        <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start"><div id="fp" style="flex:1;min-width:150px;max-width:230px"></div><div id="rp" style="flex:1;min-width:150px;max-width:240px"></div>
        <div style="flex:1.4;min-width:220px"><div id="legend" class="small"></div></div></div>
        <div style="margin-top:10px">${sourceHTML()}</div>`)}</div>
    <div>${card('What the DSP firmware did (last action)', `<div id="trace" class="log"></div>`)}${card('State at the playhead', `<div id="insp"></div>`)}</div>
  </div>
  ${card('One second in slow motion — zoom with the transport (1 s → 10 µs). Click to seek.', `<canvas id="tl"></canvas>
    <p class="small muted">Times inside one interrupt, the background pass length, the 147.456 MHz core clock (24.576 MHz crystal × 6) and the CS8416 polling period are ${inf}; the sample rate, the 10-tick mux, 2-tick blank, 3000-tick hold, 128-bit display frames and DIV4 = 183 are from the source. LED strips show what the panel shows in the selected LED view.</p>`)}
  <div class="grid2">${card('Display shift registers at the playhead (live bit map)', `<div id="bits" class="scroll"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  m.querySelector('#fp').innerHTML = frontSVG();
  bindSource(m);
  let lastRear = '';
  const draw = ()=>{
    const t = SIM.t;
    const P = paintFront(m.querySelector('#fp'), t);
    const rk = JSON.stringify([D.dip, D.plugged, D.power]); if (rk!==lastRear){ m.querySelector('#rp').innerHTML = rearSVG(); bindRear(m.querySelector('#rp')); lastRear = rk; }
    const r = readingAt(t);
    m.querySelector('#legend').innerHTML = `<table class="kv">
      <tr><th>Model</th><td>SLM-1D (AES, 75 Ω BNC) · ${D.eng==='v102'?'SLM1-5 DSP board, v102 ('+Y(2007)+')':'2002|35 ADSP-21065L engine (comparison)'}</td></tr>
      <tr><th>L bar</th><td class="mono">VU ${fmtL(r.vu[0])} · peak ${fmtL(r.pk[0])}${r.hold[0]!=null?' · hold '+fmtL(r.hold[0]):''}</td></tr>
      <tr><th>R bar</th><td class="mono">VU ${fmtL(r.vu[1])} · peak ${fmtL(r.pk[1])}${r.hold[1]!=null?' · hold '+fmtL(r.hold[1]):''}</td></tr>
      <tr><th>Phase</th><td class="mono">${r.phaseN} of 9 LEDs from +1</td></tr>
      <tr><th>Status</th><td>${!D.power?'off':P.lock?'<b style="color:var(--accent)">LOCK</b>':P.nolock?'<b style="color:var(--bad)">NO LOCK</b>':'—'}</td></tr>
      <tr><th>Scale</th><td class="small">0 = ${nominal()} dBFS sine (DIP CAL1/CAL0). Bar = VU (RMS, 300 ms class); single dot = PPM; second dot = peak hold (above 0 only).</td></tr></table>`;
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#insp').innerHTML = inspectorHTML(t);
    m.querySelector('#bits').innerHTML = bitmapHTML(t);
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
    // keep source controls in sync (keys / tutorial)
    m.querySelectorAll('.slmSrc [data-s]').forEach(e=>{ const k=e.dataset.s; if (e.type!=='checkbox' && document.activeElement!==e && D[k]!==undefined && String(e.value)!==String(D[k])) e.value = D[k]; });
  };
  SIM.on('time', draw);
}

/* ---------------- Tutorial ---------------- */
const LESSONS = [
  { title:'Meet the SLM-1D', body:`<p>The SLM series are desktop loudness meters. The <b>SLM-1D</b> watches one AES/EBU digital pair (75 Ω BNC on this unit). The SLM1 manual: <i>“display the average (VU) and peak content of an audio signal simultaneously … ‘sticky’ peak LEDs … a phase correlation meter and status LEDs to display lock to signal or error.”</i></p>
     <p>Front: two 57-LED bars, <b>L</b> and <b>R</b>, scale +20 … 0 … −52. The solid bar is <b>VU</b> (average); the single dot above it is <b>PPM</b> (peak); a second dot can stay up as <b>peak hold</b>. Under the bars: <b>PR</b> LEDs and the 9-LED <b>PHASE</b> meter. On the right: <b>NO LOCK</b> / <b>LOCK</b>.</p>
     <p>Rear: a 4-way DIP switch (BS1, BS0, CAL1, CAL0), the INPUT and the 6 V power jack. There are no front-panel controls: everything is set on the DIP switch.</p>`, check:()=>true, auto:true },
  { title:'1 · Power and signal', body:`<p>The unit runs from the 6 V, 2 A adapter. Click the <b>PWR</b> jack if it is off, and make sure the <b>INPUT</b> BNC has its cable.</p><p>With a valid AES signal the <b>LOCK</b> LED lights (manual: <i>“If a viable AES signal is connected … the LOCK status LED will illuminate”</i>).</p><p><b>Goal:</b> power on, LOCK lit.</p>`, check:()=>D.power && readingAt(SIM.t).locked, hint:'Click the PWR jack and the INPUT BNC on the rear panel.' },
  { title:'2 · Line-up tone: read 0 VU', body:`<p>Send a <b>steady 1 kHz tone at −20 dBFS</b>. With <b>CAL1 ON</b> and <b>CAL0 ON</b> the manual's Table 2 says 0 VU = −20 dBFS, so both bars stop at <b>0</b>.</p><p>Notice the PPM dot sits <b>3 dB higher (+3)</b>: the DSP measures power (RMS), and a sine's peak is 3 dB above its RMS. The v102 tables shift the PPM scale by 6 half-dB steps to show that.</p><p><b>Goal:</b> tone, −20 dBFS, CAL ON/ON, VU = 0.</p>`, check:()=>{ const r=readingAt(SIM.t); return D.src==='tone' && D.level===-20 && D.dip.cal0 && D.dip.cal1 && r.vu[0]===0; }, hint:'Source → Steady tone, Level → −20. Rear DIP CAL1 and CAL0 to the left (ON).' },
  { title:'3 · Calibrate to EBU −18 dBFS', body:`<p>Many plants line up at −18 dBFS. Set <b>CAL1 OFF</b>, keep <b>CAL0 ON</b> (Table 2 row 1). In code: <span class="mono">cal = flag_reg & 0x00500000 → calx = 4</span>, which moves every reading 2 dB down.</p><p>Now raise the tone to <b>−18 dBFS</b>: the bars come back to 0.</p><p><b>Goal:</b> CAL1 OFF, CAL0 ON, tone −18 dBFS, VU = 0.</p>`, check:()=>{ const r=readingAt(SIM.t); return !D.dip.cal1 && D.dip.cal0 && D.level===-18 && r.vu[0]===0; }, hint:'Click the CAL1 rocker (key 2), then press ] twice or type −18.' },
  { title:'4 · Ballistics: watch a burst', body:`<p>Switch the source to <b>Tone burst</b> (on 0.1–0.4 s every second) and press <b>▶ Play</b>, or drag the time slider.</p><p>The <b>PPM dot</b> jumps up within a few milliseconds (attack constant 0.0228 per sample ≈ 5 ms for 24 dB). The <b>VU bar</b> climbs slowly (about 0.3 s) and falls slowly. After the burst the PPM dot falls at a fixed rate: <b>24 dB in 1.5 s</b> (PPM Type 1, BS0 OFF).</p><p>The <b>One second</b> tab plots both curves.</p><p><b>Goal:</b> source = burst.</p>`, check:()=>D.src==='burst', hint:'Source → Tone burst 0.1–0.4 s.' },
  { title:'5 · Slower peak decay (PPM Type 2)', body:`<p>Set <b>BS0 ON</b>. The background loop reads <span class="mono">flag_reg & 0x01000000</span> and writes <span class="mono">peak_decay_2_48</span> (24 dB in <b>3.0 s</b>) into the meter's work space.</p><p>Scrub the timeline after the burst: the PPM line now falls half as fast.</p><p><b>Goal:</b> BS0 ON.</p>`, check:()=>D.dip.bs0, hint:'Click the BS0 rocker (key 3).' },
  { title:'6 · Sticky peaks (peak hold)', body:`<p><b>BS1 OFF</b> = Peak Hold ON (manual: <i>“holds ‘PPM’ peaks above ‘nominal’ for 3 seconds”</i>). Set the burst level to <b>−10 dBFS</b>. A red/amber dot stays at the highest peak after the burst has gone, then drops.</p><p>In the code the hold is <span class="mono">SetTimer(GP_TIMER2,3000)</span> — 3000 ticks. With the tick the crystal implies, that is about <b>1.0 s</b>, not 3 s (${inf}; switch “GP tick” to compare).</p><p><b>Goal:</b> hold on, a hold dot visible at the playhead.</p>`, check:()=>{ const r=readingAt(SIM.t); return !D.dip.bs1 && r.hold[0]!=null && r.hold[0]>=0; }, hint:'Level −10, Source burst, scrub to ~0.45 s (just after the burst).' },
  { title:'7 · Phase meter', body:`<p>Back to a steady <b>tone</b>. The PHASE row lights from <b>+1</b> (in phase, mono-compatible) toward <b>−1</b> (out of phase). It compares the average of |L+R| with |L−R| (<span class="mono">PhaseMeterCalc</span>).</p><p>Set <b>R vs L = 180°</b> — a polarity flip, the classic wiring fault. All nine LEDs light to −1.</p><p><b>Goal:</b> 180°, 9 phase LEDs.</p>`, check:()=>D.phase==='180' && readingAt(SIM.t).phaseN===9 && D.src!=='silence', hint:'R vs L → 180°. If you just changed it, wait ~0.5 s of sim time: the v102 averager is slow (α = 0.9999).' },
  { title:'8 · Lose the signal', body:`<p>Unplug the INPUT (click the BNC, or press U). Within one CS8416 poll (≈90 ms ${inf}) the firmware sees the receiver's UNLOCK bit, <b>blanks both bars</b> and lights <b>NO LOCK</b>. The phase row drops to its “no signal” half bar.</p><p>Scrub back and forth across the moment you unplugged it on the timeline.</p><p><b>Goal:</b> NO LOCK.</p>`, check:()=>!readingAt(SIM.t).locked && D.power, hint:'Click the BNC on the rear panel.' },
  { title:'9 · 96 kHz', body:`<p>Plug it back in and set the AES rate to <b>96 kHz</b> (manual: 30–96 kHz). The v102 firmware's time constants are per-sample numbers made for 48 kHz, so at 96 kHz <b>every ballistic runs twice as fast</b>. The 2002 ADSP-21065L engine measured the sample period (<span class="mono">sample_rate_calc</span>) and loaded 96 kHz constants instead — switch Engine to compare.</p><p><b>Goal:</b> 96 kHz, locked.</p>`, check:()=>D.fs===96000 && readingAt(SIM.t).locked, hint:'Plug the BNC back, AES rate → 96 kHz.' },
  { title:'Done', body:`<p>You have used every control on the SLM-1D. The <b>One second</b> tab slows the ballistics down to single samples, <b>Software</b> shows the interrupt, the background loop and the shift-register bits live, and <b>Findings</b> lists what the code really does.</p>`, check:()=>true, auto:true },
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__slmKeys = true;
  m.innerHTML = `<div class="grid2">
    <div>${card('Tutorial — operating the SLM-1D (from the SLM1 manual)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>
      ${card('What the DSP firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The unit', `<div style="display:flex;gap:12px;flex-wrap:wrap"><div id="fp" style="flex:1;min-width:140px;max-width:220px"></div><div id="rp" style="flex:1;min-width:140px;max-width:230px"></div></div><div style="margin-top:8px">${sourceHTML()}</div>`)}</div></div>`;
  m.querySelector('#fp').innerHTML = frontSVG();
  m.querySelector('.slmHot').innerHTML = `
    <rect x="60" y="120" width="210" height="910" fill="transparent"><title>Two 57-LED bars: VU bar, PPM dot, peak-hold dot. Red +20…+9, amber +8…−7, green −8…−52</title></rect>
    <rect x="70" y="1050" width="180" height="40" fill="transparent"><title>PR LEDs (lit with signal present, slm_4_vu_data3 “vu_pr”)</title></rect>
    <rect x="80" y="1095" width="160" height="60" fill="transparent"><title>PHASE: 9 LEDs, +1 in phase … −1 out of phase (backgnd.c ph1…ph9)</title></rect>
    <rect x="240" y="660" width="70" height="170" fill="transparent"><title>NO LOCK / LOCK (lock_stat lock2 / lock1)</title></rect>`;
  bindSource(m);
  let lastRear='';
  const draw = ()=>{
    paintFront(m.querySelector('#fp'), SIM.t);
    const rk = JSON.stringify([D.dip, D.plugged, D.power]); if (rk!==lastRear){ m.querySelector('#rp').innerHTML = rearSVG(); bindRear(m.querySelector('#rp')); lastRear=rk; }
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L = LESSONS[lessonIdx]; let ok=false; try{ ok = L.check(); }catch(e){}
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok? (L.auto?'Ready.':'✓ Goal reached.') : '◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over (defaults)</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); lessonIdx=0; draw(); };
    m.querySelectorAll('.slmSrc [data-s]').forEach(e=>{ const k=e.dataset.s; if (e.type!=='checkbox' && document.activeElement!==e && D[k]!==undefined && String(e.value)!==String(D[k])) e.value = D[k]; });
  };
  SIM.on('time', draw);
}

/* ---------------- One second, frame by frame ---------------- */
function ballisticsTable(){
  const fs = D.fs, g1 = D.eng==='g1', fc = fsClass(fs);
  const Tvu = g1? C.G1.VU[fc] : C.TCONST_VU, TA = g1? C.G1.ATT[fc] : C.TCONST_PPM_ATTACK, TD = g1? (D.dip.bs0?C.G1.D1[fc]:C.G1.D2[fc]) : (D.dip.bs0?C.DECAY_T2_48:C.DECAY_T1_48);
  const fall = T => 24/(-10*fs*Math.log10(1-T));                       // seconds per 24 dB fall
  // step response: steady sine switched on — time to reach −1 dB and 99 % (−0.087 dB) of the final VU reading
  const rise = (T, dB) => { const r = Math.pow(10, dB/10); return -Math.log(1-r)/(-Math.log(1-T))/fs; };
  const holdS = g1? 200000/fs : C.HOLD_TICKS*tick();
  return `<table class="kv"><tr><th>Ballistic</th><th>per-sample constant</th><th>at ${fs/1000} kHz</th><th>manual / standard</th></tr>
    <tr><td>VU integration (mean square)</td><td class="mono">${Tvu}</td><td class="mono">fall 24 dB in ${fall(Tvu).toFixed(3)} s · rise to −1 dB ${(rise(Tvu,-1)*1e3).toFixed(0)} ms, to 99 % ${(rise(Tvu,-0.0873)*1e3).toFixed(0)} ms</td><td class="small">code comment “vu=300mS/24db”; IEC VU: 99 % in 300 ms ${inf}</td></tr>
    <tr><td>PPM attack</td><td class="mono">${TA}</td><td class="mono">τ = ${(1/(fs*TA)*1e3).toFixed(2)} ms · −1 dB after ${(rise(TA,-1)*1e3).toFixed(1)} ms</td><td class="small">“pk attack=5mS/24db”</td></tr>
    <tr><td>PPM decay</td><td class="mono">${TD}</td><td class="mono">24 dB in ${fall(TD).toFixed(2)} s</td><td class="small">manual: Type 1 = 1.5 s, Type 2 = 3.0 s (BS0)</td></tr>
    <tr><td>Peak hold</td><td class="mono">${g1? '200000 samples' : '3000 ticks'}</td><td class="mono">${holdS.toFixed(3)} s</td><td class="small">manual: 3 s</td></tr>
    <tr><td>Phase averager</td><td class="mono">α = ${g1?C.PH_ALPHA_G1:C.PH_ALPHA_V102}</td><td class="mono">τ = ${(1/(1-(g1?C.PH_ALPHA_G1:C.PH_ALPHA_V102))/fs*1e3).toFixed(1)} ms</td><td class="small">—</td></tr>
    <tr><td>Display update</td><td class="mono">${g1? 'every 300 samples' : '10 ticks, 2 blank'}</td><td class="mono">${g1? SIM.fmtDur(300/fs)+' (both bars)' : SIM.fmtDur(10*tick())+' per bar, '+(1/(20*tick())).toFixed(0)+' Hz each'}</td><td class="small">—</td></tr></table>`;
}
function viewAnatomy(m){
  window.__slmKeys = true;
  m.innerHTML = `
  ${card('As seen by the displays — ballistics in slow motion (zoom window around the playhead)', `<canvas id="bal"></canvas>
     <p class="small muted">Thin lines: the continuous VU (solid) and PPM (dashed) values inside the DSP, in scale units. Steps: what the LEDs actually show — table look-ups of the integer index (0.5 dB per step, 1–2 dB per LED) refreshed once per mux period. Dots: peak hold. Below: every LED of the L bar over time (rows = LEDs, +20 at top).</p>
     <canvas id="strip"></canvas>`)}
  <div class="grid2">
    ${card('Ballistics in numbers (live: engine, rate, DIP)', `<div id="btab"></div>`)}
    ${card('As seen by the device — at the playhead', `<div id="dev"></div>`)}
  </div>
  ${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">${card('Front lens at the playhead', `<div id="fp" style="max-width:200px"></div>`)}${card('Source & settings', sourceHTML())}</div>`;
  m.querySelector('#fp').innerHTML = frontSVG();
  bindSource(m);
  const draw = ()=>{
    const t = SIM.t, S = simulate(), fs = D.fs, T = tick(), g1 = D.eng==='g1';
    paintFront(m.querySelector('#fp'), t);
    drawBallistics(m.querySelector('#bal'), m.querySelector('#strip'));
    m.querySelector('#btab').innerHTML = ballisticsTable();
    const n = Math.floor(t*fs), P = panelAt(t), i = snapI(t);
    const ph = (t*fs - n), isrDur = C.ISR_CYC.reduce((a,b)=>a+b[1],0)/C.CCLK*fs;
    let stage = 'background while(1)'; if (!g1 && ph < isrDur){ let acc=0; for (const [nm,cy] of C.ISR_CYC){ acc += cy/C.CCLK*fs; if (ph < acc){ stage = 'SampleIRQ: '+nm; break; } } }
    const F = FRAME(), bitPos = Math.floor(((t % F)+F)%F * SCLK4());
    m.querySelector('#dev').innerHTML = `<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>AES / SPORT0</th><td class="mono">sample #${n.toLocaleString()} · ${((n%192)+192)%192}/191 in block · ${(ph*100).toFixed(0)} % into the sample period</td></tr>
      <tr><th>SHARC core</th><td class="mono">${g1? (((n%300)+300)%300 < 72? 'sport0_isr + shift_led_data (clock edge '+(((n%300)+300)%300)+'/72)' : 'sport0_isr / main_vuloop') : stage}</td></tr>
      <tr><th>GP timers</th><td class="mono">${!D.power? 'off' : g1? '— (no timer: counters in the ISR)' : `tick #${Math.floor(t/T)} · mux phase ${P.info.inBlank?'BLANK':'lit '+(P.info.cur.m?'R':'L')} · hold L ${S.holdLeft[0][i].toFixed(3)} s left`}</td></tr>
      <tr><th>MM5450 link</th><td class="mono">${g1? 'FLG4/5/6 data, FLG7 clock (bit-banged)' : `frame bit ${bitPos}/127 → word ${bitPos>>5}, bit ${bitPos&31} on DATA_IN1/2/3`}</td></tr>
      <tr><th>CS8416</th><td class="mono">${conn(t)?'locked':'no signal'} · last RERR read ${SIM.fmtT(pollT(t))} → ${lockSeen(t)?'OK':'UNLOCK'}</td></tr>
      <tr><th>Meter maths</th><td class="mono">VU L ${readVU(S.vu[0][i]).toFixed(2)} → shows ${fmtL(readingAt(t).vu[0])} · PPM L ${readPK(S.ppm[0][i]).toFixed(2)} → ${fmtL(readingAt(t).pk[0])}</td></tr></table>`;
    const rows = [
      ['AES3 frames = SampleIRQs', fs.toLocaleString(), SIM.fmtDur(1/fs), g1?'sport0_isr: float, VUMeterCalc, PhaseMeterCalc, counters, peak test, shifter step':'SampleIRQ: float, PhaseMeterCalc, VUMeterCalc (SSensorCalc commented out)'],
      ['AES3 blocks', (fs/192).toFixed(1), SIM.fmtDur(192/fs), 'Z preamble; channel status (not used by the meter)'],
      ['Background passes', '≈ '+Math.round(C.CCLK/C.BG_CYC).toLocaleString()+' '+inf, SIM.fmtDur(C.BG_CYC/C.CCLK), 'VUMeterGet ×4 (MathLn), PhaseMeterGet ×2 (MathDiv), DIP decode, peak hold'],
      ...(g1? [['Display updates', (fs/300).toFixed(1), SIM.fmtDur(300/fs), 'mux_ctl → translate_meter_results; both bars'],
              ['Shift clock edges', (fs/300*72).toFixed(0), SIM.fmtDur(1/fs), 'one FLG7 toggle per interrupt, 36 bits per update']]
          : [['GP timer ticks', (1/T).toFixed(0), SIM.fmtDur(T), 'TimerIRQ decrements GP_TIMER0–3 ('+(D.tick==='xtal'?'crystal tick, inferred':'1 ms per comment')+')'],
             ['Mux cycles (blank + refresh)', (1/(10*T)).toFixed(1), SIM.fmtDur(10*T), 'refresh() alternates L and R: each bar '+(1/(20*T)).toFixed(0)+' Hz, 80 % duty'],
             ['MM5450 frames per line', (1/FRAME()).toFixed(0), SIM.fmtDur(FRAME()), '128 bits at '+(SCLK4()/1000).toFixed(1)+' kHz, DMA repeats the same 4 words '+inf],
             ['Display bits per second', Math.round(3*SCLK4()).toLocaleString(), '', 'three data lines (A, B, C) share CLOCK and DATA_ENABLE']]),
      ['CS8416 register reads', (1/C.CS_POLL).toFixed(1)+' '+inf, SIM.fmtDur(C.CS_POLL), '18-word table on SPORT2 at 100 Hz frames → UNLOCK bit'],
      ['Peak hold', '', SIM.fmtDur(g1? 200000/fs : 3000*T), g1? '200000-sample counters in sport0_isr' : 'GP_TIMER2/3 = 3000'],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Use <b>Step</b> on the transport to move one sample, one timer tick, one mux period or one MM5450 frame at a time.</p>`;
  };
  SIM.on('time', draw);
}
function drawBallistics(cv, cv2){
  const [t0,t1] = SIM.window(), S = simulate();
  const {c,w} = SIM.canvas(cv, 280); const x0=46, pw=w-x0-8, H=250, top=16;
  const X = t => x0 + (t-t0)/(t1-t0)*pw, Yv = v => top + (20 - Math.max(-52,Math.min(20,v)))/72*H;
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), grid=SIM.css('--grid'), acc=SIM.css('--accent'), bad=SIM.css('--bad'), warn=SIM.css('--warn'), play=SIM.css('--play');
  c.font='10px '+SIM.css('--mono');
  [20,10,0,-10,-20,-30,-40,-52].forEach(v=>{ c.strokeStyle=grid; c.beginPath(); c.moveTo(x0,Yv(v)); c.lineTo(x0+pw,Yv(v)); c.stroke(); c.fillStyle=ink2; c.fillText(fmtL(v),4,Yv(v)+3); });
  const step=SIM.niceStep((t1-t0)/8); for(let tt=Math.ceil(t0/step)*step; tt<=t1; tt+=step){ c.fillStyle=ink2; c.fillText(SIM.fmtDur(tt).replace(' s','s'), X(tt)+2, 11); c.strokeStyle=grid; c.beginPath(); c.moveTo(X(tt),top); c.lineTo(X(tt),top+H); c.stroke(); }
  // input envelope (shaded)
  c.fillStyle=ink2; c.globalAlpha=.12; for(let px=0;px<pw;px+=2){ const ta=t0+(t1-t0)*px/pw, i=snapI(ta); const a=S.pkAbs[0][Math.min(S.M-1,i+1)]; if(a>0){ const v=20*Math.log10(a)-D.level+ (D.level - nominal()); c.fillRect(x0+px, Yv(v), 2, top+H-Yv(v)); } } c.globalAlpha=1;
  const i0=Math.max(0,Math.floor((t0-S.t0)/S.dt)-1), i1=Math.min(S.M-1,Math.ceil((t1-S.t0)/S.dt)+1), st=Math.max(1,Math.floor((i1-i0)/1500));
  [[0,acc],[1,bad]].forEach(([ch,col])=>{
    c.strokeStyle=col; c.lineWidth=1; c.globalAlpha=.6;
    c.beginPath(); for(let i=i0;i<=i1;i+=st){ const tt=S.t0+i*S.dt, v=readVU(S.vu[ch][i]); i===i0?c.moveTo(X(tt),Yv(v)):c.lineTo(X(tt),Yv(v)); } c.stroke();
    c.setLineDash([4,3]); c.beginPath(); for(let i=i0;i<=i1;i+=st){ const tt=S.t0+i*S.dt, v=readPK(S.ppm[ch][i]); i===i0?c.moveTo(X(tt),Yv(v)):c.lineTo(X(tt),Yv(v)); } c.stroke(); c.setLineDash([]); c.globalAlpha=1;
  });
  // displayed steps (what the LEDs show), sampled per pixel
  const N=Math.min(700,Math.floor(pw)); let prev=[null,null];
  for (let p=0;p<=N;p++){ const tt=t0+(t1-t0)*p/N, P=panelAt(tt);
    [0,1].forEach(ch=>{ let top=null; for(let k=56;k>=0;k--){ if(P.bar[ch][k]) top=k; else break; }   // top of the contiguous VU bar
      const v = top==null? null : LAB57[top]; c.fillStyle= ch? bad : acc; if (v!=null) c.fillRect(X(tt), Yv(v)-1.5+(ch?1:0), pw/N+0.6, 2.4); }); }
  // hold dots
  for (let p=0;p<=N;p+=4){ const tt=t0+(t1-t0)*p/N, r=readingAt(tt); if (r.hold[0]!=null){ c.fillStyle=warn; c.beginPath(); c.arc(X(tt),Yv(r.hold[0]),2.2,0,7); c.fill(); } }
  const px=X(SIM.t); c.strokeStyle=play; c.lineWidth=2; c.beginPath(); c.moveTo(px,top); c.lineTo(px,top+H); c.stroke();
  c.fillStyle=ink; c.font='11px sans-serif'; c.fillText(`L (green) · R (red) · ${D.eng==='g1'?'2002 engine':'v102'} · ${D.fs/1000} kHz · 0 = ${nominal()} dBFS`, x0+6, top+H+22);
  if (!cv._seek){ cv._seek=true; cv.addEventListener('click', e=>{ const r=cv.getBoundingClientRect(); const [a,b]=SIM.window(); SIM.seek(a+(e.clientX-r.left-x0)/(r.width-x0-8)*(b-a)); }); }
  // LED strip of the L bar
  const g = SIM.canvas(cv2, 130); const c2=g.c; const pw2=g.w-x0-8; const Nn=Math.min(600,Math.floor(pw2));
  for (let p=0;p<Nn;p++){ const tt=t0+(t1-t0)*(p+0.5)/Nn, P=panelAt(tt); for(let k=0;k<57;k++){ c2.fillStyle = P.bar[0][k]? ON_COL[ZONE(k)] : SIM.css('--lane'); c2.fillRect(x0+p*pw2/Nn, 4+k*2.1, pw2/Nn+0.4, 1.8); } }
  c2.fillStyle=ink2; c2.font='10px '+SIM.css('--mono'); c2.fillText('+20',4,10); c2.fillText('0',4,4+20*2.1+4); c2.fillText('−52',4,4+56*2.1+2);
  const px2 = x0+(SIM.t-t0)/(t1-t0)*pw2; c2.strokeStyle=play; c2.lineWidth=2; c2.beginPath(); c2.moveTo(px2,0); c2.lineTo(px2,128); c2.stroke();
}

/* ---------------- Block diagram ---------------- */
const BLOCKS = {
  inp:{x:16,y:30,w:150,h:84,t:'INPUT',s:['BNC1 75 Ω / TB1 110 Ω','T1 PE-65612 transformer'],d:'SLM-1D: AES/EBU in on a BNC (75 Ω, SLM-1M2-75 rear) or a 3-pin Phoenix (110 Ω, SLM-1M2-110). Both footprints (BNC1, TB1) feed the same pulse transformer T1 (PE-65612) on the SLM1-5 board (slm1-5iss3.net nets NET00009/NET00018).'},
  rx:{x:16,y:160,w:150,h:96,t:'CS8416 (U4)',s:['AES3 receiver','audio → SPORT0','control ↔ SPORT2/3'],d:'Cirrus CS8416. Audio out: DAI_P8_FSYNCH (U4-28), DAI_P9_SCLK (U4-27), DAI_P10_SDATA1 (U4-26) → SPORT0 (slave). Control port in SPI-like mode on DAI_P11–P15 (U4OUT, U4CLK, U4_IN, U4RESET, U4SEL), driven by an 18-word SPORT2 DMA loop (cs8416_ctl_dat.c) that writes registers 0–6, 0x0A and reads 0x0B/0x0C. RERR bit 0x10 = UNLOCK.'},
  dsp:{x:205,y:110,w:235,h:200,t:'ADSP-21262 (U1)',s:['SampleIRQ @ fs: Phase/VUMeterCalc','while(1): VUMeterGet, hold, mux','TimerIRQ: GP_TIMER0–3','SRU: DIP → FLAG10–13','SPORT4/5 DMA → display'],d:'SHARC, 24.576 MHz crystal (X1). sample.c SampleIRQ runs the meter maths every sample; backgnd.c main() reads the DIPs, converts the meter values to 0–255 indexes, runs the peak hold and multiplexes the display; timer.c counts GP timers. The display words go out by DMA on SPORT4 (A, B) and SPORT5 (C), continuously.'},
  fl:{x:220,y:20,w:200,h:56,t:'AT25F512A (U2) SPI flash',s:['boot: elfloader -bspiflash'],d:'64 KB SPI boot flash on SPICLK/MISO/MOSI and FLAG0_CS (U1-125/126/127/15). The .ldr images were deleted in the archive clean-up.'},
  dip:{x:16,y:300,w:150,h:76,t:'SW1 DIP (209-4MS)',s:['BS1 BS0 CAL1 CAL0','→ DAI_P1…P4'],d:'Four switches to GNDD, pulled up on DAI_P1–P4 (R8, R9, R12, R14). InitDAI routes DAI_PB01–04 to FLAG10–13. ON = 0.'},
  pwr:{x:16,y:400,w:150,h:60,t:'Power',s:['6 V adapter → TPS70445'],d:'PJ006 jack (+6V, D2 1N4003) → REG1 TPS70445 dual regulator (3.3 V I/O and core).'},
  drv:{x:480,y:140,w:150,h:96,t:'DS34LV87T (U3)',s:['RS-422 drivers ×4','DATA_IN1/2/3, CLK'],d:'Line drivers for the ribbon to the meter head: DAI_P17_DATA_IN1, DAI_P20_DATA_IN2, DAI_P16_DATA_IN3, DAI_P18_CLK → R1±…R4± on H2/H3. DAI_P19_ENABLE (SPORT4 frame sync) goes straight to H2/H3 pin 14 as the MM5450 DATA ENABLE.'},
  head:{x:480,y:280,w:170,h:150,t:'SLM1-4 LED head',s:['DS26LS32A receiver','3× MM5450 (U3 U5 U6)','FDC634 + 2N4401/03 L/R switch','57+57 bar LEDs, PR, phase, lock'],d:'U3 (DATA_IN1): 26 top LEDs D34–D59. U5 (DATA_IN2): D0–D2 and the 31 lower LEDs D3–D33. U6 (DATA_IN3): PHASE1–9, LOCK1–6, and the L/R select outputs. Every D-net drives the same LED in both bars (L1_n and L2_n); POWER0/POWER1 select which bar is lit — a 1:2 multiplex.'},
};
const WIRES = [['inp','rx','AES3'],['rx','dsp','I²S audio · control'],['fl','dsp','boot'],['dip','dsp','DAI_P1–4'],['pwr','dsp',''],['dsp','drv','DAI_P16–20'],['drv','head','ribbon H2/H3']];
function viewBlock(m){
  window.__slmKeys = false;
  let sel = 'dsp';
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram — SLM-1D (SLM1-5 board + SLM1-4 head). Click a block.', `<div id="bd"></div>`)}</div>
    <div>${card('Block', `<div id="bdinfo"></div>`)}${card('Signal flow in one paragraph', `<p>The <b>CS8416</b> turns the AES3 stream back into samples. Every sample interrupts the <b>SHARC</b>, which squares the samples and runs three averagers per channel (VU, PPM attack, PPM decay) plus a phase averager. A background loop turns those averages into 0.5 dB steps, looks them up in LED tables and writes three 32-bit words per bar. <b>SPORT DMA</b> streams the words to three <b>MM5450</b> LED drivers on the meter head, which show the left bar, then the right bar, alternating.</p>`)}
    ${card('Generations in the archive', `<table class="kv">
      <tr><th>${Y(2002)}</th><td>SLM-1, ADSP-21065L + CS8427, 41-LED heads, ERROR/LOCK (sharc/slm-1-v1.00…1.02, “DSB Nov 13 2002”)</td></tr>
      <tr><th>${Y(2005)}–${Y(2007)}</th><td>SLM1-5 board, ADSP-21262 + CS8416 (shell262 from RLM24), SLM1-4 57-LED heads — <b>modelled here</b> (v102, 1 Jun 2007)</td></tr>
      <tr><th>${Y(2009)}</th><td>SLM1-6 board v102A: AK5381 ADC (analog SLM-1A), PLL ×8, lock blanking commented out</td></tr>
      <tr><th>${Y(2010)}</th><td>Test report SLM1A / SDM2-3-ISS1, firmware V101A</td></tr>
      <tr><th>${Y(2016)}</th><td>Drafting set: SLM-1M7 lens and SLM-1M2 rear silks used for this panel</td></tr></table>`)}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 660 480" style="width:100%"><defs><marker id="slmAr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#slmAr)"/>`;
      if (l) s+=`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-5}" font-size="10.5" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
        <text x="${b.x+9}" y="${b.y+19}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+9}" y="${b.y+36+i*15}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    s+='</svg>'; m.querySelector('#bd').innerHTML=s;
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
  };
  draw();
}

/* ---------------- Schematics (redrawn from P-CAD netlists) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
const SHEETS = [
  { name:'1 · DSP core and boot', note:'From slm1-5iss3.net: U1 ADSP-21262 pin numbers and net names, U2 AT25F512A, X1, TP1. FLAG2–FLAG11 pins are single-pin nets (test pads or unused).', svg:()=>
    chip(330,50,190,'U1 ADSP-21262',[['15','FLAG0_CS'],['125','SPICLK'],['126','MISO'],['127','MOSI'],['121','SHARC_RESET'],['142/143','X1 24.576 MHz'],['134','DSP_CLK_OUT → TP1'],['53/56/57/62','DAI_P1…P4 (DIP)'],['16','FLAG1 → R21 → DAI_P15']],
      [['71','DAI_P8_FSYNCH'],['70','DAI_P9_SCLK'],['77','DAI_P10_SDATA1'],['78','DAI_P11_U4OUT'],['79','DAI_P12_U4CLK'],['80','DAI_P13_U4_IN'],['81','DAI_P14_U4RESET'],['82','DAI_P15_U4SEL'],['86','DAI_P16_DATA_IN3'],['87','DAI_P17_DATA_IN1'],['88','DAI_P18_CLK'],['89','DAI_P19_ENABLE'],['94','DAI_P20_DATA_IN2']],'SHARC · VisualDSP++ · H1 JTAG (H2X7)')
    + chip(200,320,140,'U2 AT25F512A',[['1','FLAG0_CS'],['6','SPICLK'],['2','MISO'],['5','MOSI'],['3','SHARC_RESET']],[],'SPI boot flash') },
  { name:'2 · AES receiver', note:'BNC1 and TB1 share T1 (PE-65612). CS8416 analog-input pins 4–8 go to T1 through C11/C13/R5/R1/R4 (values in the BOM). Exact input termination values are not traced here.', svg:()=>
    `<circle cx="70" cy="110" r="16" fill="none" stroke="var(--ink)"/><text x="40" y="80" font-size="11" fill="var(--ink)">BNC1 31-5329-72RFX</text><text x="40" y="160" font-size="11" fill="var(--ink)">TB1 PHEN3P (+ − G)</text>
     <line x1="86" y1="110" x2="150" y2="110" stroke="var(--ink)"/><text x="96" y="104" font-size="10" fill="var(--accent2)">NET00018</text>
     <path d="M150 90 q10 10 0 20 q10 10 0 20 M170 90 q-10 10 0 20 q-10 10 0 20" fill="none" stroke="var(--ink)"/><text x="140" y="155" font-size="11" fill="var(--ink)">T1 PE-65612</text>
     <line x1="170" y1="110" x2="400" y2="110" stroke="var(--ink)"/><text x="190" y="104" font-size="10" fill="var(--accent2)">NET00012 / NET00025 → C11, C13, R5</text>`
    + chip(470,60,190,'U4 CS8416',[['4/5/6/8','RXP0/RXN ← T1'],['9','DAI_P14_U4RESET'],['14','DAI_P15_U4SEL'],['15','DAI_P13_U4_IN'],['16','DAI_P12_U4CLK']],[['28','DAI_P8_FSYNCH (OLRCK)'],['27','DAI_P9_SCLK (OSCLK)'],['26','DAI_P10_SDATA1 (SDOUT)'],['17','DAI_P11_U4OUT (CDOUT)'],['21/23','3V'],['7/22','GNDD']],'AES3 receiver') },
  { name:'3 · DIP switch and power', note:'SW1 pins 1–4 go to GNDD; pins 5–8 to the DSP through R14, R12, R9, R8. InitDAI enables the DAI pull-ups (0xfffff), so ON reads 0.', svg:()=>
    chip(140,70,120,'SW1 209-4MS',[],[['8','R8 → DAI_P1 → FLAG10 (CAL0)'],['7','R9 → DAI_P2 → FLAG11 (CAL1)'],['6','R12 → DAI_P3 → FLAG12 (BS0)'],['5','R14 → DAI_P4 → FLAG13 (BS1)'],['1–4','GNDD']],'4-way DIP')
    + chip(260,280,160,'REG1 TPS70445',[['2/3/10/11','VIN ← D2 ← +6V'],['14–16','DSP_INT (core)'],['21–23','3V (I/O)']],[['8','SHARC_RESET (power-good)']],'dual LDO')
    + `<text x="40" y="440" font-size="11" fill="var(--ink2)">PWR1 PJ006 (31-155) +6V → D2 1N4003 → VIN; P1 PAN456 alternative power header.</text>` },
  { name:'4 · Display link (DSP side)', note:'U3 DS34LV87T pins from slm1-5iss3.net; SPORT routing from configdai.c InitDAI(). The SPORT4 frame sync on DAI_P19 is the MM5450 DATA ENABLE.', svg:()=>
    chip(300,60,170,'U3 DS34LV87T',[['1','DAI_P17_DATA_IN1 ← SPORT4 DA'],['7','DAI_P20_DATA_IN2 ← SPORT4 DB'],['9','DAI_P16_DATA_IN3 ← SPORT5 DA'],['15','DAI_P18_CLK ← SPORT4 CLK']],[['2/3','R1+ / R1−'],['6/5','R2+ / R2−'],['10/11','R3+ / R3−'],['14/13','R4+ / R4−']],'RS-422 quad driver')
    + `<text x="40" y="250" font-size="11.5" fill="var(--ink)">H2 (H2X10F) and H3 (H2X10POL), pins 1–8 = R1±…R4±, pin 14 = DAI_P19_ENABLE (SPORT4_FS_O), 17–20 = VIN</text>
       <text x="40" y="275" font-size="11.5" fill="var(--ink2)">SPCTL4 = 0x03bc75f9: 32-bit words, LSB first, internal clock and frame sync, A and B channels DMA-chained to themselves.</text>
       <text x="40" y="295" font-size="11.5" fill="var(--ink2)">DIV4 = 183 → SCLK ≈ 200 kHz at 147.456 MHz (inferred core clock). SPORT5 is a slave to SPORT4's clock and frame sync (DAI_PB18/19).</text>` },
  { name:'5 · Meter head SLM1-4', note:'From SLM-1-4/OBSOLETE/slm1-4iss1.net (issue 1) and the ISS2 BOM. Output pin order inferred from the D-net sequence (D0 → pin 20 … D33 → pin 27).', svg:()=>
    chip(70,60,150,'U102 DS26LS32A',[['3/1','DATA_IN1'],['13','DATA_IN2'],['5','DATA_IN3'],['11','CLOCK']],[],'RS-422 receiver')
    + chip(350,40,150,'U3 MM5450',[['25','DATA_IN1'],['24','CLOCK'],['26','DATA_ENABLE']],[['20…3, 44…40','D34…D59 (top 26)']],'chip A')
    + chip(350,170,150,'U5 MM5450',[['25','DATA_IN2'],['24','CLOCK'],['26','DATA_ENABLE']],[['20,19,18','D0 D1 D2 (PR group)'],['17…27','D3…D33 (lower 31)']],'chip B')
    + chip(350,300,150,'U6 MM5450',[['25','DATA_IN3'],['24','CLOCK'],['26','DATA_ENABLE']],[['20…11','PHASE1…PHASE9'],['10…5','LOCK1…LOCK6'],['(16/17)','L/R select → Q1–Q8']],'chip C')
    + `<text x="40" y="430" font-size="11" fill="var(--ink2)">Each Dn drives L1_n and L2_n (one LED in each bar). POWER0 / POWER1 feed the two bars' anodes through FDC634 + 2N4401/2N4403 — the left/right multiplex.</text>` },
];
function viewSchem(m){
  window.__slmKeys = false;
  let i=0;
  m.innerHTML = card('Schematic set — REDRAWN from the P-CAD netlists, BOMs and firmware (not the original CAD drawings)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">Originals: <span class="mono">SLM-1/PCB/SLM-1-5/PCB/slm1-5iss3.sch</span> (DSP board) and <span class="mono">SLM-1-4/slm1-4iss1.sch</span> (LED head), P-CAD binary. These sheets are a readable guide built from the ASCII netlists (<span class="mono">.net</span>) and BOMs; pin numbers and net names are copied, the drawing is ours. Blue labels are nets.</p>`);
  const draw=()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 860 470" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px">
      <rect x="6" y="6" width="848" height="458" fill="none" stroke="var(--line)"/><text x="840" y="455" text-anchor="end" font-size="10" fill="var(--ink2)">SLM-1D · sheet ${i+1}/${SHEETS.length} · redrawn ${Y(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent = SHEETS[i].note;
  };
  draw();
}

/* ---------------- Software ---------------- */
function boxes(items, onIdx, opts){
  opts=opts||{}; const W=opts.w||460, bh=34, gap=12; let s=`<svg viewBox="0 0 ${W+40} ${items.length*(bh+gap)+30}" style="width:100%"><defs><marker id="slmA2${opts.id||''}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
  items.forEach((p,j)=>{ const y=10+j*(bh+gap), on=onIdx===j, dim = p[2]==='dead';
    if (j) s+=`<line x1="${W/2}" y1="${y-gap}" x2="${W/2}" y2="${y}" stroke="var(--ink2)" marker-end="url(#slmA2${opts.id||''})"/>`;
    s+=`<rect x="10" y="${y}" width="${W}" height="${bh}" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="${dim?'var(--warn)':'var(--line)'}" ${dim?'stroke-dasharray="4 3"':''}/>
      <text x="20" y="${y+14}" font-size="11.5" font-family="var(--mono)" fill="${on?'#fff':dim?'var(--warn)':'var(--ink)'}">${p[0]}</text><text x="20" y="${y+28}" font-size="10" fill="${on?'#eef':'var(--ink2)'}">${p[1]}</text>`; });
  if (opts.loop){ const yb=10+(items.length-1)*(bh+gap)+bh/2; s+=`<path d="M${W+10} ${yb} h18 V${10+bh/2} h-18" fill="none" stroke="var(--ink2)" marker-end="url(#slmA2${opts.id||''})"/>`; }
  return s+'</svg>';
}
function viewSoft(m){
  window.__slmKeys = true;
  m.innerHTML = `<div class="grid2">
    ${card('Sample interrupt — the box lit up is running at the playhead (zoom to 10 µs)', `<div id="isr"></div>`)}
    ${card('Background loop (backgnd.c main) — lit = last thing it did for the display', `<div id="bg"></div>`)}</div>
  <div class="grid2">
    ${card('Ballistics state (vumeter.asm work space) — live', `<div id="bal"></div>`)}
    ${card('Display words → MM5450 bit map — live', `<div id="bits" class="scroll"></div>`)}</div>
  <div class="grid2">
    ${card('Silence sensor state machine (SSensor.asm) — what-if', `<div id="ss"></div>`)}
    ${card('How the switches did things — DIP → code → LEDs', `<div id="btn"></div>`)}</div>
  ${card('Files: what is built and what is just lying there (slm1-1.dpj, v102)', `<div id="files"></div>`)}
  ${card('Source & settings', sourceHTML())}`;
  bindSource(m);
  const draw=()=>{
    const t=SIM.t, fs=D.fs, S=simulate(), i=snapI(t), g1=D.eng==='g1';
    const n=Math.floor(t*fs), ph=(t*fs-n);
    let on=-1;
    if (!g1){ let acc=0; for (let j=0;j<C.ISR_CYC.length;j++){ acc+=C.ISR_CYC[j][1]/C.CCLK*fs; if (ph<acc){ on=j; break; } } }
    const isrItems = g1? [
      ['sport0_isr: bit set mode1 SRRFL…', 'alternate registers; emuclk → emuclk_prev (sample-rate measure)'],
      ['float dma_in_a by −31 → audio_in_float', 'CS8427 data on SPORT0 A'],
      ['_VUMeterCalc · _PhaseMeterCalc', 'VU, PPM attack/decay, |L±R| averages'],
      ['mux_counter−1 → mux_ctl every 300', 'toggle BIT31 (L/R), set BIT30, translate_meter_results'],
      ['ppm/pk counters · test_peaks_left_1/right_1', '|x| > 0.707 → pk_led on, pk_counter = 200000'],
      ['shift_led_data (if BIT30)', 'toggle FLG7, put one bit on FLG4/5/6'],
      ['ppm_hold_l / ppm_hold_r (BS1)', 'flags bug: right routine decides for both'],
      ['refresh_lock_status · read_dipswitch · rti', 'cs8427_in+5 & 8192 → lock/error; meter_cal'] ]
      : [['dispatch: interrupts(SIG_SP0,SampleIRQ)', 'VisualDSP++ C dispatcher saves context (cycle counts inferred)'],
         ['TDM_in = TDM_audio_in[tdm_idx]; tdm_idx ^= 1', 'double buffer; float %1 by −31 for L and R'],
         ['PhaseMeterCalc(&phmeter_info)', 'sumAVE = 0.9999·sumAVE + 0.0001·|L+R| (and diffAVE)'],
         ['VUMeterCalc(&vumeter_info)', 'VU += (x²−VU)·Tvu; PPM += max((x²−PPM)·TppmA, (x²−PPM)·TppmD)'],
         ['//SSensorCalc(&ssensor_info);  return', 'silence sensor commented out', 'dead']];
    m.querySelector('#isr').innerHTML = boxes(isrItems, g1? (((n%300)+300)%300<72? 5 : 2) : on, {id:'i'}) + `<p class="small muted">Sample ${n.toLocaleString()} · ${(ph*100).toFixed(1)} % into the ${SIM.fmtDur(1/fs)} period${!g1 && on<0? ' — the core is in the background loop now':''}.</p>`;
    const P=panelAt(t);
    let bgOn = 2; if (!g1 && P.info.cur){ const u=(t-FRAME())/tick(); const ph10=u-10*Math.floor(u/10); bgOn = ph10<0.3? 4 : (ph10>=2 && ph10<2.3)? 5 : 2; }
    m.querySelector('#bg').innerHTML = boxes([
      ['cal = flag_reg & 0x00500000 → calx', `CAL DIPs → 0/4/8/12 half-dB steps (now ${calx()})`],
      ['testppm → vumeter_wspace[VUMETER_WS_PPM_DECAY]', `BS0 (flag_reg & 0x01000000) → ${D.dip.bs0?'3 s':'1.5 s'} per 24 dB`],
      ['vu/pk_results[k] = max(VUMeterGet(...)+calx, 6 / 0)', 'MathLn → −2·10·log10 → 0…255; phase_results = PhaseMeterGet'],
      ['if (flag_reg & 0x04000000) peak hold', `pk_results < pk_hold → hold + SetTimer(GP_TIMER2/3, 3000)`],
      ['TimerExpired(GP_TIMER1): blank words', 'A[0]=1, B[0]=0x10000000, C[0]=1; GP_TIMER0=2, GP_TIMER1=10'],
      ['TimerExpired(GP_TIMER0): refresh()', 'mux_count ^= 1; table look-ups → display_data_A/B/C; read FLAGS'],
      ['phase_results[0] → ph1…ph9', 'thresholds 224, 196, 168, 140, 112, 84, 56, 28'] ], g1? -1 : bgOn, {id:'b', loop:true}) + (g1? '<p class="small muted">The 21065L main loop only runs sample_rate_calc and the VUMeterGet / PhaseMeterGet loop; everything else is in sport0_isr.</p>':'');
    const wl = ['Tvu','TppmA','TppmD','junk1','junk2','ppm1 (L)','vu1 (L)','ppm2 (R)','vu2 (R)'], wv = [S.Tvu,S.TA,S.TD,null,null,S.ppm[0][i],S.vu[0][i],S.ppm[1][i],S.vu[1][i]];
    m.querySelector('#bal').innerHTML = `<table class="kv">${wl.map((l,j)=>`<tr><th class="mono">wspace[${j}] ${l}</th><td class="mono">${wv[j]==null? '<span class="muted">pipeline slot (see Findings)</span>' : wv[j].toExponential(4)}${j>=5? ` → ${(10*Math.log10(Math.max(wv[j],1e-13))).toFixed(2)} dBFS² → index ${vuGet(wv[j], g1?1:C.VUGET_K)}` : ''}</td></tr>`).join('')}</table>
      <p class="small">VUMeterGet(): <span class="mono">f4 ×= 0.96275853891</span> (v102) → <span class="mono">MathLn</span> → ×4.342944819 = dB → <span class="mono">min(−2·dB, 255)</span> → <span class="mono">fix</span>. Then +calx and the slm_4 tables: index ${vuIdx(S,0,i)} → <span class="mono">slm_4_vu_data1[${vuIdx(S,0,i)}] = ${at(VU1,vuIdx(S,0,i))==null?'vu_off':'vu'+String(at(VU1,vuIdx(S,0,i))).replace('-','_')}</span>, <span class="mono">slm_4_vu_data2 = ${at(VU2,vuIdx(S,0,i))==null?'vu_off':'vu_'+(-at(VU2,vuIdx(S,0,i)))}</span>.</p>`;
    m.querySelector('#bits').innerHTML = bitmapHTML(t);
    // silence sensor
    const ss = [0,1].map(ch=>({ ms:S.ss[ch][i], cnt:S.ssCnt[ch][i], st:S.ssSt[ch][i] }));
    const node=(x,y,lbl,on,sub)=>`<g><rect x="${x-62}" y="${y-24}" width="124" height="48" rx="10" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="${x}" y="${y-4}" text-anchor="middle" font-size="12" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${lbl}</text><text x="${x}" y="${y+12}" text-anchor="middle" font-size="10" fill="${on?'#fff':'var(--ink2)'}">${sub}</text></g>`;
    const stL = !D.ss? -1 : ss[0].cnt===C.SS_DET? 0 : ss[0].cnt>0? 1 : 2;
    m.querySelector('#ss').innerHTML = `<svg viewBox="0 0 470 200" style="width:100%">${node(80,70,'PROGRAM',stL===0,'MS > THRES · cnt = DET_TIME')}${node(235,70,'COUNTING',stL===1,'MS ≤ THRES · cnt−1')}${node(390,70,'SILENCE',stL===2,'cnt = 0 → sticky = 0')}
      <path d="M142 64 H173" stroke="var(--ink2)" stroke-width="2"/><path d="M297 64 H328" stroke="var(--ink2)" stroke-width="2"/><path d="M390 100 Q235 180 80 100" fill="none" stroke="var(--ink2)"/>
      <text x="235" y="168" text-anchor="middle" font-size="10" fill="var(--ink2)">MS &gt; THRES → cnt = DET_TIME (sticky stays 0 until SSensorGet(…,clear=1))</text>
      <text x="10" y="16" font-size="11" fill="var(--ink)">L: MS ${ss[0].ms.toExponential(2)} (${(10*Math.log10(Math.max(ss[0].ms,1e-13))).toFixed(1)} dB) · cnt ${ss[0].cnt} · sticky ${ss[0].st?'program':'SILENCE'} · R cnt ${ss[1].cnt}</text></svg>
      <p class="small">${D.ss? 'What-if running.' : '<b>Dormant in v102:</b> <span class="mono">SSensorInit</span> and <span class="mono">SSensorCalc</span> are commented out in sample.c, <span class="mono">SSensorGet</span> in backgnd.c. The state above is what it <i>would</i> be.'} THRES = 1e-6 (−60 dB), DET_TIME = SAMPLE_RATE·2 = 96000 samples (comment says “1 second”; it is 2 s at 48 kHz, ${(96000/fs).toFixed(1)} s at ${fs/1000} kHz). In RLM24, <span class="mono">SS_tallies()</span> folded bit 0 of 48 <span class="mono">ss_results</span> into six push-button LED words (<span class="mono">pbdata[0…5]</span>) and raised DAI_PB20 as an alarm until acknowledged — none of that is compiled into the SLM.</p>`;
    m.querySelector('#btn').innerHTML = `<table class="kv"><tr><th>Operator does</th><th>Firmware path (v102)</th><th>Result</th></tr>
      <tr><td>CAL0 (SW1)</td><td class="mono small">DAI_PB01 → FLAG10 → flag_reg 0x00100000 → calx</td><td class="small">−20 / −18 / −16 / −14 dBFS = 0 VU</td></tr>
      <tr><td>CAL1 (SW2)</td><td class="mono small">DAI_PB02 → FLAG11 → flag_reg 0x00400000 → calx</td><td class="small">calx 0 / 4 / 8 / 12 half-dB steps</td></tr>
      <tr><td>BS0 (SW3)</td><td class="mono small">DAI_PB03 → FLAG12 → testppm → wspace[2]</td><td class="small">PPM decay 1.5 s (OFF) / 3.0 s (ON) per 24 dB at 48 kHz</td></tr>
      <tr><td>BS1 (SW4)</td><td class="mono small">DAI_PB04 → FLAG13 → peak-hold block</td><td class="small">ON: no hold. OFF: GP_TIMER2/3 = 3000 ticks</td></tr>
      <tr><td>Plug / unplug</td><td class="mono small">CS8416 RERR → cs8416_ctl_data_in[17] & 0x10 → refresh()</td><td class="small">blank bars, lock1 ↔ lock2</td></tr>
      <tr><td>Change sample rate</td><td class="mono small">nothing (SPORT0 slave just interrupts faster)</td><td class="small">ballistics scale with fs</td></tr></table>
      <p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none yet — use the Simulator or Tutorial tab'}</b></p>`;
    m.querySelector('#files').innerHTML = `<table class="kv"><tr><th>Built into SLM1-1.ldr</th><td class="mono small">backgnd.c · configdai.c · cs8416_ctl_dat.c · get_parms.c (body commented out) · math.asm · phasemeter.asm · sample.c · slm1_vu_data.c · SSensor.asm (linked, never called) · timer.c · vumeter.asm</td></tr>
      <tr><th>In the folder, not built</th><td class="mono small">shifter.asm (RLM24 bit-bang on FLG1/FLG2/FLG3, reads push-buttons on FLG13/14) · refresh.c (RLM24 1:8 mux: shifter(160,0,0) …) · SS_tallies.c · spi.c · rlm24_proc.c · rlm24_vu_data.c · shell262.dpj / rlm24.mak</td></tr>
      <tr><th>Display path that ships</th><td class="small">refresh() in backgnd.c writes display_data_A/B/C; SPORT4/5 DMA does the shifting in hardware. The bit-banged “shifter” of the SLM era is the 2002 ADSP-21065L <span class="mono">shift_led_data</span> (FLG4–7), switch Engine to see it on the timeline.</td></tr></table>`;
  };
  SIM.on('time', draw);
}

/* ---------------- Findings ---------------- */
function viewNotes(m){
  window.__slmKeys = false;
  const v = 'slm1-5…/v102/', g = 'sharc/slm-1-v1.02/';
  m.innerHTML = card('What the SLM DSP code is up to — findings from the source', `
  <ol>
    <li><b>At 96 kHz the v102 meter runs twice as fast.</b> All ballistics are per-sample constants (<span class="mono">TCONST_VU</span>, <span class="mono">TCONST_PPM_ATTACK</span> in ${v}vumeter.asm; <span class="mono">peak_decay_*_48</span> in backgnd.c) and nothing re-computes them for the sample rate. The 2002 engine did: <span class="mono">sample_rate_calc</span> (${g}slm-1-main.asm) measures the EMUCLK difference between interrupts (301 / 598 / 647 counts) and loads <span class="mono">update_meter_parameters_96/48/441/32</span>. The manual promises 30–96 kHz.</li>
    <li><b>The “3 second” peak hold is probably about 1 second.</b> <span class="mono">SetTimer(GP_TIMER2,3000)</span> counts timer ticks of <span class="mono">TIMER_RATE 100000/2</span> core cycles, commented “1 msec rate based on 100MHZ system freq” (50 000 cycles is 0.5 ms at 100 MHz). The board has a 24.576 MHz crystal and v102 leaves the PLL alone; at the default ×6 (147.456 MHz) the SPORT2 divider gives exactly the commented “100 Hz FS” — and the tick becomes 0.339 ms, the hold 1.02 s and the display mux 3.4 ms ${inf}. With a true 1 ms tick each bar would refresh at only 50 Hz and flicker. Switch “GP tick” to compare.</li>
    <li><b>The peak-hold dot vanishes when the programme drops below −5.</b> In <span class="mono">refresh()</span> the hold bits are masked with <span class="mono">0xffffffc0</span> (only show holds above nominal, as the manual says) — which also clears bit 0, the MM5450 <b>start bit</b>. When the VU and PPM both sit below −5, <span class="mono">slm_4_vu_data1</span> and <span class="mono">slm_4_pk_data1</span> are <span class="mono">vu_off</span>, so <span class="mono">display_data_A[0]</span> holds only the hold bit and no start bit. U3 never latches, and keeps the blank from 2 ticks earlier ${inf} (MM5450 datasheet behaviour). Try: burst at −10 dBFS, hold on, and watch the dot after the burst.</li>
    <li><b>The manual's “Peak LED: instantaneous peaks above −3 dB for 3 s” only exists in the 2002 code.</b> ${g}slm-1-main.asm <span class="mono">test_peaks_left_1/right_1</span> compares |sample| with <span class="mono">pk_thresh 0.707</span> and holds for <span class="mono">pk_hold 200000</span> samples — 4.17 s at 48 kHz, 2.08 s at 96 kHz, 6.25 s at 32 kHz. v102 has no such test; the red LEDs beside “0” are driven by the same <span class="mono">vu_pr</span> bits as PR, i.e. “signal present” ${inf}.</li>
    <li><b>A flags bug in the 2002 peak hold.</b> In <span class="mono">sport0_isr</span>, after <span class="mono">call ppm_hold_l; call ppm_hold_r</span> the code falls into <span class="mono">bs1_is_off0: if ne jump bs1_is_off1</span>, meant for the BS1 test. The ALU flags now come from the end of <span class="mono">ppm_hold_r</span>, so when the <i>right</i> hold expires (or equals the peak) both <span class="mono">ppm_hold_left</span> and <span class="mono">ppm_hold_right</span> are reset to 255. The left hold dot drops early. Modelled in the comparison engine.</li>
    <li><b>The two generations disagree by 6 dB on the PPM dot.</b> On a steady sine, v102 shows the PPM dot 3 dB <i>above</i> the VU bar (the <span class="mono">slm_4_pk_data*</span> tables are shifted 6 indexes louder — right for a sine's peak). The 2002 code looks up <span class="mono">pk_data_n[pk + 6]</span> in tables with the same scale as the VU tables, so its dot sits 3 dB <i>below</i> the bar.</li>
    <li><b>“VU” is an RMS meter.</b> <span class="mono">VUMeterCalc</span> averages x² (mean square), not a rectified average like a moving-coil VU; on a sine the two agree after calibration (the “3 dB correction” <span class="mono">meter_cal = −6</span>). v102 keeps <span class="mono">VUMeterInit</span>'s <span class="mono">TCONST_VU 0.000319752</span> (24 dB fall in 0.36 s; the 2002 code overrode it with 0.0003836906 = “vu=300mS/24db”).</li>
    <li><b>A calibration factor that hits both meters.</b> v102 <span class="mono">VUMeterGet</span> multiplies by <span class="mono">0.96275853891</span> (−0.16 dB) “adjust vu data to match ppm calibrate to vu, DSB Feb20,2006”; the branch that would skip it for PPM (<span class="mono">// if eq jump ppmget</span>) is commented out, so PPM is scaled too.</li>
    <li><b>Comments vs numbers on PPM decay.</b> <span class="mono">peak_decay_1_48 0.0000767499 //type1(1 second)</span> is really 1.5 s per 24 dB (manual Type 1); the 2002 file names the same constant <span class="mono">peak_decay_2_48</span>. Both pick Type 2 (3 s) when BS0 is ON, matching the manual.</li>
    <li><b>Tables bigger than their arrays.</b> ${v}slm1_vu_data.c declares <span class="mono">slm_4_vu_data1[267]</span> etc. but gives 273–282 values (“was 123”). The link log (3 Jun 2007|40 07:10, seven minutes after the file was saved) shows it built. With both CAL switches OFF, <span class="mono">VUMeterGet</span> 255 + calx 12 = index 267 — one past the declared end ${inf}.</li>
    <li><b>The silence sensor is linked but never runs.</b> <span class="mono">SSensor.asm</span> is in slm1-1.dpj, but <span class="mono">SSensorInit</span>/<span class="mono">SSensorCalc</span> (sample.c) and <span class="mono">SSensorGet</span> (backgnd.c) are commented out. Its <span class="mono">DEFAULT_DET_TIME SAMPLE_RATE*2 // 1 second</span> is 2 s. <span class="mono">SS_tallies.c</span>, <span class="mono">spi.c</span>, <span class="mono">refresh.c</span>, <span class="mono">shifter.asm</span> and <span class="mono">rlm24_proc.c</span> are RLM24 “shell262” files that are not built at all. In spi.c, <span class="mono">val&gt;&gt;1;</span> discards its result, so the sticky-alarm clear loop only ever tests bit 0.</li>
    <li><b>Phase meter: slower, and half-lit at silence.</b> <span class="mono">PHMETER_ALPHA</span> went 0.999 (21 ms) → 0.9999 (208 ms at 48 kHz). With no signal <span class="mono">PhaseMeterGet</span> returns 128, which v102 maps to ph5 — five LEDs from +1 to 0, not a blank row. A perfectly in-phase signal gives <span class="mono">trunc(1.0·128+128) = 256</span>; the 2002 table has a 257th entry “extra word get returns 256” to survive it.</li>
    <li><b>Workspace “junk” slots are a software pipeline.</b> <span class="mono">VUMeterCalc</span> stores channel n's results while computing channel n+1 (parallel instructions read the old F9/F14), so the first stores land in <span class="mono">junk1/junk2</span> — that is what <span class="mono">VUMETER_WSPACE_ADDER 5</span> is for.</li>
    <li><b>Both bars share one set of drivers.</b> Every D-net on the SLM1-4 head drives L1_n and L2_n; U6's select outputs pick the bar. v102 shows each bar for 8 of every 20 ticks after a 2-tick blank. The phase row is only sent with the left bar and LOCK/NO LOCK only with the right, so each is lit about 40 % of the time. The 2002 code sent both bars in one 36-bit frame (18 bits each) and toggled FLG8/FLG9 every 300 samples, read by a PIC (“move flg9 clear in isr to lengthen pulse for pic L/R test”) whose firmware is not in the archive.</li>
    <li><b>The 2002 LED clock is one edge per audio sample.</b> <span class="mono">shift_led_data</span> toggles FLG7 once per <span class="mono">sport0_isr</span>; 36 bits take 72 interrupts (1.5 ms at 48 kHz). A “modified june 17, 2005” 107-pass flush loop in <span class="mono">translate_meter_results</span> runs inside the interrupt every 300 samples.</li>
    <li><b>Manual vs hardware.</b> The 2003|36 and 2007|40 manuals say “41 LEDs” and show ERROR/LOCK (the 2002 head: +14 … −38); the 2014|47 .doc and the 2016|49 lens say 57 LEDs (+20 … −52) and NO LOCK/LOCK. v102A for the SLM1-6 analog board (2009|42) comments out the lock blanking — correct for an analog input, but the NO LOCK/LOCK bits are not sent at all there.</li>
    <li><b>DIPs are read once per display refresh.</b> <span class="mono">flag_reg</span> is only loaded at the end of <span class="mono">refresh()</span>, so the first passes after power-up run with flag_reg = 0 (all switches “ON”: −20 dBFS, 3 s decay, hold off) for a few ms.</li>
    <li><b>Test report.</b> SLM1A / SDM2-3-ISS1, firmware V101A, 25 Jan 2010|43: “Modified software to work with ICD3 programmer — comprehensive test not completed”. ICD3 is a Microchip PIC programmer, which fits the PIC mentioned in the 2002 comments.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>Core clock 147.456 MHz (24.576 MHz × 6 default CLK_CFG) ${inf}: it makes the commented 100 Hz CS8416 frame and a sane 200 kHz MM5450 clock (DIV4 = 183) come out right. GP tick = 50 000 cycles = 0.339 ms by default; “1 ms” is selectable.</li>
    <li>Cycle counts inside SampleIRQ and the background pass ${inf}. CS8416 status read every 90 ms (9 I²S frames for the 18-word table) ${inf}; SDOUT is zero while unlocked ${inf}.</li>
    <li>MM5450: first ‘1’ = start bit, next 35 bits latched, no ‘1’ = no change (datasheet behaviour) ${inf}. Output order follows the D-net/pin sequence in slm1-4iss1.net. D0 = PR LED, D1 = red marker beside 0, D2 spare ${inf}.</li>
    <li>LED colour zones measured on PICS/SLM1 (SLM-1M7).jpg: red +20…+9, amber +8…−7, green −8…−52. LED positions measured from that photo onto the SLM-1M7 silk.</li>
    <li>The 2002 engine on this 57-LED panel is a comparison only (its 41-LED head has no silk in the archive); its 7-LED phase reading is stretched to 9 LEDs.</li>
    <li>Rounding of <span class="mono">fix</span> = round to nearest; background values sampled every ${(1e3/4000).toFixed(2)} ms; 2 s of the same signal run before t = 0 so the meters are settled.</li>
    <li>The test source (programme, tone, burst) is ours, not part of the SLM.</li></ul>`) + card('Sources', `<ul class="small mono">
    <li>#SLM #SERIES - To Delete/SLM - #Engineering - To Delete/SLM-1/slm1-5_dsp board software/slm-1-5dsp__slm1_4led/v102/ — backgnd.c, sample.c, vumeter.asm, phasemeter.asm, SSensor.asm, slm1_vu_data.c, configdai.c, cs8416_ctl_dat.c, timer.c/.h, sysdef.h, slm1-1.dpj/.mak, Debug/linker_log.xml, shifter.asm, SS_tallies.c, spi.c, refresh.c, rlm24_proc.c</li>
    <li>…/SLM-1/slm1-6_dsp board software/v102A/ — backgnd.c, sample.c, configdai.c</li>
    <li>…/SLM-1/sharc/slm-1-v1.02/ — slm-1-main.asm, slm-1_INIT.ASM, vumeter.asm, phasemeter.asm, sdm_vu/pk/phase_data*.dat</li>
    <li>…/SLM-1/PCB/SLM-1-5/PCB/slm1-5iss3.net, SLM1-5iss3.bom · SLM-1-4/OBSOLETE/slm1-4iss1.net · SLM-1-4/SLM1-4iss2.bom · SLM-1-3/PCB/SLM1-3.bom</li>
    <li>…/SLM-1/SLM1 MANUAL mod.pdf, SLM1 MANUAL.pdf, SLM1 MANUAL .doc · SLM1 - #TESTREPORT/SLM1A-V101A-25JAN10.pdf</li>
    <li>SLM & SLM-RMK1&2 - #ARTWORK #DA #2016/SLM-1M7-SILK(CURVE).cdr, SLM-1M2-SILK(CURVE).cdr, PICS/SLM1 (SLM-1M7).jpg, SLM-1M2-75.jpg · SLM Photos/slm1.jpg</li></ul>`);
}

/* ---------------- register plugin ---------------- */
SIM.register({
  id:'slm', name:'SLM-1D · stereo loudness meter (2007|40)', duration:1,
  product:'SLM-1D (SLM series)', year:2007, family:'#SLM #SERIES',
  folder:'#SLM #SERIES - To Delete',
  summary:'Desktop VU + PPM stereo LED meter for AES audio: two 57-LED bars, sticky peak hold, 9-LED phase correlation and lock status. Modelled sample by sample: ADSP-21262 + CS8416 on the SLM1-5 board (firmware v102), three MM5450 drivers on the SLM1-4 head, with the 2002 ADSP-21065L engine for comparison.',
  highlights:['Real SLM-1M7 lens and SLM-1M2 rear silkscreens with working DIP switches','VU/PPM ballistics in slow motion, down to one 20 µs sample','Live MM5450 shift-register bit map and L/R multiplex','10-step operator tutorial from the SLM1 manual','Findings: 96 kHz runs 2× fast, ~1 s “3 s” hold, vanishing hold dot'],
  depth:'Full model',
  stepUnits:[
    {label:'1 sample (SampleIRQ)', period:()=>1/D.fs},
    {label:'1 GP-timer tick', period:()=>tick()},
    {label:'1 display mux period', period:()=> D.eng==='g1'? 300/D.fs : 10*tick()},
    {label:'1 MM5450 frame (128 bits)', period:()=>FRAME()},
    {label:'1 AES3 block (192 frames)', period:()=>192/D.fs},
    {label:'1 CS8416 poll (≈90 ms)', period:()=>C.CS_POLL},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.25,'250 ms'],[0.05,'50 ms'],[0.012,'12 ms (L+R mux)'],[0.004,'4 ms (AES block)'],[0.001,'1 ms'],[0.0002,'200 µs'],[0.00005,'50 µs (2 samples)'],[0.00001,'10 µs (inside one ISR)']],
  defaultZoom:0,
  init(){ SN_KEY=''; window.__slmKeys = false; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the SLM-1D', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewAnatomy},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
