/* =====================================================================
   MLC6A — Multi-Channel Level Control, 6 channel (Ward-Beck Systems, 2007|40, obsolete)
   Plugin for the WBS Device Simulator (../siumulation.html)

   The MLC6A is the MLC8A with two channel knobs and the 5.1 / ST buttons left off the panel.
   Its firmware is the MLC8A code with a handful of changed lines, found by hashing and diffing
   the MLC6A tree against the MLC8A tree (see the Findings tab). Firmware set per
   SOFTWARE LISTINGS - #Engineering.xls "MLC6A REVISIONS": PFV 2.0.0.1 (2007-12-21) =
   front Atmel V205 + front Altera MLC8AV200, main board Atmel V106, SHARC MLC8Av105, Altera AMS8V202.
   PFV 2.0.0.0 (2007-11-27) = front V204 + main V105, selectable here.

   Sources (folder "#MLC - #SERIES/XXX - MLC6A - #OBSOLETE #Archive"):
   - MLC6A - #Software/MLC6A - #Software #atmel/v205/v200w.c (+ working/, Released/v204.zip, v205.zip):
       identical to MLC8A v205 except gain7/gain8/pgain7/pgain8 = 120; v204 → v205 diff = *_take 2 → YES,
       uart0_rx_isr clears data_available0/uart_tx_data0. encoder1…9.c, SIEMENS8.c, common.c byte-identical
       to the MLC8 tree. eeprom1.HEX in the zips (2006-11-07).
   - MLC6A - #Software #AMS8-1/atmel/v106/v100w.c (+ working/, Released/v105.zip, v106.zip): MLC8A v106
       plus SOURCE_SELECTOR (PINE & BIT5), PORTE 0x8F (PE5 pull-up off), gain7/8 = 120, source_select from
       the panels ignored, SETTINGS_CHECK forcing AES75 (working/ reads PE5). v105 → v106 diff.
   - mlc6A-SILK.cdr (front silk, two separations) and MLC6A (Front & Rearview).cdr, converted with Inkscape
       (libcdr) → assets/mlc6a-front-green.png, mlc6a-front-white.png (text re-anchored against
       MLC6 & MLC8 - #ARTWORK #DA #2016/Pics/MLC6A Front.jpg), mlc6a-rear.png
   - assets/mlc6a-lens-white.png = the MLC8-M3 meter lens (AMS8-M6-SILK(MLC8-M3) (CURVE).pdf, as cut for mlc8.js);
       the MLC6A photo shows the same eight-column lens.
   - Shared code and documents reused from mlc8.js (findings cited there): MLC8A altera/v200 VHDL/BDF,
       AMS8-1 sharc/mlc8v106, MLC8 COMMUNICATION PROTOCOL.doc, mlc8 operational info, MLC8A manual (2007|40),
       MLC8-iss2.bom. There is no MLC6A manual in the archive; the tutorial follows the MLC8A manual.
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const KEYFLAG = '__mlc6aActive';

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

const CH = ['L','R','C','LFE','LS','RS','AES4 L','AES4 R'];
const CHID = ['A','B','C','D','E','G','H','I'];       // the letter F is skipped: "F,F" means mute
const KNOB = ['L','R','C','LFE','LS','RS','ch7 (no knob)','ch8 (no knob)','MASTER'];
const PANEL_K = [0,1,2,3,4,5,8];                        // encoders fitted behind the MLC6A panel (mlc6A-SILK.cdr) — 7 and 8 absent
const GAIN78 = 120;                                       // MLC6A v205 / v106: unsigned char gain7 = 120, gain8 = 120
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
  gain: [61,61,61,61,61,61,GAIN78,GAIN78], vol: 30,     // gain1…6 = 61, gain7/8 = 120 (MLC6A change), VOLUME_START_UP 30
  mute: [0,0,0,0,0,0,0,0], mmute: 0,
  rot: [2,2,2,2,2,2,2,2], mrot: 3,                       // muteN_rotations / mute_rotations
  enc: Array.from({length:9},()=>({st:0, up:13, down:30})),  // encoder_stateN, _hold_up, _hold_down
  mode: 1, source: 1, fsrc: 1,                           // MODE1 = 5.1 (no ST button on the MLC6A) · main-board source_select / front copy
  fbuild: 'v205', mbuild: 'v106', pe5: true,             // firmware builds; PE5 SOURCE_SELECTOR closed to ground (only read by working/)
  preset: 0, presets: {1:null, 2:null}, pref: null, preset0: 0,
  lock: false, dim: false,
  held: {}, sourcePress: false, sourceMode: false, sourceUntil: 0, presetHold: 0,
  active: null,                                          // knob_activity {k, until}
  cable75: [true,true,true,true], cable110: [false,false,false,false], dd: [false,false,false,false],
  prog: 'film', cal: 0, sel: 0, clicks: 1,
  viewMux: false,
  log: [], markers: [], saves: [], bootAt: null, lastEnc: null, recalls: 0,
};
/* firmware builds in the MLC6A folder (Released/*.zip + loose trees), PFV numbers from the software listing */
const FBUILDS = {v204:'Front V204 (PFV 2.0.0.0, 2007-11-27): *_take = 2 → every change is sent in two replies',
                 v205:'Front V205 (PFV 2.0.0.1, 2007-12-21, “fixed communication issue”): *_take = YES, uart0_rx_isr aborts a reply in progress'};
const MBUILDS = {v105:'Main V105 (PFV 2.0.0.0): source forced AES75; a remote change blocks the front panel (timeout0)',
                 v106:'Main V106 (PFV 2.0.0.1, released): source forced AES75; remote no longer blocks the front',
                 working:'Main working/ (unreleased): source_select read from PE5 SOURCE_SELECTOR'};
/* SETTINGS_CHECK (MLC6A v100w.c): v105/v106 “// if ((SOURCE_SELECTOR) == 0)” → source_select = AES75 every loop;
   working/: PE5 low → AES75, else AES110. PORTE = 0x8F leaves PE5 without its pull-up, so “open” = high is INFERRED. */
const mainSource = () => D.mbuild==='working' ? (D.pe5? 1 : 2) : 1;
const snapshot = () => ({gain:D.gain.slice(), vol:D.vol, mute:D.mute.slice(), mmute:D.mmute, mode:D.mode, source:D.fsrc});

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
  ['PROCESS_PUSHBUTTONS · TRANSLATE_PUSHBUTTONS', .06, 'PINB4–7 (via FPGA) → presets, termination select (PB6/7 not fitted on the MLC6A)'],
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
  ['DOLBY_error(PINE)', .02, 'Leftover from AMS8 (no Dolby card on MLC6A)'],
  ['UART0_translate · UART0_com_check · UART1_setup', .10, 'Parse the front-panel reply; after 5 loops hand over to UART1'],
  ['UART1_translate · UART1_com_check · UART0_setup', .08, 'Same for the remote panel (MLC6AR)'],
  ['DOLBY_RESET · SETTINGS_CHECK', .04, 'GAIN_LOCK (PINF3) and DIM_ENABLED (PINE4); save last settings after SETTINGS_COUNT quiet loops'],
];
const MFRAC = (()=>{ let a=0; return MSTEPS.map(s=>{ const r=a; a+=s[1]; return r; }); })();
let PK='', PS=null;
function polls(){
  const mk = D.markers.map(m=>m.kind+m.t).join(',');
  const key=[D.link, D.power, D.bootAt, D.remote, mk, D.fbuild].join('|');
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
    p.again = D.fbuild==='v204' && !!prev && prev.change && !p.change;   // V204: gainN_take = 2 → the same change goes out twice
    p.full = p.idle || p.change || p.again;
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
  for (let c=0;c<8;c++){ b.push(CHID[c].charCodeAt(0), (p.idle||p.change||p.again)?1:0); if (D.mute[c]) b.push(0x46,0x46); else b.push(Math.floor(D.gain[c]/10), D.gain[c]%10); }
  b.push(0x56,1); if (D.mmute) b.push(0x46,0x46); else b.push(Math.floor(D.vol/10), D.vol%10);
  b.push(0x50,1,0x30+D.preset, 0x4D,1,D.mode, 0x53,1,D.fsrc, 0x24);
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
  // PE6/PE7 still drive PB_LED3/4 (5.1 / ST) — there are no buttons for them on the MLC6A panel ({m51, mst} kept for the Software tab)
  if (!D.power) return {p1:0,p2:0,m51:0,mst:0};
  if (lossAt(t)){ const f=flashOnAt(t); return {p1:f,p2:!f,m51:f,mst:!f}; }   // PB_LED1+3 / PB_LED2+4 alternate
  if (D.sourceMode) return {p1:1,p2:1,m51:D.fsrc===1,mst:D.fsrc===2};
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
      D.triedSource=true; tr('source_press == YES (both PRESET buttons held) → source_press = NO, source_mode = YES, activity_counter = 0');
      tr('TRANSLATE_PUSHBUTTONS(): source_mode → PB_LED1 + PB_LED2 on; PB_LED3/PB_LED4 (PE6/PE7) would show AES75/AES110 — but the MLC6A panel has no 5.1 or ST button, so there is no lamp to see and no button to choose with.');
      tr(`Choosing needs MODE1_PB / MODE4_PB (PINB6/PINB7 via the FPGA); with no buttons fitted they never go low ${inf}. source_mode just times out after NO_ACTIVITY_THRESHOLD = 5000 passes ≈ 4.2 s (counted here in real seconds).`);
      tr(`Even an S field from the front would be ignored: MLC6A main board ${D.mbuild} has <span class="mono">//source_select = rx_buffer[44];</span> and SETTINGS_CHECK sets the source itself (${D.mbuild==='working'?'from PE5':'always AES75'}).`); return; }
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
    // 5.1 / ST (PB6/PB7): not fitted on the MLC6A panel — TRANSLATE_PUSHBUTTONS' MODE1_PB/MODE4_PB branches are dead code here
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
    if (on) tr('Locks: the six channel knobs (and the absent 7/8). Not locked: MASTER (turn and mute) and the presets — a preset recall still overwrites the locked gains.'); }, 'gpi'); },
  setDim(on){ act(`Main board DIM_ENABLED input ${on?'closed':'open'}`, tr=>{ D.dim=on;
    tr(`SETTINGS_CHECK(): (DIM_ENABLED = PINE & BIT4) == 0 → dim_enabled = ${on?'YES':'NO'}; ALTERA_TRANSLATE_UART0: output2 = ${on?'DIM_GAIN (21)':'UNITY_DIM_GAIN (66)'} → SHARC output_gain+1 multiplies the master (“added dim gain”, v105)`);
    tr(`Dim = vt(21)/vt(66) = ${fmtDb(db(vt(21)/vt(66)),2)} relative; “unity” 66 is itself ${fmtDb(db(vt(66)),2)}.`);
    tr(`Front panel learns it from the N field: dim_enabled → ALTERA_write ring 9 uses ${on?'DIM_LED_BAR_DOT / DIM_LED_BAR: the bar drops 6 LEDs and the undimmed position blinks':'the plain bar'}.`); }, 'gpi'); },
  remoteMute(c){ act(`MLC6AR remote: press ${KNOB[c]}`, tr=>{
    if (!D.remote){ tr('No remote panel on SERIAL COMM — click the DB9 on the rear panel to connect one.'); return; }
    D.mute[c]=D.mute[c]?0:1;
    tr(`Remote → main board UART1 (#A…$, ${CHID[c]} take = YES, F,F) → main board new_data → next front request is the full 47-byte #A frame`);
    tr(`Front UART0_translate(): rx_buffer[${4*c+2}] == chF && rx_buffer[${4*c+3}] == chF → ch${c+1}_mute = ${D.mute[c]?'YES':'NO'}. mute${c+1}_rotations is NOT reset here (it is ${D.rot[c]}).`);
    if (D.mute[c] && D.rot[c]===0) tr(`mute${c+1}_rotations is 0 (the last unmute was by turning), so the next decrement wraps to 255: unmuting this channel by turning now takes ≈ 256 detents. Pressing the knob still works.`);
    if (D.mbuild==='v105') tr('Main V105: UART1_translate() “REMOTE PANEL HAS NEW INFORMATION, BLOCK FRONT PANEL” → receive_data0 = YES, data_available0 = NO, timeout0 = YES: the front panel is not asked for data until the remote goes quiet. V106 comments these four lines out (“fixed communication issue”).');
    tr('Software listing: “If the MAIN UNIT is the MLC6A, use the MLC6A FRONT PANEL software for the ATMEL” — the MLC6AR runs MLC6AV205, this same code.');
  }, 'remote'); },
  setPE5(on){ act(`Main board PE5 (SOURCE_SELECTOR) ${on?'tied low':'left open'}`, tr=>{ D.pe5=on; const was=D.source; D.source=mainSource();
    tr('MLC6A v100w.c: <span class="mono">#define SOURCE_SELECTOR PINE & BIT5</span> (the MLC8A has <span class="mono">//#define GAIN_LOCK PINE & BIT5</span> here). port_init: PORTE = 0x8F, DDRE = 0x47 → PE5 is an input with its pull-up OFF (MLC8A: 0xAF, pull-up on).');
    if (D.mbuild==='working') tr(`working/ SETTINGS_CHECK(): if ((SOURCE_SELECTOR) == 0) source_select = AES75; else source_select = AES110 → ${D.source===1?'AES75':'AES110'}${on?'':' (open pin with no pull-up: reads high only if the board has an external resistor — '+inf+')'}`);
    else { tr(`Released ${D.mbuild.toUpperCase()}: the test is commented out — <span class="mono">// if ((SOURCE_SELECTOR) == 0) source_select = AES75; //else …</span> — so the pin is read by nobody and source_select stays AES75.`); if (was===D.source) D._nochange=true; }
    if (was!==D.source) tr(`ALTERA_SORT → REG20 input routing → the ${D.source===1?'75 Ω BNC':'110 Ω Phoenix'} inputs. ${[0,1,2,3].every(p=>locked(p))?'All four pairs lock.':'Pairs without a cable on that connector show ERR.'}`);
  }, 'gpi'); },
  setBuild(which, v){ act(`Load ${which==='f'?FBUILDS[v]:MBUILDS[v]}`.split(':')[0], tr=>{
    if (which==='f'){ D.fbuild=v; PK='';
      tr(v==='v204'? 'V204 (Released/v204.zip, 2007-11-27): every GAIN_CONTROL_n / TRANSLATE_ENCODERn / RECALL sets <span class="mono">gainN_take = 2</span>; UART0_transmit_counter sends take = YES and decrements, so a change rides in two consecutive full replies (orange twice on the timeline).' :
        'V205 (v205/ = working/, 2007-12-21): <span class="mono">gainN_take = YES</span> (one reply per change), and uart0_rx_isr() now starts with “// ADDED data_available0 = NO; uart_tx_data0 = 0;” so a new request aborts a reply in progress. new_data1 in the idle refresh is commented out. Listing: “FIXED COMMUNICATION ISSUE”.');
      tr('Both builds: the only MLC6A-specific lines are <span class="mono">gain7 = 120, gain8 = 120</span> and pgain7/8 (MLC8A: 61). Header still says “MLC8 V2.04 Front Board Revision, January 31, 2007”.'); }
    else { D.mbuild=v; D.source=mainSource();
      tr(MBUILDS[v]+'.');
      tr(v==='working'? `SETTINGS_CHECK() reads PE5 → source_select = ${D.source===1?'AES75':'AES110'}.` : 'SETTINGS_CHECK() ends with <span class="mono">source_select = AES75;</span> every main-loop pass; the S field from either panel is ignored (<span class="mono">//source_select = rx_buffer[44]</span>).');
      if (v==='v105') tr('V105 → V106 diff: UART1_translate no longer blocks UART0 when the remote sends; UART0/1_com_check re-arm every new_gainN_data flag when a panel has nothing new.'); }
  }, 'gpi'); },
  cable(kind, p){ act(`${D[kind][p]?'Unplug':'Plug in'} AES IN ${p+1} (${kind==='cable75'?'75 Ω BNC':'110 Ω Phoenix'})`, tr=>{ D[kind][p]=!D[kind][p];
    tr(`CS8416_READ_LOCK_ALL() → Astatus bit ${p} = ${locked(p)?'locked':'unlocked'} (source_select = ${D.source===1?'AES75':'AES110'}) → ALTERA_SORT REG19 byte 72 bits 3–0 → FPGA → SHARC TDM_IN_ctl+18 bits 24–27`);
    tr(`translate_meter_results: ${locked(p)?'err bit cleared':'err bit (bit 9) set on channel '+(2*p+1)+'’s word'} → ERR LED of pair ${p+1} ${locked(p)?'off':'on'} (v102: “error display on meter display for no lock”)`); }); },
  setRemote(on){ act(`${on?'Connect':'Disconnect'} the MLC6AR remote (SERIAL COMM)`, tr=>{ D.remote=on;
    tr('The main board polls UART1 whether or not a remote is there (UART1_com_check after 5 loops). The DB9 also carries METER± — the front FPGA’s PWM meter stream (data_out1/2).'); }); },
  power(){ const on=!D.power; act(on?'Power on':'Power off', tr=>{ tr('Both boards lose power: front-panel RAM (gains, mutes, knob_activity) is lost; presets survive in the front EEPROM, last settings in the main-board EEPROM.'); }); D.power=on; FS_KEY=''; PK='';
    if (on){ D.bootAt=SIM.t; D.markers.push({t:SIM.t,kind:'boot',name:'boot'}); D.active=null; D.sourceMode=false; D.sourcePress=false;
      D.log[0].trace=['Front: initialization() (port_init, watchdog_init WDTCR=0x08, uart0_init), ALTERA_RESET(1000), DATA_initialization(), ALTERA_write()',
        'Front: loss_of_com = YES until the first #…$ arrives → rings dark, PB LEDs 1+3 / 2+4 alternate at the flash rate',
        `Main board: 9 × wait_ms(500), CONFIGURE_ALTERA, 6 × wait_ms(500), RECALL_LAST_SETTINGS (volume_level = 30 // -30dB), init_CS8416, RESET_SHARC — first poll ≈ ${C.MB_BOOT} s later ${inf}`,
        'The first request is a full #A frame (first_uart0_tx), so the front panel takes the main board’s last settings — including gain7/gain8, which no MLC6A knob can change (120 from the initialiser unless the EEPROM key 0xAA was found).'];
      D.vol=30; D.mmute=0; } else { D.bootAt=null; }
    SIM.refresh(); },
  setLink(on){ act(on?'Reconnect the front-panel link':'Disconnect the front-panel link (main board stops polling)', tr=>{ D.link=on; PK='';
    tr(on? 'Next request → UART0_translate → loss_of_com = NO' : `UART0_com_check(): start_com_timer counts COMMUNICATION_COUNTER1 = 15000 passes (≈ ${(C.COMM1*C.F_LOOP).toFixed(1)} s ${inf}) with no request → loss_of_com = YES → ALTERA_write sends 0 for every ring; LED_CHECK alternates PB LEDs. (Shown immediately here.)`); }); },
  reset(){ Object.assign(D, {power:true, link:true, remote:false, vol:30, mmute:0, mrot:3, mode:1, source:1, fsrc:1, fbuild:'v205', mbuild:'v106', pe5:true, preset:0, presets:{1:null,2:null}, pref:null, lock:false, dim:false,
      sourceMode:false, sourcePress:false, active:null, prog:'film', cal:0, log:[], markers:[], saves:[], bootAt:null, lastEnc:null, recalls:0, held:{}, presetHold:0, triedSource:false, lastRecall:0});
    D.gain=[61,61,61,61,61,61,GAIN78,GAIN78]; D.mute=[0,0,0,0,0,0,0,0]; D.rot=[2,2,2,2,2,2,2,2]; D.enc=Array.from({length:9},()=>({st:0,up:13,down:30}));
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
  if (D.sourceMode && now>D.sourceUntil){ D.sourceMode=false; D.log.unshift({t:SIM.t, name:'Termination select times out', trace:['LED_CHECK(): activity_counter == NO_ACTIVITY_THRESHOLD → source_mode = NO, RESET_PRESETS() (re-recall preset_hold if it was 1 or 2)','On the MLC8A the 5.1 and ST buttons would go back to selecting the mode; the MLC6A has neither, so nothing else changes.']}); SIM.refresh(); }
}

/* ================================================================
   DRAWING: front panel on the real silkscreen, meter window, rear
   ================================================================ */
/* Front silk: mlc6A-SILK.cdr (CorelDRAW, in this folder) → Inkscape/libcdr SVG. Two separations between crop marks:
   WHITE (L R C LFE LS RS, MASTER, 1, 2) and GREEN (WBS logo, WARD-BECK SYSTEMS, MLC-6A MULTICHANNEL LEVEL CONTROL,
   PRESETS bracket, 5.1 bracket). Crop box 87.16…1331.35 × 147.99…269.51 pt at 200 dpi → 3456 × 338 px.
   libcdr dropped the text alignment, so every label was re-anchored against Pics/MLC6A Front.jpg (logo and bracket
   paths are the CDR's own). Drill crosshairs: L at 457.9 pt (px 1029.8), pitch 72 pt = 1.000" (200 px), MASTER at
   1069.9 pt (px 2729.8), knob y 208.8 pt (px 168.9) — the same spacing as the MLC8A panel, with the 7th and 8th
   positions blank. PRESET buttons: the MLC8A positions shifted by the same offset (centred on the PRESETS bracket).
   Meter lens: the MLC8-M3 lens placed 844 px left / 150 px above the L knob, as on the MLC8A (photo: same window). */
const FW = 3456, FH = 338, DX = 3.3, DY = 4.4;            // offset of this frame from the mlc8.js frame
const KX = k => k<8? 1029.8+200*k : 2729.8, KY = 168.9;
const PBX = {p1:[3101.8,97.9], p2:[3246.8,97.9]};
const MCOL = [224.5,295.5,365.5,435.5,535.5,605.5,675.5,745.5].map(x=>x+DX);
const MROW = r => 29 + DY + 12*r;
const PAIRX = [262,402,572,712].map(x=>x+DX);
const ledCol = r => r<4? '#ff3b2f' : r<12? '#ffc23a' : '#6dff5a';             // 4 red, 8 yellow, 10 green per channel — INFERRED from BOM counts
const ledOff = r => r<4? '#2a1513' : r<12? '#2a2410' : '#152614';
function ringSVG(k, bits){
  const x=KX(k), big=k===8, R=big?76:53, r=big?7.2:5.6; let s='';
  for (let i=0;i<25;i++){ const a=(-135+i*11.25)*Math.PI/180, cx=x+R*Math.sin(a), cy=KY-R*Math.cos(a), on=(bits>>>i)&1;
    s+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="${on?(i===12?'#ffb43a':'#7dff6a'):(i===12?'#2d2412':'#16261a')}"${on?' filter="url(#m6g)"':''}/>`; }
  return s;
}
const SCREWS = [[383.6,174.6],[383.6,246.3],[710.9,167.7],[710.9,254.1],[1116.7,174.6],[1116.7,246.3],[1177.3,174.6],[1177.3,246.3],[1271.8,174.6],[1271.8,246.3],[141.8,174.6],[141.8,246.3]]
  .map(([x,y])=>[(x-87.16)*200/72,(y-147.99)*200/72]);   // panel screws, measured on Pics/MLC6A Front.jpg (±0.03", not in the CDR)
function frontSVG(t, opts){
  opts=opts||{};
  const loss=lossAt(t), flash=flashOnAt(t), scan=ringScanAt(t), mux=muxPhase(t), pb=pbLeds(t);
  let s=`<svg viewBox="${opts.vb||'0 0 '+FW+' '+FH}" role="img" aria-label="MLC6A front panel on the real silkscreen" style="width:100%;display:block;border-radius:6px;background:#141517">
    <defs><filter id="m6g" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="m6kn" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#3a3d40"/><stop offset="1" stop-color="#101112"/></radialGradient></defs>
    <rect width="${FW}" height="${FH}" fill="#141517"/>
    <rect x="${183+DX}" y="${4+DY}" width="600" height="322" fill="#070808"/>`;
  for (const [x,y] of SCREWS) s+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="#8d9093" stroke="#55585b" stroke-width="2"/><path d="M${(x-6).toFixed(1)} ${(y-6).toFixed(1)}l12 12M${(x+6).toFixed(1)} ${(y-6).toFixed(1)}l-12 12" stroke="#4a4c4f" stroke-width="3"/>`;
  // meters (eight columns: the lens and the SHARC metering are unchanged from the MLC8A)
  for (let c=0;c<8;c++){
    const m=meterAt(c,t), litNow = !opts.mux || c===mux || c===mux+4;
    for (let r=0;r<22;r++){ const j=21-r; const on = D.power && litNow && (j<m.n || j===m.dot);
      s+=`<rect x="${MCOL[c]-11}" y="${MROW(r)-4}" width="22" height="8" rx="1.5" fill="${on?ledCol(r):ledOff(r)}"${on?' filter="url(#m6g)"':''}/>`; }
  }
  for (let p=0;p<4;p++){ const c=2*p, m=meterAt(c,t), litNow = !opts.mux || c===mux || c===mux+4;
    const e = D.power && litNow && m.err, d = D.power && litNow && m.dd;
    s+=`<circle cx="${PAIRX[p]}" cy="${222+DY}" r="5" fill="${d?'#ffc23a':'#2a2410'}"${d?' filter="url(#m6g)"':''}/><circle cx="${PAIRX[p]}" cy="${259+DY}" r="5" fill="${e?'#ff3b2f':'#2a1513'}"${e?' filter="url(#m6g)"':''}/>`; }
  s+=`<image href="${ASSET}mlc6a-lens-white.png" x="${182.5+DX}" y="${14.5+DY}" width="600" height="300"/>
    <image href="${ASSET}mlc6a-front-green.png" width="${FW}" height="${FH}"/><image href="${ASSET}mlc6a-front-white.png" width="${FW}" height="${FH}"/>`;
  // knobs and rings: only the seven fitted encoders (PANEL_K); rings 7 and 8 are still scanned by ALTERA_write
  for (const k of PANEL_K){
    const x=KX(k), big=k===8, hole=big?94.5:66.5, kr=big?56:38;
    const lit = D.power && (!opts.mux || k===scan);
    s+=`<g class="knob" data-k="${k}" style="cursor:pointer"><circle cx="${x}" cy="${KY}" r="${hole}" fill="#060707" stroke="#2a2c2e" stroke-width="2"/>
      ${ringSVG(k, lit? ringBits(k, flash, loss) : 0)}
      <circle cx="${x}" cy="${KY}" r="${kr}" fill="url(#m6kn)" stroke="${D.sel===k?'var(--accent)':'#2b2d2f'}" stroke-width="${D.sel===k?5:3}"/>
      ${Array.from({length:12},(_,i)=>{ const a=i*30*Math.PI/180; return `<line x1="${(x+(kr-8)*Math.sin(a)).toFixed(1)}" y1="${(KY-(kr-8)*Math.cos(a)).toFixed(1)}" x2="${(x+(kr-2)*Math.sin(a)).toFixed(1)}" y2="${(KY-(kr-2)*Math.cos(a)).toFixed(1)}" stroke="#2e3133" stroke-width="3"/>`; }).join('')}
      <circle cx="${x}" cy="${KY}" r="${hole+4}" fill="transparent"><title>${KNOB[k]}: click left = counter-clockwise, centre = press (mute), right = clockwise; mouse wheel turns</title></circle></g>`;
  }
  if (opts.ghost){ for (const k of [6,7]){ const x=KX(k), on=D.power && (!opts.mux || k===scan) ? ringBits(k, flash, loss) : 0;
    s+=`<g opacity=".55"><circle cx="${x}" cy="${KY}" r="66.5" fill="none" stroke="var(--warn)" stroke-width="3" stroke-dasharray="10 8"/>${ringSVG(k,on)}<text x="${x}" y="${KY+6}" text-anchor="middle" font-size="22" fill="#e3a35a">ch${k+1}</text></g>`; } }
  // illuminated buttons (PRESET 1 / 2 only)
  for (const b in PBX){ const [x,y]=PBX[b], on=pb[b];
    s+=`<g class="pb" data-b="${b}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="38.5" fill="#060707"/><rect x="${x-27}" y="${y-27}" width="54" height="54" rx="7" fill="${on?'#ffd84a':'#3b3522'}" stroke="#1d1b12" stroke-width="3"${on?' filter="url(#m6g)"':''}/>
      <rect x="${x-14}" y="${y-8}" width="28" height="16" rx="2" fill="${on?'#fff3b0':'#4a4430'}" opacity=".8"/>
      ${D.held[b]?`<circle cx="${x}" cy="${y}" r="34" fill="none" stroke="var(--play)" stroke-width="5"/>`:''}</g>`; }
  if (!D.power) s+=`<rect width="${FW}" height="${FH}" fill="#000" opacity=".25"/>`;
  s+=(opts.hot||'')+'</svg>';
  return s;
}
/* Rear: “MLC6A (Front & Rearview).cdr” rear view (the MLC8-M6 rear, same connector set as the MLC8A), rendered at 200 dpi
   inside the panel outline (1814 × 176 px); SERIAL COMM label turned vertical as on Pics/MLC6A Rear.jpg. */
function rearSVG(){
  const bnc=[1183,1247,1314,1377], phx=[1282,1339,1396,1453];
  let s=`<svg viewBox="0 0 1814 176" role="img" aria-label="MLC6A rear panel (drawing from MLC6A (Front &amp; Rearview).cdr)" style="width:100%;display:block;border-radius:6px;background:#202326">
    <rect width="1814" height="176" fill="#202326"/><image href="${ASSET}mlc6a-rear.png" width="1814" height="176"/>`;
  bnc.forEach((x,p)=>{ const on=D.cable75[p]; s+=`<g class="jack" data-j="cable75" data-p="${p}" style="cursor:pointer">${on?`<circle cx="${x}" cy="51" r="21" fill="#2b5f9e" stroke="#9cc3f0" stroke-width="2"/><rect x="${x-7}" y="0" width="14" height="32" fill="#2b5f9e"/>`:''}
      <circle cx="${x}" cy="51" r="28" fill="transparent"><title>IN ${p+1} 75 Ω BNC — click to ${on?'unplug':'plug in'}</title></circle>
      <circle cx="${x+22}" cy="24" r="6" fill="${locked(p)&&D.source===1?'var(--accent)':on?'var(--warn)':'#555'}"/></g>`; });
  phx.forEach((x,p)=>{ const on=D.cable110[p]; s+=`<g class="jack" data-j="cable110" data-p="${p}" style="cursor:pointer">${on?`<rect x="${x-25}" y="118" width="50" height="40" rx="4" fill="#1f8a45" stroke="#9fe0b4" stroke-width="2"/><rect x="${x-6}" y="158" width="12" height="18" fill="#1f8a45"/>`:''}
      <rect x="${x-28}" y="114" width="56" height="54" fill="transparent"><title>IN ${p+1} 110 Ω Phoenix — click to ${on?'unplug':'plug in'}</title></rect>
      <circle cx="${x+22}" cy="110" r="6" fill="${locked(p)&&D.source===2?'var(--accent)':on?'var(--warn)':'#555'}"/></g>`; });
  s+=`<g class="jack" data-j="remote" style="cursor:pointer">${D.remote?`<rect x="584" y="58" width="44" height="62" rx="6" fill="#3a74b8" stroke="#9cc3f0" stroke-width="2"/>`:''}<rect x="575" y="40" width="62" height="100" fill="transparent"><title>SERIAL COMM (RS-422 to the MLC6AR remote; also METER±) — click to ${D.remote?'disconnect':'connect'} a remote</title></rect></g>
    <text x="10" y="170" font-size="13" fill="#aab">Drawing MLC6A (Front &amp; Rearview).cdr — click the IN connectors and SERIAL COMM</text></svg>`;
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
    <label class="small">Knob <select data-c="sel">${PANEL_K.map(i=>`<option value="${i}" ${i===D.sel?'selected':''}>${i===8?7:i+1} ${KNOB[i]}</option>`).join('')}</select></label>
    <button data-a="l" title="Q">⟲ turn</button><button data-a="p" title="W">press</button><button data-a="r" title="E">turn ⟳</button>
    <label class="small">detents per click <select data-c="clk">${[1,2,4,8,16].map(n=>`<option ${n===D.clicks?'selected':''}>${n}</option>`).join('')}</select></label>
    <span class="small muted" style="margin-left:8px">Buttons</span>
    <button data-a="t1" title="P">PRESET 1 tap</button><button data-a="h1" title="Shift+P">hold 1 (store)</button>
    <button data-a="t2" title="O">PRESET 2 tap</button><button data-a="h2" title="Shift+O">hold 2 (store)</button>
    <button data-a="both" title="B">hold 1+2 &amp; press MASTER</button></div>
    <div class="small muted" style="margin-top:4px">Click a knob's left third to turn it counter-clockwise, its centre to press it (mute), its right third to turn clockwise; the mouse wheel turns it (Shift = 10 detents). Hold a PRESET button for 5 real seconds to store. Keys: 1–6 pick L…RS, 7 MASTER, Q W E turn/press, P O presets (Shift = store), B termination select. There are no 5.1 / ST buttons on the MLC6A.</div>`;
}
function bindControls(root){
  const map={l:()=>A.turn(D.sel,-1), p:()=>A.push(D.sel), r:()=>A.turn(D.sel,1), t1:()=>{A.pbDown('p1');A.pbUp('p1');}, t2:()=>{A.pbDown('p2');A.pbUp('p2');},
    h1:()=>A.store(1), h2:()=>A.store(2), both:()=>A.bothMaster()};
  root.querySelectorAll('[data-a]').forEach(b=> b.onclick=()=>map[b.dataset.a]());
  const s=root.querySelector('[data-c=sel]'); if (s) s.onchange=e=>{ D.sel=+e.target.value; SIM.refresh(); };
  const k=root.querySelector('[data-c=clk]'); if (k) k.onchange=e=>{ D.clicks=+e.target.value; };
}
document.addEventListener('keydown', e=>{
  if (!window[KEYFLAG] || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key; let done=true;
  if (/^[1-7]$/.test(k)){ D.sel=PANEL_K[+k-1]; SIM.refresh(); }
  else if (k==='q'||k==='Q') A.turn(D.sel,-1, e.shiftKey?10:undefined);
  else if (k==='w'||k==='W') A.push(D.sel);
  else if (k==='e'||k==='E') A.turn(D.sel,1, e.shiftKey?10:undefined);
  else if (k==='p') { A.pbDown('p1'); A.pbUp('p1'); } else if (k==='P') A.store(1);
  else if (k==='o') { A.pbDown('p2'); A.pbUp('p2'); } else if (k==='O') A.store(2);
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
    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
    <label class="small">Front firmware <select data-s="fb">${Object.keys(FBUILDS).map(k=>`<option value="${k}" ${k===D.fbuild?'selected':''}>${k.toUpperCase()}</option>`).join('')}</select></label>
    <label class="small">Main-board firmware <select data-s="mb">${Object.keys(MBUILDS).map(k=>`<option value="${k}" ${k===D.mbuild?'selected':''}>${k==='working'?'working/':k.toUpperCase()}</option>`).join('')}</select></label>
    <label class="small"><input type="checkbox" data-s="pe5" ${D.pe5?'checked':''}> PE5 SOURCE_SELECTOR tied low</label></div>
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
  q('fb').forEach(e=>e.onchange=()=>A.setBuild('f', e.value));
  q('mb').forEach(e=>e.onchange=()=>A.setBuild('m', e.value));
  q('pe5').forEach(e=>e.onchange=()=>A.setPE5(e.checked));
  q('dim').forEach(e=>e.onchange=()=>A.setDim(e.checked));
  q('dd').forEach(e=>e.onchange=()=>act(`IN${+e.dataset.p+1} ${e.checked?'carries':'stops carrying'} non-PCM data`, tr=>{ D.dd[+e.dataset.p]=e.checked; tr('Astatus bits 7–4 “DD indication” → REG19 → TDM_IN_ctl+18 bits 28–31 → translate_meter_results sets bit 8 (dd) → DD LED. How the MLC8A main board derives it from the CS8416 is not traced '+inf+'.'); }));
  q('all110').forEach(e=>e.onclick=()=>act('Move every input cable to the 110 Ω Phoenix inputs', tr=>{ D.cable75=[false,false,false,false]; D.cable110=[true,true,true,true]; tr(D.source===1? `source_select is AES75 (main board ${D.mbuild}) → every pair unlocks → four ERR LEDs. The MLC6A front panel cannot change this (no ST button; the main board ignores the S field). ${D.mbuild==='working'?'Open the PE5 SOURCE_SELECTOR to get AES110.':'Only the unreleased working/ main-board build reads PE5.'}` : 'Locked on AES110.'); }));
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
  if ((e=q('[data-s=pe5]'))) e.checked=D.pe5; if ((e=q('[data-s=fb]'))) e.value=D.fbuild; if ((e=q('[data-s=mb]'))) e.value=D.mbuild;
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
  ls.push(uartLane('UART1 main → remote MLC6AR',2));
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
    <tr><th>gain1…6 · (7, 8) / volume</th><td class="mono small">${D.gain.slice(0,6).map((g,c)=>gtxt(c)).join(' · ')} · <span class="muted">(${gtxt(6)}, ${gtxt(7)} — no knobs)</span> / ${D.mmute?'<b style="color:var(--bad)">MUTE</b>':D.vol}</td></tr>
    <tr><th>Mode · source · preset</th><td class="mono small">${D.mode===1?'MODE1 (5.1)':'MODE4 (ST)'} · main ${D.source===1?'AES75':'AES110'} / front ${D.fsrc===1?'AES75':'AES110'}${D.sourceMode?' (selecting)':''} · preset '${D.preset}' · lock ${D.lock?'YES':'NO'} · dim ${D.dim?'YES':'NO'}</td></tr>
    <tr><th>Firmware</th><td class="mono small">front ${D.fbuild.toUpperCase()} · main ${D.mbuild==='working'?'working/':D.mbuild.toUpperCase()} · PE5 ${D.pe5?'low':'open'}</td></tr>
    <tr><th>Monitor outputs</th><td class="mono small">${o.map((x,c)=>`${CH[c]} ${isFinite(x.db)? x.db.toFixed(1)+' dBFS':'—'}`).join(' · ')}</td></tr>
  </table>`;
}
function viewSim(m){
  window[KEYFLAG]=true;
  m.innerHTML = `
  ${card('Front panel at the playhead — built on the mlc6A-SILK.cdr front silk and the MLC8-M3 meter lens', `<div id="fp"></div>${controlsHTML()}`)}
  <div class="grid2">
    <div>${card('Signals, firmware builds, rear connections and main-board inputs', `<div id="sig"></div><div id="rp" style="margin-top:8px"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}</div>
    <div>${card('What the software did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('Meter window, enlarged', `<div id="mz"></div><p class="small muted">VU bar with a PPM dot (translate_meter_results: <span class="mono">bar | (pk&lt;&lt;1 xor pk)</span>). Factory calibration −20 dBFS = 0. LED colours 4 red / 8 yellow / 10 green per column ${inf} from the BOM counts; DD and ERR dots sit above their labels ${inf}.</p>`)}</div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek; use the transport above)', `<canvas id="tl"></canvas>
    <p class="small muted">Front-panel pass ≈ 0.833 ms ${inf} (the manual's “approximately five seconds” preset hold ÷ PRESET_DEBOUNCE 6000). Main-board loop ≈ 5 ms ${inf}; the 1.82 ms gap between main-board UART bytes is from a v100w.c comment. Meter mux 2.5 ms = TPERIOD1 153600 at a 61.44 MHz SHARC clock ${inf}. PWM bit = 12.288 MHz ÷ 128 ÷ 4 = 41.67 µs (from the VHDL).</p>`)}
  ${card('Action log', `<div id="log" class="log"></div>`)}`;
  m.querySelector('#sig').innerHTML = signalsHTML(); bindSignals(m.querySelector('#sig'));
  bindControls(m);
  const draw=()=>{
    const t=SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t,{mux:D.viewMux}); bindPanel(m.querySelector('#fp'));
    m.querySelector('#mz').innerHTML = frontSVG(t,{mux:D.viewMux, vb:'179 4 614 330'});
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
  {title:'Meet the MLC6A', body:`<p>The MLC6A is a one-rack-unit <b>Multi-Channel Level Control</b> for 5.1 monitoring. It meters four AES pairs (eight channels) on the bargraphs at the left, and lets an operator set an “acoustic mix” for the monitor speakers with six channel knobs — <b>L, R, C, LFE, LS, RS</b> — and a <b>MASTER</b> knob.</p>
    <p>Every knob is an endless encoder with a push switch and a ring of 25 LEDs. The two lit buttons at the right are <b>PRESET 1</b> and <b>PRESET 2</b>. Compared with the MLC8A, the stereo pair of knobs and the 5.1 / ST buttons are missing.</p><p class="muted">The archive has no MLC6A manual. These lessons follow the MLC8A manual (Jan 2007|40), whose controls the MLC6A shares, and the MLC6A firmware. Click Next.</p>`, check:()=>true, auto:true},
  {title:'1 · Read the meters', body:`<p>The unit is factory calibrated <b>−20 dBFS = 0</b>. Feed it line-up tone: choose <b>“Line-up tone −20 dBFS on all eight”</b> in the Signals card.</p><p>All eight bars should stop at <b>0</b>. Each bar is the VU level; the single brighter dot above it is the PPM peak.</p><p>The meters show the <b>incoming</b> signal. The knobs do not move them.</p>`, check:()=>D.prog==='tone', hint:'Signals card → Programme on the inputs → Line-up tone.'},
  {title:'2 · Set a channel level', body:`<p>Turn <b>C</b> (centre) clockwise until its ring reaches the <b>yellow LED at 12 o'clock</b>. The SHARC scales each knob so that 12 o'clock is about unity.</p><p>Each detent moves the internal value by 4 (0–255) ${inf}; the ring has 25 LEDs, one per 8 steps.</p>`, check:()=>D.gain[2]>=104, hint:'Pick knob 3 (C) and click its right side, or use the mouse wheel (Shift = 10 detents).'},
  {title:'3 · Set the master', body:`<p>The <b>MASTER</b> knob scales the whole mix. Bring it to the yellow 12 o'clock LED as well (value 104–119).</p>`, check:()=>D.vol>=104 && D.vol<120 && !D.mmute, hint:'Knob 7 (MASTER): turn clockwise.'},
  {title:'4 · Mute a channel', body:`<p>Press the <b>LFE</b> knob. Its ring goes dark except the highest lit LED, which flashes. The LFE output goes silent.</p>`, check:()=>D.mute[3]===1, hint:'Click the centre of the LFE knob (or select knob 4 and press W).'},
  {title:'5 · Un-mute by turning', body:`<p>Pressing again un-mutes. So does <b>turning</b> — but not on the first detent. The firmware counts <span class="mono">mute4_rotations</span> down from 2 and only un-mutes when it reaches 0 (the master needs 3). Turn LFE until it comes back.</p>`, check:()=>D.mute[3]===0 && D.log.some(l=>/Turn LFE/.test(l.name)), hint:'Turn LFE one detent at a time and read the trace.'},
  {title:'6 · Store preset 1', body:`<p>Set a mix you like, then <b>hold PRESET 1</b> for about five seconds until the LEDs flicker and the button lights. (Use “hold 1 (store)” to skip the wait.)</p><p>The flicker is a side effect: writing 20 EEPROM bytes stalls the loop for ≈170 ms, and the ring multiplexing stops ${inf}.</p>`, check:()=>!!D.presets[1] && D.preset===1, hint:'Hold the PRESET 1 button for 5 real seconds, or click “hold 1 (store)”.'},
  {title:'7 · Recall it', body:`<p>Change any knob — the PRESET 1 light goes out because the mix no longer matches. Then <b>tap PRESET 1</b>: the stored mix returns and the button lights again.</p>`, check:()=>D.lastRecall===1 && D.preset===1 && D.recalls>0, hint:'Turn something, then tap PRESET 1 (P key).'},
  {title:'8 · The pair without knobs', body:`<p>Choose <b>“Hot stereo, quiet surround”</b>. Meters CH7 and CH8 show the stereo programme on AES IN 4. It still reaches outputs 7 and 8 — but there is no knob for it.</p><p>The MLC6A firmware starts <span class="mono">gain7</span> and <span class="mono">gain8</span> at <b>120</b> instead of 61 (≈ ${fmtDb(db(vt(120)*OFS))} instead of ${fmtDb(db(vt(61)*OFS))}), so the pair passes at about unity × MASTER. See the “State at the playhead” card on the Simulator tab.</p>`, check:()=>D.prog==='hot', hint:'Signals card → Programme → Hot stereo, quiet surround.'},
  {title:'9 · Try to change the input termination', body:`<p>The truck now feeds you on the <b>110 Ω</b> Phoenix inputs. Click <b>“Move every input to 110 Ω”</b>: four red ERR LEDs light because the unit listens to the 75 Ω BNCs.</p>
    <p>On an MLC8A you would hold PRESET 1 + 2, press MASTER, then press ST. Try it (“hold 1+2 &amp; press MASTER”): both PRESET lights come on — and then there is nothing to press. Read the trace.</p>`, check:()=>D.cable110.every(x=>x) && D.triedSource, hint:'Click “Move every input to 110 Ω”, then “hold 1+2 & press MASTER”.'},
  {title:'10 · Termination is a main-board setting', body:`<p>In the MLC6A the main board decides: <span class="mono">SETTINGS_CHECK()</span> sets <span class="mono">source_select</span> itself. The released V105/V106 builds hard-wire AES75. Only the unreleased <span class="mono">working/</span> build reads the <b>PE5 SOURCE_SELECTOR</b> input.</p><p>Select main-board firmware <b>working/</b> and untick <b>PE5 tied low</b>. The ERR LEDs go out.</p>`, check:()=>D.source===2 && D.cable110.every(x=>x), hint:'Signals card → Main-board firmware = working/, then untick PE5.'},
  {title:'11 · Dim and lock', body:`<p>Two inputs on the main board change how the panel behaves. Tick <b>DIM_ENABLED</b>: the master ring's bar drops six LEDs and the undimmed position blinks; the speakers drop ≈10 dB (the listing's “ADDED DIM FEATURE”, PFV 2.0.0.0).</p><p>Then tick <b>GAIN_LOCK</b> and try turning a channel knob. Try MASTER too — it is not locked.</p>`, check:()=>D.dim && D.lock, hint:'Signals card → tick DIM_ENABLED and GAIN_LOCK.'},
  {title:'Done', body:`<p>You've used every control on the MLC6A. The <b>Software</b> tab shows each step inside the three processors, <b>One second</b> breaks the panel down to UART bytes, ring and meter frames and PWM bits, and <b>Findings</b> lists what the MLC6A changed from the MLC8A code — and what it forgot to change.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){
  window[KEYFLAG]=true;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — operating the MLC6A (after the MLC8A manual, 2007|40)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
    <div>${card('What the software did', `<div id="trace" class="log"></div>`)}${card('Signals and main-board inputs', `<div id="sig"></div>`)}</div></div>
    ${card('The unit', `<div id="fp"></div>${controlsHTML()}<div id="rp" style="margin-top:8px"></div>`)}`;
  const hot=`<g><rect x="186.3" y="8.4" width="600" height="322" fill="transparent"><title>Eight bargraph meters (VU bar + PPM dot), DD and ERR per AES pair</title></rect></g>`;
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
    ${card('As seen by the displays — only what is lit at this instant', `<div id="fp"></div><div id="mz2" style="max-width:360px;margin-top:6px"></div><p class="small muted">Rings are multiplexed one per front-panel pass (9 ring slots, 1/9 duty — slots 7 and 8, dashed, drive ring LEDs that sit behind blank panel on the MLC6A) and meters two columns per 2.5 ms mux phase (1/4 duty). Your eye integrates this; the panel above shows only the LEDs that are actually on now. Step with “1 front pass” or “1 meter mux phase”.</p>`)}
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
      ['Each ring refreshed', '≈ 133', SIM.fmtDur(9*C.F_LOOP), 'update cycles 1…9 — slots 7 and 8 light rings that are not on the MLC6A panel'],
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
    m.querySelector('#fp').innerHTML = frontSVG(t,{mux:true, ghost:true}); bindPanel(m.querySelector('#fp'));
    m.querySelector('#mz2').innerHTML = frontSVG(t,{mux:true, vb:'179 4 614 330'});
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
  ctl:{x:16,y:16,w:170,h:96,t:'Front controls',s:['7 encoders + push','PRESET 1/2 only','(MLC8 front PCB '+'inferred'+')'],d:'mlc6A-SILK.cdr has drill marks for six channel encoders at the MLC8A L…RS positions, the MASTER at the MLC8A MASTER position, and two PRESET buttons; positions 7 and 8 and the 5.1 / ST buttons are blank. The firmware still scans all nine encoders (SWITCH_/SHAFT_ENCODER1…9) and all four buttons. That the MLC8 front PCB is fitted with encoders 7/8 and PB3/4 left off is inferred from the identical spacing and the unchanged code.'},
  fmcu:{x:226,y:16,w:190,h:110,t:'Front ATmega128 @ 8 MHz',s:['MLC6A v200w.c V205 (ICC AVR)','gain7/8 = 120 · presets in EEPROM','UART0 38400 → main'],d:'Reads the encoders and buttons every pass, keeps gain1…8 / volume (0–255), mutes, presets and mode, answers the main board one UART byte per pass and writes one 48-bit ring frame per pass. Watchdog WDTCR = 0x08.'},
  ffpga:{x:226,y:170,w:190,h:120,t:'Front Cyclone II EP2C5',s:['ring signals: inverted pass-through','meter signals: inverted pass-through','shift_in_out64 → PWM out','blanking_pulse 10.4 µs'],d:'MLC8A.bdf (Quartus 5.1): a glue chip. It inverts the AVR ring clock/data/strobe to the dial drivers and the SHARC meter clock/data/strobe/OE to the meter drivers, stretches the strobe into an OE blank, and re-encodes the meter frames as a 24 kbit/s PWM stream (data_out1/2) for the remote panel.'},
  led:{x:16,y:170,w:170,h:120,t:'LED drivers',s:['7 × A6276 (16-bit sink)','13 × FDC634 (row switch)','9 rings × 25 · 8 meters × 22'],d:'From the iss2 BOM: 7 A6276 16-bit constant-current LED drivers = 48-bit ring chain (16 select + 32 LEDs) + 64-bit meter chain; 13 FDC634 P-FETs = 9 ring switches + 4 meter mux switches (allocation inferred from counts).'},
  rem:{x:16,y:330,w:170,h:80,t:'MLC6AR remote',s:['SERIAL COMM DB9','runs MLC6AV205 (listing)'],d:'Optional remote panel. The software listing says the MLC6AR uses MLC6AV205 — this same front-panel code. Polled by the main board on UART1 with the same #…$ frames; its meters are fed from METER± (the PWM stream).'},
  mmcu:{x:456,y:16,w:200,h:110,t:'Main ATmega128 @ 4.9152 MHz',s:['MLC6A AMS8-1 v100w.c V106','polls front + remote','LOCK PF3 · DIM PE4 · SOURCE PE5'],d:'MLC6A build: source_select is set here (SETTINGS_CHECK: AES75 in V105/V106, PE5 in working/), not by the panels. Polls the front panel and the remote alternately, converts their gains into the 80-byte register block for the main FPGA, reads the receivers, saves the last settings, and reboots itself through the watchdog if the FPGA link misaligns. A serial bootloader is linked at 0x1F800.'},
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
  {name:'1 · Front ATmega128 (U14)', note:'Pin functions from MLC6A v205 v200w.c (port_init, #defines — identical to MLC8A) and encoder1…9.c. Crystal X2 8 MHz from the MLC8 BOM (XCK_8M000 build). The “not fitted” marks come from mlc6A-SILK.cdr (no panel holes); the PCB itself is not in the MLC6A folder (inferred to be the MLC8 front board).', svg:()=>
    chip(330,48,200,'ATmega128(L) U14',[
      ['PA0…PA7','ENC1…8 push (SWn)'],['PG2','ENC9 MASTER push'],['PF0/PF1','ENC1 L  A/B'],['PG3/PG4','ENC2 R  A/B'],['PD0/PD1','ENC3 C  A/B'],['PD6/PD7','ENC4 LFE A/B'],['PG0/PG1','ENC5 LS  A/B'],['PC0/PC1','ENC6 RS  A/B'],['PC2/PC3','ENC7 A/B — no knob on MLC6A'],['PC4/PC5','ENC8 A/B — no knob on MLC6A'],['PC6/PC7','ENC9 MASTER A/B (phase swapped)'],
    ],[
      ['PB0','ALTERA_CLOCK → FPGA clk (48)'],['PB1','ALTERA_DATA → FPGA data (47)'],['PB2','STROBE_WRITE → FPGA strb (45)'],['PB4/PB5','PRESET 1 / 2 ← FPGA portb4/5'],['PB6/PB7','5.1 / ST — not fitted'],['PE4…PE7','PB_LED1…4 (P1, P2; 3/4 unused)'],['PD4','altera_reset'],['PE0/PE1','RXD0/TXD0 → LTC1480'],['PF2/PF3','U16 RX / U15 TX enable'],['PD2/PD3','UART1 (not initialised)'],['XTAL','X2 8.000 MHz'],
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
    for (let r=0;r<9;r++) s+=`<circle cx="${60+r*60}" cy="165" r="20" fill="none" stroke="${r===6||r===7?'var(--warn)':'var(--accent)'}" stroke-dasharray="3 3"/><text x="${60+r*60}" y="169" text-anchor="middle" font-size="10" fill="var(--ink)">${['L','R','C','LFE','LS','RS','7 —','8 —','MAST'][r]}</text>`;
    s+=`<text x="30" y="205" font-size="10.5" fill="var(--warn)">MLC6A: ring slots 7 and 8 are still driven every 9th pass; the panel has no knob there (orange).</text>`;
    s+=`<text x="30" y="230" font-size="13" font-weight="700" fill="var(--ink)">Meter chain (SHARC shifter, 64 bits, bit 0 of word k first)</text>`;
    ['A6276 #4','A6276 #5','A6276 #6','A6276 #7'].forEach((n,i)=>{ s+=`<rect x="${30+i*150}" y="245" width="130" height="40" fill="var(--panel2)" stroke="var(--ink)"/><text x="${95+i*150}" y="270" text-anchor="middle" font-size="11" fill="var(--ink)">${n}</text>`; });
    s+=`<text x="30" y="310" font-size="11" fill="var(--ink2)">word k: bits 0–3 select one of 4 FDC634 column switches · bit 8 DD · bit 9 ERR · bits 10–31 = 22 LEDs (+14 … 34)</text>
      <text x="30" y="328" font-size="11" fill="var(--ink2)">phase k lights CH(k+1) and CH(k+5): 4 phases × 2.5 ms · LED colours 4 red / 8 yellow / 10 green per column (BOM)</text>
      <text x="30" y="360" font-size="11" fill="var(--ink2)">Both chains are driven through FPGA NOT gates, so the boards must re-invert them (2N4401/2N4403 or similar; not traced) — ${'inferred'}.</text>`;
    return s; }},
  {name:'4 · Serial links', note:'Parts from the BOM (LTC1480 ×4 with the 75176 footprint, DS34LV87T, DS34LV86T ×2); DB9 pin names from the MLC8A MLC8-A(ConnectorLayout).pdf (same rear); enables from uart0_init/uart1_init comments.', svg:()=>
    chip(80,60,170,'Front AVR UART0',[['TXD0 PE1',''],['RXD0 PE0',''],['PF3','U15 TX enable'],['PF2','U16 RX enable']],[['→ U15 LTC1480','TX±'],['← U16 LTC1480','RX±']],'38400 8N1 (UBRR0 0x19, U2X)')
    + chip(520,60,190,'Main AVR UART0 / UART1',[['UART0','front panel link'],['UART1','remote (DB9)']],[['UBRR 0x07','38400 @ 4.9152 MHz'],['PORTF 0x08','“set U10 to be TX” (= PF3)'],['PD5','UART1 driver']],'AMS8-1 v100w.c')
    + `<text x="80" y="250" font-size="12" font-weight="700" fill="var(--ink)">SERIAL COMM DB9 (rear)</text>
      <text x="80" y="270" font-size="11" fill="var(--ink)">RX−  RX+  TX+  TX−  METER−  METER+  GROUND</text>
      <text x="80" y="290" font-size="11" fill="var(--ink2)">METER± = front FPGA data_out1/2 through the DS34LV87T RS-422 driver: the PWM meter stream for the MLC6AR.</text>
      <text x="80" y="320" font-size="11" fill="var(--ink2)">The front-panel ↔ main-board cable (H-headers) is not traced here; the request/reply frames are below on the Software tab.</text>`},
  {name:'5 · Main board and SHARC', note:'AMS8-1 pins from the MLC6A v100w.c (PE5 SOURCE_SELECTOR and PORTE 0x8F are MLC6A-only) (ALTERA_* #defines, GAIN_LOCK, DIM_ENABLED, init_SHARC, main) and SHARC FLAG use from ams81_main.asm “shifter”. The FLAG0–3 → front FPGA route through the cable is inferred.', svg:()=>
    chip(100,50,200,'Main ATmega128 (AMS8-1)',[['PC7','ALTERA_FSYNCH'],['PC6','ALTERA_CLOCK'],['PC5','ALTERA_WRITE'],['PC4','DATA_READ'],['PF3','GAIN_LOCK (active low)'],['PE4','DIM_ENABLED (active low)'],['PE5','SOURCE_SELECTOR (no pull-up)']],[['PE6','SHARC reset'],['PE2','Dolby card reset'],['PG0','TDM FSYNCH hold'],['UART0/1','front / remote'],['XTAL','4.9152 MHz']],'v106 · ICC AVR 7.x · bootloader 0x1F800')
    + chip(540,50,200,'ADSP-21065L',[['SPORT0','TDM audio, 10 slots'],['SPORT1','ctl words (20)'],['TIMER0','MCLK for internal ref'],['TIMER1','mux tick 153600']],[['FLAG0','meter DATA'],['FLAG1','meter CLK'],['FLAG2','meter STROBE'],['FLAG3','meter OE (1 = off)']],'mlc8v106 · VisualDSP++')},
];
function viewSchem(m){
  window[KEYFLAG]=false; let i=0;
  m.innerHTML = card('Schematic set (redrawn from source net names — not the P-CAD drawings)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The MLC6A folder has no schematics; the shared P-CAD originals are <span class="mono">MLC8 - #PCB/MLC8-iss4.sch</span> (front panel), <span class="mono">MLC8 - #led/MLC8-led.sch</span> and the AMS8-1 set. These sheets are a readable guide rebuilt from pin names in the firmware, the FPGA project and the BOM; blue labels are nets.</p>`);
  const draw=()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 900 440" style="width:100%;min-width:680px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="888" height="428" fill="none" stroke="var(--line)"/><text x="884" y="428" text-anchor="end" font-size="10" fill="var(--ink2)">MLC6A · sheet ${i+1}/${SHEETS.length} · redrawn ${SIM.year(2026)}</text>${SHEETS[i].svg()}</svg>`;
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
      <tr><td>PRESET 1+2 + MASTER</td><td class="mono small">source_press → TRANSLATE_ENCODER9 → source_mode</td><td class="small">Both PRESET LEDs on; no 5.1/ST button to choose with; times out. The main board ignores S (//source_select = rx_buffer[44])</td></tr>
      <tr><td>(5.1 / ST)</td><td class="mono small">TRANSLATE_PUSHBUTTONS MODE1_PB / MODE4_PB</td><td class="small">Not fitted: mode_select stays MODE1 unless a preset or the main board's EEPROM says otherwise</td></tr>
      <tr><td>Main-board PE5</td><td class="mono small">SETTINGS_CHECK → source_select (working/ only)</td><td class="small">REG20 routing: 75 Ω BNC or 110 Ω Phoenix</td></tr>
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
    `<p class="small muted">Channel letters A B C D E <b>G</b> H I — F is skipped because F,F means mute. Tens and ones are binary (gain/10 = 0…25, gain%10), not ASCII digits as the protocol document implies. Mode = 1 (5.1) — the MLC6A has no way to send 4; source = 1 (75 Ω) or 2 (110 Ω), but the MLC6A main board ignores it; preset is ASCII '0'…'2'. The H and I fields carry gain7/gain8 (120 at start-up) for the two channels without knobs.</p>`;
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
  const g120=fmtDb(db(vt(120)*OFS)), g61=fmtDb(db(vt(61)*OFS));
  m.innerHTML = card('What the MLC6A firmware is up to — findings from the source', `
  <h3>What makes it an MLC6A</h3>
  <ol>
    <li><b>The six-channel firmware is the eight-channel firmware with two numbers changed.</b> Hashing the 211 files in the MLC6A folder against the MLC8 tree and the RD folders: 169 are byte-identical copies (<span class="mono">encoder1…9.c</span>, <span class="mono">SIEMENS8.c</span>, <span class="mono">common.c</span>, <span class="mono">V200W.SRC</span>, <span class="mono">v200W.prj</span>, the AMS8-1 <span class="mono">aug 22/</span> and <span class="mono">addressable remote/</span> copies, <span class="mono">mlc6A-SILK.cdr</span> and <span class="mono">MLC6-M1.dwg</span>). The front <span class="mono">v205/v200w.c</span> differs from MLC8A <span class="mono">atmel/v205/v200w.c</span> in exactly two lines: <span class="mono">unsigned char gain7 = 120, gain8 = 120;</span> and <span class="mono">pgain7 = 120, pgain8 = 120</span> (MLC8A: 61). Everything else — nine encoders, four buttons, eight channels in the protocol, ST mode — is still there. Only <span class="mono">v200W.mak</span> changes path (<span class="mono">H:\\mlc\\MLC6A\\Software\\atmel\\working\\</span>).</li>
    <li><b>The two channels without knobs pass at about unity.</b> Starting gain7/gain8 at 120 instead of 61 puts AES IN 4 on outputs 7/8 at ${g120} × MASTER instead of ${g61}. Nothing on the panel can change them; only a preset recall, the main board's EEPROM (<span class="mono">RECALL_LAST_SETTINGS</span> reads addresses 7/8) or the remote can. The main-board <span class="mono">v100w.c</span> makes the same change (<span class="mono">gain7 = 120; gain8 = 120;</span>), which matters because the first request after boot is a full <span class="mono">#A</span> frame (<span class="mono">first_uart0_tx</span>): the front panel's 120 is overwritten by the main board's value straight away. The front's <span class="mono">gain7_tens/ones</span> still start at <span class="mono">GAIN_TENS_START 6 / GAIN_ONES_START 1</span> (“61”), harmless only because the main board speaks first.</li>
    <li><b>Termination select is a dead end.</b> Holding PRESET 1 + 2 and pressing MASTER still sets <span class="mono">source_mode</span> (both PRESET lamps light), but the choice is made with the 5.1 / ST buttons (<span class="mono">MODE1_PB / MODE4_PB</span>), which the MLC6A panel does not have. It times out after <span class="mono">NO_ACTIVITY_THRESHOLD</span>. Even if an S field were sent, the MLC6A main board ignores it: <span class="mono">//source_select = rx_buffer[44];</span> and <span class="mono">//source_select = rx_buffer1[44];</span> in <span class="mono">UART0_translate/UART1_translate</span>.</li>
    <li><b>The released main boards cannot use the 110 Ω inputs.</b> The MLC6A <span class="mono">v100w.c</span> defines <span class="mono">SOURCE_SELECTOR PINE &amp; BIT5</span> (where the MLC8A has <span class="mono">//#define GAIN_LOCK PINE &amp; BIT5</span>), but in V105 and V106 <span class="mono">SETTINGS_CHECK()</span> ends with <span class="mono">// if ((SOURCE_SELECTOR) == 0) source_select = AES75; //else …</span> — AES75 on every pass. Only the unreleased <span class="mono">working/</span> copy reads the pin. The rear drawing still labels “4 x 110 Ohm AES INPUTS”.</li>
    <li><b>…and the selector pin has no pull-up.</b> <span class="mono">port_init()</span>: <span class="mono">PORTE = 0x8F</span> on the MLC6A against <span class="mono">0xAF</span> on the MLC8A — bit 5 cleared — with <span class="mono">DDRE = 0x47</span> (PE5 an input). With <span class="mono">working/</span>, an unstrapped PE5 floats; it needs a resistor or jumper on the board that is not documented ${inf}.</li>
    <li><b>Two of nine ring slots light nothing.</b> <span class="mono">ALTERA_write</span> still cycles <span class="mono">update</span> 1…9, so the six channel rings and MASTER each get 1/9 of the time, not 1/7; slots 7 and 8 drive LED positions behind blank panel (the drill marks for knobs 7/8 are absent from <span class="mono">mlc6A-SILK.cdr</span>) ${inf}. Shown dashed on “One second”.</li>
    <li><b>Mode is stuck on 5.1 — unless something else sets it.</b> With no ST button, <span class="mono">mode_select</span> only changes by <span class="mono">RECALL_PRESETn</span> (EEPROM 19/49), the main board's <span class="mono">RECALL_LAST_SETTINGS</span> (EEPROM 19) or the remote. If MODE4 ever got in (an EEPROM image or preset written on an MLC8A), outputs 3–6 would go silent with no front-panel way back except recalling another preset ${inf}.</li>
  </ol>
  <h3>The builds in the folder</h3>
  <ol start="8">
    <li><b>V204 → V205 (PFV 2.0.0.0 → 2.0.0.1, “FIXED COMMUNICATION ISSUE”, 2007-12-21).</b> Diff of <span class="mono">Released/v204.zip</span> and <span class="mono">v205.zip</span>: every <span class="mono">gainN_take = 2</span> / <span class="mono">volume_take = 2</span> became <span class="mono">YES</span> (a change now goes out in one reply, not two); <span class="mono">uart0_rx_isr()</span> gained “// ADDED data_available0 = NO; uart_tx_data0 = 0;” (a new request aborts a reply in progress); <span class="mono">new_data1 = YES</span> in the idle refresh was commented out. <span class="mono">v205/</span> and <span class="mono">working/</span> are identical. Switch builds in the Signals card and watch the reply lane.</li>
    <li><b>V105 → V106 main board.</b> <span class="mono">UART1_translate</span> no longer blocks the front panel when the remote reports a change (“REMOTE PANEL HAS NEW INFORMATION, BLOCK FRONT PANEL” → <span class="mono">receive_data0/data_available0/timeout0</span> lines commented out), and <span class="mono">UART0/1_com_check</span> re-arm all <span class="mono">new_gainN_data</span> flags when a panel has nothing new. <span class="mono">working/</span> = V106 plus the PE5 read.</li>
    <li><b>The listing and the code disagree on names.</b> The listing gives the MLC6A front as “V205 / MLC8AV200”, the remote MLC6AR as “MLC6AV205” with the note “If the MAIN UNIT is the MLC6A, use the MLC6A FRONT PANEL software”. The source still says <span class="mono">//MLC8 V2.04 Front Board Revision, January 31, 2007</span> (zip dated 2007-12-21) and <span class="mono">//MLC8 Main Board using the AMS8-1 PCB, August 21, 2006</span>; <span class="mono">REVISION1…4</span> = '2','0','1','0' and is never used. The unreleased PFV 2.0.0.2 (“FIXED PHASE ISSUE WITH AES OUTPUTS AND LED DISPLAY FREEZE”, SHARC MLC8Av106, Altera AMS8V203) is not in this folder.</li>
    <li><b>The EEPROM images in the zips are old test dumps.</b> <span class="mono">v205/eeprom1.HEX</span> (dated 2006-11-07, a year before the MLC6A) holds preset 1 = gains 108 107 107 105 105 105 109 107, volume 109, key 0xAA — and a half-written preset 2: gains 255 205 255 242 255 255 255 107, volume 255, key 0xAA at 60. Programmed as-is, tapping PRESET 2 would put every channel and the master near the top of the range. <span class="mono">AMS8-1 v106/eeprom1.hex</span> (2006-12-20) has last settings gain 61/108 alternating with channels 2, 4, 6, 8 muted (monitor bytes 1,0,1,0…) and source 2 (AES110), which V106 overrides anyway. Whether production used these images is not recorded ${inf}.</li>
  </ol>
  <h3>Artwork and files</h3>
  <ol start="12">
    <li><b>The rear photo is not the drawn rear.</b> <span class="mono">Pics/MLC6A Rear.jpg</span> (byte-identical to <span class="mono">AMS81 - #Master/…/Obsolete/MLC6A(AMS8-M2) Rear.jpg</span>) shows an AMS8-M2 rear with blank SDI IN/OUT, AES1/AES2 and DOLBY E METADATA holes. <span class="mono">MLC6A (Front &amp; Rearview).cdr</span> draws the clean MLC8-M6 rear (same as the MLC8A), which is what the simulator uses.</li>
    <li><b>The silk conversion lost its text layout.</b> libcdr kept the logo and bracket paths and the label baselines, but not the alignment: “MLC-6A” and “MULTICHANNEL LEVEL CONTROL” land on top of each other, as do the WBS logo and “WARD-BECK SYSTEMS”. Labels were re-anchored on the photo. The panel spacing matches the MLC8A exactly (knobs 1.000" apart, MASTER 8.5" from L), so the meter lens and button positions were carried over.</li>
    <li><b>Duplicates.</b> <span class="mono">MLC8 #Engineering #TIM/MLC6A/</span> holds the same <span class="mono">mlc6A-SILK.cdr</span>, <span class="mono">MLC6-M1.dwg</span> and <span class="mono">.bak</span>, plus a different <span class="mono">Backup_of_mlc6A-SILK.cdr</span>; <span class="mono">MLC6 &amp; MLC8 - #Mechanical #DA #2016/MLC6-M1 ISS 1 (FRONT PANEL).dwg</span> is the 2016|49 redraw. <span class="mono">analog.c</span>, <span class="mono">control.c</span> and <span class="mono">mode5.c</span> are AMS8/AMS16 leftovers listed in the project but not called.</li>
  </ol>
  <h3>Inherited from the MLC8A (same code, details in the MLC8 plugin)</h3>
  <ul>
    <li><b>One knob at a time</b> (<span class="mono">knob_activity</span>), the <b>mute counter that can wrap to 255</b> after a remote or preset mute, 2 detents to un-mute (3 on MASTER).</li>
    <li><b>Lock</b> (<span class="mono">GAIN_LOCK</span>, PF3) locks the channel knobs only; MASTER and presets still work.</li>
    <li><b>Ring range</b>: every value from 200 to 255 shows a full ring (${fmtDb(full)} … ${fmtDb(top)}); values 1–15 show only LED 1.</li>
    <li><b>Presets</b>: an empty preset still lights its button; the store “flicker” is a ≈170 ms EEPROM stall ${inf}; the source is not stored.</li>
    <li><b>Protocol</b>: tens/ones are binary, channel 6 is letter G (F,F = mute), idle refresh every 20 polls; the main-board bootloader at 0x1F800 is linked but unreachable; 200 misaligned FPGA exchanges reboot the main board through the watchdog.</li>
  </ul>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>Front-panel pass 0.833 ms ${inf}: the MLC8A manual's “approximately five seconds” ÷ <span class="mono">PRESET_DEBOUNCE</span> 6000. Main-board loop 5 ms ${inf}; poll cycle ≈ ${(C.POLL*1000).toFixed(1)} ms.</li>
    <li>SHARC core 61.44 MHz ${inf} (TPERIOD1 = 2.5 ms); SHARC code is MLC8Av105 per the listing, modelled with the MLC8A mlc8v106 source (not in this folder) ${inf}. One detent = 4 quadrature steps ${inf}.</li>
    <li>Front PCB = MLC8 front board with encoders 7/8 and the 5.1/ST buttons not fitted ${inf} (same spacing, unchanged code, blank panel).</li>
    <li>PE5 “open” reads high (AES110) in the working/ build ${inf}; PE5 has no internal pull-up in this firmware.</li>
    <li>Meter index 0.5 dB per step with −20 dBFS on “0” ${inf}; programme material is synthetic; LED colours from the MLC8 BOM and the MLC6A photo.</li>
    <li>Changes take effect in the state immediately; the timeline shows when each one would reach the main board, the FPGA and the SHARC.</li></ul>`)
  + card('Sources', `<ul class="small mono">
    <li>#MLC - #SERIES/XXX - MLC6A - #OBSOLETE #Archive/MLC6A - #Software/MLC6A - #Software #atmel/v205/v200w.c, working/, Released/v204.zip, v205.zip (eeprom1.HEX), v200W.mak</li>
    <li>…/MLC6A - #Software #AMS8-1/atmel/v106/v100w.c, working/v100w.c, Released/v105.zip, v106.zip (eeprom1.hex)</li>
    <li>…/mlc6A-SILK.cdr, MLC6A (Front &amp; Rearview).cdr · MLC6 &amp; MLC8 - #ARTWORK #DA #2016/Pics/MLC6A Front.jpg, MLC6A Rear.jpg</li>
    <li>SOFTWARE LISTINGS - #Engineering.xls (MLC6A REVISIONS, MLC6R FRONT PANEL REVISIONS) · #MLC - #SERIES/MLC8 - Front_Change #RD #RD73/software listing.xls</li>
    <li>Compared against: MLC8 - #Engineering/MLC8 - #Software/MLC8A - #Software/atmel/v205/, AMS8-1/atmel/v106/ (and the MLC8A FPGA, SHARC, BOM, manual and protocol document used by mlc8.js)</li></ul>`);
}

/* ---------------- register plugin ---------------- */
SIM.register({
  id:'mlc6a', name:'MLC6A · Multi-Channel Level Control, 6 channel (2007|40)', duration:1,
  product:'MLC6A', year:2007, family:'Obsolete products', folder:'#MLC - #SERIES/XXX - MLC6A - #OBSOLETE #Archive',
  summary:'1RU 5.1 meter and monitor level control: six channel encoders (L R C LFE LS RS) and a master with 25-LED rings, eight 22-LED bargraphs and two presets. Its firmware (front V205, main board V106) is the MLC8A code with the two hidden channels started at 120 and the input termination taken away from the panel.',
  highlights:['Panel rebuilt from mlc6A-SILK.cdr (converted, labels re-anchored on the photo)','Hash + diff against the MLC8A tree: two changed lines in the front code','Termination select that leads nowhere; 110 Ω inputs locked out in the released main board','Switchable builds V204/V205 and V105/V106/working with the real differences','Every knob turn traced to the #…$ bytes, the FPGA and the SHARC; ring slots 7/8 scanned for nothing'],
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
    {id:'tutorial', label:'Tutorial: using the MLC6A', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewAnatomy},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
