/* =====================================================================
   POD10 — 6×1 interlocking AES/EBU digital audio switcher, firmware V1.03 (Ward-Beck Systems, 1997|30 – 2002|35)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all under #POD #SERIES/XXX - POD10 - #Master #OBSOLETE/ unless noted):
   - POD10 - #Engineering/POD10 - #SOFTWARE/POD10 - #SOFTWARE #V100/pd10v103.asm (V1.03, 2 May 2002, PIC16F73) — emulated
       routine by routine: main, init, input (in2…in8), debounce (bcount_reset), router (no_mix, next_route0/1),
       debounce_rel, bounceset, reset_bcount, recieve_uart (aerror, do_recieve), reset_uart, translate_uart
       (next_check1, status_check, send_audio, next_check2, audio_only, next_audio2, cancel_sum, slave_mode, not_on,
       slave_on, slave_off), spi_uart_setup, transmit_uart, SPI_trns_cntrl (next_rem, tran_spi, do_spi, no_output,
       special_spi, more_spi), spi_tran_setup, SPI_slave (re_write, spi_cont), SPI_rcv_ctrl (spi_rec_next, no_update,
       next_spi_check1…6, all_clear, outta_here), spi_rec_setup, reset_rec_count, timer_check (video_there), audio_table
   - …/#V100/PD10V100.ASM, PD10V101.ASM, PD10V102.ASM (diffed), PD10V13M.$$$, PD10V139.$$$, pod10c.asm, PD10V103.ERR,
     PD10V100.PJT/.CFG; Custom/pd10c100.asm, pd10c101/pd10c101.asm; #CUSTOM/POD10-041/pd10v103.asm and
     Remote/pod2r101.asm (the POD10-041 two-button remote, emulated on the CONTROL port)
   - …/#V030000/pod10.X/pod10.asm, #V030100/pod10.c, #V030200/POD10A/pod10.c, #V030200/POD10R/pod10.c (compared only;
     the POD10A plugin pod10a.js emulates them)
   - POD10 - #Engineering/POD10 - #PCB #ARCHIVE/POD10.net (Tango netlist, 88 parts, 109 nets: every pin and net below),
     POD10 #schematic.pdf (POD10.DSN ISS1PCB, Oct 20 1998, 2 pages), POD10 - #ISS1 #PCB/POD10-iss2.bom,
     POD10 - Functional Diagram.pdf
   - POD10 - #Engineering/POD10 - #MANUAL/POD10MAN.pdf (protocol and specifications)
   - Artwork: #POD #SERIES/POD10A - #Master/POD10A - #ARTWORK #DA #2016 /POD10-FRONT-SILK(CURVE).pdf (6-input front,
     AUG.13/10) → assets/pod10-front-white.png, pod10-front-green.png (tools/silk_extract.py, 200 dpi, crop marks
     x 200–1920, y 500–820 / 900–1220); POD10 - #SILK/OLD ISSUSES/POD10SLK.CDR (the only 6-input rear silk) converted
     with Inkscape, four labels re-anchored to POD10SLK.pdf, crop y 100–420 → assets/pod10-rear-white.png
   - Mechanical: POD10 - #Mechanical #DA #2016/POD10-FRONT ISS 2 (PANEL).pdf; #POD #SERIES/POD PANELS - #Mechanical #DA #2016/
     POD - OLD ISSUSES/POD10-REAR ISS 1.pdf, POD - NOT IN ERP/POD10-110-REAR ISS 2.pdf; POD10 - #SILK/OLD ISSUSES/POD10.pdf
     (the front and rear panel illustration: rocker, six square buttons, terminal strips, DE9, fuse, mains cord)
   - Link partners: ../pod9.js (POD9 master side of the slave port, pod9v102.asm) and ../pod10a.js
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const Y = y => SIM.year(y);
const hex2 = v => '0x'+(v&255).toString(16).padStart(2,'0').toUpperCase();
const hx = v => (v&255).toString(16).padStart(2,'0').toUpperCase();
const bin8 = v => (v&255).toString(2).padStart(8,'0');
const card = (h, body) => `<div class="card"><h2>${h}</h2>${body}</div>`;

/* ---------------- constants from the source, the netlist and pod9.js ---------------- */
const C = {
  FOSC: 4.9152e6,            // X1 "4M915" (POD10.net, schematic page 2: 4M915, C6/C7 22p)
  TCY: 4/4.9152e6,           // 813.8 ns
  BAUD: 9600,                // SPBRG = 0x07, BRGH = 0 → Fosc/(64·8) = 9600 exactly (manual: 9600, 8 bits, no parity)
  DEB: 0x70,                 // bcount reload: 112 identical passes (V1.00 used 0xFE)
  T2: 65536,                 // T2CON = 0xFF, PR2 = 0xFF: 1:16 × 256 × 1:16 = 65 536 Tcy = 53.33 ms (timer_check reloads 0xFF)
  REC: 4,                    // spi_rec_count = 0x04: POD10 acts on every 4th valid POD9 command
  TRAN: 0x20,                // spi_tran_count = 0x20: a change is repeated in 32 data slots
  P9_TICK: 4176,             // POD9 slave-port byte period in Tcy: 4096 + the wait for its timer_check (pod9.js F8: 3.40 ms)
  P9_REC0: 8, P9_REC: 7,     // POD9 spi_rec_count 8 at reset, 7 on reload (pod9v102.asm via pod9.js)
  P9_TRAN: 32, P9_AUDIO: 32, // POD9 repeats a press 32 times; 32 ticks without an F0-framed byte → audio = 0xFF, slave off
  P9_DEB: 0.0297,            // POD9 debounce: 254 passes × 117 µs (pod9.js)
  R_DEB: 0.021,              // POD10-041 remote debounce 0xFE passes × ≈83 µs — pass time INFERRED
  SPI_T: 32/4.9152e6,        // POD9 SPI master Fosc/4: 8 bits in 6.5 µs
  PWRT: 0.072,               // PIC16F73 power-up timer if enabled: no __CONFIG in the source — INFERRED
  PRE: -0.30,                // the unit has been running since before t = 0
  HORIZON: 1.0,
  PRESS: 0.15,               // a click holds a button for 150 ms — INFERRED
};
C.BYTE = 10/C.BAUD;                     // start + 8 data + stop = 1.0417 ms
C.T2S = C.T2*C.TCY;                     // 53.33 ms
const AT = [0xFE,0xFE,0xFD,0xFB,0xF7,0xEF,0xDF,0x01];   // audio_table(W): W = 0 falls through the nop to 0xFE; 7 → retlw 0x01
const SCAN = [0,1,2,3,4,5,7,6];                          // input scan order: IN1…IN6, spare (RA0), mix (RA1)
const KBIT = k => k<6 ? k : (k===6 ? 6 : 7);             // k: 0-5 inputs, 6 = MIX (bit 6), 7 = SPARE (bit 7)
const KPIN = ['RA3','RA2','RA5','RA4','RC2','RC1','RA1','RA0'];
const KNET = ['IN1','IN2','IN3','IN4','IN5','IN6','IN_MIX','IN_SPARE'];
const KNAME = k => k<6 ? 'button '+(k+1) : (k===6 ? 'MIX (P4/P2 pin 1)' : 'SPARE (P4/P2 pin 2)');
const XU = ['U9','U8','U7','U6','U5','U4'];              // XPTn → 75176 receiver (POD10.net)
const XT = ['T1','T2','T3','T4','T5','T6'];
const XR = ['R17','R16','R15','R14','R13','R12'];

/* main-loop routines in the order main calls them; idle cost in Tcy including call + return (counted from pd10v103.asm) */
const ROUT = [
  ['clrwdt',          1, 53,  'kick the watchdog (config bits not in the source)'],
  ['input',          28, 129, 'scan RA3 RA2 RA5 RA4 RC2 RC1 RA0 RA1; the first low pin clears its bit in input_reg and returns'],
  ['debounce',       18, 164, '112 identical passes → rel_flag, input_flag bits 0+1, spi_tran_count = 32, clrf remote_flag'],
  ['router',         11, 191, 'input_flag,0 → input_reg; remote_flag,0 → spi_reg (POD9); remote_flag,1 → recieved_reg (RS-422) → PORTB'],
  ['debounce_rel',    5, 214, 'after an accepted press: 112 released passes before the next press can count'],
  ['recieve_uart',    5, 239, 'RCIF → RCREG → recieved_reg, transmit_flag 0+1; FERR/OERR → clear and set CREN'],
  ['reset_uart',      5, 253, 're-writes SPBRG, TXSTA and RCSTA after every received byte'],
  ['translate_uart',  7, 271, 'F0 address byte, then the command; status_check / send_audio build the two reply bytes'],
  ['transmit_uart',  13, 389, 'TRMT = 1 → RC0 low (RS-422 driver off); transmit_flag → RC0 high, TXREG = transmit_reg'],
  ['SPI_trns_cntrl',  5, 407, 'after each SPI byte: the next byte for POD9 = F0 / forwarded RS-422 command / status / command'],
  ['SPI_slave',       5, 466, 'SSPIF → spi_recieved = SSPBUF; SSPBUF = spi_output (sent on the next exchange)'],
  ['SPI_rcv_ctrl',    5, 483, 'F0 header, then POD9 status (bit 7 = 1) → video, or a command (every 4th → remote_flag,0)'],
  ['timer_check',     5, 554, 'TMR2IF every 53.3 ms: restart Timer2; no SPI byte during the tick → video = 0xFF'],
  ['goto main',       2, 66,  ''],
];
const NR = ROUT.length;
const IDLE = ROUT.reduce((a,r)=>a+r[1],0);            // 115 Tcy = 93.6 µs
const NV = ['pre_output','bcount','bounce','input_reg','video','spi_reg','input_flag','rel_flag','remote_flag','spi_flag',
  'transmit_flag','uart_flag','which_flag','recieved_reg','transmit_reg','spi_output','spi_output_temp','spi_tran_count',
  'spi_rec_count','video_flag','spi_recieved','PORTB','RC0'];

/* ---------------- device state (what the user controls) ---------------- */
const D = {
  scenario:'idle', init:null, events:[], press:C.PRESS, log:[], hex:'F0 00',
  inputs: [0,1,2,3,4,5].map(i=>({on:true, fs:[48000,48000,44100,48000,32000,48000][i], vpp:[2,3,2,5,1,2][i], f:[1000,440,997,500,1500,250][i]})),
};
const SCEN = {
  idle:  {name:'Running on input 1, POD9 linked (slave on), nothing pressed', init:{power:true, p9:true, p9slave:true, p9sel:0, serial:'none'}, ev:[]},
  press: {name:'Press 3 at 200 ms (held 150 ms)', init:{power:true, p9:false, p9slave:true, p9sel:0, serial:'none'}, ev:[{t:0.2, type:'btn', k:2, dur:0.15}]},
  afv:   {name:'Audio follows video: POD9 button 5 at 150 ms', init:{power:true, p9:true, p9slave:true, p9sel:0, serial:'none'}, ev:[{t:0.15, type:'p9btn', k:4}]},
  vfa:   {name:'Video follows audio: POD10 button 4 at 150 ms', init:{power:true, p9:true, p9slave:true, p9sel:0, serial:'none'}, ev:[{t:0.15, type:'btn', k:3, dur:0.12}]},
  status:{name:'RS-422: F0 00 (status) at 100 ms, F0 85 at 400 ms', init:{power:true, p9:true, p9slave:true, p9sel:0, serial:'console'}, ev:[{t:0.1, type:'rx', b:0xF0},{t:0.1, type:'rx', b:0x00},{t:0.4, type:'rx', b:0xF0},{t:0.4, type:'rx', b:0x85}]},
  audio7:{name:'RS-422: F0 87 — “audio 7” enables five receivers at once', init:{power:true, p9:false, p9slave:true, p9sel:0, serial:'console'}, ev:[{t:0.2, type:'rx', b:0xF0},{t:0.2, type:'rx', b:0x87}]},
  c0:    {name:'RS-422: F0 C0 (manual: slave ON) with a POD9 linked', init:{power:true, p9:true, p9slave:true, p9sel:2, serial:'console'}, ev:[{t:0.1, type:'rx', b:0xF0},{t:0.1, type:'rx', b:0xC0}]},
  unplug:{name:'Slave-port cable pulled at 300 ms', init:{power:true, p9:true, p9slave:true, p9sel:0, serial:'console'}, ev:[{t:0.3, type:'p9link', on:false},{t:0.6, type:'rx', b:0xF0},{t:0.6, type:'rx', b:0x00}]},
  remote:{name:'POD10-041 remote on CONTROL: remote button 2 at 250 ms', init:{power:true, p9:false, p9slave:true, p9sel:0, serial:'remote'}, ev:[{t:0.25, type:'rbtn', k:1}]},
  cold:  {name:'Power-up from cold at 50 ms, POD9 linked', init:{power:false, p9:true, p9slave:true, p9sel:3, serial:'none'}, ev:[{t:0.05, type:'power', on:true}]},
};
function loadScenario(id){ const s = SCEN[id]; D.scenario = id; D.init = JSON.parse(JSON.stringify(s.init)); D.events = JSON.parse(JSON.stringify(s.ev)); EMU_KEY = ''; }

/* =====================================================================
   THE EMULATOR — pd10v103.asm pass by pass on a PIC16F73 at 4.9152 MHz, with its own variables and cycle counts,
   plus the hardware around it: the USART (9600 8N1, 2-byte RCREG FIFO, OERR, TSR/TRMT), the SSP in SPI slave mode,
   Timer2, the POD9 on the slave port (its SPI side from pod9.js) and the POD10-041 remote (pod2r101.asm).
   ===================================================================== */
let EMU = null, EMU_KEY = '';
function emulate(){
  const key = JSON.stringify([D.init, D.events, D.inputs]);
  if (key === EMU_KEY && EMU) return EMU;
  EMU_KEY = key;
  const TCY = C.TCY, H = C.HORIZON;
  const N = Math.ceil((H - C.PRE)/(100*TCY)) + 200;
  const P = { t0:new Float64Array(N), cyc:new Uint8Array(N*NR), snap:new Int16Array(N*NV.length), n:0 };
  const sig = {}; const rec = (k,t,v)=>{ const a = sig[k] || (sig[k]=[]); if (a.length){ const l=a[a.length-1]; if (l[1]===v) return; if (t<=l[0]){ l[1]=v; return; } } a.push([t,v]); };
  const notes = []; const note = (t,txt,cls)=>notes.push({t, txt, cls:cls||''});
  const rxF = [], txF = [], spiX = [], ticks = [], r9F = [], sw = [];
  const ev = D.events.slice().sort((a,b)=>a.t-b.t);
  const presses = ev.filter(e=>e.type==='btn');
  const pressedAt = tt => { const s = new Set(); for (const e of presses) if (tt>=e.t && tt<e.t+(e.dur||C.PRESS)) s.add(e.k); return s; };

  /* ---- the world ---- */
  const W = { power: !!D.init.power, p9: !!D.init.p9, serial: D.init.serial };
  const P9 = { slave: !!D.init.p9slave, sel: D.init.p9sel|0, alt:false, tran:C.P9_TRAN, inflag:false, rec:C.P9_REC, hdr:false, audio:0xFF, acount:C.P9_AUDIO, miso:0xFF, next:C.PRE+0.0011, pend:null };
  const R = { next:C.PRE+0.0173, alt:false, pend:null, audio:0x7E, video:0xFE, pov:0xFE, poa:0xFE, vout:0x00, sent:0 };
  let ei = 0, rxQ = [], rcFifo = [], oerr = false, tsrEnd = -1e9, sspIF = false, sspIn = 0, sspOut = 0x00, tmrAt = Infinity;
  let V = null, alive = false, bootAt = W.power ? C.PRE - 1 : null, lastRxEnd = -1e9;
  rec('power', C.PRE, W.power?1:0); rec('p9link', C.PRE, W.p9?1:0); rec('serial', C.PRE, W.serial);
  rec('p9sel', C.PRE, P9.sel); rec('p9slave', C.PRE, P9.slave?1:0); rec('r.leds', C.PRE, R.audio);
  const rxByte = (t0, b, src) => { const s = Math.max(t0, lastRxEnd); lastRxEnd = s + C.BYTE; rxQ.push({t0:s, tEnd:s+C.BYTE, b, src}); rxF.push({t0:s, b, src}); };

  /* ---- POD9 (master) side of the slave port: its SPI_trns_cntrl / SPI_rcv_ctrl as emulated in pod9.js ---- */
  function p9Out(){
    if (!P9.alt){ P9.alt = true; return 0xF0; }
    P9.alt = false; let o = 0xFF;
    if (P9.inflag){ if (--P9.tran <= 0){ P9.inflag = false; P9.tran = C.P9_TRAN; } if (P9.slave) o &= 0x7F; }
    o &= ~(1<<P9.sel); if (P9.slave) o &= ~0x40;
    if (!(o & 0x80)) o |= 0x40;                 // "btfss spi_output,7 / bsf spi_output,6": commands always carry bit 6 = 1
    return o & 255;
  }
  function p9Rcv(b, t){
    if (b === 0xF0){ P9.hdr = true; return; }
    if (!P9.hdr){ P9.rec = C.P9_REC; return; }
    P9.hdr = false; P9.acount = C.P9_AUDIO;
    if (b & 0x80){ const na = b & 0x7F; if (na !== P9.audio) note(t, `POD9 SPI_rcv_ctrl: POD10 status ${hex2(b)} → POD9 “audio” = ${hex2(na)} (it reports this as the 2nd byte of its own RS-422 status)`, 'p9'); P9.audio = na; return; }
    if (--P9.rec > 0) return;
    P9.rec = C.P9_REC;
    let k = -1; for (let i=0;i<6;i++) if (!(b & (1<<i))){ k = i; break; }
    const sl = !(b & 0x40);
    if (k < 0){ note(t, `POD9: command ${hex2(b)} counted out but has no input bit low — POD9 blanks its crosspoint (pod9.js F7)`, 'warn'); return; }
    const was = P9.sel, wasS = P9.slave; P9.sel = k; P9.slave = sl; rec('p9sel', t, k); rec('p9slave', t, sl?1:0);
    if (was !== k || wasS !== sl) note(t, `POD9 SPI_rcv_ctrl: command ${hex2(b)} counted down (8 the first time, then 7) → remote_flag,0 → POD9 router: video ${was+1} → ${k+1}${wasS!==sl?`, A/V SLAVE ${sl?'ON':'OFF'} (command bit 6 = ${(b>>6)&1})`:''}`, 'p9');
  }
  function p9Tick(t){
    if (P9.pend && P9.pend.t <= t){ const k = P9.pend.k; P9.pend = null; P9.sel = k; rec('p9sel', t, k); if (P9.slave){ P9.inflag = true; P9.tran = C.P9_TRAN; }
      note(t, `POD9 debounce done: video ${k+1}${P9.slave?' — slave on, so its next 32 data slots carry the command '+hex2(0x40|(0x3F&~(1<<k)))+' (bit 7 = 0)':' — slave off: only status bytes go to POD10'}`, 'p9'); }
    if (--P9.acount <= 0){ P9.acount = C.P9_AUDIO; if (P9.audio !== 0xFF || P9.slave){ note(t, 'POD9 timer_check: 32 ticks without an F0-framed byte from the audio switcher → audio = 0xFF, A/V SLAVE LED off', 'warn'); } P9.audio = 0xFF; if (P9.slave){ P9.slave = false; rec('p9slave', t, 0); } }
    const out = p9Out(), got = P9.miso, te = t + C.SPI_T;
    let miso = 0xFF;
    if (W.power && alive){ miso = sspOut; if (sspIF) note(te, 'SSPOV: a new SPI byte arrived before SPI_slave read the last one', 'warn'); sspIn = out; sspIF = true; }
    P9.miso = miso; spiX.push({t:te, mosi:out, miso, on:W.power && alive});
    p9Rcv(got, te);
  }
  /* ---- POD10-041 remote on CONTROL (Remote/pod2r101.asm, audio-only POD2R build cut to two buttons) ---- */
  const uartSetup = w => { let t = 1; for (let i=0;i<6;i++){ if (!((w>>i)&1)) break; t++; } return t; };
  function rTick(t){
    let b;
    if (!R.alt){ R.alt = true; b = 0xF0; }
    else { R.alt = false;
      if (R.pend && R.pend.t <= t){ const k = R.pend.k; R.pend = null; R.poa = (0xFF & ~(1<<k)); R.audio = R.poa & 0x7F; rec('r.leds', t, R.audio);
        const aaa = uartSetup(R.poa), vvv = uartSetup(R.vout);
        if (!(R.pov & 0x40)){ b = 0xC0 | vvv; note(t, `Remote trans_setup → output_info: pre_output_video bit 6 = 0 (POD9 slave on, from the last status) → slave_mode: 0xC0 | uart_setup(video_output) = ${hex2(b)} — button ${k+1} is not in the byte (video_output is never written; power-up RAM 00 ${'assumed'})`, 'warn'); }
        else { b = 0x80 | ((vvv<<3)&0x38) | aaa; note(t, `Remote trans_setup → output_info: audio = uart_setup(${hex2(R.poa)}) = ${aaa}, video_only: uart_setup(video_output) = ${vvv} (never written; RAM 00 assumed) → ${hex2(b)} = 10 ${bin8(b).slice(2,5)} ${bin8(b).slice(5)}`, 'rem'); }
      } else b = 0x00; }
    rxByte(t, b, 'remote'); R.sent++;
  }
  function rRx(b, t){
    if (b & 0x80){ R.video = (~b)&255; R.pov = R.video; }
    else { R.poa = (~b)&255; R.audio = R.poa & 0x7F; rec('r.leds', t, R.audio); }
  }

  /* ---- PIC16F73 routines (names as in pd10v103.asm) ---- */
  function setPortB(v, t, why){ const chg = (v & 255) !== V.PORTB || why==='init'; V.pre_output = v & 255; V.PORTB = v & 255; rec('PORTB', t, V.PORTB); if (chg) sw.push({t, v:V.PORTB, why}); return chg; }
  function spiUartSetup(w){ V.spi_output_temp = w & 0x7F; V.spi_output = 0xF0; V.remote_flag |= 0x0C; }
  function input(t){
    V.input_reg = 0xFF; const pr = pressedAt(t);
    for (let j=0;j<8;j++){ const k = SCAN[j]; if (pr.has(k)){ V.input_reg &= ~(1<<KBIT(k)); return j<7 ? 9+3*j : 30; } }
    return 28;
  }
  function debounce(t){
    if (V.rel_flag & 1) return 5;
    if (V.input_reg === 0xFF){ V.bcount = 0x70; return 18; }
    let c = 8;
    if (V.bcount === 0x70){ V.bounce = V.input_reg; c += 7; } else c += 2;
    c += 2;
    if (V.input_reg !== V.bounce){ V.bcount = 0x71; c += 7; } else c += 2;
    V.bcount = (V.bcount - 1) & 255;
    if (V.bcount) return c + 5;
    V.bcount = C.DEB; V.rel_flag |= 1; V.input_flag |= 3; V.spi_tran_count = C.TRAN; const hadQ = V.remote_flag & 0x0C; V.remote_flag = 0;
    note(t, `debounce: 112 identical passes of input_reg = ${hex2(V.input_reg)} → rel_flag,0; input_flag,0 (router) and input_flag,1 (tell POD9); spi_tran_count = 32; clrf remote_flag${hadQ?' — this also throws away an RS-422 command still being forwarded to POD9':''}`, 'in');
    return c + 14;
  }
  function router(t){
    if (V.input_flag & 1){ V.input_flag &= ~1; setPortB(V.input_reg, t, 'button'); note(t, `router: PORTB = pre_output = input_reg = ${hex2(V.PORTB)} → ${selTxt(V.PORTB)}`, 'in'); return 10; }
    if (V.remote_flag & 1){ const ch = setPortB(V.spi_reg, t, 'POD9'); V.remote_flag &= ~1; if (ch) note(t, `router next_route0: remote_flag,0 → PORTB = spi_reg = ${hex2(V.PORTB)} → ${selTxt(V.PORTB)} (audio follows POD9; bit 7 = 0 pulls the RB7 “MIX” LED line low)`, 'spi'); return 13; }
    if (V.remote_flag & 2){ setPortB(V.recieved_reg, t, 'RS-422'); V.remote_flag &= ~2; note(t, `router next_route1: remote_flag,1 → PORTB = recieved_reg = ${hex2(V.PORTB)} → ${selTxt(V.PORTB)}`, 'uart'); return 16; }
    return 11;
  }
  function debounceRel(t){
    if (!(V.rel_flag & 1)) return 5;
    let c = 4;
    if (V.input_reg !== 0xFF){ V.bcount = 0x71; c += 7; } else c += 2;
    V.bcount = (V.bcount - 1) & 255;
    if (V.bcount) return c + 5;
    V.bcount = C.DEB; V.rel_flag &= ~1; note(t, 'debounce_rel: 112 released passes → rel_flag cleared; the next press can count', 'in');
    return c + 9;
  }
  function recieveUart(t){
    if (!rcFifo.length) return 5;
    let c = 15;
    if (oerr){ oerr = false; rec('oerr', t, 0); c += 2; note(t, 'recieve_uart aerror: OERR → bcf/bsf RCSTA,CREN clears it (one of the very few PICs of this family that recover)', 'warn'); }
    const b = rcFifo.shift(); V.recieved_reg = b; V.transmit_flag |= 3; V._fresh = true;
    return c;
  }
  function resetUart(){
    if (!(V.transmit_flag & 1)) return 5;
    if (!(V.transmit_flag & 2)) return 7;
    V.transmit_flag &= ~2; return 19;
  }
  function translateUart(t){
    if (V.which_flag & 1){ V.transmit_flag |= 1; V.which_flag &= ~1; V.transmit_reg = (~V.pre_output) & 0x7F;
      note(t, `translate_uart send_audio: 2nd reply byte = ~pre_output, bit 7 cleared = ${hex2(V.transmit_reg)} (0 S 654321: 1 = selected)`, 'uart'); return 13; }
    if (!(V.transmit_flag & 1)) return 7;
    const r = V.recieved_reg, fresh = V._fresh; V._fresh = false;
    if (r === 0xF0){ V.uart_flag |= 0x80; V.transmit_flag &= ~1; note(t, 'translate_uart: F0 address byte → uart_flag,7; transmit_flag,0 cleared (no reply)', 'uart'); return 14; }
    if (!(V.uart_flag & 0x80)){ if (fresh) note(t, `translate_uart next_check1: ${hex2(r)} without a preceding F0 → return, but transmit_flag,0 stays set: transmit_uart re-sends the stale transmit_reg ${hex2(V.transmit_reg)}`, 'warn'); return 14; }
    V.uart_flag &= ~0x80;
    let what, c;
    if (!(r & 0x80)){ what = (r & 0x40) ? '01xx xxxx SUM AUDIO: “btfsc recieved_reg,6 / goto status_check” and the fall-through both reach status_check — ignored, as the manual says' : '00xx xxxx REQUEST STATUS'; c = 24; }
    else if (r & 0x40){
      const a = r & 7;
      if (a === 0){ spiUartSetup(V.video); V.spi_output_temp |= 0x40; c = 30;
        what = `11xx x000 → slave_off: POD9 is sent its own video ${hex2(V.spi_output_temp)} with bit 6 = 1 ×32 → POD9 A/V SLAVE OFF (the manual says F0 C0 turns it ON)`; }
      else if (a === 7){ spiUartSetup(V.video); V.spi_output_temp &= ~0x40; V.recieved_reg = V.pre_output | 0x40; V.remote_flag |= 2; V.remote_flag &= ~1; V.input_flag = 0; c = 36;
        what = `11xx x111 → slave_on: POD9 is sent ${hex2(V.spi_output_temp)} (bit 6 = 0) → POD9 A/V SLAVE ON (manual: C7 = OFF); recieved_reg = pre_output | 0x40 re-applies the current audio`; }
      else { V.recieved_reg = AT[a]; spiUartSetup(AT[a]); V.spi_output_temp &= ~0x40; V.recieved_reg |= 0x40; V.remote_flag |= 2; V.remote_flag &= ~1; V.input_flag = 0; c = 40;
        what = `11xx x${a.toString(2).padStart(3,'0')} → not_on: audio_table(${a}) = ${hex2(AT[a])} → audio ${a}; POD9 is sent ${hex2(V.spi_output_temp)} (video ${a}, bit 6 = 0 = slave on) ×32`; }
    } else {
      if ((r & 0x7F) === 0){ V.recieved_reg = V.pre_output | 0x40; V.remote_flag |= 2; V.remote_flag &= ~1; V.input_flag = 0; c = 30;
        what = '1000 0000 → cancel_sum: recieved_reg = pre_output with bit 6 set → router re-applies the selection'; }
      else { const v = (r>>3)&7, a = r&7, parts = [];
        spiUartSetup(V.video); V.spi_output_temp |= 0x40;
        if (v){ spiUartSetup(AT[v]); V.spi_output_temp |= 0x40; parts.push(`video ${v}: audio_table(${v}) = ${hex2(AT[v])} → POD9 command ${hex2(V.spi_output_temp)} (bit 6 = 1: POD9 follows with slave OFF)${v===7?' — code 7 is 0x01, five video bits low':''}`); }
        else parts.push(`video 0: the “;*******TEST*********” call has already queued POD9's own video with bit 6 = 1 (${hex2(V.spi_output_temp)}) — POD9 slave is switched OFF`);
        if (a){ V.recieved_reg = AT[a]; V.remote_flag &= ~1; V.remote_flag |= 2; V.input_flag = 0; parts.push(`audio ${a}: audio_table(${a}) = ${hex2(AT[a])}${a===7?' — 0x01 enables receivers 2–6 together (and RB7)':''} → recieved_reg, remote_flag,1`); }
        else parts.push('audio 0: audio_only → status_check, no audio change');
        what = `10${bin8(r).slice(2,5)} ${bin8(r).slice(5)} → next_check2: ${parts.join('; ')}`; c = 52; }
    }
    V.which_flag |= 1; V.transmit_reg = ((~V.video) & 255) | 0x80;
    note(t, `translate_uart: command ${hex2(r)} = ${bin8(r)}b. ${what}. status_check: 1st reply byte = ~video | 0x80 = ${hex2(V.transmit_reg)} (1 S 654321, POD9's status)`, 'uart');
    return c;
  }
  function transmitUart(t){
    if (t < tsrEnd) return 9;
    if (V.RC0){ V.RC0 = 0; rec('RC0', t, 0); }
    if (!(V.transmit_flag & 1)) return 13;
    V.transmit_flag &= ~1; V.RC0 = 1; rec('RC0', t+6*TCY, 1);
    const b = V.transmit_reg, st = t + 10*TCY; tsrEnd = st + C.BYTE; txF.push({t0:st, b});
    if (W.serial === 'remote') r9F.push({t:st + C.BYTE, b});
    note(t, `transmit_uart: TRMT = 1 → RC0 high (U2 DS75176 DE on, /RE off), TXREG = ${hex2(b)} → J3 pins 3/8 for ${SIM.fmtDur(C.BYTE)}`, 'uart');
    return 16;
  }
  function spiTrns(t){
    if (!(V.spi_flag & 1)) return 5;
    V.spi_flag &= ~1;
    if (V.remote_flag & 8){ V.spi_output = 0xF0; V.remote_flag &= ~8; return 12; }
    if (V.remote_flag & 4){ V.spi_output = V.spi_output_temp; V.remote_flag &= ~4; V.spi_tran_count = (V.spi_tran_count-1)&255;
      if (V.spi_tran_count){ V.remote_flag |= 0x0C; return 20; }
      V.spi_tran_count = C.TRAN; note(t, 'SPI_trns_cntrl next_rem: 32nd copy of the RS-422 command sent to POD9; spi_tran_count reloaded', 'spi'); return 20; }
    if (!(V.spi_flag & 2)){ V.spi_flag |= 2; V.spi_output = 0xF0; return 18; }
    V.spi_flag &= ~2; V.spi_output = V.pre_output | 0x80;
    if (!(V.input_flag & 2)) return 22;
    V.spi_tran_count = (V.spi_tran_count-1)&255; const first = V.spi_tran_count === C.TRAN-1;
    if (!V.spi_tran_count){ V.input_flag &= ~2; V.spi_tran_count = C.TRAN; }
    V.spi_output &= 0x7F;
    if (!(V.pre_output & 0x40)){ V.spi_output = (V.video | 0x40) & 0x7F; if (first) note(t, `SPI_trns_cntrl special_spi: pre_output bit 6 = 0 (MIX) → POD9 is sent its own video ${hex2(V.spi_output)} with bit 6 = 1: “stop following me” (POD2 SUM logic)`, 'spi'); return 36; }
    if (V.video & 0x40){ V.spi_output |= 0x80; if (first) note(t, `SPI_trns_cntrl no_output: POD9 reports slave OFF (video bit 6 = 1) → the press goes out as status ${hex2(V.spi_output)}, not as a command`, 'spi'); return 38; }
    V.spi_output &= ~0x40; if (first) note(t, `SPI_trns_cntrl do_spi: local press, POD9 slave on → command ${hex2(V.spi_output)} (bit 7 = 0, bit 6 = 0) in this and the next 31 data slots`, 'spi');
    return 37;
  }
  function spiSlave(){
    if (!sspIF) return 5;
    sspIF = false; V.video_flag |= 1; V.spi_recieved = sspIn; sspOut = V.spi_output; V.spi_flag |= 1; return 17;
  }
  function spiRcv(t){
    if (!(V.spi_flag & 1)) return 5;
    const b = V.spi_recieved;
    if (b === 0xF0){ V.spi_flag |= 4; return 11; }
    if (!(V.spi_flag & 4)){ V.spi_rec_count = C.REC; V.spi_flag &= ~4; return 17; }
    V.spi_flag &= ~4;
    if (b & 0x80){ const nv = b | 0x80; if (nv !== V.video) note(t, `SPI_rcv_ctrl: POD9 status ${hex2(b)} → video = ${hex2(nv)} (POD9 on video ${firstLow(nv)+1||'—'}, slave ${nv&0x40?'off':'ON'})`, 'spi'); V.video = nv; rec('video', t, nv); return 19; }
    const hadQ = V.remote_flag & 0x0C, hadP = V.input_flag & 2;
    V.remote_flag = 0; V.input_flag = 0;
    let zeros = 0; for (let i=0;i<6;i++) if (!((b>>i)&1)) zeros++;
    const c = 40;
    if (hadQ || hadP) note(t, `SPI_rcv_ctrl no_update: a POD9 command arrives → clrf remote_flag, clrf input_flag before it is even checked — ${hadQ?'the RS-422 command still being forwarded':'POD10’s own press still being repeated'} is cancelled`, 'warn');
    if (zeros > 1 || !(b & 0x40)){ note(t, `SPI_rcv_ctrl: command ${hex2(b)} rejected (${zeros>1?'more than one input bit low':'bit 6 = 0'}) → outta_here`, 'spi'); return c; }
    if (!zeros) return c + 3;
    V.spi_reg = b; V.spi_rec_count = (V.spi_rec_count-1)&255;
    if (V.spi_rec_count){ return c + 10; }
    V.remote_flag |= 1; V.spi_rec_count = C.REC; V.spi_flag &= ~4;
    note(t, `SPI_rcv_ctrl all_clear → spi_rec_setup: 4th POD9 command ${hex2(b)} → spi_reg, remote_flag,0`, 'spi');
    return c + 14;
  }
  function timerCheck(t){
    if (t < tmrAt) return 5;
    tmrAt = t + 7*TCY + C.T2S; ticks.push(t);
    if (V.video_flag & 1){ V.video_flag &= ~1; return 15; }
    if (V.video !== 0xFF){ note(t, 'timer_check: no SPI byte during the last 53.3 ms tick → video = 0xFF (POD9 absent: status byte 1 now reads 0x80)', 'warn'); }
    V.video = 0xFF; rec('video', t, 0xFF); return 15;
  }
  function init(t){
    V = { pre_output:0xFE, bcount:C.DEB, bounce:0, input_reg:0, video:0xFF, spi_reg:0, input_flag:0, rel_flag:0, remote_flag:0, spi_flag:0,
      transmit_flag:0, uart_flag:0, which_flag:0, recieved_reg:0, transmit_reg:0, spi_output:0, spi_output_temp:0, spi_tran_count:C.TRAN,
      spi_rec_count:C.REC, video_flag:0, spi_recieved:0, PORTB:0xFE, RC0:1, _fresh:false };
    rcFifo = []; oerr = false; sspIF = false; sspOut = 0x00; tsrEnd = -1e9;
    tmrAt = t + 60*TCY + C.T2S;
    setPortB(0xFE, t, 'init'); rec('RC0', t, 1); rec('video', t, 0xFF); rec('oerr', t, 0);
    if (t > C.PRE) note(t, 'init: clrf the work registers, ADCON1 → port A digital, TRISA = 0xFF, TRISC = 0x9E, TRISB = 0 (outputs), SPBRG = 0x07 (9600), TXEN; PORTB = pre_output = 0xFE (input 1); bcount = 0x70; RC0 high; SPEN + CREN; T2CON = 0xFF; video = 0xFF; SSPCON = 0x25 (SPI slave, SS disabled); spi_tran_count = 0x20, spi_rec_count = 0x04', 'boot');
    return 60;
  }

  /* ---- events, ticks and byte arrivals up to time t ---- */
  function world(t){
    for (let guard=0; guard<10000; guard++){
      const tE = ei < ev.length ? ev[ei].t : Infinity;
      const t9 = W.p9 ? P9.next : Infinity;
      const tR = W.serial==='remote' ? R.next : Infinity;
      const tQ = rxQ.length ? rxQ[0].tEnd : Infinity;
      const tT = r9F.length ? r9F[0].t : Infinity;
      const tn = Math.min(tE, t9, tR, tQ, tT);
      if (tn > t) return;
      if (tn === tQ){ const q = rxQ.shift();
        if (W.power && alive){ if (oerr){ note(tn, `${hex2(q.b)} lost: OERR is set until recieve_uart toggles CREN`, 'warn'); }
          else if (rcFifo.length >= 2){ oerr = true; rec('oerr', tn, 1); note(tn, `OVERRUN: ${hex2(q.b)} completes with two bytes already waiting in RCREG → OERR`, 'warn'); }
          else rcFifo.push(q.b); }
        continue; }
      if (tn === tT){ const q = r9F.shift(); if (W.serial==='remote') rRx(q.b, tn); continue; }
      if (tn === t9){ p9Tick(tn); P9.next += C.P9_TICK*C.TCY; continue; }
      if (tn === tR){ rTick(tn); R.next += C.T2S; continue; }
      const e = ev[ei++];
      if (e.type==='power'){ if (e.on && !W.power){ W.power = true; bootAt = e.t; rec('power', e.t, 1); note(e.t, 'Mains on: T9 229B12 → 1N4003 ×2 → C1 470 µF → LM317 (R9 221 Ω / R10 665 Ω = 5.01 V); the PWR LED lights at once from +V through R1 2 kΩ; the PIC waits out its power-up timer ('+inf+')', 'boot'); }
        else if (!e.on && W.power){ W.power = false; alive = false; V = null; rec('power', e.t, 0); rec('PORTB', e.t, -1); rec('RC0', e.t, 0); note(e.t, 'Mains off: +5 V collapses, every receiver and LED goes dark, OUT 1/2 stop', 'boot'); } }
      else if (e.type==='btn'){ note(e.t, `${KNAME(e.k)} ${e.k<6&&e.src!=='gpi'?'pressed on the front panel':'closed on the GPI header P4'} — ${KNET[e.k]} → ${KPIN[e.k]} pulled low through 330 Ω (RP3/RP4), 3K3 pull-up RN1; held ${SIM.fmtDur(e.dur||C.PRESS)}`, 'in'); }
      else if (e.type==='rx'){ if (W.serial==='console') rxByte(e.t, e.b, 'console'); }
      else if (e.type==='serial'){ W.serial = e.v; rec('serial', e.t, e.v); R.next = e.t + 0.003; R.alt = false; note(e.t, `CONTROL (J3 DE9): ${e.v==='none'?'nothing connected':e.v==='console'?'an RS-422 terminal':'the POD10-041 remote (one byte per 53.3 ms tick)'}`, 'in'); }
      else if (e.type==='p9link'){ W.p9 = e.on; rec('p9link', e.t, e.on?1:0); if (e.on){ P9.next = e.t + 0.0013; P9.alt = false; P9.hdr = false; P9.rec = C.P9_REC0; P9.acount = C.P9_AUDIO; }
        note(e.t, e.on ? 'Slave-port cable P3 → POD9 plugged in: POD9 (SPI master) clocks one byte each way per ≈3.4 ms tick' : 'Slave-port cable pulled: SCK stops; POD10 hears nothing more on SDI', 'in'); }
      else if (e.type==='p9btn'){ if (!W.p9){ note(e.t, 'POD9 button pressed, but POD9 is not linked', 'in'); continue; } P9.pend = {k:e.k, t:e.t + C.P9_DEB}; note(e.t, `POD9 front panel: video ${e.k+1} pressed (acts after its ≈30 ms debounce)`, 'p9'); }
      else if (e.type==='p9slave'){ P9.slave = e.on; rec('p9slave', e.t, e.on?1:0); note(e.t, `POD9 A/V SLAVE ${e.on?'ON':'OFF'} (set on the POD9: its RS-422 F0 C7/C0 or the F73 build's button — see pod9.js)`, 'p9'); }
      else if (e.type==='rbtn'){ if (W.serial!=='remote'){ note(e.t, 'Remote button pressed, but no remote is on CONTROL', 'in'); continue; } R.pend = {k:e.k, t:e.t + C.R_DEB}; note(e.t, `POD10-041 remote: button ${e.k+1} pressed (RA${e.k===0?3:2}); it goes out in the next data slot after its debounce`, 'rem'); }
    }
  }

  /* ---- run ---- */
  let t = C.PRE;
  if (W.power){ init(t); alive = true; t += 60*TCY; }
  while (t < H && P.n < N){
    world(t);
    const ext = () => Math.min(H, ei<ev.length ? ev[ei].t : H, W.p9 ? P9.next : H, W.serial==='remote' ? R.next : H, rxQ.length ? rxQ[0].tEnd : H);
    if (!W.power){ t = Math.max(ext(), t + 1e-6); continue; }
    if (!alive){ const ready = bootAt + C.PWRT + 1024/C.FOSC;
      if (t < ready){ t = Math.max(Math.min(ready, ext()), t + 1e-6); continue; }
      alive = true; t += init(t)*TCY; continue; }
    const n = P.n, b = n*NR; let tc = 0;
    const run = (i, fn) => { const c = fn(t + tc*TCY); P.cyc[b+i] = c; tc += c; };
    P.cyc[b] = 1; tc = 1;
    run(1, input); run(2, debounce); run(3, router); run(4, debounceRel); run(5, recieveUart); run(6, resetUart);
    run(7, translateUart); run(8, transmitUart); run(9, spiTrns); run(10, spiSlave); run(11, spiRcv); run(12, timerCheck);
    P.cyc[b+13] = 2; tc += 2;
    P.t0[n] = t; const s = n*NV.length; for (let i=0;i<NV.length;i++) P.snap[s+i] = V[NV[i]]|0;
    P.n++;
    rec('bcount', t, V.bcount); rec('rel', t, V.rel_flag&1);
    t += tc*TCY;
  }
  rec('end', H, 1);
  notes.sort((a,b)=>a.t-b.t);
  EMU = { P, sig, notes, rxF, txF, spiX, ticks, sw, R, P9 };
  return EMU;
}

/* ---------------- signal access ---------------- */
function idxAt(a, t){ let lo=0, hi=a.length-1; if (!a.length || a[0][0]>t) return -1; while (lo<hi){ const m=(lo+hi+1)>>1; if (a[m][0]<=t) lo=m; else hi=m-1; } return lo; }
function sv(name, t, def){ const a = emulate().sig[name]; if (!a) return def; const i = idxAt(a,t); return i<0 ? def : a[i][1]; }
const fin = (name, def) => sv(name, C.HORIZON, def);
function firstLow(v){ for (let i=0;i<6;i++) if (!((v>>i)&1)) return i; return -1; }
function lowList(v){ const r=[]; for (let i=0;i<6;i++) if (!((v>>i)&1)) r.push(i); return r; }
function selTxt(P){ if (P<0) return 'off'; const l = lowList(P);
  let s = !l.length ? 'no input' : l.length===1 ? 'input '+(l[0]+1) : 'inputs '+l.map(i=>i+1).join('+')+' at once';
  if (!(P&0x40)) s += ', RB6 low'; if (!(P&0x80)) s += ', RB7 low'; return s; }
function outAt(t){ const P = sv('PORTB', t, -1); if (!sv('power',t,0) || P<0) return {s:null, P}; const l = lowList(P);
  if (!l.length) return {s:-1, P}; if (l.length>1) return {s:-2, P, l}; const i = D.inputs[l[0]]; return {s:l[0], P, ok: i.on && i.vpp>=0.2}; }
const srcTxt = o => o.s===null ? 'off' : o.s===-1 ? 'no receiver enabled (bus floats)' : o.s===-2 ? 'CONTENTION: '+o.l.map(i=>'IN '+(i+1)).join(' + ') : 'IN '+(o.s+1)+(o.ok?'':' (no signal)');
function passAt(t){ const P = emulate().P; let lo=0, hi=P.n-1; if (!P.n || P.t0[0]>t) return -1; while (lo<hi){ const m=(lo+hi+1)>>1; if (P.t0[m]<=t) lo=m; else hi=m-1; } return lo; }
function snap(n){ const P = emulate().P; if (n<0) return null; const o = {}; NV.forEach((k,i)=>o[k] = P.snap[n*NV.length+i]&0xFFFF); return o; }
function passLen(n){ const P = emulate().P; let s=0; for (let i=0;i<NR;i++) s += P.cyc[n*NR+i]; return s; }
function routineAt(t){ const n = passAt(t); if (n<0) return null; const P = emulate().P; let x = P.t0[n];
  for (let i=0;i<NR;i++){ const d = P.cyc[n*NR+i]*C.TCY; if (t < x+d) return {n, i, t0:x}; x += d; } return {n, i:NR-1, t0:x}; }
const pressedNow = t => D.events.filter(e=>e.type==='btn' && t>=e.t && t<e.t+(e.dur||C.PRESS)).map(e=>e.k);

/* ---------------- actions ---------------- */
function act(name, fn){
  const tr = []; const t = SIM.t;
  fn(s=>tr.push(s));
  EMU_KEY = ''; const E = emulate();
  E.notes.filter(n=> n.t >= t-1e-9 && n.t <= t+0.6).slice(0, 16).forEach(n=> tr.push(`<span class="muted">+${SIM.fmtDur(Math.max(0,n.t-t))}</span> ${n.txt}`));
  D.log.unshift({t, name, trace:tr}); if (D.log.length>40) D.log.length = 40;
  SIM.refresh();
}
const A = {
  btn(k, src){ const t=SIM.t; act(`${KNAME(k)} ${src==='gpi'?'(GPI P4)':''} held ${Math.round(D.press*1000)} ms`, tr=>{
      if (!sv('power',t,0)) tr('The unit is off: nothing happens.');
      tr(`${KNET[k]} → ${KPIN[k]} (PIC pin ${[5,4,7,6,13,12,3,2][k]}). <span class="mono">input</span> polls it once per main-loop pass (≈${SIM.fmtDur(IDLE*C.TCY)}); <span class="mono">debounce</span> needs 112 identical passes.`);
      D.events.push({t, type:'btn', k, dur:D.press, src, user:true}); }); },
  chord(a, b){ const t=SIM.t; act(`Buttons ${a+1} and ${b+1} together`, tr=>{ tr('Both pins low at once: <span class="mono">input</span> returns at the first low pin it scans (RA3, RA2, RA5, RA4, RC2, RC1, RA0, RA1).');
      D.events.push({t, type:'btn', k:a, dur:D.press, user:true}, {t, type:'btn', k:b, dur:D.press, user:true}); }); },
  power(){ const t=SIM.t, on=!!sv('power',t,0); act(`Power ${on?'off':'on'} (front rocker)`, tr=>{ tr(on?'Rocker off: T9 primary open.':'Rocker on: T9 229B12 → LM317 +5 V.'); D.events.push({t, type:'power', on:!on, user:true}); }); },
  p9link(){ const t=SIM.t, on=!!sv('p9link',t,0); act(`Slave-port cable ${on?'pulled':'connected'} (P3 ↔ POD9)`, tr=>{ tr('P3 pin 1 SCK (RC3), 2 SDO (RC5), 3 SDI (RC4), 4 GND — 100 Ω in each line (R2–R4). POD9 is the SPI master.'); D.events.push({t, type:'p9link', on:!on, user:true}); }); },
  p9btn(k){ const t=SIM.t; act(`POD9: press video ${k+1}`, tr=>{ tr('POD9 side simulated from pod9.js (pod9v102.asm): ≈30 ms debounce, then 32 data slots of command if its A/V SLAVE is on.'); D.events.push({t, type:'p9btn', k, user:true}); }); },
  p9slave(){ const t=SIM.t, on=!!sv('p9slave',t,0); act(`POD9 A/V SLAVE ${on?'off':'on'}`, tr=>{ tr('Set on the POD9 (its own RS-422 F0 C7 / C0, or the button of the F73 build). POD10 learns it from bit 6 of the POD9 status bytes.'); D.events.push({t, type:'p9slave', on:!on, user:true}); }); },
  serial(v){ const t=SIM.t; act(`CONTROL → ${SERIAL[v]}`, tr=>{ tr('J3 DE9: RX pair pins 7/2 (U1), TX pair 3/8 (U2), 5/9 ground, pin 1 = +5 V only if LK2 is fitted.'); D.events.push({t, type:'serial', v, user:true}); }); },
  rbtn(k){ const t=SIM.t; act(`Remote: press ${k+1}`, tr=>{ tr('POD10-041 remote (pod2r101.asm, inputs 3–6 commented out).'); D.events.push({t, type:'rbtn', k, user:true}); }); },
  send(bytes){ const t=SIM.t; act(`RS-422 send ${bytes.map(hx).join(' ')}`, tr=>{ if (sv('serial',t,'none')!=='console'){ D.events.push({t, type:'serial', v:'console', user:true}); tr('A terminal was connected to CONTROL first.'); }
      tr(`${bytes.length} byte(s) at 9600 8N1 = ${SIM.fmtDur(bytes.length*C.BYTE)} on J3 pins 7/2 → U1 → RC7.`); bytes.forEach(b=> D.events.push({t, type:'rx', b, user:true})); }); },
  input(i, prop, v){ D.inputs[i][prop] = v; EMU_KEY = '';
    D.log.unshift({t:SIM.t, name:`IN ${i+1}: ${prop==='on'?(v?'source connected':'unplugged'):prop==='fs'?(v/1000)+' kHz':v+' Vpp'}`, trace:[`Signal only — the PIC never sees the audio. ${XT[i]} PE-65612 → ${XR[i]} 110 Ω → ${XU[i]} DS75176 receiver, enabled by XPT${i+1} low.`]}); SIM.refresh(); },
  scenario(id){ loadScenario(id); D.log.unshift({t:0, name:'Scenario: '+SCEN[id].name, trace:['The firmware was re-run from '+C.PRE+' s to 1 s.']}); SIM.seek(0); SIM.refresh(); },
  clear(){ D.events = D.events.filter(e=>!e.user); EMU_KEY=''; D.log.unshift({t:SIM.t, name:'Cleared your actions', trace:['Back to the scenario events only.']}); SIM.refresh(); },
};
const SERIAL = {none:'nothing', console:'RS-422 terminal (manual protocol)', remote:'POD10-041 remote (pod2r101.asm)'};
function parseHex(s){ return (s.match(/[0-9a-fA-F]{1,2}/g)||[]).map(x=>parseInt(x,16)&255); }

/* ================================================================
   DRAWING: front and rear panels on the real silkscreen
   ================================================================ */
/* Front: POD10-FRONT-SILK(CURVE).pdf, 1720 × 320 px at 200 dpi (panel 8.57 × 1.606 in). Drill crosshairs on the art:
   mounting (42,157) (1675,160), power LED (295,222), INPUT SELECT buttons (779 + 150·n, 162).
   The PDF's substituted font made “PODS” 295 px wide; it was scaled to 246 px and set between the green bars (x 264–510),
   as on the POD10A panel. Rocker from POD10-FRONT ISS 2 (PANEL).pdf: .505 × .770 rectangle centred .900 in from the left, .950 in up → (180,131); button-board
   screws .140 c'sk at 4.275 and 7.275 in → (855,162) (1455,162). Panel black, ink white and green (layer names on the sheet).
   Rear: POD10SLK.CDR (old issue, the 6-input /110 rear) — labels only; the terminal strips, DE9, fuse and cord are placed from
   POD10.pdf (illustration) and POD10-REAR ISS 1.pdf (inside view, mirrored): DE9 screws 0.984 in apart at x 1177 ± 98. */
const ASSET = 'siumulation-plugins/assets/';
const ART_F = '#POD #SERIES/POD10A - #Master/POD10A - #ARTWORK #DA #2016 /POD10-FRONT-SILK(CURVE).CDR';
const ART_R = '#POD #SERIES/XXX - POD10 - #Master #OBSOLETE/POD10 - #Engineering/POD10 - #SILK/OLD ISSUSES/POD10SLK.CDR';
const artNote = () => `<div class="small muted" style="margin-top:4px">Panel artwork (CorelDRAW, vector): front ${SIM.src(ART_F,'POD10-FRONT-SILK(CURVE).CDR')} (AUG.13/10 issue, file Oct 1 2015; GREEN + WHITE plates), rear ${SIM.src(ART_R,'OLD ISSUSES/POD10SLK.CDR')} (6-input /110 rear, WHITE plate, live text).</div>`;
const BX = n => 779 + 150*n, BY = 162;
function screw(x,y,r){ return `<circle cx="${x}" cy="${y}" r="${r}" fill="#8f9295" stroke="#55585b" stroke-width="2"/><path d="M${x-r*.55} ${y} h${r*1.1} M${x} ${y-r*.55} v${r*1.1}" stroke="#47494c" stroke-width="2.5"/>`; }
function frontSVG(t, opts){
  opts = opts||{};
  const on = !!sv('power',t,0), P = sv('PORTB',t,-1), pr = pressedNow(t);
  return `<svg viewBox="0 0 1720 320" role="img" aria-label="POD10 front panel (real silkscreen)" style="width:100%;max-width:${opts.max||980}px;border-radius:8px;display:block">
    <defs><filter id="p10glow" x="-120%" y="-120%" width="340%" height="340%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <radialGradient id="p10lit"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#ff6a5a"/><stop offset="1" stop-color="#b0201c"/></radialGradient></defs>
    <rect width="1720" height="320" rx="8" fill="#1f1d1d"/>
    <image href="${ASSET}pod10-front.svg" width="1720" height="320"/>
    <g class="p10f" data-a="power" style="cursor:pointer"><title>Power rocker PWRSW (PAN256) in the T9 primary — click</title>
      <rect x="130" y="54" width="101" height="154" rx="6" fill="#0b0b0c" stroke="#3a3536" stroke-width="2"/>
      <rect x="142" y="${on?66:131}" width="77" height="64" rx="5" fill="#2a2728" stroke="#4a4546"/>
      <text x="180" y="${on?106:171}" text-anchor="middle" font-size="26" fill="#bbb">${on?'I':'O'}</text></g>
    <circle cx="295" cy="222" r="14" fill="#0a0909"/><circle cx="295" cy="222" r="9" fill="${on?'#7dff6a':'#243024'}" ${on?'filter="url(#p10glow)"':''}><title>PWR LED (green, LEDRA2) from +V through R1 2 kΩ — lit whenever the rocker is on</title></circle>
    ${screw(42,157,12)}${screw(1675,160,12)}${screw(855,162,9)}${screw(1455,162,9)}
    ${[0,1,2,3,4,5].map(n=>{ const x=BX(n), lit = on && P>=0 && !((P>>n)&1), dn = pr.includes(n);
      return `<g class="p10f" data-a="btn" data-n="${n}" style="cursor:pointer"><title>INPUT SELECT ${n+1}: ${KNET[n]} → ${KPIN[n]}; lamp on XPT${n+1} = RB${n} via ${n%2?'RP2':'RP1'} 330 Ω and P1${lit?' — lit: '+XU[n]+' receiver enabled':''}</title>
        <circle cx="${x}" cy="${BY}" r="44" fill="transparent"/><circle cx="${x}" cy="${BY}" r="40" fill="#060505" stroke="#4a4445" stroke-width="3"/>
        <circle cx="${x}" cy="${dn?BY+2:BY}" r="${dn?30:32}" fill="${lit?'url(#p10lit)':'#3b3a3b'}" stroke="${lit?'#ff9a8a':'#5d5a5b'}" stroke-width="2" ${lit?'filter="url(#p10glow)"':''}/>
        <rect x="${x-13}" y="${BY-5}" width="26" height="10" rx="2" fill="none" stroke="${lit?'#fff3':'#6f6a6b'}" stroke-width="2"/></g>`; }).join('')}
    ${opts.hot||''}
  </svg>`;
}
function termBlock(x0, y, n, pitch, id, tipFn, plugged){
  let s = `<rect x="${x0-14}" y="${y-36}" width="${n*pitch}" height="104" rx="4" fill="#2f8f5a" stroke="#1b5e3a" stroke-width="2"/>`;
  for (let i=0;i<n;i++){ const x = x0 + i*pitch;
    s += `<g ${id?`class="p10r" data-j="${id(i)}" style="cursor:pointer"`:''}><title>${tipFn(i)}</title><circle cx="${x}" cy="${y-8}" r="10" fill="#c9cdd2" stroke="#6d7175"/><path d="M${x-7} ${y-8} h14" stroke="#555" stroke-width="3"/>
      <rect x="${x-9}" y="${y+22}" width="18" height="26" rx="2" fill="#123b25"/>${plugged(i)?`<path d="M${x} ${y+48} q 0 26 ${(i%3-1)*6} 44" stroke="${['#c33','#222','#999'][i%3]}" stroke-width="7" fill="none"/>`:''}</g>`; }
  return s;
}
function rearSVG(t){
  const o = outAt(t), on = !!sv('power',t,0), ser = sv('serial',t,'none');
  const ins = termBlock(473, 95, 18, 28.33, i=>'in'+Math.floor(i/3), i=>{ const k=Math.floor(i/3), inp=D.inputs[k]; return `IN ${k+1} ${['+','−','G'][i%3]} — ${inp.on?(inp.fs/1000)+' kHz AES3, '+inp.vpp+' Vpp (click to unplug)':'nothing connected (click to connect)'}. → P5/P6 → ${XT[k]} → ${XR[k]} 110 Ω → ${XU[k]}`; }, i=>D.inputs[Math.floor(i/3)].on);
  const oc = o.s===null ? '#555' : o.s===-2 ? '#ff5a4a' : o.s<0 || !o.ok ? '#e3a35a' : '#4cc38a';
  const outs = [75,160].map((y,j)=> termBlock(300, y, 3, 26, null, i=>`OUT ${j+1} ${['+','−','G'][i]} — ${j?'U11 → R20/R21 54.9 Ω → C15 → T8 → P6-8/9':'U10 → R18/R19 54.9 Ω → C14 → T7 → P6-11/12'} (OUT 1/2 order inferred) (110 Ω balanced, 3 Vpp terminated): ${srcTxt(o)}`, ()=>false).replace('height="104"','height="72"').replace(`y="${y-36}"`, `y="${y-26}"`)).join('');
  return `<svg viewBox="0 0 1720 320" role="img" aria-label="POD10/110 rear panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <rect width="1720" height="320" rx="8" fill="#1f1d1d"/>
    ${outs}<circle cx="388" cy="62" r="9" fill="${oc}"><title>Output: ${srcTxt(o)}</title></circle>
    ${ins}
    <g class="p10r" data-j="ctl" style="cursor:pointer"><title>CONTROL — J3 DE9S: RX 7/2 (U1), TX 3/8 (U2, enabled by RC0), GND 5/9, +5 V on pin 1 via LK2 (not fitted in the BOM). Now: ${SERIAL[ser]}. Click to cycle.</title>
      <path d="M1106 158 h154 l-12 86 h-130 z" fill="#c9cdd2" stroke="#7a7e82" stroke-width="2"/>${[0,1,2,3,4].map(k=>`<circle cx="${1137+k*23}" cy="184" r="5" fill="#333"/>`).join('')}${[0,1,2,3].map(k=>`<circle cx="${1148+k*23}" cy="212" r="5" fill="#333"/>`).join('')}
      ${screw(1079,200,10)}${screw(1275,200,10)}
      ${ser!=='none'?`<rect x="1128" y="150" width="110" height="100" rx="8" fill="#4a4f57" opacity=".93"/><path d="M1183 250 q 0 40 ${ser==='remote'?-80:80} 66" stroke="#4a4f57" stroke-width="14" fill="none"/><text x="1183" y="206" text-anchor="middle" font-size="18" fill="#ddd">${ser==='remote'?'REMOTE':'PC'}</text>`:''}</g>
    <g class="p10r" data-j="mains" style="cursor:pointer"><title>Fuse holder (1/2 A slow-blow) and the captive 115 VAC cord — click: power</title>
      <circle cx="1374" cy="150" r="46" fill="#111" stroke="#444" stroke-width="3"/><circle cx="1374" cy="150" r="30" fill="#2a2a2a"/><path d="M1360 150 h28" stroke="#555" stroke-width="6"/>
      <circle cx="1534" cy="150" r="48" fill="#151515" stroke="#3a3a3a" stroke-width="3"/><path d="M1534 150 q 40 -60 90 -150" stroke="#222" stroke-width="30" fill="none"/></g>
    ${screw(42,157,12)}${screw(1675,160,12)}
    <image href="${ASSET}pod10-rear.svg" width="1720" height="320"/>
  </svg>`;
}
function bindPanel(root){
  root.querySelectorAll('.p10f').forEach(g=> g.addEventListener('click', ()=>{ const a=g.dataset.a; if (a==='power') A.power(); else if (a==='btn') A.btn(+g.dataset.n,'front'); }));
  root.querySelectorAll('.p10r').forEach(g=> g.addEventListener('click', ()=>{ const j=g.dataset.j;
    if (j==='mains') A.power();
    else if (j==='ctl'){ const ks=Object.keys(SERIAL), cur=sv('serial',SIM.t,'none'); A.serial(ks[(ks.indexOf(cur)+1)%ks.length]); }
    else if (j.startsWith('in')) A.input(+j.slice(2), 'on', !D.inputs[+j.slice(2)].on); }));
}
/* POD9 on the slave port — drawn as a simple control strip (the full POD9 panel and model are in pod9.js) */
function p9HTML(t){
  const link = !!sv('p9link',t,0), sel = sv('p9sel',t,0), sl = !!sv('p9slave',t,0), vid = sv('video',t,0xFF);
  return `<div class="small" style="margin-bottom:6px">POD9 6×1 video switcher on P3 (POD9 = SPI master, ≈3.4 ms per byte). <b>${link?'Linked':'Not linked'}</b>.
      POD10's <span class="mono">video</span> register: <span class="mono">${hex2(vid)}</span> ${vid===0xFF?'(no POD9 seen)':`(POD9 on V${firstLow(vid)+1}, slave ${vid&0x40?'off':'ON'})`}</div>
    <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;${link?'':'opacity:.5'}">
      ${[0,1,2,3,4,5].map(k=>`<button data-p9="${k}" style="min-width:42px;${link&&sel===k?'background:#d33a2c;color:#fff;border-color:#d33a2c':''}">V${k+1}</button>`).join('')}
      <button data-p9="slave" style="${link&&sl?'background:#d9a531;color:#111;border-color:#d9a531':''}">A/V SLAVE ${sl?'on':'off'}</button>
      <button data-p9="link">${link?'Pull P3 cable':'Connect P3 cable'}</button></div>
    <p class="small muted" style="margin:6px 0 0">POD9 side reproduced from pod9.js: it acts on the 8th command from POD10 (then every 7th) and repeats its own changes in 32 data slots; its slave goes off after 32 ticks without an F0-framed byte.</p>`;
}
function bindP9(root){ root.querySelectorAll('[data-p9]').forEach(b=> b.onclick = ()=>{ const v=b.dataset.p9; if (v==='slave') A.p9slave(); else if (v==='link') A.p9link(); else A.p9btn(+v); }); }
function serialHTML(t){
  const ser = sv('serial',t,'none'), E = emulate();
  const near = arr => arr.filter(f=>f.t0 <= t && f.t0 > t-0.25).slice(-10).map(f=>hx(f.b)).join(' ') || '—';
  let rem = '';
  if (ser==='remote'){ const L = sv('r.leds',t,0x7E); rem = `<div style="display:flex;gap:10px;align-items:center;margin-top:6px"><b class="small">POD10-041 remote</b>${[0,1].map(k=>`<button data-rb="${k}" style="min-width:52px;${!((L>>k)&1)?'background:#d33a2c;color:#fff;border-color:#d33a2c':''}">${k+1}</button>`).join('')}<span class="small muted">LEDs = ~(POD10 status byte 2), updated on every reply</span></div>`; }
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
      <label class="small">CONTROL <select data-s="ser">${Object.keys(SERIAL).map(k=>`<option value="${k}" ${k===ser?'selected':''}>${SERIAL[k]}</option>`).join('')}</select></label></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px">
      <input data-s="hex" value="${D.hex}" size="12" class="mono" style="font:inherit;padding:4px 6px;border:1px solid var(--line);border-radius:6px;background:var(--panel2);color:var(--ink)"> <button data-s="send">Send</button>
      ${[['F0 00','status'],['F0 82','audio 2'],['F0 A3','video 4 + audio 3'],['F0 C3','slave A+V 3'],['F0 C0','C0'],['F0 C7','C7'],['F0 80','cancel sum'],['F0 87','audio 7'],['55','stray byte']].map(([h,l])=>`<button data-pre="${h}" title="${l}">${h}</button>`).join('')}</div>
    <div class="small mono" style="margin-top:6px">RX (last 250 ms): ${near(E.rxF)}<br>TX (last 250 ms): ${near(E.txF)}</div>${rem}`;
}
function bindSerial(root){
  const q = s => root.querySelector(s);
  q('[data-s="ser"]').onchange = e=> A.serial(e.target.value);
  q('[data-s="hex"]').oninput = e=>{ D.hex = e.target.value; };
  q('[data-s="send"]').onclick = ()=>{ const b = parseHex(D.hex); if (b.length) A.send(b); };
  root.querySelectorAll('[data-pre]').forEach(b=> b.onclick = ()=>{ D.hex = b.dataset.pre; A.send(parseHex(D.hex)); });
  root.querySelectorAll('[data-rb]').forEach(b=> b.onclick = ()=> A.rbtn(+b.dataset.rb));
}
function controlsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px">
    ${[0,1,2,3,4,5].map(n=>`<button data-b="${n}" title="key ${n+1}">${n+1}</button>`).join('')}
    <button data-g="6" title="P4 pin 1 → RA1 (key M)">MIX (P4)</button><button data-g="7" title="P4 pin 2 → RA0">SPARE (P4)</button>
    <button data-c="1,4" title="Hold 2 and 5 together">2 + 5</button><button data-a="power" title="P">Power</button>
    <label class="small">Hold <select data-a="press">${[0.005,0.012,0.05,0.15,0.4].map(v=>`<option value="${v}" ${v===D.press?'selected':''}>${v*1000} ms</option>`).join('')}</select></label>
    <span class="small muted">Keys 1–6 · M = MIX · P = power</span></div>
    <div class="small muted" style="margin-top:4px">Every action is inserted at the playhead and the firmware is re-run from ${C.PRE} s. A click holds the button for the “Hold” time (${inf}). MIX and SPARE exist only on the 9-pin header P4 / front header P2 pins 1–2; the front panel has six buttons.</div>`;
}
function bindControls(root){
  root.querySelectorAll('button[data-b]').forEach(b=> b.onclick = ()=> A.btn(+b.dataset.b,'front'));
  root.querySelectorAll('button[data-g]').forEach(b=> b.onclick = ()=> A.btn(+b.dataset.g,'gpi'));
  root.querySelectorAll('button[data-c]').forEach(b=> b.onclick = ()=>{ const [a,c]=b.dataset.c.split(',').map(Number); A.chord(a,c); });
  const pw = root.querySelector('button[data-a="power"]'); if (pw) pw.onclick = ()=> A.power();
  const ps = root.querySelector('select[data-a="press"]'); if (ps) ps.onchange = e=>{ D.press = +e.target.value; };
}
function inputsHTML(){
  const o = outAt(SIM.t);
  return `<table class="kv"><tr><th>Input</th><th>source</th><th>rate</th><th>level</th><th>on OUT now</th></tr>${D.inputs.map((p,i)=>`<tr><td>IN ${i+1} <span class="muted">(${XU[i]})</span></td>
      <td><input type="checkbox" data-in="${i}" data-p="on" ${p.on?'checked':''}></td>
      <td><select data-in="${i}" data-p="fs">${[32000,44100,48000,96000].map(f=>`<option value="${f}" ${f===p.fs?'selected':''}>${f/1000} k</option>`).join('')}</select></td>
      <td><select data-in="${i}" data-p="vpp">${[0.1,0.2,1,2,3,5,7].map(f=>`<option value="${f}" ${f===p.vpp?'selected':''}>${f} Vpp</option>`).join('')}</select></td>
      <td class="mono">${o.s===i?'●':o.s===-2&&o.l.includes(i)?'✕':''}</td></tr>`).join('')}</table>
    <p class="small muted">Manual: input 0.2–7 Vpp (110 Ω balanced on /110, 75 Ω on /75), output 3 Vpp terminated, 110 Ω balanced. There is no AES receiver chip: the DS75176 slices the line and re-drives it, so the output is whatever bit stream is on the bus — no re-clocking, no frame alignment.</p>`;
}
function bindInputs(root){ root.querySelectorAll('[data-in]').forEach(el=>{ const i=+el.dataset.in, p=el.dataset.p; el.onchange = ()=> A.input(i, p, p==='on' ? el.checked : +el.value); }); }
window.__pod10Keys = false;
document.addEventListener('keydown', e=>{
  if (!window.__pod10Keys || !/[?&]plugin=pod10(&|$)/.test(location.search) || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k>='1' && k<='6'){ A.btn(+k-1,'front'); e.preventDefault(); }
  else if (k==='m'){ A.btn(6,'gpi'); e.preventDefault(); }
  else if (k==='p'){ A.power(); e.preventDefault(); }
});

/* ---------------- timeline lanes ---------------- */
function drawSig(c, X, t0, t1, y, h, name, colOf, txtOf){
  const a = emulate().sig[name] || []; let i = Math.max(0, idxAt(a, t0));
  c.font = '10.5px '+SIM.css('--sans');
  for (; i < a.length && a[i][0] <= t1; i++){
    const s = Math.max(t0, a[i][0]), e = Math.min(t1, i+1<a.length ? a[i+1][0] : C.HORIZON);
    if (e < t0) continue;
    const col = colOf(a[i][1]); const xa = X(s), xb = X(e);
    if (col){ c.fillStyle = col; c.fillRect(xa, y+3, Math.max(1, xb-xa), h-6); }
    const tx = txtOf && txtOf(a[i][1]);
    if (tx && xb-xa > c.measureText(tx).width+8){ c.fillStyle = col ? '#fff' : SIM.css('--ink2'); c.fillText(tx, xa+4, y+h/2+4); }
  }
}
function drawBytes(c, X, t0, t1, y, h, arr, col){
  c.font = '10.5px '+SIM.css('--mono');
  for (const f of arr){ const a = f.t0, b = f.t0 + C.BYTE; if (b < t0 || a > t1) continue;
    const xa = X(a), xb = X(b); c.fillStyle = col; c.globalAlpha = .8; c.fillRect(xa, y+4, Math.max(2, xb-xa), h-8); c.globalAlpha = 1;
    if (xb-xa > 22){ c.fillStyle = '#fff'; c.fillText(hx(f.b), xa+3, y+h/2+4); }
    if (xb-xa > 160){ // the bits: start, b0…b7 (LSB first), stop
      c.strokeStyle = '#fff'; c.lineWidth = 1.4; c.beginPath(); const bw = (xb-xa)/10; let lv = 1;
      for (let k=0;k<10;k++){ const v = k===0 ? 0 : k===9 ? 1 : (f.b>>(k-1))&1; const yy = v ? y+6 : y+h-6; if (k===0) c.moveTo(xa, y+6); c.lineTo(xa+k*bw, lv ? y+6 : y+h-6); c.lineTo(xa+k*bw, yy); c.lineTo(xa+(k+1)*bw, yy); lv = v; }
      c.stroke(); }
  }
}
const SRCCOL = ['#4c8bf5','#e67e22','#9b59b6','#16a085','#c0392b','#7f8c8d'];
const PHI = i => i*3.17e-6 + 0.4e-6;   // each source's own frame phase (unsynchronised sources) — INFERRED
function lanes(ids){
  const L = {
    aes: {label:'OUT 1/2: AES3 frames', h:30, draw(c,X,t0,t1,y,h){ const a = emulate().sig.PORTB || []; let i = Math.max(0, idxAt(a,t0));
        for (; i<a.length && a[i][0] <= t1; i++){ const s = Math.max(t0,a[i][0]), e = Math.min(t1, i+1<a.length?a[i+1][0]:C.HORIZON); if (e<t0) continue;
          const o = outAt((s+e)/2);
          if (o.s===null){ continue; }
          if (o.s===-2){ c.fillStyle = SIM.css('--bad'); c.globalAlpha=.5; c.fillRect(X(s), y+4, X(e)-X(s), h-8); c.globalAlpha=1; c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--sans'); if (X(e)-X(s)>120) c.fillText('CONTENTION '+o.l.map(k=>k+1).join('+'), X(s)+4, y+h/2+4); continue; }
          if (o.s===-1 || !o.ok){ c.fillStyle = SIM.css('--grid'); c.fillRect(X(s), y+h/2-1, X(e)-X(s), 2); continue; }
          const inp = D.inputs[o.s]; c.save(); c.beginPath(); c.rect(X(s), y, X(e)-X(s), h); c.clip();
          SIM.pulses(c, X, s, e, y, h, 1/inp.fs, PHI(o.s), 4/inp.fs/128*8, SRCCOL[o.s], `frames IN ${o.s+1} ${inp.fs/1000}k`); c.restore(); } } },
    pass: {label:'Main-loop passes', h:26, draw(c,X,t0,t1,y,h){ const E=emulate(), P=E.P; let n = Math.max(0, passAt(t0));
        const px = (X(t0+IDLE*C.TCY)-X(t0));
        if (px < 3){ const k0 = n, k1 = passAt(t1); c.fillStyle = SIM.css('--accent'); c.globalAlpha=.35; c.fillRect(X(t0), y+h*0.3, X(t1)-X(t0), h*0.4); c.globalAlpha=1;
          let busy = 0; for (let k=k0;k<=k1;k++) if (passLen(k) > IDLE+4){ busy++; c.fillStyle = SIM.css('--warn'); c.fillRect(X(P.t0[k]), y+3, 1.5, h-6); }
          c.fillStyle = SIM.css('--ink'); c.font = '11px '+SIM.css('--mono'); c.fillText(`${(k1-k0+1).toLocaleString()} passes (idle ${SIM.fmtDur(IDLE*C.TCY)}), ${busy} doing work`, X(t0)+6, y+h/2+4); return; }
        for (; n < P.n && P.t0[n] <= t1; n++){ let x = P.t0[n];
          for (let i=0;i<NR;i++){ const cy = P.cyc[n*NR+i], d = cy*C.TCY; const busy = cy > ROUT[i][1];
            c.fillStyle = busy ? SIM.css('--warn') : (i%2 ? SIM.css('--accent') : SIM.css('--accent2')); c.globalAlpha = busy ? .95 : .4; c.fillRect(X(x), y+4, Math.max(1, X(x+d)-X(x)-0.5), h-8); c.globalAlpha=1;
            if (X(x+d)-X(x) > 60){ c.fillStyle = SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText(ROUT[i][0]+' '+cy, X(x)+2, y+h/2+3); }
            x += d; } } } },
    btn: {label:'Buttons / GPI pins', h:24, draw(c,X,t0,t1,y,h){ for (const e of D.events){ if (e.type!=='btn') continue; const a=e.t, b=e.t+(e.dur||C.PRESS); if (b<t0||a>t1) continue;
          c.fillStyle = SIM.css('--accent2'); c.fillRect(X(a), y+4, Math.max(2,X(b)-X(a)), h-8); c.fillStyle='#fff'; c.font='10.5px '+SIM.css('--sans'); if (X(b)-X(a)>70) c.fillText(KNET[e.k]+' low', X(a)+4, y+h/2+4); } } },
    bcount: {label:'bcount (debounce counter)', h:34, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'rel', v=> v ? 'color-mix(in srgb, var(--warn) 25%, transparent)' : null, v=> v ? 'rel_flag: waiting for release' : '');
        const a = emulate().sig.bcount || []; c.strokeStyle = SIM.css('--accent'); c.lineWidth = 1.5; c.beginPath(); let i = Math.max(0, idxAt(a,t0)), first = true;
        for (; i<a.length && a[i][0] <= t1; i++){ const s = Math.max(t0,a[i][0]), e = Math.min(t1, i+1<a.length?a[i+1][0]:C.HORIZON); const yy = y+h-3-(a[i][1]/0x71)*(h-6);
          if (first){ c.moveTo(X(s), yy); first=false; } else c.lineTo(X(s), yy); c.lineTo(X(e), yy); } c.stroke(); } },
    portb: {label:'PORTB → XPT1–6 (receiver enables)', h:26, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'PORTB', v=> v<0 ? null : lowList(v).length>1 ? SIM.css('--bad') : lowList(v).length ? SRCCOL[firstLow(v)] : SIM.css('--grid'), v=> v<0 ? 'off' : hex2(v)+' '+selTxt(v)); } },
    spi: {label:'Slave port P3 (SPI, POD9 master)', h:30, draw(c,X,t0,t1,y,h){ const E=emulate(); c.font='10px '+SIM.css('--mono');
        for (const s of E.spiX){ if (s.t<t0||s.t>t1) continue; const x = X(s.t); const cmdIn = !(s.mosi&0x80) && s.mosi!==0xF0, cmdOut = s.on && !(s.miso&0x80);
          c.fillStyle = cmdIn||cmdOut ? SIM.css('--warn') : SIM.css('--accent2'); c.fillRect(x-1, y+4, Math.max(2, X(s.t+C.SPI_T)-x), h-8);
          if (X(t0+3.4e-3)-X(t0) > 46){ c.fillStyle = SIM.css('--ink'); c.fillText('↓'+hx(s.mosi), x+3, y+12); c.fillText('↑'+(s.on?hx(s.miso):'--'), x+3, y+25); } } } },
    video: {label:'POD10 “video” (POD9 status)', h:22, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'video', v=> v===0xFF ? null : (v&0x40 ? SIM.css('--accent2') : SIM.css('--warn')), v=> v===0xFF ? '0xFF — no POD9' : `${hex2(v)} V${firstLow(v)+1} slave ${v&0x40?'off':'ON'}`); } },
    p9: {label:'POD9 video / A/V SLAVE', h:22, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'p9link', v=> v ? null : SIM.css('--grid'), v=> v ? '' : 'POD9 not linked');
        const a = emulate().sig.p9sel || []; let i = Math.max(0, idxAt(a,t0)); c.font='10.5px '+SIM.css('--sans');
        for (; i<a.length && a[i][0] <= t1; i++){ const s=Math.max(t0,a[i][0]), e=Math.min(t1, i+1<a.length?a[i+1][0]:C.HORIZON); if (!sv('p9link',(s+e)/2,0)) continue; c.fillStyle = SRCCOL[a[i][1]]; c.globalAlpha=.7; c.fillRect(X(s), y+4, X(e)-X(s), h-8); c.globalAlpha=1; if (X(e)-X(s)>90){ c.fillStyle='#fff'; c.fillText(`V${a[i][1]+1} · slave ${sv('p9slave',(s+e)/2,0)?'ON':'off'}`, X(s)+4, y+h/2+4); } } } },
    rx: {label:'RS-422 RX (J3 7/2 → RC7)', h:24, draw(c,X,t0,t1,y,h){ drawBytes(c,X,t0,t1,y,h,emulate().rxF, SIM.css('--accent2')); } },
    tx: {label:'RS-422 TX (RC6 → J3 3/8)', h:24, draw(c,X,t0,t1,y,h){ drawBytes(c,X,t0,t1,y,h,emulate().txF, SIM.css('--accent')); } },
    rc0: {label:'RC0 = U2 driver enable', h:18, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'RC0', v=> v ? SIM.css('--accent') : null, v=> v ? 'TX on' : ''); } },
    tmr: {label:'Timer2 TMR2IF (53.3 ms)', h:18, draw(c,X,t0,t1,y,h){ for (const k of emulate().ticks){ if (k<t0||k>t1) continue; c.fillStyle = SIM.css('--play'); c.fillRect(X(k)-1, y+3, 2, h-6); } } },
  };
  return ids.map(id=>L[id]);
}

/* ---------------- shared bits for the views ---------------- */
function traceHTML(){
  if (!D.log.length) return '<div class="muted">Press a button, send a command or press a POD9 button: each action lists the code path it took.</div>';
  return D.log.map(l=>`<div><b>${SIM.fmtT(l.t)}</b> ${l.name}<br>${l.trace.map(x=>'· '+x).join('<br>')}</div>`).join('');
}
function statusLine(t){
  const r = routineAt(t), s = r ? snap(r.n) : null, o = outAt(t);
  return `At ${SIM.fmtT(t)}: ${r?`pass ${r.n} · <b>${ROUT[r.i][0]}</b> · `:''}PORTB ${s?hex2(s.PORTB):'—'} → OUT 1/2 = <b>${srcTxt(o)}</b> · bcount ${s?hex2(s.bcount):'—'}${s&&s.rel_flag&1?' (rel_flag)':''} · video ${s?hex2(s.video):'—'} · RC0 ${s?s.RC0:'—'}`;
}
function scenarioHTML(){ return `<label class="small">Scenario <select data-sc>${Object.keys(SCEN).map(k=>`<option value="${k}" ${k===D.scenario?'selected':''}>${SCEN[k].name}</option>`).join('')}</select></label> <button data-clr>Clear my actions</button>`; }
function bindScenario(root){ const s = root.querySelector('[data-sc]'); if (s) s.onchange = e=> A.scenario(e.target.value); const c = root.querySelector('[data-clr]'); if (c) c.onclick = ()=> A.clear(); }
const ALL_LANES = ['aes','pass','btn','bcount','portb','spi','video','p9','rx','tx','rc0','tmr'];

/* ---------------- Simulator tab ---------------- */
function viewSim(m){
  window.__pod10Keys = true; m._k = {};
  m.innerHTML = `<div class="grid2">
    <div>${card('POD10 at the playhead — front and rear (real silkscreen; click the buttons, the rocker, the input terminals and CONTROL)', `<div id="fp"></div><div id="rp" style="margin-top:8px"></div>${artNote()}<div id="st" class="small mono" style="margin-top:6px"></div><div id="ctl"></div>`)}
      ${card('Timeline — the firmware, the slave port and the serial line', `<canvas id="tl"></canvas><p class="small muted">Click the timeline to move the playhead. Zoom to ≤ 1 ms to see each main-loop pass split into its 14 routines (orange = a routine doing work); ≤ 20 ms to read the SPI and RS-422 bytes.</p>`)}</div>
    <div>${card('Scenario', `<div id="sc"></div>`)}
      ${card('Slave port P3 — POD9 video switcher (audio follow video)', `<div id="p9"></div>`)}
      ${card('CONTROL — RS-422 (J3 DE9)', `<div id="ser"></div>`)}
      ${card('AES/EBU inputs', `<div id="ins"></div>`)}
      ${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div></div>`;
  const q = s => m.querySelector(s);
  q('#ctl').innerHTML = controlsHTML(); bindControls(q('#ctl'));
  const draw = ()=>{
    const t = SIM.t;
    q('#fp').innerHTML = frontSVG(t); q('#rp').innerHTML = rearSVG(t); bindPanel(q('#fp')); bindPanel(q('#rp'));
    q('#st').innerHTML = statusLine(t);
    if (m._k.sc !== D.scenario){ m._k.sc = D.scenario; q('#sc').innerHTML = scenarioHTML(); bindScenario(q('#sc')); }
    q('#p9').innerHTML = p9HTML(t); bindP9(q('#p9'));
    const ks = sv('serial',t,'none')+'|'+D.log.length+'|'+Math.floor(t*20); if (m._k.ser !== ks){ m._k.ser = ks; q('#ser').innerHTML = serialHTML(t); bindSerial(q('#ser')); }
    const ki = JSON.stringify(D.inputs)+outAt(t).s; if (m._k.ins !== ki){ m._k.ins = ki; q('#ins').innerHTML = inputsHTML(); bindInputs(q('#ins')); }
    q('#trace').innerHTML = traceHTML();
    SIM.drawLanes(q('#tl'), lanes(ALL_LANES), {labelW:190});
  };
  SIM.on('time', draw);
}

/* ---------------- Tutorial ---------------- */
const userEv = type => D.events.filter(e=>e.user && e.type===type);
const swAfter = (t, why) => emulate().sw.filter(s=> s.t >= t && (!why || s.why===why));
const LESSONS = [
  { title:'Meet the POD10', body:`<p>The POD10 is a half-rack <b>six by one interlocking digital audio switcher</b> (manual). Six transformer-balanced AES/EBU inputs and two transformer-balanced outputs, on screw terminals (POD10/110, drawn here) or BNCs (POD10/75).</p>
     <p>Front: the power rocker, the green PWR LED and six lit <b>INPUT SELECT</b> buttons. Rear: OUT 1/2, IN 1–6, the <b>CONTROL</b> DE9 (RS-422, 9600 8N1) and the mains cord. Inside: the slave port <b>P3</b> “to video switcher”, for a POD9 in audio-follow-video.</p>
     <p>There is no audio processing at all: each input has a PE-65612 transformer and a <b>DS75176</b> RS-485 transceiver used as a line receiver. The PIC (V1.03: PIC16F73) enables exactly one receiver by pulling its <b>XPT</b> line (PORTB) low; all six receiver outputs share one bus that feeds two more 75176s as output drivers.</p><p class="muted">Hover over the panels. Click “Next”.</p>`, check:()=>true, auto:true },
  { title:'1 · Pick a source', body:`<p>Press <b>3</b> (click it or key 3). <span class="mono">input</span> finds RA5 low and clears bit 2 of <span class="mono">input_reg</span>; <span class="mono">debounce</span> counts <b>112</b> identical passes (≈9.4–10.4 ms), then <span class="mono">router</span> writes it to PORTB. The switch happens while you are still holding the button.</p><p><b>Goal:</b> input 3 on the output.</p>`, check:()=> userEv('btn').some(e=>e.k===2) && lowList(fin('PORTB',-1)).join()==='2', hint:'Click button 3 early in the second (the playhead must be before ≈0.95 s).' },
  { title:'2 · Too short to count', body:`<p>Set <b>Hold</b> to <b>5 ms</b> and press <b>6</b>. Five milliseconds is only ≈53 passes; <span class="mono">bcount</span> starts again from 0x70 as soon as the pin goes high, so the press never reaches 0.</p><p><b>Goal:</b> a press shorter than 9 ms that did not switch.</p>`, check:()=> userEv('btn').some(e=>(e.dur||C.PRESS) < 0.009 && !swAfter(e.t,'button').some(s=>s.t < e.t+0.03)), hint:'Choose Hold = 5 ms in the controls under the panels, then press a button.' },
  { title:'3 · Two buttons at once', body:`<p>Hold <b>2</b> and <b>5</b> together (the “2 + 5” button). <span class="mono">input</span> returns at the first low pin it scans — RA3, RA2, RA5, RA4, RC2, RC1 — so input 2 wins. The interlock is the scan order, not a check. (V1.00 read all pins and could select several inputs at once.)</p><p><b>Goal:</b> input 2 selected by a two-button press.</p>`, check:()=>{ const c = userEv('btn'); return c.some(a=>a.k===1 && c.some(b=>b.k===4 && b.t===a.t) && swAfter(a.t,'button').some(s=>s.v===0xFD && s.t < a.t+0.05)); }, hint:'Use the “2 + 5” button (Hold ≥ 50 ms).' },
  { title:'4 · The splice', body:`<p>The switch is just a different receiver driving the bus. Sources are not locked to each other, so the output jumps from one bit stream to another in the middle of a subframe. Pick zoom <b>100 µs</b> or narrower and put the playhead within 50 µs of a switch; then open <b>One second, in slow motion</b> and look at the AES3 scope.</p><p><b>Goal:</b> playhead at a switch, zoomed in.</p>`, check:()=> SIM.win <= 1.01e-4 && emulate().sw.some(s=> s.t > 0 && s.why!=='init' && Math.abs(SIM.t - s.t) < 5e-5), hint:()=>{ const s = emulate().sw.find(s=>s.t>0 && s.why!=='init'); return s ? `There is one at ${SIM.fmtT(s.t)} (${s.why}). Type it into the slider or click near it on the PORTB lane, then zoom.` : 'Press a button first.'; } },
  { title:'5 · Ask for status over RS-422', body:`<p>Send <b>F0 00</b>. <span class="mono">translate_uart</span> sees the F0 address byte, then <span class="mono">status_check</span> answers <b>~video | 0x80</b> (POD9's state) and, one pass later, <span class="mono">send_audio</span> queues <b>~pre_output &amp; 0x7F</b> (the POD10 state). RC0 turns the U2 driver on only while a byte is going out.</p><p><b>Goal:</b> POD10 transmitted its two-byte reply.</p>`, check:()=>{ const r = userEv('rx').filter(e=>e.b===0x00); return r.length && emulate().txF.filter(f=>f.t0 > Math.min(...r.map(e=>e.t))).length >= 2; }, hint:'Use the “F0 00” preset in the CONTROL card.' },
  { title:'6 · Switch audio from a remote', body:`<p>Send <b>F0 85</b> = <span class="mono">10 000 101</span>: “audio 5, video 0”. <span class="mono">audio_table(5)</span> = 0xEF goes into <span class="mono">recieved_reg</span>, and <span class="mono">router</span> copies it on the next pass. Watch the trace: with a POD9 linked, the “;*******TEST*********” line has also queued a command that switches the POD9's A/V SLAVE off.</p><p><b>Goal:</b> input 5 selected over RS-422.</p>`, check:()=> userEv('rx').some(e=>e.b===0x85) && emulate().sw.some(s=>s.why==='RS-422' && s.v===0xEF), hint:'Type F0 85 in the hex box and press Send.' },
  { title:'7 · Audio follows video', body:`<p>Make sure the POD9 is linked with <b>A/V SLAVE on</b>, then press <b>V5</b> on the POD9 strip. After its ≈30 ms debounce the POD9 sends the command <span class="mono">0x6F</span> (bit 7 = 0) in 32 data slots; POD10's <span class="mono">SPI_rcv_ctrl</span> accepts it on the <b>4th</b> (spi_rec_count = 4) and <span class="mono">router</span> takes <span class="mono">spi_reg</span>.</p><p><b>Goal:</b> POD10 switched to input 5 by the POD9.</p>`, check:()=> userEv('p9btn').some(e=>e.k===4) && emulate().sw.some(s=>s.why==='POD9' && lowList(s.v).join()==='4'), hint:'POD9 must be linked (“Connect P3 cable”) and its A/V SLAVE on before you press V5.' },
  { title:'8 · Video follows audio', body:`<p>Now press <b>4</b> on the POD10. <span class="mono">debounce</span> sets <span class="mono">input_flag,1</span>; for the next 32 data slots <span class="mono">do_spi</span> clears bit 7 and bit 6 (POD9 slave is on) and sends <span class="mono">0x37</span>. The POD9 needs <b>8</b> of them the first time (7 after that) — about 55 ms.</p><p><b>Goal:</b> POD9 on video 4 because you pressed 4 on the POD10.</p>`, check:()=> userEv('btn').some(e=>e.k===3) && fin('p9sel',-1)===3 && fin('p9link',0), hint:'POD9 linked, A/V SLAVE on; press 4 on the POD10.' },
  { title:'9 · Check the manual against the code', body:`<p>The manual: “The Slave indicator on POD9 may be turned on by sending the command F0, C0 and turned off by F0, C7”. Send <b>F0 C0</b> with the POD9 linked and slaved.</p><p><b>Goal:</b> after your F0 C0 the POD9's A/V SLAVE is <i>off</i>: C0 lands in <span class="mono">slave_off</span>, which sends the POD9 its own video with bit 6 = 1.</p>`, check:()=> userEv('rx').some(e=>e.b===0xC0) && fin('p9link',0) && !fin('p9slave',1), hint:'Link the POD9 and switch its A/V SLAVE on, then use the “F0 C0” preset.' },
  { title:'10 · Audio 7', body:`<p>The protocol has three bits for the input, so 7 is a legal code. <span class="mono">audio_table</span> has seven <span class="mono">retlw</span>s; entry 7 is <span class="mono">retlw 0x01</span>. Send <b>F0 87</b> and look at PORTB and the output.</p><p><b>Goal:</b> several receivers driving the bus at once.</p>`, check:()=> emulate().sw.some(s=> s.t > 0 && lowList(s.v).length > 1), hint:'Use the “F0 87” preset.' },
  { title:'11 · Pull the slave-port cable', body:`<p>Pull the P3 cable (POD9 strip), then send <b>F0 00</b> more than 110 ms later. <span class="mono">timer_check</span> runs every 53.3 ms; after a whole tick with no SPI byte (<span class="mono">video_flag</span> still clear) it sets <span class="mono">video = 0xFF</span>, and the first reply byte becomes <b>0x80</b> — exactly the manual's “If POD9 is not present the first byte of the response would read 1 0 0 0 0 0 0 0”.</p><p><b>Goal:</b> a status reply of 80 after the cable was pulled.</p>`, check:()=>{ const p = userEv('p9link').filter(e=>!e.on); return p.length && emulate().txF.some(f=>f.b===0x80 && f.t0 > p[0].t); }, hint:'Pull the cable early (≈0.2 s), move the playhead to ≈0.5 s and send F0 00.' },
  { title:'Done', body:`<p>You have used every control of the POD10. <b>One second, in slow motion</b> takes the second down to passes, SPI bytes, RS-422 bits and AES3 half-bits; <b>Software</b> follows the main loop and its state machines live; <b>Findings</b> lists what V1.03 does that the manual does not say.</p>`, check:()=>true, auto:true },
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__pod10Keys = true; m._k = {};
  m.innerHTML = `<div class="grid2">
    <div>${card('Tutorial — operating the POD10 (from POD10MAN.pdf and pd10v103.asm)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>
      ${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The unit at the playhead', `<div id="fp"></div><div id="rp" style="margin-top:8px"></div><div id="st" class="small mono" style="margin-top:6px"></div><div id="ctl"></div>`)}
      ${card('Slave port P3 — POD9', `<div id="p9"></div>`)}${card('CONTROL — RS-422', `<div id="ser"></div>`)}
      ${card('Timeline', `<canvas id="tl"></canvas>`)}</div></div>`;
  const q = s => m.querySelector(s);
  q('#ctl').innerHTML = controlsHTML(); bindControls(q('#ctl'));
  const draw = ()=>{
    const t = SIM.t;
    q('#fp').innerHTML = frontSVG(t); q('#rp').innerHTML = rearSVG(t); bindPanel(q('#fp')); bindPanel(q('#rp'));
    q('#st').innerHTML = statusLine(t);
    q('#p9').innerHTML = p9HTML(t); bindP9(q('#p9'));
    const ks = sv('serial',t,'none')+'|'+D.log.length+'|'+Math.floor(t*20); if (m._k.ser !== ks){ m._k.ser = ks; q('#ser').innerHTML = serialHTML(t); bindSerial(q('#ser')); }
    q('#trace').innerHTML = traceHTML();
    q('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick = ()=>{ lessonIdx = +li.dataset.i; draw(); });
    const L = LESSONS[lessonIdx]; let ok = false; try { ok = !!L.check(); } catch(e){ ok = false; }
    const hint = typeof L.hint==='function' ? L.hint() : L.hint;
    q('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    q('#prv').onclick = ()=>{ lessonIdx = Math.max(0, lessonIdx-1); draw(); };
    q('#nxt').onclick = ()=>{ lessonIdx = Math.min(LESSONS.length-1, lessonIdx+1); draw(); };
    q('#rs').onclick = ()=>{ loadScenario('idle'); D.log = []; D.hex = 'F0 00'; D.press = C.PRESS; lessonIdx = 0; q('#ctl').innerHTML = controlsHTML(); bindControls(q('#ctl')); SIM.seek(0.05); };
    SIM.drawLanes(q('#tl'), lanes(['aes','btn','bcount','portb','spi','p9','rx','tx']), {labelW:190});
  };
  SIM.on('time', draw);
}

/* ---------------- One second, in slow motion ---------------- */
const SFC = {};
function subframe(src, frame, sub){
  const key = src+':'+frame+':'+sub; if (SFC[key]) return SFC[key];
  const inp = D.inputs[src], blk = ((frame % 192) + 192) % 192;
  const pre = sub===0 ? (blk===0 ? [1,1,1,0,1,0,0,0] : [1,1,1,0,0,0,1,0]) : [1,1,1,0,0,1,0,0];   // Z (B), X (M), Y (W)
  const s = Math.round(Math.sin(2*Math.PI*inp.f*frame/inp.fs + sub*0.7) * 0.25 * 8388607) & 0xFFFFFF;
  const bits = []; for (let i=0;i<24;i++) bits.push((s>>i)&1);       // slots 4–27: aux + audio, LSB first
  bits.push(0, 0, blk===0 ? 1 : 0);                                     // V, U, C (channel status bit 0 = professional) — INFERRED
  bits.push(bits.reduce((a,b)=>a^b,0));                               // P: even parity over slots 4–31
  const lv = pre.slice(); let l = 0;
  for (const b of bits){ l ^= 1; lv.push(l); if (b) l ^= 1; lv.push(l); }
  if (Object.keys(SFC).length > 4000) for (const k in SFC) delete SFC[k];
  return SFC[key] = {lv, pre: sub===0 ? (blk===0?'Z':'X') : 'Y', s};
}
function aesLevel(src, t){ const fs = D.inputs[src].fs, tf = (t - PHI(src))*fs, fr = Math.floor(tf), pos = (tf - fr)*128, sub = pos < 64 ? 0 : 1;
  return subframe(src, fr, sub).lv[Math.min(63, Math.floor(pos % 64))]; }
function drawScope(cv, span){
  const t = SIM.t, {c, w, h} = SIM.canvas(cv, 190), t0 = t - span/2, t1 = t + span/2, x = tt => 50 + (tt-t0)/(t1-t0)*(w-60);
  c.fillStyle = SIM.css('--lane'); c.fillRect(50, 10, w-60, h-40);
  c.strokeStyle = SIM.css('--grid'); c.font = '10.5px '+SIM.css('--mono'); c.fillStyle = SIM.css('--ink2');
  const st = SIM.niceStep(span/8); for (let k = Math.ceil(t0/st)*st; k <= t1; k += st){ c.beginPath(); c.moveTo(x(k), 10); c.lineTo(x(k), h-30); c.stroke(); c.fillText('+'+SIM.fmtDur(k-t0), x(k)+2, h-18); }
  c.fillText('+1.5 V', 2, 26); c.fillText('−1.5 V', 2, h-36);
  const N = Math.min(4000, Math.max(400, Math.round(w*3))); let prev = null; c.lineWidth = 1.6;
  for (let i=0;i<=N;i++){ const tt = t0 + (t1-t0)*i/N, o = outAt(tt); let y, col;
    if (o.s===null || o.s===-1 || (o.s>=0 && !o.ok)){ y = (h-30+10)/2; col = SIM.css('--ink2'); }
    else if (o.s===-2){ const v = o.l.map(k=>aesLevel(k,tt)); const all = v.every(z=>z===v[0]); y = all ? (v[0] ? 22 : h-42) : (h-30+10)/2 + (Math.random()-.5)*30; col = SIM.css('--bad'); }
    else { y = aesLevel(o.s, tt) ? 22 : h-42; col = SRCCOL[o.s]; }
    if (prev){ c.strokeStyle = col; c.beginPath(); c.moveTo(x(prev.t), prev.y); c.lineTo(x(tt), prev.y); c.lineTo(x(tt), y); c.stroke(); }
    prev = {t:tt, y}; }
  const E = emulate(); for (const s of E.sw){ if (s.t < t0 || s.t > t1) continue; c.strokeStyle = SIM.css('--play'); c.setLineDash([4,3]); c.beginPath(); c.moveTo(x(s.t), 10); c.lineTo(x(s.t), h-30); c.stroke(); c.setLineDash([]); c.fillStyle = SIM.css('--play'); c.fillText('PORTB ← '+hex2(s.v)+' ('+s.why+')', x(s.t)+4, 22); }
  c.strokeStyle = SIM.css('--play'); c.lineWidth = 2; c.beginPath(); c.moveTo(x(t), 6); c.lineTo(x(t), h-30); c.stroke();
}
function viewSecond(m){
  window.__pod10Keys = false; let span = 21e-6;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
    <div class="grid2">${card('AES3 on OUT 1 at the playhead — biphase-mark half-bits', `<div class="small" style="margin-bottom:6px">Window <select id="span">${[[2e-6,'2 µs'],[10.4e-6,'10.4 µs (one subframe @ 48 k)'],[21e-6,'21 µs (one frame @ 48 k)'],[100e-6,'100 µs (one main-loop pass)'],[1e-3,'1 ms']].map(([v,l])=>`<option value="${v}" ${v===span?'selected':''}>${l}</option>`).join('')}</select></div><canvas id="scope"></canvas><div id="sinfo" class="small mono"></div><p class="small muted">Each source has its own frame phase (they are not locked) ${inf}. Audio words are a test tone; V = U = 0, C carries only the professional flag in frame 0 ${inf}. A DS75176 adds ≈20 ns and passes the edges as they are: the switch lands wherever the old and new streams happen to be.</p>`)}
      ${card('The pass under the playhead', `<div id="pass"></div>`)}</div>
    ${card('Zoom ladder at the playhead — 1 s → one Timer2 tick → one SPI byte → one main-loop pass', `<canvas id="z1"></canvas><canvas id="z2"></canvas><canvas id="z3"></canvas><canvas id="z4"></canvas>`)}
    ${card('As the panel sees it', `<div id="fp"></div><div id="st" class="small mono" style="margin-top:6px"></div>`)}`;
  const q = s => m.querySelector(s);
  q('#span').onchange = e=>{ span = +e.target.value; SIM.refresh(); };
  const draw = ()=>{
    const t = SIM.t, E = emulate(), P = E.P;
    let n0 = 0, busy = 0; for (let i=0;i<P.n;i++){ if (P.t0[i]>=0 && P.t0[i]<1){ n0++; if (passLen(i) > IDLE+4) busy++; } }
    const tk = E.ticks.filter(x=>x>=0&&x<1), sx = E.spiX.filter(s=>s.t>=0&&s.t<1), fs = D.inputs[Math.max(0,outAt(t).s)]?.fs || 48000;
    const rows = [
      ['Instruction cycles', '1 228 800', SIM.fmtDur(C.TCY), '4.9152 MHz crystal X1 ÷ 4'],
      ['Main-loop passes', n0.toLocaleString(), SIM.fmtDur(IDLE*C.TCY)+' idle', `${IDLE} Tcy counted from pd10v103.asm (12 calls + clrwdt + goto); ${busy} passes in this second did more than idle`],
      ['Debounce', '—', '9.4–10.4 ms', '0x70 = 112 identical passes to accept a press, 112 released passes before the next one'],
      ['Slave-port bytes (POD9 → POD10)', sx.length.toString(), SIM.fmtDur(C.P9_TICK*C.TCY), 'POD9 is the master: one byte each way per POD9 timer tick (4096 Tcy + its loop, pod9.js); F0 then data'],
      ['POD9 command → POD10 switch', '—', '≈ '+SIM.fmtDur(4*2*C.P9_TICK*C.TCY), '4 commands, one every 2nd byte (spi_rec_count = 4)'],
      ['POD10 command → POD9 switch', '—', '≈ '+SIM.fmtDur(8*2*C.P9_TICK*C.TCY), 'POD9 needs 8 the first time, 7 after (pod9.js)'],
      ['Timer2 ticks', tk.length.toString(), SIM.fmtDur(C.T2S), 'T2CON = 0xFF: 1:16 × 256 × 1:16 — only used to time out the POD9 link'],
      ['RS-422 bytes', (E.rxF.filter(f=>f.t0>=0&&f.t0<1).length+' in / '+E.txF.filter(f=>f.t0>=0&&f.t0<1).length+' out'), SIM.fmtDur(C.BYTE), '9600 baud, start + 8 + stop; each bit 104.2 µs'],
      ['AES3 frames on the output', Math.round(fs).toLocaleString(), SIM.fmtDur(1/fs), `2 subframes × 32 time slots × 2 half-bits: one half-bit = ${SIM.fmtDur(1/fs/128)}; a 192-frame channel-status block = ${SIM.fmtDur(192/fs)}`],
    ];
    q('#ladder').innerHTML = `<table class="kv"><tr><th>What</th><th>per second (counted in this run)</th><th>period</th><th>where it comes from</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    drawScope(q('#scope'), span);
    const o = outAt(t); let si = `OUT = ${srcTxt(o)}`;
    if (o.s >= 0){ const inp = D.inputs[o.s], tf = (t-PHI(o.s))*inp.fs, fr = Math.floor(tf), pos = (tf-fr)*128, sf = subframe(o.s, fr, pos<64?0:1); si += ` · frame ${((fr % 192) + 192) % 192} of the block · subframe ${pos<64?'A':'B'} (preamble ${sf.pre}) · time slot ${Math.floor((pos%64)/2)} · half-bit ${Math.floor(pos%64)%2}`; }
    q('#sinfo').textContent = si;
    const r = routineAt(t);
    q('#pass').innerHTML = r ? `<div class="small">Pass ${r.n} started at ${SIM.fmtT(r.t0)}, ${passLen(r.n)} Tcy = ${SIM.fmtDur(passLen(r.n)*C.TCY)}.</div><table class="kv"><tr><th>routine</th><th>Tcy</th><th>idle</th><th>pd10v103.asm</th></tr>${ROUT.map((rt,i)=>{ const cy = P.cyc[r.n*NR+i]; return `<tr class="${i===r.i?'hl':''}"><td class="mono">${rt[0]}</td><td class="mono">${cy}</td><td class="mono muted">${rt[1]}</td><td class="small">${cy>rt[1]?'<b>working</b> · ':''}line ${rt[2]}</td></tr>`; }).join('')}</table>` : '<div class="muted">The PIC is not running at the playhead.</div>';
    const rng = (w, f) => { const a = Math.max(0, Math.min(C.HORIZON - w, t - w*f)); return [a, a+w]; };
    SIM.drawLanes(q('#z1'), lanes(['aes','portb','spi','tmr']), {labelW:190, range:[0,1]});
    SIM.drawLanes(q('#z2'), lanes(['btn','bcount','portb','rx','tx']), {labelW:190, range:rng(C.T2S, 0.5)});
    SIM.drawLanes(q('#z3'), lanes(['pass','spi','rx','rc0']), {labelW:190, range:rng(C.P9_TICK*C.TCY, 0.5)});
    SIM.drawLanes(q('#z4'), lanes(['pass','aes','portb']), {labelW:190, range:rng(IDLE*C.TCY*1.2, 0.5)});
    q('#fp').innerHTML = frontSVG(t, {max:760}); q('#st').innerHTML = statusLine(t);
  };
  SIM.on('time', draw);
}

/* ---------------- Software ---------------- */
function loopSVG(r){
  const W = 760, H = 250, n = NR, cx = 380, cy = 125, rx = 300, ry = 95; let s = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px">`;
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="var(--line)" stroke-width="3" stroke-dasharray="6 4"/>`;
  const P = emulate().P;
  ROUT.forEach((rt,i)=>{ const a = -Math.PI/2 + i/n*2*Math.PI, x = cx + rx*Math.cos(a), y = cy + ry*Math.sin(a), cur = r && r.i===i, cyc = r ? P.cyc[r.n*NR+i] : rt[1], busy = cyc > rt[1];
    s += `<g><title>${rt[0]} — ${rt[3]} (pd10v103.asm line ${rt[2]})</title><rect x="${x-62}" y="${y-15}" width="124" height="30" rx="7" fill="${cur?'var(--accent)':busy?'color-mix(in srgb, var(--warn) 30%, var(--panel))':'var(--panel2)'}" stroke="${cur?'var(--accent)':'var(--line)'}" stroke-width="2"/>
      <text x="${x}" y="${y-1}" text-anchor="middle" font-size="11.5" font-weight="600" fill="${cur?'#fff':'var(--ink)'}" font-family="var(--mono)">${rt[0]}</text><text x="${x}" y="${y+11}" text-anchor="middle" font-size="9.5" fill="${cur?'#fff':'var(--ink2)'}">${cyc} Tcy${busy?' · working':''}</text></g>`; });
  s += `<text x="${cx}" y="${cy-6}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">main (no interrupts: ORG 4 = RETFIE)</text><text x="${cx}" y="${cy+12}" text-anchor="middle" font-size="11" fill="var(--ink2)">${r?`pass ${r.n}: ${passLen(r.n)} Tcy = ${SIM.fmtDur(passLen(r.n)*C.TCY)}`:'not running'}</text></svg>`;
  return s;
}
function smSVG(states, cur, title){
  const w = 150, gap = 18, W = states.length*(w+gap); let s = `<svg viewBox="0 0 ${W} 86" style="width:100%;max-width:${W}px"><text x="0" y="12" font-size="11" fill="var(--ink2)">${title}</text>`;
  states.forEach((st,i)=>{ const x = i*(w+gap), on = i===cur;
    s += `<rect x="${x}" y="20" width="${w}" height="54" rx="9" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="2"/><text x="${x+w/2}" y="40" text-anchor="middle" font-size="11.5" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${st[0]}</text><text x="${x+w/2}" y="56" text-anchor="middle" font-size="9.5" fill="${on?'#fff':'var(--ink2)'}">${st[1]}</text>${st[2]?`<text x="${x+w/2}" y="68" text-anchor="middle" font-size="9.5" fill="${on?'#fff':'var(--ink2)'}">${st[2]}</text>`:''}`;
    if (i<states.length-1) s += `<path d="M${x+w+2} 47 h${gap-6}" stroke="var(--ink2)" stroke-width="2" marker-end="url(#p10ar)"/>`; });
  return s.replace('<text', '<defs><marker id="p10ar" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--ink2)"/></marker></defs><text') + '</svg>';
}
function viewSoft(m){
  window.__pod10Keys = false;
  m.innerHTML = `<div class="grid2">${card('Main loop — the routine running at the playhead', `<div id="loop"></div><p class="small muted">The firmware has no interrupts (the vector at 0x004 is a bare RETFIE). Everything is polled in this order, ≈10 700 times a second. Hover a box for what it does.</p>`)}
      ${card('Registers at the playhead (RAM 0x20–0x37, org 20h / res)', `<div id="regs"></div>`)}</div>
    <div class="grid2">${card('State machines', `<div id="sm"></div>`)}${card('PORTB and the pins', `<div id="pins"></div>`)}</div>
    <div class="grid2">${card('RS-422 protocol — manual against pd10v103.asm', `<div id="proto"></div>`)}${card('Slave-port bytes (P3, SPI mode 0x25 slave)', `<div id="spi"></div>`)}</div>
    ${card('Firmware history in the folder (diffed)', `<div id="hist"></div>`)}`;
  const q = s => m.querySelector(s);
  q('#proto').innerHTML = `<table class="kv"><tr><th>bytes</th><th>manual</th><th>code path</th><th>what V1.03 really does</th></tr>
    <tr><td class="mono">F0 00</td><td>request status</td><td class="mono">next_check1 → status_check</td><td>reply <span class="mono">~video|80</span>, <span class="mono">~pre_output&amp;7F</span></td></tr>
    <tr><td class="mono">F0 01xxxxxx</td><td>SUM audio: “POD10 will ignore this command”</td><td class="mono">btfsc recieved_reg,6 → status_check (both ways)</td><td>ignored ✓</td></tr>
    <tr><td class="mono">F0 10vvvaaa</td><td>switch audio and video</td><td class="mono">next_check2 → spi_uart_setup ×2 → audio_only → next_audio2</td><td>audio = audio_table(aaa); POD9 gets video vvv with bit 6 = 1 (slave off); vvv = 0 still sends POD9's own video with bit 6 = 1</td></tr>
    <tr><td class="mono">F0 80</td><td>“if switching from SUM mode send F0, 80”</td><td class="mono">cancel_sum</td><td>re-applies pre_output | 0x40</td></tr>
    <tr><td class="mono">F0 11000xxx</td><td>slave audio and video</td><td class="mono">slave_mode → not_on</td><td>audio xxx and POD9 video xxx with bit 6 = 0 (slave on)</td></tr>
    <tr><td class="mono">F0 C0</td><td>POD9 slave indicator ON</td><td class="mono">slave_off</td><td><b>OFF</b>: POD9 gets its own video with bit 6 = 1</td></tr>
    <tr><td class="mono">F0 C7</td><td>POD9 slave indicator OFF</td><td class="mono">slave_on</td><td><b>ON</b>: bit 6 = 0, audio re-applied</td></tr>
    <tr><td class="mono">aaa or vvv = 7</td><td>(not described; codes 1–6)</td><td class="mono">audio_table → retlw 0x01</td><td>PORTB = 0x01: receivers 2–6 all on, RB7 low</td></tr></table>`;
  q('#hist').innerHTML = `<table class="kv"><tr><th>file</th><th>date</th><th>MCU</th><th>change (from the diffs)</th></tr>
    <tr><td class="mono">PD10V100.ASM</td><td>20 Nov ${Y(1997)}</td><td>16C73A</td><td>header still “Pod 2 Audio Switcher”; <span class="mono">input</span> copies every pin (several inputs can be on at once); debounce 0xFE passes</td></tr>
    <tr><td class="mono">PD10V101.ASM</td><td>13 Mar ${Y(1998)}</td><td>16C73A</td><td>header says “Version 1.02”: first-pin-wins scan, debounce 0x70, spi_tran_count = 0x20 on every press</td></tr>
    <tr><td class="mono">PD10V102.ASM</td><td>13 Mar ${Y(1998)}</td><td>16C73A</td><td><span class="mono">all_clear</span> now checks <span class="mono">spi_flag,7</span>: a POD9 command with no input bit low is no longer accepted</td></tr>
    <tr><td class="mono">pd10v103.asm</td><td>2 May ${Y(2002)}</td><td>16F73</td><td>“Had to change the processor to pic16f73” — the include only; three identical copies</td></tr>
    <tr><td class="mono">PD10V13M.$$$</td><td>19 Apr ${Y(2002)}</td><td>16F73</td><td>unreleased draft: “allowing for communication of SCI and SPI simultaneously”, <span class="mono">bsf which_flag,0</span> in init (status at power-up), <span class="mono">polecount2</span></td></tr>
    <tr><td class="mono">pod10c.asm, Custom/pd10c100, pd10c101</td><td>${Y(2004)}–${Y(2006)}</td><td>16F73</td><td>custom: POD10 as SPI <i>master</i> of another POD10; then also a UART link to a POD21; a POD10 remote with POD10 + POD21</td></tr>
    <tr><td class="mono">#CUSTOM/POD10-041</td><td>Dec ${Y(2008)}</td><td>16F73</td><td>V1.03 with inputs 3–6 and MIX/spare commented out (2-input build) + its remote <span class="mono">pod2r101.asm</span></td></tr>
    <tr><td class="mono">#V030000/pod10.asm</td><td>${Y(2013)}</td><td>16F887</td><td>MPASM port of V1.03 to the POD10A ISS3 board, still 6 inputs (see pod10a.js)</td></tr>
    <tr><td class="mono">#V030100, #V030200 POD10A / POD10R</td><td>${Y(2013)}–${Y(2014)}</td><td>16F887</td><td>XC8 rewrites; the only copies of the V030200 production master and the POD10R remote (modelled in pod10a.js)</td></tr></table>`;
  const draw = ()=>{
    const t = SIM.t, r = routineAt(t), s = r ? snap(r.n) : null;
    q('#loop').innerHTML = loopSVG(r);
    if (!s){ q('#regs').innerHTML = '<div class="muted">Not running at the playhead.</div>'; q('#sm').innerHTML = ''; q('#pins').innerHTML=''; q('#spi').innerHTML=''; return; }
    const MEAN = { pre_output:'selection (= PORTB): bits 0–5 IN1–6 active-low, 6 MIX, 7 spare', bcount:'debounce counter (0x70)', bounce:'input_reg latched at the start of a press', input_reg:'this pass\'s button scan', video:'last POD9 status | 0x80 (0xFF = none)', spi_reg:'last valid POD9 command', input_flag:'bit 0 → router, bit 1 → send command to POD9', rel_flag:'bit 0 = waiting for release', remote_flag:'0 POD9 switch, 1 RS-422 switch, 2/3 forward to POD9', spi_flag:'0 byte in, 1 F0/data toggle, 2 header seen, 7 zero found', transmit_flag:'0 send transmit_reg, 1 reset_uart', uart_flag:'bit 7 = F0 seen', which_flag:'bit 0 = 2nd reply byte due', recieved_reg:'last RS-422 byte / RS-422 selection', transmit_reg:'next byte out', spi_output:'next SPI byte (loaded at the next exchange)', spi_output_temp:'RS-422 command to forward', spi_tran_count:'repeat counter (32)', spi_rec_count:'POD9 commands until a switch (4)', video_flag:'bit 0 = SPI byte this tick', spi_recieved:'last SPI byte', PORTB:'XPT1–6, RB6 “SPARE”, RB7 “MIX” lamp lines', RC0:'U2 driver enable' };
    q('#regs').innerHTML = `<table class="kv"><tr><th>name</th><th>hex</th><th>bits</th><th>meaning</th></tr>${NV.map(k=>`<tr><td class="mono">${k}</td><td class="mono">${k==='RC0'?s[k]:hex2(s[k])}</td><td class="mono">${k==='RC0'?'':bin8(s[k])}</td><td class="small">${MEAN[k]||''}</td></tr>`).join('')}</table>`;
    const deb = (s.rel_flag&1) ? (s.input_reg!==0xFF ? 3 : 4) : (s.bcount < 0x70 ? 1 : 0);
    const ua = (s.which_flag&1) ? 3 : (s.uart_flag&0x80) ? 1 : (t < (emulate().txF.filter(f=>f.t0<=t).slice(-1)[0]||{t0:-9}).t0 + C.BYTE ? 2 : 0);
    const sp = (s.remote_flag & 0x0C) ? 2 : (s.input_flag & 2) ? 1 : 0;
    q('#sm').innerHTML = smSVG([['IDLE','bcount = 0x70',''],['COUNTING','bcount '+hex2(s.bcount),'same input_reg'],['ACCEPTED','router, flags',''],['HELD','rel_flag = 1','bcount 0x70'],['RELEASING','112 high passes','']], deb, 'debounce / debounce_rel')
      + smSVG([['WAIT F0','uart_flag,7 = 0',''],['ADDRESSED','uart_flag,7 = 1','next byte = command'],['SENDING','RC0 high','TRMT = 0'],['REPLY 2 DUE','which_flag,0','send_audio']], ua, 'translate_uart / transmit_uart')
      + smSVG([['STATUS','data slots: pre_output|80',''],['PRESS','command ×32','spi_tran_count '+s.spi_tran_count],['FORWARD','RS-422 cmd ×32','spi_tran_count '+s.spi_tran_count]], sp, 'SPI_trns_cntrl (what POD10 sends POD9)')
      + smSVG([['WAIT','spi_flag,2 = 0',''],['HEADER','F0 seen',''],['COUNT','spi_rec_count '+s.spi_rec_count,'(4 → switch)']], (s.spi_flag&4) ? 1 : (s.spi_rec_count<4 ? 2 : 0), 'SPI_rcv_ctrl (what POD10 hears)');
    q('#pins').innerHTML = `<table class="kv"><tr><th>bit</th><th>pin</th><th>net (POD10.net)</th><th>goes to</th><th>now</th></tr>${[0,1,2,3,4,5,6,7].map(b=>`<tr><td>RB${b}</td><td>${21+b}</td><td class="mono">${b<6?'XPT'+(b+1):b===6?'SPARE':'MIX'}</td><td class="small">${b<6?`${XU[b]} /RE (pin 2) + lamp via ${b%2?'RP2':'RP1'} → P1-${5+b}`:b===6?'lamp line via RP1 → P1-3 (driven by the MIX button bit!)':'lamp line via RP2 → P1-4 (driven by the spare bit; low after any POD9 switch)'}</td><td class="mono">${(s.PORTB>>b)&1 ? '1' : '<b>0</b>'}</td></tr>`).join('')}</table>
      <p class="small muted">Inputs: IN1 RA3 (5), IN2 RA2 (4), IN3 RA5 (7), IN4 RA4 (6), IN5 RC2 (13), IN6 RC1 (12), IN_MIX RA1 (3), IN_SPARE RA0 (2) — each through 330 Ω (RP3/RP4) to P2 (front buttons) and P4 (9-pin), 3K3 pull-ups RN1. RC0 (11) U2 DE + /RE, RC3/SCK (14) P3-1, RC4/SDI (15) P3-3, RC5/SDO (16) P3-2, RC6/TX (17) U2 DI, RC7/RX (18) U1 RO (+ U2 RO via LK1).</p>`;
    const E = emulate(), near = E.spiX.filter(x=>x.t<=t).slice(-8);
    q('#spi').innerHTML = `<table class="kv"><tr><th>byte</th><th>from POD9 (↓ SDI)</th><th>from POD10 (↑ SDO)</th></tr>
      <tr><td class="mono">F0</td><td>header before every data byte</td><td>header (tran_spi alternates)</td></tr>
      <tr><td class="mono">1S654321</td><td>status: video selection (0 = on), S = 0 → slave on → stored in <span class="mono">video</span></td><td>status: pre_output | 0x80 (S = MIX bit)</td></tr>
      <tr><td class="mono">01654321</td><td>command: exactly one input bit low, bit 6 must be 1 → every 4th one switches POD10</td><td>—</td></tr>
      <tr><td class="mono">00654321</td><td>— (rejected)</td><td>command after a local press, POD9 slave on (bit 6 cleared) ×32</td></tr>
      <tr><td class="mono">01 + video</td><td>—</td><td>special_spi (MIX) and RS-422 forwards with bit 6 set: POD9 follows with slave OFF</td></tr></table>
      <div class="small mono" style="margin-top:6px">Last exchanges: ${near.map(x=>`↓${hx(x.mosi)}/↑${x.on?hx(x.miso):'--'}`).join(' ')||'—'}</div>`;
  };
  SIM.on('time', draw);
}

/* ---------------- Block diagram ---------------- */
const BLOCKS = {
  in:   {x:20,  y:40,  w:150, h:250, t:'IN 1–6 (terminals)', d:'Six balanced AES/EBU inputs, P5/P6 headers from the rear board. Each: 0.1 µF (C8–C13) → PE-65612 transformer (T1–T6; schematic says 13764602) → 110 Ω termination (R12–R17) across the secondary. Manual: 0.2–7 Vpp, 110 Ω (/110) or 75 Ω (/75).'},
  rx:   {x:210, y:40,  w:150, h:250, t:'6 × DS75176 receivers', d:'U9, U8, U7, U6, U5, U4 for IN 1…6. DE (pin 3) = GND, /RE (pin 2) = XPTn from the PIC. Enabled receiver drives RO (pin 1) onto the shared bus NET00059; the others are high-impedance. Two enabled = two push-pull outputs fighting.'},
  bus:  {x:400, y:130, w:110, h:70,  t:'AES bus', d:'NET00059: RO of U4–U9 and DI (pin 4) of U10/U11. No re-clocking, no AES receiver: the bit stream is passed through as is, so a switch splices two unrelated streams.'},
  drv:  {x:550, y:60,  w:150, h:210, t:'U10 / U11 drivers → T7 / T8', d:'Two DS75176 with DE and /RE tied to +5 (always transmitting). Each A/B pair → 2 × 54.9 Ω (R18–R21) → 0.1 µF (C14/C15) → PE-65612 → OUT 1 / OUT 2. 110 Ω source; manual: 3 Vpp terminated. Both outputs carry the same signal.'},
  out:  {x:740, y:110, w:120, h:110, t:'OUT 1, OUT 2', d:'Rear terminals “OUT 1 / OUT 2 + − G” (POD10SLK) on P6 pins 8/9 and 11/12. The functional diagram shows a single output.'},
  mcu:  {x:330, y:340, w:200, h:120, t:'U3 PIC16F73 (V1.03)', d:'Netlist/BOM: PIC16C63A; DSN: PIC16C73; firmware V1.00–V1.02 for 16C73A, V1.03 for 16F73. 4.9152 MHz X1. Polls the buttons, drives XPT1–6 on RB0–RB5, RS-422 on the USART, SPI slave to POD9, Timer2 for the link timeout.'},
  btn:  {x:20,  y:340, w:150, h:120, t:'Buttons / GPI', d:'P2 (front button board) and P4 (9-pin PAN900, special builds) in parallel: IN_MIX, IN_SPARE, IN1–IN6 through 330 Ω (RP3/RP4) to RA0–RA5, RC1, RC2; RN1 3K3 pull-ups; P4-9 ground.'},
  led:  {x:190, y:480, w:150, h:70,  t:'Button lamps (P1)', d:'P1: GND, +5, then SPARE (RB6), MIX (RB7), XPT1–6 through 330 Ω (RP1/RP2). A lamp lights when its line is low — the same line that enables the receiver.'},
  rs:   {x:560, y:340, w:150, h:120, t:'RS-422 (J3 CONTROL)', d:'U1 DS75176 receiver always on (J3 7/2 → RC7). U2 driver on J3 3/8 from RC6, enabled by RC0 (DE and /RE). RP5 10 k fail-safe bias, 22 Ω series (R5–R8). LK1 0 Ω links U2 RO to RC7 as well; LK2 (not fitted) puts +5 V on pin 1.'},
  spi:  {x:560, y:480, w:150, h:70,  t:'P3 → POD9', d:'Internal 4-pin header “to video switcher”: 1 SCK (RC3), 2 SDO (RC5), 3 SDI (RC4), 4 GND, each through 100 Ω (R2–R4). SSPCON = 0x25: SPI slave, SS disabled. POD9 is the master.'},
  psu:  {x:740, y:340, w:120, h:120, t:'Power', d:'Captive cord → fuse (1/2 A slow blow) → rocker PWRSW → T9 229B12 → D1/D2 1N4003 (centre-tap full wave) → C1 470 µF → LM317 (R9 221 Ω, R10 665 Ω → 5.01 V). PWR LED from +V via R1 2 kΩ. Manual: 115 VAC 12 VA.'},
};
const BLINKS = [['in','rx'],['rx','bus'],['bus','drv'],['drv','out'],['mcu','rx'],['btn','mcu'],['mcu','led'],['mcu','rs'],['mcu','spi'],['psu','mcu']];
function viewBlock(m){
  window.__pod10Keys = false; let selB = 'mcu';
  m.innerHTML = `<div class="grid2">${card('Block diagram (click a block)', `<div id="bd"></div>`)}${card('Block', `<div id="bi"></div>`)}</div>
    ${card('Live at the playhead', `<div id="lv" class="small mono"></div>`)}`;
  const draw = ()=>{
    const t = SIM.t, P = sv('PORTB',t,-1), o = outAt(t);
    const ctr = b => [b.x+b.w/2, b.y+b.h/2];
    let s = `<svg viewBox="0 0 880 570" style="width:100%;max-width:880px">`;
    BLINKS.forEach(([a,b])=>{ const A1=ctr(BLOCKS[a]), B1=ctr(BLOCKS[b]); s += `<line x1="${A1[0]}" y1="${A1[1]}" x2="${B1[0]}" y2="${B1[1]}" stroke="var(--line)" stroke-width="3"/>`; });
    for (const k in BLOCKS){ const b = BLOCKS[k], on = k===selB;
      s += `<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="10" fill="${on?'color-mix(in srgb, var(--accent) 18%, var(--panel))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="2"/><text x="${b.x+b.w/2}" y="${b.y+18}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${b.t}</text></g>`; }
    for (let i=0;i<6;i++){ const y = 84 + i*34, en = P>=0 && !((P>>i)&1), inp = D.inputs[i];
      s += `<text x="34" y="${y+4}" font-size="11" fill="var(--ink)">IN ${i+1} ${inp.on?'●':'○'} ${XT[i]}</text><rect x="222" y="${y-11}" width="126" height="22" rx="5" fill="${en?SRCCOL[i]:'var(--panel)'}" stroke="var(--line)"/><text x="285" y="${y+4}" text-anchor="middle" font-size="10.5" fill="${en?'#fff':'var(--ink2)'}">${XU[i]} ${en?'ON':'hi-Z'} · XPT${i+1}</text>
        ${en?`<line x1="348" y1="${y}" x2="400" y2="165" stroke="${SRCCOL[i]}" stroke-width="3"/>`:''}`; }
    s += `<text x="455" y="186" text-anchor="middle" font-size="10.5" fill="${o.s===-2?'var(--bad)':'var(--ink2)'}">${o.s===-2?'CONTENTION':o.s>=0?'IN '+(o.s+1):o.s===-1?'floating':'off'}</text>`;
    s += `<text x="625" y="${BLOCKS.drv.y+50}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">DE = /RE = +5</text><text x="800" y="${BLOCKS.out.y+60}" text-anchor="middle" font-size="11" fill="var(--ink)">${srcTxt(o)}</text>`;
    s += `<text x="430" y="${BLOCKS.mcu.y+44}" text-anchor="middle" font-size="11" fill="var(--ink2)">PORTB ${P<0?'—':hex2(P)}</text><text x="430" y="${BLOCKS.mcu.y+62}" text-anchor="middle" font-size="11" fill="var(--ink2)">video ${hex2(sv('video',t,0xFF))}</text></svg>`;
    m.querySelector('#bd').innerHTML = s;
    m.querySelectorAll('#bd [data-b]').forEach(g=> g.onclick = ()=>{ selB = g.dataset.b; draw(); });
    const b = BLOCKS[selB]; m.querySelector('#bi').innerHTML = `<h3>${b.t}</h3><p class="small">${b.d}</p>`;
    m.querySelector('#lv').innerHTML = statusLine(t);
  };
  SIM.on('time', draw);
}

/* ---------------- Schematics (redrawn) ---------------- */
function chip(x, y, name, part, left, right, w){
  w = w||120; const h = Math.max(left.length, right.length)*18 + 24;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.5"/><text x="${x+w/2}" y="${y-6}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)">${name}</text><text x="${x+w/2}" y="${y+h+13}" text-anchor="middle" font-size="10" fill="var(--ink2)">${part}</text>`;
  left.forEach((p,i)=>{ const yy = y+20+i*18; s += `<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+4}" y="${yy+4}" font-size="9.5" fill="var(--ink)">${p[1]}</text><text x="${x-4}" y="${yy-3}" text-anchor="end" font-size="8.5" fill="var(--ink2)">${p[0]}</text>${p[2]?`<text x="${x-38}" y="${yy+4}" text-anchor="end" font-size="9.5" fill="var(--accent2)" font-family="var(--mono)">${p[2]}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy = y+20+i*18; s += `<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-4}" y="${yy+4}" text-anchor="end" font-size="9.5" fill="var(--ink)">${p[1]}</text><text x="${x+w+4}" y="${yy-3}" font-size="8.5" fill="var(--ink2)">${p[0]}</text>${p[2]?`<text x="${x+w+38}" y="${yy+4}" font-size="9.5" fill="var(--accent2)" font-family="var(--mono)">${p[2]}</text>`:''}`; });
  return s;
}
const SHEETS = {
  mcu: {t:'Sheet A — U3 PIC16F73 (netlist part PIC16C63A), crystal, reset', svg:()=>`<svg viewBox="0 0 760 330" style="width:100%;max-width:760px">${chip(300,30,'U3','PIC16C63A / PIC16F73 (DIP-28)',
      [['1','/MCLR','R11 47K5 → +5'],['2','RA0','IN_SPARE'],['3','RA1','IN_MIX'],['4','RA2','IN2'],['5','RA3','IN1'],['6','RA4','IN4'],['7','RA5','IN3'],['8','VSS','GNDD'],['9','OSC1','X1 4M915, C7 22p'],['10','OSC2','X1, C6 22p'],['11','RC0','U2 DE+/RE'],['12','RC1','IN6'],['13','RC2','IN5'],['14','RC3/SCK','R4 100R → P3-1']],
      [['28','RB7','MIX (RP2 → P1-4)'],['27','RB6','SPARE (RP1 → P1-3)'],['26','RB5','XPT6 → U4-2'],['25','RB4','XPT5 → U5-2'],['24','RB3','XPT4 → U6-2'],['23','RB2','XPT3 → U7-2'],['22','RB1','XPT2 → U8-2'],['21','RB0','XPT1 → U9-2'],['20','VDD','+5'],['19','VSS','GNDD'],['18','RC7/RX','U1-1 RO, LK1 → U2-1'],['17','RC6/TX','U2-4 DI'],['16','RC5/SDO','R3 100R → P3-2'],['15','RC4/SDI','R2 100R → P3-3']], 150)}</svg>`},
  aes: {t:'Sheet B — one input channel (×6) and the two output drivers', svg:()=>{ let s = `<svg viewBox="0 0 760 330" style="width:100%;max-width:760px">`;
      s += `<text x="10" y="18" font-size="11" fill="var(--ink2)">Input n (n = 1…6): P5/P6 pin pair → C (0.1 µF) → T (PE-65612) → R (110 Ω) → U (DS75176) A/B; /RE = XPTn; DE = GND; RO → bus</text>`;
      s += `<rect x="20" y="50" width="50" height="40" fill="none" stroke="var(--ink)"/><text x="45" y="74" text-anchor="middle" font-size="10" fill="var(--ink)">P5/P6</text><line x1="70" y1="60" x2="110" y2="60" stroke="var(--ink)"/><line x1="70" y1="80" x2="150" y2="80" stroke="var(--ink)"/>
        <path d="M110 52 v16 M116 52 v16" stroke="var(--ink)" stroke-width="2"/><text x="113" y="46" text-anchor="middle" font-size="9.5" fill="var(--ink)">C8–C13</text><line x1="116" y1="60" x2="150" y2="60" stroke="var(--ink)"/>
        <path d="M150 55 q 8 5 0 10 q 8 5 0 10 q 8 5 0 10 M170 55 q -8 5 0 10 q -8 5 0 10 q -8 5 0 10" stroke="var(--ink)" fill="none" stroke-width="1.5"/><line x1="160" y1="50" x2="160" y2="90" stroke="var(--ink)" stroke-width="2"/><text x="160" y="104" text-anchor="middle" font-size="9.5" fill="var(--ink)">T1–T6</text>
        <line x1="170" y1="58" x2="260" y2="58" stroke="var(--ink)"/><line x1="170" y1="82" x2="260" y2="82" stroke="var(--ink)"/><rect x="214" y="62" width="10" height="16" fill="none" stroke="var(--ink)"/><line x1="219" y1="58" x2="219" y2="62" stroke="var(--ink)"/><line x1="219" y1="78" x2="219" y2="82" stroke="var(--ink)"/><text x="232" y="74" font-size="9.5" fill="var(--ink)">R12–R17 110R</text>`;
      s += chip(294,40,'U4–U9','DS75176 (receiver)',[['6','A',''],['7','B','']],[['1','RO','bus NET00059'],['2','/RE','XPTn'],['3','DE','GND'],['4','DI','n.c.']],90);
      s += chip(330,190,'U10, U11','DS75176 (driver)',[['4','DI','bus'],['2','/RE','+5'],['3','DE','+5']],[['6','A','R19/R21 54R9'],['7','B','R18/R20 54R9']],90);
      s += `<text x="560" y="232" font-size="9.5" fill="var(--ink)">→ C14/C15 0.1 µF → T7/T8 PE-65612</text><text x="560" y="246" font-size="9.5" fill="var(--ink)">→ P6-11/12 (OUT 1), P6-8/9 (OUT 2)</text>
        <text x="20" y="300" font-size="10" fill="var(--ink2)">XPT1→U9/T1/R17, XPT2→U8/T2/R16, XPT3→U7/T3/R15, XPT4→U6/T4/R14, XPT5→U5/T5/R13, XPT6→U4/T6/R12 (POD10.net).</text><text x="20" y="315" font-size="10" fill="var(--ink2)">Output source impedance 2 × 54.9 Ω = 110 Ω.</text></svg>`; return s; }},
  rs: {t:'Sheet C — RS-422 CONTROL port (J3) and the slave port (P3)', svg:()=>`<svg viewBox="0 0 760 330" style="width:100%;max-width:760px">${chip(250,40,'U1','DS75176 (RX, always on)',[['6','A','R5 22R → J3-7'],['7','B','R6 22R → J3-2']],[['1','RO','RC7 (RP5 10k ↑)'],['2','/RE','GND'],['3','DE','GND']],100)}
      ${chip(250,170,'U2','DS75176 (TX, RC0)',[['4','DI','RC6/TX'],['2','/RE','RC0'],['3','DE','RC0']],[['6','A','R7 22R → J3-3'],['7','B','R8 22R → J3-8'],['1','RO','LK1 0R → RC7']],100)}
      <text x="20" y="300" font-size="10" fill="var(--ink2)">RP5 10 k: U1-A and U2-A pulled up, U1-B and U2-B pulled down (fail-safe idle = mark).</text><text x="20" y="315" font-size="10" fill="var(--ink2)">J3 pins 5, 9 = GNDD; pin 1 = +5 V through LK2 (no value in the BOM: not fitted).</text>
      <rect x="560" y="60" width="70" height="90" fill="var(--panel2)" stroke="var(--ink)"/><text x="595" y="52" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)">P3</text>
      ${[['1','SCK ← R4 ← RC3'],['2','SDO ← R3 ← RC5'],['3','SDI → R2 → RC4'],['4','GNDD']].map((p,i)=>`<text x="568" y="${80+i*20}" font-size="10" fill="var(--ink)">${p[0]}</text><text x="636" y="${80+i*20}" font-size="9.5" fill="var(--accent2)" font-family="var(--mono)">${p[1]}</text>`).join('')}
      <text x="560" y="170" font-size="10" fill="var(--ink2)">“TO VIDEO SWITCHER” (POD9)</text></svg>`},
  io: {t:'Sheet D — buttons (P2/P4), lamps (P1) and power', svg:()=>`<svg viewBox="0 0 760 330" style="width:100%;max-width:760px">
      <text x="10" y="18" font-size="11" fill="var(--ink2)">Buttons: P2 ∥ P4 → RP3/RP4 330 Ω → U3 (RN1 3K3 ↑)</text>
      ${[['1','IN_MIX','RA1'],['2','IN_SPARE','RA0'],['3','IN1','RA3'],['4','IN2','RA2'],['5','IN3','RA5'],['6','IN4','RA4'],['7','IN5','RC2'],['8','IN6','RC1'],['9','(P4) GNDD','']].map((p,i)=>`<text x="20" y="${44+i*17}" font-size="10" fill="var(--ink)">P2/P4-${p[0]}</text><line x1="90" y1="${40+i*17}" x2="200" y2="${40+i*17}" stroke="var(--ink)"/><text x="206" y="${44+i*17}" font-size="9.5" fill="var(--accent2)" font-family="var(--mono)">${p[1]}${p[2]?' → '+p[2]:''}</text>`).join('')}
      <text x="380" y="18" font-size="11" fill="var(--ink2)">P1 lamps: lit when the line is low</text>
      ${[['1','GNDD'],['2','+5'],['3','SPARE = RB6 (RP1)'],['4','MIX = RB7 (RP2)'],['5','XPT1 (RP1)'],['6','XPT2 (RP2)'],['7','XPT3 (RP1)'],['8','XPT4 (RP2)'],['9','XPT5 (RP1)'],['10','XPT6 (RP2)']].map((p,i)=>`<text x="380" y="${44+i*17}" font-size="10" fill="var(--ink)">P1-${p[0]}</text><text x="430" y="${44+i*17}" font-size="9.5" fill="var(--accent2)" font-family="var(--mono)">${p[1]}</text>`).join('')}
      <text x="20" y="250" font-size="11" font-weight="700" fill="var(--ink)">Power</text>
      <text x="20" y="268" font-size="10" fill="var(--ink)">ACIN (PAN356) → PWRSW → T9 229B12 → D1, D2 1N4003 → +V, C1 470 µF (schematic 470/25, BOM 470/50), C4 1 µF</text>
      <text x="20" y="286" font-size="10" fill="var(--ink)">REG1 LM317: R9 221 Ω (out–adj), R10 665 Ω (adj–gnd) → 1.25 × (1 + 665/221) = 5.01 V; C3 1 µF, C5 0.1 µF; PWR LED via R1 2 kΩ from +V</text></svg>`},
};
function viewSchem(m){
  window.__pod10Keys = false;
  m.innerHTML = `<p class="small muted">Redrawn from POD10.net (Tango netlist, ${Y(2008)} export of the ${Y(1998)} ISS1 design) and POD10 #schematic.pdf (POD10.DSN, Oct 20 ${Y(1998)}). These are not the original CAD sheets: pin numbers, reference designators and net names are copied, the layout is new.</p>
    ${Object.keys(SHEETS).map(k=>card(SHEETS[k].t, SHEETS[k].svg())).join('')}
    ${card('Discrepancies between the drawings', `<ul class="small"><li>U3: PIC16C63A in the netlist, BOM and schematic symbol; “PIC16C73” in the DSN parts list; the firmware targets 16C73A (V1.00–1.02) and 16F73 (V1.03). The 16C63A has no A/D converter, so the <span class="mono">ADCON1</span> writes in <span class="mono">init</span> land on an unimplemented register.</li>
      <li>Transformers: “13764602” on the schematic, PE-65612 in the BOM and netlist.</li><li>C1: 470/25 on the schematic, 470/50 in the BOM.</li>
      <li>The functional diagram draws one output (75 Ω BNC or 110 Ω); the board has two (U10/U11, T7/T8) and the manual says “two transformer balanced outputs”.</li></ul>`)}`;
}

/* ---------------- Findings ---------------- */
const FINDINGS = [
  ['F1','Interlock by scan order; the switch happens on the press','<span class="mono">input</span> returns at the first low pin in the order RA3, RA2, RA5, RA4, RC2, RC1, RA0, RA1, so two buttons together give the lower number. <span class="mono">debounce</span> accepts after 112 identical passes (9.4–10.4 ms: a pass with a button down is shorter than the 93.6 µs idle pass because <span class="mono">input</span> returns early) while the button is still down; <span class="mono">debounce_rel</span> then needs 112 released passes. A press shorter than ≈9.4 ms is ignored. V1.00 (header “Pod 2 Audio Switcher”) copied every pin into <span class="mono">input_reg</span>, so several inputs could be enabled at once.'],
  ['F2','“Audio 7” enables five receivers at once','<span class="mono">audio_table</span> has seven entries after the <span class="mono">nop</span>; index 7 is <span class="mono">retlw 0x01</span>. F0 87 — or any 10 vvv 111 (11 000 111 = C7 goes to slave_on instead) — puts PORTB = 0x01: XPT2–XPT6 low together, U4–U8 all drive the bus, and RB7 goes low. With 75176 push-pull RO outputs this is a direct fight. Video code 7 sends POD9 0x41 the same way.'],
  ['F3','F0 C0 and F0 C7 are swapped against the manual','Manual: C0 turns the POD9 slave indicator on, C7 off. Code: low 3 bits = 0 → <span class="mono">slave_off</span> (POD9 is sent its own video with bit 6 = 1), 7 → <span class="mono">slave_on</span> (bit 6 = 0). pod9.js finds the same inversion in the POD9 itself.'],
  ['F4','“Switch audio only” turns the POD9 slave off','<span class="mono">next_check2</span> first does <span class="mono">movf video,w / call spi_uart_setup / bsf spi_output_temp,6</span> (marked “;*******TEST*********”). If the video field is 0 nothing overwrites it, so F0 85 (“audio 5”) also queues 32 commands that make the POD9 follow its own input with slave OFF. Every 10vvvaaa command with vvv ≠ 0 also sends bit 6 = 1: the POD9 switches but leaves audio-follow-video.'],
  ['F5','MIX and SPARE: wired, half-implemented, and crossed','The board brings IN_MIX (RA1) and IN_SPARE (RA0) to P2 pins 1–2 and the 9-pin P4, but the front panel has six buttons. The code puts MIX in bit 6 and spare in bit 7 of <span class="mono">input_reg</span>; PORTB bit 6 is the net named SPARE and bit 7 the net named MIX, so the lamp lines are crossed. A MIX closure makes PORTB = 0xBF: all six receivers off (silence), and <span class="mono">special_spi</span> tells the POD9 to stop following (POD2 SUM logic left in). After any POD9-driven switch <span class="mono">spi_reg</span> has bit 7 = 0, so RB7 (“MIX” lamp line) goes low.'],
  ['F6','A stray byte re-sends the last reply byte','A byte without a preceding F0 leaves <span class="mono">transmit_flag,0</span> set (only F0 clears it in <span class="mono">translate_uart</span>), so <span class="mono">transmit_uart</span> sends the stale <span class="mono">transmit_reg</span> once. Try the “55” preset.'],
  ['F7','Back-to-back commands lose reply bytes','<span class="mono">status_check</span> queues byte 1 and sets <span class="mono">which_flag,0</span>; <span class="mono">send_audio</span> queues byte 2 one pass later, and it waits for TRMT while byte 1 is on the line. If the F0 of the next command arrives in that millisecond, <span class="mono">translate_uart</span> clears <span class="mono">transmit_flag,0</span> and byte 2 is never sent (F0 82 F0 83 sent back to back answers C1, C1 04). If byte 1 itself is still waiting for TRMT, <span class="mono">send_audio</span> overwrites it. A host must leave ≈2.1 ms after each data byte.'],
  ['F8','A POD9 command clears everything before it is checked','<span class="mono">no_update</span> does <span class="mono">clrf remote_flag / clrf input_flag</span> first, then validates. Any POD9 command — even one it then rejects — cancels an RS-422 command still being forwarded and stops POD10’s own press from being repeated. Local presses and RS-422 forwards also share <span class="mono">spi_tran_count</span>.'],
  ['F9','Link timing','POD10 switches on the 4th valid command (≈27 ms after the POD9 starts sending, one data byte every 2 × 3.4 ms); the POD9 needs 8 the first time, then 7 (≈55 ms). POD10 only notices a missing POD9 when a whole 53.3 ms Timer2 tick passes without SSPIF: 53–107 ms. The POD9 (pod9.js) turns its own slave off after 32 ticks without an F0-framed byte, e.g. when the POD10 is switched off.'],
  ['F10','RS-422 hardware oddities','LK1 (0 Ω, fitted per the BOM) joins U2’s receiver output to RC7 as well as U1’s. Whenever RC0 is low (not transmitting) both RO outputs drive RX; with only one pair connected the other receiver sits at its fail-safe “1” '+inf+' — LK1 looks like the 2-wire / 4-wire option link. <span class="mono">reset_uart</span> re-initialises the USART after every received byte; <span class="mono">recieve_uart</span> clears OERR/FERR by toggling CREN. RC0 is set high in <span class="mono">init</span>, so the driver is on for the first ≈100 µs after reset.'],
  ['F11','Hardware against firmware','The ISS1 board carries a PIC16C63A (no A/D) while the code was written for the 16C73A and then the 16F73; <span class="mono">ADCON1</span> writes are harmless. No <span class="mono">__CONFIG</span> in any V1.0x source: oscillator, watchdog and power-up timer were set in the programmer (PD10V100.PJT: WDT off, “Frequency 4 MHz” for the MPLAB simulator only, the crystal is 4.9152 MHz), yet <span class="mono">main</span> starts with <span class="mono">clrwdt</span>. Variables are made with <span class="mono">org 20h / res</span> in absolute mode and code is then placed over the same addresses (as in the POD9).'],
  ['F12','The POD10-041 remote cannot send what you press when a POD9 is slaved','<span class="mono">pod2r101.asm</span> builds 10 vvv aaa with vvv = <span class="mono">uart_setup(video_output)</span>, but <span class="mono">video_output</span> is only written in <span class="mono">output_video</span>, which never runs (timer_check forces <span class="mono">video_audio,0</span>). With RAM at 00 '+inf+' vvv = 1. If the last status said “POD9 slave on”, <span class="mono">output_info</span> takes <span class="mono">slave_mode</span> and sends 0xC1 for every button.'],
  ['F13','Duplicate, misnamed and misfiled files','PD10V101.ASM’s header says “Version 1.02”. PD10V139.$$$ is POD9 code (“Pod 9 Audio Switcher, Verson 1.01”). pd10v103.asm exists in three identical copies (#V100, Custom, Custom/pd10c101). POD10-iss1.sch and POD10-iss2.sch are byte-identical, and sit in “#ISS2 #PCB” and “#ISS1 #PCB” respectively. Everything named POD10-REAR in POD10 - #SILK and #Master/ARTWORK is the 8-input POD10A rear; the only 6-input rear silk is OLD ISSUSES/POD10SLK.CDR. “#ISS3” and the Altium project are the POD10A board.'],
  ['F14','This folder holds the only POD10A production and POD10R sources','#V030200/POD10A/pod10.c and #V030200/POD10R/pod10.c (Sep 2014) exist nowhere else; pod10a.js emulates them. The README lists <span class="mono">WDTE</span> among their config bits; both actually say <span class="mono">WDTE = OFF</span>. #V030000 is a line-for-line MPASM port of V1.03 to the PIC16F887 (“created to use ISS3 boards but with only 6 inputs”).'],
  ['F15','Artwork '+Y(2026)+': front/rear panels now from the CorelDRAW files', 'Front/rear panels now from '+SIM.src(ART_F,'POD10-FRONT-SILK(CURVE).CDR')+' (AUG.13/10 issue, saved Oct 1 2015) and '+SIM.src(ART_R,'OLD ISSUSES/POD10SLK.CDR')+' (Oct 1 2015), converted to vector (assets/pod10-front.svg, pod10-rear.svg) and registered exactly on the earlier PNG separations, so every control stayed on its crosshair. The front sheet holds a WHITE and a GREEN plate with crop marks 400 px (2.0 in) apart; the file is the AUG.13/10 6-input issue although it sits in the POD10A artwork folder. Its “PODS” is a substituted sans converted to curves: 303 px wide it would run over the green bar and “by Ward-Beck Systems”, so it is scaled to 0.81 in x between the bars (x 264–510) as on the built panel ('+SIM.src('#POD #SERIES/POD10A - #Master/POD10A - #ARTWORK #DA #2016 /Pics/POD10A Front.jpg','POD10A Front.jpg')+', which shows the real rounded logotype). POD10SLK.CDR has live Arial text that libcdr de-anchors: OUT 1, OUT 2, OUTPUT and “115 VAC, 1/2 A.S.B.” are moved back and the caution split in two lines as in its PDF. The rear sheet has drill crosshairs only at the two mounting holes: the terminal strips, DE9, fuse and cord are still placed from POD10.pdf.'],
];
function viewFindings(m){
  window.__pod10Keys = false;
  m.innerHTML = card('What the POD10 and its firmware are up to', `<table class="kv"><tr><th></th><th>finding</th><th>detail (files and routines)</th></tr>${FINDINGS.map(f=>`<tr><td class="mono">${f[0]}</td><td><b>${f[1]}</b></td><td class="small">${f[2]}</td></tr>`).join('')}</table>`)
    + card('Assumptions in this model', `<ul class="small">
      <li>Cycle counts per routine are counted from pd10v103.asm (1 Tcy per instruction, 2 for taken branches, calls and returns); branches inside <span class="mono">translate_uart</span> and <span class="mono">SPI_rcv_ctrl</span> are rounded ${inf}.</li>
      <li>The POD9 side follows pod9.js (tick 4176 Tcy, 8/7 commands, 32 repeats, 32-tick audio timeout); its debounce is taken as 29.7 ms. The POD9 A/V SLAVE state is a switch here; in V1.02 it can only be set over RS-422.</li>
      <li>Power-up timer 72 ms ${inf}; SSPBUF powers up as 0x00 ${inf}; XPTn ↔ IN n follows the net names ${inf}; the remote’s uninitialised RAM is 00 ${inf}.</li>
      <li>Button lamps drawn red-lit like the POD10A photo ${inf}; panel colour WBS black (Polane T F63B12 on the mechanical drawings), white and green inks (layer names on the silk sheet).</li>
      <li>AES3 bit streams are synthesised (test tone, V/U/C mostly 0) with a different frame phase per source ${inf}.</li></ul>`)
    + card('Sources', `<ul class="small">
      <li>#POD #SERIES/XXX - POD10 - #Master #OBSOLETE/POD10 - #Engineering/POD10 - #SOFTWARE/POD10 - #SOFTWARE #V100/pd10v103.asm (emulated), PD10V100–102.ASM, PD10V13M.$$$, PD10V139.$$$, PD10V103.ERR, PD10V100.PJT; #CUSTOM/POD10-041/pd10v103.asm, Remote/pod2r101.asm; #V030000, #V030100, #V030200</li>
      <li>POD10 - #PCB #ARCHIVE/POD10.net; POD10 #schematic.pdf; POD10 - #ISS1 #PCB/POD10-iss2.bom; POD10 - Functional Diagram.pdf; POD10 - #MANUAL/POD10MAN.pdf</li>
      <li>Panels: #POD #SERIES/POD10A - #Master/POD10A - #ARTWORK #DA #2016 /POD10-FRONT-SILK(CURVE).pdf → assets/pod10-front-white.png, pod10-front-green.png; POD10 - #SILK/OLD ISSUSES/POD10SLK.CDR (Inkscape) → assets/pod10-rear-white.png; POD10 - #Mechanical #DA #2016/POD10-FRONT ISS 2 (PANEL).pdf; POD PANELS - #Mechanical #DA #2016/…/POD10-REAR ISS 1.pdf, POD10-110-REAR ISS 2.pdf; POD10 - #SILK/OLD ISSUSES/POD10.pdf</li>
      <li>Link partners: pod9.js (POD9), pod10a.js (POD10A / POD10R).</li></ul>`);
}

/* ---------------- register ---------------- */
loadScenario('idle');
SIM.register({
  footnotes: [
    { text: "The 6-input POD10 front silk (AUG.13/10) is filed in the POD10A artwork folder, not with the POD10.", src: "#POD #SERIES/POD10A - #Master/POD10A - #ARTWORK #DA #2016 /POD10-FRONT-SILK(CURVE).CDR" },
    { text: "Its “PODS” is a substituted sans converted to curves, 303 px wide at 200 dpi: as drawn it runs over the green bar and “by Ward-Beck Systems”, unlike the rounded logotype on the built panels.", src: "#POD #SERIES/POD10A - #Master/POD10A - #ARTWORK #DA #2016 /POD10-FRONT-SILK(CURVE).CDR" },
    { text: "The sheet's title block reads “PO10-FRONT-SILK” (the D is missing).", src: "#POD #SERIES/POD10A - #Master/POD10A - #ARTWORK #DA #2016 /POD10-FRONT-SILK(CURVE).CDR" },
    { text: "Every file named POD10-REAR in POD10 - #SILK and #Master/ARTWORK is the 8-input POD10A rear; the only 6-input rear silk is OLD ISSUSES/POD10SLK.CDR (live text, saved Oct 1 2015).", src: "#POD #SERIES/XXX - POD10 - #Master #OBSOLETE/POD10 - #Engineering/POD10 - #SILK/OLD ISSUSES/POD10SLK.CDR" },
    { text: "POD10SLK.CDR draws no outline or connector holes on the rear: only labels and two mounting crosshairs, so the terminal strips, DE9, fuse and cord are placed from the POD10.pdf illustration.", src: "#POD #SERIES/XXX - POD10 - #Master #OBSOLETE/POD10 - #Engineering/POD10 - #SILK/OLD ISSUSES/POD10.pdf" },
    { text: "The folder name “OLD ISSUSES” is misspelled.", src: "#POD #SERIES/XXX - POD10 - #Master #OBSOLETE/POD10 - #Engineering/POD10 - #SILK/OLD ISSUSES/POD10SLK.CDR" }
  ],
  id:'pod10', name:'POD10 · 6×1 AES/EBU digital audio switcher ('+Y(1997)+')', duration:1,
  product:'POD10', year:1997, family:'Obsolete products',
  folder:'#POD #SERIES/XXX - POD10 - #Master #OBSOLETE',
  summary:'Half-rack six by one interlocking AES/EBU switcher: six transformer-coupled inputs, each with a DS75176 line receiver whose output is enabled by the PIC, share one bus that drives two transformer outputs. Firmware V1.03 (PIC16F73, assembly) polls six buttons, answers RS-422 at 9600 baud and is the SPI slave of a POD9 video switcher for audio-follow-video.',
  highlights:['pd10v103.asm emulated pass by pass (93.6 µs idle) with its own registers and cycle counts','Real front and rear silkscreen (the rear converted from the 6-input CorelDRAW file)','POD9 slave port, RS-422 console and the POD10-041 remote, byte by byte','AES3 output at half-bit level, including the splice at a switch','11-step operator tutorial with live goals','“Audio 7” enables five receivers; F0 C0/C7 swapped against the manual'],
  depth:'Full model',
  stepUnits:[
    {label:'1 main-loop pass (93.6 µs idle)', period:()=>IDLE*C.TCY},
    {label:'1 instruction cycle (814 ns)', period:()=>C.TCY},
    {label:'1 AES3 half-bit @ 48 k (163 ns)', period:()=>1/48000/128},
    {label:'1 AES3 frame @ 48 k (20.8 µs)', period:()=>1/48000},
    {label:'1 RS-422 bit (104 µs)', period:()=>1/C.BAUD},
    {label:'1 RS-422 byte (1.04 ms)', period:()=>C.BYTE},
    {label:'1 slave-port byte (3.40 ms)', period:()=>C.P9_TICK*C.TCY},
    {label:'debounce (112 passes)', period:()=>112*IDLE*C.TCY},
    {label:'1 Timer2 tick (53.3 ms)', period:()=>C.T2S},
    {label:'10 ms', period:()=>0.01},
  ],
  zooms:[[1,'1 s (whole second)'],[0.2,'200 ms'],[0.0533,'53.3 ms (Timer2 tick)'],[0.02,'20 ms'],[0.0068,'6.8 ms (two SPI bytes)'],[0.002,'2 ms (two RS-422 bytes)'],[0.001,'1 ms (≈11 passes)'],[0.0001,'100 µs (one pass)'],[0.000021,'21 µs (one AES frame)']],
  defaultZoom:0,
  init(){ EMU_KEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the POD10', render:viewTutorial},
    {id:'second', label:'One second, in slow motion', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
