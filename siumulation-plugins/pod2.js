/* =====================================================================
   POD2 — 6×1 stereo analog audio switcher with SUM, audio-follow-video and RS-422
   (Ward-Beck Systems; design 1997|30, PIC16F874 firmware v200/v201 2009|42, PCB issue 6)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, under #POD #SERIES/POD2 - #Master/):
   - POD2 - #Engineering/POD2 - #Software/POD2 - #Software #v201/pod2v200.asm (= v202, byte-identical)
       main, init, re_init, input, debounce, router, output_led, debounce_rel, recieve_uart, reset_uart,
       translate_uart (status_check, send_audio, sum_audio, next_check2, cancel_sum, slave_mode, slave_on,
       slave_off, not_on), spi_uart_setup, transmit_uart, SPI_trns_cntrl (tran_spi, do_spi, special_spi,
       more_spi), spi_tran_setup, SPI_slave, SPI_rcv_ctrl (no_update, spi_rec_setup), timer_check, audio_table
   - .../#v200/pod2v200.asm (diff vs v201), #V100/POD2V100.ASM (1997|30), pod2v103.asm, WARNING (1998|31),
     #r200/pod2r200.asm (POD2R remote: trans_setup, output_info, uart_setup, timer_check, com_timeout)
   - #POD #SERIES/POD9 - #Master/POD9 - #Engineering/POD9R - #SOFTWARE /POD9R - #SOFTWARE #V102/pod9v102.asm
       (the SPI master on the other end: timer_check prescale 1:1, SPI_master, SPI_trns_cntrl, SPI_rcv_ctrl) — default;
       .../POD9R - #SOFTWARE #V100/pod9v102.asm (the 16F73 build) as an option. Corrected 2026|59 (see pod9.js): in V102 the
       SLAVE button (RA1) is not read and SPI_master forces slave on at every exchange.
   - POD2 - #Engineering/POD2 - MANUAL.pdf (WordPerfect, 2006|39): operation, SERIAL PROTOCOL, DB9F pin-out, specs
   - POD2 - #Engineering/pod2-p1.pdf, pod2-p2.pdf (P-CAD 2002 "POD2iss5", 2009|42) and POD2.pdf (POD2.DSN, Oct 7 1997)
   - SA-POD2-MAIN iss6 BOM.xlsx, POD2 Master Bom.xlsx, POD2 ISS6 BOM PCAD.bom
   - POD2 - #Engineering/POD2 - Functional Diagram.cdr (CorelDRAW 10, converted with Inkscape for reference)
   - POD GPI Connections.pdf (2013|46), POD2 Slave Port Picture.jpg
   - POD2 - #ARTWORK #DA #2016/POD2-FRONT&REAR-SILK (CURVE).pdf → assets/pod2-*.png; Pics/POD2 Front.jpg, POD2 Rear.jpg
   - POD2 - #Mechanical #DA #2016/POD2-FRONT ISS 2 (PANEL).pdf, POD2- REAR ISS 5 (PANEL).pdf,
     DE-25 ISS 2 (ADAPTOR PLATE POD2).pdf (all drawn sideways; read rotated upright)
   - POD2 - Production Photos/POD2 Top View.jpg (issue 6 board)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const Y = y => SIM.year(y);
const hex2 = v => '0x'+(v&255).toString(16).padStart(2,'0').toUpperCase();
const hx = v => (v&255).toString(16).padStart(2,'0').toUpperCase();
const bin8 = v => (v&255).toString(2).padStart(8,'0');

/* ---------------- constants from the source ---------------- */
const C = {
  FOSC: 4.9152e6,               // X1 "4M9152" on pod2-p1.pdf; BOM S1--4M9152
  TCY: 4/4.9152e6,              // 813.8 ns per instruction cycle
  BAUD: 9600,                   // SPBRG = 0x07, BRGH = 0 → Fosc/(64·8) = 9600 (manual: 9600, 8 bits, no parity)
  DEB: 0x70,                    // bcount reload in debounce / debounce_rel (112 passes)
  TMR2: 65536,                  // T2CON = 0xFF: prescale 1:16 × PR2 256 × postscale 1:16
  SPI_TRAN: 0x20,               // spi_tran_count: a change is repeated 32 times on the slave port
  SPI_REC: 4,                   // spi_rec_count: 4 identical-class commands before POD2 follows
  POD9_SPI: 4096,               // pod9v102.asm timer_check: prescale 1:1 × 256 × postscale 1:16 → one SPI byte per 4096 Tcy
  POD9_REC0: 8, POD9_REC: 7,    // pod9v102.asm: spi_rec_count = 0x08 at init, 0x07 on reload
  POD9_DEB: 0.015,              // POD9 button debounce before it acts — INFERRED (not traced)
  PRESS: 0.15,                  // how long a click holds a button — INFERRED
  HORIZON: 2.0,                 // emulate 2 s so actions late in the second still finish (goals use the state at 2 s)
  PRE: -0.25,                   // the unit has been running since before t = 0
  PWRT: 0.072,                  // power-up timer if enabled in the (unknown) config bits — INFERRED
  RAIL: 10.5,                   // NE5532 swing on ±12 V (SUW1R5-1212) — INFERRED
};
C.BYTE = 10/C.BAUD;            // start + 8 data + stop = 1.0417 ms
C.T2 = C.TMR2*C.TCY;           // 53.33 ms
C.SPI_T = C.POD9_SPI*C.TCY;    // 3.333 ms (POD9 assumed on the same 4.9152 MHz crystal — its SPBRG is also 7)
const IDLE = 138;              // cycles in an idle pass (counted from the listing, see Software tab)

/* main-loop routines in the order main calls them; idle cost includes call+return (counted from the listing) */
const ROUT = [
  ['main · clrwdt', 1, 'clrwdt — the watchdog is cleared once per pass (WDTE is in the unknown config bits)'],
  ['re_init', 22, 'BANK1, ADCON1 = digital, TRISA/B/C/D/E rewritten every pass, BANK0'],
  ['input', 29, 'scans RA2, RA3, RA4, RE0, RE1, RE2, RA1, RA0 in that order and returns at the first low pin'],
  ['debounce', 18, 'bcount counts 0x70 identical passes before input_flag is set'],
  ['router', 11, 'local press → one-of-six or SUM toggle; else spi_reg (remote_flag,0) or recieved_reg (remote_flag,1)'],
  ['debounce_rel', 5, 'waits for 0x70 passes with every button released'],
  ['recieve_uart', 5, 'PIR1,RCIF → RCREG to recieved_reg'],
  ['reset_uart', 5, 're-programs SPBRG/TXSTA/RCSTA after every received byte'],
  ['translate_uart', 7, 'F0 address byte, then the command byte (00 status, 01 sum, 10 switch, 11 slave)'],
  ['transmit_uart', 13, 'TRMT → RC0 (driver enable) low; load TXREG and raise RC0 when a reply is pending'],
  ['SPI_trns_cntrl', 5, 'prepares the next slave-port byte: F0 header / status / command'],
  ['SPI_slave', 5, 'PIR1,SSPIF → read SSPBUF, write spi_output for the next exchange'],
  ['SPI_rcv_ctrl', 5, 'F0 header, then status (bit 7 = 1 → video) or command (4 in a row → follow)'],
  ['timer_check', 7, 'TMR2IF every 53.3 ms: no slave-port byte in that time → video = 0xFF (POD9 absent)'],
];
const VARS = ['pre_output','input_reg','bcount','bounce','rel_flag','input_flag','remote_flag','spi_flag','transmit_flag','uart_flag',
  'which_flag','recieved_reg','transmit_reg','spi_output','spi_output_temp','spi_recieved','spi_reg','video','video_flag',
  'spi_tran_count','spi_rec_count','PORTD','RC0'];
const NV = VARS.length;
/* audio_table: addwf PCL — index 0 lands on the nop and falls into index 1 */
const AUDIO_TABLE = [0xFE, 0xFE, 0xFD, 0xFB, 0xF7, 0xEF, 0xDF, 0x01];
/* pin each button pulls low, in the order input() tests them */
const SCAN = [[0,'RA2','IN 1'],[1,'RA3','IN 2'],[2,'RA4','IN 3'],[3,'RE0','IN 4'],[4,'RE1','IN 5'],[5,'RE2','IN 6'],[7,'RA1','spare'],[6,'RA0','SUM']];
const BTN_NAME = k => k===6 ? 'SUM' : k===7 ? 'spare (RA1)' : 'IN '+(k+1);
const BTN_PIN = k => (SCAN.find(s=>s[0]===k)||[])[1];
const RD_PIN = [38,39,40,41,2,3,4,5];
/* contact bounce of the TS-1 tactile switches (ms offsets of each toggle) — INFERRED */
const BOUNCE_ON = [0, 0.16, 0.30, 0.52, 0.70, 1.02, 1.18];
const BOUNCE_OFF = [0, 0.22, 0.41, 0.80, 0.95];

/* ---------------- device state (what the user controls) ---------------- */
const SRC0 = () => [ {on:true, dbu:4, f:1000}, {on:true, dbu:4, f:400}, {on:true, dbu:0, f:2500}, {on:true, dbu:-6, f:250}, {on:true, dbu:4, f:5000}, {on:true, dbu:8, f:100} ];
const D = {
  scenario: 'press3',
  init: null, events: [],
  src: SRC0(),
  log: [],
  hex: 'F0 00',
  p9fw: 'v102',     // POD9 firmware on the slave port: 'v102' (#V102/pod9v102.asm, default) or 'f73' (#V100/pod9v102.asm, the 16F73 build)
};
const SCEN = {
  idle:   {name:'Idle on input 1 (nothing connected)', init:{}, ev:[]},
  press3: {name:'Front panel: press 3 at 100 ms', init:{}, ev:[{t:0.1, type:'btn', k:2, dur:C.PRESS, src:'front'}]},
  sum:    {name:'SUM: SUM, 2, 4 on; SUM off; then 5', init:{}, ev:[{t:0.08,type:'btn',k:6,dur:0.12,src:'front'},{t:0.28,type:'btn',k:1,dur:0.12,src:'front'},{t:0.46,type:'btn',k:3,dur:0.12,src:'front'},{t:0.64,type:'btn',k:6,dur:0.12,src:'front'},{t:0.82,type:'btn',k:4,dur:0.12,src:'front'}]},
  rs422:  {name:'RS-422: status, select A3, sum 1+6, cancel sum', init:{}, ev:[...pair(0.05,0xF0,0x00,'console'), ...pair(0.25,0xF0,0x83,'console'), ...pair(0.5,0xF0,0x61,'console'), ...pair(0.75,0xF0,0x80,'console')]},
  afv:    {name:'Audio-follow-video: POD9 (slave on) presses 4, then POD2 presses 6', init:{pod9:true, pod9sel:0, pod9slave:true}, ev:[{t:0.15,type:'pod9btn',k:3},{t:0.55,type:'btn',k:5,dur:C.PRESS,src:'front'}]},
  pod2r:  {name:'POD2R remote polling; remote selects 5 at 400 ms', init:{pod2r:true}, ev:[{t:0.4,type:'remote',k:4}]},
  two:    {name:'Two buttons at once (4 and 2) via the GPI header', init:{}, ev:[{t:0.1,type:'btn',k:3,dur:0.2,src:'gpi'},{t:0.1,type:'btn',k:1,dur:0.2,src:'gpi'}]},
  power:  {name:'Power-up at 100 ms (comes up on input 1)', init:{power:false}, ev:[{t:0.1,type:'power',on:true}]},
  slave:  {name:'Manual note test: F0 C0 then F0 C7 with POD9 attached', init:{pod9:true, pod9sel:2, pod9slave:true}, ev:[...pair(0.1,0xF0,0xC0,'console'), ...pair(0.5,0xF0,0xC7,'console')]},
};
function pair(t, a, b, src){ return [{t, type:'rx', b:a, src}, {t:t+C.BYTE, type:'rx', b, src}]; }
function loadScenario(id){
  const s = SCEN[id]; D.scenario = id;
  D.init = Object.assign({power:true, pod9:false, pod9sel:0, pod9slave:true, pod2r:false}, JSON.parse(JSON.stringify(s.init)));
  D.events = JSON.parse(JSON.stringify(s.ev)).map(e=>(e.scn=true, e));
  EMU_KEY = '';
}

/* =====================================================================
   THE EMULATOR — runs main of pod2v200.asm pass by pass with the firmware's own registers.
   A pass costs the cycles of the path it takes (idle = 138 Tcy = 112.3 µs).
   ===================================================================== */
let EMU = null, EMU_KEY = '';
function pinLowAt(k, t){   // raw contact level of button k (true = pin pulled low)
  let low = false;
  for (const e of D.events){ if (e.type!=='btn' || e.k!==k) continue;
    const a = e.t, b = e.t + e.dur; if (t < a || t >= b + 0.0015) continue;
    if (e.src==='gpi'){ if (t < b) low = true; continue; }
    if (t < b){ const ms = (t-a)*1e3; let n=0; BOUNCE_ON.forEach(o=>{ if (ms>=o) n++; }); if (n%2) low = true; }
    else { const ms = (t-b)*1e3; let n=0; BOUNCE_OFF.forEach(o=>{ if (ms>=o) n++; }); if (n%2===0) low = true; }
  }
  return low;
}
function emulate(){
  const key = JSON.stringify([D.init, D.events, D.p9fw]);
  if (key === EMU_KEY && EMU) return EMU;
  EMU_KEY = key;
  const TCY = C.TCY, H = C.HORIZON;
  const N = Math.ceil((H - C.PRE)/(IDLE*TCY)) + 50;
  const P = { t0:new Float64Array(N), cyc:new Uint16Array(N*ROUT.length), snap:new Int16Array(N*NV), n:0 };
  const sig = {}; const rec = (k,t,v)=>{ const a = sig[k] || (sig[k]=[]); if (a.length){ const l=a[a.length-1]; if (l[1]===v) return; if (t<=l[0]){ l[1]=v; return; } } a.push([t,v]); };
  const notes = []; const note = (t,txt,cls)=>notes.push({t, txt, cls:cls||''});
  const rxF = [], txF = [], spiX = [], tmr = [];
  const ev = D.events.slice().sort((a,b)=>a.t-b.t);
  /* ---- the outside world ---- */
  const W = { power:D.init.power, pod9:D.init.pod9, pod2r:D.init.pod2r };
  const P9 = { sel:D.init.pod9sel, slave:D.p9fw==='v102' ? true : D.init.pod9slave, cmdLeft:0, hdr:false, rcvHdr:false, rcnt:C.POD9_REC0, next:C.PRE+0.0011, pendSel:null, audio:0xFF, alt:false };
  const R2 = { next:C.PRE+0.007, alt:false, pend:null, leds:0, lastRx:-1, bytes:[] };
  let rxQ = [];                 // bytes on the RX wire: {t0, tEnd, b, src}
  let rcFifo = [];              // RCREG FIFO (2 deep)
  let ssp = { out:0x00, inPend:false, in:0, ov:0 };
  let txBusyUntil = -1e9;
  let tmrNext = 0, tmrStart = 0;
  let V = null, alive = false, bootAt = W.power ? C.PRE : null;
  let ei = 0;
  const pod9Byte = ()=>{                        // what POD9 shifts out at its next exchange (pod9v102.asm SPI_trns_cntrl)
    P9.alt = !P9.alt;
    if (P9.alt) return 0xF0;
    const sel = 0x3F & ~(1<<P9.sel);
    if (P9.cmdLeft > 0 && P9.slave){ P9.cmdLeft--; return 0x40 | sel; }   // bit 7 = 0 command; bsf spi_output,6
    return 0x80 | (P9.slave ? 0 : 0x40) | sel;
  };
  const pod9Rx = (b, t)=>{                      // POD9's SPI_rcv_ctrl receiving what POD2 sent
    if (b === 0xF0){ P9.rcvHdr = true; return; }
    if (!P9.rcvHdr){ P9.rcnt = C.POD9_REC; return; }
    P9.rcvHdr = false;
    if (b & 0x80){ P9.audio = b & 0x7F; return; }
    if (--P9.rcnt > 0) return;
    P9.rcnt = C.POD9_REC;
    if (b === 0) return;
    let s = -1; for (let i=0;i<6;i++) if (!(b & (1<<i))){ s = i; break; }
    const sl = !(b & 0x40);
    if ((s>=0 && s!==P9.sel) || sl!==P9.slave) note(t, `POD9 acts on the command ${hex2(b)} from POD2: video ${s>=0?'input '+(s+1):'unchanged'} · slave ${sl?'ON':'OFF'} (pod9v102.asm SPI_rcv_ctrl: lowest 0 bit selects, bit 6 = 0 → slave LED)`, 'pod9');
    if (s >= 0) P9.sel = s; P9.slave = sl;
    rec('p9sel', t, P9.sel); rec('p9slave', t, P9.slave?1:0);
  };
  const remoteByte = ()=>{                     // POD2R trans_setup: F0, then a command, one byte per TMR2 tick
    R2.alt = !R2.alt;
    if (R2.alt) return 0xF0;
    if (R2.pend !== null){ const c = R2.pend; R2.pend = null; return c; }
    return 0x00;                               // check: clrf recieved_reg → status request
  };
  rec('p9sel', C.PRE, P9.sel); rec('p9slave', C.PRE, P9.slave?1:0); rec('pod9', C.PRE, W.pod9?1:0); rec('pod2r', C.PRE, W.pod2r?1:0);
  rec('power', C.PRE, W.power?1:0);

  function applyEvents(t){
    while (ei < ev.length && ev[ei].t <= t){ const e = ev[ei++];
      if (e.type==='rx'){ const t0 = Math.max(e.t, rxQ.length ? rxQ[rxQ.length-1].tEnd : -1e9); rxQ.push({t0, tEnd:t0+C.BYTE, b:e.b, src:e.src}); rxF.push({t0, b:e.b, src:e.src}); }
      else if (e.type==='pod9'){ W.pod9 = e.on; rec('pod9', e.t, e.on?1:0); P9.next = e.t + 0.001; P9.alt=false; P9.rcvHdr=false;
        note(e.t, e.on?'Slave-port cable P3 connected to a POD9: it clocks one SPI byte every 4096 Tcy (3.33 ms)':'Slave-port cable removed: SCK stops', 'in'); }
      else if (e.type==='pod2r'){ W.pod2r = e.on; rec('pod2r', e.t, e.on?1:0); R2.next = e.t + 0.003; R2.alt=false;
        note(e.t, e.on?'POD2R remote plugged into CONTROL: it sends one byte per 53.3 ms TMR2 tick (F0, command, F0, …)':'POD2R unplugged', 'in'); }
      else if (e.type==='pod9btn'){ if (e.k===6){ if (D.p9fw==='v102') note(e.t, 'POD9 SLAVE button: V102 never reads RA1 (the “check mix” lines in input are commented out) — nothing happens; SPI_master keeps slave ON (see pod9.js)', 'pod9');
          else { P9.slave = !P9.slave; rec('p9slave', e.t+C.POD9_DEB, P9.slave?1:0); note(e.t, `POD9 SLAVE button (16F73 build reads RA1) → slave ${P9.slave?'ON':'OFF'} (its status byte bit 6 is now ${P9.slave?0:1})`, 'pod9'); } }
        else { P9.pendSel = {k:e.k, t:e.t + C.POD9_DEB}; note(e.t, `POD9 button ${e.k+1} pressed`, 'in'); } }
      else if (e.type==='remote'){ R2.pend = e.sum!=null ? (0x40 | e.sum) : (0x80 | (e.k+1)); note(e.t, `POD2R button: next command slot will carry ${hex2(R2.pend)} (${e.sum!=null?'01 sum':'10 000 '+((e.k+1)>>>0).toString(2).padStart(3,'0')+' select audio '+(e.k+1)})`, 'in'); }
      else if (e.type==='power'){ if (e.on && !W.power){ W.power = true; bootAt = e.t; rec('power', e.t, 1); note(e.t, 'Mains on: VAF1005 +5 V rises; the PIC is held in reset by the power-up timer (config bits unknown: 72 ms PWRT assumed)', 'boot'); }
        else if (!e.on && W.power){ W.power = false; alive = false; rec('power', e.t, 0); rec('PORTD', e.t, -1); rec('sel', e.t, 0); note(e.t, 'Mains off: all rails collapse, audio stops', 'boot'); } }
      else if (e.type==='btn'){ note(e.t, `${BTN_NAME(e.k)} ${e.src==='gpi'?'closed on the GPI header P4':'pressed on the front panel'} — pin ${BTN_PIN(e.k)} pulled low${e.src==='gpi'?'':' (with contact bounce, '+'inferred'+')'}`, 'in'); }
    }
  }
  function portD(t, v){   // output_led: sets the 1-bits (bit 7→0), then clears the 0-bits (bit 7→0): 2 Tcy per bit
    const old = V.PORTD; let cur = old;
    for (let b=7;b>=0;b--){ if ((v>>b)&1){ cur |= (1<<b); rec('PORTD', t + (2*(7-b)+2)*TCY, cur); rec('sel', t + (2*(7-b)+2)*TCY, (~cur)&0x3F); } }
    for (let b=7;b>=0;b--){ if (!((v>>b)&1)){ cur &= ~(1<<b); rec('PORTD', t + (16+2*(7-b)+2)*TCY, cur); rec('sel', t + (16+2*(7-b)+2)*TCY, (~cur)&0x3F); } }
    V.PORTD = v & 255;
    const gap = ((old & ~v) & 0x3F) && ((~old & v) & 0x3F);
    return gap;
  }
  function fresh(t){
    V = {}; VARS.forEach(k=>V[k]=0);
    Object.assign(V, {pre_output:0xFE, bcount:0xFE, video:0xFF, spi_tran_count:C.SPI_TRAN, spi_rec_count:C.SPI_REC, RC0:1, PORTD:0xFF});
    portD(t, 0xFE);
    rec('RC0', t, 1);
    tmrStart = t; tmrNext = t + C.T2;
    ssp = { out:0x00, inPend:false, in:0, ov:0 }; rcFifo = []; txBusyUntil = -1e9;
  }
  const sspExchange = (te)=>{     // one byte each way at the POD9's clock
    const out = ssp.out, inn = pod9Byte();
    if (ssp.inPend){ ssp.ov++; } else { ssp.in = inn; ssp.inPend = true; }
    spiX.push({t:te, mosi:inn, miso:out});
    if (D.p9fw==='v102' && !P9.slave){ P9.slave = true; rec('p9slave', te, 1); note(te, 'POD9 V102 SPI_master: <span class="mono">bcf pre_output,5</span> on every exchange → slave ON again', 'pod9'); }   // V102 only
    pod9Rx(out, te);
  };
  function service(t){            // everything outside the PIC up to time t
    if (P9.pendSel && P9.pendSel.t <= t){ const k = P9.pendSel.k; P9.pendSel = null; P9.sel = k; rec('p9sel', t, k); if (P9.slave) P9.cmdLeft = 32; note(t, `POD9 switches to video input ${k+1}${P9.slave?' and, being in slave mode, sends the change as a command (bit 7 = 0) in its next 32 data slots':' (slave off: status bytes only)'}`, 'pod9'); }
    while (W.pod9 && P9.next <= t){ if (W.power && alive) sspExchange(P9.next); else spiX.push({t:P9.next, mosi:pod9Byte(), miso:null}); P9.next += C.SPI_T; }
    while (W.pod2r && R2.next <= t){ const b = remoteByte(); const t0 = Math.max(R2.next, rxQ.length ? rxQ[rxQ.length-1].tEnd : -1e9); rxQ.push({t0, tEnd:t0+C.BYTE, b, src:'pod2r'}); rxF.push({t0, b, src:'pod2r'}); R2.next += C.T2; }
    while (rxQ.length && rxQ[0].tEnd <= t){ const r = rxQ.shift(); if (W.power && alive){ if (rcFifo.length < 2) rcFifo.push(r.b); else note(r.tEnd, 'RCREG FIFO full: OERR', 'uart'); } }
  }

  /* ---- the firmware, routine by routine (pod2v200.asm) ---- */
  function runPass(t0, n){
    const cyc = new Array(ROUT.length).fill(0); let c = 0;
    const at = ()=> t0 + c*TCY;
    const step = (i, cost)=>{ cyc[i] = cost; c += cost; };
    step(0, 1);                                         // clrwdt
    step(1, 22);                                        // re_init
    /* input */
    service(at());
    V.input_reg = 0xFF; let ic = 29;
    for (let i=0;i<SCAN.length;i++){ const [bit] = SCAN[i]; if (pinLowAt(bit, at())){ V.input_reg &= ~(1<<bit); ic = 2 + 7 + 3*i; break; } }
    step(2, ic);
    /* debounce */
    let dc = 4;
    if (!(V.rel_flag & 1)){
      dc = 18;
      if (V.input_reg === 0xFF) V.bcount = 0x71;
      else { if (V.bcount === C.DEB){ V.bounce = V.input_reg; dc += 6; } if (V.input_reg !== V.bounce) V.bcount = 0x71; dc += 4; }
      V.bcount = (V.bcount - 1) & 255;
      if (V.bcount === 0){ V.bcount = C.DEB; V.rel_flag |= 1; V.input_flag |= 3; V.spi_tran_count = C.SPI_TRAN; V.remote_flag = 0; dc += 9;
        note(at(), `pass ${n}: debounce — input_reg ${hex2(V.input_reg)} stable for 0x70 = 112 passes (${(112*IDLE*TCY*1e3).toFixed(1)} ms) → rel_flag,0 and input_flag,0/1 set; spi_tran_count = 0x20; remote_flag cleared`, 'deb'); }
    }
    step(3, dc);
    /* router */
    let rc = 11;
    if (V.input_flag & 1){
      V.input_flag &= ~1; let w = V.input_reg; const old = V.pre_output; let how;
      if (!(V.pre_output & 0x40) || !(V.input_reg & 0x40)){ V.comp_reg = (w ^ V.pre_output) & 255; w = (~V.comp_reg) & 255; how = !(old & 0x40) ? 'mix (SUM is on): xorwf pre_output, comf → the pressed bit toggles' : 'SUM pressed: mix path toggles bit 6 on'; }
      else how = 'no_mix: pre_output = input_reg (one of six)';
      V.pre_output = w; const g = portD(at()+8*TCY, w); rc = 11 + 44;
      note(at(), `pass ${n}: router — ${how}: pre_output ${hex2(old)} → ${hex2(w)} → output_led drives PORTD = ${bin8(w)}b${g?' (break-before-make: the old RD bit goes high ≈'+(14*TCY*1e6).toFixed(0)+' µs before the new one goes low)':''}`, 'route');
    } else if (V.remote_flag & 1){
      const old = V.pre_output; V.pre_output = V.spi_reg; portD(at()+10*TCY, V.spi_reg); V.remote_flag &= ~1; rc = 11 + 42;
      note(at(), `pass ${n}: router next_route0 — remote_flag,0 (slave port): pre_output ${hex2(old)} → spi_reg ${hex2(V.spi_reg)} → PORTD`, 'route');
    } else if (V.remote_flag & 2){
      const old = V.pre_output; V.pre_output = V.recieved_reg; portD(at()+12*TCY, V.recieved_reg); V.remote_flag &= ~2; rc = 11 + 44;
      note(at(), `pass ${n}: router next_route1 — remote_flag,1 (RS-422): pre_output ${hex2(old)} → recieved_reg ${hex2(V.recieved_reg)} → PORTD`, 'route');
    }
    step(4, rc);
    /* debounce_rel */
    let drc = 5;
    if (V.rel_flag & 1){
      drc = 14;
      if (V.input_reg !== 0xFF) V.bcount = 0x71;
      V.bcount = (V.bcount - 1) & 255;
      if (V.bcount === 0){ V.bcount = C.DEB; V.rel_flag &= ~1; drc += 4; note(at(), `pass ${n}: debounce_rel — all buttons up for 112 passes → rel_flag,0 cleared; the next press can count`, 'deb'); }
    }
    step(5, drc);
    /* recieve_uart */
    service(at());
    let ruc = 5;
    if (rcFifo.length){ V.recieved_reg = rcFifo.shift(); V.transmit_flag |= 3; ruc = 14; rec('rcv', at(), V.recieved_reg); }
    step(6, ruc);
    /* reset_uart */
    let rsc = 5; if ((V.transmit_flag & 3) === 3){ V.transmit_flag &= ~2; rsc = 17; }
    step(7, rsc);
    /* translate_uart */
    step(8, translate(at(), n));
    /* transmit_uart */
    let txc = 7;
    if (at() >= txBusyUntil){
      txc = 13;
      if (V.RC0){ V.RC0 = 0; rec('RC0', at()+4*TCY, 0); }
      if (V.transmit_flag & 1){
        V.transmit_flag &= ~1; V.RC0 = 1; rec('RC0', at()+8*TCY, 1);
        const ts = at() + 10*TCY; txBusyUntil = ts + C.BYTE; txF.push({t0:ts, b:V.transmit_reg}); txc = 18;
        note(ts, `pass ${n}: transmit_uart — TRMT = 1 → RC0 (DS75176 driver enable) high, TXREG = ${hex2(V.transmit_reg)} (${bin8(V.transmit_reg)}b) out on pins 3/8`, 'uart');
        if (W.pod2r){ R2.bytes.push({t:ts+C.BYTE, b:V.transmit_reg}); }
      }
    }
    step(9, txc);
    /* SPI_trns_cntrl */
    step(10, spiTrns(at(), n));
    /* SPI_slave */
    service(at());
    let ssc = 5;
    if (ssp.inPend){ ssp.inPend = false; V.video_flag |= 1; V.spi_recieved = ssp.in; ssp.out = V.spi_output; V.spi_flag |= 1; ssc = 16; }
    step(11, ssc);
    /* SPI_rcv_ctrl */
    step(12, spiRcv(at(), n));
    /* timer_check */
    let tcc = 7;
    if (at() >= tmrNext){
      tmr.push(tmrNext); tmrNext = at() + 7*TCY + C.T2; tcc = 17;
      if (V.video_flag & 1) V.video_flag &= ~1;
      else { if (V.video !== 0xFF) note(at(), `pass ${n}: timer_check — TMR2IF and no slave-port byte for 53.3 ms → video = 0xFF (status byte 1 will read 80: "POD9 not present")`, 'spi'); V.video = 0xFF; }
    }
    step(13, tcc);
    return {cyc, c};
  }
  function spiSetup(w){ V.spi_output_temp = w & 0x7F; V.spi_output = 0xF0; V.remote_flag |= 0x0C; }
  function translate(t, n){
    if (V.which_flag & 1){ V.transmit_flag |= 1; V.which_flag &= ~1; V.transmit_reg = (~V.pre_output) & 0x7F;
      note(t, `pass ${n}: translate_uart send_audio — 2nd reply byte = ~pre_output, bit 7 cleared = ${hex2(V.transmit_reg)} (POD2 status: bit 6 SUM, bits 5–0 inputs 6–1)`, 'uart'); return 16; }
    if (!(V.transmit_flag & 1)) return 7;
    const r = V.recieved_reg;
    if (r === 0xF0){ V.uart_flag |= 0x80; V.transmit_flag &= ~1; note(t, `pass ${n}: translate_uart — F0 address byte: uart_flag,7 set, no reply`, 'uart'); return 16; }
    if (!(V.uart_flag & 0x80)){ note(t, `pass ${n}: translate_uart — ${hex2(r)} without a preceding F0: ignored, but transmit_flag,0 stays set, so transmit_uart re-sends the old transmit_reg ${hex2(V.transmit_reg)} (Findings F5)`, 'warn'); return 16; }
    V.uart_flag &= ~0x80;
    const status = ()=>{ V.which_flag |= 1; V.transmit_reg = ((~V.video) & 0xFF) | 0x80; };
    const take = (val)=>{ V.recieved_reg = val & 255; V.remote_flag |= 2; V.remote_flag &= ~1; V.input_flag = 0; };
    let what;
    if (!(r & 0x80)){
      if (!(r & 0x40)){ what = '00xx xxxx → status_check (REQUEST STATUS)'; }
      else { const v = (((~r) & 0xFF) & ~0x40) | 0x80; take(v); spiSetup(V.video); V.spi_output_temp |= 0x40; what = `01xx xxxx → sum_audio: recieved_reg = ~cmd, bit 6 cleared (SUM on), bit 7 set = ${hex2(v)}; spi_uart_setup(video) with bit 6 set → POD9 slave OFF`; }
    } else if (r & 0x40){
      const a = r & 7;
      if (a === 0){ spiSetup(V.video); V.spi_output_temp |= 0x40; what = '11xx x000 → slave_off: spi_uart_setup(video), bit 6 set → POD9 slave indicator OFF (the manual says C0 turns it ON — Findings F1)'; }
      else if (a === 7){ spiSetup(V.video); V.spi_output_temp &= ~0x40; take(V.pre_output | 0x40); what = '11xx x111 → slave_on: spi_uart_setup(video), bit 6 cleared → POD9 slave indicator ON (manual: C7 = OFF)'; }
      else { const x = AUDIO_TABLE[a]; spiSetup(x); V.spi_output_temp &= ~0x40; take(x | 0x40); what = `11xx x${a.toString(2).padStart(3,'0')} → not_on: audio_table(${a}) = ${hex2(x)} → audio input ${a} and POD9 video ${a}, slave ON`; }
    } else {
      if ((r & 0x7F) === 0){ take(V.pre_output | 0x40); what = '1000 0000 → cancel_sum: recieved_reg = pre_output with bit 6 set (SUM off, mix kept)'; }
      else {
        spiSetup(V.video); V.spi_output_temp |= 0x40;
        const vv = (r & 0x38) >> 3, aa = r & 7; const parts = [];
        if (vv){ spiSetup(AUDIO_TABLE[vv]); V.spi_output_temp |= 0x40; parts.push(`video ${vv} → audio_table = ${hex2(AUDIO_TABLE[vv])} queued for POD9 (slave bit 6 set)`); }
        if (aa){ take(AUDIO_TABLE[aa]); parts.push(`audio ${aa} → audio_table = ${hex2(AUDIO_TABLE[aa])}${aa===7?' — code 7 is not in the manual: it selects inputs 2–6 + SUM (Findings F4)':''}`); }
        what = `10vv vaaa → switch: ${parts.join('; ') || 'nothing selected (only the status reply)'}`;
      }
    }
    status();
    note(t, `pass ${n}: translate_uart — command ${hex2(r)} = ${bin8(r)}b: ${what}. status_check: 1st reply byte = ~video | 0x80 = ${hex2(V.transmit_reg)}`, 'uart');
    return 40;
  }
  function spiTrns(t, n){
    if (!(V.spi_flag & 1)) return 5;
    V.spi_flag &= ~1;
    if (V.remote_flag & 8){ V.spi_output = 0xF0; V.remote_flag &= ~8; return 12; }
    if (V.remote_flag & 4){ V.spi_output = V.spi_output_temp; V.remote_flag &= ~4; V.spi_tran_count = (V.spi_tran_count - 1) & 255;
      if (V.spi_tran_count) V.remote_flag |= 0x0C; else { V.spi_tran_count = C.SPI_TRAN; note(t, `pass ${n}: SPI_trns_cntrl — 32nd copy of the RS-422-originated byte sent; spi_tran_count reloaded`, 'spi'); }
      return 18; }
    if (!(V.spi_flag & 2)){ V.spi_flag |= 2; V.spi_output = 0xF0; return 14; }
    V.spi_flag &= ~2; V.spi_output = V.pre_output | 0x80;
    if (!(V.input_flag & 2)) return 18;
    V.spi_tran_count = (V.spi_tran_count - 1) & 255; if (!V.spi_tran_count){ V.input_flag &= ~2; V.spi_tran_count = C.SPI_TRAN; }
    V.spi_output &= 0x7F;
    if (!(V.pre_output & 0x40)){ V.spi_output = (V.video | 0x40) & 0x7F; if (V.spi_tran_count===C.SPI_TRAN-1) note(t, `pass ${n}: SPI_trns_cntrl special_spi — SUM is on: POD2 sends POD9's own video byte with bit 6 set → POD9 drops slave mode (Findings F3)`, 'spi'); return 26; }
    if (V.video & 0x40){ V.spi_output |= 0x80; return 26; }
    V.spi_output &= ~0x40;
    if (V.spi_tran_count===C.SPI_TRAN-1) note(t, `pass ${n}: SPI_trns_cntrl do_spi — local press with POD9 in slave mode: command ${hex2(V.spi_output)} (bit 7 = 0, bit 6 = 0) will go out in the next 32 data slots`, 'spi');
    return 26;
  }
  function spiRcv(t, n){
    if (!(V.spi_flag & 1)) return 5;
    const b = V.spi_recieved;
    if (b === 0xF0){ V.spi_flag |= 4; return 11; }
    if (!(V.spi_flag & 4)){ V.spi_rec_count = C.SPI_REC; V.spi_flag &= ~4; return 13; }
    V.spi_flag &= ~4;
    if (b & 0x80){ const nv = b | 0x80; if (nv !== V.video) note(t, `pass ${n}: SPI_rcv_ctrl — POD9 status ${hex2(b)}: video = ${hex2(nv)} (input ${vidSel(nv)||'—'}, slave ${nv&0x40?'off':'ON'})`, 'spi'); V.video = nv; return 16; }
    V.remote_flag = 0; V.input_flag = 0; V.spi_reg = b;
    V.spi_rec_count = (V.spi_rec_count - 1) & 255;
    if (!V.spi_rec_count){ V.remote_flag |= 1; V.spi_rec_count = C.SPI_REC; V.spi_flag &= ~4;
      note(t, `pass ${n}: SPI_rcv_ctrl no_update — 4th command ${hex2(b)} from POD9 → spi_reg, remote_flag,0: the router follows (audio-follow-video)`, 'spi'); }
    return 22;
  }

  /* ---- run ---- */
  let t = C.PRE;
  applyEvents(t);
  while (t < H && P.n < N){
    applyEvents(t);
    if (!W.power){ service(t); const nt = Math.min(H, ev[ei] ? ev[ei].t : H, W.pod9?P9.next:H, W.pod2r?R2.next:H); t = Math.max(nt, t + 1e-4); continue; }
    if (!alive){
      const ready = bootAt + (bootAt > C.PRE ? C.PWRT + 1024/C.FOSC : 0);
      if (t < ready){ if (bootAt > C.PRE) rec('PORTD', bootAt, -1); service(t); t = Math.min(ready, t + 1e-3); continue; }
      alive = true; fresh(t); if (bootAt > C.PRE) note(t, 'PIC16F874 leaves reset → init: pre_output = 0xFE, output_led → PORTD = 1111 1110b: input 1 selected (no memory of the last selection — Findings F8); USART 9600 8N1, SSPCON = 0x25 (SPI slave, SS off), TMR2 on', 'boot');
      t += 70*TCY;
    }
    const n = P.n; const {cyc, c} = runPass(t, n);
    P.t0[n] = t; for (let i=0;i<ROUT.length;i++) P.cyc[n*ROUT.length+i] = cyc[i];
    const o = n*NV; VARS.forEach((k,i)=>P.snap[o+i] = V[k]|0);
    rec('bcount', t, V.bcount); rec('rel', t, V.rel_flag&1); rec('inflag', t, V.input_flag&3); rec('video', t, V.video); rec('pre', t, V.pre_output);
    P.n++;
    t += c*TCY;
  }
  applyEvents(H); service(H);
  /* POD2R: which LEDs it shows (from the 2nd byte of each reply pair, inferred decode) */
  const r2 = []; R2.bytes.forEach(x=>{ if (!(x.b & 0x80)) r2.push([x.t, x.b & 0x7F]); });
  EMU = { P, sig, notes, rxF, txF, spiX, tmr, r2, final: V ? Object.assign({}, V) : null, P9:{sel:P9.sel, slave:P9.slave}, alive };
  return EMU;
}
function vidSel(v){ for (let i=0;i<6;i++) if (!(v & (1<<i))) return i+1; return 0; }
function idxAt(a, t){ let lo=0, hi=a.length-1; if (!a.length || a[0][0]>t) return -1; while (lo<hi){ const m=(lo+hi+1)>>1; if (a[m][0]<=t) lo=m; else hi=m-1; } return lo; }
function sv(name, t, def){ const a = emulate().sig[name]; if (!a) return def; const i = idxAt(a,t); return i<0 ? def : a[i][1]; }
function passAt(t){ const P=emulate().P; if (!P.n || P.t0[0] > t) return -1; let lo=0, hi=P.n-1; while (lo<hi){ const m=(lo+hi+1)>>1; if (P.t0[m]<=t) lo=m; else hi=m-1; } return lo; }
function passLen(i){ const P=emulate().P; let c=0; for (let k=0;k<ROUT.length;k++) c+=P.cyc[i*ROUT.length+k]; return c; }
function snap(i){ const P=emulate().P; if (i<0) return null; const o={}; VARS.forEach((k,j)=>o[k]=P.snap[i*NV+j]); return o; }
function stepAt(t){
  const P=emulate().P, i = passAt(t); if (i<0) return {pass:-1, step:-1};
  const L = passLen(i); if (t >= P.t0[i] + L*C.TCY + 1e-4) return {pass:i, step:-2};
  let c=0, k=0; for (let j=0;j<ROUT.length;j++){ if (t >= P.t0[i] + c*C.TCY) k=j; c += P.cyc[i*ROUT.length+j]; }
  return {pass:i, step:k};
}
function powerAt(t){ return !!sv('power', t, 0) && sv('PORTD', t, -1) !== -1; }
function portdAt(t){ return sv('PORTD', t, -1); }
function selAt(t){ const p = portdAt(t); return p < 0 ? 0 : (~p) & 0x3F; }
const fin = ()=> emulate().final || {};
const finSel = ()=> { const f = fin(); return f.pre_output==null ? 0 : (~f.pre_output) & 0x3F; };
const finSum = ()=> fin().pre_output!=null && !(fin().pre_output & 0x40);
const listSel = m => { const a=[]; for (let i=0;i<6;i++) if (m & (1<<i)) a.push(i+1); return a; };

/* ---------------- analog audio (unity per input, summing amp) ---------------- */
const vpk = dbu => 0.7746*Math.SQRT2*Math.pow(10, dbu/20);
function outAt(t, side){   // differential output volts at time t
  const m = selAt(t); if (!m || !powerAt(t)) return 0;
  let v = 0; for (let k=0;k<6;k++) if (m & (1<<k)){ const s = D.src[k]; if (!s.on) continue; const f = s.f*(side?1.25:1); v += vpk(s.dbu)*Math.sin(2*Math.PI*f*t); }
  const lim = 2*C.RAIL; return Math.max(-lim, Math.min(lim, v));
}
function levelOf(m){   // RMS (power sum of unrelated tones) and peak sum
  let p = 0, pk = 0; for (let k=0;k<6;k++) if (m & (1<<k)){ const s=D.src[k]; if (!s.on) continue; const v=vpk(s.dbu); p += v*v/2; pk += v; }
  return { dbu: p>0 ? 20*Math.log10(Math.sqrt(p)/0.7746) : -Infinity, clip: pk > 2*C.RAIL, pk };
}

/* ---------------- user actions (what the buttons do in code) ---------------- */
function act(name, fn){
  const tr = []; const t = SIM.t;
  fn(s=>tr.push(s));
  EMU_KEY = ''; const E = emulate();
  const later = E.notes.filter(n=> n.t >= t - 1e-9 && n.t <= t + 0.6 && n.cls!=='in');
  later.slice(0, 18).forEach(n=> tr.push(`<span class="muted">+${SIM.fmtDur(Math.max(0,n.t-t))}</span> ${n.txt}`));
  if (t > 0.85) tr.push('<span class="tag-inf">Late in the second:</span> the emulator runs to 2 s, so the result is in the goal/state checks but past the right edge of the timeline.');
  D.log.unshift({t, name, trace:tr}); if (D.log.length>50) D.log.length=50;
  SIM.refresh();
}
function stateAt(key, t){ let v = D.init[key]; D.events.filter(e=>e.type===key && e.t<=t).forEach(e=>v=e.on); return v; }
const A = {
  btn(k, src){ src = src||'front'; act(`${src==='gpi'?'GPI':'Press'} ${BTN_NAME(k)}`, tr=>{
    if (!powerAt(SIM.t)) tr('The unit is off (or still in reset): nothing happens.');
    tr(`${src==='gpi'?'GPI header P4 pin '+(k===6?1:k+3)+' to GND (pin 9)':'TS-1 tactile switch'} pulls ${BTN_PIN(k)} low through ${k===6?'R63':'332 Ω'} for ${C.PRESS*1000} ms (${inf}); 3K32 pull-up to +5 V. No interrupt: input polls the pin once per pass.`);
    D.events.push({t:SIM.t, type:'btn', k, dur:C.PRESS, src, user:true}); }); },
  power(){ const on = !!sv('power',SIM.t,0); act(on?'Power switch off':'Power switch on', tr=>{ tr(on?'Rocker off: VAF1005 output collapses.':'Rocker on: VAF1005 5 V → PIC (power-up timer), FB2 → SUW1R5-1212 → ±12 V for the NE5532s.'); D.events.push({t:SIM.t, type:'power', on:!on, user:true}); }); },
  send(bytes, label){ act(`RS-422 send ${bytes.map(hx).join(' ')}${label?' ('+label+')':''}`, tr=>{
    tr(`Bytes arrive on CONTROL pins 7/2 (RX+/RX−) → R5/R6 10 Ω → U1 DS75176 → RC7, ${(C.BYTE*1e3).toFixed(3)} ms each (start + 8 data + stop at 9600 baud).`);
    let t = SIM.t; bytes.forEach(b=>{ D.events.push({t, type:'rx', b, src:'console', user:true}); t += C.BYTE; }); }); },
  pod9(on){ act(on?'Connect a POD9 to the slave port':'Disconnect the POD9', tr=>{ tr('P3 is a 4-pin internal header (Slave Port Picture.jpg): SCK, SDI, SDO through R2–R4 30 Ω, GND (pin order '+inf+').'); D.events.push({t:SIM.t, type:'pod9', on, user:true}); }); },
  pod9btn(k){ act(k===6?'POD9: SLAVE button':'POD9: press '+(k+1), tr=>{ if (!stateAt('pod9',SIM.t)) tr('No POD9 is connected: connect it first.'); D.events.push({t:SIM.t, type:'pod9btn', k, user:true}); }); },
  p9fw(f){ act(`POD9 firmware → ${f==='v102'?'V102 (16C73A)':'16F73 build'}`, tr=>{ D.p9fw=f; EMU_KEY='';
    tr(f==='v102'?'#V102/pod9v102.asm (1 Mar 2004, “for POD2 remote with POD2 and POD9”): the RA1 (“check mix”) read is commented out, so the SLAVE button does nothing, and SPI_master does bcf pre_output,5 at every exchange: slave is forced ON, and a POD2 command that turns it off lasts one exchange (3.3 ms)':'#V100/pod9v102.asm (9 Mar 2004, V1.01 converted to the PIC16F73): RA1 is read, so SLAVE toggles; SPI_master leaves pre_output bit 5 alone'); }); },
  pod2r(on){ act(on?'Plug in a POD2R remote':'Unplug the POD2R', tr=>{ tr('POD2R (pod2r200.asm) shares the RS-422 pins: it polls F0, 00 and shows the reply on its LEDs.'); D.events.push({t:SIM.t, type:'pod2r', on, user:true}); }); },
  remote(k){ act('POD2R: press '+(k+1), tr=>{ if (!stateAt('pod2r',SIM.t)) tr('No POD2R is plugged in.'); tr(`The remote sends 10 000 ${(k+1).toString(2).padStart(3,'0')} in its next command slot (video field shown as 000: the remote's video handling is not modelled, ${inf}).`); D.events.push({t:SIM.t, type:'remote', k, user:true}); }); },
  src(k, prop, v){ D.src[k][prop] = v; D.log.unshift({t:SIM.t, name:`IN ${k+1} ${prop==='on'?(v?'source connected':'source removed'):prop==='dbu'?'level '+v+' dBu':'tone '+v+' Hz'}`, trace:['Analog only: TB → H'+(k+2)+' → 20 kΩ / 68 µF per leg → 74HC4053 → summing node. The firmware is not involved.']}); SIM.refresh(); },
  scenario(id){ loadScenario(id); D.log.unshift({t:0, name:'Scenario: '+SCEN[id].name, trace:['Events replaced; the emulator re-ran pod2v200.asm from −0.25 s to 2 s.']}); SIM.refresh(); },
  clear(){ D.events = D.events.filter(e=>!e.user); EMU_KEY=''; D.log.unshift({t:SIM.t, name:'Cleared your actions', trace:['Back to the scenario events only.']}); SIM.refresh(); },
};
window.__pod2Keys = false;
document.addEventListener('keydown', e=>{
  if (!window.__pod2Keys || !/[?&]plugin=pod2(&|$)/.test(location.search) || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k>='1' && k<='6'){ A.btn(+k-1); e.preventDefault(); } else if (k==='s'){ A.btn(6); e.preventDefault(); }
});

/* ================================================================
   DRAWING: front and rear panel on the real silkscreen
   ================================================================ */
/* Built on POD2 - #ARTWORK #DA #2016/POD2-FRONT&REAR-SILK (CURVE).pdf (sheet dated Jun.19/14). tools/silk_extract.py cut the
   FRONT GREEN, FRONT WHITE and REAR WHITE separations at 200 dpi between the crop marks (x 304–2018; y 136–457 / 562–883 /
   1066–1387) → 1714 × 321 px = 8.57" × 1.606" at 200 px/in, exactly the panel size on the ISS 2 / ISS 5 drawings.
   Drill crosshairs (front white): SUM (480,162), IN1–IN6 (780 + 150k, 162), screws (556/1005/1455, 162), power LED (299,218).
   Front ISS 2: rocker .505 × .770 at x .900 / y .950 → (180,131) 101 × 154 px; .406" punched holes = 81 px.
   Rear ISS 5: TB windows x 1.393–1.843 and 2.245–4.825, y .144–1.019; DE9 .465 × .768 at 5.885 / 1.043; inlet detail C
   1.256 × 1.080 at 7.415 / .703. Crosshairs on the rear silk (254,112) (991,112) (1079,209) (1276,209) land on the
   4-40 holes of the drawing to within 1 px. */
const ASSET = 'siumulation-plugins/assets/';
/* Panel artwork 2026|59: CorelDRAW sheet converted with Inkscape (libcdr) → assets/pod2-front.svg and rear SVG(s)
   (ink plates coloured green rgb(52,168,83) / white rgb(240,240,236), cut-outs as dark holes, drill crosshairs faint;
   registered to the older PNG silks to ±1 px so every control keeps its place). The PNGs stay on a toggle. */
const ART = {cdr:true};
const ART_CDR = '#POD #SERIES/POD2 - #Master/POD2 - #ARTWORK #DA #2016/POD2-FRONT&REAR-SILK (CURVE).cdr';
function artNote(){ return `<div class="small muted" style="margin-top:4px">Panel artwork: ${SIM.src(ART_CDR, ART_CDR.split('/').pop())} (CorelDRAW, default) · <label><input type="checkbox" class="pod2-art" ${ART.cdr?'':'checked'}> show the older PNG silks (cut from ${SIM.src('#POD #SERIES/POD2 - #Master/POD2 - #ARTWORK #DA #2016/POD2-FRONT&REAR-SILK (CURVE).pdf','the PDF')})</label></div>`; }
document.addEventListener('change', e=>{ if (e.target && e.target.classList && e.target.classList.contains('pod2-art')){ ART.cdr = !e.target.checked; SIM.refresh(); } });
const BX = [780, 930, 1080, 1230, 1380, 1530], SUMX = 480, BY = 162;
function frontSVG(t, opts){
  opts = opts||{};
  const pwr = !!sv('power',t,0), alive = powerAt(t), pd = portdAt(t);
  const lit = k => alive && pd>=0 && !((pd>>k)&1);
  const down = k => pinLowAt(k, t);
  const btn = (x, k, label)=>{ const on = lit(k===6?6:k), d = down(k);
    return `<g class="p2b" data-k="${k}" style="cursor:pointer"><title>${label} (click${k===6?' or press S':' or press '+(k+1)}) — ${BTN_PIN(k)}, PORTD bit ${k}</title>
      <circle cx="${x}" cy="${BY}" r="40.5" fill="#050606" stroke="#2a2d30" stroke-width="2"/>
      <circle cx="${x}" cy="${BY}" r="${d?28:30}" fill="${d?'#0d0e0f':'#17191b'}" stroke="#34383c" stroke-width="2.5"/>
      <circle cx="${x}" cy="${BY}" r="9" fill="${on?'#ff3326':'#3a2624'}" ${on?'filter="url(#p2glow)"':''}/>
      ${on?`<circle cx="${x-2.5}" cy="${BY-2.5}" r="3.2" fill="#fff" opacity=".7"/>`:''}</g>`; };
  const screw = (x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#26292c" stroke="#3b3f43"/><path d="M${x-r*.6} ${y}h${r*1.2}M${x} ${y-r*.6}v${r*1.2}" stroke="#0c0d0e" stroke-width="2.4"/>`;
  return `<svg viewBox="0 0 1714 321" role="img" aria-label="POD2 front panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <defs><filter id="p2glow" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1714" height="321" rx="8" fill="#141517"/>
    ${ART.cdr ? `<image href="${ASSET}pod2-front.svg" width="1714" height="321"/>` : `<image href="${ASSET}pod2-front-green.png" width="1714" height="321"/>
    <image href="${ASSET}pod2-front-white.png" width="1714" height="321"/>`}
    ${screw(51,161,12)}${screw(1664,161,12)}${screw(556,162,13)}${screw(1005,162,13)}${screw(1455,162,13)}
    <g class="p2pwr" style="cursor:pointer"><title>Power rocker (click)</title><rect x="129" y="54" width="101" height="154" rx="6" fill="#0b0c0d" stroke="#2d3033" stroke-width="2"/>
      <rect x="140" y="${pwr?66:118}" width="79" height="78" rx="6" fill="#1c1e21" stroke="#3a3e42"/><rect x="146" y="${pwr?72:186}" width="67" height="8" rx="3" fill="#2b2e31"/></g>
    <circle cx="299" cy="218" r="13" fill="#060707"/><circle cx="299" cy="218" r="9.5" fill="${pwr?'#c8ff5a':'#252b1c'}" ${pwr?'filter="url(#p2glow)"':''}><title>PWR LED (Dialight 551-0207F, R90 511 Ω from +5 V)</title></circle>
    ${btn(SUMX, 6, 'SUM')}
    ${BX.map((x,k)=>btn(x, k, 'INPUT '+(k+1))).join('')}
    ${opts.hot||''}
  </svg>`;
}
/* rear: two rows of 18 Phoenix-style terminals (top LEFT, bottom RIGHT — row assignment inferred from the OUTPUT labels) */
const TBX0 = 449, TBP = 516/18;
function rearSVG(t){
  const alive = powerAt(t), m = selAt(t), pod2r = stateAt('pod2r', t);
  const term = (x, y, hot)=>`<rect x="${x-13}" y="${y}" width="26" height="80" fill="${hot?'#2fb36b':'#26a35f'}" stroke="#1a6f40"/><circle cx="${x}" cy="${y+18}" r="8" fill="#b9c2bd" stroke="#6e7a74"/><path d="M${x-5} ${y+18}h10" stroke="#59625d" stroke-width="2.5"/><rect x="${x-7}" y="${y+46}" width="14" height="16" fill="#0d3a22"/>`;
  let tb = '';
  for (let r=0;r<2;r++){
    const y = 33 + r*86;
    tb += `<rect x="${TBX0}" y="${y-2}" width="${TBP*18}" height="84" fill="#1d8a50" rx="2"/>`;
    for (let i=0;i<18;i++){ const k = Math.floor(i/3); tb += term(TBX0 + TBP*(i+0.5), y, m & (1<<k)); }
  }
  for (let k=0;k<6;k++){ const s = D.src[k]; tb += `<g class="p2src" data-k="${k}" style="cursor:pointer"><title>IN ${k+1}: ${s.on?'source '+s.dbu+' dBu, '+s.f+' Hz (click to remove)':'no source (click to connect)'}</title><rect x="${TBX0+TBP*3*k+2}" y="29" width="${TBP*3-4}" height="176" fill="transparent" stroke="${s.on?'none':'#ff6a5a'}" stroke-width="3" stroke-dasharray="8 5"/></g>`; }
  let ob = ''; for (let r=0;r<2;r++){ const y = 33 + r*86; ob += `<rect x="279" y="${y-2}" width="90" height="84" fill="#1d8a50" rx="2"/>`; for (let i=0;i<3;i++) ob += term(294+30*i, y, alive && m); }
  const lv = levelOf(m);
  return `<svg viewBox="0 0 1714 321" role="img" aria-label="POD2 rear panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <rect width="1714" height="321" rx="8" fill="#141517"/>${ART.cdr ? `<image href="${ASSET}pod2-rear.svg" width="1714" height="321"/>` : ''}
    ${tb}${ob}
    <g class="p2ctl" style="cursor:pointer"><title>CONTROL DE9F (RS-422): click to ${pod2r?'unplug':'plug in'} a POD2R remote</title>
      <rect x="1100" y="160" width="154" height="93" rx="10" fill="#9aa3a8" stroke="#c9d0d4" stroke-width="3"/>
      <path d="M1118 178 h118 l-10 58 h-98 z" fill="#1a1c1e" stroke="#5c6266" stroke-width="2"/>
      ${[0,1,2,3,4].map(i=>`<circle cx="${1137+i*20}" cy="195" r="4" fill="#cfd5d8"/>`).join('')}${[0,1,2,3].map(i=>`<circle cx="${1147+i*20}" cy="217" r="4" fill="#cfd5d8"/>`).join('')}
      ${pod2r?'<rect x="1112" y="170" width="130" height="74" rx="8" fill="#3b3f43" opacity=".85"/><text x="1177" y="214" text-anchor="middle" font-size="18" fill="#e8ece9">POD2R</text>':''}
      <circle cx="1079.5" cy="209.5" r="13" fill="#c1c8cc" stroke="#7d868a"/><circle cx="1276.5" cy="209.5" r="13" fill="#c1c8cc" stroke="#7d868a"/></g>
    <g><title>IEC inlet with fuse drawer (detail C, 1.256" × 1.080")</title><rect x="1357" y="33" width="252" height="216" rx="10" fill="#0c0d0e" stroke="#2f3337" stroke-width="3"/>
      <rect x="1372" y="48" width="70" height="186" rx="4" fill="#17191b" stroke="#33373b"/><rect x="1390" y="80" width="34" height="120" rx="3" fill="#0f1011" stroke="#2b2e31"/>
      <path d="M1460 60 h130 v120 l-30 40 h-70 l-30 -40 z" fill="#050606" stroke="#2c2f32" stroke-width="2"/>
      <rect x="1488" y="85" width="10" height="34" fill="#c9cdd0"/><rect x="1555" y="85" width="10" height="34" fill="#c9cdd0"/><rect x="1521" y="140" width="10" height="34" fill="#c9cdd0"/></g>
    ${ART.cdr ? '' : `<image href="${ASSET}pod2-rear-white.png" width="1714" height="321"/>`}
    ${[[254,112],[991,112],[51,161],[1664,161]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="11" fill="#2a2d30" stroke="#3d4145"/><path d="M${x-7} ${y}h14M${x} ${y-7}v14" stroke="#0c0d0e" stroke-width="2.4"/>`).join('')}
    <text x="324" y="22" text-anchor="middle" font-size="15" fill="${lv.clip?'#ff6a5a':'#9fe3b8'}" font-family="ui-monospace,monospace">${alive && m ? (isFinite(lv.dbu)?lv.dbu.toFixed(1)+' dBu':'—')+(lv.clip?' CLIP':'') : 'silent'}</text>
  </svg>`;
}
function bindPanel(root){
  root.querySelectorAll('.p2b').forEach(g=>g.addEventListener('click', ()=>A.btn(+g.dataset.k)));
  root.querySelectorAll('.p2pwr').forEach(g=>g.addEventListener('click', ()=>A.power()));
  root.querySelectorAll('.p2src').forEach(g=>g.addEventListener('click', ()=>{ const k=+g.dataset.k; A.src(k,'on',!D.src[k].on); }));
  root.querySelectorAll('.p2ctl').forEach(g=>g.addEventListener('click', ()=>A.pod2r(!stateAt('pod2r', SIM.t))));
}

/* ---------------- side panels: RS-422 console, slave port, sources ---------------- */
const PRESETS = [
  ['F0 00','Request status'],['F0 81','Select audio 1'],['F0 83','Select audio 3'],['F0 86','Select audio 6'],['F0 9A','Audio 2 + video 3'],
  ['F0 61','SUM 1 + 6'],['F0 7F','SUM all six'],['F0 80','Cancel SUM'],['F0 C0','Slave: C0'],['F0 C7','Slave: C7'],['F0 C4','AFV input 4'],['F0 87','Audio code 7 (undocumented)'],['5A','Stray byte (no F0)'],
];
function consoleHTML(){
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:5px">${PRESETS.map(([h,l])=>`<button class="p2pre" data-h="${h}" title="${l}"><span class="mono">${h}</span> <span class="muted">${l}</span></button>`).join('')}</div>
    <div style="display:flex;gap:6px;margin-top:6px;align-items:center"><label class="small">Hex bytes <input id="p2hex" class="mono" style="width:130px;font:inherit;padding:4px 6px;border:1px solid var(--line);border-radius:6px;background:var(--panel2);color:var(--ink)" value="${D.hex}"></label><button id="p2send">Send</button>
    <label class="small"><input type="checkbox" id="p2r" ${stateAt('pod2r',SIM.t)?'checked':''}> POD2R remote on the port</label></div>`;
}
function bindConsole(root){
  root.querySelectorAll('.p2pre').forEach(b=>b.onclick=()=>A.send(b.dataset.h.split(' ').map(x=>parseInt(x,16)), b.title));
  const go = ()=>{ const v = root.querySelector('#p2hex').value; D.hex = v; const bs = v.trim().split(/[\s,]+/).map(x=>parseInt(x,16)).filter(x=>x>=0 && x<=255); if (bs.length) A.send(bs); };
  root.querySelector('#p2send').onclick = go; root.querySelector('#p2hex').onkeydown = e=>{ if (e.key==='Enter') go(); };
  root.querySelector('#p2r').onchange = e=>A.pod2r(e.target.checked);
}
function slaveHTML(t){
  const on = stateAt('pod9', t), E = emulate(), sel = sv('p9sel', t, D.init.pod9sel), sl = sv('p9slave', t, (D.p9fw==='v102'||D.init.pod9slave)?1:0);
  const r2on = stateAt('pod2r', t); const r2 = E.r2; let rl = null; for (const x of r2){ if (x[0] <= t) rl = x[1]; else break; }
  return `<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start">
    <div><label class="small"><input type="checkbox" id="p2p9" ${on?'checked':''}> POD9 video switcher on slave port P3</label>
      <div style="display:flex;gap:4px;margin-top:6px;align-items:center;${on?'':'opacity:.45'}"><span class="small muted">POD9</span>
      ${[0,1,2,3,4,5].map(k=>`<button class="p2v" data-k="${k}" style="min-width:34px;${on&&sel===k?'background:#d33a2c;color:#fff;border-color:#d33a2c':''}">${k+1}</button>`).join('')}
      <button class="p2v" data-k="6" style="${on&&sl?'background:#d9a531;color:#111;border-color:#d9a531':''}">SLAVE</button></div>
      <div class="small" style="margin-top:4px"><label>POD9 firmware <select id="p2p9fw"><option value="v102" ${D.p9fw==='v102'?'selected':''}>V102 (#V102, 16C73A): SLAVE button dead, slave forced on</option><option value="f73" ${D.p9fw==='f73'?'selected':''}>16F73 build (#V100): SLAVE button toggles</option></select></label></div>
      <div class="small muted" style="margin-top:4px">POD9 is the SPI master (pod9v102.asm). Red = its video input, amber = slave (audio-follow-video) on.</div></div>
    <div><div class="small"><b>POD2R remote</b> ${r2on?'':'<span class="muted">(not plugged in)</span>'}</div>
      <div style="display:flex;gap:4px;margin-top:6px;${r2on?'':'opacity:.45'}">${[0,1,2,3,4,5].map(k=>`<button class="p2rm" data-k="${k}" style="min-width:34px;${r2on&&rl!=null&&(rl>>k)&1?'background:#d33a2c;color:#fff;border-color:#d33a2c':''}">${k+1}</button>`).join('')}
      <span class="small muted" style="align-self:center">${r2on?(rl==null?'waiting for a reply…':'LEDs from reply byte 2 = '+hex2(rl)+(rl&0x40?' (SUM)':'')):''}</span></div></div></div>`;
}
function bindSlave(root){
  const c = root.querySelector('#p2p9'); if (c) c.onchange = e=>A.pod9(e.target.checked);
  const fw = root.querySelector('#p2p9fw'); if (fw) fw.onchange = e=>A.p9fw(e.target.value);
  root.querySelectorAll('.p2v').forEach(b=>b.onclick=()=>A.pod9btn(+b.dataset.k));
  root.querySelectorAll('.p2rm').forEach(b=>b.onclick=()=>A.remote(+b.dataset.k));
}
function sourcesHTML(){
  return `<table class="kv"><tr><th>Input</th><th>source</th><th>level (dBu)</th><th>tone (L; R = ×1.25)</th></tr>${D.src.map((s,k)=>`<tr><td>IN ${k+1}</td><td><input type="checkbox" class="p2so" data-k="${k}" ${s.on?'checked':''}></td>
    <td><input type="number" class="p2sl" data-k="${k}" value="${s.dbu}" min="-40" max="30" step="1" style="width:70px"></td><td><input type="number" class="p2sf" data-k="${k}" value="${s.f}" min="20" max="20000" step="10" style="width:84px"> Hz</td></tr>`).join('')}</table>`;
}
function bindSources(root){
  root.querySelectorAll('.p2so').forEach(i=>i.onchange=()=>A.src(+i.dataset.k,'on',i.checked));
  root.querySelectorAll('.p2sl').forEach(i=>i.onchange=()=>A.src(+i.dataset.k,'dbu',Math.max(-40,Math.min(30,+i.value))));
  root.querySelectorAll('.p2sf').forEach(i=>i.onchange=()=>A.src(+i.dataset.k,'f',Math.max(20,Math.min(20000,+i.value))));
}

/* ---------------- timeline lanes ---------------- */
function drawSig(c, X, t0, t1, y, h, name, colOf, txtOf, def){
  const a = emulate().sig[name] || []; let i = Math.max(0, idxAt(a, t0));
  const segs = []; if (!a.length || a[0][0] > t0) segs.push([t0, def]);
  for (; i<a.length && a[i][0] <= t1; i++) segs.push([Math.max(a[i][0], t0), a[i][1]]);
  segs.forEach((s,j)=>{ const e = j+1<segs.length ? segs[j+1][0] : t1; const xa=X(s[0]), xb=X(e); const col = colOf(s[1]); if (col){ c.fillStyle=col; c.fillRect(xa, y+4, Math.max(1,xb-xa), h-8); }
    if (txtOf && xb-xa > 34){ c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); const tx = txtOf(s[1]); c.save(); c.beginPath(); c.rect(xa,y,xb-xa,h); c.clip(); c.fillText(tx, xa+4, y+h/2+4); c.restore(); } });
}
function drawUart(c, X, t0, t1, y, h, frames, col){
  const pxBit = X(t0 + 1/C.BAUD) - X(t0);
  const ink = SIM.css('--ink');
  const vis = frames.filter(f=> f.t0 + C.BYTE >= t0 && f.t0 <= t1);
  if (pxBit < 1.2){ vis.forEach(f=>{ c.fillStyle = f.src==='pod2r' ? SIM.css('--accent2') : col; c.fillRect(X(f.t0), y+5, Math.max(1.5, X(f.t0+C.BYTE)-X(f.t0)), h-10); });
    let lastX = -1e9; vis.forEach(f=>{ const x = X(f.t0); if (x - lastX > 22){ c.fillStyle=ink; c.font='10px '+SIM.css('--mono'); c.fillText(hx(f.b), x+2, y+h-2); lastX = x; } }); return; }
  c.strokeStyle = col; c.lineWidth = 1.5; c.beginPath(); let px = X(t0), py = y+5; c.moveTo(px, py);
  vis.forEach(f=>{ const bits = [0]; for (let b=0;b<8;b++) bits.push((f.b>>b)&1); bits.push(1);
    bits.forEach((v,i)=>{ const xa = X(f.t0 + i/C.BAUD), yy = v ? y+5 : y+h-9; c.lineTo(xa, py); c.lineTo(xa, yy); py = yy; }); const xe = X(f.t0+C.BYTE); c.lineTo(xe, py); c.lineTo(xe, y+5); py = y+5; });
  c.lineTo(X(t1), py); c.stroke();
  vis.forEach(f=>{ c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`${hx(f.b)}${f.src?' '+f.src:''}`, X(f.t0)+3, y+h-1); });
}
function lanes(){
  const E = emulate(), P = E.P, acc = SIM.css('--accent'), acc2 = SIM.css('--accent2'), warn = SIM.css('--warn'), bad = SIM.css('--bad'), ink2 = SIM.css('--ink2'), grid = SIM.css('--grid');
  return [
    { label:'PIC16F874 main-loop passes', h:26, draw(c,X,t0,t1,y,h){
        const i0 = Math.max(0, passAt(t0)), i1 = passAt(t1); if (i1 < 0) return;
        const px = X(t0 + IDLE*C.TCY) - X(t0);
        if (px < 2){ c.fillStyle=acc; c.globalAlpha=.25; c.fillRect(X(Math.max(t0,P.t0[i0])), y+7, X(t1)-X(Math.max(t0,P.t0[i0])), h-14); c.globalAlpha=1;
          c.fillStyle=warn; for (let i=i0;i<=i1;i++){ if (passLen(i) > IDLE+12) c.fillRect(X(P.t0[i]), y+4, 1.5, h-8); }
          c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(`${(i1-i0+1).toLocaleString()} passes (≈112 µs idle; orange = a pass that did work)`, X(t0)+6, y+h/2+4); return; }
        for (let i=i0;i<=i1;i++){ const a = P.t0[i], L = passLen(i); let cc = 0;
          for (let k=0;k<ROUT.length;k++){ const w = P.cyc[i*ROUT.length+k]; const xa = X(a + cc*C.TCY), xb = X(a + (cc+w)*C.TCY);
            c.fillStyle = w > ROUT[k][1] ? warn : (k%2 ? acc : acc2); c.globalAlpha = w > ROUT[k][1] ? .9 : .45; c.fillRect(xa, y+4, Math.max(.5, xb-xa-.5), h-8); c.globalAlpha=1;
            if (xb - xa > 60){ c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText(ROUT[k][0], xa+2, y+h/2+3); }
            cc += w; }
          if (px > 40){ c.fillStyle=ink2; c.font='9px '+SIM.css('--mono'); c.fillText('#'+i, X(a)+2, y+10); } } } },
    { label:'Button pins (RA2–4, RE0–2, RA0) raw', h:30, draw(c,X,t0,t1,y,h){
        const ks = [...new Set(D.events.filter(e=>e.type==='btn').map(e=>e.k))]; if (!ks.length){ c.fillStyle=ink2; c.font='11px '+SIM.css('--sans'); c.fillText('all high (no button pressed)', X(t0)+6, y+h/2+4); return; }
        const N = 700, rows = ks.length, rh = (h-4)/rows;
        ks.forEach((k,r)=>{ const yy = y+2+r*rh; c.fillStyle=bad; for (let j=0;j<N;j++){ const ta = t0+(t1-t0)*j/N; if (pinLowAt(k, ta)) c.fillRect(X(ta), yy+1, Math.max(1,(X(t1)-X(t0))/N+.5), rh-2); }
          c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText(BTN_PIN(k)+' '+BTN_NAME(k), X(t0)+4, yy+rh-2); }); } },
    { label:'bcount (debounce, 0x70 → 0)', h:34, draw(c,X,t0,t1,y,h){
        const a = E.sig.bcount||[]; let i = Math.max(0, idxAt(a,t0)); c.strokeStyle=acc; c.lineWidth=1.4; c.beginPath(); let first=true, lv=a[i]?a[i][1]:0x70;
        const Yv = v => y+h-3 - Math.min(0x72, v)/0x72*(h-6);
        for (; i<a.length && a[i][0]<=t1; i++){ const x = X(Math.max(t0,a[i][0])); if (first){ c.moveTo(x, Yv(a[i][1])); first=false; } else { c.lineTo(x, Yv(lv)); c.lineTo(x, Yv(a[i][1])); } lv = a[i][1]; }
        c.lineTo(X(t1), Yv(lv)); c.stroke(); } },
    { label:'rel_flag,0 · input_flag (bits 0/1)', h:24, draw(c,X,t0,t1,y,h){
        drawSig(c,X,t0,t1,y,h/2+2,'rel', v=>v?warn:null, v=>v?'rel_flag':'' , 0);
        drawSig(c,X,t0,t1,y+h/2-2,h/2+2,'inflag', v=>v?acc:null, v=>v?'input_flag '+v.toString(2).padStart(2,'0'):'', 0); } },
    { label:'pre_output → PORTD (RD7…RD0)', h:26, draw(c,X,t0,t1,y,h){
        drawSig(c,X,t0,t1,y,h,'PORTD', v=>v<0?grid:(v&0x40?acc2:warn), v=>v<0?'reset (pins floating)':`${hx(v)} · ${listSel((~v)&0x3F).join('+')||'none'}${v&0x40?'':' SUM'}`, -1); } },
    { label:'74HC4053 controls (input on bus)', h:42, draw(c,X,t0,t1,y,h){
        const rh = (h-4)/6; for (let k=0;k<6;k++){ const yy = y+2+k*rh; drawSig(c,X,t0,t1,yy-4,rh+8,'sel', v=> (v>>k)&1 ? '#d33a2c' : null, null, 0); c.fillStyle=ink2; c.font='9px '+SIM.css('--mono'); c.fillText('IN'+(k+1), X(t0)+2, yy+rh-1); } } },
    { label:'OUT LEFT (balanced, summed)', h:44, draw(c,X,t0,t1,y,h){
        const N = 900, lim = 2*C.RAIL; c.strokeStyle=SIM.css('--ink'); c.lineWidth=1; c.beginPath();
        for (let j=0;j<=N;j++){ const ta=t0+(t1-t0)*j/N, v = outAt(ta,0), yy = y+h/2 - v/lim*(h/2-3); j?c.lineTo(X(ta),yy):c.moveTo(X(ta),yy); } c.stroke();
        c.strokeStyle=grid; c.beginPath(); c.moveTo(X(t0), y+h/2); c.lineTo(X(t1), y+h/2); c.stroke(); } },
    { label:'RS-422 RX → RC7 (CONTROL 7/2)', h:30, draw(c,X,t0,t1,y,h){ drawUart(c,X,t0,t1,y,h,E.rxF, acc); } },
    { label:'RS-422 TX ← RC6 (3/8) · RC0 enable', h:34, draw(c,X,t0,t1,y,h){
        drawSig(c,X,t0,t1,y-3,10,'RC0', v=>v?warn:null, null, 0);
        drawUart(c,X,t0,t1,y+4,h-4,E.txF.map(f=>({t0:f.t0,b:f.b})), warn); } },
    { label:'Slave port SPI (POD9 clocks, 3.33 ms)', h:30, draw(c,X,t0,t1,y,h){
        const vis = E.spiX.filter(s=>s.t>=t0-1e-5 && s.t<=t1); if (!vis.length){ c.fillStyle=ink2; c.font='11px '+SIM.css('--sans'); c.fillText(stateAt('pod9',t0)?'':'no SCK (nothing on P3)', X(t0)+6, y+h/2+4); return; }
        const dx = vis.length>1 ? X(vis[1].t)-X(vis[0].t) : 999; const w8 = 8*C.TCY;
        vis.forEach(s=>{ const xa = X(s.t), xb = Math.max(xa+1.5, X(s.t+w8)); c.fillStyle = s.mosi===0xF0 ? ink2 : (s.mosi&0x80 ? acc2 : bad); c.fillRect(xa, y+4, xb-xa, h-8);
          if (dx > 70){ c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText(`in ${hx(s.mosi)} out ${s.miso==null?'--':hx(s.miso)}`, xb+3, y+h/2+3); } }); } },
    { label:'video (POD9 status held in POD2)', h:24, draw(c,X,t0,t1,y,h){
        drawSig(c,X,t0,t1,y,h,'video', v=>v===0xFF?grid:(v&0x40?acc2:'#d9a531'), v=>v===0xFF?'FF · no POD9':`${hx(v)} · V${vidSel(v)}${v&0x40?'':' · SLAVE'}`, 0xFF); } },
    { label:'TMR2IF (53.3 ms timeout)', h:20, draw(c,X,t0,t1,y,h){ c.fillStyle=acc2; E.tmr.forEach(tt=>{ if (tt>=t0 && tt<=t1) c.fillRect(X(tt), y+3, 2, h-6); }); } },
    { label:'POD9: video input · slave', h:24, draw(c,X,t0,t1,y,h){
        if (!E.spiX.length && !stateAt('pod9',t0)){ c.fillStyle=ink2; c.font='11px '+SIM.css('--sans'); c.fillText('no POD9 attached', X(t0)+6, y+h/2+4); return; }
        drawSig(c,X,t0,t1,y,h/2+3,'p9sel', v=>'#d33a2c', v=>'POD9 V'+(v+1), 0); drawSig(c,X,t0,t1,y+h/2-3,h/2+3,'p9slave', v=>v?'#d9a531':null, v=>v?'slave':'', 0); } },
  ];
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ const l=D.log[0]; return l ? `<div><b>${l.name}</b> at ${SIM.fmtT(l.t)}</div>` + l.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Press a button (or keys 1–6, S), send an RS-422 command, or connect a POD9. The code path the emulator took is listed here with the time after your action.</div>'; }
function scenarioHTML(){ return `<label class="small">Scenario <select class="p2scn">${Object.keys(SCEN).map(k=>`<option value="${k}" ${k===D.scenario?'selected':''}>${SCEN[k].name}</option>`).join('')}</select></label> <button class="p2clr">Clear my actions</button>`; }
function bindScenario(m){ m.querySelectorAll('.p2scn').forEach(s=>s.onchange=e=>A.scenario(e.target.value)); m.querySelectorAll('.p2clr').forEach(b=>b.onclick=()=>A.clear()); }
function inspectorHTML(t){
  const st = stepAt(t), sn = st.pass>=0 ? snap(st.pass) : null, pd = portdAt(t), m = selAt(t), lv = levelOf(m), vid = sv('video',t,0xFF);
  const alive = powerAt(t);
  return `<table class="kv">
    <tr><th>Power</th><td class="mono">${!sv('power',t,0)?'OFF':!alive?'in reset (power-up timer, '+inf+')':'running'}</td></tr>
    <tr><th>Main-loop pass</th><td class="mono">${!alive||st.pass<0?'—':'#'+st.pass.toLocaleString()+' · '+(ROUT[st.step]||['—'])[0]+' · '+passLen(st.pass)+' Tcy = '+SIM.fmtDur(passLen(st.pass)*C.TCY)}</td></tr>
    <tr><th>pre_output / PORTD</th><td class="mono">${sn?hex2(sn.pre_output)+' = '+bin8(sn.pre_output)+'b':'—'} → ${pd<0?'floating':hex2(pd)}</td></tr>
    <tr><th>Audio on the bus</th><td class="mono">${m?listSel(m).map(k=>'IN'+k).join(' + '):'nothing'}${pd>=0&&!(pd&0x40)?' · SUM mode':''}</td></tr>
    <tr><th>Output level</th><td class="mono">${alive&&m&&isFinite(lv.dbu)?lv.dbu.toFixed(1)+' dBu (power sum)'+(lv.clip?' — <b style="color:var(--bad)">peaks clip at ±'+(2*C.RAIL).toFixed(0)+' V</b> ('+inf+')':''):'—'}</td></tr>
    <tr><th>input_reg · bcount</th><td class="mono">${sn?hex2(sn.input_reg)+' · '+hex2(sn.bcount)+' ('+sn.bcount+')':'—'}</td></tr>
    <tr><th>rel / input / remote flags</th><td class="mono">${sn?`${sn.rel_flag&1} / ${bin8(sn.input_flag).slice(6)} / ${bin8(sn.remote_flag).slice(4)}`:'—'}</td></tr>
    <tr><th>UART</th><td class="mono">${sn?`recieved_reg ${hex2(sn.recieved_reg)} · uart_flag,7 ${sn.uart_flag>>7&1} · transmit_reg ${hex2(sn.transmit_reg)} · RC0 ${sn.RC0}`:'—'}</td></tr>
    <tr><th>Slave port</th><td class="mono">${sn?`spi_output ${hex2(sn.spi_output)} · spi_reg ${hex2(sn.spi_reg)} · spi_rec_count ${sn.spi_rec_count} · spi_tran_count ${sn.spi_tran_count}`:'—'}</td></tr>
    <tr><th>video (from POD9)</th><td class="mono">${hex2(vid)} ${vid===0xFF?'(no POD9)':'· V'+vidSel(vid)+(vid&0x40?' · slave off':' · SLAVE on')}</td></tr>
  </table>`;
}
function viewSim(m){
  window.__pod2Keys = true;
  m._k1 = m._k2 = m._k3 = null;
  m.innerHTML = `
  <div class="grid2">
    <div>
      ${card('Front panel at the playhead — click the buttons (keys 1–6, S)', `<div id="fp"></div>`)}
      ${card('Rear panel — click an input block to add/remove its source; click CONTROL to plug a POD2R', `<div id="rp"></div>${artNote()}`)}
      ${card('RS-422 CONTROL port (9600 8N1, address F0)', `<div id="con"></div>`)}
      ${card('Slave port P3 and remote', `<div id="slv"></div>`)}
    </div>
    <div>
      ${card('What the firmware did (emulated, last action)', `<div style="margin-bottom:6px">${scenarioHTML()}</div><div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
      ${card('Sources on the input terminals', `<div id="srcs"></div>`)}
    </div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek; transport above)', `<canvas id="tl"></canvas>
    <p class="small muted">Every pass of <span class="mono">main</span> is emulated with the firmware's own registers. A pass costs the cycles of the path it takes: 138 Tcy (112.3 µs at 4.9152 MHz) when idle, counted from the listing; the extra cycles of busy paths are counted to within a few cycles (${inf} for the exact figure). Zoom to 400 µs to see the routines inside a pass, to 40 µs to see output_led's break-before-make.</p>`)}
  ${card('Action log', `<div id="log" class="log"></div>`)}`;
  const draw = ()=>{
    const t = SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t); m.querySelector('#rp').innerHTML = rearSVG(t);
    bindPanel(m.querySelector('#fp')); bindPanel(m.querySelector('#rp'));
    const k1 = JSON.stringify([stateAt('pod2r',t), D.hex]); if (k1!==m._k1){ m._k1=k1; m.querySelector('#con').innerHTML = consoleHTML(); bindConsole(m.querySelector('#con')); }
    m.querySelector('#slv').innerHTML = slaveHTML(t); bindSlave(m.querySelector('#slv'));
    const k3 = JSON.stringify(D.src); if (k3!==m._k3){ m._k3=k3; m.querySelector('#srcs').innerHTML = sourcesHTML(); bindSources(m.querySelector('#srcs')); }
    m.querySelector('#insp').innerHTML = inspectorHTML(t);
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220});
  };
  bindScenario(m);
  SIM.on('time', draw);
}

/* ---------------- tutorial ---------------- */
const userEv = type => D.events.filter(e=>e.user && e.type===type);
const LESSONS = [
  { title:'Meet the POD2', body:`<p>The POD2 is a half-rack <b>unity-gain 6×1 stereo audio switcher</b> (manual, ${Y(2006)} print). Six balanced stereo sources come in on the rear screw terminals; one balanced stereo output goes out.</p>
     <p>Front: power rocker and green power LED, the <b>SUM</b> button and six <b>INPUT SELECT</b> buttons, each with a red LED inside. Rear: OUTPUT (LEFT/RIGHT), IN 1–6, the <b>CONTROL</b> DE9 for RS-422 and the mains inlet.</p>
     <p>Inside, a PIC16F874 runs a polling loop roughly 8 900 times a second; it drives twelve 74HC4053 analog switches that put each input onto a summing amplifier.</p><p class="muted">Hover over the panels. Click “Next”.</p>`, check:()=>true, auto:true },
  { title:'1 · Pick a source', body:`<p>Press button <b>3</b> on the front panel (or key 3). In one-of-six mode the new input replaces the old one: <span class="mono">router</span> takes the <span class="mono">no_mix</span> path and copies <span class="mono">input_reg</span> to <span class="mono">pre_output</span>.</p><p><b>Goal:</b> input 3 alone on the output.</p>`, check:()=> userEv('btn').some(e=>e.k===2) && finSel()===0b000100 && !finSum(), hint:'Click the button labelled 3, keeping the playhead in the first part of the second.' },
  { title:'2 · Watch the debounce', body:`<p>The button is not acted on at once. <span class="mono">debounce</span> needs <b>112 passes in a row</b> with the same pattern (<span class="mono">bcount</span> from 0x70 to 0, about 12.6 ms). Contact bounce restarts the count.</p>
     <p>Set the zoom window to <b>20 ms</b> and put the playhead inside the countdown of your press (the falling ramp on the “bcount” lane).</p><p><b>Goal:</b> the playhead is in a pass with a button held and bcount between 1 and 0x6F.</p>`, check:()=>{ const s = stepAt(SIM.t); const sn = s.pass>=0 ? snap(s.pass) : null; return !!sn && sn.input_reg!==0xFF && !(sn.rel_flag&1) && sn.bcount>0 && sn.bcount<0x70; }, hint:'Zoom 20 ms, then drag the slider to 100–113 ms if you used the default scenario.' },
  { title:'3 · SUM mode', body:`<p>Press <b>SUM</b>, then <b>2</b> and <b>4</b>. In SUM mode each numbered button <i>toggles</i> its input (<span class="mono">mix</span>: <span class="mono">xorwf pre_output</span>, <span class="mono">comf</span>), so several sources play at once through the summing amplifier.</p><p><b>Goal:</b> SUM lit and inputs 2 and 4 both on.</p>`, check:()=> finSum() && (finSel()&0b001010)===0b001010, hint:()=>`Now: ${finSum()?'SUM on':'SUM off'}, inputs ${listSel(finSel()).join('+')||'none'}. Wait for the release debounce (≈13 ms) between presses.` },
  { title:'4 · Back to one of six', body:`<p>The manual: “press the SUM button first and then the numbered button of the desired selection.” Press <b>SUM</b>: its LED goes out but the mix <i>stays</i> on the output. Then press <b>5</b>: <span class="mono">no_mix</span> selects input 5 alone.</p><p><b>Goal:</b> SUM off, input 5 alone.</p>`, check:()=> !finSum() && finSel()===0b010000 && D.events.some(e=>e.type==='btn' && e.k===6), hint:'SUM, then 5.' },
  { title:'5 · Ask for status over RS-422', body:`<p>Send <b>F0 00</b> (REQUEST STATUS) from the CONTROL-port console. POD2 answers with two bytes: <b>1xxx xxxx</b> = the POD9's status (80 if none) and <b>0xxx xxxx</b> = its own (bit 6 SUM, bits 5–0 inputs 6–1).</p><p><b>Goal:</b> POD2 transmitted a reply to your request.</p>`, check:()=> userEv('rx').length>0 && emulate().txF.some(f=> f.t0 >= Math.min(...userEv('rx').map(e=>e.t))), hint:'Click the “F0 00 Request status” button, then look at the RS-422 TX lane.' },
  { title:'6 · Switch from a remote', body:`<p>Send <b>F0 85</b>: command <span class="mono">10 000 101</span> = “switch audio 5, leave video alone”. <span class="mono">translate_uart</span> looks the number up in <span class="mono">audio_table</span>, sets <span class="mono">remote_flag,1</span> and the router copies <span class="mono">recieved_reg</span> to the outputs on the next pass.</p><p><b>Goal:</b> input 5 selected by an RS-422 command.</p>`, check:()=> finSel()===0b010000 && userEv('rx').some(e=>e.b===0x85), hint:'Type F0 85 in the hex box and press Send.' },
  { title:'7 · Remote SUM', body:`<p>Send <b>F0 61</b> = <span class="mono">01 100001</span>: SUM inputs 6 and 1. Then try <b>F0 80</b> (cancel SUM): the mix stays but the SUM bit is cleared, exactly as with the front button.</p><p><b>Goal:</b> SUM on with inputs 1 and 6 from RS-422.</p>`, check:()=> finSum() && finSel()===0b100001, hint:'Use the preset “F0 61 SUM 1 + 6”.' },
  { title:'8 · Audio follows video', body:`<p>Tick <b>POD9 video switcher on slave port P3</b>, make sure its <b>SLAVE</b> is lit (amber), then press <b>POD9 4</b>. POD9 sends the change as a command four times… and on the 4th command <span class="mono">SPI_rcv_ctrl</span> sets <span class="mono">remote_flag,0</span> and POD2 switches too (≈27 ms after POD9 acts).</p><p><b>Goal:</b> POD9 on video 4 and POD2 on audio 4.</p>`, check:()=> emulate().P9.sel===3 && finSel()===0b001000, hint:'Connect the POD9 first; the slave-port lane shows the bytes.' },
  { title:'9 · Video follows audio', body:`<p>Now press <b>6</b> on the POD2 front panel. With POD9 in slave mode (<span class="mono">video,6 = 0</span>) <span class="mono">do_spi</span> sends <span class="mono">pre_output</span> as a command (bits 7 and 6 cleared) in the next 32 data slots; POD9 needs 8.</p><p><b>Goal:</b> POD9 follows to video 6.</p>`, check:()=> emulate().P9.sel===5 && finSel()===0b100000, hint:'POD9 must stay in slave mode. Look at the “POD9: video input” lane.' },
  { title:'10 · Check the manual against the code', body:`<p>The manual says “the Slave indicator on POD9 may be turned on by sending F0, C0 and turned off by F0, C7”. Send <b>F0 C0</b> with the POD9 attached and in slave mode, and watch its SLAVE light.</p><p><b>Goal:</b> after your F0 C0, POD9's slave mode goes <i>off</i> — the code (<span class="mono">slave_off</span>) does the opposite of the manual. With the default POD9 V102 it is off for one 3.3 ms exchange only, because V102's <span class="mono">SPI_master</span> forces slave back on (zoom the “POD9: video input · slave” lane); with the 16F73 build it stays off.</p>`, check:()=>{ const ts=userEv('rx').filter(e=>e.b===0xC0).map(e=>e.t); return ts.length && stateAt('pod9',C.HORIZON) && (emulate().sig.p9slave||[]).some(([t,v])=>v===0 && t>=Math.min(...ts)); }, hint:'POD9 connected, SLAVE on, then send F0 C0.' },
  { title:'Done', body:`<p>You have used every control of the POD2. <b>Software</b> follows the main loop and decodes the protocol live, <b>One second, frame by frame</b> breaks the second down into passes, UART bits and SPI exchanges, and <b>Findings</b> lists what the firmware does that the manual does not say.</p>`, check:()=>true, auto:true },
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__pod2Keys = true;
  m._k1 = null;
  m.innerHTML = `<div class="grid2">
    <div>${card('Tutorial — operating the POD2 (from the manual and the firmware)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>
      ${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The unit at the playhead', `<div id="fp"></div><div id="rp" style="margin-top:8px"></div><div id="lv" class="small mono" style="margin-top:6px"></div>`)}
      ${card('RS-422 console', `<div id="con"></div>`)}${card('Slave port', `<div id="slv"></div>`)}
      ${card('Timeline', `<canvas id="tl"></canvas>`)}</div></div>`;
  const hot = `<g><rect x="120" y="45" width="200" height="200" fill="transparent"><title>Power rocker and power LED</title></rect>
    <rect x="430" y="110" width="100" height="105" fill="transparent"><title>SUM: toggles summing mode (mix path in router)</title></rect>
    <rect x="730" y="70" width="850" height="150" fill="transparent" style="pointer-events:none"><title>INPUT SELECT 1–6</title></rect></g>`;
  const draw = ()=>{
    const t=SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t,{hot}); m.querySelector('#rp').innerHTML = rearSVG(t);
    bindPanel(m.querySelector('#fp')); bindPanel(m.querySelector('#rp'));
    const k1 = JSON.stringify([stateAt('pod2r',t), D.hex]); if (k1!==m._k1){ m._k1=k1; m.querySelector('#con').innerHTML = consoleHTML(); bindConsole(m.querySelector('#con')); }
    m.querySelector('#slv').innerHTML = slaveHTML(t); bindSlave(m.querySelector('#slv'));
    const lv = levelOf(selAt(t)); m.querySelector('#lv').textContent = `On the bus: ${listSel(selAt(t)).join(' + ')||'nothing'} · OUT ${isFinite(lv.dbu)&&powerAt(t)?lv.dbu.toFixed(1)+' dBu':'—'} · state at 2 s: ${listSel(finSel()).join('+')||'none'}${finSum()?' SUM':''}`;
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L = LESSONS[lessonIdx]; let ok = false; try { ok = L.check(); } catch(e){ ok = false; } const hint = typeof L.hint==='function' ? L.hint() : L.hint;
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ resetAll(); lessonIdx=0; SIM.seek(0.05); };
    SIM.drawLanes(m.querySelector('#tl'), lanes().filter((l,i)=>[1,2,4,7,8,9,12].includes(i)), {labelW:200});
  };
  SIM.on('time', draw);
}
function resetAll(){ loadScenario('idle'); D.src = SRC0(); D.log = []; D.hex = 'F0 00'; }

/* ---------------- one second, frame by frame ---------------- */
function viewAnatomy(m){
  window.__pod2Keys = true;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">
    ${card('As seen by the device', `<div id="dev"></div>`)}
    ${card('As seen by the displays and the listener', `<div id="fp"></div><h3>Output meter (downstream)</h3><canvas id="meter"></canvas><p class="small muted">Quasi-peak of OUT L/R over the last 10 ms, −40 … +28 dBu (${inf} meter ballistics). The LEDs are driven straight from PORTD (no multiplexing): they change in the same microseconds as the audio switches.</p>`)}
  </div>
  ${card('Zoom ladder at the playhead — OUT LEFT', `<canvas id="zl"></canvas>`)}`;
  const draw = ()=>{
    const t=SIM.t, E=emulate(), P=E.P;
    let n0 = 0, busy = 0; for (let i=0;i<P.n;i++){ if (P.t0[i]>=0 && P.t0[i]<1){ n0++; if (passLen(i)>IDLE+12) busy++; } }
    const rx = E.rxF.filter(f=>f.t0>=0&&f.t0<1).length, tx = E.txF.filter(f=>f.t0>=0&&f.t0<1).length, sx = E.spiX.filter(s=>s.t>=0&&s.t<1).length;
    const rows = [
      ['Instruction cycles (Tcy)', '1 228 800', SIM.fmtDur(C.TCY), '4.9152 MHz crystal X1 ÷ 4'],
      ['Main-loop passes (this second)', n0.toLocaleString(), '112.3 µs idle', `${busy} of them took a long path (router, UART or SPI work); idle = 138 Tcy (${inf} exact busy counts)`],
      ['Button debounce', '—', '112 passes ≈ 12.6 ms', 'bcount 0x70 → 0, again on release (debounce_rel)'],
      ['TMR2IF (video timeout)', (1/C.T2).toFixed(2), SIM.fmtDur(C.T2), 'T2CON = 0xFF: 16 × 256 × 16 Tcy'],
      ['Slave-port SPI bytes', sx ? sx.toLocaleString() : '0 (no POD9)', SIM.fmtDur(C.SPI_T), 'POD9 timer_check 1:1 × 256 × 16; F0 header + data → 150 pairs/s'],
      ['SPI bit clock (POD9 master, Fosc/4)', '1 228 800 while clocking', SIM.fmtDur(C.TCY), '8 bits = 6.5 µs per exchange'],
      ['RS-422 bytes in / out (this second)', rx+' / '+tx, SIM.fmtDur(C.BYTE), '9600 baud, 10 bits per byte'],
      ['RS-422 bit', '9 600', SIM.fmtDur(1/C.BAUD), 'SPBRG = 7, BRGH = 0'],
      ['POD2R poll (if plugged in)', (1/(2*C.T2)).toFixed(2)+' requests', SIM.fmtDur(2*C.T2), 'one byte per remote TMR2 tick: F0, then 00'],
      ['output_led break-before-make', 'per switch', SIM.fmtDur(14*C.TCY), 'bits set first (old input off), then cleared (new input on)'],
      ['Audio: input coupling corner', '—', '0.117 Hz', '20 kΩ × 68 µF tantalum (C8–C31)'],
      ['Audio: summing-amp roll-off', '—', '589 kHz', '10 kΩ ∥ 27 pF (C32–C37)'],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>where it comes from</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">The audio itself never touches the PIC: it is analog from terminal to terminal. What the firmware decides is only <i>which</i> 74HC4053 switches are closed. Use <b>Step</b> on the transport to move one pass, one RS-422 bit or one SPI byte at a time.</p>`;
    const st=stepAt(t), sn = st.pass>=0?snap(st.pass):null, lastRx = E.rxF.filter(f=>f.t0<=t).slice(-1)[0], lastSpi = E.spiX.filter(s=>s.t<=t).slice(-1)[0];
    let bitTxt = '—'; if (lastRx && t < lastRx.t0 + C.BYTE){ const bi = Math.floor((t-lastRx.t0)*C.BAUD); bitTxt = `byte ${hx(lastRx.b)}: ${bi===0?'start bit':bi===9?'stop bit':'data bit '+(bi-1)+' = '+((lastRx.b>>(bi-1))&1)}`; }
    m.querySelector('#dev').innerHTML = `<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>PIC16F874</th><td class="mono">${!powerAt(t)?'off / reset':st.step>=0?'pass #'+st.pass.toLocaleString()+': '+ROUT[st.step][0]+'<br><span class="muted">'+ROUT[st.step][2]+'</span>':'—'}</td></tr>
      <tr><th>Instruction</th><td class="mono">${st.pass>=0 && powerAt(t)?'Tcy '+Math.floor((t-E.P.t0[st.pass])/C.TCY)+' of '+passLen(st.pass):'—'}</td></tr>
      <tr><th>RX line (RC7)</th><td class="mono">${bitTxt}</td></tr>
      <tr><th>Last SPI exchange</th><td class="mono">${lastSpi?`${SIM.fmtDur(t-lastSpi.t)} ago: POD9 → ${hx(lastSpi.mosi)}, POD2 → ${lastSpi.miso==null?'--':hx(lastSpi.miso)}`:'none'}</td></tr>
      <tr><th>Registers</th><td class="mono">${sn?`pre_output ${hex2(sn.pre_output)} · bcount ${sn.bcount} · video ${hex2(sn.video)}`:'—'}</td></tr></table>`;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    const {c,w:W} = SIM.canvas(m.querySelector('#meter'), 70);
    [0,1].forEach(sd=>{ let pk=0; for (let i=0;i<96;i++) pk=Math.max(pk,Math.abs(outAt(t-0.01*i/96, sd)));
      const db = pk>0 ? 20*Math.log10(pk/Math.SQRT2/0.7746) : -99, segs=34, lit=Math.max(0,Math.min(segs,Math.round((db+40)/68*segs)));
      for (let s=0;s<segs;s++){ const x=10+s*(W-20)/segs; const col = s>=segs-4?'#e3453a':s>=segs-11?'#e8b23a':'#3fbf5f'; c.fillStyle = s<lit?col:SIM.css('--grid'); c.fillRect(x, 6+sd*30, (W-20)/segs-2, 22); }
      const xm = 10 + (44/68)*(W-20); c.fillStyle=SIM.css('--ink'); c.fillRect(xm-1, 2+sd*30, 2, 30);
      c.font='11px '+SIM.css('--mono'); c.fillText((sd?'R ':'L ')+(db>-99?db.toFixed(1)+' dBu':'—'), 12, 21+sd*30); });
    drawLadder(m.querySelector('#zl'), t);
  };
  SIM.on('time', draw);
}
function drawLadder(cv, t){
  const levels = [['1 second',1],['100 ms',0.1],['10 ms (≈ debounce)',0.01],['1 ms (one RS-422 byte)',0.001],['112 µs (one pass)',IDLE*C.TCY],['20 µs (output_led)',2e-5]];
  const H = levels.length*44+10, {c,w} = SIM.canvas(cv, H);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), play=SIM.css('--play'), grid=SIM.css('--grid');
  const lim = 2*C.RAIL;
  levels.forEach(([nm,span],i)=>{
    const y=8+i*44, t0=Math.max(0,Math.min(1-span,t-span/2));
    c.fillStyle=ink; c.font='12px '+SIM.css('--sans'); c.fillText(nm,6,y+14); c.fillStyle=ink2; c.font='10px '+SIM.css('--sans'); c.fillText('selected: '+(listSel(selAt(t0+span/2)).join('+')||'none'),6,y+28);
    const x0=180, pw=w-x0-10; c.strokeStyle=grid; c.strokeRect(x0,y+2,pw,30);
    c.strokeStyle=acc; c.beginPath(); const N=Math.min(800,pw);
    for (let k=0;k<=N;k++){ const tt=t0+span*k/N; const v=outAt(tt,0); const yy=y+17-v/lim*13; k?c.lineTo(x0+pw*k/N,yy):c.moveTo(x0+pw*k/N,yy); } c.stroke();
    const px=x0+(t-t0)/span*pw; c.strokeStyle=play; c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+34); c.stroke();
    if (i<levels.length-1){ const ns=levels[i+1][1]; const a=x0+(Math.max(0,Math.min(1-ns,t-ns/2))-t0)/span*pw; c.fillStyle=play; c.globalAlpha=.15; c.fillRect(a,y+2,Math.max(2,ns/span*pw),30); c.globalAlpha=1; }
  });
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  tb:{x:20,y:30,w:180,h:120,t:'Input terminals (rear)',s:['IN 1–6 L/R: + − G','SA-POD8-TB board','→ H2–H7 (2×3 Berg)'],d:'Two rows of 18 screw terminals on the SA-POD8-TB sub-assembly (shared with POD8, BOM "SA-POD8-TB (used on POD2)"). Each input reaches the main board on a right-angle 2×3 Berg header H2–H7. The manual gives 40 kΩ balanced input impedance = 2 × 20 kΩ.'},
  cpl:{x:230,y:30,w:180,h:120,t:'Coupling ×24 legs',s:['20 kΩ R9–R32','68 µF/10 V tant. C8–C31','corner 0.117 Hz'],d:'Each leg: a 20 kΩ resistor in series with a 68 µF tantalum (the 1997 drawing used 33 µF). The resistor end sits at virtual earth when switched on, so the capacitor sees only a few mV of DC.'},
  sw:{x:450,y:30,w:190,h:120,t:'74HC4053 ×12 (U4–U15)',s:['2 per stereo input','X → summing bus, Y → GND','select = RDn (low = on)'],d:'Each input has two triple SPDT switches. The common pin of a section takes the 20 kΩ leg; X goes to the summing bus, Y to ground. When an input is off its current is dumped to ground (a T-network: good crosstalk). Because both throws sit at 0 V (virtual earth or ground) a +5 V CMOS switch can route a +30 dBu signal: the voltage swing is across the 20 kΩ, not the switch (current-mode switching). VEE and VSS are grounded.'},
  sum:{x:680,y:30,w:190,h:120,t:'Summing amps U16/U17',s:['NE5532, 10 kΩ ∥ 27 pF','hot and cold buses','gain 0.5 per leg'],d:'U16A sums the + legs (−0.5 × each), U16B sums the − legs plus U16A through R44: its output is +0.5 × (in+ − in−). U17 does the same for the right channel. With N inputs on the bus the outputs simply add (SUM mode).'},
  drv:{x:900,y:30,w:190,h:120,t:'Balanced drivers U18/U19',s:['A: inverter 10k/10k','B: follower','30 Ω build-out R33–R36'],d:'U18A inverts, U18B follows: ±0.5 × Vdiff on each leg = unity gain balanced (manual: “unity gain”, 60 Ω output impedance = 2 × 30 Ω). Rails ±12 V from REG2. Clip level about +25.6 dBu ('+'inferred'+': NE5532 within 1.5 V of ±12 V), below the manual\'s +30 dBu.'},
  out:{x:900,y:190,w:190,h:70,t:'OUTPUT L / R',s:['H1 → rear terminals + − G'],d:'Two 3-pin terminal blocks (LEFT above RIGHT) via header H1.'},
  btn:{x:10,y:190,w:200,h:120,t:'Front panel (SA-POD2-PBB)',s:['7 × TS-1 tactile + red LED','P2 → 332 Ω → RA0–4, RE0–2','3K32 pull-ups'],d:'POD2 pushbutton board: seven TS-1-B6-D6 round tactile switches with red LEDs (BOM). Buttons pull the pins low; LEDs are lit by PORTD through P1 and R67–R74 332 Ω. The internal GPI header P4 (9-pin) is wired in parallel: pin 1 SUM, 3–8 inputs 1–6, 9 GND (POD GPI Connections.pdf).'},
  mcu:{x:230,y:190,w:200,h:150,t:'PIC16F874 (U3)',s:['4.9152 MHz X1','polling loop ≈112 µs','PORTD → switches + LEDs','USART 9600 · SSP slave','no interrupts, no EEPROM use'],d:'PIC16F874-04/PT, MPASM source pod2v200.asm (v200/v201/v202). Everything is polled in main; the interrupt vector is a bare RETFIE. pre_output (active low) is the whole state: bits 0–5 inputs, bit 6 SUM, bit 7 spare. ICSP on H8 (RB3/RB6/RB7).'},
  rs:{x:470,y:220,w:230,h:110,t:'RS-422 (U1, U2 DS75176)',s:['J3 DE9F CONTROL','RX 7/2 → U1 → RC7','RC6 → U2 → TX 3/8, RC0 = enable'],d:'Two DS75176 transceivers, one receiving and one driving, with 10 Ω series resistors R5–R8 and 10 kΩ bias (R50, R51, R53, R54). The driver is enabled by RC0 only while a byte is in flight, so several units can share a line. LK1/LK2 are “DNI” links.'},
  slv:{x:470,y:350,w:230,h:80,t:'Slave port P3 (internal)',s:['SCK/SDI/SDO via 30 Ω R2–R4','POD9 / POD21 / POD30 = SPI master'],d:'A 4-pin internal header (Slave Port Picture.jpg). SSPCON = 0x25: SPI slave with SS disabled, so byte framing depends only on counting clocks; the F0 header byte re-aligns the meaning, not the bits.'},
  psu:{x:10,y:350,w:200,h:90,t:'Power',s:['VAF1005 (+5 V)','FB2 → SUW1R5-1212 → ±12 V','PWR LED via R90 511 Ω'],d:'Universal-input VAF1005 module on the board; five 68 µF tantalums on +5 V. FB2 BLM41P feeds REG2, an isolated SUW1R5-1212 (±12 V for the NE5532s). A 12 V-input converter on a 5 V bus is a mismatch (see Findings).'},
};
const LINKS = [['tb','cpl'],['cpl','sw'],['sw','sum'],['sum','drv'],['drv','out'],['btn','mcu'],['mcu','sw'],['mcu','rs'],['mcu','slv'],['psu','mcu']];
let blockSel = 'mcu';
function viewBlock(m){
  window.__pod2Keys = false;
  m.innerHTML = `${card('Block diagram — click a block (after POD2 - Functional Diagram.cdr, redrawn)', `<div id="bd"></div>`)}${card('Detail', `<div id="bdd"></div>`)}
    <div class="grid2">${card('Mechanical: the panels on their drawings', `<div id="mech"></div>`)}${card('DE-25 ISS 2 — POD21 DB25 adapter plate to suit POD2 rear panel', `<div id="de25"></div>`)}</div>`;
  const draw = ()=>{
    const t = SIM.t, m6 = selAt(t);
    const ctr = b=>[b.x+b.w/2, b.y+b.h/2];
    let s = `<svg viewBox="0 0 1100 450" style="width:100%;max-width:1200px">`;
    LINKS.forEach(([a,b])=>{ const A1=ctr(BLOCKS[a]), B1=ctr(BLOCKS[b]); s += `<line x1="${A1[0]}" y1="${A1[1]}" x2="${B1[0]}" y2="${B1[1]}" stroke="var(--line)" stroke-width="3"/>`; });
    Object.entries(BLOCKS).forEach(([k,b])=>{ const on = k===blockSel; s += `<g class="p2blk" data-k="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="9" fill="var(--panel2)" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?3:1.5}"/>
      <text x="${b.x+10}" y="${b.y+21}" font-size="14" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+10}" y="${b.y+41+i*17}" font-size="11.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; });
    s += `<text x="700" y="185" font-size="12" fill="var(--accent)">bus now: ${listSel(m6).map(x=>'IN'+x).join(' + ')||'—'}</text></svg>`;
    m.querySelector('#bd').innerHTML = s;
    m.querySelectorAll('.p2blk').forEach(g=>g.onclick=()=>{ blockSel=g.dataset.k; draw(); });
    const b = BLOCKS[blockSel]; m.querySelector('#bdd').innerHTML = `<h3 style="margin-top:0">${b.t}</h3><p>${b.d}</p><ul class="small">${b.s.map(x=>`<li>${x}</li>`).join('')}</ul>`;
    m.querySelector('#mech').innerHTML = `<table class="kv"><tr><th>Feature</th><th>Drawing (inches)</th><th>Silk px (÷200)</th></tr>
      <tr><td>Panel</td><td>8.570 × 1.606 (FRONT ISS 2, REAR ISS 5)</td><td>1714 × 321</td></tr>
      <tr><td>Rocker cut-out</td><td>.505 × .770 rect. at x .900, y .950 (from bottom)</td><td>centre (180, 131)</td></tr>
      <tr><td>PWR LED</td><td>.130 dia. at 1.496, .516</td><td>(299, 218) ✓ crosshair</td></tr>
      <tr><td>Buttons</td><td>punch .406 dia. ×7: SUM 2.400; 3.900 + 5 × .750</td><td>480; 780…1530 ✓</td></tr>
      <tr><td>Front screws</td><td>.140 c'sk ×3 at 2.775, 5.025, 7.275; .113 at .251, 8.319</td><td>556, 1005, 1455 ✓</td></tr>
      <tr><td>Rear TB windows</td><td>1.393–1.843 and 2.245–4.825, y .144–1.019 (.875 ref.)</td><td>279–369, 449–965</td></tr>
      <tr><td>TB screws</td><td>.101 ×4 at 1.265 / 4.953, y .556 / 1.019</td><td>(254,112) (991,112) ✓</td></tr>
      <tr><td>CONTROL DE9</td><td>.465 × .768 rect. at 5.885, y 1.043; .130 holes 5.393 / 6.377</td><td>(1079,209) (1276,209) ✓</td></tr>
      <tr><td>Mains inlet</td><td>detail C 1.256 × 1.080 at 7.415, .703 (“changed to new AC plug”, ISS 5 18 Jun 2008)</td><td>centre (1483, 141)</td></tr></table>
      <p class="small muted">Both panel drawings are plotted sideways on letter paper (read rotated upright). Material: .059 CRS (rear, 16 ga.), fine-texture WBS black, silkscreen to artwork #POD2-FRONT&amp;REAR-SILK.</p>`;
    const sc = 160;
    m.querySelector('#de25').innerHTML = `<svg viewBox="0 0 420 170" style="width:100%;max-width:520px">
      <rect x="40" y="40" width="${2.076*sc}" height="${0.48*sc}" fill="#2a2c2e" stroke="var(--ink)" stroke-width="1.5"/>
      <circle cx="${40+0.113*sc}" cy="${40+0.24*sc}" r="${0.089*sc/2}" fill="var(--panel)" stroke="var(--ink)"/><circle cx="${40+1.963*sc}" cy="${40+0.24*sc}" r="${0.089*sc/2}" fill="var(--panel)" stroke="var(--ink)"/>
      <line x1="40" y1="25" x2="${40+2.076*sc}" y2="25" stroke="var(--ink2)"/><text x="${40+1.038*sc}" y="20" text-anchor="middle" font-size="12" fill="var(--ink)">2.076″</text>
      <text x="${40+1.038*sc}" y="${40+0.48*sc+22}" text-anchor="middle" font-size="12" fill="var(--ink)">holes .089 dia. tap 4-40 at .113 and 1.963 (1.850″ apart), y .240</text>
      <text x="${40+1.038*sc}" y="${40+0.48*sc+42}" text-anchor="middle" font-size="12" fill="var(--ink2)">.480″ high · .062 black vinyl-covered aluminium · scale 1:1</text></svg>
      <p class="small">Drawn by E.S. on 15 Apr 2004|37, issue 2 on 28 Oct 2008|41 (“modified to new sketch”). The title says it adapts a <b>POD21 DB25</b> to the POD2 rear panel: POD21 (6×1 SDI switcher) reused this rear panel. The 1.850″ hole spacing is the standard D-sub 25 flange spacing (${inf}); a .480″ strip cannot hold a DB25 shell itself, so it is presumably a backing strip for the jack-screws where the panel's DE9 cut-out is too small (${inf}). Not used on the POD2 itself.</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- schematics (redrawn) ---------------- */
let schSel = 'mcu';
function pinRow(x, y, pin, name, net, side, col){
  const w = side==='L' ? -1 : 1, x2 = x + w*120;
  return `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y}" stroke="${col||'var(--ink2)'}" stroke-width="${col?2.4:1.2}"/><text x="${x - w*6}" y="${y+4}" font-size="11" text-anchor="${side==='L'?'start':'end'}" fill="var(--ink)">${name}</text>
    <text x="${x + w*6}" y="${y-3}" font-size="9" text-anchor="${side==='L'?'end':'start'}" fill="var(--ink2)">${pin}</text><text x="${x2 + w*4}" y="${y+4}" font-size="10.5" text-anchor="${side==='L'?'end':'start'}" fill="${col||'var(--ink2)'}">${net}</text>`;
}
function schMCU(t){
  const pd = portdAt(t), sn = (()=>{ const s = stepAt(t); return s.pass>=0 ? snap(s.pass) : null; })();
  const low = k => pinLowAt(k, t);
  const L = [[19,'RA0','SUM ← P2/P4-1 · R63 332 · R59 3K32↑', low(6)],[20,'RA1','spare (input_reg bit 7)', false],[21,'RA2','IN1 ← P2/P4-3 · 332 · 3K32↑', low(0)],[22,'RA3','IN2 ← P4-4', low(1)],[23,'RA4','IN3 ← P4-5', low(2)],[24,'RA5','n.c. (TRISA differs init/re_init)', false],
    [25,'RE0','IN4 ← P4-6', low(3)],[26,'RE1','IN5 ← P4-7', low(4)],[27,'RE2','IN6 ← P4-8', low(5)],[30,'OSC1','X1 4.9152 MHz, C6 27p'],[31,'OSC2','X1, C7 27p'],[18,'MCLR','D1 1N4148 to +5 V']];
  const R = [[38,'RD0','IN1 switches + LED R67'],[39,'RD1','IN2 switches + LED'],[40,'RD2','IN3 switches + LED'],[41,'RD3','IN4 switches + LED'],[2,'RD4','IN5 switches + LED'],[3,'RD5','IN6 switches + LED'],[4,'RD6','SUM LED (P1)'],[5,'RD7','spare (P1-10)'],
    [32,'RC0','U2 TXEN (driver enable)'],[37,'RC3/SCK','30 Ω → P3 (from POD9)'],[42,'RC4/SDI','30 Ω → P3'],[43,'RC5/SDO','30 Ω → P3'],[44,'RC6/TX','U2 TX → J3 3/8'],[1,'RC7/RX','U1 RX ← J3 7/2 (R52 10k)'],[10,'RB3/PGM','H8 ICSP'],[16,'RB6/PGC','H8'],[17,'RB7/PGD','H8']];
  const act = k => pd>=0 && !((pd>>k)&1);
  let s = `<svg viewBox="0 0 900 490" style="width:100%"><rect x="330" y="20" width="240" height="430" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.6"/><text x="450" y="44" text-anchor="middle" font-weight="700" fill="var(--ink)">U3 PIC16F874-04/PT</text><text x="450" y="60" text-anchor="middle" font-size="11" fill="var(--ink2)">TQFP-44 · VDD 7/28 · C38 0.1 µF</text>`;
  L.forEach((p,i)=> s += pinRow(330, 86+i*30, p[0], p[1], p[2], 'L', p[3]?'#d33a2c':null));
  R.forEach((p,i)=> s += pinRow(570, 80+i*22, p[0], p[1], p[2], 'R', i<8 && act(i) ? '#d33a2c' : (i===8 && sn && sn.RC0 ? '#d9a531' : null)));
  s += `<text x="20" y="466" font-size="10.5" fill="var(--ink2)">Redrawn from pod2-p1.pdf (P-CAD 2002, POD2iss5, 3 Sep 2009|42) — not the original CAD. Red = pin low now.</text><text x="20" y="482" font-size="10.5" fill="var(--ink2)">Which 74HC4053 pair belongs to which RD line is not legible on the plot (order inferred).</text></svg>`;
  return s;
}
function schCell(t){
  const m = selAt(t), on = !!(m & 1);
  return `<svg viewBox="0 0 900 420" style="width:100%">
    <text x="20" y="22" font-weight="700" fill="var(--ink)">One stereo input cell (IN n, left channel shown) and the left output chain</text>
    <rect x="20" y="60" width="70" height="120" fill="var(--panel2)" stroke="var(--ink)"/><text x="55" y="52" text-anchor="middle" font-size="11" fill="var(--ink)">H2…H7 2×3</text>
    ${['L+','L−','R+','R−'].map((l,i)=>`<text x="30" y="${84+i*26}" font-size="11" fill="var(--ink)">${l}</text><line x1="90" y1="${80+i*26}" x2="140" y2="${80+i*26}" stroke="var(--ink2)"/>
      <rect x="140" y="${73+i*26}" width="50" height="14" fill="none" stroke="var(--ink)"/><text x="165" y="${84+i*26}" text-anchor="middle" font-size="9" fill="var(--ink)">20 kΩ</text>
      <line x1="190" y1="${80+i*26}" x2="210" y2="${80+i*26}" stroke="var(--ink2)"/><line x1="210" y1="${72+i*26}" x2="210" y2="${88+i*26}" stroke="var(--ink)" stroke-width="2"/><line x1="216" y1="${72+i*26}" x2="216" y2="${88+i*26}" stroke="var(--ink)" stroke-width="2"/>
      <text x="213" y="${68+i*26}" text-anchor="middle" font-size="8" fill="var(--ink2)">68µ</text><line x1="216" y1="${80+i*26}" x2="270" y2="${80+i*26}" stroke="var(--ink2)"/>`).join('')}
    <rect x="270" y="60" width="120" height="120" fill="var(--panel2)" stroke="var(--ink)"/><text x="330" y="52" text-anchor="middle" font-size="11" fill="var(--ink)">74HC4053 ×2 (e.g. U10/U11)</text>
    ${[0,1,2,3].map(i=>`<circle cx="285" cy="${80+i*26}" r="3" fill="var(--ink)"/><line x1="285" y1="${80+i*26}" x2="330" y2="${(on?74:88)+i*26}" stroke="${on?'#d33a2c':'var(--ink)'}" stroke-width="2"/>
      <text x="345" y="${77+i*26}" font-size="9" fill="var(--ink2)">X→bus</text><text x="345" y="${92+i*26}" font-size="9" fill="var(--ink2)">Y→GND</text>`).join('')}
    <text x="330" y="198" text-anchor="middle" font-size="10.5" fill="var(--ink2)">A=B=C ← RDn · VDD +5 V · VSS = VEE = GND</text>
    <line x1="390" y1="80" x2="470" y2="80" stroke="var(--accent)" stroke-width="2"/><text x="400" y="74" font-size="10" fill="var(--accent)">L+ bus (×6 inputs)</text>
    <line x1="390" y1="106" x2="430" y2="106" stroke="var(--accent)" stroke-width="2"/><line x1="430" y1="106" x2="430" y2="250" stroke="var(--accent)" stroke-width="2"/><line x1="430" y1="250" x2="470" y2="250" stroke="var(--accent)" stroke-width="2"/><text x="436" y="200" font-size="10" fill="var(--accent)">L− bus</text>
    <path d="M470 60 v80 l70 -40 z" fill="var(--panel2)" stroke="var(--ink)"/><text x="482" y="104" font-size="10" fill="var(--ink)">U16A</text><text x="505" y="52" font-size="10" fill="var(--ink2)">R42 10k ∥ C35 27p</text>
    <path d="M470 230 v80 l70 -40 z" fill="var(--panel2)" stroke="var(--ink)"/><text x="482" y="274" font-size="10" fill="var(--ink)">U16B</text><text x="490" y="330" font-size="10" fill="var(--ink2)">R43 10k ∥ C37 27p</text>
    <line x1="540" y1="100" x2="560" y2="100" stroke="var(--ink2)"/><line x1="560" y1="100" x2="560" y2="200" stroke="var(--ink2)"/><line x1="560" y1="200" x2="455" y2="200" stroke="var(--ink2)"/><line x1="455" y1="200" x2="455" y2="250" stroke="var(--ink2)"/><text x="565" y="160" font-size="10" fill="var(--ink2)">R44 10k</text>
    <text x="545" y="92" font-size="10" fill="var(--ink2)">−0.5·in+</text>
    <line x1="540" y1="270" x2="640" y2="270" stroke="var(--ink2)"/><text x="548" y="262" font-size="10" fill="var(--ink2)">+0.5·(in+ − in−)</text>
    <path d="M660 150 v70 l60 -35 z" fill="var(--panel2)" stroke="var(--ink)"/><text x="668" y="190" font-size="10" fill="var(--ink)">U18A</text><text x="640" y="142" font-size="10" fill="var(--ink2)">R45/R46 10k: −1</text>
    <path d="M660 250 v70 l60 -35 z" fill="var(--panel2)" stroke="var(--ink)"/><text x="668" y="290" font-size="10" fill="var(--ink)">U18B</text><text x="650" y="340" font-size="10" fill="var(--ink2)">follower</text>
    <line x1="640" y1="270" x2="640" y2="185" stroke="var(--ink2)"/><line x1="640" y1="185" x2="660" y2="185" stroke="var(--ink2)"/><line x1="640" y1="285" x2="660" y2="285" stroke="var(--ink2)"/>
    <line x1="720" y1="185" x2="760" y2="185" stroke="var(--ink2)"/><rect x="760" y="178" width="40" height="14" fill="none" stroke="var(--ink)"/><text x="780" y="174" text-anchor="middle" font-size="9" fill="var(--ink2)">R35 30Ω</text>
    <line x1="720" y1="285" x2="760" y2="285" stroke="var(--ink2)"/><rect x="760" y="278" width="40" height="14" fill="none" stroke="var(--ink)"/><text x="780" y="274" text-anchor="middle" font-size="9" fill="var(--ink2)">R36 30Ω</text>
    <line x1="800" y1="185" x2="840" y2="185" stroke="var(--ink2)"/><line x1="800" y1="285" x2="840" y2="285" stroke="var(--ink2)"/><rect x="840" y="170" width="40" height="130" fill="var(--panel2)" stroke="var(--ink)"/><text x="860" y="165" text-anchor="middle" font-size="10" fill="var(--ink)">H1</text>
    <text x="860" y="190" text-anchor="middle" font-size="10" fill="var(--ink)">L −</text><text x="860" y="290" text-anchor="middle" font-size="10" fill="var(--ink)">L +</text>
    <text x="20" y="380" font-size="11" fill="var(--ink)">Gain: each leg 10 k / 20 k = 0.5; U16B gives 0.5 × Vdiff; U18 drives ±0.5 × Vdiff → unity balanced. Output Z = 2 × 30 Ω = 60 Ω (manual ✓). In = 2 × 20 kΩ = 40 kΩ (manual ✓).</text>
    <text x="20" y="400" font-size="10.5" fill="var(--ink2)">Redrawn from pod2-p1.pdf (U16–U19, R33–R46, C32–C37) and pod2-p2.pdf (H2–H7, R9–R32, C8–C31, U4–U15) — not the original CAD. Header pin order and which leg feeds which bus are ${'inferred'}. Red = IN1 switched to the bus at the playhead.</text></svg>`;
}
function schPower(t){
  const sn = (()=>{ const s = stepAt(t); return s.pass>=0 ? snap(s.pass) : null; })();
  return `<svg viewBox="0 0 900 360" style="width:100%">
    <text x="20" y="22" font-weight="700" fill="var(--ink)">Power and the RS-422 CONTROL port</text>
    <rect x="20" y="50" width="80" height="60" fill="var(--panel2)" stroke="var(--ink)"/><text x="60" y="76" text-anchor="middle" font-size="11" fill="var(--ink)">ACIN</text><text x="60" y="92" text-anchor="middle" font-size="9" fill="var(--ink2)">PAN156-3</text>
    <rect x="130" y="50" width="70" height="60" fill="var(--panel2)" stroke="var(--ink)"/><text x="165" y="84" text-anchor="middle" font-size="11" fill="var(--ink)">PWRSW</text>
    <rect x="230" y="40" width="120" height="80" fill="var(--panel2)" stroke="var(--ink)"/><text x="290" y="70" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">PSU VAF1005</text><text x="290" y="88" text-anchor="middle" font-size="10" fill="var(--ink2)">L N G → Vout+ 5 / Vout− 4</text>
    <line x1="100" y1="80" x2="130" y2="80" stroke="var(--ink2)"/><line x1="200" y1="80" x2="230" y2="80" stroke="var(--ink2)"/><line x1="350" y1="70" x2="470" y2="70" stroke="var(--accent)" stroke-width="2"/><text x="360" y="62" font-size="11" fill="var(--accent)">+5 V</text>
    <text x="360" y="100" font-size="10" fill="var(--ink2)">C110–C114 5 × 68 µF · PWR LED + R90 511 Ω</text>
    <rect x="470" y="60" width="60" height="20" fill="none" stroke="var(--ink)"/><text x="500" y="54" text-anchor="middle" font-size="10" fill="var(--ink2)">FB2 BLM41P</text>
    <line x1="530" y1="70" x2="580" y2="70" stroke="var(--ink2)"/><rect x="580" y="40" width="130" height="80" fill="var(--panel2)" stroke="var(--bad)"/><text x="645" y="68" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">REG2 SUW1R5-1212</text><text x="645" y="86" text-anchor="middle" font-size="10" fill="var(--ink2)">C116 22 µ/35 V in</text><text x="645" y="102" text-anchor="middle" font-size="10" fill="var(--bad)">12 V-input part on 5 V?</text>
    <line x1="710" y1="60" x2="780" y2="60" stroke="var(--ink2)"/><line x1="710" y1="100" x2="780" y2="100" stroke="var(--ink2)"/><text x="785" y="64" font-size="11" fill="var(--ink)">+12 V (C115 1 µ)</text><text x="785" y="104" font-size="11" fill="var(--ink)">−12 V (C117 1 µ)</text><text x="785" y="124" font-size="10" fill="var(--ink2)">→ U16–U19 NE5532</text>
    <rect x="20" y="170" width="90" height="160" fill="var(--panel2)" stroke="var(--ink)"/><text x="65" y="164" text-anchor="middle" font-size="11" fill="var(--ink)">J3 DE9F CONTROL</text>
    ${[[2,'RX−'],[3,'TX+'],[5,'GND'],[7,'RX+'],[8,'TX−']].map(([p,n],i)=>`<text x="30" y="${196+i*28}" font-size="11" fill="var(--ink)">${p} ${n}</text><line x1="110" y1="${192+i*28}" x2="${i===2?150:200}" y2="${192+i*28}" stroke="var(--ink2)"/>`).join('')}
    <rect x="200" y="176" width="40" height="12" fill="none" stroke="var(--ink)"/><text x="220" y="172" text-anchor="middle" font-size="9" fill="var(--ink2)">R6 10Ω</text>
    <rect x="200" y="260" width="40" height="12" fill="none" stroke="var(--ink)"/><text x="220" y="256" text-anchor="middle" font-size="9" fill="var(--ink2)">R5 10Ω</text>
    <rect x="200" y="204" width="40" height="12" fill="none" stroke="var(--ink)"/><text x="220" y="200" text-anchor="middle" font-size="9" fill="var(--ink2)">R7 10Ω</text>
    <rect x="200" y="288" width="40" height="12" fill="none" stroke="var(--ink)"/><text x="220" y="314" text-anchor="middle" font-size="9" fill="var(--ink2)">R8 10Ω</text>
    <rect x="320" y="170" width="140" height="70" fill="var(--panel2)" stroke="var(--ink)"/><text x="390" y="194" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)">U1 DS75176 (RX)</text><text x="390" y="212" text-anchor="middle" font-size="10" fill="var(--ink2)">A/B ← 7/2, bias R50/R51 10k</text><text x="390" y="228" text-anchor="middle" font-size="10" fill="var(--ink2)">R → R52 10k → RC7</text>
    <rect x="320" y="260" width="140" height="70" fill="var(--panel2)" stroke="${sn&&sn.RC0?'#d9a531':'var(--ink)'}" stroke-width="${sn&&sn.RC0?2.5:1}"/><text x="390" y="284" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)">U2 DS75176 (TX)</text><text x="390" y="302" text-anchor="middle" font-size="10" fill="var(--ink2)">D ← RC6, DE ← RC0 ${sn&&sn.RC0?'(ON)':'(off)'}</text><text x="390" y="318" text-anchor="middle" font-size="10" fill="var(--ink2)">A/B → 3/8, bias R53/R54 10k</text>
    <line x1="240" y1="182" x2="320" y2="200" stroke="var(--ink2)"/><line x1="240" y1="266" x2="320" y2="214" stroke="var(--ink2)"/><line x1="240" y1="210" x2="320" y2="290" stroke="var(--ink2)"/><line x1="240" y1="294" x2="320" y2="304" stroke="var(--ink2)"/>
    <line x1="460" y1="205" x2="560" y2="205" stroke="var(--ink2)"/><text x="565" y="209" font-size="11" fill="var(--ink)">→ U3 RC7/RX (pin 1)</text><line x1="460" y1="295" x2="560" y2="295" stroke="var(--ink2)"/><text x="565" y="299" font-size="11" fill="var(--ink)">← U3 RC6/TX (44), RC0 (32)</text>
    <text x="565" y="250" font-size="10.5" fill="var(--ink2)">LK1, LK2 “DNI” links (echo / loop-back options, ${'inferred'})</text>
    <text x="20" y="352" font-size="10.5" fill="var(--ink2)">Redrawn from pod2-p1.pdf and the iss6 BOM — not the original CAD. DE9 pin functions from the manual (3 TX+, 8 TX−, 7 RX+, 2 RX−, 5 GND); the 10 Ω pairing per pin is read off the plot.</text></svg>`;
}
const SCH = { mcu:['PIC16F874 and its I/O', schMCU], cell:['Input cell, summing amp, output driver', schCell], pwr:['Power and RS-422', schPower] };
function viewSchem(m){
  window.__pod2Keys = false;
  m.innerHTML = `<div class="card"><h2>Schematic set — redrawn from the archive (not the original CAD)</h2><div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sch"></div></div>
    <div class="grid2">${card('Bill of materials (SA-POD2-MAIN iss6)', `<table class="kv small">
      <tr><td>U3</td><td>PIC16F874-04/PT (TQFP-44)</td></tr><tr><td>U4–U15</td><td>12 × 74HC4053M (SO-16)</td></tr><tr><td>U16–U19</td><td>4 × NE5532D8</td></tr><tr><td>U1, U2</td><td>DS75176BM RS-485/422 transceivers</td></tr>
      <tr><td>X1</td><td>4.9152 MHz HC49US (with insulator)</td></tr><tr><td>PSU / REG2</td><td>VAF1005 / SUW1R5-1212</td></tr><tr><td>R9–R32</td><td>24 × 20 kΩ 1 %</td></tr><tr><td>C8–C31, C110–C114</td><td>29 × 68 µF 10 V tantalum (T491D)</td></tr>
      <tr><td>R2–R4, R33–R36</td><td>7 × 30 Ω</td></tr><tr><td>R55–R58, R63–R74</td><td>16 × 332 Ω (button series + LED)</td></tr><tr><td>R59–R62, R75–R78</td><td>8 × 3K32 pull-ups</td></tr><tr><td>J3, H1–H8, P1–P3</td><td>DE9S, 2×3 Berg ×7, 12-pin ×2, MLSS-100-4 (P3)</td></tr></table>`)}
      ${card('Netlist facts used by the model', `<ul class="small">
      <li>Buttons are active low with 3K32 pull-ups; the GPI header P4 is wired in parallel with the front-panel connector P2 (P2-1…8 = P4-1…8).</li>
      <li>PORTD drives both the switch selects and the LEDs (P1, 332 Ω each): LED lit = input on, always.</li>
      <li>RC3/RC4/RC5 reach P3 through 30 Ω (R2–R4): only SPI, no SS line.</li>
      <li>RC0 enables U2's driver; U1 always receives.</li>
      <li>The 1997 drawing (POD2.pdf, POD2.DSN, “ISS2PCB”) shows the same cell with CD14053 switches and 33 µF caps, and is labelled RIGHT SUMMING / LEFT SUMMING.</li></ul>`)}</div>`;
  const draw = ()=>{
    m.querySelector('#tabs2').innerHTML = Object.entries(SCH).map(([k,v])=>`<button class="${k===schSel?'on':''}" data-k="${k}">${v[0]}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ schSel=b.dataset.k; draw(); });
    m.querySelector('#sch').innerHTML = SCH[schSel][1](SIM.t);
  };
  SIM.on('time', draw);
}

/* ---------------- software ---------------- */
function decodeCmd(b){
  if (!(b & 0x80)) return (b & 0x40) ? `01 → SUM inputs ${listSel(b&0x3F).join('+')||'none'}` : '00 → REQUEST STATUS';
  if (b & 0x40){ const a=b&7; return a===0?'11…000 → slave_off (manual: ON)':a===7?'11…111 → slave_on (manual: OFF)':`11…${a.toString(2).padStart(3,'0')} → AFV input ${a}, slave on`; }
  if ((b&0x7F)===0) return '1000 0000 → cancel SUM';
  const v=(b>>3)&7, a=b&7; return `10 → video ${v||'—'}, audio ${a||'—'}${a===7||v===7?' (code 7!)':''}`;
}
const LOOPXY = [[70,40],[196,40],[322,40],[450,40],[450,122],[450,205],[450,288],[450,370],[322,370],[196,370],[70,370],[70,288],[70,205],[70,122]];
function viewSoft(m){
  window.__pod2Keys = true;
  m.innerHTML = `<div class="grid2">${card('Main loop of pod2v200.asm — the running routine at the playhead', `<div id="loop"></div>`)}${card('Routine at the playhead', `<div id="rdesc"></div>`)}</div>
    <div class="grid2">${card('State machine: what a button press does (router)', `<div id="fsm"></div>`)}${card('Registers live', `<div id="regs"></div>`)}</div>
    <div class="grid2">${card('RS-422 protocol (manual) and the code that handles it', `<div id="proto"></div>`)}${card('Slave-port link (POD9 ⇄ POD2)', `<div id="spi"></div>`)}</div>
    ${card('Version history in the archive', `<table class="kv small"><tr><th>File</th><th>Date</th><th>Part</th><th>Notes</th></tr>
      <tr><td class="mono">POD2V100.ASM</td><td>27 Oct 1997|30</td><td>PIC16C73A</td><td>LEDs/outputs on PORTB; debounce 0xFE (254 passes)</td></tr>
      <tr><td class="mono">WARNING</td><td>16 Jan 1998|31</td><td></td><td>“DECREASE DEBOUNCING TIME AND ONLY ONE LED AT A TIME SEE POD 10.”</td></tr>
      <tr><td class="mono">POD2V101/V102.ASM</td><td>1998|31 / 1999|32</td><td>PIC16C73A</td><td>v1.02 SPI counter-reset fix (per the #cycle README)</td></tr>
      <tr><td class="mono">pod2v103.asm</td><td>12 Feb 2002|35</td><td>PIC16F73</td><td>“allow POD2 to be a slave and remote at the same time”; debounce now 0x70</td></tr>
      <tr><td class="mono">#v200/pod2v200.asm</td><td>22 Jan 2010|43</td><td>PIC16F874</td><td>new I/O: buttons RA/RE, outputs PORTD; header still says VERSION 1.03</td></tr>
      <tr><td class="mono">#v201 = #v202</td><td>22 Jan 2010|43</td><td>PIC16F874</td><td>explicit ,1 destinations only (assembler warnings); tested 28 Sep 2009|42 (test report)</td></tr>
      <tr><td class="mono">#r200/pod2r200.asm</td><td>28 Sep 2009|42</td><td>PIC16F874</td><td>POD2R remote, Tim Clarke's 8 Aug 2000|33 com_timeout LED flashing</td></tr></table>`)}`;
  const draw = ()=>{
    const t=SIM.t, st=stepAt(t), sn = st.pass>=0?snap(st.pass):null, E = emulate();
    const n = ROUT.length, cx=260, cy=200, R=160, RX=200;
    let s = `<svg viewBox="0 0 520 410" style="width:100%"><rect x="70" y="40" width="380" height="330" rx="30" fill="none" stroke="var(--line)" stroke-width="2" stroke-dasharray="4 4"/>`;
    ROUT.forEach((r,i)=>{ const [x,y] = LOOPXY[i], on = i===st.step && powerAt(t); const busy = st.pass>=0 && E.P.cyc[st.pass*n+i] > r[1];
      s += `<rect x="${x-58}" y="${y-13}" width="116" height="26" rx="7" fill="${on?'var(--accent)':busy?'color-mix(in srgb,var(--warn) 30%,var(--panel2))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}"/><text x="${x}" y="${y+4}" text-anchor="middle" font-size="11" fill="${on?'#fff':'var(--ink)'}" font-family="var(--mono)">${r[0]}</text>`; });
    s += `<text x="${cx}" y="${cy-6}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">main: goto main</text><text x="${cx}" y="${cy+12}" text-anchor="middle" font-size="11" fill="var(--ink2)">${st.pass>=0&&powerAt(t)?'pass #'+st.pass.toLocaleString()+' · '+passLen(st.pass)+' Tcy':'(not running)'}</text><text x="${cx}" y="${cy+28}" text-anchor="middle" font-size="10" fill="var(--ink2)">orange = took a busy path this pass</text></svg>`;
    m.querySelector('#loop').innerHTML = s;
    const r = ROUT[Math.max(0,st.step)]||ROUT[0];
    m.querySelector('#rdesc').innerHTML = `<p><b class="mono">${r[0]}</b> — ${r[2]}.</p><table class="kv small"><tr><th>Routine</th><th>idle Tcy</th><th>this pass</th></tr>${ROUT.map((q,i)=>`<tr class="${i===st.step?'hl':''}"><td class="mono">${q[0]}</td><td class="mono">${q[1]}</td><td class="mono">${st.pass>=0?E.P.cyc[st.pass*n+i]:'—'}</td></tr>`).join('')}<tr><th>Total</th><th class="mono">${IDLE}</th><th class="mono">${st.pass>=0?passLen(st.pass):'—'}</th></tr></table>
      <p class="small muted">Idle counts: 1–2 Tcy per instruction from the listing, including each <span class="mono">call</span>/<span class="mono">return</span>. Busy counts are summed for the path taken (±2 Tcy, ${inf}).</p>`;
    const pre = sn ? sn.pre_output : 0xFE, sum = !(pre & 0x40), multi = listSel((~pre)&0x3F).length > 1;
    const stName = sum ? 'SUM' : multi ? 'AFTER SUM' : 'ONE OF SIX';
    const box = (x,y,nm,sub)=>`<rect x="${x}" y="${y}" width="150" height="56" rx="10" fill="${stName===nm?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="1.5"/><text x="${x+75}" y="${y+24}" text-anchor="middle" font-weight="700" font-size="13" fill="${stName===nm?'#fff':'var(--ink)'}">${nm}</text><text x="${x+75}" y="${y+42}" text-anchor="middle" font-size="10" fill="${stName===nm?'#fff':'var(--ink2)'}">${sub}</text>`;
    m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 600 300" style="width:100%">
      ${box(20,40,'ONE OF SIX','bit 6 = 1, one bit low')}${box(340,40,'SUM','bit 6 = 0')}${box(180,200,'AFTER SUM','bit 6 = 1, mix kept')}
      <path d="M170 60 L340 60" stroke="var(--ink2)" marker-end="url(#ar)"/><text x="255" y="52" text-anchor="middle" font-size="10.5" fill="var(--ink)">SUM pressed → mix: toggle bit 6</text>
      <path d="M415 96 L320 200" stroke="var(--ink2)" marker-end="url(#ar)"/><text x="375" y="160" font-size="10.5" fill="var(--ink)">SUM pressed → bit 6 back to 1</text>
      <path d="M200 200 L100 96" stroke="var(--ink2)" marker-end="url(#ar)"/><text x="20" y="160" font-size="10.5" fill="var(--ink)">number → no_mix</text>
      <path d="M95 40 C 60 0, 130 0, 110 38" fill="none" stroke="var(--ink2)" marker-end="url(#ar)"/><text x="125" y="16" font-size="10.5" fill="var(--ink)">number → no_mix: pre_output = input_reg</text>
      <path d="M420 40 C 390 0, 470 0, 450 38" fill="none" stroke="var(--ink2)" marker-end="url(#ar)"/><text x="440" y="16" font-size="10.5" fill="var(--ink)">number → toggles</text>
      <text x="20" y="290" font-size="10.5" fill="var(--ink2)">Remote paths (RS-422 01/10/80/11, slave port) write pre_output directly through remote_flag,0/1.</text>
      <defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--ink2)"/></marker></defs></svg>`;
    const bits = (v, names)=>`<div style="display:flex;gap:2px">${names.map((nm,i)=>{ const b=7-i, on=!((v>>b)&1); return `<div style="flex:1;text-align:center;border:1px solid var(--line);border-radius:4px;padding:2px 0;background:${on?'color-mix(in srgb,var(--bad) 22%,transparent)':'var(--panel2)'}" title="bit ${b}"><div class="mono" style="font-size:12px">${(v>>b)&1}</div><div style="font-size:9.5px" class="muted">${nm}</div></div>`; }).join('')}</div>`;
    m.querySelector('#regs').innerHTML = sn ? `<div class="small">pre_output = ${hex2(sn.pre_output)} (active low → PORTD)</div>${bits(sn.pre_output,['spare','SUM','IN6','IN5','IN4','IN3','IN2','IN1'])}
      <div class="small" style="margin-top:8px">input_reg = ${hex2(sn.input_reg)} (pins as read this pass)</div>${bits(sn.input_reg,['RA1','RA0','RE2','RE1','RE0','RA4','RA3','RA2'])}
      <div class="small" style="margin-top:8px">video = ${hex2(sn.video)} (POD9 status, active low)</div>${bits(sn.video,['b7','slave','V6','V5','V4','V3','V2','V1'])}
      <div class="small" style="margin-top:8px">spi_output = ${hex2(sn.spi_output)} → next slave-port byte</div>${bits(sn.spi_output,['stat','slave','6','5','4','3','2','1'])}
      <p class="small muted">Red = bit is 0 (active). The same byte format is used on the slave port in both directions: bit 7 = 1 status, 0 command.</p>` : '<div class="muted">Not running at the playhead.</div>';
    const lastPair = (()=>{ const rx = E.rxF.filter(f=>f.t0<=t); for (let i=rx.length-1;i>0;i--) if (rx[i-1].b===0xF0 && rx[i].b!==0xF0) return [rx[i-1], rx[i]]; return null; })();
    const reply = lastPair ? E.txF.filter(f=>f.t0 >= lastPair[1].t0 && f.t0 <= t).slice(0,2) : [];
    m.querySelector('#proto').innerHTML = `<table class="kv small"><tr><th>Command (after F0)</th><th>Manual</th><th>Code path</th></tr>
      <tr><td class="mono">0000 0000</td><td>Request status</td><td class="mono">status_check → send_audio (any 00xx xxxx works)</td></tr>
      <tr><td class="mono">01 654321</td><td>SUM audio inputs</td><td class="mono">sum_audio: ~cmd, bit 6 cleared; POD9 told slave off</td></tr>
      <tr><td class="mono">1000 0000</td><td>Cancel SUM</td><td class="mono">cancel_sum</td></tr>
      <tr><td class="mono">10 vvv aaa</td><td>Switch audio and video (001–110)</td><td class="mono">audio_table(v) → spi_uart_setup; audio_table(a) → router</td></tr>
      <tr><td class="mono">11 000 aaa</td><td>Slave audio and video; C0 = on, C7 = off</td><td class="mono">a=0 slave_off · a=7 slave_on · else not_on (AFV a)</td></tr>
      <tr><td colspan="3">Reply: <span class="mono">1xxx xxxx</span> = ~video | 0x80 (POD9: bit 6 slave, bits 5–0 video), then <span class="mono">0xxx xxxx</span> = ~pre_output & 0x7F (bit 6 SUM, bits 5–0 audio). DB9F: TX+ 3, TX− 8, RX+ 7, RX− 2, GND 5.</td></tr></table>
      <h3>Last command at the playhead</h3><div class="small mono">${lastPair?`F0 ${hx(lastPair[1].b)} @ ${SIM.fmtT(lastPair[0].t0)} → ${decodeCmd(lastPair[1].b)}<br>reply: ${reply.length?reply.map(f=>hx(f.b)+' ('+bin8(f.b)+')').join(', '):'(not yet)'}${reply[0]?` → POD9 ${reply[0].b===0x80?'absent':'V'+listSel(reply[0].b&0x3F).join('')+(reply[0].b&0x40?' slave':'')}`:''}${reply[1]?` · POD2 ${listSel(reply[1].b&0x3F).join('+')||'none'}${reply[1].b&0x40?' SUM':''}`:''}`:'none yet (use the console on the Simulator tab)'}</div>`;
    const sx = E.spiX.filter(x=>x.t<=t).slice(-6);
    m.querySelector('#spi').innerHTML = `<svg viewBox="0 0 500 150" style="width:100%"><rect x="20" y="30" width="140" height="80" rx="8" fill="var(--panel2)" stroke="var(--line)"/><text x="90" y="58" text-anchor="middle" font-weight="700" fill="var(--ink)">POD9</text><text x="90" y="78" text-anchor="middle" font-size="10" fill="var(--ink2)">SPI master, Fosc/4</text><text x="90" y="94" text-anchor="middle" font-size="10" fill="var(--ink2)">1 byte / 3.33 ms</text>
      <rect x="340" y="30" width="140" height="80" rx="8" fill="var(--panel2)" stroke="var(--line)"/><text x="410" y="58" text-anchor="middle" font-weight="700" fill="var(--ink)">POD2</text><text x="410" y="78" text-anchor="middle" font-size="10" fill="var(--ink2)">SSPCON 0x25 slave</text><text x="410" y="94" text-anchor="middle" font-size="10" fill="var(--ink2)">SS pin disabled</text>
      <line x1="160" y1="50" x2="340" y2="50" stroke="var(--accent)" marker-end="url(#ar2)"/><text x="250" y="45" text-anchor="middle" font-size="10" fill="var(--ink)">SCK + SDO → RC3/RC4</text>
      <line x1="340" y1="90" x2="160" y2="90" stroke="var(--accent2)" marker-end="url(#ar2)"/><text x="250" y="104" text-anchor="middle" font-size="10" fill="var(--ink)">RC5 SDO → POD9 SDI</text>
      <defs><marker id="ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--ink2)"/></marker></defs></svg>
      <ul class="small"><li>Each side sends <span class="mono">F0</span>, then a data byte, alternately. Data with bit 7 = 1 is status; bit 7 = 0 is a command.</li>
      <li>POD2 acts on the <b>4th</b> command (spi_rec_count = 4); POD9 on the <b>8th</b>, then every 7th. A change is repeated 32 times (spi_tran_count).</li>
      <li>No byte for one TMR2 period (53.3 ms) → <span class="mono">video = 0xFF</span>.</li></ul>
      <div class="small mono">${sx.length?sx.map(x=>`${SIM.fmtT(x.t)}  POD9→${hx(x.mosi)}  POD2→${x.miso==null?'--':hx(x.miso)}`).join('<br>'):'no exchanges before the playhead (connect a POD9)'}</div>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__pod2Keys = false;
  const F = [
    ['FA','Artwork 2026|59: front/rear panels now from '+SIM.src(ART_CDR, ART_CDR.split('/').pop())+' (file 2015-09-30, sheet dated Jun.19/14)','The ink plates are drawn as vectors over the cut-out layer (rocker, power LED, seven button holes, three screw holes between SUM/2–3/5–6, Phoenix and CONTROL cut-outs, IEC inlet). The front WHITE plate has four filled corner triangles that are not on the photo (sheet furniture, left out). The rear plate has one more hole than the legend names: a small round hole at the top right, beside the IEC inlet. The older PNG silks are on the toggle under the rear panel.'],
    ['F0','Corrected 2026|59: the POD9 SLAVE button only works in the 16F73 build (see pod9.js)','The POD9 side used to toggle slave mode on its SLAVE button. In POD9 V102 (<span class="mono">#V102/pod9v102.asm</span>, the build for “POD2 remote with POD2 and POD9”) the RA1 “check mix” read in <span class="mono">input</span> is commented out, so the button does nothing, and <span class="mono">SPI_master</span> does <span class="mono">bcf pre_output,5</span> on every SPI exchange, forcing slave on. A POD2 command that clears slave (F0 C0, or SUM via <span class="mono">special_spi</span>) therefore lasts one exchange. Toggling works only in the 16F73 build (<span class="mono">#V100/pod9v102.asm</span>). The POD9 side now defaults to V102; the 16F73 build is an option in the slave-port panel.'],
    ['F1','Manual vs code: C0 and C7 are swapped','The manual (SERIAL PROTOCOL 4) says F0 C0 turns POD9’s slave indicator on and F0 C7 turns it off. In <span class="mono">translate_uart</span> → <span class="mono">slave_mode</span>, a = 0 jumps to <span class="mono">slave_off</span> (bit 6 set = off) and a = 7 to <span class="mono">slave_on</span> (bit 6 cleared). The POD2R remote agrees with the code: <span class="mono">slave_on_stuff</span> sends C7, <span class="mono">slave_off_stuff</span> sends C0 (pod2r200.asm). Try the “Manual note test” scenario.'],
    ['F2','The slave field of a C1–C6 command also turns slave mode on','<span class="mono">not_on</span> clears bit 6 of <span class="mono">spi_output_temp</span>, so “11 000 aaa” both switches audio+video to input a and switches POD9 into audio-follow-video. The manual only says “slave audio and video”.'],
    ['F3','SUM over the slave port drops AFV','When SUM is on and a button is pressed, <span class="mono">SPI_trns_cntrl</span> → <span class="mono">special_spi</span> sends POD9 its own video byte with bit 6 set: POD9 leaves slave mode. <span class="mono">sum_audio</span> (RS-422 01xxxxxx) does the same through <span class="mono">spi_uart_setup</span> + <span class="mono">bsf spi_output_temp,6</span>. The manual does not say that mixing breaks the link.'],
    ['F4','Audio code 7 is not rejected','<span class="mono">audio_table</span> has 8 entries; index 7 returns <span class="mono">0x01</span>, which (active low) selects inputs 2–6 and SUM, deselects input 1 and drives the spare RD7 low. F0 87 (or video code 7) is accepted without a range check. Index 0 lands on the <span class="mono">nop</span> and returns input 1’s pattern, but the callers never pass 0.'],
    ['F5','A stray byte makes POD2 talk','<span class="mono">recieve_uart</span> sets <span class="mono">transmit_flag,0</span> for every byte. If the byte is not F0 and no F0 came before it, <span class="mono">translate_uart</span> returns at <span class="mono">btfss uart_flag,7</span> without clearing the flag, so <span class="mono">transmit_uart</span> re-sends the old <span class="mono">transmit_reg</span>. On a shared RS-422 line every POD2 would answer every unaddressed byte with its last status. The F0 address is fixed (“ALWAYS F0”): two POD2s on one line cannot be told apart.'],
    ['F6','Break-before-make comes from the order of output_led','<span class="mono">output_led</span> first sets every 1-bit of PORTD (bit 7 → 0), then clears every 0-bit. Going from input 1 to 2, RD0 rises 14 Tcy (≈11 µs) before RD1 falls: a short silence instead of a short mix. It works because of the order of the code, not because it was asked for. Zoom the timeline to 40 µs around a switch.'],
    ['F7','The slave link has no frame sync','<span class="mono">SSPCON = 0x25</span> is SPI slave mode with the SS pin disabled. If one extra clock edge ever reached RC3 (hot-plugging P3, noise on an inter-unit cable), every later byte would be shifted by a bit; F0 would never be seen again, <span class="mono">video</span> would freeze at its last value (bytes still arrive, so the 53 ms timeout never fires) and AFV would stop until power-cycling. ('+inf+': a failure mode the code allows, not a reported fault.)'],
    ['F8','No memory: always powers up on input 1','<span class="mono">init</span> loads <span class="mono">pre_output = 0xFE</span>. Nothing is written to the PIC16F874’s EEPROM, so after a power cut the POD2 is on input 1 with SUM off, whatever it was on before. Try the “Power-up” scenario.'],
    ['F9','Two buttons: the lowest number wins; SUM loses','<span class="mono">input</span> tests RA2, RA3, RA4, RE0, RE1, RE2, RA1, RA0 in order and <span class="mono">return</span>s at the first low pin. Holding 4 and 2 together selects 2; SUM held with any number is ignored until the number is released. GPI closures (P4, parallel to the buttons) follow the same rule.'],
    ['F10','Leftovers in the source','The v200 file still starts “VERSION 1.03”. <span class="mono">movlw porta</span> in <span class="mono">init</span> loads a register address into W for nothing. <span class="mono">movwf PORTB</span> “only input1 led is on” writes 0xFF to PORTB although the LEDs moved to PORTD. The TRISE comment “E2=AUD1 LED, E1=AUD2 LED, E0=ERROR LED” belongs to another product: here RE0–RE2 are inputs 4–6. <span class="mono">init</span> sets TRISA = 111111b but <span class="mono">re_init</span> (every pass) 11111b, so RA5 flips to an output. <span class="mono">bsf portc,1/2</span> write to input pins. The ORG 4 vector is a bare <span class="mono">RETFIE</span>.'],
    ['F11','Busy-work every pass','<span class="mono">re_init</span> rewrites ADCON1 and all five TRIS registers on every pass (22 Tcy of 138), and <span class="mono">reset_uart</span> re-programs SPBRG/TXSTA/RCSTA after every received byte. Probably a cure for latch-up or ESD upsets inherited from the 16C73A versions ('+inf+'); it costs 16 % of the loop.'],
    ['F12','A 2.4 µs driver gap between reply bytes','<span class="mono">transmit_uart</span> clears RC0 (DS75176 driver enable) whenever TRMT = 1 and only then sets it again if a byte is pending, so between the two status bytes the line is undriven for 3 Tcy. It falls in the idle (mark) time and the 10 kΩ bias holds the line, so it is harmless.'],
    ['F13','Power: a 12 V-input converter on a 5 V bus','The iss6 BOM and the schematic feed REG2 <b>SUW1R5-1212</b> (12 V in, ±12 V out) from the VAF1005 +5 V rail through FB2. A 5 V-input part (SUW1R5-0512) would be expected; the same pairing was noted on POD1 (RD64) ('+inf+': the VAF1005 output voltage is from the other POD plugins and the PIC’s 5 V supply; no 5 V regulator is on the BOM).'],
    ['F14','+30 dBu output is optimistic','The manual promises +30 dBu max output. With NE5532s on ±12 V each leg swings about ±10.5 V, i.e. ≈ +25.6 dBu balanced, and U16B carries 0.5 × the full differential signal at the same limit ('+inf+'). SUM of several hot sources clips sooner: try +20 dBu on three inputs in SUM.'],
    ['F15','BOM slips (SA-POD2-MAIN iss6)','“RR50” for R50; “R7” in the 3K32 list (R7 is a 10 Ω, the pull-up is R77); C6 is in both the 0.1 µF and the 27 pF lines and C7 is missing (a blank “C” instead); an empty entry “,,” in the 0.1 µF list. The schematic says 3K3, the BOM 3K32.'],
    ['F16','Duplicates and dates','v202 = v201 byte for byte (only .mcp/.mcw differ). The v201 source is dated 22 Jan 2010|43 but was tested on 28 Sep 2009|42. pod2-p1/p2.pdf = “#Schematic” copies; POD2 - MANUAL.pdf = POD2-MANUAL.pdf; POD2.pdf = POD2 - #Schematic.pdf (the 1997 drawing); BOMs are duplicated loose and in POD2 - BOM/. POD2iss6.sch also sits in two MLC8 RD73 folders. A stray POD30iss2.ERR is in POD2 - #PCB/.'],
    ['F17','The debounce was shortened once','POD2V100.ASM (1997|30) waits 0xFE passes; the WARNING file (Jan 1998|31) asks to “DECREASE DEBOUNCING TIME AND ONLY ONE LED AT A TIME”; v1.03 onward uses 0x70. At ≈112 µs per pass that is 12.6 ms to accept a press and another 12.6 ms of release.'],
    ['F18','Spare bit 7 can be driven by POD9','A slave-port command has bit 7 = 0 and <span class="mono">router</span> copies the whole <span class="mono">spi_reg</span> into <span class="mono">pre_output</span>, so after an AFV switch RD7 (P1-10) goes low; after a local press it is high again. Nothing visible is fitted to it on the front panel (7 buttons).'],
  ];
  m.innerHTML = card('Findings — what the POD2 and its firmware are up to', `<ol class="small" style="padding-left:18px">${F.map(f=>`<li style="margin-bottom:8px"><b>${f[0]} · ${f[1]}.</b> ${f[2]}</li>`).join('')}</ol>`)
    + card('Sources and what was inferred', `<ul class="small">
      <li>Firmware: <span class="mono">POD2 - #Software #v201/pod2v200.asm</span> (emulated instruction path by instruction path). POD9 side: <span class="mono">pod9v102.asm</span> (SPI master timing, receive counts). POD2R: <span class="mono">pod2r200.asm</span>.</li>
      <li>Timing: 4.9152 MHz from the schematic and BOM; idle pass 138 Tcy counted from the listing; busy-path cycle counts are approximate (${inf}). POD9 is assumed to use the same crystal (its SPBRG is also 7 for 9600 baud) (${inf}).</li>
      <li>Panels: real silkscreen (2016|49 set) with the issue-2 front and issue-5 rear drawings; terminal-row assignment (top = LEFT) ${inf} from the OUTPUT labels.</li>
      <li>Contact bounce, press length, NE5532 clip level, power-up timer and POD9 debounce are ${inf}.</li>
      <li>Test reports (POD2-V201-28SEP09, POD2R-V201-9FEB10, POD2-CUSTOM-550208-2-V101-15JUL10) are scanned images and were not transcribed.</li></ul>`);
}

/* ---------------- register ---------------- */
loadScenario('press3');
SIM.register({
  id:'pod2', name:'POD2 · 6×1 stereo audio switcher with SUM and AFV ('+Y(2009)+')', duration:1,
  product:'POD2', year:2009, family:'POD series',
  folder:'#POD #SERIES/POD2 - #Master',
  summary:'Half-rack unity-gain 6×1 stereo analog switcher: twelve 74HC4053s put balanced inputs onto NE5532 summing amplifiers, so a SUM mode can mix any of the six. A PIC16F874 (assembly, v200/v201) polls the buttons, answers an RS-422 protocol at 9600 baud and links to a POD9/21/30 video switcher over SPI for audio-follow-video.',
  highlights:['Firmware emulated pass by pass (≈112 µs) with its own registers','Interactive front and rear panel on the real silkscreen','RS-422 console, POD2R remote and a POD9 on the slave port','10-step operator tutorial with live goals','Manual-vs-code mismatch on the C0/C7 slave commands'],
  depth:'Full model',
  stepUnits:[
    {label:'1 main-loop pass (112 µs idle)', period:()=>IDLE*C.TCY},
    {label:'1 instruction cycle (814 ns)', period:()=>C.TCY},
    {label:'1 RS-422 bit (104 µs)', period:()=>1/C.BAUD},
    {label:'1 RS-422 byte (1.04 ms)', period:()=>C.BYTE},
    {label:'1 slave-port byte (3.33 ms)', period:()=>C.SPI_T},
    {label:'debounce (112 passes)', period:()=>112*IDLE*C.TCY},
    {label:'TMR2 period (53.3 ms)', period:()=>C.T2},
    {label:'10 ms', period:()=>0.01},
  ],
  zooms:[[1,'1 s (whole second)'],[0.2,'200 ms'],[0.05,'50 ms'],[0.02,'20 ms (debounce)'],[0.005,'5 ms'],[0.0015,'1.5 ms (one byte)'],[0.0004,'400 µs (3 passes)'],[0.00004,'40 µs (output_led)']],
  defaultZoom:0,
  init(){ EMU_KEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the POD2', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewAnatomy},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
