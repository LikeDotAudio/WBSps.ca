/* =====================================================================
   AMS16 — 16-channel audio monitor (Ward-Beck Systems, 2008|41 … 2012|45)
   AMS16A2 2RU (AMS16-2AM, AMS16-2AEM, AMS16-3G). Plugin for ../siumulation.html

   Modelled firmware: the "AMS16-3G v700 October 24 2012" release snapshot
   (AMS16 - #Master/AMS16 - #Engineering/AMS16A - #software/AMS16-3G v700 October 24 2012/):
   - Atmel Main Board/ams16.c      main(), resetAndInit, resetIfNewLock, countLoopsAfterReset,
                                   set1001Flag, writeVideo1Reg, changeInput, port_init, watchdog_init
   - Atmel Main Board/altera.c/.h  ALTERA_SORT (40-byte register block), ALTERA_read_write,
                                   ALTERA_ALIGNMENT_CHECK, AUDIO_SYNC_CHECK, SD_CLOCK_PHASE_CHECK
   - Atmel Main Board/uart0.c/.h   UART0_translate (front-panel frames), UART0_transmit_counter
   - Atmel Main Board/gs2970a.c/.h gs2970AReadVidInfo (GS2970A 3G/HD/SD receiver), altspi.h, common.c
   - Atmel Main Board/dolby.c      DOLBY_DECODER_STATUS, DOLBY_CAT552_AUDIO_ERROR_CHECK
   - Atmel Front Panel/v200w.c     (the shipped copy is RD23's, VersionDis "06AV0000"; the master copy is one save behind)
                                   main loop, TRANSLATE_ENCODER1, LEFT_ENCODER_UPDATE, TRANSLATE_PUSHBUTTONS,
                                   PROCESS_MODE, PROCESS_AUDIO_SOURCE, UPDATE_DISPLAY, ACTIVITY_MONITOR,
                                   UART1_transmit_counter, DATA_initialization, PROCESS_*_INFORMATION
   - Sharc/backgnd.c, sample.c, timer.h, vumeter.asm, rlm24_vu_data.c, volume_data.c, RampAudio.c
   - Altera/AMS16TEST.qsf          FPGA pin numbers and net names (Cyclone IV E EP4CE30F23)
   - AMS16A - #PCB/AMS16A-3-4/AMS163G-ISS7-BOM.xls, AMS16A-5-6-7/AMS16A-5-6-PANEL.bom (parts, 4.9152 MHz)
   - AMS16 - #Manual/AMS16-2AEM/AMS16-2AEM Manual.pdf (rev. Dec 23 2008), AMS16-2AM-V1005-Manual.pdf
   - AMS16 - #ARTWORK #DA #2016/AMS16A2-M1-FRONT-SILK (CURVE).cdr (OCT.27/15) and
     AMS16AQ-3G-M2-SILK (curve).pdf  → assets/ams16-*.png ; Pics/AMS16 Series Front.jpg, AMS16-2AEM Rear.jpg
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const KEYFLAG = '__ams16Active';

/* ---------------- constants from the source ---------------- */
const C = {
  FP_PASS: 15/31752,        // front panel loop pass: SAVE_SETTINGS_CONSTANT 31752 is commented "//15 sec" → 472 µs
  MB_PASS: 0.0025,          // main board loop pass — INFERRED (40-byte bit-bang + GSPI reads at 4.9152 MHz)
  FS: 48000,
  FP_TX_SLOT: 11,           // v200w.c Transmit_Counter 10 → one UART1 byte every 11 passes
  MB_TX_SLOT: 3,            // uart0.h Transmit_Counter 2 → one UART0 byte every 3 passes
  BYTE_T: 10/9600,          // 9600 baud 8N1 (UBRR=0x1F at 4.9152 MHz, uart1_init comment "actual 9600 (0.0%)")
  NO_ACTIVITY: 5000,        // NO_ACTIVITY_THRESHOLD (volume screen); setup uses ×10
  SAVE_PASSES: 31752,       // SAVE_SETTINGS_CONSTANT
  DEBOUNCE: 250,            // PUSHBUTTON_DEBOUNCE passes after release
  MUX_T: 0.001,             // timer.h TIMER_RATE 100000 @ 100 MHz = 1 ms; SetTimer(GP_TIMER1,1)
  VU_TAU: 1/(48000*0.000319752),      // vumeter.asm TCONST_VU          → 65 ms
  PPM_ATT: 1/(48000*0.02276277),      // TCONST_PPM_ATTACK              → 0.92 ms
  PPM_DEC: 1/(48000*0.000031978),     // TCONST_PPM_DECAY               → 0.65 s (6.7 dB/s)
  RAMP_TAU: 1/(48000*0.00199999),     // RampAudio.c RAMP_TC_LEVEL1 per sample → 10.4 ms
  WAIT_IT: 1/700e3,         // common.c waitMillis: 700 wait() iterations per ms
  RESET_INIT: (8*50000 + 50*700)/700e3,   // resetAndInit: 8 × wait(50000) + waitMillis(50) ≈ 0.62 s
  MB_BOOT: (4500+3000+13*50000)/700e3,    // main(): waits before the while(1) ≈ 0.94 s
  FP_SPLASH: 1.0,           // front panel main(): op_line2 "  AMS16 " then wait_ms(500) twice
  INPUT_STABLE: 5,          // uart0.h INPUT_STABLE_COUNT → volume_reset clears on the 7th frame
  LOOPS_CFG: 10, LOOPS_LOCK: 75,       // countLoopsAfterReset
};
const VOL_MAX = 76, VOL_START = 30, GAIN_OFFSET = 61;
const SETUP_MIN = 230, SETUP_MAX = 246;   // EXIT_SYSTEM_SCREEN … AES_BYPASS_SCREEN
const SETUP_NAMES = {230:'EXIT_SYSTEM_SCREEN',231:'VERSION_SCREEN',232:'VOLUME_SETUP_SCREEN',233:'OUTPUT_SCREEN',234:'SPEAKER_SCREEN',235:'CALIBRATION_SCREEN',236:'MONITOR_MODE_SCREEN',237:'ANALOG_OUTPUT1_SCREEN',238:'ANALOG_OUTPUT2_SCREEN',239:'ANALOG_OUTPUT3_SCREEN',240:'ANALOG_OUTPUT4_SCREEN',241:'DOWNMIX_SETUP_SCREEN',242:'SUMMING_SETUP_SCREEN',243:'DOLBY_SETUP_SCREEN',244:'DIALNORM_SETUP_SCREEN',245:'AES8_LTRT_SCREEN',246:'AES_BYPASS_SCREEN'};
const SETUP_SHORT = {230:'Exit',231:'Version',232:'Vol',233:'O/P',234:'Spkr',235:'Cal',236:'Mon',237:'An1',238:'An2',239:'An3',240:'An4',241:'Mlti',242:'Sum',243:'Dlby',244:'Dn',245:'A8',246:'AES'};
const PAIR_BIT = [7,5,3,1,6,4,2,0];   // TRANSLATE_PUSHBUTTONS: pushbuttons1 bit for AES 1…8 (PINB)

/* meter segment thresholds (dB relative to the 0 mark) decoded from rlm24_vu_data1/2 (26 + 16 bits) */
const SEG_TH = [-40.5,-36.5,-32.5,-28.5,-26.5,-24.5,-22.5,-20.5,-18.5,-16.5,-15.5,-14.5,-13.5,-12.5,-11.5,-10.5,-9.5,-8.5,-7.5,-6.5,-5.5,-4.5,-3.5,-2.5,-1.5,-0.5,0.5,1.5,2.5,3.5,4.5,5.5,6.5,7.5,8.5,9.5,10.5,11.5,13.5,15.5,17.5,19.5];
const SEG_T = SEG_TH.map(d=> 39 - 2*d);   // table index i = vu_result − 6 must be ≤ T to light the segment
const SEG_LABEL = SEG_TH.map(d=> Math.round(d+0.5));

/* ---------------- SDI formats (GS2970A standards) ---------------- */
const VFMT = {
  '1080i59.94': {std:'HD', code:2, lines:1125, frame:1001/30000, il:true,  rate:'1.485/1.001 Gb/s', name:'1080i 59.94'},
  '1080i50':    {std:'HD', code:2, lines:1125, frame:1/25,       il:true,  rate:'1.485 Gb/s',       name:'1080i 50'},
  '720p59.94':  {std:'HD', code:2, lines:750,  frame:1001/60000, il:false, rate:'1.485/1.001 Gb/s', name:'720p 59.94'},
  '1080p59.94A':{std:'3GA',code:3, lines:1125, frame:1001/60000, il:false, rate:'2.97/1.001 Gb/s',  name:'1080p 59.94 3G level A'},
  '1080p59.94B':{std:'3GB',code:4, lines:1125, frame:1001/60000, il:false, rate:'2.97/1.001 Gb/s',  name:'1080p 59.94 3G level B'},
  '525i59.94':  {std:'SD', code:1, lines:525,  frame:1001/30000, il:true,  rate:'270 Mb/s',         name:'525i 59.94 (NTSC)'},
  '625i50':     {std:'SD', code:1, lines:625,  frame:1/25,       il:true,  rate:'270 Mb/s',         name:'625i 50 (PAL)'},
};

/* ---------------- test programme on the two SDI inputs (simulation content, not from the archive) -------- */
// kind: pcm | dolbyE | ac3 | none.  lv = peak dBFS, env = tone|prog, corr = L/R correlation
const PROG = {
  1: [ {kind:'pcm', name:'5.1 L / R',   lv:[-14,-15], f:[440,523], env:'prog', corr:0.35},
       {kind:'pcm', name:'5.1 C / LFE', lv:[-16,-24], f:[330,55],  env:'prog', corr:0.1},
       {kind:'pcm', name:'5.1 Ls / Rs', lv:[-22,-23], f:[262,294], env:'prog', corr:0.2},
       {kind:'dolbyE', name:'Dolby E (5.1 + 2)'},
       {kind:'pcm', name:'Stereo mix',  lv:[-12,-13], f:[392,494], env:'prog', corr:0.6},
       {kind:'pcm', name:'Mono (L = R)',lv:[-20,-20], f:[1000,1000], env:'tone', corr:1.0},
       {kind:'pcm', name:'Polarity-reversed tone', lv:[-18,-18], f:[400,400], env:'tone', corr:-1.0},
       {kind:'none', name:'(no group 4)'} ],
  2: [ {kind:'ac3', name:'Dolby Digital (AC-3 5.1)'},
       {kind:'pcm', name:'Line-up tone −20 dBFS', lv:[-20,-20], f:[1000,1000], env:'tone', corr:1.0},
       {kind:'pcm', name:'Stereo programme', lv:[-10,-11], f:[349,440], env:'prog', corr:0.5},
       {kind:'pcm', name:'Commentary L / R', lv:[-17,-26], f:[300,300], env:'prog', corr:0.0},
       {kind:'none'},{kind:'none'},{kind:'none'},{kind:'none'} ],
};
const DECODED = [ // what the CAT552 decoder card puts on meters 1–8 in Dolby mode (manual table 3.1-1); levels INFERRED
  {lv:-16,f:440,env:'prog'},{lv:-17,f:523,env:'prog'},{lv:-15,f:330,env:'prog'},{lv:-26,f:55,env:'prog'},
  {lv:-22,f:262,env:'prog'},{lv:-23,f:294,env:'prog'},{lv:-13,f:392,env:'prog'},{lv:-14,f:494,env:'prog'} ];

/* ---------------- device state ---------------- */
const D = {};
// Front-panel v200w.c copy: 'rd23' = the shipped build (RD23 copy, VersionDis "06AV0000", as on the 30 Oct 2012 test report);
// 'master' = the AMS16 master's copy, one save behind (= RD23's v200w._c backup, VersionDis " 5.0.0.0"). Only VersionDis/InputDis differ.
let FPCOPY = 'rd23';
const VERSION_TXT = ()=> FPCOPY==='rd23' ? '06AV0000' : ' 5.0.0.0';
function defaults(){
  Object.assign(D, {
    power:true, bootAt:-10,
    sdi:{1:{plugged:true, fmt:'1080i59.94'}, 2:{plugged:true, fmt:'525i59.94'}},
    headphones:false,
    // front panel (v200w.c) variables
    input_number:1, preset:1, preset_selector:'LR', preset_monitor_array:Array(8).fill('LR'), monitor:1,
    summing_mode:false, multi_mode:false, dolby_mode:false, aes_button_pressed:false,
    summing_settings:1, dolby_settings:1, cat_select:1,
    volume:VOL_START, mute:false, mute_level:VOL_START,
    screen:'INFORMATION_SCREEN', screen_display:'INFORMATION_SCREEN', setup:231,
    // setup menu (DATA_initialization / declarations)
    volume_setup_level:VOL_START, output:'FIXED', speaker:true, cal_level:41, monitor_mode:0,
    analog_output_selector:[0,0,1,2,3], downmix_setup:1, summing_setup:true, dolby_setup:true,
    dialnorm_settings:1, aes8_ltrt:0, aes_bypass:0,
    data_change:false, firstChangeAt:null, savedAt:null,
    log:[], last:null, held:{in1:false,in2:false},
  });
  D.preset_monitor_array = Array(8).fill('LR');
  METER_KEY = '';
}
let METER_KEY = '';
defaults();

/* ---------------- derived ---------------- */
const calibration = ()=> (D.cal_level-41)*2;            // 0,4,…,20 → SHARC cal (half-dB units)
const refDb = ()=> -20 + calibration()/2;              // the 0 mark, in dBFS (manual: factory −20 dBFS)
const groupStart = ()=> Math.floor((D.downmix_setup+1)/2);   // temp = (downmix_setup+1)/2 → first pair of the 3
const groupMask = ()=>{ const t=groupStart(); return t? ((1<<t)|(1<<(t-1))|(1<<(t+1)))&0xFF : 0; };
function vid(){
  const s = D.sdi[D.input_number];
  if (!s.plugged) return {cd:0, std:0, f:null};
  const f = VFMT[s.fmt]; return {cd:1, std:f.code, f, name:f.name};
}
function inBoot(t){ return t>=D.bootAt && t < D.bootAt + Math.max(C.FP_SPLASH, C.MB_BOOT); }
function pairs(){                     // what the FPGA de-embeds from the selected input
  const v = vid();
  if (!v.cd || v.std===4) return Array(8).fill({kind:'none'});       // 3G level B: VIDEO_1 BIT7 disables audio input
  return PROG[D.input_number];
}
function flags(){                     // altera_data_in[6] (group / pair present) and [8] (Dolby detected)
  const P = pairs(); let lock=0, dd=0;
  P.forEach((p,i)=>{ if (p.kind!=='none') lock|=1<<i; if (p.kind==='dolbyE'||p.kind==='ac3') dd|=1<<i; });
  return {lock, dd};
}
const modeName = ()=> D.dolby_mode?'Dolby': D.multi_mode?'Multi': D.summing_mode?'Summing':'Demux';
/* LED port PORTA = OUTPUT_LEDS(input): bits are active-low lamps (cleared bit = lit) — polarity INFERRED from
   DATA_initialization (input = 0xF7 → INPUT 1 lit) */
function lamps(){
  return { L: D.preset_selector==='L', R: D.preset_selector==='R', multi: D.dolby_mode||D.multi_mode||D.summing_mode,
           in1: D.input_number===1, in2: D.input_number===2 };
}
function inputByte(){ const l=lamps(); let b=0xFF; if(l.L) b&=~1; if(l.R) b&=~2; if(l.multi) b&=~4; if(l.in1) b&=~8; if(l.in2) b&=~16; return b; }

/* ---------------- 8-character display (UPDATE_DISPLAY / PROCESS_MODE / PROCESS_AUDIO_SOURCE) ---------------- */
function pad8(s){ s=String(s).slice(0,8); while(s.length<8) s+=' '; return s; }
function line5(v){ if (v===0) return '  OFF   '; const d=v-61; const s=(d<0?'-':d>0?'+':' ')+String(Math.abs(d)).padStart(2,' '); return pad8('  '+s+' dB'); }
function sourceText(){
  const v=vid(); const std = D.sdi[D.input_number].plugged? VFMT[D.sdi[D.input_number].fmt].code : 0;
  if (!v.cd) return ' No Lock';
  return [' No Lock',' SD-SDI ',' HD-SDI ',' 3GA-SDI',' No Lock'][std];
}
function infoText(){
  if (D.summing_mode) return ' Summing';
  if (D.multi_mode) return ' Multi  ';
  if (D.dolby_mode) return ' Dolby-'+D.cat_select;
  return sourceText();
}
function setupText(){
  const s=D.setup;
  switch(s){
    case 230: return '  Exit  ';
    case 231: return VERSION_TXT();
    case 232: { const d=D.volume_setup_level-61; return pad8('Vol  '+(D.volume_setup_level===0?'OFF':(d<0?'-':'+')+String(Math.abs(d)).padStart(2,'0'))); }
    case 233: return D.output==='FIXED'?'O/P  Fix':'O/P  Var';
    case 234: return D.speaker?'Spkr  On':'Spkr Off';
    case 235: return 'Cal  -'+String(61-D.cal_level);
    case 236: return D.monitor_mode? 'Mon  5.1':'Mon  St ';
    case 237: case 238: case 239: case 240: { const k=s-236, a=D.analog_output_selector[k]; return 'An'+k+(a===8?'  Mon':' Out'+(a+1)); }
    case 241: return D.downmix_setup? pad8('Mlti   '+groupStart()) : 'Mlti No ';
    case 242: return D.summing_setup?'Sum  Yes':'Sum  No ';
    case 243: return D.dolby_setup?'Dlby Yes':'Dlby No ';
    case 244: return D.dialnorm_settings? 'Dn  Dsbd':'Dn  Enbd';     // inverted on purpose in the code (see Findings)
    case 245: return D.aes8_ltrt? 'A8  LtRt':'A8   In8';
    case 246: return D.aes_bypass? 'AES  Dmx':'AES Proc';
  }
  return '        ';
}
function displayAt(t){
  if (!D.power) return '        ';
  if (inBoot(t)) return t < D.bootAt + C.FP_SPLASH ? '  AMS16 ' : sourceText();
  if (D.screen==='SETUP_SCREEN'){
    const L=D.last; if (L && L.setupActivity!==undefined && t >= L.setupActivity + 10*C.NO_ACTIVITY*C.FP_PASS) return infoText();
    return setupText();
  }
  if (D.screen_display==='VOLUME_SCREEN'){
    const L=D.last; const t0 = L && L.volAt!==undefined ? L.volAt : -1e9;
    if (t >= t0 + C.NO_ACTIVITY*C.FP_PASS || t < t0) return infoText();     // ACTIVITY_MONITOR timeout
    return D.mute? '  Mute  ' : line5(D.volume);
  }
  return infoText();
}

/* ---------------- signal model and SHARC meters ---------------- */
function envAmp(spec, t, seed){
  const A = Math.pow(10, spec.lv/20);
  if (spec.env==='tone') return A;
  const g = (0.5+0.5*Math.sin(2*Math.PI*1.3*t+seed)) * (0.55+0.45*Math.sin(2*Math.PI*3.7*t+seed*2.1)) ;
  const burst = 0.5+0.5*Math.sin(2*Math.PI*0.31*t+seed*0.7);
  return A * Math.min(1, 0.18 + 0.82*Math.pow(g,0.7)*(0.6+0.4*burst));
}
/* channel c (0…15): {A: peak amplitude, P: mean-square, kind} as the SHARC sees audio_in_float[c] at time t */
function chanAt(c, t){
  const P = pairs(), p = c>>1, s = c&1;
  if (D.dolby_mode && p<4){
    const pr = P[D.cat_select-1];
    if (!pr || (pr.kind!=='dolbyE' && pr.kind!=='ac3')) return {A:0,P:0,kind:'none'};
    if (pr.kind==='ac3' && c>=6) return {A:0,P:0,kind:'none'};
    const d = DECODED[c]; const A=envAmp(d,t,c*0.9); return {A, P:A*A/2, kind:'pcm'};
  }
  if ((c===14||c===15) && (D.aes8_ltrt && (D.multi_mode||D.dolby_mode) || D.dolby_mode)){   // sample.c: Lt/Rt on meters 15/16
    const lr = ltrt(t); const v = s? lr.R : lr.L; return {A:Math.sqrt(2*v), P:v, kind:'pcm'};
  }
  const pr = P[p];
  if (!pr || pr.kind==='none') return {A:0,P:0,kind:'none'};
  if (pr.kind!=='pcm'){ const n=0.92*(0.97+0.03*Math.sin(t*50+c)); return {A:n, P:n*n*0.36, kind:pr.kind}; }   // compressed bitstream ≈ full-scale noise
  const A = envAmp({lv:pr.lv[s], env:pr.env}, t, p*1.7+s*0.4); return {A, P:A*A/2, kind:'pcm'};
}
function ltrt(t){               // Lt = L + .707C − .707Ls − .707Rs ; Rt = R + .707C + .707Ls + .707Rs (powers added)
  const i = D.dolby_mode? 0 : (groupStart()-1)*2; if (i<0) return {L:0,R:0};
  const pw = k=>{ if (D.dolby_mode){ const P=pairs()[D.cat_select-1]; if(!P||P.kind==='none') return 0; const d=DECODED[k]; const A=envAmp(d,t,k*0.9); return A*A/2; }
    const pr=pairs()[(i+k)>>1]; if(!pr||pr.kind!=='pcm') return 0; const A=envAmp({lv:pr.lv[(i+k)&1],env:pr.env},t,((i+k)>>1)*1.7+((i+k)&1)*0.4); return A*A/2; };
  if (!D.dolby_mode && (flags().dd & groupMask())) return {L:0,R:0};       // Dolby inside the group → Lt = Rt = 0
  return { L: pw(0)+0.5*pw(2)+0.5*pw(4)+0.5*pw(5), R: pw(1)+0.5*pw(2)+0.5*pw(4)+0.5*pw(5) };
}
/* VU (mean-square, τ 65 ms) and PPM (attack 0.92 ms, decay 0.65 s) for all 16 channels, 1 ms grid from −1 s to +1 s */
let METER = null;
function meterKey(){ return JSON.stringify([D.power,D.input_number,D.sdi,D.dolby_mode,D.multi_mode,D.cat_select,D.aes8_ltrt,D.downmix_setup]); }
function meters(){
  const k = meterKey(); if (k===METER_KEY && METER) return METER;
  METER_KEY = k; const dt=0.001, N=2001; const vu=[], pk=[];
  const aV = 1-Math.exp(-dt/C.VU_TAU), aA = 1-Math.exp(-dt/C.PPM_ATT), dD = Math.exp(-dt/C.PPM_DEC);
  for (let c=0;c<16;c++){ const V=new Float32Array(N), K=new Float32Array(N); let ms=1e-13, pp=1e-13;
    for (let n=0;n<N;n++){ const t=-1+n*dt; const s=chanAt(c,t); ms += (s.P-ms)*aV; const ip=s.A*s.A; if (ip>pp) pp += (ip-pp)*aA; else pp*=dD; V[n]=ms; K[n]=pp; }
    vu.push(V); pk.push(K); }
  METER = {vu, pk, dt}; return METER;
}
function meterAt(c, t){
  const M=meters(); const n=Math.max(0,Math.min(2000,Math.round((t+1)/M.dt)));
  const vdb = 10*Math.log10(M.vu[c][n]+1e-13), pdb = 10*Math.log10(M.pk[c][n]+1e-13);
  const cal = calibration();
  const vi = Math.max(6, Math.min(255, Math.round(-2*vdb)+cal)) - 6;     // VUMeterGet → max(min(vu+cal,255),6) − 6
  const pi = Math.max(2, Math.min(255, Math.round(-2*pdb)+cal)) - 6;
  let nV=0; for (let k=0;k<42;k++) if (vi<=SEG_T[k]) nV=k+1;
  let dot=0; for (let k=0;k<42;k++) if (pi<=SEG_T[k]) dot=k+1;
  return {vdb, pdb, vi, pi, nV, dot};
}
/* speaker sum (sample.c): selected pairs (altera_data_in[3] = input_tally) summed, Dolby pairs muted, solo copies */
function speakerAt(t){
  const P=pairs(), F=flags(); let L=0,R=0; const mon=D.monitor;
  const useLtRt = (D.multi_mode||D.dolby_mode) && mon===groupMaskFor();
  if (useLtRt){ const lr=ltrt(t); L=lr.L; R=lr.R; }
  else for (let p=0;p<8;p++) if (mon&(1<<p)){
    if (!D.dolby_mode && (F.dd&(1<<p))) continue;
    L+=chanAt(2*p,t).P; R+=chanAt(2*p+1,t).P; }
  if (D.preset_selector==='L') R=L; else if (D.preset_selector==='R') L=R;
  return {L,R};
}
const groupMaskFor = ()=> D.dolby_mode? 0x07 : groupMask();
function volGain(v){ return v===0? 0 : Math.pow(10, (Math.min(v,76)-61)/20); }
function speakerMuted(){ return !D.speaker || D.headphones || !vid().cd || D.mute; }
/* correlation display: get_phase_data → 15-step thermometer; PhaseMeterGet 0…255 scaling INFERRED */
function corrNow(){
  const P=pairs(); const m=D.monitor;
  if (D.summing_mode){ let s=0,n=0; for(let p=0;p<8;p++) if(m&(1<<p)&&P[p].kind==='pcm'){ s+=P[p].corr; n++; } return n? s/n : 0; }
  if (m===0x07) return P[0].kind==='pcm'? P[0].corr : 0;
  const single=[1,2,4,8,16,32,64,128].indexOf(m);
  if (single<0) return null;                    // tally like 0x0E matches no case → phase_result_select keeps its old value
  const pr=P[single]; return pr.kind==='pcm'? pr.corr : 0;
}
function phaseLeds(){ const c=corrNow(); const r = c===null? 128 : Math.round((c+1)/2*255); const n = Math.min(15, Math.max(1, 15 - Math.floor(r/17))); return {n, r, stale:c===null}; }

/* ---------------- timing schedules ---------------- */
const FRAME = { GENERAL:{bytes:36, name:'GENERAL_COM'}, VOLUME:{bytes:12, name:'VOLUME_COM'}, SETUP:{bytes:21, name:'SETUP_COM'} };
const SLOT = C.FP_TX_SLOT*C.FP_PASS;
function frameLen(type){ return (FRAME[type].bytes+1)*SLOT; }
/* UART1 frames front panel → main board across the second (plus a margin) */
function fpFrames(){
  const out=[]; let t=0; const L=D.last;
  while (t < 1.25){
    let type='GENERAL';
    if (L && t>=L.frameAfter){ if (L.comm==='VOLUME' && t < L.t + C.NO_ACTIVITY*C.FP_PASS) type='VOLUME'; else if (L.comm==='SETUP' && D.screen==='SETUP_SCREEN') type='SETUP'; }
    const len=frameLen(type); out.push({t0:t, t1:t+len, type}); t+=len;
  }
  return out;
}
function frameAt(t){ const fs=fpFrames(); for (const f of fs) if (t>=f.t0 && t<f.t1) return f; return fs[fs.length-1]; }
/* main board passes; a resetAndInit (new SDI lock) blocks the loop for ≈ 0.62 s */
function mbStall(){ const L=D.last; return L && L.relockAt!==undefined ? {t0:L.relockAt, t1:L.relockAt + C.RESET_INIT} : null; }
function mbPassAt(t){
  const st=mbStall(); if (st && t>=st.t0 && t<st.t1) return {i:-1, t0:st.t0, t1:st.t1, stall:true};
  let base=0, i0=0; if (st && t>=st.t1){ base=st.t1; i0=Math.floor(st.t0/C.MB_PASS)+1; }
  const i=Math.floor((t-base)/C.MB_PASS); return {i:i0+i, t0:base+i*C.MB_PASS, t1:base+(i+1)*C.MB_PASS, afterReset:i, stall:false};
}
const MB_STEPS = [
  ['WDR · isAlteraReady()', .01, 'PIND bit 6 = FPGA CONF_DONE; if low, fpgaReprogrammed = YES'],
  ['UART0_translate · UART0_transmit_counter', .03, 'Parse one received byte; send one reply byte every 3rd pass'],
  ['gs2970AReadVidInfo', .14, 'GSPI reads of GS2970A regs 0x22, 0x06, 0x07 → CD, standard, format, 1001'],
  ['resetIfNewLock · countLoopsAfterReset', .02, 'New lock after NO_LOCK → resetAndInit(); pass 10 → payload ID, VIDEO_1, regs 0x12/0x13'],
  ['UART0_translate · UART0_transmit_counter', .03, 'Second chance per pass to parse / send'],
  ['ALTERA_SORT', .06, 'Pack the 40-byte register block (sync "SYNC", volume, tally, modes, analog routing)'],
  ['ALTERA_read_write', .52, 'Bit-bang 40 bytes out and in on PC7 FSYNCH / PD3 CLOCK / PB5 WRITE / PC6 READ'],
  ['ALTERA_ALIGNMENT_CHECK · AUDIO_SYNC_CHECK · SD_CLOCK_PHASE_CHECK', .04, 'Echoed "SYNC"? TDM audio sync? (only error1 acts: SHARC_RESET)'],
  ['DOLBY_DECODER_STATUS · DOLBY_CAT552_AUDIO_ERROR_CHECK / RESET_COUNTER', .03, 'CAT552 decoder card present / audio error'],
  ['changeInput() · set1001Flag()', .12, 'SDI_SEL via ALTERA_REG_VIDEO_1 BIT6; GS2970A reg 0x22 BIT13 → FPGA_MODE 0x00/0x10 every pass'],
];
const MB_FRAC = (()=>{ let a=0; return MB_STEPS.map(s=>{ const r=a; a+=s[1]; return r; }); })();
const FP_STEPS = [
  ['WDR · SWITCH_ENCODER1 · SHAFT_ENCODER1', .10, 'VOLUME knob push switch (PINE bit 2) and quadrature (PINF bits 0–1)'],
  ['PROCESS_PUSHBUTTONS · TRANSLATE_PUSHBUTTONS', .18, 'Read PINB (pair buttons), PIND (INPUT 1/2, MULTI), PINE (SOLO L/R); act once per press'],
  ['LEFT_ENCODER_UPDATE · RIGHT_ENCODER_UPDATE', .08, 'Knob rotation: volume, or the setup value'],
  ['ACTIVITY_MONITOR', .06, 'Time-outs: volume screen 5000 passes, setup 50000 passes'],
  ['UPDATE_DISPLAY', .30, 'PROCESS_MODE / PROCESS_AUDIO_SOURCE → SIEMENS8_lcd_display (PDSP1884) when refresh'],
  ['COMMUNICATION_MONITOR', .04, 'Watch for replies from the main board'],
  ['UART1_setup · UART1_transmit_counter · UART1_translate', .12, 'One byte every 11 passes to the main board; parse its reply'],
  ['change detection · SAVE_MODE_IN_EEPROM', .12, 'data_change → save after 31752 passes (≈15 s), outside setup'],
];
const FP_FRAC = (()=>{ let a=0; return FP_STEPS.map(s=>{ const r=a; a+=s[1]; return r; }); })();
function stepIn(steps, frac, rel){ let k=0; for (let j=0;j<steps.length;j++) if (rel>=frac[j]) k=j; return k; }
function fpStepAt(t){ const i=Math.floor(t/C.FP_PASS); return {i, k:stepIn(FP_STEPS,FP_FRAC,(t/C.FP_PASS)-i)}; }
function mbStepAt(t){ const p=mbPassAt(t); if (p.stall) return {p, k:-1}; return {p, k:stepIn(MB_STEPS,MB_FRAC,(t-p.t0)/C.MB_PASS)}; }

/* SHARC display multiplex: mux_count 7…0, one row per 1 ms timer tick (backgnd.c) */
function muxAt(t){ const tick=Math.floor(t/C.MUX_T); const row = 7 - (tick % 8); const scan=Math.floor(tick/8); return {tick, row, scan, lampSlot: row===7 && scan%4===0}; }
function meterRow(c){ let k=c; if (c===10) k=12; else if (c===12) k=10; else if (c===11) k=13; else if (c===13) k=11; return k%8; }   // swap 10↔12, 11↔13

/* ================================================================
   USER ACTIONS — what the buttons do in the code
   Every action records the firmware path and a propagation pipeline:
   front-panel pass → display/lamps → UART1 frame → main board → FPGA → SHARC.
   ================================================================ */
function nextFpPass(t){ return Math.ceil(t/C.FP_PASS)*C.FP_PASS; }
function nextMbAfter(t){ let p=mbPassAt(t); if (p.stall) return p.t1; return p.t1; }
/* byte index of a field inside its frame (0 = '#') */
const FIELD = { GENERAL:{monitor:16, selector:17, preset:19, speaker:21, cal:23, multi:25, summing:26, dolby:27, downmix:28, input:7, vol:9, end:35},
                VOLUME:{vol:2, input:10, end:11}, SETUP:{cal:16, end:20} };
function pipeline(tA, what){
  const P=[]; const add=(t,who,txt)=>P.push({t,who,txt});
  add(tA,'operator', what.label);
  const p0 = nextFpPass(tA) + C.FP_PASS*(what.knob? FP_FRAC[0] : FP_FRAC[1]);
  add(p0,'front MCU', what.knob? 'SWITCH_ENCODER1 / SHAFT_ENCODER1 sees the knob (PINE bit 2 / PINF)' : 'PROCESS_PUSHBUTTONS reads the pin → TRANSLATE_PUSHBUTTONS');
  const pd = Math.floor(p0/C.FP_PASS)*C.FP_PASS + C.FP_PASS*FP_FRAC[4];
  add(pd,'display','UPDATE_DISPLAY → SIEMENS8_lcd_display("'+what.disp+'")');
  if (what.lamps) add(p0+5e-6,'lamps','PB_LEDS = OUTPUT_LEDS(input, 0xFF) → PORTA = 0x'+inputByte().toString(16).toUpperCase());
  if (!what.field){ return P; }
  // the frame in progress finishes first; the next frame carries the change
  const fs = fpFrames(); let cur = fs.find(f=>p0>=f.t0 && p0<f.t1) || fs[0];
  let fr = fs[fs.indexOf(cur)+1] || cur;
  const type = fr.type; const idx = (FIELD[type]||FIELD.GENERAL)[what.field] ?? FIELD[type].end;
  const tb = fr.t0 + idx*SLOT; const tEnd = fr.t0 + FIELD[type].end*SLOT + C.BYTE_T;
  add(fr.t0,'UART1','new '+FRAME[type].name+' frame starts ("#"), one byte every '+SSIM(SLOT));
  add(tb + C.BYTE_T,'UART1','byte '+idx+' ('+what.field+') arrives at the main board (9600 baud)');
  add(tEnd,'UART1','"$" arrives → uart_sort_data0 = YES');
  let tm = nextMbAfter(tEnd) + C.MB_PASS*MB_FRAC[1];
  add(tm,'main MCU','UART0_translate sorts rx_buffer → '+what.mbVar);
  const tw = Math.floor(tm/C.MB_PASS)*C.MB_PASS + C.MB_PASS*(MB_FRAC[6]+MB_STEPS[6][1]);
  add(tw,'main MCU','ALTERA_SORT → ALTERA_read_write: '+what.reg);
  add(tw+1/C.FS,'FPGA→SHARC','altera_data_in[] refreshed by SPORT5 DMA on the next sample (≤ 20.8 µs)');
  if (what.sharc) add(tw+1/C.FS+2e-6,'SHARC',what.sharc);
  if (what.ramp) add(tw+1/C.FS+3*C.RAMP_TAU,'SHARC','RampAudioCalc: speaker_gain within 5 % of target (3 τ = '+SSIM(3*C.RAMP_TAU)+')');
  if (what.tally){ let t=tw+1/C.FS; let m=muxAt(t); let n=0; while(!(m.lampSlot) && n<64){ t=(m.tick+1)*C.MUX_T; m=muxAt(t); n++; }
    add(t,'LED board','refresh(): pb1_4 / pb5_8 tally bits shifted on mux row 7 (pb_dim slot) → pair lamp lit'); }
  if (what.input){
    add(tw+0.0002,'main MCU','input != pInput → changeInput(): alteraSpiWrite(ALTERA_REG_VIDEO_1, BIT6 only)');
    add(tw+0.0003,'main MCU','volume_reset = YES → ALTERA_BUFFER_out[5] = 0 (speakers silent)');
    const tl = tw + 0.030;   // GS2970A relock time — INFERRED
    add(tl,'GS2970A', vid().cd? 'locks to the new input (reg 0x22 bit 12) — relock time inferred' : 'no carrier: CD = NO_LOCK, speakers muted');
    if (vid().cd){ const tr = nextMbAfter(tl); add(tr,'main MCU','resetIfNewLock: pCD == NO_LOCK → resetAndInit() blocks the loop ≈ '+SSIM(C.RESET_INIT));
      add(tr+C.RESET_INIT + 10*C.MB_PASS,'main MCU','countLoopsAfterReset pass 10: gs2970ASetPayloadID, set1001Flag, writeVideo1Reg, writeReg1213');
      what._relock = tr; }
    const unm = fr.t0 + (C.INPUT_STABLE+2)*frameLen('GENERAL');
    add(unm,'main MCU','input_stable_checker > INPUT_STABLE_COUNT → volume_reset = NO (audio back)');
  }
  return P;
}
function SSIM(d){ return SIM.fmtDur(d); }
function act(name, fn, meta){
  const tr=[]; const t=s=>tr.push(s); const g0=gainTarget(); const r0=D.last&&D.last.muteTo!==undefined? {a:D.last.muteFrom,b:D.last.muteTo}:null;
  if (!D.power){ t('Unit is off — nothing happens.'); }
  else fn(t);
  meta = meta||{};
  const entry = {t:SIM.t, name, trace:tr, disp:null};
  if (D.power && meta.pipe!==false){
    meta.label=name; meta.disp = (D.screen==='SETUP_SCREEN'? setupText() : D.screen_display==='VOLUME_SCREEN'? (D.mute?'  Mute  ':line5(D.volume)) : infoText()).trim();
    const L = { t:SIM.t, comm: meta.comm||'GENERAL' };
    L.frameAfter = (fpFrames().find(f=>SIM.t>=f.t0 && SIM.t<f.t1)||{t1:0}).t1;
    if (meta.comm==='VOLUME') L.volAt = SIM.t;
    if (D.screen==='SETUP_SCREEN') L.setupActivity = SIM.t;
    D.last = L;
    entry.pipe = pipeline(SIM.t, meta);
    if (meta._relock!==undefined){ L.relockAt = meta._relock; }
    const sh = entry.pipe.find(x=>x.who==='FPGA→SHARC');
    L.g0 = g0; L.g1 = gainTarget(); L.tg = sh? sh.t : SIM.t;
    if (meta.input && sh){ L.muteFrom = sh.t; const u=entry.pipe.find(x=>/volume_reset = NO/.test(x.txt)); L.muteTo = u? u.t : sh.t; }
    else if (r0){ L.muteFrom=r0.a; L.muteTo=r0.b; }
    if (meta.saves){ D.data_change=true; if (D.firstChangeAt===null) D.firstChangeAt=SIM.t; }
  }
  entry.disp = displayAt(SIM.t+0.001);
  D.log.unshift(entry); if (D.log.length>60) D.log.length=60;
  SIM.refresh();
}
function resetSoloArray(t){
  // if ((downmix_setup != 0) || (summing_setup != NO) || (dolby_setup != NO)) → all pairs back to L+R
  if (D.downmix_setup||D.summing_setup||D.dolby_setup){ D.preset_monitor_array.fill('LR'); D.preset_selector='LR'; t&&t('preset_monitor_array[0…7] = LEFT_AND_RIGHT; preset_selector = LEFT_AND_RIGHT'); }
}
const A = {
  pair(p){ // p = 1…8
    act(`Press monitor-select button ${p}`, t=>{
      if (D.screen==='SETUP_SCREEN'){ t('TRANSLATE_PUSHBUTTONS is skipped while screen == SETUP_SCREEN — no effect'); return; }
      t(`PROCESS_PUSHBUTTONS: pushbuttons1 = INVERT_DATA(PINB) → bit ${PAIR_BIT[p-1]} set (AES ${p}); TRANSLATE_SWITCHES → pb = YES, input_refresh = YES`);
      t('TRANSLATE_PUSHBUTTONS: screen = INFORMATION_SCREEN; aes_button_pressed = YES; refresh = YES');
      const bit=1<<(p-1);
      if (!D.summing_mode && !D.multi_mode && !D.dolby_mode){
        D.monitor=bit; D.preset=p; D.preset_selector=D.preset_monitor_array[p-1];
        t(`Demux: monitor = 0x${bit.toString(16).padStart(2,'0')}; preset = '${p}'; preset_selector = preset_monitor_array[${p-1}] = ${selName(D.preset_selector)} (each pair remembers its own solo)`);
      } else if (D.summing_mode){
        D.monitor ^= bit; D.summing_settings=D.monitor;
        t(`Summing: monitor ^= 0x${bit.toString(16).padStart(2,'0')} → 0x${D.monitor.toString(16).padStart(2,'0')}; summing_settings = monitor`);
        t('sample.c adds every selected pair into Lsum / Rsum (Dolby pairs are muted, not summed)');
      } else {
        const grp = groupMaskFor(), inG = (grp&bit)!==0;
        if (inG && D.preset===p){ D.preset=0; D.monitor=grp; D.preset_selector='LR'; t(`${D.dolby_mode?'Dolby':'Multi'}: second press on pair ${p} → preset = NO0, monitor = 0x${grp.toString(16).padStart(2,'0')} (the whole 3-pair group: Lt/Rt to the speakers)`); }
        else { D.monitor=bit; D.preset=p; t(`${D.dolby_mode?'Dolby':'Multi'}: monitor = 0x${bit.toString(16).padStart(2,'0')}, preset = '${p}' (one pair on the speakers; the AES 2–8 branches are assumed to follow the AES 1 code ${'— '}see notes)`); }
      }
      t(`UART1 GENERAL_COM: 'G' monitor&0x0F, preset_selector · 'P' preset · 'M' (monitor&0xF0)|summing_mode → main board input_monitor → ALTERA_BUFFER_out[14] input_selector, [15] input_tally`);
    }, {field:'monitor', mbVar:'input_monitor, channel_monitor, inputs_selected', reg:'out[14] input_selector, out[15] input_tally', sharc:'altera_data_in[3] tally → Lsum/Rsum switch to the new pair; get_phase_data picks phase_results[]', tally:true, lamps:false, saves:false});
  },
  solo(side){ // 'L' | 'R'
    act(`Press SOLO ${side}`, t=>{
      if (D.screen==='SETUP_SCREEN'){ t('Ignored in setup (TRANSLATE_PUSHBUTTONS not run)'); return; }
      t(`pushbuttons3 = INVERT_DATA(PINE) → BIT${side==='L'?5:3} (${side==='L'?'LEFT':'RIGHT'} ONLY)`);
      if ((D.multi_mode||D.dolby_mode) && D.monitor===groupMaskFor()){ t(`${modeName()} with the whole group selected: (monitor & group) == group → the solo branch is skipped`); return; }
      const want = side==='L'?'L':'R';
      D.preset_selector = D.preset_selector===want? 'LR' : want;
      t(`preset_selector ${D.preset_selector==='LR'?'back to LEFT_AND_RIGHT':'= '+(side==='L'?'LEFT':'RIGHT')}; input ${side==='L'?'BIT0':'BIT1'} ${D.preset_selector==='LR'?'set (lamp off)':'cleared (lamp on)'}`);
      if (!D.summing_mode && !D.multi_mode && D.preset>0){ D.preset_monitor_array[D.preset-1]=D.preset_selector; t(`preset_monitor_array[${D.preset-1}] = ${selName(D.preset_selector)} (remembered for this pair)`); }
      t('UART1 byte 17 = preset_selector → main board channel_monitor → ALTERA_BUFFER_out[10] → SHARC: Rspkr = Lspkr (L) or Lspkr = Rspkr (R)');
    }, {field:'selector', mbVar:'channel_monitor', reg:'out[10] channel_monitor', sharc:'channel_monitor 0/1 → mono L or R on speakers and MONITOR BNCs', lamps:true});
  },
  multi(){
    act('Press MULTI', t=>{
      if (D.screen==='SETUP_SCREEN'){ t('Ignored in setup'); return; }
      t('pushbuttons2 = INVERT_DATA(PIND) → BIT4 (MULTI) → TRANSLATE_PUSHBUTTONS //MULTI');
      const from=modeName();
      if (D.dolby_mode){ resetSoloArray(t);
        if (D.downmix_setup){ D.multi_mode=true; D.dolby_mode=false; D.monitor=groupMask(); D.preset=0; t(`dolby_mode → multi_mode (downmix_setup ≠ 0): monitor = group 0x${D.monitor.toString(16).padStart(2,'0')}`); }
        else if (D.summing_setup){ D.summing_mode=true; D.dolby_mode=false; D.monitor=D.summing_settings; t('dolby_mode → summing_mode: monitor = summing_settings'); }
        else { D.dolby_mode=false; D.preset=D.dolby_settings; D.monitor=1<<(D.preset-1); t('dolby_mode → demux: preset = dolby_settings'); }
      } else if (D.summing_mode){ resetSoloArray(t); D.summing_settings=D.monitor; D.summing_mode=false; D.preset=D.dolby_settings; D.monitor=1<<(D.preset-1);
        t(`summing_mode → demux: summing_settings = monitor; preset = dolby_settings ('${D.preset}'); monitor = 1 << (preset − '1')`);
      } else if (D.multi_mode){ resetSoloArray(t);
        if (D.summing_setup){ D.multi_mode=false; D.summing_mode=true; D.monitor=D.summing_settings; t('multi_mode → summing_mode: monitor = summing_settings'); }
        else { D.multi_mode=false; D.preset=D.dolby_settings; D.monitor=1<<(D.preset-1); t('multi_mode → demux'); }
      } else {
        if (D.dolby_setup){ resetSoloArray(t); D.dolby_mode=true; if (D.aes_button_pressed) D.dolby_settings=D.preset; else D.preset=D.dolby_settings; D.cat_select=D.dolby_settings;
          t(`demux → dolby_mode (dolby_setup = YES): ${D.aes_button_pressed?'aes_button_pressed → dolby_settings = preset':'preset = dolby_settings'}; cat_select = '${D.cat_select}'`);
          t(`main board: inputs_selected = (cat_select−'0')<<4 | preset | BIT7 → ALTERA_SORT: cat_select = ((inputs_selected & 0x70) >> 4) − 1 | BIT7 → CAT552 decodes pair ${D.cat_select}`);
          const pr=pairs()[D.cat_select-1]; if (!pr || (pr.kind!=='dolbyE'&&pr.kind!=='ac3')) t(`Pair ${D.cat_select} carries ${pr&&pr.kind!=='none'?'PCM':'nothing'}: the decoder has no bitstream — select the DD pair first (manual 3.1.1)`);
          D.monitor = 0x07; D.preset=0;
        } else if (D.downmix_setup){ resetSoloArray(t); D.multi_mode=true; D.dolby_settings=D.preset; D.monitor=groupMask(); D.preset=0; t('demux → multi_mode: dolby_settings = preset; preset = temp+0x30; preset = NO0 (the first assignment is dead)'); }
        else if (D.summing_setup){ resetSoloArray(t); D.summing_mode=true; D.monitor=D.summing_settings; D.dolby_settings=D.preset; t('demux → summing_mode'); }
        else { t('No mode is enabled in setup: MULTI just re-selects demux'); }
      }
      D.aes_button_pressed=false;
      t(`${from} → ${modeName()}; input BIT2 ${modeName()==='Demux'?'set (MULTI lamp off)':'cleared (MULTI lamp on)'}; display “${infoText()}”`);
      t('UART1 GENERAL_COM: M multi_mode, summing_mode, dolby_mode, downmix_setup−1 → main board raw_multi_mode / summing_mode / dolby_mode → ALTERA_BUFFER_out[8,9,12,13,16–19]');
    }, {field:'multi', mbVar:'raw_multi_mode, summing_mode, dolby_mode', reg:'out[8] raw_multi_mode, out[9] summing, out[12] multi_mode|BIT7, out[13] cat_select|downmix<<3|dialnorm<<4, out[17] aes8_ltrt|monitor_mode', sharc:'Lt/Rt (sample.c) and muting change on the next sample', tally:true, lamps:true});
  },
  input(n){
    act(`Press INPUT ${n}`, t=>{
      if (D.screen==='SETUP_SCREEN'){ t('Ignored in setup'); return; }
      t(`pushbuttons2 = INVERT_DATA(PIND) → BIT${n===1?1:0} (SDI ${n})`);
      t('screen = SOURCE_SCREEN; refresh = YES');
      if (D.input_number===n){ t(`input_number is already '${n}' — nothing else happens`); return; }
      t('source_change = YES; summing_mode = NO; then if (dolby_mode==NO && summing_mode==NO && multi_mode==NO) dolby_settings = preset — summing_mode was cleared one line earlier');
      if (!D.dolby_mode && !D.multi_mode) D.dolby_settings = D.preset||D.dolby_settings;
      D.summing_mode=false; D.multi_mode=false; D.dolby_mode=false; D.preset=1; D.monitor=1; D.preset_monitor_array.fill('LR'); D.preset_selector='LR';
      D.input_number=n;
      t(`preset = '1'; dolby/multi/summing = 0; monitor = 0x01; preset_monitor_array cleared; input ${n===1?'|= BIT4, &= ~BIT3':'|= BIT3, &= ~BIT4'}; input_number = '${n}'`);
      t(`Display “${sourceText()}” (PROCESS_AUDIO_SOURCE, sdi_format from the main board's 'S' reply)`);
    }, {field:'input', mbVar:'input = rx_buffer[6] (≠ previous → volume_reset = YES)', reg:'ALTERA_REG_VIDEO_1 BIT6 = SDI_SEL (via altspi), out[5] = 0', sharc:'speaker_gain_target = volume[0] = 0 → ramps to silence', lamps:true, input:true, tally:true});
  },
  volTurn(dir){
    act(`Turn VOLUME ${dir>0?'clockwise':'counter-clockwise'}`, t=>{
      t(`SHAFT_ENCODER1 → TRANSLATE_SHAFT_ENCODER1 (PINF bits 0–1) → encoder_action1 = ${dir>0?'UP':'DOWN'} → LEFT_ENCODER_UPDATE`);
      if (D.screen==='SETUP_SCREEN'){ setupTurn(dir,t); return; }
      D.screen_display='VOLUME_SCREEN';
      t('Not in setup → "RIGHT ENCODER is a volume controller": screen_display = VOLUME_SCREEN; activity_counter = 0');
      if (D.mute){ D.mute=false; D.volume=D.mute_level; t(`mute == YES → mute = NO; volume = mute_level (${D.volume})`); }
      const o=D.volume; D.volume = Math.max(0, Math.min(VOL_MAX, D.volume+(dir>0?1:-1)));
      t(`volume ${o} → ${D.volume} (0 = OFF, 1 = −60 dB … 61 = 0 dB … 76 = +15 dB; Volume_Max 76, no wrap)`);
      t(`UPDATE_DISPLAY: PROCESS_VOLUME_INFORMATION → line5 “${line5(D.volume)}”; output ${D.output} → ext_volume = ${D.output==='FIXED'?'GAIN_OFFSET (61, 0 dB)':'volume'}`);
      t('UART1 switches to VOLUME_COM frames: # F hhh ttt ooo  eee … E source input $ (12 bytes)');
    }, D.screen==='SETUP_SCREEN'? {knob:true, field:'cal', comm:'SETUP', mbVar:'(setup values travel in SETUP_COM / GENERAL_COM)', reg:'out[11] calibration_data, out[13], out[17–19]', saves:true}
                                 : {knob:true, field:'vol', comm:'VOLUME', mbVar:'volume_level = h*100+t*10+o, ext_volume_level', reg:'out[5] volume_level, out[6] ext_volume_level', sharc:'refresh_data: speaker_gain_target = volume[out5]', ramp:true});
  },
  volPress(){
    const setupCombo = D.held.in1 && D.held.in2;
    act(setupCombo? 'Hold INPUT 1 + INPUT 2 and press VOLUME' : 'Press VOLUME', t=>{
      t('SWITCH_ENCODER1: READ_ENCODER1 (PINE bit 2) low → TRANSLATE_ENCODER1, switch1 = 1');
      if (setupCombo){
        t('(pushbuttons2 & SETUP_SEQUENCE 0x03) == 0x03 → both INPUT buttons are held');
        D.screen='SETUP_SCREEN'; D.screen_display='SETUP_SCREEN'; D.setup=231;
        t('screen = SETUP_SCREEN; system_setup = SETUP_SCREEN; setup = VERSION_SCREEN; PROCESS_SETUP_SOURCES(); SIEMENS8_lcd_display(VersionDis) → “'+VERSION_TXT()+'”');
        t('communication_mode = SETUP_SCREEN → UART1 sends SETUP_COM frames (# L dim M mode O output I ref S speaker N monitor Y cal Q dialnorm $)');
        return;
      }
      if (D.screen==='SETUP_SCREEN'){
        const o=D.setup; D.setup = D.setup===SETUP_MAX? SETUP_MIN : D.setup+1;
        t(`screen == SETUP_SCREEN: activity_counter = 0; setup ${SETUP_NAMES[o]} → ${SETUP_NAMES[D.setup]} (setup == setup_max → setup_min)`);
        t(`Display “${setupText()}”`);
        return;
      }
      D.screen_display='VOLUME_SCREEN';
      if (!D.mute){ D.mute=true; if (D.volume<VOL_MAX+1) D.mute_level=D.volume; t(`mute = YES; mute_level = volume (${D.mute_level}); volume = 255; SIEMENS8_lcd_display(mute_temp) → “  Mute  ”`); }
      else { D.mute=false; D.volume=D.mute_level; t(`mute = NO; volume = mute_level (${D.volume}) → “${line5(D.volume)}”`); }
      t('UART1 VOLUME_COM: while mute == YES the volume digits are sent as "FFF" → main board volume_level = 0 → SHARC volume[0] = 0.0');
    }, setupCombo? {knob:true, comm:'SETUP', field:null}
       : D.screen==='SETUP_SCREEN'? {knob:true, comm:'SETUP', field:null}
       : {knob:true, field:'vol', comm:'VOLUME', mbVar:'volume_level = 0 ("FFF")', reg:'out[5] volume_level', sharc:'speaker_gain ramps to 0', ramp:true});
  },
  hold(which, on){ D.held[which]=on; SIM.refresh(); },
  setupCombo(){ // hold both input buttons, then press VOLUME
    if (D.screen!=='SETUP_SCREEN'){
      // pressing both INPUT buttons first runs both SDI branches (SDI 2 then SDI 1)
      const was=D.input_number;
      if (was!==1) A.input(1);
    }
    D.held.in1=D.held.in2=true; A.volPress(); D.held.in1=D.held.in2=false; SIM.refresh();
  },
  plug(n){ act(`${D.sdi[n].plugged?'Unplug':'Plug in'} SDI IN${n}`, t=>{
      D.sdi[n].plugged=!D.sdi[n].plugged;
      t(`GS2984 cable equaliser CBL${n}_EQ_CD_N ${D.sdi[n].plugged?'asserts carrier':'loses carrier'}`);
      if (D.input_number===n){
        t(`gs2970AReadVidInfo: reg 0x22 bit 12 (locked) = ${D.sdi[n].plugged?1:0} → CD = ${D.sdi[n].plugged?'LOCK':'NO_LOCK'}`);
        if (D.sdi[n].plugged) t('resetIfNewLock: pCD == NO_LOCK and CD changed → resetAndInit() (FPGA core + SerDes reset, ≈0.62 s with the loop blocked)');
        else t('ALTERA_SORT: CD == NO_LOCK → MUTE_SPEAKERS (PB4); every ERR LED lights (altera_data_in[6] = 0); display “ No Lock”');
      } else t('Not the selected input — only the loop-through equaliser notices');
    }, {pipe:false}); },
  setFmt(n,f){ act(`SDI IN${n} format → ${VFMT[f].name}`, t=>{ D.sdi[n].fmt=f; const v=VFMT[f];
      t(`GS2970A reg 0x22 RATE_SEL → standard ${['LOCK_NONE','LOCK_SD','LOCK_HD','LOCK_3GA','LOCK_3GB'][v.code]}; reg 0x06 format`);
      if (v.code===4) t('3G level B: writeVideo1Reg sets VIDEO_1 BIT7 ("active high disables audio input"); front panel shows “ No Lock” (Adam Add in PROCESS_AUDIO_SOURCE)');
      if (v.code===3) t('3G level A: writeVideo1Reg sets BIT4 (3G); gs2970ASetPayloadID writes SMPTE 352M bytes');
      if (v.code===1) t('SD: writeVideo1Reg sets BIT0 (sd_hd)');
    }, {pipe:false}); },
  headphones(){ act(D.headphones?'Unplug headset':'Plug in headset', t=>{ D.headphones=!D.headphones; t('Hardware: the headset jack switch mutes the internal speakers (manual 2.3.8); no firmware involved'); }, {pipe:false}); },
  power(){ D.power=!D.power; if (D.power){ D.bootAt=SIM.t; D.screen='INFORMATION_SCREEN'; D.screen_display='INFORMATION_SCREEN'; D.mute=false; D.volume=D.volume_setup_level; }
    act(D.power?'Power on':'Power off', t=>{ if(D.power){
      t('Front panel main(): initialization → SIEMENS8_lcd_display(op_line2) “  AMS16 ”; wait_ms(500) ×2; RECALL_MODE_FROM_EEPROM; DATA_initialization; volume = volume_setup_level');
      t(`Main board main(): port_init, watchdog_init (WDTCR prescaler 110 ≈ 0.9 s), uart0_init; CAT_RESET; SHARC_RESET; GLOBAL_RESET pulse; initAlteraSpi; GS2970/GS2962 out of reset; gs2970AInit → while(1) after ≈ ${SSIM(C.MB_BOOT)}`);
      t('SHARC: PLL ×16, InitDAI, TimerInit (1 ms), SampleInit (3 TDM pairs, 10 slots each) → meters start from VUMETER_RESET_VALUE'); } }, {pipe:false}); },
  reset(){ defaults(); SIM.refresh(); },
};
function gainTarget(){ return (!D.power || speakerMuted())? 0 : volGain(D.volume); }
function gainAt(t){
  const L=D.last; if (!L || L.tg===undefined) return gainTarget();
  let g = t < L.tg ? L.g0 : L.g1 + (L.g0-L.g1)*Math.exp(-(t-L.tg)/C.RAMP_TAU);
  if (L.muteTo!==undefined && t>=L.muteFrom && t<L.muteTo) g = 0;
  else if (L.muteTo!==undefined && t>=L.muteTo) g = gainTarget()*(1-Math.exp(-(t-L.muteTo)/C.RAMP_TAU));
  return g;
}
function selName(s){ return s==='L'?'LEFT':s==='R'?'RIGHT':'LEFT_AND_RIGHT'; }
function setupTurn(dir, t){
  const s=D.setup; t(`screen == SETUP_SCREEN → LEFT_ENCODER_UPDATE setup branch for ${SETUP_NAMES[s]}`);
  switch(s){
    case 230: D.screen='INFORMATION_SCREEN'; D.screen_display='INFORMATION_SCREEN';
      t('EXIT_SYSTEM_SCREEN: any rotation leaves setup → screen = INFORMATION_SCREEN; SIEMENS8_lcd_display(information or mode_display)');
      if (D.dolby_mode && !D.dolby_setup){ D.dolby_mode=false; D.preset=D.dolby_settings; D.monitor=1<<(D.preset-1); t('dolby_mode but dolby_setup now NO → back to demux'); }
      if (D.summing_mode && !D.summing_setup){ D.summing_mode=false; D.preset=D.dolby_settings; D.monitor=1<<(D.preset-1); t('summing disabled → demux'); }
      if (D.multi_mode){ if (!D.downmix_setup){ D.multi_mode=false; D.preset=D.dolby_settings; D.monitor=1<<(D.preset-1); t('Mlti No → demux'); } else { D.monitor=groupMask(); t('multi_mode stays: monitor = new group'); } }
      return;
    case 231: t('VERSION_SCREEN: rotation does nothing'); return;
    case 232: D.volume_setup_level=Math.max(0,Math.min(VOL_MAX,D.volume_setup_level+dir)); t(`volume_setup_level = ${D.volume_setup_level} (power-up volume)`); break;
    case 233: D.output = D.output==='FIXED'?'VARIABLE':'FIXED'; t(`output = ${D.output} (FIXED → ext_volume = GAIN_OFFSET 61 = 0 dB on AES/analog outputs)`); break;
    case 234: D.speaker=!D.speaker; t(`speaker = ${D.speaker?'ON':'OFF'} → 'S' byte → main board speaker_mute = INVERT_DATA(rx) & BIT0 → MUTE_SPEAKERS (PB4)`); break;
    case 235: D.cal_level = Math.max(41, Math.min(51, D.cal_level + 2*dir)); t(`cal_level ${D.cal_level} (CAL_MIN 41 … CAL_MAX 51, step 2) → calibration = ${calibration()} → SHARC cal = altera_data_in[2] & 0x1F adds ${calibration()} half-dB → 0 mark = ${refDb()} dBFS`); break;
    case 236: D.monitor_mode = D.monitor_mode?0:1; t(`monitor_mode = ${D.monitor_mode?'1 (5.1)':'ST'} → out[17] bit 0; sample.c 5.1 monitor branch`); break;
    case 237: case 238: case 239: case 240: { const k=s-236; D.analog_output_selector[k]=Math.max(0,Math.min(8,D.analog_output_selector[k]+dir)); t(`analog_output_selector[${k}] = ${D.analog_output_selector[k]} (${D.analog_output_selector[k]===8?'Mon':'Out'+(D.analog_output_selector[k]+1)}) → 'N' bytes → out[18]/[19]`); break; }
    case 241: { const o=D.downmix_setup; if (dir>0) D.downmix_setup = o>=11?11: o<1? o+1 : o+2; else D.downmix_setup = o<=0?0: o<=1? o-1 : o-2; t(`downmix_setup ${o} → ${D.downmix_setup} (0, 1, 3, 5 … 11 → group start pair ${groupStart()||'off'})`); break; }
    case 242: D.summing_setup=!D.summing_setup; t(`summing_setup = ${D.summing_setup?'YES':'NO'}`); break;
    case 243: D.dolby_setup=!D.dolby_setup; t(`dolby_setup = ${D.dolby_setup?'YES':'NO'}`); break;
    case 244: D.dialnorm_settings = D.dialnorm_settings?0:1; t(`dialnorm_settings = ${D.dialnorm_settings?'YES':'NO'} → shows “${setupText()}” (YES displays Dsbd, NO displays Enbd); ALTERA_SORT zeroes volume and mutes until the next frame because pdialnorm_settings ≠ dialnorm_settings`); break;
    case 245: D.aes8_ltrt=D.aes8_ltrt?0:1; t(`aes8_ltrt = ${D.aes8_ltrt} → out[17] bit 1 (only in Dolby or Multi) → sample.c puts Lt/Rt on meters 15/16 and AES 8`); break;
    case 246: D.aes_bypass=D.aes_bypass?0:1; t(`aes_bypass = ${D.aes_bypass} → out[17] bit 2 (only in demux without summing) → AES 1–8 = ${D.aes_bypass?'raw de-embedded (Dmx)':'processed (Proc)'}`); break;
  }
  t(`Display “${setupText()}”; activity_counter = 0`);
}

/* ================================================================
   DRAWING: front panel and rear panel on the real silkscreen
   Front: AMS16A2-M1-FRONT-SILK (CURVE).cdr (OCT.27/15): GREEN and WHITE separations cut at 200 dpi
   between the crop marks (3447 × 681 px = the 2RU panel face). Outlines that appear in BOTH
   separations (speaker grilles, windows, drill crosshairs, screws) are the mechanical cut-outs and
   were split into ams16-front-cut.png. Control centres are the crosshair centres measured in that layer;
   the meter bars, pair buttons and DD/ERR LEDs inside the lens window are measured from
   ARTWORK #DA #2016/Pics/AMS16 Series Front.jpg (scale 1.905 px/px from the button crosshairs).
   Rear: AMS16AQ-3G-M2-SILK (curve).pdf WHITE (3447 × 680 px); connector centres from the silk labels and
   Pics/AMS16-2AEM Rear.jpg.
   ================================================================ */
const BAR_X = c=> 913 + 70.3*c;
const PAIR_X = j=> 948 + 140.6*j;
function segY(n){ return n<=26 ? 460 - (n-0.5)*8.42 : 241 - (n-26-0.5)*12.06; }
function segH(n){ return n<=26 ? 6.2 : 8.6; }
function segCol(n){ return n<=17? '#39d353' : n<=33? '#ffc634' : '#ff3b30'; }
const SCALE_SHOW = new Set([20,16,12,10,8,6,4,2,0,-2,-4,-6,-8,-10,-12,-14,-16,-20,-24,-28,-36]);
function frontSVG(t, opts){
  opts=opts||{};
  const on = D.power && !inBoot(t+0) || (D.power && t>=D.bootAt+C.MB_BOOT);
  const lit = D.power && !(t>=D.bootAt && t<D.bootAt+C.MB_BOOT);
  const F = flags(); const lp = lamps(); const mux = muxAt(t);
  let s = `<svg viewBox="0 0 3447 681" role="img" aria-label="AMS16A2 front panel (real silkscreen)" style="width:100%;display:block;border-radius:6px">
  <defs><filter id="a16glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <radialGradient id="a16cap" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#e8e8e6"/><stop offset="1" stop-color="#9a9b9c"/></radialGradient>
  <radialGradient id="a16lamp" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#fff2ef"/><stop offset=".35" stop-color="#ff4a3a"/><stop offset="1" stop-color="#a01208"/></radialGradient></defs>
  <rect width="3447" height="681" fill="#141517"/>
  <image href="${ASSET}ams16-front-cut.png" width="3447" height="681"/>
  <rect x="885" y="8" width="1127" height="663" fill="#070808" stroke="#2a2c2e" stroke-width="3"/>
  <rect x="2229" y="77" width="240" height="73" fill="#050605" stroke="#2a2c2e" stroke-width="2"/>
  <rect x="2164" y="183" width="370" height="101" fill="#040504" stroke="#2a2c2e" stroke-width="2"/>`;
  // scale columns between pairs (lens print, INFERRED placement from the manual's front-panel figure and the photo)
  for (let k=0;k<7;k++){ const x=(BAR_X(2*k+1)+BAR_X(2*k+2))/2;
    for (let n=1;n<=42;n++){ const lb=SEG_LABEL[n-1]; if (!SCALE_SHOW.has(lb)) continue; if (lb===-20 && n!==8) continue;
      s+=`<text x="${x.toFixed(1)}" y="${(segY(n)+5).toFixed(1)}" font-size="15" fill="#c9cbc6" text-anchor="middle" font-family="Arial">${Math.abs(lb)}</text>`; }
    s+=`<line x1="${x-20}" y1="${segY(26)-5}" x2="${x+20}" y2="${segY(26)-5}" stroke="#c9cbc6" stroke-width="2"/>`; }
  // bars
  for (let c=0;c<16;c++){
    const m = lit? meterAt(c,t) : {nV:0,dot:0}; const x=BAR_X(c)-12;
    for (let n=1;n<=42;n++){ const isOn = n<=m.nV || n===m.dot; const y=segY(n)-segH(n)/2;
      s+=`<rect x="${x}" y="${y.toFixed(1)}" width="24" height="${segH(n)}" rx="1.5" fill="${isOn?segCol(n):'#1d1f1d'}"${isOn&&opts.glow!==false?' opacity="1"':''}/>`; }
    s+=`<text x="${BAR_X(c)}" y="560" font-size="17" fill="#c9cbc6" text-anchor="middle" font-family="Arial">${c+1}</text>`;
  }
  // DD (yellow) and ERR (red) LEDs per pair; driven by the SHARC from altera_data_in[6]/[8]
  for (let j=0;j<8;j++){ const x=PAIR_X(j); const err = lit && !(F.lock&(1<<j)); const dd = lit && (F.lock&(1<<j)) && (F.dd&(1<<j));
    s+=`<rect x="${x-15}" y="486" width="30" height="13" rx="3" fill="${dd?'#ffd23a':'#2a2618'}" ${dd?'filter="url(#a16glow)"':''}/><text x="${x}" y="514" font-size="13" fill="#c9cbc6" text-anchor="middle" font-family="Arial">DD</text>
        <rect x="${x-15}" y="522" width="30" height="13" rx="3" fill="${err?'#ff3a2c':'#2a1a18'}" ${err?'filter="url(#a16glow)"':''}/><text x="${x}" y="551" font-size="13" fill="#c9cbc6" text-anchor="middle" font-family="Arial">ERR</text>`;
    const tl = lit && (D.monitor & (1<<j));
    s+=`<g class="a16pb" data-p="${j+1}" style="cursor:pointer"><circle cx="${x}" cy="603" r="36" fill="transparent"/><circle cx="${x}" cy="603" r="27" fill="#1a1b1c" stroke="#3a3c3e" stroke-width="3"/>
        <circle cx="${x}" cy="603" r="20" fill="${tl?'url(#a16lamp)':'#5a1e1a'}" ${tl?'filter="url(#a16glow)"':''}/><title>Monitor select ${j+1} (AES pair ${j+1}: meters ${2*j+1}/${2*j+2})</title></g>`;
  }
  // correlation meter: 15 LEDs in the +1 0 −1 window
  const ph = lit? phaseLeds() : {n:0};
  for (let k=0;k<15;k++){ const x=2244+k*15.1; const on_=k<ph.n; s+=`<rect x="${x.toFixed(1)}" y="104" width="10" height="16" rx="2" fill="${on_?'#7dff6a':'#132012'}"/>`; }
  // 8-character PDSP1884 display
  const txt = displayAt(t);
  s+=`<g filter="url(#a16glow)">${SIM.dotMatrix(txt, 2191, 212, 6.5, '#b6ff5a', 'rgba(140,200,90,.07)')}</g>`;
  // round buttons with lamps
  const btn=(cx,cy,cls,litB,title)=>`<g class="${cls}" style="cursor:pointer"><circle cx="${cx}" cy="${cy}" r="46" fill="transparent"/><circle cx="${cx}" cy="${cy}" r="38" fill="#2a2b2c" stroke="#555" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="29" fill="${litB&&lit?'url(#a16lamp)':'url(#a16cap)'}" ${litB&&lit?'filter="url(#a16glow)"':''}/><title>${title}</title></g>`;
  s+=btn(2080,308,'a16sl',lp.L,'SOLO L') + btn(2080,448,'a16sr',lp.R,'SOLO R') + btn(2140,604,'a16mu',lp.multi,'MULTI') + btn(2280,604,'a16i1',lp.in1,'INPUT 1') + btn(2419,604,'a16i2',lp.in2,'INPUT 2');
  // VOLUME knob: pointer angle follows the volume value (ENCODER, so it is only cosmetic)
  const ang = -135 + 270*(D.mute?D.mute_level:D.volume)/VOL_MAX;
  s+=`<g class="a16knob" style="cursor:pointer"><circle cx="2350" cy="378" r="62" fill="transparent"/><circle cx="2350" cy="378" r="46" fill="#0d0e0f" stroke="#333" stroke-width="3"/><circle cx="2350" cy="378" r="38" fill="#1b1c1e"/>
     <line x1="2350" y1="378" x2="${(2350+34*Math.sin(ang*Math.PI/180)).toFixed(1)}" y2="${(378-34*Math.cos(ang*Math.PI/180)).toFixed(1)}" stroke="#ddd" stroke-width="5" stroke-linecap="round"/><title>VOLUME: click left half = turn CCW, right half = CW, centre = press (mute / setup); wheel turns</title></g>`;
  // headset jack
  s+=`<g class="a16hp" style="cursor:pointer"><circle cx="2916" cy="135" r="34" fill="#2a2b2c" stroke="#888" stroke-width="4"/><circle cx="2916" cy="135" r="14" fill="#050505"/>${D.headphones?'<rect x="2902" y="135" width="28" height="200" rx="10" fill="#222" stroke="#555"/>':''}<title>Headset jack (plugging in mutes the speakers)</title></g>`;
  s+=`<image href="${ASSET}ams16-front-green.png" width="3447" height="681"/><image href="${ASSET}ams16-front-white.png" width="3447" height="681"/>`;
  if (opts.hot) s+=opts.hot;
  s+=`</svg>`;
  return s;
}
const AES_X = k=> 2464 + 127*k, SDI_X = [1813,1963,2112,2263];
function rearSVG(){
  const bnc=(x,y,cls,title,conn,col)=>`<g ${cls?`class="${cls}" style="cursor:pointer"`:''}><circle cx="${x}" cy="${y}" r="44" fill="${col||'#b9b3a4'}" stroke="#5d5848" stroke-width="3"/><circle cx="${x}" cy="${y}" r="27" fill="#e9e5d8"/><circle cx="${x}" cy="${y}" r="9" fill="#7a6a3a"/>
     ${conn?`<rect x="${x-18}" y="${y+30}" width="36" height="${680-y-30}" fill="#2b5f9e"/><rect x="${x-30}" y="${y+12}" width="60" height="44" rx="8" fill="#3a74b8"/>`:''}<title>${title}</title></g>`;
  let s=`<svg viewBox="0 0 3447 680" role="img" aria-label="AMS16-3G rear panel (real silkscreen)" style="width:100%;display:block;border-radius:6px">
    <rect width="3447" height="680" fill="#141517"/>
    <rect x="85" y="394" width="212" height="238" rx="10" fill="#0b0b0c" stroke="#444" stroke-width="3"/><rect x="120" y="420" width="142" height="100" rx="8" fill="#1d1d1f"/>${[150,191,232].map((x,i)=>`<rect x="${x-6}" y="${i===1?440:455}" width="12" height="${i===1?30:40}" fill="#b8b8b0"/>`).join('')}
    <g class="a16pwr" style="cursor:pointer"><rect x="85" y="394" width="212" height="238" fill="transparent"/><title>IEC inlet — click to power ${D.power?'off':'on'}</title></g>
    <path d="M1873 128 h326 l-16 96 h-294 z" fill="#8f9295" stroke="#55595c" stroke-width="3"/><circle cx="1846" cy="174" r="14" fill="#9a9a9a"/><circle cx="2226" cy="174" r="14" fill="#9a9a9a"/>
    <path d="M2446 134 h150 l-10 80 h-130 z" fill="#8f9295" stroke="#55595c" stroke-width="3"/><circle cx="2422" cy="174" r="13" fill="#9a9a9a"/><circle cx="2620" cy="174" r="13" fill="#9a9a9a"/>`;
  s+= bnc(SDI_X[0],583,'a16j1','SDI IN1 — click to '+(D.sdi[1].plugged?'unplug':'plug in'),D.sdi[1].plugged,'#c9a43a') + bnc(SDI_X[1],583,'a16j2','SDI IN2 — click to '+(D.sdi[2].plugged?'unplug':'plug in'),D.sdi[2].plugged,'#c9a43a')
     + bnc(SDI_X[2],583,'','SDI OUT1: reclocked copy of IN'+D.input_number+' (GS2962)',false,'#c9a43a') + bnc(SDI_X[3],583,'','SDI OUT2: reclocked copy of IN'+D.input_number,false,'#c9a43a');
  const P=pairs();
  for (let k=0;k<4;k++){ s+=bnc(AES_X(k),426,'',`AES ${k+1} OUT: ${P[k].kind==='none'?'no data (ERR)':(P[k].name||P[k].kind)}${D.aes_bypass?' (Dmx copy)':' (Proc)'}`); s+=bnc(AES_X(k),558,'',`AES ${k+5} OUT: ${(k===3 && D.aes8_ltrt && (D.multi_mode||D.dolby_mode))?'Lt/Rt downmix (A8 LtRt)':(P[k+4].kind==='none'?'no data':(P[k+4].name||P[k+4].kind))}`); }
  s+=bnc(2971,426,'','MONITOR 1 (AES of the selected / summed pair)') + bnc(2971,558,'','MONITOR 2');
  s+=`<image href="${ASSET}ams16-rear-white.png" width="3447" height="680"/></svg>`;
  return s;
}
function bindPanel(root){
  const q=(sel,fn)=>root.querySelectorAll(sel).forEach(g=>g.addEventListener('click',fn));
  root.querySelectorAll('.a16pb').forEach(g=>g.addEventListener('click',()=>A.pair(+g.dataset.p)));
  q('.a16sl',()=>A.solo('L')); q('.a16sr',()=>A.solo('R')); q('.a16mu',()=>A.multi());
  q('.a16i1',()=>A.input(1)); q('.a16i2',()=>A.input(2)); q('.a16hp',()=>A.headphones());
  q('.a16j1',()=>A.plug(1)); q('.a16j2',()=>A.plug(2)); q('.a16pwr',()=>A.power());
  root.querySelectorAll('.a16knob').forEach(g=>{
    g.addEventListener('click',e=>{ const r=g.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width; if (x<0.36) A.volTurn(-1); else if (x>0.64) A.volTurn(1); else A.volPress(); });
    g.addEventListener('wheel',e=>{ e.preventDefault(); A.volTurn(e.deltaY<0?1:-1); },{passive:false});
  });
}
function controlsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin-top:6px">
    <span class="small muted">Pairs</span>${[1,2,3,4,5,6,7,8].map(p=>`<button data-a16="p${p}">${p}</button>`).join('')}
    <span class="small muted" style="margin-left:8px">SOLO</span><button data-a16="sl">L</button><button data-a16="sr">R</button>
    <button data-a16="mu" style="margin-left:8px">MULTI</button><button data-a16="i1">INPUT 1</button><button data-a16="i2">INPUT 2</button>
    <span class="small muted" style="margin-left:8px">VOLUME</span><button data-a16="vl">⟲</button><button data-a16="vp">press</button><button data-a16="vr">⟳</button>
    <button data-a16="su" title="Hold INPUT 1 + INPUT 2 and press VOLUME (manual 4.1)">Setup combo</button></div>
    <div class="small muted" style="margin-top:4px">Keys: 1–8 pairs · L / R solo · M multi · Z / X input 1 / 2 · A / S / D volume ⟲ press ⟳ · U setup combo. Click the panel too: left/right half of the knob turns it, its centre presses it; the rear SDI IN BNCs plug and unplug; the IEC inlet switches the power.</div>`;
}
function bindControls(root){
  const m={sl:()=>A.solo('L'),sr:()=>A.solo('R'),mu:()=>A.multi(),i1:()=>A.input(1),i2:()=>A.input(2),vl:()=>A.volTurn(-1),vp:()=>A.volPress(),vr:()=>A.volTurn(1),su:()=>A.setupCombo()};
  root.querySelectorAll('[data-a16]').forEach(b=>b.onclick=()=>{ const k=b.dataset.a16; if (k[0]==='p') A.pair(+k.slice(1)); else m[k](); });
}
document.addEventListener('keydown', e=>{
  if (!window[KEYFLAG] || (e.target.matches && e.target.matches('input,select,textarea')) || e.ctrlKey || e.metaKey || e.altKey) return;
  const k=e.key.toLowerCase();
  const m={l:()=>A.solo('L'),r:()=>A.solo('R'),m:()=>A.multi(),z:()=>A.input(1),x:()=>A.input(2),a:()=>A.volTurn(-1),s:()=>A.volPress(),d:()=>A.volTurn(1),u:()=>A.setupCombo()};
  if (/^[1-8]$/.test(k)){ A.pair(+k); e.preventDefault(); } else if (m[k]){ m[k](); e.preventDefault(); }
});

/* ---------------- timeline lanes ---------------- */
function txtLane(c,X,t0,y,h,msg){ c.fillStyle=SIM.css('--ink2'); c.font='11px '+SIM.css('--sans'); c.fillText(msg, X(t0)+6, y+h/2+4); }
function lanes(){
  const css=n=>SIM.css(n); const v=vid(); const ls=[];
  const selPair = Math.max(0,[1,2,4,8,16,32,64,128].indexOf(D.monitor));
  ls.push({label:`SDI IN${D.input_number}: frames / lines`, h:28, draw(c,X,t0,t1,y,h){
    if (!v.cd){ txtLane(c,X,t0,y,h,'no lock (GS2970A reg 0x22 bit 12 = 0)'); return; }
    const f=v.f, H=f.frame/f.lines, span=t1-t0;
    if (span < 60*H) SIM.pulses(c,X,t0,t1,y+h*0.5,h*0.5,H,0,H*0.12,css('--ink2'),'lines (EAV/SAV)');
    SIM.pulses(c,X,t0,t1,y,h*(span<60*H?0.5:1),f.il?f.frame/2:f.frame,0,H*20,css('--accent2'),f.il?'fields':'frames');
  }});
  ls.push({label:'Embedded audio 48 kHz (HANC packets)', h:22, draw(c,X,t0,t1,y,h){ if(!v.cd||v.std===4){ txtLane(c,X,t0,y,h, v.std===4?'3G level B: audio input disabled (VIDEO_1 BIT7)':'—'); return; } SIM.pulses(c,X,t0,t1,y,h,1/C.FS,0,2e-6,css('--accent'),'audio samples per channel'); }});
  ls.push({label:'SHARC SampleIRQ (SPORT1, 20 TDM slots)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/C.FS,1.5e-6,6e-6,css('--warn'),'SampleIRQ: VUMeterCalc, PhaseMeterCalc, Lsum/Rsum, Lt/Rt'); }});
  ls.push({label:'SHARC LED mux row (1 ms timer)', h:26, draw(c,X,t0,t1,y,h){
    const n0=Math.floor(t0/C.MUX_T), n1=Math.ceil(t1/C.MUX_T); const pxPer=X(t0+C.MUX_T)-X(t0);
    if (pxPer<1.2){ c.fillStyle=css('--accent2'); c.globalAlpha=.3; c.fillRect(X(t0),y+6,X(t1)-X(t0),h-12); c.globalAlpha=1; txtLane(c,X,t0,y,h,`${n1-n0} refresh() calls (rows 7…0, full scan every 8 ms)`); return; }
    for (let n=n0;n<n1;n++){ const row=7-(n%8); c.fillStyle= row===7? css('--warn') : css('--accent2'); c.globalAlpha= .25+0.08*row; c.fillRect(X(n*C.MUX_T),y+4,Math.max(1,pxPer-1),h-8); c.globalAlpha=1;
      if (pxPer>26){ c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText('row '+row, X(n*C.MUX_T)+3, y+h/2+4); } }
  }});
  ls.push({label:'Pair-button lamp slot (row 7, 1 scan in 4)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,0.032,0,0.001,css('--bad'),'pb_dim lamp slots'); }});
  ls.push({label:'Front-panel ATmega128 loop (472 µs)', h:30, draw(c,X,t0,t1,y,h){
    const px=X(t0+C.FP_PASS)-X(t0);
    if (px<2.5){ c.fillStyle=css('--accent'); c.globalAlpha=.35; c.fillRect(X(t0),y+5,X(t1)-X(t0),h-10); c.globalAlpha=1; txtLane(c,X,t0,y,h,`${Math.round((t1-t0)/C.FP_PASS).toLocaleString()} passes (SAVE_SETTINGS_CONSTANT 31752 = "15 sec")`); return; }
    const i0=Math.floor(t0/C.FP_PASS), i1=Math.ceil(t1/C.FP_PASS);
    for (let i=i0;i<i1;i++){ const a=i*C.FP_PASS;
      if (px>80){ FP_STEPS.forEach((st,j)=>{ const xa=X(a+FP_FRAC[j]*C.FP_PASS), xb=X(a+(FP_FRAC[j]+st[1])*C.FP_PASS); c.fillStyle= j===4? css('--accent2'): j===6? css('--warn') : css('--accent'); c.globalAlpha=j%2?.5:.8; c.fillRect(xa,y+4,Math.max(1,xb-xa-1),h-8); c.globalAlpha=1; if (xb-xa>70){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(st[0].split(' · ')[0].slice(0,24), xa+3, y+h/2+3);} }); }
      else { c.fillStyle= i%2? css('--accent'):css('--accent2'); c.globalAlpha=.7; c.fillRect(X(a),y+4,Math.max(1,px-1),h-8); c.globalAlpha=1; }
    }
  }});
  ls.push({label:'UART1 front → main (9600 Bd)', h:30, draw(c,X,t0,t1,y,h){
    const fs=fpFrames(); const pxSlot=X(t0+SLOT)-X(t0);
    for (const f of fs){ if (f.t1<t0||f.t0>t1) continue; const n=FRAME[f.type].bytes;
      c.fillStyle= f.type==='VOLUME'? css('--warn') : f.type==='SETUP'? css('--bad') : css('--accent2');
      if (pxSlot<3){ c.globalAlpha=.45; c.fillRect(X(f.t0),y+4,Math.max(1,X(f.t1)-X(f.t0)-1),h-8); c.globalAlpha=1; if (X(f.t1)-X(f.t0)>60){ c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText(FRAME[f.type].name+' '+n+' B', X(f.t0)+3, y+h/2+4);} }
      else for (let b=0;b<n;b++){ const a=f.t0+b*SLOT; c.globalAlpha=.85; c.fillRect(X(a),y+5,Math.max(1,X(a+C.BYTE_T)-X(a)),h-10); c.globalAlpha=1; if (pxSlot>18){ c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText(b===0?'#':b===n-1?'$':String(b), X(a)+1, y+h-1); c.fillStyle= f.type==='VOLUME'? css('--warn') : f.type==='SETUP'? css('--bad') : css('--accent2'); } }
    }
  }});
  ls.push({label:'Main-board ATmega128 loop', h:30, draw(c,X,t0,t1,y,h){
    const st=mbStall(); if (st && st.t1>t0 && st.t0<t1){ c.fillStyle=css('--bad'); c.globalAlpha=.5; c.fillRect(X(st.t0),y+3,X(st.t1)-X(st.t0),h-6); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px sans-serif'; c.fillText('resetAndInit(): wait(50000) ×8 — loop blocked', Math.max(X(st.t0),X(t0))+4, y+h/2+4); }
    const px=X(t0+C.MB_PASS)-X(t0);
    if (px<2.5){ c.fillStyle=css('--accent'); c.globalAlpha=.3; c.fillRect(X(t0),y+8,X(t1)-X(t0),h-16); c.globalAlpha=1; txtLane(c,X,t0,y,h,`≈${Math.round((t1-t0)/C.MB_PASS)} passes of ≈2.5 ms (inferred)`); return; }
    let t=t0; let guard=0;
    while (t<t1 && guard++<4000){ const p=mbPassAt(t); if (p.stall){ t=p.t1; continue; }
      if (px>90){ MB_STEPS.forEach((s_,j)=>{ const a=p.t0+MB_FRAC[j]*C.MB_PASS, b=a+s_[1]*C.MB_PASS; c.fillStyle= j===6? css('--accent2'): j===2? css('--warn'): css('--accent'); c.globalAlpha=j%2?.5:.8; c.fillRect(X(a),y+4,Math.max(1,X(b)-X(a)-1),h-8); c.globalAlpha=1; if (X(b)-X(a)>70){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(s_[0].split(' · ')[0].slice(0,24), X(a)+3, y+h/2+3);} }); }
      else { c.fillStyle=p.i%2?css('--accent'):css('--accent2'); c.globalAlpha=.7; c.fillRect(X(p.t0),y+4,Math.max(1,X(p.t1)-X(p.t0)-1),h-8); c.globalAlpha=1; }
      t=p.t1+1e-12; }
  }});
  ls.push({label:'UART0 main → front (1 byte / 3 passes)', h:20, draw(c,X,t0,t1,y,h){
    const per=C.MB_TX_SLOT*C.MB_PASS; SIM.pulses(c,X,t0,t1,y,h,per,0,C.BYTE_T,css('--accent'),'reply bytes (# A Dformat B … S sdi_format $)'); }});
  ls.push({label:'Last action → propagation', h:34, draw(c,X,t0,t1,y,h){
    const e=D.log.find(x=>x.pipe); if (!e){ txtLane(c,X,t0,y,h,'Press a button or turn the knob: each step of its journey appears here'); return; }
    const who=['operator','front MCU','display','lamps','UART1','main MCU','GS2970A','FPGA→SHARC','SHARC','LED board'];
    e.pipe.forEach(p=>{ if (p.t<t0||p.t>t1) return; const k=who.indexOf(p.who); const x=X(p.t); c.fillStyle= p.who==='operator'? css('--play') : p.who==='SHARC'||p.who==='LED board'? css('--warn') : css('--accent2');
      c.beginPath(); c.arc(x, y+6+(k%4)*7, 3.5, 0, 7); c.fill(); });
    const first=e.pipe[0], last=e.pipe[e.pipe.length-1]; c.strokeStyle=css('--ink2'); c.beginPath(); c.moveTo(X(first.t),y+h-4); c.lineTo(X(Math.min(last.t,t1+1)),y+h-4); c.stroke();
  }});
  ls.push({label:`Meter ${2*selPair+1} (pair ${selPair+1} L): VU — / PPM ·`, h:44, draw(c,X,t0,t1,y,h){
    const ch=2*selPair; const N=Math.min(500,Math.max(60,Math.floor(X(t1)-X(t0)))); const ref=refDb();
    const Y=db=> y+h-3 - Math.max(0,Math.min(1,(db-(ref-40))/60))*(h-6);
    c.strokeStyle=css('--grid'); c.beginPath(); c.moveTo(X(t0),Y(ref)); c.lineTo(X(t1),Y(ref)); c.stroke();
    c.strokeStyle=css('--accent'); c.lineWidth=1.5; c.beginPath();
    for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N; const m=meterAt(ch,tt); const yy=Y(m.vdb+3.01); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); c.lineWidth=1;
    c.fillStyle=css('--bad'); for (let i=0;i<=N;i+=3){ const tt=t0+(t1-t0)*i/N; const m=meterAt(ch,tt); c.fillRect(X(tt),Y(m.pdb)-1,2,2); }
  }});
  ls.push({label:'Speaker L after volume ramp', h:34, draw(c,X,t0,t1,y,h){
    const N=Math.min(500,Math.max(60,Math.floor(X(t1)-X(t0)))); const Y=db=> y+h-3 - Math.max(0,Math.min(1,(db+70)/75))*(h-6);
    c.strokeStyle=css('--warn'); c.lineWidth=1.5; c.beginPath();
    for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N; const s=speakerAt(tt); const g=gainAt(tt); const db=10*Math.log10(s.L*g*g+1e-12); const yy=Y(db); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); c.lineWidth=1;
  }});
  ls.push({label:'8-character display', h:22, draw(c,X,t0,t1,y,h){
    const N=200; let prev=null, xa=X(t0);
    for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N; const s=displayAt(tt); if (s!==prev || i===N){ if (prev!==null){ const xb=X(tt); c.fillStyle=css('--chip'); c.fillRect(xa,y+3,xb-xa-1,h-6); c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); if (xb-xa>70) c.fillText('“'+prev+'”', xa+4, y+h/2+4); } prev=s; xa=X(tt); } }
  }});
  return ls;
}

/* ---------------- the 40-byte register block (ALTERA_SORT) ---------------- */
const DOWNMIX_SETTINGS = 1;   // front panel downmix_settings = YES (Lt/Rt); no menu screen reaches it (DOWNMIX_SELECT_SCREEN 254 is outside 230…246)
function regBlock(){
  const b=new Array(40).fill(0); b[0]=0x53; b[1]=0x59; b[2]=0x4E; b[3]=0x43;
  const vr = D.last && D.last.muteTo!==undefined && SIM.t>=D.last.muteFrom && SIM.t<D.last.muteTo;
  b[4]=0; b[5]= vr? 0 : (D.mute?0:D.volume); b[6]= D.output==='FIXED'? GAIN_OFFSET : (D.mute?0:D.volume);
  b[7]= D.dolby_mode? (0x80 | (D.cat_select<<4) | (D.preset&0x0F)) : (0x30+D.preset);
  b[8]= D.multi_mode?1:0; b[9]= D.summing_mode?1:0; b[10]= D.preset_selector==='L'?0: D.preset_selector==='R'?1:2; b[11]=calibration();
  b[12]= D.multi_mode? (((D.downmix_setup-1)&0xFF)|0x80) : 0;
  const cat = D.dolby_mode? (((D.cat_select-1)&0x7F)|0x80) : 0; b[13]= (cat | (DOWNMIX_SETTINGS<<3) | (D.dialnorm_settings<<4)) & 0xFF;
  b[14]= D.multi_mode? (D.preset? (1<<(D.preset-1)) : 0) : D.monitor; b[15]=D.monitor;
  const ao=D.analog_output_selector;
  if (!D.dolby_mode && !D.multi_mode){ b[17]= D.summing_mode? 0 : (D.aes_bypass<<2); b[18]=(ao[4]<<4)|ao[3]; b[19]=(ao[2]<<4)|ao[1]; }
  else if (D.monitor_mode===1){ b[17]=(D.aes8_ltrt<<1)|1; b[18]=(ao[4]<<4)|2; b[19]=0x10; }
  else { b[17]=(D.aes8_ltrt<<1); b[18]=(ao[4]<<4)|ao[3]; b[19]=(ao[2]<<4)|ao[1]; }
  return b;
}
const hx = v=> v.toString(16).padStart(2,'0').toUpperCase();

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){
  const e=D.log[0]; if (!e) return '<div class="muted">Press a button or turn the knob. Each step the firmware takes is listed here, then where the change travels.</div>';
  let s=`<div><b>${e.name}</b> at ${SIM.fmtT(e.t)}</div>`+e.trace.map(x=>`<div>→ ${x}</div>`).join('');
  if (e.pipe) s+=`<div style="margin-top:4px"><b>Where it goes</b> (click a time to jump there)</div>`+e.pipe.map(p=>`<div><a href="#" data-seek="${p.t}" class="mono">${SIM.fmtT(p.t)}</a> <span class="muted">+${SIM.fmtDur(Math.max(0,p.t-e.t))}</span> · <b>${p.who}</b> · ${p.txt}${p.t>1?' <span class="muted">(after this second)</span>':''}</div>`).join('');
  return s;
}
function bindSeek(root){ root.querySelectorAll('[data-seek]').forEach(a=>a.onclick=ev=>{ ev.preventDefault(); const t=+a.dataset.seek; if (t<=1) SIM.seek(t); }); }
function inputsHTML(){
  const sel=n=>`<label class="small">IN${n} <select data-fmt="${n}">${Object.keys(VFMT).map(k=>`<option value="${k}" ${D.sdi[n].fmt===k?'selected':''}>${VFMT[k].name}</option>`).join('')}</select></label>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">${sel(1)}${sel(2)}<button data-x="hp">${D.headphones?'Unplug':'Plug in'} headset</button><button data-x="pw">Power ${D.power?'off':'on'}</button><button data-x="rs">Factory defaults</button></div>
    <p class="small muted" style="margin:6px 0 0">Test signals on the inputs are simulation content ${inf}: IN1 carries a 5.1 programme on pairs 1–3, Dolby E on pair 4, stereo on 5, a mono tone on 6, a polarity-reversed tone on 7 and nothing on 8. IN2 carries AC-3 on pair 1, line-up tone, stereo and commentary on 2–4, and no group 2.</p>`;
}
function bindInputs(root){
  root.querySelectorAll('[data-fmt]').forEach(s=>s.onchange=()=>A.setFmt(+s.dataset.fmt, s.value));
  const b=k=>root.querySelector(`[data-x="${k}"]`); if (b('hp')) b('hp').onclick=()=>A.headphones(); if (b('pw')) b('pw').onclick=()=>A.power(); if (b('rs')) b('rs').onclick=()=>A.reset();
}
function inspectorHTML(t){
  const fs=fpStepAt(t), ms=mbStepAt(t), mx=muxAt(t), fr=frameAt(t), v=vid();
  const byteIdx=Math.floor((t-fr.t0)/SLOT); const b=regBlock(); const F=flags(); const ph=phaseLeds();
  const sp=speakerAt(t), g=gainAt(t);
  return `<table class="kv">
    <tr><th>Front MCU</th><td class="mono">pass #${fs.i.toLocaleString()} · ${FP_STEPS[fs.k][0]}</td></tr>
    <tr><th>Main MCU</th><td class="mono">${ms.p.stall?'<b style="color:var(--bad)">inside resetAndInit()</b>':'pass #'+ms.p.i.toLocaleString()+' · '+MB_STEPS[ms.k][0]}</td></tr>
    <tr><th>UART1 frame</th><td class="mono">${FRAME[fr.type].name} · byte ${Math.min(byteIdx,FRAME[fr.type].bytes)} of ${FRAME[fr.type].bytes}</td></tr>
    <tr><th>SHARC</th><td class="mono">sample ${Math.floor(t*C.FS).toLocaleString()} · LED mux row ${mx.row} (meters ${[...Array(16).keys()].filter(c=>meterRow(c)===mx.row).map(c=>c+1).join(' & ')})${mx.lampSlot?' · <b>pair lamps on</b>':''}</td></tr>
    <tr><th>Video</th><td class="mono">${v.cd? v.name+' · '+VFMT[D.sdi[D.input_number].fmt].rate : 'NO_LOCK'} · sdi_format ${v.std}</td></tr>
    <tr><th>Mode</th><td class="mono">${modeName()} · monitor 0x${hx(D.monitor)} · preset '${D.preset}' · ${selName(D.preset_selector)}</td></tr>
    <tr><th>screen</th><td class="mono">${D.screen}${D.screen==='SETUP_SCREEN'?' · '+SETUP_NAMES[D.setup]:''} · display “${displayAt(t)}”</td></tr>
    <tr><th>Volume</th><td class="mono">volume ${D.volume}${D.mute?' (mute, mute_level '+D.mute_level+')':''} = ${D.volume?(D.volume-61)+' dB':'OFF'} · speaker gain now ${g>0?(20*Math.log10(g)).toFixed(1)+' dB':'−∞'}${speakerMuted()?' · <span style="color:var(--warn)">muted ('+(!D.speaker?'Spkr Off':D.headphones?'headset':!v.cd?'no lock':'Mute')+')</span>':''}</td></tr>
    <tr><th>Speakers L / R</th><td class="mono">${(10*Math.log10(sp.L*g*g+1e-12)).toFixed(1)} / ${(10*Math.log10(sp.R*g*g+1e-12)).toFixed(1)} dBFS rms</td></tr>
    <tr><th>Meters</th><td class="mono">0 mark = ${refDb()} dBFS (Cal) · lock 0x${hx(F.lock)} · DD 0x${hx(F.dd)} · correlation LEDs ${ph.n}/15${ph.stale?' (stale)':''}</td></tr>
    <tr><th>ALTERA_BUFFER_out</th><td class="mono small">${b.map((x,i)=>`<span title="byte ${i}" class="${i<4?'hl':''}">${hx(x)}</span>`).join(' ')}</td></tr>
  </table>`;
}
function viewSim(m){
  window[KEYFLAG]=true;
  m.innerHTML = `
  ${card('Front panel at the playhead — click it (AMS16A2, real 2015|48 silkscreen)', `<div id="fp"></div>${controlsHTML()}`)}
  <div class="grid2">
    <div>${card('Rear panel (AMS16-3G silkscreen) — click SDI IN1 / IN2 to plug or unplug', `<div id="rp"></div><div style="margin-top:8px" id="inp"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}</div>
    <div>${card('What the software did (last action)', `<div id="trace" class="log" style="max-height:440px"></div>`)}
      ${card('Action log', `<div id="log" class="log" style="max-height:160px"></div>`)}</div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek; use the transport above)', `<canvas id="tl"></canvas>
    <p class="small muted">Front-panel pass time comes from the source: <span class="mono">SAVE_SETTINGS_CONSTANT 31752</span> is commented “15 sec”, so one pass ≈ 472 µs. The main-board pass (≈2.5 ms) is ${inf}: it is dominated by the bit-banged 40-byte <span class="mono">ALTERA_read_write</span> at 4.9152 MHz. UART bytes, LED multiplex (1 ms), sample rate (48 kHz) and the meter time constants are from the code.</p>`)}`;
  m.querySelector('#inp').innerHTML=inputsHTML(); bindInputs(m);
  const draw=()=>{
    const t=SIM.t;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML=rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#insp').innerHTML=inspectorHTML(t);
    const tr=m.querySelector('#trace'); tr.innerHTML=traceHTML(); bindSeek(tr);
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span> → “${e.disp}”</div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
  };
  bindControls(m);
  let lastKey='';
  SIM.on('time', ()=>{ const k=JSON.stringify([D.sdi,D.power,D.headphones]); if (k!==lastKey){ lastKey=k; m.querySelector('#inp').innerHTML=inputsHTML(); bindInputs(m); } draw(); });
}

/* ---------------- tutorial (from the AMS16-2AEM manual, rev. Dec 23 2008) ---------------- */
const LESSONS = [
  { title:'Meet the AMS16', body:`<p>The AMS16 is a 2RU <b>embedded-audio monitor</b>. It takes an SDI video signal, pulls out (de-embeds) up to <b>8 AES pairs = 16 audio channels</b>, and shows them on <b>16 LED bar meters</b>. You can listen to any pair on the built-in speakers or a headset.</p>
     <p>Below the meters are <b>8 monitor-select buttons</b>, one per pair, with a yellow <b>DD</b> LED (Dolby detected) and a red <b>ERR</b> LED (no valid audio). On the right: the <b>+1 0 −1 correlation meter</b>, an 8-character display, <b>SOLO L / R</b>, the <b>VOLUME</b> knob, <b>MULTI</b> and <b>INPUT 1 / 2</b>.</p>
     <p class="muted">Hover over the panel above to see what each part is. Click “Next” when you are ready.</p>`, check:()=>true, auto:true },
  { title:'1 · Read the meters', body:`<p>Each bar shows the level <b>relative to the reference</b>: the 0 mark is −20 dBFS from the factory. The bar is a VU-style average (τ ≈ 65 ms); the single dot above it is the PPM peak (fast attack, falls ≈ 6.7 dB/s).</p>
     <p>Look at pair 4: the meters sit near the top and the <b>DD</b> LED is on. That is a Dolby E bitstream, not audio, so the AMS16 never sends it to the speakers. Pair 8 shows <b>ERR</b>: nothing is embedded there.</p><p><b>Goal:</b> make sure IN1 is selected and locked (display reads <span class="mono">HD-SDI</span>).</p>`, check:()=>D.input_number===1 && vid().cd && !D.summing_mode && !D.multi_mode && !D.dolby_mode, hint:'Press INPUT 1 (Z key). If the display says No Lock, click SDI IN1 on the rear panel.' },
  { title:'2 · Listen to a pair', body:`<p>Press a <b>monitor-select button</b>. Its lamp lights, and that pair goes to the speakers and to the rear MONITOR outputs.</p><p><b>Goal:</b> listen to pair 5 (the stereo mix).</p><p class="muted">Watch the timeline's “Last action → propagation” lane: the button is read within half a millisecond, but the main board only learns about it at the end of the next 36-byte UART frame, about 0.2 s later.</p>`, check:()=>!D.summing_mode&&!D.multi_mode&&!D.dolby_mode&&D.monitor===16, hint:'Press button 5 under meters 9/10 (or key 5).' },
  { title:'3 · Solo one side', body:`<p>Press <b>SOLO L</b>. Only the left channel is heard, on both speakers. Press it again to go back to both. SOLO R does the same for the right channel.</p><p>The firmware remembers the solo setting for each pair (<span class="mono">preset_monitor_array</span>) until you change mode or input.</p><p><b>Goal:</b> pair 5, left only.</p>`, check:()=>D.monitor===16&&D.preset_selector==='L', hint:'Press SOLO L (L key).' },
  { title:'4 · Set the volume', body:`<p>Press SOLO L again to go back to both channels. Then <b>turn VOLUME</b>. The display shows the level from OFF and −60 dB up to +15 dB in 1 dB steps. After about 2.4 s without a turn, it goes back to the input screen.</p><p><b>Goal:</b> both channels, volume at <b>−20 dB</b>.</p>`, check:()=>D.preset_selector==='LR'&&D.volume===41&&!D.mute, hint:'Turn VOLUME clockwise (D key) eleven clicks from −31 dB.' },
  { title:'5 · Mute', body:`<p><b>Press the VOLUME knob</b> once to mute. The display says <span class="mono">Mute</span>. Press it again, or turn it, to unmute.</p><p><b>Goal:</b> mute.</p><p class="muted">Watch the display lane: the “Mute” message disappears after the same 2.4 s time-out, although the audio stays muted.</p>`, check:()=>D.mute, hint:'Press the VOLUME knob (S key, or click its centre).' },
  { title:'6 · Switch to input 2', body:`<p>Press the knob again to unmute. Then press <b>INPUT 2</b>. IN2 carries SD-SDI with Dolby Digital (AC-3) on pair 1 and only four pairs, so pairs 5–8 show <b>ERR</b>.</p><p>When the input changes, the main board silences the speakers until it has seen the new input number in several frames in a row. The new SDI lock also makes it reset the FPGA core and SerDes, which blocks its loop for about 0.6 s.</p><p><b>Goal:</b> IN2, unmuted.</p>`, check:()=>D.input_number===2 && !D.mute, hint:'Unmute (S), then press INPUT 2 (X key).' },
  { title:'7 · Summing mode', body:`<p>Go back to <b>INPUT 1</b>. Press <b>MULTI</b> until the display reads <span class="mono">Summing</span> (Demux → Dolby → Multi → Summing → Demux). In Summing mode each monitor button <b>toggles</b>, and every lit pair is added together on the speakers. Dolby pairs are ignored.</p><p><b>Goal:</b> Summing with pairs 1 and 5 lit (and nothing else).</p>`, check:()=>D.input_number===1&&D.summing_mode&&D.monitor===0x11, hint:'INPUT 1, then MULTI three times. Then toggle the pair buttons until only 1 and 5 are lit.' },
  { title:'8 · Multi: Lt/Rt downmix', body:`<p>Press <b>MULTI</b> to go back to Demux. Then press it again twice, to <span class="mono">Multi</span>. The first three pairs (5.1: L R, C LFE, Ls Rs) are folded down to stereo:</p><p class="mono small">Lt = L + 0.707 C − 0.707 Ls − 0.707 Rs<br>Rt = R + 0.707 C + 0.707 Ls + 0.707 Rs</p><p>Pairs 1–3 light. Press one of them twice to hear just that pair, and press it again to go back to the downmix.</p><p><b>Goal:</b> Multi mode with the whole group (pairs 1–3) lit.</p>`, check:()=>D.multi_mode&&D.monitor===groupMask(), hint:'MULTI → Demux, then MULTI twice.' },
  { title:'9 · Decode Dolby E', body:`<p>Per the manual, first choose the Dolby pair in <b>Demux</b>: press MULTI until the display shows <span class="mono">HD-SDI</span>, then press <b>button 4</b> (the DD pair). Now press <b>MULTI</b> once. The display reads <span class="mono">Dolby-4</span>. The CAT552 decoder card decodes that pair to meters 1–8, and meters 15/16 show the Lt/Rt downmix.</p><p><b>Goal:</b> <span class="mono">Dolby-4</span>.</p>`, check:()=>D.dolby_mode&&D.cat_select===4, hint:'MULTI until HD-SDI, press 4, then MULTI.' },
  { title:'10 · Open the configuration menu', body:`<p><b>Hold INPUT 1 and INPUT 2 and press the VOLUME knob.</b> The display shows the firmware version (<span class="mono">06AV0000</span> in the shipped build; <span class="mono">5.0.0.0</span> if you pick the master's copy of the front-panel source on the Software tab). In the menu, <b>pressing</b> the knob moves to the next item, and <b>turning</b> it changes the value: Version → Vol → O/P → Spkr → Cal → Mon → An1–An4 → Mlti → Sum → Dlby → Dn → A8 → AES → Exit.</p><p><b>Goal:</b> be in the menu.</p>`, check:()=>D.screen==='SETUP_SCREEN', hint:'Click “Setup combo” (or U).' },
  { title:'11 · Change the meter reference', body:`<p>Press the knob until the display reads <span class="mono">Cal  -20</span>, then turn it one click clockwise to <span class="mono">-18</span>. Now the 0 mark means −18 dBFS. The front panel sends <span class="mono">calibration = 4</span>, and the SHARC adds 4 half-dB steps to every meter result.</p><p><b>Goal:</b> Cal = −18.</p>`, check:()=>D.cal_level===43, hint:'Press VOLUME (S) four times to reach Cal, then turn clockwise (D).' },
  { title:'12 · Leave the menu', body:`<p>Keep pressing the knob until the display reads <span class="mono">Exit</span>, then <b>turn</b> the knob. The settings are saved to EEPROM later. The manual says after one minute of inactivity; the code saves 15 s after the first change.</p><p><b>Goal:</b> back to normal operation, with Cal still at −18.</p>`, check:()=>D.screen!=='SETUP_SCREEN'&&D.cal_level===43, hint:'Press until Exit, then turn.' },
  { title:'Done', body:`<p>You've used every control on the AMS16. The other tabs show the same actions from the inside. <b>Software</b> traces each button through the front-panel ATmega128, the RS-485 UART, the main-board ATmega128, the FPGA register block and the SHARC. <b>One second</b> breaks the timing down to the single sample and LED multiplex row. <b>Findings</b> lists what the code does that the manual doesn't say.</p>`, check:()=>true, auto:true },
];
let lessonIdx=0;
function viewTutorial(m){
  window[KEYFLAG]=true;
  m.innerHTML = `${card('The unit', `<div id="fp"></div>${controlsHTML()}`)}
   <div class="grid2"><div>${card('Tutorial — operating the AMS16-2AEM (from the operation manual)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
   <div>${card('What the software did', `<div id="trace" class="log"></div>`)}${card('Rear panel', `<div id="rp"></div>`)}</div></div>`;
  const hot = `<g>
    <rect x="885" y="8" width="1127" height="470" fill="transparent"><title>16 LED bar meters, 8 AES pairs. 0 mark = −20 dBFS (Cal). Bar = VU, dot = PPM peak</title></rect>
    <rect x="885" y="480" width="1127" height="80" fill="transparent"><title>DD (yellow) = Dolby E / AC-3 detected; ERR (red) = no valid audio in that pair</title></rect>
    <rect x="2229" y="40" width="240" height="110" fill="transparent"><title>Correlation meter (+1 in phase, −1 out of phase) for the monitored pair</title></rect>
    <rect x="2164" y="183" width="370" height="101" fill="transparent"><title>8-character display (PDSP1884), driven by SIEMENS8.c</title></rect>
    <rect x="2780" y="40" width="660" height="620" fill="transparent"><title>Speaker grille (mid-range + woofer each side)</title></rect>
    <rect x="0" y="40" width="880" height="620" fill="transparent"><title>Speaker grille</title></rect></g>`;
  const draw=()=>{
    m.querySelector('#fp').innerHTML=frontSVG(SIM.t,{hot}); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML=rearSVG(); bindPanel(m.querySelector('#rp'));
    const tr=m.querySelector('#trace'); tr.innerHTML=traceHTML(); bindSeek(tr);
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=>li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx], ok=L.check();
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over (factory defaults)</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); lessonIdx=0; draw(); };
  };
  bindControls(m);
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewSecond(m){
  window[KEYFLAG]=true;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">${card('As seen by the device (at the playhead)', `<div id="dev"></div>`)}
    ${card('As seen by the displays', `<div id="fp"></div><h3>LED multiplex at the playhead</h3><canvas id="mux"></canvas><p class="small muted">backgnd.c drives the meter boards one mux row per 1 ms timer tick: <span class="mono">refresh()</span> shifts 120 + 8 + 8 bits of padding/select, 16 phase bits, then for two bars (rows <i>r</i> and <i>r</i>+8) 6 lamp bits, 16 “top” and 26 “bottom” segment bits, and pulses FLG10 to latch. So each bar is refreshed once every 8 ms. The pair-button lamps only get data on row 7, and only one scan in four (<span class="mono">pb_dim</span>), which dims them. That the LEDs are lit only during their own row (1/8 duty) is ${inf}.</p>`)}</div>
  ${card('Zoom ladder at the playhead — meter of the monitored pair, from one second down to one sample', `<canvas id="zl"></canvas>`)}`;
  const draw=()=>{
    const t=SIM.t, v=vid(); const f=v.f;
    const rows=[
      ['SDI frames', f? (1/f.frame).toFixed(2):'—', f? SIM.fmtDur(f.frame):'', 'GS2970A deserialises; FPGA de-embeds (demux16 / hd_demux16 / SDdemux)'],
      ['SDI lines', f? Math.round(f.lines/f.frame).toLocaleString():'—', f? SIM.fmtDur(f.frame/f.lines):'', 'Audio packets in HANC; '+(f? (48000*f.frame/f.lines).toFixed(3)+' samples per line per channel':'')],
      ['Audio samples (per channel)', '48,000', SIM.fmtDur(1/48000), 'SHARC SampleIRQ on SPORT1: VU, PPM, phase, sums, Lt/Rt for 16 channels'],
      ['TDM words SHARC ← FPGA', (48000*30).toLocaleString(), SIM.fmtDur(1/48000/30), '3 TDM pairs × 10 slots (SPMCTL NCH9), 24/32-bit, DMA double-buffered'],
      ['Volume ramp time constant', '—', SIM.fmtDur(C.RAMP_TAU), 'RampAudioCalc α = 0.002 per sample'],
      ['LED mux rows', '1,000', '1 ms', 'refresh(): 2 bars per row, 8 rows = 8 ms per bar'],
      ['Pair-lamp refreshes', '31.25', '32 ms', 'row 7 and pb_dim == 0'],
      ['Front-panel passes', Math.round(1/C.FP_PASS).toLocaleString(), SIM.fmtDur(C.FP_PASS), 'From SAVE_SETTINGS_CONSTANT 31752 ≡ 15 s'],
      ['UART1 bytes front → main', (1/SLOT).toFixed(1), SIM.fmtDur(SLOT), 'Transmit_Counter 10; byte on the wire '+SIM.fmtDur(C.BYTE_T)+' at 9600 Bd'],
      ['GENERAL_COM frames', (1/frameLen('GENERAL')).toFixed(2), SIM.fmtDur(frameLen('GENERAL')), '36 bytes: # A B D dn E src in F vvv eee G mon sel P preset S spk Y cal M … N … $'],
      ['VOLUME_COM frames (while turning)', (1/frameLen('VOLUME')).toFixed(2), SIM.fmtDur(frameLen('VOLUME')), '12 bytes: # F hhh ttt ooo  eee … E src in $'],
      ['Main-board passes', '≈ '+Math.round(1/C.MB_PASS)+' '+inf, SIM.fmtDur(C.MB_PASS), 'Each: 40-byte register exchange with the FPGA'],
      ['Register bits MCU ↔ FPGA', '≈ '+(320*Math.round(1/C.MB_PASS)).toLocaleString(), '', 'PC7 FSYNCH, PD3 CLOCK, PB5 WRITE, PC6 READ'],
      ['UART0 bytes main → front', (1/(3*C.MB_PASS)).toFixed(0)+' '+inf, SIM.fmtDur(3*C.MB_PASS), '20-byte reply: # A Dformat B config C prog dn D mix R fr T dr X dolby ? S sdi_format $'],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Selected input: ${v.cd? v.name : 'no lock'}. Use <b>Step</b> on the transport to move one frame, one UART frame, one LED row, one panel pass or one sample at a time.</p>`;
    const fs=fpStepAt(t), ms=mbStepAt(t), mx=muxAt(t), fr=frameAt(t); const bi=Math.floor((t-fr.t0)/SLOT);
    const ln = f? Math.floor((t%f.frame)/(f.frame/f.lines))+1 : 0;
    m.querySelector('#dev').innerHTML = `<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>SDI</th><td class="mono">${f? 'frame '+Math.floor(t/f.frame)+' · line '+ln+' of '+f.lines : 'no lock'}</td></tr>
      <tr><th>FPGA</th><td class="mono">de-embedding ${pairs().filter(p=>p.kind!=='none').length} pairs · group detector lock 0x${hx(flags().lock)} · Dolby 0x${hx(flags().dd)}</td></tr>
      <tr><th>SHARC</th><td class="mono">sample ${Math.floor(t*48000).toLocaleString()} (SampleIRQ) · background: mux row ${mx.row}</td></tr>
      <tr><th>Front MCU</th><td class="mono">pass ${fs.i.toLocaleString()}: ${FP_STEPS[fs.k][0]}<br><span class="muted">${FP_STEPS[fs.k][2]}</span></td></tr>
      <tr><th>UART1</th><td class="mono">${FRAME[fr.type].name} byte ${Math.min(bi,FRAME[fr.type].bytes)}${(t-fr.t0-bi*SLOT)<C.BYTE_T?' <b>on the wire</b>':' (gap)'}</td></tr>
      <tr><th>Main MCU</th><td class="mono">${ms.p.stall?'resetAndInit() — waiting in wait(50000)':'pass '+ms.p.i+': '+MB_STEPS[ms.k][0]+'<br><span class="muted">'+MB_STEPS[ms.k][2]+'</span>'}</td></tr></table>`;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    drawMux(m.querySelector('#mux'), t); drawLadder(m.querySelector('#zl'), t);
  };
  SIM.on('time', draw);
}
function drawMux(cv, t){
  const {c,w}=SIM.canvas(cv, 140); const mx=muxAt(t); const ink=SIM.css('--ink'), ink2=SIM.css('--ink2');
  const bw=(w-40)/16;
  for (let b=0;b<16;b++){ const row=meterRow(b); const on=row===mx.row; const m=meterAt(b,t);
    c.fillStyle= on? SIM.css('--accent') : SIM.css('--grid'); c.fillRect(20+b*bw+2, 118-m.nV*1.9, bw-4, m.nV*1.9);
    c.fillStyle= on? ink : ink2; c.font='10px '+SIM.css('--mono'); c.fillText(String(b+1), 20+b*bw+bw/2-5, 132); c.fillText('r'+row, 20+b*bw+bw/2-6, 30); }
  c.fillStyle=ink; c.font='11px sans-serif'; c.fillText(`row ${mx.row} driven now (meters ${[...Array(16).keys()].filter(k=>meterRow(k)===mx.row).map(k=>k+1).join(' & ')})${mx.lampSlot?' + pair-button lamps':''}`, 20, 13);
}
function drawLadder(cv, t){
  const sel=Math.max(0,[1,2,4,8,16,32,64,128].indexOf(D.monitor)); const ch=2*sel;
  const f=vid().f;
  const levels=[['1 second',1],['1 GENERAL_COM frame',frameLen('GENERAL')],['1 SDI frame', f?f.frame:1001/30000],['1 LED scan (8 rows)',0.008],['1 front-panel pass',C.FP_PASS],['4 audio samples',4/48000]];
  const H=levels.length*46+8; const {c,w}=SIM.canvas(cv,H); const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), play=SIM.css('--play'), grid=SIM.css('--grid');
  levels.forEach(([nm,span],i)=>{
    const y=6+i*46, t0=Math.max(0,Math.min(1-span,t-span/2)), x0=180, pw=w-x0-10;
    c.fillStyle=ink; c.font='12px sans-serif'; c.fillText(nm+' ('+SIM.fmtDur(span)+')',6,y+15); c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText(span>0.05?'VU (line), PPM (dots), meter '+(ch+1):span>0.002?'LED rows / panel passes':'samples (ticks) and SDI lines',6,y+29);
    c.strokeStyle=grid; c.strokeRect(x0,y+2,pw,34);
    if (span>0.05){ const ref=refDb(); const Y=db=>y+34-Math.max(0,Math.min(1,(db-(ref-40))/60))*30; c.strokeStyle=SIM.css('--accent'); c.beginPath();
      for (let k=0;k<=300;k++){ const tt=t0+span*k/300; const mm=meterAt(ch,tt); const yy=Y(mm.vdb+3.01); k?c.lineTo(x0+pw*k/300,yy):c.moveTo(x0,yy);} c.stroke();
      c.fillStyle=SIM.css('--bad'); for (let k=0;k<=300;k+=4){ const tt=t0+span*k/300; c.fillRect(x0+pw*k/300,Y(meterAt(ch,tt).pdb)-1,2,2); } }
    else if (span>0.002){ for (let n=Math.floor(t0/C.MUX_T); n*C.MUX_T<t0+span; n++){ const a=Math.max(t0,n*C.MUX_T), b=Math.min(t0+span,(n+1)*C.MUX_T); const row=7-(n%8); c.fillStyle=row===7?SIM.css('--warn'):SIM.css('--accent2'); c.globalAlpha=.2+row*.08; c.fillRect(x0+(a-t0)/span*pw,y+4,(b-a)/span*pw-1,14); c.globalAlpha=1; }
      for (let n=Math.floor(t0/C.FP_PASS); n*C.FP_PASS<t0+span; n++){ const x=x0+(n*C.FP_PASS-t0)/span*pw; if (x>=x0){ c.fillStyle=SIM.css('--accent'); c.fillRect(x,y+20,1.5,14);} } }
    else { for (let n=Math.ceil(t0*48000); n/48000<t0+span; n++){ const x=x0+(n/48000-t0)/span*pw; c.fillStyle=SIM.css('--warn'); c.fillRect(x,y+4,2,30); }
      if (f){ const H_=f.frame/f.lines; for (let n=Math.ceil(t0/H_); n*H_<t0+span; n++){ const x=x0+(n*H_-t0)/span*pw; c.fillStyle=SIM.css('--accent2'); c.fillRect(x,y+24,1,10);} } }
    const px=x0+(t-t0)/span*pw; c.strokeStyle=play; c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+38); c.stroke();
  });
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  sdiin:{x:10,y:20,w:150,h:70,t:'SDI IN1 / IN2',s:['GS2984 EQ ×2','SDI_SEL 2×1'],d:'Two 75 Ω BNC inputs, each with a GS2984 adaptive equaliser (BOM U1/U4). The FPGA pin SDI_SEL (AA9) picks one; the main board sets it through ALTERA_REG_VIDEO_1 BIT6 (changeInput / writeVideo1Reg). Formats: SD (259M), HD (292M) and, on the 3G board, 3G-SDI level A (level B is reported as No Lock).'},
  rx:{x:10,y:120,w:150,h:80,t:'GS2970A receiver',s:['3G/HD/SD deserialiser','DOUT[19:0], STAT'],d:'Gennum GS2970A (U7). Its registers are read over GSPI (gspi.c), through the FPGA chip-select register ALTERA_REG_EXT_CS. The main board reads reg 0x22 (lock, rate, 1001, interlace) and 0x06/0x07 (format) every loop pass in gs2970AReadVidInfo().'},
  fpga:{x:210,y:20,w:210,h:250,t:'Cyclone IV E EP4CE30',s:['demux16 / hd_demux16 / SDdemux','group_detector, CHACT_FLAGS','dolby / non_audio detectors','aes_outputs → AES 1–8','tdmxI2S_10 ↔ SHARC','phase_detector → PLL1705','40-byte register port','3G: lock59, det1001'],d:'AMS16TEST.qsf, Quartus II 10.1 → 11.1 (earlier boards: Cyclone II EP2C35). De-embeds up to 8 AES pairs, flags which pairs are present (altera_data_in[6]) and which are Dolby (altera_data_in[8]), passes 16 channels and the control words to the SHARC over TDM, sends AES out, and talks to the Dolby CAT552 card (DOLBY1…18 pins). Configured from M25P16 (U12). The main board can rewrite it over SPI (altspi.c).'},
  tx:{x:10,y:230,w:150,h:60,t:'GS2962 serializer',s:['SDI OUT1/2 reclocked'],d:'Gennum GS2962 (U13) re-serialises the selected input to the two SDI outputs. Taken out of reset in main(); gs2962Init() is commented out.'},
  dsp:{x:470,y:20,w:200,h:150,t:'ADSP-21262 SHARC',s:['SampleIRQ 48 kHz: VU, PPM','phase, sums, Lt/Rt','Dolby mute, volume ramp','LED refresh every 1 ms','RLM24 code base'],d:'sample.c / backgnd.c (VisualDSP++). Reads 20 TDM inputs (16 audio + spare), computes VU (τ 65 ms) and PPM (0.9 ms / 0.65 s) for 16 channels and correlation per pair, sums the selected pairs to the speakers, applies the ramped volume, and shifts the LED meter data out itself (shifter.asm, FLG10 latch). Boots from AT25F512 (U20). version.h still says 0.1.'},
  leds:{x:470,y:200,w:200,h:90,t:'LED meter boards',s:['16 × 42 driven segments','DD / ERR, pair lamps','correlation 15 LEDs'],d:'Driven serially by the SHARC: per 1 ms row, 2 bars × (16 + 26) bits + 6 lamp bits + 16 phase bits. The panel BOM (AMS16A-5-6-PANEL) lists 168 green, 136 yellow and 80 red LEDs per panel set, plus a PDSP1884 display and an ATmega128 at 4.9152 MHz.'},
  mb:{x:210,y:310,w:210,h:110,t:'Main ATmega128L',s:['4.9152 MHz · ALTERA_SORT','GS2970A / GS2962 control','Dolby CAT552 status','UART0 ↔ front panel'],d:'ams16.c (v600/V070000, "Copy from Tim\'s Code", "Adam Add"). One while(1) loop: parse the front-panel frame, read the SDI receiver, pack and exchange the 40-byte register block, check alignment and TDM sync, reset the SHARC if audio sync is lost, and handle input changes. Watchdog ≈ 0.9 s.'},
  fp:{x:470,y:320,w:200,h:100,t:'Front-panel ATmega128',s:['4.9152 MHz · buttons, knob','PDSP1884 8-char display','UART1 ↔ main, EEPROM'],d:'v200w.c (15 472 lines, project v100w.prj, V040002; version screen 06AV0000 in the shipped RD23 copy, 5.0.0.0 in the master copy). It owns the user interface and all the operating modes. The main board just applies what the panel sends it every ≈190 ms.'},
  rs:{x:430,y:440,w:90,h:40,t:'RS-485',s:['ADM3485 ×2'],d:'The two MCUs talk at 9600 Bd 8N1 through ADM3485 transceivers (BOM U8/U10; TXEN = PF3, /RXEN = PF2 in port_init).'},
  dolby:{x:720,y:20,w:150,h:80,t:'Dolby CAT552 card',s:['Dolby E / AC-3 decode','metadata → DB9'],d:'Optional decoder card (AMS16-2AEM). The FPGA sends it the selected pair (ALTERA_BUFFER_out[13] cat_select | BIT7). The main board polls CATinstalled / CATerror on PORTG (dolby.c) and resets it with CATrst.'},
  outs:{x:720,y:120,w:150,h:110,t:'Outputs',s:['AES 1–8 (75 Ω BNC)','MONITOR 1/2','AUX1 DB25: 8 analog','headset, 2 speakers'],d:'AES outputs follow the meters (manual table 2.4-1) and switch between raw and processed with AES Dmx/Proc (aes_bypass). The analog outputs are routed with An1–An4 (ALTERA_BUFFER_out[18]/[19]). The speakers are muted by PB4 (MUTE_SPEAKERS) when Spkr = Off, on no lock or with a headset.'},
  clk:{x:720,y:250,w:150,h:70,t:'Clocks',s:['PLL1705, ICS662-03','24.576 / 27 MHz'],d:'The PLL1705 (U21) makes the audio clocks, steered by phase_detector48_256fs (UP/DN/VCO pins). The ICS662-03 (U18) is an HDTV A/V clock. BOM X2 is a 24.576 MHz oscillator and X5 a 27 MHz crystal.'},
};
const WIRES=[['sdiin','rx','SDI'],['rx','fpga','DOUT[19:0] PCLK'],['fpga','tx','DIN[19:0]'],['fpga','dsp','TDM 20 ch + ctl'],['dsp','fpga',''],['dsp','leds','serial + FLG10'],['mb','fpga','40-byte reg block'],['fpga','mb',''],['mb','rs','UART0'],['rs','fp','UART1'],['fp','leds','PINB buttons'],['fpga','dolby','CAT select / audio'],['fpga','outs','AES / analog'],['clk','fpga','AUDIO_CLOCK'],['mb','rx','GSPI']];
function viewBlock(m){
  window[KEYFLAG]=false; let sel='fp';
  m.innerHTML=`<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${card('Signal flow in one paragraph', `<p>SDI comes in through an equaliser into the <b>GS2970A</b>. The <b>FPGA</b> de-embeds the eight AES pairs, flags which are present and which are Dolby, and passes 16 channels to the <b>SHARC</b>. The SHARC measures them and drives the LED meters itself. It also sums the pairs the operator picked and sends them at the set volume to the speakers and monitor outputs. The <b>front-panel ATmega128</b> decides what “picked” means. It sends its whole state about five times a second over RS-485 to the <b>main ATmega128</b>, which writes it into the FPGA's 40-byte register block on every loop pass.</p>`)}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 880 490" style="width:100%"><defs><marker id="a16ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.2}" marker-end="url(#a16ar)"/>`;
      if (l) s+=`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
      <text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+33+i*13.5}" font-size="10" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    s+='</svg>'; m.querySelector('#bd').innerHTML=s;
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
  };
  draw();
}

/* ---------------- schematics (redrawn from net names in the source) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*17; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+21+i*17; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x-34}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+21+i*17; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x+w+34}" y="${yy+4}" font-size="10" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  return s;
}
const SHEETS=[
  {name:'1 · Main-board MCU', note:'ATmega128L (BOM U11, X1 4.9152 MHz). Pin functions are taken from the comments in port_init() and the macros in altera.h, uart0.h and altspi.h (ams16.c, v700). ALTERA0…16 are the FPGA nets with the same names in AMS16TEST.qsf.', svg:()=>
    chip(330,60,200,'U11 ATmega128L',[['PA0','ALTERA13 AltSpi MISO'],['PA1','ALTERA14 AltSpi MOSI'],['PA2','ALTERA15 AltSpi CLK'],['PA3','ALTERA16 AltSpi CS'],['PB4','ALTERA9 MUTE_SPEAKERS'],['PB5','ALTERA10 ALTERA_WRITE'],['PB6','ALTERA11 test'],['PB7','ALTERA12 GLOBAL_RESET'],['PC6','ALTERA6 ALTERA_DATA_READ'],['PC7','ALTERA7 ALTERA_FSYNCH'],['PD3','ALTERA8 ALTERA_CLOCK']],
      [['PD6','FPGA CONF_DONE (isAlteraReady)'],['PD7','SHARC_RESET'],['PE0/PE1','RXD0 / TXD0'],['PF3','U10 TXEN (ADM3485)'],['PF2','U8 /RXEN (ADM3485)'],['PG0','CAT552 reset'],['PG1','altera9_reset / CATerror'],['PG2','ALTERA_RESET'],['PG3/PG4','CATinstalled · PB1/PB2'],['PE2…PE7','ASDI CNF_DATA DCLK NCS NCE (config bus)'],['XTAL','4.9152 MHz → 9600 Bd at UBRR 0x1F']],'ICCAVR 7.15 · watchdog prescaler 110 (≈0.9 s)')
    + `<text x="40" y="440" font-size="11" fill="var(--ink2)">Bit-banged register port: FSYNCH low → 40 × 8 bits, MSB first, data out on PB5 at CLOCK rise, data in from PC6 → FSYNCH high.</text>` },
  {name:'2 · Front-panel MCU', note:'ATmega128(L) on the panel board (AMS16A-5-6-PANEL.bom: XTAL 4.9152, PDSP1884, 2 encoders). Pins are from v200w.c TRANSLATE_PUSHBUTTONS / PROCESS_PUSHBUTTONS, common.c READ_ENCODER1 / READ_SHAFT_ENCODER1 and SIEMENS8.c. PORTA lamps are active low (inferred from DATA_initialization).', svg:()=>
    chip(330,60,200,'ATmega128 (panel)',[['PB7 PB5 PB3 PB1','AES 1 2 3 4 buttons'],['PB6 PB4 PB2 PB0','AES 5 6 7 8 buttons'],['PD1 / PD0','INPUT 1 / INPUT 2'],['PD4','MULTI'],['PE5 / PE3','SOLO L / SOLO R'],['PE2','VOLUME push (encoder 1 switch)'],['PF0 / PF1','VOLUME quadrature A / B'],['PD2 / PD3','RXD1 / TXD1 → RS-485']],
      [['PA0','SOLO L lamp'],['PA1','SOLO R lamp'],['PA2','MULTI lamp'],['PA3','INPUT 1 lamp'],['PA4','INPUT 2 lamp'],['PC0…7','PDSP1884 D0…D7'],['PG0…4','PDSP1884 A0…A4'],['PE6 / PE4 / PE7','WR / CE / RD'],['PD6 / PD7','RST / FL']],'v200w.c · UART1 9600 Bd · EEPROM settings')
    + `<text x="40" y="420" font-size="11" fill="var(--ink2)">The 8 pair-button lamps are NOT on this MCU. The SHARC lights them through the LED shift chain (pb1_4 / pb5_8 bits 2–5).</text>` },
  {name:'3 · FPGA (pins from AMS16TEST.qsf)', note:'Cyclone IV E EP4CE30F23 (BOM EP4CE30F23I7N, U3). Pin numbers and net names copied from Altera/AMS16TEST.qsf in the v700 release; only a representative subset of the 186 assignments is shown.', svg:()=>
    chip(330,40,200,'U3 EP4CE30F23',[['T22','RCVR_PCLK'],['N19…Y22','RCVR_DOUT[0…19]'],['AB19…AB18','RCVR_STAT[0…5]'],['W17 / W15 / W14','RCVR_CS_N / SCLK / SDIN'],['V13','RCVR_RESET'],['U10 / V9','CBL1_EQ_CD_N / CBL2_EQ_CD_N'],['AA9','SDI_SEL'],['A7…A9','ALTERA0…5 (MCU port)'],['C4 / E5 / C6 / E6','ALTERA16 CS / 15 SCLK / 13 SDIN / 14 SDOUT'],['B2 / G1','REF_IN_ics662 / HDCLK_ics662_clkout']],
      [['C10 B10 E10 C8','AESOUT1 2 3 4'],['D10 A10 E9 D7','AESOUT5 6 7 8'],['C7 / D6','AESOUT9 / AESOUT10 (MONITOR)'],['A13…D15','SRL_DIN[19…0] → GS2962'],['A20','SRL_PCLK'],['V4 V3 AA1 Y2','DAI_P1…P4 cntrl_tdm FS/SCLK/DIN/DOUT'],['V2 W1 U2','DAI_P8 FSYNCH / P9 SCLK / P10 SDATA1'],['E3 G5 G4','DOLBY1 DAC_mclk / 2 sclk / 3 lrclk'],['L6','DOLBY8_cat552'],['AA3 / AB11','U4_XT1_pll1705_out / AUDIO_CLOCK'],['Y8 AA10 AB10 Y10','DAC_MCLK SCLK LRCLK D1'],['AB9','MUTE']],'Quartus II 10.1 → 11.1 · M25P16 config') },
  {name:'4 · SHARC DSP', note:'ADSP-21262 (BOM ADSP-21262SKSTZ200, U19). DAI pin names from the FPGA net names; SPORT setup from sample.c SampleInit; LED latch FLG10 and sample-time flag DAI_PB19 from backgnd.c / sample.c.', svg:()=>
    chip(320,60,220,'U19 ADSP-21262',[['DAI_P1…P4','cntrl_tdm FS/SCLK/DIN/DOUT (ctl words)'],['DAI_P8/P9/P10','TDM FSYNCH / SCLK / SDATA1'],['DAI_P11…P15','U4 (CS8416-style) OUT/CLK/IN/RESET/SEL'],['DAI_P17/P18/P19','DATA_IN1 / CLK / ENABLE'],['SPI','AT25F512 boot (U20)'],['CLKIN','×16 PLL (PMCTL PLLM16)']],
      [['SPORT0/1','TDM ch 0–9 in/out'],['SPORT2/3','TDM ch 10–19 in/out'],['SPORT4/5','altera_data_out / altera_data_in (10 × 32 bit)'],['FLG10','LED shift latch'],['FLG11/12/15','outputs; FLG15 gates SPORT fsync'],['DAI_PB19','sample_time test flag'],['FLG0','pulsed at SampleIRQ entry']],'VisualDSP++ · rlm24.dpj · version.h 0.1')
    + `<text x="40" y="340" font-size="11" fill="var(--ink2)">Inside: VUMeterCalc (vumeter.asm), PhaseMeterCalc (phasemeter.asm), SSensor (silence sensor, init commented out), RampAudioCalc, shifter.asm → LED boards.</text>` },
  {name:'5 · SDI chain and clocks', note:'Parts from AMS163G-ISS7-BOM.xls; net names from AMS16TEST.qsf and gs2970a.c / ams16.c. Equaliser and reclocker passives are not traced.', svg:()=>
    chip(60,70,140,'U1 GS2984',[['SDI_IN','IN1 BNC']],[['SDO','→ 2×1'],['CD_N','CBL1_EQ_CD_N'],['MUTE','CBL1_EQ_MUTE']],'cable EQ IN1')
    + chip(60,230,140,'U4 GS2984',[['SDI_IN','IN2 BNC']],[['SDO','→ 2×1'],['CD_N','CBL2_EQ_CD_N'],['MUTE','CBL2_EQ_MUTE']],'cable EQ IN2')
    + chip(340,70,150,'U7 GS2970A',[['SDI','selected (SDI_SEL)'],['GSPI','RCVR_CS_N/SCLK/SDIN']],[['DOUT[19:0]','→ FPGA'],['PCLK','RCVR_PCLK'],['STAT[5:3]','RATE_DET / LOCKED'],['reg 0x22','lock · rate · 1001']],'3G/HD/SD receiver')
    + chip(340,260,150,'U13 GS2962',[['DIN[19:0]','SRL_DIN ← FPGA'],['PCLK','SRL_PCLK']],[['SDO','SDI OUT1 / OUT2']],'serializer')
    + chip(640,70,130,'U21 PLL1705',[['XT1','U4_XT1_pll1705_out']],[['SCKO','AUDIO_CLOCK'],['ctrl','UP/DN/VCO 1–3']],'audio clocks')
    + chip(640,230,130,'U18 ICS662-03',[['REF_IN','REF_IN_ics662'],['SEL0…3','SEL0…3_ics662']],[['CLK','HDCLK_ics662_clkout']],'HDTV A/V clock') },
];
function viewSchem(m){
  window[KEYFLAG]=false; let i=0;
  m.innerHTML=card('Schematic set — redrawn from source net names, not the original CAD', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The original drawings are the Altium 3G Issue 7 schematics (13 sheets) in <span class="mono">AMS16A - #PCB/AMS16A-3-4/</span> and the P-CAD issue-4 boards. These sheets are a readable guide built from the firmware's pin comments, the FPGA pin file and the BOM, so they are only as reliable as those names. Blue labels are nets.</p>`);
  const draw=()=>{
    m.querySelector('#tabs2').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 900 470" style="width:100%;min-width:680px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="888" height="458" fill="none" stroke="var(--line)"/><text x="884" y="455" text-anchor="end" font-size="10" fill="var(--ink2)">AMS16-3G · sheet ${i+1}/${SHEETS.length} · redrawn ${SIM.year(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent=SHEETS[i].note;
  };
  draw();
}

/* ---------------- software diagrams ---------------- */
function flowSVG(steps, frac, k, title, sub){
  let s=`<svg viewBox="0 0 520 ${steps.length*40+70}" style="width:100%"><defs><marker id="a16a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
    <rect x="20" y="6" width="480" height="24" rx="12" fill="var(--chip)" stroke="var(--line)"/><text x="260" y="22" text-anchor="middle" font-size="10.5" fill="var(--ink)">${title}</text>`;
  steps.forEach((p,j)=>{ const y=40+j*40, on=k===j;
    s+=`<line x1="260" y1="${y-10}" x2="260" y2="${y}" stroke="var(--ink2)" marker-end="url(#a16a2)"/><rect x="30" y="${y}" width="460" height="30" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
      <text x="40" y="${y+13}" font-size="11" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${p[0].length>64?p[0].slice(0,62)+'…':p[0]}</text><text x="40" y="${y+25}" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${p[2].length>88?p[2].slice(0,86)+'…':p[2]}</text>`; });
  const yb=40+steps.length*40; s+=`<path d="M490 ${yb-25} h18 V36 h-18" fill="none" stroke="var(--ink2)" marker-end="url(#a16a2)"/><text x="30" y="${yb+16}" font-size="10.5" fill="var(--ink2)">${sub}</text></svg>`;
  return s;
}
function viewSoft(m){
  window[KEYFLAG]=true;
  m.innerHTML=`${card('Front panel (drive it here; the diagrams follow)', `<div id="fp"></div>${controlsHTML()}<p class="small">Front-panel source <select id="fpcopy"><option value="rd23" ${FPCOPY==='rd23'?'selected':''}>RD23 v200w.c — shipped build, “06AV0000”</option><option value="master" ${FPCOPY==='master'?'selected':''}>AMS16 master v200w.c — one save behind, “ 5.0.0.0”</option></select> (only the version screen differs)</p>`)}
  <div class="grid2">${card('Front-panel ATmega128 main loop — v200w.c main()', `<div id="ff"></div>`)}${card('Main-board ATmega128 main loop — ams16.c main()', `<div id="mf"></div>`)}</div>
  <div class="grid2">${card('MULTI button state machine (TRANSLATE_PUSHBUTTONS //MULTI)', `<div id="fsm"></div>`)}${card('Configuration menu (setup 230 … 246)', `<div id="menu"></div>`)}</div>
  <div class="grid2">${card('How the buttons did things — control → code → wire', `<div id="btn"></div>`)}${card('UART frames, live (front → main GENERAL_COM)', `<div id="uart"></div>`)}</div>
  <div class="grid2">${card('Register block ALTERA_BUFFER_out[40], live', `<div id="reg"></div>`)}${card('SHARC SampleIRQ data flow (sample.c), live', `<div id="dsp"></div>`)}</div>`;
  const draw=()=>{
    const t=SIM.t; m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    const fs=fpStepAt(t), ms=mbStepAt(t);
    m.querySelector('#ff').innerHTML=flowSVG(FP_STEPS,FP_FRAC,fs.k,'main(): initialization, RECALL_MODE_FROM_EEPROM, DATA_initialization',`while(1), ≈472 µs per pass · pass #${fs.i.toLocaleString()}`);
    m.querySelector('#mf').innerHTML=flowSVG(MB_STEPS,MB_FRAC,ms.k,'main(): port/watchdog/uart init, resets, initAlteraSpi, gs2970AInit',ms.p.stall?'<tspan fill="var(--bad)">blocked inside resetAndInit() (new SDI lock)</tspan>':`while(1), ≈2.5 ms per pass (inferred) · pass #${ms.p.i}`);
    // FSM
    const cur=modeName(); const node=(x,y,lbl,sub,en)=>`<g><rect x="${x-62}" y="${y-26}" width="124" height="52" rx="26" fill="${cur===lbl?'var(--accent)':'var(--panel2)'}" stroke="${en?'var(--line)':'var(--bad)'}" stroke-dasharray="${en?'':'4 3'}" stroke-width="2"/><text x="${x}" y="${y-2}" text-anchor="middle" font-size="12.5" font-weight="700" fill="${cur===lbl?'#fff':'var(--ink)'}">${lbl}</text><text x="${x}" y="${y+14}" text-anchor="middle" font-size="10" fill="${cur===lbl?'#fff':'var(--ink2)'}">${sub}</text></g>`;
    m.querySelector('#fsm').innerHTML=`<svg viewBox="0 0 480 250" style="width:100%"><defs><marker id="a16a3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      ${node(90,60,'Demux',sourceText().trim(),true)}${node(390,60,'Dolby','Dlby '+(D.dolby_setup?'Yes':'No'),D.dolby_setup)}${node(390,190,'Multi','Mlti '+(D.downmix_setup?groupStart():'No'),!!D.downmix_setup)}${node(90,190,'Summing','Sum '+(D.summing_setup?'Yes':'No'),D.summing_setup)}
      <path d="M152 60 H326" stroke="var(--ink2)" marker-end="url(#a16a3)"/><path d="M390 86 V162" stroke="var(--ink2)" marker-end="url(#a16a3)"/><path d="M326 190 H154" stroke="var(--ink2)" marker-end="url(#a16a3)"/><path d="M90 164 V88" stroke="var(--ink2)" marker-end="url(#a16a3)"/>
      <path d="M140 80 Q240 125 340 172" stroke="var(--ink2)" stroke-dasharray="3 3" fill="none" marker-end="url(#a16a3)"/><text x="240" y="50" font-size="10" text-anchor="middle" fill="var(--ink2)">MULTI (if Dlby)</text><text x="240" y="208" font-size="10" text-anchor="middle" fill="var(--ink2)">MULTI (if Sum, else → Demux)</text><text x="200" y="128" font-size="10" fill="var(--ink2)">skips disabled modes</text>
      <text x="10" y="242" font-size="10.5" fill="var(--ink2)">INPUT 1/2 always returns to Demux · leaving setup drops a mode that was just disabled</text></svg>`;
    // menu
    const items=[]; for (let s_=230;s_<=246;s_++) items.push(s_);
    m.querySelector('#menu').innerHTML=`<svg viewBox="0 0 480 230" style="width:100%">${items.map((s_,j)=>{ const x=10+(j%6)*78, y=14+Math.floor(j/6)*64, on=D.screen==='SETUP_SCREEN'&&D.setup===s_;
        const save=D.setup; D.setup=s_; const txt=setupText(); D.setup=save;
        return `<rect x="${x}" y="${y}" width="72" height="50" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+36}" y="${y+18}" text-anchor="middle" font-size="11" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${SETUP_SHORT[s_]}</text><text x="${x+36}" y="${y+36}" text-anchor="middle" font-size="10" font-family="var(--mono)" fill="${on?'#fff':'var(--ink2)'}">${txt.trim().replace(/^\S+\s+/,'')}</text><text x="${x+36}" y="${y+47}" text-anchor="middle" font-size="8" fill="${on?'#eef':'var(--ink2)'}">${s_}</text>`; }).join('')}
      <text x="10" y="212" font-size="10.5" fill="var(--ink2)">Enter: hold INPUT 1 + 2, press VOLUME · press = next item (wraps 246 → 230)</text><text x="10" y="226" font-size="10.5" fill="var(--ink2)">turn = change value · turn on Exit = leave · idle 50 000 passes ≈ 23.6 s</text></svg>`;
    // buttons table
    m.querySelector('#btn').innerHTML=`<table class="kv"><tr><th>Operator</th><th>Front-panel code</th><th>On the wire → effect</th></tr>
      <tr><td>Pair button n</td><td class="mono small">PINB bit (7,5,3,1,6,4,2,0) → TRANSLATE_PUSHBUTTONS: monitor = 1&lt;&lt;(n−1), preset = n (toggle in Summing)</td><td class="small">'G' monitor&amp;0x0F, 'M' monitor&amp;0xF0 → input_monitor → out[14]/[15] → SHARC sums those pairs; tally lamp via the LED chain</td></tr>
      <tr><td>SOLO L / R</td><td class="mono small">PINE bit 5 / 3 → preset_selector, preset_monitor_array[]</td><td class="small">'G' byte 17 → channel_monitor → out[10] → Rspkr = Lspkr / Lspkr = Rspkr</td></tr>
      <tr><td>MULTI</td><td class="mono small">PIND bit 4 → Demux → Dolby → Multi → Summing</td><td class="small">'M' bytes → raw_multi_mode, summing_mode, dolby_mode → out[8,9,12,13,16–19]</td></tr>
      <tr><td>INPUT 1 / 2</td><td class="mono small">PIND bit 1 / 0 → input_number, back to Demux, preset 1</td><td class="small">'E' byte 7 → input → changeInput(): VIDEO_1 BIT6 (SDI_SEL); volume_reset mutes ≈ 7 frames; relock → resetAndInit</td></tr>
      <tr><td>Turn VOLUME</td><td class="mono small">PINF A/B → encoder_action1 → LEFT_ENCODER_UPDATE: volume ±1</td><td class="small">VOLUME_COM 'F' hhh ttt ooo → volume_level → out[5] → volume[] table → RampAudioCalc</td></tr>
      <tr><td>Press VOLUME</td><td class="mono small">PINE bit 2 → TRANSLATE_ENCODER1: mute toggle / next setup item / enter setup with INPUT 1+2</td><td class="small">mute → digits sent as "FFF" → volume_level 0</td></tr>
      <tr><td>Leave it alone</td><td class="mono small">ACTIVITY_MONITOR; save counter</td><td class="small">display back to the mode after 5000 passes; EEPROM save after 31 752 passes</td></tr></table>
      <p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none yet'}</b></p>`;
    // UART frame
    const b=regBlock(); const g=[['#','23'],['A','41'],['B','42'],['D','44'],['dn',hx(D.dialnorm_settings)],['E','45'],['src','04'],['in',hx(0x30+D.input_number)],['F','46'],
      ...(D.mute?['F','F','F']:String(D.volume).padStart(3,'0').split('')).map((d,i)=>['v'+i,D.mute?'46':hx(+d)]),
      ...(D.output==='FIXED'?'061':String(D.mute?0:D.volume).padStart(3,'0')).split('').map((d,i)=>['e'+i,hx(+d)]),
      ['G','47'],['mon',hx(D.monitor&0x0F)],['sel',hx(b[10])],['P','50'],['pre',hx(b[7])],['S','53'],['spk',hx(D.speaker?1:0)],['Y','59'],['cal',hx(calibration())],['M','4D'],['mlt',hx(D.multi_mode?1:0)],['sum',hx((D.monitor&0xF0)|(D.summing_mode?1:0))],['dby',hx(D.dolby_mode?1:0)],['dmx',hx((D.downmix_setup-1)&0xFF)],['lr',hx(DOWNMIX_SETTINGS)],['N','4E'],['a12',hx((D.analog_output_selector[2]<<4)|D.analog_output_selector[1])],['a34',hx((D.analog_output_selector[4]<<4)|D.analog_output_selector[3])],['byp',hx(D.aes_bypass)],['mm',hx((D.aes8_ltrt<<4)|D.monitor_mode)],['$','24']];
    const fr=frameAt(t); const bi=Math.floor((t-fr.t0)/SLOT);
    m.querySelector('#uart').innerHTML=`<div class="mono small" style="display:flex;flex-wrap:wrap;gap:3px">${g.map((x,i)=>`<span style="border:1px solid var(--line);border-radius:4px;padding:1px 4px;${fr.type==='GENERAL'&&i===bi?'background:var(--accent);color:#fff':''}" title="byte ${i}"><span class="muted">${x[0]}</span> ${x[1]}</span>`).join('')}</div>
      <p class="small muted">Now on the wire: <b>${FRAME[fr.type].name}</b> byte ${bi}. One byte goes out every 11 panel passes (${SIM.fmtDur(SLOT)}), so a 36-byte frame takes ${SIM.fmtDur(frameLen('GENERAL'))}. The main board answers with 20 bytes: <span class="mono">#  A Dformat  B configuration  C ProgramNumber dialnorm  D mixlevel  R frame_rate  T data_rate  X dolby_mode_active  (0xFF)  S sdi_format  $</span>. Byte 16 is always 0xFF (see Findings).</p>`;
    const names=['REG1 "SYNC"','REG2 status · volume · ext vol · inputs_selected','REG3 raw_multi · summing · channel_monitor · calibration','REG4 multi|start · cat|dmx|dn · input_selector · input_tally','REG5 0 · bypass/ltrt/5.1 · An4|An3 · An2|An1','REG6','REG7','REG8','REG9','REG10'];
    m.querySelector('#reg').innerHTML=`<table class="kv">${names.map((n,r)=>`<tr><th>${n}</th><td class="mono">${b.slice(r*4,r*4+4).map(hx).join(' ')}</td></tr>`).join('')}</table>
      <p class="small muted">Read back from the FPGA in the same exchange: in[24] bit 7 sd_hd, bit 6 smpte, bit 5 Audio_sync_flag · in[26] SD clock phase · in[27] Astatus (pairs present) · in[28–31] SD sample counts · in[35] Dolby status. Bytes 20–39 are sent as zeros.</p>`;
    const sp=speakerAt(t), gg=gainAt(t), lr=ltrt(t);
    const box=(x,y,w,t1,t2,hot)=>`<rect x="${x}" y="${y}" width="${w}" height="44" rx="6" fill="${hot?'color-mix(in srgb,var(--accent) 20%,var(--panel2))':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+w/2}" y="${y+18}" text-anchor="middle" font-size="10.5" fill="var(--ink)">${t1}</text><text x="${x+w/2}" y="${y+34}" text-anchor="middle" font-size="9.5" fill="var(--ink2)">${t2}</text>`;
    const ar=(x1,y1,x2,y2)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" marker-end="url(#a16a4)"/>`;
    m.querySelector('#dsp').innerHTML=`<svg viewBox="0 0 480 270" style="width:100%"><defs><marker id="a16a4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      ${box(10,10,120,'TDM in → float','16 ch × 24 bit',true)}${ar(130,32,160,32)}${box(160,10,150,'Lt/Rt from start pair','i = in[3] bits 24–27',D.multi_mode||D.dolby_mode)}${ar(310,32,340,32)}${box(340,10,130,'meters 15/16 = Lt/Rt','if A8 LtRt or Dolby',(D.aes8_ltrt&&(D.multi_mode||D.dolby_mode))||D.dolby_mode)}
      ${ar(70,54,70,80)}${box(10,80,140,'PhaseMeterCalc · VUMeterCalc','all 16 ch (before muting)',true)}${ar(150,102,180,102)}${box(180,80,140,'mute Dolby pairs','in[8] DD bits (not in Dolby mode)',flags().dd&&!D.dolby_mode)}${ar(320,102,340,102)}${box(340,80,130,'Lsum / Rsum','pairs in tally 0x'+hx(D.monitor),true)}
      ${ar(405,124,405,150)}${box(330,150,140,'Lspkr/Rspkr = Lt/Rt?','if tally == multi_mask',(D.multi_mode||D.dolby_mode)&&D.monitor===groupMaskFor())}${ar(330,172,300,172)}${box(150,150,150,'solo: channel_monitor',selName(D.preset_selector),D.preset_selector!=='LR')}${ar(150,172,120,172)}${box(10,150,110,'× speaker_gain',gg>0?(20*Math.log10(gg)).toFixed(1)+' dB':'−∞',true)}
      ${ar(65,194,65,218)}${box(10,218,200,'out[16/17] → speakers / MONITOR','L '+(10*Math.log10(sp.L*gg*gg+1e-12)).toFixed(1)+' · R '+(10*Math.log10(sp.R*gg*gg+1e-12)).toFixed(1)+' dBFS',true)}${box(230,218,240,'out[0…15] × output_gain → AES 1–8','O/P '+(D.output==='FIXED'?'Fix (0 dB)':'Var')+(D.monitor_mode?' · 5.1 branch':''),true)}</svg>
      <p class="small muted">Lt/Rt now ≈ ${(10*Math.log10(lr.L+1e-12)).toFixed(1)} / ${(10*Math.log10(lr.R+1e-12)).toFixed(1)} dBFS rms. Every ${SIM.fmtDur(1/48000)}: SampleIRQ. In the background loop: refresh_data() ramps the gains (RampAudioCalc), and refresh() drives one LED row per 1 ms.</p>`;
  };
  bindControls(m); SIM.on('time', draw);
  const fc=m.querySelector('#fpcopy'); if (fc) fc.onchange=e=>{ FPCOPY=e.target.value; SIM.refresh(); };
}

/* ---------------- findings ---------------- */
function viewFindings(m){
  window[KEYFLAG]=false;
  const f=(h,b)=>`<li><b>${h}</b> ${b}</li>`;
  m.innerHTML=card('What the AMS16 firmware is up to — findings from the source', `<ol>
   ${f('Corrected 2026|59: the model now runs the shipped front panel.', 'The front-panel <span class="mono">v200w.c</span> in the master folder\'s v700 release is one save behind the shipped build: RD23\'s copy builds <span class="mono">VersionDis = "06AV0000"</span>, the firmware named on the 30 Oct 2012 test report (<span class="mono">AMS16-2AEM-06AV0000-30OCT12.pdf</span>), while the master copy has <span class="mono">" 5.0.0.0"</span> (REVISION1–4) and is byte-identical to RD23\'s <span class="mono">v200w._c</span> backup. The two differ only in <span class="mono">VersionDis[]</span> and <span class="mono">InputDis[]</span>. The version screen now shows 06AV0000 by default; the Software tab can switch back to the master copy (see rd23-ams16-3g.js).')}
   ${f('The front panel runs the show; the main board just copies.', 'All the operating logic is in <span class="mono">v200w.c</span> (15 472 lines, front-panel ATmega128): modes, monitor selection, solo, the menu. It sends its whole state as a 36-byte <span class="mono">GENERAL_COM</span> frame, one byte every 11 loop passes, so a change needs ≈ 0.19–0.38 s to reach the main board (<span class="mono">UART1_transmit_counter</span>, <span class="mono">Transmit_Counter 10</span>). The main board (<span class="mono">ams16.c</span>) re-packs it into the FPGA block in <span class="mono">ALTERA_SORT</span>. The “Last action” lane on the Simulator tab shows the delay.')}
   ${f('An assignment where a comparison was meant.', '<span class="mono">uart0.c UART0_translate</span>: <span class="mono">if ((rx_buffer[0] == chF) &amp;&amp; (index2 = 4))</span>. The F-frame parser sets <span class="mono">index2</span> to 4 instead of testing it, so the external-volume field is always taken.')}
   ${f('Volume frames are parsed by accident.', 'The main board looks for the input number after an <span class="mono">E</span> at <span class="mono">rx_buffer[9]</span>, but the panel sends the input number itself there (<span class="mono">VOLUME_COM</span> byte 10). <span class="mono">index2</span> never reaches 10, so the frame\'s own clean-up branch never runs. The frame is only cleared by the general “not a valid response” else-branch. Volume still works; the input number in volume frames is ignored.')}
   ${f('The main board never sends “K”.', 'In <span class="mono">UART0_transmit_counter</span> the <span class="mono">uart_tx_data0 == 17/18</span> tests sit inside the <span class="mono">extended_bitstream_request</span> if-chain of byte 16. <span class="mono">extended_bitstream_request</span> is never assigned on the main board, so byte 16 is always <span class="mono">NOT_AVAILABLE</span> (0xFF) and <span class="mono">analog_available</span> is never transmitted.')}
   ${f('changeInput() wipes the video flags.', '<span class="mono">ams16.c changeInput()</span> writes <span class="mono">ALTERA_REG_VIDEO_1</span> with only BIT6 (SDI_SEL). That clears the 3G (BIT4), SD (BIT0), LOCK50 (BIT3) and 3G-B audio-disable (BIT7) bits that <span class="mono">writeVideo1Reg()</span> set. They come back only on pass 10 after the next <span class="mono">resetAndInit()</span>, which the relock on the new input normally triggers.')}
   ${f('Comments disagree with the counters.', '<span class="mono">countLoopsAfterReset()</span> says “on the 3rd loop after each reset” and “until the 45th loop”, but the code acts at pass 10 and unlocks at pass 75.')}
   ${f('Two of the three link checks are ignored.', '<span class="mono">error0 = ALTERA_ALIGNMENT_CHECK()</span> and <span class="mono">error2 = SD_CLOCK_PHASE_CHECK()</span> are computed every pass but never used. Only <span class="mono">error1</span> (TDM audio sync lost and video locked) does anything: <span class="mono">SHARC_RESET(1000)</span>. Compare POD33, which deliberately lets the watchdog reboot it on an alignment error.')}
   ${f('3G level B is treated as “No Lock” on purpose.', '<span class="mono">writeVideo1Reg()</span> sets VIDEO_1 BIT7 (“active high disables audio input”) for <span class="mono">LOCK_3GB</span>, and <span class="mono">PROCESS_AUDIO_SOURCE</span> (“Adam Add”) shows <span class="mono">&nbsp;No Lock</span> for <span class="mono">FORMAT_3GB</span>. The “3GB-SDI” text is commented out. Try IN1 = 1080p 3G level B. <span class="mono">gs2970AReadVidInfo()</span> also maps the reserved rate code 3 to SD.')}
   ${f('Six screen names share the value 255.', '<span class="mono">MODE_SCREEN, REFERENCE_SCREEN, DIALNORM_SCREEN, MONITOR_SCREEN, DIM_SCREEN, FAVOURITE_SCREEN</span> are all <span class="mono">#define</span>d as 255, left over from the AMS8/AMS4E code. The menu only runs 230…246, so their branches in <span class="mono">LEFT_ENCODER_UPDATE</span> and <span class="mono">UPDATE_DISPLAY</span> are dead code. The same goes for <span class="mono">DOWNMIX_SELECT_SCREEN</span> (254): the Lt/Ro selection (<span class="mono">downmix_settings</span>) has no menu entry and stays at Lt/Rt.')}
   ${f('Settings are saved 15 s after the first change, not after a minute of quiet.', 'Manual 4.1: “stored in the eeprom after one minute of inactivity”. Code: <span class="mono">SAVE_SETTINGS_CONSTANT 31752 //15 sec</span>. <span class="mono">save_settings_count</span> counts passes while <span class="mono">data_change</span> is set outside setup, and later changes don\'t restart it.')}
   ${f('“Dn Enbd” stores NO.', '<span class="mono">PROCESS_DIALNORM_SETTINGS_INFORMATION</span> shows <span class="mono">Enbd</span> when <span class="mono">dialnorm_settings == NO</span> and <span class="mono">Dsbd</span> when YES. The value goes to the FPGA as bit 4 of byte 13. Whether the FPGA treats 0 as “enabled” is not traced, but the label is the inverse of the variable name.')}
   ${f('“Mute” only shows for 2.4 s.', 'Pressing the knob shows <span class="mono">mute_temp</span>. <span class="mono">ACTIVITY_MONITOR</span> then times out the <span class="mono">VOLUME_SCREEN</span> after 5000 passes (≈2.4 s) and goes back to the mode text, although the audio stays muted. The manual says the read-out displays Mute while muted.')}
   ${f('Changing input mutes the speakers for about a second.', 'uart0.c: a new input number sets <span class="mono">volume_reset = YES</span>, and <span class="mono">ALTERA_SORT</span> then sends volume 0. Only after <span class="mono">INPUT_STABLE_COUNT</span>+2 frames with the same input (≈1.3 s) does it clear. The new lock also triggers <span class="mono">resetAndInit()</span>, which blocks the main loop for ≈0.62 s (8 × <span class="mono">wait(50000)</span> at 700 iterations per ms, from <span class="mono">waitMillis</span>).')}
   ${f('Changing Dn or Mlti mutes everything for one frame.', '<span class="mono">ALTERA_SORT</span> compares <span class="mono">dialnorm_settings / downmix_settings</span> with the previous values. On a change it zeroes <span class="mono">volume_level</span> and <span class="mono">ext_volume_level</span> and sets <span class="mono">speaker_mute</span> until the next panel frame restores them: a click guard.')}
   ${f('Meters see Dolby, speakers don\'t.', 'In <span class="mono">sample.c</span>, <span class="mono">VUMeterCalc</span> runs before the loop that zeroes Dolby pairs, so a Dolby E/AC-3 pair reads near full scale while it is muted. That matches the AMS16-2AM manual (“level indication goes to full scale and that signal is automatically muted”). The mute loop runs <span class="mono">k = 0…16 step 2</span>: nine pairs. The ninth would clear the sum slots 16/17, but it tests bit 0x100 of an 8-bit flag, so it never fires.')}
   ${f('The correlation meter can freeze in Multi.', '<span class="mono">get_phase_data()</span> recognises the tally 0x07 (pairs 1–3) as multi mode and single-pair tallies, but not 0x0E, 0x1C…, the groups for Mlti 2…6. With any other start pair, <span class="mono">phase_result_select</span> keeps its last value.')}
   ${f('The LED board is wired “wrong” and fixed in software.', '<span class="mono">backgnd.c</span> swaps <span class="mono">vu_results</span>/<span class="mono">pk_results</span> 10↔12 and 11↔13 every tick “to match LED board routing”, and the DD/ERR rows for pairs 6 and 7 are swapped (mux_count 4 vs 2).')}
   ${f('Pair-button lamps are dimmed in software.', 'Their tally bits are only shifted out on mux row 7 and then only once in four scans (<span class="mono">pb_dim</span>): 1 ms in every 32 ms.')}
   ${f('How many LEDs per meter?', 'Manual features: “58-segment”. Manual cover: “46 LED”. Panel BOM: 168 green + 136 yellow + 80 red, i.e. 21 + 16 + 9 = 46 per bar on an 8-bar board once the 8 DD and 8 ERR LEDs are taken out. Firmware: 42 bits per bar (<span class="mono">rlm24_vu_data1</span> 26 + <span class="mono">rlm24_vu_data2</span> 16). How the remaining four LEDs are driven is not in the code. The simulator draws the 42 the firmware drives.')}
   ${f('A 3 dB alignment that is right.', 'The segment tables put the 0 LED at a VU result of −23 dB. That is where a −20 dBFS <i>peak</i> sine sits on an RMS meter, so the “−20 dBFS = 0” in the manual holds for tone. Cal adds 4 half-dB steps per click (<span class="mono">calibration</span> 0, 4 … 20 → SHARC <span class="mono">cal = altera_data_in[2] &amp; 0x1F</span>).')}
   ${f('Leftovers.', 'The DSP project is still <span class="mono">rlm24.dpj</span> (RLM24 meter) with <span class="mono">ams81_volume_table.dat</span>, and <span class="mono">version.h</span> says 0.1. The silence sensor (<span class="mono">SSensor.asm</span>, <span class="mono">SS_tallies</span>) is linked but its init is commented out. The panel still carries mix/preset/voice-over code (<span class="mono">PROCESS_GAIN_SOURCESA…D</span>, <span class="mono">mode5.c</span>) from other products, behind <span class="mono">#ifdef AMS16_1</span> and unused screens. <span class="mono">dolby_settings</span> also doubles as the “last pair in Demux” memory, and <span class="mono">preset = temp+0x30; preset = NO0;</span> is a dead assignment.')}
   ${f('Summing is cleared before it is tested.', 'In both SDI branches of <span class="mono">TRANSLATE_PUSHBUTTONS</span>: <span class="mono">summing_mode = NO;</span> then <span class="mono">if ((dolby_mode == NO) &amp;&amp; (summing_mode == NO) …) dolby_settings = preset;</span>. Leaving Summing with an INPUT button therefore stores the summing preset as the Dolby/Demux memory.')}
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
   <li>Main-board pass ≈ 2.5 ms (${inf}). The front-panel pass (472 µs) is derived from the source comment.</li>
   <li>UART frames run back to back, with one idle slot each ${inf}. VOLUME_COM frames are sent while the volume screen is active.</li>
   <li>GS2970A relock time (30 ms), the LED 1/8 duty and the PhaseMeterGet → LED scaling are ${inf}.</li>
   <li>In Multi/Dolby, pair buttons 2–8 are assumed to follow the AES 1 branch (only that branch was read in full) ${inf}. In Dolby mode the decoded programme is shown on meters 1–8, per manual table 3.1-1; its levels are ${inf}.</li>
   <li>Programme levels and envelopes on the two inputs are test content ${inf}. Meter ballistics are computed on a 1 ms grid from the vumeter.asm time constants. PPM uses the envelope peak.</li>
   <li>The 1RU AMS16A1 (16 bars in 1RU, no speakers per the photos) is not modelled. This is the 2RU AMS16A2 with the v700 3G firmware.</li></ul>`)
  + card('Sources', `<ul class="small mono">
   <li>AMS16 - #Master/AMS16 - #Engineering/AMS16A - #software/AMS16-3G v700 October 24 2012/ — Atmel Main Board (ams16.c, altera.c, uart0.c, gs2970a.c, dolby.c, common.c, altspi.h), Atmel Front Panel (v200w.c, common.c, SIEMENS8.c), Sharc (backgnd.c, sample.c, timer.h, vumeter.asm, rlm24_vu_data.c, volume_data.c, RampAudio.c), Altera (AMS16TEST.qsf)</li>
   <li>…/AMS16 - #Manual/AMS16-2AEM/AMS16-2AEM Manual.pdf · …/AMS16-2AM/AMS16-2AM-V1005-Manual.pdf</li>
   <li>…/AMS16A - #PCB/AMS16A-3-4/AMS163G-ISS7-BOM.xls · …/AMS16A-5-6-7/AMS16A-5-6-PANEL.bom</li>
   <li>AMS16 - #ARTWORK #DA #2016/AMS16A2-M1-FRONT-SILK (CURVE).cdr · AMS16AQ-3G-M2-SILK (curve).pdf · Pics/AMS16 Series Front.jpg · Pics/AMS16-2AEM Rear.jpg</li></ul>`);
}

/* ---------------- register ---------------- */
SIM.register({
  id:'ams16', name:'AMS16 · 16-channel SDI audio monitor (2008|41)', duration:1,
  product:'AMS16', year:2008, family:'AMS16 (AMS16A1 / AMS16A2)', folder:'AMS16 - #Master',
  summary:'2RU embedded-audio monitor: de-embeds 8 AES pairs from SD/HD/3G-SDI onto 16 LED VU/PPM meters, with speakers, solo, summing, Lt/Rt downmix and Dolby E/AC-3 decoding. Four processors: front-panel ATmega128 (UI), main ATmega128 (SDI and FPGA control), Cyclone IV FPGA (de-embedding, AES out) and ADSP-21262 SHARC (metering, mixing, LED drive).',
  highlights:['Front and rear panels on the real 2015|48 silkscreen','13-step operator tutorial from the manual','Button → panel MCU → RS-485 frame → main MCU → FPGA → SHARC trace with timing','LED multiplex, UART frames and meter ballistics in slow motion','22 findings: parser bugs, dead screens, manual-vs-code mismatches'],
  depth:'Full model',
  stepUnits:[
    {label:'1 SDI frame', period:()=>{ const v=vid(); return v.f? v.f.frame : 1001/30000; }},
    {label:'1 UART frame (GENERAL_COM)', period:()=>frameLen('GENERAL')},
    {label:'1 UART byte slot', period:()=>SLOT},
    {label:'1 main-board pass', period:()=>C.MB_PASS},
    {label:'1 LED mux row (1 ms)', period:()=>C.MUX_T},
    {label:'1 front-panel pass', period:()=>C.FP_PASS},
    {label:'1 audio sample', period:()=>1/C.FS},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.4,'400 ms (2 UART frames)'],[0.1,'100 ms'],[1001/30000,'1 frame (33 ms)'],[0.008,'8 ms (LED scan)'],[0.002,'2 ms'],[0.0005,'500 µs (1 panel pass)'],[0.0001,'100 µs (5 samples)']],
  defaultZoom:0,
  init(){ METER_KEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the AMS16', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
