/* =====================================================================
   SERIALBOXX — MF100 card frame + SD403A/B/C SDI audio demultiplexer (Ward-Beck Systems, 2001|34–2008|41)
   Plugin for the WBS Device Simulator (../siumulation.html). Full model: frame, power, rear terminations,
   and the SD403 card down to its ATmega128 main loop, read pass by pass from the firmware.

   Sources (all in #SERIALBOX #SERIES/ unless noted):
   - SERIALBOXX - #SD400/SD403/Software/SD403B/v202/v202.c (16 Jan 2007, SD403B 2-group) and
     Software/SD403C/v203/v202.c (24 Jan 2008, SD403C remote swap): main(), SDI_Carrier_Detect, TRANSLATE_INPUT,
     DEBOUNCE_INPUT, PROCESS_CARRIER_DETECT, ALTERA_write (6 bytes), ALTERA_read (18 bytes), ALIGNMENT_CHECK,
     PROCESS_ALIGNMENT_CHECK, CONFIGURE_ALTERA, COMPARE_AUDIOx_AUDIOy, PROCESS_SAMPLExx_COMPARE,
     PROCESS_GROUP_COMPAREx, TRANSLATE_RESET_VECTOR(1), PROCESS_AUDIO_INFORMATION, OUTPUT_LEDS, constants
   - Software/v201/v201.C (26 Jul 2005, SD403A remote swap, 2-byte write, reset vector on PORTC)
   - PIC VERSIONS/403v100…403v102/*.asm (PIC16F874 + GS9023, 2001|34–2003|36), SD403Dv100/sd403Dv0.asm (ADV7171)
   - PCB/SD403iss5.net (P-CAD netlist, 27 Aug 2004: every pin and net name quoted), SD403iss5 PCB revisions.doc,
     SD403A-assy - #Assembly.pdf (P-CAD 2002 drawing of SD403 ISSUE.5) → assets/serialbox-sd403-assy-silk.png
   - PCB/Altera/v102/Altera/sd403iss1.qsf (EP1C6T144C7 + EPCS1) and PCB/Altera/SD403B/v100/pod31.qsf, swap.vhd,
     group selector.vhd
   - SD403MANiss5v1.pdf (Jun 2008 manual), SD403MAN.PDF (Aug 2001), Functionals/SD403A/B_FUNCTION.cdr,
     JUMPER_SETTINGS_SD403.cdr (converted with Inkscape)
   - SERIALBOXX - #mf100/MF100man.wpd, MF100.pdf (Jan 2003), m8245aspecs.wpd, MF100TERM.cdr; Serialboxx.wpd (NAB 2001)
   - MF100 Front.jpg, MF100 Rear w REF.jpg, Serialboxx3.jpg, serialboxxfront.cdr (photos, panel layout)
   - SERIALBOXX - #mf100_4/SILK/frontSScurve.cdr → Inkscape plain SVG → assets/serialbox-front-wbs.svg, -wordmark.svg,
     -byline.svg (vector, Artwork 2026|59; replace the old PNG cuts), placed where MF100 Front.jpg shows them
   - Every other card's manual (.wpd sidecars) for the card selector.
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
'use strict';
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
/* Artwork 2026|59: preload the CorelDRAW SVGs once, so panels that are re-rendered every frame never show them half-loaded */
const ART_PRELOAD = ["serialbox-front-wbs.svg", "serialbox-front-wordmark.svg", "serialbox-front-byline.svg"].map(n=>{ const i=new Image(); i.src=ASSET+n; return i; });
const inf = '<span class="tag-inf" title="Not stated in the archive; inferred">inferred</span>';
const infW = w => `<span class="tag-inf" title="Inferred: ${String(w).replace(/"/g,'&quot;')}">inferred</span>`;
const card = (t,b,cls,id)=>`<div class="card ${cls||''}"${id?` id="${id}"`:''}><h2>${t}</h2>${b}</div>`;
const tbl = (h,rows)=>`<table class="kv"><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
const hex2 = v => (v&0xFF).toString(16).toUpperCase().padStart(2,'0');
const bin8 = v => (v&0xFF).toString(2).padStart(8,'0');
const Y = y => SIM.year(y);
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

/* =====================================================================
   1. THE CARD LINE — every Serialboxx card found in the folder (selector + Findings)
   ===================================================================== */
const CARDS = {
  SD403A:{fam:'SDI',fn:'1-group SDI audio demuxer, AES + analog (with SD400A + TB102)',ctl:'ATmega128L v201 + Cyclone EP1C6',code:'Software/v201/v201.C',term:'TB102',tal:['CD','AUDIO1','AUDIO2','ERROR'],full:true,ma:[110,80],src:'SD403MANiss5v1.pdf, SD403A_FUNCTION.cdr'},
  SD403B:{fam:'SDI',fn:'2-group SDI audio demuxer, 4 SDI + 4 AES BNC',ctl:'ATmega128L v202 + Cyclone EP1C6',code:'Software/SD403B/v202/v202.c',term:'BNC',tal:['CD','AUDIO1','AUDIO2','ERROR'],full:true,ma:[110,80],src:'SD403MANiss5v1.pdf, SD403B_FUNCTION.cdr'},
  SD403C:{fam:'SDI',fn:'2-group SDI audio demuxer, balanced AES on TB102 + remote swap',ctl:'ATmega128L v203 + Cyclone EP1C6',code:'Software/SD403C/v203/v202.c',term:'TB102',tal:['CD','AUDIO1','AUDIO2','ERROR'],full:true,ma:[110,80],src:'SD403MANiss5v1.pdf, SD403C_FUNCTION.cdr'},
  SD403D:{fam:'SDI',fn:'demuxer with composite video out (ADV7171) — 2001 code only',ctl:'PIC16F874 sd403Dv0.asm',code:'SD403Dv100/sd403Dv0.asm',term:'BNC',tal:['CD','AUDIO1','AUDIO2','ERROR'],src:'sd403Dv0.asm header (16 Apr 2001); not in any manual'},
  SD400A:{fam:'SDI',fn:'D-to-A daughter card for SD403A (2 stereo or 4 mono)',ctl:'none',code:'',term:'(on SD403A)',tal:[],src:'sd400a/PCB/SD400ABOM.doc; SD403 manual'},
  SD401A:{fam:'SDI',fn:'1×8 non-reclocking SDI DA, 143–360 Mb/s',ctl:'none',code:'',term:'BNC',tal:['CD','ERROR'],src:'sd401/MANUALS/Sd401manu.wpd'},
  SD402A:{fam:'SDI',fn:'1×8 reclocking SDI DA',ctl:'PIC12F675 SD402V100',code:'SD402/Software',term:'BNC',tal:['SIGNAL','CONFIDENCE','ERROR'],src:'SD402/MANUAL/SD402AMANv2.wpd'},
  SD404A:{fam:'SDI',fn:'SDI audio muxer (embedder), 2 groups, EDH, SRC 30–96 kHz',ctl:'PIC16F874 sd404v0…V105',code:'SD404/PIC VERSIONS',term:'BNC / TB102 (B)',tal:['CD','AUDIO1','AUDIO2','ERROR'],src:'SD404/SD404MAN.wpd'},
  SD405A:{fam:'SDI',fn:'SDI audio muxer, one group, analog or AES in',ctl:'PIC16F874/747 sd405v0…V106',code:'SD405/Software',term:'TB102',tal:['CD','AUDIO1','AUDIO2','ERROR'],src:'SD405/SD405MAN.wpd (see the sd405-iss1 plugin)'},
  SD406A:{fam:'SDI',fn:'SDI monitoring DA: 4 SDI + 4 NTSC/PAL',ctl:'PIC16F874/874A/747 + EPM3032A',code:'sd406/Software',term:'BNC',tal:['CD','ERROR'],src:'sd406/SD406MAN.wpd'},
  SD406B:{fam:'SDI',fn:'"full monitor" DA: SDI, analog video, demuxed stereo',ctl:'PIC16F874/874A/747 + EPM3032A',code:'sd406/Software',term:'TB102',tal:['CD','AUDIO1','AUDIO2'],src:'sd406/SD406MAN.wpd'},
  SD408:{fam:'SDI',fn:'termination drawing only',ctl:'—',code:'',term:'SD408TRM.cdr',tal:[],src:'SD408/SD408TRM.cdr, PCB'},
  SD410A:{fam:'SDI',fn:'embedded audio shuffler/leveller (preliminary), RS-485, FC110A panel',ctl:'floating-point DSP (not in folder)',code:'',term:'BNC',tal:[],src:'SD410/SD410MAN.wpd'},
  DA301A:{fam:'AES',fn:'AES DA with on-board D-to-A',ctl:'PIC16C5x OTP v100–v102',code:'DA301 - #Engineering/PIC VERSIONS',term:'TB102',tal:['SIGNAL','EYE','EQ'],src:'DA301 …/MANUAL/Da301manu.wpd'},
  DA301B:{fam:'AES',fn:'1×8 AES DA',ctl:'PIC16C5x',code:'',term:'BNC',tal:['SIGNAL','EYE','EQ'],src:'Da301manu.wpd'},
  DA302A:{fam:'AES',fn:'48 kHz DARS / tone generator (1 kHz A, 400 Hz B)',ctl:'PIC16F874 + MAX 3000A',code:'DA302 - #Engineering/pic, altera',term:'BNC / TB103',tal:['REF'],ref:true,src:'DA302 MANUAL.wpd, test reports 2010|43'},
  DA303A:{fam:'AES',fn:'analog to AES converter, 24-bit, 16 s calibration',ctl:'PIC16C5x Da303 v100/aV101',code:'DA303 - #Engineering/PIC VERSIONS',term:'TB102',tal:['CAL'],ref:true,src:'Da303manu.wpd'},
  DA304A:{fam:'AES',fn:'AES DA with sample-rate converter',ctl:'PIC Da304 v100/v101',code:'da304 - #Engineering/PIC VERSIONS',term:'BNC / TB103',tal:['SIGNAL','EQ'],ref:true,src:'Da304manu.wpd'},
  DA304B:{fam:'AES',fn:'AES DA, 8 × 75 Ω or 6 × 110 Ω',ctl:'PIC',code:'',term:'BNC / TB103',tal:['SIGNAL','EQ'],src:'Da304manu.wpd'},
  DA305A:{fam:'AES',fn:'AES processing DA: digital level, mix, tone; SHARC',ctl:'PIC16F874/877 + EPM7000 + ADSP-21065L',code:'DA305 - #Engineering/…/pic, altera, sharc',term:'BNC / TB102',tal:['IN1','IN2'],ref:true,src:'DA305 MANUAL.wpd, DA305A-ISS4 assembly'},
  DA305B:{fam:'AES',fn:'DA305 variant (B manual)',ctl:'as DA305A',code:'',term:'TB102',tal:['IN1','IN2'],src:'DA305B MANUAL.wpd'},
  DA305C:{fam:'AES',fn:'DA305 variant for ALFA (cut sheet)',ctl:'as DA305A',code:'',term:'TB102',tal:['IN1','IN2'],src:'ALFA_DA305C MANUAL.wpd'},
  AV201A:{fam:'VIDEO',fn:'1×8 video DA, differential input, ±3 dB trim',ctl:'none',code:'',term:'BNC',tal:[],src:'av201/Av201aman.wpd, test reports 2009|42'},
  AV202A:{fam:'VIDEO',fn:'1×8 video DA, clamping input + EQ',ctl:'none',code:'',term:'BNC',tal:[],src:'AV202/MANUAL/Av202aman.wpd'},
  AV203A:{fam:'VIDEO',fn:'1×8 utility video DA, level trim, looping input',ctl:'none',code:'',term:'BNC',tal:[],src:'AV203/MANUAL/Av203aman.wpd'},
  AA101A:{fam:'AUDIO',fn:'universal audio DA: mono, stereo, mixing, ±15 dB',ctl:'none',code:'',term:'TB101',tal:[],src:'aa101/MANUAL/Aa101aman.wpd'},
  AA102A:{fam:'AUDIO',fn:'1×8 remote-gain audio DA (launch list only)',ctl:'?',code:'',term:'TB101',tal:[],src:'Serialboxx.wpd only — no folder'},
  AA103A:{fam:'AUDIO',fn:'400/1000 Hz oscillator, 0/+4/+8 dBu, −60 dBm',ctl:'none',code:'',term:'TB101',tal:[],src:'aa103/MANUAL/Aa103man.wpd (PCB folder holds the M8203 board, see m8203 plugin)'},
};
const CARD_IDS = Object.keys(CARDS);
const isSD403 = id => /^SD403[ABC]$/.test(id||'');

/* =====================================================================
   2. CONSTANTS FROM THE SOURCE
   ===================================================================== */
const C = {
  XTAL: 4.9152e6,             // v202.c header "Crystal: 4.9152Mhz"; X1 = 4.9152 in SD403iss5.net
  CYCLES: 4000,               // INFERRED: ≈2 350 cycles of bit-banging (48 bits out, 144 in) + ≈1 650 of logic per pass
  get LOOP_T(){ return this.CYCLES/this.XTAL; },   // ≈ 0.814 ms
  DEB: 255,                   // SWITCH1_DEBOUNCE (also used for ERROR2/3/4 debouncing)
  ERR2_DEB: 255,              // ERROR2_DEBOUNCE
  ERR34_DEB: 500,             // ERROR3_DEBOUNCE / ERROR4_DEBOUNCE
  GRP_HOLD: 255,              // reset_counter = 255 in TRANSLATE_RESET_VECTOR
  CNT_MAX: 2,                 // COUNT_DIFFERENCE_MAX
  WAIT10: 0.00122,            // wait_ms(10): 100 × WDR loop "equals one ms" — at 4.9152 MHz it is ≈0.12 ms → INFERRED 1.22 ms
  CFG_T: 0.060,               // INFERRED Cyclone EP1C6 load from EPCS after nCONFIG (≈1.17 Mbit at ≈20 MHz + init)
  WDT: 0.014,                 // WDTCR = 0x08 → 16K WDT cycles ≈ 14 ms (ATmega128 datasheet)
  FS: 48000, FIELD: 1001/60000, LINE: 1001/60000/262.5, WORD: 1/27e6,
  CABLE_MAX: 250,             // manual: "up to 250 metres (750 ft)"; loss of lock beyond ≈300 m is INFERRED
};
const GROUP_DID = ['2FF','1FD','1FB','2F9'];   // SMPTE 272M audio data packet DIDs (general knowledge — inferred)
const TONE = [[1000,400,1000,400],[500,500,2000,2000],[300,600,900,1200],[700,700,250,250]];   // test source on the SDI (demo)

/* main-loop steps of v202 main(); fractions of one pass (INFERRED from the bit counts) */
const STEPS = [
  ['WDR · SDI_Carrier_Detect(PINF) · TRANSLATE_INPUT · DEBOUNCE_INPUT · PROCESS_CARRIER_DETECT', .06, 'CD from the CLC016 on PF1; 255-pass debounce; CD/ERROR LEDs; ALTERA10 (PA5)'],
  ['READ_SWITCHES(PINB) · INVERT_DATA → DIP_SWITCH · PROCESS_AUDIO_INFORMATION', .04, 'SW1–SW8 on PB7…PB0; build the mute byte from last pass\'s AUDIO1–4'],
  ['ALTERA_write(): 6 bytes MSB-first on PC0, clock PC5, STROBE_WRITE PC7', .17, 'dolby_upper, dolby_lower, reset_data ×2, AUDIO_INFORMATION, group_data'],
  ['ALTERA_read(): 3 × STROBE_READ (PC6) + 18 bytes on PC1 / PC3 / PC2', .45, 'ALTERA1–6 group 1, ALTERA7–12 group 2, ALTERA13–18 aux — one line at a time'],
  ['Audio1_Detect · Audio2_Detect → AUDIO1 LED (PE5)', .03, 'bit 7 of each channel byte = AES lock'],
  ['WDR · ALIGNMENT_CHECK(ALTERA6) · TRANSLATE/DEBOUNCE_ERROR2 · PROCESS_ALIGNMENT_CHECK', .05, 'ALTERA6 & 0xF0 must be 0xA0, else re-configure the FPGA'],
  ['COMPARE_AUDIO1_AUDIO2 / 3_4 · PROCESS_SAMPLE12/34_COMPARE', .07, 'channel sample counts within 2 → else reset that FIFO'],
  ['Audio3/4_Detect · COMPARE_AUDIO5_6 / 7_8 · PROCESS_SAMPLE56/78 → AUDIO2 LED (PE6)', .08, 'the same for GROUP SEL 2'],
  ['PROCESS_GROUP_COMPARE1/2 · TRANSLATE_RESET_VECTOR(1)', .03, 'a new group setting holds bit 4 low for 255 passes'],
  ['PORTE = OUTPUT_LEDS(PORTE, LED_MASK)', .02, 'CD PE4 · AUDIO1 PE5 · AUDIO2 PE6 · ERROR PE7'],
];
const STEP_FRAC = (()=>{ let a=0; return STEPS.map(s=>{ const r=a; a+=s[1]; return r; }); })();

/* =====================================================================
   3. STATE — frame, slots, and the SD403 inputs as a history of events
   ===================================================================== */
const DEF_SLOTS = ['SD403B','SD403C','SD403A','SD402A','SD404A','SD405A','DA302A','DA305A','AV202A','AA103A'];
const D = {
  slots: DEF_SLOTS.slice(), focus: 0, door: false, slotIn: new Array(10).fill(true),
  ref: 'none',                         // MF100REF: none / aes / video
  mono: [false,false],                 // SD400A H10-H11 / H12-H13 (SD403A only)
  init: null, events: [],
  log: [], tutorial: 0, showDip: true,
};
function freshInit(){ return { sdi:true, cable:100, groups:[1,1,1,0], dip:0x00, rsw:[0,0], ps1:true, ps2:true, fault:0, stuck:false, skew:-1 }; }
D.init = freshInit();
const variant = ()=>{ const id = D.slots[D.focus]; return isSD403(id) ? id.slice(-1) : 'B'; };
/* inputs at time t: initial state + every event up to t */
function inputsAt(t){
  const s = JSON.parse(JSON.stringify(D.init));
  for (const e of D.events){ if (e.t > t) break; if (e.k==='groups'||e.k==='rsw') s[e.k]=e.v.slice(); else if (e.k==='fault'){ s.fault = e.v; } else if (e.k==='skew'){ s.skew=e.v; s.skewT=e.t; } else s[e.k]=e.v; }
  return s;
}
const now = ()=> inputsAt(SIM.t);
function pushEvent(k, v){
  const t = SIM.t;
  // later events of the same kind are replaced: the change holds from the playhead on
  D.events = D.events.filter(e=> !(e.k===k && e.t>=t));
  if (t <= 0){ if (k==='groups'||k==='rsw') D.init[k]=v.slice(); else D.init[k]=v; if(k==='fault'||k==='skew'){ D.events.push({t:0,k,v}); } }
  else D.events.push({t, k, v: Array.isArray(v)? v.slice(): v});
  D.events.sort((a,b)=>a.t-b.t);
  SIMKEY = '';
}
const dipOn = (dip,n)=> !!(dip & (1<<(8-n)));       // SWn → PB(8-n); ON closes to 0 V, INVERT_DATA makes it 1
const grpSel = dip => [ ((dip>>7)&1)*2 + ((dip>>6)&1), ((dip>>4)&1)*2 + ((dip>>3)&1) ];   // group_sel/2

/* =====================================================================
   4. THE FIRMWARE, PASS BY PASS (v202 main(); v203 adds remote swap; v201 is single-group)
   ===================================================================== */
let SIM_CACHE = null, SIMKEY = '';
function freshFW(){
  return { CD:0, switch1:0, release1:0, sw1c:0, leds:0x80, alt10:0,
    AUDIO1:0, AUDIO2:0, AUDIO3:0, AUDIO4:0, AI:0,
    ERROR2:1, switch2:0, release2:0, sw2c:0, RESET2:0, e2c:0,
    ERROR3:1, switch3:0, release3:0, sw3c:0, RESET3:0, e3c:0,
    ERROR4:1, switch4:0, release4:0, sw4c:0, RESET4:0, e4c:0,
    ERROR2_3:1, switch2_3:0, release2_3:0, sw23c:0, RESET2_3:0, e23c:0,
    ERROR2_4:1, switch2_4:0, release2_4:0, sw24c:0, RESET2_4:0, e24c:0,
    ERROR5:1, ERROR2_5:1, prevG1:0xFF, prevG2:0xFF, rstEn:0, rstCnt:0, rstEn1:0, rstCnt1:0,
    RV:0x0F, RV1:0x0F, A:new Array(18).fill(0), W:[0,0,0,0,0,0] };
}
/* generic debounce trio used for ERROR2/3/4 (TRANSLATE_ERRORx + DEBOUNCE_ERRORx) */
function translateErr(F, ok, sw, rel, cnt){
  if (ok){ F[sw]=1; F[cnt]=0; F[rel]=0; } else if (F[sw]===1) F[rel]=1;
  if (F[rel]===1){ if (F[cnt] < C.DEB) F[cnt]++; else { F[cnt]=0; F[rel]=0; F[sw]=0; } }
}
/* PROCESS_SAMPLExx_COMPARE (the RESET3 typo in PROCESS_SAMPLE56_COMPARE is kept: firstFlag) */
function processCompare(F, sw, RES, ERR, cnt, firstRES){
  if (F[firstRES||RES]===0 && F[sw]===0){ F[RES]=1; F[cnt]=0; F[ERR]=0; }
  else if (F[RES]===1 && F[sw]===0){ if (F[cnt]===C.ERR34_DEB) F[RES]=0; else F[cnt]++; }
  else if (F[RES]===1 && F[sw]===1){ F[RES]=0; F[ERR]=1; }
}
function trv(F, e1,e2,e3,e4,e5,e6, en, cn){
  let d = 0x0F; if(!e1) d&=~1; if(!e2) d&=~2; if(!e3) d&=~4; if(!e4) d&=~8;
  if (!e5 || !e6){ d &= ~0x10; F[en]=1; F[cn]=C.GRP_HOLD; }
  else if (F[en] && F[cn]!==0){ F[cn]--; }
  else { d |= 0x10; F[en]=0; }
  return d;
}
function runSim(){
  const v = variant();
  const key = JSON.stringify([v, D.init, D.events]);
  if (key === SIMKEY && SIM_CACHE) return SIM_CACHE;
  SIMKEY = key;
  const passes = [], recfg = [];
  let F = freshFW(), t = 0, i = 0, powered = false;
  let cfgDone = Infinity, faultOn = false, skew = -1, lastFaultT = -1, lastSkewT = -1;
  const startCfg = at => { cfgDone = at + C.CFG_T; recfg.push(at); };
  while (t < 1.0005){
    const In = inputsAt(t);
    const pw = In.ps1 || In.ps2;
    if (!pw){ powered = false; passes.push({i:-1,t0:t,t1:t+0.001,kind:'off',leds:0,F:null,In}); t += 0.001; continue; }
    if (!powered){                                       // reset vector → main(): init_devices(); CONFIGURE_ALTERA();
      powered = true; F = freshFW(); i = 0; cfgDone = Infinity;
      const b = {i:-1,t0:t,t1:t+C.WAIT10,kind:'boot',leds:0x80,F:null,In}; passes.push(b);
      t += C.WAIT10; startCfg(t); continue;
    }
    // fault and skew events (transient fault is cleared by the next reconfiguration)
    const fe = D.events.filter(e=>e.k==='fault' && e.t<=t).pop();
    if (fe && fe.t !== lastFaultT){ lastFaultT = fe.t; faultOn = !!fe.v; }
    if (In.stuck) faultOn = true;
    const se = D.events.filter(e=>e.k==='skew' && e.t<=t).pop();
    if (se && se.t !== lastSkewT){ lastSkewT = se.t; skew = se.v; }
    const p = { i, t0:t, kind:'loop', reconf:false, In };
    let T = C.LOOP_T;
    /* --- CD --- */
    const cdRaw = In.sdi && In.cable <= 300 ? 1 : 0;
    F.CD = cdRaw;
    if (F.CD===0){ if (F.release1===0 && F.switch1===0) F.switch1=1; } else if (F.switch1===1) F.release1=1;   // TRANSLATE_INPUT
    if (F.release1===1){ if (F.sw1c < C.DEB) F.sw1c++; else { F.sw1c=0; F.release1=0; F.switch1=0; } }      // DEBOUNCE_INPUT
    if (F.CD && F.switch1===0){ F.leds |= 0x10; F.leds &= ~0x80; F.alt10=1; } else { F.leds |= 0x80; F.leds &= ~0x10; F.alt10=0; }
    /* --- switches, audio information --- */
    const DIP = In.dip & 0xFF;
    let AI = 0xFF;
    if (!F.AUDIO2){ AI&=~0x80; AI&=~0x08; } if (!F.AUDIO1){ AI&=~0x40; AI&=~0x04; }
    if (!F.AUDIO4){ AI&=~0x20; AI&=~0x02; } if (!F.AUDIO3){ AI&=~0x10; AI&=~0x01; }
    F.AI = AI;
    /* --- ALTERA_write --- */
    const gs = grpSel(DIP);
    let data1 = 0, swap = [ (DIP>>5)&1, (DIP>>2)&1 ];
    if (v==='C'){ if (!swap[0] && In.rsw[0]) swap[0]=1; if (!swap[1] && In.rsw[1]) swap[1]=1; }   // v203: PINF.0 CHSWAP1, PING.4 CHSWAP2
    if (v==='A'){ if (!swap[0] && In.rsw[0]) swap[0]=1; if (!swap[1] && In.rsw[1]) swap[1]=1; }   // v201: same pins, 2-byte write
    if (swap[0]) data1 |= 0x40; if (swap[1]) data1 |= 0x80;
    const group_data = (gs[0]<<1) | (gs[1]<<4) | data1;
    const reset_data = ((F.RV1 & 0x1F) << 5) | (F.RV & 0x1F);
    F.W = v==='A' ? [DIP|(swap[0]?0x20:0)|(swap[1]?0x04:0), AI] : [0, 0, (reset_data>>8)&0xFF, reset_data&0xFF, AI, group_data];
    // FPGA side of the write (INFERRED meaning of the reset bits: 0 = hold that FIFO / demux in reset)
    const hold = [ !(F.RV & 0x10), !(F.RV1 & 0x10) ];
    if (v==='A') hold[0] = hold[1] = false;
    if (skew>=0 && !((F.RV>>skew)&1)) skew = -1;          // that pair's FIFO was reset → realigned
    /* --- ALTERA_read: what the FPGA shifts back --- */
    const cfg = t >= cfgDone;
    const A = new Array(18).fill(0xFF);
    if (cfg){
      const base = 40 + (i*13)%24;                        // INFERRED FIFO fill count, low 7 bits
      for (let d=0; d<2; d++){
        const g = gs[d], live = In.groups[g] && F.CD && F.alt10 && !hold[d] && !(v==='A' && d===1);
        for (let c=0;c<4;c++){ const pair = d*2 + (c>>1); let n = base + ((c&1)? 1 : 0); if (skew===pair && (c&1)) n += 7;
          A[d*6+c] = (live?0x80:0) | (n & 0x7F); }
        A[d*6+4] = 0x00; A[d*6+5] = 0xA0;
      }
      A[12] = DIP; A[13]=A[14]=A[15]=A[16]=0; A[17]=0xA0;
      if (faultOn) A[5] = 0x5F;                           // injected: the echo is not 0xA0
    }
    F.A = A;
    /* --- detect + LEDs --- */
    const det = (a,b)=> (((a&0x80)||(b&0x80)) && F.CD) ? 1 : 0;
    F.AUDIO1 = det(A[0],A[1]); F.AUDIO2 = det(A[2],A[3]);
    if (v==='A'){ F.AUDIO1 ? F.leds|=0x20 : F.leds&=~0x20; F.AUDIO2 ? F.leds|=0x40 : F.leds&=~0x40; }
    else { (F.AUDIO1 && F.AUDIO2) ? F.leds|=0x20 : F.leds&=~0x20; }
    /* --- alignment --- */
    F.ERROR2 = ((A[5] & 0xF0) === 0xA0) ? 1 : 0;
    translateErr(F, F.ERROR2, 'switch2','release2','sw2c');
    if (F.RESET2===0 && F.switch2===0){                   // CONFIGURE_ALTERA()
      F.RESET2 = 1; F.e2c = 0; p.reconf = true; T += C.WAIT10; F.alt10 = 0;
      startCfg(t + STEP_FRAC[6]*C.LOOP_T + C.WAIT10); if (!In.stuck) faultOn = false;
    } else if (F.RESET2===1 && F.switch2===0){ if (F.e2c===C.ERR2_DEB) F.RESET2=0; else F.e2c++; }
    else if (F.RESET2===1 && F.switch2===1){ F.RESET2 = 0; }
    /* --- sample-count compares --- */
    const cnt = (aud, b)=> aud ? (b & 0x7F) : 0;
    const cmp = (c1,c2)=>{ let r = F.CD ? Math.abs(c1-c2) : 0; return r > C.CNT_MAX ? 0 : 1; };
    const chk3 = cmp(cnt(F.AUDIO1,A[0]), cnt(F.AUDIO1,A[1]));
    translateErr(F, chk3, 'switch3','release3','sw3c'); processCompare(F,'switch3','RESET3','ERROR3','e3c');
    const chk4 = cmp(cnt(F.AUDIO2,A[2]), cnt(F.AUDIO2,A[3]));
    translateErr(F, chk4, 'switch4','release4','sw4c'); processCompare(F,'switch4','RESET4','ERROR4','e4c');
    if (v!=='A'){
      F.AUDIO3 = det(A[6],A[7]); F.AUDIO4 = det(A[8],A[9]);
      const c5 = cmp(cnt(F.AUDIO3,A[6]), cnt(F.AUDIO3,A[7]));
      translateErr(F, c5, 'switch2_3','release2_3','sw23c'); processCompare(F,'switch2_3','RESET2_3','ERROR2_3','e23c','RESET3');
      const c7 = cmp(cnt(F.AUDIO4,A[8]), cnt(F.AUDIO4,A[9]));
      translateErr(F, c7, 'switch2_4','release2_4','sw24c'); processCompare(F,'switch2_4','RESET2_4','ERROR2_4','e24c');
      (F.AUDIO3 && F.AUDIO4) ? F.leds|=0x40 : F.leds&=~0x40;
      const g1 = gs[0]; F.ERROR5 = (g1 !== F.prevG1) ? 0 : 1; F.prevG1 = g1;
      F.RV = trv(F, F.ERROR3, F.ERROR4, F.ERROR2_3, F.ERROR2_4, F.ERROR5, 1, 'rstEn','rstCnt');
      const g2 = gs[1]; F.ERROR2_5 = (g2 !== F.prevG2) ? 0 : 1; F.prevG2 = g2;
      F.RV1 = trv(F, F.ERROR2_3, F.ERROR2_3, F.ERROR2_3, F.ERROR2_3, F.ERROR2_5, 1, 'rstEn1','rstCnt1');
    } else {
      F.AUDIO3 = F.AUDIO4 = 0;
      let d = 0x0F; if(!F.ERROR3) d&=~1; if(!F.ERROR4) d&=~2; F.RV = d|0x10; F.RV1 = 0x1F;   // v201: TRANSLATE_RESET_VECTOR(ERROR3, ERROR4, …) onto PORTC low nibble
    }
    p.t1 = t + T; p.leds = F.leds; p.cfg = cfg; p.fault = faultOn; p.skew = skew; p.hold = hold; p.gs = gs; p.swap = swap;
    p.F = JSON.parse(JSON.stringify(F));
    passes.push(p); t += T; i++;
  }
  SIM_CACHE = { passes, recfg };
  return SIM_CACHE;
}
function passAt(t){
  const ps = runSim().passes; let lo=0, hi=ps.length-1;
  while (lo<hi){ const m=(lo+hi+1)>>1; if (ps[m].t0<=t) lo=m; else hi=m-1; }
  return ps[lo];
}
function stepAt(t){
  const p = passAt(t); if (p.kind!=='loop') return {pass:p, step:-1};
  let f = (t - p.t0)/C.LOOP_T; if (p.reconf && f > STEP_FRAC[6]) { const extra = C.WAIT10/C.LOOP_T; if (f < STEP_FRAC[6]+extra) return {pass:p, step:5, waiting:true}; f -= extra; }
  let k=0; for (let j=0;j<STEPS.length;j++) if (f >= STEP_FRAC[j]) k=j; return {pass:p, step:k};
}
const lastPass = ()=>{ const ps = runSim().passes; return ps[ps.length-1]; };
const ledsAt = t => { const p = passAt(t); return { cd:!!(p.leds&0x10), a1:!!(p.leds&0x20), a2:!!(p.leds&0x40), er:!!(p.leds&0x80), on:p.kind!=='off' }; };

/* outputs: which group/pair lands on each AES output, and whether it is muted */
function aesRoute(p, k){                       // k = AES1..AES4 (0..3)
  const v = variant(); if (!p || p.kind!=='loop') return null;
  const d = k>>1; if (v==='A' && d===1) return null;
  const pairIn = (k&1) ^ (p.swap ? p.swap[d] : 0);   // swap.vhd: AES_OUT1 <= AES2 when swap='1'
  const g = p.gs[d];
  const bit = [0x40,0x80,0x10,0x20][k];
  const live = !!(p.F.AI & bit) && p.In.groups[g] && p.F.CD;
  return { g, pair:pairIn, live, chans:[pairIn*2, pairIn*2+1] };
}
function aesSample(k, side, t){
  const p = passAt(t); const r = aesRoute(p,k); if (!r || !r.live) return 0;
  const f = TONE[r.g][r.chans[side]]; const n = Math.floor(t*C.FS);
  return Math.pow(10,-20/20) * Math.sin(2*Math.PI*f*n/C.FS);
}
function rearMap(v){        // BNC 1..8 per variant (SD403A/B functionals; C INFERRED = A)
  if (v==='B') return ['SDI 1','SDI 2','SDI 3','SDI 4','AES 3','AES 1','AES 4','AES 2'];
  return ['(under TB102)','SDI 1','(under TB102)','SDI 2','—','AES 1','—','AES 2'];
}

/* =====================================================================
   5. ACTIONS — each logs the code path it follows
   ===================================================================== */
function act(name, fn){
  const trace=[]; const tr=s=>trace.push(s);
  try{ fn(tr); }catch(e){ tr('error: '+e.message); console.error(e); }
  D.log.unshift({t:SIM.t, name, trace}); if (D.log.length>60) D.log.length=60;
  SIM.refresh();
}
const VNAME = { A:'v201 (SD403A)', B:'v202 (SD403B)', C:'v203 (SD403C)' };
const A = {
  dip(n){ act(`DIP SW${n} → ${dipOn(now().dip,n)?'OFF':'ON'}`, tr=>{
    const In = now(); const dip = In.dip ^ (1<<(8-n)); pushEvent('dip', dip);
    tr(`SW${n} is on PB${8-n} (U11 pin ${18-n}, net SW${n}); 10K pull-up, ON closes to 0 V`);
    tr(`main(): dip_switch = READ_SWITCHES(PINB); DIP_SWITCH = INVERT_DATA(dip_switch) → 0x${hex2(dip)} (${bin8(dip)}b)`);
    const g = grpSel(dip);
    if (n<=2) tr(`ALTERA_write(): group_sel1 = ${g[0]*2} (BIT7→+4, BIT6→+2) → GROUP SEL 1 = group ${g[0]+1}`);
    if (n===4||n===5) tr(`ALTERA_write(): group_sel2 = ${g[1]*2} (BIT4→+4, BIT3→+2) → GROUP SEL 2 = group ${g[1]+1}${variant()==='A'?' — v201 has no second demux, so SW4/SW5 do nothing on an SD403A':''}`);
    if (n===3) tr(`DIP_SWITCH BIT5 → data1 |= BIT6: swap 1 ${dipOn(dip,3)?'enabled':'disabled'}; swap.vhd exchanges AES1 ↔ AES2`);
    if (n===6) tr(`DIP_SWITCH BIT2 → data1 |= BIT7: swap 2 ${dipOn(dip,6)?'enabled':'disabled'}; AES3 ↔ AES4`);
    if (n>=7) tr(`SW${n} is read but not used by v20x (SW8 has a "SW8_MASK" constant and a commented-out SW8_CONFIGURE)`);
    if (n<=2||n===4||n===5) tr('PROCESS_GROUP_COMPARE sees the change → ERROR5 = 0 → TRANSLATE_RESET_VECTOR clears bit 4 and holds it for 255 passes (≈0.2 s): that demux restarts');
    tr(`group_data = group_sel1 | group_sel2<<3 | data1 = 0x${hex2((g[0]<<1)|(g[1]<<4)|(dipOn(dip,3)?0x40:0)|(dipOn(dip,6)?0x80:0))} → byte 6 of the next 6-byte write`);
  }); },
  sdi(on){ act(on?'Connect the SDI input':'Disconnect the SDI input', tr=>{
    pushEvent('sdi', on);
    tr(`MF100 rear "IN" BNC → P1-A1 IN+ → L4 18nH → U1 CLC014 adaptive EQ → U2 CLC016 reclocker`);
    tr(on? 'CLC016 locks: CD (U2-28) high on PF1 → SDI_Carrier_Detect(PINF) = 1' : 'CLC016 loses lock: CD low → SDI_Carrier_Detect = 0');
    tr(on? 'TRANSLATE_INPUT: switch1 = 1 → release1 = 1; DEBOUNCE_INPUT counts 255 good passes (≈0.21 s) before switch1 = 0 → CD LED (PE4) and ALTERA10 (PA5) come on'
         : 'PROCESS_CARRIER_DETECT at once: ERROR LED (PE7) on, CD LED off, ALTERA10 = 0 (FPGA "switch controlled" off) — no debounce on loss');
    tr('Audio1_Detect … ANDs every audio lock with CD, so all AUDIO tallies follow CD');
  }); },
  cable(m){ act(`Cable length ${m} m`, tr=>{ pushEvent('cable', m);
    tr(`CLC014 equalises up to the manual's 250 m (750 ft) of 75 Ω coax; ${m>300?'beyond ≈300 m the reclocker cannot lock ('+'inferred'+') → CD drops':'still inside its range'}`); }); },
  group(g){ act(`Source: group ${g+1} ${now().groups[g]?'removed':'added'}`, tr=>{
    const gr = now().groups.slice(); gr[g] = gr[g]?0:1; pushEvent('groups', gr);
    tr(`Upstream embedder ${gr[g]?'starts':'stops'} sending audio data packets with DID ${GROUP_DID[g]}h (SMPTE 272M, ${inf})`);
    tr('group selector.vhd: fifo_writeN only fires for packets of the selected group (gsel1/gsel2 = g1…g4)');
    tr('ALTERA_read: bit 7 of ALTERA1–4 (SEL 1) / ALTERA7–10 (SEL 2) follows; PROCESS_AUDIO_INFORMATION mutes the matching outputs on the next pass');
  }); },
  rsw(k){ act(`TB102 remote swap ${k+1} ${now().rsw[k]?'opened':'closed'}`, tr=>{
    const r = now().rsw.slice(); r[k] = r[k]?0:1; pushEvent('rsw', r); const v = variant();
    tr(`TB102 "SWAP CONTROL" ${k?'−':'+'} → P1-${k?'C20':'C4'} → net CHSWAP${k+1} → ${k?'PG4 (U11-19)':'PF0 (U11-61)'}`);
    if (v==='B') tr('v202 (SD403B) never reads CHSWAP1/2: the SD403B has no TB102, so the closure does nothing');
    else tr(`${VNAME[v]}: ALTERA_write() — if the DIP swap ${k+1} switch is OFF, ((${k?'PING & 0x10':'PINF & 0x01'}) == 0) → data1 |= BIT${6+k}. The DIP switch keeps priority`);
  }); },
  fault(stuck){ act(stuck?'Inject: FPGA link stuck misaligned':'Inject: FPGA misaligns once', tr=>{
    if (stuck){ pushEvent('stuck', !now().stuck); } else pushEvent('fault', 1);
    tr('ALTERA6 comes back without the 0xA0 alignment pattern → ALIGNMENT_CHECK(ALTERA6) = 0 → ERROR2 = 0');
    tr('TRANSLATE_ERROR2 sets release2; DEBOUNCE_ERROR2 waits 255 passes (≈0.21 s) then switch2 = 0');
    tr('PROCESS_ALIGNMENT_CHECK: RESET2 == 0 && switch2 == 0 → CONFIGURE_ALTERA(): PA0 high (Q1 pulls N_CONFIG low), ALTERA10 low, wait_ms(10), PA0 low');
    tr(`The Cyclone reloads from its EPCS (≈${C.CFG_T*1000} ms, ${inf}); RESET2 = 1 and it gets another 255 passes to align before a second reload`);
    tr('No tally shows this: CD stays green while the FPGA reloads (see Findings)');
  }); },
  skew(k){ act(`Inject: AES${k+1} channel counts drift apart`, tr=>{
    pushEvent('skew', k);
    const n = ['COMPARE_AUDIO1_AUDIO2 → ERROR3','COMPARE_AUDIO3_AUDIO4 → ERROR4','COMPARE_AUDIO5_AUDIO6 → ERROR2_3','COMPARE_AUDIO7_AUDIO8 → ERROR2_4'][k];
    tr(`${n}: |count A − count B| > COUNT_DIFFERENCE_MAX (2) → after the 255-pass debounce the error is set`);
    tr(`TRANSLATE_RESET_VECTOR puts it in RESET_VECTOR bit ${k} → reset_data → bytes 3–4 of ALTERA_write → that FIFO pair is reset (${inf})`);
    if (k===2) tr('PROCESS_SAMPLE56_COMPARE starts with "if ((RESET3 == 0) …" — a copy slip for RESET2_3 (see Findings)');
    if (k>=2) tr('RESET_VECTOR1 = TRANSLATE_RESET_VECTOR1(ERROR2_3, ERROR2_3, ERROR2_3, ERROR2_3, …) — group 2 copies ERROR2_3 into all four bits');
  }); },
  psu(k){ act(`PS${k+1} mains ${now()['ps'+(k+1)]?'off':'on'}`, tr=>{
    const key='ps'+(k+1); const v=!now()[key]; pushEvent(key, v); const In=now();
    tr(`M8245A #${k+1}: 85–264 VAC in; +21 V @ 4 A, −21 V @ 3 A out, through redundancy diodes (m8245aspecs.wpd)`);
    tr(In.ps1||In.ps2 ? `Frame stays up on PS${In.ps1?1:2}: total load ≈ ${frameLoad().w.toFixed(0)} W of 147 W per supply` : 'Both supplies off: every card loses power. On return the ATmega128 restarts at main()');
  }); },
  ref(r){ act(`MF100REF: ${r}`, tr=>{ D.ref=r; tr(`MF100REF BNC → ${r==='none'?'nothing':r==='aes'?'AES reference bus (terminated in the frame)':'video reference bus (terminated on the card)'} (MF100.pdf)`);
    tr('The SD403 does not use the frame reference — the iss5 netlist has no reference net on P1. DA302, DA303, DA304A and DA305 do'); SIMKEY=''; }); },
  door(){ act(D.door?'Close the front panel':'Open the hinged front panel', tr=>{ D.door=!D.door; tr('MF100man.wpd: "hinged, quick release front panel … rapid access to controls and tallies located on the front edge of the amplifier cards"'); }); },
  focus(k){ act(`Select slot ${k+1}: ${D.slots[k]||'empty'}`, tr=>{ D.focus=k; SIMKEY=''; const id=D.slots[k]; const c=CARDS[id];
    tr(c? `${id}: ${c.fn}. Controller: ${c.ctl}. Termination: ${c.term}` : 'empty slot');
    if (isSD403(id)) tr(`Full model loaded: firmware ${VNAME[id.slice(-1)]}`); }); },
  setCard(k,id){ act(`Slot ${k+1} ← ${id||'empty'}`, tr=>{ D.slots[k]=id||null; SIMKEY=''; tr(id? CARDS[id].fn : 'slot emptied'); tr(`Frame load now ≈ ${frameLoad().w.toFixed(1)} W`); }); },
  slotIn(k){ act(`Slot ${k+1} input ${D.slotIn[k]?'removed':'connected'}`, tr=>{ D.slotIn[k]=!D.slotIn[k]; }); },
  mono(k){ act(`SD400A CH ${k+1}: ${D.mono[k]?'stereo':'mono'}`, tr=>{ D.mono[k]=!D.mono[k]; tr(`SD400A ${k?'H12–H13':'H10–H11'}: S = stereo (default), M = mono (SD403 manual). Mono sums A and B to both outputs (${inf})`); }); },
  reset(){ D.init=freshInit(); D.events=[]; D.slots=DEF_SLOTS.slice(); D.focus=0; D.door=false; D.ref='none'; D.mono=[false,false]; D.slotIn.fill(true); D.log=[]; SIMKEY=''; SIM.refresh(); },
};
function frameLoad(){
  let ip=0, im=0, unk=0;
  D.slots.forEach(id=>{ if(!id) return; const c=CARDS[id]; if (c.ma){ ip+=c.ma[0]; im+=c.ma[1]; } else { ip+=110; im+=80; unk++; } });
  return { ip, im, w: (ip*21+im*21)/1000, unk };
}

/* =====================================================================
   6. DRAWINGS — front (closed / open), rear, SD403 board
   ===================================================================== */
const PW=1900, PH=350;
const LEDC = { CD:'#5dff6a', AUDIO1:'#ffd23a', AUDIO2:'#ffd23a', ERROR:'#ff4a3a', SIGNAL:'#5dff6a', CONFIDENCE:'#ffd23a', EYE:'#ffd23a', EQ:'#ffd23a', REF:'#5dff6a', CAL:'#ffd23a', IN1:'#5dff6a', IN2:'#5dff6a' };
function genericTally(k, name){                  // other cards: tallies follow their input (INFERRED)
  const id = D.slots[k], In = now(); const pw = In.ps1||In.ps2; if (!pw) return false;
  const sig = D.slotIn[k];
  if (name==='ERROR') return !sig;
  if (name==='EQ'||name==='CONFIDENCE'||name==='EYE') return false;
  if (name==='CAL') return false;
  if (name==='REF') return D.ref!=='none';
  return sig;
}
function cardTallies(k, t){
  const id = D.slots[k]; if (!id) return [];
  if (isSD403(id) && k===D.focus){ const L = ledsAt(t); return [['CD',L.cd],['AUDIO1',L.a1],['AUDIO2',L.a2],['ERROR',L.er]]; }
  if (isSD403(id)){ const In=now(); const pw=In.ps1||In.ps2; const s=D.slotIn[k]&&pw; return [['CD',s],['AUDIO1',s],['AUDIO2',s],['ERROR',pw&&!s]]; }
  return CARDS[id].tal.map(n=>[n, genericTally(k,n)]);
}
function frontSVG(t){
  const In = inputsAt(t), pw = In.ps1||In.ps2;
  let s = `<svg viewBox="0 0 ${PW} ${PH}" role="img" aria-label="MF100 front panel" style="width:100%;border-radius:8px;display:block;cursor:pointer">
    <defs><filter id="sbGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="sbBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26292c"/><stop offset=".15" stop-color="#1a1c1e"/><stop offset="1" stop-color="#121314"/></linearGradient></defs>
    <rect width="${PW}" height="${PH}" rx="8" fill="var(--bg)"/>`;
  const ears = `<rect x="0" y="0" width="112" height="${PH}" fill="#151617"/><rect x="1788" y="0" width="112" height="${PH}" fill="#151617"/>
    ${[[55,36],[55,314],[1845,36],[1845,314]].map(([x,y])=>`<rect x="${x-17}" y="${y-10}" width="34" height="20" rx="10" fill="var(--bg)"/>`).join('')}`;
  if (!D.door){
    s += ears + `<g class="sbDoor"><rect x="112" y="0" width="1676" height="${PH}" fill="url(#sbBody)"/>
      <rect x="112" y="44" width="1676" height="6" fill="#33363a"/><rect x="112" y="252" width="1676" height="4" fill="#2c2f32"/>`;
    for (let k=0;k<13;k++){ const x = 173 + k*133; s += `<rect x="${x-5}" y="118" width="10" height="94" rx="5" fill="#050506"/>`;
      if (k<10 && pw){ const tl = cardTallies(k,t).filter(z=>z[1]); if (tl.length) s += `<rect x="${x-2}" y="${128+((k*7)%30)}" width="4" height="8" fill="${LEDC[tl[0][0]]||'#5dff6a'}" opacity=".8" filter="url(#sbGlow)"/>`; } }
    s += `<image href="${ASSET}serialbox-front-wbs.svg" x="230" y="262" width="184" height="54"/>
      <image href="${ASSET}serialbox-front-wordmark.svg" x="1394" y="262" width="306" height="31.5"/>
      <image href="${ASSET}serialbox-front-byline.svg" x="1555" y="300" width="145" height="13.3"/>
      <rect x="112" y="0" width="1676" height="${PH}" fill="transparent"><title>Click to open the hinged front panel</title></rect></g>`;
  } else {
    s += ears + `<rect x="112" y="0" width="1676" height="${PH}" fill="#0b0c0d"/><rect x="112" y="300" width="1676" height="50" fill="#1b1d1f"/>
      <text x="950" y="333" text-anchor="middle" font-size="18" fill="#8a8f94">front panel lowered — click here to close</text>`;
    for (let k=0;k<10;k++){
      const x = 262 + k*132, id = D.slots[k], on = D.focus===k;
      s += `<g class="sbSlot" data-k="${k}" style="cursor:pointer"><rect x="${x-60}" y="14" width="120" height="282" rx="4" fill="${on?'#1c2a22':'#101112'}" stroke="${on?'var(--accent)':'#222'}" stroke-width="${on?4:1}"/>`;
      if (id){
        s += `<rect x="${x-7}" y="22" width="14" height="270" fill="#1d5e34"/>`;
        cardTallies(k,t).forEach(([n,lit],j)=>{ const y=48+j*30; s += `<rect x="${x+9}" y="${y-8}" width="18" height="16" rx="3" fill="${lit?LEDC[n]||'#5dff6a':'#2b302b'}" ${lit?'filter="url(#sbGlow)"':''}/><text x="${x-12}" y="${y+5}" text-anchor="end" font-size="13" fill="#9aa">${n.slice(0,6)}</text>`; });
        s += `<rect x="${x-14}" y="178" width="28" height="100" rx="3" fill="#eef0ee"/><text x="${x}" y="228" text-anchor="middle" font-size="17" font-weight="700" fill="#222" transform="rotate(90 ${x} 228)">${id}</text>`;
      } else s += `<text x="${x}" y="160" text-anchor="middle" font-size="16" fill="#555">empty</text>`;
      s += `<text x="${x}" y="292" text-anchor="middle" font-size="13" fill="#777">${k+1}</text><title>Slot ${k+1}: ${id||'empty'} — click to select</title></g>`;
    }
    const L1 = In.ps1, L2 = In.ps2;
    s += `<rect x="1590" y="20" width="190" height="276" fill="#141516" stroke="#2a2d30"/>
      <circle cx="1625" cy="70" r="9" fill="${L1?'#5dff6a':'#253025'}" ${L1?'filter="url(#sbGlow)"':''}/><text x="1625" y="100" text-anchor="middle" font-size="15" fill="#ccc">PS 1</text>
      <circle cx="1745" cy="70" r="9" fill="${L2?'#5dff6a':'#253025'}" ${L2?'filter="url(#sbGlow)"':''}/><text x="1745" y="100" text-anchor="middle" font-size="15" fill="#ccc">PS 2</text>
      <rect x="1602" y="130" width="166" height="66" fill="#000" stroke="#ddd" stroke-width="2"/><text x="1685" y="150" text-anchor="middle" font-size="13" fill="#eee" font-weight="700">CAUTION</text>
      <text x="1685" y="167" text-anchor="middle" font-size="9.5" fill="#eee">DISCONNECT BOTH AC POWER</text><text x="1685" y="180" text-anchor="middle" font-size="9.5" fill="#eee">SOURCES BEFORE REPLACING</text><text x="1685" y="193" text-anchor="middle" font-size="9.5" fill="#eee">FUSES OR SERVICING</text>
      <rect x="112" y="300" width="1676" height="50" fill="transparent" class="sbDoor"><title>Close the front panel</title></rect>`;
  }
  return s + '</svg>';
}
function rearSVG(t){
  const In = inputsAt(t), v = variant();
  let s = `<svg viewBox="0 0 ${PW} ${PH}" role="img" aria-label="MF100 rear panel, drawn from MF100 Rear w REF.jpg" style="width:100%;border-radius:8px;display:block">
    <rect width="${PW}" height="${PH}" rx="8" fill="#141516"/>
    <rect x="60" y="10" width="400" height="330" fill="#0d0e0f" stroke="#2a2d30"/>`;
  // PSU / reference panel
  [[0,'PS 1',In.ps1],[1,'PS 2',In.ps2]].forEach(([k,lb,on])=>{ const y=40+k*150;
    s += `<g class="sbPsu" data-k="${k}" style="cursor:pointer"><text x="200" y="${y+8}" font-size="20" font-weight="700" fill="#ddd">${lb}</text>
      <rect x="80" y="${y}" width="105" height="80" rx="6" fill="#050505" stroke="#444"/><rect x="100" y="${y+18}" width="65" height="44" rx="4" fill="#1b1b1b"/>
      ${[118,132,146].map(x=>`<rect x="${x-3}" y="${y+28}" width="6" height="18" fill="#888"/>`).join('')}
      ${on?`<rect x="92" y="${y+10}" width="81" height="60" rx="5" fill="#222" stroke="#666"/><path d="M132 ${y+70} v40" stroke="#222" stroke-width="12"/>`:''}
      <rect x="80" y="${y+84}" width="105" height="34" rx="4" fill="#111" stroke="#333"/><title>${lb}: M8245A mains — click to ${on?'unplug':'plug in'}</title></g>`; });
  s += `<text x="268" y="44" font-size="15" fill="#ccc">AUX 1</text><text x="378" y="44" font-size="15" fill="#ccc">AUX 2</text>
    <rect x="262" y="54" width="44" height="64" fill="#1f8a45"/><rect x="372" y="54" width="44" height="64" fill="#1f8a45"/>
    <g class="sbRef" style="cursor:pointer"><circle cx="340" cy="160" r="32" fill="${D.ref!=='none'?'#c9b469':'#3a3f44'}" stroke="#7a5f12" stroke-width="4"/><circle cx="340" cy="160" r="11" fill="#555"/>
    <text x="340" y="214" text-anchor="middle" font-size="13" fill="#ccc">REFERENCE</text><text x="340" y="229" text-anchor="middle" font-size="13" fill="#ccc">INPUT ${D.ref!=='none'?'('+D.ref.toUpperCase()+')':''}</text><title>MF100REF — click to cycle none / AES / video</title></g>
    <rect x="215" y="250" width="225" height="70" fill="#000" stroke="#ddd" stroke-width="2"/><text x="327" y="270" text-anchor="middle" font-size="13" fill="#eee" font-weight="700">CAUTION</text><text x="327" y="287" text-anchor="middle" font-size="10" fill="#eee">DISCONNECT BOTH AC POWER</text><text x="327" y="300" text-anchor="middle" font-size="10" fill="#eee">SOURCES BEFORE REPLACING</text><text x="327" y="313" text-anchor="middle" font-size="10" fill="#eee">FUSES OR SERVICING</text>
    <rect x="465" y="10" width="1330" height="330" fill="#1d6b3a"/>`;
  // ten card positions: IN 10 at the left … IN 1 at the right (rear photo)
  for (let j=0;j<10;j++){
    const slot = 9-j, x = 470 + j*132, id = D.slots[slot], c = id && CARDS[id], on = D.focus===slot;
    const L = x+40, R = x+98;
    s += `<g class="sbRear" data-k="${slot}" style="cursor:pointer"><rect x="${x+2}" y="14" width="128" height="322" fill="${on?'#24804a':'#1d6b3a'}" stroke="${on?'var(--accent)':'#14502a'}" stroke-width="${on?5:1}"/>
      <rect x="${x+16}" y="22" width="36" height="22" fill="#111"/><rect x="${x+16}" y="306" width="36" height="22" fill="#111"/>
      <text x="${x+62}" y="38" font-size="15" fill="#fff">IN ${slot+1}</text>`;
    const bnc=(cx,cy,lbl,live)=>`<circle cx="${cx}" cy="${cy}" r="22" fill="#c9b469" stroke="#7a5f12" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="8" fill="#6e5a1a"/>${live?`<circle cx="${cx+19}" cy="${cy-19}" r="6" fill="var(--accent)"/>`:''}<text x="${cx-30}" y="${cy+5}" font-size="12" fill="#fff" text-anchor="end">${lbl}</text>`;
    const map = isSD403(id) ? rearMap(id.slice(-1)) : null;
    s += bnc(R, 66, '', isSD403(id)&&slot===D.focus ? In.sdi : D.slotIn[slot]);
    [1,3,5,7].forEach((n,r)=> s += bnc(L, 98+r*62, n, false));
    [2,4,6,8].forEach((n,r)=> s += bnc(R, 128+r*62, '', false) + `<text x="${R-28}" y="${133+r*62}" font-size="12" fill="#fff" text-anchor="end">${n}</text>`);
    if (c && (c.term==='TB102'||c.term==='TB101')){
      s += `<rect x="${x+8}" y="52" width="58" height="240" rx="4" fill="#1a7a3a" stroke="#0b3b1c" stroke-width="2"/>`;
      for (let b=0;b<5;b++) s += `<rect x="${x+20}" y="${64+b*44}" width="36" height="38" fill="#2d9a52" stroke="#0e4d25"/>${[0,1,2].map(q=>`<circle cx="${x+38}" cy="${72+b*44+q*11}" r="3.6" fill="#0b3b1c"/>`).join('')}`;
      s += `<text x="${x+37}" y="304" text-anchor="middle" font-size="12" fill="#fff">${c.term}</text>`;
    }
    s += `<text x="${x+66}" y="332" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">${id||'—'}</text>
      <title>Slot ${slot+1}: ${id||'empty'}${map? ' · BNC 1–8: '+map.join(', '):''} — click to select${isSD403(id)&&slot===D.focus?'; click the IN BNC to plug/unplug SDI':''}</title></g>
      <circle class="sbIn" data-k="${slot}" cx="${R}" cy="66" r="24" fill="transparent" style="cursor:pointer"/>`;
  }
  s += `<text x="1790" y="333" text-anchor="end" font-size="11" fill="#cfe">MF103-ISS.1</text></svg>`;
  return s;
}
/* SD403 ISSUE.5 board: real assembly drawing (white ink) on a green board, live LEDs and DIP switch on top */
const BRD = { W:2100, H:525,
  leds:[['CD',30,201],['AUDIO1',30,222],['AUDIO2',30,243],['ERROR',30,264]],
  dip:{x:252,y:92,w:136,h:40},
  chips:{ mcu:[750,128,150,134,'U11 ATmega128L — v20x firmware'], xtal:[780,277,98,23,'X1 4.9152 MHz'], fpga:[1185,112,210,165,'U3 Cyclone EP1C6T144'], epcs:[1020,60,105,33,'U7 configuration flash (EPCS1 in netlist, M25P40 on the drawing)'],
    cs:[1035,225,75,97,'U9 / U12 CS8406 AES transmitters'], pll:[1320,292,105,53,'U4 PLL1705 audio clock → AUDIO_CLOCK (FPGA 62)'], dec:[1380,90,135,120,'U5 CLC011 SDI decoder → 10-bit data + PCLK'],
    rck:[1545,67,150,143,'U2 CLC016 reclocker (CD on pin 28/19)'], eq:[1800,82,120,83,'U1 CLC014 adaptive cable EQ'], drv:[1770,225,52,75,'U6 GS9007 cable driver → OUT1–4'],
    amp:[1500,277,90,210,'EL5263 (EL2280C in netlist) output drivers'], psu:[322,420,98,75,'REG1 LM2596 switcher from +21 V'], rs485:[802,352,105,45,'U8 / U10 RS-485 (ADM3485 on drawing, LTC1480 in netlist) — unused by v20x'],
    conn:[1995,82,105,443,'P1 96-pin connector to the MF100 backplane'] } };
function boardSVG(t, hot){
  const L = ledsAt(t), lit = {CD:L.cd, AUDIO1:L.a1, AUDIO2:L.a2, ERROR:L.er};
  const In = inputsAt(t), st = stepAt(t);
  const active = st.step===2||st.step===3 ? 'fpga' : st.step===0 ? 'rck' : 'mcu';
  let s = `<svg viewBox="0 0 ${BRD.W} ${BRD.H}" role="img" aria-label="SD403 issue 5 board, from SD403A-assy" style="width:100%;border-radius:8px;display:block">
    <defs><filter id="sbGlow2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="${BRD.W}" height="${BRD.H}" rx="10" fill="#17552f"/>`;
  for (const k in BRD.chips){ const [x,y,w,h,tt] = BRD.chips[k]; const on = (hot===k) || k===active;
    s += `<rect class="sbChip" data-c="${k}" x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${on?'rgba(255,220,90,.28)':'rgba(0,0,0,.18)'}" stroke="${on?'#ffd75a':'none'}" stroke-width="3" style="cursor:pointer"><title>${tt}</title></rect>`; }
  s += `<image href="${ASSET}serialbox-sd403-assy-silk.png" width="${BRD.W}" height="${BRD.H}" style="pointer-events:none"/>`;
  BRD.leds.forEach(([n,x,y])=>{ s += `<rect x="${x-18}" y="${y-8}" width="36" height="16" rx="3" fill="${lit[n]?LEDC[n]:'#2b302b'}" ${lit[n]?'filter="url(#sbGlow2)"':''}/>`; });
  const dp = BRD.dip, w = dp.w/8;
  s += `<rect x="${dp.x-4}" y="${dp.y-4}" width="${dp.w+8}" height="${dp.h+8}" fill="#b0262a" rx="3"/>`;
  for (let n=1;n<=8;n++){ const on = dipOn(In.dip,n), x = dp.x + (n-1)*w;
    s += `<g class="sbDip" data-n="${n}" style="cursor:pointer"><rect x="${x+2}" y="${dp.y}" width="${w-4}" height="${dp.h}" fill="#f2f2f2"/><rect x="${x+4}" y="${on?dp.y+2:dp.y+dp.h/2}" width="${w-8}" height="${dp.h/2-2}" fill="#333"/>
      <text x="${x+w/2}" y="${dp.y+dp.h+22}" text-anchor="middle" font-size="15" fill="#fff">${n}</text><title>SW${n} (${on?'ON':'OFF'}) — click to toggle</title></g>`; }
  s += `<text x="${dp.x-10}" y="${dp.y+14}" font-size="13" fill="#fff" text-anchor="end">ON</text>`;
  return s + `</svg>`;
}
function bindPanels(root){
  root.querySelectorAll('.sbDoor').forEach(g=> g.addEventListener('click', e=>{ e.stopPropagation(); A.door(); }));
  root.querySelectorAll('.sbSlot').forEach(g=> g.addEventListener('click', e=>{ e.stopPropagation(); A.focus(+g.dataset.k); }));
  root.querySelectorAll('.sbRear').forEach(g=> g.addEventListener('click', ()=> A.focus(+g.dataset.k)));
  root.querySelectorAll('.sbIn').forEach(g=> g.addEventListener('click', e=>{ e.stopPropagation(); const k=+g.dataset.k; if (k===D.focus && isSD403(D.slots[k])) A.sdi(!now().sdi); else A.slotIn(k); }));
  root.querySelectorAll('.sbPsu').forEach(g=> g.addEventListener('click', ()=> A.psu(+g.dataset.k)));
  root.querySelectorAll('.sbRef').forEach(g=> g.addEventListener('click', ()=> A.ref(D.ref==='none'?'aes':D.ref==='aes'?'video':'none')));
  root.querySelectorAll('.sbDip').forEach(g=> g.addEventListener('click', ()=> A.dip(+g.dataset.n)));
}
document.addEventListener('keydown', e=>{
  if (!window.__serialboxActive || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k = e.key.toLowerCase();
  if (/^[1-8]$/.test(k)){ A.dip(+k); e.preventDefault(); }
  else if (k==='s'){ A.sdi(!now().sdi); e.preventDefault(); }
  else if (k==='f'){ A.fault(false); e.preventDefault(); }
  else if (k==='d'){ A.door(); e.preventDefault(); }
});

/* =====================================================================
   7. CONTROLS + INSPECTOR
   ===================================================================== */
function controlsHTML(){
  const In = now(), v = variant(), g = grpSel(In.dip);
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
    <span class="muted">SDI source</span><button data-a="sdi" class="${In.sdi?'on':''}">${In.sdi?'connected':'unplugged'}</button>
    <label>cable <select data-s="cable">${[50,100,200,250,300,350].map(m=>`<option ${In.cable===m?'selected':''}>${m}</option>`).join('')}</select> m</label>
    <span class="muted" style="margin-left:6px">embedded groups</span>${[0,1,2,3].map(k=>`<button data-a="grp" data-v="${k}" class="${In.groups[k]?'on':''}">G${k+1}</button>`).join('')}
    </div><div class="small" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
    <span class="muted">DIP SW1–8</span>${[1,2,3,4,5,6,7,8].map(n=>`<button data-a="dip" data-v="${n}" class="${dipOn(In.dip,n)?'on':''}" title="SW${n}">${n}</button>`).join('')}
    <span class="mono" style="margin-left:6px">SEL1 = G${g[0]+1}${v!=='A'?` · SEL2 = G${g[1]+1}`:''}</span>
    ${v!=='B'?`<span class="muted" style="margin-left:6px">TB102 swap</span><button data-a="rsw" data-v="0" class="${In.rsw[0]?'on':''}">+ SWAP1</button><button data-a="rsw" data-v="1" class="${In.rsw[1]?'on':''}">− SWAP2</button>`:''}
    ${v==='A'?`<span class="muted" style="margin-left:6px">SD400A</span><button data-a="mono" data-v="0" class="${D.mono[0]?'on':''}">CH1 ${D.mono[0]?'M':'S'}</button><button data-a="mono" data-v="1" class="${D.mono[1]?'on':''}">CH2 ${D.mono[1]?'M':'S'}</button>`:''}
    </div><div class="small" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
    <span class="muted">Faults here</span><button data-a="flt">FPGA misaligns once</button><button data-a="stuck" class="${In.stuck?'on':''}">FPGA stuck</button>
    ${[0,1,2,3].filter(k=>v!=='A'||k<2).map(k=>`<button data-a="skew" data-v="${k}">AES${k+1} count drift</button>`).join('')}
    <button data-a="rst">reset all</button><span class="muted">Keys: 1–8 DIP · S SDI · F fault · D door</span></div>`;
}
function bindControls(root){
  root.querySelectorAll('[data-a]').forEach(b=>{ const a=b.dataset.a, v=b.dataset.v;
    b.onclick = ()=>({ sdi:()=>A.sdi(!now().sdi), grp:()=>A.group(+v), dip:()=>A.dip(+v), rsw:()=>A.rsw(+v), mono:()=>A.mono(+v), flt:()=>A.fault(false), stuck:()=>A.fault(true), skew:()=>A.skew(+v), rst:()=>A.reset() }[a]||(()=>{}))(); });
  root.querySelectorAll('[data-s="cable"]').forEach(s=> s.onchange = e=> A.cable(+e.target.value));
}
function traceHTML(){ const e=D.log[0]; return e? `<div><b>${e.name}</b> <span class="muted">at ${SIM.fmtT(e.t)}</span></div>`+e.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click the panels or use the controls. Each step the firmware takes is listed here with its real function and variable names.</div>'; }
function inspectorHTML(t){
  const p = passAt(t), st = stepAt(t), F = p.F, v = variant();
  if (!F) return `<p class="mono">${p.kind==='off'?'No power: both M8245A supplies are off.':'Reset → main(): init_devices(), CONFIGURE_ALTERA()'}</p>`;
  const outs = [0,1,2,3].filter(k=>v!=='A'||k<2).map(k=>{ const r=aesRoute(p,k); return `AES${k+1}: ${r? (r.live? `G${r.g+1} ch ${r.chans[0]+1}/${r.chans[1]+1}` : '<span style="color:var(--bad)">muted</span>') : '—'}`; }).join(' · ');
  return `<table class="kv">
    <tr><th>Pass / step</th><td class="mono">#${p.i} · ${st.step>=0?STEPS[st.step][0].split(' · ')[0]:''}${st.waiting?' (wait_ms(10))':''}${p.reconf?' <b style="color:var(--warn)">CONFIGURE_ALTERA</b>':''}</td></tr>
    <tr><th>FPGA</th><td class="mono">${p.cfg?'configured':'<span style="color:var(--warn)">loading from EPCS</span>'}${p.fault?' · <span style="color:var(--bad)">misaligned</span>':''} · ALTERA10 = ${F.alt10}</td></tr>
    <tr><th>CD debounce</th><td class="mono">CD=${F.CD} switch1=${F.switch1} release1=${F.release1} switch1_counter=${F.sw1c}/255</td></tr>
    <tr><th>Alignment</th><td class="mono">ALTERA6=0x${hex2(F.A[5])} ERROR2=${F.ERROR2} switch2=${F.switch2} RESET2=${F.RESET2} (${F.e2c})</td></tr>
    <tr><th>AUDIO1–4</th><td class="mono">${F.AUDIO1} ${F.AUDIO2} ${F.AUDIO3} ${F.AUDIO4} · AUDIO_INFORMATION=${bin8(F.AI)}b</td></tr>
    <tr><th>Errors</th><td class="mono">E3=${F.ERROR3} E4=${F.ERROR4} E2_3=${F.ERROR2_3} E2_4=${F.ERROR2_4} E5=${F.ERROR5} E2_5=${F.ERROR2_5}</td></tr>
    <tr><th>RESET_VECTOR / 1</th><td class="mono">${(F.RV&0x1F).toString(2).padStart(5,'0')}b / ${(F.RV1&0x1F).toString(2).padStart(5,'0')}b${F.rstEn?` · hold ${F.rstCnt}`:''}${F.rstEn1?` · hold1 ${F.rstCnt1}`:''}</td></tr>
    <tr><th>Write → FPGA</th><td class="mono">${F.W.map(hex2).join(' ')}</td></tr>
    <tr><th>Read ← FPGA</th><td class="mono small">${F.A.map((b,i)=>`<span class="${i===5||i===11||i===17?'hl':''}" title="ALTERA${i+1}">${hex2(b)}</span>`).join(' ')}</td></tr>
    <tr><th>Outputs</th><td class="mono small">${outs}</td></tr>
    <tr><th>PORTE LEDs</th><td class="mono">${bin8(F.leds)}b (PE7 ERROR … PE4 CD)</td></tr></table>`;
}
function otherCardHTML(k){
  const id = D.slots[k]; if (!id) return '<p class="muted">Empty slot. Choose a card for it below.</p>';
  const c = CARDS[id];
  return `<table class="kv"><tr><th>Card</th><td><b>${id}</b> — ${c.fn}</td></tr><tr><th>Family</th><td>${c.fam}</td></tr><tr><th>Controller</th><td class="mono">${c.ctl}</td></tr>
    <tr><th>Code in folder</th><td class="mono small">${c.code||'—'}</td></tr><tr><th>Termination</th><td>${c.term}</td></tr>
    <tr><th>Tallies</th><td>${c.tal.length? cardTallies(k,SIM.t).map(([n,l])=>`<span class="chip" style="${l?'background:color-mix(in srgb,var(--accent) 25%,transparent)':''}">${n} ${l?'●':'○'}</span>`).join(''):'none documented'}</td></tr>
    <tr><th>Frame reference</th><td>${c.ref? (D.ref==='none'?'can use MF100REF — none connected':'locked to the frame '+D.ref.toUpperCase()+' bus'):'not used'}</td></tr>
    <tr><th>Source</th><td class="small mono">${c.src}</td></tr></table>
    <p class="small muted">This card is shown at the depth of its manual: tallies follow its input (${inf}). The full firmware model is the SD403 — select an SD403A, B or C slot.</p>
    <button data-a2="in">${D.slotIn[k]?'Remove':'Connect'} this card's input</button>`;
}
function slotPickerHTML(){
  const k = D.focus;
  return `<label class="small">Slot ${k+1} card <select id="sbCardSel"><option value="">— empty —</option>${['SDI','AES','VIDEO','AUDIO'].map(f=>`<optgroup label="${f}">${CARD_IDS.filter(i=>CARDS[i].fam===f).map(i=>`<option value="${i}" ${D.slots[k]===i?'selected':''}>${i} · ${CARDS[i].fn.slice(0,48)}</option>`).join('')}</optgroup>`).join('')}</select></label>
    <label class="small" style="margin-left:8px">Focus <select id="sbFocus">${D.slots.map((id,i)=>`<option value="${i}" ${i===k?'selected':''}>slot ${i+1}: ${id||'empty'}</option>`).join('')}</select></label>`;
}
function bindPicker(root){
  const s = root.querySelector('#sbCardSel'); if (s) s.onchange = e=> A.setCard(D.focus, e.target.value);
  const f = root.querySelector('#sbFocus'); if (f) f.onchange = e=> A.focus(+e.target.value);
  root.querySelectorAll('[data-a2="in"]').forEach(b=> b.onclick = ()=> A.slotIn(D.focus));
}

/* =====================================================================
   8. TIMELINE LANES
   ===================================================================== */
function lanes(){
  const css = SIM.css, v = variant(); const ls = [];
  const sim = runSim();
  const band = (c,X,a,b,y,h,col,al)=>{ c.fillStyle=col; c.globalAlpha=al==null?.7:al; c.fillRect(X(a),y+3,Math.max(1,X(b)-X(a)),h-6); c.globalAlpha=1; };
  const txt = (c,x,y,s,col)=>{ c.fillStyle=col||css('--ink'); c.font='11px '+css('--sans'); c.fillText(s,x,y); };
  ls.push({label:'Mains 60 Hz → M8245A ×2', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/120,0,1/480,css('--ink2'),'mains half-cycles'); }});
  ls.push({label:'SDI in: fields / lines (NTSC 270 Mb/s)', h:30, draw(c,X,t0,t1,y,h){
    const In0 = inputsAt(t0);
    if (!In0.sdi && !D.events.some(e=>e.k==='sdi')){ txt(c,X(t0)+6,y+h/2+4,'no SDI connected',css('--ink2')); return; }
    const span=t1-t0; if (span < 40*C.LINE) SIM.pulses(c,X,t0,t1,y+h*.5,h*.5,C.LINE,0,C.LINE*0.13,css('--ink2'),'lines (HANC/EAV/SAV)');
    SIM.pulses(c,X,t0,t1,y,h*(span<40*C.LINE?.5:1),C.FIELD,0,20*C.LINE,css('--accent2'),'fields');
    for (const p of sim.passes){ if (p.t1<t0||p.t0>t1) continue; if (!p.In.sdi){ band(c,X,p.t0,p.t1,y,h,css('--bad'),.25); } }
  }});
  ls.push({label:'HANC audio packets (selected groups)', h:24, draw(c,X,t0,t1,y,h){
    const In = inputsAt((t0+t1)/2), g = grpSel(In.dip); const span=t1-t0;
    [0,1].forEach(d=>{ if (v==='A'&&d) return; const gg=g[d]; if (!In.groups[gg]||!In.sdi) return;
      SIM.pulses(c,X,t0,t1,y+(d?h/2:0),h/2,C.LINE,C.LINE*(0.02+d*0.03),C.LINE*0.03,d?css('--warn'):css('--accent'),`DID ${GROUP_DID[gg]}h packets (G${gg+1})`); });
    if (span < 3*C.LINE) txt(c,X(t0)+6,y+h-2,'≈3 samples per channel per line (48 000 / 15 734)',css('--ink2'));
  }});
  ls.push({label:'CLC016 CD (raw) → PF1', h:20, draw(c,X,t0,t1,y,h){ for (const p of sim.passes){ if (p.t1<t0||p.t0>t1||!p.F) continue; if (p.F.CD) band(c,X,p.t0,p.t1,y,h,css('--accent'),.55); } }});
  ls.push({label:`ATmega128 main loop (${VNAME[v]})`, h:34, draw(c,X,t0,t1,y,h){
    const pxPass = X(t0+C.LOOP_T)-X(t0); let n=0;
    for (const p of sim.passes){ if (p.t1<t0||p.t0>t1) continue; n++;
      if (p.kind==='off'){ band(c,X,p.t0,p.t1,y,h,css('--ink2'),.2); continue; }
      if (p.kind==='boot'){ band(c,X,p.t0,p.t1,y,h,css('--warn'),.6); continue; }
      if (pxPass > 70){ let tt=p.t0; STEPS.forEach((s,j)=>{ let d=s[1]*C.LOOP_T; if (j===5&&p.reconf) d+=C.WAIT10;
          c.fillStyle = j===3? css('--accent2') : j===2? css('--accent2') : (j===5&&p.reconf)? css('--warn') : css('--accent'); c.globalAlpha=j%2?.55:.85;
          c.fillRect(X(tt),y+3,Math.max(1,X(tt+d)-X(tt)-1),h-6); c.globalAlpha=1;
          if (X(tt+d)-X(tt)>80) txt(c,X(tt)+3,y+h/2+4,s[0].split(/[ ·(]/)[0].slice(0,24),'#fff'); tt+=d; }); }
      else band(c,X,p.t0,p.t1,y,h,p.reconf?css('--warn'):(p.i%2?css('--accent'):css('--accent2')),.75);
    }
    if (pxPass<3) txt(c,X(t0)+6,y+h/2+4,`${n} passes in view (≈${(C.LOOP_T*1e3).toFixed(3)} ms each, inferred); orange = CONFIGURE_ALTERA`);
  }});
  ls.push({label:'MCU ↔ FPGA serial (PC5 clock)', h:22, draw(c,X,t0,t1,y,h){
    for (const p of sim.passes){ if (p.kind!=='loop'||p.t1<t0||p.t0>t1) continue;
      const a=p.t0+STEP_FRAC[2]*C.LOOP_T, b=p.t0+STEP_FRAC[4]*C.LOOP_T; band(c,X,a,a+STEPS[2][1]*C.LOOP_T,y,h,css('--accent'),.6); band(c,X,a+STEPS[2][1]*C.LOOP_T,b,y,h,css('--accent2'),.6); }
    if (t1-t0 < 0.002) txt(c,X(t0)+6,y+h-3,'green = 48 bits out on PC0 · blue = 144 bits in on PC1, PC3, PC2',css('--ink2'));
  }});
  ls.push({label:'FPGA: N_CONFIG / loading', h:22, draw(c,X,t0,t1,y,h){
    for (const p of sim.passes){ if (p.t1<t0||p.t0>t1) continue; if (p.kind==='loop' && !p.cfg) band(c,X,p.t0,p.t1,y,h,css('--warn'),.45); if (p.reconf) band(c,X,p.t0,p.t1,y,h,css('--bad'),.9); if (p.fault) band(c,X,p.t0,p.t1,y,h,css('--bad'),.2); }
  }});
  ls.push({label:'RESET_VECTOR bit 4 hold (group change)', h:20, draw(c,X,t0,t1,y,h){ for (const p of sim.passes){ if (!p.F||p.t1<t0||p.t0>t1) continue; if (!(p.F.RV&0x10)) band(c,X,p.t0,p.t1,y,h/2+2,css('--warn'),.7); if (!(p.F.RV1&0x10)) band(c,X,p.t0,p.t1,y+h/2-2,h/2+2,css('--warn'),.4); } }});
  ls.push({label:'Card-edge tallies: CD · A1 · A2 · ERR', h:40, draw(c,X,t0,t1,y,h){
    const rows=[[0x10,'#3fbf5f'],[0x20,'#e8b23a'],[0x40,'#e8b23a'],[0x80,'#e3453a']];
    for (const p of sim.passes){ if (p.t1<t0||p.t0>t1) continue; rows.forEach(([m,col],r)=>{ if (p.leds&m){ c.fillStyle=col; c.fillRect(X(p.t0),y+3+r*9,Math.max(1,X(p.t1)-X(p.t0)+.5),7); } }); }
  }});
  [0,1,2,3].filter(k=>v!=='A'||k<2).forEach(k=>{
    ls.push({label:`AES${k+1} out → ${v==='B'?'BNC '+[6,8,5,7][k]:k<2?'BNC '+[6,8][k]+' + TB102':'TB102 only'}`, h:30, draw(c,X,t0,t1,y,h){
      const span=t1-t0, pw=X(t1)-X(t0);
      if (span*1000 > pw/3){ for (const p of sim.passes){ if (p.t1<t0||p.t0>t1) continue; const r=aesRoute(p,k); if (r&&r.live) band(c,X,p.t0,p.t1,y,h,css('--accent'),.3); else band(c,X,p.t0,p.t1,y,h,css('--bad'),.08); }
        if (span<0.02) SIM.pulses(c,X,t0,t1,y,h,192/C.FS,0,1/C.FS,css('--warn'),'AES blocks'); return; }
      [0,1].forEach(sd=>{ c.strokeStyle=sd?css('--bad'):css('--accent'); c.beginPath(); const N=Math.min(1200,Math.max(200,pw)); for(let i=0;i<=N;i++){ const tt=t0+span*i/N; const yy=y+h/2-aesSample(k,sd,tt)*(h/2-3)*8; i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy);} c.stroke(); });
    }});
  });
  return ls;
}

/* =====================================================================
   9. VIEWS
   ===================================================================== */
function viewSim(m){
  window.__serialboxActive = true;
  m.innerHTML = `
  ${card('MF100 front — what the operator sees (click the panel to open it; click a card edge to select it)', `<div id="fp"></div><div class="small muted" style="margin-top:3px">Front legends: CorelDRAW vector from ${SIM.src('#SERIALBOX #SERIES/SERIALBOXX - #mf100_4/SILK/frontSScurve.cdr','frontSScurve.cdr')} (6 Feb 2003), green ink as in MF100 Front.jpg; positions and size from the photo, door, slots and ears drawn.</div>`)}
  <div class="grid2">
    <div>${card('Card in focus', `<div id="pick"></div><div id="focusBody" style="margin-top:8px"></div>`)}
      ${card('MF100 rear — click a slot to select it, the IN BNC to plug it, PS1/PS2 inlets for mains, REFERENCE to cycle', `<div id="rp"></div><p class="small muted">Drawn to the manual's 19 × 3.5 in from <span class="mono">MF100 Rear w REF.jpg</span>: IN 10 … IN 1 left to right, 1 + 8 BNC per card, Berg headers top and bottom for TB101/TB102/TB103. Termination outlines from <span class="mono">MF100TERM.cdr</span>.</p>`)}</div>
    <div>${card('What the firmware did (last action)', `<div id="trace" class="log"></div>`)}${card('State at the playhead', `<div id="insp"></div>`)}${card('Frame', `<div id="frm"></div>`)}</div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek)', `<canvas id="tl"></canvas><p class="small muted">The firmware is run pass by pass with the real debounce constants. The pass length (≈${(C.LOOP_T*1e3).toFixed(2)} ms) is ${inf}: about 4 000 cycles of a 4.9152 MHz crystal, most of it bit-banging 6 bytes out and 18 bytes in. Changes you make apply from the playhead onward; scrub back to see the "before".</p>`)}
  <div class="grid2">${card('Scope: AES1 at the playhead (one AES3 frame, biphase-mark)', `<canvas id="scope"></canvas><div id="bits" class="small mono"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  const draw = ()=>{
    const t = SIM.t, id = D.slots[D.focus];
    const fp = m.querySelector('#fp'); fp.innerHTML = frontSVG(t); bindPanels(fp);
    const rp = m.querySelector('#rp'); rp.innerHTML = rearSVG(t); bindPanels(rp);
    const pk = m.querySelector('#pick'); pk.innerHTML = slotPickerHTML(); bindPicker(pk);
    const fb = m.querySelector('#focusBody');
    if (isSD403(id)){ fb.innerHTML = `<div class="small muted" style="margin-bottom:4px"><b>${id}</b> issue 5 board (real assembly drawing <span class="mono">SD403A-assy</span>), front edge at the left. LEDs and SW1 (DIP, ON = up) are live; the highlighted chip is the one busy at the playhead.</div><div id="brd"></div>${controlsHTML()}`;
      const b = fb.querySelector('#brd'); b.innerHTML = boardSVG(t); bindPanels(b); bindControls(fb); }
    else { fb.innerHTML = otherCardHTML(D.focus); bindPicker(fb); }
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#insp').innerHTML = isSD403(id) ? inspectorHTML(t) : '<p class="muted small">Select an SD403 slot for the firmware state.</p>';
    const L = frameLoad(), In = now();
    m.querySelector('#frm').innerHTML = `<table class="kv"><tr><th>Supplies</th><td>PS1 ${In.ps1?'on':'<b style="color:var(--bad)">off</b>'} · PS2 ${In.ps2?'on':'<b style="color:var(--bad)">off</b>'} — M8245A +21 V @ 4 A, −21 V @ 3 A each</td></tr>
      <tr><th>Card load</th><td class="mono">+21 V ${L.ip} mA · −21 V ${L.im} mA ≈ ${L.w.toFixed(1)} W (${L.unk} card${L.unk===1?'':'s'} at SD403 figures, ${inf})</td></tr>
      <tr><th>Headroom</th><td class="mono">${(100*L.ip/4000).toFixed(0)} % of one supply's +21 V rating — either supply alone carries the frame</td></tr>
      <tr><th>Reference bus</th><td>${D.ref==='none'?'no MF100REF signal':D.ref.toUpperCase()+' on the backplane'}</td></tr>
      <tr><th>Frame</th><td>2RU · 10 cards · 130 VA max · 19 × 3.5 × 13.25 in · 7.65 kg (MF100man.wpd)</td></tr></table>`;
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220});
    drawScope(m.querySelector('#scope'), m.querySelector('#bits'), t);
  };
  SIM.on('time', draw);
}
function biphase(pre, bits, start){
  const P = {X:[1,1,1,0,0,0,1,0], Y:[1,1,1,0,0,1,0,0], Z:[1,1,1,0,1,0,0,0]}[pre];
  const lv = P.map(b=> start? 1-b : b); let cur = lv[lv.length-1];
  for (let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if (bits[i]) cur=1-cur; lv.push(cur); } return lv;
}
function aesFrame(t, k){
  const n = Math.floor(t*C.FS), fr = n%192; const sub=[];
  for (const sd of [0,1]){ const v = aesSample(k, sd, n/C.FS); let s = Math.round(v*8388607); if (s<0) s+=1<<24;
    const bits = new Array(32).fill(0); for (let b=0;b<24;b++) bits[4+b]=(s>>b)&1; bits[28]=0; bits[29]=0; bits[30]= fr<8 ? (0x85>>fr)&1 : 0;
    let par=0; for (let b=4;b<31;b++) par^=bits[b]; bits[31]=par; sub.push({pre: sd?'Y':(fr===0?'Z':'X'), bits, v, raw:s}); }
  return {n, fr, sub};
}
function drawScope(cv, el, t){
  const {c,w} = SIM.canvas(cv, 140); const Fm = aesFrame(t,0);
  const a = biphase(Fm.sub[0].pre, Fm.sub[0].bits, 0), b = biphase('Y', Fm.sub[1].bits, a[a.length-1]); const lv = a.concat(b); const cw=(w-20)/lv.length;
  [[0,8,'--warn','pre'],[8,16,'--ink2','aux'],[16,56,'--accent','audio'],[56,64,'--accent2','VUCP']].forEach(([x0,x1,col,lb])=>[0,64].forEach(off=>{ c.fillStyle=SIM.css(col); c.globalAlpha=.12; c.fillRect(10+(off+x0)*cw,18,(x1-x0)*cw,66); c.globalAlpha=1; c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; if((x1-x0)*cw>26) c.fillText(lb,12+(off+x0)*cw,98); }));
  c.strokeStyle=SIM.css('--ink'); c.lineWidth=1.5; c.beginPath(); lv.forEach((v,i)=>{ const x=10+i*cw, y=v?28:74; i?c.lineTo(x,y):c.moveTo(x,y); c.lineTo(x+cw,y); }); c.stroke();
  c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(`Subframe A (${Fm.sub[0].pre})`,12,13); c.fillText('Subframe B (Y)',12+64*cw,13);
  c.fillText(`frame ${Fm.n.toLocaleString()} · ${Fm.fr}/191 of block · cell ${SIM.fmtDur(1/C.FS/128)}`,10,124);
  const p = passAt(t), r = aesRoute(p,0);
  el.innerHTML = Fm.sub.map((s,i)=>`${i?'B':'A'} = ${s.v.toFixed(5)} → 0x${s.raw.toString(16).padStart(6,'0').toUpperCase()}`).join(' · ') +
    `<br>${r? (r.live? `AES1 carries group ${r.g+1}, channels ${r.chans[0]+1}/${r.chans[1]+1} (${TONE[r.g][r.chans[0]]} / ${TONE[r.g][r.chans[1]]} Hz test tones at −20 dBFS)` : 'AES1 muted: its AUDIO_INFORMATION bits are 0') : 'no AES1'}.
    <span class="muted">Channel-status byte 0 is drawn as the AES3 professional default (${inf}).</span>`;
}

/* ---------------- tutorial (SD403MANiss5v1 + MF100man) ---------------- */
const steady = ()=> lastPass();
const LESSONS = [
  {title:'Meet the Serialboxx', body:`<p>Serialboxx (NAB ${Y(2001)}) is a 2RU <b>MF100</b> frame with ten plug-in cards and two <b>M8245A</b> power supplies. Each card has its own 1 + 8 BNC rear panel; cards that need balanced audio get a <b>TB101/TB102/TB103</b> screw-terminal block that plugs onto Berg headers and covers some of the BNCs.</p><p>This frame holds an <b>SD403B</b> SDI audio demultiplexer in slot 1. It takes SDI video with embedded audio, passes the video on, and pulls two groups of audio out as AES.</p>`, check:()=>true, auto:true},
  {title:'1 · Open the front panel', body:`<p>The tallies sit on the front edge of each card, behind a hinged panel (“slot vented … to afford a view of the cards' tallies”). <b>Click the front panel</b> to lower it.</p>`, check:()=>D.door, hint:'Click anywhere on the closed front panel (or press D).'},
  {title:'2 · Find the SD403', body:`<p>Each card edge shows its LEDs and a white label. <b>Click slot 1 (SD403B)</b> so the card in focus is an SD403. The board below is the real issue 5 assembly drawing.</p>`, check:()=>isSD403(D.slots[D.focus]), hint:'Click the first card edge, or choose slot 1 in the Focus menu.'},
  {title:'3 · Read the tallies', body:`<p>From the manual: <b>green CD</b> = locked to the SDI input; <b>yellow AUDIO1</b> = AES from GROUP SEL 1 present; <b>yellow AUDIO2</b> = GROUP SEL 2; <b>red ERROR</b> = cannot lock.</p><p>Press <b>▶ Play</b> or drag the playhead past 0.4 s. At power-up the firmware reloads the FPGA twice and holds both demuxers in reset for 255 loop passes, so the AUDIO LEDs come on late.</p>`, check:()=>{ const p=passAt(SIM.t); return isSD403(D.slots[D.focus]) && !!(p.leds&0x10) && !!(p.leds&0x20); }, hint:'Move the playhead to about 0.5 s.'},
  {title:'4 · Lose the input', body:`<p><b>Unplug the SDI</b> (rear IN BNC of the selected slot, the button, or S). ERROR comes on at once: <span class="mono">PROCESS_CARRIER_DETECT</span> has no debounce on loss. Plug it back in: CD needs 255 good passes before it lights again.</p>`, check:()=>!now().sdi || D.events.some(e=>e.k==='sdi'&&!e.v), hint:'Click “connected” next to SDI source, or press S.'},
  {title:'5 · Choose GROUP SEL 1', body:`<p>Plug the SDI back in. GROUP SEL 1 is <b>SW1/SW2</b>: OFF OFF = group 1 (default), OFF ON = 2, ON OFF = 3, ON ON = 4.</p><p><b>Goal:</b> demux group 2 on AES1/AES2 (SW2 ON).</p>`, check:()=>{ const In=now(); return In.sdi && grpSel(In.dip)[0]===1; }, hint:'Turn SW2 ON (click switch 2 on the board, or press 2), and reconnect the SDI if needed.'},
  {title:'6 · An empty group', body:`<p>GROUP SEL 2 is <b>SW4/SW5</b>. The source carries groups 1–3 only. Set GROUP SEL 2 to <b>group 4</b> (SW4 ON, SW5 ON): AUDIO2 goes dark and AES3/AES4 are muted by <span class="mono">PROCESS_AUDIO_INFORMATION</span>.</p>`, check:()=>{ const In=now(); return grpSel(In.dip)[1]===3 && !In.groups[3]; }, hint:'Press 4 and 5 (or click SW4 and SW5); leave G4 off in the source.'},
  {title:'7 · Swap the pairs', body:`<p><b>SW3</b> swaps AES1 and AES2 (swap.vhd: <span class="mono">AES_OUT1 &lt;= AES2 when swap='1'</span>); SW6 does the same for AES3/AES4.</p><p><b>Goal:</b> SW3 ON. Look at the inspector: AES1 now carries channels 3/4.</p>`, check:()=>dipOn(now().dip,3), hint:'Press 3.'},
  {title:'8 · Remote swap on the SD403C', body:`<p>The SD403C comes with a TB102. Its <b>SWAP CONTROL</b> terminal lets a contact closure swap the pairs when the DIP switch is OFF (v203, Jan ${Y(2008)}). <b>Select slot 2 (SD403C)</b>, make sure SW3 is OFF there, and close <b>+ SWAP1</b>.</p>`, check:()=>variant()==='C' && now().rsw[0] && !dipOn(now().dip,3), hint:'Pick slot 2 in Focus, toggle SW3 off if it is on, then click “+ SWAP1”.'},
  {title:'9 · Watch it heal the FPGA', body:`<p>Move the playhead to about 0.3 s and click <b>FPGA misaligns once</b>. Scrub forward: after 255 passes of a bad <span class="mono">ALTERA6</span> echo the ATmega128 pulls N_CONFIG low and the Cyclone reloads (orange on the timeline). The CD tally never flickers.</p>`, check:()=>runSim().recfg.length>2, hint:'Click “FPGA misaligns once”, then look at the FPGA lane after the playhead.'},
  {title:'10 · Redundant power', body:`<p>Each M8245A can carry the whole frame. <b>Unplug PS1</b> on the rear: the PS 1 LED goes out, the frame keeps running on PS 2.</p>`, check:()=>!now().ps1 && now().ps2, hint:'Click the PS 1 inlet on the rear panel.'},
  {title:'Done', body:`<p>You have used every control the SD403 has: input, the two group selects, both swaps, the remote swap, and seen its self-repair. <b>Software</b> shows the loop and the register bytes, <b>Findings</b> lists the slips in the firmware and the paperwork.</p>`, check:()=>true, auto:true},
];
function viewTutorial(m){
  window.__serialboxActive = true;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — installing and using an SD403 in an MF100', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The frame and card', `<div id="fp"></div><div id="pick" style="margin-top:6px"></div><div id="brd" style="margin-top:6px"></div><div id="ctl"></div><div id="rp" style="margin-top:8px"></div>`)}</div></div>`;
  const draw = ()=>{
    const t=SIM.t;
    const fp=m.querySelector('#fp'); fp.innerHTML=frontSVG(t); bindPanels(fp);
    const pk=m.querySelector('#pick'); pk.innerHTML=slotPickerHTML(); bindPicker(pk);
    const b=m.querySelector('#brd'), ct=m.querySelector('#ctl');
    if (isSD403(D.slots[D.focus])){ b.innerHTML=boardSVG(t); bindPanels(b); ct.innerHTML=controlsHTML(); bindControls(ct); } else { b.innerHTML=''; ct.innerHTML=''; }
    const rp=m.querySelector('#rp'); rp.innerHTML=rearSVG(t); bindPanels(rp);
    m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===D.tutorial?'font-weight:700;color:var(--accent)':''}">${l.title}${i<D.tutorial?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ D.tutorial=+li.dataset.i; draw(); });
    const L=LESSONS[D.tutorial]; let ok=false; try{ ok=!!L.check(); }catch(e){}
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${D.tutorial?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${D.tutorial<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick=()=>{ D.tutorial=Math.max(0,D.tutorial-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ D.tutorial=Math.min(LESSONS.length-1,D.tutorial+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); D.tutorial=0; SIM.seek(0); };
  };
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewSecond(m){
  window.__serialboxActive = true;
  m.innerHTML = `${card('One second inside an SD403, broken down', `<div id="lad"></div>`)}
    <div class="grid2">${card('As the card sees it, at the playhead', `<div id="dev"></div>`)}${card('As the tallies show it', `<div id="edge"></div><canvas id="lc"></canvas><p class="small muted">The four card-edge LEDs over the whole second, from the pass-by-pass run.</p>`)}</div>
    <div class="grid2">${card('Scope: one SDI line around the playhead (SMPTE 259M / 272M)', `<canvas id="line"></canvas><div id="pk" class="small mono"></div>`)}${card('Zoom ladder at the playhead', `<canvas id="zl"></canvas>`)}</div>`;
  const draw = ()=>{
    const t=SIM.t, sim=runSim(), nP=sim.passes.filter(p=>p.kind==='loop').length;
    m.querySelector('#lad').innerHTML = tbl(['Event','per second','period','who handles it'],[
      ['Mains half-cycles','120','8.33 ms','two M8245A switchers, 85–264 VAC, +21 V / −21 V via redundancy diodes'],
      ['SDI fields (NTSC)','59.94','16.68 ms','CLC011 decodes; the FPGA sees every TRS'],
      ['SDI lines','15 734','63.56 µs','each carries HANC audio packets for the groups present'],
      ['SDI 10-bit words','27 000 000','37.0 ns','CLC011 → data[0..9] + PCLK (FPGA pin 93)'],
      ['SDI bits','270 000 000','3.70 ns','CLC014 EQ → CLC016 reclock → GS9007 drives OUT1–4'],
      ['Audio samples per channel','48 000','20.83 µs',`group selector.vhd writes them into FIFOs (${inf} depth)`],
      ['AES3 frames per output','48 000','20.83 µs','CS8406 (A/C) or FPGA i2sx4_aes (B build)'],
      ['AES3 biphase cells','6 144 000','163 ns','per AES output'],
      ['ATmega128 main-loop passes',`≈ ${nP} ${inf}`,SIM.fmtDur(C.LOOP_T),'each pass writes 6 bytes and reads 18 bytes'],
      ['Bits clocked MCU ↔ FPGA',`≈ ${(nP*192).toLocaleString()}`,'',"48 out on PC0, 144 in on PC1/PC3/PC2, clock PC5"],
      ['Debounce windows (255 passes)',`≈ ${(1/(255*C.LOOP_T)).toFixed(1)}`,SIM.fmtDur(255*C.LOOP_T),'CD, alignment and count errors; group-change hold'],
      ['FPGA reloads this second',String(sim.recfg.length),'',`main() + the first loop pass at power-up, then one per alignment failure`],
    ].map(r=>[r[0],`<span class="mono">${r[1]}</span>`,`<span class="mono">${r[2]}</span>`,`<span class="small">${r[3]}</span>`]));
    const p=passAt(t), st=stepAt(t), line=Math.floor((t%C.FIELD)/C.LINE)+1, word=Math.floor((t%C.LINE)/C.WORD);
    m.querySelector('#dev').innerHTML = `<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>SDI</th><td class="mono">${p.In.sdi?`field ${Math.floor(t/C.FIELD)} · line ${line} · word ${word}/1716 ${word<268?'(HANC)':''}`:'no input'}</td></tr>
      <tr><th>ATmega128</th><td class="mono">${p.kind==='loop'?`pass #${p.i}: ${STEPS[st.step][0]}<br><span class="muted">${STEPS[st.step][2]}</span>`:p.kind}</td></tr>
      <tr><th>FPGA</th><td class="mono">${p.kind!=='loop'?'—':!p.cfg?'loading configuration from EPCS':st.step===2?'shifting in the 6 control bytes':st.step===3?'shifting out 18 status bytes':'demuxing: FIFOs → AES encoders'}</td></tr>
      <tr><th>AES1 sample</th><td class="mono">${Math.floor(t*C.FS).toLocaleString()} · frame ${Math.floor(t*C.FS)%192}/191</td></tr></table>`;
    m.querySelector('#edge').innerHTML = (()=>{ const L=ledsAt(t); return [['CD',L.cd],['AUDIO1',L.a1],['AUDIO2',L.a2],['ERROR',L.er]].map(([n,l])=>`<span class="chip" style="${l?`background:${LEDC[n]};color:#111`:''}">${n}</span>`).join(''); })();
    const lc=SIM.canvas(m.querySelector('#lc'),60); const W=lc.w; [0x10,0x20,0x40,0x80].forEach((mk,r)=>{ lc.c.fillStyle=['#3fbf5f','#e8b23a','#e8b23a','#e3453a'][r]; sim.passes.forEach(q=>{ if(q.leds&mk) lc.c.fillRect(10+q.t0*(W-20),6+r*12,Math.max(1,(q.t1-q.t0)*(W-20)),9); }); });
    lc.c.fillStyle=SIM.css('--play'); lc.c.fillRect(10+t*(W-20)-1,0,2,56);
    drawLine(m.querySelector('#line'), m.querySelector('#pk'), t);
    drawLadder(m.querySelector('#zl'), t);
  };
  SIM.on('time', draw);
}
function drawLine(cv, el, t){
  const {c,w} = SIM.canvas(cv, 120); const In = inputsAt(t); const g = grpSel(In.dip);
  const segs = [['EAV',4,'--warn'],['HANC',264,'--accent2'],['SAV',4,'--warn'],['active video (Cb Y Cr Y)',1440,'--grid']];
  let x=10; const k=(w-20)/1716;
  segs.forEach(([n,len,col])=>{ c.fillStyle=SIM.css(col); c.globalAlpha=.5; c.fillRect(x,20,len*k,40); c.globalAlpha=1; c.fillStyle=SIM.css('--ink'); c.font='11px sans-serif'; if(len*k>30) c.fillText(n,x+3,74); x+=len*k; });
  let px = 10+4*k+6; const present=[]; [0,1,2,3].forEach(gg=>{ if (In.groups[gg]&&In.sdi){ present.push(gg); const sel = g.includes(gg); c.fillStyle= sel? SIM.css('--accent') : SIM.css('--ink2'); c.fillRect(px,26,31*k,28); px+=34*k; } });
  const pos=((t%C.LINE)/C.LINE)*(w-20)+10; c.fillStyle=SIM.css('--play'); c.fillRect(pos-1,14,2,52);
  c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(`1 line = 1716 words · ${SIM.fmtDur(C.LINE)} · packets of the selected groups in green`,10,100);
  el.innerHTML = `Audio data packet (one per group per line): ADF 000 3FF 3FF · DID ${present.map(gg=>GROUP_DID[gg]+'h').join(' / ')||'—'} · DBN · DC · 3 words per channel sample × 4 channels × (3 or 4 samples) · CS. <span class="muted">SMPTE 272M layout is general knowledge (${inf}); the PIC v1.02 code programs the GS9023 with “DID audio packet ext/group” values per group.</span>`;
}
function drawLadder(cv, t){
  const levels=[['1 second',1],['1 field',C.FIELD],['1 loop pass',C.LOOP_T],['1 SDI line',C.LINE],['1 AES frame',1/C.FS]];
  const H=levels.length*40+8; const {c,w}=SIM.canvas(cv,H);
  levels.forEach(([nm,span],i)=>{ const y=6+i*40, t0=Math.max(0,Math.min(1-span,t-span/2)), x0=140, pw=w-x0-10;
    c.fillStyle=SIM.css('--ink'); c.font='12px sans-serif'; c.fillText(`${nm} (${SIM.fmtDur(span)})`,6,y+18);
    c.strokeStyle=SIM.css('--grid'); c.strokeRect(x0,y+2,pw,30);
    c.fillStyle=SIM.css('--accent'); runSim().passes.forEach(p=>{ if(p.t1<t0||p.t0>t0+span||!(p.leds&0x20)) return; const a=x0+Math.max(0,(p.t0-t0)/span)*pw, b=x0+Math.min(1,(p.t1-t0)/span)*pw; c.globalAlpha=.25; c.fillRect(a,y+3,Math.max(1,b-a),28); c.globalAlpha=1; });
    c.strokeStyle=SIM.css('--accent2'); c.beginPath(); const N=Math.min(600,pw); for(let j=0;j<=N;j++){ const tt=t0+span*j/N; const yy=y+17-aesSample(0,0,tt)*130; j?c.lineTo(x0+pw*j/N,yy):c.moveTo(x0,yy);} c.stroke();
    const px=x0+(t-t0)/span*pw; c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+34); c.stroke(); });
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  frame:{x:20,y:20,w:200,h:90,t:'MF100 frame',s:['2RU · 10 slots · 130 VA','2 × M8245A ±21 V','MF100REF ref bus'],d:'MF100man.wpd / MF100.pdf: hinged vented front, BNC back panel (1 in + 8 out per card), two separately fused supplies with redundancy diodes. Backplane carries ±21 V, the reference buses and (per the SD403 netlist) RS-485 pairs and a 4-bit frame address.',k:'psu'},
  eq:{x:20,y:150,w:200,h:70,t:'U1 CLC014 → U2 CLC016',s:['adaptive EQ, reclock','CD → PF1'],d:'P1-A1 IN+ → L4 18 nH → CLC014 adaptive cable equaliser → CLC016 data-retiming PLL. CLC016 pins 28/19 drive net CD into the ATmega128 PF1 (U11-60). Manual: 250 m of 75 Ω coax.',k:'rck'},
  drv:{x:20,y:260,w:200,h:70,t:'U6 GS9007 + drivers',s:['reclocked SDI → OUT1–4'],d:'GS9007 cable driver (CLC007 footprint) and output resistors R31–R34 (68R) to P1 OUT1–OUT4. On SD403A/C the TB102 covers BNC 1 and 3 ("not accessible").',k:'drv'},
  dec:{x:270,y:150,w:180,h:70,t:'U5 CLC011 decoder',s:['10-bit data + PCLK'],d:'SMPTE 259M decoder: parallel data[0..9] on FPGA pins 108…77 and PCLK on pin 93 (sd403iss1.qsf / netlist). iss5 note: "CLC011 I/O = 3.3 Volts".',k:'dec'},
  fpga:{x:270,y:260,w:180,h:150,t:'U3 Cyclone EP1C6',s:['TRS / HANC parser','group selector × 2','FIFOs · swap.vhd','I²S → CS8406','EPCS1 config'],d:'Quartus II 4.1/5.1. group selector.vhd writes only the packets of gsel1/gsel2 into FIFOs; swap.vhd exchanges the AES pair; AUDIO_1/AUDIO_2 + LRCK/SCLK/OMCK go to the CS8406 transmitters (A/C). The SD403B build (pod31.qsf) encodes four AES streams in the FPGA instead.',k:'fpga'},
  mcu:{x:510,y:150,w:200,h:110,t:'U11 ATmega128L',s:['4.9152 MHz · v201/v202/v203','DIP SW1–8 on PORTB','LEDs on PE4–PE7','serial link on PORTC'],d:'One while(1) loop, no interrupts (EIMSK = TIMSK = 0). Reads CD and the DIP switch, writes 6 control bytes to the FPGA, reads 18 status bytes back, debounces everything, lights the four LEDs, and reloads the FPGA (PA0 → Q1 → N_CONFIG) when the 0xA0 echo is lost.',k:'mcu'},
  aes:{x:510,y:300,w:200,h:110,t:'U9/U12 CS8406 → outputs',s:['75 Ω BNC (AES_OUTn)','110 Ω DS26LS31 (TB102)','T1–T4 PE-65612 xfmrs'],d:'CS8406 AES transmitters fed by the FPGA. AES_OUT1–4 (FPGA 76–73) via 75 Ω filters to the BNCs; OUT110_1–4 through a DS26LS31 line driver; TB1–TB4 through PE-65612 transformers and H9/H10 jumpers to P1 (balanced, TB102).',k:'cs'},
  pll:{x:270,y:440,w:180,h:50,t:'U4 PLL1705',s:['AUDIO_CLOCK → FPGA 62'],d:'TI/Burr-Brown PLL1705 multi-clock generator → AUDIO_CLOCK. iss5 note: "PLL1705 – C10-C11 spacing, too close to IC".',k:'pll'},
  pwr:{x:20,y:370,w:200,h:90,t:'Card power',s:['F1 RXE050 · REG1 LM2596','REG2 LM1117-3.3 · REG3 ADJ','+21 V 110 mA · −21 V 80 mA'],d:'Netlist: V+ (P1 x9) via polyfuse F1 → LM2596 switcher → LM1117-3.3 (3V net) and LM1117-ADJ (FPGA core). −VA via F2 for the TB transformer side. Manual: +21 V 110 mA, −21 V 80 mA max.',k:'psu'},
  rs:{x:510,y:440,w:200,h:50,t:'U8/U10 RS-485',s:['EXT2± · INT1± · FRAME_A0–3'],d:'Two LTC1480 transceivers on UART0 (CPU_TX/RX) to the backplane, plus FRAME_A0–A3 on PG0–PG3. The UART code exists in v20x but every call in main() is commented out.',k:'rs485'},
};
const WIRES=[['frame','eq','IN BNC'],['eq','dec',''],['eq','drv','serial'],['dec','fpga','data[0..9]'],['fpga','aes','I²S'],['mcu','fpga','PC0/PC5 ↔ PC1-3'],['eq','mcu','CD'],['fpga','mcu',''],['pll','fpga',''],['frame','pwr','±21 V'],['mcu','rs','UART0'],['aes','frame','rear BNC / TB102']];
function viewBlock(m){
  window.__serialboxActive = false;
  let sel = 'mcu';
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram — SD403 issue 5 in the MF100 (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bi"></div>`)}${card('On the real board', `<div id="brd"></div>`)}${card('In one sentence', `<p>The equaliser and reclocker recover the SDI; the decoder hands 10-bit words to the <b>FPGA</b>, which picks out two groups of embedded audio and feeds AES transmitters; the <b>ATmega128</b> never touches audio — it reads the switches, tells the FPGA what to do, watches what comes back and lights the tallies.</p>`)}</div></div>`;
  const draw=()=>{
    const st = stepAt(SIM.t); const busy = st.step===2||st.step===3 ? ['mcu','fpga'] : ['mcu'];
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 730 500" style="width:100%"><defs><marker id="sbAr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const P=BLOCKS[a],Q=BLOCKS[b]; let [x1,y1]=ctr(P),[x2,y2]=ctr(Q);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const k=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9, dy?(bx.h/2)/Math.abs(dy):1e9); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(P,x1,y1,x2,y2); [x2,y2]=clip(Q,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#sbAr)"/>${l?`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`:''}`; });
    for (const k in BLOCKS){ const b=BLOCKS[k], on=sel===k, live=busy.includes(k);
      s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${live?'color-mix(in srgb,var(--accent) 14%,var(--panel2))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?2.5:1.2}"/><text x="${b.x+10}" y="${b.y+19}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+10}" y="${b.y+36+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML = s+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=> g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
    const br=m.querySelector('#brd'); br.innerHTML=boardSVG(SIM.t, b.k); br.querySelectorAll('.sbChip').forEach(r=> r.addEventListener('click',()=>{ const k=Object.keys(BLOCKS).find(q=>BLOCKS[q].k===r.dataset.c); if(k){ sel=k; draw(); } }));
  };
  SIM.on('time', draw);
}

/* ---------------- schematics (redrawn from SD403iss5.net) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*17;
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([pin,net],i)=>{ const yy=y+22+i*17; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-34}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach(([pin,net],i)=>{ const yy=y+22+i*17; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+34}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
const box=(x,y,w,h,t1,t2)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+w/2}" y="${y+h/2-(t2?3:-4)}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${t1}</text>${t2?`<text x="${x+w/2}" y="${y+h/2+13}" text-anchor="middle" font-size="10" fill="var(--ink2)">${t2}</text>`:''}`;
const wire=(x1,y1,x2,y2,l)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink)"/>${l?`<text x="${(x1+x2)/2}" y="${Math.min(y1,y2)-4}" text-anchor="middle" font-size="10" fill="var(--accent2)">${l}</text>`:''}`;
const SHEETS = [
  {name:'1 · SDI input chain', note:'From SD403iss5.net: P1-A1 IN+ → L4 (18nH) → U1 CLC014 → U2 CLC016 → U5 CLC011 (parallel) and U6 GS9007 (serial out). CD is U2-28/U2-19 → U11-60 (PF1).', svg:()=>
    box(30,180,90,50,'P1-A1','IN+ (BNC IN)')+wire(120,205,170,205,'L4 18nH')+box(170,180,110,50,'U1 CLC014','adaptive EQ')+wire(280,205,330,205,'')+box(330,170,120,70,'U2 CLC016','reclocker PLL')
    +wire(390,240,390,300,'')+wire(390,300,560,300,'CD → U11-60 (PF1)')+wire(450,190,520,190,'')+box(520,160,130,60,'U5 CLC011','SDI decoder')+wire(650,180,760,180,'data[0..9]')+wire(650,205,760,205,'PCLK → U3-93')
    +wire(450,225,500,225,'')+wire(500,225,500,380,'')+wire(500,380,540,380,'')+box(540,355,120,50,'U6 GS9007','cable driver')+wire(660,380,760,380,'R31–R34 68R')
    +`<text x="770" y="370" font-size="11" fill="var(--accent2)">OUT1 P1-C7</text><text x="770" y="385" font-size="11" fill="var(--accent2)">OUT2 P1-A7</text><text x="770" y="400" font-size="11" fill="var(--accent2)">OUT3 P1-C10</text><text x="770" y="415" font-size="11" fill="var(--accent2)">OUT4 P1-A10</text>
      <text x="30" y="60" font-size="12" fill="var(--ink2)">Manual: 0.8 Vp-p, 75 Ω, return loss 18 dB, 270 Mb/s, up to 250 m of coax.</text><text x="30" y="78" font-size="12" fill="var(--ink2)">The EL2280C (netlist) / EL5263IS (assembly drawing) amplifiers sit between these stages and the outputs (not traced).</text>`},
  {name:'2 · ATmega128L (U11)', note:'Pin numbers and net names from SD403iss5.net; port bits from v202.c (port_init, macros). The DIP switch reads inverted: INVERT_DATA(PINB).', svg:()=>
    chip(320,40,220,'U11 ATmega128(L)',[
      ['10 PB0','SW8'],['11 PB1','SW7'],['12 PB2','SW6 swap 2'],['13 PB3','SW5 sel2 lsb'],['14 PB4','SW4 sel2 msb'],['15 PB5','SW3 swap 1'],['16 PB6','SW2 sel1 lsb'],['17 PB7','SW1 sel1 msb'],
      ['60 PF1','CD'],['61 PF0','CHSWAP1'],['19 PG4','CHSWAP2'],['33/34/43/18','FRAME_A0–A3'],['2 / 3 PE0/1','CPU_RX / CPU_TX'],['23/24','X1 4.9152 MHz'],
    ],[
      ['35 PC0','ALTERA0 data out'],['36 PC1','ALTERA1 DATA_READ'],['37 PC2','ALTERA2 DATA_READ2'],['38 PC3','ALTERA3 DATA_READ1'],['39 PC4','ALTERA4'],['40 PC5','ALTERA5 clock'],['41 PC6','ALTERA6 STROBE_READ'],['42 PC7','ALTERA7 STROBE_WRITE'],
      ['46 PA5','ALTERA10 (CD gate)'],['51 PA0','ALTERA_RESET → Q1'],['5 PE3','N_CONFIG (input)'],['4 PE2','CS8406_RESET'],['6–9 PE4–7','CDLED AUDIO1 AUDIO2 ERROR'],
    ],'ICCAVR · v201 / v202 / v203 · Atmel JTAG on JTAG1')},
  {name:'3 · Cyclone EP1C6 (U3)', note:'Pins from the netlist and PCB/Altera/v102/Altera/sd403iss1.qsf (top level SD403iss1, EPCS1). The SD403B project pod31.qsf disagrees on ALTERA9/10 and lists pins above 144 (see Findings).', svg:()=>
    chip(330,40,200,'U3 EP1C6T144C7',[
      ['5 4 3 2 1','ALTERA0–4'],['142 143 144','ALTERA5–7'],['141 140 139','ALTERA8–10'],['14','N_CONFIG'],['93','PCLK'],['108…77','data[0..9]'],['62','AUDIO_CLOCK (PLL1705)'],
    ],[
      ['32','OMCK'],['33 / 36','AUDIO_1 / AUDIO_2'],['34 / 35','LRCK / SCLK'],['37 / 38','AES1 / AES2 (from CS8406)'],['40 41 / 52 51','VBIT1 UBIT1 / VBIT2 UBIT2'],['53','TCBL'],['76 75 74 73','AES_OUT1–4'],['134…130','TP1–TP5'],
    ],'Quartus II 4.x · EPCS1 (M25P40 on the drawing)')},
  {name:'4 · AES outputs', note:'U9/U12 CS8406, U13 DS26LS31C, T1–T4 PE-65612 from the netlist. iss5 revision note: "filter 75R AES output", "separate SD400A feeds from AES outs".', svg:()=>{
    let s=box(40,60,130,60,'U9 CS8406','AES1')+box(40,170,130,60,'U12 CS8406','AES2')+wire(170,90,260,90,'AES1 → U3-37')+wire(170,200,260,200,'AES2 → U3-38')+box(260,60,120,170,'U3 FPGA','route / swap');
    ['AES_OUT1','AES_OUT2','AES_OUT3','AES_OUT4'].forEach((n,i)=>{ const y=70+i*40; s+=wire(380,y,520,y,n+' (U3-'+(76-i)+')')+`<text x="530" y="${y+4}" font-size="11" fill="var(--ink)">75 Ω filter → BNC</text>`; });
    s+=box(260,280,120,60,'U13 DS26LS31C','110 Ω driver')+`<text x="400" y="300" font-size="11" fill="var(--accent2)">OUT110_1–4 → TB102</text>`;
    ['TB1± P1-A4/A5','TB2± P1-D4/D5','TB3± P1-D19/D20','TB4± P1-D11/D12'].forEach((n,i)=>{ s+=`<text x="560" y="${300+i*18}" font-size="11" fill="var(--accent2)">T${i+1} PE-65612 → ${n}</text>`; });
    return s+`<text x="40" y="420" font-size="11.5" fill="var(--ink2)">H9 / H10 (H2X3) select which pair reaches the transformer terminals. CS8406 control: CS8406_RESET = PE2.</text>`; }},
  {name:'5 · Power, backplane, RS-485', note:'Netlist: V+ on P1-A9/B9/C9/D9 via F1 (RXE050) → REG1 LM2596 → REG2 LM1117-3.3; REG3 LM1117-ADJ; −VA via F2. RS-485: U8 → EXT2± (P1-A23/B23), U10 → INT1± (P1-B14/B15).', svg:()=>
    box(30,60,110,50,'P1 V+','+21 V ×4 pins')+wire(140,85,200,85,'F1 RXE050')+box(200,60,120,50,'REG1 LM2596','switcher')+wire(320,85,380,85,'+5V')+box(380,40,130,40,'REG2 LM1117-3.3','3V net')+box(380,100,130,40,'REG3 LM1117-ADJ','FPGA core')
    +box(30,160,110,50,'P1 −VA','−21 V')+wire(140,185,200,185,'F2 → H10-4')+`<text x="210" y="190" font-size="11" fill="var(--ink2)">transformer / TB side</text>`
    +chip(560,240,150,'U8 / U10 LTC1480',[['DI','CPU_TX (PE1)'],['RO','CPU_RX (PE0)']],[['A/B','EXT2± / INT1±']],'RS-485 (ADM3485 on drawing)')
    +`<text x="30" y="270" font-size="11.5" fill="var(--ink)">FRAME_A0 P1-B19 · A1 B20 · A2 B21 · A3 B22 → PG0, PG1, PG2, PG3</text><text x="30" y="290" font-size="11.5" fill="var(--ink)">CHSWAP1 P1-C4 → PF0 · CHSWAP2 P1-C20 → PG4 (TB102 "SWAP CONTROL + / −")</text>
      <text x="30" y="330" font-size="11.5" fill="var(--ink2)">Manual: +21 V 110 mA max, −21 V 80 mA max. M8245A: +21 V @ 4 A, −21 V @ 3 A, 85–264 VAC.</text>`},
  {name:'6 · MF100 rear slot', note:'From MF100man.wpd, MF100TERM.cdr and the rear photo: per card 1 IN + 8 OUT BNC, Berg headers above and below for TB101 / TB102 / TB103.', svg:()=>{
    let s=''; const pos=[[160,60,'IN']].concat([1,3,5,7].map((n,i)=>[100,100+i*70,String(n)])).concat([2,4,6,8].map((n,i)=>[160,130+i*70,String(n)]));
    pos.forEach(([x,y,l])=>{ s+=`<circle cx="${x}" cy="${y}" r="17" fill="none" stroke="var(--ink)"/><text x="${x+(l==='IN'?24:-24)}" y="${y+4}" font-size="11" text-anchor="${l==='IN'?'start':'end'}" fill="var(--accent2)">${l}</text>`; });
    s+=`<rect x="80" y="20" width="40" height="20" fill="none" stroke="var(--ink)"/><rect x="80" y="400" width="40" height="20" fill="none" stroke="var(--ink)"/><text x="130" y="35" font-size="10" fill="var(--ink2)">Berg</text>`;
    const v=variant(); const map=rearMap(v);
    s+=tbl2(320,40,['BNC','SD403'+v],map.map((x,i)=>[String(i+1),x]));
    return s; }},
];
function tbl2(x,y,h,rows){ let s=`<text x="${x}" y="${y}" font-size="12" font-weight="700" fill="var(--ink)">${h[0]}</text><text x="${x+60}" y="${y}" font-size="12" font-weight="700" fill="var(--ink)">${h[1]}</text>`;
  rows.forEach((r,i)=>{ s+=`<text x="${x}" y="${y+20+i*18}" font-size="11.5" fill="var(--ink)">${r[0]}</text><text x="${x+60}" y="${y+20+i*18}" font-size="11.5" fill="var(--accent2)">${r[1]}</text>`; }); return s; }
function viewSchem(m){
  window.__serialboxActive = false;
  let i=0;
  m.innerHTML = card('Schematic set — redrawn from SD403iss5.net and the firmware, not the original P-CAD sheets', `<div id="t2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p><p class="small muted">The original P-CAD schematic is <span class="mono">SD403/PCB/SD403iss5.sch</span> (binary; earlier issues in PCB/OBSOLETE). Blue labels are net names copied from the netlist.</p>`);
  const draw=()=>{
    m.querySelector('#t2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#t2 button').forEach(b=> b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 900 480" style="width:100%;min-width:660px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="888" height="468" fill="none" stroke="var(--line)"/><text x="884" y="466" text-anchor="end" font-size="10" fill="var(--ink2)">SD403 iss5 · sheet ${i+1}/${SHEETS.length} · redrawn ${Y(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent = SHEETS[i].note;
  };
  draw();
}

/* ---------------- software ---------------- */
function viewSoft(m){
  window.__serialboxActive = true;
  m.innerHTML = `<div class="grid2">${card('ATmega128 main() — the box lit up is running at the playhead', `<div id="flow"></div>`)}
    <div>${card('CD debounce (TRANSLATE_INPUT / DEBOUNCE_INPUT)', `<div id="cdfsm"></div>`)}${card('FPGA watchdog (PROCESS_ALIGNMENT_CHECK)', `<div id="alfsm"></div>`)}</div></div>
    <div class="grid2">${card('6 bytes out — ALTERA_write(), live', `<div id="wr"></div>`)}${card('18 bytes in — ALTERA_read(), live', `<div id="rd"></div>`)}</div>
    <div class="grid2">${card('How the switches do things — switch → code → FPGA', `<div id="btn"></div>`)}${card('Firmware history in the folder', `<div id="hist"></div>`)}</div>`;
  const draw=()=>{
    const st=stepAt(SIM.t), p=st.pass, F=p.F||freshFW();
    let s=`<svg viewBox="0 0 560 ${STEPS.length*46+80}" style="width:100%"><defs><marker id="sbA2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <rect x="140" y="6" width="280" height="26" rx="13" fill="var(--chip)" stroke="var(--line)"/><text x="280" y="24" text-anchor="middle" font-size="12" fill="var(--ink)">main(): init_devices(); CONFIGURE_ALTERA();</text>`;
    STEPS.forEach((q,j)=>{ const y=44+j*46, on=st.step===j, bad=(j===5&&p.reconf);
      s+=`<line x1="280" y1="${y-12}" x2="280" y2="${y}" stroke="var(--ink2)" marker-end="url(#sbA2)"/><rect x="20" y="${y}" width="500" height="34" rx="6" fill="${bad?'var(--warn)':on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
        <text x="30" y="${y+14}" font-size="10.5" font-family="var(--mono)" fill="${on||bad?'#fff':'var(--ink)'}">${q[0].length>78?q[0].slice(0,76)+'…':q[0]}</text><text x="30" y="${y+28}" font-size="10" fill="${on||bad?'#eef':'var(--ink2)'}">${q[2]}</text>`; });
    const yb=44+STEPS.length*46; s+=`<path d="M520 ${yb-30} h22 V40 h-22" fill="none" stroke="var(--ink2)" marker-end="url(#sbA2)"/><text x="20" y="${yb+16}" font-size="11" fill="var(--ink2)">while(1) — WDR() three times per pass; WDTCR = 0x08 (≈14 ms). Pass ${p.kind==='loop'?'#'+p.i:p.kind}.</text></svg>`;
    m.querySelector('#flow').innerHTML=s;
    const node=(x,y,l,on,sub)=>`<circle cx="${x}" cy="${y}" r="36" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="${x}" y="${y-2}" text-anchor="middle" font-size="11" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${l}</text><text x="${x}" y="${y+13}" text-anchor="middle" font-size="9.5" fill="${on?'#fff':'var(--ink2)'}">${sub}</text>`;
    const cdS = F.switch1===0 ? (F.CD?0:2) : (F.release1?1:2);
    m.querySelector('#cdfsm').innerHTML = `<svg viewBox="0 0 460 150" style="width:100%">${node(70,75,'LOCKED',cdS===0,'CD LED')}${node(230,75,'COUNTING',cdS===1,F.sw1c+'/255')}${node(390,75,'NO CD',cdS===2,'ERROR LED')}
      <text x="150" y="30" text-anchor="middle" font-size="10" fill="var(--ink2)">CD lost → at once</text><text x="310" y="30" text-anchor="middle" font-size="10" fill="var(--ink2)">CD back → release1</text><text x="230" y="140" text-anchor="middle" font-size="10" fill="var(--ink2)">255 passes → switch1 = 0 (even if CD dropped again meanwhile)</text></svg>`;
    const alS = F.RESET2===0 ? (F.switch2? 0 : 1) : 2;
    m.querySelector('#alfsm').innerHTML = `<svg viewBox="0 0 460 150" style="width:100%">${node(70,75,'ALIGNED',alS===0&&p.cfg,'0xA0 echoed')}${node(230,75,'SUSPECT',F.release2===1,F.sw2c+'/255')}${node(390,75,'RECONFIG',alS===2||!p.cfg,'RESET2=1 · '+F.e2c+'/255')}
      <text x="150" y="30" text-anchor="middle" font-size="10" fill="var(--ink2)">ALTERA6 ≠ 0xA_</text><text x="310" y="30" text-anchor="middle" font-size="10" fill="var(--ink2)">switch2 = 0 → CONFIGURE_ALTERA</text><text x="230" y="140" text-anchor="middle" font-size="10" fill="var(--ink2)">not aligned after 255 more passes → RESET2 = 0 → reload again</text></svg>`;
    const W=F.W, v=variant();
    m.querySelector('#wr').innerHTML = v==='A' ? tbl(['byte','value','meaning (v201)'],[[1,hex2(W[0]),'DIP_SWITCH (+ remote swap bits 0x20 / 0x04)'],[2,hex2(W[1]||0),'AUDIO_INFORMATION']].map(r=>[r[0],`<span class="mono">${r[1]}</span>`,r[2]])) + `<p class="small muted">v201 sends 2 bytes and drives RESET_VECTOR straight onto PORTC's low nibble — the same pins as the serial link.</p>`
      : tbl(['byte','value','meaning (v202/v203)'],[[1,W[0],'dolby_upper — always 0 (POD31 leftover)'],[2,W[1],'dolby_lower — always 0'],[3,W[2],'reset_data high: RESET_VECTOR1 bits 3–4'],[4,W[3],'reset_data low: RESET_VECTOR1 bits 0–2 · RESET_VECTOR bits 0–4'],[5,W[4],'AUDIO_INFORMATION: AES2 AES1 AES4 AES3 ×2 (each bit sent twice)'],[6,W[5],'group_data: bit7 swap2 · bit6 swap1 · bits 4–5 sel2 · bits 1–2 sel1']].map(r=>[r[0],`<span class="mono">${hex2(r[1])} · ${bin8(r[1])}</span>`,`<span class="small">${r[2]}</span>`]));
    const rn = ['ALTERA1 ch1 lock|count','ALTERA2 ch2','ALTERA3 ch3','ALTERA4 ch4','ALTERA5 (unused)','ALTERA6 align 0xA_','ALTERA7 G2 ch1','ALTERA8 ch2','ALTERA9 ch3','ALTERA10 ch4','ALTERA11','ALTERA12 align','ALTERA13 DIP echo','ALTERA14','ALTERA15','ALTERA16','ALTERA17','ALTERA18 align'];
    m.querySelector('#rd').innerHTML = `<div class="mono small" style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px 10px">${F.A.map((b,i)=>`<div title="${rn[i]}"><span class="muted">${rn[i].split(' ')[0]}</span> ${hex2(b)}${i<4||(i>=6&&i<10)?` <span class="muted">${b&0x80?'L':'-'}${b&0x7F}</span>`:''}</div>`).join('')}</div><p class="small muted">Read as three 6-byte bursts, one per data line (PC1 → ALTERA1–6, PC3 → 7–12, PC2 → 13–18), one after the other. Only ALTERA6 is checked for alignment; ALTERA12 and 18 are read but never tested. Byte meanings beyond the code comments are ${inf}.</p>`;
    m.querySelector('#btn').innerHTML = tbl(['Operator does','Firmware path','What changes'],[
      ['SW1/SW2 (GROUP SEL 1)','READ_SWITCHES → DIP BIT7/BIT6 → group_sel1','byte 6 bits 1–2 → group selector.vhd gsel1; ERROR5 → 255-pass hold'],
      ['SW4/SW5 (GROUP SEL 2)','DIP BIT4/BIT3 → group_sel2','byte 6 bits 4–5 → gsel2; ERROR2_5 → hold (v202/v203 only)'],
      ['SW3 / SW6 (SWAP)','DIP BIT5 / BIT2 → data1 BIT6 / BIT7','swap.vhd exchanges AES1↔AES2 / AES3↔AES4'],
      ['TB102 SWAP + / −','v201/v203: if DIP swap off and PINF.0 / PING.4 low','same bits; v202 ignores the pins'],
      ['Plug / unplug SDI','SDI_Carrier_Detect(PINF) → TRANSLATE_INPUT → PROCESS_CARRIER_DETECT','CD/ERROR LEDs, ALTERA10, every AUDIO lock'],
      ['Remove a group upstream','Audio1..4_Detect → PROCESS_AUDIO_INFORMATION','byte 5 bits cleared → outputs muted, AUDIO LED off'],
      ['(nothing — FPGA glitch)','ALIGNMENT_CHECK → PROCESS_ALIGNMENT_CHECK → CONFIGURE_ALTERA','PA0 → Q1 → N_CONFIG: FPGA reloads'],
    ].map(r=>[r[0],`<span class="mono small">${r[1]}</span>`,`<span class="small">${r[2]}</span>`]));
    m.querySelector('#hist').innerHTML = tbl(['Version','Date','Part','Notes'],[
      ['SD403D v1.00',Y(2001)+' Apr','PIC16F874','demux + composite out; ADV7171 over I²C'],
      ['403 v1.00',Y(2001)+' Aug','PIC16F874','GS9023 demuxers, jumpers H1–H4'],
      ['403 v1.01/a',Y(2002)+' Jul–Sep','PIC16F874',''],
      ['403 v1.02',Y(2003)+' May','PIC16F874','"held reset to null the voltage at the output of the AES termination"; ADV7171 code still in'],
      ['v200',Y(2004)+' Jun–Jul','ATmega128L + EP1C6','new iss4/iss5 board; two dated copies (July 14 / 15)'],
      ['v201',Y(2005)+' Jul 26','ATmega128L','remote swap; DIP has priority'],
      ['v202',Y(2007)+' Jan 16','ATmega128L','SD403B: 2-group demux, 6-byte write'],
      ['v203',Y(2008)+' Jan 24','ATmega128L','SD403C: remote swap back in; file still v202.c, project Sd403v202.prj'],
    ].map(r=>r.map((x,i)=>i===0?`<span class="mono">${x}</span>`:`<span class="small">${x}</span>`)));
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewFindings(m){
  window.__serialboxActive = false;
  m.innerHTML = card('What the SD403 and the Serialboxx folder are up to', `<ol>
    <li><b>Artwork 2026|59: front legends now from ${SIM.src('#SERIALBOX #SERIES/SERIALBOXX - #mf100_4/SILK/frontSScurve.cdr','frontSScurve.cdr')} (6 Feb 2003).</b> The only front-panel CorelDRAW for the frame is a curves sheet of loose parts: the WBS mark, the “Serialboxx” wordmark, a “By Ward-Beck Systems” byline on the same baseline, three .07 × .8 in slots and four small hole marks; it has no panel outline, so each part is cut out as vector and placed by the photo. The photographed MF100 differs: its byline is shorter (“By Ward-Beck”) and sits under the wordmark, and the photo shows 13 slots, not three. ${SIM.src('#SERIALBOX #SERIES/serialboxxfront.cdr','serialboxxfront.cdr')} (2001) is only a photo of the open frame in a CorelDRAW wrapper, not artwork.</li>
    <li><b>The FPGA is watched by the MCU, and reloaded on suspicion.</b> Every pass the FPGA must echo <span class="mono">0xA_</span> in <span class="mono">ALTERA6</span>. After 255 bad passes <span class="mono">PROCESS_ALIGNMENT_CHECK</span> calls <span class="mono">CONFIGURE_ALTERA()</span>: PA0 → R69 → Q1 pulls <span class="mono">N_CONFIG</span> low (netlist) and the Cyclone reloads from its EPCS. No tally reports it — CD stays green through a reload.</li>
    <li><b>Two FPGA reloads at every power-up.</b> <span class="mono">main()</span> calls <span class="mono">CONFIGURE_ALTERA()</span>, and on the first loop pass <span class="mono">switch2</span> is still 0 while the FPGA is still loading, so <span class="mono">PROCESS_ALIGNMENT_CHECK</span> reloads it again straight away.</li>
    <li><b>Both demuxers start in reset.</b> <span class="mono">previous_group_sel1/2 = 0xFF</span>, so the first <span class="mono">PROCESS_GROUP_COMPARE</span> sees a "change" and <span class="mono">TRANSLATE_RESET_VECTOR</span> holds bit 4 low for 255 passes. AUDIO tallies come on ≈0.2 s after CD.</li>
    <li><b>Copy slips in v202/v203.</b> <span class="mono">PROCESS_SAMPLE56_COMPARE</span> opens with <span class="mono">if ((RESET3 == 0) &amp;&amp; (switch2_3 == 0))</span> — group 1's flag instead of <span class="mono">RESET2_3</span>. <span class="mono">TRANSLATE_RESET_VECTOR1(ERROR2_3, ERROR2_3, ERROR2_3, ERROR2_3, …)</span> fills all four group-2 bits from one error, while <span class="mono">TRANSLATE_RESET_VECTOR</span> mixes group 1 (ERROR3/4) and group 2 (ERROR2_3/2_4). Use “AES3 count drift” on the Simulator tab.</li>
    <li><b>The CD debounce does not restart.</b> If CD drops again during the 255-pass count, <span class="mono">TRANSLATE_INPUT</span> leaves <span class="mono">release1</span> set and <span class="mono">DEBOUNCE_INPUT</span> keeps counting. Loss is reported instantly; regain needs 255 passes but not 255 <i>good</i> ones.</li>
    <li><b>“One millisecond” is about a tenth of one.</b> <span class="mono">wait_ms()</span> runs 100 <span class="mono">WDR()</span> iterations and is commented "this loop equals one ms"; at 4.9152 MHz that is ≈0.12 ms, so the 10 ms N_CONFIG pulse is ≈1.2 ms (${inf}; still far above the Cyclone minimum).</li>
    <li><b>POD31 inside the SD403B.</b> The SD403B FPGA project is <span class="mono">pod31.qpf/qsf</span> (top-level entity <span class="mono">pod31</span>) with Dolby/HD blocks (<span class="mono">PDF_DETECTOR</span>, <span class="mono">non_audio_detector</span>, <span class="mono">group_detectorHD</span>, <span class="mono">CAT552_switch</span>). Its qsf assigns pins 159–227 on a 144-pin EP1C6T144 and puts ALTERA10 on pin 136 where the iss5 board has it on 139. v202 still writes <span class="mono">dolby_upper/dolby_lower</span> (always 0) and declares <span class="mono">pod31_mode</span>, <span class="mono">auto_swap</span>, <span class="mono">dolby_off_110</span>.</li>
    <li><b>RS-485 fitted, never used.</b> The netlist has two LTC1480s on UART0 (EXT2±, INT1±) and a 4-bit <span class="mono">FRAME_A0–A3</span> slot address. Every UART call in <span class="mono">main()</span> is commented out. <span class="mono">port_init</span> also makes PG0 (= FRAME_A0) an output driven low (<span class="mono">DDRG = 0x01, PORTG = 0x1E</span>) ${inf}: the address pin would be fought.</li>
    <li><b>The MCU reads three serial lines one at a time.</b> <span class="mono">ALTERA_read</span> clocks PC1, then PC3, then PC2 in separate loops with separate strobes — 144 clocks where 48 would do. It is most of the loop time (${inf}).</li>
    <li><b>Each mute bit is sent twice.</b> <span class="mono">PROCESS_AUDIO_INFORMATION</span> clears bits 7 and 3 for AES2, 6 and 2 for AES1, and so on.</li>
    <li><b>v201 drives the reset vector onto the link pins.</b> <span class="mono">PORTC = PROCESS_RESET_VECTOR(PORTC, RESET_MASK)</span> writes ERROR3/ERROR4 into PC0–PC3, which are the serial data-out and data-in lines (“formerly B3, now C3”). v202 moved the reset vector into the serial write.</li>
    <li><b>Paperwork disagrees.</b> The ${Y(2008)} manual calls the switches SW1–SW6; <span class="mono">JUMPER_SETTINGS_SD403.cdr</span> shows Berg jumpers H1–H6 (the PIC-era board: <span class="mono">readgroupjumpers</span> reads H1–H4 on RB0, RB1, RB2, RB4), and draws H4 in the "1" position, which would make GROUP SEL 2 default to group 3 where the manual says group 1. The manual also never mentions the SD403D.</li>
    <li><b>Parts changed between netlist and drawing.</b> SD403iss5.net: LTC1480, EPCS1, EL2280C. The ${Y(2006)} assembly drawing of the same issue 5: ADM3485EAR, M25P40, EL5263IS. sd403iss1.qsf names EPCS1, pod31.qsf EPCS4.</li>
    <li><b>Duplicates and strays.</b> <span class="mono">PIC VERSIONS/v200/v200.c</span> is AVR C, not PIC code. <span class="mono">403v10x.asm</span> sits identical in <span class="mono">test/</span> and <span class="mono">WORKING/</span>. <span class="mono">SD403A-assy - #Assembly.pdf</span> and <span class="mono">PCB/SD403A-assy.pdf</span> are byte-identical. A different <span class="mono">SD403iss5.sch</span> sits in <span class="mono">AMS4 - #Master/…/AMS4E/PCB/</span>. The <span class="mono">aa103/PCB</span> folder holds the M8203 oscillator board (see the m8203 plugin).</li>
    <li><b>The frame paperwork changed its mind on reference.</b> MF100.pdf (Jan ${Y(2003)}) promises separate AES and video reference BNCs; MF100man.wpd describes one MF100REF BNC for "AES or video black"; the ${Y(2008)} rear photo shows one "REFERENCE INPUT". The SD403 netlist has no reference net at all.</li>
    <li><b>The SD405 is not a de-embedder</b> despite the folder README (see the sd405-iss1 plugin), and RD38 (${Y(2011)}) maps the SD403B and the SD403C + TB102 to the openGear M6202A, but lists no openGear card for the SD403A with its analog outputs.</li>
  </ol>`) + card('Every card in the folder', tbl(['Card','What it is','Controller / code','Tallies','Source'], CARD_IDS.map(id=>{ const c=CARDS[id]; return [`<b>${id}</b>${c.full?' <span class="chip">full model</span>':''}`, `<span class="small">${c.fn}</span>`, `<span class="mono small">${c.ctl}</span>`, `<span class="small">${c.tal.join(', ')||'—'}</span>`, `<span class="mono small">${c.src}</span>`]; })) + `<p class="small muted">Also in the folder: MF100 frame (and MF104 4-card frame, mf100_4), M8245A supply (Filtran drawing and schematic), MF100REF, TB101/TB102/TB103 terminations, SERIALBOXX-Functionals (CorelDRAW diagrams for every card), pick-and-place files for DA301A/DA303/DA304/DA305/SD402–SD406.</p>`)
  + card('Assumptions in this simulation', `<ul class="small">
    <li>Main-loop pass ≈ ${(C.LOOP_T*1e3).toFixed(3)} ms (${inf}): 4 000 cycles at 4.9152 MHz, estimated from the bit-bang loops. Every debounce time scales with it.</li>
    <li>FPGA configuration time ${C.CFG_T*1000} ms after N_CONFIG; the meaning of the reset-vector bits (0 = hold that FIFO, bit 4 = hold the demux); sample-count bytes; lock bits held low while the demux is held (${inf}).</li>
    <li>The SD403C rear is drawn like the SD403A (TB102 over BNC 1 and 3) ${inf}. Loss of lock beyond ≈300 m of cable ${inf} (manual: 250 m guaranteed).</li>
    <li>Other cards' tallies simply follow their input; per-card current for cards without a figure uses the SD403's (${inf}).</li>
    <li>The SDI test source carries tones at −20 dBFS; SMPTE 272M DIDs and packet layout are general knowledge.</li></ul>`)
  + card('Sources', `<ul class="small mono">
    <li>#SERIALBOX #SERIES/SERIALBOXX - #SD400/SD403/Software/SD403B/v202/v202.c · SD403C/v203/v202.c · v201/v201.C · PIC VERSIONS/403v102/403v102.asm · SD403Dv100/sd403Dv0.asm</li>
    <li>…/SD403/PCB/SD403iss5.net · SD403iss5 PCB revisions.doc · SD403A-assy - #Assembly.pdf · PCB/Altera/v102/Altera/sd403iss1.qsf · PCB/Altera/SD403B/v100/pod31.qsf, swap.vhd, group selector.vhd</li>
    <li>…/SD403/SD403MANiss5v1.pdf · SD403MAN.PDF · Functionals/SD403A_FUNCTION.cdr, SD403B_FUNCTION.cdr, JUMPER_SETTINGS_SD403.cdr</li>
    <li>#SERIALBOX #SERIES/SERIALBOXX - #mf100/MF100man.wpd, MF100.pdf, m8245aspecs.wpd, MF100TERM.cdr · Serialboxx.wpd · MF100 Front.jpg · MF100 Rear w REF.jpg · serialboxxfront.cdr · SERIALBOXX - #mf100_4/SILK/frontSScurve.cdr</li>
    <li>Card manuals: sd401, SD402, SD404, SD405, sd406, SD410, DA301–DA305, AV201–AV203, AA101, AA103 (.wpd)</li></ul>`);
}

/* =====================================================================
   10. REGISTER
   ===================================================================== */
SIM.register({
  footnotes: [{"text": "The only front-panel CorelDRAW for the frame is a sheet of loose parts with no panel outline: the WBS mark, the “Serialboxx” wordmark and a byline.", "src": "#SERIALBOX #SERIES/SERIALBOXX - #mf100_4/SILK/frontSScurve.cdr"}, {"text": "On the sheet the byline reads “By Ward-Beck Systems” on the wordmark’s baseline; on the photographed MF100 it is “By Ward-Beck”, under the wordmark.", "src": "#SERIALBOX #SERIES/MF100 Front.jpg"}, {"text": "The art sheet draws three .07 × .8 in slots; the photographed frame has 13.", "src": "#SERIALBOX #SERIES/SERIALBOXX - #mf100_4/SILK/frontSScurve.cdr"}, {"text": "serialboxxfront.cdr (2001) is only a photo of the open frame wrapped in a CorelDRAW file, not artwork.", "src": "#SERIALBOX #SERIES/serialboxxfront.cdr"}, {"text": "The mf100_4 SILK folder keeps three versions (frontSS, frontSScurve, frontSSsamples) plus Backup_of_ copies of frontSS and frontSScurve.", "src": "#SERIALBOX #SERIES/SERIALBOXX - #mf100_4/SILK/frontSScurve.cdr"}],
  id:'serialbox', name:'Serialboxx · MF100 frame and SD403 SDI audio demuxer (2001|34)', duration:1,
  product:'Serialboxx series', year:2001, family:'Obsolete products', folder:'#SERIALBOX #SERIES',
  summary:'The Serialboxx card frame (MF100, two M8245A supplies, BNC and TB terminations) with the SD403A/B/C SDI audio demultiplexer run pass by pass from its ATmega128 firmware: CD debounce, group select, pair swap, remote swap and the self-healing FPGA link. Every other Serialboxx card is on a slot selector.',
  highlights:['Front, rear and card-edge views with live tallies','SD403 issue 5 board from the real assembly drawing, DIP switch clickable','Firmware v201/v202/v203 run with its real debounce counters','FPGA reloaded by the MCU when the 0xA0 echo is lost','Copy slips in the group-2 error code','All 28 Serialboxx cards catalogued'],
  depth:'Full model',
  stepUnits:[
    {label:'1 MCU loop pass', period:()=>C.LOOP_T},
    {label:'1 SDI line', period:()=>C.LINE},
    {label:'1 field', period:()=>C.FIELD},
    {label:'1 AES frame', period:()=>1/C.FS},
    {label:'255 passes (debounce)', period:()=>255*C.LOOP_T},
    {label:'10 ms', period:()=>0.01},
  ],
  zooms:[[1,'1 s (whole)'],[0.25,'250 ms (debounce)'],[0.1,'100 ms'],[1001/60000,'1 field'],[0.004,'4 ms (5 passes)'],[0.001,'1 ms (1 pass)'],[0.0002,'200 µs (3 lines)'],[1/48000*3,'3 AES frames']],
  defaultZoom:0,
  init(){ SIMKEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: SD403 in an MF100', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics (redrawn)', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
