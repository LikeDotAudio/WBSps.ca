/* =====================================================================
   AVM4 — 2RU "AVM4 AUDIO/VIDEO MONITOR SYSTEM" (Ward-Beck Systems SELECT SERIES, 2002|35)
   Plugin for the WBS Device Simulator (../siumulation.html).  Manifest id: avm

   Sources used (all in "#AV #SERIES/XXX - AVM - #OBSOLETE #Archive/AVM4 - #Master/"):
   - AVM4 - #Software/Avm4/avm4v100.asm + init.asm, ee_data.asm, uart.asm, mode1.asm (built), mode.asm (NOT built)
       main board PIC16F874 "Audio Video Monitor Switcher (AVM4) version 1.00, January 30, 2002"
   - AVM4 - #Software/Avm41/41v100/41v100.asm + init.asm, bar_meter.asm, ADCONVERTER.ASM  (front LED meter PIC, 19 Feb 2002)
   - AVM4 - #Software/Avm42/42v100.asm + init.asm  (video switcher PIC, 7 Feb 2002), .pjt/.ERR files
   - AVM4 - #PCB #ISS1/AVM4-1ISS1.net/.bom (front board: U35 PIC16F874 TQFP-44, U1 SLG2016, 2 × 17 LEDs, X2 4.9152 MHz)
   - AVM4 - #PCB #ISS1/AVM4-2ISS1.net/.bom/.ECO (video board: U4 PIC16C73, U1/U2 GX414, U3 EL2044, U5 75176, X1 4M9152)
   - AVM WIRING.sch (P-CAD, strings only: "AMS4 ISSUE5 MAIN BOARD", DEMUX-2, AVM4-1, AVM4-2, LCD MONITOR, R54 75R)
   - AVM4.cdr ("AVM4 FUNCTIONAL DIAGRAM") and AVM manual1.cdr (cover drawings) — converted with Inkscape
   - AVM4 - #SILK/avm4-frontssv1.cdr, AVMBCKSSILK_V1.cdr → Inkscape → tools cut (Artwork 2026|59) → assets/avm-front.svg, avm-rear.svg (vector; the older PNG cuts avm-front-white.png, avm-rear-white.png are no longer used)
   - AVM4 - #MECHANICAL/AVM4-M1.dwg (front panel 17.100 × 3.398 in, "PAINT EXTRA FINE TEXTURED WBS BLACK")
   - AVM4MAN.pdf (2-page manual: SETUP MODE, SETP / SAVE, NL, MUTE, specifications)
   - #DEMUX #SERIES/XXX - DEMUX2 - #Master #OBSOLETE/.../#v101/2v101.asm + demux-2.asm (the DEMUX-2 side of the link)
   - siumulation-plugins/ams4.js (sister product: AMS4 issue-5 main-board pin map, LF353/LM3916 time constants)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
'use strict';
const SIM = window.SIM;
const ID = 'avm', FLAG = '__avmActive';
const ASSET = 'siumulation-plugins/assets/';
const AVMS='#AV #SERIES/XXX - AVM - #OBSOLETE #Archive/AVM4 - #Master/AVM4 - #SILK/', AVMM='#AV #SERIES/XXX - AVM - #OBSOLETE #Archive/AVM4 - #Master/';
/* Artwork 2026|59 footnotes: small facts the CorelDRAW panel files show */
const FOOT=[
 {text:'The front sheet holds the whole panel twice. The upper copy has no legends at all but draws the MODE/SOURCE display window and the STEREO and HEADSET areas as solid shapes; the lower copy carries every legend. They are a layout copy and the silk copy, not two ink plates (<span class="tag-inf">inferred</span>: both carry the wordmarks and the stripe).', src:AVMS+'avm4-frontssv1.cdr'},
 {text:'On the meter scale the 0 dB step is printed “R”, not “0”: the live-text legend between +1 and −1 is the letter R (the same font object as the R over the right-hand column).', src:AVMS+'avm4-frontssv1.cdr'},
 {text:'Every front legend except WARD-BECK SYSTEMS and SELECT SERIES is live Arial text (scale, L R PK, MODE, SOURCE, PHASE 0° 180°, STEREO LEFT RIGHT, HEADSET, the AVM4 title), so the file depends on the fonts installed when it is opened. As converted, the scale numbers have ragged right edges and overlap the R LED column; the simulator sets them left-aligned just right of the LEDs.', src:AVMS+'avm4-frontssv1.cdr'},
 {text:'The rear sheet draws every connector body as a solid black disc or block (8 video BNCs, 4 AES BNCs, the terminal strips, the mute block) but no mains inlet at all: only “115 VAC, 1 A.S.B” and the caution text mark where it goes.', src:AVMS+'AVMBCKSSILK_V1.cdr'},
 {text:'The AES 110 Ω euroblocks are labelled with stacked numbers, “1 over 2” and “3 over 4”, while the AES BNCs read 1 3 on top and 2 4 below.', src:AVMS+'AVMBCKSSILK_V1.cdr'},
 {text:'Both silk files are stored twice, byte for byte: in AVM4 - #Master/AVM4 - #SILK and in AVM4 &amp; AVM4E - #Mechanical #Obsolete/AVM4/Silks. AVM4.cdr and AVM manual1.cdr are also duplicated in the #MANUAL sub-folder (as AVM4.cdr and AVM #manual.cdr).', src:'#AV #SERIES/XXX - AVM - #OBSOLETE #Archive/AVM4 & AVM4E - #Mechanical #Obsolete/AVM4/Silks/avm4-frontssv1.cdr'},
];
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const card = (t,b,extra)=>`<div class="card"${extra||''}><h2>${t}</h2>${b}</div>`;
const hx = (v,n)=> (v>>>0).toString(16).toUpperCase().padStart(n||2,'0');
const bn = (v,n)=> (v>>>0).toString(2).padStart(n||8,'0');
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const clone = o => JSON.parse(JSON.stringify(o));
const css = n => SIM.css(n);

/* ---------------- clocks and firmware constants ----------------
   X2 (AVM4-1) and X1 (AVM4-2) are 4.9152 MHz; SPBRG = 7 with BRGH = 0 gives 9600 baud only at 4.9152 MHz.
   The .pjt files still say "Frequency=4000000" (copied from an AMS-1 project: "0=ams1v101.asm"). */
const FOSC = 4.9152e6, TCY = 4/FOSC;               // 813.8 ns per instruction
const DUR = 4;                                     // simulated window (s)
const BYTE_T = 10/9600;                            // 8N1 byte, 1.042 ms
const K = {
  LOOP_CY: 710,      // main-loop pass, hand count (3 SPI transfers ≈ 490 cy dominate) — inferred
  PROBE_CY: 25,      // program1 loop pass (send/receive only) — inferred hand count
  WIN_CY: 44,        // display_version loop pass — inferred hand count
  PWRT: 0.072,       // power-up timer; config bits are not in the source — inferred
  BOUNCE: 0x0A,      // bounce_num equ 0x0A
  LOCK_NUM: 7, LOCK_NUM1: 10, LOCK_NUM2: 1, LOCK_NUM3: 2, LOCK_NUM4: 5,
  BCOUNT: 0x0F,      // auto_detect
  PH_TH: 100,        // phase: movlw 100 ; phase threshold
  RX_LOCK: 0.003,    // CS8415A PLL relock after an input change — inferred
  DMX_READY: 0.10,   // DEMUX-2 PIC/GS9023 ready after power-on — inferred
  DMX_REPLY: 0.0012, // DEMUX-2 v101 "delayed response" comout0/comout1 = 1 × 10 passes — inferred time
  DMX_SETTLE: 0.04,  // GS9023 re-selects its audio group — inferred
  EE_WR: 0.004,      // PIC16F87x data EEPROM write (typ.) — inferred
  VU_TAU: 0.047,     // AMS4 main board R52 1M × C80 0.047 µF (ams4.js BOM reading)
  PK_DECAY: 0.6,     // peak detector release on the AMS4 board — inferred
  PH_TAU: 0.020,     // R118 20k × C132 1 µF on PHASE_V (ams4.js)
  HOLD_T: 1.5,       // AVM4-1 PEAK_LED comment "HOLD +3 LED FOR 1.5 SECONDS"
  T2: 4*161*4*9/FOSC,// AVM4-1 Timer2: PR2 = period_vu 160, T2CON 0x45 = prescale 1:4, postscale 1:9 → 4.716 ms
};
const LOOP_T = K.LOOP_CY*TCY;                      // ≈ 0.578 ms
const STEPS = [  // main: … in avm4v100.asm order, with hand-counted cycles (inferred)
  ['clrwdt · input_routine',8,'MODE (RB7) / SOURCE (RB6) → input'],
  ['remember',10,'MODE held 20 × 256 passes → “SETP” / “SAVE”'],
  ['debounce',10,'bounce_count = 10 passes'],
  ['read8415',185,'SPI read of CS8415 reg 16 (UNLOCK bit 4)'],
  ['auto_detect',8,'15 unlocked passes → flip 75 Ω / 110 Ω'],
  ['display_setup',10,'sw_mode / sw_source'],
  ['unlock_source',5,'disctl,2|3 · input_flag,7'],
  ['analog_mode · aes_mode · sdi_mode · setup_mode',45,'build dis3…dis0 (mode1.asm, ORG 0x900)'],
  ['refresh',34,'4 × SLG2016 writes on PORTD/PORTE'],
  ['output_control',8,'XPT1–4 (RC2–RC5), XPTAES (RA2)'],
  ['phase',8,'ADRESH(AN0) ≥ 100 → RA3 = red'],
  ['digital_output · mute_check · lock_count',20,'cs8415reg2 ← input; EXT MUTE (RA4) → tally (RA5)'],
  ['reg2 · reg4',310,'two SPI writes to the CS8415 every pass'],
  ['eewrite',6,'46 336 released passes → save'],
  ['communication_control · pole · scanuart · loss_of_com',16,'RS-485 bookkeeping'],
  ['tx_setup · processdata · settxdata · txuart',27,'build tx0 / tx3, send one byte per pass'],
];
const STEP_CY = STEPS.reduce((a,s)=>a+s[1],0);
const STEP_FRAC = (()=>{ let a=0; return STEPS.map(s=>{ const r=a/STEP_CY; a+=s[1]; return r; }); })();

/* SLG2016 character codes: charX equ b'1…' = 0x80 | ASCII (bit 7 is ~BL on RD7) */
const AUD_NAMES = ['A1','A2','A3','A4','D1','D2','D3','D4','S1','S2','S3','S4','S5','S6','S7','S8'];
const VID_NAMES = ['X','1','2','3','4','5'];
const lowbit = v => { for (let i=0;i<8;i++) if (v&(1<<i)) return i; return 0; };
const AES_OF_S = {3:0, 4:1, 1:2, 2:3};             // digital_output: D1 → cs8415reg2s3, D2 → s4, D3 → s1, D4 → s2
const S_OF_AES = [3,4,1,2];

/* ---------------- the world around the unit (one window) ---------------- */
function defWorld(){ return {
  power: true, demux: true,                       // DEMUX-2 option fitted
  ana: [ {on:true, lvl:4, ph:0}, {on:true, lvl:-2, ph:180}, {on:true, lvl:10, ph:'unc'}, {on:false, lvl:4, ph:0} ],   // dBu, L/R phase
  aes: [ {c75:true, c110:false, lvl:-20, ph:0}, {c75:false, c110:true, lvl:-12, ph:0}, {c75:false, c110:false, lvl:-20, ph:0}, {c75:true, c110:true, lvl:-20, ph:0} ],
  sdi: { on:true, pairs:0b00001111, lvl:-18 },    // embedded pairs 1–8 present (bit n = SDn+1)
  vid: [true, true, false, true],                 // composite INPUT 1–4 connected
  mute:false, headset:false, stereo:true, vol:[0.7,0.7],
  ee: {},                                          // PIC data EEPROM (blank = first power-up)
  dm: { idx:0, b1:0, selT:-9, sdion:0 },          // DEMUX-2 receiver state
  v2: { sel:0, b1:0, adr:0 },                      // AVM4-2 receiver state (GX414 select)
}; }

/* ---------------- INIT (init.asm) ---------------- */
function initF(W){
  const F = {
    input:0, bounce_reg:0, bounce_count:K.BOUNCE, bounce_flag:0, input_flag:0x80, mute_flag:0, press_flag:0,
    delay1:0, delay2:20, dis:[0xA0,0xA0,0xA0,0xA0], bl:0,
    mode:1, sourcea:1, sourced:1, sources:1,
    cs8415_16:1, reg2:0x40, reg4:0x41, reg2w:-1,
    v1:[0,0x11,0x22,0x44,0x88,0], v2:[0,0,0,0,0,0xFF],     // video11..61, video12..62 (defaults A1–4/D1–4 → V1–4, SD → V5)
    sourceset1:0, sourceset2:0, sourceset3:0, setup:0, setup_dis:0, hold:0, temp3:0,
    lf:{0:0,1:0,2:7,3:7,4:7,5:0,6:0,7:7,8:0,9:7,10:0,11:7,20:0,21:2}, aes_dis:0, sdi_dis:0, analog_dis:0,
    disctl:0x08, lock:0, bcount:0, bcount1:0,
    lc0:0, lc1:K.LOCK_NUM1, lc2:K.LOCK_NUM4, lc3:K.LOCK_NUM2,
    xpt:[1,1,1,1], xptaes:1, rc0:0, ra1:1, red:0, tally:0, pinT:0,
    ee_data:0, rem2:0, rem3:128, rem4:75,
    txflags:0, polecount0:0, polecount1:10, polecount2:50, tx0:0, tx1:0, tx3:0, uart0:0, read:0, comout:0, comout2:0, comout3:250, count:10,
    txBusy:-1, rxq:[], phv:0, sdi:0,
  };
  // eecheck: address 120 must hold 0xAA (the code compares it twice)
  if (W.ee[120]===0xAA){
    F.ee_data = W.ee[0]||0; F.input_flag |= 0x04;
    for (let k=0;k<6;k++){ F.v1[k] = W.ee[101+2*k]||0; F.v2[k] = W.ee[102+2*k]||0; }
  }
  F.txflags |= 1;                                  // nomatch: bsf txflags,0
  return F;
}

/* ---------------- simulation of one window ----------------
   opt = { F: firmware state at window start (null → power-up at t=0), W: world at window start,
           ev: [{t0,t1,b:'mode'|'source'}], wev: [{t, path, val}], dur, rec } */
function simulate(opt){
  const W = clone(opt.W), dur = opt.dur||DUR, rec = opt.rec!==false;
  const R = { p:[], uart:[], notes:[], disp:[], vsel:[], rx:[], ee:[], spin:[], boots:[], off:[], world:[], meterSet:[] };
  const wev = (opt.wev||[]).slice().sort((a,b)=>a.t-b.t); let wi = 0;
  const ev = opt.ev||[];
  let F = opt.F ? clone(opt.F) : null;
  let t = 0;
  const note = (fn, txt, tt)=>{ if (rec) R.notes.push({t:tt===undefined?t:tt, fn, txt}); };
  const btn = (b, tt)=> ev.some(e=> e.b===b && tt>=e.t0 && tt<e.t1);
  const relT = (b, tt)=>{ const e = ev.find(e=> e.b===b && tt>=e.t0 && tt<e.t1); return e? e.t1 : tt; };
  const applyW = tt=>{ while (wi<wev.length && wev[wi].t<=tt){ const e=wev[wi++]; setPath(W, e.path, e.val); if (rec) R.world.push(e);
      if (e.path==='power'){ if (!e.val){ F=null; R.off.push(e.t); note('power','Power removed: the PIC, display, crosspoints and LCD go dark', e.t); } else { F=null; bootAt = e.t; } } } };
  let bootAt = opt.F ? -1 : (W.power ? 0 : -1);
  let lastDisp = null;
  const pushDisp = (tt, txt, blank)=>{ const s = blank? '    ' : txt; if (!rec) return; if (lastDisp!==s){ R.disp.push([tt,s]); lastDisp=s; } };
  const disStr = ()=> F.dis.slice().reverse().map(c=>String.fromCharCode(c&0x7F)).join('');   // dis3 is the left digit
  const setDis = (a,b,c,d)=>{ F.dis[3]=a; F.dis[2]=b; F.dis[1]=c; F.dis[0]=d; };
  const ch = s => 0x80 | s.charCodeAt(0);
  const BL = 0xA0;
  const dz = (k)=>{ F.lf[k]=(F.lf[k]-1)&255; return F.lf[k]===0; };      // decfsz
  const vsel0 = W.v2.sel; if (rec) R.vsel.push([0, W.v2.sel]);

  /* ---- bus: bytes that reach the DEMUX-2 and the AVM4-2 ---- */
  function busByte(b, tArr){
    // DEMUX-2 v101 scanuart: address byte must have bits 7,6,5 = 111
    if (W.demux && W.power){
      const dm = W.dm;
      if (b&0x80){ dm.b1 = ((b&0xE0)===0xE0 && tArr>=K.DMX_READY + (W._pwrT||0)) ? b : 0; }
      else if (dm.b1){
        const a = dm.b1; dm.b1 = 0; let reply;
        if (a&8){ reply = 0xE0; }                                         // sdi_check: movlw b'11100000' → tx0
        else {
          if ((a&0x10) && (a&7)!==dm.idx){ dm.idx = a&7; dm.selT = tArr; }  // setgroup1: group = index>>1
          dm.sdion = (a>>4)&1;
          const car = W.sdi.on, aud = car && ((W.sdi.pairs>>dm.idx)&1) && tArr-dm.selT>=K.DMX_SETTLE;
          reply = 0xE0 | (car?0:2) | (aud?0:1);                            // settx: bit1 = no carrier · readgs9023: bit0 = no lock
        }
        F && F.rxq.push({avail:tArr+K.DMX_REPLY+BYTE_T, b:reply});
        if (rec) R.uart.push({t0:tArr+K.DMX_REPLY, t1:tArr+K.DMX_REPLY+BYTE_T, dir:'rx', b:reply, lbl:'DEMUX-2 reply'});
      }
    }
    // AVM4-2 42v100 scanuart: address byte with bit 7 = 1 and bits 6,5 = 00
    const v2 = W.v2;
    if (b&0x80){ if (!(b&0x60)){ v2.adr = b; v2.b1 = 1; } else v2.b1 = 0; }
    else if (v2.b1){
      v2.b1 = 0; const s = v2.adr & 7;
      if (s<=5 && s!==v2.sel){ v2.sel = s; if (rec) R.vsel.push([tArr+0.0002, s]); note('AVM4-2 switch/table', `uart0 = 0x${hx(v2.adr)} → table[${s}] → ${['no_video: ~CS1 = ~CS2 = 1 (both GX414 off)','av1: ~CS1 = 0, A1A0 = 00 → BNC 1','av2: ~CS1 = 0, A1A0 = 01 → BNC 2','av3: ~CS1 = 0, A1A0 = 10 → BNC 3','av4: ~CS1 = 0, A1A0 = 11 → BNC 4','s5: ~CS2 = 0, A1A0 = 00 → DEMUX-2 composite'][s]}. Its reply (tx0 = 0x3C) never reaches the bus: txuart toggles RC1, the 75176 DE/~RE is on RC5`, tArr+0.0002); }
    }
  }
  function uartTx(tt, b, lbl){ const t0=Math.max(tt, F.txBusy); F.txBusy=t0+BYTE_T; if (rec) R.uart.push({t0, t1:t0+BYTE_T, dir:'tx', b, lbl}); busByte(b, t0+BYTE_T); }

  /* ---- CS8415A input lock (UNLOCK bit of reg 16) ---- */
  function rxUnlock(tt){
    const s = F.reg2 & 7; let ok = false;
    if (s>=1 && s<=4){ const a = W.aes[AES_OF_S[s]]; ok = (a.c75 && F.rc0===0) || (a.c110 && F.ra1===0); }
    else if (s===5 || s===6){ const dm=W.dm; ok = W.demux && W.sdi.on && dm.sdion && ((W.sdi.pairs>>dm.idx)&1) && tt-dm.selT>=K.DMX_SETTLE; }
    if (tt - F.reg2T < K.RX_LOCK || tt - F.pinT < K.RX_LOCK) ok = false;
    return ok ? 0 : 1;
  }

  /* ---- power-up: INIT, program1 (DEMUX probe), opening_window ---- */
  function boot(t0){
    W._pwrT = t0; W.dm.b1=0; W.dm.idx=0; W.dm.selT=t0; W.v2.sel=0; W.v2.b1=0; if (rec) R.vsel.push([t0,0]);
    F = initF(W); F.reg2T = -9; let tt = t0 + K.PWRT + 300*TCY;
    const B = { t0, pwrt:t0+K.PWRT, probes:[], sdi:false };
    note('INIT', `Power-up timer (${(K.PWRT*1e3)|0} ms, ${''}inferred) → INIT: ports, UART 9600 8N1 (SPBRG 7), XPT1–4 = 1, XPTAES = 1, 110 Ω bank off / 75 Ω bank on, bcf portd,7 (display blank). EEPROM addr 120 ${W.ee[120]===0xAA?'= 0xAA → ee_data and video11…video62 restored':'≠ 0xAA → factory defaults (A1–A4/D1–D4 → video 1–4, SD1–8 → video 5)'}`, tt);
    let first = true;
    while (true){
      F.txBusy = -1; const a = tt; uartTx(tt, 0xE8, 'sdi check'); uartTx(tt, 0x55, 'sdi check');
      const end = F.txBusy; F.count--; B.probes.push([a, end]);
      if (F.count===0){ F.comout |= 2; tt = end; note('program1', `10th probe sent → comout,1 (SDI check complete) without a reply: no DEMUX → comout,0 = 0`, tt); break; }
      const r = F.rxq.shift();
      if (r && (r.b&0xC0)===0xC0){ F.comout |= 3; tt = r.avail; B.sdi = true; note('program1/receive', `RCREG = 0x${hx(r.b)} → andlw 0xC0 = 0xC0 → comout,0 (DEMUX present), comout,1 (check complete)`, tt); break; }
      F.rxq = [];
      const passes = first ? (256-250)*256 : (256-230)*256; first = false;
      tt = end + passes*K.PROBE_CY*TCY;
      note('program1/receive', `no reply: comout2/comout3 time out after ${passes} probe passes (${(passes*K.PROBE_CY*TCY*1e3).toFixed(0)} ms) → comout3 = 230, send again`, tt);
    }
    B.win = [tt, tt + 25600*K.WIN_CY*TCY];
    pushDisp(t0, '', true);
    F.dis = [ch('0'),ch('0'),ch('1'),ch('V')]; pushDisp(B.win[0], 'V100');
    note('opening_window', `display_version: “V100” for window_counter × window_counter1 = 256 × 100 passes ≈ ${((B.win[1]-B.win[0])*1e3).toFixed(0)} ms`, B.win[0]);
    tt = B.win[1];
    // bsf PORTB,5 (8415 out of reset), translate, display_setup, reg1/2/4/6/17
    translate(); F.sdi = F.comout&1;
    B.main = tt; R.boots.push(B);
    note('translate', `ee_data = ${bn(F.ee_data)} → mode ${['','analog','AES',,'SDI'][F.mode]}${F.comout&1?'':' · no DEMUX: any video “5” assignment rewritten to the matching composite input'}`, tt);
    return tt;
  }
  function translate(){
    if (!(F.input_flag&4)) return;
    F.input_flag &= ~4; F.input_flag |= 2;
    F.mode=0; F.sources=0; F.sourcea=0; F.sourced=0;
    const e=F.ee_data;
    const fixV = ()=>{ if (F.comout&1) return; for (let a=0;a<8;a++) if ((F.v1[5]>>a)&1) F.v1[1+(a&3)] |= 1<<a; F.v1[5]=0; };
    if (e&0x20){ F.mode=2; F.sourced = e&15; F.sources=1; F.sourcea=1; fixV(); }
    else if ((e&0x40) && (F.comout&1)){ F.sourced=1; F.sourcea=1; F.mode=4; F.sources = (e&16)? (e&15)<<4 : (e&15); }
    else { F.mode=1; F.sourcea = e&15; F.sourced=1; F.sources=1; fixV(); }
  }

  /* ---- video-map helpers (video11…video61 / video12…video62) ---- */
  const vidOf = a => { const arr = a<8? F.v1 : F.v2, bit = a&7; let v=-1; for (let k=0;k<6;k++) if ((arr[k]>>bit)&1) v=k; return v; };     // display: last match wins
  const vidTx = a => { const arr = a<8? F.v1 : F.v2, bit = a&7; for (let k=0;k<6;k++) if ((arr[k]>>bit)&1) return k; return -1; };     // tx_setup: first match wins
  const vch = v => v<0 ? BL : v===0 ? ch('X') : ch(String(v));
  const curAud = ()=> F.mode&1 ? lowbit(F.sourcea) : F.mode&2 ? 4+lowbit(F.sourced) : F.mode&4 ? 8+lowbit(F.sources) : -1;

  /* ---- mode1.asm display routines ---- */
  function analog_lock(){ const n=lowbit(F.sourcea); setDis(ch('A'), ch(String(n+1)), BL, vch(vidOf(n)));
    F.ee_data = (F.ee_data&0x80) | (F.sourcea&15); }
  function display_aes(){ const n=lowbit(F.sourced); setDis(ch('D'), ch(String(n+1)), BL, vch(vidOf(4+n)));
    F.ee_data = (F.ee_data&0x80) | 0x20 | (F.sourced&15); }
  function display_sdi(){ const n=lowbit(F.sources); setDis(ch('S'), ch(String(n+1)), BL, vch(vidOf(8+n)));
    F.ee_data = (F.ee_data&0x80) | 0x40 | (n<4 ? (1<<n) : (1<<(n-4))|0x10); }
  const digital_mute = ()=>{ F.xptaes = 1; };
  const digital_norm = ()=>{ F.xptaes = 0; };
  function flash(lo, hi){ if (!dz(lo)) return false; if (!dz(hi)) return false; F.lf[hi]=K.LOCK_NUM; F.lf[lo]=0; return true; }
  const MUTE = ()=> setDis(ch('M'),ch('U'),ch('T'),ch('E'));
  function analog_mode(){ if (!(F.mode&1)) return;
    if (F.mute_flag&1){ if (!flash(10,11)) return; F.analog_dis^=1; if (!(F.analog_dis&1)) return analog_lock(); MUTE(); return; }
    analog_lock(); }
  function aes_lock(){ if (F.mute_flag&1){ digital_mute(); return display_aes(); } if (!(F.disctl&8)) digital_norm(); display_aes(); }
  function aes_mode(){ if (!(F.mode&2)) return;
    if (F.mute_flag&1){ if (!flash(6,7)) return; F.aes_dis^=1; if (!(F.aes_dis&1)) return aes_lock(); MUTE(); return; }
    if (!(F.disctl&1)) return aes_lock();
    if (F.disctl&8) digital_mute();
    if (!flash(1,3)) return; F.aes_dis^=1; if (!(F.aes_dis&1)) return aes_lock(); setDis(BL, ch('N'), ch('L'), BL); }
  function sdi_lock(){ if (F.mute_flag&1){ digital_mute(); return display_sdi(); } if (!(F.disctl&8)) digital_norm(); display_sdi(); }
  function sdi_mode(){ if (!(F.mode&4)) return;
    if (F.mute_flag&1){ if (!flash(8,9)) return; F.sdi_dis^=1; if (!(F.sdi_dis&1)) return sdi_lock(); MUTE(); return; }
    if (F.disctl&2){ if (F.disctl&8) digital_mute(); if (!flash(0,2)) return; F.sdi_dis^=1; if (!(F.sdi_dis&1)) return sdi_lock(); setDis(BL, ch('N'), ch('L'), BL); return; }
    if (F.disctl&1){ if (F.disctl&8) digital_mute(); if (!flash(5,4)) return; F.sdi_dis^=1; if (!(F.sdi_dis&1)) return sdi_lock(); F.dis[2]=BL; return; }
    sdi_lock(); }
  function setup_mode(){
    if (!(F.sourceset1&0x80)) return;
    const a = F.sourceset2 ? lowbit(F.sourceset2) : 8+lowbit(F.sourceset3);
    F.dis[3] = ch(a<4?'A':a<8?'D':'S'); F.dis[2] = ch(String((a<8?a&3:a-8)+1));
    const arr = a<8? F.v1 : F.v2, bit = a&7;
    if (!(F.setup&1)){ F.setup|=1; F.sourceset1 &= 0xC0; for (let k=0;k<6;k++) if ((arr[k]>>bit)&1) F.sourceset1 |= 1<<k; }
    for (let k=0;k<6;k++){ arr[k] &= ~(1<<bit); if ((F.sourceset1>>k)&1) arr[k] |= 1<<bit; }       // reset_videoN
    // finish_setup: flash the video digit
    if (F.setup_dis&2){ if (!dz(20)) return; if (!dz(21)) return; F.lf[21]=K.LOCK_NUM3; F.lf[20]=0; F.setup_dis^=1;
      if (F.setup_dis&1){ F.dis[1]=BL; F.dis[0]=BL; return; } }
    F.setup_dis |= 2; F.dis[1]=BL;
    let c = BL; for (let k=1;k<=5;k++) if ((F.sourceset1>>k)&1) c = ch(String(k)); if (F.sourceset1&1) c = ch('X'); F.dis[0]=c;
  }

  /* ---- one main-loop pass (avm4v100.asm "main") ---- */
  function pass(t){
    let dt = LOOP_T, ext = 0; const mb = btn('mode',t), sb = btn('source',t);
    const r = rec ? { t, ev:[] } : null;
    // input_routine
    if (!(F.mute_flag&1)){ F.input = (mb?2:0)|(sb?4:0); }
    // remember (MODE held)
    if (!mb){ F.delay1=0; F.delay2=20; }
    else { F.delay1=(F.delay1-1)&255; if (F.delay1===0){ F.delay2=(F.delay2-1)&255; if (F.delay2===0){
      const save = F.hold&1; F.dis = save? [ch('E'),ch('V'),ch('A'),ch('S')] : [ch('P'),ch('T'),ch('E'),ch('S')]; F.bl=1; pushDisp(t, save?'SAVE':'SETP');
      const rel = relT('mode', t); if (rec) R.spin.push([t, rel, save?'SAVE':'SETP']);
      note('remember', `MODE held for delay2 × delay1 = 20 × 256 passes → “${save?'SAVE':'SETP'}” → refresh, then remember3 spins on “btfss portb,7” (only clrwdt) until MODE is released${rel-t>0.001?` — the whole main loop stops for ${((rel-t)*1e3).toFixed(0)} ms`:''}`, t);
      ext = Math.max(0, rel - t); dt += ext;
      if (!save){ F.sourceset2=1; F.sourceset3=0; F.setup_dis&=~3; F.sourceset1|=0x80; F.temp3 = (F.mode&7)<<1; F.mode=0; F.hold|=1; F.setup&=~1;
        note('stage_1', `sourceset1,7 = 1 (setup), sourceset2 = A1, temp3 ← mode (${['','analog','AES',,'SDI'][F.temp3>>1]||'?'}), mode = 0, hold,0 = 1`, t+dt); }
      else { F.sourceset1&=~0x80; F.mode = (F.temp3>>1)&7; F.hold&=~1;
        note('stage_2', `sourceset1,7 = 0, mode ← temp3 (${['','analog','AES',,'SDI'][F.mode]}), hold,0 = 0. The new video map is saved by eewrite later`, t+dt); }
      F.delay1=0; F.delay2=20; } } }
    // debounce
    if (F.bounce_flag&1){
      if (F.input){ F.bounce_count=K.BOUNCE; }
      else { F.bounce_count=(F.bounce_count-1)&255; if (F.bounce_count===0){ F.bounce_flag&=~1; F.press_flag|=4; F.bounce_count=K.BOUNCE; } }
    } else if (!F.input){ F.bounce_count=K.BOUNCE; }
    else if (F.bounce_reg!==F.input){ F.bounce_reg=F.input; F.bounce_count=K.BOUNCE; }
    else { F.bounce_count=(F.bounce_count-1)&255; if (F.bounce_count===0){ F.bounce_flag|=1; F.input_flag|=1; F.txflags|=1; F.press_flag&=~4; F.bounce_count=K.BOUNCE;
      note('debounce', `${F.input&2?'MODE (RB7)':'SOURCE (RB6)'} low for ${K.BOUNCE} passes → bounce_flag,0, input_flag,0, txflags,0 (ask for an RS-485 update)`, t); } }
    // read8415
    F.cs8415_16 = rxUnlock(t);
    // auto_detect
    if (F.mode&2){
      if (F.disctl&1){ F.bcount=(F.bcount-1)&255; if (F.bcount===0){ F.ee_data^=0x80; F.bcount=F.bcount1=K.BCOUNT; F.lock|=1;
          if (F.ee_data&0x80){ F.rc0=1; F.ra1=0; } else { F.rc0=0; F.ra1=1; } F.pinT=t;
          note('auto_detect', `no lock for 15 passes → xorwf ee_data,0x80 → ${F.ee_data&0x80?'110 Ω: PORTA,1 = 0 (transformer receivers on), PORTC,0 = 1':'75 Ω: PORTC,0 = 0 (BNC receivers on), PORTA,1 = 1'}`, t); } }
      else if (F.lock&1){ F.bcount1=(F.bcount1-1)&255; if (F.bcount1===0){ F.bcount1=F.bcount=K.BCOUNT; F.lock&=~1; } }
      else { F.bcount=F.bcount1=K.BCOUNT; }
    }
    // display_setup
    if (F.input_flag&1){
      F.input_flag&=~1; F.input_flag|=0x42;
      [2,3,4].forEach(k=>F.lf[k]=K.LOCK_NUM); F.lf[0]=F.lf[1]=F.lf[5]=0; F.aes_dis=0; F.sdi_dis=0; F.lf[21]=K.LOCK_NUM3; F.lf[20]=0; F.setup_dis&=~3; F.disctl&=~3;
      if (F.input&2){
        if (F.sourceset1&0x80){ F.setup&=~1; const a0 = F.sourceset2? lowbit(F.sourceset2) : 8+lowbit(F.sourceset3);
          if (F.sourceset2&0x80){ F.sourceset2=0; F.sourceset3=0; if (F.comout&1) F.sourceset3=1; else F.sourceset2=1; }
          else if (F.sourceset3&0x80){ F.sourceset2=1; F.sourceset3=0; }
          else { const v = ((F.sourceset3<<8)|F.sourceset2)<<1; F.sourceset2=v&255; F.sourceset3=(v>>8)&255; }
          const a1 = F.sourceset2? lowbit(F.sourceset2) : 8+lowbit(F.sourceset3);
          note('sw_mode1', `setup: audio ${AUD_NAMES[a0]} → ${AUD_NAMES[a1]} (sourceset2/sourceset3 rotate${a0===7&&!(F.comout&1)?'; no DEMUX → back to A1':''}), setup,0 = 0 → reload its video`, t); }
        else { const o=F.mode; if (F.comout&1){ F.mode = (F.mode&4)? 1 : (F.mode<<1)&7; } else F.mode ^= 3;
          note('sw_mode', `mode ${['','analog','AES',,'SDI'][o]} → ${['','analog','AES',,'SDI'][F.mode]}${F.comout&1?' (rlf mode: A → D → S → A)':' (no DEMUX: xorwf mode,3 toggles A ⇄ D)'}`, t); }
      } else if (F.input&4){
        if (F.sourceset1&0x80){ const o=F.sourceset1&0x3F; const has5 = F.comout&1;
          if (((F.sourceset1&0x10) && !has5) || ((F.sourceset1&0x20))) { F.sourceset1 = 0x81; }
          else { F.sourceset1 = (((F.sourceset1&0x7F)<<1)&0x7F) | 0x80; }
          note('sw_source1', `setup: video ${VID_NAMES[lowbit(o)]} → ${VID_NAMES[lowbit(F.sourceset1&0x3F)]} (X → 1 → 2 → 3 → 4${has5?' → 5':''} → X)`, t); }
        else if (F.mode&1){ const o=lowbit(F.sourcea); F.sourcea = (F.sourcea&8)?1:(F.sourcea<<1)&15; note('sw_source', `analog: sourcea A${o+1} → A${lowbit(F.sourcea)+1}`, t); }
        else if (F.mode&2){ const o=lowbit(F.sourced); F.sourced = (F.sourced&8)?1:(F.sourced<<1)&15; note('sw_source', `digital: sourced D${o+1} → D${lowbit(F.sourced)+1}`, t); }
        else if (F.mode&4){ const o=lowbit(F.sources); F.sources = (F.sources&0x80)?1:(F.sources<<1)&255; note('sw_source', `sdi: sources S${o+1} → S${lowbit(F.sources)+1} (DEMUX index ${lowbit(F.sources)}, GS9023 group ${(lowbit(F.sources)>>1)+1})`, t); }
      }
    }
    // unlock_source
    if (F.input_flag&0x40){ F.disctl|=0x0C; F.input_flag|=0x80; F.input_flag&=~0x40; }
    // mode1.asm
    analog_mode(); aes_mode(); sdi_mode(); setup_mode();
    // refresh
    F.bl=1; pushDisp(t + ext + STEP_FRAC[8]*LOOP_T, disStr());
    // output_control
    if (F.input_flag&2){ F.input_flag&=~2; F.input_flag|=8;
      if (F.mode&1){ const n=lowbit(F.sourcea); for (let k=0;k<4;k++) F.xpt[k] = (k===n && !(F.mute_flag&1)) ? 0 : 1; F.xptaes=1; }
      else { F.xpt=[1,1,1,1]; F.xptaes=1; } }
    // phase (AN0 = PHASE_V, filtered XOR of the two comparators)
    { const tgt = phaseTarget(W, F); F.phv += (tgt - F.phv)*(1-Math.exp(-dt/K.PH_TAU)); F.red = (Math.round(F.phv*255) >= K.PH_TH) ? 1 : 0; }
    // digital_output
    if (F.input_flag&8){ F.input_flag&=~8;
      if (!(F.mode&1)){
        if (F.mode&4){ F.reg4=0x41; F.rc0=1; F.ra1=1; F.pinT=t; note('digital_output', 'sdi_output: PORTC,0 = 1 and PORTA,1 = 1 (both AES receiver banks off); the CS8415 input is chosen by tx_setup (s5/s6)', t); }
        else if (F.sourced){ const n=lowbit(F.sourced); F.reg2 = 0x40|S_OF_AES[n]; F.reg4=0x41; note('digital_output', `source${n+1}: cs8415reg2 ← cs8415reg2s${S_OF_AES[n]} (0x${hx(F.reg2)}): D${n+1} is wired to receiver input ${S_OF_AES[n]}`, t); }
      } }
    // mute_check (EXT MUTE IN = RA4, closure to ground)
    if (W.mute){ if (!(F.mute_flag&1)) note('mute_check', 'RA4 low → mute_flag,0, PORTA,5 = 1 (EXT MUTE TALLY), input_flag,1|4 → crosspoints off; MODE/SOURCE ignored while muted', t);
      F.mute_flag|=1; F.tally=1; F.input_flag|=0x12; }
    else if (F.mute_flag&1){ F.input_flag|=2; F.input_flag&=~0x10; F.mute_flag&=~1; F.tally=0; note('mute_check', 'RA4 high again → un-mute, input_flag,1 → output_control restores the crosspoint', t); }
    // lock_count
    if (!(F.input_flag&0x10)){
      if (F.input_flag&0x80){
        if (F.disctl&4){ F.lc1=K.LOCK_NUM1; F.lc0=0; F.lc3=K.LOCK_NUM2; F.lc2=K.LOCK_NUM4; F.input_flag&=~0x20; F.disctl|=8; F.input_flag&=~0x80; }
        else { F.lc3=K.LOCK_NUM2; F.lc2=K.LOCK_NUM4; F.lc0=(F.lc0-1)&255; if (F.lc0===0){ F.lc1=(F.lc1-1)&255; if (F.lc1===0){ F.lc1=K.LOCK_NUM1; F.lc0=0; F.input_flag|=0x20; F.disctl&=~8; F.input_flag&=~0x80;
          note('lock_count', 'locked for lock_counter1 × lock_counter = 10 × 256 passes → input_flag,5 = 1, disctl,3 = 0 (arms digital_norm)', t); } } }
      } else if (F.input_flag&0x20){ if (F.disctl&4){ F.xptaes=1; F.input_flag|=0x80; note('lock_count/regular_mode', 'lock lost → bsf porta,xptaes (D/A path off) at once', t); } }
      else if (!(F.disctl&4)){ if (F.xptaes) note('lock_count/reg_unlocked', 'lock seen → bcf porta,xptaes: the D/A path opens on this pass', t); F.xptaes=0; F.input_flag|=0x80; }
    }
    // reg2 / reg4: the CS8415 sees a new input only here
    if (F.reg2!==F.reg2w){ F.reg2w=F.reg2; F.reg2T=t + STEP_FRAC[12]*LOOP_T; if (rec) R.rx.push([F.reg2T, F.reg2]); }
    // eewrite
    if (F.press_flag&4){ F.rem2=(F.rem2+1)&255; if (F.rem2===0){ F.rem4=(F.rem4+1)&255; if (F.rem4===0){
      F.press_flag&=~4; const stall = 6*8*TCY + 13*K.EE_WR;
      W.ee[0]=F.ee_data; for (let k=0;k<6;k++){ W.ee[101+2*k]=F.v1[k]; W.ee[102+2*k]=F.v2[k]; } W.ee[120]=0xAA;
      if (rec) R.ee.push([t, t+stall+K.EE_WR]);
      note('eewrite', `press_flag,2 set for 181 × 256 released passes → 14 EEPROM writes (addr 0 ee_data = ${bn(F.ee_data)}, 101–112 video map, 120 = 0xAA). Each eew waits for the previous WR: the loop stalls ≈ ${(stall*1e3).toFixed(0)} ms`, t);
      dt += stall; F.rem2=0; F.rem4=75; } } }
    // communication_control
    if (F.txflags&1){ F.polecount2=(F.polecount2-1)&255; if (F.polecount2===0){ F.polecount2=50; F.txflags|=0x40; } }
    // pole
    if (!(F.txflags&0x18)){ F.polecount0=(F.polecount0-1)&255; if (F.polecount0===0){ F.polecount1=(F.polecount1-1)&255; if (F.polecount1===0){ F.polecount1=2; F.polecount0=0; F.txflags|=1; } } }
    // scanuart
    if (F.txflags&0x10){ const q=F.rxq; if (q.length && q[0].avail<=t){ const r0=q.shift(); F.uart0=r0.b; F.txflags&=~0x10; F.comout3=230; F.comout2=0; F.read|=1;
      note('scanuart', `RCREG = 0x${hx(r0.b)} → uart0 (carrier ${r0.b&2?'LOST':'ok'}, GS9023 audio ${r0.b&1?'no lock':'lock'})`, t); } }
    // loss_of_com
    if (F.txflags&0x10){ F.comout2=(F.comout2+1)&255; if (F.comout2===0){ F.comout3=(F.comout3+1)&255; if (F.comout3===0){ F.comout3=230; F.comout2=0; F.txflags|=0x80;
      note('loss_of_com', 'no reply for 26 × 256 passes → txflags,7: re-transmit', t); } } }
    // tx_setup
    let vsel;
    if (F.sourceset1&0x80) vsel = lowbit(F.sourceset1&0x3F);
    else if (F.mode&4){ const n=lowbit(F.sources); F.tx3 = (F.tx3&~7)|n; F.reg2 = (n&1)? 0x45 : 0x46; F.disctl = (F.disctl&0x3F) | ((n&1)?0x40:0x80); vsel = vidTx(8+n); }
    else { let a = (F.mode&2) ? 4+lowbit(F.sourced) : lowbit(F.sourcea); vsel = vidTx(a); }
    if (vsel>=0) F.tx0 = (F.tx0&0xF8) | vsel; else F.tx0 &= 0xF8;
    // processdata
    if (F.mode&4){ if (F.read&1){ F.read&=~1; if (F.uart0!==0x3C){ F.disctl = (F.disctl&~2) | (F.uart0&2); } }
      F.disctl = (F.disctl&~1) | F.cs8415_16; F.disctl = (F.disctl&~4) | ((F.disctl&3)?4:0); }
    else if (F.mode&2){ F.disctl = (F.disctl&~3) | F.cs8415_16; F.disctl = (F.disctl&~4) | ((F.disctl&3)?4:0); }
    // settxdata
    if ((F.txflags&0x80) || (!(F.txflags&0x18) && (F.txflags&0x40))){
      F.polecount1=2; F.polecount0=0; F.tx1=0x55; F.tx0&=~8; F.tx3&=~8; F.tx0|=0x10; F.tx3|=0x10;
      if (!(F.mode&4)) F.read&=~0x80; else F.read^=0x80;
      if (!(F.comout&1)) F.read&=~0x80;
      if (F.read&0x80){ F.tx0 = F.tx3 | 0x60; } else F.tx0 &= ~0x60;
      F.tx0 |= 0x80; F.tx1 &= 0x7F; F.txflags = 0x0E;
      note('settxdata', F.read&0x80 ? `read,7 = 1 → DEMUX message: tx0 = tx3 | 0xE0 = 0x${hx(F.tx0)} (index ${F.tx0&7}, bit 4 “sdi on”), tx1 = 0x55` : `read,7 = 0 → video message for the AVM4-2: tx0 = 0x${hx(F.tx0)} (a1a0 = 00, s2s1s0 = ${F.tx0&7} = video ${VID_NAMES[F.tx0&7]}), tx1 = 0x55`, t);
    }
    // txuart (one byte per pass when the shift register is empty)
    if ((F.txflags&8) && t>=F.txBusy){
      if (F.txflags&2){ uartTx(t, F.tx0, (F.tx0&0x60)?'DEMUX cmd':'video cmd'); F.txflags&=~2; }
      else if (F.txflags&4){ uartTx(t, F.tx1, 'level byte'); F.txflags&=~4; }
      else { F.txflags&=~8; F.txflags|=0x10; }
    }
    if (rec){ Object.assign(r, { dt, dis:disStr(), xpt:F.xpt.slice(), xa:F.xptaes, red:F.red, tally:F.tally, mode:F.mode, sa:F.sourcea, sd:F.sourced, ss:F.sources,
      setup:(F.sourceset1&0x80)?1:0, ss1:F.sourceset1, unl:F.cs8415_16, term:(F.rc0===0?1:0)|(F.ra1===0?2:0), disctl:F.disctl, txf:F.txflags, reg2:F.reg2, mute:F.mute_flag&1, phv:F.phv, aud:curAud(), hold:F.hold });
      R.p.push(r); }
    return dt;
  }

  /* ---- run the window ---- */
  applyW(0);
  if (bootAt===0 && !F) t = boot(0);
  else if (!F){ R.off.push(0); }
  while (t < dur){
    applyW(t);
    if (!F){
      if (bootAt>=0 && bootAt<=t+1e-9 && W.power){ const b=bootAt; bootAt=-1; t = boot(Math.max(b,t)); continue; }
      const nx = wi<wev.length ? wev[wi].t : dur; if (rec && R.p.length && R.p[R.p.length-1].dis!=='    ') {} pushDisp(t,'',true); t = Math.max(nx, t+1e-6); continue;
    }
    t += pass(t);
  }
  applyW(dur);
  R.final = { F, W };
  return R;
}
function setPath(o, path, val){ const k=path.split('.'); let x=o; for (let i=0;i<k.length-1;i++) x=x[k[i]]; x[k[k.length-1]] = val; }

/* ---------------- analog side: what reaches the D/A crosspoint, meter and phase detector ---------------- */
function routedSource(W, F){
  if (!F || !W.power) return null;
  const n = F.xpt.indexOf(0);
  if (n>=0 && !(F.mute_flag&1)){ const a=W.ana[n]; return a.on ? {lvl:a.lvl-4, ph:a.ph, name:'A'+(n+1)} : null; }      // 0 VU = +4 dBu
  if (!F.xptaes && !F.cs8415_16){
    const s = F.reg2&7;
    if (s>=1 && s<=4){ const a=W.aes[AES_OF_S[s]]; return {lvl:a.lvl+20, ph:a.ph, name:'D'+(AES_OF_S[s]+1)}; }      // 0 VU = −20 dBFS
    if (s===5||s===6) return {lvl:W.sdi.lvl+20, ph:0, name:'SD pair '+(W.dm.idx+1)};
  }
  return null;
}
function phaseTarget(W, F){ const s = routedSource(W, F); if (!s) return 0.5; const p = s.ph; return p==='unc' ? 0.5 : Math.min(1, Math.abs(p)/180); }

/* ---------------- AVM4-1 LED meter (41v100.asm) ---------------- */
// table (ORG 0xAFA): ADRESH → segment index 1…16 (17 = all off). Thresholds are the first code of each segment.
const SEG_START = [0,3,4,5,6,9,23,38,47,55,62,70,79,88,125,178,250];   // index = segment number (1…16); [0] unused
const SILK = ['-30','-28','-24','-20','-16','-8','-4','-2','-1','R','+1','+2','+3','+6','+9','+12'];   // front silk, bottom → top ("R" = 0 in the artwork)
const LBL  = ['signalp','signal28','signal24','signal20','signal10','signal7','signal5','signal3','signal1','signal0','signalp1','signalp2','signalp3','signalp6','signalp9','signalp12'];
const codeOf = db => Math.max(0, Math.min(255, Math.round(62*Math.pow(10, db/20))));                // 0 VU = code 62 (inferred from the table: +6 = 125, +12 = 250)
function segOf(code){ let s=0; for (let k=1;k<=16;k++) if (code>=SEG_START[k]) s=k; return s; }

/* ================================================================
   CONTROLLER: one 4-second window at a time, re-simulated on every action
   ================================================================ */
const D = { W0:defWorld(), F0:null, ev:[], wev:[], R:null, log:[], trace:null, winNo:0, tAbs:0, seen:{}, lesson:0 };
function resim(){ D.R = simulate({F:D.F0, W:D.W0, ev:D.ev, wev:D.wev}); D.R.notes.forEach(n=>{ D.seen[n.fn]=1; }); D.R.spin.forEach(s=>{ D.seen['spin:'+s[2]]=1; }); D.R.ee.forEach(()=>{ D.seen.ee=1; }); if (D.R.boots.length) D.seen.boot=1; }
function shiftTimes(F, W, dt){ if (F){ F.txBusy-=dt; F.rxq.forEach(q=>q.avail-=dt); F.reg2T-=dt; F.pinT-=dt; } W.dm.selT-=dt; if (W._pwrT!==undefined) W._pwrT-=dt; }
function roll(t, quiet){
  const R = simulate({F:D.F0, W:D.W0, ev:D.ev, wev:D.wev, dur:t, rec:false});
  D.F0 = R.final.F; D.W0 = R.final.W; shiftTimes(D.F0, D.W0, t);
  D.ev=[]; D.wev=[]; D.winNo++; D.tAbs += t; resim(); if (!quiet) SIM.seek(0);
}
function actT(len){
  let t = SIM.t;
  for (const e of D.ev) if (t>=e.t0-0.02 && t<e.t1+0.03) t = e.t1+0.03;
  if (t + len > DUR - 0.12){ roll(SIM.t, true); t = 0.02; }
  return t;
}
function logAction(name, t0, t1, pre){
  const ns = D.R.notes.filter(n=> n.t>=t0-1e-6 && n.t<=t1), seen = {}, rows = [];
  ns.forEach(n=>{ const k=n.fn+'|'+n.txt; if (seen[k]){ seen[k].n++; return; } seen[k]={n:1, t:n.t, fn:n.fn, txt:n.txt}; rows.push(seen[k]); });
  const tr = (pre||[]).concat(rows.map(r=>`${SIM.fmtT(r.t)}  ${r.fn}: ${r.txt}${r.n>1?`  (repeats on ${r.n} passes)`:''}`));
  if (tr.length===(pre||[]).length) tr.push('(no firmware routine reacted inside this time span — see the timeline)');
  D.trace = {name, lines:tr}; D.log.unshift({abs:D.tAbs+t0, name, n:tr.length}); if (D.log.length>60) D.log.length=60;
}
const A = {
  press(b){ const len=0.12, t=actT(len); D.ev.push({b, t0:t, t1:t+len}); resim();
    logAction(`Press ${b.toUpperCase()} (${len*1e3} ms)`, t, t+0.35, [`${b==='mode'?'PB1 MODE → H1-15 → main-board RB7':'PB2 SOURCE → H1-16 → main-board RB6'} pulled low for ${len*1e3} ms (weak pull-ups, OPTION_REG,7)`]); SIM.seek(t+0.3); },
  holdMode(){ const len = 20*256*LOOP_T + 0.25, t=actT(len); D.ev.push({b:'mode', t0:t, t1:t+len}); resim();
    logAction(`Hold MODE ${len.toFixed(2)} s`, t, t+len+0.05, ['MODE held: debounce accepts it after 10 passes (and steps the mode first), remember counts 20 × 256 passes']); SIM.seek(Math.min(DUR, t+len+0.06)); },
  world(path, val, label, settle){ const t=actT(settle||0.3); D.wev.push({t, path, val}); resim();
    logAction(label, t, t+(settle||0.3), [`World change at ${SIM.fmtT(t)}: ${label}`]); SIM.seek(Math.min(DUR, t+(settle||0.3))); },
  next(){ roll(DUR); D.trace={name:'Next window', lines:[`Window ${D.winNo}: the firmware state at 4 s becomes the start of the new window (t = ${(D.tAbs).toFixed(2)} s since the scenario began).`]}; SIM.refresh(); },
  skip(sec){ roll(SIM.t, true); const R = simulate({F:D.F0, W:D.W0, ev:[], wev:[], dur:sec, rec:true});
    R.notes.forEach(n=>{ D.seen[n.fn]=1; }); if (R.ee.length) D.seen.ee=1;
    D.F0 = R.final.F; D.W0 = R.final.W; shiftTimes(D.F0, D.W0, sec); D.tAbs += sec; D.winNo++; resim();
    const ee = R.notes.filter(n=>n.fn==='eewrite');
    D.trace = {name:`Skip ahead ${sec} s`, lines:[`Ran ${sec} s (${Math.round(sec/LOOP_T).toLocaleString()} passes) without drawing.`].concat(ee.length? ee.map(n=>`${SIM.fmtT(n.t)} eewrite: ${n.txt}`) : ['eewrite did not fire (press_flag,2 not set, or the 46 336-pass count has not run out yet).'])};
    D.log.unshift({abs:D.tAbs, name:`Skip ${sec} s`, n:1}); SIM.seek(0); },
  reset(){ Object.assign(D, { W0:defWorld(), F0:null, ev:[], wev:[], winNo:0, tAbs:0, log:[], trace:null }); resim(); SIM.seek(0); },
};
function worldAt(t){ const W = clone(D.W0); D.wev.filter(e=>e.t<=t).sort((a,b)=>a.t-b.t).forEach(e=>setPath(W,e.path,e.val)); return W; }
function recAt(t){ const p=D.R.p; if (!p.length || t<p[0].t) return null; let lo=0, hi=p.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if (p[m].t<=t) lo=m; else hi=m-1; }
  const r=p[lo]; if (t > r.t + r.dt + 0.002) return null; return r; }
function segAt(arr, t){ let v=null; for (const s of arr){ if (s[0]<=t) v=s; else break; } return v; }
function dispAt(t){ const s=segAt(D.R.disp, t); return s? s[1] : '    '; }
function vselAt(t){ const s=segAt(D.R.vsel, t); return s? s[1] : 0; }
function poweredAt(t){ const W=worldAt(t); if (!W.power) return false; return !D.R.off.some(o=>o<=t && !D.R.boots.some(b=>b.t0>o && b.t0<=t)); }
function btnAt(b,t){ return D.ev.some(e=>e.b===b && t>=e.t0 && t<e.t1); }
function stepAt(t){ const p=recAt(t); if (!p) return {p:null, k:-1}; const sp = D.R.spin.find(s=>t>=s[0] && t<s[1]); if (sp) return {p, k:1, spin:sp};
  const ee = D.R.ee.find(s=>t>=s[0] && t<s[1]); if (ee) return {p, k:13, ee:true};
  const f=(t-p.t)/LOOP_T; let k=0; for (let j=0;j<STEPS.length;j++) if (f>=STEP_FRAC[j]) k=j; return {p, k}; }
function srcAt(t, W){ const p=recAt(t); if (!p) return null; return routedSource(W||worldAt(t), {xpt:p.xpt, xptaes:p.xa, cs8415_16:p.unl, reg2:p.reg2, mute_flag:p.mute}); }
/* meter ballistics: replay the last ~0.6 s of routed level through the VU (τ 47 ms) and peak (instant attack) detectors */
function meterAt(t){
  const W = worldAt(t); let vu=-60, pk=-60, pkMax=-60; const N=120, h=0.006;
  for (let i=N;i>=0;i--){ const tt=t-i*h; const s = tt<0? null : srcAt(tt, W); const L = s? s.lvl : -60;
    const a = 1-Math.exp(-h/K.VU_TAU); const lin = Math.pow(10,vu/20) + (Math.pow(10,L/20)-Math.pow(10,vu/20))*a; vu = 20*Math.log10(Math.max(1e-4,lin));
    const pl = L+3; pk = pl>pk ? pl : pk - (20*h/K.PK_DECAY); if (tt>=t-K.HOLD_T) pkMax=Math.max(pkMax,pk); }
  return {vu, pk, pkMax};
}
function meterLeds(t){
  if (!poweredAt(t) || !recAt(t)) return {L:[], R:[], pk:[0,0]};
  const m = meterAt(t); const sv = segOf(codeOf(m.vu)), sp = segOf(codeOf(m.pk));
  const on = []; for (let k=1;k<=16;k++) on.push(k<=sv || k===sp ? 1 : 0);
  const pkl = Math.round(codeOf(m.pkMax)/2) >= 190 ? 1 : 0;              // LEFT_3 / RIGHT_3: divided peak (AN5/AN7) ≥ 190, held 1.5 s
  return {L:on, R:on.slice(), pk:[pkl,pkl], m, sv, sp};
}

/* ================================================================
   DRAWING — panels on the real silkscreen (pt units, 17.100 × 3.398 in = 1231.1 × 244.7 pt)
   ================================================================ */
/* Artwork 2026|59: avm-front.svg / avm-rear.svg (vector, 200 units per inch, shown at pt scale) replace avm-front-white.png / avm-rear-white.png: lower (silk) copy of avm4-frontssv1.cdr and AVMBCKSSILK_V1.cdr between the
   crop marks, converted with Inkscape, thin cut-out guides removed, recoloured white (panel: "WBS BLACK", AVM4-M1).
   Every hole position below is the centre of the matching circle in the CDR (converted pt coordinates). */
const LEDX = [644.33, 658.73], LEDY = k => 44.99 + k*11.52;      // k = 0 (+12) … 15 (−30); PK row at y 21.96
const LED_RED = k => (15-k) < 7;                                   // netlist: L1–L7 (bottom) "RD", L8–L17 "GR"
function lcdSVG(sel, on, W){
  const x=364.4, y=33, w=211, h=154.8; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#07090a"/>`;
  if (!on) return s + `<text x="${x+w/2}" y="${y+h/2}" fill="#2c3236" font-size="11" text-anchor="middle">no sync → SYNC SENSE keeps the LCD off</text>`;
  const bars = ['#c0c0c0','#c0c000','#00c0c0','#00c000','#c000c0','#c00000','#0000c0'];
  if (sel===1){ bars.forEach((c,i)=> s+=`<rect x="${x+i*w/7}" y="${y}" width="${w/7+0.5}" height="${h*0.72}" fill="${c}"/>`); s+=`<rect x="${x}" y="${y+h*0.72}" width="${w}" height="${h*0.28}" fill="#101418"/>`; }
  else if (sel===2){ for (let i=0;i<16;i++) s+=`<rect x="${x+i*w/16}" y="${y}" width="${w/16+0.5}" height="${h}" fill="rgb(${i*16},${i*16},${i*16})"/>`; }
  else if (sel===3){ s+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#1d3b5c"/>`; for (let i=1;i<10;i++) s+=`<line x1="${x+i*w/10}" y1="${y}" x2="${x+i*w/10}" y2="${y+h}" stroke="#e8e8e8" stroke-width=".8"/>`; for (let j=1;j<8;j++) s+=`<line x1="${x}" y1="${y+j*h/8}" x2="${x+w}" y2="${y+j*h/8}" stroke="#e8e8e8" stroke-width=".8"/>`; s+=`<circle cx="${x+w/2}" cy="${y+h/2}" r="${h*0.38}" fill="none" stroke="#fff" stroke-width="1.2"/>`; }
  else if (sel===4){ for (let i=0;i<8;i++) for (let j=0;j<6;j++) s+=`<rect x="${x+i*w/8}" y="${y+j*h/6}" width="${w/8+0.3}" height="${h/6+0.3}" fill="${(i+j)%2?'#d8d8d8':'#202020'}"/>`; }
  else if (sel===5){ ['#b4b4b4','#b4b410','#10b4b4','#10b410','#b410b4','#b41010','#1010b4','#101010'].forEach((c,i)=> s+=`<rect x="${x+i*w/8}" y="${y}" width="${w/8+0.5}" height="${h}" fill="${c}"/>`); }
  s += `<rect x="${x+6}" y="${y+h-20}" width="${sel===5?92:58}" height="15" fill="rgba(0,0,0,.55)"/><text x="${x+10}" y="${y+h-9}" fill="#fff" font-size="10" font-family="monospace">${sel===5?'SDI via DEMUX-2':'VIDEO '+sel}</text>`;
  return s;
}
function videoOn(sel, W){ return sel>=1 && sel<=4 ? !!W.vid[sel-1] : sel===5 ? (W.demux && W.sdi.on) : false; }
function frontSVG(t){
  const W = worldAt(t), pw = poweredAt(t), p = recAt(t);
  const txt = pw ? dispAt(t) : '    ';
  const lm = pw ? meterLeds(t) : {L:[],R:[],pk:[0,0]};
  const src = pw ? srcAt(t, W) : null, sel = pw ? vselAt(t) : 0, lcdOn = pw && videoOn(sel, W);
  let s = `<svg viewBox="0 0 1231.1 244.71" role="img" aria-label="AVM4 front panel (real silkscreen)" style="width:100%;display:block;border-radius:6px">
   <defs><filter id="avmGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
   <pattern id="avmGrille" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#121314"/><circle cx="3" cy="3" r="1.5" fill="#050505"/></pattern></defs>
   <rect width="1231.1" height="244.71" fill="var(--dev)"/>`;
  const spk = (x)=>`<rect x="${x}" y="54.1" width="241.2" height="136.8" fill="url(#avmGrille)" stroke="#2a2c2e"/>`;
  const play = src && !W.headset && pw;
  s += spk(46.1) + spk(943.9);
  if (play){ const a = Math.max(0.05, Math.min(0.5, (src.lvl+30)/60)); [0,1].forEach(i=> s+=`<rect x="${i?943.9:46.1}" y="54.1" width="241.2" height="136.8" fill="var(--accent)" opacity="${(a*W.vol[i]*(W.stereo||i===0?1:1)).toFixed(2)}"><title>Speaker ${i?'RIGHT':'LEFT'}: ${src.name}</title></rect>`); }
  s += `<g class="avm-lcd" style="cursor:help"><title>LCD monitor (AVM4-LCD-MODIFIED, fed from AVM4-2 BNC6): GX414 select = ${VID_NAMES[sel]}</title>${lcdSVG(sel, lcdOn, W)}</g>`;
  s += `<image href="${ASSET}avm-front.svg" x="0" y="0" width="1231.1" height="244.71"/>`;
  // meter
  const led = (x,y,on,col,tip)=>`<circle cx="${x}" cy="${y}" r="4.3" fill="#060606"/><circle cx="${x}" cy="${y}" r="3.4" fill="${on?col:'var(--led-off)'}" ${on?'filter="url(#avmGlow)"':''}><title>${tip}</title></circle>`;
  for (let k=0;k<16;k++){ const seg=16-k; const col = LED_RED(k)?'#ff4630':'var(--led-g)';
    s += led(LEDX[0], LEDY(k), lm.L[seg-1], col, `L${seg} ${SILK[seg-1]} (LD${seg-1})`) + led(LEDX[1], LEDY(k), lm.R[seg-1], col, `L${seg} ${SILK[seg-1]} (LD${seg-1})`);
  }   // scale legends (+12 … R … −30) come from the CorelDRAW art
  s += led(LEDX[0], 21.96, lm.pk[0], 'var(--led-g)', 'L17 PK (LD16 = RB0)') + led(LEDX[1], 21.96, lm.pk[1], 'var(--led-g)', 'L17 PK (LD16 = RB0)');
  // display bezel + SLG2016
  s += `<rect x="739.5" y="29.5" width="100.6" height="95.6" rx="7" fill="#0c0d0e" stroke="#3a3d40" stroke-width="1"/>
        <rect x="753.7" y="42.5" width="72" height="29.1" fill="#150605" stroke="#2a2a2a"/>
        <text x="752" y="91" fill="#f2f2f2" font-size="7" font-family="Arial,sans-serif">MODE</text><text x="795" y="91" fill="#f2f2f2" font-size="7" font-family="Arial,sans-serif">SOURCE</text>
        <g filter="url(#avmGlow)">${SIM.dotMatrix(txt.toUpperCase(), 757.5, 48.3, 2.75, '#ff3b1f', 'rgba(255,60,30,.08)')}</g>`;
  const bt = (x,id,lbl)=>{ const dn = btnAt(id,t); return `<g class="avm-btn" data-b="${id}" style="cursor:pointer"><title>${lbl}: click to press (100 ms). Double-click = hold for SETP / SAVE</title><rect x="${x}" y="98.8" width="35.4" height="52.4" rx="3" fill="${dn?'#1a1c1e':'#2b2e31'}" stroke="#55595c"/><rect x="${x+4}" y="${dn?104:101.5}" width="27.4" height="44" rx="2" fill="${dn?'#3a3e42':'#4a4f54'}"/></g>`; };
  s += bt(749.8,'mode','MODE (PB1)') + bt(794.2,'source','SOURCE (PB2)');
  // phase LEDs: RA3 → H1-12 → L21 GR / L22 RD
  s += led(875.87, 79.68, pw && p && !p.red, 'var(--led-g)', '0° (L21 green)') + led(890.28, 79.68, pw && p && p.red, '#ff4630', '180° (L22 red)');
  // knobs, stereo button, headset
  const knob=(x,i)=>{ const a = -135 + 270*W.vol[i]; const r=a*Math.PI/180; return `<g class="avm-knob" data-k="${i}" style="cursor:ns-resize"><title>${i?'RIGHT':'LEFT'} volume ${Math.round(W.vol[i]*100)} % — wheel or click left/right half</title><circle cx="${x}" cy="207.09" r="17.8" fill="#0a0a0b" stroke="#444"/><circle cx="${x}" cy="207.09" r="13" fill="#232527"/><line x1="${x}" y1="207.09" x2="${(x+11*Math.sin(r)).toFixed(1)}" y2="${(207.09-11*Math.cos(r)).toFixed(1)}" stroke="#eee" stroke-width="2"/></g>`; };
  s += knob(719.39,0) + knob(791.39,1);
  s += `<g class="avm-stereo" style="cursor:pointer"><title>STEREO push-on/push-off: ${W.stereo?'stereo':'mono'}</title><circle cx="755.37" cy="210.09" r="10.1" fill="#0a0a0b" stroke="#444"/><circle cx="755.37" cy="210.09" r="${W.stereo?7.5:6}" fill="${W.stereo?'#55595c':'#2e3134'}"/></g>`;
  s += `<g class="avm-hs" style="cursor:pointer"><title>HEADSET jack (T/R/S, normalled: plugging in mutes the speakers) — click to ${W.headset?'unplug':'plug in'}</title><circle cx="865.1" cy="188.94" r="14.04" fill="#0a0a0b" stroke="#777"/><circle cx="865.1" cy="188.94" r="5" fill="#000"/>${W.headset?`<rect x="859" y="182" width="12" height="62" rx="4" fill="#3a74b8"/>`:''}</g>`;
  s += `</svg>`;
  return s;
}
const REAR = { vbnc:[512,566,620,674,813.2,867.2,921.2,975.2], aesBnc:[[1134.1,161.8],[1134.1,206.8],[1179.1,161.8],[1179.1,206.8]] };   // AES 1, 2, 3, 4
function rearSVG(t){
  const W = worldAt(t);
  const bnc=(x,y,conn,cls,tip,dis)=>`<g class="${cls||''}" style="cursor:${cls?'pointer':'default'}"><title>${tip}</title>${dis?`<circle cx="${x}" cy="${y}" r="9" fill="#050505" stroke="#333"/>`:`<circle cx="${x}" cy="${y}" r="14.4" fill="#9c8233" stroke="#5e4d1c" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="9" fill="#d8c27a"/><circle cx="${x}" cy="${y}" r="3.2" fill="#7a5f12"/>`}${conn?`<circle cx="${x}" cy="${y}" r="12.5" fill="#3a74b8" opacity=".9"/><circle cx="${x}" cy="${y}" r="5" fill="#1d3f66"/><path d="M${x+8} ${y-8}l7 -7" stroke="#2b5f9e" stroke-width="6" stroke-linecap="round"/>`:''}</g>`;
  let s = `<svg viewBox="0 0 1231.1 244.71" role="img" aria-label="AVM4 rear panel (real silkscreen)" style="width:100%;display:block;border-radius:6px"><rect width="1231.1" height="244.71" fill="var(--dev)"/>`;
  s += `<g class="avm-pwr" style="cursor:pointer"><title>IEC inlet 115 V AC — click to switch the mains ${W.power?'off':'on'}</title><rect x="33" y="139" width="85" height="95" rx="3" fill="#1c1e20" stroke="#55595c"/><rect x="44" y="148" width="62" height="40" rx="5" fill="#0b0c0d" stroke="#666"/><rect x="58" y="157" width="5" height="11" fill="#999"/><rect x="86" y="157" width="5" height="11" fill="#999"/><rect x="72" y="172" width="5" height="9" fill="#999"/><rect x="44" y="197" width="62" height="28" rx="4" fill="#0b0c0d" stroke="#666"/><circle cx="104" cy="144" r="3" fill="${W.power?'var(--accent)':'#444'}"/></g>`;
  [527,546,565,584,603,622,641].forEach(x=> s+=`<rect x="${x}" y="114" width="12" height="99" rx="6" fill="#070707" stroke="#333"/>`);
  [[71,113],[392,113]].forEach(([x,y])=> s+=`<circle cx="${x}" cy="${y}" r="6" fill="#55595c"/><path d="M${x-4} ${y}h8M${x} ${y-4}v8" stroke="#222" stroke-width="1.5"/>`);
  const dm = W.demux;
  s += bnc(512,54,dm&&W.sdi.on,'', 'OUTPUT 1 — composite split 1 from the DEMUX-2 (functional diagram)', !dm) + bnc(566,54,false,'','OUTPUT 2 — composite split 2 from the DEMUX-2', !dm) + bnc(620,54,false,'','SDI OUT — reclocked copy (DEMUX-2)', !dm);
  s += bnc(674,54,dm&&W.sdi.on, dm?'avm-sdi':'', dm?`SDI IN — click to ${W.sdi.on?'unplug':'plug in'} the SDI feed`:'SDI IN — no DEMUX-2 fitted (hole plugged)', !dm);
  for (let i=0;i<4;i++) s += bnc(REAR.vbnc[4+i],54,W.vid[i],'avm-vin" data-i="'+i, `ANALOG VIDEO INPUT ${i+1} → AVM4-2 BNC${i+1} → GX414 U1 — click to ${W.vid[i]?'unplug':'plug in'}`);
  REAR.aesBnc.forEach(([x,y],i)=> s += bnc(x,y,W.aes[i].c75,'avm-a75" data-i="'+i, `AES ${i+1} 75 Ω BNC — click to ${W.aes[i].c75?'unplug':'plug in'}`));
  const blk=(x,y,w,n,cls,tip,conn)=>{ let g=`<g class="${cls}" style="cursor:pointer"><title>${tip}</title><rect x="${x}" y="${y}" width="${w}" height="16.6" fill="#1f8a45" stroke="#0e4d25"/>`; for (let i=0;i<n;i++) g+=`<circle cx="${x+w*(i+0.5)/n}" cy="${y+8.3}" r="2.6" fill="#0d3a1c"/>`; return g + (conn?`<rect x="${x+1}" y="${y+1}" width="${w-2}" height="14.6" fill="#ff9f40" opacity=".35"/>`:'') + `</g>`; };
  for (let side=0; side<2; side++){ const y = side?201:159.6;
    s += blk(822.5, y, 36, 3, '', `ANALOG ${side?'RIGHT':'LEFT'} OUTPUT (monitor out)`, false);
    for (let i=0;i<4;i++) s += blk(858.5+36*i, y, 36, 3, `avm-ain" data-i="${i}`, `ANALOG ${side?'RIGHT':'LEFT'} ${i+1} (+ − G, >20 kΩ) — click to ${W.ana[i].on?'disconnect':'connect'} analog input ${i+1}`, W.ana[i].on);
    for (let j=0;j<2;j++){ const a = side? (j?3:1) : (j?2:0); s += blk(1034.1+34.2*j, y, 34.2, 3, `avm-a110" data-i="${a}`, `AES ${a+1} 110 Ω (+ − G, transformer) — click to ${W.aes[a].c110?'unplug':'plug in'}`, W.aes[a].c110); } }
  s += blk(769.5, 180.3, 30.3, 3, 'avm-mute', `EXT MUTE  I O G — I = mute input (closure to ground on RA4), O = open-collector tally (RA5). Click to ${W.mute?'open':'close'} the mute contact`, W.mute);
  s += `<image href="${ASSET}avm-rear.svg" x="0" y="0" width="1231.1" height="244.71"/></svg>`;
  return s;
}
function bindPanels(root){
  root.querySelectorAll('.avm-btn').forEach(g=>{ let tm=null; g.addEventListener('click', ()=>{ if (tm) return; tm=setTimeout(()=>{ tm=null; A.press(g.dataset.b); }, 260); });
    g.addEventListener('dblclick', ()=>{ clearTimeout(tm); tm=null; if (g.dataset.b==='mode') A.holdMode(); else A.press('source'); }); });
  root.querySelectorAll('.avm-knob').forEach(g=>{ const i=+g.dataset.k; const set=d=>{ const W=worldAt(SIM.t); const v=Math.max(0,Math.min(1,Math.round((W.vol[i]+d)*20)/20)); A.world('vol.'+i, v, `${i?'RIGHT':'LEFT'} volume → ${Math.round(v*100)} %`, 0.05); };
    g.addEventListener('wheel', e=>{ e.preventDefault(); set(e.deltaY<0?0.05:-0.05); }, {passive:false});
    g.addEventListener('click', e=>{ const r=g.getBoundingClientRect(); set((e.clientX-r.left)/r.width<0.5?-0.1:0.1); }); });
  const W = worldAt(SIM.t);
  const on = (sel, fn)=> root.querySelectorAll(sel).forEach(g=> g.addEventListener('click', ()=>fn(g)));
  on('.avm-stereo', ()=>A.world('stereo', !W.stereo, W.stereo?'STEREO switch → mono':'STEREO switch → stereo', 0.05));
  on('.avm-hs', ()=>A.world('headset', !W.headset, W.headset?'Headset unplugged: speakers re-normalled':'Headset plugged in: the jack breaks the speaker feed', 0.05));
  on('.avm-pwr', ()=>A.world('power', !W.power, W.power?'Mains off':'Mains on (power-up)', W.power?0.2:1.2));
  on('.avm-sdi', ()=>A.world('sdi.on', !W.sdi.on, W.sdi.on?'SDI IN unplugged':'SDI IN connected', 0.4));
  on('.avm-vin', g=>{ const i=+g.dataset.i; A.world('vid.'+i, !W.vid[i], `Composite INPUT ${i+1} ${W.vid[i]?'unplugged':'connected'}`, 0.1); });
  on('.avm-a75', g=>{ const i=+g.dataset.i; A.world(`aes.${i}.c75`, !W.aes[i].c75, `AES ${i+1} BNC (75 Ω) ${W.aes[i].c75?'unplugged':'connected'}`, 0.3); });
  on('.avm-a110', g=>{ const i=+g.dataset.i; A.world(`aes.${i}.c110`, !W.aes[i].c110, `AES ${i+1} euroblock (110 Ω) ${W.aes[i].c110?'unplugged':'connected'}`, 0.3); });
  on('.avm-ain', g=>{ const i=+g.dataset.i; A.world(`ana.${i}.on`, !W.ana[i].on, `Analog input ${i+1} ${W.ana[i].on?'disconnected':'connected'}`, 0.3); });
  on('.avm-mute', ()=>A.world('mute', !W.mute, W.mute?'EXT MUTE contact opened':'EXT MUTE contact closed to ground', 0.3));
}
document.addEventListener('keydown', e=>{
  if (!window[FLAG] || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase(); const W=()=>worldAt(SIM.t);
  const m={ m:()=>A.press('mode'), s:()=>A.press('source'), h:()=>A.holdMode(), x:()=>A.world('mute', !W().mute, 'EXT MUTE toggled', 0.3), n:()=>A.next() };
  if (m[k]){ m[k](); e.preventDefault(); }
});

/* ---------------- world controls ---------------- */
function controlsHTML(){
  const W = worldAt(SIM.t);
  const lv = (path,v,a,b,st)=>`<select data-w="${path}">${Array.from({length:Math.round((b-a)/st)+1},(_,i)=>a+i*st).map(x=>`<option value="${x}" ${x==v?'selected':''}>${x>0?'+':''}${x}</option>`).join('')}</select>`;
  const ph = (path,v)=>`<select data-w="${path}">${[[0,'0°'],[90,'90°'],[180,'180°'],['unc','uncorrelated']].map(([x,l])=>`<option value="${x}" ${String(x)===String(v)?'selected':''}>${l}</option>`).join('')}</select>`;
  let s = `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0">
    <button data-a="mode">MODE</button><button data-a="source">SOURCE</button><button data-a="hold">Hold MODE (SETP / SAVE)</button>
    <button data-a="mute">EXT MUTE ${W.mute?'open':'close'}</button><button data-a="next">Next window ▸</button><button data-a="skip">Skip ahead 30 s</button><button data-a="reset">Restart scenario</button>
    <span class="small muted">Keys: M, S, H (hold), X (mute), N (next window)</span></div>
    <table class="kv small"><tr><th>Analog in (dBu, L/R phase)</th>${W.ana.map((a,i)=>`<td>${i+1}: ${lv(`ana.${i}.lvl`,a.lvl,-20,24,2)} ${ph(`ana.${i}.ph`,a.ph)}</td>`).join('')}</tr>
    <tr><th>AES in (dBFS, phase)</th>${W.aes.map((a,i)=>`<td>${i+1}: ${lv(`aes.${i}.lvl`,a.lvl,-40,0,2)} ${ph(`aes.${i}.ph`,a.ph)} <span class="muted">${a.c75?'BNC':''}${a.c75&&a.c110?'+':''}${a.c110?'110':''}${!a.c75&&!a.c110?'none':''}</span></td>`).join('')}</tr>
    <tr><th>SDI embedded pairs</th><td colspan="4">${Array.from({length:8},(_,k)=>`<label class="small"><input type="checkbox" data-pair="${k}" ${(W.sdi.pairs>>k)&1?'checked':''}> SD${k+1}</label>`).join(' ')} · level ${lv('sdi.lvl',W.sdi.lvl,-40,0,2)} dBFS</td></tr>
    <tr><th>Options</th><td colspan="4"><label class="small"><input type="checkbox" id="avmDmx" ${W.demux?'checked':''}> DEMUX-2 fitted (read at power-up by program1)</label> · <button data-a="eeclr">Erase EEPROM</button> <span class="muted">EEPROM addr 120 = ${W.ee[120]===0xAA?'0xAA (valid)':'blank'}</span></td></tr></table>`;
  return s;
}
function bindControls(root){
  const map={ mode:()=>A.press('mode'), source:()=>A.press('source'), hold:()=>A.holdMode(), mute:()=>{ const W=worldAt(SIM.t); A.world('mute', !W.mute, W.mute?'EXT MUTE contact opened':'EXT MUTE contact closed', 0.3); },
    next:()=>A.next(), skip:()=>A.skip(30), reset:()=>A.reset(), eeclr:()=>A.world('ee', {}, 'EEPROM erased (as from the factory)', 0.02) };
  root.querySelectorAll('[data-a]').forEach(b=> b.onclick=()=>map[b.dataset.a]());
  root.querySelectorAll('select[data-w]').forEach(sl=> sl.onchange=()=>{ const v = sl.value==='unc'?'unc':+sl.value; A.world(sl.dataset.w, v, `${sl.dataset.w} → ${sl.value}`, 0.3); });
  root.querySelectorAll('[data-pair]').forEach(cb=> cb.onchange=()=>{ const W=worldAt(SIM.t); const k=+cb.dataset.pair; A.world('sdi.pairs', W.sdi.pairs ^ (1<<k), `SD${k+1} audio ${cb.checked?'embedded':'removed'}`, 0.3); });
  const dm = root.querySelector('#avmDmx'); if (dm) dm.onchange=()=> A.world('demux', dm.checked, `DEMUX-2 ${dm.checked?'fitted':'removed'} — the firmware only notices at the next power-up`, 0.05);
}

/* ---------------- timeline lanes ---------------- */
function lanes(){
  const R = D.R, L = [];
  const box=(c,X,a,b,y,h,col,txt,alpha)=>{ const x0=X(a), x1=X(b); c.globalAlpha=alpha||0.8; c.fillStyle=col; c.fillRect(x0,y+3,Math.max(1,x1-x0),h-6); c.globalAlpha=1; if (txt && x1-x0>24){ c.fillStyle='#fff'; c.font='10px '+css('--mono'); c.save(); c.beginPath(); c.rect(x0,y,x1-x0,h); c.clip(); c.fillText(txt, x0+3, y+h/2+3.5); c.restore(); } };
  const txt=(c,s,x,y,col)=>{ c.fillStyle=col||css('--ink2'); c.font='11px '+css('--sans'); c.fillText(s,x,y); };
  const steps=(c,X,t0,t1,y,h,arr,colf,lblf)=>{ for (let i=0;i<arr.length;i++){ const a=arr[i][0], b=i+1<arr.length?arr[i+1][0]:DUR; if (b<t0||a>t1) continue; const col=colf(arr[i][1]); if (col) box(c,X,Math.max(a,t0),Math.min(b,t1),y,h,col,lblf?lblf(arr[i][1]):'',0.7); } };
  L.push({label:'Power · boot (INIT, DEMUX probe, “V100”)', h:26, draw(c,X,t0,t1,y,h){
    R.off.forEach(o=> box(c,X,o,Math.min(DUR,(R.boots.find(b=>b.t0>=o)||{t0:DUR}).t0),y,h,'#555','mains off',0.5));
    R.boots.forEach(B=>{ box(c,X,B.t0,B.pwrt,y,h,css('--ink2'),'PWRT',0.5); B.probes.forEach(p=>box(c,X,p[0],p[1],y,h,css('--accent2'),'E8 55')); box(c,X,B.pwrt,B.win[0],y,h,css('--accent2'),'program1 probe',0.25); box(c,X,B.win[0],B.win[1],y,h,css('--warn'),'opening_window “V100”',0.6); });
    if (!R.boots.length && !R.off.length) txt(c,'running (booted before this window)',X(t0)+6,y+h/2+4); }});
  L.push({label:'MODE (RB7) / SOURCE (RB6) pins', h:24, draw(c,X,t0,t1,y,h){ D.ev.forEach(e=>{ if (e.t1<t0||e.t0>t1) return; box(c,X,e.t0,e.t1,y,h,e.b==='mode'?css('--accent'):css('--accent2'),e.b.toUpperCase()+' low'); }); if (!D.ev.length) txt(c,'no presses in this window — use the buttons',X(t0)+6,y+h/2+4); }});
  L.push({label:`Main-loop passes (≈${(LOOP_T*1e3).toFixed(3)} ms ${'inferred'})`, h:30, draw(c,X,t0,t1,y,h){
    const pxp = X(t0+LOOP_T)-X(t0); let n=0;
    for (const p of R.p){ if (p.t+p.dt<t0) continue; if (p.t>t1) break; n++;
      if (pxp>90){ let tt=p.t; STEPS.forEach((st,j)=>{ const d=st[1]*TCY*(K.LOOP_CY/STEP_CY); box(c,X,tt,tt+d,y,h,j===12?css('--accent2'):j%2?css('--accent'):'#3c8f68',st[0].split(' · ')[0],0.75); tt+=d; }); if (p.dt>LOOP_T*1.01) box(c,X,p.t+LOOP_T,p.t+p.dt,y,h,css('--bad'),'stall',0.6); }
      else box(c,X,p.t,p.t+p.dt,y,h,p.dt>LOOP_T*1.01?css('--bad'):(n%2?css('--accent'):'#3c8f68'),'',0.7); }
    R.spin.forEach(sp=> box(c,X,sp[0],sp[1],y,h,css('--bad'),`remember3 spin (“${sp[2]}” shown, MODE held)`,0.55));
    R.ee.forEach(sp=> box(c,X,sp[0],sp[1],y,h,css('--warn'),'eewrite: 14 × eew',0.8));
    if (pxp<2) txt(c,`${n} passes in view`, X(t0)+6, y+h/2+4, css('--ink')); }});
  L.push({label:'SLG2016 display (dis3…dis0)', h:26, draw(c,X,t0,t1,y,h){ steps(c,X,t0,t1,y,h,R.disp,v=>v.trim()?(v==='MUTE'||v.includes('NL')?css('--warn'):css('--bad')):css('--grid'),v=>`“${v}”`); }});
  L.push({label:'RS-485 9600 8N1 (TX ▲ / RX ▼)', h:30, draw(c,X,t0,t1,y,h){
    for (const u of R.uart){ if (u.t1<t0||u.t0>t1) continue; const tx=u.dir==='tx'; const yy=tx?y:y+h/2-2; box(c,X,u.t0,u.t1,yy,h/2+2,tx?((u.b&0x60)===0x60?css('--accent2'):css('--accent')):css('--warn'),hx(u.b),0.85); }
    if (X(t0+0.5)-X(t0) < 60) txt(c,'blue = DEMUX message, green = video message for the AVM4-2, orange = DEMUX-2 reply', X(t0)+6, y+h-3); }});
  L.push({label:'AVM4-2 GX414 select → LCD', h:24, draw(c,X,t0,t1,y,h){ steps(c,X,t0,t1,y,h,R.vsel,v=>v?css('--accent'):css('--grid'),v=>v?(v===5?'s5 DEMUX video':'av'+v+' BNC '+v):'no_video'); }});
  L.push({label:'Composite fields (59.94 Hz)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1001/60000,0,9*63.556e-6,css('--ink2'),'V sync');
    R.vsel.forEach(v=>{ if (v[0]<t0||v[0]>t1) return; c.strokeStyle=css('--bad'); c.lineWidth=2; c.beginPath(); c.moveTo(X(v[0]),y+2); c.lineTo(X(v[0]),y+h-2); c.stroke(); }); }});
  L.push({label:'CS8415A input (reg 2) · UNLOCK', h:28, draw(c,X,t0,t1,y,h){ steps(c,X,t0,t1,y,h/2+2,R.rx,v=>css('--accent2'),v=>{ const s=v&7; return s>=1&&s<=4?`s${s} = AES ${AES_OF_S[s]+1}`: s===5?'s5 DEMUX':s===6?'s6 DEMUX':'s0'; });
    let a=null,last=null; const flush=(b)=>{ if (a!==null && last) box(c,X,a,b,y+h/2-1,h/2+1,css('--bad'),'UNLOCK',0.6); };
    for (const p of R.p){ if (p.t>t1) break; if (p.t+p.dt<t0) continue; if (p.unl && a===null) a=p.t; if (!p.unl && a!==null){ flush(p.t); a=null; } last=p; } if (a!==null) flush(Math.min(t1,DUR)); }});
  L.push({label:'Crosspoints: XPT1–4 · XPTAES (low = on)', h:30, draw(c,X,t0,t1,y,h){ const cols=[css('--accent'),css('--accent2'),css('--warn'),'#a070ff',css('--bad')];
    for (let k=0;k<5;k++){ let a=null; for (const p of R.p){ if (p.t>t1) break; const on = k<4? !p.xpt[k] : !p.xa; if (on && a===null) a=p.t; if (!on && a!==null){ if (p.t>t0){ c.fillStyle=cols[k]; c.fillRect(X(Math.max(a,t0)),y+3+k*5,X(p.t)-X(Math.max(a,t0)),4);} a=null; } } if (a!==null){ c.fillStyle=cols[k]; c.fillRect(X(Math.max(a,t0)),y+3+k*5,X(t1)-X(Math.max(a,t0)),4);} } }});
  L.push({label:'AES receiver banks (75 Ω RC0 / 110 Ω RA1)', h:22, draw(c,X,t0,t1,y,h){ let prev=-1, a=0; const seg=[]; for (const p of R.p){ if (p.term!==prev){ if (prev>=0) seg.push([a,p.t,prev]); prev=p.term; a=p.t; } } if (prev>=0) seg.push([a,DUR,prev]);
    seg.forEach(([a,b,v])=>{ if (b<t0||a>t1) return; box(c,X,Math.max(a,t0),Math.min(b,t1),y,h,v===1?css('--accent'):v===2?css('--accent2'):v===3?css('--warn'):css('--grid'),['both off','75 Ω on','110 Ω on','both on'][v],0.6); }); }});
  L.push({label:'Phase: PHASE_V (AN0) vs 100/255', h:28, draw(c,X,t0,t1,y,h){ c.strokeStyle=css('--warn'); c.setLineDash([3,3]); c.beginPath(); const yt=y+h-3-(100/255)*(h-6); c.moveTo(X(t0),yt); c.lineTo(X(t1),yt); c.stroke(); c.setLineDash([]);
    c.strokeStyle=css('--accent'); c.lineWidth=1.4; c.beginPath(); let f=true; for (const p of R.p){ if (p.t<t0) continue; if (p.t>t1) break; const yy=y+h-3-p.phv*(h-6); f?c.moveTo(X(p.t),yy):c.lineTo(X(p.t),yy); f=false; } c.stroke(); }});
  L.push({label:`AVM4-1 Timer2 slots (${(K.T2*1e3).toFixed(2)} ms) · LED mux`, h:24, draw(c,X,t0,t1,y,h){ const n=['VU L','VU R','PK L','PK R','+3 L','+3 R'];
    if ((t1-t0)/K.T2 > 300){ SIM.pulses(c,X,t0,t1,y,h,K.T2,0,K.T2*0.08,css('--accent2'),'TMR2 interrupts'); return; }
    for (let k=Math.floor(t0/K.T2); k*K.T2<t1; k++){ const a=k*K.T2; box(c,X,a,a+K.T2*0.97,y,h/2+1,k%2?css('--accent2'):css('--accent'),n[((k%6)+6)%6],0.7); box(c,X,a,a+K.T2*0.97,y+h/2-1,h/2+1,k%2?'#a070ff':css('--warn'),k%2?'RIGHT_SEL (RB2)':'LEFT_SEL (RB1)',0.5); } }});
  L.push({label:'VU (τ 47 ms) · peak, dB re 0 VU', h:34, draw(c,X,t0,t1,y,h){ const N=160; const yy=v=>y+h-3-Math.max(0,Math.min(1,(v+30)/45))*(h-6);
    c.strokeStyle=css('--grid'); c.beginPath(); c.moveTo(X(t0),yy(0)); c.lineTo(X(t1),yy(0)); c.stroke();
    ['vu','pk'].forEach((key,j)=>{ c.strokeStyle=j?css('--warn'):css('--accent'); c.lineWidth=1.3; c.beginPath(); for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N; if (!poweredAt(tt)||!recAt(tt)) continue; const m=meterAt(tt); const v=yy(m[key]); i?c.lineTo(X(tt),v):c.moveTo(X(tt),v); } c.stroke(); }); }});
  L.push({label:'EXT MUTE (RA4) · TALLY (RA5)', h:22, draw(c,X,t0,t1,y,h){ let a=null; for (const p of R.p){ if (p.t>t1) break; if (p.tally && a===null) a=p.t; if (!p.tally && a!==null){ if (p.t>t0) box(c,X,Math.max(a,t0),p.t,y,h,css('--bad'),'muted · tally on',0.6); a=null; } } if (a!==null) box(c,X,Math.max(a,t0),t1,y,h,css('--bad'),'muted · tally on',0.6); }});
  return L;
}

/* ================================================================
   VIEWS
   ================================================================ */
function stateTable(t){
  const p = recAt(t), W = worldAt(t);
  if (!poweredAt(t)) return '<p class="small muted">Mains off.</p>';
  if (!p){ const B = D.R.boots.find(b=>t>=b.t0 && t<b.main); return `<p class="small">Booting: ${B? (t<B.pwrt?'power-up timer':t<B.win[0]?'program1 — probing for a DEMUX-2 (0xE8 0x55)':'opening_window — “V100”') : '—'}</p>`; }
  const st = stepAt(t), src = srcAt(t, W), m = meterLeds(t), sel = vselAt(t);
  const aud = p.setup ? 'setup' : AUD_NAMES[p.aud]||'—';
  return `<table class="kv">
    <tr><th>Main-loop step</th><td class="mono">${st.spin?'remember3 spin (MODE still held)':st.ee?'eewrite (EEPROM writes)':STEPS[st.k][0]}</td></tr>
    <tr><th>Display</th><td class="mono">“${esc(dispAt(t))}”</td></tr>
    <tr><th>mode / source</th><td class="mono">mode = ${bn(p.mode,3)} (${['setup','analog','AES',,'SDI'][p.mode]}) · ${aud}${p.setup?` · sourceset1 = ${bn(p.ss1)}`:''}</td></tr>
    <tr><th>Crosspoints</th><td class="mono">XPT1–4 = ${p.xpt.join('')} · XPTAES = ${p.xa} · ${p.mute?'<b style="color:var(--bad)">MUTED</b>':''}</td></tr>
    <tr><th>CS8415A</th><td class="mono">reg2 = 0x${hx(p.reg2)} · UNLOCK = ${p.unl} · banks ${['off','75 Ω','110 Ω','75+110'][p.term]} · disctl = ${bn(p.disctl)}</td></tr>
    <tr><th>You hear</th><td>${src? `${src.name}, ${src.lvl>=0?'+':''}${src.lvl.toFixed(0)} dB re 0 VU on ${W.headset?'the headset':'the speakers'} (vol ${Math.round(W.vol[0]*100)} / ${Math.round(W.vol[1]*100)} %${W.stereo?'':', mono'})` : 'silence'}</td></tr>
    <tr><th>Meter</th><td class="mono">VU ${m.m? m.m.vu.toFixed(1):'—'} dB → code ${m.m?codeOf(m.m.vu):'—'} → ${m.sv?LBL[m.sv-1]+' ('+SILK[m.sv-1]+')':'signalno'} · peak dot ${m.sp?SILK[m.sp-1]:'—'}</td></tr>
    <tr><th>Phase</th><td class="mono">PHASE_V ≈ ${Math.round(p.phv*255)}/255 → ${p.red?'red 180°':'green 0°'}</td></tr>
    <tr><th>LCD</th><td class="mono">GX414 → ${VID_NAMES[sel]} · ${videoOn(sel,W)?'picture':'no sync (dark)'}</td></tr>
    <tr><th>RS-485</th><td class="mono">txflags = ${bn(p.txf)}${(p.txf&0x10)?' (waiting for a reply)':''}</td></tr></table>`;
}
function viewSim(m){
  window[FLAG] = true;
  m.innerHTML = `
  ${card('Front panel at the playhead (real silkscreen, avm4-frontssv1.cdr)', `<div id="avmF"></div><div class="small muted" style="margin-top:3px">Artwork: lower (legend) copy of ${SIM.src(AVMS+'avm4-frontssv1.cdr','avm4-frontssv1.cdr')} and ${SIM.src(AVMS+'AVMBCKSSILK_V1.cdr','AVMBCKSSILK_V1.cdr')} (12 Feb 2002), CorelDRAW vector between the crop marks, white ink on WBS black; faint lines = cut-outs and connector bodies.</div>${controlsHTML()}
    <p class="small muted">Click MODE or SOURCE to press them (100 ms). Double-click MODE (or H) to hold it until “SETP” / “SAVE”. Volume: wheel over a knob. Click the headset jack, the STEREO button, and the rear connectors to change what is plugged in. Every action is placed at the playhead and the window is re-simulated pass by pass.</p>`)}
  ${card('Rear panel (AVMBCKSSILK_V1.cdr): click BNCs, terminal blocks, mute and the mains inlet', `<div id="avmR"></div>`)}
  <div class="grid2">
    ${card('What the firmware did (last action)', `<div id="avmTr" class="log"></div>`)}
    ${card('State at the playhead', `<div id="avmSt"></div>`)}
  </div>
  ${card(`Timeline — window ${'<span id="avmWin"></span>'} (4 s, zoomable; click to seek)`, `<canvas id="avmTl"></canvas>
    <p class="small muted">Pass length ≈ ${(LOOP_T*1e3).toFixed(3)} ms is ${inf}: a hand count of the main loop at 4.9152 MHz (two CS8415 register writes and one read every pass are about 490 of the ≈710 instruction cycles). All the long delays (SETP hold, NL flashing, RS-485 time-outs, EEPROM save) are pass counts from the source multiplied by this figure.</p>`)}
  ${card('Action log', `<div id="avmLog" class="log"></div>`)}`;
  const draw = ()=>{
    const t = SIM.t;
    m.querySelector('#avmF').innerHTML = frontSVG(t);
    m.querySelector('#avmR').innerHTML = rearSVG(t);
    bindPanels(m);
    m.querySelector('#avmSt').innerHTML = stateTable(t);
    m.querySelector('#avmWin').textContent = `${D.winNo} (scenario time ${(D.tAbs+t).toFixed(3)} s)`;
    const tr = D.trace; m.querySelector('#avmTr').innerHTML = tr ? `<b>${esc(tr.name)}</b><br>${tr.lines.map(esc).join('<br>')}` : '<span class="muted">Power-up is running in this first window: scrub through the boot, then press a button.</span>';
    m.querySelector('#avmLog').innerHTML = D.log.map(l=>`${(l.abs).toFixed(3)} s · ${esc(l.name)}`).join('<br>') || '<span class="muted">nothing yet</span>';
    SIM.drawLanes(m.querySelector('#avmTl'), lanes(), {labelW:210});
  };
  const ctl = m.querySelector('.card'); bindControls(ctl);
  SIM.on('time', draw);
}

/* ---------------- tutorial ---------------- */
const LESSONS = [
  {t:'Power-up', d:'Scrub the first second of window 0. The display is blank while program1 probes for a DEMUX-2 (two bytes 0xE8 0x55 on the RS-485 timeline, then a reply), shows “V100” for ≈0.9 s, then “A1 1”: analog input 1 with composite video 1.', hint:'Drag the playhead past 1.2 s.', check:()=> D.seen.boot && /^A1/.test(dispAt(SIM.t))},
  {t:'Select analog input 2', d:'Press SOURCE once. sw_source rotates sourcea, output_control drops XPT2 low, and the display shows “A2 2”. The video map says A2 goes with composite input 2.', hint:'Click SOURCE (or press S).', check:()=>{ const p=recAt(SIM.t); return p && p.mode===1 && p.sa===2; }},
  {t:'Watch the phase LEDs', d:'Analog input 2 is wired with the right leg inverted (180°). The XOR phase detector drives PHASE_V above 100/255 and RA3 lights the red 180° LED. Change its phase to 0° in the control table and the green LED returns ≈ 50 ms later (R118/C132).', hint:'Set “Analog in 2” phase to 0°.', check:()=>{ const W=worldAt(SIM.t); const p=recAt(SIM.t); return W.ana[1].ph===0 && p && !p.red && p.sa===2; }},
  {t:'Go to the AES inputs', d:'Press MODE. With a DEMUX-2 fitted the order is analog → AES → SDI (rlf mode). In AES mode output_control opens all analog crosspoints and the CS8415A is pointed at D1 (cs8415reg2s3).', hint:'Press MODE once.', check:()=>{ const p=recAt(SIM.t); return p && p.mode===2; }},
  {t:'See “NL” (no lock)', d:'Step SOURCE to D3: no cable is plugged into AES 3, so the CS8415A UNLOCK bit stays set. Every 7 × 256 passes the display swaps between “D3 3” and “ NL ”. auto_detect also flips the 75/110 Ω receiver banks every 15 passes, hunting for a signal.', hint:'Press SOURCE until D3, then let it run about 2 s.', check:()=> D.seen.auto_detect && D.R.disp.some(d=>d[1].includes('NL'))},
  {t:'Plug AES 3 into its BNC', d:'Click the AES 3 BNC on the rear. The next time auto_detect lands on the 75 Ω bank the receiver locks, reg_unlocked clears XPTAES and the D/A path opens.', hint:'Rear panel: the BNC marked 3.', check:()=>{ const W=worldAt(SIM.t), p=recAt(SIM.t); return W.aes[2].c75 && p && p.mode===2 && p.sd===4 && !p.unl; }},
  {t:'110 Ω auto-detect', d:'Select D2. AES 2 is wired only to the 110 Ω euroblock. Watch the “AES receiver banks” lane flip until the transformer bank is on and the signal locks.', hint:'SOURCE until D2.', check:()=>{ const p=recAt(SIM.t); return p && p.mode===2 && p.sd===2 && !p.unl && (p.term&2); }},
  {t:'SDI mode', d:'Press MODE again. The SDI sources S1–S8 are the eight embedded AES pairs. The firmware now alternates RS-485 messages: one to the DEMUX-2 (index, group) and one to the AVM4-2 (video). The DEMUX answers; the AVM4-2 never does, so every video message ends in a 26 × 256-pass time-out.', hint:'Press MODE until the display starts with S.', check:()=>{ const p=recAt(SIM.t); return p && p.mode===4; }},
  {t:'Enter SETUP (“SETP”)', d:'Hold MODE (double-click MODE, or H). After 10 passes debounce has already stepped the mode once; after 20 × 256 passes remember shows “SETP” and the whole loop spins until you let go. Setup starts on audio A1 with its video digit flashing.', hint:'Double-click MODE.', check:()=> D.seen['spin:SETP'] },
  {t:'Assign a video source', d:'In setup, MODE steps the audio source (A1…D4, S1…S8 with a DEMUX) and SOURCE steps the video for it: X → 1 → 2 → 3 → 4 → 5 → X. The new choice is written into video11…video62 on every pass.', hint:'Press SOURCE while in setup.', check:()=> D.seen.sw_source1 },
  {t:'Leave with “SAVE”', d:'Hold MODE again until “SAVE”. stage_2 restores the mode saved in temp3 (the one after the first step). Note that the video map is not written to the EEPROM yet.', hint:'Double-click MODE again.', check:()=> D.seen['spin:SAVE'] },
  {t:'External mute', d:'Close the EXT MUTE contact on the rear (I to G). mute_check sets the tally output RA5, forces the crosspoints off and the display alternates with “MUTE”. MODE and SOURCE are ignored while muted.', hint:'Click the 3-way MUTE block, or press X.', check:()=>{ const p=recAt(SIM.t); return p && p.mute; }},
  {t:'Headset', d:'Open the mute again, then plug a headset into the front jack. The jack is in the speaker feed (normalled), so the speakers stop without the firmware knowing.', hint:'Click the HEADSET jack.', check:()=>{ const W=worldAt(SIM.t); return W.headset && !W.mute; }},
  {t:'Let it save', d:'eewrite only fires after press_flag,2 has stayed set for 181 × 256 passes (≈ 27 s). Use “Skip ahead 30 s” and read the trace: 14 EEPROM writes and a ≈ 52 ms stall.', hint:'Click “Skip ahead 30 s”.', check:()=> D.seen.ee },
  {t:'Power cycle', d:'Switch the mains off and on at the rear inlet. INIT finds 0xAA at EEPROM address 120, translate restores the last mode and source, and the unit comes back where you left it.', hint:'Click the IEC inlet twice.', check:()=> D.R.boots.length && worldAt(SIM.t).ee[120]===0xAA && D.R.boots.some(b=>b.t0>0) },
];
function viewTutorial(m){
  window[FLAG] = true;
  m.innerHTML = `<div class="grid2"><div>${card('Front panel', `<div id="avmF"></div>${controlsHTML()}`)}${card('Rear panel', `<div id="avmR"></div>`)}</div>
    <div>${card('Operator tutorial (from AVM4MAN.pdf and the firmware)', `<div id="avmLs"></div>`)}${card('What the firmware did', `<div id="avmTr" class="log"></div>`)}</div></div>`;
  bindControls(m.querySelector('.card'));
  const draw=()=>{
    const t=SIM.t; m.querySelector('#avmF').innerHTML = frontSVG(t); m.querySelector('#avmR').innerHTML = rearSVG(t); bindPanels(m);
    let done=0; const rows = LESSONS.map((l,i)=>{ let ok=false; try{ ok=!!l.check(); }catch(e){} if (ok) done++;
      return `<li style="margin-bottom:6px${i===D.lesson?';background:var(--panel2);border-radius:6px;padding:4px':''}"><b>${ok?'✔':'○'} ${l.t}</b><br><span class="small">${l.d}</span>${ok?'':`<br><span class="small muted">Hint: ${l.hint}</span>`}</li>`; });
    m.querySelector('#avmLs').innerHTML = `<p class="small">${done} / ${LESSONS.length} goals met at the playhead. Goals are checked live against the simulated firmware.</p><ol style="padding-left:18px">${rows.join('')}</ol>`;
    const tr=D.trace; m.querySelector('#avmTr').innerHTML = tr? `<b>${esc(tr.name)}</b><br>${tr.lines.map(esc).join('<br>')}` : '<span class="muted">Start with step 1.</span>';
  };
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewSecond(m){
  window[FLAG] = false;
  m.innerHTML = `${card('Timeline at the playhead (same model as the Simulator tab)', `<canvas id="avmTl"></canvas>`)}
   <div class="grid2">${card('One main-loop pass, instruction cycles', `<div id="avmPass"></div>`)}${card('The nearest RS-485 byte, bit by bit', `<canvas id="avmUart"></canvas><div id="avmUb" class="small mono"></div>`)}</div>
   <div class="grid2">${card('CS8415A SPI write (reg2), every pass', `<canvas id="avmSpi"></canvas><p class="small muted">wr8415reg: chip select RB2 low, 3 × shiftout of 8 bits MSB first on RB1 with clk8415 (bsf/bcf RB4): address byte 0x20, map, data. Each bit costs ≈5 instruction cycles ≈ 4 µs (hand count ${inf}).</p>`)}${card('AVM4-1 meter: six A/D slots and the LED multiplex', `<div id="avmMux"></div>`)}</div>
   ${card('Where the time goes: every delay in the firmware', `<div id="avmTimes"></div>`)}`;
  const tbl = [
    ['debounce','bounce_num = 10 passes',10*LOOP_T],
    ['remember (MODE hold → SETP / SAVE)','delay2 × delay1 = 20 × 256 passes',5120*LOOP_T],
    ['NL / MUTE / “SD” flashing (lockflashN)','lock_num × 256 = 7 × 256 passes per half-cycle',1792*LOOP_T],
    ['setup video digit flash (lockflash20/21)','lock_num3 × 256 = 2 × 256 passes',512*LOOP_T],
    ['auto_detect 75 ⇄ 110 Ω','bcount = 15 unlocked passes',15*LOOP_T],
    ['lock_count arming digital_norm','lock_num1 × 256 = 10 × 256 passes',2560*LOOP_T],
    ['RS-485 poll (after a reply)','pole 2 × 256 + communication_control 50 passes',562*LOOP_T],
    ['RS-485 reply time-out (loss_of_com)','(256 − 230) × 256 passes',6656*LOOP_T],
    ['EEPROM save after a release (eewrite)','(256 − 75) × 256 = 46 336 passes',46336*LOOP_T],
    ['boot: DEMUX probe time-outs (program1)','1536, then 6656 probe passes × 25 cy',1536*K.PROBE_CY*TCY],
    ['boot: “V100” (opening_window)','256 × 100 passes × 44 cy',25600*K.WIN_CY*TCY],
    ['AVM4-1 Timer2 interrupt','4 × (PR2 160 + 1) × prescale 4 × postscale 9 / 4.9152 MHz',K.T2],
    ['RS-485 byte','10 bits at 9600 baud',BYTE_T],
  ];
  m.querySelector('#avmTimes').innerHTML = `<table class="kv"><tr><th>What</th><th>Source constant</th><th>Time</th></tr>${tbl.map(r=>`<tr><td>${r[0]}</td><td class="mono small">${r[1]}</td><td class="mono">${SIM.fmtDur(r[2])}</td></tr>`).join('')}</table>
   <p class="small muted">Pass-based times scale with the ${inf} ${(LOOP_T*1e3).toFixed(3)} ms pass. The Timer2 and UART figures come straight from the register values and the 4.9152 MHz crystals.</p>`;
  const draw=()=>{
    const t=SIM.t;
    SIM.drawLanes(m.querySelector('#avmTl'), lanes(), {labelW:210});
    const st=stepAt(t); let x=0; const W=600;
    m.querySelector('#avmPass').innerHTML = `<svg viewBox="0 0 ${W} 150" style="width:100%">${STEPS.map((s,j)=>{ const w=s[1]/STEP_CY*W; const r=`<rect x="${x}" y="10" width="${Math.max(1,w-1)}" height="40" fill="${j===st.k?'var(--warn)':j===12||j===3?'var(--accent2)':'var(--accent)'}" opacity="${j===st.k?1:.65}"><title>${s[0]}: ${s[1]} cy — ${s[2]}</title></rect>`; x+=w; return r; }).join('')}
      <text x="0" y="70" font-size="12" fill="var(--ink)">${st.k>=0? `Now: ${STEPS[st.k][0]} — ${STEPS[st.k][2]}`:'not running'}</text>
      <text x="0" y="90" font-size="11" fill="var(--ink2)">${STEP_CY} instruction cycles × ${(TCY*1e9).toFixed(1)} ns = ${(LOOP_T*1e3).toFixed(3)} ms (inferred hand count). Blue = SPI to the CS8415A (read reg 16, write reg 2 and reg 4).</text>
      <text x="0" y="110" font-size="11" fill="var(--ink2)">The loop has no interrupts (ORG 4: RETFIE). The watchdog is cleared three times per pass.</text>
      <text x="0" y="130" font-size="11" fill="var(--ink2)">Two places stop it: remember3 (while MODE is held after SETP/SAVE) and eewrite (14 × eew).</text></svg>`;
    // uart
    let u=null; for (const q of D.R.uart){ if (q.t0<=t+0.5 && (!u || Math.abs(q.t0-t)<Math.abs(u.t0-t))) u=q; }
    const cv=m.querySelector('#avmUart'); const {c,w}=SIM.canvas(cv,110); c.clearRect(0,0,w,110);
    if (u){ const bits=[0]; for (let i=0;i<8;i++) bits.push((u.b>>i)&1); bits.push(1); const bw=(w-40)/11; c.strokeStyle=css('--accent'); c.lineWidth=2; c.beginPath(); c.moveTo(20,30); c.lineTo(20+0.5*bw,30);
      bits.forEach((b,i)=>{ const yy=b?30:70; c.lineTo(20+(i+0.5)*bw,yy); c.lineTo(20+(i+1.5)*bw,yy); }); c.lineTo(w-20,30); c.stroke();
      c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); bits.forEach((b,i)=> c.fillText(i===0?'start':i===9?'stop':'D'+(i-1)+'='+b, 20+(i+0.6)*bw, 92));
      m.querySelector('#avmUb').innerHTML = `${u.dir==='tx'?'AVM4 → bus':'DEMUX-2 → AVM4'} at ${SIM.fmtT(u.t0)}: 0x${hx(u.b)} = ${bn(u.b)} (${u.lbl||''}) · ${SIM.fmtDur(1/9600)} per bit, LSB first`; }
    else m.querySelector('#avmUb').textContent = 'no byte on the bus in this window';
    // spi
    const p = recAt(t); const cv2=m.querySelector('#avmSpi'); const g=SIM.canvas(cv2,90); g.c.clearRect(0,0,g.w,90);
    const bytes=[0x20,2,p?p.reg2:0x40]; const bw2=(g.w-20)/24; g.c.font='10px '+css('--mono');
    bytes.forEach((by,k)=>{ for (let i=0;i<8;i++){ const b=(by>>(7-i))&1, x0=10+(k*8+i)*bw2; g.c.fillStyle=b?css('--accent2'):css('--grid'); g.c.fillRect(x0,14,bw2-1,22); g.c.fillStyle=css('--ink2'); g.c.fillRect(x0+bw2/2,44,bw2/2-1,12); } g.c.fillStyle=css('--ink'); g.c.fillText(['addr 0x20 (write)','map 2','data 0x'+hx(by)][k], 10+k*8*bw2, 72); });
    g.c.fillText('RB1 data', 10, 10); g.c.fillText('RB4 CCLK', 10, 86);
    // mux
    const k=Math.floor(t/K.T2), slot=((k%6)+6)%6, n=[['VU_LEFT','AN1'],['VU_RIGHT','AN3'],['PK_LEFT','AN6/RE1'],['PK_RIGHT','AN4/RA5'],['LEFT_3','AN5/RE0 ÷2'],['RIGHT_3','AN7/RE2 ÷2']];
    m.querySelector('#avmMux').innerHTML = `<svg viewBox="0 0 520 120" style="width:100%">${n.map((s,i)=>`<rect x="${4+i*86}" y="10" width="82" height="40" rx="5" fill="${i===slot?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${45+i*86}" y="27" text-anchor="middle" font-size="9.5" fill="${i===slot?'#fff':'var(--ink)'}">${s[0]}</text><text x="${45+i*86}" y="41" text-anchor="middle" font-size="8.5" fill="${i===slot?'#fff':'var(--ink2)'}">${s[1]}</text>`).join('')}
      <text x="4" y="72" font-size="11" fill="var(--ink)">Interrupt ${k}: mux,0 = ${k%2?'1 → RIGHT_SEL (RB2) low':'0 → LEFT_SEL (RB1) low'}; PORTC/PORTD = bar AND peak dot (active low).</text>
      <text x="4" y="90" font-size="11" fill="var(--ink2)">Each slot is one TMR2 period, ${(K.T2*1e3).toFixed(3)} ms; a full meter refresh is 6 slots = ${(6*K.T2*1e3).toFixed(1)} ms.</text>
      <text x="4" y="108" font-size="11" fill="var(--ink2)">Each side's LEDs are lit every other slot: ${(1/(2*K.T2)).toFixed(0)} Hz multiplex, 50 % duty.</text></svg>`;
  };
  SIM.on('time', draw);
}

/* ---------------- block diagram ---------------- */
const BLK = {
  ain:{x:10,y:20,w:140,h:70,t:'Analog inputs 1–4',s:['L/R euroblocks, >20 kΩ','+24 dBu max'],d:'Rear ANALOG LEFT / ANALOG RIGHT strips: four stereo inputs plus the monitor OUTPUT pair (AVMBCKSSILK_V1.cdr).'},
  xpt:{x:200,y:20,w:150,h:70,t:'Analog crosspoint',s:['XPT1–4 = RC2–RC5','(AMS4 issue-5 board)'],d:'On the AMS4 issue-5 main board (AVM WIRING.sch: “AMS4 ISSUE5 MAIN BOARD”). output_control drives XPTn low to put input n on the monitor bus. Parts per ams4.js: 8 × 74HC4053 and NE5532 receivers.'},
  aes:{x:10,y:120,w:140,h:70,t:'AES inputs 1–4',s:['75 Ω BNC + 110 Ω euroblock','banks: RC0 / RA1'],d:'Each input has a 75 Ω and a transformer-balanced 110 Ω receiver. auto_detect enables one bank at a time (ee_data bit 7), flipping after 15 unlocked passes.'},
  rx:{x:200,y:120,w:150,h:70,t:'CS8415A + D/A',s:['SPI: RB1/RB2/RB4/RB0','XPTAES = RA2'],d:'reg 2 picks the receiver input: D1 → s3, D2 → s4, D3 → s1, D4 → s2, DEMUX pairs → s5/s6. read8415 reads reg 16 bit 4 (UNLOCK) every pass. The D/A output joins the monitor bus through XPTAES.'},
  dmx:{x:10,y:220,w:140,h:80,t:'DEMUX-2 option',s:['GS9023 + ADV7171','PIC16F874 (2v101)'],d:'SDI IN → de-embedded AES pairs (AOUTA/AOUTB to the CS8415A) and composite video (DEMUX_VIDEO) to the AVM4-2. RS-485 address bytes 111xxxxx. Answers 0xE0 | no-carrier (bit 1) | no-audio (bit 0).'},
  pic:{x:400,y:120,w:150,h:80,t:'Main PIC16F874',s:['avm4v100.asm','4.9152 MHz · RS-485 9600'],d:'Reads MODE/SOURCE, drives the SLG2016 through H1, the crosspoints and the CS8415A, polls the DEMUX-2 and sends video commands to the AVM4-2.'},
  v2:{x:400,y:240,w:150,h:80,t:'AVM4-2 video switch',s:['PIC16C73 · 2 × GX414','EL2044 ×2, 2 outputs'],d:'42v100.asm: accepts address bytes 100xxxxx, uses s2s1s0 to select BNC 1–4 (U1) or the DEMUX composite (U2). The EL2044 (620 Ω/620 Ω, gain 2) drives BNC6/BNC7 through 75 Ω.'},
  lcd:{x:600,y:240,w:140,h:80,t:'LCD monitor',s:['AVM4-LCD-MODIFIED','SYNC SENSE → power'],d:'The functional diagram (AVM4.cdr) shows SYNC SENSE switching the LCD power: no sync on the selected video → screen off.'},
  fp:{x:600,y:20,w:140,h:90,t:'AVM4-1 front board',s:['PIC16F874 meter (41v100)','SLG2016 · 2 × 17 LEDs','MODE/SOURCE · phase'],d:'H1 20-way: D0–D6, A0, A1, ~WR, ~BL to the SLG2016; PHASE to L21/L22; VU_LEFT/VU_RIGHT in; PB1/PB2 out. P1: PK_LEFT/PK_RIGHT. Its own PIC multiplexes the two 17-LED columns.'},
  amp:{x:600,y:130,w:140,h:80,t:'Monitor amp',s:['volume L/R · STEREO','headset normalled','speakers + monitor out'],d:'Functional diagram: volume control → headset jack (normalled) → speaker amplifier; the monitor bus also feeds the rear monitor OUTPUT and the meter.'},
  mute:{x:400,y:20,w:150,h:70,t:'EXT MUTE / TALLY',s:['RA4 in (closure)','RA5 open-collector out'],d:'mute_check: RA4 low → mute_flag, tally on, crosspoints off, display alternates “MUTE”.'},
};
const WIRES=[['ain','xpt'],['aes','rx'],['dmx','rx'],['xpt','amp'],['rx','xpt'],['pic','xpt'],['pic','rx'],['pic','fp'],['pic','dmx'],['pic','v2'],['dmx','v2'],['v2','lcd'],['mute','pic'],['xpt','fp']];
function viewBlock(m){
  window[FLAG]=false;
  m.innerHTML = `<div class="grid2"><div>${card('AVM4 block diagram (redrawn from AVM4.cdr “AVM4 FUNCTIONAL DIAGRAM”, the netlists and the firmware) — click a block', `<div id="avmBd"></div>`)}</div><div>${card('Block detail', `<div id="avmBdD" class="small">Click a block.</div>`)}${card('Live path at the playhead', `<div id="avmPath" class="small"></div>`)}</div></div>`;
  let selB = 'pic';
  const draw=()=>{
    const t=SIM.t, p=recAt(t), W=worldAt(t), src=srcAt(t,W), sel=vselAt(t);
    const live = new Set(); if (p){ live.add('pic'); live.add('fp'); if (p.xpt.includes(0)){ live.add('ain'); live.add('xpt'); live.add('amp'); } if (!p.xa){ live.add('rx'); live.add('xpt'); live.add('amp'); if ((p.reg2&7)>=5) live.add('dmx'); else live.add('aes'); } if (sel){ live.add('v2'); live.add('lcd'); if (sel===5) live.add('dmx'); } if (p.mute) live.add('mute'); }
    const cen=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 750 340" style="width:100%">`;
    WIRES.forEach(([a,b])=>{ const A_=cen(BLK[a]), B_=cen(BLK[b]); const on=live.has(a)&&live.has(b); s+=`<line x1="${A_[0]}" y1="${A_[1]}" x2="${B_[0]}" y2="${B_[1]}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?3:1.5}"/>`; });
    for (const [k,b] of Object.entries(BLK)){ const on=live.has(k); s+=`<g class="avm-blk" data-k="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${k===selB?'var(--accent2)':on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="1.5"/><text x="${b.x+8}" y="${b.y+18}" font-size="12" font-weight="700" fill="${on||k===selB?'#fff':'var(--ink)'}">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10" fill="${on||k===selB?'#fff':'var(--ink2)'}">${l}</text>`).join('')}</g>`; }
    s+=`</svg>`;
    m.querySelector('#avmBd').innerHTML = s;
    m.querySelectorAll('.avm-blk').forEach(g=> g.onclick=()=>{ selB=g.dataset.k; draw(); });
    const b=BLK[selB]; m.querySelector('#avmBdD').innerHTML = `<b>${b.t}</b><p>${b.d}</p>`;
    m.querySelector('#avmPath').innerHTML = p ? `Audio: ${src? src.name+' → '+(src.name[0]==='A'?'XPT'+src.name[1]:'CS8415A → D/A → XPTAES')+' → monitor bus → '+(W.headset?'headset':'speakers')+' and meter' : 'nothing on the monitor bus'}.<br>Video: AVM4-2 select ${VID_NAMES[sel]} → ${videoOn(sel,W)?'LCD shows it':'no sync, LCD off'}.` : 'Unit not running.';
  };
  SIM.on('time', draw);
}

/* ---------------- schematics (redrawn) ---------------- */
function chip(x,y,w,name,left,right,sub){ const h=Math.max(left.length,right.length)*15+30; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.2"/><text x="${x+w/2}" y="${y+15}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y+h+12}" text-anchor="middle" font-size="9.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+30+i*15; s+=`<line x1="${x-40}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink2)"/><text x="${x+4}" y="${yy+3.5}" font-size="9.5" fill="var(--ink)">${p[0]}</text><text x="${x-42}" y="${yy+3.5}" text-anchor="end" font-size="9.5" fill="var(--accent2)">${p[1]}</text>`; });
  right.forEach((p,i)=>{ const yy=y+30+i*15; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+40}" y2="${yy}" stroke="var(--ink2)"/><text x="${x+w-4}" y="${yy+3.5}" text-anchor="end" font-size="9.5" fill="var(--ink)">${p[0]}</text><text x="${x+w+42}" y="${yy+3.5}" font-size="9.5" fill="var(--accent2)">${p[1]}</text>`; });
  return s; }
const SHEETS = [
  {name:'1 · AVM4-1 front board (AVM4-1ISS1.net)', note:'U35 is a PIC16F874 in TQFP-44 (pin numbers match the TQFP pin-out: 6/29 VSS, 7/28 VDD, 30/31 OSC). LD0–LD15 drive both columns’ anodes; LEFT_SEL/RIGHT_SEL switch Q1/Q2 (2N3904) on the cathode resistor packs R5/R6 (left) and R2/R3 (right). The SLG2016 and the buttons are only passed through to H1.', svg:()=>
    chip(235,20,150,'U35 PIC16F874',[['32–1 RC0–RC7','LD0–LD7'],['38–5 RD0–RD7','LD8–LD15'],['8 RB0','LD16 (PK)'],['9 RB1','LEFT_SEL → R19 → Q1'],['10 RB2','RIGHT_SEL → R20 → Q2'],['30/31 OSC','X2 4.9152 MHz, C126/C127 27p'],['18 MCLR','H10-3 (ICSP), D10']],[['20 RA1/AN1','VU_LEFT via R8'],['19 RA0/AN0','VU_LEFT ÷ (R7/R9)'],['22 RA3/AN3','VU_RIGHT via R10'],['21 RA2/AN2','VU_RIGHT ÷ (R11/R12)'],['26 RE1/AN6','PK_LEFT via R13'],['25 RE0/AN5','PK_LEFT ÷ (R14/R15)'],['24 RA5/AN4','PK_RIGHT via R16'],['27 RE2/AN7','PK_RIGHT ÷ (R17/R18)']],'firmware 41v100.asm')
    + chip(690,20,110,'U1 SLG2016',[['1–3,5–12','H1-1…H1-11'],['4, 13','+5 via L1 (1 µH)'],['14','GNDD']],[],'4-char display, driven by the main PIC')
    + chip(690,150,110,'H1 20-way',[['1–11','display bus'],['12','PHASE → L21/L22'],['13/14','VU_LEFT/VU_RIGHT'],['15/16','PB1 MODE / PB2 SOURCE'],['17/18','+5'],['19/20','GNDD']],[],'to the AMS4 main board')
    + `<text x="20" y="300" font-size="10" fill="var(--ink2)">Redrawn from the netlist, not the original CAD. L1L…L17L / L1R…L17R: L1–L7 “RD”, L8–L17 “GR” per the netlist values.</text>`},
  {name:'2 · AVM4-2 video switcher (AVM4-2ISS1.net)', note:'Both GX414 multiplexers share A0/A1 (RA1/RA2) and their outputs; only one ~CS is low at a time. U2 inputs 2–4 are terminated to ground (R12, R11, R9) — only input 1 (BNC5, the DEMUX composite) is used. The RS-485 driver enable (75176 pins 2/3) is on RC5 (U4-16), but the firmware toggles RC1 (pin 12, unconnected).', svg:()=>
    chip(170,30,140,'U4 PIC16C73',[['2 RA0','~CS2 → U2-11'],['3 RA1','A0 → U1/U2-13'],['4 RA2','A1 → U1/U2-12'],['5 RA3','~CS1 → U1-11'],['9/10','X1 4.9152 MHz'],['1 MCLR','R17 1k → +5']],[['16 RC5','U5-2/3 ~RE/DE'],['17 RC6/TX','U5-4 DI'],['18 RC7/RX','U5-1 RO (R22 10k)'],['12 RC1','not connected'],['20 / 8,19','+5 / GNDA']],'42v100.asm (written for P16F73)')
    + chip(470,30,110,'U1 GX414',[['1','BNC1 (R1 100R, R5 75R)'],['3','BNC2'],['5','BNC3 (R4)'],['7','BNC4 (R3)']],[['10','→ U3-3']],'inputs 1–4')
    + chip(470,150,110,'U2 GX414',[['1','BNC5 DEMUX video (R15, R13 75R)'],['3,5,7','75R to GND']],[['10','→ U3-3']],'')
    + chip(670,90,100,'U3 EL2044',[['3 +in','GX414 out'],['2 −in','R18/R19 620R']],[['6 out','R20 → BNC6, R21 → BNC7']],'gain 2 into 75 Ω')
    + chip(470,250,110,'U5 75176',[['1 RO','RC7'],['2/3','RC5'],['4 DI','RC6']],[['6/7 A/B','P2/P3 (RS-485)']],'') + `<text x="20" y="330" font-size="10" fill="var(--ink2)">Power: P1 → REG1 7805 / REG2 7905 (±5 V). Redrawn, not the original CAD.</text>`},
  {name:'3 · System wiring (AVM WIRING.sch, strings only)', note:'The P-CAD binary only gave up its labels: AMS4 ISSUE5 MAIN BOARD, AVM4-1 (P1), AVM4-2 (P1/P2/P3), DEMUX-2 (P1/P3/P5), POWER SUPPLY, LCD MONITOR, BNC5/BNC6, R54 75R, nets AOUTA, AOUTB, DEMUX_VIDEO, PK_LEFT, PK_RIGHT, LINE, NEUTRAL, VIDEO, VIDEO_GND. The connections drawn here follow those names and the functional diagram.', svg:()=>{
    const bx=(x,y,w,h,t,l)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+8}" y="${y+16}" font-size="11" font-weight="700" fill="var(--ink)">${t}</text>${l.map((s,i)=>`<text x="${x+8}" y="${y+32+i*13}" font-size="9.5" fill="var(--ink2)">${s}</text>`).join('')}`;
    const ln=(a,b,c_,d,lbl)=>`<line x1="${a}" y1="${b}" x2="${c_}" y2="${d}" stroke="var(--accent2)" stroke-width="1.5"/><text x="${(a+c_)/2+4}" y="${(b+d)/2-4}" font-size="9.5" fill="var(--accent2)">${lbl}</text>`;
    return bx(300,120,180,90,'AMS4 ISSUE5 MAIN BOARD',['PIC16F874 avm4v100','CS8415A, crosspoints','RS-485 (U36 75176)']) + bx(20,20,170,70,'DEMUX-2',['SDI IN / SDI OUT','P1: AOUTA, AOUTB','P5: RS-485, P3: video'])
      + bx(20,230,170,70,'AVM4-2',['P1 power','P2/P3 RS-485','BNC6 → LCD (R54 75R)']) + bx(600,20,170,70,'AVM4-1',['H1 ← main board','P1: PK_LEFT, PK_RIGHT']) + bx(600,230,170,70,'LCD MONITOR',['VIDEO / VIDEO_GND','SYNC SENSE power'])
      + bx(600,125,170,60,'POWER SUPPLY',['LINE / NEUTRAL','“feed all add-on boards”'])
      + ln(190,55,300,140,'AOUTA/AOUTB') + ln(105,90,105,230,'DEMUX_VIDEO') + ln(190,260,300,200,'RS-485') + ln(480,140,600,60,'H1 20-way') + ln(190,280,600,265,'VIDEO (R54)') + ln(480,170,600,155,'power');
  }},
  {name:'4 · Main-board PIC pins used by avm4v100.asm', note:'From the firmware (TRIS values and pin use) and the AMS4-1 issue-5 netlist reading in ams4.js. The header of avm4v100.asm says “AMS4 issue 4 PCBs”, but the pins it uses (MODE = RB7, SOURCE = RB6, mute = RA4, tally = RA5) are the issue-5 map.', svg:()=>
    chip(250,20,170,'PIC16F874 (main)',[['RB7','PB1 MODE (H1-15)'],['RB6','PB2 SOURCE (H1-16)'],['RA4','EXT MUTE IN'],['RA5','EXT MUTE TALLY'],['RA0/AN0','PHASE_V'],['RA3','PHASE LED (H1-12)'],['RA1','AES 110 Ω bank ~RE'],['RC0','AES 75 Ω bank ~RE'],['RA2','XPTAES']],[['RC2–RC5','XPT1–XPT4'],['RB0/RB1/RB2/RB4','CS8415 SDOUT/SDIN/~CS/CCLK'],['RB5','CS8415 ~RST'],['RD0–RD6','SLG2016 D0–D6'],['RD7','SLG2016 ~BL'],['RE0/RE1','A0/A1'],['RE2','~WR'],['RC1','RS-485 DE/~RE'],['RC6/RC7','TX/RX 9600']],'TRISA 01010001, TRISB 11001001, TRISC 10000000')},
];
function viewSchem(m){
  window[FLAG]=false;
  m.innerHTML = card('Schematic set — redrawn from the archive netlists, BOMs and firmware (not the original CAD)', `<div style="display:flex;gap:6px;flex-wrap:wrap" id="avmSh">${SHEETS.map((s,i)=>`<button data-i="${i}">${s.name}</button>`).join('')}</div><div id="avmShB"></div>`);
  const show=i=>{ const s=SHEETS[i]; m.querySelector('#avmShB').innerHTML = `<p class="small">${s.note}</p><svg viewBox="0 0 820 340" style="width:100%;background:var(--panel);border:1px solid var(--line);border-radius:8px">${s.svg()}</svg>`; m.querySelectorAll('#avmSh button').forEach((b,j)=>b.classList.toggle('on',j===i)); };
  m.querySelectorAll('#avmSh button').forEach(b=> b.onclick=()=>show(+b.dataset.i)); show(0);
}

/* ---------------- software ---------------- */
function viewSoft(m){
  window[FLAG]=false;
  m.innerHTML = `<div class="grid2">${card('avm4v100.asm main loop — running step highlighted', `<div id="avmLoop"></div>`)}${card('Operator state machine (display_setup, remember, setup_mode)', `<div id="avmFsm"></div>`)}</div>
   <div class="grid2">${card('RS-485 messages on the shared bus', `<div id="avmMsg"></div>`)}${card('EEPROM map (live)', `<div id="avmEe"></div>`)}</div>
   <div class="grid2">${card('AVM4-1 table: ADRESH → LED segment', `<canvas id="avmTab"></canvas><p class="small muted">The 256-entry retlw table at ORG 0xAFA maps the 8-bit reading to a segment. The thresholds sit on 62 × 10^(dB/20) (0 VU = code 62, +6 = 125, +12 = 250), so the meter is linear in voltage and the bottom LEDs fall into the first 9 codes.</p>`)}${card('Buttons → firmware → wire', `<div id="avmBtn"></div>`)}</div>`;
  const draw=()=>{
    const t=SIM.t, st=stepAt(t), p=recAt(t), W=worldAt(t);
    m.querySelector('#avmLoop').innerHTML = `<svg viewBox="0 0 460 ${STEPS.length*21+10}" style="width:100%">${STEPS.map((s,j)=>`<rect x="4" y="${4+j*21}" width="452" height="18" rx="4" fill="${j===st.k?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="10" y="${17+j*21}" font-size="10.5" font-family="monospace" fill="${j===st.k?'#fff':'var(--ink)'}">${s[0]}</text><text x="450" y="${17+j*21}" text-anchor="end" font-size="9.5" fill="${j===st.k?'#fff':'var(--ink2)'}">${s[2]}</text>`).join('')}</svg>${st.spin?'<p class="small" style="color:var(--bad)">Stuck in remember3 until MODE is released.</p>':''}`;
    const mode = p? (p.setup?'SETUP':['','A','D',,'S'][p.mode]) : '';
    const nd=(x,y,l,on,sub)=>`<g><rect x="${x-46}" y="${y-20}" width="92" height="40" rx="8" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x}" y="${y-3}" text-anchor="middle" font-size="12" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${l}</text><text x="${x}" y="${y+12}" text-anchor="middle" font-size="9" fill="${on?'#fff':'var(--ink2)'}">${sub}</text></g>`;
    m.querySelector('#avmFsm').innerHTML = `<svg viewBox="0 0 460 250" style="width:100%">${nd(70,40,'ANALOG',mode==='A','A1…A4 “An v”')}${nd(230,40,'AES',mode==='D','D1…D4 · NL')}${nd(390,40,'SDI',mode==='S','S1…S8 (DEMUX)')}${nd(230,190,'SETUP',mode==='SETUP','audio × video')}
      <path d="M116 40H184M276 40H344" stroke="var(--ink2)" marker-end=""/><path d="M390 62 Q230 120 70 62" fill="none" stroke="var(--ink2)"/><text x="230" y="105" text-anchor="middle" font-size="10" fill="var(--ink2)">MODE press (rlf mode; without a DEMUX: A ⇄ D)</text>
      <path d="M150 60 L200 168" stroke="var(--warn)" fill="none"/><text x="60" y="140" font-size="10" fill="var(--warn)">hold MODE 5120 passes → “SETP”</text>
      <path d="M276 180 Q360 150 330 62" stroke="var(--warn)" fill="none"/><text x="300" y="150" font-size="10" fill="var(--warn)">hold → “SAVE” → mode ← temp3</text>
      <text x="10" y="230" font-size="10" fill="var(--ink2)">SOURCE press: next input in the mode.</text><text x="10" y="244" font-size="10" fill="var(--ink2)">In SETUP: MODE = next audio, SOURCE = next video X/1/2/3/4/5.</text></svg>`;
    const ee=W.ee;
    m.querySelector('#avmEe').innerHTML = `<table class="kv"><tr><th>addr</th><th>name</th><th>value</th></tr><tr><td>0</td><td>ee_data (bit 7 = 110 Ω, bits 6/5 = mode, bit 4 = S5–S8, bits 3–0 = port)</td><td class="mono">${ee[0]!==undefined?bn(ee[0]):'—'}</td></tr>${[0,1,2,3,4,5].map(k=>`<tr><td>${101+2*k} / ${102+2*k}</td><td>video${k+1}1 / video${k+1}2 (${VID_NAMES[k]})</td><td class="mono">${ee[101+2*k]!==undefined?bn(ee[101+2*k])+' / '+bn(ee[102+2*k]):'—'}</td></tr>`).join('')}<tr><td>120</td><td>first-time marker 0xAA</td><td class="mono">${ee[120]!==undefined?'0x'+hx(ee[120]):'blank'}</td></tr></table>
      <p class="small muted">Bit n of videoK1 = audio A1–A4 (bits 0–3) and D1–D4 (bits 4–7) use video K; videoK2 covers S1–S8. Saved only by eewrite, ≈ 27 s of released-button time after a press.</p>`;
    const cv=m.querySelector('#avmTab'); const {c,w}=SIM.canvas(cv,150); c.clearRect(0,0,w,150); const code=p?codeOf(meterAt(t).vu):-1;
    for (let i=0;i<256;i++){ const s=segOf(i); c.fillStyle= i===code? css('--bad') : (s%2? css('--accent'):css('--accent2')); c.fillRect(10+i*(w-20)/256, 120-s*6.5, (w-20)/256+0.3, s*6.5); }
    c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText('ADRESH 0', 10, 140); c.fillText('255', w-30, 140); c.fillText(code>=0?`now: code ${code} → ${segOf(code)?SILK[segOf(code)-1]:'off'}`:'', w/2-50, 14);
    m.querySelector('#avmMsg').innerHTML = `<table class="kv"><tr><th>Bytes</th><th>Who listens</th><th>Meaning</th></tr>
      <tr><td class="mono">E8 55</td><td>DEMUX-2 (111xxxxx)</td><td>boot probe, bit 3 = sdi_check → reply 0xE0</td></tr>
      <tr><td class="mono">F0|n 55</td><td>DEMUX-2</td><td>SDI index n (S1–S8), bit 4 = on; GS9023 group = n ÷ 2 + 1</td></tr>
      <tr><td class="mono">90|v 55</td><td>AVM4-2 (100xxxxx)</td><td>video v: 0 none, 1–4 BNC, 5 DEMUX composite</td></tr>
      <tr><td class="mono">E0|b1|b0</td><td>main PIC</td><td>DEMUX reply: b1 = no carrier, b0 = no audio</td></tr>
      <tr><td class="mono">3C</td><td>main PIC (ignored)</td><td>AVM4-2 reply — never driven onto the bus</td></tr></table>
      <p class="small">Now: txflags = ${p?bn(p.txf):'—'} · last byte ${(()=>{ const u=[...D.R.uart].reverse().find(u=>u.t0<=t); return u? `0x${hx(u.b)} (${u.dir}) at ${SIM.fmtT(u.t0)}`:'none'; })()}</p>`;
    m.querySelector('#avmBtn').innerHTML = `<table class="kv"><tr><th>Operator does</th><th>Firmware path</th><th>Effect</th></tr>
      <tr><td>MODE</td><td class="mono small">input_routine → debounce → display_setup/sw_mode</td><td class="small">mode rotates; output_control, digital_output; txflags,0 asks for an RS-485 update</td></tr>
      <tr><td>SOURCE</td><td class="mono small">sw_source → rlf sourcea/sourced/sources</td><td class="small">XPTn or cs8415reg2; display “An v”, “Dn v”, “Sn v”</td></tr>
      <tr><td>Hold MODE</td><td class="mono small">remember → stage_1 / stage_2</td><td class="small">“SETP”: setup on A1; “SAVE”: mode ← temp3</td></tr>
      <tr><td>Setup MODE / SOURCE</td><td class="mono small">sw_mode1 / sw_source1 → setup_mode → reset_videoN</td><td class="small">video11…video62 rewritten every pass; LCD previews at the next video message</td></tr>
      <tr><td>Close EXT MUTE</td><td class="mono small">mute_check</td><td class="small">RA5 tally, crosspoints off, “MUTE” flashing, buttons ignored</td></tr>
      <tr><td>Plug an AES cable</td><td class="mono small">read8415 → processdata → lock_count/aes_mode</td><td class="small">UNLOCK clears → XPTAES low; else auto_detect flips 75/110 Ω</td></tr></table>
      <p class="small">Last action: <b>${D.trace?esc(D.trace.name):'none yet'}</b></p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window[FLAG]=false;
  m.innerHTML = card('Artwork 2026|59', `<ol><li><b>Artwork 2026|59: front/rear panels now from</b> ${SIM.src(AVMS+'avm4-frontssv1.cdr','avm4-frontssv1.cdr')} and ${SIM.src(AVMS+'AVMBCKSSILK_V1.cdr','AVMBCKSSILK_V1.cdr')} (12 Feb 2002) as vectors, replacing the PNG cuts.</li>${FOOT.map(f=>`<li>${f.text} <span class="muted small">— ${SIM.src(f.src)}</span></li>`).join('')}</ol>`) + card('What the AVM4 and its firmware are up to', `<ol>
   <li><b>The video board can never answer.</b> AVM4-2 <span class="mono">42v100.asm</span> was cloned from the DEMUX-2 UART code (same <span class="mono">scanuart</span>/<span class="mono">txuart</span>, same “uart0 = (framing bit, a1, a0, hp, term…)” comment, same delayed-reply counters). Its <span class="mono">txuart</span> enables the transmitter with <span class="mono">bsf PORTc,1</span>, but on <span class="mono">AVM4-2ISS1.net</span> the 75176 DE/~RE (U5-2/3) is on U4-16 = RC5, and RC1 (U4-12) is in no net. INIT even sets RC5 low (“RS485 IN RX MODE”) and leaves RC1 as an input (TRISC 10011011). Its 0x3C reply never reaches the bus. The main PIC already ignores 0x3C in <span class="mono">processdata</span>, which suggests this was known.</li>
   <li><b>So every video command ends in a time-out.</b> After sending, <span class="mono">settxdata</span> will not send again until a reply arrives or <span class="mono">loss_of_com</span> counts 26 × 256 passes (≈ ${(6656*LOOP_T).toFixed(1)} s, ${inf} pass time). A SOURCE press that changes the video waits for that time-out before the AVM4-2 switches, although the manual says the unit “will immediately monitor the associated video source”. In SDI mode the main PIC alternates DEMUX and video messages, so the DEMUX carrier status (NL) is also refreshed only every few seconds.</li>
   <li><b>Entering setup changes the mode first.</b> MODE is both the setup key and the mode key. <span class="mono">debounce</span> accepts the press after 10 passes and <span class="mono">sw_mode</span> steps the mode; only after 20 × 256 passes does <span class="mono">remember</span> show “SETP” and save the (already stepped) mode in <span class="mono">temp3</span>. Leaving with “SAVE” steps the setup audio once and then restores <span class="mono">temp3</span>. The manual says the unit “will revert to the last audio source monitored before entering the setup mode”.</li>
   <li><b>The whole firmware stops while MODE is held.</b> <span class="mono">remember3</span> loops on <span class="mono">btfss portb,7</span> with only <span class="mono">clrwdt</span>: no display flashing, no lock tracking, no mute check, no RS-485 until the button is released.</li>
   <li><b>Two display files, one built.</b> <span class="mono">avm4v100.asm</span> includes <span class="mono">mode1.asm</span> (ORG 0x900, “A1 1” with the video digit on the right and a setup editor). <span class="mono">mode.asm</span> is the older AMS4-style version (“SD1”, no video digit, no setup) and is not included anywhere. The manual describes SD1–SD8 codes; the built code shows “S1”…“S8”.</li>
   <li><b>The EEPROM save is slow and cumulative.</b> <span class="mono">eewrite</span> waits for <span class="mono">press_flag,2</span> to stay set for (256 − 75) × 256 passes (≈ ${(46336*LOOP_T).toFixed(0)} s ${inf}). <span class="mono">rem2/rem4</span> are not reset by a new press, only paused. Power off sooner and the new setup is lost. The 14 writes then stall the loop for ≈ 52 ms (each <span class="mono">eew</span> waits for the previous write).</li>
   <li><b>Unlock is immediate, lock arms later.</b> <span class="mono">lock_num2</span> = 1 and the <span class="mono">lock_counter2/3</span> decrements are commented out, so XPTAES goes high (D/A path off) on the first unlocked pass. On lock, <span class="mono">reg_unlocked</span> opens XPTAES at once; the 10 × 256-pass count only clears <span class="mono">disctl,3</span>, which arms <span class="mono">digital_norm</span>.</li>
   <li><b>SDI pair order is the opposite of the AMS4.</b> <span class="mono">tx_setup</span> sends odd sources (S1, S3…) to CS8415 input s6 and even ones to s5. AMS4 v2.03 does the reverse (ams4.js). DEMUX-2 v101 <span class="mono">setgroup1</span> maps index n to group n ÷ 2, so the two boards must have different P1 harnesses, or one of them plays the wrong pair. The wiring schematic’s nets (AOUTA/AOUTB) could not be recovered from the P-CAD binary.</li>
   <li><b>Fall-through in <span class="mono">non_sdi_setup</span>.</b> <span class="mono">analog1</span>…<span class="mono">digital3</span> have no <span class="mono">return</span> at the end: if no video bit is set for that source, the code drops into the next source’s checks and sends its video. <span class="mono">setup_mode</span> always keeps one bit set, so it only bites with a corrupt EEPROM.</li>
   <li><b>The meter is linear and labelled for another scale.</b> The 41v100 table thresholds follow 62 × 10^(dB/20) (0 = 62, +6 = 125, +12 = 250). With 8 bits the bottom four LEDs (−30, −28, −24, −20 on the silk) light at codes 3, 4, 5 and 6 (≈ −26, −24, −22, −20 dB). The jump labels <span class="mono">signal10, signal7, signal5, signal3, signal1</span> match the AMS4 LM3916 VU scale (−10 −7 −5 −3 −1), but the AVM4 silk reads −16 −8 −4 −2 −1. The functional diagram (AVM4.cdr) still draws the AMS4 −20…+3 meter. The silk’s 0 dB label is the letter “R” in the CDR.</li>
   <li><b>Meter LED colours look inverted.</b> In <span class="mono">AVM4-1ISS1.net</span> L1–L7 (LD0–LD6, the bottom −30…−4) are “RD” and L8–L17 (−2…+12 and PK) are “GR”. The panel here follows the netlist; no photo is archived to confirm it.</li>
   <li><b>The PK LED is a separate, divided channel.</b> LEFT_3/RIGHT_3 read AN5/AN7, which see PK_LEFT/PK_RIGHT through 1 k/1 k dividers (R14/R15, R17/R18). The threshold 190 therefore means ≈ +15.7 dB on the peak scale (${inf}: assumes the same 0 VU = 62 scaling). The comments still call it “+3”.</li>
   <li><b>AVM4-1 interrupt slips.</b> The ISR saves W with <span class="mono">movwf INDF</span> (FSR = 0x20 = INTERRUPT_W, a trick), clears <span class="mono">PIE1,TMR1IE</span> twice instead of TMR2IE (the comment says timer2), and the T2CON comment says “POSTSCALE 1:7 PRESCALE 1:8” for 0x45, which is 1:9 and 1:4.</li>
   <li><b>Project files from other products.</b> <span class="mono">Avm4.pjt</span> and <span class="mono">42v100.pjt</span> list <span class="mono">0=ams1v101.asm</span>, path <span class="mono">M:\\AmS\\PROGRAM\\</span>, processor 16F874 and 4 MHz. The real crystal is 4.9152 MHz (needed for 9600 baud with SPBRG = 7). <span class="mono">42V100.ERR</span> reports “Processor-header file mismatch” (P16F73.INC in a 16F874 project), and the BOM fits a PIC16C73 (OTP), while the README listing says PIC16F73.</li>
   <li><b>Header says issue 4, pins say issue 5.</b> <span class="mono">avm4v100.asm</span> claims “AMS4 issue 4 PCBs”; its pins are the issue-5 map and AVM WIRING.sch says “AMS4 ISSUE5 MAIN BOARD”. INIT’s <span class="mono">bcf PORTB,6 ;TURN OFF MUTE TALLEY</span> is an issue-4 leftover (RB6 is now the SOURCE input).</li>
   <li><b>Termination after boot.</b> INIT always enables the 75 Ω bank, even when <span class="mono">ee_data</span> bit 7 says 110 Ω. Because <span class="mono">auto_detect</span> toggles the bit before setting the pins, a saved 110 Ω input costs one extra 15-pass hunt. After SDI mode both banks stay off until <span class="mono">auto_detect</span> flips them back.</li>
   <li><b>Silent first power-up.</b> With a blank EEPROM, <span class="mono">translate</span> returns early, so <span class="mono">input_flag,1</span> is never set and <span class="mono">output_control</span> never runs: INIT left XPT1–4 and XPTAES high, so the display reads “A1 1” but nothing is heard until the first button press. After a save, <span class="mono">translate</span> sets <span class="mono">input_flag,1</span> and the crosspoint closes at once.</li>
   <li><b>Uninitialised debounce.</b> INIT never sets <span class="mono">bounce_count</span>, <span class="mono">bounce_reg</span> or <span class="mono">bounce_flag</span>; the first press may take up to 256 passes (the simulation starts them at 10).</li>
   <li><b>Archive housekeeping.</b> The SILK CDRs are identical copies in <span class="mono">AVM4 - #SILK/</span> and <span class="mono">AVM4 &amp; AVM4E - #Mechanical #Obsolete/AVM4/Silks/</span>; <span class="mono">AVM4.cdr</span> and <span class="mono">AVM manual1.cdr</span> are duplicated in <span class="mono">AVM4 - #MANUAL/</span>; <span class="mono">AVM4MAN.pdf</span> = <span class="mono">AVM4 - #MANUAL.pdf</span>. The text recovered from <span class="mono">AVM4-M2.dwg</span> belongs to other products (IMPM05, POD10-REAR, ABB-M1). The manual cover’s rear view labels the AES BNCs 1, 2, 2, 4.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
   <li>Main-loop pass ≈ ${(LOOP_T*1e3).toFixed(3)} ms, program1 pass 25 cycles, opening_window pass 44 cycles: hand counts (${inf}).</li>
   <li>Power-up timer 72 ms, DEMUX-2 ready 100 ms after power, reply delay 1.2 ms, GS9023 group change 40 ms, CS8415A relock 3 ms, EEPROM write 4 ms (${inf}).</li>
   <li>Meter: VU τ 47 ms from the AMS4 board (ams4.js), peak = level + 3 dB with 0.6 s release, 0 VU = ADC code 62 (${inf} from the table). PK hold 1.5 s is the comment's figure.</li>
   <li>Phase: XOR duty = phase difference ÷ 180°, uncorrelated or silent = 50 % (${inf}).</li>
   <li>The DEMUX-2 is modelled from 2v101.asm; the DEMUX pair that reaches s5/s6 is assumed to be the one the AVM4 asked for.</li>
   <li>LCD test pictures and the SYNC SENSE power switching follow the functional diagram; the picture content is invented for display.</li></ul>`)
  + card('Sources', `<ul class="small mono">
   <li>#AV #SERIES/XXX - AVM - #OBSOLETE #Archive/AVM4 - #Master/AVM4 - #Software/Avm4/avm4v100.asm, init.asm, ee_data.asm, uart.asm, mode1.asm, mode.asm, Avm4.pjt, AVM4V100.ERR</li>
   <li>…/Avm41/41v100/41v100.asm, init.asm, bar_meter.asm, ADCONVERTER.ASM, 41v100.err · …/Avm42/42v100.asm, init.asm, 42v100.pjt, 42V100.ERR</li>
   <li>…/AVM4 - #PCB #ISS1/AVM4-1ISS1.net/.bom, AVM4-2ISS1.net/.bom/.ECO · …/AVM WIRING.sch · …/AVM4.cdr · …/AVM manual1.cdr · …/AVM4MAN.pdf</li>
   <li>…/AVM4 - #SILK/avm4-frontssv1.cdr, AVMBCKSSILK_V1.cdr · …/AVM4 - #MECHANICAL/AVM4-M1.dwg</li>
   <li>#DEMUX #SERIES/XXX - DEMUX2 - #Master #OBSOLETE/DEMUX2 - #Engineering/DEMUX-2 - #Software/DEMUX-2 - #Software #v101/2v101.asm, demux-2.asm · siumulation-plugins/ams4.js</li></ul>`);
}

/* ---------------- register ---------------- */
SIM.register({
  id: ID,
  product: 'AVM',
  name: 'AVM · AVM4 audio/video monitor (2002|35)',
  year: 2002,
  family: 'Obsolete products',
  folder: '#AV #SERIES/XXX - AVM - #OBSOLETE #Archive',
  summary: 'Two-rack-unit SELECT SERIES audio/video monitor: four analog, four AES (75/110 Ω auto-detect) and, with the DEMUX-2 option, eight embedded SDI pairs, each tied to one of four composite inputs or the SDI picture on a built-in LCD. Three PIC16 processors share the work: the main board (display, crosspoints, CS8415A, RS-485), the AVM4-1 LED meter and the AVM4-2 video switcher.',
  highlights: ['Front and rear panels on the real silkscreen (converted CorelDRAW)', 'Pass-by-pass port of avm4v100.asm: SETP/SAVE, NL, MUTE, auto 75/110 Ω, EEPROM', 'RS-485 bytes to the DEMUX-2 and the AVM4-2, with the video board that can never reply', 'AVM4-1 meter table and 6-slot multiplex', '14-step operator tutorial'],
  depth: 'Full model',
  footnotes: FOOT,
  duration: DUR,
  stepUnits: [
    {label:'1 main-loop pass', period:()=>LOOP_T},
    {label:'1 RS-485 byte', period:()=>BYTE_T},
    {label:'1 meter slot (TMR2)', period:()=>K.T2},
    {label:'1 video field', period:()=>1001/60000},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms: [[4,'4 s (whole window)'],[1,'1 s'],[0.25,'250 ms'],[0.05,'50 ms'],[1001/60000,'1 field (16.7 ms)'],[0.005,'5 ms'],[0.0015,'1.5 ms (≈ 2.5 passes)'],[0.0003,'300 µs']],
  defaultZoom: 1,
  init(){ if (!D.R) resim(); },
  tabs: [
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the AVM4', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
