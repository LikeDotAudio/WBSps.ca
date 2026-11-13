/* =====================================================================
   POD30 — 4×1 HD/SD-SDI video switcher, reference-timed, RS-485 + audio-follow slave port
   (Ward-Beck Systems, firmware v1.00 18 Dec 2003|36 → V020000 26 Aug 2013|46)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, under #POD #SERIES/POD30 - #Master/ unless noted):
   - POD30 - #Engineering/Software/V020000/30v100.asm, init.asm, autodetect.asm, video_sw.asm
       main, init_loop, input, debounce, router, next_output1/2, output_led, switch_check/do_switch,
       debounce_rel, recieve_uart, reset_uart, translate_uart (status_check, send_audio, sum_audio,
       cancel_sum, slave_mode, not_on, slave_on, slave_off, spi_uart_setup), transmit_uart, timer_check,
       SPI_trns_cntrl, SPI_master, SPI_rcv_ctrl, readgs1524, readgs1535, autodetect1, refresh,
       video_vertical_synch_detect, video_horizontal_synch_detect, video_table, audio_table, INIT.
       Every one of these is emulated below, branch for branch, with its own variable names.
   - …/Software/v100/* (the 2003|36 lock logic: old autodetect1 + refresh, emulated as "v100"),
     …/v101/30v101.asm (PIC16F747 port), …/30r100/30r100.asm (remote), …/Custom/August 25, 2008/
   - POD30 - #Engineering/PCB/pod30iss2.net, POD30iss2.bom (U25 PIC16F874 TQFP-44, X2 4.9152 MHz,
     U1/U4/U5/U6 GS1524, U2 GS1535, U3 GS1528, U7 GS4982, U11/U12 75176, every net name in the schematics)
   - POD30 - #Engineering/MANUAL/Pod30man.doc (2005), Pod30serial.doc (2011), POD30 - Functional Diagram.cdr
     (converted with Inkscape), POD30 - #TESTREPORT/POD30-V020000-26AUG13.pdf, POD30-ASI PASS-24JUN10.pdf
   - POD30 - UpgradeTo3G-SDI #RD #RD67/ProjectRequirements.txt, Hardware/OldDesignGennum/*.pdf (datasheets)
   - POD30 - #ARTWORK #DA #2016/POD30-FRONT&REAR-SILK (CURVE).pdf → assets/pod30-*.png (silk_extract.py),
     Pics/POD30 Front.jpg, POD30 Rear.jpg (panel and ink colours, button lamp colour)
   - POD30 - #Mechanical #DA #2016/POD30-FRONT ISS 1 (PANEL).pdf, POD30-REAR ISS 1 (PANEL).pdf,
     DE-9 ISS 2 (ADAPTOR PLATE).pdf, POD30R-PLATE ISS 1.pdf, POD30-SPACER ISS 1.pdf
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const Y = y => SIM.year(y);
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';

/* ---------------- constants (crystal, firmware, datasheets) ---------------- */
const C = {
  FOSC: 4.9152e6,                 // X2, POD30iss2.bom
  TCY: 4/4.9152e6,                // 0.8138 µs per instruction
  PASS_TCY: 183,                  // idle main-loop pass, counted by hand from 30v100.asm — INFERRED (±10 %)
  T2_TCY: 4096,                   // timer_check: T2CON = 0xFC → 1:1 prescale, 1:16 postscale, PR2 = 0xFF
  T2_BOOT_TCY: 65536,             // INIT writes T2CON = 0xFF → 1:16 prescale for the very first period
  BYTE_T: 10/9600, BIT_T: 1/9600, // SPBRG = 7, BRGH = 0: 4.9152 MHz / 512 = 9600 baud exactly
  SPI_T: 32/4.9152e6,             // SSPCON = 0x20: SPI master, Fosc/4 → 8 bits in 6.5 µs
  FIELD: 1001/60000,              // NTSC reference (manual: "Standards NTSC")
  H: 1001/60000/262.5,
  HSW: 4.7e-6,                    // H sync width (RS-170A)
  OE_OFF: 3.45,                   // ODD/EVEN edge, lines after field start ("vsynch starts halfway between line 4 and 5") — INFERRED placement
  VLOOP_TCY: 8,                   // one pass round wait_rising_edge / wait_falling_edge
  HPOLL_TCY: 4,
  ACQ_ASYNC: 0.0075,              // GS1535 tALOCK 5–10 ms (datasheet) — mid value INFERRED
  ACQ_SYNC: 0.29e-6,              // GS1535 tSLOCK (CLF = C21 47 nF)
  PWRT: 0.072, OST: 1024*4/4.9152e6,  // PIC power-up timer (config bits not archived) — INFERRED
};
C.PASS = C.PASS_TCY*C.TCY;
const RATE = { none:0, sd:270, asi:270, hd:1485, hd720:1485 };
const SRC_NAME = { none:'(no cable)', sd:'SD-SDI 525i59.94', hd:'HD-SDI 1080i59.94', hd720:'HD-SDI 720p59.94', asi:'DVB-ASI 270 Mb/s' };
const SRC_SHORT = { none:'—', sd:'SD 525i', hd:'HD 1080i', hd720:'HD 720p', asi:'ASI' };
const SRC_CYCLE = ['none','sd','hd','hd720','asi'];

/* The main loop, in the order of 30v100.asm main:. Cycle counts are estimates — INFERRED. */
const STEPS = [
  ['init_loop',      22, 'Re-writes TRISA–E and ADCON1 on every pass'],
  ['input',          16, 'PB1–PB4 on RA4, RA5, RE0, RE1 → input_reg (active low)'],
  ['debounce',       14, '254 identical passes in a row = one press'],
  ['readgs1524',     12, 'CD/MUTE1–4 (RD4–RD7): selected EQ forced on, the other three muted'],
  ['readgs1535',     10, 'lock1 ← LD (RD1) and SD/~HD (RD0) of the GS1535'],
  ['autodetect1',    14, 'Qualify lock: 100 × 10 passes (V020000) / SD-HD stable 100 passes (v100)'],
  ['refresh',        14, 'SDI, HD, ERROR tallies and ~DDO_MUTE (RC2)'],
  ['router',          8, 'Pick the new input: button, slave port or RS-485'],
  ['output_led',      6, 'Button lamps RA0–RA3; ask for a timed switch (video_synch.0)'],
  ['switch_check',    5, 'do_switch: SEL0/SEL1 → GS1535 4:1 mux'],
  ['debounce_rel',    6, 'Wait for 254 released passes'],
  ['recieve_uart',    5, 'RCREG → recieved_reg'],
  ['reset_uart',      5, 'Re-programs the USART after every byte'],
  ['translate_uart',  8, 'Decode F0 + command'],
  ['transmit_uart',  12, 'RC0 drives the 75176 transmitter; TXREG ← transmit_reg'],
  ['SPI_trns_cntrl',  5, 'Choose the next slave-port byte (once per Timer2 tick)'],
  ['SPI_master',      7, 'SSPBUF exchange with the POD2/POD10'],
  ['SPI_rcv_ctrl',    5, 'Decode what the audio switcher sent'],
  ['timer_check',     5, 'TMR2IF every 3.33 ms: SPI tick, slave timeout, switch timeout'],
  ['video_synch?',    4, 'If a switch is pending: wait for ODD/EVEN, count H, switch'],
];
const STEP_OFF = (()=>{ let a=0; return STEPS.map(s=>{ const r=a; a+=s[1]; return r; }); })();

/* ---------------- device configuration (not time-based) ---------------- */
const D = {
  fw: 'V020000',            // 'V020000' (2013|46) or 'v100' (2003|36) lock logic
  mod: true,                // 2013|46 leakage hardware mod fitted (test report)
  src0: ['sd','sd','hd','none'],
  ref0: true, slave0: false, power0: true,
  refPh: 0.0031,            // reference phase at t = 0 (arbitrary)
  start: null,              // firmware state at t = 0 (pre-rolled)
  events: [],
  scopeOut: 2,
  lastAction: null,
  console: [],
};

/* ================================================================
   FIRMWARE EMULATOR — one call per main-loop pass
   ================================================================ */
const VARS = ['lock','lock1','bcount1_1','bcount_1','plock1','unstable','output_reg','pre_output','bcount','bounce',
  'recieved_reg','spi_transmit','spi_output','spi_recieved','input_reg','spi_reg','audio','video_reg','transmit_reg',
  'spi_count','spi_output_temp','temp','spi_tran_count','spi_rec_count','audio_count','switch_count','switch_out',
  'input_flag','output_flag','rel_flag','remote_flag','switch_flag','transmit_flag','uart_flag','which_flag',
  'video_switch','vsynch','temp0','sync_count','sync_count1','video_synch'];
const VI = {}; VARS.forEach((k,i)=>VI[k]=i);
const dec = x => (x-1)&0xFF;
const VIDEO_TABLE = i => i===7 ? 7 : [0xBF,0xBF,0xFE,0x7F,0xFD,0xF7,0xFB][i];   // index 0 runs the nop into entry 1; 7 hits "return" (W unchanged)
const AUDIO_TABLE = i => i===7 ? 7 : [0xFE,0xFE,0xFD,0xFB,0xF7,0xEF,0xDF][i];
const selOf = p => !(p&0x40)?0 : !(p&1)?1 : !(p&0x80)?2 : !(p&2)?3 : -1;   // pre_output → input index (switch_1..4 order)
const inName = p => { const k=selOf(p); return k<0? 'none (bits 3/2 = inputs 5/6)' : 'input '+(k+1); };
const hex = b => b.toString(16).toUpperCase().padStart(2,'0');
const bin = b => b.toString(2).padStart(8,'0');

function blankState(){
  return { t:0, on:false, bootAt:null, v:Object.fromEntries(VARS.map(k=>[k,0])),
    o:{ pwr:0, led1:0, led2:0, led3:0, led4:0, sdi:0, hd:0, err:0, ddo:0, txen:0, sel:0, cdm:15, ld:0, sdhd:1 },
    t2next:Infinity, bfAt:Infinity, sspIn:0xFF, txBusy:0, rxq:[], oerr:false,
    src:D.src0.slice(), ref:D.ref0, slave:D.slave0,
    sl:{ sel:0, sum:0, on:false, hdr:false, ph:0, cmdLeft:0, cmd:0, last30:0xFF },
    rcl:{ key:'none', ldAt:Infinity, lostAt:-1, rate:270, wasLocked:false } };
}
function cloneState(s){ return JSON.parse(JSON.stringify(s, (k,v)=> v===Infinity? '__INF' : v), (k,v)=> v==='__INF'? Infinity : v); }
function rebase(s, T){
  const sh = x => (x===Infinity||x===null)? x : x-T;
  s.t=sh(s.t); s.bootAt=sh(s.bootAt); s.t2next=sh(s.t2next); s.bfAt=sh(s.bfAt); s.txBusy=sh(s.txBusy);
  s.rcl.ldAt=sh(s.rcl.ldAt); s.rcl.lostAt=sh(s.rcl.lostAt); return s;
}
function hash01(n){ let x = (n*2654435761)>>>0; x^=x>>>15; x=(x*2246822519)>>>0; x^=x>>>13; return (x>>>0)/4294967296; }

function emulate(start, events, cfg, tEnd){
  const S = cloneState(start); const v = S.v;
  const R = { passes:[], snaps:[], sig:{}, notes:[], uart:[], spi:[], ticks:[], switches:[], presses:[], waits:[], S:null };
  const ev = events.slice().sort((a,b)=>a.t-b.t); let ei = 0;
  const ph = cfg.refPh;
  const rec = (n,t,val)=>{ const a = R.sig[n] || (R.sig[n]={t:[],v:[]}); if (a.v.length && a.v[a.v.length-1]===val) return; if (a.t.length && t<a.t[a.t.length-1]) t=a.t[a.t.length-1]; a.t.push(t); a.v.push(val); };
  const out = (n,val,t)=>{ S.o[n]=val; rec(n,t,val); };
  const note = (t,fn,msg,kind)=>{ if (R.notes.length<4000) R.notes.push({t,fn,msg,kind:kind||''}); };
  /* world timelines */
  const refTL = [{t:-1e9,on:S.ref}]; ev.filter(e=>e.type==='ref').forEach(e=>refTL.push({t:e.t,on:e.on}));
  const refOn = t=>{ let on=refTL[0].on; for (const r of refTL){ if (r.t<=t) on=r.on; else break; } return on; };
  const nextRefChange = t=>{ for (const r of refTL) if (r.t>t) return r; return null; };
  const btnTL = [[],[],[],[]]; ev.filter(e=>e.type==='btn').forEach(e=>{ btnTL[e.n].push([e.t, e.t+(e.dur||0.15)]); R.presses.push({n:e.n,t0:e.t,t1:e.t+(e.dur||0.15)}); });
  const btn = (k,t)=> btnTL[k].some(([a,b])=>t>=a && t<b);
  const rxList = []; ev.filter(e=>e.type==='uart').forEach(e=>e.bytes.forEach((b,i)=>{ rxList.push({t0:e.t+i*C.BYTE_T, t:e.t+(i+1)*C.BYTE_T, b}); }));
  rxList.forEach(x=>R.uart.push({dir:'rx', t0:x.t0, t1:x.t, b:x.b}));
  let ri = 0;
  const oddEven = t=>{ if (!refOn(t)) return 1; const k=Math.floor((t-ph-C.OE_OFF*C.H)/C.FIELD); return ((k%2)+2)%2; };
  const hLow = t=>{ if (!refOn(t)) return false; const x=((t-ph)%C.H+C.H)%C.H; return x < C.HSW; };
  function findOE(t, target, tMax){            // first time ≥ t with odd_even === target
    let tt = t;
    for (let i=0;i<200 && tt<=tMax;i++){
      if (oddEven(tt)===target) return tt;
      const k=Math.floor((tt-ph-C.OE_OFF*C.H)/C.FIELD)+1; let te = ph + C.OE_OFF*C.H + k*C.FIELD;
      const rc = nextRefChange(tt); if (rc && rc.t < te) te = rc.t;
      tt = te + 1e-9;
    }
    return Infinity;
  }
  function findH(t, wantLow, tMax){
    let tt=t;
    for (let i=0;i<400 && tt<=tMax;i++){
      if (!refOn(tt)){ const rc=nextRefChange(tt); if (!rc) return Infinity; tt=rc.t+1e-9; continue; }
      if (hLow(tt)===wantLow) return tt;
      const x=((tt-ph)%C.H+C.H)%C.H; let te = wantLow ? tt + (C.H - x) : tt + (C.HSW - x);
      const rc=nextRefChange(tt); if (rc && rc.t<te){ tt=rc.t+1e-9; continue; }
      tt = te + 1e-9;
    }
    return Infinity;
  }
  /* GS1535 reclocker model: lock detect follows the selected, un-muted EQ */
  function rcl(t){
    const k=S.o.sel, s=S.src[k]; const present = S.on && s!=='none' && !((S.o.cdm>>k)&1);
    const leak = S.on && s==='none' && !cfg.mod && S.src.some((x,i)=>i!==k && x!=='none');
    const key = present? k+':'+s : leak? 'leak' : 'none';
    if (key===S.rcl.key) return;
    const was = S.rcl.key;
    if (present){
      const rate=RATE[s]; const sync = S.rcl.wasLocked && S.rcl.rate===rate && (t-S.rcl.lostAt)<0.001;
      S.rcl.ldAt = t + (sync? C.ACQ_SYNC : C.ACQ_ASYNC); S.rcl.rate = rate;
      note(t,'GS1535', `data from input ${k+1} (${SRC_SHORT[s]}) reaches the reclocker: ${sync?'synchronous re-lock (tSLOCK ≈ 0.29 µs)':'frequency acquisition (tALOCK 5–10 ms)'}`,'hw');
    } else {
      if (was!=='none' && was!=='leak') S.rcl.wasLocked = t>=S.rcl.ldAt;
      S.rcl.lostAt=t; S.rcl.ldAt=Infinity;
      if (leak) note(t,'GS1535',`input ${k+1} is empty: the reclocker hunts on crosstalk from the other inputs (no leakage mod)`,'hw');
    }
    S.rcl.key=key;
  }
  const LD = t=> S.rcl.key==='leak' ? hash01(Math.floor(t/0.00037))<0.5 : (S.rcl.key!=='none' && t>=S.rcl.ldAt);
  const SDHD = ()=> S.rcl.rate===270 ? 1 : 0;
  /* the audio switcher on the slave port (POD2 / POD10) — its side is INFERRED, built to match SPI_rcv_ctrl */
  function slaveXfer(b, t){
    const sl=S.sl; if (!S.slave){ return 0xFF; }
    if (sl.hdr){ sl.hdr=false;
      if (!(b&0x80)){ if (b&0x40){ const k=[0,1,2,3,4,5].find(i=>!((b>>i)&1)); if (k!==undefined && k<6){ if (sl.sel!==k || sl.sum) note(t,'POD10','slave port command → audio input '+(k+1),'slave'); sl.sel=k; sl.sum=0; } }
        else { sl.sum = (~b)&0x3F; note(t,'POD10','slave port command → SUM of audio inputs '+[0,1,2,3,4,5].filter(i=>(sl.sum>>i)&1).map(i=>i+1).join('+'),'slave'); } }
      else { sl.last30=b; const on=!(b&0x40); if (on!==sl.on) note(t,'POD10',`POD30 status byte 0x${hex(b)}: slave ${on?'on':'off'} — the POD10 follows it (inferred)`,'slave'); sl.on=on; } }
    else if (b===0xF0) sl.hdr=true;
    sl.ph ^= 1; if (sl.ph) return 0xF0;
    if (sl.cmdLeft>0){ sl.cmdLeft--; return sl.cmd; }
    const m = sl.sum || (1<<sl.sel);
    return 0x80 | (sl.sum?0:0x40) | ((~m)&0x3F);
  }
  function applyEvent(e){
    const t=e.t;
    if (e.type==='src'){ S.src[e.k]=e.val; rec('src'+e.k,t,e.val); note(t,'rear',`INPUT ${e.k+1}: ${SRC_NAME[e.val]}`,'world'); rcl(t); }
    else if (e.type==='ref'){ S.ref=e.on; rec('ref',t,e.on?1:0); note(t,'rear',`REF IN: ${e.on?'NTSC black burst connected':'unplugged'}`,'world'); }
    else if (e.type==='slave'){ S.slave=e.on; rec('slave',t,e.on?1:0); note(t,'rear',e.on?'POD10 audio switcher connected to the slave port':'slave port disconnected','world'); }
    else if (e.type==='abtn' && S.slave){ const sl=S.sl; sl.sel=e.n; sl.sum=0; if (sl.on){ sl.cmdLeft=32; sl.cmd=(~(1<<e.n))&0x3F; } note(t,'POD10',`audio input ${e.n+1} pressed${sl.on?' — slave on, so it sends a command (bit 7 = 0) 32 times':''}`,'slave'); }
    else if (e.type==='aslave' && S.slave){ const sl=S.sl; sl.on=!sl.on; sl.cmdLeft=32; sl.cmd=(sl.on?0:0x40)|((~(1<<sl.sel))&0x3F); note(t,'POD10',`SLAVE ${sl.on?'on':'off'}: command byte 0x${hex(sl.cmd)} (bit 6 = ${sl.on?0:1})`,'slave'); }
    else if (e.type==='power'){
      if (e.on && !S.on){ S.on=true; S.bootAt=t+C.PWRT+C.OST; out('pwr',1,t); ['led1','led2','led3','led4','sdi','hd','err','txen'].forEach(n=>out(n,0,t));
        out('ddo',0,t); out('cdm',0,t); out('sel',0,t); rcl(t); note(t,'power','Power on. While the PIC is held in reset, R68/R70 pull SEL0/SEL1 low (input 1), R58 pulls ~DDO_MUTE low (outputs muted) and the GS1524 CD/MUTE pins float (all EQs live)','boot'); }
      else if (!e.on && S.on){ S.on=false; S.bootAt=null; ['pwr','led1','led2','led3','led4','sdi','hd','err','ddo','txen'].forEach(n=>out(n,0,t)); rcl(t); note(t,'power','Power off','boot'); }
    }
  }
  /* ---------- the firmware ---------- */
  function output_led(t){
    if (!(v.output_flag&1)) return 0;
    v.switch_flag|=1; if (!(v.video_switch&1)) v.video_synch|=1; v.video_switch&=~1;
    v.output_flag&=~1; v.pre_output=v.output_reg;
    out('led4', (v.output_reg&2)?0:1, t); out('led3', (v.output_reg&0x80)?0:1, t); out('led2', (v.output_reg&1)?0:1, t); out('led1', (v.output_reg&0x40)?0:1, t);
    v.bcount=0xFE;
    note(t,'output_led',`output_reg = 0x${hex(v.output_reg)} (${bin(v.output_reg)}b) → lamps RA0–RA3; video_synch.0 = 1, switch_flag.0 = 1 (switch wanted)`,'fw');
    if (!R.curSw) R.curSw = { tReq:t, from:S.o.sel };
    return 40;
  }
  function do_switch(t, why){
    v.switch_flag=0; v.switch_count=8;
    const sw = R.curSw || { tReq:t, from:S.o.sel }; R.curSw=null; sw.t=t; sw.why=why;
    if ((v.pre_output&0xDF)===v.switch_out){ sw.to=S.o.sel; sw.same=true; note(t,'do_switch',`pre_output & 0xDF = switch_out (0x${hex(v.switch_out)}): already on that input, nothing to do`,'fw'); R.switches.push(sw); return; }
    v.switch_out = v.pre_output&0xDF; v.unstable|=1;
    const k = selOf(v.pre_output);
    if (k>=0){ out('sel',k,t); note(t,'do_switch',`INPUT${k+1} macro: SEL0 = ${k&1}, SEL1 = ${k>>1} → GS1535 4:1 mux; unstable.0 = 1`,'switch'); rcl(t); }
    else note(t,'do_switch','switch_5/switch_6: input 5 or 6 does not exist on POD30 — the mux stays where it is; unstable.0 = 1','bug');
    sw.to = k<0? S.o.sel : k; R.switches.push(sw);
  }
  function spi_uart_setup(w){ v.spi_output_temp = w&0x7F; v.spi_output=0xF0; v.remote_flag|=0x0C; }
  function status_check(t){
    if (v.which_flag&1) return send_audio(t);
    v.which_flag|=1; let tr=0xFF; const p=v.pre_output;
    if (!(p&0x40)) tr&=~1; if (!(p&1)) tr&=~2; if (!(p&0x80)) tr&=~4; if (!(p&2)) tr&=~8; if (!(p&8)) tr&=~16; if (!(p&4)) tr&=~32; if (!(p&0x20)) tr&=~64;
    v.spi_output|=0x40; v.transmit_reg = ((~tr)&0xFF)|0x80;
    note(t,'status_check',`transmit_reg = 0x${hex(v.transmit_reg)} built from pre_output 0x${hex(p)} (the input selected *before* this command takes effect)`,'uart');
  }
  function send_audio(t){ v.transmit_flag|=1; v.which_flag&=~1; v.transmit_reg=(~v.audio)&0x7F; note(t,'send_audio',`second reply byte = ~audio & 0x7F = 0x${hex(v.transmit_reg)}${v.audio===0xFF?' (no audio switcher: 00)':''}`,'uart'); }
  function translate_uart(t){
    if (v.which_flag&1) { send_audio(t); return 10; }
    if (!(v.transmit_flag&1)) return 0;
    const r=v.recieved_reg;
    if (r===0xF0){ v.uart_flag|=0x80; v.transmit_flag&=~1; note(t,'translate_uart','0xF0 address byte → uart_flag.7 = 1, wait for the command','uart'); return 6; }
    if (!(v.uart_flag&0x80)) return 4;
    v.uart_flag&=~0x80;
    if (!(r&0x80)){
      if (r&0x40){ // sum_audio
        v.recieved_reg=(~r)&0xFF; spi_uart_setup(v.recieved_reg); v.spi_output_temp&=~0x40; v.remote_flag&=~1; v.input_flag=0; v.remote_flag|=2; v.video_reg=v.pre_output|0x20;
        note(t,'sum_audio',`SUM AUDIO 0x${hex(r)} → slave port gets 0x${hex(v.spi_output_temp)} (bit 6 = 0 = sum); video_reg = pre_output | 0x20 (slave off)`,'uart'); status_check(t); return 40; }
      note(t,'translate_uart',`0x${hex(r)} = READ STATUS`,'uart'); status_check(t); return 30;
    }
    if (r&0x40){ // slave_mode
      const lo=r&7;
      if (lo===0){ v.video_reg=v.pre_output|0x20; v.remote_flag=2; v.input_flag=0; note(t,'slave_off',`0x${hex(r)} → video_reg = pre_output | 0x20: slave OFF (the manual says C0 turns it ON)`,'bug'); status_check(t); return 30; }
      if (lo===7){ v.video_reg=v.pre_output&~0x20; v.remote_flag=2; v.input_flag=0; spi_uart_setup(v.audio); v.spi_output_temp|=0x40; note(t,'slave_on',`0x${hex(r)} → video_reg = pre_output & ~0x20: slave ON (the manual says C7 turns it OFF)`,'bug'); status_check(t); return 30; }
      v.video_reg = VIDEO_TABLE(lo)&~0x20; v.input_flag=0; v.remote_flag=2; spi_uart_setup(AUDIO_TABLE(lo)); v.spi_output_temp|=0x40;
      if (!(v.pre_output&0x20)){ spi_uart_setup(v.audio); v.spi_output_temp|=0x40; v.video_reg=v.pre_output&~0x20; note(t,'not_on',`0x${hex(r)} SLAVE AUDIO+VIDEO, but slave is already on → the ";test" block puts back the current input: command ignored`,'bug'); }
      else note(t,'not_on',`0x${hex(r)} SLAVE AUDIO+VIDEO input ${lo} → video_reg = 0x${hex(v.video_reg)} (slave on), audio_table → slave port`,'uart');
      status_check(t); return 45;
    }
    if ((r&0x7F)===0){ spi_uart_setup(v.audio); v.spi_output_temp|=0x40; note(t,'cancel_sum','0x80 → cancel SUM: resend the current audio selection','uart'); status_check(t); return 30; }
    if (r&0x38){ v.temp=(r&0x38)>>3; v.video_reg=VIDEO_TABLE(v.temp); v.remote_flag|=2;
      note(t,'translate_uart',`0x${hex(r)} = CHANGE VIDEO INPUT, YYY = ${v.temp} → video_table → video_reg = 0x${hex(v.video_reg)} (${inName(v.video_reg)}${v.temp>4?' — invalid on POD30':''}); remote_flag.1 = 1`, v.temp>4?'bug':'uart'); }
    if ((r&7)===0){ status_check(t); return 40; }
    spi_uart_setup(AUDIO_TABLE(r&7)); note(t,'audio_only',`audio part ${r&7} → audio_table → slave port`,'uart'); status_check(t); return 50;
  }
  function firmwareInit(t){
    for (const k of VARS) v[k]=0;                       // power-up RAM modelled as 0x00 — INFERRED
    out('led1',1,t); out('led2',1,t); out('led3',1,t); out('led4',1,t); out('sdi',1,t); out('hd',1,t); out('err',1,t);   // PORTA/PORTB = 0xFF
    out('ddo',1,t); out('txen',0,t); out('cdm',15,t); out('sel',3,t); rcl(t);   // PORTC = 0xF4, PORTD = 0xFF
    v.bcount1_1 = cfg.fw==='v100'? 5 : 10; v.bcount_1=100;
    v.bcount=0xFE; out('txen',1,t);
    S.t2next = t + C.T2_BOOT_TCY*C.TCY; S.txBusy=t;
    v.audio=0xFF; v.spi_output=0xFF; v.spi_output_temp=0xFF;
    S.sspIn = slaveXfer(0xFF,t); S.bfAt = t + C.SPI_T;
    v.audio_count=0x20; v.spi_tran_count=0x20; v.switch_count=8; v.spi_rec_count=8;
    v.output_flag=1; v.rel_flag=1; v.output_reg=0xBF; v.pre_output=0xBF;
    output_led(t + 120*C.TCY);
    v.vsynch=50; v.video_synch=0; v.video_switch=0;
    out('sel',0,t+130*C.TCY); rcl(t+130*C.TCY);       // init_matrix: INPUT 1
    note(t,'INIT','RESET → init: PORTA/B = 0xFF (every LED lit for one pass), PORTD = 0xFF (all EQs muted, mux on input 4), T2CON = 0xFF (first Timer2 period 53 ms), output_reg = 0xBF (input 1, slave off), then video_synch cleared — so the first switch waits for the Timer2 fallback','boot');
  }
  /* ---------- one pass of main: ---------- */
  function pass(t0){
    let tc = t0; const T = n=>{ tc += n*C.TCY; };
    const P = { t0, w:null };
    rec('ld', t0, LD(t0)?1:0);
    T(2+STEPS[0][1]);
    // input
    v.input_reg=0xFF; if (btn(3,tc)) v.input_reg&=~2; if (btn(2,tc)) v.input_reg&=~0x80; if (btn(1,tc)) v.input_reg&=~1; if (btn(0,tc)) v.input_reg&=~0x40; T(STEPS[1][1]);
    // debounce
    if (!(v.rel_flag&1)){
      let reset=false; if (v.input_reg===0xFF) reset=true; else { if (v.bcount===0xFE) v.bounce=v.input_reg; if (v.input_reg!==v.bounce) reset=true; }
      if (reset) v.bcount=0xFF; v.bcount=dec(v.bcount);
      if (v.bcount===0){ v.bcount=0xFE; v.rel_flag|=1; v.input_flag|=3; v.spi_tran_count=0x20; v.remote_flag=0;
        note(tc,'debounce',`input_reg = 0x${hex(v.input_reg)} held for 254 passes → rel_flag.0, input_flag = 0x03, spi_tran_count = 0x20`,'fw'); }
    }
    T(STEPS[2][1]);
    // readgs1524
    { const k=selOf(v.pre_output); if (k>=0){ if (cfg.fw==='v100') v.lock=0; const m = 15 & ~(1<<k); if (m!==S.o.cdm){ out('cdm',m,tc); note(tc,'readgs1524',`CD/MUTE${k+1} low (EQ U${[1,4,5,6][k]} forced on), the other three high (muted)`,'fw'); rcl(tc); } } }
    T(STEPS[3][1]);
    // readgs1535
    { const ld=LD(tc); v.lock1 = (ld?1:0) | (SDHD()?2:0); out('sdhd',SDHD(),tc); } T(STEPS[4][1]);
    // autodetect1
    { const before=v.lock&1;
      if (cfg.fw==='v100'){
        if (!(v.lock1&1)){ v.bcount1_1=5; v.bcount_1=100; }
        else { v.temp=v.lock1&2;
          if (v.temp!==v.plock1){ v.bcount1_1=dec(v.bcount1_1); if (v.bcount1_1===0){ v.bcount1_1=5; v.bcount_1=100; v.unstable|=1; v.plock1=v.temp; note(tc,'autodetect1','SD/HD changed for 5 passes → unstable.0 = 1, plock1 = '+v.temp,'fw'); } }
          else { v.bcount_1=dec(v.bcount_1); if (v.bcount_1===0){ v.bcount1_1=5; v.bcount_1=100; if (v.unstable&1) note(tc,'autodetect1','100 locked passes with a steady SD/HD → unstable.0 = 0','lock'); v.unstable&=~1; v.lock&=~2; } } }
      } else {
        if (v.unstable&1){ v.lock=0; v.lock1=0; v.unstable=0; note(tc,'autodetect1','unstable.0 was set by do_switch → clrf lock, clrf lock1, clrf unstable','fw'); }
        if (!(v.lock1&1)){ v.bcount_1=100; v.bcount1_1=10; if (v.lock&1) note(tc,'autodetect1','LD low on this pass → no_lock1: clrf lock','lock'); v.lock=0; }
        else { v.bcount_1=dec(v.bcount_1);
          if (v.bcount_1===0){ v.bcount_1=100; v.bcount1_1=dec(v.bcount1_1);
            if (v.bcount1_1===0){ v.bcount_1=100; v.bcount1_1=10; if (!(v.lock&1)) note(tc,'autodetect1','LD high for 100 × 10 = 1000 passes in a row → lock = lock1','lock'); v.lock=v.lock1; } } }
      }
      if ((v.lock&1)!==before) rec('lockv',tc,v.lock&1);
    }
    rec('unst',tc,v.unstable&1); T(STEPS[5][1]);
    // refresh
    if (cfg.fw==='v100'){
      let nl = !(v.lock1&1);
      if (!nl){ out('err', v.unstable&1, tc); if (v.unstable&1) nl=true; }
      if (nl){ out('hd',0,tc); out('err',1,tc); out('ddo',0,tc); out('sdi',0,tc); }
      else { out('sdi',1,tc); out('err',0,tc); out('hd',(v.lock1&2)?0:1,tc); out('ddo',1,tc); }
      rec('lockv',tc,(!nl)?1:0);
    } else {
      if (v.lock&1){ out('ddo',1,tc); out('err',0,tc); out('sdi',1,tc); out('hd',(v.lock&2)?0:1,tc); }
      else { out('ddo',0,tc); out('err',1,tc); out('sdi',0,tc); out('hd',0,tc); }
    }
    T(STEPS[6][1]);
    // router
    if (v.input_flag&1){ v.input_flag&=~1; const before=v.input_reg;
        if (!(v.pre_output&0x20)){ if (v.input_reg&0x20) v.input_reg&=~0x20; else v.input_reg=v.pre_output|0x20; }
        else { if (!(v.input_reg&0x20)) v.input_reg=v.pre_output&~0x20; }
        v.output_reg=v.input_reg; v.pre_output=v.input_reg; v.output_flag|=1;
        note(tc,'router',`input_flag.0 → ${(v.pre_output&0x20)?'next_output2':'next_output1'}: input_reg 0x${hex(before)} → output_reg = pre_output = 0x${hex(v.output_reg)} (${inName(v.output_reg)})`,'fw'); T(20); }
    else if (v.remote_flag&1){ v.remote_flag&=~1; v.output_reg=v.spi_reg; v.pre_output=v.spi_reg; v.output_flag|=1; note(tc,'router',`next_route0: slave port asked for 0x${hex(v.spi_reg)} (${inName(v.spi_reg)}, slave ${(v.spi_reg&0x20)?'off':'on'})`,'slave'); T(10); }
    else if (v.remote_flag&2){ v.output_reg=v.video_reg; v.output_flag|=1; v.remote_flag&=~2; note(tc,'router',`next_route1: RS-485 asked for video_reg 0x${hex(v.video_reg)} (${inName(v.video_reg)})`,'uart'); T(10); }
    T(STEPS[7][1]);
    T(output_led(tc)); T(STEPS[8][1]);
    // switch_check
    if ((v.switch_flag&1) && (v.switch_flag&2)) { do_switch(tc,'timer'); T(25); }
    T(STEPS[9][1]);
    // debounce_rel
    if (v.rel_flag&1){ if (v.input_reg!==0xFF) v.bcount=0xFF; v.bcount=dec(v.bcount); if (v.bcount===0){ v.bcount=0xFE; v.rel_flag&=~1; } }
    T(STEPS[10][1]);
    // recieve_uart
    if (S.rxq.length){ if (S.oerr){ S.oerr=false; note(tc,'recieve_uart','OERR: a byte was lost while the loop was busy → CREN off/on','bug'); }
      v.recieved_reg=S.rxq.shift(); v.transmit_flag|=1; note(tc,'recieve_uart',`RCREG = 0x${hex(v.recieved_reg)} → recieved_reg; transmit_flag.0 = 1`,'uart'); T(6); }
    T(STEPS[11][1]);
    T(STEPS[12][1]);                                  // reset_uart
    T(translate_uart(tc)); T(STEPS[13][1]);
    // transmit_uart
    if (tc>=S.txBusy){ if (S.o.txen) out('txen',0,tc);
      if (v.transmit_flag&1){ v.transmit_flag&=~1; out('txen',1,tc); S.txBusy=tc+C.BYTE_T; R.uart.push({dir:'tx',t0:tc,t1:tc+C.BYTE_T,b:v.transmit_reg}); note(tc,'transmit_uart',`RC0 = 1 (75176 U12 on), TXREG = 0x${hex(v.transmit_reg)}`,'uart'); } }
    T(STEPS[14][1]);
    // SPI_trns_cntrl
    if (v.spi_transmit&1){
      if (v.remote_flag&8){ v.spi_output=0xF0; v.remote_flag&=~8; }
      else if (v.remote_flag&4){ v.spi_output=v.spi_output_temp; v.remote_flag&=~4; v.spi_tran_count=dec(v.spi_tran_count); if (v.spi_tran_count) v.remote_flag|=0x0C; else v.spi_tran_count=0x20; }
      else if (!(v.spi_transmit&2)){ v.spi_output=0xF0; v.spi_transmit|=2; }
      else { v.spi_transmit&=~2; v.spi_output=0xFF;
        if (v.input_flag&2){ v.spi_tran_count=dec(v.spi_tran_count); if (!v.spi_tran_count){ v.input_flag&=~2; v.spi_tran_count=0x20; } if (!(v.pre_output&0x20)) v.spi_output&=~0x80; }
        const p=v.pre_output; if (!(p&0x40)) v.spi_output&=~1; if (!(p&1)) v.spi_output&=~2; if (!(p&0x80)) v.spi_output&=~4; if (!(p&2)) v.spi_output&=~8; if (!(p&8)) v.spi_output&=~16; if (!(p&4)) v.spi_output&=~32; if (!(p&0x20)) v.spi_output&=~64;
        if (!(v.spi_output&0x80)) v.spi_output|=0x40; }
      T(12);
    }
    T(STEPS[15][1]);
    // SPI_master
    if (tc>=S.bfAt && (v.spi_transmit&1)){ v.spi_recieved=S.sspIn; S.sspIn=slaveXfer(v.spi_output,tc); S.bfAt=tc+C.SPI_T; R.spi.push({t:tc, o:v.spi_output, i:S.sspIn}); v.spi_count=dec(v.spi_count); if (!v.spi_count) v.spi_count=7; T(6); }
    T(STEPS[16][1]);
    // SPI_rcv_ctrl
    if (v.spi_transmit&1){ v.spi_transmit&=~1; const r=v.spi_recieved;
      const reset_rec = ()=>{ v.spi_rec_count=7; v.spi_transmit&=~4; };
      if (r===0xF0 && !(v.spi_transmit&4)) v.spi_transmit|=4;
      else if (!(v.spi_transmit&4)) reset_rec();
      else { v.spi_transmit&=~4;
        if (r&0x80){ if (v.audio===0xFF && S.slave) note(tc,'SPI_rcv_ctrl',`audio switcher answers: audio = 0x${hex(r&0x7F)}, audio_count reloaded`,'slave'); v.audio_count=0x20; v.audio=r&0x7F; }
        else { v.audio_count=0x20; v.spi_rec_count=dec(v.spi_rec_count); if (v.spi_rec_count===0){ v.remote_flag|=1; reset_rec(); }
          if ((v.remote_flag&1) && r!==0){ v.spi_reg=0xFF;
            const map=[0x40,0x01,0x80,0x02,0x08,0x04]; const k=[0,1,2,3,4,5].find(i=>!((r>>i)&1)); if (k!==undefined) v.spi_reg&=~map[k];
            if (!(r&0x40)) v.spi_reg&=~0x20;
            note(tc,'SPI_rcv_ctrl',`7th command byte 0x${hex(r)} from the audio switcher → spi_reg = 0x${hex(v.spi_reg)}, remote_flag.0 = 1`,'slave'); }
          else if (v.remote_flag&1 && r===0) v.spi_reg=0xFF; } }
      T(8);
    }
    T(STEPS[17][1]);
    // timer_check
    if (tc>=S.t2next){ S.t2next = tc + C.T2_TCY*C.TCY; R.ticks.push(tc); v.spi_transmit|=1;
      v.audio_count=dec(v.audio_count);
      if (v.audio_count===0){ v.audio_count=0x20; v.audio=0xFF;
        if (!(v.pre_output&0x20)){ v.pre_output|=0x20; v.output_reg=v.pre_output; v.output_flag|=1; note(tc,'timer_check','32 ticks with no reply from an audio switcher → audio = 0xFF, pre_output.5 = 1 (slave mode dropped)','slave'); T(output_led(tc)); } }
      if (v.switch_flag&1){ v.switch_count=dec(v.switch_count); if (v.switch_count===0){ v.switch_flag|=2; v.switch_count=8; note(tc,'timer_check','synch_check: 8 Timer2 ticks with a switch pending → switch_flag.1 = 1 (switch without waiting for sync)','fw'); } }
      T(14);
    }
    T(STEPS[18][1]);
    T(STEPS[19][1]);
    rec('vs',tc,v.video_synch&1);
    // the timed switch
    if (v.video_synch&1){
      const w = { t0:tc };
      // video_vertical_synch_detect
      if (!(v.video_synch&4)){
        v.video_switch&=~1; v.video_synch|=8;
        const lvl = oddEven(tc), target = lvl? 0 : 1;
        const a = v.sync_count1||256, b = v.sync_count||256; const mT = a + 256*(b-1);
        const te = findOE(tc, target, tc + mT*C.VLOOP_TCY*C.TCY + 1e-9);
        const n = te===Infinity? Infinity : Math.max(1, Math.ceil((te-tc)/(C.VLOOP_TCY*C.TCY)));
        if (n <= mT){
          const zeros = n>=a ? 1+Math.floor((n-a)/256) : 0; v.sync_count1 = ((a-n)%256+256)%256; v.sync_count = (b-zeros)&0xFF;
          tc += n*C.VLOOP_TCY*C.TCY; w.tEdge=tc; w.edge = target? 'rising':'falling';
          v.video_synch&=~0x10; v.video_synch|=2; v.temp0 = target? 6 : 5;
          note(tc,'video_vertical_synch_detect',`ODD/EVEN ${w.edge} edge after ${SIM.fmtDur(tc-w.t0)} of polling → temp0 = ${v.temp0} (line_count_${target?'RISE':'FALL'})`,'switch');
        } else {
          tc += mT*C.VLOOP_TCY*C.TCY; w.timeout=true; w.iter=mT; v.sync_count1=0; v.sync_count=10; v.switch_flag|=2;
          v.video_synch&=~(0x10|4|8|2|1);
          note(tc,'no_vertical_synch',`no ODD/EVEN edge in ${mT.toLocaleString()} polls (${SIM.fmtDur(mT*C.VLOOP_TCY*C.TCY)}) → switch now, untimed; sync_count = 10`,'bug');
        }
      }
      // video_horizontal_synch_detect
      if (v.video_synch&2){
        v.video_synch|=4; const lim = tEnd+1;
        if (!(v.video_synch&0x10)){ const th=findH(tc,false,lim); tc = th===Infinity? lim : th + C.HPOLL_TCY*C.TCY; v.video_synch|=0x10; }
        let cnt=v.temp0;
        while (cnt>0 && tc<lim){ const a1=findH(tc,true,lim); if (a1===Infinity){ tc=lim; w.hang=true; break; } const b1=findH(a1,false,lim); if (b1===Infinity){ tc=lim; w.hang=true; break; } tc=b1+C.HPOLL_TCY*C.TCY; cnt--; }
        v.temp0=cnt;
        if (!w.hang){ v.switch_flag|=2; v.video_synch&=~(4|8|2|1); v.vsynch=0; v.sync_count=10; w.tH=tc;
          const off=((tc-ph)%C.FIELD+C.FIELD)%C.FIELD; w.line=off/C.H+1; w.hdLine=off/(C.FIELD/562.5)+1;
          note(tc,'video_horizontal_synch_detect',`counted the H pulses → switch_flag.1 = 1 at ${w.line.toFixed(1)} lines into the field (≈ 1080i line ${w.hdLine.toFixed(1)} if the HD sources are frame-aligned to the reference ${'(inferred)'})`,'switch'); }
        else note(tc,'video_horizontal_synch_detect','reference lost while counting lines: this loop has no timeout — the PIC sits here (clrwdt inside) until the reference returns','bug');
      }
      if ((v.switch_flag&1)&&(v.switch_flag&2)){ do_switch(tc, w.timeout?'timeout':'sync'); const sw=R.switches[R.switches.length-1]; sw.wait=w; }
      w.t1=tc; P.w=w; R.waits.push(w);
    }
    P.t1 = Math.max(tc, t0+C.PASS*0.5);
    R.passes.push(P); R.snaps.push(Uint8Array.from(VARS.map(k=>v[k])));
    return P.t1;
  }
  /* ---------- run ---------- */
  ['pwr','led1','led2','led3','led4','sdi','hd','err','ddo','txen','sel','cdm','ld','sdhd'].forEach(n=>rec(n,S.t,S.o[n]));
  S.src.forEach((s,k)=>rec('src'+k,S.t,s)); rec('ref',S.t,S.ref?1:0); rec('slave',S.t,S.slave?1:0); rec('lockv',S.t,v.lock&1);
  let t = S.t;
  while (t < tEnd){
    while (ei<ev.length && ev[ei].t<=t) applyEvent(ev[ei++]);
    const nextEv = ei<ev.length? ev[ei].t : Infinity;
    if (!S.on){ t = Math.min(nextEv, tEnd); if (t>=tEnd) break; continue; }
    if (S.bootAt!==null){ if (S.bootAt > t){ t=Math.min(S.bootAt, nextEv, tEnd); continue; } firmwareInit(S.bootAt); t=S.bootAt+150*C.TCY; S.bootAt=null; continue; }
    while (ri<rxList.length && rxList[ri].t<=t){ if (S.rxq.length>=2){ S.oerr=true; R.uart.find(u=>u.dir==='rx'&&u.t1===rxList[ri].t).lost=true; } else S.rxq.push(rxList[ri].b); ri++; }
    t = pass(t);
  }
  S.t = t; R.S = S; R.tEnd=tEnd; return R;
}

/* ---------------- run / cache ---------------- */
let RES = null, RES_KEY = '';
function cfgOf(){ return { fw:D.fw, mod:D.mod, refPh:D.refPh }; }
function preroll(){
  const s = blankState(); s.src=D.src0.slice(); s.ref=D.ref0; s.slave=D.slave0;
  const r = emulate(s, [{t:0,type:'power',on:true}], cfgOf(), 0.75);
  const st = r.S, T = st.t; rebase(st, T); st.t=0;
  D.refPh = ((D.refPh - T)%C.FIELD + C.FIELD)%C.FIELD;   // keep the reference phase continuous across the rebase
  return st;
}
function run(){
  if (!D.start) D.start = preroll();
  const key = JSON.stringify([D.fw,D.mod,D.events,D.refPh,D._gen||0]);
  if (key===RES_KEY && RES) return RES;
  RES = emulate(D.start, D.events, cfgOf(), 1.0); RES_KEY = key; return RES;
}
function sigAt(name, t){ const R=run(); const a=R.sig[name]; if (!a) return undefined; let lo=0, hi=a.t.length-1, r=0; while (lo<=hi){ const m=(lo+hi)>>1; if (a.t[m]<=t){ r=m; lo=m+1; } else hi=m-1; } return a.v[r]; }
function passAt(t){ const P=run().passes; let lo=0, hi=P.length-1, r=-1; while (lo<=hi){ const m=(lo+hi)>>1; if (P[m].t0<=t){ r=m; lo=m+1; } else hi=m-1; } return r; }
function varsAt(t){ const R=run(); const i=passAt(t); const o={}; if (i<0) return null; const s=R.snaps[i]; VARS.forEach((k,j)=>o[k]=s[j]); o._i=i; return o; }
function stepAt(t){
  const R=run(); const i=passAt(t); if (i<0) return { i:-1, step:-1 };
  const P=R.passes[i]; if (t>P.t1) return { i, step:-1, idle:true };
  if (P.w && t>=P.w.t0) return { i, step:19, wait:true, P };
  const k = (t-P.t0)/C.TCY; let s=0; for (let j=0;j<STEPS.length;j++) if (k>=STEP_OFF[j]) s=j; return { i, step:s, P };
}
function srcAt(k,t){ return sigAt('src'+k,t)||'none'; }
function outAt(t){
  const on=sigAt('pwr',t), ddo=sigAt('ddo',t), sel=sigAt('sel',t), cdm=sigAt('cdm',t);
  const s=srcAt(sel,t); const eqMuted = (cdm>>sel)&1;
  if (!on) return { state:'off', sel, s };
  if (!ddo) return { state:'muted', sel, s };
  if (s==='none') return { state: (!D.mod && [0,1,2,3].some(k=>k!==sel && srcAt(k,t)!=='none'))? 'leak':'none', sel, s };
  if (eqMuted) return { state:'frozen', sel, s };
  if (!sigAt('ld',t)) return { state:'unlocked', sel, s };
  return { state:'live', sel, s };
}

/* ================================================================
   ACTIONS (all land at the playhead; the firmware trace is gathered from the emulation)
   ================================================================ */
function at(){
  let t = SIM.t;
  if (t > 0.72){   // roll the second forward: the device state at the playhead becomes the new t = 0
    const r = emulate(D.start, D.events, cfgOf(), t); const st=r.S; const T=st.t;
    rebase(st, T); st.t=0; D.start=st; D.events=[]; D.refPh=((D.refPh - T)%C.FIELD + C.FIELD)%C.FIELD; D._gen=(D._gen||0)+1;
    D.src0=st.src.slice(); D.ref0=st.ref; D.slave0=st.slave;
    t = 0.02; RES_KEY='';
  }
  D.events = D.events.filter(e=>e.t <= t);  // a new action rewrites the future
  return t;
}
function act(name, ev, seekFn){
  const t = at(); (Array.isArray(ev)?ev:[ev]).forEach(e=>{ e.t = t + (e.dt||0); delete e.dt; D.events.push(e); });
  RES_KEY=''; const R=run();
  const notes = R.notes.filter(n=>n.t>=t-1e-9 && n.t<=t+0.3).slice(0,40);
  D.lastAction = { name, t, notes };
  let ts = seekFn? seekFn(R,t) : null; SIM.seek(ts!=null? Math.min(0.999, ts) : t+0.001);
}
const A = {
  press(k){ act(`Press button ${k+1}`, {type:'btn', n:k, dur:0.12}, (R,t)=>{ const sw=R.switches.find(s=>s.tReq>=t); return sw? sw.t+0.0003 : t+0.06; }); },
  power(){ const on = !sigAt('pwr',SIM.t); act(on?'Power on':'Power off', {type:'power', on}, (R,t)=> on? t+0.2 : t+0.001); },
  cycleSrc(k){ const cur=srcAt(k,SIM.t); const nx=SRC_CYCLE[(SRC_CYCLE.indexOf(cur)+1)%SRC_CYCLE.length]; act(`INPUT ${k+1} → ${SRC_SHORT[nx]}`, {type:'src', k, val:nx}, (R,t)=>t+0.012); },
  setSrc(k,val){ act(`INPUT ${k+1} → ${SRC_SHORT[val]}`, {type:'src', k, val}, (R,t)=>t+0.012); },
  ref(){ const on=!sigAt('ref',SIM.t); act(on?'Plug in REF IN':'Unplug REF IN', {type:'ref', on}); },
  slave(){ const on=!sigAt('slave',SIM.t); act(on?'Connect a POD10 to the slave port':'Disconnect the slave port', {type:'slave', on}, (R,t)=>t+0.02); },
  aBtn(k){ act(`POD10: audio input ${k+1}`, {type:'abtn', n:k}, (R,t)=>{ const sw=R.switches.find(s=>s.tReq>=t); return sw? sw.t+0.0003 : t+0.06; }); },
  aSlave(){ act('POD10: SLAVE button', {type:'aslave'}, (R,t)=>t+0.06); },
  uart(bytes, label){ act(label||('RS-485: '+bytes.map(hex).join(' ')), {type:'uart', bytes}, (R,t)=>{ const tx=R.uart.filter(u=>u.dir==='tx'&&u.t0>=t); return tx.length>=2? tx[1].t1+0.0002 : t+0.01; });
    D.console.unshift({t:SIM.t, bytes}); D.console=D.console.slice(0,12); },
  setFw(fw){ D.fw=fw; D.start=null; D.events=[]; RES_KEY=''; SIM.seek(0.02); },
  setMod(m){ D.mod=m; D.start=null; D.events=[]; RES_KEY=''; SIM.seek(0.02); },
  reset(){ Object.assign(D, { fw:'V020000', mod:true, src0:['sd','sd','hd','none'], ref0:true, slave0:false, refPh:0.0031, start:null, events:[], lastAction:null, console:[], _gen:0 }); RES_KEY=''; SIM.seek(0); },
};

/* ================================================================
   DRAWING: front and rear panel on the real silkscreen
   ================================================================ */
/* POD30 - #ARTWORK #DA #2016/POD30-FRONT&REAR-SILK (CURVE).pdf (artwork dated Jun.25/14), cut by
   tools/silk_extract.py at 200 dpi between the crop marks: 1714 × 321 px = 8.57" × 1.606", exactly the
   panel size on POD30-FRONT/REAR ISS 1 (PANEL).pdf. Front: green + white separations; rear: white.
   Hole positions (px = inches × 200) from the panel drawings: front buttons (C) .340" square at x 3.929/4.679/
   5.429/6.179", y .595"; LEDs (B) .130" at x 1.496/4.554/5.054/5.554", y 1.090"; rocker cut-out (A) .505 × .770"
   at x .900"; screws (D). Rear: 7 BNC D-holes at x 1.305 … 5.805" (.750" pitch); DE-9 (detail B) upright at
   x .698"; IEC inlet (detail C) 1.080 × 1.256" at x 7.415". Colours from Pics/POD30 Front.jpg / Rear.jpg. */
const ASSET = 'siumulation-plugins/assets/';
const BTN_X = [786, 936, 1086, 1236];
function frontSVG(t, opts){
  opts = opts||{};
  const g = n=> sigAt(n,t);
  const on = g('pwr');
  const led = (x,y,lit,col,id)=>`<circle cx="${x}" cy="${y}" r="15" fill="#08090a"/><circle cx="${x}" cy="${y}" r="11" fill="${lit?col:'#262b26'}" ${lit?'filter="url(#p30glow)"':''}/><circle cx="${x-3}" cy="${y-4}" r="3.5" fill="#fff" opacity="${lit?.55:.12}"/>`;
  const btn = k=>{ const x=BTN_X[k], lit=g('led'+(k+1)), pressed = run().presses.some(p=>p.n===k && t>=p.t0 && t<p.t1);
    return `<g class="p30btn" data-b="${k}" style="cursor:pointer"><rect x="${x-46}" y="${73}" width="92" height="92" rx="8" fill="transparent"/>
      <rect x="${x-36}" y="${83+(pressed?3:0)}" width="72" height="72" rx="7" fill="#0b0c0d" stroke="#2c2f31" stroke-width="3"/>
      <rect x="${x-29}" y="${90+(pressed?3:0)}" width="58" height="58" rx="5" fill="#141618"/>
      <rect x="${x-13}" y="${112+(pressed?3:0)}" width="26" height="15" rx="2" fill="${lit?'#ff5d78':'#c9ccd0'}" ${lit?'filter="url(#p30glow)"':'opacity=".55"'}/>
      <title>Button ${k+1} (KSD illuminated push-button PB${k+1}) — click to select input ${k+1}</title></g>`; };
  const screw = (x,y)=>`<circle cx="${x}" cy="${y}" r="13" fill="#8d9196" stroke="#5b5f63"/><path d="M${x-7} ${y}h14M${x} ${y-7}v14" stroke="#4a4d50" stroke-width="2.5"/>`;
  return `<svg viewBox="0 0 1714 321" role="img" aria-label="POD30 front panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <defs><filter id="p30glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1714" height="321" rx="10" fill="#151719"/>
    <image href="${ASSET}pod30-front-green.png" width="1714" height="321"/>
    <image href="${ASSET}pod30-front-white.png" width="1714" height="321"/>
    <g class="p30pwr" style="cursor:pointer"><rect x="124" y="38" width="112" height="164" rx="8" fill="#0a0b0c" stroke="#30333a" stroke-width="3"/>
      <rect x="140" y="${on?52:96}" width="80" height="90" rx="10" fill="#1c1f22" stroke="#3b3f43" stroke-width="2"/><rect x="146" y="${on?58:128}" width="68" height="8" rx="3" fill="#2d3135"/>
      <title>POWER rocker (PWRSW, PAN256) — click to switch ${on?'off':'on'}</title></g>
    ${led(299,218,on,'#d9ff6a')}
    ${screw(50,161)}${screw(1664,161)}${screw(861,119)}${screw(1161,119)}
    ${[0,1,2,3].map(btn).join('')}
    ${led(910,218,g('sdi'),'#5dff5a')}${led(1010,218,g('hd'),'#5dff5a')}${led(1110,218,g('err'),'#ff4a3a')}
    ${opts.hot||''}
  </svg>`;
}
function rearSVG(t){
  const bnc = (x,id,lab,extra)=>`<g class="p30jack" data-j="${id}" style="cursor:pointer">
      <circle cx="${x}" cy="197" r="58" fill="#b9bcc0" stroke="#7d8186" stroke-width="3"/><circle cx="${x}" cy="197" r="44" fill="#d8dadd" stroke="#8d9196"/>
      <circle cx="${x}" cy="197" r="30" fill="#9aa0a6"/><circle cx="${x}" cy="197" r="19" fill="#2a2c2e"/><circle cx="${x}" cy="197" r="7" fill="#d9b54a"/>
      ${extra||''}<title>${lab}</title></g>`;
  let s = `<svg viewBox="0 0 1714 321" role="img" aria-label="POD30 rear panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <rect width="1714" height="321" rx="10" fill="#151719"/>`;
  for (let k=0;k<4;k++){ const sv=srcAt(k,t); const sel = sigAt('sel',t)===k;
    const tag = sv==='none'? '' : `<rect x="${[261,411,561,710][k]-50}" y="268" width="100" height="34" rx="6" fill="${sv==='asi'?'#8a5bd6':RATE[sv]>300?'#2f7fd1':'#2a9a58'}"/><text x="${[261,411,561,710][k]}" y="292" text-anchor="middle" font-size="22" font-weight="700" fill="#fff">${SRC_SHORT[sv]}</text>`;
    s += bnc([261,411,561,710][k], 'in'+k, `INPUT ${k+1}: ${SRC_NAME[sv]} — click to change the source`, tag + (sel?`<circle cx="${[261,411,561,710][k]+48}" cy="150" r="10" fill="var(--led-a)"/>`:'')); }
  const o=outAt(t);
  [860,1010].forEach((x,i)=>{ const live=o.state==='live'; s += bnc(x,'out'+(i+1),`OUTPUT ${i+1}${i===0?' (GS1528 inverted output: SDI fine, ASI not)':''} — click to show it on the scope`,
      `<rect x="${x-50}" y="268" width="100" height="34" rx="6" fill="${live?'#2a9a58':'#5a5f64'}"/><text x="${x}" y="292" text-anchor="middle" font-size="22" font-weight="700" fill="#fff">${live?'IN '+(o.sel+1)+(i===0?' ¬':''):o.state==='off'?'off':'muted'}</text>${D.scopeOut===i+1?`<circle cx="${x}" cy="197" r="62" fill="none" stroke="var(--accent2)" stroke-width="5" stroke-dasharray="10 8"/>`:''}`); });
  const ref = sigAt('ref',t);
  s += bnc(1160,'ref',`REF IN: ${ref?'NTSC black burst connected':'nothing connected'} — click to plug/unplug`, `<rect x="1110" y="268" width="100" height="34" rx="6" fill="${ref?'#2a9a58':'#5a5f64'}"/><text x="1160" y="292" text-anchor="middle" font-size="22" font-weight="700" fill="#fff">${ref?'NTSC':'none'}</text>`);
  // DE-9 CONTROL, mounted upright (detail B) with its hex standoffs on the DE-9 adaptor plate holes
  s += `<g class="p30de9" style="cursor:pointer"><rect x="96" y="56" width="86" height="148" rx="10" fill="#c3c6ca" stroke="#80858a" stroke-width="3"/>
      <path d="M112 70 L166 76 L166 184 L112 190 Z" fill="#1b1d1f" stroke="#444" stroke-width="2"/>
      ${[0,1,2,3,4].map(i=>`<circle cx="126" cy="${84+i*24}" r="5" fill="#9a9ea3"/>`).join('')}${[0,1,2,3].map(i=>`<circle cx="152" cy="${96+i*24}" r="5" fill="#9a9ea3"/>`).join('')}
      ${[31,228].map(y=>`<polygon points="${[0,1,2,3,4,5].map(a=>`${139+16*Math.cos(a*Math.PI/3)},${y+16*Math.sin(a*Math.PI/3)}`).join(' ')}" fill="#b0b4b8" stroke="#6d7176"/><circle cx="139" cy="${y}" r="6" fill="#3a3c3e"/>`).join('')}
      <title>CONTROL (DE-9 female, RS-485 9600 8N1) — click to open the serial console</title></g>`;
  // IEC inlet (detail C) and screws
  s += `<rect x="1375" y="16" width="216" height="250" rx="12" fill="#0b0c0d" stroke="#2c2f31" stroke-width="3"/><rect x="1410" y="54" width="146" height="150" rx="14" fill="#16181a" stroke="#333" stroke-width="2"/>
      ${[[1483,92],[1450,160],[1516,160]].map(([x,y])=>`<rect x="${x-14}" y="${y-8}" width="28" height="16" rx="2" fill="#c9ccd0"/>`).join('')}
      <circle cx="50" cy="161" r="13" fill="#8d9196"/><circle cx="1664" cy="161" r="13" fill="#8d9196"/><circle cx="1664" cy="50" r="12" fill="#25282b" stroke="#444"/>
    <image href="${ASSET}pod30-rear-white.png" width="1714" height="321"/>
  </svg>`;
  return s;
}
function bindPanels(root){
  root.querySelectorAll('.p30btn').forEach(g=>g.addEventListener('click',()=>A.press(+g.dataset.b)));
  root.querySelectorAll('.p30pwr').forEach(g=>g.addEventListener('click',()=>A.power()));
  root.querySelectorAll('.p30jack').forEach(g=>g.addEventListener('click',()=>{ const j=g.dataset.j;
    if (j==='ref') A.ref(); else if (j.startsWith('in')) A.cycleSrc(+j.slice(2)); else { D.scopeOut=+j.slice(3); SIM.refresh(); } }));
  root.querySelectorAll('.p30de9').forEach(g=>g.addEventListener('click',()=>{ const c=document.querySelector('#p30con'); if (c){ c.scrollIntoView({behavior:'smooth',block:'center'}); c.style.outline='3px solid var(--accent2)'; setTimeout(()=>c.style.outline='',1200); } }));
}
document.addEventListener('keydown', e=>{
  if (!window.__pod30Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  if ('1234'.includes(e.key)){ A.press(+e.key-1); e.preventDefault(); }
});

/* downstream monitor fed from OUTPUT 2 */
function monitorSVG(t){
  const o=outAt(t), W=320, Hh=180;
  let body='';
  const pal=[['#c0c0c0','#c0c000','#00c0c0','#00c000','#c000c0','#c00000','#0000c0'],['#3050c0','#c08030','#c0c0c0','#30c060','#c03060','#6040c0','#202020']];
  if (o.state==='live'){ const s=o.s, p = pal[o.sel%2];
    if (s==='asi') body = `<rect width="${W}" height="${Hh}" fill="#111"/><text x="${W/2}" y="${Hh/2}" text-anchor="middle" font-size="16" fill="#cfc" font-family="var(--mono)">ASI transport stream (no picture)</text>`;
    else body = p.map((c,i)=>`<rect x="${i*W/7}" y="0" width="${W/7+0.5}" height="${Hh*0.72}" fill="${c}"/>`).join('') + `<rect y="${Hh*0.72}" width="${W}" height="${Hh*0.28}" fill="#181818"/>`;
    body += `<text x="10" y="${Hh-12}" font-size="15" font-weight="700" fill="#fff" font-family="var(--mono)">INPUT ${o.sel+1} · ${SRC_SHORT[s]}</text>`; }
  else if (o.state==='leak'){ let n=''; for (let i=0;i<180;i++){ const r=hash01(i*7+Math.floor(t*300)); n+=`<rect x="${(i%18)*W/18}" y="${Math.floor(i/18)*Hh/10}" width="${W/18}" height="${Hh/10}" fill="hsl(0,0%,${(r*70)|0}%)"/>`; } body=n+`<text x="10" y="22" font-size="14" fill="#ff8" font-family="var(--mono)">v100: garbage from crosstalk passed through</text>`; }
  else body = `<rect width="${W}" height="${Hh}" fill="#050505"/><text x="${W/2}" y="${Hh/2-6}" text-anchor="middle" font-size="18" fill="#e33" font-family="var(--mono)">NO SIGNAL</text><text x="${W/2}" y="${Hh/2+18}" text-anchor="middle" font-size="12" fill="#aaa" font-family="var(--mono)">${o.state==='muted'?'~DDO_MUTE low: GS1535 outputs muted':o.state==='off'?'POD30 is off':o.state==='frozen'?'EQ muted: latched level':o.state==='unlocked'?'reclocker acquiring':'no cable on the selected input'}</text>`;
  return `<svg viewBox="0 0 ${W} ${Hh}" style="width:100%;max-width:340px;border:8px solid #222;border-radius:6px;background:#000">${body}</svg>`;
}

/* ================================================================
   TIMELINE LANES
   ================================================================ */
function stepSeg(name, t0, t1){ const a=run().sig[name]; if (!a) return []; const out=[]; for (let i=0;i<a.t.length;i++){ const s=a.t[i], e=i+1<a.t.length?a.t[i+1]:1.0; if (e<t0||s>t1) continue; out.push([Math.max(s,t0),Math.min(e,t1),a.v[i]]); } return out; }
function drawStep(c,X,t0,t1,y,h,name,col,txt,row){
  const rh = row? row[1] : h-8, ry = y+4+(row? row[0]:0);
  stepSeg(name,t0,t1).forEach(([a,b,v])=>{ const cl=col(v); if (!cl) return; c.fillStyle=cl; c.fillRect(X(a),ry,Math.max(1,X(b)-X(a)),rh);
    const tx=txt&&txt(v); if (tx && X(b)-X(a)>c.measureText(tx).width+6){ c.fillStyle='#fff'; c.font='10.5px sans-serif'; c.fillText(tx,X(a)+3,ry+rh/2+4); } });
}
function laneText(c,x,y,h,s){ c.fillStyle=SIM.css('--ink2'); c.font='11px '+SIM.css('--mono'); c.fillText(s,x+6,y+h/2+4); }
function lanes(){
  const css=n=>SIM.css(n), R=run(), ph=D.refPh;
  const ls=[];
  ls.push({label:'REF: ODD/EVEN · H sync (GS4982)', h:34, draw(c,X,t0,t1,y,h){
    const segs=stepSeg('ref',t0,t1);
    segs.forEach(([a,b,on])=>{ if (!on){ c.fillStyle=css('--grid'); c.fillRect(X(a),y+4,X(b)-X(a),h-8); return; }
      // ODD/EVEN level
      const k0=Math.floor((a-ph-C.OE_OFF*C.H)/C.FIELD)-1;
      for (let k=k0;;k++){ const e0=ph+C.OE_OFF*C.H+k*C.FIELD, e1=e0+C.FIELD; if (e0>b) break; const lv=((k%2)+2)%2; const xa=X(Math.max(a,e0)), xb=X(Math.min(b,e1)); if (xb<xa) continue;
        c.fillStyle=css('--accent2'); c.globalAlpha=lv?.55:.18; c.fillRect(xa,y+3,xb-xa,12); c.globalAlpha=1; }
      if (b-a < 60*C.H) SIM.pulses(c,X,Math.max(t0,a),Math.min(t1,b),y+17,h-17,C.H,ph,C.HSW,css('--ink2'),'H');
      else { c.fillStyle=css('--ink2'); c.globalAlpha=.3; c.fillRect(X(a),y+20,X(b)-X(a),h-24); c.globalAlpha=1; }
    });
    if (segs.every(s=>!s[2])) laneText(c,X(t0),y,h,'REF IN unplugged: ODD/EVEN idle, no H pulses');
  }});
  ls.push({label:'PIC16F874 main loop (orange = blocked on sync)', h:34, draw(c,X,t0,t1,y,h){
    const P=R.passes; const pxp = X(t0+C.PASS)-X(t0); let i0=passAt(t0); if (i0<0) i0=0;
    if (!sigAt('pwr',t0) && !sigAt('pwr',t1)){ laneText(c,X(t0),y,h,'power off'); return; }
    for (let i=i0;i<P.length;i++){ const p=P[i]; if (p.t0>t1) break;
      const we = p.w? p.w.t0 : p.t1;
      if (pxp>50){ let tt=p.t0; STEPS.forEach((s,j)=>{ if (j===19) return; const d=s[1]*C.TCY; c.fillStyle=css('--accent'); c.globalAlpha=j%2?.5:.8; c.fillRect(X(tt),y+3,Math.max(1,X(tt+d)-X(tt)-.5),h-6); c.globalAlpha=1;
          if (X(tt+d)-X(tt)>64){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(s[0],X(tt)+2,y+h/2+3); } tt+=d; }); }
      else if (pxp>2.5){ c.fillStyle=i%2?css('--accent'):css('--accent2'); c.globalAlpha=.75; c.fillRect(X(p.t0),y+3,Math.max(1,X(we)-X(p.t0)-.5),h-6); c.globalAlpha=1; }
      if (p.w){ c.fillStyle=p.w.timeout?css('--bad'):css('--warn'); c.globalAlpha=.75; c.fillRect(X(p.w.t0),y+3,Math.max(2,X(p.w.t1)-X(p.w.t0)),h-6); c.globalAlpha=1;
        if (X(p.w.t1)-X(p.w.t0)>150){ c.fillStyle='#fff'; c.font='10.5px sans-serif'; c.fillText(p.w.timeout?'no_vertical_synch timeout':'video_vertical_synch_detect → horizontal (5–6 lines)', X(Math.max(t0,p.w.t0))+4, y+h/2+4); } }
    }
    if (pxp<=2.5){ c.fillStyle=css('--accent'); c.globalAlpha=.3; c.fillRect(X(t0),y+12,X(t1)-X(t0),h-24); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`≈${Math.round(1/C.PASS).toLocaleString()} passes/s of ≈${(C.PASS*1e6).toFixed(0)} µs (${inf.replace(/<[^>]+>/g,'')})`, X(t0)+6, y+h/2+4); }
  }});
  ls.push({label:'Timer2 ticks (TMR2IF, 3.33 ms)', h:20, draw(c,X,t0,t1,y,h){ c.fillStyle=css('--accent2'); const tk=R.ticks; if (X(t0+C.T2_TCY*C.TCY)-X(t0)<3){ c.globalAlpha=.35; c.fillRect(X(t0),y+6,X(t1)-X(t0),h-12); c.globalAlpha=1; } else tk.forEach(x=>{ if (x>=t0&&x<=t1) c.fillRect(X(x),y+3,2,h-6); }); }});
  ls.push({label:'Front buttons PB1–PB4 (held)', h:24, draw(c,X,t0,t1,y,h){ R.presses.forEach(p=>{ if (p.t1<t0||p.t0>t1) return; c.fillStyle=css('--warn'); c.fillRect(X(p.t0),y+4,X(p.t1)-X(p.t0),h-8); c.fillStyle='#fff'; c.font='10.5px sans-serif'; if (X(p.t1)-X(p.t0)>40) c.fillText('PB'+(p.n+1)+' down',X(p.t0)+3,y+h/2+4); }); }});
  ls.push({label:'Button lamps RA0–RA3', h:30, draw(c,X,t0,t1,y,h){ for (let k=0;k<4;k++) drawStep(c,X,t0,t1,y,h,'led'+(k+1),v=>v?'#e8566f':null,null,[k*5.5,4.5]); }});
  ls.push({label:'GS1535 SEL1:SEL0 (4:1 mux)', h:24, draw(c,X,t0,t1,y,h){ drawStep(c,X,t0,t1,y,h,'sel',v=>['#2a9a58','#2f7fd1','#c9852b','#9b59b6'][v],v=>'input '+(v+1)); }});
  ls.push({label:'GS1524 CD/MUTE (live EQ)', h:24, draw(c,X,t0,t1,y,h){ drawStep(c,X,t0,t1,y,h,'cdm',v=>v===15?'#777':v===0?'#b5651d':'#4a8',v=>v===15?'all muted':v===0?'all live (reset)':'EQ '+([0,1,2,3].find(k=>!((v>>k)&1))+1)+' live'); }});
  ls.push({label:'GS1535 LD (lock detect)', h:20, draw(c,X,t0,t1,y,h){ drawStep(c,X,t0,t1,y,h,'ld',v=>v?css('--accent'):null,v=>v?'LD':''); }});
  ls.push({label:(D.fw==='V020000'?'lock (1000-pass qualified)':'lock1 && !unstable (v100)'), h:20, draw(c,X,t0,t1,y,h){ drawStep(c,X,t0,t1,y,h,'lockv',v=>v?css('--accent2'):css('--bad'),v=>v?'locked':'not qualified'); }});
  ls.push({label:'Tallies: SDI · HD · ERROR', h:30, draw(c,X,t0,t1,y,h){ drawStep(c,X,t0,t1,y,h,'sdi',v=>v?'#3fbf5f':null,null,[0,6]); drawStep(c,X,t0,t1,y,h,'hd',v=>v?'#3fbf5f':null,null,[8,6]); drawStep(c,X,t0,t1,y,h,'err',v=>v?'#e3453a':null,null,[16,6]); }});
  ls.push({label:'~DDO_MUTE (RC2): outputs', h:22, draw(c,X,t0,t1,y,h){ drawStep(c,X,t0,t1,y,h,'ddo',v=>v?css('--accent'):css('--bad'),v=>v?'live':'MUTED'); }});
  ls.push({label:'SDI OUT 2: what is on the wire', h:26, draw(c,X,t0,t1,y,h){
    const N=Math.min(500,Math.max(60,(X(t1)-X(t0))/3)); const sp=t1-t0; const col={live:css('--accent'),muted:css('--bad'),off:css('--grid'),none:css('--grid'),leak:'#b5a020',frozen:'#999',unlocked:css('--warn')};
    for (let i=0;i<N;i++){ const tt=t0+sp*(i+.5)/N; const o=outAt(tt); c.fillStyle=col[o.state]; c.fillRect(X(t0+sp*i/N),y+4,(X(t1)-X(t0))/N+.6,h-8); }
    if (sp<3e-6) laneText(c,X(t0),y,h,'see the scope below for the bits');
  }});
  ls.push({label:'RS-485 RX (into POD30) / TX', h:34, draw(c,X,t0,t1,y,h){
    R.uart.forEach(u=>{ if (u.t1<t0||u.t0>t1) return; const yy = u.dir==='rx'? y+3 : y+h/2+1, hh=h/2-4;
      if (X(u.t1)-X(u.t0) > 120){ // bit level
        const bits=[0,...[0,1,2,3,4,5,6,7].map(i=>(u.b>>i)&1),1]; c.strokeStyle=u.dir==='rx'?css('--accent2'):css('--accent'); c.lineWidth=1.5; c.beginPath();
        bits.forEach((bt,i)=>{ const xa=X(u.t0+i*C.BIT_T), xb=X(u.t0+(i+1)*C.BIT_T), yv=yy+(bt?2:hh-2); if(i===0) c.moveTo(xa,yv); else c.lineTo(xa,yv); c.lineTo(xb,yv); }); c.stroke();
        c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); bits.forEach((bt,i)=>{ const xa=X(u.t0+(i+.5)*C.BIT_T); c.fillText(i===0?'S':i===9?'P':'b'+(i-1),xa-6,yy+hh/2+4); }); }
      else { c.fillStyle=u.lost?css('--bad'):u.dir==='rx'?css('--accent2'):css('--accent'); c.fillRect(X(u.t0),yy,Math.max(2,X(u.t1)-X(u.t0)),hh); if (X(u.t1)-X(u.t0)>26){ c.fillStyle='#fff'; c.font='10.5px '+css('--mono'); c.fillText(hex(u.b),X(u.t0)+3,yy+hh-3); } } });
  }});
  ls.push({label:'Slave port SPI (out / in)', h:24, draw(c,X,t0,t1,y,h){
    if (X(t0+C.T2_TCY*C.TCY)-X(t0) < 4){ c.fillStyle=css('--ink2'); c.globalAlpha=.25; c.fillRect(X(t0),y+6,X(t1)-X(t0),h-12); c.globalAlpha=1; laneText(c,X(t0),y,h,`one byte each way per Timer2 tick${sigAt('slave',t0)?'':' — nobody answers (MISO reads 0xFF)'}`); return; }
    const lbl = X(t0+C.T2_TCY*C.TCY)-X(t0) > 60;
    R.spi.forEach(s=>{ if (s.t<t0-0.001||s.t>t1) return; const w=Math.max(2,X(s.t+C.SPI_T)-X(s.t)); c.fillStyle=css('--accent2'); c.fillRect(X(s.t),y+3,w,h-6); if (lbl){ c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText(hex(s.o)+'/'+hex(s.i),X(s.t)+w+2,y+h/2+4); } });
  }});
  return ls;
}

/* ================================================================
   SDI SCOPE: the serial bits on OUT1 / OUT2 at the playhead
   ================================================================ */
function sdWord(w, line, field, k){       // 525-line component digital, 1716 words/line (EAV at 0 — INFERRED alignment)
  const V = (line<20)?1:0, F=field, xyz=(H)=>{ const P3=V^H, P2=F^H, P1=F^V, P0=F^V^H; return 0x200|(F<<8)|(V<<7)|(H<<6)|(P3<<5)|(P2<<4)|(P1<<3)|(P0<<2); };
  if (w<4) return [0x3FF,0,0,xyz(1)][w];
  if (w<272) return (w%2)?0x040:0x200;
  if (w<276) return [0x3FF,0,0,xyz(0)][w-272];
  const a=w-276; const bar=Math.floor(a/1440*7); const Yv=[0x2D0,0x2A0,0x240,0x210,0x1A0,0x170,0x110][(bar+k)%7];
  return (a%2)? Yv : [0x200,0x0B0,0x2A0,0x150,0x350,0x200,0x3B0][(bar+k+(a%4===0?0:3))%7];
}
function hdWord(w, line, field, k){       // 1080i: 4400 interleaved C/Y words per line
  const V=(line<21)?1:0, F=field, xyz=(H)=>{ const P3=V^H, P2=F^H, P1=F^V, P0=F^V^H; return 0x200|(F<<8)|(V<<7)|(H<<6)|(P3<<5)|(P2<<4)|(P1<<3)|(P0<<2); };
  if (w<8) return [0x3FF,0x3FF,0,0,0,0,xyz(1),xyz(1)][w];
  if (w<12){ const ln=line+1; return w<10? (0x200|((ln&0x7F)<<2)) : (0x200|((ln>>7)<<2)); }
  if (w<16) return 0x155 ^ (w*37&0x3FF);   // CRC words (illustrative)
  if (w<280) return (w%2)?0x040:0x200;
  if (w<288) return [0x3FF,0x3FF,0,0,0,0,xyz(0),xyz(0)][w-280];
  const a=w-288; const bar=Math.floor(a/3840*7); return (a%2)? [0x2D0,0x2A0,0x240,0x210,0x1A0,0x170,0x110][(bar+k)%7] : 0x200;
}
function scopeData(t){
  const o=outAt(t); if (o.state!=='live') return { o };
  const s=o.s, ph=D.refPh;
  if (s==='asi'){ const bitT=1/270e6; const n=Math.floor((t-ph)/bitT/10); const words=[]; for (let i=-2;i<4;i++){ const wn=n+i; words.push({ w:wn, v: (wn%2)? 0b1100000101:0b0011111010, k:true }); }
    const bits=[]; words.forEach(wd=>{ for (let b=9;b>=0;b--) bits.push((wd.v>>b)&1); }); return { o, words, bits, levels:bits.slice(), bitT, kind:'asi', note:'8b/10b NRZ (no scrambler, no NRZI): idle K28.5 comma characters (RD− 0011111010, RD+ 1100000101)' }; }
  const hd = RATE[s]>300; const bitT = hd? 1/1.485e9 : 1/270e6; const perLine = hd? 4400 : 1716;
  const lineT = s==='hd720'? C.FIELD/750 : hd? C.FIELD/562.5 : C.H;
  const off=((t-ph)%C.FIELD+C.FIELD)%C.FIELD, fieldN=Math.floor((t-ph)/C.FIELD)&1;
  const line=Math.floor(off/lineT); const inLine=off-line*lineT; const w0=Math.floor(inLine/lineT*perLine);
  const words=[]; for (let i=-30;i<6;i++){ let w=w0+i, ln=line; if (w<0){ w+=perLine; ln--; } if (w>=perLine){ w-=perLine; ln++; } words.push({ w, v: hd? hdWord(w,ln,fieldN,o.sel) : sdWord(w,ln,fieldN,o.sel) }); }
  // serialise LSB first, scramble G1(x) = x^9 + x^4 + 1, then NRZI G2(x) = x + 1  (scrambler seeded at the window start — INFERRED)
  const raw=[]; words.forEach(wd=>{ for (let b=0;b<10;b++) raw.push((wd.v>>b)&1); });
  const sc=[]; for (let i=0;i<raw.length;i++){ const s4=i>=4?sc[i-4]:0, s9=i>=9?sc[i-9]:0; sc.push(raw[i]^s4^s9); }
  const lv=[]; let L=0; sc.forEach(b=>{ if (b) L^=1; lv.push(L); });
  return { o, words: words.slice(-12), bits: sc.slice(-120), levels: lv.slice(-120), bitT, kind: hd?'hd':'sd', line:line+1, w0, note: hd? `${s==='hd720'?'720p':'1080i'}: 20-bit C/Y interleave serialised at 1.485 Gb/s; ${perLine} words per line`:'525-line 4:2:2: 1716 words per line at 27 MW/s, 270 Mb/s' };
}
function drawScope(cv, info, t){
  const {c,w} = SIM.canvas(cv, 190); const css=n=>SIM.css(n); const d=scopeData(t);
  if (!d.bits){ c.fillStyle=css('--ink2'); c.font='13px sans-serif'; c.fillText(`OUTPUT ${D.scopeOut}: ${d.o.state==='muted'?'muted by ~DDO_MUTE (flat line)':d.o.state==='off'?'unit off':'no valid signal ('+d.o.state+')'}`, 12, 90);
    c.strokeStyle=css('--ink'); c.beginPath(); c.moveTo(10,120); c.lineTo(w-10,120); c.stroke(); info.innerHTML=''; return; }
  const n=d.levels.length, cw=(w-20)/n;
  [[1,30,'OUTPUT 1 (GS1528, inverted)'],[2,110,'OUTPUT 2']].forEach(([oi,y0,lab])=>{
    c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(lab+(D.scopeOut===oi?'  ◂ selected':''),10,y0-12);
    c.strokeStyle= oi===1? css('--warn') : css('--accent'); c.lineWidth=1.6; c.beginPath();
    d.levels.forEach((L,i)=>{ const lvl = oi===1? 1-L : L; const yy=y0+(lvl?0:40); const x=10+i*cw; if (i===0) c.moveTo(x,yy); else c.lineTo(x,yy); c.lineTo(x+cw,yy); }); c.stroke(); });
  c.fillStyle=css('--ink2'); c.font='10.5px sans-serif'; c.fillText(`${n} bit cells · one cell = ${SIM.fmtDur(d.bitT)} · window ${SIM.fmtDur(n*d.bitT)}`,10,180);
  info.innerHTML = `<div class="mono small">${d.words.map(x=>`<span class="${x.v===0x3FF?'hl':''}">${x.v.toString(16).toUpperCase().padStart(3,'0')}</span>`).join(' ')}</div>
    <div class="small muted">${d.note}${d.kind!=='asi'?` · line ${d.line}, word ${d.w0}`:''}. The words shown are the last ones before the playhead (EAV/SAV = 3FF 000 000 XYZ). Picture words are illustrative bars. ${d.kind==='asi'?'Inverted, OUTPUT 1 carries the complement of every code group: the 2010|43 test found ASI only on OUTPUT 2.':'SDI is NRZI, so the inverted OUTPUT 1 decodes the same.'}</div>`;
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
const CMDS = [
  ['READ STATUS', [0xF0,0x00]], ['Input 1', [0xF0,0x88]], ['Input 2', [0xF0,0x90]], ['Input 3', [0xF0,0x98]], ['Input 4', [0xF0,0xA0]],
  ['Slave on (code: C7)', [0xF0,0xC7]], ['Slave off (code: C0)', [0xF0,0xC0]], ['Slave + input 2', [0xF0,0xC2]], ['SUM audio 1+2', [0xF0,0x43]], ['Cancel sum', [0xF0,0x80]],
  ['Invalid: input "5"', [0xF0,0xA8]], ['Invalid: YYY = 7', [0xF0,0xB8]], ['Flood: F0 00 ×3', [0xF0,0x00,0xF0,0x00,0xF0,0x00]],
];
function consoleHTML(){
  return `<div id="p30con"><div style="display:flex;flex-wrap:wrap;gap:5px">${CMDS.map((c,i)=>`<button data-cmd="${i}" title="${c[1].map(hex).join(' ')}">${c[0]}</button>`).join('')}</div>
    <div style="display:flex;gap:6px;margin-top:6px;align-items:center"><label class="small">Hex bytes <input id="p30hex" value="F0 00" style="width:130px;font:inherit;padding:4px 6px;border:1px solid var(--line);border-radius:6px;background:var(--panel2);color:var(--ink)"></label><button id="p30send">Send at playhead</button></div>
    <div id="p30rx" class="log" style="margin-top:6px;max-height:170px"></div></div>`;
}
function decodeReply(a,b){ const ins=[0,1,2,3,4,5].filter(i=>(a>>i)&1).map(i=>i+1); return `video ${ins.length?ins.join('+'):'none'}${(a&0x40)?', slave ON':''} · audio ${[0,1,2,3,4,5].filter(i=>(b>>i)&1).map(i=>i+1).join('+')||'none (no POD2/POD10)'}${(b&0x40)?', SUM':''}`; }
function bindConsole(m){
  m.querySelectorAll('[data-cmd]').forEach(b=>b.onclick=()=>{ const c=CMDS[+b.dataset.cmd]; A.uart(c[1].slice(), 'RS-485: '+c[0]+' ('+c[1].map(hex).join(' ')+')'); });
  const s=m.querySelector('#p30send'); if (s) s.onclick=()=>{ const bytes=m.querySelector('#p30hex').value.trim().split(/[\s,]+/).map(x=>parseInt(x,16)&0xFF).filter(x=>!isNaN(x)); if (bytes.length) A.uart(bytes); };
}
function consoleLog(m){
  const el=m.querySelector('#p30rx'); if (!el) return; const R=run(); const tx=R.uart.filter(u=>u.dir==='tx'); const rx=R.uart.filter(u=>u.dir==='rx');
  let rows=[]; rx.forEach(u=>rows.push({t:u.t0, s:`<b>→ POD30</b> ${hex(u.b)}${u.lost?' <span style="color:var(--bad)">lost (OERR)</span>':''}`}));
  for (let i=0;i<tx.length;i+=2){ const a=tx[i], b=tx[i+1]; rows.push({t:a.t0, s:`<b style="color:var(--accent2)">← POD30</b> ${hex(a.b)} ${b?hex(b.b):'…'} <span class="muted">= ${b?decodeReply(a.b,b.b):''}</span>`}); }
  rows.sort((a,b)=>a.t-b.t); el.innerHTML = rows.length? rows.map(r=>`<div><span class="muted">${SIM.fmtT(r.t)}</span> ${r.s}${r.t>SIM.t?' <span class="muted">(after the playhead)</span>':''}</div>`).join('') : '<div class="muted">Send a command. The PC talks to the DE-9 at 9600 8N1; every command is F0 + one byte, and POD30 always answers with two bytes.</div>';
}
function inspector(t){
  const v=varsAt(t); const st=stepAt(t); const o=outAt(t);
  if (!v) return '<p class="muted">Power is off or the PIC is still in reset.</p>';
  const flags=(x)=>bin(x);
  return `<table class="kv">
    <tr><th>Main-loop pass</th><td class="mono">#${v._i} · ${st.wait?'<b style="color:var(--warn)">blocked in the sync wait</b>':st.step>=0?STEPS[st.step][0]:'—'}</td></tr>
    <tr><th>pre_output</th><td class="mono">0x${hex(v.pre_output)} = ${bin(v.pre_output)}b → ${inName(v.pre_output)} · slave ${(v.pre_output&0x20)?'off':'<b>on</b>'}</td></tr>
    <tr><th>Mux / outputs</th><td class="mono">SEL = input ${sigAt('sel',t)+1} · ~DDO_MUTE ${sigAt('ddo',t)?'high (live)':'<b style="color:var(--bad)">low (muted)</b>'} · OUT2: ${o.state}</td></tr>
    <tr><th>Lock (${D.fw})</th><td class="mono">LD ${sigAt('ld',t)} · lock1 ${bin(v.lock1).slice(6)} · lock ${bin(v.lock).slice(6)} · bcount_1 ${v.bcount_1} · bcount1_1 ${v.bcount1_1} · unstable ${v.unstable&1}${D.fw==='v100'?' · plock1 '+v.plock1:''}</td></tr>
    <tr><th>Buttons</th><td class="mono">input_reg 0x${hex(v.input_reg)} · bcount ${v.bcount} · rel_flag ${v.rel_flag&1} · input_flag ${flags(v.input_flag)}</td></tr>
    <tr><th>Timed switch</th><td class="mono">video_synch ${flags(v.video_synch)} · switch_flag ${flags(v.switch_flag)} · switch_count ${v.switch_count} · sync_count ${v.sync_count}/${v.sync_count1}</td></tr>
    <tr><th>RS-485</th><td class="mono">recieved_reg 0x${hex(v.recieved_reg)} · transmit_reg 0x${hex(v.transmit_reg)} · uart_flag ${flags(v.uart_flag)} · which_flag ${v.which_flag&1}</td></tr>
    <tr><th>Slave port</th><td class="mono">spi_output 0x${hex(v.spi_output)} · spi_recieved 0x${hex(v.spi_recieved)} · audio 0x${hex(v.audio)} · audio_count ${v.audio_count} · spi_rec_count ${v.spi_rec_count}</td></tr>
  </table>`;
}
function traceHTML(){
  const L=D.lastAction; if (!L) return '<div class="muted">Press a front button, click a rear BNC or send an RS-485 command. Every firmware step it causes is listed here with its time.</div>';
  return `<div><b>${L.name}</b> at ${SIM.fmtT(L.t)}</div>` + L.notes.map(n=>`<div><span class="muted">+${SIM.fmtDur(n.t-L.t)}</span> <b>${n.fn}</b> ${n.msg}</div>`).join('');
}
function slaveHTML(t){
  const att=sigAt('slave',t); const R=run(); const sl=R.S.sl;
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><button id="p30sl" class="${att?'on':''}">${att?'POD10 connected':'Connect a POD10 (audio)'}</button>
    ${att?`<span class="small muted">POD10 audio:</span>${[0,1,2,3].map(k=>`<button data-ab="${k}">${k+1}</button>`).join('')}<button id="p30as">SLAVE</button>`:''}</div>
    <p class="small muted" style="margin:6px 0 0">${att?`At the end of this second the POD10 is on audio input ${sl.sel+1}${sl.sum?' (SUM)':''}, its slave mode ${sl.on?'on':'off'}. Its side of the link is ${inf}: it is modelled to send exactly what <span class="mono">SPI_rcv_ctrl</span> expects (F0, then a status byte with bit 7 = 1, or a command with bit 7 = 0).`:'Nothing on the slave port: <span class="mono">timer_check</span> counts 32 Timer2 ticks without a reply, sets audio = 0xFF and drops slave mode.'}</p>`;
}
function bindSlave(m){ const b=m.querySelector('#p30sl'); if (b) b.onclick=()=>A.slave(); m.querySelectorAll('[data-ab]').forEach(x=>x.onclick=()=>A.aBtn(+x.dataset.ab)); const s=m.querySelector('#p30as'); if (s) s.onclick=()=>A.aSlave(); }

function viewSim(m){
  window.__pod30Active = true;
  m.innerHTML = `
  <div class="grid2">
    <div>
      ${card('Front panel at the playhead', `<div id="fp"></div>
        <div class="small muted" style="margin-top:6px">Click a button (or keys 1–4) to select an input; click the rocker to power-cycle. Each action is placed at the playhead and the playhead jumps to when its effect lands.</div>`)}
      ${card('Rear panel — click INPUT BNCs to change the source, REF IN to plug/unplug, an OUTPUT to scope it, CONTROL for the console', `<div id="rp"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;align-items:center">
          <label class="small">Firmware <select id="fw"><option value="V020000">V020000 (2013|46, shipping)</option><option value="v100">v1.00 (Dec 2003|36)</option></select></label>
          <label class="small"><input type="checkbox" id="mod"> 2013|46 leakage hardware mod fitted</label>
          <button id="rst">Factory reset</button></div>`)}
      ${card('Slave port (audio-follow-video with a POD2 or POD10)', `<div id="slv"></div>`)}
    </div>
    <div>
      ${card('What the firmware did (last action)', `<div id="trace" class="log" style="max-height:330px"></div>`)}
      ${card('RS-485 console (CONTROL DE-9)', consoleHTML())}
    </div>
  </div>
  ${card('Timeline — one second (click to seek, zoom with the transport)', `<canvas id="tl"></canvas>
    <p class="small muted">Main-loop pass ≈ ${(C.PASS*1e6).toFixed(0)} µs (${C.PASS_TCY} instruction cycles at 4.9152 MHz, counted by hand: ${inf}). The orange blocks are passes stuck in <span class="mono">video_vertical_synch_detect</span> / <span class="mono">video_horizontal_synch_detect</span>: while the PIC waits for the reference it does not read buttons, RS-485 or the slave port.</p>`)}
  <div class="grid2">
    ${card('State at the playhead', `<div id="insp"></div>`)}
    <div>${card('Scope: serial data on the outputs at the playhead', `<canvas id="scope"></canvas><div id="sinfo"></div>`)}
      ${card('Downstream monitor on OUTPUT 2', `<div id="mon"></div>`)}</div>
  </div>`;
  const fw=m.querySelector('#fw'); fw.value=D.fw; fw.onchange=()=>A.setFw(fw.value);
  const md=m.querySelector('#mod'); md.checked=D.mod; md.onchange=()=>A.setMod(md.checked);
  m.querySelector('#rst').onclick=()=>A.reset();
  bindConsole(m);
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#fp').innerHTML=frontSVG(t); m.querySelector('#rp').innerHTML=rearSVG(t); bindPanels(m);
    m.querySelector('#slv').innerHTML=slaveHTML(t); bindSlave(m);
    m.querySelector('#trace').innerHTML=traceHTML(); consoleLog(m);
    m.querySelector('#insp').innerHTML=inspector(t);
    m.querySelector('#mon').innerHTML=monitorSVG(t);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
    drawScope(m.querySelector('#scope'), m.querySelector('#sinfo'), t);
  };
  SIM.on('time', draw);
}

/* ---------------- tutorial ---------------- */
const lastSw = ()=>{ const R=run(); return R.switches.filter(s=>s.t<=SIM.t+1e-9).pop(); };
const sentCmd = b=> run().uart.some(u=>u.dir==='rx'&&u.b===b);
const LESSONS = [
  { title:'Meet the POD30', body:`<p>The POD30 is a half-rack <b>4×1 SDI video switcher</b>: four HD-SDI or SD-SDI sources in, one selection out on <b>two</b> BNCs. It re-clocks whatever it passes (Gennum GS1535) and switches in the vertical interval of a <b>NTSC reference</b>, so a downstream monitor sees a clean cut.</p>
    <p>Front: power rocker, four illuminated buttons (1–4) and three tallies — <b>SDI</b> (the receiver is locked), <b>HD</b> (1.485 Gb/s) and <b>ERROR</b> (cannot lock). Rear: CONTROL (RS-485), INPUT 1–4, OUTPUT 1–2, REF IN and the mains inlet.</p><p class="muted">Hover over the panel. Click “Next” when ready.</p>`, check:()=>true, auto:true },
  { title:'1 · Select input 2', body:`<p>Press <b>button 2</b>. The PIC needs the button held for 254 main-loop passes (about ${(254*C.PASS*1e3).toFixed(0)} ms ${inf}) before it believes it. Then the lamp moves at once, but the <b>switch itself waits</b> for the reference: watch the playhead land on the moment the mux moves.</p><p><b>Goal:</b> input 2 on air.</p>`, check:()=>sigAt('sel',SIM.t)===1, hint:'Click button 2 on the front panel (or press the 2 key).' },
  { title:'2 · Find the switch point', body:`<p>Set the transport <b>Zoom window</b> to “700 µs”. Look at the REF lane: the ODD/EVEN edge marks the start of vertical sync, and the firmware counts 5 or 6 H pulses after it (<span class="mono">line_count_FALL</span> / <span class="mono">line_count_RISE</span>) before it writes SEL0/SEL1. That puts the cut on about <b>line 10</b> of the field, inside the vertical interval.</p><p><b>Goal:</b> playhead within 1 ms of a switch.</p>`, check:()=>{ const s=lastSw(); return s && !s.same && SIM.t-s.t<0.001; }, hint:'Press a button; the playhead jumps to just after the switch. Then use the 700 µs zoom.' },
  { title:'3 · Read the tallies', body:`<p>INPUT 3 carries <b>HD 1080i</b>. Select it. Right after the switch the tallies show <b>ERROR</b> and the outputs are <b>muted</b>: V020000 does not trust the GS1535 lock-detect until it has stayed high for 1000 passes in a row (≈${(1000*C.PASS*1e3).toFixed(0)} ms ${inf}). Then SDI and HD light.</p><p><b>Goal:</b> HD tally lit on input 3.</p>`, check:()=>sigAt('sel',SIM.t)===2 && sigAt('hd',SIM.t)===1, hint:'Press button 3, then press Play (or drag the playhead ~0.2 s later).' },
  { title:'4 · Pull a cable', body:`<p>Click the rear <b>INPUT</b> BNC of the input on air until it shows “—” (no cable). The GS1535 loses lock: <b>ERROR</b> lights and <span class="mono">refresh</span> pulls <span class="mono">~DDO_MUTE</span> low, so both outputs go quiet rather than passing noise.</p><p><b>Goal:</b> ERROR lit.</p>`, check:()=>sigAt('err',SIM.t)===1 && sigAt('pwr',SIM.t)===1, hint:'Click the INPUT BNC that has the amber dot, until its tag disappears.' },
  { title:'5 · Lose the reference', body:`<p>Unplug <b>REF IN</b>, then press another button. With no ODD/EVEN edge, <span class="mono">video_vertical_synch_detect</span> polls until its counters run out and then switches anyway, on whatever line happens to be passing. Normally that is 10 × 256 polls ≈ 16.7 ms, but if no referenced switch has happened since power-up, <span class="mono">sync_count</span> is still uninitialised and the wait can last 65 536 polls ≈ 0.43 s ${inf}. Act early in the second (scrub back to near 0) so the switch fits.</p><p><b>Goal:</b> a switch made by <span class="mono">no_vertical_synch</span>.</p>`, check:()=>{ const s=lastSw(); return s && s.why==='timeout'; }, hint:'Click REF IN on the rear, then press a different front button.' },
  { title:'6 · Ask for status over RS-485', body:`<p>Plug REF IN back in. In the console send <b>READ STATUS</b> (F0 00). POD30 answers two bytes: <span class="mono">1000XXXX</span> (bit n = input n+1 on air, bit 6 = slave) and the audio switcher's status (00 when there is none).</p><p><b>Goal:</b> a READ STATUS sent and answered.</p>`, check:()=>{ const R=run(); return sentCmd(0x00) && R.uart.some(u=>u.dir==='tx'); }, hint:'Click “READ STATUS” in the RS-485 console.' },
  { title:'7 · Switch remotely', body:`<p>Send <b>Input 4</b> (F0 A0 = <span class="mono">10 100 000</span>). Read the reply: it still names the <b>old</b> input, because <span class="mono">status_check</span> builds the reply from <span class="mono">pre_output</span> before <span class="mono">router</span> applies <span class="mono">video_reg</span> on the next pass.</p><p><b>Goal:</b> input 4 selected by RS-485.</p>`, check:()=>sigAt('sel',SIM.t)===3 && sentCmd(0xA0), hint:'Click “Input 4” in the console.' },
  { title:'8 · Audio follows video', body:`<p>Click <b>Connect a POD10</b>, then send <b>Slave on (code: C7)</b>. (The manual says F0 C0 turns slave on; the code does the opposite.) Now press a front button: for 32 slave-port frames POD30 sends a command byte with bit 7 = 0 and the POD10 follows. Press a POD10 audio button and POD30's video follows after 7 command bytes.</p><p><b>Goal:</b> slave on, POD10 connected, audio = video.</p>`, check:()=>{ const v=varsAt(SIM.t); const R=run(); return v && sigAt('slave',SIM.t) && !(v.pre_output&0x20) && R.S.sl.sel===sigAt('sel',SIM.t); }, hint:'Connect a POD10, send “Slave on (code: C7)”, then press a front button.' },
  { title:'9 · ASI on the two outputs', body:`<p>Click an INPUT BNC until it shows <b>ASI</b> and select that input. Scope OUTPUT 1 and OUTPUT 2: the GS1528 drives OUTPUT 1 from its inverted pin. SDI is NRZI, so polarity does not matter; ASI is plain NRZ 8b/10b, so OUTPUT 1 carries the complement. Ward-Beck's 2010|43 test found exactly that: “ASI only on Output 2”.</p><p><b>Goal:</b> an ASI input on air.</p>`, check:()=>{ const o=outAt(SIM.t); return o.state==='live' && o.s==='asi'; }, hint:'Click INPUT 4 until it shows ASI, press button 4, play forward 0.2 s.' },
  { title:'10 · Old firmware, old problem', body:`<p>Switch the firmware to <b>v1.00</b> and untick the <b>leakage mod</b>. Then pull the cable from the input on air while the others still carry signal. v1.00 follows the GS1535 lock-detect on every pass, so when the reclocker hunts on crosstalk ${inf} the SDI tally flickers and ~DDO_MUTE lets garbage through. V020000 needs 1000 clean passes and keeps the output muted. (Selecting an already-empty input does not show it: the switch sets <span class="mono">unstable</span>, which keeps v1.00 muted too.)</p><p><b>Goal:</b> v1.00 selected.</p>`, check:()=>D.fw==='v100', hint:'Use the Firmware menu under the rear panel on the Simulator tab, or the menu here.' },
  { title:'Done', body:`<p>You have used every control on the POD30. <b>Software</b> traces the main loop pass by pass, <b>One second</b> breaks the reference and the SDI stream down to the bit, and <b>Findings</b> lists what the firmware is really up to.</p>`, check:()=>true, auto:true },
];
let lessonIdx=0;
function viewTutorial(m){
  window.__pod30Active = true;
  m.innerHTML = `<div class="grid2">
    <div>${card('Tutorial — operating the POD30 (from Pod30man.doc and Pod30serial.doc)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>
      ${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The unit', `<div id="fp"></div><div id="rp" style="margin-top:8px"></div>
      <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap"><label class="small">Firmware <select id="fw"><option value="V020000">V020000</option><option value="v100">v1.00</option></select></label><label class="small"><input type="checkbox" id="mod"> leakage mod</label></div>`)}
      ${card('Slave port', `<div id="slv"></div>`)}${card('RS-485 console', consoleHTML())}${card('Monitor on OUTPUT 2', `<div id="mon"></div>`)}</div></div>`;
  const hot = `<rect x="120" y="30" width="200" height="220" fill="transparent"><title>Power rocker and power LED</title></rect><rect x="880" y="190" width="260" height="90" fill="transparent"><title>Tallies: SDI = receiver locked, HD = 1.485 Gb/s, ERROR = cannot lock</title></rect>`;
  const fw=m.querySelector('#fw'); fw.value=D.fw; fw.onchange=()=>A.setFw(fw.value);
  const md=m.querySelector('#mod'); md.checked=D.mod; md.onchange=()=>A.setMod(md.checked);
  bindConsole(m);
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#fp').innerHTML=frontSVG(t,{hot}); m.querySelector('#rp').innerHTML=rearSVG(t); bindPanels(m);
    m.querySelector('#slv').innerHTML=slaveHTML(t); bindSlave(m); m.querySelector('#mon').innerHTML=monitorSVG(t);
    m.querySelector('#trace').innerHTML=traceHTML(); consoleLog(m);
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=>li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx]; let ok=false; try{ ok=L.check(); }catch(e){}
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); lessonIdx=0; fw.value=D.fw; md.checked=D.mod; draw(); };
  };
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewAnatomy(m){
  window.__pod30Active = false;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">${card('As seen by the device at the playhead', `<div id="dev"></div>`)}
    ${card('As seen by the displays', `<div id="fp"></div><h3>Downstream monitor (OUTPUT 2)</h3><div id="mon"></div>`)}</div>
  ${card('Zoom ladder at the playhead — the reference and the main loop at five scales', `<canvas id="zl"></canvas>`)}`;
  const draw=()=>{ const t=SIM.t, R=run(); const sw=R.switches.filter(s=>!s.same);
    const rows=[
      ['NTSC reference fields', '59.94', SIM.fmtDur(C.FIELD), 'GS4982 ODD/EVEN (RB5) flips once per field; each switch waits for the next flip'],
      ['NTSC lines (H sync)', Math.round(1/C.H).toLocaleString(), SIM.fmtDur(C.H), 'GS4982 HSYNC on RB0; 5 or 6 counted per switch'],
      ['PIC instruction cycles', (C.FOSC/4).toLocaleString(), SIM.fmtDur(C.TCY), '4.9152 MHz crystal X2 ÷ 4'],
      ['Main-loop passes', '≈ '+Math.round(1/C.PASS).toLocaleString()+' '+inf, SIM.fmtDur(C.PASS), `${R.passes.length.toLocaleString()} emulated this second (fewer when a switch blocks)`],
      ['Debounce', '—', SIM.fmtDur(254*C.PASS), '254 identical passes (bcount 0xFE → 0)'],
      ['Lock qualification', '—', SIM.fmtDur(1000*C.PASS)+' / '+SIM.fmtDur(100*C.PASS), 'V020000: 100 × 10 passes; v1.00: 100 passes'],
      ['Timer2 ticks', '300', SIM.fmtDur(C.T2_TCY*C.TCY), '4096 Tcy; each tick moves one slave-port byte each way'],
      ['Slave timeout', '—', SIM.fmtDur(32*C.T2_TCY*C.TCY), '32 ticks without a reply → slave mode dropped'],
      ['RS-485 bytes (max)', '960', SIM.fmtDur(C.BYTE_T), '9600 baud 8N1, SPBRG = 7, BRGH = 0'],
      ['SD-SDI words / bits', '27,000,000 / 270,000,000', SIM.fmtDur(1/27e6)+' / '+SIM.fmtDur(1/270e6), '1716 words per 525 line, scrambled NRZI'],
      ['HD-SDI words / bits', '148,500,000 / 1,485,000,000', SIM.fmtDur(1/148.5e6)+' / '+SIM.fmtDur(1/1.485e9), '4400 words per 1080i line'],
      ['Switches this second', String(sw.length), '', sw.map(s=>`${SIM.fmtT(s.t)} → input ${s.to+1} (${s.why}${s.wait&&s.wait.line?', line '+s.wait.line.toFixed(1):''})`).join('; ')||'none'],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Use <b>Step</b> on the transport to move one field, one H line, one loop pass, one Timer2 tick, one RS-485 byte or one SD-SDI word at a time.</p>`;
    const off=((t-D.refPh)%C.FIELD+C.FIELD)%C.FIELD; const st=stepAt(t); const o=outAt(t); const d=scopeData(t);
    m.querySelector('#dev').innerHTML = `<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>Reference</th><td class="mono">${sigAt('ref',t)?`field ${Math.floor((t-D.refPh)/C.FIELD)+1} · line ${(off/C.H+1).toFixed(2)} · ODD/EVEN ${(Math.floor((t-D.refPh-C.OE_OFF*C.H)/C.FIELD)%2+2)%2}`:'none'}</td></tr>
      <tr><th>PIC</th><td class="mono">${st.i<0?'reset':st.wait?'blocked in the sync wait':st.step>=0?STEPS[st.step][0]:'—'}<br><span class="muted">${st.step>=0&&!st.wait?STEPS[st.step][2]:''}</span></td></tr>
      <tr><th>GS1535</th><td class="mono">mux input ${sigAt('sel',t)+1} · LD ${sigAt('ld',t)} · SD/~HD ${sigAt('sdhd',t)} · DDO ${sigAt('ddo',t)?'live':'muted'}</td></tr>
      <tr><th>On the wire</th><td class="mono">${o.state==='live'?`${SRC_SHORT[o.s]} from input ${o.sel+1}${d.line?' · line '+d.line+' word '+d.w0:''}`:o.state}</td></tr></table>`;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanels(m); m.querySelector('#mon').innerHTML=monitorSVG(t);
    drawLadder(m.querySelector('#zl'), t);
  };
  SIM.on('time', draw);
}
function drawLadder(cv, t){
  const levels=[['1 second',1],['1 field',C.FIELD],['12 lines',12*C.H],['1 loop pass',C.PASS],['1 RS-485 bit',C.BIT_T]];
  const H=levels.length*46+8; const {c,w}=SIM.canvas(cv,H); const css=n=>SIM.css(n);
  levels.forEach(([nm,span],i)=>{ const y=6+i*46; const t0=Math.max(0,Math.min(1-span,t-span/2)); const x0=150, pw=w-x0-10, X=tt=>x0+(tt-t0)/span*pw;
    c.fillStyle=css('--ink'); c.font='12px sans-serif'; c.fillText(nm,6,y+16); c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText(SIM.fmtDur(span),6,y+30);
    c.strokeStyle=css('--grid'); c.strokeRect(x0,y+2,pw,36);
    if (span>=12*C.H) SIM.pulses(c,X,t0,t0+span,y+2,14,C.H,D.refPh,C.HSW,css('--ink2'),'H');
    SIM.pulses(c,X,t0,t0+span,y+2,14,C.FIELD,D.refPh+C.OE_OFF*C.H,C.H,css('--accent2'),'fields');
    drawStep(c,X,t0,t0+span,y+18,20,'ddo',v=>v?css('--accent'):css('--bad'),v=>v?'out live':'muted');
    const px=X(t); c.strokeStyle=css('--play'); c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+40); c.stroke(); });
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  ins:{x:10,y:20,w:150,h:150,t:'INPUT 1–4 (BNC)',s:['75 Ω (R1/R15/R27/R32)','0.8 Vp-p SDI','shells: C3/C29/C44/C45'],d:'Four rear BNCs, each terminated and AC-coupled into its own equaliser. The 2013|46 leakage mod replaces the 1 µF shell capacitors C3, C29, C44, C45 with 0 Ω so the BNC shells are grounded directly (POD30-V020000-26AUG13.pdf).'},
  eq:{x:200,y:20,w:170,h:150,t:'4× GS1524 cable EQ',s:['U1, U4, U5, U6','CD/MUTE1–4 ← PIC RD4–RD7','3.3 V (REG1 VCC_1)'],d:'Gennum GS1524 multi-rate adaptive equalisers. The CD/MUTE pin is bidirectional: driven LOW the EQ always runs, driven HIGH its output is muted and latched. readgs1524 drives the selected one LOW and the other three HIGH, so unselected inputs cannot leak into the mux. Outputs go through 4.7 µF caps (C5/C6, C31/C34, C39/C42, C46/C49) — the mod adds 10 kΩ across each pair.'},
  rcl:{x:410,y:20,w:190,h:190,t:'GS1535 reclocker (U2)',s:['4:1 input mux: SEL0/SEL1','auto rate 143 Mb/s–1.485 Gb/s','LD → RD1, SD/~HD → RD0','~DDO_MUTE ← RC2','VCO X1 GO1535, CLF C21 47 nF'],d:'The switch itself happens inside the GS1535: its 4:1 input mux is steered by SEL0 (PIC RD2) and SEL1 (RD3). It re-clocks the chosen stream, reports lock (LD) and rate (SD/~HD, which also sets the GS1528 slew rate) and mutes its outputs when ~DDO_MUTE is low. ASI/~177 (pin 27) has both its resistors (R53, R54) marked DNI.'},
  drv:{x:640,y:20,w:160,h:110,t:'GS1528 cable driver (U3)',s:['dual output','slew set by SD/~HD'],d:'Drives OUTPUT 1 and OUTPUT 2 from its two complementary pins (U3-7, U3-8). OUTPUT 1 is the inverted one: fine for SDI (NRZI), wrong for ASI. RD67 requirement 3 (2013|46): "ensure both SDI outputs are positive polarity to support two ASI outputs".'},
  outs:{x:640,y:150,w:160,h:60,t:'OUTPUT 1 · OUTPUT 2',s:['75 Ω, 0.8 Vp-p'],d:'Two BNCs carrying the same selected input.'},
  ref:{x:10,y:220,w:150,h:80,t:'REF IN → GS4982 (U7)',s:['R35 75 Ω, C60/R36','NTSC black burst'],d:'Gennum GS4982 sync separator. HSYNCH → RB0, ODD/~EVEN → RB5, VSYNCH → RC1 (read by nothing: the v_synch #define is commented out).'},
  pic:{x:200,y:230,w:200,h:150,t:'PIC16F874 (U25)',s:['4.9152 MHz (X2)','no interrupts (ORG 4: RETFIE)','PORTA lamps · PORTB tallies','PORTD EQ/mux · PORTC UART/SPI'],d:'One polled main loop of about 20 subroutines (Software tab). MPASM absolute code, ICD 2 via header H13 (MCLR, RB6, RB7, RB3/PGM).'},
  fp:{x:10,y:320,w:150,h:90,t:'Front panel',s:['PB1–PB4 KSD lit buttons','LED1 SDI · LED2 HD · LED3 ERROR','PWR LED, rocker'],d:'Buttons on RA4, RA5, RE0, RE1 (P3, pull-ups R45–R48), lamps on RA0–RA3 through 330 Ω (R49–R52), tallies on RB1, RB2, RB4.'},
  rs:{x:440,y:250,w:170,h:80,t:'RS-485 (U11, U12 75176)',s:['RX always on · TX enable = RC0','CONTROL DE-9 via P2'],d:'U11 receives into RC7/RX; U12 transmits from RC6/TX and is only enabled (RC0) while a byte is going out. 9600 8N1, F0 + command.'},
  spi:{x:440,y:350,w:170,h:70,t:'Slave port P1 (SPI master)',s:['SCK RC3 · SDO RC5 · SDI RC4','110 Ω series (R37–R39)'],d:'Links to a POD2 (analog) or POD10 (AES) audio switcher for audio-follow-video. One byte each way per Timer2 tick (3.33 ms).'},
  pwr:{x:640,y:250,w:160,h:100,t:'Power',s:['ACIN → PWRSW → VAF1005','+5 V; REG1/REG2 LM1117-3.3','VCC_1 EQs · VCC_2 reclocker/driver'],d:'Universal-input VAF1005 supply (100–240 VAC), two 3.3 V LDOs.'},
};
const WIRES=[['ins','eq','4 × SDI'],['eq','rcl','DDI 0–3'],['rcl','drv','DDO/~DDO'],['drv','outs',''],['ref','pic','HSYNC · ODD/EVEN'],['pic','eq','CD/MUTE1–4'],['pic','rcl','SEL0/1 · ~DDO_MUTE'],['rcl','pic','LD · SD/~HD'],['fp','pic','buttons/lamps'],['pic','rs','RX/TX/RC0'],['pic','spi','SPI'],['rcl','drv','']];
function viewBlock(m){
  window.__pod30Active=false; let sel='rcl';
  m.innerHTML=`<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div><p class="small muted">Redrawn from pod30iss2.net and the CorelDRAW <span class="mono">POD30 - Functional Diagram.cdr</span> (converted with Inkscape; it shows RCVR ×4 → HD-SDI RECLOCKER → XMTR → 2 outputs, a PIC with four lit buttons and three tallies). The .cdr also draws the sync separator into the reclocker; the netlist sends it only to the PIC.</p>`)}</div>
    <div>${card('Block', `<div id="bdinfo"></div>`)}${card('Signal flow in one sentence', `<p>The four <b>EQs</b> clean up the cables, the <b>GS1535</b> picks one (SEL0/SEL1), re-clocks it and reports lock, the <b>GS1528</b> drives two outputs, and the <b>PIC</b> decides when to flip the mux by watching the NTSC <b>reference</b>.</p>`)}</div></div>`;
  const draw=()=>{ const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 820 430" style="width:100%"><defs><marker id="p30ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#p30ar)"/>`; if (l) s+=`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
      <text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+35+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`; };
  draw();
}

/* ---------------- schematics (redrawn from pod30iss2.net — not the P-CAD drawing) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([pin,net],i)=>{ const yy=y+22+i*18; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-34}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach(([pin,net],i)=>{ const yy=y+22+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+34}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
const txt=(x,y,s,o)=>`<text x="${x}" y="${y}" font-size="${(o&&o.fs)||11}" ${o&&o.a?`text-anchor="${o.a}"`:''} fill="${(o&&o.c)||'var(--ink)'}">${s}</text>`;
function mechSVG(){
  const S=95, fx=40, fy=40, ry=260;   // 95 px per inch
  const R=(x,y,w,h,o)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${(o&&o.f)||'none'}" stroke="${(o&&o.s)||'var(--ink)'}" stroke-width="1.2" ${o&&o.rx?`rx="${o.rx}"`:''}/>`;
  const Cc=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="var(--ink)" stroke-width="1.2"/>`;
  let s=txt(fx,fy-14,'FRONT PANEL — POD30-FRONT ISS 1 (25 Nov 2003|36), 8.570 × 1.606", .059 CRS, WBS black',{fs:11.5});
  s+=R(fx,fy,8.57*S,1.606*S);
  s+=R(fx+(0.9-0.2525)*S,fy+(0.595-0.385)*S,0.505*S,0.77*S);                                    // A rocker
  [1.496,4.554,5.054,5.554].forEach(x=>s+=Cc(fx+x*S,fy+1.09*S,0.065*S));                         // B LEDs
  [3.929,4.679,5.429,6.179].forEach(x=>s+=R(fx+(x-0.17)*S,fy+(0.595-0.17)*S,0.34*S,0.34*S));     // C buttons
  [[0.251,0.803],[4.303,0.595],[5.804,0.595],[8.319,0.803]].forEach(([x,y])=>s+=Cc(fx+x*S,fy+y*S,0.057*S)); // D screws
  s+=txt(fx+0.9*S,fy+1.5*S,'A',{a:'middle',c:'var(--ink2)'})+txt(fx+5.05*S,fy+1.45*S,'B ×4  · C ×4 (.340" sq)  · D ×4',{a:'middle',c:'var(--ink2)',fs:10});
  s+=txt(fx,ry-14,'REAR PANEL — POD30-REAR ISS 1 (8 Dec 2003|36): "the same as POD21-REAR ISS.1, the silkscreen is different"',{fs:11.5});
  s+=R(fx,ry,8.57*S,1.606*S);
  [1.305,2.055,2.805,3.555,4.305,5.055,5.805].forEach(x=>{ s+=Cc(fx+x*S,ry+0.989*S,0.225*S); s+=`<line x1="${fx+(x+0.195)*S}" y1="${ry+(0.989-0.11)*S}" x2="${fx+(x+0.195)*S}" y2="${ry+(0.989+0.11)*S}" stroke="var(--ink)"/>`; });
  s+=R(fx+(0.698-0.2325)*S,ry+(0.649-0.384)*S,0.465*S,0.768*S,{rx:6}); [0.157,1.141].forEach(y=>s+=Cc(fx+0.698*S,ry+y*S,0.0625*S));
  s+=R(fx+(7.415-0.54)*S,ry+(0.703-0.628)*S,1.08*S,1.256*S); [[8.319,0.25],[8.319,0.803]].forEach(([x,y])=>s+=Cc(fx+x*S,ry+y*S,0.057*S)); s+=Cc(fx+0.251*S,ry+0.803*S,0.057*S);
  s+=txt(fx+0.698*S,ry+1.75*S,'DE-9 (detail B, upright)',{a:'middle',fs:10,c:'var(--ink2)'})+txt(fx+3.555*S,ry+1.75*S,'7 × BNC D-hole (detail A) .750" pitch',{a:'middle',fs:10,c:'var(--ink2)'})+txt(fx+7.415*S,ry+1.75*S,'IEC inlet (detail C)',{a:'middle',fs:10,c:'var(--ink2)'});
  // DE-9 adaptor plate, 2:1 detail
  const ax=110, ay=470, A2=2*S;
  s+=txt(ax-60,ay-16,'DE-9 ISS 2 — "DB-9 ADAPTER PLATE TO SUIT POD30 REAR PANEL" (14 Dec 2005|38), .062 black vinyl-covered aluminium, drawn 2:1',{fs:11.5});
  s+=R(ax,ay,1.21*A2,0.48*A2); [0.113,1.097].forEach(x=>s+=Cc(ax+x*A2,ay+0.24*A2,0.0445*A2));
  s+=txt(ax+1.21*A2+12,ay+0.2*A2,'1.210 × .480" (".480 DIMENSION WAS .600", issue 2)',{fs:10.5,c:'var(--ink2)'})+txt(ax+1.21*A2+12,ay+0.2*A2+16,'2 × .089" holes tapped 4-40, .984" apart = DE-9 shell spacing',{fs:10.5,c:'var(--ink2)'})+txt(ax+1.21*A2+12,ay+0.2*A2+32,'Sits behind the panel so the DE-9 jack-screws have threads to bite.',{fs:10.5,c:'var(--ink2)'});
  s+=txt(ax-60,ay+122,'Also in the set: POD30-SPACER (.318" OD grey PVC, 2 stacked × 4 between PCB1 and the front panel, 2005|38)',{fs:10.5,c:'var(--ink2)'})+txt(ax-60,ay+138,'and POD30R-PLATE (remote blank cover plate 5.100 × 1.150", 2007|40).',{fs:10.5,c:'var(--ink2)'});
  return s;
}
const SHEETS = [
  { name:'1 · PIC16F874 (U25)', note:'U25 is a TQFP-44 PIC16F874 (pins 6/29 GND, 7/28 +5 V, 30/31 OSC). Pin → net from pod30iss2.net; port → function from 30v100.asm. RE2 (27) has no net; RC1 carries VSYNCH but the code never reads it.', svg:()=>
    chip(330,50,200,'U25 PIC16F874-TQFP44',[
      ['8 RB0','HSYNCH ← U7-1'],['15 RB5','ODD/~EVEN ← U7-7'],['35 RC1','VSYNCH ← U7-3 (unused)'],['39 RD1','LD ← U2-28'],['38 RD0','SD/~HD ← U2-33'],
      ['23 RA4','PB1 (R44, P3-4)'],['24 RA5','PB2 (R43, P3-3)'],['25 RE0','PB3 (R40, P3-2)'],['26 RE1','PB4 (R21, P3-1)'],['1 RC7/RX','← U11-1 (RS-485 in)'],['30/31 OSC','X2 4.9152 MHz, C64/C66 27p'],['18 MCLR','H13-3, D11'],['11/16/17','RB3 RB6 RB7 → H13 ICSP'],
    ],[
      ['19 RA0','lamp 1 (R50, P3-8)'],['20 RA1','lamp 2 (R49, P3-7)'],['21 RA2','lamp 3 (R51, P3-6)'],['22 RA3','lamp 4 (R52, P3-5)'],['9 RB1','LED1 SDI (R23)'],['10 RB2','LED2 HD (R24)'],['14 RB4','LED3 ERROR (R25)'],
      ['40 RD2','SEL0 → U2-17 (R67)'],['41 RD3','SEL1 → U2-18 (R69)'],['2–5 RD4–7','CD/MUTE1–4 (R65 R62 R66 R60)'],['36 RC2','~DDO_MUTE → U2-36 (R57)'],['44 RC6/TX','→ U12-4'],['32 RC0','→ U12-2/3 (TX enable)'],['37/43/42','RC3 SCK · RC5 SDO · RC4 SDI → P1'],
    ],'4.9152 MHz · MPASM · 75176 ×2 · ICD 2 on H13') },
  { name:'2 · SDI path', note:'Each input: BNC → 75 Ω termination and return-loss network → GS1524 → 4.7 µF pair → one differential input of the GS1535 mux. The 2013|46 mod: C3/C29/C44/C45 → 0 Ω, + 10 kΩ across C5&C6, C31&C34, C39&C42, C46&C49. OUT1 comes from U3-7, OUT2 from U3-8.', svg:()=>{
    let s=''; [['INPUT1','U1','C5/C6','1/3','CD/MUTE1'],['INPUT2','U4','C34/C31','5/7','CD/MUTE2'],['INPUT3','U5','C39/C42','9/11','CD/MUTE3'],['INPUT4','U6','C49/C46','13/15','CD/MUTE4']].forEach((r,i)=>{ const y=60+i*90;
      s+=`<circle cx="50" cy="${y}" r="12" fill="none" stroke="var(--ink)"/>${txt(30,y-18,r[0],{fs:10.5})}<line x1="62" y1="${y}" x2="120" y2="${y}" stroke="var(--ink)"/>${txt(70,y-5,'75R·L·1µ',{fs:9.5,c:'var(--ink2)'})}
        <rect x="120" y="${y-26}" width="110" height="52" fill="var(--panel2)" stroke="var(--ink)"/>${txt(175,y-6,r[1]+' GS1524',{a:'middle',fs:11})}${txt(175,y+10,'pin16 '+r[4],{a:'middle',fs:9.5,c:'var(--accent2)'})}
        <line x1="230" y1="${y-6}" x2="330" y2="${y-6}" stroke="var(--ink)"/><line x1="230" y1="${y+6}" x2="330" y2="${y+6}" stroke="var(--ink)"/>${txt(250,y-12,r[2]+' 4.7µ',{fs:9.5,c:'var(--ink2)'})}${txt(250,y+20,'+10k (mod)',{fs:9.5,c:'var(--warn)'})}<line x1="330" y1="${y}" x2="400" y2="${y}" stroke="var(--ink2)" stroke-dasharray="4 3"/>${txt(334,y-4,'→ DDI '+i,{fs:9.5,c:'var(--accent2)'})}`; });
    s+=chip(590,40,150,'U2 GS1535',[['1/3','DDI0 ← U1'],['5/7','DDI1 ← U4'],['9/11','DDI2 ← U5'],['13/15','DDI3 ← U6'],['17','SEL0 ← RD2'],['18','SEL1 ← RD3'],['27','ASI/~177 (R53/R54 DNI)'],['19','BYPASS (R56 1k to GND)'],['52/53','X1 GO1535 VCO'],['62/63','CLF C21 47n']],[['46','DDO → U3-1'],['44','~DDO → U3-2'],['28','LD → RD1'],['33','SD/~HD'],['36','~DDO_MUTE ← RC2']],'reclocker + 4:1 mux, VCC_2 3.3 V')
      + chip(600,320,100,'U3 GS1528',[['1','DDO'],['2','~DDO'],['6','SD/~HD'],['4','RSET R6 750R']],[['7','OUTPUT 1 (C23)'],['8','OUTPUT 2 (C22)']],'dual driver');
    return s; } },
  { name:'3 · Reference', note:'REF IN is terminated by R35 (75 Ω) and fed through R36/C60 to the GS4982. Only HSYNCH and ODD/~EVEN are used by the firmware (h_synch = portb,0; odd_even = portb,5).', svg:()=>
    `<circle cx="80" cy="140" r="14" fill="none" stroke="var(--ink)"/>${txt(60,115,'REF IN (BNC)')}<line x1="94" y1="140" x2="250" y2="140" stroke="var(--ink)"/>${txt(120,132,'R35 75R to GND · R36 10R · C60',{fs:10,c:'var(--ink2)'})}`
    + chip(280,100,170,'U7 GS4982',[['2','video in'],['6','RSET R34 220k, C59'],['8','+5 V']],[['1','HSYNCH → RB0'],['3','VSYNCH → RC1'],['7','ODD/~EVEN → RB5']],'sync separator')
    + txt(60,300,'NTSC: field 16.683 ms, line 63.556 µs. ODD/~EVEN changes near line 4 of each field ("vsynch starts halfway between line 4 and 5", init.asm);',{fs:11,c:'var(--ink2)'})
    + txt(60,318,'the firmware then counts line_count_FALL = 5 or line_count_RISE = 6 HSYNCH pulses: "switching occurs at line number 10".',{fs:11,c:'var(--ink2)'}) },
  { name:'4 · Front panel and connectors', note:'P3 (9-way) runs to the button board P4 (PB1–PB4 KSD, lamp anodes P4-5…8, common K on P4-9). P2 is the RS-485 header to the CONTROL DE-9; P1 is the slave port. Which DE-9 pins carry P1 is not recoverable from the binary POD30-wiring.sch (inferred: same connector).', svg:()=>
    chip(80,50,150,'P3 → button board',[],[['1','PB4 (RE1)'],['2','PB3 (RE0)'],['3','PB2 (RA5)'],['4','PB1 (RA4)'],['5','lamp 4 (RA3)'],['6','lamp 3 (RA2)'],['7','lamp 2 (RA1)'],['8','lamp 1 (RA0)'],['9','GND']],'pull-ups R45–R48')
    + chip(480,50,150,'P2 RS-485',[['U12-6 A','TX+'],['U12-7 B','TX−'],['U11-6 A','RX+ (R42 ↑)'],['U11-7 B','RX− (R41 ↓)'],['GND','']],[['1',''],['2',''],['3',''],['4',''],['5','']],'two 75176')
    + chip(480,280,150,'P1 slave port',[['RC3 SCK','R37 110R'],['RC5 SDO','R38 110R'],['RC4 SDI','R39 110R'],['GND','']],[['1',''],['2',''],['3',''],['4/5','']],'to POD2 / POD10')
    + txt(60,330,'CONTROL DE-9 — Pod30man.doc (2005|38): RX 3+/8−, TX 7+/2−, GND 5.',{fs:11})+txt(60,348,'Pod30serial.doc (2011|44): TX 3+/8− (out of POD30), RX 7+/2− (into POD30), GND 5.  ← the two documents disagree',{fs:11,c:'var(--bad)'}) },
  { name:'5 · Power', note:'From the netlist: ACIN (PAN356) → PWRSW → PSU1 VAF1005 → +5 V (PIC, 75176s, GS4982); REG1 LM1117-3.3 → VCC_1 (the four GS1524), REG2 → VCC_2 (GS1535, GS1528). Power LED through R33 511 Ω.', svg:()=>
    `<rect x="60" y="80" width="110" height="60" fill="var(--panel2)" stroke="var(--ink)"/>${txt(115,108,'ACIN',{a:'middle'})}${txt(115,124,'100–240 VAC',{a:'middle',fs:10,c:'var(--ink2)'})}
     <line x1="170" y1="110" x2="220" y2="110" stroke="var(--ink)"/><rect x="220" y="85" width="80" height="50" fill="var(--panel2)" stroke="var(--ink)"/>${txt(260,115,'PWRSW',{a:'middle'})}
     <line x1="300" y1="110" x2="350" y2="110" stroke="var(--ink)"/><rect x="350" y="75" width="120" height="70" fill="var(--panel2)" stroke="var(--ink)"/>${txt(410,105,'PSU1 VAF1005',{a:'middle'})}${txt(410,122,'+5V (pin 5)',{a:'middle',fs:10,c:'var(--accent2)'})}
     <line x1="470" y1="110" x2="560" y2="110" stroke="var(--ink)"/>${txt(480,100,'+5V',{fs:10,c:'var(--accent2)'})}
     <rect x="560" y="40" width="140" height="50" fill="var(--panel2)" stroke="var(--ink)"/>${txt(630,62,'REG1 LM1117-3.3',{a:'middle',fs:11})}${txt(630,78,'VCC_1 → U1 U4 U5 U6',{a:'middle',fs:10,c:'var(--accent2)'})}
     <rect x="560" y="130" width="140" height="50" fill="var(--panel2)" stroke="var(--ink)"/>${txt(630,152,'REG2 LM1117-3.3',{a:'middle',fs:11})}${txt(630,168,'VCC_2 → U2 U3',{a:'middle',fs:10,c:'var(--accent2)'})}
     <line x1="530" y1="110" x2="530" y2="65" stroke="var(--ink)"/><line x1="530" y1="65" x2="560" y2="65" stroke="var(--ink)"/><line x1="530" y1="110" x2="530" y2="155" stroke="var(--ink)"/><line x1="530" y1="155" x2="560" y2="155" stroke="var(--ink)"/>
     ${txt(60,260,'+5V also feeds U25, U11/U12, U7, H13-1 and the PWR LED (R33 511R).',{fs:11,c:'var(--ink2)'})}` },
  { name:'6 · Mechanical (to scale)', note:'Drawn to scale from POD30 - #Mechanical #DA #2016: POD30-FRONT ISS 1 (PANEL).pdf, POD30-REAR ISS 1 (PANEL).pdf (and its identical "Master Mechanical Library" copy, drawn upright), DE-9 ISS 2 (ADAPTOR PLATE).pdf, POD30-SPACER ISS 1.pdf, POD30R-PLATE ISS 1.pdf. Hole positions in inches from the left edge and top edge.', svg:mechSVG },
];
function viewSchem(m){
  window.__pod30Active=false; let i=0;
  m.innerHTML = card('Schematic set (redrawn from pod30iss2.net net names — not the original P-CAD drawing)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The original P-CAD files are <span class="mono">POD30 - #Engineering/PCB/pod30iss2.sch/.pcb</span> (issue 2; issue 3 sits unreleased in <span class="mono">WORKING/</span>). These sheets are a readable guide built from the ISS2 netlist and BOM; blue labels are nets.</p>`);
  const draw=()=>{
    m.querySelector('#tabs2').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 900 ${i===5?640:470}" style="width:100%;min-width:680px;background:var(--lane);border:1px solid var(--line);border-radius:8px">
      <rect x="6" y="6" width="888" height="${i===5?628:458}" fill="none" stroke="var(--line)"/><text x="880" y="${i===5?624:455}" text-anchor="end" font-size="10" fill="var(--ink2)">POD30 ISS2 · sheet ${i+1}/${SHEETS.length} · redrawn ${Y(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent=SHEETS[i].note; };
  draw();
}

/* ---------------- software ---------------- */
function viewSoft(m){
  window.__pod30Active=true;
  m.innerHTML = `<div class="grid2">
    ${card('main: — the step lit up is running at the playhead (zoom to “200 µs” to watch a pass)', `<div id="flow"></div>`)}
    <div>${card('Timed switch state machine (video_synch bits)', `<div id="fsm"></div>`)}
      ${card('Lock qualification, live', `<div id="lock"></div>`)}</div></div>
  <div class="grid2">
    ${card('How the buttons and commands did things', `<div id="btn"></div>`)}
    ${card('Port map at the playhead (output latches)', `<div id="ports"></div>`)}</div>
  <div class="grid2">
    ${card('RS-485 protocol as the code decodes it (translate_uart)', `<div id="proto"></div>`)}
    ${card('Slave port protocol (SPI_trns_cntrl / SPI_rcv_ctrl)', `<div id="spi"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t, st=stepAt(t), v=varsAt(t);
    const n=STEPS.length; let s=`<svg viewBox="0 0 520 ${n*30+60}" style="width:100%"><defs><marker id="p30a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <rect x="140" y="4" width="240" height="22" rx="11" fill="var(--chip)" stroke="var(--line)"/><text x="260" y="19" text-anchor="middle" font-size="11" fill="var(--ink)">RESET → init → init_matrix → main</text>`;
    STEPS.forEach((p,j)=>{ const y=34+j*30, on=st.step===j; const warn=j===19&&st.wait;
      s+=`<rect x="20" y="${y}" width="470" height="25" rx="5" fill="${warn?'var(--warn)':on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
        <text x="28" y="${y+11}" font-size="11" font-family="var(--mono)" fill="${on||warn?'#fff':'var(--ink)'}">${p[0]}</text><text x="160" y="${y+11}" font-size="9.5" fill="${on||warn?'#fff':'var(--ink2)'}">${p[2]}</text>
        <text x="482" y="${y+21}" text-anchor="end" font-size="9" fill="${on||warn?'#fff':'var(--ink2)'}">${p[1]} Tcy</text>`; });
    const yb=34+n*30; s+=`<path d="M490 ${yb-14} h18 V40 h-18" fill="none" stroke="var(--ink2)" marker-end="url(#p30a2)"/><text x="20" y="${yb+18}" font-size="10.5" fill="var(--ink2)">goto main · no interrupts (ORG 4: RETFIE) · pass #${st.i}${st.wait?' — blocked waiting for the reference':''}</text></svg>`;
    m.querySelector('#flow').innerHTML=s;
    const vs=v?v.video_synch:0; const node=(x,y,l,on,sub)=>`<g><rect x="${x-62}" y="${y-22}" width="124" height="44" rx="10" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x}" y="${y-3}" text-anchor="middle" font-size="11" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${l}</text><text x="${x}" y="${y+12}" text-anchor="middle" font-size="9.5" fill="${on?'#fff':'var(--ink2)'}">${sub}</text></g>`;
    const idle=!(vs&1), vwait=(vs&1)&&!(vs&2), hwait=(vs&2);
    m.querySelector('#fsm').innerHTML=`<svg viewBox="0 0 470 170" style="width:100%">${node(70,40,'IDLE',idle&&!st.wait,'video_synch.0 = 0')}${node(235,40,'WAIT ODD/EVEN',st.wait&&!hwait||(!st.wait&&vwait),'bit 3 · polls ≤ 2560')}${node(400,40,'COUNT H',st.wait&&!!hwait,'bit 2 · temp0 = 5/6')}${node(235,130,'do_switch',false,'SEL0/SEL1 · unstable = 1')}
      <path d="M132 40 H173" stroke="var(--ink2)" marker-end="url(#p30a2)"/><text x="150" y="30" font-size="9" fill="var(--ink2)" text-anchor="middle">output_led</text>
      <path d="M297 40 H338" stroke="var(--ink2)" marker-end="url(#p30a2)"/><text x="318" y="30" font-size="9" fill="var(--ink2)" text-anchor="middle">edge</text>
      <path d="M400 62 Q400 130 297 130" fill="none" stroke="var(--ink2)" marker-end="url(#p30a2)"/><text x="410" y="110" font-size="9" fill="var(--ink2)">5/6 lines</text>
      <path d="M235 62 V108" stroke="var(--bad)" marker-end="url(#p30a2)"/><text x="240" y="90" font-size="9" fill="var(--bad)">timeout (no ref)</text>
      <path d="M173 130 Q70 130 70 62" fill="none" stroke="var(--ink2)" marker-end="url(#p30a2)"/></svg>
      <p class="small muted">Both waits are busy loops inside one main-loop pass. The vertical wait times out after sync_count × 256 polls (10 × 256 ≈ ${SIM.fmtDur(2560*C.VLOOP_TCY*C.TCY)}); the horizontal count has no timeout at all. A Timer2 fallback (<span class="mono">synch_check</span>, 8 ticks) exists but only fires at power-up, because <span class="mono">init</span> clears video_synch after asking for the first switch.</p>`;
    if (v){ const fw=D.fw; const pct = fw==='V020000'? ((10-v.bcount1_1)*100+(100-v.bcount_1))/1000 : (100-v.bcount_1)/100;
      m.querySelector('#lock').innerHTML=`<p class="small">${fw==='V020000'?'<b>V020000</b> (2013|46, Ali-Add): any pass with LD low clears <span class="mono">lock</span> at once; <span class="mono">lock</span> is set again only after <span class="mono">bcount_1</span> (100) × <span class="mono">bcount1_1</span> (10) consecutive locked passes. A switch sets <span class="mono">unstable</span>, which wipes the lock too.':'<b>v1.00</b> (2003|36): the tallies follow LD (lock1) on every pass; <span class="mono">unstable</span> (set by a switch, or 5 passes of changed SD/HD) mutes the output until 100 passes with a steady SD/HD.'}</p>
        <div style="background:var(--chip);border-radius:6px;height:16px;overflow:hidden"><div style="height:100%;width:${(Math.max(0,Math.min(1,pct))*100).toFixed(1)}%;background:var(--accent)"></div></div>
        <p class="mono small">LD ${sigAt('ld',t)} · lock1 ${v.lock1&3} · lock ${v.lock&3} · bcount_1 ${v.bcount_1} · bcount1_1 ${v.bcount1_1} · unstable ${v.unstable&1} → outputs ${sigAt('ddo',t)?'live':'MUTED'}</p>`; }
    m.querySelector('#btn').innerHTML=`<table class="kv"><tr><th>Operator does</th><th>Firmware path</th><th>What changes</th></tr>
      <tr><td>Press a button</td><td class="mono small">input → debounce (254) → router → next_output1/2 → output_led</td><td class="small">Lamps RA0–3 at once; video_synch.0 = 1</td></tr>
      <tr><td>(same pass)</td><td class="mono small">video_vertical_synch_detect → video_horizontal_synch_detect → switch_check → do_switch</td><td class="small">SEL0/SEL1 at line ≈10; unstable = 1</td></tr>
      <tr><td>(next pass)</td><td class="mono small">readgs1524 → readgs1535 → autodetect1 → refresh</td><td class="small">New EQ un-muted; lock wiped; ERROR + ~DDO_MUTE low until re-qualified</td></tr>
      <tr><td>RS-485 F0 10YYY000</td><td class="mono small">recieve_uart → translate_uart → video_table → status_check → transmit_uart; router next_route1</td><td class="small">Reply (old state) then switch as above</td></tr>
      <tr><td>RS-485 F0 11000XXX</td><td class="mono small">slave_mode → slave_on / slave_off / not_on</td><td class="small">pre_output bit 5 (0 = slave on)</td></tr>
      <tr><td>POD10 button (slave on)</td><td class="mono small">SPI_rcv_ctrl × 7 command bytes → spi_reg → router next_route0</td><td class="small">Video follows audio</td></tr>
      <tr><td>Nobody on the slave port</td><td class="mono small">timer_check: audio_count 32 → 0</td><td class="small">audio = 0xFF, slave bit forced off</td></tr></table>
      <p class="small">Last action: <b>${D.lastAction?D.lastAction.name:'none yet — use the Simulator or Tutorial tab'}</b></p>`;
    const g=n=>sigAt(n,t)?1:0; const sel=sigAt('sel',t), cdm=sigAt('cdm',t);
    m.querySelector('#ports').innerHTML=`<table class="kv">
      <tr><th>PORTA</th><td class="mono">RA3..0 lamps ${g('led4')}${g('led3')}${g('led2')}${g('led1')} · RA5 PB2, RA4 PB1 (inputs)</td></tr>
      <tr><th>PORTB</th><td class="mono">RB4 ERROR ${g('err')} · RB2 HD ${g('hd')} · RB1 SDI ${g('sdi')} · RB5 ODD/EVEN, RB0 HSYNCH (inputs)</td></tr>
      <tr><th>PORTC</th><td class="mono">RC2 ~DDO_MUTE ${g('ddo')} · RC0 TX enable ${g('txen')} · RC6/RC7 USART · RC3/4/5 SPI</td></tr>
      <tr><th>PORTD</th><td class="mono">RD7..4 CD/MUTE4..1 ${bin(cdm).slice(4)} · RD3 SEL1 ${sel>>1} · RD2 SEL0 ${sel&1} · RD1 LD ${sigAt('ld',t)} · RD0 SD/~HD ${sigAt('sdhd',t)}</td></tr>
      <tr><th>PORTE</th><td class="mono">RE1 PB4, RE0 PB3 (inputs) · RE2 not connected</td></tr></table>
      <p class="small muted">init.asm still says "E2=AUD1 LED, E1=AUD2 LED, E0=ERROR LED" — a POD21 comment that is wrong on this board.</p>`;
    m.querySelector('#proto').innerHTML=`<table class="kv"><tr><th>2nd byte</th><th>Code path</th><th>Effect</th></tr>
      <tr><td class="mono">00</td><td class="mono small">status_check</td><td class="small">READ STATUS</td></tr>
      <tr><td class="mono">01XXXXXX</td><td class="mono small">sum_audio</td><td class="small">SUM those audio inputs on the slave; slave off</td></tr>
      <tr><td class="mono">80</td><td class="mono small">cancel_sum</td><td class="small">resend current audio</td></tr>
      <tr><td class="mono">10VVVAAA</td><td class="mono small">video_table / audio_table</td><td class="small">VVV 1–4 video (5–7 invalid), AAA audio</td></tr>
      <tr><td class="mono">C0</td><td class="mono small">slave_off</td><td class="small">slave OFF (manual: on)</td></tr>
      <tr><td class="mono">C1–C6</td><td class="mono small">not_on</td><td class="small">slave on + input, ignored if slave already on</td></tr>
      <tr><td class="mono">C7</td><td class="mono small">slave_on</td><td class="small">slave ON (manual: off)</td></tr></table>
      <p class="small">Reply: <span class="mono">1 S I6 I5 I4 I3 I2 I1</span> then <span class="mono">0 SUM A6…A1</span> (≈ ~audio). Address F0 is not a real address: every POD30 on the bus answers.</p>`;
    m.querySelector('#spi').innerHTML=`<p class="small">Every Timer2 tick (3.33 ms) one byte goes each way. POD30 alternates <span class="mono">F0</span> and a data byte:</p>
      <table class="kv"><tr><th>Byte</th><th>Meaning</th></tr>
      <tr><td class="mono">1 S i6…i1</td><td class="small">status: active-low input bits, bit 6 = 0 when slave is on</td></tr>
      <tr><td class="mono">0 1 i6…i1</td><td class="small">command "follow me" — sent for 32 frames after a local press while slave is on</td></tr>
      <tr><td class="mono">0 0 a6…a1</td><td class="small">SUM command (from RS-485)</td></tr></table>
      <p class="small">From the audio switcher: <span class="mono">F0</span> + <span class="mono">1 s a6…a1</span> (status → <span class="mono">audio</span>, reloads <span class="mono">audio_count</span>) or <span class="mono">0 x a6…a1</span> (command; POD30 obeys after 7 in a row, bit 6 = 0 turns slave on).</p>
      <p class="small mono">now: spi_output 0x${v?hex(v.spi_output):'--'} · spi_recieved 0x${v?hex(v.spi_recieved):'--'} · audio 0x${v?hex(v.audio):'--'} · audio_count ${v?v.audio_count:'--'}</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__pod30Active=false;
  m.innerHTML = card('What POD30 is up to — findings from the source', `<ol>
    <li><b>Every switch mutes both outputs for ≈${(1000*C.PASS*1e3).toFixed(0)} ms in V020000.</b> <span class="mono">do_switch</span> sets <span class="mono">unstable.0</span>; on the next pass <span class="mono">autodetect1</span> (Ali-Add) clears <span class="mono">lock</span>, and <span class="mono">refresh</span> then holds <span class="mono">~DDO_MUTE</span> low and ERROR on until LD has been high for <span class="mono">detect_count</span> × <span class="mono">detect_count1</span> = 100 × 10 consecutive passes — even when the new input locks in 0.3 µs. The careful line-10 switch is followed by a mute of several fields (time ${inf}, from the pass length). v1.00 needed 100 passes (≈15 ms). The change came with the 2013|46 leakage fix: it stops crosstalk on an empty input from reaching air.</li>
    <li><b>The manual has the slave codes the wrong way round.</b> Pod30man.doc: "turned on by F0, C0 and turned off by F0, C7". In <span class="mono">slave_mode</span>, low bits 000 go to <span class="mono">slave_off</span> (pre_output bit 5 = 1) and 111 to <span class="mono">slave_on</span>.</li>
    <li><b>The reply describes the past.</b> <span class="mono">status_check</span> builds <span class="mono">transmit_reg</span> from <span class="mono">pre_output</span> in the same call that decodes the command; <span class="mono">router</span> only applies <span class="mono">video_reg</span> on the next pass. A CHANGE VIDEO INPUT is answered with the previous input. The second reply byte can be held up by a whole sync wait (up to a field + 10 lines).</li>
    <li><b>Six-input leftovers from POD21.</b> <span class="mono">video_table</span>/<span class="mono">audio_table</span>, <span class="mono">switch_5</span>/<span class="mono">switch_6</span>, <span class="mono">check_input5/6</span> and the manual's "Video Inputs 1 through six" all come from the 6×1 POD21. Pod30serial.doc calls YYY 5–7 "invalid": YYY = 5/6 (F0 A8/B0) blanks all four lamps and leaves the mux alone; YYY = 7 (F0 B8) runs into the table's <span class="mono">return</span> with W = 7, so video_reg = 0x07: lamps 1 <i>and</i> 3 light, input 1 is selected and slave mode turns on.</li>
    <li><b>SLAVE AUDIO AND VIDEO (C1–C6) is ignored when slave is already on.</b> The block marked <span class="mono">;test</span> in <span class="mono">not_on</span> overwrites the new selection with <span class="mono">pre_output</span> if bit 5 is already clear.</li>
    <li><b>OUTPUT 1 is the inverted output.</b> The GS1528 drives OUTPUT 1 from U3-7 and OUTPUT 2 from U3-8 (complementary pins). SDI (NRZI) does not care; ASI (NRZ 8b/10b) does. The test department's 24 Jun 2010|43 note (<span class="mono">POD30-ASI PASS-24JUN10.pdf</span>): "ASI only on Output 2 using all 4 inputs. ASI is not on Output 1". RD67 requirement 3 (2013|46) asks for both outputs positive. The same scanned note is filed in M6203A and in POD27 (as POD28-…).</li>
    <li><b>Un-selected equalisers are muted, but the new one is un-muted one pass late.</b> <span class="mono">readgs1524</span> drives the selected GS1524's CD/MUTE low (forced on) and the others high (muted, output latched) — a crosstalk guard. It runs at the top of the pass, while <span class="mono">do_switch</span> runs at the bottom, so the GS1535 sees a latched, dead input for ≈${(C.PASS*1e6).toFixed(0)} µs right after each timed switch.</li>
    <li><b>Reference loss can hang the PIC.</b> <span class="mono">video_horizontal_synch_detect</span> has no timeout (it even contains <span class="mono">clrwdt</span>), so pulling REF IN during the 5–6 counted lines stops buttons, RS-485 and the slave port until a reference returns. With no reference at all, <span class="mono">video_vertical_synch_detect</span> times out after sync_count × 256 polls ≈ 16.7 ms — by coincidence one NTSC field — and switches on a random line.</li>
    <li><b>The first switch at power-up is not timed.</b> <span class="mono">init</span> calls <span class="mono">output_led</span> (which sets video_synch.0) and then clears video_synch, so the Timer2 fallback in <span class="mono">synch_check</span> does it after 8 ticks. INIT writes T2CON = 0xFF (1:16 prescaler), so the first tick takes 65 536 Tcy ≈ 53 ms; <span class="mono">timer_check</span> rewrites it to 1:1. <span class="mono">sync_count</span>/<span class="mono">sync_count1</span> are never initialised: the first un-referenced wait can last up to 65 536 polls (≈ 0.43 s) ${inf} (modelled with RAM = 0).</li>
    <li><b>Nothing is serviced while the switch waits.</b> The wait is up to one field + 10 lines. The USART FIFO holds 2 bytes, so one F0 + command survives, but a third byte overruns (OERR); <span class="mono">recieve_uart</span> recovers by toggling CREN. Try "Flood" in the console with a switch pending.</li>
    <li><b>Slave mode cannot survive without a slave.</b> <span class="mono">timer_check</span> counts 32 Timer2 ticks (≈107 ms) without a reply and forces pre_output bit 5 back to 1. POD30 has no slave button of its own; slave mode comes from RS-485 or from the audio switcher.</li>
    <li><b>The two serial documents disagree on the DE-9.</b> Pod30man.doc (2005|38): RX 3/8, TX 7/2. Pod30serial.doc (2011|44): TX 3/8, RX 7/2. Address F0 is fixed, so two POD30s on one RS-485 bus both answer.</li>
    <li><b>v101 does not fit the ISS2 board.</b> The PIC16F747 port reads LD on RB3 and SD/~HD on RE2. On pod30iss2.net, RB3 is the ICSP PGM pin (H13-6) and RE2 is unconnected, so v101 needs a different board — probably issue 3 in <span class="mono">PCB/WORKING</span> ${inf}. V020000 (2013|46) went back to the v100/PIC16F874 code.</li>
    <li><b>Why the 2013|46 change was needed.</b> In v1.00 <span class="mono">refresh</span> follows the raw LD bit (<span class="mono">lock1</span>) on every pass once <span class="mono">unstable</span> is clear. If the cable on the selected input is pulled while the other inputs carry signal, a reclocker that locks intermittently on crosstalk toggles SDI/ERROR and un-mutes the outputs pass by pass (in this model about 1,200 transitions a second ${inf}). Untick the mod, choose v1.00 and pull the cable on air to see it.</li>
    <li><b>Small leftovers.</b> INIT stores <span class="mono">spi_count</span> while bank 1 is selected (<span class="mono">ERRORLEVEL -302</span> hides the warning), so it lands in bank-1 RAM. <span class="mono">init_loop</span> re-writes every TRIS and ADCON1 on every pass. init.asm's "E2=AUD1 LED, E1=AUD2 LED, E0=ERROR LED" is POD21's pin-out (RE0/RE1 are buttons 3/4 here). The Custom 2008|41 CTV slave build is still in a project called <span class="mono">pod21.mcp</span>. VSYNCH is wired to RC1 but its <span class="mono">#define</span> is commented out. The CorelDRAW functional diagram draws the sync separator into the reclocker; the netlist sends it only to the PIC.</li>
    <li><b>The timed cut is an NTSC cut.</b> The switch lands ≈ 9–10.5 NTSC lines into the field. For a 1080i source that is frame-aligned to the black burst, that is about HD line 18–22 ${inf} — later than the line-7 switching point SMPTE RP 168 gives for 1080-line video, near the first active line.</li>
    <li><b>Mechanical.</b> The rear panel is POD21's rear panel with new silk ("POD30-REAR ISS.1 IS THE SAME AS POD21-REAR ISS.1"). The DE-9 is mounted upright on a 1.210 × .480" adaptor plate tapped 4-40 at .984" (DE-9 ISS 2, 14 Dec 2005|38: ".480 DIMENSION WAS .600"). The silk artwork is dated Jun.25/14 (2014|47); the panels Nov/Dec 2003|36.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>Main-loop pass = ${C.PASS_TCY} Tcy ≈ ${(C.PASS*1e6).toFixed(0)} µs, counted by hand from 30v100.asm (no .HEX or .LST is archived) ${inf}. Every time that is "N passes" scales with it.</li>
    <li>Sync-wait poll = 8 Tcy; ODD/EVEN edge 3.45 lines into each field; H pulses 4.7 µs active-low; GS4982 outputs idle high without a reference ${inf}.</li>
    <li>GS1535: LD falls the moment its data stops; re-lock takes 0.29 µs (same rate, within 1 ms) or 7.5 ms (tALOCK 5–10 ms) ${inf}. Crosstalk lock without the mod is a pseudo-random flicker ${inf}.</li>
    <li>PIC power-up timer 72 ms; power-up RAM = 0 ${inf} (configuration bits are not in the source).</li>
    <li>The POD10 side of the slave link is ${inf}, written to satisfy POD30's <span class="mono">SPI_rcv_ctrl</span>; MISO reads 0xFF with nothing connected.</li>
    <li>HD sources are assumed frame-aligned to the NTSC reference; the SDI words on the scope are illustrative bars with correct TRS/XYZ, and the scrambler is seeded at the window start ${inf}.</li></ul>`)
  + card('Sources', `<ul class="small mono">
    <li>#POD #SERIES/POD30 - #Master/POD30 - #Engineering/Software/V020000/30v100.asm, init.asm, autodetect.asm, video_sw.asm (+ v100, v101, 30r100, Custom)</li>
    <li>…/PCB/pod30iss2.net, POD30iss2.bom · …/MANUAL/Pod30man.doc, Pod30serial.doc · …/POD30 - Functional Diagram.cdr</li>
    <li>…/POD30 - #TESTREPORT/POD30-V020000-26AUG13.pdf, POD30-ASI PASS-24JUN10.pdf · …/POD30 - UpgradeTo3G-SDI #RD #RD67/ProjectRequirements.txt, Hardware/OldDesignGennum/</li>
    <li>…/POD30 - #ARTWORK #DA #2016/POD30-FRONT&amp;REAR-SILK (CURVE).pdf, Pics/ · …/POD30 - #Mechanical #DA #2016/*.pdf</li></ul>`);
}

/* ---------------- register plugin ---------------- */
SIM.register({
  id:'pod30', name:'POD30 · 4×1 HD/SD-SDI video switcher ('+Y(2003)+')', duration:1,
  product:'POD30', year:2003, family:'POD series',
  folder:'#POD #SERIES/POD30 - #Master',
  summary:'Half-rack 4×1 SDI switcher: four GS1524 equalisers into a GS1535 reclocker whose 4:1 mux a PIC16F874 flips on line 10 of a NTSC reference. Two outputs, RS-485 remote (F0 + command) and a slave port for audio-follow-video with a POD2 or POD10. The PIC firmware (v1.00 and V020000) is emulated pass by pass.',
  highlights:['PIC firmware emulated pass by pass with its own variables (V020000 and v1.00)','Front and rear panel on the real silkscreen; mechanical drawings and the DE-9 adaptor plate to scale','Reference-timed switch down to the H line, and the 155 ms mute that follows it','RS-485 console and slave-port link to a POD10','SDI/ASI bits on both outputs: why ASI only works on OUTPUT 2','11-step operator tutorial'],
  depth:'Full model',
  stepUnits:[
    {label:'1 NTSC field', period:()=>C.FIELD, phase:()=>D.refPh%C.FIELD},
    {label:'1 H line (63.6 µs)', period:()=>C.H, phase:()=>D.refPh%C.H},
    {label:'1 main-loop pass (≈149 µs)', period:()=>C.PASS},
    {label:'1 Timer2 tick (3.33 ms)', period:()=>C.T2_TCY*C.TCY},
    {label:'1 RS-485 byte (1.04 ms)', period:()=>C.BYTE_T},
    {label:'1 SD-SDI word (37 ns)', period:()=>1/27e6},
    {label:'10 ms', period:()=>0.01},
  ],
  zooms:[[1,'1 s (whole second)'],[0.2,'200 ms'],[C.FIELD,'1 field (16.7 ms)'],[0.004,'4 ms'],[0.0007,'700 µs (≈11 lines)'],[0.0002,'200 µs (1 loop pass)'],[0.00002,'20 µs'],[2e-7,'200 ns (SD-SDI words)']],
  defaultZoom:1,
  init(){ RES_KEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the POD30', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewAnatomy},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
