/* =====================================================================
   AMS8-1A — 1RU eight-channel aural / visual audio monitor (Ward-Beck Systems)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Modelled build: the "06VA000x" firmware set for the AMS8E-1 Issue 5 main board, as listed in
   AMS8-1 - #TESTREPORT/AMS8-1A-06VA0002-18MAY16.pdf (main MC V050001, FPGA v050000, DSP v205, front MC V040002).
   Sources used (all under "AMS81 - #Master/AMS8 - #Engineering/AMS8 - #Software/"):
   - …#Atmel #Ams8e-5 #V040002/v200w.c, control.c, uart.c, common.c/.h, SIEMENS8.c, AMS8-5.c   (front panel MCU)
   - …#Atmel #Ams8e-1 #V050001/v200w.c, altspi.c, AESAudio.c, dolby.c, common.h, bootloader.s (main board MCU)
   - …#Altera #V050100/AMS81.qsf, AMS81.bdf, AMS81.sdc, spicontrol.v, brightness_ctl.vhd, shift_in32.vhd
   - …#Sharc #v205/ams81_main.asm, ams81_INIT.ASM, vumeter.asm, phasemeter.asm, ams81_vu_data.dat, ams81_volume_table.dat
   - AMS8 COMMUNICATION PROTOCOL #software.doc, AMS8-1 ISSUE 4 Operational Info.doc
   - AMS8 - #Manual/AMS81 Operators Instructions version 2117 updated Oct 16 2014.doc (and version 2113)
   - AMS8E - #Master: AMS8E-1 ISS5 - ALTIUM.csv (BOM), AMS8E-4-PCAD.csv (meter board BOM), Production Notes
   - Panels: AMS81 - #ARTWORK #DA #2016/AMS8-1A-FRONT-SILK (CURVES).cdr, AMS8-M6-SILK(MLC8-M3) (CURVE).cdr,
     AMS8-M2-Rear-SILK(Curve).cdr; colours and layout checked against Pics/AMS8-1A (AMS8-M24)Front.jpg, AMS8-1A Rear(AMS8-M2).jpg
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;

/* ---------------- constants from the source ---------------- */
const C = {
  FS: 48000,                 // sysdef.h: 48 kHz; vumeter.asm constants "assume a sample rate of 48Khz"
  FP_PASS: 3/9000,           // front-panel loop pass — INFERRED: PRESET_DEBOUNCE 9000 passes ≈ the manual's "approximately three seconds"
  MB_PASS: 0.004,            // main-board loop pass — INFERRED from the 80-byte bit-banged chain at 4.9152 MHz (see Findings)
  TX_EVERY: 25,              // Transmit_Counter 25 (front, common.h; earlier 200/100/50 are commented out)
  MB_TX_EVERY: 3,            // main board: UART0_transmit_counter sends one byte every 3 loops
  BYTE_T: 10/9600,           // UBRR0 = 0x1F at 4.9152 MHz → 9600 Bd, 8N1 = 10 bit times
  SHIFT_HZ: 320,             // SHARC Timer1 period 153600 cycles — INFERRED core clock 49.152 MHz (sysdef.h says 60 MHz → 390.6 Hz)
  NO_ACT: 5000,              // NO_ACTIVITY_THRESHOLD (passes)
  PRESET_HOLD: 9000,         // PRESET_DEBOUNCE (passes)
  COMM_BACK: 1000,           // CHANGE_COMMUNICATION_THRESHOLD (passes)
  RAMP_TC: 0.019999,         // ams81_main.asm gain ramp per background pass (≈ per sample)
  TC_VU: 0.000319752,        // vumeter.asm TCONST_VU (0.6 s for 40 dB)
  TC_PA: 0.02276277,         // TCONST_PPM_ATTACK (8.33 ms)
  TC_PD: 0.000031978,        // TCONST_PPM_DECAY (6 s for 40 dB)
  WMS: 808/4.9152e6,         // one wait_ms “ms”: 8 cycles × 100 + 8 = 808 cycles at 4.9152 MHz ≈ 164 µs (v200w.lis, see rd60-ams81a-iss5.js)
  SDI_STALL: 1500*808/4.9152e6, // main loop: wait_ms(1000) + wait_ms(500) on an SDI lock rising edge ≈ 247 ms
};
const CAL_DATA = [-4,0,4,8,12,16,20,-1];   // ams81_main.asm cal_data[8]
const LED_UPPER = [12,16,20,24,28,32,34,36,38,40,42,44,46,48,52,56,60,64,74,82,94,114]; // ams81_vu_data.dat breakpoints
const SEG_LABEL = ['14','12','10','8','6','4','3','2','1','0','1','2','3','4','6','8','10','12','16','20','26','34']; // M6 lens, top→bottom
const SRC = {AES75:1, AES110:2, ANALOG:3, SDI12:4, SDI34:5};           // common.h source codes
const SRC_NAME = {1:'AES75', 2:'AES110', 3:'ANALOG', 4:'SDI12', 5:'SDI34'};
const SIG_TYPES = ['off','tone','prog','dolbyE','ac3'];
const SIG_NAME = {off:'nothing connected', tone:'PCM tone 1 kHz', prog:'PCM programme', dolbyE:'Dolby E 5.1+2', ac3:'Dolby Digital 3/2L'};
const FW = { front:'06VA0002', mainMC:'V050001', fpga:'V050000', dsp:'v205' };
const OMEGA = 'Ω';

/* ---------------- device state ---------------- */
function freshState(){
  return {
    power: true,
    opts: { dolby:false, demux:false },        // 1A = no Dolby card, no demux (1AEM/1BAEM/1CAM add them)
    mode: 2,                                   // MODE2 = NORMAL_OPERATION (default without a Dolby decoder, manual)
    reference: 0,                              // 0 Int, 1 75Ω, 2 110Ω   (Ref screen)
    out4: 0, dn: 1, volSetup: 30, opFix: 0, cal: -20, spkr: 1,
    source: SRC.AES75, inputNo: 1,             // input bank + INPUTS button (input_number)
    preset: null,                              // 'A'..'D' or null
    prologic: false, infoPage: 0,
    volume: 30, muted: false, muteLevel: 30,   // VOLUME_START_UP = 30 (= −31 dB)
    screen: 'INFO',                            // screen_display
    idle: 0,                                   // simulated seconds since the last user action (ACTIVITY_MONITOR)
    transient: null,                           // {text, until} e.g. "  SAVED " for 500 ms
    sys: 0,                                    // System menu: 0 System 1 Inputs 2 Assigns 3 Firmware 4 Exit
    setup: 1,                                  // setup item 0 Exit 1 Mode 2 Ref 3 Out4 4 Dn 5 Vol 6 O/P 7 Cal 8 Spkr
    inputsItem: 1, inEnable: { 1:true, 2:true, 3:false, 4:false, 5:false },
    assigns: ['75-1','75-2','75-3','75-4'], assignIdx: 0,
    mix: { A:mixInit(1), B:mixInit(2), C:mixInit(3), D:mixInit(4) },   // gains in dB, null = Off
    mixEdit: null,                             // {p:'A', side:'L', idx:0, dirty:false}
    in75:  [{type:'tone',lvl:-20},{type:'prog',lvl:-22},{type:'prog',lvl:-30},{type:'off',lvl:-20}],
    in110: [{type:'prog',lvl:-18},{type:'off',lvl:-20},{type:'off',lvl:-20},{type:'off',lvl:-20}],
    refIn: false,
    sdiLock: false,
    lanesCh: 2,
    log: [], last: null,
  };
}
function mixInit(k){ const L=new Array(8).fill(null), R=new Array(8).fill(null); L[2*(k-1)]=0; R[2*(k-1)+1]=0; return {L,R}; }   // INFERRED default: preset k = pair k
let D = freshState();

/* ---------------- signals and what reaches the SHARC ---------------- */
function bank(){ return D.source===SRC.AES110 ? D.in110 : D.in75; }
function bankName(){ return D.source===SRC.AES110 ? '110'+OMEGA : '75'+OMEGA; }
function selIn(){ return bank()[D.inputNo-1]; }
function isDolby(s){ return s.type==='dolbyE' || s.type==='ac3'; }
/* Dformat as the main board computes it (v200w.c ~5852): 0 no lock, 1 PCM, 2 DD, 3 Dolby E; modes 2/6 only 0 or 1 */
function dformat(){
  const s = selIn(); if (!s || s.type==='off') return 0;
  if (D.mode===2 || !D.opts.dolby) return 1;
  return s.type==='dolbyE' ? 3 : s.type==='ac3' ? 2 : 1;
}
/* Deterministic programme envelope (peak amplitude, linear). INFERRED test material, not from the archive. */
function progEnv(seed, t, lvl){
  const base = Math.pow(10, lvl/20);
  let a = base*(0.55 + 0.30*Math.sin(2*Math.PI*(0.7+0.13*seed)*t + seed) + 0.15*Math.sin(2*Math.PI*3.1*t + 2*seed));
  const per = 0.25 + 0.04*seed, ph = (t + 0.05*seed) % per, k = ph < 0 ? ph+per : ph;
  a *= 1 + 2.2*Math.exp(-k/0.03);
  return Math.min(1, Math.max(0, a));
}
/* What each meter channel CH1..CH8 carries (TDM_IN_audio slots 0..7 = router outputs) */
function chSource(ch){
  const b = bank();
  if (D.mode===1 && D.opts.dolby){
    const s = selIn(); if (!s || s.type==='off') return null;
    if (isDolby(s)){
      const lv = [-20,-20,-18,-26,-24,-24,-22,-22][ch];
      if (s.type==='ac3' && ch>=6) return null;                // 3/2L: no aux pair
      return {kind:'prog', seed:ch+11, lvl:lv};
    }
    if (D.prologic){ if ([0,1,2,4,5].includes(ch)) return {kind:s.type, seed:ch+3, lvl:s.lvl-(ch>1?6:0)}; return null; }
    return ch<2 ? {kind:s.type, seed:ch+3, lvl:s.lvl} : null;
  }
  const s = b[ch>>1]; if (!s || s.type==='off') return null;
  if (isDolby(s)) return {kind:'data', seed:ch, lvl:-4};       // a Dolby bitstream read as PCM: near full-scale noise
  return {kind:s.type, seed:ch+1+(ch&1)*0.37, lvl:s.lvl-(ch&1?2:0)};
}
function chAmp(src, t){
  if (!src) return 0;
  if (src.kind==='tone') return Math.pow(10, src.lvl/20);
  if (src.kind==='data') return 0.62;
  return progEnv(src.seed, t, src.lvl);
}
function chMs(src, t){ const a=chAmp(src,t); return src && src.kind==='data' ? a*a : a*a/2; }

/* ---------------- SHARC meter ballistics (vumeter.asm), cached over the second ---------------- */
const MDT = 0.00025, MN = Math.round(1/MDT)+1;
let MCACHE = null, MKEY = '';
function meterKey(){ return JSON.stringify([D.mode,D.opts,D.source,D.inputNo,D.prologic,D.in75,D.in110,D.cal,D.power]); }
function meters(){
  const key = meterKey(); if (key===MKEY) return MCACHE; MKEY = key;
  const n = Math.round(MDT*C.FS);
  const kv = 1-Math.pow(1-C.TC_VU,n), ka = 1-Math.pow(1-C.TC_PA,n), kd = Math.pow(1-C.TC_PD,n);
  const vu=[], pk=[];
  for (let ch=0; ch<8; ch++){
    const src = D.power? chSource(ch) : null, V=new Float32Array(MN), P=new Float32Array(MN);
    let v=1e-12, a=1e-12, d=1e-12;
    for (let i=-8000; i<MN; i++){            // 2 s of history before t = 0 so the meters have settled
      const t=i*MDT, ms = Math.max(1e-12, chMs(src,t));
      v += kv*(ms-v); a += ka*(ms-a); d = Math.max(a, d*kd);
      if (i>=0){ V[i]=v; P[i]=d; }
    }
    vu.push(V); pk.push(P);
  }
  MCACHE = {vu, pk}; return MCACHE;
}
function calIndex(){ return Math.max(0, Math.min(6, (D.cal+22)/2)); }          // Cal −22…−10 → cal_data[0..6]
/* _VUMeterGet: −2·10·log10(x) clamped 0..255 (0.5 dB steps); main adds meter_cal; VU gets an extra −6 */
function meterIndex(ms, isVu){ let i = -20*Math.log10(Math.max(ms,1e-30)); i = Math.max(0, Math.min(255, Math.round(i))); i += CAL_DATA[calIndex()] + (isVu?-6:0); return Math.max(0, Math.min(255, i)); }
function segsLit(idx){ for (let k=0;k<LED_UPPER.length;k++) if (idx<=LED_UPPER[k]) return 22-k; return 0; }
function idxToDb(idx){ return -idx/2; }
function meterAt(ch, t){
  const M = meters(); const i = Math.max(0, Math.min(MN-1, Math.round(t/MDT)));
  const vi = meterIndex(M.vu[ch][i], true), pi = meterIndex(M.pk[ch][i], false);
  return { vuIdx:vi, pkIdx:pi, vu:segsLit(vi), pk:segsLit(pi), vuDb:10*Math.log10(Math.max(M.vu[ch][i],1e-30))+3, pkDb:10*Math.log10(Math.max(M.pk[ch][i],1e-30)) };
}
/* "As seen by the display": shifter runs on Timer1 (320 Hz, inferred). Each tick sends shift_data[k] and [k+4]
   (k = mux_count & 3), so CH k+1 and CH k+5 are refreshed once every 4 ticks (80 Hz). */
function shownAt(ch, t){
  const tick = Math.floor(t*C.SHIFT_HZ); let k = tick;
  while (k>=0 && (k & 3)!==(ch & 3)) k--;
  const tt = k<0 ? 0 : k/C.SHIFT_HZ;
  return meterAt(ch, tt);
}

/* ---------------- display (8-character PDSP1884 / HDSP2533) ---------------- */
function pad8(s){ s=String(s).slice(0,8); while(s.length<8) s+=' '; return s; }
function volText(l){ if (l===0) return '  OFF   '; const db=l-61, a=Math.abs(db), sg=db<0?'-':db>0?'+':' ';
  if (db===0) return '    0 dB'; return '  '+sg+(a>=10?String(a):' '+a)+' dB'; }
function gainText(g){ if (g===null) return 'Off'; if (g===0) return '  0'; const a=Math.abs(g); return (g<0?'-':'+')+(a>=10?String(a):' '+a); }
function sourceText(){
  if (D.source===SRC.AES110) return pad8('110'+OMEGA+(D.mode===2?' L/R':'LoRo')); return pad8('75'+OMEGA+' '+(D.mode===2?'L/R ':'LoRo')); }
function presetText(){
  if (D.mode===1) return D.preset ? pad8('In'+D.inputNo+' Ch'+(1+2*('ABCD'.indexOf(D.preset)))) : pad8('In'+D.inputNo+' LoRo');
  return D.preset ? 'Preset '+D.preset : 'NoPreset';
}
const SETUP_NAMES = ['Exit','Mode','Ref','Out4','Dn','Vol','O/P','Cal','Spkr'];
function setupText(){
  switch (D.setup){
    case 0: return '  Exit  ';
    case 1: return ' Mode '+D.mode+' ';
    case 2: return ['Ref  Int','Ref  75'+OMEGA,'Ref 110'+OMEGA][D.reference];
    case 3: return D.out4? 'Out4 Mon':'Out4 In4';
    case 4: return D.dn? 'Dn  Enbd':'Dn  Dsbd';
    case 5: return pad8('Vol  '+(D.volSetup===30?'-30':volText(D.volSetup).trim().replace(' dB','')));   // initial string is "Vol  -30" (see Findings)
    case 6: return D.opFix? 'O/P  Fix':'O/P  Var';
    case 7: return 'Cal  '+D.cal;
    case 8: return D.spkr? 'Spkr On ':'Spkr Off';
  }
}
const INPUT_ITEMS = [['  Exit  ',0],['75'+OMEGA+'    ',1],['110'+OMEGA+'   ',2],[' Analog ',3],['SDI 1/2 ',4],['SDI 3/4 ',5]];
function infoText(){
  const f = dformat();
  if (f===0) return ' No Lock';
  if (f===1) return D.prologic && D.mode===1 ? 'PCM /PL ' : '   PCM  ';
  const s = selIn(); const pages = s.type==='dolbyE' ? ['E 5.1+2 ','Dn1 -27 ','Dn2 -31 ','Mx1  NAN','Fr 29.97','Dr   NAN'] : ['DD 3/2L ','Dn1 -24 ','Mx1  NAN','Fr   NAN','Dr   384'];
  return pages[D.infoPage % pages.length];
}
function displayText(){
  if (!D.power) return '        ';
  if (D.transient) return D.transient.text;
  switch (D.screen){
    case 'INFO': return infoText();
    case 'VOLUME': return D.muted ? '  Mute  ' : volText(D.volume);
    case 'SOURCE': return sourceText();
    case 'PRESET': return presetText();
    case 'LEFT_MIX': case 'RIGHT_MIX': { const e=D.mixEdit; const g=D.mix[e.p][e.side][e.idx]; return e.p+' '+e.side+(e.idx+1)+' '+gainText(g); }
    case 'SYSTEM': return [' System ',' Inputs ',' Assigns','Firmware','  Exit  '][D.sys];
    case 'SETUP': return setupText();
    case 'INPUTS': { const it=INPUT_ITEMS[D.inputsItem]; return it[1]? pad8(it[0].slice(0,7)+(D.inEnable[it[1]]?'Y':'N')) : it[0]; }
    case 'ASSIGNS': return pad8('A'+(D.assignIdx+1)+'  '+D.assigns[D.assignIdx]);
    case 'FIRMWARE': return FW.front;
  }
  return '        ';
}
/* LEDs: SHIFT_OUT_LEDS shows the `input` byte on the 8 button lamps */
function buttonLeds(){
  const L = { in:[0,0,0,0], pr:[0,0,0,0] };
  if (!D.power) return L;
  if (D.screen==='LEFT_MIX' || D.screen==='RIGHT_MIX'){ const e=D.mixEdit, arr=D.mix[e.p][e.side]; for (let c=0;c<8;c++) if (arr[c]!==null){ if (c<4) L.in[c]=1; else L.pr[c-4]=1; } return L; }
  L.in[D.inputNo-1] = 1;
  if (D.preset) L.pr['ABCD'.indexOf(D.preset)] = 1;
  return L;
}

/* ---------------- what the speakers get (SHARC speaker mix) ---------------- */
function speakerMix(){
  if (!D.power) return {L:'—', R:'—', gain:'—'};
  const vol = D.muted || !D.spkr ? 'muted' : volText(D.volume).trim();
  if (D.preset && D.mode===2){ const m=D.mix[D.preset];
    const f = arr=> arr.map((g,c)=> g===null?null:`CH${c+1}${g?(g>0?'+':'')+g+'dB':''}`).filter(Boolean).join(' + ') || 'nothing';
    return {L:f(m.L), R:f(m.R), gain:vol}; }
  if (D.preset && D.mode===1){ const c=1+2*'ABCD'.indexOf(D.preset); return {L:'CH'+c, R:'CH'+c, gain:vol}; }
  if (D.mode===1) return {L:'Lo (downmix)', R:'Ro (downmix)', gain:vol};
  return {L:`CH${2*D.inputNo-1} (In ${D.inputNo} L)`, R:`CH${2*D.inputNo} (In ${D.inputNo} R)`, gain:vol};
}

/* ---------------- the 80-byte ALTERA chain = TDM_IN_ctl[20] (ALTERA_SORT, main board) ---------------- */
function chainBytes(){
  const b = new Array(80).fill(0);
  b[3] = D.mode===5 ? 1 : D.mode;                                  // REG1: mode_select
  const outG = D.opFix ? 61 : (D.muted?0:D.volume);                 // INFERRED: Fix = 0 dB index
  for (let k=0;k<4;k++) b[40+k] = outG;                             // REG11: output1..4
  // REG12–14 volume1L..10L, VoiceoverEnable, DimEnable / REG15–17 volume1R..10R, 0, mode2volume
  const L = new Array(10).fill(0), R = new Array(10).fill(0);
  if (D.preset && D.mode===2){ const m=D.mix[D.preset]; for (let c=0;c<8;c++){ if (m.L[c]!==null) L[c]=61+m.L[c]; if (m.R[c]!==null) R[c]=61+m.R[c]; } }
  else { L[2*D.inputNo-2]=61; R[2*D.inputNo-1]=61; }
  for (let c=0;c<10;c++){ b[44+c]=L[c]; b[56+c]=R[c]; }
  b[54]=0; b[55]=61;                                               // voice-over off, dim 0 dB (INFERRED value: dim cannot be set)
  b[67] = D.muted || !D.spkr ? 0 : D.volume;                       // mode2volume → gain[27]
  b[68] = calIndex();                                              // calibration_data → cal_data[] index
  b[71] = D.out4;
  b[75] = (D.dn?0xE0:0) | (D.muted?0x10:0) | (D.mode===4?0x04:0);
  b[76] = (D.reference && D.refIn) ? 4 : 5;                         // altera_reference_input RMCK5 (ext) / RMCK6 (int)
  b[77] = 1 << (D.inputNo-1);                                      // altera_audio_input (one-hot CAT552 input)
  const code = D.source===SRC.AES110 ? [0x06,0x00,0x80,0x08,0x00] : [0x0E,0x01,0x80,0x28,0x04];
  b[78] = 0x40 | code[0] | code[1]; b[79] = code[2] | code[3] | code[4];
  return b;
}
/* Front → main general frame (uart.c ~442), mode ≠ 4 */
function frontFrame(kind){
  const vol = D.muted ? ['F','F','F'] : [Math.floor(D.volume/100), Math.floor(D.volume/10)%10, D.volume%10];
  const src = D.source>5 ? D.source-2 : D.source;
  const pr = D.preset ? 'ABCD'.indexOf(D.preset)+1 : 255;
  if (kind==='VOLUME') return ['#','F',...vol,'E',src,D.inputNo,'$'];
  if (kind==='SETUP') return ['#','L',0,0,0,'M',D.mode,'O',D.opFix,'I',0x30+D.reference,'S',D.spkr,'N',0,'Y',Math.floor((D.cal+50)/10),(D.cal+50)%10,'Q',D.dn,'Z',D.out4,'$'];
  if (kind==='MIX'){ const e=D.mixEdit||{p:'A',side:'L'}; const m=D.mix[e.p][e.side]; let mask=0; m.forEach((g,c)=>{ if(g!==null) mask|=1<<c; });
    return ['#', e.side==='L'?'J':'H', 'ABCD'.indexOf(e.p), mask, ...m.map(g=>g===null?0:61+g), '$']; }
  return ['#','A',D.sdiLock?1:0,'B','C',0x31,'E',src,D.inputNo,'F',...vol,'G',pr,D.preset?1:255,'P',D.prologic?0:1,'V',0,'X','A','$'];
}
/* Main → front reply (UART0_transmit_counter, one byte every 3 loops) */
function mainFrame(){ const f=dformat(); return ['#','A',f,'B',f>=2?1:0,'C',0x31,f>=2?27:0,'D',255,'R',f===3?4:0,'T',f===2?14:0,'X','A',255,'M',D.mode,'$']; }
function byteTxt(v){ return typeof v==='string' ? v : '0x'+v.toString(16).padStart(2,'0').toUpperCase(); }

/* ---------------- user actions: mutate state and log the firmware path ---------------- */
function act(name, fn, com){
  const trace = []; const tr = s=>trace.push(s);
  D.transient = null;                          // any later action comes after the 500 ms wait_ms of “SAVED”
  if (!D.power) tr('Unit is off — nothing happens.'); else fn(tr);
  D.idle = 0;
  D.last = { t:SIM.t, name, com: com||'GENERAL' };
  D.log.unshift({ t:SIM.t, name, trace, disp: displayText() });
  if (D.log.length>60) D.log.length=60;
  SIM.refresh();
}
const FPP = '<span class="muted">(front MCU)</span>', MBP = '<span class="muted">(main MCU)</span>';
const A = {
  pressInput(k){ act(`Press INPUTS ${['1/2','3/4','5/6','7/8'][k-1]}`, tr=>{
    tr(`${FPP} PROCESS_PUSHBUTTONS reads PINB (bit 0x${[0x40,0x20,0x08,0x02][k-1].toString(16)}), INVERT_DATA → TRANSLATE_SWITCHES: pb = YES, input_refresh = YES`);
    if (D.screen==='LEFT_MIX' || D.screen==='RIGHT_MIX'){ const e=D.mixEdit, arr=D.mix[e.p][e.side]; const c=k-1; arr[c] = arr[c]===null?0:null; e.dirty=true; e.idx=c;
      tr(`TRANSLATE_PUSHBUTTONS (${e.side==='L'?'LEFT':'RIGHT'}_MIX_SCREEN) → STORE_MIX_CHANNELS_VALUES${e.p}_${e.side}: mix_channels${e.p}_${e.side}[CHANNEL${c+1}] ^= 1, input ^= LED bit`);
      tr(`Channel ${c+1} ${arr[c]===null?'removed (lamp off, gain shows Off)':'assigned at 0 dB (lamp on)'}`); return; }
    if (D.screen==='SYSTEM'||D.screen==='SETUP'||D.screen==='INPUTS'||D.screen==='ASSIGNS'||D.screen==='FIRMWARE'){ tr('In the setup menus the INPUTS buttons are only read as the 0x42 setup chord; nothing changes'); return; }
    const old = D.inputNo; D.inputNo = k; D.preset = null; D.screen = 'SOURCE';
    tr(`TRANSLATE_PUSHBUTTONS (MODE${D.mode}): input = LED bit 0x${[0x02,0x04,0x10,0x40][k-1].toString(16)}, input_number = NO${k}, presets cleared`);
    tr('SAVE_INPUT_SOURCE_INFORMATION · SHIFT_OUT_LEDS (PA0 clock, PA1 data, PA2 strobe) → the lamp moves from '+old+' to '+k);
    tr(`screen_display = SOURCE_SCREEN → UPDATE_DISPLAY writes “${displayText()}”; ACTIVITY_MONITOR returns to the information screen after 5000 passes`);
    tr(`${MBP} the next general frame carries E ${D.source} ${k}; ALTERA_SORT sets altera_audio_input (byte 77) = 0x${(1<<(k-1)).toString(16).padStart(2,'0')} and volume${2*k-1}L / volume${2*k}R = 61 (0 dB)`);
    tr('SHARC: TDM_IN_ctl words 10–16 change → output_gain[] ramps (RAMP_TC 0.02, ≈1 ms) → the speakers follow input '+k);
  });},
  pressPreset(p){ act(`Press PRESET ${p}`, tr=>{
    const bit = {A:0x80,B:0x10,C:0x04,D:0x01}[p];
    tr(`${FPP} PROCESS_PUSHBUTTONS reads PINB bit 0x${bit.toString(16).padStart(2,'0')} → TRANSLATE_SWITCHES (pb_counter starts; PRESET_DEBOUNCE = 9000 passes to a hold)`);
    if (D.screen==='LEFT_MIX' || D.screen==='RIGHT_MIX'){ const e=D.mixEdit, arr=D.mix[e.p][e.side]; const c=4+'ABCD'.indexOf(p); arr[c] = arr[c]===null?0:null; e.dirty=true; e.idx=c;
      tr(`STORE_MIX_CHANNELS_VALUES${e.p}_${e.side}: channel ${c+1} ${arr[c]===null?'removed':'assigned at 0 dB'} (PRESET buttons are channels 5–8 in the mix screens)`); return; }
    if (['SYSTEM','SETUP','INPUTS','ASSIGNS','FIRMWARE'].includes(D.screen)){ tr('Setup menus ignore the PRESET buttons'); return; }
    if (D.mode===2){
      if (D.preset===p){ D.preset=null; tr(`MODE2: second press of the active preset → preset = 0, preset_selector = LEFT_AND_RIGHT_OFF`); }
      else { D.preset=p; tr(`MODE2: preset = '${p}', preset_tally set, screen = PRESET_SCREEN`); }
      tr(`ALTERA_SORT: volume1L..10L / volume1R..10R now come from mix ${D.preset||'(none) → selected input only'}`);
    } else if (D.mode===1){
      D.preset = p; tr(`MODE1: preset = '${p}', preset_selector = LEFT. The L → R → L&R → L+R cycling the manual describes is commented out (v200w.c ~10331)`);
    } else { D.preset = D.preset===p?null:p; tr(`MODE${D.mode}: preset toggled`); }
    D.screen = 'PRESET'; tr(`UPDATE_DISPLAY → “${displayText()}”`);
  });},
  holdPreset(p){ act(`Hold PRESET ${p} for 3 s`, tr=>{
    if (D.mode!==2){ tr(`Presets can only be configured in MODE 2 (manual). In MODE${D.mode} the hold does nothing`); return; }
    tr(`${FPP} pb_counter reaches PRESET_DEBOUNCE (9000 passes ≈ 3 s ${INF}) while the button is still down`);
    D.mixEdit = {p, side:'L', idx:0, dirty:false}; D.screen='LEFT_MIX'; D.preset=p;
    tr(`screen = LEFT_MIX_SCREEN, preset_index = PRESET${p}, gain_index = 0 → PROCESS_GAIN_SOURCES${p} builds “${displayText()}”`);
    tr('The 8 button lamps now show which channels feed the LEFT speaker (REFRESH_MIX_OUTPUT_LEDS'+p+'_L)');
  });},
  turnSelect(dir){ act(`Turn SELECT ${dir>0?'clockwise':'counter-clockwise'}`, tr=>{
    tr(`${FPP} SHAFT_ENCODER1 → PROCESS_SHAFT_ENCODER1 quadrature state machine (PINF bits 0–1) → encoder_action1 = ${dir>0?'UP':'DOWN'}`);
    tr('LEFT_ENCODER_UPDATE, screen = '+D.screen+'_SCREEN');
    switch (D.screen){
      case 'SOURCE': {
        const order = [SRC.AES75, SRC.AES110, SRC.SDI12, SRC.SDI34].filter(s=> s===SRC.AES75||s===SRC.AES110||D.opts.demux);
        let i = order.indexOf(D.source); i = (i + (dir>0?1:order.length-1)) % order.length; D.source = order[i];
        tr(`PROCESS_SOURCE_${dir>0?'INCREMENT':'DECREMENT'} (control.c): source = ${SRC_NAME[D.source]} (disabled inputs are skipped; ANALOG/SDI need their cards)`);
        tr(`PROCESS_AUDIO_SOURCE builds line2 “${displayText()}”; UPDATE_DISPLAY saves source to EEPROM address 221 at once`);
        tr(`${MBP} TRANSLATE_AUDIO_INPUT_TYPE / ALTERA_SORT: aes input codes (bytes 78–79) switch to the ${bankName()} receivers → every meter pair now shows the ${bankName()} bank`);
        break; }
      case 'INFO':
        if (D.mode===1 && dformat()===1){ D.prologic=!D.prologic; tr(`PCM in MODE1: prologic = ${D.prologic?'YES':'NO'} → “${displayText()}”; P byte → PLE (byte 76 bit 3)`); }
        else if (dformat()>=2){ D.infoPage++; tr(`PROCESS_INFORMATION_INCREMENT: next metadata page → “${displayText()}” (asks the main board with the X request byte)`); }
        else tr('MODE2 / PCM: the information screen has no further pages — nothing changes');
        break;
      case 'LEFT_MIX': case 'RIGHT_MIX': { const e=D.mixEdit; e.idx=(e.idx+(dir>0?1:7))%8; tr(`gain_index → ${e.idx} (channel ${e.side}${e.idx+1}): PROCESS_GAIN_SOURCES${e.p}${e.side==='R'?'_R':''} → “${displayText()}”`); break; }
      case 'SYSTEM': D.sys=(D.sys+(dir>0?1:4))%5; tr(`System menu → “${displayText()}”`); break;
      case 'SETUP': D.setup=(D.setup+(dir>0?1:8))%9; tr(`setup index (setup_min..setup_max, wraps) → ${SETUP_NAMES[D.setup]}: “${displayText()}”`); break;
      case 'INPUTS': D.inputsItem=(D.inputsItem+(dir>0?1:5))%6; tr(`InputDis screen → “${displayText()}”`); break;
      case 'ASSIGNS': D.assignIdx=(D.assignIdx+(dir>0?1:3))%4; tr(`Assign A${D.assignIdx+1} → “${displayText()}”`); break;
      default: tr('Nothing to step on this screen');
    }
  });},
  pressSelect(){ act('Press SELECT', tr=>{
    tr(`${FPP} SWITCH_ENCODER1 sees PINE 0x04 low → TRANSLATE_ENCODER1 (SWITCH1_DEBOUNCE = 255 passes)`);
    switch (D.screen){
      case 'INFO': case 'PRESET': case 'VOLUME': D.screen='SOURCE'; tr(`INFORMATION/PRESET → SOURCE_SCREEN: “${displayText()}” — now turn SELECT to change bank`); break;
      case 'SOURCE': D.screen='INFO'; tr(`SOURCE → INFORMATION_SCREEN: “${displayText()}”`); break;
      case 'LEFT_MIX': D.screen='RIGHT_MIX'; D.mixEdit.side='R'; D.mixEdit.idx=0; tr(`LEFT_MIX → RIGHT_MIX_SCREEN: “${displayText()}” (lamps now show the RIGHT mix)`); break;
      case 'RIGHT_MIX': { const e=D.mixEdit; tr(e.dirty? `RIGHT_MIX → SAVE_MIX_IN_EEPROM: 32 bytes at preset_index*32+1 (keys 0xAA at 252–255); “  SAVED ” for 500 ms`:'RIGHT_MIX → no change, nothing written');
        tr('UART0_setup: LEFT_MIX_COM (#J…$) then RIGHT_MIX_COM (#H…$) carry the 8 gains to the main board → volume1L..10L/1R..10R');
        if (e.dirty) D.transient={text:'  SAVED ', until:0.5};
        D.screen='INFO'; D.preset=e.p; D.mixEdit=null; break; }
      case 'SYSTEM':
        if (D.sys===0){ D.screen='SETUP'; D.setup=1; tr(`System → setup items: “${displayText()}”. Turn SELECT to choose, turn VOLUME to change`); }
        else if (D.sys===1){ D.screen='INPUTS'; D.inputsItem=1; tr(`Inputs: “${displayText()}” (VOLUME toggles Y/N; one input must stay enabled)`); }
        else if (D.sys===2){ D.screen='ASSIGNS'; D.assignIdx=0; tr(`Assigns (Mode 1 only): “${displayText()}”`); }
        else if (D.sys===3){ D.screen='FIRMWARE'; D.fwSeen=true; tr(`Firmware: VersionDis[] = REVISION1..8 → “${FW.front}”`); }
        else { D.screen='INFO'; tr('Exit → INFORMATION_SCREEN'); }
        break;
      case 'SETUP':
        if (D.setup===0){ D.screen='SYSTEM'; D.sys=0; tr('Setup Exit: mode = setup mode; DATA_re_initialization if it changed; SAVE_MODE_IN_EEPROM (key at 230, values 229…214)'); tr(`${MBP} SETUP_COM frame (#L… M O I S N Y Q Z $) → mode_select, calibration_data, output4_settings, reference`); }
        else tr('In the setup items only the Exit item reacts to a press');
        break;
      case 'INPUTS': if (D.inputsItem===0){ D.screen='SYSTEM'; tr('Inputs Exit: enables saved to EEPROM 212–220, RETURN_FROM_INPUT_SCREEN'); } break;
      case 'ASSIGNS': D.screen='SYSTEM'; tr('Assigns: SAVE_ASSIGN_IN_EEPROM (key at 200, values 199–196)'); break;
      case 'FIRMWARE': D.screen='SYSTEM'; tr('Back to System'); break;
    }
  });},
  setupChord(){ act('Hold INPUTS 1/2 + 7/8, press SELECT', tr=>{
    tr(`${FPP} PINB inverted = 0x40 | 0x02 = 0x42 = SETUP_SEQUENCE_COUNTER while SWITCH_ENCODER1 sees the press`);
    D.screen='SYSTEM'; D.sys=0; D.preset=null;
    tr(`TRANSLATE_ENCODER1 → screen = SYSTEM_SETUP_SCREEN: “${displayText()}”. Menu screens have no time-out`);
  });},
  turnVolume(dir){ act(`Turn VOLUME ${dir>0?'clockwise':'counter-clockwise'}`, tr=>{
    tr(`${FPP} SHAFT_ENCODER2 → PROCESS_SHAFT_ENCODER2 (PIND bits 0–1, direction swapped in common.c) → encoder_action2 = ${dir>0?'UP':'DOWN'}`);
    switch (D.screen){
      case 'SETUP': {
        const s=D.setup;
        if (s===1){ const seq=dir>0?{1:2,2:4,4:1}:{1:4,4:2,2:1}; D.mode=seq[D.mode]||2; if (D.mode===1 && !D.opts.dolby) tr('Mode 1 needs a Dolby decoder card (AMS8E-6); the 1A has none — the manual says use Mode 2'); tr(`Mode → ${D.mode} (up 1→2→4→1; Mode 3 and 5 cannot be reached). Applied on Exit`); }
        else if (s===2){ D.reference=(D.reference+(dir>0?1:2))%3; tr(`reference → ${['INTERNAL','AES75','AES110'][D.reference]}; ${MBP} TRANSLATE_AUDIO_REFERENCE_INPUT writes CS8416 #5 reg 4 = 0x${[0x80,0x88,0x92][D.reference].toString(16)} every loop`); }
        else if (s===3){ D.out4^=1; tr(`output4_settings → ${D.out4?'MON':'IN4'} (UART letter 'Z' — not a bootloader command in this firmware)`); }
        else if (s===4){ D.dn^=1; tr(`dialnorm_settings → ${D.dn?'0xE0 (enabled)':'0'}`); }
        else if (s===5){ D.volSetup=Math.max(0,Math.min(76,D.volSetup+dir)); tr(`volume_setup_level → ${D.volSetup} (${volText(D.volSetup).trim()})`); }
        else if (s===6){ D.opFix^=1; tr(`output_setup → ${D.opFix?'FIXED':'VARIABLE'}: AES output gains (bytes 40–43) ${D.opFix?'stay at 0 dB':'follow VOLUME'}`); }
        else if (s===7){ D.cal=Math.max(-22,Math.min(-10,D.cal+2*dir)); tr(`calibration 39…51 in steps of 2 → Cal ${D.cal}. ${MBP} calibration_data (byte 68) → SHARC cal_data[${calIndex()}] = ${CAL_DATA[calIndex()]} → the meter "0" now means ${D.cal} dBFS`); }
        else if (s===8){ D.spkr^=1; tr(`speaker → ${D.spkr?'ON':'OFF'}: speakers and headphone jack ${D.spkr?'enabled':'disabled'} (FPGA cntrl[28] ANDed onto DAC_D4)`); }
        else tr('Exit item: VOLUME does nothing');
        tr(`Display: “${displayText()}”`); return; }
      case 'INPUTS': { const it=INPUT_ITEMS[D.inputsItem]; if (it[1]){ const on=Object.values(D.inEnable).filter(Boolean).length; if (D.inEnable[it[1]] && on<=1) tr('At least one input must stay enabled — refused'); else D.inEnable[it[1]]=!D.inEnable[it[1]]; } tr(`“${displayText()}”`); return; }
      case 'ASSIGNS': { const opts=['75-1','75-2','75-3','75-4','110-1','110-2','110-3','110-4','ANL-1','SD1-1','SD2-1']; let i=opts.indexOf(D.assigns[D.assignIdx]); D.assigns[D.assignIdx]=opts[(i+(dir>0?1:opts.length-1))%opts.length]; tr(`assignment${D.assignIdx+1} → “${displayText()}”`); return; }
      case 'LEFT_MIX': case 'RIGHT_MIX': { const e=D.mixEdit, arr=D.mix[e.p][e.side]; if (arr[e.idx]===null){ tr('Channel is Off: assign it with its numbered button first'); return; }
        arr[e.idx]=Math.max(-15,Math.min(15,arr[e.idx]+dir)); e.dirty=true; tr(`mix_gain${e.p}_${e.side}[${e.idx}] = ${61+arr[e.idx]} (46…76, 61 = 0 dB) → “${displayText()}”`); return; }
      case 'SYSTEM': case 'FIRMWARE': tr('Nothing to change here'); return;
    }
    if (D.muted){ D.muted=false; D.volume=D.muteLevel; tr('Turning unmutes: volume = mute_level'); }
    const o=D.volume; D.volume=Math.max(0,Math.min(76,D.volume+dir)); D.screen='VOLUME';
    tr(`RIGHT_ENCODER_UPDATE: volume ${o} → ${D.volume} (0…Volume_Max 76; dB = level − 61; LARGE_change step of 3 is dead code)`);
    tr(`PROCESS_VOLUME_INFORMATION → “${displayText()}”; UART0_setup switches to VOLUME_COM (#F h t o E src in $) for 1000 passes`);
    tr(`${MBP} 'F' frame → volume_level → mode2volume (byte 67) → SHARC gain[27] = volume[${D.volume}] = ${D.volume?((D.volume-61)+' dB'):'off'}${D.opFix?'':' and the AES outputs (O/P Var)'}`);
  }, 'VOLUME');},
  pressVolume(){ act('Press VOLUME', tr=>{
    tr(`${FPP} SWITCH_ENCODER2 sees PINE 0x08 low → TRANSLATE_ENCODER2`);
    if (['SYSTEM','SETUP','INPUTS','ASSIGNS','FIRMWARE','LEFT_MIX','RIGHT_MIX'].includes(D.screen)){ tr('In the menus and mix screens the VOLUME press does nothing'); return; }
    if (D.mode===4){ tr('MODE4: shows the rear AES output (external) volume “X -60 dB” instead of muting'); return; }
    if (!D.muted){ D.muteLevel=D.volume; D.muted=true; tr('mute_level = volume; volume = 255 → UPDATE_DISPLAY “  Mute  ”'); tr(`UART: volume digits go out as 'F','F','F' → ${MBP} monitor = NO, mute_speaker_flag (byte 75 bit 4); speakers and both monitor outputs muted`); }
    else { D.muted=false; D.volume=D.muteLevel; tr(`Second press: volume = mute_level → “${volText(D.volume)}”`); }
    D.screen='VOLUME';
  }, 'VOLUME');},
  setSignal(bk, k, type){ const arr = bk===110? D.in110 : D.in75; act(`Rear: ${bk===110?'Phoenix 110 Ω':'BNC 75 Ω'} IN ${k} → ${SIG_NAME[type]}`, tr=>{
    arr[k-1].type = type;
    tr(`${MBP} the FPGA AES receiver (Issue 5: AESRXSRC, no CS8416 per input) ${type==='off'?'loses lock':'locks'}; CS8416_READ_LOCK_ALL = 0x0F & aesReadLockStatus() over the new SPI (alteraRead(0x00))`);
    if (type!=='off') tr('RESET_CS8416 counts LOCK_COUNTER (25 unlocked loops) before a re-lock; on lock it pulses the CAT552 reset (PORTE bit 2, 500 µs)');
    if (isDolby(arr[k-1])) tr(D.opts.dolby && D.mode===1 ? 'MODE1: the CAT552 Dolby card decodes it; SPI metadata frames (sync 0x02 0xCF, 134 bytes) → Dformat = '+(type==='dolbyE'?'3 (Dolby E)':'2 (DD)') : 'No Dolby decoding in MODE2 / without the card: the meters show the bitstream as near full-scale PCM');
  });},
  toggleRef(){ act(D.refIn?'Rear: unplug REF IN':'Rear: plug in REF IN (DARS)', tr=>{ D.refIn=!D.refIn;
    tr(`${MBP} RESET_CS8416_REF: reference CS8416 (U24) ${D.refIn?'locks':'unlocks'}; error register 0x0C read on PD0/PD1/PIND6 (CS5 = PD7)`);
    tr(D.reference? `Ref is set to ${['','75Ω','110Ω'][D.reference]}: altera_reference_input = ${D.refIn?'RMCK5 (external)':'RMCK6 (internal fallback)'}; CAT552 reset on ${D.refIn?'acquire':'loss'} (Feb 11 / Jun 24 2013 fix)` : 'Ref is set to Int in Setup, so the unit keeps its internal 48 kHz clock');
  });},
  sdi(on){ act(on?'SDI demux locks':'SDI demux loses lock', tr=>{ D.sdiLock=on;
    tr(`${FPP} UART1_translate: SDI board byte bit 1 (carrier lock) → sdi_carrier_lock → general frame byte after 'A'`);
    tr(on? `${MBP} sdiLockStatus 0→1: wait_ms(1000); PORTE &= ~BIT2; wait_ms(500); PORTE |= BIT2 — the whole main loop stops for ≈${Math.round(C.SDI_STALL*1000)} ms (1500 wait_ms “ms” × 164 µs; WDR inside wait_ms keeps the watchdog quiet)` : `${MBP} pSdiLockStatus = 0; nothing else`);
  });},
  power(){ D.power=!D.power; act(D.power?'Power on':'Power off', tr=>{
    tr('front: initialization (port_init, watchdog WDTCR=0x08, uart0/1 9600 Bd, SIEMENS8_lcd_initialization — the 06VA0002 HDSP2533 reset pulse), “  AMS8  ” for 1 s');
    tr('front: RECALL_MODE_FROM_EEPROM, RECALL_ASSIGN_FROM_EEPROM, probe the SDI board on UART1, DATA_initialization, RECALL_MIX_FROM_EEPROM, “ No Lock”');
    tr('main: initialization, 9 × wait_ms(500) (4500 “ms” × 164 µs ≈ 0.74 s, not 4.5 s), CONFIGURE_ALTERA, RECALL_*_FROM_EEPROM, first ALTERA_read_write, init_CS8416, RESET_SHARC (PE6 low 10 ms), PORTG |= BIT0 (TDM FSYNC released)');
    D.screen='INFO'; D.muted=false; D.volume=D.volSetup; D.preset=null; D.mixEdit=null;
  }); },
  wait(){ D.idle = 9; D.transient=null; if (!['SYSTEM','SETUP','INPUTS','ASSIGNS','FIRMWARE','LEFT_MIX','RIGHT_MIX'].includes(D.screen)) D.screen='INFO'; SIM.refresh(); },
  reset(){ const keep=D.lanesCh; D = freshState(); D.lanesCh=keep; MKEY=''; SIM.refresh(); },
};
/* the device clock drives time-outs: ACTIVITY_MONITOR (5000 passes) and the 500 ms "SAVED" */
let lastT = null;
function tick(){
  const t = SIM.t; if (lastT===null){ lastT=t; return; }
  let dt = t-lastT; lastT=t; if (dt<0) dt += SIM.duration; if (dt<=0 || dt>0.5) return;
  D.idle += dt;
  if (D.transient){ D.transient.until -= dt; if (D.transient.until<=0) D.transient=null; }
  if (['VOLUME','SOURCE','PRESET'].includes(D.screen) && D.idle >= C.NO_ACT*C.FP_PASS){
    D.screen='INFO'; D.log.unshift({t:SIM.t, name:'(idle)', trace:['ACTIVITY_MONITOR: activity_counter == NO_ACTIVITY_THRESHOLD (5000 passes ≈ 1.67 s) → screen_display = INFORMATION_SCREEN, refresh = YES'], disp:displayText()});
  }
}
const INF = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';

/* ================================================================
   DRAWING: front panel, rear panel (real silk)
   ================================================================ */
/* The CorelDRAW silks were converted with Inkscape (libcdr). The ink (text and printed lines) was split from the
   cut-out outlines and drill crosshairs, and each separation rendered at 1.375 px per drawing unit into
   assets/ams81-*.png (1707 × 163 px = the panel face). The M6 lens is placed by matching its two screw
   crosshairs to the panel's (lens x + 308.8 = panel x). Controls sit on the drawing's crosshairs and cut-outs;
   meter LEDs sit on the lens scale rows. */
const ASSET = 'siumulation-plugins/assets/';
/* Artwork 2026|59: the default faces are now the CorelDRAW vector art, assets/ams81-front.svg, ams81-rear.svg and
   ams81-lens.svg, cut from the same three .cdr files by Inkscape (plain SVG, pt units) with tools like the PNG cut:
   each viewBox is the panel outline in the .cdr (front 99.0,140.4 / rear 64.2,207.5, 1241.3 × 118.6 pt; lens window
   108.9,122.2, 216 × 118.5 pt), the same frame as the 1.375 px/pt PNGs, so the controls stay on their holes.
   Front: GREEN plate in POD green, WHITE plate (moved up 234.7 pt) in white, mechanical lines in grey. The "CURVES" file
   still holds live Arial text; centred labels are set text-anchor=middle on the button / jack / knob centres (as in
   Pics/AMS8-1A (AMS8-M24)Front.jpg), INPUTS / PRESET end-anchored. Drill crosshairs (guide strokes) are left out.
   The earlier PNG separations stay behind the "PNG silk" toggle. */
const ART = { png:false, DIR:'AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/',
  FRONT:'AMS8-1A-FRONT-SILK (CURVES).cdr', LENS:'AMS8-M6-SILK(MLC8-M3) (CURVE).cdr', REAR:'AMS8-M2-Rear-SILK(Curve).cdr' };
const artSrc = k => SIM.src(ART.DIR+ART[k], ART[k]);
function artNote(which){
  const f = which==='rear'? artSrc('REAR')+' (MAY 07/15)' : artSrc('FRONT')+' (OCT.19/15, GREEN + WHITE plates) and the lens '+artSrc('LENS')+' (May 08/15)';
  return `<div class="small muted" style="margin-top:4px">Artwork: ${f}, CorelDRAW vector art. <label><input type="checkbox" class="artpng" ${ART.png?'checked':''}> show the earlier PNG silk (raster cut of the same .cdr)</label></div>`;
}
function bindArt(m){ m.querySelectorAll('.artpng').forEach(c=> c.onchange=e=>{ ART.png=e.target.checked; m.querySelectorAll('.artpng').forEach(o=>o.checked=ART.png); SIM.refresh(); }); }
const GEO = {
  meterX:[459,494,528.6,563.3,612.7,647.6,682,716.6],
  pairX:[476.6,546,630.2,699.3],
  segTop:14.7, segPitch:5.93,
  btnX:[801.5,846,890.5,935], btnY:[51.25,110.75], btnS:33,
  disp:{cx:1109.8, cy:51.8, w:183.2, h:49.5},
  sel:{x:1040.5,y:111.2}, vol:{x:1179.1,y:111.2}, knobR:21.7,
  jack:{x:1281.5,y:81.5,r:19.3},
  screws:[[420,32],[420,131],[753.6,32],[753.6,131],[1082,111.2],[1109.8,111.2],[1137.7,111.2],[1226.1,81.5]],
  lensX:438.35, lensW:297,
};
const XG = { 'Ω':[14,17,17,17,10,10,27] };
function dotText(text, x, y, pitch, on, off){
  let s='';
  for (let i=0;i<text.length;i++){
    const ch=text[i], cx=x+i*pitch*6.2;
    if (XG[ch]){ const g=XG[ch], r=pitch*0.38; for (let row=0;row<7;row++) for (let col=0;col<5;col++){ const b=(g[row]>>(4-col))&1; s+=`<circle cx="${(cx+col*pitch).toFixed(1)}" cy="${(y+row*pitch).toFixed(1)}" r="${r.toFixed(2)}" fill="${b?on:off}"/>`; } }
    else s += SIM.dotMatrix(ch, cx, y, pitch, on, off);
  }
  return s;
}
const SEGCOL = i => i<4 ? '#ff3b2f' : i<12 ? '#ffc41f' : '#4dff4a';   // top 4 red, 8 yellow, 10 green (AMS8E-4 BOM: 40 RED, 68 YEL, 80 green)
function meterSVG(t, mode){
  let s = '';
  for (let ch=0; ch<8; ch++){
    const m = mode==='true' ? meterAt(ch,t) : shownAt(ch,t), x = GEO.meterX[ch];
    for (let i=0;i<22;i++){
      const y = GEO.segTop + i*GEO.segPitch - 2.1, fromBottom = 22-i;
      const lit = D.power && (fromBottom <= m.vu || fromBottom === m.pk);
      const col = lit ? SEGCOL(i) : '#1d1a17';
      s += `<rect x="${x-6.2}" y="${y}" width="5.4" height="4.2" rx=".8" fill="${col}"${lit?' filter="url(#amsglow)"':''}/><rect x="${x+0.8}" y="${y}" width="5.4" height="4.2" rx=".8" fill="${col}"/>`;
    }
  }
  GEO.pairX.forEach((x,p)=>{
    const s1 = D.mode===2 ? bank()[p] : (p===0 ? selIn() : null);
    const dd = D.power && s1 && isDolby(s1), err = false;   // ERR drive not traced (inferred: off)
    s += `<rect x="${x-4}" y="${GEO.segTop+9*GEO.segPitch-2.6}" width="8" height="5" rx="1" fill="${D.power?'#ff2a1a':'#2a1310'}" ${D.power?'filter="url(#amsglow)"':''}/>`;
    s += `<rect x="${x-4}" y="106" width="8" height="5" rx="1" fill="${dd?'#ffb000':'#2b2412'}"/><rect x="${x-4}" y="125.5" width="8" height="5" rx="1" fill="${err?'#ff2a1a':'#2a1310'}"/>`;
  });
  return s;
}
function frontSVG(t, opts){
  opts = opts||{};
  const L = buttonLeds(), txt = displayText(), d=GEO.disp;
  const pitch = 3.0, x0 = d.cx - (8*6.2*pitch - pitch*1.2)/2, y0 = d.cy - 3*pitch;
  const btn = (x,y,lit,yellow,id,lbl)=>`<g class="abtn" data-b="${id}" style="cursor:pointer"><title>${lbl}</title>
      <rect x="${x-16.5}" y="${y-16.5}" width="33" height="33" rx="2.5" fill="#0c0d0e"/>
      <rect x="${x-14}" y="${y-14}" width="28" height="28" rx="2" fill="${yellow?'#e9d21c':'#3a3d41'}" stroke="${yellow?'#a28f0a':'#55595e'}"/>
      <rect x="${x-6}" y="${y-3.5}" width="12" height="7" rx="1" fill="${lit?(yellow?'#fff6c0':'#ff3a4c'):(yellow?'#d8c64a':'#a9adb2')}" ${lit?'filter="url(#amsglow)"':''}/></g>`;
  const knob = (k,id)=>`<g class="aknob" data-k="${id}" style="cursor:pointer"><title>${id==='sel'?'SELECT: left = turn CCW, centre = press, right = turn CW (wheel turns)':'VOLUME: left = turn CCW, centre = press (mute), right = turn CW'}</title>
      <circle cx="${k.x}" cy="${k.y}" r="30" fill="transparent"/>
      <circle cx="${k.x}" cy="${k.y}" r="20.5" fill="#101112" stroke="#2c2f31" stroke-width="1.5"/>
      <circle cx="${k.x}" cy="${k.y}" r="16" fill="#1b1c1e" stroke="#060606" stroke-width="2"/>
      <circle cx="${k.x-5}" cy="${k.y-6}" r="6" fill="#3a3c40" opacity=".55"/></g>`;
  let s = `<svg viewBox="0 0 1707 163" role="img" aria-label="AMS8-1A front panel (real silkscreen)" style="width:100%;border-radius:6px;display:block">
    <defs><filter id="amsglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1707" height="163" rx="6" fill="#202326"/>
    <rect x="${GEO.lensX}" y="0" width="${GEO.lensW}" height="163" fill="#0c0b0b"/>
    ${ART.png? `<image href="${ASSET}ams81-front-cut.png" width="1707" height="163" opacity=".55"/>` : ''}
    ${meterSVG(t, opts.meter)}
    ${ART.png? `<image href="${ASSET}ams81-lens-white.png" x="${GEO.lensX}" y="0" width="${GEO.lensW}" height="163"/>
    <image href="${ASSET}ams81-front-green.png" width="1707" height="163"/>
    <image href="${ASSET}ams81-front-white.png" width="1707" height="163"/>` : `<image href="${ASSET}ams81-lens.svg" x="${GEO.lensX}" y="0" width="${GEO.lensW}" height="163" preserveAspectRatio="none"/>
    <image href="${ASSET}ams81-front.svg" width="1707" height="163" preserveAspectRatio="none"/>`}`;
  for (let k=0;k<4;k++){ s += btn(GEO.btnX[k], GEO.btnY[0], L.in[k], false, 'i'+(k+1), `INPUTS ${['1/2','3/4','5/6','7/8'][k]} (channel ${k+1} in the mix screens)`); s += btn(GEO.btnX[k], GEO.btnY[1], L.pr[k], true, 'p'+'ABCD'[k], `PRESET ${'ABCD'[k]} — click = press, hold 3 s = configure the mix (channel ${k+5} in the mix screens)`); }
  s += `<rect x="${d.cx-d.w/2}" y="${d.cy-d.h/2}" width="${d.w}" height="${d.h}" rx="3" fill="#050605" stroke="#2a2d2f"/>
    <g filter="url(#amsglow)">${dotText(txt, x0, y0, pitch, D.power?'var(--vfd)':'#222', 'rgba(140,200,90,.08)')}</g>
    ${knob(GEO.sel,'sel')}${knob(GEO.vol,'vol')}
    ${GEO.screws.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="5.5" fill="#56595c" stroke="#2a2c2e"/><path d="M${x-3} ${y}h6M${x} ${y-3}v6" stroke="#2a2c2e" stroke-width="1.2"/>`).join('')}
    <g class="apwr" style="cursor:pointer"><title>Headphone jack — click to power the unit ${D.power?'off':'on'} (simulation shortcut)</title><circle cx="${GEO.jack.x}" cy="${GEO.jack.y}" r="${GEO.jack.r-2}" fill="#7d8084" stroke="#3a3c3f" stroke-width="2"/><circle cx="${GEO.jack.x}" cy="${GEO.jack.y}" r="7" fill="#0b0b0b"/></g>
    ${opts.hot||''}</svg>`;
  return s;
}
function rearSVG(){
  const bnc = (x,id,sig,lbl)=>`<g class="ajack" data-j="${id}" style="cursor:pointer"><title>${lbl}: ${sig} — click to change</title>
      <circle cx="${x}" cy="46.1" r="24" fill="#a68a3c" stroke="#5e4d1c" stroke-width="2"/><circle cx="${x}" cy="46.1" r="15" fill="#d8c27a"/><circle cx="${x}" cy="46.1" r="5" fill="#7a5f12"/>
      ${sig!=='nothing connected'?`<rect x="${x-9}" y="58" width="18" height="30" fill="#2b5f9e"/><rect x="${x-15}" y="50" width="30" height="16" rx="4" fill="#3a74b8"/>`:''}</g>`;
  const phx = (x0,n,id,sigs,lbl)=>{ let s=`<rect x="${x0}" y="105" width="${n*54}" height="33" rx="2" fill="#2a9d55" stroke="#145a2e"/>`; for(let i=0;i<n;i++){ const sx=x0+i*54; s+=`<g class="ajack" data-j="${id}${i+1}" style="cursor:pointer"><title>${lbl} ${i+1}: ${sigs?SIG_NAME[sigs[i].type]:''} — click to change</title><rect x="${sx+2}" y="107" width="50" height="29" fill="transparent"/>${[9,27,45].map(d=>`<circle cx="${sx+d}" cy="121.5" r="5.5" fill="#0d3a1c"/>`).join('')}${sigs&&sigs[i].type!=='off'?`<rect x="${sx+6}" y="99" width="42" height="10" rx="2" fill="#1f6b3a"/>`:''}</g>`; } return s; };
  let s = `<svg viewBox="0 0 1707 163" role="img" aria-label="AMS8-1A rear panel (real silkscreen, AMS8-M2)" style="width:100%;border-radius:6px;display:block">
    <rect width="1707" height="163" rx="6" fill="#202326"/>
    <rect x="38" y="23" width="104" height="116" rx="4" fill="#111"/><rect x="62" y="48" width="56" height="44" rx="5" fill="#2b2b2b"/>
    <rect x="575" y="17" width="402" height="69" fill="#141618"/>${[0,1,2,3].map(i=>`<circle cx="${640+i*95}" cy="52" r="20" fill="#0d0e0f"/>`).join('')}
    <rect x="733" y="99" width="152" height="43" rx="4" fill="#9ea2a6"/><rect x="740" y="105" width="138" height="31" rx="8" fill="#26292b"/>
    ${[470.2,536].map(x=>`<rect x="${x-17}" y="57" width="34" height="50" rx="5" fill="#9ea2a6"/><rect x="${x-11}" y="62" width="22" height="40" rx="6" fill="#26292b"/>`).join('')}
    ${ART.png? `<image href="${ASSET}ams81-rear-cut.png" width="1707" height="163" opacity=".5"/>` : ''}`;
  s += bnc(1045.9,'ref', D.refIn?'DARS reference':'nothing connected','REF IN');
  [1120.1,1182,1243.9,1305.8].forEach((x,k)=>{ s += bnc(x,'b'+(k+1), SIG_NAME[D.in75[k].type], 'IN '+(k+1)+' (75 Ω)'); });
  [1397.3,1459.2,1521.1,1583].forEach(x=>{ s += `<circle cx="${x}" cy="46.1" r="24" fill="#a68a3c" stroke="#5e4d1c" stroke-width="2"/><circle cx="${x}" cy="46.1" r="15" fill="#d8c27a"/><circle cx="${x}" cy="46.1" r="5" fill="#7a5f12"/>`; });
  s += phx(986,2,'m',null,'MONITOR OUTPUT') + phx(1115,1,'r',null,'REF IN') + phx(1189,4,'p',D.in110,'IN (110 Ω)') + phx(1427,4,'o',null,'OUT');
  s += `<image href="${ASSET}${ART.png?'ams81-rear-white.png':'ams81-rear.svg'}" width="1707" height="163" preserveAspectRatio="none"/></svg>`;
  return s;
}
function bindPanel(root){
  root.querySelectorAll('.abtn').forEach(g=>{
    const id = g.dataset.b; let timer=null, held=false;
    g.addEventListener('pointerdown', e=>{ held=false; if (id[0]==='p') timer=setTimeout(()=>{ held=true; A.holdPreset(id[1]); }, 3000); });
    g.addEventListener('pointerup', e=>{ clearTimeout(timer); if (held) return; if (e.shiftKey && id[0]==='p') return A.holdPreset(id[1]); id[0]==='i' ? A.pressInput(+id[1]) : A.pressPreset(id[1]); });
    g.addEventListener('pointerleave', ()=>clearTimeout(timer));
  });
  root.querySelectorAll('.aknob').forEach(g=>{
    const k=g.dataset.k;
    g.addEventListener('click', e=>{ const r=g.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width;
      if (e.shiftKey && k==='sel') return A.setupChord();
      if (x<0.36) (k==='sel'?A.turnSelect:A.turnVolume)(-1); else if (x>0.64) (k==='sel'?A.turnSelect:A.turnVolume)(1); else (k==='sel'?A.pressSelect:A.pressVolume)(); });
    g.addEventListener('wheel', e=>{ e.preventDefault(); (k==='sel'?A.turnSelect:A.turnVolume)(e.deltaY<0?1:-1); }, {passive:false});
  });
  root.querySelectorAll('.ajack').forEach(g=> g.addEventListener('click', ()=>{
    const j=g.dataset.j;
    if (j==='ref') return A.toggleRef();
    const cyc = arr=>{ const i=SIG_TYPES.indexOf(arr.type); return SIG_TYPES[(i+1)%SIG_TYPES.length]; };
    if (j[0]==='b'){ const k=+j[1]; A.setSignal(75,k,cyc(D.in75[k-1])); }
    else if (j[0]==='p'){ const k=+j[1]; A.setSignal(110,k,cyc(D.in110[k-1])); }
  }));
  const p = root.querySelector('.apwr'); if (p) p.addEventListener('click', ()=>A.power());
}
function controlsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
    <span class="small muted">INPUTS</span>${[1,2,3,4].map(k=>`<button data-a="i${k}">${['1/2','3/4','5/6','7/8'][k-1]}</button>`).join('')}
    <span class="small muted" style="margin-left:8px">PRESETS</span>${'ABCD'.split('').map(p=>`<button data-a="p${p}">${p}</button>`).join('')}<button data-a="hold" title="Hold the last preset (or A) for 3 s">hold 3 s</button>
    </div><div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
    <span class="small muted">SELECT</span><button data-a="sl">⟲</button><button data-a="sp">press</button><button data-a="sr">⟳</button>
    <span class="small muted" style="margin-left:8px">VOLUME</span><button data-a="vl">⟲</button><button data-a="vp">press</button><button data-a="vr">⟳</button>
    <button data-a="chord" style="margin-left:8px" title="Hold INPUTS 1/2 and 7/8, press SELECT">Setup chord</button>
    <button data-a="wait" title="Let 2 s pass with no input (screen time-outs)">wait 2 s</button></div>
    <div class="small muted" style="margin-top:4px">Click a knob's left side to turn it counter-clockwise, its centre to press it, its right side to turn it clockwise (the mouse wheel turns it too). Hold a PRESET button for 3 s (or shift-click) to edit its mix. Shift-click SELECT = the setup chord. Keys: 1–4 inputs · A–D presets · Q W E select · I O P volume · S setup chord. Rear: click a BNC or Phoenix input to change what is plugged in.</div>`;
}
function bindControls(root){
  const map = {sl:()=>A.turnSelect(-1),sp:()=>A.pressSelect(),sr:()=>A.turnSelect(1),vl:()=>A.turnVolume(-1),vp:()=>A.pressVolume(),vr:()=>A.turnVolume(1),
    chord:()=>A.setupChord(), wait:()=>A.wait(), hold:()=>A.holdPreset(D.preset||'A'),
    i1:()=>A.pressInput(1),i2:()=>A.pressInput(2),i3:()=>A.pressInput(3),i4:()=>A.pressInput(4),pA:()=>A.pressPreset('A'),pB:()=>A.pressPreset('B'),pC:()=>A.pressPreset('C'),pD:()=>A.pressPreset('D')};
  root.querySelectorAll('[data-a]').forEach(b=> b.onclick=()=>map[b.dataset.a]());
}
document.addEventListener('keydown', e=>{
  if (!window.__ams81Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k=e.key.toLowerCase();
  const m={q:()=>A.turnSelect(-1),w:()=>A.pressSelect(),e:()=>A.turnSelect(1),i:()=>A.turnVolume(-1),o:()=>A.pressVolume(),p:()=>A.turnVolume(1),s:()=>A.setupChord(),
    '1':()=>A.pressInput(1),'2':()=>A.pressInput(2),'3':()=>A.pressInput(3),'4':()=>A.pressInput(4),a:()=>A.pressPreset('A'),b:()=>A.pressPreset('B'),c:()=>A.pressPreset('C'),d:()=>A.pressPreset('D')};
  if (m[k]){ m[k](); e.preventDefault(); }
});

/* ================================================================
   TIMING MODEL over the simulated second
   ================================================================ */
const FP_STEPS = [
  ['WDR · SWITCH_ENCODER1/2 · SHAFT_ENCODER1/2', .12, 'Push switches (PINE 0x04/0x08) and quadrature (PINF, PIND)'],
  ['PROCESS_PUSHBUTTONS · TRANSLATE_PUSHBUTTONS', .14, 'PINB, debounce 255 passes, hold counter 9000 → mix screens'],
  ['LEFT_ENCODER_UPDATE · RIGHT_ENCODER_UPDATE', .12, 'Source / menu / volume changes'],
  ['ACTIVITY_MONITOR', .04, '5000 idle passes → information screen'],
  ['UPDATE_DISPLAY', .20, 'If refresh: SIEMENS8_lcd_display writes 8 characters'],
  ['COMMUNICATION_MONITOR', .04, '1000 passes → back to general frames'],
  ['UART0_setup · UART0_transmit_counter · UART0_translate', .20, 'One byte of the #…$ frame every 25 passes; parse replies'],
  ['UART1_transmit_counter · UART1_receive · UART1_translate', .14, 'SDI demux board link'],
];
const MB_STEPS = [
  ['WDR · CS8416_READ_LOCK_ALL (alteraRead 0x00)', .06, 'Input lock from the FPGA over the Jan 2013 SPI (PC0–PC3) + reference CS8416'],
  ['RESET_CS8416_REF · TRANSLATE_AUDIO_INPUT_TYPE · ISOLATE_INPUT_STATUS', .05, 'Reference lock, PCM/data, mask by input'],
  ['TRANSLATE_AUDIO_REFERENCE_INPUT · RESET_CS8416', .05, 'Writes CS8416 #5 reg 4 every loop; LOCK_COUNTER 25'],
  ['ALTERA_TRANSLATE_UART0 · ALTERA_SORT', .06, 'Pack 80 bytes = 20 × 32-bit registers'],
  ['ALTERA_read_write (80 bytes on PC4–PC7)', .48, 'FSYNCH PC7, CLK PC6, out PC5, in PINC4: 640 bits each way → FPGA shift_in32 → SHARC SPORT1'],
  ['ALIGNMENT_CHECK ("V201")', .02, 'Result never used'],
  ['SPI_translation · Metadata_translation', .06, 'CAT552 metadata frame → Dformat, config, dialnorm…'],
  ['UART0_translate · UART0_transmit_counter', .08, 'Front-panel frames in; one reply byte every 3 loops'],
  ['UART1_translate · SAVE_MIX_IN_EEPROM · SPI_control', .06, 'Bootloader port idle; mixes to EEPROM'],
  ['DOLBY_DECODER_STATUS · DOLBY_CAT552_AUDIO_ERROR_CHECK', .04, 'MODE1 only: card present (PINE bit 7), error (PING bit 1)'],
  ['SDI lock edge check', .04, 'Rising edge → ≈247 ms of wait_ms and a Dolby reset'],
];
const frac = arr=>{ let a=0; return arr.map(s=>{ const r=a; a+=s[1]; return r; }); };
const FP_FRAC = frac(FP_STEPS), MB_FRAC = frac(MB_STEPS);
function stepIn(stepsFrac, f){ let k=0; for (let j=0;j<stepsFrac.length;j++) if (f>=stepsFrac[j]) k=j; return k; }
function fpAt(t){ const n=Math.floor(t/C.FP_PASS); return {pass:n, step:stepIn(FP_FRAC,(t/C.FP_PASS)-n)}; }
function mbStall(){ return D.sdiLock && D.last && D.last.name==='SDI demux locks' ? [D.last.t, D.last.t+C.SDI_STALL] : null; }
function mbAt(t){ const st=mbStall(); if (st && t>=st[0] && t<st[1]) return {pass:-1, step:10, stalled:true};
  let tt=t; if (st && t>=st[1]) tt=t-C.SDI_STALL; const n=Math.floor(tt/C.MB_PASS); return {pass:n, step:stepIn(MB_FRAC,(tt/C.MB_PASS)-n)}; }
/* UART byte streams: front sends one byte every 25 passes, frames back-to-back */
function frontStream(){
  const out=[]; let i=0, t=0; const per=C.TX_EVERY*C.FP_PASS;
  while (t<1){ let kind='GENERAL';
    if (D.last && t>=D.last.t && t-D.last.t < C.COMM_BACK*C.FP_PASS){ kind = D.last.com==='VOLUME'?'VOLUME':'GENERAL'; }
    const f = frontFrame(kind); f.forEach((b,j)=>{ out.push({t:i*per, b, j, kind, n:f.length}); i++; }); t=i*per; }
  return out;
}
function mainStream(){ const out=[]; let i=0; const per=C.MB_TX_EVERY*C.MB_PASS; while (i*per<1){ const f=mainFrame(); f.forEach((b,j)=>{ out.push({t:i*per, b, j}); i++; }); } return out; }
/* the path of the last action from the button to the sound */
function actionPath(){
  if (!D.last || !D.power) return null;
  const ta = D.last.t, fp=C.FP_PASS;
  const t1 = Math.ceil(ta/fp+1e-9)*fp;                         // next pass sees the switch
  const t2 = t1 + FP_FRAC[4]*fp;                               // UPDATE_DISPLAY in the same pass
  const fs = frontStream(); let fStart = fs.find(b=>b.t>=t1 && b.j===0); if (!fStart) return {ta,t1,t2};
  const fEnd = fs.find(b=>b.t>=fStart.t && b.b==='$');
  const t3 = fEnd ? fEnd.t + C.BYTE_T : null;                  // '$' arrives at the main board
  const t4 = t3!==null ? Math.ceil(t3/C.MB_PASS)*C.MB_PASS + MB_FRAC[7]*C.MB_PASS : null;   // UART0_translate
  const t5 = t4!==null ? Math.ceil(t4/C.MB_PASS)*C.MB_PASS + MB_FRAC[4]*C.MB_PASS : null;   // next ALTERA_read_write
  const t6 = t5!==null ? t5 + 0.48*C.MB_PASS : null;           // chain complete → shift_in32 latched → TDM_IN_ctl
  const t7 = t6!==null ? t6 + 3*50/C.FS : null;                // three ramp time constants
  return {ta,t1,t2,t3,t4,t5,t6,t7, frameStart:fStart.t};
}

/* ---------------- timeline lanes ---------------- */
function lanes(){
  const css=n=>SIM.css(n); const ls=[]; const ch=D.lanesCh;
  ls.push({label:'48 kHz: sport0_isr per sample', h:24, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/C.FS,0,6e-6,css('--accent'),'sport0_isr (fix→float, mix, _VUMeterCalc, translate_meter_results)'); }});
  ls.push({label:'SPORT0 TDM: 10 × 24-bit slots', h:22, draw(c,X,t0,t1,y,h){
    if (t1-t0 > 400e-6){ SIM.pulses(c,X,t0,t1,y,h,1/C.FS,0,1/C.FS*0.94,css('--accent2'),'TDM frames (5 stereo I²S pairs)'); return; }
    const sl=1/C.FS/10; c.font='10px sans-serif'; for (let n=Math.floor(t0/sl); n*sl<t1; n++){ const k=((n%10)+10)%10; c.fillStyle=k<8?css('--accent2'):css('--ink2'); c.globalAlpha=.25+.07*(k%2); c.fillRect(X(n*sl),y+3,X((n+1)*sl)-X(n*sl)-1,h-6); c.globalAlpha=1; if (X((n+1)*sl)-X(n*sl)>34){ c.fillStyle=css('--ink'); c.fillText(k<8?'CH'+(k+1):'pair5', X(n*sl)+3, y+h/2+4); } } }});
  ls.push({label:`Timer1 → shifter (4-phase LED mux, ${C.SHIFT_HZ} Hz)`, h:24, draw(c,X,t0,t1,y,h){
    const per=1/C.SHIFT_HZ; const px=X(t0+per)-X(t0);
    if (px<6){ SIM.pulses(c,X,t0,t1,y,h,per,0,per*0.2,css('--warn'),'shifter: 64 bits to the AMS8E-4 A6276 drivers'); return; }
    c.font='10px sans-serif'; for (let n=Math.floor(t0/per); n*per<t1; n++){ const k=n&3; c.fillStyle=css('--warn'); c.globalAlpha=.75; c.fillRect(X(n*per),y+3,Math.max(1,X(n*per+per*0.18)-X(n*per)),h-6); c.globalAlpha=1;
      if (px>40){ c.fillStyle=css('--ink'); c.fillText(`mux ${k}: CH${k+1}+CH${k+5}`, X(n*per)+3, y+h/2+4); } } }});
  ls.push({label:`CH${ch+1} VU (line) · PPM (dashed), dBFS`, h:70, draw(c,X,t0,t1,y,h){
    const N=Math.min(700, Math.max(80,(X(t1)-X(t0))/1.5)); const Y=db=>y+3+(Math.min(0,Math.max(-60,db))/-60)*(h-6);
    c.strokeStyle=css('--grid'); [-20,-40].forEach(db=>{ c.beginPath(); c.moveTo(X(t0),Y(db)); c.lineTo(X(t1),Y(db)); c.stroke(); });
    [['vuDb',css('--accent'),[]],['pkDb',css('--bad'),[4,3]]].forEach(([key,col,dash])=>{ c.strokeStyle=col; c.setLineDash(dash); c.beginPath();
      for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N; const yy=Y(meterAt(ch,tt)[key]); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); });
    c.setLineDash([]); c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('−20', X(t0)+2, Y(-20)-2); c.fillText('−40', X(t0)+2, Y(-40)-2); }});
  ls.push({label:`CH${ch+1} LEDs as displayed (held per mux phase)`, h:40, draw(c,X,t0,t1,y,h){
    const N=Math.min(500, Math.max(60,(X(t1)-X(t0))/2)), w=(X(t1)-X(t0))/N;
    for (let i=0;i<N;i++){ const tt=t0+(t1-t0)*(i+.5)/N; const m=shownAt(ch,tt);
      for (let s=1;s<=22;s++){ if (s<=m.vu || s===m.pk){ c.fillStyle=SEGCOL(22-s); c.fillRect(X(t0)+i*w, y+h-2-s*(h-4)/22, w+0.5, (h-4)/22-0.3); } } } }});
  ls.push({label:'Front ATmega128 main loop', h:30, draw(c,X,t0,t1,y,h){
    const px=X(t0+C.FP_PASS)-X(t0);
    if (px<3){ c.fillStyle=css('--accent'); c.globalAlpha=.35; c.fillRect(X(t0),y+6,X(t1)-X(t0),h-12); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${Math.round((t1-t0)/C.FP_PASS).toLocaleString()} passes of ≈${(C.FP_PASS*1e6).toFixed(0)} µs (inferred)`, X(t0)+6, y+h/2+4); return; }
    for (let n=Math.floor(t0/C.FP_PASS); n*C.FP_PASS<t1; n++){ const a=n*C.FP_PASS;
      if (px>80){ FP_STEPS.forEach((s,j)=>{ const ta=a+FP_FRAC[j]*C.FP_PASS, tb=ta+s[1]*C.FP_PASS; c.fillStyle=j===6?css('--accent2'):css('--accent'); c.globalAlpha=j%2?.5:.8; c.fillRect(X(ta),y+3,Math.max(1,X(tb)-X(ta)-1),h-6); c.globalAlpha=1; if (X(tb)-X(ta)>70){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(s[0].split(' · ')[0], X(ta)+3, y+h/2+3); } }); }
      else { c.fillStyle=n%2?css('--accent'):css('--accent2'); c.globalAlpha=.7; c.fillRect(X(a),y+3,Math.max(1,px-0.5),h-6); c.globalAlpha=1; } } }});
  ls.push({label:'Front UART0 → main (9600 Bd)', h:26, draw(c,X,t0,t1,y,h){
    const fs=frontStream(); c.font='10px '+css('--mono');
    for (const b of fs){ if (b.t>t1 || b.t+C.BYTE_T<t0) continue; c.fillStyle=b.b==='#'||b.b==='$'?css('--warn'):b.kind==='VOLUME'?css('--bad'):css('--accent2'); c.fillRect(X(b.t),y+4,Math.max(1.5,X(b.t+C.BYTE_T)-X(b.t)),h-8);
      if (X(b.t+C.BYTE_T*8)-X(b.t)>26){ c.fillStyle=css('--ink'); c.fillText(byteTxt(b.b), X(b.t)+2, y+h/2+4); } } }});
  ls.push({label:'Main ATmega128 main loop', h:30, draw(c,X,t0,t1,y,h){
    const st=mbStall(); const px=X(t0+C.MB_PASS)-X(t0);
    if (st && st[1]>t0 && st[0]<t1){ c.fillStyle=css('--bad'); c.globalAlpha=.5; c.fillRect(X(st[0]),y+3,X(Math.min(st[1],t1+1))-X(st[0]),h-6); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px sans-serif'; c.fillText('SDI lock edge: wait_ms(1000) + wait_ms(500) — loop stopped', Math.max(X(st[0]),X(t0))+4, y+h/2+4); }
    for (let tt=Math.floor(t0/C.MB_PASS)*C.MB_PASS; tt<t1; tt+=C.MB_PASS){ if (st && tt>=st[0] && tt<st[1]) continue;
      if (px>90){ MB_STEPS.forEach((s,j)=>{ const ta=tt+MB_FRAC[j]*C.MB_PASS, tb=ta+s[1]*C.MB_PASS; c.fillStyle=j===4?css('--accent2'):css('--accent'); c.globalAlpha=j%2?.5:.8; c.fillRect(X(ta),y+3,Math.max(1,X(tb)-X(ta)-1),h-6); c.globalAlpha=1; if (X(tb)-X(ta)>80){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(s[0].split(' · ')[0].slice(0,34), X(ta)+3, y+h/2+3); } }); }
      else { const n=Math.round(tt/C.MB_PASS); c.fillStyle=n%2?css('--accent'):css('--accent2'); c.globalAlpha=.7; c.fillRect(X(tt),y+3,Math.max(1,px-0.5),h-6); c.globalAlpha=1; } }
    if (px<3){ c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`passes of ≈${C.MB_PASS*1e3} ms (inferred); blue = the 80-byte ALTERA chain`, X(t0)+6, y+h/2+4); } }});
  ls.push({label:'ALTERA chain / SPI lock read', h:22, draw(c,X,t0,t1,y,h){
    for (let tt=Math.floor(t0/C.MB_PASS)*C.MB_PASS; tt<t1; tt+=C.MB_PASS){ const a=tt+MB_FRAC[4]*C.MB_PASS; c.fillStyle=css('--accent2'); c.fillRect(X(a),y+4,Math.max(1,X(a+0.48*C.MB_PASS)-X(a)),h-8); c.fillStyle=css('--warn'); c.fillRect(X(tt),y+4,Math.max(1,X(tt+0.06*C.MB_PASS)-X(tt)),h-8); } }});
  ls.push({label:'Main UART0 → front (1 byte / 3 loops)', h:26, draw(c,X,t0,t1,y,h){
    const ms=mainStream(); c.font='10px '+css('--mono');
    for (const b of ms){ if (b.t>t1 || b.t+C.BYTE_T<t0) continue; c.fillStyle=b.b==='#'||b.b==='$'?css('--warn'):css('--accent'); c.fillRect(X(b.t),y+4,Math.max(1.5,X(b.t+C.BYTE_T)-X(b.t)),h-8);
      if (X(b.t+C.BYTE_T*8)-X(b.t)>26){ c.fillStyle=css('--ink'); c.fillText(byteTxt(b.b), X(b.t)+2, y+h/2+4); } } }});
  const s=selIn();
  ls.push({label: D.mode===1 && s && isDolby(s) ? (s.type==='dolbyE'?'Dolby E frames (29.97) → CAT552':'AC-3 frames (1536 samples)') : 'Dolby frames (none: PCM / MODE2)', h:22, draw(c,X,t0,t1,y,h){
    if (!(D.mode===1 && D.opts.dolby && s && isDolby(s))){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText(D.opts.dolby?'select a Dolby input in MODE1 to see frames and the metadata SPI':'no Dolby decoder card in the 1A', X(t0)+6, y+h/2+4); return; }
    const per = s.type==='dolbyE' ? 1001/30000 : 1536/C.FS; SIM.pulses(c,X,t0,t1,y,h,per,0,per*0.08,css('--bad'),'frames; each → SPI metadata frame (0x02 0xCF + 134 bytes)'); }});
  ls.push({label:'Last action → display → DSP', h:34, draw(c,X,t0,t1,y,h){
    const P=actionPath(); c.font='10px sans-serif';
    if (!P){ c.fillStyle=css('--ink2'); c.fillText('press a button or turn a knob; its path appears here', X(t0)+6, y+h/2+4); return; }
    const pts=[['ta','press',css('--play')],['t1','front pass sees it',css('--accent')],['t2','UPDATE_DISPLAY',css('--accent')],['frameStart','frame starts',css('--accent2')],['t3','$ received',css('--accent2')],['t4','UART0_translate',css('--warn')],['t5','ALTERA chain',css('--warn')],['t6','TDM_IN_ctl latched',css('--bad')],['t7','gain ramp done',css('--bad')]];
    let lastX=-1e9, row=0;
    pts.forEach(([k,l,col])=>{ const v=P[k]; if (v==null) return; const x=X(v); c.fillStyle=col; c.fillRect(x-1,y+2,2.5,h-4); if (x-lastX>70) row=0; else row=(row+1)%3; c.fillStyle=css('--ink'); c.fillText(l, x+3, y+10+row*10); lastX=x; });
  }});
  return ls;
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ const e=D.log[0]; return e? `<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`+e.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Press a button or turn a knob. Each step the firmware takes is listed here, front panel and main board.</div>'; }
function optsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:8px" class="small">
    <label><input type="checkbox" id="oDolby" ${D.opts.dolby?'checked':''}> Dolby decoder card (AMS8E-6, CAT552: the “M” variants)</label>
    <label><input type="checkbox" id="oDemux" ${D.opts.demux?'checked':''}> SDI demux (the “E” variants)</label>
    <button id="sdiBtn" ${D.opts.demux?'':'disabled'}>${D.sdiLock?'SDI: lose lock':'SDI: lock'}</button>
    <label>Lanes for <select id="lch">${[0,1,2,3,4,5,6,7].map(k=>`<option value="${k}" ${k===D.lanesCh?'selected':''}>CH${k+1}</option>`).join('')}</select></label>
    <button id="rst">Factory defaults</button></div>`;
}
function bindOpts(m){
  const o=m.querySelector('#oDolby'); if (o) o.onchange=e=>{ D.opts.dolby=e.target.checked; if (!D.opts.dolby && D.mode===1) D.mode=2; MKEY=''; act(e.target.checked?'Fit Dolby decoder card':'Remove Dolby decoder card', tr=>{ tr(`${MBP} DOLBY_DECODER_STATUS reads PINE bit 7 (card installed). ${D.opts.dolby?'Set Mode 1 in Setup to decode Dolby E / AC-3 (the default for units with the card)':''}`); }); };
  const d=m.querySelector('#oDemux'); if (d) d.onchange=e=>{ D.opts.demux=e.target.checked; act(e.target.checked?'Fit SDI demux':'Remove SDI demux', tr=>{ tr(`${FPP} the UART1 probe (0x08) ${D.opts.demux?'gets a reply with bits 0xE0 → audio_source_max = SDI78':'gets no reply in 10 tries → audio_source_max = AES110'}`); }); };
  const s=m.querySelector('#sdiBtn'); if (s) s.onclick=()=>A.sdi(!D.sdiLock);
  const l=m.querySelector('#lch'); if (l) l.onchange=e=>{ D.lanesCh=+e.target.value; SIM.refresh(); };
  const r=m.querySelector('#rst'); if (r) r.onclick=()=>A.reset();
}
function inspectorHTML(t){
  const fp=fpAt(t), mb=mbAt(t), sp=speakerMix(), f=dformat();
  const mm=[0,1,2,3,4,5,6,7].map(ch=>{ const m=meterAt(ch,t); return `CH${ch+1} ${m.vu? 'VU '+(idxToDb(m.vuIdx)).toFixed(1):'—'} / PPM ${m.pk?(idxToDb(m.pkIdx)).toFixed(1):'—'}`; });
  return `<table class="kv">
    <tr><th>Front MCU</th><td class="mono">pass #${fp.pass.toLocaleString()} · ${FP_STEPS[fp.step][0]}</td></tr>
    <tr><th>Main MCU</th><td class="mono">${mb.stalled?'<b style="color:var(--bad)">stalled in wait_ms (SDI edge)</b>':'pass #'+mb.pass+' · '+MB_STEPS[mb.step][0]}</td></tr>
    <tr><th>SHARC</th><td class="mono">sample ${Math.floor(t*C.FS).toLocaleString()} · mux phase ${Math.floor(t*C.SHIFT_HZ)&3}</td></tr>
    <tr><th>mode / screen</th><td class="mono">MODE${D.mode} · ${D.screen}_SCREEN${D.mixEdit?' · mix '+D.mixEdit.p+' '+D.mixEdit.side:''}</td></tr>
    <tr><th>source / input</th><td class="mono">${SRC_NAME[D.source]} · input_number ${D.inputNo} · ${SIG_NAME[selIn().type]} · Dformat ${f}</td></tr>
    <tr><th>Speakers</th><td class="mono">L = ${sp.L}<br>R = ${sp.R}<br>volume ${sp.gain}${D.preset?' · preset '+D.preset:''}</td></tr>
    <tr><th>Meter cal</th><td class="mono">Cal ${D.cal} → cal_data ${CAL_DATA[calIndex()]} → “0” LED = ${D.cal} dBFS</td></tr>
    <tr><th>Meter index → dBFS</th><td class="mono small">${mm.join('<br>')}</td></tr>
  </table><p class="small muted">Meter values are the SHARC's 0.5 dB indexes after cal (VU includes its +3 dB sine correction). dBFS here is −index/2, so “0 dB” reads as cal.</p>`;
}
function viewSim(m){
  window.__ams81Active = true; lastT=null;
  m.innerHTML = `
  ${card('Front panel at the playhead — what the operator sees (AMS8-1A, real CorelDRAW artwork)', `<div id="fp"></div>${artNote('front')}${controlsHTML()}${optsHTML()}`)}
  <div class="grid2">
    <div>${card('Rear panel (AMS8-M2) — click IN BNCs (75 Ω), the IN Phoenix blocks (110 Ω) or REF IN', `<div id="rp"></div>${artNote('rear')}`)}
      ${card('What the software did (last action)', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('State at the playhead', `<div id="insp"></div>`)}</div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek; use the transport above)', `<canvas id="tl"></canvas>
    <p class="small muted">The front MCU has no timers; everything is counted in loop passes. The pass length (≈333 µs) is ${INF} from PRESET_DEBOUNCE = 9000 passes and the manual's “approximately three seconds”; the main-board pass (≈4 ms) is ${INF} from the bit-banged 80-byte chain. The meter lanes use the real vumeter.asm constants and the ams81_vu_data.dat LED table; the programme material is ${INF} test signal.</p>`)}
  ${card('Action log', `<div id="log" class="log"></div>`)}`;
  const draw = ()=>{
    const t=SIM.t; tick();
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#insp').innerHTML = inspectorHTML(t);
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span> → “${e.disp}”</div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:230});
  };
  bindControls(m); bindOpts(m); bindArt(m);
  SIM.on('time', draw);
}

/* ---------------- tutorial (manual v2117, Mode 2 — the 1A's default) ---------------- */
const LESSONS = [
  { title:'Meet the AMS8-1A', body:`<p>The AMS8-1 is a 1RU <b>audio monitor</b>: eight LED bar-graph meters, an 8-character display, two speakers and a headphone jack. Engineers put it in a rack to <b>see and hear</b> up to four AES digital pairs. On the front: eight lit buttons (top row <b>INPUTS</b>, bottom row <b>PRESETS</b>) and two push-and-turn knobs, <b>SELECT</b> and <b>VOLUME</b>.</p>
     <p>White labels are the primary functions; <span style="color:#44b085">green</span> labels (1–8, (PUSH)) are the secondary functions used in setup and in the preset mixes (manual).</p>
     <p class="muted">The 1A has no Dolby card, so it runs in <b>Mode 2</b>: a multi-channel PCM monitor. Click “Next”.</p>`, check:()=>true, auto:true },
  { title:'1 · Read the meters', body:`<p>Each bar has 22 segments (green, yellow, red). The tall bar is the <b>VU</b> reading; the single lit dot above it is the <b>PPM</b> peak. The red LED at the “0” mark between each pair is always lit: it marks the calibration level, −20 dBFS out of the box.</p>
     <p>In Mode 2 the meters show all four inputs of the chosen bank at once: input 1 on CH1/CH2, input 2 on CH3/CH4, and so on.</p><p><b>Goal:</b> plug a signal into the rear <b>IN 4</b> BNC (click it until it says “PCM programme”), and watch CH7/CH8 come alive.</p>`, check:()=>D.in75[3].type==='prog'||D.in75[3].type==='tone', hint:'Click the IN 4 BNC on the rear panel (75 Ω row).' },
  { title:'2 · Choose what you hear', body:`<p>The INPUTS buttons pick which pair feeds the speakers. Press <b>5/6</b> to listen to input 3. The display shows the bank, <span class="mono">75Ω L/R</span>, for about 1.7 s and then goes back to the format (“PCM”).</p><p><b>Goal:</b> input 3 selected.</p>`, check:()=>D.inputNo===3, hint:'Press the INPUTS 5/6 button (key 3).' },
  { title:'3 · Set the listening level', body:`<p>Turn <b>VOLUME</b>. Each click is 1 dB, from OFF and −60 dB up to +15 dB. The level shows in the display, e.g. <span class="mono">-20 dB</span>.</p><p>Behind the scenes the front MCU sends <span class="mono">#F h t o E … $</span> to the main board one byte every 25 loop passes; the SHARC ramps the gain in about 1 ms. Watch the “Last action” lane on the Simulator timeline.</p><p><b>Goal:</b> volume at −20 dB.</p>`, check:()=>!D.muted&&D.volume===41, hint:'Turn VOLUME clockwise (P key) from −31 dB: 11 clicks.' },
  { title:'4 · Mute', body:`<p><b>Press VOLUME</b> to mute the speakers and both monitor outputs: the display reads <span class="mono">Mute</span>. Pressing again, or turning the knob, brings the old level back.</p><p><b>Goal:</b> muted.</p>`, check:()=>D.muted, hint:'Press the centre of VOLUME (O key).' },
  { title:'5 · Switch to the balanced inputs', body:`<p>Unmute first (press VOLUME again). The 75 Ω BNCs and the 110 Ω Phoenix inputs are two banks of four. <b>Press SELECT</b> to show the source, <b>turn SELECT</b> to change to <span class="mono">110Ω L/R</span>, then press SELECT again (or wait).</p><p><b>Goal:</b> the 110 Ω bank is selected, and you are back on the information screen.</p>`, check:()=>D.source===SRC.AES110 && D.screen==='INFO' && !D.muted, hint:'Press SELECT (W), turn SELECT (E), press SELECT (W).' },
  { title:'6 · Use a preset', body:`<p>The PRESETS buttons switch the speakers to a stored mix of any of the eight meter channels. Press <b>B</b>: the display shows <span class="mono">Preset B</span>. Press B again to turn the preset off (<span class="mono">NoPreset</span>).</p><p><b>Goal:</b> preset B active.</p>`, check:()=>D.preset==='B', hint:'Press PRESET B (B key).' },
  { title:'7 · Build a mix in preset A', body:`<p><b>Hold PRESET A for about three seconds</b> (or use “hold 3 s”). The display shows <span class="mono">A L1 Off</span>: you are editing the <b>left</b> speaker mix. The eight buttons now stand for channels 1–8 (the green numbers). Press <b>1</b> (the 1/2 button) and <b>5</b> (the A button) to add CH1 and CH5. Turn SELECT to pick a channel and turn VOLUME to trim it ±15 dB.</p><p>Press SELECT for the <b>right</b> mix (<span class="mono">A R1</span>), and press SELECT again to save: <span class="mono">SAVED</span>.</p><p><b>Goal:</b> preset A's left mix contains CH1 and CH5, and it has been saved.</p>`, check:()=>D.mix.A.L[0]!==null && D.mix.A.L[4]!==null && !D.mixEdit, hint:'hold 3 s on A, press 1/2 and A, press SELECT twice.' },
  { title:'8 · Open System Setup', body:`<p>Hold INPUTS <b>1/2</b> and <b>7/8</b> with one hand and <b>press SELECT</b>. The display reads <span class="mono">System</span>. (Use “Setup chord”, shift-click SELECT or the S key.)</p><p><b>Goal:</b> in System Setup.</p>`, check:()=>['SYSTEM','SETUP','INPUTS','ASSIGNS','FIRMWARE'].includes(D.screen), hint:'Click “Setup chord”.' },
  { title:'9 · Calibrate the meters', body:`<p>Press SELECT on <span class="mono">System</span> to reach the setup items (<span class="mono">Mode 2</span> first). Turn SELECT to <span class="mono">Cal -20</span> and turn VOLUME: the reference level moves in 2 dB steps from −22 to −10 dBFS. The SHARC adds the matching cal_data offset to every meter index, so the red “0” LED now means that level.</p><p><b>Goal:</b> Cal −18.</p>`, check:()=>D.cal===-18, hint:'Press SELECT, turn SELECT clockwise six steps to Cal, turn VOLUME clockwise once.' },
  { title:'10 · Leave setup', body:`<p>Turn SELECT to <span class="mono">Exit</span> and press SELECT: the settings are saved to EEPROM and you are back at <span class="mono">System</span>. Turn SELECT one step counter-clockwise to <span class="mono">Exit</span> and press again to leave.</p><p><b>Goal:</b> back on the normal display.</p>`, check:()=>D.screen==='INFO'&&D.cal===-18, hint:'Turn SELECT to Exit, press; turn SELECT counter-clockwise once, press.' },
  { title:'11 · Check the firmware', body:`<p>Open System Setup again, turn SELECT to <span class="mono">Firmware</span> and press: the display reads <span class="mono">${FW.front}</span>, the version the 2016|49 test report lists for this display (HDSP2533). Press SELECT to go back, then exit.</p><p><b>Goal:</b> you have seen the firmware number and left setup.</p>`, check:()=>D.fwSeen && D.screen==='INFO', hint:'Setup chord, turn SELECT clockwise three times, press, press, turn to Exit, press.' },
  { title:'12 · Watch the ballistics', body:`<p>Go to the <b>One second</b> tab. Set the transport speed to “1 s takes 60 s” and play. A drum-like hit makes the PPM dot jump within about 8 ms (attack) and fall back slowly (6 s for 40 dB), while the VU bar rises over hundreds of milliseconds. The display only shows each pair of channels once every four shifter ticks (80 Hz).</p>`, check:()=>true, auto:true },
  { title:'Done', body:`<p>You've used every control on the AMS8-1A. The <b>Software</b> tab follows each press through both microcontrollers, the FPGA and the SHARC; <b>Findings</b> lists what the firmware does that the manual doesn't say.</p>`, check:()=>true, auto:true },
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__ams81Active = true; lastT=null;
  m.innerHTML = `${card('The unit', `<div id="fp"></div>${controlsHTML()}<div id="rp" style="margin-top:8px"></div>`)}
    <div class="grid2"><div>${card('Tutorial — how an operator used the AMS8-1 (manual v2117, Mode 2)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
    <div>${card('What the software did', `<div id="trace" class="log"></div>`)}</div></div>`;
  const hot = `<g><rect x="438" y="0" width="297" height="163" fill="transparent"><title>Eight 22-segment meters on the AMS8E-4 boards: VU bar + PPM dot; red reference LED at 0; DD and ERR LEDs per pair</title></rect>
    <rect x="1018" y="27" width="183" height="50" fill="transparent"><title>8-character dot-matrix display (PDSP1884, or HDSP2533 from 06VA0002)</title></rect></g>`;
  const draw = ()=>{
    tick();
    m.querySelector('#fp').innerHTML = frontSVG(SIM.t,{hot}); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L = LESSONS[lessonIdx], ok = L.check();
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
function viewAnatomy(m){
  window.__ams81Active = true; lastT=null;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">
    ${card('As seen by the device', `<div id="dev"></div>`)}
    ${card('As seen by the displays', `<div id="fp"></div><h3>Meter values the SHARC computes vs what the LEDs show</h3><canvas id="mv"></canvas>
      <p class="small muted">Left half of each column: the true meter at the playhead (computed every sample). Right half: what the LED driver last received for that channel (refreshed once every 4 shifter ticks). VU = bar, PPM = dot.</p>`)}
  </div>
  ${card('Ballistics over the second (CH'+(D.lanesCh+1)+'; red line = playhead)', `<canvas id="bal"></canvas><p class="small muted">vumeter.asm works on the squared signal: VU one-pole TCONST_VU = 0.000319752 per sample (0.6 s for 40 dB); PPM attack 0.02276277 (8.33 ms), decay 0.000031978 (6 s for 40 dB); PPM = max(attack, decaying hold) — the combination is ${INF} from the code's structure.</p>`)}`;
  const draw = ()=>{
    tick(); const t=SIM.t;
    const rows = [
      ['AES frames (samples per channel)', '48,000', SIM.fmtDur(1/C.FS), 'SPORT0 frame sync → sport0_isr: fix→float, AES & speaker mixes, _VUMeterCalc ×8, translate_meter_results'],
      ['TDM bits into the SHARC', (C.FS*240).toLocaleString(), SIM.fmtDur(1/C.FS/240), '10 slots × 24 bits inside 256 MCLKs (tdm_i2sx5)'],
      ['Gain ramp time constant', '—', SIM.fmtDur(1/C.RAMP_TC/C.FS), 'RAMP_TC 0.019999 per background pass'],
      ['Shifter ticks (Timer1)', String(C.SHIFT_HZ)+' '+INF, SIM.fmtDur(1/C.SHIFT_HZ), '64 bits to two AMS8E-4 boards (4 × A6276 each); OE blanking first'],
      ['LED refreshes per channel', String(C.SHIFT_HZ/4), SIM.fmtDur(4/C.SHIFT_HZ), 'mux_count & 3 selects CH k+1 and CH k+5'],
      ['Front MCU loop passes', '≈ '+Math.round(1/C.FP_PASS).toLocaleString()+' '+INF, SIM.fmtDur(C.FP_PASS), 'Encoders, buttons, display, UART0, UART1'],
      ['Front UART0 bytes', '≈ '+Math.round(1/(C.TX_EVERY*C.FP_PASS)), SIM.fmtDur(C.TX_EVERY*C.FP_PASS), `one byte every 25 passes (byte itself ${SIM.fmtDur(C.BYTE_T)} at 9600 Bd)`],
      ['Front general frames', '≈ '+(1/(frontFrame('GENERAL').length*C.TX_EVERY*C.FP_PASS)).toFixed(1), SIM.fmtDur(frontFrame('GENERAL').length*C.TX_EVERY*C.FP_PASS), frontFrame('GENERAL').length+' bytes #A…X…$'],
      ['Main MCU loop passes', '≈ '+Math.round(1/C.MB_PASS)+' '+INF, SIM.fmtDur(C.MB_PASS), 'Each pass: 80-byte ALTERA chain (640 bits each way) + one SPI lock read'],
      ['Main UART0 reply bytes', '≈ '+Math.round(1/(C.MB_TX_EVERY*C.MB_PASS)), SIM.fmtDur(C.MB_TX_EVERY*C.MB_PASS), 'format, configuration, dialnorm, mode…'],
      ['Dolby E frames (29.97)', '29.97', SIM.fmtDur(1001/30000), 'MODE1 + card: one CAT552 metadata SPI frame each (inferred cadence)'],
      ['AC-3 frames', '31.25', SIM.fmtDur(1536/C.FS), '1536 samples'],
      ['Screen time-out', '—', SIM.fmtDur(C.NO_ACT*C.FP_PASS), 'NO_ACTIVITY_THRESHOLD 5000 passes'],
      ['Preset hold', '—', SIM.fmtDur(C.PRESET_HOLD*C.FP_PASS), 'PRESET_DEBOUNCE 9000 passes'],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Use <b>Step</b> on the transport to move one sample, one shifter tick, one loop pass or one UART byte at a time.</p>`;
    const fp=fpAt(t), mb=mbAt(t), fs=frontStream(), fb=fs.filter(b=>b.t<=t).pop(), ms=mainStream(), mbb=ms.filter(b=>b.t<=t).pop();
    m.querySelector('#dev').innerHTML = `<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>SHARC</th><td class="mono">sample ${Math.floor(t*C.FS).toLocaleString()} · TDM slot ${Math.floor((t*C.FS%1)*10)} · shifter tick ${Math.floor(t*C.SHIFT_HZ)} (mux ${Math.floor(t*C.SHIFT_HZ)&3})</td></tr>
      <tr><th>Front MCU</th><td class="mono">pass #${fp.pass.toLocaleString()}: ${FP_STEPS[fp.step][0]}<br><span class="muted">${FP_STEPS[fp.step][2]}</span></td></tr>
      <tr><th>Front UART0</th><td class="mono">${fb?`last byte “${byteTxt(fb.b)}” (${fb.j+1} of ${fb.n} in a ${fb.kind} frame)`:'—'}</td></tr>
      <tr><th>Main MCU</th><td class="mono">${mb.stalled?'stalled (SDI edge wait_ms)':'pass #'+mb.pass+': '+MB_STEPS[mb.step][0]}<br><span class="muted">${MB_STEPS[mb.step][2]}</span></td></tr>
      <tr><th>Main UART0</th><td class="mono">${mbb?`last byte “${byteTxt(mbb.b)}” (${mbb.j+1} of ${mainFrame().length})`:'—'}</td></tr>
      <tr><th>Display</th><td class="mono">“${displayText()}” (written only when refresh = YES)</td></tr></table>`;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    // meter value columns
    const {c,w} = SIM.canvas(m.querySelector('#mv'), 150); const ink=SIM.css('--ink');
    for (let ch=0;ch<8;ch++){ const tr_=meterAt(ch,t), sh=shownAt(ch,t), x=20+ch*(w-30)/8;
      [[tr_,0],[sh,1]].forEach(([mm,side])=>{ for (let s=1;s<=22;s++){ const on=s<=mm.vu||s===mm.pk; c.fillStyle=on?SEGCOL(22-s):SIM.css('--grid'); c.fillRect(x+side*16, 130-s*5.4, 13, 4.4); } });
      c.fillStyle=ink; c.font='11px sans-serif'; c.fillText('CH'+(ch+1), x, 146); }
    // ballistics
    const bc = SIM.canvas(m.querySelector('#bal'), 170), cx=bc.c, W=bc.w; const ch=D.lanesCh; const t0=0, t1=1;
    const Y=db=>10+(Math.min(0,Math.max(-60,db))/-60)*150, X=tt=>50+(tt-t0)/(Math.max(1e-3,t1-t0))*(W-60);
    cx.strokeStyle=SIM.css('--grid'); cx.fillStyle=SIM.css('--ink2'); cx.font='10px sans-serif';
    [0,-10,-20,-30,-40,-50,-60].forEach(db=>{ cx.beginPath(); cx.moveTo(50,Y(db)); cx.lineTo(W-10,Y(db)); cx.stroke(); cx.fillText(db+' dBFS',4,Y(db)+3); });
    const src=chSource(ch);
    cx.strokeStyle=SIM.css('--ink2'); cx.beginPath(); for (let i=0;i<=400;i++){ const tt=t0+(t1-t0)*i/400; const a=chAmp(src,tt); const db=a>0?20*Math.log10(a):-99; i?cx.lineTo(X(tt),Y(db)):cx.moveTo(X(tt),Y(db)); } cx.stroke();
    [['vuDb',SIM.css('--accent')],['pkDb',SIM.css('--bad')]].forEach(([k,col])=>{ cx.strokeStyle=col; cx.lineWidth=2; cx.beginPath(); for (let i=0;i<=400;i++){ const tt=t0+(t1-t0)*i/400; const v=meterAt(ch,tt)[k]; i?cx.lineTo(X(tt),Y(v)):cx.moveTo(X(tt),Y(v)); } cx.stroke(); cx.lineWidth=1; });
    cx.strokeStyle=SIM.css('--play'); cx.lineWidth=2; cx.beginPath(); cx.moveTo(X(t),6); cx.lineTo(X(t),160); cx.stroke(); cx.lineWidth=1;
    cx.fillStyle=SIM.css('--ink'); cx.fillText('grey: signal peak envelope · green: VU (+3 dB sine correction) · red: PPM', 56, 166);
  };
  SIM.on('time', draw);
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  panel:{x:20,y:20,w:190,h:96,t:'Front panel AMS8E-5',s:['8 lit buttons, 2 encoders','8-char PDSP1884 / HDSP2533','ATmega128 (or AT90CAN128)'],d:'Front MCU firmware V040002 (v200w.c, control.c, uart.c, SIEMENS8.c). No timers; one while(1) loop reads PINB buttons and the two quadrature encoders, runs the menus, writes the display on PORTC/PORTG and shifts the 8 button lamps out on PA0–PA2. Talks to the main board on UART0 (9600 Bd) and to an SDI demux on UART1.'},
  meters:{x:20,y:150,w:190,h:96,t:'Meters 2× AMS8E-4',s:['4 × A6276 per board','22 segments × 2 LEDs × 4 ch','red 0-ref, DD, ERR per pair'],d:'BOM AMS8E-4-PCAD.csv: 80 green, 68 yellow, 40 red LEDs and four A6276 16-bit LED sink drivers per board. Fed by the SHARC flags FLG0–3 (data, clock, strobe, OE) passed through the FPGA as DATA_OUT_5..8. Production notes: the A6276 is obsolete.'},
  mmcu:{x:260,y:20,w:200,h:96,t:'Main MCU ATmega128L (U14)',s:['4.9152 MHz, no timers','80-byte chain + SPI to FPGA','UART0 front · UART1 boot'],d:'V050001 v200w.c: lock and reference handling, the Dolby card, the #…$ protocol with the front panel, and once per loop the 80-byte ALTERA chain that becomes the SHARC\'s TDM_IN_ctl words. The bootloader section is reserved at 0x1F800 (linker -bbootloader:0x1F800.0x20000).'},
  fpga:{x:260,y:150,w:200,h:130,t:'Cyclone IV EP4CE40F23C6 (U4)',s:['AESRXSRC: AES receive + SRC','router · tdm_i2sx5 ↔ SPORT0','shift_in32 → SPORT1','spicontrol (lock byte)','DAC / LED pass-through'],d:'V050000/V050100 AMS81.bdf (Quartus 11.1). Issue 5 moved the AES receivers and sample-rate converters into the FPGA (Altera reference design). PLLs make 98.304 MHz and 12.288 MHz from the 12.288 MHz reference. Configuration from EPCS (M25P16 U13 on the ISS5 BOM).'},
  dsp:{x:510,y:150,w:200,h:110,t:'ADSP-21065 SHARC (U1)',s:['sport0_isr every sample','mixes, VU/PPM ×8','shifter → LED boards'],d:'v205 ams81_main.asm + vumeter.asm. Boots from the socketed AM29LV040B (U2). SPORT0: 10 audio slots in and out. SPORT1: 20 control words in (the main MCU\'s chain). Computes the speaker mix, the AES output gains and the meters.'},
  aes:{x:510,y:20,w:200,h:96,t:'AES I/O',s:['DS34LV86T receivers ×5','DS34LV87T drivers ×6','IN 1–4 75 Ω / 110 Ω, OUT 1–4'],d:'Two banks of four AES inputs (BNC and Phoenix) and four AES outputs on each connector type. Reference: CS8416 (U24) and AD1895 SRC (U10) kept for the REF IN after Issue 5.'},
  dac:{x:760,y:150,w:180,h:96,t:'Analog out',s:['4 × CS4334 + 8 × NE5532','speakers, phones, MONITOR OUT','AUX DB25 (5.1)'],d:'CS4334 DACs (U101, U104, U107, U110) and NE5532 buffers. The speaker enable (setup Spkr On/Off) is FPGA cntrl[28] ANDed onto DAC_D4. The speaker amplifier itself is not in the main-board BOM (inferred: a separate amp).'},
  dolby:{x:760,y:20,w:180,h:96,t:'Options',s:['AMS8E-6 Dolby (CAT552)','Demux-3 SDI','AMS8E-12 analog · uNet (1AN)'],d:'From the test reports: AMS8E-6 issue 3 with CAT 552Z V2.1.2.1 (1BAEM), Demux-3 issue 4 (V203/V301), AMS8E-12 analog card, uNet Standard (Archwave) for the 1AN. The CAT552 talks SPI to the main MCU (sync 0x02 0xCF, 134-byte metadata frames).'},
};
const WIRES = [['panel','mmcu','UART0 #…$ 9600 Bd'],['mmcu','fpga','80-byte chain · SPI'],['fpga','dsp','SPORT0 TDM · SPORT1 ctl'],['dsp','meters','FLG0–3 via FPGA'],['aes','fpga','AES 1–8'],['fpga','dac','I²S DAC_D1–4'],['dolby','mmcu','SPI metadata'],['dolby','fpga','decoded audio']];
function viewBlock(m){
  window.__ams81Active = false;
  let sel='fpga';
  m.innerHTML = `${card('Block diagram (click a block)', `<div id="bd"></div>`)}<div class="grid2"><div>${card('Block', `<div id="bdinfo"></div>`)}
    ${card('Signal flow in one sentence', `<p>The <b>front MCU</b> turns button presses into short ASCII-framed messages; the <b>main MCU</b> packs them into an 80-byte register chain; the <b>FPGA</b> receives the AES inputs, routes them to the <b>SHARC</b> and hands it the chain as control words; the SHARC mixes the speakers and outputs, and drives the <b>meter LEDs</b> itself.</p>`)}</div><div>
    ${card('Variants', `<table class="kv"><tr><th>1A</th><td>Base (this model): no Dolby, no demux; test reports 2009|42–2016|49 (V2200, C105, V1102, 06VA0002)</td></tr><tr><th>1AA / 1AAM</th><td>Sports Net custom (manuals v2113/v2117)</td></tr><tr><th>1AEM</th><td>+ SDI demux + Dolby card (06AV0000/0001, 2013|46)</td></tr><tr><th>1BAEM</th><td>“1BA” panel (AMS8-M22), SHARC AMS81B102, CAT552Z card</td></tr><tr><th>1CAM</th><td>“1CA” panel (AMS8-M23), same firmware set as 1B</td></tr><tr><th>1AN</th><td>uNet network audio (06AV0100, 2016|49): front MC V040100 renames “Analog” to “AES67”</td></tr></table><p class="small muted">Letter meanings (E = embedded/demux, M = metadata/Dolby) are ${INF} in the archive README.</p>`)}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 960 300" style="width:100%"><defs><marker id="aar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#aar)"/>`;
      if (l) s+=`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
        <text x="${b.x+10}" y="${b.y+20}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+10}" y="${b.y+38+i*15}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    s+='</svg>'; m.querySelector('#bd').innerHTML=s;
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
  };
  draw();
}

/* ---------------- schematics (net-label style, redrawn) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-34}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+34}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
const SHEETS = [
  { name:'1 · Front panel MCU (AMS8E-5)', note:'Pin functions from V040002 v200w.c / common.c / SIEMENS8.c / AMS8-5.c. Button bits are the inverted PINB values; LED bits are after the SHIFT_OUT_LEDS remap.', svg:()=>
    chip(330,50,200,'ATmega128 (AMS8E-5)',[
      ['PB6','IN 1/2 button'],['PB5','IN 3/4'],['PB3','IN 5/6'],['PB1','IN 7/8'],['PB7','PRESET A'],['PB4','PRESET B'],['PB2','PRESET C'],['PB0','PRESET D'],['PE2','SELECT push'],['PF0/PF1','SELECT A/B'],['PE3','VOLUME push'],['PD0/PD1','VOLUME A/B'],
    ],[
      ['PC0..7','DISP D0..D7'],['PG0..2','DISP A0..A2 (char)'],['PG3/PG4','DISP A3/A4'],['PE6','DISP nWR'],['PE5','DISP nCE'],['PE7','DISP nRD'],['PD6','DISP nRST'],['PD7','DISP nFL'],['PA0/PA1/PA2','LED CLK/DATA/STB'],['TXD0/RXD0','main board UART0'],['TXD1/RXD1','SDI demux UART1'],['XTAL','4.9152 MHz (inferred)'],
    ],'V040002 · ICCAVR 7.15 · AT90CAN128 alt.')
    + `<rect x="30" y="330" width="170" height="54" fill="none" stroke="var(--ink)"/><text x="115" y="352" text-anchor="middle" font-size="12" fill="var(--ink)">PDSP1884 / HDSP2533</text><text x="115" y="370" text-anchor="middle" font-size="11" fill="var(--ink2)">8-char 5×7, UDC bars 0x81–0x85</text>
       <rect x="660" y="330" width="170" height="54" fill="none" stroke="var(--ink)"/><text x="745" y="352" text-anchor="middle" font-size="12" fill="var(--ink)">74HC595-type LED shift</text><text x="745" y="370" text-anchor="middle" font-size="11" fill="var(--ink2)">8 button lamps (part ${'inferred'})</text>` },
  { name:'2 · Main board MCU (AMS8E-1 U14)', note:'From V050001 common.h, altspi.h and v200w.c. Only the pins the firmware names are drawn.', svg:()=>
    chip(320,40,210,'ATmega128L (U14)',[
      ['PC7','ALTERA FSYNCH'],['PC6','ALTERA CLK'],['PC5','ALTERA DATA OUT'],['PC4','ALTERA DATA IN'],['PC0','SPI SCLK'],['PC1','SPI MOSI'],['PC2','SPI CS (act. high)'],['PC3','SPI MISO'],['SPI (slave)','CAT552 metadata'],['PE7','Dolby card present'],['PG1','CAT552 error / MAP_ERR'],
    ],[
      ['PD0/PD1','CS8416#5 CCLK/CDIN'],['PD6','CS8416#5 CDOUT'],['PD7','CS8416#5 nCS'],['PE2','CAT552 RESET'],['PE6','SHARC RESET'],['PG0','TDM FSYNC enable'],['TXD0/RXD0','front panel 9600'],['TXD1/RXD1','boot port 38400'],['XTAL','4.9152 MHz'],['boot','0x1F800–0x1FFFF'],
    ],'V050001 · WDTCR = 0x08') },
  { name:'3 · FPGA (pins from AMS81.qsf V050100)', note:'Cyclone IV EP4CE40F23C6. Pin locations and net names copied from the .qsf; the connections from AMS81.bdf. There are no .pin files in the archive.', svg:()=>
    chip(320,30,200,'EP4CE40F23C6 (U4)',[
      ['Y22 W22 Y21 W21','AES IN 1–4'],['U22 U21 U20 R21','AES IN 5–8'],['B12','AES5_REF_MCLK'],['A11 / C10','DSPCLK1 / DSPCLK2'],['A20 B20 A19 B19','portc0–3 (SPI)'],['A18 B18 A17 B17','portc4–7 (chain)'],['D19 / C19','portg0 / MAP_ERR'],['B3 A3 B4 A4','SHARC flag0–3'],
    ],[
      ['V22 R20 R19 V21','AES OUT 1–4'],['R22 U19 R18 P21','AES OUT 5–8 (dup.)'],['B6 B8 B5 B7','DR0A DT0A RFS0 TFS0'],['A5 / A7','RCLK0 / TCLK0'],['A9 B9 B10','RCLK1 RFS1 DR1A'],['F9 G9 C8','DT1A TCLK1 TFS1'],['C22 B22 C21','DAC MCK SCLK LRCK'],['C20 D20 F19 F20','DAC_D1–4'],['W2 Y1 Y2 AA1','DATA_OUT_5–8 (LEDs)'],['B21','MUTE (cntrl[36])'],
    ],'V050100 · Quartus II 11.1 · EPCS') },
  { name:'4 · SHARC and the meter chain', note:'From ams81_INIT.ASM, ams81_main.asm (shifter, translate_meter_results) and the AMS8E-4 BOM. The A6276 order on the board is not traced.', svg:()=>
    chip(120,60,190,'ADSP-21065 (U1)',[['SPORT0','10 audio slots'],['SPORT1','20 ctl words'],['BOOT','AM29LV040B (U2)'],['CLKIN','49.152 MHz? (inferred)']],[['FLG0','LED DATA'],['FLG1','LED CLOCK'],['FLG2','LED STROBE'],['FLG3','LED OE (1 = off)']],'v205 · VisualDSP++')
    + `<text x="430" y="70" font-size="12" fill="var(--ink)">via FPGA → DATA_OUT_7 / 6 / 5 / 8</text>`
    + chip(600,60,170,'AMS8E-4 × 2',[['SDI','DATA'],['CLK','CLOCK'],['LE','STROBE'],['OE','OE']],[['4 × A6276','16 sinks each'],['188 LEDs','80 G · 68 Y · 40 R'],['mux','4 phases (sel bits)']],'meter boards')
    + `<text x="60" y="320" font-size="11.5" fill="var(--ink2)">Each Timer1 tick: OE=1, strobe in zeros, shift shift_data[k] then shift_data[k+4] (32 bits each, LSB first), strobe, OE=0. k = mux_count &amp; 3.</text>
       <text x="60" y="340" font-size="11.5" fill="var(--ink2)">shift_data = vu bar | (pk ^ (pk&lt;&lt;1)) on bits 31..10, mux select on bits 0–3 (sel_1 bit1, sel_2 bit0, sel_3 bit3, sel_4 bit2).</text>` },
  { name:'5 · Audio I/O (ISS5 BOM)', note:'Part numbers and designators from AMS8E-1 ISS5 - ALTIUM.csv. Signal paths between them are redrawn from the FPGA net names; resistor networks and transformers are not traced.', svg:()=>{
    let s=''; const row=(y,a,b,c,d)=>`<rect x="40" y="${y}" width="150" height="36" fill="none" stroke="var(--ink)"/><text x="115" y="${y+22}" text-anchor="middle" font-size="11.5" fill="var(--ink)">${a}</text><line x1="190" y1="${y+18}" x2="300" y2="${y+18}" stroke="var(--ink)" marker-end="url(#sar)"/><text x="245" y="${y+12}" text-anchor="middle" font-size="10" fill="var(--accent2)">${b}</text><rect x="300" y="${y}" width="190" height="36" fill="none" stroke="var(--ink)"/><text x="395" y="${y+22}" text-anchor="middle" font-size="11.5" fill="var(--ink)">${c}</text><text x="510" y="${y+22}" font-size="10.5" fill="var(--ink2)">${d}</text>`;
    s+=`<defs><marker id="sar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink)"/></marker></defs>`;
    s+=row(40,'IN 1–4 BNC / Phoenix','AES 1–8','DS34LV86T (U8,U11,U12,U27,U29)','→ FPGA AESRXSRC (receive + SRC)');
    s+=row(100,'REF IN','AES5','CS8416 (U24) + AD1895 (U10)','→ AES5_REF_MCLK 12.288 MHz');
    s+=row(160,'FPGA AES OUT 1–8','AES_OUTPUT_STREAM','DS34LV87T ×6 (U15,U17–U20,U28)','→ OUT 1–4 BNC and Phoenix');
    s+=row(220,'FPGA DAC_D1–4','I²S','CS4334 ×4 (U101,U104,U107,U110)','→ NE5532 ×8 → speakers / phones / MONITOR / AUX');
    s+=row(280,'RS-485 links','','ADM3485EAR ×5 (U3,U16,U22,U23,U25)','serial comm / metadata ports (inferred use)');
    s+=row(340,'MUTE (B21)','cntrl[36]','ADG419 (U26)','analog switch (inferred: mute path)');
    return s; } },
];
function viewSchem(m){
  window.__ams81Active = false;
  let i=0;
  m.innerHTML = card('Schematic set (redrawn from source pin and net names — not the original P-CAD/Altium drawings)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The original CAD is in <span class="mono">AMS8E - #PCB/</span> (P-CAD, Altium for Ams8e-1 iss5). These sheets are a readable guide built from the names in the firmware, the FPGA project and the ISS5 BOM; connections are only as reliable as those names. Blue labels are nets.</p>`);
  const draw=()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 900 420" style="width:100%;min-width:700px;background:var(--lane);border:1px solid var(--line);border-radius:8px">
      <rect x="6" y="6" width="888" height="408" fill="none" stroke="var(--line)"/><text x="884" y="406" text-anchor="end" font-size="10" fill="var(--ink2)">AMS8-1A · sheet ${i+1}/${SHEETS.length} · redrawn ${SIM.year(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent = SHEETS[i].note;
  };
  draw();
}

/* ---------------- software diagrams ---------------- */
const SCREENS = { INFO:[40,40,'INFORMATION'], VOLUME:[40,110,'VOLUME'], SOURCE:[200,40,'SOURCE'], PRESET:[200,110,'PRESET'], LEFT_MIX:[360,40,'LEFT_MIX'], RIGHT_MIX:[360,110,'RIGHT_MIX'], SYSTEM:[40,200,'SYSTEM_SETUP'], SETUP:[200,200,'setup items'], INPUTS:[360,200,'Inputs'], ASSIGNS:[200,260,'Assigns'], FIRMWARE:[360,260,'Firmware'] };
const EDGES = [['INFO','SOURCE','SEL press'],['SOURCE','INFO','SEL press / 5000'],['INFO','VOLUME','VOL turn/press'],['VOLUME','INFO','5000 passes'],['INFO','PRESET','PRESET'],['PRESET','INFO','5000'],['PRESET','LEFT_MIX','hold 9000'],['LEFT_MIX','RIGHT_MIX','SEL'],['RIGHT_MIX','INFO','SEL: SAVED'],['INFO','SYSTEM','0x42 + SEL'],['SYSTEM','SETUP','SEL'],['SETUP','SYSTEM','Exit'],['SYSTEM','INPUTS','SEL'],['SYSTEM','ASSIGNS','SEL'],['SYSTEM','FIRMWARE','SEL']];
function flowSVG(steps, fr, cur, title, extra){
  let s=`<svg viewBox="0 0 560 ${steps.length*40+70}" style="width:100%"><defs><marker id="a2${title}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
    <rect x="150" y="6" width="260" height="24" rx="12" fill="var(--chip)" stroke="var(--line)"/><text x="280" y="22" text-anchor="middle" font-size="11.5" fill="var(--ink)">${title}</text>`;
  steps.forEach((p,j)=>{ const y=40+j*40, on=cur===j;
    s+=`<line x1="280" y1="${y-10}" x2="280" y2="${y}" stroke="var(--ink2)" marker-end="url(#a2${title})"/><rect x="30" y="${y}" width="500" height="30" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
      <text x="40" y="${y+13}" font-size="11" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${p[0].length>66?p[0].slice(0,64)+'…':p[0]}</text><text x="40" y="${y+25}" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${p[2]}</text>`; });
  const yb=40+steps.length*40; s+=`<path d="M530 ${yb-25} h18 V36 h-18" fill="none" stroke="var(--ink2)" marker-end="url(#a2${title})"/><text x="30" y="${yb+16}" font-size="10.5" fill="var(--ink2)">${extra}</text></svg>`;
  return s;
}
function viewSoft(m){
  window.__ams81Active = true; lastT=null;
  m.innerHTML = `<div class="grid2">
    ${card('Front MCU main loop (V040002 main()) — lit box runs at the playhead', `<div id="ff"></div>`)}
    ${card('Main MCU main loop (V050001 main())', `<div id="mf"></div>`)}</div>
  <div class="grid2">
    ${card('Screen state machine (screen_display) — current screen lit', `<div id="sm"></div>`)}
    ${card('How the buttons did things — control → code → wire', `<div id="btn"></div>`)}</div>
  <div class="grid2">
    ${card('UART0 frames, live', `<div id="uart"></div>`)}
    ${card('80-byte ALTERA chain = SHARC TDM_IN_ctl[20], live', `<div id="reg"></div>`)}</div>
  ${card('SHARC: per-sample ISR and the meter path (ams81_main.asm, vumeter.asm)', `<div id="dsp"></div>`)}`;
  const draw=()=>{
    tick(); const t=SIM.t, fp=fpAt(t), mb=mbAt(t);
    m.querySelector('#ff').innerHTML = flowSVG(FP_STEPS, FP_FRAC, fp.step, 'initialization · RECALL_* · SDI probe', `No timers, no interrupts except uart0_rx_isr. WDR between groups (WDTCR = 0x08). Pass #${fp.pass.toLocaleString()}.`);
    m.querySelector('#mf').innerHTML = flowSVG(MB_STEPS, MB_FRAC, mb.stalled?10:mb.step, 'initialization · CONFIGURE_ALTERA · RESET_SHARC', `ISRs: spi_stc_isr (CAT552), uart0_rx_isr, uart1_rx_isr. ${mb.stalled?'STALLED in wait_ms':'Pass #'+mb.pass}.`);
    // screens
    let s=`<svg viewBox="0 0 520 310" style="width:100%"><defs><marker id="sma" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    EDGES.forEach(([a,b,l],i)=>{ const [x1,y1]=SCREENS[a], [x2,y2]=SCREENS[b]; const off=(i%2?6:-6); s+=`<line x1="${x1+55}" y1="${y1+14+off}" x2="${x2+55}" y2="${y2+14+off}" stroke="var(--grid)" stroke-width="1.2" marker-end="url(#sma)"/><text x="${(x1+x2)/2+60}" y="${(y1+y2)/2+10+off}" font-size="8.5" fill="var(--ink2)">${l}</text>`; });
    for (const k in SCREENS){ const [x,y,l]=SCREENS[k], on=D.screen===k; s+=`<rect x="${x}" y="${y}" width="110" height="28" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+55}" y="${y+18}" text-anchor="middle" font-size="10.5" fill="${on?'#fff':'var(--ink)'}">${l}</text>`; }
    s+=`<text x="10" y="305" font-size="10" fill="var(--ink2)">Display now: “${displayText()}”. Menu screens never time out; VOLUME / SOURCE / PRESET return after 5000 passes.</text></svg>`;
    m.querySelector('#sm').innerHTML=s;
    m.querySelector('#btn').innerHTML = `<table class="kv"><tr><th>Operator does</th><th>Firmware path</th><th>On the wire</th></tr>
      <tr><td>INPUTS button</td><td class="mono small">PROCESS_PUSHBUTTONS → TRANSLATE_PUSHBUTTONS → SHIFT_OUT_LEDS</td><td class="small">E src in → altera_audio_input (byte 77), volumeNL/R (44–65)</td></tr>
      <tr><td>PRESET button</td><td class="mono small">TRANSLATE_PUSHBUTTONS (MODE2: toggle)</td><td class="small">G preset sel → main → gains from the stored mix</td></tr>
      <tr><td>Hold PRESET 3 s</td><td class="mono small">pb_counter = PRESET_DEBOUNCE → LEFT_MIX_SCREEN</td><td class="small">#J / #H mix frames → SAVE_MIX_IN_EEPROM (main)</td></tr>
      <tr><td>Turn VOLUME</td><td class="mono small">SHAFT_ENCODER2 → RIGHT_ENCODER_UPDATE → PROCESS_VOLUME_INFORMATION</td><td class="small">#F h t o E … $ → mode2volume (67) → SHARC gain[27]</td></tr>
      <tr><td>Press VOLUME</td><td class="mono small">SWITCH_ENCODER2 → TRANSLATE_ENCODER2 (mute)</td><td class="small">F F F → mute_speaker_flag (byte 75 bit 4)</td></tr>
      <tr><td>Press / turn SELECT</td><td class="mono small">TRANSLATE_ENCODER1 / LEFT_ENCODER_UPDATE → PROCESS_SOURCE_INCREMENT</td><td class="small">E src → aes input codes (78–79)</td></tr>
      <tr><td>1/2 + 7/8 + SELECT</td><td class="mono small">buttons == SETUP_SEQUENCE_COUNTER 0x42</td><td class="small">nothing until Exit: SETUP_COM #L M O I S N Y Q Z $</td></tr>
      <tr><td>Setup Cal</td><td class="mono small">calibration 39…51 step 2</td><td class="small">Y → calibration_data (68) → cal_data[] → every meter index</td></tr></table>
      <p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none yet — use the Simulator or Tutorial tab'}</b></p>`;
    const ff=frontFrame(D.last&&D.last.com==='VOLUME'&&D.idle<C.COMM_BACK*C.FP_PASS?'VOLUME':'GENERAL'), mf=mainFrame();
    m.querySelector('#uart').innerHTML = `<h3>Front → main (uart.c)</h3><div class="mono small">${ff.map(b=>`<span class="chip">${byteTxt(b)}</span>`).join('')}</div>
      <h3>Main → front (v200w.c UART0_transmit_counter)</h3><div class="mono small">${mf.map(b=>`<span class="chip">${byteTxt(b)}</span>`).join('')}</div>
      <h3>Setup frame (sent after Setup Exit)</h3><div class="mono small">${frontFrame('SETUP').map(b=>`<span class="chip">${byteTxt(b)}</span>`).join('')}</div>
      <p class="small muted">Payload bytes are raw binary, not ASCII (except input numbers and the reference + 0x30). Letters are positional: the main board matches them by index in rx_buffer — which is how the March 2013 SDI byte broke the ProgramNumber read (Findings).</p>`;
    const b=chainBytes(); const names=['REG1 mode_select','REG2','REG3','REG4','REG5','REG6','REG7','REG8','REG9','REG10','REG11 output1..4','REG12 volume1L..4L','REG13 volume5L..8L','REG14 9L 10L VO Dim','REG15 volume1R..4R','REG16 volume5R..8R','REG17 9R 10R 0 mode2vol','REG18 cal · · out4','REG19 analog/sdi · flags','REG20 ref/input/aes codes'];
    m.querySelector('#reg').innerHTML = `<table class="kv">${names.map((n,r)=>{ const w=b.slice(r*4,r*4+4); if (r>0&&r<10) return r===1?`<tr><th>REG2–REG10</th><td class="mono muted">reserved, all 0 (TDM_IN_ctl words 1–9; the SHARC reads only word 0 and 10–19)</td></tr>`:''; return `<tr><th>${n}</th><td class="mono">${w.map(v=>v.toString(16).padStart(2,'0').toUpperCase()).join(' ')}</td></tr>`; }).join('')}</table>
      <p class="small muted">The SHARC reads words 10–16 as 28 indexes into ams81_volume_table.dat (0 = off, 1 = −60 dB … 61 = 0 dB … 76 = +15 dB), word 17 bits 26:24 as the cal_data index, word 18 bits 1:0 as solo. Word 0 of the reply is the hard-coded “V101”.</p>`;
    const ch=D.lanesCh, mm=meterAt(ch,t);
    m.querySelector('#dsp').innerHTML = `<svg viewBox="0 0 980 130" style="width:100%">${[['SPORT0 frame','10 × 24-bit slots'],['fix → float','TDM_IN_audio[10]'],['output previous sample','1 sample latency'],['_VUMeterCalc ×8','x² → VU, PPM attack/decay'],['AES & speaker mixes','gain[pair] · gain[4..25] · gain[27]'],['translate_meter_results','vu_data table + PPM dot'],['shifter (Timer1)','64 bits, mux_count & 3']].map((t_,i)=>`<rect x="${6+i*139}" y="18" width="130" height="46" rx="6" fill="var(--panel2)" stroke="var(--line)"/><text x="${71+i*139}" y="37" text-anchor="middle" font-size="10.5" fill="var(--ink)">${t_[0]}</text><text x="${71+i*139}" y="53" text-anchor="middle" font-size="9" fill="var(--ink2)">${t_[1]}</text>${i<6?`<line x1="${136+i*139}" y1="41" x2="${145+i*139}" y2="41" stroke="var(--ink2)"/>`:''}`).join('')}
      <text x="6" y="90" font-size="11" fill="var(--ink)">CH${ch+1} now: VU index ${mm.vuIdx} → ${mm.vu} segments · PPM index ${mm.pkIdx} → dot at segment ${mm.pk} · cal ${CAL_DATA[calIndex()]} (Cal ${D.cal})</text>
      <text x="6" y="110" font-size="10.5" fill="var(--ink2)">Index = −20·log10(mean square) (0.5 dB steps) + cal (VU − 6). LED count: index ≤12 → 22 (“14”), 39–40 → 13 (“0”), 115+ → off. The phase meter code exists but _PhaseMeterCalc is commented out.</text></svg>
      <table class="kv"><tr><th>index ≤</th>${LED_UPPER.map(u=>`<td class="mono small">${u}</td>`).join('')}</tr><tr><th>segments</th>${LED_UPPER.map((u,k)=>`<td class="mono small">${22-k}</td>`).join('')}</tr><tr><th>lens label</th>${SEG_LABEL.map(l=>`<td class="mono small">${l}</td>`).join('')}</tr></table>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__ams81Active = false;
  const li = (t,b)=>`<li><b>${t}</b> ${b}</li>`;
  m.innerHTML = card('What the AMS8-1 firmware is up to — findings from the source', `<ol>
    <li><b>Artwork ${SIM.year(2026)}: front and rear panels now from ${artSrc('FRONT')} (OCT.19/15), ${artSrc('LENS')} (May 08/15) and ${artSrc('REAR')} (MAY 07/15).</b> (a) The “CURVES” front file is not in curves: all 46 legends are still live Arial text objects, and libcdr drops their alignment, so centred legends were re-centred on the button, knob and jack centres. (b) The 2015 front has <i>hexagonal</i> vents left and right; ${SIM.src(ART.DIR+'Pics/AMS8-1A (AMS8-M24)Front.jpg','AMS8-1A (AMS8-M24)Front.jpg')} shows slotted vents, so the photo is another issue (AMS8-M24; a sister sheet ${SIM.src(ART.DIR+'AMS8-1A-FRONT-SILK (AMS8-M24).cdr','AMS8-1A-FRONT-SILK (AMS8-M24).cdr')} sits beside it). (c) The lens is a shared part: the M6 sheet is the long MLC8-M3 window (1014 × 108 pt) with eight round holes on its right; the AMS8-1 uses only its left 216 pt with the CH1–CH8 scales, DD and ERR. (d) The 1B and 1CA fronts (${SIM.src(ART.DIR+'AMS8-1B-FRONT-SILK (CURVES).cdr','1B')}, ${SIM.src(ART.DIR+'AMS8-1CA-FRONT-SILK (CURVES).cdr','1CA')}, Apr 2016) are different variants and are not modelled.</li>
    ${li("'Z' is not the bootloader any more.", `The protocol doc lists <span class="mono">(Z) Bootloader | Device</span>. In main-board V050001, UART0 'Z' carries <span class="mono">output4_settings</span> (the Setup “Out4 In4/Mon” item). The only line that sets <span class="mono">bootloader = YES</span> is commented out (v200w.c ~810), and so are the jumps to <span class="mono">0x1F800</span> / <span class="mono">loader</span> in <span class="mono">UART1_translate</span>. The linker still reserves <span class="mono">-bbootloader:0x1F800.0x20000</span>, but <span class="mono">bootloader.s</span> is not in the project's file list, and <span class="mono">v200w.mp</span> shows no boot code. Field updates must have used ISP.`)}
    ${li('The bootloader itself is half-finished.', `<span class="mono">bootloader.s</span> (AVRFreaks DN#032, AVR910-style, UART1 38400 Bd) erases pages only until R27 = 0x60 with RAMPZ = 0, reads with <span class="mono">lpm</span> (first 64 KB only), claims auto-increment on 'a' but never increments, and returns no signature on 's'. After 'L' it loops without WDR so the watchdog resets the chip — the exit.`)}
    ${li('The main board shouts continuously.', `<span class="mono">UART0_transmit_counter</span> sends one byte every 3 loops whether or not anything was asked: format, configuration, programme, dialnorm, mix level, frame and data rate, one extended-metadata value and the mode. The front panel likewise sends a byte every 25 passes forever (<span class="mono">data_available0</span> is never cleared). <span class="mono">Transmit_Counter</span> was tuned 200 → 100 → 50 → 25 (old values commented in common.h).`)}
    ${li('An off-by-one from the 2013 SDI change.', `On Mar 28 2013 an SDI lock byte was inserted after 'A' in the general frame. The main board's parser still reads <span class="mono">ProgramNumber = rx_buffer[3]</span> — now the letter 'C' itself (v200w.c ~1124). The per-programme metadata branches (<span class="mono">ProgramNumber == NO1..NO8</span>) can never match, so dialnorm and mix level for a chosen programme don't update. Mode-4 frames have no SDI byte, so the bug only bites in modes 1–3.`)}
    ${li('Lock polarity: the document is wrong, not the code.', `Issue 5 removed CS8416 receivers 1–4 and reads lock from the FPGA (<span class="mono">aesReadLockStatus</span> = <span class="mono">alteraRead(0x00)</span>; ControlDescription_Jan212013 says 1 = locked). <span class="mono">ISOLATE_INPUT_STATUS</span> still inverts the byte (“CS8416 locked = 0”). The FPGA design answers it: in <span class="mono">AMS81.bdf</span> aes3_input_detected[3..0] passes through NOT gates inst65/73/74/75 into aesrx_lock[3..0], so register 0x00 reads 1 = no lock, like the CS8416. The inversion in ISOLATE_INPUT_STATUS is right; the control description is wrong.`)}
    ${li('Corrected 2026|59: wait_ms timing and lock polarity.', `Counted from the <span class="mono">_wait_ms</span> listing (<span class="mono">v200w.lis</span>: wdr, subi, sbci, cpi, ldi, cpc, brlt = 8 cycles × 100 + 8), one “ms” of <span class="mono">wait_ms</span> is 808 cycles ≈ 164 µs at 4.9152 MHz. So the SDI-relock Dolby freeze is ≈ 247 ms, not 1.5 s, and the 9 × wait_ms(500) boot delay is ≈ 0.74 s, not 4.5 s. The SDI stall in the model is now ≈ 247 ms, and the power-up trace gives the 0.74 s. The lock polarity question above was open; the NOT gates inst65/73/74/75 in the FPGA drawing settle it as 1 = no lock (see rd60-ams81a-iss5.js, rd66-mlc8-ams8e1-iss5.js).`)}
    ${li('A quarter-second freeze on SDI lock.', `When the demux reports SDI lock (0→1), main() runs <span class="mono">wait_ms(1000); PORTE &amp;= ~BIT2; wait_ms(500); PORTE |= BIT2</span> to reset the Dolby card. <span class="mono">wait_ms</span> is 100 <span class="mono">WDR</span>s per “ms” (808 cycles ≈ 164 µs, so the pair lasts ≈ 247 ms), so the watchdog stays quiet, but nothing else on the main board runs: no ALTERA chain, no UART parsing. Try “SDI: lock” with the demux fitted and watch the main-loop lane.`)}
    ${li('The FPGA link check checks “V201” and nothing happens.', `<span class="mono">ALIGNMENT_CHECK</span> expects the first four bytes back from the chain to be 'V','2','0','1' (not the “SYNC” of the Issue 4 register document, which describes a different, AMS16-style register map). After 200 misses it returns 0 — and <span class="mono">error0</span> is never used. Compare the POD33, where the same check reboots the MCU.`)}
    ${li('The 80-byte chain is the DSP\'s control block.', `The main MCU's bit-banged 80 bytes (PC4–PC7) go through two <span class="mono">shift_in32</span> blocks in the FPGA straight into the SHARC's SPORT1 as <span class="mono">TDM_IN_ctl[20]</span>. Bytes 40–67 are 28 indexes into the volume table, byte 68 picks the meter calibration. REG2–REG10 (36 bytes) are sent as zeros every pass; the SHARC never reads words 1–9 (v205).`)}
    ${li('The meter freeze that took 78 days.', `In <span class="mono">shifter</span>, <span class="mono">mux_count</span> was incremented with ALU saturation on (<span class="mono">mode1</span> ALUSAT). After 2³¹ Timer1 ticks it stuck at 0x7FFFFFFF, so <span class="mono">&amp; 3</span> stuck at 3 and the LED multiplex froze on one phase: about 78 days of uptime at 320 Hz ${INF}. The April 24, 2009 fix masks with 3 before incrementing (v203m, v205, v300).`)}
    ${li('Meter facts the manual leaves out.', `The bar is VU (0.6 s to move 40 dB) and the single dot is PPM (8.3 ms attack, 6 s per 40 dB fall). VU gets an extra −6 index steps (+3 dB) so a sine reads its peak level. With Cal −20 the “0” LED is −20 dBFS; each 2 dB of Cal is one <span class="mono">cal_data</span> step of 4. <span class="mono">cal_data[7] = −1</span> is never selectable.`)}
    ${li('Dead DSP code.', `<span class="mono">_PhaseMeterCalc</span> is commented out, so <span class="mono">phase_results</span> stays 128 and nobody reads it. <span class="mono">sin2400table.dat</span> (a 20 Hz-step tone table), <span class="mono">trim_data.dat</span> and <span class="mono">halfdb_data.dat</span> are loaded or declared but unused. <span class="mono">#define version 'V101'</span> is unused; the reply word is a hard-coded 0x56313031 “V101” in every version, while the header lists v200–v202. <span class="mono">ams81_volume_table.dat</span> says “+12dB” but goes to +15.`)}
    ${li('Version strings disagree.', `V040002 shows “06VA0002” (REVISION1–8). Its header says “06VA0001”, the unused <span class="mono">op_line3</span> says “v102”, the project path says “04VA0001”. V040100 (the 1AN build) shows “06AV0100” — letters swapped — and the 06VA0002 test report's table says “06AV0002” while its note says “06VA0002”. The main-board code has no version string at all; its header still reads “Ams8E-1 C1.01 … Issue 2 PCB, April 20, 2006”.`)}
    ${li('06VA0002 = a display change.', `The only code change from V040001 to V040002 is <span class="mono">SIEMENS8_lcd_initialization</span>: drive CE, WR, RD and FL high, pulse RESET low for 10 ms, then wait 1 ms. The 2016|49 test report says this was for the HDSP2533 that replaced the PDSP1884. The macro names are confusing: <span class="mono">NOT_SIEMENS_CHIPENABLE</span> drives CE low but is commented “CE is high”.`)}
    ${li('Manual vs code: Mode 1 presets.', `The manual says pressing preset A repeatedly cycles Ch 1 → Ch 2 → 1/2 → 1+2 → LoRo. In V040002 the cycling is commented out (v200w.c ~10331): MODE1 presets always select LEFT.`)}
    ${li('Manual vs code: modes.', `Manual 2113 says Mode 1, 2, 3 or 4; 2117 says 1, 2 or 4. The code steps 1 → 2 → 4 → 1, so Mode 3 (voice-over) and Mode 5 (source sets, mode5.c) cannot be chosen, yet their button handling is still compiled in. MODE3's init is commented out of <span class="mono">DATA_initialization</span>.`)}
    ${li('Small slips.', `The start-up volume item first reads “Vol  -30” although level 30 is −31 dB. <span class="mono">LARGE_change</span> (3 dB volume steps) is never set. <span class="mono">UART0_com_check</span> is never called, so the “ No Com ” screen can't appear. <span class="mono">COLON</span> is defined as 0x58 ('X'). <span class="mono">DIM_SCREEN</span> = <span class="mono">FAVOURITE_SCREEN</span> = 255, and Dim travels in every setup frame but has no menu item. In the main board, <span class="mono">i = ~Astatus &amp; Adata</span> is always 0, so the PCM/data output is dead.`)}
    ${li('Variants in the code.', `V040100 (1AN, 06AV0100) replaces the “Analog” source name with “AES67” (“Avb-Add” blocks) because the analog slot carries the uNet card. The SDI demux codes for groups 1/2 and 3/4 set identical bits in the FPGA word (main board), so the FPGA cannot tell them apart.`)}
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>Front loop pass ≈ 333 µs ${INF}: PRESET_DEBOUNCE (9000 passes) = the manual's “approximately three seconds”. This sets the UART byte rate (8.3 ms) and the screen time-out (1.67 s).</li>
    <li>Main loop pass ≈ 4 ms ${INF}: 640 bit-banged bits each way plus CS8416 and SPI traffic at 4.9152 MHz.</li>
    <li>SHARC core 49.152 MHz ${INF} (sysdef.h says 60 MHz; the Timer0 MCLK divider only works at 49.152 MHz), so the shifter runs at 320 Hz.</li>
    <li>PPM = max(attack filter, decaying hold); meters work on mean square; the programme material and the Dolby channel levels are test signals.</li>
    <li>DD LED lit when the pair's input carries a Dolby bitstream and ERR unused: what drives these LEDs is not traced ${INF}. Display strings for Dolby formats (“E 5.1+2”, “DD 3/2L”) follow the manual's DATA TABLE; metadata values are the manual's examples.</li>
    <li>Default preset mixes (A = CH1/2 … D = CH7/8) and O/P Fix = 0 dB index ${INF}. Lock/unlock is immediate here; the firmware counts 25 loops.</li>
    <li>Front-panel text was re-set from the CorelDRAW text objects (libcdr); positions come from the drawing, the typeface is a substitute.</li></ul>`)
  + card('Sources', `<ul class="small mono">
    <li>AMS81 - #Master/AMS8 - #Engineering/AMS8 - #Software/AMS8 - #Software #Atmel/…#Ams8e-5 #V040002/v200w.c, control.c, uart.c, common.c/.h, SIEMENS8.c (and V040001, V040100 for diffs)</li>
    <li>…/…#Ams8e-1 #V050001/v200w.c, altspi.c, AESAudio.c, dolby.c, common.h, bootloader.s, v200w.mak/.mp</li>
    <li>…/AMS8 - #Software #Altera/…#V050100/AMS81.qsf, AMS81.bdf, AMS81.sdc, spicontrol.v, brightness_ctl.vhd, shift_in32.vhd; …#V300/non_audio_detector.vhd</li>
    <li>…/AMS8 - #Software #Sharc/…#v205/ams81_main.asm, ams81_INIT.ASM, vumeter.asm, phasemeter.asm, *.dat</li>
    <li>…/AMS8 COMMUNICATION PROTOCOL #software.doc · AMS8-1 ISSUE 4 Operational Info.doc · AMS8 - #Manual/AMS81 Operators Instructions version 2117 / 2113</li>
    <li>AMS8-1 - #TESTREPORT/*.pdf · AMS8E - #Master/AMS8E-1 ISS5 - ALTIUM.csv, AMS8E-4-PCAD.csv, AMS8E-4 Production Notes.docx</li>
    <li>AMS81 - #ARTWORK #DA #2016/${artSrc('FRONT')}, ${artSrc('LENS')}, ${artSrc('REAR')} (assets/ams81-front.svg, -lens.svg, -rear.svg), Pics/*.jpg</li></ul>`);
}

/* ---------------- register plugin ---------------- */
SIM.register({
  id:'ams81', name:'AMS8-1A · 8-channel audio monitor (2013|46)', duration:1,
  product:'AMS8-1 (AMS8E)', year:2013, family:'AMS8 series',
  folder:'AMS81 - #Master',
  summary:'1RU eight-channel aural/visual monitor: eight 22-segment VU+PPM bar graphs, an 8-character display, speakers and preset mixes over four AES pairs (75 Ω and 110 Ω banks). Four processors: front ATmega128 (UI), main ATmega128 (protocol, Dolby card, FPGA chain), Cyclone IV FPGA (AES receive/SRC, routing) and an ADSP-21065L SHARC (mixing and meters). Variants 1A, 1AA, 1AEM, 1AN, 1BAEM, 1CAM.',
  highlights:['Front and rear panels on the real CorelDRAW silk and meter lens','13-step operator tutorial from the v2117 manual','Button → front MCU → UART → 80-byte chain → SHARC trace','Real VU/PPM ballistics and the 4-phase LED multiplex','“Z bootloader” that is really Out4; 247 ms SDI freeze; 78-day meter freeze fix'],
  depth:'Full model',
  stepUnits:[
    {label:'1 sample (48 kHz)', period:()=>1/C.FS},
    {label:'1 front loop pass', period:()=>C.FP_PASS},
    {label:'1 shifter tick', period:()=>1/C.SHIFT_HZ},
    {label:'1 main loop pass', period:()=>C.MB_PASS},
    {label:'1 front UART byte slot', period:()=>C.TX_EVERY*C.FP_PASS},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.25,'250 ms (one UART frame)'],[0.1,'100 ms'],[0.025,'25 ms (bytes)'],[0.0125,'12.5 ms (4 shifter ticks)'],[0.004,'4 ms (main pass)'],[0.001,'1 ms (front passes)'],[0.0002,'200 µs (samples)'],[0.00005,'50 µs (TDM slots)']],
  defaultZoom:0,
  init(){ MKEY=''; lastT=null; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the AMS8-1', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewAnatomy},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
