/* =====================================================================
   POD33 — AES DARS / word-clock generator (Ward-Beck Systems, 2007|40)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive):
   - #POD #SERIES/POD33 - #Master/POD33 - #Engineering/Software/Atmel/v102/pod33v102.c
       main loop, REFRESH_LEDS, CHIRP, TRANSLATE_ENCODER1/2, ENCODER1/2_UPDATE,
       ALTERA_SORT (40-byte register block), constants
   - .../Atmel/v102/LMH1981.c, altera.c/.h, cs84xx.h, SIEMENS83.h  (pins, video detect)
   - .../Altera/v101/POD33.qsf  (FPGA pin numbers and net names)
   - .../Sharc/v101/backgnd.c, sample.c  ("SYNC" header, ToneGen, sample IRQ)
   - .../POD33MAN_ROUGH 27Sep07.pdf  (operator manual draft, specs)
   - .../Photos/POD33 Front.jpg, POD33 Rear.jpg  (panel layout)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;

/* ---------------- constants from the source ---------------- */
const C = {
  LOOP_T: 1/600,            // main-loop pass time — INFERRED (see notes): 3000 passes ≈ the manual's 5 s
  WDT: 0.014,               // WDTCR = 0x08 → WDE=1, WDP=000 → 16K WDT cycles ≈ 14 ms @ 5 V (ATmega128 datasheet)
  CHIRP_PASSES: 201,        // NO_LOCK_CHIRP_CONSTANT 200 → toggles every 201 passes
  LOCK_COUNTER: 25,
  RESET_COUNTER: 25,
  NO_VIDEO: 1500,           // NO_VIDEO_CONSTANT in LMH1981.h
  EEPROM_PASSES: 50000,     // EEPROM_TIMER_CONSTANT
  NO_ACTIVITY: 50000,       // NO_ACTIVITY_THRESHOLD (v102; was 3000 then 6000)
  BOOT_T: 0.25,             // boot to first display — INFERRED
};
const REF_NAMES = ['Video','AES','Int 48k','Int 96k'];
const LOCK_NAMES = {0:'VIDEO_REF',1:'AES_REF',2:'INTERNAL_REF'};
const FREQ_HZ = [100,400,1000];
const FREQ_TXT = ['100Hz','400Hz','1kHz'];
const FREQ_SHORT = ['100','400','1k'];
const CH_NAMES = ['STEREO','LEFT_ONLY','RIGHT_ONLY'];
const VFMT = {
  NTSC:  {name:'NTSC 480i 59.94', field:1001/60000, lines:525, H:1001/60000/262.5, code:260, cadence:'5 frames = 8008 samples @ 48k'},
  PAL:   {name:'PAL 576i 50',     field:1/50,       lines:625, H:64e-6,             code:310, cadence:'1 frame = 1920 samples @ 48k'},
  '720p':{name:'720p 59.94',      field:1001/60000, lines:750, H:1001/60000/750,    code:747, cadence:'5 frames = 4004 samples @ 48k'},
  '1080i':{name:'1080i 59.94',    field:1001/60000, lines:1125,H:1001/60000/562.5,  code:560, cadence:'5 frames = 8008 samples @ 48k'},
};
function ampDb(i){ if(i>=34) return null; if(i<=30) return -i; return [-40,-50,-60][i-31]; }
function ampTxt(i){ const d=ampDb(i); return d===null?'OFF':(d===0?'0':String(d)); }

/* ---------------- device state ---------------- */
const D = {
  power: true,
  in: { video:true, vfmt:'NTSC', aes:false, aesRate:48000 },
  reference: 0,                      // setting: 0 Video, 1 AES, 2 Int48, 3 Int96 (reference_min..max)
  aes: [                              // DATA_initialization() defaults
    {la:20, lf:2, ra:10, rf:2, ch:0, out:0},
    {la:22, lf:1, ra:12, rf:1, ch:0, out:0},
    {la:24, lf:2, ra:14, rf:2, ch:0, out:0},
    {la:26, lf:1, ra:16, rf:1, ch:0, out:0},
  ],
  disp: 0,                           // aesN_display: 0 AMPLITUDE / 1 FREQUENCY (the code sets all four together)
  mode: 0,                           // 0 INFORMATION_MODE, 1 SETUP_MODE
  info: 0,                           // information_display AES1..AES4 = 0..3
  setup: 4,                          // setup_display 4 REFERENCE … 8 AES4_OUT, 9 EXIT
  hold: {disp:0, ch:0},              // aes_display_hold / channel_select_hold
  pending: null,                     // a single press waiting to see if it becomes "both"
  faultAt: null,                     // sim time of injected FPGA alignment failure
  log: [],
  lastTrace: [],
  bootAt: null,                      // wall-clock time of power-on (for boot screen)
};

/* ---------------- derived: reference lock (REFRESH_LEDS) ---------------- */
function lockState(){
  const v = D.in.video, a = D.in.aes;
  let locked;
  switch (D.reference){
    case 0: locked = v ? 0 : a ? 1 : 2; break;          // case VIDEO_REF
    case 1: locked = a ? 1 : v ? 0 : 2; break;          // case AES_REF
    default: locked = 2;                                // default: internal
  }
  let fs = 48000;
  if (locked === 0) fs = 48000;                         // SINGLE_DATA_RATE
  else if (locked === 1) fs = D.in.aesRate;
  else fs = (D.reference === 3) ? 96000 : 48000;        // PROCESS_INTERNAL_SAMPLE_RATE_INFORMATION
  return { locked, fs, missing: (D.reference===0 && locked!==0) || (D.reference===1 && locked!==1) };
}

/* ---------------- main-loop schedule over the simulated second ---------------- */
const STEPS = [
  ['WDR · CS8416_READ_LOCK_ALL · ISOLATE_INPUT_STATUS', .10, 'Read AES-reference lock from the CS8416 receiver'],
  ['CS8416_STATUS_CHECK',                               .04, 'Count lock / no-lock, reset the CS8416 after re-lock'],
  ['LMH1981_VIDEO_DETECT',                              .06, 'Look for vertical sync; if inside it, count H lines to identify the format'],
  ['SWITCH_ENCODER1 · TRANSLATE_ENCODER1 · SHAFT_ENCODER1 · ENCODER1_UPDATE', .07, 'SELECT knob: press and rotation'],
  ['SWITCH_ENCODER2 · TRANSLATE_ENCODER2 · SHAFT_ENCODER2 · ENCODER2_UPDATE', .07, 'ADJUST knob: press and rotation'],
  ['ALTERA_TRANSLATE · ALTERA_SORT',                    .05, 'Read back FPGA status, pack the 40-byte register block'],
  ['PORTD|=BIT0 · ALTERA_read_write (40 bytes) · PORTD&=~BIT0', .40, 'Bit-bang 320 bits out and in on ALTERA1..8; PD0 high = scope marker'],
  ['ALIGNMENT_CHECK · while(error0==0) NOP()',          .02, 'If the FPGA did not echo "SYNC", spin with no WDR — watchdog reboots the MCU'],
  ['ACTIVITY_MONITOR · EEPROM_TIMER',                   .03, 'Idle timeout back to A/B; save to EEPROM once the knobs go quiet'],
  ['UPDATE_DISPLAY',                                    .12, 'Write the two 8-character Siemens/Osram displays if refresh = YES'],
  ['CHIRP · REFRESH_LEDS',                              .04, 'Toggle the flash phase; light AES / VIDEO / INTERNAL'],
];
const STEP_FRAC = (()=>{ let a=0; return STEPS.map(s=>{ const r=a; a+=s[1]; return r; }); })();
let SCHED = null, SCHED_KEY = '';
function schedule(){
  const key = [D.in.video, D.in.vfmt, D.faultAt, D.power].join('|');
  if (key === SCHED_KEY) return SCHED;
  SCHED_KEY = key;
  const passes = []; const vf = VFMT[D.in.vfmt];
  let t = 0, idx = 0; const end = 1.0001;
  const vsLen = 3*vf.H;                 // VSOUT low ≈ 3 lines (vertical sync) — INFERRED duration
  let boot = null;
  while (t < end){
    const p = { i: idx, t0: t, kind: 'loop', stall: 0 };
    let T = C.LOOP_T;
    // video detect stall: if the LMH1981 step lands inside VSOUT low, wait it out then count 11 H lines
    if (D.in.video){
      const ts = t + STEP_FRAC[2]*C.LOOP_T;
      const ph = ts % vf.field;
      if (ph < vsLen){ p.stall = (vsLen - ph) + 11*vf.H; T += p.stall; p.vsync = true; }
    }
    // fault: the pass during which the FPGA loses alignment
    if (D.faultAt !== null && t <= D.faultAt && D.faultAt < t + T && !boot){
      const tc = t + STEP_FRAC[7]*C.LOOP_T + p.stall;
      p.kind = 'fault'; p.spinFrom = tc; T = (tc - t) + C.WDT; p.t1 = t + T;
      passes.push(p);
      boot = { t0: p.t1, t1: p.t1 + C.BOOT_T };
      passes.push({ i: -1, t0: boot.t0, t1: boot.t1, kind: 'boot' });
      t = boot.t1; idx = 0; continue;
    }
    p.t1 = t + T; passes.push(p); t += T; idx++;
  }
  SCHED = { passes, boot };
  return SCHED;
}
function passAt(t){
  const ps = schedule().passes; let lo=0, hi=ps.length-1;
  while (lo<hi){ const m=(lo+hi+1)>>1; if (ps[m].t0<=t) lo=m; else hi=m-1; }
  return ps[lo];
}
function stepAt(t){
  const p = passAt(t); if (p.kind==='boot') return {pass:p, step:-1};
  if (p.kind==='fault' && t >= p.spinFrom) return {pass:p, step:7, spinning:true};
  let rel = t - p.t0;
  const s2 = STEP_FRAC[2]*C.LOOP_T, s3 = STEP_FRAC[3]*C.LOOP_T;
  if (p.stall && rel >= s2){ if (rel < s3 + p.stall) return {pass:p, step:2, stalled:true}; rel -= p.stall; }
  const f = rel / C.LOOP_T;
  let k = 0; for (let j=0;j<STEPS.length;j++) if (f >= STEP_FRAC[j]) k=j;
  return {pass:p, step:k};
}
function chirpOn(t){ const p = passAt(t); if (p.kind!=='loop' && p.kind!=='fault') return false; return Math.floor(Math.max(0,p.i)/C.CHIRP_PASSES)%2===1; }
function inBoot(t){ const s=schedule(); return s.boot && t>=s.boot.t0 && t<s.boot.t1; }
function inSpin(t){ const p=passAt(t); return p.kind==='fault' && t>=p.spinFrom; }

/* LEDs at time t (REFRESH_LEDS + CHIRP) */
function ledsAt(t){
  if (!D.power) return {aes:0,video:0,int:0,pwr:0};
  if (inBoot(t)) return {aes:0,video:0,int:0,pwr:1};           // DATA_initialization turns all three off
  const L = lockState(); const ch = chirpOn(t);
  const o = { aes: L.locked===1?1:0, video: L.locked===0?1:0, int: L.locked===2?1:0, pwr:1 };
  if (D.reference===1 && L.locked!==1) o.aes = ch?1:0;          // flashing = selected reference missing
  if (D.reference===0 && L.locked!==0) o.video = ch?1:0;
  return o;
}

/* ---------------- display strings (8 + 8 characters) ---------------- */
function displayLines(t){
  if (!D.power) return ['        ','        '];
  if (t!==undefined && inBoot(t)) return ['  POD33 ','  V102  '];
  if (D.mode===1){
    const s=D.setup;
    if (s===4) return ['  Ref   ', pad8(REF_NAMES[D.reference])];
    if (s>=5 && s<=8){ const k=s-5; return [pad8('  AES'+(k+1)), D.aes[k].out? ' Wrd Clk':'  AES   ']; }
    return [' Setup  ','  Exit  '];
  }
  const k=D.info, a=D.aes[k], n=k+1;
  if (a.out===1) return ['  AES'+n+'  ',' Wrd Clk'];
  const l1 = a.ch===0 ? 'AES'+n+' A/B' : a.ch===1 ? 'AES'+n+' A  ' : 'AES'+n+' B  ';
  let l2;
  if (D.disp===0){
    if (a.ch===0) l2 = ampTxt(a.la)+'/'+ampTxt(a.ra);
    else l2 = ampTxt(a.ch===1?a.la:a.ra) + 'dBFS';
  } else {
    if (a.ch===0) l2 = FREQ_SHORT[a.lf]+'/'+FREQ_SHORT[a.rf];
    else l2 = FREQ_TXT[a.ch===1?a.lf:a.rf];
  }
  return [pad8(l1), pad8(l2, true)];
}
function pad8(s, right){ s=String(s).slice(0,8); while(s.length<8) s = right? ' '+s : s+' '; return s; }

/* ---------------- the 40-byte register block (ALTERA_SORT) ---------------- */
function regBlock(){
  const b = new Array(40).fill(0);
  b[0]=0x53; b[1]=0x59; b[2]=0x4E; b[3]=0x43;                     // "SYNC" = ALIGNED_DATA0..3
  for (let k=0;k<4;k++) b[4+k] = D.aes[k].ch;                       // REG 2 output selectors
  for (let k=0;k<4;k++){ const a=D.aes[k]; b[8+4*k]=a.la; b[9+4*k]=a.lf; b[10+4*k]=a.ra; b[11+4*k]=a.rf; }
  b[27] = [0,1,2,3][(D.reference===3)?3:2];                         // REG 7 sample_rate (SR_48=2, SR_96=3)
  const L = lockState();
  b[39] = (D.aes[3].out<<6)|(D.aes[2].out<<5)|(D.aes[1].out<<4)|(D.aes[0].out<<3)|(0<<2)|L.locked; // REG 10
  return b;
}

/* ---------------- audio / clocks at time t ---------------- */
function outputSample(k, side, t){
  const a = D.aes[k], L = lockState();
  if (a.out===1) return ((t*L.fs)%1) < 0.5 ? 1 : -1;               // word clock square at fs
  const db = ampDb(side? a.ra : a.la); if (db===null) return 0;
  const f = FREQ_HZ[side? a.rf : a.lf];
  const n = Math.floor(t*L.fs);                                   // sample-and-hold at fs
  return Math.pow(10, db/20) * Math.sin(2*Math.PI*f*n/L.fs);
}

/* ---------------- user actions (what the buttons do in code) ---------------- */
function act(name, fn){
  D.lastTrace = [];
  const tr = s => D.lastTrace.push(s);
  if (!D.power){ tr('Unit is off — nothing happens.'); }
  else fn(tr);
  D.log.unshift({ t: SIM.t, wall: new Date(), name, trace: D.lastTrace.slice(), disp: displayLines() });
  if (D.log.length>60) D.log.length=60;
  D.lastWall = performance.now();
  SIM.refresh();
}
const A = {
  pressSelect(){ act('Press SELECT (left knob)', tr=>{
    tr('SWITCH_ENCODER1 sees the push switch low → TRANSLATE_ENCODER1(encoder1_data==0)');
    tr('switch1 = YES; refresh = refresh_eeprom = refresh_data = YES; activity_counter = 0; switch_setup1 = YES');
    if (D.mode===0){
      const a = D.aes[D.info];
      if (a.out===1){ tr(`AES${D.info+1} is a word clock → channel select is skipped`); return; }
      D.hold.ch = (D.info===0)? a.ch : D.aes[0].ch;   // v102 saves AES1's value for AES2–4 (see Findings)
      const old = a.ch; a.ch = (a.ch===2)?0:a.ch+1;
      tr(`information_display = AES${D.info+1}_SCREEN → channel_select ${CH_NAMES[old]} → ${CH_NAMES[a.ch]}`);
      tr(`Display line 1 becomes “${displayLines()[0]}”`);
    } else if (D.setup===9){
      D.mode=0; D.setup=4; tr('SETUP_MODE on EXIT_SCREEN → mode = INFORMATION_MODE, setup_display = REFERENCE_SCREEN');
    } else tr(`SETUP_MODE on screen ${D.setup}: in v102 the SELECT press only exits from the EXIT screen (turn SELECT to reach it)`);
  });},
  pressAdjust(){ act('Press ADJUST (right knob)', tr=>{
    tr('SWITCH_ENCODER2 sees the push switch low → TRANSLATE_ENCODER2(encoder2_data==0)');
    tr('switch2 = YES; refresh flags set; activity_counter = 0; switch_setup2 = YES');
    if (D.mode===0){
      const a = D.aes[D.info];
      if (a.out===1){ tr('Word-clock output: nothing to toggle'); return; }
      D.hold.disp = D.disp; D.disp = D.disp? 0:1;
      tr(`aes_display_hold = ${D.hold.disp?'FREQUENCY':'AMPLITUDE'}; all four aesN_display = ${D.disp?'FREQUENCY':'AMPLITUDE'}`);
      tr(`Display line 2 becomes “${displayLines()[1].trim()}”`);
    } else tr('In SETUP_MODE the ADJUST press has no action (rotate ADJUST to change the value)');
  });},
  pressBoth(){ act('Press SELECT + ADJUST together', tr=>{
    tr('The first switch sets switch_setup1/2 = YES; when the second switch is seen with the other flag still set:');
    tr('mode = SETUP_MODE; activity_counter = 0');
    tr('The first press is undone: aesN_display = aes_display_hold, channel_select = channel_select_hold');
    D.mode=1; D.setup=4;
    tr('setup_display = REFERENCE_SCREEN → display “  Ref   ” / “'+pad8(REF_NAMES[D.reference])+'”');
  });},
  turnSelect(dir){ act(`Turn SELECT ${dir>0?'clockwise':'counter-clockwise'}`, tr=>{
    tr('SHAFT_ENCODER1 decodes the quadrature step → encoder_action1 = '+(dir>0?'UP':'DOWN'));
    tr('ENCODER1_UPDATE: refresh flags set; activity_counter = 0');
    if (D.mode===0){
      D.aes.forEach(a=>a.ch=0);
      tr('INFORMATION_MODE: every aesN.channel_select = STEREO (turning SELECT always returns to A/B)');
      const o=D.info; D.info=(D.info+(dir>0?1:3))%4;
      tr(`information_display AES${o+1}_SCREEN → AES${D.info+1}_SCREEN (wraps 1↔4)`);
    } else {
      const o=D.setup; D.setup = dir>0 ? (D.setup===9?4:D.setup+1) : (D.setup===4?9:D.setup-1);
      const nm = s=> s===4?'REFERENCE':s===9?'EXIT':'AES'+(s-4)+'_OUT';
      tr(`SETUP_MODE: setup_display ${nm(o)}_SCREEN → ${nm(D.setup)}_SCREEN (setup_min..setup_max wraps)`);
    }
    tr(`Display: “${displayLines().join('” / “')}”`);
  });},
  turnAdjust(dir){ act(`Turn ADJUST ${dir>0?'clockwise':'counter-clockwise'}`, tr=>{
    tr('SHAFT_ENCODER2 decodes the step → encoder_action2 = '+(dir>0?'UP':'DOWN'));
    tr('ENCODER2_UPDATE: refresh, refresh_eeprom, refresh_data = YES; activity_counter = 0');
    if (D.mode===1){
      if (D.setup===4){ const o=D.reference; D.reference = dir>0? (D.reference===3?0:D.reference+1) : (D.reference===0?3:D.reference-1);
        tr(`REFERENCE_SCREEN: reference ${REF_NAMES[o]} → ${REF_NAMES[D.reference]} (VIDEO_REF … INTERNAL_96, wraps)`);
        const L=lockState(); tr(`REFRESH_LEDS on the next pass: reference_locked = ${LOCK_NAMES[L.locked]}, fs = ${L.fs/1000} kHz`); }
      else if (D.setup>=5 && D.setup<=8){ const a=D.aes[D.setup-5]; a.out = a.out?0:1;
        tr(`AES${D.setup-4}_OUT_SCREEN: output_select → ${a.out?'WORD_CLOCK':'AES_OUTPUT'}`);
        tr(`ALTERA_SORT packs it into REG 10 byte 39 bit ${D.setup-2}; the FPGA switches that BNC/Phoenix pair`); }
      else tr('EXIT_SCREEN: rotation does nothing');
      return;
    }
    const a = D.aes[D.info];
    if (a.out===1){ tr('Word-clock output: ADJUST does nothing'); return; }
    if (a.ch===0){ tr(`channel_select = STEREO: in v102 the STEREO branch of ENCODER2_UPDATE is commented out /* … */ → no change`);
      tr('The 2007 manual says A/B adjusts both channels; the shipped v102 code does not (see Findings)'); return; }
    const side = a.ch===2;
    if (D.disp===0){
      const key = side?'ra':'la', o=a[key];
      if (dir>0){ a[key] = Math.max(0, a[key]-1); } else { a[key] = Math.min(34, a[key]+1); }
      tr(`${side?'right':'left'}_amplitude index ${o} → ${a[key]} (UP = louder: index−1, stops at aes_amplitude_min = 0 dBFS; DOWN stops at AMPLITUDE_OFF = 34)`);
      tr(`= ${ampTxt(o)} → ${ampTxt(a[key])} dBFS. ALTERA_SORT puts it in byte ${8+4*D.info+(side?2:0)}; the SHARC calls ToneGenEdit(TONEGEN_LEVEL)`);
    } else {
      const key = side?'rf':'lf', o=a[key];
      a[key] = dir>0 ? Math.min(2,a[key]+1) : Math.max(0,a[key]-1);
      tr(`${side?'right':'left'}_frequency ${FREQ_TXT[o]} → ${FREQ_TXT[a[key]]} (FREQ_100 … FREQ_1k, no wrap)`);
      tr(`ALTERA_SORT byte ${9+4*D.info+(side?2:0)}; the SHARC calls ToneGenEdit(TONEGEN_FREQ)`);
    }
  });},
  plugVideo(on){ act(on?'Connect VIDEO REF':'Disconnect VIDEO REF', tr=>{
    D.in.video=on; tr(`LMH1981 ${on?'starts producing H/V sync on HSOUT/VSOUT':'stops producing sync'}`);
    tr(on? `LMH1981_VIDEO_DETECT counts the field signature → ${VFMT[D.in.vfmt].code} = ${VFMT[D.in.vfmt].name}` : `video_detect_counter climbs to NO_VIDEO_CONSTANT (1500 passes) before video_detect = NO`);
    const L=lockState(); tr(`REFRESH_LEDS: reference = ${REF_NAMES[D.reference]}, reference_locked = ${LOCK_NAMES[L.locked]}${L.missing?' → selected LED flashes, fallback LED solid':''}`);
  });},
  plugAes(on){ act(on?'Connect AES REF':'Disconnect AES REF', tr=>{
    D.in.aes=on; tr(`CS8416 ${on?'locks; CS8416_READ_LOCK_ALL returns non-zero (Astatus)':'loses lock; Astatus = 0'}`);
    tr(`CS8416_STATUS_CHECK counts to LOCK_COUNTER (25) before declaring the change`);
    const L=lockState(); tr(`REFRESH_LEDS: reference_locked = ${LOCK_NAMES[L.locked]}${L.missing?' (fallback)':''}`);
  });},
  setVfmt(f){ act('Video format → '+VFMT[f].name, tr=>{ D.in.vfmt=f; tr(`LMH1981_VIDEO_DETECT → video_format ${VFMT[f].code}`); }); },
  power(){ act(D.power?'Power off':'Power on', tr=>{}); D.power=!D.power; if (D.power){ D.mode=0; D.info=0; D.log[0].trace=['main(): port_init, watchdog_init (WDTCR=0x08), ALTERA_RESET, init_CS8416','DATA_initialization() → defaults, then RESTORE_INFORMATION_EEPROM()','Display shows “  POD33 ” / “  V102  ”, then AES1 A/B']; D.bootAt=performance.now(); } SIM.refresh(); },
  fault(){ act('Inject: FPGA loses register alignment', tr=>{
    D.faultAt = SIM.t;
    tr('ALIGNMENT_CHECK() finds the echoed block does not start with “SYNC” → error0 = 0');
    tr('while (error0 == 0) NOP();  — no WDR() inside this loop');
    tr(`The watchdog (WDTCR = 0x08, ≈14 ms) expires → hardware reset → main() runs again (boot ≈ ${C.BOOT_T*1000} ms, inferred)`);
    tr('After the reboot the unit comes back on the normal AES1 A/B screen; settings come back from EEPROM');
    tr('Scrub forward past the playhead to watch it on the timeline');
    D.mode=0; D.info=0; D.setup=4; D.aes.forEach(x=>x.ch=0);
  }); },
  clearFault(){ D.faultAt=null; SCHED_KEY=''; SIM.refresh(); },
  reset(){ Object.assign(D, { reference:0, disp:0, mode:0, info:0, setup:4, faultAt:null, power:true });
    D.in.video=true; D.in.aes=false; D.in.vfmt='NTSC';
    [[20,2,10,2],[22,1,12,1],[24,2,14,2],[26,1,16,1]].forEach((v,k)=>Object.assign(D.aes[k],{la:v[0],lf:v[1],ra:v[2],rf:v[3],ch:0,out:0}));
    D.log=[]; SCHED_KEY=''; SIM.refresh(); },
};

/* ================================================================
   DRAWING: front panel, rear panel
   ================================================================ */
/* Panels are built on the real silkscreen: POD33 - #ARTWORK #DA #2016/POD33-FRONT&REAR-SILK (CURVE).pdf
   (2016|49 drafting set). Artwork 2026|59: the panels now come from the CorelDRAW original, POD33-FRONT&REAR-SILK (CURVE).cdr,
   converted to assets/pod33-front.svg / -rear.svg (+ -rear-ink.svg drawn over the connectors), framed on the same crop
   marks as the earlier 200 dpi PDF cut (1704 × 311 units = the panel face). Controls sit on the artwork's drill crosshairs;
   LED, display and switch positions are measured from Photos/POD33 Front.jpg. */
const ASSET = 'siumulation-plugins/assets/';
function frontSVG(t, opts){
  opts = opts||{};
  const L = ledsAt(t), [l1,l2] = displayLines(t);
  const led = (x,y,on,col)=>`<circle cx="${x}" cy="${y}" r="13" fill="#0a0b0b"/><circle cx="${x}" cy="${y}" r="9.5" fill="${on?col:'var(--led-off)'}" ${on?'filter="url(#glow)"':''}/>`;
  const pitch = 6.6, m2 = 790 + 8*6.2*pitch + 22;
  const dm = SIM.dotMatrix(l1, 798, 76, pitch, 'var(--vfd)', 'rgba(140,200,90,.07)') + SIM.dotMatrix(l2, m2, 76, pitch, 'var(--vfd)', 'rgba(140,200,90,.07)');
  const knob = (x,id)=>`
    <g class="knob" data-k="${id}" style="cursor:pointer">
      <circle cx="${x}" cy="226" r="66" fill="transparent"/>
      <circle cx="${x}" cy="226" r="52" fill="#0d0e0f" stroke="#2c2f31" stroke-width="2"/>
      <circle cx="${x}" cy="226" r="38" fill="#1f7a3a" stroke="#0b3b1c" stroke-width="4"/>
      <circle cx="${x-8}" cy="216" r="14" fill="#33a159" opacity=".55"/>
      <circle cx="${x-80}" cy="214" r="9" fill="#55595c"/><circle cx="${x+80}" cy="214" r="9" fill="#55595c"/>
    </g>`;
  return `<svg viewBox="0 0 1704 311" role="img" aria-label="POD33 front panel (CorelDRAW silk artwork)" style="width:100%;max-width:960px;border-radius:8px;display:block">
    <defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1704" height="311" rx="10" fill="var(--dev)"/>
    <image href="${ASSET}pod33-front.svg" width="1704" height="311"/>
    <g class="pwr" style="cursor:pointer"><rect x="132" y="56" width="98" height="128" rx="10" fill="#0a0b0c" stroke="#30333a"/><rect x="146" y="${D.power?66:118}" width="70" height="56" rx="6" fill="#1d2023" stroke="#3a3d40"/></g>
    <circle cx="306" cy="206" r="10" fill="${L.pwr?'#efffa0':'var(--led-off)'}" ${L.pwr?'filter="url(#glow)"':''}/>
    ${led(676,66,L.aes,'var(--led-g)')}${led(676,156,L.video,'var(--led-g)')}${led(676,246,L.int,'var(--led-a)')}
    <rect x="770" y="52" width="728" height="92" rx="4" fill="#040504" stroke="#26292b" stroke-width="2"/>
    <g filter="url(#glow)">${dm}</g>
    ${knob(958,'sel')}${knob(1328,'adj')}
    <circle cx="70" cy="200" r="7" fill="#4a4d50"/><circle cx="1640" cy="160" r="7" fill="#4a4d50"/>
    ${opts.hot? opts.hot : ''}
  </svg>`;
}
function rearSVG(){
  const bnc = (x,lbl,conn,id)=>`<g ${id?`class="jack" data-j="${id}" style="cursor:pointer"`:''}>
      <circle cx="${x}" cy="210" r="50" fill="#9c8233" stroke="#5e4d1c" stroke-width="3"/><circle cx="${x}" cy="210" r="32" fill="#d8c27a"/><circle cx="${x}" cy="210" r="11" fill="#7a5f12"/>
      ${conn?`<rect x="${x-20}" y="250" width="40" height="61" fill="#2b5f9e"/><rect x="${x-34}" y="232" width="68" height="34" rx="8" fill="#3a74b8"/>`:''}
      ${id?`<rect x="${x-62}" y="150" width="124" height="124" fill="transparent"><title>${conn?'Click to unplug':'Click to plug in'} the ${id==='aes'?'AES':'video'} reference</title></rect><circle cx="${x+44}" cy="170" r="10" fill="${conn?'var(--accent)':'#555'}"/>`:''}</g>`;
  const phx = x=>`<rect x="${x-52}" y="58" width="104" height="52" rx="4" fill="#1f8a45" stroke="#0e4d25" stroke-width="2"/>${[-28,0,28].map(d=>`<circle cx="${x+d}" cy="84" r="9" fill="#0d3a1c"/>`).join('')}`;
  let s = `<svg viewBox="0 0 1704 311" role="img" aria-label="POD33 rear panel (CorelDRAW silk artwork)" style="width:100%;max-width:960px;border-radius:8px;display:block">
    <rect width="1704" height="311" rx="10" fill="var(--dev)"/>
    <image href="${ASSET}pod33-rear.svg" width="1704" height="311"/>`;
  [255,404,553,703].forEach((x,k)=>{ s += phx(x) + bnc(x,'',false) + (D.aes[k].out?`<text x="${x}" y="150" fill="var(--led-a)" font-size="26" text-anchor="middle" font-weight="700">WC</text>`:''); });
  s += phx(853) + bnc(853,'',D.in.aes,'aes') + bnc(1154,'',D.in.video,'video');
  s += `<rect x="1430" y="40" width="160" height="196" rx="14" fill="#0a0b0c" stroke="#30333a" stroke-width="2"/><rect x="1462" y="78" width="96" height="104" rx="8" fill="#141618"/>
    <image href="${ASSET}pod33-rear-ink.svg" width="1704" height="311" style="pointer-events:none"/>
</svg>`;
  return s;
}
function bindPanel(root){
  root.querySelectorAll('.knob').forEach(g=>{
    const k=g.dataset.k;
    g.addEventListener('click', e=>{ const r=g.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width; if (x<0.36) (k==='sel'?A.turnSelect:A.turnAdjust)(-1); else if (x>0.64) (k==='sel'?A.turnSelect:A.turnAdjust)(1); else (k==='sel'?A.pressSelect:A.pressAdjust)(); });
    g.addEventListener('wheel', e=>{ e.preventDefault(); (k==='sel'?A.turnSelect:A.turnAdjust)(e.deltaY<0?1:-1); }, {passive:false});
  });
  root.querySelectorAll('.jack').forEach(g=> g.addEventListener('click', ()=>{ if (g.dataset.j==='video') A.plugVideo(!D.in.video); else A.plugAes(!D.in.aes); }));
  const p = root.querySelector('.pwr'); if (p) p.addEventListener('click', ()=>A.power());
}
function controlsHTML(){
  return `<div class="ctl" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
    <span class="small muted">SELECT</span><button data-a="sl">⟲</button><button data-a="sp">press</button><button data-a="sr">⟳</button>
    <span class="small muted" style="margin-left:10px">ADJUST</span><button data-a="al">⟲</button><button data-a="ap">press</button><button data-a="ar">⟳</button>
    <button data-a="both" style="margin-left:10px">press both</button>
    <span class="small muted" style="margin-left:10px">Keys: Q W E · I O P · B</span></div>
    <div class="small muted" style="margin-top:4px">Click a knob's left side to turn it counter-clockwise, its centre to press it, its right side to turn it clockwise. The mouse wheel turns it too. Click the rear BNCs to plug or unplug a reference.</div>`;
}
function bindControls(root){
  const map={sl:()=>A.turnSelect(-1),sp:()=>A.pressSelect(),sr:()=>A.turnSelect(1),al:()=>A.turnAdjust(-1),ap:()=>A.pressAdjust(),ar:()=>A.turnAdjust(1),both:()=>A.pressBoth()};
  root.querySelectorAll('[data-a]').forEach(b=> b.onclick=()=>map[b.dataset.a]());
}
document.addEventListener('keydown', e=>{
  if (!window.__pod33Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase(); const m={q:()=>A.turnSelect(-1),w:()=>A.pressSelect(),e:()=>A.turnSelect(1),i:()=>A.turnAdjust(-1),o:()=>A.pressAdjust(),p:()=>A.turnAdjust(1),b:()=>A.pressBoth()};
  if (m[k]) { m[k](); e.preventDefault(); }
});

/* ---------------- timeline lanes ---------------- */
function lanes(){
  const vf = VFMT[D.in.vfmt]; const L = lockState();
  const css=n=>SIM.css(n);
  const ls = [];
  ls.push({label:'Video ref: fields (V) / lines (H)', h:30, draw(c,X,t0,t1,y,h){
    if (!D.in.video){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('no video connected', X(t0)+6, y+h/2+4); return; }
    const span=t1-t0;
    if (span < 40*vf.H) SIM.pulses(c,X,t0,t1,y+h*0.45,h*0.55,vf.H,0,4.7e-6,css('--ink2'),'H sync');
    SIM.pulses(c,X,t0,t1,y,h*(span<40*vf.H?0.5:1),vf.field,0,3*vf.H,css('--accent2'),'fields');
  }});
  ls.push({label:'ATmega128 main loop', h:34, draw(c,X,t0,t1,y,h){
    const ps = schedule().passes; const cols=[css('--accent'), css('--accent2')];
    let shown=0; const pxPass = X(t0+C.LOOP_T)-X(t0);
    for (const p of ps){ if (p.t1<t0 || p.t0>t1) continue; shown++;
      if (p.kind==='boot'){ c.fillStyle=css('--warn'); c.globalAlpha=.5; c.fillRect(X(p.t0),y+3,X(p.t1)-X(p.t0),h-6); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px sans-serif'; c.fillText('RESET → main() boot (inferred length)', Math.max(X(p.t0),X(t0))+4, y+h/2+4); continue; }
      if (pxPass > 60){
        // draw steps
        let tt=p.t0; STEPS.forEach((s,j)=>{ let d=s[1]*C.LOOP_T; if (j===2 && p.stall) d+=p.stall; if (p.kind==='fault' && j===7){ d = p.t1 - tt; }
          c.fillStyle = j===6? css('--accent2') : j===7&&p.kind==='fault'? css('--bad') : j===2&&p.stall? css('--warn') : css('--accent');
          c.globalAlpha = j%2? .55 : .8; c.fillRect(X(tt), y+3, Math.max(1,X(tt+d)-X(tt)-1), h-6); c.globalAlpha=1;
          if (X(tt+d)-X(tt) > 70){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(s[0].split(' · ')[0].slice(0,28), X(tt)+3, y+h/2+3); }
          tt+=d; if (p.kind==='fault' && j===7) return; });
      } else {
        c.fillStyle = p.kind==='fault'? css('--bad') : p.stall? css('--warn') : cols[p.i%2];
        c.globalAlpha=.75; c.fillRect(X(p.t0), y+3, Math.max(1,X(p.t1)-X(p.t0)-0.5), h-6); c.globalAlpha=1;
      }
    }
    if (pxPass < 3){ c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${shown} passes in view (≈${C.LOOP_T*1e3|0}.${String(Math.round(C.LOOP_T*1e6)%1000).padStart(3,'0')} ms each, inferred); orange = stalled on video sync`, X(t0)+6, y+h/2+4); }
  }});
  ls.push({label:'PD0 marker: 40-byte FPGA transfer', h:24, draw(c,X,t0,t1,y,h){
    const ps = schedule().passes; c.fillStyle=css('--accent2');
    for (const p of ps){ if (p.kind!=='loop' && p.kind!=='fault') continue; if (p.t1<t0||p.t0>t1) continue;
      const a = p.t0 + STEP_FRAC[6]*C.LOOP_T + p.stall, b = a + STEPS[6][1]*C.LOOP_T; c.fillRect(X(a), y+5, Math.max(1,X(b)-X(a)), h-10); }
  }});
  ls.push({label:'Watchdog', h:22, draw(c,X,t0,t1,y,h){
    const ps = schedule().passes; c.font='11px sans-serif';
    for (const p of ps){ if (p.kind!=='fault') continue; const a=p.spinFrom, b=p.t1; c.fillStyle=css('--bad'); c.globalAlpha=.6; c.fillRect(X(a),y+4,X(b)-X(a),h-8); c.globalAlpha=1; c.fillStyle=css('--ink'); c.fillText('spinning, no WDR → timeout ≈14 ms', X(a)+4, y+h/2+4); }
    if (!D.faultAt && D.faultAt!==0){ c.fillStyle=css('--ink2'); c.fillText('WDR() several times every pass — never times out', X(t0)+6, y+h/2+4); }
  }});
  ls.push({label:`SHARC sample IRQ (fs ${L.fs/1000} kHz)`, h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/L.fs,0,0.15/L.fs,css('--accent'),'SampleIRQ → ToneGen'); }});
  ls.push({label:'AES3 blocks (Z preamble)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,192/L.fs,0,1/L.fs,css('--warn'),'blocks of 192 frames'); }});
  for (let k=0;k<4;k++){
    ls.push({label:`AES${k+1} OUT ${D.aes[k].out?'(word clock)':'L / R tone'}`, h:34, draw(c,X,t0,t1,y,h){
      const pw = X(t1)-X(t0); const N = Math.min(1400, Math.max(200, pw*2));
      const sides = D.aes[k].out? [0] : [0,1]; const cols=[css('--accent'), css('--bad')];
      if (!D.power || inBootRange(t0,t1)) {}
      sides.forEach(sd=>{ c.strokeStyle=cols[sd]; c.lineWidth=1; c.beginPath();
        const span=t1-t0, fs=L.fs, f = D.aes[k].out? fs : FREQ_HZ[sd? D.aes[k].rf : D.aes[k].lf];
        if (span*f > pw/2){ // too dense: draw envelope
          const db=ampDb(sd?D.aes[k].ra:D.aes[k].la); const a = D.aes[k].out?1: db===null?0:Math.pow(10,db/20);
          c.globalAlpha=.35; c.fillStyle=cols[sd]; c.fillRect(X(t0), y+h/2 - a*(h/2-3), pw, 2*a*(h/2-3)); c.globalAlpha=1; return; }
        for (let i=0;i<=N;i++){ const tt=t0+span*i/N; const v=outputSample(k,sd,tt); const yy=y+h/2 - v*(h/2-3); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); });
    }});
  }
  ls.push({label:'LEDs: AES · VIDEO · INTERNAL', h:30, draw(c,X,t0,t1,y,h){
    const N=Math.min(600, Math.max(60,(X(t1)-X(t0))/2)); const span=t1-t0;
    const rows=[['aes',css('--accent')],['video',css('--accent')],['int',css('--warn')]];
    rows.forEach(([key,col],r)=>{ c.fillStyle=col; for (let i=0;i<N;i++){ const tt=t0+span*(i+.5)/N; if (ledsAt(tt)[key]) c.fillRect(X(t0+span*i/N), y+3+r*9, (X(t1)-X(t0))/N+0.5, 7); } });
  }});
  return ls;
}
function inBootRange(){ return false; }

/* ---------------- scope (zoom on one AES frame / waveform) ---------------- */
function aesFrameBits(t, k){
  const L = lockState(); const n = Math.floor(t*L.fs); const fr = n%192;
  const out = [];
  for (const side of [0,1]){
    const v = outputSample(k, side, n/L.fs);
    let s = Math.round(v * 8388607); if (s<0) s += 1<<24;
    const bits = new Array(32).fill(0);
    for (let b=0;b<24;b++) bits[4+b] = (s>>b)&1;   // LSB first, slots 4..27
    bits[28]=0; bits[29]=0;                        // V, U
    const cs0 = L.fs===48000?0x85: L.fs===44100?0x45: L.fs===32000?0xC5:0x05; // byte 0 professional
    bits[30] = fr<8 ? (cs0>>fr)&1 : 0;             // C bit = channel-status bit number fr
    let par=0; for (let b=4;b<31;b++) par^=bits[b]; bits[31]=par;
    out.push({ pre: side? 'Y' : (fr===0?'Z':'X'), bits, sample:v, raw:s });
  }
  return { n, fr, sub: out, fs:L.fs };
}
function biphase(pre, bits, startLevel){
  // returns 64 half-cell levels
  const P = {X:[1,1,1,0,0,0,1,0], Y:[1,1,1,0,0,1,0,0], Z:[1,1,1,0,1,0,0,0]}[pre];
  let lv = []; const inv = startLevel? 0:1; // preamble pattern assumes previous level 0
  P.forEach(b=>lv.push(inv? 1-b : b));
  let cur = lv[lv.length-1];
  for (let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if (bits[i]) cur=1-cur; lv.push(cur); }
  return lv;
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';

function viewSim(m){
  window.__pod33Active = true;
  m.innerHTML = `
  <div class="grid2">
    <div>
      ${card('Front panel at the playhead — what the operator sees', `<div id="fp"></div>${controlsHTML()}
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
          <label class="small">Video format <select id="vf">${Object.keys(VFMT).map(k=>`<option value="${k}" ${k===D.in.vfmt?'selected':''}>${VFMT[k].name}</option>`).join('')}</select></label>
          <button id="flt">Inject FPGA alignment fault here</button><button id="clr">Clear fault</button><button id="rst">Factory defaults</button>
        </div>`)}
      ${card('Rear panel — click the REF BNCs to plug or unplug', `<div id="rp"></div><div class="small muted" style="margin-top:4px">Panel artwork: ${SIM.src('#POD #SERIES/POD33 - #Master/POD33 - #ARTWORK #DA #2016/POD33-FRONT&REAR-SILK (CURVE).cdr', 'POD33-FRONT&REAR-SILK (CURVE).cdr')} (2016-06-20|49), CorelDRAW silk plates in their real inks.</div>`)}
    </div>
    <div>
      ${card('What the software did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
    </div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek; use the transport above)', `<canvas id="tl"></canvas>
     <p class="small muted">Main-loop pass length is ${inf}: the manual says the setup screen times out after about 5 s, and the earliest timeout constant in the source was 3000 passes, which gives about 1.67 ms per pass. The orange passes are the ones that landed inside vertical sync: <span class="mono">LMH1981_VIDEO_DETECT</span> waits there for VSOUT and 11 H lines, so the loop locks loosely to video.</p>`)}
  <div class="grid2">
    ${card('Scope: AES1 at the playhead (one AES3 frame = 2 subframes × 32 bit cells, biphase-mark)', `<canvas id="scope"></canvas><div id="bits" class="small mono"></div>`)}
    ${card('Action log', `<div id="log" class="log"></div>`)}
  </div>`;
  const draw = ()=>{
    const t=SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(); bindPanel(m.querySelector('#rp'));
    const L=lockState(), st=stepAt(t), p=st.pass;
    m.querySelector('#insp').innerHTML = `<table class="kv">
      <tr><th>Main-loop pass</th><td class="mono">${p.kind==='boot'?'— (rebooting)':'#'+p.i} · step: ${st.step>=0?STEPS[st.step][0]:'main() init'}${st.stalled?' (waiting on video sync)':''}${st.spinning?' <b style="color:var(--bad)">SPINNING</b>':''}</td></tr>
      <tr><th>mode / screen</th><td class="mono">${D.mode?'SETUP_MODE':'INFORMATION_MODE'} · ${D.mode? (D.setup===4?'REFERENCE_SCREEN':D.setup===9?'EXIT_SCREEN':'AES'+(D.setup-4)+'_OUT_SCREEN') : 'AES'+(D.info+1)+'_SCREEN'} · ${D.disp?'FREQUENCY':'AMPLITUDE'}</td></tr>
      <tr><th>reference (setting)</th><td class="mono">${REF_NAMES[D.reference]}</td></tr>
      <tr><th>reference_locked</th><td class="mono">${LOCK_NAMES[L.locked]}${L.missing?' <span style="color:var(--warn)">(fallback)</span>':''}</td></tr>
      <tr><th>Sample rate</th><td class="mono">${L.fs.toLocaleString()} Hz · frame ${Math.floor(t*L.fs).toLocaleString()} · block ${Math.floor(t*L.fs/192)}</td></tr>
      <tr><th>video_detect / Astatus</th><td class="mono">${D.in.video?'YES ('+VFMT[D.in.vfmt].code+')':'NO'} / ${D.in.aes?'locked':'0'}</td></tr>
      <tr><th>chirp_status</th><td class="mono">${chirpOn(t)?'ON':'OFF'} (pass ${Math.max(0,p.i)%C.CHIRP_PASSES}/200)</td></tr>
      <tr><th>Outputs</th><td class="mono">${D.aes.map((a,k)=>`AES${k+1}: ${a.out?'WC '+L.fs/1000+'k':`${ampTxt(a.la)}/${ampTxt(a.ra)} dBFS ${FREQ_SHORT[a.lf]}/${FREQ_SHORT[a.rf]}`}`).join('<br>')}</td></tr>
      <tr><th>Register block → FPGA</th><td class="mono small">${regBlock().map((b,i)=>`<span title="byte ${i}" class="${i<4?'hl':''}">${b.toString(16).padStart(2,'0').toUpperCase()}</span>`).join(' ')}</td></tr>
    </table>`;
    const tr = m.querySelector('#trace'); tr.innerHTML = D.log[0]? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Turn or press a knob. Each step the firmware takes is listed here.</div>';
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span> → “${e.disp.join(' ')}”</div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:190});
    drawScope(m.querySelector('#scope'), m.querySelector('#bits'), t);
  };
  bindControls(m);
  m.querySelector('#vf').onchange = e=>A.setVfmt(e.target.value);
  m.querySelector('#flt').onclick = ()=>A.fault();
  m.querySelector('#clr').onclick = ()=>A.clearFault();
  m.querySelector('#rst').onclick = ()=>A.reset();
  SIM.on('time', draw);
  let lastBlink = -1; SIM.on('frame', ()=>{ /* nothing extra: LEDs follow the sim clock */ });
}

function drawScope(cv, bitsEl, t){
  const F = aesFrameBits(t, 0);
  const {c,w,h} = SIM.canvas(cv, 150);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), a2=SIM.css('--accent2'), warn=SIM.css('--warn');
  const lvA = biphase(F.sub[0].pre, F.sub[0].bits, 0), lvB = biphase(F.sub[1].pre, F.sub[1].bits, lvA[lvA.length-1]);
  const lv = lvA.concat(lvB); const cw = (w-20)/lv.length;
  // field shading
  const zones = [[0,8,warn,'pre'],[8,16,ink2,'aux'],[16,56,acc,'audio 20 bits'],[56,64,a2,'VUCP']];
  [0,64].forEach(off=> zones.forEach(([a,b,col,lb])=>{ c.fillStyle=col; c.globalAlpha=.12; c.fillRect(10+(off+a)*cw, 20, (b-a)*cw, 70); c.globalAlpha=1; c.fillStyle=ink2; c.font='10px sans-serif'; if ((b-a)*cw>24) c.fillText(lb, 12+(off+a)*cw, 104); }));
  c.strokeStyle=ink; c.lineWidth=1.5; c.beginPath();
  lv.forEach((v,i)=>{ const x=10+i*cw, y = v? 30 : 80; if(i===0) c.moveTo(x,y); else c.lineTo(x,y); c.lineTo(x+cw,y); }); c.stroke();
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono');
  c.fillText(`Subframe A (${F.sub[0].pre})`, 12, 14); c.fillText(`Subframe B (Y)`, 12+64*cw, 14);
  const ui = 1/(F.fs*128);
  c.fillText(`frame ${F.n.toLocaleString()} · frame ${F.fr}/191 of block · one cell = ${SIM.fmtDur(ui)} · frame = ${SIM.fmtDur(1/F.fs)}`, 10, 130);
  const fmt = s=> s.bits.slice(4,28).reverse().join('');
  bitsEl.innerHTML = F.sub.map((s,i)=>`${i?'B':'A'} sample ${s.sample.toFixed(5)} → 24-bit 0x${s.raw.toString(16).padStart(6,'0').toUpperCase()} (MSB…LSB ${fmt(s)}) · V=${s.bits[28]} U=${s.bits[29]} C=${s.bits[30]} P=${s.bits[31]}`).join('<br>') +
    `<br><span class="muted">Channel-status byte 0 uses the standard AES3 professional layout; the exact bytes POD33's FPGA (i2sx4_aes) sends are ${'not confirmed'} — ${inf}.</span>`;
}

/* ---------------- tutorial ---------------- */
const LESSONS = [
  { title:'Meet the POD33', body:`<p>The POD33 is a half-rack <b>DARS generator</b> (Digital Audio Reference Signal). Engineers fed it into a plant to give every digital audio device the same clock. Each of its four rear outputs carries either a steady <b>AES tone</b> (a test signal) or a <b>word clock</b> (a bare square wave at the sample rate).</p>
     <p>The front panel has a power switch, three <b>REF</b> LEDs (AES, VIDEO, INTERNAL), a 16-character display (two 8-character modules) and two push-and-turn knobs: <b>SELECT</b> (left) and <b>ADJUST</b> (right).</p>
     <p class="muted">Hover over the panel parts on the right. Click “Next” when you are ready.</p>`, check:()=>true, auto:true },
  { title:'1 · Read what is locked', body:`<p>Look at the REF LEDs. A <b>solid</b> LED shows the reference the unit is following. If the reference you asked for is missing, its LED <b>flashes</b> and the backup's LED stays solid.</p><p>Out of the box the unit wants <b>video</b>. A video reference is plugged in, so <b>VIDEO</b> is solid and the outputs run at 48 kHz, locked to the video.</p>`, check:()=>lockState().locked===0, hint:'Make sure VIDEO REF has a cable in (click the rear VIDEO REF BNC).' },
  { title:'2 · Browse the outputs with SELECT', body:`<p><b>Turn SELECT</b> clockwise. The display steps through <span class="mono">AES1 → AES2 → AES3 → AES4</span> and wraps around.</p><p>Each screen shows both channels: <span class="mono">AES3 A/B &nbsp;-24/-14</span> means channel A (left) is at −24 dBFS and channel B (right) is at −14 dBFS.</p><p><b>Goal:</b> get to AES3.</p>`, check:()=>D.mode===0&&D.info===2, hint:'Turn SELECT clockwise (E key, or click the right side of the SELECT knob).' },
  { title:'3 · Pick one channel', body:`<p><b>Press SELECT</b>. Line 1 changes from <span class="mono">A/B</span> to <span class="mono">A</span> (left only). Press again for <span class="mono">B</span>, and again to return to <span class="mono">A/B</span>.</p><p><b>Goal:</b> show <span class="mono">AES3 A</span> with its level in dBFS.</p>`, check:()=>D.mode===0&&D.info===2&&D.aes[2].ch===1&&D.disp===0, hint:'Press SELECT once (W key, or click the centre of SELECT). If you see Hz, press ADJUST to go back to dBFS.' },
  { title:'4 · Change the level', body:`<p><b>Turn ADJUST</b>. Clockwise makes the tone louder, 1 dB per click, up to 0 dBFS. Counter-clockwise makes it quieter: −30 dB, then −40, −50, −60, then OFF.</p><p>The change reaches the output almost at once. The MCU sends the new value to the FPGA on its next loop pass (about 1.7 ms, ${inf}), and the SHARC passes it to the tone generator.</p><p><b>Goal:</b> set AES3 A to <b>−18 dBFS</b>, the EBU-style alignment level.</p>`, check:()=>D.aes[2].la===18, hint:'Turn ADJUST clockwise six clicks from −24 (P key, or the right side of ADJUST).' },
  { title:'5 · Switch to frequency', body:`<p><b>Press ADJUST</b> to swap the display between level (dBFS) and frequency (Hz). The firmware switches all four outputs' screens together.</p><p>Then <b>turn ADJUST</b> to choose 100 Hz, 400 Hz or 1 kHz.</p><p><b>Goal:</b> set AES3 A to <b>400 Hz</b>.</p>`, check:()=>D.aes[2].lf===1&&D.disp===1, hint:'Press ADJUST (O key), then turn it counter-clockwise (I key) until it reads 400Hz.' },
  { title:'6 · Back to the A/B overview', body:`<p>Press SELECT until line 1 reads <span class="mono">A/B</span> again. Turning SELECT to another output also returns every output to A/B.</p><p class="muted">The 2007|40 manual says turning ADJUST in A/B view changes both channels at once. In the shipped v102 firmware that code is commented out, so ADJUST does nothing in A/B view. Try it.</p><p><b>Goal:</b> show <span class="mono">AES3 A/B</span>.</p>`, check:()=>D.mode===0&&D.aes[2].ch===0, hint:'Press SELECT twice (A → B → A/B).' },
  { title:'7 · Open Setup', body:`<p><b>Press both knobs together</b>. The display shows <span class="mono">Ref</span> and the reference you chose. Any half-finished single press is undone first.</p><p><b>Goal:</b> be in Setup on the Ref screen.</p>`, check:()=>D.mode===1&&D.setup===4, hint:'Click “press both” or press B.' },
  { title:'8 · Choose the reference', body:`<p>On the Ref screen, <b>turn ADJUST</b> to choose <span class="mono">Video → AES → Int 48k → Int 96k</span>.</p><p>Choose <b>Int 96k</b>. The INTERNAL LED lights and every output now runs at 96 kHz. The timeline shows twice as many sample interrupts.</p>`, check:()=>D.reference===3, hint:'Turn ADJUST clockwise until it reads Int 96k.' },
  { title:'9 · Make AES2 a word clock', body:`<p><b>Turn SELECT</b> to step through the Setup screens: <span class="mono">Ref → AES1 → AES2 → AES3 → AES4 → Exit</span>. On <span class="mono">AES2</span>, turn ADJUST to switch between <span class="mono">AES</span> and <span class="mono">Wrd Clk</span>.</p><p><b>Goal:</b> AES2 output = Wrd Clk.</p>`, check:()=>D.aes[1].out===1, hint:'Turn SELECT clockwise twice, then turn ADJUST once.' },
  { title:'10 · Leave Setup', body:`<p>Turn SELECT to the <span class="mono">Exit</span> screen and <b>press SELECT</b>. (The manual also mentions a 5-second timeout. ${inf}: in v102 the idle counter is 50 000 passes, about 80 s.)</p><p><b>Goal:</b> back in the normal display.</p>`, check:()=>D.mode===0, hint:'Turn SELECT until it says Exit, then press SELECT.' },
  { title:'11 · Watch the fallback', body:`<p>Set the reference back to <b>Video</b> (Setup → Ref). Then <b>unplug VIDEO REF</b> on the rear panel.</p><p>Now the VIDEO LED <b>flashes</b> (the reference you chose is missing) and INTERNAL is <b>solid</b> (what the unit is actually following). Plug an <b>AES</b> reference into REF to see the unit fall back to AES instead.</p><p>Scrub the timeline: the flashing is driven by <span class="mono">CHIRP()</span>, which toggles every 201 loop passes.</p>`, check:()=>D.reference===0&&!D.in.video, hint:'Setup → Ref → Video, then click the VIDEO REF BNC on the rear panel.' },
  { title:'Done', body:`<p>You've used every control on the POD33. The other tabs show the same operations from the inside: <b>Software</b> traces each knob action through the code, <b>One second</b> breaks the output down to the bit level, and <b>Findings</b> lists the less obvious behaviour in the firmware.</p>`, check:()=>true, auto:true },
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__pod33Active = true;
  m.innerHTML = `<div class="grid2">
    <div>${card('Tutorial — how an operator used the POD33', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}
      <div class="card" id="lesson"></div></div>
    <div>${card('The unit', `<div id="fp"></div>${controlsHTML()}<div id="rp" style="margin-top:8px"></div>`)}
      ${card('What the software did', `<div id="trace" class="log"></div>`)}</div></div>`;
  const hot = `<g class="hot">
    <rect x="120" y="45" width="210" height="180" fill="transparent"><title>Power switch and power LED</title></rect>
    <rect x="520" y="40" width="190" height="230" fill="transparent"><title>REF LEDs: solid = what the unit is locked to; flashing = the reference you chose is missing</title></rect>
    <rect x="770" y="52" width="728" height="92" fill="transparent"><title>Two 8-character Siemens/Osram dot-matrix displays (driver SIEMENS8-3.c)</title></rect></g>`;
  const draw = ()=>{
    m.querySelector('#fp').innerHTML = frontSVG(SIM.t, {hot}); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(); bindPanel(m.querySelector('#rp'));
    const tr = m.querySelector('#trace'); tr.innerHTML = D.log[0]? `<div><b>${D.log[0].name}</b></div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Nothing yet.</div>';
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L = LESSONS[lessonIdx], ok = L.check();
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok? (L.auto?'Ready.':'✓ Goal reached.') : '◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over (factory defaults)</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); lessonIdx=0; draw(); };
  };
  bindControls(m);
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewAnatomy(m){
  window.__pod33Active = true;
  m.innerHTML = `
  ${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">
    ${card('As seen by the device', `<div id="dev"></div>`)}
    ${card('As seen by the displays', `<div id="fp"></div><h3>Downstream: what a meter fed from AES1 shows</h3><canvas id="meter"></canvas><p class="small muted">For example, an AMS8-2 monitor in the same rack: a 46-segment PPM-style bar, −60 to 0 dBFS. The level is the peak of the tone across the last 10 ms ${inf}.</p>`)}
  </div>
  ${card('Zoom ladder at the playhead', `<canvas id="zl"></canvas>`)}`;
  const draw = ()=>{
    const t=SIM.t, L=lockState(), vf=VFMT[D.in.vfmt];
    const rows = [
      ['Video fields', D.in.video? (1/vf.field).toFixed(2) : '—', D.in.video? SIM.fmtDur(vf.field):'', 'LMH1981 VSOUT; the main loop stalls on some of these'],
      ['Video lines (H)', D.in.video? Math.round(1/vf.H).toLocaleString():'—', D.in.video? SIM.fmtDur(vf.H):'', 'LMH1981 HSOUT; 11 are counted per detection'],
      ['MCU main-loop passes', '≈ '+Math.round(1/C.LOOP_T)+' '+inf, SIM.fmtDur(C.LOOP_T), 'Each pass sends the 40-byte block: 320 bits each way'],
      ['Register bits to the FPGA', '≈ '+(320*Math.round(1/C.LOOP_T)).toLocaleString(), '', 'Bit-banged on ALTERA1..8 (PB1 data, PB7 clock)'],
      ['LED flash half-periods', (1/(C.CHIRP_PASSES*C.LOOP_T)).toFixed(1), SIM.fmtDur(C.CHIRP_PASSES*C.LOOP_T), 'CHIRP toggles every 201 passes'],
      ['AES3 blocks', (L.fs/192).toFixed(2), SIM.fmtDur(192/L.fs), '192 frames; Z preamble; carries the 24 channel-status bytes'],
      ['AES3 frames = samples per channel', L.fs.toLocaleString(), SIM.fmtDur(1/L.fs), 'SHARC SampleIRQ → ToneGen → TDM → FPGA → AES encoder'],
      ['AES3 subframes', (2*L.fs).toLocaleString(), SIM.fmtDur(1/L.fs/2), 'A (left) and B (right)'],
      ['AES3 bit cells (biphase)', (128*L.fs).toLocaleString(), SIM.fmtDur(1/L.fs/128), `${(128*L.fs/1e6).toFixed(3)} Mbaud on each of 8 output drivers`],
      ['Tone cycles at 1 kHz', '1,000', '1 ms', `${L.fs/1000} samples per cycle`],
      ['Word-clock edges', (2*L.fs).toLocaleString(), SIM.fmtDur(1/L.fs/2), 'On outputs set to Wrd Clk'],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Reference: ${D.in.video? vf.name+' — '+vf.cadence : 'no video'} · locked to ${LOCK_NAMES[L.locked]} at ${L.fs/1000} kHz. Use <b>Step</b> on the transport to move one field, one loop pass, one AES block or one AES frame at a time.</p>`;
    const st=stepAt(t), F=aesFrameBits(t,0);
    m.querySelector('#dev').innerHTML = `<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>Video</th><td class="mono">${D.in.video? `field ${Math.floor(t/vf.field)} · line ${Math.floor((t%vf.field)/vf.H)+1}${(t%vf.field)<3*vf.H?' · <b>in V sync</b>':''}`:'none'}</td></tr>
      <tr><th>ATmega128</th><td class="mono">${st.pass.kind==='boot'?'rebooting':'pass #'+st.pass.i}: ${st.step>=0?STEPS[st.step][0]:'init'}<br><span class="muted">${st.step>=0?STEPS[st.step][2]:''}</span></td></tr>
      <tr><th>FPGA</th><td class="mono">${st.step===6?'shifting the register block in/out (ALTERA1..8)':'holding REG1–REG10; encoding AES; muxing word clock'}</td></tr>
      <tr><th>SHARC</th><td class="mono">sample ${F.n.toLocaleString()}: ToneGen → TDM slot · bg loop checks “SYNC” header</td></tr>
      <tr><th>AES1 frame</th><td class="mono">${F.fr}/191 · A=${F.sub[0].sample.toFixed(4)} B=${F.sub[1].sample.toFixed(4)} · preamble ${F.sub[0].pre}</td></tr></table>`;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    // meter
    const {c,w} = SIM.canvas(m.querySelector('#meter'), 70);
    [0,1].forEach(sd=>{ let pk=0; for(let i=0;i<64;i++){ pk=Math.max(pk, Math.abs(outputSample(0,sd,t-0.01*i/64))); }
      const db = pk>0? 20*Math.log10(pk) : -99; const segs=46; const lit = Math.max(0, Math.min(segs, Math.round((db+60)/60*segs)));
      for (let s=0;s<segs;s++){ const x=10+s*(w-20)/segs; const col = s>=segs-4? '#e3453a' : s>=segs-12? '#e8b23a' : '#3fbf5f'; c.fillStyle = s<lit? col : SIM.css('--grid'); c.fillRect(x, 8+sd*28, (w-20)/segs-2, 20); }
      c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText((sd?'B ':'A ')+(db>-99?db.toFixed(1)+' dBFS':'—'), 12, 22+sd*28); });
    // zoom ladder
    drawLadder(m.querySelector('#zl'), t);
  };
  SIM.on('time', draw);
}
function drawLadder(cv, t){
  const L=lockState(), vf=VFMT[D.in.vfmt];
  const levels = [ ['1 second',1], ['1 video field', vf.field], ['1 AES block', 192/L.fs], ['1 loop pass', C.LOOP_T], ['1 AES frame', 1/L.fs] ];
  const db0=ampDb(D.aes[0].la); const norm = db0===null? 1 : 1/Math.pow(10,db0/20);
  const H = levels.length*44+10; const {c,w} = SIM.canvas(cv, H);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), play=SIM.css('--play'), grid=SIM.css('--grid');
  levels.forEach(([nm,span],i)=>{
    const y=8+i*44; const t0=Math.max(0, Math.min(1-span, t-span/2));
    c.fillStyle=ink; c.font='12px sans-serif'; c.fillText(nm+' ('+SIM.fmtDur(span)+')', 6, y+14); c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText('AES1 A, scaled to full height', 6, y+28);
    const x0=170, pw=w-x0-10; c.strokeStyle=grid; c.strokeRect(x0,y+2,pw,30);
    // AES1 left waveform inside
    c.strokeStyle=acc; c.beginPath(); const N=Math.min(800,pw);
    for(let k=0;k<=N;k++){ const tt=t0+span*k/N; const v=outputSample(0,0,tt)*(D.aes[0].out?1:norm); const yy=y+17-v*13; k?c.lineTo(x0+pw*k/N,yy):c.moveTo(x0,yy);} c.stroke();
    const px=x0+(t-t0)/span*pw; c.strokeStyle=play; c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+34); c.stroke();
    if (i<levels.length-1){ const nspan=levels[i+1][1]; const a=x0+(Math.max(0,Math.min(1-nspan,t-nspan/2))-t0)/span*pw; c.fillStyle=play; c.globalAlpha=.15; c.fillRect(a,y+2,Math.max(2,nspan/span*pw),30); c.globalAlpha=1; }
  });
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  panel:{x:20,y:20,w:170,h:110,t:'Front panel',s:['2× push/turn encoders','2× 8-char dot-matrix display','LEDs: AES · VIDEO · INTERNAL'],d:'SELECT and ADJUST are quadrature encoders with push switches (shaft_encoder1/2.c). The displays are Siemens/Osram-style intelligent 8-character modules (SIEMENS8-3.c; v102 changed their reset sequence for a replacement part).'},
  mcu:{x:250,y:20,w:190,h:110,t:'ATmega128 @ 8 MHz',s:['UI, menus, EEPROM','reference fallback','CS8416 + LMH1981 status'],d:'pod33v102.c: one big while(1) loop, no interrupts used (TIMSK = 0). It owns the UI, decides which reference is in use, and once per pass sends a 40-byte register block to the FPGA.'},
  vid:{x:20,y:200,w:170,h:70,t:'VIDEO REF → LMH1981',s:['HSOUT VSOUT FSOUT …'],d:'National LMH1981 sync separator. The MCU reads VSOUT/HSOUT/FSOUT to identify the format (LMH1981.c). The FPGA receives all six outputs (pins 137–144).'},
  aesin:{x:20,y:300,w:170,h:70,t:'AES REF → CS8416',s:['lock / I²S / MCLK'],d:'Cirrus CS8416 receiver. The MCU programs it and polls lock (cs84xx.c). The FPGA takes its recovered MCLK and data (U9_MCLK pin 134, U9_SDATA pin 121).'},
  fpga:{x:250,y:200,w:190,h:170,t:'Cyclone II EP2C5',s:['input_SELECTOR · router','PLL1705 control','i2sx4_aes encoders','word clock / AES mux','tdm_i2sx5 ↔ SHARC'],d:'POD33.bdf (Quartus II 5.1). Chooses the reference, steers the PLL1705 audio clock, takes 8 tone channels from the SHARC over the DAI, encodes 4 AES3 streams, and switches each output between AES and word clock (REG 10 bits 3–6). Config from EPCS4/M25P40.'},
  pll:{x:250,y:400,w:190,h:50,t:'PLL1705 audio clock',s:['PLL1705_XT · AUDIO_CLOCK'],d:'TI/Burr-Brown PLL1705 multi-clock generator, steered by the FPGA phase detector (up/down/vco pins).'},
  dsp:{x:510,y:200,w:180,h:110,t:'ADSP-21262 SHARC',s:['ToneGen × 8 channels','SampleIRQ at fs','reads “SYNC” register block'],d:'backgnd.c / sample.c, VisualDSP++ 4.0. The Allard Designs ToneGen module makes 8 sine tones (4 outputs × A/B) at 32/44.1/48/96 kHz. Boots from AT25F512A SPI flash.'},
  outs:{x:510,y:340,w:180,h:110,t:'4× outputs',s:['AES_OUTn_75 → BNC','AES_OUTn_110 → Phoenix','AES tone or word clock'],d:'FPGA pins 81/80/120/119 (75 Ω) and 112–115 (110 Ω). Each pair carries the same signal.'},
  ee:{x:510,y:20,w:180,h:60,t:'EEPROM (in the AVR)',s:['settings after a quiet period'],d:'SAVE_INFORMATION_EEPROM runs when EEPROM_TIMER counts 50 000 quiet passes after the last change.'},
};
const WIRES = [ ['panel','mcu','encoders / display bus'], ['mcu','fpga','ALTERA1..8: 40-byte block every pass'], ['vid','mcu','VSOUT/HSOUT/FSOUT'], ['vid','fpga','sync'], ['aesin','mcu','control / lock'], ['aesin','fpga','MCLK / SDATA'], ['fpga','pll','phase det.'], ['fpga','dsp','DAI_P1..20 TDM + registers'], ['dsp','fpga',''], ['fpga','outs','AES3 ×4'], ['mcu','ee','']];
function viewBlock(m){
  window.__pod33Active = false;
  let sel='fpga';
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${card('Signal flow in one sentence', `<p>The <b>MCU</b> decides what the unit should do and writes it into a 40-byte register block. The <b>FPGA</b> forwards that block to the <b>SHARC</b>. The SHARC makes the tones, and the FPGA clocks everything from the chosen reference and sends it out of the four outputs.</p>`)}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 710 470" style="width:100%"><defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx? (bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1);
      const hot = sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#ar)"/>`;
      if (l) s+=`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
        <text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>
        ${b.s.map((l,i)=>`<text x="${b.x+10}" y="${b.y+38+i*15}" font-size="11" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    s+='</svg>';
    m.querySelector('#bd').innerHTML=s;
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
  };
  draw();
}

/* ---------------- schematics (net-label style, redrawn) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
const SHEETS = [
  { name:'1 · MCU and front panel', note:'ATmega128 pin functions from altera.h, cs84xx.h and SIEMENS83.h (v102). Encoder and LED pins are not traced here.', svg:()=>
    chip(300,60,220,'U? ATmega128(L)',[
      ['PB1','ALTERA DATA OUT'],['PB0','ALTERA DATA IN'],['PB7','ALTERA CLOCK'],['PB4','ALTERA FSYNCH'],['PA1','STROBE / DISP nWR'],['PD?','ALTERA RESET'],['PC3/PC4','DATA_READ1/2'],
    ],[
      ['PB3','CS8416 CCLK'],['PB5','CS8416 CDIN'],['PB6','CS8416 CDOUT'],['PB2','CS8416 nCS1'],['PG1','CS8416 nRST'],['PD0','nCS2 → scope marker'],['PD7','DISP nRESET'],['PG0','DISP nFL'],['PA2','DISP nRD'],['XTAL','8.000 MHz'],
    ],'8 MHz · ICCAVR 7.12/7.15 · JTAG/ISP')
    + `<rect x="40" y="320" width="160" height="60" fill="none" stroke="var(--ink)"/><text x="120" y="345" text-anchor="middle" font-size="12" fill="var(--ink)">2× Siemens/Osram</text><text x="120" y="362" text-anchor="middle" font-size="12" fill="var(--ink)">8-char display</text>
       <rect x="640" y="320" width="160" height="60" fill="none" stroke="var(--ink)"/><text x="720" y="345" text-anchor="middle" font-size="12" fill="var(--ink)">SELECT / ADJUST</text><text x="720" y="362" text-anchor="middle" font-size="12" fill="var(--ink)">A, B, push (pins not traced)</text>` },
  { name:'2 · FPGA (pins from POD33.qsf)', note:'Cyclone II EP2C5T144C8. Pin numbers and net names are copied from Altera/v101/POD33.qsf.', svg:()=>
    chip(320,40,200,'EP2C5T144C8',[
      ['60','ALTERA1'],['63','ALTERA2'],['64','ALTERA3'],['65','ALTERA4'],['67','ALTERA5'],['69','ALTERA6'],['70','ALTERA7'],['71','ALTERA8'],
      ['144','HSOUT'],['143','VSOUT'],['142','FSOUT'],['141','CSOUT'],['139','BPOUT'],['137','OEOUT'],
      ['126','CS8416_IN'],['125','CS8416_CLK'],['122','CS8416_OUT'],['136','CS8416_SEL1'],['135','CS8416_RESET1'],['134','U9_MCLK'],['121','U9_SDATA'],
    ],[
      ['81','AES_OUT1_75'],['80','AES_OUT2_75'],['120','AES_OUT3_75'],['119','AES_OUT4_75'],['112','AES_OUT1_110'],['113','AES_OUT2_110'],['114','AES_OUT3_110'],['115','AES_OUT4_110'],
      ['74','PLL1705_XT'],['73','AUDIO_CLOCK'],['90/21','vco_1 / vco_2'],['94/26','up1 / up2'],['93/25','down1 / down2'],
      ['59…51','DAI_P1…P7'],['48…40','DAI_P8…P15'],['32…27','DAI_P16…P20'],['103/104','tp1 / tp2'],['100/101/99','tp3 / tp4 / tp5'],
    ],'Quartus II 5.1 · EPCS4 (M25P40)') },
  { name:'3 · SHARC DSP', note:'ADSP-21262 connections inferred from DAI net names and the BOM; boot settings from slm1-1.mak (elfloader -bspiflash -HostWidth8).', svg:()=>
    chip(320,60,200,'ADSP-21262',[
      ['DAI_P1..P20','↔ FPGA TDM/I²S'],['SPI','AT25F512A boot'],['JTAG','HPUSB-ICE'],['CLKIN','(from board) '],
    ],[['SPORT0','SampleIRQ (SIG_SP0)'],['DAI SRU','configdai.c'],['RESET','(board)']],'VisualDSP++ 4.0 · silicon rev 0.1')
    + `<text x="60" y="300" font-size="12" fill="var(--ink2)">Software inside: ToneGen.asm (Allard Designs) × 8 channels, backgnd.c register parser (“SYNC” = 0x53594E43), sample.c TDM buffers.</text>` },
  { name:'4 · References', note:'LMH1981 and CS8416 connections from LMH1981.c, cs84xx.h and the FPGA pin list. Input termination and transformer details are not traced.', svg:()=>
    chip(120,60,170,'LMH1981',[['VIN','VIDEO REF BNC']],[['HSOUT','→ MCU + FPGA 144'],['VSOUT','→ MCU + FPGA 143'],['FSOUT','→ MCU + FPGA 142'],['CSOUT','→ FPGA 141'],['BPOUT','→ FPGA 139'],['OEOUT','→ FPGA 137']],'video sync separator')
    + chip(520,60,170,'CS8416 (U9)',[['RXP0','AES REF 75 Ω BNC'],['RXP1','AES REF 110 Ω'],['CCLK/CDIN/CDOUT','MCU PB3/PB5/PB6'],['nCS / nRST','MCU PB2 / PG1']],[['OMCK/RMCK','U9_MCLK → 134'],['SDOUT','U9_SDATA → 121'],['GPO0..2','→ 133/132/129']],'AES3 receiver') },
  { name:'5 · Outputs', note:'Each AES output appears twice: 75 Ω BNC and 110 Ω Phoenix (“+ − G”). Driver parts are not traced from the P-CAD files here.', svg:()=>{
    let s=''; for(let k=0;k<4;k++){ const y=50+k*80; s+=`<text x="40" y="${y+5}" font-size="12" fill="var(--accent2)">FPGA AES_OUT${k+1}_75</text><line x1="190" y1="${y}" x2="300" y2="${y}" stroke="var(--ink)"/><polygon points="300,${y-12} 300,${y+12} 324,${y}" fill="none" stroke="var(--ink)"/><line x1="324" y1="${y}" x2="420" y2="${y}" stroke="var(--ink)"/><text x="350" y="${y-6}" font-size="10" fill="var(--ink2)">75 Ω</text><circle cx="432" cy="${y}" r="10" fill="none" stroke="var(--ink)"/><text x="450" y="${y+4}" font-size="12" fill="var(--ink)">BNC ${k+1}</text>
      <text x="40" y="${y+35}" font-size="12" fill="var(--accent2)">FPGA AES_OUT${k+1}_110</text><line x1="190" y1="${y+30}" x2="300" y2="${y+30}" stroke="var(--ink)"/><polygon points="300,${y+18} 300,${y+42} 324,${y+30}" fill="none" stroke="var(--ink)"/><path d="M324 ${y+30} h30 m0 -10 q8 5 0 10 q8 5 0 10 m14 -20 q-8 5 0 10 q-8 5 0 10" fill="none" stroke="var(--ink)"/><line x1="384" y1="${y+30}" x2="420" y2="${y+30}" stroke="var(--ink)"/><text x="450" y="${y+34}" font-size="12" fill="var(--ink)">Phoenix ${k+1} (+ − G)</text>`; }
    return s + `<text x="600" y="60" font-size="12" fill="var(--ink2)">REG 10 bit ${'3+k'}: 1 = word clock, 0 = AES</text>`; } },
];
function viewSchem(m){
  window.__pod33Active = false;
  let i=0;
  m.innerHTML = card('Schematic set (redrawn from source net names — not the P-CAD drawings)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The original P-CAD schematics are in <span class="mono">POD33 - #Engineering/PCB/POD33-iss2.sch</span>. These sheets are a readable guide built from the pin names in the firmware and the FPGA project, so the connections are as reliable as those names. Blue labels are nets.</p>`);
  const draw=()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 860 470" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px">
      <rect x="6" y="6" width="848" height="458" fill="none" stroke="var(--line)"/><text x="840" y="455" text-anchor="end" font-size="10" fill="var(--ink2)">POD33 · sheet ${i+1}/${SHEETS.length} · redrawn 2026|59</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent = SHEETS[i].note;
  };
  draw();
}

/* ---------------- software diagrams ---------------- */
function viewSoft(m){
  window.__pod33Active = true;
  m.innerHTML = `<div class="grid2">
    ${card('ATmega128 main loop — the box lit up is running at the playhead', `<div id="flow"></div>`)}
    <div>${card('Reference fallback (REFRESH_LEDS)', `<div id="fsm"></div>`)}${card('Menu map (TRANSLATE_ENCODER / ENCODER_UPDATE)', `<div id="ui"></div>`)}</div></div>
  <div class="grid2">
    ${card('How the buttons did things — knob → code → signal', `<div id="btn"></div>`)}
    ${card('Register block (ALTERA_SORT → FPGA → SHARC), live', `<div id="reg"></div>`)}
  </div>
  ${card('SHARC tone generator loop (backgnd.c / sample.c)', `<div id="sharc"></div>`)}`;
  const draw=()=>{
    const st=stepAt(SIM.t);
    let s=`<svg viewBox="0 0 520 ${STEPS.length*44+80}" style="width:100%"><defs><marker id="a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <rect x="150" y="6" width="220" height="26" rx="13" fill="var(--chip)" stroke="var(--line)"/><text x="260" y="24" text-anchor="middle" font-size="12" fill="var(--ink)">main(): init, DATA_initialization</text>`;
    STEPS.forEach((p,j)=>{ const y=44+j*44, on=st.step===j; const bad=(j===7&&st.spinning);
      s+=`<line x1="260" y1="${y-12}" x2="260" y2="${y}" stroke="var(--ink2)" marker-end="url(#a2)"/><rect x="40" y="${y}" width="440" height="32" rx="6" fill="${bad?'var(--bad)':on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
        <text x="50" y="${y+14}" font-size="11.5" font-family="var(--mono)" fill="${on||bad?'#fff':'var(--ink)'}">${p[0].length>62?p[0].slice(0,60)+'…':p[0]}</text><text x="50" y="${y+27}" font-size="10" fill="${on||bad?'#eef':'var(--ink2)'}">${p[2]}</text>`; });
    const yb=44+STEPS.length*44; s+=`<path d="M480 ${yb-28} h22 V40 h-22" fill="none" stroke="var(--ink2)" marker-end="url(#a2)"/><text x="506" y="${yb/2}" font-size="10" fill="var(--ink2)" transform="rotate(90 506 ${yb/2})">while(1)</text>
      <text x="40" y="${yb+18}" font-size="11" fill="var(--ink2)">WDR() between groups keeps the ≈14 ms watchdog fed. Pass ${st.pass.kind==='boot'?'(boot)':'#'+st.pass.i}.</text></svg>`;
    m.querySelector('#flow').innerHTML=s;
    // FSM
    const L=lockState();
    const node=(x,y,lbl,on,sub)=>`<g><circle cx="${x}" cy="${y}" r="38" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="${x}" y="${y-2}" text-anchor="middle" font-size="12" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${lbl}</text><text x="${x}" y="${y+14}" text-anchor="middle" font-size="10" fill="${on?'#fff':'var(--ink2)'}">${sub}</text></g>`;
    m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 460 190" style="width:100%">${node(70,90,'VIDEO',L.locked===0,'48 kHz')}${node(230,90,'AES',L.locked===1,(D.in.aesRate/1000)+' kHz')}${node(390,90,'INTERNAL',L.locked===2,D.reference===3?'96 kHz':'48 kHz')}
      <path d="M108 80 Q150 50 192 80" fill="none" stroke="var(--ink2)"/><text x="150" y="50" font-size="10" text-anchor="middle" fill="var(--ink2)">video lost, AES ok</text>
      <path d="M268 80 Q310 50 352 80" fill="none" stroke="var(--ink2)"/><text x="310" y="50" font-size="10" text-anchor="middle" fill="var(--ink2)">AES lost too</text>
      <path d="M100 118 Q230 190 360 118" fill="none" stroke="var(--ink2)"/><text x="230" y="172" font-size="10" text-anchor="middle" fill="var(--ink2)">no video, no AES</text>
      <text x="10" y="20" font-size="11" fill="var(--ink)">Setting: <tspan font-weight="700">${REF_NAMES[D.reference]}</tspan> · video ${D.in.video?'present':'absent'} · AES ${D.in.aes?'present':'absent'}${L.missing?' · <tspan fill="var(--warn)">chosen LED flashes</tspan>':''}</text></svg>
      <p class="small muted">Priority: with Video selected, video → AES → internal. With AES selected, AES → video → internal. With Int 48k / Int 96k selected, always internal. AUTO_REF exists in the source but is commented out.</p>`;
    // UI map
    const inf_ = D.mode===0, cur = inf_? 'AES'+(D.info+1) : (D.setup===4?'Ref':D.setup===9?'Exit':'OUT'+(D.setup-4));
    const box=(x,y,t,on)=>`<rect x="${x}" y="${y}" width="74" height="26" rx="5" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+37}" y="${y+17}" text-anchor="middle" font-size="11" fill="${on?'#fff':'var(--ink)'}">${t}</text>`;
    let u=`<svg viewBox="0 0 470 200" style="width:100%"><text x="6" y="16" font-size="11" font-weight="700" fill="var(--ink)">NORMAL (INFORMATION_MODE) — turn SELECT</text>`;
    ['AES1','AES2','AES3','AES4'].forEach((n,i)=>u+=box(10+i*86,24,n,inf_&&cur===n));
    u+=`<text x="10" y="70" font-size="10.5" fill="var(--ink2)">press SELECT: A/B → A → B → A/B · press ADJUST: dBFS ⇄ Hz · turn ADJUST: value (A or B only)</text>
       <text x="6" y="104" font-size="11" font-weight="700" fill="var(--ink)">SETUP_MODE — press both · turn SELECT</text>`;
    ['Ref','OUT1','OUT2','OUT3','OUT4','Exit'].forEach((n,i)=>u+=box(6+i*77,112,n,!inf_&&cur===n));
    u+=`<text x="10" y="158" font-size="10.5" fill="var(--ink2)">turn ADJUST: Ref = Video/AES/Int 48k/Int 96k · OUTn = AES/Wrd Clk</text><text x="10" y="176" font-size="10.5" fill="var(--ink2)">press SELECT on Exit → back to NORMAL</text></svg>`;
    m.querySelector('#ui').innerHTML=u;
    // buttons table
    m.querySelector('#btn').innerHTML = `<table class="kv"><tr><th>Operator does</th><th>Firmware path</th><th>What changes on the wire</th></tr>
      <tr><td>Turn SELECT</td><td class="mono small">SHAFT_ENCODER1 → encoder_action1 → ENCODER1_UPDATE</td><td class="small">Display only. All channels go back to A/B (bytes 4–7 = 0)</td></tr>
      <tr><td>Press SELECT</td><td class="mono small">SWITCH_ENCODER1 → TRANSLATE_ENCODER1 (switch1, switch_setup1)</td><td class="small">channel_select byte 4+n: 0 A/B, 1 A, 2 B (display only; outputs unchanged)</td></tr>
      <tr><td>Press ADJUST</td><td class="mono small">SWITCH_ENCODER2 → TRANSLATE_ENCODER2</td><td class="small">Display only (dBFS ⇄ Hz)</td></tr>
      <tr><td>Turn ADJUST (A or B)</td><td class="mono small">ENCODER2_UPDATE → aesN.left/right_amplitude or _frequency</td><td class="small">Bytes 8–23 → FPGA → SHARC → ToneGenEdit(LEVEL/FREQ/ENABLE) → tone changes on the next samples</td></tr>
      <tr><td>Press both</td><td class="mono small">the second switch sees switch_setup of the first → SETUP_MODE, restore *_hold</td><td class="small">Display only</td></tr>
      <tr><td>Setup: Ref</td><td class="mono small">reference++ → REFRESH_LEDS → reference_locked</td><td class="small">Byte 39 bits 0–1 and byte 27 → FPGA input selector / PLL; SHARC re-inits ToneGen at the new fs</td></tr>
      <tr><td>Setup: OUTn</td><td class="mono small">aesN.output_select</td><td class="small">Byte 39 bit 3+n → FPGA switches that output to word clock</td></tr>
      <tr><td>Stop touching it</td><td class="mono small">EEPROM_TIMER (50 000 quiet passes)</td><td class="small">SAVE_INFORMATION_EEPROM: settings survive a power cycle</td></tr></table>
      <p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none yet — use the Simulator or Tutorial tab'}</b></p>`;
    // regs
    const b=regBlock(); const names=['REG1 header “SYNC”','REG2 channel select AES1–4','REG3 AES1 La Lf Ra Rf','REG4 AES2 La Lf Ra Rf','REG5 AES3 La Lf Ra Rf','REG6 AES4 La Lf Ra Rf','REG7 internal sample rate','REG8 reserved','REG9 routing control 2','REG10 routing control 1'];
    m.querySelector('#reg').innerHTML = `<table class="kv">${names.map((n,r)=>`<tr><th>${n}</th><td class="mono">${b.slice(r*4,r*4+4).map(v=>v.toString(16).padStart(2,'0').toUpperCase()).join(' ')}</td></tr>`).join('')}</table>
      <p class="small muted">Byte 39 = ${b[39].toString(2).padStart(8,'0')}b: bits 6–3 = AES4–1 word clock, bit 2 = reference reset, bits 1–0 = reference_locked. Amplitude bytes are indexes: 0 = 0 dBFS … 30 = −30, 31/32/33 = −40/−50/−60, 34 = OFF.</p>`;
    m.querySelector('#sharc').innerHTML = `<svg viewBox="0 0 900 120" style="width:100%">${[['ConfigDAI','+ TDM DMA'],['read','altera_data_in[]'],['header ==','0x53594E43 “SYNC”?'],['CALC_SAMPLE_RATE','→ ToneGenInit if fs changed'],['per channel ToneGenEdit','FREQ / LEVEL / ENABLE']].map((t,i)=>`<rect x="${10+i*178}" y="20" width="166" height="44" rx="6" fill="var(--panel2)" stroke="var(--line)"/><text x="${93+i*178}" y="38" text-anchor="middle" font-size="10.5" fill="var(--ink)">${t[0]}</text><text x="${93+i*178}" y="54" text-anchor="middle" font-size="10" fill="var(--ink2)">${t[1]}</text>${i<4?`<line x1="${176+i*178}" y1="42" x2="${188+i*178}" y2="42" stroke="var(--ink2)"/>`:''}`).join('')}
      <text x="10" y="95" font-size="11" fill="var(--ink2)">Interrupt, every sample (${(1e6/lockState().fs).toFixed(2)} µs): SampleIRQ (SIG_SP0) → ToneGen fills 8 output slots → double-buffered TDM → FPGA → AES3 encoders.</text></svg>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__pod33Active = false;
  m.innerHTML = card('What POD33 is up to — findings from the source', `
  <ol><li><b>Artwork 2026|59: front/rear panels now from ${SIM.src('#POD #SERIES/POD33 - #Master/POD33 - #ARTWORK #DA #2016/POD33-FRONT&REAR-SILK (CURVE).cdr', 'POD33-FRONT&REAR-SILK (CURVE).cdr')} (2016-06-20|49).</b> plates POD33-M1 GREEN + M1 WHITE (front) and M2 WHITE (rear) registered on the panel outline, holes and cut-outs taken from the CDR's mechanical outline layer (assets/pod33-front.svg, pod33-rear.svg, pod33-rear-ink.svg). The CDR outline layer shows what the old PDF cut lacked: the two anti-rotation/fixing holes either side of each knob, the rear fixing holes beside AES OUT and the IEC, and that the REF AES 110 Phoenix and the four AES OUT Phoenix blocks share one cut-out size. The rear legend reads 110-230 VAC, 50-60 Hz with no fuse rating. Older sheets not used: POD33 - #Engineering/SILK/POD33-SILK-ISS4.cdr (2010|43) and the live-text POD33-FRONT&amp;REAR-SILK.cdr.</li>
    <li><b>It reboots itself on purpose.</b> After each 40-byte exchange, <span class="mono">ALIGNMENT_CHECK()</span> checks that the FPGA sent “SYNC” back. If it didn't, the code runs <span class="mono">while (error0 == 0) NOP();</span> with no <span class="mono">WDR()</span>. The watchdog (<span class="mono">WDTCR = 0x08</span>, about 14 ms) then resets the ATmega128 and the whole start-up runs again. It's a crude but effective way to recover the MCU–FPGA link. Use “Inject FPGA alignment fault” on the Simulator tab to watch it happen.</li>
    <li><b>A scope trigger built into the main loop.</b> <span class="mono">PORTD |= BIT0</span> before <span class="mono">ALTERA_read_write()</span> and <span class="mono">PORTD &amp;= ~BIT0</span> after it. PD0 is <span class="mono">CS8416_CS2</span>, a chip-select for a second receiver that isn't fitted, so it doubles as a free test point that shows the length of each register transfer.</li>
    <li><b>The main loop follows the video reference.</b> When <span class="mono">LMH1981_VIDEO_DETECT</span> catches VSOUT low, it waits in a loop until vertical sync ends and 11 H lines have been counted. Loop passes that land in vertical sync run longer (orange on the timeline).</li>
    <li><b>A/B adjust is switched off in v102.</b> The manual (27 Sep 2007|40) says turning ADJUST in A/B view changes both channels. In <span class="mono">ENCODER2_UPDATE</span>, the STEREO branches are inside <span class="mono">/* … */</span>, so turning ADJUST does nothing until you pick A or B.</li>
    <li><b>Copy-paste slip.</b> For AES2, AES3 and AES4, <span class="mono">TRANSLATE_ENCODER1</span> saves <span class="mono">channel_select_hold = aes1_parameters.channel_select</span>. When you press both knobs to open Setup, the AES2–4 channel view is restored from AES1's value, not its own.</li>
    <li><b>The manual's timeouts don't match the code.</b> The manual says Setup returns to normal after about 5 s. <span class="mono">NO_ACTIVITY_THRESHOLD</span> went 3000 → 6000 → 50000 passes (the first two are left commented out). In v102 the Setup screen only exits through the Exit screen; the idle counter (≈80 s ${inf}) just resets the channel view to A/B.</li>
    <li><b>0 dBFS is allowed.</b> The manual gives −10 to −60 dBFS. The code's limit is <span class="mono">aes_amplitude_min = AMPLITUDE_0dBFS</span>; the −10 limit is commented out.</li>
    <li><b>The DSP project is named after a meter.</b> The POD33 SHARC build is <span class="mono">slm1-1.dpj</span> and outputs <span class="mono">SLM1-1.ldr</span>. It was cloned from the SLM-1 loudness meter, and SLM VU tables, the phase meter and silence-sensor code are still in the tree.</li>
    <li><b>The 2016|49 v102 change</b> is a new display reset sequence (nRESET/nCE/nWR/nRD/nFL with a delay) and the version string. It was probably needed for a replacement display part ${inf}.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>Main-loop pass ≈ 1.67 ms (${inf}), from the manual's 5 s and the original 3000-pass constant. The real figure depends on display writes and bit-bang timing.</li>
    <li>VSOUT low ≈ 3 lines; boot ≈ 250 ms; AES3 channel-status contents (${inf}).</li>
    <li>Lock and unlock are immediate in the simulation. The firmware counts 25 passes (CS8416) and 1500 passes (video lost) before it reacts.</li>
    <li>Tone output is the ideal ToneGen sine, sampled and held at fs.</li></ul>`) + card('Sources', `<ul class="small mono">
    <li>#POD #SERIES/POD33 - #Master/POD33 - #Engineering/Software/Atmel/v102/pod33v102.c, LMH1981.c, altera.c/.h, cs84xx.h, SIEMENS83.h</li>
    <li>…/Software/Altera/v101/POD33.qsf · …/Software/Sharc/v101/backgnd.c, sample.c, slm1-1.mak</li>
    <li>…/POD33MAN_ROUGH 27Sep07.pdf · …/POD33 operational infoFeb12-08.doc · …/Photos/POD33 Front.jpg, Rear.jpg</li></ul>`);
}

/* ---------------- register plugin ---------------- */
SIM.register({
  footnotes:[{text:"The CorelDRAW outline layer shows two extra fixing holes either side of each knob (SELECT and ADJUST), which the earlier PDF cut did not show.", src:"#POD #SERIES/POD33 - #Master/POD33 - #ARTWORK #DA #2016/POD33-FRONT&REAR-SILK (CURVE).cdr"},
    {text:"The rear has fixing holes beside AES OUT and beside the IEC inlet that carry no legend.", src:"#POD #SERIES/POD33 - #Master/POD33 - #ARTWORK #DA #2016/POD33-FRONT&REAR-SILK (CURVE).cdr"},
    {text:"The REF AES 110 Phoenix and the four AES OUT Phoenix blocks share one cut-out size.", src:"#POD #SERIES/POD33 - #Master/POD33 - #ARTWORK #DA #2016/POD33-FRONT&REAR-SILK (CURVE).cdr"},
    {text:"The rear power legend reads “110-230 VAC, 50-60 Hz” and gives no fuse rating.", src:"#POD #SERIES/POD33 - #Master/POD33 - #ARTWORK #DA #2016/POD33-FRONT&REAR-SILK (CURVE).cdr"},
    {text:"POD33-SILK-ISS4.cdr in the Engineering SILK folder is an older issue (2010|43) than the 2016|49 drafting set.", src:"#POD #SERIES/POD33 - #Master/POD33 - #Engineering/SILK/POD33-SILK-ISS4.cdr"},
    {text:"The drafting set holds a live-text twin, POD33-FRONT&amp;REAR-SILK.cdr, beside the CURVE version (same date).", src:"#POD #SERIES/POD33 - #Master/POD33 - #ARTWORK #DA #2016/POD33-FRONT&REAR-SILK.cdr"}],
  id:'pod33', name:'POD33 · AES DARS generator (2007|40)', duration:1,
  product:'POD33', year:2007, family:'#POD #SERIES',
  folder:'#POD #SERIES/POD33 - #Master',
  summary:'Half-rack DARS generator: four AES tone or word-clock outputs locked to video, AES or an internal 48/96 kHz reference. Three processors: ATmega128 (UI), Cyclone II (clocks, AES encoding), ADSP-21262 (tone generator).',
  highlights:['Interactive front and rear panel','12-step operator tutorial','Knob → firmware → register trace','Self-reboot via the watchdog when the FPGA link fails','AES3 frame down to the bit'],
  depth:'Full model',
  stepUnits:[
    {label:'1 video field', period:()=>VFMT[D.in.vfmt].field},
    {label:'1 MCU loop pass', period:()=>C.LOOP_T},
    {label:'1 AES block (192 frames)', period:()=>192/lockState().fs},
    {label:'1 AES frame (1 sample)', period:()=>1/lockState().fs},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[1001/60000,'1 field (16.7 ms)'],[0.004,'1 AES block (4 ms)'],[1/600,'1 loop pass (1.67 ms)'],[0.0003,'300 µs (H lines)'],[1/48000*4,'4 AES frames (83 µs)']],
  defaultZoom:1,
  init(){ SCHED_KEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the POD33', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewAnatomy},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
