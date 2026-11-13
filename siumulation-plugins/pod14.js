/* =====================================================================
   POD14 — dual analog-to-AES/EBU converter (Ward-Beck Systems, 2001|34, obsolete)
   The original POD14, predecessor of POD14A. Plugin for the WBS Device Simulator.

   Sources (all under #POD #SERIES/XXX - POD14 - #Master #OBSOLETE/POD14 - #Engineering/):
   - POD14 - #SOFTWARE #PIC/…#V102/pod14.asm, init.asm, switch.asm, spi.asm, eerw.asm (V1.02, June 25 2001,
     PIC16C73A, MPASM) and …#V100/ (V1.00): main, ref_chk, local_osc1, ext_ref1, DELAY, ee_read, REFRESHSTATUS,
     debounce, change_ref, delay_2, init/init2, ref_read, ref_setup, ref_chk1, IDELAY, switch_press, led_output,
     sr32/sr44/sr48/sr96, switch_debounce, ee_write, refresh8420, wr8420reg, shiftout, read8420, shiftin,
     write_enable, eew, eer; register constants cs8420reg1def … cs8420reg36def; 14v103.pjt / pod14.pjt
   - POD14 - #PCB #OBSOLETE/ARCHIVE/POD14.net (ISS1, 2001-02-28), POD14iss2.net (ISS2, 2002-08-06), pod14.bom (ISS1),
     POD14iss2.bom (ISS2, 2007), pod14.ECO (Feb 2001 net edits)
   - POD14 - #MANUAL/pod14.pdf (July 2002: specs, front/rear description, +4 dBu → −20 dBFS)
   - POD14 - Functional Diagram.pdf (block diagram, LED colours EXT GN / INT YL / CAL R)
   - POD14 - #MECHANICAL/POD14-FRT.pdf (front drilling) and Pod14-REAR.pdf (rear drilling, 2001)
   - SILK/OBSOLETE/POD14SLK_CURVE.pdf (the CorelDRAW file of 2001-02-27, rendered from .cdr) → assets/pod14-*.png
     SILK/OBSOLETE/POD14SLK.pdf (the same artwork with the rear cut-outs drawn in) → connector positions
   - #POD #SERIES/POD14A - #Master/README.md §I.2a (POD14 → POD14A lineage) and ../pod14a.js
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const Y = y => SIM.year(y);
const inf = '<span class="tag-inf">inferred</span>';
const ASSET = 'siumulation-plugins/assets/';
const hex2 = v => '0x'+((v&255).toString(16).toUpperCase().padStart(2,'0'));
const bin8 = v => (v&255).toString(2).padStart(8,'0');
const fmtRate = r => r ? (r/1000).toLocaleString(undefined,{maximumFractionDigits:1})+' kHz' : '—';

/* ---------------- timing, from the crystal and the V1.02 listing ---------------- */
const FOSC = 4.9152e6, TCY = 4/FOSC;           // X2 4.9152 MHz (both BOMs); PIC16C7x: 4 clocks per instruction
const CY = {                                    // instruction cycles, counted from the listing (branch = 2) — INFERRED totals
  READ: 392,       // read8420: 6 bytes out (0x20,16,0x21 / 0x20,6,0x21) + 2 bytes in, 5 cycles per bit, CS toggles
  REFRESH: 1400,   // refresh8420: 8 registers × (0x20, map, data) × 45 cycles + dispatch
  STAT: 40,        // REFRESHSTATUS
  D2: 8,           // delay_2
  MISC: 120,       // change_ref, switch_press, led_output, switch_debounce, ee_write, branches
  IDELAY: 260870,  // IDELAY per COUNT: 255 × 255 × 4 + overhead
  DCALL: 44,       // one DELAY call inside dloop1 (incl. switch_check)
  PWRUP: 770,      // powerupdelay: 256 × decfsz/goto
};
const C = {
  READ_T: CY.READ*TCY, REFRESH_T: CY.REFRESH*TCY, STAT_T: CY.STAT*TCY, D2_T: CY.D2*TCY, MISC_T: CY.MISC*TCY,
  PASS_T: (4*CY.READ + 2*CY.REFRESH + CY.D2 + CY.MISC)*TCY,
  IDELAY_T: CY.IDELAY*TCY, DCALL_T: CY.DCALL*TCY,
  LOCK_ACQ: 0.02,     // CS8420 receiver PLL lock time — INFERRED
  PRESS: 0.15,        // how long a click holds SW1 — INFERRED
  EE_TWC: 0.002,      // 93LC66 self-timed write, per word — INFERRED (datasheet not in the archive)
  BOUNCE_P: 0.0016, BOUNCE_ON: 0.0012, BOUNCE_LEN: 0.008,   // "bouncy contacts" option — INFERRED
  HORIZON: 24,
};
const REG = { r1def:0x28, r1sw:0xA8, r2:0x00, r3def:0x0A, r3mute:0x4A, r4def:0x49, r4sw:0x45, r4stop:0x00, r5:0x00, r6:0x82, r9:0x00, r17:0x32, r18:0x10, r32:0x81 };
const WRITE_ORDER = [[1,'r1'],[2,'r2'],[3,'r3'],[4,'r4'],[18,'r18'],[6,'r6'],[32,'r32'],[17,'r17']];   // refresh8420 → r3 chain in spi.asm
const SRB = [   // led_output → sr32 / sr44 / sr48 / sr96 (switch.asm)
  {fs:32000, txt:'32',   lab:'sr32', led:0x02, sr0:0, fs0:0, fs1:1},
  {fs:44100, txt:'44.1', lab:'sr44', led:0x04, sr0:0, fs0:1, fs1:0},
  {fs:48000, txt:'48',   lab:'sr48', led:0x08, sr0:0, fs0:0, fs1:0},
  {fs:96000, txt:'96',   lab:'sr96', led:0x10, sr0:1, fs0:0, fs1:0},
];
const PLL = {'001':32000, '010':44100, '000':48000, '100':96000};   // key = SR0 FS0 FS1 as the firmware sets them
const srIndex = sr => { for (let k=0;k<4;k++) if ((sr>>k)&1) return k; return 0; };   // sr_check falls through to sr32

/* ---------------- scenarios ---------------- */
const SCEN = {
  run48:  {name:'Running on internal 48 kHz, no reference (hunting 75/110)', init:{power:true, steady:'int', sr:2, ref:null}, ev:[]},
  cold:   {name:'Power-up from cold at 0 s (no reference)', init:{power:false, sr:2, ref:null}, ev:[{t:0, type:'power', on:true}]},
  coldref:{name:'Power-up from cold with house reference on the 110 Ω Phoenix', init:{power:false, sr:2, ref:{on:true, port:'phx', rate:48000, valid:true}}, ev:[{t:0, type:'power', on:true}]},
  refbnc: {name:'48 kHz reference plugged into the REF BNC at 200 ms', init:{power:true, steady:'int', sr:2, ref:null}, ev:[{t:0.2, type:'ref', on:true, port:'bnc', rate:48000, valid:true}]},
  refphx: {name:'Reference on the REF Phoenix at 100 ms', init:{power:true, steady:'int', sr:2, ref:null}, ev:[{t:0.1, type:'ref', on:true, port:'phx', rate:48000, valid:true}]},
  lost:   {name:'Locked to a 44.1 kHz reference; cable pulled at 300 ms', init:{power:true, steady:'ext', sr:2, ref:{on:true, port:'bnc', rate:44100, valid:true}}, ev:[{t:0.3, type:'ref', on:false}]},
  step:   {name:'STEP pressed at 100 ms (48 → 96 kHz), then the EEPROM save', init:{power:true, steady:'int', sr:2, ref:null}, ev:[{t:0.1, type:'press', dur:C.PRESS}]},
  bounce: {name:'Bouncy STEP contacts: a second press during CAL steps twice', init:{power:true, steady:'int', sr:2, ref:null, bounce:true}, ev:[{t:0.1, type:'press', dur:C.PRESS}, {t:1.0, type:'press', dur:C.PRESS}]},
  vbit:   {name:'Programme feed (V bit set) used as reference at 100 ms', init:{power:true, steady:'int', sr:2, ref:null}, ev:[{t:0.1, type:'ref', on:true, port:'bnc', rate:48000, valid:false}]},
  badee:  {name:'Power-up with a blank EEPROM (defaults to 32 kHz)', init:{power:false, sr:2, ref:null, ee:{valid:false}}, ev:[{t:0, type:'power', on:true}]},
};

/* ---------------- device state (what the user controls) ---------------- */
const D = {
  scenario:'run48', init:null, events:[],
  refRate:48000, refValid:true, iss:2,
  inputs:[ {L:{on:true, dbu:4, f:1000}, R:{on:true, dbu:4, f:400}}, {L:{on:true, dbu:-6, f:1000}, R:{on:false, dbu:4, f:1000}} ],
  trim:[0,0,0,0],     // rear holes left→right: IN1 R (RV6), IN1 L (RV5), IN2 R (RV7), IN2 L (RV8) — hole ↔ RV mapping INFERRED
  log:[],
};
function loadScenario(id){ const s=SCEN[id]; D.scenario=id; D.init=JSON.parse(JSON.stringify(s.init)); D.events=JSON.parse(JSON.stringify(s.ev)); EMU_KEY=''; }

function refAt(tt){
  let r = D.init.ref ? Object.assign({}, D.init.ref, {since:-10}) : {on:false, since:-10};
  for (const e of D.events) if (e.type==='ref' && e.t<=tt) r = e.on ? {on:true, port:e.port, rate:e.rate, valid:e.valid, since:e.t} : {on:false, since:e.t};
  return r;
}
function pressedAt(tt){
  const bounce = !!D.init.bounce;
  for (const e of D.events){ if (e.type!=='press') continue;
    const a=e.t, b=e.t+e.dur;
    if (tt<a || tt>=b+(bounce?C.BOUNCE_LEN:0)) continue;
    if (!bounce) return true;
    if (tt<a+C.BOUNCE_LEN) return ((tt-a)%C.BOUNCE_P) < C.BOUNCE_ON;
    if (tt<b) return true;
    return ((tt-b)%C.BOUNCE_P) >= C.BOUNCE_ON;
  }
  return false;
}
const selOf = pb => { const e75=!(pb&0x80), e110=!(pb&0x40); return e75&&e110?'both':e75?'75':e110?'110':'none'; };

/* =====================================================================
   EMULATOR: runs the V1.02 PIC firmware from 0 to 24 s with its own variables.
   Main-loop passes are stepped one by one (3.65 ms); the start-up delays (IDELAY) are blocking waits;
   the local-oscillator calibration loop (dloop1 → DELAY → switch_check) is stepped call by call (36 µs).
   ===================================================================== */
let EMU=null, EMU_KEY='';
const OFF = {};
function emulate(){
  const key = JSON.stringify([D.init, D.events]);
  if (EMU && key===EMU_KEY) return EMU;
  EMU_KEY = key; EMU = run(); return EMU;
}
function fresh(){ return { pa:0,pb:0,pc:0, chip:[0,0], r1:0,r3:0,r4:0,
  f0:0,f1:0,f2:0,f3:0,f5:0,f6:0,f7:0, f0_1:0, pf0:0,pf1:0,pf2:0,pf3:0,pf6:0,pf7:0, ds0:1,ds1:0,ds2:0,
  sr:0, sr2:0, rem0:235, rem1:225, rem2:128, rem4:235, bc:0, out:0, count:0, s1:0, s2:0,
  sel:'both', selT:0, rst:0, rstT:0 }; }
function run(){
  const I = D.init;
  const E = {sig:{}, P:[], ph:[], notes:[], ee:[], boots:[], cals:[]};
  let t = 0, tEnd = 0, S = fresh();
  let EEc = I.ee ? Object.assign({valid:true, sr:4, sr2:0x48}, I.ee) : {valid:true, sr:1<<I.sr, sr2:0x40|SRB[I.sr].led};
  const set = (n,v)=>{ const a=E.sig[n]||(E.sig[n]=[]); const L=a[a.length-1];
    if (L && L[0]===t){ L[1]=v; if (a.length>1 && a[a.length-2][1]===v) a.pop(); return; }
    if (!L || L[1]!==v) a.push([t,v]); };
  const note = (s, cls)=> E.notes.push({t, s, cls:cls||''});
  const phase = (k, label)=>{ const L=E.ph[E.ph.length-1]; if (L && L.b===undefined) L.b=t; E.ph.push({a:t, k, label}); set('mode', k); };
  const adv = dt => { if (t+dt > tEnd){ t=tEnd; throw OFF; } t+=dt; };
  const ports = ()=>{ const sel=selOf(S.pb); if (sel!==S.sel){ S.sel=sel; S.selT=t; } if ((S.pa&1)!==S.rst){ S.rst=S.pa&1; S.rstT=t; }
    set('pa',S.pa); set('pb',S.pb); set('pc',S.pc); set('sel',sel); set('rst',S.pa&1); };
  const chips = ()=>{ set('c1',S.chip[0]); set('c2',S.chip[1]); };
  const refresh = i => { adv(C.REFRESH_T); S.chip[i] = (S.r1<<16)|(S.r3<<8)|S.r4; chips(); };
  const status = tt => {    // CS8420 register 16 as the PIC reads it (both chips listen to the same REF net)
    const r=refAt(tt); let st=0x12;   // UNLOCK (bit 4) + BIP (bit 1)
    if (r.on && r.rate>=30000 && r.rate<=100000 && ((r.port==='bnc'&&S.sel==='75')||(r.port==='phx'&&S.sel==='110'))){
      if (tt - Math.max(r.since, S.selT, S.rstT) >= C.LOCK_ACQ) st = r.valid ? 0x00 : 0x08; }
    return st; };
  const selName = ()=> S.sel==='75'?'75 Ω BNC receiver (U14)':S.sel==='110'?'110 Ω Phoenix receiver (U15)':S.sel;
  const srTxt = sr => `${hex2(sr)} (${SRB[srIndex(sr)].txt} kHz)`;

  function srApply(k, why){
    const R=SRB[k];
    S.pc = (S.pc & ~0x1F) | R.led | R.fs1; S.pb = (S.pb&~0x20)|(R.sr0<<5); S.pa = (S.pa&~0x20)|(R.fs0<<5);
    S.sr = (1<<k) | (k===3?0x80:0);
    S.sr2 = S.pc | 0x80; if (!(S.pa&0x20)) S.sr2 &= ~0x80; S.sr2 &= ~0x20;
    ports();
    if (why!==false) note(`led_output → ${R.lab}${why?' ('+why+')':''}: RC${[1,2,3,4][k]} LED on · PLL1700E SR0(RB5)=${R.sr0} FS0(RA5)=${R.fs0} FS1(RC0)=${R.fs1} → ${R.txt} kHz · sample_rate ${hex2(S.sr)}, sample_rate2 ${hex2(S.sr2)}`, 'led');
  }
  function switchPress(pr){
    if (S.pf1) return;
    if (!pr){ S.rem0=235; return; }
    S.rem0=(S.rem0+1)&255; if (S.rem0) return;
    S.pf0=1; S.pf1=0; if (!S.pf3) S.pf2=0; S.ds2=1;
    const old=S.sr;
    if (((S.sr-8)&255)===0){ S.sr=1; } else { const c = S.sr>=8 ? 1 : 0; S.sr=((S.sr<<1)|c)&255; }
    S.rem0=235;
    note(`switch_press: RA4 low for 21 counts (rem0 235→0) → press_flag,0 · sample_rate ${hex2(old)} − 8 ${old===8?'= 0 → 1':'≠ 0 → rlf → '+hex2(S.sr)+(old>=8?' (the carry from subwf lands in bit 0)':'')}`, 'sw');
  }
  function ledOutput(){
    if (!S.pf7){ S.pf7=1; if (!S.pf6) return srApply(0, 'press_flag,6 clear: no valid EEPROM data, default group 1'); return srApply(srIndex(S.sr), 'first pass after a reference change / start-up'); }
    if (!S.pf0 || S.pf1) return;
    srApply(srIndex(S.sr));
  }
  function switchDebounce(pr){
    if (!S.pf0) return; S.pf1=1; if (pr) return;
    S.rem1=(S.rem1+1)&255; if (S.rem1) return;
    S.f0=1; S.pf2=1; S.pf0=0; S.pf1=0; S.rem1=225; S.rem4=235;
    note('switch_debounce: RA4 high for 31 counts (rem1 225→0) → flag,0 (re-calibrate) and press_flag,2 (start the EEPROM save count)', 'sw');
  }
  function eeWrite(){
    if (!S.pf2) return false;
    S.rem2=(S.rem2+1)&255; if (S.rem2) return false;
    S.rem4=(S.rem4+1)&255; if (S.rem4) return false;
    S.pf2=0; S.pf3=0; const a=t;
    adv(400*TCY + C.EE_TWC); adv(60*TCY + C.EE_TWC);
    EEc = {valid:true, sr:S.sr, sr2:S.sr2}; E.ee.push({a, b:t, sr:S.sr, sr2:S.sr2});
    S.rem2=0; S.rem4=235;
    note(`ee_write: rem2/rem4 ran out → write_enable (EWEN) · eew word 0 = 0xAAAA · eew word 1 = ${hex2(S.sr)}${hex2(S.sr2).slice(2)} (sample_rate, sample_rate2) to the 93LC66 on RA1–RA3 (DO on RB3, shared with the CS8420 data line)`, 'ee');
    return true;
  }
  function refreshStatus(st, p){
    const err = ((st&0x10)?1:0) | ((st&0x02)?2:0); const re = err | (err<<2); p.re=re;
    const debounce = kind => { if (S.f0) return; S.bc=(S.bc-1)&255;
      if (S.bc===14) note(`REFRESHSTATUS: ${kind} — status differs from the current source; debounce counts bcount down from 15 (one check every 36 passes ≈ ${(36*C.PASS_T*1000).toFixed(0)} ms)`, 'st');
      if (S.bc) return; S.bc=15; S.f6^=1; S.f0=1; S.pf6=1; S.pf7=0;
      note(`debounce: bcount reached 0 → flag,6 ^= 1 (${S.f6?'use the local oscillator':'use the external reference'}), flag,0 set → ref_chk`, 'st'); };
    if (!re){ if (S.f1){ S.bc=15; return; } return debounce('reference locked (UNLOCK = BIP = 0'+(st&0x08?', V bit set but not tested':'')+')'); }
    if (S.f2){ S.bc=15; S.f7=1; return; }
    return debounce('reference lost (UNLOCK/BIP set)');
  }
  function localOsc1(){
    S.r1=REG.r1sw; S.r3=REG.r3mute; refresh(0); refresh(1);
    if (S.f0_1){ S.pc = S.sr2 & 0x61; S.pc |= 0x20; }
    S.pa=(S.pa&~0x20)|(((S.sr2>>7)&1)<<5); S.pb=(S.pb&~0x20)|(((S.sr>>7)&1)<<5);
    S.pc |= 0xC0; ports();
    note(`local_osc1: reg 1 = ${hex2(REG.r1sw)} (switch reference), reg 3 = ${hex2(REG.r3mute)} (mute); CAL (RC7) + INT REF (RC6)${S.f0_1?' + RC5 (commented "turn on INT", but RC5 is the EXT REF LED)':''} on · dloop1 → DELAY, count = ${S.count}`, 'cal');
    const a=t; let d1=225, d3=25, d2=S.count; S.ds0=0; S.ds1=0; adv(12*TCY);
    for(;;){ adv(C.DCALL_T); d1=(d1-1)&255;
      if (!d1){ d3=(d3-1)&255; if (!d3){ d3=25; d2=(d2-1)&255; if (!d2){ S.ds0=1; break; } } }
      const pr=pressedAt(t); switchPress(pr); ledOutput(); switchDebounce(pr); if (S.ds2) S.ds1=1; S.ds2=0; }
    S.pc &= ~0xA0; ports();
    S.r3=REG.r3def; S.r4=REG.r4sw; refresh(0); refresh(1);
    S.f1=0; S.f2=1; S.f0_1=0; E.cals.push({a, b:t, k:'int'});
    note(`DELAY done after ${((t-a)).toFixed(2)} s → CAL off · reg 3 = ${hex2(REG.r3def)}, reg 4 = ${hex2(REG.r4sw)} (OMCK from the PLL1700E) → flag,2: running on the local oscillator`, 'cal');
  }
  function extRef1(){
    S.r1=REG.r1def; S.r3=REG.r3mute; refresh(0); refresh(1);
    S.pc=0xA0; ports(); S.pc|=0x40; ports();
    note(`ext_ref1: reg 1 = ${hex2(REG.r1def)}, PORTC = 1010 0000 (CAL + EXT REF; rate LEDs and FS1 cleared), INT REF on · idelay × 3 with count = ${S.count}`, 'cal');
    const a=t; adv(3*S.count*C.IDELAY_T);
    S.pc &= ~0xC0; ports();
    S.r3=REG.r3def; S.r4=REG.r4def; refresh(0); refresh(1);
    S.f1=1; S.f2=0; S.f0_1=1; E.cals.push({a, b:t, k:'ext'});
    note(`ext_ref1 done (${(t-a).toFixed(2)} s): CAL and INT off · reg 3 = ${hex2(REG.r3def)}, reg 4 = ${hex2(REG.r4def)} (timed from the reference) → flag,1: locked on the external reference. The STEP switch is now ignored.`, 'cal');
  }
  function refChk(){
    const toLocal = !!S.f6;
    phase(toLocal?'cal-int':'cal-ext', toLocal?'ref_chk → local_osc1 (CAL)':'ref_chk → ext_ref1 (CAL)');
    S.r4=REG.r4stop; S.r3=REG.r3mute; refresh(0); refresh(1); S.f0=0;
    note(`ref_chk: reg 4 = 0x00 (stop), reg 3 = ${hex2(REG.r3mute)} (mute) to both CS8420s · flag,6 = ${S.f6} → ${toLocal?'local_osc1':'ext_ref1'}`, 'cal');
    if (toLocal) localOsc1(); else extRef1();
  }
  function mainPass(){
    const p = {t, chk:false, rc:false, ee:false, sw:false};
    const st = status(t + 1.5*C.READ_T);
    adv(4*C.READ_T); S.s1=st; S.s2=st; p.rs=st;
    if (!S.f3){ p.chk=true; p.st=st; adv(C.STAT_T); refreshStatus(st, p);
      if (S.f0){ p.rc=true; snap(p); E.P.push(p); refChk(); return; } }
    S.f3=1; S.out=(S.out+1)&255; if (S.out===0){ S.f3=0; S.out=220; } adv(C.D2_T);
    refresh(0); refresh(1);
    if (S.f7){ S.f7=0; S.pb^=0xC0; ports(); p.sw=true; note(`change_ref: no lock while on the local oscillator → PORTB ^= 0xC0 → listening on the ${selName()}`, 'hunt'); }
    if (S.f1){ snap(p); E.P.push(p); return; }
    const pr=pressedAt(t); switchPress(pr); ledOutput(); switchDebounce(pr);
    if (eeWrite()) p.ee=true;
    S.count=10; adv(C.MISC_T);
    snap(p); E.P.push(p);
    if (S.f0) refChk();
  }
  function snap(p){ p.f = S.f0|S.f1<<1|S.f2<<2|S.f3<<3|S.f5<<5|S.f6<<6|S.f7<<7; p.pf = S.pf0|S.pf1<<1|S.pf2<<2|S.pf3<<3|S.pf6<<6|S.pf7<<7;
    p.bc=S.bc; p.out=S.out; p.r0=S.rem0; p.r1=S.rem1; p.r2=S.rem2; p.r4=S.rem4; p.sr=S.sr; p.sr2=S.sr2; p.sel=S.sel; p.f01=S.f0_1; }
  function refReads(){
    for (const k of [0,1,0,1]){
      adv(C.READ_T); S.count=4; adv(4*C.IDELAY_T); S.count=25; adv(2*C.READ_T);
      const st=status(t); if (k) S.s2=st; else S.s1=st;
      note(`ref_read CS8420 #${k+1}: dummy read8420, idelay (count2 = 4, ${(4*C.IDELAY_T).toFixed(2)} s), read8420 × 2 → reg 16 = ${hex2(st)} (${st&0x12?'UNLOCK/BIP':'locked'}), reg 6 = 0x82 ✓ (count is left at count1 = 25)`, 'boot');
    }
    S.f6 = ((S.s1|S.s2)&0x12) ? 1 : 0;
    note(`ref_setup: (reg16 #1 | reg16 #2) & 0001 0010 = ${hex2((S.s1|S.s2)&0x12)} → flag,6 = ${S.f6}`, 'boot');
  }
  function boot(){
    E.boots.push({a:t});
    Object.assign(S, fresh()); S.chip=[0,0]; S.selT=t; S.rstT=t; chips(); ports();
    phase('boot', 'init/init2: ports cleared, power-up delay');
    note('reset → init: TRISA 0x10 (RA4 = STEP in), TRISB 0x02 (RB1 = CS8420 data in), TRISC 0x00 · init2 clears PORTA/B/C: CS8420s held in reset (RA0), both 75176 receivers enabled', 'boot');
    adv(CY.PWRUP*TCY); S.out=220;
    S.r1=REG.r1sw; S.r3=REG.r3mute; S.r4=REG.r4sw;
    if (EEc.valid){ S.sr=EEc.sr; S.sr2=EEc.sr2; S.pf6=1; note(`ee_read: 93LC66 word 0 = 0xAAAA → word 1 → sample_rate ${srTxt(S.sr)}, sample_rate2 ${hex2(S.sr2)}`, 'boot'); }
    else note('ee_read: word 0 is not 0xAA (only setup1 is compared, twice) → nomatch: press_flag,6 stays clear', 'boot');
    S.pf7=0; adv(400*TCY);
    S.pa|=0x01; S.pb|=0x80; ports();
    note('bsf porta,0: CS8420s out of reset (ISS2: Q1 also releases the ADC PDN pins) · bsf portb,7: SEL75 high, the 110 Ω receiver listens', 'boot');
    refresh(0); refresh(1);
    S.pc|=0x60; ports(); note('refresh8420 × 2 (regs 1,2,3,4,18,6,32,17) · bsf portc,5 / portc,6: EXT REF and INT REF both lit (lamp test) · idelay × 2, count2 = 4', 'boot');
    phase('boot', 'lamp test: idelay × 2 (count2 = 4)');
    adv(2*4*C.IDELAY_T);
    phase('boot', 'ref_read × 4 on the 110 Ω Phoenix');
    refReads();
    if (S.f6){
      S.pb&=~0x80; S.pb|=0x40; ports();
      note('flag,6 set: bcf portb,7 / bsf portb,6 → try the 75 Ω BNC receiver', 'boot');
      phase('boot', 'ref_read × 4 on the 75 Ω BNC');
      refReads();
    }
    phase(S.f6?'cal-int':'cal-ext', 'ref_chk1 → '+(S.f6?'local_osc':'ext_ref')+' (start-up calibration)');
    S.r4=0; S.r3=REG.r3mute; refresh(1); S.f0=0;
    note(`ref_chk1: reg 4 = 0x00, reg 3 = mute → refresh8420 with cs8420_1_2 still = 1: only CS8420 #2 is written`, 'boot');
    const a=t;
    if (S.f6){
      S.r1=REG.r1sw; S.r4=REG.r4sw; refresh(1);
      S.pc = S.sr2 & 0x61; S.pa=(S.pa&~0x20)|(((S.sr2>>7)&1)<<5); S.pb=(S.pb&~0x20)|(((S.sr>>7)&1)<<5);
      S.pc |= 0xC0; S.pc &= ~0x20; ports(); adv(3*TCY); S.pc &= ~0x80; S.pc |= 0x20; ports();
      note(`local_osc: PLL pins restored from sample_rate2 · CAL blinks, then EXT REF lit · idelay × 2 with count = ${S.count} (left by ref_read) = ${(2*S.count*C.IDELAY_T).toFixed(1)} s`, 'boot');
      adv(2*S.count*C.IDELAY_T);
      S.pc|=0x80; ports(); S.count=4; adv(4*C.IDELAY_T); S.pc &= ~0xA0; ports();
      S.pc = S.sr2 & 0x7F; S.pc |= 0x40; ports(); adv(3*TCY); S.pc|=0x80; ports();
      adv(2*4*C.IDELAY_T); S.pc&=~0x80; S.pc|=0x40; ports();
      S.r3=REG.r3def; refresh(1); S.f1=0; S.f2=1;
      note('local_osc done: rate LEDs from sample_rate2, INT REF on, reg 3 = 0x0A on chip #2 → main (flag,2)', 'boot');
    } else {
      S.r1=REG.r1def; S.r4=REG.r4def; refresh(1);
      S.pc=0xA0; ports(); adv(3*TCY); S.pc&=~0x80; S.pc|=0x40; ports();
      note(`ext_ref: PORTC = 1010 0000 (EXT REF), INT REF on · idelay × 2 with count = ${S.count} = ${(2*S.count*C.IDELAY_T).toFixed(1)} s`, 'boot');
      adv(2*S.count*C.IDELAY_T);
      S.pc|=0x80; ports(); S.count=4; adv(4*C.IDELAY_T); S.pc&=~0xC0; ports(); adv(3*TCY); S.pc|=0x80; ports();
      adv(2*4*C.IDELAY_T); S.pc&=~0x80; ports();
      S.r3=REG.r3def; refresh(1); S.f1=1; S.f2=0;
      note('ext_ref done: EXT REF lit, rate LEDs dark → main (flag,1)', 'boot');
    }
    E.cals.push({a, b:t, k:S.f6?'int':'ext', boot:true});
    E.boots[E.boots.length-1].b = t;
  }
  function steady(){
    Object.assign(S, fresh()); S.selT=-10; S.rstT=-10; S.rst=1; S.pa=0x01; S.pf6=1; S.pf7=1; S.out=240; S.bc=15; S.count=10;
    srApply(I.sr, false);
    if (I.steady==='ext'){
      S.pc = 0x20; S.f1=1; S.f6=0; S.f0_1=1; S.r1=REG.r1def; S.r3=REG.r3def; S.r4=REG.r4def;
      S.pb = (S.pb&0x3F) | (I.ref && I.ref.port==='phx' ? 0x80 : 0x40);
    } else { S.pc |= 0x40; S.f2=1; S.f6=1; S.r1=REG.r1sw; S.r3=REG.r3def; S.r4=REG.r4sw; S.pb=(S.pb&0x3F)|0x40; }
    S.sel=selOf(S.pb); S.selT=-10;
    S.chip=[(S.r1<<16)|(S.r3<<8)|S.r4, (S.r1<<16)|(S.r3<<8)|S.r4]; chips(); ports();
    EEc = {valid:true, sr:S.sr, sr2:S.sr2};
  }
  // power intervals
  const pev = D.events.filter(e=>e.type==='power').sort((a,b)=>a.t-b.t);
  let on = !!I.power, from = 0; const iv = [];
  for (const e of pev){ if (e.on && !on){ on=true; from=e.t; } else if (!e.on && on){ on=false; iv.push([from, e.t]); } }
  if (on) iv.push([from, C.HORIZON]);
  set('pwr',0); set('pa',0); set('pb',0); set('pc',0); set('sel','both'); set('rst',0); set('c1',0); set('c2',0);
  if (!iv.length || iv[0][0]>0) phase('off','power off');
  for (const [a,b] of iv){
    t=a; tEnd=Math.min(b, C.HORIZON); set('pwr',1);
    if (a>0 || !(I.power && I.steady)) note('Power on: 7805 ×3, 7905, LM1117-3.3 come up; MCLR is tied to +5V3, so the PIC starts at the reset vector', 'boot');
    try {
      if (a===0 && I.power && I.steady){ steady(); }
      else boot();
      for(;;){ const k = S.f1?'ext':'int'; const L=E.ph[E.ph.length-1]; if (!L || L.k!==k || L.b!==undefined) phase(k, k==='ext'?'main loop: locked on the external reference':'main loop: local oscillator'); mainPass(); }
    } catch(e){ if (e!==OFF) throw e; }
    if (b < C.HORIZON){ t=b; S.pa=S.pb=S.pc=0; S.chip=[0,0]; set('pwr',0); ports(); chips(); phase('off','power off'); note('Power off: all rails drop', 'boot'); }
  }
  const L=E.ph[E.ph.length-1]; if (L && L.b===undefined) L.b=C.HORIZON;
  E.ee0 = EEc;
  return E;
}

/* ---------------- queries on the emulation ---------------- */
function idxAt(a, t){ if (!a.length || a[0][0]>t) return -1; let lo=0, hi=a.length-1; while (lo<hi){ const m=(lo+hi+1)>>1; if (a[m][0]<=t) lo=m; else hi=m-1; } return lo; }
function sv(name, t, def){ const a=emulate().sig[name]; if (!a) return def; const i=idxAt(a,t); return i<0?def:a[i][1]; }
function since(name, t){ const a=emulate().sig[name]; if (!a) return -10; const i=idxAt(a,t); return i<0?-10:a[i][0]; }
function powerAt(t){ return !!sv('pwr',t,0); }
function portsAt(t){ return {pa:sv('pa',t,0), pb:sv('pb',t,0), pc:sv('pc',t,0)}; }
function ledsAt(t){ const pw=powerAt(t), pc=pw?sv('pc',t,0):0; return {pwr:pw?1:0, r:[1,2,3,4].map(b=>(pc>>b)&1), E:(pc>>5)&1, I:(pc>>6)&1, C:(pc>>7)&1}; }
function chipAt(i, t){ const v=sv(i?'c2':'c1',t,0); return {r1:(v>>16)&255, r3:(v>>8)&255, r4:v&255}; }
function pllAt(t){ const {pa,pb,pc}=portsAt(t); return PLL[`${(pb>>5)&1}${(pa>>5)&1}${pc&1}`] || 0; }
function refLockedAt(t){ const r=refAt(t); if (!r.on || r.rate<30000 || r.rate>100000) return false; const s=sv('sel',t,'both');
  if (!((r.port==='bnc'&&s==='75')||(r.port==='phx'&&s==='110'))) return false; return t - Math.max(r.since, since('sel',t), since('rst',t)) >= C.LOCK_ACQ; }
function outAt(i, t){
  if (!powerAt(t)) return {fs:0, st:'off'};
  if (!(sv('pa',t,0)&1)) return {fs:0, st:'reset'};
  const c=chipAt(i,t);
  if (!c.r4) return {fs:0, st:'stopped'};
  let fs, src;
  if (c.r4===REG.r4def){ src='ext'; fs = refLockedAt(t) ? refAt(t).rate : 0; } else { src='int'; fs=pllAt(t); }
  if (c.r3===REG.r3mute) return {fs, st:'muted', src};
  return {fs, st: fs?'running':'no clock', src};
}
const convOfOut = (o)=> D.iss===2 ? o : 1-o;          // ISS1: TXP of CS8420 #1 drives OUTPUT2 (POD14.net); ISS2 swaps it back
const trimIdx = (k, s)=> k*2 + (s?0:1);
function dbfs(k, s){ const ch=D.inputs[k][s?'R':'L']; return ch.dbu - 24 + D.trim[trimIdx(k,s)]; }
function outSample(o, s, t){ const k=convOfOut(o), O=outAt(k,t); if (O.st!=='running') return null; const ch=D.inputs[k][s?'R':'L']; if (!ch.on) return 0;
  const a=Math.min(1, Math.pow(10, dbfs(k,s)/20)); return a*Math.sin(2*Math.PI*ch.f*t); }
function passAt(t){ const P=emulate().P; if (!P.length || P[0].t>t) return -1; let lo=0, hi=P.length-1; while (lo<hi){ const m=(lo+hi+1)>>1; if (P[m].t<=t) lo=m; else hi=m-1; } return lo; }
function phaseAt(t){ const ph=emulate().ph; for (let i=ph.length-1;i>=0;i--) if (ph[i].a<=t) return ph[i]; return ph[0]; }
const STEPS = [   // main: pod14.asm V1.02, in order (durations from the cycle counts — INFERRED)
  ['READ8420 / read8420 → CS8420 #1', 2*CY.READ, 'CS1 (RB0) low · 0x20, 16 · 0x21 → cs8420_16 · 0x20, 6 · 0x21 → cs8420_6; twice'],
  ['READ8420 / read8420 → CS8420 #2', 2*CY.READ, 'CS2 (RB2) low · same 8 bytes; cs8420_16 kept for chip #2, cs8420_16_1 for #1'],
  ['flag,5? flag,3? → REFRESHSTATUS', CY.STAT, 'every 36th pass: ref_error from reg 16 bit 4 (UNLOCK) and bit 1 (BIP) of both chips; lock / no_lock / debounce'],
  ['delay_2', CY.D2, 'output 220…255: sets flag,3 on 35 passes of 36, so REFRESHSTATUS is skipped'],
  ['refresh8420 → CS8420 #1', CY.REFRESH, 'writes regs 1, 2, 3, 4, 18, 6, 32, 17 (3 bytes each) from the cs8420regXX file registers'],
  ['refresh8420 → CS8420 #2', CY.REFRESH, 'the same 24 bytes to chip #2'],
  ['change_ref · flag,1?', 20, 'flag,7 → PORTB ^= 0xC0 (swap SEL75 / SEL110) · locked on ext ref → goto main'],
  ['switch_press · led_output · switch_debounce', 70, 'RA4 polled; rem0 (21 counts) / rem1 (31 counts); LEDs RC1–RC4, PLL1700E SR0 RB5 · FS0 RA5 · FS1 RC0'],
  ['ee_write · count = 10 · flag,0? → ref_chk', 30, 'rem2 / rem4 save countdown; flag,0 → ref_chk (CAL)'],
];
const STEP_T = (()=>{ const tot=STEPS.reduce((a,s)=>a+s[1],0); let acc=0; return STEPS.map(s=>{ const r=acc; acc+=s[1]; return [r/tot, acc/tot]; }); })();
function stepAt(t){
  const ph=phaseAt(t); if (!ph || (ph.k!=='int' && ph.k!=='ext')) return {pass:-1, step:-1};
  const i=passAt(t); if (i<0) return {pass:-1, step:-1};
  const P=emulate().P, p=P[i], end = i+1<P.length ? P[i+1].t : p.t+C.PASS_T, f=(t-p.t)/(end-p.t);
  let k=STEP_T.findIndex(r=>f>=r[0] && f<r[1]); if (k<0) k=STEPS.length-1;
  if (!p.chk && k===2) k=3;
  if (p.f&2 && k>=7) k=6;
  return {pass:i, step:k, p};
}

/* ---------------- actions ---------------- */
function act(name, fn){
  const tr=[], t=SIM.t; fn(s=>tr.push(s));
  EMU_KEY=''; const E=emulate();
  let hunts=0; const out=[];
  for (const n of E.notes){ if (n.t < t-1e-9) continue; if (n.cls==='hunt'){ hunts++; if (hunts===4) out.push({t:n.t, s:'… change_ref keeps swapping the 75 / 110 Ω receivers on every status check while nothing locks'}); if (hunts>3) continue; } out.push(n); if (out.length>=16) break; }
  out.forEach(n=>tr.push(`<span class="muted">+${SIM.fmtDur(Math.max(0,n.t-t))}</span> ${n.s}`));
  D.log.unshift({t, name, trace:tr}); if (D.log.length>40) D.log.length=40;
  SIM.refresh();
}
const addEv = e => { D.events.push(Object.assign({user:true}, e)); D.events.sort((a,b)=>a.t-b.t); };
const A = {
  press(){ act('Press STEP (SW1)', tr=>{ if (!powerAt(SIM.t)) tr('The unit is off: nothing happens.'); else if (sv('mode',SIM.t,'')==='ext') tr('Locked on the external reference: main jumps back at <span class="mono">btfsc flag,1 / goto main</span> before <span class="mono">switch_press</span>, so the press is ignored.');
    tr(`SW1 pulls RA4 low (R81/R82 10 k pull-up) for ${C.PRESS*1000|0} ms (${inf}). RA4 is polled: no interrupt (the vector at 0x004 is a bare RETFIE).`); addEv({t:SIM.t, type:'press', dur:C.PRESS}); }); },
  power(){ const on=powerAt(SIM.t); act(on?'Power switch off':'Power switch on', tr=>{ tr(on?'Mains off.':'Mains on: TE70041 → bridge → 7805 ×3 / 7905 / LM1117. MCLR is tied to +5V3, so the PIC runs init at once.'); addEv({t:SIM.t, type:'power', on:!on}); }); },
  plug(port){ const r=refAt(SIM.t);
    if (r.on && r.port===port){ act(`Unplug the reference from the ${port==='phx'?'Phoenix':'BNC'}`, tr=>{ addEv({t:SIM.t, type:'ref', on:false}); }); return; }
    act(`Plug a ${fmtRate(D.refRate)} reference into the REF ${port==='phx'?'Phoenix (110 Ω)':'BNC (75 Ω)'}`, tr=>{
      tr(port==='phx' ? 'TB5 → P3 → C27 → T2 (PE-65612) → 110 R → U15 75176, enabled while SEL110 (RB6) is low → REF net → RXP of both CS8420s' : 'BNC1 → P3 → C16 → T1 (PE-65612) → 75 R → U14 75176, enabled while SEL75 (RB7) is low → REF net → RXP of both CS8420s');
      addEv({t:SIM.t, type:'ref', on:true, port, rate:D.refRate, valid:D.refValid}); }); },
  unplug(){ const r=refAt(SIM.t); if (r.on) A.plug(r.port); },
  refRate(v){ D.refRate=v; const r=refAt(SIM.t); if (r.on) act(`Reference generator → ${fmtRate(v)}`, tr=>{ tr(v>100000?'Above the 30–100 kHz range in the manual: the CS8420 receiver will not lock (modelled as UNLOCK).':'The CS8420 receivers re-acquire. In ext mode the outputs follow the reference rate; the rate LEDs stay dark.'); addEv({t:SIM.t, type:'ref', on:true, port:r.port, rate:v, valid:r.valid}); }); else SIM.refresh(); },
  refValid(v){ D.refValid=v; const r=refAt(SIM.t); if (r.on) act(v?'Reference V bit cleared':'Reference V bit set (programme feed)', tr=>{ tr('REFRESHSTATUS only tests reg 16 bit 4 (UNLOCK) and bit 1 (BIP); the validity bit (bit 3) is read but never tested.'); addEv({t:SIM.t, type:'ref', on:true, port:r.port, rate:r.rate, valid:v}); }); else SIM.refresh(); },
  scenario(id){ loadScenario(id); D.log.unshift({t:0, name:'Scenario: '+SCEN[id].name, trace:['Events replaced; the emulator re-ran V1.02 from 0 to 24 s.']}); SIM.refresh(); },
  clear(){ D.events=D.events.filter(e=>!e.user); EMU_KEY=''; D.log.unshift({t:SIM.t, name:'Cleared your actions', trace:['Back to the scenario events only.']}); SIM.refresh(); },
  input(k, s, p, v){ const ch=D.inputs[k][s?'R':'L']; ch[p]=v; D.log.unshift({t:SIM.t, name:`INPUT${k+1} ${s?'RIGHT':'LEFT'} ${p==='dbu'?v+' dBu':p==='f'?v+' Hz':v?'connected':'disconnected'}`,
      trace:[`Analog only. ${k?'TB3/TB4 → P4 → U7/U8':'TB1/TB2 → P5 → U5/U6'} NE5532 balanced stage (trim ${k?(s?'RV7':'RV8'):(s?'RV6':'RV5')}) → R 150 Ω / C 6n8 → ${k?'U2':'U1'} ${D.iss===2?'CS5396':'CS5394'} → CS8420 #${k+1} → OUTPUT${D.iss===2?k+1:2-k}.`, `${ch.on?dbfs(k,s).toFixed(2)+' dBFS':'silence'} (manual: +4 dBu → −20 dBFS, max input +24 dBu)${ch.on&&dbfs(k,s)>0?' — CLIPPING':''}`]}); SIM.refresh(); },
  trim(i, d){ D.trim[i]=Math.max(-4.5, Math.min(4.5, +(D.trim[i]+d).toFixed(2))); const nm=['RV6 (INPUT1 R)','RV5 (INPUT1 L)','RV7 (INPUT2 R)','RV8 (INPUT2 L)'][i];
    D.log.unshift({t:SIM.t, name:`Trim ${nm} → ${D.trim[i]>=0?'+':''}${D.trim[i].toFixed(2)} dB`, trace:[`A 20 k multiturn in the gain leg (with R47/R54/R63/R75 4K7) of the NE5532 pair. Range shown as ±4.5 dB about the factory point (${inf}).`]}); SIM.refresh(); },
  iss(v){ D.iss=v; D.log.unshift({t:SIM.t, name:`Board issue ${v}`, trace:[v===1?'ISS1 (POD14.net, Feb 2001): R11 ← CS8420 #1 TXP feeds the OUTPUT2 half of U11, so INPUT1 comes out of OUTPUT2. ADC PDN pins grounded; PIC16C73, CS5394, CS8420, 93LC46.':'ISS2 (POD14iss2.net, Aug 2002): R11/R17 swapped (INPUT1 → OUTPUT1), Q1 holds the ADCs in power-down with RESET, input caps C97–C100 added; BOM: PIC16F73, CS5396, CS8427, 93LC66.']}); SIM.refresh(); },
};

/* ================================================================
   PANELS on the real 2001 silkscreen (POD14SLK_CURVE.pdf, 200 px per inch)
   ================================================================ */
/* Artwork 2026|59: the faces are now vector, from the latest copy of the 2001 CorelDRAW silk, #POD #SERIES/POD4 - #Master/
   POD4 - #Engineering/SILK/POD14SLK_CURVE.cdr (2001-03-21; the POD14 folder's copy is 2001-02-27) via Inkscape → assets/pod14-front.svg
   (GREEN + WHITE plates) and pod14-rear.svg, cut between the same crop marks (cross-checked: 0 px offset against the old PNGs).
   Previously: tools/silk_extract.py cut three separations between the crop marks at 200 dpi (x 200–1920; y 489–809 rear white,
   900–1220 front white, 1300–1620 front green) → 1720 × 320 px. The front labels 32/44.1/48/96 sit at 4.170/4.410/4.668/4.920 in,
   the drilling in POD14-FRT.pdf at 4.171/4.421/4.671/4.921 in, so 1 in = 200 px with no offset. Rear cut-outs come from the green
   outlines in POD14SLK.pdf (same frame, panel edge at x 203). */
const FX = { rocker:180, pwr:299, step:714, leds:[834,884,934,984], ext:1119, int:1169, cal:1219 }, LY = 218;
const PANEL = '#141516';
function ledC(x, y, col, lit, r){ r=r||13; return `<circle cx="${x}" cy="${y}" r="${r+3}" fill="#000"/><circle cx="${x}" cy="${y}" r="${r}" fill="${lit?col:'#2a2a2a'}" stroke="#555" stroke-width="1"/>${lit?`<circle cx="${x}" cy="${y}" r="${r*2.2}" fill="${col}" opacity=".25"/><circle cx="${x-4}" cy="${y-4}" r="${r*.3}" fill="#fff" opacity=".7"/>`:''}`; }
function frontSVG(t, opts){
  opts=opts||{}; const L=ledsAt(t), pr=pressedAt(t)&&powerAt(t), pw=powerAt(t);
  const R='#ff3b30', G='#3dff6a', YL='#ffd23a';
  return `<svg viewBox="0 0 1720 320" role="img" aria-label="POD14 front panel (2001 silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <rect width="1720" height="320" rx="8" fill="${PANEL}"/>
    <image href="${ASSET}pod14-front.svg" width="1720" height="320"/>
    ${[50,1664].map(x=>`<circle cx="${x}" cy="161" r="15" fill="#2d2f31" stroke="#666"/><path d="M${x-9} 161h18M${x} 152v18" stroke="#111" stroke-width="3"/>`).join('')}
    <g class="p14pwr" style="cursor:pointer"><title>Power rocker (PAN256, punch 0.505 × 0.770 in at 0.900 in)</title>
      <rect x="130" y="54" width="101" height="154" rx="6" fill="#0b0b0b" stroke="#444" stroke-width="3"/>
      <rect x="140" y="${pw?64:118}" width="81" height="80" rx="5" fill="${pw?'#2c2c2c':'#1d1d1d'}" stroke="#555"/>
      <text x="180" y="${pw?96:184}" text-anchor="middle" font-size="22" fill="#bbb">${pw?'I':'O'}</text></g>
    ${ledC(FX.pwr, LY, G, L.pwr)}
    <g class="p14step" style="cursor:pointer"><title>STEP switch SW1 (0.281 in hole): each press steps 32 → 44.1 → 48 → 96 kHz (internal oscillator only)</title>
      <circle cx="${FX.step}" cy="${LY}" r="34" fill="#000"/><circle cx="${FX.step}" cy="${LY}" r="${pr?24:27}" fill="${pr?'#3a3a3a':'#5a5a5a'}" stroke="#888" stroke-width="2"/><circle cx="${FX.step}" cy="${LY}" r="${pr?16:19}" fill="${pr?'#2a2a2a':'#474747'}"/></g>
    ${FX.leds.map((x,i)=>`<g><title>${SRB[i].txt} kHz (RC${i+1})</title>${ledC(x, LY, R, L.r[i])}</g>`).join('')}
    <g><title>EXT REF, green (RC5)</title>${ledC(FX.ext, LY, G, L.E)}</g>
    <g><title>INT REF, yellow (RC6)</title>${ledC(FX.int, LY, YL, L.I)}</g>
    <g><title>CAL, red (RC7, also the ADC CAL net). Position under the silk label: the hole is ${'inferred'}; the 2008 copy of POD14-FRT.dwg no longer has it</title>${ledC(FX.cal, LY, R, L.C)}</g>
    ${opts.hot||''}</svg>`;
}
const RX = { inTop:[244,40,216,67], inBot:[244,155,216,67], trims:[[170,219],[215,219],[490,221],[535,221]], bnc:[720,930,1140], bncY:88, phx:[[664,155],[874,155],[1084,155]], ac:[1359,30,253,221] };
function phoenix(x, y, w, h, n, act, title, live){
  let s=`<g class="${act?'p14j':''}" data-j="${act||''}" style="cursor:${act?'pointer':'default'}">${title?`<title>${title}</title>`:''}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#2f7d3a" stroke="${live?'#ffd23a':'#1c4d24'}" stroke-width="${live?4:2}"/>`;
  for (let i=0;i<n;i++){ const cx=x+w*(i+.5)/n; s+=`<circle cx="${cx}" cy="${y+h*.42}" r="${Math.min(13,w/n*.36)}" fill="#bfc3c6" stroke="#555"/><path d="M${cx-8} ${y+h*.42}h16" stroke="#555" stroke-width="3"/>`; }
  return s+'</g>';
}
function bnc(x, y, act, title, live){ return `<g class="${act?'p14j':''}" data-j="${act||''}" style="cursor:${act?'pointer':'default'}"><title>${title}</title><circle cx="${x}" cy="${y}" r="53" fill="#000"/><circle cx="${x}" cy="${y}" r="44" fill="#c8ccd0" stroke="${live?'#ffd23a':'#777'}" stroke-width="${live?6:2}"/><circle cx="${x}" cy="${y}" r="30" fill="#9aa0a6"/><circle cx="${x}" cy="${y}" r="12" fill="#2b2b2b"/><circle cx="${x}" cy="${y}" r="4" fill="#d9b44a"/>${live?`<rect x="${x-12}" y="0" width="24" height="${y-40}" fill="#222" opacity=".85"/>`:''}</g>`; }
function rearSVG(t){
  const r=refAt(t), o1=outAt(convOfOut(0),t), o2=outAt(convOfOut(1),t);
  const ot = (o,n)=> `OUTPUT${n}: ${o.st}${o.fs?' · '+fmtRate(o.fs):''} (carries INPUT${convOfOut(n-1)+1})`;
  const sel=sv('sel',t,'both');
  return `<svg viewBox="0 0 1720 320" role="img" aria-label="POD14 rear panel (2001 silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <rect width="1720" height="320" rx="8" fill="${PANEL}"/>
    <image href="${ASSET}pod14-rear.svg" width="1720" height="320"/>
    ${[[53,160],[1666,160]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="15" fill="#2d2f31" stroke="#666"/>`).join('')}
    ${[[210,87],[630,88],[1230,88],[825,138],[1035,138]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="10" fill="#050505"><title>0.100 in hole (mechanical "E", purpose not stated)</title></circle>`).join('')}
    <g class="p14j" data-j="in00" style="cursor:pointer"><title>INPUT1 LEFT (TB1 → P5 A1±) — click to plug / unplug</title>${phoenix(244,40,108,67,3,null,'',D.inputs[0].L.on).replace(/^<g[^>]*>/,'').replace(/<\/g>$/,'')}</g>
    <g class="p14j" data-j="in10" style="cursor:pointer"><title>INPUT2 LEFT (TB3 → P4 A2±)</title>${phoenix(352,40,108,67,3,null,'',D.inputs[1].L.on).replace(/^<g[^>]*>/,'').replace(/<\/g>$/,'')}</g>
    <g class="p14j" data-j="in01" style="cursor:pointer"><title>INPUT1 RIGHT (TB2 → P5 B1±)</title>${phoenix(244,155,108,67,3,null,'',D.inputs[0].R.on).replace(/^<g[^>]*>/,'').replace(/<\/g>$/,'')}</g>
    <g class="p14j" data-j="in11" style="cursor:pointer"><title>INPUT2 RIGHT (TB4 → P4 B2±)</title>${phoenix(352,155,108,67,3,null,'',D.inputs[1].R.on).replace(/^<g[^>]*>/,'').replace(/<\/g>$/,'')}</g>
    ${RX.trims.map(([x,y],i)=>`<g class="p14t" data-t="${i}" style="cursor:ns-resize"><title>${['RV6 INPUT1 R','RV5 INPUT1 L','RV7 INPUT2 R','RV8 INPUT2 L'][i]} trim ${D.trim[i]>=0?'+':''}${D.trim[i].toFixed(2)} dB — click left/right half or use the wheel</title><circle cx="${x}" cy="${y}" r="20" fill="#000"/><circle cx="${x}" cy="${y}" r="15" fill="#c9b37a"/><path d="M${x} ${y} l${(13*Math.sin(D.trim[i]/4.5*2.4)).toFixed(1)} ${(-13*Math.cos(D.trim[i]/4.5*2.4)).toFixed(1)}" stroke="#222" stroke-width="4"/></g>`).join('')}
    ${bnc(RX.bnc[0], RX.bncY, 'refbnc', `REFERENCE INPUT BNC 75 Ω (BNC1 → T1 → U14, SEL75 = RB7)${r.on&&r.port==='bnc'?' — '+fmtRate(r.rate)+' plugged; receiver '+(sel==='75'?'listening':'off'):' — click to plug'}`, r.on&&r.port==='bnc')}
    ${bnc(RX.bnc[1], RX.bncY, null, ot(o1,1)+' — BNC 75 Ω, 1 Vp-p', o1.st==='running')}
    ${bnc(RX.bnc[2], RX.bncY, null, ot(o2,2)+' — BNC 75 Ω', o2.st==='running')}
    ${phoenix(664,155,111,67,3,'refphx',`REFERENCE INPUT Phoenix 110 Ω (TB5 → T2 → U15, SEL110 = RB6)${r.on&&r.port==='phx'?' — '+fmtRate(r.rate)+' plugged; receiver '+(sel==='110'?'listening':'off'):' — click to plug'}`, r.on&&r.port==='phx')}
    ${phoenix(874,155,111,67,3,null,ot(o1,1)+' — Phoenix 110 Ω via T5', false)}
    ${phoenix(1084,155,111,67,3,null,ot(o2,2)+' — Phoenix 110 Ω via T4', false)}
    <g><title>AC inlet with fuse (PAN356, detail "A" 1.256 × 1.080 in; changed to a new-style plug at drawing issue 3)</title><rect x="1359" y="30" width="253" height="221" rx="8" fill="#0a0a0a" stroke="#555" stroke-width="3"/><rect x="1395" y="70" width="180" height="110" rx="10" fill="#1b1b1b" stroke="#666"/>${[1440,1485,1530].map(x=>`<rect x="${x-7}" y="105" width="14" height="40" fill="#999"/>`).join('')}<rect x="1430" y="195" width="110" height="40" rx="4" fill="#222" stroke="#666"/></g>
    <circle cx="1666" cy="50" r="18" fill="#2d2f31" stroke="#666"><title>FH-440-6 insert ("F")</title></circle>
    <g pointer-events="none">${sel==='75'||sel==='both'?`<circle cx="${RX.bnc[0]}" cy="${RX.bncY}" r="56" fill="none" stroke="#3dff6a" stroke-dasharray="6 6" stroke-width="3" opacity=".7"/>`:''}${sel==='110'||sel==='both'?`<rect x="660" y="151" width="119" height="75" rx="6" fill="none" stroke="#3dff6a" stroke-dasharray="6 6" stroke-width="3" opacity=".7"/>`:''}</g>
  </svg>`;
}
function bindPanel(root){
  root.querySelectorAll('.p14step').forEach(g=>g.addEventListener('click', ()=>A.press()));
  root.querySelectorAll('.p14pwr').forEach(g=>g.addEventListener('click', ()=>A.power()));
  root.querySelectorAll('.p14j').forEach(g=>g.addEventListener('click', ()=>{ const j=g.dataset.j; if (!j) return;
    if (j==='refbnc') A.plug('bnc'); else if (j==='refphx') A.plug('phx');
    else if (j.startsWith('in')){ const k=+j[2], s=+j[3]; A.input(k, s, 'on', !D.inputs[k][s?'R':'L'].on); } }));
  root.querySelectorAll('.p14t').forEach(g=>{ const i=+g.dataset.t;
    g.addEventListener('click', e=>{ const r=g.getBoundingClientRect(); A.trim(i, (e.clientX-r.left)/r.width<0.5?-0.1:0.1); });
    g.addEventListener('wheel', e=>{ e.preventDefault(); A.trim(i, e.deltaY<0?0.05:-0.05); }, {passive:false}); });
}
function controlsHTML(){
  const r=refAt(SIM.t);
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px">
    <button data-a="press" title="S">Press STEP</button>
    <button data-a="bnc" class="${r.on&&r.port==='bnc'?'on':''}" title="R">Ref → BNC</button>
    <button data-a="phx" class="${r.on&&r.port==='phx'?'on':''}" title="P">Ref → Phoenix</button>
    <button data-a="unplug" ${r.on?'':'disabled'} title="U">Unplug ref</button>
    <label class="small">Ref rate <select data-a="rate">${[32000,44100,48000,96000,192000].map(v=>`<option value="${v}" ${v===D.refRate?'selected':''}>${fmtRate(v)}</option>`).join('')}</select></label>
    <label class="small"><input type="checkbox" data-a="vbit" ${D.refValid?'':'checked'}> V bit set</label>
    <button data-a="power" title="O">Power ${powerAt(SIM.t)?'off':'on'}</button>
    <label class="small">Board <select data-a="iss"><option value="2" ${D.iss===2?'selected':''}>ISS2 (2002)</option><option value="1" ${D.iss===1?'selected':''}>ISS1 (2001)</option></select></label>
    <span class="small muted">Keys: S step · R BNC · P Phoenix · U unplug · O power</span></div>
    <div class="small muted" style="margin-top:4px">Actions are inserted at the playhead and V1.02 is re-run from 0 s. Click the rocker or the STEP switch on the front; the REF BNC / Phoenix, the input blocks and the trims on the rear.</div>`;
}
function bindControls(root){
  const m={ press:()=>A.press(), bnc:()=>A.plug('bnc'), phx:()=>A.plug('phx'), unplug:()=>A.unplug(), power:()=>A.power() };
  root.querySelectorAll('button[data-a]').forEach(b=>b.onclick=()=>m[b.dataset.a]());
  const rs=root.querySelector('select[data-a="rate"]'); if (rs) rs.onchange=e=>A.refRate(+e.target.value);
  const vb=root.querySelector('input[data-a="vbit"]'); if (vb) vb.onchange=e=>A.refValid(!e.target.checked);
  const is=root.querySelector('select[data-a="iss"]'); if (is) is.onchange=e=>A.iss(+e.target.value);
}
function inputsHTML(){
  return `<table class="kv"><tr><th>Input</th><th>plugged</th><th>level (dBu)</th><th>tone</th><th>→ dBFS</th><th>comes out of</th></tr>${[0,1].map(k=>[0,1].map(s=>{ const ch=D.inputs[k][s?'R':'L'], d=dbfs(k,s);
    return `<tr><td>IN${k+1} ${s?'R':'L'}</td><td><input type="checkbox" data-in="${k}${s}" data-p="on" ${ch.on?'checked':''}></td>
      <td><input type="range" min="-40" max="28" step="1" value="${ch.dbu}" data-in="${k}${s}" data-p="dbu" style="width:100px;vertical-align:middle"> <span class="mono">${ch.dbu>0?'+':''}${ch.dbu}</span></td>
      <td><select data-in="${k}${s}" data-p="f">${[100,400,1000,10000].map(f=>`<option ${f===ch.f?'selected':''} value="${f}">${f>=1000?f/1000+' kHz':f+' Hz'}</option>`).join('')}</select></td>
      <td class="mono" style="color:${ch.on&&d>0?'var(--bad)':'inherit'}">${ch.on?d.toFixed(2)+(d>0?' CLIP':''):'—'}</td><td class="small">OUTPUT${D.iss===2?k+1:2-k} ${s?'B (right)':'A (left)'}</td></tr>`; }).join('')).join('')}</table>
    <p class="small muted">0 dBFS = +24 dBu, +4 dBu → −20 dBFS (manual: "factory calibrated to output a nominal −20 dBFS digital signal when a +4 dBu signal is applied"). Left = A, right = B of the NE5532 pairs (${inf}).</p>`;
}
function bindInputs(root){ root.querySelectorAll('[data-in]').forEach(el=>{ const k=+el.dataset.in[0], s=+el.dataset.in[1], p=el.dataset.p; el.onchange=()=>A.input(k, s, p, p==='on'?el.checked:+el.value); }); }
window.__pod14Keys = false;
document.addEventListener('keydown', e=>{
  if (!window.__pod14Keys || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  if (new URLSearchParams(location.search).get('plugin')!=='pod14') return;
  const k=e.key.toLowerCase(), m={ s:()=>A.press(), r:()=>A.plug('bnc'), p:()=>A.plug('phx'), u:()=>A.unplug(), o:()=>A.power() };
  if (m[k] && !e.ctrlKey && !e.metaKey && !e.altKey){ m[k](); e.preventDefault(); }
});

/* ---------------- timeline lanes ---------------- */
function segs(name, t0, t1, def){ const a=emulate().sig[name]||[]; let i=idxAt(a,t0); let v=i<0?def:a[i][1], s=t0; const out=[]; i++;
  for (; i<a.length && a[i][0]<t1; i++){ out.push([s,a[i][0],v]); s=a[i][0]; v=a[i][1]; } out.push([s,t1,v]); return out; }
function fillSeg(c, X, a, b, y, h, col, txt, alpha){ const xa=X(a), xb=X(b); if (col){ c.globalAlpha=alpha==null?.35:alpha; c.fillStyle=col; c.fillRect(xa, y+3, Math.max(1,xb-xa), h-6); c.globalAlpha=1; }
  if (txt && xb-xa>26){ c.save(); c.beginPath(); c.rect(xa,y,xb-xa,h); c.clip(); c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(txt, Math.max(xa,X(Math.max(a,0)))+4, y+h/2+4); c.restore(); } }
function outSegs(ch, t0, t1){
  const E=emulate(), bp=new Set([t0]);
  for (const n of ['pwr', ch?'c2':'c1', 'pa', 'pb', 'pc', 'sel', 'rst']){ const a=E.sig[n]||[]; let i=idxAt(a,t0)+1; for (; i<a.length && a[i][0]<t1; i++){ bp.add(a[i][0]); if (n==='sel'||n==='rst'){ const u=a[i][0]+C.LOCK_ACQ; if (u<t1) bp.add(u); } } }
  const sa=E.sig.sel||[]; const j=idxAt(sa,t0); if (j>=0){ const u=sa[j][0]+C.LOCK_ACQ; if (u>t0&&u<t1) bp.add(u); }
  for (const e of D.events) if (e.type==='ref'){ for (const u of [e.t, e.t+C.LOCK_ACQ]) if (u>t0&&u<t1) bp.add(u); }
  const arr=[...bp].sort((a,b)=>a-b), out=[];
  for (let i=0;i<arr.length;i++){ const a=arr[i], b=i+1<arr.length?arr[i+1]:t1; if (b<=a) continue; const o=outAt(ch,(a+b)/2), L=out[out.length-1];
    if (L && L[2].st===o.st && L[2].fs===o.fs && L[2].src===o.src) L[1]=b; else out.push([a,b,o]); }
  return out;
}
function spiTx(i){   // the SPI traffic of main pass i, byte by byte (from spi.asm)
  const P=emulate().P, p=P[i]; const out=[]; let tt=p.t; const BY=45*TCY;
  const rd = chip=>{ const L=[[0x20,'o'],[16,'o'],null,[0x21,'o'],[p.rs==null?0x12:p.rs,'i'],null,[0x20,'o'],[6,'o'],null,[0x21,'o'],[0x82,'i']]; const a=tt, bytes=[];
    let u=tt; for (const b of L){ if (!b){ u+=6*TCY; continue; } bytes.push({t:u, v:b[0], d:b[1]}); u+=BY; } tt=a+C.READ_T; out.push({chip, a, b:tt, kind:'read', bytes}); };
  rd(0); rd(0); rd(1); rd(1);
  if (p.chk) tt+=C.STAT_T;
  if (p.rc) return out;
  tt+=C.D2_T;
  for (const chip of [0,1]){ const a=tt, c=chipAt(chip, a+C.REFRESH_T+1e-9), bytes=[]; let u=a;
    for (const [addr,k] of WRITE_ORDER){ const v = k==='r1'?c.r1:k==='r3'?c.r3:k==='r4'?c.r4:REG[k]; for (const b of [0x20, addr, v]){ bytes.push({t:u, v:b, d:'o'}); u+=BY; } u+=(C.REFRESH_T/8 - 3*BY); }
    tt=a+C.REFRESH_T; out.push({chip, a, b:tt, kind:'write', bytes}); }
  return out;
}
function passesIn(t0, t1){ const P=emulate().P; let i=Math.max(0, passAt(t0)); const out=[]; for (; i<P.length && P[i].t<t1; i++) out.push(i); return out; }
function lanes(){
  const E=emulate(), acc=SIM.css('--accent'), acc2=SIM.css('--accent2'), warn=SIM.css('--warn'), bad=SIM.css('--bad'), ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), grid=SIM.css('--grid');
  const PHC = {off:grid, boot:acc2, 'cal-int':bad, 'cal-ext':bad, int:warn, ext:acc};
  const spiLane = chip => (c,X,t0,t1,y,h)=>{
    if (t1-t0 > 0.25){ for (const i of passesIn(t0,t1)){ const p=E.P[i]; c.fillStyle=chip?acc2:acc; c.globalAlpha=.5; c.fillRect(X(p.t), y+5, Math.max(1, X(p.t+C.PASS_T*0.95)-X(p.t)), h-10); c.globalAlpha=1; }
      c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText('2 reads + 1 refresh per pass — zoom to ≤ 100 ms for the transactions', X(t0)+6, y+h/2+4); return; }
    for (const i of passesIn(t0-C.PASS_T, t1)) for (const tx of spiTx(i)){ if (tx.chip!==chip || tx.b<t0 || tx.a>t1) continue;
      fillSeg(c, X, tx.a, tx.b, y, h, tx.kind==='read'?acc2:acc, tx.kind==='read'?'read 16, 6':'refresh8420', .45);
      if (X(tx.bytes[1].t)-X(tx.bytes[0].t) > 26){ c.font='10px '+SIM.css('--mono'); for (const b of tx.bytes){ const x=X(b.t); c.fillStyle=b.d==='i'?bad:ink; c.fillRect(x, y+2, 1, h-4); c.fillText((b.d==='i'?'←':'')+hex2(b.v).slice(2), x+2, y+h-5); } } }
  };
  return [
    {label:'Firmware phase', h:26, draw:(c,X,t0,t1,y,h)=>{ for (const ph of E.ph){ const b=ph.b===undefined?C.HORIZON:ph.b; if (b<t0||ph.a>t1) continue; fillSeg(c,X,Math.max(ph.a,t0),Math.min(b,t1),y,h,PHC[ph.k]||grid, ph.label); } }},
    {label:'Main-loop passes (3.65 ms)', h:26, draw:(c,X,t0,t1,y,h)=>{ const ids=passesIn(t0,t1); const wide = ids.length && (X(t0+C.PASS_T)-X(t0))>60;
      for (const i of ids){ const p=E.P[i]; const x=X(p.t); c.fillStyle=p.ee?warn:p.chk?acc2:ink2; c.fillRect(x, y+(p.chk||p.ee?3:9), p.chk||p.ee?2:1, h-(p.chk||p.ee?6:18));
        if (wide){ c.fillStyle=ink; c.font='10px '+SIM.css('--mono'); c.fillText(`#${i}${p.chk?' REFRESHSTATUS':''}${p.ee?' ee_write':''}${p.rc?' → ref_chk':''}`, x+4, y+h/2+4); } } }},
    {label:'SPI → CS8420 #1 (CS1 · RB0)', h:24, draw:spiLane(0)},
    {label:'SPI → CS8420 #2 (CS2 · RB2)', h:24, draw:spiLane(1)},
    {label:'SCK RB4 / SDO RB3 (bit level)', h:34, draw:(c,X,t0,t1,y,h)=>{ if (t1-t0>4e-4){ c.fillStyle=ink2; c.font='11px '+SIM.css('--mono'); c.fillText('zoom to ≤ 400 µs: 5 instruction cycles (4.07 µs) per bit, MSB first', X(t0)+6, y+h/2+4); return; }
      for (const i of passesIn(t0-C.PASS_T, t1)) for (const tx of spiTx(i)) { if (tx.b<t0||tx.a>t1) continue; for (const b of tx.bytes){ if (b.t+45*TCY<t0||b.t>t1) continue;
        for (let k=0;k<8;k++){ const bt=b.t+k*5*TCY, bit=(b.v>>(7-k))&1; const xa=X(bt), xb=X(bt+5*TCY);
          c.fillStyle=tx.chip?acc2:acc; c.fillRect(X(bt+3*TCY), y+3, Math.max(1,X(bt+4*TCY)-X(bt+3*TCY)), 11);
          c.strokeStyle=b.d==='i'?bad:ink; c.beginPath(); c.moveTo(xa, y+(bit?18:30)); c.lineTo(xb, y+(bit?18:30)); c.stroke();
          if (xb-xa>9){ c.fillStyle=ink2; c.font='9px '+SIM.css('--mono'); c.fillText(bit, xa+2, y+27); } } } } }},
    {label:'Reference plugged (rear)', h:22, draw:(c,X,t0,t1,y,h)=>{ const bp=[t0, ...D.events.filter(e=>e.type==='ref'&&e.t>t0&&e.t<t1).map(e=>e.t), t1];
      for (let i=0;i+1<bp.length;i++){ const r=refAt((bp[i]+bp[i+1])/2); if (r.on) fillSeg(c,X,bp[i],bp[i+1],y,h, r.valid?acc:warn, `${r.port==='bnc'?'BNC 75 Ω':'Phoenix 110 Ω'} · ${fmtRate(r.rate)}${r.valid?'':' · V=1'}`); } }},
    {label:'Receiver enabled: SEL75 RB7 / SEL110 RB6', h:22, draw:(c,X,t0,t1,y,h)=>{ for (const [a,b,v] of segs('sel',t0,t1,'both')) fillSeg(c,X,a,b,y,h, v==='75'?acc2:v==='110'?acc:v==='both'?bad:null, v==='75'?'75 Ω (U14)':v==='110'?'110 Ω (U15)':v==='both'?'both on':''); }},
    {label:'reg 16 at REFRESHSTATUS · bcount', h:26, draw:(c,X,t0,t1,y,h)=>{ for (const i of passesIn(t0,t1)){ const p=E.P[i]; if (!p.chk) continue; const x=X(p.t);
      c.fillStyle = p.re?bad:acc; c.beginPath(); c.arc(x, y+h/2, 4, 0, 7); c.fill(); if (X(p.t+36*C.PASS_T)-x>70){ c.fillStyle=ink; c.font='10px '+SIM.css('--mono'); c.fillText(`${p.re?'UNLK':'LOCK'} bc=${p.bc}`, x+6, y+h/2+4); } } }},
    {label:'LEDs 32 · 44.1 · 48 · 96 (RC1–RC4)', h:32, draw:(c,X,t0,t1,y,h)=>{ for (const [a,b,v] of segs('pc',t0,t1,0)) for (let k=0;k<4;k++){ if (!((v>>(k+1))&1) || !powerAt((a+b)/2)) continue; c.fillStyle='#e0362c'; c.fillRect(X(a), y+3+k*7, Math.max(1,X(b)-X(a)), 5); if (X(b)-X(a)>40){ c.fillStyle=ink; c.font='9px '+SIM.css('--mono'); c.fillText(SRB[k].txt, Math.max(X(a),X(t0))+3, y+8+k*7); } } }},
    {label:'LEDs EXT · INT · CAL (RC5–RC7)', h:26, draw:(c,X,t0,t1,y,h)=>{ const cols=['#2fbf4f','#e7b416','#e0362c'], nm=['EXT','INT','CAL']; for (const [a,b,v] of segs('pc',t0,t1,0)) for (let k=0;k<3;k++){ if (!((v>>(k+5))&1) || !powerAt((a+b)/2)) continue; c.fillStyle=cols[k]; c.fillRect(X(a), y+3+k*7, Math.max(1,X(b)-X(a)), 5); if (X(b)-X(a)>40){ c.fillStyle=ink; c.font='9px '+SIM.css('--mono'); c.fillText(nm[k], Math.max(X(a),X(t0))+3, y+8+k*7); } } }},
    {label:'PLL1700E SR0 · FS0 · FS1 → OMCK', h:22, draw:(c,X,t0,t1,y,h)=>{ const bp=new Set([t0]); for (const n of ['pa','pb','pc']) for (const [a] of segs(n,t0,t1,0)) bp.add(a); const arr=[...bp].sort((a,b)=>a-b);
      for (let i=0;i<arr.length;i++){ const a=arr[i], b=i+1<arr.length?arr[i+1]:t1, m=(a+b)/2; if (!powerAt(m)) continue; const f=pllAt(m); const {pa,pb,pc}=portsAt(m); fillSeg(c,X,a,b,y,h, f?acc2:warn, `${(pb>>5)&1}${(pa>>5)&1}${pc&1} → ${f?fmtRate(f)+' × 256':'not a firmware code'}`, .25); } }},
    {label:'CS8420 #1 transmitter (regs 3/4)', h:22, draw:(c,X,t0,t1,y,h)=>{ for (const [a,b,o] of outSegs(0,t0,t1)) fillSeg(c,X,a,b,y,h, o.st==='running'?acc:o.st==='muted'?warn:o.st==='off'?null:bad, o.st==='off'?'':`${o.st}${o.fs?' · '+fmtRate(o.fs):''}${o.src?' · '+(o.src==='ext'?'reg 4 = 0x49 (ref)':'reg 4 = 0x45 (OMCK)'):''}`); }},
    {label:'AES3 out of CS8420 #1 (frames)', h:24, draw:(c,X,t0,t1,y,h)=>{ for (const [a,b,o] of outSegs(0,t0,t1)){ if (!o.fs || (o.st!=='running' && o.st!=='muted')) continue; const col=o.st==='muted'?warn:acc;
      SIM.pulses(c,X,a,b,y,h,1/o.fs,0,0.25/o.fs,col,o.st==='muted'?'muted frames':'frames'); if (X(a+192/o.fs)-X(a)>8) SIM.pulses(c,X,a,b,y,h,192/o.fs,0,1.5/o.fs,bad,'Z blocks'); } }},
    {label:'ADC 1 samples (LRCK from RMCK)', h:22, draw:(c,X,t0,t1,y,h)=>{ for (const [a,b,o] of outSegs(0,t0,t1)){ if (!o.fs || o.st==='stopped') continue; SIM.pulses(c,X,a,b,y,h,1/o.fs,0,0.5/o.fs,acc2,'LRCK'); } }},
    {label:'STEP switch RA4 (low = pressed)', h:20, draw:(c,X,t0,t1,y,h)=>{ const n=Math.min(4000, Math.max(200, Math.round((X(t1)-X(t0))))); let prev=null, s0=t0; for (let i=0;i<=n;i++){ const tt=t0+(t1-t0)*i/n, v=pressedAt(tt); if (prev===null){ prev=v; continue; } if (v!==prev || i===n){ if (prev) fillSeg(c,X,s0,tt,y,h,bad,'pressed',.6); s0=tt; prev=v; } } }},
    {label:'93LC66 EEPROM (RA1–RA3, DO on RB3)', h:20, draw:(c,X,t0,t1,y,h)=>{ for (const w of E.ee){ if (w.b<t0||w.a>t1) continue; fillSeg(c,X,w.a,Math.max(w.b, w.a+(t1-t0)/300),y,h,warn,`write 0xAAAA, ${hex2(w.sr)}${hex2(w.sr2).slice(2)}`,.8); } }},
  ];
}
function longLanes(){ const L=lanes(); return [L[0], L[6], L[8], L[9], L[11], L[14], L[15]]; }

/* ---------------- AES3 frame at the playhead ---------------- */
const CS0 = 0x81;   // reg 32 = first channel-status byte (V1.02; V1.00 wrote 0x01)
function aesFrame(t){
  const o=outAt(convOfOut(0),t); if (!o.fs || o.st!=='running') return null;
  const n=Math.floor(t*o.fs), fr=n%192, tf=n/o.fs;
  const sub = [0,1].map(s=>{ const v=outSample(0,s,tf)||0; let q=Math.round(v*8388607); if (q<0) q+=1<<24;
    const bits=[]; for (let k=0;k<24;k++) bits.push((q>>k)&1); const cbit = fr<8 ? (CS0>>fr)&1 : 0;
    const vucp=[0,0,cbit]; const par=(bits.reduce((a,b)=>a+b,0)+vucp.reduce((a,b)=>a+b,0))&1; return {pre: s?'Y':(fr===0?'Z':'X'), bits, v:0, u:0, c:cbit, p:par, sample:v}; });
  return {n, fr, fs:o.fs, sub};
}
const PRE = {X:[1,1,1,0,0,0,1,0], Y:[1,1,1,0,0,1,0,0], Z:[1,1,1,0,1,0,0,0]};
function drawScope(cv, el, t){
  const {c,w,h}=SIM.canvas(cv, 120); const F=aesFrame(t); const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), warn=SIM.css('--warn');
  if (!F){ c.fillStyle=ink2; c.font='12px '+SIM.css('--sans'); const o=outAt(convOfOut(0),t); c.fillText(`OUTPUT1 is ${o.st}${o.st==='muted'?' (reg 3 = 0x4A while the firmware calibrates)':''} — no frame to show at the playhead.`, 10, 60); el.innerHTML=''; return; }
  const cells=[]; F.sub.forEach(s=>{ cells.push(...PRE[s.pre].map((v,pi)=>({v, pre:true, pi}))); [...s.bits.slice(0,24), s.v, s.u, s.c, s.p].forEach(b=>{ cells.push({bm:1,b,first:1}); cells.push({bm:1,b}); }); });
  let lvl=0, inv=0; const W=(w-20)/cells.length; c.strokeStyle=acc; c.lineWidth=1.5; c.beginPath(); let x=10;
  const ys=v=>v?20:70;
  cells.forEach((cl,i)=>{ let nv; if (cl.pre){ if (cl.pi===0) inv=lvl; nv = inv ? 1-cl.v : cl.v; } else if (cl.first) nv=1-lvl; else nv = cl.b ? 1-lvl : lvl;
    if (i===0) c.moveTo(x, ys(nv)); else c.lineTo(x, ys(nv)); c.lineTo(x+W, ys(nv)); lvl=nv; x+=W; });
  c.stroke();
  c.fillStyle=ink2; c.font='10px '+SIM.css('--mono');
  [[0,'pre '+F.sub[0].pre],[8,'aux+audio A (24 bits, LSB first)'],[56,'V U C P'],[64,'pre Y'],[72,'audio B'],[120,'VUCP']].forEach(([k,s])=>{ c.fillText(s, 10+k*W+2, 92); c.fillRect(10+k*W, 76, 1, 20); });
  c.fillStyle=warn; c.fillText(`frame ${F.fr}/191 of the block · ${fmtRate(F.fs)} · ${(128*F.fs/1e6).toFixed(3)} Mcell/s`, 10, 112);
  el.innerHTML=`A = ${F.sub[0].sample.toFixed(4)} · B = ${F.sub[1].sample.toFixed(4)} · C bit (frame ${F.fr}) = ${F.sub[0].c} from reg 32 = ${hex2(CS0)} (${inf}: the CS8420 sends its C buffer)`;
}

/* ---------------- shared bits for the views ---------------- */
function card(title, body){ return `<div class="card"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ const l=D.log[0]; return l ? `<div><b>${l.name}</b> at ${SIM.fmtT(l.t)}</div>`+l.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Press STEP, plug a reference or switch the power. The firmware path the emulator took is listed here, with time offsets after your action.</div>'; }
function scenarioHTML(){ return `<label class="small">Scenario <select class="p14scn">${Object.keys(SCEN).map(k=>`<option value="${k}" ${k===D.scenario?'selected':''}>${SCEN[k].name}</option>`).join('')}</select></label> <button class="p14clr">Clear my actions</button>`; }
function bindScenario(m){ m.querySelectorAll('.p14scn').forEach(s=>s.onchange=e=>A.scenario(e.target.value)); m.querySelectorAll('.p14clr').forEach(b=>b.onclick=()=>A.clear()); }
const FLAGN = ['0 ref change pending','1 locked on ext ref','2 locked on local osc','3 skip status (delay_2)','4 —','5 SPI read error','6 use local osc','7 no lock → change_ref'];
const PFN = ['0 new press','1 wait release','2 save pending','3 —','4 —','5 —','6 EEPROM valid','7 ee check done'];
const bitsList = (v, names)=> names.map((n,i)=> (v>>i)&1 ? `<span class="chip">${n}</span>` : '').join('') || '<span class="muted">none</span>';
function inspectorHTML(t){
  const E=emulate(), ph=phaseAt(t), st=stepAt(t), i=passAt(t), p=i>=0?E.P[i]:null, {pa,pb,pc}=portsAt(t), c1=chipAt(0,t), c2=chipAt(1,t), o1=outAt(convOfOut(0),t), o2=outAt(convOfOut(1),t);
  const lastEE = E.ee.filter(w=>w.b<=t).pop();
  return `<table class="kv">
    <tr><th>Phase</th><td>${ph?ph.label:'—'}</td></tr>
    <tr><th>Main loop</th><td class="mono">${st.step>=0?`pass #${st.pass} · ${STEPS[st.step][0]}<br><span class="muted">${STEPS[st.step][2]}</span>`:'— (not in main)'}</td></tr>
    <tr><th>flag</th><td>${p&&powerAt(t)?bitsList(p.f, FLAGN):'—'}</td></tr>
    <tr><th>press_flag</th><td>${p&&powerAt(t)?bitsList(p.pf, PFN):'—'}</td></tr>
    <tr><th>Counters (after pass)</th><td class="mono">${p&&powerAt(t)?`bcount ${p.bc} · output ${p.out} · rem0 ${p.r0} · rem1 ${p.r1} · rem2 ${p.r2} · rem4 ${p.r4}`:'—'}</td></tr>
    <tr><th>sample_rate</th><td class="mono">${p?`${hex2(p.sr)} (${bin8(p.sr)}) → ${SRB[srIndex(p.sr)].txt} kHz · sample_rate2 ${hex2(p.sr2)}`:'—'}</td></tr>
    <tr><th>PORTA / B / C</th><td class="mono">${bin8(pa)} · ${bin8(pb)} · ${bin8(pc)}</td></tr>
    <tr><th>CS8420 #1 / #2 regs 1·3·4</th><td class="mono">${hex2(c1.r1)} ${hex2(c1.r3)} ${hex2(c1.r4)} · ${hex2(c2.r1)} ${hex2(c2.r3)} ${hex2(c2.r4)}</td></tr>
    <tr><th>Receiver</th><td>${sv('sel',t,'both')} · reference ${refLockedAt(t)?'<b>seen by the CS8420s</b>':'not seen'}</td></tr>
    <tr><th>OUTPUT1 / OUTPUT2</th><td class="mono">${o1.st}${o1.fs?' '+fmtRate(o1.fs):''} · ${o2.st}${o2.fs?' '+fmtRate(o2.fs):''}</td></tr>
    <tr><th>93LC66</th><td class="mono">${lastEE?`written ${SIM.fmtT(lastEE.a)}: 0xAAAA, ${hex2(lastEE.sr)}${hex2(lastEE.sr2).slice(2)}`:(D.init.ee&&D.init.ee.valid===false?'blank':'factory contents (valid, 0xAAAA)')}</td></tr></table>`;
}

/* ---------------- SIMULATOR tab ---------------- */
function viewSim(m){
  window.__pod14Keys = true; m._ck=m._ik=null;
  m.innerHTML = `<div class="grid2"><div>
      ${card('Front panel at the playhead', `<div id="fp"></div><div id="ctl"></div>`)}
      ${card('Rear panel — click the REF BNC or Phoenix, the input blocks, the trims (dashed ring = receiver enabled)', `<div id="rp"></div><div class="small muted" style="margin-top:4px">Front and rear artwork: ${SIM.src('#POD #SERIES/POD4 - #Master/POD4 - #Engineering/SILK/POD14SLK_CURVE.cdr','POD4 - #Engineering/SILK/POD14SLK_CURVE.cdr')} (2001-03-21), WHITE and GREEN plates; the trim letters R / L are live text in the file and are set in Arial here.</div><div id="ins" style="margin-top:8px"></div>`)}
    </div><div>
      ${card('What the firmware did (emulated V1.02, last action)', `<div style="margin-bottom:6px">${scenarioHTML()}</div><div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
    </div></div>
  ${card('Timeline — zoomable (click to seek; transport above). The emulation runs 24 s: the start-up and the EEPROM save are long.', `<canvas id="tl"></canvas>
    <p class="small muted">A main-loop pass is ${(C.PASS_T*1000).toFixed(2)} ms: ${CY.READ*4+CY.REFRESH*2+CY.D2+CY.MISC} instruction cycles counted from the listing × ${(TCY*1e9).toFixed(1)} ns (X2 = 4.9152 MHz). The cycle counts are ${inf}; the order, counters and decisions are the firmware's.</p>`)}
  ${card('All 24 s', `<canvas id="tl24"></canvas>`)}
  <div class="grid2">${card('Scope: OUTPUT1 at the playhead (one AES3 frame, biphase-mark)', `<canvas id="scope"></canvas><div id="bits" class="small mono"></div>`)}
    ${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#fp').innerHTML=frontSVG(t); m.querySelector('#rp').innerHTML=rearSVG(t); bindPanel(m.querySelector('#fp')); bindPanel(m.querySelector('#rp'));
    const ck=JSON.stringify([refAt(t), powerAt(t), D.refRate, D.refValid, D.iss]); if (ck!==m._ck){ m._ck=ck; m.querySelector('#ctl').innerHTML=controlsHTML(); bindControls(m.querySelector('#ctl')); }
    const ik=JSON.stringify([D.inputs, D.trim, D.iss]); if (ik!==m._ik){ m._ik=ik; m.querySelector('#ins').innerHTML=inputsHTML(); bindInputs(m.querySelector('#ins')); }
    m.querySelector('#insp').innerHTML=inspectorHTML(t); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#log').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('')||'<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220});
    SIM.drawLanes(m.querySelector('#tl24'), longLanes(), {labelW:220, range:[0, C.HORIZON]});
    drawScope(m.querySelector('#scope'), m.querySelector('#bits'), t);
  };
  bindScenario(m); SIM.on('time', draw);
}

/* ---------------- TUTORIAL ---------------- */
const lastPass = ()=>{ const P=emulate().P; return P.length?P[P.length-1]:null; };
const userEv = type => D.events.filter(e=>e.user && e.type===type);
const LESSONS = [
  {title:'Meet the POD14', body:`<p>The POD14 (${Y(2001)}) is a half-rack <b>dual analog-to-AES/EBU converter</b>: "ready for use in 75 or 110 Ohm installations … sampling rates of 32, 44.1, 48 and 96 kHz using its internal oscillator. Alternatively the sampling rate … may be referenced to an external reference source" (manual, July 2002).</p>
    <p><b>Front:</b> power switch with LED, a momentary <b>step switch</b>, four red rate LEDs, green <b>EXT REF</b>, yellow <b>INT REF</b> and a red <b>CAL</b> LED. <b>Rear:</b> Phoenix analog inputs with four trims, REFERENCE INPUT on BNC (75 Ω) <i>and</i> Phoenix (110 Ω), two outputs on BNC and Phoenix, AC inlet and fuse.</p><p class="muted">Hover the panels. Click Next.</p>`, check:()=>true, auto:true},
  {title:'1 · Power it up', body:`<p>"Simply plug the unit in." Load the cold start: <button data-scn="cold">Power-up from cold</button></p><p>Watch the 24 s timeline. EXT and INT light together (lamp test), the firmware listens on the 110 Ω input, then on the 75 Ω input, and calibrates. With nothing plugged in, V1.02 takes about <b>${(102*C.IDELAY_T).toFixed(0)} s</b> to reach the main loop.</p><p><b>Goal:</b> playhead after the start-up, with INT REF lit.</p>`,
    check:()=> emulate().boots.length>0 && phaseAt(SIM.t).k==='int' && ledsAt(SIM.t).I===1, hint:'Load the scenario, set the zoom to 24 s and drag the slider to about 22 s.'},
  {title:'2 · Choose the internal rate', body:`<p>Each press of the step switch advances the rate: 32 → 44.1 → 48 → 96 → 32 kHz. <span class="mono">switch_press</span> wants RA4 low for 21 passes in a row (≈${(21*C.PASS_T*1000).toFixed(0)} ms) before it counts.</p><p><b>Goal:</b> light the <b>96</b> LED (start from <button data-scn="run48">Running on internal 48 kHz</button>).</p>`, check:()=>{ const p=lastPass(); return p && srIndex(p.sr)===3 && !(p.f&2); }, hint:'Click the step switch on the front panel (or press S).'},
  {title:'3 · Watch it calibrate', body:`<p>When you let go (31 passes released), <span class="mono">switch_debounce</span> sets <span class="mono">flag,0</span> and the main loop runs <span class="mono">ref_chk → local_osc1</span>: both CS8420s are stopped and muted, CAL and INT light, and <span class="mono">DELAY</span> counts about 64 000 loops (≈${(63969*C.DCALL_T).toFixed(1)} s). "A calibrate LED illuminates on startup or when the sample rate is switched."</p><p><b>Goal:</b> put the playhead where CAL is lit after your press.</p>`, check:()=> userEv('press').length>0 && ledsAt(SIM.t).C===1 && SIM.t>userEv('press')[0].t, hint:'Scrub forward 0.4–2.5 s after your press; the red band in “Firmware phase”.'},
  {title:'4 · Back to the house rate', body:`<p>Set the internal rate back to <b>48 kHz</b>. Each press restarts the calibration.</p><p><b>Goal:</b> 48 lit.</p>`, check:()=>{ const p=lastPass(); return p && srIndex(p.sr)===2; }, hint:'Keep pressing: 96 → 32 → 44.1 → 48.'},
  {title:'5 · Connect house sync', body:`<p>Plug a 48 kHz reference into the <b>REF BNC</b>. "As soon as an external reference signal is detected POD14 will automatically switch to it." Watch how soon: while unlocked, <span class="mono">change_ref</span> swaps the 75 Ω and 110 Ω receivers on every status check (every 36 passes, ≈${(36*C.PASS_T*1000).toFixed(0)} ms); once the CS8420s see the reference, <span class="mono">debounce</span> wants 15 checks in a row (≈${(15*36*C.PASS_T).toFixed(1)} s), and <span class="mono">ext_ref1</span> then calibrates for ≈${(30*C.IDELAY_T).toFixed(1)} s.</p><p><b>Goal:</b> locked on the BNC (EXT REF lit) by the end of the 24 s.</p>`, check:()=>{ const p=lastPass(), r=refAt(C.HORIZON); return p && (p.f&2) && r.on && r.port==='bnc'; }, hint:'Click the left BNC on the rear panel (or press R).'},
  {title:'6 · What the LEDs show on external', body:`<p>On external reference <span class="mono">ext_ref1</span> writes PORTC = 1010 0000: the rate LEDs go <b>dark</b> and stay dark, because the main loop jumps back before <span class="mono">led_output</span> while <span class="mono">flag,1</span> is set. Press STEP now: nothing happens. (The POD14A, by contrast, keeps the stored rate lit.)</p><p><b>Goal:</b> EXT REF lit, no rate LED lit, playhead after a press you made while locked.</p>`, check:()=>{ const pr=userEv('press').filter(e=>sv('mode',e.t,'')==='ext'); const L=ledsAt(SIM.t); return pr.length>0 && L.E && !L.r.some(x=>x) && SIM.t>pr[pr.length-1].t; }, hint:'Move the playhead into the EXT section, press S, scrub a little later.'},
  {title:'7 · Pull the reference', body:`<p>Unplug the reference. The firmware does not drop it at once: 15 failed checks (≈2 s), then <span class="mono">ref_chk → local_osc1</span> (another CAL), then back on the local oscillator at the stored rate with INT REF lit.</p><p><b>Goal:</b> running on internal with no reference at 24 s.</p>`, check:()=>{ const p=lastPass(); return p && !(p.f&2) && !refAt(C.HORIZON).on && userEv('ref').length>1; }, hint:'Press U or click the BNC again.'},
  {title:'8 · A programme feed as reference', body:`<p>Tick <b>V bit set</b> and plug the cable into the <b>Phoenix</b>. <span class="mono">REFRESHSTATUS</span> only tests bit 4 (UNLOCK) and bit 1 (BIP) of register 16: the validity bit is read and ignored, so the POD14 locks to it. (The POD14A refuses such a feed.)</p><p><b>Goal:</b> locked on the Phoenix with the V bit set.</p>`, check:()=>{ const r=refAt(C.HORIZON), p=lastPass(); return r.on && !r.valid && r.port==='phx' && p && (p.f&2); }, hint:'Tick “V bit set”, then Ref → Phoenix (P).'},
  {title:'9 · Calibrate an input', body:`<p>"The input trim controls may be used to set POD14 up for a different nominal digital output signal." Set INPUT1 LEFT to <b>+8 dBu</b> and trim <b>RV5</b> (second hole from the left on the rear) until it reads −20.0 dBFS again.</p>`, check:()=> D.inputs[0].L.on && D.inputs[0].L.dbu===8 && Math.abs(dbfs(0,0)+20)<0.051, hint:()=>`INPUT1 LEFT reads ${dbfs(0,0).toFixed(2)} dBFS.`},
  {title:'10 · Wait for the save', body:`<p>The rate is saved to the 93LC66 only after <span class="mono">rem2</span> and <span class="mono">rem4</span> run out: <span class="mono">rem4</span> counts once per 256 passes, so a save needs about <b>${((128+20*256)*C.PASS_T).toFixed(0)} s</b> of main-loop time after the release (the CAL wait does not count, a new press restarts it, and nothing is saved while on the external reference). Load <button data-scn="step">STEP at 100 ms</button> and find the write on the EEPROM lane.</p><p><b>Goal:</b> playhead after an EEPROM write.</p>`, check:()=> emulate().ee.some(w=>w.b<=SIM.t), hint:'Zoom to 24 s and scrub towards the end.'},
  {title:'Done', body:`<p>You have used everything on the POD14. <b>Software</b> follows the main loop, the CS8420 registers and the counters; <b>One second</b> breaks it down to bus bytes and AES bit cells; <b>Findings</b> lists what the code does that the manual does not say, and how POD14 became POD14A.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function resetAll(){ loadScenario('run48'); D.refRate=48000; D.refValid=true; D.trim=[0,0,0,0]; D.iss=2;
  D.inputs=[ {L:{on:true, dbu:4, f:1000}, R:{on:true, dbu:4, f:400}}, {L:{on:true, dbu:-6, f:1000}, R:{on:false, dbu:4, f:1000}} ]; D.log=[]; }
function viewTutorial(m){
  window.__pod14Keys = true; m._ck=null;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — operating the POD14 (manual + firmware)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The unit at the playhead', `<div id="fp"></div><div id="ctl"></div><div id="rp" style="margin-top:8px"></div><div id="lv" class="small mono" style="margin-top:6px"></div>`)}${card('Timeline', `<canvas id="tl"></canvas>`)}</div></div>`;
  const hot=`<g><rect x="120" y="45" width="210" height="200" fill="transparent"><title>Power switch and power LED</title></rect><rect x="670" y="170" width="90" height="100" fill="transparent"><title>Step switch: internal sample rate</title></rect><rect x="800" y="130" width="230" height="120" fill="transparent"><title>SAMPLE RATE LEDs (dark while on the external reference)</title></rect><rect x="1085" y="130" width="160" height="180" fill="transparent"><title>EXT REF (green) · INT REF (yellow) · CAL (red): calibration after start-up, a rate change or a reference change</title></rect></g>`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#fp').innerHTML=frontSVG(t,{hot}); m.querySelector('#rp').innerHTML=rearSVG(t); bindPanel(m.querySelector('#fp')); bindPanel(m.querySelector('#rp'));
    const ck=JSON.stringify([refAt(t), powerAt(t), D.refRate, D.refValid, D.iss]); if (ck!==m._ck){ m._ck=ck; m.querySelector('#ctl').innerHTML=controlsHTML(); bindControls(m.querySelector('#ctl')); }
    const o=outAt(convOfOut(0),t); m.querySelector('#lv').textContent=`INPUT1 LEFT ${D.inputs[0].L.on?dbfs(0,0).toFixed(2)+' dBFS':'—'} (RV5 ${D.trim[1]>=0?'+':''}${D.trim[1].toFixed(2)} dB) · OUTPUT1 ${o.st}${o.fs?' '+fmtRate(o.fs):''}`;
    m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#lessons').innerHTML=LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=>li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx], ok=L.check(), hint=typeof L.hint==='function'?L.hint():L.hint;
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelectorAll('#lesson [data-scn]').forEach(b=>b.onclick=()=>A.scenario(b.dataset.scn));
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ resetAll(); lessonIdx=0; SIM.seek(0); };
    const Ls=lanes(); SIM.drawLanes(m.querySelector('#tl'), [Ls[0],Ls[6],Ls[7],Ls[8],Ls[9],Ls[11],Ls[14],Ls[15]], {labelW:200});
  };
  SIM.on('time', draw);
}

/* ---------------- ONE SECOND tab ---------------- */
function viewAnatomy(m){
  window.__pod14Keys = true;
  m.innerHTML=`${card('One second of a POD14, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">${card('As seen by the device', `<div id="dev"></div>`)}${card('As seen by the displays', `<div id="fp"></div><h3>Downstream: a meter on OUTPUT1</h3><canvas id="meter"></canvas><p class="small muted">Peak over the last 10 ms, −60 … 0 dBFS, mark at the −20 dBFS alignment level (meter ballistics ${inf}).</p>`)}</div>
  ${card('Zoom ladder at the playhead: 1 s · 20 ms · 400 µs', `<canvas id="z1"></canvas><canvas id="z2" style="margin-top:8px"></canvas><canvas id="z3" style="margin-top:8px"></canvas>`)}`;
  const draw=()=>{ const t=SIM.t, o=outAt(convOfOut(0),t), fs=o.fs||48000, pps=1/C.PASS_T;
    const rows=[
      ['PIC16C73A instruction cycles', (FOSC/4).toLocaleString(), SIM.fmtDur(TCY), 'X2 4.9152 MHz ÷ 4 (BOM). The project file says 4 MHz, the IDELAY comment 3.8 MHz.'],
      ['Main-loop passes', pps.toFixed(0), SIM.fmtDur(C.PASS_T), `${CY.READ*4+CY.REFRESH*2+CY.D2+CY.MISC} cycles (${inf} count)`],
      ['CS8420 status reads (reg 16 + reg 6)', (4*pps).toFixed(0), '4 per pass', 'read8420 × 2 per chip: the first is a dummy'],
      ['CS8420 control-register writes', (16*pps).toFixed(0), '16 per pass', 'refresh8420 rewrites all 8 registers of both chips on every pass'],
      ['SPI bytes on RB3/RB4', (80*pps).toFixed(0), '80 per pass', '48 written + 32 for the reads; bit-banged, 5 cycles (4.07 µs) per bit'],
      ['REFRESHSTATUS', (pps/36).toFixed(1), SIM.fmtDur(36*C.PASS_T), 'delay_2: output 220 → 255 → 0 lets one pass in 36 through'],
      ['75/110 receiver swaps while hunting', (pps/36).toFixed(1), SIM.fmtDur(36*C.PASS_T), 'change_ref, one per failed status check'],
      ['Reference debounce', '—', SIM.fmtDur(15*36*C.PASS_T), 'bcount 15 checks in a row'],
      ['STEP press / release recognised', '—', `${SIM.fmtDur(21*C.PASS_T)} / ${SIM.fmtDur(31*C.PASS_T)}`, 'rem0 235→0, rem1 225→0 (inside the CAL loop: 21 / 31 × 36 µs)'],
      ['CAL, local / external', '—', `${(63969*C.DCALL_T).toFixed(2)} s / ${(30*C.IDELAY_T).toFixed(2)} s`, 'dloop1 → DELAY (10 × 25 × 256 calls) / idelay × 3 at count3 = 10'],
      ['EEPROM save after a release', '—', `≈ ${((128+20*256)*C.PASS_T).toFixed(0)} s + CAL`, 'rem2 to 0, then rem4 once per 256 passes (235 → 0); counts only in the main loop'],
      ['AES3 blocks', (fs/192).toFixed(1), SIM.fmtDur(192/fs), '192 frames, Z preamble'],
      ['AES3 frames = ADC samples', fs.toLocaleString(), SIM.fmtDur(1/fs), 'CS5394/96 LRCK → CS8420 serial input'],
      ['AES3 bit cells', (128*fs).toLocaleString(), SIM.fmtDur(1/(128*fs)), 'biphase-mark, 64 bits per frame'],
      ['PLL1700E SCKO → OMCK', (256*fs).toLocaleString(), SIM.fmtDur(1/(256*fs)), `from X1 27 MHz; 256 fs is ${inf}`],
    ];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who / where</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">At the playhead OUTPUT1 is ${o.st}${o.fs?' at '+fmtRate(o.fs):''}. Use Step on the transport to move one pass, one AES frame or one status check at a time.</p>`;
    const st=stepAt(t), F=aesFrame(t), ph=phaseAt(t), c1=chipAt(0,t);
    const txs = st.pass>=0 ? spiTx(st.pass).filter(x=>x.a<=t&&x.b>t) : [];
    m.querySelector('#dev').innerHTML=`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>PIC</th><td class="mono">${!powerAt(t)?'off':st.step>=0?`pass #${st.pass}: ${STEPS[st.step][0]}<br><span class="muted">${STEPS[st.step][2]}</span>`:ph.label}</td></tr>
      <tr><th>SPI</th><td class="mono">${txs.length?txs.map(x=>`CS8420 #${x.chip+1} ${x.kind}: `+x.bytes.map(b=>`<span style="${b.t<=t&&b.t+45*TCY>t?'font-weight:700;color:var(--accent)':''}">${b.d==='i'?'←':''}${hex2(b.v).slice(2)}</span>`).join(' ')).join('<br>'):'idle'}</td></tr>
      <tr><th>CS8420 #1</th><td class="mono">reg1 ${hex2(c1.r1)} · reg3 ${hex2(c1.r3)}${c1.r3===REG.r3mute?' (mute)':''} · reg4 ${hex2(c1.r4)}${c1.r4===0?' (stopped)':c1.r4===REG.r4def?' (ref)':' (OMCK)'}</td></tr>
      <tr><th>PLL1700E</th><td class="mono">${powerAt(t)?fmtRate(pllAt(t))+' family':'off'}</td></tr>
      <tr><th>OUTPUT1 frame</th><td class="mono">${F?`${F.fr}/191 · A=${F.sub[0].sample.toFixed(4)} B=${F.sub[1].sample.toFixed(4)} · preamble ${F.sub[0].pre}`:'—'}</td></tr></table>`;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    const {c,w:W}=SIM.canvas(m.querySelector('#meter'), 74);
    [0,1].forEach(sd=>{ let pk=0, any=false; for (let i=0;i<64;i++){ const v=outSample(0,sd,Math.max(t,0.01)-0.01*i/64); if (v!=null){ any=true; pk=Math.max(pk,Math.abs(v)); } }
      const db=pk>0?20*Math.log10(pk):-99, segsN=46, lit=Math.max(0,Math.min(segsN,Math.round((db+60)/60*segsN)));
      for (let s=0;s<segsN;s++){ const x=10+s*(W-20)/segsN; c.fillStyle=s<lit?(s>=segsN-4?'#e3453a':s>=segsN-12?'#e8b23a':'#3fbf5f'):SIM.css('--grid'); c.fillRect(x,8+sd*30,(W-20)/segsN-2,22); }
      const xm=10+(40/60)*(W-20); c.fillStyle=SIM.css('--ink'); c.fillRect(xm-1,4+sd*30,2,30); c.font='11px '+SIM.css('--mono'); c.fillText((sd?'B ':'A ')+(any?(db>-99?db.toFixed(1)+' dBFS':'silence'):'no signal'),12,23+sd*30); });
    const Ls=lanes(); const zl=(id, w, pick)=>{ let a=Math.max(0,t-w/2); if (a+w>C.HORIZON) a=C.HORIZON-w; SIM.drawLanes(m.querySelector(id), pick.map(i=>Ls[i]), {labelW:200, range:[a,a+w]}); };
    zl('#z1', 1, [0,1,6,7,9]); zl('#z2', 0.02, [1,2,3,11,12]); zl('#z3', 0.0004, [2,3,4,12]);
  };
  SIM.on('time', draw);
}

/* ---------------- BLOCK DIAGRAM ---------------- */
const BLK = {
  ain1:['ANALOG INPUT 1 (L/R)','TB1/TB2 Phoenix → H5/P5 (A1±, B1±). 24 kΩ balanced, max +24 dBu (manual).'],
  ain2:['ANALOG INPUT 2 (L/R)','TB3/TB4 → H4/P4 (A2±, B2±).'],
  amp1:['U5/U6 NE5532 + RV5/RV6','Balanced input stage per channel, 10K0 / 4K7 network, 20 k multiturn trim in the gain leg (R47 4K7 + RV5). Feeds the ADC through 150 Ω (R45/R46) with 6n8 across (C40) and 68 Ω (R49). Exact topology: '+inf+' from the netlist.'],
  amp2:['U7/U8 NE5532 + RV7/RV8','Same for input 2 (R63/R75 4K7 + RV7/RV8).'],
  adc1:['U1 CS5394 (ISS1) / CS5396 (ISS2 BOM value)','24-bit delta-sigma ADC. MCLK (pins 7, 20) = MCLK1 from CS8420 #1 RMCK (pin 10); LRCK1/SCLK1/SDATA1 (pins 13/14/16) into the CS8420 serial input. Pin 10 = CAL net from the PIC (RC7). ISS2: pin 19 PDN driven by Q1 from RESET.'],
  adc2:['U2 CS5394 / CS5396','Converter 2, clocked from CS8420 #2 (MCLK2, LRCK2, SCLK2, SDATA2).'],
  cs1:['U3 CS8420 (ISS1) / CS8427 value (ISS2)','AES3 transceiver with SRC. Control port in SPI mode: CS1 (RB0), CCLK (RB4), CDIN (RB3), CDOUT → RB1. Receiver RXP (pin 4) on the shared REF net; OMCK (pin 21) from the PLL1700E; TXP (pin 26) → R11/R17 → EL2280.'],
  cs2:['U9 CS8420 / CS8427','Second transceiver, CS2 (RB2). Same REF net, same OMCK.'],
  drv:['U11 EL2280C (ISS2 2007 BOM: EL5263IS)','Dual line driver from the CS8420 TXP pins: R15/R7 75 Ω → BNC outputs, R16/R8 → T4/T5 PE-65612 → 110 Ω Phoenix outputs. −5 V from REG5 7905.'],
  out:['OUTPUT 1 / OUTPUT 2','BNC2/TB6 (OUT1) and BNC3/TB7 (OUT2) via H2/H1 → P2/P1. ISS1 netlist: CS8420 #1 → OUT2 (crossed); ISS2 swaps R11/R17 so INPUT1 → OUTPUT1.'],
  ref:['REFERENCE INPUT','BNC1 → T1 → 75 R (R1) → U14 75176 (/RE = SEL75 RB7) and TB5 → T2 → 110 R (R3) → U15 75176 (/RE = SEL110 RB6). Both receiver outputs (pin 1) share the REF net → C10/C13 → RXP of both CS8420s. The firmware enables one at a time and swaps them while unlocked.'],
  pll:['U4 PLL1700E + X1 27 MHz','Audio clock synthesiser. SR (pin 1) ← RB5, FS0 (19) ← RA5, FS1 (20) ← RC0. Pin 14 → OMCK of both CS8420s. Runs partly from LM1117-3.3 (pins 16/18).'],
  pic:['U10 PIC16C73 (ISS1) / PIC16F73 (ISS2) + X2 4.9152 MHz','V1.02 firmware (MPASM, target 16C73A). Polls everything; no interrupts. Drives the LEDs (RC1–RC7), PLL pins, receiver selects, CS8420 SPI, 93LC EEPROM (RA1–RA3, DO on RB3).'],
  ee:['U12 93LC46 (ISS1) / 93LC66 (ISS2)','Microwire EEPROM: CS RA3, CLK RA2, DI RA1, DO → RB3 (shared with the CS8420 CDIN line). Word 0 = 0xAAAA marker, word 1 = sample_rate:sample_rate2.'],
  ui:['Front panel','SW1 → RA4 (10 k pull-up), PWRLED from +VA (R27 1 k), SR32/44/48/96 + CAL red, EXTREF green, INTREF yellow, 330 Ω each (R32–R38).'],
  psu:['Power','ACIN1 PAN356 → PWRSW1 → T3 TE70041 (dual primary, 0 Ω links "1/2/3" select 115/230 V) → D5–D8 → 2200 µF → ±VA (op-amps) → REG1/REG2 7805 (+5V1/+5V2 per converter), REG4 7805 (+5V3 digital), REG5 7905 (−5 V), REG3 LM1117-3.3.'],
};
function viewBlock(m){
  window.__pod14Keys = false;
  m.innerHTML=`<div class="grid2">${card('Block diagram (click a block) — clock path at the playhead highlighted', `<div id="bd"></div>`)}${card('Block', `<div id="bi" class="small"></div>`)}</div>
    ${card('From the archive', `<p class="small">Functional diagram (<span class="mono">POD14 - Functional Diagram.pdf</span>): ANALOG INPUT A/B → ADC A/B → AES TRANSCEIVER → A/B AES OUTPUT 75 Ω / 110 Ω; EXT REF INPUT 75 Ω / 110 Ω; PLL + XTAL; MICRO CONTROLLER with SAMPLE RATE SELECT and TALLIES EXT REF (GN), INT REF (YL), CAL (R), 32/44.1/48/96 kHz. Part numbers and nets: <span class="mono">ARCHIVE/POD14.net</span> (ISS1) and <span class="mono">POD14iss2.net</span> (ISS2).</p>`)}`;
  let sel='pic';
  const box=(id,x,y,w,h,act)=>{ const [t1]=BLK[id]; const ls=id==='out'?'OUTPUT 1/2':t1.split(' + ')[0].split(' (')[0]; return `<g data-b="${id}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${act?'color-mix(in srgb,var(--accent) 22%,var(--panel))':'var(--panel2)'}" stroke="${id===sel?'var(--accent)':'var(--line)'}" stroke-width="${id===sel?2.5:1.2}"/><text x="${x+w/2}" y="${y+h/2+4}" text-anchor="middle" font-size="11" fill="var(--ink)">${ls}</text></g>`; };
  const ar=(x1,y1,x2,y2,on,lab)=>`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${on?'var(--accent)':'var(--ink2)'}" stroke-width="${on?2.5:1.2}" marker-end="url(#p14ar)" fill="none"/>${lab?`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-3}" font-size="9" fill="var(--accent2)">${lab}</text>`:''}`;
  const draw=()=>{ const t=SIM.t, o=outAt(0,t), ext=o.src==='ext', run=o.st==='running'||o.st==='muted';
    m.querySelector('#bd').innerHTML=`<svg viewBox="0 0 760 480" style="width:100%"><defs><marker id="p14ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      ${box('ain1',10,20,110,40)}${box('amp1',140,20,120,40)}${box('adc1',280,20,110,40,run)}${box('cs1',420,20,120,40,run)}
      ${box('ain2',10,110,110,40)}${box('amp2',140,110,120,40)}${box('adc2',280,110,110,40,run)}${box('cs2',420,110,120,40,run)}
      ${box('drv',570,65,80,40)}${box('out',670,65,80,40)}
      ${box('ref',420,210,120,40,ext&&run)}${box('pll',280,210,110,40,!ext&&run)}${box('pic',140,300,160,46)}${box('ee',10,300,110,40)}${box('ui',140,400,160,40)}${box('psu',420,330,120,40)}
      ${ar(120,40,140,40)}${ar(260,40,280,40)}${ar(390,40,420,40,run,'SDATA1')}${ar(120,130,140,130)}${ar(260,130,280,130)}${ar(390,130,420,130,run,'SDATA2')}
      ${ar(540,40,570,75,run,'TXP')}${ar(540,130,570,95,run)}${ar(650,85,670,85,run)}
      ${ar(480,210,480,150,ext&&run,'REF → RXP')}${ar(390,230,430,150,!ext&&run,'OMCK')}${ar(420,60,370,60,run)}
      <text x="345" y="76" font-size="9" fill="var(--accent2)">RMCK → MCLK</text>
      ${ar(250,300,450,150,false,'SPI CS1/CS2')}${ar(240,300,320,250,false,'FS0 FS1 SR0')}${ar(300,315,440,250,false,'SEL75/SEL110')}${ar(140,323,120,323)}${ar(220,400,220,346)}${ar(220,346,220,400,false)}
      ${ar(200,300,330,60,false,'CAL')}
      <text x="330" y="470" font-size="10" fill="var(--ink2)">${!powerAt(t)?'Power off.':ext?'Clock from the reference: RXP → recovered clock → RMCK → ADC MCLK.':'Clock from the PLL1700E: OMCK → RMCK (reg 1 bit 7 set) → ADC MCLK (inferred).'}</text></svg>`;
    m.querySelectorAll('#bd [data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLK[sel]; m.querySelector('#bi').innerHTML=`<h3>${b[0]}</h3><p>${b[1]}</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- SCHEMATICS (redrawn) ---------------- */
function ic(x, y, w, ref, part, L, R, pitch){ pitch=pitch||16; const n=Math.max(L.length,R.length), h=n*pitch+22;
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel)" stroke="var(--ink)"/><text x="${x+w/2}" y="${y+14}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--ink)">${ref} ${part}</text>`;
  L.forEach(([p,nm,net],i)=>{ const yy=y+28+i*pitch; s+=`<line x1="${x-26}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+4}" y="${yy+4}" font-size="9.5" fill="var(--ink)">${nm}</text><text x="${x-4}" y="${yy-2}" text-anchor="end" font-size="8.5" fill="var(--ink2)">${p}</text>${net?`<text x="${x-30}" y="${yy+4}" text-anchor="end" font-size="9.5" fill="var(--accent2)">${net}</text>`:''}`; });
  R.forEach(([p,nm,net],i)=>{ const yy=y+28+i*pitch; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+26}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-4}" y="${yy+4}" text-anchor="end" font-size="9.5" fill="var(--ink)">${nm}</text><text x="${x+w+4}" y="${yy-2}" font-size="8.5" fill="var(--ink2)">${p}</text>${net?`<text x="${x+w+30}" y="${yy+4}" font-size="9.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s; }
const txt=(x,y,s,o)=>`<text x="${x}" y="${y}" font-size="${(o&&o.fs)||10}" fill="${(o&&o.c)||'var(--ink)'}" ${o&&o.a?`text-anchor="${o.a}"`:''}>${s}</text>`;
const SHEETS = [
  {name:'Controller (U10, U12, front panel)', svg:()=> ic(330,40,170,'U10','PIC16C73 / 16F73',
      [[1,'MCLR','+5V3'],[2,'RA0','RESET'],[3,'RA1','EE DI'],[4,'RA2','EE CLK'],[5,'RA3','EE CS'],[6,'RA4','STEP (SW1)'],[7,'RA5','FS0'],[8,'VSS','GNDD'],[9,'OSC1','X2'],[10,'OSC2','X2 4.9152M'],[11,'RC0','FS1'],[12,'RC1','32'],[13,'RC2','44'],[14,'RC3','48']],
      [[28,'RB7','SEL75'],[27,'RB6','SEL110'],[26,'RB5','SR0'],[25,'RB4','SCK'],[24,'RB3','SDO (+EE DO)'],[23,'RB2','CS2'],[22,'RB1','SDI'],[21,'RB0','CS1'],[20,'VDD','+5V3'],[19,'VSS','GNDD'],[18,'RC7','CAL'],[17,'RC6','INREF'],[16,'RC5','EXREF'],[15,'RC4','96']], 17)
    + ic(60,330,120,'U12','93LC46 / 93LC66',[[1,'CS','RA3'],[2,'CLK','RA2'],[3,'DI','RA1'],[4,'DO','SDO']],[[8,'VCC','+5V3'],[5,'VSS','GNDD']])
    + txt(400,328,'LEDs (330 Ω each to the anode, cathode to GNDD):',{fs:10.5}) + ['R32 → SR32 red (RC1)','R33 → SR44 red (RC2)','R34 → SR48 red (RC3)','R35 → SR96 red (RC4)','R37 → EXTREF green (RC5)','R36 → INTREF yellow (RC6)','R38 → CAL red (RC7, also U1-10 / U2-10)','R27 1 k → PWRLED green, from +VA','SW1 pin 5 → RA4, R81/R82 10 k pull-up to +5V3'].map((s,i)=>txt(400,344+i*13,s,{fs:9.5})).join('')
    + txt(20,30,'RB3 is shared: CS8420 CDIN (pin 27 of U3/U9) and the EEPROM DO. ee_read / ee_write flip TRISB to 0x08 to read it.',{fs:10,c:'var(--ink2)'}) },
  {name:'Clocks and AES transceivers (U3, U9, U4, U1, U2)', svg:()=> ic(360,40,150,'U3','CS8420 (#1)',
      [[1,'CDOUT','SDI→RB1'],[2,'CS','CS1'],[4,'RXP','REF (C10)'],[5,'RXN','C12'],[9,'RST','RESET'],[10,'RMCK','MCLK1'],[12,'ILRCK','LRCK1'],[13,'ISCLK','SCLK1'],[14,'SDIN','SDATA1']],
      [[28,'CCLK','SCK'],[27,'CDIN','SDO'],[26,'TXP','R11 (ISS1) / R17 (ISS2)'],[21,'OMCK','OMCK'],[23,'VD+','+5V1'],[22,'DGND','GNDD']])
    + ic(360,250,150,'U9','CS8420 (#2)',
      [[1,'CDOUT','SDI'],[2,'CS','CS2'],[4,'RXP','REF (C13)'],[9,'RST','RESET'],[10,'RMCK','MCLK2'],[12,'ILRCK','LRCK2'],[13,'ISCLK','SCLK2'],[14,'SDIN','SDATA2']],
      [[28,'CCLK','SCK'],[27,'CDIN','SDO'],[26,'TXP','R17 (ISS1) / R11 (ISS2)'],[21,'OMCK','OMCK'],[23,'VD+','+5V2']])
    + ic(90,40,120,'U1','CS5394/96',[[7,'MCLK','MCLK1'],[20,'MCLK','MCLK1'],[10,'CAL','CAL'],[19,'PDN','GND / PDN (ISS2)'],[4,'AIN','C1'],[5,'AIN','C2']],[[13,'LRCK','LRCK1'],[14,'SCLK','SCLK1'],[16,'SDATA','SDATA1'],[26,'AIN','C14'],[27,'AIN','C15']])
    + ic(90,250,120,'U2','CS5394/96',[[7,'MCLK','MCLK2'],[10,'CAL','CAL'],[19,'PDN','GND / PDN']],[[13,'LRCK','LRCK2'],[14,'SCLK','SCLK2'],[16,'SDATA','SDATA2']])
    + ic(660,250,110,'U4','PLL1700E',[[1,'SR','SR0'],[19,'FS0','FS0'],[20,'FS1','FS1'],[5,'XT1','X1 27 MHz'],[6,'XT2','X1']],[[14,'SCKO','OMCK'],[16,'VDD','3.3 V'],[18,'VDD','3.3 V']])
    + txt(20,440,'Pin names other than the net names are from the Cirrus / Burr-Brown pinouts (datasheets not in the archive): '+'inferred'+'. ISS2 adds Q1 2N4403: RESET → PDN of U1/U2.',{fs:9.5,c:'var(--ink2)'}) },
  {name:'Reference receivers and output drivers', svg:()=>{
    let s = ic(240,40,110,'U14','75176 (75 Ω)',[[6,'A','T1-4'],[7,'B','T1-3'],[2,'/RE','SEL75']],[[1,'RO','REF'],[8,'VCC','+5V3']])
      + ic(240,170,110,'U15','75176 (110 Ω)',[[6,'A','T2-4'],[7,'B','T2-3'],[2,'/RE','SEL110']],[[1,'RO','REF'],[8,'VCC','+5V3']])
      + txt(20,60,'BNC1 → H3/P3-1 → C16 → T1 PE-65612',{fs:9.5}) + txt(20,75,'R1 75R across T1 secondary',{fs:9.5,c:'var(--ink2)'})
      + txt(20,190,'TB5 → H3/P3-5,6 → C27 → T2 PE-65612',{fs:9.5}) + txt(20,205,'R3 110R across T2 secondary',{fs:9.5,c:'var(--ink2)'})
      + txt(400,120,'REF → C10 → U3 RXP (pin 4)',{fs:10}) + txt(400,135,'REF → C13 → U9 RXP (pin 4)',{fs:10})
      + ic(520,250,120,'U11','EL2280C',[[3,'+IN A','R11/R12'],[2,'−IN A','R6'],[5,'+IN B','R13/R17'],[6,'−IN B','R14']],[[1,'OUT A','R15, R16'],[7,'OUT B','R7, R8'],[8,'V+','+5V3'],[4,'V−','−5V']]);
    s += txt(20,280,'ISS1 (POD14.net): U3-26 → R11 → U11 A → OUT2-75 / T4 → OUT2-110',{fs:10}) + txt(20,296,'                 U9-26 → R17 → U11 B → OUT1-75 / T5 → OUT1-110',{fs:10})
      + txt(20,320,'ISS2 (POD14iss2.net): R11 ← U9-26, R17 ← U3-26 (swapped): INPUT1 → OUTPUT1',{fs:10,c:'var(--accent)'})
      + txt(20,350,'OUT1-75 = R7 75R → P2-2 → BNC2 · OUT1-110± = T5-3/4 → P2-5/6 → TB6',{fs:9.5}) + txt(20,365,'OUT2-75 = R15 75R → P1-2 → BNC3 · OUT2-110± = T4-3/4 → P1-5/6 → TB7',{fs:9.5})
      + txt(20,440,'Only TXP of each CS8420 is used (single-ended into the EL2280). Both 75176 outputs drive one net: the firmware must keep one /RE high.',{fs:9.5,c:'var(--ink2)'});
    return s; }},
  {name:'Analog channel and power', svg:()=>{
    let s = ic(200,40,130,'U5','NE5532 (A1, IN1 L)',[[3,'+IN A','R50 ← A1+'],[2,'−IN A','R39, R47'],[5,'+IN B','R51 ← A1−'],[6,'−IN B','R40, RV5 CW']],[[1,'OUT A','R45 150R, R39 10K0'],[7,'OUT B','R46 150R, R40 10K0'],[8,'V+','+VA'],[4,'V−','−VA']]);
    s += txt(20,160,'Gain leg: R47 4K7 → RV5 20 k (wiper + CCW) → U5-6. R50/R51 10K0 in, R53/R52 4K7 to ground.',{fs:9.5})
      + txt(20,176,'Out: R45/R46 150R, R49 68R and C40 6n8 across → C1/C2 → U1 pins 4/5. (Same for U6/B1 → U1 26/27, U7/B2 and U8/A2 → U2.)',{fs:9.5})
      + txt(20,192,'Topology read from the netlist; component roles are '+'inferred'+'.',{fs:9.5,c:'var(--ink2)'})
      + txt(20,240,'Power (ISS1 BOM)',{fs:11})
      + ['ACIN1 PAN356 → PWRSW1 PAN256 → T3 TE70041 (two primaries; 0 Ω links "1", "2", "3" pick 115 / 230 V)','T3 secondaries → D5–D8 1N4004 → C28 / C55 2200 µF 25 V → +VA / −VA (NE5532 rails, PWRLED)','+VA → REG1 7805 → +5V1 (U1 ADC, U3 CS8420) · REG2 7805 → +5V2 (U2, U9) · REG4 7805 → +5V3 (PIC, EEPROM, 75176, EL2280, PLL)','−VA → REG5 7905 → −5V (EL2280 V−) · REG3 LM1117-3.3 → PLL1700E pins 16/18','MCLR (U10-1) tied straight to +5V3: no reset supervisor; the 256-count powerupdelay is the only wait'].map((x,i)=>txt(20,260+i*16,x,{fs:9.5})).join('');
    return s; }},
];
function viewSchem(m){
  window.__pod14Keys = false; let i=0;
  m.innerHTML=`${card('Schematic set — redrawn from the P-CAD netlists, not the original CAD', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div class="scroll"><div id="sh"></div></div>
    <p class="small muted">Nets and pin numbers: <span class="mono">POD14 - #PCB #OBSOLETE/ARCHIVE/POD14.net</span> (ISS1, 2001-02-28) and <span class="mono">POD14iss2.net</span> (ISS2, 2002-08-06); values from <span class="mono">pod14.bom</span> / <span class="mono">POD14iss2.bom</span>. The binary <span class="mono">POD14.sch</span> (P-CAD) was not opened. Blue = net names.</p>`)}
    ${card('ISS1 → ISS2 netlist differences (order-independent compare)', `<table class="kv"><tr><th>Net</th><th>ISS1</th><th>ISS2</th><th>Meaning</th></tr>
      <tr><td class="mono">NET00162 / NET00163</td><td class="mono">R11 ← U3-26, R17 ← U9-26</td><td class="mono">R17 ← U3-26, R11 ← U9-26</td><td>Outputs swapped back: ISS1 sent INPUT1 to OUTPUT2</td></tr>
      <tr><td class="mono">PDN, RESET</td><td class="mono">U1-19, U2-19 on GNDD</td><td class="mono">Q1 (2N4403) from RESET → U1-19, U2-19</td><td>ADCs held in power-down while the CS8420s are in reset</td></tr>
      <tr><td class="mono">NET00056…60, 112/113, 118</td><td>—</td><td class="mono">C97, C98, C99, C100 across the ADC inputs</td><td>Added input capacitors</td></tr>
      <tr><td>BOM values</td><td class="mono">PIC16C73 · CS5394 · CS8420 · 93LC46 · EL2280C · TE70041 · 1N4004</td><td class="mono">PIC16F73 · CS5396 · CS8427 · 93LC66 · EL5263IS · TE70040 · 1N4003</td><td>ISS2 BOM dated Dec 2007; footprints unchanged (PIC63, CS5394, CS8420, 93C46A, EL2280C)</td></tr></table>`)}`;
  const draw=()=>{ m.querySelector('#tabs2').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-k="${k}">${k+1}. ${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.k; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 900 470" style="width:100%;min-width:700px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="888" height="458" fill="none" stroke="var(--line)"/><text x="884" y="456" text-anchor="end" font-size="10" fill="var(--ink2)">POD14 · sheet ${i+1}/${SHEETS.length} · redrawn ${Y(2026)}</text>${SHEETS[i].svg()}</svg>`; };
  draw();
}

/* ---------------- SOFTWARE ---------------- */
function viewSoft(m){
  window.__pod14Keys = true;
  m.innerHTML=`<div class="grid2">${card('main (pod14.asm V1.02) — the running step is highlighted', `<div id="ml"></div>`)}${card('Reference / calibration state machine', `<div id="fsm"></div>`)}</div>
    <div class="grid2">${card('CS8420 control registers (refresh8420 writes all eight, to both chips, every pass)', `<div id="regs"></div>`)}${card('Counters and flags at the playhead', `<div id="cnt"></div>`)}</div>
    <div class="grid2">${card('PIC16C73 port map (POD14.net) and levels at the playhead', `<div id="pins"></div>`)}${card('V1.00 (March 2001) → V1.02 (June 25 2001)', `<table class="kv small"><tr><th>What</th><th>V1.00</th><th>V1.02</th></tr>
      <tr><td>Status read rate</td><td>every pass</td><td><span class="mono">delay_2</span> divider: REFRESHSTATUS on 1 pass in 36</td></tr>
      <tr><td>Registers in refresh8420</td><td>1, 2, 3, 4, <b>5</b>, 6, <b>9</b>, 17</td><td>1, 2, 3, 4, <b>18</b>, 6, <b>32</b>, 17 (reg 32 = 0x81)</td></tr>
      <tr><td>ref_chk</td><td>writes the selected chip only</td><td>writes both chips; mutes (reg 3 = 0x4A) during the switch</td></tr>
      <tr><td>CAL in local_osc1</td><td>idelay</td><td><span class="mono">dloop1 → DELAY</span>, servicing the switch while waiting</td></tr>
      <tr><td>Loop count</td><td>count2 / count0</td><td>count3 = 10</td></tr>
      <tr><td>flag,4 → ee_read</td><td>restores local-osc settings</td><td>removed</td></tr>
      <tr><td>switch_press</td><td>—</td><td><span class="mono">bsf delay_setup,2</span> (meant to leave CAL early; the test is commented out)</td></tr>
      <tr><td>Start-up output count</td><td>235</td><td>220</td></tr></table>
      <p class="small muted">Folder <span class="mono">#V102</span> also holds <span class="mono">14v103.pjt</span> (2004-01-30): a V1.03 project with no V1.03 source.</p>`)}</div>
    ${card('SPI transaction at the playhead (spi.asm, bit-banged on RB0–RB4)', `<div id="spi" class="small mono"></div>`)}`;
  const draw=()=>{ const t=SIM.t, st=stepAt(t), i=passAt(t), p=i>=0?emulate().P[i]:null, ph=phaseAt(t);
    let s=`<svg viewBox="0 0 720 ${STEPS.length*40+60}" style="width:100%"><defs><marker id="p14a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    STEPS.forEach((S,k)=>{ const y=10+k*40, on=k===st.step; s+=`<rect x="10" y="${y}" width="330" height="30" rx="6" fill="${on?'color-mix(in srgb,var(--accent) 30%,var(--panel))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}"/><text x="18" y="${y+19}" font-size="11" fill="var(--ink)" font-family="var(--mono)">${S[0]}</text>${k<STEPS.length-1?`<path d="M175 ${y+30}v10" stroke="var(--ink2)" marker-end="url(#p14a2)"/>`:''}<text x="348" y="${y+13}" font-size="9" fill="var(--ink2)">${S[2].slice(0,70)}</text><text x="348" y="${y+25}" font-size="9" fill="var(--ink2)">${S[2].slice(70,140)}</text>`; });
    s+=`<path d="M10 ${10+STEPS.length*40-25}h-6V18h6" stroke="var(--ink2)" fill="none" marker-end="url(#p14a2)"/><text x="10" y="${STEPS.length*40+40}" font-size="10.5" fill="var(--ink2)">${st.step>=0?`pass #${st.pass} at ${SIM.fmtT(p.t)}${p.chk?' · status check':''}`:'Not in main: '+(ph?ph.label:'')}</text></svg>`;
    m.querySelector('#ml').innerHTML=s;
    const k=ph?ph.k:'off', on=(id)=> (id==='boot'&&k==='boot')||(id==='cali'&&k==='cal-int')||(id==='cale'&&k==='cal-ext')||(id==='int'&&k==='int')||(id==='ext'&&k==='ext')||(id==='off'&&k==='off');
    const node=(id,x,y,w,l1,l2)=>`<rect x="${x}" y="${y}" width="${w}" height="40" rx="8" fill="${on(id)?'color-mix(in srgb,var(--accent) 30%,var(--panel))':'var(--panel2)'}" stroke="${on(id)?'var(--accent)':'var(--line)'}"/><text x="${x+w/2}" y="${y+17}" text-anchor="middle" font-size="11" fill="var(--ink)">${l1}</text><text x="${x+w/2}" y="${y+31}" text-anchor="middle" font-size="9" fill="var(--ink2)">${l2}</text>`;
    const ar=(d,l,lx,ly)=>`<path d="${d}" stroke="var(--ink2)" fill="none" marker-end="url(#p14a3)"/>${l?`<text x="${lx}" y="${ly}" font-size="9" fill="var(--accent2)">${l}</text>`:''}`;
    m.querySelector('#fsm').innerHTML=`<svg viewBox="0 0 560 300" style="width:100%"><defs><marker id="p14a3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      ${node('off',10,10,110,'OFF','')}${node('boot',160,10,230,'init · lamp test · ref_read','110 Ω, then 75 Ω ≈ 5–9 s')}
      ${node('cali',20,120,170,'local_osc / local_osc1','CAL: '+(62*C.IDELAY_T).toFixed(1)+' s at start-up, '+(63969*C.DCALL_T).toFixed(1)+' s later')}${node('cale',370,120,170,'ext_ref / ext_ref1','CAL: '+(62*C.IDELAY_T).toFixed(1)+' s at start-up, '+(30*C.IDELAY_T).toFixed(1)+' s later')}
      ${node('int',20,230,170,'MAIN · local oscillator','flag,2 · hunting 75 ⇄ 110')}${node('ext',370,230,170,'MAIN · external reference','flag,1 · STEP ignored')}
      ${ar('M120 30H160','power','125','24')}${ar('M230 50L120 120','unlocked','140','90')}${ar('M330 50L440 120','locked','400','90')}
      ${ar('M105 160V230')}${ar('M455 160V230')}
      ${ar('M190 245H370','15 checks locked (≈2 s)','215','240')}${ar('M370 265H190','15 checks unlocked','220','280')}
      ${ar('M370 255L190 150','','','')}${ar('M190 255L370 150','','','')}
      ${ar('M60 270C0 300 0 200 40 160','STEP released','0','215')}
      <text x="280" y="190" text-anchor="middle" font-size="9" fill="var(--ink2)">ref_chk: reg 4 = 0x00, reg 3 = mute</text></svg>`;
    const c1=chipAt(0,t), c2=chipAt(1,t);
    const R=[[1,'Miscellaneous Control 1','r1def 0x28 / r1swclk 0xA8 ("Switch reference")',c1.r1,c2.r1],[2,'Miscellaneous Control 2','0x00',0,0],[3,'Data Flow Control','r3def 0x0A / r3mute 0x4A',c1.r3,c2.r3],[4,'Clock Flow Control','r4def 0x49 / r4swclk 0x45 ("OMCK") / r4stop 0x00',c1.r4,c2.r4],[18,'CS Data Buffer Control','0x10',REG.r18,REG.r18],[6,'Serial Audio Output Port Data Format','0x82 — also read back as the link check',REG.r6,REG.r6],[32,'(C-bit buffer, byte 0)','0x81 (V1.00: 0x01)',REG.r32,REG.r32],[17,'Receive Error Mask','0x32 (an older 0x16 is commented out)',REG.r17,REG.r17],[16,'Receiver Error (read)','bit 4 UNLOCK, bit 1 BIP tested; bits 7–0 per shiftin: –, QCRC, CRC, LOCK, V, CONF, BIP, PAR',p&&p.st!=null?p.st:null,null]];
    m.querySelector('#regs').innerHTML=`<table class="kv small"><tr><th>Reg</th><th>Name (init.asm comments)</th><th>Values in the source</th><th>#1</th><th>#2</th></tr>${R.map(r=>`<tr><td class="mono">${r[0]}</td><td>${r[1]}</td><td class="mono">${r[2]}</td><td class="mono">${powerAt(t)&&r[3]!=null?hex2(r[3]):'—'}</td><td class="mono">${powerAt(t)&&r[4]!=null?hex2(r[4]):'—'}</td></tr>`).join('')}</table>
      <p class="small muted">Defined but never sent: <span class="mono">cs8420reg5def, reg9def, reg33def…reg36def</span> (V1.02). Bit meanings beyond the comments (reg 4 bit 6 RUN, bit 3 OUTC, bit 2 INC; reg 3 bit 6 TXOFF; reg 1 bit 7 SWCLK) are from the Cirrus datasheet, not in the archive: ${inf}.</p>`;
    m.querySelector('#cnt').innerHTML = p&&powerAt(t) ? `<table class="kv small">
      <tr><th>flag</th><td>${bitsList(p.f, FLAGN)}</td></tr><tr><th>press_flag</th><td>${bitsList(p.pf, PFN)}</td></tr>
      <tr><th>bcount</th><td class="mono">${p.bc} <span class="muted">(15 checks to change source)</span></td></tr>
      <tr><th>output (delay_2)</th><td class="mono">${p.out} <span class="muted">(220…255; wraps → status check)</span></td></tr>
      <tr><th>rem0 / rem1</th><td class="mono">${p.r0} / ${p.r1} <span class="muted">(press 235→0, release 225→0)</span></td></tr>
      <tr><th>rem2 / rem4</th><td class="mono">${p.r2} / ${p.r4} <span class="muted">(save: rem2 → 0, then rem4 +1 per 256 passes)</span></td></tr>
      <tr><th>sample_rate</th><td class="mono">${hex2(p.sr)} = ${bin8(p.sr)} (bit 0 32k, 1 44.1k, 2 48k, 3 96k, 7 = SR0)</td></tr>
      <tr><th>flag0,1</th><td class="mono">${p.f01} <span class="muted">(came from ext ref)</span></td></tr></table>` : '<p class="muted">Not in the main loop at the playhead.</p>';
    const {pa,pb,pc}=portsAt(t), lv=(v,b)=>(v>>b)&1;
    const PINS=[['RA0',2,'RESET → CS8420 RST (ISS2: + Q1 → ADC PDN)',lv(pa,0)],['RA1',3,'93LC DI',lv(pa,1)],['RA2',4,'93LC CLK',lv(pa,2)],['RA3',5,'93LC CS',lv(pa,3)],['RA4',6,'STEP switch (in, low = pressed)',pressedAt(t)?0:1],['RA5',7,'PLL1700E FS0',lv(pa,5)],
      ['RB0',21,'CS1 (CS8420 #1)',null],['RB1',22,'SDI ← CDOUT (in)',null],['RB2',23,'CS2 (CS8420 #2)',null],['RB3',24,'SDO → CDIN · EEPROM DO',null],['RB4',25,'SCK → CCLK',null],['RB5',26,'PLL1700E SR',lv(pb,5)],['RB6',27,'SEL110 → U15 /RE (low = on)',lv(pb,6)],['RB7',28,'SEL75 → U14 /RE (low = on)',lv(pb,7)],
      ['RC0',11,'PLL1700E FS1',lv(pc,0)],['RC1',12,'LED 32',lv(pc,1)],['RC2',13,'LED 44.1',lv(pc,2)],['RC3',14,'LED 48',lv(pc,3)],['RC4',15,'LED 96',lv(pc,4)],['RC5',16,'LED EXT REF',lv(pc,5)],['RC6',17,'LED INT REF',lv(pc,6)],['RC7',18,'CAL LED + ADC CAL',lv(pc,7)]];
    m.querySelector('#pins').innerHTML=`<table class="kv small"><tr><th>Port</th><th>Pin</th><th>Net / use</th><th>Level</th></tr>${PINS.map(r=>`<tr><td class="mono">${r[0]}</td><td class="mono">${r[1]}</td><td>${r[2]}</td><td class="mono">${!powerAt(t)?'—':r[3]==null?'bus':r[3]}</td></tr>`).join('')}</table>`;
    const tx = st.pass>=0 ? spiTx(st.pass).find(x=>x.a<=t&&x.b>t) : null;
    m.querySelector('#spi').innerHTML = tx ? `CS8420 #${tx.chip+1} ${tx.kind==='read'?'read8420 (shiftout1 / shiftin)':'refresh8420 (wr8420reg / shiftout)'}<br>`+tx.bytes.map(b=>`<span style="${b.t<=t&&b.t+45*TCY>t?'font-weight:700;color:var(--accent)':''}">${b.d==='i'?'IN ':''}${hex2(b.v)} ${bin8(b.v)}</span>`).join(' · ')+`<br><span class="muted">0x20 = chip address + write; 0x21 = read. Read: write MAP, release CS, then clock in one byte. Each bit: bcf portb,3 · btfsc · bsf portb,3 · bsf portb,4 · bcf portb,4.</span>` : '<span class="muted">No SPI byte at the playhead. Zoom to ≤ 4 ms and step.</span>';
  };
  SIM.on('time', draw);
}

/* ---------------- FINDINGS ---------------- */
function viewNotes(m){
  window.__pod14Keys = false;
  const li = (h, b)=>`<li style="margin-bottom:8px"><b>${h}</b> ${b}</li>`;
  m.innerHTML = `${card('What the POD14 firmware is up to (V1.02, '+Y(2001)+')', `<ol class="small">
    ${li('The wrap from 96 kHz back to 32 kHz works by accident.', '<span class="mono">switch_press</span> tests <span class="mono">sample_rate − 8 = 0</span> to wrap, but <span class="mono">sr96</span> also stores the PLL SR0 flag in bit 7, so at 96 kHz <span class="mono">sample_rate</span> is 0x88 and the test never matches. The following <span class="mono">rlf</span> shifts in the carry left by <span class="mono">subwf</span> (no borrow → C = 1): 0x88 → 0x11, and <span class="mono">sr_check</span> tests bit 0 first, so it lands on 32 kHz. The <span class="mono">clrf / bsf 0</span> branch is dead code.')}
    ${li('Debounce counts loops, not time.', 'rem0 (21 counts) and rem1 (31 counts) give ≈77 ms / 113 ms in the main loop, but the same routines run inside the CAL wait (<span class="mono">DELAY → switch_check</span>) where one count is ≈36 µs. There a bouncing press is accepted after 0.75 ms, and because <span class="mono">rem1</span> is not reset when the contact closes again, the release can be accepted mid-bounce. Try the “Bouncy STEP contacts” scenario: one press during CAL steps the rate twice. Contact-bounce timing is '+inf+'.')}
    ${li('Leaving CAL early was planned and then switched off.', 'V1.02 added <span class="mono">bsf delay_setup,2</span> on a press and <span class="mono">delay_setup,1</span> in <span class="mono">switch_check</span>, but the <span class="mono">btfsc delay_setup,1 / goto leave_cal</span> test in <span class="mono">dloop1</span> is commented out. <span class="mono">leave_cal</span>, <span class="mono">local_osc_led</span> and <span class="mono">ext_ref_led</span> are unreachable, and so is <span class="mono">CONF_CHK</span> (its call is commented out in both versions).')}
    ${li('Start-up is very slow.', `At start-up <span class="mono">ref_read</span> leaves <span class="mono">count = count1 = 25</span>, so <span class="mono">local_osc</span> / <span class="mono">ext_ref</span> in <span class="mono">init.asm</span> wait 2 × 25 IDELAY units (${(50*C.IDELAY_T).toFixed(1)} s) before the rest of the CAL sequence. With nothing plugged in, power-on to main loop is about ${(102*C.IDELAY_T).toFixed(0)} s at 4.9152 MHz, with the EXT REF LED lit for most of it on the local-oscillator path. The manual says calibration "normally lasts for a few seconds". The <span class="mono">IDELAY</span> comment works it out for 3.8 MHz and gets "34.908s" per unit; the project file sets 4 MHz; the BOM crystal is 4.9152 MHz.`)}
    ${li('The start-up calibration programs only one chip.', '<span class="mono">ref_chk1</span>, <span class="mono">local_osc</span> and <span class="mono">ext_ref</span> call <span class="mono">refresh8420</span> once, with <span class="mono">cs8420_1_2</span> still 1, so only CS8420 #2 gets the stop / mute / clock settings; #1 keeps its init values until the first main pass. The V1.02 main-loop versions (<span class="mono">ref_chk</span>, <span class="mono">local_osc1</span>, <span class="mono">ext_ref1</span>) were fixed to write both chips; the start-up copies were not.')}
    ${li('Every pass rewrites every register.', '<span class="mono">refresh8420</span> sends 24 bytes to each CS8420 on every main pass (≈4 380 register writes a second) whether anything changed or not. Register 6 is read back as a link check: if it is not 0x82, <span class="mono">flag,5</span> sends the PIC back to <span class="mono">init2</span> (a soft restart with the 20 s start-up).')}
    ${li('A programme feed is accepted as house sync.', '<span class="mono">ref_setup</span> and <span class="mono">REFRESHSTATUS</span> only test bit 4 (UNLOCK) and bit 1 (BIP) of register 16. Validity, confidence and CRC are shifted in (the <span class="mono">shiftin</span> comments name them) but never tested. POD14A, with the CS8416 and <span class="mono">CS8416_READ_LOCK_ALL</span>, refuses such a feed.')}
    ${li('Channel status says 48 kHz whatever the rate.', 'V1.02 writes 0x81 to register 32 (V1.00 wrote 0x01). As the first channel-status byte that is PRO = 1 with bits 6–7 = “01” = 48 kHz, on every rate and on any reference (0x81 reads the same in either bit order). That the CS8420 transmits its C buffer in this mode is '+inf+'. Registers 33–36 are defined (0x00, 0x2C, 0x00, 0x00) and never sent.')}
    ${li('The rate LEDs go dark on external reference.', '<span class="mono">ext_ref1</span> writes PORTC = 1010 0000 and the main loop exits at <span class="mono">btfsc flag,1</span> before <span class="mono">led_output</span>, so only EXT REF stays lit and STEP is ignored; the manual only says the external reference "has precedence". On the way back, <span class="mono">debounce</span> clears <span class="mono">press_flag,7</span> so the first <span class="mono">led_output</span> call inside CAL restores the stored rate.')}
    ${li('Mislabelled LEDs in the comments.', 'In <span class="mono">local_osc1</span>, <span class="mono">bsf portc,5 ;turn on INT</span> lights EXT REF: the netlist puts EXREF on RC5 (U10-16) and INREF on RC6 (U10-17). <span class="mono">ee_read</span> and <span class="mono">ee_write</span> say “set portb as an output” while making RB3 an input.')}
    ${li('Shared data pin.', 'The EEPROM DO (U12-4) and the CS8420 CDIN pins share the SDO net on RB3. The EEPROM routines flip TRISB to 0x08 to read DO; <span class="mono">eerwait</span> polls RB3 for ready.')}
    ${li('The EEPROM check reads the wrong byte.', '<span class="mono">ee_read</span> compares <span class="mono">setup1</span> with 0xAA twice and never checks <span class="mono">setup2</span>. <span class="mono">write_enable</span> always sends EWEN: the <span class="mono">btfsc eeaddress,0</span> choice is overridden by the next <span class="mono">bsf porta,1</span>.')}
    ${li('ISS1 parts do not match the code.', 'The code clocks 8 address bits (93LC66, 256 × 16) but the ISS1 BOM has a 93LC46 (64 × 16 needs 6): on that board the read would be misaligned and the unit would fall back to 32 kHz at every power-up ('+inf+'). ISS2 lists the 93LC66. The code targets the OTP PIC16C73A; ISS1 lists PIC16C73 and ISS2 PIC16F73 (flash).')}
    ${li('ISS2 parts the firmware predates.', 'The ISS2 BOM (Dec 2007) puts CS8427 (no sample-rate converter) on the CS8420 footprint and CS5396 on the CS5394 footprint. V1.02 is dated June 2001 and is the last source in the folder; whether it ran unchanged on a CS8427 is not recorded. The register addresses it uses (1–4, 6, 16–18, 32) exist on both parts ('+inf+').')}
    ${li('ISS1 crossed the outputs.', 'POD14.net: CS8420 #1 (converter 1) TXP → R11 → the EL2280 half that drives OUT2-75 / OUT2-110. POD14iss2.net swaps R11/R17. Switch “Board” to ISS1 in the simulator to see INPUT1 come out of OUTPUT2.')}
    ${li('Leftovers from an SDI audio product.', 'The comments call the four rates “group 1–4” (<span class="mono">sample_rate ;group number</span>, <span class="mono">;store status of sdi group</span>, <span class="mono">sr32 … ;default group 1</span>): the switch code was cloned from a group-select product ('+inf+'). The header says “POD14 DIGITAL TO ANALOG CONVERTER”; V1.00 is dated “MARCH 8, 2000” but its files are from March–April 2001, after the February 2001 schematic.')}
    ${li('The front drawing was edited for POD14A.', '<span class="mono">POD14-FRT.dwg</span> (issue 2, “REMOVED ONE HOLE AND ADDED ANOTHER”) was saved 2008-08-12. It has a hole at 5.171 in under the SAMPLE RATE bracket, where POD14A puts 192 kHz, and none under the CAL label of the 2001 silk (6.10 in). The CAL LED here sits under its label ('+inf+').')}
    ${li('Artwork '+Y(2026)+': front/rear panels now from '+SIM.src('#POD #SERIES/POD4 - #Master/POD4 - #Engineering/SILK/POD14SLK_CURVE.cdr','POD4 - #Engineering/SILK/POD14SLK_CURVE.cdr')+' (2001-03-21).', 'This newest copy of the silk sits in the <b>POD4</b> folder, not the POD14 one. Against the POD14 folder copy '+SIM.src('#POD #SERIES/XXX - POD14 - #Master #OBSOLETE/POD14 - #Engineering/SILK/OBSOLETE/POD14SLK_CURVE.cdr','SILK/OBSOLETE/POD14SLK_CURVE.cdr')+' (2001-02-27, the source of the old PNGs) it adds the “+ - G” polarity legends over the lower INPUT1 / INPUT2 blocks, REFERENCE INPUT, OUTPUT1 and OUTPUT2 (the February copy has them only on the upper input row), moves the INPUT1 / INPUT2 captions right by ≈0.03 in and the RIGHT caption down by ≈0.08 in. The sheet has no panel outline or drill marks, only crop marks, so hole positions still come from <span class="mono">POD14-FRT.pdf</span> / <span class="mono">Pod14-REAR.pdf</span>. CAL is printed on the silk although the 2008 front drawing has no hole under it.')}
    ${li('Mislabelled and stray files.', '<span class="mono">Pod14-REAR.pdf</span> is titled POD14A-REAR but dated 16-03-01 (POD14). <span class="mono">SILK/POD14A-SILK*.cdr</span> are POD14A artwork; the <span class="mono">#ISS2 #PCB</span>, <span class="mono">#PCB #OBSOLETE</span> (top level) and both <span class="mono">#GERBERS</span> folders are POD14A’s design (README). <span class="mono">ARCHIVE/POD7-iss2.ERR</span> belongs to POD7. Two empty <span class="mono">New Text Document.txt</span> and empty <span class="mono">POD14.ERR</span> files sit with the source.')}
    </ol>`)}
    ${card('How POD14 differs from POD14A and POD14B, and what survived', `<table class="kv small"><tr><th></th><th>POD14 (${Y(2001)})</th><th>POD14A (${Y(2008)}) — pod14a.js</th><th>POD14B — pod14b-unbalance-in.js</th></tr>
      <tr><td>Controller</td><td>PIC16C73A / 16F73, MPASM, 5 files</td><td>ATmega128L (C, <span class="mono">d6203_test.c</span>) + Cyclone EP1C3</td><td>Same as POD14A</td></tr>
      <tr><td>Firmware origin</td><td>Own code (with “SDI group” leftovers)</td><td>Cloned from the D6203 openGear card</td><td>POD14A v100</td></tr>
      <tr><td>Converters</td><td>CS5394 → CS5396</td><td>AK5394A</td><td>AK5394A, unbalanced RCA + balanced inputs, front trims</td></tr>
      <tr><td>AES path</td><td>2 × CS8420 / CS8427 transceivers (SPI)</td><td>FPGA framer, CS8416 receiver</td><td>As POD14A</td></tr>
      <tr><td>Rates</td><td>32, 44.1, 48, 96</td><td>32 … 192</td><td>32 … 192</td></tr>
      <tr><td>Main loop</td><td>≈3.65 ms (bit-banged SPI to 2 chips)</td><td>175 µs</td><td>175 µs</td></tr>
      <tr><td>Reference search</td><td>Swap 75/110 receivers every status check (≈131 ms)</td><td>Swap REF1/REF2 every 26 passes (≈4.6 ms)</td><td>As POD14A</td></tr>
      <tr><td>Lock / unlock</td><td>15 checks (≈2 s) both ways</td><td>26 locked passes; drops at once</td><td>As POD14A</td></tr>
      <tr><td>After a change</td><td>CAL LED: ≈2.3 s (local) / 6.4 s (ext), both chips stopped and muted</td><td>Two ADC resets (≈2.1 s)</td><td>2.1 s mute</td></tr>
      <tr><td>V bit</td><td>Ignored (accepted)</td><td>Refused</td><td>Refused</td></tr>
      <tr><td>Rate LEDs on ext</td><td>Dark</td><td>Stored rate stays lit</td><td>As POD14A</td></tr>
      <tr><td>EEPROM</td><td>93LC66 Microwire, 0xAAAA + 1 word, ≈19 s of main loop (+ CAL) after release</td><td>ATmega internal, 0xAA marker, 10 s</td><td>As POD14A</td></tr></table>
      <h3>Did any POD14 code survive into POD14A?</h3>
      <p class="small"><b>No source code.</b> POD14 is PIC assembler driving two CS8420s; POD14A is C on an ATmega128 driving a CS8416 and an FPGA, taken from the D6203 openGear card (README §I.2a; pod14a.js). Not one routine, register map or variable name is shared. What carried over is <b>behaviour and hardware</b>: the step switch cycling the internal rate and recalled from EEPROM behind a 0xAA marker (D6203 uses the same marker, so this is a house convention); automatic precedence of the external reference; the hunt between the 110 Ω and 75 Ω reference inputs while unlocked (POD14’s <span class="mono">change_ref</span> → POD14A’s REFERENCE_1/REFERENCE_2 toggle, which pod14a.js calls a D6203 leftover — POD14 already did it); a CAL tally during converter settling (POD14A lights CAL_LED during ADC resets); and the board: NE5532 input stage with POD14’s divider values (README: the reason for POD14A’s 2008-09-12 gain change), EL2280 footprint, PE-65612 transformers, PLL1700 family on 27 MHz, the P1–P5 two-board split and the same panel layout. The POD14A design files still live in this POD14 folder.</p>`)}
    ${card('Main assumptions', `<ul class="small"><li>Pass and delay durations come from cycle counts of the listing at 4.9152 MHz (BOM X2); the counts are approximate.</li><li>CS8420 lock time 20 ms; STEP click 150 ms; contact bounce pattern; 93LC66 write 2 ms per word.</li><li>CS8420 register bit meanings beyond the source comments, CS5394/96 and PLL1700E pin functions, the CAL LED hole, the trim range (±4.5 dB) and the trim-hole ↔ RV mapping, left = A side.</li><li>Rear panel cut-outs from POD14SLK.pdf (2008 copy of the 2001 artwork) and Pod14-REAR.pdf; the order REF / OUT1 / OUT2 of the BNCs follows the silk.</li></ul>`)}`;
}

/* ---------------- register ---------------- */
loadScenario('run48');
SIM.register({
  footnotes:[{text:"The newest copy of the POD14 silk (2001-03-21) is filed in the POD4 folder, not the POD14 one.",src:"#POD #SERIES/POD4 - #Master/POD4 - #Engineering/SILK/POD14SLK_CURVE.cdr"},{text:"The POD14 folder's copy of the silk (2001-02-27) lacks the “+ - G” polarity legends over the lower input blocks, REFERENCE INPUT and both outputs; the March copy adds them.",src:"#POD #SERIES/XXX - POD14 - #Master #OBSOLETE/POD14 - #Engineering/SILK/OBSOLETE/POD14SLK_CURVE.cdr"},{text:"The March 2001 silk moves the INPUT1 / INPUT2 captions right by about 0.03 in and the RIGHT caption down by about 0.08 in.",src:"#POD #SERIES/POD4 - #Master/POD4 - #Engineering/SILK/POD14SLK_CURVE.cdr"},{text:"The trim letters R / L on the rear are live text in the CorelDRAW file; everything else is curves.",src:"#POD #SERIES/POD4 - #Master/POD4 - #Engineering/SILK/POD14SLK_CURVE.cdr"},{text:"The silk prints a CAL LED label, but the 2008 front drawing (issue 2) has no hole under it and adds one under SAMPLE RATE where POD14A puts 192 kHz.",src:"#POD #SERIES/XXX - POD14 - #Master #OBSOLETE/POD14 - #Engineering/POD14 - #MECHANICAL/POD14-FRT.pdf"},{text:"Pod14-REAR.pdf is titled POD14A-REAR but dated 16-03-01, i.e. the POD14.",src:"#POD #SERIES/XXX - POD14 - #Master #OBSOLETE/POD14 - #Engineering/POD14 - #MECHANICAL/Pod14-REAR.pdf"},{text:"The SILK folder's POD14A-SILK*.cdr files are POD14A artwork, filed under the obsolete POD14.",src:"#POD #SERIES/XXX - POD14 - #Master #OBSOLETE/POD14 - #Engineering/SILK/OBSOLETE/POD14A-SILK-curve.cdr"}],
  
  id:'pod14', name:'POD14 · dual A-D converter, AES/EBU out, obsolete ('+Y(2001)+')', duration:C.HORIZON,
  product:'POD14', year:2001, family:'Obsolete products',
  folder:'#POD #SERIES/XXX - POD14 - #Master #OBSOLETE',
  summary:'The original half-rack dual analog-to-AES/EBU converter (32–96 kHz, internal PLL or external AES reference), predecessor of POD14A. A PIC16C73A runs the whole unit by polling: it bit-bangs two CS8420 transceivers over SPI, hunts between the 75 Ω and 110 Ω reference receivers, and calibrates after every change. Its V1.02 assembler is emulated pass by pass.',
  highlights:['V1.02 PIC firmware emulated with its own flags and counters (24 s)','Real 2001 silkscreen, front and rear, clickable','SPI bytes and AES3 cells at the playhead','Reference hunt, 15-check debounce, CAL and the 19 s EEPROM save','ISS1/ISS2 board differences, incl. the crossed outputs','How POD14 became POD14A'],
  depth:'Full model',
  stepUnits:[
    {label:'1 main-loop pass (3.65 ms)', period:()=>C.PASS_T},
    {label:'1 status check (36 passes)', period:()=>36*C.PASS_T},
    {label:'1 SPI byte (45 cycles)', period:()=>45*TCY},
    {label:'1 AES frame', period:()=>{ const o=outAt(0,SIM.t); return 1/(o.fs||48000); }},
    {label:'1 AES block (192 frames)', period:()=>{ const o=outAt(0,SIM.t); return 192/(o.fs||48000); }},
    {label:'100 ms', period:()=>0.1},
    {label:'1 s', period:()=>1},
  ],
  zooms:[[24,'24 s (whole run)'],[1,'1 s'],[0.15,'150 ms (status checks)'],[0.02,'20 ms'],[0.004,'4 ms (1 pass)'],[0.0004,'400 µs (SPI bits)'],[0.00005,'50 µs (AES frames)']],
  defaultZoom:1,
  init(){ EMU_KEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the POD14', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewAnatomy},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
