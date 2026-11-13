/* =====================================================================
   D6201 — openGear 75 Ω AES distribution amplifier, engineering parent of the D6201A and D6201B
   (Ward-Beck Systems, ISS2 2006|39 … ISS5 2010|43; firmware V100 2008|41 … V104 2009|42)
   Plugin for the WBS Device Simulator (../siumulation.html) · Full model
   Folder: #OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR
   The A and B are the same ISS5 PCB; the build switch loads either firmware tree onto it.

   Sources used (all in this archive):
   - D6201 - #Engineering/D6201A/Software/atmel/v104/  (D6201A V1.04, ICCAVR 7.15)
       v100w.c       main(): boot waits, ADC slot averaging, init_CS8416, DIP latch, super-loop order
       D6201A.c/.h   PROCESS_MODES (CS8416 reg 0x04 = 0x80 / 0x89), EQ push-button debounce,
                     ALTERA_write (16-bit control word), LED/port macros, AES2_AVAILABLE commented out
       cs84xx.c/.h   init_CS8416 register values, bit-banged SPI on PORTC, CS8416_READ_LOCK_ALL (reg 0x0C)
       altera.c/.h   write_data (8 bits MSB first on PB4/PB5), STROBE_WRITE on PB6, ALTERA_RESET on PC0
       CAN.c/.h      timer0 (1 ms), timer1 (96 µs ticks, 96 ms first load), heartbeat TX_HEARTBEAT 10000,
                     TX_INITIALIZE 1000×slot, dashboard_initializing, CANinit bit timing, can_rx_isr, CANTX
       Dashboard.c   descriptors, PARAMETER_UPDATE, CAN_TX_TIMER, DASHBOARD_RESPONSE_SETUP (SET_PARAM per OID),
                     SAVE/RESTORE_INFORMATION_EEPROM, MESSAGE_CREATOR_PARAMETER_21/22/40, FF.07/FF.08 (DataSafe)
       ADC.c         AD_CONVERTER_SETUP, ADDRESS_TABLE   · common.c wait(), MIRROR(), INVERT_DATA()
       *.lis         instruction counts used for the loop timing (14 cycles per bit-banged bit, 7 per wait loop)
       V100W.mp      code size (text 25 244 bytes)   · common.h brand define (COBALT)
   - D6201 - #Engineering/D6201B/Software/atmel/v102/ and "v103 - not released"/  (D6201B V1.02 / V1.03)
       D6201B.c/.h   modes OUTPUT_1x8 / 2x4 / 1x8_SRC, DIP decode, src_reset / SRC_CONSTANT 3, tones
       Dashboard.c   Mode 3.10, tones 3.5/3.6, AD Result 3.8, src_select 3.4, Menu1/Menu3 OID lists
   - D6201 - #Engineering/D6201B/Software/altera/v101/  D6201A.bdf (block netlist), D6201A.qsf (pins),
       shift_in16_version_out.vhd, switch2x1.vhd, sw2x2x1x24.vhd, i2s_par.vhd, tone_gen1.vhd, i2s8416_aes.vhd
   - D6201 - #Engineering/D6201A/PCB/D6201Aiss5.net (every net and value used in the schematics),
       GERBERS/D6201AISS5.TOP/.TSM/.TSS/.DRL → assets/d6201-card-copper.png, d6201-card-silk.png (120 dpi)
   - D6201B - #Master/D6201BISS5 PNP PCAD.pnp (part positions, origin 3095, 6100 mil), D6201B Photo.jpg (green mask)
   - D6201 - #Engineering/D6201A/Functional/D6201B-FUNCTIONAL.pdf (DIP map, H1–H4), D6201A-T6201/T6301/T6401.pdf
   - T6401 - #Master/…/T6401iss4.net (which card pins reach which BNC), t6201.js / t6301.js data (rear IDs)
   - #OPEN GEAR - #Engineering/…/openGear #Manuals #OBSOLETE/D6201A Manual.pdf, D6201B Manual.doc
   - #OPEN GEAR - #Engineering/…/OpenGear Frame Address ID.xls (slot resistors, via opengear.js)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const ENG = '#OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR/D6201 - #Engineering/';
const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const infT = why => `<span class="tag-inf" title="Not stated in the source; inferred from ${esc(why)}">inferred</span>`;
const inf = infT('related parts of the design');
const hx = (n,w) => (n>>>0).toString(16).toUpperCase().padStart(w||2,'0');
const bin = (n,w) => (n>>>0).toString(2).padStart(w||8,'0');
const card = (title, body, cls) => `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`;
const deep = o => JSON.parse(JSON.stringify(o, (k,v)=> v===Infinity? '__inf' : v), (k,v)=> v==='__inf'? Infinity : v);
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------------- constants from the source (and the few that are inferred) ---------------- */
const C = {
  F_CPU: 8e6,                         // v100w.c "Crystal: 8.0000Mhz" (X1 8M in the netlist)
  BIT_CYC: 14,                        // cs84xx.lis / altera.lis: sbrc, cbi/sbi, lsl, sbi, cbi, inc, cpi, brlo = 14 cycles per bit
  WAIT: 3000*7/8e6,                   // common.lis wait(): wdr, subi, sbci, cpi, cpc, brne = 7 cycles → wait(3000) = 2.625 ms
  ADC_CONV: 104e-6,                   // ADC.c adc_init(): "Conversion time: 104uS" (ADCSRA = 0xC6)
  ADC_N: 100,                         // ADC.h COUNTER_CONSTANT
  T0: 1e-3,                           // CAN.c timer0: clk/64, TCNT0 = 0x83 → 125 × 8 µs = 1 ms
  T1: 96e-6,                          // CAN.c timer1: clk/64, reload 0xFFF4 → 12 × 8 µs = 96 µs
  T1_FIRST: 0.096,                    // timer1_init: TCNT1 = 0xD120 → 12 000 × 8 µs = 96 ms to the first overflow
  HB: 10000,                          // TX_HEARTBEAT (ticks)
  TX_FRAMES: 10,                      // TX_FRAMES
  ONE_SECOND: 1000,                   // timer0 ONE_SECOND
  DINIT: 10, DCOUNT: 3,               // DASHBOARD_INITIALIZATION_CONSTANT, DASHBOARD_COUNT_CONSTANT
  DEBOUNCE: 255,                      // EQ_PUSHBUTTON_DEBOUNCE (passes after release)
  SRC_CONSTANT: 3,                    // D6201B.c
  CAN_BIT: 1e-6,                      // CANBT1 0x00, CANBT2 0x04, CANBT3 0x12 → 8 TQ of 125 ns = 1 Mbit/s
  STUFF: 1.08,                        // average bit stuffing (inferred)
  ISR1_CYC: 70, ISR0_CYC: 40,         // idle cost of timer1 / timer0 ISRs in cycles (inferred from CAN.lis)
  LOCK_T: 3e-3,                       // CS8416 PLL lock time after a valid signal appears (inferred)
  EE_BYTE: 3.3e-3,                    // AT90CAN128 EEPROM byte write (inferred: datasheet, not in archive)
  NO_EQ_REACH: 600,                   // manuals: 600 m (2000 ft) without equalisation
  LOSS_100M: 3.0,                     // coax loss per 100 m at 3.072 MHz, set so 600 m = the 18 dB limit (inferred)
  MFC_GAP: 0.3e-3,                    // frame controller gap between requests (inferred)
  PRESS: 0.12,                        // how long a click holds the EQ switch down (inferred)
};
const W3 = C.WAIT;
const ADC_SAMPLE = 2*C.WAIT + C.ADC_CONV + 12e-6;      // AD_CONVERTER_SETUP: READ → WAIT (2 × wait(3000)) → RESET → READ
/* main-loop step budgets in CPU cycles. The bit-bang loops are counted from the .lis files; the rest is estimated
   from the instruction count of each routine (marked inferred where shown). */
function steps(b, mode){
  const spiByte = 8*C.BIT_CYC + 12;                    // one byte incl. call/return
  const rd = 4*spiByte + 40, wr = 3*spiByte + 30;      // CS8416_read1 = 4 bytes, CS8416_write1 = 3 bytes
  if (b==='A') return [
    ['CS8416_READ_LOCK_ALL','read reg 0x0C of U5 (4 SPI bytes)', rd],
    ['INVERT_DATA','Astatus = ~Astatus', 16],
    ['PROCESS_EQ_PUSHBUTTONS','READ_SWITCHES · TRANSLATE · DEBOUNCE', 70],
    ['PROCESS_MODES','CS8416_write1(0x04, 0x80|0x89)', wr],
    ['READ_DIP_SWITCHES','MIRROR(PINA)', 55],
    ['REFRESH_LEDS','PORTE lock / no-lock / EQ', 40],
    ['ALTERA_write','16 bits → shift_in, strobe PB6', 2*spiByte+40],
    ['CAN_FUNCTIONS','PARAMETER_UPDATE · bus check', 60]];
  const two = (mode===1 || mode===2);
  return [
    ['CS8416_READ_LOCK_ALL','reg 0x0C of U5 and U6 (8 SPI bytes)', 2*rd],
    ['INVERT_DATA','Astatus = ~Astatus', 16],
    ['PROCESS_EQ_PUSHBUTTONS','READ_SWITCHES · TRANSLATE · DEBOUNCE', 80],
    ['PROCESS_MODES', two? 'write reg 0x04 of U5 and U6' : 'write reg 0x04 of U5', two? 2*wr : wr],
    ['READ_DIP_SWITCHES','MIRROR(PINA)', 55],
    ['REFRESH_LEDS','PORTE, both channels', 70],
    ['ALTERA_write','mode / tone / SRC bits → 16-bit word', 2*spiByte+90],
    ['CAN_FUNCTIONS','PARAMETER_UPDATE · bus check', 70]];
}
const ISR_LOAD = (C.ISR1_CYC/(C.T1*C.F_CPU)) + (C.ISR0_CYC/(C.T0*C.F_CPU));
function passTime(b, mode){ return steps(b,mode).reduce((a,s)=>a+s[2],0)/C.F_CPU/(1-ISR_LOAD); }

/* ---------------- builds, brands, firmware versions ---------------- */
const BUILDS = {
  A:{ id:'A', label:'D6201A', what:'1×8 75 Ω AES DA (one input)', define:'//#define AES2_AVAILABLE', oem:'Ross ADA-8401-A · Cobalt 9251',
      fws:{ v104:{ ver:'1.04', tree:'D6201A/Software/atmel/v104', note:'DataSafe (V104, 2009|42 Oct)', brand:'COBALT', restartOnce:true, dataSafe:true, size:25244 } }, fw:'v104' },
  B:{ id:'B', label:'D6201B', what:'dual-input 75 Ω AES DA, 1×8 / 2×4 / 1×8 with SRC', define:'#define AES2_AVAILABLE', oem:'Cobalt 9253 · Ross DDA-8416 (in the code)',
      fws:{ v102:{ ver:'1.02', tree:'D6201B/Software/atmel/v102', note:'bootloader (V102, 2009|42 Aug, released)', brand:'WARD_BECK', restartOnce:false, dataSafe:false, cobaltLen:4 },
            v103:{ ver:'1.03', tree:'D6201B/Software/atmel/v103 - not released', note:'DataSafe (V103, 2010|43 May, “not released”)', brand:'WARD_BECK', restartOnce:true, dataSafe:true, cobaltLen:5 } }, fw:'v102' },
};
const BRANDS = {
  WARD_BECK:{ A:'D6201A', B:'D6201B', sup:'Ward-Beck Systems', web:true },
  ROSS_VIDEO:{ A:'ADA-8401-A', B:'DDA-8416', sup:'Ross Video Ltd', web:false },
  COBALT:{ A:'9251', B:'9253', sup:'Cobalt Digital', web:false },
};
const CARD_NAME = { A:'Unbalanced AES Audio Distribution Amplifier', B:'Dual Unbalanced AES Audio Distribution Amplifier' };
const MODES = ['1x8','2x4','1x8 w/ SRC'];

/* ---------------- frame, slot ID, rear modules ---------------- */
const SLOT_R = [100000,30900,15000,9760,6980,5360,4320,3570,3010,2550,2210,1910,1650,1470,1270,1130,1000,887,787,681]; // Frame Address ID.xls
const ADDR_LO = [1011,980,948,915,883,851,820,788,755,725,692,658,629,593,563,532,502,471,435,406];               // ADC.c ADDRESS_TABLE
function slotAdc(slot){ const R=SLOT_R[slot-1]; return Math.min(1023, Math.round(1024*R/(R+1000))); }   // R55 1K pull-up, AREF = 3 V (inferred)
function ADDRESS_TABLE(v){ for (let i=0;i<20;i++) if (v>ADDR_LO[i] && v<=(i? ADDR_LO[i-1] : 1023)) return i+1; return 21; }
const idV = R => R>=1e9? 3.0 : 3.0*R/(R+1000);
const idAdc = R => Math.min(1023, Math.round(1024*(R>=1e9?1:R/(R+1000))));
/* Card-side nets of the 10 BNC positions (D6201Aiss5.net) */
const BNC = {
  1:{net:'BNC1_SIG', pin:97, role:'in1', via:'C1 → T1 PE-65612 → H1 → U1'},
  2:{net:'BNC2_SIG', pin:92, role:'in2', via:'C11 → T2 → H2 / H3 → U3'},
  3:{net:'BNC3_SIG', pin:75, role:'out', drv:'U2A', fpga:'OUT1', grp:1, r:'R14'},
  4:{net:'BNC4_SIG', pin:80, role:'out', drv:'U4A', fpga:'OUT3', grp:2, r:'R28'},
  5:{net:'BNC5_SIG', pin:37, role:'out', drv:'U2A', fpga:'OUT1', grp:1, r:'R15'},
  6:{net:'BNC6_SIG', pin:34, role:'out', drv:'U4A', fpga:'OUT3', grp:2, r:'R33'},
  7:{net:'BNC7_SIG', pin:17, role:'out', drv:'U2B', fpga:'OUT2', grp:1, r:'R19'},
  8:{net:'BNC8_SIG', pin:22, role:'out', drv:'U4B', fpga:'OUT4', grp:2, r:'R39'},
  9:{net:'BNC9_SIG', pin:5,  role:'out', drv:'U2B', fpga:'OUT2', grp:1, r:'R21'},
  10:{net:'BNC10_SIG',pin:12, role:'out', drv:'U4B', fpga:'OUT4', grp:2, r:'R40'},
};
/* Rear modules. Positions 1–10 in a 2 × 5 grid (1 top left). Labels from the manuals / functional drawings. */
const REARS = {
  T6301:{ name:'T6301A', sub:'single-card rear, 2 slots (DFR-8320)', slots:2, id:[3570,5360], src:'t6301.js data (T6301-iss4.net)',
          map:{1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10} },
  T6401:{ name:'T6401A', sub:'dual-card rear, 2 slots, 5 BNC per card', slots:2, id:[3570,1130], src:'T6401iss4.net', dual:true,
          mapP101:{1:1,3:3,5:5,7:7,9:9}, mapP102:{1:2,3:4,5:6,7:8,9:10} },
  T6201:{ name:'T6201A', sub:'single-slot 10-BNC rear (DFR-8310 only)', slots:1, id:[3570,30900], src:'t6201.js data (T6201.net)',
          map:{1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10} },
};
function posLabel(b, rear, pos){
  if (rear==='T6401'){ const c = pos%2? 'CARD 2 (P101)' : 'CARD 1 (P102)'; const k=Math.ceil(pos/2); const lab = k===1? 'IN' : 'OUT'+(k-1); return lab+' · '+c; }
  if (b==='A'){ return ({1:'IN',2:'NC',3:'OUT 1',5:'OUT 2',7:'OUT 3',9:'OUT 4',4:'OUT 5',6:'OUT 6',8:'OUT 7',10:'OUT 8'})[pos]; }
  return ({1:'IN 1',2:'IN 2',3:'OUT1-1',5:'OUT1-2',7:'OUT1-3',9:'OUT1-4',4:'OUT2-1',6:'OUT2-2',8:'OUT2-3',10:'OUT2-4'})[pos];
}
/* which card BNC net reaches rear position pos (or null) */
function cardBncAt(w, pos){
  const R=REARS[w.rear];
  if (R.dual){ const m = w.slot%2===0? R.mapP101 : R.mapP102; for (const k in m) if (m[k]===pos) return +k; return null; }
  return R.map[pos]? pos : null;
}
function rearPosOfBnc(w, n){ const R=REARS[w.rear]; if (R.dual){ const m = w.slot%2===0? R.mapP101 : R.mapP102; return m[n]||null; } return R.map[n]||null; }

/* ---------------- analog front end, from D6201Aiss5.net values ---------------- */
// U1B / U3B inverting EQ: R2 750 feedback; input R4 750 ∥ (R6 365 + C4 1 nF) ∥ (R12 110 + C7 220 pF)
function eqGain(f){
  const w=2*Math.PI*f;
  const z = (r,c)=> c? {re:r, im:-1/(w*c)} : {re:r, im:0};
  const inv = z=>{ const d=z.re*z.re+z.im*z.im; return {re:z.re/d, im:-z.im/d}; };
  const y1=inv(z(750)), y2=inv(z(365,1e-9)), y3=inv(z(110,220e-12));
  const Y={re:y1.re+y2.re+y3.re, im:y1.im+y2.im+y3.im};
  return 750*Math.hypot(Y.re,Y.im);                 // |R2 · Y_in|
}
const eqBoostDb = f => 20*Math.log10(eqGain(f));
const cableLossDb = (len, fs) => C.LOSS_100M*len/100*Math.sqrt(64*fs/3.072e6);
function rxSignal(w, k, sel){                        // what CS8416 #k sees on the selected input (sel 0 = flat RXP0, 1 = EQ RXP1)
  let present=false, len=0, fs=48000, term=75, what='nothing';
  if (k===0){ const p=rearPosOfBnc(w,1); if (p && w.in1.conn){ present=true; len=w.in1.len; fs=w.in1.fs; what='IN1 cable'; } term = w.H1; }
  else {
    if (w.H3==='rear'){ const p=rearPosOfBnc(w,2); if (p && w.in2.conn){ present=true; len=w.in2.len; fs=w.in2.fs; what='IN2 cable'; } term=w.H2; }
    else { const r = w.H4==='ref1'? w.ref1 : w.ref2; if (r.on){ present=true; len=2; fs=r.fs; what=(w.H4==='ref1'?'frame REF1':'frame REF2')+' via H4 → Q2 → H3'; } term=75; }
  }
  const loss = cableLossDb(len, fs) + (term!==75? 3 : 0);
  const boost = sel? eqBoostDb(64*fs) : 0;
  const resid = loss - boost;
  const ok = present && fs>=30000 && fs<=192000 && resid <= 18;
  return {present, ok, len, fs, loss, boost, resid, what, term};
}

/* =====================================================================
   DashBoard parameters (Dashboard.c descriptors, per build)
   ===================================================================== */
const MSG = {0x10:'REPORT_PARAM',0x11:'TRAP',0x45:'GET_NUMPARAMS',0x46:'GET_PARAM_OIDS',0x47:'GET_DESCRIPTOR',0x49:'GET_PARAM',0x4A:'SET_PARAM',0x50:'GET_MENUSET_NAME',0x51:'GET_MENU_COUNT',0x52:'GET_MENU_NAME',0x53:'GET_MENU_OIDS',0x43:'REBOOT'};
const oidTxt = o => ((o>>8)&0xFF).toString(16).toUpperCase().replace(/^([0-9])$/,'$1')+'.'+(o&0xFF);
const oidS = o => (o>>8)+'.'+(o&0xFF);
function OIDS(b){
  const info = [[0x0105,'Product'],[0x0107,'Name'],[0x0102, b==='A'?'Supplier':'Manufacturer'],[0x010B,'Software Rev'],[0x0104,'Website']];
  if (b==='A') return {
    info, status:[[0x0201,'Card Status'],[0x0202,'AES Input']],
    menu1:[0x0400,0x0302,0x0305], menu1All:[0x0400,0x0302,0x0305,0x0306], hidden:[0x0301,0x0306],
    params:[0x0201,0x0202,0x0302,0x0105,0x0102,0x010B,0x0107,0x0301,0x0400,0x0104,0x0306],
    pmax:2, refresh:['AES1_LOCK','EQ1_ENABLE','SIGNAL_STATUS'], refreshOid:[0x0202,0x0302,0x0201] };
  return {
    info, status:[[0x0201,'Card Status'],[0x0202,'AES Input #1'],[0x0203,'AES Input #2']],
    menu1:[0x0400,0x030A,0x070B,0x0302,0x0305,0x070C,0x0303,0x0306,0x0301,0x0308], menu3:[0x0400,0x030A,0x070B,0x0302,0x0305,0x070C,0x0303,0x0306,0x0308],
    params:[0x0400,0x0105,0x0102,0x010B,0x0104,0x0201,0x0202,0x0302,0x0303,0x0203,0x0301,0x0107,0x030A,0x0305,0x0306,0x070B,0x070C,0x070D],
    pmax:7, refresh:['AES1_LOCK','AES2_LOCK','EQ1_ENABLE','EQ2_ENABLE','MODE','TONE_GENERATION1','TONE_GENERATION2','SIGNAL_STATUS'],
    refreshOid:[0x0202,0x0203,0x0302,0x0303,0x030A,0x0305,0x0306,0x0201] };
}
const ONOFF = [[1,'Enabled'],[0,'Disabled']];
function oidDef(b, o){
  const d = {
    0x0400:{name:'Notify on Card Fault', w:'radio', ch:ONOFF},
    0x0302:{name: b==='A'?'Equalizer':'Equalizer', w:'radio', ch:ONOFF, sec: b==='B'?'AES Input 1':null},
    0x0303:{name:'Equalizer', w:'radio', ch:ONOFF, sec:'AES Input 2'},
    0x0305:{name:'Tone Generator', w: b==='A'?'combo':'radio', ch: b==='A'?[[0,'Disabled'],[1,'Enabled']]:ONOFF},
    0x0306:{name: b==='A'?'AD Result':'Tone Generator', w: b==='A'?'num':'radio', ch: b==='A'?null:ONOFF},
    0x030A:{name:'Mode', w:'radio', ch:[[0,'1x8'],[1,'2x4'],[2,'1x8 w/ SRC']]},
    0x0301:{name:'Settings', w:'button', ch:[[0,'Save']]},
    0x0308:{name:'AD Result', w:'num'},
    0x070B:{name:'AES Input 1', w:'header', descName:'Metadata'},
    0x070C:{name:'AES Input 2', w:'header', descName:'Metadata'},
    0x070D:{name:'Outputs', w:'header', descName:'Metadata'},
  }[o];
  return d || {name:oidS(o), w:'text'};
}
function valText(b, o, v){
  if (v==null) return '—';
  if (o===0x0201){ if (b==='A') return v===2? 'No AES Audio Lock' : v===0? 'OK' : '0x'+hx(v,4);
                   return ({0:'OK',2:'No AES Audio Lock',4:'AES Input #1 Unlocked',8:'AES Input #2 Unlocked'})[v] || '0x'+hx(v,4); }
  if (o===0x0202 || o===0x0203){ if (b==='A') return v===1?'Locked':(v===2||v===4)?'Unlocked':'0x'+hx(v,4); return ({1:'Locked',2:'Not Used',4:'Unlocked'})[v] || '0x'+hx(v,4); }
  const d=oidDef(b,o); if (d.ch){ const c=d.ch.find(x=>x[0]===v); return c? c[1] : String(v); }
  return String(v);
}
function valLevel(b,o,v){
  if (o===0x0201) return v? 'err':'ok';
  if (o===0x0202 || o===0x0203){ if (v===1) return 'ok'; if (b==='B' && v===2) return 'info'; return 'err'; }
  return 'info';
}
function stringOid(w, o){
  const b=w.build, fw=BUILDS[b].fws[w.fw], br=BRANDS[w.brand];
  if (o===0x0105) return br[b];
  if (o===0x0107) return CARD_NAME[b];
  if (o===0x0102) return br.sup;
  if (o===0x010B) return fw.ver;
  if (o===0x0104) return 'www.ward-beck.com';
  return null;
}
/* value of an INT16 OID as the firmware would report it (CAN_TX_TIMER / GET_PARAM) */
function oidValue(f, w, o){
  const b=w.build;
  switch(o){
    case 0x0201:
      if (b==='A') return (!f.aes1 && f.alarm)? 2 : 0;
      if (!f.aes1 && !f.aes2 && f.alarm) return 2;
      if (!f.aes1 && f.input1 && f.alarm) return 4;
      if (!f.aes2 && f.input2 && f.alarm) return 8;
      return 0;
    case 0x0202: if (b==='A') return (!f.aes1 && f.alarm)? 4 : !f.aes1? 2 : 1;
                 return (!f.aes1 && f.input1)? 4 : !f.input1? 2 : 1;
    case 0x0203: return (!f.aes2 && f.input2)? 4 : !f.input2? 2 : 1;
    case 0x0302: return f.eq1; case 0x0303: return f.eq2;
    case 0x0305: return b==='A'? f.tone : f.tone1;
    case 0x0306: return b==='A'? f.ad : f.tone2;
    case 0x030A: return f.opmode; case 0x0400: return f.alarm; case 0x0308: return f.ad; case 0x0301: return 0;
  }
  return null;
}
function snapshotCache(f, w){ const c={}; const O=OIDS(w.build); [...O.info.map(x=>x[0]), ...O.status.map(x=>x[0]), ...(O.menu1All||O.menu1)].forEach(o=>{ const s=stringOid(w,o); c[o]= s!=null? s : oidValue(f,w,o); }); return c; }

/* =====================================================================
   WORLD + FIRMWARE STATE
   ===================================================================== */
function mkWorld(b){
  return { build:b, fw:BUILDS[b].fw, brand:BUILDS[b].fws[BUILDS[b].fw].brand, slot:4, rear:'T6301',
    in1:{conn:true, fs:48000, len:150}, in2:{conn:b==='B', fs:44100, len:60},
    ref1:{on:true, fs:48000}, ref2:{on:false, fs:48000},
    H1:75, H2:75, H3:'rear', H4:'ref1',
    dip:[false,false,false,false,false,false,false,false],   // true = ON (switch closed to GNDD)
    sw:[false,false], power:true, mfc:true, dataSafe:false };
}
const dipByte = w => w.dip.reduce((a,on,i)=> a | (on? 0 : (1<<i)), 0);   // dip_switches = MIRROR(PINA): bit i = SW(i+1), ON reads 0
function mkFw(w, steady){
  const b=w.build;
  const f = { mode: steady? 'app':'off', bootIx:0, bootEnd:Infinity, bootLabel:'',
    eq1:0, eq2:0, tone:0, tone1:0, tone2:0, opmode:0, alarm:0, save:0, restore:0, restart_sent:0,
    aes1:0, aes2:0, input1:1, input2: b==='B'?1:0, pb:0, pbRel:0, pbCnt:0, eqRefresh:0,
    pRef:0, pChg:0, pTxDone:0, prev:{aes1:0,aes2:0,eq1:0,eq2:0,mode:0,tone:0,tone1:0,tone2:0}, sigChg:1,
    src_reset:1, src_cnt:0, dipSw:0xFF, dipEn:0, dashEn:1, slot:w.slot, ad:slotAdc(w.slot), word:0, leds:0, com:0,
    rx:[{sel:0, lockAt:Infinity},{sel:0, lockAt:Infinity}], rxOn:false,
    dinit:1, dcount:0, canRx:0, t0Next:Infinity, t1Next:Infinity, nextPass:Infinity, frameJob:null, mfcQ:[], mfcNext:0, mfcWait:false,
    ee:{10:0xFF,11:0xFF,13:0xFF,14:0xFF}, passIx:0 };
  if (steady){
    f.rxOn=true; f.dipSw=dipByte(w); f.dipEn = b==='B'? ((f.dipSw&0x40)?1:0) : 0; f.dashEn = b==='B'? ((f.dipSw&0x80)?1:0) : 1;
    f.input2 = b==='B' && f.opmode>0 ? 1 : 0;
    [0,1].forEach(k=>{ if (k===1 && b!=='B') return; const s=rxSignal(w,k,0); f.rx[k].lockAt = s.ok? -1 : Infinity; });
    f.aes1 = f.rx[0].lockAt<0? 1:0; f.aes2 = (b==='B' && f.input2 && f.rx[1].lockAt<0)? 1:0;
    f.prev={aes1:f.aes1,aes2:f.aes2,eq1:0,eq2:0,mode:0,tone:0,tone1:0,tone2:0}; f.sigChg=0; f.pTxDone=1;
    f.restart_sent=1; f.dinit=0; f.dcount=3; f.src_reset=0; f.com=1; f.leds=0x40;
    f.t1Next=0.371; f.t0Next=0.62; f.nextPass=0;
  }
  return f;
}
function mkS0(b){ const w=mkWorld(b), f=mkFw(w,true); return {w, f, cache:snapshotCache(f,w), cacheT0:-1}; }

const D = { s0:mkS0('A'), acts:[], ver:0, dsStore:{}, second:1, R:null, Rver:-1, log:[],
  ui:{ dashTab:1, dashOpen:true, scopeOut:3, view:'card', autoFollow:true, lastAct:null, softTab:'loop', schem:0, block:'fpga' } };

/* boot sequence (v100w.c main + init_CS8416), durations from the wait() loop count */
function bootPhases(b){
  const cs = [5*W3 + 7*3*(8*C.BIT_CYC+12)/C.F_CPU, 'init_CS8416(): RST low, wait ×5, 7 register writes (0x00…0x06)', 'cs'];
  if (b==='A') return [
    [15*W3, 'main(): initialization, CAN_RX (LBK high), wait(3000) ×15'],
    [C.ADC_N*ADC_SAMPLE, 'ADC: 100 × AD_CONVERTER_SETUP → average → ADDRESS_TABLE (slot ID)', 'adc'],
    [5*W3, 'wait ×5'], [1000*5/C.F_CPU, 'ALTERA_RESET(1000): PC0 high, release'], [5*W3, 'wait ×5'], cs,
    [25*W3, 'READ_DIP_SWITCHES (ignored), dip_switch_enabled = NO, dashboard_enabled = YES, wait ×25'],
    [1.5e-3, 'DATA_SETUP (descriptor CRCs), CANinit (timers on), CAN_TX, ALTERA_write, setBaseProductInfo'] ];
  return [
    [5*W3, 'main(): initialization, CAN_RX (LBK high), wait(3000) ×5'],
    [C.ADC_N*ADC_SAMPLE, 'ADC pass 1: 100 samples (slot ID)', 'adc'],
    [C.ADC_N*ADC_SAMPLE, 'ADC pass 2: the same 100-sample block again (copy in v100w.c)', 'adc'],
    [1000*5/C.F_CPU, 'ALTERA_RESET(1000)'], [5*W3, 'wait ×5'], cs,
    [1.5e-3, 'READ_DIP_SWITCHES, latch SW7/SW8, DATA_SETUP, CANinit, RESTORE_INFORMATION_EEPROM or DIP, ALTERA_write'] ];
}
const bootLen = b => bootPhases(b).reduce((a,p)=>a+p[0],0);

/* FPGA control word → what the D6201A.bdf does with it */
function fpgaDecode(word){
  const q = i => (word>>i)&1;
  return { q, g1: q(0), g2: q(1), ext1: !q(2), ext2: !q(3), srcSel: q(4), srcRun: q(5), off1: q(15), off2: q(14) };
}
function encoders(f, w, word, t){
  const d=fpgaDecode(word);
  const L0 = f.rxOn && t>=f.rx[0].lockAt, L1 = f.rxOn && w.build==='B' && t>=f.rx[1].lockAt;
  const s0=rxSignal(w,0,f.rx[0].sel), s1=rxSignal(w,1,f.rx[1].sel);
  const e1 = (f.mode!=='app')? {k:'mute', why:'card not running'} : (!L0 ? {k:'mute', why:'no CS8416 #1 clocks'} : d.off1? {k:'mute', why:'off = q15 (NOT aes1_lock)'} :
             d.ext1? {k:'tone1', fs:s0.fs} : {k:'AES1', fs:s0.fs});
  let e2;
  if (f.mode!=='app') e2={k:'mute', why:'card not running'};
  else if (!L1) e2={k:'mute', why:'no CS8416 #2 clocks'};
  else if (d.off2) e2={k:'mute', why:'off = q14 (NOT aes2_lock)'};
  else if (d.ext2){ if (d.srcSel){ e2 = (d.srcRun && L0)? {k:'SRC', fs:s1.fs, from:s0.fs} : {k:'mute', why: d.srcRun? 'SRC has no input (AES1 unlocked)' : 'AD1895 held in reset (q5 low)'}; } else e2={k:'tone2', fs:s1.fs}; }
  else e2={k:'AES2', fs:s1.fs};
  return {d, e1, e2};
}
function bncOut(f, w, word, t, n){
  const {d,e1,e2}=encoders(f,w,word,t); const B=BNC[n]; if (!B || B.role!=='out') return null;
  const sel = B.grp===1? d.g1 : d.g2; return Object.assign({enc: sel? 2:1}, sel? e2 : e1);
}
const encTxt = e => !e? '—' : e.k==='mute'? 'muted' : e.k==='tone1'||e.k==='tone2'? `tone ${(e.fs/48/1000).toFixed(e.fs%48000?3:0)} kHz −20 dBFS @ ${e.fs/1000} k` : e.k==='SRC'? `AES1 audio resampled ${e.from/1000}k → ${e.fs/1000}k` : `${e.k} reclocked @ ${e.fs/1000} k`;

/* =====================================================================
   SIMULATION OF ONE SECOND
   ===================================================================== */
function frameDur(len){ return (67 + 8*len)*C.CAN_BIT*C.STUFF; }
function multiFrames(len){ const n=Math.floor((len+4)/8); return n+1; }
function descLen(b,o){ const d=oidDef(b,o); const nm=(d.descName||d.name).length+1; const ch=(d.ch||[]).reduce((a,c)=>a+c[1].length+4,0); return 4+7+nm+3+ch+(d.w==='header'?0:2); }

function simulate(){
  const s0=D.s0; const w=deep(s0.w), f=deep(s0.f); const b=w.build; const fwi=BUILDS[b].fws[w.fw]; const O=OIDS(b);
  const acts=D.acts.slice().sort((a,c)=>a.t-c.t);
  const R={ snaps:[], passT:[], passD:[], passM:[], can:[], segs:[], worlds:[{t:0,w:deep(w)}], tr:{}, cache0:deep(s0.cache), cacheEv:[], rxEv:[[],[]], eeEv:[], spi:[], word0:f.word, pressT:[] };
  let t=0, busFree=0, curTr=null;
  const log = s => { if (curTr) curTr.push(s); };
  const recRx = (k, tt, v) => { const L=R.rxEv[k]; while (L.length && L[L.length-1].t > tt) L.pop(); L.push({t:tt, v}); };
  function rxUpdate(k, force){
    if (k===1 && b!=='B') return;
    const r=f.rx[k], s=rxSignal(w,k,r.sel);
    if (!f.rxOn || !s.ok){ if (r.lockAt!==Infinity){ if (r.lockAt<=t) recRx(k,t,0); else recRx(k,t,0); } r.lockAt=Infinity; return; }
    if (r.lockAt===Infinity || force){ if (force && r.lockAt<=t) recRx(k,t,0); r.lockAt=t+C.LOCK_T; recRx(k,r.lockAt,1); }
  }
  const locked = (k,tt) => f.rxOn && tt>=f.rx[k].lockAt;
  function frame(dir, type, len, flags, label, extra){
    const st=Math.max(t, busFree); const du=frameDur(len); busFree=st+du;
    const fr=Object.assign({t:st, dur:du, dir, type, len, flags, label}, extra||{}); R.can.push(fr); return fr;
  }
  function cacheSet(tt, o, v){ R.cacheEv.push({t:tt, o, v}); }
  function snap(){
    const s={t, mode:f.mode, boot:f.bootLabel, leds:f.leds, word:f.word, eq1:f.eq1, eq2:f.eq2, tone:f.tone, tone1:f.tone1, tone2:f.tone2, opmode:f.opmode,
      alarm:f.alarm, aes1:f.aes1, aes2:f.aes2, sel0:f.rx[0].sel, sel1:f.rx[1].sel, pb:f.pb, pbRel:f.pbRel, pbCnt:f.pbCnt, pRef:f.pRef, pChg:f.pChg,
      src_reset:f.src_reset, dipEn:f.dipEn, dashEn:f.dashEn, slot:f.slot, ad:f.ad, dinit:f.dinit, restart:f.restart_sent, restore:f.restore,
      ee:Object.assign({},f.ee), input1:f.input1, input2:f.input2, com:f.com, dipSw:f.dipSw, rxOn:f.rxOn, lock0:f.rx[0].lockAt, lock1:f.rx[1].lockAt, pass:f.passIx };
    const L=R.snaps[R.snaps.length-1];
    if (L){ let same=true; for (const k in s){ if (k==='t'||k==='ee') continue; if (s[k]!==L[k]){ same=false; break; } } if (same && JSON.stringify(s.ee)===JSON.stringify(L.ee)) return; if (L.t===t){ R.snaps[R.snaps.length-1]=s; return; } }
    R.snaps.push(s);
  }
  function seg(kind, t0, t1, label){ R.segs.push({kind, t0, t1, label}); }
  function startBoot(tt){
    f.mode='boot'; f.bootIx=0; f.rxOn=false; f.leds=0; f.com=0; f.frameJob=null; f.mfcQ=[]; f.mfcWait=false; f.t1Next=Infinity; f.t0Next=Infinity; f.nextPass=Infinity;
    [0,1].forEach(k=>{ if (f.rx[k].lockAt!==Infinity) recRx(k,tt,0); f.rx[k].lockAt=Infinity; f.rx[k].sel=0; });
    const ph=bootPhases(b); f.bootEnd=tt+ph[0][0]; f.bootLabel=ph[0][1]; seg('boot', tt, f.bootEnd, ph[0][1]);
  }
  function appInit(tt){
    const ee=f.ee;
    Object.assign(f, { mode:'app', eq1:0, eq2:0, tone:0, tone1:0, tone2:0, alarm:0, save:0, restore:0, restart_sent:0, aes1:0, aes2:0,
      pb:0, pbRel:0, pbCnt:0, eqRefresh:0, pRef:0, pChg:0, pTxDone:0, sigChg:1, src_reset:1, src_cnt:0, dinit:1, dcount:0, canRx:0, frameJob:null, com:0 });
    f.prev={aes1:0,aes2:0,eq1:0,eq2:0,mode:0,tone:0,tone1:0,tone2:0};
    f.slot = ADDRESS_TABLE(slotAdc(w.slot)); f.ad=slotAdc(w.slot);
    f.dipSw = dipByte(w);
    if (b==='A'){ f.dipEn=0; f.dashEn=1; f.opmode=0; log('v100w.c: dip_switch_enabled = NO; dashboard_enabled = YES (the DIP read is commented out)'); log('RESTORE_INFORMATION_EEPROM() is inside a /* */ block: nothing is restored'); }
    else {
      f.dipEn = (f.dipSw&0x40)?1:0; f.dashEn=(f.dipSw&0x80)?1:0;
      if (!f.dipEn){ if (ee[10]===0xAA){ f.opmode=ee[11]; f.tone1=ee[13]?1:0; f.tone2=ee[14]?1:0; log(`SW7 ON → RESTORE_INFORMATION_EEPROM: 0xAA marker found → mode ${ee[11]}, tone1 ${ee[13]}, tone2 ${ee[14]}`); }
                     else { f.opmode=0; log('SW7 ON → RESTORE_INFORMATION_EEPROM: no 0xAA marker → defaults (1x8, tones off)'); } }
      else { let m=0; if (!(f.dipSw&1)) m+=2; if (!(f.dipSw&2)) m+=1; f.opmode=Math.min(m,2); f.tone1 = (f.dipSw&4)?0:1; f.tone2=(f.dipSw&8)?0:1; log(`SW7 OFF → parameters from the DIP: mode ${MODES[f.opmode]}, tone1 ${f.tone1}, tone2 ${f.tone2}`); }
      if (f.opmode>2) f.opmode=2;
      log(`SW8 ${f.dashEn?'OFF → dashboard_enabled = YES':'ON → dashboard_enabled = NO (Menu3OID, SET_PARAM ignored)'}`);
    }
    f.input1=1; f.input2 = b==='B' && f.opmode>0 ? 1:0;
    f.t1Next = tt + C.T1_FIRST + (1000*f.slot+1)*C.T1;
    f.t0Next = tt + (C.ONE_SECOND+1)*C.T0; f.nextPass=tt;
    log(`slot_address = ADDRESS_TABLE(${f.ad}) = ${f.slot}; mod_address = ${f.slot}+0x10 = 0x${hx(f.slot+0x10)}`);
    log(`timer1 first overflow in 96 ms, then TX_INITIALIZE = 1000 × ${f.slot} ticks → first CAN frame ≈ ${(C.T1_FIRST+(1000*f.slot+1)*C.T1).toFixed(3)} s after CANinit`);
  }
  /* ---------- main-loop pass (v100w.c while(1)) ---------- */
  function runPass(tp){
    f.passIx++;
    const st=steps(b, f.opmode); let off=0; const at=i=>{ let o=0; for (let j=0;j<i;j++) o+=st[j][2]; return tp + o/C.F_CPU/(1-ISR_LOAD); };
    // 1 CS8416_READ_LOCK_ALL
    const L0=locked(0, at(0)), L1 = b==='B' && locked(1, at(0));
    // 2 PROCESS_EQ_PUSHBUTTONS
    const pressed = (w.sw[0]?1:0) | (b==='B' && w.sw[1]? 2:0);
    if (pressed&3){ if (!f.pbRel && !f.pb){ f.pb=1; f.eqRefresh=1; } }
    else if (f.pb) f.pbRel=1;
    if (f.pbRel){ if (f.pbCnt<C.DEBOUNCE) f.pbCnt++; else { f.pbCnt=0; f.pbRel=0; f.pb=0; } }
    let eqTog=false;
    if (f.eqRefresh){ f.eqRefresh=0; if (pressed&1){ f.eq1^=1; eqTog=true; } if (b==='B' && (pressed&2)){ f.eq2^=1; eqTog=true; } }
    // 3 PROCESS_MODES
    if (b==='B'){ f.input1=1; f.input2 = (f.opmode===1||f.opmode===2)?1:0; }
    const s0 = f.eq1?1:0; if (f.rx[0].sel!==s0){ f.rx[0].sel=s0; t=at(3); rxUpdate(0,true); }
    if (b==='B' && f.input2){ const s1=f.eq2?1:0; if (f.rx[1].sel!==s1){ f.rx[1].sel=s1; t=at(3); rxUpdate(1,true); } }
    t=tp;
    // 4 READ_DIP_SWITCHES
    f.dipSw = dipByte(w);
    // 5 REFRESH_LEDS
    let leds=f.leds & 0xC0;
    if (f.input1){ f.aes1 = L0?1:0; leds |= L0? 1 : 2; if (f.eq1) leds|=4; }
    if (b==='B'){ if (f.input2){ f.aes2 = L1?1:0; leds |= L1? 8 : 16; if (f.eq2) leds|=32; } }
    f.leds=leds;
    // 6 ALTERA_write
    let up, lo;
    if (b==='A'){ lo = 0xFF & ~(0x10|0x02|0x01|0x20); up = ((~f.aes1)&0xFF)<<7 & 0xFF; }
    else {
      lo=0;
      if (f.dipEn && !f.dashEn){ let m=0; if (!(f.dipSw&1)) m+=2; if (!(f.dipSw&2)) m+=1; if (m>=2) m=2; f.opmode=m; f.tone1=(f.dipSw&4)?0:1; f.tone2=(f.dipSw&8)?0:1; }
      lo = f.tone1? lo&~4 : lo|4; lo = f.tone2? lo&~8 : lo|8;
      lo = f.src_reset? lo&~0x20 : lo|0x20;
      if (f.src_cnt===C.SRC_CONSTANT){ f.src_reset=0; f.src_cnt=0; } else f.src_cnt++;
      if (f.opmode===0){ lo &= ~0x13; f.tone2=0; f.eq2=0; }
      else if (f.opmode===1){ lo |= 2; lo &= ~0x11; }
      else { f.opmode=2; f.tone1=0; f.tone2=0; if (f.aes2){ lo |= 0x17; lo &= ~8; } else { lo &= ~0x13; lo |= 0x0C; } }
      up = (((~f.aes1)&1)<<7) | (((~f.aes2)&1)<<6);
    }
    const word = ((up&0xFF)<<8) | (lo&0xFF);
    if (word!==f.word){ R.spi.push({t:at(6), word, prev:f.word}); f.word=word; }
    // 7 CAN_FUNCTIONS → PARAMETER_UPDATE
    if (!f.pChg){
      const P=f.prev;
      if (f.aes1!==P.aes1){ f.pRef=0; f.pChg=1; P.aes1=f.aes1; f.sigChg=1; }
      else if (b==='B' && f.aes2!==P.aes2){ f.pRef=1; f.pChg=1; P.aes2=f.aes2; f.sigChg=1; if (f.aes2) f.src_reset=1; }
      else if (b==='A' && f.eq1!==P.eq1){ f.pRef=1; f.pChg=1; P.eq1=f.eq1; }
      else if (b==='B' && f.eq1!==P.eq1){ f.pRef=2; f.pChg=1; P.eq1=f.eq1; }
      else if (b==='B' && f.eq2!==P.eq2){ f.pRef=3; f.pChg=1; P.eq2=f.eq2; }
      else if (b==='B' && f.opmode!==P.mode){ f.pRef=4; f.pChg=1; P.mode=f.opmode; if (f.aes2) f.src_reset=1; }
      else if (b==='A' && f.tone!==P.tone){ f.pRef=5; f.pChg=1; P.tone=f.tone; }
      else if (b==='B' && f.tone1!==P.tone1){ f.pRef=5; f.pChg=1; P.tone1=f.tone1; }
      else if (b==='B' && f.tone2!==P.tone2){ f.pRef=6; f.pChg=1; P.tone2=f.tone2; }
      else if (f.sigChg){ f.pRef = b==='A'? 2 : 7; f.pChg=1; f.sigChg=0; }
      else if (f.pTxDone){ f.pRef = f.pRef>=O.pmax? 0 : f.pRef+1; }
    }
    if (eqTog){ log(`pass ${f.passIx}: READ_SWITCHES → TRANSLATE_SWITCHES (pb = YES, eq_refresh) → TRANSLATE_EQ_PUSHBUTTONS: eq${(pressed&1)?1:2}_active ^= BIT0 → ${(pressed&1)?f.eq1:f.eq2}`);
                log(`PROCESS_MODES: CS8416_write${(pressed&1)?1:2}(0x04, ${((pressed&1)?f.eq1:f.eq2)?'0x89':'0x80'}) → RXSEL = RXP${((pressed&1)?f.eq1:f.eq2)?1:0} (${((pressed&1)?f.eq1:f.eq2)?'EQ':'flat'} path), the receiver re-locks`);
                log(`REFRESH_LEDS: EQ${(pressed&1)?1:2} LED ${((pressed&1)?f.eq1:f.eq2)?'on':'off'}; PARAMETER_UPDATE queues the report for the next CAN_TX_TIMER call`); }
    // 8 EEPROM save
    let extra=0;
    if (f.save){ f.save=0; const bytes = b==='A'? [[10,0xAA],[14,f.tone]] : [[10,0xAA],[11,f.opmode],[13,f.tone1],[14,f.tone2]];
      bytes.forEach(([a,v])=>{ f.ee[a]=v; }); extra = bytes.length*C.EE_BYTE; R.eeEv.push({t:tp+passTime(b,f.opmode), bytes, dur:extra});
      log(`SAVE_INFORMATION_EEPROM: ${bytes.map(([a,v])=>`[${a}] = 0x${hx(v)}`).join(', ')} — ${bytes.length} × ≈3.3 ms ${'(inferred)'} stall the loop`); }
    const dur = passTime(b, f.opmode) + extra;
    R.passT.push(tp); R.passD.push(dur); R.passM.push(f.opmode);
    f.nextPass = tp + dur;
    snap();
  }
  /* ---------- CAN_TX_TIMER (from timer1_ovf_isr) ---------- */
  function txTimer(){
    const tt=t;
    if (f.frameJob){
      const J=f.frameJob; J.left--; const last=J.left<=0;
      frame('tx', J.type|0x80, last? J.lastLen : 8, last?1:0, `${MSG[J.type]||'0x'+hx(J.type)} reply · frame ${J.n-J.left}/${J.n}`, {oid:J.oid});
      if (last){ f.frameJob=null; f.com=0; f.leds&=~0x40; f.mfcWait=false; f.mfcNext=busFree+C.MFC_GAP; if (J.after) J.after(); f.t1Next = tt + ((f.dinit? 1000*f.slot : C.HB)+2)*C.T1; }
      else f.t1Next = tt + C.T1;
      return;
    }
    if (!f.restart_sent){
      const fr=frame('tx', 0x11, 1, 3, 'TRAP · CANTRAP_RESTART (0x01)');
      if (fwi.restartOnce) f.restart_sent=1;
      if (R.trapAt==null) R.trapAt=fr.t;
      if (w.mfc) mfcOnTrap(fr.t+fr.dur);
    } else if (!f.restore){
      f.com=1; f.leds|=0x40;
      const o=O.refreshOid[f.pRef]; const v=oidValue(f,w,o);
      const fr=frame('tx', 0x10, 6, 3, `REPORT_PARAM ${oidS(o)} = 0x${hx(v,4)} (${valText(b,o,v)})`, {oid:o, v, hb:true, ref:O.refresh[f.pRef]});
      cacheSet(fr.t+fr.dur, o, v);
      f.pTxDone=1; f.pChg=0;
    }
    const thr = f.dinit? 1000*f.slot : C.HB;
    f.t1Next = tt + (thr+2)*C.T1;
  }
  /* ---------- frame controller behaviour (inferred) ---------- */
  function mfcOnTrap(tt){
    if (D.ui.dashOpen || !fwi.restartOnce){ queue([{type:0x45, label:'GET_NUMPARAMS'}], tt); }
    if (w.dataSafe && fwi.dataSafe){
      const rw = b==='A'? [[0x0400,'alarm'],[0x0302,'eq1'],[0x0305,'tone']] : [[0x0400,'alarm'],[0x030A,'opmode'],[0x0302,'eq1'],[0x0305,'tone1'],[0x0303,'eq2'],[0x0306,'tone2']];
      const store = D.dsStore || {};
      queue([{type:0x4A, oid:0xFF07, v:1, label:'SET_PARAM FF.07 = 1 (DataSafe: restore start)'}].concat(rw.filter(([o])=>store[o]!=null).map(([o])=>({type:0x4A, oid:o, v:store[o], label:`SET_PARAM ${oidS(o)} = ${store[o]} (DataSafe)`}))).concat([{type:0x4A, oid:0xFF08, v:1, label:'SET_PARAM FF.08 = 1 (DataSafe: restore end)'}]), tt+0.002);
    }
  }
  function queue(reqs, tt){ reqs.forEach(r=>f.mfcQ.push(r)); f.mfcNext=Math.max(f.mfcNext||0, tt||t); }
  function mfcSend(){
    const r=f.mfcQ.shift(); const len = r.type===0x4A? 4 : (r.oid!=null? 2 : 1);
    const fr=frame('rx', r.type, len, 3, r.label, {oid:r.oid});
    const te=fr.t+fr.dur;
    // can_rx_isr → CANRX → DASHBOARD_RESPONSE_SETUP
    f.canRx++;
    const one=(lbl, o, v)=>{ const rf=frame('tx', r.type|0x80, 6, 3, lbl, {oid:o, v}); if (o!=null && v!=null) cacheSet(rf.t+rf.dur, o, v); f.mfcNext=busFree+C.MFC_GAP; };
    const multi=(len, lbl, after)=>{ const n=multiFrames(len); frame('tx', r.type|0x80, 8, 2, `${lbl} · frame 1/${n}`, {oid:r.oid}); f.frameJob={type:r.type, n, left:n-1, lastLen: Math.max(1, len-((n-1)*8-4)), oid:r.oid, after}; f.mfcWait=true; f.com=1; f.leds|=0x40; f.t1Next=Math.min(f.t1Next, busFree+C.T1*0.5); };
    if (r.type===0x45){ f.restart_sent=1; one(`GET_NUMPARAMS reply: ${O.params.length} parameters`); return; }
    if (r.type===0x46){ multi(4+2*O.params.length, 'GET_PARAM_OIDS reply'); return; }
    if (r.type===0x50){ multi(4+8+1, 'GET_MENUSET_NAME reply'); return; }
    if (r.type===0x51){ one('GET_MENU_COUNT reply'); return; }
    if (r.type===0x52){ multi(4+14, 'GET_MENU_NAME reply'); return; }
    if (r.type===0x53){ const n = r.menu===1? (b==='A'? O.menu1.length : (f.dashEn? O.menu1.length : O.menu3.length)) : r.menu===2? O.status.length : O.info.length; multi(4+2*n, `GET_MENU_OIDS reply (${n} OIDs${b==='B'&&r.menu===1? (f.dashEn?', Menu1OID':', Menu3OID — no Save'):''})`); return; }
    if (r.type===0x47){ multi(descLen(b,r.oid), `GET_DESCRIPTOR ${oidS(r.oid)} reply`); return; }
    if (r.type===0x49){ const s=stringOid(w,r.oid); if (s!=null){ multi(4+s.length+1, `GET_PARAM ${oidS(r.oid)} = “${s}”`, ()=>cacheSet(busFree, r.oid, s)); return; }
      const v=oidValue(f,w,r.oid); one(`GET_PARAM ${oidS(r.oid)} reply = 0x${hx(v==null?0:v,4)} (${valText(b,r.oid,v)})`, r.oid, v); return; }
    if (r.type===0x4A){ const v=setParam(r.oid, r.v); one(`SET_PARAM ${oidS(r.oid)} reply = ${v==null?'—':'0x'+hx(v,4)}${r.oid<0xFF00? ' ('+valText(b,r.oid,v)+')':''}`, r.oid<0xFF00? r.oid : null, v); return; }
    one('reply');
  }
  /* DASHBOARD_RESPONSE_SETUP case CANMSG_SET_PARAM */
  function setParam(o, v){
    const de=f.dashEn;
    if (o===0x0201){ log('SET 2.1: echoed (read-only Card Status)'); return v; }
    if (o===0xFF07){ if (!fwi.dataSafe){ log('FF.07: not handled in this version → no reply branch (falls through)'); return null; } f.restore=v?1:0; log(`FF.07 → restore_start = ${f.restore}: CAN_TX_TIMER stops sending REPORT_PARAM`); return v; }
    if (o===0xFF08){ if (!fwi.dataSafe) return null; f.restore=(~v)&1; log(`FF.08 → restore_start = INVERT_DATA(${v}) & BIT0 = ${f.restore}`); return v; }
    if (o===0x0400){ f.alarm=v?1:0; log(`4.0 → smpte_alarm_enabled = ${f.alarm} (affects Card Status${b==='A'?' and the AES Input value':''})`); return v; }
    if (o===0x0301){ f.save = (~v)&0xFF ? 1 : 0; log(`3.1 → save_settings = INVERT_DATA(${v}) = 0x${hx((~v)&0xFF)} → main loop calls SAVE_INFORMATION_EEPROM`); return v; }
    if ((b==='A' && o===0x0306) || (b==='B' && o===0x0308)){ log(`${oidS(o)} AD Result → replies ad_result_upper/lower = ${f.ad} (the slot-ID ADC reading)`); return f.ad; }
    if (o===0x0302 || o===0x0303){ const k=o===0x0302?'eq1':'eq2'; if (b==='A' && o===0x0303) return null;
      if (de){ f[k]=v?1:0; f.prev[k]=f[k]; log(`${oidS(o)} → ${k}_active = ${f[k]} and p${k}_active = ${f[k]} (so PARAMETER_UPDATE will not report it); PROCESS_MODES writes reg 0x04 on the next pass`); }
      else log(`${oidS(o)} ignored: dashboard_enabled = NO → reply echoes ${f[k]}`);
      return f[k]; }
    if (b==='A' && o===0x0305){ if (de) f.tone=v?1:0; log(`3.5 → tone_generation = ${f.tone}. ALTERA_write() never looks at it (the tone branch is commented out): the outputs do not change`); return f.tone; }
    if (b==='B' && o===0x0305){ if (de){ if (f.opmode!==2) f.tone1=v?1:0; else { f.tone1=0; log('3.5 refused in 1x8 w/ SRC: reply 0 (Disabled)'); } } f.prev.tone1=f.tone1; log(`3.5 → tone_generation1 = ${f.tone1}`); return f.tone1; }
    if (b==='B' && o===0x0306){ if (de){ if (f.opmode===1) f.tone2=v?1:0; else { f.tone2=0; log('3.6 accepted only in 2x4: reply 0 (Disabled)'); } } f.prev.tone2=f.tone2; log(`3.6 → tone_generation2 = ${f.tone2}`); return f.tone2; }
    if (b==='B' && o===0x030A){ if (de){ f.opmode = v===0?0 : v===1?1 : 2; log(`3.10 → mode = ${MODES[f.opmode]}; PARAMETER_UPDATE will report it and pulse src_reset if AES2 is locked`); } else log('3.10 ignored (DIP SW8 ON)'); return f.opmode; }
    if (b==='B' && o===0x0304){ log('3.4 src_select stored; nothing reads it (dead parameter)'); return v?1:0; }
    return v;
  }
  /* ---------- action context ---------- */
  const ctx = { w, f, get t(){ return t; }, log, rxUpdate, queue, startBoot, frame, locked };
  // initial state
  if (f.mode==='app'){ f.nextPass=0; }
  snap();
  let ai=0, guard=0;
  while (guard++ < 400000){
    const tAct = ai<acts.length? acts[ai].t : Infinity;
    const tBoot = f.mode==='boot'? f.bootEnd : Infinity;
    const tPass = f.mode==='app'? f.nextPass : Infinity;
    const tTx = f.mode==='app'? f.t1Next : Infinity;
    const tMfc = (f.mode==='app' && f.mfcQ.length && !f.mfcWait)? Math.max(f.mfcNext, busFree) : Infinity;
    const tT0 = f.mode==='app'? f.t0Next : Infinity;
    const tn = Math.min(tAct, tBoot, tPass, tTx, tMfc, tT0);
    if (!(tn < 1)) break;
    t = tn;
    if (tn===tAct){ const a=acts[ai++]; curTr=[]; R.tr[a.id]=curTr; try{ a.fn(ctx); }catch(e){ console.error(e); curTr.push('error: '+e.message); }
      if (a.world){ R.worlds.push({t, w:deep(w)}); [0,1].forEach(k=>rxUpdate(k,false)); }
      snap(); continue; }
    curTr = null;
    if (tn===tBoot){
      const ph=bootPhases(b); const p=ph[f.bootIx];
      if (p[2]==='cs'){ f.rxOn=true; [0,1].forEach(k=>{ f.rx[k].sel=0; rxUpdate(k,true); }); }
      f.bootIx++;
      if (f.bootIx>=ph.length){ curTr = R.bootTr = []; appInit(t); curTr=null; seg('app', t, 1, 'main loop'); }
      else { f.bootEnd=t+ph[f.bootIx][0]; f.bootLabel=ph[f.bootIx][1]; seg('boot', t, f.bootEnd, ph[f.bootIx][1]); }
      snap(); continue;
    }
    if (tn===tMfc){ mfcSend(); snap(); continue; }
    if (tn===tTx){ txTimer(); snap(); continue; }
    if (tn===tT0){ // timer0_ovf_isr: interrupt_counter == ONE_SECOND
      if (f.canRx < C.DINIT){ f.dcount++; if (f.dcount>=C.DCOUNT) f.dinit=0; } else { f.dinit=1; f.dcount=0; }
      f.canRx=0; f.t0Next = t + (C.ONE_SECOND+1)*C.T0; snap(); continue; }
    if (tn===tPass){ runPass(t); continue; }
  }
  R.end={ w:deep(w), f:deep(f) }; R.busFree=busFree;
  return R;
}
function sim(){ if (D.Rver!==D.ver || !D.R){ D.R=simulate(); D.Rver=D.ver; } return D.R; }
function snapAt(t){ const s=sim().snaps; let lo=0, hi=s.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if (s[m].t<=t) lo=m; else hi=m-1; } return s[lo]; }
function worldAt(t){ const ws=sim().worlds; let r=ws[0]; for (const x of ws){ if (x.t<=t) r=x; else break; } return r.w; }
function cacheAt(t){ const R=sim(); const c=Object.assign({}, R.cache0); for (const e of R.cacheEv){ if (e.t>t) break; c[e.o]=e.v; } return c; }
function rxAt(k,t){ const L=sim().rxEv[k]; let v = k===1 && D.s0.w.build!=='B'? 0 : (D.s0.f.rxOn && D.s0.f.rx[k].lockAt<=0 ? 1 : 0); for (const e of L){ if (e.t<=t) v=e.v; else break; } return v; }
function passAt(t){ const P=sim().passT; let lo=0, hi=P.length-1; if (hi<0 || t<P[0]) return -1; while(lo<hi){ const m=(lo+hi+1)>>1; if (P[m]<=t) lo=m; else hi=m-1; } return lo; }
function fState(t){ const s=snapAt(t); const w=worldAt(t); const f={ mode:s.mode, rxOn:s.rxOn, rx:[{sel:s.sel0, lockAt:s.lock0},{sel:s.sel1, lockAt:s.lock1}], aes1:s.aes1, aes2:s.aes2, eq1:s.eq1, eq2:s.eq2, tone:s.tone, tone1:s.tone1, tone2:s.tone2, opmode:s.opmode, alarm:s.alarm, input1:s.input1, input2:s.input2, ad:s.ad, dashEn:s.dashEn };
  return {s, w, f}; }

/* =====================================================================
   ACTIONS — each one is placed at the playhead, re-simulated, and its firmware trace kept
   ===================================================================== */
let actId=0;
function addAct(name, fn, world, at){
  const t = at!=null? at : SIM.t; const a={id:++actId, t, name, fn, world:!!world}; D.acts.push(a); D.ui.lastAct=a; D.ver++;
  return a;
}
function done(){ if (D.ui.autoFollow && D.ui.lastAct) SIM.seek(Math.min(1, D.ui.lastAct.t + 0.002)); else SIM.refresh(); }
function rollSecond(){
  const R=sim(); const e=R.end; const f=deep(e.f), w=deep(e.w);
  ['t1Next','t0Next','nextPass','bootEnd','mfcNext'].forEach(k=>{ if (isFinite(f[k])) f[k]-=1; });
  f.rx.forEach(r=>{ if (isFinite(r.lockAt)) r.lockAt-=1; });
  if (f.mode==='boot'){ /* keep the boot running into the next second */ }
  D.s0={w, f, cache:cacheAt(1)}; D.acts=[]; D.second++; D.ver++; D.ui.lastAct=null;
}
function resetAll(b, fw, brand){
  b=b||D.s0.w.build; D.s0=mkS0(b);
  if (fw && BUILDS[b].fws[fw]) D.s0.w.fw=fw;
  D.s0.w.brand = brand || BUILDS[b].fws[D.s0.w.fw].brand;
  D.s0.cache=snapshotCache(D.s0.f, D.s0.w);
  D.acts=[]; D.second=1; D.ver++; D.ui.lastAct=null; D.dsStore={};
}
const A = {
  plug(k){ const w=worldAt(SIM.t); const inp=k===1?w.in1:w.in2; const on=!inp.conn;
    addAct(`${on?'Connect':'Disconnect'} the AES cable on IN${k}`, c=>{ c.w['in'+k].conn=on; const pos=rearPosOfBnc(c.w,k);
      c.log(`BNC${k}_SIG (P1-${BNC[k].pin}) ← rear position ${pos||'—'} ${pos? '' : '(this rear module does not reach this card pin)'}`);
      c.log(`${BNC[k].via} → CS8416 U${k===1?5:6} RXP0 (flat) / RXP1 (EQ)`);
      const s=rxSignal(c.w,k-1,c.f.rx[k-1].sel); c.log(on? (s.ok? `Signal decodable (cable loss ${s.loss.toFixed(1)} dB${s.boost? ', EQ +'+s.boost.toFixed(1)+' dB':''}): the receiver PLL locks in ≈${C.LOCK_T*1e3} ms ${'(inferred)'}` : `Receiver cannot lock: residual loss ${s.resid.toFixed(1)} dB > 18 dB, or the rate is outside 30–192 kHz`) : 'Receiver loses lock at once; the next CS8416_READ_LOCK_ALL sees it');
      c.log('Next pass: REFRESH_LEDS changes Lock / No Lock, ALTERA_write flips the NOT-lock bit that mutes the encoder; the DashBoard report waits for the next CAN_TX_TIMER heartbeat'); }, true); done(); },
  setLen(k, m){ addAct(`IN${k} cable length → ${m} m`, c=>{ c.w['in'+k].len=m; const s=rxSignal(c.w,k-1,c.f.rx[k-1].sel);
      c.log(`Cable loss at ${(64*s.fs/1e6).toFixed(2)} MHz (64·fs): ${s.loss.toFixed(1)} dB ${'(inferred coax model, calibrated to the manual’s 600 m)'}`);
      c.log(`EQ path ${c.f.rx[k-1].sel? 'in: +'+s.boost.toFixed(1)+' dB from R2/R4/R6/C4/R12/C7' : 'out (RXP0 flat path)'} → residual ${s.resid.toFixed(1)} dB → ${s.ok?'decodable':'too much loss: no lock'}`); }, true); done(); },
  setFs(k, fs){ addAct(`IN${k} sample rate → ${fs/1000} kHz`, c=>{ c.w['in'+k].fs=fs; c.log(`AES3 at ${fs/1000} kHz: ${(64*fs/1e6).toFixed(3)} Mbit/s, bit cell ${(1e9/(128*fs)).toFixed(0)} ns`); c.rxUpdate(k-1,true); c.log('The CS8416 PLL re-locks to the new rate'); }, true); done(); },
  press(k){ const lbl = k===0? 'SW1 (EQ / EQ1)' : 'SW2 (EQ2)';
    addAct(`Press ${lbl}`, c=>{ c.w.sw[k]=true; c.log(`${k===0?'SW1 → R77 → PE2':'SW2 → R78 → PE6'} pulled to GNDD; READ_SWITCHES sees (PINE & BIT${k===0?2:6}) == 0 on the next pass`);
      if (c.w.build==='A' && k===1) c.log('D6201A: AES2_AVAILABLE is off, so READ_SWITCHES never looks at SW2 (it is fitted on the board but dead)'); }, true);
    addAct(`Release ${lbl}`, c=>{ c.w.sw[k]=false; c.log('Released: TRANSLATE_SWITCHES sets pb_release; DEBOUNCE_PUSHBUTTONS counts 255 passes before another press is accepted'); }, true, Math.min(0.9999, SIM.t + C.PRESS));
    D.ui.lastAct = D.acts[D.acts.length-2]; done(); },
  dip(i){ const w=worldAt(SIM.t); const on=!w.dip[i];
    addAct(`DIP SW3-${i+1} ${on?'ON':'OFF'}`, c=>{ c.w.dip[i]=on; const b=c.w.build;
      c.log(`SW3 position ${i+1} → R${[62,63,64,65,96,97,98,99][i]} 110 Ω → PA${7-i}; MIRROR(PINA) puts it in dip_switches bit ${i} (${on?'0 = ON':'1 = OFF'})`);
      if (b==='A') c.log('D6201A: dip_switches is read every pass but never used (dip_switch_enabled forced NO)');
      else if (i===6||i===7) c.log(`SW${i+1} is only latched at boot (dip_switch_enabled / dashboard_enabled): power-cycle the card to apply`);
      else if (i<4) c.log(c.f.dipEn && !c.f.dashEn? 'DIP control is live (SW7 OFF and SW8 ON at boot): ALTERA_write applies it on the next pass' : `Ignored by ALTERA_write until the card boots with SW7 OFF (DIP) ${c.f.dipEn?'':'— now ON'} and SW8 ON ${c.f.dashEn?'— now OFF':''}`);
      else c.log('Positions 5 and 6 are “RESERVED” (D6201B-FUNCTIONAL.pdf); nothing reads them'); }, true); done(); },
  jumper(h){ const w=worldAt(SIM.t); const nxt = h==='H1'||h==='H2'? (w[h]===75?110:75) : h==='H3'? (w.H3==='rear'?'ref':'rear') : (w.H4==='ref1'?'ref2':'ref1');
    addAct(`Move jumper ${h} → ${nxt}`, c=>{ c.w[h]=nxt;
      const m={H1:'IN1 termination: pin 1–2 = R8 75 Ω, 2–3 = R9 110 Ω (both to GNDD) across T1’s secondary', H2:'IN2 termination: R30 75 Ω / R31 110 Ω on T2’s secondary', H3:'CS8416 #2 source: 1–2 = rear IN2 (T2), 2–3 = REF (frame reference buffered by Q2)', H4:'REF select: 1–2 = REF1 (P2-14), 2–3 = REF2 (P2-10) → R61 → Q2 2N4401 emitter follower → R60 30 Ω → C58'}[h];
      c.log(m); if (c.w.build==='A' && (h==='H2'||h==='H3'||h==='H4')) c.log('D6201A: CS8416 #2 is never read (AES2_AVAILABLE off), so this jumper has no visible effect'); }, true); done(); },
  frameRef(n, on, fs){ addAct(`Frame REF${n} ${on?'on':'off'}${fs?' @ '+fs/1000+' kHz':''}`, c=>{ const r=c.w['ref'+n]; r.on=on; if (fs) r.fs=fs; c.log(`REF${n} on the midplane (P2-${n===1?14:10}); the card only uses it through H4 → H3 2–3`); }, true); done(); },
  setRear(id){ addAct(`Fit rear module ${REARS[id].name}`, c=>{ c.w.rear=id; const R=REARS[id];
      c.log(`${R.name}: ${R.sub}. ID resistors AN_BMID ${R.id[0]} Ω / AN_BMID2 ${R.id[1]} Ω (${R.src})`);
      c.log(`The D6201 firmware never converts them: adc_init() sets ADMUX = 0x00 (ADC0 = AN_SLOTID only). AN_BMID → PF1/ADC1 and AN_BMID2 → PF2/ADC2 with 1K pull-ups R53/R54 are wired but unread`);
      if (R.dual) c.log(`T6401: this card sits on ${c.w.slot%2===0?'P101 (left column)':'P102 (right column)'} ${'(slot parity → connector is inferred)'}; only BNC1, 3, 5, 7, 9 nets reach a jack: IN2 and OUT2-x are lost`);
      if (id==='T6201') c.log('T6201A is for the 10-slot DFR-8310 frame only (manual)'); }, true); done(); },
  setSlot(n){ addAct(`Move the card to slot ${n} (hot plug)`, c=>{ c.w.slot=n; c.startBoot(c.t); c.log(`Pulled and re-inserted: power-on reset, then main() averages AN_SLOTID: midplane ${SLOT_R[n-1]} Ω against R55 1K → ADC ≈ ${slotAdc(n)} → slot ${ADDRESS_TABLE(slotAdc(n))}`); c.log(`Boot takes ≈ ${(bootLen(c.w.build)*1000).toFixed(0)} ms before the main loop starts`); }, true); done(); },
  power(){ addAct('Power-cycle the card', c=>{ c.startBoot(c.t); c.log('Reset: RAM settings are lost; EEPROM keeps bytes 10…14'); c.log(`Boot sequence (v100w.c) ≈ ${(bootLen(c.w.build)*1000).toFixed(0)} ms: ${bootPhases(c.w.build).map(p=>p[1].split(':')[0]).join(' → ')}`); }, true); done(); },
  dashSet(o, v){ const b=D.s0.w.build; D.dsStore[o]=v;
    addAct(`DashBoard: set ${oidDef(b,o).name} (${oidS(o)}) = ${valText(b,o,v)}`, c=>{ c.queue([{type:0x4A, oid:o, v, label:`SET_PARAM ${oidS(o)} = ${v}`}], c.t);
      c.log(`Frame controller → CAN: SET_PARAM (0x4A) to mod_address 0x${hx(c.f.slot+0x10)} with OID ${oidS(o)}, value 0x${hx(v,4)}`);
      c.log('can_rx_isr → CANRX → DASHBOARD_RESPONSE_SETUP(case CANMSG_SET_PARAM) → reply sent from inside the ISR'); }); done(); },
  dashOpen(){ const O=OIDS(D.s0.w.build); D.ui.dashOpen=true;
    addAct('DashBoard: open the card (discovery)', c=>{
      const q=[{type:0x45,label:'GET_NUMPARAMS'},{type:0x46,label:'GET_PARAM_OIDS'},{type:0x50,label:'GET_MENUSET_NAME 0'},{type:0x50,label:'GET_MENUSET_NAME 1'},{type:0x51,label:'GET_MENU_COUNT'},
        {type:0x52,label:'GET_MENU_NAME Card Info'},{type:0x52,label:'GET_MENU_NAME Card Status'},{type:0x52,label:'GET_MENU_NAME Card Settings'},
        {type:0x53,menu:0,label:'GET_MENU_OIDS 0.0 (Menu0OID)'},{type:0x53,menu:2,label:'GET_MENU_OIDS 0.1 (Menu2OID)'},{type:0x53,menu:1,label:'GET_MENU_OIDS 1.0'}]
        .concat(O.params.map(o=>({type:0x47, oid:o, label:`GET_DESCRIPTOR ${oidS(o)}`}))).concat(O.params.filter(o=>o<0x0700).map(o=>({type:0x49, oid:o, label:`GET_PARAM ${oidS(o)}`})));
      c.queue(q, c.t); c.log(`${q.length} requests queued at the frame controller ${'(order inferred: the archive has the card side only)'}`); c.log('Each multi-frame reply is sent one 8-byte frame per timer1 tick (frame_count != 0 → CAN_TX_TIMER every 96 µs)'); }); done(); },
  dashRefresh(){ const O=OIDS(D.s0.w.build);
    addAct('DashBoard: refresh status', c=>{ c.queue(O.status.map(([o])=>({type:0x49, oid:o, label:`GET_PARAM ${oidS(o)}`})), c.t); c.log('GET_PARAM for each Card Status OID; the replies come straight from the ISR with the live values'); }); done(); },
  dataSafe(on){ addAct(`DashBoard DataSafe ${on?'on':'off'}`, c=>{ c.w.dataSafe=on; c.log(on? 'After the card announces CANTRAP_RESTART, the frame controller pushes the stored settings back (FF.07 → SETs → FF.08) — sequence inferred from the FF.07/FF.08 handlers' : 'Off'); }, true); done(); },
};
document.addEventListener('keydown', e=>{
  if (!window.__d6201Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key; const b=D.s0.w.build;
  const m={ e:()=>A.press(0), q:()=>{ if (b==='B') A.press(1); }, i:()=>A.plug(1), j:()=>{ if (b==='B') A.plug(2); }, d:()=>A.dashRefresh(), p:()=>A.power(), n:()=>{ rollSecond(); SIM.refresh(); } };
  const f=m[k.toLowerCase()]; if (f){ f(); e.preventDefault(); }
});

/* =====================================================================
   DRAWING: card (real ISS5 gerber artwork), card edge, rear module, frame, DashBoard-style window
   ===================================================================== */
/* Card artwork: D6201AISS5.TOP + .TSM + .DRL (copper/pads/holes) and .TSS (silk) rendered at 120 dpi over
   x 2.45…15.33 in, y 5.56…8.60 in (1546 × 365 px). The third-party logo in the silk was blanked.
   Part positions from D6201BISS5 PNP PCAD.pnp (origin 3095, 6100 mil); through-hole headers measured on the silk.
   Solder mask colour from D6201B Photo.jpg (green). */
const PX = x => (x/1000+0.645)*120, PY = y => (2.5-y/1000)*120;
const LEDS = [ // [ref, pnp x, pnp y, bit, colour, label, net]
  ['L2',-95.3,2200,0,'var(--led-g)','LOCK1','LOCK1 · PE0'],['L3',-95.3,2010,1,'#ff4a3d','NO LOCK1','NO_LOCK1 · PE1'],['L4',-95.3,1820,2,'#ffd23a','EQ1','EQ1 · PE3'],
  ['L5',-95.3,1555,3,'var(--led-g)','LOCK2','LOCK2 · PE4'],['L6',-95.3,1350,4,'#ff4a3d','NO LOCK2','NO_LOCK2 · PE5'],['L7',-95.3,1145,5,'#ffd23a','EQ2','EQ2 · PE7'],
  ['L8',629.7,775,6,'var(--led-g)','COM ACTIVITY','COM_ACTIVITY · PB0'],['L9',629.7,650,7,'#ff4a3d','ERROR','ERROR · PB1']];
const CHIPS = { U7:[6720.1,1198.8,'AT90CAN128','mcu'], U10:[9160.1,1068.8,'EP1C3T100','fpga'], U5:[9323.7,1950.8,'CS8416 #1','rx1'], U6:[8633.7,1950.8,'CS8416 #2','rx2'],
  U9:[10013.7,435.2,'AD1895 SRC','src'], U1:[10410,2090,'EL5263 IN1','fe1'], U3:[10305,1590,'EL5263 IN2','fe2'], U2:[11297,1065,'EL5263 OUT1/2','drv'], U4:[11295,450,'EL5263 OUT3/4','drv'],
  U8:[11440,-145,'SN65HVD233','can'], U11:[8260,1065,'M25P40 (EPCS1)','fpga'], X2:[8710,388,'24.576 MHz','src'], REG1:[3265,40,'LM2676','pwr'] };
const JP = { H1:{x:1388.7, y:[33.3,44.7,57.5], v:w=>w.H1===75?0:1, lab:['75','110']}, H2:{x:1380, y:[82.5,94,106.7], v:w=>w.H2===75?0:1, lab:['75','110']},
  H3:{x:1367.5, y:[82.5,94,106.7], v:w=>w.H3==='rear'?0:1, lab:['IN2','REF']}, H4:{horiz:true, y:317.5, x:[1383,1370,1359.2], v:w=>w.H4==='ref1'?0:1, lab:['REF1','REF2']} };
function cardSVG(t, opts){
  opts=opts||{}; const {s, w}=fState(t); const L=s.leds, b=w.build;
  let o=`<svg viewBox="0 0 1546 365" role="img" aria-label="D6201A ISS5 card, top side (real gerber artwork)" style="width:100%;display:block;border-radius:6px">
   <defs><filter id="d61glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect width="1546" height="365" fill="var(--panel2)"/>
   <path d="M8 8 H1480 L1490 18 V38 H1546 V300 H1496 V306 H1546 V352 H1490 V356 H60 L8 302 Z" fill="#1d6b35" stroke="#0f3d1d"/>
   <image href="${ASSET}d6201-card-copper.png" width="1546" height="365"/>
   <image href="${ASSET}d6201-card-silk.png" width="1546" height="365" opacity=".9"/>`;
  LEDS.forEach(([ref,x,y,bit,col,lab,net])=>{ const cx=PX(x), cy=PY(y), on=(L>>bit)&1;
    const dead = (b==='A' && bit>=3 && bit<=5) || bit===7;
    o+=`<g><title>${ref} ${lab} (${net}) — ${on?'lit':'off'}${dead? (bit===7?' · never lit: every COM_ERROR_LED_ON is commented out':' · not driven by the D6201A build'):''}</title><rect x="${cx-9}" y="${cy-5}" width="18" height="10" rx="2" fill="${on?col:'#2b2f2c'}" ${on?'filter="url(#d61glow)"':''} stroke="#111"/></g>`; });
  [[0,190,2011.9],[1,190,1351.9]].forEach(([k,x,y])=>{ const cx=PX(x), cy=PY(y), down=w.sw[k];
    o+=`<g class="d61-sw" data-k="${k}" style="cursor:pointer"><rect x="${cx-8}" y="${cy-17}" width="16" height="34" rx="2" fill="#ccc" stroke="#444"/><rect x="${cx-5}" y="${cy-8+(down?2:0)}" width="10" height="16" rx="2" fill="${down?'#777':'#f4f4f4'}" stroke="#555"/><rect x="${cx-14}" y="${cy-22}" width="28" height="44" fill="transparent"><title>SW${k+1} EQ${b==='B'?k+1:''} push-button — click to press${b==='A'&&k===1?' (not read by the D6201A firmware)':''}</title></rect></g>`; });
  const dx=PX(3195), dy=PY(1814.5);
  o+=`<rect x="${dx-50}" y="${dy-20}" width="100" height="40" rx="3" fill="#202020" stroke="#555"/>`;
  for (let i=0;i<8;i++){ const x=dx-42+i*12, on=w.dip[i];
    o+=`<g class="d61-dip" data-i="${i}" style="cursor:pointer"><rect x="${x-4.5}" y="${dy-15}" width="9" height="30" rx="1.5" fill="#2d63b8" stroke="#183a72"/><rect x="${x-3.5}" y="${on?dy-13:dy+1}" width="7" height="12" fill="#f2f2f2"/><rect x="${x-6}" y="${dy-22}" width="12" height="44" fill="transparent"><title>SW3-${i+1} ${['SINGLE/DUAL','SRC ON/OFF','TONE1 ON/OFF','TONE2 ON/OFF','RESERVED','RESERVED','DIP-SWITCH ENABLE','DASHBOARD ENABLE'][i]} — ${on?'ON':'OFF'} (click)</title></rect></g>`; }
  o+=`<text x="${dx-48}" y="${dy+33}" font-size="10" fill="#cfe9ff">1</text><text x="${dx+42}" y="${dy+33}" font-size="10" fill="#cfe9ff">8</text><text x="${dx-48}" y="${dy-24}" font-size="9" fill="#cfe9ff">ON ↑ · SW1 at left (inferred)</text>`;
  Object.keys(JP).forEach(h=>{ const J=JP[h], v=J.v(w);
    if (J.horiz){ const xs=J.x; o+=`<g class="d61-jp" data-h="${h}" style="cursor:pointer"><rect x="${xs[2]-7}" y="${J.y-7}" width="${xs[0]-xs[2]+14}" height="14" rx="2" fill="#111" stroke="#888"/>${xs.map(x=>`<circle cx="${x}" cy="${J.y}" r="3" fill="#d6b260"/>`).join('')}<rect x="${(v? xs[2]:xs[1])-5}" y="${J.y-6}" width="${xs[0]-xs[1]+10}" height="12" rx="2" fill="#e8c23a" opacity=".92"/><rect x="${xs[2]-12}" y="${J.y-14}" width="${xs[0]-xs[2]+24}" height="28" fill="transparent"><title>${h}: ${J.lab[v]} (click to move)</title></rect></g>`; }
    else { const ys=J.y; o+=`<g class="d61-jp" data-h="${h}" style="cursor:pointer"><rect x="${J.x-6}" y="${ys[0]-7}" width="12" height="${ys[2]-ys[0]+14}" rx="2" fill="#111" stroke="#888"/>${ys.map(y=>`<circle cx="${J.x}" cy="${y}" r="3" fill="#d6b260"/>`).join('')}<rect x="${J.x-5.5}" y="${(v? ys[1]:ys[0])-5}" width="11" height="${ys[1]-ys[0]+10}" rx="2" fill="#e8c23a" opacity=".92"/><rect x="${J.x-7}" y="${ys[0]-12}" width="14" height="${ys[2]-ys[0]+24}" fill="transparent"><title>${h}: ${J.lab[v]} (click to move)</title></rect></g>`; }
  });
  if (opts.labels!==false){
    const lab=(x,y,txt,k)=>`<text class="d61-chip" data-b="${k}" x="${x}" y="${y}" font-size="14" font-weight="700" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke" style="cursor:pointer">${txt}</text>`;
    Object.keys(CHIPS).forEach(r=>{ const [x,y,n,k]=CHIPS[r]; const dyy = r==='U7'? -40 : r==='U10'? 46 : r==='U5'? 44 : r==='U6'? -22 : r==='U2'? -28 : r==='U4'? 34 : r==='REG1'? -40 : r==='U11'? 28 : r==='X2'? 26 : -16;
      o+=lab(PX(x)-34, PY(y)+dyy, `${r} ${n}`, k); });
    o+=lab(1415,38,'T1',  'fe1')+lab(1415,128,'T2','fe2')+lab(1500,180,'P1','rear')+lab(1500,345,'P2','mid');
  }
  if (s.mode==='off') o+=`<rect width="1546" height="365" fill="var(--panel2)" opacity=".7"/><text x="773" y="190" text-anchor="middle" font-size="34" fill="var(--ink)">no power</text>`;
  if (s.mode==='boot') o+=`<rect x="250" y="292" width="1040" height="26" rx="4" fill="#000" opacity=".65"/><text x="262" y="310" font-size="15" fill="#ffd36a">booting: ${esc(s.boot)}</text>`;
  return o+'</svg>';
}
/* Card edge as seen through the frame door: manual Fig. 3 order (LEDs top to bottom), switches beside them */
/* ---------- panel art (CorelDRAW → Inkscape SVG; LED windows, switch buttons and BNC centres measured on the converted art) ----------
   card edge: D6201A-card-edge.cdr / D6201B-card-edge.cdr (2007-12-19) → assets/d6201-edge-A.svg, d6201-edge-B.svg
   T6301A / T6401A: openGear Rear Module Guides/D6201A - rear module options.cdr and D6201B - … (2012-01-16) → assets/d6201-rear-A-*.svg, d6201-rear-B-*.svg
   T6201: D6201A/Functional/D6201B Rear Mod.cdr (2008-10-23) → assets/d6201-rear-T6201.svg (D6201A-T6201.cdr loses its BNC drawings in conversion) */
const FUNC = ENG+'D6201A/Functional/';
const GUIDE = '#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/';
const EDGE_ART = {
  A:{vb:'8 8 240 150', file:'D6201A-card-edge.cdr', led:{0:32.9,1:54.0,2:77.2,6:121.1,7:144.3}, x:125.35, sw:[[140.3,42.5,130.3,43.6]]},
  B:{vb:'8 2 240 212', file:'D6201B-card-edge.cdr', led:{0:16.9,1:38.0,2:61.2,3:89.1,4:110.3,5:133.5,6:177.3,7:200.5}, x:127.65, sw:[[142.6,26.5,132.6,27.6],[142.6,98.7,132.6,99.8]]},
};
const G6301 = {w:146,h:169,r:5.85,plate:[44,34,52,115], c:[[57.2,57.2],[76.1,57.2],[57.2,76.1],[76.1,76.1],[57.2,95.0],[76.1,95.0],[57.2,113.9],[76.1,113.9],[57.2,132.8],[76.1,132.8]]};
const G6401 = {w:146,h:169,r:5.85,plate:[45,34,52,115], c:[[58.0,57.2],[76.9,57.2],[58.0,76.1],[76.9,76.1],[58.0,95.0],[76.9,95.0],[58.0,113.9],[76.9,113.9],[58.0,132.8],[76.9,132.8]]};
const G6201 = {w:150,h:205,r:11,plate:[36,2,82,175], c:[[62.6,25.4],[97.1,25.4],[62.6,55.5],[97.1,55.5],[63.0,86.2],[97.5,86.2],[62.6,116.2],[97.1,116.2],[63.0,145.8],[97.4,145.8]]};
function rearArt(b, rear){
  if (rear==='T6201') return {...G6201, img:'d6201-rear-T6201.svg', src:FUNC+'D6201B Rear Mod.cdr', label:'D6201B Rear Mod.cdr', date:'2008|41'};
  const g = rear==='T6401'? G6401 : G6301;
  return {...g, img:`d6201-rear-${b}-${rear}.svg`, src:GUIDE+`D6201${b} - rear module options.cdr`, label:`D6201${b} - rear module options.cdr`, date:'2012|45'};
}
function artSrcLine(t){ const {w}=fState(t), b=w.build, R=rearArt(b,w.rear), E=EDGE_ART[b];
  return `Card edge: ${SIM.src(FUNC+E.file, E.file)} (CorelDRAW, 2007|40) · rear: ${SIM.src(R.src, R.label)} (CorelDRAW, ${R.date})`; }
function edgeSVG(t){
  const {s,w}=fState(t); const L=s.leds, b=w.build, E=EDGE_ART[b];
  const names = b==='A'? {0:'Lock',1:'No Lock',2:'EQ',6:'COM Activity',7:'Error'} : {0:'Lock 1',1:'No Lock 1',2:'EQ 1',3:'Lock 2',4:'No Lock 2',5:'EQ 2',6:'COM Activity',7:'Error'};
  let o=`<svg viewBox="${E.vb}" style="width:100%;max-width:300px;display:block;margin:auto;border-radius:6px" role="img" aria-label="D6201${b} card edge (CorelDRAW art)">
    <defs><filter id="d61glow2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <image href="${ASSET}d6201-edge-${b}.svg" width="245" height="220"/>`;
  Object.keys(E.led).forEach(bit=>{ const y=E.led[bit], on=(L>>bit)&1, col=LEDS.find(l=>l[3]===+bit)[4];
    o+=`<rect x="${E.x-2.85}" y="${y-6.3}" width="5.7" height="12.6" rx="1" fill="${on?col:'#2b2f2c'}" stroke="#555" stroke-width=".3" ${on?'filter="url(#d61glow2)"':''}><title>${names[bit]} LED (${on?'lit':'off'})</title></rect>`; });
  E.sw.forEach(([bx,by,cx,cy],k)=>{ const down=w.sw[k];
    o+=`<g class="d61-sw" data-k="${k}" style="cursor:pointer"><rect x="${bx-2.15+(down?-1.5:0)}" y="${by-6.3}" width="4.3" height="12.6" fill="${down?'#2b5f9e':'transparent'}" opacity=".7"/><rect x="${cx-8}" y="${cy-14}" width="26" height="28" fill="transparent"><title>EQ${b==='B'?k+1:''} switch (SW${k+1}) — click to press</title></rect></g>`; });
  return o+'</svg>';
}
function rearSVG(t){
  const {s,w,f}=fState(t); const R=REARS[w.rear], b=w.build, G=rearArt(b,w.rear), r=G.r;
  let o=`<svg viewBox="0 0 ${G.w} ${G.h}" role="img" aria-label="${R.name} (CorelDRAW art)" style="width:100%;max-width:340px;display:block;margin:auto;border-radius:6px">
    <image href="${ASSET}${G.img}" width="${G.w}" height="${G.h}"/>`;
  for (let pos=1; pos<=10; pos++){
    const [cx,cy]=G.c[pos-1];
    const n=cardBncAt(w,pos); const lab=posLabel(b, w.rear, pos);
    let state='', fill='#888', click='', tip=`${pos} · ${lab}`;
    if (!n){ tip+= R.dual? ' — the other card on this module' : ' — no card pin'; state=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#000" opacity=".13"/>`; }
    else if (BNC[n].role==='in1' || BNC[n].role==='in2'){ const k=BNC[n].role==='in1'?1:2; const inp=w['in'+k]; const used = k===1 || b==='B';
      click=`class="d61-jack" data-k="${k}"`; tip+=` — card ${BNC[n].net} (P1-${BNC[n].pin}) · ${inp.conn? 'cable '+inp.len+' m @ '+inp.fs/1000+' kHz — click to unplug':'click to plug in'}${used?'':' · D6201A: not used'}`;
      if (inp.conn) state=`<circle cx="${cx}" cy="${cy}" r="${r*0.75}" fill="#2b5f9e" opacity=".9"/><rect x="${cx-r*0.28}" y="${cy}" width="${r*0.56}" height="${r*1.2}" fill="#2b5f9e"/>`;
      fill = rxAt(k-1,t)? 'var(--accent)' : inp.conn? 'var(--bad)' : '#888'; }
    else { const e=bncOut(f,w,s.word,t,n); click=`class="d61-out" data-n="${n}"`; tip+=` — ${BNC[n].net} (P1-${BNC[n].pin}) ← ${BNC[n].r} 75 Ω ← ${BNC[n].drv} ← FPGA ${BNC[n].fpga}: ${encTxt(e)} — click for the scope`;
      fill = !e||e.k==='mute'? '#666' : e.k==='AES1'? 'var(--accent)' : e.k==='AES2'? 'var(--accent2)' : e.k==='SRC'? '#a05ad8' : '#e3b23a';
      if (D.ui.scopeOut===n) state=`<circle cx="${cx}" cy="${cy}" r="${r+1.5}" fill="none" stroke="var(--play)" stroke-width="${r/6}"/>`; }
    const col=(pos-1)%2;
    o+=`<g ${click} style="${click?'cursor:pointer':''}">${state}<circle cx="${col? cx-r*0.95 : cx+r*0.95}" cy="${cy-r*0.95}" r="${Math.max(1.5,r*0.24)}" fill="${fill}" stroke="#333" stroke-width="${r/30}"/><rect x="${cx-r-1}" y="${cy-r-1}" width="${2*r+2}" height="${2*r+2}" fill="transparent"><title>${esc(tip)}</title></rect></g>`;
  }
  return o+'</svg>';
}
function frameSVG(t){
  const {s,w}=fState(t); const R=REARS[w.rear];
  let o=`<svg viewBox="0 0 640 78" style="width:100%;display:block" role="img" aria-label="frame"><rect width="640" height="78" rx="6" fill="var(--dev)"/>`;
  for (let i=1;i<=20;i++){ const x=10+(i-1)*31; const me=i===w.slot; const span = R.slots===2? (R.dual? [w.slot%2===0? w.slot-1 : w.slot, w.slot%2===0? w.slot : w.slot+1] : [w.slot-1, w.slot]) : [w.slot];
    const isRear=span.includes(i);
    o+=`<g class="d61-slot" data-s="${i}" style="cursor:pointer"><rect x="${x}" y="8" width="27" height="44" rx="2" fill="${me?'#2f5d3a':'#202326'}" stroke="${isRear?'#e3a35a':'#3a3f44'}" stroke-width="${isRear?2:1}"/>
      ${me?`<rect x="${x+11}" y="12" width="5" height="36" fill="#1d6b35"/>${[0,1,2,3,4,5].map(k=>`<rect x="${x+7}" y="${14+k*5.5}" width="3" height="3" fill="${(s.leds>>k)&1? (k===1||k===4?'#ff4a3d':k===2||k===5?'#ffd23a':'#7dff6a'):'#2c332c'}"/>`).join('')}`:''}
      <text x="${x+13.5}" y="64" font-size="9" text-anchor="middle" fill="#9aa0a5">${i}</text><title>Slot ${i}${me?' — this card':''}${isRear?' — rear module '+R.name:''} · AN_SLOTID ${SLOT_R[i-1]} Ω → ADC ${slotAdc(i)} (click to move the card)</title></g>`; }
  o+=`<text x="630" y="74" font-size="8" text-anchor="end" fill="#9aa0a5">20-slot DFR-8320 frame, front view · orange = slots covered by the rear module</text></svg>`;
  return o;
}
/* DashBoard-style parameter window (generic layout, no third-party look) */
const DASH_CSS = `<style>
.d61-dash{border:1px solid var(--line);border-radius:6px;background:var(--panel2);font:12.5px var(--sans);overflow:hidden}
.d61-dtitle{display:flex;justify-content:space-between;gap:8px;padding:5px 8px;background:color-mix(in srgb,var(--accent2) 22%,var(--panel));border-bottom:1px solid var(--line);font-weight:600}
.d61-dwrap{display:grid;grid-template-columns:150px minmax(0,1fr);min-height:250px}
.d61-tree{border-right:1px solid var(--line);padding:6px;font-size:12px;background:var(--lane)}
.d61-tree .sel{background:color-mix(in srgb,var(--accent) 22%,transparent);border-radius:3px}
.d61-ptabs{display:flex;gap:3px;padding:5px 6px 0;flex-wrap:wrap}
.d61-ptabs button{font-size:11.5px;padding:3px 7px;border-radius:5px 5px 0 0}
.d61-pbody{padding:8px;border-top:1px solid var(--line)}
.d61-dt{border-collapse:collapse;width:100%}.d61-dt td{padding:4px 6px;border-bottom:1px dashed var(--grid);vertical-align:top}
.d61-dl{color:var(--ink2);width:40%}
.d61-dt input[readonly]{width:100%;background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:2px 5px;color:var(--ink);font:12px var(--mono)}
.d61-r{display:inline-block;margin-right:8px;white-space:nowrap}
.d61-dot{display:inline-block;width:11px;height:11px;border-radius:50%;vertical-align:-1px;margin-right:4px}
.d61-hdr td{background:var(--panel);font-weight:700}
.d61-note{margin-top:6px;font-size:11.5px;color:var(--ink2)}
.d61-pfoot{display:flex;flex-wrap:wrap;gap:5px;padding:6px;border-top:1px solid var(--line)}
.d61-pfoot button{font-size:11.5px;padding:3px 7px}
@media (max-width:700px){.d61-dwrap{grid-template-columns:1fr}.d61-tree{border-right:none;border-bottom:1px solid var(--line)}}
</style>`;
function dashHTML(t){
  const {s,w}=fState(t); const b=w.build, O=OIDS(b), c=cacheAt(t);
  const alive = s.mode==='app';
  const R=sim(); const seen = D.s0.f.mode==='app' || R.can.some(fr=>fr.dir==='tx' && fr.t<=t);
  const prod = c[0x0105]!=null? c[0x0105] : BRANDS[w.brand][b];
  const row=(lab,val)=>`<tr><td class="d61-dl">${lab}</td><td>${val}</td></tr>`;
  let body='';
  if (!w.mfc) body='<div class="d61-note">No frame controller.</div>';
  else if (!seen) body=`<div class="d61-note">Slot ${w.slot}: the card has not announced itself yet (boot, then TX_INITIALIZE = 1000 × slot ticks).</div>`;
  else if (D.ui.dashTab===0){
    const menu0 = w.brand==='WARD_BECK'? O.info : O.info.slice(0,4);
    body=`<table class="d61-dt">${menu0.map(([o,n])=>row(n, `<input readonly value="${esc(c[o]!=null?c[o]:'')}">`)).join('')}</table><div class="d61-note">Card Info = Menu0OID_Message (${menu0.length} OIDs for the ${w.brand} build${w.brand==='WARD_BECK'?'':'; only the Ward-Beck build lists the web site'}).</div>`;
  } else if (D.ui.dashTab===1){
    body=`<table class="d61-dt">${O.status.map(([o,n])=>{ const v=c[o]; const lv=valLevel(b,o,v); return row(n, `<span class="d61-dot" style="background:${lv==='ok'?'var(--accent)':lv==='err'?'var(--bad)':'var(--ink2)'}"></span>${esc(valText(b,o,v))} <span class="muted small mono">0x${hx(v||0,4)}</span>`); }).join('')}</table>
      <div class="d61-note">Shown values are the last REPORT_PARAM / GET_PARAM replies on the CAN lane, not the live card. ${b==='A'?'With “Notify on Card Fault” Disabled (the power-up default) Card Status stays OK even with no input.':''}</div>`;
  } else {
    const menu = b==='A'? O.menu1 : (s.dashEn? O.menu1 : O.menu3);
    body='<table class="d61-dt">'+menu.map(o=>{ const d=oidDef(b,o), v=c[o];
      if (d.w==='header') return `<tr class="d61-hdr"><td colspan="2">${esc(d.name)} <span class="muted small">(OID ${oidS(o)}, descriptor name “${d.descName}”)</span></td></tr>`;
      if (d.w==='button') return row(d.name, `<button data-set="${o}" data-v="0">Save</button>`);
      if (d.w==='num') return row(d.name, `<input readonly value="${v!=null?v:''}" style="width:80px"> <button data-get="${o}">Read</button>`);
      return row(d.name, d.ch.map(([cv,cn])=>`<label class="d61-r"><input type="radio" name="d61o${o}" data-set="${o}" data-v="${cv}" ${v===cv?'checked':''}> ${cn}</label>`).join(''));
    }).join('')+'</table>'+
    (b==='A'? '<div class="d61-note">Menu1OID count = 3: 4.0, 3.2, 3.5 (3.6 AD Result is listed after the count and never shown; there is no Save row).</div>' : (s.dashEn? '<div class="d61-note">Menu1OID (10 OIDs).</div>' : '<div class="d61-note" style="color:var(--warn)">DIP SW8 ON at boot → Menu3OID (no Save); every SET_PARAM reply echoes the current value.</div>'));
  }
  return `<div class="d61-dash">
   <div class="d61-dtitle"><span>Parameter editor — frame tree</span><span class="muted">generic DashBoard-style view</span></div>
   <div class="d61-dwrap"><div class="d61-tree"><div>▾ openGear frame</div><div style="padding-left:10px">▸ Frame controller</div>
      ${[w.slot-1, w.slot, w.slot+1].filter(i=>i>=1&&i<=20).map(i=>`<div style="padding-left:10px" class="${i===w.slot?'sel':''}">${i===w.slot? (seen? `● Slot ${i}: ${esc(prod)}` : `○ Slot ${i}`) : `○ Slot ${i}: (other)`}</div>`).join('')}</div>
    <div><div style="padding:6px 8px;border-bottom:1px solid var(--line)">Slot ${w.slot}: <b>${seen? esc(prod):'—'}</b> <span class="muted">${seen? esc(CARD_NAME[b]):''}</span>${alive?'':` <span style="color:var(--warn)">(${s.mode})</span>`}</div>
      <div class="d61-ptabs">${['Status ▸ Card Info','Status ▸ Card Status','Control ▸ Card Settings'].map((l,i)=>`<button data-dt="${i}" class="${D.ui.dashTab===i?'on':''}">${l}</button>`).join('')}</div>
      <div class="d61-pbody">${body}</div>
      <div class="d61-pfoot"><button data-da="open">Open / rescan</button><button data-da="refresh">Refresh status</button>
        <label class="small"><input type="checkbox" data-da="ds" ${w.dataSafe?'checked':''}> DataSafe</label></div></div></div></div>`;
}
function bindAll(root){
  root.querySelectorAll('.d61-sw').forEach(g=>g.onclick=()=>A.press(+g.dataset.k));
  root.querySelectorAll('.d61-dip').forEach(g=>g.onclick=()=>A.dip(+g.dataset.i));
  root.querySelectorAll('.d61-jp').forEach(g=>g.onclick=()=>A.jumper(g.dataset.h));
  root.querySelectorAll('.d61-jack').forEach(g=>g.onclick=()=>A.plug(+g.dataset.k));
  root.querySelectorAll('.d61-out').forEach(g=>g.onclick=()=>{ D.ui.scopeOut=+g.dataset.n; SIM.refresh(); });
  root.querySelectorAll('.d61-slot').forEach(g=>g.onclick=()=>{ const n=+g.dataset.s; if (n!==worldAt(SIM.t).slot) A.setSlot(n); });
  root.querySelectorAll('.d61-chip').forEach(g=>g.onclick=()=>{ D.ui.block=g.dataset.b; SIM.openTab('block'); });
  root.querySelectorAll('[data-dt]').forEach(x=>x.onclick=()=>{ D.ui.dashTab=+x.dataset.dt; SIM.refresh(); });
  root.querySelectorAll('[data-set]').forEach(x=>{ const ev = x.tagName==='BUTTON'? 'onclick' : 'onchange'; x[ev]=()=>A.dashSet(+x.dataset.set, +x.dataset.v); });
  root.querySelectorAll('[data-get]').forEach(x=>x.onclick=()=>A.dashSet(+x.dataset.get, 0));
  root.querySelectorAll('[data-da]').forEach(x=>{ const k=x.dataset.da; if (k==='ds') x.onchange=()=>A.dataSafe(x.checked); else x.onclick=()=>{ if (k==='open') A.dashOpen(); if (k==='refresh') A.dashRefresh(); }; });
}
function controlsHTML(){
  const w=worldAt(SIM.t), b=w.build;
  const opt=(v,cur,l)=>`<option value="${v}" ${String(v)===String(cur)?'selected':''}>${l}</option>`;
  const rates=[32000,44100,48000,88200,96000,176400,192000], lens=[2,30,150,400,600,800,1000,1200,1500];
  return `<div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center" class="small">
    <label>Build <select id="d61b">${opt('A',b,'D6201A firmware (V1.04)')}${opt('B',b,'D6201B firmware')}</select></label>
    ${b==='B'?`<label>Version <select id="d61fw">${Object.keys(BUILDS.B.fws).map(k=>opt(k,w.fw,'V'+BUILDS.B.fws[k].ver+(k==='v103'?' (not released)':''))).join('')}</select></label>`:''}
    <label>Brand define <select id="d61br">${Object.keys(BRANDS).map(k=>opt(k,w.brand,k)).join('')}</select></label>
    <label>Rear <select id="d61rear">${Object.keys(REARS).map(k=>opt(k,w.rear,REARS[k].name)).join('')}</select></label>
    <label>IN1 <select id="d61l1">${lens.map(v=>opt(v,w.in1.len,v+' m')).join('')}</select><select id="d61f1">${rates.map(r=>opt(r,w.in1.fs,r/1000+'k')).join('')}</select></label>
    ${b==='B'?`<label>IN2 <select id="d61l2">${lens.map(v=>opt(v,w.in2.len,v+' m')).join('')}</select><select id="d61f2">${rates.map(r=>opt(r,w.in2.fs,r/1000+'k')).join('')}</select></label>`:''}
    <label><input type="checkbox" id="d61r1" ${w.ref1.on?'checked':''}> REF1</label><select id="d61r1f">${rates.map(r=>opt(r,w.ref1.fs,r/1000+'k')).join('')}</select>
    <label><input type="checkbox" id="d61r2" ${w.ref2.on?'checked':''}> REF2</label><select id="d61r2f">${rates.map(r=>opt(r,w.ref2.fs,r/1000+'k')).join('')}</select>
    <button id="d61pw" title="P">Power-cycle</button><button id="d61nx" title="N: carry the state at 1.000 s into a new second">Next second ▶</button><button id="d61rs">Reset</button>
    <label title="After an action, move the playhead 2 ms past it"><input type="checkbox" id="d61fo" ${D.ui.autoFollow?'checked':''}> follow</label></div>`;
}
function bindControls(root){
  const q=s=>root.querySelector(s); if (!q('#d61b')) return;
  q('#d61b').onchange=e=>{ resetAll(e.target.value); SIM.seek(0); };
  if (q('#d61fw')) q('#d61fw').onchange=e=>{ resetAll('B', e.target.value); SIM.seek(0); };
  q('#d61br').onchange=e=>{ const w=D.s0.w; resetAll(w.build, w.fw, e.target.value); SIM.seek(0); };
  q('#d61rear').onchange=e=>A.setRear(e.target.value);
  q('#d61l1').onchange=e=>A.setLen(1,+e.target.value); q('#d61f1').onchange=e=>A.setFs(1,+e.target.value);
  if (q('#d61l2')){ q('#d61l2').onchange=e=>A.setLen(2,+e.target.value); q('#d61f2').onchange=e=>A.setFs(2,+e.target.value); }
  q('#d61r1').onchange=e=>A.frameRef(1,e.target.checked); q('#d61r2').onchange=e=>A.frameRef(2,e.target.checked);
  q('#d61r1f').onchange=e=>A.frameRef(1,true,+e.target.value); q('#d61r2f').onchange=e=>A.frameRef(2,true,+e.target.value);
  q('#d61pw').onclick=()=>A.power(); q('#d61nx').onclick=()=>{ rollSecond(); SIM.refresh(); }; q('#d61rs').onclick=()=>{ resetAll(); SIM.seek(0); };
  q('#d61fo').onchange=e=>{ D.ui.autoFollow=e.target.checked; };
}

/* =====================================================================
   TIMELINE LANES and the AES3 scope
   ===================================================================== */
function outRuns(){
  const R=sim(); if (R.outR) return R.outR;
  const times=new Set([0]); R.snaps.forEach(s=>times.add(s.t)); R.rxEv.forEach(L=>L.forEach(e=>{ if (e.t<1) times.add(e.t); }));
  R.worlds.forEach(x=>times.add(x.t));
  const ts=[...times].sort((a,c)=>a-c); const runs={1:[],2:[]}; const leds=[];
  ts.forEach(tt=>{ const {s,w,f}=fState(tt+1e-9); const en=encoders(f,w,s.word,tt+1e-9); const d=en.d;
    [1,2].forEach(g=>{ const e = (g===1? d.g1 : d.g2)? en.e2 : en.e1; const k=e.k+(e.fs?'@'+e.fs:''); const L=runs[g]; if (!L.length || L[L.length-1].k!==k){ if (L.length) L[L.length-1].t1=tt; L.push({t0:tt, t1:1, k, e, enc:(g===1?d.g1:d.g2)?2:1}); } });
  });
  R.outR=runs; return runs;
}
function ledRuns(bit){
  const R=sim(); const key='led'+bit; if (R[key]) return R[key];
  const out=[]; let cur=null;
  R.snaps.forEach(s=>{ const v=(s.leds>>bit)&1; if (!cur || cur.v!==v){ if (cur) cur.t1=s.t; cur={t0:s.t, t1:1, v}; out.push(cur); } });
  R[key]=out; return out;
}
const encCol = k => k==='AES1'? SIM.css('--accent') : k==='AES2'? SIM.css('--accent2') : k==='SRC'? '#a05ad8' : (k==='tone1'||k==='tone2')? '#d9a21b' : SIM.css('--grid');
function lanes(){
  const R=sim(), css=n=>SIM.css(n), b=D.s0.w.build, ls=[];
  const txt=(c,s,x,y,col)=>{ c.fillStyle=col||css('--ink'); c.font='11px '+css('--mono'); c.fillText(s,x,y); };
  const bar=(c,X,t0,t1,y,h,col,a)=>{ c.globalAlpha=a==null?.8:a; c.fillStyle=col; c.fillRect(X(t0), y, Math.max(1,X(t1)-X(t0)), h); c.globalAlpha=1; };
  const label=(c,X,t0,t1,y,h,s)=>{ const wpx=X(t1)-X(t0); if (wpx>60){ c.save(); c.beginPath(); c.rect(X(t0),y,wpx,h); c.clip(); txt(c,s,Math.max(X(t0),0)+4,y+h/2+4); c.restore(); } };
  ls.push({label:'Card: power-up · boot · main loop', h:26, draw(c,X,t0,t1,y,h){
    if (D.s0.f.mode==='app'){ const first=R.segs.length? R.segs[0].t0 : 1; bar(c,X,0,first,y+6,h-12,css('--accent'),.18); }
    R.segs.forEach(g=>{ bar(c,X,g.t0,g.t1,y+4,h-8, g.kind==='boot'? css('--warn') : css('--accent'), g.kind==='boot'?.45:.18); label(c,X,g.t0,g.t1,y,h,g.label); });
    if (D.s0.f.mode==='boot'){ bar(c,X,0,Math.min(1,D.s0.f.bootEnd),y+4,h-8,css('--warn'),.45); label(c,X,0,Math.min(1,D.s0.f.bootEnd),y,h,'(boot continues from the last second) '+D.s0.f.bootLabel); }
  }});
  ls.push({label:`Main-loop passes (≈${(passTime(b,0)*1e6).toFixed(0)} µs)`, h:30, draw(c,X,t0,t1,y,h){
    const P=R.passT, Dd=R.passD; if (!P.length) return;
    const pxPass=X(t0+Dd[0])-X(t0);
    if (pxPass<4){ let i=passAt(t0); if (i<0) i=0; let j=passAt(t1); bar(c,X,P[i],Math.min(t1,P[j]+Dd[j]),y+5,h-10,css('--accent'),.5); txt(c, `${(j-i+1).toLocaleString()} passes in view · ${P.length.toLocaleString()} this second`, X(Math.max(t0,P[i]))+6, y+h/2+4);
      R.eeEv.forEach(e=>{ bar(c,X,e.t,e.t+e.dur,y+3,h-6,css('--bad'),.8); }); return; }
    for (let i=Math.max(0,passAt(t0)); i<P.length && P[i]<=t1; i++){
      const st=steps(b, R.passM[i]); let tt=P[i]; const k=1/C.F_CPU/(1-ISR_LOAD);
      st.forEach((s,j)=>{ const d=s[2]*k; c.fillStyle= j===0||j===3? css('--accent2') : j===6? css('--warn') : css('--accent'); c.globalAlpha=j%2?.55:.85; c.fillRect(X(tt),y+4,Math.max(1,X(tt+d)-X(tt)-.5),h-8); c.globalAlpha=1;
        if (X(tt+d)-X(tt)>70){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(s[0].slice(0,24), X(tt)+2, y+h/2+3); } tt+=d; });
      if (Dd[i] > (tt-P[i])*1.01){ bar(c,X,tt,P[i]+Dd[i],y+4,h-8,css('--bad'),.75); if (X(P[i]+Dd[i])-X(tt)>80) txt(c,'EEPROM write (save_settings)',X(tt)+4,y+h/2+4,'#fff'); }
    }
  }});
  ls.push({label:'CS8416 bit-bang SPI (PORTC)', h:22, draw(c,X,t0,t1,y,h){
    const P=R.passT; if (!P.length) return; const k=1/C.F_CPU/(1-ISR_LOAD);
    if (X(t0+R.passD[0])-X(t0) < 4){ txt(c, `reg 0x0C read${b==='B'?' ×2':''} + reg 0x04 write every pass ≈ ${(P.length*(b==='B'?2:1)).toLocaleString()} reads/s`, X(t0)+6, y+h/2+4); return; }
    for (let i=Math.max(0,passAt(t0)); i<P.length && P[i]<=t1; i++){ const st=steps(b,R.passM[i]); let tt=P[i];
      st.forEach((s,j)=>{ const d=s[2]*k; if (j===0||j===3){ const nb = j===0? (b==='B'?8:4) : (s[2]>500?6:3); const bt=d/nb; for (let q=0;q<nb;q++){ c.fillStyle= j===0? css('--accent2') : css('--warn'); c.fillRect(X(tt+q*bt)+.5, y+5, Math.max(1,X(tt+(q+1)*bt)-X(tt+q*bt)-1), h-10); } if (X(tt+d)-X(tt)>110) txt(c, j===0? 'read 0x0C' : 'write 0x04', X(tt)+3, y+h-4, css('--ink')); } tt+=d; }); }
  }});
  ls.push({label:'FPGA shift_in: 16 bits + STROBE', h:24, draw(c,X,t0,t1,y,h){
    const P=R.passT; if (P.length && X(t0+R.passD[0])-X(t0) >= 4){ const k=1/C.F_CPU/(1-ISR_LOAD);
      for (let i=Math.max(0,passAt(t0)); i<P.length && P[i]<=t1; i++){ const st=steps(b,R.passM[i]); let tt=P[i]+st.slice(0,6).reduce((a,s)=>a+s[2],0)*k; bar(c,X,tt,tt+st[6][2]*k,y+6,h-12,css('--warn'),.7); } }
    let last=R.word0; R.spi.forEach(e=>{ if (e.t>=t0 && e.t<=t1){ c.fillStyle=css('--play'); c.fillRect(X(e.t)-1,y,3,h); txt(c,'0x'+hx(e.word,4),X(e.t)+4,y+11); } });
    if (!R.spi.some(e=>e.t>=t0&&e.t<=t1)){ const s=snapAt(t0); txt(c, `word 0x${hx(s.word,4)} rewritten every pass`, X(t0)+6, y+h/2+4, css('--ink2')); }
  }});
  ls.push({label:'timer0 1 ms (dashboard_initializing check each 1.001 s)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,C.T0,0.0004,15e-6,css('--ink2'),'timer0 ticks'); }});
  ls.push({label:'timer1 96 µs → CAN_TX_TIMER', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,C.T1,0.00002,8e-6,css('--ink2'),'timer1 ticks'); R.can.forEach(fr=>{ if (fr.dir==='tx' && (fr.hb || fr.type===0x11) && fr.t>=t0 && fr.t<=t1){ c.fillStyle=css('--play'); c.fillRect(X(fr.t)-1,y,3,h); } }); }});
  ls.push({label:'CAN 1 Mbit/s (▼ rx from frame controller, ▲ tx)', h:36, draw(c,X,t0,t1,y,h){
    let n=0; R.can.forEach(fr=>{ if (fr.t+fr.dur<t0||fr.t>t1) return; n++; const rx=fr.dir==='rx';
      c.fillStyle= rx? css('--accent2') : (fr.type===0x11? css('--warn') : css('--accent')); const x0=X(fr.t), x1=Math.max(x0+2, X(fr.t+fr.dur));
      c.fillRect(x0, rx? y+3 : y+h/2+1, x1-x0, h/2-4);
      if (x1-x0>90){ c.save(); c.beginPath(); c.rect(x0,y,x1-x0,h); c.clip(); txt(c, fr.label, x0+3, rx? y+h/2-4 : y+h-6, '#fff'); c.restore(); } });
    if (!n) txt(c,'bus idle in this window (next heartbeat every 10 002 ticks = 0.960 s)', X(t0)+6, y+h/2+4, css('--ink2'));
    else if (X(t1)-X(t0) > 0 && n>40) txt(c, n+' frames', X(t0)+4, y+11, css('--ink2'));
  }});
  const lockLane=(k,lab)=>({label:lab, h:24, draw(c,X,t0,t1,y,h){
    const L=R.rxEv[k]; let v=rxAt(k,0), tp=0; const seg=[]; L.forEach(e=>{ seg.push({t0:tp,t1:e.t,v}); tp=e.t; v=e.v; }); seg.push({t0:tp,t1:1,v});
    const w=worldAt((t0+t1)/2); const s=rxSignal(w,k,snapAt((t0+t1)/2)['sel'+k]); const fs=s.fs;
    seg.forEach(g=>{ if (g.t1<t0||g.t0>t1) return; bar(c,X,Math.max(g.t0,t0),Math.min(g.t1,t1),y+4,h-8, g.v? css('--accent') : css('--bad'), g.v? .25 : .3);
      if (g.v){ const pxF=X(t0+1/fs)-X(t0); if (pxF>2.2) SIM.pulses(c,X,Math.max(g.t0,t0),Math.min(g.t1,t1),y+2,h-4,1/fs,g.t0,0.3/fs,css('--accent'),'frames'); else if (X(t0+192/fs)-X(t0)>3) SIM.pulses(c,X,Math.max(g.t0,t0),Math.min(g.t1,t1),y+2,h-4,192/fs,g.t0,4/fs,css('--accent'),'192-frame blocks (Z preamble)'); } });
    txt(c, `${s.what} · ${fs/1000} kHz · ${s.ok? 'decodable' : 'not decodable'} · RXP${snapAt((t0+t1)/2)['sel'+k]}`, X(t0)+6, y+h/2+4);
  }});
  ls.push(lockLane(0,'AES IN1 → CS8416 #1 lock (U5)'));
  if (b==='B') ls.push(lockLane(1,'IN2 / REF → CS8416 #2 lock (U6)'));
  const outLane=(g,lab)=>({label:lab, h:24, draw(c,X,t0,t1,y,h){ const runs=outRuns()[g];
    runs.forEach(r=>{ if (r.t1<t0||r.t0>t1) return; bar(c,X,Math.max(r.t0,t0),Math.min(r.t1,t1),y+4,h-8,encCol(r.e.k), r.e.k==='mute'?.5:.55); label(c,X,Math.max(r.t0,t0),Math.min(r.t1,t1),y,h, `${r.enc===2?'AES2 encoder':'AES1 encoder'}: ${encTxt(r.e)}${r.e.why?' ('+r.e.why+')':''}`); }); }});
  ls.push(outLane(1,'OUT1/OUT2 pins → BNC 3, 5, 7, 9'));
  ls.push(outLane(2,'OUT3/OUT4 pins → BNC 4, 6, 8, 10'));
  ls.push({label:'LEDs (lock · no lock · EQ · COM)', h: b==='B'? 44 : 30, draw(c,X,t0,t1,y,h){
    const bits = b==='A'? [0,1,2,6] : [0,1,2,3,4,5,6]; const rh=(h-4)/bits.length;
    bits.forEach((bit,i)=>{ const col=LEDS.find(l=>l[3]===bit)[4].replace('var(--led-g)', css('--led-g')); ledRuns(bit).forEach(r=>{ if (r.v && r.t1>=t0 && r.t0<=t1) bar(c,X,Math.max(r.t0,t0),Math.min(r.t1,t1),y+2+i*rh,rh-1,col,.85); }); });
  }});
  ls.push({label:'EQ switch · pb · debounce (255 passes)', h:24, draw(c,X,t0,t1,y,h){
    // pressed intervals from the world history
    const ws=R.worlds; for (let i=0;i<ws.length;i++){ const on=ws[i].w.sw[0]||ws[i].w.sw[1]; const te = i+1<ws.length? ws[i+1].t : 1; if (on) bar(c,X,ws[i].t,te,y+2,h/2-3,css('--play'),.8); }
    let prev=null; const runs=[]; R.snaps.forEach(s=>{ const v= s.pbRel? 'deb' : s.pb? 'pb' : ''; if (!prev || prev.v!==v){ if (prev) prev.t1=s.t; prev={t0:s.t,t1:1,v}; runs.push(prev); } });
    runs.forEach(r=>{ if (!r.v || r.t1<t0 || r.t0>t1) return; bar(c,X,Math.max(r.t0,t0),Math.min(r.t1,t1),y+h/2+1,h/2-3, r.v==='pb'? css('--warn') : css('--accent2'), .7); label(c,X,Math.max(r.t0,t0),Math.min(r.t1,t1),y+h/2-2,h/2, r.v==='pb'? 'pb = YES (held)' : 'pb_release: counting to 255'); });
  }});
  if (b==='B') ls.push({label:'AD1895 RESET (q5 / dip6 net)', h:20, draw(c,X,t0,t1,y,h){ let prev=null; const runs=[]; R.snaps.forEach(s=>{ const v=(s.word>>5)&1; if (!prev||prev.v!==v){ if (prev) prev.t1=s.t; prev={t0:s.t,t1:1,v}; runs.push(prev); } });
    runs.forEach(r=>{ if (r.t1<t0||r.t0>t1) return; bar(c,X,Math.max(r.t0,t0),Math.min(r.t1,t1),y+4,h-8, r.v? css('--accent') : css('--bad'), .45); label(c,X,Math.max(r.t0,t0),Math.min(r.t1,t1),y,h, r.v? 'running' : 'held in reset'); }); }});
  return ls;
}
/* ---------- AES3 sub-frame at bit level (biphase-mark), for the chosen output or input ---------- */
const TONE = [0x01ABB5,0x035019,0x04E5FA,0x066666,0x07CACA,0x090D0C,0x0A27A9,0x0B15CB,0x0BD35E,0x0C5D25,0x0CB0C4,0x0CCCCD,0x0CB0C4,0x0C5D25,0x0BD35E,0x0B15CB,0x0A27A9,0x090D0C,0x07CACA,0x066666,0x04E5FA,0x035019,0x01ABB5,0];
function toneSample(n){ const i=n%48; const v = i<24? TONE[i] : -TONE[i-24]; return v; }   // tone_gen1.vhd: 48 steps, second half negative (sd24…sd47)
function progSample(ch, tt, which){ const f = which===2? (ch?660:440) : (ch?1500:997), a = which===2? 0.125 : 0.25; return Math.round(Math.sin(2*Math.PI*f*tt)*a*8388607); } // programme (illustrative)
function sampleOf(e, ch, n, fs){
  if (!e || e.k==='mute') return null; const tt=n/fs;
  if (e.k==='tone1'||e.k==='tone2') return toneSample(n);
  if (e.k==='SRC') return progSample(ch, tt, 1);
  return progSample(ch, tt, e.k==='AES2'?2:1);
}
function subframeCells(pre, s24, v,u,cbit, startLvl){
  const bits=[]; for (let i=0;i<24;i++) bits.push((s24>>i)&1); bits.push(v,u,cbit); let par=0; bits.forEach(x=>par^=x); bits.push(par);
  const P={X:[1,1,1,0,0,0,1,0], Y:[1,1,1,0,0,1,0,0], Z:[1,1,1,0,1,0,0,0]}[pre];
  let lvl=startLvl; const cells=[]; P.forEach(p=>cells.push(startLvl? 1-p : p)); lvl=cells[cells.length-1];
  bits.forEach(x=>{ lvl=1-lvl; cells.push(lvl); if (x) lvl=1-lvl; cells.push(lvl); });
  return {cells, end:lvl, bits};
}
function drawScope(cv, t){
  const {s,w,f}=fState(t); const n=D.ui.scopeOut;
  let e, fs, title;
  if (n===1||n===2){ const k=n-1; const sg=rxSignal(w,k,f.rx[k].sel); e = sg.present? {k: k? 'AES2':'AES1', fs:sg.fs} : null; fs=sg.fs; title=`Input ${n} at the CS8416 (${sg.what}, ${sg.len} m: ${sg.loss.toFixed(1)} dB loss${f.rx[k].sel?' − EQ '+sg.boost.toFixed(1)+' dB':''})`; }
  else { e=bncOut(f,w,s.word,t,n); fs = e && e.fs || 48000; title=`BNC${n} (${posLabel(w.build,w.rear,rearPosOfBnc(w,n)||0)||'not on this rear'}) ← ${BNC[n].drv} ← FPGA ${BNC[n].fpga}: ${encTxt(e)}`; }
  const {c,w:W,h:H}=SIM.canvas(cv, 210);
  c.fillStyle=SIM.css('--lane'); c.fillRect(0,0,W,H);
  c.fillStyle=SIM.css('--ink'); c.font='12px '+SIM.css('--sans'); c.fillText(title, 8, 16);
  if (!e || e.k==='mute'){ c.strokeStyle=SIM.css('--ink2'); c.beginPath(); c.moveTo(10,120); c.lineTo(W-10,120); c.stroke(); c.fillText(e? 'Encoder off (q15/q14 NOT-lock mute): no transitions on the line '+'(behaviour of “off” inferred from the i2s8416_aes port comment)' : 'Nothing connected', 10, 100); return; }
  const nF=Math.floor(t*fs); const z = (nF%192)===0;
  const sA=sampleOf(e,0,nF,fs), sB=sampleOf(e,1,nF,fs);
  const A1=subframeCells(z?'Z':'X', sA&0xFFFFFF, 0,0,0, 0), B1=subframeCells('Y', sB&0xFFFFFF, 0,0,0, A1.end);
  const cells=A1.cells.concat(B1.cells); const cw=(W-20)/cells.length; const y0=60, amp=34;
  const lossAtt = (n===1||n===2)? Math.min(0.85, rxSignal(w,n-1,f.rx[n-1].sel).resid/24) : 0;
  c.strokeStyle=SIM.css('--accent2'); c.lineWidth=2; c.beginPath();
  let prev=cells[0]? 1:-1; let yv=prev*amp*(1-lossAtt);
  cells.forEach((v,i)=>{ const tgt=(v?1:-1)*amp; const x=10+i*cw; if (lossAtt>0){ yv = yv + (tgt*(1-lossAtt) - yv)*(1-lossAtt*0.9); c.lineTo(x, y0+70-yv); c.lineTo(x+cw, y0+70-yv); } else { c.lineTo(x, y0+70-tgt); c.lineTo(x+cw, y0+70-tgt); } });
  c.stroke(); c.lineWidth=1;
  const fld=[[0,8,'preamble '+(z?'Z':'X')],[8,16,'aux 0–3'],[16,48,'audio 4–23'],[48,50,'V'],[50,52,'U'],[52,54,'C'],[54,56,'P'],[64,72,'preamble Y'],[72,80,'aux'],[80,112,'audio'],[112,114,'V'],[114,116,'U'],[116,118,'C'],[118,120,'P']];
  c.font='10px '+SIM.css('--sans'); fld.forEach(([a,b2,l])=>{ c.fillStyle=SIM.css('--ink2'); c.fillRect(10+a*cw, 158, 1, 8); if ((b2-a)*cw>44) c.fillText(l, 12+a*cw, 176); });
  c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono');
  c.fillText(`frame ${nF % 192}/192 of block · ${fs/1000} kHz · frame ${(1e6/fs).toFixed(2)} µs · bit cell ${(1e9/(128*fs)).toFixed(0)} ns · A = ${sA} (0x${hx(sA&0xFFFFFF,6)}) · B = ${sB}`, 10, 198);
}

/* =====================================================================
   VIEWS
   ===================================================================== */
function traceHTML(t){
  const R=sim(); const acts=D.acts.filter(a=>a.t<=t+1e-9).sort((a,c)=>c.t-a.t); const a = acts[0] || D.ui.lastAct;
  if (!a){ if (R.bootTr && R.bootTr.length) return `<div><b>main() reached the loop</b></div>`+R.bootTr.map(s=>`<div>→ ${esc(s)}</div>`).join('');
    return '<div class="muted">Click the card (EQ switches, DIP, jumpers), the rear module jacks, a frame slot, or a DashBoard control. Each step the firmware takes is listed here with the names from the source. Keys: E EQ1 · Q EQ2 · I / J plug IN1 / IN2 · D refresh · P power-cycle · N next second.</div>'; }
  let h=`<div><b>${esc(a.name)}</b> <span class="muted">at ${SIM.fmtT(a.t)} (second ${D.second})</span></div>`+(R.tr[a.id]||[]).map(s=>`<div>→ ${esc(s)}</div>`).join('');
  if (R.bootTr && R.bootTr.length && R.segs.some(g=>g.kind==='app' && g.t0<=t)) h+='<div class="muted" style="margin-top:4px">boot finished: '+R.bootTr.map(esc).join(' · ')+'</div>';
  return h;
}
function inspHTML(t){
  const R=sim(); const {s,w,f}=fState(t); const b=w.build; const O=OIDS(b);
  const pi=passAt(t); const d=fpgaDecode(s.word); let stepTxt='—';
  if (pi>=0 && s.mode==='app'){ const st=steps(b,R.passM[pi]); let tt=R.passT[pi]; const k=1/C.F_CPU/(1-ISR_LOAD); let hit=false; for (const x of st){ const dd=x[2]*k; if (t<tt+dd){ stepTxt=`${x[0]} — ${x[1]}`; hit=true; break; } tt+=dd; } if (!hit) stepTxt='EEPROM write / end of pass'; }
  const nextHb = R.can.find(fr=>fr.dir==='tx' && (fr.hb||fr.type===0x11) && fr.t>t);
  const outs=[3,5,7,9,4,6,8,10].map(n=>{ const e=bncOut(f,w,s.word,t,n); const pos=rearPosOfBnc(w,n); return `<tr><td class="mono">BNC${n}</td><td>${pos? esc(posLabel(b,w.rear,pos)) : '<span class="muted">no jack</span>'}</td><td>${esc(encTxt(e))}</td></tr>`; }).join('');
  return `<table class="kv">
    <tr><th>card</th><td>${s.mode}${s.mode==='boot'?': '+esc(s.boot):''} · slot ${s.slot} (ADC ${s.ad}) · mod_address 0x${hx(s.slot+0x10)}</td></tr>
    <tr><th>pass</th><td>${pi>=0? '#'+(pi+1)+' of '+R.passT.length : '—'} · <span class="mono">${esc(stepTxt)}</span></td></tr>
    <tr><th>CS8416</th><td>#1 reg 0x04 = 0x${s.sel0?'89':'80'} (RXP${s.sel0}) · lock ${rxAt(0,t)?'yes':'no'}${b==='B'?` · #2 reg 0x04 = 0x${s.sel1?'89':'80'} · lock ${rxAt(1,t)?'yes':'no'}`:''}</td></tr>
    <tr><th>firmware vars</th><td class="mono small">aes1_lock ${s.aes1}${b==='B'?' aes2_lock '+s.aes2:''} · eq1 ${s.eq1}${b==='B'?' eq2 '+s.eq2+' · mode '+MODES[s.opmode]+' · tone1 '+s.tone1+' tone2 '+s.tone2:' · tone_generation '+s.tone} · smpte_alarm ${s.alarm} · pb ${s.pb}/${s.pbRel} cnt ${s.pbCnt}</td></tr>
    <tr><th>FPGA word</th><td class="mono">0x${hx(s.word,4)} = ${bin(s.word>>8)} ${bin(s.word&0xFF)} · OUT1/2 ← ${d.g1?'AES2':'AES1'} enc · OUT3/4 ← ${d.g2?'AES2':'AES1'} enc${b==='B'?` · AD1895 ${d.srcRun?'run':'reset'}`:''}</td></tr>
    <tr><th>CAN</th><td>parameter_refresh = ${O.refresh[s.pRef]||s.pRef}${s.pChg?' (change pending)':' (spinning each pass)'} · ${s.dinit?'dashboard_initializing: TX every '+(s.slot*96)+' ms':'heartbeat every 0.960 s'} · next ${nextHb? SIM.fmtT(nextHb.t) : 'after 1 s'}</td></tr>
    <tr><th>EEPROM</th><td class="mono small">[10] ${hx(s.ee[10])} [11] ${hx(s.ee[11])} [13] ${hx(s.ee[13])} [14] ${hx(s.ee[14])}</td></tr></table>
    <table class="kv" style="margin-top:6px"><tr><th>card pin</th><th>rear jack</th><th>carries</th></tr>${outs}</table>`;
}
function viewSim(m){
  window.__d6201Active=true;
  m.innerHTML = DASH_CSS + `
   <div class="card"><h2 id="d61h">D6201 ISS5 card</h2><div id="d61card"></div>
     <div class="small muted" style="margin-top:4px">Card = D6201A ISS5 top side from the gerbers (TOP + TSM + DRL + TSS, 120 dpi; green mask from the production photo). It is the same board for both builds. Click SW1/SW2, the DIP switch SW3, jumpers H1–H4, or a chip label (opens the block diagram).</div></div>
   <div class="grid2">
     <div class="card"><h2>Frame, rear module and card edge</h2><div id="d61frame"></div>
       <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;margin-top:8px"><div id="d61rear"></div><div id="d61edge"></div></div><div class="small muted" id="d61art"></div>
       <p class="small muted">Rear jacks: click an input to plug/unplug; click an output to put it on the scope (One second tab). Dot colour: green AES1 · blue AES2 · purple SRC · amber tone · grey muted.</p></div>
     <div class="card"><h2>DashBoard</h2><div id="d61dash"></div></div></div>
   <div class="card"><h2>World and build</h2><div id="d61ctl"></div></div>
   <div class="grid2"><div class="card"><h2>Firmware trace</h2><div class="log" id="d61tr"></div></div><div class="card"><h2>At the playhead</h2><div id="d61insp"></div></div></div>
   <div class="card"><h2>Timeline (zoom with the transport; full lane set on the One second tab)</h2><canvas id="d61tl"></canvas></div>`;
  let ctlKey='';
  const q=s=>m.querySelector(s);
  SIM.on('time', ()=>{
    const t=SIM.t, w=worldAt(t), b=w.build;
    q('#d61h').innerHTML = `D6201 ISS5 card running the <span style="color:var(--accent)">${BUILDS[b].label}</span> build (V${BUILDS[b].fws[w.fw].ver}, ${w.brand}) — second ${D.second}`;
    q('#d61card').innerHTML=cardSVG(t); q('#d61frame').innerHTML=frameSVG(t); q('#d61rear').innerHTML=rearSVG(t); q('#d61edge').innerHTML=edgeSVG(t); q('#d61art').innerHTML=artSrcLine(t); q('#d61dash').innerHTML=dashHTML(t);
    const key=JSON.stringify(w)+D.ver; if (key!==ctlKey){ ctlKey=key; q('#d61ctl').innerHTML=controlsHTML(); bindControls(q('#d61ctl')); }
    q('#d61tr').innerHTML=traceHTML(t); q('#d61insp').innerHTML=inspHTML(t);
    bindAll(m);
    const ls=lanes(); SIM.drawLanes(q('#d61tl'), [ls[0],ls[1],ls[6],ls[7],ls[b==='B'?9:8],ls[b==='B'?10:9]], {labelW:190});
  });
}
/* ---------------- tutorial ---------------- */
function endS(){ const R=sim(); return {f:R.end.f, w:R.end.w, R}; }
const LESSONS = [
  {t:'Meet the D6201', b:()=>`<p>The D6201 folder is the engineering parent of two products: the <b>D6201A</b> (one AES input, eight outputs) and the <b>D6201B</b> (two inputs: 1×8, dual 1×4, or 1×8 through a sample-rate converter). Both are the <b>same ISS5 board</b>; the firmware decides which product it is. The A build is loaded now.</p><p>The card has no front panel. You read eight LEDs on the card edge and control it from DashBoard on a PC, through the frame controller and the CAN bus.</p><p>Each lesson below checks the simulator live. Click <b>Next</b>.</p>`, ok:()=>true, auto:true},
  {t:'1 · Choose the slot', b:()=>`<p>A T6301A rear module is two slots wide, so the manuals say to use the <b>even</b> slots (2, 4 … 20).</p><p>Click <b>slot 6</b> in the frame on the Simulator tab. The card is pulled and re-inserted: it reboots and averages the slot-ID voltage 100 times (${(C.ADC_N*ADC_SAMPLE*1000).toFixed(0)} ms) before the main loop starts. If the boot runs past 1.000 s, press <b>Next second</b>.</p>`, ok:()=>{ const e=endS(); return e.w.slot===6 && e.f.mode==='app'; }, hint:'Simulator tab → frame drawing → slot 6, then Next second if it is still booting.'},
  {t:'2 · Connect the input', b:()=>`<p>Make sure an AES3 source is plugged into position 1 (<b>IN</b>) of the rear module. The green Lock LED lights and the red No Lock LED goes out on the next main-loop pass after the CS8416 PLL locks.</p>`, ok:()=>{ const e=endS(); return e.w.in1.conn && e.f.aes1===1; }, hint:'Click BNC 1 on the rear module (or press I).'},
  {t:'3 · A long cable', b:()=>`<p>Set the IN1 cable to <b>800 m</b>. The manual says the card recovers AES over 600 m (2000 ft) of 75 Ω coax without equalisation. Past that the receiver cannot lock: No Lock lights and the FPGA mutes the outputs (q15 = NOT aes1_lock).</p>`, ok:()=>{ const e=endS(); return e.w.in1.len>=800 && e.f.aes1===0 && e.w.in1.conn; }, hint:'World and build → IN1 → 800 m.'},
  {t:'4 · Insert the equaliser', b:()=>`<p>Press <b>SW1</b> (EQ) on the card. On the next pass the firmware toggles eq1_active and writes CS8416 register 0x04 = 0x89: the receiver now listens on RXP1, the output of the inverting EQ stage U1B (R2/R4 with R6–C4 and R12–C7). The yellow EQ LED lights and the input locks again.</p><p>Watch the Firmware trace. The manual warns that switching EQ “can cause audible artefacts”: the receiver re-locks when RXSEL changes.</p>`, ok:()=>{ const e=endS(); return e.f.eq1===1 && e.f.aes1===1; }, hint:'Click SW1 on the card (the left switch), or press E.'},
  {t:'5 · Ask DashBoard', b:()=>`<p>Open <b>Card Status</b> in the DashBoard window and press <b>Refresh status</b>. The card answers GET_PARAM straight from its CAN interrupt. Without a refresh, a change only reaches DashBoard on the next heartbeat (every 10 002 timer1 ticks = 0.960 s), and the heartbeat reports a different OID each time.</p>`, ok:()=>sim().can.some(fr=>fr.dir==='rx' && fr.type===0x49), hint:'DashBoard → Refresh status.'},
  {t:'6 · Card-fault notification', b:()=>`<p>On <b>Card Settings</b>, set <b>Notify on Card Fault = Enabled</b>, then unplug IN1. Card Status changes to “No AES Audio Lock”. This setting starts Disabled at every power-up and is never saved, so a fresh card says OK even with nothing connected.</p>`, ok:()=>{ const e=endS(); return e.f.alarm===1 && !e.w.in1.conn; }, hint:'DashBoard → Card Settings → Notify on Card Fault → Enabled; then click BNC 1.'},
  {t:'7 · A tone that is not there (A build)', b:()=>`<p>Still on the A build, set <b>Tone Generator = Enabled</b> in Card Settings, and plug IN1 back in. DashBoard shows the tone as enabled, but ALTERA_write() in D6201A.c has the tone branch commented out, so the outputs still carry the input. Check the output lanes or click an output jack.</p>`, ok:()=>{ const e=endS(); return e.w.build==='A' && e.f.tone===1 && e.w.in1.conn; }, hint:'DashBoard → Card Settings → Tone Generator → Enabled; then click BNC 1.'},
  {t:'8 · Load the B build', b:()=>`<p>Switch <b>Build</b> to <b>D6201B firmware</b> (World and build). This is the same board with <span class="mono">#define AES2_AVAILABLE</span>. The second receiver, the second EQ switch and the six-LED front edge now work.</p>`, ok:()=>D.s0.w.build==='B', hint:'World and build → Build → D6201B firmware.'},
  {t:'9 · Dual 1×4', b:()=>`<p>In DashBoard set <b>Mode = 2x4</b>, and make sure IN2 is plugged in. ALTERA_write sets bit 1 of the control word: the FPGA mux inst21 sends the AES2 encoder to OUT3/OUT4, which drive the right-hand column (OUT2-1…4).</p>`, ok:()=>{ const e=endS(); return e.w.build==='B' && e.f.opmode===1 && e.f.aes2===1; }, hint:'DashBoard → Card Settings → Mode → 2x4; click BNC 2 if IN2 is unplugged.'},
  {t:'10 · Sample-rate conversion', b:()=>`<p>Set IN1 to <b>44.1k</b>, move jumper <b>H3</b> to REF (frame reference REF1 at 48k through H4 and Q2), and set <b>Mode = 1x8 w/ SRC</b>. Once CS8416 #2 locks to the reference, the FPGA routes the AD1895 output into the AES2 encoder and all eight outputs carry AES1 audio at 48 kHz.</p>`, ok:()=>{ const e=endS(); const d=fpgaDecode(e.f.word); return e.w.build==='B' && e.f.opmode===2 && e.w.H3==='ref' && d.srcSel && d.g1 && d.g2; }, hint:'IN1 → 44.1k; click H3 on the card (right end, near T2); DashBoard → Mode → 1x8 w/ SRC.'},
  {t:'11 · What survives a power cycle', b:()=>`<p>Press <b>Save</b> in Card Settings, turn DIP <b>SW3-7 ON</b> (“get parameters from non-volatile memory”) and <b>Power-cycle</b>. The B restores mode and tones from EEPROM bytes 11, 13 and 14. EQ and Notify on Card Fault are not in the save list, so they come back off.</p>`, ok:()=>{ const e=endS(); return e.w.build==='B' && e.f.ee[10]===0xAA && e.w.dip[6] && (sim().segs.some(g=>g.kind==='boot') || D.second>1); }, hint:'Save, click DIP position 7, press Power-cycle (Next second if needed).'},
  {t:'Done', b:()=>`<p>That covers what an operator can do with either build. The <b>One second</b> tab shows the main loop, the bit-banged SPI, the CAN heartbeat and the AES3 bits. <b>Software</b> explains the code paths and <b>Findings</b> lists what the firmware does that the manuals do not say.</p>`, ok:()=>true, auto:true},
];
function viewTutorial(m){
  window.__d6201Active=true;
  m.innerHTML = DASH_CSS + `<div class="grid2"><div class="card"><h2>Operator tutorial (from the D6201A / D6201B manuals)</h2><div id="d61les"></div></div>
     <div class="card"><h2>The card</h2><div id="d61tc"></div><div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;margin-top:8px"><div id="d61tr2"></div><div id="d61te"></div></div><div id="d61tf" style="margin-top:8px"></div></div></div>
   <div class="card"><h2>DashBoard</h2><div id="d61td"></div></div><div class="card"><h2>World and build</h2><div id="d61tctl"></div></div>`;
  const q=s=>m.querySelector(s); let ck='';
  SIM.on('time', ()=>{
    const t=SIM.t; const i=Math.min(D.ui.lesson||0, LESSONS.length-1), L=LESSONS[i]; let ok=false; try{ ok=L.ok(); }catch(e){}
    q('#d61les').innerHTML = `<div class="small muted">Lesson ${i+1} of ${LESSONS.length}</div><h3>${L.t}</h3>${L.b()}
      <p>${L.auto? '' : ok? '<b style="color:var(--accent)">✓ Done — goal met.</b>' : `<span class="muted">Goal not met yet.</span> <span class="small">Hint: ${L.hint}</span>`}</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button id="d61pv" ${i?'':'disabled'}>◀ Back</button><button id="d61nx2" class="${ok?'on':''}">${i===LESSONS.length-1?'Restart':'Next ▶'}</button></div>
      <ol class="small" style="margin-top:10px">${LESSONS.map((x,j)=>`<li style="${j===i?'font-weight:700':''}">${x.t.replace(/^\d+ · /,'')}</li>`).join('')}</ol>`;
    q('#d61pv').onclick=()=>{ D.ui.lesson=Math.max(0,i-1); SIM.refresh(); };
    q('#d61nx2').onclick=()=>{ if (i===LESSONS.length-1){ D.ui.lesson=0; resetAll('A'); SIM.seek(0); return; } D.ui.lesson=i+1; SIM.refresh(); };
    q('#d61tc').innerHTML=cardSVG(t,{labels:false}); q('#d61tr2').innerHTML=rearSVG(t); q('#d61te').innerHTML=edgeSVG(t); q('#d61tf').innerHTML=frameSVG(t); q('#d61td').innerHTML=dashHTML(t);
    const w=worldAt(t); const key=JSON.stringify(w)+D.ver; if (key!==ck){ ck=key; q('#d61tctl').innerHTML=controlsHTML(); bindControls(q('#d61tctl')); }
    bindAll(m);
  });
}
/* ---------------- one second ---------------- */
function viewSecond(m){
  window.__d6201Active=true;
  const b=D.s0.w.build;
  m.innerHTML = `<div class="card"><h2>One second of the ${BUILDS[b].label}, as the firmware and the coax see it</h2><canvas id="d61L"></canvas>
    <p class="small muted">Zoom (transport) from 1 s down to one AES frame. The main loop is not paced by a timer: it runs as fast as its bit-banged SPI allows (${(passTime(b,0)*1e6).toFixed(0)} µs per pass for this build, counted from the .lis files ${infT('the instruction count of the non-loop code and the ISR overhead')}). Interrupts: timer0 every 1 ms, timer1 every 96 µs, CAN on every received frame.</p></div>
    <div class="grid2"><div class="card"><h2>AES3 on the wire at the playhead</h2><div class="small" style="margin-bottom:6px">Show: <select id="d61so">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<option value="${n}" ${D.ui.scopeOut===n?'selected':''}>${n<=2?'IN'+n+' (at the receiver)':'BNC'+n+' output'}</option>`).join('')}</select></div><canvas id="d61sc"></canvas>
      <p class="small muted">Biphase-mark: every bit cell starts with a transition, a “1” adds one in the middle. The preamble breaks that rule so the receiver can find frame starts (Z marks frame 0 of each 192-frame channel-status block). Programme audio (997 Hz / 1.5 kHz on AES1, 440 / 660 Hz on AES2) is illustrative; the tone is the real tone_gen1.vhd table (48 steps, peak 0x0CCCCD = −20 dBFS).</p></div>
      <div class="card"><h2>Time scales in this card</h2><div id="d61ts"></div></div></div>
    <div class="card"><h2>This second in numbers</h2><div id="d61num"></div></div>`;
  const q=s=>m.querySelector(s);
  q('#d61so').onchange=e=>{ D.ui.scopeOut=+e.target.value; SIM.refresh(); };
  SIM.on('time', ()=>{
    SIM.drawLanes(q('#d61L'), lanes(), {labelW:210}); drawScope(q('#d61sc'), SIM.t);
    const R=sim(), b=D.s0.w.build, w=worldAt(SIM.t);
    const rows=[['1 s','the simulated second',1],['0.960 s','CAN heartbeat: 10 002 timer1 ticks (TX_HEARTBEAT + 2)',0.960192],[`${(bootLen(b)*1000).toFixed(0)} ms`,'boot from reset to the main loop ('+BUILDS[b].label+')',bootLen(b)],[`${(C.ADC_N*ADC_SAMPLE*1000).toFixed(0)} ms`,`slot-ID averaging: 100 × (2 × wait(3000) + 104 µs)${b==='B'?' — done twice on the B':''}`,C.ADC_N*ADC_SAMPLE],
      ['96 ms','timer1 first overflow (TCNT1 = 0xD120)',0.096],[`${(C.DEBOUNCE*passTime(b,0)*1000).toFixed(0)} ms`,'EQ debounce: 255 passes after release',C.DEBOUNCE*passTime(b,0)],[`${(192/w.in1.fs*1000).toFixed(2)} ms`,'one AES block (192 frames) at the IN1 rate',192/w.in1.fs],
      ['3.3 ms','one EEPROM byte write '+'(datasheet, inferred)',C.EE_BYTE],['2.625 ms','wait(3000): 3000 × 7 cycles',C.WAIT],['1 ms','timer0 tick',1e-3],[`${(passTime(b,0)*1e6).toFixed(0)} µs`,'one main-loop pass',passTime(b,0)],
      ['≈ 140 µs','one 8-byte CAN frame at 1 Mbit/s with stuffing',frameDur(8)],['96 µs','timer1 tick; one frame of a multi-frame reply',C.T1],[`${(1e6/w.in1.fs).toFixed(1)} µs`,'one AES frame (two sub-frames)',1/w.in1.fs],
      ['1.75 µs','one bit-banged SPI bit to the CS8416 or FPGA (14 cycles)',C.BIT_CYC/C.F_CPU],[`${(1e9/(128*w.in1.fs)).toFixed(0)} ns`,'one AES3 bit cell (biphase half-bit)',1/(128*w.in1.fs)],['125 ns','one AT90CAN128 cycle / one CAN time quantum',1/C.F_CPU],['40.7 ns','one 24.576 MHz SRC master-clock period (X2)',1/24.576e6]];
    q('#d61ts').innerHTML=`<table class="kv">${rows.map(r=>`<tr><td class="mono">${r[0]}</td><td>${r[1]}</td><td style="width:90px"><div style="height:7px;border-radius:3px;background:var(--accent);width:${Math.max(2,(Math.log10(r[2])+8)/8*90)}px"></div></td></tr>`).join('')}</table>`;
    const tx=R.can.filter(c=>c.dir==='tx').length, rx=R.can.filter(c=>c.dir==='rx').length, busy=R.can.reduce((a,c)=>a+c.dur,0);
    q('#d61num').innerHTML=`<table class="kv"><tr><th>main-loop passes</th><td>${R.passT.length.toLocaleString()}</td><th>CS8416 register reads</th><td>${(R.passT.length*(b==='B'?2:1)).toLocaleString()} (reg 0x0C) and as many writes of reg 0x04</td></tr>
      <tr><th>FPGA control words shifted</th><td>${R.passT.length.toLocaleString()} (${R.spi.length} with a new value)</td><th>CAN frames</th><td>${tx} sent, ${rx} received · bus ${(busy*100).toFixed(2)} % busy</td></tr>
      <tr><th>timer1 interrupts</th><td>10 417 (${(ISR_LOAD*100).toFixed(1)} % of the CPU with timer0, ${infT('ISR instruction count')})</td><th>AES frames on IN1</th><td>${w.in1.fs.toLocaleString()} (${(w.in1.fs/192).toFixed(1)} blocks)</td></tr></table>`;
  });
}
/* ---------------- block diagram ---------------- */
const BLOCKS = {
  rear:{x:10,y:20,w:150,h:120,t:'Rear module',s:['T6301A / T6401A / T6201A','BNC1 IN1 · BNC2 IN2','BNC3–10 outputs','ID: AN_BMID / AN_BMID2'],d:'Passive. Each jack reaches one card pin on P1 (MEDAC100): IN1 P1-97, IN2 P1-92, outputs P1-75/80/37/34/17/22/5/12. The ID resistors (3K57 + 30K9 / 5K36 / 1K13) reach PF1/PF2 through 1K pull-ups, but the firmware only converts ADC0 (AN_SLOTID).'},
  fe1:{x:200,y:20,w:170,h:90,t:'IN1 front end',s:['C1 · T1 PE-65612','H1 75 / 110 Ω','U1A ×2 → RXP0 (flat)','U1B EQ → RXP1'],d:'AC-coupled transformer input, jumper-selected termination, U1A non-inverting gain 2 (R3/R1 750 Ω) with 1N4148 clamps, then two 75 Ω back-terminated paths: flat (R11 → IN1) and through the inverting EQ U1B (R2 750 Ω over R4 750 ∥ R6 365 + C4 1 nF ∥ R12 110 + C7 220 pF, ≈ +14 dB at 3 MHz) to IN1_EQ.'},
  fe2:{x:200,y:130,w:170,h:90,t:'IN2 / REF front end',s:['C11 · T2 · H2','H3: rear IN2 or REF','U3A flat · U3B EQ'],d:'Same circuit as IN1 (U3, R20–R38). H3 picks T2 (rear IN2) or REF; REF comes from the midplane through H4 (REF1 P2-14 / REF2 P2-10), R61 and the Q2 2N4401 emitter follower. Used only by the B build.'},
  mid:{x:10,y:240,w:150,h:110,t:'Midplane P2',s:['+12 V, −7.5 V','CANH / CANL','REF1 · REF2','AN_SLOTID'],d:'P2 (MEDAC20): +12 V on 1/3/5, −7.5 V on 2, CANH 13 / CANL 11, REF1 14 / REF2 10, AN_SLOTID 6 (slot resistor against R55 1K → PF0/ADC0).'},
  rx1:{x:410,y:20,w:150,h:80,t:'CS8416 #1 (U5)',s:['RXP0 flat / RXP1 EQ','reg 0x04 0x80 / 0x89','AES-format SDOUT'],d:'Software-mode receiver on a bit-banged SPI (PC1–PC3, CS PC6, RST PC7). Register 0x05 = 0xB0: master, AES3-direct output to the FPGA. The firmware reads register 0x0C (receiver errors; only UNLOCK unmasked by 0x06 = 0x10) every pass as the lock flag.'},
  rx2:{x:410,y:130,w:150,h:80,t:'CS8416 #2 (U6)',s:['IN2 or REF','CS PC4, RST PC5','clock for SRC output'],d:'Fitted on every board. Read only by the B build. Its OSCLK / OLRCK also clock the AD1895 output and the AES2 encoder, so in SRC mode the output rate follows IN2/REF.'},
  fpga:{x:600,y:20,w:200,h:200,t:'EP1C3T100 Cyclone (U10)',s:['shift_in16_version_out (16 bits)','i2s8416_aes ×2 encoders','tone_gen1 ×2 (−20 dBFS)','sw2x2x1x24 · switch2x1 ×2','i2s_par (SRC → 24-bit)','config: M25P40 “EPCS1”'],d:'D6201A.bdf (shared by A and B). q0/q1 pick the encoder for OUT1+2 / OUT3+4; q2/q3 (inverted) switch each encoder to external data; q4 picks tone2 or the SRC; q5 drives the AD1895 RESET; q14/q15 = NOT lock mute the encoders.'},
  src:{x:600,y:250,w:200,h:70,t:'AD1895 SRC (U9) + X2',s:['input: AES1 I²S from encoder 1','output: clocked by CS8416 #2','MCLK 24.576 MHz (vco pin)'],d:'Asynchronous sample-rate converter. On the D6201A it is fitted but held in reset forever (q5 = 0). On the B it runs in 1x8 w/ SRC: AES1 audio is converted to the rate of IN2/REF.'},
  drv:{x:840,y:20,w:160,h:120,t:'Output drivers U2, U4',s:['FPGA OUT1…4 → 30 Ω','374/750 divider','EL5263 buffers','2 × 75 Ω per amplifier'],d:'Each FPGA output pin drives one EL5263 half through R 30 Ω and a 374/750 Ω divider (3.3 V → 2.2 V); each half drives two BNC nets through its own 75 Ω (R14, R15 …) — about 1.1 V p-p into 75 Ω, the AES-3id level. OUT1/OUT2 are the same mux output, as are OUT3/OUT4.'},
  mcu:{x:410,y:250,w:160,h:120,t:'AT90CAN128 (U7) @ 8 MHz',s:['super-loop, no scheduler','timer0 1 ms · timer1 96 µs','own CAN driver','LEDs, SW1/2, DIP on PA'],d:'v100w.c main(): one loop of eight routines, about 4 900 (A) or 3 400 (B) passes per second. No zeuslib / GearOS: only Ross headers (CANmsg.h, paramdef.h), product.c and eeprom.c, plus the Ross bootloader. Code 25 244 bytes (A V104 map).'},
  can:{x:200,y:280,w:170,h:60,t:'SN65HVD233 (U8)',s:['PD5 TX · PD6 RX','PD7 → LBK'],d:'CAN transceiver. PD7 is wired to the loop-back pin: the firmware macro CAN_RX (PD7 high) holds it in loop-back during the boot waits; CAN_TX (PD7 low) puts it on the bus after CANinit.'},
  pwr:{x:840,y:180,w:160,h:110,t:'Power',s:['LM2676 +12 → +5 V','LM1117 3.3 V · ADJ core','79L05 −5 V','RXE050 fuses'],d:'REG1 LM2676 buck (L1 47 µH, D5 SK33) from +12 V; REG3 LM1117-3.3; REG4 LM1117-ADJ for the Cyclone core (VCC_INT); REG2 79L05 from −7.5 V for the EL5263 negative rail.'},
  pc:{x:840,y:320,w:160,h:50,t:'DashBoard via frame controller',s:['Ethernet ↔ CAN'],d:'DashBoard talks to the frame controller; the frame controller turns requests into openGear CAN messages to mod_address = slot + 0x10.'},
};
const WIRES=[['rear','fe1','IN1'],['rear','fe2','IN2'],['mid','fe2','REF1/2'],['fe1','rx1','RXP0/1'],['fe2','rx2','RXP0/1'],['rx1','fpga','AES SDOUT'],['rx2','fpga','AES SDOUT'],['fpga','src','I²S'],['src','fpga','I²S'],['fpga','drv','OUT1–4'],['drv','rear','8 × 75 Ω'],['mcu','rx1','SPI'],['mcu','fpga','FPGA1–4'],['mid','mcu','slot ID'],['mid','can','CANH/L'],['can','mcu','TX/RX'],['pc','mid','CAN'],['mid','pwr','+12/−7.5']];
function viewBlock(m){
  window.__d6201Active=false;
  m.innerHTML=`<div class="card"><h2>Block diagram (click a block)</h2><div id="d61bk"></div></div><div class="card"><h2 id="d61bt"></h2><div id="d61bd"></div></div>`;
  const q=s=>m.querySelector(s);
  SIM.on('time', ()=>{
    const {s,w,f}=fState(SIM.t); const en=encoders(f,w,s.word,SIM.t); const live={rx1: rxAt(0,SIM.t), rx2: w.build==='B' && rxAt(1,SIM.t), src: w.build==='B' && en.d.srcSel && en.d.srcRun && en.d.ext2, fe2: w.build==='B'};
    const c=k=>{ const B=BLOCKS[k]; return [B.x+B.w/2, B.y+B.h/2]; };
    let o=`<svg viewBox="0 0 1010 380" style="width:100%;display:block"><defs><marker id="d61ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,bb,l])=>{ const [x1,y1]=c(a), [x2,y2]=c(bb); o+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" stroke-width="1.3" marker-end="url(#d61ar)" opacity=".7"/><text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-3}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    Object.keys(BLOCKS).forEach(k=>{ const B=BLOCKS[k]; const sel=D.ui.block===k; const on=live[k];
      o+=`<g class="d61-bl" data-k="${k}" style="cursor:pointer"><rect x="${B.x}" y="${B.y}" width="${B.w}" height="${B.h}" rx="6" fill="${on? 'color-mix(in srgb, var(--accent) 22%, var(--panel))' : 'var(--panel)'}" stroke="${sel?'var(--accent)':'var(--line)'}" stroke-width="${sel?3:1.2}"/>
        <text x="${B.x+8}" y="${B.y+17}" font-size="12.5" font-weight="700" fill="var(--ink)">${B.t}</text>${B.s.map((x,i)=>`<text x="${B.x+8}" y="${B.y+33+i*14}" font-size="10.5" fill="var(--ink2)">${x}</text>`).join('')}</g>`; });
    q('#d61bk').innerHTML=o+'</svg>';
    const B=BLOCKS[D.ui.block]||BLOCKS.fpga; q('#d61bt').textContent=B.t; q('#d61bd').innerHTML=`<p>${B.d}</p><p class="small muted">Green = live in the current state (${BUILDS[w.build].label}, playhead ${SIM.fmtT(SIM.t)}).</p>`;
    m.querySelectorAll('.d61-bl').forEach(g=>g.onclick=()=>{ D.ui.block=g.dataset.k; SIM.refresh(); });
  });
}

/* ---------------- schematic set (redrawn from D6201Aiss5.net, not the original CAD) ---------------- */
const T=(x,y,s,o)=>`<text x="${x}" y="${y}" font-size="${(o&&o.fs)||11}" fill="${(o&&o.col)||'var(--ink)'}" text-anchor="${(o&&o.a)||'start'}" ${o&&o.b?'font-weight="700"':''}>${s}</text>`;
const Ln=(pts,col)=>`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${col||'var(--ink)'}" stroke-width="1.3"/>`;
function Rz(x,y,ref,val,vert){ return vert? `<rect x="${x-5}" y="${y}" width="10" height="26" fill="var(--panel)" stroke="var(--ink)"/>${T(x+8,y+12,ref,{fs:9.5})}${T(x+8,y+23,val,{fs:9.5,col:'var(--accent2)'})}`
  : `<rect x="${x}" y="${y-5}" width="28" height="10" fill="var(--panel)" stroke="var(--ink)"/>${T(x+14,y-8,ref,{fs:9.5,a:'middle'})}${T(x+14,y+17,val,{fs:9.5,a:'middle',col:'var(--accent2)'})}`; }
function Cz(x,y,ref,val,vert){ return vert? `<line x1="${x-8}" y1="${y}" x2="${x+8}" y2="${y}" stroke="var(--ink)" stroke-width="2"/><line x1="${x-8}" y1="${y+5}" x2="${x+8}" y2="${y+5}" stroke="var(--ink)" stroke-width="2"/>${T(x+11,y+5,ref+' '+val,{fs:9.5})}`
  : `<line x1="${x}" y1="${y-8}" x2="${x}" y2="${y+8}" stroke="var(--ink)" stroke-width="2"/><line x1="${x+5}" y1="${y-8}" x2="${x+5}" y2="${y+8}" stroke="var(--ink)" stroke-width="2"/>${T(x+2,y-11,ref,{fs:9.5,a:'middle'})}${T(x+2,y+20,val,{fs:9.5,a:'middle',col:'var(--accent2)'})}`; }
const GND=(x,y)=>`<path d="M${x-7} ${y} h14 M${x-4} ${y+3} h8 M${x-1.5} ${y+6} h3" stroke="var(--ink)"/>`;
const NL=(x,y,s,a)=>`<rect x="${a==='end'?x-s.length*6.4-6:x}" y="${y-8}" width="${s.length*6.4+6}" height="14" rx="3" fill="color-mix(in srgb,var(--accent2) 14%,var(--panel))" stroke="var(--accent2)" stroke-width=".8"/>${T(a==='end'?x-3:x+3,y+3,s,{fs:9.5,a:a==='end'?'end':'start'})}`;
function OpA(x,y,ref,pins){ return `<path d="M${x} ${y-26} L${x} ${y+26} L${x+46} ${y} Z" fill="var(--panel)" stroke="var(--ink)"/>${T(x+4,y-12,'+'+(pins?' '+pins[0]:''),{fs:9})}${T(x+4,y+18,'−'+(pins?' '+pins[1]:''),{fs:9})}${T(x+10,y+40,ref,{fs:10,b:1})}`; }
function chip(x,y,w,ref,name,left,right){
  const n=Math.max(left.length,right.length), h=n*17+30;
  let o=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel)" stroke="var(--ink)"/>${T(x+w/2,y+14,ref+' '+name,{a:'middle',b:1})}`;
  left.forEach(([p,l,net],i)=>{ const yy=y+30+i*17; o+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/>${T(x-30,yy-3,p,{fs:9,col:'var(--ink2)'})}${T(x+4,yy+4,l,{fs:10})}${net?NL(x-38,yy,net,'end'):''}`; });
  right.forEach(([p,l,net],i)=>{ const yy=y+30+i*17; o+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/>${T(x+w+6,yy-3,p,{fs:9,col:'var(--ink2)'})}${T(x+w-4,yy+4,l,{fs:10,a:'end'})}${net?NL(x+w+38,yy,net):''}`; });
  return o;
}
const SHEETS = [
  {name:'1 · IN1 front end + EQ', note:'U1 EL5263 (dual). U1A: gain 1 + R3/R1 = 2. Flat path: R11 75 Ω into R50 75 Ω (÷2) → C52 → U5 RXP0. EQ path: U1B inverting, |gain| = R2 / Z(R4 ∥ R6+C4 ∥ R12+C7): 1 at DC, rising through the 436 kHz (R6·C4) and 6.6 MHz (R12·C7) zeros. IN2 is the same circuit with U3, T2, H2, R20…R38 and C53/C54 → U6.', svg:()=>{
    let o=Ln([[10,120],[70,120]])+NL(4,88,'BNC1_SIG P1-97')+Cz(70,120,'C1','0.1µ')+Ln([[75,120],[110,120]]);
    o+=`<rect x="110" y="95" width="56" height="60" fill="var(--panel)" stroke="var(--ink)"/><path d="M128 100 v50 M148 100 v50" stroke="var(--ink)"/>${T(138,170,'T1 PE-65612',{fs:10,a:'middle',b:1})}${T(112,92,'1',{fs:9})}${T(160,92,'3',{fs:9})}`;
    o+=Ln([[166,120],[220,120]])+Ln([[110,150],[95,150],[95,175]])+T(60,190,'2 → BNC1_GND (P1-95…100)',{fs:9})+Ln([[166,150],[180,150],[180,170]])+GND(180,170)+T(184,165,'4',{fs:9});
    o+=`<rect x="200" y="40" width="40" height="44" fill="none" stroke="var(--warn)" stroke-dasharray="3 2"/>${T(203,36,'H1',{b:1,col:'var(--warn)'})}`+Ln([[220,84],[220,120]])+Rz(200,50,'R8','75R')+Rz(245,50,'R9','110');
    o+=T(210,98,'1–2: 75 Ω · 2–3: 110 Ω',{fs:9,col:'var(--warn)'});
    o+=Rz(240,120,'R7','110')+Ln([[268,120],[310,120],[310,108],[330,108]])+OpA(330,120,'U1A',['3','2']);
    o+=T(275,150,'D1/D2 1N4148 to ±5 V',{fs:9});
    o+=Ln([[376,120],[430,120]])+Ln([[330,132],[318,132],[318,180],[400,180],[400,120]])+Rz(340,180,'R3','750')+Ln([[318,180],[318,215]])+Rz(318,190,'R1','750',true)+GND(318,222);
    o+=Ln([[430,120],[430,70],[470,70]])+Rz(470,70,'R11','75R')+Ln([[498,70],[560,70]])+Rz(560,72,'R50','75R',true)+GND(560,104)+Cz(590,70,'C52','0.1µ')+Ln([[560,70],[590,70]])+Ln([[595,70],[640,70]])+NL(640,70,'U5 pin 4 RXP0 (flat)');
    o+=Ln([[430,120],[430,260],[460,260]])+T(240,285,'R4 750 ∥ (R6 365 + C4 1n) ∥ (R12 110 + C7 220p)',{fs:9.5,col:'var(--accent2)'})+`<rect x="460" y="255" width="60" height="10" fill="var(--panel)" stroke="var(--ink)"/>`+Ln([[520,260],[550,260],[550,252],[570,252]]);
    o+=OpA(570,240,'U1B',['5','6']).replace('+ 5','+ 5 (GNDD)')+Ln([[570,228],[560,228],[560,210]])+GND(560,210);
    o+=Ln([[550,260],[550,300],[640,300],[640,240]])+Rz(580,300,'R2','750')+Ln([[616,240],[680,240]])+Rz(680,240,'R5','75R')+Ln([[708,240],[740,240]])+Rz(740,242,'R48','75R',true)+GND(740,274)+Ln([[740,240],[770,240]])+Cz(770,240,'C51','0.1µ')+Ln([[775,240],[800,240]])+NL(800,240,'U5 pin 3 RXP1 (EQ)');
    o+=T(20,330,`EQ boost (computed from the values above): ${[0.5e6,1e6,2e6,3.072e6,6.144e6,12.288e6].map(fq=>(fq/1e6)+' MHz +'+eqBoostDb(fq).toFixed(1)+' dB').join(' · ')}`,{fs:10.5});
    return o; }},
  {name:'2 · IN2 source: H2, H3, H4 and Q2', note:'H3 1–2 = rear IN2 through T2 (R95 100K bleed); 2–3 = REF. H4 picks the midplane reference: 1–2 REF1 (P2-14), 2–3 REF2 (P2-10). Q2 is an emitter follower from +12 V with R59 10K to −7.5 V; R60 30 Ω and C58 couple it to REF. The rest of the path is the IN1 circuit with U3.', svg:()=>{
    let o=NL(20,60,'REF1 P2-14')+NL(20,110,'REF2 P2-10');
    o+=`<rect x="150" y="50" width="30" height="70" fill="none" stroke="var(--warn)"/>${T(150,45,'H4',{b:1,col:'var(--warn)'})}`+Ln([[110,60],[150,60]])+Ln([[110,110],[150,110]])+Ln([[180,85],[220,85]])+Rz(220,85,'R61','1K')+Ln([[248,85],[300,85]]);
    o+=`<circle cx="320" cy="85" r="20" fill="none" stroke="var(--ink)"/>${T(345,70,'Q2 2N4401',{b:1,fs:10})}`+Ln([[300,85],[310,85]])+Ln([[325,65],[325,30]])+NL(330,30,'+12V (P2-1/3/5 via F2)')+Ln([[325,105],[325,140],[400,140]])+Rz(325,150,'R59','10K',true)+NL(330,195,'−7.5V');
    o+=Rz(400,140,'R60','30R')+Ln([[428,140],[460,140]])+Cz(460,140,'C58','0.1µ')+Ln([[465,140],[520,140]])+T(480,130,'REF',{fs:10});
    o+=`<rect x="520" y="110" width="30" height="80" fill="none" stroke="var(--warn)"/>${T(520,105,'H3',{b:1,col:'var(--warn)'})}${T(556,124,'1 ← T2 sec (rear IN2)',{fs:9.5})}${T(556,152,'2 → R29 110 → U3 pin 3',{fs:9.5})}${T(556,182,'3 ← REF',{fs:9.5})}`;
    o+=Ln([[520,180],[505,180],[505,140]])+NL(20,240,'BNC2_SIG P1-92')+Ln([[120,240],[160,240]])+Cz(160,240,'C11','0.1µ')+Ln([[165,240],[200,240]])+`<rect x="200" y="220" width="50" height="45" fill="var(--panel)" stroke="var(--ink)"/>${T(225,280,'T2',{a:'middle',b:1})}`+Ln([[250,240],[400,240],[400,124],[520,124]]);
    o+=Rz(300,240,'R95','100K',true).replace(/x="295"/,'x="295"')+`<rect x="330" y="250" width="40" height="40" fill="none" stroke="var(--warn)" stroke-dasharray="3 2"/>${T(334,300,'H2: R30 75R / R31 110',{fs:9,col:'var(--warn)'})}`;
    return o; }},
  {name:'3 · CS8416 receivers and their control bus', note:'Both receivers share CCLK/CDIN/CDOUT on PORTC; each has its own chip select and reset. 0x05 = 0xB0 puts SDOUT in AES3-direct master mode; the FPGA re-encodes it. GPO0–2 go to the FPGA but D6201A.bdf leaves them unconnected.', svg:()=>{
    let o=chip(330,20,170,'U5','CS8416',[['4','RXP0','IN1 (flat)'],['3','RXP1','IN1_EQ'],['9','RST','CS8416_RESET1 PC7'],['14','CS','CS8416_SEL1 PC6'],['15','CDIN','CS8416_IN PC3'],['16','CCLK','CS8416_CLK PC2'],['17','CDOUT','CS8416_OUT PC1']],[['24','RMCK','U5_MCLK U10-87'],['26','SDOUT','U5_SDATA U10-86'],['27','OSCLK','U5_SCLK U10-77'],['28','OLRCK','U5_LRCLK U10-76'],['18–20','GPO2–0','U10-88…90']]);
    o+=chip(330,190,170,'U6','CS8416',[['4','RXP0','IN2 (flat)'],['3','RXP1','IN2_EQ'],['9','RST','CS8416_RESET2 PC5'],['14','CS','CS8416_SEL2 PC4'],['15–17','CDIN/CCLK/CDOUT','shared with U5']],[['24','RMCK','U6_MCLK U10-98'],['26','SDOUT','U6_SDATA U10-97'],['27','OSCLK','U6_SCLK U10-92'],['28','OLRCK','U6_LRCLK U10-91'],['18–20','GPO2–0','U10-1, 100, 99']]);
    o+=T(20,370,'init_CS8416 (cs84xx.c): 0x00←0x00 · 0x01←0x04 · 0x02←0x0B · 0x03←0xBB (GPO pass-through) · 0x04←0x80 (RUN, RXP0) · 0x05←0xB0 (master, AES3 direct) · 0x06←0x10 (only UNLOCK unmasked)',{fs:10});
    o+=T(20,388,'Frame on the wire: header 0x20 (write) / 0x21 (read), MSB first, CS low for the whole transfer — 14 CPU cycles per bit (cs84xx.lis)',{fs:10,col:'var(--ink2)'});
    return o; }},
  {name:'4 · EP1C3 FPGA, AD1895 and configuration', note:'Pins from D6201A.qsf and the netlist. vco (pin 10) carries X2 24.576 MHz into the AD1895 MCLK (src_mclk) – the up/dn pins of an older VCXO idea (D6/D7, R75 not fitted) are tied low in the bdf.', svg:()=>{
    let o=chip(300,20,200,'U10','EP1C3T100C8',[['5','FPGA1 (shift_out)','PB7'],['4','FPGA2 (strobe)','PB6'],['3','FPGA3 (data_in)','PB5'],['2','FPGA4 (clock)','PB4'],['86/87','U5 SDATA/MCLK','U5'],['76/77','U5 LRCLK/SCLK','U5'],['97/98','U6 SDATA/MCLK','U6'],['91/92','U6 LRCLK/SCLK','U6'],['10','vco','X2 24.576M'],['36/37','dn / up','D6/D7 (GND)']],
      [['75','OUT1','R94 → U2A'],['74','OUT2','R58 → U2B'],['69','OUT3','R56 → U4A'],['68','OUT4','R57 → U4B'],['53/52/51','src sdata/sclk/lrclk in','U9'],['55/57/56','src sdata/sclk/lrclk out','U9'],['54','src_mclk','U9 MCLK'],['49','src_reset (q5)','U9 RESET'],['50','src_bypass','U9 (GND)'],['6/7/16/17','NCS/DATA/DCLK/ASDI','U11'],['25…21','TP1–TP5','H5']]);
    o+=T(20,300,'U11 M25P40 (footprint “EPCS1”) holds the configuration; H11 is the Active-Serial header; JTAG2 (TCK 62, TMS 63, TDO 64, TDI 67) the JTAG chain used by D6201A.cdf.',{fs:10});
    o+=T(20,318,'U9 AD1895: SDATA_I/SCLK_I/LRCLK_I from encoder 1’s I²S; SDATA/SCLK/LRCLK out, clocked by CS8416 #2 (lrclk2 / sclk2 nets).',{fs:10});
    return o; }},
  {name:'5 · Output drivers → 8 × BNC', note:'Values from the netlist. With 3.3 V LVTTL from the FPGA the divider gives ≈ 2.2 V p-p at the buffer; each 75 Ω back-termination into a 75 Ω load halves it to ≈ 1.1 V p-p (AES-3id is 1.0 V ± 10 %). No series capacitor on the card: the coax carries a DC offset (computed from the netlist; the T63xx rear only adds 4n7 series inductors).', svg:()=>{
    let o=''; const rows=[['OUT1','75','R94','R16','R17','U2A','R13',[['R14','BNC3','P1-75'],['R15','BNC5','P1-37']]],['OUT2','74','R58','R90','R91','U2B','R18',[['R19','BNC7','P1-17'],['R21','BNC9','P1-5']]],['OUT3','69','R56','R34','R35','U4A','R27',[['R28','BNC4','P1-80'],['R33','BNC6','P1-34']]],['OUT4','68','R57','R92','R93','U4B','R37',[['R39','BNC8','P1-22'],['R40','BNC10','P1-12']]]];
    rows.forEach((r,i)=>{ const y=40+i*92;
      o+=NL(10,y,`U10-${r[1]} ${r[0]}`)+Ln([[110,y],[130,y]])+Rz(130,y,r[2],'30R')+Ln([[158,y],[190,y]])+Rz(190,y,r[3],'374')+Ln([[218,y],[260,y]])+Rz(240,y+4,r[4],'750',true)+GND(240,y+36)+Ln([[260,y],[260,y-12],[300,y-12]])+OpA(300,y,r[5]);
      o+=Ln([[346,y],[380,y]])+Ln([[300,y+12],[290,y+12],[290,y+46],[380,y+46],[380,y]])+Rz(320,y+46,r[6],'750');
      r[7].forEach(([rr,bn,pp],j)=>{ const yy=y-14+j*28; o+=Ln([[380,y],[400,yy],[420,yy]])+Rz(420,yy,rr,'75R')+Ln([[448,yy],[480,yy]])+NL(480,yy,`${bn}_SIG ${pp}`); });
    });
    o+=T(640,60,'OUT1 and OUT2 are both driven by switch2x1 inst20',{fs:10})+T(640,76,'(sel = q0): AES1 or AES2 encoder.',{fs:10})+T(640,152,'OUT3 and OUT4 by inst21 (sel = q1).',{fs:10});
    o+=T(640,230,'T6301A / T6201A: BNC3,5,7,9 = OUT1-x (left column),',{fs:10})+T(640,246,'BNC4,6,8,10 = OUT2-x (right column).',{fs:10})+T(640,262,'T6401A: only BNC1,3,5,7,9 reach a jack.',{fs:10});
    return o; }},
  {name:'6 · AT90CAN128, CAN, LEDs and switches', note:'Port map from the netlist, matching D6201A.h / D6201B.h. Each DIP position goes through a 110 Ω series resistor; ON pulls the pin to GNDD. LEDs are driven high through 750 Ω.', svg:()=>{
    let o=chip(330,20,190,'U7','AT90CAN128',[['2','PE0','LOCK1 → L2'],['3','PE1','NO_LOCK1 → L3'],['4','PE2','SW1 (EQ1)'],['5','PE3','EQ1 → L4'],['6','PE4','LOCK2 → L5'],['7','PE5','NO_LOCK2 → L6'],['8','PE6','SW2 (EQ2)'],['9','PE7','EQ2 → L7'],['10','PB0','COM_ACTIVITY → L8'],['11','PB1','ERROR → L9'],['61','PF0/ADC0','AN_SLOTID (R55 1K)'],['60','PF1/ADC1','AN_BMID (R53 1K)'],['59','PF2/ADC2','AN_BMID2 (R54 1K)']],
      [['14–17','PB4–PB7','FPGA4…FPGA1'],['35','PC0','ALTERA_RESET'],['36–38','PC1–PC3','CS8416 CDOUT/CCLK/CDIN'],['39–42','PC4–PC7','SEL2 RESET2 SEL1 RESET1'],['44–51','PA7–PA0','DIP SW3-1 … SW3-8'],['30','PD5 TXCAN','CAND → U8-1'],['31','PD6 RXCAN','CANR ← U8-4'],['32','PD7','LBK → U8-5']]);
    o+=chip(700,300,120,'U8','SN65HVD233',[['1','D','CAND'],['4','R','CANR'],['5','LBK','PD7']],[['7','CANH','P2-13'],['6','CANL','P2-11']]);
    return o; }},
  {name:'7 · Power', note:'From the netlist: +12 V (P2-1/3/5) → F2 RXE-050 → FB2 → REG1 LM2676 (L1 47 µH, D5 SK33) → FB3 → +5 V → REG3 LM1117-3.3 (3V net) → REG4 LM1117-ADJ (VCC_INT, the Cyclone core; the voltage is set by R85/R87, values not listed). −7.5 V (P2-2) → F1 → FB1 → −VA → REG2 79L05 → −5 V for the EL5263 buffers. Manual: +12 V, 4 W max.', svg:()=>{
    let o=''; const ch=[['+12V P2-1/3/5',20],['F2 RXE-050',150],['FB2',260],['REG1 LM2676',330],['FB3 → +5V',470],['REG3 LM1117-3.3 → 3V',580],['REG4 LM1117-ADJ → VCC_INT',770]];
    ch.forEach(([s,x],i)=>{ o+=`<rect x="${x}" y="60" width="${s.length*6.6+10}" height="28" rx="4" fill="var(--panel)" stroke="var(--ink)"/>${T(x+5,78,s,{fs:10.5})}`; if (i) o+=Ln([[ch[i-1][1]+ch[i-1][0].length*6.6+10,74],[x,74]]); });
    const ch2=[['−7.5V P2-2',20],['F1 RXE-050',150],['FB1 → −VA',260],['REG2 79L05 → −5V',370]];
    ch2.forEach(([s,x],i)=>{ o+=`<rect x="${x}" y="150" width="${s.length*6.6+10}" height="28" rx="4" fill="var(--panel)" stroke="var(--ink)"/>${T(x+5,168,s,{fs:10.5})}`; if (i) o+=Ln([[ch2[i-1][1]+ch2[i-1][0].length*6.6+10,164],[x,164]]); });
    o+=T(20,230,'+5 V: U1–U4 EL5263 (V+) · 3V: AT90CAN128, CS8416 ×2, AD1895, FPGA I/O, U8, U11 · VCC_INT: FPGA core · −5 V: EL5263 (V−)',{fs:10.5});
    return o; }},
];
function viewSchem(m){
  window.__d6201Active=false;
  m.innerHTML=card('Schematic set — redrawn from D6201Aiss5.net, D6201A.qsf and D6201A.bdf (not the original P-CAD sheets)', `<div id="d61st" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div class="scroll" id="d61ss"></div><p id="d61sn" class="small"></p>
    <p class="small muted">Net names and values are as in the netlist; layout is new. The ISS5 board is the same for D6201A and D6201B; the A build simply never uses U6, U3, U9, SW2 or the second LED group.</p>`);
  const q=s=>m.querySelector(s);
  const draw=()=>{ const i=D.ui.schem||0; q('#d61st').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#d61st button').forEach(b=>b.onclick=()=>{ D.ui.schem=+b.dataset.i; draw(); });
    q('#d61ss').innerHTML=`<svg viewBox="0 0 980 420" style="width:100%;min-width:760px;display:block;background:var(--lane);border-radius:6px">${SHEETS[i].svg()}</svg>`; q('#d61sn').innerHTML=SHEETS[i].note; };
  draw();
}
/* ---------------- software ---------------- */
function viewSoft(m){
  window.__d6201Active=false;
  const tabs=[['loop','Main loop'],['isr','Interrupts & CAN'],['eq','EQ button'],['word','FPGA word'],['oids','DashBoard OIDs'],['boot','Boot & EEPROM'],['stack','Scheduler?']];
  m.innerHTML=`<div class="card"><div id="d61swt" style="display:flex;gap:6px;flex-wrap:wrap"></div></div><div id="d61sw"></div>`;
  const q=s=>m.querySelector(s);
  SIM.on('time', ()=>{
    const t=SIM.t, R=sim(), {s,w,f}=fState(t), b=w.build, O=OIDS(b), tab=D.ui.softTab;
    q('#d61swt').innerHTML=tabs.map(([k,l])=>`<button class="${tab===k?'on':''}" data-k="${k}">${l}</button>`).join('');
    m.querySelectorAll('#d61swt button').forEach(x=>x.onclick=()=>{ D.ui.softTab=x.dataset.k; SIM.refresh(); });
    let h='';
    if (tab==='loop'){
      const pi=passAt(t); const st=steps(b, pi>=0? R.passM[pi] : 0); let cur=-1;
      if (pi>=0 && s.mode==='app'){ let tt=R.passT[pi]; const k=1/C.F_CPU/(1-ISR_LOAD); st.forEach((x,i)=>{ const d=x[2]*k; if (cur<0 && t<tt+d) cur=i; tt+=d; }); }
      const tot=st.reduce((a,x)=>a+x[2],0);
      h=card(`v100w.c while(1) — ${BUILDS[b].label}, pass ${pi>=0?pi+1:'—'} (${s.mode})`, `<svg viewBox="0 0 900 ${st.length*34+20}" style="width:100%;display:block">${st.map((x,i)=>{ const y=10+i*34, on=i===cur;
        return `<rect x="10" y="${y}" width="560" height="28" rx="5" fill="${on?'color-mix(in srgb,var(--accent) 30%,var(--panel))':'var(--panel)'}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?2.5:1}"/><text x="20" y="${y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${x[0]}()</text><text x="230" y="${y+18}" font-size="11" fill="var(--ink2)">${x[1]}</text>
        <rect x="590" y="${y+6}" width="${x[2]/tot*280}" height="16" fill="var(--accent2)" opacity=".7"/><text x="${596+x[2]/tot*280}" y="${y+18}" font-size="10.5" fill="var(--ink)">${x[2]} cyc · ${(x[2]/C.F_CPU*1e6).toFixed(1)} µs</text>`; }).join('')}</svg>
        <p class="small">Total ${tot} cycles = ${(tot/C.F_CPU*1e6).toFixed(0)} µs, plus ${(ISR_LOAD*100).toFixed(1)} % for the timer interrupts → ${(passTime(b,s.opmode)*1e6).toFixed(0)} µs per pass, ≈ ${Math.round(1/passTime(b,s.opmode)).toLocaleString()} passes/s. The bit-bang loops are exact (14 cycles per bit in cs84xx.lis and altera.lis); the other routines are ${infT('their instruction count in the .lis files')} estimates. WDR() is called four times per pass; the watchdog (WDTCR = 0x08, 16K prescale) never fires while the loop runs.</p>
        <p class="small">Every pass rewrites CS8416 register 0x04 (PROCESS_MODES) and shifts all 16 control bits into the FPGA (ALTERA_write), even when nothing has changed: about ${(R.passT.length).toLocaleString()} identical SPI writes per second.</p>`);
      h+=card('PARAMETER_UPDATE — which change gets reported next', `<div class="mono small">${O.refresh.map((r,i)=>`<span class="chip" style="${s.pRef===i?'background:var(--accent);color:#fff':''}">${i} ${r} → ${oidS(O.refreshOid[i])}</span>`).join(' ')}</div>
        <p class="small">Priority chain: a lock, EQ${b==='B'?', mode':''} or tone change sets parameter_refresh and parameter_change; CAN_TX_TIMER sends it at the next heartbeat. With nothing pending, <span class="mono">parameter_refresh++</span> runs on <b>every main-loop pass</b>, not every heartbeat, so the OID sent by each 0.96 s heartbeat is effectively random (pass count mod ${O.pmax+1}). Now: ${O.refresh[s.pRef]} ${s.pChg?'(pending)':'(spinning)'}.</p>`);
    }
    if (tab==='isr'){
      const hb=R.can.filter(c=>c.dir==='tx'); const last=R.can.filter(c=>c.t<=t).slice(-1)[0];
      let idS=''; if (last){ const src= last.dir==='tx'? (s.slot+0x10) : 0x00; const dst = last.dir==='tx'? (last.type===0x11||last.hb? 0x02 : 0x00) : s.slot+0x10; const id=((3&3)<<27)|((src&0x3F)<<19)|((dst&0x3F)<<13)|((last.type&0xFF)<<5)|(last.flags&0x1F);
        idS=`<table class="kv"><tr><th>last frame</th><td>${esc(last.label)} at ${SIM.fmtT(last.t)} (${last.dir})</td></tr><tr><th>29-bit ID</th><td class="mono">0x${hx(id,8)} = prio ${3} · src 0x${hx(src)} · dst 0x${hx(dst)} · type 0x${hx(last.type)} · flags ${last.flags}</td></tr><tr><th>packing (CANTX)</th><td class="mono small">CANIDT1 = (src&gt;&gt;2)|(prio&lt;&lt;6) · CANIDT2 = dst|((src&amp;3)&lt;&lt;6) · CANIDT3 = type · CANIDT4 = flags&lt;&lt;3</td></tr></table>`; }
      h=card('timer1_ovf_isr → CAN_TX_TIMER', `<svg viewBox="0 0 900 190" style="width:100%;display:block">
        ${[['frame_count != 0','CAN_TX_TIMER every tick (96 µs): next frame of a multi-frame reply',!!0],['dashboard_initializing == YES','send when tx_interrupt_counter > TX_INITIALIZE = 1000 × slot ('+(s.slot*96)+' ms)',s.dinit],['otherwise','send when tx_interrupt_counter > TX_HEARTBEAT = 10000 (0.960 s)',!s.dinit]].map((r,i)=>`<rect x="10" y="${10+i*58}" width="250" height="44" rx="6" fill="${r[2]?'color-mix(in srgb,var(--accent) 25%,var(--panel))':'var(--panel)'}" stroke="var(--line)"/><text x="20" y="${37+i*58}" font-size="12" font-weight="700" fill="var(--ink)">${r[0]}</text><text x="280" y="${37+i*58}" font-size="11.5" fill="var(--ink2)">${r[1]}</text>`).join('')}</svg>
        <p class="small">CAN_TX_TIMER sends, in order: CANTRAP_RESTART until it has been sent once${BUILDS[b].fws[w.fw].restartOnce?'':' — <b>this V1.02 repeats it every heartbeat until the frame controller sends GET_NUMPARAMS</b> (start_parameter_dump)'}, then REPORT_PARAM for parameter_refresh, unless restore_start (DataSafe FF.07) is set. Requests from the frame controller are answered inside can_rx_isr: single-frame replies at once, longer ones one frame per timer1 tick.</p>
        <p class="small">timer0_ovf_isr counts 1000 ms: if fewer than 10 frames arrived in the last second (three seconds in a row) dashboard_initializing becomes NO and the slow heartbeat starts. Now: ${s.dinit?'initializing':'heartbeat'}; ${hb.length} frames sent this second.</p>${idS}`);
      h+=card('COM ACTIVITY and ERROR LEDs', `<p class="small">COM_ACTIVITY_LED_ON is called when a REPORT_PARAM goes out and while a multi-frame message is being sent; it is switched off only by the last frame of a multi-frame message (MultiFrameMessageTransmission) or when CAN_TX_TIMER finds the previous frame unfinished. On an idle bus it therefore stays lit. COM_ERROR_LED_ON appears nowhere uncommented: the Error LED is never lit.</p>`);
    }
    if (tab==='eq'){
      const st = s.pbRel? 2 : s.pb? 1 : 0;
      h=card('PROCESS_EQ_PUSHBUTTONS state machine', `<svg viewBox="0 0 900 150" style="width:100%;display:block">${[['idle','pb = NO, pb_release = NO'],['pressed','pb = YES (eq_refresh → toggle once)'],['debounce','pb_release = YES, pb_counter '+s.pbCnt+' / 255']].map((x,i)=>`<rect x="${20+i*290}" y="30" width="240" height="60" rx="10" fill="${st===i?'color-mix(in srgb,var(--accent) 30%,var(--panel))':'var(--panel)'}" stroke="${st===i?'var(--accent)':'var(--line)'}" stroke-width="2"/><text x="${140+i*290}" y="56" text-anchor="middle" font-size="14" font-weight="700" fill="var(--ink)">${x[0]}</text><text x="${140+i*290}" y="76" text-anchor="middle" font-size="11" fill="var(--ink2)">${x[1]}</text>`).join('')}
        <text x="270" y="22" font-size="11" fill="var(--ink2)">switch low</text><text x="560" y="22" font-size="11" fill="var(--ink2)">switch released</text><text x="380" y="130" font-size="11" fill="var(--ink2)">after 255 more passes (≈ ${(C.DEBOUNCE*passTime(b,s.opmode)*1000).toFixed(0)} ms) → idle</text>
        <path d="M260 60 h30 M550 60 h30" stroke="var(--ink2)" stroke-width="2"/><path d="M750 92 C 700 140, 200 140, 140 92" fill="none" stroke="var(--ink2)" stroke-width="1.5"/></svg>
        <p class="small">The toggle happens on the first pass that sees the switch low — there is no debounce on the press, only after the release. ${b==='B'?'SW1 and SW2 share one pb flag: holding one blocks the other.':'On the D6201A, READ_SWITCHES never reads SW2 (inside #ifdef AES2_AVAILABLE).'} The new eq value goes to CS8416 register 0x04 in the same pass (PROCESS_MODES), so the receiver jumps from RXP0 to RXP1 and re-locks.</p>`);
    }
    if (tab==='word'){
      const d=fpgaDecode(s.word);
      const names=['q0 dip1 → inst20.sel (OUT1/2 ← AES2 enc)','q1 dip2 → inst21.sel (OUT3/4 ← AES2 enc)','q2 dip3 → NOT → enc1.ext_sel (0 = tone1)','q3 dip4 → NOT → enc2.ext_sel (0 = external)','q4 dip5 → sw2x2x1x24.sel (1 = SRC, 0 = tone2)','q5 dip6 → AD1895 RESET (0 = held)','q6 dip7 (unused)','q7 dip8 (unused)','q8','q9','q10','q11','q12','q13','q14 → enc2.off (NOT aes2_lock)','q15 → enc1.off (NOT aes1_lock)'];
      h=card(`ALTERA_write → shift_in16_version_out: 0x${hx(s.word,4)}`, `<table class="kv"><tr><th>bit</th><th>value</th><th>D6201A.bdf net → effect</th></tr>${names.map((n,i)=>`<tr><td class="mono">${i}</td><td class="mono" style="${(s.word>>i)&1?'color:var(--accent);font-weight:700':''}">${(s.word>>i)&1}</td><td class="small">${n}</td></tr>`).slice().reverse().join('')}</table>
        <p class="small">write_data() sends data_upper then data_lower, MSB first, on PB5 with clocks on PB4; shift_in puts the first bit in q15. STROBE (PB6) copies the shift register to the outputs. ${b==='A'?'The A always sends data_lower = 0xCC: bits 0, 1, 4, 5 cleared, so both output groups take AES1, the SRC sits in reset and the tone bit (2) stays high.':'The B builds the lower byte from mode, tones and src_reset; the upper byte carries the two NOT-lock mutes.'}</p>`);
    }
    if (tab==='oids'){
      const rows = (bb)=>{ const OO=OIDS(bb); const ms = bb==='A'? OO.menu1 : OO.menu1; return `<table class="kv"><tr><th>OID</th><th>name</th><th>in menu</th><th>SET handler</th></tr>${[...new Set([...OO.status.map(x=>x[0]), ...ms, ...(OO.hidden||[]), 0x0308, 0x0304, 0xFF07, 0xFF08])].filter(o=> bb==='B' || (o!==0x0308 && o!==0x0304)).map(o=>{ const d=oidDef(bb,o); const inMenu = OO.status.some(x=>x[0]===o) || ms.includes(o);
        const hnd = {0x0201:'echo',0x0202:'—',0x0203:'—',0x0400:'smpte_alarm_enabled = v',0x0302:'eq1_active (+ peq1, not reported)',0x0303:'eq2_active',0x0305: bb==='A'?'tone_generation (ignored by ALTERA_write)':'tone_generation1 (refused in SRC)',0x0306: bb==='A'?'reply ad_result':'tone_generation2 (2x4 only)',0x030A:'mode',0x0301:'save_settings = ~v',0x0308:'reply ad_result',0x0304:'src_select (never read)',0x070B:'—',0x070C:'—',0xFF07:'restore_start = v (DataSafe)',0xFF08:'restore_start = ~v & 1'}[o]||'';
        return `<tr><td class="mono">${o>=0xFF00?'FF.'+(o&0xFF):oidS(o)}</td><td>${esc(d.name)}${d.descName?` <span class="muted small">(“${d.descName}”)</span>`:''}</td><td>${inMenu?'yes':'<span class="muted">no</span>'}</td><td class="small">${hnd}</td></tr>`; }).join('')}</table>`; };
      h=`<div class="grid2">${card('D6201A V1.04 (Dashboard.c)', rows('A')+'<p class="small">ParamOIDS count 11 (2.3, 3.3, 3.5 follow after the count). Menu1OID count 3: 4.0, 3.2, 3.5 — so DashBoard shows a Tone Generator and no Save button.</p>')}${card('D6201B V1.02/V1.03 (Dashboard.c)', rows('B')+'<p class="small">Menu1OID count 10 (3.11 and 3.4 follow after the count); Menu3OID (DIP SW8 ON) drops 3.1 Save. The 7.11/7.12/7.13 header descriptors are named “Metadata” (MESSAGE_CREATOR_PARAMETER_7B/7C/7D), a leftover from an M62xx card; their value strings are “AES Input 1/2”, “Outputs”.</p>')}</div>`;
      h+=card('Value encodings (alarm tables)', `<table class="kv"><tr><th>OID</th><th>A</th><th>B</th></tr><tr><td>2.1 Card Status</td><td>0 OK · 2 No AES Audio Lock (only with Notify on Card Fault)</td><td>0 OK · 2 No AES Audio Lock · 4 AES Input #1 Unlocked · 8 AES Input #2 Unlocked (all need Notify)</td></tr>
        <tr><td>2.2 / 2.3</td><td>1 Locked · 2 Unlocked · 4 Unlocked (alarm on) — two entries with the same text</td><td>1 Locked · 2 Not Used (input inactive) · 4 Unlocked</td></tr></table>`);
    }
    if (tab==='boot'){
      h=card(`Boot sequence — ${BUILDS[b].label}`, `<table class="kv"><tr><th>phase</th><th>time</th></tr>${bootPhases(b).map(p=>`<tr><td>${esc(p[1])}</td><td class="mono">${(p[0]*1000).toFixed(1)} ms</td></tr>`).join('')}<tr><th>total</th><th class="mono">${(bootLen(b)*1000).toFixed(0)} ms</th></tr></table>
        <p class="small">wait(3000) = 3000 × 7 cycles = 2.625 ms (common.lis). Each ADC sample waits 2 × wait(3000) before starting the next 104 µs conversion, so averaging 100 samples takes ${(C.ADC_N*ADC_SAMPLE*1000).toFixed(0)} ms. ${b==='B'?'The B source repeats the whole averaging block (copy-paste in v100w.c), so the B boots in over a second.':'The A spends another 131 ms in plain waits.'} The CAN transceiver is held in loop-back (PD7 → LBK) the whole time.</p>`);
      h+=card('EEPROM (SAVE / RESTORE_INFORMATION_EEPROM)', `<table class="kv"><tr><th>address</th><th>A V1.04</th><th>B</th><th>now</th></tr><tr><td>10</td><td>0xAA marker</td><td>0xAA marker</td><td class="mono">0x${hx(s.ee[10])}</td></tr><tr><td>11</td><td>—</td><td>mode</td><td class="mono">0x${hx(s.ee[11])}</td></tr><tr><td>13</td><td>—</td><td>tone_generation1</td><td class="mono">0x${hx(s.ee[13])}</td></tr><tr><td>14</td><td>tone_generation</td><td>tone_generation2</td><td class="mono">0x${hx(s.ee[14])}</td></tr></table>
        <p class="small">Neither build saves EQ or Notify on Card Fault (the smpte_alarm line is commented out). The A never calls RESTORE_INFORMATION_EEPROM (the call sits inside a /* */ block in main), so its Save button — which is not even in its menu — stores a tone flag that nothing uses. The B restores only when DIP SW7 is ON.</p>`);
    }
    if (tab==='stack'){
      h=card('Is this the Ross zeuslib scheduler? No.', `<p>The openGear series README describes the cards as built on the Ross OGP-SDK-AVR (zeuslib task scheduler). The D6201 trees, like the D6203A found by the openGear plugin, do not use it:</p>
        <ul class="small"><li>No <span class="mono">osInit</span>, <span class="mono">osRun</span>, <span class="mono">gearos</span> or zeuslib file in D6201A/v104 or D6201B/v102–v103. The only “Zeus” text is in the headers <span class="mono">CANmsg.h</span> (“ZeusAVR common”) and <span class="mono">paramdef.h</span>.</li>
        <li>main() in v100w.c is a plain super-loop (eight routines), with timer0, timer1 and CAN interrupts from Ward-Beck’s own <span class="mono">CAN.c</span>.</li>
        <li>From the Ross SDK: <span class="mono">Ross Video/product.c</span>, <span class="mono">eeprom.c</span>, <span class="mono">process.h</span>, <span class="mono">types.h</span>, and the bootloader. The A calls <span class="mono">setBaseProductInfo()</span> (the D6203A does not), but no handler serves GET_PRODUCT_INFO, so the strings are stored and never sent. The B does not call it at all; product.c is still linked (V100W.mp: _getProductName …).</li>
        <li>DashBoard descriptors are hand-built byte arrays plus run-time builders (MESSAGE_CREATOR_PARAMETER_21/22/40/7B…), with a CRC table copied into CAN.c.</li></ul>`);
    }
    q('#d61sw').innerHTML=h;
  });
}

/* ---------------- findings ---------------- */
const FINDINGS = [
  ['One board, two products', `D6201A.h and D6201B.h differ in one line (<span class="mono">//#define AES2_AVAILABLE</span> vs <span class="mono">#define AES2_AVAILABLE</span>) plus the B’s mode defines. Both run on the D6201A ISS5 PCB (silk “D6201A, ISS5” on the B production photo). On an A, CS8416 #2 (U6), the IN2 front end (U3, T2), the AD1895 (U9), SW2 and the second LED group are fitted but idle; ALTERA_write() clears bit 5 every pass, so the AD1895 is held in reset for good.`],
  ['The D6201A shows a tone generator that does nothing', `Menu1OID_Message in the A’s Dashboard.c has count 3: 4.0, 3.2 and <b>3.5 Tone Generator</b>. The SET_PARAM handler stores tone_generation and reports it back, but ALTERA_write() in D6201A.c has the tone branch inside <span class="mono">/* … */</span> and always sets data_lower bit 2 (tone off). The FPGA still contains tone_gen1. The A manual describes no tone.`],
  ['Settings do not survive a power cycle the way the manuals suggest', `A: RESTORE_INFORMATION_EEPROM() is only called inside a commented-out block in main(), and SAVE_INFORMATION_EEPROM() stores only tone_generation (address 14) — and the A menu has no Save row anyway. B: saves mode and both tones (11, 13, 14) and restores them only with DIP SW7 ON. Neither build saves EQ1/EQ2 or Notify on Card Fault.`],
  ['A new card always says “OK”', `smpte_alarm_enabled (OID 4.0 “Notify on Card Fault”) starts at NO after every reset and is never saved. Card Status (2.1) only reports “No AES Audio Lock” when it is enabled, so after power-up an unplugged card reads OK until someone (or DataSafe) turns notification on.`],
  ['The heartbeat reports a random parameter', `When nothing is pending, PARAMETER_UPDATE() does <span class="mono">parameter_refresh++</span> on every main-loop pass (≈ 4 900/s on the A), not once per report. CAN_TX_TIMER sends whatever value it holds at the 0.960 s heartbeat, so the OID refreshed each second is effectively random. A real change (lock, EQ, mode, tone) waits for the next heartbeat: up to 0.96 s before DashBoard hears about it, and Card Status follows one heartbeat later (signal_status_change).`],
  ['V1.02 keeps announcing a restart', `In D6201B v102, CAN_TX_TIMER sends CANTRAP_RESTART whenever start_parameter_dump is NO, and only GET_NUMPARAMS sets it. A B card in a frame whose controller never opens it repeats the restart trap every 0.96 s. The “not released” v103 and the A V1.04 add <span class="mono">restart_sent</span> and send it once.`],
  ['DataSafe is two hidden OIDs', `V1.04 (A) and V1.03 (B) accept SET_PARAM on OIDs FF.07 and FF.08: FF.07 sets restore_start, which stops REPORT_PARAM in CAN_TX_TIMER; FF.08 clears it (restore_start = INVERT_DATA(v) & BIT0). The frame controller presumably brackets its restore of stored values with them ${infT('the handler names and the V104 “DataSafe” history entry')}. V1.02 has neither.`],
  ['The A source cannot simply be switched to dual', `In the A’s Dashboard.c the SIGNAL_STATUS branch is wrapped in <span class="mono">#ifdef AES2_AVAIABLE</span> (misspelt) / <span class="mono">#ifndef AES2_AVAILABLE</span>. Defining AES2_AVAILABLE there would remove both <span class="mono">if</span> lines and leave a dangling <span class="mono">else</span>. The B is a separate fork (its D6201B.h even keeps the guard <span class="mono">__D6201A_H</span>).`],
  ['DIP switches: two latches and a code', `B only. main() latches SW7 (dip_switch_enabled) and SW8 (dashboard_enabled) at boot. ALTERA_write() applies SW1–SW4 live only when SW7 is OFF <i>and</i> SW8 is ON; with SW8 OFF they act once at boot. SW1/SW2 are a code (SW1 ON = +2, SW2 ON = +1, clamped to 2), so “Not Used” (both ON) becomes 1x8 w/ SRC. D6201B-FUNCTIONAL.pdf still labels them SINGLE/DUAL and SRC ON/OFF. On the A the DIP is read every pass and ignored.`],
  ['SRC without a reference falls back silently', `In 1x8 w/ SRC, ALTERA_write() selects the AD1895 output only <span class="mono">if (aes2_lock == YES)</span>; otherwise all eight outputs carry AES1 at its own rate, tones forced off. Tone 1 is refused in SRC mode and tone 2 is accepted only in 2x4 (the reply is 0). PARAMETER_UPDATE pulses src_reset for SRC_CONSTANT + 1 = 4 passes whenever AES2 locks or the mode changes with AES2 locked.`],
  ['SRC output clock comes from the second receiver', `In D6201A.bdf the AD1895 output side (src_sclk_out, src_lrclk_out) is tied to CS8416 #2’s OSCLK/OLRCK nets and the result goes through the AES2 encoder. That is why H3/H4 can feed a frame reference (REF1/REF2 via Q2) into CS8416 #2: on a T6401A, where IN2 has no jack, it is the only way to run SRC.`],
  ['EQ switch: no debounce on the press, and timing that depends on the loop', `TRANSLATE_SWITCHES toggles on the first pass that sees the switch low; the 255-count debounce runs only after release, so it lasts 255 passes ≈ ${(255*passTime('A',0)*1000).toFixed(0)} ms on the A and ≈ ${(255*passTime('B',1)*1000).toFixed(0)} ms on a B in 2x4. SW1 and SW2 share one pb flag. A DashBoard EQ change sets both eq and peq, so it is never reported back as a change.`],
  ['Everything is rewritten every pass', `PROCESS_MODES writes CS8416 register 0x04 and ALTERA_write shifts all 16 control bits on every pass, whether or not anything changed — about ${Math.round(1/passTime('A',0)).toLocaleString()} identical SPI writes per second on the A. Lock is register 0x0C read every pass; with 0x06 = 0x10 only UNLOCK is unmasked, so any non-zero value means “no lock”.`],
  ['LEDs', `COM_ERROR_LED_ON is commented out everywhere: the Error LED never lights. COM ACTIVITY is switched on by every REPORT_PARAM and off only by the last frame of a multi-frame reply, so on an idle bus it stays on. On ISS5 the COM and ERROR LEDs (L8, L9) sit 0.73 in behind the card edge (PNP x 629.7 mil vs −95.3 for L2–L7), although both manuals list them in the edge column.`],
  ['Rear-module ID resistors are wired but never read', `AN_BMID (P1-2) and AN_BMID2 (P1-1) reach PF1 and PF2 with 1K pull-ups R53/R54, but adc_init() sets ADMUX = 0x00 and nothing changes it: only ADC0 (AN_SLOTID) is ever converted. The card cannot tell a T6301A from a T6401A; on a T6401A it silently loses IN2 and OUT2-x (T6401iss4.net wires only BNC1/3/5/7/9 of each card).`],
  ['Silent for most of a second at boot', `CAN_RX sets PD7, which the netlist routes to the SN65HVD233 LBK (loop-back) pin, not a direction control. The card stays off the bus through the wait() calls and the 100-sample slot-ID average: ${(bootLen('A')*1000).toFixed(0)} ms on the A. The B source contains the averaging block twice (copy-paste), so it boots in ${(bootLen('B')*1000).toFixed(0)} ms. The first frame then waits TX_INITIALIZE = 1000 × slot timer1 ticks (slot × 96 ms) after the 96 ms first overflow.`],
  ['Timer comments are off by 10× and 1000×', `timer0 reloads TCNT0 = 0x83 at clk/64 (125 × 8 µs = 1 ms; the code counts 1000 of them as ONE_SECOND) but the comment says 100 µs. timer1_init’s first load 0xD120 is 12 000 × 8 µs = 96 ms, while the comments say 96 µs (true only for the 0xFFF4 reloads). The heartbeat is therefore TX_HEARTBEAT + 2 = 10 002 ticks = 0.960 s.`],
  ['Leftovers from other cards', `Static descriptors that are never sent still sit in flash: Parameter21/24 with “Voiceover Unlocked” and “AES2 Input Unlocked” (the run-time MESSAGE_CREATOR_PARAMETER_21 replaces them). The B’s section headers 7.11/7.12/7.13 are named “Metadata”. A Dashboard.h gives AES2_LOCK and EQ1_ENABLE the same value (1). D6201A.h maps OUT1_SWITCH and OUT2_SWITCH1 to the same pin (PINA bit 3), and STROBE_READ (altera.h, PA1) shares a pin with DIP SW3-7; ALTERA_read() is never called, so the clash is latent. Both builds report BOARD_ISSUE 3 on an ISS5 board.`],
  ['Product names', `The B source has a Ross build named <b>DDA-8416</b> (README lists only Cobalt 9253). In V1.02 the Cobalt product-name length byte is 4 (“9253” without the NULL that every other string counts); V1.03 changes it to 5. The archived A tree is built with <span class="mono">#define COBALT</span> (9251), the B trees with WARD_BECK. The A calls setBaseProductInfo() but no handler ever sends those strings.`],
  ['No zeuslib', `The D6201 firmware is a Ward-Beck super-loop with its own CAN driver, like the D6203A (opengear.js). Only Ross headers, product.c, eeprom.c and the bootloader come from the OGP SDK.`],
  ['Output level and coupling', `From the netlist: FPGA 3.3 V → R 30 Ω → 374/750 Ω divider (≈ 2.2 V) → EL5263 follower → 75 Ω per BNC → ≈ 1.1 V p-p into 75 Ω (manual: 1 V p-p nominal). There is no series capacitor, so each output carries a DC offset of about half that swing (the rear modules add only 4n7 inductors).`],
  ['Configuration memory', `The README says EPCS1; the BOM and netlist fit an M25P40 (4 Mbit SPI flash) on a footprint named “EPCS1” (U11).`],
  ['Artwork 2026|59: card edge and rear modules now from CorelDRAW', `Card edges from ${SIM.src(FUNC+'D6201A-card-edge.cdr','D6201A-card-edge.cdr')} and ${SIM.src(FUNC+'D6201B-card-edge.cdr','D6201B-card-edge.cdr')} (2007-12-19); T6301A / T6401A from ${SIM.src(GUIDE+'D6201A - rear module options.cdr','D6201A - rear module options.cdr')} and ${SIM.src(GUIDE+'D6201B - rear module options.cdr','D6201B - rear module options.cdr')} (2012-01-16), which follow the build switch; T6201 from ${SIM.src(FUNC+'D6201B Rear Mod.cdr','D6201B Rear Mod.cdr')} (2008-10-23). What the art shows: the 2008|41 sheet heads its T6401A columns “CARD 1” (left) and “CARD 2” (right), the opposite of the 2012|45 guides’ “2 CARD 1” and of the slot/P101 mapping used here; ${SIM.src(FUNC+'D6201A-T6201.cdr','D6201A-T6201.cdr')} (2006|39) is captioned “DUAL 75Ω AES DA” with IN1/IN2 and OUT1-x/OUT2-x legends although the D6201A is a 1 × 8 DA, and its BNC drawings do not survive conversion (libcdr), so it is not used; the D6201A card edge has one EQ switch and five LEDs, the B two switches and eight, matching the two builds. Guide text is live Arial: words kept, alignment approximate.`]
];
const ASSUME = [
  `Loop timing: the bit-bang loops are counted exactly (14 cycles per bit); the other routines and the ISR costs are ${infT('instruction counts in the .lis files')} estimates.`,
  `CS8416 lock time ${C.LOCK_T*1e3} ms after a valid signal or an RXSEL change ${infT('typical PLL behaviour; not in the archive')}.`,
  `Cable model: ${C.LOSS_100M} dB per 100 m at 3.072 MHz, scaling with √f, limit 18 dB, so 600 m is the unequalised limit given in the manuals ${infT('the manuals’ 600 m figure')}. The EQ boost is computed from the netlist values. A 110 Ω termination on 75 Ω cable costs 3 dB ${infT('reflection loss')}.`,
  `EEPROM byte write 3.3 ms ${infT('the AT90CAN128 datasheet, not in the archive')}.`,
  `Frame controller behaviour (request order and gaps, re-query after a restart trap, DataSafe sequence) ${infT('the card-side handlers only')}.`,
  `T6401A: an even slot puts the card on P101 (left column) ${infT('nothing in the archive says which slot meets which connector')}.`,
  `DIP SW3 position 1 at the left, ON = up ${infT('D6201B-FUNCTIONAL.pdf drawing orientation')}; slot ADC reference 3 V ${infT('R55 pulled to the 3V rail')}.`,
  `Encoder “off” = no transitions on the line ${infT('the i2s8416_aes port comment “mute AES out in no lock condition”')}. Programme audio on the inputs is illustrative.`,
];
const SOURCES = [
  `${ENG}D6201A/Software/atmel/v104/ — v100w.c, D6201A.c/.h, cs84xx.c/.h, altera.c/.h, CAN.c/.h, Dashboard.c/.h, ADC.c/.h, common.c/.h, eeprom.c, *.lis, V100W.mp`,
  `${ENG}D6201B/Software/atmel/v102/ and v103 - not released/ — D6201B.c/.h, v100w.c, Dashboard.c, common.h`,
  `${ENG}D6201B/Software/altera/v101/ — D6201A.bdf, D6201A.qsf, shift_in16_version_out.vhd, switch2x1.vhd, sw2x2x1x24.vhd, i2s_par.vhd, tone_gen1.vhd, i2s8416_aes.vhd`,
  `${ENG}D6201A/PCB/D6201Aiss5.net; GERBERS/D6201AISS5.TOP/.TSM/.TSS/.DRL → assets/d6201-card-copper.png, d6201-card-silk.png`,
  `#OPENGEAR #SERIES/D6201B - #Master #OPENGEAR/D6201B - #Master/D6201BISS5 PNP PCAD.pnp, D6201B Photo.jpg`,
  `${ENG}D6201A/Functional/D6201B-FUNCTIONAL.pdf, D6201A-T6201/T6301/T6401.pdf; #OPENGEAR #SERIES/T6401 - #Master…/T6401iss4.net`,
  `#OPEN GEAR - #Engineering/…/openGear #Manuals #OBSOLETE/D6201A Manual.pdf, D6201B Manual.doc`,
  `Reused from sibling plugins: slot resistors (opengear.js ← OpenGear Frame Address ID.xls), rear-module positions and ID values (t6201.js, t6301.js).`,
];
function viewFindings(m){
  window.__d6201Active=false;
  m.innerHTML = card('What the D6201 firmware and board are up to', `<ol>${FINDINGS.map(([h,b])=>`<li style="margin-bottom:7px"><b>${h}.</b> ${b}</li>`).join('')}</ol>`) +
    card('Assumptions in this simulation', `<ul class="small">${ASSUME.map(a=>`<li>${a}</li>`).join('')}</ul>`) +
    card('Sources', `<ul class="small">${SOURCES.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><p class="small muted">Archive compiled by Anthony Peter Kuzub — WBSps.Kuzub.com · WBSps.ca</p>`);
}

SIM.register({
  footnotes:[
    {text:"The 2008 D6201B rear-module sheet heads T6401A’s left column “CARD 1” and the right “CARD 2”; the 2012 guides say “2 CARD 1” (card 2 on the left).", src:"#OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR/D6201 - #Engineering/D6201A/Functional/D6201B Rear Mod.cdr"},
    {text:"D6201A-T6201.cdr (2006) is captioned “DUAL 75Ω AES DA” with IN1/IN2 and OUT1-x/OUT2-x legends, although the D6201A is a 1 × 8 DA.", src:"#OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR/D6201 - #Engineering/D6201A/Functional/D6201A-T6201.cdr"},
    {text:"The BNC drawings in D6201A-T6201.cdr do not survive conversion with libcdr (only the IN1/IN2 discs remain), so the T6201 art comes from the 2008 D6201B sheet.", src:"#OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR/D6201 - #Engineering/D6201A/Functional/D6201A-T6201.cdr"},
    {text:"The D6201A and D6201B rear-module guides (2012) differ only in legends: A labels OUT 1–8 with position 2 “Not Connected”, B labels IN 2 and OUT1-x / OUT2-x.", src:"#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6201B - rear module options.cdr"},
    {text:"The D6201A card edge has one EQ switch and five LEDs; the D6201B edge has two EQ switches and eight LEDs (Lock/No Lock/EQ per input).", src:"#OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR/D6201 - #Engineering/D6201A/Functional/D6201B-card-edge.cdr"}],
  id:'d6201', product:'D6201', name:'D6201 · openGear 75 Ω AES DA, engineering parent of the D6201A/B (2008|41)', year:2008,
  folder:'#OPENGEAR #SERIES/D6201  # Problem is this the same as A #OPENGEAR', family:'openGear',
  summary:'The engineering parent of the D6201A (1×8) and D6201B (dual, 2×4 or 1×8 with SRC) openGear AES distribution amplifiers: one ISS5 board, two firmware builds. The model runs the real V1.04 / V1.02–V1.03 code paths — AT90CAN128 super-loop, bit-banged CS8416 and FPGA control, DashBoard over CAN — on the card drawn from its gerbers.',
  highlights:['Build switch: the same ISS5 board as D6201A or D6201B','Card from the ISS5 gerbers with live LEDs, EQ switches, DIP and H1–H4','DashBoard window fed by simulated CAN heartbeats and replies','One second: 4 900 loop passes, SPI, timer ticks, CAN and AES3 bits','EQ, SRC and tone paths traced through D6201A.bdf','Findings: a tone that does nothing, random heartbeats, unsaved EQ'],
  depth:'Full model', duration:1,
  stepUnits:[{label:'1 AES frame (IN1)', period:()=>1/D.s0.w.in1.fs},{label:'1 main-loop pass', period:()=>passTime(D.s0.w.build, D.s0.f.opmode||0)},{label:'96 µs timer1 tick', period:()=>C.T1},{label:'1 ms timer0', period:()=>1e-3},{label:'1 AES block (192 frames)', period:()=>192/D.s0.w.in1.fs},{label:'100 ms', period:()=>0.1}],
  zooms:[[1,'1 s (whole)'],[0.2,'200 ms'],[0.02,'20 ms'],[0.004,'4 ms (1 AES block)'],[0.001,'1 ms'],[0.0005,'500 µs'],[0.0002,'200 µs (≈1 pass)'],[0.00005,'50 µs'],[0.00002,'20 µs (1 AES frame)']],
  defaultZoom:0,
  init(){ window.__d6201Active=true; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial', render:viewTutorial},
    {id:'second', label:'One second', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
