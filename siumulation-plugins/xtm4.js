/* =====================================================================
   XTM4 — Extended Range Test Meter (Ward-Beck Systems, firmware 2001|34 … 2015|48)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, folder "XTM4 - #MASTER"):
   - XTM4 - #Engineering/code/xtm42/PIC VERSIONS/V040001/42V400C/
       42V400C.asm (main loop, send/recieve handshake, opening_window, scan, auto,
       communication_control, pole, scanuart, loss_of_com, processuart, settxdata,
       txuart, eewrite, sdi_control, aes_control, phase, refresh, remember, TABLE1/TABLE2),
       init42.asm (INIT, RAM map, display macros, power-up defaults, EEPROM restore),
       analog42.asm, aes42.asm, sdi42.asm, set42.asm, eerw.asm
   - XTM4 - #Engineering/code/xtm41/PIC VERSIONS/41v202/41v202.asm + init41.asm
       (MAIN, refresh3310, translate8420, scanuart, proclvla/d/s, txuart, read8420,
        refresh8420, peak, sys_reset, TABLE_1/TABLE1/TABLE2/table)
   - XTM4 - #Engineering/code/XTM4 PROTOCOL.wpd (2001|34 serial protocol note)
   - XTM4 - #Engineering/PCB/XTM4-1/XTM4-1iss5.net, XTM4-2/XTM4-2iss4.net (pin/net names)
   - SA-XTM4-1ISSUE4 - BOM/sa-xtm4-1issue4.xls (4.9152 MHz crystal, CS3310, CS8420 …)
   - XTM4 - #Engineering/MANUAL/xtm4man.pdf, xtm4peak.pdf, xtm4sdi.pdf (operator manual)
   - XTM4 - #TESTREPORT/*.pdf (2010|43, 2012|45, 2015|48 test outlines)
   - XTM4 - #ARTWORK #DA #2016/XTM4M1-FRONT-SILK (CURVE).pdf, XTM4M2-REAR-SILK (CURVE).pdf
       (silkscreen, cut by tools/silk_extract.py) and Pics/*.jpg (colours, meter faces, rear)
   - SA-DEMUX4 - #Master/…/Demux4/Atmel/backup6/V010000/demux4.c (DEMUX-4 side of the link)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const Y = y => SIM.year(y);
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';

/* ---------------- constants from the source ---------------- */
const FOSC = 4.9152e6;          // X1 4.9152 MHz on both boards (BOM S1-4M9152, nets X1); also implied by spbrg = 7 → 9600 Bd
const TCY  = 4/FOSC;            // 0.8138 µs per PIC instruction cycle
const C = {
  BYTE: 10/9600,                // 1 start + 8 data + 1 stop at 9600 Bd (spbrg = 7, BRGH = 0)
  DEBOUNCE: 64,                 // bounce,6 → closure
  RELEASE: 128,                 // bounce,7 → released
  AUTO_ENTER: (256-245)*256,    // autoenter = 245, auto2 counts 256 → 2816 passes
  AUTO_REP: (256-254)*256,      // autotime = 254 → 512 passes
  SETUP_HOLD: (256-210)*256,    // remm1 = 210, remm0 counts 256 → 11 776 passes
  EE_DELAY: (256-75)*256,       // rem4 = 75, rem2 counts 256 → 46 336 passes
  POLL: 5*256,                  // polecount1 = 5 × polecount0 256
  COMCTL: 150,                  // polecount2 reload
  FLASH: 20*256,                // lockflash1 = 20 × lockflash0 256 → 5120 passes per half-cycle
  LOSS: (256-230)*256,          // comout3 = 230 → 6656 passes without reply → re-transmit
  D1FAST: 50+150,               // aes_control: polecount0 = 50 then communication_control 150
  SDIFAST: 10+150,              // sdi_control: polecount0 = 10
  HUNT: 5,                      // bcount = 5 unlocked replies before the D1 input flips XLR ⇄ BNC
  WINDOW_ITER: 256*100,         // opening_window: window_counter 256 × window_counter1 100
  BOUNCE_T: 0.003,              // contact bounce of the Omron B3J switch — INFERRED
  DMX_REPLY: 0.0004,            // DEMUX-4 reply delay after byte 2 (Timer0 one-shot) — INFERRED
  HP_FC: 80,                    // meter high-pass corner — INFERRED (not in the netlist values we read)
};
/* XTM42 main-loop steps with an estimated cycle budget (sum ≈ 420 cycles ≈ 342 µs per pass) — INFERRED by
   counting the instructions of each routine on its usual (no-key, no-UART) path. */
const ST42 = [
  ['clrwdt · btfss read,0 → setup', 6, 'Feeds the watchdog; setup runs once after power-up'],
  ['scan · debounce', 34, 'Reads RB0 MODE, RB1 SOURCE, RB6 DOWN, RB7 UP; 64 equal scans = one closure'],
  ['auto', 10, 'UP/DOWN auto-repeat: 2816 passes to start, then every 512'],
  ['analogmode · analogdis', 62, 'Button routines and display text for ANALOG (sourcea,7)'],
  ['aesmode · aesdis', 44, 'Button routines, NO LOCK flashing and XLR/BNC hunting for AES (sourced,7)'],
  ['sdimode · sdidis', 22, 'SDI pair, input A/B, NO SDI / NO AUDIO (sources1,7)'],
  ['settingsmode · settingsdis', 14, 'SETUP screens HP and TERM (sourceset1,7)'],
  ['remember', 16, 'Counts how long MODE is held; enters/leaves SETUP'],
  ['refresh', 82, 'Writes dis0…dis7 to the HDSP-2533: 8 × (address A0–A2, data RD0–7, WR pulse)'],
  ['communication_control', 8, 'Waits 150 passes after a request before allowing a transmission'],
  ['pole · scanuart · loss_of_com · processuart', 42, 'Poll timer, read the reply byte, time-out, decode lock bits'],
  ['settxdata · txuart', 30, 'Builds tx0/tx1; puts one byte in TXREG when the shift register is empty'],
  ['phase', 22, 'ADRESH >> 5 → PORTE RE0–RE2 → 74HC4052 → one of 8 phase LEDs; restart A/D'],
  ['aes_control · sdi_control', 14, 'Fast re-poll for D1 hunting; SDI address toggling'],
  ['eewrite', 14, 'Saves 14 settings bytes 46 336 passes (≈15.8 s) after the last release'],
];
const CYC42 = ST42.reduce((a,s)=>a+s[1],0);
const L42 = CYC42*TCY;
const FR42 = (()=>{ let a=0; return ST42.map(s=>{ const r=a/CYC42; a+=s[1]; return r; }); })();
const IX = n => ST42.findIndex(s=>s[0].startsWith(n));
/* XTM41 main loop (MAIN in 41v202.asm) — cycle budget INFERRED the same way (≈1540 cycles ≈ 1.25 ms) */
const ST41 = [
  ['clrwdt · refresh3310', 20, 'Only after a new command: 16 bits to the CS3310 (right then left), MSB first'],
  ['translate8420', 14, 'Keeps separate lock copies for AES and SDI (cs8420_16_aes / _sdi)'],
  ['scanuart', 18, 'Address byte (bit 7 = 1) then level byte; dispatch proclvla / proclvld / proclvls'],
  ['refresh8420', 1090, 'Rewrites CS8420 control registers 1–6, 9 and 17 over SPI — every pass'],
  ['read8420', 360, 'Reads reg 6 back as a sanity check, then reg 16 bit 4 (UNLOCK) → tx0 bit 0'],
  ['peak', 24, 'Compares the PPM A/D value with the threshold; starts the next conversion'],
  ['txuart', 14, 'Sends the one-byte reply 0011 11xx'],
];
const CYC41 = ST41.reduce((a,s)=>a+s[1],0);
const L41 = CYC41*TCY;
const FR41 = (()=>{ let a=0; return ST41.map(s=>{ const r=a/CYC41; a+=s[1]; return r; }); })();
const PH41 = 0.000137;          // phase of the XTM41 loop relative to XTM42 — INFERRED (free-running)
const P0 = 700;                 // first idle poll in the simulated second (pass number) — INFERRED phase

/* ---------------- TABLE1 / TABLE2 (42V400C.asm, ORG 0xD00) copied as data ---------------- */
const T1 = [], T2 = [];
for (let i=0;i<=90;i++){
  let a;
  if (i===0) a=0x36; else if (i<=50) a=0x35-Math.floor((i-1)/10); else if (i<60) a=0x39-(i-51); else if (i===60) a=0x70;
  else if (i<70) a=0xB1+(i-61); else if (i<80) a=0xB1; else if (i<90) a=0xB2; else a=0xB3;
  T1.push(a);
  let b; if (i<=50) b=0x30+((10-i%10)%10); else if (i<70) b=0x20; else b=0x30+((i-70)%10);
  T2.push(b);
}
function lvlChars(idx){ const m=T1[idx]; let sign='+'; if(!(m&0x80)) sign='-'; if(m&0x40) sign=' '; return sign+String.fromCharCode(m&0x3F)+String.fromCharCode(T2[idx]); }
const lvlDb = idx => idx-60;     // index 0 = −60 … 60 = 0 … 90 = +30
const fmtDb = d => (d>0?'+':'')+d;
/* XTM41 'table' (peak thresholds, A/D counts for −15…+15 dB) */
const PEAKTAB = [4,10,14,18,25,31,37,46,52,61,70,75,85,91,99,108,120,129,138,142,150,155,164,170,177,183,190,206,211,222,225];
/* XTM41 TABLE1 (analog) and TABLE2 (digital) → CS3310 gain byte; 192 = 0 dB, 0.5 dB per step */
function cs3310Analog(i){ return i<=39 ? 244+2-11-2*i : 244-11-2*(i-40); }
function cs3310Digital(i){ return i<=60 ? 254-2*i : 132; }
const cs3310dB = code => (code-192)/2;

/* ---------------- device state ---------------- */
const DEF = ()=>({
  mode:'A', a:{src:0, lvl:64}, d:{src:0, lvl:40, bnc:0}, s:{sel:0, pair:[1,1], lvl:40, dmx:0},
  hp:0, term:0, applied:{hp:0, term:0}, set:{scr:'HP', prev:'A'}, plvl:19, ghost:false,
});
const D = Object.assign(DEF(), {
  power:true, demuxFitted:false, comout0:false,               // comout,0 = DEMUX answered at power-up
  plug:{ a1:true, a0:false, d0:false, xlr:false, bnc:false, sdiA:true, sdiB:false, emb:true, hdst:false },
  sig:{ wave:'burst', dbu:4, dbfs:-20, f:1000, phase:0, bOff:0, rs:50, fs:48000 },
  ev:null, log:[], bootAt:null, ee:null, eeTimer:null, eeDue:null, lastJump:true,
});
function snap(){ return JSON.parse(JSON.stringify({mode:D.mode,a:D.a,d:D.d,s:D.s,hp:D.hp,term:D.term,applied:D.applied,set:D.set,plvl:D.plvl,ghost:D.ghost})); }
function eeImage(st){ // the 14 bytes eewrite stores, plus 0xAA at address 35
  const b = bytesOf(st, true);
  return { 0:b.sourcea, 1:st.a.lvl, 2:b.sourced, 3:st.d.lvl, 4:1<<(st.s.pair[st.s.sel]-1), 5:st.s.lvl, 6:b.sources1, 7:b.sourceset1, 8:st.plvl,
           9:st.s.sel, 10:1<<(st.s.pair[0]-1), 11:1<<(st.s.pair[1]-1), 12:st.s.lvl, 13:st.s.lvl, 35:0xAA };
}
D.a.src = 1; D.ee = eeImage(snap()); // the unit has been used: A1 stored, as in Pics/XTM4M1 (Front).jpg

/* ---------------- derived: the firmware's source bytes ---------------- */
function bytesOf(st, forEE){
  const hp=st.hp, term=st.term, pair=st.s.pair[st.s.sel];
  const act = m => st.mode===m ? 0x80 : 0;
  const sourcea = act('A')|(term<<4)|(hp<<3)|st.a.src;
  const sourced = act('D')|0x20|(st.d.bnc<<4)|(hp<<3)|st.d.src;
  const sources1 = act('S')|0x40|(st.s.dmx<<5)|0x10|(hp<<3)|(pair-1);
  const mon = st.set.prev==='D'?1:st.set.prev==='S'?2:0;
  const sourceset1 = (st.mode==='SET'||st.ghost?0x80:0)|(mon<<5)|(term<<4)|(hp<<3)|(st.set.scr==='HP'?2:1);
  return {sourcea, sourced, sources1, sourceset1};
}
function txOf(st, dmxHalf){
  const b = bytesOf(st);
  let tx0, tx1, addr;
  if (st.mode==='SET'){ tx0=b.sourceset1|0x80; tx1=(st.plvl|0x60)&0x7F; addr='SETUP (peak byte)'; }
  else if (st.mode==='A'){ tx0=b.sourcea|0x80; tx1=st.a.lvl; addr='00 analog'; }
  else if (st.mode==='D'){ tx0=b.sourced|0x80; tx1=st.d.lvl; addr='01 AES'; }
  else { tx0=(b.sources1&~0x20)|0x80; tx1=st.s.lvl; addr='10 SDI (main board)';
         if (dmxHalf){ tx0 = 0xE0|(st.s.sel<<4)|((st.s.pair[st.s.sel]-1)&7); addr='11 DEMUX board'; } }
  return {tx0, tx1: tx1&0x7F, addr};
}

/* ---------------- inputs, locks, metered level ---------------- */
function lockD(st){ st=st||D; if (st.d.src===0) return D.plug.d0; return st.d.bnc? D.plug.bnc : D.plug.xlr; }
function sdiCarrier(st){ st=st||D; return D.demuxFitted && (st.s.sel? D.plug.sdiB : D.plug.sdiA); }
function sdiAudio(st){ return sdiCarrier(st) && D.plug.emb; }
function effMode(st){ return st.mode==='SET' ? st.set.prev : st.mode; }
function termLoss(term){ const Rin = term? 600 : 20000; return 20*Math.log10(Rin/(Rin+D.sig.rs)); }
function hpLoss(on){ if(!on || D.sig.wave==='program') return 0; const f=D.sig.f, fc=C.HP_FC; const r=(f*f)/Math.sqrt(Math.pow(fc*fc-f*f,2)+Math.pow(Math.SQRT2*fc*f,2)); return 20*Math.log10(r); }
function meterCfg(st){
  const m = effMode(st), ap = st.applied;
  let on=false, lvl=0, why='';
  if (m==='A'){ on = st.a.src? D.plug.a1 : D.plug.a0; lvl = D.sig.dbu + termLoss(ap.term) - lvlDb(st.a.lvl); why = on? '' : (st.a.src? 'rear XLR unplugged':'nothing in the front CHA/CHB jacks'); }
  else if (m==='D'){ on = lockD(st); lvl = D.sig.dbfs - lvlDb(st.d.lvl); why = on? '' : 'CS8420 not locked → MUTE-DAC'; }
  else { on = sdiAudio(st); lvl = D.sig.dbfs - lvlDb(st.s.lvl); why = on? '' : 'no SDI audio → MUTE-DAC'; }
  lvl += hpLoss(ap.hp);
  return { on, A: on? lvl : null, B: on? lvl + D.sig.bOff : null, why };
}
const monitorDbu = cfg => cfg.A===null? null : cfg.A + 4;   // "+4 dBu for a meter reading of 0" (manual)

/* ---------------- display text (analogdis / aesdis / sdidis / settingsdis) ---------------- */
function settingsText(st){ return st.set.scr==='HP' ? (st.hp? ' HP  IN ' : ' HP  OUT') : (st.term? 'TERM LZ ' : 'TERM HZ '); }
function statusText(st){
  if (st.mode==='A') return 'A'+st.a.src+(st.term?'z':' ')+' '+lvlChars(st.a.lvl)+(st.hp?'f':' ');
  if (st.mode==='D') return 'D'+st.d.src+'  '+lvlChars(st.d.lvl)+(st.hp?'f':' ');
  if (st.mode==='S') return 'S'+(st.s.sel?'B':'A')+st.s.pair[st.s.sel]+' '+lvlChars(st.s.lvl)+(st.hp?'f':' ');
  return settingsText(st);
}
function flashOn(t, tRef){ return Math.floor((t - tRef)/(C.FLASH*L42)) % 2 === 1; }
function dispOf(st, t, tRef){
  if (st.ghost) return settingsText(st);           // settingsdis runs after the mode's display routine
  if (st.mode==='D' && !lockD(st) && flashOn(t,tRef)) return ' NO LOCK';
  if (st.mode==='S'){ if (!sdiCarrier(st) && flashOn(t,tRef)) return 'NO SDI  '; if (sdiCarrier(st) && !sdiAudio(st) && flashOn(t,tRef)) return 'NO AUDIO'; }
  return statusText(st);
}
function bootPhase(){
  if (D.bootAt===null) return null;
  const e = (performance.now()-D.bootAt)/1000, hs = bootHandshake();
  if (e < hs) return {txt:'        ', e, stage:'handshake', hs};
  if (e < hs + bootWindowT()) return {txt:'04VA0001', e, stage:'window', hs};
  D.bootAt = null; return null;
}
function bootHandshake(){ // program1: 10 tries × ≈0.91 s when no DEMUX answers; program3 ≈ a few ms with XTM41
  const tryT = 39936*28*TCY;       // recieve time-out 156 × 256 iterations of a ≈28-cycle loop — INFERRED cycle count
  return (D.demuxFitted? 0.004 : 10*tryT) + 0.012;
}
function bootWindowT(){ return C.WINDOW_ITER*110*TCY; }   // ≈110 cycles per display_version iteration — INFERRED

/* ---------------- event: the last thing the operator did, placed on the timeline ---------------- */
const BTN = { MODE:{pin:'RB0',bit:3,label:'MODE'}, SOURCE:{pin:'RB1',bit:2,label:'SOURCE'}, DOWN:{pin:'RB6',bit:1,label:'DOWN'}, UP:{pin:'RB7',bit:0,label:'UP'} };
function pass42(t){ return Math.floor(t/L42); }
function stepT42(n, k){ return (n + FR42[k])*L42; }
function nextStep42(t, k){ let n = Math.ceil(t/L42 - FR42[k] - 1e-9); if (n<0) n=0; return stepT42(n,k); }
function nextStep41(t, k){ let m = Math.ceil((t-PH41)/L41 - FR41[k] - 1e-9); return {m, t: PH41 + (m+FR41[k])*L41}; }

/* Poll / exchange schedule for the simulated second */
let SCH=null, SCH_KEY='';
function exchange(pf, st, dmxHalf){
  const k = IX('settxdata'), kp = IX('pole');
  const {tx0, tx1, addr} = txOf(st, dmxHalf);
  const tTx0 = stepT42(pf, k);
  const tTx1 = nextStep42(tTx0 + C.BYTE, k);
  const tRel = nextStep42(tTx1 + C.BYTE, k);
  const rxDone = tTx1 + C.BYTE;
  const e = { pf, tx0, tx1, addr, tTx0, tTx1, tRel, dmx: !!dmxHalf, st };
  if (dmxHalf){
    if (D.demuxFitted && D.comout0){ e.tResp = rxDone + C.DMX_REPLY; e.resp = !sdiCarrier(st)? 0x02 : (D.plug.emb? 0x00 : 0x3C); e.who='DEMUX'; }
  } else {
    const sc = nextStep41(rxDone, IX41('scanuart'));
    e.m41 = sc.m; e.tScan41 = sc.t; e.tResp = PH41 + (sc.m + FR41[6])*L41; e.who='XTM41';
    const unl = effMode(st)==='A' ? 1 : effMode(st)==='D' ? (lockD(st)?0:1) : (sdiAudio(st)?0:1);
    e.resp = 0x3C | unl;
    if (st.mode!=='SET'){ e.t3310 = PH41 + (sc.m+1)*L41 + 16*9*TCY; }
  }
  if (e.tResp!==undefined){ e.tRead = nextStep42(e.tResp + C.BYTE, kp); }
  return e;
}
function IX41(n){ return ST41.findIndex(s=>s[0].includes(n)); }
function intervalFor(st, dmxNext){
  const m = st.mode;
  if (m==='S') return C.SDIFAST;
  if (m==='D' && st.d.src===1 && !lockD(st)) return C.D1FAST;
  return C.POLL + C.COMCTL;
}
function sched(){
  const ev = D.ev;
  const key = JSON.stringify([snap(), D.plug, D.demuxFitted, D.comout0, ev && [ev.t, ev.btn, ev.kind, ev.hold], D.sig.fs]);
  if (key===SCH_KEY) return SCH;
  SCH_KEY = key;
  const N = Math.ceil(1/L42)+2;
  const out = { ex:[], ev:null };
  const before = ev? ev.before : snap(), after = snap();
  let press = null;
  if (ev && ev.kind==='press'){
    const ks = IX('scan');
    const tStable = ev.t + C.BOUNCE_T;
    const n0 = Math.ceil(tStable/L42 - FR42[ks]);
    const pc = n0 + C.DEBOUNCE;
    press = { t:ev.t, tStable, n0, pc, tClosure: stepT42(pc, IX('analogmode')), tDisp: stepT42(pc, IX('refresh')),
      tUp: ev.t + ev.hold, btn: ev.btn };
    const nr = Math.ceil((press.tUp + C.BOUNCE_T)/L42 - FR42[ks]);
    press.nFree = nr + C.RELEASE; press.tFree = stepT42(press.nFree, ks);
    if (ev.btn==='MODE' && ev.setup){ press.tSetupShown = stepT42(n0 + C.SETUP_HOLD, IX('remember')); }
  }
  // generate exchanges
  let pf = P0, dmxHalf = false, forced = press? press.pc + C.COMCTL : null;
  // walk polls; the press-triggered transmission is inserted when its 150-pass delay ends
  const list = [];
  let guard=0;
  while (pf < N && guard++ < 400){
    let isBtn = false;
    if (forced!==null && forced <= pf){ pf = forced; forced = null; isBtn = true; }
    const tFire = stepT42(pf, IX('settxdata'));
    const st = (press && tFire < press.tClosure) ? before : after;
    const e = exchange(pf, st, st.mode==='S' && dmxHalf);
    e.cause = isBtn? 'button' : 'poll';
    list.push(e);
    if (forced!==null && forced <= pass42(e.tRead!==undefined? e.tRead : e.tRel)) forced = pass42(e.tRead!==undefined? e.tRead : e.tRel)+1;
    if (e.tRead===undefined){ // nobody answered: loss_of_com waits 6656 passes, then re-transmits addressing the DEMUX first
      pf = pass42(e.tRel) + C.LOSS; continue; }
    if (st.mode==='S') dmxHalf = !dmxHalf;
    pf = pass42(e.tRead) + intervalFor(st);
  }
  out.ex = list;
  // when does the meter path change?
  let tSw = null, swEx = null;
  if (press){ swEx = list.find(e=>e.tTx0 > press.tClosure && e.t3310!==undefined); /* any exchange after the closure carries the new state */ tSw = swEx? swEx.t3310 : press.tClosure; }
  if (ev && ev.kind==='plug-aes'){ swEx = list.find(e=>e.tTx0 > ev.t && e.t3310!==undefined); tSw = swEx? swEx.t3310 : 2; }
  if (ev && ev.kind==='plug-analog') tSw = ev.t + 0.0005;
  if (ev && ev.hunt){ // XTM42 flips XLR ⇄ BNC after 5 unlocked replies; the next exchange then carries the new input
    const base = (press? press.tClosure : ev.t); const unl = list.filter(e=>e.tRead>base && !e.dmx);
    const flipAt = unl[C.HUNT-1]; if (flipAt){ out.huntT = flipAt.tRead; const nx = list.find(e=>e.tTx0>flipAt.tRead && e.t3310!==undefined); tSw = nx? nx.t3310 : 2; }
    else tSw = 2;
  }
  out.press = press; out.tSw = tSw; out.before = before; out.after = after;
  out.tRef = press? press.tDisp : -2.5;
  SCH = out; return out;
}
function stAt(t){ const S=sched(); return (S.press && t < S.press.tDisp) ? S.before : S.after; }
function dispAt(t){
  if (!D.power) return '        ';
  const b = bootPhase(); if (b) return b.txt;
  const S = sched();
  if (S.press && S.press.tSetupShown!==undefined && t>=S.press.tSetupShown && t<S.press.tUp) return ' SETUP  ';
  return dispOf(stAt(t), t, S.tRef);
}

/* ---------------- needle ballistics ---------------- */
/* VU: ANSI C16.5 / IEC 60268-17 — 99 % of reference deflection in 300 ms, 1–1.5 % overshoot. Modelled as a
   2nd-order movement driven by the full-wave average (ζ = 0.81 → 1.25 % overshoot; ωn tuned at load).
   PPM: the face in Pics/XTM4M1 (Front).jpg is scaled −12…+12 like an EBU (IEC 60268-10 type IIb) meter;
   we model that: fast attack (τ tuned so a 10 ms burst reads ≈2.5 dB low) and a 24 dB / 2.8 s return.
   The ballistics live in analog circuits (OP275s + meter movements), not in either PIC — all INFERRED. */
const VUZ = 0.81; let VUW = 13;
const PPM_DECAY = 24/2.8; let PPM_TA = 0.004; const PPM_W = 2*Math.PI*22, PPM_Z = 0.9;
function vuStepTime(w){ const dt=1/4000; let p=0, v=0; for (let i=1;i<4000;i++){ const a=w*w*(1-p)-2*VUZ*w*v; v+=a*dt; p+=v*dt; if (p>=0.99) return i*dt; } return 1; }
(function tune(){ let lo=2, hi=60; for (let k=0;k<40;k++){ const m=(lo+hi)/2; if (vuStepTime(m)>0.3) lo=m; else hi=m; } VUW=(lo+hi)/2;
  const burst = ta=>{ const fs=48000, dt=1/fs; let e=0; for (let i=0;i<0.01*fs;i++){ const r=Math.abs(Math.sin(2*Math.PI*5000*i*dt)); if (r>e) e+=(r-e)*dt/ta; } return 20*Math.log10(e); };
  let a=0.0003, b=0.03; for (let k=0;k<40;k++){ const m=(a+b)/2; if (burst(m) < -2.5) b=m; else a=m; } PPM_TA=(a+b)/2; })();
const vuFrac = dB => Math.pow(10,(dB-3)/20);                 // 0 VU at 70.8 % of full scale, +3 VU = 100 %
const vuAngle = p => -48 + 96*Math.max(-0.03, Math.min(1.08,p));
function ppmFrac(dB){ if (dB===null || !isFinite(dB)) return -0.12; return dB>=-12 ? (dB+12)/24 : -0.12*(1-Math.pow(10,(dB+12)/20)); }
const ppmAngle = q => -45 + 90*Math.max(-0.13, Math.min(1.08,q));
function rnd(i){ const x=Math.sin(i*12.9898+78.233)*43758.5453; return x-Math.floor(x); }
function progEnv(t){ // deterministic "speech" envelope: syllables at ~4 Hz with pauses — INFERRED test material
  const k=Math.floor(t*4.3), ph=t*4.3-k; const a = rnd(k)<0.22? 0 : 0.35+0.65*rnd(k+99); return a*Math.pow(Math.sin(Math.PI*ph),2); }
function srcWave(t, ch){
  const s=D.sig, w=2*Math.PI*s.f, ph = ch? -s.phase*Math.PI/180 : 0;
  switch(s.wave){
    case 'tone': return Math.sin(w*t+ph);
    case 'burst': return (t>=0.1 && t<0.6)? Math.sin(w*t+ph) : 0;
    case 'short': { const u=((t%0.25)+0.25)%0.25; return (u>=0.05 && u<0.06)? Math.sin(2*Math.PI*5000*t+ph) : 0; }
    case 'program': { const e=progEnv(t); return 1.9*e*(0.55*Math.sin(2*Math.PI*220*t+ph)+0.3*Math.sin(2*Math.PI*331*t+1+ph)+0.2*Math.sin(2*Math.PI*497*t+2+ph)+0.12*(rnd(Math.floor(t*48000))-0.5)); }
    default: return 0;
  }
}
function meterIn(cfg, t, ch){ const dB = ch? cfg.B : cfg.A; if (dB===null || !D.power) return 0; return Math.SQRT2*Math.pow(10,dB/20)*srcWave(t,ch); }
let MS=null, MS_KEY='';
function meterSim(){
  const S = sched(), cb = meterCfg(S.before), ca = meterCfg(S.after);
  const key = JSON.stringify([cb, ca, S.tSw, D.sig, D.power]);
  if (key===MS_KEY) return MS; MS_KEY = key;
  const fs = 48000, dt = 1/fs, DEC = 12, N = fs/DEC + 1;
  const out = { vu:[new Float32Array(N), new Float32Array(N)], ppm:[new Float32Array(N), new Float32Array(N)], DEC, fs, cb, ca, tSw:S.tSw };
  const kAvg = Math.pow(10,-3/20)/(2*Math.SQRT2/Math.PI);
  for (let ch=0; ch<2; ch++){
    let p=0, v=0, e=0, q=-0.12, qv=0;
    const decay = Math.pow(10, -PPM_DECAY/20*dt);
    for (let i=-fs; i<=fs; i++){                       // 1 s of pre-roll with the "before" settings
      const t = i*dt, cfg = (S.tSw!==null && t>=S.tSw)? ca : cb;
      const x = meterIn(cfg, t, ch), r = Math.abs(x);
      const a = VUW*VUW*(r*kAvg - p) - 2*VUZ*VUW*v; v += a*dt; p += v*dt;
      if (p < -0.03){ p=-0.03; v=Math.max(0,v); } if (p>1.1){ p=1.1; v=Math.min(0,v); }
      const rr = r/Math.SQRT2; if (rr > e) e += (rr-e)*dt/PPM_TA; e *= decay; if (e<1e-6) e=1e-6;
      const tgt = ppmFrac(20*Math.log10(e)); const qa = PPM_W*PPM_W*(tgt-q) - 2*PPM_Z*PPM_W*qv; qv += qa*dt; q += qv*dt;
      if (i>=0 && i%DEC===0){ out.vu[ch][i/DEC]=p; out.ppm[ch][i/DEC]=q; }
    }
  }
  MS = out; return out;
}
function needlesAt(t){
  if (!D.power) return {vu:[-0.03,-0.03], ppm:[-0.12,-0.12]};
  const M = meterSim(); const i = Math.max(0, Math.min(M.vu[0].length-1, Math.round(t*M.fs/M.DEC)));
  return { vu:[M.vu[0][i], M.vu[1][i]], ppm:[M.ppm[0][i], M.ppm[1][i]] };
}
const vuDbOf = p => p>0.005? 20*Math.log10(p)+3 : -Infinity;
const ppmDbOf = q => q>=0? q*24-12 : q<-0.11? -Infinity : -12+20*Math.log10(Math.max(1e-4,1-q/-0.12));
/* phase meter: LM393 squarers + 74HC00 XOR + RC (XTM4-1 nets U34/U35/H1-16) → RA0 → ADRESH >> 5 */
function phaseLed(t){
  if (!D.power) return -1;
  const b = bootPhase(); if (b) return 0;
  const cfg = meterCfg(stAt(t));
  if (!cfg.on || D.sig.wave==='off') return 0;                 // silence: both comparators equal → 0° LED — INFERRED
  const deg = Math.abs(D.sig.phase)%361;
  return Math.min(7, Math.floor(deg/180*8));
}

/* ---------------- actions: what the buttons do in code ---------------- */
function act(name, fn, opts){
  opts = opts||{};
  const before = snap(), trace = [];
  const tr = s => trace.push(s);
  if (!D.power) tr('The unit is off: nothing happens.');
  else if (bootPhase() && !opts.any) tr('Still booting (handshake / opening window): the main loop has not started, so scan never runs.');
  else fn(tr);
  if (opts.kind){
    let t = Math.min(SIM.t, opts.kind==='press'? 0.55 : 0.8);
    D.ev = { t, kind: opts.kind, btn: opts.btn||null, hold: opts.hold||0.12, before, hunt: !!opts.hunt, setup: !!opts.setup };
  }
  D.log.unshift({ t: SIM.t, name, trace: trace.slice(), disp: statusText(snap()) });
  if (D.log.length>60) D.log.length = 60;
  if (opts.kind==='press' || opts.save) scheduleEE();
  SCH_KEY=''; MS_KEY='';
  const S = sched();
  if (D.lastJump && !SIM.playing && opts.kind==='press' && S.press) SIM.seek(S.press.tDisp + 1e-6); else SIM.refresh();
}
function scheduleEE(){
  if (D.eeTimer) clearTimeout(D.eeTimer);
  const ms = (C.EE_DELAY + C.RELEASE)*L42*1000;
  D.eeDue = performance.now() + ms;
  D.eeTimer = setTimeout(()=>{ D.ee = eeImage(snap()); D.eeTimer=null; D.eeDue=null; D.log.unshift({t:SIM.t, name:'eewrite fires (≈15.8 s after the last release)', trace:['press_flag,2 was set at release; rem2/rem4 counted 46 336 passes','remember5 delay, then eew × 14 bytes + 0xAA at address 35 (each eew waits for EECON1,WR)','Main loop stalls ≈ 15 × 4 ms while the EEPROM writes (typical PIC16F874 write time) — '+'inferred'], disp: statusText(snap())}); SIM.refresh(); }, ms);
}
function huntCheck(tr){
  if (D.mode!=='D' || D.d.src!==1 || lockD()) return false;
  const other = D.d.bnc? D.plug.xlr : D.plug.bnc;
  tr(`D1 is not locked: check_lock counts bcount 5 → 0 on unlocked replies (aes_control re-polls every ${C.D1FAST} passes ≈ ${(C.D1FAST*L42*1000).toFixed(0)} ms)`);
  if (!other){ tr('…then no_lock flips sourced,4 (XLR ⇄ BNC) anyway and keeps hunting every 5 replies, because neither input has a signal'); D.d.bnc ^= 1; return true; }
  D.d.bnc ^= 1;
  tr(`no_lock: movlw b'00010000' / xorwf sourced,f → input ${D.d.bnc?'BNC (75 Ω)':'XLR (110 Ω)'}; lock,0 = 1; polecount1 = 1, polecount0 = 5`);
  tr('XTM41 proclvld enables that receiver (aes1 = XLR on RE0, aes3 = BNC on RA2, active low) → CS8420 locks → DAC unmutes on the next command');
  return true;
}
const A = {
  press(btn, o){ o=o||{};
    const B = BTN[btn]; let hunt=false;
    act(`Press ${btn}${o.auto?' (auto-repeat)':''}`, tr=>{
      tr(`scan: ${B.pin} low → scan0,${B.bit} = 1 (the source comments call ${btn==='UP'?'RB7 "dn"':btn==='DOWN'?'RB6 "up"':btn==='MODE'?'RB0 "source"':'RB1 "mode"'}; see Findings)`);
      tr(o.auto? `auto: after ${C.AUTO_ENTER} passes held (≈${(C.AUTO_ENTER*L42).toFixed(2)} s), every ${C.AUTO_REP} passes (≈${(C.AUTO_REP*L42*1000).toFixed(0)} ms) → bcf scan0,3 / scan0,2 (UP/DOWN only) → flag0,0`
               : `debounce: ${C.DEBOUNCE} equal scans (bounce,6 ≈ ${(C.DEBOUNCE*L42*1000).toFixed(1)} ms) → flag0,0 closure, flag0,1 wait-for-release, txflags,0 = 1, auto1 = autoenter`);
      if (D.ghost) tr('sourceset1,7 is still set from EEPROM (see Findings): settingsdis overwrites the display after this mode\'s routine');
      if (D.mode==='SET') setBtn(btn, tr);
      else if (D.mode==='A') anaBtn(btn, tr);
      else if (D.mode==='D') aesBtn(btn, tr);
      else sdiBtn(btn, tr);
      if (D.mode==='D') hunt = huntCheck(tr);
    }, {kind:'press', btn, hold: o.hold||0.12, get hunt(){ return hunt; }});
  },
  holdMode(){
    if (D.mode==='SET'){ A.press('MODE'); return; }
    const was = D.mode;
    act('Hold MODE until SETUP (≈4 s)', tr=>{
      tr('First the press itself: after 64 scans the mode routine runs once — MODE steps the source exactly like a short press:');
      if (D.mode==='A') anaBtn('MODE', tr); else if (D.mode==='D') aesBtn('MODE', tr); else sdiBtn('MODE', tr);
      tr(`remember: RB0 still low → remm0 × remm1 count ${C.SETUP_HOLD} passes (≈${(C.SETUP_HOLD*L42).toFixed(1)} s, ${'inferred'} pass time)`);
      tr('Writes " SETUP  " straight into dis0…dis7, call refresh, then loops in remember3 (clrwdt only) until RB0 goes high — UART, phase LEDs and display updates all stop meanwhile');
      tr('stage_1 on release: bsf sourceset1,7; screen = filter (sourceset1,1); temp2 remembers the active mode; sourcea/sourced/sources1 bit 7 cleared');
      D.set.prev = D.mode==='SET'? D.set.prev : D.mode; D.set.scr='HP'; D.mode='SET';
      tr(`Display: "${settingsText(snap())}". The meters keep showing ${D.set.prev==='A'?'ANALOG':D.set.prev==='D'?'AES':'SDI'} (the source after the MODE step)`);
      if (was!==D.set.prev) tr(`Note: you entered SETUP from ${was==='A'?'ANALOG':was==='D'?'AES':'SDI'} but you will leave it in ${D.set.prev==='A'?'ANALOG':D.set.prev==='D'?'AES':'SDI'}`);
    }, {kind:'press', btn:'MODE', hold: 0.9, setup:true});
  },
  plug(which, on){
    const names = {a1:'rear ANALOG INPUT XLRs', a0:'patch cords in CHA/CHB', d0:'patch cord in the AES jack', xlr:'AES INPUT 110 Ω XLR', bnc:'AES INPUT 75 Ω BNC', sdiA:'SDI 1 (A) on the DEMUX-4 plate', sdiB:'SDI 2 (B) on the DEMUX-4 plate', emb:'embedded audio in the SDI signal', hdst:'headset in HDST'};
    let hunt=false;
    const kind = (which==='a1'||which==='a0'||which==='hdst')? 'plug-analog' : 'plug-aes';
    act(`${on?'Connect':'Disconnect'} ${names[which]}`, tr=>{
      D.plug[which]=on;
      if (kind==='plug-analog'){ tr(which==='hdst'? 'HDST is a passive 600 Ω headset feed from the monitor amplifier: no firmware involved' : 'Pure analog path: relays REL1/REL2 already select jack or XLR, so the meters react at once'); return; }
      tr('XTM41 read8420 (every pass): reg 16 bit 4 (UNLOCK) → tx0 bit 0; the change reaches XTM42 in the next reply byte');
      tr('The DAC is (un)muted only when XTM41 processes the next command (proclvld: cs8420_16_aes,0 → PORTA,5 MUTE-DAC)');
      if (which.startsWith('sdi')||which==='emb') tr('DEMUX-4 (demux4.c processUart): reply 0x02 = no carrier, 0x3C = group audio unlocked, 0x00 = locked');
      hunt = huntCheck(tr);
    }, {kind, any:true, get hunt(){ return hunt; }});
  },
  power(){
    if (D.power){ act('Power off', tr=>{ tr('Mains off: meter lamps, display and LEDs go dark; settings not yet saved by eewrite are lost'); }, {any:true}); D.power=false; D.bootAt=null; if(D.eeTimer){clearTimeout(D.eeTimer);D.eeTimer=null;D.eeDue=null;} SIM.refresh(); return; }
    D.power = true; D.bootAt = performance.now();
    const ee = D.ee;
    Object.assign(D, DEF());
    const tr = [];
    tr.push('INIT: ports, TRISA–E, UART 9600 Bd (spbrg 7), A/D on RA0 (Fosc/32), display_set (HDSP-2533 reset on RA2, CE RB4, control word 0)');
    tr.push('Preloads dis0…7 with "ANG1 +4 " — never shown, because refresh is not called before opening_window overwrites it');
    if (ee && ee[35]===0xAA){
      tr.push('EEPROM address 35 = 0xAA ("first time detect") → restore sourcea, alvl1, sourced, dlvl1, sources2, slvl1, sources1, sourceset1, plvl1, sdi_input_sel, sources2a/b, slvl1a/b');
      const sa=ee[0], sd=ee[2], s1=ee[6], ss=ee[7];
      D.a.src = sa&1; D.a.lvl = ee[1]; D.d.src = sd&1; D.d.bnc=(sd>>4)&1; D.d.lvl = ee[3]; D.s.lvl = ee[5]; D.plvl = ee[8]; D.s.sel = ee[9]&1;
      D.s.pair = [Math.max(1,Math.log2(ee[10]||1)+1), Math.max(1,Math.log2(ee[11]||1)+1)];
      D.hp = (sa>>3)&1; D.term=(sa>>4)&1; D.applied={hp:D.hp, term:D.term};
      D.mode = (sa&0x80)? 'A' : (sd&0x80)? 'D' : (s1&0x80)? 'S' : 'A';
      if (ss&0x80){ D.mode='A'; D.ghost=true; D.set.scr = (ss&1)? 'TERM' : 'HP'; tr.push('setup(): stored sourceset1,7 = 1 → bsf sourcea,7 (analog) — but sourceset1,7 is NOT cleared: settings mode stays half-active (see Findings)'); }
      if (!(sa&0x80)&&!(sd&0x80)&&!(s1&0x80)&&!(ss&0x80)) D.mode='A';
    } else tr.push('No 0xAA at EEPROM 35 → nomatch: power-up defaults (analog A0, +4; AES −20; SDI −20; peak +4) and bsf sourcea,7');
    D.comout0 = D.demuxFitted;
    tr.push(D.demuxFitted? 'program1: send 0xE8 0x55 → DEMUX-4 replies 0xE0 → comout,0 = 1 (SDI available)' : `program1: send 0xE8 0x55 up to 10 times; nobody answers (XTM41 ignores address 11) → each try times out after 156 × 256 loops ≈ 0.9 s → ≈${(bootHandshake()).toFixed(1)} s of blank display (${'inferred'} loop timing)`);
    tr.push('program2 (send1/recieve1, 0xE0) is skipped — goto program3');
    tr.push('program3: send sourcea|0x80 and plvl1|0x60 → XTM41 stores the peak threshold and answers 0x3C → com1,1');
    tr.push(`opening_window: "04VA0001" for 25 600 refreshes (≈${bootWindowT().toFixed(1)} s, ${'inferred'})`);
    if (D.mode==='S' && !D.comout0){ D.mode='A'; tr.push('setup(): stored SDI mode but comout,0 = 0 → analog'); }
    tr.push('main: first pass calls setup() once (read,0), then the normal loop');
    D.log.unshift({t:SIM.t, name:'Power on', trace:tr, disp: statusText(snap())});
    D.ev = null; SCH_KEY=''; MS_KEY=''; SIM.refresh();
  },
  setDemux(on){ D.demuxFitted = on; act(on?'Fit DEMUX-4 board':'Remove DEMUX-4 board', tr=>{ tr(on? 'The board is on the RS-485 bus now, but XTM42 only looks for it at power-up (program1 → comout,0). Power-cycle to use SDI.' : 'Without the board, address-11 messages go unanswered'); if (!on && D.mode==='S') tr('In SDI mode the next DEMUX half gets no reply: loss_of_com re-transmits after 6656 passes and keeps addressing the DEMUX (sources1,5) — buttons stop working (see Findings)'); }, {any:true}); },
  factory(){ if (D.eeTimer){ clearTimeout(D.eeTimer); D.eeTimer=null; D.eeDue=null; }
    Object.assign(D, DEF()); D.ee=null; D.ev=null; D.log=[]; D.power=true; D.bootAt=null; D.comout0=D.demuxFitted;
    Object.assign(D.plug, {a1:true,a0:false,d0:false,xlr:false,bnc:false,sdiA:true,sdiB:false,emb:true,hdst:false});
    SCH_KEY=''; MS_KEY=''; SIM.refresh(); },
};
/* --- per-mode button routines (names and registers from the .asm files) --- */
function anaBtn(btn, tr){
  const a=D.a;
  tr('analogmode: btfss sourcea,7 → in ANALOG; bcf read,6; bcf flag0,0');
  if (btn==='UP'){ tr('btfsc scan0,0 → anl1up: bsf temp2,0; bcf disctl,6/7; peakdisplay2 = 15');
    if (a.lvl===90){ tr('movlw 90 / subwf alvl1 → already +30: return'); return; } a.lvl++; }
  else if (btn==='DOWN'){ tr('scan0,1 → anl1dn');
    if (a.lvl===0){ tr('alvl1 = 0 (−60): return'); return; } a.lvl--; }
  else if (btn==='SOURCE'){ tr('scan0,2 → anl1mode: temp0 = sourcea xor 1 → copy bit 0 back'); a.src^=1;
    tr(`sourcea,0 = ${a.src} → A${a.src} (${a.src?'rear XLRs':'front CHA/CHB jacks'}); XTM41 proclvla sets RB7/RB6 (INSET/INRES, REL1/REL2 via ULN2803)`); D.applied={hp:D.hp,term:D.term}; return; }
  else if (btn==='MODE'){ tr('scan0,3 → anl1source: clrf uart0; bcf disctl,0 ("assume lock"); lockflash1 = 20'); D.mode='D';
    tr('bcf sourcea,7; bsf sourced,7 → AES mode; bcf sources1,7 / sources1,4'); tr(`Display: "${statusText(snap())}" — XTM41 proclvld switches PORTD,6 to digital and enables ${D.d.src? (D.d.bnc?'the BNC':'the XLR'):'the front-jack'} receiver`); D.applied={hp:D.hp,term:D.term}; return; }
  tr(`alvl1 → ${a.lvl} = ${fmtDb(lvlDb(a.lvl))} dBu for 0 VU; analogdis: TABLE1/TABLE2 → "${lvlChars(a.lvl)}"`);
  tr(`Next transmission tx1 = ${a.lvl}; XTM41 TABLE1 → CS3310 byte ${cs3310Analog(a.lvl)} (${fmtDb(cs3310dB(cs3310Analog(a.lvl)))} dB), GAINSEL (RD5) = ${a.lvl>=40?'low gain':'high gain'}`);
  D.applied={hp:D.hp,term:D.term};
}
function aesBtn(btn, tr){
  const d=D.d;
  tr('aesmode: btfss sourced,7 → in AES; closure → bcf flag0,0');
  if (btn==='UP'){ tr('aes1up: lockflash1 = 20, bcf lockflash2,0 (status shown first)'); if (d.lvl===60){ tr('dlvl1 = 60 (0 dBFS): return'); return; } d.lvl++; }
  else if (btn==='DOWN'){ tr('aes1dn'); if (d.lvl===10){ tr('dlvl1 = 10 (−50 dBFS, the manual\'s limit): return'); return; } d.lvl--; }
  else if (btn==='SOURCE'){ tr('aes1mode: sourced,0 ^= 1'); d.src^=1; tr(`→ D${d.src} (${d.src? 'rear XLR or BNC, auto-detect':'front AES jack'}); XTM41 picks the 75176 receiver: aes2 jack = RE1, aes1 XLR = RE0, aes3 BNC = RA2`); return; }
  else if (btn==='MODE'){ tr('aes1source: clrf uart0; bcf sourced,7; bsf sourcea,7; bsf sources1,5');
    if (D.comout0){ D.mode='S'; D.s.sel=0; D.s.dmx=0; tr('btfsc comout,0 (DEMUX answered at power-up) → sdiaselected: sdi_input_sel = 0 (input A), sources2 = sources2a, s2..s0 = pair'); tr(`bsf sources1,7; bcf sourcea,7; bsf sources1,4 → SDI "${statusText(snap())}"`); }
    else { D.mode='A'; tr('comout,0 = 0 (no DEMUX found at power-up) → stays in ANALOG'); }
    tr('bcf sourceset1,0/1, bsf sourceset1,2 (peak screen first — later overridden by stage_1)'); return; }
  tr(`dlvl1 → ${d.lvl} = ${fmtDb(lvlDb(d.lvl))} dBFS for 0 VU; display "${lvlChars(d.lvl)}"; XTM41 TABLE2 → CS3310 ${cs3310Digital(d.lvl)} (${fmtDb(cs3310dB(cs3310Digital(d.lvl)))} dB)`);
}
function sdiBtn(btn, tr){
  const s=D.s;
  tr('sdimode: btfss sources1,7 → in SDI; btfsc sources1,5 → return while the last message addressed the DEMUX (the closure waits ≤ one 55 ms exchange)');
  if (btn==='UP'){ if (s.lvl===60){ tr('slvl1 = 60: return'); return; } s.lvl++; tr(`sdi_up: slvl1 → ${fmtDb(lvlDb(s.lvl))} dBFS`); }
  else if (btn==='DOWN'){ if (s.lvl===10){ tr('slvl1 = 10: return'); return; } s.lvl--; tr(`sdi_dn: slvl1 → ${fmtDb(lvlDb(s.lvl))} dBFS`); }
  else if (btn==='SOURCE'){ const p=s.pair[s.sel]; s.pair[s.sel] = p===8? 1 : p+1; tr(`sdi_mode: rlf sources2 (one-hot), incf sources1 → SD${p} → SD${s.pair[s.sel]} (after SD8: sDI0 → SD1)`);
    tr(`DEMUX byte: audio_select = group ${Math.ceil(s.pair[s.sel]/2)}, audio_swap = ${(s.pair[s.sel]-1)&1}; XTM41 TABLE_1 → 74HC125 SDI1/SDI2 (RB0/RB1)`); }
  else if (btn==='MODE'){
    if (s.sel===0){ s.sel=1; tr('sdi_source: btfss sdi_input_sel,0 → selsecsdi (Ali-Add): sdi_input_sel = 1, sources2a saved, sources2 = sources2b → SDI input B'); tr('tx0 bit 4 (masked filter position) now carries input_select for the DEMUX-4'); }
    else { tr('sdi_source with input B: sources2b saved; bcf sources1,4; bsf sources1,5; flag0,6 = "transmit twice"');
      tr('sdidis stops updating (sources1,4 = 0): the display freezes on the SDI text until sdi_control → sdi_to_ana on the second reply'); D.mode='A'; s.sel=0; tr(`→ ANALOG "${statusText(snap())}"`); }
  }
}
function setBtn(btn, tr){
  tr('settingsmode: btfss sourceset1,7 → in SETUP');
  if (btn==='SOURCE'){ tr(`set1mode: ${D.set.scr==='HP'?'filter set → term':'term set → filt'} (the PEAK branch is commented out in the "B" builds)`); D.set.scr = D.set.scr==='HP'?'TERM':'HP'; }
  else if (btn==='UP'){ if (D.set.scr==='HP'){ D.hp=1; tr('set1up → filter_setup: bsf sourceset1,3, sourcea,3, sources1,3, sourced,3 (HP in)'); } else { D.term=0; tr('set1up → term_setup: bcf sourceset1,4, sourcea,4 (HZ = bridging)'); } }
  else if (btn==='DOWN'){ if (D.set.scr==='HP'){ D.hp=0; tr('set1dn → filter_setup2: HP out'); } else { D.term=1; tr('set1dn → term_setup2: bsf sourceset1,4, sourcea,4 (LZ = 600 Ω)'); } }
  else if (btn==='MODE'){ tr('set1source: txflags,0; clrf uart0; bsf hold,1 (leave SETUP)'); tr('remember → stage_2: bcf sourceset1,7; temp2 bits 1–3 restore sourcea/sourced/sources1,7; bsf sources1,5');
    D.mode = D.set.prev; if (D.ghost){ D.ghost=false; } D.applied={hp:D.hp, term:D.term}; tr(`Back to "${statusText(snap())}"; the next tx0 carries HP/TERM to XTM41 (PORTD,7 HIGH_PASS, REL3 TERMSET/TERMRES)`); return; }
  tr(`Display: "${settingsText(snap())}". While in SETUP tx1 = plvl1|0x60, which XTM41 treats as peak data and returns before touching relays — so HP/TERM take effect only after you leave SETUP`);
}

/* ================================================================
   DRAWING: front panel (real silkscreen), rear panel
   ================================================================ */
/* Built on XTM4M1-FRONT-SILK (CURVE).pdf (2016|49 drafting set): GREEN and WHITE separations cut at 200 dpi into
   assets/xtm4-front-*.png (3419 × 679 px = the panel face between the rack ears). The 19" photo
   (Pics/XTM4M1 (Front).jpg) puts that face 190 px (0.95") in from each edge, so the SVG is 3800 × 700.
   Meters (580 × 256 windows), buttons (95 × 142), jacks and the display window sit on the white drill
   crosshairs; the 8 phase LEDs have no crosshair and are placed from the photo. */
const ASSET = 'siumulation-plugins/assets/';
/* Artwork 2026|59: the default faces are the CorelDRAW vector art itself, assets/xtm4-front.svg (XTM4M1-FRONT-SILK
   (CURVE).cdr, viewBox = its panel outline 80.6,62.6, 1231.2 × 244.6 pt; GREEN plate in green with its knock-outs in the
   panel colour, WHITE plate moved up 319.7 pt, mechanical lines grey) and assets/xtm4-rear.svg (XTM4M2-REAR-SILK
   (CURVE).cdr, outline 71.9,237.7). Same frame as the 200 dpi PNGs, so the meters, buttons, jacks and LEDs stay on their
   holes. Drill crosshairs (guide strokes) are left out. The PNGs stay behind the "PNG silk" toggle. */
const ART = { png:false, DIR:'XTM4 - #MASTER/XTM4 - #ARTWORK #DA #2016/', FRONT:'XTM4M1-FRONT-SILK (CURVE).cdr', REAR:'XTM4M2-REAR-SILK (CURVE).cdr' };
const artSrc = k => SIM.src(ART.DIR+ART[k], ART[k]);
function artNote(which){
  const f = which==='rear'? artSrc('REAR')+' (MAY 15/15 on the sheet)' : artSrc('FRONT')+' (GREEN + WHITE plates, Nov 9 2015 file)';
  return `<div class="small muted" style="margin-top:4px">Artwork: ${f}, CorelDRAW vector art. <label><input type="checkbox" class="artpng" ${ART.png?'checked':''}> show the earlier PNG silk (200 dpi cut of the PDF)</label></div>`;
}
function bindArt(m){ m.querySelectorAll('.artpng').forEach(c=> c.onchange=e=>{ ART.png=e.target.checked; m.querySelectorAll('.artpng').forEach(o=>o.checked=ART.png); SIM.refresh(); }); }
const OX = 190, OY = 10;
const MX = [380,1095,2325,3040], MYc = 286, MW = 580, MH = 256;
const BX = {MODE:1507, SOURCE:1642, DOWN:1777, UP:1911}, BYc = 360;
const JX = [1511,1643,1776,1908], JYc = 550;
const DISP = {x:1504, y:122, w:406, h:98};
function ppmTicks(){ return [-12,-8,-4,0,4,8,12]; }
function meterSVG(id, cx, cy, kind, frac, lamp){
  const x0=cx-MW/2, y0=cy-MH/2, px=cx, py=cy+176, R=246;
  const ang = kind==='vu'? vuAngle(frac) : ppmAngle(frac);
  const P = (a, r)=>{ const t=a*Math.PI/180; return [px + r*Math.sin(t), py - r*Math.cos(t)]; };
  let s = `<clipPath id="xmc${id}"><rect x="${x0}" y="${y0}" width="${MW}" height="${MH}" rx="12"/></clipPath><g clip-path="url(#xmc${id})">
    <rect x="${x0}" y="${y0}" width="${MW}" height="${MH}" fill="${lamp?'url(#xamber)':'#4a3f2c'}"/>`;
  const ink = lamp? '#1b1206' : '#141008';
  const arc = (a0,a1,r,w,col)=>{ const [x1,y1]=P(a0,r), [x2,y2]=P(a1,r); return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${w}"/>`; };
  if (kind==='vu'){
    s += arc(vuAngle(vuFrac(-20)), vuAngle(vuFrac(0)), R, 3, ink) + arc(vuAngle(vuFrac(0)), vuAngle(vuFrac(3)), R+4, 11, '#a3201a');
    [-20,-10,-7,-5,-3,-2,-1,0,1,2,3].forEach(d=>{ const a=vuAngle(vuFrac(d)); const [x1,y1]=P(a,R), [x2,y2]=P(a,R+20), [tx,ty]=P(a,R+42);
      s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${d>0?'#a3201a':ink}" stroke-width="4"/><text x="${tx.toFixed(1)}" y="${(ty+8).toFixed(1)}" font-size="25" font-weight="700" text-anchor="middle" fill="${d>0?'#a3201a':ink}">${d>0?'+'+d:d}</text>`; });
    [20,40,60,80,100].forEach(pc=>{ const a=vuAngle(pc/100*0.708); const [x1,y1]=P(a,R-6), [tx,ty]=P(a,R-30);
      s += `<circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="4" fill="${ink}"/><text x="${tx.toFixed(1)}" y="${(ty+6).toFixed(1)}" font-size="15" text-anchor="middle" fill="${ink}">${pc}</text>`; });
    s += `<text x="${(x0+120).toFixed(0)}" y="${y0+62}" font-size="24" font-weight="700" fill="${ink}">VU</text><text x="${(x0+MW-140).toFixed(0)}" y="${y0+62}" font-size="24" font-weight="700" fill="#a3201a">VU</text>`;
  } else {
    s += arc(ppmAngle(0), ppmAngle(1), R, 3, ink) + arc(ppmAngle(20/24), ppmAngle(1), R+8, 16, '#c45a10');
    for (let d=-12; d<=12; d+=2){ const a=ppmAngle((d+12)/24); const [x1,y1]=P(a,R), [x2,y2]=P(a,R+(d%4?12:22)); s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${ink}" stroke-width="4"/>`; }
    ppmTicks().forEach(d=>{ const a=ppmAngle((d+12)/24); const [tx,ty]=P(a,R+44); s += `<text x="${tx.toFixed(1)}" y="${(ty+8).toFixed(1)}" font-size="25" font-weight="700" text-anchor="middle" fill="${ink}">${d>0?'+'+d:d}</text>`; });
  }
  s += `<rect x="${cx-44}" y="${cy+46}" width="88" height="30" rx="7" fill="none" stroke="${ink}" stroke-width="3"/><text x="${cx}" y="${cy+68}" font-size="20" font-weight="800" text-anchor="middle" fill="${ink}">WBS</text>`;
  const [nx,ny]=P(ang, R+30);
  s += `<line x1="${px}" y1="${py}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="#0c0c0c" stroke-width="4.5" stroke-linecap="round"/>`;
  s += `</g><rect x="${x0}" y="${y0}" width="${MW}" height="${MH}" rx="12" fill="none" stroke="#090909" stroke-width="9"/>`;
  return s;
}
function frontSVG(t, opts){
  opts = opts||{};
  const on = D.power, txt = dispAt(t), led = phaseLed(t), N = needlesAt(t);
  const S = sched();
  const down = b => (S.press && S.press.btn===b && t>=S.press.t && t<S.press.tUp) || (UIH && UIH.btn===b);
  let s = `<svg viewBox="0 0 3800 700" role="img" aria-label="XTM4 front panel (real silkscreen)" style="width:100%;display:block;border-radius:6px">
   <defs><radialGradient id="xamber" cx="50%" cy="75%" r="75%"><stop offset="0" stop-color="#ffd27a"/><stop offset=".6" stop-color="#f3b13e"/><stop offset="1" stop-color="#c97c12"/></radialGradient>
   <filter id="xglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect width="3800" height="700" fill="#2a2a29"/><rect x="${OX-6}" y="0" width="${3419+12}" height="700" fill="#1a1d20"/>
   ${[[68,52],[68,648],[3732,52],[3732,648]].map(([x,y])=>`<rect x="${x-42}" y="${y-20}" width="84" height="40" rx="20" fill="var(--bg)"/>`).join('')}
   ${ART.png? `<image href="${ASSET}xtm4-front-green.png" x="${OX}" y="${OY}" width="3419" height="679"/>
   <image href="${ASSET}xtm4-front-white.png" x="${OX}" y="${OY}" width="3419" height="679"/>` : `<image href="${ASSET}xtm4-front.svg" x="${OX}" y="${OY}" width="3419" height="679" preserveAspectRatio="none"/>`}`;
  MX.forEach((x,k)=>{ const ch=k<2?0:1, kind=k%2?'ppm':'vu'; s += meterSVG('m'+k, x+OX, MYc+OY, kind, kind==='vu'? N.vu[ch] : N.ppm[ch], on); });
  // display window
  const p = 7.6, w8 = (8*6.2-1.2)*p, dx = DISP.x+OX+(DISP.w-w8)/2, dy = DISP.y+OY+(DISP.h-6*p)/2;
  s += `<rect x="${DISP.x+OX}" y="${DISP.y+OY}" width="${DISP.w}" height="${DISP.h}" fill="#050604"/><g ${on?'filter="url(#xglow)"':''}>${SIM.dotMatrix(txt, dx, dy, p, '#c8f53c', 'rgba(150,200,60,.07)')}</g>`;
  // phase LEDs
  for (let i=0;i<8;i++){ const cx=1603+i*32.14+OX, cy=36+OY, lit = on && i===led;
    s += `<circle cx="${cx.toFixed(1)}" cy="${cy}" r="12" fill="#0b0d0b"/><circle cx="${cx.toFixed(1)}" cy="${cy}" r="9" fill="${lit?'#d9ff5a':'#1f4a24'}" ${lit?'filter="url(#xglow)"':''}/>`; }
  // buttons
  Object.keys(BX).forEach(b=>{ const x=BX[b]+OX-47.5, y=BYc+OY-71, d=down(b);
    s += `<g class="xbtn" data-b="${b}" style="cursor:pointer"><rect x="${x}" y="${y}" width="95" height="142" fill="#050505"/>
      <rect x="${x+5}" y="${y+5+(d?6:0)}" width="85" height="${130-(d?6:0)}" rx="4" fill="${d?'#2c3033':'#202326'}" stroke="#3b3f42" stroke-width="2"/>
      <line x1="${x+8}" y1="${y+52+(d?6:0)}" x2="${x+87}" y2="${y+52+(d?6:0)}" stroke="#3d4144" stroke-width="2"/><title>${b} — ${btnHelp(b)}</title></g>`; });
  // jacks
  const jk = [['a0','CHA'],['a0','CHB'],['d0','AES'],['hdst','HDST']];
  JX.forEach((x,i)=>{ const [key,lbl]=jk[i], pl=D.plug[key];
    s += `<g class="xjack" data-j="${key}" style="cursor:pointer"><circle cx="${x+OX}" cy="${JYc+OY}" r="46" fill="#c9c6bd" stroke="#77736a" stroke-width="5"/><circle cx="${x+OX}" cy="${JYc+OY}" r="30" fill="#0a0a0a"/>
      ${pl?`<circle cx="${x+OX}" cy="${JYc+OY}" r="40" fill="#2c4f86" stroke="#17305a" stroke-width="5"/><circle cx="${x+OX}" cy="${JYc+OY}" r="15" fill="#9fb8de"/>`:''}
      <title>${lbl} jack — click to ${pl?'remove':'insert'} a patch cord</title></g>`; });
  if (!on) s += `<rect x="${OX}" y="${OY}" width="3419" height="679" fill="#000" opacity=".35"/>`;
  s += (opts.hot||'') + `</svg>`;
  return s;
}
function btnHelp(b){
  return {MODE:'step ANALOG → AES → SDI; hold ≈4 s for SETUP; in SETUP: leave', SOURCE:'A0⇄A1, D0⇄D1, SD1…SD8; in SETUP: HP ⇄ TERM', DOWN:'reference level −1 dB; in SETUP: HP out / LZ', UP:'reference level +1 dB; in SETUP: HP in / HZ'}[b];
}
/* Rear: XTM4M2-REAR-SILK (CURVE).pdf WHITE separation (3419 × 679 px). The silk crosshairs mark the 110 Ω
   XLR, MONITOR OUTPUT A and ANALOG INPUT B holes; the BNC, IEC, the other XLRs, the option knockouts and the
   DEMUX-4 adaptor plate are placed from Pics/XTM4M2 (Rear).jpg and (Rear with Demux 4).jpg. */
function rearSVG(){
  const xlr = (x,y,female,key,lbl)=>{ const pl = key? D.plug[key] : false;
    return `<g ${key?`class="xrj" data-j="${key}" style="cursor:pointer"`:''}><circle cx="${x}" cy="${y}" r="92" fill="#cfcdc6" stroke="#77746c" stroke-width="5"/><circle cx="${x}" cy="${y}" r="70" fill="${female?'#111':'#2a2a2a'}"/>
      ${[[0,-30],[-27,18],[27,18]].map(([a,b])=>`<circle cx="${x+a}" cy="${y+b}" r="${female?10:12}" fill="${female?'#000':'#d6c27a'}" stroke="#555"/>`).join('')}
      <circle cx="${x-66}" cy="${y-66}" r="13" fill="#9b9a95"/><circle cx="${x+66}" cy="${y+66}" r="13" fill="#9b9a95"/>
      ${pl?`<circle cx="${x}" cy="${y}" r="80" fill="#26292c" stroke="#111" stroke-width="5"/><rect x="${x-26}" y="${y+60}" width="52" height="${679-y-60}" fill="#1d2023"/><circle cx="${x+50}" cy="${y-60}" r="12" fill="var(--accent)"/>`:''}
      ${key?`<title>${lbl}: click to ${pl?'unplug':'connect a signal'}</title>`:''}</g>`; };
  const bnc = (x,y,key,lbl,gold)=>{ const pl=key? D.plug[key] : false;
    return `<g ${key?`class="xrj" data-j="${key}" style="cursor:pointer"`:''}><circle cx="${x}" cy="${y}" r="44" fill="${gold?'#b8953a':'#c9c7c0'}" stroke="#6e6a60" stroke-width="4"/><circle cx="${x}" cy="${y}" r="26" fill="${gold?'#e6cf86':'#e3e1da'}"/><circle cx="${x}" cy="${y}" r="9" fill="#55500f"/>
      ${pl?`<rect x="${x-18}" y="${y+30}" width="36" height="${Math.max(0,679-y-30)}" fill="#2b5f9e"/><rect x="${x-32}" y="${y-30}" width="64" height="64" rx="10" fill="#3a74b8"/><circle cx="${x+40}" cy="${y-44}" r="11" fill="var(--accent)"/>`:''}
      ${key?`<title>${lbl}: click to ${pl?'unplug':'connect'}</title>`:''}</g>`; };
  let s = `<svg viewBox="0 0 3419 679" role="img" aria-label="XTM4 rear panel (real silkscreen)" style="width:100%;display:block;border-radius:6px">
    <rect width="3419" height="679" fill="#1b1c1e"/>
    <g class="xpwr" style="cursor:pointer"><rect x="88" y="82" width="214" height="252" rx="10" fill="#0d0d0e" stroke="#3a3a3a" stroke-width="4"/><rect x="118" y="108" width="154" height="110" rx="8" fill="#050505"/>
      ${[[155,150],[195,150],[235,150]].map(([x,y])=>`<rect x="${x-6}" y="${y-14}" width="12" height="30" fill="#777"/>`).join('')}<rect x="118" y="236" width="154" height="74" rx="4" fill="#161617"/><title>IEC inlet — click to switch mains ${D.power?'off':'on'} (power cycle)</title></g>
    <circle cx="390" cy="200" r="18" fill="#0b0b0b"/>`;
  if (D.demuxFitted){
    s += `<rect x="1148" y="150" width="842" height="168" rx="6" fill="#0d0e0f" stroke="#2c2d2f" stroke-width="3"/><circle cx="1190" cy="232" r="13" fill="#9b9a95"/><circle cx="1948" cy="232" r="13" fill="#9b9a95"/>`;
    [[1270,'sdiA','SDI 1 (A)'],[1411,'sdiB','SDI 2 (B)'],[1563,null,'SDI OUT'],[1709,null,'AES 1'],[1861,null,'AES 2']].forEach(([x,k,l])=>{ s += bnc(x,226,k,l,true) + `<text x="${x}" y="300" font-size="26" fill="#eee" text-anchor="middle">${l}</text>`; });
  } else {
    [[989,'OUTPUT 1'],[1135,'OUTPUT 2'],[1287,'SDI OUTPUT'],[1436,'SDI INPUT']].forEach(([x,l])=>{ s += `<rect x="${x-48}" y="200" width="96" height="100" rx="34" fill="#050505"/><text x="${x}" y="${l.startsWith('SDI')?150:178}" font-size="27" font-weight="700" fill="#eee" text-anchor="middle">${l.startsWith('SDI')?'SDI':l}</text>${l.startsWith('SDI')?`<text x="${x}" y="182" font-size="27" font-weight="700" fill="#eee" text-anchor="middle">${l.split(' ')[1]}</text>`:''}`; });
  }
  s += bnc(806,542,'bnc','AES INPUT 75 Ω BNC') + xlr(1055,536,true,'xlr','AES INPUT 110 Ω XLR')
     + xlr(2110,536,false,null) + xlr(2388,536,false,null)
     + xlr(2686,536,true,'a1','ANALOG INPUT A (both channels toggle together)') + xlr(3089,536,true,'a1','ANALOG INPUT B (both channels toggle together)');
  s += `<image href="${ASSET}${ART.png?'xtm4-rear-white.png':'xtm4-rear.svg'}" width="3419" height="679" preserveAspectRatio="none" style="pointer-events:none"/>`;
  if (!D.power) s += `<text x="1700" y="90" font-size="40" fill="#f88" text-anchor="middle">MAINS OFF</text>`;
  return s + `</svg>`;
}
let UIH = null;   // a front-panel button held with the mouse
function bindFront(root){
  root.querySelectorAll('.xbtn').forEach(g=>{
    const b = g.dataset.b;
    g.addEventListener('pointerdown', e=>{ e.preventDefault(); try{ g.setPointerCapture(e.pointerId);}catch(_){}
      UIH = { btn:b, t0: performance.now(), rep:null, setup:null };
      if (b==='MODE' && D.mode!=='SET'){ A.press('MODE'); UIH.setup = setTimeout(()=>{ if (UIH && UIH.btn==='MODE'){ UIH.setup=null; if (D.ev && D.ev.before){ restoreFrom(D.ev.before); D.log.shift(); } A.holdMode(); } }, C.SETUP_HOLD*L42*1000); }
      else { A.press(b); if (b==='UP'||b==='DOWN') UIH.rep = setTimeout(function rp(){ if (!UIH) return; A.press(b,{auto:true}); UIH.rep = setTimeout(rp, C.AUTO_REP*L42*1000); }, C.AUTO_ENTER*L42*1000); }
    });
  });
  root.querySelectorAll('.xjack').forEach(g=> g.addEventListener('click', ()=>{ const k=g.dataset.j; A.plug(k, !D.plug[k]); }));
}
function releaseUIH(){ if (!UIH) return; clearTimeout(UIH.rep); clearTimeout(UIH.setup); UIH=null; SIM.refresh(); }
['pointerup','pointercancel','blur'].forEach(ev=> (ev==='blur'?window:document).addEventListener(ev, releaseUIH));
function restoreFrom(st){ ['mode','a','d','s','hp','term','applied','set','plvl','ghost'].forEach(k=>{ D[k] = JSON.parse(JSON.stringify(st[k])); }); }
function bindRear(root){
  root.querySelectorAll('.xrj').forEach(g=> g.addEventListener('click', ()=>{ const k=g.dataset.j; A.plug(k, !D.plug[k]); }));
  const p = root.querySelector('.xpwr'); if (p) p.addEventListener('click', ()=>A.power());
}
function controlsHTML(compact){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
    <button data-x="MODE">MODE</button><button data-x="SOURCE">SOURCE</button><button data-x="DOWN">DOWN</button><button data-x="UP">UP</button>
    <button data-x="hold">hold MODE → SETUP</button><button data-x="pwr">${D.power?'Power off':'Power on'}</button>
    <span class="small muted">Keys: M S D U · H = hold MODE · P = power</span></div>
    ${compact?'':`<div class="small muted" style="margin-top:4px">Hold a button with the mouse to get the firmware's own behaviour: UP/DOWN auto-repeat after ≈${(C.AUTO_ENTER*L42).toFixed(2)} s, MODE enters SETUP after ≈${(C.SETUP_HOLD*L42).toFixed(1)} s. Click the front jacks or the rear connectors to patch signals in and out.</div>`}`;
}
function bindControls(root){
  const map = {MODE:()=>A.press('MODE'), SOURCE:()=>A.press('SOURCE'), DOWN:()=>A.press('DOWN'), UP:()=>A.press('UP'), hold:()=>A.holdMode(), pwr:()=>A.power()};
  root.querySelectorAll('[data-x]').forEach(b=> b.onclick = ()=>map[b.dataset.x]());
}
function genHTML(){
  const s=D.sig, opt=(v,l,cur)=>`<option value="${v}" ${String(v)===String(cur)?'selected':''}>${l}</option>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center" class="small">
    <label>Test signal <select id="xg_w">${opt('burst','tone burst 0.1–0.6 s',s.wave)}${opt('tone','steady tone',s.wave)}${opt('short','10 ms 5 kHz bursts',s.wave)}${opt('program','speech-like programme',s.wave)}${opt('off','silence',s.wave)}</select></label>
    <label>f <select id="xg_f">${[40,100,400,1000,5000].map(f=>opt(f,f>=1000?f/1000+' kHz':f+' Hz',s.f)).join('')}</select></label>
    <label>Analog <input id="xg_a" type="number" min="-70" max="30" step="1" value="${s.dbu}" style="width:64px"> dBu</label>
    <label>Digital <input id="xg_d" type="number" min="-70" max="0" step="1" value="${s.dbfs}" style="width:64px"> dBFS</label>
    <label>B vs A <input id="xg_b" type="number" min="-20" max="10" step="1" value="${s.bOff}" style="width:56px"> dB</label>
    <label>L/R phase <select id="xg_p">${[0,45,90,135,180].map(p=>opt(p,p+'°',s.phase)).join('')}</select></label>
    <label>Source Z <select id="xg_z">${opt(50,'50 Ω',s.rs)}${opt(600,'600 Ω',s.rs)}</select></label>
    <label>AES fs <select id="xg_fs">${[32000,44100,48000,96000].map(f=>opt(f,(f/1000)+' kHz',s.fs)).join('')}</select></label>
    <label><input type="checkbox" id="xg_dmx" ${D.demuxFitted?'checked':''}> DEMUX-4 fitted</label>
    <label><input type="checkbox" id="xg_emb" ${D.plug.emb?'checked':''}> embedded audio</label>
    <label><input type="checkbox" id="xg_j" ${D.lastJump?'checked':''}> jump to the firmware's response</label></div>`;
}
function bindGen(root){
  const q = id=>root.querySelector('#'+id); if (!q('xg_w')) return;
  const upd = ()=>{ Object.assign(D.sig, { wave:q('xg_w').value, f:+q('xg_f').value, dbu:+q('xg_a').value, dbfs:Math.min(0,+q('xg_d').value), bOff:+q('xg_b').value, phase:+q('xg_p').value, rs:+q('xg_z').value, fs:+q('xg_fs').value }); MS_KEY=''; SCH_KEY=''; SIM.refresh(); };
  ['xg_w','xg_f','xg_a','xg_d','xg_b','xg_p','xg_z','xg_fs'].forEach(id=> q(id).onchange = upd);
  q('xg_dmx').onchange = e=> A.setDemux(e.target.checked);
  q('xg_emb').onchange = e=> A.plug('emb', e.target.checked);
  q('xg_j').onchange = e=>{ D.lastJump = e.target.checked; };
}
document.addEventListener('keydown', e=>{
  if (!window.__xtm4Keys || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k = e.key.toLowerCase();
  const m = {m:()=>A.press('MODE'), s:()=>A.press('SOURCE'), d:()=>A.press('DOWN'), u:()=>A.press('UP'), h:()=>A.holdMode(), p:()=>A.power()};
  if (m[k] && !e.ctrlKey && !e.metaKey && !e.altKey){ m[k](); e.preventDefault(); }
});

/* ---------------- timeline lanes ---------------- */
function lanes(){
  const S = sched(), M = meterSim(), css = n=>SIM.css(n);
  const ls = [];
  const txtLane = (c,X,t0,y,h,msg)=>{ c.fillStyle=css('--ink2'); c.font='11px '+css('--sans'); c.fillText(msg, X(t0)+6, y+h/2+4); };
  ls.push({label:'Signal at the meter amps (A / B)', h:40, draw(c,X,t0,t1,y,h){
    const pw = X(t1)-X(t0), n = Math.min(1600, Math.max(200, pw*2)), span=t1-t0;
    [0,1].forEach(ch=>{ c.strokeStyle = ch? css('--bad') : css('--accent'); c.lineWidth=1; c.beginPath();
      for (let i=0;i<=n;i++){ const t=t0+span*i/n, cfg = (S.tSw!==null && t>=S.tSw)? M.ca : M.cb; const v = meterIn(cfg, t, ch)/2.8; const yy = y+h/2 - Math.max(-1,Math.min(1,v))*(h/2-3); i? c.lineTo(X(t),yy) : c.moveTo(X(t),yy); }
      c.globalAlpha = .8; c.stroke(); c.globalAlpha=1; });
    if (S.tSw!==null && S.tSw>=t0 && S.tSw<=t1){ c.fillStyle=css('--warn'); c.fillRect(X(S.tSw)-1,y,2,h); c.font='10px '+css('--sans'); c.fillText('CS3310 / relays / DAC mute change', X(S.tSw)+4, y+10); }
  }});
  ls.push({label:'Button contacts (RB0 RB1 RB6 RB7)', h:24, draw(c,X,t0,t1,y,h){
    const P = S.press; if (!P){ txtLane(c,X,t0,y,h,'no button pressed in this second — press one on the panel'); return; }
    c.strokeStyle=css('--ink'); c.lineWidth=1.5; c.beginPath(); const hi=y+5, lo=y+h-5;
    c.moveTo(X(t0),hi); c.lineTo(X(P.t),hi);
    for (let k=0;k<6;k++){ const tb=P.t+k*C.BOUNCE_T/6; c.lineTo(X(tb), k%2?hi:lo); c.lineTo(X(tb+C.BOUNCE_T/12), k%2?hi:lo); }
    c.lineTo(X(P.tStable),lo); c.lineTo(X(P.tUp),lo); c.lineTo(X(P.tUp),hi); c.lineTo(X(t1),hi); c.stroke();
    c.fillStyle=css('--ink'); c.font='10px '+css('--sans'); c.fillText(`${P.btn} (${BTN[P.btn].pin}) low`, Math.max(X(t0),X(P.t))+4, lo-2);
  }});
  ls.push({label:'XTM42 main loop (PIC16F874)', h:34, draw(c,X,t0,t1,y,h){
    const n0=Math.max(0,Math.floor(t0/L42)), n1=Math.ceil(t1/L42), px=X(t0+L42)-X(t0);
    const cols=[css('--accent'), css('--accent2')];
    if (px < 1.2){ c.fillStyle=css('--accent'); c.globalAlpha=.35; c.fillRect(X(t0),y+6,X(t1)-X(t0),h-12); c.globalAlpha=1;
      c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${(n1-n0).toLocaleString()} passes of ≈${(L42*1e6).toFixed(0)} µs (${CYC42} cycles @ 4.9152 MHz, inferred)`, X(t0)+6, y+h/2+4); }
    else for (let n=n0;n<n1;n++){
      if (px > 90){ ST42.forEach((st,k)=>{ const a=stepT42(n,k), b=(n+(k+1<ST42.length?FR42[k+1]:1))*L42; c.fillStyle = k===IX('refresh')? css('--accent2') : k===IX('settxdata')||k===IX('pole')? css('--warn') : css('--accent'); c.globalAlpha = k%2? .55:.8; c.fillRect(X(a),y+3,Math.max(1,X(b)-X(a)-.5),h-6); c.globalAlpha=1; if (X(b)-X(a)>58){ c.fillStyle='#fff'; c.font='10px '+css('--sans'); c.fillText(st[0].split(' ')[0].slice(0,20), X(a)+2, y+h/2+3); } }); }
      else { c.fillStyle = cols[n%2]; c.globalAlpha=.7; c.fillRect(X(n*L42),y+3,Math.max(1,px-.5),h-6); c.globalAlpha=1; }
    }
    if (S.press){ const xc=X(stepT42(S.press.pc,0)); c.fillStyle=css('--play'); c.fillRect(xc-1,y,3,h); c.font='10px '+css('--sans'); c.fillText('closure: pass '+S.press.pc, xc+4, y+10); }
  }});
  ls.push({label:'Debounce counter bounce', h:26, draw(c,X,t0,t1,y,h){
    const P=S.press; if (!P){ txtLane(c,X,t0,y,h,'bounce stays 0; 64 equal scans make a closure, 128 a release'); return; }
    const a=stepT42(P.n0,1), b=stepT42(P.pc,1); c.strokeStyle=css('--accent2'); c.lineWidth=1.5; c.beginPath(); c.moveTo(X(a),y+h-3); c.lineTo(X(b),y+3); c.lineTo(X(b),y+h-3); c.stroke();
    const r0=stepT42(P.nFree-C.RELEASE,1), r1=P.tFree; c.strokeStyle=css('--warn'); c.beginPath(); c.moveTo(X(r0),y+h-3); c.lineTo(X(r1),y+3); c.lineTo(X(r1),y+h-3); c.stroke();
    c.fillStyle=css('--ink'); c.font='10px '+css('--sans'); c.fillText('0→64 → flag0,0', X(a)+3, y+10); c.fillText('release 0→128 → press_flag,2 (EEPROM timer starts)', X(r0)+3, y+10);
  }});
  ls.push({label:'HDSP-2533 display text', h:24, draw(c,X,t0,t1,y,h){
    const pts=[t0]; if (S.press){ pts.push(S.press.tDisp); if (S.press.tSetupShown) pts.push(S.press.tSetupShown, S.press.tUp); }
    const st=stAt(t1); if ((st.mode==='D'&&!lockD(st))||st.mode==='S'){ const per=C.FLASH*L42; for (let k=Math.ceil((t0-S.tRef)/per); S.tRef+k*per<t1; k++) pts.push(S.tRef+k*per); }
    pts.push(t1); pts.sort((a,b)=>a-b);
    for (let i=0;i<pts.length-1;i++){ const a=Math.max(t0,pts[i]), b=pts[i+1]; if (b<=a) continue; const tx=dispAt((a+b)/2);
      c.fillStyle = i%2? css('--chip') : css('--lane'); c.fillRect(X(a),y+3,X(b)-X(a),h-6); c.strokeStyle=css('--line'); c.strokeRect(X(a),y+3,X(b)-X(a),h-6);
      c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); if (X(b)-X(a)>70) c.fillText('"'+tx.replace(/ /g,'·')+'"', X(a)+4, y+h/2+4); }
  }});
  ls.push({label:'RS-485 bus, 9600 Bd', h:34, draw(c,X,t0,t1,y,h){
    const bitT = 1/9600, zoomBits = (X(t0+bitT)-X(t0)) > 9;
    const box = (ta, val, col, lab)=>{ const tb=ta+C.BYTE; if (tb<t0||ta>t1) return;
      if (zoomBits){ c.strokeStyle=col; c.lineWidth=1.5; c.beginPath(); let lv=1; c.moveTo(X(ta)-4,y+6);
        const bits=[0]; for (let i=0;i<8;i++) bits.push((val>>i)&1); bits.push(1);
        bits.forEach((bt,i)=>{ const xa=X(ta+i*bitT), xb=X(ta+(i+1)*bitT), yy=bt? y+6 : y+h-6; c.lineTo(xa,yy); c.lineTo(xb,yy); c.fillStyle=css('--ink2'); c.font='9px '+css('--mono'); if (xb-xa>16) c.fillText(i===0?'st':i===9?'sp':String(bt), xa+3, y+h/2+3); }); c.stroke(); }
      else { c.fillStyle=col; c.globalAlpha=.85; c.fillRect(X(ta), y+5, Math.max(2,X(tb)-X(ta)), h-10); c.globalAlpha=1;
        if (X(tb)-X(ta)>34){ c.fillStyle='#fff'; c.font='10px '+css('--mono'); c.fillText(lab+' '+val.toString(16).toUpperCase().padStart(2,'0'), X(ta)+3, y+h/2+4); } } };
    let shown=0;
    S.ex.forEach(e=>{ if (e.tTx0>t1 || (e.tRead||e.tRel)<t0) return; shown++;
      box(e.tTx0, e.tx0, css('--accent2'), 'tx0'); box(e.tTx1, e.tx1, css('--accent2'), 'tx1');
      if (e.tResp!==undefined) box(e.tResp, e.resp, e.who==='DEMUX'? css('--warn') : css('--accent'), e.who==='DEMUX'?'dmx':'rx'); });
    if (!shown){ txtLane(c,X,t0,y,h,'bus idle in this window'); }
    else if ((t1-t0) > 0.2){ c.fillStyle=css('--ink2'); c.font='10px '+css('--sans'); c.fillText(`${S.ex.filter(e=>e.tTx0<t1&&e.tTx0>=t0).length} exchanges · blue = XTM42 · green = XTM41 · orange = DEMUX`, X(t0)+6, y+h-2); }
  }});
  ls.push({label:'XTM41 main loop (PIC16F74)', h:30, draw(c,X,t0,t1,y,h){
    const m0=Math.floor((t0-PH41)/L41), m1=Math.ceil((t1-PH41)/L41), px=X(t0+L41)-X(t0);
    if (px < 1.5){ c.fillStyle=css('--accent'); c.globalAlpha=.35; c.fillRect(X(t0),y+6,X(t1)-X(t0),h-12); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${m1-m0} passes of ≈${(L41*1e3).toFixed(2)} ms — CS8420 rewritten every pass (inferred timing)`, X(t0)+6, y+h/2+4); return; }
    for (let m=m0;m<m1;m++){ const base=PH41+m*L41;
      if (px > 80) ST41.forEach((st,k)=>{ const a=base+FR41[k]*L41, b=base+(k+1<ST41.length?FR41[k+1]:1)*L41; c.fillStyle = k===3? css('--accent2') : k===2||k===6? css('--warn') : css('--accent'); c.globalAlpha=k%2?.55:.8; c.fillRect(X(a),y+3,Math.max(1,X(b)-X(a)-.5),h-6); c.globalAlpha=1; if (X(b)-X(a)>56){ c.fillStyle='#fff'; c.font='10px '+css('--sans'); c.fillText(st[0].replace('clrwdt · ',''), X(a)+2, y+h/2+3); } });
      else { c.fillStyle = m%2? css('--accent2') : css('--accent'); c.globalAlpha=.7; c.fillRect(X(base),y+3,Math.max(1,px-.5),h-6); c.globalAlpha=1; } }
  }});
  ls.push({label:'CS3310 gain write', h:22, draw(c,X,t0,t1,y,h){
    let any=0; S.ex.forEach(e=>{ if (e.t3310===undefined || e.t3310<t0 || e.t3310>t1) return; any++;
      const st=e.st, m=effMode(st), code = m==='A'? cs3310Analog(st.a.lvl) : cs3310Digital(m==='D'? st.d.lvl : st.s.lvl);
      c.fillStyle=css('--accent2'); c.fillRect(X(e.t3310-16*9*TCY), y+4, Math.max(2, X(e.t3310)-X(e.t3310-16*9*TCY)), h-8);
      c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText(`${code} = ${fmtDb(cs3310dB(code))} dB`, X(e.t3310)+3, y+h/2+3); });
    if (!any) txtLane(c,X,t0,y,h,'refresh3310 runs only after a received command');
  }});
  const L = lockState();
  ls.push({label: L.aes? `AES3 input, ${D.sig.fs/1000} kHz frames` : 'AES3 input', h:22, draw(c,X,t0,t1,y,h){
    if (!L.aes){ txtLane(c,X,t0,y,h, L.why); return; }
    SIM.pulses(c,X,t0,t1,y,h,1/D.sig.fs,0,0.2/D.sig.fs,css('--warn'),'frames → CS8420 → SRC → CS4390'); }});
  ls.push({label:'Phase LED (RA0 → ADRESH>>5)', h:22, draw(c,X,t0,t1,y,h){
    const n=Math.min(400, Math.max(40,(X(t1)-X(t0))/3)); for (let i=0;i<n;i++){ const t=t0+(t1-t0)*(i+.5)/n, k=phaseLed(t); if (k<0) continue; c.fillStyle = css('--accent'); c.fillRect(X(t0+(t1-t0)*i/n), y+h-4-k*2.2, (X(t1)-X(t0))/n+.5, 2.2); }
    c.fillStyle=css('--ink2'); c.font='10px '+css('--sans'); c.fillText(`LED ${phaseLed((t0+t1)/2)+1} of 8 · one A/D conversion per XTM42 pass`, X(t0)+6, y+10); }});
  const trace = (arr, conv, label, col2)=>({label, h:46, draw(c,X,t0,t1,y,h){
    const M=meterSim(), n = Math.min(1500, Math.max(100, X(t1)-X(t0)));
    [0,1].forEach(ch=>{ c.strokeStyle = ch? css('--bad') : css('--accent'); c.lineWidth=1.4; c.beginPath();
      for (let i=0;i<=n;i++){ const t=t0+(t1-t0)*i/n, j=Math.max(0,Math.min(M.vu[0].length-1,Math.round(t*M.fs/M.DEC))); const v=conv(M[arr][ch][j]); const yy=y+h-3-v*(h-6); i? c.lineTo(X(t),yy) : c.moveTo(X(t),yy); } c.stroke(); });
    c.strokeStyle=css('--grid'); c.setLineDash([3,3]); const yz = y+h-3-conv(arr==='vu'? vuFrac(0) : 0.5)*(h-6); c.beginPath(); c.moveTo(X(t0),yz); c.lineTo(X(t1),yz); c.stroke(); c.setLineDash([]);
  }});
  ls.push(trace('vu', p=>Math.max(0,Math.min(1,(p+0.03)/1.11)), 'VU needles A / B (0 VU dashed)'));
  ls.push(trace('ppm', q=>Math.max(0,Math.min(1,(q+0.13)/1.21)), 'PPM needles A / B (0 dB dashed)'));
  return ls;
}
function lockState(){
  const st = stAt(SIM.t), m = effMode(st);
  if (m==='D'){ const l = lockD(st); return {aes:l, why: l? '' : `selected input (${st.d.src? (st.d.bnc?'D1 BNC':'D1 XLR') : 'D0 front jack'}) has no signal — CS8420 unlocked`}; }
  if (m==='S'){ const l = sdiAudio(st); return {aes:l, why: l? '' : 'no SDI audio from the DEMUX'}; }
  return {aes:false, why:'analog source selected — AES receivers disabled (RE0/RE1/RA2 high)'};
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ const e=D.log[0]; return e? `<div><b>${e.name}</b> <span class="muted">at ${SIM.fmtT(e.t)}</span></div>`+e.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Press a button on the panel. Every step the firmware takes is listed here, with the real routine and register names.</div>'; }
function frameRedraw(m, fn){ let last=0; SIM.on('frame', ts=>{ if ((bootPhase() || UIH) && ts-last>120){ last=ts; fn(); } }); }

function viewSim(m){
  window.__xtm4Keys = true;
  m.innerHTML = `
  ${card('Front panel at the playhead — what the operator sees (real CorelDRAW artwork)', `<div id="fp"></div>${artNote('front')}${controlsHTML()}<div id="bootmsg" class="small" style="margin-top:4px"></div>`)}
  <div class="grid2">
    <div>${card('Rear panel — click a connector to patch it', `<div id="rp"></div>${artNote('rear')}<div style="margin-top:8px">${genHTML()}</div>
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button id="demo">Demo: press UP at 0.200 s</button><button id="clrev">Clear the event</button><button id="fac">Factory defaults (blank EEPROM)</button></div>`)}</div>
    <div>${card('What the software did (last action)', `<div id="trace" class="log"></div>`)}${card('State at the playhead', `<div id="insp"></div>`)}</div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek; transport above)', `<canvas id="tl"></canvas>
    <p class="small muted">XTM42 pass ≈ ${(L42*1e6).toFixed(0)} µs and XTM41 pass ≈ ${(L41*1e3).toFixed(2)} ms are ${inf}: counted from the instructions on each routine's usual path at 4.9152 MHz (0.814 µs per instruction). Every other number on this lane set comes from a constant in the source: 64 scans to debounce, 150 passes before a transmission, 5 × 256 passes between polls, 9600 Bd. Needle ballistics are analog and ${inf} from the meter standards (see the One second tab).</p>`)}
  ${card('Action log', `<div id="log" class="log"></div>`)}`;
  const draw = ()=>{
    const t=SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindFront(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(); bindRear(m.querySelector('#rp'));
    const b = bootPhase(); m.querySelector('#bootmsg').innerHTML = b? `<b>Booting:</b> ${b.stage==='handshake'? (D.demuxFitted? 'DEMUX handshake…' : `program1 is asking for a DEMUX board (try ${Math.min(10,1+Math.floor(b.e/(b.hs/10)))} of 10, each ≈0.9 s) — display blank`) : 'opening_window shows the software ID'}` : (D.eeDue? `<span class="muted">eewrite will save the settings in ${((D.eeDue-performance.now())/1000).toFixed(1)} s (power-cycle before then and the change is lost).</span>` : '');
    const st = stAt(t), cfg = meterCfg(st), S = sched(), N = needlesAt(t), tx = txOf(st);
    const p42 = pass42(t), k42 = stepIdx42(t), m41 = Math.max(0,Math.floor((t-PH41)/L41)), k41 = stepIdx41(t);
    m.querySelector('#insp').innerHTML = `<table class="kv">
      <tr><th>XTM42 pass / step</th><td class="mono">#${p42} · ${ST42[k42][0]}</td></tr>
      <tr><th>XTM41 pass / step</th><td class="mono">#${m41} · ${ST41[k41][0]}</td></tr>
      <tr><th>Mode</th><td class="mono">${st.mode==='SET'?'SETUP (sourceset1,7) · screen '+st.set.scr+' · meters on '+st.set.prev : {A:'ANALOG (sourcea,7)',D:'AES (sourced,7)',S:'SDI (sources1,7)'}[st.mode]}${st.ghost?' + <b style="color:var(--bad)">sourceset1,7 ghost</b>':''}</td></tr>
      <tr><th>Display</th><td class="mono">"${dispAt(t)}"</td></tr>
      <tr><th>Bytes on the bus</th><td class="mono">tx0 ${hex(tx.tx0)} (${bin(tx.tx0)}) · tx1 ${hex(tx.tx1)} = ${tx.tx1} · address ${tx.addr}</td></tr>
      <tr><th>Reference</th><td class="mono">${refText(st)}</td></tr>
      <tr><th>Metered signal</th><td class="mono">${cfg.on? `A ${cfg.A.toFixed(1)} dB, B ${cfg.B.toFixed(1)} dB re 0 VU · monitor out ${(monitorDbu(cfg)).toFixed(1)} dBu` : 'none — '+cfg.why}</td></tr>
      <tr><th>Needles now</th><td class="mono">VU A ${fmtV(vuDbOf(N.vu[0]))} B ${fmtV(vuDbOf(N.vu[1]))} · PPM A ${fmtV(ppmDbOf(N.ppm[0]))} B ${fmtV(ppmDbOf(N.ppm[1]))}</td></tr>
      <tr><th>HP / TERM</th><td class="mono">${st.hp?'HP in':'HP out'} · ${st.term?'LZ 600 Ω':'HZ bridging'}${(st.applied.hp!==st.hp||st.applied.term!==st.term)?' <span style="color:var(--warn)">(not sent to XTM41 until SETUP is left)</span>':''}</td></tr>
      <tr><th>Phase LED</th><td class="mono">${phaseLed(t)+1} of 8 (L/R ${D.sig.phase}°)</td></tr>
      <tr><th>Last event</th><td class="mono small">${S.press? `${S.press.btn} at ${SIM.fmtT(S.press.t)} → closure ${SIM.fmtT(S.press.tClosure)} → display ${SIM.fmtT(S.press.tDisp)} → meters ${S.tSw!==null? SIM.fmtT(S.tSw) : '—'}` : D.ev? `${D.ev.kind} at ${SIM.fmtT(D.ev.t)} → meters ${S.tSw!==null && S.tSw<=1? SIM.fmtT(S.tSw):'after this second'}` : 'none'}</td></tr></table>`;
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span> → “${e.disp}”</div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200});
  };
  bindControls(m); bindGen(m); bindArt(m);
  m.querySelector('#demo').onclick = ()=>{ SIM.seek(0.2); const j=D.lastJump; D.lastJump=false; A.press('UP'); D.lastJump=j; SIM.seek(0.2); };
  m.querySelector('#clrev').onclick = ()=>{ D.ev=null; SCH_KEY=''; MS_KEY=''; SIM.refresh(); };
  m.querySelector('#fac').onclick = ()=>A.factory();
  SIM.on('time', draw); frameRedraw(m, draw);
}
const hex = v=>'0x'+v.toString(16).toUpperCase().padStart(2,'0');
const bin = v=>v.toString(2).padStart(8,'0');
const fmtV = v=> isFinite(v)? (v>=0?'+':'')+v.toFixed(1) : 'rest';
function refText(st){ const m=effMode(st); if (m==='A') return `0 VU = ${fmtDb(lvlDb(st.a.lvl))} dBu (alvl1 ${st.a.lvl})`; if (m==='D') return `0 VU = ${fmtDb(lvlDb(st.d.lvl))} dBFS (dlvl1 ${st.d.lvl})`; return `0 VU = ${fmtDb(lvlDb(st.s.lvl))} dBFS (slvl1 ${st.s.lvl})`; }
function stepIdx42(t){ const f=t/L42-Math.floor(t/L42); let k=0; for (let j=0;j<ST42.length;j++) if (f>=FR42[j]) k=j; return k; }
function stepIdx41(t){ const u=(t-PH41)/L41, f=u-Math.floor(u); let k=0; for (let j=0;j<ST41.length;j++) if (f>=FR41[j]) k=j; return k; }

/* ---------------- tutorial (from xtm4man.pdf / xtm4peak.pdf / xtm4sdi.pdf) ---------------- */
const LESSONS = [
  { title:'Meet the XTM4', body:`<p>The XTM4 is a 2-rack-unit <b>test meter</b>. It meters analog audio, AES-3 digital audio and, with the DEMUX option, audio embedded in SDI video. Each channel (A and B) has a <b>VU meter</b> (left) and a <b>PPM</b> (right). Between them are an 8-LED <b>phase meter</b>, an 8-character display, four buttons (<b>MODE, SOURCE, DOWN, UP</b>) and four front jacks.</p>
     <p>The panel on the right is built on the real silkscreen. A test set is plugged into the rear <b>ANALOG INPUT</b> XLRs. It sends a 1 kHz tone at +4 dBu in bursts, so you can watch the needles move.</p><p class="muted">Click “Next”.</p>`, check:()=>true, auto:true },
  { title:'1 · Read the display', body:`<p>The display reads <span class="mono">A1&nbsp;&nbsp;+4</span> (or <span class="mono">A0</span> on a unit with a blank EEPROM). <b>A</b> means analog. <b>1</b> means the rear XLRs (0 means the front CHA/CHB jacks). <b>+4</b> is the reference: a +4 dBu signal reads 0 VU.</p><p>Press <b>SOURCE</b> to try <b>A0</b>. Nothing is plugged into the front jacks, so the needles fall back to rest. Press SOURCE again to return to <b>A1</b>, where the test set is connected.</p><p><b>Goal:</b> show A1.</p>`, check:()=>D.mode==='A'&&D.a.src===1, hint:'Press SOURCE (S key, or click the SOURCE button).' },
  { title:'2 · Change the sensitivity', body:`<p><b>UP</b> and <b>DOWN</b> move the reference 1 dB at a time, from −60 to +30 dBu. Hold a button and it repeats after about a second. Raising the reference makes the needles read lower: the main board turns the CS3310 attenuator down.</p><p><b>Goal:</b> set 0 VU = <b>+8 dBu</b>. The +4 dBu tone then reads −4 VU.</p>`, check:()=>D.mode==='A'&&D.a.lvl===68, hint:'Press UP four times (U key).' },
  { title:'3 · VU versus PPM', body:`<p>Choose <b>speech-like programme</b> under Test signal and press ▶ Play. The <b>VU</b> needle averages the signal over about 300 ms, so it reads low on short peaks. The <b>PPM</b> rises within a few milliseconds and falls back slowly (24 dB in 2.8 s), so it shows the peaks.</p><p>The <i>One second</i> tab draws both needles across the whole second.</p><p><b>Goal:</b> programme signal selected.</p>`, check:()=>D.sig.wave==='program', hint:'Use the “Test signal” menu under the rear panel.' },
  { title:'4 · The phase meter', body:`<p>The 8 LEDs above the display show the phase between A and B: <b>0°</b> at the left, <b>180°</b> (one channel wired backwards) at the right. The front-panel PIC reads it on RA0 and lights one LED per value: <span class="mono">ADRESH &gt;&gt; 5</span> drives a 74HC4052.</p><p><b>Goal:</b> set the test set's L/R phase to 180°.</p>`, check:()=>D.sig.phase===180, hint:'“L/R phase” menu → 180°.' },
  { title:'5 · Switch to digital', body:`<p><b>MODE</b> steps through the signal types: ANALOG → DIGITAL (AES) → SDI (if a DEMUX board was found at power-up) → ANALOG.</p><p>Press MODE. The display shows <span class="mono">D0&nbsp;&nbsp;-20</span>: the front AES jack, with 0 VU = −20 dBFS. Nothing is plugged into that jack, so it alternates with <b>NO LOCK</b> every 1.75 s. Right after a button press it shows the status first.</p><p><b>Goal:</b> AES mode.</p>`, check:()=>D.mode==='D', hint:'Press MODE once (M key).' },
  { title:'6 · Rear AES input and auto-detect', body:`<p>Press <b>SOURCE</b> for <b>D1</b>, the rear AES input. D1 has an <b>auto-detect</b> feature. If the selected connector (XLR or BNC) has no signal, the front-panel PIC switches to the other one after 5 unlocked replies.</p><p>Click the <b>75 Ω BNC</b> on the rear panel to connect a signal. Watch the RS-485 lane: the polls speed up to about every 68 ms while D1 searches.</p><p><b>Goal:</b> D1 locked.</p>`, check:()=>D.mode==='D'&&D.d.src===1&&lockD(), hint:'SOURCE once, then click the AES INPUT 75 Ω BNC on the rear panel.' },
  { title:'7 · Digital reference', body:`<p>UP/DOWN set the digital reference from −50 to 0 dBFS. Many plants align to −18 dBFS (EBU) or −20 dBFS (SMPTE).</p><p><b>Goal:</b> 0 VU = −18 dBFS.</p>`, check:()=>D.mode==='D'&&D.d.lvl===42, hint:'Press UP twice.' },
  { title:'8 · Enter SETUP', body:`<p>To enter <b>SETUP</b>, <b>press and hold MODE</b> until the display shows <span class="mono">SETUP</span> (about 4 s), then let go. You can also use the “hold MODE → SETUP” button or the H key.</p><p class="muted">The firmware sees the press 22 ms after you push MODE, so it steps the source <i>before</i> it notices you are holding. You leave SETUP on the next signal type. The manual does not mention this.</p><p><b>Goal:</b> SETUP mode.</p>`, check:()=>D.mode==='SET', hint:'Hold the MODE button for 4 s, or press H.' },
  { title:'9 · High-pass filter', body:`<p>SETUP has two screens in this firmware: <b>HP</b> and <b>TERM</b>. <b>SOURCE</b> switches between them. On HP, <b>UP</b> = filter in, <b>DOWN</b> = filter out. The manual also lists a PEAK screen, but the “B” builds (no peak option) cannot reach it.</p><p><b>Goal:</b> HP IN.</p>`, check:()=>D.hp===1, hint:'Screen " HP  OUT": press UP.' },
  { title:'10 · Termination', body:`<p>Press SOURCE for <b>TERM</b>. <b>UP</b> = HZ (bridging, &gt;20 kΩ), <b>DOWN</b> = LZ (600 Ω). With LZ, analog screens show a small <b>z</b> after the source number.</p><p><b>Goal:</b> TERM LZ.</p>`, check:()=>D.term===1, hint:'SOURCE, then DOWN.' },
  { title:'11 · Leave SETUP', body:`<p>Press <b>MODE</b> to leave. The changes reach the main board only now. While SETUP is open, the level byte carries the peak threshold, and the main board returns from that branch before it touches the relays or the filter.</p><p><b>Goal:</b> back to metering, with the filter applied.</p>`, check:()=>D.mode!=='SET'&&D.applied.hp===1, hint:'Press MODE.' },
  { title:'12 · SDI (DEMUX option)', body:`<p>Tick <b>DEMUX-4 fitted</b>, then <b>power-cycle</b> (click the IEC inlet or press P twice). At start-up the front panel sends <span class="mono">0xE8 0x55</span>. The DEMUX answers <span class="mono">0xE0</span> and SDI is enabled. Without the board the display stays blank for about 9 s while it retries ${inf}.</p><p>MODE then reaches <span class="mono">SA1</span> (SDI input A, pair 1). SOURCE steps through SD1…SD8. MODE again gives input B, then ANALOG.</p><p><b>Goal:</b> SDI input A, pair 3.</p>`, check:()=>D.mode==='S'&&D.s.sel===0&&D.s.pair[0]===3, hint:'DEMUX-4 fitted → power off/on → MODE until SA1 → SOURCE twice.' },
  { title:'13 · Saving', body:`<p>The XTM4 saves its settings by itself, but only <b>≈15.8 s after the last button is released</b> (eewrite: 46 336 main-loop passes). If you switch off sooner, the last change is lost. The status line under the panel counts down.</p><p><b>Goal:</b> wait until nothing is waiting to be saved.</p>`, check:()=>!D.eeDue && D.ee!==null, hint:'Wait about 16 s without pressing a button.' },
  { title:'Done', body:`<p>You've used every control on the XTM4. The <b>Software</b> tab shows the same steps inside both PICs, the <b>One second</b> tab slows the needles down, and <b>Findings</b> lists what the firmware does that the manual doesn't say.</p>`, check:()=>true, auto:true },
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__xtm4Keys = true;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — operating the XTM4 (from the manual)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>
      ${card('What the software did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The unit', `<div id="fp"></div>${controlsHTML(true)}<div id="bootmsg" class="small"></div><div id="rp" style="margin-top:8px"></div><div style="margin-top:8px">${genHTML()}</div>`)}</div></div>`;
  const hot = `<g><rect x="1680" y="10" width="420" height="60" fill="transparent"><title>Phase meter: 8 LEDs, 0° … 180°</title></rect>
    <rect x="${OX+MX[0]-290}" y="${OY+MYc-128}" width="580" height="256" fill="transparent" pointer-events="none"/></g>`;
  const draw = ()=>{
    m.querySelector('#fp').innerHTML = frontSVG(SIM.t, {hot}); bindFront(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(); bindRear(m.querySelector('#rp'));
    const b=bootPhase(); m.querySelector('#bootmsg').textContent = b? (b.stage==='handshake'? 'Booting: looking for a DEMUX board…' : 'Booting: software ID') : (D.eeDue? `eewrite saves in ${((D.eeDue-performance.now())/1000).toFixed(1)} s` : '');
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L = LESSONS[lessonIdx], ok = L.check();
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok? (L.auto?'Ready.':'✓ Goal reached.') : '◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over (factory defaults)</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.factory(); D.sig.wave='burst'; D.sig.phase=0; lessonIdx=0; draw(); };
  };
  bindControls(m); bindGen(m);
  SIM.on('time', draw);
  let last=0; SIM.on('frame', ts=>{ if (ts-last>400 && (bootPhase()||D.eeDue||UIH)){ last=ts; draw(); } });
}

/* ---------------- one second, frame by frame (as seen by the device and the displays) ---------------- */
function viewSecond(m){
  window.__xtm4Keys = true;
  m.innerHTML = `
  ${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">
    ${card('As seen by the device — at the playhead', `<div id="dev"></div>`)}
    ${card('As seen by the displays', `<div id="fp"></div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px" class="small">
       <span class="muted">Ballistics lab:</span><button data-w="burst">0.5 s tone burst</button><button data-w="short">10 ms bursts</button><button data-w="program">programme</button><button data-w="tone">steady tone</button><button data-w="off">silence</button></div>`)}
  </div>
  ${card('Needle ballistics across the second (channel A, read in dB on each scale)', `<canvas id="bal"></canvas>
     <p class="small muted">VU: 2nd-order movement, ζ = ${VUZ}, ωn = ${VUW.toFixed(2)} rad/s, tuned so a step reaches 99 % of 0 VU in 300 ms with ≈1.25 % overshoot (ANSI C16.5). PPM: attack τ = ${(PPM_TA*1000).toFixed(2)} ms (a 10 ms 5 kHz burst reads −2.5 dB), return 24 dB in 2.8 s (IEC 60268-10 type IIb, matching the −12…+12 scale in the product photo). These are ${inf}: the ballistics come from analog parts (OP275 meter drivers and the movements), and their values are not in the firmware.</p>`)}
  ${card('Power-up, 0 to 13 s (a separate time scale)', `<canvas id="boot"></canvas><p class="small muted">From INIT, program1/program3 and opening_window in 42V400C.asm. The try length (≈0.9 s) and the window (≈2.3 s) come from loop counts × an ${inf} cycle count per loop.</p>`)}`;
  const draw = ()=>{
    const t=SIM.t, S=sched(), st=stAt(t), m_=effMode(st);
    const ex = S.ex.filter(e=>e.tTx0<1);
    const rows = [
      ['XTM42 main-loop passes', Math.round(1/L42).toLocaleString(), SIM.fmtDur(L42), `${CYC42} cycles ${inf}; scans buttons, rewrites all 8 display characters, reads the phase A/D`],
      ['HDSP-2533 write pulses (RB5)', (8*Math.round(1/L42)).toLocaleString(), SIM.fmtDur(L42/8), 'refresh writes dis0…dis7 every pass, changed or not'],
      ['Phase A/D conversions', Math.round(1/L42).toLocaleString(), SIM.fmtDur(L42), `TAD = 32/Fosc = ${(32/FOSC*1e6).toFixed(2)} µs; one conversion ≈ ${(12*32/FOSC*1e6).toFixed(0)} µs`],
      ['XTM41 main-loop passes', Math.round(1/L41).toLocaleString(), SIM.fmtDur(L41), `${CYC41} cycles ${inf}`],
      ['CS8420 register writes', (8*Math.round(1/L41)).toLocaleString(), '', 'refresh8420: registers 1–6, 9, 17, 24 bits each, every pass'],
      ['RS-485 exchanges', String(ex.length), ex.length>1? SIM.fmtDur(ex[1].tTx0-ex[0].tTx0) : '—', m_==='S'? 'SDI: every 160 passes, alternating main board / DEMUX' : (m_==='D'&&st.d.src===1&&!lockD(st))? 'D1 hunting: every 200 passes' : 'idle polling: 5 × 256 + 150 passes'],
      ['UART bytes / bits', `${ex.length*3} / ${ex.length*30}`, SIM.fmtDur(C.BYTE)+' / '+SIM.fmtDur(1/9600), '2 bytes out (tx0 address, tx1 level), 1 byte back'],
      ['AES3 frames in', lockState().aes? D.sig.fs.toLocaleString() : '0', lockState().aes? SIM.fmtDur(1/D.sig.fs) : '', 'CS8420 receiver → SRC → CS4390 DAC (OMCK 24.576 MHz)'],
      ['AES3 blocks', lockState().aes? (D.sig.fs/192).toFixed(1) : '0', lockState().aes? SIM.fmtDur(192/D.sig.fs) : '', '192 frames, Z preamble'],
      ['Display flashes (NO LOCK…)', (1/(C.FLASH*L42)).toFixed(2), SIM.fmtDur(C.FLASH*L42), 'lockflash0 × lockflash1 = 5120 passes per half-cycle'],
      ['VU integration', '≈3', '300 ms', 'the needle itself is the integrator: no digital sampling at all'],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who / why</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Use <b>Step</b> on the transport to move one XTM42 pass, one XTM41 pass, one UART byte or bit, or one AES frame. The zoom menu has a 6 ms window that holds one complete exchange.</p>`;
    const k42=stepIdx42(t), k41=stepIdx41(t), cur = S.ex.find(e=>t>=e.tTx0 && t<=(e.tRead||e.tRel+C.BYTE));
    let bus = 'idle (both 75176 drivers in receive)';
    if (cur){ const inB = (ta,v,lab)=>{ if (t>=ta && t<ta+C.BYTE){ const bi=Math.floor((t-ta)*9600); return `${lab} ${hex(v)}: bit ${bi} = ${bi===0?'start (0)':bi===9?'stop (1)':((v>>(bi-1))&1)+' (d'+(bi-1)+')'}`; } return null; };
      bus = inB(cur.tTx0,cur.tx0,'XTM42 tx0') || inB(cur.tTx1,cur.tx1,'XTM42 tx1') || (cur.tResp!==undefined && inB(cur.tResp,cur.resp, cur.who+' reply')) || 'between bytes (TXREG waiting for TRMT, or turnaround)'; }
    const N = needlesAt(t);
    m.querySelector('#dev').innerHTML = `<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>XTM42</th><td class="mono">pass #${pass42(t)} → ${ST42[k42][0]}<br><span class="muted">${ST42[k42][2]}</span></td></tr>
      <tr><th>XTM41</th><td class="mono">pass #${Math.max(0,Math.floor((t-PH41)/L41))} → ${ST41[k41][0]}<br><span class="muted">${ST41[k41][2]}</span></td></tr>
      <tr><th>RS-485</th><td class="mono">${bus}</td></tr>
      <tr><th>Display RAM</th><td class="mono">dis0…dis7 = ${dispAt(t).split('').map(ch=>hex(ch.charCodeAt(0))).join(' ')}</td></tr>
      <tr><th>Meters</th><td class="mono">VU ${fmtV(vuDbOf(N.vu[0]))} / ${fmtV(vuDbOf(N.vu[1]))} VU · PPM ${fmtV(ppmDbOf(N.ppm[0]))} / ${fmtV(ppmDbOf(N.ppm[1]))} dB</td></tr>
      <tr><th>AES frame</th><td class="mono">${lockState().aes? `#${Math.floor(t*D.sig.fs).toLocaleString()} · ${Math.floor(t*D.sig.fs)%192}/191 of block` : lockState().why}</td></tr></table>`;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindFront(m.querySelector('#fp'));
    drawBallistics(m.querySelector('#bal'));
    drawBoot(m.querySelector('#boot'));
    m.querySelectorAll('[data-w]').forEach(b=> b.onclick=()=>{ D.sig.wave=b.dataset.w; MS_KEY=''; SIM.refresh(); });
  };
  SIM.on('time', draw); frameRedraw(m, draw);
}
function drawBallistics(cv){
  const M = meterSim(), H=230, {c,w} = SIM.canvas(cv, H);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), grid=SIM.css('--grid'), acc=SIM.css('--accent'), a2=SIM.css('--accent2'), play=SIM.css('--play'), warn=SIM.css('--warn');
  const x0=46, pw=w-x0-10, Yd = d=> 14 + (12-d)/34*(H-40);   // −22 … +12 dB
  c.font='11px '+SIM.css('--mono'); c.strokeStyle=grid; c.fillStyle=ink2;
  for (let d=-20; d<=12; d+=4){ const y=Yd(d); c.beginPath(); c.moveTo(x0,y); c.lineTo(x0+pw,y); c.stroke(); c.fillText((d>0?'+':'')+d, 6, y+4); }
  for (let t=0;t<=1.0001;t+=0.1){ const x=x0+t*pw; c.beginPath(); c.moveTo(x,10); c.lineTo(x,H-24); c.stroke(); c.fillText(t.toFixed(1)+'s', x-10, H-8); }
  // input level reference
  const n=Math.min(1200,pw);
  const plot = (arr, conv, col, dash)=>{ c.strokeStyle=col; c.lineWidth=2; c.setLineDash(dash||[]); c.beginPath();
    for (let i=0;i<=n;i++){ const t=i/n, j=Math.min(arr.length-1,Math.round(t*M.fs/M.DEC)); const d=Math.max(-22,Math.min(12,conv(arr[j]))); const y=Yd(d); i? c.lineTo(x0+t*pw,y) : c.moveTo(x0,y); } c.stroke(); c.setLineDash([]); };
  plot(M.vu[0], vuDbOf, acc); plot(M.ppm[0], ppmDbOf, a2);
  const cfg = M.ca; if (cfg.A!==null){ c.strokeStyle=warn; c.setLineDash([2,4]); c.beginPath(); c.moveTo(x0,Yd(cfg.A)); c.lineTo(x0+pw,Yd(cfg.A)); c.stroke(); c.setLineDash([]); }
  if (D.sig.wave==='burst'){ [0.1,0.4,0.6].forEach(t=>{ c.strokeStyle=warn; c.beginPath(); c.moveTo(x0+t*pw,10); c.lineTo(x0+t*pw,H-24); c.stroke(); }); c.fillStyle=warn; c.fillText('burst on', x0+0.1*pw+3, 22); c.fillText('+300 ms', x0+0.4*pw+3, 22); c.fillText('burst off', x0+0.6*pw+3, 22); }
  const px = x0 + SIM.t*pw; c.strokeStyle=play; c.lineWidth=2; c.beginPath(); c.moveTo(px,8); c.lineTo(px,H-22); c.stroke();
  c.fillStyle=acc; c.fillText('VU (dB re 0 VU)', x0+8, H-30); c.fillStyle=a2; c.fillText('PPM (dB)', x0+150, H-30); c.fillStyle=warn; c.fillText('steady-state level', x0+240, H-30);
  if (!cv._xs){ cv._xs=true; cv.addEventListener('click', e=>{ const r=cv.getBoundingClientRect(); const x=e.clientX-r.left; if (x>x0) SIM.seek((x-x0)/(r.width-x0-10)); }); }
}
function drawBoot(cv){
  const hs = (D.demuxFitted? 0.004 : 10*39936*28*TCY) + 0.012, win = bootWindowT(), T=13;
  SIM.drawLanes(cv, [
    {label:'INIT · display_set · EEPROM read', h:22, draw(c,X,t0,t1,y,h){ c.fillStyle=SIM.css('--accent2'); c.fillRect(X(0),y+4,Math.max(3,X(0.012)-X(0)),h-8); c.fillStyle=SIM.css('--ink'); c.font='10px sans-serif'; c.fillText('ports, UART, A/D, HDSP-2533 reset, restore 14 bytes', X(0.02)+3, y+h/2+3); }},
    {label:'program1: 0xE8 0x55 → DEMUX?', h:26, draw(c,X,t0,t1,y,h){ const tries = D.demuxFitted? 1 : 10, per = D.demuxFitted? 0.004 : (hs-0.012)/10;
      for (let k=0;k<tries;k++){ const a=0.012+k*per; c.fillStyle=SIM.css('--accent2'); c.fillRect(X(a),y+4,Math.max(2,X(a+0.0021)-X(a)),h-8); c.fillStyle=SIM.css(D.demuxFitted?'--accent':'--warn'); c.globalAlpha=.4; c.fillRect(X(a+0.0021),y+6,X(a+per)-X(a+0.0021)-1,h-12); c.globalAlpha=1; }
      c.fillStyle=SIM.css('--ink'); c.font='10px sans-serif'; c.fillText(D.demuxFitted? 'DEMUX-4 answers 0xE0 → comout,0 = 1' : '10 tries × (2 bytes + ≈0.9 s time-out) — display blank', X(0.05), y+h/2+3); }},
    {label:'program3: peak threshold → XTM41', h:22, draw(c,X,t0,t1,y,h){ c.fillStyle=SIM.css('--accent'); c.fillRect(X(hs-0.006),y+4,Math.max(3,X(hs)-X(hs-0.006)),h-8); }},
    {label:'Display', h:24, draw(c,X,t0,t1,y,h){ c.fillStyle=SIM.css('--chip'); c.fillRect(X(0),y+3,X(hs)-X(0),h-6); c.fillStyle=SIM.css('--accent'); c.globalAlpha=.4; c.fillRect(X(hs),y+3,X(hs+win)-X(hs),h-6); c.globalAlpha=1; c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText('(blank)', X(0)+4, y+h/2+4); c.fillText('"04VA0001"', X(hs)+4, y+h/2+4); c.fillText('"'+statusText(snap())+'"', X(hs+win)+4, y+h/2+4); }},
    {label:'main loop running', h:20, draw(c,X,t0,t1,y,h){ c.fillStyle=SIM.css('--accent'); c.globalAlpha=.5; c.fillRect(X(hs+win),y+4,X(T)-X(hs+win),h-8); c.globalAlpha=1; }},
  ], {range:[0,T], labelW:200});
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  fp:{x:20,y:20,w:220,h:150,t:'XTM4-2 front panel',s:['PIC16F874 @ 4.9152 MHz (XTM42)','HDSP-2533 8-char display','4 × Omron B3J buttons','8 phase LEDs via 74HC4052','DS75176 RS-485'],d:'XTM42 firmware (42V400C). TQFP-44 PIC16F874 (U4). Display data on RD0–7, A0–A4 on RC0–RC4, WR RB5, CE RB4, RD RB2, RST RA2. Buttons on RB0 (MODE), RB1 (SOURCE), RB6 (DOWN), RB7 (UP), with RB pull-ups. RE0–RE2 drive the 74HC4052 that lights one phase LED; RA0 reads the phase voltage. RC5 enables the RS-485 driver.'},
  bus:{x:290,y:60,w:150,h:70,t:'RS-485 bus',s:['9600 Bd 8N1, half duplex','XTM42 = master'],d:'Two-byte command (address 1a1a0 TH sss, level 0lllllll), one-byte reply. Ribbon H3↔H1 pins 1/2; also P10 to the DEMUX board. XTM4 PROTOCOL.wpd (2001|34) documents it.'},
  mb:{x:490,y:20,w:230,h:150,t:'XTM4-1 main board',s:['PIC16F74 (XTM41)','relays REL1–3 via ULN2803','CS8420 AES receiver + SRC','CS4390 DAC','CS3310 stereo attenuator'],d:'XTM41 firmware (41v202). DIP-40 PIC16F74 (U31). CS3310 bit-banged on RD1/RD2/RD4, CS8420 SPI on RC2/RC3/RC4/RC5 with reset on RD0, relays on RB4–RB7 through a ULN2803, analog/digital select RD6, high-pass RD7, gain select RD5, DAC mute RA5, receiver enables RE0/RE1/RA2, SDI pair select RB0/RB1 (74HC125).'},
  ain:{x:490,y:220,w:230,h:90,t:'Analog inputs',s:['front jacks (A0) / rear XLR (A1)','600 Ω term (REL3), SSM2143','ADG419 gain, 74HC4053 HP & A/D'],d:'REL1/REL2 select front jack or rear XLR (INSET/INRES). REL3 switches the 600 Ω termination (TERMSET/TERMRES). The SSM2143 differential receivers feed an ADG419 gain switch (GAINSEL: high gain below −20). 74HC4053s switch the high-pass filter (HIGH_PASS) and analog vs DAC (A\\D).'},
  aes:{x:780,y:220,w:200,h:90,t:'AES inputs',s:['XLR 110 Ω (aes1, RE0)','front jack (aes2, RE1)','BNC 75 Ω (aes3, RA2)'],d:'Three DS75176 receivers (U3/U5/U6) with PE-65612 pulse transformers. Their outputs are joined, and the enable pins pick one. The 74HC125 can also feed the DEMUX\'s AES1/AES2 (P5) into the same CS8420 input.'},
  dmx:{x:780,y:20,w:200,h:110,t:'DEMUX option',s:['Demux3 → DEMUX-4 (Atmel)','SDI A/B in, 2 AES out','answers address 11'],d:'Replies 0xE0 to 0xE8 at start-up. Address-11 bytes carry group (bits 2–1), pair swap (bit 0) and input A/B (bit 4, the Ali-Add). Reply: 0x02 no carrier, 0x3C audio unlocked, 0x00 OK (demux4.c processUart).'},
  meters:{x:20,y:220,w:220,h:150,t:'Meters',s:['2 × VU + 2 × PPM movements','OP275 drivers (L_VU, L_PPM, R_VU, R_PPM)','LED illumination','LM393 + 74HC00 phase → RA0'],d:'After the CS3310 the signal is analog all the way to the needles. The PPM DC (A/D_PPM_L/R) also goes to XTM41 RA0/RA1 for peak detection. The phase detector (LM393 squarers, 74HC00 XOR, RC filter at H1-16) feeds the front-panel PIC. Ballistic values are not in the archive, so the simulation\'s are inferred.'},
  out:{x:290,y:300,w:150,h:70,t:'Monitor out',s:['XLR-M A/B, +4 dBu at 0 VU','HDST 600 Ω headset'],d:'The manual: “The analog outputs are set to deliver a +4 dBu signal for a meter reading of 0.”'},
};
const WIRES = [['fp','bus','tx0 tx1'],['bus','fp','reply'],['bus','mb',''],['mb','bus',''],['bus','dmx','address 11'],['dmx','aes','AES1/AES2 → 74HC125'],['ain','meters','CS3310 → drivers'],['aes','mb','→ CS8420'],['mb','ain','relays, gain, HP'],['meters','fp','phase → RA0'],['meters','out','']];
function viewBlock(m){
  window.__xtm4Keys = false;
  let sel='fp';
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${card('Signal flow in one paragraph', `<p>The <b>front-panel PIC</b> owns the user interface and is the bus master. Every half second (or straight after a button press) it sends the main board two bytes: <i>which source</i> and <i>what reference level</i>. The <b>main-board PIC</b> sets the relays and receivers, programs the CS3310 attenuator so the reference level reads 0 VU, and replies with one byte holding the AES lock bit. From the attenuator on, the signal is <b>analog</b>: meter drivers move the needles, and the phase detector goes back to the front panel's A/D converter.</p>`)}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 1000 400" style="width:100%"><defs><marker id="xar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#xar)"/>${l?`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`:''}`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
        <text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+10}" y="${b.y+38+i*15}" font-size="11" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML = s+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=> g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
  };
  draw();
}

/* ---------------- schematics (redrawn from net names) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-16}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-3}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x-34}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x+w+34}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  return s;
}
const SHEETS = [
  { name:'1 · XTM4-2: PIC16F874', note:'U4 (TQFP-44) pin numbers and connections from XTM4-2iss4.net. Signal names come from the 42V400C/init42 source, because the netlist only has NETxxxxx numbers.', svg:()=>
    chip(330,50,200,'U4 PIC16F874',[['8 RB0','MODE  PB1 (R14)'],['9 RB1','SOURCE PB2 (R13)'],['16 RB6/PGC','DOWN PB3 (R12)'],['17 RB7/PGD','UP PB4 (R11)'],['19 RA0/AN0','PHASE ← H3-16'],['21 RA2','DISP RST (U1-1)'],['24 RA5','DISP FL (U1-2)*'],['18 MCLR','H7-3 ICSP'],['30/31 OSC','X1 4.9152 MHz'],['1 RC7/RX','U2-1 RO'],['44 RC6/TX','U2-4 DI'],['43 RC5','U2-2/3 DE /RE']],
      [['32,35,36,37 RC0–3','DISP A0–A3'],['42 RC4','DISP A4'],['15 RB5','DISP WR (U1-13)'],['14 RB4','DISP CE (U1-14)'],['10 RB2','DISP RD (U1-19)'],['38–41 RD0–3','DISP D0–D3'],['2–5 RD4–7','DISP D4–D7'],['25 RE0','4052 S0 (U3-10)'],['26 RE1','4052 S1 (U3-9)'],['27 RE2','LED common (R15/R1 330R)'],['11 RB3/PGM','H7-6 ICSP']],'XTM42 · MPASM · TRISB 11000011, TRISA 11100001 (*RA5 left as input)') },
  { name:'2 · XTM4-2: display, buttons, phase LEDs', note:'U1 footprint is PDSP1884 (same pinout family as the HDSP-2533 fitted in 2015|48). The 74HC4052 sources L1–L4 from +5 V and sinks L5–L8 to ground. RE2 through R15/R1 picks the half, so one 3-bit code lights exactly one LED.', svg:()=>
    chip(80,60,170,'U1 HDSP-2533',[['1 RST','RA2'],['2 FL','RA5'],['3–6 A0–A3','RC0–RC3'],['10 A4','RC4'],['13 WR','RB5'],['14 CE','RB4'],['19 RD','RB2']],[['20,21,25,26','D0–D3 ← RD0–3'],['27–30','D4–D7 ← RD4–7'],['11,15','+5'],['16,18','GND']],'8 × 5×7 intelligent display')
    + chip(520,60,170,'U3 74HC4052',[['10 S0','RE0'],['9 S1','RE1'],['13 1Z','+5'],['3 2Z','GND'],['6 /E','GND']],[['12 1Y0','L1 (0°)'],['14 1Y1','L2'],['15 1Y2','L3'],['11 1Y3','L4'],['1 2Y0','L5'],['5 2Y1','L6'],['2 2Y2','L7'],['4 2Y3','L8 (180°)']],'phase LED decoder')
    + `<text x="520" y="330" font-size="11.5" fill="var(--ink)">L1–L4 cathodes → R15 330R ┐</text><text x="520" y="348" font-size="11.5" fill="var(--ink)">L5–L8 anodes  → R1 330R  ┴→ RE2</text>
       <text x="80" y="330" font-size="11.5" fill="var(--ink)">PB1–PB4 Omron B3J: pin 2 → R11–R14 1K → RB, R17–R20 1K → +5; pins 5/6 GND</text>` },
  { name:'3 · XTM4-1: PIC16F74', note:'U31 (DIP-40) from XTM4-1iss5.net. Here the netlist does carry names (CS-8420, 3310CLK, GAINSEL …), and they match the 41v202 source.', svg:()=>
    chip(330,40,200,'U31 PIC16F74',[['2 RA0/AN0','A/D_PPM_L'],['3 RA1/AN1','A/D_PPM_R'],['4 RA2','AES3 (BNC rx /RE)'],['6 RA4','AESGAIN'],['7 RA5','MUTE-DAC'],['8 RE0','AES1 (XLR rx /RE)'],['9 RE1','AES2 (jack rx /RE)'],['10 RE2','MUTE-3310'],['13/14 OSC','X1 4.9152 MHz'],['16 RC1','U32 DE /RE'],['25 RC6/TX','U32 DI'],['26 RC7/RX','U32 RO']],
      [['17 RC2','CS-8420'],['18 RC3','SCLK'],['23 RC4','SDIN (← CDOUT)'],['24 RC5','SDOUT (→ CDIN)'],['19 RD0','RESET (8420)'],['20 RD1','CS-3310'],['21 RD2','3310IN'],['27 RD4','3310CLK'],['28 RD5','GAINSEL'],['29 RD6','A\\D'],['30 RD7','HIGH_PASS'],['33/34 RB0/1','SDI1/SDI2 (74HC125)'],['35–38 RB2–5','ULN2803 → P11, TERMRES, TERMSET'],['39/40 RB6/7','INRES / INSET']],'XTM41 · RC0 (peak LED in the code) is not connected on Issue 5') },
  { name:'4 · XTM4-1: AES and gain chain', note:'Connections from the netlist. The order of the analog blocks after the receivers is read from the net names and the code. Op-amp stages and trims (RV1–RV18) are not traced.', svg:()=>
    chip(60,60,160,'U7 CS8420',[['2 /CS','CS-8420'],['28 CCLK','SCLK'],['27 CDIN','SDOUT'],['1 CDOUT','SDIN'],['9 /RST','RESET']],[['16,17,18','→ CS4390 serial'],['21 OMCK','OSC1 24.576 MHz'],['reg16 b4','UNLOCK → tx0 b0']],'AES receiver + SRC')
    + chip(400,60,150,'U8 CS4390',[['7–10','← CS8420'],['15,16 MUTE','MUTE-DAC']],[['13/14','→ U10 SSM2143'],['17/18','→ U9 SSM2143']],'DAC (obsolete part)')
    + chip(700,60,160,'U21 CS3310',[['2 /CS','CS-3310'],['3 SDATAI','3310IN'],['6 SCLK','3310CLK'],['7 SDATAO','3310OUT'],['8 /MUTE','MUTE-3310']],[['16 / 9','L / R in'],['14 / 11','L / R out →'],['','meter drivers']],'stereo attenuator, 0.5 dB steps')
    + `<text x="60" y="330" font-size="11.5" fill="var(--ink)">Gain byte: TABLE1 (analog) / TABLE2 (digital) in 41v202.asm, 192 = 0 dB. Example: alvl1 64 (+4) → ${cs3310Analog(64)} (${fmtDb(cs3310dB(cs3310Analog(64)))} dB); dlvl1 40 (−20) → ${cs3310Digital(40)} (${fmtDb(cs3310dB(cs3310Digital(40)))} dB)</text>
       <text x="60" y="350" font-size="11.5" fill="var(--ink)">Below −20 dBu (alvl1 &lt; 40) GAINSEL switches ADG419 U2/U11 to high gain, and the table restarts ≈38 dB higher.</text>` },
  { name:'5 · Bus and connectors', note:'H3 (front panel) ↔ H1 (main board) ribbon: pins 1/2 RS-485 A/B, 7–10 and 11–14 supplies, 16 phase voltage. P10 takes the same RS-485 pair to the DEMUX board, and P5 brings its two AES outputs into the 74HC125.', svg:()=>
    chip(60,60,150,'U2 DS75176 (XTM4-2)',[['1 RO','RC7/RX'],['2,3 /RE DE','RC5'],['4 DI','RC6/TX']],[['6 A','H3-2'],['7 B','H3-1']],'front panel transceiver')
    + chip(420,60,150,'U32 DS75176 (XTM4-1)',[['1 RO','RC7/RX'],['2,3 /RE DE','RC1'],['4 DI','RC6/TX']],[['6 A','H1-2, P10-1'],['7 B','H1-1, P10-2']],'main board transceiver')
    + `<text x="60" y="250" font-size="12" fill="var(--ink)">Rear (XTM4M2 ISS 8): IEC 115 VAC 1 A S.B · AES INPUT 75 Ω BNC / 110 Ω XLR-F · MONITOR OUTPUT A/B XLR-M · ANALOG INPUT A/B XLR-F</text>
       <text x="60" y="270" font-size="12" fill="var(--ink)">Front: CHA, CHB (A0), AES (D0), HDST — long-frame TRS normalling jacks</text>
       <text x="60" y="290" font-size="12" fill="var(--ink)">Option: DEMUX-4 adaptor plate — SDI 1 (A), SDI 2 (B), SDI OUT, AES 1, AES 2</text>` },
];
function viewSchem(m){
  window.__xtm4Keys = false;
  let i=0;
  m.innerHTML = card('Schematic set (redrawn from netlists and source names, not the P-CAD drawings)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The original P-CAD schematics are <span class="mono">XTM4 - #Engineering/PCB/XTM4-1/XTM4-1iss5.sch</span> and <span class="mono">XTM4-2/XTM4-2ISS4.sch</span> (binary). These sheets were rebuilt from the ASCII netlists (<span class="mono">.net</span>) and the register names in the firmware, so they are as reliable as those files. Blue labels are nets or the PIC port that drives them.</p>`);
  const draw=()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=> b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 1000 420" style="width:100%;min-width:680px;background:var(--lane);border:1px solid var(--line);border-radius:8px">
      <rect x="6" y="6" width="988" height="408" fill="none" stroke="var(--line)"/><text x="980" y="405" text-anchor="end" font-size="10" fill="var(--ink2)">XTM4 · sheet ${i+1}/${SHEETS.length} · redrawn ${Y(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent = SHEETS[i].note;
  };
  draw();
}

/* ---------------- software diagrams ---------------- */
function flowSVG(steps, cur, title, foot, w){
  w = w||520; const H = 50 + steps.length*36 + 40;
  let s = `<svg viewBox="0 0 ${w} ${H}" style="width:100%"><defs><marker id="xa2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
    <rect x="${w/2-120}" y="6" width="240" height="24" rx="12" fill="var(--chip)" stroke="var(--line)"/><text x="${w/2}" y="22" text-anchor="middle" font-size="11.5" fill="var(--ink)">${title}</text>`;
  steps.forEach((p,j)=>{ const y=40+j*36, on=cur===j;
    s += `<line x1="${w/2}" y1="${y-10}" x2="${w/2}" y2="${y}" stroke="var(--ink2)" marker-end="url(#xa2)"/><rect x="20" y="${y}" width="${w-60}" height="28" rx="5" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
      <text x="28" y="${y+12}" font-size="11" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${p[0]}</text><text x="28" y="${y+24}" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${p[2].length>78?p[2].slice(0,76)+'…':p[2]}</text>`; });
  const yb = 40+steps.length*36;
  s += `<path d="M${w-40} ${yb-22} h18 V36 h-${w/2-22}" fill="none" stroke="var(--ink2)" marker-end="url(#xa2)"/><text x="20" y="${yb+16}" font-size="10.5" fill="var(--ink2)">${foot}</text></svg>`;
  return s;
}
function viewSoft(m){
  window.__xtm4Keys = true;
  m.innerHTML = `<div class="grid2">
    ${card('XTM42 front panel — main loop (box lit = running at the playhead)', `<div id="f42"></div>`)}
    <div>${card('XTM41 main board — MAIN', `<div id="f41"></div>`)}${card('Menu state machine (MODE / SOURCE / UP / DOWN)', `<div id="fsm"></div>`)}</div></div>
  <div class="grid2">
    ${card('UART protocol map — live bytes', `<div id="proto"></div>`)}
    ${card('How the buttons did things — button → routine → wire', `<div id="btn"></div>`)}</div>
  <div class="grid2">
    ${card('EEPROM image (eewrite / INIT)', `<div id="ee"></div>`)}
    ${card('Power-up path (INIT → program1/3 → opening_window → main)', `<div id="boot"></div>`)}</div>`;
  const draw=()=>{
    const t=SIM.t, st=stAt(t);
    m.querySelector('#f42').innerHTML = flowSVG(ST42, stepIdx42(t), 'main (42V400C.asm) — after INIT/handshake', `goto main · pass ≈ ${(L42*1e6).toFixed(0)} µs (inferred) · pass #${pass42(t)} · clrwdt three times per pass`);
    m.querySelector('#f41').innerHTML = flowSVG(ST41, stepIdx41(t), 'MAIN (41v202.asm)', `goto main · pass ≈ ${(L41*1e3).toFixed(2)} ms (inferred) · no interrupts on either PIC (ORG 4 RETFIE)`);
    // FSM
    const cur = st.mode;
    const node=(x,y,lbl,sub,on,dim)=>`<g opacity="${dim?.45:1}"><rect x="${x-62}" y="${y-24}" width="124" height="48" rx="10" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="${dim?'var(--line)':'var(--ink2)'}" stroke-dasharray="${dim?'4 3':''}"/><text x="${x}" y="${y-4}" text-anchor="middle" font-size="12" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${lbl}</text><text x="${x}" y="${y+12}" text-anchor="middle" font-size="10" fill="${on?'#fff':'var(--ink2)'}">${sub}</text></g>`;
    const ar=(x1,y1,x2,y2,l,lx,ly)=>`<path d="M${x1} ${y1} L${x2} ${y2}" stroke="var(--ink2)" fill="none" marker-end="url(#xa3)"/>${l?`<text x="${lx}" y="${ly}" font-size="10" fill="var(--ink2)">${l}</text>`:''}`;
    m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 560 300" style="width:100%"><defs><marker id="xa3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      ${node(80,60,'ANALOG','A0 ⇄ A1 (SOURCE)',cur==='A')}${node(280,60,'AES','D0 ⇄ D1 (SOURCE)',cur==='D')}${node(480,60,'SDI A','SA1…SA8 (SOURCE)',cur==='S'&&st.s.sel===0,!D.comout0)}${node(480,170,'SDI B','SB1…SB8',cur==='S'&&st.s.sel===1,!D.comout0)}
      ${node(180,200,'SETUP: HP','UP in · DOWN out',cur==='SET'&&st.set.scr==='HP')}${node(360,250,'SETUP: TERM','UP HZ · DOWN LZ',cur==='SET'&&st.set.scr==='TERM')}${node(60,260,'PEAK','unreachable in “B”',false,true)}
      ${ar(142,60,218,60,'MODE',165,52)}${ar(342,60,418,60,'MODE (comout,0)',350,52)}${ar(480,84,480,146,'MODE',488,118)}${ar(418,176,140,84,'MODE (via 2 replies)',230,120)}${ar(280,84,140,84,'',0,0)}
      <text x="190" y="100" font-size="10" fill="var(--ink2)">MODE, no DEMUX</text>
      ${ar(120,84,170,176,'hold MODE ≈4 s',60,150)}${ar(242,214,300,236,'SOURCE',262,214)}${ar(300,262,242,226,'SOURCE',250,262)}
      </svg><p class="small muted">MODE in SETUP → back to the remembered mode (stage_2). UP/DOWN outside SETUP: reference level ±1 dB (alvl1 0–90, dlvl1/slvl1 10–60).</p>`;
    // protocol
    const tx = txOf(st), e = sched().ex.find(x=>x.tTx0<=t && t<=(x.tRead||x.tRel)) || sched().ex.filter(x=>x.tTx0<=t).pop();
    const bitRow = (v, names)=>`<tr>${names.map((n,i)=>`<td class="mono" style="text-align:center;${(v>>(7-i))&1?'background:color-mix(in srgb,var(--accent) 25%,transparent)':''}">${n}<br><b>${(v>>(7-i))&1}</b></td>`).join('')}</tr>`;
    m.querySelector('#proto').innerHTML = `<p class="small">Address byte <b>tx0 ${hex(tx.tx0)}</b> (${tx.addr})</p><table class="kv">${bitRow(tx.tx0,['1 addr','a1','a0','term / XLR·BNC / input B','HP','s2','s1','s0'])}</table>
      <p class="small">Level byte <b>tx1 ${hex(tx.tx1)}</b> = ${tx.tx1}${st.mode==='SET'?' (plvl1 | 0x60 → XTM41 takes it as the peak threshold)':''}</p><table class="kv">${bitRow(tx.tx1,['0 data','l6','l5','l4','l3','l2','l1','l0'])}</table>
      <p class="small">Reply from ${e&&e.who?e.who:'—'} <b>${e&&e.resp!==undefined?hex(e.resp):'—'}</b></p>${e&&e.resp!==undefined?`<table class="kv">${bitRow(e.resp, e.who==='DEMUX'?['0','0','ch4','ch3','ch2','ch1','CL','AL']:['0','peak','1','1','1','1','chan','UNLOCK'])}</table>`:''}
      <p class="small muted">a1a0: 00 analog, 01 AES, 10 SDI via main board, 11 DEMUX board. XTM41 always ORs bits 2–5 into its reply (0x3C pattern). XTM42 uses that pattern to tell a main-board reply from a DEMUX reply. The 2001|34 protocol note has the address/command bit polarity backwards (“1 - always zero for address byte”); the code uses 1 = address.</p>`;
    const last = D.log.find(x=>x.name.startsWith('Press')||x.name.startsWith('Hold'));
    m.querySelector('#btn').innerHTML = `<table class="kv"><tr><th>Button (pin)</th><th>ANALOG</th><th>AES</th><th>SDI</th><th>SETUP</th></tr>
      <tr><td>MODE (RB0)</td><td class="mono small">anl1source → AES</td><td class="mono small">aes1source → SDI / ANALOG</td><td class="mono small">sdi_source → B / ANALOG</td><td class="mono small">set1source → leave</td></tr>
      <tr><td>SOURCE (RB1)</td><td class="mono small">anl1mode A0⇄A1</td><td class="mono small">aes1mode D0⇄D1</td><td class="mono small">sdi_mode SD1…8</td><td class="mono small">set1mode HP⇄TERM</td></tr>
      <tr><td>DOWN (RB6)</td><td class="mono small">anl1dn alvl1−1</td><td class="mono small">aes1dn dlvl1−1</td><td class="mono small">sdi_dn</td><td class="mono small">set1dn HP out / LZ</td></tr>
      <tr><td>UP (RB7)</td><td class="mono small">anl1up alvl1+1</td><td class="mono small">aes1up dlvl1+1</td><td class="mono small">sdi_up</td><td class="mono small">set1up HP in / HZ</td></tr>
      <tr><td>hold MODE</td><td colspan="4" class="mono small">remember: 11 776 passes → " SETUP  " → remember3 waits for release → stage_1</td></tr>
      <tr><td>(any) then</td><td colspan="4" class="small">txflags,0 → communication_control 150 passes → settxdata/txuart → XTM41 scanuart → proclvla/d/s → relays, receivers, CS3310 on its next pass → reply byte → processuart</td></tr></table>
      <p class="small">Last: <b>${last? last.name : 'none yet'}</b></p>`;
    // EEPROM
    const cur_ = eeImage(snap()), sv = D.ee, names = ['sourcea','alvl1','sourced','dlvl1','sources2','slvl1','sources1','sourceset1','plvl1','sdi_input_sel','sources2a','sources2b','slvl1a','slvl1b'];
    m.querySelector('#ee').innerHTML = `<table class="kv"><tr><th>addr</th><th>register</th><th>in RAM</th><th>in EEPROM</th></tr>${names.map((n,i)=>`<tr><td class="mono">${i}</td><td class="mono">${n}${i>=9?' <span class="muted">(Ali-Add)</span>':''}</td><td class="mono">${hex(cur_[i]&255)}</td><td class="mono" style="${sv&&sv[i]!==cur_[i]?'color:var(--warn)':''}">${sv? hex(sv[i]&255) : '—'}</td></tr>`).join('')}
      <tr><td class="mono">35</td><td class="mono">first-time flag</td><td class="mono">0xAA</td><td class="mono">${sv?'0xAA':'— (blank)'}</td></tr></table>
      <p class="small muted">${D.eeDue? `Save pending in ${((D.eeDue-performance.now())/1000).toFixed(1)} s.` : sv? 'Up to date.' : 'Never saved: the next power-up uses the INIT defaults.'} slvl1a/slvl1b are saved and restored, but the lines that would use them are commented out (;movf slvl1a…), so both SDI inputs share slvl1.</p>`;
    m.querySelector('#boot').innerHTML = flowSVG([
      ['INIT', 0, 'ports, TRIS, UART spbrg 7, A/D on, display_set, preload "ANG1 +4 "'],
      ['eer(35) == 0xAA ?', 0, 'yes: restore 14 bytes; no: nomatch defaults (+4 dBu, −20 dBFS, peak +4)'],
      ['program: delay 256', 0, 'clrf temp0 / decfsz loop'],
      ['program1: send / recieve', 0, '0xE8 0x55 → reply & 0xE0 == 0xE0 → comout,0 (DEMUX). 10 tries'],
      ['program2: send1 / recieve1', 0, 'skipped by "goto program3" — dead code'],
      ['program3: send11 / recieve11', 0, 'sourcea|0x80, plvl1|0x60 → XTM41 threshold; reply & 0x3C → com1,1'],
      ['opening_window', 0, '"04VA0001" × 25 600 refreshes (V040001; v2.02 showed "  V202  ")'],
      ['main → setup (once)', 0, 'stored SETUP → analog; stored SDI without DEMUX → analog'],
    ], bootPhase()? (bootPhase().stage==='handshake'?3:6) : 7, 'reset vector → INIT', 'No __CONFIG in the source: WDT and oscillator bits were set in the programmer.', 520);
  };
  SIM.on('time', draw); let last=0; SIM.on('frame', ts=>{ if (ts-last>500 && (bootPhase()||D.eeDue)){ last=ts; draw(); } });
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__xtm4Keys = false;
  m.innerHTML = card('What the XTM4 firmware is up to — findings from the source', `
  <ol>
    <li><b>Artwork ${SIM.year(2026)}: front and rear panels now from ${artSrc('FRONT')} and ${artSrc('REAR')} (both files Nov 9 2015; the rear sheet is dated MAY 15/15).</b> (a) The front GREEN plate is a solid green field round the display, buttons and jacks with the windows knocked out, plus the two rounded CHANNEL A / CHANNEL B meter frames and the SELECT SERIES bar; the WHITE plate carries MODE / SOURCE / DOWN / UP, CHA / CHB / AES / HDST and 0° … 180°. (b) The eight phase-LED holes between 0° and 180° are drawn on the sheet, at the pitch the simulator already used from the photo. (c) The rear is legended “115 VAC, 1 A S.B” — a 115 V-only rating. (d) The rear art has only the IEC, AES INPUT 75 Ω / 110 Ω, MONITOR OUTPUT A/B and ANALOG INPUT A/B holes plus the large DEMUX-4 plate cut-out: the OUTPUT 1/2 and SDI knock-outs drawn when no DEMUX-4 is fitted come from ${SIM.src(ART.DIR+'Pics/XTM4M2 (Rear).jpg','XTM4M2 (Rear).jpg')}, so that photo shows another issue. (e) Crosshairs mark only AES 110 Ω, MONITOR A and ANALOG B.</li>
    <li><b>The button names in the code are swapped against the panel, and the routine names match the panel.</b> <span class="mono">scan</span> in 42V400C.asm reads <span class="mono">portb,7</span> as “test dn button” into <span class="mono">scan0,0</span>, and <span class="mono">scan0,0</span> runs <span class="mono">anl1up</span> (level +1). <span class="mono">portb,0</span> is commented “source” but runs <span class="mono">anl1source</span>, which changes the <i>signal type</i>: the manual's MODE. The XTM4-2 netlist puts PB1→RB0, PB2→RB1, PB3→RB6 and PB4→RB7, and the panel reads MODE SOURCE DOWN UP from left to right. That PB order is ${inf}, but every behaviour in the manual matches it. The header comment “UP=PORTC,3 … SOURCE=PORTC,0” is left over from an older board.</li>
    <li><b>Holding MODE to reach SETUP also changes the source.</b> The press is debounced (64 passes, ≈22 ms) and handled by <span class="mono">anl1source</span>/<span class="mono">aes1source</span> long before <span class="mono">remember</span> has counted its 11 776 passes. SETUP then remembers the <i>new</i> mode (<span class="mono">temp2</span>), so you come back on the next signal type. The manual says only “press and hold the MODE button”.</li>
    <li><b>SETUP freezes the front panel.</b> Once “ SETUP ” is shown, <span class="mono">remember3</span> loops on <span class="mono">clrwdt</span> until MODE is released. No UART, no phase-meter A/D and no display refresh run during that time. The meters keep moving, because they are analog.</li>
    <li><b>SETUP changes don't reach the main board until you leave.</b> In SETUP, <span class="mono">settxdata</span> sends <span class="mono">sourceset1</span> as the address and <span class="mono">plvl1|0x60</span> as the level. XTM41 (<span class="mono">proclvla</span>/<span class="mono">proclvld</span>) sees bits 6 and 5 set, takes the “new peak level” branch and returns before it sets the HP filter or the termination relay.</li>
    <li><b>The PEAK screen can't be reached.</b> <span class="mono">set1mode</span> goes term→filt and filt→term. The jump to <span class="mono">peak</span> is commented out (“version 2.x B software does not have peak data”), and <span class="mono">stage_1</span> always opens SETUP on the filter screen. The manual still describes PEAK, and <span class="mono">plvl1</span> is still saved, sent at power-up (program3) and shown by unreachable code.</li>
    <li><b>The peak threshold is one step high.</b> XTM41 looks up <span class="mono">table</span> with <span class="mono">W = (uart1 &amp; 0x1F) + 1</span> (“PC offset”), but <span class="mono">addwf PCL</span> already lands on the first <span class="mono">retlw</span>. The front panel displays <span class="mono">45 + plvl1</span> (e.g. +4) while XTM41 compares the PPM A/D against the +5 entry. This only matters on non-B (peak) builds.</li>
    <li><b>Without a DEMUX board the unit takes ≈9 s to boot</b> ${inf}. <span class="mono">program1</span> sends <span class="mono">0xE8 0x55</span> up to 10 times. XTM41 ignores address 11, so each try waits for the full <span class="mono">comout2/comout3</span> time-out (156 × 256 loop iterations) with a blank display. Only then does <span class="mono">opening_window</span> show “04VA0001” for ≈2.3 s. <span class="mono">program2</span> (send1/recieve1) is never reached.</li>
    <li><b>The SDI front-panel “freeze” in the 2012|45 test report has a likely cause in the code.</b> <span class="mono">sdimode</span> returns early while <span class="mono">sources1,5</span> is set (the last message was addressed to the DEMUX). That bit flips only when a reply arrives (<span class="mono">sdi_control</span>). If the DEMUX stops answering, <span class="mono">loss_of_com</span> re-transmits and <span class="mono">settxdata</span> sets <span class="mono">sources1,5</span> again (“if re-transmit talk to sdi board first”), so the buttons stay locked out. The report fixed it on the DEMUX3 side (v4000); XTM42 was not changed. The link between that symptom and this code is ${inf}.</li>
    <li><b>DEMUX-4 “audio unlocked” looks like a main-board reply.</b> demux4.c answers 0x3C when group-1 audio is missing (the AMS4-Add). <span class="mono">processuart</span> treats any reply with bits 2–5 set as coming from XTM41 (<span class="mono">check_sdi_8420_lock</span>). So “NO AUDIO” depends on the main board's CS8420 lock, not on the DEMUX's own flag ${inf}.</li>
    <li><b>Saving can leave the unit half in SETUP.</b> <span class="mono">eewrite</span> fires ≈15.8 s after the last release, even while SETUP is open, so <span class="mono">sourceset1</span> can be saved with bit 7 set. At power-up <span class="mono">setup</span> then sets <span class="mono">sourcea,7</span> but never clears <span class="mono">sourceset1,7</span>. The analog routines take the button presses, while <span class="mono">settingsdis</span> (called later in the loop) keeps writing a SETUP screen to the display. The bit is saved again on the next eewrite. This is traced from the code and not seen in a test report ${inf}. Try it: enter SETUP, wait 16 s, power-cycle.</li>
    <li><b>Version string mismatch.</b> The V040001 banner spells <span class="mono">0 4 V A 0 0 0 1</span> (“04VA0001”). The 21 Nov 2015|48 test report and the README call it “04AV0001”, the same pattern as the DEMUX “02AV0401”.</li>
    <li><b>Dead and leftover code.</b> INIT preloads “ANG1 +4 ” into <span class="mono">dis0–7</span>, but it is never refreshed to the display. TRISE is commented “E2=AUD1 LED, E1=AUD2 LED, E0=ERROR LED”, yet PORTE now drives the phase-LED decoder. XTM41 <span class="mono">mutedac</span> and <span class="mono">txuart0</span> are never called, and the <span class="mono">relay</span> pulse routine has been commented out since v1.04: <span class="mono">relaypulse/relaypulse1</span> are written but never read, so the ULN2803 keeps the latching relay coil energised until the next change ${inf}. <span class="mono">com1,0</span> (“peak available”) is set but never read. XTM41's <span class="mono">peak</span> drives RC0, which is not connected on XTM4-1 Issue 5.</li>
    <li><b>The main board rewrites the CS8420 about 800 times a second.</b> <span class="mono">refresh8420</span> sends all eight control registers on every pass. <span class="mono">read8420</span> reads register 6 back and only trusts the UNLOCK bit if the echo matches <span class="mono">cs8420reg6def</span>. The comment on that read (“address of receive error register”) was copied from the reg-16 read below it.</li>
    <li><b>Manual vs code, small items.</b> The manual lists “SOURCE, MODE, DOWN and UP”, but the silk reads MODE SOURCE DOWN UP. It says LZ shows a “z” after the level; <span class="mono">analogdis</span> puts it in <span class="mono">dis2</span>, after the source number. It promises field-programmable four-character source names; no archived XTM42 version has code for them. TRISA leaves RA5 (display FL) as an input, even though the code writes PORTA,5 ${inf}.</li>
    <li><b>The D1 auto-detect is a 5-reply search.</b> <span class="mono">check_lock</span> counts 5 unlocked replies (<span class="mono">bcount</span>), then XORs <span class="mono">sourced,4</span> to swap XLR ⇄ BNC. <span class="mono">aes_control</span> shortens the poll to 200 passes while D1 is unlocked. The manual's “first signal detected will be metered” is the result.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>Main-loop pass lengths (XTM42 ≈ ${(L42*1e6).toFixed(0)} µs, XTM41 ≈ ${(L41*1e3).toFixed(2)} ms) are ${inf} from instruction counts on the usual path. The pass counts are exact (from the source), so every delay scales with this one guess. The results are consistent with the manual: SETUP after about 4 s, auto-repeat after about 1 s.</li>
    <li>Needle ballistics (VU per ANSI C16.5, PPM per IEC 60268-10 type IIb) and the 80 Hz high-pass corner are ${inf}. The archive does not hold the analog values.</li>
    <li>Contact bounce 3 ms, DEMUX reply delay 0.4 ms, the idle-poll phase and the XTM41 loop phase are ${inf}. The CS3310 zero-crossing delay is ignored.</li>
    <li>A0 with nothing patched in reads silence. The real normalling jacks may pass the rear signal through when empty ${inf}.</li>
    <li>The DEMUX's group selection is modelled as SDn → group ⌈n/2⌉. Only one test signal feeds every input.</li></ul>`)
  + card('Sources', `<ul class="small mono">
    <li>XTM4 - #MASTER/XTM4 - #Engineering/code/xtm42/PIC VERSIONS/V040001/42V400C/*.asm (and 42v202 for the peak code)</li>
    <li>…/code/xtm41/PIC VERSIONS/41v202/41v202.asm, init41.asm · 41v204/ONLY_DMS1 · …/code/XTM4 PROTOCOL.wpd</li>
    <li>…/PCB/XTM4-1/XTM4-1iss5.net · …/PCB/XTM4-2/XTM4-2iss4.net · SA-XTM4-1ISSUE4 - BOM/sa-xtm4-1issue4.xls</li>
    <li>…/MANUAL/xtm4man.pdf, xtm4peak.pdf, xtm4sdi.pdf · XTM4 - #TESTREPORT/*.pdf</li>
    <li>XTM4 - #ARTWORK #DA #2016/${artSrc('FRONT')}, ${artSrc('REAR')} (assets/xtm4-front.svg, xtm4-rear.svg), XTM4M1-FRONT-SILK (CURVE).pdf, XTM4M2-REAR-SILK (CURVE).pdf, Pics/*.jpg</li>
    <li>SA-DEMUX4 - #Master/…/Software/Demux4/Atmel/backup6/V010000/demux4.c</li></ul>`);
}

/* ---------------- register plugin ---------------- */
SIM.register({
  footnotes: [{"text": "Artwork 2026|59: the front and rear panels are drawn from XTM4M1-FRONT-SILK (CURVE).cdr and XTM4M2-REAR-SILK (CURVE).cdr (files Nov 9 2015).", "src": "XTM4 - #MASTER/XTM4 - #ARTWORK #DA #2016/XTM4M1-FRONT-SILK (CURVE).cdr"},
    {"text": "The rear sheet is dated MAY 15/15 on its title line, six months before the file date.", "src": "XTM4 - #MASTER/XTM4 - #ARTWORK #DA #2016/XTM4M2-REAR-SILK (CURVE).cdr"},
    {"text": "The rear is legended “115 VAC, 1 A S.B”, a 115 V-only rating.", "src": "XTM4 - #MASTER/XTM4 - #ARTWORK #DA #2016/XTM4M2-REAR-SILK (CURVE).cdr"},
    {"text": "The rear art has no OUTPUT 1/2 or SDI holes left of the DEMUX-4 cut-out; the rear photo shows them, so the photo is of another issue.", "src": "XTM4 - #MASTER/XTM4 - #ARTWORK #DA #2016/Pics/XTM4M2 (Rear).jpg"},
    {"text": "The eight phase-LED holes between 0° and 180° are on the front sheet, at the 32-pixel pitch the simulator had already measured from the photo.", "src": "XTM4 - #MASTER/XTM4 - #ARTWORK #DA #2016/XTM4M1-FRONT-SILK (CURVE).cdr"},
    {"text": "Drill crosshairs on the rear mark only AES 110 Ω, MONITOR OUTPUT A and ANALOG INPUT B.", "src": "XTM4 - #MASTER/XTM4 - #ARTWORK #DA #2016/XTM4M2-REAR-SILK (CURVE).cdr"},
    {"text": "The front and rear CURVE sheets are stored twice, byte-identical, in #ARTWORK #DA #2016 and in XTM4 - #Engineering/SILK.", "src": "XTM4 - #MASTER/XTM4 - #Engineering/SILK/XTM4M1-FRONT-SILK (CURVE).cdr"}],
  id:'xtm4', name:'XTM4 · Extended Range Test Meter ('+Y(2001)+')', duration:1,
  product:'XTM4', year:2001, family:'Select Series (test & measurement)',
  folder:'XTM4 - #MASTER',
  summary:'2RU analog / AES-3 / SDI test meter with VU and PPM needle pairs, an 8-LED phase meter and an 8-character display. Two PIC16 processors on a 9600 Bd RS-485 link: XTM42 (front panel, UI master) and XTM41 (main board: CS8420 AES receiver, CS3310 attenuator, relays).',
  highlights:['Front and rear panels on the real silkscreen','Needle ballistics in slow motion (VU vs PPM)','Button → debounce → UART → CS3310 traced pass by pass','14-step operator tutorial from the manual','15 findings: swapped button names, the SETUP side-step, the 9 s boot, the SDI lock-out'],
  depth:'Full model',
  stepUnits:[
    {label:'1 XTM42 pass (≈342 µs)', period:()=>L42},
    {label:'1 XTM41 pass (≈1.25 ms)', period:()=>L41},
    {label:'1 UART byte (1.04 ms)', period:()=>C.BYTE},
    {label:'1 UART bit (104 µs)', period:()=>1/9600},
    {label:'1 AES frame', period:()=>1/D.sig.fs},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.3,'300 ms (VU rise time)'],[0.05,'50 ms (debounce + 150-pass delay)'],[0.006,'6 ms (one UART exchange)'],[0.0015,'1.5 ms (one byte / XTM41 pass)'],[0.0004,'400 µs (one XTM42 pass)'],[0.0001,'100 µs (UART bits, AES frames)']],
  defaultZoom:0,
  init(){ SCH_KEY=''; MS_KEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the XTM4', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
