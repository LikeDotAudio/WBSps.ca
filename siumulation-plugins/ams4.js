/* =====================================================================
   AMS4 — 1RU "AMS4 AUDIO MONITOR SYSTEM" (Ward-Beck Systems SELECT SERIES)
   4 stereo analog + 4 AES (75 Ω / 110 Ω auto-detect) + optional SDI DEMUX,
   PIC16F874 firmware v2.00 … V5.00, plus the AMS4N (NBC) and AMS4E (ATmega128) variants.
   Plugin for the WBS Device Simulator (../siumulation.html).

   Sources used (all in this archive, folder "AMS4 - #Master"):
   - AMS4 - #Engineering/AMS4 - #SOFTWARE #PIC/
       #V050000/Ams4v500/ams1v203.asm, init.asm, mode.asm, ee_data.asm, AMS4v500.mcp   (V5.00, "Ali-Add")
       #v203, #v202 (ams1v20x.asm + includes), #v201/ams1v201.asm, #v200/ams1v200.asm,
       #Custom/#c200/ams1c200.asm, #Custom/#c203/ams4c203.asm + mode.asm, v20x .mcp (/c- switch)
   - AMS4 - #Engineering/AMS4N - Custom for NBC/Software/v100/ams4nv0.asm
   - AMS4 - #Engineering/AMS4E/Software/Ams4e-1/working/ams4e.c (ICCAVR, ATmega128)
   - AMS4 - #Engineering/AMS4-1/PCB/AMS4-1ISS5.net + .bom (P-CAD netlist: every pin/net used below)
   - AMS4 - #Engineering/AMS4-2, -3, -4, -6 netlists (display/meter, level/headset, rear terminals, AMS4N panel)
   - AMS4 & AMS4N - #Mechanical #DA #2016/A-AMS4 BOM Structure.pdf
   - AMS4 & AMS4N - #ARTWORK #DA #2016/PDF`s/AMS4-FRONT&REAR-SILK(CURVE).pdf
       → tools/silk_extract.py → assets/ams4-front-green.png, ams4-front-white.png, ams4-rear-white.png (200 dpi)
   - AMS4 - #Engineering/MECHANICAL /AMS4-FRONT ISS 7, AMS4-REAR ISS 7, DEMUX 4-REAR (ADAPTOR PLATE) ISS 1,
       DEMUX4-COVER ISS 1 PDFs (hole positions); …/Pics/AMS4 Front.jpg, AMS4 Rear with Demux 4 (NEW).jpg
   - Ams4 - #manual #Obsolete/AMS4 #OBSOLETEManual/AMS4 Manual.pdf (2007|40)
   - SA-DEMUX4 - #Master/…/Atmel/V020102-AMS4/demux4.c (the DEMUX-4's side of the RS-485 link)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
'use strict';
const SIM = window.SIM;
const ID = 'ams4', FLAG = '__ams4Active';
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const card = (t,b,id)=>`<div class="card"${id?` id="${id}"`:''}><h2>${t}</h2>${b}</div>`;
const hx = (v,n)=> (v>>>0).toString(16).toUpperCase().padStart(n||2,'0');
const bn = (v,n)=> (v>>>0).toString(2).padStart(n||8,'0');
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const off = ()=>{ window[FLAG]=false; };

/* ---------------- clock and firmware constants ----------------
   X2 = 4.9152 MHz crystal on OSC1/OSC2 (U35 pins 30/31, BOM "S1-4M9152"). The .pjt says 4 MHz, but SPBRG = 7
   with BRGH = 0 only gives the 9600 baud in the comment at 4.9152 MHz (4.9152e6 / 64 / 8 = 9600). */
const FOSC = 4.9152e6, TCY = 4/FOSC;               // 813.8 ns per instruction
const DUR = 4;                                     // simulated window (s)
const BYTE_T = 10/9600;                            // 8N1 byte on the RS-485 link
const K = {
  BOUNCE: 0x0A,        // bounce_num equ 0x0A
  LOCK_NUM: 7,         // lock_num equ 0x07 (display flash: lockflash × 256 passes)
  LOCK_NUM1: 10,       // lock_num1 equ 10 "aes lock xpt"   → 10 × 256 passes before XPTAES opens
  LOCK_NUM2: 4,        // lock_num2 equ 4  "aes unlock xpt" → 4 × 256 passes
  BCOUNT: 0x0F,        // auto_detect: movlw 0x0f
  PH_TH: 100,          // phase: movlw 100 ; phase threshold (ADRESH)
  RX_LOCK: 0.003,      // CS8415A PLL lock after its input changes — inferred (datasheet not archived)
  DMX_SETTLE: 0.05,    // DEMUX re-lock after a new group/input command — inferred
  DMX1_REPLY: 0.001,   // DEMUX-1 reply delay — inferred
  DMX4_REPLY: 5*1024/FOSC, // DEMUX-4 V020102: TCNT0 / Timer0 clk/1024 → reply ≈ 1 ms (as in demux4.js)
  DMX4_READY: 5.94,    // DEMUX-4 Spartan-6 configuration from SPI flash (demux4.js CFG_T) — inferred
  DMX1_READY: 0.2,     // inferred
  EE_WR: 0.004,        // PIC16F87x EEPROM write time (typ.) — inferred
  PWRT: 0.072,         // power-up timer — config bits are not in the source: inferred
  HOLD: 0.03,          // a click holds the button for 30 ms
  ACT_T: 0.005,        // actions land 5 ms into the new window
  VU_TAU: 0.047,       // R52 1M × C80 0.047 µF on the LF353 rectifier (BOM)
  PH_TAU: 0.020,       // R118 20k × C132 1.0 µF on PHASE_V (BOM)
  PROBE_IT: 25,        // cycles per program1 loop pass (hand count) — inferred
  WIN_IT: 44,          // cycles per display_version pass (hand count) — inferred
};
const VU = [-20,-10,-7,-5,-3,-1,0,1,2,3];          // front silk scale (LM3916 VU steps)

/* ---------------- firmware versions (selector) ---------------- */
const VERS = {
  v500:{n:'V5.00', label:'V5.00 — SDI A/B (“Ali-Add”), files 2010–2014|43–47 · latest production', kind:'pic', vs:'V500', ab:true,  sdiRx:'s56', lockSrc:'pairs', reg6:0x80, reg17:0x1F, pins:'iss5', year:2014, file:'#V050000/Ams4v500/ams1v203.asm'},
  v203:{n:'v2.03', label:'v2.03 — init fix for the issue-5 board, 17 Jun 2002|35', kind:'pic', vs:'V203', ab:false, sdiRx:'s56', lockSrc:'pairs', reg6:0x80, reg17:0x1F, pins:'iss5', year:2002, file:'#v203/ams1v203.asm'},
  v202:{n:'v2.02', label:'v2.02 — CS4335 24-bit DAC, 7 Jan 2002|35', kind:'pic', vs:'V202', ab:false, sdiRx:'s0', lockSrc:'pairs', reg6:0x80, reg17:0x1F, pins:'iss5', tallyBug:true, year:2002, file:'#v202/ams1v202.asm'},
  v201:{n:'v2.01', label:'v2.01 — both pairs of an SDI group, 28 Aug 2001|34 (issue-4 board)', kind:'pic', vs:'V201', ab:false, sdiRx:'s0', lockSrc:'pairs', reg6:0xA8, reg17:0x1F, pins:'iss4', year:2001, file:'#v201/ams1v201.asm'},
  v200:{n:'v2.00', label:'v2.00 — issue-4 PCB + DEMUX-1, 25 Jul 2001|34', kind:'pic', vs:'V200', ab:false, sdiRx:'s0', lockSrc:'gennum', reg6:0xA8, reg17:0x10, pins:'iss4', year:2001, file:'#v200/ams1v200.asm'},
  c203:{n:'c2.03', label:'custom 2.03c — A1 mixed with A2/3/4, analog only, 16 Jun 2003|36', kind:'pic', vs:'C203', ab:false, sdiRx:'s56', lockSrc:'pairs', reg6:0x80, reg17:0x1F, pins:'iss5', mixA1:true, analogOnly:true, tries:11, year:2003, file:'#Custom/#c203/ams4c203.asm'},
  c200:{n:'c200', label:'custom c200 — selected input mixed with A1, MODE disabled, 19 Sep 2007|40', kind:'pic', vs:'C200', ab:false, sdiRx:'s56', lockSrc:'pairs', reg6:0x80, reg17:0x1F, pins:'iss5', mixA1:true, modeOff:true, year:2007, file:'#Custom/#c200/ams1c200.asm'},
  ams4n:{n:'AMS4N v1.00', label:'AMS4N v1.00 — NBC, four pushbuttons and no display, 9 Jul 2005|38', kind:'ams4n', vs:'', ab:false, sdiRx:'s56', lockSrc:'pairs', reg6:0x80, reg17:0x1F, pins:'iss5', year:2005, file:'AMS4N - Custom for NBC/Software/v100/ams4nv0.asm'},
  ams4e:{n:'AMS4E', label:'AMS4E — ATmega128 prototype “AMS4 DOLBY V2.00”, 2004|37', kind:'ams4e', vs:'', ab:false, pins:'iss5', year:2004, file:'AMS4E/Software/Ams4e-1/working/ams4e.c'},
};
const PINS = { iss5:{mode:'RB7', src:'RB6', mute:'RA4', tally:'RA5'}, iss4:{mode:'RA5', src:'RA4', mute:'RB7', tally:'RB6'} };

/* ---------------- operator-side world (static during one window) ---------------- */
function defWorld(){ return {
  power:true, demux:'dmx4',               // 'none' | 'dmx1' | 'dmx4'
  ana:[ {on:true, lvl:4,  ph:'in',     f:1000}, {on:true, lvl:-6, ph:'inv', f:400},
        {on:true, lvl:8,  ph:'uncorr', f:1000}, {on:false,lvl:4,  ph:'in',  f:1000} ],
  aes:[ {c75:true, c110:false, lvl:-20, ph:'in', f:1000}, {c75:false, c110:true, lvl:-14, ph:'in', f:400},
        {c75:false,c110:false, lvl:-20, ph:'in', f:1000}, {c75:true,  c110:true, lvl:-20, ph:'Lonly', f:1000} ],
  sdi:[ {on:true, fmt:'HD 1080i 59.94', groups:0b0011}, {on:true, fmt:'SD 525i 59.94', groups:0b0001} ],  // plate "SDI 1 (A)", "SDI 2 (B)"
  mute:false, headset:false, stereo:true, potL:0.72, potR:0.72,
}; }
function defDyn(){ return { ee:{0:0x21, 1:0x00, 10:0xAA}, rx:{key:'',since:0}, txBusy:-1, dm:{b1:0, cmd:0xE0, selT:-9, inT:-9, ready:0, pend:[]}, rxq:[], phv:0, phT:0, eeBusy:-1 }; }

const D = { ver:'v500', W:defWorld(), base:null, run:null, log:[], lastTrace:null, e:{audio:0, vol:30, enc1:0} };
let lessonIdx = 0;

/* ======================================================================
   Firmware engine — a JS port of the PIC16F874 main loop, pass by pass.
   Every routine adds its hand-counted instruction cycles (inferred) so the
   timeline shows when things happen inside a pass.
   ====================================================================== */
const STEPS = [
  ['main: clrwdt','watchdog cleared'],
  ['input_routine','MODE/SOURCE pins → input'],
  ['debounce','bounce_count = 10 passes'],
  ['read8415','SPI read reg 16 → cs8415_16 (UNLOCK)'],
  ['auto_detect','15 unlocked passes → flip 75/110'],
  ['display_setup','sw_mode / sw_source'],
  ['unlock_source','disctl,2|3 · input_flag,7'],
  ['analog_mode','“A1” or MUTE'],
  ['aes_mode','“D1” · NL · MUTE'],
  ['sdi_mode','“SA1” · NL · flashing number'],
  ['refresh','4 × SLG2016 writes'],
  ['output_control','XPT1–4 · XPTAES'],
  ['phase','ADRESH ≥ 100 → RA3 red'],
  ['digital_output','cs8415reg2 ← input'],
  ['mute_check','EXT MUTE → tally'],
  ['processdata','disctl lock bits'],
  ['lock_count','2560 on / 1024 off'],
  ['reg2','SPI write reg 2'],
  ['reg4','SPI write reg 4'],
  ['eewrite','≈46 336 passes after release'],
  ['btfss comout,0','DEMUX present?'],
  ['communication_control','polecount2 = 50'],
  ['pole','polecount0 × polecount1'],
  ['scanuart','RCREG → uart0'],
  ['loss_of_com','26 × 256 passes'],
  ['tx_setup','sources → tx0'],
  ['processdata (2)','with the reply'],
  ['settxdata','tx0, tx1 = 0x55'],
  ['txuart','one byte per pass'],
];
const NST = STEPS.length;
const RECF = ['mode','sdiab','sourcea','sourced','sources','disctl','input_flag','mute_flag','lock','bcount','ee_data','txflags','uart0','tx0','reg2','cs8415_16','press_flag','rem2','rem4','lc0','lc1','lc2','lc3','comout','polecount2','polecount0','polecount1','bounce_count','adres','bounce_flag','lf1','lf3'];
const RI = Object.fromEntries(RECF.map((k,i)=>[k,i]));
const C = ch => 0x80 | ch.charCodeAt(0);           // charX equ 0x80|ASCII (bit 7 drives ~BL on RD7)
const BLANK = 0xA0;
const lowbit = v => { for (let i=0;i<8;i++) if (v&(1<<i)) return i; return 0; };
const clone = o => JSON.parse(JSON.stringify(o));

function initFW(V, dyn){
  const F = { input:0, bounce_reg:0, bounce_count:0, input_flag:0x80, bounce_flag:0, mute_flag:0, dis:[0,0,0,0],
    mode:0, sourced:0, sources:0, sourcea:0, cs8415_16:1, reg1:0, reg2:0x40, reg4:0x41, reg6:V.reg6||0x80, reg17:V.reg17||0x1F,
    txflags:0, polecount0:0, polecount1:10, polecount2:50, tx0:0, tx1:0, uart0:0, comout:0, comout2:0, comout3:250,
    lf:[0,0,7,7,7,0,0,7,0,7,0,7], lc:[0,K.LOCK_NUM1,0,K.LOCK_NUM2], disctl:0x08, sdi_dis:0, aes_dis:0, analog_dis:0,
    lock:0, rem2:0, rem3:128, rem4:75, bcount:0, bcount1:0, bcount3:5, press_flag:0, count:V.tries||10, read:0,
    ee_data:0, sdiab:0, sourcesa:0, sourcesb:0, adres:0, ledN:[0,0,0,0], aesLed:0,
    pin:{ xpt:[1,1,1,1], xptaes:1, rc0:0, ra1:1, red:0, tally:V.tallyBug?1:0, bl:0, txen:0 } };
  if (dyn.ee[10]===0xAA && V.kind==='pic'){ F.ee_data = dyn.ee[0]&255; if (V.ab) F.sdiab = dyn.ee[1]&255; F.input_flag |= 0x04; if (V.vs!=='V202'&&V.vs!=='V201'&&V.vs!=='V200') F.input_flag |= 0x02; }
  F.txflags |= 1; F.sources=1; F.sourcea=1; F.sourced=1; F.mode=1; if (V.ab){ F.sourcesa=1; F.sourcesb=1; }
  return F;
}

/* sim(cfg): cfg = {F, dyn, boot, ev:[{b,t0,t1}], stop, rec, dur} → R (records + final state) */
function simulate(cfg){
  const V = VERS[D.ver], W = D.W, P = PINS[V.pins];
  const dyn = clone(cfg.dyn);
  const rec = cfg.rec!==false, dur = cfg.dur||DUR, stop = cfg.stop;
  const R = { boot:[], pt:[], pe:[], st:[], rv:[], sig:{}, uart:[], spi:[], notes:[], disp:[], ee:[], bootEnd:0, V, power:W.power };
  let F = cfg.F ? clone(cfg.F) : null;
  let t = 0, cy = 0, tp = 0;
  const T = ()=> tp + cy*TCY;
  const sig = (name, v, tt)=>{ if (!rec) return; const a = R.sig[name] || (R.sig[name]=[]); if (!a.length || a[a.length-1][1]!==v) a.push([tt===undefined?T():tt, v]); };
  const note = (fn, txt)=>{ if (rec) R.notes.push({t:T(), fn, txt}); };
  const btn = (b, tt)=> (cfg.ev||[]).some(e=> e.b===b && tt>=e.t0 && tt<e.t1);
  const dz = (o,k)=>{ o[k]=(o[k]-1)&255; return o[k]===0; };
  const iz = (o,k)=>{ o[k]=(o[k]+1)&255; return o[k]===0; };
  if (!W.power){ R.off=true; R.final={F:null, dyn}; return R; }
  if (V.kind==='ams4e'){ R.e=true; R.final={F:null, dyn}; return R; }
  if (cfg.boot){ dyn.dm.ready = W.demux==='dmx4'?K.DMX4_READY : W.demux==='dmx1'?K.DMX1_READY : 0; dyn.dm.pend=[]; dyn.dm.b1=0; dyn.rxq=[]; dyn.txBusy=-1; dyn.rx={key:'',since:0}; dyn.phv=0; dyn.phT=0; }

  /* ---------- world: DEMUX and RS-485 ---------- */
  const dmPlate = ()=> W.demux==='dmx4' ? ((dyn.dm.cmd&16)?1:0) : 0;  // DEMUX-4 AMS4 build: bit4 → RX1 (plate “SDI 2 (B)”), else RX2 (plate “SDI 1 (A)”)
  const vidOK = tt=> W.demux!=='none' && tt>=dyn.dm.ready && W.sdi[dmPlate()].on && tt-dyn.dm.inT>=K.DMX_SETTLE;
  const grpOK = tt=> vidOK(tt) && ((W.sdi[dmPlate()].groups>>((dyn.dm.cmd>>1)&3))&1) && tt-dyn.dm.selT>=K.DMX_SETTLE;
  function dmxRx(b, tEnd){
    if (W.demux==='none') return; const dm=dyn.dm;
    if (!dm.b1){ if (b&0x80) dm.b1=b; return; }
    if (b&0x80){ dm.b1=b; return; }
    const cmd=dm.b1; dm.b1=0; let reply=null;
    if (cmd===0xE8) reply = W.demux==='dmx4'?0xE0:0xC0;
    else if ((cmd&0xE0)===0xE0){
      if ((cmd&16)!==(dm.cmd&16)) dm.inT=tEnd;
      if ((cmd&7)!==(dm.cmd&7)) dm.selT=tEnd;
      dm.cmd=cmd;
      const v=vidOK(tEnd);
      if (W.demux==='dmx4'){ reply = v?0x00:0x02; if (v && !grpOK(tEnd)) reply |= 0x3C; }
      else { reply = v?0x00:0x02; if (!grpOK(tEnd)) reply |= 0x3D; }     // DEMUX-1 reply bits — inferred
    }
    if (reply!==null) dm.pend.push({t0:tEnd+(W.demux==='dmx4'?K.DMX4_REPLY:K.DMX1_REPLY), b:reply});
  }
  function uartPoll(tt){
    const pend=dyn.dm.pend; pend.sort((a,b)=>a.t0-b.t0);
    while (pend.length && pend[0].t0<=tt){ const p=pend.shift(); dyn.rxq.push({avail:p.t0+BYTE_T, b:p.b}); if (rec) R.uart.push({t0:p.t0, t1:p.t0+BYTE_T, dir:'rx', b:p.b}); }
  }
  const rxAvail = tt=>{ uartPoll(tt); return dyn.rxq.length && dyn.rxq[0].avail<=tt; };
  function uartTx(tt, b, lbl){ const t0=Math.max(tt, dyn.txBusy); dyn.txBusy=t0+BYTE_T; if (rec) R.uart.push({t0, t1:t0+BYTE_T, dir:'tx', b, lbl}); dmxRx(b, t0+BYTE_T); }
  const tsrEmpty = tt=> tt>=dyn.txBusy;

  /* ---------- world: CS8415 input ---------- */
  function rxKey(tt){
    const sel=F.reg2&7, p=F.pin;
    if (sel>=1 && sel<=4){ const i={3:0,4:1,1:2,2:3}[sel], a=W.aes[i];
      if (!p.rc0 && a.c75) return 'aes'+i+':75'; if (!p.ra1 && a.c110) return 'aes'+i+':110'; return ''; }
    const dmxWire = (sel===5||sel===6) || (sel===0 && V.pins==='iss4');      // issue 5: DEMUX AES on P1 → U13 pins 25/26
    if (dmxWire && grpOK(tt)){ const pair = sel===6?1 : sel===5?0 : (dyn.dm.cmd&1); return 'sdi'+dmPlate()+':g'+((dyn.dm.cmd>>1)&3)+':p'+pair; }
    return '';
  }
  function rxLocked(tt){ const k=rxKey(tt); if (k!==dyn.rx.key){ dyn.rx={key:k, since:tt}; } const L = !!k && tt-dyn.rx.since>=K.RX_LOCK; sig('rxsrc', L?k:'', tt); return L; }

  /* ---------- phase detector (LM393 → 74HC00 XOR → 20k/1µF → RA0) ---------- */
  function phaseTarget(tt){ const r = routeNow(); if (!r.length) return 0; const s=r[0]; const ph = s.ph;
    if (r.length>1) return 2.5; return ph==='in'?0 : ph==='inv'?5 : 2.5; }
  function routeNow(){ const p=F.pin, out=[];
    p.xpt.forEach((x,i)=>{ if (!x && W.ana[i].on) out.push({kind:'A', i, ph:W.ana[i].ph}); });
    if (!p.xptaes && dyn.rx.key && T()-dyn.rx.since>=K.RX_LOCK){ const k=dyn.rx.key; if (k.startsWith('aes')){ const i=+k[3]; out.push({kind:'D', i, ph:W.aes[i].ph}); } else out.push({kind:'S', ph:'in'}); }
    return out; }

  /* ---------- pins ---------- */
  const setXpt = (k,v)=>{ if (F.pin.xpt[k]!==v){ F.pin.xpt[k]=v; sig('xpt'+(k+1), v?0:1); } };
  const setAesX = v=>{ if (F.pin.xptaes!==v){ F.pin.xptaes=v; sig('xptaes', v?0:1); } };
  const setTerm = ()=>{ F.pin.rc0 = (F.ee_data&0x80)?1:0; F.pin.ra1 = (F.ee_data&0x80)?0:1; sig('en75', F.pin.rc0?0:1); sig('en110', F.pin.ra1?0:1); };
  function dispRec(){ const d=F.dis, vis = (d[3]&0x80)!==0; const txt = vis ? [d[3],d[2],d[1],d[0]].map(c=> (c&0x80)? String.fromCharCode(c&0x7F) : ' ').join('') : '    ';
    if (rec && (!R.disp.length || R.disp[R.disp.length-1][1]!==txt)) R.disp.push([T(), txt]); }
  function spi(kind, bytes){ if (rec) R.spi.push({t0:T(), kind, bytes}); }

  /* ---------- PIC routines (names as in the .asm) ---------- */
  function shiftWrite(reg, val, name){ spi(name, [0x20, reg, val]); cy+=152; if (reg===2) rxLocked(T()); }
  function read8415(){ const L = rxLocked(T()); F.cs8415_16 = L?0:1; spi('read8415', [0x20,0x10,0x21, L?0x00:0x10]); cy+=189; sig('unlock', F.cs8415_16); }
  function debounce(){
    cy+=4;
    if (F.bounce_flag&1){ if (F.input!==0){ F.bounce_count=K.BOUNCE; cy+=4; return; }
      cy+=2; if (dz(F,'bounce_count')){ F.bounce_flag=0; F.press_flag|=4; F.bounce_count=K.BOUNCE; cy+=6; note('debounce','release: bounce_flag,0 ← 0, press_flag,2 ← 1 (eewrite may now count)'); } return; }
    if (F.input===0){ F.bounce_count=K.BOUNCE; cy+=4; return; }
    if (F.bounce_reg!==F.input){ F.bounce_reg=F.input; F.bounce_count=K.BOUNCE; cy+=6; return; }
    cy+=4; if (dz(F,'bounce_count')){ F.bounce_flag|=1; F.input_flag|=1; F.txflags|=1; F.press_flag&=~4; F.bounce_count=K.BOUNCE; cy+=8;
      if (V.kind==='ams4n') F.disctl|=3;
      note('debounce', `press accepted after ${K.BOUNCE} equal passes: input = b'${bn(F.input,3)}' → bounce_flag,0, input_flag,0, txflags,0 ← 1; press_flag,2 ← 0`); }
  }
  function autoDetect(){
    if (V.kind!=='ams4n' && !(F.mode&2)){ cy+=4; return; }
    cy+=6;
    if (F.disctl&1){ if (dz(F,'bcount')){ F.ee_data^=0x80; F.bcount=F.bcount1=K.BCOUNT; F.lock|=1; setTerm(); cy+=16;
        note('auto_detect', `no lock for 15 passes → xorwf ee_data,b'10000000' → ${(F.ee_data&0x80)?'110 Ω: PORTA,1 ← 0 (U14–U17 ~RE on), PORTC,0 ← 1 (75 Ω off)':'75 Ω: PORTC,0 ← 0 (U19/U22–U24 ~RE on), PORTA,1 ← 1 (110 Ω off)'}`); rxLocked(T()); }
      return; }
    if (F.lock&1){ cy+=2; if (dz(F,'bcount1')){ F.bcount1=F.bcount=K.BCOUNT; F.lock&=~1; cy+=4; note('auto_detect','15 locked passes → lock,0 ← 0 (termination kept)'); } }
    else { F.bcount=F.bcount1=K.BCOUNT; cy+=4; }
  }
  function swMode(){
    if (V.analogOnly){ F.mode=1; note('display_setup','c203: “bsf mode,0 ; always in analog mode” — MODE does nothing'); return; }
    if (!(F.comout&1)){ F.mode^=3; note('display_setup', `sw_mode → no_sdi (no DEMUX answered the start-up check): xorwf mode,b'011' → ${F.mode&1?'ANALOG':'AES'}`); return; }
    if (F.mode&4){
      if (V.ab && !(F.sdiab&1)){ F.sdiab|=1; F.sourcesa=F.sources; F.sources=F.sourcesb; note('display_setup', `sw_mode → check_sdi_ab → change_to_sdi_b (Ali-Add): sdiab,0 ← 1, sourcesa ← sources, sources ← sourcesb = b'${bn(F.sources)}'`); return; }
      if (V.ab){ F.sdiab=0; F.sourcesb=F.sources; F.sources=F.sourcesa; }
      F.mode=1; note('display_setup', `sw_mode → ${V.ab?'check_sdi_ab → ':''}back_to_analog: ${V.ab?'sdiab ← 0, sourcesb ← sources, sources ← sourcesa; ':''}mode ← b'001' (ANALOG)`); return; }
    F.mode=(F.mode<<1)&255; note('display_setup', `sw_mode: bcf status,c · rlf mode,f → mode = b'${bn(F.mode,3)}' (${F.mode&2?'AES':'SDI'})`);
  }
  function swSource(){
    const rot=(k,top)=>{ F[k] = (F[k]&top) ? 1 : (F[k]<<1)&255; return F[k]; };
    if (F.mode&1){ rot('sourcea',8); note('display_setup', `sw_source → analog: ${F.sourcea===1?'reset_analog (wrap)':'rlf sourcea'} → sourcea = b'${bn(F.sourcea,4)}'`); }
    else if (F.mode&2){ rot('sourced',8); note('display_setup', `sw_source → digital: ${F.sourced===1?'reset_digital (wrap)':'rlf sourced'} → sourced = b'${bn(F.sourced,4)}'`); }
    else if (F.mode&4){ rot('sources',0x80); note('display_setup', `sw_source → sdi: ${F.sources===1?'reset_sdi (wrap)':'rlf sources'} → sources = b'${bn(F.sources)}'`); }
  }
  function displaySetup(){
    cy+=3; if (!(F.input_flag&1)) return;
    F.input_flag&=~1; F.input_flag|=0x42; F.lf[2]=F.lf[3]=F.lf[4]=K.LOCK_NUM; F.lf[0]=F.lf[1]=F.lf[5]=0; F.aes_dis&=~1; F.sdi_dis&=~1; F.disctl&=~3; cy+=24;
    if (F.input&2) swMode(); else if (F.input&4) swSource(); cy+=12;
  }
  function unlockSource(){ cy+=3; if (!(F.input_flag&0x40)) return; F.disctl|=0x0C; F.input_flag|=0x80; F.input_flag&=~0x40; cy+=5; note('unlock_source','disctl,2|3 ← 1, input_flag,7 ← 1: the new source starts “unlocked” (XPTAES stays off until lock_count agrees)'); }
  const digitalMute = ()=> setAesX(1), digitalNorm = ()=> setAesX(0);
  function flashToggle(a, b, flag){ if (!dz(F.lf,a)) return null; if (!dz(F.lf,b)) return null; F.lf[b]=K.LOCK_NUM; F.lf[a]=0; F[flag]^=1; cy+=8; return (F[flag]&1)===1; }
  const setDis = (d3,d2,d1,d0)=>{ F.dis=[d0,d1,d2,d3]; cy+=8; };
  const num = v => C(String(lowbit(v)+1));
  function eePort(v, modeBits){ F.ee_data = (F.ee_data&0x80) | modeBits | (1<<(lowbit(v)&3)) | (lowbit(v)>=4?0x10:0); cy+=14; }
  function analogLock(){
    if (V.vs==='C203') setDis(C('A'), C('1'), BLANK, F.sourcea&1?BLANK:num(F.sourcea));
    else setDis(BLANK, C('A'), num(F.sourcea), BLANK);
    eePort(F.sourcea, 0x00);
  }
  function analogMode(){
    cy+=3; if (!(F.mode&1)) return;
    if (F.mute_flag&1){ const r=flashToggle(10,11,'analog_dis'); cy+=6; if (r===false) analogLock(); else if (r===true) setDis(C('M'),C('U'),C('T'),C('E')); return; }
    analogLock();
  }
  function displayAes(){ setDis(BLANK, C('D'), num(F.sourced), BLANK); eePort(F.sourced, 0x20); }
  function aesLock(){ if (F.mute_flag&1){ digitalMute(); displayAes(); return; } if (!(F.disctl&8)) digitalNorm(); displayAes(); }
  function aesMode(){
    cy+=3; if (!(F.mode&2)) return;
    if (F.mute_flag&1){ const r=flashToggle(6,7,'aes_dis'); cy+=6; if (r===false) aesLock(); else if (r===true) setDis(C('M'),C('U'),C('T'),C('E')); return; }
    if (!(F.disctl&1)){ aesLock(); return; }
    if (F.disctl&8) digitalMute();
    const r=flashToggle(1,3,'aes_dis'); cy+=6; if (r===false) aesLock(); else if (r===true) setDis(BLANK, C('N'), C('L'), BLANK);
  }
  const sdiLetter = ()=> V.ab ? C((F.sdiab&1)?'B':'A') : C('D');
  function displaySdi(){ setDis(C('S'), sdiLetter(), num(F.sources), BLANK); eePort(F.sources, 0x40); }
  function sdiLock(){ if (F.mute_flag&1){ digitalMute(); displaySdi(); return; } if (!(F.disctl&8)) digitalNorm(); displaySdi(); }
  function sdiMode(){
    cy+=3; if (!(F.mode&4)) return;
    if (F.mute_flag&1){ const r=flashToggle(8,9,'sdi_dis'); cy+=6; if (r===false) sdiLock(); else if (r===true) setDis(C('M'),C('U'),C('T'),C('E')); return; }
    if (F.disctl&2){ if (F.disctl&8) digitalMute(); const r=flashToggle(0,2,'sdi_dis'); cy+=6; if (r===false) sdiLock(); else if (r===true) setDis(BLANK, C('N'), C('L'), BLANK); return; }
    if (F.disctl&1){ if (F.disctl&8) digitalMute(); const r=flashToggle(5,4,'sdi_dis'); cy+=6; if (r===false) sdiLock(); else if (r===true) setDis(C('S'), sdiLetter(), BLANK, BLANK); return; }
    sdiLock();
  }
  function refresh(){ cy+=32; dispRec(); }
  function outputControl(){
    cy+=3; if (!(F.input_flag&2)) return; F.input_flag&=~2; F.input_flag|=8; cy+=4;
    const m = F.mute_flag&1;
    if (!(F.mode&1)){ for (let k=0;k<4;k++) setXpt(k,1); setAesX(1); cy+=10; note('output_control', `aes: XPT1–4 ← 1 (analog off), XPTAES ← 1 (D/A path held off until lock_count/aes_lock opens it)`); return; }
    const n = lowbit(F.sourcea);
    for (let k=0;k<4;k++) if (k!==n) setXpt(k, (V.mixA1 && k===0) ? m : 1);
    setXpt(n, m); setAesX(1); cy+=14;
    note('output_control', `in${n+1}: XPT${n+1} ← ${m?'1 (muted)':'0 → analog input '+(n+1)+' on LEFT±/RIGHT±'}${V.mixA1&&n>0?` · ${V.vs}: XPT1 ← ${m?1:0} as well (A1 always mixed in)`:''}, XPTAES ← 1`);
  }
  function phase(){ cy+=6; const tt=T(), dt=tt-dyn.phT; dyn.phv += (phaseTarget(tt)-dyn.phv)*(1-Math.exp(-Math.max(0,dt)/K.PH_TAU)); dyn.phT=tt;
    F.adres = Math.max(0,Math.min(255,Math.round(dyn.phv/5*255))); const red = F.adres>=K.PH_TH?1:0; cy+=10; if (F.pin.red!==red){ F.pin.red=red; sig('red',red); } }
  function digitalOutput(){
    cy+=3; if (!(F.input_flag&8)) return; F.input_flag&=~8; cy+=2; if (F.mode&1) return;
    if (F.mode&4){ F.reg4=0x41; F.pin.rc0=1; F.pin.ra1=1; sig('en75',0); sig('en110',0);
      if (V.sdiRx==='s56'){ F.reg2 = (lowbit(F.sources)&1) ? 0x46 : 0x45; note('digital_output', `sdi_output: PORTC,0 ← 1 and PORTA,1 ← 1 (both AES receiver banks off), cs8415reg2 ← ${(lowbit(F.sources)&1)?'cs8415reg2s6 (even source → DEMUX pair 2, RXP6)':'cs8415reg2s5 (odd source → DEMUX pair 1, RXP5)'}`); }
      else { F.reg2 = 0x40; note('digital_output', `sdi_output: both AES banks off, cs8415reg2 ← cs8415reg2def “digital 0” (RXP0 — the issue-4 DEMUX wiring)`); }
      cy+=22; return; }
    const map=[0x43,0x44,0x41,0x42], i=lowbit(F.sourced); F.reg2=map[i]; F.reg4=0x41; cy+=14;
    note('digital_output', `source${i+1}: cs8415reg2 ← cs8415reg2s${[3,4,1,2][i]} (0x${hx(F.reg2)}: digital ${i+1} is wired to receiver input ${[3,4,1,2][i]}), cs8415reg4 ← cs8415reg4def`);
  }
  function muteCheck(){
    cy+=4;
    if (W.mute){ if (!(F.mute_flag&1)) note('mute_check', `${P.mute} low (EXT MUTE closed to ground) → mute_flag,0 ← 1, ${P.tally} ← 1 (EXT_MUTE_TALLY via Q1), input_flag,1|4 → outputs updated, lock_count frozen, buttons ignored`);
      F.mute_flag|=1; F.pin.tally=1; sig('tally',1); F.input_flag|=0x12; cy+=6; return; }
    if (!(F.mute_flag&1)) return;
    F.input_flag|=2; F.input_flag&=~0x10; F.mute_flag&=~1; F.pin.tally=0; sig('tally',0); cy+=8; note('mute_check', `mute_before?: ${P.mute} high again → un-mute, ${P.tally} ← 0, input_flag,1 (update outputs)`);
  }
  function processData(fromReply){
    cy+=4;
    if (F.mode&4 && V.kind==='pic'){
      if (V.lockSrc==='gennum'){ F.disctl = (F.disctl&~3) | ((F.uart0>>1)&1)<<1 | ((F.cs8415_16|F.uart0)&1); }
      else { if (!(F.read&1)){ cy+=2; return; } F.read&=~1;
        F.disctl = (F.disctl&~3) | (F.uart0&2) | (F.cs8415_16&1);
        const b = (F.disctl&0x80) ? [2,3] : [4,5];
        const anyLock = !((F.uart0>>b[0])&1) || !((F.uart0>>b[1])&1);
        F.bcount3=5;
        if (anyLock){ F.disctl&=~1; F.lock&=~1; } else { if (F.lock&1) F.disctl|=1; F.lock|=1; }
        if (rec && fromReply) note('processdata', `check_sdi_lock: uart0 = b'${bn(F.uart0)}' → video ${F.uart0&2?'UNLOCKED':'locked'}; ${(F.disctl&0x80)?'disctl,7 (odd source): bits 2/3':'disctl,6 (even source): bits 4/5'} ${anyLock?'→ sig_lock1: audio present (CS8415 UNLOCK bit discarded)':'→ no_lock1: '+(F.disctl&1?'second miss → disctl,0 ← 1':'first miss, lock,0 ← 1 (needs one more reply)')}`); }
      cy+=18; F.disctl = (F.disctl&~4) | ((F.disctl&3)?4:0); return; }
    if (F.mode&2 || V.kind==='ams4n'){ F.disctl = (F.disctl&~3) | (F.cs8415_16&1); F.disctl = (F.disctl&~4) | ((F.disctl&3)?4:0); cy+=14; }
  }
  function lockCount(){
    cy+=3; if (F.input_flag&0x10) return;
    if (F.input_flag&0x80){
      if (F.disctl&4){ F.lc[1]=K.LOCK_NUM1; F.lc[0]=0; cy+=6; if (!dz(F.lc,2)) return; if (!dz(F.lc,3)) return;
        F.lc[3]=K.LOCK_NUM2; F.lc[2]=0; F.input_flag&=~0x20; F.disctl|=8; F.input_flag&=~0x80; cy+=8; if (V.kind==='ams4n'){ F.aesLed=0; sig('aesled',0); }
        note('lock_count','unlock: 4 × 256 passes unlocked → input_flag,5 ← 0, disctl,3 ← 1 (unlocked state, XPTAES held off)'); return; }
      F.lc[3]=K.LOCK_NUM2; F.lc[2]=0; cy+=6; if (!dz(F.lc,0)) return; if (!dz(F.lc,1)) return;
      F.lc[1]=K.LOCK_NUM1; F.lc[0]=0; F.input_flag|=0x20; F.disctl&=~8; F.input_flag&=~0x80; cy+=8; if (V.kind==='ams4n'){ F.aesLed=1; sig('aesled',1); }
      note('lock_count','locked: 10 × 256 passes in lock → input_flag,5 ← 1, disctl,3 ← 0 → next pass aes_lock/sdi_lock calls digital_norm: XPTAES ← 0 (D/A on the bus)'); return; }
    cy+=4;
    if (F.input_flag&0x20){ if (!(F.disctl&4)) return; setAesX(1); F.input_flag|=0x80; cy+=4; if (V.kind==='ams4n'){ F.aesLed=1; sig('aesled',1); } note('lock_count','regular_mode: lock lost → bsf porta,xptaes at once, input_flag,7 ← 1'); return; }
    if (F.disctl&4) return; setAesX(0); F.input_flag|=0x80; cy+=4; if (V.kind==='ams4n'){ F.aesLed=0; sig('aesled',0); } note('lock_count','reg_unlocked: lock back → bcf porta,xptaes, input_flag,7 ← 1');
  }
  function eew(addr, val){ const tt=T(); if (tt<dyn.eeBusy){ cy += Math.ceil((dyn.eeBusy-tt)/TCY); } dyn.ee[addr]=val&255; dyn.eeBusy=T()+K.EE_WR; cy+=22; if (rec) R.ee.push({t:T(), addr, val:val&255}); }
  function eeWrite(){
    cy+=3; if (!(F.press_flag&4)) return; cy+=3;
    if (!iz(F,'rem2')) return; cy+=2; if (!iz(F,'rem4')) return;
    F.press_flag&=~4; F.rem3=250; cy+=24;
    const t0=T(); eew(0, F.ee_data); if (V.ab) eew(1, F.sdiab); eew(10, 0xAA); F.rem2=0; F.rem4=75;
    note('eewrite', `rem2 × rem4 wrapped (256 × 181 = 46 336 passes after the last release) → eew addr 0 ← ee_data 0x${hx(F.ee_data)}${V.ab?`, addr 1 ← sdiab 0x${hx(F.sdiab)}`:''}, addr 10 ← 0xAA; each eew waits for the previous write (${((T()-t0)*1000).toFixed(1)} ms stall)`);
  }
  /* DEMUX link (main loop part) */
  function commControl(){ cy+=3; if (!(F.txflags&1)) return; cy+=2; if (!dz(F,'polecount2')) return; F.polecount2=50; F.txflags|=0x40; cy+=3; }
  function pole(){ cy+=4; if (F.txflags&8 || F.txflags&16) return; cy+=2; if (!dz(F,'polecount0')) return; if (!dz(F,'polecount1')) return; F.polecount1=2; F.txflags|=1; cy+=3; }
  function scanUart(){ cy+=3; if (!(F.txflags&16)) return; cy+=6; if (!rxAvail(T())) return;
    const b = dyn.rxq.shift().b; F.uart0=b; F.txflags&=~16; F.comout3=230; F.comout2=0; F.read|=1; cy+=8; note('scanuart', `RCREG → uart0 = 0x${hx(b)} (b'${bn(b)}'), txflags,4 ← 0, read,0 ← 1`); }
  function lossOfCom(){ cy+=3; if (!(F.txflags&16)) return; cy+=2; if (!iz(F,'comout2')) return; if (!iz(F,'comout3')) return; F.comout3=250; F.comout2=0; F.txflags|=0x80; cy+=4; note('loss_of_com','no reply for 26 × 256 passes → txflags,7 (re_transmit)'); }
  function txSetup(){ cy+=6; const i=lowbit(F.sources); F.tx0=(F.tx0&~7)|i; if (i&1){ F.disctl&=~0x80; F.disctl|=0x40; } else { F.disctl|=0x80; F.disctl&=~0x40; } cy+=8; }
  function setTxData(){
    cy+=3;
    if (!(F.txflags&0x80)){ if (F.txflags&8) return; if (F.txflags&16) return; if (!(F.txflags&0x40)) return; }
    F.polecount1=2; F.tx1=0x55; F.tx0|=0xE0; F.tx0&=~0x10;
    if (V.ab ? (F.sdiab&1) : (F.mode&4)) F.tx0|=0x10;
    F.tx1&=0x7F; F.txflags=0x0E; cy+=16;
  }
  function txUart(){
    cy+=3; if (!(F.txflags&8)) return; cy+=3; if (!tsrEmpty(T())) return;
    if (F.txflags&2){ F.pin.txen=1; sig('txen',1); uartTx(T(), F.tx0, 'tx0'); F.txflags&=~2; cy+=5;
      note('txuart', `PORTC,1 ← 1 (U36 DE) · TXREG ← tx0 = 0x${hx(F.tx0)}: group ${((F.tx0>>1)&3)+1}, pair ${(F.tx0&1)+1}, bit4 = ${(F.tx0>>4)&1}${V.ab?' (sdiab)':' (mode,2)'}`); return; }
    if (F.txflags&4){ uartTx(T(), F.tx1, 'tx1'); F.txflags&=~4; cy+=5; return; }
    F.txflags&=~8; F.pin.txen=0; sig('txen',0); F.txflags|=16; cy+=5;
  }

  /* ---------- AMS4N (four buttons, no display) ---------- */
  function displaySetupN(){
    cy+=3; if (!(F.input_flag&1)) return; F.input_flag&=~1; F.input_flag|=0x42;
    const n = F.input&2?0 : F.input&4?1 : F.input&8?2 : F.input&16?3 : -1; if (n<0) return;
    F.ledN=[0,0,0,0]; F.ledN[n]=1; sig('ledN', n+1); F.sourcea=1<<n; F.reg2=[0x43,0x44,0x41,0x42][n]; F.reg4=0x41; cy+=18;
    note('display_setup', `pb${n+1}_led: ${['RE2','RE0','RE1','RD0'][n]} ← 1 (button LED), sourcea ← analog ${n+1}, cs8415reg2 ← cs8415reg2s${[3,4,1,2][n]} (digital ${n+1})`);
  }
  function outputControlN(){
    cy+=6; const n=lowbit(F.sourcea);
    for (let k=0;k<4;k++) if (k!==n) setXpt(k,1);
    if (F.mute_flag&1){ setXpt(n,1); setAesX(1); cy+=4; return; }
    if (F.disctl&1){ setXpt(n,0); setAesX(1); } else { setXpt(n,1); setAesX(0); }
    cy+=10;
  }

  /* ---------- one pass ---------- */
  function passPIC(){
    cy=0; const st=new Array(NST).fill(-1); const S=i=>{ st[i]=cy; };
    uartPoll(tp);
    S(0); cy+=1; if (V.analogOnly){ F.mode=1; cy+=1; }
    S(1); cy+=4;
    if (V.kind==='ams4n'){ F.input=0; ['PB1','PB2','PB3','PB4'].forEach((b,i)=>{ if (btn(b,T())) F.input|=2<<i; }); cy+=8; }
    else if (!(F.mute_flag&1)){ F.input=0; if (btn('MODE',T()) && !V.modeOff) F.input|=2; if (btn('SRC',T())) F.input|=4; cy+=6; }
    S(2); debounce();
    S(3); read8415();
    S(4); autoDetect();
    if (V.kind==='ams4n'){
      S(5); displaySetupN(); S(11); outputControlN(); cy+=1; S(12); phase(); S(14); muteCheck(); S(15); processData(); S(16); lockCount();
      S(17); shiftWrite(2, F.reg2, 'reg2'); S(18); shiftWrite(4, F.reg4, 'reg4'); cy+=2;
      return st;
    }
    S(5); displaySetup();
    S(6); unlockSource();
    S(7); analogMode(); S(8); aesMode(); S(9); sdiMode();
    S(10); refresh();
    S(11); outputControl(); cy+=1;
    S(12); phase();
    S(13); digitalOutput();
    S(14); muteCheck();
    S(15); processData();
    S(16); lockCount();
    S(17); shiftWrite(2, F.reg2, 'reg2');
    S(18); shiftWrite(4, F.reg4, 'reg4');
    S(19); eeWrite();
    S(20); cy+=2;
    if (!(F.comout&1)){ cy+=2; return st; }
    cy+=2;
    S(21); commControl(); S(22); pole(); S(23); scanUart(); S(24); lossOfCom(); S(25); txSetup(); S(26); processData(true); S(27); setTxData(); S(28); txUart(); cy+=4;
    return st;
  }

  /* ---------- power-up: INIT → program → SDI check → opening_window → main ---------- */
  function seg(name, t0, t1, d){ if (rec) R.boot.push({name, t0, t1, d}); }
  function translate(){
    if (!(F.input_flag&4)) return; F.input_flag&=~4; F.input_flag|=2; F.mode=0; F.sources=F.sourcea=F.sourced=0; if (V.ab){ F.sourcesa=F.sourcesb=0; }
    const e=F.ee_data, port=e&15;
    if (e&0x20){ F.mode=2; F.sourced=port||1; F.sources=1; F.sourcea=1; if (V.ab){ F.sourcesa=F.sourcesb=1; } note('translate', `ee_data 0x${hx(e)} → set_digital: mode ← AES, sourced ← b'${bn(F.sourced,4)}'`); return; }
    if ((e&0x40) && (F.comout&1)){ F.sourced=1; F.sourcea=1; F.mode=4; const s = (e&0x10)? (port<<4) : port; F.sources=s||1;
      if (V.ab){ if (F.sdiab&1){ F.sourcesb=F.sources; F.sourcesa=1; } else { F.sourcesa=F.sources; F.sourcesb=1; } }
      note('translate', `ee_data 0x${hx(e)} → set_sdi (DEMUX found): sources ← b'${bn(F.sources)}'${V.ab?`, sdiab = ${F.sdiab&1} → ${(F.sdiab&1)?'sdibselected':'sdiaselected'}`:''}`); return; }
    F.mode=1; F.sourcea=port||1; F.sourced=1; F.sources=1; if (V.ab){ F.sourcesa=F.sourcesb=1; }
    note('translate', `ee_data 0x${hx(e)} → set_analog${(e&0x40)?' (SDI was saved but no DEMUX answered)':''}: sourcea ← b'${bn(F.sourcea,4)}'`);
  }
  function doBoot(){
    tp=0; cy=0;
    seg('Power-up timer (PWRT) — config bits not in source', 0, K.PWRT, '72 ms PWRT + 1024 Tosc OST assumed (inferred)');
    tp=K.PWRT; F = initFW(V, dyn);
    sig('xpt1',0,0); sig('xpt2',0,0); sig('xpt3',0,0); sig('xpt4',0,0); sig('xptaes',0,0); sig('en75',1,0); sig('en110',0,0); sig('red',0,0); sig('tally',F.pin.tally,0); sig('txen',0,0); sig('unlock',1,0); sig('rxsrc','',0);
    if (V.tallyBug) note('INIT', 'v2.02: PORTA ← b\'11110111\' leaves RA5 (EXT MUTE TALLY) HIGH; the “turn off mute talley” line still clears PORTB,6, the issue-4 pin → tally is on from power-up');
    const tInit = 260*TCY; seg('INIT: ports, TRIS, ADC, UART 9600, RAM, eecheck', K.PWRT, K.PWRT+tInit, `eecheck: EEPROM[10] = 0x${hx(dyn.ee[10])} ${dyn.ee[10]===0xAA?'= 0xAA → ee_data ← EEPROM[0] = 0x'+hx(dyn.ee[0])+(V.ab?', sdiab ← EEPROM[1]':''):'≠ 0xAA → defaults (A1)'}`);
    tp += tInit; dispRec();
    if (V.kind==='ams4n'){ seg('program: clrwdt · reg1 reg2 reg4 reg6 reg17', tp, tp+5*152*TCY); spi('reg1',[0x20,1,0]); tp += 5*152*TCY; R.bootEnd=tp; return; }
    seg('program: pdelay1 (256 × 3 cycles)', tp, tp+768*TCY); tp += 768*TCY;
    // program1: SDI check (send 0xE8 0x55, wait for 11xxxxxx)
    const tS=tp, IT=K.PROBE_IT*TCY; let tries=0;
    while (!(F.comout&2)){
      tries++;
      F.pin.txen=1; sig('txen',1,tp); uartTx(tp, 0xE8, 'probe'); uartTx(tp, 0x55, 'probe'); tp = dyn.txBusy + IT; F.pin.txen=0; sig('txen',0,tp);
      F.comout |= 0x14;
      F.count=(F.count-1)&255; if (F.count===0){ F.comout|=2; break; }
      let tTO = tp + ((256-F.comout3)*256 - F.comout2)*IT, got=false;
      while (true){ uartPoll(tTO); const q=dyn.rxq[0];
        if (q && q.avail<=tTO){ dyn.rxq.shift(); tp=Math.max(tp,q.avail)+IT; if ((q.b&0xC0)===0xC0){ F.comout|=3; got=true; break; } F.comout3=250; F.comout2=0; tTO = tp + (6*256)*IT; continue; }
        break; }
      if (got) break;
      tp=tTO; F.comout3=230; F.comout2=0; F.comout&=~0x14;
    }
    seg(`program1: SDI check — ${F.comout&1?'DEMUX answered':'no answer'} after ${tries} probe${tries>1?'s':''}`, tS, tp, F.comout&1?'scanu: reply & 0xC0 = 0xC0 → comout,0 (DEMUX present), comout,1 (check complete)':'count 10 → 0: comout,1 set, comout,0 clear → the unit runs without SDI');
    note('program1', F.comout&1 ? `DEMUX answered the 0xE8/0x55 probe → comout,0 ← 1 (SDI available, MODE cycles ${V.ab?'A → D → SA → SB':'A → D → SD'})` : `${tries} probes (0xE8, 0x55) without a reply: ≈${((tp-tS)*1000).toFixed(0)} ms with a blank display → MODE toggles A ↔ D only`);
    // opening window
    if (V.vs){ const s=V.vs; F.dis=[C(s[3]),C(s[2]),C(s[1]),C(s[0])]; }
    const tW = 25600*K.WIN_IT*TCY; dispRec(); seg(`opening_window: display_version “${V.vs}” (256 × 100 loops)`, tp, tp+tW, `window_counter × window_counter1 = 25 600 passes of refresh ≈ ${(tW).toFixed(2)} s`); tp += tW;
    cy=0; note('program', 'bsf PORTB,5 “take 8415 out of reset” (it was already high since INIT wrote PORTB = 0xFF)');
    translate();   // note: INIT left the 75 Ω bank on whatever ee_data,7 says
    seg('translate · display_setup · reg1, reg2, reg4, reg6, reg17', tp, tp+(5*152+60)*TCY, `cs8415reg6 ← 0x${hx(V.reg6)}, cs8415reg17 ← 0x${hx(V.reg17)}`);
    spi('reg6',[0x20,6,V.reg6]); tp += (5*152+60)*TCY; R.bootEnd=tp;
  }

  /* ---------- run ---------- */
  if (cfg.boot) doBoot(); else { F.pin=F.pin||{}; tp=0; for (const k of ['xpt1','xpt2','xpt3','xpt4']) sig(k, F.pin.xpt[+k[3]-1]?0:1, 0); sig('xptaes',F.pin.xptaes?0:1,0); sig('en75',F.pin.rc0?0:1,0); sig('en110',F.pin.ra1?0:1,0); sig('red',F.pin.red,0); sig('tally',F.pin.tally,0); sig('txen',F.pin.txen,0); sig('unlock',F.cs8415_16,0); sig('rxsrc',(dyn.rx.key&&-dyn.rx.since>=K.RX_LOCK)?dyn.rx.key:'',0); if (V.kind==='ams4n'){ sig('ledN', F.ledN.indexOf(1)+1, 0); sig('aesled', F.aesLed, 0); } cy=0; dispRec(); }
  let np=0;
  while (tp < dur){
    if (stop!==undefined && tp>=stop && tp>=R.bootEnd) break;
    const t0=tp; const st = passPIC(); const t1 = tp + cy*TCY;
    if (rec){ R.pt.push(t0); R.pe.push(t1); R.st.push(st); const rv=new Array(RECF.length);
      const src={...F, reg2:F.reg2, lc0:F.lc[0], lc1:F.lc[1], lc2:F.lc[2], lc3:F.lc[3], lf1:F.lf[1], lf3:F.lf[3]}; RECF.forEach((k,i)=>rv[i]=src[k]); R.rv.push(rv); }
    tp = t1; np++;
  }
  R.np=np; R.final = {F, dyn: shiftDyn(dyn, -tp), t:tp};
  return R;
}
function shiftDyn(dyn, dt){ const d=clone(dyn); d.rx.since+=dt; d.txBusy+=dt; d.dm.selT+=dt; d.dm.inT+=dt; d.dm.ready+=dt; d.dm.pend.forEach(p=>p.t0+=dt); d.rxq.forEach(q=>q.avail+=dt); d.eeBusy+=dt; d.phT+=dt; return d; }

/* ---------------- run management ---------------- */
function rerun(){ D.run = simulate(D.base); }
function powerUp(){ D.base = { F:null, dyn: D.base? keepEE(D.base.dyn) : defDyn(), boot:true, ev:[] }; rerun(); }
function keepEE(dyn){ const d=defDyn(); d.ee = clone(D.run && D.run.final ? D.run.final.dyn.ee : dyn.ee); return d; }
function stateAt(t){ const r = simulate({...D.base, stop:t, rec:false}); return r.final; }
function passAt(t){ const R=D.run; if (!R || !R.pt.length) return -1; let lo=0, hi=R.pt.length-1; if (t<R.pt[0]) return -1; while (lo<hi){ const m=(lo+hi+1)>>1; if (R.pt[m]<=t) lo=m; else hi=m-1; } return lo; }
function rv(t, k){ const p=passAt(t); if (p<0) return null; return D.run.rv[p][RI[k]]; }
function sigAt(name, t, dflt){ const a=D.run && D.run.sig[name]; if (!a||!a.length) return dflt; let v=dflt; for (const [tt,x] of a){ if (tt<=t) v=x; else break; } return v; }
function dispAt(t){ const a=D.run && D.run.disp; if (!a||!a.length) return '    '; let v='    '; for (const [tt,x] of a){ if (tt<=t) v=x; else break; } return v; }
function inBoot(t){ return D.run && D.run.bootEnd>0 && t<D.run.bootEnd; }

/* act(): take the firmware state at the playhead, apply the change, start a new 4-second window */
function act(name, apply, opts){
  opts=opts||{};
  const V=VERS[D.ver];
  if (V.kind==='ams4e'){ D.rev=(D.rev||0)+1; apply && apply({ev:[], boot:false}); D.log.unshift({t:SIM.t, name, trace:[...(D.eTrace||[])], disp:''}); if (D.log.length>60) D.log.length=60; D.lastTrace=D.log[0]; SIM.refresh(); return; }
  let s = (D.run && !D.run.off) ? stateAt(Math.max(SIM.t, D.run.bootEnd||0)) : null;
  const ev=[];
  const ctx = { ev, boot:false, s };
  apply(ctx); D.rev=(D.rev||0)+1;
  if (ctx.boot || !s || !s.F){ D.base = { F:null, dyn: keepEE(s?s.dyn:defDyn()), boot:true, ev:[] }; }
  else D.base = { F:s.F, dyn:s.dyn, boot:false, ev };
  rerun();
  const t0 = K.ACT_T, R=D.run;
  const trace = (ctx.pre||[]).concat(R.notes.filter(n=> n.t>=0 && n.t<=(opts.win||0.06) + (ctx.boot?3:0)).slice(0,14).map(n=>`<span class="mono">${SIM.fmtT(n.t)}</span> <b>${n.fn}</b>: ${n.txt}`)).concat(ctx.post||[]);
  D.log.unshift({t:SIM.t, name, trace, disp: dispAt(opts.seek!==undefined?opts.seek:0.05)});
  if (D.log.length>60) D.log.length=60; D.lastTrace=D.log[0];
  SIM.seek(opts.seek!==undefined ? opts.seek : (ctx.boot? 0 : 0.05));
  SIM.refresh();
}
const A = {
  press(b, label){ act(`Press ${label}`, c=>{ c.ev.push({b, t0:K.ACT_T, t1:K.ACT_T+K.HOLD});
    const P=PINS[VERS[D.ver].pins]; c.pre=[`${b==='MODE'?P.mode:b==='SRC'?P.src:'PB'}: pushbutton closes to ground for 30 ms (10k pull-up R120/R122; the PIC's own RB pull-ups are off — see Findings)`]; }); },
  mode(){ if (VERS[D.ver].kind==='ams4e') return A.enc(1,1); A.press('MODE','MODE'); },
  source(){ if (VERS[D.ver].kind==='ams4e') return A.enc(1,1); A.press('SRC','SOURCE'); },
  pb(n){ A.press('PB'+n, 'PB'+n); },
  mute(){ act(D.W.mute?'Open EXT MUTE':'Close EXT MUTE to ground', c=>{ D.W.mute=!D.W.mute; }); },
  headset(){ act(D.W.headset?'Unplug headset':'Plug in headset', c=>{ D.W.headset=!D.W.headset; c.pre=[D.W.headset?'T/R/S plug opens the jack normals: LEFT_NORM / RIGHT_NORM (H2-11/H2-15) no longer reach the amplifiers — speakers silent, headset fed (no firmware involved)':'Normals close again: speakers back']; }); },
  stereo(){ act(D.W.stereo?'STEREO switch in (LEFT/RIGHT)':'STEREO switch out', c=>{ D.W.stereo=!D.W.stereo; c.pre=[D.W.stereo?'PHA-2UEE latching switch out: STEREO — the left (dual-gang) knob sets both sides, as on the AMS4-3 board in the QSP-2 schematic':'Switch in: each knob sets its own side (LEFT / RIGHT)']; }); },
  pot(side, d){ const k=side?'potR':'potL'; D.W[k]=Math.max(0,Math.min(1,D.W[k]+d)); act(`${side?'RIGHT':'LEFT'} level ${d>0?'up':'down'} → ${Math.round(D.W[k]*100)}%`, c=>{ c.pre=['TOCOS 10-079 dual 10K log pot on the AMS4-3 board: analog level only, the PIC never sees it']; }); },
  power(){ act(D.W.power?'Power off':'Power on', c=>{ D.W.power=!D.W.power; c.boot=D.W.power; c.pre=[D.W.power?'Mains on → TE70061 9 V toroid, bridge D1–D4, ±VA and LM2596 5 V come up → PIC reset':'Mains off: every output dark']; }); },
  cycle(){ act('Power cycle', c=>{ D.W.power=true; c.boot=true; c.pre=['Mains off/on: PIC16F874 resets → INIT → SDI check → version window → main']; }); },
  ffwd(sec){ const s=stateAt(Math.max(SIM.t, D.run.bootEnd||0)); if (!s||!s.F) return;
    const r=simulate({F:s.F, dyn:s.dyn, boot:false, ev:[], rec:false, dur:sec}); D.base={F:r.final.F, dyn:r.final.dyn, boot:false, ev:[]}; rerun();
    D.log.unshift({t:SIM.t, name:`Idle ${sec} s (fast-forward)`, trace:[`${sec} s of passes run without recording. EEPROM now holds addr 0 = 0x${hx(D.base.dyn.ee[0])}, addr 1 = 0x${hx(D.base.dyn.ee[1])}, addr 10 = 0x${hx(D.base.dyn.ee[10])}.`], disp:dispAt(0)}); D.lastTrace=D.log[0]; SIM.seek(0); SIM.refresh(); },
  aes(i, which){ const a=D.W.aes[i]; act(`${which==='75'?'BNC':'110 Ω euroblock'} AES ${i+1}: ${a['c'+which]?'unplug':'plug in'}`, c=>{ a['c'+which]=!a['c'+which]; c.pre=[`AES ${i+1} ${which} Ω cable ${a['c'+which]?'connected':'removed'} (${which==='75'?'BNC → 75 R → DS75176 receiver with ~RE on PORTC,0':'euroblock → PE-65612 transformer → DS75176 receiver with ~RE on PORTA,1'})`]; }); },
  ana(i){ const a=D.W.ana[i]; act(`Analog input ${i+1}: ${a.on?'unplug':'plug in'}`, c=>{ a.on=!a.on; c.pre=['Analog inputs have no detection in the firmware: only the audio changes']; }); },
  sdi(k){ const s=D.W.sdi[k]; act(`${k?'SDI 2 (B)':'SDI 1 (A)'}: ${s.on?'unplug':'plug in'}`, c=>{ s.on=!s.on; }); },
  group(k,g){ const s=D.W.sdi[k]; act(`${k?'SDI 2 (B)':'SDI 1 (A)'} group ${g+1} audio ${(s.groups>>g)&1?'removed':'embedded'}`, c=>{ s.groups^=(1<<g); }); },
  demux(v){ act(`DEMUX option → ${v==='none'?'none (blank cover)':v==='dmx1'?'DEMUX-1':'DEMUX-4'}`, c=>{ D.W.demux=v; c.boot=true; c.pre=['Option boards are fitted with the power off: the unit restarts and the SDI check runs again']; }); },
  ver(v){ D.ver=v; D.rev=(D.rev||0)+1; D.log.unshift({t:0, name:'Firmware → '+VERS[v].n, trace:[VERS[v].label, 'Programmed into the chip, so the unit powers up from scratch.'], disp:''}); D.lastTrace=D.log[0]; powerUp(); SIM.seek(0); SIM.refresh(); },
  reset(){ D.rev=(D.rev||0)+1; D.W=defWorld(); D.base=null; D.run=null; powerUp(); D.log=[]; D.lastTrace=null; SIM.seek(0); SIM.refresh(); },
  enc(k,d){ const e=D.e; if (k===1){ e.audio = d>0 ? (e.audio===3?0:e.audio+1) : (e.audio===0?3:e.audio-1); D.eTrace=[`TRANSLATE_SHAFT_ENCODER1 → encoder_action1 = ${d>0?1:2} → audio_update(): audio_status ${d>0?'++':'--'} (Audio_Status_Max 3 wraps) → D${e.audio+1}`, 'update_display() → OPTREX_lcd_display(line1, line2); UART0_setup(audio, volume) → Dolby board']; }
    else { e.vol=Math.max(0,Math.min(100,e.vol+d*5)); D.eTrace=[`PROCESS_SHAFT_ENCODER2_LARGE/FINE → volume_update(): volume ${e.vol} (Volume_Min 0 … Volume_Max 100)`,'UART0_setup(audio, volume) sends the new level to the Dolby board']; }
    act(k===1?'AMS4E: turn AUDIO encoder':'AMS4E: turn VOLUME encoder', null); },
};

/* ---------------- audio model ---------------- */
const V_ = d => 0.7746*Math.pow(10,d/20), dBu = v => 20*Math.log10(Math.max(v,1e-9)/0.7746);
function routeAt(t){
  const W=D.W, out=[]; if (!D.run || D.run.off) return out;
  for (let k=1;k<=4;k++) if (sigAt('xpt'+k,t,0) && W.ana[k-1].on) out.push({kind:'A', i:k-1, lvl:W.ana[k-1].lvl-6, f:W.ana[k-1].f, ph:W.ana[k-1].ph, name:'A'+k});
  if (sigAt('xptaes',t,0)){ const k=sigAt('rxsrc',t,''); if (k && k.startsWith('aes')){ const i=+k[3]; const a=W.aes[i]; out.push({kind:'D', i, lvl:a.lvl+18, f:a.f, ph:a.ph, name:'D'+(i+1)+' ('+k.split(':')[1]+' Ω)'}); }
    else if (k && k.startsWith('sdi')){ const g=+k.split(':')[1][1], p=+k.split(':')[2][1]; out.push({kind:'S', lvl:-20+18, f:250*(g+1)*(p+1), ph:'in', name:`SDI ${+k[3]?'2 (B)':'1 (A)'} gr ${g+1} pair ${p+1}`}); } }
  return out;
}
function busV(t){ const r=routeAt(t); let l=0, rr=0; r.forEach(s=>{ const a=V_(s.lvl)*Math.SQRT2, w=2*Math.PI*s.f;
  l += a*Math.sin(w*t); rr += s.ph==='Lonly'?0 : s.ph==='inv'? -a*Math.sin(w*t) : s.ph==='uncorr'? a*Math.sin(w*1.5*t) : a*Math.sin(w*t); }); return [l, rr]; }
function busRms(t){ const r=routeAt(t); let l=0, rr=0; r.forEach(s=>{ const p=V_(s.lvl)**2; l+=p; if (s.ph!=='Lonly') rr+=p; }); return [Math.sqrt(l), Math.sqrt(rr)]; }
function meterAt(t){ // LM3916 input: rectified average with τ = 47 ms, re-evaluated from the last routing change
  const R=D.run; if (!R || R.off) return [-99,-99];
  let tc=0; for (const n of ['xpt1','xpt2','xpt3','xpt4','xptaes','rxsrc']) for (const [tt] of (R.sig[n]||[])) if (tt<=t && tt>tc) tc=tt;
  const [l, r] = busRms(t), [lp, rp] = busRms(Math.max(0,tc-1e-6));
  const k = Math.exp(-(t-tc)/K.VU_TAU), f = (a,b)=> a + (b-a)*k;
  const ref = V_(-2);
  return [20*Math.log10(Math.max(f(l,lp),1e-6)/ref), 20*Math.log10(Math.max(f(r,rp),1e-6)/ref)];
}
function chain(t){
  const W=D.W, r=routeAt(t), [l, rr]=busRms(t), st=[]; const lv=v=> v<1e-5?'—':dBu(v).toFixed(1)+' dBu';
  const sel = r.length? r.map(s=>s.name).join(' + ') : 'nothing (all crosspoints open)';
  st.push(['Source on the bus', sel, r.length? (r[0].kind==='A'? `rear analog euroblock ${r[0].lvl+6>24?'(over +24 dBu max!)':''} ${(r[0].lvl+6).toFixed(0)} dBu` : r[0].kind==='D' ? `${W.aes[r[0].i].lvl} dBFS → CS8415A → CS4335 → U11 → RV1/RV2 (0 VU = −20 dBFS)` : '−20 dBFS embedded (test tone, inferred)') : '']);
  st.push(['LEFT / RIGHT bus (U9/U10 NE5532, −6 dB)', `${lv(l)} / ${lv(rr)}`, '74HC4053 crosspoints into the balanced receivers (R17/R19 20k, R18 10k)']);
  const m=meterAt(t); st.push(['VU meter (LF353 rectifier → LM3916)', `${m[0]>-30?m[0].toFixed(1):'—'} / ${m[1]>-30?m[1].toFixed(1):'—'} VU`, '0 VU = +4 dBu analog / −20 dBFS digital (RV3/RV4 PEAK trims)']);
  st.push(['Rear OUTPUT (U27/U28, balanced 30 Ω)', `${lv(l*2)} / ${lv(rr*2)}`, '+6 dB back to the input level']);
  const stL=W.potL, stR=W.stereo? W.potL : W.potR, pot=p=> p<=0.001? 0 : Math.pow(10, (40*Math.log10(p))/20);
  const aL = l*pot(stL), aR = rr*pot(stR);
  st.push(['AMS4-3 level (TOCOS dual 10K log)', `${lv(aL)} / ${lv(aR)}`, W.stereo?'STEREO: left knob sets both':'LEFT / RIGHT: one knob per side']);
  const amp = v=> Math.min(v*Math.pow(10,(30-23)/20), 9.9);      // −23 dB pad + TDA2616 30 dB, 9.9 Vrms clip — inferred
  const spk = !W.headset; const pL=amp(aL), pR=amp(aR);
  st.push(['TDA2616 ×3 → speakers (P2/P3/P4)', spk? `${(pL*pL/8).toFixed(2)} W / ${(pR*pR/8).toFixed(2)} W into 8 Ω ${pL>=9.9||pR>=9.9?'<b style="color:var(--bad)">CLIP</b>':''}` : 'off — headset plugged in', `pad and gain ${inf}; driver wiring is a harness, not in the netlist`]);
  st.push(['Headset (front T/R/S)', W.headset? `${lv(aL)} / ${lv(aR)}` : 'not plugged', 'speaker feeds normalled through the jack (manual)']);
  return st;
}

/* ---------------- panels (200 px per inch, 17.100 × 1.650 in) ---------------- */
const PX = 200;
function hexGrille(cx, cy, cols){ // .250 hex holes, columns .275 apart, alternate columns offset .159
  let s=''; const n=cols, x0=cx-(n-1)/2*55; for (let c=0;c<n;c++){ const four = (c%2)===1; const ys = four? [-95.4,-31.8,31.8,95.4] : [-63.6,0,63.6];
    ys.forEach(dy=>{ const x=x0+c*55, y=cy+dy, r=25; const pts=[0,1,2,3,4,5].map(k=>{ const a=Math.PI/3*k; return (x+r*Math.cos(a)).toFixed(1)+','+(y+r*Math.sin(a)).toFixed(1); }).join(' '); s+=`<polygon points="${pts}" fill="#060707" stroke="#2a2c2e" stroke-width="2"/>`; }); }
  return s;
}
function knob(x, y, val, id){ const a=(-150+300*val)*Math.PI/180;
  return `<g class="ams4-pot" data-k="${id}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="58" fill="transparent"/>
    <circle cx="${x}" cy="${y}" r="42" fill="#0c0d0e" stroke="#3a3d40" stroke-width="3"/><circle cx="${x}" cy="${y}" r="29" fill="#1d9a4c" stroke="#0d5a2a" stroke-width="3"/>
    <line x1="${x}" y1="${y}" x2="${(x+38*Math.sin(a)).toFixed(1)}" y2="${(y-38*Math.cos(a)).toFixed(1)}" stroke="#f2f2ee" stroke-width="5" stroke-linecap="round"/>
    <title>${id==='L'?'LEFT':'RIGHT'} level ${Math.round(val*100)}% — click left half to turn down, right half up; mouse wheel turns</title></g>`; }
function frontSVG(t, opts){
  opts=opts||{}; const V=VERS[D.ver], W=D.W, on = D.run && !D.run.off;
  const m = on ? meterAt(t) : [-99,-99];
  const red = on && sigAt('red',t,0), boot = inBoot(t);
  const led=(x,y,lit,col)=>`<circle cx="${x}" cy="${y}" r="14" fill="#050505"/><circle cx="${x}" cy="${y}" r="10.5" fill="${lit?col:'var(--led-off)'}" ${lit?'filter="url(#ams4glow)"':''}/>`;
  let s=`<svg viewBox="0 0 3420 330" role="img" aria-label="AMS4 front panel (real silkscreen)" style="width:100%;display:block;border-radius:6px">
   <defs><filter id="ams4glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect width="3420" height="330" rx="8" fill="#1e1f21"/>
   ${hexGrille(180,165,5)}${hexGrille(3240,165,5)}${hexGrille(1710,165,13)}`;
  // display / buttons area
  if (V.kind==='pic'){
    const txt = on ? dispAt(t) : '    ';
    s+=`<rect x="425" y="42" width="200" height="82" rx="4" fill="#160404" stroke="#3a3c3e" stroke-width="3"/>
     <g filter="url(#ams4glow)">${SIM.dotMatrix(txt, 449, 59, 6.9, '#9dff57', 'rgba(140,220,90,.07)')}</g>`;
  } else if (V.kind==='ams4n'){
    s+=`<rect x="300" y="20" width="420" height="140" fill="#1e1f21"/>`;
  } else {
    const e=D.e, l2 = (' D'+(e.audio+1)+'         '+String(e.vol).padEnd(3)+'  ').slice(0,16);
    s+=`<rect x="300" y="20" width="420" height="140" fill="#1e1f21"/><rect x="384" y="16" width="620" height="112" rx="6" fill="#2f4d12" stroke="#3a3c3e" stroke-width="3"/>
      ${SIM.dotMatrix('AUDIO     VOLUME', 400, 30, 5.6, '#e8ffd0', 'rgba(0,0,0,.08)')}${SIM.dotMatrix(l2, 400, 80, 5.6, '#e8ffd0', 'rgba(0,0,0,.08)')}`;
  }
  s+=`<image href="${ASSET}ams4-front-green.png" width="3420" height="330"/><image href="${ASSET}ams4-front-white.png" width="3420" height="330"/>`;
  if (V.kind!=='pic') s+=`<rect x="420" y="135" width="230" height="30" fill="#1e1f21"/>`;
  // meter LEDs (G holes .130, 9 pitches of .160 from x 3.390, rows .724 / .924)
  for (let row=0; row<2; row++) for (let i=0;i<10;i++){ const lit = on && !boot && m[row]>=VU[i]; s+=led(678+i*32, row?185:145, lit, i>=7?'#ff3b30':'#56ff3a'); }
  // phase LEDs 0° / 180° (G holes at 6.575 / 6.875, y .200)
  s+=led(1315,40, on && !boot && !red, '#56ff3a') + led(1375,40, on && !boot && red, '#ff3b30');
  // lens screws
  s+=`<circle cx="390" cy="165" r="11" fill="#77797c"/><circle cx="1020" cy="165" r="11" fill="#77797c"/>`;
  // buttons
  const btnSq=(x,y,id,label,w)=>`<g class="ams4-btn" data-b="${id}" style="cursor:pointer"><rect x="${x-w/2-4}" y="${y-w/2-4}" width="${w+8}" height="${w+8}" rx="6" fill="#0a0a0b"/><rect x="${x-w/2+4}" y="${y-w/2+4}" width="${w-8}" height="${w-8}" rx="5" fill="#2a2c2f" stroke="#45484c" stroke-width="2"/><title>${label}</title></g>`;
  if (V.kind==='pic'){ s+=btnSq(465,214,'MODE','MODE (PB1 → '+PINS[V.pins].mode+')'+(V.modeOff?' — disabled in '+V.vs:''),96)+btnSq(585,214,'SRC','SOURCE (PB2 → '+PINS[V.pins].src+')',96); }
  else if (V.kind==='ams4n'){ const n = on? sigAt('ledN',t,0) : 0; for (let i=0;i<4;i++){ const x=360+i*110; s+=btnSq(x,214,'PB'+(i+1),`PB${i+1}: input ${i+1} (AES ${i+1} if locked, else analog ${i+1}) — positions ${'inferred'}`,84)+led(x,120,n===i+1,'#56ff3a')+`<text x="${x}" y="82" fill="#eee" font-size="30" text-anchor="middle" font-family="Arial">${i+1}</text>`; }
    s+=led(800,40, on && sigAt('aesled',t,0), '#ffb43a')+`<text x="830" y="50" fill="#bbb" font-size="24" font-family="Arial">AES (RD1)</text>`; }
  else { s+=`<g class="ams4-enc" data-e="1" style="cursor:pointer"><circle cx="465" cy="225" r="48" fill="#0c0d0e" stroke="#3a3d40" stroke-width="3"/><circle cx="465" cy="225" r="30" fill="#2a2c2f"/><title>AUDIO encoder: click left/right half</title></g><g class="ams4-enc" data-e="2" style="cursor:pointer"><circle cx="585" cy="225" r="48" fill="#0c0d0e" stroke="#3a3d40" stroke-width="3"/><circle cx="585" cy="225" r="30" fill="#2a2c2f"/><title>VOLUME encoder: click left/right half</title></g>`; }
  // level pots, STEREO switch, headset jack
  s+=knob(2373,224,W.potL,'L')+knob(2573,224,W.stereo?W.potL:W.potR,'R');
  s+=`<g class="ams4-st" style="cursor:pointer"><circle cx="2473" cy="233" r="34" fill="#070708"/><circle cx="2473" cy="233" r="${W.stereo?26:21}" fill="#232527" stroke="#4a4d50" stroke-width="2"/><title>STEREO switch (PHA-2UEE, latching): ${W.stereo?'out = STEREO':'in = LEFT / RIGHT'}</title></g>`;
  s+=`<g class="ams4-hs" style="cursor:pointer"><circle cx="2778" cy="174" r="44" fill="#8e9195" stroke="#5a5d60" stroke-width="3"/><circle cx="2778" cy="174" r="30" fill="#bfc2c5"/><circle cx="2778" cy="174" r="16" fill="#050505"/>
    ${W.headset?`<rect x="2754" y="150" width="48" height="48" rx="10" fill="#1b1b1c" stroke="#444"/><rect x="2770" y="190" width="16" height="140" fill="#1b1b1c"/>`:''}<title>HEADSET jack — click to ${W.headset?'unplug':'plug in'}</title></g>`;
  if (!on){ s+=`<rect width="3420" height="330" fill="rgba(0,0,0,.35)"/>`; }
  s+=(opts.hot||'')+`</svg>`;
  return s;
}
function rearSVG(t){
  const W=D.W, on=D.run && !D.run.off;
  const en75 = on && sigAt('en75',t,0), en110 = on && sigAt('en110',t,0), tally = on && sigAt('tally',t,0), txen = on && sigAt('txen',t,0);
  const euro=(x,y,plug,id,title,hl)=>`<g class="ams4-j" data-j="${id}" style="cursor:pointer"><rect x="${x-50}" y="${y-33}" width="100" height="66" rx="5" fill="${hl?'#2fb35c':'#1f8a45'}" stroke="#0d4d24" stroke-width="2"/>${[-30,0,30].map(d=>`<rect x="${x+d-11}" y="${y-8}" width="22" height="26" rx="3" fill="#0f3d1d"/>`).join('')}
     ${plug?`<rect x="${x-46}" y="${y-29}" width="92" height="58" rx="4" fill="#2bbd5b" opacity=".9"/>${[-30,0,30].map(d=>`<circle cx="${x+d}" cy="${y-12}" r="8" fill="#1a6b35"/>`).join('')}`:''}<title>${title}</title></g>`;
  const bnc=(x,y,plug,id,title,hl)=>`<g class="ams4-j" data-j="${id}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="50" fill="#9c8233" stroke="${hl?'var(--accent)':'#5e4d1c'}" stroke-width="${hl?7:3}"/><circle cx="${x}" cy="${y}" r="32" fill="#d8c27a"/><circle cx="${x}" cy="${y}" r="10" fill="#7a5f12"/>
     ${plug?`<circle cx="${x}" cy="${y}" r="40" fill="#2b5f9e" opacity=".92"/><circle cx="${x}" cy="${y}" r="14" fill="#8fb3dd"/>`:''}<title>${title}</title></g>`;
  let s=`<svg viewBox="0 0 3420 330" role="img" aria-label="AMS4 rear panel (real silkscreen)" style="width:100%;display:block;border-radius:6px">
   <rect width="3420" height="330" rx="8" fill="#1e1f21"/>`;
  // IEC inlet (D 1.080 × 1.240 at x .840)
  s+=`<g class="ams4-j" data-j="pwr" style="cursor:pointer"><rect x="60" y="41" width="216" height="248" rx="10" fill="#0b0b0c" stroke="#3a3c3e" stroke-width="3"/><rect x="92" y="62" width="152" height="112" rx="16" fill="#151617"/>${[118,168,218].map((x,i)=>`<rect x="${x-9}" y="${i===1?82:100}" width="18" height="${i===1?30:42}" fill="#999"/>`).join('')}<rect x="102" y="196" width="132" height="70" rx="6" fill="#202224"/><title>AC inlet + fuse (1 A S.B.) — click: power ${W.power?'off':'on'}</title></g>`;
  for (let k=0;k<7;k++) s+=`<rect x="${687+k*50}" y="65" width="19" height="200" rx="9" fill="#060606"/>`;
  // DEMUX area (rear ISS 7 detail B universal adapter; DEMUX4-REAR plate 4.262 × .850)
  if (W.demux==='dmx4'){ s+=`<rect x="1246" y="17" width="852" height="170" rx="6" fill="#1a1b1d" stroke="#3a3c3e" stroke-width="2"/><circle cx="1283" cy="70" r="12" fill="#77797c"/><circle cx="2061" cy="70" r="12" fill="#77797c"/>`;
    const lab=['SDI 1 (A)','SDI 2 (B)','SDI OUT','AES 1','AES 2'];
    [1372,1522,1672,1822,1972].forEach((x,i)=>{ s+= i<2 ? bnc(x,96,W.sdi[i].on,'sdi'+i,`${lab[i]} — ${W.sdi[i].on?W.sdi[i].fmt+', groups '+[0,1,2,3].filter(g=>(W.sdi[i].groups>>g)&1).map(g=>g+1).join(','):'no cable'} (click to ${W.sdi[i].on?'unplug':'plug'})`) : bnc(x,96,false,'',lab[i]+' (DEMUX-4 output)'); s+=`<text x="${x}" y="172" fill="#eee" font-size="22" text-anchor="middle" font-family="Arial">${lab[i]}</text>`; }); }
  else if (W.demux==='dmx1'){ s+=`<rect x="1246" y="17" width="852" height="170" rx="6" fill="#1a1b1d" stroke="#3a3c3e" stroke-width="2"/>`; const lab=['SDI IN','SDI LOOP','OUTPUT 1','OUTPUT 2'];
    [1372,1572,1772,1972].forEach((x,i)=>{ s+= i===0 ? bnc(x,96,W.sdi[0].on,'sdi0',`DEMUX-1 SDI input — click to ${W.sdi[0].on?'unplug':'plug'}`) : bnc(x,96,false,'',lab[i]); s+=`<text x="${x}" y="172" fill="#eee" font-size="22" text-anchor="middle" font-family="Arial">${lab[i]}</text>`; });
    s+=`<text x="1672" y="40" fill="var(--warn)" font-size="20" text-anchor="middle" font-family="Arial">DEMUX-1 plate layout inferred from the manual</text>`; }
  else s+=`<rect x="1246" y="17" width="852" height="170" rx="6" fill="#202124" stroke="#3a3c3e" stroke-width="2"/><circle cx="1283" cy="70" r="12" fill="#77797c"/><circle cx="2061" cy="70" r="12" fill="#77797c"/><text x="1672" y="110" fill="#777" font-size="24" text-anchor="middle" font-family="Arial">DEMUX4-COVER blank plate</text>`;
  // RS-485 activity marker
  s+=`<circle cx="2140" cy="40" r="9" fill="${txen?'var(--led-a)':'#333'}"><title>RS-485 driver enable (PORTC,1)</title></circle>`;
  // EXT MUTE / TALLY block (A .528 × .332 at 10.898, .869)
  s+=euro(2180,174,W.mute,'mute',`EXT MUTE (I) · TALLY (O) · G — click to ${W.mute?'open':'close'} the mute contact. Tally ${tally?'ON (Q1 conducting)':'off'}`, W.mute);
  if (tally) s+=`<circle cx="2240" cy="128" r="9" fill="var(--led-a)"><title>EXT MUTE TALLY active</title></circle>`;
  // analog euroblocks: OUTPUT, 1..4 (top = LEFT, bottom = RIGHT)
  [2322,2428,2534,2640,2746].forEach((x,k)=>{ const i=k-1;
    if (k===0){ s+=euro(x,116,false,'out','OUTPUT LEFT — balanced line out (U28, 30 Ω)')+euro(x,233,false,'out','OUTPUT RIGHT — balanced line out (U27, 30 Ω)'); return; }
    const a=W.ana[i], sel = on && sigAt('xpt'+(i+1),t,0); s+=euro(x,116,a.on,'ana'+i,`ANALOG ${i+1} LEFT (+ − G): ${a.on?a.lvl+' dBu':'unplugged'} — click`, sel)+euro(x,233,a.on,'ana'+i,`ANALOG ${i+1} RIGHT: ${a.on?a.ph:'unplugged'}`, sel); });
  // AES 110 euroblocks (1/2 left column, 3/4 right column)
  [[2914,116,0],[2914,233,1],[3020,116,2],[3020,233,3]].forEach(([x,y,i])=>{ const a=W.aes[i]; s+=euro(x,y,a.c110,'a110-'+i,`AES ${i+1} 110 Ω (transformer, DS75176 bank on PORTA,1) — ${a.c110?a.lvl+' dBFS':'empty'} — click`, en110 && a.c110 && sigAt('rxsrc',t,'')==='aes'+i+':110'); });
  [[3150,104,0],[3150,236,1],[3274,104,2],[3274,236,3]].forEach(([x,y,i])=>{ const a=W.aes[i]; s+=bnc(x,y,a.c75,'a75-'+i,`AES ${i+1} 75 Ω BNC (DS75176 bank on PORTC,0) — ${a.c75?a.lvl+' dBFS':'empty'} — click`, en75 && a.c75 && sigAt('rxsrc',t,'')==='aes'+i+':75'); });
  s+=`<image href="${ASSET}ams4-rear-white.png" width="3420" height="330" style="pointer-events:none"/>`;
  // termination bank indicators
  s+=`<text x="3330" y="22" fill="${en75?'var(--accent)':'#666'}" font-size="20" text-anchor="end" font-family="Arial">75 Ω bank ${en75?'ON':'off'}</text><text x="2960" y="22" fill="${en110?'var(--accent)':'#666'}" font-size="20" text-anchor="middle" font-family="Arial">110 Ω bank ${en110?'ON':'off'}</text>`;
  if (!on) s+=`<rect width="3420" height="330" fill="rgba(0,0,0,.3)" style="pointer-events:none"/>`;
  return s+`</svg>`;
}
function bindPanels(root){
  root.querySelectorAll('.ams4-btn').forEach(g=> g.onclick=()=>{ const b=g.dataset.b; if (b==='MODE') A.mode(); else if (b==='SRC') A.source(); else A.pb(+b.slice(2)); });
  root.querySelectorAll('.ams4-pot').forEach(g=>{ const side=g.dataset.k==='R'?1:0;
    g.onclick=e=>{ const r=g.getBoundingClientRect(); A.pot(side, (e.clientX-r.left)/r.width<0.5?-0.08:0.08); };
    g.addEventListener('wheel', e=>{ e.preventDefault(); A.pot(side, e.deltaY<0?0.04:-0.04); }, {passive:false}); });
  root.querySelectorAll('.ams4-enc').forEach(g=> g.onclick=e=>{ const r=g.getBoundingClientRect(); A.enc(+g.dataset.e, (e.clientX-r.left)/r.width<0.5?-1:1); });
  root.querySelectorAll('.ams4-st').forEach(g=> g.onclick=()=>A.stereo());
  root.querySelectorAll('.ams4-hs').forEach(g=> g.onclick=()=>A.headset());
  root.querySelectorAll('.ams4-j').forEach(g=> g.onclick=()=>{ const j=g.dataset.j; if (!j) return;
    if (j==='pwr') A.power(); else if (j==='mute') A.mute(); else if (j.startsWith('ana')) A.ana(+j[3]); else if (j.startsWith('a110-')) A.aes(+j[5],'110'); else if (j.startsWith('a75-')) A.aes(+j[4],'75'); else if (j.startsWith('sdi')) A.sdi(+j[3]); });
}
document.addEventListener('keydown', e=>{
  if (!window[FLAG] || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase(), V=VERS[D.ver];
  const m={m:()=>A.mode(), s:()=>A.source(), x:()=>A.mute(), h:()=>A.headset(), t:()=>A.stereo(), p:()=>A.cycle(), '1':()=>V.kind==='ams4n'&&A.pb(1), '2':()=>V.kind==='ams4n'&&A.pb(2), '3':()=>V.kind==='ams4n'&&A.pb(3), '4':()=>V.kind==='ams4n'&&A.pb(4)};
  if (m[k]){ m[k](); e.preventDefault(); }
});

/* ---------------- controls ---------------- */
function controlsHTML(){
  const V=VERS[D.ver];
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px">
   ${V.kind==='pic'?'<button data-a="mode">MODE</button><button data-a="src">SOURCE</button>':V.kind==='ams4n'?[1,2,3,4].map(i=>`<button data-a="pb${i}">PB${i}</button>`).join(''):'<button data-a="e1-">AUDIO ⟲</button><button data-a="e1+">AUDIO ⟳</button><button data-a="e2-">VOL −</button><button data-a="e2+">VOL +</button>'}
   <button data-a="mute">${D.W.mute?'Open':'Close'} EXT MUTE</button><button data-a="hs">${D.W.headset?'Unplug':'Plug'} headset</button><button data-a="st">STEREO ${D.W.stereo?'in':'out'}</button>
   <button data-a="cyc">Power cycle</button><button data-a="ff">Idle 30 s</button><button data-a="rst">Factory defaults</button></div>
   <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px">
   <label class="small">Firmware <select data-s="ver">${Object.keys(VERS).map(k=>`<option value="${k}" ${k===D.ver?'selected':''}>${VERS[k].label}</option>`).join('')}</select></label>
   <label class="small">Option <select data-s="dmx"><option value="none" ${D.W.demux==='none'?'selected':''}>no DEMUX (cover plate)</option><option value="dmx1" ${D.W.demux==='dmx1'?'selected':''}>DEMUX-1 (2001, SD)</option><option value="dmx4" ${D.W.demux==='dmx4'?'selected':''}>DEMUX-4 (2013, 3G/HD/SD, 2 inputs)</option></select></label></div>
   <div class="small muted" style="margin-top:4px">Keys: M = MODE, S = SOURCE, X = EXT MUTE, H = headset, T = STEREO, P = power cycle${V.kind==='ams4n'?', 1–4 = PB1–PB4':''}. Click the rear connectors to plug or unplug sources. Each action starts a new ${DUR}-second window with the action 5 ms in.</div>`;
}
function bindControls(root){
  const map={mode:A.mode, src:A.source, mute:A.mute, hs:A.headset, st:A.stereo, cyc:A.cycle, ff:()=>A.ffwd(30), rst:A.reset, pb1:()=>A.pb(1), pb2:()=>A.pb(2), pb3:()=>A.pb(3), pb4:()=>A.pb(4), 'e1-':()=>A.enc(1,-1), 'e1+':()=>A.enc(1,1), 'e2-':()=>A.enc(2,-1), 'e2+':()=>A.enc(2,1)};
  root.querySelectorAll('[data-a]').forEach(b=> b.onclick=()=>map[b.dataset.a] && map[b.dataset.a]());
  const sv=root.querySelector('[data-s="ver"]'); if (sv) sv.onchange=e=>A.ver(e.target.value);
  const sd=root.querySelector('[data-s="dmx"]'); if (sd) sd.onchange=e=>A.demux(e.target.value);
}
function sourcesHTML(){
  const W=D.W; const phs=['in','inv','uncorr','Lonly'];
  return `<table class="kv small"><tr><th>Input</th><th>Connected</th><th>Level</th><th>L/R</th></tr>
   ${W.ana.map((a,i)=>`<tr><td>Analog ${i+1}</td><td><input type="checkbox" data-w="ana.${i}.on" ${a.on?'checked':''}></td><td><input type="number" step="1" style="width:56px" data-w="ana.${i}.lvl" value="${a.lvl}"> dBu</td><td><select data-w="ana.${i}.ph">${phs.map(p=>`<option ${p===a.ph?'selected':''}>${p}</option>`).join('')}</select></td></tr>`).join('')}
   ${W.aes.map((a,i)=>`<tr><td>AES ${i+1}</td><td>75 Ω <input type="checkbox" data-w="aes.${i}.c75" ${a.c75?'checked':''}> 110 Ω <input type="checkbox" data-w="aes.${i}.c110" ${a.c110?'checked':''}></td><td><input type="number" step="1" style="width:56px" data-w="aes.${i}.lvl" value="${a.lvl}"> dBFS</td><td><select data-w="aes.${i}.ph">${phs.map(p=>`<option ${p===a.ph?'selected':''}>${p}</option>`).join('')}</select></td></tr>`).join('')}
   ${W.demux!=='none'?W.sdi.slice(0, W.demux==='dmx4'?2:1).map((s,k)=>`<tr><td>${W.demux==='dmx4'?(k?'SDI 2 (B)':'SDI 1 (A)'):'SDI IN'}</td><td><input type="checkbox" data-w="sdi.${k}.on" ${s.on?'checked':''}></td><td colspan="2">groups ${[0,1,2,3].map(g=>`<label><input type="checkbox" data-g="${k}.${g}" ${(s.groups>>g)&1?'checked':''}>${g+1}</label>`).join(' ')}</td></tr>`).join(''):''}
  </table><div class="small muted">Changes apply at the playhead (new window). “inv” = right channel inverted, “uncorr” = different tones, “Lonly” = left only.</div>`;
}
function bindSources(root){
  root.querySelectorAll('[data-w]').forEach(el=> el.onchange=()=>{ const [a,i,k]=el.dataset.w.split('.'); const o=D.W[a][+i];
    const v = el.type==='checkbox'? el.checked : el.type==='number'? +el.value : el.value; act(`${a.toUpperCase()} ${+i+1}: ${k} → ${v}`, c=>{ o[k]=v; }); });
  root.querySelectorAll('[data-g]').forEach(el=> el.onchange=()=>{ const [k,g]=el.dataset.g.split('.').map(Number); A.group(k,g); });
}

/* ---------------- timeline lanes ---------------- */
function laneBits(c, X, t0, t1, y, h, arr, col, label){ // arr = [[t, v]] step signal, v truthy = high
  if (!arr || !arr.length){ c.fillStyle=SIM.css('--ink2'); c.font='11px sans-serif'; c.fillText(label||'—', X(t0)+4, y+h/2+4); return; }
  let v=0; for (const [tt,x] of arr){ if (tt<=t0) v=x; else break; }
  const Y=q=> q? y+4 : y+h-4; const segs=[]; let ts=t0;
  c.strokeStyle=col; c.lineWidth=1.6; c.beginPath(); c.moveTo(X(t0),Y(v));
  for (const [tt,x] of arr){ if (tt<=t0) continue; if (tt>t1) break; c.lineTo(X(tt),Y(v)); c.lineTo(X(tt),Y(x)); if (v) segs.push([ts,tt]); v=x; ts=tt; }
  c.lineTo(X(t1),Y(v)); c.stroke(); if (v) segs.push([ts,t1]);
  c.globalAlpha=.22; c.fillStyle=col; segs.forEach(([a,b])=>c.fillRect(X(a),y+4,Math.max(1,X(b)-X(a)),h-8)); c.globalAlpha=1;
  if (label){ c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; c.fillText(label, X(t0)+4, y+11); }
}
function lanes(set){
  const R=D.run, css=SIM.css, V=VERS[D.ver]; const L=[];
  if (!R || R.off){ return [{label:'Unit', h:28, draw(c,X,t0,t1,y,h){ c.fillStyle=css('--ink2'); c.font='12px sans-serif'; c.fillText(R&&R.off?'Power off — nothing runs':'—', X(t0)+6, y+h/2+4); }}]; }
  if (V.kind==='ams4e') return [{label:'ATmega128 (AMS4E)', h:34, draw(c,X,t0,t1,y,h){ c.fillStyle=css('--ink2'); c.font='12px sans-serif'; c.fillText('AMS4E prototype: UI model only — main-loop timing of ams4e.c is not derived here (see Software tab)', X(t0)+6, y+h/2+4); }}];
  const txt=(c,s,x,y,col)=>{ c.fillStyle=col||css('--ink'); c.font='11px '+css('--mono'); c.fillText(s,x,y); };
  const full = set==='full';
  L.push({label:'Power-up phases', h:30, draw(c,X,t0,t1,y,h){ const cols=[css('--warn'),css('--accent2'),css('--accent')]; R.boot.forEach((b,i)=>{ if (b.t1<t0||b.t0>t1) return; c.fillStyle=cols[i%3]; c.globalAlpha=.45; c.fillRect(X(b.t0),y+4,Math.max(1,X(b.t1)-X(b.t0)),h-8); c.globalAlpha=1; const w=X(Math.min(b.t1,t1))-X(Math.max(b.t0,t0)); if (w>60){ c.save(); c.beginPath(); c.rect(X(Math.max(b.t0,t0)),y,w,h); c.clip(); txt(c,b.name,X(Math.max(b.t0,t0))+4,y+h/2+4); c.restore(); } });
    if (!R.boot.length) txt(c,'(window starts in the main loop — power cycle to see start-up)',X(t0)+6,y+h/2+4,css('--ink2')); }});
  L.push({label:`Buttons ${V.kind==='ams4n'?'PB1–PB4':'MODE · SOURCE'} (raw / accepted)`, h:30, draw(c,X,t0,t1,y,h){ (D.base.ev||[]).forEach(e=>{ c.fillStyle=css('--accent2'); c.fillRect(X(e.t0),y+5,Math.max(2,X(e.t1)-X(e.t0)),h-10); txt(c,e.b,X(e.t0)+3,y+h/2+4,css('--ink')); });
    R.notes.filter(n=>n.fn==='debounce').forEach(n=>{ if (n.t<t0||n.t>t1) return; c.fillStyle=css('--accent'); c.fillRect(X(n.t)-1,y+2,3,h-4); }); }});
  L.push({label:'PIC16F874 main-loop passes', h:30, draw(c,X,t0,t1,y,h){
    const pxp = X(t0+0.00058)-X(t0); const cols=[css('--accent'),css('--accent2')]; let shown=0;
    if (pxp<1.5){ c.fillStyle=css('--accent'); c.globalAlpha=.35; const a=Math.max(t0,R.bootEnd); if (a<t1) c.fillRect(X(a),y+8,X(t1)-X(a),h-16); c.globalAlpha=1; let n=0; for (let i=0;i<R.pt.length;i++) if (R.pt[i]>=t0&&R.pt[i]<t1) n++; if (n) txt(c,`${n.toLocaleString()} passes (≈${SIM.fmtDur((t1-Math.max(t0,R.bootEnd))/Math.max(1,n))} each)`, X(Math.max(t0,R.bootEnd))+6, y+h/2+4); return; }
    for (let i=0;i<R.pt.length;i++){ if (R.pe[i]<t0) continue; if (R.pt[i]>t1) break; c.fillStyle=cols[i%2]; c.globalAlpha=.55; c.fillRect(X(R.pt[i]),y+5,Math.max(1,X(R.pe[i])-X(R.pt[i])-1),h-10); c.globalAlpha=1; if (X(R.pe[i])-X(R.pt[i])>44) txt(c,'#'+i,X(R.pt[i])+3,y+h/2+4); } }});
  L.push({label:'Routine running (inside the pass)', h:30, draw(c,X,t0,t1,y,h){
    const pxp = X(t0+0.00058)-X(t0); if (pxp<120){ txt(c,'zoom in to ≈ 1 ms to see the routines',X(t0)+6,y+h/2+4,css('--ink2')); return; }
    const pal=[css('--accent'),css('--accent2'),css('--warn')];
    for (let i=0;i<R.pt.length;i++){ if (R.pe[i]<t0) continue; if (R.pt[i]>t1) break; const st=R.st[i]; const ix=st.map((v,k)=>[v,k]).filter(a=>a[0]>=0);
      ix.forEach(([v,k],j)=>{ const a=R.pt[i]+v*TCY, b = j+1<ix.length? R.pt[i]+ix[j+1][0]*TCY : R.pe[i]; c.fillStyle=pal[k%3]; c.globalAlpha=.5; c.fillRect(X(a),y+4,Math.max(1,X(b)-X(a)-0.5),h-8); c.globalAlpha=1; if (X(b)-X(a)>50){ c.save(); c.beginPath(); c.rect(X(a),y,X(b)-X(a),h); c.clip(); txt(c,STEPS[k][0],X(a)+2,y+h/2+4); c.restore(); } }); } }});
  L.push({label:'CS8415A SPI (CS = RB2, CCLK = RB4)', h:28, draw(c,X,t0,t1,y,h){
    const pxp = X(t0+0.00058)-X(t0); if (pxp<6){ txt(c,`3 transfers per pass: read reg 16, write reg 2, write reg 4 (${(3*8*3*5)} CCLK cycles)`,X(t0)+6,y+h/2+4,css('--ink2')); return; }
    for (const x of R.spi){ if (x.t0>t1) break; const dur = (x.kind==='read8415'?189:152)*TCY; if (x.t0+dur<t0) continue; c.fillStyle= x.kind==='read8415'?css('--accent2'):css('--warn'); c.globalAlpha=.6; c.fillRect(X(x.t0),y+5,Math.max(1,X(x.t0+dur)-X(x.t0)),h-10); c.globalAlpha=1;
      const w=X(x.t0+dur)-X(x.t0); if (w>200){ const per=dur/x.bytes.length; x.bytes.forEach((b,k)=>{ const xa=X(x.t0+k*per); txt(c,`0x${hx(b)}`,xa+3,y+h/2+4); if (w>900){ for (let bit=0;bit<8;bit++){ const tb=x.t0+k*per+(bit+0.5)*per/8; c.fillStyle=css('--ink'); c.fillRect(X(tb),y+3,1.5,5); } } }); }
      else if (w>40) txt(c,x.kind,X(x.t0)+2,y+h/2+4); } }});
  L.push({label:'SLG2016 display (dis3 dis2 dis1 dis0)', h:28, draw(c,X,t0,t1,y,h){ const a=R.disp; for (let i=0;i<a.length;i++){ const ta=a[i][0], tb=i+1<a.length?a[i+1][0]:DUR; if (tb<t0||ta>t1) continue; c.fillStyle= a[i][1].trim()?css('--accent'):css('--grid'); c.globalAlpha=.25; c.fillRect(X(Math.max(ta,t0)),y+4,X(Math.min(tb,t1))-X(Math.max(ta,t0)),h-8); c.globalAlpha=1; if (X(Math.min(tb,t1))-X(Math.max(ta,t0))>34) txt(c,'“'+a[i][1]+'”',X(Math.max(ta,t0))+3,y+h/2+4); c.fillStyle=css('--ink2'); c.fillRect(X(ta),y+3,1,h-6); } }});
  L.push({label:'AES receivers 75 Ω (RC0) / 110 Ω (RA1) on', h:34, draw(c,X,t0,t1,y,h){ laneBits(c,X,t0,t1,y,h/2,R.sig.en75,css('--accent'),'75 Ω'); laneBits(c,X,t0,t1,y+h/2,h/2,R.sig.en110,css('--accent2'),'110 Ω'); }});
  L.push({label:'CS8415A locked · UNLOCK bit read', h:34, draw(c,X,t0,t1,y,h){ laneBits(c,X,t0,t1,y,h/2,(R.sig.rxsrc||[]).map(([tt,v])=>[tt,v?1:0]),css('--accent'),'PLL locked'); laneBits(c,X,t0,t1,y+h/2,h/2,R.sig.unlock,css('--bad'),'cs8415_16 (1 = unlock)'); }});
  L.push({label:'Crosspoints on: XPT1–4 · XPTAES', h:40, draw(c,X,t0,t1,y,h){ const cols=[css('--accent'),css('--accent2'),css('--warn'),'#a070ff',css('--bad')]; ['xpt1','xpt2','xpt3','xpt4','xptaes'].forEach((n,k)=>{ const a=R.sig[n]||[]; let cur=0, ts=t0; c.fillStyle=cols[k];
      for (const [tt,v] of a){ if (tt<=t0){ cur=v; continue; } if (tt>t1) break; if (cur) c.fillRect(X(Math.max(ts,t0)),y+3+k*7,X(tt)-X(Math.max(ts,t0)),5); cur=v; ts=tt; } if (cur) c.fillRect(X(Math.max(ts,t0)),y+3+k*7,X(t1)-X(Math.max(ts,t0)),5); });
      txt(c,'1 2 3 4 AES',X(t1)-80,y+h-3,css('--ink2')); }});
  if (full || D.W.demux!=='none') L.push({label:'RS-485 to DEMUX (9600 8N1, U36)', h:30, draw(c,X,t0,t1,y,h){
    let any=false; for (const u of R.uart){ if (u.t1<t0||u.t0>t1) continue; any=true; c.fillStyle= u.dir==='tx'?css('--accent'):css('--accent2'); c.globalAlpha=.6; c.fillRect(X(u.t0),y+(u.dir==='tx'?4:h/2),Math.max(1.5,X(u.t1)-X(u.t0)),h/2-4); c.globalAlpha=1;
      const w=X(u.t1)-X(u.t0); if (w>40) txt(c,`${u.dir==='tx'?'→':'←'}0x${hx(u.b)}`,X(u.t0)+2,y+(u.dir==='tx'?h/2-2:h-3));
      if (w>300){ for (let b=0;b<10;b++){ const v = b===0?0 : b===9?1 : (u.b>>(b-1))&1; c.fillStyle=css('--ink'); c.fillRect(X(u.t0+b*BYTE_T/10),y+(u.dir==='tx'?4:h/2)+(v?0:8),X(u.t0+(b+1)*BYTE_T/10)-X(u.t0+b*BYTE_T/10)-1,2); } } }
    if (!any) txt(c, D.W.demux==='none'?'no DEMUX: only the start-up probe':'(no bytes in this window)', X(t0)+6, y+h/2+4, css('--ink2')); }});
  L.push({label:'Phase: XOR (zoomed) · PHASE_V → RA3', h:34, draw(c,X,t0,t1,y,h){
    if (t1-t0<0.02){ c.strokeStyle=css('--warn'); c.lineWidth=1.3; c.beginPath(); const n=Math.min(1200, Math.floor(X(t1)-X(t0))); for (let i=0;i<=n;i++){ const tt=t0+(t1-t0)*i/n; const [l,r]=busV(tt); const v=((l>0)!==(r>0))?1:0; const yy=v?y+5:y+h-5; i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); txt(c,'LM393 → 74HC00 XOR',X(t0)+4,y+12,css('--ink2')); }
    laneBits(c,X,t0,t1,y,h,R.sig.red,css('--bad'), t1-t0<0.02?'':'RA3 = 1 → 180° LED red'); }});
  L.push({label:'Audio at the crosspoint output (L / R)', h:46, draw(c,X,t0,t1,y,h){
    const n=Math.min(1600, Math.floor(X(t1)-X(t0))); const mid=y+h/2, sc=(h/2-3)/2.5;
    if (t1-t0<0.05){ [0,1].forEach(ch=>{ c.strokeStyle=ch?css('--accent2'):css('--accent'); c.lineWidth=1.2; c.beginPath(); for (let i=0;i<=n;i++){ const tt=t0+(t1-t0)*i/n; const v=busV(tt)[ch]; const yy=mid - Math.max(-2.5,Math.min(2.5,v))*sc; i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); }); }
    else { const m=Math.min(400,n); [0,1].forEach(ch=>{ c.fillStyle=ch?css('--accent2'):css('--accent'); c.globalAlpha=.4; for (let i=0;i<m;i++){ const tt=t0+(t1-t0)*i/m; const v=busRms(tt)[ch]*Math.SQRT2; const hh=Math.min(h/2-2, v*sc); c.fillRect(X(tt), ch? mid : mid-hh, (X(t1)-X(t0))/m+0.5, hh); } c.globalAlpha=1; }); txt(c,'envelope (zoom below 50 ms for the waveform)',X(t0)+4,y+11,css('--ink2')); } }});
  L.push({label:'VU meter input (τ = 47 ms) → LM3916', h:30, draw(c,X,t0,t1,y,h){ const n=300; c.strokeStyle=css('--accent'); c.lineWidth=1.4; c.beginPath(); for (let i=0;i<=n;i++){ const tt=t0+(t1-t0)*i/n; const m=meterAt(tt)[0]; const yy=y+h-3-Math.max(0,Math.min(1,(m+25)/28))*(h-6); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); txt(c,'L (−25 … +3 VU)',X(t0)+4,y+11,css('--ink2')); }});
  if (full){
    L.push({label:'EXT MUTE TALLY (Q1)', h:24, draw(c,X,t0,t1,y,h){ laneBits(c,X,t0,t1,y,h,R.sig.tally,css('--warn'),''); }});
    L.push({label:'AES3 frames of the monitored digital source', h:26, draw(c,X,t0,t1,y,h){ const k=sigAt('rxsrc',(t0+t1)/2,''); if (!k){ txt(c,'no locked digital source',X(t0)+6,y+h/2+4,css('--ink2')); return; } SIM.pulses(c,X,t0,t1,y,h,1/48000,0,1/48000/2,css('--accent2'),'AES3 frames @ 48 kHz (inferred fs)'); }});
    L.push({label:'EEPROM writes (eewrite)', h:24, draw(c,X,t0,t1,y,h){ if (!R.ee.length){ const p=passAt((t0+t1)/2); const rv=p>=0?R.rv[p]:null; txt(c, rv && (rv[RI.press_flag]&4) ? `counting: rem2 = ${rv[RI.rem2]}, rem4 = ${rv[RI.rem4]} → save in ≈ ${(((256-rv[RI.rem4])*256-rv[RI.rem2])*(R.pe[p]-R.pt[p])).toFixed(1)} s` : 'idle (press_flag,2 clear)', X(t0)+6, y+h/2+4, css('--ink2')); return; }
      R.ee.forEach(e=>{ c.fillStyle=css('--bad'); c.fillRect(X(e.t),y+3,Math.max(2,X(e.t+K.EE_WR)-X(e.t)),h-6); txt(c,`[${e.addr}]←0x${hx(e.val)}`,X(e.t)+4,y+h/2+4); }); }});
  }
  return L;
}

/* ---------------- views ---------------- */
function insp(t){
  const R=D.run, V=VERS[D.ver]; if (!R || R.off) return '<p class="muted">Power is off.</p>';
  if (V.kind==='ams4e') return `<table class="kv"><tr><th>audio</th><td class="mono">D${D.e.audio+1} (Audio_Status ${D.e.audio})</td></tr><tr><th>volume</th><td class="mono">${D.e.vol} (level ${Math.round(D.e.vol*2.55)})</td></tr><tr><th>LCD</th><td class="mono">AUDIO     VOLUME<br> D${D.e.audio+1}         ${D.e.vol}</td></tr></table>`;
  const p=passAt(t); if (p<0 || inBoot(t)){ const b=R.boot.find(b=>t>=b.t0&&t<b.t1); return `<p><b>Start-up:</b> ${b?b.name:'—'}</p><p class="small">${b&&b.d?b.d:''}</p>`; }
  const r=R.rv[p], g=k=>r[RI[k]];
  const mode=g('mode'), dctl=g('disctl'), ifl=g('input_flag');
  const modeName = mode&1?'ANALOG':mode&2?'AES':mode&4?(V.ab?(g('sdiab')&1?'SDI B':'SDI A'):'SDI'):'?';
  const src = mode&1?'A'+(lowbit(g('sourcea'))+1):mode&2?'D'+(lowbit(g('sourced'))+1):'S'+(lowbit(g('sources'))+1);
  const lcState = (ifl&0x80)? ((dctl&4)? `refresh: counting to UNLOCK (lock_counter2/3 = ${g('lc2')}/${g('lc3')})` : `refresh: counting to LOCK (lock_counter/1 = ${g('lc0')}/${g('lc1')})`) : ((ifl&0x20)?'regular: locked':'regular: unlocked');
  return `<table class="kv">
   <tr><th>Pass</th><td class="mono">#${p} · ${SIM.fmtDur(R.pe[p]-R.pt[p])} (${Math.round((R.pe[p]-R.pt[p])/TCY)} cycles at 4.9152 MHz)</td></tr>
   <tr><th>mode / source</th><td class="mono">mode = b'${bn(mode,3)}' ${modeName} · ${src}${V.ab?` · sdiab ${g('sdiab')&1} · sourcesa/b kept`:''}</td></tr>
   <tr><th>Display</th><td class="mono">“${esc(dispAt(t))}”</td></tr>
   <tr><th>disctl</th><td class="mono">b'${bn(dctl)}' — ${dctl&1?'no audio lock':'audio ok'}, ${dctl&2?'no video':'video ok/n.a.'}, ${dctl&8?'unlocked state (XPTAES held off)':'locked state'}</td></tr>
   <tr><th>lock_count</th><td class="mono">${lcState}</td></tr>
   <tr><th>auto_detect</th><td class="mono">ee_data,7 = ${(g('ee_data')>>7)&1} (${(g('ee_data')&0x80)?'110 Ω':'75 Ω'}) · bcount ${g('bcount')} · lock,0 ${g('lock')&1}</td></tr>
   <tr><th>CS8415A</th><td class="mono">reg2 = 0x${hx(g('reg2'))} (input ${g('reg2')&7}) · cs8415_16 = ${g('cs8415_16')} ${g('cs8415_16')?'(UNLOCK)':'(locked)'}</td></tr>
   <tr><th>Crosspoints</th><td class="mono">${[1,2,3,4].map(k=>`XPT${k} ${sigAt('xpt'+k,t,0)?'<b>on</b>':'off'}`).join(' · ')} · XPTAES ${sigAt('xptaes',t,0)?'<b>on</b>':'off'}</td></tr>
   <tr><th>Phase ADC</th><td class="mono">ADRESH = ${g('adres')} ${g('adres')>=K.PH_TH?'≥':'<'} 100 → ${g('adres')>=K.PH_TH?'RED (180°)':'GREEN (0°)'}</td></tr>
   ${D.W.demux!=='none'?`<tr><th>DEMUX link</th><td class="mono">comout = b'${bn(g('comout'))}' · txflags = b'${bn(g('txflags'))}' · tx0 = 0x${hx(g('tx0'))} · uart0 = 0x${hx(g('uart0'))} · pole ${g('polecount1')}×256+${g('polecount0')}</td></tr>`:''}
   <tr><th>EEPROM save</th><td class="mono">${g('press_flag')&4?`counting — rem2 ${g('rem2')}, rem4 ${g('rem4')} (wraps at 256)`:'idle'} · stored: [0]=0x${hx(D.base.dyn.ee[0])} [1]=0x${hx(D.base.dyn.ee[1])} [10]=0x${hx(D.base.dyn.ee[10])}</td></tr>
   <tr><th>EXT MUTE</th><td class="mono">mute_flag ${g('mute_flag')&1} · tally ${sigAt('tally',t,0)?'ON':'off'}</td></tr>
  </table>`;
}
function traceHTML(){ const e=D.lastTrace; return e? `<div><b>${esc(e.name)}</b></div>`+e.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Press MODE or SOURCE, or click a rear connector. Each step the firmware takes is listed here with its time in the new window.</div>'; }
function viewSim(m){
  window[FLAG]=true;
  m.innerHTML = `
  ${card('Front panel at the playhead (AMS4-FRONT-SILK, green + white separations)', `<div id="fp"></div><div id="ctl"></div>`)}
  ${card('Rear panel — click connectors to plug / unplug (AMS4-REAR-SILK)', `<div id="rp"></div>`)}
  <div class="grid2">
    <div>${card('What the firmware did (last action)', `<div id="trace" class="log"></div>`)}${card('Sources', `<div id="srcs"></div>`)}</div>
    <div>${card('State at the playhead', `<div id="insp"></div>`)}${card('Signal path at the playhead (level through each stage)', `<div id="chain"></div>`)}</div>
  </div>
  ${card(`Timeline — ${DUR} s window, zoomable (click to seek)`, `<canvas id="tl"></canvas><p class="small muted">Pass length comes from a hand count of the MPASM routines (${inf}): ≈ 700 cycles ≈ 0.58 ms without the DEMUX, ≈ 0.65 ms with it. All the firmware's delays are pass counts, so this sets every other time on this page.</p>`)}
  ${card('Action log', `<div id="log" class="log"></div>`)}`;
  let rev=-1;
  const draw=()=>{ const t=SIM.t;
    if (rev!==D.rev){ rev=D.rev; m.querySelector('#ctl').innerHTML = controlsHTML(); bindControls(m.querySelector('#ctl')); m.querySelector('#srcs').innerHTML = sourcesHTML(); bindSources(m.querySelector('#srcs')); }
    m.querySelector('#fp').innerHTML=frontSVG(t); m.querySelector('#rp').innerHTML=rearSVG(t); bindPanels(m);
    m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#insp').innerHTML=insp(t);
    m.querySelector('#chain').innerHTML=`<table class="kv small">${chain(t).map(r=>`<tr><th>${r[0]}</th><td class="mono">${r[1]}</td><td class="small muted">${r[2]}</td></tr>`).join('')}</table>`;
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${esc(e.name)}</b> → “${esc(e.disp||'')}”</div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes('sim'), {labelW:210}); };
  SIM.on('time', draw);
}

/* one second in slow motion */
function aes3Bits(t){ // one AES3 frame of the monitored source at the playhead (sample from the tone)
  const r=routeAt(t), s=r.find(x=>x.kind!=='A'); const fs=48000; const n=Math.floor(t*fs);
  const sub=(ch)=>{ const amp = s? Math.pow(10,(s.lvl-18)/20) : 0; const v = s? amp*Math.sin(2*Math.PI*s.f*n/fs)*(ch&&s.ph==='inv'?-1:1)*(ch&&s.ph==='Lonly'?0:1) : 0;
    const q = Math.round(v*8388607)&0xFFFFFF; const bits=[]; for (let i=0;i<4;i++) bits.push(0); for (let i=0;i<20;i++) bits.push((q>>(4+i))&1); bits.push(0,0,0); let par=0; bits.forEach(b=>par^=b); bits.push(par); return {pre: ch? 'Y' : (n%192===0?'Z':'X'), bits, v}; };
  return {n, sub:[sub(0), sub(1)], s};
}
function drawAes(cv, t){
  const {c,w,h}=SIM.canvas(cv, 120); const F=aes3Bits(t); const ink=SIM.css('--ink'), a1=SIM.css('--accent'), a2=SIM.css('--accent2');
  const pre={X:[1,1,1,0,0,0,1,0],Y:[1,1,1,0,0,1,0,0],Z:[1,1,1,0,1,0,0,0]};
  let lv=[], last=0; F.sub.forEach(sb=>{ pre[sb.pre].forEach(b=>{ lv.push(b?1-last:last); last=lv[lv.length-1]; }); sb.bits.forEach(b=>{ last=1-last; lv.push(last); if (b) last=1-last; lv.push(last); }); });
  const cw=(w-20)/lv.length; c.strokeStyle=a1; c.lineWidth=1.5; c.beginPath(); lv.forEach((v,i)=>{ const x=10+i*cw, y=v?20:60; i?c.lineTo(x,y):c.moveTo(x,y); c.lineTo(x+cw,y); }); c.stroke();
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`frame ${F.n % 192} of the 192-frame block · preambles ${F.sub[0].pre}/${F.sub[1].pre} · L ${F.sub[0].v.toFixed(3)} R ${F.sub[1].v.toFixed(3)} FS ${F.s?'· '+F.s.name:'· no digital source routed'}`, 10, 90);
  c.fillStyle=a2; c.fillText('biphase-mark: 4 preamble + 4 aux + 20 audio + V U C P per subframe (what the DS75176 hands the CS8415A)', 10, 108);
}
function viewSecond(m){
  window[FLAG]=true;
  m.innerHTML = `<div class="grid2"><div>${card('The unit at the playhead', `<div id="fp"></div><div id="rp" style="margin-top:6px"></div><div id="ctl"></div>`)}</div>
   <div>${card('What happens in this window', `<div id="evs" class="log" style="max-height:340px"></div>`)}${card('SPI and UART at the playhead', `<div id="bus" class="small mono"></div>`)}</div></div>
   ${card(`One second in slow motion — every lane (zoom with the menu above; ${DUR} s window)`, `<canvas id="tl"></canvas>`)}
   ${card('AES3 at the selected digital input (playhead)', `<canvas id="aes"></canvas>`)}`;
  let rev=-1;
  const draw=()=>{ const t=SIM.t, R=D.run; if (rev!==D.rev){ rev=D.rev; m.querySelector('#ctl').innerHTML = controlsHTML(); bindControls(m.querySelector('#ctl')); } m.querySelector('#fp').innerHTML=frontSVG(t); m.querySelector('#rp').innerHTML=rearSVG(t); bindPanels(m);
    const [a,b]=SIM.window(); const ev = R && !R.off ? R.notes.filter(n=>n.t>=a&&n.t<=b).slice(0,60) : [];
    const bootEv = R && !R.off ? R.boot.filter(x=>x.t1>=a&&x.t0<=b).map(x=>({t:x.t0, fn:'start-up', txt:x.name+(x.d?' — '+x.d:'')})) : [];
    m.querySelector('#evs').innerHTML = bootEv.concat(ev).sort((x,y)=>x.t-y.t).map(n=>`<div><span class="mono">${SIM.fmtT(n.t)}</span> <b>${n.fn}</b> ${n.txt}</div>`).join('') || '<div class="muted">Nothing changes in this window: the loop just repeats (read8415, refresh, reg2, reg4 …).</div>';
    let bus='';
    if (R && !R.off && R.spi.length){ let x=null; for (const s of R.spi){ if (s.t0<=t) x=s; else break; } if (x) bus += `last SPI: ${x.kind} @ ${SIM.fmtT(x.t0)} → ${x.bytes.map(b=>'0x'+hx(b)).join(' ')} ${x.kind==='read8415'?'(chip address 0x20 + map 0x10, then 0x21 read: Receiver Error reg, bit 4 = UNLOCK)':'(chip address 0x20 write, map, data)'}<br>`;
      let u=null; for (const s of R.uart){ if (s.t0<=t) u=s; else break; } if (u) bus += `last RS-485 byte: ${u.dir==='tx'?'AMS4 → DEMUX':'DEMUX → AMS4'} 0x${hx(u.b)} b'${bn(u.b)}' @ ${SIM.fmtT(u.t0)} (${SIM.fmtDur(BYTE_T)} per byte)`; }
    m.querySelector('#bus').innerHTML = bus || '—';
    SIM.drawLanes(m.querySelector('#tl'), lanes('full'), {labelW:230}); drawAes(m.querySelector('#aes'), t); };
  SIM.on('time', draw);
}

/* ---------------- tutorial (manual: AMS4 Manual.pdf, 2007|40) ---------------- */
function curMode(){ const t=SIM.t; return rv(t,'mode'); }
function curDisp(){ return dispAt(SIM.t); }
const LESSONS = [
  {title:'1 · Power up', body:`<p>The manual: “On power down, the last selection is stored in memory.” Press <b>Power cycle</b> and press ▶ Play. The display stays blank while the PIC asks the option slot whether a DEMUX is fitted (bytes 0xE8, 0x55 on RS-485). Then it shows the firmware version (“V500”) for about a second, and finally the stored source.</p>`, check:()=> D.base && D.base.boot && SIM.t > (D.run.bootEnd||9), hint:'Power cycle, then play past the version window (≈ 1 s with a DEMUX, ≈ 2.1 s without).'},
  {title:'2 · Pick an analog source', body:`<p>“The MODE switch steps through analog, AES digital and SDI modes while the SOURCE switch selects the input from that group.” Use MODE until the display reads <b>A</b>, then SOURCE until it reads <b>A3</b>.</p>`, check:()=> /A3/.test(curDisp()), hint:'MODE: D → SA → SB → A. SOURCE: A1 → A2 → A3.'},
  {title:'3 · AES with auto-detect', body:`<p>“The AMS4 will automatically detect whether the AES/EBU digital signal is balanced (110 Ohms) or unbalanced (75 Ohms).” Select <b>D2</b>: AES 2 is on the 110 Ω euroblock. Zoom the timeline to 100 ms and watch the 75 Ω and 110 Ω receiver banks swap every 15 passes until the CS8415A locks. Then the D/A crosspoint opens 2560 passes later.</p>`, check:()=> /D2/.test(curDisp()) && sigAt('xptaes',SIM.t,0)===1, hint:'MODE to D, SOURCE to D2, then play ≈ 1.5 s so lock_count opens XPTAES.'},
  {title:'4 · No lock', body:`<p>“In the AES digital and SDI modes, the display will alternate between the source selection and the letters NL, signifying no lock.” Select <b>D3</b> (nothing plugged) and play: the display alternates every 7 × 256 passes (≈ 1 s).</p>`, check:()=> /NL/.test(curDisp()), hint:'D3 has no cable. Play until “NL” shows.'},
  {title:'5 · SDI via the DEMUX-4', body:`<p>With the DEMUX option, MODE goes on to SDI. V5.00 shows <b>SA1…SA8</b> for the plate's “SDI 1 (A)” input (SD1–SD8 in older firmware: 4 groups × 2 pairs). Choose <b>SA3</b> (group 2, pair 1). The DEMUX-4 starts its FPGA ≈ 6 s after power-up ${inf}, so give it an idle period if you just powered on.</p>`, check:()=> /SA3/.test(curDisp()), hint:'Option = DEMUX-4. MODE to SA, SOURCE three times. If it shows NL, click “Idle 30 s”.'},
  {title:'6 · SDI B (V5.00 only)', body:`<p>V5.00 adds a second SDI input. One more MODE press after SA goes to <b>SB</b> (sdiab = 1, tx0 bit 4 = 1). Each input keeps its own source (sourcesa / sourcesb).</p>`, check:()=> /^SB/.test(curDisp()), hint:'Firmware V5.00 + DEMUX-4. MODE from SA.'},
  {title:'7 · Embedded audio missing', body:`<p>“In the SDI mode, a flashing number in the source ID code signifies that embedded audio is absent.” SDI 1 (A) carries groups 1 and 2 only. Select <b>SA5</b> (group 3) and play.</p>`, check:()=> /^SA  /.test(curDisp()) || (/^SA5/.test(curDisp()) && rv(SIM.t,'disctl')&1), hint:'MODE to SA, SOURCE to SA5, play: the 5 blinks.'},
  {title:'8 · External mute', body:`<p>“The EXT MUTE IN requires a closure to ground… the display window will alternate between the selected source ID and the word MUTE. The open collector output EXT MUTE TALLY pin will be activated.” Click the MUTE euroblock on the rear (or press X). Note that the front buttons are ignored while muted.</p>`, check:()=> D.W.mute && sigAt('tally',SIM.t,0)===1, hint:'Rear: MUTE block, or key X.'},
  {title:'9 · Headset', body:`<p>“The speaker feeds are normalled through this jack to automatically mute the speakers when a headset is plugged in.” Open the mute again, then plug the headset (front jack or key H). The signal-path table shows the speakers off.</p>`, check:()=> !D.W.mute && D.W.headset, hint:'Open EXT MUTE (X), then H.'},
  {title:'10 · Phase indicator', body:`<p>The 0°/180° LEDs come from a zero-cross XOR of LEFT and RIGHT, filtered by 20 k / 1 µF and read on RA0. Select <b>A2</b> (right channel inverted) and play ≈ 100 ms: the red 180° LED lights when ADRESH ≥ 100.</p>`, check:()=> /A2/.test(curDisp()) && sigAt('red',SIM.t,0)===1, hint:'MODE to A, SOURCE to A2, play.'},
  {title:'11 · Memory', body:`<p>The selection is not saved when you press. <span class="mono">eewrite</span> waits for 256 × 181 = 46 336 passes (≈ 27 s) after the button is released. Pick a source, click <b>Idle 30 s</b>, then <b>Power cycle</b>: the unit comes back on the same source.</p>`, check:()=> D.base && D.base.boot && D.base.dyn.ee[10]===0xAA && SIM.t>(D.run.bootEnd||9) && dispAt(SIM.t).trim().length>0 && D.log.some(e=>/Idle/.test(e.name)), hint:'Any source → Idle 30 s → Power cycle → play past start-up.'},
];
function viewTutorial(m){
  window[FLAG]=true;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — operating the AMS4 (from the AMS4 manual)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
   <div>${card('The unit', `<div id="fp"></div><div id="rp" style="margin-top:6px"></div><div id="ctl"></div>`)}${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div></div>`;
  let rev=-1;
  const hot=`<g><rect x="425" y="42" width="200" height="82" fill="transparent"><title>SLG2016 4-character display behind the AMS4-009 lens</title></rect><rect x="660" y="125" width="340" height="80" fill="transparent"><title>LM3916 VU bars, −20 … +3</title></rect></g>`;
  const draw=()=>{ const t=SIM.t; if (rev!==D.rev){ rev=D.rev; m.querySelector('#ctl').innerHTML=controlsHTML(); bindControls(m.querySelector('#ctl')); } m.querySelector('#fp').innerHTML=frontSVG(t,{hot}); m.querySelector('#rp').innerHTML=rearSVG(t); bindPanels(m); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx]; let ok=false; try{ ok=!!L.check(); }catch(e){ ok=false; }
    const V=VERS[D.ver]; const warn = V.kind!=='pic' ? `<p class="small" style="color:var(--warn)">The tutorial follows the standard AMS4 (PIC firmware). Switch the firmware back to V5.00 on the Simulator tab.</p>` : '';
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}${warn}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?'✓ Goal reached.':'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); }; m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); }; };
  SIM.on('time', draw);
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  rear:{x:10,y:20,w:150,h:120,t:'AMS4-4 rear terminals',s:['15 × 3-pin euroblock','4 × BNC 75 Ω','H9 12-way → main'],d:'Rear terminal board: analog L/R inputs 1–4 and the line output on euroblocks, AES 1–4 on 110 Ω euroblocks and 75 Ω BNCs, EXT MUTE / TALLY on pins H9-11 / H9-12.'},
  ana:{x:200,y:20,w:170,h:100,t:'Analog crosspoint',s:['8 × 74HC4053 (U1–U8)','XPT1–4 = RC2–RC5','U9/U10 NE5532 −6 dB'],d:'Each input is switched by a pair of 74HC4053s into LEFT±/RIGHT±, then the NE5532 differential receivers U9/U10 make LEFT/RIGHT. XPTn low = input n on the bus. U1/U2 also switch the D/A output (XPTAES on pin 9).'},
  aesrx:{x:200,y:150,w:170,h:110,t:'AES receivers',s:['8 × DS75176 + 4 × PE-65612','~RE: 75 Ω bank RC0','110 Ω bank RA1'],d:'Each AES input has two RS-485 receivers used as AES line receivers: one on the 75 Ω BNC, one behind a PE-65612 transformer on the 110 Ω euroblock. Their outputs are tied together into one CS8415A input; the firmware enables one bank at a time.'},
  rx:{x:410,y:150,w:160,h:110,t:'CS8415A + CS4335',s:['U13 SPI on RB0/1/2/4','reg2 = input select','U18 24-bit DAC (v2.02+)'],d:'The CS8415A receives the selected AES stream (inputs 1–4 from the receivers, 5/6 from the DEMUX on P1) and feeds the CS4335 DAC (24-bit left-justified, reg 6 = 0x80). U11 filters it; RV1/RV2 set 0 VU = −20 dBFS.'},
  pic:{x:410,y:20,w:160,h:110,t:'PIC16F874 (U35)',s:['4.9152 MHz (X2)','≈0.6 ms main loop','EEPROM: last source'],d:'Runs the whole unit from a polled main loop: buttons, display, crosspoints, receiver bank, CS8415A registers, phase ADC, EXT MUTE, EEPROM and the RS-485 link to the DEMUX.'},
  disp:{x:610,y:20,w:170,h:110,t:'AMS4-2 front board',s:['SLG2016 4-char display','2 × LM3916 VU (10 + 10)','MODE/SOURCE, phase LEDs'],d:'H11 20-way ribbon: D0–D6, A0, A1, ~WR, ~BL from the PIC, LEFT_VU/RIGHT_VU from the LF353 rectifiers, PB1/PB2 back, PHASE (RA3) to the 0°/180° LEDs.'},
  phase:{x:610,y:150,w:170,h:110,t:'Phase detector',s:['U37 LM393 zero-cross','U38 74HC00 = XOR','20k/1µF → RA0 (AN0)'],d:'LEFT and RIGHT are squared by the LM393, XOR-ed by four NAND gates and averaged by R118/C132. The PIC reads ADRESH each pass; ≥ 100 (≈ 1.95 V, about 70° average phase difference ' + 'inferred) lights the red 180° LED.'},
  dmx:{x:10,y:170,w:150,h:110,t:'DEMUX option',s:['P5: RS-485 (U36 75176)','P1: 2 AES pairs → U13','DEMUX-1 (2001) / -4 (2013)'],d:'The SDI de-embedder. The PIC probes it at start-up (0xE8 0x55), then sends tx0 = 0xE0 | input | group | pair and tx1 = 0x55 about three times a second; the reply carries video/audio lock.'},
  out:{x:200,y:290,w:170,h:90,t:'Line out',s:['U27/U28 balanced, 30 Ω','rear OUTPUT euroblocks'],d:'Balanced, stereo analog output of the switcher (manual) — the bus +6 dB.'},
  lvl:{x:410,y:290,w:160,h:90,t:'AMS4-3 level/headset',s:['2 × TOCOS dual 10K log','STEREO latch switch','T/R/S jack normals'],d:'Front level board on the H2 16-way ribbon: LEFT/RIGHT knobs, the STEREO switch and the headset jack whose normals carry the speaker feeds.'},
  amp:{x:610,y:290,w:170,h:90,t:'Speakers',s:['3 × TDA2616 → P2/P3/P4','single-rack box + 2 × 1.5"'],d:'Three TDA2616 stereo 12 W amplifiers on ±VA. BOM structure: a single-rack speaker box (1.75 × 4" driver) and two 1.5" full-range drivers on AMS2 tweeter brackets.'},
  psu:{x:10,y:300,w:150,h:80,t:'Power',s:['TE70061 9 V toroid','D1–D4, 2200 µF, LM2596 5 V'],d:'115/230 V via jumpers 110_1/110_2 (0 Ω) or “220” (DNI). Unregulated ±VA for the audio, LM2596 switcher for +5 V.'},
};
const WIRES=[['rear','ana','analog L/R'],['rear','aesrx','AES 75/110'],['aesrx','rx','4 inputs'],['dmx','rx','P1 AES pairs'],['pic','dmx','RS-485'],['pic','ana','XPT1–4'],['pic','aesrx','~RE banks'],['pic','rx','SPI'],['rx','ana','D/A'],['ana','disp','VU'],['ana','phase','LEFT/RIGHT'],['phase','pic','PHASE_V'],['pic','disp','display bus'],['ana','out',''],['ana','lvl','H2'],['lvl','amp','']];
function viewBlock(m){
  off(); let sel='pic';
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${card('Signal flow', `<p>Every input is <b>switched, not mixed</b> (except in the custom c200/c203 builds). Analog sources go straight through 74HC4053 crosspoints. AES sources go through one of two receiver banks to the CS8415A and back out of the CS4335 DAC onto the same bus. The PIC never touches the audio: it only flips select lines and reads lock bits.</p>`)}</div></div>`;
  const draw=()=>{ const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 790 390" style="width:100%"><defs><marker id="ams4ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a], B_=BLOCKS[b]; let [x1,y1]=ctr(A_), [x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x, dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.4:1.2}" marker-end="url(#ams4ar)"/>`; if (l) s+=`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-3}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.4:1.2}"/><text x="${b.x+8}" y="${b.y+19}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+37+i*15}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=> g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`; };
  draw();
}

/* ---------------- schematics (redrawn from AMS4-1ISS5.net) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=24+n*17; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.3"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+20+i*17; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+4}" y="${yy+4}" font-size="10" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x-33}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+20+i*17; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-4}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x+w+33}" y="${yy+4}" font-size="10" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  return s;
}
const SHEETS = [
  {name:'1 · PIC16F874 (U35)', note:'Pin numbers and net names from AMS4-1ISS5.net (P-CAD). Port names follow the PIC16F874 TQFP-44 pin-out and agree with every port the firmware uses.', svg:()=>
    chip(330,50,190,'U35 PIC16F874-04/PT',[
      ['8 RB0','8415OUT (U13-1)'],['9 RB1','8415IN (U13-27)'],['10 RB2','CS8415 (U13-2)'],['14 RB4','CLK8415 (U13-28)'],['15 RB5','RESET (U13-9)'],['16 RB6','PB2 SOURCE (H10-4)'],['17 RB7','PB1 MODE (H10-2)'],['19 RA0/AN0','PHASE_V (R118/C132)'],['20 RA1','AES110 (U14–U17 ~RE)'],['21 RA2','XPTAES (U1/U2 pin 9)'],['22 RA3','PHASE (H11-12)'],['23 RA4','EXT_MUTE in (R126)'],['24 RA5','TALLY → Q1 (R123)'],['30/31 OSC','X2 4.9152 MHz'],['18 MCLR','D10 / H10-3'],
    ],[
      ['32 RC0','AES75 (U19/U22–U24 ~RE)'],['35 RC1','U36 DE/~RE (RS-485)'],['43 RC2','XPT1'],['42 RC3','XPT2'],['37 RC4','XPT3'],['36 RC5','XPT4'],['44 RC6/TX','U36-4 DI'],['1 RC7/RX','U36-1 RO'],['38–41 RD0–3','D0–D3 (H11-4..7)'],['2–4 RD4–6','D4–D6 (H11-8..10)'],['5 RD7','~BL (H11-11)'],['25 RE0','A0 (H11-2)'],['26 RE1','A1 (H11-3)'],['27 RE2','~WR (H11-1)'],
    ],'TQFP-44 · MPASM · /c- (case-insensitive)') },
  {name:'2 · AES inputs and D/A', note:'Receivers, CS8415A and CS4335 from the netlist. Which CS8415A pin is RXP1…RXP6 is inferred from the firmware constants (digital 1 → s3, 2 → s4, 3 → s1, 4 → s2; DEMUX pairs → s5/s6), since the CS8415A datasheet is not in the archive.', svg:()=>{
    let s=''; for (let i=0;i<4;i++){ const y=60+i*85; s+=`<text x="20" y="${y}" font-size="11" fill="var(--ink)">AES ${i+1} 75 Ω BNC</text><text x="20" y="${y+34}" font-size="11" fill="var(--ink)">AES ${i+1} 110 Ω (T${i+1} PE-65612)</text>
      <rect x="170" y="${y-14}" width="70" height="22" fill="var(--panel2)" stroke="var(--ink)"/><text x="205" y="${y+1}" font-size="10" text-anchor="middle" fill="var(--ink)">${['U19','U22','U23','U24'][i]} 75176</text>
      <rect x="170" y="${y+20}" width="70" height="22" fill="var(--panel2)" stroke="var(--ink)"/><text x="205" y="${y+35}" font-size="10" text-anchor="middle" fill="var(--ink)">${['U14','U15','U16','U17'][i]} 75176</text>
      <text x="245" y="${y-8}" font-size="9.5" fill="var(--accent2)">~RE=AES75</text><text x="245" y="${y+46}" font-size="9.5" fill="var(--accent2)">~RE=AES110</text>
      <path d="M240 ${y-3} H300 V${y+17} H330 M240 ${y+31} H300 V${y+17}" fill="none" stroke="var(--ink)"/><text x="334" y="${y+21}" font-size="10" fill="var(--ink)">U13-${12+i} (${['s3','s4','s1','s2'][i]})</text>`; }
    s += chip(520,70,150,'U13 CS8415A',[['12–15','receivers 1–4'],['25/26','P1 DEMUX AES (s5/s6)'],['1/27/2/28','SPI ↔ U35'],['9','RESET ← RB5']],[['16/17/18/10','→ U18 CS4335'],['8','FILT R27/C61']],'AES3 receiver')
      + chip(720,200,100,'U18 CS4335',[['1–4','from U13']],[['5/8','→ U11 → RV1/RV2']],'24-bit DAC');
    return s; } },
  {name:'3 · Analog crosspoint and outputs', note:'One channel shown. The bus is LEFT+/LEFT− into U9 (R17/R19 20k, R18 10k → −6 dB). D/A_LEFT joins through R23 1k into U1 (XPTAES). Line out U28 with R69/R75 30 Ω; U29 feeds the AMS4-3 level board on H2-2/H2-6.', svg:()=>{
    let s=''; for (let i=0;i<4;i++){ const y=50+i*60; s+=`<text x="20" y="${y+4}" font-size="11" fill="var(--ink)">ANALOG ${i+1} L+ / L− (H${5+i}, R 20k)</text><rect x="230" y="${y-14}" width="90" height="28" fill="var(--panel2)" stroke="var(--ink)"/><text x="275" y="${y+4}" font-size="10" text-anchor="middle" fill="var(--ink)">${['U1','U3','U5','U7'][i]} 74HC4053</text><text x="330" y="${y-4}" font-size="9.5" fill="var(--accent2)">A/B = XPT${i+1}</text><line x1="320" y1="${y}" x2="420" y2="${y}" stroke="var(--ink)"/>`; }
    s+=`<text x="20" y="300" font-size="11" fill="var(--ink)">D/A_LEFT (U11, RV1) → R23 1k → U1 C-switch (pin 9 = XPTAES)</text><line x1="420" y1="40" x2="420" y2="300" stroke="var(--ink)" stroke-width="2"/><text x="426" y="170" font-size="10" fill="var(--accent2)">LEFT+ / LEFT−</text>`;
    s += chip(500,110,110,'U9 NE5532',[['2','LEFT+'],['6','LEFT−']],[['7','LEFT']],'diff. receiver −6 dB') + chip(700,60,110,'U28',[['5','LEFT']],[['1/7','OUTPUT L (30 Ω)']],'line out') + chip(700,200,110,'U25 LF353',[['RV3','PEAK_L']],[['1','LEFT_VU → H11-13']],'rectifier, 1M/0.047µ');
    return s; } },
  {name:'4 · Front board, phase and mute', note:'H11 to the AMS4-2 board (SLG2016, 2 × LM3916, 15 green + 7 red LEDs per the BOM structure), the LM393/74HC00 phase detector and the EXT MUTE / TALLY pair on H9.', svg:()=>
    chip(80,50,170,'H11 → AMS4-2',[['1','~WR'],['2/3','A0 / A1'],['4–10','D0–D6'],['11','~BL'],['12','PHASE'],['13/14','LEFT_VU / RIGHT_VU'],['15/16','PB1 / PB2'],['17/18','+5 via L3'],['19/20','GND']],[],'20-way ribbon')
    + chip(420,50,150,'U37 LM393',[['3','LEFT via R115 20k, C131 6n8'],['5','RIGHT via R114, C130']],[['1/7','→ U38']],'zero-cross')
    + chip(420,170,150,'U38 74HC00',[['1/2/4/5','four NANDs']],[['11','XOR → R118 20k']],'XOR') + `<text x="420" y="300" font-size="11" fill="var(--ink)">R118 20k + C132 1µF → PHASE_V → RA0 (AN0), threshold ADRESH ≥ 100</text>`
    + chip(420,330,150,'Q1 2N4401',[['B','RA5 via R123 10k']],[['C','R124 10 Ω → H9-12 TALLY']],'open collector') + `<text x="80" y="330" font-size="11" fill="var(--ink)">EXT_MUTE (H9-11) → R125/R126 10k → RA4</text>` },
  {name:'5 · DEMUX link, connectors, power', note:'U36 DS75176 is the half-duplex RS-485 to the DEMUX on P5 (DE and ~RE both on RC1). P1 brings two AES pairs from the DEMUX into the CS8415A. Power: TE70061, D1–D4, REG1 LM2596.', svg:()=>
    chip(100,60,150,'U36 DS75176',[['1 RO','→ RC7/RX'],['2/3 ~RE/DE','← RC1'],['4 DI','← RC6/TX']],[['6/7 A/B','P5-1/2 (R110/R111)']],'RS-485 9600 8N1')
    + chip(100,220,150,'P1 (3-way)',[['1','U13-26 (R135 110 Ω)'],['2','U13-25 (R136 110 Ω)'],['3','GND']],[],'DEMUX AES pairs')
    + chip(520,60,170,'T10 TE70061',[['1/4','ACIN via 110_1/110_2 0 Ω'],['2/3','“220” DNI (230 V)']],[['5/8','D1–D4 → ±VA']],'9 V 2.75 A toroid')
    + chip(520,220,170,'REG1 LM2596',[['1','+VA'],['2','L1 PE-53823, D9 SK33']],[['4','5VOLTS → L2/L3']],'5 V switcher') },
];
function viewSchem(m){
  off(); let i=0;
  m.innerHTML = card('Schematic set — redrawn from the P-CAD netlist, not the original CAD drawings', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
   <p class="small muted">The original drawings are <span class="mono">AMS4 - #Engineering/AMS4-1/AMS4-1 pg 1–5.pdf</span> (CorelDRAW 10 exports by Tim Clarke, 2008|41, no text layer) and <span class="mono">PCB/AMS4-1ISS5.sch</span>. These sheets use the net names in <span class="mono">AMS4-1ISS5.net</span>. Blue labels are nets.</p>`);
  const draw=()=>{ m.querySelector('#tabs2').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=> b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 460" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="848" height="448" fill="none" stroke="var(--line)"/><text x="840" y="446" text-anchor="end" font-size="10" fill="var(--ink2)">AMS4-1 ISS5 · sheet ${i+1}/${SHEETS.length} · redrawn 2026|59</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent=SHEETS[i].note; };
  draw();
}

/* ---------------- software ---------------- */
function viewSoft(m){
  window[FLAG]=true;
  m.innerHTML = `<div class="grid2">${card('PIC main loop — the box lit up is running at the playhead', `<div id="flow"></div>`)}
   <div>${card('MODE state machine (sw_mode)', `<div id="fsm"></div>`)}${card('lock_count — when the D/A crosspoint may open', `<div id="lk"></div>`)}</div></div>
   <div class="grid2">${card('How the buttons did things', `<div id="btn"></div>`)}${card('Register and protocol maps (live)', `<div id="maps"></div>`)}</div>
   <div class="grid2">${card('Version differences', `<div id="vers"></div>`)}${card('Cycle budget of this window (hand count, inferred)', `<div id="budget"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t, R=D.run, V=VERS[D.ver]; if (!R) return;
    const p=passAt(t); let cur=-1, bootSeg=null;
    if (!R.off && inBoot(t)) bootSeg=R.boot.find(b=>t>=b.t0&&t<b.t1);
    else if (p>=0){ const c=(t-R.pt[p])/TCY; R.st[p].forEach((v,k)=>{ if (v>=0 && v<=c) cur=k; }); }
    let s=`<svg viewBox="0 0 540 ${NST*25+120}" style="width:100%">`;
    const bootNames=['INIT','program: pdelay1','program1: SDI check','opening_window','translate · reg1…reg17'], bootKeys=['INIT','program:','program1','opening_window','translate'];
    bootNames.forEach((b,j)=>{ const on=bootSeg && bootSeg.name.startsWith(bootKeys[j]); s+=`<rect x="${10+j*104}" y="6" width="98" height="22" rx="5" fill="${on?'var(--warn)':'var(--chip)'}" stroke="var(--line)"/><text x="${59+j*104}" y="21" font-size="9.5" text-anchor="middle" fill="${on?'#fff':'var(--ink)'}">${b}</text>`; });
    STEPS.forEach((st,k)=>{ const y=40+k*25, on=k===cur, ex = p>=0 && R.st[p][k]>=0; s+=`<rect x="40" y="${y}" width="460" height="21" rx="4" fill="${on?'var(--accent)':ex?'var(--panel2)':'transparent'}" stroke="var(--line)" ${ex?'':'stroke-dasharray="3 3"'}/><text x="48" y="${y+15}" font-size="11" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${st[0]}</text><text x="250" y="${y+15}" font-size="10" fill="${on?'#eef':'var(--ink2)'}">${st[1]}</text>`; if (k===20) s+=`<text x="506" y="${y+15}" font-size="10" fill="var(--ink2)">→ main if 0</text>`; });
    s+=`<path d="M500 ${40+NST*25-10} h18 V45 h-18" fill="none" stroke="var(--ink2)"/><text x="40" y="${60+NST*25}" font-size="10.5" fill="var(--ink2)">${V.kind==='ams4n'?'AMS4N: no display, mode or DEMUX steps (dashed = not in this build)':'Dashed = skipped this pass; 21–28 need comout,0 (DEMUX found).'}</text></svg>`;
    m.querySelector('#flow').innerHTML=s;
    // FSM
    const mode = R.off||p<0? 0 : R.rv[p][RI.mode], ab = R.off||p<0?0:R.rv[p][RI.sdiab]&1;
    const nodes = [['A','ANALOG A1–A4',mode&1], ['D','AES D1–D4',mode&2], ['SA', V.ab?'SDI A SA1–SA8':'SDI SD1–SD8', (mode&4)&&!ab], ...(V.ab?[['SB','SDI B SB1–SB8',(mode&4)&&ab]]:[])];
    let f=`<svg viewBox="0 0 520 150" style="width:100%">`; nodes.forEach((n,i)=>{ const x=20+i*125; f+=`<rect x="${x}" y="30" width="105" height="44" rx="10" fill="${n[2]?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+52}" y="50" text-anchor="middle" font-size="13" font-weight="700" fill="${n[2]?'#fff':'var(--ink)'}">${n[0]}</text><text x="${x+52}" y="66" text-anchor="middle" font-size="9.5" fill="${n[2]?'#eef':'var(--ink2)'}">${n[1]}</text>`; if (i<nodes.length-1) f+=`<line x1="${x+105}" y1="52" x2="${x+125}" y2="52" stroke="var(--ink2)" marker-end="url(#ams4ar2)"/>`; });
    f+=`<defs><marker id="ams4ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs><path d="M${20+(nodes.length-1)*125+52} 74 V110 H72 V78" fill="none" stroke="var(--ink2)" marker-end="url(#ams4ar2)"/><text x="80" y="128" font-size="10" fill="var(--ink2)">${V.ab?'back_to_analog (sdiab ← 0)':'back_to_analog'} · no DEMUX: A ↔ D${V.analogOnly?' · c203: always A':''}${V.modeOff?' · c200: MODE pin not read':''}</text></svg>`;
    m.querySelector('#fsm').innerHTML=f;
    // lock_count
    const ifl = R.off||p<0?0:R.rv[p][RI.input_flag], dc = R.off||p<0?0:R.rv[p][RI.disctl];
    const st = (ifl&0x80)? ((dc&4)?1:0) : ((ifl&0x20)?2:3);
    const ls=[['refresh → lock','lock_counter × lock_counter1 = 256 × 10 passes in lock'],['refresh → unlock','lock_counter2 × 3 = 256 × 4 passes unlocked'],['regular: locked','XPTAES on (digital_norm); loss → bsf xptaes at once'],['regular: unlocked','XPTAES off (disctl,3); lock → bcf xptaes, refresh']];
    m.querySelector('#lk').innerHTML = `<svg viewBox="0 0 520 120" style="width:100%">${ls.map((l,i)=>`<rect x="${10+(i%2)*255}" y="${10+Math.floor(i/2)*55}" width="245" height="46" rx="8" fill="${i===st?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${20+(i%2)*255}" y="${29+Math.floor(i/2)*55}" font-size="12" font-weight="700" fill="${i===st?'#fff':'var(--ink)'}">${l[0]}</text><text x="${20+(i%2)*255}" y="${45+Math.floor(i/2)*55}" font-size="9.5" fill="${i===st?'#eef':'var(--ink2)'}">${l[1]}</text>`).join('')}</svg><p class="small">Analog sources skip this: output_control drives XPT1–4 directly. Any button press goes through <span class="mono">unlock_source</span> first, so a digital source is always heard ≈ ${(2560*0.58/1000).toFixed(1)} s after it locks.</p>`;
    // buttons
    const P=PINS[V.pins];
    m.querySelector('#btn').innerHTML = `<table class="kv small">
      <tr><th>MODE</th><td>${P.mode} low → <span class="mono">input_routine</span> (input,1) → <span class="mono">debounce</span> (10 equal passes, ≈ 6 ms) → <span class="mono">display_setup</span> → <span class="mono">sw_mode</span> (rlf mode / ${V.ab?'check_sdi_ab / ':''}back_to_analog / no_sdi) → <span class="mono">unlock_source</span> → mode routine writes dis0–3 → <span class="mono">refresh</span> → <span class="mono">output_control</span> → <span class="mono">digital_output</span> (cs8415reg2) → <span class="mono">reg2</span> SPI. DEMUX: txflags,0 → 50 passes → <span class="mono">settxdata</span>/<span class="mono">txuart</span>.</td></tr>
      <tr><th>SOURCE</th><td>${P.src} low → input,2 → <span class="mono">sw_source</span>: rlf sourcea / sourced (wrap at 4) or sources (wrap at 8).</td></tr>
      <tr><th>release</th><td>debounce release → press_flag,2 → <span class="mono">eewrite</span> counts rem2 (256) × rem4 (75 → 256) = 46 336 passes, then <span class="mono">eew</span> to addresses 0${V.ab?', 1':''}, 10.</td></tr>
      <tr><th>EXT MUTE</th><td>${P.mute} low → <span class="mono">mute_check</span>: mute_flag, ${P.tally} high, crosspoints opened by <span class="mono">output_control</span>, MUTE alternates via lockflash6–11; <span class="mono">input_routine</span> returns at once (buttons dead).</td></tr></table>`;
    // maps
    const r = R.off||p<0? null : R.rv[p];
    const tx0 = r? r[RI.tx0] : 0, ee = r? r[RI.ee_data] : 0;
    m.querySelector('#maps').innerHTML = `<table class="kv small">
      <tr><th>CS8415A writes</th><td class="mono">reg1 0x00 · reg2 0x${hx(r?r[RI.reg2]:0x40)} (0x40 | input: s1 0x41 … s6 0x46) · reg4 0x41 (“def”; “stop” 0x01 never used) · reg6 0x${hx(V.reg6||0x80)} ${V.reg6===0xA8?'(16-bit right-justified, pre-CS4335 ' + 'inferred)':'(24-bit left-justified master for the CS4335 ' + 'inferred from the v2.02 note)'} · reg17 0x${hx(V.reg17||0x1F)}</td></tr>
      <tr><th>CS8415A read</th><td class="mono">0x20 0x10 | 0x21 → reg 16 (receiver error), bit 4 → cs8415_16,0 (UNLOCK)</td></tr>
      <tr><th>RS-485 tx0</th><td class="mono">b'${bn(tx0)}' = 1 1 1 [bit4 ${V.ab?'sdiab → DEMUX-4 input':'mode,2'}] 0 [group ${(tx0>>1)&3}] [pair ${tx0&1}] · tx1 = 0x55 “level byte” (fixed)</td></tr>
      <tr><th>RS-485 reply</th><td class="mono">uart0 b'${bn(r?r[RI.uart0]:0)}': bit1 = video unlocked · bits 2/3 = ch1/2 audio missing (odd sources) · bits 4/5 = ch3/4 (even)${V.lockSrc==='gennum'?' · v2.00 uses bit0 (“audio lock gennum”)':''}</td></tr>
      <tr><th>EEPROM</th><td class="mono">[0] ee_data b'${bn(ee)}' = 75/110 ${ee>>7&1} · mode ${(ee>>5)&3} (00 A, 01 D, 10 SDI) · *2 ${(ee>>4)&1} · port b'${bn(ee&15,4)}'${V.ab?' · [1] sdiab':''} · [10] 0xAA “first time detect”</td></tr>
      <tr><th>Display</th><td class="mono">charX = 0x80 | ASCII: bit 7 sits on RD7 = ~BL, so writing any character un-blanks the SLG2016 (charblank = 0xA0)</td></tr></table>`;
    // versions
    m.querySelector('#vers').innerHTML = `<table class="kv small"><tr><th>build</th><th>what changed (source)</th></tr>
      <tr><td>v1.00/1.01</td><td>PIC16C73A, issue 1–3 boards (ARCHIVE_iss1_3PCB/PROGRAM) — not simulated</td></tr>
      <tr><td>v2.00</td><td>issue-4 PCB, DEMUX-1, SDI check, AES auto-detect; buttons RA5/RA4, mute RB7, tally RB6; SDI audio on RXP0; reg6 0xA8; reg17 0x10</td></tr>
      <tr><td>v2.01</td><td>odd/even pair lock from reply bits 2–5 (read,0); reg17 0x1F</td></tr>
      <tr><td>v2.02</td><td>CS4335: reg6 0x80; split into init/mode/ee_data.asm; buttons RB7/RB6, mute RA4/RA5 — but INIT still clears RB6 (tally stays on)</td></tr>
      <tr><td>v2.03</td><td>“bcf PORTa,5” in INIT; SDI audio on RXP5/RXP6 by odd/even source; “Used for AMS4 issue 5”</td></tr>
      <tr><td>c203 / c200</td><td>2003 / 2007 customs: A1 mixed under the selected analog input; c203 always analog; c200 ignores MODE</td></tr>
      <tr><td>AMS4N v1.00</td><td>2005, NBC: four buttons on RB7, RB6, RD2, RD3; AES n if locked, else analog n; no display</td></tr>
      <tr><td>V5.00</td><td>“Ali-Add”: sdiab, sourcesa/sourcesb, check_sdi_ab, EEPROM addr 1, tx0 bit 4 = sdiab, display S A/B n, version “V500”</td></tr>
      <tr><td>AMS4E</td><td>2004 ATmega128 @ 4.9152 MHz, ICCAVR 6.30B: Optrex 16×2 LCD, AUDIO and VOLUME encoders, UART0 to a Dolby board; became the AMS8E line</td></tr></table>`;
    // budget
    if (!R.off && R.pt.length){ const sum=new Array(NST).fill(0); let n=0; R.st.forEach((st,i)=>{ n++; const ix=st.map((v,k)=>[v,k]).filter(a=>a[0]>=0); ix.forEach(([v,k],j)=>{ const e= j+1<ix.length? ix[j+1][0] : Math.round((R.pe[i]-R.pt[i])/TCY); sum[k]+=e-v; }); });
      const tot=sum.reduce((a,b)=>a+b,0)/n; m.querySelector('#budget').innerHTML = `<p class="small">Average pass: <b>${tot.toFixed(0)} cycles = ${(tot*TCY*1e6).toFixed(0)} µs</b> over ${n.toLocaleString()} passes.</p><table class="kv small">${STEPS.map((s,k)=>sum[k]?`<tr><td class="mono">${s[0]}</td><td class="mono">${(sum[k]/n).toFixed(1)}</td><td><div style="height:8px;background:var(--accent);width:${(sum[k]/n/tot*300).toFixed(0)}px"></div></td></tr>`:'').join('')}</table>`; }
    else m.querySelector('#budget').innerHTML='<p class="muted">No passes in this window.</p>';
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  off();
  m.innerHTML = card('What the AMS4 is up to — findings from the source', `<ol>
   <li><b>The PIC runs at 4.9152 MHz, not 4 MHz.</b> X2 (BOM “S1-4M9152”) sits on OSC1/OSC2 (U35 pins 30/31 in <span class="mono">AMS4-1ISS5.net</span>). The MPLAB project says <span class="mono">Frequency=4000000</span>, but INIT sets <span class="mono">SPBRG = 7</span> with BRGH = 0 and comments “set 9600 baud”. That is 9600 only at 4.9152 MHz (7812.5 at 4 MHz). The AMA4 plugin assumed 4 MHz.</li>
   <li><b>V5.00 hides in a file called ams1v203.asm.</b> The header still ends at “version 2.03”. The only marks are <span class="mono">;Ali-Add</span>/<span class="mono">;Ali-Rem</span> comments and the version characters (‘5’,‘0’,‘0’). Project <span class="mono">AMS4v500.mcp</span> is dated 2010-08-16|43, the source 2014-02-20|47.</li>
   <li><b>V5.00 exists for the DEMUX-4's two SDI inputs.</b> <span class="mono">settxdata</span> now sets tx0 bit 4 from <span class="mono">sdiab</span> (it was <span class="mono">mode,2</span>). DEMUX-4 <span class="mono">V020102-AMS4/demux4.c</span> reads that bit as <span class="mono">input_select1</span> and does <span class="mono">if (input_select1) input = RX1; else input = RX2;</span> (“swap RX1 with RX2”). The adapter-plate photo lists SDI 1 (A), SDI 2 (B), SDI OUT, AES 1, AES 2, which is the board's BNC2, BNC1, BNC3… order reversed. So “SA” → RX2 → the plate's SDI 1 (A): the swap makes the labels right ${inf} (BNC order taken from the DEMUX-4 board layout).</li>
   <li><b>ee_data bit 7 is the AES termination, and it is global.</b> 0 = 75 Ω: <span class="mono">PORTC,0</span> low enables the ~RE of U19/U22/U23/U24. 1 = 110 Ω: <span class="mono">PORTA,1</span> low enables U14–U17. One bit covers all four inputs and is saved in EEPROM. INIT always starts on 75 Ω whatever the EEPROM says, so a unit saved on 110 Ω needs 30 passes to find it again. (The AMA4 plugin has this bit the other way round.)</li>
   <li><b>Auto-detect flips the receiver banks about 115 times a second</b> while a digital input is unlocked: every 15 passes (≈ 9 ms) <span class="mono">auto_detect</span> XORs ee_data,7. The CS8415A has to lock inside that window, or the search never stops. With cables on both connectors of one input, the bank in use at that moment wins (the manual's “random selection”).</li>
   <li><b>Leaving SDI mode turns both AES banks off.</b> <span class="mono">sdi_output</span> sets PORTC,0 and PORTA,1 high. Nothing turns them back on until <span class="mono">auto_detect</span> gives up after 15 unlocked passes, so the first AES source after SDI is found one bank-flip late.</li>
   <li><b>In SDI mode the CS8415A's own UNLOCK is read, then thrown away.</b> <span class="mono">check_sdi_lock</span> copies cs8415_16 into disctl,0 and then <span class="mono">sig_lock1</span>/<span class="mono">no_lock1</span> overwrite it from the DEMUX reply. <span class="mono">no_lock1</span> needs two misses in a row (lock,0). <span class="mono">bcount3</span> is written and never read. The comments “odd number source / then it is even” are swapped against the code.</li>
   <li><b>The save is late and cumulative.</b> <span class="mono">eewrite</span> waits for rem2 × rem4 = 256 × 181 = 46 336 passes (≈ 27 s) after a release. The counters are not reset by a new press, so a second press continues the countdown. V5.00 writes three bytes; each <span class="mono">eew</span> busy-waits for the previous one (≈ 8 ms main-loop stall ${inf}).</li>
   <li><b>“ENABLE PORT B WEAK PULL-UPS” disables them.</b> <span class="mono">BsF OPTION_REG,7</span> sets RBPU, which turns the pull-ups off. The buttons work because the board has 10k pull-ups (R120/R122 on PB1/PB2).</li>
   <li><b>The display blank line is bit 7 of every character.</b> All <span class="mono">charX</span> constants are 0x80 | ASCII and RD7 drives ~BL (H11-11). INIT's <span class="mono">bcf portd,7</span> keeps the SLG2016 dark until the first <span class="mono">refresh</span>, so the display stays blank during the whole SDI check.</li>
   <li><b>A0/A1 macros versus their comments.</b> <span class="mono">address1</span> sets A1 = 1, A0 = 0 and <span class="mono">address2</span> the reverse, while the comments say the opposite. The netlist has RE0 = A0, RE1 = A1. For the photo's “D1” to read correctly, the AMS4-2 board must cross A0/A1 ${inf}.</li>
   <li><b>Start-up without a DEMUX takes about 2 s.</b> <span class="mono">program1</span> sends 0xE8 0x55 ten times. The first timeout is 6 × 256 loop passes, later ones 26 × 256 (≈ 135 ms ${inf}). That is ≈ 1.1 s of blank display, then “V500” for 25 600 refreshes (≈ 0.9 s).</li>
   <li><b>“take 8415 out of reset” does nothing.</b> INIT already wrote PORTB = 0xFF, so RB5 (RESET → U13-9) has been high since INIT. The later <span class="mono">bSf PORTB,5</span> changes nothing.</li>
   <li><b>v2.02 left the tally on.</b> The issue-5 board moved EXT MUTE to RA4 and the tally to RA5. v2.02's INIT still cleared PORTB,6 (the issue-4 tally), and PORTA ← b'11110111' set RA5. The tally stayed active from power-up until the first mute/un-mute. v2.03 adds <span class="mono">bcf PORTa,5</span>.</li>
   <li><b>v2.03's “SDI input needed to be changed as on the PCB”.</b> v2.00–v2.02 route SDI audio to CS8415A input 0 (<span class="mono">cs8415reg2def</span>). v2.03 picks <span class="mono">cs8415reg2s5</span> for odd sources and <span class="mono">s6</span> for even ones. Those match P1 (the DEMUX's two AES pairs) on U13 pins 25/26 of the issue-5 netlist.</li>
   <li><b>The DAC change is one register.</b> v2.02 changes <span class="mono">cs8415reg6def</span> from 0xA8 to 0x80. Read as the CS8415A serial-output format register, that is 16-bit right-justified → 24-bit left-justified, exactly the “CS4335 (24-bit, left-justified)” note ${inf} (the datasheet is not in the archive).</li>
   <li><b>Case-insensitive on purpose.</b> <span class="mono">mute_analog</span> uses charM/charU/charT and <span class="mono">mute_sdi</span> uses charm/charu/chart/chare. Only lower-case charm/charu/chart and upper-case charE exist. It assembles only because every .mcp passes <span class="mono">/c-</span>.</li>
   <li><b>Leftover comments from other products.</b> TRISE says “E2=AUD1 LED, E1=AUD2 LED, E0=ERROR LED” (the pins are the display's ~WR/A1/A0). PORTA says “rd,wr,a3,a2,a2,a1,a0”. The UART block describes “level 0–90, high-pass filter, 600 R” fields that the AMS4 never sends: tx1 is always 0x55.</li>
   <li><b>Dead code.</b> <span class="mono">refresh8415</span> (“registers 1–6, 9 and 17”) is never called and has no return, so it would fall into <span class="mono">reg1</span>. <span class="mono">cs8415reg1mute</span>, <span class="mono">reg2off</span>, <span class="mono">reg2mute</span>, <span class="mono">reg4stop</span>, <span class="mono">cs8415reg3/reg9</span> and v2.00's <span class="mono">lock_num3</span> are unused.</li>
   <li><b>EXT MUTE locks the front panel.</b> <span class="mono">input_routine</span> returns at once while mute_flag is set, so MODE and SOURCE do nothing during a mute. The manual doesn't say so.</li>
   <li><b>The DEMUX is polled about three times a second.</b> <span class="mono">pole</span> counts 2 × 256 passes and <span class="mono">communication_control</span> another 50 before each command: ≈ 0.37 s. With no reply, <span class="mono">loss_of_com</span> resends after 26 × 256 passes (≈ 4 s). (The DEMUX-4 plugin guessed 100 ms.)</li>
   <li><b>The phase meter is a 1-bit correlator.</b> LM393 zero-cross comparators → 74HC00 wired as XOR → 20k/1µF → AN0. Red when ADRESH ≥ 100, i.e. the XOR is high ≥ 39 % of the time (≈ 70° average phase difference ${inf}). A one-sided (L-only) or uncorrelated signal also reads red.</li>
   <li><b>Digital inputs are wired out of order.</b> <span class="mono">digital_output</span> maps D1 → cs8415reg2s3, D2 → s4, D3 → s1, D4 → s2.</li>
   <li><b>AMS4N's lock LED is inverted half the time.</b> In <span class="mono">lock_count</span>, <span class="mono">locked</span> sets RD1 (“aes lock led”) and <span class="mono">unlock</span> clears it, but <span class="mono">regular_mode</span> sets it when lock is lost and <span class="mono">reg_unlocked</span> clears it when lock returns. Its four buttons use RE2/RE0/RE1/RD0 LEDs, the very pins the AMS4 uses for the display.</li>
   <li><b>Custom builds.</b> c200 (2007|40) comments out the MODE pin read and keeps XPT1 closed under A2–A4. c203 (2003|36) forces analog mode, shows “A1 n”, and tries the SDI check 11 times instead of 10.</li>
   <li><b>AMS4E.</b> The ATmega128 prototype (“AMS4 DOLBY V2.00”) has <span class="mono">wait_ms()</span> “this loop equals one ms” as 100 × WDR(). At 4.9152 MHz that is ≈ 0.1 ms ${inf}, so the 1 s opening window is really about 0.1 s.</li>
   <li><b>Meter LEDs.</b> The AMS4-2 netlist calls 21 LEDs “GR” and one “RD”. The BOM structure buys 15 green + 7 red: 7 green + 3 red per bar, plus the green 0° and red 180° LEDs.</li>
   <li><b>Archive.</b> AMS4-1…AMS4-5 and their “#OBSOLETE” twins are byte-identical. <span class="mono">SOFTWARE - PIC VERSIONS</span> holds only .ERR/.$$$ residue. Front ISS 7 (2015-10-13|48) is “new redesign for single speaker box”. Rear ISS 7 (2016-06-24|49) changes detail B to the universal adapter plate. The DEMUX4 adapter plate was drawn 2013-07-10|46 in directory AMS8/AMS82.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
   <li>Cycle counts per routine are hand counts of the MPASM source (${inf}). They give a ≈ 0.58 ms pass; every firmware delay is a pass count, so all times scale with this.</li>
   <li>CS8415A lock 3 ms after its input changes; DEMUX re-lock 50 ms after a new command; DEMUX-1 reply format and 1 ms delay; DEMUX-4 FPGA ready 5.94 s after power-up (from demux4.js) (${inf}).</li>
   <li>Power-up timer 72 ms; EEPROM write 4 ms (${inf}: config bits and timings are not in the source).</li>
   <li>Levels: bus = input −6 dB, line out = input; 0 VU = +4 dBu / −20 dBFS (manual); speaker pad and TDA2616 gain ${inf}. Test tones on every input.</li>
   <li>v2.00/v2.01 run on the issue-4 pin map their source uses. v2.02 runs on the issue-5 board, where RXP0 has no DEMUX signal (${inf} from the v2.03 note).</li>
   <li>The AMS4N panel layout and the AMS4E panel/LCD placement are ${inf}; the AMS4E is a UI-level model only.</li></ul>`) + card('Sources', `<ul class="small mono">
   <li>AMS4 - #Master/AMS4 - #Engineering/AMS4 - #SOFTWARE #PIC/ (#V050000/Ams4v500, #v203, #v202, #v201, #v200, #Custom/#c200, #c203, #test)</li>
   <li>…/AMS4N - Custom for NBC/Software/v100/ams4nv0.asm · …/AMS4E/Software/Ams4e-1/working/ams4e.c</li>
   <li>…/AMS4-1/PCB/AMS4-1ISS5.net, .bom · AMS4-2/-3/-4 ISS4 and AMS4-6 nets · A-AMS4 BOM Structure.pdf</li>
   <li>…/AMS4 & AMS4N - #ARTWORK #DA #2016/PDF\`s/AMS4-FRONT&amp;REAR-SILK(CURVE).pdf → assets/ams4-front-green.png, ams4-front-white.png, ams4-rear-white.png</li>
   <li>…/AMS4 - #Engineering/MECHANICAL /AMS4-FRONT ISS 7, AMS4-REAR ISS 7, DEMUX 4-REAR (ADAPTOR PLATE ) ISS 1, DEMUX4-COVER ISS 1 (PDF)</li>
   <li>…/Pics/AMS4 Front.jpg, AMS4 Rear with Demux 4 (NEW).jpg · Ams4 - #manual #Obsolete/AMS4 #OBSOLETEManual/AMS4 Manual.pdf</li>
   <li>SA-DEMUX4 - #Master/DEMUX4 - #Engineering/Software/Atmel/V020102-AMS4/demux4.c, common.h</li></ul>`);
}

/* ---------------- register ---------------- */
SIM.register({
  id: ID,
  name: 'AMS4 · 4-input audio monitor switcher (2002|35)',
  product: 'AMS4', year: 2002,
  folder: 'AMS4 - #Master', family: 'Monitors, meters & tools',
  summary: '1RU monitor: four stereo analog and four AES inputs (75 Ω or 110 Ω, found automatically), an optional SDI de-embedder, a 10-LED stereo VU meter with phase indicator, speakers and a headset jack. A PIC16F874 runs it from a polled main loop; this model replays that loop pass by pass for every firmware version from v2.00 to V5.00, plus the AMS4N and AMS4E variants.',
  highlights: ['Real silkscreen front and rear, clickable', 'Pass-by-pass port of the PIC firmware (V5.00 default)', 'AES 75/110 Ω auto-detect and the 1.5 s crosspoint delay', 'RS-485 link to the DEMUX-1 / DEMUX-4 with SDI A/B', 'Version selector: v2.00 … V5.00, c200, c203, AMS4N, AMS4E', '11-step operator tutorial from the manual'],
  depth: 'Full model',
  duration: DUR,
  stepUnits: [
    {label:'1 main-loop pass', period:()=>{ const R=D.run; if (R && R.pt.length>2){ const i=Math.max(1,passAt(SIM.t)); return R.pe[i]-R.pt[i]; } return 0.00058; }},
    {label:'1 RS-485 byte (1.04 ms)', period:()=>BYTE_T},
    {label:'1 AES frame @ 48 kHz', period:()=>1/48000},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
    {label:'1 instruction (814 ns)', period:()=>TCY},
  ],
  zooms: [[4,'4 s (whole window)'],[1,'1 s'],[0.1,'100 ms'],[0.02,'20 ms (phase XOR)'],[0.003,'3 ms (a few passes)'],[0.0008,'0.8 ms (one pass)'],[0.0002,'200 µs (one SPI transfer)']],
  defaultZoom: 1,
  init(){ if (!D.run){ D.W=defWorld(); powerUp(); } },
  tabs: [
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the AMS4', render:viewTutorial},
    {id:'second', label:'One second, slow motion', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
