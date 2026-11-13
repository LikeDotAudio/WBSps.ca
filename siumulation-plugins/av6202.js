/* =====================================================================
   AV6202 / AV6202A — utility analog video DA, openGear (Ward-Beck Systems, 2008|41–2012|45)
   OEM: Cobalt 9233.  Full model of the AT90CAN128 firmware (V101 and V200) and of the analog board.
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources (all under #OPENGEAR #SERIES/AV6202 - #Master #OPENGEAR/AV6202 - #Engineering/AV6202A/):
   - Software/atmel/v200/ (V200, SNMP, 2012|45):
       v100w.c      main(), port_init, wait(), REFRESH_LEDS, MIRROR, READ_DIP_SWITCHES (unused)
       LMH1981.c/.h LMH1981_VIDEO_DETECT (VSOUT/HSOUT/FSOUT on PA3/PA2/PA4, video_format codes,
                    NO_VIDEO_CONSTANT 1000, NO_HSYNCH_CONSTANT 12500), LMH1981_SYNCH_DETECT (never called)
       Dashboard.c  PARAMETER_UPDATE, CAN_TX_TIMER (the "Ali-Add" pformat latch), DASHBOARD_RESPONSE_SETUP,
                    MESSAGE_CREATOR_PARAMETER_24 (Video Status ALARM_TABLE), menus, SNMP creators
       CAN.c / CAN.h timer0_ovf_isr (1 ms), timer1_ovf_isr (96 µs, TX_INITIALIZE / TX_HEARTBEAT),
                    can_rx_isr, CAN_FUNCTIONS, CANinit (1 Mbit/s), MultiFrameMessageTransmission
       ADC.c        adc_init, AD_CONVERTER_SETUP, ADDRESS_TABLE (slot ID)
       AV6202A.h    LED macros (PB1 SYNCH, PB2 ERROR), CAN_TX/CAN_RX (PD7), HSYNCH (PINC.3, unused)
       *.s / V100W.mp ICCAVR 7.15 listings and map (cycle counts, code size)
       wbs_ztcpack.txt, cobalt_ztcpack.txt (zeuspack), common.h (WARD_BECK / COBALT define)
   - Software/atmel/v101/ (V101, 2009|42: bootloader + DataSafe; built with COBALT defined)
   - Software/AV6202A SOFTWARE HISTORY.xls (V100 2009-10-10 Cobalt 9233, V101 2009-12-22, V200 2012-02-14)
   - SNMP/v200/AV6202-CARD.mib, AV6202snmpMAP.xls
   - PCB/OBSOLETE/AV6202-iss1.net/.bom/.ECO, PCB/OBSOLETE/ISS2/AV6202-iss2.net/.bom/.ECO, PCB/WORKING/AV6202-iss3.ECO
   - AV6202-ISS3 - #Gerbers.zip: TOP + TSM (copper, mask) and TSS (silk) → assets/av6202-copper.png, av6202-silk.png
     (rendered at 120 dpi over x 2.40…15.40 in, y 5.57…8.65 in; the third-party logo in the silk is blanked)
   - Functional/AV6202A BERGS.cdr (jumper legend), AV6202A-card-edge.cdr, AV6202-card-edge.cdr (rear modules)
     — converted with Inkscape
   - Photos/AV6202 ISS2 Color.jpg (black mask, white silk, level-pot extension shaft)
   - #OPEN GEAR - #Engineering/…/openGear #Manuals #OBSOLETE/AV6202A Manual.pdf (2009|42-12-01)
   - T6401 - #Master…/T6401iss4.net (dual rear: P101/P102 pins 97, 75, 37, 17, 5)
   - #OPEN GEAR - #Engineering/…/OGP_SDK - #Engineering/ZTC-8399/zeuslib/params/alarmtable.c (ALARM_TABLE encoding)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const infT = s => `<span class="tag-inf" title="Not stated in the source; inferred from ${String(s).replace(/"/g,'&quot;')}">inferred</span>`;
const inf = infT('engineering judgement');
const hx = (n,w) => (n>>>0).toString(16).toUpperCase().padStart(w||2,'0');
const card = (title, body, cls) => `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`;
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');

/* ---------------- constants from the source (and what had to be inferred) ---------------- */
const XTAL = 8e6;                                    // v100w.c "Crystal: 8.0000Mhz"; BOM X1 = 8M
const C = {
  PASS_CYC: 223,          // one fast pass of while(1): main + LMH1981 fast path + REFRESH_LEDS + CAN_FUNCTIONS (counted from the .s listings)
  T1_ISR_CYC: 110,        // timer1_ovf_isr incl. register save/restore — inferred (calls CANTX_BUFFER_CHECK/CAN_TX_TIMER only on send ticks)
  T0_ISR_CYC: 60,         // timer0_ovf_isr — inferred
  T1: 12/125000,          // TCNT1 reload 0xFFF4: 12 counts of 8 µs = 96 µs ("actual value: 96.000uSec")
  T1_FIRST: 12000/125000, // timer1_init: TCNT1 = 0xD120 → 12 000 counts = 96 ms to the first overflow
  T0: 1e-3,               // timer0_init: clk/64, TCNT0 = 0x83 → 125 counts = 1 ms
  TX_FRAMES: 10, TX_HEART: 10000,               // CAN.c
  NO_VIDEO: 1000, NO_HSYNC: 12500,              // LMH1981.h
  WAIT3000: (3000*7+9)/XTAL,                    // wait(3000): wdr·subi·sbci·cpi·cpc·brne = 7 cycles/turn → 2.626 ms
  ADC_CONV: 13*64/XTAL,                         // ADCSRA = 0xC6: clk/64 → 125 kHz, 13 clocks per conversion
  WDT: 0.0163,            // WDTCR = 0x08: 16K cycles of the ≈1 MHz watchdog oscillator (data sheet, not archived) — inferred
  CAN_BIT: 1e-6, STUFF: 1.1,                    // CANBT1/2/3 = 0x00/0x04/0x12 at 8 MHz = 1 Mbit/s; stuffing ≈10 % inferred
  HSW: 4.7e-6,            // LMH1981 HSOUT low time ≈ input H-sync width — inferred (data sheet not archived)
  MFC_GAP: 0.0004,        // frame-controller pacing between requests — inferred
};
C.PASS_CPU = C.PASS_CYC/XTAL;
C.PASS = C.PASS_CPU/(1 - C.T1_ISR_CYC/(C.T1*XTAL) - C.T0_ISR_CYC/(C.T0*XTAL));   // ≈32.8 µs with the ISRs stealing time
C.BOOT = [
  [5*C.WAIT3000, 'initialization() → port_init, watchdog_init (WDTCR 0x08), adc_init; DATA_INITIALIZATION: ERROR_LED_ON (NO SYNCH lit); CAN_RX = PD7 high (transceiver loop-back); 5 × wait(3000)'],
  [C.ADC_CONV*2 + 99*(2*C.WAIT3000 + C.ADC_CONV + 6e-6), 'slot ID: while (samples <= 99) AD_CONVERTER_SETUP() — 100 conversions of ADC0 (AN_SLOTID), 2 × wait(3000) between them → average → ADDRESS_TABLE'],
  [0.0004, 'moduleAddress(slot) · DATA_SETUP (getMessageCrc of Menu0/1/2/4OID and ParamOIDS) · CANinit (1 Mbit/s, timer0_init, timer1_init) · CAN_TX = PD7 low'],
];
const SLOT_R = [100000,30900,15000,9760,6980,5360,4320,3570,3010,2550,2210,1910,1650,1470,1270,1130,1000,887,787,681]; // OpenGear Frame Address ID.xls
function slotAdc(slot){ const R=SLOT_R[slot-1]; return Math.min(1023, Math.round(1024*R/(R+1000))); }   // R54 1K pull-up to 3V (netlist)
function ADDRESS_TABLE(v){ const th=[1011,980,948,915,883,851,820,788,755,725,692,658,629,593,563,532,502,471,435,406];
  if (v>1011 && v<=1023) return 1; for (let i=1;i<th.length;i++) if (v>th[i] && v<=th[i-1]) return i+1; return 21; }

/* ---------------- video standards as the LMH1981 sees them ----------------
   codes = the 11-bit line count shifted in from FSOUT (VFOUT) after VSOUT, one per field (LMH1981.c);
   vs = VSOUT low window in lines from the field start (pre-equalising start) — inferred from the standards */
const STD = {
  NTSC:{name:'NTSC 525/59.94', H:1/15734.264, lines:525, il:true, vs:[3,6], codes:[260,259], sync:0.286, white:0.714, setup:0.054, fsc:3579545.45, burst:9, mains:60},
  PAL: {name:'PAL 625/50',     H:64e-6,       lines:625, il:true, vs:[2.5,5], codes:[310,309], sync:0.300, white:0.700, setup:0, fsc:4433618.75, burst:10, mains:50},
  PALM:{name:'PAL-M 525/59.94',H:1/15734.264, lines:525, il:true, vs:[3,6], codes:[260,259], sync:0.286, white:0.714, setup:0.054, fsc:3575611.49, burst:9, mains:60},
  P720:{name:'720p59.94 Y (tri-level)', H:1/(750*60/1.001), lines:750, il:false, vs:[0,5], codes:[747], sync:0.300, white:0.700, setup:0, fsc:0, burst:0, mains:60, tri:true},
  ODD: {name:'Non-standard (VTR shuttle)', H:1/15734.264, lines:525, il:true, vs:[3,6], codes:[255,251], sync:0.286, white:0.714, setup:0.054, fsc:3579545.45, burst:9, mains:60},
};
const FMT = ['NO_LOCK','NTSC480','PAL576','PRO480','PRO576','PRO720','INT1080','PRO1080'];
const FMT_DB = ['No Video Detected','NTSC','PAL','480p','576p','720p','1080i','1080p'];   // MESSAGE_CREATOR_PARAMETER_24 entries
function classify(code){ return ({260:1,259:1,310:2,309:2,522:3,622:4,747:5,560:6,559:6,1122:7})[code]||0; }
function frameT(s){ return s.H*s.lines; }
function fieldT(s){ return s.il? frameT(s)/2 : frameT(s); }

/* ---------------- firmware builds ---------------- */
const BUILDS = {
  wb200: {key:'wb200', ver:'2.00', product:'AV6202A', supplier:'Ward-Beck Systems', nparam:6, snmp:true, latch:true, bin:'av6202a_v2_00.bin', src:'v200, common.h #define WARD_BECK, wbs_ztcpack.txt'},
  wb101: {key:'wb101', ver:'1.01', product:'AV6202A', supplier:'Ward-Beck Systems', nparam:6, snmp:false, latch:false, bin:'av6202a_v1_01.bin', src:'v101 sources with WARD_BECK defined, wbs_ztcpack.txt'},
  cob101:{key:'cob101', ver:'1.01', product:'9233', supplier:'Cobalt Digital', nparam:5, snmp:false, latch:false, bin:'9233_v1_01.bin', src:'v101 as archived (common.h #define COBALT), cobalt_ztcpack.txt'},
};
const FILES = {
  wb200:{name:'av6202a_v2_00.bin', build:'wb200', compat:['AV6202A','9233'], pages:101},
  wb101:{name:'av6202a_v1_01.bin', build:'wb101', compat:['AV6202A','9233'], pages:99},
  cob101:{name:'9233_v1_01.bin', build:'cob101', compat:['AV6202A','9233'], pages:99},
  wrong:{name:'(an AV6201A .bin)', build:null, compat:['AV6201A','9231'], pages:0},
};
const CARD_NAME = 'Analog Video Distribution Amplifier';
const WEBSITE = 'www.ward-beck.com';
const MSG = {0x10:'REPORT_PARAM',0x11:'TRAP',0x13:'BOOTING',0x40:'START_UPGRADE',0x41:'UPGRADE_PAGE',0x42:'VERIFY_UPGRADE',0x43:'REBOOT',0x44:'COMMAND',
  0x45:'GET_NUMPARAMS',0x46:'GET_PARAM_OIDS',0x47:'GET_DESCRIPTOR',0x48:'GET_PARAM_NAME',0x49:'GET_PARAM',0x4A:'SET_PARAM',0x4B:'SET_RELATIVE',
  0x50:'GET_MENUSET_NAME',0x51:'GET_MENU_COUNT',0x52:'GET_MENU_NAME',0x53:'GET_MENU_OIDS',0x56:'GET_SNMP_BASE',0x57:'GET_SNMP_OID',0x58:'GET_SNMP_TRAP'};
const msgName = t => (t & 0x80) ? (MSG[t & 0x7F]||'0x'+hx(t&0x7F))+' resp' : (MSG[t]||'0x'+hx(t));
const oidTxt = o => ((o>>8)&0xFF).toString(16).toUpperCase()+'.'+(o&0xFF).toString(16).toUpperCase();
/* string lengths exactly as the MESSAGE_CREATOR_* functions build them: GET_PARAM = 4 + len + 1; descriptor = len + 14 */
const sResp = s => 4 + s.length + 1, sDesc = s => s.length + 14;
const DESC24_LEN = 105;   // "Video Status" + ALARM_TABLE of 8 entries: [3] = 13 + 79 + 9 = 101, +4
const PARAM_OIDS_WB = [0x0204,0x0105,0x0102,0x010B,0x0106,0x0104], PARAM_OIDS_COB = [0x0204,0x0105,0x0102,0x010B,0x0106];
const MENU0 = [0x0105,0x0106,0x0102,0x0107,0x010B,0x0104,0x0302];   // Menu0OID_Message: count byte 6, 7 pairs follow
const MENU2 = [0x0506,0x0210,0x0214,0x0215,0x0216,0x0502,0x0601,0x0602,0x0603,0x0605,0x0606,0x0607,0x0611,0x0612,0x0618,0x0619,0x061A,0x061B,0x0503,0x0613,0x0614,0x0615,0x0616,0x0617,0x0501,0x0401,0x0402,0x0403,0x0404,0x0405,0x0406,0x0407,0x0604];
const MENUS = {
  '0.0':{name:'Card Info', set:'Status', oids:MENU0, count:6, len:18},
  '1.0':{name:'Input Signal', set:'Control', oids:[0x0204], count:1, len:6},
  '1.1':{name:'Metadata', set:'Control', oids:MENU2, count:18, len:70},
  '1.2':{name:'Audio Processing', set:'Control', oids:[0x0701,0x0702], count:2, len:8},
};
const SNMP = {0x0204:'1.3.1.1', 0x0106:'1.2.1.7', 0x0104:'1.2.1.8', 0x0102:'1.2.1.2', 0x0105:'1.2.1.3', 0x010B:'1.2.1.4'};
const SNMP_TRAP = {0x0204:'0.3', 0x0105:'0.1'};

/* ---------------- rear modules (manual Fig. 2, AV6202-card-edge.cdr, T6301/T6401 netlists) ---------------- */
/* card P1 pin → what drives it (AV6202-iss2.net): BNCn_SIG */
const P1MAP = {97:{k:'in', n:'BNC1_SIG → H2-1 (EXT)'}, 92:{k:'nc', n:'BNC2_SIG — no other node on the card'},
  75:{k:'out', amp:'U5A', r:'R37', n:'BNC3_SIG'}, 80:{k:'out', amp:'U5A', r:'R38', n:'BNC4_SIG'}, 37:{k:'out', amp:'U5B', r:'R39', n:'BNC5_SIG'}, 34:{k:'out', amp:'U5B', r:'R40', n:'BNC6_SIG'},
  17:{k:'out', amp:'U6A', r:'R46', n:'BNC7_SIG'}, 22:{k:'out', amp:'U6A', r:'R47', n:'BNC8_SIG'}, 5:{k:'out', amp:'U6B', r:'R48', n:'BNC9_SIG'}, 12:{k:'out', amp:'U6B', r:'R49', n:'BNC10_SIG'}};
const REARS = {
  T6301:{name:'T6301A — single card, 10 BNC (DFR-8320, even slots)', dual:false, wide:2,
    pos:[['IN',97],['N/C',92],['OUT1',75],['OUT2',80],['OUT3',37],['OUT4',34],['OUT5',17],['OUT6',22],['OUT7',5],['OUT8',12]]},
  T6201:{name:'T6201A — single card, 10 BNC (DFR-8310 only)', dual:false, wide:1,
    pos:[['IN',97],['N/C',92],['OUT1',75],['OUT2',80],['OUT3',37],['OUT4',34],['OUT5',17],['OUT6',22],['OUT7',5],['OUT8',12]]},
  T6401:{name:'T6401A — two cards, 5 BNC each (DFR-8320)', dual:true, wide:2,
    pos:[['IN #2',97],['IN #1',97],['OUT1 #2',75],['OUT1 #1',75],['OUT2 #2',37],['OUT2 #1',37],['OUT3 #2',17],['OUT3 #1',17],['OUT4 #2',5],['OUT4 #1',5]]},
};
const OUT_PINS = [75,80,37,34,17,22,5,12];

/* ---------------- world + firmware state ---------------- */
function mkWorld(){ return {
  slot:4, rear:'T6301', pos:1, card:true, mfc:true, build:'wb200', mask:'black',
  src:{on:true, std:'NTSC', dB:0, loop:false, hum:0}, ref1:'NTSC', ref2:null,
  TERM:'75', EXT:'EXT', REF:1, BAL:'BAL', lvl:0.3243,                       // lvl = pot travel 0 (CCW) … 1 (CW); 0.324 ≈ unity
  loads:[75,75,75,75,75,75,75,75],                                           // load on OUT1…OUT8 (Ω, 0 = open)
};}
function mkFw(w){
  return {
    mode:'app', modeEnd:Infinity, bootIx:-1, timersOn:true,
    hsynch_detected:1, phsynch_detected:1, format:1, pformat:1, video_format:260, video_detect_counter:0, detected_vsynch:0,
    parameter_change:0, parameter_refresh:0, parameter_tx_complete:1, restart_sent:1, restore_start:0,
    frame_count:0, job:null, completed:1, busyUntil:0, txc:0, init:0, quiet:3, t0c:0, rxCount:0,
    reboot_device:0, upgrade_device:0, mob_error:0, slotAdc:slotAdc(w.slot), mod:0x10+ADDRESS_TABLE(slotAdc(w.slot)),
    leds:1, nextPass:0.00001, nextT1:0.00003, nextT0:0.0004, mfcQ:[], mfcNext:Infinity, ee:{bootc:0xFF},
    vph:0.0071, cache:null, upgrade:null,
  };
}
const D = { w:mkWorld(), s0:null, ev:[], second:1, log:[], ver:0, R:null, Rver:-1,
  ui:{dashTab:'input', upl:null, follow:true, blk:'mcu', sheet:0, latchSeen:false} };
function deep(o){ return JSON.parse(JSON.stringify(o, (k,v)=> v===Infinity? '__inf' : v), (k,v)=> v==='__inf'? Infinity : v); }
function resetAll(){
  D.w = mkWorld(); const f = mkFw(D.w); f.cache = cacheFromFw(f, D.w);
  D.s0 = {w:deep(D.w), f}; D.ev=[]; D.second=1; D.log=[]; D.ver++; D.ui.upl=null; D.ui.latchSeen=false;
}

/* ---------------- analog signal path (component values from AV6202-iss2.bom / .net) ----------------
   input:  source 75 Ω → card node (TERM: R2 75R across it; R1 22K bias) → U1B (+) via R4 33R; shield via R5 33R → U1A (+)
   U1A gain 1 + R7/R8 = 2 on the shield; U1B: OUT = 2·Vsig − (R11/R10)·2·Vsh = 2·(Vsig − Vsh) → net VIDEO_IN
   LVL: VIDEO_IN → R12 47R → 2K pot → R13 750R → GND; wiper → R14 10R → U5/U6 (+) inputs
   output amps: gain 1 + 1K/1K = 2, each drives two outputs through 75R back-match resistors */
const R12=47, POT=2000, R13=750, RTOT=R12+POT+R13;
function wiper(p){ return (R13 + POT*p)/RTOT; }
function par(a,b){ return a*b/(a+b); }
function refStd(w){ const s = w.REF===1? w.ref1 : w.ref2; return s; }
/* what reaches the card input node */
function inputNode(w){
  const zl = w.TERM==='75'? par(75, 22000) : 22000;
  if (w.EXT==='REF'){
    const s = refStd(w);
    if (!s) return {on:false, std:null, gain:0, hum:0, src:'REF '+w.REF+' (nothing on it)', zl};
    const g = 0.99 * zl/(30+zl);   // Q1 emitter follower (gain ≈0.99, inferred) → R18 30R → node
    return {on:true, std:s, gain:g, hum:0, src:'frame REF '+w.REF+' via Q1 + R18 30R', zl, refPath:true};
  }
  if (!w.src.on || !w.card) return {on:false, std:null, gain:0, hum:0, src:'rear IN (no cable)', zl};
  const zline = w.src.loop? par(zl, 75) : zl;
  const emf = 2*Math.pow(10, w.src.dB/20);            // 2 V EMF = 1 V p-p into 75 Ω
  return {on:true, std:w.src.std, gain:emf*zline/(75+zline), hum:w.src.hum/1000, src:'rear IN (BNC1, P1-97)', zl:zline};
}
/* stage gains relative to a nominal 1 V p-p signal */
function chain(w){
  const n = inputNode(w);
  const cmrr = w.BAL==='BAL'? 0.01 : 1;   // BAL: shield floats, U1 rejects ≈40 dB of common-mode (resistor matching, inferred); GND: shield tied to GNDD, hum becomes differential
  const vin = n.gain, vidIn = 2*vin, f = wiper(w.lvl), amp = 2*f*vidIn;
  const humIn = n.hum*cmrr*2;
  const outs = w.loads.map(L => L>0? amp*L/(75+L) : amp);
  return {n, vin, vidIn, f, amp, outs, humIn, humOut: humIn*f*2*0.5, clip: amp*1.2 > 7.2};   // EL2244 swing ≈ ±3.6 V on ±5 V — inferred
}
function syncAt(w){ const c=chain(w); if (!c.n.on) return null; const s=STD[c.n.std]; const sy=s.sync*c.vidIn; return (sy>0.12 && sy<1.6)? c.n.std : null; }   // LMH1981 sync slicer range — inferred

/* ---------------- LMH1981 outputs in time ----------------
   frames start at vph + k·frameT; HSOUT falls at every line start (k·H from the frame start), low for HSW;
   VSOUT is low for the vertical sync window of each field; FSOUT (VFOUT) shifts out the field's line code */
function vidGeom(std, vph, t){
  const s=STD[std], Tf=frameT(s), tf=t - (vph + Math.floor((t - vph)/Tf)*Tf), fld = s.il && tf >= Tf/2 ? 1 : 0;
  const fs = fld? Tf/2 : 0, rel = tf - fs;     // time into the field
  return {s, Tf, frame0: t - tf, tf, fld, fs, rel, line: Math.floor(tf/s.H), inLine: tf - Math.floor(tf/s.H)*s.H};
}
function vsLow(std, vph, t){ const g=vidGeom(std, vph, t); return g.rel >= g.s.vs[0]*g.s.H && g.rel < g.s.vs[1]*g.s.H; }
function hsLow(std, vph, t){ const g=vidGeom(std, vph, t); return g.inLine < C.HSW; }
/* LMH1981_VIDEO_DETECT entered while VSOUT is low: loop 1 counts 3 HSOUT falling edges (or VSOUT rises),
   loop 2 shifts FSOUT in at 11 HSOUT rising edges. Returns when it returns and what it read. */
function capture(std, vph, t){
  const g=vidGeom(std, vph, t), s=g.s, H=s.H;
  const vsEnd = g.frame0 + g.fs + s.vs[1]*H;
  let k = Math.floor(g.tf/H)+1, n=0, te=t;
  while (true){ const e = g.frame0 + k*H; if (e > vsEnd + 1e-12) break; n++; te=e; k++; if (n===3) break; }
  const exit = n===3? te : vsEnd, lineStart = g.frame0 + Math.floor((exit - g.frame0)/H + 1e-9)*H;
  const hsLowAtExit = n===3 || (exit - lineStart) < C.HSW;
  const bits=[hsLowAtExit? lineStart + C.HSW : exit];
  for (let i=1;i<11;i++) bits.push(lineStart + i*H + C.HSW);
  const code = s.codes[g.fld % s.codes.length];
  return {t0:t, loop1End:exit, tEnd:bits[10] + 2e-6, bits, code, fld:g.fld, edges1:n};
}

/* ---------------- what an OID reads ---------------- */
function reportVal(f, B){   // CAN_TX_TIMER / GET_PARAM 2.4 (V200 adds the pformat latch)
  if (!f.format){ return {v:1, note:'format == NO_LOCK → BIT0'}; }
  if (B.latch && f.pformat) return {v:1<<f.pformat, note: f.pformat!==f.format? 'pformat latched at '+FMT[f.pformat]+' (format is '+FMT[f.format]+')' : '1 << pformat'};
  return {v:1<<f.format, note:'1 << format'};
}
function valName(v){ if (v==null) return '—'; for (let b=0;b<8;b++) if (v & (1<<b)) return FMT_DB[b]; return 'OK'; }
function oidValue(f, w, o){
  const B=BUILDS[w.build];
  switch(o){ case 0x0204: return reportVal(f,B).v; case 0x0105: return B.product; case 0x0102: return B.supplier; case 0x0106: return CARD_NAME;
    case 0x010B: return B.ver; case 0x0104: return WEBSITE; }
  return null;
}
function cacheFromFw(f,w){ const c={}; [0x0105,0x0102,0x0106,0x010B,0x0104,0x0204].forEach(o=>c[o]=oidValue(f,w,o)); if (BUILDS[w.build].nparam<6) delete c[0x0104]; return c; }
function frameTime(n){ return (67 + 8*n) * C.CAN_BIT * C.STUFF; }
function multiFrames(len){ const n=Math.floor((len+4)/8); const fr=[]; for (let i=0;i<n;i++) fr.push({len:8, flags:i===0?2:0}); fr.push({len: len-(n*8-4), flags:1}); return fr; }

/* =====================================================================
   SIMULATION — discrete-event port of main(), LMH1981_VIDEO_DETECT, the three ISRs and the frame
   controller over one second. Re-run whenever the world or the event list changes.
   ===================================================================== */
function simulate(){
  const S = deep(D.s0), w = S.w, f = S.f, B = () => BUILDS[w.build];
  const ev = D.ev.slice().sort((a,b)=>a.t-b.t);
  const R = {snaps:[], can:[], segs:[], notes:[], caps:[], passes:[], resets:[], sends:[], worlds:[{t:0,w:deep(w)}], ticks0:[], vph:f.vph, end:null, latch:[]};
  let ei=0, t=0;
  const snap = tt => R.snaps.push({t:tt, mode:f.mode, hs:f.hsynch_detected, fmt:f.format, pf:f.pformat, vf:f.video_format, cnt:f.video_detect_counter, leds:f.leds, init:f.init, pc:f.parameter_change, build:w.build});
  const seg = (t0,t1,kind,label) => R.segs.push({t0,t1,kind,label});
  const note = (tt,s) => R.notes.push({t:tt,s});
  /* CAN */
  function txFrame(tt, type, flags, data, desc, dst, oid, val){
    const start=Math.max(tt, f.busyUntil), dur=frameTime(data.length); f.busyUntil=start+dur; f.completed=0;
    const fr={t:start, dur, dir:'tx', src:f.mod, dst:dst===undefined?0x10:dst, type, flags, data, desc, oid, val}; R.can.push(fr); return fr;
  }
  function rxFrame(tt, req){
    const data=[0x00, (req.oid>>8)&0xFF, req.oid&0xFF]; if (req.type===0x4A) data.push(0x02,0x00,req.val&0xFF);
    const dur=frameTime(data.length), start=Math.max(tt,f.busyUntil); f.busyUntil=start+dur;
    R.can.push({t:start, dur, dir:'rx', src:0x10, dst:f.mod, type:req.type, flags:3, data, desc:req.desc||msgName(req.type)+(req.oid!=null?' '+oidTxt(req.oid):''), oid:req.oid}); return start+dur;
  }
  /* DASHBOARD_RESPONSE_SETUP */
  function respond(tt, req){
    const o=req.oid||0, type=req.type, rt=type|0x80, b1=(o>>8)&0xFF, b2=o&0xFF, Bd=B();
    const single=(data,desc,oid,val)=>{ f.frame_count=0; f.job=null; return txFrame(tt, rt, 3, data, desc, 0x10, oid, val); };
    const unsup=why=>single([0x01],'CANRESP_UNSUPPORTED'+(why?' — '+why:''));
    const multi=(len,name)=>{ const fr=multiFrames(len); f.job={type:rt, frames:fr, i:1, name}; f.frame_count=1; return txFrame(tt, rt, fr[0].flags, new Array(fr[0].len).fill(0), name+' frame 1/'+fr.length+' (length '+len+', CRC)'); };
    const strOf = {0x0105:Bd.product, 0x0106:CARD_NAME, 0x0102:Bd.supplier, 0x0104:WEBSITE, 0x010B:Bd.ver};
    const dname = {0x0105:'Product', 0x0106:'Name', 0x0102:'Supplier', 0x0104:'Website', 0x010B:'Software Rev'};
    switch(type){
      case 0x45: return single([0,0,Bd.nparam], 'NUMPARAMS = '+Bd.nparam+' (*(ParamOIDS_Message+3))');
      case 0x46: return o? unsup('only 0.0') : multi(4+2*Bd.nparam, 'ParamOIDS_Message');
      case 0x47:
        if (o===0x0204) return multi(DESC24_LEN, 'MESSAGE_CREATOR_PARAMETER_24 “Video Status” ALARM_TABLE');
        if (dname[o] && !(o===0x0104 && Bd.nparam<6 && false)) return multi(sDesc(dname[o]), 'MESSAGE_CREATOR_'+({0x0105:'PRODUCT',0x0106:'NAME',0x0102:'SUPPLIER',0x0104:'WEBSITE',0x010B:'SOFTWARE_REVISION'})[o]+' “'+dname[o]+'”');
        if (o===0x020E) return multi(sDesc('VANC Line Number')+14, 'MESSAGE_CREATOR_PARAMETER_2E “VANC Line Number” (SDI leftover)');
        if (o===0x020F) return multi(sDesc('Embedded Audio')+10, 'MESSAGE_CREATOR_PARAMETER_2F “Embedded Audio” (SDI leftover)');
        return unsup('no descriptor for '+oidTxt(o));
      case 0x49:
        if (o===0x0204){ const r=reportVal(f,Bd); if (Bd.latch && f.format && !f.pformat){ f.pformat=f.format; } if (!f.format) f.pformat=0;
          return single([0,2,4,2,0,r.v], 'GET_PARAM 2.4 = 0x'+hx(r.v,4)+' “'+valName(r.v)+'” ('+r.note+')', 0x0204, r.v); }
        if (strOf[o]!==undefined) return multi(sResp(strOf[o]), 'MESSAGE_CREATOR_'+({0x0105:'PRODUCT',0x0106:'NAME',0x0102:'SUPPLIER',0x0104:'WEBSITE',0x010B:'SOFTWARE_REVISION'})[o]+'_RESPONSE “'+strOf[o]+'”');
        return unsup(o===0x0107? '1.7 is in Menu0OID but its handler (ParamBoardRev) is commented out' : oidTxt(o));
      case 0x4A:
        if (o===0x0204){ const v = f.format? 1<<f.format : 1; return single([0,2,4,2,0,v], 'SET 2.4 (read-only) → echoes 1 << format = 0x'+hx(v,4)+', ignores pformat', 0x0204, v); }
        if (o===0xFF07){ f.restore_start=req.val&0xFF; return single([0,0xFF,7,2,0,req.val], 'SET 255.7 → restore_start = '+f.restore_start+(f.restore_start?' (heartbeat REPORT_PARAM stops)':'')); }
        if (o===0xFF08){ f.restore_start=((req.val^0xFF)&1); return single([0,0xFF,8,2,0,req.val], 'SET 255.8 → restore_start = INVERT_DATA(v) & BIT0 = '+f.restore_start); }
        return unsup(oidTxt(o)+' (no writable parameters)');
      case 0x50: return b1===0? multi(sResp('Status'),'MESSAGE_CREATOR_MENU_SET1 “Status”') : b1===1? multi(sResp('Control'),'MESSAGE_CREATOR_MENU_SET2 “Control”') : unsup();
      case 0x51: return b1<2? single([0,b1,b1?3:1], 'MENU_COUNT set '+b1+' = '+(b1?3:1)) : unsup();
      case 0x52: { const m=MENUS[b1+'.'+b2]; return m? multi(sResp(m.name), 'MESSAGE_CREATOR_MENU_NAME “'+m.name+'”') : unsup(); }
      case 0x53: { const m=MENUS[b1+'.'+b2]; return m? multi(m.len, 'Menu OIDs “'+m.name+'” (count '+m.count+')') : unsup(); }
      case 0x56: return Bd.snmp? multi(14, 'MESSAGE_CREATOR_GET_SNMP_BASE_RESPONSE “25030.1.1.6”') : unsup('no SNMP before V200');
      case 0x57: if (!Bd.snmp) return unsup('no SNMP before V200'); return SNMP[o]? multi(sResp(SNMP[o]), 'GET_SNMP_OID '+oidTxt(o)+' → “'+SNMP[o]+'”') : single([0x11,b1,b2], 'OGP_PARAM_NOTFOUND (0x11)');
      case 0x58: if (!Bd.snmp) return unsup('no SNMP before V200'); return SNMP_TRAP[o]? multi(sResp(SNMP_TRAP[o]), 'GET_SNMP_TRAP '+oidTxt(o)+' → “'+SNMP_TRAP[o]+'”'+(o===0x0105?' (not in the MIB)':'')) : single([0x11,b1,b2], 'OGP_PARAM_NOTFOUND (0x11)');
      case 0x43: f.reboot_device=1; return single([0], 'REBOOT ok → reboot_device = YES');
      case 0x40: f.reboot_device=1; f.upgrade_device=1; return single([0x14,0x03,0xE8], 'CAN_UPGRADE_WAIT, 0x03E8 = 1000 ms → reboot_device = upgrade_device = YES');
      default: return unsup();
    }
  }
  function loaderRespond(tt, req){
    if (req.type===0x40){ const ok = req.file && req.file.compat.indexOf(B().product)>=0;
      if (!ok){ txFrame(tt, 0xC0, 3, [0x11], 'startUpgrade: CAN_INVALID_PRODUCT (isCompatibleProduct fails)'); return; }
      f.upgrade={file:req.file.name, at:tt}; txFrame(tt, 0xC0, 3, [0], 'startUpgrade: CANRESP_OK — erase signature page, USTATE_UPGRADING'); return; }
    txFrame(tt, req.type|0x80, 3, [0x01], 'bootloader: CANRESP_UNSUPPORTED');
  }
  /* CAN_TX_TIMER (from timer1_ovf_isr) */
  function canTxTimer(tt){
    if (f.completed){
      f.completed=0;
      if (f.frame_count===0 && !f.restart_sent){ txFrame(tt, 0x11, 3, [0x01], 'TRAP CANTRAP_RESTART → CANADDR_TRAP', 0x02); f.restart_sent=1; }
      else if (f.frame_count===0 && !f.restore_start){
        const r=reportVal(f, B());
        if (B().latch){ if (f.format){ if (!f.pformat) f.pformat=f.format; } else f.pformat=0; }
        txFrame(tt, 0x10, 3, [0,2,4,2,0,r.v], 'REPORT_PARAM Video Status (2.4) = 0x'+hx(r.v,4)+' “'+valName(r.v)+'”'+(r.note.startsWith('pformat')?' — '+r.note:''), 0x02, 0x0204, r.v);
        f.parameter_tx_complete=1; f.parameter_change=0; R.sends.push(tt);
        if (B().latch && f.format && f.pformat && f.pformat!==f.format) R.latch.push(tt);
      } else if (f.frame_count!==0 && f.job){
        const j=f.job, fr=j.frames[j.i];
        txFrame(tt, j.type, fr.flags, new Array(fr.len).fill(0), j.name+' frame '+(j.i+1)+'/'+j.frames.length+(fr.len===0?' (zero-length last frame)':''));
        j.i++; if (j.i>=j.frames.length){ f.frame_count=0; f.job=null; } else f.frame_count=j.i;
      }
    }
  }
  function t1Tick(tt){
    if (f.busyUntil<=tt) f.completed=1;                       // CANTX_BUFFER_CHECK
    if (f.frame_count!==0){ canTxTimer(tt); if (f.frame_count!==0){ if (f.txc > C.TX_FRAMES){ if (f.busyUntil<=tt) f.completed=1; canTxTimer(tt); f.txc=0; } else f.txc++; } }
    else if (f.init){ if (f.txc > 1000*(f.mod-0x10)){ canTxTimer(tt); f.txc=0; } else f.txc++; }
    else { if (f.txc > C.TX_HEART){ canTxTimer(tt); f.txc=0; } else f.txc++; }
    f.nextT1 = tt + C.T1;
  }
  function t0Tick(tt){
    if (f.t0c >= 1000){
      if (f.rxCount < 10){ f.quiet++; if (f.quiet>=3 && f.init){ f.init=0; note(tt,'timer0: < 10 CAN messages for 3 s → dashboard_initializing = NO (reports every 10 000 ticks)'); } }
      else { if (!f.init) note(tt,'timer0: '+f.rxCount+' messages this second → dashboard_initializing = YES (reports every 1000 × slot ticks)'); f.init=1; f.quiet=0; }
      f.rxCount=0; f.t0c=0; R.ticks0.push(tt);
    } else f.t0c++;
    f.nextT0 = tt + C.T0;
  }
  /* one pass of while(1) */
  function mainPass(tt){
    const std = syncAt(w);
    let tEnd = tt + C.PASS;
    const prevHs = f.hsynch_detected, prevFmt=f.format;
    if (std && vsLow(std, R.vph, tt)){
      const cp = capture(std, R.vph, tt); cp.std=std; R.caps.push(cp);
      f.video_format = cp.code; const fm = classify(cp.code);
      if (fm) f.format = fm;          // unknown codes: detect = YES, format unchanged
      f.hsynch_detected = 1; f.video_detect_counter = 0; R.resets.push({t:cp.tEnd, kind:'cap'});
      tEnd = cp.tEnd + C.PASS*0.55;
    } else {
      R.passes.push(tt);
      if (f.video_detect_counter === C.NO_VIDEO){ f.hsynch_detected=0; f.format=0; f.video_detect_counter=0; R.resets.push({t:tt, kind:'timeout'}); }
      else f.video_detect_counter++;
    }
    if (f.hsynch_detected!==prevHs) note(tt, 'LMH1981_VIDEO_DETECT → hsynch_detected = '+(f.hsynch_detected?'YES':'NO')+' → REFRESH_LEDS: '+(f.hsynch_detected?'SYNCH_LED_ON (PB1), ERROR_LED_OFF':'SYNCH_LED_OFF, ERROR_LED_ON (PB2)'));
    if (f.format!==prevFmt) note(tt, 'format '+FMT[prevFmt]+' → '+FMT[f.format]+(f.format? ' (video_format = '+f.video_format+')' : ' (video_detect_counter reached NO_VIDEO_CONSTANT)'));
    f.leds = f.hsynch_detected? 1 : 2;
    /* CAN_FUNCTIONS → PARAMETER_UPDATE */
    if (f.hsynch_detected!==f.phsynch_detected && !f.parameter_change){ f.parameter_refresh=0; f.parameter_change=1; f.phsynch_detected=f.hsynch_detected; }
    else if (!f.parameter_change && f.parameter_tx_complete) f.parameter_refresh=0;
    if (f.mob_error){ f.mob_error=0; f.nextT1 = tEnd + C.T1_FIRST; f.nextT0 = tEnd + C.T0; note(tEnd, 'CAN_FUNCTIONS: MOB_error → CANinit() — re-runs timer0_init/timer1_init (TCNT1 = 0xD120: next timer1 tick in 96 ms)'); }
    if (f.reboot_device){
      if (f.upgrade_device){ f.ee.bootc=0x01; note(tEnd,'CAN_FUNCTIONS: CLI; eepromWriteByte(BOOT_CONTROL 0xFFE, BOOTC_RUNLDR); while(1) CLI();'); }
      else note(tEnd,'CAN_FUNCTIONS: reboot_device → while(1) CLI(); no WDR, so the watchdog resets the AVR');
      f.mode='wdt'; f.modeEnd=tEnd+C.WDT; f.timersOn=false; seg(tEnd, f.modeEnd, 'wdt', 'while(1) CLI(); watchdog timeout ≈16 ms'); snap(tEnd); return;
    }
    if (f.hsynch_detected!==prevHs || f.format!==prevFmt || R.snaps.length<2) snap(tt);
    f.nextPass = tEnd;
  }
  function startBoot(tt){
    f.mode='boot'; f.bootIx=0; f.modeEnd=tt+C.BOOT[0][0]; f.timersOn=false; f.leds=2;
    f.hsynch_detected=0; f.phsynch_detected=0; f.format=0; f.pformat=0; f.video_detect_counter=0; f.video_format=0;
    seg(tt, f.modeEnd, 'boot', C.BOOT[0][1]); note(tt, 'main(): '+C.BOOT[0][1]); snap(tt);
  }
  function bootStep(tt){
    f.bootIx++;
    if (f.bootIx < C.BOOT.length){ f.modeEnd=tt+C.BOOT[f.bootIx][0]; seg(tt, f.modeEnd, 'boot', C.BOOT[f.bootIx][1]);
      if (f.bootIx===2){ f.slotAdc=slotAdc(w.slot); f.mod=0x10+ADDRESS_TABLE(f.slotAdc); note(tt,'ad_result = '+f.slotAdc+' → ADDRESS_TABLE = slot '+(f.mod-0x10)+' → mod_address 0x'+hx(f.mod)); }
      snap(tt); return; }
    f.mode='app'; f.timersOn=true; f.init=1; f.quiet=0; f.restart_sent=0; f.txc=0; f.frame_count=0; f.job=null; f.completed=1; f.restore_start=0;
    f.nextT1=tt+C.T1_FIRST; f.nextT0=tt+C.T0; f.t0c=0; f.rxCount=0; f.nextPass=tt; f.parameter_change=0; f.parameter_tx_complete=1;
    note(tt,'CAN_TX: PD7 low, transceiver on the bus; while(1) starts (first timer1 tick in 96 ms)'); snap(tt);
  }
  function enterLoader(tt){
    f.mode='loader'; f.leds=0; f.timersOn=false; f.ee.bootc=0xFF;
    seg(tt, Math.max(tt+0.0005, 1), 'loader', 'Ross OGP bootloader at 0x1E000: CAN only, card LEDs dark (it drives PG3/PG4, not wired here)');
    txFrame(tt+0.002, 0x13, 3, [65,86,54,50,48,50,65], 'BOOTING “'+B().product+'” → CANADDR_TRAP', 0x02); snap(tt);
  }
  function mfcStep(tt){
    if (!f.mfcQ.length){ f.mfcNext=Infinity; return; }
    if (f.busyUntil>tt || f.frame_count){ f.mfcNext=Math.max(f.busyUntil, tt+C.T1); return; }
    const req=f.mfcQ.shift(), tE=rxFrame(tt, req);
    if (f.mode==='app'){ f.rxCount++; respond(tE, req); }
    else if (f.mode==='loader') loaderRespond(tE, req);
    f.mfcNext = f.mfcQ.length? Math.max(f.busyUntil, tE)+C.MFC_GAP : Infinity;
  }
  function applyEvent(e, tt){
    switch(e.kind){
      case 'world': e.fn(w, f); note(tt, e.label); R.worlds.push({t:tt, w:deep(w)}); break;
      case 'mfc': f.mfcQ.push(...e.reqs); if (f.mfcNext===Infinity) f.mfcNext=tt; note(tt, e.label); break;
      case 'canerr': f.mob_error=1; note(tt,'CAN error interrupt: can_rx_isr leaves MOB_error = YES'); break;
      case 'insert': w.card=true; R.worlds.push({t:tt, w:deep(w)}); startBoot(tt); break;
      case 'remove': w.card=false; R.worlds.push({t:tt, w:deep(w)}); f.mode='off'; f.timersOn=false; f.leds=0; seg(tt,1,'off','card out of the frame'); snap(tt); break;
      case 'loaderdone': if (f.mode==='loader'){ note(tt,'VERIFY_UPGRADE ok → rebootApp → application main()'); w.build=e.build; R.worlds.push({t:tt,w:deep(w)}); startBoot(tt); } break;
    }
  }
  if (f.mode==='boot') seg(0, f.modeEnd, 'boot', C.BOOT[f.bootIx][1]);
  else if (f.mode==='loader') seg(0, 1, 'loader', 'Ross OGP bootloader running');
  else if (f.mode==='off') seg(0, 1, 'off', 'card out of the frame');
  else if (f.mode==='wdt') seg(0, f.modeEnd, 'wdt', 'watchdog');
  snap(0);
  let guard=0;
  while (guard++ < 300000){
    const tEv = ei<ev.length? ev[ei].t : Infinity, run=f.mode==='app', tm=f.timersOn && run;
    const cands=[tEv, run? f.nextPass : Infinity, tm? f.nextT1 : Infinity, tm? f.nextT0 : Infinity, (f.mode==='boot'||f.mode==='wdt')? f.modeEnd : Infinity, (run||f.mode==='loader')? f.mfcNext : Infinity];
    let tn=Infinity, k=-1; for (let i=0;i<cands.length;i++) if (cands[i]<tn){ tn=cands[i]; k=i; }
    if (tn>1) break; t=tn;
    if (k===0){ applyEvent(ev[ei++], t); continue; }
    if (k===1){ mainPass(t); continue; }
    if (k===2){ t1Tick(t); continue; }
    if (k===3){ t0Tick(t); continue; }
    if (k===4){ if (f.mode==='boot') bootStep(t); else { note(t,'watchdog reset → '+(f.ee.bootc===0x01?'BOOTRST → bootloader':'application main()')); f.reboot_device=0; f.upgrade_device=0; if (f.ee.bootc===0x01) enterLoader(t); else startBoot(t); } continue; }
    if (k===5){ mfcStep(t); continue; }
  }
  R.end = S;
  ['nextPass','nextT1','nextT0','modeEnd','mfcNext','busyUntil'].forEach(k=>{ if (isFinite(f[k])) f[k]-=1; });
  const sw = syncAt(w) || w.src.std; const Tf = frameT(STD[sw] || STD.NTSC); f.vph = (((R.vph - 1) % Tf) + Tf) % Tf;
  R.can.sort((a,b)=>a.t-b.t);
  R.cache0 = Object.assign({}, D.s0.f.cache); const c=Object.assign({}, D.s0.f.cache); R.cacheEv=[];
  R.can.forEach(fr=>{ if (fr.dir==='tx' && fr.oid!==undefined && fr.val!==undefined){ c[fr.oid]=fr.val; R.cacheEv.push({t:fr.t+fr.dur, oid:fr.oid, v:fr.val}); } });
  if (R.can.some(fr=>fr.dir==='tx' && /PRODUCT_RESPONSE|SOFTWARE_REVISION_RESPONSE/.test(fr.desc))){ const Bd=BUILDS[w.build]; c[0x0105]=Bd.product; c[0x0102]=Bd.supplier; c[0x010B]=Bd.ver; }
  f.cache=c;
  return R;
}
function sim(){ if (D.Rver!==D.ver || !D.R){ D.R=simulate(); D.Rver=D.ver; } return D.R; }
function snapAt(t){ const s=sim().snaps; let lo=0, hi=s.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if (s[m].t<=t) lo=m; else hi=m-1; } return s[lo]; }
function segAt(t){ let r=null; for (const g of sim().segs) if (g.t0<=t && t<g.t1) r=g; return r; }
function capAt(t){ for (const c of sim().caps) if (c.t0<=t && t<c.tEnd) return c; return null; }
function lastCap(t){ let r=null; for (const c of sim().caps){ if (c.t0<=t) r=c; else break; } return r; }
function cacheAt(t){ const R=sim(); const c=Object.assign({}, R.cache0); for (const e of R.cacheEv){ if (e.t>t) break; c[e.oid]=e.v; } return c; }
function worldAt(t){ const ws=sim().worlds; let r=ws[0]; for (const x of ws){ if (x.t<=t) r=x; else break; } return r.w; }
function counterAt(t){ const R=sim(), sn=snapAt(t); if (sn.mode!=='app') return 0; let last=null; for (const r of R.resets){ if (r.t<=t) last=r; else break; }
  const t0 = last? last.t : 0, base = last? 0 : (D.s0.f.video_detect_counter||0); const cp=capAt(t); if (cp) return base; return Math.min(C.NO_VIDEO, base + Math.floor((t - t0)/C.PASS)); }

/* =====================================================================
   USER ACTIONS — each one is an event at the playhead and logs the code path it takes
   ===================================================================== */
function rollSecond(){ const R=sim(); D.s0={w:deep(R.end.w), f:deep(R.end.f)}; D.ev=[]; D.second++; D.ver++; SIM.seek(0); }
function addEvent(e){ let t=SIM.t; if (t>0.94){ rollSecond(); t=0.02; } e.t=Math.max(0.0005,t); D.ev.push(e); D.ver++; return e.t; }
function act(name, fn){
  const trace=[]; const tr=s=>trace.push(s);
  const t = fn(tr);
  D.log.unshift({name, t: t===undefined? SIM.t : t, sec:D.second, trace}); if (D.log.length>40) D.log.pop();
  if (D.ui.follow && t!==undefined) SIM.seek(Math.min(0.999, t+0.002)); else SIM.refresh();
}
const worldEv = (label, fn) => addEvent({kind:'world', label, fn});
const mfcEv = (label, reqs) => addEvent({kind:'mfc', label, reqs});
function fwNow(){ return snapAt(SIM.t); }
function withW(fn){ const w=deep(worldAt(SIM.t)); fn(w); return w; }
const vpp = v => (v*1000).toFixed(0)+' mV p-p';
const dB = v => (v>0? (20*Math.log10(v)).toFixed(1) : '−∞')+' dB';
function detectTxt(w){ const s=syncAt(w); return s? 'LMH1981 (U2) sees '+STD[s].name+' sync on VIDEO_IN → VSOUT/HSOUT toggle; next VSOUT: LMH1981_VIDEO_DETECT reads video_format = '+STD[s].codes.join(' / ')+' → '+(classify(STD[s].codes[0])? FMT[classify(STD[s].codes[0])] : 'no match: detect = YES, format unchanged')
  : 'LMH1981 sees no sync → VSOUT stays high; video_detect_counter climbs 1 per pass to NO_VIDEO_CONSTANT (1000 passes ≈ '+(1000*C.PASS*1000).toFixed(0)+' ms) → hsynch_detected = NO, format = NO_LOCK'; }
const A = {
  plug(){ const w0=worldAt(SIM.t); act((w0.src.on?'Unplug':'Plug in')+' the video feed at rear IN (BNC1)', tr=>{
      const w=withW(x=>x.src.on=!x.src.on); const t=worldEv('rear IN '+(w.src.on?'plugged':'unplugged'), x=>{ x.src.on=w.src.on; });
      if (w.EXT==='REF') tr('EXT/REF (H2) is on REF: the rear BNC only reaches H2-1, so the card does not see this cable');
      tr(detectTxt(w)); tr('REFRESH_LEDS every pass: '+(syncAt(w)?'SYNCH (LED1, green) on, NO SYNCH off':'SYNCH off, NO SYNCH (LED2, red) on'));
      tr('PARAMETER_UPDATE: hsynch_detected ≠ phsynch_detected → parameter_change = YES. Nothing is sent early: the next REPORT_PARAM 2.4 waits for the timer1 count (TX_HEARTBEAT 10 000 × 96 µs ≈ 0.96 s)');
      return t; }); },
  std(s){ act('Source standard → '+STD[s].name, tr=>{ const w=withW(x=>x.src.std=s); const t=worldEv('source → '+STD[s].name, x=>{ x.src.std=s; });
      tr(detectTxt(w)); const B=BUILDS[w.build], f=fwNow();
      if (B.latch && f.pf && syncAt(w) && classify(STD[s].codes[0]) && classify(STD[s].codes[0])!==f.pf) tr('Dashboard.c (V200, “Ali-Add”): pformat is already '+FMT[f.pf]+' and is only cleared when a report goes out with format == NO_LOCK, so REPORT_PARAM and GET_PARAM keep sending 1 << pformat = '+(1<<f.pf)+' (“'+FMT_DB[f.pf]+'”). See Findings.');
      return t; }); },
  srcLevel(v){ act('Source level → '+(v>0?'+':'')+v+' dB', tr=>{ const w=withW(x=>x.src.dB=v); const c=chain(w); const t=worldEv('source level '+v+' dB', x=>{ x.src.dB=v; });
      tr('Card input node: '+vpp(c.vin)+' → U1 differential stage ×2 → VIDEO_IN '+vpp(c.vidIn)+' → OUT1 '+vpp(c.outs[0])); tr('LMH1981 sync tip on VIDEO_IN: '+(STD[w.src.std].sync*c.vidIn*1000).toFixed(0)+' mV → '+(syncAt(w)?'detected':'outside the slicer range '+infT('LMH1981 data sheet not archived')));
      return t; }); },
  loop(v){ act(v? 'Feed looped on to another device (terminated there)' : 'Feed ends at this card', tr=>{ const w=withW(x=>x.src.loop=v); const c=chain(w); const t=worldEv('loop-through '+(v?'on':'off'), x=>{ x.src.loop=v; });
      tr('Loads on the line: '+((w.TERM==='75'?1:0)+(v?1:0))+' × 75 Ω → card input '+vpp(c.vin)+' ('+dB(c.vin)+' re 1 V)'); return t; }); },
  hum(mv){ act('Ground-loop hum on the feed → '+mv+' mV', tr=>{ const w=withW(x=>x.src.hum=mv); const c=chain(w); const t=worldEv('hum '+mv+' mV', x=>{ x.src.hum=mv; });
      tr(w.BAL==='BAL'? 'BAL jumper (H1) off ground: the shield floats into U1A (+), U1B subtracts it → hum at outputs ≈ '+(c.humOut*1000).toFixed(1)+' mV '+infT('≈40 dB common-mode rejection from 1 % resistors') : 'H1 ties the shield to GNDD: the far-end ground difference becomes signal → '+(c.humOut*1000).toFixed(1)+' mV at the outputs'); return t; }); },
  jumper(j){ const w0=worldAt(SIM.t); const nv = {TERM: w0.TERM==='75'?'HIZ':'75', EXT: w0.EXT==='EXT'?'REF':'EXT', REF: w0.REF===1?2:1, BAL: w0.BAL==='BAL'?'GND':'BAL'}[j];
    act('Jumper '+({TERM:'TERM/HI Z',EXT:'EXT/REF (H2)',REF:'REF 1/2 (H4)',BAL:'BAL (H1)'}[j])+' → '+nv, tr=>{
      const w=withW(x=>x[j]=nv); const c=chain(w); const t=worldEv(j+' → '+nv, x=>{ x[j]=nv; });
      if (j==='TERM') tr(nv==='75'? 'TERM-1/2: R2 75R across the input (to the BNC shield) → '+vpp(c.vin)+' at the node' : 'TERM-2/3 (both NET00018): only R1 22K bias → high impedance');
      if (j==='TERM' && w.EXT==='REF' && nv==='75') tr('Manual: “Must be set for HiZ when using the frame reference” — with 75 Ω, R18 30R and R2 75R divide the buffered reference by 75/105 → '+dB(75/105));
      if (j==='EXT') tr(nv==='REF'? 'H2-2/3: input = Q1 (2N4401 emitter follower) fed from frame '+(w.REF===1?'REF1 (P2-14)':'REF2 (P2-10)')+' through H4 and R15 1K, out through R18 30R' : 'H2-1/2: input = BNC1_SIG from the rear module (P1-97)');
      if (j==='REF') tr('H4 selects '+(nv===1?'REF1 (P2-14)':'REF2 (P2-10)')+' for the Q1 buffer'+(w.EXT==='EXT'?' — H2 is on EXT, so nothing changes yet':''));
      if (j==='BAL') tr(nv==='BAL'? 'H1-2/3 (H1-3 is unconnected): shield BNC1_GND floats (R6 22K + C2/R3 to GNDD) → differential input' : 'H1-1/2: BNC1_GND tied to GNDD → single-ended input');
      tr(detectTxt(w)); tr('OUT1 now '+vpp(c.outs[0])); return t; }); },
  lvl(d){ const w0=worldAt(SIM.t); const nv=Math.max(0,Math.min(1,+(w0.lvl+d).toFixed(4)));
    act('LEVEL pot '+(d>0?'clockwise':'counter-clockwise')+' (½ turn)', tr=>{ const w=withW(x=>x.lvl=nv); const c=chain(w); const t=worldEv('LVL → '+(nv*100).toFixed(0)+' %', x=>{ x.lvl=nv; });
      tr('Wiper fraction (R13 + 2K·p)/(R12 + 2K + R13) = '+c.f.toFixed(3)+' → U5/U6 ×2 → back-match ½ → OUT = 2 × '+c.f.toFixed(3)+' × input = '+vpp(c.outs[0])+' ('+dB(c.outs[0]/c.vin)+')');
      tr('Analog only: the AVR has no ADC on the pot, so DashBoard cannot see the level'); return t; }); },
  frameRef(n, s){ act('Frame reference '+n+' → '+(s? STD[s].name+' black burst' : 'none'), tr=>{ const w=withW(x=>x['ref'+n]=s||null); const t=worldEv('frame REF'+n+' → '+(s||'none'), x=>{ x['ref'+n]=s||null; });
      tr('Bussed on the midplane to every slot ('+(n===1?'P2-14':'P2-10')+')'); if (w.EXT==='REF' && w.REF===n) tr(detectTxt(w)); return t; }); },
  load(i){ const w0=worldAt(SIM.t); const nv = w0.loads[i]? 0 : 75;
    act('OUT'+(i+1)+' '+(nv?'terminated (75 Ω)':'left open'), tr=>{ const w=withW(x=>x.loads[i]=nv); const c=chain(w); const t=worldEv('OUT'+(i+1)+' load '+(nv||'open'), x=>{ x.loads[i]=nv; });
      const pin=OUT_PINS[i], m=P1MAP[pin]; tr(m.amp+' → '+m.r+' 75R → P1-'+pin+' ('+m.n+'): '+vpp(c.outs[i])+(nv?'':' (unterminated: double level)')); tr('The other output of '+m.amp+' is isolated by its own 75R and does not change'); return t; }); },
  setSlot(s){ const w0=worldAt(SIM.t); if (s===w0.slot) return; act('Move the card to slot '+s, tr=>{ const t=worldEv('slot → '+s, x=>{ x.slot=s; });
      addEvent({kind:'remove'}); const e=addEvent({kind:'insert'}); tr('Hot-swap: the AVR restarts from main() and measures the new slot resistor ('+SLOT_R[s-1]+' Ω → ADC '+slotAdc(s)+' → ADDRESS_TABLE '+ADDRESS_TABLE(slotAdc(s))+')');
      if (REARS[w0.rear].wide===2 && !REARS[w0.rear].dual && s%2) tr('Manual: with the T6301A use the even slots (2, 4 … 20)'); return e; }); },
  setRear(r){ act('Rear module → '+r, tr=>{ const t=worldEv('rear → '+r, x=>{ x.rear=r; }); const R=REARS[r]; tr(R.name+'. '+(R.dual?'Only P1-97 (IN) and P1-75/37/17/5 (one output per amplifier) reach a BNC.':'IN on position 1, N/C on 2, OUT1–OUT8 on 3–10.')); return t; }); },
  insert(){ act('Insert the card', tr=>{ const t=addEvent({kind:'insert'}); C.BOOT.forEach(b=>tr(SIM.fmtDur(b[0])+': '+b[1])); tr('First timer1 overflow 96 ms after CANinit; CANTRAP_RESTART after 1000 × slot more ticks'); return t; }); },
  remove(){ act('Pull the card', tr=>{ const t=addEvent({kind:'remove'}); tr('Power gone: outputs dead, the frame controller loses the slot'); return t; }); },
  canErr(){ act('Inject a CAN error', tr=>{ const t=addEvent({kind:'canerr'}); tr('can_rx_isr sets MOB_error = YES first and only clears it after a good reception'); tr('Next pass, CAN_FUNCTIONS calls CANinit(), which also restarts both timers — the heartbeat count starts again'); return t; }); },
  dashOpen(){ const w=worldAt(SIM.t), B=BUILDS[w.build]; act('DashBoard: open the card (frame controller reads its tree)', tr=>{
      const P = B.nparam===6? PARAM_OIDS_WB : PARAM_OIDS_COB;
      const reqs=[{type:0x45},{type:0x46,oid:0}];
      P.forEach(o=>{ reqs.push({type:0x47,oid:o}); reqs.push({type:0x49,oid:o}); });
      [0,1].forEach(s=>reqs.push({type:0x50,oid:s<<8})); [0,1].forEach(s=>reqs.push({type:0x51,oid:s<<8}));
      Object.keys(MENUS).forEach(k=>{ const [a,b]=k.split('.').map(Number); reqs.push({type:0x52,oid:(a<<8)|b}); }); Object.keys(MENUS).forEach(k=>{ const [a,b]=k.split('.').map(Number); reqs.push({type:0x53,oid:(a<<8)|b}); });
      const extra=[0x0107]; MENU2.slice(0,18).forEach(o=>extra.push(o)); extra.push(0x0701,0x0702);
      extra.forEach(o=>{ if (!P.includes(o)) reqs.push({type:0x47,oid:o}); });
      const t=mfcEv('frame controller: open slot '+w.slot+' ('+reqs.length+' requests)', reqs);
      tr('GET_NUMPARAMS → '+B.nparam+'; GET_PARAM_OIDS → '+P.map(oidTxt).join(', '));
      tr('Menu sets: “Status” (1 menu: Card Info) and “Control” (3 menus: Input Signal, Metadata, Audio Processing) — MENU_COUNT answers 1 and 3');
      tr('Menu0OID says 6 OIDs but lists 7: 1.5, 1.6, 1.2, 1.7, 1.B, 1.4 (3.2 is never read). 1.7 has no handler → UNSUPPORTED');
      tr('“Metadata” lists 18 of 33 Dolby/SDI OIDs from the template (5.6, 2.10 …) and “Audio Processing” 7.1, 7.2: every descriptor request gets CANRESP_UNSUPPORTED');
      tr('Each answer is built by a MESSAGE_CREATOR_* into Current_Message, CRC’d (getMessageCrc1) and sent by MultiFrameMessageTransmission1 from the timer1 ISR, one frame per tick');
      return t; }); },
  dashRefresh(){ act('DashBoard: refresh Video Status', tr=>{ const t=mfcEv('GET_PARAM 2.4', [{type:0x49,oid:0x0204}]); const B=BUILDS[worldAt(SIM.t).build], f=fwNow();
      tr('DASHBOARD_RESPONSE_SETUP case CANMSG_GET_PARAM, OID 2.4: 6-byte reply, value '+(f.fmt? (B.latch&&f.pf? '1 << pformat' : '1 << format') : 'BIT0 (NO LOCK)')); return t; }); },
  dashSet(){ act('DashBoard (or a script): SET_PARAM 2.4 = 0', tr=>{ const t=mfcEv('SET_PARAM 2.4', [{type:0x4A,oid:0x0204,val:0}]); tr('Read-only alarm, but the case exists: it answers 1 << format with ALARM_PARAM_SIZE and never looks at pformat'); return t; }); },
  snmpWalk(){ const B=BUILDS[worldAt(SIM.t).build]; act('Frame controller: SNMP set-up queries', tr=>{
      const reqs=[{type:0x56,oid:0}]; [0x0204,0x0105,0x0106,0x0102,0x010B,0x0104].forEach(o=>reqs.push({type:0x57,oid:o})); reqs.push({type:0x58,oid:0x0204},{type:0x58,oid:0x0105});
      const t=mfcEv('GET_SNMP_BASE / OID / TRAP', reqs);
      tr(B.snmp? 'V200: base “25030.1.1.6” (enterprise 25030 = Ward-Beck), OIDs 1.2.1.x / 1.3.1.1, traps “0.3” (Video Status) and “0.1” (Product — no such notification in the MIB)' : 'This build has no SNMP: every request gets CANRESP_UNSUPPORTED');
      tr('That the frame controller asks in this order is '+infT('the OGP CAN message set; the MFC firmware is not archived')); return t; }); },
  dashReboot(){ act('DashBoard: Reboot', tr=>{ const t=mfcEv('REBOOT', [{type:0x43}]); tr('CANMSG_REBOOT → reboot_device = YES'); tr('Next CAN_FUNCTIONS: while(1) CLI(); → watchdog reset ≈16 ms → main() boot (≈0.54 s) — NO SYNCH lit until the first VSOUT is read'); return t; }); },
  upload(fk){ const F=FILES[fk]; act('DashBoard: Upload '+F.name, tr=>{
      const t=mfcEv('START_UPGRADE ('+F.name+')', [{type:0x40}]);
      D.ui.upl={file:fk, wall:performance.now(), applied:false};
      tr('Application: START_UPGRADE → CAN_UPGRADE_WAIT (1000 ms), reboot_device = upgrade_device = YES');
      tr('CAN_FUNCTIONS: eepromWriteByte(BOOT_CONTROL, BOOTC_RUNLDR); while(1) CLI(); → watchdog → BOOTRST → Ross OGP bootloader (Bootloader/common/bootavr.c)');
      tr('Bootloader checks the product list in the .bin (zeuspack /p AV6202A /P 9233): '+(F.compat.indexOf(BUILDS[worldAt(SIM.t).build].product)>=0? 'match' : 'no match → CAN_INVALID_PRODUCT'));
      return t; }); },
};
function uploadState(){
  const u=D.ui.upl; if (!u) return null; const F=FILES[u.file], el=(performance.now()-u.wall)/1000;
  const bad = F.compat.indexOf(BUILDS[D.s0.w.build].product)<0;
  if (bad){ const p=Math.min(1, el/2); return {p, done:p>=1, txt: p<1? 'START_UPGRADE → bootloader …' : 'Bootloader answered CAN_INVALID_PRODUCT. The old application is intact and runs again after BOOT_TIMEOUT.'}; }
  const steps=[[0.5,'START_UPGRADE → watchdog → bootloader broadcasts BOOTING'],[1.0,'START_UPGRADE again → product check, erase signature page'],[6,'UPGRADE_PAGE × '+F.pages+' (256-byte pages, 33 frames each)'],[0.4,'VERIFY_UPGRADE (CRC16)'],[0.4,'REBOOT → application main()']];
  const tot=steps.reduce((a,s)=>a+s[0],0); let a=0;
  for (const s of steps){ if (el < a+s[0]) return {p:el/tot, txt:s[1]+(s[1].startsWith('UPGRADE_PAGE')? ' — page '+Math.floor((el-a)/s[0]*F.pages)+' / '+F.pages : '')+' (compressed; real duration not in the archive)'}; a+=s[0]; }
  return {p:1, done:true, txt:'Done: '+F.name+' installed — Software Rev now '+BUILDS[F.build].ver+', Product “'+BUILDS[F.build].product+'”.'};
}
function finishUploadIfDone(){
  const u=D.ui.upl; if (!u || u.applied) return; const st=uploadState(); if (!st || !st.done) return;
  u.applied=true; const F=FILES[u.file]; const bad = F.compat.indexOf(BUILDS[D.s0.w.build].product)<0;
  rollSecond(); if (!bad) D.s0.w.build=F.build;
  const f=D.s0.f; f.mode='boot'; f.bootIx=0; f.modeEnd=C.BOOT[0][0]; f.timersOn=false; f.leds=2; f.hsynch_detected=0; f.phsynch_detected=0; f.format=0; f.pformat=0; f.mfcQ=[]; f.mfcNext=Infinity; f.frame_count=0; f.job=null; f.ee.bootc=0xFF; f.reboot_device=0; f.upgrade_device=0;
  D.log.unshift({t:0, sec:D.second, name: bad? 'Bootloader timeout → old application' : 'Upload complete', trace: bad? ['No START_UPGRADE accepted; the loader reboots into the existing code.'] : ['VERIFY_UPGRADE ok → REBOOT → main() boots with '+F.name+'.']});
  D.ver++; SIM.refresh();
}

/* =====================================================================
   DRAWING — card (ISS3 gerbers), card edge, jumper legend, rear module, frame, DashBoard window
   ===================================================================== */
/* pixel positions measured on the 120 dpi gerber render (1560 × 370, origin x 2.40 in, y 8.65 in) */
const PX = {
  ledS:[81,100], ledN:[81,122], pot:[1206,38,92,28], shaft:[30,52],
  TERM:{x:1456.3, y:[49.7,60.5,73.3]}, H2:{x:1470.8, y:[49.2,60.5,73.3]}, H1:{x:1470.8, y:[85.8,97.5,110]}, H4:{y:300, x:[1364.4,1376.6,1388]},
  chips:{U8:[1060,205,'AT90CAN128'],U2:[1255,96,'LMH1981'],U1:[1372,64,'EL2244 in'],U5:[1446,152,'EL2244 out'],U6:[1446,236,'EL2244 out'],U7:[1452,324,'SN65HVD233'],Q1:[1340,282,'2N4401'],X1:[1052,268,'8 MHz'],REG1:[465,245,'LM337 −5 V'],REG2:[600,245,'LM317 +5 V'],REG3:[830,255,'LM1117 3.3 V'],JTAG1:[1060,112,'JTAG']},
};
const BOARD = 'M10 7 L17 0 H1482 L1487 6 V47 H1545 V292 H1493 Q1485 298 1493 305 H1522 V355 H1487 V363 H60 L10 313 Z';
const MASK = {black:'#141716', green:'#1d5a32'};
const LEDC = {g:'#6dff5a', r:'#ff4a3d'};
function ledState(t){ const sn=snapAt(t); if (sn.mode==='off'||sn.mode==='loader') return {s:0,n:0}; if (sn.mode==='boot'||sn.mode==='wdt') return {s:0,n:sn.mode==='boot'?1:(sn.leds&2?1:0)}; return {s:sn.hs?1:0, n:sn.hs?0:1}; }
function cardSVG(t, opts){
  opts=opts||{}; const w=worldAt(t), L=ledState(t), sn=snapAt(t);
  let s=`<svg viewBox="0 0 1560 370" role="img" aria-label="AV6202A ISS3 card, top side (from the gerbers)" style="width:100%;display:block;border-radius:6px">
   <defs><filter id="avGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect width="1560" height="370" fill="var(--panel2)"/>
   <path d="${BOARD}" fill="${MASK[w.mask]}" stroke="#2a2f2c"/>
   <image href="${ASSET}av6202-copper.png" width="1560" height="370"/>
   <image href="${ASSET}av6202-silk.png" width="1560" height="370" opacity=".93"/>`;
  [[PX.ledS,L.s,LEDC.g,'SYNCH — LED1 green, PB1 via R62 750R'],[PX.ledN,L.n,LEDC.r,'NO SYNCH — LED2 red, PB2 via R61 750R (firmware: ERROR_LED)']].forEach(([p,on,col,tt])=>{
    s+=`<rect x="${p[0]-11}" y="${p[1]-6}" width="22" height="12" rx="2" fill="${on?col:'#3b3f3c'}" ${on?'filter="url(#avGlow)"':''}><title>${tt} (${on?'lit':'off'})</title></rect>`; });
  // level pot with its extension shaft to the card edge (ISS2 photo)
  const [px,py,pw,ph]=PX.pot;
  s+=`<g class="av-pot" style="cursor:pointer"><rect x="${PX.shaft[0]}" y="${PX.shaft[1]-6}" width="${px-PX.shaft[0]}" height="12" fill="#f2f2ee" opacity=".55"/>
    <rect x="118" y="38" width="16" height="28" rx="2" fill="#c9ccd0" opacity=".7"/><rect x="706" y="38" width="16" height="28" rx="2" fill="#c9ccd0" opacity=".7"/>
    <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="3" fill="#2f64c8" stroke="#123"/><text x="${px+pw/2}" y="${py+18}" font-size="12" text-anchor="middle" fill="#fff">LVL ${(w.lvl*25).toFixed(1)}/25</text>
    <rect class="av-potL" x="${px-40}" y="${py-8}" width="${pw/2+40}" height="${ph+16}" fill="transparent"><title>LEVEL pot (2K multi-turn, 25 turns ${'inferred'}) — click: ½ turn counter-clockwise</title></rect>
    <rect class="av-potR" x="${px+pw/2}" y="${py-8}" width="${pw/2+6}" height="${ph+16}" fill="transparent"><title>LEVEL pot — click: ½ turn clockwise</title></rect></g>`;
  // jumpers (positions from the silk; pin 1 = square pad)
  const cap=(x1,y1,x2,y2,k)=>`<rect x="${Math.min(x1,x2)-5}" y="${Math.min(y1,y2)-5}" width="${Math.abs(x2-x1)+10}" height="${Math.abs(y2-y1)+10}" rx="2" fill="#e8c23a" stroke="#000" stroke-width="1.2" opacity=".95" pointer-events="none"/>`;
  const hit=(x,y,wd,ht,k,tt)=>`<rect class="av-jp" data-k="${k}" x="${x}" y="${y}" width="${wd}" height="${ht}" fill="transparent" style="cursor:pointer"><title>${tt}</title></rect>`;
  const T=PX.TERM, H2=PX.H2, H1=PX.H1, H4=PX.H4;
  s+= w.TERM==='75'? cap(T.x,T.y[1],T.x,T.y[2]) : cap(T.x,T.y[0],T.x,T.y[1]);
  s+= w.EXT==='EXT'? cap(H2.x,H2.y[0],H2.x,H2.y[1]) : cap(H2.x,H2.y[1],H2.x,H2.y[2]);
  s+= w.BAL==='BAL'? cap(H1.x,H1.y[0],H1.x,H1.y[1]) : cap(H1.x,H1.y[1],H1.x,H1.y[2]);
  s+= w.REF===1? cap(H4.x[0],H4.y,H4.x[1],H4.y) : cap(H4.x[1],H4.y,H4.x[2],H4.y);
  s+= hit(T.x-8,40,16,42,'TERM','TERM / HI Z jumper: '+w.TERM+' — click to move') + hit(H2.x-8,40,16,42,'EXT','EXT / REF (H2): '+w.EXT+' — click to move') + hit(H1.x-8,79,16,40,'BAL','BAL (H1): '+w.BAL+' — click to move') + hit(H4.x[0]-8,290,40,20,'REF','REF 1 / 2 (H4): '+w.REF+' — click to move');
  if (opts.labels!==false){
    const lab=(x,y,txt)=>`<text x="${x}" y="${y}" font-size="15" font-weight="700" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke" pointer-events="none">${txt}</text>`;
    Object.entries(PX.chips).forEach(([k,[x,y,n]])=>{ s+=lab(x-30, y+(k==='U8'?44:k==='U2'?-14:-12), n); });
    s+=lab(1500,200,'P1')+lab(1495,350,'P2');
  }
  const cp=capAt(t); if (cp && sn.mode==='app') s+=`<rect x="1225" y="80" width="62" height="40" fill="none" stroke="#ffd36a" stroke-width="3" stroke-dasharray="6 4"><title>U2 → AVR: LMH1981_VIDEO_DETECT is reading the field code</title></rect>`;
  if (!w.card) s+=`<rect width="1560" height="370" fill="var(--panel2)" opacity=".75"/><text x="780" y="195" text-anchor="middle" font-size="40" fill="var(--ink)">card removed from the frame</text>`;
  if (sn.mode==='loader') s+=`<text x="140" y="190" font-size="24" fill="#ffd36a">bootloader running — card LEDs dark</text>`;
  if (sn.mode==='boot') s+=`<text x="140" y="190" font-size="22" fill="#ffd36a">main() booting — NO SYNCH lit by DATA_INITIALIZATION</text>`;
  return s+'</svg>';
}
/* jumper legend, drawn like AV6202A BERGS.cdr, but clickable */
function bergsSVG(t){
  const w=worldAt(t);
  const vh=(x,y,sel,k,top,bot,tt)=>`<g class="av-jp" data-k="${k}" style="cursor:pointer"><title>${tt}</title><rect x="${x-9}" y="${y}" width="18" height="52" rx="2" fill="var(--panel)" stroke="var(--ink)" stroke-width="2"/>
     ${[0,1,2].map(i=>`<circle cx="${x}" cy="${y+9+i*17}" r="4" fill="none" stroke="var(--ink)" stroke-width="2"/>`).join('')}
     <rect x="${x-6}" y="${y+3+sel*17}" width="12" height="29" rx="3" fill="#e8c23a" stroke="#000" opacity=".9"/></g>`;
  let s=`<svg viewBox="0 0 230 330" style="width:100%;max-width:220px;display:block" role="img" aria-label="Jumper legend">
   <text x="60" y="16" font-size="12" text-anchor="middle" fill="var(--ink)">TERM</text><text x="60" y="29" font-size="12" text-anchor="middle" fill="var(--ink)">HI Z</text>
   ${vh(60,34, w.TERM==='75'?1:0,'TERM',null,null,'TERM/HI Z — pins 1–2 (lower pair) = R2 75R; 2–3 = high impedance. Now '+w.TERM)}
   <text x="80" y="${120+10}" font-size="12" fill="var(--ink)">EXT</text><text x="80" y="${120+48}" font-size="12" fill="var(--ink)">REF</text>
   ${vh(60,118, w.EXT==='EXT'?0:1,'EXT',null,null,'EXT/REF (H2) — now '+w.EXT)}
   <g class="av-jp" data-k="REF" style="cursor:pointer"><title>REF 1 / 2 (H4) — now ${w.REF}</title><text x="22" y="210" font-size="12" fill="var(--ink)">REF</text><rect x="52" y="198" width="56" height="18" rx="2" fill="var(--panel)" stroke="var(--ink)" stroke-width="2"/>
     ${[0,1,2].map(i=>`<circle cx="${61+i*19}" cy="207" r="4" fill="none" stroke="var(--ink)" stroke-width="2"/>`).join('')}<rect x="${55+(w.REF===1?0:19)}" y="201" width="31" height="12" rx="3" fill="#e8c23a" stroke="#000" opacity=".9"/>
     <text x="61" y="232" font-size="12" text-anchor="middle" fill="var(--ink)">1</text><text x="99" y="232" font-size="12" text-anchor="middle" fill="var(--ink)">2</text></g>
   <text x="60" y="252" font-size="12" text-anchor="middle" fill="var(--ink)">BAL</text>
   ${vh(60,258, w.BAL==='BAL'?0:1,'BAL',null,null,'BAL (H1) — upper pair: shield floats (differential); lower pair: shield to ground. Now '+w.BAL)}
   <path d="M60 312 v8 M52 320 h16 M55 324 h10 M58 328 h4" stroke="var(--ink)" stroke-width="1.6"/>
   <text x="150" y="60" font-size="10.5" fill="var(--ink2)">${w.TERM==='75'?'75 Ω':'high-Z'}</text><text x="150" y="146" font-size="10.5" fill="var(--ink2)">${w.EXT==='EXT'?'rear IN':'frame REF '+w.REF}</text>
   <text x="150" y="210" font-size="10.5" fill="var(--ink2)">REF${w.REF} ${w.EXT==='REF'?'in use':'(unused)'}</text><text x="150" y="286" font-size="10.5" fill="var(--ink2)">${w.BAL==='BAL'?'differential':'shield grounded'}</text></svg>`;
  return s;
}
/* card edge, as AV6202A-card-edge.cdr: Level POT, SYNCH LED, NO SYNCH LED, ejector label */
/* ---------- panel art (CorelDRAW → Inkscape SVG; positions measured on the converted art) ----------
   card edge: AV6202A/Functional/AV6202A-card-edge.cdr (2008-10-21) → assets/av6202-edge.svg
   T6301A / T6401A: openGear Rear Module Guides/AV6202A - rear module options.cdr (2012-01-16) → assets/av6202-rear-T6301/T6401.svg
   T6201: AV6202A/Functional/AV6202-card-edge.cdr (2008-10-21) — misnamed, it holds the T6201/T6301/T6401 sheet → assets/av6202-rear-T6201.svg */
const ARTDIR = '#OPENGEAR #SERIES/AV6202 - #Master #OPENGEAR/AV6202 - #Engineering/AV6202A/Functional/';
const GUIDE = '#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/';
const REAR_ART = {
  T6301:{w:146,h:169, r:5.85, plate:[44,36,52,115], c:[[56.8,58.3],[75.7,58.3],[56.8,77.2],[75.7,77.2],[56.8,96.1],[75.7,96.1],[56.8,115.0],[75.7,115.0],[56.8,133.9],[75.7,133.9]], dir:GUIDE, file:'AV6202A - rear module options.cdr', date:'2012|45'},
  T6401:{w:146,h:169, r:5.85, plate:[47,36,52,115], c:[[60.0,59.4],[78.9,59.4],[60.0,78.3],[78.9,78.3],[60.0,97.2],[78.9,97.2],[60.0,116.1],[78.9,116.1],[60.0,135.0],[78.9,135.0]], dir:GUIDE, file:'AV6202A - rear module options.cdr', date:'2012|45'},
  T6201:{w:140,h:220, r:11.5, plate:[28,8,82,180], c:[[54.5,31.6],[90.2,31.6],[54.5,62.7],[90.2,62.7],[54.9,94.4],[90.6,94.4],[54.5,125.5],[90.2,125.5],[54.9,156.1],[90.5,156.1]], dir:ARTDIR, file:'AV6202-card-edge.cdr', date:'2008|41'},
};
const artSrc = a => `${SIM.src(a.dir+a.file, a.file)} (CorelDRAW, ${a.date})`;
function edgeSVG(t){
  const w=worldAt(t), L=ledState(t), a=w.lvl*25*360*Math.PI/180, px=136.4, py=33.2;
  const led=(y,on,col,tip)=>`<rect x="124.75" y="${y-6.3}" width="5.7" height="12.6" rx="1" fill="${on?col:'#2b2f2c'}" stroke="#555" stroke-width=".3" ${on?'filter="url(#avGlow2)"':''}><title>${tip} (${on?'lit':'off'})</title></rect>`;
  return `<svg viewBox="8 8 160 100" style="width:100%;max-width:300px;display:block;margin:auto;border-radius:6px" role="img" aria-label="AV6202A card edge (CorelDRAW art)">
   <defs><filter id="avGlow2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <image href="${ASSET}av6202-edge.svg" width="170" height="220"/>
   <g class="av-pot" style="cursor:pointer"><circle cx="${px}" cy="${py}" r="4.6" fill="#9a9a9a" stroke="#333" stroke-width=".4"/>
     <line x1="${px-3.6*Math.cos(a)}" y1="${py-3.6*Math.sin(a)}" x2="${px+3.6*Math.cos(a)}" y2="${py+3.6*Math.sin(a)}" stroke="#111" stroke-width="1.3"/>
     <rect class="av-potL" x="${px-12}" y="${py-11}" width="12" height="22" fill="transparent"><title>Level POT: click left half = ½ turn CCW</title></rect><rect class="av-potR" x="${px}" y="${py-11}" width="12" height="22" fill="transparent"><title>Level POT: click right half = ½ turn CW</title></rect></g>
   ${led(65.6,L.s,LEDC.g,'SYNCH LED')}${led(86.7,L.n,LEDC.r,'NO SYNCH LED')}</svg>`;
}
function rearSVG(t, opts){
  opts=opts||{};
  const w=worldAt(t), RM=REARS[w.rear], c=chain(w), alive = snapAt(t).mode!=='off' && w.card, R=REAR_ART[w.rear], r=R.r;
  const vb = opts.compact? (()=>{ const xs=R.c.map(p=>p[0]), ys=R.c.map(p=>p[1]), m=R.r*1.5; const x0=Math.min(...xs)-m, y0=Math.min(...ys)-m*1.6; return [x0,y0,Math.max(...xs)+m-x0,Math.max(...ys)+m*1.3-y0].map(v=>v.toFixed(1)).join(' '); })() : `0 0 ${R.w} ${R.h}`;
  let s=`<svg viewBox="${vb}" role="img" aria-label="${RM.name} (CorelDRAW art)" style="width:100%;max-width:340px;display:block;margin:auto;border-radius:6px">
    <image href="${ASSET}av6202-rear-${w.rear}.svg" width="${R.w}" height="${R.h}"/>`;
  RM.pos.forEach(([lab,pin],i)=>{
    const [cx,cy]=R.c[i];
    const mine = !RM.dual || lab.endsWith('#'+w.pos), m=P1MAP[pin];
    const isIn = m.k==='in', oi = OUT_PINS.indexOf(pin);
    const conn = mine && (isIn? (w.src.on) : (m.k==='out' && w.loads[oi]>0));
    const lvl = mine && m.k==='out' && alive ? c.outs[oi] : null;
    const cls = mine && (isIn||m.k==='out')? `class="av-jack" data-j="${isIn?'in':oi}" style="cursor:pointer"` : '';
    s+=`<g ${cls}>${conn? (isIn? `<circle cx="${cx}" cy="${cy}" r="${r*0.75}" fill="#2b5f9e" opacity=".88"/><rect x="${cx-r*0.28}" y="${cy}" width="${r*0.56}" height="${r*1.1}" fill="#2b5f9e" opacity=".88"/>` : `<circle cx="${cx}" cy="${cy}" r="${r*0.7}" fill="#555c63" opacity=".85"/><text x="${cx}" y="${cy+r*0.2}" font-size="${r*0.55}" text-anchor="middle" fill="#fff">75Ω</text>`) : ''}
      ${!mine||m.k==='nc'? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#000" opacity=".13"/>` : ''}
      ${lvl!=null? `<circle cx="${cx+r*0.95}" cy="${cy-r*0.95}" r="${Math.max(1.4,r*0.22)}" fill="${lvl>0.05?'#2fbf5a':'#888'}"/>` : ''}
      <rect x="${cx-r-1.5}" y="${cy-r-1.5}" width="${2*r+3}" height="${2*r+3}" fill="transparent"><title>${i+1} ${lab} — P1-${pin} (${m.n})${lvl!=null?': '+vpp(lvl):''}${cls?(isIn?' — click to plug/unplug the feed':' — click: 75 Ω load / open'):''}</title></rect></g>`;
  });
  return s+`</svg>`;
}
function frameSVG(t){
  const w=worldAt(t), RM=REARS[w.rear], n = w.rear==='T6201'? 10 : 20, L=ledState(t);
  let s=`<svg viewBox="0 0 660 92" style="width:100%;display:block"><rect width="660" height="92" rx="6" fill="var(--dev)"/>
    <text x="10" y="13" font-size="9.5" fill="#9aa0a5">${n===10?'DFR-8310 (10 slots)':'DFR-8320 (20 slots)'} front view · frame REF1 ${w.ref1||'—'} · REF2 ${w.ref2||'—'} (click a slot to move the card)</text>`;
  const sw = 640/n;
  for (let i=1;i<=n;i++){ const x=10+(i-1)*sw, me=i===w.slot && w.card; const span = RM.wide===2 && !RM.dual? [w.slot-1,w.slot] : [w.slot]; const isRear=span.includes(i);
    s+=`<g class="av-slot" data-s="${i}" style="cursor:pointer"><rect x="${x+1.5}" y="20" width="${sw-3}" height="52" rx="2" fill="${me?'#2c4232':'#202326'}" stroke="${isRear?'#e3a35a':'#3a3f44'}" stroke-width="${isRear?2:1}"/>
      ${me?`<rect x="${x+sw/2-2}" y="24" width="4" height="44" fill="#f2f2ee" opacity=".6"/><rect x="${x+sw/2+4}" y="30" width="4" height="4" fill="${L.s?LEDC.g:'#2c332c'}"/><rect x="${x+sw/2+4}" y="37" width="4" height="4" fill="${L.n?LEDC.r:'#2c332c'}"/>`:''}
      <text x="${x+sw/2}" y="86" font-size="9" text-anchor="middle" fill="#9aa0a5">${i}</text><title>Slot ${i}${me?' — AV6202A':''}${isRear?' — rear '+w.rear:''}</title></g>`; }
  return s+'</svg>';
}
/* DashBoard-style window — a generic parameter editor, not Ross's design */
function dashHTML(t){
  const w=worldAt(t), sn=snapAt(t), c=cacheAt(t), B=BUILDS[w.build], R=sim();
  const seen = w.card && w.mfc && (D.s0.f.mode==='app' || R.can.some(fr=>fr.dir==='tx' && fr.t<=t));
  const tab=D.ui.dashTab, row=(l,v)=>`<tr><td class="av-dl">${l}</td><td>${v}</td></tr>`;
  const rd=v=>`<input readonly value="${esc(v==null?'':v)}">`;
  let body='';
  if (!w.mfc) body='<div class="av-dmsg">No frame controller — the frame does not appear.</div>';
  else if (!seen) body='<div class="av-dmsg">Slot '+w.slot+': no card answering yet.</div>';
  else if (tab==='info') body=`<table class="av-dt">${row('Product',rd(c[0x0105]))}${row('Name',rd(c[0x0106]))}${row('Supplier',rd(c[0x0102]))}${row('(OID 1.7)','<span class="muted small">listed in Menu0OID, card answers UNSUPPORTED</span>')}${row('Software Rev',rd(c[0x010B]))}${B.nparam===6?row('Website',rd(c[0x0104])):''}</table><div class="av-dnote">Menu “Card Info” = Menu0OID_Message (count 6 of 7 listed OIDs). Manual: “Supplier Ward-Beck Systems Ltd.”, “Software Rev ##”; the card sends “${B.supplier}” and “${B.ver}”.</div>`;
  else if (tab==='input'){ const v=c[0x0204], nm=valName(v), bad=!v||(v&1);
    body=`<table class="av-dt">${row('Video Status', `<span class="av-alarm" style="background:${bad?'#c0392b':'#2f8f46'}"></span> <b>${nm}</b> <span class="mono small muted">value 0x${hx(v||0,4)}</span>`)}</table>
     <div class="av-dnote">ALARM_TABLE (MESSAGE_CREATOR_PARAMETER_24): each entry is [bit][severity][name]. 0x0002 → bit 0, severity 2 (red) “No Video Detected”; 0x0100 → bit 1 “NTSC”; 0x0200 → bit 2 “PAL” … bit 7 “1080p”, all severity 0 (green). The card sends 1 &lt;&lt; format, so the set bit names the format. What DashBoard prints for a green-only value is ${infT('the SDK’s writeAlarmsToString prints “OK” when no red/yellow bit is set; DashBoard itself is not archived')}. Under <b>Control</b>, not Status: the menus come from a Dolby/SDI template.</div>`; }
  else if (tab==='meta') body=`<div class="av-dmsg">“Metadata” — Menu2OID lists ${MENU2.length} OIDs (count byte 18): ${MENU2.slice(0,18).map(oidTxt).join(', ')} … Every descriptor request is answered CANRESP_UNSUPPORTED, so the page stays empty.</div>`;
  else if (tab==='audio') body=`<div class="av-dmsg">“Audio Processing” — Menu4OID lists 7.1 and 7.2 (MESSAGE_CREATOR_PARAMETER_71/72 are commented out): empty page.</div>`;
  else body = B.snmp? `<table class="av-dt">${row('SNMP base','<span class="mono">25030.1.1.6</span> (Ward-Beck enterprise 25030, openGearObjects 6)')}${Object.entries(SNMP).map(([o,s])=>row(oidTxt(+o)+' '+({0x0204:'Video Status',0x0106:'Name',0x0104:'Website',0x0102:'Supplier',0x0105:'Product',0x010B:'Software Rev'})[o], `<span class="mono">${s}</span>`)).join('')}${row('Traps','<span class="mono">2.4 → 0.3</span> (AV6202VideoStatusEvent) · <span class="mono">1.5 → 0.1</span> (not in the MIB)')}${row('av6202VideoStatus','No_Video_Detected(1) NTSC(2) PAL(4) = 1 &lt;&lt; format')}</table>` : `<div class="av-dmsg">Build ${B.ver} (${B.product}) has no SNMP: GET_SNMP_* → CANRESP_UNSUPPORTED. SNMP arrived in V200 (2012|45), Ward-Beck MIB only.</div>`;
  const u=uploadState();
  return `<div class="av-dash"><div class="av-dtitle"><span>Parameter editor — frame tree</span><span class="muted">generic DashBoard-style view</span></div>
   <div class="av-dwrap"><div class="av-tree"><div>▾ openGear frame</div><div style="padding-left:12px">▸ Frame controller</div>
     ${[2,w.slot,9].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b).map(i=>`<div style="padding-left:12px" class="${i===w.slot?'av-sel':''}">${i===w.slot? (seen? '● Slot '+i+': '+B.product : '○ Slot '+i) : '○ Slot '+i+': (other card)'}</div>`).join('')}</div>
    <div class="av-pane"><div class="av-phead">Slot ${w.slot}: <b>${seen? B.product : '—'}</b> <span class="muted">${seen? CARD_NAME : ''}</span>${sn.mode==='app'?'':' <span style="color:var(--warn)">('+sn.mode+')</span>'}</div>
     <div class="av-ptabs">${[['info','Status ▸ Card Info'],['input','Control ▸ Input Signal'],['meta','Control ▸ Metadata'],['audio','Control ▸ Audio Processing'],['snmp','SNMP']].map(([k,l])=>`<button data-dt="${k}" class="${tab===k?'on':''}">${l}</button>`).join('')}</div>
     <div class="av-pbody">${body}</div>
     <div class="av-pfoot"><button data-da="open">Open / rescan</button><button data-da="refresh">Refresh</button><button data-da="set">SET 2.4</button><button data-da="snmp">SNMP queries</button><button data-da="reboot">Reboot</button>
       <select id="avFile">${Object.keys(FILES).map(k=>`<option value="${k}">${FILES[k].name}</option>`).join('')}</select><button data-da="upload">Upload…</button></div>
     ${u? `<div class="av-upl"><div class="av-bar"><i style="width:${(u.p*100).toFixed(1)}%"></i></div><div class="small">${u.txt}</div></div>`:''}</div></div></div>`;
}
const CSS = `<style>
.av-dash{border:1px solid var(--line);border-radius:6px;background:var(--panel2);font:12.5px var(--sans);overflow:hidden}
.av-dtitle{display:flex;justify-content:space-between;padding:5px 8px;background:color-mix(in srgb,var(--accent2) 22%,var(--panel));border-bottom:1px solid var(--line);font-weight:600}
.av-dwrap{display:grid;grid-template-columns:150px minmax(0,1fr);min-height:240px}
.av-tree{border-right:1px solid var(--line);padding:6px;font-size:12px;background:var(--lane)}
.av-tree .av-sel{background:color-mix(in srgb,var(--accent) 22%,transparent);border-radius:3px}
.av-pane{display:flex;flex-direction:column;min-width:0}.av-phead{padding:6px 8px;border-bottom:1px solid var(--line)}
.av-ptabs{display:flex;flex-wrap:wrap;gap:3px;padding:5px 6px 0}.av-ptabs button{font-size:11.5px;padding:3px 7px;border-radius:5px 5px 0 0}
.av-pbody{padding:8px;flex:1;border-top:1px solid var(--line)}
.av-dt{border-collapse:collapse;width:100%}.av-dt td{padding:4px 6px;border-bottom:1px dashed var(--grid);vertical-align:top}.av-dl{color:var(--ink2);width:34%}
.av-dt input[readonly]{width:100%;background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:2px 5px;color:var(--ink);font:12px var(--mono)}
.av-alarm{display:inline-block;width:11px;height:11px;border-radius:50%;vertical-align:-1px}
.av-dnote{margin-top:6px;font-size:11.5px;color:var(--ink2)}.av-dmsg{padding:14px;color:var(--ink2)}
.av-pfoot{display:flex;flex-wrap:wrap;gap:5px;padding:6px;border-top:1px solid var(--line)}.av-pfoot button,.av-pfoot select{font-size:11.5px;padding:3px 7px}
.av-upl{padding:6px 8px;border-top:1px solid var(--line)}.av-bar{height:9px;border-radius:5px;background:var(--grid);overflow:hidden}.av-bar i{display:block;height:100%;background:var(--accent)}
.av-row{display:grid;grid-template-columns:minmax(0,1fr) 200px;gap:10px;align-items:start}
@media (max-width:760px){.av-dwrap{grid-template-columns:1fr}.av-tree{border-right:none;border-bottom:1px solid var(--line)}.av-row{grid-template-columns:1fr}}
.av-blk{cursor:pointer}.av-blk:hover rect{stroke:var(--accent);stroke-width:2.5}
</style>`;

/* ---------------- binding ---------------- */
function bindAll(root){
  root.querySelectorAll('.av-jp').forEach(g=>g.onclick=e=>{ e.stopPropagation(); A.jumper(g.dataset.k); });
  root.querySelectorAll('.av-potL').forEach(g=>g.onclick=e=>{ e.stopPropagation(); A.lvl(-0.02); });
  root.querySelectorAll('.av-potR').forEach(g=>g.onclick=e=>{ e.stopPropagation(); A.lvl(0.02); });
  root.querySelectorAll('.av-jack').forEach(g=>g.onclick=()=>{ const j=g.dataset.j; if (j==='in') A.plug(); else A.load(+j); });
  root.querySelectorAll('.av-slot').forEach(g=>g.onclick=()=>A.setSlot(+g.dataset.s));
  root.querySelectorAll('[data-dt]').forEach(b=>b.onclick=()=>{ D.ui.dashTab=b.dataset.dt; SIM.refresh(); });
  root.querySelectorAll('[data-da]').forEach(b=>b.onclick=()=>{ const k=b.dataset.da;
    if (k==='open') A.dashOpen(); if (k==='refresh') A.dashRefresh(); if (k==='set') A.dashSet(); if (k==='snmp') A.snmpWalk(); if (k==='reboot') A.dashReboot();
    if (k==='upload'){ const sel=root.querySelector('#avFile'); A.upload(sel? sel.value : 'wb200'); } });
}
function worldControlsHTML(){
  const w=worldAt(SIM.t), opt=(v,cur,l)=>`<option value="${v}" ${String(v)===String(cur)?'selected':''}>${l}</option>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px" class="small">
    <label>Source <select id="avStd">${Object.keys(STD).map(k=>opt(k,w.src.std,STD[k].name)).join('')}</select></label>
    <label>level <select id="avLv">${[-6,-3,0,3,6].map(v=>opt(v,w.src.dB,(v>0?'+':'')+v+' dB')).join('')}</select></label>
    <label><input type="checkbox" id="avLoop" ${w.src.loop?'checked':''}> looped on</label>
    <label>hum <select id="avHum">${[0,100,300].map(v=>opt(v,w.src.hum,v+' mV')).join('')}</select></label>
    <label>Frame REF1 <select id="avR1">${['','NTSC','PAL'].map(v=>opt(v,w.ref1||'',v||'none')).join('')}</select></label>
    <label>REF2 <select id="avR2">${['','NTSC','PAL'].map(v=>opt(v,w.ref2||'',v||'none')).join('')}</select></label>
    <label>Rear <select id="avRear">${Object.keys(REARS).map(k=>opt(k,w.rear,k+'A')).join('')}</select></label>
    ${REARS[w.rear].dual? `<label>card <select id="avPos">${opt(1,w.pos,'#1')}${opt(2,w.pos,'#2')}</select></label>`:''}
    <label>Mask <select id="avMask">${opt('black',w.mask,'black (ISS2 photo)')}${opt('green',w.mask,'green (ISS3 note 1)')}</select></label>
    <button id="avIns">${w.card?'Pull card':'Insert card'}</button><button id="avErr">CAN error</button>
    <button id="avNext" title="Carry the state at 1.000 s into a new second">Next second ▶</button><button id="avRst">Reset</button>
    <label title="After an action, move the playhead 2 ms past it"><input type="checkbox" id="avFol" ${D.ui.follow?'checked':''}> follow</label></div>`;
}
function bindWorld(root){
  const q=s=>root.querySelector(s); if (!q('#avStd')) return;
  q('#avStd').onchange=e=>A.std(e.target.value); q('#avLv').onchange=e=>A.srcLevel(+e.target.value); q('#avLoop').onchange=e=>A.loop(e.target.checked);
  q('#avHum').onchange=e=>A.hum(+e.target.value); q('#avR1').onchange=e=>A.frameRef(1,e.target.value); q('#avR2').onchange=e=>A.frameRef(2,e.target.value);
  q('#avRear').onchange=e=>A.setRear(e.target.value); const p=q('#avPos'); if (p) p.onchange=e=>{ worldEv('card position', x=>{ x.pos=+e.target.value; }); SIM.refresh(); };
  q('#avMask').onchange=e=>{ worldEv('mask colour', x=>{ x.mask=e.target.value; }); SIM.refresh(); };
  q('#avIns').onclick=()=> worldAt(SIM.t).card? A.remove() : A.insert(); q('#avErr').onclick=()=>A.canErr();
  q('#avNext').onclick=()=>{ rollSecond(); SIM.refresh(); }; q('#avRst').onclick=()=>{ resetAll(); SIM.seek(0); };
  q('#avFol').onchange=e=>{ D.ui.follow=e.target.checked; };
}
document.addEventListener('keydown', e=>{
  if (!window.__av6202Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase(), w=worldAt(SIM.t);
  const m={ i:()=>A.plug(), p:()=>A.std(w.src.std==='NTSC'?'PAL':'NTSC'), t:()=>A.jumper('TERM'), e:()=>A.jumper('EXT'), b:()=>A.jumper('BAL'), '[':()=>A.lvl(-0.02), ']':()=>A.lvl(0.02), o:()=>A.dashOpen(), n:()=>{ rollSecond(); SIM.refresh(); } };
  if (m[k]){ m[k](); e.preventDefault(); }
});

/* =====================================================================
   VIDEO WAVEFORMS (nominal 1 V p-p, colour bars on active lines) — standard levels, inferred detail
   ===================================================================== */
function compAt(std, vph, t){
  const g=vidGeom(std, vph, t), s=g.s, H=s.H, u=g.inLine, rl=g.rel/H;   // rl = position in lines from the field start
  const pre=s.vs[0], post=s.vs[1]+(s.vs[1]-s.vs[0]);
  if (s.tri){ if (rl < s.vs[1]) return (u%H) < H*0.85 ? -s.sync*0.2 : 0;
    if (u<0.6e-6) return -s.sync; if (u<1.2e-6) return s.sync; if (u<5e-6 || g.line<25) return 0; }
  if (rl < pre || (rl >= s.vs[1] && rl < post)){ const hu = u % (H/2); return hu < 2.3e-6 ? -s.sync : 0; }   // equalising pulses
  if (rl >= s.vs[0] && rl < s.vs[1]){ const hu = u % (H/2); return hu < H/2 - 4.7e-6 ? -s.sync : 0; }      // broad pulses with serrations
  if (u < 4.7e-6) return -s.sync;
  const blank = rl < (s.lines>600? 22.5 : 20) ;
  if (s.fsc && u >= 5.3e-6 && u < 5.3e-6 + s.burst/s.fsc) return (s.white/5)*Math.sin(2*Math.PI*s.fsc*t);
  if (blank || u < 10.9e-6 || u > H - 1.5e-6) return 0;
  const bar=Math.min(7, Math.floor((u-10.9e-6)/(H-12.4e-6)*8)), Y=[1,0.89,0.7,0.59,0.41,0.3,0.11,0][bar];
  const luma = s.setup + Y*0.75*(s.white - s.setup), ch = s.fsc? [0,0.31,0.44,0.41,0.41,0.44,0.31,0][bar]*0.75*s.white : 0;
  return luma + ch*Math.sin(2*Math.PI*s.fsc*t + bar*0.8);
}
function vidIn(t, w){ w=w||worldAt(t); const n=inputNode(w); if (!n.on) return 0; return compAt(n.std, sim().vph, t)*n.gain/1 + n.hum*Math.sin(2*Math.PI*(STD[n.std].mains)*t); }
function vidOut(t, k, w){ w=w||worldAt(t); const sn=snapAt(t); if (!w.card || sn.mode==='off') return 0; const c=chain(w); if (!c.n.on) return 0;
  let v = compAt(c.n.std, sim().vph, t)*c.outs[k||0] + c.humOut*Math.sin(2*Math.PI*STD[c.n.std].mains*t); const lim=3.6*(w.loads[k||0]? 0.5:1); return Math.max(-lim, Math.min(lim, v)); }

/* =====================================================================
   TIMELINE LANES
   ===================================================================== */
function lanes(compact){
  const R=sim(), css=n=>SIM.css(n), ls=[];
  const txt=(c,s,x,y,col)=>{ c.fillStyle=col||css('--ink'); c.font='11px '+css('--mono'); c.fillText(s,x,y); };
  const runs=fn=>{ const out=[]; let cur=null; R.snaps.forEach(sn=>{ const v=fn(sn); if (!cur||cur.v!==v){ if (cur) cur.t1=sn.t; cur={t0:sn.t,v}; out.push(cur); } }); if (cur) cur.t1=1; return out; };
  const segFill=(c,X,y,h)=>R.segs.forEach(g=>{ c.fillStyle= g.kind==='wdt'? css('--bad') : g.kind==='loader'? css('--accent2') : g.kind==='off'? css('--grid') : css('--warn'); c.globalAlpha=.45; c.fillRect(X(g.t0),y+3,Math.max(1,X(g.t1)-X(g.t0)),h-6); c.globalAlpha=1; if (X(g.t1)-X(g.t0)>140){ c.save(); c.beginPath(); c.rect(X(g.t0),y,X(g.t1)-X(g.t0),h); c.clip(); txt(c,g.label,Math.max(X(g.t0),0)+4,y+h/2+4); c.restore(); } });
  const stdAt=t=>syncAt(worldAt(t));
  const logic=(c,X,t0,t1,y,h,fn,col)=>{ const N=Math.min(1600, Math.max(200, X(t1)-X(t0))); c.strokeStyle=col; c.lineWidth=1.4; c.beginPath(); for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N; const v=fn(tt); const yy= v? y+5 : y+h-5; i? c.lineTo(X(tt),yy) : c.moveTo(X(tt),yy); } c.stroke(); };
  ls.push({label:'Card mode (boot · watchdog · loader)', h:24, draw(c,X,t0,t1,y,h){ runs(sn=>sn.mode).forEach(g=>{ if (g.v==='app'){ c.fillStyle=css('--accent'); c.globalAlpha=.16; c.fillRect(X(g.t0),y+5,X(g.t1)-X(g.t0),h-10); c.globalAlpha=1; } }); segFill(c,X,y,h); }});
  ls.push({label:'Video at card input (composite)', h:compact?36:48, draw(c,X,t0,t1,y,h){
    const span=t1-t0, w=worldAt((t0+t1)/2), n=inputNode(w);
    if (!n.on){ txt(c,'no signal ('+n.src+')',X(t0)+6,y+h/2+4,css('--ink2')); return; }
    const s=STD[n.std];
    if (span < 6*s.H){ const N=Math.min(2400, Math.max(400,(X(t1)-X(t0))*2)); c.strokeStyle=css('--accent2'); c.lineWidth=1.1; c.beginPath();
      for (let i=0;i<=N;i++){ const tt=t0+span*i/N; const v=vidIn(tt,w); const yy=y+h*0.62 - v/1.2*h*0.55; i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); return; }
    // fields: vertical interval bands
    const Tf=frameT(s), Fd=fieldT(s); let k=Math.floor((t0-R.vph)/Fd)-1;
    for (;;k++){ const fs=R.vph+k*Fd; if (fs>t1) break; const a=fs+s.vs[0]*s.H, b=fs+s.vs[1]*s.H;
      c.fillStyle=css('--accent2'); c.globalAlpha=.18; c.fillRect(X(fs),y+4,Math.max(1,X(fs+Fd)-X(fs)-1),h-8); c.globalAlpha=1;
      c.fillStyle=css('--ink'); c.fillRect(X(a),y+4,Math.max(1.5,X(b)-X(a)),h-8);
      if (X(fs+Fd)-X(fs)>70) txt(c,(s.il?'field '+(((k%2)+2)%2+1):'frame')+' · '+(s.il? s.lines/2 : s.lines)+' lines',X(fs)+5,y+h/2+4); }
  }});
  ls.push({label:'HSOUT (U2-7 → PA2)', h:20, draw(c,X,t0,t1,y,h){ const std=stdAt((t0+t1)/2); if (!std){ txt(c,'high (no sync)',X(t0)+6,y+14,css('--ink2')); return; }
    const s=STD[std]; if ((X(t0+s.H)-X(t0))<3) SIM.pulses(c,X,t0,t1,y,h,s.H,R.vph,C.HSW,css('--ink'),'HSOUT low pulses'); else logic(c,X,t0,t1,y,h,tt=>!hsLow(std,R.vph,tt),css('--ink')); }});
  ls.push({label:'VSOUT (U2-8 → PA3)', h:20, draw(c,X,t0,t1,y,h){ const std=stdAt((t0+t1)/2); if (!std){ txt(c,'high (no sync)',X(t0)+6,y+14,css('--ink2')); return; } logic(c,X,t0,t1,y,h,tt=>!vsLow(std,R.vph,tt),css('--ink')); }});
  ls.push({label:'FSOUT read at HSOUT ↑ (VFOUT code)', h:22, draw(c,X,t0,t1,y,h){
    R.caps.forEach(cp=>{ if (cp.tEnd<t0||cp.t0>t1) return; const bits=cp.code.toString(2).padStart(11,'0');
      cp.bits.forEach((tb,i)=>{ const x=X(tb); c.fillStyle= bits[i]==='1'? css('--accent') : css('--ink2'); c.fillRect(x-1,y+4,3,h-8); if (X(cp.bits[1])-X(cp.bits[0])>12) txt(c,bits[i],x+3,y+h-6); });
      if (X(cp.tEnd)-X(cp.t0)>40) txt(c, '= '+cp.code, X(cp.tEnd)+4, y+h/2+4); else if (X(cp.t0)>-50) { c.fillStyle=css('--accent'); c.fillRect(X(cp.t0),y+6,2,h-12); } }); }});
  ls.push({label:'main loop: passes ≈'+(C.PASS*1e6).toFixed(1)+' µs · LMH1981 capture', h:28, draw(c,X,t0,t1,y,h){
    const pxPass=X(t0+C.PASS)-X(t0);
    runs(sn=>sn.mode==='app').forEach(g=>{ if (g.v){ c.fillStyle=css('--accent'); c.globalAlpha= pxPass<3? .5 : .12; c.fillRect(X(g.t0),y+4,X(g.t1)-X(g.t0),h-8); c.globalAlpha=1; } });
    if (pxPass>=3){ c.strokeStyle=css('--accent'); c.lineWidth=1; let i0=0, lo=0, hi=R.passes.length-1; while(lo<hi){ const m=(lo+hi)>>1; if (R.passes[m]<t0-C.PASS) lo=m+1; else hi=m; } i0=lo;
      for (let i=i0;i<R.passes.length && R.passes[i]<=t1;i++){ const x=X(R.passes[i]); c.beginPath(); c.moveTo(x,y+4); c.lineTo(x,y+h-4); c.stroke(); } }
    R.caps.forEach(cp=>{ if (cp.tEnd<t0||cp.t0>t1) return; c.fillStyle=css('--warn'); c.fillRect(X(cp.t0),y+3,Math.max(2,X(cp.loop1End)-X(cp.t0)),h-6); c.fillStyle=css('--accent2'); c.fillRect(X(cp.loop1End),y+3,Math.max(2,X(cp.tEnd)-X(cp.loop1End)),h-6);
      if (X(cp.tEnd)-X(cp.t0)>160) txt(c,'loop 1: '+cp.edges1+' HSOUT ↓ · loop 2: 11 × HSOUT ↑',X(cp.t0)+4,y+h/2+4,'#fff'); });
    segFill(c,X,y,h);
    if (pxPass<3 && X(t1)-X(t0)>300 && R.caps.length) txt(c, R.passes.length.toLocaleString()+' fast passes + '+R.caps.length+' blocking captures (one per field) this second', X(t0)+6, y+h/2+4); }});
  ls.push({label:'video_detect_counter (0…1000)', h:30, draw(c,X,t0,t1,y,h){ const N=Math.min(1200,X(t1)-X(t0)); c.strokeStyle=css('--warn'); c.lineWidth=1.3; c.beginPath();
    for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N; const v=counterAt(tt); const yy=y+h-3-(v/C.NO_VIDEO)*(h-6); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke();
    c.strokeStyle=css('--bad'); c.setLineDash([4,3]); c.beginPath(); c.moveTo(X(t0),y+3); c.lineTo(X(t1),y+3); c.stroke(); c.setLineDash([]); }});
  ls.push({label:'LEDs: SYNCH (PB1) / NO SYNCH (PB2)', h:22, draw(c,X,t0,t1,y,h){ const N=Math.min(800,X(t1)-X(t0)); let prev=null, x0=X(t0);
    const col=L=>L.s? LEDC.g : L.n? LEDC.r : css('--grid');
    for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N, L=ledState(tt), k=L.s+'/'+L.n; if (k!==prev || i===N){ if (prev!==null){ c.fillStyle=col(prevL); c.fillRect(x0,y+5,X(tt)-x0,h-10); } prev=k; var prevL=L; x0=X(tt); } } }});
  ls.push({label:'format / pformat → Video Status', h:22, draw(c,X,t0,t1,y,h){ runs(sn=>sn.fmt+'|'+sn.pf).forEach(g=>{ const [fm,pf]=g.v.split('|').map(Number); c.fillStyle= fm? css('--accent') : css('--bad'); c.globalAlpha=.25; c.fillRect(X(g.t0),y+4,X(g.t1)-X(g.t0),h-8); c.globalAlpha=1;
    if (X(g.t1)-X(g.t0)>110) txt(c, FMT[fm]+(BUILDS[snapAt(g.t0).build].latch? ' · pformat '+FMT[pf]:''), X(Math.max(g.t0,t0))+4, y+h/2+4); }); }});
  if (!compact){
    ls.push({label:'timer0 ISR 1 ms (dashboard_initializing)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,C.T0,0.0004,2e-5,css('--accent2'),'timer0'); R.ticks0.forEach(tt=>{ if (tt>=t0&&tt<=t1){ c.fillStyle=css('--warn'); c.fillRect(X(tt)-1,y,3,h); } }); }});
    ls.push({label:'timer1 ISR 96 µs (sends ▮)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,C.T1,0.00003,6e-6,css('--ink2'),'timer1 ticks'); R.sends.forEach(tt=>{ if (tt>=t0&&tt<=t1){ c.fillStyle=css('--play'); c.fillRect(X(tt)-1,y,3,h); } }); }});
  }
  ls.push({label:'CAN 1 Mbit/s (▼ to card · ▲ from card)', h:30, draw(c,X,t0,t1,y,h){ let n=0;
    R.can.forEach(fr=>{ if (fr.t+fr.dur<t0||fr.t>t1) return; n++; const rx=fr.dir==='rx'; c.fillStyle= rx? css('--accent2') : (fr.type===0x10? css('--play') : css('--accent')); const x=X(fr.t), wd=Math.max(2,X(fr.t+fr.dur)-x); c.fillRect(x, rx? y+3 : y+h/2+1, wd, h/2-4);
      if (wd>90){ c.save(); c.beginPath(); c.rect(x,y,wd,h); c.clip(); txt(c, fr.desc, x+3, rx? y+13 : y+h-4, '#fff'); c.restore(); } });
    if (!n) txt(c,'bus idle',X(t0)+6,y+h/2+4,css('--ink2')); }});
  ls.push({label:'DashBoard: Video Status (as received)', h:22, draw(c,X,t0,t1,y,h){ let prev=R.cache0[0x0204], tp=0; const pts=R.cacheEv.filter(e=>e.oid===0x0204).concat([{t:1, v:null, end:true}]);
    pts.forEach(e=>{ const v=prev; c.fillStyle= (!v||v&1)? css('--bad') : css('--accent'); c.globalAlpha=.3; c.fillRect(X(tp),y+4,X(e.t)-X(tp),h-8); c.globalAlpha=1; if (X(e.t)-X(tp)>80) txt(c,valName(v),Math.max(X(tp),X(t0))+4,y+h/2+4); if (!e.end){ c.fillStyle=css('--play'); c.fillRect(X(e.t)-1,y+2,2,h-4); } prev=e.v; tp=e.t; }); }});
  return ls;
}

/* =====================================================================
   VIEWS
   ===================================================================== */
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> <span class="muted">at ${SIM.fmtT(D.log[0].t)} (second ${D.log[0].sec})</span></div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click the card, the jumpers, the level pot, the rear BNCs or the parameter window. Each step the firmware and hardware take is listed here, with the function and part names from the source.</div>'; }
function inspHTML(t){
  const sn=snapAt(t), w=worldAt(t), c=chain(w), B=BUILDS[w.build], cp=capAt(t), lc=lastCap(t), R=sim();
  const notes=R.notes.filter(n=>n.t<=t).slice(-4).reverse();
  return `<table class="kv">
   <tr><th>Mode</th><td>${sn.mode}${cp?' — inside LMH1981_VIDEO_DETECT (loop '+(t<cp.loop1End?1:2)+')':''}</td></tr>
   <tr><th>Input</th><td>${c.n.src}${c.n.on?' · '+STD[c.n.std].name+' · '+vpp(c.vin):''}</td></tr>
   <tr><th>VIDEO_IN (U1 out)</th><td class="mono">${vpp(c.vidIn)} · sync ${syncAt(w)?'seen by U2':'not seen'}</td></tr>
   <tr><th>OUT1…OUT8</th><td class="mono">${c.outs.map(v=>(v*1000).toFixed(0)).join(' · ')} mV p-p${c.clip?' <b style="color:var(--bad)">clipping</b>':''}</td></tr>
   <tr><th>hsynch_detected</th><td class="mono">${sn.hs?'YES':'NO'} · counter ${counterAt(t)}</td></tr>
   <tr><th>video_format</th><td class="mono">${lc? lc.code+' (0b'+lc.code.toString(2).padStart(11,'0')+')' : sn.vf}</td></tr>
   <tr><th>format / pformat</th><td class="mono">${FMT[sn.fmt]} / ${B.latch? FMT[sn.pf] : '— (no latch in '+B.ver+')'}</td></tr>
   <tr><th>Build</th><td>${B.product} v${B.ver} (${B.supplier})</td></tr>
   <tr><th>Recent</th><td class="small">${notes.map(n=>SIM.fmtT(n.t)+' '+n.s).join('<br>')||'—'}</td></tr></table>`;
}
function canLogHTML(t){ const fr=sim().can.filter(f=>f.t<=t).slice(-30).reverse(); return fr.length? fr.map(f=>`<div>${SIM.fmtT(f.t)} ${f.dir==='rx'?'▼':'▲'} <b>${msgName(f.type)}</b> ${esc(f.desc)} <span class="muted">[${f.data.length} B]</span></div>`).join('') : '<div class="muted">No frames yet this second. Press “Open / rescan”.</div>'; }
function drawScope(cv, t){
  const {c,w,h}=SIM.canvas(cv, 200), wd=worldAt(t), n=inputNode(wd); c.fillStyle=SIM.css('--lane'); c.fillRect(0,0,w,h);
  if (!n.on){ c.fillStyle=SIM.css('--ink2'); c.font='13px sans-serif'; c.fillText('No input signal',12,24); return; }
  const s=STD[n.std], g=vidGeom(n.std, sim().vph, t), t0=t-g.inLine, Y=v=>h*0.62 - v*h*0.42;
  c.strokeStyle=SIM.css('--grid'); [-0.3,0,0.7,1].forEach(v=>{ c.beginPath(); c.moveTo(0,Y(v)); c.lineTo(w,Y(v)); c.stroke(); c.fillStyle=SIM.css('--ink2'); c.font='10px '+SIM.css('--mono'); c.fillText(v.toFixed(1)+' V',2,Y(v)-2); });
  const plot=(fn,col)=>{ c.strokeStyle=col; c.lineWidth=1.3; c.beginPath(); for (let i=0;i<=w;i++){ const tt=t0+s.H*i/w; const v=fn(tt); i?c.lineTo(i,Y(v)):c.moveTo(i,Y(v)); } c.stroke(); };
  plot(tt=>vidIn(tt,wd), SIM.css('--accent2')); plot(tt=>vidOut(tt,0,wd), SIM.css('--accent'));
  c.fillStyle=SIM.css('--ink'); c.font='11px sans-serif'; c.fillText('line '+(g.line+1)+' of '+s.lines+' · blue: card input · green: OUT1 into '+(wd.loads[0]?'75 Ω':'an open circuit'),40,14);
  const px=g.inLine/s.H*w; c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(px,18); c.lineTo(px,h); c.stroke();
}
function viewSim(m){
  window.__av6202Active = true;
  m.innerHTML = CSS + `
  <div class="grid2">
   <div>${card('Frame, card and card edge at the playhead', `<div id="frm"></div><div style="margin-top:8px" id="crd"></div>
      <div class="av-row" style="margin-top:8px"><div class="small muted">Card = AV6202A ISS3 top side from the gerbers (TOP + TSM copper, TSS silk; 120 dpi). Click the LVL pot (left half −, right half +), the jumpers (or the legend on the right), the frame slots. Keys: I input cable · P NTSC/PAL · T TERM · E EXT/REF · B BAL · [ ] level · O open in DashBoard · N next second.<div id="wc"></div></div><div id="bergs"></div></div>`)}</div>
   <div>${card('Parameter window (DashBoard-style, generic)', `<div id="dash"></div>`)}${card('What the card did (last action)', `<div id="trace" class="log"></div>`)}</div>
  </div>
  <div class="grid2">
   <div>${card('Rear module and card edge — click IN to plug the feed, an OUT to terminate or open it', `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px"><div id="rear"></div><div id="edge"></div></div><div class="small muted">Rear: T6301A / T6401A ${artSrc(REAR_ART.T6301)}; T6201 ${artSrc(REAR_ART.T6201)}. Card edge: ${SIM.src(ARTDIR+'AV6202A-card-edge.cdr','AV6202A-card-edge.cdr')} (CorelDRAW, 2008|41).</div>`)}</div>
   <div>${card('State at the playhead', `<div id="insp"></div>`)}</div>
  </div>
  ${card('Timeline — one second as the card and its displays see it (click to seek; zoom to “1 field”, “3 lines”, “1 line”)', `<canvas id="tl"></canvas><p class="small muted">Pass time = ${C.PASS_CYC} CPU cycles counted in the ICCAVR listings (${(C.PASS_CPU*1e6).toFixed(1)} µs at 8 MHz) stretched by the timer ISRs to ≈${(C.PASS*1e6).toFixed(1)} µs ${infT('ISR cycle counts estimated from CAN.s')}. LMH1981 output timing (HSOUT width, VSOUT window, VFOUT alignment) ${infT('the LMH1981 data sheet is not in the archive; the firmware constants imply it')}. Changes you make are events at the playhead; “Next second” carries the end state forward.</p>`)}
  <div class="grid2">${card('Scope: one video line at the playhead', `<canvas id="scope"></canvas>`)}${card('CAN frames (newest first)', `<div id="canlog" class="log"></div>`)}</div>`;
  let wcVer=-1;
  const draw=()=>{ const t=SIM.t; finishUploadIfDone();
    if (wcVer!==D.ver){ wcVer=D.ver; m.querySelector('#wc').innerHTML=worldControlsHTML(); bindWorld(m); }
    m.querySelector('#frm').innerHTML=frameSVG(t); m.querySelector('#crd').innerHTML=cardSVG(t); m.querySelector('#bergs').innerHTML=bergsSVG(t);
    m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#rear').innerHTML=rearSVG(t); m.querySelector('#dash').innerHTML=dashHTML(t);
    m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#insp').innerHTML=inspHTML(t); m.querySelector('#canlog').innerHTML=canLogHTML(t);
    SIM.drawLanes(m.querySelector('#tl'), lanes(true), {labelW:210}); drawScope(m.querySelector('#scope'), t); bindAll(m); };
  SIM.on('time', draw);
  let last=0; SIM.on('frame', ts=>{ if (D.ui.upl && !D.ui.upl.applied && ts-last>250){ last=ts; draw(); } });
}

/* ---------------- tutorial (AV6202A Manual, issue 1, 2009|42) ---------------- */
const endW=()=>sim().end.w, endF=()=>sim().end.f;
const LESSONS = [
  {title:'Meet the AV6202A', body:`<p>The AV6202A is a <b>utility analog video distribution amplifier</b>: one composite (NTSC or PAL) input, eight 75 Ω outputs, a differential input stage and a ±3 dB level trim (manual, “Overview”). It can also take its input from one of the two <b>frame references</b>, which makes it a black-burst DA.</p>
    <p>The video path is pure analog (three EL2244 dual op-amps). An AT90CAN128 only <i>watches</i>: an LMH1981 sync separator tells it whether there is video and what format, it lights SYNCH or NO SYNCH, and it reports “Video Status” to DashBoard over the frame’s CAN bus.</p><p class="muted">Sources: AV6202A Manual (2009-12-01), V200 firmware, AV6202-iss2 netlist, ISS3 gerbers.</p>`, check:()=>true, auto:true},
  {title:'1 · Rear module and slot', body:`<p>Three rear modules (manual Fig. 2): <b>T6201A</b> (10-slot DFR-8310), <b>T6301A</b> (one card, all 8 outputs, two slots wide) and <b>T6401A</b> (two cards, 4 outputs each). With the T6301A the manual says to use the <b>even slots</b> 2 … 20.</p><p><b>Goal:</b> T6301A fitted and the card in an even slot other than 4.</p>`, check:()=>{ const w=endW(); return w.rear==='T6301' && w.slot%2===0 && w.slot!==4 && endF().mode==='app'; }, hint:'Click slot 6, 8 … in the frame strip and let it boot (scrub past ≈0.6 s or press Next second).'},
  {title:'2 · Watch it boot', body:`<p>After the move, scrub the timeline. <span class="mono">main()</span> lights <b>NO SYNCH</b> at once (DATA_INITIALIZATION), waits 5 × <span class="mono">wait(3000)</span> (13 ms), then spends ≈0.53 s reading the slot-ID resistor 100 times, joins the CAN bus and enters <span class="mono">while(1)</span>. The first field it reads turns SYNCH on.</p><p><b>Goal:</b> a boot segment is visible in this second and SYNCH is on at the end.</p>`, check:()=>sim().segs.some(g=>g.kind==='boot') && endF().hsynch_detected===1, hint:'Use Pull card / Insert card, or move the card again; then scrub to the end of the second.'},
  {title:'3 · Connect the input', body:`<p>Click the rear <b>IN</b> BNC to unplug the feed and watch: NO SYNCH lights after <span class="mono">NO_VIDEO_CONSTANT</span> = 1000 passes (≈${(1000*C.PASS*1000).toFixed(0)} ms, two fields). Plug it back in: SYNCH comes on at the next vertical sync.</p><p><b>Goal:</b> the feed is plugged in and SYNCH is lit at the end of the second.</p>`, check:()=>endW().src.on && endF().hsynch_detected===1 && sim().resets.some(r=>r.kind==='timeout'), hint:'Click IN twice (unplug, then plug) — the timeout must happen in this second.'},
  {title:'4 · Termination', body:`<p><b>TERM / HI Z</b> “selects the input termination, either high impedance or 75 Ohms”. On the board, the lower pair (pins 1–2) puts R2 75R across the input; the upper pair leaves only R1 22K.</p><p>Exactly one 75 Ω load per line: if the feed ends here use TERM; if you loop it on to another device (which terminates it) use HI Z.</p><p><b>Goal:</b> tick “looped on” and set the jumper so OUT1 is 1.0 V p-p ± 5 %.</p>`, check:()=>{ const w=endW(); const c=chain(w); return w.src.loop && w.TERM==='HIZ' && Math.abs(c.outs[0]-1)<0.05; }, hint:'“looped on” in the controls under the card, then click the TERM jumper.'},
  {title:'5 · Set the level', body:`<p>The <b>Level</b> pot on the card edge (a 2K multi-turn on the board, reached by an extension shaft) trims all eight outputs together. Its divider (R12 47R + 2K + R13 750R) gives a wiper fraction of 0.27 … 0.98, and the output amplifiers have a gain of 2 into the back-matched 75 Ω load.</p><p><b>Goal:</b> set the source to −3 dB, then trim OUT1 back to 1.00 V p-p ± 2 %.</p>`, check:()=>{ const w=endW(); return w.src.dB===-3 && Math.abs(chain(w).outs[0]-1)<0.02; }, hint:'Source level −3 dB, then click the right half of the LVL pot a few times ([ and ] keys).'},
  {title:'6 · Hum and the BAL jumper', body:`<p>A ground loop puts mains hum on the cable shield. With <b>BAL</b> on the upper pair the shield floats into U1A and U1B subtracts it (differential input); on the lower pair the shield is tied to the card ground and the hum becomes picture.</p><p><b>Goal:</b> hum 300 mV, jumper on BAL, less than 5 mV of hum at the outputs.</p>`, check:()=>{ const w=endW(); return w.src.hum===300 && w.BAL==='BAL' && chain(w).humOut<0.005; }, hint:'hum → 300 mV; click BAL to compare both positions.'},
  {title:'7 · Black-burst distribution', body:`<p>Move <b>EXT / REF</b> to REF and pick <b>REF 1</b> or <b>2</b>: Q1 buffers the frame reference from the midplane into the input. The manual: TERM “must be set for HiZ when using the frame reference” — with 75 Ω, R18 30R and R2 75R would cut the level by 2.9 dB.</p><p><b>Goal:</b> input from frame REF 1 (NTSC on REF1), TERM on HI Z, SYNCH on.</p>`, check:()=>{ const w=endW(); return w.EXT==='REF' && w.REF===1 && w.TERM==='HIZ' && w.ref1 && endF().hsynch_detected===1; }, hint:'Click EXT/REF, set REF to 1, TERM to HI Z.'},
  {title:'8 · DashBoard', body:`<p>DashBoard finds the card through the frame controller. <b>Open / rescan</b> makes it read the card’s parameter list, menus and descriptors over CAN (≈60 requests). <b>Card Info</b> shows Product, Name, Supplier, Software Rev and Website; the manual’s “Card Status” is really <b>Video Status</b> under <i>Control ▸ Input Signal</i>: red “No Video Detected”, or green NTSC / PAL.</p><p><b>Goal:</b> open the card and look at Control ▸ Input Signal.</p>`, check:()=>sim().can.filter(f=>f.dir==='rx').length>30 && D.ui.dashTab==='input', hint:'Press Open / rescan, then the “Control ▸ Input Signal” tab.'},
  {title:'9 · The V200 format latch', body:`<p>Put the input back on EXT, then switch the source <b>NTSC → PAL</b> without unplugging it. The LEDs stay green and the card’s <span class="mono">format</span> becomes PAL576, but Video Status keeps saying <b>NTSC</b>: V200 latches <span class="mono">pformat</span> and only clears it when a report goes out with no video.</p><p><b>Goal:</b> a REPORT_PARAM in this second still says NTSC while the card is on PAL.</p>`, check:()=>sim().latch.length>0, hint:'EXT/REF → EXT, source PAL, then let the heartbeat report go out (scrub ≈1 s, or Next second).'},
  {title:'10 · Reboot and upgrade', body:`<p><b>Reboot</b> makes <span class="mono">CAN_FUNCTIONS</span> stop feeding the watchdog; the AVR restarts after ≈16 ms. <b>Upload</b> writes BOOT_CONTROL = RUNLDR first, so the watchdog reset lands in the Ross bootloader (added in V101), which takes the .bin page by page. The video keeps flowing through the analog path all the time.</p><p><b>Goal:</b> upload <span class="mono">av6202a_v2_00.bin</span> (or the Cobalt <span class="mono">9233_v1_01.bin</span>, and see the Product change).</p>`, check:()=>!!(D.ui.upl && D.ui.upl.applied && FILES[D.ui.upl.file].build), hint:'Choose a file in the parameter window and press Upload…, then wait for the bar.'},
  {title:'Done', body:`<p>The <b>Software</b> tab follows the main loop and the LMH1981 capture step by step; <b>One second</b> breaks a second down to fields, lines and sync pulses; <b>Findings</b> lists what the code is really doing.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){
  window.__av6202Active = true;
  m.innerHTML = CSS + `<div class="grid2"><div>${card('Tutorial — installing and running an AV6202A', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('What the card did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The frame, card, jumpers and rear module', `<div id="frm"></div><div id="crd" style="margin-top:6px"></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:6px"><div id="bergs"></div><div id="rear"></div><div id="edge"></div></div><div id="wc"></div>`)}${card('Parameter window', `<div id="dash"></div>`)}</div></div>`;
  let wcVer=-1;
  const draw=()=>{ const t=SIM.t; finishUploadIfDone();
    if (wcVer!==D.ver){ wcVer=D.ver; m.querySelector('#wc').innerHTML=worldControlsHTML(); bindWorld(m); }
    m.querySelector('#frm').innerHTML=frameSVG(t); m.querySelector('#crd').innerHTML=cardSVG(t,{labels:false}); m.querySelector('#bergs').innerHTML=bergsSVG(t); m.querySelector('#rear').innerHTML=rearSVG(t,{compact:true}); m.querySelector('#edge').innerHTML=edgeSVG(t);
    m.querySelector('#dash').innerHTML=dashHTML(t); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#lessons').innerHTML=LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=>li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx]; let ok=false; try{ ok=L.check(); }catch(e){ ok=false; }
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>
      <p class="small muted">Goals are checked against the state at the end of the simulated second.</p>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); }; m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ resetAll(); lessonIdx=0; SIM.seek(0); }; bindAll(m); };
  SIM.on('time', draw);
  let last=0; SIM.on('frame', ts=>{ if (D.ui.upl && !D.ui.upl.applied && ts-last>250){ last=ts; draw(); } });
}

/* ---------------- one second, field by field, line by line ---------------- */
function viewSecond(m){
  window.__av6202Active = true;
  m.innerHTML = CSS + `${card('One second, broken down', `<div id="ladder"></div>`)}
   <div class="grid2">${card('As seen by the card', `<div id="dev"></div>`)}${card('As seen by the displays', `<div style="display:grid;grid-template-columns:150px minmax(0,1fr);gap:10px"><div id="edge"></div><div><div id="dview"></div><canvas id="pic"></canvas><p class="small muted">Picture monitor on OUT1: colour bars, brightness and size follow the output level; hum shows as moving bars ${inf}.</p></div></div>`)}</div>
   ${card('Zoom ladder at the playhead — from one second down to the sync edge', `<canvas id="zl"></canvas><p class="small muted">Blue = card input, green = OUT1, black = HSOUT and VSOUT, orange = the main loop blocked inside LMH1981_VIDEO_DETECT.</p>`)}
   ${card('Timeline (full lanes)', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{
    const t=SIM.t, R=sim(), w=worldAt(t), n=inputNode(w), std=n.on? n.std : w.src.std, s=STD[std], sn=snapAt(t);
    const tx=R.can.filter(f=>f.dir==='tx').length, rx=R.can.filter(f=>f.dir==='rx').length, capT=R.caps.reduce((a,c)=>a+c.tEnd-c.t0,0);
    const rows=[
      [s.il?'Frames / fields':'Frames', s.il? (1/frameT(s)).toFixed(3)+' / '+(1/fieldT(s)).toFixed(3) : (1/frameT(s)).toFixed(3), SIM.fmtDur(fieldT(s)), s.il? s.lines/2+' lines per field, alternating field codes '+s.codes.join(' / ') : s.lines+' lines, code '+s.codes[0]],
      ['Lines (HSOUT pulses)', (1/s.H).toFixed(1), SIM.fmtDur(s.H), 'LMH1981 HSOUT falls at each line sync'],
      ['Vertical syncs (VSOUT low)', (1/fieldT(s)).toFixed(3), SIM.fmtDur((s.vs[1]-s.vs[0])*s.H)+' low', 'the only time the AVR looks at the line code'],
      ['LMH1981 captures (blocking)', R.caps.length, R.caps.length? SIM.fmtDur(capT/R.caps.length) : '—', 'loop 1 (3 HSOUT ↓) + loop 2 (11 HSOUT ↑, FSOUT shifted into video_format): ≈'+(capT*100).toFixed(1)+' % of the CPU'],
      ['Fast main-loop passes', R.passes.length.toLocaleString(), SIM.fmtDur(C.PASS), C.PASS_CYC+' cycles each; video_detect_counter +1 per pass'],
      ['No-video timeout', '—', SIM.fmtDur(1001*C.PASS), 'NO_VIDEO_CONSTANT 1000 passes ≈ '+(1001*C.PASS/fieldT(s)).toFixed(1)+' fields'],
      ['timer1 interrupts', (1/C.T1).toFixed(0), SIM.fmtDur(C.T1), 'CAN_TX_TIMER: next frame of a reply, or a report after TX_HEARTBEAT / TX_INITIALIZE ticks'],
      ['Video Status reports', R.sends.length, SIM.fmtDur((sn.init? 1000*(D.s0.f.mod-0x10)+1 : C.TX_HEART+1)*C.T1), sn.init? 'dashboard_initializing: every 1000 × slot ticks' : 'heartbeat every 10 001 ticks'],
      ['timer0 interrupts', '1,000', '1 ms', 'counts CAN receptions once a second → dashboard_initializing'],
      ['CAN frames this second', rx+' rx · '+tx+' tx', SIM.fmtDur(frameTime(8)), '1 Mbit/s, 8-byte extended frame ≈ 144 µs with stuffing '+inf],
      ['Colour subcarrier cycles per line', s.fsc? (s.fsc*s.H).toFixed(2) : '—', s.fsc? SIM.fmtDur(1/s.fsc) : '—', s.fsc? 'burst '+s.burst+' cycles; the EL2244s pass it untouched' : 'no burst (Y only)'],
    ];
    m.querySelector('#ladder').innerHTML = `<p class="small">Input: <b>${n.on? STD[n.std].name : 'none'}</b>. Step units in the transport: line, field, frame, main-loop pass, timer1 tick, 1 µs.</p><table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>what happens</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    const g=vidGeom(std, R.vph, t), cp=capAt(t), fr=R.can.filter(f=>f.t<=t && f.t+f.dur>=t)[0];
    m.querySelector('#dev').innerHTML = `<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>Video</th><td class="mono">${n.on? (s.il?'field '+(g.fld+1)+', ':'')+'line '+(Math.floor(g.rel/s.H)+1)+' of the field ('+(g.line+1)+' of the frame), '+(g.inLine*1e6).toFixed(2)+' µs into the line' : 'no input'}</td></tr>
      <tr><th>LMH1981 pins</th><td class="mono">${syncAt(w)? 'HSOUT '+(hsLow(std,R.vph,t)?'low':'high')+' · VSOUT '+(vsLow(std,R.vph,t)?'low':'high')+' · OEOUT '+(g.fld?'even':'odd')+' '+infT('polarity') : 'outputs idle (no sync)'}</td></tr>
      <tr><th>AT90CAN128</th><td class="mono">${sn.mode!=='app'? (segAt(t)||{label:sn.mode}).label : cp? 'LMH1981_VIDEO_DETECT loop '+(t<cp.loop1End? '1: counting HSOUT falls in VSOUT' : '2: shifting FSOUT at HSOUT rises')+' (blocks main)' : 'fast pass: VSOUT high → video_detect_counter = '+counterAt(t)}</td></tr>
      <tr><th>timer1 tick</th><td class="mono">#${Math.floor(t/C.T1)} · timer0 ms ${Math.floor(t*1000)}</td></tr>
      <tr><th>CAN bus</th><td class="mono">${fr? (fr.dir==='rx'?'▼ ':'▲ ')+esc(fr.desc) : 'idle'}</td></tr></table>`;
    m.querySelector('#edge').innerHTML=edgeSVG(t);
    const c=cacheAt(t), B=BUILDS[w.build];
    m.querySelector('#dview').innerHTML=`<table class="kv"><tr><th>DashBoard shows</th><td></td></tr><tr><td>Video Status</td><td class="mono">${valName(c[0x0204])}</td></tr><tr><td>Product</td><td class="mono">${esc(c[0x0105]||'')}</td></tr><tr><td>Software Rev</td><td class="mono">${esc(c[0x010B]||'')}</td></tr></table><p class="small muted">LEDs follow hsynch_detected on the next pass; DashBoard waits for a REPORT_PARAM (or a GET_PARAM).</p>`;
    // picture monitor
    const {c:p,w:pw,h:ph}=SIM.canvas(m.querySelector('#pic'), 120); p.fillStyle='#000'; p.fillRect(0,0,pw,ph);
    const ch=chain(w), lv=w.card && ch.n.on && sn.mode!=='off'? ch.outs[0] : 0;
    if (lv>0.05){ const cols=[[235,235,235],[235,235,16],[16,235,235],[16,235,16],[235,16,235],[235,16,16],[16,16,235],[16,16,16]];
      const gain=Math.min(1.6, lv/(w.loads[0]?1:2)); for (let i=0;i<8;i++){ const [r,gg,b]=cols[i].map(v=>Math.min(255,Math.round(v*gain))); p.fillStyle=`rgb(${r},${gg},${b})`; p.fillRect(i*pw/8, 0, pw/8+1, ph); }
      if (ch.humOut>0.002){ const ph0=(t*STD[ch.n.std].mains)%1; for (let y=0;y<ph;y+=2){ const a=Math.min(0.5, ch.humOut*4)*Math.sin(2*Math.PI*(y/ph+ph0)); p.fillStyle=a>0?`rgba(255,255,255,${a})`:`rgba(0,0,0,${-a})`; p.fillRect(0,y,pw,2); } }
      if (!syncAt(w)){ p.fillStyle='rgba(0,0,0,.4)'; p.fillRect(0,0,pw,ph); } }
    else { p.fillStyle='#777'; p.font='13px sans-serif'; p.fillText('no picture',12,22); }
    // zoom ladder
    const levels=[['1 second',1],['1 field',fieldT(s)],['vertical interval (24 lines)',24*s.H],['3 lines',3*s.H],['1 line',s.H],['sync edge (10 µs)',10e-6]];
    const Hh=levels.length*50+10, {c:z,w:zw}=SIM.canvas(m.querySelector('#zl'),Hh);
    levels.forEach(([nm,span],i)=>{ const y=8+i*50, t0=Math.max(0,Math.min(1-span,t-span/2)), x0=190, pw2=zw-x0-10, Xz=tt=>x0+(tt-t0)/span*pw2;
      z.fillStyle=SIM.css('--ink'); z.font='12px sans-serif'; z.fillText(nm,6,y+16); z.fillStyle=SIM.css('--ink2'); z.font='10.5px '+SIM.css('--mono'); z.fillText(SIM.fmtDur(span),6,y+30);
      z.strokeStyle=SIM.css('--grid'); z.strokeRect(x0,y+2,pw2,40);
      R.caps.forEach(cpp=>{ if (cpp.tEnd<t0||cpp.t0>t0+span) return; z.fillStyle=SIM.css('--warn'); z.globalAlpha=.3; z.fillRect(Xz(cpp.t0),y+2,Math.max(1,Xz(cpp.tEnd)-Xz(cpp.t0)),40); z.globalAlpha=1; });
      const N=Math.min(1600,pw2*2); const plot=(fn,col,yo,sc)=>{ z.strokeStyle=col; z.lineWidth=1; z.beginPath(); for (let k=0;k<=N;k++){ const tt=t0+span*k/N, v=fn(tt); const yy=y+yo-v*sc; k?z.lineTo(x0+pw2*k/N,yy):z.moveTo(x0,yy); } z.stroke(); };
      if (n.on && span<=fieldT(s)+1e-9){ plot(tt=>vidIn(tt,w),SIM.css('--accent2'),26,16); if (syncAt(w)){ plot(tt=>hsLow(std,R.vph,tt)?0:1,SIM.css('--ink'),40,4); plot(tt=>vsLow(std,R.vph,tt)?0:1,SIM.css('--ink'),12,5); } }
      else if (n.on){ const Fd=fieldT(s); for (let k=Math.floor((t0-R.vph)/Fd)-1;;k++){ const fs=R.vph+k*Fd; if (fs>t0+span) break; const a=fs+s.vs[0]*s.H; if (a>=t0){ z.fillStyle=SIM.css('--ink'); z.fillRect(Xz(a),y+4,1,36); } } z.fillStyle=SIM.css('--ink2'); z.font='10.5px sans-serif'; z.fillText((1/fieldT(s)).toFixed(2)+' vertical syncs; orange = the AVR reading the field code',x0+6,y+26); }
      if (span<=s.H*3+1e-12 && n.on) plot(tt=>vidOut(tt,0,w)/(w.loads[0]?1:2),SIM.css('--accent'),26,16);
      const px=Xz(t); z.strokeStyle=SIM.css('--play'); z.beginPath(); z.moveTo(px,y); z.lineTo(px,y+44); z.stroke(); });
    SIM.drawLanes(m.querySelector('#tl'), lanes(false), {labelW:210});
  };
  SIM.on('time', draw);
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  pc:{x:10,y:10,w:160,h:58,t:'PC: DashBoard',s:['Card Info · Video Status','.bin upload'],d:'DashBoard talks to the frame controller over Ethernet. Everything it shows comes from the card’s CAN replies and its REPORT_PARAM heartbeat. The card has no writable parameters: DashBoard can only watch, reboot and upgrade it.'},
  mfc:{x:10,y:100,w:160,h:66,t:'Frame controller',s:['Ethernet ↔ CAN','SNMP agent (V200 MIB)'],d:'Turns DashBoard requests into openGear CAN messages addressed to 0x10 + slot. With V200 it can ask the card for its SNMP base (25030.1.1.6) and OID strings and publish AV6202-CARD-MIB.'},
  mid:{x:10,y:196,w:160,h:110,t:'Midplane P2 (MEDAC20)',s:['CANH P2-13 · CANL P2-11','REF1 P2-14 · REF2 P2-10','AN_SLOTID P2-6','+VA P2-1/3/5 · −VA P2-2'],d:'Power (+12 V, −7.5 V per the manual), the CAN bus, the slot-ID resistor and the two bussed frame references. The AV6202A is the only card in this family that can use a frame reference as its video input.'},
  rear:{x:10,y:336,w:160,h:100,t:'Rear module P1 (MEDAC100)',s:['IN: BNC1_SIG P1-97','OUT1–8: P1-75/80/37/34/17/22/5/12','T6201A · T6301A · T6401A'],d:'Passive BNC boards. The card sees the input on P1-97 with its own isolated shield (BNC1_GND, P1-95…100) — that is what makes the differential input work. BNC2_SIG (P1-92) goes nowhere on the card.'},
  h2:{x:210,y:250,w:150,h:96,t:'H2 EXT/REF · H4 REF 1/2',s:['Q1 2N4401 follower','R15 1K · R18 30R · R16 10K'],d:'H2 picks the rear BNC (EXT) or the buffered frame reference (REF). H4 picks REF1 or REF2 for Q1. ISS3 ECO: Q1 collector 3V → +V and R16 to −V, so the follower can swing below ground (sync tips).'},
  term:{x:210,y:370,w:150,h:66,t:'TERM · BAL (H1)',s:['R2 75R / R1 22K','shield float or to GNDD'],d:'TERM puts R2 75R across the input; HI Z leaves R1 22K. BAL lets the shield float into U1A (differential) or ties it to the card ground.'},
  u1:{x:400,y:300,w:160,h:90,t:'U1 EL2244',s:['differential stage, ×2','VIDEO_IN = 2·(sig − shield)'],d:'U1A buffers the shield ×2 (R7/R8 1K), U1B makes 2·Vsig − 2·Vshield (R10/R11 1K). 1 V p-p in (terminated) → 2 V p-p on VIDEO_IN.'},
  lvl:{x:600,y:300,w:150,h:90,t:'LEVEL',s:['R12 47R · 2K multi-turn','R13 750R · R14 10R'],d:'Wiper fraction 0.27 … 0.98 of VIDEO_IN; unity overall at 0.50 (≈32 % of the travel). Netlist range ≈ −5.4 … +5.9 dB, manual “±3 dB”.'},
  amps:{x:790,y:270,w:170,h:150,t:'U5 · U6 EL2244',s:['4 amplifiers, gain 2','8 × 75R back-match','R37/38 R39/40 R46/47 R48/49'],d:'Each amplifier drives two outputs through its own 75R, so a fault on one BNC does not disturb its neighbour. Into 75 Ω, 2 × wiper × VIDEO_IN ÷ 2 = 1 V p-p.'},
  u2:{x:400,y:150,w:160,h:100,t:'U2 LMH1981',s:['sync separator on VIDEO_IN','HSOUT VSOUT FSOUT → PA2/3/4','CSOUT BPOUT OEOUT (unused)'],d:'Fed from VIDEO_IN through C4. The AVR reads only HSOUT, VSOUT and the line-count output (net FSOUT). It never sees the level pot: the detector looks before it.'},
  mcu:{x:600,y:110,w:190,h:140,t:'AT90CAN128 @ 8 MHz',s:['while(1): LMH1981_VIDEO_DETECT,','  REFRESH_LEDS, CAN_FUNCTIONS','timer0 1 ms · timer1 96 µs · CAN ISR','LEDs PB1/PB2 · JTAG'],d:'A WBS super-loop, not the zeuslib/GearOS scheduler. 23.8 KB of code (V100W.mp), Ross bootloader in the top 8 KB. No ADC on the video, no control of the analog path.'},
  can:{x:210,y:110,w:150,h:66,t:'U7 SN65HVD233',s:['TXD PD5 · RXD PD6','LBK PD7 (CAN_RX/CAN_TX)'],d:'1 Mbit/s CAN to the frame controller. The firmware macros CAN_RX / CAN_TX actually switch the transceiver’s loop-back pin: loop-back during boot, on-bus after CANinit.'},
  led:{x:830,y:110,w:130,h:80,t:'Card edge',s:['SYNCH (green, PB1)','NO SYNCH (red, PB2)','Level pot shaft'],d:'REFRESH_LEDS every pass from hsynch_detected. The manual lists NO SYNCH as green; the BOM and ECO say red.'},
  pwr:{x:600,y:410,w:150,h:60,t:'Power',s:['LM317 +5 V · LM337 −5 V','LM1117 3.3 V'],d:'R57/R58 665R/221 → 1.25 × (1 + 665/221) = 5.0 V; R55/R56 the same for −5 V; LM1117-3.3 for the AVR, LMH1981 and transceiver. RXE050 polyfuses F1/F2.'},
};
const WIRES=[['pc','mfc','Ethernet'],['mfc','mid','CAN'],['mid','can','CANH/L'],['can','mcu','TX/RX'],['mid','h2','REF1/REF2'],['rear','term','IN'],['term','h2',''],['h2','u1','input'],['u1','lvl','VIDEO_IN'],['u1','u2','C4'],['u2','mcu','HSOUT VSOUT FSOUT'],['lvl','amps','wiper'],['amps','rear','OUT1–8'],['mcu','led','PB1/PB2'],['mid','mcu','slot ID'],['pwr','amps','±5 V']];
function viewBlock(m){
  window.__av6202Active = false;
  m.innerHTML = `${card('Block diagram (click a block)', `<div id="bd"></div>`)}<div class="grid2">${card('Selected block', `<div id="bdd"></div>`)}${card('Signal levels through the chain (live)', `<div id="ladder"></div>`)}</div>`;
  const draw=()=>{
    const w=worldAt(SIM.t), cc=chain(w), B=BLOCKS; const ctr=k=>[B[k].x+B[k].w/2, B[k].y+B[k].h/2];
    let s=`<svg viewBox="0 0 980 480" style="width:100%">`;
    WIRES.forEach(([a,b,l])=>{ const [x1,y1]=ctr(a), [x2,y2]=ctr(b); s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" stroke-width="1.4"/>${l?`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-3}" font-size="10" fill="var(--ink2)">${l}</text>`:''}`; });
    Object.entries(B).forEach(([k,b])=>{ const on=D.ui.blk===k; s+=`<g class="av-blk" data-b="${k}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="6" fill="var(--panel)" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?2.5:1.2}"/>
      <text x="${b.x+8}" y="${b.y+17}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+33+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; });
    m.querySelector('#bd').innerHTML=s+'</svg>';
    m.querySelectorAll('.av-blk').forEach(g=>g.onclick=()=>{ D.ui.blk=g.dataset.b; draw(); });
    const b=B[D.ui.blk]; m.querySelector('#bdd').innerHTML=`<h3 style="margin-top:0">${b.t}</h3><p>${b.d}</p>`;
    const rows=[['Source / reference (into 75 Ω)', cc.n.on? 1*Math.pow(10,(w.EXT==='EXT'?w.src.dB:0)/20) : 0, cc.n.src],
      ['Card input node', cc.vin, (w.TERM==='75'?'R2 75R':'R1 22K only')+(w.src.loop&&w.EXT==='EXT'?' + far-end 75 Ω':'')+(w.EXT==='REF'?' · via Q1 and R18 30R':'')],
      ['VIDEO_IN (U1B out)', cc.vidIn, '×2 differential; hum '+(cc.humIn*1000).toFixed(1)+' mV'], ['LVL wiper', cc.vidIn*cc.f, 'fraction '+cc.f.toFixed(3)],
      ['U5/U6 outputs (before 75R)', cc.amp, 'gain 2'+(cc.clip?' — clipping':'')], ['OUT1 at the BNC', cc.outs[0], w.loads[0]? 'into 75 Ω' : 'open (unterminated)']];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Stage</th><th>p-p</th><th>re 1 V</th><th>note</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${vpp(r[1])}</td><td class="mono">${dB(r[1])}</td><td class="small">${r[2]}</td></tr>`).join('')}</table>
      <p class="small muted">Gains from the AV6202-iss2 netlist and BOM values (ISS3 has only an ECO changing Q1/R16). EL2244 swing ±3.6 V on ±5 V and the Q1 gain 0.99 are ${inf}.</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- schematics, redrawn from AV6202-iss2.net / .bom (+ ISS1 and ISS3 ECOs) ---------------- */
const R_=(x,y,v,name,vert)=> vert? `<rect x="${x-6}" y="${y}" width="12" height="34" fill="none" stroke="var(--ink)"/><text x="${x+9}" y="${y+14}" font-size="10" fill="var(--ink)">${name}</text><text x="${x+9}" y="${y+27}" font-size="9.5" fill="var(--ink2)">${v}</text>`
  : `<rect x="${x}" y="${y-6}" width="34" height="12" fill="none" stroke="var(--ink)"/><text x="${x+17}" y="${y-10}" font-size="10" text-anchor="middle" fill="var(--ink)">${name}</text><text x="${x+17}" y="${y+19}" font-size="9.5" text-anchor="middle" fill="var(--ink2)">${v}</text>`;
const L_=(pts)=>`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="var(--ink)" stroke-width="1.3"/>`;
const T_=(x,y,s,a,col)=>`<text x="${x}" y="${y}" font-size="10.5" ${a?`text-anchor="${a}"`:''} fill="${col||'var(--ink)'}">${s}</text>`;
const NET=(x,y,s,a)=>`<text x="${x}" y="${y}" font-size="10" font-family="var(--mono)" ${a?`text-anchor="${a}"`:''} fill="var(--accent2)">${s}</text>`;
const GND=(x,y)=>`<path d="M${x} ${y} v6 M${x-8} ${y+6} h16 M${x-5} ${y+10} h10 M${x-2} ${y+14} h4" stroke="var(--ink)" fill="none"/>`;
const AMP=(x,y,name,pp,pn,po)=>`<path d="M${x} ${y-30} L${x+60} ${y} L${x} ${y+30} Z" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+6}" y="${y-12}" font-size="11" fill="var(--ink)">+</text><text x="${x+6}" y="${y+18}" font-size="11" fill="var(--ink)">−</text>
  <text x="${x+14}" y="${y+4}" font-size="9" fill="var(--ink)">${name.split(' ')[0]}</text><text x="${x}" y="${y+44}" font-size="9" fill="var(--ink2)">${name.split(' ').slice(1).join(' ')}</text><text x="${x-4}" y="${y-18}" font-size="9" text-anchor="end" fill="var(--ink2)">${pp}</text><text x="${x-4}" y="${y+26}" font-size="9" text-anchor="end" fill="var(--ink2)">${pn}</text><text x="${x+62}" y="${y-6}" font-size="9" fill="var(--ink2)">${po}</text>`;
const JMP=(x,y,name,labels,sel)=>`<rect x="${x-8}" y="${y}" width="16" height="46" fill="none" stroke="var(--ink)"/>${[0,1,2].map(i=>`<circle cx="${x}" cy="${y+8+i*15}" r="3.5" fill="none" stroke="var(--ink)"/><text x="${x+11}" y="${y+11+i*15}" font-size="9" fill="var(--ink2)">${labels[i]}</text>`).join('')}<rect x="${x-5}" y="${y+3+sel*15}" width="10" height="25" rx="2" fill="#e8c23a" opacity=".7"/><text x="${x}" y="${y-5}" font-size="10.5" text-anchor="middle" fill="var(--ink)">${name}</text>`;
const CHIP=(x,y,w,h,name,sub,left,right)=>{ let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y+16}" font-size="11.5" font-weight="700" text-anchor="middle" fill="var(--ink)">${name}</text><text x="${x+w/2}" y="${y+30}" font-size="9.5" text-anchor="middle" fill="var(--ink2)">${sub}</text>`;
  left.forEach((p,i)=>{ const yy=y+46+i*18; s+=`<line x1="${x-14}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+4}" y="${yy+4}" font-size="9.5" fill="var(--ink)">${p[0]}</text><text x="${x-16}" y="${yy+4}" font-size="9.5" text-anchor="end" font-family="var(--mono)" fill="var(--accent2)">${p[1]}</text>`; });
  right.forEach((p,i)=>{ const yy=y+46+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+14}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-4}" y="${yy+4}" font-size="9.5" text-anchor="end" fill="var(--ink)">${p[0]}</text><text x="${x+w+16}" y="${yy+4}" font-size="9.5" font-family="var(--mono)" fill="var(--accent2)">${p[1]}</text>`; });
  return s; };
function sheets(w){ return [
  {name:'1 · Input and differential stage', svg:`
    ${T_(20,44,'P1-97')}${NET(20,66,'BNC1_SIG')}${L_([[40,50],[110,50]])}${JMP(120,40,'H2 EXT/REF',['1 EXT','2','3 REF'],w.EXT==='EXT'?0:1)}${T_(40,110,'H2-3 ← Q1 (sheet 2)','start','var(--ink2)')}
    ${L_([[120,63],[200,63],[200,90]])}${NET(205,60,'NET00018 (input node)')}
    ${JMP(260,110,'TERM',['3','2','1 → R2'],w.TERM==='75'?1:0)}${L_([[200,90],[260,90],[260,110]])}${L_([[260,156],[260,175]])}${R_(260,175,'75R','R2',true)}${L_([[260,209],[260,230],[60,230]])}
    ${L_([[200,90],[200,130]])}${R_(200,130,'22K','R1',true)}${GND(200,164)}
    ${L_([[200,90],[340,90]])}${R_(340,90,'33R','R4')}${L_([[374,90],[420,90]])}
    ${T_(20,222,'P1-95…100 BNC1_GND (isolated shield)')}${L_([[60,230],[60,300],[340,300]])}${R_(340,300,'33R','R5')}${L_([[374,300],[420,300]])}
    ${JMP(110,320,'H1 BAL',['3 n/c','2 BNC1_GND','1 GNDD'],w.BAL==='BAL'?0:1)}${L_([[60,300],[60,343],[110,343]])}${GND(110,366)}
    ${R_(160,380,'22K','R6')}${T_(160,410,'C2 0.1µ + R3 24R → GNDD','start','var(--ink2)')}
    ${AMP(420,90,'U1B EL2244','5','6','7')}${AMP(420,300,'U1A EL2244','3','2','1')}
    ${L_([[480,300],[530,300],[530,250]])}${R_(530,216,'1K','R10',true)}${L_([[530,216],[530,200],[400,200],[400,105],[420,105]])}
    ${L_([[480,300],[480,345],[440,345]])}${R_(440,345,'1K','R7')}${T_(380,350,'R8 1K → GND','end','var(--ink2)')}${L_([[440,345],[410,345],[410,315],[420,315]])}
    ${L_([[480,90],[620,90]])}${L_([[560,90],[560,150],[400,150],[400,105]])}${R_(470,150,'1K','R11')}${NET(625,94,'VIDEO_IN')}
    ${T_(600,130,'= 2·(V(NET00018) − V(BNC1_GND))','start','var(--ink2)')}${T_(600,148,'R9, C6 DNI','start','var(--ink2)')}
    ${T_(600,200,'→ C4 0.1µ → U2-4 LMH1981 (sheet 4)')}${T_(600,218,'→ R12 47R → LVL (sheet 3)')}` },
  {name:'2 · Frame-reference buffer (added in ISS2)', svg:`
    ${T_(20,60,'P2-14 REF1')}${T_(20,130,'P2-10 REF2')}${L_([[90,56],[150,56],[150,70]])}${L_([[90,126],[150,126],[150,116]])}
    ${`<rect x="140" y="66" width="20" height="54" fill="none" stroke="var(--ink)"/>`}${T_(170,96,'H4 REF 1/2 (pin 3 = REF1, 1 = REF2)')}
    ${`<circle cx="150" cy="76" r="3.5" fill="none" stroke="var(--ink)"/><circle cx="150" cy="93" r="3.5" fill="none" stroke="var(--ink)"/><circle cx="150" cy="110" r="3.5" fill="none" stroke="var(--ink)"/><rect x="145" y="${w.REF===1?71:88}" width="10" height="27" rx="2" fill="#e8c23a" opacity=".7"/>`}
    ${L_([[150,93],[250,93],[250,170]])}${R_(250,170,'1K','R15')}${L_([[284,170],[330,170]])}
    <path d="M330 140 v60 M330 160 L370 135 M330 180 L370 205" stroke="var(--ink)" fill="none" stroke-width="1.4"/><path d="M362 198 l8 7 l-10 1" fill="var(--ink)"/>${T_(380,175,'Q1 NPN (BOM “1N4401”, i.e. 2N4401)')}
    ${L_([[370,135],[370,90]])}${T_(380,90,'collector: 3V on ISS2 → +V (ISS3 ECO)')}
    ${L_([[370,205],[370,240],[480,240]])}${R_(480,240,'30R','R18')}${L_([[514,240],[600,240]])}${T_(605,244,'→ H2-3 (REF)')}
    ${L_([[370,240],[370,270]])}${R_(370,270,'10K','R16',true)}${T_(385,320,'to GNDD on ISS2 → −V (ISS3 ECO)')}
    ${T_(20,370,'With TERM on 75 Ω the 30R and R2 75R divide by 0.714 (−2.9 dB): hence “must be set for HiZ when using the frame reference”.','start','var(--ink2)')}
    ${T_(20,390,'An emitter follower with its emitter load to ground cannot follow a signal below ground; the ISS3 ECO (2008-10-10) gives it a negative supply.','start','var(--ink2)')}` },
  {name:'3 · Level and output amplifiers', svg:`
    ${NET(20,64,'VIDEO_IN')}${L_([[80,60],[110,60]])}${R_(110,60,'47R','R12')}${L_([[144,60],[180,60],[180,80]])}
    <rect x="170" y="80" width="20" height="90" fill="none" stroke="var(--ink)"/><path d="M200 125 h-8 l6 -5 m-6 5 l6 5" stroke="var(--ink)" fill="none"/>${T_(160,126,'LVL 2K','end')}${T_(160,140,'multi-turn','end','var(--ink2)')}
    ${L_([[180,170],[180,190]])}${R_(180,190,'750R','R13',true)}${GND(180,224)}
    ${L_([[200,125],[240,125]])}${R_(240,125,'10R','R14')}${L_([[274,125],[320,125]])}${NET(260,110,'NET00030')}${L_([[320,60],[320,400]])}
    ${[[0,'U5A','3','2','1','R24','R25','R37','P1-75','R38','P1-80'],[1,'U5B','5','6','7','R31','R32','R39','P1-37','R40','P1-34'],[2,'U6A','3','2','1','R34','R35','R46','P1-17','R47','P1-22'],[3,'U6B','5','6','7','R43','R44','R48','P1-5','R49','P1-12']].map(([i,n,pp,pn,po,rf,rg,ra,pa,rb,pb])=>{ const y=70+i*95;
      return `${L_([[320,y-15],[400,y-15]])}${AMP(400,y,n+' EL2244',pp,pn,po)}${L_([[460,y],[520,y]])}${L_([[520,y-22],[520,y+22]])}${L_([[520,y-22],[560,y-22]])}${R_(560,y-22,'75R',ra)}${T_(600,y-18,'→ '+pa)}${L_([[520,y+22],[560,y+22]])}${R_(560,y+22,'75R',rb)}${T_(600,y+26,'→ '+pb)}
        ${L_([[400,y+15],[380,y+15],[380,y+40],[430,y+40]])}${R_(430,y+40,'1K',rf)}${L_([[464,y+40],[490,y+40],[490,y]])}${T_(372,y+52,rg+' 1K → GND','end','var(--ink2)')}`; }).join('')}
    ${T_(680,90,'Gain of each amplifier = 1 + 1K/1K = 2')}${T_(680,108,'Into 75 Ω: ×½ → output = 2 × wiper × VIDEO_IN ÷ 2')}${T_(680,126,'Wiper fraction = (750 + 2000·p) / 2797 = 0.268 … 0.983')}${T_(680,144,'→ OUT/IN = 0.536 … 1.966 (−5.4 … +5.9 dB)')}${T_(680,162,'Manual: “±3 dB”')}
    ${T_(680,200,'R42 and C8 (on NET00030) are DNI.','start','var(--ink2)')}${T_(680,218,'T6401A uses only P1-75/37/17/5 — one output per amplifier.','start','var(--ink2)')}` },
  {name:'4 · Sync separator, controller, CAN', svg:`
    ${CHIP(60,40,150,190,'U2 LMH1981','TSSOP14, 3V (ISS1 ECO)',[['4 VIDEO','← C4 ← VIDEO_IN'],['1 (R17 10K)','bias'],['3/6/11 VCC','3V'],['2/5/10 GND','GNDD']],[['7 HSOUT','HSYNCH'],['8 VSOUT','VSOUT'],['9 (VFOUT)','FSOUT'],['12 CSOUT','CSOUT'],['13 BPOUT','BPOUT'],['14 OEOUT','OEOUT']])}
    ${CHIP(390,40,190,330,'U8 AT90CAN128','TQFP64, 8 MHz (X1, C45/C47 27p)',[['49 PA2','HSYNCH'],['48 PA3','VSOUT'],['47 PA4','FSOUT'],['46 PA5','CSOUT (unused)'],['45 PA6','BPOUT (unused)'],['44 PA7','OEOUT (unused)'],['61 PF0/ADC0','AN_SLOTID P2-6'],['60 PF1','AN_BMID P1-2'],['59 PF2','AN_BMID2 P1-1'],['20 RESET','R59 10K'],['54–57 PF7–4','JTAG1']],[['11 PB1','SYNCH → R62 → LED1'],['12 PB2','NO_SYNCH → R61 → LED2'],['30 PD5 TXCAN','CAND → U7-1'],['31 PD6 RXCAN','CANR ← U7-4'],['32 PD7','LBK → U7-5'],['64 AVCC','R60 10R']])}
    ${CHIP(800,250,150,110,'U7 SN65HVD233','BOM “SN65HDV233D”',[['1 D','CAND'],['4 R','CANR'],['5 LBK','LBK']],[['7 CANH','P2-13'],['6 CANL','P2-11']])}
    ${T_(60,400,'R52/R53/R54 1K pull-ups to 3V on AN_BMID2 / AN_BMID / AN_SLOTID. Only ADC0 (slot) is read by the firmware.','start','var(--ink2)')}
    ${T_(60,418,'ISS1: LEDs to 3V (active low) on swapped pins — SYNCH on PB2, ERROR on PB1. The firmware drives PB1 high for SYNCH:','start','var(--ink2)')}
    ${T_(60,436,'on ISS1 that turns the ERROR LED off and the SYNCH LED on — two inversions cancel.','start','var(--ink2)')}` },
  {name:'5 · Power', svg:`
    ${T_(20,70,'P2-1/3/5 +VA (+12 V)')}${L_([[140,66],[180,66]])}${T_(185,60,'F1 RXE050')}${L_([[250,66],[300,66]])}${T_(255,90,'→ REG3 LM1117-3.3 → 3V','start')}${T_(305,60,'FB1 BLM41P')}${L_([[380,66],[420,66]])}
    ${CHIP(420,30,140,90,'REG2 LM317','D2PAK',[['3 IN','']],[['2 OUT','+V']])}${T_(580,140,'R58 221 / R57 665: 1.25 × (1 + 665/221) = 5.01 V')}
    ${T_(20,220,'P2-2 −VA (−7.5 V)')}${L_([[140,216],[180,216]])}${T_(185,210,'F2 RXE050')}${L_([[250,216],[300,216]])}${T_(305,210,'FB2 BLM41P')}${L_([[380,216],[420,216]])}
    ${CHIP(420,180,140,90,'REG1 LM337','D2PAK',[['2 IN','']],[['3 OUT','−V']])}${T_(580,290,'R56 221 / R55 665: −1.25 × (1 + 665/221) = −5.01 V (ECO 2008-09-22)')}
    ${T_(20,340,'Manual: +12 V 120 mA, −7.5 V 55 mA. The EL2244s run on ±5 V, the AVR, LMH1981 and SN65HVD233 on 3.3 V.','start','var(--ink2)')}` },
]; }
function viewSchem(m){
  window.__av6202Active = false;
  m.innerHTML = card('Schematics — redrawn from AV6202-iss2.net and .bom (not the original P-CAD sheets; the ISS3 .sch is binary)', `<div id="tabs2" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px"></div><div id="sh"></div><p class="small muted">Jumper caps follow the simulator. Pin numbers and net names are from the netlist; LMH1981 pin functions other than those the firmware names (HSOUT, VSOUT, FSOUT) are from the net names on the schematic. ISS3 changes come from WORKING/AV6202-iss3.ECO.</p>`);
  const draw=()=>{ const S=sheets(worldAt(SIM.t)); m.querySelector('#tabs2').innerHTML=S.map((s,i)=>`<button data-i="${i}" class="${i===D.ui.sheet?'on':''}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ D.ui.sheet=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 980 460" style="width:100%;background:var(--lane);border:1px solid var(--line);border-radius:8px">${S[D.ui.sheet].svg}<text x="970" y="452" font-size="10" text-anchor="end" fill="var(--ink2)">AV6202 ISS2 netlist · redrawn</text></svg>`; };
  SIM.on('time', draw);
}

/* ---------------- software ---------------- */
const LOOP_STEPS = [
  ['WDR(); WDR();', 'the watchdog (≈16 ms) is fed every pass and inside every wait loop'],
  ['hsynch_detected = LMH1981_VIDEO_DETECT(hsynch_detected)', 'VSOUT high: counter + 1, timeout check · VSOUT low: blocks ≈14 lines'],
  ['REFRESH_LEDS()', 'PB1 = SYNCH, PB2 = ERROR (NO SYNCH)'],
  ['WDR(); WDR();', '(ALTERA_write / ALTERA_read are commented out — template from the D6201A)'],
  ['CAN_FUNCTIONS()', 'PARAMETER_UPDATE · ENABLE_MODE · MOB_error → CANinit · reboot → while(1) CLI()'],
];
function viewSoft(m){
  window.__av6202Active = false;
  m.innerHTML = `<div class="grid2"><div>${card('Main loop at the playhead (v100w.c)', `<div id="loop"></div>`)}${card('LMH1981_VIDEO_DETECT — state at the playhead', `<div id="lmh"></div>`)}</div>
    <div>${card('Field code shift register (video_format)', `<div id="sr"></div>`)}${card('Video Status path — CAN_TX_TIMER and the V200 latch', `<div id="latch"></div>`)}</div></div>
    <div class="grid2"><div>${card('Cycle budget (ICCAVR 7.15 listings, 8 MHz)', `<div id="cyc"></div>`)}${card('Interrupts and timers (CAN.c)', `<div id="isr"></div>`)}</div>
    <div>${card('CAN messages the card answers (DASHBOARD_RESPONSE_SETUP)', `<div id="msgs"></div>`)}${card('OIDs, menus and SNMP map', `<div id="oids"></div>`)}</div></div>
    <div class="grid2">${card('AT90CAN128 port map (port_init, AV6202A.h, LMH1981.h, netlist)', `<div id="ports"></div>`)}${card('Builds and versions', `<div id="vers"></div>`)}</div>`;
  const draw=()=>{
    const t=SIM.t, sn=snapAt(t), cp=capAt(t), w=worldAt(t), B=BUILDS[w.build], lc=lastCap(t), f=sn;
    let k = sn.mode!=='app'? -1 : cp? 1 : Math.floor(((t - (sim().passes.filter(p=>p<=t).pop()||0))/C.PASS)*5) % 5;
    m.querySelector('#loop').innerHTML=`<svg viewBox="0 0 520 ${LOOP_STEPS.length*52+40}" style="width:100%">${LOOP_STEPS.map((s,i)=>`<rect x="20" y="${10+i*52}" width="480" height="42" rx="6" fill="${i===k?'color-mix(in srgb,var(--accent) 28%,var(--panel))':'var(--panel)'}" stroke="${i===k?'var(--accent)':'var(--line)'}" stroke-width="${i===k?2.5:1}"/>
      <text x="32" y="${28+i*52}" font-size="12" font-family="var(--mono)" fill="var(--ink)">${esc(s[0])}</text><text x="32" y="${44+i*52}" font-size="10.5" fill="var(--ink2)">${esc(s[1])}</text>`).join('')}
      <path d="M12 ${10+LOOP_STEPS.length*52-20} V20 h8" stroke="var(--ink2)" fill="none"/><text x="20" y="${LOOP_STEPS.length*52+30}" font-size="11" fill="var(--ink2)">${sn.mode==='app'? 'while(1)' : 'not in the loop: '+sn.mode+((segAt(t)||{}).label?' — '+segAt(t).label:'')}</text></svg>`;
    const st = sn.mode!=='app'? 'OFF' : cp? (t<cp.loop1End? 'LOOP1' : 'LOOP2') : 'FAST';
    const node=(x,y,id,l1,l2)=>`<g><rect x="${x}" y="${y}" width="150" height="50" rx="8" fill="${st===id?'color-mix(in srgb,var(--accent) 28%,var(--panel))':'var(--panel)'}" stroke="${st===id?'var(--accent)':'var(--line)'}" stroke-width="${st===id?2.5:1}"/><text x="${x+75}" y="${y+20}" font-size="11.5" font-weight="700" text-anchor="middle" fill="var(--ink)">${l1}</text><text x="${x+75}" y="${y+37}" font-size="10" text-anchor="middle" fill="var(--ink2)">${l2}</text></g>`;
    m.querySelector('#lmh').innerHTML=`<svg viewBox="0 0 520 250" style="width:100%">${node(10,20,'FAST','fast path','VSOUT high: counter++')}${node(185,20,'LOOP1','loop 1','count 3 × HSOUT ↓')}${node(360,20,'LOOP2','loop 2','11 × HSOUT ↑: shift FSOUT')}
      ${node(360,150,'CLS','classify','260/259 → NTSC480 …')}${node(10,150,'TO','timeout','counter == 1000 → NO')}
      <path d="M160 45 h25 M335 45 h25 M435 70 v80 M360 175 H160 M85 70 v80" stroke="var(--ink2)" fill="none" marker-end=""/>
      <text x="170" y="38" font-size="9.5" fill="var(--ink2)">VSOUT low</text><text x="337" y="38" font-size="9.5" fill="var(--ink2)">3 edges</text><text x="440" y="115" font-size="9.5" fill="var(--ink2)">11 edges</text><text x="200" y="168" font-size="9.5" fill="var(--ink2)">detect = YES → status YES, counter 0</text><text x="90" y="115" font-size="9.5" fill="var(--ink2)">1000 passes</text>
      <text x="185" y="110" font-size="10" fill="var(--ink2)">NO_HSYNCH_CONSTANT timeout in loop 2</text><text x="185" y="124" font-size="10" fill="var(--ink2)">sets status = NO … then “else detect = YES”</text><text x="185" y="138" font-size="10" fill="var(--ink2)">overwrites it (see Findings)</text>
      <text x="10" y="235" font-size="11" fill="var(--ink)">now: ${st} · counter ${counterAt(t)} · hsynch_detected ${sn.hs?'YES':'NO'} · format ${FMT[sn.fmt]}</text></svg>`;
    const code = lc? lc.code : sn.vf, bits=(code||0).toString(2).padStart(11,'0');
    const nread = cp && t>=cp.loop1End? cp.bits.filter(b=>b<=t).length : 11;
    m.querySelector('#sr').innerHTML=`<svg viewBox="0 0 520 110" style="width:100%">${bits.split('').map((b,i)=>`<rect x="${20+i*44}" y="20" width="40" height="40" rx="4" fill="${i<nread? (b==='1'?'color-mix(in srgb,var(--accent) 40%,var(--panel))':'var(--panel)') : 'var(--chip)'}" stroke="var(--line)"/><text x="${40+i*44}" y="46" font-size="16" text-anchor="middle" font-family="var(--mono)" fill="var(--ink)">${i<nread?b:'·'}</text><text x="${40+i*44}" y="74" font-size="9" text-anchor="middle" fill="var(--ink2)">2^${10-i}</text>`).join('')}
      <text x="20" y="100" font-size="12" fill="var(--ink)">video_format = video_format &lt;&lt; 1 | FSOUT at each HSOUT ↑ → ${code} → ${classify(code)? FMT[classify(code)] : 'no match (detect = YES, format kept)'}</text></svg>
      <table class="kv small"><tr><th>code</th><th>format</th><th>DashBoard entry</th><th>= lines per field − 3</th></tr>${[['260 / 259','NTSC480 (1)','NTSC','263 / 262'],['310 / 309','PAL576 (2)','PAL','313 / 312'],['522','PRO480 (3)','480p','525'],['622','PRO576 (4)','576p','625'],['747','PRO720 (5)','720p','750'],['560 / 559','INT1080 (6)','1080i','563 / 562'],['1122','PRO1080 (7)','1080p','1125'],['anything else','unchanged','(see Findings)','—']].map(r=>`<tr>${r.map(x=>`<td class="mono">${x}</td>`).join('')}</tr>`).join('')}</table>
      <p class="small muted">The “− 3” relation is ${infT('the codes in LMH1981.c; the LMH1981 VFOUT definition is not archived')}. NTSC480_2, PAL576_2, INT1080_2 (codes 8–10) are defined but commented out (“Ali-Add”).</p>`;
    const r=reportVal({format:sn.fmt, pformat:sn.pf}, B), c=cacheAt(t);
    m.querySelector('#latch').innerHTML=`<table class="kv"><tr><th>format (LMH1981.c)</th><td class="mono">${FMT[sn.fmt]}</td></tr><tr><th>pformat (Dashboard.c)</th><td class="mono">${B.latch? FMT[sn.pf] : 'not in '+B.ver}</td></tr>
      <tr><th>next REPORT_PARAM 2.4</th><td class="mono">0x${hx(r.v,4)} → “${valName(r.v)}” (${r.note})</td></tr><tr><th>DashBoard holds</th><td class="mono">${valName(c[0x0204])}</td></tr></table>
      <pre class="small mono" style="white-space:pre-wrap;background:var(--lane);padding:6px;border-radius:6px">if (format){                       // “SDI FORMAT”
   if (pformat == 0){ buffer[5] = 1 &lt;&lt; format;  pformat = format; }   //Ali-Add
   else               buffer[5] = 1 &lt;&lt; pformat;                      //Ali-Add
} else { buffer[5] = BIT0; pformat = format; }   // NO LOCK</pre>
      <p class="small">PARAMETER_UPDATE only marks <span class="mono">parameter_change</span>; the report itself waits for timer1 (${sim().snaps.length && snapAt(t).init? '1000 × slot = '+(1000*(D.s0.f.mod-0x10))+' ticks while DashBoard is initialising' : '10 000 ticks ≈ 0.96 s'}).</p>`;
    m.querySelector('#cyc').innerHTML=`<table class="kv"><tr><th>Part of one fast pass</th><th>cycles</th></tr>${[['main: 4 × WDR, lds/sts, 3 × xcall, xjmp',27],['LMH1981_VIDEO_DETECT fast path (push_xgsetF0FC … pop)',106],['REFRESH_LEDS',16],['CAN_FUNCTIONS + PARAMETER_UPDATE + ENABLE_MODE test',74]].map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td></tr>`).join('')}
      <tr><td><b>total</b></td><td class="mono"><b>${C.PASS_CYC} = ${(C.PASS_CPU*1e6).toFixed(1)} µs</b></td></tr><tr><td>timer1 ISR every 96 µs (≈${C.T1_ISR_CYC} cycles) + timer0 every 1 ms (≈${C.T0_ISR_CYC})</td><td class="mono">${(100*(C.T1_ISR_CYC/768+C.T0_ISR_CYC/8000)).toFixed(1)} %</td></tr>
      <tr><td>effective pass</td><td class="mono">${(C.PASS*1e6).toFixed(1)} µs</td></tr><tr><td>NO_VIDEO_CONSTANT 1000 passes</td><td class="mono">${(1001*C.PASS*1000).toFixed(1)} ms</td></tr>
      <tr><td>wait(3000): 7 cycles × 3000</td><td class="mono">${(C.WAIT3000*1000).toFixed(3)} ms</td></tr><tr><td>boot (5 waits + 100 slot samples + CANinit)</td><td class="mono">${(C.BOOT.reduce((a,b)=>a+b[0],0)*1000).toFixed(0)} ms</td></tr></table>
      <p class="small muted">Fast-path counts are from v100w.s, LMH1981.s, CAN.s and Dashboard.s; the push/pop helper and ISR costs are ${inf}.</p>`;
    m.querySelector('#isr').innerHTML=`<table class="kv"><tr><th>timer0_ovf_isr</th><td>clk/64, TCNT0 0x83 → 1 ms. Every 1000: can_data_rx &lt; 10 for 3 s → dashboard_initializing = NO.</td></tr>
      <tr><th>timer1_ovf_isr</th><td>first overflow 96 ms after CANinit (0xD120), then every 96 µs (0xFFF4). CANTX_BUFFER_CHECK + CAN_TX_TIMER: next frame of a multi-frame reply every tick (plus one more every 10); RESTART trap once; REPORT_PARAM 2.4 every 1000 × slot ticks (initialising) or 10 000 ticks.</td></tr>
      <tr><th>can_rx_isr</th><td>MOB_error = YES; CANRX parses, DASHBOARD_RESPONSE_SETUP builds the reply, CANTX sends the first frame from inside the interrupt; can_data_rx++.</td></tr>
      <tr><th>watchdog</th><td>WDTCR = 0x08 (≈16 ms). Reboot = stop feeding it.</td></tr>
      <tr><th>scheduler</th><td>None: a plain while(1). The Ross OGP-SDK files in the tree are product.c / eeprom.c helpers and the bootloader; zeuslib/GearOS is not used.</td></tr></table>`;
    m.querySelector('#msgs').innerHTML=`<table class="kv small"><tr><th>type</th><th>message</th><th>card’s answer</th></tr>${[
      ['0x45','GET_NUMPARAMS','*(ParamOIDS_Message+3) = '+B.nparam],['0x46','GET_PARAM_OIDS','ParamOIDS_Message ('+(4+2*B.nparam)+' B, multi-frame)'],['0x47','GET_DESCRIPTOR','2.4 (105 B), 1.5, 1.6, 1.2, 1.4, 1.B; also 2.E / 2.F (SDI leftovers); else UNSUPPORTED'],
      ['0x49','GET_PARAM','2.4 (6 B, single frame) and the five strings; 1.7 → UNSUPPORTED'],['0x4A','SET_PARAM','2.4 (echo 1 &lt;&lt; format), 255.7 / 255.8 restore_start (DataSafe)'],
      ['0x50–0x53','menus','“Status” (Card Info) · “Control” (Input Signal, Metadata, Audio Processing)'],['0x56–0x58','SNMP',B.snmp?'base, OID and trap strings (V200)':'UNSUPPORTED (no SNMP before V200)'],
      ['0x43','REBOOT','reboot_device = YES'],['0x40','START_UPGRADE','CAN_UPGRADE_WAIT 1000 ms, then BOOT_CONTROL = RUNLDR and reboot'],['other','—','CANRESP_UNSUPPORTED']].map(r=>`<tr><td class="mono">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table>`;
    m.querySelector('#oids').innerHTML=`<table class="kv small"><tr><th>OID</th><th>name</th><th>menu</th><th>SNMP</th></tr>${[[0x0105,'Product','Card Info'],[0x0106,'Name','Card Info'],[0x0102,'Supplier','Card Info'],[0x0107,'(none — UNSUPPORTED)','Card Info'],[0x010B,'Software Rev','Card Info'],[0x0104,'Website','Card Info'+(B.nparam<6?' (not in ParamOIDS on Cobalt)':'')],[0x0204,'Video Status (ALARM_TABLE)','Control ▸ Input Signal']].map(r=>`<tr><td class="mono">${oidTxt(r[0])}</td><td>${r[1]}</td><td>${r[2]}</td><td class="mono">${SNMP[r[0]]||'—'}</td></tr>`).join('')}</table>
      <p class="small">MIB: AV6202-CARD-MIB, openGearObjects 6 under enterprise 25030; av6202VideoStatus INTEGER {No_Video_Detected(1), NTSC(2), PAL(4)}; notification AV6202VideoStatusEvent = 0.3.</p>`;
    m.querySelector('#ports').innerHTML=`<table class="kv small"><tr><th>port</th><th>pins</th><th>use</th></tr>${[['PA2/PA3/PA4','49/48/47','HSOUT, VSOUT, FSOUT from U2 (LMH1981.h)'],['PA5/PA6/PA7','46/45/44','CSOUT, BPOUT, OEOUT — wired, never read'],['PINA (all)','','also DIP_SWITCHES_PIN in AV6202A.h — READ_DIP_SWITCHES is never called (no DIP switch on this card)'],['PB1 / PB2','11/12','SYNCH_LED / ERROR_LED (PORTB 0x08 at reset: PB3 high, LEDs off)'],['PC3','','HSYNCH macro (PINC & BIT3) — wrong pin, unused'],['PD5/PD6/PD7','30/31/32','TXCAN, RXCAN, LBK of the SN65HVD233 (CAN_TX clears, CAN_RX sets)'],['PF0 (ADC0)','61','AN_SLOTID — 100-sample slot measurement at boot'],['PF4–PF7','54–57','JTAG']].map(r=>`<tr><td class="mono">${r[0]}</td><td class="mono">${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table>`;
    m.querySelector('#vers').innerHTML=`<table class="kv small"><tr><th>build</th><th>date</th><th>what</th></tr><tr><td>V100 (1.0.0.0)</td><td>${SIM.year(2009)}-10-10</td><td>released as Cobalt 9233 (source only in Obsolete/v100.rar)</td></tr><tr><td>V101 (1.0.0.1)</td><td>${SIM.year(2009)}-12-22</td><td>bootloader + DataSafe (255.7/255.8); tree built with COBALT → 9233_v1_01.bin, “1.00” + SOFTWARE_VERSION 1 = “1.01”</td></tr>
      <tr><td>V200 (2.0.0.0)</td><td>${SIM.year(2012)}-02-14</td><td>SNMP (“Ali-Add”), pformat latch; WARD_BECK → av6202a_v2_00.bin, “2.00” with SOFTWARE_VERSION 0</td></tr></table>
      <p class="small">Simulated build: <b>${B.product} v${B.ver}</b> — ${B.src}. Change it with Upload in the parameter window.</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
const FINDINGS = [
  `<b>How it differs from the AV6201A.</b> The AV6201A is the “Differential Input, Clamping and Cable Equalization” DA (its manual; BOM: EQ pot, GB4571 clamp, ISL55002). The AV6202A is the “Utility” version: no EQ, no clamp, and a new <b>frame-reference input</b> — H2 EXT/REF, H4 REF 1/2 and the Q1 buffer — that turns it into a black-burst DA. In firmware the AV6201A reports Card Status 2.1, input 2.2 and has a writable “Notify on Card Fault” 4.0 (<span class="mono">smpte_alarm_enabled</span>); the AV6202A has one status parameter, Video Status 2.4, an ALARM_TABLE of format names, and nothing writable.`,
  `<b>It does not run the Ross zeuslib scheduler.</b> v100w.c is a plain <span class="mono">while(1)</span> with three interrupts (timer0, timer1, CAN), a WBS CAN driver (CAN.c, identical to the D6203A’s apart from the COM LED lines) and Ross headers. The only Ross run-time code is the bootloader in the top 8 KB and the product.c/eeprom.c helpers.`,
  `<b>The V200 format latch.</b> Dashboard.c (“Ali-Add”) reports <span class="mono">1 &lt;&lt; pformat</span> once pformat is set and clears it only when a report or GET_PARAM goes out with <span class="mono">format == NO_LOCK</span>. A source that changes NTSC → PAL without losing sync for a whole report period keeps showing NTSC in DashBoard and SNMP. The same lines were tried first in LMH1981.c and are still there, commented out. SET_PARAM 2.4 answers <span class="mono">1 &lt;&lt; format</span> and ignores the latch, so the two replies can disagree.`,
  `<b>The h-sync timeout is dead code.</b> In loop 2 of <span class="mono">LMH1981_VIDEO_DETECT</span>, <span class="mono">hsynch_video_detect_counter == NO_HSYNCH_CONSTANT</span> sets <span class="mono">status = NO</span> and breaks — but <span class="mono">video_detected</span> is already YES, the partial code matches nothing, and the final <span class="mono">else { detect = YES; }</span> sets status back to YES.`,
  `<b>Any vertical sync counts as video.</b> Unknown line codes take the <span class="mono">else</span> branch: <span class="mono">detect = YES</span> with <span class="mono">format</span> unchanged (the <span class="mono">detect = NO; format = NO_LOCK</span> lines are commented out). A non-standard source after a reboot gives a green SYNCH LED while DashBoard says “No Video Detected” (format still 0). Try “Non-standard (VTR shuttle)”.`,
  `<b>The AVR blocks once per field.</b> When a pass finds VSOUT low, the function waits for 3 HSOUT falls and 11 HSOUT rises — about 14 lines (≈0.9 ms, ≈5 % of the CPU) with <span class="mono">WDR</span> in both loops. If VSOUT ever stuck low without HSOUT edges, loop 1 would spin for ever and still feed the watchdog ${infT('the LMH1981 output states with a broken input are not documented in the archive')}; the CAN interrupt would keep answering, but the LEDs and status would freeze.`,
  `<b>Loss-of-video timing comes from the loop speed.</b> NO_VIDEO_CONSTANT is a pass count, not a time: ${C.PASS_CYC} cycles per pass (counted in the .s files) plus interrupts ≈ ${(C.PASS*1e6).toFixed(0)} µs → ≈${(1001*C.PASS*1000).toFixed(0)} ms, two fields. Between fields the counter peaks at ≈${Math.round((fieldT(STD.NTSC)-0.0009)/C.PASS)} (NTSC) / ≈${Math.round((fieldT(STD.PAL)-0.0009)/C.PASS)} (PAL), so the margin is set by code speed ${inf}.`,
  `<b>Status changes wait for the timer.</b> PARAMETER_UPDATE notices a change of <span class="mono">hsynch_detected</span> but only sets <span class="mono">parameter_change</span>; CAN_TX_TIMER sends the same 2.4 report on its fixed schedule — every 10 000 timer1 ticks (0.96 s), or every 1000 × slot ticks while DashBoard is “initialising”, which is <i>slower</i> than the heartbeat in slots 11–20 (slot 20: 1.92 s).`,
  `<b>Menus come from a Dolby/SDI template.</b> Menu sets “Status” and “Control”; Video Status sits under Control ▸ Input Signal. “Metadata” lists 33 OIDs (count byte 18) of Dolby metadata (5.x, 6.x, 2.10…) and “Audio Processing” 7.1/7.2 — all answered UNSUPPORTED. Menu0OID says 6 OIDs but lists 7: 1.7 (handler commented out) is requested and refused, 3.2 is never read. GET_DESCRIPTOR still answers 2.E “VANC Line Number” and 2.F “Embedded Audio”. Response51–57 (“Dolby AC-3”, “PCM 1”…) are compiled in.`,
  `<b>The ALARM_TABLE trick works.</b> MESSAGE_CREATOR_PARAMETER_24 writes each entry as a 16-bit value: 0x0002 = bit 0 / severity 2 (red) “No Video Detected”, 0x0100 = bit 1 “NTSC”, 0x0200 = bit 2 “PAL” … — exactly the SDK’s NamedAlarm {shift, severity, name} (alarmtable.c). With <span class="mono">1 &lt;&lt; format</span> the set bit is the format. The MIB’s No_Video_Detected(1)/NTSC(2)/PAL(4) match; 480p…1080p (8…128) are possible but not enumerated.`,
  `<b>SNMP (V200) leftovers.</b> GET_SNMP_TRAP for 1.5 returns “0.1”, a notification the MIB does not define. The MIB’s object group lists <span class="mono">AV6202Product</span> but the object is <span class="mono">av6202Product</span> (“first 2 chars are lower case!”), and its LAST-UPDATED (2007-03-07) is the template’s. AV6202snmpMAP.xls spells “NTDC”. With COBALT defined, MESSAGE_CREATOR_GET_SNMP_BASE_RESPONSE has no string, so V200 cannot be built for Cobalt — and v200/cobalt_ztcpack.txt still makes 9233_v1_01.bin, version 1.01.`,
  `<b>The archived V101 tree is the Cobalt build.</b> v101/common.h defines COBALT (Product “9233”, Supplier “Cobalt Digital”, 5 parameters — no Website). Software Rev is the string “1.00” with character 3 replaced by <span class="mono">'0' + SOFTWARE_VERSION</span> (1 → “1.01”); V200 changes the string to “2.00” and SOFTWARE_VERSION to 0. The manual promises a “two digit software revision code”.`,
  `<b>Cloned code.</b> v100w.c is headed “OPEN GEAR (D6201A) ISSUE 4, JUNE 2, 2008”, AV6202A.c is headed “D6201A.C” and contains only an empty PROCESS_MODES and commented-out EQ push-button and ALTERA routines; MODE1…MODE6 (“OUT1 = REF1”) are AES-DA modes. <span class="mono">HSYNCH</span> is defined on PINC.3 (the real HSOUT is PA2); <span class="mono">DIP_SWITCHES_PIN</span> is PINA, which on this board carries the LMH1981 outputs (READ_DIP_SWITCHES is never called). <span class="mono">LMH1981_SYNCH_DETECT</span> is never called. The AV6201A main() waits 10 × wait(3000); this one 5 ×.`,
  `<b>Unused LMH1981 outputs.</b> CSOUT, BPOUT and OEOUT are routed to PA5–PA7 but never read; the odd/even information is recovered from the 259/260 code instead.`,
  `<b>Board history (netlists and ECOs).</b> ISS1 (2008-09) has no frame-reference path and a SWTERM switch; ISS2 adds H2, H4, Q1 and the TERM header. ISS1’s LEDs are active-low on swapped pins (ERROR on PB1, SYNCH on PB2) — with the same firmware the two inversions cancel. ISS1 ECO moves U2 to 3V; ECO 2008-09-24 makes the ERROR LED red; the ISS3 ECO moves Q1’s collector from 3V to +V and R16 from GNDD to −V, so the buffer can follow sync tips below ground — on ISS2 the black-burst sync was probably clipped ${inf}. The BOM calls Q1 a “1N4401” (an NPN 2N4401), U7 “SN65HDV233D”, and its title says “AV6201”; GERBERS/ holds AV6201.* files from the board it was started from.`,
  `<b>Level range vs manual.</b> With the netlist values (47R + 2K + 750R, gain 2, 75R back-match) the trim spans ≈ −5.4 … +5.9 dB, not the manual’s ±3 dB; unity is at about a third of the pot’s travel.`,
  `<b>Manual mismatches.</b> NO SYNCH is listed as green (BOM/ECO: red). The block diagram shows COM and ERROR tallies the card does not have. DashBoard’s “Card Status: green / red dot” is really Video Status with format names, under Control. The supplier reads “Ward-Beck Systems” (the manual adds “Ltd.”). Ordering information calls the spare manual a “Universal Analog Audio Distribution Amplifier User Manual”. The rear-module drawing (AV6202-card-edge.cdr) still labels the T6401 cards “AV6201-1/-2”; the T6201 drawing shows IN on position 2 where the manual says N/C (P1-92 goes nowhere on the card).`,
  `<b>CAN macros are named backwards.</b> <span class="mono">CAN_RX</span> sets PD7 = the SN65HVD233 loop-back pin (card off the bus) and <span class="mono">CAN_TX</span> clears it. And can_rx_isr starts with <span class="mono">MOB_error = YES</span>: any interrupt that is not a clean reception makes the next pass call CANinit(), which also restarts both timers and so delays the next report. CANRX also logs every message type and source into <span class="mono">message_test_buffer[100]</span> / <span class="mono">MOB_read_buffer[100]</span> with <span class="mono">if (index &lt; sizeof(buf)) index++</span>, so the index reaches 100 and the next write lands one byte past each array.`,
  `<b>DataSafe can silence the card.</b> SET_PARAM 255.7 ≠ 0 (or 255.8 with bit 0 clear) sets <span class="mono">restore_start</span>, and CAN_TX_TIMER sends no REPORT_PARAM until it is cleared.`,
  `<b>Artwork 2026|59: card edge and rear modules now from CorelDRAW.</b> Card edge from ${SIM.src(ARTDIR+'AV6202A-card-edge.cdr','AV6202A-card-edge.cdr')} (2008-10-21); T6301A / T6401A from ${artSrc(REAR_ART.T6301)}; T6201 from ${artSrc(REAR_ART.T6201)}. <span class="mono">AV6202-card-edge.cdr</span> is misnamed: it holds no card edge but a copy of the AV6201 rear-module sheet (T6201, T6301, T6401; the T6401 still says “AV6201-1 / AV6201-2”). The 2012|45 guide numbers T6301A outputs OUT 1–4 down the left and OUT 5–8 down the right, against the P1 pin order used here (OUT1 at position 3, OUT2 at 4 …), and labels position 2 “Not Connected”; the 2008 sheet labels it “IN”.`
];
const ASSUME = [
  'LMH1981 output timing: HSOUT low ≈4.7 µs at each line start, VSOUT low for the broad-pulse window (3 H NTSC, 2.5 H PAL, 5 H 720p), VFOUT presenting the code MSB-first on the 11 lines after VSOUT. The data sheet is not archived; the firmware constants imply it.',
  'Main-loop pass ≈'+(C.PASS*1e6).toFixed(1)+' µs: '+C.PASS_CYC+' cycles counted from the listings (push/pop helpers estimated) and ISR load estimated at '+C.T1_ISR_CYC+' cycles per timer1 tick.',
  'Analog values from the ISS2 netlist; ISS3 is assumed equal apart from its ECO. EL2244 swing ±3.6 V, Q1 gain 0.99, ≈40 dB common-mode rejection and the sync slicer range of the LMH1981 are assumptions.',
  'LVL pot: 25 turns (MULTI footprint; the turn count is not stated).',
  'Frame-controller request order and pacing (0.4 ms) and the SNMP query set; upload duration is compressed.',
  'Frame references are 1 V p-p black burst on a terminated midplane line.',
  'Rear-module drawing grid reuses the T6302 DXF geometry from the openGear plugin.',
];
const SOURCES = ['AV6202A/Software/atmel/v200/ v100w.c, LMH1981.c/.h, Dashboard.c/.h, CAN.c/.h, ADC.c, AV6202A.h/.c, common.h, *.s, V100W.mp, *_ztcpack.txt',
  'AV6202A/Software/atmel/v101/ (same files, COBALT build)', 'AV6202A/Software/AV6202A SOFTWARE HISTORY.xls', 'AV6202A/SNMP/v200/AV6202-CARD.mib, AV6202snmpMAP.xls',
  'AV6202A/PCB/OBSOLETE/AV6202-iss1.net/.bom/.ECO, ISS2/AV6202-iss2.net/.bom/.ECO, WORKING/AV6202-iss3.ECO', 'AV6202-ISS3 - #Gerbers.zip (TOP, TSM, TSS)',
  'AV6202A/Functional/AV6202A BERGS.cdr, AV6202A-card-edge.cdr, AV6202-card-edge.cdr', 'AV6202A/Photos/AV6202 ISS2 Color.jpg',
  '#OPEN GEAR - #Engineering/…/openGear #Manuals #OBSOLETE/AV6202A Manual.pdf, AV6201A Manual.pdf', 'AV6201 - #Master #OPENGEAR/…/AV6201A/Software/atmel/v101 (for the comparison), AV6201-iss3.bom',
  'T6401 - #Master…/T6401iss4.net', '#OPEN GEAR - #Engineering/…/OGP_SDK - #Engineering/ZTC-8399/zeuslib/params/alarmtable.c'];
function viewFindings(m){
  window.__av6202Active = false;
  m.innerHTML = card('What the AV6202A and its firmware are up to', `<ol>${FINDINGS.map(f=>`<li style="margin-bottom:7px">${f}</li>`).join('')}</ol>`)
    + `<div class="grid2">${card('Assumptions in this simulation', `<ul class="small">${ASSUME.map(a=>`<li>${a} <span class="tag-inf">inferred</span></li>`).join('')}</ul>`)}${card('Sources', `<ul class="small mono">${SOURCES.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><p class="small">Paths under <span class="mono">#OPENGEAR #SERIES/AV6202 - #Master #OPENGEAR/AV6202 - #Engineering/</span> unless stated.</p>`)}</div>`;
}

/* ---------------- register ---------------- */
resetAll();
const curStd = () => { const w=worldAt(SIM.t), n=inputNode(w); return STD[n.on? n.std : w.src.std]; };
SIM.register({
  footnotes:[
    {text:"AV6202-card-edge.cdr is misnamed: it holds no card edge but a copy of the AV6201 rear-module sheet (T6201, T6301, T6401), still captioned “AV6201-1 / AV6201-2”.", src:"#OPENGEAR #SERIES/AV6202 - #Master #OPENGEAR/AV6202 - #Engineering/AV6202A/Functional/AV6202-card-edge.cdr"},
    {text:"The real AV6202A card edge (AV6202A-card-edge.cdr) shows Level POT, SYNCH LED and NO SYNCH LED only — no EQ or clamp.", src:"#OPENGEAR #SERIES/AV6202 - #Master #OPENGEAR/AV6202 - #Engineering/AV6202A/Functional/AV6202A-card-edge.cdr"},
    {text:"The 2012 guide numbers T6301A outputs OUT 1–4 down the left and OUT 5–8 down the right, against the P1 pin order (OUT1 at position 3, OUT2 at 4).", src:"#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/AV6202A - rear module options.cdr"},
    {text:"AV6202A BERGS.cdr is the jumper legend set: TERM / HI Z, EXT / REF, REF 1 / 2, BAL.", src:"#OPENGEAR #SERIES/AV6202 - #Master #OPENGEAR/AV6202 - #Engineering/AV6202A/Functional/AV6202A BERGS.cdr"},
    {text:"Backup_of_AV6202A-card-edge.cdr sits beside the card-edge drawing — an autosave copy.", src:"#OPENGEAR #SERIES/AV6202 - #Master #OPENGEAR/AV6202 - #Engineering/AV6202A/Functional/Backup_of_AV6202A-card-edge.cdr"}],
  id:'av6202', product:'AV6202', name:'AV6202 · utility analog video DA with frame-reference input, openGear (2009|42)', year:2009,
  folder:'#OPENGEAR #SERIES/AV6202 - #Master #OPENGEAR', family:'openGear',
  summary:'Composite-video DA (OEM Cobalt 9233): one differential input — or a frame reference for black burst — to eight 75 Ω outputs, with an LMH1981 sync separator and an AT90CAN128 reporting Video Status to DashBoard (SNMP from V200, 2012|45). Simulated from the V101/V200 firmware, the ISS1–ISS3 netlists and ECOs, and the ISS3 gerbers.',
  highlights:['Card drawn from the ISS3 gerbers, with working jumpers and level pot','Main loop blocking once per field to read the LMH1981 line code','One second down to fields, lines and sync edges','The V200 pformat latch and other firmware leftovers','Black-burst distribution from the frame reference','What changed from the AV6201A'],
  depth:'Full model', duration:1,
  stepUnits:[{label:'1 video line', period:()=>curStd().H},{label:'1 field', period:()=>fieldT(curStd())},{label:'1 frame', period:()=>frameT(curStd())},{label:'1 main-loop pass', period:()=>C.PASS},{label:'1 timer1 tick (96 µs)', period:()=>C.T1},{label:'1 µs', period:()=>1e-6},{label:'1 ms', period:()=>1e-3}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.04,'2 fields'],[0.017,'1 field'],[0.0016,'25 lines'],[0.0002,'3 lines'],[0.000065,'1 line'],[0.00001,'10 µs']], defaultZoom:3,
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial', render:viewTutorial},
    {id:'second', label:'One second, field by field', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
