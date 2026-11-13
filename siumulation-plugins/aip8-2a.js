/* =====================================================================
   AIP8-2A — Audio Ingest Processor, 2 RU aural / visual monitor for stereo (ST) + described-video (DV)
   AES pairs (Ward-Beck Systems, built for CTV, PFV 1.0.0.2, 2009|42)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all under "AIP8-2A - #Master #Obsolete /"):
   - AIP8-2A - #Software/…#Atmel/v102/v100w.c  (front panel, "AIP8-2A Front Panel Software, February 14, 2007"):
       main(), initialization(), port_init(), uart0_init(), uart0_rx_isr, TRANSLATE_ENCODER1/2/3, DV_ENCODER_UPDATE,
       ST_ENCODER_UPDATE, VOLUME_ENCODER_UPDATE, TRANSLATE_SWITCHES, TRANSLATE_PUSHBUTTONS, UPDATE_DISPLAY,
       ACTIVITY_MONITOR, COMMUNICATION_MONITOR, PROCESS_ST/DV/VOLUME_INFORMATION, PROCESS_SETUP_SOURCES,
       UART0_setup / UART0_transmit_counter / UART0_translate, RECALL_ST_OR_DV_FROM_EEPROM
     common.c (PROCESS_SHAFT_ENCODERx state tables, DEBOUNCE_*, SAVE_DATA, watchdog_init), SIEMENS8-3.c (display bus), V100.SRC
   - …#Atmel/Ams8e-1/v102/v200w.c ("Ams8E-1 V2.01 for Issue 2 PCB (AIP8-2A)", main board): UART0_translate (C/H/E/F/G/P/V
       and T/D parsing), ALTERA_SORT (80-byte register image), UART1 DEMUX-3 select bytes, UART0_transmit_counter, main loop
   - …#sharc/V102/ams81_main.asm (sport0_isr ST/DV routing, phase, "april 2,2009" mono changes, mon12…mon78, shifter,
       gain ramp), vumeter.asm, phasemeter.asm, ams81_INIT.ASM (timers), ams81_volume_table.dat, sdm_phase_data.dat,
       ams82_vu_data1/2.dat
   - …#Altera/v100/AMS81.qpf / AMS81.qsf / AMS81.bdf (EP1C6Q240C7, cntrl[] bit comments), tdm_data_mux.vhd
   - AIP8-2A - #PCB/AIP8-2A-1.net/.bom (display + button board) and AIP8-2A-2.net/.bom (front controller board)
   - AIP8-2A - #Manual/AIP8 2A Manual udated.doc (2015), #Software/AIP8 COMMUNICATION PROTOCOL.doc, aip8 operational info.doc
   - AIP8-2A - #SILK/AIP8-2A-FRONTSILK-ISS3-curve.cdr (Inkscape plain SVG → GREEN + WHITE plates cut between the crop
     marks and registered → assets/aip8-2a-front.svg, vector, 200 units per inch; Artwork 2026|59, replaces the old PNGs)
   - AIP8-2A-FRONT VIEW.pdf (Feb 21 2007: meter window, grilles, button colours, display examples)
   - SOFTWARE LISTINGS - #Engineering.xls (AIP8-2A sheet: PFV 1.0.0.0 … 1.0.0.2)
   - AMS8 #Engineering #TIM/MECHANICAL/AMS8-M11.pdf (modified encoder "FOR AIP8-2A ONLY")
   Sister plugins: ams82.js (same SHARC meter code and LED tables, same 2 RU chassis) and ams81.js.
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
/* Artwork 2026|59: preload the CorelDRAW SVGs once, so panels that are re-rendered every frame never show them half-loaded */
const ART_PRELOAD = ["aip8-2a-front.svg"].map(n=>{ const i=new Image(); i.src=ASSET+n; return i; });
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const KEYFLAG = '__aip82aActive';

/* ---------------- constants from the source ---------------- */
const C = {
  F_AVR: 4915200,            // X2 = 4.9152 MHz (AIP8-2A-2.bom); UBRR0L = 0x1F → 9600 Bd
  LOOP_T: 5/9000,            // front loop pass — INFERRED: manual "press and hold the SDI button for approximately 5 seconds" = PRESET_DEBOUNCE 9000 passes
  PRESET_DEBOUNCE: 9000, NO_ACTIVITY: 8000, COMM_THRESH: 1000, PB_DEBOUNCE: 255, SW_DEBOUNCE: 255,
  TX_COUNTER: 25,            // Transmit_Counter 25 → one byte every 26 passes (200/100/50 commented out)
  BYTE_T: 10/9600,
  MB_PASS: 0.004,            // main-board (AMS8E-1) loop pass — INFERRED (same estimate as ams81.js: 80-byte register chain each pass)
  MB_TX_EVERY: 3,            // main board Transmit_Counter = 2 → one reply byte every 3 passes
  FS: 48000,
  CORE: 49.152e6,            // SHARC core clock — INFERRED (TPERIOD0 = 4 → 12.288 MHz MCLK = 256 fs), as in ams82.js
  TPERIOD1: 76800,           // ams81_INIT.ASM: timer 1 "mux rate" = 153600/2
  TC_VU: 0.000319752, TC_PPMA: 0.02276277, TC_PPMD: 0.000031978,   // vumeter.asm (identical file to AMS8-2 V205)
  RAMP_TC: 0.019999,         // ams81_main.asm gain ramp per background pass
  PH_ALPHA: 0.999,           // phasemeter.asm PHMETER_ALPHA
  EE_WRITE: 0.0085,          // ATmega128 EEPROM write ≈ 8.5 ms — INFERRED from the datasheet; SAVE_DATA busy-waits on EEPROMwrite()
};
C.MUX_T = C.TPERIOD1 / C.CORE;     // 1.5625 ms per meter strobe (inferred clock)
C.SCAN_T = 8 * C.MUX_T;
C.ISR_T = 9e-6;                    // sport0_isr length — INFERRED (≈ 440 cycles: 10-slot convert loop, VU, phase, routing, translate_meter_results)

/* LED bar tables (ams82_vu_data1/2.dat — byte-identical in this folder and in AMS8-2 V205; decoded in ams82.js) */
const LIT = '^]]\\\\[[ZZYYXXWWVVUUTTSSRRQQPPOONNMMLLKKJJIIHHGGFFEEDDCCBBAA@@??>>==<<;;::999988888877666655444433332222222222222211110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
const litOf = idx => LIT.charCodeAt(Math.max(0, Math.min(255, idx|0))) - 48;
function segColour(s){ return s>=36? '#ff3b2e' : s>=24? '#ffc21a' : '#5cff3a'; }    // colour split as ams82.js (inferred there from the AMS8-2A BOM)
/* sdm_phase_data.dat: phase index 0…255 → number of the 15 phase LEDs lit (groups taken from the 257-line table) */
const PH_GROUPS = [[0,15],[15,14],[34,12],[51,11],[70,10],[87,9],[106,8],[123,7],[146,6],[185,5],[203,4],[218,2],[236,1]];
function phaseLeds(idx){ let n=15; PH_GROUPS.forEach(([a,k])=>{ if (idx>=a) n=k; }); return n; }

/* firmware enumerations (v100w.c) */
const SCR = {INFO:0, VOLUME:10, SETUP:101};
const SCR_NAME = {0:'INFORMATION_SCREEN', 10:'VOLUME_SCREEN', 101:'SETUP_SCREEN'};
const SETUP_NAME = {200:'EXIT_SETUP_SCREEN', 201:'ST_SCREEN', 202:'DV_SCREEN', 203:'GROUP_SCREEN'};
const SRC = {AES75:1, SDI12:4, SDI34:5};
const SRC_NAME = {1:'AES75', 4:'SDI12', 5:'SDI34'};
const ST_NAME = {0:'ST_RIGHT', 1:'ST', 2:'ST_LEFT'};
const DV_NAME = {0:'DV (L/R → mono)', 1:'ST (ST mono)', 2:'DV_LEFT', 3:'DV_RIGHT'};
const SEL_NAME = {2:'LEFT_AND_RIGHT', 3:'LEFT_PLUS_RIGHT (phase)', 255:'LEFT_AND_RIGHT_OFF'};
const SDI_1 = 12;
/* the eight lighted KSD buttons: PINB bit, PORTA lamp bit, silk label (AIP8-2A-1/-2 nets: H1-2…9 → PB7…PB0, H1-11…18 → PA0…PA7) */
const BTN = {
  phase:{pin:0x80, lamp:0x01, label:'Phase', grp:'SOURCE', col:'red',    pb:'PB5'},
  b:    {pin:0x40, lamp:0x02, label:'B',     grp:'SOURCE', col:'yellow', pb:'PB1'},
  aes:  {pin:0x20, lamp:0x04, label:'AES',   grp:'SOURCE', col:'yellow', pb:'PB2'},
  sdi:  {pin:0x10, lamp:0x08, label:'SDI',   grp:'SOURCE', col:'yellow', pb:'PB6'},
  inst: {pin:0x08, lamp:0x10, label:'ST',    grp:'IN',  col:'black', pb:'PB3', num:1},
  indv: {pin:0x04, lamp:0x20, label:'DV',    grp:'IN',  col:'black', pb:'PB7', num:2},
  outst:{pin:0x02, lamp:0x40, label:'ST',    grp:'OUT', col:'black', pb:'PB4', num:3},
  outdv:{pin:0x01, lamp:0x80, label:'DV',    grp:'OUT', col:'black', pb:'PB8', num:4},
};
const BTN_KEYS = ['phase','b','aes','sdi','inst','indv','outst','outdv'];
const MON_NAME = {1:'IN ST (meters 1/2)', 2:'IN DV (meters 3/4)', 3:'OUT ST (meters 5/6)', 4:'OUT DV (meters 7/8)'};
const METER_NAME = ['ST IN L','ST IN R','DV IN L','DV IN R','ST OUT L','ST OUT R','DV OUT L','DV OUT R'];

/* ---------------- what is plugged in (test material is INFERRED, not from the archive) ---------------- */
const CONTENT = {
  prog:  {name:'Stereo programme (−18 dBFS)'},
  dvmix: {name:'DV mix: programme + narration'},
  narr:  {name:'Narration only (mono speech)'},
  tone:  {name:'1 kHz tone −20 dBFS, L = R'},
  lid:   {name:'Left ident: 1 kHz on L only'},
  anti:  {name:'Tone with R polarity reversed'},
  off:   {name:'Nothing (silence)'},
};
const CONTENT_KEYS = Object.keys(CONTENT);

/* ---------------- device state ---------------- */
let D = null, M = null, MKEY = '';
function frontFactory(){
  return { screen:SCR.INFO, screen_display:SCR.INFO, setup:201, st_screen:false, dv_screen:false,
    mute:false, volume:30, mute_level:30, st_level:61, dv_level:61, st:1, dv_or_st:0,
    st_number:SDI_1, dv_number:SDI_1+1, gp_number:1, source:SRC.AES75,
    input:0, input_number:1, preset:'A', preset_selector:255,
    pst:1, pdv_or_st:0, pst_level:61, pdv_level:61, pst_number:SDI_1, pdv_number:SDI_1+1 };
}
function fresh(){
  const f = frontFactory();
  return Object.assign(f, {
    power:true, booted:false,
    ee:{ key:0xFF },                         // front-panel EEPROM (KEY_DV_OR_ST_ADDRESS not yet 0xAA = never written)
    mb:{ sdi_ST:0, sdi_DV:1, ee:{sdi_ST:0, sdi_DV:1} },   // main board's own copy (psdi_DV = 1, sdi_DV = 1 at reset)
    aes:['prog','dvmix'],                    // rear 75 Ω IN 1 (ST) and IN 2 (DV)
    sdi:['prog','dvmix','tone','narr','lid','anti','off','off'],  // embedded AES 1…8 on the SDI input
    demux:true, sdiPresent:true,
    log:[], events:[], eeWrites:[], dispWrites:[], comm:{kind:0, at:-1, end:-1},
    knob:{st:0, dv:0, vol:0}, enc:{st:28, dv:28, vol:28},
    held:null, meterCh:0, setupVisitedExit:false, lessonFlags:{},
  });
}
D = fresh();
bootFront(true);

/* ---------------- helpers on the firmware state ---------------- */
const pad8 = s => { s=String(s).slice(0,8); while(s.length<8) s+=' '; return s; };
function gainTxt(tag, lvl){      // PROCESS_ST_INFORMATION / PROCESS_DV_INFORMATION → " ST+15dB", " ST -9dB", " ST  0dB"
  const d = lvl-61, a = Math.abs(d);
  if (lvl===0) return ' OFF'+'  dB';
  let s3, s4, s5;
  if (a>=10){ s3 = d<0?'-':'+'; s4 = String(Math.floor(a/10)); s5 = String(a%10); }
  else if (d===0){ s3=' '; s4=' '; s5='0'; }
  else { s3=' '; s4 = d<0?'-':'+'; s5 = String(a); }
  return ' '+tag+s3+s4+s5+'dB';
}
function volTxt(v){ if (v===0) return '  OFF   '; const d=v-61, a=Math.abs(d); return '  '+(d<0?'-':d>0?'+':' ')+(a<10?' '+a:String(a))+' dB'; }
const stTxt = () => gainTxt('ST', D.st_level);
const dvTxt = () => gainTxt('DV', D.dv_level);
function displays(){             // UPDATE_DISPLAY → [display1 (U1, CS1, left), display2 (U2, CS2, right)]
  if (!D.power) return ['        ','        '];
  if (!D.booted) return ['  AIP8  ',' 1.0.0.2'];                          // op_line2 + VersionDis (REVISION1..4)
  if (D.screen_display===SCR.VOLUME) return [' Volume ', D.mute? '  Mute  ' : volTxt(D.volume)];
  if (D.screen===SCR.SETUP){
    if (D.setup===201) return ['SD Setup', ' ST AES'+(D.st_number-11)];
    if (D.setup===202) return ['SD Setup', ' DV AES'+(D.dv_number-11)];
    if (D.setup===203) return ['SD Setup', ' GROUP'+(D.gp_number===1?'12':'34')];
    return ['SD Setup', '  Exit  '];
  }
  if (D.dv_screen) return [stTxt(), {0:' DV Mono',1:' DV StIn',2:' DV Left',3:' DV Rght'}[D.dv_or_st]];
  if (D.st_screen) return [{0:' ST Rght',1:' ST L/R ',2:' ST Left'}[D.st], dvTxt()];
  return [stTxt(), D.dv_or_st===1? ' ST Mono' : dvTxt()];
}
function act(name, fn){
  if (!D.power && !/Power|Rear|SDI board|defaults/.test(name)) return;
  const lines = []; const tr = s => lines.push(s);
  fn(tr);
  const e = {name, t:SIM.t, trace:lines, disp:displays()};
  D.log.unshift(e); if (D.log.length>40) D.log.pop();
  D.events.push({t:SIM.t, name}); if (D.events.length>60) D.events.shift();
  MKEY=''; TXKEY='';
  SIM.refresh();
}
function comm(kind){ D.comm = {kind, at:SIM.t, end: kind===5? 99 : SIM.t + C.COMM_THRESH*C.LOOP_T}; }
function dispWrite(){ D.dispWrites.push(SIM.t); if (D.dispWrites.length>40) D.dispWrites.shift(); }
const EE_ORDER = ['SOURCE_ADDRESS','DV_OR_ST_ADDRESS','DV_ADDRESS','ST_ADDRESS','DV_GAIN_ADDRESS','ST_GAIN_ADDRESS','KEY_DV_OR_ST_ADDRESS','ST_SETUP_ADDRESS'];
const EE_ADDR = {KEY_DV_OR_ST_ADDRESS:100, DV_ADDRESS:99, ST_ADDRESS:98, DV_OR_ST_ADDRESS:97, ST_GAIN_ADDRESS:96, DV_GAIN_ADDRESS:95, ST_SETUP_ADDRESS:94, SOURCE_ADDRESS:221};
function saveBlock(tr, why){      // the eight SAVE_DATA(…) + WDR() lines that every save site repeats
  Object.assign(D.ee, {key:0xAA, source:D.source, dv_or_st:D.dv_or_st, dv_number:D.dv_number, st_number:D.st_number, dv_level:D.dv_level, st_level:D.st_level, st:D.st});
  D.eeWrites.push(SIM.t); if (D.eeWrites.length>30) D.eeWrites.shift();
  tr(`${why}: SAVE_DATA × 8 (${EE_ORDER.map(k=>k.replace('_ADDRESS','')+'@'+EE_ADDR[k]).join(', ')}). Each busy-waits in EEPROMwrite() with WDR(): ≈ ${(8*C.EE_WRITE*1e3).toFixed(0)} ms during which the main loop does not run (${inf}, datasheet write time).`);
}
function bootFront(cold){
  const f = frontFactory();
  const keep = D.ee;
  Object.assign(D, f);
  // RECALL_ST_OR_DV_FROM_EEPROM: only if KEY_DV_OR_ST_ADDRESS holds 0xAA
  if (keep && keep.key===0xAA){ D.st_number=keep.st_number; D.dv_number=keep.dv_number; D.dv_or_st=keep.dv_or_st; D.st_level=keep.st_level; D.dv_level=keep.dv_level; D.source=keep.source; D.st=keep.st; }
  // main(): pushbuttons |= (BIT5|BIT3) for AES75 else (BIT4|BIT3); TRANSLATE_PUSHBUTTONS(pushbuttons)
  D.input = 0; D.preset_selector = 2;
  if (D.source===SRC.AES75){ D.input |= 0x04; } else { D.input |= 0x08; D.source = D.gp_number===1? SRC.SDI12 : SRC.SDI34; }
  D.input |= 0x10; D.input_number = 1; D.preset = 'A';
  D.booted = !cold ? false : true;
  D.mb.sdi_ST = D.mb.ee.sdi_ST; D.mb.sdi_DV = D.mb.ee.sdi_DV;      // main board: sdi_ST = EEPROMread(ST_ADDRESS) …
}

/* ---------------- actions: each logs the real code path ---------------- */
const ENC_NEXT = [0,20,8,0, 0,4,4,28, 16,8,8,12, 12,4,24,12, 16,20,8,16, 0,20,20,28, 16,24,24,12, 28,4,24,28];
const ENC = { dv:{n:1, fn:'DV_ENCODER_UPDATE', pins:'PINF bits 1:0 (PF1 = ENCODER1A, PF0 = ENCODER1B)', sw:'PINE bit 2 (PE2 = SWITCH1)', part:'E1'},
              vol:{n:2, fn:'VOLUME_ENCODER_UPDATE', pins:'PIND bits 1:0 (PD0 = ENCODER2A, PD1 = ENCODER2B)', sw:'PINE bit 3 (PE3 = SWITCH2)', part:'E2'},
              st:{n:3, fn:'ST_ENCODER_UPDATE', pins:'PIND bits 4:3 (PD3 = ENCODER3A, PD4 = ENCODER3B)', sw:'PIND bit 2 (PD2 = SWITCH3)', part:'E3'} };
function encDetent(k, dir){       // walk PROCESS_SHAFT_ENCODERx through one detent; returns the trace of states
  const seq = dir>0? [1,0,2,3] : [2,0,1,3]; let s = D.enc[k]; const path=[s]; let action=0;
  seq.forEach(sh=>{ const i=s+sh; const ns = i<31? ENC_NEXT[i] : 28; if (i===2) action=1; if (i===17) action=2; s=ns; path.push(s); });
  D.enc[k]=s; return {path, action};
}
const A = {
  power(){ act(D.power?'Power off':'Power on', tr=>{
    if (D.power){ D.power=false; tr('Mains off. RAM is lost; the ATmega128 EEPROM keeps the last SAVE_DATA values, and the main board keeps its own sdi_ST / sdi_DV.'); return; }
    D.power=true; bootFront(false);
    tr('initialization(): CLI, port_init() (DDRA = 0xFF lamps, DDRB = 0x00 buttons, DDRC = 0xFF display data), watchdog_init() (WDTCR = 0x08 ≈ 14 ms), uart0_init() (UBRR0L = 0x1F → 9600 Bd, UCSR0B = 0x98: RX interrupt), SEI, SIEMENS8_lcd_initialization().');
    tr('SIEMENS8_lcd_display1(op_line2) = "  AIP8  ", SIEMENS8_lcd_display2(VersionDis) = " 1.0.0.2"; wait_ms(1500) twice.');
    tr(`RECALL_MODE_FROM_EEPROM, RECALL_ASSIGN_FROM_EEPROM, DATA_initialization, RECALL_ST_OR_DV_FROM_EEPROM: ${D.ee.key===0xAA? `KEY = 0xAA → st_number = SDI_${D.st_number-11}, dv_number = SDI_${D.dv_number-11}, st_level ${D.st_level}, dv_level ${D.dv_level}, dv_or_st ${D.dv_or_st}, st ${D.st}` : 'KEY ≠ 0xAA → defaults (SDI_1 / SDI_2, 0 dB, DV, ST)'}.`);
    tr(`pushbuttons = ${D.source===SRC.AES75?'BIT5|BIT3 (AES + IN ST)':'BIT4|BIT3 (SDI + IN ST)'} → TRANSLATE_PUSHBUTTONS → PORTA = 0x${D.input.toString(16).padStart(2,'0')}.`);
    tr(`Main board (Ams8E-1 v2.01) reads its own EEPROM: sdi_ST = ${D.mb.sdi_ST}, sdi_DV = ${D.mb.sdi_DV}. Its PhaseOn starts as BIT3 (on) until the first “G” byte arrives.`);
    tr('Press “Skip boot” (or any control) to end the 3 s splash.');
  }); },
  skipBoot(){ if (!D.booted){ D.booted=true; dispWrite(); act('Boot splash ends', tr=>tr('After the two wait_ms(1500): SIEMENS8_lcd_display1(st_information), SIEMENS8_lcd_display2(dv_information); while(1) starts.')); } },
  reset(){ D = fresh(); bootFront(true); MKEY=''; TXKEY=''; SIM.refresh(); },
  button(k){ if (!D.booted) A.skipBoot(); const b=BTN[k]; act('Press '+b.grp+' '+b.label, tr=>{
    tr(`${b.pb} on AIP8-2A-1 pulls its line low → H3/H1 → ATmega128 PINB bit ${Math.log2(b.pin)} (pulled up by R38 1 kΩ SIP). PROCESS_PUSHBUTTONS: READ_SWITCHES(PINB) = INVERT_DATA → 0x${b.pin.toString(16).padStart(2,'0')}.`);
    tr('TRANSLATE_SWITCHES: pb = YES, input_refresh = YES (DEBOUNCE_PUSHBUTTONS then waits 255 passes after release).');
    pressBits(b.pin, tr);
  }); },
  holdSdi(){ if (!D.booted) A.skipBoot(); act('Hold SDI ≈ 5 s', tr=>{
    tr('First pass: the SDI bit acts like a normal press (see below). While BIT4 stays set, TRANSLATE_SWITCHES counts preset_counter up to PRESET_DEBOUNCE = 9000 passes.');
    pressBits(0x10, tr);
    D.screen = SCR.SETUP; D.screen_display = SCR.SETUP; D.setup = 201; D.st_screen=false; D.dv_screen=false;
    comm(5);
    tr(`preset_counter reaches 9000 (≈ ${(9000*C.LOOP_T).toFixed(1)} s, ${inf} loop time): screen = SETUP_SCREEN, communication_mode = SETUP_SCREEN, setup = ST_SCREEN (the “setup = GROUP_SCREEN” line is commented out).`);
    tr(`UPDATE_DISPLAY → PROCESS_SETUP_SOURCES: display1 "SD Setup", display2 " ST AES${D.st_number-11}".`);
    tr(`UART0_setup picks SETUP_COM: frames “# T ${D.st_number-12} D ${D.dv_number-12} $” replace the GENERAL frame while SD Setup is open. The main board stores them at once (sdi_ST/sdi_DV → its EEPROM).`);
    D.mb.sdi_ST = D.st_number-12; D.mb.sdi_DV = D.dv_number-12; D.mb.ee.sdi_ST=D.mb.sdi_ST; D.mb.ee.sdi_DV=D.mb.sdi_DV;
    if (!D.demux) tr('No DEMUX-3 fitted: the main board answers SDI_BOARD_AVAILABLE polls with nothing, so the SDI pairs stay silent.');
    dispWrite();
  }); },
  turn(k, dir){ if (!D.booted) A.skipBoot(); const e=ENC[k]; act(`Turn ${k==='vol'?'VOLUME':k.toUpperCase()} ${dir>0?'clockwise':'counter-clockwise'}`, tr=>{
    D.knob[k] += dir*15;
    const r = encDetent(k, dir);
    tr(`${e.part} quadrature on ${e.pins}: SHAFT_ENCODER${e.n} → TRANSLATE_SHAFT_ENCODER${e.n} → PROCESS_SHAFT_ENCODER${e.n}: encoder_state${e.n} ${r.path.join(' → ')} → encoder_action${e.n} = ${r.action} (${r.action===1?'UP':'DOWN'}).`);
    turnEffect(k, r.action===1?1:-1, tr);
    tr(`encoder_action${e.n} = 0. refresh = YES → UPDATE_DISPLAY writes both PDSP1884s: “${displays()[0]}” “${displays()[1]}”.`);
    dispWrite();
  }); },
  press(k){ if (!D.booted) A.skipBoot(); const e=ENC[k]; act(`Push ${k==='vol'?'VOLUME':k.toUpperCase()} knob`, tr=>{
    tr(`${e.part} push switch on ${e.sw} → SWITCH_ENCODER${e.n} → TRANSLATE_ENCODER${e.n} (switch${e.n} = 1; DEBOUNCE_ENCODER${e.n} clears it 255 passes after release).`);
    pressEffect(k, tr);
    dispWrite();
  }); },
  wait(){ act('Leave the panel alone (8000 passes)', tr=>{
    tr(`ACTIVITY_MONITOR counts activity_counter to NO_ACTIVITY_THRESHOLD = 8000 passes (≈ ${(8000*C.LOOP_T).toFixed(2)} s, ${inf}).`);
    if (D.screen===SCR.SETUP){
      tr('screen_display == SETUP_SCREEN: back to INFORMATION_SCREEN, communication_mode = INFORMATION_SCREEN.');
      if (D.dv_number!==D.pdv_number || D.st_number!==D.pst_number){ saveBlock(tr,'dv_number/st_number changed'); D.pdv_number=D.dv_number; D.pst_number=D.st_number; }
      else tr('Assignments unchanged: no EEPROM write.');
      D.screen=SCR.INFO; D.screen_display=SCR.INFO; comm(0);
    } else if (D.screen_display===SCR.VOLUME){ tr('VOLUME_SCREEN → INFORMATION_SCREEN.'); D.screen_display=SCR.INFO; D.screen=SCR.INFO; }
    else if (D.dv_screen){ tr('dv_screen == YES → dv_screen = NO.'); if (D.dv_or_st!==D.pdv_or_st){ saveBlock(tr,'dv_or_st changed'); D.pdv_or_st=D.dv_or_st; } D.dv_screen=false; }
    else if (D.st_screen){ tr('st_screen == YES → st_screen = NO.'); if (D.st!==D.pst){ saveBlock(tr,'st changed'); D.pst=D.st; } D.st_screen=false; }
    else tr('Already on the normal screen: nothing to time out.');
    dispWrite();
  }); },
  setContent(where, idx, key){ act('Rear: '+(where==='aes'?(idx?'IN 2 (DV)':'IN 1 (ST)'):'SDI embedded AES '+(idx+1))+' = '+CONTENT[key].name, tr=>{
    D[where][idx]=key; tr('Test signal changed (simulation only). The CS8416 (AES) or the DEMUX-3 (SDI) feeds the FPGA; the SHARC sees it on the next 48 kHz frame.');
  }); },
  demuxBoard(on){ act(on?'SDI board (DEMUX-3) fitted':'SDI board removed', tr=>{ D.demux=on;
    tr(on? 'UART1 (main board ↔ DEMUX-3): sdi_data_out1 = 0xF0 | group(ST), sdi_data_out2 = 0x70 | group(DV).' : 'UART1: after 10 unanswered polls sdi_check = 1, sdi_available = NO; sdi_data_out1 = 0xE0 | SDI_BOARD_AVAILABLE.'); }); },
};
function pressBits(data, tr){
  if (D.screen===SCR.SETUP){ tr('TRANSLATE_PUSHBUTTONS: switch(screen) → case SETUP_SCREEN: “if in SETUP the pushbuttons will do nothing”.'); return; }
  if (D.screen_display===SCR.VOLUME){ tr('screen_display == VOLUME_SCREEN → activity_counter = NO_ACTIVITY_THRESHOLD − 1: the volume screen closes on the next pass (the 1.0.0.2 “display changes upon user interface selection”).'); D.screen_display=SCR.INFO; }
  D.screen = SCR.INFO;
  if (data & 0x80){
    if (!(D.input & 0x01) && D.preset_selector!==3){ D.input |= 0x01; D.preset_selector = 3; D.preset = 'ABCD'[D.input_number-1]; tr(`PHASE (BIT7): input |= BIT0, preset_selector = LEFT_PLUS_RIGHT (3), preset = '${D.preset}'.`); }
    else { D.input &= ~0x01; D.preset_selector = 2; tr('PHASE (BIT7) again: input &= ~BIT0, preset_selector = LEFT_AND_RIGHT (2).'); }
    tr(`Main board UART0_translate: selector = rx_buffer[15] → ${D.preset_selector===3?'PhaseOn = BIT3':'PhaseOn = 0'} → ALTERA_BUFFER_out[68] (reg 18 bit 27) → SHARC phase_on → sport0_isr check_phase ${D.preset_selector===3?'multiplies the ST OUT right channel by −1.0':'passes ST OUT right unchanged'}.`);
  }
  if (data & 0x40) tr('B (BIT6): the whole handler is commented out — “B input (previously L/only)(reserved in v101)”. Nothing happens and the lamp (BIT1) never lights.');
  if (data & 0x20){ D.input &= ~0x03; D.preset_selector=2; if (!(D.input & 0x04)){ D.input |= 0x04; D.input &= ~0x08; D.source=SRC.AES75; }
    tr('AES (BIT5): input &= ~(BIT0|BIT1) (PHASE is cancelled), preset_selector = LEFT_AND_RIGHT; input |= BIT2, &= ~BIT3; source = AES75 (1).'); }
  if (data & 0x10){ D.input &= ~0x03; D.preset_selector=2; if (!(D.input & 0x08)){ D.input |= 0x08; D.input &= ~0x04; D.source = D.gp_number===1? SRC.SDI12 : SRC.SDI34; }
    tr(`SDI (BIT4): PHASE cancelled; input |= BIT3, &= ~BIT2; source = ${D.gp_number===1?'SDI12 (4)':'SDI34 (5)'} (gp_number is always NO1 — GROUP_SCREEN is unreachable).`); }
  [[0x08,1,0x10],[0x04,2,0x20],[0x02,3,0x40],[0x01,4,0x80]].forEach(([bit,n,lamp])=>{
    if (data & bit){ if (!(D.input & lamp)){ D.input |= lamp; D.input &= ~(0xF0 & ~lamp); D.input_number=n; D.preset='ABCD'[n-1]; }
      tr(`${MON_NAME[n]} (BIT${Math.log2(bit)}): input |= 0x${lamp.toString(16)}, input_number = NO${n}, preset = '${'ABCD'[n-1]}'. Main board: input == NO${n} → front_panel_monitor = ${n-1} → ALTERA_BUFFER_out[74] bits 1:0 → SHARC reg 19 bits 9:8 → mon${['12','34','56','78'][n-1]} feeds the speakers and the phase meter.`); }
  });
  tr('SAVE_INPUT_SOURCE_INFORMATION() keeps the choice in RAM only (no SAVE_DATA). PORTA = OUTPUT_LEDS(input, 0xFF) = 0x'+D.input.toString(16).padStart(2,'0')+'; input_refresh = NO.');
  tr('communication_mode = INFORMATION_SCREEN → the next GENERAL frame carries E/F/G (source, monitor, volume, phase).');
  comm(0);
}
function turnEffect(k, dir, tr){
  const up = dir>0;
  if (k==='dv'){
    if ((D.screen_display===SCR.VOLUME || D.screen===SCR.INFO) && !D.dv_screen){
      D.screen=SCR.INFO; D.screen_display=SCR.INFO;
      if (D.dv_or_st!==1){ D.dv_level = Math.max(46, Math.min(76, D.dv_level+dir)); tr(`DV_ENCODER_UPDATE: dv_level ${up?'++':'--'} (clamped DV_MIN 46 … DV_MAX 76) = ${D.dv_level} (${D.dv_level-61>=0?'+':''}${D.dv_level-61} dB). Sent as “V ${Math.floor(D.dv_level/10)%10} ${D.dv_level%10}” → main board dv_level → ALTERA_BUFFER_out[55] (reg 14 bits 7:0) → SHARC output_gain+15 via ams81_volume_table.dat.`); }
      else tr('DV_ENCODER_UPDATE: dv_or_st == ST (ST Mono) → the DV gain is not changed (the ST mono feed has no DV gain).');
      if (D.pdv_level!==D.dv_level){ saveBlock(tr, 'UPDATE_DISPLAY sees pdv_level ≠ dv_level on the next pass'); D.pdv_level=D.dv_level; D.pst_level=D.st_level; }
    } else if (D.dv_screen){
      D.dv_or_st = up? (D.dv_or_st>=3?0:D.dv_or_st+1) : (D.dv_or_st<=0?3:D.dv_or_st-1);
      tr(`DV_ENCODER_UPDATE (dv_screen == YES): dv_or_st = ${D.dv_or_st} = ${DV_NAME[D.dv_or_st]} (cycles DV → ST → DV_LEFT → DV_RIGHT). Sent as the byte after “C” in every GENERAL frame → main board dv_or_st → ALTERA_BUFFER_out[7] (reg 2) → SHARC TDM_IN_ctl+1 → test_st_mode.`);
    } else tr('DV_ENCODER_UPDATE: not on the information/volume screen (SD Setup) → ignored.');
  }
  if (k==='st'){
    if ((D.screen_display===SCR.VOLUME || D.screen===SCR.INFO) && !D.dv_screen){
      D.screen=SCR.INFO; D.screen_display=SCR.INFO;
      if (D.st_screen){ D.st = up? (D.st>=2?0:D.st+1) : (D.st<=0?2:D.st-1);
        tr(`ST_ENCODER_UPDATE (st_screen == YES): st = ${D.st} = ${ST_NAME[D.st]} (cycles ST_RIGHT 0 → ST 1 → ST_LEFT 2). Sent after “H” → main board st → ALTERA_BUFFER_out[11] (reg 3) → SHARC TDM_IN_ctl+2 → dm(stereo).`); }
      else { D.st_level = Math.max(46, Math.min(76, D.st_level+dir)); tr(`ST_ENCODER_UPDATE: st_level ${up?'++':'--'} (ST_MIN 46 … ST_MAX 76) = ${D.st_level} (${D.st_level-61>=0?'+':''}${D.st_level-61} dB). Sent as “P tens ones” → main board st_level → ALTERA_BUFFER_out[54] → SHARC output_gain+14; the SHARC ramps to it with RAMP_TC 0.019999 per pass.`);
        if (D.pst_level!==D.st_level){ saveBlock(tr, 'UPDATE_DISPLAY sees pst_level ≠ st_level on the next pass'); D.pst_level=D.st_level; D.pdv_level=D.dv_level; } }
    } else if (D.screen===SCR.SETUP){
      D.setup = up? (D.setup>=202?200:D.setup+1) : (D.setup<=200?202:D.setup-1);
      if (D.setup===200) D.setupVisitedExit = true;
      tr(`ST_ENCODER_UPDATE (screen == SETUP_SCREEN): setup = ${D.setup} ${SETUP_NAME[D.setup]} (EXIT 200 → ST 201 → DV 202; GROUP_SCREEN 203 is never reached).`);
    } else tr('ST_ENCODER_UPDATE: dv_screen == YES, so the ST knob is ignored until the DV screen closes.');
  }
  if (k==='vol'){
    if (D.screen_display===SCR.SETUP || D.screen===SCR.SETUP){
      if (D.setup===201){ D.st_number = up? (D.st_number>=19?12:D.st_number+1) : (D.st_number<=12?19:D.st_number-1); tr(`VOLUME_ENCODER_UPDATE (setup == ST_SCREEN): st_number = SDI_${D.st_number-11} (wraps 1…8; the group-limited version is commented out).`); }
      else if (D.setup===202){ D.dv_number = up? (D.dv_number>=19?12:D.dv_number+1) : (D.dv_number<=12?19:D.dv_number-1); tr(`VOLUME_ENCODER_UPDATE (setup == DV_SCREEN): dv_number = SDI_${D.dv_number-11}.`); }
      else { tr('VOLUME_ENCODER_UPDATE: setup == EXIT_SETUP_SCREEN → nothing to change.'); return; }
      D.mb.sdi_ST = D.st_number-12; D.mb.sdi_DV = D.dv_number-12; D.mb.ee.sdi_ST=D.mb.sdi_ST; D.mb.ee.sdi_DV=D.mb.sdi_DV;
      tr(`SETUP_COM frame “# T ${D.st_number-12} D ${D.dv_number-12} $” (6 bytes, ((x−12) & 0x07)). Main board: sdi_ST = ${D.mb.sdi_ST}, sdi_DV = ${D.mb.sdi_DV}, SAVE_DATA to its own EEPROM; UART1 → DEMUX-3: sdi_data_out1 = 0x${(0xF0|(D.mb.sdi_ST&~1)).toString(16)} (group of AES${(D.mb.sdi_ST&~1)+1}/${(D.mb.sdi_ST&~1)+2}), sdi_data_out2 = 0x${(0x70|(D.mb.sdi_DV&~1)).toString(16)}; ALTERA_BUFFER_out[74] picks the pair inside the group from bit 0 (ST → in ${(D.mb.sdi_ST&1)+1}, DV → in ${(D.mb.sdi_DV&1)+3}).`);
    } else {
      D.screen_display=SCR.VOLUME; comm(1);
      if (D.mute){ D.mute=false; D.volume=D.mute_level; tr('mute == YES → mute = NO, volume = mute_level.'); }
      D.volume = Math.max(0, Math.min(76, D.volume+dir));
      tr(`VOLUME_ENCODER_UPDATE: screen_display = VOLUME_SCREEN, communication_mode = VOLUME_SCREEN; volume ${up?'++':'--'} (0 … Volume_Max 76) = ${D.volume} → PROCESS_VOLUME_INFORMATION “${volTxt(D.volume)}”.`);
      tr(`UART0_setup → VOLUME_COM for the next 1000 passes: “# F ${Math.floor(D.volume/100)} ${Math.floor(D.volume/10)%10} ${D.volume%10} E ${D.source} 1 $” → main board volume_level → monitor gains (reg 12/13) → SHARC mon${['12','34','56','78'][D.input_number-1]} × output_gain → speaker DAC.`);
    }
  }
}
function pressEffect(k, tr){
  if (k==='vol'){
    if (D.screen===SCR.SETUP){ tr('TRANSLATE_ENCODER2: screen_display is SETUP_SCREEN → the push is ignored.'); return; }
    D.screen_display=SCR.VOLUME; comm(1);
    if (!D.mute){ D.mute=true; if (D.volume<77) D.mute_level=D.volume; tr(`mute = YES, mute_level = ${D.mute_level}, volume = 255; display1 " Volume ", display2 "  Mute  ". VOLUME_COM sends “F F F” (the protocol’s mute code) → main board monitor = NO.`); }
    else { D.mute=false; D.volume=D.mute_level; tr(`mute = NO, volume = mute_level = ${D.volume}; PROCESS_VOLUME_INFORMATION → “${volTxt(D.volume)}”.`); }
    return;
  }
  if (k==='dv'){
    D.screen=SCR.INFO; D.screen_display=SCR.INFO; comm(0);
    if (!D.dv_screen){ D.dv_screen=true; tr(`TRANSLATE_ENCODER1: screen = INFORMATION_SCREEN, dv_screen = YES. It writes “ ST Mono”/“ DV+…dB” first, but refresh = YES makes UPDATE_DISPLAY overwrite it at once with the dv_screen strings: “${displays()[1]}”.`); }
    else { D.dv_screen=false; tr('TRANSLATE_ENCODER1: dv_screen = NO (back to the normal screen).'); if (D.dv_or_st!==D.pdv_or_st){ saveBlock(tr,'dv_or_st ≠ pdv_or_st'); D.pdv_or_st=D.dv_or_st; } else tr('dv_or_st unchanged → no EEPROM write.'); }
    return;
  }
  if (k==='st'){
    const wasSetup = D.screen===SCR.SETUP, at = D.setup;
    tr('TRANSLATE_ENCODER3 first sets screen = screen_display = INFORMATION_SCREEN, communication_mode = INFORMATION_SCREEN …');
    if (wasSetup){
      tr(`… and only then tests “if ((screen_display == SETUP_SCREEN) && (setup == ${SETUP_NAME[at]}))”. That test can never be true, so the SD Setup branches (save, GROUP → ST → DV → EXIT stepping) are dead code. The push simply leaves SD Setup${at===200?'':' from whatever screen it is on'} and falls through to the ST-source branch below. No EEPROM write of st_number / dv_number happens here (only the 8000-pass timeout saves them).`);
    }
    D.screen=SCR.INFO; D.screen_display=SCR.INFO; comm(0);
    if (!D.st_screen){ D.st_screen=true; tr(`st_screen == NO → st_screen = YES: display1 “${displays()[0]}” (ST source: ST Left / ST Rght / ST L/R).`); }
    else { D.st_screen=false; tr('st_screen == YES → st_screen = NO.'); if (D.st!==D.pst){ saveBlock(tr,'st ≠ pst'); D.pst=D.st; } else tr('st unchanged → no EEPROM write.'); }
  }
}

/* ================================================================
   SIGNAL ENGINE — one second at 48 kHz through the real sport0_isr routing
   ================================================================ */
function hash(n, s){ let x = (n*374761393 + s*668265263)|0; x = (x^(x>>>13))*1274126177|0; x ^= x>>>16; return (x>>>0)/4294967296*2-1; }
function speech(seed, db){         // syllabic narration, with pauses (inferred test material)
  let lp=0; const a=Math.pow(10,db/20)*4.2;
  return n=>{ const t=n/C.FS; lp += (hash(n,seed)-lp)*0.35;
    const syl=Math.max(0,Math.sin(2*Math.PI*(3.3+0.3*Math.sin(seed))*t+seed)), phrase=Math.max(0,Math.sin(2*Math.PI*0.9*t+seed*1.3));
    return a*lp*Math.sqrt(syl)*phrase; };
}
function music(seed, db){
  let lp=0, lp2=0; const a=Math.pow(10,db/20)*3.2;
  return n=>{ const t=n/C.FS; lp += (hash(n,seed)-lp)*0.25; lp2 += (hash(n,seed+9)-lp2)*0.02;
    const beat = 0.55+0.45*Math.exp(-((((t*2.1+seed*0.1)%1)+1)%1)/0.12); return a*(lp*0.7+lp2*2.2)*beat; };
}
function tone(db, f){ const a=Math.pow(10,db/20)*Math.SQRT2, w=2*Math.PI*f/C.FS; return n=>a*Math.sin(w*n); }
const ZERO = ()=>0;
function contentGens(key, seed){   // → [L(n), R(n)]
  if (key==='prog'){ const c=music(seed,-20), l=music(seed+3,-26), r=music(seed+5,-26); return [n=>c(n)+l(n), n=>c(n)+r(n)]; }
  if (key==='dvmix'){ const c=music(seed,-26), v=speech(seed+7,-20), l=music(seed+3,-32), r=music(seed+5,-32); return [n=>c(n)+v(n)+l(n), n=>c(n)+v(n)+r(n)]; }
  if (key==='narr'){ const v=speech(seed+7,-20); return [v, v]; }
  if (key==='tone'){ const g=tone(-20,1000); return [g,g]; }
  if (key==='lid'){ return [tone(-20,1000), ZERO]; }
  if (key==='anti'){ const g=tone(-20,1000); return [g, n=>-g(n)]; }
  return [ZERO, ZERO];
}
const dbGain = lvl => lvl<=0? 0 : Math.pow(10, (Math.min(76,lvl)-61)/20);   // ams81_volume_table.dat: index 61 = 1.0, 46 = 0.1778, 76 = 5.623, 0 = 0
function inputKeys(){              // what the FPGA hands the SHARC on TDM slots 0–3
  if (!D.power) return ['off','off'];
  if (D.source===SRC.AES75) return [D.aes[0], D.aes[1]];
  if (!D.demux) return ['off','off'];
  return [D.sdi[D.mb.sdi_ST&7], D.sdi[D.mb.sdi_DV&7]];
}
function engineKey(){ return JSON.stringify([D.power, inputKeys(), D.st, D.dv_or_st, D.st_level, D.dv_level, D.preset_selector, D.input_number, D.volume, D.mute, D.source, D.mb.sdi_ST, D.mb.sdi_DV]); }
function engine(){
  const key=engineKey(); if (M && key===MKEY) return M; MKEY=key;
  const N=C.FS, PRE=24000, [stK,dvK]=inputKeys();
  const [sL,sR]=contentGens(stK, D.source===SRC.AES75? 1 : 11+(D.mb.sdi_ST&7)), [dL,dR]=contentGens(dvK, D.source===SRC.AES75? 2 : 21+(D.mb.sdi_DV&7));
  const gST=dbGain(D.st_level), gDV=dbGain(D.dv_level), phase=D.preset_selector===3, st=D.st, dvm=D.dv_or_st;
  const x=[], vu=[], pk=[]; for (let c=0;c<8;c++){ x.push(new Float32Array(N)); vu.push(new Float32Array(N)); pk.push(new Float32Array(N)); }
  const ph=new Uint8Array(N), spk=[new Float32Array(N), new Float32Array(N)];
  const v=new Float64Array(8), p=new Float64Array(8); let sAve=0, dAve=0;
  const mon=D.input_number-1, vg = (D.mute||D.volume===0)? 0 : dbGain(D.volume);
  const frame = new Float64Array(8);
  for (let n=-PRE; n<N; n++){
    const a0=sL(n), a1=sR(n), a2=dL(n), a3=dR(n);
    // sport0_isr: ST output (left_only / normal / right_only), then check_phase
    let o0 = a0*gST, o1;
    if (st===2) o1 = o0; else if (st===1) o1 = a1*gST; else { o1 = a1*gST; o0 = o1; }
    if (phase) o1 = -o1;
    // test_st_mode (TDM_IN_ctl+1 & 3)
    let o2, o3;
    if (dvm===0){ o2 = (a2*gDV*0.5) + (a3*gDV*0.5); }
    else if (dvm===1){ o2 = 0.5*o0 + 0.5*o1; }
    else if (dvm===2){ o2 = a2*gDV; } else { o2 = a3*gDV; }
    o3 = 0.5*o0 + 0.5*o1;                         // "added on april 2,2009 to force program mono on out 3"
    const clip = s => Math.max(-1, Math.min(1, s));   // fix f3 by 23 → 24-bit, saturating (ALUSAT)
    frame[0]=a0; frame[1]=a1; frame[2]=a2; frame[3]=a3; frame[4]=clip(o0); frame[5]=clip(o1); frame[6]=clip(o2); frame[7]=clip(o3);   // slots 4–7 = AES outputs looped back (inferred)
    for (let c=0;c<8;c++){ const s=frame[c], sq=s*s, d=sq-p[c]; const pa=p[c]+d*C.TC_PPMA, pd=p[c]+d*C.TC_PPMD; v[c]+= (sq-v[c])*C.TC_VU; p[c]=Math.max(pa,pd);
      if (n>=0){ x[c][n]=s; vu[c][n]=v[c]; pk[c][n]=p[c]; } }
    // PhaseMeterCalc on the monitored pair, PhaseMeterGet → 0…255
    const A1=frame[2*mon], B1=frame[2*mon+1];
    sAve = C.PH_ALPHA*sAve + (1-C.PH_ALPHA)*Math.abs(A1+B1); dAve = C.PH_ALPHA*dAve + (1-C.PH_ALPHA)*Math.abs(A1-B1);
    if (n>=0){ const den=sAve+dAve; let y = den<1e-3? 0 : (sAve-dAve)/den; y=Math.max(-1,Math.min(1,y)); ph[n]=Math.max(0,Math.min(255,Math.round(y*128+128)));
      // mon12 … mon78 → audio_out_float+8/+9 (speaker DAC); mon56/78 read the outputs
      spk[0][n]=A1*vg; spk[1][n]=B1*vg; }
  }
  M={x,vu,pk,ph,spk,keys:[stK,dvK]}; return M;
}
const meterCal = () => 0;                    // cal_data[1] = 0 — INFERRED (the AIP front panel never sends “Y”; main-board default)
function pval(ms){ return ms>0? Math.min(255, -20*Math.log10(ms)) : 255; }
function meterAt(ch, t){
  const m=engine(), n=Math.max(0,Math.min(C.FS-1, Math.floor(t*C.FS)));
  if (!D.power) return {vuIdx:255, pkIdx:255, bar:0, dot:0, vuDb:-128, pkDb:-128, x:0};
  const pv=pval(m.vu[ch][n]), pp=pval(m.pk[ch][n]), cal=meterCal();
  const vuIdx=Math.max(0,Math.min(255,Math.round(pv+cal-6))), pkIdx=Math.max(0,Math.min(255,Math.round(pp+cal)));
  return {vuIdx, pkIdx, bar:litOf(vuIdx), dot:litOf(pkIdx), vuDb:-pv/2, pkDb:-pp/2, x:m.x[ch][n]};
}
function phaseAt(t){ const m=engine(); const n=Math.max(0,Math.min(C.FS-1,Math.floor(t*C.FS))); const idx=D.power? m.ph[n] : 128; return {idx, leds:D.power? phaseLeds(idx) : 0}; }
function barWords(bar, dot){
  let lo=0, up=0; const set=s=>{ if (s<=0) return; if (s<=32) lo|=(1<<(32-s)); else up|=(1<<(15-(s-33))); };
  for (let s=1;s<=bar;s++) set(s); set(dot); return [lo>>>0, up>>>0];
}

/* ================================================================
   TIMING — front loop, UART frames, main board, SHARC
   ================================================================ */
const STEPS = [
  ['WDR · SWITCH_ENCODER1/2/3', .06, 'PINE bit 2 (DV push), PINE bit 3 (VOLUME push), PIND bit 2 (ST push) → TRANSLATE_ENCODERx, DEBOUNCE_ENCODERx'],
  ['SHAFT_ENCODER1/2/3', .07, 'PINF 1:0, PIND 1:0, PIND 4:3 → PROCESS_SHAFT_ENCODERx state table → encoder_actionx'],
  ['WDR · PROCESS_PUSHBUTTONS · TRANSLATE_PUSHBUTTONS', .10, 'PINB inverted, TRANSLATE_SWITCHES (SDI hold counter), DEBOUNCE; act on input_refresh; PORTA = lamps'],
  ['WDR · DV / ST / VOLUME_ENCODER_UPDATE', .09, 'Apply knob detents to dv_level / st_level / volume / st / dv_or_st / setup'],
  ['ACTIVITY_MONITOR', .04, 'Count to 8000 passes on the DV/ST source, volume and SD Setup screens'],
  ['UPDATE_DISPLAY', .30, 'PROCESS_ST/DV_INFORMATION; if refresh → SIEMENS8_lcd_display1/2 (16 characters)'],
  ['COMMUNICATION_MONITOR', .04, 'VOLUME_COM falls back to GENERAL_COM after 1000 passes'],
  ['WDR · UART0_setup · UART0_transmit_counter · UART0_translate', .30, 'Every 26th pass one byte → UDR0; parse the “#A…$” reply from uart_rx_buffer0'],
];
const STEP_FRAC = (()=>{ let a=0; return STEPS.map(s=>{ const r=a; a+=s[1]; return r; }); })();
function stepAt(t){ const p=Math.floor(t/C.LOOP_T), f=t/C.LOOP_T-p; let k=0; for (let j=0;j<STEPS.length;j++) if (f>=STEP_FRAC[j]) k=j; return {pass:p, step:k, frac:f}; }
const KIND_NAME = {0:'GENERAL_COM', 1:'VOLUME_COM', 5:'SETUP_COM'};
const raw = v => ({raw:v});
const bstr = b => typeof b==='string'? b : '\\'+b.raw;
function kindAt(t){ const c=D.comm; if (c.at>=0 && t>=c.at && t<c.end) return c.kind; if (D.screen===SCR.SETUP && c.kind===5) return 5; return 0; }
function frameBytes(kind){
  const v=D.mute?255:D.volume, vol = D.mute? ['F','F','F'] : [raw(Math.floor(v/100)), raw(Math.floor(v/10)%10), raw(v%10)];
  if (kind===1) return ['#','F',...vol,'E',raw(D.source),String(D.input_number),'$'];
  if (kind===5) return ['#','T',raw((D.st_number-12)&7),'D',raw((D.dv_number-12)&7),'$'];
  return ['#','A','B','C',raw(D.dv_or_st),'H',raw(D.st),'E',raw(D.source),String(D.input_number),'F',...vol,'G',D.preset,raw(D.preset_selector),'P',raw(Math.floor(D.st_level/10)%10),raw(D.st_level%10),'V',raw(Math.floor(D.dv_level/10)%10),raw(D.dv_level%10),'$'];
}
let TXS=null, TXKEY='';
function txSchedule(){
  const key=JSON.stringify([D.comm, D.screen, D.volume, D.mute, D.source, D.input_number, D.preset, D.preset_selector, D.st, D.dv_or_st, D.st_level, D.dv_level, D.st_number, D.dv_number, D.power, D.booted]);
  if (TXS && key===TXKEY) return TXS; TXKEY=key;
  const bytes=[], frames=[]; let slot=0;
  if (D.power && D.booted) while (true){
    const t0=(25+26*slot)*C.LOOP_T; if (t0>1.05) break;
    const kind=kindAt(t0), fb=frameBytes(kind), fr={kind, t0, bytes:fb};
    for (let i=0;i<=fb.length;i++){ const ts=(25+26*slot)*C.LOOP_T; slot++; if (i<fb.length) bytes.push({t:ts, b:fb[i], i, frame:frames.length}); else fr.t1=ts; }
    frames.push(fr);
  }
  TXS={bytes, frames}; return TXS;
}
function rxBytes(){ const [stK]=inputKeys(); const fmt = stK==='off'? 0 : 1;
  return ['#','A',raw(fmt),'B',raw(0),'C',raw(1),raw(100),'D',raw(5),'R',raw(55),'T',raw(55),'X',raw(255),raw(0),'$']; }
function rxFrames(){                 // main board free-runs its reply: one byte every 3 passes of ≈4 ms (inferred), 17 bytes + 1 reset slot
  const out=[], per=C.MB_TX_EVERY*C.MB_PASS, b=rxBytes(); if (!D.power) return out;
  for (let k=0; k*19*per<1.05; k++){ const t0=0.0031+k*19*per; out.push({t0, per, bytes:b}); }
  return out;
}
function frameLen(kind){ return frameBytes(kind).length; }

/* ================================================================
   PANELS
   Front: AIP8-2A-FRONTSILK-ISS3-curve.cdr (Feb 22 2007) converted with Inkscape, page rendered at 200 dpi and cut
   between the crop marks: 3448 × 680 px = 17.24 × 3.40 in, the same face size as AMS82-FRONT-SILK. The WHITE and
   GREEN plates are both in aip8-2a-front.svg (CorelDRAW vector). The silk has only the control-area legends and the
   knob crosshairs; the meter window, grilles, display window, button caps and screws are placed from
   AIP8-2A-FRONT VIEW.pdf (Feb 21 2007), scaled so its knob centres land on the silk crosshairs.
   ================================================================ */
const FW=3448, FH=680;
const KNOB = {st:[1728,350], dv:[2052,350], vol:[2376,350]};
const BTN_X = {phase:1729, b:1821, aes:1910, sdi:2000, inst:2106, indv:2199, outst:2286, outdv:2378};
const BTN_Y = 99;
const BAR_X = [979,1052,1102,1175,1223,1295,1342,1414];
const SEG_Y = s => 34 + (46-s)*11.6;
const DISP = {x:1705, y:184, w:679, h:109, p:6.3};
const DM_EXT = { 'j':[2,0,6,2,2,18,12], 'q':[0,0,13,19,15,1,1] };
function dm(text, x, y, p, on, off){
  let s=''; const r=(p*0.40).toFixed(2);
  for (let i=0;i<text.length;i++){ const ch=text[i], cx=x+i*p*6.2;
    if (DM_EXT[ch]){ const g=DM_EXT[ch]; for (let row=0;row<7;row++) for (let col=0;col<5;col++){ const o=(g[row]>>(4-col))&1; s+=`<circle cx="${(cx+col*p).toFixed(1)}" cy="${(y+row*p).toFixed(1)}" r="${r}" fill="${o?on:off}"/>`; } }
    else s += SIM.dotMatrix(ch, cx, y, p, on, off);
  }
  return s;
}
function grille(cx, cy, rows){       // oblong speaker holes (AIP8-2A-M1: ".088X.340 OBLONG"), counts from the FRONT VIEW
  let s=''; rows.forEach((n,i)=>{ const y=cy+(i-(rows.length-1)/2)*50; for (let k=0;k<n;k++){ const x=cx+(k-(n-1)/2)*31; s+=`<rect x="${x-8}" y="${y-17}" width="16" height="34" rx="8" fill="#060606"/>`; } }); return s;
}
let GRILLES = null;
function meterSVG(t){
  let s = `<rect x="899" y="14" width="592" height="658" fill="#050605"/>`;
  for (let ch=0; ch<8; ch++){
    const x=BAR_X[ch], m=meterAt(ch,t);
    for (let sg=1; sg<=46; sg++){ const on = D.power && (sg<=m.bar || sg===m.dot), col=segColour(sg);
      s += `<rect x="${x-11}" y="${(SEG_Y(sg)-4.3).toFixed(1)}" width="22" height="8.6" rx="1.5" fill="${col}" opacity="${on?1:0.10}"${on?' filter="url(#mg)"':''}/>`; }
    s += `<rect class="mtr" data-ch="${ch}" x="${x-16}" y="24" width="32" height="550" fill="transparent" style="cursor:pointer"><title>Meter ${ch+1}: ${METER_NAME[ch]} — click to follow it on the timeline</title></rect>`;
    if (D.meterCh===ch) s += `<rect x="${x-15}" y="22" width="30" height="554" fill="none" stroke="#6fb7ff" stroke-width="2.5" stroke-dasharray="7 5" opacity=".8"/>`;
  }
  ['STEREO INPUT','DV INPUT','STEREO OUTPUT','DV OUTPUT'].forEach((lb,p)=>{ const cx=(BAR_X[2*p]+BAR_X[2*p+1])/2;
    s += `<text x="${cx}" y="300" transform="rotate(-90 ${cx} 300)" text-anchor="middle" font-size="19" fill="#e8e8e2" letter-spacing="1">${lb}</text>`;
    s += `<path d="M${BAR_X[2*p]} 584v8H${BAR_X[2*p+1]}v-8" stroke="#e8e8e2" stroke-width="2" fill="none"/>`;
    [0,1].forEach(j=> s += `<text x="${BAR_X[2*p+j]}" y="616" text-anchor="middle" font-size="20" fill="#e8e8e2">${2*p+j+1}</text>`); });
  const ph = phaseAt(t);
  for (let i=0;i<15;i++){ const on=i<ph.leds, x=1003+i*26; s += `<rect x="${x-9}" y="636" width="18" height="10" rx="2" fill="${i<10?'#5cff3a':'#ff3b2e'}" opacity="${on?1:.12}"${on?' filter="url(#mg)"':''}/>`; }
  s += `<text x="1395" y="646" font-size="13" fill="#9a9a94">PHASE</text><rect x="990" y="628" width="460" height="26" fill="transparent"><title>15-LED phase meter (sdm_phase_data.dat, shifted out on FLAG8). Position on the panel ${'inferred'}: the manual says “horizontal phase meter located on the bottom LED meter display”.</title></rect>`;
  return s;
}
function frontSVG(t){
  if (!GRILLES){ const L=[17,19,21,22,24,24,24,22,21,19,17]; GRILLES = grille(430,344,L)+grille(3022,344,L)+grille(2028,551,[24,24,24]); }
  const [d1,d2] = displays(), lamps = D.power? D.input : 0;
  const ON='#7dff5a', OFF='rgba(125,255,90,.07)', P=DISP.p;
  const dms = dm(d1, DISP.x+22, DISP.y+33, P, ON, OFF) + dm(d2, DISP.x+22+8*P*6.2+6, DISP.y+33, P, ON, OFF);
  const cap = {red:['#b8231c','#ff6a5a','#e9b0aa'], yellow:['#e2cc2a','#fffbe0','#f2e9b0'], black:['#151617','#ff4a5a','#b9bab6']};
  const btn = k => { const b=BTN[k], x=BTN_X[k], y=BTN_Y, on=(lamps & b.lamp)!==0, c=cap[b.col], held=D.held===k;
    return `<g class="pb" data-k="${k}" style="cursor:pointer"><rect x="${x-36}" y="${y-36}" width="72" height="72" rx="5" fill="${c[0]}" stroke="${held?'#6fb7ff':'#000'}" stroke-width="${held?5:2}"/>
      <rect x="${x-19}" y="${y-11}" width="38" height="22" rx="3" fill="${on? c[1] : c[2]}" ${on?'filter="url(#glow)"':''} opacity="${on?1:.75}"/>
      <title>${b.grp} ${b.label} (${b.pb}, PINB bit ${Math.log2(b.pin)}) — click to press${k==='sdi'?'; Shift+click holds it 5 s (SD Setup)':''}</title></g>`; };
  const knob = k => { const [x,y]=KNOB[k], a=D.knob[k]*Math.PI/180;
    return `<g class="knob" data-k="${k}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="60" fill="transparent"/>
      <circle cx="${x}" cy="${y}" r="46" fill="#0b0b0c" stroke="#2c2e30" stroke-width="3"/>${Array.from({length:24},(_,i)=>{const b=i*Math.PI/12; return `<line x1="${(x+43*Math.cos(b)).toFixed(1)}" y1="${(y+43*Math.sin(b)).toFixed(1)}" x2="${(x+47*Math.cos(b)).toFixed(1)}" y2="${(y+47*Math.sin(b)).toFixed(1)}" stroke="#333" stroke-width="3"/>`;}).join('')}
      <circle cx="${x}" cy="${y}" r="33" fill="#1b1c1e"/><circle cx="${x-9}" cy="${y-10}" r="13" fill="#3a3c40" opacity=".55"/>
      <line x1="${(x+12*Math.sin(a)).toFixed(1)}" y1="${(y-12*Math.cos(a)).toFixed(1)}" x2="${(x+31*Math.sin(a)).toFixed(1)}" y2="${(y-31*Math.cos(a)).toFixed(1)}" stroke="#d9d9d4" stroke-width="4" stroke-linecap="round"/>
      <title>${k==='vol'?'VOLUME':k.toUpperCase()} encoder (${ENC[k].part}, AMS8-M11 modified encoder) — left third turns counter-clockwise, middle pushes, right third turns clockwise; the wheel turns too</title></g>`; };
  const screw = (x,y,r) => `<circle cx="${x}" cy="${y}" r="${r||14}" fill="#6b6d70" stroke="#2a2b2c" stroke-width="2"/><path d="M${x-8} ${y}h16M${x} ${y-8}v16" stroke="#2a2b2c" stroke-width="3"/>`;
  return `<svg viewBox="0 0 ${FW} ${FH}" role="img" aria-label="AIP8-2A front panel on the real silkscreen" style="width:100%;display:block;border-radius:6px">
    <defs><filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="mg" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="${FW}" height="${FH}" fill="#1e1f1c"/>${GRILLES}
    ${meterSVG(t)}
    <rect x="${DISP.x}" y="${DISP.y}" width="${DISP.w}" height="${DISP.h}" rx="4" fill="#070806" stroke="#333" stroke-width="2"/>
    <g filter="url(#glow)">${dms}</g>
    <image href="${ASSET}aip8-2a-front.svg" width="${FW}" height="${FH}"/>
    ${BTN_KEYS.map(btn).join('')}${knob('st')}${knob('dv')}${knob('vol')}
    ${[[862,69],[862,615],[1528,69],[1528,615],[1624,306],[2471,306]].map(([x,y])=>screw(x,y)).join('')}${screw(2198,353,11)}
    <rect class="dsp" x="${DISP.x}" y="${DISP.y}" width="${DISP.w}" height="${DISP.h}" fill="transparent"><title>Two Siemens PDSP1884 8-character displays (U1 on CS1 = left, U2 on CS2 = right), written by SIEMENS8_lcd_display1/2</title></rect>
  </svg>`;
}
/* Rear: no AIP8-2A rear drawing exists in the folder. The AIP8-2A uses the AMS8E-1 main board in the AMS8-2 2 RU chassis
   (INFERRED from the shared main-board code and from the manual's connector names: IN1/IN2, OUT 1–4 on BNC and Phoenix,
   SDI OUT, AES1/AES2), so the AMS8-M2 rear silk already cut for ams82.js is reused here with AIP8-2A meanings. */
function rearSVG(){
  const RW=3448;
  const bnc = (x,y,id,lbl,on) => `<g ${id?`class="jack" data-j="${id}" style="cursor:pointer"`:''}><circle cx="${x}" cy="${y}" r="46" fill="#a98c3c" stroke="#5e4d1c" stroke-width="3"/><circle cx="${x}" cy="${y}" r="29" fill="#e2cd86"/><circle cx="${x}" cy="${y}" r="9" fill="#6c540f"/>
      ${on?`<circle cx="${x+40}" cy="${y-40}" r="11" fill="var(--accent)"/>`:''}${lbl?`<title>${lbl}</title>`:''}</g>`;
  const phx = (x,y,n,lbl) => { let s='<g>'; for (let i=0;i<n;i++){ const x0=x+i*109; s+=`<rect x="${x0}" y="${y}" width="104" height="66" rx="4" fill="#23a35a" stroke="#0e4d25" stroke-width="2"/>${[0,1,2].map(j=>`<rect x="${x0+12+j*29}" y="${y+14}" width="22" height="22" rx="3" fill="#0d3a1c"/>`).join('')}`; } return s+(lbl?`<title>${lbl}</title>`:'')+'</g>'; };
  const dsub = (x,y,w,h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#b9bcbf" stroke="#555" stroke-width="3"/><rect x="${x+16}" y="${y+16}" width="${w-32}" height="${h-32}" rx="10" fill="#202224"/>`;
  const has = k => k!=='off';
  const tag = (x,y,s) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="22" font-weight="700" fill="#ffd34d" stroke="#000" stroke-width="4" paint-order="stroke">${s}</text>`;
  return `<svg viewBox="0 0 ${RW} ${FH}" role="img" aria-label="AIP8-2A rear panel (AMS8-M2 silk, inferred)" style="width:100%;display:block;border-radius:6px">
    <rect width="${RW}" height="${FH}" fill="#1e1f1c"/>
    <image href="${ASSET}ams82-rear-cut.png" width="${RW}" height="${FH}" opacity=".9"/>
    <rect x="75" y="394" width="214" height="242" rx="10" fill="#111" stroke="#444" stroke-width="3"/><rect x="110" y="430" width="144" height="100" rx="8" fill="#050505"/>
    ${[0,1,2,3,4,5,6,7,8].map(i=>`<rect x="${526+40*i}" y="416" width="16" height="198" rx="8" fill="#050605"/>`).join('')}
    ${dsub(903,437,94,155)}${dsub(1036,437,94,155)}${dsub(1470,132,330,95)}${dsub(1470,545,330,95)}
    <rect x="1161" y="385" width="815" height="138" rx="6" fill="${D.demux?'#141516':'#26282a'}" stroke="#555" stroke-width="2"/>
    ${D.demux? [1230,1390,1550,1710,1870].map((x,i)=>bnc(x,454,i===0?'sdi':null,['SDI IN — click to toggle the embedded audio on/off','SDI OUT (re-clocked)','SDI IN 2 (not used by the AIP8-2A firmware)','AES1: pre-processed ST','AES2: pre-processed DV'][i], i===0 && D.sdiPresent)).join('') : `<text x="1568" y="460" text-anchor="middle" font-size="26" fill="#888">option plate (DEMUX-3 not fitted)</text>`}
    ${D.demux? tag(1230,372,'SDI IN')+tag(1710,372,'AES1 pre')+tag(1870,372,'AES2 pre') : ''}
    ${[1998,2148,2298,2448,2598,2748,2898].map(x=>`<circle cx="${x}" cy="180" r="46" fill="#050505"/>`).join('')}
    ${bnc(2113,443,null,'REF IN (75 Ω) — the AIP8-2A front panel has no reference menu',false)}
    ${bnc(2263,443,'aes0','IN 1 = ST input (75 Ω): '+CONTENT[D.aes[0]].name+' — click to change',has(D.aes[0]))}
    ${bnc(2388,443,'aes1','IN 2 = DV input (75 Ω): '+CONTENT[D.aes[1]].name+' — click to change',has(D.aes[1]))}
    ${bnc(2513,443,null,'IN 3 — not used by the AIP8-2A',false)}${bnc(2638,443,null,'IN 4 — not used by the AIP8-2A',false)}
    ${[0,1,2,3].map(k=>bnc(2823+125*k,443,null,'OUT '+(k+1)+' = '+(k%2?'DV':'ST')+' output',false)).join('')}
    ${tag(2263,372,'ST')}${tag(2388,372,'DV')}${[0,1,2,3].map(k=>tag(2823+125*k,372,k%2?'DV':'ST')).join('')}
    ${phx(1994,565,2,'MONITOR OUTPUT (3-pin)')}${phx(2254,565,1,'REF IN 110 Ω')}${phx(2404,565,4,'IN 1–4 (110 Ω transformer balanced)')}${phx(2884,565,4,'OUT 1–4 (110 Ω): ST, DV, ST, DV')}
    <image href="${ASSET}ams82-rear-white.png" width="${RW}" height="${FH}"/>
  </svg>`;
}
function bindPanel(root){
  root.querySelectorAll('.knob').forEach(g=>{ const k=g.dataset.k;
    g.addEventListener('click', e=>{ const r=g.getBoundingClientRect(), x=(e.clientX-r.left)/r.width; if (x<0.36) A.turn(k,-1); else if (x>0.64) A.turn(k,1); else A.press(k); });
    g.addEventListener('wheel', e=>{ e.preventDefault(); A.turn(k, e.deltaY<0?1:-1); }, {passive:false}); });
  root.querySelectorAll('.pb').forEach(g=> g.addEventListener('click', e=>{ if (e.shiftKey && g.dataset.k==='sdi') A.holdSdi(); else A.button(g.dataset.k); }));
  root.querySelectorAll('.mtr').forEach(g=> g.addEventListener('click', ()=>{ D.meterCh=+g.dataset.ch; SIM.refresh(); }));
  root.querySelectorAll('.jack').forEach(g=> g.addEventListener('click', ()=>{ const j=g.dataset.j;
    if (j==='sdi'){ D.sdiPresent=!D.sdiPresent; if (!D.sdiPresent){ act('Rear: SDI IN unplugged', tr=>{ D.sdiSave=D.sdi.slice(); D.sdi=D.sdi.map(()=>'off'); tr('No embedded audio: the DEMUX-3 reports no lock; the AIP8-2A display has no “No Lock” message (the NoLock / NoAudio lines in UPDATE_DISPLAY are commented out).'); }); }
      else act('Rear: SDI IN connected', tr=>{ D.sdi = D.sdiSave || ['prog','dvmix','tone','narr','lid','anti','off','off']; tr('Embedded AES 1…8 present again.'); }); return; }
    const idx=+j.slice(3), cur=D.aes[idx]; A.setContent('aes', idx, CONTENT_KEYS[(CONTENT_KEYS.indexOf(cur)+1)%CONTENT_KEYS.length]); }));
}
function controlsHTML(){
  const k3 = (n,k) => `<span class="small muted" style="margin-left:6px">${n}</span><button data-a="${k}l">⟲</button><button data-a="${k}p">push</button><button data-a="${k}r">⟳</button>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">${k3('ST','st')}${k3('DV','dv')}${k3('VOLUME','vol')}
    <button data-a="hold" style="margin-left:8px" title="Hold SDI for ≈5 s">hold SDI 5 s</button><button data-a="wait" title="ACTIVITY_MONITOR timeout">wait 4.4 s</button>
    <button data-a="pwr">power ${D.power?'off':'on'}</button>${D.power && !D.booted? '<button data-a="boot">skip boot</button>':''}</div>
    <div class="small muted" style="margin-top:4px">Click a knob’s left third to turn it counter-clockwise, its centre to push it, its right third to turn it clockwise (the mouse wheel works too). Click a button to press it; Shift+click SDI holds it. Keys: Q W E (ST knob) · A S D (DV knob) · I O P (VOLUME) · 1–8 the buttons left to right · H hold SDI · T timeout.</div>`;
}
function bindControls(root){
  const map={stl:()=>A.turn('st',-1),stp:()=>A.press('st'),str:()=>A.turn('st',1),dvl:()=>A.turn('dv',-1),dvp:()=>A.press('dv'),dvr:()=>A.turn('dv',1),voll:()=>A.turn('vol',-1),volp:()=>A.press('vol'),volr:()=>A.turn('vol',1),hold:()=>A.holdSdi(),wait:()=>A.wait(),pwr:()=>A.power(),boot:()=>A.skipBoot()};
  root.querySelectorAll('[data-a]').forEach(b=> b.onclick=()=>map[b.dataset.a]());
}
document.addEventListener('keydown', e=>{
  if (!window[KEYFLAG] || e.ctrlKey || e.metaKey || e.altKey || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase();
  const m={q:()=>A.turn('st',-1),w:()=>A.press('st'),e:()=>A.turn('st',1),a:()=>A.turn('dv',-1),s:()=>A.press('dv'),d:()=>A.turn('dv',1),i:()=>A.turn('vol',-1),o:()=>A.press('vol'),p:()=>A.turn('vol',1),h:()=>A.holdSdi(),t:()=>A.wait()};
  BTN_KEYS.forEach((b,i)=> m[String(i+1)] = ()=>A.button(b));
  if (m[k]){ m[k](); e.preventDefault(); }
});

/* ================================================================
   TIMELINE LANES
   ================================================================ */
function laneText(c, s, x, y){ c.fillStyle=SIM.css('--ink2'); c.font='11px '+SIM.css('--sans'); c.fillText(s, x, y); }
function waveLane(label, getter, h, colours){
  return {label, h, draw(c,X,t0,t1,y,hh){
    const span=t1-t0, N=Math.min(1400, Math.max(200,(X(t1)-X(t0))*1.5));
    c.strokeStyle=SIM.css('--grid'); c.beginPath(); c.moveTo(X(t0),y+hh/2); c.lineTo(X(t1),y+hh/2); c.stroke();
    colours.forEach((col,s)=>{ c.strokeStyle=col; c.lineWidth=1.2; c.beginPath();
      for (let i=0;i<=N;i++){ const tt=t0+span*i/N, n=Math.max(0,Math.min(C.FS-1,Math.floor(tt*C.FS))); const v=getter(n,s); const yy=y+hh/2-Math.max(-1,Math.min(1,v*3))*(hh/2-3); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); c.lineWidth=1; });
  }};
}
function lanes(fine){
  const css=n=>SIM.css(n), ch=D.meterCh, L=[];
  L.push({label:'User actions', h:22, draw(c,X,t0,t1,y,h){ c.font='10px '+css('--sans');
    D.events.forEach(e=>{ if (e.t<t0||e.t>t1) return; const x=X(e.t); c.fillStyle=css('--play'); c.fillRect(x-1,y+3,3,h-6); c.fillStyle=css('--ink'); c.fillText(e.name.slice(0,34), x+4, y+h-7); });
    if (!D.events.length) laneText(c,'(none yet — use the panel; actions are stamped at the playhead)', X(t0)+6, y+h-7); }});
  L.push({label:'ATmega128 while(1) (front panel)', h:32, draw(c,X,t0,t1,y,h){
    if (!D.power || !D.booted){ laneText(c, D.power? 'boot splash: wait_ms(1500) × 2, loop not running yet' : 'power off', X(t0)+6, y+h/2+4); return; }
    const pw=X(t0+C.LOOP_T)-X(t0);
    if (pw<2.5){ c.fillStyle=css('--accent'); c.globalAlpha=.35; c.fillRect(X(t0),y+6,X(t1)-X(t0),h-12); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px '+css('--mono');
      c.fillText(`${Math.round((t1-t0)/C.LOOP_T).toLocaleString()} passes (≈${(C.LOOP_T*1e3).toFixed(3)} ms each, inferred)`, X(t0)+6, y+h/2+4); }
    else for (let p=Math.floor(t0/C.LOOP_T); p*C.LOOP_T<=t1; p++){ const a=p*C.LOOP_T;
      if (pw>90) STEPS.forEach((s,j)=>{ const xa=X(a+STEP_FRAC[j]*C.LOOP_T), xb=X(a+(STEP_FRAC[j]+s[1])*C.LOOP_T); c.fillStyle=j===5?css('--accent2'):j===7?css('--warn'):css('--accent'); c.globalAlpha=j%2?.55:.85; c.fillRect(xa,y+3,Math.max(1,xb-xa-1),h-6); c.globalAlpha=1;
        if (xb-xa>70){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(s[0].replace('WDR · ','').split(' · ')[0].slice(0,24), xa+3, y+h/2+3); } });
      else { c.fillStyle=p%2?css('--accent2'):css('--accent'); c.globalAlpha=.75; c.fillRect(X(a),y+3,Math.max(1,pw-.5),h-6); c.globalAlpha=1; } }
    c.fillStyle=css('--bad'); D.eeWrites.forEach(tw=>{ if (tw+8*C.EE_WRITE<t0||tw>t1) return; c.globalAlpha=.55; c.fillRect(X(tw),y+1,Math.max(2,X(tw+8*C.EE_WRITE)-X(tw)),h-2); c.globalAlpha=1; });
  }});
  L.push({label:'EEPROM writes (SAVE_DATA × 8)', h:20, draw(c,X,t0,t1,y,h){
    D.eeWrites.forEach(tw=>{ for (let k=0;k<8;k++){ const a=tw+k*C.EE_WRITE; if (a>t1||a+C.EE_WRITE<t0) continue; c.fillStyle=css('--bad'); c.globalAlpha=k%2?.6:.9; c.fillRect(X(a),y+4,Math.max(1,X(a+C.EE_WRITE)-X(a)-1),h-8); c.globalAlpha=1;
      if (X(a+C.EE_WRITE)-X(a)>60){ c.fillStyle='#fff'; c.font='10px '+css('--mono'); c.fillText(EE_ORDER[k].replace('_ADDRESS',''), X(a)+3, y+h-6); } } });
    if (!D.eeWrites.length) laneText(c,'none — a gain detent, a source change or a timeout writes 8 bytes (≈68 ms, loop stalled)', X(t0)+6, y+h-6); }});
  L.push({label:'UART0 TX → main board (9600)', h:30, draw(c,X,t0,t1,y,h){
    const tx=txSchedule();
    tx.frames.forEach(f=>{ if (f.t1<t0||f.t0>t1) return; c.fillStyle=f.kind===5?css('--bad'):f.kind===1?css('--accent2'):css('--warn'); c.globalAlpha=.13; c.fillRect(X(f.t0),y+2,X(f.t1)-X(f.t0),h-4); c.globalAlpha=1;
      if (X(f.t1)-X(f.t0)>90){ c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText(KIND_NAME[f.kind]+' ('+f.bytes.length+' bytes)', Math.max(X(t0),X(f.t0))+3, y+10); } });
    tx.bytes.forEach(b=>{ if (b.t+C.BYTE_T<t0||b.t>t1) return; const xa=X(b.t), xb=X(b.t+C.BYTE_T); c.fillStyle=css('--warn'); c.fillRect(xa,y+13,Math.max(1,xb-xa),h-16);
      if (xb-xa>14){ c.fillStyle='#000'; c.font='bold 10px '+css('--mono'); c.fillText(bstr(b.b).slice(0,4), xa+2, y+h-6); } });
  }});
  L.push({label:'UART0 RX ← main board', h:24, draw(c,X,t0,t1,y,h){
    rxFrames().forEach(f=>{ f.bytes.forEach((b,i)=>{ const a=f.t0+i*f.per; if (a>t1||a+C.BYTE_T<t0) return; const xa=X(a), xb=X(a+C.BYTE_T); c.fillStyle=css('--accent2'); c.fillRect(xa,y+5,Math.max(1,xb-xa),h-10);
      if (xb-xa>14){ c.fillStyle='#fff'; c.font='bold 10px '+css('--mono'); c.fillText(bstr(b).slice(0,4), xa+2, y+h-8); } }); });
    if (t1-t0>0.2) laneText(c,'“#A f B c C p dn D mx R fr T dr X r v $”, one byte every 3 main-board passes (pass time inferred)', X(t0)+6, y+h-6); }});
  L.push({label:'Main board → FPGA (ALTERA_SORT, 80 bytes)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,C.MB_PASS,0.001,C.MB_PASS*0.35,css('--accent2'),'ALTERA_read_write: 20 × 32-bit registers'); }});
  L.push({label:'Display bus (PDSP1884 ×2)', h:18, draw(c,X,t0,t1,y,h){ c.fillStyle=css('--accent2');
    D.dispWrites.forEach(tw=>{ if (tw<t0||tw>t1) return; c.fillRect(X(tw),y+3,Math.max(2,X(tw+16*6e-6)-X(tw)),h-6); });
    if (!D.dispWrites.length) laneText(c,'16 character writes only when refresh = YES', X(t0)+6, y+h-5); }});
  L.push({label:'SHARC sport0_isr @ 48 kHz', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/C.FS,0,C.ISR_T,css('--accent'),'10-slot TDM frames: routing + VU + phase'); }});
  if (fine) L.push({label:'TDM slots (SPORT0, 10 × 32 bit)', h:26, draw(c,X,t0,t1,y,h){
    const fr=1/C.FS, sl=fr/10, pw=X(t0+sl)-X(t0); if (pw<6){ laneText(c,'zoom to ≤ 200 µs to see the ten slots', X(t0)+6, y+h-8); return; }
    const names=['ST L','ST R','DV L','DV R','ST oL','ST oR','DV oL','DV oR','mon L','mon R'];
    for (let k=Math.floor(t0/sl); k*sl<=t1; k++){ const a=k*sl, i=k%10; c.fillStyle=i<4?css('--accent'):i<8?css('--warn'):css('--accent2'); c.globalAlpha=.6; c.fillRect(X(a),y+3,pw-1,h-6); c.globalAlpha=1; if (pw>34){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(names[i],X(a)+3,y+h/2+3); } } }});
  L.push({label:'Timer 1 → shifter (8 meters)', h:28, draw(c,X,t0,t1,y,h){
    const pw=X(t0+C.MUX_T)-X(t0);
    if (pw<6){ SIM.pulses(c,X,t0,t1,y,h,C.MUX_T,0,C.MUX_T/8,css('--warn'),'meter strobes (640 Hz, 80 Hz per bar)'); return; }
    for (let k=Math.floor(t0/C.MUX_T); k*C.MUX_T<=t1; k++){ const a=k*C.MUX_T, m=k%8; c.fillStyle=m===D.meterCh?css('--play'):(m%2?css('--warn'):css('--accent')); c.globalAlpha=.25; c.fillRect(X(a),y+3,pw-1,h-6); c.globalAlpha=1; c.fillRect(X(a),y+3,Math.max(1,X(a+64*0.25e-6)-X(a)),h-6);
      if (pw>34){ c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText('M'+(m+1), X(a)+4, y+h/2+4); } } }});
  L.push(waveLane(`Meter ${ch+1} signal (${METER_NAME[ch]})`, (n)=>engine().x[ch][n], 40, ['#3fbf5f']));
  L.push({label:`Meter ${ch+1}: VU (green) · PPM (orange)`, h:56, draw(c,X,t0,t1,y,h){
    const m=engine(), span=t1-t0, N=Math.min(900,Math.max(100,X(t1)-X(t0))); const yDb=db=>y+4+(Math.min(0,Math.max(-60,db))/-60)*(h-8);
    c.strokeStyle=css('--grid'); [-20,-40].forEach(d=>{ c.beginPath(); c.moveTo(X(t0),yDb(d)); c.lineTo(X(t1),yDb(d)); c.stroke(); });
    [['vu','#3fbf5f'],['pk','#e8a23a']].forEach(([k,col])=>{ c.strokeStyle=col; c.lineWidth=1.6; c.beginPath();
      for (let i=0;i<=N;i++){ const tt=t0+span*i/N, n=Math.min(C.FS-1,Math.floor(tt*C.FS)); const yy=yDb(10*Math.log10(Math.max(1e-13,m[k][ch][n]))); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); c.lineWidth=1; });
    c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('0 dBFS',X(t0)+2,y+12); c.fillText('−60',X(t0)+2,y+h-4); }});
  L.push({label:'Phase meter (monitored pair)', h:30, draw(c,X,t0,t1,y,h){
    const span=t1-t0, N=Math.min(600,Math.max(80,(X(t1)-X(t0))/2)), w=(X(t1)-X(t0))/N;
    for (let i=0;i<N;i++){ const pa=phaseAt(t0+span*(i+.5)/N); c.fillStyle=pa.leds>10?css('--bad'):css('--accent'); c.globalAlpha=.7; const hh=(pa.leds/15)*(h-6); c.fillRect(X(t0)+i*w, y+h-3-hh, w+.5, hh); c.globalAlpha=1; }
    laneText(c, `${MON_NAME[D.input_number]} · ${phaseAt(SIM.t).leds} of 15 LEDs (more = less in phase)`, X(t0)+6, y+11); }});
  L.push({label:'Speaker feed L / R (mon12…mon78)', h:40, draw(c,X,t0,t1,y,h){
    const m=engine(), span=t1-t0, N=Math.min(1200,Math.max(200,(X(t1)-X(t0))*2));
    [['#3fbf5f',0],['#e0553a',1]].forEach(([col,s])=>{ c.strokeStyle=col; c.beginPath();
      for (let i=0;i<=N;i++){ const tt=t0+span*i/N, n=Math.min(C.FS-1,Math.floor(tt*C.FS)); const yy=y+h/2-Math.max(-1,Math.min(1,m.spk[s][n]*6))*(h/2-3); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); });
    if (D.mute) laneText(c,'muted: “F F F” → main board monitor = NO', X(t0)+6, y+12); }});
  return L;
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ const e=D.log[0]; return e? `<div><b>${e.name}</b> at ${SIM.fmtT(e.t)}</div>`+e.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Turn or push a knob, or press a button. Each step the firmware takes is listed here, with its real function and variable names.</div>'; }
function contentSelectors(){
  const sel=(w,i)=>`<select data-w="${w}" data-i="${i}">${CONTENT_KEYS.map(k=>`<option value="${k}" ${D[w][i]===k?'selected':''}>${CONTENT[k].name}</option>`).join('')}</select>`;
  return `<table class="kv"><tr><th>Rear AES BNC</th><td>IN 1 (ST) ${sel('aes',0)}</td><td>IN 2 (DV) ${sel('aes',1)}</td></tr></table>
    <table class="kv" style="margin-top:6px"><tr><th colspan="4">SDI input: embedded AES pairs (via the DEMUX-3 “v201-aip8-2a” board)</th></tr>
    ${[0,2,4,6].map(i=>`<tr><td>AES ${i+1}</td><td>${sel('sdi',i)}</td><td>AES ${i+2}</td><td>${sel('sdi',i+1)}</td></tr>`).join('')}</table>
    <label class="small"><input type="checkbox" id="dmx" ${D.demux?'checked':''}> DEMUX-3 SDI board fitted</label> <button id="rst">Factory defaults</button>`;
}
function bindContent(m){
  m.querySelectorAll('select[data-w]').forEach(s=> s.onchange=()=>A.setContent(s.dataset.w, +s.dataset.i, s.value));
  const q=id=>m.querySelector(id); if (q('#dmx')) q('#dmx').onchange=e=>A.demuxBoard(e.target.checked); if (q('#rst')) q('#rst').onclick=()=>A.reset();
}
function inspector(t){
  const st=stepAt(t), mm=meterAt(D.meterCh,t), [lo,up]=barWords(mm.bar,mm.dot), tx=txSchedule(), cur=tx.bytes.filter(b=>b.t<=t).pop(), ph=phaseAt(t), [stK,dvK]=inputKeys();
  return `<table class="kv">
    <tr><th>Front loop pass</th><td class="mono">#${st.pass.toLocaleString()} · ${STEPS[st.step][0]}</td></tr>
    <tr><th>screen</th><td class="mono">${SCR_NAME[D.screen]}${D.screen_display!==D.screen?' (screen_display '+SCR_NAME[D.screen_display]+')':''}${D.screen===SCR.SETUP?' · '+SETUP_NAME[D.setup]:''}${D.st_screen?' · st_screen':''}${D.dv_screen?' · dv_screen':''}</td></tr>
    <tr><th>source</th><td class="mono">${SRC_NAME[D.source]}${D.source!==SRC.AES75? ` · front st_number SDI_${D.st_number-11} / dv_number SDI_${D.dv_number-11} · main board sdi_ST ${D.mb.sdi_ST} / sdi_DV ${D.mb.sdi_DV}`:''}</td></tr>
    <tr><th>reaching the SHARC</th><td class="mono">ST ← ${CONTENT[stK].name} · DV ← ${CONTENT[dvK].name}</td></tr>
    <tr><th>ST output</th><td class="mono">st = ${D.st} ${ST_NAME[D.st]} · st_level ${D.st_level} (${D.st_level-61} dB)${D.preset_selector===3?' · PHASE: right inverted':''}</td></tr>
    <tr><th>DV output</th><td class="mono">dv_or_st = ${D.dv_or_st} ${DV_NAME[D.dv_or_st]} · dv_level ${D.dv_level} (${D.dv_level-61} dB) · right = ST mono (always)</td></tr>
    <tr><th>monitor</th><td class="mono">input_number ${D.input_number} = ${MON_NAME[D.input_number]} · volume ${D.mute?'255 (mute)':D.volume+' ('+volTxt(D.volume).trim()+')'} · PORTA 0x${D.input.toString(16).padStart(2,'0')}</td></tr>
    <tr><th>UART0 last byte</th><td class="mono">${cur? `“${bstr(cur.b)}” byte ${cur.i} of ${KIND_NAME[tx.frames[cur.frame].kind]} at ${SIM.fmtT(cur.t)}` : '—'}</td></tr>
    <tr><th>meter ${D.meterCh+1} (${METER_NAME[D.meterCh]})</th><td class="mono">VU ${mm.vuDb.toFixed(1)} dB → index ${mm.vuIdx} → ${mm.bar} LEDs · PPM ${mm.pkDb.toFixed(1)} dB → dot ${mm.dot}</td></tr>
    <tr><th>shift words</th><td class="mono">lower 0x${lo.toString(16).padStart(8,'0')} · upper 0x${up.toString(16).padStart(4,'0')} · phase index ${ph.idx} → ${ph.leds} LEDs · strobe M${Math.floor(t/C.MUX_T)%8+1}</td></tr>
    <tr><th>front EEPROM</th><td class="mono">${D.ee.key===0xAA? `KEY 0xAA · ST AES${D.ee.st_number-11} · DV AES${D.ee.dv_number-11} · st ${D.ee.st} · dv_or_st ${D.ee.dv_or_st} · ST ${D.ee.st_level} · DV ${D.ee.dv_level}` : 'never written (KEY ≠ 0xAA)'}</td></tr>
  </table>`;
}
function viewSim(m){
  window[KEYFLAG] = true;
  m.innerHTML = `
  ${card('Front panel at the playhead — the real ISS3 silkscreen (Feb 2007)', `<div id="fp"></div><div class="small muted" style="margin:3px 0 6px">Silk: GREEN + WHITE plates of ${SIM.src('AIP8-2A - #Master #Obsolete /AIP8-2A - #SILK/AIP8-2A-FRONTSILK-ISS3-curve.cdr','AIP8-2A-FRONTSILK-ISS3-curve.cdr')} (22 Feb 2007), CorelDRAW vector, registered between the crop marks. Meter window, grilles, display, caps and screws from AIP8-2A-FRONT VIEW.pdf.</div><div id="ctl"></div>`)}
  <div class="grid2">
    <div>${card('Rear panel — click IN 1 / IN 2 to change the AES input, SDI IN to plug or unplug it', `<div id="rp"></div><div id="cs" style="margin-top:8px"></div><p class="small muted">The rear is the AMS8-2 (AMS8-M2) silk with AIP8-2A labels: ${inf}, no AIP8-2A rear drawing is in the folder. Yellow tags show the AIP8-2A meanings from the manual.</p>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}</div>
    <div>${card('What the firmware did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('Action log', `<div id="log" class="log"></div>`)}</div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek)', `<canvas id="tl"></canvas>
     <p class="small muted">Front loop time ${inf}: the manual’s “approximately 5 seconds” SDI hold = PRESET_DEBOUNCE 9000 passes → ${(C.LOOP_T*1e3).toFixed(3)} ms per pass. SHARC clock ${inf} 49.152 MHz (as in ams82.js) → one meter strobe every ${(C.MUX_T*1e3).toFixed(4)} ms. Main-board pass ${inf} ≈ 4 ms. Test signals are ${inf}.</p>`)}`;
  const draw=()=>{
    const t=SIM.t;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#ctl').innerHTML=controlsHTML(); bindControls(m.querySelector('#ctl'));
    m.querySelector('#rp').innerHTML=rearSVG(); bindPanel(m.querySelector('#rp'));
    m.querySelector('#insp').innerHTML=inspector(t);
    m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#log').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span> → “${e.disp[0]}” “${e.disp[1]}”</div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(false), {labelW:220});
  };
  m.querySelector('#cs').innerHTML=contentSelectors(); bindContent(m);
  SIM.on('time', ()=>{ draw(); const cs=m.querySelector('#cs'); if (cs && !cs.contains(document.activeElement)){ cs.innerHTML=contentSelectors(); bindContent(m); } });
}

/* ---------------- tutorial (AIP8 2A Manual, “udated” 2015) ---------------- */
const LESSONS = [
  { title:'Meet the AIP8-2A', body:`<p>The AIP8-2A (“Audio Ingest Processor”, quoted to CTV in October 2006) is a 2 RU <b>aural and visual monitor</b> for two AES pairs: the stereo programme (<b>ST</b>) and the described-video programme (<b>DV</b>). It also <b>processes</b> them: each gets ±15 dB of gain and a source choice, and comes out on OUT 1–4.</p>
     <p>The eight bargraphs, left to right: <b>1–2 STEREO INPUT</b>, <b>3–4 DV INPUT</b>, <b>5–6 STEREO OUTPUT</b>, <b>7–8 DV OUTPUT</b>. The 16-character readout, eight lighted buttons (red PHASE, yellow SOURCE, black IN and OUT) and three push-and-turn knobs (ST, DV, VOLUME) are on the right.</p>
     <p class="muted">The simulated rear has stereo programme on IN 1 and a DV mix (programme + narration) on IN 2. Click “Next”.</p>`, check:()=>true, auto:true },
  { title:'1 · Read the normal screen', body:`<p>The left display shows the ST output gain (<span class="mono">ST  0dB</span>), the right one the DV output gain (<span class="mono">DV  0dB</span>). Compare meters 1–2 with 5–6: at 0 dB the ST output is the ST input.</p><p><b>Goal:</b> click meter <b>6</b> (ST OUT R) to follow it on the timeline.</p>`, check:()=>D.meterCh===5, hint:'Click the sixth bar.' },
  { title:'2 · Choose the input type', body:`<p>The yellow <b>AES</b> and <b>SDI</b> buttons choose where ST and DV come from: the rear BNCs IN 1 / IN 2, or two embedded AES pairs in an SDI signal.</p><p><b>Goal:</b> press <b>SDI</b>.</p>`, check:()=>D.source!==SRC.AES75, hint:'Press the fourth button (key 4).' },
  { title:'3 · Open SD Setup', body:`<p>To choose which embedded pairs are ST and DV, press and <b>hold SDI for about 5 seconds</b>. The code counts 9000 main-loop passes. The display shows <span class="mono">SD Setup</span> and the ST pair.</p><p><b>Goal:</b> open SD Setup (Shift+click SDI, key H, or “hold SDI 5 s”).</p>`, check:()=>D.screen===SCR.SETUP, hint:'Shift+click the SDI button.' },
  { title:'4 · Assign the ST pair', body:`<p>Turn the <b>VOLUME</b> knob to choose the ST pair: <span class="mono">ST AES1</span> … <span class="mono">ST AES8</span>. Each detent is sent to the main board at once as “# T n D n $”.</p><p><b>Goal:</b> set ST to <b>AES 3</b> (a 1 kHz tone in this simulation).</p>`, check:()=>D.st_number===SDI_1+2, hint:'Turn VOLUME clockwise twice (P key).' },
  { title:'5 · Assign the DV pair', body:`<p>Turn the <b>ST</b> knob clockwise once: the right display shows <span class="mono">DV AES2</span>. Turn VOLUME to pick the DV pair.</p><p><b>Goal:</b> set DV to <b>AES 4</b> (narration only).</p>`, check:()=>D.dv_number===SDI_1+3, hint:'ST knob clockwise (E), then VOLUME clockwise (P).' },
  { title:'6 · Leave SD Setup', body:`<p>The manual says: turn ST clockwise until <span class="mono">Exit</span>, then press ST. Try it, and read the trace: the press leaves SD Setup but drops you into the ST-source screen, and it does <i>not</i> save the assignment in the front panel’s EEPROM (see Findings). Waiting 4.4 s also leaves, and that path does save.</p><p><b>Goal:</b> get back to the normal screen (press ST twice, or press “wait 4.4 s”).</p>`, check:()=>D.screen===SCR.INFO && !D.st_screen && !D.dv_screen && D.lessonFlags.setupSeen, hint:'Press ST (W) twice, or T for the timeout.' },
  { title:'7 · Listen to a meter pair', body:`<p>The black <b>IN ST / IN DV / OUT ST / OUT DV</b> buttons send one pair to the speakers and the phase meter. Go back to <b>AES</b> first so the rear inputs play again.</p><p><b>Goal:</b> press AES, then <b>OUT DV</b>.</p>`, check:()=>D.source===SRC.AES75 && D.input_number===4, hint:'Keys 3 then 8.' },
  { title:'8 · Set the listening level', body:`<p>Turn VOLUME: the display shows <span class="mono">Volume</span> and the level, OFF, then −60 dB to +15 dB. It returns to the normal screen 4.4 s after you stop.</p><p><b>Goal:</b> set the volume to <b>−20 dB</b>.</p>`, check:()=>!D.mute && D.volume===41, hint:'From −31 dB, eleven detents clockwise (P).' },
  { title:'9 · Mute', body:`<p>Push VOLUME to mute (the main board receives “F F F”). Push again to unmute.</p><p><b>Goal:</b> mute, then unmute.</p>`, check:()=>D.lessonFlags.muted && !D.mute, hint:'O twice.' },
  { title:'10 · ST output gain', body:`<p>On the normal screen, turning the <b>ST</b> knob changes the ST output gain (±15 dB in 1 dB steps). Meters 5–6 follow; 1–2 do not. Every detent also writes eight EEPROM bytes (see the red marks on the timeline).</p><p><b>Goal:</b> set ST to <b>+3 dB</b>.</p>`, check:()=>D.st_level===64, hint:'Three detents clockwise on ST (E).' },
  { title:'11 · ST output source', body:`<p>Push ST to open the ST-source screen (<span class="mono">ST L/R</span>). Turning chooses <span class="mono">ST Left</span>, <span class="mono">ST Rght</span> or <span class="mono">ST L/R</span>. Push ST again to save.</p><p><b>Goal:</b> choose <b>ST Left</b> and push to save.</p>`, check:()=>D.st===2 && !D.st_screen, hint:'W, E, W.' },
  { title:'12 · DV output source', body:`<p>Push DV to open the DV-source screen. The choices are <span class="mono">DV Mono</span> (the manual calls it DV L/R), <span class="mono">DV StIn</span> (ST mono instead of DV), <span class="mono">DV Left</span>, <span class="mono">DV Rght</span>. Since 1.0.0.2 the DV output’s <i>right</i> channel is always ST mono.</p><p><b>Goal:</b> choose <b>DV StIn</b> and push to save. The normal screen then reads <span class="mono">ST Mono</span>.</p>`, check:()=>D.dv_or_st===1 && !D.dv_screen, hint:'S, D, S.' },
  { title:'13 · PHASE', body:`<p>Press <b>OUT ST</b>, put ST back to L/R, then press red <b>PHASE</b>. It inverts the ST output’s right channel. The phase meter under the bars lights up fully, and the DV output’s ST mono (meters 7–8) nearly cancels.</p><p><b>Goal:</b> PHASE on while listening to OUT ST.</p>`, check:()=>D.preset_selector===3 && D.input_number===3, hint:'Key 7, then key 1.' },
  { title:'Done', body:`<p>You have used every control. <b>Software</b> follows each action through the three processors, <b>One second</b> breaks the meters down to samples and strobes, and <b>Findings</b> lists what the code does that the manual does not say.</p>`, check:()=>true, auto:true },
];
let lessonIdx = 0;
function viewTutorial(m){
  window[KEYFLAG] = true;
  m.innerHTML = `<div class="grid2"><div>${card('Front panel', `<div id="fp"></div><div class="small muted" style="margin:3px 0 6px">Silk: GREEN + WHITE plates of ${SIM.src('AIP8-2A - #Master #Obsolete /AIP8-2A - #SILK/AIP8-2A-FRONTSILK-ISS3-curve.cdr','AIP8-2A-FRONTSILK-ISS3-curve.cdr')} (22 Feb 2007), CorelDRAW vector, registered between the crop marks. Meter window, grilles, display, caps and screws from AIP8-2A-FRONT VIEW.pdf.</div><div id="ctl"></div>`)}${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('Tutorial — from the AIP8-2A manual', `<div id="les"></div>`)}${card('Progress', `<div id="prog"></div>`)}</div></div>`;
  const draw=()=>{
    if (D.screen===SCR.SETUP) D.lessonFlags.setupSeen = true; if (D.mute) D.lessonFlags.muted = true;
    const L=LESSONS[lessonIdx], ok=L.check();
    m.querySelector('#fp').innerHTML=frontSVG(SIM.t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#ctl').innerHTML=controlsHTML(); bindControls(m.querySelector('#ctl'));
    m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#les').innerHTML=`<h3>${L.title}</h3>${L.body}
      <p class="${ok?'':'muted'}" style="font-weight:600">${L.auto?'':ok?'✔ Goal reached.':'… goal not reached yet.'}</p>
      ${!ok && L.hint? `<details><summary class="small">Hint</summary><p class="small">${L.hint}</p></details>`:''}
      <div style="display:flex;gap:6px;margin-top:8px"><button id="prev" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="next" ${lessonIdx<LESSONS.length-1?'':'disabled'} class="${ok?'on':''}">Next ▶</button><button id="restart">Restart</button></div>`;
    m.querySelector('#prog').innerHTML=LESSONS.map((l,i)=>`<span class="chip" style="${i===lessonIdx?'border-color:var(--accent);font-weight:600':''}">${i}. ${l.title.replace(/^\d+ · /,'')}</span>`).join('');
    m.querySelector('#prev').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); SIM.refresh(); };
    m.querySelector('#next').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); SIM.refresh(); };
    m.querySelector('#restart').onclick=()=>{ lessonIdx=0; A.reset(); };
  };
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function aesSubframe(sample){   // AES3 subframe: preamble (4) + 24-bit audio LSB first + V U C P; biphase-mark
  const v = Math.max(-8388608, Math.min(8388607, Math.round(sample*8388607))) & 0xFFFFFF;
  const bits=[]; for (let i=0;i<24;i++) bits.push((v>>i)&1); bits.push(0,0,0); const par = bits.reduce((a,b)=>a^b,0); bits.push(par);
  return {v, bits};
}
function viewAnatomy(m){
  window[KEYFLAG] = false;
  m.innerHTML = `${card('The second at sample level', `<canvas id="tl"></canvas><p class="small muted">Pick a zoom of 200 µs to see the ten TDM slots of each 48 kHz frame, or 3.1 ms to see two meter strobes. Lanes that need finer time say so.</p>`)}
  <div class="grid2">${card('AES3 subframe of ST IN L at the playhead', `<div id="aes"></div>`)}${card('What every part does in this frame', `<div id="frame"></div>`)}</div>
  ${card('Shift-register word for the strobed meter', `<div id="shift"></div>`)}`;
  const draw=()=>{
    const t=SIM.t, n=Math.max(0,Math.min(C.FS-1,Math.floor(t*C.FS))), eg=engine(), s=eg.x[0][n], sf=aesSubframe(s);
    SIM.drawLanes(m.querySelector('#tl'), lanes(true), {labelW:220});
    let lvl=1, x=10, svg=''; const W=13, yH=20, yL=60;
    const pre = (n%192===0)? 'Z' : 'X';
    svg += `<text x="10" y="14" font-size="11" fill="var(--ink2)">preamble ${pre} (${pre==='Z'?'block start':'channel A'}) · 24 audio bits LSB first · V U C P · frame ${n%192} of the 192-frame block</text>`;
    const cells = [{lab:pre, pre:true}].concat(sf.bits.map((b,i)=>({lab: i<24? String(b) : 'VUCP'[i-24], b})));
    cells.forEach((cell,i)=>{ const xx=30+i*(W*2+2);
      if (cell.pre){ svg += `<rect x="${xx-20}" y="${yH-2}" width="${W*2+20}" height="${yL-yH+4}" fill="var(--chip)"/><text x="${xx}" y="${yL+18}" font-size="11" fill="var(--ink)">${cell.lab}</text>`; return; }
      lvl ^= 1; const mid = cell.b? (lvl^1) : lvl; const y1=lvl?yH:yL, y2=mid?yH:yL;
      svg += `<path d="M${xx} ${y1}H${xx+W}V${y2}H${xx+2*W}" stroke="var(--accent)" stroke-width="2" fill="none"/>`; if (cell.b) lvl=mid; else lvl=lvl;
      svg += `<text x="${xx+W}" y="${yL+18}" font-size="10" text-anchor="middle" fill="${i<=24?'var(--ink)':'var(--warn)'}">${cell.lab}</text>`; });
    m.querySelector('#aes').innerHTML = `<svg viewBox="0 0 ${40+29*30} 90" style="width:100%">${svg}</svg><p class="small mono">sample ${n} · ${s.toFixed(5)} FS → 0x${sf.v.toString(16).padStart(6,'0')} (two’s complement, 24 bit). The CS8416 decodes this; the FPGA (i2sx4_aes, tdm_data_mux) packs it into SPORT0 slot 0.</p>`;
    const st=stepAt(t), ph=phaseAt(t), k=Math.floor(t/C.MUX_T)%8, mm=meterAt(k,t), [lo,up]=barWords(mm.bar,mm.dot);
    m.querySelector('#frame').innerHTML = `<table class="kv">
      <tr><th>48 kHz frame</th><td class="mono">#${n} · sport0_isr: float ← TDM_IN_audio[0..9], VUMeterCalc, PhaseMeterCalc, ST/DV routing, translate_meter_results</td></tr>
      <tr><th>ST OUT</th><td class="mono">L = ${eg.x[4][n].toFixed(4)}, R = ${eg.x[5][n].toFixed(4)} (st ${ST_NAME[D.st]}${D.preset_selector===3?', phase':''})</td></tr>
      <tr><th>DV OUT</th><td class="mono">L = ${eg.x[6][n].toFixed(4)} (${DV_NAME[D.dv_or_st]}), R = ${eg.x[7][n].toFixed(4)} (ST mono, “april 2,2009”)</td></tr>
      <tr><th>front panel</th><td class="mono">pass #${st.pass.toLocaleString()} · ${STEPS[st.step][0]}<br><span class="muted">${STEPS[st.step][2]}</span></td></tr>
      <tr><th>phase meter</th><td class="mono">sumAVE/diffAVE → index ${ph.idx} → ${ph.leds} LEDs</td></tr>
      <tr><th>timer 1 strobe</th><td class="mono">meter ${k+1} (${METER_NAME[k]}), mux_count ${(Math.floor(t/C.MUX_T)%8)}</td></tr></table>`;
    let bitsSvg=''; const all=[]; for (let i=0;i<16;i++) all.push({b:(up>>i)&1, g:'upper (bar 33–46)'}); for (let i=0;i<32;i++) all.push({b:(lo>>i)&1, g:'lower (PR … bar 32)'}); for (let i=0;i<16;i++) all.push({b: i===8+k?1:0, ph:(i<15 && i<ph.leds)?1:0, g:'select + FLAG8 phase'});
    all.forEach((c,i)=>{ const x=8+i*15; bitsSvg+=`<rect x="${x}" y="10" width="12" height="18" rx="2" fill="${c.b?(i<48?segColour(i<16?33+i:32-(i-16)):'var(--accent2)'):'var(--chip)'}" stroke="var(--line)"/>`; if (i>=48) bitsSvg+=`<rect x="${x}" y="32" width="12" height="8" rx="2" fill="${c.ph?'#5cff3a':'var(--chip)'}" stroke="var(--line)"/>`; });
    bitsSvg += `<text x="8" y="58" font-size="11" fill="var(--ink2)">16 clocks: upper bar bits · 32 clocks: lower bar bits · 16 clocks: sel_1…sel_8 (and the phase word on FLAG8) — FLG0 data, FLG1 clock, FLG2 strobe, FLG3 output enable</text>`;
    m.querySelector('#shift').innerHTML = `<svg viewBox="0 0 980 64" style="width:100%">${bitsSvg}</svg><p class="small mono">meter ${k+1}: ${mm.bar} LEDs + peak dot ${mm.dot} → lower 0x${lo.toString(16).padStart(8,'0')}, upper 0x${up.toString(16).padStart(4,'0')}</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  rear:{x:20,y:40,w:150,h:90,t:'Rear: AES IN 1 (ST) / IN 2 (DV), SDI IN', d:'75 Ω BNC and 110 Ω Phoenix inputs (manual: 0.2–7 V p-p, AES3). SDI IN goes to the DEMUX-3 option board.'},
  demux:{x:20,y:170,w:150,h:70,t:'DEMUX-3 (v201-aip8-2a)', d:'De-embeds two AES groups from SDI. The main board selects them over UART1: sdi_data_out1 = 0xF0 | group(ST), sdi_data_out2 = 0x70 | group(DV). Also gives the re-clocked SDI OUT and the pre-processed AES1/AES2 outputs.'},
  rx:{x:220,y:40,w:150,h:90,t:'CS8416 receivers ×4 (+ref)', d:'AMS8E-1 main board. CS8416_READ_LOCK_ALL / RESET_CS8416 in the main-board loop; SRC bypass bits in register 20.'},
  fpga:{x:420,y:40,w:170,h:200,t:'Cyclone EP1C6Q240C7 + EPCS1', d:'AMS81.qpf / AMS81.bdf (“AMS81A V1.00”): aes_input_router, i2sx4_aes, tdm_data_mux, quad_selector, brightness_ctl. Takes a 64-bit control word (cntrl[]) from the main-board MCU and hands the 20 register words to the SHARC on SPORT1. Bit 42–45: sdi ST/DV assignment.'},
  dsp:{x:640,y:40,w:170,h:120,t:'ADSP-21065L SHARC (V102)', d:'sport0_isr every 48 kHz frame: ST gain/source/phase, DV mono/ST mono/left/right, DV-right = ST mono, VU + PPM + phase meters, monitor pair to the speaker DAC. Background: VUMeterGet ×8, shifter, gain ramp.'},
  tx:{x:860,y:40,w:150,h:90,t:'AES OUT 1–4', d:'OUT 1 and 3 = ST, OUT 2 and 4 = DV (manual). 75 Ω BNC and 110 Ω transformer-balanced Phoenix.'},
  dac:{x:860,y:160,w:150,h:70,t:'Monitor DAC → speakers', d:'audio_out_float+8/+9 = the selected pair × volume. “four speaker system” (manual); 3-pin MONITOR OUTPUT on the rear.'},
  mb:{x:420,y:300,w:170,h:90,t:'Main MCU ATmega128 (Ams8E-1 v2.01)', d:'UART0_translate parses the front-panel frames, ALTERA_SORT builds the 80-byte register image, ALTERA_read_write shifts it to the FPGA. Replies “#A f B c C … $”.'},
  fp:{x:640,y:300,w:170,h:90,t:'Front MCU ATmega128 (AIP8-2A-2)', d:'v100w.c 1.0.0.2, 4.9152 MHz. Three encoders, eight buttons (PINB), eight lamps (PORTA), two displays (PORTC/PORTG). RS-485 to the main board via two ADM3485 (U15 TX, U16 RX).'},
  disp:{x:860,y:290,w:150,h:60,t:'2 × PDSP1884 + 8 KSD buttons', d:'AIP8-2A-1 board: U1 (CS1, left), U2 (CS2, right), PB1–PB8 lighted switches, 300 Ω lamp resistors, 1 kΩ SIP pull-ups.'},
  led:{x:640,y:200,w:170,h:70,t:'8 × 46-LED bars + 15-LED phase', d:'Shift registers clocked by SHARC FLAG0–3 (+FLAG8 phase data). On the AIP8-2A-2 board the eight lines arrive differential on H10 and two DS26LS32A (U6, U7) turn them into logic levels on H6 (routing inferred from the netlist).'},
};
const WIRES = [['rear','rx','AES'],['rear','demux','SDI'],['demux','fpga','AES groups'],['rx','fpga','I²S'],['fpga','dsp','SPORT0 TDM / SPORT1 regs'],['dsp','tx','TDM → FPGA AES tx'],['dsp','dac','mon L/R'],['dsp','led','FLAG0–3, 8'],['mb','fpga','cntrl / 80 bytes'],['fp','mb','RS-485'],['fp','disp',''],['mb','demux','UART1']];
let blockSel='dsp';
function viewBlock(m){
  window[KEYFLAG]=false;
  const cx=b=>BLOCKS[b].x+BLOCKS[b].w/2, cy=b=>BLOCKS[b].y+BLOCKS[b].h/2;
  const draw=()=>{
    let s=`<svg viewBox="0 0 1030 410" style="width:100%"><defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--ink2)"/></marker></defs>`;
    const edge=(a,b)=>{ const B=BLOCKS[b], dx=cx(a)-cx(b), dy=cy(a)-cy(b); const k=Math.min(Math.abs((B.w/2+3)/(dx||1e-9)), Math.abs((B.h/2+3)/(dy||1e-9))); return [cx(b)+dx*k, cy(b)+dy*k]; };
    let labels='';
    WIRES.forEach(([a,b,l])=>{ const [x1,y1]=edge(b,a), [x2,y2]=edge(a,b); s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" stroke-width="1.5" marker-end="url(#ar)"/>`; if (l) labels+=`<text x="${(x1+x2)/2}" y="${(y1+y2)/2-4}" font-size="10" text-anchor="middle" fill="var(--ink)" stroke="var(--panel)" stroke-width="4" paint-order="stroke">${l}</text>`; });
    Object.entries(BLOCKS).forEach(([k,b])=>{ s+=`<g class="blk" data-k="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${k===blockSel?'color-mix(in srgb, var(--accent) 25%, var(--panel))':'var(--panel2)'}" stroke="${k===blockSel?'var(--accent)':'var(--line)'}" stroke-width="2"/><foreignObject x="${b.x+4}" y="${b.y+4}" width="${b.w-8}" height="${b.h-8}"><div xmlns="http://www.w3.org/1999/xhtml" style="font-size:12px;font-weight:600;color:var(--ink)">${b.t}</div></foreignObject></g>`; });
    s+=labels+'</svg>';
    m.innerHTML = card('Block diagram — click a block', s) + card(BLOCKS[blockSel].t, `<p>${BLOCKS[blockSel].d}</p>`) +
      card('Live signal path at the playhead', `<table class="kv"><tr><th>ST in</th><td>${CONTENT[inputKeys()[0]].name}</td><th>DV in</th><td>${CONTENT[inputKeys()[1]].name}</td></tr><tr><th>ST out</th><td>${ST_NAME[D.st]}, ${D.st_level-61} dB${D.preset_selector===3?', R inverted':''}</td><th>DV out</th><td>L: ${DV_NAME[D.dv_or_st]}${D.dv_or_st!==1?', '+(D.dv_level-61)+' dB':''}; R: ST mono</td></tr><tr><th>speakers</th><td colspan="3">${MON_NAME[D.input_number]} × ${D.mute?'mute':volTxt(D.volume).trim()}</td></tr></table>`);
    m.querySelectorAll('.blk').forEach(g=> g.onclick=()=>{ blockSel=g.dataset.k; draw(); });
  };
  SIM.on('time', draw);
}

/* ---------------- schematics (redrawn from the P-CAD netlists) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const h=Math.max(left.length,right.length)*18+30; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.5"/><text x="${x+w/2}" y="${y+16}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y+h+14}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([p,n],i)=>{ const yy=y+34+i*18; s+=`<line x1="${x-40}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+4}" y="${yy+4}" font-size="10" fill="var(--ink)">${p}</text><text x="${x-42}" y="${yy-3}" text-anchor="end" font-size="10" fill="var(--accent2)">${n}</text>`; });
  right.forEach(([p,n],i)=>{ const yy=y+34+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+40}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-4}" y="${yy+4}" text-anchor="end" font-size="10" fill="var(--ink)">${p}</text><text x="${x+w+42}" y="${yy-3}" font-size="10" fill="var(--accent2)">${n}</text>`; });
  return s;
}
const SHEETS = [
  {t:'AIP8-2A-2 · U14 ATmega128(L) — ports', h:520, svg:()=>chip(330,20,220,'U14 ATMEGA128(L)',
    [['2 PE0/RXD0','CPU_RX (U16-1)'],['3 PE1/TXD0','CPU_TX (U15-4,U16-4)'],['4 PE2','SWITCH1 (E1)'],['5 PE3','SWITCH2 (E2)'],['6 PE4','DIS_~CS2'],['7 PE5','DIS_~CS1'],['8 PE6','~WR (H2-19)'],['9 PE7','~RD (H2-18)'],['10–17 PB0–PB7','H1-9…H1-2 via R39–R47 110 Ω'],['18 PG3','DIS_A3'],['19 PG4','DIS_A4'],['20 ~RESET','JTAG2-6, R32 10 k'],['23/24 XTAL','X2 4.9152 MHz, C63/C64 27 p'],['25 PD0','ENCODER2A'],['26 PD1','ENCODER2B'],['27 PD2','SWITCH3 (E3)'],['28 PD3','ENCODER3A'],['29 PD4','ENCODER3B (also “CE3”!)'],['31 PD6','~RST (H2-1)'],['32 PD7','~FL (H2-2)']],
    [['33 PG0','DIS_A0'],['34 PG1','DIS_A1'],['43 PG2','DIS_A2'],['35–42 PC0–PC7','DIS_D0–D7'],['44–51 PA7–PA0','H1-18…H1-11 lamps'],['54–57 PF7–PF4','JTAG2 TDI/TDO/TMS/TCK'],['58 PF3','U15 DE/~RE (TX enable)'],['59 PF2','U16 DE/~RE (RX)'],['60 PF1','ENCODER1A'],['61 PF0','ENCODER1B'],['21/52/64','+5V'],['22/53/63','GNDD']],'redrawn from AIP8-2A-2.net (P-CAD), not the original CAD')},
  {t:'AIP8-2A-2 · encoders E1–E3, RS-485, power', h:420, svg:()=>{
    let s=''; [['E1 (DV)','ENCODER1A/B, SWITCH1',20],['E2 (VOLUME)','ENCODER2A/B, SWITCH2',160],['E3 (ST)','ENCODER3A/B, SWITCH3',300]].forEach(([n,net,y])=>{ s+=chip(130,y,120,n,[['1','A'],['3','B'],['4','SW']],[['2,5','GNDD']],'R 1 k pull-up + 1 k / 0.1 µF RC → '+net); });
    s+=chip(460,20,140,'U15 ADM3485',[['4 DI','CPU_TX'],['2,3 ~RE/DE','PF3']],[['6 A','P4-3'],['7 B','P4-4']],'transmitter to the main board');
    s+=chip(460,160,140,'U16 ADM3485',[['1 RO','CPU_RX (R63 2 k)'],['2,3 ~RE/DE','PF2'],['4 DI','CPU_TX']],[['6 A','P4-1'],['7 B','P4-2']],'receiver from the main board');
    s+=chip(460,310,140,'P1 PAN300',[['1','+5V'],['2','VLEDIN'],['3','GNDD']],[['D1→D2→D3','H6-13/14 (LED supply, C95)']],'VLEDIN drops three 1N4003 diodes');
    return s; }},
  {t:'AIP8-2A-2 · meter line receivers U6 / U7', h:330, svg:()=>chip(120,20,160,'U6 DS26LS32A',[['1,2','H10-1/2'],['6,7','H10-6/5'],['9,10','H10-7/8'],['14,15','H10-4/3']],[['3 1Y','H6-9'],['5 2Y','H6-10'],['11 3Y','H6-11'],['13 4Y','H6-12']],'4 ENABLE = +5V, 12 = GND')+chip(560,20,160,'U7 DS26LS32A',[['1,2','H10-13/14'],['6,7','H10-18/17'],['9,10','H10-19/20'],['14,15','H10-16/15']],[['3 1Y','H6-7'],['5 2Y','H6-8'],['11 3Y','H6-6'],['13 4Y','H6-5']],'eight differential lines in (H10), eight logic lines out (H6) — meter use inferred')},
  {t:'AIP8-2A-1 · displays and buttons', h:470, svg:()=>{
    let s=chip(80,20,160,'U1 PDSP1884',[['1,2','H4-1/2'],['3–6','H4-13…16 (A)'],['20–30','H4-5…12 (D0–D7)'],['14 ~CE','DIS_~CS1']],[['15,11','+5VDIS'],['16,18','GNDA']],'left 8 characters')+chip(80,200,160,'U2 PDSP1884',[['(same bus)','H4'],['14 ~CE','DIS_~CS2']],[['15,11','+5VDIS'],['16,18','GNDA']],'right 8 characters');
    const pbs=[['PB5','Phase','H3-2','PBLED5 H3-11'],['PB1','B','H3-3','PBLED1 H3-12'],['PB2','AES','H3-4','PBLED2 H3-13'],['PB6','SDI','H3-5','PBLED6 H3-14'],['PB3','IN ST','H3-6','PBLED3 H3-15'],['PB7','IN DV','H3-7','PBLED7 H3-16'],['PB4','OUT ST','H3-8','PBLED4 H3-17'],['PB8','OUT DV','H3-9','PBLED8 H3-18']];
    pbs.forEach(([r,l,sw,led],i)=>{ const y=30+i*52; s+=`<rect x="520" y="${y}" width="44" height="36" rx="4" fill="var(--panel2)" stroke="var(--ink)"/><text x="542" y="${y+15}" text-anchor="middle" font-size="10" fill="var(--ink)">${r}</text><text x="542" y="${y+29}" text-anchor="middle" font-size="9" fill="var(--ink2)">${l}</text>
      <line x1="470" y1="${y+12}" x2="520" y2="${y+12}" stroke="var(--ink)"/><text x="466" y="${y+15}" text-anchor="end" font-size="10" fill="var(--accent2)">${sw} (R38 1 k ↑)</text><line x1="564" y1="${y+24}" x2="620" y2="${y+24}" stroke="var(--ink)"/><text x="624" y="${y+27}" font-size="10" fill="var(--accent2)">LED via 300 Ω → ${led}</text>`; });
    return s; }},
];
function viewSchem(m){
  window[KEYFLAG]=false;
  m.innerHTML = SHEETS.map(sh=>card(sh.t+' <span class="small muted">(redrawn)</span>', `<div class="scroll"><svg viewBox="0 0 900 ${sh.h}" style="width:100%;min-width:640px">${sh.svg()}</svg></div>`)).join('') +
    card('Interconnect (button and lamp order)', `<p class="small">AIP8-2A-1 H3 mates AIP8-2A-2 H1 pin for pin (${inf} from the identical 20-pin headers). Button refdes are not in panel order: left to right the switches are PB5, PB1, PB2, PB6, PB3, PB7, PB4, PB8, which lands them on PINB bits 7…0 and the lamps on PORTA bits 0…7 — exactly the BIT7…BIT0 masks in TRANSLATE_PUSHBUTTONS and the BIT0…BIT7 lamp bits in “input”.</p>
    <table class="kv"><tr><th>Panel</th>${BTN_KEYS.map(k=>`<td>${BTN[k].grp} ${BTN[k].label}</td>`).join('')}</tr><tr><th>Refdes</th>${BTN_KEYS.map(k=>`<td>${BTN[k].pb}</td>`).join('')}</tr><tr><th>PINB bit</th>${BTN_KEYS.map(k=>`<td>${Math.log2(BTN[k].pin)}</td>`).join('')}</tr><tr><th>PORTA lamp</th>${BTN_KEYS.map(k=>`<td>${Math.log2(BTN[k].lamp)}</td>`).join('')}</tr><tr><th>Cap colour</th>${BTN_KEYS.map(k=>`<td>${BTN[k].col}</td>`).join('')}</tr></table>`);
}

/* ---------------- software ---------------- */
function regImage(){      // ALTERA_SORT → 20 registers (bytes [4k..4k+3] = bits 31..0)
  const b=new Array(80).fill(0), vol=D.mute?0:D.volume;
  b[3]=1; b[7]=D.dv_or_st; b[11]=D.st; b[40]=b[41]=b[42]=b[43]=61;
  const mon=D.input_number; [44,46,48,50].forEach((i,k)=>{ if (k===mon-1) b[i]=vol; });    // monitor gains (FIXED_OUTPUT_GAIN / volume) — layout inferred
  b[54]=D.st_level; b[55]=D.dv_level;
  b[68]=(D.preset_selector===3?0x08:0)|1;
  b[74]=(((D.mb.sdi_DV&1)+2)<<4)|((D.mb.sdi_ST&1)<<2)|(D.input_number-1);
  b[75]=(D.mute?0x10:0);
  b[79]=0; return b;
}
const REG_NAME = ['1 mode','2 dv_or_st','3 st','4','5','6','7','8','9','10','11 OUT1–4 gain','12 L mon CH1–4','13 L mon CH5–8','14 CH9,10, ST, DV gain','15 R mon CH1–4','16 R mon CH5–8','17 R CH9,10, x, mode2 vol','18 cal / phase (bit 27)','19 routing 2: sdi ST/DV, monitor 9:8','20 routing 1: inputs, SRC, ref'];
function viewSoft(m){
  window[KEYFLAG]=false;
  m.innerHTML = `<div class="grid2"><div>${card('Front panel main loop — v100w.c main()', `<div id="loop"></div>`)}${card('Screen state machine (UPDATE_DISPLAY)', `<div id="fsm"></div>`)}</div>
    <div>${card('UART0 frame being sent', `<div id="frame"></div>`)}${card('SHARC sport0_isr routing — the branch taken now', `<div id="isr"></div>`)}</div></div>
    ${card('Register image the main board shifts to the FPGA (ALTERA_SORT) and the SHARC reads (TDM_IN_ctl)', `<div id="regs" class="scroll"></div>`)}
    ${card('Button and lamp map', `<div id="btn"></div>`)}
    ${card('How each processor gets its code', `<ul class="small">
      <li><b>Front ATmega128</b> (AIP8-2A-2): ImageCraft ICCAVR project <span class="mono">v100.prj</span>; <span class="mono">V100.SRC</span> builds only v100w.c, common.c, control.c, SIEMENS8-3.c. Programmed through JTAG2. Firmware 1.0.0.2 (REVISION1…4).</li>
      <li><b>Main ATmega128</b> (AMS8E-1): <span class="mono">Ams8e-1/v102/v200w.c</span> (“Ams8E-1 V2.01 for Issue 2 PCB (AIP8-2A)”, Feb 19 2007), with a <span class="mono">#pragma text:bootloader</span> section.</li>
      <li><b>SHARC</b>: VisualDSP++ <span class="mono">AMS81.dpj</span> V102; boot image in flash.</li>
      <li><b>FPGA</b>: Quartus <span class="mono">AMS81.qpf</span> (created by 4.1, last opened in 8.0 SP1 per AMS81.qsf), EP1C6Q240C7 + EPCS1.</li></ul>`)}`;
  const draw=()=>{
    const t=SIM.t, st=stepAt(t);
    m.querySelector('#loop').innerHTML = `<table class="kv">${STEPS.map((s,j)=>`<tr class="${j===st.step && D.booted && D.power?'hl':''}"><td class="mono">${s[0]}</td><td class="small">${s[2]}</td></tr>`).join('')}</table><p class="small muted">Pass #${st.pass.toLocaleString()} at the playhead (≈${(C.LOOP_T*1e3).toFixed(3)} ms per pass, ${inf}). Watchdog: WDTCR = 0x08 (≈14 ms), WDR() four times per pass.</p>`;
    const node=(x,y,w,txt,on)=>`<rect x="${x}" y="${y}" width="${w}" height="34" rx="8" fill="${on?'color-mix(in srgb, var(--accent) 30%, var(--panel))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="2"/><text x="${x+w/2}" y="${y+21}" text-anchor="middle" font-size="11" fill="var(--ink)">${txt}</text>`;
    const cur = !D.power? 'off' : !D.booted? 'boot' : D.screen===SCR.SETUP? 's'+D.setup : D.screen_display===SCR.VOLUME? 'vol' : D.dv_screen? 'dv' : D.st_screen? 'st' : 'info';
    m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 560 250" style="width:100%">
      ${node(10,10,110,'boot splash',cur==='boot')}${node(200,10,160,'INFORMATION (ST/DV gain)',cur==='info')}${node(420,10,130,'VOLUME / Mute',cur==='vol')}
      ${node(10,90,150,'ST source (st_screen)',cur==='st')}${node(200,90,160,'DV source (dv_screen)',cur==='dv')}
      ${node(10,180,120,'SD Setup: ST AESn',cur==='s201')}${node(150,180,120,'SD Setup: DV AESn',cur==='s202')}${node(290,180,110,'SD Setup: Exit',cur==='s200')}${node(420,180,130,'GROUP (unreachable)',cur==='s203')}
      <g stroke="var(--ink2)" fill="none"><path d="M120 27H200"/><path d="M360 27H420"/><path d="M85 90V60H220V44"/><path d="M280 90V44"/><path d="M70 180V140H300V44"/><path d="M130 197H150M270 197H290"/></g>
      <text x="368" y="60" font-size="10" fill="var(--ink2)">VOLUME turn/push · 8000 passes back</text><text x="10" y="80" font-size="10" fill="var(--ink2)">push ST</text><text x="290" y="80" font-size="10" fill="var(--ink2)">push DV</text><text x="80" y="170" font-size="10" fill="var(--ink2)">hold SDI 9000 passes; ST knob steps; any ST push leaves (dead branch)</text>
    </svg>`;
    const tx=txSchedule(), cb=tx.bytes.filter(b=>b.t<=t).pop(), fr=cb? tx.frames[cb.frame] : null;
    m.querySelector('#frame').innerHTML = fr? `<p class="mono small">${KIND_NAME[fr.kind]}: ${fr.bytes.map((b,i)=>`<span class="${i===cb.i?'hl':''}">${bstr(b)}</span>`).join(' ')}</p>
      <p class="small muted">Front → main: “# A B C dv_or_st H st E source input_number F vh vt vo G preset preset_selector P st_tens st_ones V dv_tens dv_ones $”. A and B carry no data (they are only markers here); C and H are reused from the AMS8 protocol for the DV and ST flags. Values after letters are raw binary except input_number and preset, which are ASCII.</p>` : '<p class="muted">Nothing sent yet (boot or power off).</p>';
    const brST = D.st===2?'left_only: R = L':D.st===1?'normal: R = R':'right_only: L = R = R';
    const brDV = {0:'dv_mode: (DVL+DVR)/2 × gain → out 2 and 3',1:'st_mode: (STL+STR)/2 → out 2 and 3',2:'dv_mode_l: DVL × gain',3:'dv_mode_r: DVR × gain'}[D.dv_or_st];
    m.querySelector('#isr').innerHTML = `<ol class="small mono">
      <li>TDM_IN_audio[0..9] → float (÷2²³)</li><li>VUMeterCalc · PhaseMeterCalc (8 inputs, 4 pairs)</li>
      <li>out0 = STL × OUT1 gain × st gain (output_gain[0] × [14])</li>
      <li class="hl">stereo = ${D.st} → ${brST}</li>
      <li class="${D.preset_selector===3?'hl':''}">check_phase: phase_on ${D.preset_selector===3?'= 1 → out1 × −1.0':'= 0'}</li>
      <li class="hl">TDM_IN_ctl+1 & 3 = ${D.dv_or_st} → ${brDV}</li>
      <li>st_mode_complete: out4…7 = in4…7</li><li class="hl">“april 2,2009”: out3 = (out0+out1)/2 — DV right is always ST mono</li>
      <li>translate_meter_results → shift_data[24]</li><li class="hl">mon${['12','34','56','78'][D.input_number-1]} (reg 19 bits 9:8 = ${D.input_number-1}) → out8/9 speakers, phase_results[${D.input_number-1}] → ph_shift_data</li></ol>`;
    const b=regImage();
    m.querySelector('#regs').innerHTML = `<table class="kv"><tr><th>reg</th><th>TDM_IN_ctl</th><th>bytes (31…0)</th><th>meaning</th></tr>${REG_NAME.map((n,k)=>`<tr class="${[1,2,13,17,18].includes(k)?'hl':''}"><td>${k+1}</td><td class="mono">+${k}</td><td class="mono">${[0,1,2,3].map(i=>b[4*k+i].toString(16).padStart(2,'0')).join(' ')}</td><td class="small">${n}</td></tr>`).join('')}</table>
      <p class="small muted">Highlighted registers are the ones the AIP8-2A SHARC code reads: +1 (dv_or_st), +2 (st), +13 (ST/DV gain bytes via output_gain+14/+15), +17 (bit 27 phase, bits 26:24 calibration), +18 (monitor select). Monitor-gain byte placement for regs 12–17 is ${inf} (MODE1 mixing code is long).</p>`;
    m.querySelector('#btn').innerHTML = `<table class="kv"><tr><th>bit</th>${[7,6,5,4,3,2,1,0].map(i=>`<td>${i}</td>`).join('')}</tr>
      <tr><th>PINB (button)</th>${[7,6,5,4,3,2,1,0].map(i=>{ const k=BTN_KEYS.find(k=>BTN[k].pin===1<<i); return `<td>${BTN[k].grp} ${BTN[k].label}</td>`; }).join('')}</tr>
      <tr><th>PORTA (lamp)</th>${[7,6,5,4,3,2,1,0].map(i=>{ const k=BTN_KEYS.find(k=>BTN[k].lamp===1<<i); return `<td class="${(D.input>>i)&1?'hl':''}">${BTN[k].grp} ${BTN[k].label}</td>`; }).join('')}</tr></table>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window[KEYFLAG]=false;
  const F = [
    ['Artwork 2026|59: front panel now from the CorelDRAW silk', `${SIM.src('AIP8-2A - #Master #Obsolete /AIP8-2A - #SILK/AIP8-2A-FRONTSILK-ISS3-curve.cdr','AIP8-2A-FRONTSILK-ISS3-curve.cdr')} (22 Feb 2007), vector, both plates. WHITE carries SOURCE / IN / OUT, Phase B AES SDI ST DV ST DV and ST / DV / VOLUME; GREEN carries WARD-BECK SYSTEMS, AIP8-2A and the group brackets over the buttons. The three issues show the panel being re-thought in three months: ${SIM.src('AIP8-2A - #Master #Obsolete /AIP8-2A - #SILK/AIP8-2A-FRONTSILK-CURVE.cdr','FRONTSILK-CURVE.cdr')} (30 Nov 2006) has ST · SOURCE · MONITOR over “L/Only Phase AES SDI 1/2 3/4 5/6 7/8”; ${SIM.src('AIP8-2A - #Master #Obsolete /AIP8-2A - #SILK/AIP8-2A-FRONTSILK-ISS2-curve.cdr','ISS2-curve.cdr')} (18 Jan 2007) already has IN ST/DV and OUT ST/DV but still “L/Only”; ISS3 renames L/Only to “B” and moves Phase to the first button. The silk has no rear; the rear here stays the AMS8-M2 silk (inferred).`],
    ['What the product is', `AIP8-2A = “Audio Ingest Processor” (CTVaip quote.pdf, Oct 16 2006: four units, with an “AIP-2AMM Integral Audio Muxer & Demuxer” and a Dolby E/AC-3 decoder option). It is an AMS8-family monitor (AMS8E-1 main board, SHARC meter code from the AMS8-2, 2 RU chassis) with a new front controller (AIP8-2A-2) and display/button board (AIP8-2A-1), and new SHARC routing that turns the monitor into a two-pair gain/source processor.`],
    ['SD Setup exit branch is dead code', `TRANSLATE_ENCODER3 (v100w.c) sets <span class="mono">screen_display = INFORMATION_SCREEN</span> before testing <span class="mono">if ((screen_display == SETUP_SCREEN) && (setup == …))</span>. All four SD Setup branches can never run. Pushing ST anywhere in SD Setup leaves it (not only on Exit, as the manual says), opens the ST-source screen, and skips the EEPROM save of st_number/dv_number. Only the 8000-pass timeout in ACTIVITY_MONITOR saves them.`],
    ['Stale SDI assignment can come back', `Because of the above, the front panel’s EEPROM can hold old st_number/dv_number while the main board saved the new ones on receipt of “# T … D … $”. After a power cycle the main board is right, but the next time someone opens SD Setup the front panel immediately sends its stale pair (SETUP_COM starts on entry) and overwrites the main board. Any later gain change also writes the stale values, because every save writes all eight bytes. (Code reading; not confirmed on hardware.)`],
    ['GROUP_SCREEN is unreachable', `setup only cycles EXIT 200 → ST 201 → DV 202 (ST_ENCODER_UPDATE bounds), and “setup = GROUP_SCREEN” is commented out in TRANSLATE_SWITCHES. gp_number stays NO1, so SDI is always reported as source SDI12 (4). The group limits in VOLUME_ENCODER_UPDATE are commented out too, so ST and DV can each be any of AES 1–8.`],
    ['How AES 1–8 is really selected', `The main board splits the 3-bit choice: the DEMUX-3 gets only the group (sdi_data_out1 = 0xF0 | SDI_SOURCE1/3/5/7 for ST, 0x70 | … for DV — the odd entries are commented out and mapped to the even one), and the FPGA register 19 byte gets only bit 0: <span class="mono">((sdi_DV & BIT0)+2) << 4 | (sdi_ST & BIT0) << 2</span>. ST comes from FPGA input 1/2 and DV from 3/4.`],
    ['DV “L/R” is mono, and DV right is always ST mono', `ams81_main.asm “changed on april 2,2009 to mono dv in l/r mode”: dv_or_st = 0 sends (DVL+DVR)/2 to both DV outputs, and “added on april 2,2009 to force program mono on out 3” then overwrites DV right with (STL+STR)/2 in every mode. This is the PFV 1.0.0.2 change in the software listing (“DV OUTPUT LEFT = DV SELECTION, RIGHT = ST MONO”). The front panel shows “DV Mono” for that setting, but the 2015 manual still calls it “DV L/R” and does not mention the forced ST mono.`],
    ['PHASE inverts the ST output, not the input', `The manual says PHASE “will invert the RIGHT channel of the ST input”. The SHARC (check_phase) inverts <i>out1</i>, the ST output right, after the ST source selection. Meters 1–2 and the IN ST monitor are unaffected. Because DV-right (and ST Mono on DV) is (out0+out1)/2 computed after the inversion, PHASE on mono programme nearly cancels the ST mono feed.`],
    ['PHASE is cancelled by AES/SDI', `Pressing AES or SDI clears BIT0/BIT1 and sets preset_selector = LEFT_AND_RIGHT, so PHASE turns off whenever the source is changed. The manual does not say so. The main board also powers up with PhaseOn = BIT3 (on) until the first “G” byte arrives (≤ 0.4 s).`],
    ['The “B” button does nothing', `The silk and the front view label the second button “B”. Its handler is commented out: “B input (previously L/only)(reserved in v101)”. The October 2006 drawings (AIP8-2A-FRONT-PANEL.pdf) show it as <b>L/Only</b>, with MONITOR 1/2 3/4 5/6 7/8 where the final panel has IN ST/DV and OUT ST/DV. Register 18 still has a “Left Only flag” (bit 28) and the main board still has LeftOnly, never set.`],
    ['Every gain detent writes the EEPROM', `UPDATE_DISPLAY compares pst_level/pdv_level with st_level/dv_level on every pass and saves all eight bytes when they differ. One ST or DV detent = 8 EEPROM writes ≈ 68 ms (datasheet write time, ${inf}) during which the main loop is stalled, so fast knob turns lose detents; sweeping ±15 dB costs 240 writes against a 100 000-cycle endurance.`],
    ['No “No Lock” on the display', `The NoLock / NoAudio messages in UPDATE_DISPLAY are commented out (“added october 19, 2006” block). The front panel still parses format from the main board’s “#A f …” reply but never shows it, so a missing SDI or AES input is only visible on the meters.`],
    ['Manual vs. code: DV knob options', `Manual: DV LEFT, DV RIGHT, DV L/R, ST IN. Code: DV (shown “DV Mono”), ST (shown “DV StIn” in the DV screen and “ST Mono” on the normal screen), DV_LEFT, DV_RIGHT. TRANSLATE_ENCODER1 writes “ ST Mono”/“ DV+15dB”, but refresh = YES makes UPDATE_DISPLAY overwrite them in the same pass.`],
    ['Protocol document vs. code', `“AIP8 COMMUNICATION PROTOCOL.doc” is marked “(not finished)” and is the AMS8 protocol: register 2 is documented as “15..8 st flag, 7..0 dv flag” and register 3 as reserved, but ALTERA_SORT puts dv_or_st in register 2 byte 0 and st in register 3 byte 0, and the SHARC reads TDM_IN_ctl+1 and +2 accordingly. The doc’s volume F-command note (“send F,F,F to mute”) matches the code.`],
    ['Main board never sends “K”', `In the main board’s UART0_transmit_counter the “K” (analog available) bytes are inside the <span class="mono">uart_tx_data0 == 16</span> branch, testing for 17 and 18, so they are unreachable. The front panel’s parser only checks A, B, C, D, R, T, X anyway.`],
    ['Leftover display defines', `<span class="mono">#define COLON 0x58</span> is “X”, not “:” (0x3A). SIEMENS8-3.c drives a third display chip-enable on PORTD bit 4, which on this board is ENCODER3B (the ST knob): it only toggles that input’s pull-up. The comments in SIEMENS8-3.c say “CE is high” on the lines that drive it low.`],
    ['Files that do not belong to the build', `V100.SRC lists v100w.c, common.c, control.c, SIEMENS8-3.c. mode5.c (3811 lines), SIEMENS8.c and analog.c are in the folder but not built. Ams8e-1/v102 holds the main-board source, not an “AMS8E-1 base” of the front panel as the README suggests; its header says “Ams8E-1 V2.01 for Issue 2 PCB (AIP8-2A)”. The SHARC source still includes ams82_vu_data1/2.dat, byte-identical to the AMS8-2 V205 tables; the header comment says “AMS#82 … March 7,2002”.`],
    ['Quartus version', `The README says Quartus II 4.1 (AMS81.qpf: QUARTUS_VERSION “4.1”, February 28 2005), but AMS81.qsf has LAST_QUARTUS_VERSION “8.0 SP1”: the project was last opened in a much later Quartus.`],
    ['Duplicated files', `The folder root and “AIP8-2A - #Mechanical /” both hold the front-panel PDFs (AIP8-2A-FRONT VIEW.pdf is byte-identical in both); “AIP8-2A - #AIP8-2A-1-ASSY.pdf”, “AIP8-2A - #CTVaip quote.pdf” and “AIP8-2A - #manual … .doc” are renamed copies. AipS82-FRONT PANEL.pdf and CTVaip quote.pdf also sit in “AMS8 #Engineering #TIM”.`],
    ['Encoders', `AMS8-M11 “MODIFIED POD/ENCODER FOR AMS8/AIP8-2A … FOR AIP8-2A ONLY”: part AEC11BR2E-25SD1-20C-OHFJ, shaft shortened by 0.100 in, two per front-panel assembly. The three encoders (E1 DV, E2 VOLUME, E3 ST) each get 1 kΩ / 0.1 µF RC filters before the ATmega128, and the firmware decodes them with the same 32-entry state table as the AMS8 front panels.`],
  ];
  const ASSUME = [
    ['Front loop time 0.556 ms', 'from the manual’s “approximately 5 seconds” SDI hold = 9000 passes'],
    ['SHARC clock 49.152 MHz', 'from TPERIOD0 = 4 giving a 12.288 MHz MCLK (same assumption as ams82.js)'],
    ['Main-board pass ≈ 4 ms', 'ams81.js estimate for the same AMS8E-1 code'],
    ['TDM slots 4–7 are the AES outputs looped back', 'the SHARC copies them straight through (st_mode_complete) and meters them as “stereo/dv output”; the FPGA routing that feeds them was not traced'],
    ['Rear panel = AMS8-M2', 'no AIP8-2A rear drawing; connector names in the manual match the AMS8-2 rear'],
    ['46-segment bars and colours', 'same vu_data tables as the AMS8-2; segment count and colours as in ams82.js'],
    ['Phase-meter LED position and colours', 'the code drives 15 LEDs on FLAG8; the panel position is not drawn anywhere'],
    ['PDSP1884 colour (green) and panel colour', 'no photo of the AIP8-2A in the archive; silk separations are WHITE and GREEN as on the AMS8-2'],
    ['Meter-line receivers U6/U7 carry the SHARC flag lines', 'netlist: 8 differential pairs in on H10, 8 logic lines out on H6 next to the LED supply'],
    ['EEPROM write time 8.5 ms', 'ATmega128 datasheet'],
    ['All test signals', 'not from the archive'],
  ];
  m.innerHTML = card('Findings — what the AIP8-2A is up to', `<ol>${F.map(([h,b])=>`<li style="margin-bottom:8px"><b>${h}.</b> ${b}</li>`).join('')}</ol>`) +
    card('Inferred assumptions in this model', `<table class="kv">${ASSUME.map(([a,b])=>`<tr><td><span class="tag-inf">inferred</span> ${a}</td><td class="small">${b}</td></tr>`).join('')}</table>`) +
    card('Sources', `<ul class="small"><li>AIP8-2A - #Software/…#Atmel/v102: v100w.c, common.c, SIEMENS8-3.c, V100.SRC · …#Atmel/Ams8e-1/v102/v200w.c</li><li>…#sharc/V102: ams81_main.asm, vumeter.asm, phasemeter.asm, ams81_INIT.ASM, sdm_phase_data.dat, ams81_volume_table.dat, trim_data.dat</li><li>…#Altera/v100: AMS81.qpf, AMS81.qsf, AMS81.bdf, tdm_data_mux.vhd</li><li>AIP8-2A - #PCB: AIP8-2A-1/-2 .net and .bom</li><li>AIP8-2A - #Manual/AIP8 2A Manual udated.doc · AIP8 COMMUNICATION PROTOCOL.doc · aip8 operational info.doc</li><li>AIP8-2A - #SILK/AIP8-2A-FRONTSILK-ISS3-curve.cdr · AIP8-2A-FRONT VIEW.pdf · AIP8-2A-FRONT-PANEL.pdf (Oct 2006) · CTVaip quote.pdf</li><li>SOFTWARE LISTINGS - #Engineering.xls (AIP8-2A sheet) · AMS8 #Engineering #TIM/MECHANICAL/AMS8-M11.pdf</li></ul>`);
}

/* ---------------- register plugin ---------------- */
SIM.register({
  footnotes: [{"text": "ISS1 of the front silk (Nov 2006) has ST · SOURCE · MONITOR over “L/Only Phase AES SDI 1/2 3/4 5/6 7/8”.", "src": "AIP8-2A - #Master #Obsolete /AIP8-2A - #SILK/AIP8-2A-FRONTSILK-CURVE.cdr"}, {"text": "ISS2 (Jan 2007) already has IN ST/DV and OUT ST/DV but still starts the button row with “L/Only”.", "src": "AIP8-2A - #Master #Obsolete /AIP8-2A - #SILK/AIP8-2A-FRONTSILK-ISS2-curve.cdr"}, {"text": "ISS3 (Feb 2007) renames L/Only to “B” and moves Phase to the first button. The firmware then reserves B (“previously L/only”).", "src": "AIP8-2A - #Master #Obsolete /AIP8-2A - #SILK/AIP8-2A-FRONTSILK-ISS3-curve.cdr"}, {"text": "The silk has only the control-area legends; the GREEN plate carries WARD-BECK SYSTEMS, AIP8-2A and the brackets over SOURCE / IN / OUT.", "src": "AIP8-2A - #Master #Obsolete /AIP8-2A - #SILK/AIP8-2A-FRONTSILK-ISS3-curve.cdr"}, {"text": "Every issue of the silk is stored twice, as a Backup_of_ copy beside the original.", "src": "AIP8-2A - #Master #Obsolete /AIP8-2A - #SILK/Backup_of_AIP8-2A-FRONTSILK-ISS3-curve.cdr"}, {"text": "No AIP8-2A rear silk exists in the folder, so the rear is the AMS8-M2 silk (inferred).", "src": "AIP8-2A - #Master #Obsolete /AIP8-2A - #SILK/AIP8-2A-FRONTSILK-ISS3-curve.cdr"}],
  id:'aip8-2a', name:'AIP8-2A · stereo + DV audio ingest processor and monitor (2007|40)', duration:1,
  product:'AIP8-2A', year:2007, family:'Obsolete products', folder:'AIP8-2A - #Master #Obsolete ',
  summary:'2 RU aural/visual monitor and processor for a stereo (ST) and a described-video (DV) AES pair, from AES BNCs or two embedded pairs in SDI. Eight LED bargraphs show ST/DV in and out; ST and DV knobs give ±15 dB and source choices; a 16-character readout and eight lighted buttons run on a new ATmega128 front controller talking to the AMS8E-1 main board, Cyclone FPGA and SHARC.',
  highlights:['Front panel on the real ISS3 silkscreen (converted from CorelDRAW)','The SHARC’s ST/DV routing per sample, including the 2009 “DV right = ST mono” change','SD Setup exit branch is dead code: the manual’s Exit step never runs','Every UART byte, EEPROM write and meter strobe on the timeline','14-step operator tutorial from the 2015 manual'],
  depth:'Full model',
  stepUnits:[
    {label:'1 audio sample (48 kHz)', period:()=>1/C.FS},
    {label:'1 TDM slot', period:()=>1/C.FS/10},
    {label:'1 front-panel loop pass', period:()=>C.LOOP_T},
    {label:'1 meter strobe (1.5625 ms)', period:()=>C.MUX_T},
    {label:'1 UART byte slot (26 passes)', period:()=>26*C.LOOP_T, phase:()=>25*C.LOOP_T},
    {label:'1 EEPROM write (8.5 ms)', period:()=>C.EE_WRITE},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.4,'400 ms (one GENERAL frame)'],[0.1,'100 ms'],[C.SCAN_T,'12.5 ms (meter scan)'],[C.MUX_T*2,'3.1 ms (strobes)'],[0.001,'1 ms (loop passes)'],[0.0002,'200 µs (samples, TDM slots)']],
  defaultZoom:1,
  init(){ MKEY=''; TXKEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the AIP8-2A', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewAnatomy},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics (redrawn)', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
