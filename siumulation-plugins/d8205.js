/* =====================================================================
   D8205 — Adjustable-gain AES distribution amplifier with SRC (Ward-Beck Systems, 8200 series)
   Plugin for the WBS Device Simulator (../siumulation.html)

   The shipped card (manual 2001–2003|34–36) runs the shared D820x firmware built with #define D8205.
   The D8205 folder itself holds the 1999|32 standalone original. Both are used here.

   Sources (all in this archive):
   - #MF8200 #SERIES/D8205 - #Master #MF82/D8205 - #Engineering/D8205.pdf (manual: H1–H16, LEDs, specs)
   - …/D8205-055 Amendment.doc · D8200 - #Engineering #MF82/Appendix D8205-043.doc (custom builds)
   - D8200 - #Engineering #MF82/d8200 - #d820x/jumpers.txt (D8205 V1.00 jumper and LED table)
   - …/d820x/pic/v1.104/d820x.h, d820x.asm, d820xswr.asm, d820xad.asm, d820xini.asm, d820xchs.asm, d820xspi.asm
   - …/d820x/sharc/d820xcore.asm, d820xdef.h (sample_proc_D8205, jumpers_analize_D8205, ctrl_proc)
   - …/d820x/altera/d8200_top.rpt (PIC_CLK, SHARC_CLK, JACK_OUT, OUTPUT1/2 equations)
   - D8200 - #Engineering #MF82/d8200 - #PCB/d8200-2.net + d8200 - #GERBERS/D8200-2.TOP/.SLK (board art, nets)
   - 8200 Series Rear Module options graphical Guides…/D8205 - rear module options.pdf (BNC1, BNC3, TB8205P, TB8205P/75)
   - D8205 - #Engineering/D8205R-75-2.cdr (D8205/R terminal art, converted with Inkscape)
   - D8205 - #SOFTWARE/D8205 - #pic #SOFTWARE/d8205.asm (1999 V1.00), D8205 - #SHARC #SOFTWARE/*.asm, 8205CORE.MAP/.21K,
     D8205 - #lookuptb #SOFTWARE/lookup.C, aa, vol_lktb.ldb · D8205 - #BAK/D8205.NET, D8205.bom (1999 board)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const card = (t,b,cls)=>`<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`;
const ASSET = 'siumulation-plugins/assets/';
const hx = (v,n)=> (v>>>0).toString(16).toUpperCase().padStart(n||2,'0');
const bin = (v,n)=> (v>>>0).toString(2).padStart(n||8,'0');

/* ---------------- constants from the source ---------------- */
const OSC = 24.576e6;                 // OSC2 24.576MHZ → CPLD pin 90 (input_clk)
const PIC_F = OSC/4;                  // d8200_top.rpt: _LC099 = TFF(input_clk) → PIC_CLK = TFF(!_LC099) → 6.144 MHz
const TCY = 4/PIC_F;                  // 0.651 µs per PIC instruction
const SHARC_F = OSC;                  // SHARC_CLK = LCELL(!input_clk) → 24.576 MHz
const PASS = 1.33e-3;                 // INFERRED main-loop pass (≈78 SPI bytes + ≈500 Tcy); cross-check: hysteresis "about 4 second"
const DEBOUNCE_N = 0x1f;              // BCOUNT_NUM
const AESON_N = 0x55;                 // AES_OUTPUT_CONTROL_NUM (85 passes)
const SHARC_TMO = 256;                // SHARC_TIMEOUT_NUM1 = 0x00, NUM2 = 0x01 → 256 passes → WHOLE_RESET
const AD_PASSES = 3;                  // AtoD: setup / start / results → 3 passes per conversion, 4 pots round-robin
const LOCK_ACQ = 0.02;                // CS8420 PLL acquire after plugging in — INFERRED
const UNLOCK_T = 0.0005;              // CS8420 flags UNLOCK within a few frames — INFERRED
const SHARC_BOOT = 0.06;              // ADSP-21061 boot from the 27C512 (U2) — INFERRED
const TRM = i=>Math.pow(10,(i-128)*15/20/128);              // lookup.C trim table → D8205_trm.dat (−15 … +14.9 dB)
const VOL = i=>(Math.pow(10,12/20)/256)*i;                  // lookup.C active loop → D8205_vol.dat (silence … +11.97 dB)
const dB = g=> g<=1e-9? -Infinity : 20*Math.log10(g);
const fmtdB = v=> v===-Infinity? '−∞' : (v>=0?'+':'−')+Math.abs(v).toFixed(1);
const TT_ATT = {0:0.1, 1:Math.pow(10,-18/20)};              // att_20dB / att_18dB — values not in archive, INFERRED from the names
const FS_LIST = [32000,44100,48000,88200,96000];

/* main-loop steps (d820x.asm main) with an estimated share of the pass (INFERRED from SPI byte counts) */
const STEPS = [
  ['AtoD_data_preparing · AtoD', .04, 'One step of the 3-pass A/D cycle; 4 pots round-robin; Average (4) then Hysterisis'],
  ['Link_to_SHARC', .02, 'Next control nibble: TO_ALTERA3 = sharc_adr_xmit<<4 | nibble'],
  ['Link_to_ALTERA', .12, '4 addressed SPI exchanges: TO_ALTERA0..3 out, FROM_ALTERA0..3 (jumpers, SHARC reply) in'],
  ['SHARC_link_control', .01, 'FROM_ALTERA3 == 0xE4? Otherwise count toward WHOLE_RESET (256 passes)'],
  ['jmp_input', .13, '14 jumpers → input_reg1/2; read CS8420 reg 16 (Receiver Error) of CH1 and CH2 → lock'],
  ['debounce', .02, '31 identical passes, then MODE1/MODE2 = input_reg, MODE_change_analize'],
  ['REFRESH_RUN_STOP', .005, 'v1.104: the whole body is commented out'],
  ['switch_8420_modes', .025, 'jmp_mode handler: keep the chosen reference or fall back'],
  ['channel_status_proc', .08, 'One of 8 channel-status steps (read CH1, read CH2, route, insert fs, write)'],
  ['LED_processing', .02, 'AUDIO1 = CH2 lock · AUDIO2 = CH1 lock · PROC = internal mode · ERR = an input unlocked'],
  ['flush8420reg', .52, 'Rewrite 9 registers in each CS8420 = 18 SPI writes (54 bytes), every pass'],
  ['AES_output_control', .015, 'Count 85 passes after a mode change, then clear TXOFF'],
];
const STEP_FRAC = (()=>{ let a=0; return STEPS.map(s=>{ const r=a; a+=s[1]; return r; }); })();
const SPI_STEPS = {2:8, 4:8, 8:4, 10:54};       // SPI bytes per step (bursts drawn on the bus lane)

/* jumpers: manual names and meanings. ON = shunt fitted = bit 0 (the manual's defaults match the code's 0-values) */
const JINFO = [
  null,
  {n:'H1', g:'SRC (CLK1)'}, {n:'H2', g:'SRC (CLK0)'},
  {n:'H3', g:'Pot mode', on:'individual L / R pots', off:'one pot per input (RV1 → In 1, RV2 → In 2)'},
  {n:'H4', g:'Remote gain', on:'disabled', off:'enabled (D8205/R)'},
  {n:'H5', g:'Resolution', on:'24 bit', off:'20 bit'},
  {n:'H6', g:'Input 2 mode', on:'stereo', off:'mono (A+B)/2'},
  {n:'H7', g:'Input 1 mode', on:'stereo', off:'mono (A+B)/2'},
  {n:'H8', g:'Tone level', on:'−20 dBFS', off:'−18 dBFS'},
  {n:'H9', g:'Output 2 source (1)'}, {n:'H10', g:'Output 2 source (0)'},
  {n:'H11', g:'Output 1 source (1)'}, {n:'H12', g:'Output 1 source (0)'},
  {n:'H13', g:'Level action', on:'trim ±15 dB', off:'volume silence … +12 dB'},
  {n:'H14', g:'Monitor jack', on:'Output 1', off:'Output 2'},
];
const DEF_J = [null,'OFF','ON','OFF','ON','ON','ON','ON','ON','ON','ON','ON','ON','ON','ON'];   // manual defaults
const ROUTE_TXT = ['Input 2 (main audio)','Input 1 (main reference)','Mix of 1 + 2','1 kHz test tone'];
const ROUTE_CODE = ['CH1 (f0,f1) “INPUT 1” in the SHARC source','CH2 (f2,f3) “INPUT 2”','f0+f2, f1+f3 “MIXED”','formed_tone_sampl “TEST TONE”'];
const SRC_TXT = {0:'internal 48 kHz (both inputs through SRC)',3:'lock to Input 2; Input 1 through SRC',4:'lock to Input 1; Input 2 through SRC',5:'Input 2 clock, no SRC'};
const MODE_TXT = {0:'REAL_MODE_0 internal 48 kHz',3:'REAL_MODE_3 fs from CH1, CH2 with SRC',4:'REAL_MODE_4 fs from CH2, CH1 with SRC',
  5:'REAL_MODE_5 fs from CH1, CH2 without SRC',6:'REAL_MODE_6 fs from CH2, CH1 without SRC',15:'REAL_MODE_f startup: internal 48 kHz, PLLs on the serial port'};
const MODE_REGS = {   // set_MODE_x (d820xswr.asm): CH1 reg3, reg4, CH2 reg3, reg4, TO_ALTERA2, TO_ALTERA1, TO_ALTERA0
  0:[0x09,0x01,0x09,0x01,0x02,0x44,0x00,'intrn 12 MHz → OMCK1, OMCK2, CNT1, CNT2'],
  3:[0x0C,0x01,0x09,0x01,0x02,0x44,0x55,'RMCK1 → CNT1, CNT2, OMCK1, OMCK2'],
  4:[0x09,0x01,0x0C,0x01,0x02,0x44,0xAA,'RMCK2 → CNT1, CNT2, OMCK1, OMCK2'],
  5:[0x0C,0x01,0x0C,0x01,0x02,0x44,0x55,'RMCK1 → CNT1, CNT2, OMCK1, OMCK2'],
  6:[0x0C,0x01,0x0C,0x01,0x02,0x44,0xAA,'RMCK2 → CNT1, CNT2, OMCK1, OMCK2'],
  15:[0x0A,0x04,0x0A,0x04,0x02,0x44,0x00,'intrn 12 MHz; CS8420 PLLs locked to the serial port'],
};

/* ---------------- device state ---------------- */
function freshCfg(){ return {
  in1:{on:true, fs:48000, lvl:-20, fa:440, fb:880},     // Input 1 = main reference = CH2 = U5 (T2, U10, TERM1, H16)
  in2:{on:true, fs:44100, lvl:-20, fa:1000, fb:400},    // Input 2 = main audio     = CH1 = U6 (T8, U11, TERM2)
  frame:{on:true},                                      // MF82REF frame reference (H16 = local)
  J: DEF_J.slice(),
  h16:'ext', term1:'110', term2:'110',
  pot:[128,128], rem:[200,200],                         // RV1, RV2 (5K MULTI); remote L, R (10K linear, D8205/R)
  variant:'75', remote:false, rear:'bnc1', power:true,
}; }
const D = { cfg:freshCfg(), evt:null, cold:false, log:[], lastTrace:[] };
const clone = o=>JSON.parse(JSON.stringify(o));
const jb = (c,i)=> c.J[i]==='OFF'?1:0;

/* ---------------- derived steady state of a configuration (the firmware's view once everything settled) ---------------- */
function derive(c){
  const in1p = c.h16==='ext'? c.in1.on : c.frame.on;               // H16: rear REF input or MF82REF frame bus
  const fs1 = c.h16==='ext'? c.in1.fs : 48000;
  const lk2 = c.power && in1p, lk1 = c.power && c.in2.on;           // CH2_8420_LOCKED (MODE1,6), CH1_8420_LOCKED (MODE1,7)
  const jmp = {0:0,1:3,2:4,3:5}[(jb(c,1)<<1)|jb(c,2)];              // MODE_change_analize: MODE1 bits 3,2
  let mode;
  if (!lk1 && !lk2) mode = 0;                                        // both unlocked → set_MODE_0
  else if (jmp===0) mode = 0;
  else if (jmp===3) mode = lk1? 3 : 6;
  else if (jmp===4) mode = lk2? 4 : 5;
  else mode = lk1? 5 : 6;
  const fsOut = mode===0? 48000 : (mode===3||mode===5)? c.in2.fs : fs1;
  const r1 = (jb(c,11)<<1)|jb(c,12), r2 = (jb(c,9)<<1)|jb(c,10);
  const tx1off = (!lk1 && !lk2 && r1!==3) || (mode===4 && !lk1);    // shut_off_AES_output_CH1; set_MODE_4 TXOFF when CH1 unlocked
  const tx2req = (!lk1 && !lk2 && r2!==3);                          // shut_off_AES_output_CH2 (overwritten by the TESTING line)
  const src1 = mode===0 || mode===4, src2 = mode===0 || mode===3;   // which inputs pass through their SRC
  const slip1 = lk1 && !src1 && c.in2.fs!==fsOut, slip2 = lk2 && !src2 && fs1!==fsOut;
  const MODE1 = (lk1<<7)|(lk2<<6)|(jb(c,13)<<4)|(jb(c,1)<<3)|(jb(c,2)<<2)|(jb(c,3)<<1)|jb(c,4);
  const MODE2 = (jb(c,5)<<7)|(jb(c,6)<<6)|(jb(c,7)<<5)|(jb(c,8)<<4)|(jb(c,9)<<3)|(jb(c,10)<<2)|(jb(c,11)<<1)|jb(c,12);
  return { lk1, lk2, in1p, fs1, jmp, mode, fsOut, r1, r2, tx1off, tx2req, src1, src2, slip1, slip2, MODE1, MODE2,
    leds:{a1:lk2, a2:lk1, proc: mode<=2, err: !lk1 || !lk2} };
}
/* remote codes: only a D8205/R has the wipers on P1-19/P1-21 */
function remCodes(c){ return c.remote? c.rem.slice() : [0,0]; }
/* sample_proc_D8205 level preparation: f6,f7 (CH1) and f8,f9 (CH2) */
function gains(c, codes){
  const code = codes || {c1:c.pot[0], c2:c.pot[1], c3:remCodes(c)[0], c4:remCodes(c)[1]};
  const vol = jb(c,13), remote = jb(c,4), caseN = (remote<<1)|vol;
  let f6=1, f7=1, f8, f9;
  if (caseN===2){ f6=TRM(code.c3); f7=TRM(code.c4); }
  if (caseN===3){ f6=VOL(code.c3); f7=VOL(code.c4); }
  if (caseN===1){ f8=VOL(code.c1); f9=VOL(code.c2); } else { f8=TRM(code.c1); f9=TRM(code.c2); }
  let g1L, g1R, g2L, g2R;
  if (!jb(c,3)){ g1L=f8*f6; g1R=f9*f7; g2L=g1L; g2R=g1R; }          // “stereo control”: pot 1 = A of both inputs, pot 2 = B
  else { g2L=g2R=f8*f6; g1L=g1R=f9*f7; }                              // “mono control”: RV1 → CH2 (Input 1), RV2 → CH1 (Input 2)
  return { caseN, g1L, g1R, g2L, g2R, code };
}

/* ---------------- time model: the last event and the firmware's reaction to it ---------------- */
const passIdx = t=>Math.floor(t/PASS);
const passAt = (i,step)=> i*PASS + (step? STEP_FRAC[step]*PASS : 0);
function frameEnd(t){ const i=passIdx(t); return passAt(Math.ceil((i+1)/16)*16); }      // next complete 16-nibble control frame
/* which kind of reaction each config change needs */
function evtTimes(E){
  if (!E) return null;
  const k = E.kind, t0 = E.t;
  if (k==='boot'){
    const tAns = t0 + SHARC_BOOT + 16/48000 + 16*PASS + 0x1fff*7/SHARC_F;
    const tRun = tAns + 3*1536*TCY;
    return { tAns, tRun, tOn: tRun + AESON_N*PASS, tS: tRun + 16*PASS };
  }
  if (k==='lock'){
    const before = derive(E.prev), after = derive(D.cfg);
    const gaining = (after.lk1 && !before.lk1) || (after.lk2 && !before.lk2);
    const tSeen = t0 + (gaining? LOCK_ACQ : UNLOCK_T);
    const tM = passAt(passIdx(tSeen) + 1 + DEBOUNCE_N, 7);            // debounce done → MODE1 → switch_8420_modes
    const modeChange = before.mode !== after.mode;
    return { tSeen, tM, tS: frameEnd(tM), tOn: modeChange? tM + AESON_N*PASS : null, modeChange };
  }
  if (k==='jumper'){
    const tM = passAt(passIdx(t0) + 1 + DEBOUNCE_N, 5);
    return { tM, tS: frameEnd(tM) };
  }
  if (k==='pot'){ const st=[]; for (let n=1;n<=4;n++) st.push(passAt(passIdx(t0) + n*4*AD_PASSES) + 8*PASS); return { steps: st }; }
  return { tM: t0, tS: t0 };
}
/* the state the card is in at time t */
function stateAt(t){
  const E = D.evt, c = D.cfg;
  if (!c.power) return { off:true, cfg:c, d:derive(c), leds:{a1:0,a2:0,proc:0,err:0}, tx1:false, tx2:false, stage:'Power off' };
  if (!E || t < E.t){
    const pc = E? E.prev : c;
    if (E && E.kind==='boot') return { off:true, cfg:pc, d:derive(pc), leds:{a1:0,a2:0,proc:0,err:0}, tx1:false, tx2:false, stage:'Power off (switched on at '+SIM.fmtT(E.t)+')' };
    const d = derive(pc); return { cfg:pc, d, sh:pc, leds:d.leds, tx1:!d.tx1off, tx2:true, stage: E?'before the change':'steady' };
  }
  const T = evtTimes(E);
  if (E.kind==='boot'){
    const d = derive(c);
    if (t < T.tAns) return { cfg:c, d:Object.assign({}, d, {mode:15, fsOut:48000}), init:true, leds:{a1:1,a2:1,proc:1,err:1}, tx1:false, tx2:false, sh:null,
      stage: t < E.t + SHARC_BOOT ? 'init: SHARC booting from the 27C512, PIC loops with SHARC_IN_INIT' : 'SHARC_IN_INIT: waiting for 0xE4 from the SHARC' };
    if (t < T.tRun) return { cfg:c, d:Object.assign({}, d, {mode:15, fsOut:48000}), init:true, leds:{a1:0,a2:0,proc:0,err:0}, tx1:false, tx2:false, sh:null, stage:'SHARC answered: LEDs off, 3 × delay' };
    return { cfg:c, d, sh: t>=T.tS? c : null, leds:d.leds, tx1: t>=T.tOn && !d.tx1off, tx2: true, stage: t<T.tOn? 'init_modes_after_SHARC_respond: outputs held off (85 passes)' : 'running' };
  }
  if (E.kind==='lock'){
    const before = derive(E.prev), d = derive(c);
    const inSig = { in1: t>=T.tSeen? c : E.prev };                       // the receivers see the change first
    if (t < T.tM){
      return { cfg:c, d:before, sigCfg:inSig.in1, sh:E.prev, leds:before.leds, tx1:!before.tx1off, tx2:true,
        stage: t < T.tSeen ? 'CS8420 still '+(derive(c).lk1>before.lk1||derive(c).lk2>before.lk2?'acquiring lock':'flagging UNLOCK') : 'debounce: lock bit stable for 31 passes before MODE1 changes' };
    }
    const muted = T.tOn && t < T.tOn;
    return { cfg:c, d, sh: t>=T.tS? c : E.prev, leds:d.leds, tx1: !d.tx1off && !muted, tx2:true, tx2held: muted,
      stage: muted? 'swm_end: shut_off_AES_output_CH1/CH2, counting 85 passes' : t < T.tS? 'MODE1 updated; SHARC still on the old jumper word' : 'settled' };
  }
  if (E.kind==='jumper'){
    if (t < T.tM){ const d=derive(E.prev); return { cfg:c, d, sh:E.prev, leds:d.leds, tx1:!d.tx1off, tx2:true, stage:'debounce: jumper must read the same for 31 passes' }; }
    const d = derive(c);
    return { cfg:c, d, sh: t>=T.tS? c : E.prev, leds:d.leds, tx1:!d.tx1off, tx2:true, stage: t<T.tS? 'MODE2 updated; SHARC gets it in the next MODE nibbles' : 'settled' };
  }
  if (E.kind==='pot'){
    const d = derive(c); const o = E.prev.pot, n = c.pot, oR = remCodes(E.prev), nR = remCodes(c);
    let k=0; T.steps.forEach(s=>{ if (t>=s) k++; });
    const mix = (a,b)=> Math.round(a + (b-a)*k/4);
    const codes = {c1:mix(o[0],n[0]), c2:mix(o[1],n[1]), c3:mix(oR[0],nR[0]), c4:mix(oR[1],nR[1])};
    return { cfg:c, d, sh:c, codes, leds:d.leds, tx1:!d.tx1off, tx2:true, stage: k<4? `Average: ${k}/4 new conversions in the code` : 'settled' };
  }
  const d = derive(c); return { cfg:c, d, sh:c, leds:d.leds, tx1:!d.tx1off, tx2:true, stage:'settled' };
}

/* ---------------- audio at time t ---------------- */
function inSample(inp, side, n, fsOut){
  const a = Math.pow(10, inp.lvl/20), f = side? inp.fb : inp.fa;
  return a*Math.sin(2*Math.PI*f*n/fsOut);
}
function outSample(k, side, t, S){
  S = S || stateAt(t);
  if (S.off || S.init) return null;
  if ((k===0 && !S.tx1) || (k===1 && !S.tx2)) return null;                 // transmitter off: no carrier
  const c = S.cfg, d = S.d, sh = S.sh || c, shd = derive(sh), fs = d.fsOut;
  const n = Math.floor(t*fs);
  const sig = S.sigCfg || c;
  const in1on = (sig.h16==='ext'? sig.in1.on : sig.frame.on) && shd.lk2, in2on = sig.in2.on && shd.lk1;
  let x1L = in2on? inSample(sig.in2,0,n,fs):0, x1R = in2on? inSample(sig.in2,1,n,fs):0;     // CH1 = Input 2
  let x2L = in1on? inSample(sig.in1,0,n,fs):0, x2R = in1on? inSample(sig.in1,1,n,fs):0;     // CH2 = Input 1
  if (jb(sh,6)){ const m=(x1L+x1R)*0.5; x1L=x1R=m; }                       // CH1_mono_flag (JMP 6 → Input 2)
  if (jb(sh,7)){ const m=(x2L+x2R)*0.5; x2L=x2R=m; }                       // CH2_mono_flag (JMP 7 → Input 1)
  const g = gains(sh, S.codes);
  x1L*=g.g1L; x1R*=g.g1R; x2L*=g.g2L; x2R*=g.g2R;
  const r = k===0? ((jb(sh,11)<<1)|jb(sh,12)) : ((jb(sh,9)<<1)|jb(sh,10));
  let v;
  if (r===0) v = side? x1R : x1L;
  else if (r===1) v = side? x2R : x2L;
  else if (r===2) v = side? x1R+x2R : x1L+x2L;
  else { const ph = (tonePhase0(t, S)); v = TT_ATT[jb(sh,8)] * Math.sin(Math.PI*((n-ph)*1000/24000)); }
  v = Math.max(-1, Math.min(1, v));                                         // ALUSAT: fix saturates
  if (jb(sh,5)) v = Math.round(v*524288)/524288;                            // 20-bit: shift 12 instead of 8
  return v;
}
function tonePhase0(t, S){   // jumpers_analize_D8205 clears tt_cnt whenever the jumper word changes
  const E = D.evt; const fs = S.d.fsOut;
  if (E && (E.kind==='jumper'||E.kind==='lock'||E.kind==='boot')){ const T=evtTimes(E); if (T.tS!=null && t>=T.tS) return Math.floor(T.tS*fs); }
  return 0;
}
function peakOf(k, side, t){
  const S = stateAt(t); let pk = 0, any=false;
  const fs = S.d.fsOut || 48000;
  for (let i=0;i<220;i++){ const v = outSample(k, side, t - i/fs*1.1, S); if (v!==null){ any=true; pk = Math.max(pk, Math.abs(v)); } }
  return any? (pk>0? 20*Math.log10(pk) : -Infinity) : null;
}

/* ---------------- user actions (what the hardware and firmware do) ---------------- */
function act(name, fn){
  D.lastTrace = []; const tr = s=>D.lastTrace.push(s);
  fn(tr);
  D.log.unshift({ t:SIM.t, name, trace:D.lastTrace.slice() }); if (D.log.length>60) D.log.length=60;
  SIM.refresh();
}
function change(kind, mut){ const prev = clone(D.cfg); mut(D.cfg); D.evt = { t:SIM.t, kind, prev }; }
const A = {
  jumper(i){ const J=JINFO[i]; act(`Move ${J.n} (${J.g}) to ${D.cfg.J[i]==='ON'?'OFF':'ON'}`, tr=>{
    change('jumper', c=>{ c.J[i] = c.J[i]==='ON'?'OFF':'ON'; });
    const v = jb(D.cfg,i); const T = evtTimes(D.evt);
    if (i===14){ tr(`H14 (net NET00005 → EPM7128 pin 37, “s13”) goes straight to the CPLD: JACK_OUT = AUD_OUT2 & s13 # AUD_OUT1 & !s13`);
      tr(`The PIC never reads JMP 14. The monitor jack now carries Output ${v?2:1} at once (no debounce).`); D.evt=null; return; }
    const where = i<=4||i===13 ? `input_reg1 bit ${({1:3,2:2,3:1,4:0,13:4})[i]} (MODE1)` : `input_reg2 bit ${({5:7,6:6,7:5,8:4,9:3,10:2,11:1,12:0})[i]} (MODE2)`;
    tr(`${J.n} pin 2 → EPM7128 s${i-1}; Link_to_ALTERA reads it back in FROM_ALTERA0/1 → jmp_input sets ${where} = ${v}`);
    tr(`debounce: input_reg ≠ MODE → DEBOUNCE_ON, bcount = BCOUNT_NUM (31). After 31 identical passes (≈${(DEBOUNCE_N*PASS*1e3).toFixed(0)} ms) MODE${i<=4||i===13?1:2} = input_reg, MODE_XOR marks the bit`);
    if (i===1||i===2){ const d=derive(D.cfg); tr(`MODE_change_analize: MODE_XOR1 & 0x0C ≠ 0 → MODE1 bits 3,2 = ${(jb(D.cfg,1))}${jb(D.cfg,2)} → set_MODE_${d.jmp} (${MODE_TXT[d.jmp]}); jmp_mode = real_mode`);
      tr(`No TXOFF here: set_MODE_x only rewrites reg 3/4 and TO_ALTERA0..2; flush8420reg sends them on the same pass`);
      if (d.mode!==d.jmp) tr(`switch_8420_modes then sees the chosen reference unlocked → falls back to ${MODE_TXT[d.mode]}`); }
    else if (i===5) tr(`MODE_change_analize: W_24bit_20bit_XOR → set_${v?20:24}bit: CS8420 reg 5/6 bits 5:4 = ${v?'01':'00'} in both chips`);
    else tr(`MODE_change_analize does nothing with this bit; it only matters to the SHARC`);
    tr(`Link_to_SHARC sends MODE${i<=4||i===13?1:2} as nibbles ${i<=4||i===13?'4,5':'6,7'} of the 16-nibble frame; SHARC ctrl_proc rebuilds ji_input = MODE1<<8 | MODE2 at the frame end (≈${SIM.fmtT(T.tS)})`);
    tr(`jumpers_analize_D8205: ${({3:'D8205_JMP_CNTRL_STEREO_MONO (bit 9) changes how f6..f9 pair up',4:'bit 8 (remote) selects case 2/3 of the level jump table',5:'shift_left_num / shift_right_num = '+(v?'12 / −12':'8 / −8'),6:'CH1_mono_flag = '+v,7:'CH2_mono_flag = '+v,8:'tt_att = att_'+(v?'18':'20')+'dB',9:'OUT 2 routing bits 2..3',10:'OUT 2 routing bits 2..3',11:'OUT 1 routing bits 0..1',12:'OUT 1 routing bits 0..1',13:'bit 12 picks trim_lktb or vol_lktb',1:'(nothing for the SHARC: the clocking is the PIC\'s job)',2:'(nothing for the SHARC)'})[i]}; it also resets tt_cnt and calls testtone_init`);
    if (i>=9 && i<=12){ const d=derive(D.cfg); tr(`Output ${i>=11?1:2} now carries ${ROUTE_TXT[i>=11?d.r1:d.r2]} → sample_proc_D8205 case ${i>=11?d.r1:d.r2}: ${ROUTE_CODE[i>=11?d.r1:d.r2]}`); }
  }); },
  term(which){ act(`Move TERM${which} shunt`, tr=>{
    const key = which===1?'term1':'term2'; const order=['75','110','HiZ'];
    D.cfg[key] = order[(order.indexOf(D.cfg[key])+1)%3];
    tr(`${which===1?'H17 (TERM1)':'H18 (TERM2)'} → ${D.cfg[key]==='HiZ'?'no shunt (high impedance, for looping through)':D.cfg[key]+' Ω ('+(D.cfg[key]==='75'?(which===1?'R15':'R21'):(which===1?'R16':'R22'))+' across the line)'}`);
    tr(`Input ${which} (${which===1?'T2 → U10 75176 → CS8420 U5 (CH2)':'T8 → U11 75176 → CS8420 U6 (CH1)'}). Pure hardware: no firmware involved.`);
    tr(`Match it to the cable: 75 Ω for BNC/coax (D8205/75), 110 Ω for twisted pair (D8205/110), HiZ when another card terminates a looped feed.`);
  }); },
  h16(){ act('Move the H16 shunts (reference source)', tr=>{
    change('lock', c=>{ c.h16 = c.h16==='ext'?'local':'ext'; });
    tr(`H16: ${D.cfg.h16==='ext'?'pins 1–3, 2–4: rear-module REF input (P1-1/P1-2) → T2':'pins 3–5, 4–6: frame reference bus (P1-5/P1-6, MF82REF option) → T2'}`);
    tr(`CS8420 U5 (CH2) re-locks to the new source; jmp_input sees the lock bit, debounce, switch_8420_modes`);
  }); },
  plug(n){ const key = n===1?'in1':'in2'; act(`${D.cfg[key].on?'Unplug':'Plug in'} Input ${n} (${n===1?'main reference':'main audio'})`, tr=>{
    change('lock', c=>{ c[key].on = !c[key].on; });
    const T = evtTimes(D.evt), b = derive(D.evt.prev), d = derive(D.cfg);
    const ch = n===1? 'CH2 (U5)' : 'CH1 (U6)';
    if (n===1 && D.cfg.h16!=='ext') tr('H16 is set to the frame reference: the rear REF connector is not connected to anything. Nothing changes.');
    tr(`${ch}: reg 16 (Receiver Error) bit 4 UNLOCK ${D.cfg[key].on?'clears after the PLL locks (≈'+LOCK_ACQ*1e3+' ms '+inf+')':'sets'}`);
    tr(`jmp_input: ${n===1?'input_reg1 bit 6 (CH2_8420_LOCKED)':'input_reg1 bit 7 (CH1_8420_LOCKED)'} = ${n===1?+d.lk2:+d.lk1}. The lock bit goes through debounce like a jumper: MODE1 changes at ${SIM.fmtT(T.tM)}`);
    if (!d.lk1 && !d.lk2) tr(`switch_8420_modes: MODE1 & 0xC0 = 0 → both unlocked: shut_off_AES_output for outputs not set to tone, UNLOCKED_MODE, set_MODE_0`);
    else if (b.mode!==d.mode) tr(`switch_8420_modes: jmp_mode ${d.jmp} handler → ${MODE_TXT[d.mode]} → swm_end: shut_off_AES_output_CH1/CH2, flush8420reg; AES_output_control re-enables after 85 passes (${SIM.fmtT(T.tOn)})`);
    else tr(`switch_8420_modes: real_mode stays ${d.mode} (${MODE_TXT[d.mode]})`);
    if (d.mode===4 && !d.lk1) tr(`set_MODE_4 sets CH1 reg 3 bit 6 (TXOFF) because CH1 is unlocked → Output 1 is switched off whatever it is routed to (see Findings)`);
    tr(`LED_processing: AUDIO1 ${d.leds.a1?'on':'off'}, AUDIO2 ${d.leds.a2?'on':'off'}, PROC ${d.leds.proc?'on':'off'}, ERR ${d.leds.err?'on':'off'}`);
    tr(`SHARC: next frame ji_input bit ${n===1?14:15} = ${n===1?+d.lk2:+d.lk1} → jumpers_analize_D8205 points I_REG_fix_din_${n===1?'CH2':'CH1'} at ${(n===1?d.lk2:d.lk1)?'rx_buf_'+(n===1?'CH2':'CH1'):'rx_buf_silence'}`);
  }); },
  frameRef(){ act(`${D.cfg.frame.on?'Remove':'Restore'} the MF82REF frame reference`, tr=>{ change('lock', c=>{ c.frame.on=!c.frame.on; });
    tr(D.cfg.h16==='local'? 'H16 = local: CH2 (Input 1) follows the frame bus → lock change handled as above' : 'H16 = external: the frame bus is not connected; nothing happens'); }); },
  fs(n, v){ const key=n===1?'in1':'in2'; act(`Input ${n} sample rate → ${v/1000} kHz`, tr=>{ change('lock', c=>{ c[key].fs=v; });
    const d=derive(D.cfg); tr(`The CS8420 re-locks (UNLOCK briefly) · output fs = ${d.fsOut/1000} kHz in ${MODE_TXT[d.mode]}`);
    if (d.slip1||d.slip2) tr(`No SRC on ${d.slip1?'Input 2':'Input 1'} in this mode and its rate differs: samples slip (clicks) — use H1/H2 to put it through the SRC`); }); },
  level(n, v){ const key=n===1?'in1':'in2'; D.cfg[key].lvl = v; SIM.refresh(); },
  pot(i, delta){ const c=D.cfg; const nm = ['RV1','RV2','remote L','remote R'][i];
    const cur = i<2? c.pot[i] : c.rem[i-2]; const nv = Math.max(0, Math.min(255, cur+delta)); if (nv===cur) return;
    const merge = D.evt && D.evt.kind==='pot' && D.evt.which===i && Math.abs(SIM.t - D.evt.t) < 1e-9;
    const prev = merge? D.evt.prev : clone(c);
    if (i<2) c.pot[i]=nv; else c.rem[i-2]=nv;
    D.evt = { t:SIM.t, kind:'pot', prev, which:i };
    const g = gains(c), d = derive(c);
    act(`Turn ${nm} → code ${nv}`, tr=>{
      if (i>=2 && !c.remote) tr('This is not a D8205/R: P1-19/P1-21 carry output transformers T9/T10, not remote wipers. Codes read as 0 here '+inf);
      tr(`AtoD_data_preparing: ANAL_PIN${i+1} (${['AN1/RA1 ← R2 ← RV1 wiper','AN0/RA0 ← R1 ← RV2 wiper','AN2/RA2 ← R3 ← P1-19','AN4/RA5 ← R4 ← P1-21'][i]}) is converted every ${4*AD_PASSES} passes (≈${(4*AD_PASSES*PASS*1e3).toFixed(0)} ms)`);
      tr('Average: code = (4 last conversions)/4 → reaches the new value after 4 conversions; Hysterisis then holds it (±1 ignored once locked)');
      tr(`Link_to_SHARC: code${i+1} goes out as nibbles ${['8,9','a,b','c,d','e,f'][i]}; ctrl_proc → code${i+1}`);
      tr(`sample_proc_D8205 case ${g.caseN} (${['internal trim','internal volume','remote trim × internal trim','remote volume × internal trim'][g.caseN]}) → Input 2 gain ${fmtdB(dB(g.g1L))}/${fmtdB(dB(g.g1R))} dB · Input 1 gain ${fmtdB(dB(g.g2L))}/${fmtdB(dB(g.g2R))} dB`);
      if (!jb(c,3)) tr('H3 ON (individual L/R): RV1 sets channel A of both inputs, RV2 sets channel B');
    }); },
  power(){ act(D.cfg.power?'Pull the card (power off)':'Plug the card in (power on)', tr=>{
    if (D.cfg.power){ D.cfg.power=false; D.evt=null; tr('All rails gone. Outputs dead.'); return; }
    const prev = clone(D.cfg); D.cfg.power=true; D.evt = { t:SIM.t, kind:'boot', prev:Object.assign(prev,{power:false}) };
    const T = evtTimes(D.evt);
    tr('init (d820xini.asm): ports, A/D on RA0/1/2/5, delay, all four LEDs ON, RESET low then high to the CS8420s and SHARC');
    tr('preset_chips, init_modes → set_MODE_f (internal 48 kHz, CS8420 PLLs on the serial port so the SHARC tone can pass before any AES lock), shut_off both outputs, SHARC_IN_INIT = 1');
    tr(`SHARC boots from the 27C512 (U2, ${inf} ≈${SHARC_BOOT*1e3} ms), idles 16 samples, waits for a complete control frame with FRAME_CODE 0xE4 and PRODUCT_NUMBER 5 → D8205_beg; replies 0xE4`);
    tr(`SHARC_link_control sees 0xE4 at ≈${SIM.fmtT(T.tAns)}: LEDs off, 3 × delay, init_modes_after_SHARC_respond (MODE_XOR = 0xFF → MODE_change_analize)`);
    tr(`AES_output_control turns the outputs on 85 passes later (≈${SIM.fmtT(T.tOn)})`);
  }); },
  rear(v){ act('Rear module → '+({bnc1:'BNC1',bnc3:'BNC3 (MF8210 only)',tb8205p:'TB8205P',tb8205p75:'TB8205P/75'})[v], tr=>{ D.cfg.rear=v; D.cfg.variant = v.startsWith('bnc')? '75' : '110';
    tr(`D8205 - rear module options.pdf: ${v.startsWith('bnc')?'D8205/75 card':'D8205/110 card'}. ${v==='bnc3'?'Input loop on the REF BNCs; outputs 1-1, 1-2, 2-1 … 2-5':v==='bnc1'?'Single REF BNC, 2 copies of Output 1, 3 of Output 2':'Pluggable screw terminals; REF loop on TB8205P'}`); }); },
  remote(){ act(D.cfg.remote?'Make it a plain D8205':'Make it a D8205/R (remote gain)', tr=>{ change('pot', c=>{ c.remote=!c.remote; });
    tr(D.cfg.remote? 'D8205/R: P1-19 / P1-21 carry the remote 10K pot wipers (D8205R-75-2.cdr: +5V, WIPER, GND for L and R) → R3/R4 1K → RA2/RA5' : 'Standard: P1-19 / P1-21 are output transformers T9/T10 (DIGITAL OUT 2-4, 2-5)');
    tr('Set H4 OFF to let the SHARC use them (case 2/3 of the level table)'); }); },
  reset(){ act('Factory defaults', tr=>{ D.cfg = freshCfg(); D.evt=null; tr('Jumpers to the manual defaults (H1 OFF, H2 ON → SRC to Input 1; everything else ON); pots centred = code 128 = 0 dB trim'); }); },
};

/* ================================================================
   DRAWING: the real board (D8200-2 Gerbers), front edge, rear module
   ================================================================ */
/* Board image: D8200-2.TOP and D8200-2.SLK (P-CAD 2002, 2013|46 Gerbers) rendered at 150 dpi over the area
   x 4.25–15.00 in, y 4.55–7.70 in → 1612 × 472 px. Positions below were measured on that render. */
const JX = [0,712.7,727.7,741.7,757.7,779,794,809,825,847.7,862.7,877.7,891.7,915,930];   // H1..H14 pin columns
const JY = [345,360,375];                                                                   // pin 1 (OFF side) … pin 3 (ON side)
const LEDY = {a1:23, a2:37, proc:53, err:68};
const LEDC = {a1:'#7dff6a', a2:'#7dff6a', proc:'#ffd23a', err:'#ff4a3a'};
const CHIPS = [
  ['U1',262,58,40,226,'PIC16C73A (DIP28) — main loop, A/D on the pots, SPI master. Clock: PIC_CLK = 6.144 MHz from the CPLD'],
  ['U2',368,34,80,252,'27C512 EPROM — SHARC boot image'],
  ['U3',498,62,222,214,'ADSP-21061 SHARC (MQFP240) — sample_proc_D8205: level, mono, mix, tone'],
  ['U4',800,128,70,70,'EPM7128 CPLD (TQFP100) — d8200_top: clocks, SPORT framing, jumper read-back, output and jack muxes'],
  ['U5',946,74,72,42,'CS8420 #2 = firmware CH2 = Input 1 (main reference). CS2 from PIC RC1'],
  ['U6',1085,74,72,42,'CS8420 #1 = firmware CH1 = Input 2 (main audio). CS1 from PIC RC2'],
  ['U7',1005,262,74,74,'ML6431 video genlock (QFP32) with X1 3.58 MHz — used by D8206/D8207, idle on a D8205'],
  ['OSC2',786,40,40,70,'24.576 MHz oscillator → CPLD input_clk → SHARC_CLK (24.576), PIC_CLK (÷4)'],
  ['REG1',1160,296,200,96,'LM2825 DC-DC module: ±21 V frame rails → +5 V'],
];
function boardSVG(t, vb, opts){
  opts = opts||{};
  const S = stateAt(t), c = D.cfg, L = S.leds;
  let s = `<svg viewBox="${vb||'-24 -6 1640 484'}" role="img" aria-label="D8205 card (D8200-2 board, real copper and silk)" style="width:100%;display:block;background:var(--lane);border-radius:8px">
  <defs><filter id="d85g" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <clipPath id="d85clip${vb?'z':''}"><rect x="0" y="0" width="1612" height="455"/></clipPath>
  <path d="M8,12 H1560 L1585,32 V440 L1560,455 H8 Z" fill="#1d5434" stroke="#0d2e1b" stroke-width="2"/>
  <g clip-path="url(#d85clip${vb?'z':''})"><image href="${ASSET}d8205-board-copper.png" width="1612" height="472" opacity=".62"/>
  <image href="${ASSET}d8205-board-silk-white.png" width="1612" height="472"/></g>`;
  // chips hotspots
  CHIPS.forEach(([n,x,y,w,h,tip])=>{ s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${opts.hot===n?'rgba(90,169,230,.25)':'transparent'}" stroke="${opts.hot===n?'#5aa9e6':'none'}"><title>${n}: ${tip}</title></rect>`; });
  // LEDs at the front edge (right-angle LEDs)
  Object.keys(LEDY).forEach(k=>{ const y=LEDY[k], on=L[k];
    s += `<g><title>${({a1:'AUDIO1 (green, LED_0 = RC7): Input 1 / CH2 locked',a2:'AUDIO2 (green, LED_1 = RB0): Input 2 / CH1 locked',proc:'PROC (yellow, LED_2 = RB1): internal 48 kHz mode',err:'ERR (red, LED_3 = RB2): an input is unlocked'})[k]}</title>
      <rect x="-2" y="${y-6}" width="22" height="12" rx="2" fill="#d9d4c3" opacity=".35"/>
      <circle cx="-4" cy="${y}" r="6.5" fill="${on?LEDC[k]:'#3b3f3a'}" ${on?'filter="url(#d85g)"':''} stroke="#111" stroke-width="1"/></g>`; });
  // pots RV1, RV2: adjust screws stick out at the front edge
  [[94,0],[124,1]].forEach(([y,i])=>{ const a = -150 + 300*c.pot[i]/255;
    s += `<g class="d85pot" data-i="${i}" style="cursor:pointer"><title>RV${i+1} (5K multi-turn): code ${c.pot[i]}. Click left half = down, right half = up; wheel works too.</title>
      <rect x="-14" y="${y-14}" width="146" height="28" fill="transparent"/>
      <circle cx="0" cy="${y}" r="9" fill="#c9b37a" stroke="#6f5b23" stroke-width="2"/><line x1="${-7*Math.cos(a*Math.PI/180)}" y1="${y-7*Math.sin(a*Math.PI/180)}" x2="${7*Math.cos(a*Math.PI/180)}" y2="${y+7*Math.sin(a*Math.PI/180)}" stroke="#3b2f10" stroke-width="2.5"/></g>`; });
  // monitor jack
  const jk = jb(c,14)? 2 : 1;
  s += `<g><title>MONITOR (TRS): CPLD JACK_OUT → U9 75176 → T1. H14 selects Output ${jk} now.</title><rect x="-16" y="318" width="48" height="44" fill="transparent"/><circle cx="-8" cy="340" r="11" fill="#222" stroke="#999" stroke-width="2"/><text x="40" y="410" font-size="13" fill="#ffd27a">→ OUT ${jk}</text></g>`;
  // jumpers H1..H14
  for (let i=1;i<=14;i++){ const x=JX[i], on = c.J[i]==='ON';
    const y0 = on? JY[1]-8 : JY[0]-8;
    s += `<g class="d85j" data-j="${i}" style="cursor:pointer"><title>${JINFO[i].n}: ${JINFO[i].g} — now ${c.J[i]}. Click to move the shunt.</title>
      <rect x="${x-7}" y="${JY[0]-10}" width="14" height="50" fill="transparent"/>
      <rect x="${x-6.5}" y="${y0}" width="13" height="31" rx="2" fill="#151515" stroke="${opts.hotJ===i?'#5aa9e6':'#444'}" stroke-width="${opts.hotJ===i?2.5:1}"/>
      <rect x="${x-3}" y="${y0+4}" width="6" height="4" fill="#666"/></g>`; }
  // TERM1 (H17), TERM2 (H18): rows 75 Ω / 110 Ω / park
  [[1,33],[2,202]].forEach(([n,y0])=>{ const v = n===1?c.term1:c.term2; const row = {'75':0,'110':1,'HiZ':2}[v];
    s += `<g class="d85t" data-t="${n}" style="cursor:pointer"><title>TERM${n} (H${n===1?17:18}): ${v==='HiZ'?'parked = HiZ':v+' Ω'} — click to change</title><rect x="1372" y="${y0-10}" width="40" height="52" fill="transparent"/>
      <rect x="${1377}" y="${y0+row*15-6}" width="29" height="13" rx="2" fill="#151515" stroke="#444"/></g>`; });
  // H16 reference source
  { const lo = c.h16==='local'; const ya = lo? 63 : 49;
    s += `<g class="d85h16" style="cursor:pointer"><title>H16 reference input: ${lo?'LOCAL (frame MF82REF bus)':'EXTERNAL (rear module REF input)'} — click to change</title><rect x="1494" y="40" width="34" height="48" fill="transparent"/>
      <rect x="1497" y="${ya-6}" width="12" height="27" rx="2" fill="#151515" stroke="#444"/><rect x="1512" y="${ya-6}" width="12" height="27" rx="2" fill="#151515" stroke="#444"/></g>`; }
  if (!opts.noLabels) s += `<text x="1580" y="474" font-size="13" fill="var(--ink2)" text-anchor="end">D8200-2 Gerbers (2013|46) · edge connector P1 →</text>`;
  return s + `</svg>`;
}
/* front edge as seen through the open MF82 door (drawn to scale from the same board positions) */
function edgeSVG(t){
  const S = stateAt(t), L = S.leds, c = D.cfg;
  const led=(k,lbl)=>{ const y=LEDY[k]*1.0, on=L[k]; return `<circle cx="50" cy="${y+20}" r="7.5" fill="#0b0c0b"/><circle cx="50" cy="${y+20}" r="5.6" fill="${on?LEDC[k]:'var(--led-off)'}" ${on?'filter="url(#d85e)"':''}/><text x="64" y="${y+24}" font-size="10.5" fill="var(--ink2)">${lbl}</text>`; };
  const scr=(y,i)=>{ const a=-150+300*c.pot[i]/255; return `<g class="d85pot" data-i="${i}" style="cursor:pointer"><title>RV${i+1}: code ${c.pot[i]} — click top/bottom half or use the wheel</title><rect x="30" y="${y+6}" width="80" height="28" fill="transparent"/><circle cx="50" cy="${y+20}" r="9" fill="#c9b37a" stroke="#6f5b23" stroke-width="2"/><line x1="${50-7*Math.cos(a*Math.PI/180)}" y1="${y+20-7*Math.sin(a*Math.PI/180)}" x2="${50+7*Math.cos(a*Math.PI/180)}" y2="${y+20+7*Math.sin(a*Math.PI/180)}" stroke="#3b2f10" stroke-width="2.5"/><text x="64" y="${y+24}" font-size="10.5" fill="var(--ink2)">RV${i+1}</text></g>`; };
  return `<svg viewBox="0 0 120 500" style="width:100%;max-width:120px;display:block"><defs><filter id="d85e" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect x="38" y="30" width="24" height="456" rx="3" fill="#1d5434" stroke="#0d2e1b"/>
    ${led('a1','AUDIO1')}${led('a2','AUDIO2')}${led('proc','PROC')}${led('err','ERR')}${scr(94,0)}${scr(124,1)}
    <circle cx="50" cy="360" r="11" fill="#111" stroke="#9a9a9a" stroke-width="3"/><text x="64" y="364" font-size="10.5" fill="var(--ink2)">MON</text>
    <text x="60" y="16" font-size="10.5" text-anchor="middle" fill="var(--ink2)">front edge</text></svg>`;
}
/* rear termination module: drawing from "D8205 - rear module options.pdf" (cropped at 200 dpi) */
const REAR = {
  bnc1:{img:'d8205-rear-bnc1-black.png', jacks:[['in1',238,112],['o1',302,178,'OUT 1-1'],['o1',238,245,'OUT 1-2'],['o2',302,312,'OUT 2-1'],['in2',302,452],['o2',238,380,'OUT 2-2'],['o2',238,518,'OUT 2-3']]},
  bnc3:{img:'d8205-rear-bnc3-black.png', jacks:[['in1',211,107],['loop',300,107,'REF loop'],['o1',211,210,'OUT 1-1'],['o1',300,210,'OUT 1-2'],['o2',211,312,'OUT 2-1'],['o2',300,312,'OUT 2-2'],['in2',211,415],['o2',300,415,'OUT 2-3'],['o2',211,518,'OUT 2-4'],['o2',300,518,'OUT 2-5']]},
  tb8205p:{img:'d8205-rear-tb8205p-black.png', jacks:[['in1',180,164,null,'scr'],['in2',265,269,null,'scr']]},
  tb8205p75:{img:'d8205-rear-tb8205p75-black.png', jacks:[['in1',253,150],['in2',277,269,null,'scr']]},
};
function rearSVG(t){
  const R = REAR[D.cfg.rear], S = stateAt(t), c = D.cfg;
  let s = `<svg viewBox="0 0 518 654" role="img" aria-label="D8205 rear module (from the rear module guide)" style="width:100%;max-width:330px;display:block;border-radius:8px;background:#e9e7e1">
    <image href="${ASSET}${R.img}" width="518" height="654"/>`;
  R.jacks.forEach(([k,x,y,lbl,kind])=>{
    if (k==='in1'||k==='in2'){ const on = k==='in1'? (c.h16==='ext'? c.in1.on : false) : c.in2.on; const n = k==='in1'?1:2;
      s += `<g class="d85in" data-n="${n}" style="cursor:pointer"><title>${k==='in1'?'AES REF INPUT = Input 1 (main reference)':'AES AUDIO INPUT = Input 2 (main audio)'} — click to ${on?'unplug':'plug in'}${n===1&&c.h16!=='ext'?' (H16 is on LOCAL: this connector is not used)':''}</title>
        <rect x="${x-44}" y="${y-44}" width="88" height="88" fill="transparent"/>
        ${on? (kind==='scr'? `<rect x="${x-30}" y="${y-14}" width="60" height="28" rx="4" fill="#2e7d4f" opacity=".85"/>` : `<rect x="${x-14}" y="${y+28}" width="28" height="60" fill="#2b5f9e"/><circle cx="${x}" cy="${y}" r="24" fill="#3a74b8" opacity=".85"/>`) : ''}
        <circle cx="${x+30}" cy="${y-30}" r="7" fill="${on?'#2e9d5a':'#999'}"/></g>`; }
    else if (k==='o1'||k==='o2'){ const live = k==='o1'? S.tx1 : S.tx2; s += `<circle cx="${x}" cy="${y}" r="6" fill="${live?'#e0a020':'#777'}"><title>${lbl}: ${live?'AES carrier on':'transmitter off (TXOFF)'}</title></circle>`; }
  });
  return s + `</svg>`;
}
function bindBoard(root){
  root.querySelectorAll('.d85j').forEach(g=> g.onclick = ()=>A.jumper(+g.dataset.j));
  root.querySelectorAll('.d85t').forEach(g=> g.onclick = ()=>A.term(+g.dataset.t));
  root.querySelectorAll('.d85h16').forEach(g=> g.onclick = ()=>A.h16());
  root.querySelectorAll('.d85in').forEach(g=> g.onclick = ()=>A.plug(+g.dataset.n));
  root.querySelectorAll('.d85pot').forEach(g=>{ const i=+g.dataset.i;
    g.onclick = e=>{ const r=g.getBoundingClientRect(); const horiz = r.width > r.height; const f = horiz? (e.clientX-r.left)/r.width : 1-(e.clientY-r.top)/r.height; A.pot(i, f<0.5? -8 : 8); };
    g.addEventListener('wheel', e=>{ e.preventDefault(); A.pot(i, e.deltaY<0? 4 : -4); }, {passive:false}); });
}
document.addEventListener('keydown', e=>{
  if (!window.__d8205Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const m = { q:()=>A.pot(0,-8), w:()=>A.pot(0,8), o:()=>A.pot(1,-8), p:()=>A.pot(1,8), '1':()=>A.plug(1), '2':()=>A.plug(2) };
  const f = m[e.key.toLowerCase()]; if (f){ f(); e.preventDefault(); }
});

/* ---------------- control panel (jumper table, inputs) ---------------- */
function jumperTable(){
  const c = D.cfg, d = derive(c);
  const btn = i=>`<button data-jt="${i}" class="${c.J[i]==='ON'?'on':''}" title="${JINFO[i].g}" style="min-width:52px;padding:2px 6px">${JINFO[i].n} ${c.J[i]}</button>`;
  return `<table class="kv"><tr><th>Group</th><th>Shunts</th><th>Result (manual wording)</th></tr>
    <tr><td>Sample-rate conversion</td><td>${btn(1)}${btn(2)}</td><td>${SRC_TXT[d.jmp]}</td></tr>
    <tr><td>Level pots</td><td>${btn(3)}${btn(13)}</td><td>${JINFO[3][jb(c,3)?'off':'on']} · ${JINFO[13][jb(c,13)?'off':'on']}</td></tr>
    <tr><td>Remote / resolution</td><td>${btn(4)}${btn(5)}</td><td>remote ${JINFO[4][jb(c,4)?'off':'on']} · ${JINFO[5][jb(c,5)?'off':'on']}</td></tr>
    <tr><td>Input modes</td><td>${btn(7)}${btn(6)}</td><td>Input 1 ${JINFO[7][jb(c,7)?'off':'on']} · Input 2 ${JINFO[6][jb(c,6)?'off':'on']}</td></tr>
    <tr><td>Output 1 source</td><td>${btn(11)}${btn(12)}</td><td>${ROUTE_TXT[d.r1]}</td></tr>
    <tr><td>Output 2 source</td><td>${btn(9)}${btn(10)}</td><td>${ROUTE_TXT[d.r2]}</td></tr>
    <tr><td>Tone · monitor</td><td>${btn(8)}${btn(14)}</td><td>tone ${JINFO[8][jb(c,8)?'off':'on']} · jack = ${JINFO[14][jb(c,14)?'off':'on']}</td></tr>
    <tr><td>Hardware</td><td><button data-hw="h16">H16 ${c.h16==='ext'?'EXT':'LOCAL'}</button><button data-hw="t1">TERM1 ${c.term1}</button><button data-hw="t2">TERM2 ${c.term2}</button></td><td class="small">H16: reference from the rear REF input or the frame’s MF82REF bus · TERM1/2: input terminations</td></tr></table>`;
}
function inputsHTML(){
  const c = D.cfg;
  const row = (n)=>{ const k=n===1?'in1':'in2', x=c[k];
    return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0">
      <b style="min-width:150px">Input ${n} <span class="muted small">${n===1?'(REF, CH2)':'(AUDIO, CH1)'}</span></b>
      <button data-plug="${n}" class="${x.on?'on':''}">${x.on?'plugged':'unplugged'}</button>
      <label class="small">fs <select data-fs="${n}">${FS_LIST.map(f=>`<option value="${f}" ${f===x.fs?'selected':''}>${f/1000} kHz</option>`).join('')}</select></label>
      <label class="small">program <input type="range" min="-40" max="0" step="1" value="${x.lvl}" data-lvl="${n}" style="width:110px"> <span class="mono">${x.lvl} dBFS</span></label>
      <span class="small muted">${x.fa}/${x.fb} Hz tones on A/B</span></div>`; };
  return row(1) + row(2) + `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
    <button data-x="frame" class="${c.frame.on?'on':''}">MF82REF frame ref ${c.frame.on?'present':'absent'}</button>
    <button data-x="remote" class="${c.remote?'on':''}">${c.remote?'D8205/R (remote)':'plain D8205'}</button>
    ${c.remote?`<span class="small">remote L <button data-x="rl-">−</button><button data-x="rl+">+</button> R <button data-x="rr-">−</button><button data-x="rr+">+</button> <span class="mono">${c.rem.join('/')}</span></span>`:''}
    <label class="small">rear <select data-x="rear">${Object.keys(REAR).map(k=>`<option value="${k}" ${k===c.rear?'selected':''}>${({bnc1:'BNC1 (/75)',bnc3:'BNC3 (/75, MF8210)',tb8205p:'TB8205P (/110)',tb8205p75:'TB8205P/75 (/110)'})[k]}</option>`).join('')}</select></label>
    <button data-x="power">${c.power?'Power off':'Power on (boot here)'}</button><button data-x="reset">Factory defaults</button></div>`;
}
function bindControls(root){
  root.querySelectorAll('[data-jt]').forEach(b=> b.onclick=()=>A.jumper(+b.dataset.jt));
  root.querySelectorAll('[data-hw]').forEach(b=> b.onclick=()=>({h16:()=>A.h16(), t1:()=>A.term(1), t2:()=>A.term(2)})[b.dataset.hw]());
  root.querySelectorAll('[data-plug]').forEach(b=> b.onclick=()=>A.plug(+b.dataset.plug));
  root.querySelectorAll('[data-fs]').forEach(s=> s.onchange=e=>A.fs(+s.dataset.fs, +e.target.value));
  root.querySelectorAll('[data-lvl]').forEach(s=> s.oninput=e=>A.level(+s.dataset.lvl, +e.target.value));
  root.querySelectorAll('[data-x]').forEach(b=>{ const k=b.dataset.x;
    if (k==='rear') b.onchange=e=>A.rear(e.target.value);
    else b.onclick=()=>({frame:A.frameRef, remote:A.remote, power:A.power, reset:A.reset, 'rl-':()=>A.pot(2,-16), 'rl+':()=>A.pot(2,16), 'rr-':()=>A.pot(3,-16), 'rr+':()=>A.pot(3,16)})[k](); });
}

/* ---------------- timeline lanes ---------------- */
function lanes(){
  const css=n=>SIM.css(n);
  const ls = [];
  const band=(c,X,t0,t1,y,h,fn,cols)=>{ const N=Math.min(500,Math.max(60,(X(t1)-X(t0))/2)); const sp=(t1-t0)/N; let prev=null, xs=X(t0);
    for (let i=0;i<=N;i++){ const tt = t0+sp*Math.min(i+.5,N); const v = i<N? fn(tt) : '__end'; if (v!==prev){ if (prev!==null && cols(prev)){ c.fillStyle=cols(prev); c.globalAlpha=.6; c.fillRect(xs, y+4, X(t0+sp*i)-xs, h-8); c.globalAlpha=1; } xs = X(t0+sp*i); prev=v; } } };
  const label=(c,x,y,txt,col)=>{ c.fillStyle=col||css('--ink'); c.font='11px sans-serif'; c.fillText(txt,x,y); };
  ls.push({label:'Input 1 REF (CH2 / U5)', h:24, draw(c,X,t0,t1,y,h){ const S0=stateAt(t0);
    band(c,X,t0,t1,y,h,t=>{ const S=stateAt(t); const sg=S.sigCfg||S.cfg; return (sg.h16==='ext'?sg.in1.on:sg.frame.on) && S.cfg.power ? 'on':'off'; }, v=>v==='on'?css('--accent2'):null);
    const sg=S0.sigCfg||S0.cfg; label(c,X(t0)+4,y+h/2+4, `${sg.h16==='ext'?'rear REF input':'frame MF82REF'} · ${(sg.h16==='ext'?sg.in1.fs:48000)/1000} kHz AES frames`); }});
  ls.push({label:'Input 2 AUDIO (CH1 / U6)', h:24, draw(c,X,t0,t1,y,h){ const S0=stateAt(t0);
    band(c,X,t0,t1,y,h,t=>{ const S=stateAt(t); const sg=S.sigCfg||S.cfg; return sg.in2.on && S.cfg.power ? 'on':'off'; }, v=>v==='on'?css('--accent2'):null);
    label(c,X(t0)+4,y+h/2+4, `${(S0.sigCfg||S0.cfg).in2.fs/1000} kHz AES frames`); }});
  ls.push({label:'PIC16C73A main loop', h:32, draw(c,X,t0,t1,y,h){
    const i0=Math.max(0,passIdx(t0)), i1=passIdx(t1); const px = X(t0+PASS)-X(t0);
    if (px < 3){ c.globalAlpha=.3; c.fillStyle=css('--accent'); c.fillRect(X(t0),y+6,X(t1)-X(t0),h-12); c.globalAlpha=1; label(c,X(t0)+6,y+h/2+4,`${(i1-i0+1).toLocaleString()} passes × ≈${(PASS*1e3).toFixed(2)} ms (${'inferred'}) · PIC_CLK 6.144 MHz`); }
    else for (let i=i0;i<=i1;i++){ const a=passAt(i);
      if (px > 120){ STEPS.forEach((st,j)=>{ const xa=X(a+STEP_FRAC[j]*PASS), xb=X(a+(STEP_FRAC[j]+st[1])*PASS); c.fillStyle = j===10? css('--accent2') : j===4||j===2? css('--warn') : css('--accent'); c.globalAlpha = j%2? .55:.85; c.fillRect(xa,y+3,Math.max(1,xb-xa-0.5),h-6); c.globalAlpha=1; if (xb-xa>70){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(st[0].split(' · ')[0].slice(0,24), xa+3, y+h/2+3); } }); }
      else { c.fillStyle = i%2? css('--accent') : css('--accent2'); c.globalAlpha=.75; c.fillRect(X(a), y+3, Math.max(1,px-0.5), h-6); c.globalAlpha=1; if (px>34){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText('#'+i, X(a)+2, y+h/2+3); } } } }});
  ls.push({label:'SPI bus (SCK) bursts', h:22, draw(c,X,t0,t1,y,h){
    const i0=Math.max(0,passIdx(t0)), i1=passIdx(t1); const px=X(t0+PASS)-X(t0);
    if (px < 6){ SIM.pulses(c,X,t0,t1,y,h,PASS,STEP_FRAC[10]*PASS,STEPS[10][1]*PASS,css('--warn'),'flush8420reg bursts (54 bytes)'); return; }
    c.fillStyle=css('--warn');
    for (let i=i0;i<=i1;i++) Object.keys(SPI_STEPS).forEach(j=>{ j=+j; const a=passAt(i)+STEP_FRAC[j]*PASS, len=STEPS[j][1]*PASS, n=SPI_STEPS[j];
      if (px > 400){ for (let b=0;b<n;b++){ const ta=a+len*b/n; c.fillRect(X(ta), y+5, Math.max(1,X(ta+8*TCY)-X(ta)), h-10); } }
      else c.fillRect(X(a), y+5, Math.max(1,X(a+len)-X(a)), h-10); });
    if (px > 400) label(c, X(t0)+4, y+h-2, `one SPI byte = 8 × Tcy = ${SIM.fmtDur(8*TCY)} at Fosc/4`, css('--ink2')); }});
  ls.push({label:'Control nibble → SHARC', h:24, draw(c,X,t0,t1,y,h){
    const i0=Math.max(0,passIdx(t0)), i1=passIdx(t1); const px=X(t0+PASS)-X(t0);
    if (px < 14){ SIM.pulses(c,X,t0,t1,y,h,16*PASS,0,PASS,css('--accent2'),'16-nibble frames (FRAME_CODE E4 first)'); return; }
    const S=stateAt((t0+t1)/2); const d=S.d; const codes = S.codes || {c1:D.cfg.pot[0],c2:D.cfg.pot[1],c3:remCodes(D.cfg)[0],c4:remCodes(D.cfg)[1]};
    for (let i=i0;i<=i1;i++){ const a=i%16; const nib = nibble(a, d, codes); c.fillStyle = a===0? css('--warn') : css('--accent2'); c.globalAlpha=.8; c.fillRect(X(passAt(i,1)), y+3, Math.max(2, X(passAt(i+1))-X(passAt(i,1))-1), h-6); c.globalAlpha=1;
      if (px>40){ c.fillStyle='#fff'; c.font='10px '+css('--mono'); c.fillText(hx((a<<4)|nib), X(passAt(i,1))+2, y+h/2+3); } } }});
  ls.push({label:'Pot A/D (AN1, AN0, AN2, AN4)', h:22, draw(c,X,t0,t1,y,h){
    const i0=Math.max(0,passIdx(t0)), i1=passIdx(t1); const px=X(t0+PASS)-X(t0);
    if (px < 4){ SIM.pulses(c,X,t0,t1,y,h,4*AD_PASSES*PASS,0,AD_PASSES*PASS,css('--accent'),'RV1 conversions (each pot every 12 passes)'); return; }
    const cols=[css('--accent'),css('--accent2'),css('--warn'),css('--bad')];
    for (let i=i0;i<=i1;i++){ const k=Math.floor(i/AD_PASSES)%4; c.fillStyle=cols[k]; c.globalAlpha=.6; c.fillRect(X(passAt(i)), y+4, Math.max(1,X(passAt(i+1))-X(passAt(i))-.5), h-8); c.globalAlpha=1;
      if (px>40 && i%AD_PASSES===0){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(['RV1','RV2','rem L','rem R'][k], X(passAt(i))+2, y+h/2+3); } } }});
  ls.push({label:'Firmware stage (last change)', h:26, draw(c,X,t0,t1,y,h){
    const E=D.evt; if (!E){ label(c,X(t0)+6,y+h/2+4,'no change yet — move a jumper, plug an input or turn a pot',css('--ink2')); return; }
    const T=evtTimes(E); c.fillStyle=css('--play'); c.fillRect(X(E.t)-1,y+2,2,h-4);
    const seg=(a,b,col,txt)=>{ if (a==null||b==null) return; c.fillStyle=col; c.globalAlpha=.45; c.fillRect(X(a),y+4,X(b)-X(a),h-8); c.globalAlpha=1; if (X(b)-X(a)>60){ c.fillStyle=css('--ink'); c.font='10.5px sans-serif'; c.fillText(txt, Math.max(X(a),X(t0))+3, y+h/2+4); } };
    if (E.kind==='lock'){ seg(E.t,T.tSeen,css('--accent2'),'CS8420 PLL'); seg(T.tSeen,T.tM,css('--warn'),'debounce 31 passes'); seg(T.tM,T.tS,css('--accent'),'→ SHARC frame'); if (T.tOn) seg(T.tM,T.tOn,css('--bad'),'TXOFF 85 passes'); }
    else if (E.kind==='jumper'){ seg(E.t,T.tM,css('--warn'),'debounce 31 passes'); seg(T.tM,T.tS,css('--accent'),'→ SHARC frame'); }
    else if (E.kind==='boot'){ seg(E.t,E.t+SHARC_BOOT,css('--ink2'),'SHARC boot (inferred)'); seg(E.t+SHARC_BOOT,T.tAns,css('--warn'),'SHARC_IN_INIT, LEDs all on'); seg(T.tRun,T.tOn,css('--bad'),'outputs off 85 passes'); }
    else if (E.kind==='pot'){ T.steps.forEach((s,k)=>{ c.fillStyle=css('--accent'); c.fillRect(X(s)-1,y+4,2,h-8); }); label(c, X(E.t)+4, y+h/2+4, 'gain steps: 4 averaged conversions', css('--ink')); } }});
  ls.push({label:'real_mode (CS8420 routing)', h:24, draw(c,X,t0,t1,y,h){
    band(c,X,t0,t1,y,h,t=>{ const S=stateAt(t); return S.off?'off':String(S.d.mode); }, v=>v==='off'?null: v==='0'||v==='15'? css('--warn') : css('--accent'));
    const S=stateAt(SIM.t); label(c,X(t0)+4,y+h/2+4, S.off?'power off': MODE_TXT[S.d.mode]); }});
  ls.push({label:'OUT1 / OUT2 transmitter', h:26, draw(c,X,t0,t1,y,h){
    band(c,X,t0,t1,y,h/2+2,t=>stateAt(t).tx1?'on':'off', v=>v==='on'?css('--accent'):css('--bad'));
    band(c,X,t0,t1,y+h/2-2,h/2+2,t=>stateAt(t).tx2?'on':'off', v=>v==='on'?css('--accent'):css('--bad'));
    label(c,X(t0)+4,y+10,'OUT1 (CS8420 #1)'); label(c,X(t0)+4,y+h-3,'OUT2 (CS8420 #2: TXOFF never sticks, see Findings)'); }});
  ls.push({label:'SHARC: SPORT0/1 IRQ, sample_proc', h:30, draw(c,X,t0,t1,y,h){
    const fs = stateAt(SIM.t).d.fsOut || 48000; const P=1/fs; const px=X(t0+P)-X(t0);
    if (px < 30){ SIM.pulses(c,X,t0,t1,y,h,P,0,0.3*P,css('--accent2'),'samples: 2 SPORT IRQs + sample_proc_D8205'); return; }
    const n0=Math.floor(t0/P), n1=Math.ceil(t1/P);
    for (let n=n0;n<=n1;n++){ const a=n*P; const irq=34/SHARC_F, proc=260/SHARC_F;
      c.fillStyle=css('--warn'); c.fillRect(X(a), y+3, Math.max(1,X(a+irq)-X(a)), 7);
      c.fillStyle=css('--bad'); c.fillRect(X(a+irq), y+11, Math.max(1,X(a+2*irq)-X(a+irq)), 7);
      c.fillStyle=css('--accent2'); c.fillRect(X(a+2*irq), y+19, Math.max(1,X(a+2*irq+proc)-X(a+2*irq)), 8);
      if (px > 260){ c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText('FLAG1 SPORT0_r', X(a+irq)+3, y+10); c.fillText('FLAG2 SPORT1_r', X(a+2*irq)+3, y+18); c.fillText(`FLAG3: ctrl_proc · jumpers_analize · form_testtone_sampl · sample_proc_D8205 (≈260 cycles ${'inferred'})`, X(a+2*irq+proc)+3, y+27); } } }});
  [0,1].forEach(k=> ls.push({label:`OUTPUT ${k+1} audio A / B`, h:36, draw(c,X,t0,t1,y,h){
    const pw=X(t1)-X(t0), N=Math.min(1400,Math.max(240,pw*2)); const cols=[css('--accent'),css('--bad')];
    const pa=peakOf(k,0,SIM.t), pb=peakOf(k,1,SIM.t); let pm=Math.max(pa===null?-99:pa, pb===null?-99:pb); if (pm<-60) pm=-20; const norm=1/Math.max(0.02, Math.pow(10,pm/20));
    c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('scaled ×'+norm.toFixed(1), X(t1)-70, y+10);
    [0,1].forEach(sd=>{ c.strokeStyle=cols[sd]; c.lineWidth=1; c.beginPath(); let started=false;
      const span=t1-t0;
      if (span > 0.02){   // envelope
        const M=Math.min(300,Math.floor(pw/2)); for (let i=0;i<M;i++){ const ta=t0+span*i/M; let pk=0, none=true; for (let q=0;q<6;q++){ const v=outSample(k,sd,ta+span/M*q/6); if (v!==null){ none=false; pk=Math.min(1,Math.max(pk,Math.abs(v)*norm)); } }
          if (none){ c.fillStyle=css('--grid'); c.fillRect(X(ta), y+h/2-1, pw/M+.5, 2); } else { c.fillStyle=cols[sd]; c.globalAlpha=.35; c.fillRect(X(ta), y+h/2-pk*(h/2-3), pw/M+.5, 2*pk*(h/2-3)); c.globalAlpha=1; } } return; }
      for (let i=0;i<=N;i++){ const tt=t0+span*i/N; const v=outSample(k,sd,tt); if (v===null){ started=false; continue; } const yy=y+h/2-Math.max(-1,Math.min(1,v*norm))*(h/2-3); if (!started){ c.moveTo(X(tt),yy); started=true; } else c.lineTo(X(tt),yy); } c.stroke(); }); }}));
  ls.push({label:'LEDs: AUDIO1 · AUDIO2 · PROC · ERR', h:34, draw(c,X,t0,t1,y,h){
    const keys=['a1','a2','proc','err'];
    keys.forEach((k,r)=> band(c,X,t0,t1,y+r*7.5-2,11.5,t=>stateAt(t).leds[k]?'1':'0', v=>v==='1'?LEDC[k]:null)); }});
  ls.push({label:'AES3 blocks out (192 frames)', h:22, draw(c,X,t0,t1,y,h){ const fs=stateAt(SIM.t).d.fsOut||48000; SIM.pulses(c,X,t0,t1,y,h,192/fs,0,1/fs,css('--warn'),'blocks (Z preamble)'); }});
  return ls;
}
function nibble(a, d, codes){
  const v = [0xE4,0x00,0x05,d.MODE1,d.MODE2,codes.c1,codes.c2,codes.c3,codes.c4];
  if (a===0) return 0xE; if (a===1) return 0x4; if (a===2) return 0; if (a===3) return 5;
  const byte = v[3 + ((a-4)>>1)]; return (a%2===0)? (byte>>4)&15 : byte&15;
}

/* ---------------- AES3 scope (OUTPUT 1 at the playhead) ---------------- */
function aesFrame(t){
  const S = stateAt(t), fs = S.d.fsOut || 48000, n = Math.floor(t*fs), fr = n%192;
  const sub = [0,1].map(side=>{ const v = outSample(0, side, n/fs, S); const bits = new Array(32).fill(0);
    let raw = Math.round((v||0)*8388607); if (raw<0) raw += 1<<24;
    for (let b=0;b<24;b++) bits[4+b] = (raw>>b)&1;
    const cs0 = fs===48000?0x85: fs===44100?0x45: fs===32000?0xC5:0x05;
    bits[30] = fr<8? (cs0>>fr)&1 : 0; let p=0; for (let b=4;b<31;b++) p^=bits[b]; bits[31]=p;
    return { pre: side?'Y':(fr===0?'Z':'X'), bits, v, raw }; });
  return { n, fr, fs, sub, live: S.tx1 && !S.off && !S.init };
}
function drawScope(cv, el, t){
  const F = aesFrame(t); const {c,w} = SIM.canvas(cv, 140);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2');
  if (!F.live){ c.fillStyle=ink2; c.font='13px sans-serif'; c.fillText('OUTPUT 1 transmitter is off (TXOFF) or the card is booting: no AES carrier on the BNC.', 12, 60); el.innerHTML=''; return; }
  const P = { X:[1,1,1,0,0,0,1,0], Y:[1,1,1,0,0,1,0,0], Z:[1,1,1,0,1,0,0,0] };
  const lv=[]; let cur=0;
  F.sub.forEach(s=>{ P[s.pre].forEach(b=>lv.push(cur? 1-b : b)); cur=lv[lv.length-1]; for (let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if (s.bits[i]) cur=1-cur; lv.push(cur); } });
  const cw=(w-20)/lv.length;
  [[0,8,'--warn','pre'],[8,16,'--ink2','aux'],[16,56,'--accent','audio'],[56,64,'--accent2','VUCP']].forEach(([a,b,col,lb])=>[0,64].forEach(o=>{ c.fillStyle=SIM.css(col); c.globalAlpha=.12; c.fillRect(10+(o+a)*cw,20,(b-a)*cw,62); c.globalAlpha=1; c.fillStyle=ink2; c.font='10px sans-serif'; if ((b-a)*cw>22) c.fillText(lb,12+(o+a)*cw,96); }));
  c.strokeStyle=ink; c.lineWidth=1.4; c.beginPath(); lv.forEach((v,i)=>{ const x=10+i*cw, yy=v?28:76; if(!i) c.moveTo(x,yy); else c.lineTo(x,yy); c.lineTo(x+cw,yy); }); c.stroke();
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`Subframe A (${F.sub[0].pre})`,12,14); c.fillText('Subframe B (Y)',12+64*cw,14);
  c.fillText(`frame ${F.n.toLocaleString()} · ${F.fr}/191 · bit cell ${SIM.fmtDur(1/(F.fs*128))} · ${(128*F.fs/1e6).toFixed(3)} Mbaud`, 10, 124);
  el.innerHTML = F.sub.map((s,i)=>`${i?'B':'A'}: ${s.v===null?'—':s.v.toFixed(5)} → 0x${hx(s.raw,6)}${jb(stateAt(t).sh||D.cfg,5)?' (20-bit: low 4 bits 0)':''} · V=0 U=0 C=${s.bits[30]} P=${s.bits[31]}`).join('<br>') +
    `<br><span class="muted">Channel status is copied between the CS8420s by channel_status_proc, with the reference fs inserted (step 5); byte 0 shown here is the AES3 professional default ${inf}.</span>`;
}

/* ================================================================
   VIEWS
   ================================================================ */
function stateTable(t){
  const S = stateAt(t), d = S.d, c = D.cfg, g = gains(S.sh||c, S.codes), i = passIdx(t);
  const st = Math.max(0, STEP_FRAC.reduce((k,f,j)=> (t-passAt(i))/PASS >= f ? j : k, 0));
  const pk = k=>{ const a=peakOf(k,0,t), b=peakOf(k,1,t); return a===null? '<span style="color:var(--bad)">no carrier</span>' : `${fmtdB(a)} / ${fmtdB(b)} dBFS`; };
  return `<table class="kv">
    <tr><th>Stage</th><td>${S.stage}</td></tr>
    <tr><th>PIC pass / step</th><td class="mono">#${i} · ${STEPS[st][0]}</td></tr>
    <tr><th>Locks</th><td class="mono">CH2 (In 1) ${d.lk2?'locked':'—'} · CH1 (In 2) ${d.lk1?'locked':'—'}</td></tr>
    <tr><th>jmp_mode → real_mode</th><td class="mono">${S.init?'f (startup)':d.jmp+' → '+d.mode} · ${MODE_TXT[S.init?15:d.mode]}</td></tr>
    <tr><th>Output fs</th><td class="mono">${(d.fsOut/1000)} kHz${d.slip1||d.slip2?' <b style="color:var(--warn)">· '+(d.slip1?'Input 2':'Input 1')+' slips (no SRC)</b>':''}</td></tr>
    <tr><th>MODE1 / MODE2</th><td class="mono">${bin(d.MODE1)} / ${bin(d.MODE2)} → ji_input 0x${hx((d.MODE1<<8)|d.MODE2,4)}</td></tr>
    <tr><th>Level case</th><td class="mono">${g.caseN} · In 2 ${fmtdB(dB(g.g1L))}/${fmtdB(dB(g.g1R))} dB · In 1 ${fmtdB(dB(g.g2L))}/${fmtdB(dB(g.g2R))} dB</td></tr>
    <tr><th>Output 1</th><td class="mono">${ROUTE_TXT[d.r1]} · ${pk(0)}</td></tr>
    <tr><th>Output 2</th><td class="mono">${ROUTE_TXT[d.r2]} · ${pk(1)}</td></tr>
    <tr><th>Monitor jack</th><td class="mono">Output ${jb(c,14)?2:1} (JACK_OUT, H14 → CPLD s13)</td></tr></table>`;
}
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>` + D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click a jumper shunt, a pot screw or an input connector. Each step the firmware takes is listed here.</div>'; }
function logHTML(){ return D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>'; }

function viewSim(m){
  window.__d8205Active = true;
  m.innerHTML = `
  ${card('The card — D8200-2 board (real copper and silkscreen from the 2013|46 Gerbers). Click shunts, pot screws (RV1/RV2 at the left edge), TERM1/TERM2 and H16', `<div id="bd"></div>
    <div class="small muted" style="margin-top:4px">Keys: Q / W = RV1 down / up · O / P = RV2 · 1 / 2 = plug or unplug Input 1 / 2. The left edge is the front of the card; the gold fingers on the right plug into the MF82 frame.</div>`)}
  <div class="grid2">
    <div>
      ${card('Jumper field (zoomed from the same board) and settings', `<div id="jz"></div><div id="jt" style="margin-top:8px"></div>`)}
      ${card('Inputs, variant and rear module', `<div id="ins"></div>`)}
    </div>
    <div>
      <div style="display:grid;grid-template-columns:120px minmax(0,1fr);gap:10px">
        ${card('Edge', `<div id="edge"></div>`)}
        ${card('Rear module (click an input)', `<div id="rp"></div><div class="small muted">From “D8205 - rear module options.pdf”. Orange dots = outputs with an AES carrier.</div>`)}
      </div>
      ${card('What the firmware did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
    </div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek; use the transport above)', `<canvas id="tl"></canvas>
    <p class="small muted">The PIC clock is PIC_CLK = 24.576 MHz ÷ 4 = 6.144 MHz from the CPLD (d8200_top.rpt). One pass is ≈${(PASS*1e3).toFixed(2)} ms ${inf}: about 78 SPI bytes at Fosc/4 plus ≈500 instructions. That matches the comment in d820xad.asm: hysteresis needs 256 steady conversions × 12 passes ≈ ${(256*12*PASS).toFixed(1)} s, “about 4 second”.</p>`)}
  <div class="grid2">
    ${card('Scope: OUTPUT 1 at the playhead (one AES3 frame, biphase-mark)', `<canvas id="scope"></canvas><div id="bits" class="small mono"></div>`)}
    ${card('Action log', `<div id="log" class="log"></div>`)}
  </div>`;
  const draw = ()=>{
    const t = SIM.t;
    const bd = m.querySelector('#bd'); bd.innerHTML = boardSVG(t); bindBoard(bd);
    const jz = m.querySelector('#jz'); jz.innerHTML = boardSVG(t, '690 268 270 132', {noLabels:true}); bindBoard(jz);
    m.querySelector('#jt').innerHTML = jumperTable(); bindControls(m.querySelector('#jt'));
    const ins = m.querySelector('#ins'), ae=document.activeElement; if (!(ins.contains(ae) && ae.matches('input,select'))){ ins.innerHTML = inputsHTML(); bindControls(ins); }
    const ed = m.querySelector('#edge'); ed.innerHTML = edgeSVG(t); bindBoard(ed);
    const rp = m.querySelector('#rp'); rp.innerHTML = rearSVG(t); bindBoard(rp);
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#insp').innerHTML = stateTable(t);
    m.querySelector('#log').innerHTML = logHTML();
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200});
    drawScope(m.querySelector('#scope'), m.querySelector('#bits'), t);
  };
  SIM.on('time', draw);
}

/* ---------------- tutorial ---------------- */
const LESSONS = [
  { title:'Meet the D8205', auto:true, body:`<p>The D8205 is a plug-in card for the Ward-Beck MF82 frame. It takes two AES digital audio feeds, changes their level in the digital domain, and sends two outputs (with several copies each) to the rear module.</p>
    <p>Everything is set with <b>berg jumpers</b> H1–H14 on the board (no menus). The front edge has four LEDs, two multi-turn trim pots (RV1, RV2) and a monitor jack. The manual calls the inputs <b>Input 1 = main reference</b> and <b>Input 2 = main audio</b>.</p>`, check:()=>true },
  { title:'1 · Feed it audio (Input 2)', body:`<p>Plug the program feed into <b>AES AUDIO INPUT</b> on the rear module. The green <b>AUDIO2</b> LED says Input 2 is locked.</p>`, hint:'Click the AES AUDIO INPUT connector on the rear module, or press 2.', check:()=>D.cfg.in2.on && derive(D.cfg).leds.a2 },
  { title:'2 · Give it a reference (Input 1)', body:`<p>The default jumpers (H1 OFF, H2 ON) lock the card to <b>Input 1</b> and pass Input 2 through the sample-rate converter. Connect a reference to <b>AES REF INPUT</b>. AUDIO1 lights and the red ERR LED goes out.</p>`, hint:'Click AES REF INPUT on the rear module (or press 1). H16 must be on EXT.', check:()=>derive(D.cfg).lk2 && !derive(D.cfg).leds.err },
  { title:'3 · Trim Input 2 down 6 dB', body:`<p>With H3 OFF (default) RV2 is the level of Input 2. Turn it down to about −6 dB (code ≈ 77). In trim mode (H13 ON) the range is −15 … +15 dB around the centre.</p>`, hint:'Click the left half of RV2 at the card edge, use the wheel, or press O.', check:()=>{ const g=gains(D.cfg); const v=dB(g.g1L); return v<-4.5 && v>-7.5; } },
  { title:'4 · Send Input 1 to Output 1', body:`<p>Output 1 normally carries Input 2. Set <b>H11 ON, H12 OFF</b> to put Input 1 on Output 1. The change waits 31 loop passes (debounce) and then reaches the DSP in the next control frame.</p>`, hint:'Move H12 to OFF in the jumper field.', check:()=>derive(D.cfg).r1===1 },
  { title:'5 · Make Input 2 mono', body:`<p>Set <b>H6 OFF</b>: the SHARC replaces both channels of Input 2 with (A + B) / 2.</p>`, hint:'H6 is in the second group of four.', check:()=>jb(D.cfg,6)===1 },
  { title:'6 · Line-up tone on Output 2', body:`<p>Set <b>H9 OFF and H10 OFF</b> to put the 1 kHz test tone on Output 2, and <b>H8 OFF</b> for −18 dBFS. The tone is computed for 48 kHz.</p>`, hint:'H8, H9 and H10 sit side by side.', check:()=>derive(D.cfg).r2===3 && jb(D.cfg,8)===1 },
  { title:'7 · Lock to the internal 48 kHz', body:`<p>Set <b>H1 ON and H2 ON</b>. Both inputs now go through their SRCs to an internal 48 kHz clock. The yellow LED (silk: PROC) lights.</p>`, hint:'Both H1 and H2 to ON.', check:()=>derive(D.cfg).mode===0 && derive(D.cfg).leds.proc },
  { title:'8 · Lose the reference', body:`<p>Go back to the default <b>H1 OFF, H2 ON</b>, then <b>unplug Input 1</b> at the playhead and scrub forward. The card falls back to Input 2’s clock without SRC (REAL_MODE_5), holds both outputs off for 85 passes, and the red ERR LED comes on.</p>`, hint:'Set H1 OFF, H2 ON, then click AES REF INPUT to unplug it.', check:()=>{ const d=derive(D.cfg); return d.jmp===4 && d.mode===5; } },
  { title:'9 · Volume instead of trim', body:`<p>Plug Input 1 back in. Set <b>H13 OFF</b>: the pots now run from digital silence (code 0) to +12 dB (code 255). Turn RV1 fully down and watch Input 1 vanish from Output 1.</p>`, hint:'H13 OFF, then hold Q or click the left half of RV1 many times.', check:()=>jb(D.cfg,13)===1 && D.cfg.pot[0]===0 && derive(D.cfg).lk2 },
  { title:'10 · Monitor Output 2 on the jack', body:`<p>The MONITOR jack at the bottom of the front edge carries Output 1 (H14 ON). Set <b>H14 OFF</b> to hear Output 2. This jumper goes straight into the CPLD, so it acts at once.</p>`, hint:'H14 is the last jumper, next to the ON/OFF legend.', check:()=>jb(D.cfg,14)===1 },
  { title:'11 · Remote gain (D8205/R)', body:`<p>Make the card a <b>D8205/R</b> and set <b>H4 OFF</b>. The rear terminal now has L and R wipers for two 10K pots. With H13 OFF the remote pots act as volume and the front pots as trim.</p>`, hint:'Click “plain D8205” to switch to D8205/R, then H4 OFF.', check:()=>D.cfg.remote && jb(D.cfg,4)===1 },
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__d8205Active = true;
  m.innerHTML = `<div class="grid2"><div>${card('The card', `<div id="bd"></div><div id="jz" style="margin-top:6px"></div>`)}${card('Rear module and inputs', `<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:8px"><div id="rp"></div><div id="ins"></div></div>`)}</div>
    <div><div class="card" id="lesson"></div>${card('Lessons', `<ol id="lessons" class="small" style="padding-left:20px;margin:0"></ol>`)}${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div></div>`;
  const draw = ()=>{
    const t = SIM.t, L = LESSONS[lessonIdx];
    const bd=m.querySelector('#bd'); bd.innerHTML = boardSVG(t); bindBoard(bd);
    const jz=m.querySelector('#jz'); jz.innerHTML = boardSVG(t,'690 268 270 132',{noLabels:true}); bindBoard(jz);
    const rp=m.querySelector('#rp'); rp.innerHTML = rearSVG(t); bindBoard(rp);
    const ins=m.querySelector('#ins'), ae=document.activeElement; if (!(ins.contains(ae) && ae.matches('input,select'))){ ins.innerHTML = inputsHTML(); bindControls(ins); }
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${l.check()&&i?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const ok = L.check();
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok? (L.auto?'Ready.':'✓ Goal reached.') : '◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over (factory defaults)</button></div>
      <div class="small muted" style="margin-top:8px">LEDs now: AUDIO1 ${stateAt(t).leds.a1?'●':'○'} · AUDIO2 ${stateAt(t).leds.a2?'●':'○'} · PROC ${stateAt(t).leds.proc?'●':'○'} · ERR ${stateAt(t).leds.err?'●':'○'} — based on the manual (D8205.pdf, 2003|36) and jumpers.txt.</div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); D.cfg.in1.on=false; D.cfg.in2.on=false; lessonIdx=0; SIM.refresh(); };
  };
  SIM.on('time', draw);
}

/* ---------------- one second, layer by layer ---------------- */
function viewSecond(m){
  window.__d8205Active = false;
  m.innerHTML = `<div class="grid2">${card('Everything that happens in one second', `<div id="ladder"></div>`)}
    <div>${card('At the playhead', `<div id="now"></div>`)}${card('Zoom ladder: OUTPUT 1 A at each time scale', `<canvas id="zl"></canvas>`)}</div></div>
    ${card('Timeline', `<canvas id="tl"></canvas>`)}`;
  const draw = ()=>{
    const t = SIM.t, S = stateAt(t), fs = S.d.fsOut || 48000;
    const rows = [
      ['PIC main-loop passes', (1/PASS).toFixed(0), SIM.fmtDur(PASS), `PIC16C73A at 6.144 MHz (PIC_CLK), ${inf} pass length`],
      ['Control frames to the SHARC', (1/(16*PASS)).toFixed(1), SIM.fmtDur(16*PASS), '16 nibbles: E,4,0,5, MODE1, MODE2, code1–4 (Link_to_SHARC)'],
      ['Pot conversions (each pot)', (1/(12*PASS)).toFixed(1), SIM.fmtDur(12*PASS), 'AtoD 3 passes × 4 inputs; Average of 4 → full step after ≈'+SIM.fmtDur(48*PASS)],
      ['Debounce (jumper or lock change)', '—', SIM.fmtDur(DEBOUNCE_N*PASS), 'BCOUNT_NUM 0x1F identical passes'],
      ['Output re-enable after a mode change', '—', SIM.fmtDur(AESON_N*PASS), 'AES_OUTPUT_CONTROL_NUM 0x55'],
      ['SHARC answer timeout', '—', SIM.fmtDur(SHARC_TMO*PASS), 'no 0xE4 for 256 passes → goto WHOLE_RESET'],
      ['CS8420 register flush', (1/PASS).toFixed(0), SIM.fmtDur(PASS), '18 register writes per pass (flush8420reg)'],
      ['AES3 blocks', (fs/192).toFixed(2), SIM.fmtDur(192/fs), 'channel-status block (Z preamble)'],
      ['Samples (AES3 frames)', fs.toLocaleString(), SIM.fmtDur(1/fs), 'SPORT0 + SPORT1 interrupts, then sample_proc_D8205'],
      ['SHARC cycles per sample', (SHARC_F/fs).toFixed(0), SIM.fmtDur(1/SHARC_F), `24.576 MHz SHARC_CLK; ≈330 used ${inf}`],
      ['AES3 bit cells', (128*fs).toLocaleString(), SIM.fmtDur(1/fs/128), 'biphase-mark, 2 × 32 bits per frame'],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who / what</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Use <b>Step</b> on the transport to move one loop pass, one control frame, one AES block or one sample.</p>`;
    const i = passIdx(t), st = STEP_FRAC.reduce((k,f,j)=> (t-passAt(i))/PASS >= f ? j : k, 0);
    const codes = S.codes || {c1:D.cfg.pot[0],c2:D.cfg.pot[1],c3:remCodes(D.cfg)[0],c4:remCodes(D.cfg)[1]};
    const a = i%16, nb = nibble(a, S.d, codes);
    m.querySelector('#now').innerHTML = `<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>PIC</th><td class="mono">pass #${i}: ${STEPS[st][0]}<br><span class="muted">${STEPS[st][2]}</span></td></tr>
      <tr><th>Control nibble</th><td class="mono">sharc_adr_xmit ${a} → TO_ALTERA3 = 0x${hx((a<<4)|nb)}</td></tr>
      <tr><th>A/D</th><td class="mono">${['RV1 (AN1)','RV2 (AN0)','remote L (AN2)','remote R (AN4)'][Math.floor(i/AD_PASSES)%4]}, step ${i%AD_PASSES+1}/3 (${['setup ADCON0','start GO','read ADRES'][i%AD_PASSES]})</td></tr>
      <tr><th>SHARC</th><td class="mono">sample ${Math.floor(t*fs).toLocaleString()} at ${fs/1000} kHz · frame ${Math.floor(t*fs)%192}/191</td></tr>
      <tr><th>Stage</th><td>${S.stage}</td></tr></table>`;
    drawLadder(m.querySelector('#zl'), t);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200});
  };
  SIM.on('time', draw);
}
function drawLadder(cv, t){
  const fs = stateAt(t).d.fsOut || 48000;
  const levels = [['1 second',1],['1 control frame (16 passes)',16*PASS],['1 loop pass',PASS],['1 AES block',192/fs],['16 samples',16/fs]];
  const H = levels.length*44+8; const {c,w} = SIM.canvas(cv, H); const pk = peakOf(0,0,t); const norm = pk===null||pk===-Infinity? 1 : 1/Math.max(0.02, Math.pow(10,pk/20));
  levels.forEach(([nm,span],k)=>{ const y=6+k*44, t0=Math.max(0,Math.min(1-span,t-span/2)), x0=180, pw=w-x0-8;
    c.fillStyle=SIM.css('--ink'); c.font='12px sans-serif'; c.fillText(nm, 6, y+14); c.fillStyle=SIM.css('--ink2'); c.font='10.5px sans-serif'; c.fillText(SIM.fmtDur(span), 6, y+28);
    c.strokeStyle=SIM.css('--grid'); c.strokeRect(x0,y+2,pw,30);
    const N=Math.min(600,pw); c.strokeStyle=SIM.css('--accent'); c.beginPath(); let st=false;
    for (let q=0;q<=N;q++){ const tt=t0+span*q/N; const v=outSample(0,0,tt); if (v===null){ st=false; continue; } const yy=y+17-v*norm*13; const yc=Math.max(y+3,Math.min(y+31,yy)); if(!st){ c.moveTo(x0+pw*q/N,yc); st=true; } else c.lineTo(x0+pw*q/N,yc); } c.stroke();
    const px=x0+(t-t0)/span*pw; c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+34); c.stroke(); });
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  rear:{x:10,y:150,w:150,h:120,t:'Rear module',s:['BNC1/BNC3 (/75)','TB8205P(/75) (/110)','REF · AUDIO · OUT 1-x, 2-x'],d:'Terminations from the rear-module guide. Edge connector P1: pins 1/2 REF input, 5/6 frame reference bus, 7–16 and 19–22 output transformers, 17/18/23 video in (unused here), 25–30 ±21 V.'},
  inp:{x:200,y:20,w:170,h:110,t:'Input receivers',s:['T2 + U10 75176 (Input 1)','T8 + U11 75176 (Input 2)','TERM1/TERM2: 75 / 110 / HiZ','H16: REF = rear or frame'],d:'Transformer-coupled AES inputs. H17 (TERM1) and H18 (TERM2) put R15/R21 (75 Ω) or R16/R22 (110 Ω) across the line, or nothing (HiZ). H16 chooses the rear REF input or the MF82REF frame bus for Input 1.'},
  cs:{x:200,y:170,w:170,h:120,t:'2 × CS8420',s:['U5 = CH2 = Input 1','U6 = CH1 = Input 2','AES rx · SRC · AES tx','reg 3/4 set by set_MODE_x'],d:'Cirrus CS8420 receiver/SRC/transmitter pairs. The PIC sets their data-flow (reg 3) and clock (reg 4) per real_mode and flushes all 18 registers every pass. The SRC of the non-reference input converts it to the reference rate.'},
  cpld:{x:420,y:170,w:170,h:130,t:'EPM7128 CPLD',s:['clock dividers (PIC_CLK, SHARC_CLK)','SPORT framing CNT1/CNT2','jumper read-back s0–s13','OUTPUT1/2 + JACK_OUT mux'],d:'d8200_top.gdf (MAX+plus II). Routes CS8420 serial audio to SPORT0/SPORT1 of the SHARC, divides OSC2 24.576 MHz, returns the 14 jumpers and the SHARC mailbox byte to the PIC over SPI addresses 00–11.'},
  dsp:{x:640,y:170,w:170,h:120,t:'ADSP-21061 SHARC',s:['sample_proc_D8205','level (trim/vol tables)','mono · mix · test tone','boots from 27C512'],d:'d820xcore.asm: on each sample both SPORT interrupts fill rx buffers; the main loop runs ctrl_proc, jumpers_analize_D8205, form_testtone_sampl and sample_proc_D8205.'},
  pic:{x:420,y:20,w:170,h:110,t:'PIC16C73A',s:['main loop ≈1.33 ms','A/D: RV1, RV2, remote L/R','SPI master (CS8420, CPLD)','LEDs'],d:'d820x.asm v1.104 (#define D8205). Reads the pots and jumpers, decides real_mode from the locks, programs the CS8420s, sends a 16-nibble control frame to the SHARC through the CPLD, drives the four LEDs.'},
  front:{x:640,y:20,w:170,h:110,t:'Front edge',s:['AUDIO1 · AUDIO2 · PROC · ERR','RV1 · RV2 (5K multi-turn)','MONITOR TRS jack'],d:'LED_0..3 on RC7, RB0, RB1, RB2. RV1/RV2 wipers via 1K into AN1/AN0. The jack is fed by U9 75176 + T1 from the CPLD JACK_OUT.'},
  out:{x:420,y:340,w:390,h:70,t:'Output drivers → P1 → rear module',s:['U8/U12 EL2280 (or EL5363/EL5263 in the 2013 PnP) → T4–T7, T9, T10','OUT1 = CS8420 #1, OUT2 = CS8420 #2 (AUD_OUTPUT_ROUTE)'],d:'The CPLD OUTPUT1/OUTPUT2 equations pick AUD_OUT1 or AUD_OUT2 by a latched register bit; the drivers feed several transformers per output. On the D8205/R, T9/T10 are replaced by the remote wipers on P1-19/P1-21.'},
};
const WIRES = [['rear','inp','AES in'],['inp','cs','RXP'],['cs','cpld','serial audio, RMCK'],['cpld','dsp','SPORT0/1'],['pic','cpld','SPI 4 regs'],['pic','cs','SPI CS1/CS2'],['front','pic','pots, LEDs'],['cpld','out','OUT1/2'],['out','rear','P1'],['cpld','front','JACK_OUT']];
function viewBlock(m){
  window.__d8205Active = false; let sel='pic';
  m.innerHTML = `<div class="grid2">${card('Block diagram (click a block)', `<div id="bd"></div>`)}<div>${card('Block', `<div id="bi"></div>`)}${card('Where it is on the board', `<div id="bb"></div>`)}</div></div>`;
  const hotOf = {pic:'U1',dsp:'U3',cpld:'U4',cs:'U5',front:null,inp:null,out:null,rear:null};
  const draw = ()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 830 425" style="width:100%"><defs><marker id="d85a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const P=BLOCKS[a],Q=BLOCKS[b]; let [x1,y1]=ctr(P),[x2,y2]=ctr(Q);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const k=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9, dy?(bx.h/2)/Math.abs(dy):1e9); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(P,x1,y1,x2,y2); [x2,y2]=clip(Q,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.4:1.2}" marker-end="url(#d85a)"/><text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+35+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML = s+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=> g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
    m.querySelector('#bb').innerHTML = boardSVG(SIM.t, null, {hot: sel==='cs'?'U5':hotOf[sel]});
  };
  draw(); SIM.on('time', ()=>{});
}

/* ---------------- schematics (redrawn from d8200-2.net net names) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*17;
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([p,net],i)=>{ const yy=y+22+i*17; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${p}</text><text x="${x-34}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`; });
  right.forEach(([p,net],i)=>{ const yy=y+22+i*17; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${p}</text><text x="${x+w+34}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`; });
  return s;
}
const SHEETS = [
  { name:'1 · PIC16C73A (U1)', note:'Pins and nets from d8200-2.net. Port names from d820x.h. R1–R4 are 1K series resistors into the A/D pins.', svg:()=>
    chip(330,50,190,'U1 PIC16C73A',[['2 RA0/AN0','RV2 wiper (R1)'],['3 RA1/AN1','RV1 wiper (R2)'],['4 RA2/AN2','P1-19 remote L (R3)'],['7 RA5/AN4','P1-21 remote R (R4)'],['9 OSC1','PIC_CLK ← U4-8'],['12 RC1','CS2 → U5 CS8420'],['13 RC2','CS1 → U6 CS8420'],['14 RC3','SCK'],['15 RC4','SDI'],['16 RC5','SDO'],['17 RC6','RESET → U5, U6, U3']],
      [['18 RC7','LED_0 → R8 → AUDIO1'],['21 RB0','LED_1 → R7 → AUDIO2'],['22 RB1','LED_2 → R6 → PROC'],['23 RB2','LED_3 → R5 → ERR'],['24 RB3','CTL2 = ALTERA_A1'],['25 RB4','CTL1 = ALTERA_A0'],['26 RB5','CTL0 = ALTERA_CS'],['27 RB6','CLK31 → U7 ML6431 (I²C)'],['28 RB7','DATA31 → U7']],'6.144 MHz · MPASM · v1.104') },
  { name:'2 · CPLD and jumpers (U4)', note:'EPM7128 TQFP100 pins from d8200-2.net; signal names from d8200_top.rpt. Each H1–H14 is a 1×3 header: pin 1 to one rail (OFF), pin 3 to the other (ON), pin 2 to the CPLD.', svg:()=>
    chip(330,40,200,'U4 EPM7128',[['27','s0 ← H1'],['28','s1 ← H2'],['29','s2 ← H3'],['30','s3 ← H4'],['42','s4 ← H5'],['44','s5 ← H6'],['45','s6 ← H7'],['46','s7 ← H8'],['47','s8 ← H9'],['48','s9 ← H10'],['49','s10 ← H11'],['50','s11 ← H12'],['40','s12 ← H13 (net “JACK-SEL”)'],['37','s13 ← H14'],['90','input_clk ← OSC2 24.576 MHz']],
      [['8','PIC_CLK (÷4)'],['7','SHARC_CLK'],['12/13/14','SER_A1/A0/CS ← PIC'],['35/36/100','SER_CLK/DIN/DOUT'],['16–25','SPORT0/1 ↔ SHARC'],['65 / 75','RMCK1 / RMCK2'],['70–72 / 67–69','ILRCLK, ISCLK, SDIN 1/2'],['77–79 / 81–85','OLRCLK, SDOUT, OMCK 1/2'],['97 / 96','OUTPUT1 / OUTPUT2'],['99','JACK_OUT = s13 ? AUD_OUT2 : AUD_OUT1'],['31–33','SHARC FLAG3..1']],'MAX+plus II d8200_top') },
  { name:'3 · CS8420 pair', note:'Both CS8420s share SCK/SDI/SDO and RESET; separate chip selects. Pin 25 of each goes back to the CPLD (92, 94), which builds OUTPUT1/2.', svg:()=>
    chip(120,60,170,'U5 CS8420 (CH2)',[['4 RXP','← U10 (Input 1)'],['2 CS','CS2'],['28/1/27','SCK SDI SDO'],['9','RESET']],[['10','RMCK2'],['12–14','ILRCLK2 ISCLK2 SDIN2'],['16–18','OSCLK2 OLRCLK2 SDOUT2'],['21','OMCLK2'],['25','→ U4-92']],'Input 1 · main reference')
    + chip(560,60,170,'U6 CS8420 (CH1)',[['4 RXP','← U11 (Input 2)'],['2 CS','CS1'],['28/1/27','SCK SDI SDO'],['9','RESET']],[['10','RMCK1'],['12–14','ILRCLK1 ISCLK1 SDIN1'],['16–18','OSCLK1 OLRCLK1 SDOUT1'],['21','OMCLK1'],['25','→ U4-94']],'Input 2 · main audio')
    + `<text x="40" y="320" font-size="11.5" fill="var(--ink2)">Register image written every pass by flush8420reg: reg 1, 2, 3, 4, 5, 6, 9, 17, 18 of each chip (see the Software tab).</text>` },
  { name:'4 · Inputs, terminations, reference', note:'From d8200-2.net: T2/U10 = Input 1 with H16 and TERM1 (H17); T8/U11 = Input 2 with TERM2 (H18). Resistor values from the 2013 PnP (d8205-75-T.prg).', svg:()=>{
    let s='';
    const box=(x,y,w,h,t,sub)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+w/2}" y="${y+h/2-2}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${t}</text><text x="${x+w/2}" y="${y+h/2+13}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`;
    const ln=(x1,y1,x2,y2)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink)"/>`;
    s += box(30,60,110,50,'P1-1/2','rear REF') + box(30,140,110,50,'P1-5/6','frame ref bus') + box(200,95,90,60,'H16','EXT / LOCAL') + ln(140,85,200,115)+ln(140,165,200,135);
    s += box(340,95,80,60,'T2','PE65612') + ln(290,125,340,125) + box(470,60,110,50,'H17 TERM1','R15 75 / R16 110') + ln(420,110,470,85) + box(470,140,110,50,'U10 75176','line receiver') + ln(420,135,470,165) + box(640,140,140,50,'U5 CS8420','CH2 RXP') + ln(580,165,640,165);
    s += box(30,290,110,50,'P1 (AUDIO)','rear AUDIO IN') + box(340,290,80,60,'T8','PE65612') + ln(140,315,340,320) + box(470,255,110,50,'H18 TERM2','R21 75 / R22 110') + ln(420,305,470,280) + box(470,335,110,50,'U11 75176','line receiver') + ln(420,330,470,360) + box(640,335,140,50,'U6 CS8420','CH1 RXP') + ln(580,360,640,360);
    return s; } },
  { name:'5 · Outputs and monitor', note:'OUTPUT1 (U4-97) → R40 → U8; OUTPUT2 (U4-96) → R31 → U8/U12 → transformers T4–T7, T9, T10 → P1. JACK_OUT (U4-99) → U9 75176 → T1 → MONITOR. Which transformer serves which output copy is not traced here.', svg:()=>{
    let s=''; const box=(x,y,w,h,t,sub)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+w/2}" y="${y+h/2-2}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${t}</text><text x="${x+w/2}" y="${y+h/2+13}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`;
    const ln=(x1,y1,x2,y2)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink)"/>`;
    s += box(40,80,130,60,'U4 OUTPUT1','pin 97') + box(40,180,130,60,'U4 OUTPUT2','pin 96') + box(40,300,130,60,'U4 JACK_OUT','pin 99');
    s += box(260,110,140,90,'U8 / U12','EL2280 drivers (2013: EL5363/EL5263)') + ln(170,110,260,140) + ln(170,210,260,170);
    s += box(480,40,150,60,'T4 · T5 · T6 · T7','P1-7…14') + box(480,130,150,50,'T9 · T10','P1-19/20, P1-21/22') + box(480,210,150,50,'C32 / T8 side','P1-15/16') + ln(400,140,480,70) + ln(400,155,480,155) + ln(400,170,480,235);
    s += box(260,300,140,60,'U9 75176','+ T1 PE65612') + ln(170,330,260,330) + box(480,300,150,60,'MONITOR','TRS pins 6 / 8') + ln(400,330,480,330);
    s += `<text x="660" y="160" font-size="10.5" fill="var(--warn)">/R: T9, T10 out;</text><text x="660" y="174" font-size="10.5" fill="var(--warn)">P1-19/21 = wipers</text>`;
    return s; } },
  { name:'6 · 1999 board (D8205.NET)', note:'The 1999|32 original from D8205 - #BAK/D8205.NET: no CPLD, a 4.9152 MHz crystal for the PIC, an EL2099 output driver, and five 1×3 + three 2×3 jumpers.', svg:()=>
    chip(120,60,180,'U6 PIC16C73 (1999)',[['RA0/RA1','RIGHT/LEFT_LEVEL pots'],['RA2/RA5','RMT_LEFT/RIGHT'],['RB3–RB7','JMP: TEST_TONE, TRIM_VOL, REMOTE, DITHER, 20_24'],['OSC','X1 4M9152']],[['RB0','LED_REF_LOCK'],['RB1','LED_PROC'],['RB2','LED_ERROR'],['RC7','LED_AUDIO_LOCK'],['RC0/1/2','CS_SHARC, CS_8420REF, CS_8420MN']],'d8205.asm V1.00 Oct 6 1999')
    + chip(560,60,170,'U4 ADSP21061 (1999)',[['SPORT','CS8420 U1/U3'],['boot','U5 27C512'],['clock','OSC1 24.576 MHz']],[['out','U2 EL2099 → transformers']],'8205CORE.21K Nov 15 1999') },
];
function viewSchem(m){
  window.__d8205Active = false; let i=0;
  m.innerHTML = card('Schematic set — redrawn from the netlist and source names (not the original P-CAD/ACCEL drawings)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">Original CAD: <span class="mono">D8200 - #Engineering #MF82/d8200 - #PCB/d8200-2.sch</span> (P-CAD 2002, binary) and the 1999 <span class="mono">D8205 - #BAK/D8205.SCH</span> (ACCEL). These sheets only show connections read from <span class="mono">d8200-2.net</span>, <span class="mono">D8205.NET</span>, <span class="mono">d820x.h</span> and <span class="mono">d8200_top.rpt</span>.</p>`);
  const draw=()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=> b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 860 470" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="848" height="458" fill="none" stroke="var(--line)"/><text x="840" y="455" text-anchor="end" font-size="10" fill="var(--ink2)">D8205 (D8200-2 board) · sheet ${i+1}/${SHEETS.length} · redrawn ${SIM.year(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent = SHEETS[i].note;
  };
  draw();
}

/* ---------------- software ---------------- */
function viewSoft(m){
  window.__d8205Active = false;
  m.innerHTML = `<div class="grid2">
    ${card('PIC main loop (d820x.asm v1.104) — the step lit up is running at the playhead', `<div id="flow"></div>`)}
    <div>${card('real_mode state machine (switch_8420_modes, D8205)', `<div id="fsm"></div>`)}${card('Control frame to the SHARC (Link_to_SHARC → ctrl_proc), live', `<div id="nib"></div>`)}</div></div>
  <div class="grid2">${card('CS8420 and CPLD registers for this mode (set_MODE_x → flush8420reg)', `<div id="regs"></div>`)}${card('SHARC sample_proc_D8205 pipeline, live', `<div id="dsp"></div>`)}</div>
  <div class="grid2">${card('How the controls did things', `<div id="btn"></div>`)}${card('The 1999|32 original (d8205.asm V1.00 + 8205CORE)', `<div id="old"></div>`)}</div>`;
  const draw=()=>{
    const t=SIM.t, S=stateAt(t), d=S.d, i=passIdx(t), st=STEP_FRAC.reduce((k,f,j)=> (t-passAt(i))/PASS >= f ? j : k, 0);
    let s=`<svg viewBox="0 0 520 ${STEPS.length*40+70}" style="width:100%"><defs><marker id="d85b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <rect x="140" y="6" width="240" height="24" rx="12" fill="var(--chip)" stroke="var(--line)"/><text x="260" y="22" text-anchor="middle" font-size="11.5" fill="var(--ink)">init → main: clrwdt</text>`;
    STEPS.forEach((p,j)=>{ const y=40+j*40, on=st===j && !S.off;
      s+=`<line x1="260" y1="${y-10}" x2="260" y2="${y}" stroke="var(--ink2)" marker-end="url(#d85b)"/><rect x="30" y="${y}" width="460" height="30" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
      <text x="40" y="${y+13}" font-size="11.5" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${p[0]}</text><text x="40" y="${y+25}" font-size="9.8" fill="${on?'#eef':'var(--ink2)'}">${p[2].slice(0,92)}</text>`; });
    const yb=40+STEPS.length*40; s+=`<path d="M490 ${yb-25} h18 V35 h-18" fill="none" stroke="var(--ink2)" marker-end="url(#d85b)"/><text x="30" y="${yb+16}" font-size="11" fill="var(--ink2)">goto main · pass #${i} · ≈${PASS*1e3} ms (inferred) · no delay calls in the D8205 build</text></svg>`;
    m.querySelector('#flow').innerHTML = s;
    // FSM
    const node=(x,y,k,lbl,sub)=>{ const on=d.mode===k && !S.init; return `<g><circle cx="${x}" cy="${y}" r="38" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="${x}" y="${y-4}" text-anchor="middle" font-size="12" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${lbl}</text><text x="${x}" y="${y+11}" text-anchor="middle" font-size="8" fill="${on?'#eef':'var(--ink2)'}">${sub}</text></g>`; };
    const arr=(p,txt,tx,ty)=>`<path d="${p}" fill="none" stroke="var(--ink2)" marker-end="url(#d85b)"/><text x="${tx}" y="${ty}" font-size="9.5" text-anchor="middle" fill="var(--ink2)">${txt}</text>`;
    m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 520 306" style="width:100%">
      ${node(70,70,4,'MODE 4','ref In1, SRC In2')}${node(260,70,5,'MODE 5','In2 clock')}${node(450,70,3,'MODE 3','ref In2, SRC In1')}
      ${node(160,210,0,'MODE 0','int. 48 kHz')}${node(360,210,6,'MODE 6','In1 clock')}
      ${arr('M108 64 L222 64','CH2 (In 1) lost',165,56)}${arr('M412 76 Q360 150 395 180','CH1 lost',440,150)}${arr('M298 84 Q340 150 340 175','CH1 lost',320,140)}
      ${arr('M100 100 Q110 160 128 185','both lost',90,160)}${arr('M330 225 L200 225','both lost',265,243)}
      <text x="10" y="285" font-size="11" fill="var(--ink)">H1/H2 → jmp_mode ${d.jmp} · locks CH1 ${d.lk1?'✓':'✗'} CH2 ${d.lk2?'✓':'✗'} → real_mode <tspan font-weight="700">${S.init?'f':d.mode}</tspan>. </text><text x="10" y="299" font-size="10" fill="var(--ink2)">A returning lock re-runs MODE_change_analize (UNLOCKED_MODE path).</text></svg>`;
    // nibbles
    const codes = S.codes || {c1:D.cfg.pot[0],c2:D.cfg.pot[1],c3:remCodes(D.cfg)[0],c4:remCodes(D.cfg)[1]};
    const names=['FRAME hi','FRAME lo','reserved','PRODUCT','MODE1 hi','MODE1 lo','MODE2 hi','MODE2 lo','code1 hi','code1 lo','code2 hi','code2 lo','code3 hi','code3 lo','code4 hi','code4 lo'];
    m.querySelector('#nib').innerHTML = `<div style="display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:4px">${names.map((n,a)=>`<div class="mono small" style="padding:4px;border:1px solid var(--line);border-radius:6px;text-align:center;${a===i%16?'background:var(--accent);color:#fff':''}"><div>0x${hx((a<<4)|nibble(a,d,codes))}</div><div style="font-size:10px;opacity:.8">${n}</div></div>`).join('')}</div>
      <p class="small muted">One nibble per pass travels PIC → TO_ALTERA3 → CPLD → SPORT0 word 3 → SHARC rx_buf_CTRL. ctrl_proc only acts when the byte changes, checks the address nibble, and after nibble f extracts FRAME_CODE, PRODUCT_NUMBER (5 → D8205_beg), ji_input = 0x${hx((d.MODE1<<8)|d.MODE2,4)} and code1–4 = ${codes.c1}, ${codes.c2}, ${codes.c3}, ${codes.c4}.</p>`;
    // regs
    const R = MODE_REGS[S.init?15:d.mode]; const tx1 = !S.tx1;
    m.querySelector('#regs').innerHTML = `<table class="kv"><tr><th>Register</th><th>CH1 (U6, In 2)</th><th>CH2 (U5, In 1)</th><th>Meaning</th></tr>
      <tr><td>3 Data Flow Control</td><td class="mono">0x${hx(R[0]|(tx1?0x40:0))}</td><td class="mono">0x${hx(R[2]|(d.tx2req?0x40:0))} → <b style="color:var(--bad)">0x00</b></td><td class="small">bit 6 TXOFF; low 5 bits = TXD/SPD/SRCD routing. CH2 is overwritten by “MOVLW 0 ;TESTING” in flush8420reg</td></tr>
      <tr><td>4 Clock Source Control</td><td class="mono">0x${hx(R[1])}</td><td class="mono">0x${hx(R[3])}</td><td class="small">${R[1]===4?'PLL from the serial port (mode f)':'RUN, PLL from the AES input'} ${inf} (CS8420 datasheet layout, not in the archive)</td></tr>
      <tr><td>5 / 6 serial format</td><td class="mono" colspan="2">bits 5:4 = ${jb(D.cfg,5)?'01 (20 bit)':'00 (24 bit)'}</td><td class="small">set_20bit / set_24bit</td></tr>
      <tr><td>2 Misc Control 2</td><td class="mono">0x00 (TESTING)</td><td class="mono">0x40</td><td class="small">HOLD = 10; CH1’s value is replaced by 0 in flush8420reg</td></tr>
      <tr><td>TO_ALTERA2 | AUD_OUTPUT_ROUTE</td><td class="mono" colspan="2">0x${hx(R[4])} | 0xA0 = 0x${hx(R[4]|0xA0)}</td><td class="small">clock source; OUT1 = CS8420 #1, OUT2 = #2</td></tr>
      <tr><td>TO_ALTERA1 / TO_ALTERA0</td><td class="mono" colspan="2">0x${hx(R[5])} / 0x${hx(R[6])}</td><td class="small">${R[7]}</td></tr></table>`;
    // DSP
    const g=gains(S.sh||D.cfg, S.codes), sh=S.sh||D.cfg, shd=derive(sh);
    const bx=(x,y,w,t1,t2,on)=>`<rect x="${x}" y="${y}" width="${w}" height="40" rx="6" fill="${on?'color-mix(in srgb,var(--accent) 22%,var(--panel2))':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+6}" y="${y+16}" font-size="11" font-weight="700" fill="var(--ink)">${t1}</text><text x="${x+6}" y="${y+31}" font-size="10" fill="var(--ink2)">${t2}</text>`;
    m.querySelector('#dsp').innerHTML = `<svg viewBox="0 0 560 258" style="width:100%">
      ${bx(5,20,120,'CH1 rx (In 2)', shd.lk1?'rx_buf_CH1':'rx_buf_silence', shd.lk1)}${bx(5,150,120,'CH2 rx (In 1)', shd.lk2?'rx_buf_CH2':'rx_buf_silence', shd.lk2)}
      ${bx(140,20,95,'mono CH1', jb(sh,6)?'(A+B)·0.5':'off', jb(sh,6))}${bx(140,150,95,'mono CH2', jb(sh,7)?'(A+B)·0.5':'off', jb(sh,7))}
      ${bx(250,20,120,'× f6, f7', fmtdB(dB(g.g1L))+' / '+fmtdB(dB(g.g1R))+' dB', true)}${bx(250,150,120,'× f8, f9', fmtdB(dB(g.g2L))+' / '+fmtdB(dB(g.g2R))+' dB', true)}
      ${bx(250,85,120,'form_testtone', `1 kHz@48k · ${jb(sh,8)?'−18':'−20'} dBFS`, shd.r1===3||shd.r2===3)}
      ${bx(390,40,160,'OUT1 case '+shd.r1, ROUTE_TXT[shd.r1], true)}${bx(390,130,160,'OUT2 case '+shd.r2, ROUTE_TXT[shd.r2], true)}
      ${bx(390,195,160,'fix → dout', jb(sh,5)?'shift −12 (20 bit)':'shift −8 (24 bit)', true)}
      <line x1="125" y1="40" x2="140" y2="40" stroke="var(--ink2)"/><line x1="235" y1="40" x2="250" y2="40" stroke="var(--ink2)"/><line x1="125" y1="170" x2="140" y2="170" stroke="var(--ink2)"/><line x1="235" y1="170" x2="250" y2="170" stroke="var(--ink2)"/>
      <line x1="370" y1="40" x2="390" y2="60" stroke="var(--ink2)"/><line x1="370" y1="170" x2="390" y2="150" stroke="var(--ink2)"/><line x1="370" y1="105" x2="390" y2="60" stroke="var(--ink2)"/><line x1="370" y1="105" x2="390" y2="150" stroke="var(--ink2)"/>
      <text x="5" y="240" font-size="10.5" fill="var(--ink2)">Level case ${g.caseN}: ${['internal trim (trim_lktb)','internal volume (vol_lktb)','remote trim × internal trim','remote volume × internal trim'][g.caseN]} </text><text x="5" y="252" font-size="10.5" fill="var(--ink2)">${jb(sh,3)?'one pot per input':'pot 1 = A, pot 2 = B'} · mix = plain sum (no −6 dB)</text></svg>`;
    m.querySelector('#btn').innerHTML = `<table class="kv"><tr><th>Operator does</th><th>Code path</th><th>Latency</th></tr>
      <tr><td>Moves H1–H13</td><td class="mono small">jmp_input → debounce → MODE_change_analize → Link_to_SHARC → ctrl_proc → jumpers_analize_D8205</td><td class="small">31 passes + ≤16 passes ≈ ${SIM.fmtDur(47*PASS)}</td></tr>
      <tr><td>Moves H14</td><td class="mono small">CPLD JACK_OUT = s13 ? AUD_OUT2 : AUD_OUT1</td><td class="small">immediate (logic)</td></tr>
      <tr><td>Turns RV1 / RV2</td><td class="mono small">AtoD_data_preparing → Average → Hysterisis → code1/2 → nibbles 8–b → sample_proc_D8205 table lookup</td><td class="small">4 steps over ≈${SIM.fmtDur(48*PASS)}</td></tr>
      <tr><td>Plugs / unplugs an input</td><td class="mono small">CS8420 reg 16 → jmp_input lock bit → debounce → switch_8420_modes → set_MODE_x → swm_end (TXOFF) → AES_output_control</td><td class="small">PLL + 31 passes, outputs off 85 passes</td></tr>
      <tr><td>Moves H16 / TERM1 / TERM2</td><td class="mono small">hardware only (the CS8420 then sees a new lock state)</td><td class="small">—</td></tr>
      <tr><td>SHARC stops answering</td><td class="mono small">SHARC_link_control: 256 passes without 0xE4 → goto WHOLE_RESET</td><td class="small">≈${SIM.fmtDur(SHARC_TMO*PASS)}</td></tr></table>
      <p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none yet — use the Simulator or Tutorial tab'}</b></p>`;
    // 1999 original
    const in2 = D.cfg.in2.on, in1 = D.cfg.in1.on;
    const oldState = !in2? 'internal bypass (set_internal_8420_bypass: AES→AES inside the MN CS8420, TXOFF)' : in1? 'AUX mode (set_main8420_aux_synh: AES→SRC→serial→SHARC→AES, clocked from the REF CS8420)' : 'bypass across the SHARC (set_main8420_bypass: no SRC, recovered clock)';
    m.querySelector('#old').innerHTML = `<p class="small">One input path (MN CS8420 = audio, REF CS8420 = reference only), five jumpers on RB3–RB7 (20/24, DITHER, REMOTE, TRIM/VOL, TEST TONE), PIC crystal 4.9152 MHz, no CPLD. Main loop:</p>
      <div class="mono small">switch_A_in → AtoD → Histerz → Init_monitor → Link_to_SHARC → SHARC_mode_analize → jmp_input → debounce → test_lock_state → AES_output_control → REF_channel_status → MN_channel_status → RED_LED_processing → delay (1536 Tcy)</div>
      <p class="small">With the inputs as set now, test_lock_state would pick: <b>${oldState}</b>. Test-tone mode swaps the MN CS8420 to serial-port slave (SHARC is master) and flashes AUDIO LOCK every 0x44 passes.</p>
      <p class="small">The SHARC side (8205core.asm) is lost; only <span class="mono">8205CORE.MAP</span> and the binary <span class="mono">8205CORE.21K</span> remain. The MAP still names its routines: aud_r_asserted, ctrl_r_asserted, jumpers_analize (ja_stp4 … ja_stp21_22), ap_mono, gen_test_tone, trim_lookup_tbl, vol_lookup_tbl, vol_detector, peak_detector.</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__d8205Active = false;
  m.innerHTML = card('What the D8205 and its firmware are up to', `<ol>
    <li><b>The PIC is not clocked by X1.</b> The BOM's “X1 3.58” is the ML6431 video-genlock crystal (d8200-2.net: X1 → U7-11/12), unused on a D8205. The PIC's OSC1 is <span class="mono">PIC_CLK</span> from CPLD pin 8, and <span class="mono">d8200_top.rpt</span> shows it as two toggle stages on OSC2: 24.576 MHz ÷ 4 = 6.144 MHz. With that clock the pass time works out to ≈1.33 ms, and the comment in <span class="mono">Hysterisis</span> (“Locking time is about 4 second”) checks out: 256 × 12 passes ≈ 4.1 s.</li>
    <li><b>Two test lines left in v1.104.</b> <span class="mono">flush8420reg</span> contains <span class="mono">MOVLW 0; ;TESTING</span> twice: CH1 register 2 and CH2 register 3 (Data Flow Control) are written as 0x00 on every pass. Whatever <span class="mono">set_MODE_x</span> and <span class="mono">shut_off_AES_output_CH2</span> put in CH2_8420reg3 (TXOFF, SRC routing) never reaches CS8420 #2. Per the CS8420 register layout ${inf}, 0x00 routes the SRC output to the AES transmitter with the SRC fed from the serial port; worth checking on a real card.</li>
    <li><b>Two numbering systems.</b> Firmware CH1 = U6 = the manual's <i>Input 2 (main audio)</i>; firmware CH2 = U5 = <i>Input 1 (main reference)</i>. So <span class="mono">d820x.h</span> says “JMP_9/10: 00 = input1” while <span class="mono">jumpers.txt</span> and the manual say “ON ON = Input 2”. They agree once you map CH1 → Input 2. The SHARC source labels case 0 “INPUT 1” (= CH1 = Input 2).</li>
    <li><b>Pot-mode naming is reversed.</b> <span class="mono">d820x.h</span> calls JMP_3 = 1 “mono control (CH1-L, CH2-R)”. The manual calls the same setting (H3 OFF, default) “stereo level controls: RV1 for Input 1, RV2 for Input 2”. The code (<span class="mono">D8205_mono_control</span>) gives one pot per input, as the manual says.</li>
    <li><b>Output 1 goes dark without Input 2, whatever it carries.</b> In the default mode 4, <span class="mono">set_MODE_4</span> sets TXOFF on CH1 when CH1 is unlocked, and the v1.01 patch in <span class="mono">MODE_4_handler</span> calls it again on every change. Output 1 is switched off even when H11/H12 route Input 1 or the test tone to it.</li>
    <li><b>ERR is on whenever either input is missing.</b> <span class="mono">LED_processing</span> (D8205) lights LED_3 for an unlocked CH1 or CH2. A card used with one input (internal SRC, test tone) shows red permanently. The confidence and biphase bits are read into FLG_ERROR_CH1/2 in <span class="mono">jmp_input</span> but the D8205 build never uses them, although the manual says ERR shows “a confidence error”.</li>
    <li><b>Lock changes are debounced like jumpers.</b> The lock bits sit in MODE1 bits 7/6 and pass through <span class="mono">debounce</span>, so the card reacts to a lost input 31 passes (≈41 ms) late, then holds both outputs off for 85 passes (≈113 ms).</li>
    <li><b>The mix has no headroom.</b> Case 2 is <span class="mono">f10 = f0 + f2</span>. Two coherent −6 dBFS signals reach full scale, and anything louder saturates (ALUSAT is set in <span class="mono">start</span>).</li>
    <li><b>The test tone is computed for 48 kHz.</b> <span class="mono">tt_max_freq = 24000</span>, so at a 44.1 kHz reference the “1 kHz” tone is 919 Hz (the manual does say “referenced to a 48 kHz sample rate”). <span class="mono">jumpers_analize_D8205</span> zeroes tt_cnt and re-inits the tone on every jumper or lock change.</li>
    <li><b>“PROC” LED.</b> The silkscreen still says PROC (the 1999 design's LED_PROC = SHARC signal detector). The manual calls the yellow LED “internal reference lock”; v1.104 lights it for real_mode 0–2.</li>
    <li><b>Mislabelled net.</b> In d8200-2.net the H13 wire is called <span class="mono">JACK-SEL</span>, but the CPLD's <span class="mono">JACK_OUT</span> uses s13 = pin 37 = H14. H14 is the monitor jumper, H13 is trim/volume (and the PIC never reads JMP 14).</li>
    <li><b>Remote gain costs two outputs.</b> Edge pins P1-19 and P1-21 go both to transformers T9/T10 (outputs 2-4, 2-5) and through R3/R4 to the PIC's RA2/RA5 remote inputs. <span class="mono">D8205R-75-2.cdr</span> shows the /R terminal with only four outputs plus L/R WIPER, +5V, GND. The same art calls for “10K LINEAR” remote pots; the manual says “audio taper”, and <span class="mono">jumpers.txt</span> says volume pots “should be logarithmic”.</li>
    <li><b>A 9-digit binary constant.</b> <span class="mono">AUD_OUTPUT_ROUTE B'010100000'</span> (D8205) has nine digits; it still equals 0xA0, the same as the D8206's <span class="mono">B'10100000'</span>. <span class="mono">MODE_XOR2</span> also defines the OUT1/OUT2 XOR bits swapped relative to MODE2 (harmless: the D8205 never tests them).</li>
    <li><b>1999 tables: the shipped binary is not the .ldb.</b> <span class="mono">vol_lktb.ldb</span> (Oct 18 1999|32) is the 90 dB log table. <span class="mono">8205CORE.21K</span> (Nov 15) holds the ±15 dB trim table and the linear 0 → +12 dB volume table from <span class="mono">lookup.C</span>'s output file <span class="mono">aa</span> (Nov 12): searching the binary finds 0.177828 (trim[0]) at PM 0x21015 and 3.965521 (vol[255]), not 3.43e-5 (log[1]). The core's source <span class="mono">8205core.asm</span> is missing; only its MAP remains.</li>
    <li><b>1999 leftovers.</b> <span class="mono">otladka/8205otl.asm</span> still has the header “DFT.ASM ADSP-2106x Discrete Fourier Transform” and a <span class="mono">_mul_engine</span> matrix routine. In <span class="mono">8205indc.asm</span>, <span class="mono">phase_detector</span> reads <span class="mono">dm(phs_sum+1)</span> although phs_sum is in PM. In <span class="mono">d8205.asm</span>, <span class="mono">Link_to_SHARC</span> raises CS_SHARC after the first byte, so only the frame code is sent under chip select. The <span class="mono">delay</span> comment says 1.54 ms (true at 4 MHz); the board's 4.9152 MHz crystal makes it 1.25 ms.</li>
    <li><b>Self-reset, not watchdog.</b> If the SHARC stops echoing 0xE4 for 256 passes (≈340 ms), <span class="mono">SHARC_link_control</span> jumps to WHOLE_RESET. The 1999 code had the same idea in <span class="mono">Init_monitor</span> (≈510 passes).</li>
    <li><b>README mismatches.</b> The folder README lists <span class="mono">D8205 - #test/</span> as empty, but it holds a full PCB/SCH/netlist set, and says <span class="mono">D8205 - #PNP #2016/</span> is empty while it holds <span class="mono">d8205-75-T.mdb/.prg</span>. The 2013|46 PnP lists EL5363/EL5263 drivers where the netlist has EL2280C, and both PnP files place R15 = 75R and R16 = 110R on both the /75 and /110 builds.</li>
    <li><b>Custom builds.</b> D8205-055 removes H3–H5 and turns H8 into a +8 dB gain jumper (SRC with dither, 16 bit). D8205-043 disables the reference input and makes RV1/RV2 per-output controls. Neither variant's firmware is identified in the tree (v1.104-055 exists for -055).</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>Loop pass ≈ 1.33 ms ${inf}: from 6.144 MHz and the SPI byte count; the step shares in the loop are estimates.</li>
    <li>“ON” = shunt on pins 2–3 = bit 0. ${inf}: the manual's defaults (all ON except H1) give exactly the code's 0-values, and the silkscreen prints ON/OFF beside the header.</li>
    <li>CS8420 lock acquire 20 ms, unlock flag 0.5 ms, SHARC boot 60 ms, SHARC cycle counts ${inf}.</li>
    <li>att_20dB / att_18dB = 0.1 / 0.126 ${inf} from their names; the constants are not in d820xcore.asm.</li>
    <li>SRC is ideal; inputs without SRC at a different rate are flagged as slipping rather than simulated sample by sample.</li>
    <li>OUT2's transmitter is shown as always on because of the TESTING line (finding 2); its audio is modelled as if the routing still worked.</li>
    <li>On a plain D8205 the remote A/D inputs read 0 ${inf}.</li></ul>`) + card('Sources', `<ul class="small mono">
    <li>#MF8200 #SERIES/D8205 - #Master #MF82/D8205 - #Engineering/D8205.pdf, D8205-055 Amendment.doc, D8205R-75-2.cdr, D8205 - #BAK/D8205.NET, D8205.bom</li>
    <li>…/D8205 - #SOFTWARE/D8205 - #pic #SOFTWARE/d8205.asm · …/D8205 - #SHARC  #SOFTWARE/8205tstn.asm, 8205indc.asm, 8205CORE.MAP, 8205CORE.21K, vol_lktb.ldb, otladka/* · …/D8205 - #lookuptb #SOFTWARE/lookup.C, aa</li>
    <li>#MF8200 #SERIES/D8200 - #Engineering #MF82/d8200 - #d820x/jumpers.txt, pic/v1.104/*.asm, d820x.h, sharc/d820xcore.asm, d820xdef.h, altera/d8200_top.rpt</li>
    <li>…/d8200 - #PCB/d8200-2.net, d8200 - #GERBERS/D8200-2.TOP, D8200-2.SLK · D8205-110 - #PNP #2016/d8205-110-T.prg, D8205 - #PNP #2016/d8205-75-T.prg</li>
    <li>#MF8200 #SERIES/8200 Series Rear Module options graphical Guides…/D8205 - rear module options.pdf · D8200 - #Engineering #MF82/Appendix D8205-043.doc</li></ul>`);
}

/* ---------------- register plugin ---------------- */
SIM.register({
  id:'d8205', name:`D8205 · adjustable-gain AES DA with SRC (${SIM.year(1999)})`, duration:1,
  product:'D8205', year:1999, family:'8200 Distribution Series',
  folder:'#MF8200 #SERIES/D8205 - #Master #MF82',
  summary:'MF82 plug-in card: two AES inputs, digital trim or volume on front-edge pots, mono, mix and a 1 kHz tone routed to two outputs, with sample-rate conversion to either input or an internal 48 kHz. A PIC16C73A, an EPM7128 CPLD, two CS8420s and an ADSP-21061 SHARC share the work, all set by 14 jumpers.',
  highlights:['Real D8200-2 board from the 2013 Gerbers, clickable jumpers, pots and terminations','Rear modules BNC1/BNC3/TB8205P from the rear-module guide','Lock → debounce → mode fallback → 85-pass mute on the timeline','16-nibble PIC→SHARC control frame and sample_proc_D8205 decoded live','11-step operator tutorial from the manual','Findings: TESTING lines in v1.104, CH numbering, 1999 tables'],
  depth:'Full model',
  stepUnits:[
    {label:'1 PIC loop pass', period:()=>PASS},
    {label:'1 control frame (16 passes)', period:()=>16*PASS},
    {label:'1 AES block (192 frames)', period:()=>192/(stateAt(SIM.t).d.fsOut||48000)},
    {label:'1 sample', period:()=>1/(stateAt(SIM.t).d.fsOut||48000)},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.25,'250 ms (mode change)'],[0.05,'50 ms'],[16*PASS,'1 control frame (21 ms)'],[0.004,'1 AES block (4 ms)'],[PASS,'1 loop pass (1.33 ms)'],[0.0002,'200 µs (SPI bytes)'],[4/48000,'4 samples (83 µs)']],
  defaultZoom:1,
  init(){ window.__d8205Active = false; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: setting up a D8205', render:viewTutorial},
    {id:'second', label:'One second, layer by layer', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
