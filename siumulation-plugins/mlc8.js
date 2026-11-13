/* =====================================================================
   MLC8A — Multi-Channel Level Control (Ward-Beck Systems, 2006|39–2007|40)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Main model: MLC8A (AES 75/110 Ω 5.1+2). Firmware set = the one in
   software listing.xls for MLC8A: front Atmel V205, front Altera V200,
   main board AMS8-1 v106, SHARC mlc8v106.

   Sources used (all in this archive, folder "#MLC - #SERIES"):
   - MLC8 - #Engineering/MLC8 - #Software/MLC8A - #Software/atmel/v205/
       v200w.c (main, TRANSLATE_ENCODER1..9, GAIN_CONTROL_1..8, MASTER_VOLUME,
       CONVERT_DIAL_INFORMATION, MSB_LED, DIM_LED_BAR(_DOT), ALTERA_write,
       UART0_setup/transmit_counter/translate/com_check, LED_CHECK, FLASH_LEDS,
       TRANSLATE_SWITCHES, TRANSLATE_PUSHBUTTONS, SAVE/RECALL_PRESETn),
       encoder1..9.c (PROCESS_SHAFT_ENCODERn state table), common.c, v200W.mak
   - .../altera/v200/MLC8A.qsf, MLC8A.bdf, pwn_top.bdf, pwm_control.vhd,
       pwm_mod.vhd, pwm_demod.vhd, shift_in_out64.vhd, mclk_divider.vhd, blanking_pulse.vhd
   - .../AMS8-1/atmel/v106/v100w.c (main, UART0_transmit_counter, UART0_setup,
       ALTERA_SORT, ALTERA_TRANSLATE_UART0, SETTINGS_CHECK, ALIGNMENT_CHECK), v100w.mak
   - .../AMS8-1/sharc/mlc8v106/ams81_main.asm, ams81_INIT.ASM, ams81_ISR_table.ASM,
       ams81_vu_data.dat, volume_data.dat
   - MLC8 - #Engineering/MLC8 - #Archive/MLC8 COMMUNICATION PROTOCOL.doc,
       mlc8 operational  info #MANUAL.doc
   - MLC8 - #MANUAL/MLC-8A/Text/MLC8A(Corrected version).pdf (operator manual, 2007|40),
       PDF_s/MLC-8A(Front&rearview).pdf, MLC8-A(ConnectorLayout).pdf
   - MLC8 - #PCB/OBSOLETE/MLC8-iss2.bom (front-panel BOM: A6276, FDC634, 8 MHz, 12.288 MHz, LEDs)
   - MLC6 & MLC8 - #ARTWORK #DA #2016/MLC-8A-FRONT-SILK(CURVE MLC-M1).pdf (front silk),
       AMS8-M6-SILK(MLC8-M3) (CURVE).pdf (meter lens silk), Pics/MLC6A Front.jpg (colours)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const KEYFLAG = '__mlc8Active';

/* ---------------- constants from the source ---------------- */
const C = {
  F_LOOP: 5/6000,           // front main-loop pass — INFERRED: manual "hold about five seconds" ÷ PRESET_DEBOUNCE 6000
  PRESET_DEBOUNCE: 6000,    // v200w.c (XCK_8M000 branch)
  FLASH_CONSTANT: 300,      // FLASH_LEDS toggles led_flash_status every 301 passes
  PB_DEBOUNCE: 255, SW_DEBOUNCE: 255,
  NO_ACTIVITY: 5000,        // NO_ACTIVITY_THRESHOLD: termination-select timeout (passes)
  COMM1: 15000,             // COMMUNICATION_COUNTER1: passes with no request before loss_of_com
  RX_IDLE: 20, RX_RX: 100,  // RX_CONSTANT_IDLE / RX_CONSTANT_RX
  MUTE_GAIN_HOLD: 2, MUTE_HOLD: 3,
  DIVISOR: 8, LEDS: 25,
  BYTE_T: 10/38400,         // UART0 38400 8N1 (UBRR0L 0x19 + U2X on the front, 0x07 on the main board)
  M_BYTE: 1.82e-3,          // main board: "Transmit_Counter = 250, bytes approx. 1.82ms apart @ 4.9152MHz"
  M_LOOP: 5e-3,             // main-board loop without a send — INFERRED (dominated by the 640-bit ALTERA_read_write)
  M_COMM: 5,                // COMMUNICATION_COUNTER1/2 = 5 main-board loops before the other panel is polled
  FS: 48000,                // ops doc: "sample rate converters with an internal 48 kHz reference"
  CORE: 61.44e6,            // SHARC core clock — INFERRED (TPERIOD1 153600 → exactly 2.5 ms at 61.44 MHz)
  TPERIOD1: 153600,         // ams81_INIT.ASM timer 1 "generates mux rate"
  OSC: 12.288e6,            // front FPGA oscillator CSX750V-12.288 (BOM)
  DIAL_BIT: 2e-6,           // bit-banged dial bit with WDR() — INFERRED
  EE_WRITE: 8.5e-3,         // ATmega128 EEPROM write time (datasheet typ.); SAVE_PRESETn writes 20 bytes
  MB_BOOT: 0.95,            // main board: 15 × wait_ms(500) before the first poll — INFERRED duration
  F_BOOT: 0.002,            // front: initialization + ALTERA_RESET(1000) + DATA_initialization — INFERRED
  SHIFT_T: 17e-6,           // SHARC "shifter": 128 FLAG-toggled clocks — INFERRED
  RAMP: 0.019999,           // RAMP_TC in ams81_main.asm (gain smoothing per main-loop pass)
};
C.EE_STALL = 20*C.EE_WRITE;
C.POLL = (6+6)*C.M_BYTE + 2*C.M_COMM*C.M_LOOP;
C.MUX_T = C.TPERIOD1 / C.CORE;
C.PWM_BIT = 4*128/C.OSC;          // mclk_divider /128 → clockx4 96 kHz → pwm_control /4 → 24 kHz
C.PWM_FRAME = 73*C.PWM_BIT;       // pulse_counter 0…72: 64 data + 9 zero periods
C.FLASH_T = (C.FLASH_CONSTANT+1)*C.F_LOOP;
C.POLL0 = 0.003;
C.BLANK = 128/C.OSC;              // blanking_pulse counter 0x080 at 12.288 MHz

const CH = ['L','R','C','LFE','LS','RS','L (ST)','R (ST)'];
const CHID = ['A','B','C','D','E','G','H','I'];       // the letter F is skipped: "F,F" means mute
const KNOB = ['L','R','C','LFE','LS','RS','ST L','ST R','MASTER'];
const CAL = [-20,-18,-14,-12];
const vt = i => i*0.0155510613497460;                  // volume_data.dat: linear, 0 … +12 dB = 0 … 255
const OFS = 0.5623413;                                  // "GAIN OFFSET 12:00 equals unity" (applied to master and to each channel)
const db = x => x>0 ? 20*Math.log10(x) : -Infinity;
const fmtDb = (x,d=1) => isFinite(x) ? (x>0?'+':'')+x.toFixed(d)+' dB' : 'off';

/* PROCESS_SHAFT_ENCODERn state table (encoder1.c): (encoder_state+shaft) → [next state, action 1=UP 2=DOWN] */
const ENC_T = {0:[0,0],1:[20,0],2:[8,1],3:[0,0],4:[0,1],5:[4,0],6:[4,0],7:[28,0],8:[16,0],9:[8,0],10:[8,0],11:[12,1],12:[12,0],13:[4,1],14:[24,0],15:[12,0],
  16:[16,0],17:[20,2],18:[8,0],19:[16,0],20:[0,0],21:[20,0],22:[20,0],23:[28,2],24:[16,2],25:[24,0],26:[24,0],27:[12,0],28:[28,0],29:[4,0],30:[24,2]};
const CW_CODES = [1,0,2,3], CCW_CODES = [2,0,1,3];     // one detent = one quadrature cycle — INFERRED (detent type not documented)

/* ams81_vu_data.dat: table index → LEDs lit from the bottom (22 LEDs) */
const VU_RUNS = [[12,22],[16,21],[20,20],[24,19],[28,18],[32,17],[34,16],[36,15],[38,14],[40,13],[42,12],[44,11],[46,10],[48,9],[52,8],[56,7],[60,6],[64,5],[74,4],[82,3],[94,2],[114,1]];
const SCALE = ['14','12','10','8','6','4','3','2','1','0','1','2','3','4','6','8','10','12','16','20','26','34'];
function vuCount(idx){ if (idx<0) idx=0; for (const [m,n] of VU_RUNS) if (idx<=m) return n; return 0; }

/* ---------------- device state ---------------- */
const D = {
  power: true, link: true, remote: false,
  gain: [61,61,61,61,61,61,61,61], vol: 30,             // gainN = 61, VOLUME_START_UP 30 (main board restarts at 30 too)
  mute: [0,0,0,0,0,0,0,0], mmute: 0,
  rot: [2,2,2,2,2,2,2,2], mrot: 3,                       // muteN_rotations / mute_rotations
  enc: Array.from({length:9},()=>({st:0, up:13, down:30})),  // encoder_stateN, _hold_up, _hold_down
  mode: 1, source: 1,                                    // MODE1 = 5.1, MODE4 = ST · AES75 = 1, AES110 = 2
  preset: 0, presets: {1:null, 2:null}, pref: null, preset0: 0,
  lock: false, dim: false,
  held: {}, sourcePress: false, sourceMode: false, sourceUntil: 0, presetHold: 0,
  active: null,                                          // knob_activity {k, until}
  cable75: [true,true,true,true], cable110: [false,false,false,false], dd: [false,false,false,false],
  prog: 'film', cal: 0, sel: 0, clicks: 1,
  viewMux: false,
  log: [], markers: [], saves: [], bootAt: null, lastEnc: null, recalls: 0,
};
const snapshot = () => ({gain:D.gain.slice(), vol:D.vol, mute:D.mute.slice(), mmute:D.mmute, mode:D.mode, source:D.source});

/* ---------------- derived: audio path (ams81_main.asm sport0_isr) ---------------- */
const locked = p => D.power && (D.source===1 ? D.cable75[p] : D.cable110[p]);
function chGainLin(c){
  if (D.mmute || D.vol===0) return 0;                    // ALTERA_TRANSLATE_UART0: volume_level==0 || monitor==NO → all 0
  const dim = vt(D.dim? 21 : 66);                        // output2 = DIM_GAIN 21 / UNITY_DIM_GAIN 66
  const master = vt(D.vol)*OFS*dim;
  let src=c, g=c;
  if (D.mode===4){ if (c===0){ src=6; g=0; } else if (c===1){ src=7; g=1; } else if (c<6) return 0; }
  if (D.mute[g]) return 0;
  return {lin: vt(D.gain[g])*OFS*master, src};
}
function outputs(t){
  return CH.map((n,c)=>{ const r=chGainLin(c); if (!r) return {db:-Infinity, gainDb:-Infinity, src:c};
    const lv = inputLevel(r.src,t); return {gainDb: db(r.lin), db: lv.vu===null? -Infinity : lv.vu + db(r.lin), src:r.src}; });
}

/* ---------------- derived: input programme and meters ---------------- */
const PROG = {
  film:   {name:'5.1 film mix + stereo programme (simulated)', base:[-24,-24,-21,-30,-29,-29,-19,-19], mod:1, crest:7},
  tone:   {name:'Line-up tone −20 dBFS on all eight', base:[-20,-20,-20,-20,-20,-20,-20,-20], mod:0, crest:0},
  hot:    {name:'Hot stereo, quiet surround', base:[-14,-14,-26,-34,-36,-36,-9,-9], mod:1, crest:8},
  silence:{name:'Digital silence', base:null},
};
function nz(c,x){ const i=Math.floor(x), f=x-i; const h=n=>{ const s=Math.sin(n*127.1+c*311.7)*43758.5453; return (s-Math.floor(s))*2-1; }; return h(i)*(1-f)+h(i+1)*f; }
function envAt(c,t){
  const p=Math.floor(c/2);
  if (D.dd[p]) return -9 + 1.5*nz(c+9,t*40);           // non-PCM data metered as noise — INFERRED
  const P=PROG[D.prog]; if (!P.base) return -200;
  if (!P.mod) return P.base[c];
  const ph=c*1.7; return P.base[c] + 5*Math.sin(2*Math.PI*0.9*t+ph) + 3*Math.sin(2*Math.PI*2.7*t+2*ph) + 2.5*nz(c,t*12);
}
const LV_CACHE = {t:-1, v:null};
function inputLevel(c,t){
  if (LV_CACHE.t!==t || !LV_CACHE.v || LV_CACHE.key!==levelKey()){ LV_CACHE.t=t; LV_CACHE.key=levelKey(); LV_CACHE.v=[]; }
  if (LV_CACHE.v[c]) return LV_CACHE.v[c];
  const p=Math.floor(c/2);
  if (!locked(p)) return LV_CACHE.v[c]={vu:null, ppm:null};
  let pw=0; for (let i=0;i<16;i++){ pw += Math.pow(10, envAt(c, t-0.3*i/15)/10); } const vu = 10*Math.log10(pw/16);
  const crest = D.dd[p]? 3 : (PROG[D.prog].crest||0);
  let pk=-200; for (let i=0;i<24;i++){ const dt=i*0.065; pk=Math.max(pk, envAt(c,t-dt)+crest*(0.6+0.4*Math.abs(nz(c+3,(t-dt)*30))) - 20*dt/1.7); }
  return LV_CACHE.v[c]={vu: vu<-150?null:vu, ppm: pk<-150?null:pk};
}
function levelKey(){ return [D.prog, D.source, D.cable75.join(), D.cable110.join(), D.dd.join(), D.power].join('|'); }
function meterAt(c,t){
  const lv=inputLevel(c,t), ref=CAL[D.cal];
  const idx = v => v===null? 255 : Math.round(39 - 2*(v - ref));   // 0.5 dB per index, −20 dBFS → index 39 = "0" — INFERRED from table labels
  const n = vuCount(idx(lv.vu)), pn = vuCount(idx(lv.ppm));
  const p=Math.floor(c/2);
  return {n, dot: pn>0? pn-1 : -1, vu:lv.vu, ppm:lv.ppm, err: !locked(p), dd: D.dd[p] && locked(p)};
}
/* translate_meter_results: one 32-bit word per channel. bit31 = bottom LED … bit10 = top (+14); bit9 err, bit8 dd, bits0–3 mux select */
const SEL = [0x2,0x1,0x8,0x4];
function meterWord(c,t){
  const m=meterAt(c,t); const bar = n => n? ((0xFFFFFFFF << (32-n))>>>0) : 0;
  const pk = bar(m.dot+1); let w = (bar(m.n) | ((((pk<<1)>>>0) ^ pk)>>>0))>>>0;
  if (c<4) w = (w | SEL[c])>>>0;
  if (c%2===0){ if (m.err) w=(w|0x200)>>>0; if (m.dd) w=(w|0x100)>>>0; }
  return w;
}
const muxPhase = t => (Math.floor(t/C.MUX_T)+1)&3;    // mux_count: (mux&7)+1, then &3

/* ---------------- derived: dial rings (CONVERT_DIAL_INFORMATION etc.) ---------------- */
function convertDial(v){ if (v===0) return 0; let idx=Math.floor(v/C.DIVISOR); if (idx>C.LEDS) idx=C.LEDS; if (v<C.DIVISOR*2) return 1; return idx>=32? 0xFFFFFFFF : ((1<<idx)>>>0)-1; }
function msb(v){ for (let i=31;i>=0;i--) if ((v>>>i)&1) return ((1<<i)>>>0); return 0; }
function dimBar(v, dot){ let i=0; for (let b=31;b>=0;b--) if ((v>>>b)&1){ i=b+1; break; } if (!i) return 0;
  const sh = i>=7? 6 : i<3? 3 : 5; const bar = (v>>>sh)>>>0; return dot? ((((1<<(i-1))>>>0) | bar)>>>0) : bar; }
function ringBits(k, flashOn, loss){
  if (loss) return 0;
  const v = k<8? D.gain[k] : D.vol, base = convertDial(v);
  if (k<8){ if (D.mute[k]) return flashOn? msb(base) : 0; return base; }
  if (D.mmute) return flashOn? msb(base) : 0;
  if (D.dim) return dimBar(base, flashOn);              // DIM_LED_BAR_DOT / DIM_LED_BAR
  return base;
}

/* ---------------- front-panel main loop schedule (v200w.c main) ---------------- */
const FSTEPS = [
  ['WDR · SWITCH_ENCODER1…9', .10, 'Read the nine push switches (PINA, PING2) → TRANSLATE_ENCODERn: mute toggles'],
  ['SHAFT_ENCODER1…9', .14, 'Read A/B pins → TRANSLATE_SHAFT_ENCODERn → PROCESS_SHAFT_ENCODERn state table → encoder_actionN'],
  ['GAIN_CONTROL_1…8 · MASTER_VOLUME', .10, 'encoder_actionN UP/DOWN → gainN ±1 (0–255), tens/ones, gainN_take, knob_activity'],
  ['PROCESS_PUSHBUTTONS · TRANSLATE_PUSHBUTTONS', .06, 'PINB4–7 (via FPGA) → presets, 5.1 / ST, termination select'],
  ['UART0_setup · UART0_transmit_counter · UART0_translate · UART0_com_check', .16, 'Answer the main board one byte per pass; parse one received byte per pass'],
  ['LED_CHECK', .06, 'Preset / mode button LEDs (PORTE4–7); loss_of_com pattern; termination-select timeout'],
  ['ALTERA_write', .34, 'CONVERT_DIAL_INFORMATION for ring "update" → 16-bit dial_pwr + 32-bit LEDs → STROBE'],
  ['FLASH_LEDS', .04, 'flash_count: toggle led_flash_status every 301 passes (mute / dim blink)'],
];
const FFRAC = (()=>{ let a=0; return FSTEPS.map(s=>{ const r=a; a+=s[1]; return r; }); })();
let FS_KEY='', FSCH=null;
function frontSched(){
  const key=[D.power, D.bootAt, D.saves.join(',')].join('|');
  if (key===FS_KEY) return FSCH; FS_KEY=key;
  const passes=[]; if (!D.power){ FSCH={passes}; return FSCH; }
  let t=0, i=0, booted=false; const saves=D.saves.slice().sort((a,b)=>a-b); let si=0;
  while (t<1.0005){
    if (D.bootAt!==null && !booted && D.bootAt<t+C.F_LOOP && D.bootAt>=t){ passes.push({i:-1,t0:D.bootAt,t1:D.bootAt+C.F_BOOT,kind:'boot'}); t=D.bootAt+C.F_BOOT; i=0; booted=true; continue; }
    const p={i,t0:t,kind:'loop',stall:0};
    while (si<saves.length && saves[si]<t) si++;
    if (si<saves.length && saves[si]<t+C.F_LOOP){ p.stall=C.EE_STALL; p.kind='save'; si++; }
    p.t1=t+C.F_LOOP+p.stall; passes.push(p); t=p.t1; i++;
  }
  FSCH={passes}; return FSCH;
}
function passAt(t){ const ps=frontSched().passes; if (!ps.length) return null; let lo=0, hi=ps.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if (ps[m].t0<=t) lo=m; else hi=m-1; } return ps[lo]; }
function frontStepAt(t){
  const p=passAt(t); if (!p) return {pass:null, step:-1};
  if (p.kind==='boot') return {pass:p, step:-1};
  let rel=t-p.t0; const s3=FFRAC[3]*C.F_LOOP, s4=FFRAC[4]*C.F_LOOP;
  if (p.stall && rel>=s3){ if (rel<s4+p.stall) return {pass:p, step:3, stalled:true}; rel-=p.stall; }
  const f=rel/C.F_LOOP; let k=0; for (let j=0;j<FSTEPS.length;j++) if (f>=FFRAC[j]) k=j; return {pass:p, step:k};
}
const flashOnAt = t => { const p=passAt(t); return p && p.i>=0 ? Math.floor(p.i/(C.FLASH_CONSTANT+1))%2===1 : false; };
const ringScanAt = t => { const p=passAt(t); return p && p.i>=0 ? p.i%9 : -1; };
function lossAt(t){
  if (!D.power) return true;
  if (!D.link) return true;
  if (D.bootAt!==null && t>=D.bootAt){ const ps=polls(); const first=ps.find(q=>q.tReq>=D.bootAt); return !first || t < first.tReq + first.reqLen*C.M_BYTE; }
  return false;
}

/* ---------------- main board ↔ front panel polling (v100w.c / v200w.c) ---------------- */
const MSTEPS = [
  ['WDR · CS8416_READ_LOCK_ALL · RESET_CS8416_REF · TRANSLATE_AUDIO_INPUT_TYPE · ISOLATE_INPUT_STATUS · RESET_CS8416', .14, 'Lock status of the AES receivers → Astatus'],
  ['ALTERA_TRANSLATE_UART0 · ALTERA_SORT', .10, 'gains → volume1L…8L, master → output1, dim → output2, mode → REG1: the 80-byte block'],
  ['ALTERA_read_write (80 bytes)', .50, 'Bit-bang 640 bits each way on PC4–PC7 (FSYNCH, CLOCK, WRITE, DATA_READ)'],
  ['ALIGNMENT_CHECK · while(error0==0) NOP()', .02, 'After 200 misaligned passes, spin without WDR → watchdog reset'],
  ['DOLBY_error(PINE)', .02, 'Leftover from AMS8 (no Dolby card on MLC8A)'],
  ['UART0_translate · UART0_com_check · UART1_setup', .10, 'Parse the front-panel reply; after 5 loops hand over to UART1'],
  ['UART1_translate · UART1_com_check · UART0_setup', .08, 'Same for the remote panel (MLC8AR)'],
  ['DOLBY_RESET · SETTINGS_CHECK', .04, 'GAIN_LOCK (PINF3) and DIM_ENABLED (PINE4); save last settings after SETTINGS_COUNT quiet loops'],
];
const MFRAC = (()=>{ let a=0; return MSTEPS.map(s=>{ const r=a; a+=s[1]; return r; }); })();
let PK='', PS=null;
function polls(){
  const mk = D.markers.map(m=>m.kind+m.t).join(',');
  const key=[D.link, D.power, D.bootAt, D.remote, mk].join('|');
  if (key===PK) return PS; PK=key;
  const out=[]; if (!D.link || !D.power){ PS=out; return out; }
  let t=C.POLL0, k=0, first=false, booted=false;
  while (t<1.25){
    if (D.bootAt!==null && !booted && t>=D.bootAt){ t=D.bootAt+C.MB_BOOT; k=0; first=true; booted=true; continue; }
    const prev = out[out.length-1];
    const remoteChange = D.markers.some(m=>m.kind==='remote' && m.t>(prev?prev.tReq:-1) && m.t<=t);
    const p = {k, tReq:t, mainFull: first || remoteChange, why: first? 'first_uart0_tx after boot' : remoteChange? 'remote-panel change' : ''};
    p.reqLen = p.mainFull? 47 : 6;
    p.reqEnd = t + (p.reqLen-1)*C.M_BYTE + C.BYTE_T;
    p.tRep = p.reqEnd + 2*C.F_LOOP;
    const prevRep = prev? prev.tRep : -1;
    p.idle = ((k+7)%C.RX_IDLE)===C.RX_IDLE-1;
    p.change = D.markers.some(m=>(m.kind==='front'||m.kind==='preset') && m.t>prevRep && m.t<=p.tRep);
    p.full = p.idle || p.change;
    p.repLen = p.full? 47 : 4;
    p.repEnd = p.tRep + (p.repLen-1)*C.F_LOOP + C.BYTE_T;
    p.loop0 = t + p.reqLen*C.M_BYTE;
    p.winEnd = p.loop0 + C.M_COMM*C.M_LOOP;
    p.tReq1 = p.winEnd; p.req1End = p.tReq1 + 5*C.M_BYTE + C.BYTE_T;
    p.loop1 = p.tReq1 + 6*C.M_BYTE; p.end = p.loop1 + C.M_COMM*C.M_LOOP;
    out.push(p); t=p.end; k++; first=false;
  }
  out.forEach((p,i)=>{
    const tr = C.M_LOOP*(MFRAC[5]+0.05);
    if (p.repEnd < p.winEnd - C.M_LOOP*(1-MFRAC[5])){ const n=Math.max(0,Math.ceil((p.repEnd - p.loop0 - tr)/C.M_LOOP)); p.tApply = p.loop0 + n*C.M_LOOP + tr; }
    else { const q=out[i+1]; p.tApply = q? q.loop0 + tr : p.end + tr; p.late=true; }
    p.tFPGA = p.tApply - tr + C.M_LOOP + (MFRAC[2]+0.5)*C.M_LOOP;
    p.tSharc = p.tFPGA + 51/C.FS;
  });
  PS=out; return out;
}
const reqBytes = p => p.mainFull ? mainFullFrame() : [0x23,0x4C,D.lock?1:0,0x4E,D.dim?1:0,0x24];
function repBytes(p){
  if (!p.full) return [0x23,0x41,0x00,0x24];
  const b=[0x23];
  for (let c=0;c<8;c++){ b.push(CHID[c].charCodeAt(0), (p.idle||p.change)?1:0); if (D.mute[c]) b.push(0x46,0x46); else b.push(Math.floor(D.gain[c]/10), D.gain[c]%10); }
  b.push(0x56,1); if (D.mmute) b.push(0x46,0x46); else b.push(Math.floor(D.vol/10), D.vol%10);
  b.push(0x50,1,0x30+D.preset, 0x4D,1,D.mode, 0x53,1,D.source, 0x24);
  return b;
}
function mainFullFrame(){ const b=[0x23]; for (let c=0;c<8;c++){ b.push(CHID[c].charCodeAt(0),1); if (D.mute[c]) b.push(0x46,0x46); else b.push(Math.floor(D.gain[c]/10),D.gain[c]%10); }
  b.push(0x56,1); if (D.mmute) b.push(0x46,0x46); else b.push(Math.floor(D.vol/10),D.vol%10); b.push(0x50,1,0x30+D.preset,0x4D,1,D.mode,0x53,1,D.source,0x24); return b; }
function byteName(v){ if (v===0x23) return '#'; if (v===0x24) return '$'; if (v>=0x41&&v<=0x5A) return String.fromCharCode(v); if (v>=0x30&&v<=0x39) return "'"+String.fromCharCode(v)+"'"; return String(v); }
function nextPollAfter(t){ return polls().find(p=>p.tRep>=t); }
function mainLoopAt(t){
  const ps=polls(); const p=ps.find(q=>t>=q.tReq && t<q.end);
  if (!p) return {kind: D.bootAt!==null && t>=D.bootAt ? 'boot' : 'idle'};
  if (t<p.loop0) return {kind:'send0', p};
  if (t<p.tReq1){ const n=Math.floor((t-p.loop0)/C.M_LOOP), f=(t-p.loop0)/C.M_LOOP-n; let k=0; MFRAC.forEach((a,j)=>{ if (f>=a) k=j; }); return {kind:'loop', p, n, step:k}; }
  if (t<p.loop1) return {kind:'send1', p};
  const n=Math.floor((t-p.loop1)/C.M_LOOP), f=(t-p.loop1)/C.M_LOOP-n; let k=0; MFRAC.forEach((a,j)=>{ if (f>=a) k=j; }); return {kind:'loop', p, n:n+5, step:k};
}
/* the UART byte on the wire at t: {line, byte, bit, t0} */
function uartAt(t){
  for (const p of polls()){
    if (t<p.tReq-0.001) break;
    if (t>=p.tReq && t<p.reqEnd){ const i=Math.floor((t-p.tReq)/C.M_BYTE); const t0=p.tReq+i*C.M_BYTE; if (t-t0<C.BYTE_T) return {line:'main → front', byte:reqBytes(p)[i], i, t0, p}; }
    if (t>=p.tRep && t<p.repEnd){ const i=Math.floor((t-p.tRep)/C.F_LOOP); const t0=p.tRep+i*C.F_LOOP; if (t-t0<C.BYTE_T) return {line:'front → main', byte:repBytes(p)[i], i, t0, p}; }
  }
  return null;
}

/* ---------------- LEDs on the buttons (LED_CHECK, TRANSLATE_PUSHBUTTONS) ---------------- */
function pbLeds(t){
  if (!D.power) return {p1:0,p2:0,m51:0,mst:0};
  if (lossAt(t)){ const f=flashOnAt(t); return {p1:f,p2:!f,m51:f,mst:!f}; }   // PB_LED1+3 / PB_LED2+4 alternate
  if (D.sourceMode) return {p1:1,p2:1,m51:D.source===1,mst:D.source===2};
  return {p1:D.preset===1, p2:D.preset===2, m51:D.mode===1, mst:D.mode===4};
}

/* ================================================================
   USER ACTIONS — what the controls do in code
   ================================================================ */
function act(name, fn, kind, extra){
  const trace=[]; const tr=s=>trace.push(s);
  D._nochange=false; if (!D.power) tr('Unit is off — nothing happens.'); else fn(tr);
  if (D._nochange || !D.power) kind=null;
  const m = kind? Object.assign({t:SIM.t, kind, name}, extra||{}) : null;
  if (m){ D.markers.push(m); if (D.markers.length>14) D.markers.shift(); }
  if (m && (kind==='front'||kind==='preset') && D.power && D.link){
    const p=nextPollAfter(SIM.t);
    if (p){ tr(`→ Next poll: the main board's request starts at ${SIM.fmtT(p.tReq)}; this panel answers with the full 47-byte <span class="mono">#A…$</span> frame from ${SIM.fmtT(p.tRep)} (one byte per main-loop pass).`);
      tr(`→ The main board parses it at ≈ ${SIM.fmtT(p.tApply)}${p.late?' (the reply outlasts the 5-loop window, so it waits for the next poll — '+inf+')':''}, writes REG12/13 to its FPGA by ≈ ${SIM.fmtT(p.tFPGA)}, and the SHARC ramps the gain (RAMP_TC 0.02 → ≈1 ms). See the “Actions” lane.`); }
  }
  D.log.unshift({t:SIM.t, name, trace}); if (D.log.length>60) D.log.length=60;
  checkPreset(); SIM.refresh();
}
function gate(k, tr){
  // knob_activity: SWITCH_/SHAFT_ENCODERn only run when knob_activity is NO or n
  if (D.active && D.active.k!==k && SIM.t < D.active.until && SIM.t>=D.active.t){
    tr(`knob_activity = ${D.active.k+1}: SWITCH_ENCODER${k+1}() / SHAFT_ENCODER${k+1}() return without reading the pins until the change on ${KNOB[D.active.k]} has been sent.`);
    tr(`The simulator moves the playhead to ${SIM.fmtT(D.active.until)} (after that reply) — a hand is slower than one poll — and then applies your turn.`);
    const go=Math.min(SIM.duration, D.active.until+1e-5); D.active=null; SIM.seek(go);
  }
}
function setActive(k){ const p=nextPollAfter(SIM.t); D.active = p? {k, t:SIM.t, until:p.repEnd} : null; }
function gainControl(k, a, tr){
  if (k<8){
    if (D.lock){ tr(`GAIN_CONTROL_${k+1}(): gain_lock == YES → the turn is ignored (the main board set it from GAIN_LOCK)`); return false; }
    D.mute[k]=0; const o=D.gain[k];
    if (a===1){ if (D.gain[k]<255) D.gain[k]++; } else { if (D.gain[k]>0) D.gain[k]--; }
    return o!==D.gain[k] || true;
  }
  D.mmute=0; if (a===1){ if (D.vol<255) D.vol++; } else { if (D.vol>0) D.vol--; }
  return true;
}
function click(k, dir, tr){
  const e=D.enc[k], codes = dir>0? CW_CODES : CCW_CODES; const path=[]; let steps=0, unmuted=false;
  for (const code of codes){
    const s=e.st+code, [nx,a]=ENC_T[s]||[28,0]; let fire=0;
    if (a){
      const muted = k<8? D.mute[k] : D.mmute;
      if (muted){
        if (s===(a===1? e.up : e.down)){
          if (k<8){ D.rot[k]=(D.rot[k]-1)&255; if (D.rot[k]===0) fire=a; } else { D.mrot=(D.mrot-1)&255; if (D.mrot===0) fire=a; }
        }
      } else { if (a===1) e.up=s; else e.down=s; fire=a; }
    }
    path.push({from:e.st, code, sum:s, to:nx, a, fire});
    e.st=nx;
    if (fire){ const wasMuted = k<8? D.mute[k] : D.mmute; if (gainControl(k, fire, tr)){ steps+=fire===1?1:-1; if (wasMuted && !(k<8?D.mute[k]:D.mmute)) unmuted=true; } }
  }
  D.lastEnc={k, dir, path};
  return {steps, unmuted};
}
const A = {
  turn(k, dir, n){ n=n||D.clicks; act(`Turn ${KNOB[k]} ${dir>0?'clockwise':'counter-clockwise'}${n>1?' ×'+n:''}`, tr=>{
    gate(k,tr); if (!D.power) return;
    const before = k<8? D.gain[k] : D.vol, wasMuted = k<8? D.mute[k] : D.mmute;
    tr(`SHAFT_ENCODER${k+1}(): READ_SHAFT_ENCODER${k+1}() reads ${['PINF0/1','PING3/4','PIND0/1','PIND6/7','PING0/1','PINC0/1','PINC2/3','PINC4/5','PINC6/7'][k]} → TRANSLATE_SHAFT_ENCODER${k+1}() → PROCESS_SHAFT_ENCODER${k+1}(): one detent = 4 quadrature transitions ${inf}`);
    let tot=0, un=false; for (let i=0;i<n;i++){ const r=click(k,dir,tr); tot+=r.steps; un=un||r.unmuted; }
    const L=D.lastEnc.path; tr(`State path (last detent): ${L.map(s=>`${s.from}+${s.code}=${s.sum}→${s.to}${s.fire?(s.fire===1?' UP':' DOWN'):s.a?' (held)':''}`).join(' · ')}`);
    if (wasMuted){ const r = k<8? D.rot[k] : D.mrot;
      if (un) tr(`It was muted: each detent decremented ${k<8?'mute'+(k+1)+'_rotations':'mute_rotations'} only on the remembered transition (encoder_state${k+1}_hold_up/down). It reached 0 → encoder_action fires → ${k<8?'GAIN_CONTROL_'+(k+1):'MASTER_VOLUME'}() clears the mute.`);
      else tr(`Still muted: ${k<8?'mute'+(k+1)+'_rotations':'mute_rotations'} = ${r}${r>200?' — it wrapped past 0 (unsigned char), see Findings':''}. Keep turning, or press the knob.`); }
    const after = k<8? D.gain[k] : D.vol;
    if (k<8 && D.lock){ tr('Nothing changes: gain_lock is set. The master knob is not locked.'); D._nochange=true; return; }
    if (!tot && !un){ tr(`No encoder_action reached ${k<8?'GAIN_CONTROL_'+(k+1):'MASTER_VOLUME'}() on this detent (${wasMuted?'still muted':'state machine settling from rest, or at the end stop'}): nothing is sent.`); D._nochange=true; return; }
    tr(`${k<8?'GAIN_CONTROL_'+(k+1)+'(): gain'+(k+1):'MASTER_VOLUME(): volume'} ${before} → ${after} (0–255, ${tot>=0?'+':''}${tot} steps); ${k<8?'gain'+(k+1)+'_take':'volume_take'} = YES, new_data1 = YES, knob_activity = ${k+1}`);
    tr(`tens/ones = ${Math.floor(after/10)}/${after%10} (binary bytes, not ASCII). Ring: CONVERT_DIAL_INFORMATION(${after}) = ${Math.min(25,Math.floor(after/8))} LED${after<16&&after>0?' (below 16 only LED 1)':''}; ${k<8?'channel trim':'master'} = ${fmtDb(db(vt(after)*OFS))} ${inf}.`);
    setActive(k);
  }, 'front', {k}); },
  push(k){ act(`Press ${KNOB[k]} knob`, tr=>{
    gate(k,tr); if (!D.power) return;
    tr(`SWITCH_ENCODER${k+1}() reads ${k<8?'PINA'+k:'PING2'} low → TRANSLATE_ENCODER${k+1}(): release${k+1}==0 && switch${k+1}==0 → switch${k+1} = 1 (DEBOUNCE_ENCODER${k+1} waits 255 passes after release)`);
    if (k===8 && D.sourcePress){ D.sourceMode=true; D.sourcePress=false; D.sourceUntil=performance.now()+C.NO_ACTIVITY*C.F_LOOP*1000;
      tr('source_press == YES (both PRESET buttons held) → source_press = NO, source_mode = YES, activity_counter = 0');
      tr('TRANSLATE_PUSHBUTTONS(): source_mode → PB_LED1 + PB_LED2 on, 5.1 lit = AES75 (75 Ω), ST lit = AES110 (110 Ω). Times out after NO_ACTIVITY_THRESHOLD = 5000 passes ≈ 4.2 s (counted here in real seconds).'); return; }
    if (k<8 && D.lock){ tr(`gain_lock == YES → the mute toggle inside TRANSLATE_ENCODER${k+1} is skipped`); return; }
    if (k<8){ D.mute[k]=D.mute[k]?0:1; if (D.mute[k]) D.rot[k]=C.MUTE_GAIN_HOLD;
      tr(`ch${k+1}_mute = ${D.mute[k]?'YES':'NO'}; gain${k+1}_take = YES; new_data1 = YES; knob_activity = ${k+1}${D.mute[k]?'; mute'+(k+1)+'_rotations = MUTE_GAIN_HOLD_CONSTANT (2)':''}`);
      tr(D.mute[k]? `ALTERA_write: ring ${k+1} shows MSB_LED() only, blinking with led_flash_status; UART sends 'F','F' instead of tens/ones → main board gain${k+1}_monitor = NO → volume${k+1}L = 0` : `Ring and audio come back at gain ${D.gain[k]}`);
    } else { D.mmute=D.mmute?0:1; if (D.mmute) D.mrot=C.MUTE_HOLD;
      tr(`master_mute = ${D.mmute?'YES':'NO'}; volume_take = YES; knob_activity = 9${D.mmute?'; mute_rotations = MUTE_HOLD_CONSTANT (3)':''}`);
      tr(D.mmute? 'V field sent as F,F → main board monitor = NO → ALTERA_TRANSLATE_UART0 zeroes volume1L…10L: every output is silent' : 'All outputs return'); }
    setActive(k);
  }, 'front', {k}); },
  pbDown(b){
    if (!D.power) return; D.held[b]=performance.now();
    const isP = b==='p1'||b==='p2';
    if (isP && D.held.p1 && D.held.p2){ act('Hold PRESET 1 + 2 together', tr=>{ D.sourcePress=true;
      tr('TRANSLATE_SWITCHES(): (data & PRESET_MASK) == PRESET_MASK while switch_preset == YES → switch_preset = NO, source_press = YES, activity_counter = 0');
      tr('Now press the MASTER knob (while still holding) to enter termination select.'); }); return; }
    if (isP){ D.presetHold=0; act(`Press PRESET ${b==='p1'?1:2}`, tr=>{
      tr(`PROCESS_PUSHBUTTONS(): READ_SWITCHES(PINB) inverts PINB → PB${b==='p1'?4:5} set → TRANSLATE_SWITCHES(): pb = YES, switch_preset = YES, pb_temp = ${b==='p1'?'BIT4':'BIT5'}, preset_hold = '${D.preset}'`);
      tr('Nothing happens yet: a short press recalls on release; holding for PRESET_DEBOUNCE = 6000 passes (≈ 5 s) stores.'); }); return; }
    const st = b==='mst';
    act(`Press ${st?'ST':'5.1'}`, tr=>{
      tr(`TRANSLATE_SWITCHES(): mode_temp = data & MODE_MASK (${st?'BIT7':'BIT6'}), input_refresh = YES → TRANSLATE_PUSHBUTTONS(): ${st?'MODE4_PB':'MODE1_PB'} != 0`);
      if (D.sourceMode){
        const want = st? 2 : 1;
        if (D.source===want){ D.sourceMode=false; tr(`source_mode and source_select is already ${st?'AES110':'AES75'} (the lit button) → source_mode = NO, LEDS_OFF(), RESET_PRESETS() (re-recalls preset_hold '${D.presetHold}')`); return; }
        D.source=want; D.sourceUntil=performance.now()+4500*C.F_LOOP*1000;
        tr(`source_mode → source_select = ${st?'AES110 (110 Ω balanced, Phoenix)':'AES75 (75 Ω unbalanced, BNC)'}; source_take = YES; activity_counter = NO_ACTIVITY_THRESHOLD − 4500 = 500 (so 4500 passes ≈ 3.75 s remain)`);
        tr(`Main board: S field → source_select → ALTERA_SORT REG20 input routing (altera_aesN_input). ${[0,1,2,3].every(p=>locked(p))?'All four inputs lock.':'Pairs without a cable on that connector show ERR.'}`);
        return; }
      D.mode = st? 4 : 1;
      tr(`mode_select = ${st?'MODE4 (stereo)':'MODE1 (5.1)'}; PB_LED${st?4:3} on, PB_LED${st?3:4} off; mode_take = YES; new_data1 = YES`);
      tr(st? 'Main board REG1 = 4 → SHARC sport0_isr “is it mode 4?”: output 1 = input 7 × gain1, output 2 = input 8 × gain2, outputs 3–6 = 0. The front panel keeps the C, LFE, LS and RS knobs and rings live (see Findings).' : 'SHARC: every input i → output i × gainN × master × dim.');
    }, 'front', {k:-1});
  },
  pbUp(b){
    if (!D.power || !D.held[b]) return; const held=performance.now()-D.held[b]; delete D.held[b];
    const isP = b==='p1'||b==='p2';
    if (!isP){ return; }
    if (D.sourcePress || D.sourceMode){ if (!D.held.p1 && !D.held.p2) D.sourcePress=false; return; }
    if (D.presetHold) { D.presetHold=0; return; }   // already stored while held
    A.recall(b==='p1'?1:2, held);
  },
  recall(n, held){ act(`Release PRESET ${n} (recall)`, tr=>{
    tr(`TRANSLATE_SWITCHES(): released after ${held!==undefined? (held/1000).toFixed(1)+' s' : 'a short press'} with switch_preset == YES and read_information == NO → send_information = YES`);
    tr(`TRANSLATE_PUSHBUTTONS(): UART0_disable(); RECALL_PRESET${n}()`);
    const P=D.presets[n];
    if (P){ D.gain=P.gain.slice(); D.vol=P.vol; D.mute=P.mute.slice(); D.mmute=P.mmute; D.mode=P.mode;
      tr(`EEPROMread(${n===1?30:60}) == 0xAA → gains, volume, mutes and mode_select read back from addresses ${n===1?'1–19':'31–49'}`); }
    else tr(`EEPROMread(${n===1?30:60}) != 0xAA (nothing stored) → nothing is loaded. preset = '${n}' is still set, so the PRESET ${n} LED lights anyway (see Findings).`);
    D.preset=n; D.pref=snapshot(); D.recalls++; D.lastRecall=n;
    tr(`preset = '${n}'; preset_press = YES → UART0_setup sends every parameter (all *_take = YES) on the next poll; pgainN = gainN so LED_CHECK keeps PRESET ${n} lit until something changes. Mute rotation counters are not reset.`);
    tr('The source (75/110 Ω) is not part of a preset in v205: SAVE_DATA(20, source_select) is commented out.');
  }, 'preset'); },
  store(n){ D.presetHold=n; D.saves.push(SIM.t); FS_KEY=''; act(`Hold PRESET ${n} (≈5 s) → store`, tr=>{
    tr(`TRANSLATE_SWITCHES(): (data & PRESET_MASK) == pb_temp → preset_counter counts to PRESET_DEBOUNCE (6000 passes ≈ 5 s ${inf}) → switch_preset = NO, read_information = YES`);
    tr(`TRANSLATE_PUSHBUTTONS(): UART0_disable(); SAVE_PRESET${n}(): SAVE_DATA() × 20 — gains, volume, 9 mutes, mode_select at ${n===1?'1–19':'31–49'}, key 0xAA at ${n===1?30:60}`);
    tr(`Each EEPROM byte takes ≈ 8.5 ms (ATmega128 datasheet), so the loop stalls ≈ ${(C.EE_STALL*1000).toFixed(0)} ms. ALTERA_write is not called meanwhile: the ring scan freezes on one ring — this is the “flicker” the manual mentions ${inf}. Scrub past the playhead on the timeline.`);
    D.presets[n]=snapshot(); D.preset=n; D.pref=snapshot();
    tr(`preset = '${n}'; preset_press = YES → the next reply sends everything; LED_CHECK lights PRESET ${n}.`);
  }, 'preset'); },
  bothMaster(){ D.held.p1=D.held.p2=performance.now(); A.pbDown('p2'); A.push(8); delete D.held.p1; delete D.held.p2; D.sourcePress=false; },
  setLock(on){ act(`Main board GAIN_LOCK input ${on?'closed':'open'}`, tr=>{ D.lock=on;
    tr(`v100w.c SETTINGS_CHECK(): (GAIN_LOCK = PINF & BIT3) == 0 → gain_lock = ${on?'YES':'NO'} (PF3 has its pull-up switched on by uart0_init's “set U10 to be TX” line)`);
    tr(`Next request: <span class="mono">#L${on?'\\x01':'\\x00'}N${D.dim?'\\x01':'\\x00'}$</span> → front UART0_translate(): rx_buffer[1] == YES → gain_lock = ${on?'YES':'NO'}`);
    if (on) tr('Locks: the eight channel knobs (turn and mute). Not locked: MASTER (turn and mute), 5.1 / ST, presets — a preset recall still overwrites the locked gains.'); }, 'gpi'); },
  setDim(on){ act(`Main board DIM_ENABLED input ${on?'closed':'open'}`, tr=>{ D.dim=on;
    tr(`SETTINGS_CHECK(): (DIM_ENABLED = PINE & BIT4) == 0 → dim_enabled = ${on?'YES':'NO'}; ALTERA_TRANSLATE_UART0: output2 = ${on?'DIM_GAIN (21)':'UNITY_DIM_GAIN (66)'} → SHARC output_gain+1 multiplies the master (“added dim gain”, v105)`);
    tr(`Dim = vt(21)/vt(66) = ${fmtDb(db(vt(21)/vt(66)),2)} relative; “unity” 66 is itself ${fmtDb(db(vt(66)),2)}.`);
    tr(`Front panel learns it from the N field: dim_enabled → ALTERA_write ring 9 uses ${on?'DIM_LED_BAR_DOT / DIM_LED_BAR: the bar drops 6 LEDs and the undimmed position blinks':'the plain bar'}.`); }, 'gpi'); },
  remoteMute(c){ act(`MLC8AR remote: press ${KNOB[c]}`, tr=>{
    if (!D.remote){ tr('No remote panel on SERIAL COMM — click the DB9 on the rear panel to connect one.'); return; }
    D.mute[c]=D.mute[c]?0:1;
    tr(`Remote → main board UART1 (#A…$, ${CHID[c]} take = YES, F,F) → main board new_data → next front request is the full 47-byte #A frame`);
    tr(`Front UART0_translate(): rx_buffer[${4*c+2}] == chF && rx_buffer[${4*c+3}] == chF → ch${c+1}_mute = ${D.mute[c]?'YES':'NO'}. mute${c+1}_rotations is NOT reset here (it is ${D.rot[c]}).`);
    if (D.mute[c] && D.rot[c]===0) tr(`mute${c+1}_rotations is 0 (the last unmute was by turning), so the next decrement wraps to 255: unmuting this channel by turning now takes ≈ 256 detents. Pressing the knob still works.`);
  }, 'remote'); },
  cable(kind, p){ act(`${D[kind][p]?'Unplug':'Plug in'} AES IN ${p+1} (${kind==='cable75'?'75 Ω BNC':'110 Ω Phoenix'})`, tr=>{ D[kind][p]=!D[kind][p];
    tr(`CS8416_READ_LOCK_ALL() → Astatus bit ${p} = ${locked(p)?'locked':'unlocked'} (source_select = ${D.source===1?'AES75':'AES110'}) → ALTERA_SORT REG19 byte 72 bits 3–0 → FPGA → SHARC TDM_IN_ctl+18 bits 24–27`);
    tr(`translate_meter_results: ${locked(p)?'err bit cleared':'err bit (bit 9) set on channel '+(2*p+1)+'’s word'} → ERR LED of pair ${p+1} ${locked(p)?'off':'on'} (v102: “error display on meter display for no lock”)`); }); },
  setRemote(on){ act(`${on?'Connect':'Disconnect'} the MLC8AR remote (SERIAL COMM)`, tr=>{ D.remote=on;
    tr('The main board polls UART1 whether or not a remote is there (UART1_com_check after 5 loops). The DB9 also carries METER± — the front FPGA’s PWM meter stream (data_out1/2).'); }); },
  power(){ const on=!D.power; act(on?'Power on':'Power off', tr=>{ tr('Both boards lose power: front-panel RAM (gains, mutes, knob_activity) is lost; presets survive in the front EEPROM, last settings in the main-board EEPROM.'); }); D.power=on; FS_KEY=''; PK='';
    if (on){ D.bootAt=SIM.t; D.markers.push({t:SIM.t,kind:'boot',name:'boot'}); D.active=null; D.sourceMode=false; D.sourcePress=false;
      D.log[0].trace=['Front: initialization() (port_init, watchdog_init WDTCR=0x08, uart0_init), ALTERA_RESET(1000), DATA_initialization(), ALTERA_write()',
        'Front: loss_of_com = YES until the first #…$ arrives → rings dark, PB LEDs 1+3 / 2+4 alternate at the flash rate',
        `Main board: 9 × wait_ms(500), CONFIGURE_ALTERA, 6 × wait_ms(500), RECALL_LAST_SETTINGS (volume_level = 30 // -30dB), init_CS8416, RESET_SHARC — first poll ≈ ${C.MB_BOOT} s later ${inf}`,
        'The first request is a full #A frame (first_uart0_tx), so the front panel takes the main board’s last settings.'];
      D.vol=30; D.mmute=0; } else { D.bootAt=null; }
    SIM.refresh(); },
  setLink(on){ act(on?'Reconnect the front-panel link':'Disconnect the front-panel link (main board stops polling)', tr=>{ D.link=on; PK='';
    tr(on? 'Next request → UART0_translate → loss_of_com = NO' : `UART0_com_check(): start_com_timer counts COMMUNICATION_COUNTER1 = 15000 passes (≈ ${(C.COMM1*C.F_LOOP).toFixed(1)} s ${inf}) with no request → loss_of_com = YES → ALTERA_write sends 0 for every ring; LED_CHECK alternates PB LEDs. (Shown immediately here.)`); }); },
  reset(){ Object.assign(D, {power:true, link:true, remote:false, vol:30, mmute:0, mrot:3, mode:1, source:1, preset:0, presets:{1:null,2:null}, pref:null, lock:false, dim:false,
      sourceMode:false, sourcePress:false, active:null, prog:'film', cal:0, log:[], markers:[], saves:[], bootAt:null, lastEnc:null, recalls:0, held:{}, presetHold:0});
    D.gain=[61,61,61,61,61,61,61,61]; D.mute=[0,0,0,0,0,0,0,0]; D.rot=[2,2,2,2,2,2,2,2]; D.enc=Array.from({length:9},()=>({st:0,up:13,down:30}));
    D.cable75=[true,true,true,true]; D.cable110=[false,false,false,false]; D.dd=[false,false,false,false]; FS_KEY=''; PK=''; SIM.refresh(); },
};
function checkPreset(){
  if (!D.preset || !D.pref) return;
  const s=snapshot(), p=D.pref;
  if (s.vol!==p.vol || s.mmute!==p.mmute || s.mode!==p.mode || s.source!==p.source || s.gain.some((g,i)=>g!==p.gain[i]) || s.mute.some((m,i)=>m!==p.mute[i])){
    D.preset=0; if (D.log[0]) D.log[0].trace.push(`LED_CHECK(): a value differs from pgainN/pvolume/pmode_select → preset = '0' (PRESET LED off), preset_take = YES`); }
}
/* wall-clock timers: preset hold → store; termination-select timeout */
function tick(){
  const now=performance.now();
  for (const b of ['p1','p2']) if (D.held[b] && !D.held.p1 !== !D.held.p2 && !D.presetHold && !D.sourcePress && now-D.held[b] >= C.PRESET_DEBOUNCE*C.F_LOOP*1000){ A.store(b==='p1'?1:2); }
  if (D.sourceMode && now>D.sourceUntil){ D.sourceMode=false; D.log.unshift({t:SIM.t, name:'Termination select times out', trace:['LED_CHECK(): activity_counter == NO_ACTIVITY_THRESHOLD → source_mode = NO, RESET_PRESETS() (re-recall preset_hold if it was 1 or 2)','The 5.1 and ST buttons go back to selecting the mode.']}); SIM.refresh(); }
}

/* ================================================================
   DRAWING: front panel on the real silkscreen, meter window, rear
   ================================================================ */
/* Front silk: MLC-8A-FRONT-SILK(CURVE MLC-M1).pdf (2016|49) GREEN and WHITE separations at 200 dpi → 3420 × 330 px.
   Meter lens: AMS8-M6-SILK(MLC8-M3) (CURVE).pdf, placed so its screw and knob holes land on the front panel's
   (offset +95.5, +14.5 px). Knob centres: the drill crosshairs/circles (L at x 1026.5, pitch 200, y 164.5; MASTER 2726.5);
   button centres 3098.5/3243.5 × 93.5/233.5. LED columns and rows: the CH labels and scale rows on the lens. */
/* Artwork 2026|59: the default face is the CorelDRAW vector art itself: assets/mlc8-front.svg from
   MLC-8A-FRONT-SILK(CURVE MLC-M1).cdr (viewBox = its panel outline 89.5,265.8, 1231.2 × 118.7 pt; GREEN plate in green,
   WHITE plate moved up 249.3 pt; the panel outline, which this sheet draws in ink-black hairline, and the holes in grey)
   and assets/mlc8-lens.svg from AMS8-M6-SILK(MLC8-M3) (CURVE).cdr (window 109.0,127.5, 216 × 108 pt). Same frame as the
   200 dpi PNGs, so knobs, rings, buttons and LEDs stay on their holes. Drill crosshairs (0.5 pt) are left out.
   The rear stays on the manual drawing: the only rear .cdr in the MLC8 SILK folder (mlc8-rear-silk-CURVE.cdr, 2006|39)
   is the SDI / AES variant, not the 8A. The PNGs stay behind the "PNG silk" toggle. */
const ART = { png:false, DIR:'#MLC - #SERIES/MLC6 & MLC8 - #ARTWORK #DA #2016/', FRONT:'MLC-8A-FRONT-SILK(CURVE MLC-M1).cdr', LENS:'AMS8-M6-SILK(MLC8-M3) (CURVE).cdr' };
const artSrc = k => SIM.src(ART.DIR+ART[k], ART[k]);
function artNote(){
  return `<div class="small muted" style="margin-top:4px">Artwork: ${artSrc('FRONT')} (Jan 18 2016, GREEN + WHITE plates) and the lens ${artSrc('LENS')}, CorelDRAW vector art. <label><input type="checkbox" class="artpng" ${ART.png?'checked':''}> show the earlier PNG silk (200 dpi cut of the PDFs)</label></div>`;
}
function bindArt(m){ m.querySelectorAll('.artpng').forEach(c=> c.onchange=e=>{ ART.png=e.target.checked; m.querySelectorAll('.artpng').forEach(o=>o.checked=ART.png); SIM.refresh(); }); }
const KX = k => k<8? 1026.5+200*k : 2726.5, KY = 164.5;
const PBX = {p1:[3098.5,93.5], p2:[3243.5,93.5], m51:[3098.5,233.5], mst:[3243.5,233.5]};
const MCOL = [224.5,295.5,365.5,435.5,535.5,605.5,675.5,745.5];
const MROW = r => 29 + 12*r;
const PAIRX = [262,402,572,712];
const ledCol = r => r<4? '#ff3b2f' : r<12? '#ffc23a' : '#6dff5a';             // 4 red, 8 yellow, 10 green per channel — INFERRED from BOM counts
const ledOff = r => r<4? '#2a1513' : r<12? '#2a2410' : '#152614';
function ringSVG(k, bits, scan){
  const x=KX(k), big=k===8, R=big?76:53, r=big?7.2:5.6; let s='';
  for (let i=0;i<25;i++){ const a=(-135+i*11.25)*Math.PI/180, cx=x+R*Math.sin(a), cy=KY-R*Math.cos(a), on=(bits>>>i)&1;
    s+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="${on?(i===12?'#ffb43a':'#7dff6a'):(i===12?'#2d2412':'#16261a')}"${on?' filter="url(#mg)"':''}/>`; }
  return s;
}
function frontSVG(t, opts){
  opts=opts||{};
  const loss=lossAt(t), flash=flashOnAt(t), scan=ringScanAt(t), mux=muxPhase(t), pb=pbLeds(t);
  let s=`<svg viewBox="${opts.vb||'0 0 3420 330'}" role="img" aria-label="MLC8A front panel on the real silkscreen" style="width:100%;display:block;border-radius:6px;background:#141517">
    <defs><filter id="mg" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="kn" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#3a3d40"/><stop offset="1" stop-color="#101112"/></radialGradient></defs>
    <rect width="3420" height="330" fill="#141517"/>
    <rect x="183" y="4" width="600" height="322" fill="#070808"/>`;
  // meters
  for (let c=0;c<8;c++){
    const m=meterAt(c,t), litNow = !opts.mux || c===mux || c===mux+4;
    for (let r=0;r<22;r++){ const j=21-r; const on = D.power && litNow && (j<m.n || j===m.dot);
      s+=`<rect x="${MCOL[c]-11}" y="${MROW(r)-4}" width="22" height="8" rx="1.5" fill="${on?ledCol(r):ledOff(r)}"${on?' filter="url(#mg)"':''}/>`; }
  }
  for (let p=0;p<4;p++){ const c=2*p, m=meterAt(c,t), litNow = !opts.mux || c===mux || c===mux+4;
    const e = D.power && litNow && m.err, d = D.power && litNow && m.dd;
    s+=`<circle cx="${PAIRX[p]}" cy="222" r="5" fill="${d?'#ffc23a':'#2a2410'}"${d?' filter="url(#mg)"':''}/><circle cx="${PAIRX[p]}" cy="259" r="5" fill="${e?'#ff3b2f':'#2a1513'}"${e?' filter="url(#mg)"':''}/>`; }
  s+= ART.png? `<image href="${ASSET}mlc8-lens-white.png" x="182.5" y="14.5" width="600" height="300"/>
    <image href="${ASSET}mlc8-front-green.png" width="3420" height="330"/><image href="${ASSET}mlc8-front-white.png" width="3420" height="330"/>`
    : `<image href="${ASSET}mlc8-lens.svg" x="182.5" y="14.5" width="600" height="300" preserveAspectRatio="none"/><image href="${ASSET}mlc8-front.svg" width="3420" height="330" preserveAspectRatio="none"/>`;
  // knobs and rings
  for (let k=0;k<9;k++){
    const x=KX(k), big=k===8, hole=big?94.5:66.5, kr=big?56:38;
    const lit = D.power && (!opts.mux || k===scan);
    s+=`<g class="knob" data-k="${k}" style="cursor:pointer"><circle cx="${x}" cy="${KY}" r="${hole}" fill="#060707" stroke="#2a2c2e" stroke-width="2"/>
      ${ringSVG(k, lit? ringBits(k, flash, loss) : 0, scan)}
      <circle cx="${x}" cy="${KY}" r="${kr}" fill="url(#kn)" stroke="${D.sel===k?'var(--accent)':'#2b2d2f'}" stroke-width="${D.sel===k?5:3}"/>
      ${Array.from({length:12},(_,i)=>{ const a=i*30*Math.PI/180; return `<line x1="${(x+(kr-8)*Math.sin(a)).toFixed(1)}" y1="${(KY-(kr-8)*Math.cos(a)).toFixed(1)}" x2="${(x+(kr-2)*Math.sin(a)).toFixed(1)}" y2="${(KY-(kr-2)*Math.cos(a)).toFixed(1)}" stroke="#2e3133" stroke-width="3"/>`; }).join('')}
      <circle cx="${x}" cy="${KY}" r="${hole+4}" fill="transparent"><title>${KNOB[k]}: click left = counter-clockwise, centre = press (mute), right = clockwise; mouse wheel turns</title></circle></g>`;
  }
  // illuminated buttons
  for (const b in PBX){ const [x,y]=PBX[b], on=pb[b];
    s+=`<g class="pb" data-b="${b}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="38.5" fill="#060707"/><rect x="${x-27}" y="${y-27}" width="54" height="54" rx="7" fill="${on?'#ffd84a':'#3b3522'}" stroke="#1d1b12" stroke-width="3"${on?' filter="url(#mg)"':''}/>
      <rect x="${x-14}" y="${y-8}" width="28" height="16" rx="2" fill="${on?'#fff3b0':'#4a4430'}" opacity=".8"/>
      ${D.held[b]?`<circle cx="${x}" cy="${y}" r="34" fill="none" stroke="var(--play)" stroke-width="5"/>`:''}</g>`; }
  if (!D.power) s+=`<rect width="3420" height="330" fill="#000" opacity=".25"/>`;
  s+=(opts.hot||'')+'</svg>';
  return s;
}
function rearSVG(){
  const bnc=[1183,1247,1314,1377], phx=[1282,1339,1396,1453];
  let s=`<svg viewBox="0 0 1814 176" role="img" aria-label="MLC8A rear panel (manual drawing)" style="width:100%;display:block;border-radius:6px;background:#202326">
    <rect width="1814" height="176" fill="#202326"/><image href="${ASSET}mlc8-rear.png" width="1814" height="176"/>`;
  bnc.forEach((x,p)=>{ const on=D.cable75[p]; s+=`<g class="jack" data-j="cable75" data-p="${p}" style="cursor:pointer">${on?`<circle cx="${x}" cy="51" r="21" fill="#2b5f9e" stroke="#9cc3f0" stroke-width="2"/><rect x="${x-7}" y="0" width="14" height="32" fill="#2b5f9e"/>`:''}
      <circle cx="${x}" cy="51" r="28" fill="transparent"><title>IN ${p+1} 75 Ω BNC — click to ${on?'unplug':'plug in'}</title></circle>
      <circle cx="${x+22}" cy="24" r="6" fill="${locked(p)&&D.source===1?'var(--accent)':on?'var(--warn)':'#555'}"/></g>`; });
  phx.forEach((x,p)=>{ const on=D.cable110[p]; s+=`<g class="jack" data-j="cable110" data-p="${p}" style="cursor:pointer">${on?`<rect x="${x-25}" y="118" width="50" height="40" rx="4" fill="#1f8a45" stroke="#9fe0b4" stroke-width="2"/><rect x="${x-6}" y="158" width="12" height="18" fill="#1f8a45"/>`:''}
      <rect x="${x-28}" y="114" width="56" height="54" fill="transparent"><title>IN ${p+1} 110 Ω Phoenix — click to ${on?'unplug':'plug in'}</title></rect>
      <circle cx="${x+22}" cy="110" r="6" fill="${locked(p)&&D.source===2?'var(--accent)':on?'var(--warn)':'#555'}"/></g>`; });
  s+=`<g class="jack" data-j="remote" style="cursor:pointer">${D.remote?`<rect x="584" y="58" width="44" height="62" rx="6" fill="#3a74b8" stroke="#9cc3f0" stroke-width="2"/>`:''}<rect x="575" y="40" width="62" height="100" fill="transparent"><title>SERIAL COMM (RS-422 to the MLC8AR remote; also METER±) — click to ${D.remote?'disconnect':'connect'} a remote</title></rect></g>
    <text x="10" y="170" font-size="13" fill="#aab">Manual drawing MLC-8A(Front&amp;rearview).pdf, 2007|40 — click the IN connectors and SERIAL COMM</text></svg>`;
  return s;
}
let dragK=null;
function bindPanel(root){
  root.querySelectorAll('.knob').forEach(g=>{
    const k=+g.dataset.k;
    g.addEventListener('click', e=>{ D.sel=k; const r=g.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width; if (x<0.36) A.turn(k,-1); else if (x>0.64) A.turn(k,1); else A.push(k); });
    g.addEventListener('wheel', e=>{ e.preventDefault(); D.sel=k; A.turn(k, e.deltaY<0?1:-1, e.shiftKey?10:D.clicks); }, {passive:false});
  });
  root.querySelectorAll('.pb').forEach(g=>{
    const b=g.dataset.b;
    g.addEventListener('pointerdown', e=>{ e.preventDefault(); A.pbDown(b); const up=()=>{ window.removeEventListener('pointerup',up); A.pbUp(b); SIM.refresh(); }; window.addEventListener('pointerup', up); });
  });
  root.querySelectorAll('.jack').forEach(g=> g.addEventListener('click', ()=>{ const j=g.dataset.j; if (j==='remote') A.setRemote(!D.remote); else A.cable(j, +g.dataset.p); }));
}
function controlsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px">
    <label class="small">Knob <select data-c="sel">${KNOB.map((n,i)=>`<option value="${i}" ${i===D.sel?'selected':''}>${i+1} ${n}</option>`).join('')}</select></label>
    <button data-a="l" title="Q">⟲ turn</button><button data-a="p" title="W">press</button><button data-a="r" title="E">turn ⟳</button>
    <label class="small">detents per click <select data-c="clk">${[1,2,4,8,16].map(n=>`<option ${n===D.clicks?'selected':''}>${n}</option>`).join('')}</select></label>
    <span class="small muted" style="margin-left:8px">Buttons</span>
    <button data-a="t1" title="P">PRESET 1 tap</button><button data-a="h1" title="Shift+P">hold 1 (store)</button>
    <button data-a="t2" title="O">PRESET 2 tap</button><button data-a="h2" title="Shift+O">hold 2 (store)</button>
    <button data-a="m51" title="M">5.1</button><button data-a="mst" title="S">ST</button>
    <button data-a="both" title="B">hold 1+2 &amp; press MASTER</button></div>
    <div class="small muted" style="margin-top:4px">Click a knob's left third to turn it counter-clockwise, its centre to press it (mute), its right third to turn clockwise; the mouse wheel turns it (Shift = 10 detents). Hold a PRESET button for 5 real seconds to store. Keys: 1–9 pick a knob, Q W E turn/press, P O presets (Shift = store), M S modes, B termination select.</div>`;
}
function bindControls(root){
  const map={l:()=>A.turn(D.sel,-1), p:()=>A.push(D.sel), r:()=>A.turn(D.sel,1), t1:()=>{A.pbDown('p1');A.pbUp('p1');}, t2:()=>{A.pbDown('p2');A.pbUp('p2');},
    h1:()=>A.store(1), h2:()=>A.store(2), m51:()=>{A.pbDown('m51');A.pbUp('m51');}, mst:()=>{A.pbDown('mst');A.pbUp('mst');}, both:()=>A.bothMaster()};
  root.querySelectorAll('[data-a]').forEach(b=> b.onclick=()=>map[b.dataset.a]());
  const s=root.querySelector('[data-c=sel]'); if (s) s.onchange=e=>{ D.sel=+e.target.value; SIM.refresh(); };
  const k=root.querySelector('[data-c=clk]'); if (k) k.onchange=e=>{ D.clicks=+e.target.value; };
}
document.addEventListener('keydown', e=>{
  if (!window[KEYFLAG] || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key; let done=true;
  if (/^[1-9]$/.test(k)){ D.sel=+k-1; SIM.refresh(); }
  else if (k==='q'||k==='Q') A.turn(D.sel,-1, e.shiftKey?10:undefined);
  else if (k==='w'||k==='W') A.push(D.sel);
  else if (k==='e'||k==='E') A.turn(D.sel,1, e.shiftKey?10:undefined);
  else if (k==='p') { A.pbDown('p1'); A.pbUp('p1'); } else if (k==='P') A.store(1);
  else if (k==='o') { A.pbDown('p2'); A.pbUp('p2'); } else if (k==='O') A.store(2);
  else if (k==='m'||k==='M'){ A.pbDown('m51'); A.pbUp('m51'); }
  else if (k==='s'||k==='S'){ A.pbDown('mst'); A.pbUp('mst'); }
  else if (k==='b'||k==='B') A.bothMaster();
  else done=false;
  if (done) e.preventDefault();
});
function signalsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
    <label class="small">Programme on the inputs <select data-s="prog">${Object.keys(PROG).map(k=>`<option value="${k}" ${k===D.prog?'selected':''}>${PROG[k].name}</option>`).join('')}</select></label>
    <label class="small">Calibration DIP (SW3/SW4) <select data-s="cal">${CAL.map((v,i)=>`<option value="${i}" ${i===D.cal?'selected':''}>${v} dBFS = 0</option>`).join('')}</select></label></div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
    <span class="small muted">Main-board inputs:</span>
    <label class="small"><input type="checkbox" data-s="lock" ${D.lock?'checked':''}> GAIN_LOCK (PF3)</label>
    <label class="small"><input type="checkbox" data-s="dim" ${D.dim?'checked':''}> DIM_ENABLED (PE4)</label>
    <span class="small muted" style="margin-left:6px">Non-PCM (DD) on:</span>${[0,1,2,3].map(p=>`<label class="small"><input type="checkbox" data-s="dd" data-p="${p}" ${D.dd[p]?'checked':''}> IN${p+1}</label>`).join('')}
    <button data-s="all110">Move every input to 110 Ω</button><button data-s="all75">…to 75 Ω</button></div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"><button data-s="pwr">${D.power?'Power off':'Power on (boot here)'}</button>
    <button data-s="link">${D.link?'Break the front-panel link':'Restore the front-panel link'}</button>
    <button data-s="rmute">Remote panel: press LFE</button>
    <label class="small"><input type="checkbox" data-s="mux" ${D.viewMux?'checked':''}> Show only what is lit at this instant (multiplexing)</label>
    <button data-s="rst">Factory reset</button></div>`;
}
function bindSignals(root){
  const q=s=>root.querySelectorAll(`[data-s=${s}]`);
  q('prog').forEach(e=>e.onchange=()=>act('Programme → '+PROG[e.value].name, tr=>{ D.prog=e.value; tr('Rear AES inputs now carry: '+PROG[e.value].name+'. The SHARC meters the inputs (vumeter on audio_in_float), so the bargraphs follow the source, not the knobs.'); }));
  q('cal').forEach(e=>e.onchange=()=>act('Calibration → '+CAL[e.value]+' dBFS = 0', tr=>{ D.cal=+e.value; tr('DIP SW3/SW4 → main board → TDM_IN_ctl+17 bits 24–26 → cal_data[] → meter_cal (ams81_main.asm). Ops doc Table 2.'); }));
  q('lock').forEach(e=>e.onchange=()=>A.setLock(e.checked));
  q('dim').forEach(e=>e.onchange=()=>A.setDim(e.checked));
  q('dd').forEach(e=>e.onchange=()=>act(`IN${+e.dataset.p+1} ${e.checked?'carries':'stops carrying'} non-PCM data`, tr=>{ D.dd[+e.dataset.p]=e.checked; tr('Astatus bits 7–4 “DD indication” → REG19 → TDM_IN_ctl+18 bits 28–31 → translate_meter_results sets bit 8 (dd) → DD LED. How the MLC8A main board derives it from the CS8416 is not traced '+inf+'.'); }));
  q('all110').forEach(e=>e.onclick=()=>act('Move every input cable to the 110 Ω Phoenix inputs', tr=>{ D.cable75=[false,false,false,false]; D.cable110=[true,true,true,true]; tr(D.source===1? 'source_select is still AES75 → every pair unlocks → four ERR LEDs. Use termination select (hold PRESET 1+2, press MASTER, press ST).' : 'Locked on AES110.'); }));
  q('all75').forEach(e=>e.onclick=()=>act('Move every input cable to the 75 Ω BNC inputs', tr=>{ D.cable75=[true,true,true,true]; D.cable110=[false,false,false,false]; tr(D.source===2?'source_select is AES110 → ERR on every pair until you select 75 Ω.':'Locked on AES75.'); }));
  q('pwr').forEach(e=>e.onclick=()=>A.power());
  q('link').forEach(e=>e.onclick=()=>A.setLink(!D.link));
  q('rmute').forEach(e=>e.onclick=()=>A.remoteMute(3));
  q('mux').forEach(e=>e.onchange=()=>{ D.viewMux=e.checked; SIM.refresh(); });
  q('rst').forEach(e=>e.onclick=()=>A.reset());
}

function syncInputs(m){
  const q=s=>m.querySelector(s); let e;
  if ((e=q('[data-c=sel]'))) e.value=D.sel;
  if ((e=q('[data-s=lock]'))) e.checked=D.lock; if ((e=q('[data-s=dim]'))) e.checked=D.dim; if ((e=q('[data-s=mux]'))) e.checked=D.viewMux;
  m.querySelectorAll('[data-s=dd]').forEach(x=>x.checked=D.dd[+x.dataset.p]);
  if ((e=q('[data-s=prog]')) && document.activeElement!==e) e.value=D.prog; if ((e=q('[data-s=cal]')) && document.activeElement!==e) e.value=D.cal;
}
/* ---------------- timeline lanes ---------------- */
function lanes(){
  const css=n=>SIM.css(n); const ls=[];
  const txt=(c,s,x,y)=>{ c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(s,x,y); };
  ls.push({label:'Front ATmega128 main loop (v200w.c)', h:32, draw(c,X,t0,t1,y,h){
    const ps=frontSched().passes; if (!ps.length){ txt(c,'unit off',X(t0)+6,y+h/2+4); return; }
    const pxPass=X(t0+C.F_LOOP)-X(t0); let shown=0;
    for (const p of ps){ if (p.t1<t0||p.t0>t1) continue; shown++;
      if (p.kind==='boot'){ c.fillStyle=css('--warn'); c.fillRect(X(p.t0),y+3,Math.max(2,X(p.t1)-X(p.t0)),h-6); continue; }
      if (pxPass>70){ let tt=p.t0; FSTEPS.forEach((s,j)=>{ let d=s[1]*C.F_LOOP; if (j===3&&p.stall) d+=p.stall;
          c.fillStyle = j===6? css('--accent2') : (j===3&&p.stall)? css('--warn') : css('--accent'); c.globalAlpha=j%2?.55:.85; c.fillRect(X(tt),y+3,Math.max(1,X(tt+d)-X(tt)-1),h-6); c.globalAlpha=1;
          if (X(tt+d)-X(tt)>64){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(s[0].split(' ')[0]+(j===3&&p.stall?' → SAVE_PRESET (EEPROM)':''), X(tt)+3, y+h/2+3); } tt+=d; }); }
      else { c.fillStyle = p.stall? css('--warn') : (p.i%2? css('--accent'):css('--accent2')); c.globalAlpha=.75; c.fillRect(X(p.t0),y+3,Math.max(1,X(p.t1)-X(p.t0)-0.4),h-6); c.globalAlpha=1;
        if (p.stall && X(p.t1)-X(p.t0)>120) { c.fillStyle='#000'; c.font='11px sans-serif'; c.fillText('SAVE_PRESETn: 20 EEPROM writes — loop stalled', X(Math.max(p.t0,t0))+4, y+h/2+4); } }
    }
    if (pxPass<3) txt(c, `${shown} passes in view (≈${(C.F_LOOP*1e3).toFixed(3)} ms each, ${'inferred'}); orange = stalled`, X(t0)+6, y+h/2+4);
  }});
  ls.push({label:'ALTERA_write: 48-bit dial frame → ring n', h:24, draw(c,X,t0,t1,y,h){
    const ps=frontSched().passes; const px=X(t0+C.F_LOOP)-X(t0); c.fillStyle=css('--accent2');
    if (px<2.2){ c.globalAlpha=.3; c.fillRect(X(t0),y+6,X(t1)-X(t0),h-12); c.globalAlpha=1; txt(c,'one ring per pass: 9 rings → each refreshed every 7.5 ms (133 Hz, 1/9 duty)', X(t0)+6, y+h/2+4); return; }
    for (const p of ps){ if (p.kind==='boot'||p.t1<t0||p.t0>t1) continue; const a=p.t0+FFRAC[6]*C.F_LOOP+p.stall, b=a+48*C.DIAL_BIT;
      c.fillStyle=css('--accent2'); c.fillRect(X(a),y+4,Math.max(1,X(b)-X(a)),h-8); c.fillStyle=css('--play'); c.fillRect(X(b),y+2,1.5,h-4);
      if (px>26){ c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText(KNOB[p.i%9], X(a)+(X(b)-X(a)>30?3:-2), y+h/2+3); } }
  }});
  ls.push({label:'FLASH_LEDS: led_flash_status', h:18, draw(c,X,t0,t1,y,h){ c.fillStyle=css('--warn'); const N=Math.min(400,Math.max(40,(X(t1)-X(t0))/2)); for (let i=0;i<N;i++){ const tt=t0+(t1-t0)*(i+.5)/N; if (flashOnAt(tt)) c.fillRect(X(t0+(t1-t0)*i/N),y+4,(X(t1)-X(t0))/N+.5,h-8); } }});
  const uartLane=(label, which)=>({label, h:30, draw(c,X,t0,t1,y,h){
    const ps=polls(); if (!ps.length){ txt(c, D.power?'link down — no requests':'unit off', X(t0)+6, y+h/2+4); return; }
    for (const p of ps){
      let t, n, gap, bytes, col;
      if (which===0){ t=p.tReq; n=p.reqLen; gap=C.M_BYTE; bytes=reqBytes(p); col=p.mainFull?css('--warn'):css('--accent2'); }
      else if (which===1){ t=p.tRep; n=p.repLen; gap=C.F_LOOP; bytes=repBytes(p); col=p.full?css('--warn'):css('--accent'); }
      else { t=p.tReq1; n=6; gap=C.M_BYTE; bytes=[0x23,0x4C,D.lock?1:0,0x4E,D.dim?1:0,0x24]; col=css('--ink2'); }
      const end=t+(n-1)*gap+C.BYTE_T; if (end<t0||t>t1) continue;
      if (X(t+gap)-X(t) < 3){ c.fillStyle=col; c.globalAlpha=.7; c.fillRect(X(t),y+5,Math.max(2,X(end)-X(t)),h-10); c.globalAlpha=1;
        if (X(end)-X(t)>4 && X(t1)-X(t0)<4000){ c.fillStyle=css('--ink'); c.font='10px sans-serif'; } continue; }
      for (let i=0;i<n;i++){ const a=t+i*gap; if (a>t1||a+C.BYTE_T<t0) continue; c.fillStyle=col; c.fillRect(X(a),y+5,Math.max(1.5,X(a+C.BYTE_T)-X(a)),h-10);
        if (X(a+gap)-X(a)>18){ c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText(byteName(bytes[i]), X(a)+1, y+h-1); } }
    }
    if (X(t1)-X(t0)>0 && t1-t0>0.15){ c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText(which===0?'#L·lock·N·dim·$ every poll; orange = full #A frame':which===1?'#A·0·$ short reply; orange = full 47-byte #A…$ (idle refresh every 20th poll or your change)':(D.remote?'remote panel polled':'polled even with no remote connected'), X(t0)+6, y+11); }
  }});
  ls.push(uartLane('UART0 main → front (request)',0));
  ls.push(uartLane('UART0 front → main (reply)',1));
  ls.push({label:'Main ATmega128 loop (v100w.c, '+'≈5 ms inferred)', h:28, draw(c,X,t0,t1,y,h){
    const ps=polls(); if (!ps.length){ txt(c, D.power&&!D.link?'still running; no front-panel link':'—', X(t0)+6, y+h/2+4); return; }
    for (const p of ps){ if (p.end<t0||p.tReq>t1) continue;
      c.fillStyle=css('--accent2'); c.globalAlpha=.8; c.fillRect(X(p.tReq),y+3,X(p.loop0)-X(p.tReq),h-6); c.fillRect(X(p.tReq1),y+3,X(p.loop1)-X(p.tReq1),h-6); c.globalAlpha=1;
      for (let i=0;i<10;i++){ const a=i<5? p.loop0+i*C.M_LOOP : p.loop1+(i-5)*C.M_LOOP; if (a>t1||a+C.M_LOOP<t0) continue;
        if (X(a+C.M_LOOP)-X(a)>90){ MSTEPS.forEach((s,j)=>{ const b=a+MFRAC[j]*C.M_LOOP, d=s[1]*C.M_LOOP; c.fillStyle=j===2?css('--warn'):css('--accent'); c.globalAlpha=j%2?.5:.8; c.fillRect(X(b),y+3,Math.max(1,X(b+d)-X(b)-1),h-6); c.globalAlpha=1; if (X(b+d)-X(b)>70){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(s[0].split(' ')[0], X(b)+3, y+h/2+3); } }); }
        else { c.fillStyle=i%2?css('--accent'):css('--grid'); c.fillRect(X(a),y+6,Math.max(1,X(a+C.M_LOOP)-X(a)-0.5),h-12); } }
      if (X(p.loop0)-X(p.tReq)>110){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText('while(data_available0) UART0_transmit_counter', X(p.tReq)+3, y+h/2+3); }
      if (X(p.loop1)-X(p.tReq1)>110){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText('while(data_available1) UART1_transmit_counter', X(p.tReq1)+3, y+h/2+3); }
    }
  }});
  ls.push(uartLane('UART1 main → remote MLC8AR',2));
  ls.push({label:`SHARC sport0 IRQ (fs 48 kHz)`, h:20, draw(c,X,t0,t1,y,h){ if (!D.power) return; SIM.pulses(c,X,t0,t1,y,h,1/C.FS,0,0.12/C.FS,css('--accent'),'sport0_isr: gain × master × dim, VUMeterCalc'); }});
  ls.push({label:'SHARC timer1 → shifter (64 bits + 64 blank)', h:24, draw(c,X,t0,t1,y,h){ if (!D.power) return;
    const n=SIM.pulses(c,X,t0,t1,y,h,C.MUX_T,0,C.SHIFT_T,css('--accent2'),'meter frames');
    if (X(t0+C.MUX_T)-X(t0)>40){ for (let i=Math.ceil(t0/C.MUX_T);i*C.MUX_T<=t1;i++){ const k=(i+1)&3; c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText(`k=${k}: CH${k+1}+CH${k+5}`, X(i*C.MUX_T)+4, y+h/2+4); } } }});
  ls.push({label:'Meter mux: columns lit (FDC634 × 4)', h:20, draw(c,X,t0,t1,y,h){ if (!D.power) return; const cols=['#4cc38a','#5aa9e6','#e3a35a','#c77dff'];
    for (let i=Math.floor(t0/C.MUX_T);i*C.MUX_T<=t1;i++){ const k=(i+1)&3; const a=Math.max(t0,i*C.MUX_T+C.SHIFT_T), b=Math.min(t1,(i+1)*C.MUX_T); if (b<=a) continue; c.fillStyle=cols[k]; c.globalAlpha=.75; c.fillRect(X(a),y+4,Math.max(1,X(b)-X(a)-.5),h-8); c.globalAlpha=1; } }});
  ls.push({label:'Front FPGA PWM meter out (METER±)', h:28, draw(c,X,t0,t1,y,h){ if (!D.power) return;
    const pxBit=X(t0+C.PWM_BIT)-X(t0);
    if (pxBit<3){ for (let f=Math.floor(t0/C.PWM_FRAME); f*C.PWM_FRAME<=t1; f++){ const a=f*C.PWM_FRAME, b=a+64*C.PWM_BIT; c.fillStyle=['#4cc38a','#5aa9e6','#e3a35a','#c77dff'][[1,0,3,2][f&3]]; c.globalAlpha=.6; c.fillRect(X(a),y+5,Math.max(1,X(b)-X(a)),h-10); c.globalAlpha=1; if (X(b)-X(a)>60){ c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText(`data${(f&3)+1}`, X(a)+3, y+h/2+4); } } return; }
    c.strokeStyle=css('--ink'); c.lineWidth=1.2; c.beginPath(); let first=true;
    for (let f=Math.floor(t0/C.PWM_FRAME); f*C.PWM_FRAME<=t1; f++){ const words=pwmWords(f*C.PWM_FRAME); for (let b=0;b<73;b++){ const a=f*C.PWM_FRAME+b*C.PWM_BIT; if (a>t1||a+C.PWM_BIT<t0) continue;
        const bit = b<64? ((b<32? words[0]>>>b : words[1]>>>(b-32))&1) : -1; const hi = bit<0? 0 : bit? .75 : .25;
        const yH=y+5, yL=y+h-5; const pts=[[a,yL],[a,hi?yH:yL],[a+hi*C.PWM_BIT,hi?yH:yL],[a+hi*C.PWM_BIT,yL],[a+C.PWM_BIT,yL]];
        pts.forEach(([tt,yy])=>{ if (first){ c.moveTo(X(tt),yy); first=false; } else c.lineTo(X(tt),yy); });
        if (pxBit>22 && b<64){ c.fillStyle=css('--accent2'); c.font='9px '+css('--mono'); c.fillText(String(bit), X(a)+2, y+h-6); }
        if (b===66 && pxBit>6){ c.fillStyle=css('--play'); c.fillRect(X(a),y+1,2,4); } } }
    c.stroke(); }});
  ls.push({label:'Your actions → where they land', h:40, draw(c,X,t0,t1,y,h){
    c.font='10px sans-serif';
    D.markers.forEach((m,i)=>{ const yy=y+6+(i%3)*11; const col=m.kind==='front'?css('--play'):m.kind==='preset'?css('--warn'):m.kind==='remote'?css('--accent2'):css('--ink2');
      c.fillStyle=col; c.fillRect(X(m.t)-1,y+2,3,h-4); c.fillText(m.name.slice(0,34), X(m.t)+4, yy+4);
      if (m.kind==='front'||m.kind==='preset'){ const p=nextPollAfter(m.t); if (!p) return; c.strokeStyle=col; c.setLineDash([4,3]); c.beginPath(); c.moveTo(X(m.t),yy); c.lineTo(X(p.tRep),yy); c.lineTo(X(p.tApply),yy); c.lineTo(X(p.tFPGA),yy); c.stroke(); c.setLineDash([]);
        [[p.tRep,'reply'],[p.tApply,'parsed'],[p.tFPGA,'FPGA'],[p.tSharc,'SHARC']].forEach(([tt,l])=>{ c.fillStyle=col; c.beginPath(); c.arc(X(tt),yy,3,0,7); c.fill(); if (X(p.tSharc)-X(m.t)>200) c.fillText(l, X(tt)+3, yy-3); }); } });
    if (!D.markers.length){ c.fillStyle=css('--ink2'); c.fillText('Turn or press something: the change, the reply that carries it, the main-board parse, the FPGA write and the SHARC ramp appear here.', X(t0)+6, y+h/2+4); }
  }});
  return ls;
}
function pwmWords(tFrame){
  // shift_in_out64 stores frames by their address bit: data1 ← k=1 (bit0), data2 ← k=0 (bit1), data3 ← k=3 (bit2), data4 ← k=2 (bit3)
  const f=Math.floor(tFrame/C.PWM_FRAME); const k=[1,0,3,2][f&3]; return [meterWord(k,tFrame), meterWord(k+4,tFrame)];
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> <span class="muted">at ${SIM.fmtT(D.log[0].t)}</span></div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Turn or press a knob, or press a button. Each step the firmware takes is listed here with its real function and variable names.</div>'; }
function stateTable(t){
  const fs=frontStepAt(t), ml=mainLoopAt(t), u=uartAt(t), o=outputs(t), k=muxPhase(t);
  const gtxt = c => D.mute[c]? '<b style="color:var(--bad)">MUTE</b>' : `${D.gain[c]}`;
  return `<table class="kv">
    <tr><th>Front MCU</th><td class="mono small">${!fs.pass?'off': fs.step<0?'boot':'pass #'+fs.pass.i+' · '+FSTEPS[fs.step][0]}${fs.stalled?' <b style="color:var(--warn)">(EEPROM stall)</b>':''}</td></tr>
    <tr><th>Main MCU</th><td class="mono small">${ml.kind==='loop'? 'loop '+(ml.n+1)+'/10 of poll '+ml.p.k+' · '+MSTEPS[ml.step][0].split(' · ')[0] : ml.kind==='send0'? 'sending request to the front panel' : ml.kind==='send1'? 'sending request to the remote' : ml.kind}</td></tr>
    <tr><th>UART at the playhead</th><td class="mono small">${u? `${u.line}: byte ${u.i} = 0x${u.byte.toString(16).padStart(2,'0').toUpperCase()} (${byteName(u.byte)})` : 'idle line'}</td></tr>
    <tr><th>Ring being scanned</th><td class="mono small">${ringScanAt(t)>=0? KNOB[ringScanAt(t)]+' (update = '+(ringScanAt(t)+1)+')':'—'} · flash ${flashOnAt(t)?'ON':'OFF'} · loss_of_com ${lossAt(t)?'<b style="color:var(--bad)">YES</b>':'NO'}</td></tr>
    <tr><th>Meter mux</th><td class="mono small">k = ${k}: CH${k+1} + CH${k+5}</td></tr>
    <tr><th>gain1…8 / volume</th><td class="mono small">${D.gain.map((g,c)=>gtxt(c)).join(' · ')} / ${D.mmute?'<b style="color:var(--bad)">MUTE</b>':D.vol}</td></tr>
    <tr><th>Mode · source · preset</th><td class="mono small">${D.mode===1?'MODE1 (5.1)':'MODE4 (ST)'} · ${D.source===1?'AES75':'AES110'}${D.sourceMode?' (selecting)':''} · preset '${D.preset}' · lock ${D.lock?'YES':'NO'} · dim ${D.dim?'YES':'NO'}</td></tr>
    <tr><th>Monitor outputs</th><td class="mono small">${o.map((x,c)=>`${CH[c]} ${isFinite(x.db)? x.db.toFixed(1)+' dBFS':'—'}`).join(' · ')}</td></tr>
  </table>`;
}
function viewSim(m){
  window[KEYFLAG]=true;
  m.innerHTML = `
  ${card('Front panel at the playhead — built on the 2016|49 CorelDRAW front and meter-lens artwork', `<div id="fp"></div>${artNote()}${controlsHTML()}`)}
  <div class="grid2">
    <div>${card('Signals, rear connections and main-board inputs', `<div id="sig"></div><div id="rp" style="margin-top:8px"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}</div>
    <div>${card('What the software did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('Meter window, enlarged', `<div id="mz"></div><p class="small muted">VU bar with a PPM dot (translate_meter_results: <span class="mono">bar | (pk&lt;&lt;1 xor pk)</span>). Factory calibration −20 dBFS = 0. LED colours 4 red / 8 yellow / 10 green per column ${inf} from the BOM counts; DD and ERR dots sit above their labels ${inf}.</p>`)}</div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek; use the transport above)', `<canvas id="tl"></canvas>
    <p class="small muted">Front-panel pass ≈ 0.833 ms ${inf} (the manual's “approximately five seconds” preset hold ÷ PRESET_DEBOUNCE 6000). Main-board loop ≈ 5 ms ${inf}; the 1.82 ms gap between main-board UART bytes is from a v100w.c comment. Meter mux 2.5 ms = TPERIOD1 153600 at a 61.44 MHz SHARC clock ${inf}. PWM bit = 12.288 MHz ÷ 128 ÷ 4 = 41.67 µs (from the VHDL).</p>`)}
  ${card('Action log', `<div id="log" class="log"></div>`)}`;
  m.querySelector('#sig').innerHTML = signalsHTML(); bindSignals(m.querySelector('#sig'));
  bindControls(m); bindArt(m);
  const draw=()=>{
    const t=SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t,{mux:D.viewMux}); bindPanel(m.querySelector('#fp'));
    m.querySelector('#mz').innerHTML = frontSVG(t,{mux:D.viewMux, vb:'176 0 614 330'});
    m.querySelector('#rp').innerHTML = rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#insp').innerHTML = stateTable(t);
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    const pb=m.querySelector('[data-s=pwr]'); if (pb) pb.textContent = D.power?'Power off':'Power on (boot here)';
    const lb=m.querySelector('[data-s=link]'); if (lb) lb.textContent = D.link?'Break the front-panel link':'Restore the front-panel link';
    syncInputs(m);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
  };
  SIM.on('time', draw);
  SIM.on('frame', tick);
}

/* ---------------- tutorial ---------------- */
const LESSONS = [
  {title:'Meet the MLC8A', body:`<p>The MLC8A is a one-rack-unit <b>Multi-Channel Level Control</b>. It meters a 5.1 + 2 programme (eight channels on four AES pairs) on the bargraphs at the left, and lets an operator make an “acoustic mix” for the monitor speakers: eight channel knobs (L, R, C, LFE, LS, RS and a stereo L/R) and a <b>MASTER</b> knob.</p>
    <p>Every knob is an endless encoder with a push switch and a ring of 25 LEDs. The four lit buttons at the right are <b>PRESET 1, 2</b> and <b>MODE 5.1 / ST</b>.</p><p class="muted">The manual (Jan 2007|40) is the source for these lessons. Click Next.</p>`, check:()=>true, auto:true},
  {title:'1 · Read the meters', body:`<p>The MLC8A is factory calibrated <b>−20 dBFS = 0</b>. Feed it line-up tone: choose <b>“Line-up tone −20 dBFS on all eight”</b> in the Signals card.</p><p>All eight bars should stop at <b>0</b>. Each bar is the VU level; the single brighter dot above it is the PPM peak.</p><p>The meters show the <b>incoming</b> signal. The knobs do not move them.</p>`, check:()=>D.prog==='tone', hint:'Signals card → Programme on the inputs → Line-up tone.'},
  {title:'2 · Set a channel level', body:`<p>Turn <b>C</b> (centre) clockwise until its ring reaches the <b>yellow LED at 12 o'clock</b>. The SHARC scales each knob so that 12 o'clock is about unity.</p><p>Each detent moves the internal value by 4 (0–255) ${inf}; the ring has 25 LEDs, one per 8 steps.</p>`, check:()=>D.gain[2]>=104, hint:'Pick knob 3 (C) and click its right side, or use the mouse wheel (Shift = 10 detents).'},
  {title:'3 · Set the master', body:`<p>The <b>MASTER</b> knob scales the whole mix. Bring it to the yellow 12 o'clock LED as well (value 104–119).</p>`, check:()=>D.vol>=104 && D.vol<120 && !D.mmute, hint:'Knob 9 (MASTER): turn clockwise.'},
  {title:'4 · Mute a channel', body:`<p>Press the <b>LFE</b> knob. Its ring goes dark except the highest lit LED, which flashes: the manual's mute indication. The LFE output goes silent.</p>`, check:()=>D.mute[3]===1, hint:'Click the centre of the LFE knob (or select knob 4 and press W).'},
  {title:'5 · Un-mute by turning', body:`<p>Pressing again un-mutes. So does <b>turning</b> — but not on the first detent. The firmware counts <span class="mono">mute4_rotations</span> down from 2 and only un-mutes when it reaches 0 (the master needs 3). Turn LFE until it comes back.</p>`, check:()=>D.mute[3]===0 && D.log.some(l=>/Turn LFE/.test(l.name)), hint:'Turn LFE one detent at a time and read the trace.'},
  {title:'6 · Store preset 1', body:`<p>Set a mix you like, then <b>hold PRESET 1</b> for about five seconds until the LEDs flicker and the button lights. (Use “hold 1 (store)” to skip the wait.)</p><p>The flicker is a side effect: writing 20 EEPROM bytes stalls the loop for ≈170 ms, and the ring multiplexing stops ${inf}.</p>`, check:()=>!!D.presets[1] && D.preset===1, hint:'Hold the PRESET 1 button for 5 real seconds, or click “hold 1 (store)”.'},
  {title:'7 · Recall it', body:`<p>Change any knob — the PRESET 1 light goes out because the mix no longer matches. Then <b>tap PRESET 1</b>: the stored mix returns and the button lights again.</p>`, check:()=>D.lastRecall===1 && D.preset===1 && D.recalls>0, hint:'Turn something, then tap PRESET 1 (P key).'},
  {title:'8 · Stereo monitoring', body:`<p>Press <b>ST</b>. The AES4 pair (stereo L/R, inputs 7–8) now feeds the L and R monitor outputs through the <b>L</b> and <b>R</b> knobs; outputs 3–6 go silent.</p><p>Look at the C, LFE, LS and RS knobs: the manual says they are disabled, but their rings stay lit and they still turn — only the DSP ignores them.</p>`, check:()=>D.mode===4, hint:'Press the ST button (S key).'},
  {title:'9 · Back to 5.1', body:`<p>Press <b>5.1</b> to return to full surround monitoring.</p>`, check:()=>D.mode===1, hint:'Press 5.1 (M key).'},
  {title:'10 · Change the input termination', body:`<p>The truck now feeds you on the <b>110 Ω</b> Phoenix inputs. Click <b>“Move every input to 110 Ω”</b>: four red ERR LEDs light because the unit is still listening to the 75 Ω BNCs.</p>
    <p>Enter termination select: <b>hold PRESET 1 and 2</b> and <b>press MASTER</b> (“hold 1+2 &amp; press MASTER”). Both PRESET lights come on; 5.1 = 75 Ω, ST = 110 Ω. Press <b>ST</b>. It times out after about four seconds.</p>`, check:()=>D.source===2 && D.cable110.every(x=>x), hint:'Move the cables, click “hold 1+2 & press MASTER”, then ST — within about 4 s.'},
  {title:'11 · Dim and lock', body:`<p>Two inputs on the main board change how the panel behaves. Tick <b>DIM_ENABLED</b>: the master ring's bar drops six LEDs and the undimmed position blinks; the speakers drop ≈10 dB.</p><p>Then tick <b>GAIN_LOCK</b> and try turning a channel knob. Try MASTER too — it is not locked.</p>`, check:()=>D.dim && D.lock, hint:'Signals card → tick DIM_ENABLED and GAIN_LOCK.'},
  {title:'Done', body:`<p>You've used every control on the MLC8A. The <b>Software</b> tab shows each step inside the three processors, <b>One second</b> breaks the panel down to UART bytes, 48-bit ring frames, 64-bit meter frames and PWM bits, and <b>Findings</b> lists what the firmware does that the manual doesn't say.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){
  window[KEYFLAG]=true;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — operating the MLC8A (from the 2007|40 manual)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
    <div>${card('What the software did', `<div id="trace" class="log"></div>`)}${card('Signals and main-board inputs', `<div id="sig"></div>`)}</div></div>
    ${card('The unit', `<div id="fp"></div>${controlsHTML()}<div id="rp" style="margin-top:8px"></div>`)}`;
  const hot=`<g><rect x="183" y="4" width="600" height="322" fill="transparent"><title>Eight bargraph meters (VU bar + PPM dot), DD and ERR per AES pair</title></rect></g>`;
  m.querySelector('#sig').innerHTML = signalsHTML(); bindSignals(m.querySelector('#sig'));
  bindControls(m);
  const draw=()=>{
    m.querySelector('#fp').innerHTML = frontSVG(SIM.t,{hot}); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML = traceHTML(); syncInputs(m);
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx], ok=L.check();
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over (factory reset)</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); lessonIdx=0; draw(); };
  };
  SIM.on('time', draw);
  SIM.on('frame', tick);
}

/* ---------------- one second, frame by frame ---------------- */
function viewAnatomy(m){
  window[KEYFLAG]=true;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">
    ${card('As seen by the device (at the playhead)', `<div id="dev"></div>`)}
    ${card('As seen by the displays — only what is lit at this instant', `<div id="fp"></div><div id="mz2" style="max-width:360px;margin-top:6px"></div><p class="small muted">Rings are multiplexed one per front-panel pass (9 rings, 1/9 duty) and meters two columns per 2.5 ms mux phase (1/4 duty). Your eye integrates this; the panel above shows only the LEDs that are actually on now. Step with “1 front pass” or “1 meter mux phase”.</p>`)}
  </div>
  <div class="grid2">
    ${card('UART byte on the wire at the playhead (8N1, 26 µs per bit)', `<canvas id="uart"></canvas><div id="ub" class="small mono"></div>`)}
    ${card('PWM meter link at the playhead (25 % = 0, 75 % = 1)', `<canvas id="pwm"></canvas><div id="pb" class="small mono"></div>`)}
  </div>
  ${card('Zoom ladder at the playhead', `<div id="zl"></div>`)}`;
  const zc=[0,1,2,3].map(i=>{ const cv=document.createElement('canvas'); cv.style.marginBottom='6px'; m.querySelector('#zl').appendChild(cv); return cv; });
  const draw=()=>{
    const t=SIM.t, ps=polls();
    const rows=[
      ['Front MCU main-loop passes', '≈ '+Math.round(1/C.F_LOOP).toLocaleString()+' '+inf, SIM.fmtDur(C.F_LOOP), 'v200w.c while(1): encoders, buttons, one UART byte each way, one ring'],
      ['48-bit ring frames (ALTERA_write)', '≈ 1,200', SIM.fmtDur(C.F_LOOP), '16-bit dial_pwr (one-hot ring select) + 32 LED bits → FPGA → 3 × A6276'],
      ['Each ring refreshed', '≈ 133', SIM.fmtDur(9*C.F_LOOP), 'update cycles 1…9'],
      ['Mute / dim blink half-periods', (1/C.FLASH_T).toFixed(2), SIM.fmtDur(C.FLASH_T), 'FLASH_LEDS: every 301 passes'],
      ['Main-board polls of the front panel', (1/C.POLL).toFixed(1)+' '+inf, SIM.fmtDur(C.POLL), '#L·lock·N·dim·$ (6 bytes, 1.82 ms apart) then 5 loops; then the same to the remote'],
      ['Front replies, short / full', ps.filter(p=>p.tReq<1&&!p.full).length+' / '+ps.filter(p=>p.tReq<1&&p.full).length, '', '#A·0·$ (4 bytes) or the 47-byte #A…$; idle refresh every 20th poll (RX_CONSTANT_IDLE)'],
      ['UART bits per byte', '10', SIM.fmtDur(C.BYTE_T), '38400 baud, start + 8 + stop'],
      ['Main-board register transfers', '≈ '+Math.round(10/(C.POLL)*1).toLocaleString()+' '+inf, SIM.fmtDur(C.M_LOOP), 'ALTERA_read_write: 80 bytes = 640 bits each way'],
      ['SHARC samples (sport0_isr)', '48,000', SIM.fmtDur(1/C.FS), '8 channels: in × gain × master × dim → out; VUMeterCalc'],
      ['Meter mux frames (shifter)', Math.round(1/C.MUX_T).toLocaleString(), SIM.fmtDur(C.MUX_T), '64 bits + 64 blanking clocks on FLAG0–3 → 4 × A6276 + FPGA'],
      ['Full meter refreshes', Math.round(1/(4*C.MUX_T)).toLocaleString(), SIM.fmtDur(4*C.MUX_T), '4 phases × 2 columns'],
      ['PWM frames to the remote (METER±)', (1/C.PWM_FRAME).toFixed(1), SIM.fmtDur(C.PWM_FRAME), '64 data + 9 zero periods; each stored word every 4 frames'],
      ['PWM bit periods', Math.round(1/C.PWM_BIT).toLocaleString(), SIM.fmtDur(C.PWM_BIT), '12.288 MHz ÷ 128 ÷ 4'],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>what it is</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    m.querySelector('#dev').innerHTML = stateTable(t) + `<p class="small">Ring frame now: <span class="mono">${dialFrameText(t)}</span></p><p class="small">Meter frame now: <span class="mono">${meterFrameText(t)}</span></p>`;
    m.querySelector('#fp').innerHTML = frontSVG(t,{mux:true}); bindPanel(m.querySelector('#fp'));
    m.querySelector('#mz2').innerHTML = frontSVG(t,{mux:true, vb:'176 0 614 330'});
    drawUart(m.querySelector('#uart'), m.querySelector('#ub'), t);
    drawPwm(m.querySelector('#pwm'), m.querySelector('#pb'), t);
    const all=lanes(), pick=n=>all.filter(l=>n.some(x=>l.label.startsWith(x)));
    const spans=[[1,['UART0 main','UART0 front','Main ATmega','Your actions']],[C.POLL,['UART0 main','UART0 front','Main ATmega','SHARC timer1']],[0.01,['Front ATmega','ALTERA_write','SHARC timer1','Meter mux','Front FPGA PWM']],[0.001,['Front ATmega','ALTERA_write','UART0 front','SHARC sport0','Front FPGA PWM']]];
    spans.forEach(([w,names],i)=>{ let a=Math.max(0,Math.min(1-w,t-w/2)); SIM.drawLanes(zc[i], pick(names), {labelW:190, range:[a,a+w]}); });
  };
  SIM.on('time', draw);
}
function dialFrameText(t){ const r=ringScanAt(t); if (r<0) return '—'; const bits=ringBits(r, flashOnAt(t), lossAt(t)); return `ring ${KNOB[r]}: dial_pwr 0x${(1<<r).toString(16).padStart(4,'0').toUpperCase()} · LEDs 0x${bits.toString(16).padStart(8,'0').toUpperCase()}`; }
function meterFrameText(t){ const k=muxPhase(t); return `k=${k}: word ${k} (CH${k+1}) 0x${meterWord(k,t).toString(16).padStart(8,'0').toUpperCase()} · word ${k+4} (CH${k+5}) 0x${meterWord(k+4,t).toString(16).padStart(8,'0').toUpperCase()}`; }
function drawUart(cv, el, t){
  const {c,w}=SIM.canvas(cv,110); const u=uartAt(t), ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), play=SIM.css('--play');
  if (!u){ c.fillStyle=ink2; c.font='12px sans-serif'; c.fillText('No byte on either UART line at this instant (idle = mark/high). Step with “1 UART byte” or zoom to “300 µs”.', 10, 50); el.textContent=''; return; }
  const bits=[0]; for (let i=0;i<8;i++) bits.push((u.byte>>i)&1); bits.push(1);
  const bw=(w-40)/10; c.strokeStyle=ink; c.lineWidth=1.5; c.beginPath(); c.moveTo(10,25);
  bits.forEach((b,i)=>{ const x=20+i*bw, y=b?25:75; c.lineTo(x,y); c.lineTo(x+bw,y); c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText(i===0?'start':i===9?'stop':'D'+(i-1), x+3, 95); });
  c.lineTo(w-10,25); c.stroke();
  const px=20+(t-u.t0)/C.BYTE_T*10*bw; c.strokeStyle=play; c.beginPath(); c.moveTo(px,10); c.lineTo(px,85); c.stroke();
  el.innerHTML = `${u.line} · byte ${u.i} of ${u.line[0]==='m'?u.p.reqLen:u.p.repLen} · 0x${u.byte.toString(16).padStart(2,'0').toUpperCase()} = ${byteName(u.byte)} · LSB first`;
}
function drawPwm(cv, el, t){
  const {c,w}=SIM.canvas(cv,110); const f=Math.floor(t/C.PWM_FRAME), b0=Math.floor((t-f*C.PWM_FRAME)/C.PWM_BIT), words=pwmWords(f*C.PWM_FRAME);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), play=SIM.css('--play'); const N=16, bw=(w-20)/N, start=Math.max(0,Math.min(73-N,b0-4));
  c.strokeStyle=ink; c.lineWidth=1.5; c.beginPath(); c.moveTo(10,75);
  for (let i=0;i<N;i++){ const b=start+i; const bit=b<64?((b<32?words[0]>>>b:words[1]>>>(b-32))&1):-1; const hi=bit<0?0:bit?.75:.25; const x=10+i*bw;
    c.lineTo(x,75); if (hi){ c.lineTo(x,25); c.lineTo(x+hi*bw,25); c.lineTo(x+hi*bw,75); } c.lineTo(x+bw,75);
    c.fillStyle=b===b0?play:ink2; c.font='10px '+SIM.css('--mono'); c.fillText(b<64?String(bit):b===66?'strb':'0', x+3, 95); }
  c.stroke(); const px=10+(b0-start+((t-f*C.PWM_FRAME)/C.PWM_BIT-b0))*bw; c.strokeStyle=play; c.beginPath(); c.moveTo(px,10); c.lineTo(px,85); c.stroke();
  el.innerHTML = `frame ${f} → data${(f&3)+1} (${['CH2+CH6','CH1+CH5','CH4+CH8','CH3+CH7'][f&3]}) · bit ${b0}/72 ${b0>=64?'(zero framing period'+(b0===66?', output_strobe':'')+')':''} · pwm_demod samples 263 mclk (21.4 µs) after each rising edge`;
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  ctl:{x:16,y:16,w:170,h:96,t:'Front controls',s:['9 encoders + push','PRESET 1/2, 5.1/ST','(PCB MLC8 iss2–4)'],d:'Nine quadrature encoders with push switches (CUIENCODER footprint in the BOM) and four illuminated pushbuttons (KSD). The encoder A/B pins go straight to the AVR (PORTA/C/D/F/G); the four buttons pass through the FPGA (PB1_1…PB4_1 → portb4…7 → AVR PINB4–7).'},
  fmcu:{x:226,y:16,w:190,h:110,t:'Front ATmega128 @ 8 MHz',s:['v200w.c V2.04/v205 (ICC AVR)','presets in its EEPROM','UART0 38400 → main'],d:'Reads the encoders and buttons every pass, keeps gain1…8 / volume (0–255), mutes, presets and mode, answers the main board one UART byte per pass and writes one 48-bit ring frame per pass. Watchdog WDTCR = 0x08.'},
  ffpga:{x:226,y:170,w:190,h:120,t:'Front Cyclone II EP2C5',s:['ring signals: inverted pass-through','meter signals: inverted pass-through','shift_in_out64 → PWM out','blanking_pulse 10.4 µs'],d:'MLC8A.bdf (Quartus 5.1): a glue chip. It inverts the AVR ring clock/data/strobe to the dial drivers and the SHARC meter clock/data/strobe/OE to the meter drivers, stretches the strobe into an OE blank, and re-encodes the meter frames as a 24 kbit/s PWM stream (data_out1/2) for the remote panel.'},
  led:{x:16,y:170,w:170,h:120,t:'LED drivers',s:['7 × A6276 (16-bit sink)','13 × FDC634 (row switch)','9 rings × 25 · 8 meters × 22'],d:'From the iss2 BOM: 7 A6276 16-bit constant-current LED drivers = 48-bit ring chain (16 select + 32 LEDs) + 64-bit meter chain; 13 FDC634 P-FETs = 9 ring switches + 4 meter mux switches (allocation inferred from counts).'},
  rem:{x:16,y:330,w:170,h:80,t:'MLC8AR remote',s:['SERIAL COMM DB9','RS-422 RX± TX± METER±'],d:'Optional remote panel. Polled by the main board on UART1 with the same #…$ frames; its meters are fed from METER± (the PWM stream).'},
  mmcu:{x:456,y:16,w:200,h:110,t:'Main ATmega128 @ 4.9152 MHz',s:['AMS8-1 v100w.c v106','polls front + remote','GAIN_LOCK PF3, DIM PE4'],d:'Polls the front panel and the remote alternately, converts their gains into the 80-byte register block for the main FPGA, reads the receivers, saves the last settings, and reboots itself through the watchdog if the FPGA link misaligns. A serial bootloader is linked at 0x1F800.'},
  mfpga:{x:456,y:170,w:200,h:90,t:'Main FPGA (AMS8-1)',s:['80-byte register block','input routing 75/110','TDM to/from the SHARC'],d:'Receives REG1 (mode), REG11 (master, dim), REG12–17 (channel gains), REG19–20 (lock flags, routing) and passes the control words to the SHARC on SPORT1.'},
  rx:{x:696,y:16,w:170,h:90,t:'AES receivers + SRC',s:['CS8416 (per README)','SRC → internal 48 kHz','75 Ω BNC / 110 Ω Phoenix'],d:'Four AES pairs, each on a 75 Ω BNC and a 110 Ω Phoenix. Termination select picks which set is routed. All inputs are sample-rate converted to an internal 48 kHz reference (ops doc).'},
  dsp:{x:456,y:300,w:200,h:110,t:'ADSP-21065L SHARC',s:['sport0: 8-ch gain × master × dim','VU + PPM, ST mode','timer1 → 64-bit meter shifter'],d:'ams81_main.asm (mlc8v106): floating-point gains from volume_data.dat, smoothed with RAMP_TC 0.02; VU/PPM metering of the inputs; every 2.5 ms shifts a 64-bit meter frame out on FLAG0–3.'},
  out:{x:696,y:170,w:170,h:120,t:'Outputs',s:['4 × AES 75 Ω + 110 Ω','AUX DB25 analog','stereo monitor out'],d:'Monitor (speaker) feeds follow the front-panel mix. Ops doc: “all rear panel outputs (analog and digital) are set to follow the front panel volume controls.”'},
};
const WIRES = [['ctl','fmcu','A/B + push'],['ctl','ffpga','4 buttons'],['ffpga','fmcu','PB4–7'],['fmcu','ffpga','clk/data/strb (48-bit)'],['ffpga','led','dial + meter chains'],['ffpga','rem','METER± PWM'],['fmcu','mmcu','UART0 #…$ 38400'],['mmcu','rem','UART1 RS-422'],['mmcu','mfpga','80 bytes / loop'],['rx','mfpga','AES / I²S'],['mfpga','dsp','TDM + ctl'],['dsp','ffpga','FLAG0–3 meter frame'],['dsp','mfpga',''],['mfpga','out','']];
function viewBlock(m){
  window[KEYFLAG]=false; let sel='ffpga';
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${card('Signal flow in one paragraph', `<p>The <b>front ATmega128</b> owns the knobs and buttons. It lights the rings itself, one ring per loop pass, through the front FPGA and the A6276 drivers. It never talks to the audio: the <b>main ATmega128</b> polls it about 14 times a second ${inf} over a 38400-baud UART, turns the answers into an 80-byte register block for the main FPGA, and the <b>SHARC</b> multiplies each input by its gain, the master and the dim gain. The SHARC also measures every input and clocks a 64-bit meter frame to the front panel every 2.5 ms; the front FPGA re-sends those frames as a PWM stream for the remote panel.</p>`)}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 880 425" style="width:100%"><defs><marker id="mar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#mar)"/>`;
      if (l) s+=`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
        <text x="${b.x+10}" y="${b.y+20}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+10}" y="${b.y+38+i*15}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
  };
  draw();
}

/* ---------------- schematics (redrawn from source names) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*17; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-16}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-3}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*17; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x-34}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*17; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x+w+34}" y="${yy+4}" font-size="10" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  return s;
}
const SHEETS = [
  {name:'1 · Front ATmega128 (U14)', note:'Pin functions from v200w.c (port_init, #defines) and encoder1…9.c (READ_ENCODERn / READ_SHAFT_ENCODERn). Crystal X2 8 MHz from the BOM (XCK_8M000 build).', svg:()=>
    chip(330,48,200,'ATmega128(L) U14',[
      ['PA0…PA7','ENC1…8 push (SWn)'],['PG2','ENC9 MASTER push'],['PF0/PF1','ENC1 L  A/B'],['PG3/PG4','ENC2 R  A/B'],['PD0/PD1','ENC3 C  A/B'],['PD6/PD7','ENC4 LFE A/B'],['PG0/PG1','ENC5 LS  A/B'],['PC0/PC1','ENC6 RS  A/B'],['PC2/PC3','ENC7 ST L A/B'],['PC4/PC5','ENC8 ST R A/B'],['PC6/PC7','ENC9 MASTER A/B (phase swapped)'],
    ],[
      ['PB0','ALTERA_CLOCK → FPGA clk (48)'],['PB1','ALTERA_DATA → FPGA data (47)'],['PB2','STROBE_WRITE → FPGA strb (45)'],['PB4/PB5','PRESET 1 / 2 ← FPGA portb4/5'],['PB6/PB7','5.1 / ST ← FPGA portb6/7'],['PE4…PE7','PB_LED1…4 (P1, P2, 5.1, ST)'],['PD4','altera_reset'],['PE0/PE1','RXD0/TXD0 → LTC1480'],['PF2/PF3','U16 RX / U15 TX enable'],['PD2/PD3','UART1 (not initialised)'],['XTAL','X2 8.000 MHz'],
    ],'ICC AVR 6.31A · v200W.prj · JTAG2')
    + `<text x="40" y="380" font-size="10.5" fill="var(--ink2)">Unused in v205: ALTERA_read()/read_data1/2 expect STROBE_READ on PB6 and DATA_READ on PB2/PB3/PB4 —</text><text x="40" y="396" font-size="10.5" fill="var(--ink2)">the same pins as STROBE_WRITE and the buttons (leftover from AMS8).</text>`},
  {name:'2 · Front FPGA EP2C5T144C7 (U1)', note:'Pin numbers from altera/v200/MLC8A.qsf; connections traced from MLC8A.bdf and pwn_top.bdf (every ring/meter signal passes through a NOT gate).', svg:()=>
    chip(320,40,220,'EP2C5T144C7 U1',[
      ['48 clk','← AVR PB0'],['47 data','← AVR PB1'],['45 strb','← AVR PB2'],['72 data_in5','meter LE ← SHARC FLAG2'],['71 data_in6','meter CLK ← FLAG1'],['70 data_in7','meter DATA ← FLAG0'],['69 data_in8','meter OE ← FLAG3'],['55/57/58/59 PB1_1…PB4_1','← buttons'],['99 osc_in','← X1 12.288 MHz'],['86/96/81/97 data_in1…4','not connected'],
    ],[
      ['94 dia_clk_1','→ ring A6276 CLK'],['112 dia_datain_1','→ ring SDI'],['113 dia_le_1','→ ring LATCH'],['93 dia_oe_1','→ ring OE (blanking)'],['64 mtr_clk_1','→ meter CLK'],['65 mtr_datain_1','→ meter SDI'],['67 mtr_le_1','→ meter LATCH'],['63 mtr_oe_1','→ meter OE'],['43/42/40/41 portb4…7','→ AVR PB4–7'],['74/80 data_out1/2','PWM → DS34LV87T → METER±'],['144…136 tp1…tp7','test points'],['79/73/44/53/52','data_out3/4, portb3, porte2/3: undriven'],
    ],'Quartus II 5.1 SP0.15 · EPCS1 (M25P40 footprint)')},
  {name:'3 · LED matrix', note:'Driver types and counts from MLC8-iss2.bom (7 × A6276, 13 × FDC634, LED603 ring LEDs with L?_13 yellow, LED805 meter LEDs). The split of drivers between the chains is inferred from the bit counts in the code (48 + 64 = 112 = 7 × 16).', svg:()=>{
    let s=''; s+=`<text x="30" y="40" font-size="13" font-weight="700" fill="var(--ink)">Ring chain (ALTERA_write, 48 bits, MSB first)</text>`;
    ['A6276 #1: dial_pwr 15…0','A6276 #2: LEDs 31…16','A6276 #3: LEDs 15…0'].forEach((n,i)=>{ s+=`<rect x="${30+i*190}" y="55" width="170" height="44" fill="var(--panel2)" stroke="var(--ink)"/><text x="${115+i*190}" y="82" text-anchor="middle" font-size="11" fill="var(--ink)">${n}</text>${i<2?`<line x1="${200+i*190}" y1="77" x2="${220+i*190}" y2="77" stroke="var(--ink)"/>`:''}`; });
    s+=`<text x="30" y="125" font-size="11" fill="var(--ink2)">dial_pwr bit r (one-hot, r = 0…8) → FDC634 → anodes of ring r · 25 LED cathodes on OUT0…24 (bit 12 = yellow L?_13 at 12 o'clock) · ${'inferred'} wiring</text>`;
    for (let r=0;r<9;r++) s+=`<circle cx="${60+r*60}" cy="165" r="20" fill="none" stroke="var(--accent)" stroke-dasharray="3 3"/><text x="${60+r*60}" y="169" text-anchor="middle" font-size="10" fill="var(--ink)">${KNOB[r].replace('ST ','')}</text>`;
    s+=`<text x="30" y="230" font-size="13" font-weight="700" fill="var(--ink)">Meter chain (SHARC shifter, 64 bits, bit 0 of word k first)</text>`;
    ['A6276 #4','A6276 #5','A6276 #6','A6276 #7'].forEach((n,i)=>{ s+=`<rect x="${30+i*150}" y="245" width="130" height="40" fill="var(--panel2)" stroke="var(--ink)"/><text x="${95+i*150}" y="270" text-anchor="middle" font-size="11" fill="var(--ink)">${n}</text>`; });
    s+=`<text x="30" y="310" font-size="11" fill="var(--ink2)">word k: bits 0–3 select one of 4 FDC634 column switches · bit 8 DD · bit 9 ERR · bits 10–31 = 22 LEDs (+14 … 34)</text>
      <text x="30" y="328" font-size="11" fill="var(--ink2)">phase k lights CH(k+1) and CH(k+5): 4 phases × 2.5 ms · LED colours 4 red / 8 yellow / 10 green per column (BOM)</text>
      <text x="30" y="360" font-size="11" fill="var(--ink2)">Both chains are driven through FPGA NOT gates, so the boards must re-invert them (2N4401/2N4403 or similar; not traced) — ${'inferred'}.</text>`;
    return s; }},
  {name:'4 · Serial links', note:'Parts from the BOM (LTC1480 ×4 with the 75176 footprint, DS34LV87T, DS34LV86T ×2); DB9 pin names from MLC8-A(ConnectorLayout).pdf; enables from uart0_init/uart1_init comments.', svg:()=>
    chip(80,60,170,'Front AVR UART0',[['TXD0 PE1',''],['RXD0 PE0',''],['PF3','U15 TX enable'],['PF2','U16 RX enable']],[['→ U15 LTC1480','TX±'],['← U16 LTC1480','RX±']],'38400 8N1 (UBRR0 0x19, U2X)')
    + chip(520,60,190,'Main AVR UART0 / UART1',[['UART0','front panel link'],['UART1','remote (DB9)']],[['UBRR 0x07','38400 @ 4.9152 MHz'],['PORTF 0x08','“set U10 to be TX” (= PF3)'],['PD5','UART1 driver']],'AMS8-1 v100w.c')
    + `<text x="80" y="250" font-size="12" font-weight="700" fill="var(--ink)">SERIAL COMM DB9 (rear)</text>
      <text x="80" y="270" font-size="11" fill="var(--ink)">RX−  RX+  TX+  TX−  METER−  METER+  GROUND</text>
      <text x="80" y="290" font-size="11" fill="var(--ink2)">METER± = front FPGA data_out1/2 through the DS34LV87T RS-422 driver: the PWM meter stream for the MLC8AR.</text>
      <text x="80" y="320" font-size="11" fill="var(--ink2)">The front-panel ↔ main-board cable (H-headers) is not traced here; the request/reply frames are below on the Software tab.</text>`},
  {name:'5 · Main board and SHARC', note:'AMS8-1 pins from v100w.c (ALTERA_* #defines, GAIN_LOCK, DIM_ENABLED, init_SHARC, main) and SHARC FLAG use from ams81_main.asm “shifter”. The FLAG0–3 → front FPGA route through the cable is inferred.', svg:()=>
    chip(100,50,200,'Main ATmega128 (AMS8-1)',[['PC7','ALTERA_FSYNCH'],['PC6','ALTERA_CLOCK'],['PC5','ALTERA_WRITE'],['PC4','DATA_READ'],['PF3','GAIN_LOCK (active low)'],['PE4','DIM_ENABLED (active low)']],[['PE6','SHARC reset'],['PE2','Dolby card reset'],['PG0','TDM FSYNCH hold'],['UART0/1','front / remote'],['XTAL','4.9152 MHz']],'v106 · ICC AVR 7.x · bootloader 0x1F800')
    + chip(540,50,200,'ADSP-21065L',[['SPORT0','TDM audio, 10 slots'],['SPORT1','ctl words (20)'],['TIMER0','MCLK for internal ref'],['TIMER1','mux tick 153600']],[['FLAG0','meter DATA'],['FLAG1','meter CLK'],['FLAG2','meter STROBE'],['FLAG3','meter OE (1 = off)']],'mlc8v106 · VisualDSP++')},
];
function viewSchem(m){
  window[KEYFLAG]=false; let i=0;
  m.innerHTML = card('Schematic set (redrawn from source net names — not the P-CAD drawings)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The original P-CAD schematics are <span class="mono">MLC8 - #PCB/MLC8-iss4.sch</span> (front panel), <span class="mono">MLC8 - #led/MLC8-led.sch</span> and the AMS8-1 set. These sheets are a readable guide rebuilt from pin names in the firmware, the FPGA project and the BOM; blue labels are nets.</p>`);
  const draw=()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 900 440" style="width:100%;min-width:680px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="888" height="428" fill="none" stroke="var(--line)"/><text x="884" y="428" text-anchor="end" font-size="10" fill="var(--ink2)">MLC8A · sheet ${i+1}/${SHEETS.length} · redrawn ${SIM.year(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent = SHEETS[i].note;
  };
  draw();
}

/* ---------------- software diagrams ---------------- */
function flowSVG(steps, active, title, sub, w){
  w=w||520; const H=steps.length*40+70;
  let s=`<svg viewBox="0 0 ${w} ${H}" style="width:100%"><defs><marker id="fa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
    <rect x="10" y="4" width="${w-20}" height="24" rx="12" fill="var(--chip)" stroke="var(--line)"/><text x="${w/2}" y="21" text-anchor="middle" font-size="10.5" fill="var(--ink)">${title}</text>`;
  steps.forEach((p,j)=>{ const y=40+j*40, on=active===j; s+=`<line x1="${w/2}" y1="${y-12}" x2="${w/2}" y2="${y}" stroke="var(--ink2)" marker-end="url(#fa)"/><rect x="20" y="${y}" width="${w-50}" height="30" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
    <text x="28" y="${y+13}" font-size="10.5" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${p[0].length>74?p[0].slice(0,72)+'…':p[0]}</text><text x="28" y="${y+25}" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${(p[2]||'').slice(0,96)}</text>`; });
  const yb=40+steps.length*40; s+=`<path d="M${w-30} ${yb-25} h18 V36 h-18" fill="none" stroke="var(--ink2)" marker-end="url(#fa)"/><text x="20" y="${yb+16}" font-size="10.5" fill="var(--ink2)">${sub}</text></svg>`;
  return s;
}
function viewSoft(m){
  window[KEYFLAG]=true;
  m.innerHTML = `<div class="grid2">
    ${card('Front ATmega128 main loop — the box lit is running at the playhead', `<div id="ff"></div>`)}
    ${card('Main-board ATmega128 loop (v100w.c main)', `<div id="mf"></div>`)}</div>
  <div class="grid2">
    ${card('How the buttons did things — control → code → wire', `<div id="btn"></div>`)}
    <div>${card('Encoder state machine (PROCESS_SHAFT_ENCODERn) — last detent', `<div id="enc"></div>`)}${card('Mute and preset state', `<div id="mute"></div>`)}</div></div>
  ${card('Protocol map — the frames on UART0 right now (values live)', `<div id="proto"></div>`)}
  <div class="grid2">
    ${card('48-bit ring frame (ALTERA_write) at the playhead', `<div id="dial"></div>`)}
    ${card('64-bit meter frame (SHARC shifter) at the playhead', `<div id="mfr"></div>`)}</div>
  ${card('SHARC (ams81_main.asm): main loop, timer and sample interrupt', `<div id="sharc"></div>`)}`;
  const draw=()=>{
    const t=SIM.t, fs=frontStepAt(t), ml=mainLoopAt(t);
    m.querySelector('#ff').innerHTML = flowSVG(FSTEPS, fs.step, 'main(): initialization · ALTERA_RESET(1000) · DATA_initialization · ALTERA_write', `Pass ${fs.pass&&fs.pass.i>=0?'#'+fs.pass.i:'—'} · WDR() between groups (watchdog 16K cycles) · ≈${(C.F_LOOP*1e3).toFixed(3)} ms per pass (inferred)`);
    m.querySelector('#mf').innerHTML = flowSVG(MSTEPS, ml.kind==='loop'?ml.step:-1, 'main(): 9×wait_ms(500) · CONFIGURE_ALTERA · RECALL_LAST_SETTINGS · RESET_SHARC', ml.kind==='send0'?'Now: while(data_available0) UART0_transmit_counter() — 6 bytes, 1.82 ms apart':ml.kind==='send1'?'Now: while(data_available1) UART1_transmit_counter() — the remote panel':'The UART sends are blocking while() loops between DOLBY_error and UART0_translate');
    m.querySelector('#btn').innerHTML = `<table class="kv"><tr><th>Operator does</th><th>Firmware path</th><th>What changes on the wire</th></tr>
      <tr><td>Turn a channel knob</td><td class="mono small">SHAFT_ENCODERn → PROCESS_SHAFT_ENCODERn → encoder_actionN → GAIN_CONTROL_n</td><td class="small">gainN ±1 per transition; next reply = full #A…$ with take = 1 for that letter; main board → volumeNL → REG12/13 → SHARC</td></tr>
      <tr><td>Press a channel knob</td><td class="mono small">SWITCH_ENCODERn → TRANSLATE_ENCODERn (chN_mute, muteN_rotations = 2)</td><td class="small">tens/ones replaced by 'F','F' → gainN_monitor = NO → volumeNL = 0</td></tr>
      <tr><td>Turn / press MASTER</td><td class="mono small">SHAFT_ENCODER9 → MASTER_VOLUME · TRANSLATE_ENCODER9</td><td class="small">V field → volume_level → output1/3/4 (master) or monitor = NO</td></tr>
      <tr><td>Tap PRESET n</td><td class="mono small">TRANSLATE_SWITCHES (release) → send_information → RECALL_PRESETn</td><td class="small">preset_press → every take = YES; P field '1'/'2'</td></tr>
      <tr><td>Hold PRESET n 5 s</td><td class="mono small">preset_counter = PRESET_DEBOUNCE → read_information → SAVE_PRESETn</td><td class="small">20 EEPROM writes (≈170 ms stall); P field</td></tr>
      <tr><td>5.1 / ST</td><td class="mono small">TRANSLATE_PUSHBUTTONS → mode_select MODE1 / MODE4</td><td class="small">M field → REG1 → SHARC “is it mode 4?”</td></tr>
      <tr><td>PRESET 1+2 + MASTER</td><td class="mono small">source_press → TRANSLATE_ENCODER9 → source_mode</td><td class="small">S field 1 = AES75 / 2 = AES110 → REG20 routing</td></tr>
      <tr><td>Lock / Dim inputs</td><td class="mono small">main SETTINGS_CHECK → gain_lock / dim_enabled</td><td class="small">#L·lock·N·dim·$ to the front; dim → output2 → SHARC output_gain+1</td></tr></table>
      <p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none yet'}</b></p>`;
    m.querySelector('#enc').innerHTML = encSVG();
    m.querySelector('#mute').innerHTML = `<table class="kv"><tr><th>knob</th>${KNOB.map(n=>`<th>${n}</th>`).join('')}</tr>
      <tr><td>value</td>${D.gain.map(g=>`<td class="mono">${g}</td>`).join('')}<td class="mono">${D.vol}</td></tr>
      <tr><td>mute</td>${D.mute.map(x=>`<td class="mono">${x?'YES':'—'}</td>`).join('')}<td class="mono">${D.mmute?'YES':'—'}</td></tr>
      <tr><td>rotations</td>${D.rot.map(x=>`<td class="mono" style="${x>3?'color:var(--bad)':''}">${x}</td>`).join('')}<td class="mono" style="${D.mrot>3?'color:var(--bad)':''}">${D.mrot}</td></tr>
      <tr><td>ring LEDs</td>${[...Array(9)].map((_,k)=>`<td class="mono">${Math.min(25,Math.floor((k<8?D.gain[k]:D.vol)/8))}</td>`).join('')}</tr></table>
      <p class="small">preset = '${D.preset}' · stored: P1 ${D.presets[1]?'yes':'empty'}, P2 ${D.presets[2]?'yes':'empty'} · source_mode ${D.sourceMode?'YES':'NO'} · knob_activity ${D.active?D.active.k+1:'NO'}</p>`;
    m.querySelector('#proto').innerHTML = protoHTML(t);
    m.querySelector('#dial').innerHTML = dialBitsHTML(t);
    m.querySelector('#mfr').innerHTML = meterBitsHTML(t);
    m.querySelector('#sharc').innerHTML = sharcSVG(t);
  };
  SIM.on('time', draw);
}
function encSVG(){
  const states=[0,4,8,12,16,20,24,28]; const pos=s=>{ const i=states.indexOf(s), a=i/8*2*Math.PI-Math.PI/2; return [170+110*Math.cos(a), 135+100*Math.sin(a)]; };
  const L=D.lastEnc; const used=new Set(L? L.path.map(p=>p.from+'>'+p.to):[]);
  let s=`<svg viewBox="0 0 420 270" style="width:100%">`;
  for (const k in ENC_T){ const sum=+k, from=sum-(sum%4), [to,a]=ENC_T[k]; if (from===to) continue; const [x1,y1]=pos(from), [x2,y2]=pos(to); const hot=used.has(from+'>'+to);
    s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--play)':a===1?'var(--accent)':a===2?'var(--accent2)':'var(--grid)'}" stroke-width="${hot?3:a?1.6:1}" opacity="${hot?1:.7}"/>`; }
  states.forEach(st=>{ const [x,y]=pos(st), cur=L&&D.enc[L.k].st===st; s+=`<circle cx="${x}" cy="${y}" r="17" fill="${cur?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x}" y="${y+4}" text-anchor="middle" font-size="11" fill="${cur?'#fff':'var(--ink)'}">${st}</text>`; });
  s+=`<text x="300" y="30" font-size="10.5" fill="var(--accent)">green: emits UP</text><text x="300" y="46" font-size="10.5" fill="var(--accent2)">blue: emits DOWN</text><text x="300" y="62" font-size="10.5" fill="var(--play)">red: last detent</text>
    <text x="300" y="90" font-size="10" fill="var(--ink2)">switch(encoder_state</text><text x="300" y="103" font-size="10" fill="var(--ink2)">  + shaft code 0–3)</text>
    <text x="10" y="262" font-size="10.5" fill="var(--ink)">${L? `${KNOB[L.k]}: `+L.path.map(p=>`${p.sum}→${p.to}${p.fire?(p.fire===1?'↑':'↓'):p.a?'·':''}`).join('  ') : 'Turn a knob to trace its path.'}</text></svg>
    <p class="small muted">Each quadrature transition is one case of the 31-case switch in encoder1.c; four of them emit UP (2, 4, 11, 13) and four DOWN (17, 23, 24, 30), so a full A/B cycle moves the value by 4. While muted, only the remembered case (encoder_stateN_hold_up / _down) decrements the mute counter.</p>`;
  return s;
}
function protoHTML(t){
  const p = polls().filter(q=>q.tReq<=t).pop() || polls()[0];
  if (!p) return '<p class="muted">No polls (unit off or link down).</p>';
  const row=(bytes,lbl)=>`<div class="small" style="margin:4px 0"><b>${lbl}</b></div><div style="display:flex;flex-wrap:wrap;gap:2px">${bytes.map((b,i)=>`<span class="chip mono" title="byte ${i}" style="margin:0;${b===0x23||b===0x24?'background:color-mix(in srgb,var(--warn) 25%,transparent)':b>=0x41&&b<=0x5A?'background:color-mix(in srgb,var(--accent2) 22%,transparent)':''}">${byteName(b)}</span>`).join('')}</div>`;
  const reqLbl = p.mainFull? `Main → front: full #A frame (${p.why}) — 47 bytes` : `Main → front: general-information request #L·N — 6 bytes, binary 0/1 values`;
  const rep=repBytes(p);
  return row(reqBytes(p), `Poll ${p.k} at ${SIM.fmtT(p.tReq)} · `+reqLbl) + row(rep, `Front → main at ${SIM.fmtT(p.tRep)} · ${p.full? 'full #A…$ (47 bytes: 8 × letter·take·tens·ones, V, P, M, S) — '+(p.change?'your change':'idle refresh, every 20th request') : 'short #A·0·$: “nothing new” (take = NO)'}`) +
    `<p class="small muted">Channel letters A B C D E <b>G</b> H I — F is skipped because F,F means mute. Tens and ones are binary (gain/10 = 0…25, gain%10), not ASCII digits as the protocol document implies. Mode = 1 (5.1) or 4 (ST); source = 1 (75 Ω) or 2 (110 Ω); preset is ASCII '0'…'2'.</p>`;
}
function bitsRow(v, n, label, cls){ let s=`<div class="small" style="margin-top:6px"><b>${label}</b></div><div style="display:grid;grid-template-columns:repeat(${Math.min(n,32)},1fr);gap:1px">`;
  for (let i=n-1;i>=0;i--){ const b=(v>>>i)&1; s+=`<div class="mono" title="bit ${i}" style="font-size:9px;text-align:center;padding:2px 0;border-radius:2px;background:${b?(cls?cls(i):'var(--accent)'):'var(--chip)'};color:${b?'#fff':'var(--ink2)'}">${i}</div>`; }
  return s+'</div>'; }
function dialBitsHTML(t){
  const r=ringScanAt(t); if (r<0) return '<p class="muted">Not scanning (off or booting).</p>';
  const bits=ringBits(r, flashOnAt(t), lossAt(t));
  return `<p class="small">Pass ${passAt(t).i}: update = ${r+1} → ring <b>${KNOB[r]}</b> (value ${r<8?D.gain[r]:D.vol}${(r<8?D.mute[r]:D.mmute)?', muted → MSB_LED, flash '+(flashOnAt(t)?'ON':'OFF'):''}${r===8&&D.dim?', dim → DIM_LED_BAR'+(flashOnAt(t)?'_DOT':''):''}${lossAt(t)?', loss_of_com → 0':''})</p>`
    + bitsRow(1<<r, 16, 'write_data_int(dial_pwr) — sent first, MSB first') + bitsRow(bits, 32, 'write_data_long(LEDs) — bit 0 = LED at 7:30, bit 12 = yellow 12 o’clock, bits 25–31 unused', i=>i===12?'#c98a12':i>24?'var(--bad)':'var(--accent)')
    + `<p class="small muted">Then STROBE_WRITE low-high-low → FPGA strb → dia_le_1, and blanking_pulse holds dia_oe_1 for 128 clocks of 12.288 MHz (10.4 µs).</p>`;
}
function meterBitsHTML(t){
  const k=muxPhase(t), w0=meterWord(k,t), w1=meterWord(k+4,t);
  const cls=i=> i<4?'var(--accent2)': i===8?'#c98a12': i===9?'var(--bad)' : i>=28?'var(--accent)': i>=20?'#c98a12':'#d4442f';
  return `<p class="small">Mux phase k = ${k}: <span class="mono">shift_data[${k}]</span> (CH${k+1}) then <span class="mono">shift_data[${k+4}]</span> (CH${k+5}), each LSB first; bit 31 = bottom LED (34), bit 10 = top (+14).</p>`
    + bitsRow(w0,32,`word ${k}: CH${k+1}${k<4?' + select bit '+[1,0,3,2][k]:''}`,cls) + bitsRow(w1,32,`word ${k+4}: CH${k+5}`,cls)
    + `<p class="small muted">The front FPGA's shift_in_out64 stores the frame in data${[2,1,4,3][k]} because the first bit it received was a select bit, then pwm_control sends data1…4 in turn to the remote.</p>`;
}
function sharcSVG(t){
  const n=Math.floor(t*C.FS), phase=t%C.MUX_T;
  const box=(x,y,w,a,b,hot)=>`<rect x="${x}" y="${y}" width="${w}" height="40" rx="6" fill="${hot?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+w/2}" y="${y+17}" text-anchor="middle" font-size="10.5" fill="${hot?'#fff':'var(--ink)'}">${a}</text><text x="${x+w/2}" y="${y+31}" text-anchor="middle" font-size="9.5" fill="${hot?'#eef':'var(--ink2)'}">${b}</text>`;
  const main=[['_VUMeterGet ×8','VU, PPM → vu/pk_results'],['idle','wait for an interrupt'],['call shifter','if ustat2 bit 0 (timer)'],['gain_loop1','28 gains ramp, RAMP_TC 0.02'],['ctl loop-through','version word 0x56313031']];
  let s=`<svg viewBox="0 0 900 190" style="width:100%"><text x="10" y="16" font-size="11" font-weight="700" fill="var(--ink)">main: (loops once per sample — each pass ends in idle)</text>`;
  main.forEach((b,i)=>{ s+=box(10+i*176,24,166,b[0],b[1], i===2 && phase<C.SHIFT_T); if (i<4) s+=`<line x1="${176+i*176}" y1="44" x2="${186+i*176}" y2="44" stroke="var(--ink2)"/>`; });
  s+=`<text x="10" y="92" font-size="11" font-weight="700" fill="var(--ink)">sport0_isr (every ${SIM.fmtDur(1/C.FS)}) · tmzl_svc (every ${SIM.fmtDur(C.MUX_T)}: bit set ustat2 bit 0)</text>`;
  [['float the 10 TDM inputs','fix the previous outputs'],['_VUMeterCalc','8 channels'],['× gain × master × dim','× 0.5623 twice'],['mode 4?','out1/2 = in7/8; out3–6 = 0'],['translate_meter_results','shift_data[0…9]']].forEach((b,i)=>{ s+=box(10+i*176,100,166,b[0],b[1],false); });
  s+=`<text x="10" y="170" font-size="10.5" fill="var(--ink2)">Sample ${n.toLocaleString()} · meter phase ${muxPhase(t)} · ${phase<C.SHIFT_T?'shifting a meter frame now':'next meter frame in '+SIM.fmtDur(C.MUX_T-phase)} · gains: master ${fmtDb(db(vt(D.vol)*OFS))}, dim ${fmtDb(db(vt(D.dim?21:66)))}</text></svg>`;
  return s;
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window[KEYFLAG]=false;
  const top=db(vt(255)*OFS), full=db(vt(200)*OFS);
  m.innerHTML = card('What the MLC8 firmware is up to — findings from the source', `
  <ol>
    <li><b>One knob at a time.</b> <span class="mono">SWITCH_ENCODERn()</span> and <span class="mono">SHAFT_ENCODERn()</span> (v200w.c) only read their pins when <span class="mono">knob_activity</span> is NO or equal to n. After you turn one knob, every other knob is ignored until that change has gone out in a reply and all <span class="mono">*_take</span> counters are back to NO (<span class="mono">UART0_setup</span>). With the link down, the last knob touched is the only one that works.</li>
    <li><b>The mute counter can wrap to 255.</b> <span class="mono">muteN_rotations</span> (encoderN.c <span class="mono">PROCESS_SHAFT_ENCODERn</span>) is reset to <span class="mono">MUTE_GAIN_HOLD_CONSTANT</span> only by a push-mute in <span class="mono">TRANSLATE_ENCODERn</span>. A mute that arrives from the remote panel (<span class="mono">UART0_translate</span>: F,F) or from <span class="mono">RECALL_PRESETn</span> leaves it at 0 if the previous unmute was by turning; the next decrement wraps (unsigned char), so un-muting by turning then takes ≈256 detents. Pressing still works. Found by reading; not checked on hardware. Try it: mute LFE, unmute by turning, connect the remote (click SERIAL COMM on the rear), then “Remote panel: press LFE”.</li>
    <li><b>Turning to un-mute needs 2 detents (3 on MASTER).</b> <span class="mono">MUTE_GAIN_HOLD_CONSTANT 2</span> / <span class="mono">MUTE_HOLD_CONSTANT 3</span>. The ops document says turning un-mutes, without the count.</li>
    <li><b>Lock locks less than you'd think.</b> <span class="mono">gain_lock</span> is tested in <span class="mono">GAIN_CONTROL_1…8</span> and <span class="mono">TRANSLATE_ENCODER1…8</span> only. MASTER (turn and mute), 5.1/ST and the presets still work, and a preset recall overwrites the “locked” gains. On the main board the lock input is <span class="mono">PINF & BIT3</span> — the pin that <span class="mono">uart0_init()</span>'s “set U10 to be TX” line now only pulls up (the older <span class="mono">PINE & BIT5</span> is commented out).</li>
    <li><b>ST mode doesn't disable C, LFE, LS, RS on the panel.</b> The manual says those controls are disabled. The front panel keeps adjusting and lighting them; only the SHARC (<span class="mono">sport0_isr</span>, “is it mode 4?”) zeroes outputs 3–6 and routes inputs 7/8 through the L/R gains. Outputs 7/8 keep following knobs 7/8 ${inf}.</li>
    <li><b>The ops document says the meters follow ST mode; the DSP meters the inputs.</b> “AES input 4 CHA and CHB will show up on meters 1 and 2” — but <span class="mono">VUMeterCalc</span> runs on <span class="mono">audio_in_float</span> in input order, unaffected by mode.</li>
    <li><b>The rings can't show the top of the range.</b> <span class="mono">CONVERT_DIAL_INFORMATION</span> = value / <span class="mono">DIVISOR</span> (8), clipped to 25 LEDs, so every value from 200 to 255 shows a full ring: from ${fmtDb(full)} to ${fmtDb(top)} per knob (computed from volume_data.dat × 0.5623). Values 1–15 show only LED 1.</li>
    <li><b>Knob range is OFF to ≈ +7 dB, not +15 dB.</b> The ops doc gives “OFF to +15 dB” per knob. With <span class="mono">volume_data.dat</span> (linear, 0…3.97) and the 0.5623 “12:00 equals unity” factor applied to each knob, one knob tops out at ${fmtDb(top)}; channel + master together reach ${fmtDb(2*top)}. Unity falls at value 114 (ring LED 14), one LED past the yellow LED 13.</li>
    <li><b>Defaults from an older scale.</b> <span class="mono">gainN = 61</span>, <span class="mono">VOLUME_START_UP 30</span> and the main board's <span class="mono">volume_level = 30; // -30dB</span> date from the 0–76 dB-step scale (commented <span class="mono">GAIN_MAX_TRIM 76</span>, <span class="mono">Volume_Max 76</span>). With the v105/v106 SHARC table, 61 is ${fmtDb(db(vt(61)*OFS))} and 30 is ${fmtDb(db(vt(30)*OFS))} — not −30 dB. <span class="mono">RECALL_LAST_SETTINGS</span> always forces 30 (the EEPROM read is commented out), as the ops doc says.</li>
    <li><b>Dim.</b> <span class="mono">DIM_GAIN 21</span> vs <span class="mono">UNITY_DIM_GAIN 66</span> = ${fmtDb(db(vt(21)/vt(66)),2)}; “unity” is itself ${fmtDb(db(vt(66)),2)}. The master ring shows it with <span class="mono">DIM_LED_BAR_DOT/DIM_LED_BAR</span> (v2.04): the bar drops 6 LEDs and the undimmed position blinks.</li>
    <li><b>The protocol document vs the code.</b> Tens/ones are binary 0–25 / 0–9, not “(0-9)” digits; YES/NO are bytes 0x01/0x00; mode is 1 or 4 (not 0–1); source is 1 or 2 (not 0–1); the idle full refresh happens every 20 requests (<span class="mono">RX_CONSTANT_IDLE</span>), not “about 15”. Channel 6 is <b>G</b>: F is skipped because F,F means mute.</li>
    <li><b>Preset timing and contents disagree across documents.</b> Manual: hold about 5 s; ops doc: about 10 s; code: <span class="mono">PRESET_DEBOUNCE</span> 6000 passes (4500 in the 4.9152 MHz branch). The ops doc says presets store the input source; <span class="mono">SAVE_DATA(20, source_select)</span> is commented out, but mode is stored.</li>
    <li><b>An empty preset lights up.</b> The <span class="mono">send_information</span> branch of <span class="mono">TRANSLATE_PUSHBUTTONS</span> sets <span class="mono">preset = NO1/NO2</span> even when <span class="mono">RECALL_PRESETn</span> found no 0xAA key and loaded nothing.</li>
    <li><b>Holding 5.1 or ST can store a preset.</b> A mode button sets <span class="mono">pb_temp = 0</span>, and <span class="mono">(data & PRESET_MASK) == pb_temp</span> is then true while it is held, so after 6000 passes <span class="mono">read_information</span> fires; if <span class="mono">preset0</span> is '1' or '2' (set when the remote recalled a preset), <span class="mono">SAVE_PRESETn</span> silently overwrites it. Edge case found by reading.</li>
    <li><b>The flicker the manual promises is a stall.</b> “Push and hold a PRESET button until the concentric level indicator LEDs flicker” — <span class="mono">SAVE_PRESETn</span> writes 20 EEPROM bytes in a row (≈170 ms ${inf}); <span class="mono">ALTERA_write</span> is not called meanwhile, so the ring multiplexing freezes on one ring ${inf}.</li>
    <li><b>Clock define typo.</b> <span class="mono">//#define XCK_4M9512</span> selects the constants, but <span class="mono">uart0_init/uart1_init</span> test <span class="mono">#ifdef XCK_4M9152</span>. The shipped build uses <span class="mono">XCK_8M000</span> (UBRR0 0x19 + U2X = 38 461 baud); switching back to the 4.9152 MHz crystal would leave no <span class="mono">uart0_init</span> at all. The front crystal is 8 MHz (BOM X2), not the 4.9152 MHz the README infers — that figure fits the main board.</li>
    <li><b>Leftovers.</b> <span class="mono">ALTERA_read()</span> (comment: “shift 120 bits”, actually 18 bytes = 144) is never called, and its pins clash with the buttons (PB2, PB4, PB6). The EEPROM map defines (<span class="mono">KEY_ADDRESS 255</span>, <span class="mono">KEY_ADDRESS_MODE 230</span>…) are unused: presets live at 1–19/31–49 with 0xAA at 30/60. Hundreds of Dolby/SDI/metadata names remain from AMS8. The front makefile still reserves <span class="mono">-bbootloader:0x1F800</span> with no bootloader linked.</li>
    <li><b>The main-board bootloader is linked but unreachable.</b> <span class="mono">bootloader._s</span> is in <span class="mono">v100w.mak FILES</span> at 0x1F800, but the only jump to it — <span class="mono">UART1_translate(void) … asm("jmp loader")</span> — sits inside a comment block, and <span class="mono">bootloader</span> is never set to YES. It could only run through the BOOTRST fuse (not documented).</li>
    <li><b>The main board reboots itself on purpose.</b> After 200 misaligned register exchanges (<span class="mono">ALIGNMENT_CHECK</span>, <span class="mono">ERROR_COUNTER</span>), <span class="mono">while (error0 == 0) NOP();</span> spins without WDR until the watchdog resets it — the same trick as POD33.</li>
    <li><b>Version strings disagree.</b> The SHARC writes <span class="mono">0x56313031</span> = “V101” to the control loop-back while its header says v105/v106 and <span class="mono">#define version 'V102'</span>. The v106 source also carries an “April 24, 09” fix (mask on <span class="mono">mux_count</span>), later than the folder date. v200w.c in the v205 folder says “V2.04”, with <span class="mono">REVISION1…4</span> = 2.0.1.0.</li>
    <li><b>Front FPGA details.</b> The PWM frame has 9 zero periods (pulse_counter 64–72), not 8, with the strobe at 66: 73 × 41.67 µs = 3.04 ms. <span class="mono">data_in1…4</span> are unconnected and <span class="mono">data_out3/4, portb3, porte2/3</span> undriven in MLC8A.bdf; <span class="mono">pwm_demod</span> decodes the stream back onto test points (a loop-back for the remote's decoder).</li>
    <li><b>Artwork ${SIM.year(2026)}: the front panel and meter lens now come from ${artSrc('FRONT')} (Jan 18 2016) and ${artSrc('LENS')} (May 08/15).</b> (a) The 8A sheet draws its panel outline as a black hairline in the ink colour, not on the mechanical layer, and its bracket lines (5.1, ST, PRESETS, MODE) are 1 pt strokes. (b) The lens sheet is the same file as the AMS8-1’s (byte-identical copy in the AMS81 folder). (c) The rear has no 8A CorelDRAW: ${SIM.src('#MLC - #SERIES/MLC8 - #Engineering/MLC8 - #SILK/mlc8-rear-silk-CURVE.cdr','mlc8-rear-silk-CURVE.cdr')} (Sep 2006) is an SDI IN / SDI OUT / AES1 / AES2 variant with no 75 Ω BNC legends, and ${SIM.src(ART.DIR+'MLC8B-REAR-SILK(CURVE AMS8-M19).cdr','MLC8B-REAR-SILK(CURVE AMS8-M19).cdr')} is the 8B rear, so the rear stays on the manual drawing.</li>
    <li><b>Artwork.</b> The 2016|49 file <span class="mono">MLC-8A-FRONT-SILK(CURVE MLC-M1).cdr</span> prints “MLC-8B MULTICHANNEL LEVEL CONTROL” in its green separation. The lens silk prints the bottom mark as 34; <span class="mono">ams81_vu_data.dat</span> labels it −36.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>Front-panel pass 0.833 ms ${inf}: the manual's “approximately five seconds” ÷ <span class="mono">PRESET_DEBOUNCE</span> 6000. It makes the mute blink 2 Hz and the termination-select timeout ≈4.2 s.</li>
    <li>Main-board loop 5 ms ${inf} (640 bit-banged bits at 4.9152 MHz dominate). Poll cycle = 6 bytes × 1.82 ms + 5 loops, then the same for the remote ≈ ${(C.POLL*1000).toFixed(1)} ms. The ops doc's “5 minutes” for 3000 quiet loops would imply ≈100 ms loops instead.</li>
    <li>SHARC core 61.44 MHz ${inf} (makes TPERIOD1 = exactly 2.5 ms). Shifter duration 17 µs ${inf}. One detent = one quadrature cycle = 4 steps ${inf}.</li>
    <li>Meter index 0.5 dB per step with −20 dBFS on “0” ${inf} from the table labels; VU 300 ms average and PPM decay are generic ballistics ${inf}; the programme is synthetic.</li>
    <li>LED colours (4 red / 8 yellow / 10 green per column, yellow 12 o'clock ring LED) from the BOM and the MLC6A photo; DD/ERR dot positions ${inf}.</li>
    <li>Changes take effect in the state immediately; the timeline shows when each one would actually reach the main board, the FPGA and the SHARC.</li></ul>`)
  + card('Sources', `<ul class="small mono">
    <li>#MLC - #SERIES/MLC8 - #Engineering/MLC8 - #Software/MLC8A - #Software/atmel/v205/v200w.c, encoder1…9.c, common.c, v200W.mak</li>
    <li>…/MLC8A - #Software/altera/v200/MLC8A.qsf, MLC8A.bdf, pwn_top.bdf, pwm_*.vhd, shift_in_out64.vhd, mclk_divider.vhd, blanking_pulse.vhd</li>
    <li>…/MLC8A - #Software/AMS8-1/atmel/v106/v100w.c, v100w.mak · …/AMS8-1/sharc/mlc8v106/ams81_main.asm, ams81_INIT.ASM, ams81_ISR_table.ASM, ams81_vu_data.dat, volume_data.dat</li>
    <li>…/MLC8 - #Archive/MLC8 COMMUNICATION PROTOCOL.doc, mlc8 operational  info #MANUAL.doc · …/MLC8 - #MANUAL/MLC-8A/Text/MLC8A(Corrected version).pdf, PDF_s/*.pdf</li>
    <li>…/MLC8 - #PCB/OBSOLETE/MLC8-iss2.bom · MLC6 &amp; MLC8 - #ARTWORK #DA #2016/${artSrc('FRONT')}, ${artSrc('LENS')} (assets/mlc8-front.svg, mlc8-lens.svg), Pics/MLC6A Front.jpg</li></ul>`);
}

/* ---------------- register plugin ---------------- */
SIM.register({
  footnotes: [{"text": "Artwork 2026|59: the front panel and meter lens are drawn from MLC-8A-FRONT-SILK(CURVE MLC-M1).cdr (Jan 18 2016) and AMS8-M6-SILK(MLC8-M3) (CURVE).cdr.", "src": "#MLC - #SERIES/MLC6 & MLC8 - #ARTWORK #DA #2016/MLC-8A-FRONT-SILK(CURVE MLC-M1).cdr"},
    {"text": "The MLC-8A front sheet prints “MLC-8B MULTICHANNEL LEVEL CONTROL” on its GREEN plate.", "src": "#MLC - #SERIES/MLC6 & MLC8 - #ARTWORK #DA #2016/MLC-8A-FRONT-SILK(CURVE MLC-M1).cdr"},
    {"text": "The meter-lens sheet is shared with the AMS8-1: a byte-identical copy sits in the AMS81 artwork folder.", "src": "AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/AMS8-M6-SILK(MLC8-M3) (CURVE).cdr"},
    {"text": "The lens prints the bottom meter mark as 34; the meter table ams81_vu_data.dat labels it −36.", "src": "#MLC - #SERIES/MLC6 & MLC8 - #ARTWORK #DA #2016/AMS8-M6-SILK(MLC8-M3) (CURVE).cdr"},
    {"text": "The 8A front draws its panel outline as an ink-coloured hairline instead of on the mechanical layer.", "src": "#MLC - #SERIES/MLC6 & MLC8 - #ARTWORK #DA #2016/MLC-8A-FRONT-SILK(CURVE MLC-M1).cdr"},
    {"text": "No 8A rear CorelDRAW exists: mlc8-rear-silk-CURVE.cdr (Sep 2006) is an SDI IN / SDI OUT / AES1 / AES2 variant with no 75 Ω BNC legends, so the rear stays on the manual drawing.", "src": "#MLC - #SERIES/MLC8 - #Engineering/MLC8 - #SILK/mlc8-rear-silk-CURVE.cdr"},
    {"text": "The MLC8 SILK folder keeps seven 2006|39 front iterations (ver1, ver2, ver4, ver5 — no ver3 — and latest-ver1–3), and the same set of .cdr files appears again under MLC8 #Engineering #TIM/SILK.", "src": "#MLC - #SERIES/MLC8 - #Engineering/MLC8 - #SILK/mlc8-SILK-latest-ver3.cdr"}],
  id:'mlc8', name:'MLC8A · Multi-Channel Level Control (2007|40)', duration:1,
  product:'MLC8A (MLC8 / MLC6 family)', year:2007, family:'#MLC - #SERIES', folder:'#MLC - #SERIES',
  summary:'1RU 5.1+2 meter and monitor level control: eight channel encoders and a master with 25-LED rings, 22-LED bargraphs, presets, 5.1/ST and 75/110 Ω select. Front ATmega128 + Cyclone II LED glue, AMS8-1 main board (ATmega128 + ADSP-21065L SHARC).',
  highlights:['Interactive panel on the real 2016 front and meter-lens silk','12-lesson operator tutorial from the 2007 manual','Every knob turn traced to the #…$ bytes, the FPGA and the SHARC','Ring and meter multiplexing, 48-bit and 64-bit frames, PWM link to the remote','Mute counter that can wrap to 255; lock that leaves MASTER unlocked'],
  depth:'Full model',
  stepUnits:[
    {label:'1 front-panel pass', period:()=>C.F_LOOP},
    {label:'1 meter mux phase (2.5 ms)', period:()=>C.MUX_T},
    {label:'1 poll cycle', period:()=>C.POLL, phase:()=>C.POLL0},
    {label:'1 PWM frame (73 bits)', period:()=>C.PWM_FRAME},
    {label:'1 PWM bit', period:()=>C.PWM_BIT},
    {label:'1 UART byte time', period:()=>C.BYTE_T},
    {label:'1 sample @ 48 kHz', period:()=>1/C.FS},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[C.POLL,'1 poll cycle (≈72 ms)'],[0.01,'10 ms (4 meter phases)'],[0.003,'3 ms (1 PWM frame)'],[0.001,'1 ms (≈1 front pass)'],[0.0003,'300 µs (UART bytes)'],[0.0001,'100 µs (PWM bits, samples)']],
  defaultZoom:1,
  init(){ FS_KEY=''; PK=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the MLC8A', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewAnatomy},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
