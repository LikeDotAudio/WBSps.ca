/* =====================================================================
   POD9 — 6×1 analog video switcher with vertical-interval switching, audio-follow-video and RS-422
   (Ward-Beck Systems; POD9.DSN ISS1 Oct 20 1998, firmware V1.02 2004, PCB issue 2/3, POD9R V500 2012)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, under #POD #SERIES/POD9 - #Master/):
   - POD9 - #Engineering/POD9R - #SOFTWARE /POD9R - #SOFTWARE #V102/pod9v102.asm  (emulated; 16C73A, 1 Mar 2004)
       main, init, init_loop1, init_loop, input, debounce, router (next_route0/1), output (shift_out), switch_check
       (do_switch, switch_2…switch_6), next_output1/if_clear/next_output2, debounce_rel, recieve_uart, reset_uart,
       translate_uart (status_check, send_audio, sum_audio, next_check2, audio_only, cancel_sum, slave_mode, not_on,
       slave_on, slave_off), spi_uart_setup, transmit_uart, timer_check (synch_check), SPI_trns_cntrl (next_rem,
       tran_spi, next_spi, no_out_spi, more_spi, spi_special), spi_tran_setup, SPI_master, SPI_rcv_ctrl
       (spi_rec_next, no_update, next_recie0…5), spi_rec_setup, reset_rec_count, video_table, audio_table
   - …/POD9R - #SOFTWARE #V100/pod9v102.asm (V1.02 = V1.01 converted to PIC16F73, 9 Mar 2004: the "F73 build"),
     POD9V100.ASM, POD9V101.ASM, POD9V10X.ASM, WARNING; #Custom #V101/pod9v102.asm, pod9v103.asm (c1.01 "Creative Bubble");
     POD9 - #REMOTE - #Software Video/pod9v102.asm (POD10/POD21 configuration); #V102/pod21c.asm
   - …/POD9R - #REMOTE #SOFTWARE #V500/pod2r200.asm (POD9R V500 = POD2R hardware, "video only remote")
   - #POD #SERIES/POD2 - #Master/…/pod2v200.asm and ../pod2.js (the POD2 side of the slave port), and
     #POD #SERIES/POD  - #Engineering/POD - Remote Software/POD - REMOTE - Software Audio/pd10v103.asm (old POD10)
   - POD9 - #Engineering/POD9 - #MANUAL/POD9MANU.pdf (protocol, specifications), POD9 Slave Port Picture.jpg (2009)
   - POD9 - #Engineering/POD9 - #SCHEMATIC.pdf (= ISS3/POD9 SCH.pdf: POD9.DSN ISS1PCB, Oct 20 1998, 2 pages)
   - POD9 - #Engineering/POD9 - #ISS2 #PCB #OBSOLETE/POD9-iss2.net (P-CAD netlist: every pin and net used below)
   - POD9 - #Engineering/POD9 - #ASSEMBLY.pdf (= POD9-ASSY: "POD9, ISSUE 2", notes 1–6)
   - POD9 - #ARTWORK #DA #2016/POD9-FRONT&REAR-SILK (CURVE).pdf → assets/pod9-*.png (sheet dated Jun.19/14)
   - POD9 - #Mechanical #DA #2016/POD9-FRONT ISS 2 (PANEL).pdf, POD9-REAR ISS 3 (PANEL).pdf (sideways; read upright)
   - POD9 - #TESTREPORT/POD9R-V500-16JUL12.pdf (CTV Edmonton, 13 Jul 2012)
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
  FOSC: 4.9152e6,               // X1 "4M9152" (POD9-iss2.net, schematic page 2, assembly drawing)
  TCY: 4/4.9152e6,              // 813.8 ns per instruction cycle
  BAUD: 9600,                   // SPBRG = 0x07, BRGH = 0 → Fosc/(64·8) = 9600 (manual: 9600, 8 bits, no parity)
  DEB: 0xFE,                    // bcount reload: 254 identical passes (debounce, debounce_rel, output)
  TMR2_0: 65536,                // init: T2CON = 0xFF → prescale 1:16 × 256 × postscale 1:16 (first tick only)
  TMR2: 4096,                   // timer_check: bcf T2CKPS1/T2CKPS0 → prescale 1:1 × 256 × 16 = 4096 Tcy
  SPI_TRAN: 0x20,               // spi_tran_count: a change is repeated in 32 data slots
  REC0: 8, REC: 7,              // spi_rec_count = 0x08 at init, 0x07 on reload → acts on the 8th command, then every 7th
  AUDIO_CNT: 0x20,              // audio_count: 32 ticks without an F0-framed byte → audio = 0xFF, SLAVE LED off
  SW_CNT: 8,                    // switch_count: 8 ticks without vertical sync → switch anyway ("switch randomly")
  P_REC: 4,                     // POD2/POD10 spi_rec_count (pod2v200.asm, pd10v103.asm)
  P_DEB: 0.0126,                // POD2 debounce 0x70 passes × 112 µs (from pod2.js)
  PRESS: 0.15,                  // how long a click holds a button — INFERRED
  HORIZON: 2.0,                 // emulate 2 s so late actions finish (goals use the state at 2 s)
  PRE: -0.25,                   // the unit has been running since before t = 0
  PWRT: 0.072,                  // power-up timer if enabled in the (unknown) config bits — INFERRED
  VSW: 230e-6,                  // LM1881 vertical output width with RSET 680 kΩ (R27) — INFERRED (datasheet typical)
  VSD: 27e-6,                   // LM1881 delay into the first broad pulse before VS falls — INFERRED
  REF0: 0.0042,                 // house reference: a field 1 starts here — arbitrary
};
C.BYTE = 10/C.BAUD;            // start + 8 data + stop = 1.0417 ms
C.T2R = 65536*C.TCY;           // POD9R/POD2R remote TMR2 tick, 53.3 ms (pod2r200.asm T2CON = 0xFF)

/* video standards (manual specs are quoted at 3.58 MHz → NTSC; 230 V build "upon request") */
const STD = {
  ntsc:{name:'NTSC 525/59.94', lines:525, H:1001/(30000*525), sync:4.7e-6, act0:10.9e-6, act1:61.6e-6, burst:[5.3e-6,7.8e-6], fsc:3579545.45, vbi:21, preEq:[0,6], broad:[6,12], postEq:[12,18], setup:7.5},
  pal: {name:'PAL 625/50',     lines:625, H:64e-6,                sync:4.7e-6, act0:12.0e-6, act1:62.0e-6, burst:[5.6e-6,7.85e-6], fsc:4433618.75, vbi:22, preEq:[-5,0], broad:[0,5], postEq:[5,10], setup:0},
};
const S = () => STD[D.std];
const FIELD = () => S().lines/2*S().H;
/* main-loop routines in the order main calls them; idle cost includes call + return (counted from the listing) */
const ROUT = [
  ['main · clrwdt', 1, 'clrwdt — the watchdog is cleared once per pass (WDTE is in the unknown config bits)'],
  ['init_loop', 14, 'BANK1, ADCON1 = digital, TRISA = FF, TRISC = 96, TRISB = 01 rewritten every pass, BANK0'],
  ['input', 27, 'tests RA3, RA2, RA5, RA4, RC2, RC1 (inputs 1–6) then RA0 (spare) and returns at the first low pin'],
  ['debounce', 18, 'bcount counts 254 identical passes before input_flag is set'],
  ['router', 11, 'local press → input_reg; else spi_reg (remote_flag,0, slave port) or video_reg (remote_flag,1, RS-422)'],
  ['output', 5, 'output_flag → shift output_reg into the 74HC4094 (RB6 D, RB7 CLK, RB5 STR): the LEDs'],
  ['switch_check', 5, 'switch_flag → wait for RB0 = LM1881 vertical sync low (or switch_count) → RB1–RB4 crosspoint'],
  ['debounce_rel', 5, 'waits for 254 passes with every button released'],
  ['recieve_uart', 5, 'PIR1,RCIF → RCREG to recieved_reg, transmit_flag,0'],
  ['reset_uart', 5, 're-programs SPBRG/TXSTA/RCSTA while transmit_flag,0 is set'],
  ['translate_uart', 7, 'F0 address byte, then the command byte (00 status, 01 sum, 10 switch, 11 slave)'],
  ['transmit_uart', 13, 'TRMT → RC0 (driver enable) low; load TXREG and raise RC0 when a reply is pending'],
  ['SPI_trns_cntrl', 5, 'on a timer tick: next slave-port byte = F0 header / UART-originated byte / status or command'],
  ['SPI_master', 9, 'on a timer tick: read SSPBUF (last byte from the POD2), write spi_output → 8 SCK clocks at Fosc/4'],
  ['SPI_rcv_ctrl', 5, 'F0 header, then status (bit 7 = 1 → audio) or command (8th → spi_reg, remote_flag,0)'],
  ['timer_check', 5, 'TMR2IF every 4096 Tcy: restart TMR2, spi_transmit,0, audio_count and switch_count'],
  ['goto main', 2, 'goto main'],
];
const VARS = ['pre_output','output_reg','input_reg','bcount','bounce','rel_flag','input_flag','remote_flag','output_flag','switch_flag','switch_count','switch_out',
  'spi_transmit','spi_output','spi_output_temp','spi_recieved','spi_reg','spi_tran_count','spi_rec_count','audio','audio_count','video_reg',
  'uart_flag','which_flag','transmit_flag','transmit_reg','recieved_reg','RC0','PORTB'];
const NV = VARS.length;
/* video_table / audio_table: addwf PCL — index 0 lands on the nop and falls into index 1; index 7 lands on "return" (W comes back unchanged = 7) */
const VT = [0xBF, 0xBF, 0xFE, 0x7F, 0xFD, 0xF7, 0xFB, 0x07];
const AT = [0xFE, 0xFE, 0xFD, 0xFB, 0xF7, 0xEF, 0xDF, 0x07];
/* pre_output / output_reg bit for each input (active low) — and its 74HC4094 output (POD9-iss2.net XPTn) */
const IBIT = [6, 0, 7, 1, 3, 2];
const QOF = b => 8 - b;                                      // bit b leaves the 4094 on Q(8−b) after 8 clocks, LSB first
const SCAN = [[0,'RA3',3],[1,'RA2',2],[2,'RA5',5],[3,'RA4',4],[4,'RC2',13],[5,'RC1',12]];   // [input, pin, PIC pin (DIP28)]
const BTN_NAME = k => k===6 ? 'A/V SLAVE' : k===7 ? 'spare (GPI only)' : 'IN '+(k+1);
const BTN_PIN = k => k===6 ? 'RA1' : k===7 ? 'RA0' : SCAN[k][1];
const selOf = v => { for (let k=0;k<6;k++) if (!((v>>IBIT[k])&1)) return k; return -1; };       // first lit input of an output_reg value
const selList = v => { const a=[]; for (let k=0;k<6;k++) if (!((v>>IBIT[k])&1)) a.push(k+1); return a; };
const xptOf = v => { if (!((v>>6)&1)) return 0; if (!(v&1)) return 1; if (!((v>>7)&1)) return 2; if (!((v>>1)&1)) return 3; if (!((v>>3)&1)) return 4; return 5; };  // do_switch decode chain
const BOUNCE_ON = [0, 0.16, 0.30, 0.52, 0.70, 1.02, 1.18];  // TS-type tactile switch bounce (ms) — INFERRED
const BOUNCE_OFF = [0, 0.22, 0.41, 0.80, 0.95];
const FW = {
  v102:{name:'V1.02 · #V102/pod9v102.asm (PIC16C73A, “POD2 remote with POD2 and POD9”, 1 Mar 2004)', short:'V102 (16C73A)', mix:false, force:true, f0data:false, initOut:0x9F, waitRel:true},
  f73: {name:'V1.02 · #V100/pod9v102.asm (V1.01 converted to PIC16F73, 9 Mar 2004)', short:'V1.02-F73', mix:true, force:false, f0data:true, initOut:0xBF, waitRel:false},
};
const PICS = {bars:'75% colour bars', ramp:'luminance ramp', multi:'multiburst', hatch:'crosshatch', flat:'50% flat field', black:'black burst'};
const PARTNER = {none:'nothing on P3', pod2:'POD2 (analog audio, pod2v200.asm)', pod10:'POD10 (AES audio, old pd10v103.asm)'};

/* ---------------- device state (what the user controls) ---------------- */
const SRC0 = () => [ {on:true, pic:'bars', ph:0}, {on:true, pic:'ramp', ph:0}, {on:true, pic:'multi', ph:0}, {on:true, pic:'hatch', ph:0}, {on:true, pic:'flat', ph:97}, {on:true, pic:'black', ph:0} ];
const D = { scenario:'press3', init:null, events:[], src:SRC0(), std:'ntsc', fw:'v102', log:[], hex:'F0 00' };
const SCEN = {
  idle:   {name:'Idle on input 1 (all sources genlocked except 5)', init:{}, ev:[]},
  press3: {name:'Front panel: press 3 at 100 ms (switch waits for vertical sync)', init:{}, ev:[{t:0.1, type:'btn', k:2, dur:C.PRESS, src:'front'}]},
  nosync: {name:'Input 6 unplugged: select 6, then 2 (no sync → timeout switch)', init:{src6:false}, ev:[{t:0.08,type:'btn',k:5,dur:0.1,src:'front'},{t:0.45,type:'btn',k:1,dur:0.1,src:'front'}]},
  async:  {name:'Input 5 not genlocked: 1 → 5 → 1 (picture jumps downstream)', init:{}, ev:[{t:0.1,type:'btn',k:4,dur:0.1,src:'front'},{t:0.5,type:'btn',k:0,dur:0.1,src:'front'}]},
  rs422:  {name:'RS-422: status, video 4, AFV C3, video code 7 (B8)', init:{}, ev:[...pair(0.05,0xF0,0x00,'console'), ...pair(0.25,0xF0,0xA0,'console'), ...pair(0.5,0xF0,0xC3,'console'), ...pair(0.75,0xF0,0xB8,'console')]},
  afv:    {name:'POD2 on the slave port: POD9 presses 4, then POD2 presses 6', init:{partner:'pod2'}, ev:[{t:0.15,type:'btn',k:3,dur:0.1,src:'front'},{t:0.6,type:'pbtn',k:5}]},
  c0c7:   {name:'Manual note test with a POD2: F0 C0, then F0 C7', init:{partner:'pod2'}, ev:[...pair(0.1,0xF0,0xC0,'console'), ...pair(0.55,0xF0,0xC7,'console')]},
  pod9r:  {name:'POD9R V500 remote polling; remote selects 3 at 400 ms', init:{remote:true}, ev:[{t:0.4,type:'rbtn',k:2}]},
  f73:    {name:'F73 build + POD2: A/V SLAVE on, press 2 (AFV), A/V SLAVE off', init:{partner:'pod2', fw:'f73'}, ev:[{t:0.1,type:'btn',k:6,dur:0.1,src:'front'},{t:0.4,type:'btn',k:1,dur:0.1,src:'front'},{t:0.75,type:'btn',k:6,dur:0.1,src:'front'}]},
  power:  {name:'Power-up at 100 ms (comes up on input 1, SLAVE lit)', init:{power:false}, ev:[{t:0.1,type:'power',on:true}]},
};
function pair(t, a, b, src){ return [{t, type:'rx', b:a, src}, {t:t+C.BYTE, type:'rx', b, src}]; }
function loadScenario(id){
  const s = SCEN[id]; D.scenario = id;
  D.init = Object.assign({power:true, partner:'none', remote:false}, JSON.parse(JSON.stringify(s.init)));
  D.src = SRC0(); if (D.init.src6 === false) D.src[5].on = false;
  D.fw = D.init.fw || 'v102';
  D.events = JSON.parse(JSON.stringify(s.ev)).map(e=>(e.scn=true, e));
  EMU_KEY = '';
}

/* ---------------- video sources: analytic composite signal (IRE) ---------------- */
function srcBase(k){ return C.REF0 + D.src[k].ph*S().H; }
function vsLow(k, t){            // LM1881 VS output (pin 3) for source k on the bus: low ≈230 µs from the vertical sync
  const s = D.src[k]; if (!s || !s.on) return false;
  const F = FIELD(), u = ((t - srcBase(k)) % F + F) % F, v0 = S().broad[0]*S().H/2 + C.VSD;
  return u >= v0 && u < v0 + C.VSW;
}
function lineInfo(k, t){         // which line of which field source k is on at time t
  const st = S(), H = st.H, fr = st.lines*H, tf = ((t - srcBase(k)) % fr + fr) % fr;
  const half = Math.floor(tf/(H/2)), N = st.lines, field = half < N ? 1 : 2, rel = half - (field===1?0:N);
  const lineInField = Math.floor(rel/2) + 1, line = Math.floor(tf/H) + 1;
  return {field, line, lineInField, u: tf % H, rel, half, tf};
}
function vbiKind(st, rel, N){    // half-line rel (from the field start) → 'pre' | 'broad' | 'post' | 'vbi' | null
  if (rel >= st.preEq[0] && rel < st.preEq[1]) return 'pre';
  if (rel >= st.broad[0] && rel < st.broad[1]) return 'broad';
  if (rel >= st.postEq[0] && rel < st.postEq[1]) return 'post';
  if (rel >= 0 && rel < st.vbi*2) return 'vbi';
  return null;
}
function ireAt(k, t){            // composite level of source k at time t (IRE: sync −40, blank 0, white 100)
  const s = D.src[k]; if (!s || !s.on) return 0;
  const st = S(), H = st.H, N = st.lines, L = lineInfo(k, t);
  let rel = L.rel; const toNext = (L.field===1 ? N : 2*N) - L.half;   // half-lines to the next field start (PAL pre-eq sits before it)
  let kind = vbiKind(st, rel, N); if (!kind && st.preEq[0] < 0 && -toNext >= st.preEq[0]) kind = 'pre';
  const uh = L.tf % (H/2);
  if (kind==='pre' || kind==='post') return uh < 2.3e-6 ? -40 : 0;
  if (kind==='broad') return uh < H/2 - 4.7e-6 ? -40 : 0;
  const u = L.u;
  if (u < st.sync) return -40;
  if (u >= st.burst[0] && u < st.burst[1]) return 20*Math.sin(2*Math.PI*st.fsc*t);
  if (kind==='vbi' || u < st.act0 || u >= st.act1) return 0;
  const x = (u - st.act0)/(st.act1 - st.act0); const p = picAt(s.pic, x, L.lineInField, t);
  return p.y + p.c*Math.sin(2*Math.PI*st.fsc*t + p.ph);
}
const BARS = [[77,0,0],[69,31,2.9],[56,44,5.4],[48,41,4.0],[36,41,0.9],[28,44,-0.5],[15,31,2.0]];   // luma, chroma p-p/2, phase (75 % bars, 7.5 setup)
function picAt(pic, x, line, t){
  const set = S().setup;
  if (pic==='bars'){ const b = BARS[Math.min(6, Math.floor(x*7))]; return {y:b[0], c:b[1], ph:b[2]}; }
  if (pic==='ramp') return {y:set + (100-set)*x, c:0, ph:0};
  if (pic==='multi'){ if (x < 0.12) return {y:x<0.06?100:set, c:0, ph:0}; const f = [0.5,1.25,2,3,3.58,4.2][Math.min(5, Math.floor((x-0.14)/0.143))]; if (x>=0.14 && ((x-0.14)%0.143) < 0.12) return {y:50, c:0, ph:0, mb:f, a:30}; return {y:50,c:0,ph:0}; }
  if (pic==='hatch'){ const v = Math.abs((x*14)%1) < 0.03 || line % 20 === 0; return {y:v?100:set, c:0, ph:0}; }
  if (pic==='flat') return {y:50, c:0, ph:0};
  return {y:set, c:0, ph:0};
}
function picMax(pic){ return pic==='bars'||pic==='ramp'||pic==='hatch'||pic==='multi' ? 100 : pic==='flat' ? 50 : S().setup; }

/* =====================================================================
   THE EMULATOR — runs main of pod9v102.asm pass by pass with the firmware's own registers.
   A pass costs the cycles of the path it takes (idle = 144 Tcy = 117.2 µs).
   ===================================================================== */
let EMU = null, EMU_KEY = '';
function pinLowAt(k, t){
  let low = false;
  for (const e of D.events){ if (e.type!=='btn' || e.k!==k) continue;
    const a = e.t, b = e.t + e.dur; if (t < a || t >= b + 0.0015) continue;
    if (e.src==='gpi'){ if (t < b) low = true; continue; }
    if (t < b){ const ms = (t-a)*1e3; let n=0; BOUNCE_ON.forEach(o=>{ if (ms>=o) n++; }); if (n%2) low = true; }
    else { const ms = (t-b)*1e3; let n=0; BOUNCE_OFF.forEach(o=>{ if (ms>=o) n++; }); if (n%2===0) low = true; }
  }
  return low;
}
function idleCost(){ return 144 + (FW[D.fw].mix ? 1 : 0); }
function emulate(){
  const key = JSON.stringify([D.init, D.events, D.src, D.std, D.fw]);
  if (key === EMU_KEY && EMU) return EMU;
  EMU_KEY = key;
  const TCY = C.TCY, H = C.HORIZON, fw = FW[D.fw];
  const N = Math.ceil((H - C.PRE)/(140*TCY)) + 50;
  const P = { t0:new Float64Array(N), cyc:new Uint16Array(N*ROUT.length), snap:new Int16Array(N*NV), n:0 };
  const sig = {}; const rec = (k,t,v)=>{ const a = sig[k] || (sig[k]=[]); if (a.length){ const l=a[a.length-1]; if (l[1]===v) return; if (t<=l[0]){ l[1]=v; return; } } a.push([t,v]); };
  const notes = []; const note = (t,txt,cls)=>notes.push({t, txt, cls:cls||''});
  const rxF = [], txF = [], spiX = [], tmr = [], sw = [], shifts = [], samples = [];
  const ev = D.events.slice().sort((a,b)=>a.t-b.t);
  /* ---- the outside world ---- */
  const W = { power:D.init.power, partner:D.init.partner, remote:D.init.remote };
  const PT = { pre:0xFE, video:0xFF, alt:false, out:0x00, hdr:false, rec:C.P_REC, inflag:false, tran:C.SPI_TRAN, pend:null };
  const R9 = { next:C.PRE+0.007, alt:false, pend:null, leds:0, bytes:[] };
  let rxQ = [], rcFifo = [], txBusyUntil = -1e9, sspRx = 0xFF;
  let tmrFlagAt = 1e9, V = null, alive = false, bootAt = W.power ? C.PRE : null, ei = 0, xpt = -1, xptT = C.PRE;
  const partnerName = ()=> W.partner==='pod10' ? 'POD10' : 'POD2';
  rec('partner', C.PRE, W.partner); rec('remote', C.PRE, W.remote?1:0); rec('power', C.PRE, W.power?1:0); rec('xpt', C.PRE, -1); rec('psel', C.PRE, PT.pre);
  const rb0 = t => !(xpt >= 0 && vsLow(xpt, t));          // RB0 = LM1881 VS of whatever is on the bus (high = no pulse)

  function partnerExchange(b, te){        // POD2/POD10 SPI slave: what it does with POD9's byte, then its next byte (pod2v200.asm)
    const out = PT.out;
    if (b === 0xF0) PT.hdr = true;
    else if (!PT.hdr) PT.rec = C.P_REC;
    else { PT.hdr = false;
      if (b & 0x80){ if (b !== PT.video) note(te, `${partnerName()} SPI_rcv_ctrl: POD9 status ${hex2(b)} → its “video” register (V${[0,1,2,3,4,5].find(i=>!(b&(1<<i)))+1||'—'}, slave ${b&0x40?'off':'ON'})`, 'pt'); PT.video = b; }
      else if (--PT.rec <= 0){ PT.rec = C.P_REC; if (b !== PT.pre){ note(te, `${partnerName()} acts on the 4th command ${hex2(b)} from POD9: router copies spi_reg → pre_output (audio input ${[0,1,2,3,4,5].find(i=>!(b&(1<<i)))+1||'—'}${b&0x40?'':', SUM'})`, 'pt'); } PT.pre = b; rec('psel', te, PT.pre); }
    }
    /* its SPI_trns_cntrl for the next exchange */
    PT.alt = !PT.alt;
    if (PT.alt) PT.out = 0xF0;
    else { let o = PT.pre | 0x80;
      if (PT.inflag){ if (--PT.tran <= 0){ PT.inflag = false; PT.tran = C.SPI_TRAN; } o &= 0x7F;
        if (!(PT.pre & 0x40)) o = (PT.video | 0x40) & 0x7F; else if (PT.video & 0x40) o |= 0x80; else o &= ~0x40; }
      PT.out = o & 255; }
    return out;
  }
  const remoteByte = ()=>{ R9.alt = !R9.alt; if (R9.alt) return 0xF0; if (R9.pend !== null){ const c = R9.pend; R9.pend = null; return c; } return 0x00; };

  function applyEvents(t){
    while (ei < ev.length && ev[ei].t <= t){ const e = ev[ei++];
      if (e.type==='rx'){ const t0 = Math.max(e.t, rxQ.length ? rxQ[rxQ.length-1].tEnd : -1e9); rxQ.push({t0, tEnd:t0+C.BYTE, b:e.b, src:e.src}); rxF.push({t0, b:e.b, src:e.src}); }
      else if (e.type==='partner'){ W.partner = e.v; rec('partner', e.t, e.v); Object.assign(PT, {pre:0xFE, video:0xFF, alt:false, out:0x00, hdr:false, rec:C.P_REC, inflag:false, tran:C.SPI_TRAN, pend:null}); rec('psel', e.t, PT.pre);
        note(e.t, e.v==='none' ? 'Slave-port cable removed from P3: SDI floats high through R33 10 kΩ → POD9 reads 0xFF' : `P3 cable to a ${PARTNER[e.v]}: POD9 is the SPI master and clocks it (it powers up on input 1)`, 'in'); }
      else if (e.type==='remote'){ W.remote = e.on; rec('remote', e.t, e.on?1:0); R9.next = e.t + 0.003; R9.alt = false; note(e.t, e.on?'POD9R remote on CONTROL: it sends one byte per 53.3 ms tick (F0, command, F0, …)':'POD9R unplugged', 'in'); }
      else if (e.type==='rbtn'){ R9.pend = 0x80 | ((e.k+1)<<3); note(e.t, `POD9R button ${e.k+1}: next command slot carries ${hex2(R9.pend)} = 10 ${(e.k+1).toString(2).padStart(3,'0')} 000 (video ${e.k+1}; audio field 000 ${'(inferred for a POD9-only system)'})`, 'in'); }
      else if (e.type==='pbtn'){ if (W.partner==='none'){ note(e.t, 'Partner button pressed but nothing is on P3', 'in'); continue; } PT.pend = {k:e.k, t:e.t + C.P_DEB}; note(e.t, `${partnerName()} front panel: ${e.k===6?'SUM':'button '+(e.k+1)} pressed (acts after its 12.6 ms debounce)`, 'in'); }
      else if (e.type==='power'){ if (e.on && !W.power){ W.power = true; bootAt = e.t; rec('power', e.t, 1); note(e.t, 'Mains on: T1 229B12 → bridge D1–D4 → LM317 +5 V / LM337 −5 V; the PIC waits out its power-up timer (config bits unknown, 72 ms assumed)', 'boot'); }
        else if (!e.on && W.power){ W.power = false; alive = false; rec('power', e.t, 0); rec('led', e.t, -1); xpt = -1; rec('xpt', e.t, -1); note(e.t, 'Mains off: rails collapse, OUT 1/2 go to 0 V', 'boot'); } }
      else if (e.type==='btn'){ note(e.t, `${BTN_NAME(e.k)} ${e.src==='gpi'?'closed on the GPI header P4':'pressed on the front panel'} — ${BTN_PIN(e.k)} pulled low through 330 Ω (RP3/RP4), 3K3 pull-up RN1`, 'in'); }
    }
  }
  function service(t){
    if (PT.pend && PT.pend.t <= t){ const k = PT.pend.k; PT.pend = null;
      if (k===6) PT.pre ^= 0x40; else if (!(PT.pre & 0x40)) PT.pre ^= (1<<k); else PT.pre = (0xFF & ~(1<<k));
      PT.inflag = true; PT.tran = C.SPI_TRAN; rec('psel', t, PT.pre);
      note(t, `${partnerName()} router: pre_output = ${hex2(PT.pre)} (audio ${[0,1,2,3,4,5].filter(i=>!(PT.pre&(1<<i))).map(i=>i+1).join('+')||'—'}${PT.pre&0x40?'':' SUM'}); ${PT.video&0x40?'POD9 reports slave OFF, so only status bytes go out':'POD9 reports slave ON, so do_spi sends it as a command in the next 32 data slots'}`, 'pt'); }
    while (W.remote && R9.next <= t){ const b = remoteByte(); const t0 = Math.max(R9.next, rxQ.length ? rxQ[rxQ.length-1].tEnd : -1e9); rxQ.push({t0, tEnd:t0+C.BYTE, b, src:'pod9r'}); rxF.push({t0, b, src:'pod9r'}); R9.next += C.T2R; }
    while (rxQ.length && rxQ[0].tEnd <= t){ const r = rxQ.shift(); if (W.power && alive){ if (rcFifo.length < 2) rcFifo.push(r.b); else { rcFifo.ovr = true; note(r.tEnd, 'RCREG FIFO full: OERR (the byte is lost)', 'uart'); } } }
  }
  function setXpt(t, v, why){ if (v === xpt) return; xpt = v; xptT = t; rec('xpt', t, v); }

  /* ---- init (pod9v102.asm init) ---- */
  function fresh(t){
    V = {}; VARS.forEach(k=>V[k]=0);
    Object.assign(V, {output_reg:fw.initOut, pre_output:fw.initOut, bcount:C.DEB, audio:0xFF, spi_output:0xFF, spi_output_temp:0xFF, output_flag:1,
      audio_count:C.AUDIO_CNT, spi_tran_count:C.SPI_TRAN, switch_count:C.SW_CNT, spi_rec_count:C.REC0, rel_flag:1, RC0:1, PORTB:0x58, switch_out:0, spi_transmit:0});
    setXpt(t, -1); rec('RC0', t, 1);
    tmrFlagAt = t + 60*TCY + C.TMR2_0*TCY; rcFifo = []; txBusyUntil = -1e9; sspRx = 0xFF;
    spiX.push({t:t+50*TCY, mosi:0xFF, miso:null, init:true});            // init: movlw 0xFF / movwf SSPBUF → the first exchange
  }
  function outputRoutine(t, n, why){     // output: shift output_reg into the 74HC4094 and latch
    const v = V.output_reg; V.pre_output = v; V.switch_flag |= 1; V.output_flag = 0; V.bcount = C.DEB;
    shifts.push({t, v}); rec('led', t + 92*TCY, v); rec('pre', t, V.pre_output);
    note(t, `pass ${n}: output${why?' ('+why+')':''} — output_reg ${hex2(v)} = ${bin8(v)}b shifted LSB first on RB6/RB7, STR (RB5) → LEDs: ${selList(v).map(x=>'IN'+x).join(' ')||'no input'}${v&0x20?'':' + A/V SLAVE'}${v&0x10?'':' + spare'}; switch_flag,0 set`, 'out');
    return 96;
  }
  function runPass(t0, n){
    const cyc = new Array(ROUT.length).fill(0); let c = 0;
    const at = ()=> t0 + c*TCY;
    const step = (i, cost)=>{ cyc[i] = cost; c += cost; };
    step(0, 1); step(1, 14);
    /* input */
    service(at());
    V.input_reg = 0xFF; let ic = 27, hit = -1;
    for (let i=0;i<6;i++){ if (pinLowAt(i, at())){ V.input_reg &= ~(1<<IBIT[i]); ic = 2 + 3*i + 2 + 1 + 2; hit = i; break; } }
    if (hit < 0){
      if (pinLowAt(7, at())){ V.input_reg &= ~0x10; }
      if (fw.mix){ ic = 28; if (pinLowAt(6, at())){ V.input_reg &= ~0x20; V.input_flag |= 0x80; ic = 31; } }
    }
    step(2, ic);
    /* debounce */
    let dc = 5;
    if (!(V.rel_flag & 1)){
      if (V.input_reg === 0xFF){ V.bcount = 0xFF; V.bcount--; dc = 18; }
      else { dc = 14; if (V.bcount === C.DEB){ V.bounce = V.input_reg; dc += 4; }
        if (V.input_reg !== V.bounce){ V.bcount = 0xFF; dc += 6; }
        V.bcount = (V.bcount - 1) & 255;
        if (V.bcount === 0){ V.bcount = C.DEB; V.rel_flag |= 1; V.input_flag |= 3; V.spi_tran_count = C.SPI_TRAN; V.remote_flag = 0; dc += 10;
          note(at(), `pass ${n}: debounce — input_reg ${hex2(V.input_reg)} held for 254 passes → rel_flag,0, input_flag 0/1 set, spi_tran_count = 0x20, remote_flag cleared${V.input_reg===0xEF||V.input_reg===0xCF?' (the spare input RA0)':''}`, 'deb'); } }
    }
    step(3, dc);
    /* router */
    let rc = 11;
    if (V.input_flag & 1){ V.input_flag &= ~1; const old = V.pre_output; let why;
      if (!(V.pre_output & 0x20)){ if (V.input_reg & 0x20){ V.input_reg &= ~0x20; why = 'next_output1: slave stays ON'; } else { V.input_reg = V.pre_output | 0x20; why = 'next_output1 → if_clear: A/V SLAVE toggles OFF'; } }
      else { if (!(V.input_reg & 0x20)){ V.input_reg = V.pre_output & ~0x20; why = 'next_output2: A/V SLAVE toggles ON'; } else why = 'next_output2: slave stays off'; }
      V.output_reg = V.pre_output = V.input_reg; V.output_flag |= 1; rc = 22;
      note(at(), `pass ${n}: router — local press: ${why}; pre_output ${hex2(old)} → ${hex2(V.pre_output)}`, 'route'); }
    else if (V.remote_flag & 1){ V.remote_flag &= ~1; V.output_reg = V.pre_output = V.spi_reg; V.output_flag |= 1; rc = 16;
      note(at(), `pass ${n}: router next_route0 — remote_flag,0 (slave port): spi_reg ${hex2(V.spi_reg)} → output_reg (video follows ${partnerName()})`, 'route'); }
    else if (V.remote_flag & 2){ V.output_reg = V.video_reg; V.output_flag |= 1; V.remote_flag &= ~2; rc = 18;
      note(at(), `pass ${n}: router next_route1 — remote_flag,1 (RS-422): video_reg ${hex2(V.video_reg)} → output_reg`, 'route'); }
    step(4, rc);
    /* output */
    step(5, (V.output_flag & 1) ? outputRoutine(at(), n) : 5);
    /* switch_check */
    let sc = 5;
    if (V.switch_flag & 1){
      const forced = !!(V.switch_flag & 2), low = !rb0(at());
      samples.push([at(), low?1:0]);
      if (!forced && !low) sc = 9;
      else { V.switch_flag = 0; V.switch_count = C.SW_CNT; sc = 14;
        const target = V.pre_output & 0xDF;
        if (target !== V.switch_out){ V.switch_out = target; const to = xptOf(V.pre_output), from = xpt;
          const tb = at() + 10*TCY, tm = at() + (16 + 2*to)*TCY; sc = 24 + 2*to;
          setXpt(tb, -1); setXpt(tm, to);
          V.PORTB = (V.PORTB & 0xE1) | ([0x10,0x12,0x14,0x08,0x0A,0x0C][to]);
          let li = null; if (from >= 0 && D.src[from].on) li = lineInfo(from, tm);
          sw.push({t:tm, tb, from, to, why: forced ? 'timeout' : 'vs', li, n});
          note(tm, `pass ${n}: switch_check do_switch — ${forced?'<b>no vertical sync for 8 timer ticks</b>: switch_flag,1 forces it':'RB0 low (LM1881 vertical sync)'}: RB4/RB3 high (both muxes off), RB2/RB1 low, then ${['RB3 low → U6 IN0','RB1 high, RB3 low → U6 IN1','RB2 high, RB3 low → U6 IN2','RB4 low → U5 IN0','RB1 high, RB4 low → U5 IN1','RB2 high, RB4 low → U5 IN2'][to]} = input ${to+1}${li?` · ${li.field===1?'field 1':'field 2'} line ${li.lineInField} of the old source${li.lineInField<=S().vbi?' (vertical interval)':' — <b>inside the picture</b>'}`:''}${selOf(V.pre_output)<0?' (no input bit low: the else-branch picks input 6)':''}`, 'sw'); }
        else note(at(), `pass ${n}: switch_check — pre_output & 0xDF equals switch_out: crosspoint unchanged`, 'sw');
      }
      rec('swwait', at(), V.switch_flag & 1);
    }
    step(6, sc);
    /* debounce_rel */
    let drc = 5;
    if (V.rel_flag & 1){ drc = 11; if (V.input_reg !== 0xFF){ V.bcount = 0xFF; drc += 4; } V.bcount = (V.bcount - 1) & 255; if (!V.bcount){ V.bcount = C.DEB; V.rel_flag &= ~1; drc += 4; } }
    step(7, drc);
    rec('bcount', at(), V.bcount); rec('rel', at(), V.rel_flag & 1); rec('inflag', at(), V.input_flag & 3);
    /* recieve_uart */
    service(at());
    let ruc = 5;
    if (rcFifo.length){ const b = rcFifo.shift(); if (rcFifo.ovr){ rcFifo.ovr = false; ruc += 2; note(at(), `pass ${n}: recieve_uart — OERR: CREN toggled to clear it`, 'uart'); } V.recieved_reg = b; V.transmit_flag |= 1; V._fresh = true; ruc = 12; }
    step(8, ruc);
    step(9, (V.transmit_flag & 1) ? 15 : 5);
    step(10, translate(at(), n));
    /* transmit_uart */
    let tuc = 13;
    if (at() >= txBusyUntil){ if (V.RC0){ V.RC0 = 0; rec('RC0', at()+4*TCY, 0); }
      if (V.transmit_flag & 1){ V.transmit_flag &= ~1; V.RC0 = 1; const ts = at()+8*TCY; rec('RC0', ts, 1); txF.push({t0:ts, b:V.transmit_reg}); txBusyUntil = ts + C.BYTE; tuc = 17;
        if (W.remote) R9.bytes.push({t:ts+C.BYTE, b:V.transmit_reg});
        note(ts, `pass ${n}: transmit_uart — TRMT = 1 → RC0 (U2 75176 driver enable) high, TXREG = ${hex2(V.transmit_reg)} (${bin8(V.transmit_reg)}b) out on CONTROL pins 3/8`, 'uart'); } }
    step(11, tuc);
    /* SPI_trns_cntrl, SPI_master, SPI_rcv_ctrl (all gated by spi_transmit,0) */
    step(12, spiTrns(at(), n));
    let smc = 9;
    if (V.spi_transmit & 1){
      if (fw.force) V.pre_output &= ~0x20;                               // V102 only: bcf pre_output,5 on every exchange
      V.spi_recieved = sspRx; const te = at() + 9*TCY, out = V.spi_output;
      let miso = null;
      if (W.partner !== 'none' && W.power) { miso = partnerExchange(out, te); sspRx = miso; } else sspRx = 0xFF;
      spiX.push({t:te, mosi:out, miso: W.partner==='none' ? null : miso});
      smc = 16;
    }
    step(13, smc);
    step(14, spiRcv(at(), n));
    /* timer_check */
    let tcc = 5;
    if (at() >= tmrFlagAt){
      tmr.push(tmrFlagAt); tmrFlagAt = at() + 9*TCY + C.TMR2*TCY; tcc = 16; V.spi_transmit |= 1;
      V.audio_count = (V.audio_count - 1) & 255;
      if (!V.audio_count){ V.audio_count = C.AUDIO_CNT; V.audio = 0xFF; tcc += 6;
        if (!(V.pre_output & 0x20)){ V.pre_output |= 0x20; V.output_reg = V.pre_output; V.output_flag |= 1; tcc += 4;
          note(at(), `pass ${n}: timer_check — audio_count ran out (32 ticks without an F0-framed byte on SDI): audio = 0xFF, pre_output bit 5 set → A/V SLAVE LED off`, 'spi');
          tcc += outputRoutine(at()+tcc*TCY, n, 'from timer_check'); } }
      if (V.switch_flag & 1){ V.switch_count = (V.switch_count - 1) & 255; if (!V.switch_count){ V.switch_flag |= 2; V.switch_count = C.SW_CNT; note(at(), `pass ${n}: timer_check synch_check — switch_count reached 0 (8 ticks ≈ 27 ms) with no vertical sync seen: switch_flag,1 → next switch_check switches regardless`, 'warn'); } }
    }
    step(15, tcc);
    step(16, 2);
    rec('slave', at(), (V.pre_output>>5)&1); rec('audio', at(), V.audio);
    return {cyc, c};
  }
  function spiSetup(w){ V.spi_output_temp = w & 0x7F; V.spi_output = 0xF0; V.remote_flag |= 0x0C; }
  function statusByte(){ let r = 0x80; for (let k=0;k<6;k++) if (!((V.pre_output>>IBIT[k])&1)) r |= (1<<k); if (!(V.pre_output & 0x20)) r |= 0x40; return r; }
  function translate(t, n){
    if (V.which_flag & 1){ V.transmit_flag |= 1; V.which_flag &= ~1; V.transmit_reg = (~V.audio) & 0x7F;
      note(t, `pass ${n}: translate_uart send_audio — 2nd reply byte = ~audio, bit 7 cleared = ${hex2(V.transmit_reg)} (${partnerName()} status: bit 6 SUM, bits 5–0 audio 6–1; 00 if no audio switcher)`, 'uart'); return 14; }
    if (!(V.transmit_flag & 1)) return 7;
    const r = V.recieved_reg;
    if (r === 0xF0){ V._fresh = false; V.uart_flag |= 0x80; V.transmit_flag &= ~1; note(t, `pass ${n}: translate_uart — F0 address byte: uart_flag,7 set, no reply`, 'uart'); return 12; }
    const fresh = V._fresh; V._fresh = false;
    if (!(V.uart_flag & 0x80)){ if (fresh) note(t, `pass ${n}: translate_uart — ${hex2(r)} without a preceding F0: ignored, but transmit_flag,0 stays set, so transmit_uart re-sends the old transmit_reg ${hex2(V.transmit_reg)} (Findings F9)`, 'warn'); return 12; }
    V.uart_flag &= ~0x80;
    let what;
    if (!(r & 0x80)){
      if (!(r & 0x40)) what = '00xx xxxx → status_check (REQUEST STATUS)';
      else { V.recieved_reg = (~r) & 255; spiSetup(V.recieved_reg); V.spi_output_temp &= ~0x40; V.remote_flag &= ~1; V.input_flag = 0; V.remote_flag |= 2; V.video_reg = V.pre_output | 0x20;
        what = `01xx xxxx → sum_audio: ~cmd → spi_uart_setup, bit 6 cleared: ${partnerName()} gets SUM command ${hex2(V.spi_output_temp)} ×32; video_reg = pre_output | 0x20 → slave OFF`; }
    } else if (r & 0x40){
      const a = r & 7;
      if (a === 0){ V.video_reg = V.pre_output | 0x20; V.remote_flag = 2; V.input_flag = 0; what = '11xx x000 → slave_off: video_reg = pre_output with bit 5 set → A/V SLAVE OFF (the manual says C0 turns it ON — Findings F2)'; }
      else if (a === 7){ V.video_reg = V.pre_output & ~0x20; V.remote_flag = 2; V.input_flag = 0; spiSetup(V.audio); V.spi_output_temp |= 0x40; what = `11xx x111 → slave_on: bit 5 cleared → A/V SLAVE ON (manual: C7 = OFF); ${partnerName()} is sent its own audio back (${hex2(V.spi_output_temp)})`; }
      else { const wasOff = !!(V.pre_output & 0x20);
        V.video_reg = VT[a] & ~0x20; V.input_flag = 0; V.remote_flag = 2; spiSetup(AT[a]); V.spi_output_temp |= 0x40;
        if (wasOff){ spiSetup(V.audio); V.spi_output_temp |= 0x40; V.video_reg = V.pre_output & ~0x20; what = `11xx x${a.toString(2).padStart(3,'0')} → not_on, but pre_output bit 5 was set (slave off): the “;test” branch only turns slave ON — no switch`; }
        else what = `11xx x${a.toString(2).padStart(3,'0')} → not_on: video_table(${a}) = ${hex2(VT[a])}, bit 5 cleared → video ${a} + slave ON; audio_table(${a}) = ${hex2(AT[a])} queued for ${partnerName()}`; }
    } else {
      if ((r & 0x7F) === 0){ spiSetup(V.audio); V.spi_output_temp |= 0x40; what = `1000 0000 → cancel_sum: ${partnerName()} is sent its audio with bit 6 set (SUM off)`; }
      else { const v = (r>>3)&7, a = r&7, parts = [];
        if (v){ V.video_reg = VT[v]; V.remote_flag |= 2; parts.push(`video ${v} → video_table = ${hex2(VT[v])}${v===7?' — code 7 lands on “return”: W = 07 lights IN1, IN3, IN5, SLAVE and spare (Findings F6)':''} (bit 5 = ${VT[v]>>5&1}: slave ${VT[v]&0x20?'OFF':'ON'})`); }
        if (a){ spiSetup(AT[a]); parts.push(`audio ${a} → audio_table = ${hex2(AT[a])} → ${partnerName()} ×32${a===7?' (code 7: W = 07 → a SUM of audio 4–6 on the POD2)':''}`); }
        what = `10vv vaaa → ${parts.join('; ')}`; }
    }
    V.which_flag |= 1; V.transmit_reg = statusByte();
    note(t, `pass ${n}: translate_uart — command ${hex2(r)} = ${bin8(r)}b: ${what}. status_check: 1st reply byte = ${hex2(V.transmit_reg)} (1 S 654321, 1 = selected)`, 'uart');
    return 44;
  }
  function spiTrns(t, n){
    if (!(V.spi_transmit & 1)) return 5;
    if (V.remote_flag & 8){ V.spi_output = 0xF0; V.remote_flag &= ~8; return 11; }
    if (V.remote_flag & 4){ V.spi_output = V.spi_output_temp; V.remote_flag &= ~4; V.spi_tran_count = (V.spi_tran_count - 1) & 255;
      if (V.spi_tran_count) V.remote_flag |= 0x0C; else { V.spi_tran_count = C.SPI_TRAN; note(t, `pass ${n}: SPI_trns_cntrl next_rem — 32nd copy of the RS-422-originated byte sent; spi_tran_count reloaded`, 'spi'); }
      return 17; }
    if (!(V.spi_transmit & 2)){ V.spi_output = 0xF0; V.spi_transmit |= 2; return 13; }
    V.spi_transmit &= ~2; V.spi_output = 0xFF; let cc = 32;
    if (V.input_flag & 2){
      V.spi_tran_count = (V.spi_tran_count - 1) & 255; if (!V.spi_tran_count){ V.input_flag &= ~2; V.spi_tran_count = C.SPI_TRAN; }
      if (V.input_flag & 0x80){ if (!(V.input_flag & 2)) V.input_flag &= ~0x80; V.spi_output = (V.audio | 0x40) & 0x7F;
        if (V.spi_tran_count === C.SPI_TRAN-1) note(t, `pass ${n}: SPI_trns_cntrl spi_special — A/V SLAVE pressed: ${partnerName()} is sent its own audio ${hex2(V.spi_output)} (bit 6 set) as a command`, 'spi'); return 30; }
      if (!(V.pre_output & 0x20)){ V.spi_output &= 0x7F; cc = 36; }
    }
    for (let k=0;k<6;k++) if (!((V.pre_output>>IBIT[k])&1)) V.spi_output &= ~(1<<k);
    if (!(V.pre_output & 0x20)) V.spi_output &= ~0x40;
    if (!(V.spi_output & 0x80)){ V.spi_output |= 0x40; if (V.spi_tran_count === C.SPI_TRAN-1) note(t, `pass ${n}: SPI_trns_cntrl next_spi — local press with slave on: command ${hex2(V.spi_output)} (bit 7 = 0, bit 6 set by “btfss spi_output,7 / bsf spi_output,6”) in the next 32 data slots`, 'spi'); }
    return cc;
  }
  function spiRcv(t, n){
    if (!(V.spi_transmit & 1)) return 5;
    V.spi_transmit &= ~1;
    const b = V.spi_recieved;
    if (b === 0xF0 && !(fw.f0data && (V.spi_transmit & 4))){ V.spi_transmit |= 4; return 12; }
    if (!(V.spi_transmit & 4)){ V.spi_rec_count = C.REC; V.spi_transmit &= ~4; return 14; }
    V.spi_transmit &= ~4;
    if (b & 0x80){ V.audio_count = C.AUDIO_CNT; const na = b & 0x7F; if (na !== V.audio) note(t, `pass ${n}: SPI_rcv_ctrl — ${partnerName()} status ${hex2(b)}: audio = ${hex2(na)} (audio ${[0,1,2,3,4,5].filter(i=>!(na&(1<<i))).map(i=>i+1).join('+')||'—'}${na&0x40?'':', SUM'})`, 'spi'); V.audio = na; return 20; }
    V.audio_count = C.AUDIO_CNT;
    V.spi_rec_count = (V.spi_rec_count - 1) & 255; let cc = 22;
    if (!V.spi_rec_count){ V.remote_flag |= 1; V.spi_rec_count = C.REC; }
    if (!(V.remote_flag & 1)) return cc;
    V.spi_reg = 0xFF; if (b === 0){ note(t, `pass ${n}: SPI_rcv_ctrl — command 00: spi_reg left at 0xFF but remote_flag,0 stays set → all LEDs off, crosspoint to input 6 (Findings F7)`, 'warn'); return cc+4; }
    let k = -1; for (let i=0;i<6;i++) if (!(b & (1<<i))){ k = i; break; }
    if (k >= 0) V.spi_reg &= ~(1<<IBIT[k]);
    if (!(b & 0x40)) V.spi_reg &= ~0x20;
    note(t, `pass ${n}: SPI_rcv_ctrl no_update → spi_rec_setup: command ${hex2(b)} counted down to 0 → remote_flag,0; spi_reg = ${hex2(V.spi_reg)} (video ${k>=0?k+1:'—'}, slave ${b&0x40?'off':'on'})`, 'spi');
    return cc + 18;
  }

  /* ---- run ---- */
  let t = C.PRE;
  applyEvents(t);
  while (t < H && P.n < N){
    applyEvents(t);
    if (!W.power){ service(t); const nt = Math.min(H, ev[ei] ? ev[ei].t : H, W.remote?R9.next:H); t = Math.max(nt, t + 1e-4); continue; }
    if (!alive){
      const ready = bootAt + (bootAt > C.PRE ? C.PWRT + 1024/C.FOSC : 0);
      if (t < ready){ if (bootAt > C.PRE) rec('led', bootAt, -1); service(t); t = Math.min(ready, t + 1e-3); continue; }
      alive = true; fresh(t);
      let ic = 60; if (fw.waitRel) ic += 254*19;                                  // init_loop1: 254 × ≈19 Tcy with every button up
      if (bootAt > C.PRE) note(t, `PIC leaves reset → init: TRISB = 01, TRISC = 96, SPBRG = 7 (9600), SSPCON = SSPEN (SPI master, Fosc/4), T2CON = FF, SSPBUF = FF${fw.waitRel?'; init_loop1 waits for all 8 inputs high for 254 loops (3.9 ms)':''}; then “call output”: output_reg = ${hex2(fw.initOut)} → IN1${fw.initOut&0x20?'':' + A/V SLAVE'} lit`, 'boot');
      t += ic*TCY;
      outputRoutine(t, 0, 'reset vector: call output'); t += 96*TCY;
    }
    const n = P.n; const {cyc, c} = runPass(t, n);
    P.t0[n] = t; for (let i=0;i<ROUT.length;i++) P.cyc[n*ROUT.length+i] = cyc[i];
    const o = n*NV; VARS.forEach((k,i)=>P.snap[o+i] = V[k]|0);
    P.n++;
    t += c*TCY;
  }
  applyEvents(H); service(H);
  const r9 = []; R9.bytes.forEach(x=>{ if (x.b & 0x80) r9.push([x.t, x.b & 0x7F]); });
  EMU = { P, sig, notes, rxF, txF, spiX, tmr, sw, shifts, samples, r9, final: V ? Object.assign({}, V) : null, PT:{pre:PT.pre, video:PT.video}, alive };
  return EMU;
}
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
function powerAt(t){ return !!sv('power', t, 0) && sv('led', t, -1) !== -1; }
const ledAt = t => sv('led', t, -1);
const xptAt = t => sv('xpt', t, -1);
const fin = ()=> emulate().final || {};
const finXpt = ()=> sv('xpt', C.HORIZON, -1);
const finLed = ()=> sv('led', C.HORIZON, -1);
const finSlave = ()=> { const l = finLed(); return l >= 0 && !(l & 0x20); };
const pSelOf = v => [0,1,2,3,4,5].filter(i=>!(v&(1<<i)));

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
function stateAt(key, t){ let v = D.init[key]; D.events.filter(e=>e.type===key && e.t<=t).forEach(e=>v = (e.v!==undefined ? e.v : e.on)); return v; }
const A = {
  btn(k, src){ src = src||'front'; act(`${src==='gpi'?'GPI':'Press'} ${BTN_NAME(k)}`, tr=>{
    if (!powerAt(SIM.t)) tr('The unit is off (or still in reset): nothing happens.');
    tr(`${src==='gpi'?'GPI header P4 pin '+(k===6?1:k===7?2:k+3)+' to GND (pin 9)':'Lit push-button (ITT KSD on the assembly drawing)'} pulls ${BTN_PIN(k)} low through 330 Ω (RP3/RP4) for ${C.PRESS*1000} ms (${inf}); RN1 3K3 pull-up. No interrupt: input polls the pin once per pass.`);
    if (k===6 && !FW[D.fw].mix) tr('<b>V102 never reads RA1</b> (the “check mix” lines in input are commented out): the A/V SLAVE button does nothing in this build. Switch the firmware to the F73 build to use it (Findings F1).');
    if (k===7) tr('RA0 “spare” is only on the GPI header: it clears input_reg bit 4, so no input bit is low and do_switch falls through to input 6 (Findings F7).');
    D.events.push({t:SIM.t, type:'btn', k, dur:C.PRESS, src, user:true}); }); },
  power(){ const on = !!sv('power',SIM.t,0); act(on?'Power switch off':'Power switch on', tr=>{ tr(on?'Rocker off: the 229B12 toroid is disconnected.':'Rocker on: T1 → D1–D4 → C1/C2 470 µF → LM317 (+5 V, 221 R/665 R) and LM337 (−5 V).'); D.events.push({t:SIM.t, type:'power', on:!on, user:true}); }); },
  send(bytes, label){ act(`RS-422 send ${bytes.map(hx).join(' ')}${label?' ('+label+')':''}`, tr=>{
    tr(`Bytes arrive on CONTROL pins 7/2 (RX+/RX−) → R28/R29 22 Ω → U1 75176 → RC7, ${(C.BYTE*1e3).toFixed(3)} ms each (start + 8 data + stop at 9600 baud).`);
    let t = SIM.t; bytes.forEach(b=>{ D.events.push({t, type:'rx', b, src:'console', user:true}); t += C.BYTE; }); }); },
  partner(v){ act(v==='none'?'Unplug the slave port P3':'Connect a '+PARTNER[v]+' to P3', tr=>{ tr('P3 (PAN400, “TO AUDIO SWITCHER”): pin 1 SCK ← RC3 via R4 100 Ω, pin 2 SDO ← RC5 via R3, pin 3 SDI → RC4 via R5, pin 4 GND; R33–R35 10 kΩ pull-ups (POD9-iss2.net, assembly note 4).'); D.events.push({t:SIM.t, type:'partner', v, user:true}); }); },
  pbtn(k){ act(`${stateAt('partner',SIM.t)==='pod10'?'POD10':'POD2'}: press ${k===6?'SUM':k+1}`, tr=>{ if (stateAt('partner',SIM.t)==='none') tr('Nothing is connected to P3.'); tr('The audio switcher is simulated from pod2v200.asm (pod2.js): debounce, router, then SPI_trns_cntrl answers on the next data slots.'); D.events.push({t:SIM.t, type:'pbtn', k, user:true}); }); },
  remote(on){ act(on?'Plug in a POD9R remote':'Unplug the POD9R', tr=>{ tr('POD9R V500 (pod2r200.asm on POD2R hardware, “video only remote”) shares the RS-422 pins: it polls F0, 00 once per 53.3 ms tick and shows the reply.'); D.events.push({t:SIM.t, type:'remote', on, user:true}); }); },
  rbtn(k){ act('POD9R: press '+(k+1), tr=>{ if (!stateAt('remote',SIM.t)) tr('No POD9R is plugged in.'); D.events.push({t:SIM.t, type:'rbtn', k, user:true}); }); },
  src(k, prop, v){ D.src[k][prop] = v; EMU_KEY=''; D.log.unshift({t:SIM.t, name:`IN ${k+1} ${prop==='on'?(v?'source connected':'source removed'):prop==='pic'?PICS[v]:'timing offset '+v+' lines'}`, trace:['Analog only: BNC → 75 Ω termination (R9–R19 odd) → 100 Ω → GX434/HA4314 input. The firmware only sees it through the LM1881 when it is on the bus.']}); SIM.refresh(); },
  std(s){ D.std = s; EMU_KEY=''; D.log.unshift({t:SIM.t, name:'Video standard '+STD[s].name, trace:['Changes the line and field timing of all six sources and so where the LM1881 finds vertical sync.']}); SIM.refresh(); },
  fw(f){ D.fw = f; EMU_KEY=''; D.log.unshift({t:SIM.t, name:'Firmware: '+FW[f].short, trace:[FW[f].name, f==='f73'?'A/V SLAVE (RA1) is read; SPI_master no longer forces pre_output bit 5; init comes up with SLAVE off (0xBF).':'A/V SLAVE is not read; SPI_master clears pre_output bit 5 on every exchange; init lights SLAVE (0x9F).']}); SIM.refresh(); },
  scenario(id){ loadScenario(id); D.log.unshift({t:0, name:'Scenario: '+SCEN[id].name, trace:['Events replaced; the emulator re-ran pod9v102.asm from −0.25 s to 2 s.']}); SIM.refresh(); },
  clear(){ D.events = D.events.filter(e=>!e.user); EMU_KEY=''; D.log.unshift({t:SIM.t, name:'Cleared your actions', trace:['Back to the scenario events only.']}); SIM.refresh(); },
};
window.__pod9Keys = false;
document.addEventListener('keydown', e=>{
  if (!window.__pod9Keys || !/[?&]plugin=pod9(&|$)/.test(location.search) || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k>='1' && k<='6'){ A.btn(+k-1); e.preventDefault(); } else if (k==='s'){ A.btn(6); e.preventDefault(); }
});

/* ================================================================
   DRAWING: front and rear panel on the real silkscreen
   ================================================================ */
/* Built on POD9 - #ARTWORK #DA #2016/POD9-FRONT&REAR-SILK (CURVE).pdf (sheet dated Jun.19/14). tools/silk_extract.py cut the
   FRONT GREEN, FRONT WHITE and REAR WHITE separations at 200 dpi between the crop marks (x 292–2006; y 118–439 / 645–966 /
   1164–1485) → 1714 × 321 px = 8.57" × 1.606", the panel size on the FRONT ISS 2 / REAR ISS 3 drawings.
   Front ISS 2 ("the same as POD2 front issue 2, only the silkscreen is different"): rocker .505 × .770 at x .900 / y .950,
   PWR LED .130 at 1.496 / .516, seven .406" holes at 2.400 (A/V SLAVE) and 3.900 + 5 × .750, y .803 → px = 200·x, 200·(1.606 − y).
   Rear ISS 3 is drawn as an INSIDE VIEW, so x is mirrored: outside x = 8.570 − x. BNC D-holes .376" at 0.950 (OUT 1/2),
   2.000/3.050/4.100 top (IN 1/3/5, y .376) and 2.525/3.575/4.625 bottom (IN 2/4/6, y 1.026); DE9 .465 × .768 at 5.885 / 1.043,
   AC inlet 1.256 × 1.080 at 7.415 / .703. The silk crosshairs (OUT 1 (194,73), IN 2 (509,204), IN 5 (824,73), IN 6 (929,204))
   sit 4 px right of 200·x: the cut is 4 px off the drawing's edge, so the rear features are placed at 200·x + 4. */
const ASSET = 'siumulation-plugins/assets/';
/* Artwork 2026|59: the panels now come straight from the CorelDRAW sheet POD9-FRONT&REAR-SILK (CURVE).cdr (Jun.19/14, text as curves). Inkscape → plain SVG;
   the FRONT GREEN, FRONT WHITE and REAR WHITE plates were cut at their outline (x 105.22 pt; y 42.39 / 231.95 / 418.68 pt; 617.04 × 115.63 pt = 8.570 × 1.606 in),
   the two front plates registered on one face and inked POD green rgb(52,168,83) / white rgb(240,240,236). Cut-outs, screw holes and
   drill centre marks are kept as faint geometry, not ink. 1 pt = 200/72 px, the same grid the PDF cut used, so the controls stay on their holes. */
const ART_SRC = '#POD #SERIES/POD9 - #Master/POD9 - #ARTWORK #DA #2016/POD9-FRONT&REAR-SILK (CURVE).cdr';
const ART_CAP = `<div class="small muted" style="margin-top:4px">Front and rear artwork: ${SIM.src(ART_SRC, 'POD9-FRONT&REAR-SILK (CURVE).cdr')} (CorelDRAW, Jun.19/14 · ${SIM.year(2014)}), green and white plates registered on one panel.</div>`;
const BX = [780, 930, 1080, 1230, 1380, 1530], SLX = 480, BY = 161;
const RX = k => [404, 509, 614, 719, 824, 929][k], RY = k => k%2 ? 205 : 75;
function frontSVG(t, opts){
  opts = opts||{};
  const pwr = !!sv('power',t,0), alive = powerAt(t), led = ledAt(t);
  const lit = b => alive && led>=0 && !((led>>b)&1);
  const down = k => pinLowAt(k, t);
  const btn = (x, k, label, bit)=>{ const on = lit(bit), d = down(k);
    return `<g class="p9b" data-k="${k}" style="cursor:pointer"><title>${label} (click${k===6?' or press S':' or press '+(k+1)}) — ${BTN_PIN(k)}; LED = 74HC4094 Q${QOF(bit)} (output_reg bit ${bit})</title>
      <circle cx="${x}" cy="${BY}" r="40.5" fill="#050606" stroke="#2a2d30" stroke-width="2"/>
      <circle cx="${x}" cy="${BY}" r="${d?28:30}" fill="${d?'#0d0e0f':'#17191b'}" stroke="#34383c" stroke-width="2.5"/>
      <circle cx="${x}" cy="${BY}" r="9" fill="${on?'#ff3326':'#3a2624'}" ${on?'filter="url(#p9glow)"':''}/>
      ${on?`<circle cx="${x-2.5}" cy="${BY-2.5}" r="3.2" fill="#fff" opacity=".7"/>`:''}</g>`; };
  const screw = (x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#26292c" stroke="#3b3f43"/><path d="M${x-r*.6} ${y}h${r*1.2}M${x} ${y-r*.6}v${r*1.2}" stroke="#0c0d0e" stroke-width="2.4"/>`;
  return `<svg viewBox="0 0 1714 321" role="img" aria-label="POD9 front panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <defs><filter id="p9glow" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1714" height="321" rx="8" fill="#141517"/>
    <image href="${ASSET}pod9-front.svg" width="1714" height="321" preserveAspectRatio="none" style="pointer-events:none"/>
    ${screw(51,161,12)}${screw(1664,161,12)}${screw(556,161,13)}${screw(1005,161,13)}${screw(1455,161,13)}
    <g class="p9pwr" style="cursor:pointer"><title>Power rocker (click) — PWRSW (PAN256) on the board</title><rect x="129" y="54" width="101" height="154" rx="6" fill="#0b0c0d" stroke="#2d3033" stroke-width="2"/>
      <rect x="140" y="${pwr?66:118}" width="79" height="78" rx="6" fill="#1c1e21" stroke="#3a3e42"/><rect x="146" y="${pwr?72:186}" width="67" height="8" rx="3" fill="#2b2e31"/></g>
    <circle cx="299" cy="218" r="13" fill="#060707"/><circle cx="299" cy="218" r="9.5" fill="${pwr?'#c8ff5a':'#252b1c'}" ${pwr?'filter="url(#p9glow)"':''}><title>PWR LED (GRN, R32 2 kΩ from the unregulated +V)</title></circle>
    ${btn(SLX, 6, 'A/V SLAVE', 5)}
    ${BX.map((x,k)=>btn(x, k, 'INPUT SELECT '+(k+1), IBIT[k])).join('')}
    ${opts.hot||''}
  </svg>`;
}
function rearSVG(t){
  const alive = powerAt(t), x = xptAt(t), rem = stateAt('remote', t);
  const bnc = (cx, cy, k, label, live)=>`<g ${k>=0?`class="p9src" data-k="${k}" style="cursor:pointer"`:''}><title>${label}${k>=0?(D.src[k].on?': '+PICS[D.src[k].pic]+(D.src[k].ph?', '+D.src[k].ph+' lines off house sync':', genlocked')+' (click to unplug)':': nothing connected (click to connect)'):''}</title>
    <circle cx="${cx}" cy="${cy}" r="37.6" fill="#0c0d0e"/><circle cx="${cx}" cy="${cy}" r="33" fill="#b9c0c4" stroke="#e1e6e8" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="21" fill="#8e979c" stroke="#5d666b" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="13" fill="#202326"/><circle cx="${cx}" cy="${cy}" r="4.5" fill="#d8c27a"/>
    <rect x="${cx-35}" y="${cy-4}" width="9" height="8" fill="#9aa2a6"/><rect x="${cx+26}" y="${cy-4}" width="9" height="8" fill="#9aa2a6"/>
    ${live?`<circle cx="${cx}" cy="${cy}" r="40" fill="none" stroke="#5fd38a" stroke-width="4" opacity=".85"/>`:''}
    ${k>=0 && !D.src[k].on?`<path d="M${cx-30} ${cy-30}L${cx+30} ${cy+30}" stroke="#ff6a5a" stroke-width="5"/>`:''}</g>`;
  return `<svg viewBox="0 0 1714 321" role="img" aria-label="POD9 rear panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <rect width="1714" height="321" rx="8" fill="#141517"/>
    ${bnc(194,75,-1,'OUT 1 (R21 75 Ω from the OPA650)', alive && x>=0 && D.src[x].on)}${bnc(194,205,-1,'OUT 2 (R22 75 Ω, second split)', alive && x>=0 && D.src[x].on)}
    ${[0,1,2,3,4,5].map(k=>bnc(RX(k), RY(k), k, 'IN '+(k+1)+' (75 Ω terminated)', alive && x===k && D.src[k].on)).join('')}
    <g class="p9ctl" style="cursor:pointer"><title>CONTROL DE9 (RS-422: TX+ 3, TX− 8, RX+ 7, RX− 2, GND 5/9): click to ${rem?'unplug':'plug in'} a POD9R remote</title>
      <rect x="1104" y="162" width="154" height="93" rx="10" fill="#9aa3a8" stroke="#c9d0d4" stroke-width="3"/>
      <path d="M1122 180 h118 l-10 58 h-98 z" fill="#1a1c1e" stroke="#5c6266" stroke-width="2"/>
      ${[0,1,2,3,4].map(i=>`<circle cx="${1141+i*20}" cy="197" r="4" fill="#cfd5d8"/>`).join('')}${[0,1,2,3].map(i=>`<circle cx="${1151+i*20}" cy="219" r="4" fill="#cfd5d8"/>`).join('')}
      ${rem?'<rect x="1116" y="172" width="130" height="74" rx="8" fill="#3b3f43" opacity=".85"/><text x="1181" y="216" text-anchor="middle" font-size="18" fill="#e8ece9">POD9R</text>':''}
      <circle cx="1083" cy="209" r="13" fill="#c1c8cc" stroke="#7d868a"/><circle cx="1279" cy="209" r="13" fill="#c1c8cc" stroke="#7d868a"/></g>
    <g><title>AC inlet with fuse (detail A, 1.256" × 1.080"; “115 VAC, 1/2 A.S.B.”)</title><rect x="1361" y="33" width="252" height="216" rx="10" fill="#0c0d0e" stroke="#2f3337" stroke-width="3"/>
      <rect x="1376" y="48" width="70" height="186" rx="4" fill="#17191b" stroke="#33373b"/><rect x="1394" y="80" width="34" height="120" rx="3" fill="#0f1011" stroke="#2b2e31"/>
      <path d="M1464 60 h130 v120 l-30 40 h-70 l-30 -40 z" fill="#050606" stroke="#2c2f32" stroke-width="2"/>
      <rect x="1492" y="85" width="10" height="34" fill="#c9cdd0"/><rect x="1559" y="85" width="10" height="34" fill="#c9cdd0"/><rect x="1525" y="140" width="10" height="34" fill="#c9cdd0"/></g>
    <image href="${ASSET}pod9-rear.svg" width="1714" height="321" preserveAspectRatio="none" style="pointer-events:none"/>
    ${[[51,161],[1664,161]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="11" fill="#2a2d30" stroke="#3d4145"/><path d="M${x-7} ${y}h14M${x} ${y-7}v14" stroke="#0c0d0e" stroke-width="2.4"/>`).join('')}
  </svg>`+ART_CAP;
}
function bindPanel(root){
  root.querySelectorAll('.p9b').forEach(g=>g.addEventListener('click', ()=>A.btn(+g.dataset.k)));
  root.querySelectorAll('.p9pwr').forEach(g=>g.addEventListener('click', ()=>A.power()));
  root.querySelectorAll('.p9src').forEach(g=>g.addEventListener('click', ()=>{ const k=+g.dataset.k; A.src(k,'on',!D.src[k].on); }));
  root.querySelectorAll('.p9ctl').forEach(g=>g.addEventListener('click', ()=>A.remote(!stateAt('remote', SIM.t))));
}

/* ---------------- side panels: RS-422 console, slave port, sources ---------------- */
const PRESETS = [
  ['F0 00','Request status'],['F0 88','Video 1'],['F0 98','Video 3'],['F0 A0','Video 4'],['F0 B0','Video 6'],['F0 9B','Video 3 + audio 3'],['F0 85','Audio 5 only'],
  ['F0 61','SUM audio 1 + 6'],['F0 80','Cancel SUM'],['F0 C0','Slave: C0'],['F0 C7','Slave: C7'],['F0 C3','AFV input 3'],['F0 B8','Video code 7 (undocumented)'],['5A','Stray byte (no F0)'],
];
function consoleHTML(){
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:5px">${PRESETS.map(([h,l])=>`<button class="p9pre" data-h="${h}" title="${l}"><span class="mono">${h}</span> <span class="muted">${l}</span></button>`).join('')}</div>
    <div style="display:flex;gap:6px;margin-top:6px;align-items:center;flex-wrap:wrap"><label class="small">Hex bytes <input id="p9hex" class="mono" style="width:130px;font:inherit;padding:4px 6px;border:1px solid var(--line);border-radius:6px;background:var(--panel2);color:var(--ink)" value="${D.hex}"></label><button id="p9send">Send</button></div>`;
}
function bindConsole(root){
  root.querySelectorAll('.p9pre').forEach(b=>b.onclick=()=>A.send(b.dataset.h.split(' ').map(x=>parseInt(x,16)), b.title));
  const go = ()=>{ const v = root.querySelector('#p9hex').value; D.hex = v; const bs = v.trim().split(/[\s,]+/).map(x=>parseInt(x,16)).filter(x=>x>=0 && x<=255); if (bs.length) A.send(bs); };
  root.querySelector('#p9send').onclick = go; root.querySelector('#p9hex').onkeydown = e=>{ if (e.key==='Enter') go(); };
}
function slaveHTML(t){
  const pt = stateAt('partner', t), ps = sv('psel', t, 0xFE), rem = stateAt('remote', t), E = emulate();
  let rl = null; for (const x of E.r9){ if (x[0] <= t) rl = x[1]; else break; }
  return `<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start">
    <div><label class="small">Slave port P3 <select id="p9pt">${Object.entries(PARTNER).map(([k,v])=>`<option value="${k}" ${k===pt?'selected':''}>${v}</option>`).join('')}</select></label>
      <div style="display:flex;gap:4px;margin-top:6px;align-items:center;${pt!=='none'?'':'opacity:.45'}"><span class="small muted">${pt==='pod10'?'POD10':'POD2'}</span>
      ${[0,1,2,3,4,5].map(k=>`<button class="p9pb" data-k="${k}" style="min-width:34px;${pt!=='none'&&!(ps&(1<<k))?'background:#d33a2c;color:#fff;border-color:#d33a2c':''}">${k+1}</button>`).join('')}
      ${pt!=='pod10'?`<button class="p9pb" data-k="6" style="${pt!=='none'&&!(ps&0x40)?'background:#d9a531;color:#111;border-color:#d9a531':''}">SUM</button>`:''}</div>
      <div class="small muted" style="margin-top:4px">POD9 is the SPI master and clocks one byte per timer tick. Red = the audio switcher's input(s).</div></div>
    <div><label class="small"><input type="checkbox" id="p9rm" ${rem?'checked':''}> POD9R remote (V500) on CONTROL</label>
      <div style="display:flex;gap:4px;margin-top:6px;${rem?'':'opacity:.45'}">${[0,1,2,3,4,5].map(k=>`<button class="p9rb" data-k="${k}" style="min-width:34px;${rem&&rl!=null&&(rl>>k)&1?'background:#d33a2c;color:#fff;border-color:#d33a2c':''}">${k+1}</button>`).join('')}
      <span class="small muted" style="align-self:center">${rem?(rl==null?'waiting for a reply…':'LEDs from reply byte 1 = '+hex2(rl|0x80)+(rl&0x40?' (slave)':'')+' '+inf):''}</span></div></div></div>`;
}
function bindSlave(root){
  const s = root.querySelector('#p9pt'); if (s) s.onchange = e=>A.partner(e.target.value);
  root.querySelectorAll('.p9pb').forEach(b=>b.onclick=()=>A.pbtn(+b.dataset.k));
  const r = root.querySelector('#p9rm'); if (r) r.onchange = e=>A.remote(e.target.checked);
  root.querySelectorAll('.p9rb').forEach(b=>b.onclick=()=>A.rbtn(+b.dataset.k));
}
function sourcesHTML(){
  return `<div class="small" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px"><label>Standard <select id="p9std">${Object.entries(STD).map(([k,v])=>`<option value="${k}" ${k===D.std?'selected':''}>${v.name}</option>`).join('')}</select></label>
    <label>Firmware <select id="p9fw">${Object.entries(FW).map(([k,v])=>`<option value="${k}" ${k===D.fw?'selected':''}>${v.short}</option>`).join('')}</select></label></div>
    <table class="kv"><tr><th>BNC</th><th>source</th><th>picture</th><th>timing (lines off house sync)</th></tr>${D.src.map((s,k)=>`<tr><td>IN ${k+1}</td><td><input type="checkbox" class="p9so" data-k="${k}" ${s.on?'checked':''}></td>
    <td><select class="p9sp" data-k="${k}">${Object.entries(PICS).map(([a,b])=>`<option value="${a}" ${a===s.pic?'selected':''}>${b}</option>`).join('')}</select></td><td><input type="number" class="p9sh" data-k="${k}" value="${s.ph}" min="0" max="${S().lines-1}" step="1" style="width:76px"> ${s.ph?'':'<span class="muted">genlocked</span>'}</td></tr>`).join('')}</table>`;
}
function bindSources(root){
  root.querySelectorAll('.p9so').forEach(i=>i.onchange=()=>A.src(+i.dataset.k,'on',i.checked));
  root.querySelectorAll('.p9sp').forEach(i=>i.onchange=()=>A.src(+i.dataset.k,'pic',i.value));
  root.querySelectorAll('.p9sh').forEach(i=>i.onchange=()=>A.src(+i.dataset.k,'ph',Math.max(0,Math.min(S().lines-1,Math.round(+i.value)))));
  const s = root.querySelector('#p9std'); if (s) s.onchange = e=>A.std(e.target.value);
  const f = root.querySelector('#p9fw'); if (f) f.onchange = e=>A.fw(e.target.value);
}

/* ---------------- picture monitor (what a viewer downstream sees) ---------------- */
const BAR_RGB = [[191,191,191],[191,191,0],[0,191,191],[0,191,0],[191,0,191],[191,0,0],[0,0,191]];
function drawPicture(cv, t){
  const {c, w, h} = SIM.canvas(cv, 150); const x = xptAt(t), alive = powerAt(t);
  c.fillStyle = '#000'; c.fillRect(0,0,w,h);
  const W2 = Math.min(w, h*4/3), ox = (w-W2)/2;
  if (!alive || x < 0 || !D.src[x].on){ c.fillStyle='#777'; c.font='12px '+SIM.css('--sans'); c.fillText(!alive?'no power':x<0?'crosspoint between inputs (both muxes off)':'IN '+(x+1)+': no signal (75 Ω → 0 V)', ox+10, h/2); return; }
  const s = D.src[x];
  for (let i=0;i<Math.round(W2);i++){ const fx = i/W2;
    if (s.pic==='bars'){ const b = BAR_RGB[Math.min(6, Math.floor(fx*7))]; c.fillStyle = `rgb(${b[0]},${b[1]},${b[2]})`; c.fillRect(ox+i,0,1,h); continue; }
    for (let j=0;j<h;j+=3){ const p = picAt(s.pic, fx, Math.floor(j/h*240)+22, 0); let yv = p.y; if (p.mb) yv = 50 + 30*Math.sin(fx*W2*p.mb/1.5);
      const g = Math.max(0, Math.min(255, Math.round((yv - S().setup)/(100 - S().setup)*235))); c.fillStyle = `rgb(${g},${g},${g})`; c.fillRect(ox+i, j, 1, 3); } }
  const last = emulate().sw.filter(q=>q.t<=t).slice(-1)[0];
  if (last && t - last.t < 0.25 && last.from >= 0 && D.src[last.from].on){ const dl = ((D.src[last.to].ph - D.src[last.from].ph) % S().lines + S().lines) % S().lines;
    if (dl || last.why==='timeout'){ const yb = (dl/S().lines)*h; c.fillStyle='rgba(0,0,0,.85)'; c.fillRect(ox, yb, W2, 9); c.fillStyle='#fff'; c.font='11px '+SIM.css('--sans');
      c.fillText(last.why==='timeout'?'switched mid-field (no sync)':'roll: new source '+dl+' lines off', ox+6, Math.min(h-4, yb+22)); } }
  c.fillStyle='rgba(0,0,0,.55)'; c.fillRect(ox,h-18,W2,18); c.fillStyle='#fff'; c.font='11px '+SIM.css('--mono'); c.fillText(`OUT 1 = IN ${x+1} · ${PICS[s.pic]}`, ox+6, h-5);
}

/* ---------------- timeline helpers ---------------- */
function drawSig(c, X, t0, t1, y, h, name, colOf, txtOf, def){
  const a = emulate().sig[name] || []; let i = Math.max(0, idxAt(a, t0));
  const segs = []; if (!a.length || a[0][0] > t0) segs.push([t0, def]);
  for (; i<a.length && a[i][0] <= t1; i++) segs.push([Math.max(a[i][0], t0), a[i][1]]);
  segs.forEach((s,j)=>{ const e = j+1<segs.length ? segs[j+1][0] : t1; const xa=X(s[0]), xb=X(e); const col = colOf(s[1]); if (col){ c.fillStyle=col; c.fillRect(xa, y+4, Math.max(1,xb-xa), h-8); }
    if (txtOf && xb-xa > 34){ c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); const tx = txtOf(s[1]); c.save(); c.beginPath(); c.rect(xa,y,xb-xa,h); c.clip(); c.fillText(tx, xa+4, y+h/2+4); c.restore(); } });
}
function drawUart(c, X, t0, t1, y, h, frames, col){
  const pxBit = X(t0 + 1/C.BAUD) - X(t0), ink = SIM.css('--ink');
  const vis = frames.filter(f=> f.t0 + C.BYTE >= t0 && f.t0 <= t1);
  if (pxBit < 1.2){ vis.forEach(f=>{ c.fillStyle = f.src==='pod9r' ? SIM.css('--accent2') : col; c.fillRect(X(f.t0), y+5, Math.max(1.5, X(f.t0+C.BYTE)-X(f.t0)), h-10); });
    let lastX = -1e9; vis.forEach(f=>{ const x = X(f.t0); if (x - lastX > 22){ c.fillStyle=ink; c.font='10px '+SIM.css('--mono'); c.fillText(hx(f.b), x+2, y+h-2); lastX = x; } }); return; }
  c.strokeStyle = col; c.lineWidth = 1.5; c.beginPath(); let py = y+5; c.moveTo(X(t0), py);
  vis.forEach(f=>{ const bits = [0]; for (let b=0;b<8;b++) bits.push((f.b>>b)&1); bits.push(1);
    bits.forEach((v,i)=>{ const xa = X(f.t0 + i/C.BAUD), yy = v ? y+5 : y+h-9; c.lineTo(xa, py); c.lineTo(xa, yy); py = yy; }); const xe = X(f.t0+C.BYTE); c.lineTo(xe, py); c.lineTo(xe, y+5); py = y+5; });
  c.lineTo(X(t1), py); c.stroke();
  vis.forEach(f=>{ c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`${hx(f.b)}${f.src?' '+f.src:''}`, X(f.t0)+3, y+h-1); });
}
function busSegs(t0, t1){     // [{a, b, k}] — which input is on the bus (k = −1: none)
  const a = emulate().sig.xpt || [], i = idxAt(a, t0), out = [];
  let cur = i >= 0 ? a[i][1] : -1, st = t0;
  for (let j = i+1; j < a.length && a[j][0] < t1; j++){ out.push({a:st, b:a[j][0], k:cur}); cur = a[j][1]; st = a[j][0]; }
  out.push({a:st, b:t1, k:cur}); return out;
}
function vsIntervals(t0, t1){ // LM1881 VS low intervals of whatever is on the bus
  const r = [], F = FIELD(), v0 = S().broad[0]*S().H/2 + C.VSD;
  busSegs(t0, t1).forEach(s=>{ if (s.k < 0 || !D.src[s.k].on || !powerAt((s.a+s.b)/2)) return; const base = srcBase(s.k) + v0;
    for (let n = Math.floor((s.a - base)/F) - 1; base + n*F < s.b; n++){ const a = base + n*F, b = a + C.VSW; if (b > s.a && a < s.b) r.push([Math.max(a, s.a), Math.min(b, s.b)]); } });
  return r;
}
const IRE = (y, h, v) => y + 4 + (100 - v)/140*(h - 8);
function colMinMax(k, ta, tb){
  const s = D.src[k]; if (!s || !s.on) return [0,0];
  const st = S(), H = st.H;
  if (tb - ta >= H*0.9){
    const L = lineInfo(k, ta), Lb = lineInfo(k, tb); const inV = l => l.lineInField <= st.vbi || l.rel < 0;
    const vb = inV(L) && inV(Lb) && tb - ta < st.vbi*H; return [-40, vb ? 0 : Math.max(20, picMax(s.pic))];
  }
  let mn = 1e9, mx = -1e9; const K = 14;
  for (let j=0;j<=K;j++){ const v = ireAt(k, ta + (tb-ta)*j/K); if (v<mn) mn=v; if (v>mx) mx=v; }
  const L = lineInfo(k, ta), L2 = lineInfo(k, tb); if (L.line !== L2.line || L.u < st.sync) mn = Math.min(mn, -40);
  return [mn, mx];
}
function drawVideo(c, X, t0, t1, y, h, which){
  const x0 = X(t0), x1 = X(t1), cols = Math.max(1, Math.round(x1 - x0)), dt = (t1-t0)/cols;
  const segs = which==='out' ? busSegs(t0, t1) : [{a:t0, b:t1, k:which}];
  c.strokeStyle = SIM.css('--grid'); c.beginPath(); c.moveTo(x0, IRE(y,h,0)); c.lineTo(x1, IRE(y,h,0)); c.stroke();
  c.fillStyle = SIM.css('--ink');
  let si = 0;
  for (let i=0;i<cols;i++){ const ta = t0 + i*dt, tb = ta + dt, tm = ta + dt/2;
    while (si < segs.length-1 && segs[si].b <= tm) si++;
    const k = segs[si].k; if (which==='out' && (!powerAt(tm))) continue;
    const [mn, mx] = k < 0 ? [0,0] : colMinMax(k, ta, tb);
    const ya = IRE(y,h,mx), yb = IRE(y,h,mn); c.fillRect(x0+i, ya, 1, Math.max(1, yb-ya)); }
  if (which==='out'){ const E = emulate(); c.strokeStyle = SIM.css('--play'); c.setLineDash([4,3]);
    E.sw.forEach(q=>{ if (q.t>=t0 && q.t<=t1){ c.beginPath(); c.moveTo(X(q.t), y+2); c.lineTo(X(q.t), y+h-2); c.stroke(); } }); c.setLineDash([]); }
}
function drawFields(c, X, t0, t1, y, h){   // field/line ruler of whatever is on the bus (house reference if nothing)
  const st = S(), H = st.H, F = FIELD(), ink = SIM.css('--ink'), ink2 = SIM.css('--ink2'), acc = SIM.css('--accent'), acc2 = SIM.css('--accent2');
  const k = (()=>{ const x = xptAt((t0+t1)/2); return x >= 0 && D.src[x].on ? x : 0; })();
  const base = srcBase(k), pxF = X(t0+F)-X(t0), pxL = X(t0+H)-X(t0);
  for (let n = Math.floor((t0-base)/F); base + n*F < t1; n++){ const a = base + n*F, xa = X(a), xb = X(a+F), f2 = ((n%2)+2)%2;
    c.fillStyle = f2 ? acc2 : acc; c.globalAlpha = .18; c.fillRect(xa, y+3, xb-xa, h-6); c.globalAlpha = .45; c.fillRect(xa, y+3, Math.max(1, X(a+st.vbi*H)-xa), h-6); c.globalAlpha = 1;
    if (pxF > 26){ c.fillStyle = ink; c.font = '10px '+SIM.css('--mono'); c.fillText(`F${f2+1}${pxF>90?' · VBI 1–'+st.vbi:''}`, Math.max(xa, X(t0))+3, y+12); } }
  if (pxL > 3){ c.fillStyle = ink2; const l0 = Math.floor((t0-base)/H);
    for (let l = l0; base + l*H < t1; l++){ const xa = X(base + l*H); c.fillRect(xa, y+h-8, 1, 6);
      if (pxL > 30){ const li = lineInfo(k, base + l*H + H*0.25); c.font='9px '+SIM.css('--mono'); c.fillText('L'+li.lineInField, xa+2, y+h-9); } } }
  c.fillStyle = ink2; c.font = '10px '+SIM.css('--mono'); c.textAlign = 'right'; c.fillText(`timing of IN ${k+1}`, X(t1)-4, y+h-3); c.textAlign = 'left';
}
function lanes(sel){
  const E = emulate(), P = E.P, acc = SIM.css('--accent'), acc2 = SIM.css('--accent2'), warn = SIM.css('--warn'), bad = SIM.css('--bad'), ink2 = SIM.css('--ink2'), grid = SIM.css('--grid');
  const IDLE = idleCost();
  const L = {
    pass:{ label:'PIC main-loop passes', h:26, draw(c,X,t0,t1,y,h){
        const i0 = Math.max(0, passAt(t0)), i1 = passAt(t1); if (i1 < 0) return;
        const px = X(t0 + IDLE*C.TCY) - X(t0);
        if (px < 2){ c.fillStyle=acc; c.globalAlpha=.25; c.fillRect(X(Math.max(t0,P.t0[i0])), y+7, X(t1)-X(Math.max(t0,P.t0[i0])), h-14); c.globalAlpha=1;
          c.fillStyle=warn; for (let i=i0;i<=i1;i++){ if (passLen(i) > IDLE+12) c.fillRect(X(P.t0[i]), y+4, 1.5, h-8); }
          c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(`${(i1-i0+1).toLocaleString()} passes (≈117 µs idle; orange = a pass that did work)`, X(t0)+6, y+h/2+4); return; }
        for (let i=i0;i<=i1;i++){ const a = P.t0[i]; let cc = 0;
          for (let k=0;k<ROUT.length;k++){ const w = P.cyc[i*ROUT.length+k]; const xa = X(a + cc*C.TCY), xb = X(a + (cc+w)*C.TCY);
            c.fillStyle = w > ROUT[k][1]+1 ? warn : (k%2 ? acc : acc2); c.globalAlpha = w > ROUT[k][1]+1 ? .9 : .45; c.fillRect(xa, y+4, Math.max(.5, xb-xa-.5), h-8); c.globalAlpha=1;
            if (xb - xa > 60){ c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText(ROUT[k][0], xa+2, y+h/2+3); }
            cc += w; }
          if (px > 40){ c.fillStyle=ink2; c.font='9px '+SIM.css('--mono'); c.fillText('#'+i, X(a)+2, y+10); } } } },
    pins:{ label:'Button pins (RA3 RA2 RA5 RA4 RC2 RC1, RA1, RA0)', h:30, draw(c,X,t0,t1,y,h){
        const ks = [...new Set(D.events.filter(e=>e.type==='btn').map(e=>e.k))]; if (!ks.length){ c.fillStyle=ink2; c.font='11px '+SIM.css('--sans'); c.fillText('all high (no button pressed)', X(t0)+6, y+h/2+4); return; }
        const N = 700, rh = (h-4)/ks.length;
        ks.forEach((k,r)=>{ const yy = y+2+r*rh; c.fillStyle=bad; for (let j=0;j<N;j++){ const ta = t0+(t1-t0)*j/N; if (pinLowAt(k, ta)) c.fillRect(X(ta), yy+1, Math.max(1,(X(t1)-X(t0))/N+.5), rh-2); }
          c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText(BTN_PIN(k)+' '+BTN_NAME(k), X(t0)+4, yy+rh-2); }); } },
    bcount:{ label:'bcount (debounce, 0xFE → 0)', h:34, draw(c,X,t0,t1,y,h){
        const a = E.sig.bcount||[]; let i = Math.max(0, idxAt(a,t0)); c.strokeStyle=acc; c.lineWidth=1.4; c.beginPath(); let first=true, lv=a[i]?a[i][1]:0xFE;
        const Yv = v => y+h-3 - Math.min(0xFF, v)/0xFF*(h-6);
        for (; i<a.length && a[i][0]<=t1; i++){ const x = X(Math.max(t0,a[i][0])); if (first){ c.moveTo(x, Yv(a[i][1])); first=false; } else { c.lineTo(x, Yv(lv)); c.lineTo(x, Yv(a[i][1])); } lv = a[i][1]; }
        c.lineTo(X(t1), Yv(lv)); c.stroke(); } },
    flags:{ label:'rel_flag,0 · input_flag (bits 0/1)', h:24, draw(c,X,t0,t1,y,h){
        drawSig(c,X,t0,t1,y,h/2+2,'rel', v=>v?warn:null, v=>v?'rel_flag':'' , 0);
        drawSig(c,X,t0,t1,y+h/2-2,h/2+2,'inflag', v=>v?acc:null, v=>v?'input_flag '+v.toString(2).padStart(2,'0'):'', 0); } },
    led:{ label:'74HC4094 latch → front LEDs', h:26, draw(c,X,t0,t1,y,h){
        drawSig(c,X,t0,t1,y,h,'led', v=>v<0?grid:(v&0x20?acc2:'#d9a531'), v=>v<0?'off / reset':`${hx(v)} · ${selList(v).map(x=>'IN'+x).join(' ')||'no input'}${v&0x20?'':' · SLAVE'}${v&0x10?'':' · spare'}`, -1);
        const pxS = X(t0+96*C.TCY)-X(t0); if (pxS > 30){ c.fillStyle=SIM.css('--ink'); E.shifts.forEach(s=>{ if (s.t>t1 || s.t+96*C.TCY<t0) return; for (let b=0;b<8;b++){ const tb = s.t + (8+10*b)*C.TCY; c.fillRect(X(tb), y+h-6, 1, 5); if (pxS > 160){ c.font='9px '+SIM.css('--mono'); c.fillText('D'+((s.v>>b)&1), X(tb)+2, y+h-7); } } c.fillStyle=warn; c.fillRect(X(s.t+92*C.TCY), y+2, 2, h-4); c.fillStyle=SIM.css('--ink'); }); } } },
    xpt:{ label:'Crosspoint RB1–RB4 (input on the bus)', h:72, draw(c,X,t0,t1,y,h){
        const rh = (h-4)/6; for (let k=0;k<6;k++){ const yy = y+2+k*rh; drawSig(c,X,t0,t1,yy-4,rh+8,'xpt', v=> v===k ? '#d33a2c' : null, null, -1); c.fillStyle=ink2; c.font='9px '+SIM.css('--mono'); c.fillText('IN'+(k+1)+(k<3?' U6':' U5'), X(t0)+2, yy+rh-1); } } },
    fields:{ label:'Fields and lines (source on the bus)', h:26, draw:drawFields },
    vs:{ label:'LM1881 VS → RB0 (and switch_check samples)', h:26, draw(c,X,t0,t1,y,h){
        c.fillStyle = SIM.css('--ink'); c.globalAlpha=.25; c.fillRect(X(t0), y+5, X(t1)-X(t0), 2); c.globalAlpha=1;
        vsIntervals(t0, t1).forEach(([a,b])=>{ c.fillStyle = bad; c.fillRect(X(a), y+5, Math.max(1.5, X(b)-X(a)), h-10); });
        const pxP = X(t0+IDLE*C.TCY)-X(t0); if (pxP > 3){ E.samples.forEach(([ts,lo])=>{ if (ts<t0||ts>t1) return; c.fillStyle = lo ? warn : ink2; c.fillRect(X(ts)-1, y+h-6, 2, 5); }); }
        drawSig(c,X,t0,t1,y-2,10,'swwait', v=>v?SIM.css('--accent2'):null, null, 0);
        c.fillStyle=ink2; c.font='9px '+SIM.css('--mono'); c.fillText('red = VS low · blue strip = switch_flag,0 waiting', X(t0)+4, y+h-1); } },
    out:{ label:'OUT 1 / OUT 2 composite (IRE)', h:60, draw(c,X,t0,t1,y,h){ drawVideo(c,X,t0,t1,y,h,'out'); } },
    spi:{ label:'Slave port SPI (POD9 clocks, ≈3.4 ms)', h:30, draw(c,X,t0,t1,y,h){
        const vis = E.spiX.filter(s=>s.t>=t0-1e-5 && s.t<=t1); if (!vis.length){ c.fillStyle=ink2; c.font='11px '+SIM.css('--sans'); c.fillText('no exchange in view', X(t0)+6, y+h/2+4); return; }
        const dx = vis.length>1 ? X(vis[1].t)-X(vis[0].t) : 999, w8 = 8*C.TCY;
        vis.forEach(s=>{ const xa = X(s.t), xb = Math.max(xa+1.5, X(s.t+w8)); c.fillStyle = s.mosi===0xF0 ? ink2 : (s.mosi&0x80 ? acc2 : bad); c.fillRect(xa, y+4, xb-xa, h-8);
          if (dx > 70){ c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText(`out ${hx(s.mosi)} in ${s.miso==null?'FF':hx(s.miso)}`, xb+3, y+h/2+3); } }); } },
    tmr:{ label:'TMR2IF ticks (4096 Tcy + polling)', h:18, draw(c,X,t0,t1,y,h){ c.fillStyle=acc2; const px = X(t0+0.0034)-X(t0); if (px < 2.5){ c.globalAlpha=.35; c.fillRect(X(t0), y+5, X(t1)-X(t0), h-10); c.globalAlpha=1; c.fillStyle=SIM.css('--ink'); c.font='10px '+SIM.css('--mono'); c.fillText(`${E.tmr.filter(x=>x>=t0&&x<=t1).length} ticks`, X(t0)+4, y+h-4); return; } E.tmr.forEach(tt=>{ if (tt>=t0 && tt<=t1) c.fillRect(X(tt), y+3, 2, h-6); }); } },
    slave:{ label:'pre_output bit 5 (slave) · audio switcher', h:28, draw(c,X,t0,t1,y,h){
        drawSig(c,X,t0,t1,y,h/2+3,'slave', v=>v?null:'#d9a531', v=>v?'':'slave (bit 5 = 0)', 1);
        drawSig(c,X,t0,t1,y+h/2-3,h/2+3,'psel', v=>stateAt('partner',t0)==='none'?null:acc, v=>stateAt('partner',t0)==='none'?'':`audio ${pSelOf(v).map(i=>i+1).join('+')||'—'}${v&0x40?'':' SUM'}`, 0xFE); } },
    rx:{ label:'RS-422 RX → RC7 (CONTROL 7/2)', h:30, draw(c,X,t0,t1,y,h){ drawUart(c,X,t0,t1,y,h,E.rxF, acc); } },
    tx:{ label:'RS-422 TX ← RC6 (3/8) · RC0 enable', h:34, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y-3,10,'RC0', v=>v?warn:null, null, 0); drawUart(c,X,t0,t1,y+4,h-4,E.txF.map(f=>({t0:f.t0,b:f.b})), warn); } },
  };
  const order = sel || ['pass','pins','bcount','flags','led','xpt','fields','vs','out','tmr','spi','slave','rx','tx'];
  return order.map(k=>L[k]);
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ const l=D.log[0]; return l ? `<div><b>${l.name}</b> at ${SIM.fmtT(l.t)}</div>` + l.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Press a button (or keys 1–6, S), send an RS-422 command, or put a POD2 on the slave port. The code path the emulator took is listed here with the time after your action.</div>'; }
function scenarioHTML(){ return `<label class="small">Scenario <select class="p9scn">${Object.keys(SCEN).map(k=>`<option value="${k}" ${k===D.scenario?'selected':''}>${SCEN[k].name}</option>`).join('')}</select></label> <button class="p9clr">Clear my actions</button>`; }
function bindScenario(m){ m.querySelectorAll('.p9scn').forEach(s=>s.onchange=e=>A.scenario(e.target.value)); m.querySelectorAll('.p9clr').forEach(b=>b.onclick=()=>A.clear()); }
function busInfo(t){
  const x = xptAt(t); if (x < 0) return 'nothing (both muxes disabled)';
  if (!D.src[x].on) return `IN ${x+1}: no source`;
  const L = lineInfo(x, t), st = S(); let part = L.u < st.sync ? 'H sync' : L.u < st.burst[1] && L.u >= st.burst[0] ? 'colour burst' : L.u < st.act0 ? 'back porch' : L.u >= st.act1 ? 'front porch' : 'active picture';
  if (L.lineInField <= st.vbi || L.rel < 0) part = L.rel >= st.broad[0] && L.rel < st.broad[1] ? 'vertical sync (broad pulses)' : L.rel < st.postEq[1] ? 'equalising pulses' : 'vertical blanking';
  return `IN ${x+1}: field ${L.field}, line ${L.lineInField} (frame line ${L.line}), ${(L.u*1e6).toFixed(2)} µs into the line — ${part}`;
}
function inspectorHTML(t){
  const st = stepAt(t), sn = st.pass>=0 ? snap(st.pass) : null, led = ledAt(t), alive = powerAt(t), x = xptAt(t);
  const last = emulate().sw.filter(q=>q.t<=t).slice(-1)[0];
  return `<table class="kv">
    <tr><th>Power</th><td class="mono">${!sv('power',t,0)?'OFF':!alive?'in reset (power-up timer, '+inf+')':'running · '+FW[D.fw].short}</td></tr>
    <tr><th>Main-loop pass</th><td class="mono">${!alive||st.pass<0?'—':'#'+st.pass.toLocaleString()+' · '+(ROUT[st.step]||['—'])[0]+' · '+passLen(st.pass)+' Tcy = '+SIM.fmtDur(passLen(st.pass)*C.TCY)}</td></tr>
    <tr><th>LEDs (4094 latch)</th><td class="mono">${led<0?'—':hex2(led)+' · '+(selList(led).map(k=>'IN'+k).join(' ')||'none')+(led&0x20?'':' · A/V SLAVE')+(led&0x10?'':' · spare')}</td></tr>
    <tr><th>Crosspoint</th><td class="mono">${x<0?'none':'IN '+(x+1)+' ('+(x<3?'U6':'U5')+' IN'+(x%3)+')'} · PORTB ${sn?hex2(sn.PORTB):'—'}</td></tr>
    <tr><th>On the bus now</th><td class="small">${alive?busInfo(t):'—'}</td></tr>
    <tr><th>RB0 (LM1881 VS)</th><td class="mono">${alive && x>=0 && vsLow(x,t)?'LOW — vertical sync':'high'}</td></tr>
    <tr><th>Last switch</th><td class="small">${last?`${SIM.fmtT(last.t)}: IN ${last.from+1>0?last.from+1:'—'} → IN ${last.to+1}, ${last.why==='vs'?'on vertical sync':'<b>timeout (no sync)</b>'}${last.li?`, old source field ${last.li.field} line ${last.li.lineInField}`:''}`:'none yet'}</td></tr>
    <tr><th>pre_output · input_reg · bcount</th><td class="mono">${sn?hex2(sn.pre_output)+' · '+hex2(sn.input_reg)+' · '+sn.bcount:'—'}</td></tr>
    <tr><th>flags rel/input/remote/switch</th><td class="mono">${sn?`${sn.rel_flag&1} / ${bin8(sn.input_flag)} / ${bin8(sn.remote_flag).slice(4)} / ${bin8(sn.switch_flag).slice(6)} (switch_count ${sn.switch_count})`:'—'}</td></tr>
    <tr><th>UART</th><td class="mono">${sn?`recieved_reg ${hex2(sn.recieved_reg)} · uart_flag,7 ${sn.uart_flag>>7&1} · transmit_reg ${hex2(sn.transmit_reg)} · RC0 ${sn.RC0}`:'—'}</td></tr>
    <tr><th>Slave port</th><td class="mono">${sn?`spi_output ${hex2(sn.spi_output)} · spi_reg ${hex2(sn.spi_reg)} · rec ${sn.spi_rec_count} · tran ${sn.spi_tran_count} · audio ${hex2(sn.audio)} · audio_count ${sn.audio_count}`:'—'}</td></tr>
  </table>`;
}
function viewSim(m){
  window.__pod9Keys = true;
  m._k1 = m._k3 = null;
  m.innerHTML = `
  <div class="grid2">
    <div>
      ${card('Front panel at the playhead — click the buttons (keys 1–6, S)', `<div id="fp"></div>`)}
      ${card('Rear panel — click an input BNC to plug/unplug its source; click CONTROL to plug a POD9R', `<div id="rp"></div>`)}
      ${card('RS-422 CONTROL port (9600 8N1, address F0)', `<div id="con"></div>`)}
      ${card('Slave port P3 and remote', `<div id="slv"></div>`)}
    </div>
    <div>
      ${card('What the firmware did (emulated, last action)', `<div style="margin-bottom:6px">${scenarioHTML()}</div><div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
      ${card('Picture on OUT 1 (downstream monitor)', `<canvas id="pic"></canvas>`)}
      ${card('Sources on the input BNCs, standard and firmware', `<div id="srcs"></div>`)}
    </div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek; transport above)', `<canvas id="tl"></canvas>
    <p class="small muted">Every pass of <span class="mono">main</span> is emulated with the firmware's own registers: 144 Tcy (117.2 µs at 4.9152 MHz) when idle, counted from the listing; busy paths are counted to within a few cycles (${inf}). The video is computed line by line from each source's timing. Zoom to “1 field” to find the vertical interval, to “250 µs” to see the LM1881 pulse and the passes that sample it, to “64 µs” for one line.</p>`)}
  ${card('Action log', `<div id="log" class="log"></div>`)}`;
  const draw = ()=>{
    const t = SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t); m.querySelector('#rp').innerHTML = rearSVG(t);
    bindPanel(m.querySelector('#fp')); bindPanel(m.querySelector('#rp'));
    const k1 = D.hex; if (k1!==m._k1){ m._k1=k1; m.querySelector('#con').innerHTML = consoleHTML(); bindConsole(m.querySelector('#con')); }
    m.querySelector('#slv').innerHTML = slaveHTML(t); bindSlave(m.querySelector('#slv'));
    const k3 = JSON.stringify([D.src, D.std, D.fw]); if (k3!==m._k3){ m._k3=k3; m.querySelector('#srcs').innerHTML = sourcesHTML(); bindSources(m.querySelector('#srcs')); }
    m.querySelector('#insp').innerHTML = inspectorHTML(t);
    m.querySelector('#trace').innerHTML = traceHTML();
    drawPicture(m.querySelector('#pic'), t);
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220});
  };
  bindScenario(m);
  SIM.on('time', draw);
}

/* ---------------- tutorial ---------------- */
const userEv = type => D.events.filter(e=>e.user && e.type===type);
const LESSONS = [
  { title:'Meet the POD9', body:`<p>The POD9 is a half-rack <b>6×1 analog video selector</b> (manual: “six by one video selector with remote control capabilities”). Six composite inputs on BNCs, one output buffered into <b>two</b> 75 Ω splits (OUT 1, OUT 2).</p>
     <p>Front: power rocker and green power LED, the <b>A/V SLAVE</b> button and six <b>INPUT SELECT</b> buttons with LEDs. Rear: OUT 1/2, IN 1–6, the <b>CONTROL</b> DE9 for RS-422 and the mains inlet. Inside: an internal <b>slave port</b> P3 “to audio switcher”.</p>
     <p>A PIC (16C73A/16F73) polls the buttons about 8 500 times a second, watches an <b>LM1881 sync separator</b> on the output and only flips the two 4:1 video multiplexers during the <b>vertical interval</b>.</p><p class="muted">Hover over the panels. Click “Next”.</p>`, check:()=>true, auto:true },
  { title:'1 · Pick a source', body:`<p>Press <b>3</b> (or key 3). <span class="mono">debounce</span> needs 254 identical passes (≈30 ms), <span class="mono">router</span> copies <span class="mono">input_reg</span> into <span class="mono">output_reg</span>, and <span class="mono">output</span> shifts it into the 74HC4094 that drives the LEDs.</p><p><b>Goal:</b> input 3 on the bus.</p>`, check:()=> userEv('btn').some(e=>e.k===2) && finXpt()===2, hint:'Click the button labelled 3 while the playhead is early in the second.' },
  { title:'2 · Find the switch point', body:`<p>The LED changes at once, but the picture does not: <span class="mono">output</span> sets <span class="mono">switch_flag,0</span> and <span class="mono">switch_check</span> then waits, pass after pass, for <b>RB0 low</b> — the LM1881's vertical-sync output. Only then does <span class="mono">do_switch</span> drive RB1–RB4.</p>
     <p>Pick zoom <b>1 field (16.7 ms)</b> or narrower and put the playhead within 2 ms of a switch (the dashed line on the “OUT 1” lane).</p><p><b>Goal:</b> playhead next to a switch that happened on vertical sync.</p>`, check:()=> SIM.win <= 0.05 && emulate().sw.some(q=>q.why==='vs' && Math.abs(SIM.t-q.t) < 0.002), hint:()=>{ const q = emulate().sw.find(q=>q.t>0 && q.why==='vs'); return q ? `There is one at ${SIM.fmtT(q.t)}: field ${q.li?q.li.field:'?'} line ${q.li?q.li.lineInField:'?'} of the old source.` : 'Press a button first.'; } },
  { title:'3 · “If the selected input has no sync…”', body:`<p>The manual warns: “If the currently selected input does not have valid synch, POD9 will switch randomly.” Untick <b>IN 6</b> in the source table (or click the IN 6 BNC), select <b>6</b>, then select <b>2</b>. With nothing on the bus the LM1881 never pulses; after 8 timer ticks <span class="mono">synch_check</span> sets <span class="mono">switch_flag,1</span> and the switch happens wherever the field is.</p><p><b>Goal:</b> a switch forced by the timeout.</p>`, check:()=> emulate().sw.some(q=>q.why==='timeout' && q.t>=0), hint:'Source 6 must be unplugged; then 6 and 2. Or load the scenario “Input 6 unplugged”.' },
  { title:'4 · Ask for status over RS-422', body:`<p>Send <b>F0 00</b>. POD9 answers with two bytes: <b>1S65 4321</b> (its own status: 1 = selected, S = slave) and <b>0xxx xxxx</b> (the audio switcher's status, 00 if none).</p><p><b>Goal:</b> POD9 transmitted a reply.</p>`, check:()=> userEv('rx').length>0 && emulate().txF.some(f=> f.t0 >= Math.min(...userEv('rx').map(e=>e.t))), hint:'Use the “F0 00 Request status” preset and look at the RS-422 TX lane.' },
  { title:'5 · Switch video from a remote', body:`<p>Send <b>F0 A0</b> = <span class="mono">10 100 000</span>: “switch video to 4, leave audio alone”. <span class="mono">translate_uart</span> looks 4 up in <span class="mono">video_table</span> and the router copies <span class="mono">video_reg</span> on the next pass. The switch still waits for vertical sync.</p><p><b>Goal:</b> input 4 selected by an RS-422 command.</p>`, check:()=> finXpt()===3 && userEv('rx').some(e=>(e.b&0xC0)===0x80 && ((e.b>>3)&7)===4), hint:'Type F0 A0 in the hex box and press Send.' },
  { title:'6 · Attach an audio switcher', body:`<p>Choose <b>POD2</b> on the slave port P3. POD9 is the SPI master: every timer tick (≈3.4 ms) it clocks one byte each way — an F0 header, then a data byte. With nothing attached V102 put the A/V SLAVE LED out ≈160 ms after power-up; it is only re-shifted by the next <span class="mono">output</span>, so after connecting press any input button: the router keeps bit 5 = 0 and the LED stays lit while F0-framed bytes keep coming back.</p><p><b>Goal:</b> POD2 connected and A/V SLAVE lit at the end of the run.</p>`, check:()=> stateAt('partner', C.HORIZON)!=='none' && finSlave(), hint:'Use the “Slave port P3” selector, then press an input button after the connection time.' },
  { title:'7 · Audio follows video', body:`<p>Press <b>5</b> on the POD9. With slave on, <span class="mono">SPI_trns_cntrl</span> sends the change as a <i>command</i> (bit 7 = 0) in the next 32 data slots; the POD2 acts on the 4th (≈27 ms later).</p><p><b>Goal:</b> POD9 on video 5 and POD2 on audio 5.</p>`, check:()=> finXpt()===4 && (emulate().PT.pre & 0x3F)===(0x3F & ~0x10) && stateAt('partner',C.HORIZON)!=='none', hint:'POD2 attached first, then press 5; watch the slave-port lane.' },
  { title:'8 · Video follows audio', body:`<p>Now press <b>2</b> on the POD2 (slave-port panel). POD2's <span class="mono">do_spi</span> sends its selection as a command; POD9's <span class="mono">SPI_rcv_ctrl</span> needs <b>8</b> commands the first time (spi_rec_count = 8, then 7) before <span class="mono">remote_flag,0</span> lets the router follow.</p><p><b>Goal:</b> POD9 switched to video 2 by the POD2.</p>`, check:()=> userEv('pbtn').some(e=>e.k===1) && finXpt()===1, hint:'Use the POD2 buttons under “Slave port P3”.' },
  { title:'9 · Check the manual against the code', body:`<p>The manual: “the Slave indicator on POD9 may be turned on by sending F0, C0 and turned off by F0, C7”. Send <b>F0 C0</b> and watch A/V SLAVE.</p><p><b>Goal:</b> after your F0 C0 the SLAVE LED is <i>off</i> — <span class="mono">slave_off</span> is the code for C0, the opposite of the manual.</p>`, check:()=> userEv('rx').some(e=>e.b===0xC0) && !finSlave(), hint:'Send the “F0 C0” preset.' },
  { title:'10 · The A/V SLAVE button', body:`<p>In V102 the button is never read. Switch the firmware to <b>V1.02-F73</b> (source table), then press <b>A/V SLAVE</b> (key S): <span class="mono">input</span> clears bit 5 and <span class="mono">router</span> toggles it through <span class="mono">if_clear</span> / <span class="mono">next_output2</span>.</p><p><b>Goal:</b> F73 build, A/V SLAVE pressed and toggled.</p>`, check:()=> D.fw==='f73' && userEv('btn').some(e=>e.k===6) && emulate().notes.some(n=>/A\/V SLAVE toggles/.test(n.txt) && n.t >= Math.min(...userEv('btn').filter(e=>e.k===6).map(e=>e.t))), hint:'Firmware selector is in the source table on the Simulator tab; it is also on this page under “Sources”.' },
  { title:'Done', body:`<p>You have used every control of the POD9. <b>One second, frame by frame</b> takes the second down to fields, lines and the switch point, <b>Software</b> follows the main loop and the slave-port protocol live, and <b>Findings</b> lists what the firmware does that the manual does not say.</p>`, check:()=>true, auto:true },
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__pod9Keys = true;
  m._k1 = m._k3 = null;
  m.innerHTML = `<div class="grid2">
    <div>${card('Tutorial — operating the POD9 (from the manual and the firmware)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>
      ${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The unit at the playhead', `<div id="fp"></div><div id="rp" style="margin-top:8px"></div><div id="lv" class="small mono" style="margin-top:6px"></div>`)}
      ${card('RS-422 console', `<div id="con"></div>`)}${card('Slave port', `<div id="slv"></div>`)}${card('Sources', `<div id="srcs"></div>`)}
      ${card('Timeline', `<canvas id="tl"></canvas>`)}</div></div>`;
  const hot = `<g><rect x="120" y="45" width="200" height="200" fill="transparent"><title>Power rocker and power LED</title></rect>
    <rect x="430" y="110" width="100" height="105" fill="transparent" style="pointer-events:none"><title>A/V SLAVE (RA1)</title></rect></g>`;
  const draw = ()=>{
    const t=SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t,{hot}); m.querySelector('#rp').innerHTML = rearSVG(t);
    bindPanel(m.querySelector('#fp')); bindPanel(m.querySelector('#rp'));
    if (D.hex!==m._k1){ m._k1=D.hex; m.querySelector('#con').innerHTML = consoleHTML(); bindConsole(m.querySelector('#con')); }
    m.querySelector('#slv').innerHTML = slaveHTML(t); bindSlave(m.querySelector('#slv'));
    const k3 = JSON.stringify([D.src, D.std, D.fw]); if (k3!==m._k3){ m._k3=k3; m.querySelector('#srcs').innerHTML = sourcesHTML(); bindSources(m.querySelector('#srcs')); }
    const x = xptAt(t); m.querySelector('#lv').textContent = `On the bus: ${x<0?'nothing':'IN '+(x+1)} · state at 2 s: video ${finXpt()+1||'—'}${finSlave()?' · SLAVE lit':''}${stateAt('partner',C.HORIZON)!=='none'?' · audio '+(pSelOf(emulate().PT.pre).map(i=>i+1).join('+')||'—'):''}`;
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
    SIM.drawLanes(m.querySelector('#tl'), lanes(['pins','led','xpt','vs','out','spi','slave','rx','tx']), {labelW:200});
  };
  SIM.on('time', draw);
}
function resetAll(){ loadScenario('idle'); D.log = []; D.hex = 'F0 00'; }

/* ---------------- one second, frame by frame ---------------- */
function viewAnatomy(m){
  window.__pod9Keys = true;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">
    ${card('As seen by the device', `<div id="dev"></div>`)}
    ${card('As seen by the panel, the monitor and a waveform monitor', `<div id="fp"></div><div class="grid2" style="margin-top:8px"><div><canvas id="pic"></canvas></div><div><canvas id="wfm"></canvas><p class="small muted">Line-rate waveform monitor on OUT 1: the line under the playhead, −40 … 100 IRE.</p></div></div>`)}
  </div>
  ${card('Zoom ladder at the playhead — second → field → lines → one line (OUT 1)', `<canvas id="zl"></canvas>`)}
  ${card('Every switch in the run — where in the field it landed', `<div id="sws"></div><canvas id="swz"></canvas><p class="small muted">The lower trace is ±5 lines around the switch nearest the playhead, old source then new. A vertical-interval switch sits on the broad (vertical-sync) pulses, before line ${S().vbi}.</p>`)}`;
  const draw = ()=>{
    const t=SIM.t, E=emulate(), P=E.P, st=S(), IDLE=idleCost();
    let n0 = 0, busy = 0; for (let i=0;i<P.n;i++){ if (P.t0[i]>=0 && P.t0[i]<1){ n0++; if (passLen(i)>IDLE+12) busy++; } }
    const tk = E.tmr.filter(x=>x>=0&&x<1), per = tk.length>1 ? (tk[tk.length-1]-tk[0])/(tk.length-1) : 0;
    const rx = E.rxF.filter(f=>f.t0>=0&&f.t0<1).length, tx = E.txF.filter(f=>f.t0>=0&&f.t0<1).length, sx = E.spiX.filter(s=>s.t>=0&&s.t<1).length;
    const rows = [
      ['Video fields', (1/FIELD()).toFixed(3), SIM.fmtDur(FIELD()), `${st.name}: ${st.lines/2} lines each; the LM1881 fires once per field`],
      ['Video lines', (1/st.H).toFixed(1), SIM.fmtDur(st.H), `H sync ${st.sync*1e6} µs, burst, active picture ${((st.act1-st.act0)*1e6).toFixed(1)} µs`],
      ['Colour subcarrier', (st.fsc/1e6).toFixed(6)+' MHz', SIM.fmtDur(1/st.fsc), 'manual specifications are quoted “@ 3.58M”'],
      ['LM1881 vertical pulse (RB0 low)', (1/FIELD()).toFixed(2), SIM.fmtDur(C.VSW)+' wide', `RSET 680 kΩ (R27), C12 0.1 µF; width ${inf} from the datasheet`],
      ['Instruction cycles (Tcy)', '1 228 800', SIM.fmtDur(C.TCY), '4.9152 MHz crystal X1 ÷ 4'],
      ['Main-loop passes (this second)', n0.toLocaleString(), SIM.fmtDur(IDLE*C.TCY)+' idle', `${busy} took a busy path; RB0 is sampled once per pass → ≈2 samples per VS pulse`],
      ['Button debounce', '—', '254 passes ≈ '+SIM.fmtDur(254*IDLE*C.TCY), 'bcount 0xFE → 0, and again on release (debounce_rel)'],
      ['TMR2IF ticks', tk.length.toString(), SIM.fmtDur(per||C.TMR2*C.TCY), `4096 Tcy (3.333 ms) + the wait for timer_check: ${per?(per/C.TCY).toFixed(0):'—'} Tcy measured`],
      ['Slave-port SPI exchanges', sx.toLocaleString(), SIM.fmtDur(per||C.TMR2*C.TCY), 'one per tick, F0 header + data alternately'],
      ['SPI bit clock (master, Fosc/4)', '1 228 800 while clocking', SIM.fmtDur(C.TCY), '8 bits = 6.5 µs per exchange'],
      ['Switch timeout (no sync)', '—', '8 ticks ≈ '+SIM.fmtDur(8*(per||C.TMR2*C.TCY)), 'switch_count; a field is 16.7 ms, so a live source always gets the VI switch'],
      ['RS-422 bytes in / out (this second)', rx+' / '+tx, SIM.fmtDur(C.BYTE), '9600 baud, 10 bits per byte'],
      ['LED shift into 74HC4094', 'per change', SIM.fmtDur(96*C.TCY), '8 bits on RB6/RB7, strobe RB5'],
      ['Crosspoint break-before-make', 'per switch', '≈ '+SIM.fmtDur(10*C.TCY)+' – '+SIM.fmtDur(26*C.TCY), 'do_switch: RB4/RB3 high first, then the new enable low'],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>where it comes from</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">The video itself never touches the PIC: it goes BNC → 75 Ω → 100 Ω → multiplexer → OPA650 → two 75 Ω outputs. What the firmware decides is only <i>which</i> mux input is enabled, and <i>when</i>. Use <b>Step</b> on the transport to move one pass, one line or one field at a time.</p>`;
    const sp = stepAt(t), sn = sp.pass>=0?snap(sp.pass):null, x = xptAt(t);
    m.querySelector('#dev').innerHTML = `<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>PIC</th><td class="mono">${!powerAt(t)?'off / reset':sp.step>=0?'pass #'+sp.pass.toLocaleString()+': '+ROUT[sp.step][0]+'<br><span class="muted">'+ROUT[sp.step][2]+'</span>':'—'}</td></tr>
      <tr><th>Instruction</th><td class="mono">${sp.pass>=0 && powerAt(t)?'Tcy '+Math.floor((t-P.t0[sp.pass])/C.TCY)+' of '+passLen(sp.pass):'—'}</td></tr>
      <tr><th>Video on the bus</th><td class="small">${powerAt(t)?busInfo(t):'—'}</td></tr>
      <tr><th>Level now (OUT 1)</th><td class="mono">${powerAt(t)&&x>=0?ireAt(x,t).toFixed(1)+' IRE = '+(((ireAt(x,t)+40)/140)*1000).toFixed(0)+' mV above sync tip':'—'}</td></tr>
      <tr><th>RB0 / switch_flag</th><td class="mono">${powerAt(t)&&x>=0&&vsLow(x,t)?'LOW':'high'} / ${sn?bin8(sn.switch_flag).slice(6)+' (count '+sn.switch_count+')':'—'}</td></tr>
      <tr><th>Registers</th><td class="mono">${sn?`pre_output ${hex2(sn.pre_output)} · switch_out ${hex2(sn.switch_out)} · PORTB ${hex2(sn.PORTB)}`:'—'}</td></tr></table>`;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    drawPicture(m.querySelector('#pic'), t);
    drawWfm(m.querySelector('#wfm'), t);
    drawLadder(m.querySelector('#zl'), t);
    const sws = E.sw.filter(q=>q.t>=0 && q.t<1.2);
    m.querySelector('#sws').innerHTML = sws.length ? `<table class="kv small"><tr><th>time</th><th>from → to</th><th>trigger</th><th>old source: field / line</th><th>new source lands on</th><th>verdict</th></tr>${sws.map(q=>{ const nl = D.src[q.to].on ? lineInfo(q.to, q.t) : null; const vi = q.li && (q.li.lineInField <= st.vbi);
      const same = q.from>=0 && D.src[q.from].on && D.src[q.to].on && D.src[q.from].ph === D.src[q.to].ph;
      return `<tr><td class="mono">${SIM.fmtT(q.t)}</td><td>IN ${q.from+1||'—'} → IN ${q.to+1}</td><td>${q.why==='vs'?'RB0 low (vertical sync)':'<b>switch_count timeout</b>'}</td><td class="mono">${q.li?`F${q.li.field} L${q.li.lineInField}`:'—'}</td><td class="mono">${nl?`F${nl.field} L${nl.lineInField}`:'no signal'}</td><td>${q.why!=='vs'?'mid-picture switch (manual: “will switch randomly”)':same?'clean: both genlocked, inside the VI':vi?'in the VI of the old source, but the new one is '+(((D.src[q.to].ph-D.src[q.from].ph)%st.lines+st.lines)%st.lines)+' lines away → downstream roll':'—'}</td></tr>`; }).join('')}</table>` : '<p class="muted small">No switch in the run yet — press a button.</p>';
    drawSwitchZoom(m.querySelector('#swz'), t);
  };
  SIM.on('time', draw);
}
function drawWfm(cv, t){
  const {c, w, h} = SIM.canvas(cv, 150); const st = S(), x = xptAt(t);
  c.fillStyle = '#04120a'; c.fillRect(0,0,w,h);
  c.strokeStyle = 'rgba(120,220,140,.25)'; c.lineWidth=1; [-40,0,7.5,50,100].forEach(v=>{ const yy = 8 + (100-v)/140*(h-16); c.beginPath(); c.moveTo(0,yy); c.lineTo(w,yy); c.stroke(); c.fillStyle='rgba(120,220,140,.6)'; c.font='9px '+SIM.css('--mono'); c.fillText(v, 2, yy-2); });
  if (!powerAt(t) || x < 0 || !D.src[x].on){ c.fillStyle='#7c7'; c.font='11px '+SIM.css('--sans'); c.fillText('no signal', 30, h/2); return; }
  const L = lineInfo(x, t), ls = t - L.u; c.strokeStyle = '#7dff9a'; c.beginPath();
  for (let i=0;i<=900;i++){ const tt = ls + st.H*i/900, v = ireAt(x, tt), yy = 8 + (100-v)/140*(h-16), xx = 20 + (w-24)*i/900; i?c.lineTo(xx,yy):c.moveTo(xx,yy); } c.stroke();
  c.fillStyle='#bfffcf'; c.font='10px '+SIM.css('--mono'); c.fillText(`IN ${x+1} F${L.field} L${L.lineInField}`, w-110, 14);
  const px = 20 + (w-24)*L.u/st.H; c.strokeStyle = SIM.css('--play'); c.beginPath(); c.moveTo(px, 0); c.lineTo(px, h); c.stroke();
}
function drawLadder(cv, t){
  const st = S(), levels = [['1 second',1],['2 fields (one frame)',2*FIELD()],['1 field ≈ '+SIM.fmtDur(FIELD()),FIELD()],['20 lines',20*st.H],['3 lines',3*st.H],['1 line',st.H],['sync + burst (12 µs)',12e-6]];
  const H = levels.length*48+10, {c,w} = SIM.canvas(cv, H);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), play=SIM.css('--play'), grid=SIM.css('--grid');
  levels.forEach(([nm,span],i)=>{
    const y=8+i*48, t0=Math.max(0,Math.min(1-span,t-span/2));
    c.fillStyle=ink; c.font='12px '+SIM.css('--sans'); c.fillText(nm,6,y+14); c.fillStyle=ink2; c.font='10px '+SIM.css('--sans'); const xx = xptAt(t0+span/2); c.fillText('bus: '+(xx<0?'none':'IN '+(xx+1)),6,y+28);
    const x0=180, pw=w-x0-10; c.strokeStyle=grid; c.strokeRect(x0,y+2,pw,38);
    const X = tt => x0 + (tt-t0)/span*pw;
    c.save(); c.beginPath(); c.rect(x0,y+2,pw,38); c.clip(); drawVideo(c, X, t0, t0+span, y+1, 40, 'out'); c.restore();
    const px=X(t); c.strokeStyle=play; c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+42); c.stroke();
    if (i<levels.length-1){ const ns=levels[i+1][1]; const a=X(Math.max(0,Math.min(1-ns,t-ns/2))); c.fillStyle=play; c.globalAlpha=.15; c.fillRect(a,y+2,Math.max(2,ns/span*pw),38); c.globalAlpha=1; }
  });
}
function drawSwitchZoom(cv, t){
  const E = emulate(), st = S(); const {c, w} = SIM.canvas(cv, 120);
  const q = E.sw.filter(s=>s.t>=-0.05).sort((a,b)=>Math.abs(a.t-t)-Math.abs(b.t-t))[0];
  if (!q){ c.fillStyle=SIM.css('--ink2'); c.font='12px '+SIM.css('--sans'); c.fillText('no switch yet', 10, 60); return; }
  const t0 = q.t - 5*st.H, t1 = q.t + 5*st.H, X = tt => 10 + (tt-t0)/(t1-t0)*(w-20);
  drawVideo(c, X, t0, t1, 4, 90, 'out');
  c.fillStyle = SIM.css('--bad'); vsIntervals(t0, t1).forEach(([a,b])=>c.fillRect(X(a), 98, Math.max(1.5,X(b)-X(a)), 6));
  c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(`switch at ${SIM.fmtT(q.t)}: IN ${q.from+1||'—'} → IN ${q.to+1}${q.li?` · old F${q.li.field} L${q.li.lineInField}`:''} · red bar = LM1881 VS`, 12, 116);
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  in:{x:20,y:30,w:170,h:120,t:'IN 1–6 (BNC)',s:['75 Ω 1 % to ground','R9–R19 (odd)','100 Ω series (even)'],d:'Each input is terminated on the board (VIN1: R19 75 R, R20 100 R to U6-1, and so on; POD9-iss2.net). The manual gives 75 Ω input impedance and 46 dB return loss at 3.58 MHz. The 100 Ω series resistor isolates the mux input capacitance from the line.'},
  mux:{x:220,y:30,w:200,h:120,t:'4:1 video muxes U6, U5',s:['U6: IN 1–3 · U5: IN 4–6','A0 = RB1, A1 = RB2 (both)','EN: RB3 (U6), RB4 (U5)'],d:'Two four-input video multiplexers with their outputs tied (pin 10 of both → R23 330 Ω → OPA650 +IN). The ISS1 schematic and the netlist call them GX434 (footprint GX414); the ISSUE 2 assembly drawing shows HA4314A. Input 3 of each (IN3, pin 7) is unused; analog grounds AG sit between the inputs. Supply ±5 V. The firmware drives the selected chip\'s enable LOW and the other HIGH, so the enable is active low here ('+'inferred from the code; no datasheet in the archive'+').'},
  amp:{x:450,y:30,w:190,h:120,t:'Output amp U7',s:['OPA650 (ISS1: EL2020)','gain 1 + 680/(330 + RV1)','RV1 500 Ω trim'],d:'Non-inverting gain stage: R25 680 Ω feedback, R24 330 Ω + RV1 500 Ω to ground → gain 1.82 … 3.06, set to 2 so that the back-terminated output gives 1 V p-p into 75 Ω (manual: “1 Vp-p, terminated”). ISS1 had an EL2020 with CV1 2–25 pF compensation.'},
  out:{x:670,y:30,w:222,h:120,t:'OUT 1, OUT 2',s:['R21, R22 75 Ω','“Output Impedance (2 splits) 75 ohm”','R26 620 Ω → C11 → LM1881'],d:'Both splits come from the same OPA650 output through their own 75 Ω back-termination. A third tap (R26 620 Ω, C11 0.1 µF) feeds the sync separator, so the POD9 watches what it is putting out, not the input it is going to.'},
  sync:{x:670,y:190,w:190,h:110,t:'LM1881 sync separator U8',s:['VS (pin 3) → RB0','RSET R27 680 kΩ / C12','composite / burst outputs unused'],d:'National LM1881. Its vertical output goes low for a few hundred µs at each field\'s vertical sync and is wired to RB0 (V_SYNCH). The odd/even and composite-sync outputs are not used. Because it sees the output, the POD9 switches in the vertical interval of the source it is leaving.'},
  mcu:{x:400,y:190,w:230,h:150,t:'PIC U3 (16C63/16C73A/16F73)',s:['4.9152 MHz X1, 22 pF','polling loop ≈117 µs','RB1–RB4 crosspoint, RB0 ← VS','RB5–7 → 74HC4094','USART 9600 · SSP master'],d:'The drawings call it PIC16C63(A); the code is assembled for the 16C73A (V102) or 16F73 (the F73 build); the 2009 slave-port photo shows a PIC16F73-I/SP. Everything is polled in main; the interrupt vector is a bare RETFIE. ADCON1 is set to “digital” every pass in init_loop.'},
  led:{x:150,y:190,w:220,h:120,t:'Front panel + 74HC4094 U4',s:['P1: 8 LEDs via RP1/RP2 330 Ω','P2/P4: 8 buttons, RN1 3K3 pull-ups','Q1 IN3 Q2 IN1 Q3 SLAVE Q4 spare …'],d:'U4 74HC4094 (STR RB5, D RB6, CLK RB7, OE tied high per assembly note 3). Its Q outputs sink the LED current: XPT3 Q1, XPT1 Q2, MIX (= A/V SLAVE) Q3, SPARE Q4, XPT5 Q5, XPT6 Q6, XPT4 Q7, XPT2 Q8 — exactly the bit order the firmware shifts out LSB first. The buttons arrive on P2 (and in parallel on the GPI header P4, pin 1 MIX, 2 SPARE, 3–8 IN1–6, 9 GND) through 330 Ω.'},
  rs:{x:20,y:340,w:220,h:100,t:'RS-422 (U1, U2 75176)',s:['J1 DE9 CONTROL','RX 7/2 → U1 → RC7','RC6 → U2 → 3/8, RC0 = enable'],d:'U1 is wired as a permanent receiver (RE/DE grounded — assembly note 2), U2 as the driver, enabled by RC0 only while transmitting. R28–R31 22 Ω in series, RP5 10 kΩ bias. LK1 can tie U2\'s receiver to RC7 too; LK2 grounds J1 pin 1.'},
  slv:{x:270,y:360,w:220,h:90,t:'Slave port P3 (PAN400)',s:['1 SCK ← RC3 · 2 SDO ← RC5','3 SDI → RC4 · 4 GND','100 Ω + 10 kΩ pull-ups'],d:'“TO AUDIO SWITCHER”. POD9 is the SPI master (SSPCON = SSPEN only, Fosc/4). R2–R4 100 Ω series, R33–R35 10 kΩ pull-ups (added in issue 2). With nothing connected SDI reads 0xFF.'},
  psu:{x:520,y:360,w:220,h:90,t:'Power',s:['T1 229B12 toroid, D1–D4','LM317 +5 V · LM337 −5 V','221 Ω / 665 Ω → ±5.01 V'],d:'Linear supply: dual-primary toroid (0 Ω straps R36–R38 select 115/230 V, assembly note 5), bridge of 1N4003s, 470 µF/50 V reservoirs, LM317 and LM337 each set by 221 Ω / 665 Ω: 1.25 × (1 + 665/221) = 5.01 V. The power LED hangs on the unregulated +V through R32 2 kΩ. Manual: 115 V 60 Hz, 12 VA.'},
};
const LINKS = [['in','mux'],['mux','amp'],['amp','out'],['out','sync'],['sync','mcu'],['mcu','mux'],['led','mcu'],['mcu','rs'],['mcu','slv'],['psu','mcu']];
let blockSel = 'mcu';
function viewBlock(m){
  window.__pod9Keys = false;
  m.innerHTML = `${card('Block diagram — click a block (redrawn from POD9-iss2.net and the ISS1 schematic)', `<div id="bd"></div>`)}${card('Detail', `<div id="bdd"></div>`)}
    ${card('Mechanical: the panels on their drawings (POD9 - #Mechanical #DA #2016, read upright)', `<div id="mech"></div>`)}`;
  const draw = ()=>{
    const t = SIM.t, x = xptAt(t);
    const ctr = b=>[b.x+b.w/2, b.y+b.h/2];
    let s = `<svg viewBox="0 0 900 460" style="width:100%;max-width:1100px">`;
    LINKS.forEach(([a,b])=>{ const A1=ctr(BLOCKS[a]), B1=ctr(BLOCKS[b]); s += `<line x1="${A1[0]}" y1="${A1[1]}" x2="${B1[0]}" y2="${B1[1]}" stroke="var(--line)" stroke-width="3"/>`; });
    Object.entries(BLOCKS).forEach(([k,b])=>{ const on = k===blockSel; s += `<g class="p9blk" data-k="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="9" fill="var(--panel2)" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?3:1.5}"/>
      <text x="${b.x+10}" y="${b.y+21}" font-size="13.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+10}" y="${b.y+41+i*17}" font-size="11" fill="var(--ink2)">${l}</text>`).join('')}</g>`; });
    s += `<text x="230" y="172" font-size="12" fill="var(--accent)">bus now: ${x<0?'—':'IN '+(x+1)+' via '+(x<3?'U6':'U5')}</text></svg>`;
    m.querySelector('#bd').innerHTML = s;
    m.querySelectorAll('.p9blk').forEach(g=>g.onclick=()=>{ blockSel=g.dataset.k; draw(); });
    const b = BLOCKS[blockSel]; m.querySelector('#bdd').innerHTML = `<h3 style="margin-top:0">${b.t}</h3><p>${b.d}</p><ul class="small">${b.s.map(q=>`<li>${q}</li>`).join('')}</ul>`;
    m.querySelector('#mech').innerHTML = `<div class="grid2"><div><table class="kv small"><tr><th>Front ISS 2 (drawn PW)</th><th>Drawing (inches)</th><th>Silk px (×200)</th></tr>
      <tr><td>Panel</td><td>8.570 × 1.606, .059 CRS (16 ga.)</td><td>1714 × 321</td></tr>
      <tr><td>Rocker</td><td>.505 × .770 rect. at .900, .950</td><td>centre (180, 131)</td></tr>
      <tr><td>PWR LED</td><td>.130 dia. at 1.496, .516</td><td>(299, 218) ✓ crosshair</td></tr>
      <tr><td>Buttons</td><td>.406 dia. ×7: 2.400 (A/V SLAVE); 3.900 + 5 × .750</td><td>480; 780…1530</td></tr>
      <tr><td>Screws</td><td>.140 c'sk ×3 at 2.775 / 5.025 / 7.275; .113 at .251 / 8.319</td><td>556, 1005, 1455 ✓</td></tr>
      <tr><td>Revision</td><td colspan="2">2: “.340 SQ. CHANGED TO .406 DIA. (OCT.29/12)” · “POD9 FRONT ISSUE 2 IS THE SAME AS POD2 FRONT ISSUE 2, ONLY THE SILKSCREEN IS DIFFERENT.”</td></tr></table></div>
      <div><table class="kv small"><tr><th>Rear ISS 3 (drawn E.S. 08/10/03)</th><th>Inside view → outside x = 8.570 − x</th><th>Silk px</th></tr>
      <tr><td>BNC D-holes ×8 (detail A, .376 dia.)</td><td>top y .376: 0.950, 2.000, 3.050, 4.100 · bottom y 1.026: 0.950, 2.525, 3.575, 4.625</td><td>OUT1 (194,75) IN1/3/5 404/614/824 · OUT2 (194,205) IN2/4/6 509/719/929</td></tr>
      <tr><td>CONTROL DE9</td><td>.465 × .768 at 5.885, 1.043; .130 holes 5.393 / 6.377</td><td>(1181, 209)</td></tr>
      <tr><td>AC inlet</td><td>1.256 × 1.080 at 7.415, .703</td><td>centre (1487, 141)</td></tr>
      <tr><td>Revisions</td><td colspan="2">2 (04/07/07) “MODIFIED TO NEW AC PLUG” · 3 (06/06/13, D.A.) “DETAIL A ROTATED 180 DEG. 8 PLACES”</td></tr></table></div></div>
      <p class="small muted">Both drawings are plotted sideways on the sheet and were read rotated upright. The rear is drawn from the inside, so its x dimensions run from the other edge; mirrored, they land on the silk's crosshairs. Finish: WBS black, Sherwin Williams Polane T F63B12; silkscreen to artwork #POD9-FRONT&amp;REAR-SILK.</p>`;
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
  const sn = (()=>{ const s = stepAt(t); return s.pass>=0 ? snap(s.pass) : null; })(), low = k => pinLowAt(k, t), x = xptAt(t), pb = sn ? sn.PORTB : 0;
  const L = [[1,'MCLR','R6 47 kΩ to +5 V (ISS1: 100 kΩ)'],[2,'RA0','IN SPARE ← RP3 330 Ω ← P2/P4-2', low(7)],[3,'RA1','IN MIX (A/V SLAVE) ← RP4 ← P2/P4-1', low(6)],[4,'RA2','IN2 ← RP3 ← P2/P4-4', low(1)],[5,'RA3','IN1 ← RP4 ← P2/P4-3', low(0)],[6,'RA4','IN4 ← RP3 ← P2/P4-6', low(3)],[7,'RA5','IN3 ← RP4 ← P2/P4-5', low(2)],
    [9,'OSC1','X1 4M9152, C7 22p'],[10,'OSC2','X1, C6 22p'],[11,'RC0','U2 RE/DE (driver enable)', sn&&sn.RC0],[12,'RC1','IN6 ← RP3 ← P2/P4-8', low(5)],[13,'RC2','IN5 ← RP4 ← P2/P4-7', low(4)],[14,'RC3/SCK','R4 100 Ω → P3-1 (R34 10k)']];
  const R = [[21,'RB0','V_SYNCH ← U8 LM1881 pin 3', x>=0 && vsLow(x,t)],[22,'RB1','V0 → U5/U6 A0 (pin 13)', !!(pb&2)],[23,'RB2','V1 → U5/U6 A1 (pin 12)', !!(pb&4)],[24,'RB3','V2 → U6 EN (pin 11)', !(pb&8)],[25,'RB4','V3 → U5 EN (pin 11)', !(pb&16)],[26,'RB5','STR → U4-1'],[27,'RB6','D → U4-2'],[28,'RB7','CLK → U4-3'],
    [15,'RC4/SDI','R5 100 Ω ← P3-3 (R33 10k)'],[16,'RC5/SDO','R3 100 Ω → P3-2 (R35 10k)'],[17,'RC6/TX','→ U2-4 (D)'],[18,'RC7/RX','← U1-1 (R), LK1 → U2-1'],[20,'VDD','+5 V'],[8,'VSS','GNDD (and 19)']];
  let s = `<svg viewBox="0 0 900 470" style="width:100%"><rect x="330" y="20" width="240" height="410" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.6"/><text x="450" y="44" text-anchor="middle" font-weight="700" fill="var(--ink)">U3 PIC16C63 / 16C73A / 16F73</text><text x="450" y="60" text-anchor="middle" font-size="11" fill="var(--ink2)">DIP-28 · C17 0.1 µF</text>`;
  L.forEach((p,i)=> s += pinRow(330, 84+i*26, p[0], p[1], p[2], 'L', p[3]?'#d33a2c':null));
  R.forEach((p,i)=> s += pinRow(570, 84+i*24, p[0], p[1], p[2], 'R', p[3]?'#d33a2c':null));
  s += `<text x="20" y="452" font-size="10.5" fill="var(--ink2)">Redrawn from POD9-iss2.net (P-CAD netlist, 21 Jan 2009) and the ISS1 schematic — not the original CAD. Red = pin low / line active now (RB1/RB2 red = high).</text></svg>`;
  return s;
}
function schVideo(t){
  const x = xptAt(t);
  const inRow = k => { const y = 50 + k*52 + (k>=3?30:0), on = x===k; return `<text x="14" y="${y+4}" font-size="11" fill="var(--ink)">VIN${k+1}</text><line x1="50" y1="${y}" x2="170" y2="${y}" stroke="${on?'#d33a2c':'var(--ink2)'}" stroke-width="${on?2.4:1.2}"/>
    <rect x="70" y="${y+4}" width="10" height="26" fill="none" stroke="var(--ink2)"/><text x="84" y="${y+22}" font-size="9" fill="var(--ink2)">75R</text><rect x="110" y="${y-5}" width="26" height="10" fill="none" stroke="var(--ink2)"/><text x="112" y="${y-8}" font-size="9" fill="var(--ink2)">100R</text>`; };
  const mux = (yy, nm, en, ins) => `<rect x="170" y="${yy}" width="120" height="150" fill="var(--panel2)" stroke="var(--ink)"/><text x="230" y="${yy+18}" text-anchor="middle" font-weight="700" font-size="12" fill="var(--ink)">${nm}</text>
    <text x="178" y="${yy+40}" font-size="10" fill="var(--ink2)">1 IN0 · 3 IN1 · 5 IN2</text><text x="178" y="${yy+56}" font-size="10" fill="var(--ink2)">7 IN3 n.c. · 2/4/6 AG</text><text x="178" y="${yy+72}" font-size="10" fill="var(--ink2)">13 A0 ← V0 · 12 A1 ← V1</text><text x="178" y="${yy+88}" font-size="10" fill="${en?'#d33a2c':'var(--ink2)'}">11 EN ← ${ins} ${en?'(LOW: on)':''}</text><text x="178" y="${yy+104}" font-size="10" fill="var(--ink2)">14 +5 V · 8 −5 V</text><text x="178" y="${yy+120}" font-size="10" fill="var(--ink2)">10 OUT →</text>`;
  return `<svg viewBox="0 0 900 400" style="width:100%">
    ${[0,1,2,3,4,5].map(inRow).join('')}
    ${mux(30,'U6 GX434 / HA4314A', x>=0&&x<3, 'V2 (RB3)')}${mux(210,'U5 GX434 / HA4314A', x>=3, 'V3 (RB4)')}
    <line x1="290" y1="150" x2="360" y2="150" stroke="var(--ink2)"/><line x1="290" y1="330" x2="340" y2="330" stroke="var(--ink2)"/><line x1="340" y1="330" x2="340" y2="150" stroke="var(--ink2)"/>
    <rect x="360" y="145" width="30" height="10" fill="none" stroke="var(--ink2)"/><text x="360" y="140" font-size="9" fill="var(--ink2)">R23 330R</text>
    <path d="M420 110 L420 190 L490 150 Z" fill="var(--panel2)" stroke="var(--ink)"/><text x="428" y="154" font-size="10" fill="var(--ink)">U7 OPA650</text><text x="424" y="132" font-size="10" fill="var(--ink2)">+3</text><text x="424" y="180" font-size="10" fill="var(--ink2)">−2</text>
    <line x1="390" y1="150" x2="420" y2="130" stroke="var(--ink2)"/><line x1="420" y1="175" x2="400" y2="175" stroke="var(--ink2)"/><line x1="400" y1="175" x2="400" y2="240" stroke="var(--ink2)"/>
    <text x="330" y="258" font-size="10" fill="var(--ink2)">R24 330R + RV1 500R to GND</text><path d="M400 210 h100 v-60" fill="none" stroke="var(--ink2)"/><text x="440" y="206" font-size="10" fill="var(--ink2)">R25 680R</text>
    <line x1="490" y1="150" x2="640" y2="150" stroke="${x>=0?'#d33a2c':'var(--ink2)'}" stroke-width="2"/><text x="520" y="142" font-size="10" fill="var(--ink2)">pin 6</text>
    <line x1="560" y1="150" x2="560" y2="90" stroke="var(--ink2)"/><line x1="560" y1="90" x2="700" y2="90" stroke="var(--ink2)"/><text x="590" y="84" font-size="10" fill="var(--ink2)">R21 75R → VOUT1 (OUT 1)</text>
    <line x1="640" y1="150" x2="700" y2="150" stroke="var(--ink2)"/><text x="600" y="168" font-size="10" fill="var(--ink2)">R22 75R → VOUT2 (OUT 2)</text>
    <line x1="580" y1="150" x2="580" y2="290" stroke="var(--ink2)"/><text x="586" y="230" font-size="10" fill="var(--ink2)">R26 620R, C11 0.1 µF</text>
    <rect x="560" y="290" width="160" height="90" fill="var(--panel2)" stroke="var(--ink)"/><text x="640" y="310" text-anchor="middle" font-weight="700" font-size="12" fill="var(--ink)">U8 LM1881</text>
    <text x="568" y="330" font-size="10" fill="var(--ink2)">2 VIN · 6 RSET (R27 680k, C12)</text><text x="568" y="346" font-size="10" fill="${x>=0&&vsLow(x,t)?'#d33a2c':'var(--ink2)'}">3 VS → V_SYNCH → RB0 ${x>=0&&vsLow(x,t)?'(LOW)':''}</text><text x="568" y="362" font-size="10" fill="var(--ink2)">1 CS, 5 BF, 7 O/E: n.c. · 8 +5 V</text>
    <text x="20" y="392" font-size="10.5" fill="var(--ink2)">Redrawn from schematic page 1 (ISS1PCB, Oct 20 1998) and POD9-iss2.net. Pin names after the ISS1 drawing; the mux enable polarity is inferred from the code.</text></svg>`;
}
function schPanel(t){
  const led = ledAt(t), q = ['XPT3','XPT1','MIX (A/V SLAVE)','SPARE','XPT5','XPT6','XPT4','XPT2'], qp = [4,5,6,7,14,13,12,11];
  return `<svg viewBox="0 0 900 360" style="width:100%"><rect x="330" y="30" width="170" height="250" fill="var(--panel2)" stroke="var(--ink)"/><text x="415" y="52" text-anchor="middle" font-weight="700" fill="var(--ink)">U4 74HC4094</text>
    ${[['1','STR ← RB5'],['2','D ← RB6'],['3','CLK ← RB7'],['15','OE → +5 V (note 3)'],['16','VCC'],['8','GND (note 2)']].map((p,i)=>`<text x="320" y="${84+i*30}" text-anchor="end" font-size="11" fill="var(--ink)">${p[1]}</text><text x="336" y="${84+i*30}" font-size="9" fill="var(--ink2)">${p[0]}</text>`).join('')}
    ${q.map((n,i)=>{ const b = 7-i, on = led>=0 && !((led>>b)&1); return `<text x="494" y="${78+i*26}" text-anchor="end" font-size="9" fill="var(--ink2)">${qp[i]}</text><text x="470" y="${78+i*26}" text-anchor="end" font-size="11" fill="var(--ink)">Q${i+1}</text><line x1="500" y1="${74+i*26}" x2="640" y2="${74+i*26}" stroke="${on?'#d33a2c':'var(--ink2)'}" stroke-width="${on?2.4:1.2}"/><text x="646" y="${78+i*26}" font-size="11" fill="${on?'#d33a2c':'var(--ink)'}">${n} · bit ${b} → RP1/RP2 330 Ω → P1</text>`; }).join('')}
    <text x="20" y="300" font-size="11" fill="var(--ink)">P1 (BERG12RA, LEDs): 1 GND, 2 +5 V (LED anodes), 3–10 via RP1/RP2. P2 (BERG12RA, buttons) = P4 (PAN900 GPI): 1 MIX, 2 SPARE, 3–8 IN1–IN6, P4-9 GND.</text>
    <text x="20" y="318" font-size="11" fill="var(--ink)">RN1 3K3 pulls each button line up; RP3/RP4 330 Ω in series. 4094 outputs sink the LEDs: lit = bit 0.</text>
    <text x="20" y="342" font-size="10.5" fill="var(--ink2)">Redrawn from POD9-iss2.net. The Q order matches the firmware's LSB-first shift exactly (bit b ends on Q(8−b)). Red = LED lit now.</text></svg>`;
}
function schComm(t){
  const sn = (()=>{ const s = stepAt(t); return s.pass>=0 ? snap(s.pass) : null; })();
  return `<svg viewBox="0 0 900 330" style="width:100%">
    <rect x="30" y="40" width="90" height="170" rx="8" fill="var(--panel2)" stroke="var(--ink)"/><text x="75" y="30" text-anchor="middle" font-size="11" fill="var(--ink)">J1 DE-9S CONTROL</text>
    ${[['7','RX+'],['2','RX−'],['3','TX+'],['8','TX−'],['5','GND'],['9','GND'],['1','LK2 → GND']].map((p,i)=>`<text x="40" y="${64+i*21}" font-size="11" fill="var(--ink)">${p[0]} ${p[1]}</text>`).join('')}
    <rect x="250" y="40" width="140" height="70" fill="var(--panel2)" stroke="var(--ink)"/><text x="320" y="62" text-anchor="middle" font-weight="700" font-size="11" fill="var(--ink)">U1 75176 (RX)</text><text x="320" y="80" text-anchor="middle" font-size="10" fill="var(--ink2)">A/B ← 7/2 via R28/R29 22 Ω</text><text x="320" y="96" text-anchor="middle" font-size="10" fill="var(--ink2)">RE/DE grounded · R → RC7</text>
    <rect x="250" y="130" width="140" height="70" fill="var(--panel2)" stroke="${sn&&sn.RC0?'#d9a531':'var(--ink)'}" stroke-width="${sn&&sn.RC0?2.5:1}"/><text x="320" y="152" text-anchor="middle" font-weight="700" font-size="11" fill="var(--ink)">U2 75176 (TX)</text><text x="320" y="170" text-anchor="middle" font-size="10" fill="var(--ink2)">D ← RC6, RE/DE ← RC0 ${sn&&sn.RC0?'(ON)':'(off)'}</text><text x="320" y="186" text-anchor="middle" font-size="10" fill="var(--ink2)">A/B → 3/8 via R30/R31 22 Ω</text>
    <line x1="120" y1="75" x2="250" y2="75" stroke="var(--ink2)"/><line x1="120" y1="165" x2="250" y2="165" stroke="var(--ink2)"/><line x1="390" y1="75" x2="470" y2="75" stroke="var(--ink2)"/><text x="476" y="79" font-size="11" fill="var(--ink)">→ U3 RC7/RX</text><line x1="390" y1="165" x2="470" y2="165" stroke="var(--ink2)"/><text x="476" y="169" font-size="11" fill="var(--ink)">← U3 RC6/TX, RC0</text>
    <rect x="650" y="40" width="110" height="120" rx="6" fill="var(--panel2)" stroke="var(--ink)"/><text x="705" y="30" text-anchor="middle" font-size="11" fill="var(--ink)">P3 PAN400 “TO AUDIO SWITCHER”</text>
    ${[['1','SCK ← RC3 (R4 100R)'],['2','SDO ← RC5 (R3 100R)'],['3','SDI → RC4 (R5 100R)'],['4','GND']].map((p,i)=>`<text x="660" y="${66+i*24}" font-size="10.5" fill="var(--ink)">${p[0]} ${p[1]}</text>`).join('')}
    <text x="650" y="186" font-size="10.5" fill="var(--ink2)">R34, R35, R33 10 kΩ pull-ups (issue 2, note 4)</text>
    <text x="20" y="250" font-size="11" fill="var(--ink)">RP5 10 kΩ network biases both pairs (A up, B down). The slave-port photo (2009) marks pin 1 at the board edge next to R5/R3/R4/R33–R35.</text>
    <text x="20" y="300" font-size="10.5" fill="var(--ink2)">Redrawn from POD9-iss2.net and the ISS1 schematic page 2; pin 1 of P3 from “POD9 Slave Port Picture.jpg”.</text></svg>`;
}
function schPower(){
  return `<svg viewBox="0 0 900 300" style="width:100%">
    <rect x="30" y="60" width="110" height="120" fill="var(--panel2)" stroke="var(--ink)"/><text x="85" y="50" text-anchor="middle" font-size="11" fill="var(--ink)">AC inlet · PWRSW (PAN256)</text><text x="40" y="90" font-size="10.5" fill="var(--ink2)">LINE, NEUTRAL, GND</text><text x="40" y="110" font-size="10.5" fill="var(--ink2)">R36/R37/R38 0 Ω straps</text><text x="40" y="130" font-size="10.5" fill="var(--ink2)">115 V or 230 V primaries</text>
    <rect x="180" y="60" width="110" height="120" fill="var(--panel2)" stroke="var(--ink)"/><text x="235" y="82" text-anchor="middle" font-weight="700" font-size="11" fill="var(--ink)">T1 229B12</text><text x="190" y="104" font-size="10.5" fill="var(--ink2)">toroid, pins 1–4 PRI</text><text x="190" y="122" font-size="10.5" fill="var(--ink2)">5–8 SEC (centre tap → GND)</text>
    <rect x="330" y="60" width="120" height="120" fill="var(--panel2)" stroke="var(--ink)"/><text x="390" y="82" text-anchor="middle" font-weight="700" font-size="11" fill="var(--ink)">D1–D4 1N4003</text><text x="340" y="104" font-size="10.5" fill="var(--ink2)">+V: C2 470 µF/50 V</text><text x="340" y="122" font-size="10.5" fill="var(--ink2)">−V: C1 470 µF/50 V</text><text x="340" y="140" font-size="10.5" fill="var(--ink2)">PWR LED: R32 2 kΩ on +V</text>
    <rect x="500" y="40" width="160" height="70" fill="var(--panel2)" stroke="var(--ink)"/><text x="580" y="62" text-anchor="middle" font-weight="700" font-size="11" fill="var(--ink)">REG1 LM317 → +5 V</text><text x="510" y="82" font-size="10.5" fill="var(--ink2)">R1 221 Ω, R2 665 Ω</text><text x="510" y="98" font-size="10.5" fill="var(--ink2)">1.25 × (1 + 665/221) = 5.01 V</text>
    <rect x="500" y="130" width="160" height="70" fill="var(--panel2)" stroke="var(--ink)"/><text x="580" y="152" text-anchor="middle" font-weight="700" font-size="11" fill="var(--ink)">REG2 LM337 → −5 V</text><text x="510" y="172" font-size="10.5" fill="var(--ink2)">R7 221 Ω, R8 665 Ω</text><text x="510" y="188" font-size="10.5" fill="var(--ink2)">−5.01 V for U5, U6, U7</text>
    <text x="690" y="70" font-size="10.5" fill="var(--ink)">+5 V: PIC, 4094, 75176s, LM1881,</text><text x="690" y="86" font-size="10.5" fill="var(--ink)">muxes (+V), OPA650 (pin 7)</text><text x="690" y="160" font-size="10.5" fill="var(--ink)">−5 V: muxes (pin 8), OPA650 (pin 4)</text>
    ${[[140,120,180,120],[290,120,330,120],[450,90,500,75],[450,150,500,165]].map(([a,b,c2,d])=>`<line x1="${a}" y1="${b}" x2="${c2}" y2="${d}" stroke="var(--ink2)" stroke-width="1.5"/>`).join('')}
    <text x="20" y="240" font-size="11" fill="var(--ink)">The ISS1 sheet labels the video rails “+12/−12”, but its own page 2 builds +5 V and V− from 221 Ω/665 Ω (±5.0 V); the ISS2 netlist names them +5V/−5V.</text>
    <text x="20" y="280" font-size="10.5" fill="var(--ink2)">Redrawn from schematic page 2, POD9-iss2.net and the ISSUE 2 assembly notes 5–6 (0 Ω voltage straps; cut the track from PWR-SW pin 1 to R36).</text></svg>`;
}
const SCH = { mcu:['PIC U3 and its pins', schMCU], video:['Video path', schVideo], panel:['LED driver and panel headers', schPanel], comm:['RS-422 and slave port', schComm], power:['Power', schPower] };
function viewSchem(m){
  window.__pod9Keys = false;
  m.innerHTML = card('Schematic set — REDRAWN from the netlist, the ISS1 drawing and the assembly notes (not the original P-CAD drawings)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sch" class="scroll"></div>`)
    + `<div class="grid2">${card('Bill of materials (POD9-iss2.net values)', `<table class="kv small"><tr><th>Ref</th><th>Part</th></tr>
      <tr><td>U3</td><td>PIC16C63 (netlist) / PIC16C63A (ISS1) — code for 16C73A / 16F73</td></tr><tr><td>U5, U6</td><td>GX434 (footprint GX414); HA4314A on the issue-2 assembly</td></tr><tr><td>U7</td><td>OPA650 (ISS1: EL2020)</td></tr><tr><td>U8</td><td>LM1881</td></tr><tr><td>U4</td><td>74HC4094</td></tr><tr><td>U1, U2</td><td>DS75176</td></tr>
      <tr><td>X1</td><td>4M9152 (4.9152 MHz), C6/C7 22 pF</td></tr><tr><td>REG1/REG2</td><td>LM317 / LM337, R1/R7 221 Ω, R2/R8 665 Ω</td></tr><tr><td>T1</td><td>229B12 toroid, D1–D4 1N4003, C1/C2 470/50</td></tr>
      <tr><td>R9–R19 odd, R21, R22</td><td>75 Ω (inputs, outputs)</td></tr><tr><td>R10–R20 even, R2–R5</td><td>100 Ω</td></tr><tr><td>R23/R24, R25, R26, R27</td><td>330 Ω, 680 Ω, 620 Ω, 680 kΩ</td></tr><tr><td>RP1–RP4 / RN1 / RP5</td><td>330 Ω SIP / 3K3 / 10 kΩ</td></tr></table>`)}
      ${card('Netlist facts used by the model', `<ul class="small">
      <li>Buttons pull low; P2 (front panel) and P4 (GPI) are wired in parallel: 1 MIX, 2 SPARE, 3–8 IN1–6.</li>
      <li>The 74HC4094's Q1…Q8 carry XPT3, XPT1, MIX, SPARE, XPT5, XPT6, XPT4, XPT2: the same order as output_reg bits 7…0.</li>
      <li>V0/V1 go to both muxes' A0/A1; V2 enables U6 (inputs 1–3), V3 enables U5 (inputs 4–6).</li>
      <li>LM1881 pin 3 (vertical sync) is the only sync signal the PIC sees (RB0).</li>
      <li>SPI: RC3 SCK and RC5 SDO are outputs (TRISC = 0x96), so POD9 is the master.</li></ul>`)}</div>`;
  const draw = ()=>{
    m.querySelector('#tabs2').innerHTML = Object.entries(SCH).map(([k,v])=>`<button class="${k===schSel?'on':''}" data-k="${k}">${v[0]}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ schSel=b.dataset.k; draw(); });
    m.querySelector('#sch').innerHTML = SCH[schSel][1](SIM.t);
  };
  SIM.on('time', draw);
}

/* ---------------- software ---------------- */
function decodeCmd(b){
  if (!(b & 0x80)) return (b & 0x40) ? `01 → SUM audio ${[0,1,2,3,4,5].filter(i=>b&(1<<i)).map(i=>i+1).join('+')||'none'}` : '00 → REQUEST STATUS';
  if (b & 0x40){ const a=b&7; return a===0?'11…000 → slave_off (manual: ON)':a===7?'11…111 → slave_on (manual: OFF)':`11…${a.toString(2).padStart(3,'0')} → not_on: video+audio ${a}, slave on`; }
  if ((b&0x7F)===0) return '1000 0000 → cancel SUM';
  const v=(b>>3)&7, a=b&7; return `10 → video ${v||'—'}, audio ${a||'—'}${a===7||v===7?' (code 7!)':''}`;
}
const LOOPXY = ROUT.map((r,i)=> i < 9 ? [110, 30 + i*44] : [410, 30 + (16-i)*44 + 22]);
function viewSoft(m){
  window.__pod9Keys = true;
  m.innerHTML = `<div class="grid2">${card('Main loop of pod9v102.asm — the running routine at the playhead', `<div id="loop"></div>`)}${card('Routine at the playhead', `<div id="rdesc"></div>`)}</div>
    <div class="grid2">${card('State machines: the switch and the A/V SLAVE bit', `<div id="fsm"></div>`)}${card('Registers live', `<div id="regs"></div>`)}</div>
    <div class="grid2">${card('RS-422 protocol (manual) and the code that handles it', `<div id="proto"></div>`)}${card('Slave-port link (POD9 master ⇄ POD2/POD10 slave)', `<div id="spi"></div>`)}</div>
    ${card('Version history in the archive', `<table class="kv small"><tr><th>File</th><th>Date</th><th>Part</th><th>Notes</th></tr>
      <tr><td class="mono">#V100/…#V100/POD9V100.ASM</td><td>4 Mar 1998|31</td><td>PIC16C73A</td><td>A/V SLAVE (“mix”, RA1) read; no SPI counter reset on a press</td></tr>
      <tr><td class="mono">WARNING</td><td>(V100 folder)</td><td></td><td>“CHANGE POD 9 TO THE SAME PROGRAM AS POD 10 SO ONLY ONE LED COMES ON AT A TIME AND ALSO DECREASE DEBOUNCING TIME.” Every later POD9 file still debounces 0xFE.</td></tr>
      <tr><td class="mono">POD9V101.ASM</td><td>4 Jun 1998|31</td><td>PIC16C73A</td><td>reset the SPI transmit counter on a press; UART flag zeroed; an F0 data byte accepted after a header</td></tr>
      <tr><td class="mono">POD9V10X.ASM, POD9V102.ASM</td><td>1998|31</td><td>PIC16C73A</td><td>experiments in #V100 / #OLD (same as each other)</td></tr>
      <tr><td class="mono">#V100/pod9v102.asm</td><td>9 Mar 2004|37</td><td>PIC16F73</td><td>V1.01 converted to the 16F73 (BANK0/BANK1 macros): the <b>F73 build</b> in this simulator</td></tr>
      <tr><td class="mono">#V102/pod9v102.asm</td><td>1 Mar 2004|37</td><td>PIC16C73A</td><td>“changed so that the spi trans counter is reset every time a button is pressed”, “FOR POD2 REMOTE WITH POD2 AND POD9 CONFIGURATION”; mix commented out, SPI_master forces slave, init 0x9F, init_loop1. <b>Emulated by default.</b></td></tr>
      <tr><td class="mono">#REMOTE - #Software Video/pod9v102.asm</td><td>—</td><td>PIC16F73</td><td>same name, “FOR POD10 REMOTE WITH POD10 AND POD21 CONFIGURATION”; logic = the F73 build</td></tr>
      <tr><td class="mono">#Custom #V101/pod9v103.asm</td><td>12 Dec 2006|39</td><td>PIC16F73</td><td>c1.01 “Creative Bubble project. Stay in slave mode at all times.”: SPI_slave instead of SPI_master</td></tr>
      <tr><td class="mono">#Custom #V101/pod9v102.asm</td><td>14 Dec 2006|39</td><td>PIC16F73</td><td>two days <i>after</i> v103, and with <span class="mono">call input</span> commented out</td></tr>
      <tr><td class="mono">#REMOTE #SOFTWARE #V500/pod2r200.asm</td><td>2012|45</td><td>PIC16F874</td><td>POD9R V500: POD2R hardware, “video only remote” (bcf video_audio,0), andlw 0x38 restored; tested at CTV Edmonton, 13 Jul 2012</td></tr></table>`)}`;
  const draw = ()=>{
    const t=SIM.t, st=stepAt(t), sn = st.pass>=0?snap(st.pass):null, E = emulate(), n = ROUT.length;
    let s = `<svg viewBox="0 0 520 410" style="width:100%"><rect x="110" y="30" width="300" height="352" rx="24" fill="none" stroke="var(--line)" stroke-width="2" stroke-dasharray="4 4"/>`;
    ROUT.forEach((r,i)=>{ const [x,y] = LOOPXY[i], on = i===st.step && powerAt(t); const busy = st.pass>=0 && E.P.cyc[st.pass*n+i] > r[1]+1;
      s += `<rect x="${x-72}" y="${y-12}" width="144" height="24" rx="7" fill="${on?'var(--accent)':busy?'color-mix(in srgb,var(--warn) 30%,var(--panel2))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}"/><text x="${x}" y="${y+4}" text-anchor="middle" font-size="10.5" fill="${on?'#fff':'var(--ink)'}" font-family="var(--mono)">${r[0]}</text>`; });
    s += `<text x="260" y="199" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">main: goto main</text><text x="260" y="217" text-anchor="middle" font-size="11" fill="var(--ink2)">${st.pass>=0&&powerAt(t)?'pass #'+st.pass.toLocaleString()+' · '+passLen(st.pass)+' Tcy':'(not running)'}</text><text x="260" y="233" text-anchor="middle" font-size="10" fill="var(--ink2)">orange = busy path</text></svg>`;
    m.querySelector('#loop').innerHTML = s;
    const r = ROUT[Math.max(0,st.step)]||ROUT[0];
    m.querySelector('#rdesc').innerHTML = `<p><b class="mono">${r[0]}</b> — ${r[2]}.</p><table class="kv small"><tr><th>Routine</th><th>idle Tcy</th><th>this pass</th></tr>${ROUT.map((q,i)=>`<tr class="${i===st.step?'hl':''}"><td class="mono">${q[0]}</td><td class="mono">${q[1]}</td><td class="mono">${st.pass>=0?E.P.cyc[st.pass*n+i]:'—'}</td></tr>`).join('')}<tr><th>Total</th><th class="mono">${idleCost()}</th><th class="mono">${st.pass>=0?passLen(st.pass):'—'}</th></tr></table>
      <p class="small muted">Idle counts: 1–2 Tcy per instruction from the listing, including each <span class="mono">call</span>/<span class="mono">return</span>. Busy counts are summed for the path taken (±3 Tcy, ${inf}).</p>`;
    const sw = sn ? sn.switch_flag : 0, stNm = !sn ? '' : !(sw&1) ? 'IDLE' : (sw&2) ? 'FORCED' : 'WAIT VS';
    const box = (x,y,nm,sub,cur)=>`<rect x="${x}" y="${y}" width="150" height="50" rx="10" fill="${cur===nm?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="1.5"/><text x="${x+75}" y="${y+21}" text-anchor="middle" font-weight="700" font-size="12.5" fill="${cur===nm?'#fff':'var(--ink)'}">${nm}</text><text x="${x+75}" y="${y+38}" text-anchor="middle" font-size="9.5" fill="${cur===nm?'#fff':'var(--ink2)'}">${sub}</text>`;
    const slv = sn ? !(sn.pre_output & 0x20) : false, sNm = slv ? 'SLAVE ON' : 'SLAVE OFF';
    m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 600 330" style="width:100%"><defs><marker id="ar9" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--ink2)"/></marker></defs>
      <text x="10" y="16" font-size="11" font-weight="700" fill="var(--ink)">switch_check (switch_flag)</text>
      ${box(10,30,'IDLE','switch_flag = 0',stNm)}${box(220,30,'WAIT VS','bit 0: poll RB0 each pass',stNm)}${box(430,30,'FORCED','bit 1: switch_count hit 0',stNm)}
      <path d="M160 48 L220 48" stroke="var(--ink2)" marker-end="url(#ar9)"/><text x="190" y="42" text-anchor="middle" font-size="9.5" fill="var(--ink)">output</text>
      <path d="M370 48 L430 48" stroke="var(--ink2)" marker-end="url(#ar9)"/><text x="400" y="42" text-anchor="middle" font-size="9.5" fill="var(--ink)">8 ticks</text>
      <path d="M260 80 C 220 120, 120 120, 90 82" fill="none" stroke="var(--ink2)" marker-end="url(#ar9)"/><text x="175" y="122" text-anchor="middle" font-size="9.5" fill="var(--ink)">RB0 low → do_switch</text>
      <path d="M500 80 C 470 150, 120 150, 70 82" fill="none" stroke="var(--ink2)" marker-end="url(#ar9)"/><text x="330" y="146" text-anchor="middle" font-size="9.5" fill="var(--ink)">next pass → do_switch anywhere in the field</text>
      <text x="10" y="186" font-size="11" font-weight="700" fill="var(--ink)">pre_output bit 5 = A/V SLAVE (active low) · ${FW[D.fw].short}</text>
      ${box(60,200,'SLAVE ON','bit 5 = 0: sends commands',sNm)}${box(380,200,'SLAVE OFF','bit 5 = 1: status only',sNm)}
      <path d="M210 215 L380 215" stroke="var(--ink2)" marker-end="url(#ar9)"/><path d="M380 238 L210 238" stroke="var(--ink2)" marker-end="url(#ar9)"/>
      <text x="10" y="272" font-size="10" fill="var(--ink)">→ OFF: F0 C0 · 01 SUM · 10 vvv (video_table bit 5 = 1) · 107 ms without link${FW[D.fw].mix?' · A/V SLAVE':''}</text>
      <text x="10" y="288" font-size="10" fill="var(--ink)">→ ON: F0 C7 · F0 C1–C6 · POD2 command with bit 6 = 0${FW[D.fw].mix?' · A/V SLAVE':''}${FW[D.fw].force?' · every SPI exchange (V102)':''}</text>
      <text x="10" y="310" font-size="10" fill="var(--ink2)">${FW[D.fw].force?'V102: SPI_master’s “bcf pre_output,5” re-asserts slave on every tick, so OFF lasts ≤ 3.4 ms':'F73 build: slave changes only on a command or the A/V SLAVE button.'}</text>
      <text x="10" y="324" font-size="10" fill="var(--ink2)">${FW[D.fw].force?'inside the PIC; the LED keeps whatever the last output shifted.':''}</text></svg>`;
    const bits = (v, names)=>`<div style="display:flex;gap:2px">${names.map((nm,i)=>{ const b=7-i, on=!((v>>b)&1); return `<div style="flex:1;text-align:center;border:1px solid var(--line);border-radius:4px;padding:2px 0;background:${on?'color-mix(in srgb,var(--bad) 22%,transparent)':'var(--panel2)'}" title="bit ${b}"><div class="mono" style="font-size:12px">${(v>>b)&1}</div><div style="font-size:9.5px" class="muted">${nm}</div></div>`; }).join('')}</div>`;
    m.querySelector('#regs').innerHTML = sn ? `<div class="small">pre_output = ${hex2(sn.pre_output)} (active low; shifted to the 4094 as output_reg)</div>${bits(sn.pre_output,['IN3','IN1','SLAVE','spare','IN5','IN6','IN4','IN2'])}
      <div class="small" style="margin-top:8px">input_reg = ${hex2(sn.input_reg)} (pins as read this pass)</div>${bits(sn.input_reg,['RA5','RA3','RA1*','RA0','RC2','RC1','RA4','RA2'])}
      <div class="small" style="margin-top:8px">spi_output = ${hex2(sn.spi_output)} → next slave-port byte</div>${bits(sn.spi_output,['stat','slave','V6','V5','V4','V3','V2','V1'])}
      <div class="small" style="margin-top:8px">audio = ${hex2(sn.audio)} (last ${stateAt('partner',t)==='pod10'?'POD10':'POD2'} status; 0xFF = none)</div>${bits(sn.audio,['b7','SUM','A6','A5','A4','A3','A2','A1'])}
      <p class="small muted">Red = bit is 0 (active). Note the scrambled order of pre_output: it is the 74HC4094's Q order, which follows the board routing. *RA1 sets bit 5 only in the F73 build.</p>` : '<div class="muted">Not running at the playhead.</div>';
    const lastPair = (()=>{ const rx = E.rxF.filter(f=>f.t0<=t); for (let i=rx.length-1;i>0;i--) if (rx[i-1].b===0xF0 && rx[i].b!==0xF0) return [rx[i-1], rx[i]]; return null; })();
    const reply = lastPair ? E.txF.filter(f=>f.t0 >= lastPair[1].t0 && f.t0 <= t).slice(0,2) : [];
    m.querySelector('#proto').innerHTML = `<table class="kv small"><tr><th>Command (after F0)</th><th>Manual</th><th>Code path</th></tr>
      <tr><td class="mono">0000 0000</td><td>Request status</td><td class="mono">status_check → send_audio (any 00xx xxxx)</td></tr>
      <tr><td class="mono">01 654321</td><td>SUM audio inputs</td><td class="mono">sum_audio: ~cmd → POD2 with bit 6 = 0 (SUM); POD9 slave off</td></tr>
      <tr><td class="mono">1000 0000</td><td>Cancel SUM</td><td class="mono">cancel_sum: POD2 gets its audio back, bit 6 = 1</td></tr>
      <tr><td class="mono">10 vvv aaa</td><td>Switch audio and video (001–110)</td><td class="mono">video_table(v) → video_reg (slave off); audio_table(a) → POD2 ×32</td></tr>
      <tr><td class="mono">11 000 aaa</td><td>Slave audio and video; C0 = on, C7 = off</td><td class="mono">a=0 slave_off · a=7 slave_on · else not_on</td></tr>
      <tr><td colspan="3">Reply: <span class="mono">1S65 4321</span> = POD9 (1 = selected, S = slave), then <span class="mono">0xxx xxxx</span> = ~audio & 0x7F (audio switcher: bit 6 SUM, 00 if none). DE9: TX+ 3, TX− 8, RX+ 7, RX− 2, GND 5.</td></tr></table>
      <h3>Last command at the playhead</h3><div class="small mono">${lastPair?`F0 ${hx(lastPair[1].b)} @ ${SIM.fmtT(lastPair[0].t0)} → ${decodeCmd(lastPair[1].b)}<br>reply: ${reply.length?reply.map(f=>hx(f.b)+' ('+bin8(f.b)+')').join(', '):'(not yet)'}${reply[0]?` → POD9 video ${[0,1,2,3,4,5].filter(i=>reply[0].b&(1<<i)).map(i=>i+1).join('+')||'—'}${reply[0].b&0x40?' slave':''}`:''}${reply[1]?` · audio ${[0,1,2,3,4,5].filter(i=>reply[1].b&(1<<i)).map(i=>i+1).join('+')||'none'}${reply[1].b&0x40?' SUM':''}`:''}`:'none yet (use the console on the Simulator tab)'}</div>`;
    const sx = E.spiX.filter(x=>x.t<=t && !x.init).slice(-8);
    m.querySelector('#spi').innerHTML = `<svg viewBox="0 0 500 150" style="width:100%"><defs><marker id="ar10" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--ink2)"/></marker></defs>
      <rect x="20" y="30" width="140" height="80" rx="8" fill="var(--panel2)" stroke="var(--line)"/><text x="90" y="58" text-anchor="middle" font-weight="700" fill="var(--ink)">POD9</text><text x="90" y="78" text-anchor="middle" font-size="10" fill="var(--ink2)">SSP master, Fosc/4</text><text x="90" y="94" text-anchor="middle" font-size="10" fill="var(--ink2)">1 byte per TMR2 tick</text>
      <rect x="340" y="30" width="140" height="80" rx="8" fill="var(--panel2)" stroke="var(--line)"/><text x="410" y="58" text-anchor="middle" font-weight="700" fill="var(--ink)">${stateAt('partner',t)==='pod10'?'POD10':'POD2'}</text><text x="410" y="78" text-anchor="middle" font-size="10" fill="var(--ink2)">SSPCON 0x25 slave</text><text x="410" y="94" text-anchor="middle" font-size="10" fill="var(--ink2)">SS pin disabled</text>
      <line x1="160" y1="50" x2="340" y2="50" stroke="var(--accent)" marker-end="url(#ar10)"/><text x="250" y="45" text-anchor="middle" font-size="10" fill="var(--ink)">P3-1 SCK, P3-2 SDO (RC3, RC5)</text>
      <line x1="340" y1="90" x2="160" y2="90" stroke="var(--accent2)" marker-end="url(#ar10)"/><text x="250" y="104" text-anchor="middle" font-size="10" fill="var(--ink)">P3-3 → RC4 SDI</text></svg>
      <ul class="small"><li>Both sides send <span class="mono">F0</span>, then a data byte, alternately. Data bit 7 = 1: status (POD9: 1 S V6…V1, active low); bit 7 = 0: command.</li>
      <li>POD9 acts on the <b>8th</b> command, then every 7th (spi_rec_count 8/7); POD2 acts on the 4th. A change is repeated in 32 data slots.</li>
      <li>POD9 reads each byte one tick late: SPI_master reads SSPBUF (last exchange) and writes the next byte in the same instruction pair.</li>
      <li>32 ticks with no F0-framed byte → <span class="mono">audio = 0xFF</span> and the SLAVE LED goes out.</li></ul>
      <div class="small mono">${sx.length?sx.map(x=>`${SIM.fmtT(x.t)}  POD9→${hx(x.mosi)}  ←${x.miso==null?'FF (pull-up)':hx(x.miso)}`).join('<br>'):'no exchanges before the playhead'}</div>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__pod9Keys = false;
  const F = [
    ['F1','The A/V SLAVE button is dead in V102','The silk prints A/V SLAVE over the first button, the netlist wires it to RA1 (IN_MIX) and the manual says “when slave mode is engaged…”. In <span class="mono">#V102/pod9v102.asm</span> the four lines that read it (<span class="mono">;btfsc PORTA,1 ;check mix</span> … <span class="mono">;bsf input_flag,7</span>) are commented out; RA1 is only tested in <span class="mono">init_loop1</span>. V100/V101 and the 16F73 conversion (<span class="mono">#V100/pod9v102.asm</span>) still read it and toggle bit 5 through <span class="mono">if_clear</span>/<span class="mono">next_output2</span>. The 2009 slave-port photo shows a <b>PIC16F73-I/SP</b> on the board, so units built then ran an F73 file, not the 16C73A “V102” ('+inf+'). Switch builds in the source table.'],
    ['F2','Manual vs code: C0 and C7 are swapped (same as POD2)','Manual: “the Slave indicator on POD9 maybe turned on by sending F0, C0 and turned off by F0, C7”. <span class="mono">slave_mode</span>: a = 0 → <span class="mono">slave_off</span> (bit 5 set = LED off), a = 7 → <span class="mono">slave_on</span>. POD2 (pod2.js F1) and the POD2R/POD9R remote (<span class="mono">slave_on_stuff</span> sends C7) agree with the code, so the manual is the odd one out. Try the scenario “Manual note test”.'],
    ['F3','V102 forces slave mode on every SPI byte','<span class="mono">SPI_master</span> starts with <span class="mono">bcf pre_output,5</span> (not in V101/F73). Whatever turns slave off — F0 C0, an RS-422 01/10 command, a POD2 command with bit 6 set — only lasts until the next tick (≤ 3.4 ms) inside the PIC; the LED keeps the last <span class="mono">output</span> and the status bytes go back to “slave”. With nothing on P3 the bit is set once every 32 ticks by the timeout and cleared on the next exchange: the SLAVE LED goes out ≈160 ms after power-up but lights again for up to ≈110 ms after every button press. pod2.js models a simplified POD9 whose SLAVE button toggles and stays; that is the F73 behaviour, not V102\'s.'],
    ['F4','The switch point is the old source\'s vertical sync','The LM1881 is fed from the <i>output</i> (R26/C11), so <span class="mono">switch_check</span> waits for the vertical interval of the input being left. Genlocked sources switch cleanly on line 4–6 (NTSC; broad pulses). A source that is not genlocked gets cut into at an arbitrary line of its own field: downstream equipment sees a vertical jump (scenario “Input 5 not genlocked”). With no sync on the bus, <span class="mono">synch_check</span> forces the switch after 8 ticks (≈27 ms) anywhere in the picture — the manual\'s “POD9 will switch randomly”.'],
    ['F5','Polling just catches the LM1881','RB0 is sampled once per pass (117 µs idle). The vertical pulse is ≈230 µs (RSET 680 kΩ, '+inf+'), so an idle loop sees it once or twice. A busy pass — an LED shift (96 Tcy) plus a UART command (≈44 Tcy) plus SPI work — is ≈300 µs and can step over the pulse; the switch then waits a whole field (16.7 ms) or, with 8 ticks, falls back to the timeout ('+inf+': a timing hazard the code allows).'],
    ['F6','Code 7 is not range-checked','<span class="mono">video_table</span> and <span class="mono">audio_table</span> are <span class="mono">addwf PCL</span> tables of six entries; index 7 lands on their closing <span class="mono">return</span> and W comes back unchanged = 0x07. F0 B8 (video 7) therefore makes <span class="mono">output_reg = 0x07</span>: LEDs IN1, IN3, IN5, A/V SLAVE and spare all lit, crosspoint on input 1. F0 87 (audio 7) sends 0x07 to the POD2: SUM of audio 4–6. Index 0 falls through the <span class="mono">nop</span> to input 1, but the callers skip 0.'],
    ['F7','“Nothing selected” means input 6','<span class="mono">do_switch</span> tests in1, in2, in3, in4, in5 and drops into <span class="mono">switch_6</span> for anything else. The spare input RA0 (GPI header only) gives output_reg 0xEF: no input LED, but the video goes to input 6. A slave-port command 00 leaves <span class="mono">spi_reg</span> = 0xFF with <span class="mono">remote_flag,0</span> still set: all LEDs out, input 6 on air.'],
    ['F8','Link timing: 8 commands one way, 4 the other; 3.4 ms, not 3.33','POD9 needs 8 commands the first time (spi_rec_count = 8, reloaded to 7), POD2 needs 4. A POD9 press reaches the POD2 ≈27 ms later; a POD2 press reaches the POD9 ≈50 ms later. TMR2 is restarted inside <span class="mono">timer_check</span> and only polled once per pass, so a tick is 4096 Tcy plus up to one pass: ≈29 idle passes = 4176 Tcy = 3.40 ms (pod2.js uses the nominal 4096 Tcy = 3.33 ms). The very first tick after reset takes 53 ms because <span class="mono">init</span> leaves the prescaler at 1:16.'],
    ['F9','A stray byte makes POD9 talk','<span class="mono">recieve_uart</span> sets <span class="mono">transmit_flag,0</span> for every byte. A byte that is not F0 and has no F0 before it returns from <span class="mono">translate_uart</span> without clearing the flag, so <span class="mono">transmit_uart</span> re-sends the old <span class="mono">transmit_reg</span>. The address is fixed (“ALWAYS F0”): a POD9 and a POD2 on the same RS-422 line both answer.'],
    ['F10','Debounce was never shortened','Every POD9 source waits 254 passes (≈30 ms) to accept a press and 254 more after release. The WARNING file next to V100 asks to “CHANGE POD 9 TO THE SAME PROGRAM AS POD 10 SO ONLY ONE LED COMES ON AT A TIME AND ALSO DECREASE DEBOUNCING TIME”; POD2 did it (0x70), POD9 never did.'],
    ['F11','Leftovers in the source','The header says “Pod 9 Audio Switcher”. <span class="mono">status_check</span> does <span class="mono">bsf spi_output,6</span>, which SPI_trns_cntrl overwrites before it is ever sent. <span class="mono">spi_special</span> and <span class="mono">input_flag,7</span> are dead in V102. <span class="mono">spi_count</span> is counted in SPI_master and never used; <span class="mono">comp_reg</span> is never used; the eight <span class="mono">rrf</span> in <span class="mono">shift_out</span> rotate through carry (9 bits), so output_reg is destroyed by every shift and rebuilt before the next. TRISC comments say “porta is an input”. RAM labels are made with <span class="mono">org 20h / res</span> in absolute mode, then <span class="mono">ORG 4H</span> places code over the same addresses — it works only because <span class="mono">res</span> just advances the program counter.'],
    ['F12','The schematic is ISS1 (1998) under an ISS3 name','<span class="mono">POD9 - #SCHEMATIC.pdf</span> = <span class="mono">#ISS3 #PCB/POD9 SCH.pdf</span> (Sep 2008 print) is “POD9.DSN ISS1PCB OCT 20,1998”: PIC16C63A, EL2020, GX434 with rails labelled ±12 although its own page 2 makes ±5.0 V (LM317/LM337, 221 Ω/665 Ω). The ISS2 netlist has OPA650 and ±5 V; the ISSUE 2 assembly drawing shows HA4314A muxes; <span class="mono">POD9-iss3.sch</span> is byte-identical to <span class="mono">POD9-iss2.sch</span>. The drawings say PIC16C63(A) — a part without an A/D, so the code\'s ADCON1 writes go to an unimplemented register; the code is assembled for the 16C73A/16F73.'],
    ['F13','Issue 2 fixed ISS1 board faults','Assembly notes: RN1 pin 1 to R6; 74HC4094 pin 8 (GND) to U1 pins 2–3 (the receiver enables); 4094 pins 15 and 16 joined — <b>OE tied high</b>, otherwise the LED outputs could float; 10 kΩ pull-ups R33–R35 added on the slave port; 0 Ω straps R36–R38 for 110/220 V and a track to cut.'],
    ['F14','Duplicates and misnamed files','<span class="mono">#V100/POD9V100.ASM</span> is a copy of POD9V101 (#OLD), while the real V100 is in <span class="mono">#V100/#V100</span>. <span class="mono">pod9v102.asm</span> exists in four different versions under one name (16C73A POD2 config; 16F73 conversion; POD10/POD21 config; Creative Bubble). The ISS2 Gerber folder holds POD9ISS3.* files; the assembly PDF is filed three times. <span class="mono">pod21c.asm</span> (a POD21 SDI switcher) sits in the POD9 V102 folder.'],
    ['F15','The rear drawing is an inside view','POD9-REAR ISS 3 is labelled “INSIDE VIEW”: its x dimensions mirror the silk. Read as x′ = 8.570 − x they land on the silk crosshairs (OUT 1 at 0.950, DE9 at 5.885, inlet at 7.415). Issue 3 (06/06/13) rotated the BNC D-flats 180° in all 8 places.'],
    ['F16','POD9R is a re-flashed POD2R','The 2012 test report: “This version of software is to use the POD2R hardware to replace old through hole version of POD9R. POD9R Should only be connected to POD9.” In <span class="mono">pod2r200.asm</span> V500 the only changes are <span class="mono">bcf video_audio,0 ;video only remote ;Ali-Add</span>, the restored <span class="mono">andlw 0x38</span> (plo had zeroed the video field on 1 Feb 2010) and <span class="mono">slave_video_output</span>.'],
    ['F17','Artwork '+SIM.year(2026)+': front/rear panels now from '+SIM.src(ART_SRC,'POD9-FRONT&REAR-SILK (CURVE).cdr')+' (Jun.19/14)','The plates draw all seven front button holes, the six BNC D-holes, OUT 1/2, the DE9 CONTROL and the AC inlet; the buttons, LEDs, BNCs and the CONTROL overlay sit on them. The drill crosses that F15 used as landmarks (OUT 1, IN 2, IN 5, IN 6) are construction marks, drawn faint here, not ink. The art writes “A\\V SLAVE” with a backslash. The second green bar of the front plate starts right after the PODS logo. Earlier art: '+SIM.src('#POD #SERIES/POD9 - #Master/POD9 - #Engineering/POD9R - #SILK/POD9SILK.CDR','POD9SILK.CDR')+' and '+SIM.src('#POD #SERIES/POD9 - #Master/POD9 - #Engineering/POD9R - #SILK/POD9-REAR iss2 silk.cdr','POD9-REAR iss2 silk.cdr')+' (Aug 2007|40).'],
  ];
  m.innerHTML = card('Findings — what the POD9 and its firmware are up to', `<ol class="small" style="padding-left:18px">${F.map(f=>`<li style="margin-bottom:8px"><b>${f[0]} · ${f[1]}.</b> ${f[2]}</li>`).join('')}</ol>`)
    + card('Sources and what was inferred', `<ul class="small">
      <li>Firmware: <span class="mono">#V102/pod9v102.asm</span> emulated routine by routine; the F73 build differs where <span class="mono">#V100/pod9v102.asm</span> differs (mix button, no forced slave, init 0xBF, F0 accepted as data after a header). Audio switcher: POD2 <span class="mono">pod2v200.asm</span> (as in pod2.js) / old POD10 <span class="mono">pd10v103.asm</span> (same SPI code).</li>
      <li>Hardware: POD9-iss2.net (every pin and net), ISS1 schematic, ISSUE 2 assembly drawing, slave-port photo. Mux enable polarity is ${inf} from the code; LED colour red ${inf} (same panel as POD2).</li>
      <li>Video: NTSC timing (manual specs at 3.58 MHz); the LM1881 pulse width and delay are ${inf} (datasheet typical, not in the archive). Sources, pictures and their timing offsets are yours to set.</li>
      <li>Contact bounce, press length, power-up timer, POD2 debounce (from pod2.js) and the POD9R audio field are ${inf}.</li>
      <li>The test report (POD9R V500, CTV Edmonton, 13 Jul 2012) is a scanned form; only its note was used.</li></ul>`);
}

/* ---------------- register ---------------- */
loadScenario('press3');
SIM.register({
  footnotes:[{text:"The front legend reads \"A\\V SLAVE\" with a backslash instead of a slash.", src:"#POD #SERIES/POD9 - #Master/POD9 - #ARTWORK #DA #2016/POD9-FRONT&REAR-SILK (CURVE).cdr"},
  {text:"The crosses at OUT 1, IN 2, IN 5 and IN 6 on the rear sheet are drill centre marks, not printed ink. <span class=\"tag-inf\">inferred</span>", src:"#POD #SERIES/POD9 - #Master/POD9 - #ARTWORK #DA #2016/POD9-FRONT&REAR-SILK (CURVE).cdr"},
  {text:"The rear BNC holes are D-shaped (one flat side), drawn as an arc plus a straight edge.", src:"#POD #SERIES/POD9 - #Master/POD9 - #ARTWORK #DA #2016/POD9-FRONT&REAR-SILK (CURVE).cdr"},
  {text:"POD9SILK.CDR (Aug 2007) is the earlier silk, filed under the POD9R folder.", src:"#POD #SERIES/POD9 - #Master/POD9 - #Engineering/POD9R - #SILK/POD9SILK.CDR"},
  {text:"A separate rear-only issue 2 silk survives: POD9-REAR iss2 silk.cdr (Aug 2007).", src:"#POD #SERIES/POD9 - #Master/POD9 - #Engineering/POD9R - #SILK/POD9-REAR iss2 silk.cdr"}],
  id:'pod9', name:'POD9 · 6×1 analog video switcher with VI switching and AFV ('+Y(1998)+')', duration:1,
  product:'POD9', year:1998, family:'POD series',
  folder:'#POD #SERIES/POD9 - #Master',
  summary:'Half-rack 6×1 composite video selector: two 4:1 video multiplexers feed an OPA650 with two 75 Ω outputs, and an LM1881 on the output tells the PIC when the vertical interval comes. The PIC (assembly, V1.02) polls the buttons, answers RS-422 at 9600 baud and is the SPI master of a POD2 or POD10 audio switcher for audio-follow-video.',
  highlights:['Firmware emulated pass by pass (≈117 µs) with its own registers','Video modelled down to fields, lines and the vertical-interval switch point','Interactive front and rear panel on the real silkscreen','RS-422 console, POD9R remote and a POD2/POD10 on the slave port','11-step operator tutorial with live goals','V102 never reads the A/V SLAVE button; C0/C7 swapped against the manual'],
  depth:'Full model',
  stepUnits:[
    {label:'1 main-loop pass (117 µs idle)', period:()=>idleCost()*C.TCY},
    {label:'1 instruction cycle (814 ns)', period:()=>C.TCY},
    {label:'1 video line', period:()=>S().H, phase:()=>C.REF0},
    {label:'1 video field', period:()=>FIELD(), phase:()=>C.REF0},
    {label:'1 RS-422 bit (104 µs)', period:()=>1/C.BAUD},
    {label:'1 RS-422 byte (1.04 ms)', period:()=>C.BYTE},
    {label:'1 timer tick / SPI byte (≈3.4 ms)', period:()=>4176*C.TCY},
    {label:'debounce (254 passes)', period:()=>254*idleCost()*C.TCY},
    {label:'10 ms', period:()=>0.01},
  ],
  zooms:[[1,'1 s (whole second)'],[0.2,'200 ms'],[1001/30000,'1 frame (33.4 ms)'],[1001/60000,'1 field (16.7 ms)'],[0.005,'5 ms'],[0.001,'1 ms (≈16 lines)'],[0.00025,'250 µs (VS pulse, 2 passes)'],[0.000064,'64 µs (one line)'],[0.000015,'15 µs (sync + burst)']],
  defaultZoom:0,
  init(){ EMU_KEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the POD9', render:viewTutorial},
    {id:'second', label:'One second, field by field', render:viewAnatomy},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
