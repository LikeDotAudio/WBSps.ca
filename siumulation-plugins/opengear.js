/* =====================================================================
   openGear series — Ward-Beck Systems openGear cards (2006|39–2016|49)
   Fully modelled card: D6203A stereo analog → AES A/D converter (V100 2008|41, V104 2009|42)
   OEM: Ross ADC-8432 / Cobalt 9345.  Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, under #OPENGEAR #SERIES/):
   - D6203A - #Master #OPENGEAR/D6203A #Software/atmel/v104/
       d6203_test.c   main(), REFRESH_LEDS, NO_LOCK_CHIRP, MIRROR, wait(), ADC reset sequence,
                      "1 cycle = 175us or 5714 cycles = 1 sec" (the main-loop pass time used here)
       D6203A.c/.h    ALTERA_write (16-bit control word), LED/port macros, reference/sample-rate codes
       CAN.c / CAN.h  timer0_ovf_isr (1 ms, 500 Hz on PB3), timer1_ovf_isr (96 µs ticks, 10 000-tick heartbeat),
                      can_rx_isr, CANRX, CANTX, MultiFrameMessageTransmission, CAN_FUNCTIONS, CANinit bit timing
       Dashboard.c    PARAMETER_UPDATE, CAN_TX_TIMER, DASHBOARD_RESPONSE_SETUP (every OID and message type),
                      SAVE/RESTORE_INFORMATION_EEPROM, MESSAGE_CREATOR_PARAMETER_21/22/40, brand strings
       ADC.c          AD_CONVERTER_SETUP, ADDRESS_TABLE (slot ID ladder)
       CANmsg.h, paramdef.h, OpenGear.h (Ross "ZeusAVR common" headers), Ross Video/process.h (BOOT_CONTROL)
       *_ztcpack.txt (zeuspack), D6203_TEST.mak/.mp/.aps (toolchain, code size), common.h (brand define)
   - D6203A #Software/altera/v100/  D6203.qsf (pins), D6203_1.bdf (block netlist), SR_DETECT_192.vhd,
       mclk_sel.vhd, i2s_gen_cuv.vhd, i2s8416_aes.vhd, shift_in/out.vhd, sel4_1.vhd, div_3_50.vhd, altpll2.vhd
   - D6203A #Software/atmel/Bootloader/common/ bootavr.c, upgrade.c, flashdrv.h, leds.h (Ross OGP bootloader)
   - D6203A #PCB/D6203Aiss4.net/.bom/.pnp and GERBERS/D6203AISS4.TSS/.TSM/.TOP (card artwork in assets/)
   - D6203A #Functional/D6203-T6302.pdf, D6203-T6402.pdf; T6302 .DXF and netlists of T6302/T6303/T6402/T6403/T6406
   - #OPEN GEAR - #Engineering/…/openGear #Manuals #OBSOLETE/D6203A Manual.pdf (2008 issue 1: LEDs, DIP, rear modules)
   - #OPEN GEAR - #Engineering/…/OpenGear Frame Address ID.xls (slot and rear-module ID resistors)
   - #OPEN GEAR - #Engineering/…/AA62XX/AA6201A V5.1 programming instruction.docx (fuses → bootloader → .bin)
   - #OPEN GEAR - #Engineering/…/OGP_SDK - #Engineering/ (zeuslib GearOS: gearos.c, ztctasks.c; avrinst.bat)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const infT = s => `<span class="tag-inf" title="${s.replace(/"/g,'&quot;')}">inferred</span>`;
const hx = (n,w) => (n>>>0).toString(16).toUpperCase().padStart(w||2,'0');

/* ---------------- constants from the source ---------------- */
const C = {
  LOOP_T: 175e-6,          // d6203_test.c: #define ADC_RESET_CONSTANT 5714 // 1 cycle = 175us or 5714 cycles = 1 sec
  ADC_RESET: 5714, RESET_MAX: 2, LOCK_CONSTANT: 25,
  CHIRP_ON: 1000, CHIRP_OFF: 7000,          // altera.h NO_LOCK_CHIRP_CONSTANT_ON/OFF
  T0: 1e-3,                // timer0: clk/64, TCNT0 = 0x83 → 125 counts = 1 ms (comment says 100us)
  T1_FIRST: 12000/125000,  // timer1: TCNT1 = 0xD120 → 12 000 counts = 96 ms (first overflow / after CANinit)
  T1_TICK: 12/125000,      // reload 0xFFF4 → 12 counts = 96 µs (comments say "96 ms")
  TX_FRAMES: 10, TX_HEART: 10000,           // CAN.c
  WAIT100: 0.100,          // 2 × wait(50000) "50ms of delay"
  BOOT: [
    [0.750, 'init_devices(); CAN_RX (transceiver loop-back); 15 × wait(50000) "50ms of delay"'],
    [0.612, 'slot ID: 100 × AD_CONVERTER_SETUP() (2 × wait(3000) between conversions) → ADDRESS_TABLE'],
    [0.150, 'ALTERA_RESET(1000); 5 × wait(30000) "150 ms delay"'],
    [0.002, 'init_CS8416(); ALTERA_write(); RESET_HIGH … RESET_LOW (the second 750 ms wait is skipped: i is still 15)'],
    [0.020, 'READ_DIP_SWITCHES · MIRROR · DATA_SETUP (CRC of every message) · CAN_setup (timers start) · EEPROM / DIP restore · CAN_TX'],
  ],
  WDT: 0.016,              // WDTCR = 0x08 → 16K WDT cycles ≈ 16 ms (AT90CAN128 data sheet, not in archive)
  CAN_BIT: 1e-6,           // CANBT1=0x00, CANBT2=0x04, CANBT3=0x12 at 8 MHz → 8 Tq of 125 ns = 1 Mbit/s
  STUFF: 1.1,
  CS_LOCK: 0.020,          // CS8416 lock acquisition — inferred
  DET_PERIOD: 0.016, DET_PHASE: 0.012,      // SR_DETECT_192: counter4(2) toggles every 4 × 2 ms; one update / 16 ms
  T0_SEC_PHASE: 0.25, HEART_FIRST: 0.42,    // phase of the 1 s timer0 count and of the heartbeat in a steady second — inferred
  MFC_GAP: 0.0004,         // frame-controller gap between request and next request — inferred
  EE_WRITE: 0.0085,        // AVR EEPROM byte write ≈ 8.5 ms (data sheet) — inferred
  CAL_FS: 8704,            // AK5394A offset-calibration cycle in LRCK periods — inferred (data sheet not archived)
};
const REF_NAMES = ['Frame Ref 1','Frame Ref 2','External','Internal'];   // Parameter33_Message choices; REFERENCE_1=0 … INTERNAL_REF=3
const REF_CODE  = ['REFERENCE_1','REFERENCE_2','EXTERNAL_REF','INTERNAL_REF'];
const SR_NAMES  = ['32kHz','44.1kHz','48kHz','96kHz','192kHz'];          // Parameter32_Message choices; SR_32 … SR_192
const SR_HZ     = [32000,44100,48000,96000,192000];
const SLOT_R    = [100000,30900,15000,9760,6980,5360,4320,3570,3010,2550,2210,1910,1650,1470,1270,1130,1000,887,787,681]; // Frame Address ID.xls
const PR_NAMES  = ['SIGNAL_STATUS','AES1_LOCK','SAMPLE_RATE','REFERENCE'];
const MSG = {0x00:'PRINT',0x10:'REPORT_PARAM',0x11:'TRAP',0x12:'EVENT_LOG',0x13:'BOOTING',0x40:'START_UPGRADE',0x41:'UPGRADE_PAGE',0x42:'VERIFY_UPGRADE',0x43:'REBOOT',0x44:'COMMAND',
  0x45:'GET_NUMPARAMS',0x46:'GET_PARAM_OIDS',0x47:'GET_DESCRIPTOR',0x48:'GET_PARAM_NAME',0x49:'GET_PARAM',0x4A:'SET_PARAM',0x4B:'SET_RELATIVE',0x50:'GET_MENUSET_NAME',0x51:'GET_MENU_COUNT',0x52:'GET_MENU_NAME',0x53:'GET_MENU_OIDS',
  0x54:'GET_PRODUCT_INFO',0x56:'GET_SNMP_BASE',0x57:'GET_SNMP_OID',0x58:'GET_SNMP_TRAP'};
const msgName = t => (t & 0x80) ? (MSG[t & 0x7F]||'0x'+hx(t&0x7F))+' resp' : (MSG[t]||'0x'+hx(t));

/* Brand: common.h #define WARD_BECK / ROSS_VIDEO / COBALT selects these strings in Dashboard.c */
const BRANDS = {
  WARD_BECK: {def:'WARD_BECK', product:'D6203A', supplier:'Ward-Beck Systems', menu0:[0x0105,0x0107,0x0102,0x010B,0x0104], bin:'D6203a_v1_04.bin', cfg:'wbs_ztcpack.txt'},
  ROSS_VIDEO:{def:'ROSS_VIDEO', product:'ADC-8432', supplier:'Ross Video Ltd', menu0:[0x0105,0x0107,0x0102,0x010B], bin:'adc-8432_v1_04.bin', cfg:'ross_ztcpack.txt'},
  COBALT:    {def:'COBALT', product:'9345', supplier:'Cobalt Digital', menu0:[0x0105,0x0107,0x0102,0x010B], bin:'9345_v1_04.bin', cfg:'cobalt_ztcpack.txt'},
};
const CARD_NAME = 'Analog to Digital Audio Converter';     // ParamName_Message
const WEBSITE = 'www.ward-beck.com';                        // ParamWebsite_Message (compiled into every brand)
/* ParamOIDS_Message: count byte says 10, but 12 OIDs follow */
const PARAM_OIDS = [0x0105,0x010B,0x0107,0x0306,0x0202,0x0301,0x0302,0x0303,0x0104,0x0102,0x0201,0x0400];
const MENU1_OIDS = [0x0201,0x0202];
const MENU2_OIDS = [0x0400,0x0302,0x0303,0x0305,0x0301];   // dashboard_enabled
const MENU3_OIDS = [0x0400,0x0302,0x0303,0x0305];          // DashBoard disabled by DIP 8: no Save
const OID = {
  0x0105:{name:'Product', desc:'ParameterProduct_Message', dlen:21, ro:true},
  0x0102:{name:'Supplier', desc:'ParameterManu_Message (WIDGET_TEXT_DISPLAY)', dlen:25, ro:true},
  0x0107:{name:'Name', desc:'ParameterName_Message', dlen:18, ro:true},
  0x010B:{name:'Software Rev', desc:'ParameterSoftware_Message', dlen:26, ro:true},
  0x0104:{name:'Website', desc:'ParameterWebsite_Message', dlen:21, ro:true},
  0x0201:{name:'Card Status', desc:'MESSAGE_CREATOR_PARAMETER_21 (ALARM_TABLE: OK / Ref Input Unlocked)', dlen:54, ro:true},
  0x0202:{name:'Ref Input', desc:'MESSAGE_CREATOR_PARAMETER_22 (ALARM_TABLE: Locked / Unlocked / Unlocked)', dlen:58, ro:true},
  0x0301:{name:'Settings', desc:'Parameter31_Message (CHOICE: Save)', dlen:27},
  0x0302:{name:'Internal Ref Sample Rate', desc:'Parameter32_Message (RADIO_HORIZONTAL, 5 choices)', dlen:88},
  0x0303:{name:'Reference', desc:'Parameter33_Message (RADIO_HORIZONTAL, 4 choices)', dlen:79},
  0x0305:{name:'(OID 3.5)', desc:'listed in Menu2/Menu3 OIDs but not handled: CANRESP_UNSUPPORTED', dlen:0, missing:true},
  0x0306:{name:'AD Result', desc:'Parameter36_Message (slot-ID ADC reading; DEBUG menu only)', dlen:29, ro:true},
  0x0400:{name:'Notify on Card Fault', desc:'MESSAGE_CREATOR_PARAMETER_40 (CHECKBOX No / Yes)', dlen:48},
};
const oidTxt = o => ((o>>8)&0xFF)+'.'+(o&0xFF);

/* ---------------- rear modules (netlists + manual Fig. 2 + T6302 DXF) ---------------- */
/* role: refin, out75, out110, ainL, ainR, nc.  P1 pin = card edge pin the position lands on. */
const REARS = {
  T6302:{name:'T6302 — single card, 6 BNC + 4 TB (75 Ω)', dual:false, id:'3K57 / 4K32', src:'T6302-iss3.net · D6203-T6302.pdf · T6302.DXF',
    pos:[['IN','bnc','refin',97],['NOT USED','bnc','nc',92],['OUT1','bnc','out75',75],['OUT3','bnc','out75',80],['OUT2','bnc','out75',37],['OUT4','bnc','out75',34],
         ['LEFT','tb','ainL','55/57'],['AES1 (N/C)','tb','nc','56/58'],['RIGHT','tb','ainR','49/51'],['AES2 (N/C)','tb','nc','50/52']]},
  T6303:{name:'T6303 — single card, 10 TB (110 Ω)', dual:false, id:'3K57 / 3K57', src:'T6303-iss3.net · manual Fig. 2',
    pos:[['REF IN','tb','refin',97],['N/C','tb','nc',92],['OUT1','tb','out110','67/69'],['OUT3','tb','out110','68/70'],['OUT2','tb','out110','61/63'],['OUT4','tb','out110','62/64'],
         ['LEFT','tb','ainL','55/57'],['N/C','tb','nc','56/58'],['RIGHT','tb','ainR','49/51'],['N/C','tb','nc','50/52']]},
  T6402:{name:'T6402 — dual card, 6 BNC + 4 TB (75 Ω)', dual:true, id:'3K57 / 1K', src:'T6402-iss2.net · D6203-T6402.pdf',
    pos:[['IN #2','bnc','refin',97],['IN #1','bnc','refin',97],['OUT1 #2','bnc','out75',75],['OUT1 #1','bnc','out75',75],['OUT2 #2','bnc','out75',37],['OUT2 #1','bnc','out75',37],
         ['LEFT #2','tb','ainL','55/57'],['LEFT #1','tb','ainL','55/57'],['RIGHT #2','tb','ainR','49/51'],['RIGHT #1','tb','ainR','49/51']]},
  T6403:{name:'T6403 — dual card, 10 TB (110 Ω)', dual:true, id:'3K57 / 887R', src:'T6403-iss2.net · manual Fig. 2',
    pos:[['REF IN #2','tb','refin',97],['REF IN #1','tb','refin',97],['OUT1 #2','tb','out110','67/69'],['OUT1 #1','tb','out110','67/69'],['OUT2 #2','tb','out110','61/63'],['OUT2 #1','tb','out110','61/63'],
         ['LEFT #2','tb','ainL','55/57'],['LEFT #1','tb','ainL','55/57'],['RIGHT #2','tb','ainR','49/51'],['RIGHT #1','tb','ainR','49/51']]},
};

/* ---------------- series (README index + a grep of each card's firmware tree) ---------------- */
const SERIES = [
  {id:'D6201A', type:'AES DA 1×8, 75 Ω', oem:'Ross ADA-8401-A / Cobalt 9251', mcu:'AT90CAN128', fpga:'EP1C3', dsp:'—', ic:'CS8416', stack:'WBS', rear:'T6201, T6301, T6401'},
  {id:'D6201B', type:'AES DA dual input', oem:'Cobalt 9253', mcu:'AT90CAN128', fpga:'EP1C3', dsp:'—', ic:'CS8416 ×2', stack:'WBS', rear:'T6301, T6401'},
  {id:'D6202A', type:'AES DA 1×8, 110 Ω', oem:'Ross ADA-8401-B / Cobalt 9252', mcu:'AT90CAN128', fpga:'Lattice XP3 (iss 2) → EP1C3', dsp:'—', ic:'CS8416', stack:'WBS', rear:'T6203, T6204, T6303, T6403'},
  {id:'D6202B', type:'AES DA dual input, 110 Ω', oem:'—', mcu:'AT90CAN128', fpga:'EP1C3', dsp:'—', ic:'CS8416', stack:'WBS', rear:'T6203, T6303, T6403'},
  {id:'D6203A', type:'Stereo analog → AES A/D', oem:'Ross ADC-8432 / Cobalt 9345', mcu:'AT90CAN128', fpga:'EP1C3T100 + EPCS1', dsp:'—', ic:'AK5394A, CS8416, PLL1705', stack:'WBS', rear:'T6302, T6303, T6402, T6403', model:true},
  {id:'D6204A', type:'AES → analog D/A', oem:'Ross DAC-8416 / Cobalt 9262', mcu:'AT90CAN128', fpga:'Cyclone', dsp:'—', ic:'AK4396', stack:'WBS', rear:'T6302, T6402'},
  {id:'D6207A', type:'Dolby E / AC-3 decoder', oem:'Ross DED-8420', mcu:'AT90CAN128', fpga:'EP1C12', dsp:'CAT552 module', ic:'CS8416', stack:'WBS', rear:'T6305'},
  {id:'AA6201A', type:'Analog audio DA (SNMP from v5)', oem:'Cobalt 9241 / Ross ADA-8404-C', mcu:'AT90CAN128', fpga:'—', dsp:'—', ic:'AVR ADC silence detect', stack:'WBS', rear:'T6203, T6303, T6403, T6406'},
  {id:'AV6201A', type:'Analog video DA', oem:'Cobalt 9231', mcu:'AT90CAN128', fpga:'—', dsp:'—', ic:'EL2244, LMH1981', stack:'WBS', rear:'T6201, T6301, T6401'},
  {id:'AV6202A', type:'Analog video DA', oem:'Cobalt 9233', mcu:'AT90CAN128', fpga:'—', dsp:'—', ic:'—', stack:'WBS', rear:'T6301, T6401'},
  {id:'M6202A', type:'HD/SD-SDI de-embedder + Dolby', oem:'—', mcu:'AT90CAN128', fpga:'EP1C12', dsp:'CAT552', ic:'Gennum', stack:'WBS', rear:'T6204, T6304, T6306'},
  {id:'M6203A', type:'SD/HD/3G reclocking DA', oem:'—', mcu:'AT90CAN128', fpga:'—', dsp:'—', ic:'GS2974A/GS2975A/GS2978', stack:'WBS', rear:'T6301, T6401'},
  {id:'M6204A', type:'4-group SDI audio embedder', oem:'—', mcu:'AT90CAN128', fpga:'EP2C35', dsp:'—', ic:'Gennum', stack:'WBS', rear:'T6301, T6308'},
  {id:'M6205', type:'SDI audio processor', oem:'customer variants', mcu:'AT90CAN128', fpga:'EP2C35', dsp:'ADSP-21262', ic:'Gennum', stack:'WBS (C100) → zeuslib/GearOS (v6xx DTS)', rear:'T6307 (+T6301A…)'},
  {id:'M6205-3G', type:'3G SDI processor (R&D)', oem:'—', mcu:'AT90CAN128', fpga:'Xilinx refs / PugMedia core', dsp:'DTS / Dolby cards', ic:'—', stack:'zeuslib/GearOS', rear:'T6301A-3G'},
  {id:'M6206', type:'SDI de-embedder + voice-over', oem:'Astral Media', mcu:'AT90CAN128', fpga:'EP1C12', dsp:'ADSP-21262', ic:'CAT552', stack:'WBS', rear:'T6304, T6305'},
];

/* ---------------- slot ID (ADC.c ADDRESS_TABLE, exact thresholds) ---------------- */
function slotAdc(slot){ const R=SLOT_R[slot-1]; return Math.min(1023, Math.round(1024*R/(R+1000))); }
function ADDRESS_TABLE(v){
  const th=[1011,980,948,915,883,851,820,788,755,725,692,658,629,593,563,532,502,471,435,406];
  if (v>1011 && v<=1023) return 1;
  for (let i=1;i<th.length;i++) if (v>th[i] && v<=th[i-1]) return i+1;
  return 21;
}
/* DIP: SW1..SW8 on PA7..PA0 (netlist OUT1_1SW = U7-44 = PA7 … OUT2_4SW = U7-51 = PA0); ON = closed = 0 */
function dipRaw(dip){ let r=0; for (let i=0;i<8;i++) if (!dip[i]) r |= (1<<(7-i)); return r; }      // PINA, pull-ups
function dipDecode(dip){
  const raw=dipRaw(dip), inv=raw^0xFF;
  let ref=0; if (inv&0x40) ref+=1; if (inv&0x80) ref+=2;
  let sr=0; if (inv&0x08) sr+=1; if (inv&0x10) sr+=2; if (inv&0x20) sr+=4; if (sr>4) sr=4;
  let m=0; for (let b=0;b<8;b++) if (raw&(1<<b)) m|=(1<<(7-b));                                     // MIRROR()
  return {raw, ref, sr, dipEnabled: !!(m&0x40), dashEnabled: !!(m&0x80)};
}

/* ---------------- world + firmware state ---------------- */
function mkWorld(){ return {
  slot:4, rear:'T6302', pos:1, card:true, rearIn:true, mfc:true, brand:'WARD_BECK', ver:'1.04',
  ref1:{on:true, fs:48000}, ref2:{on:false, fs:48000}, ext:{on:false, fs:48000},
  L:{on:true, dBu:4, f:1000}, R:{on:true, dBu:4, f:400},
  dip:[true,true,false,true,false,false,true,false],            // SW1..8 ON?  assumed shipping setting — inferred
  H1:-20, H2:-20, H3:75, rv:[0,0],
};}
function mkFw(w){
  const d=dipDecode(w.dip);
  return {
    mode:'app', modeEnd:Infinity, bootIx:-1, timersOn:true, rearIn:true,
    reference:3, sample_rate:2, psample_rate:2, preference:3, reference_sel:3, preference_sel:3,
    Astatus:0, pAstatus:0, lock_status_changed:0, clocks_stable:0, clocks_stable_count:0,
    reset_adc:0, reset_count:0, nres:2, ALTERA1:0, ALTERA2:(3<<5)|(2<<2)|3, pALTERA1:0, fpgaStat:0, da_disabled:0,
    chirp_on:0, no_lock_counter:600, leds:0,
    dashboard_enabled: d.dashEnabled?1:0, dip_switch_enabled: d.dipEnabled?1:0, notify:0, restore_start:0, save_settings:0,
    parameter_change:0, parameter_refresh:2, parameter_tx_complete:1, Astatus_change:0, sample_rate_change:0, signal_status_change:0,
    restart_sent:1, frame_count:0, job:null, txc: C.TX_HEART+1-Math.round(C.HEART_FIRST/C.T1_TICK), init:0, rxCount:0, quiet:3,
    t0c: 1000-Math.round(C.T0_SEC_PHASE/C.T0), comLed:1, reboot_device:0, upgrade_device:0, mob_error:0,
    ee:{valid:1, ref:3, sr:2, bootc:0xFF},
    cs:{locked:0, at:Infinity}, det:{d96:0, d192:0},
    busyUntil:0, completed:1,
    mfcQ:[], mfcWait:false, mfcNext:Infinity,
    rstn:1, calUntil:-1, slotAdc:0, mod:0x10+4,
    nextPass:0.00002, nextT1:0.00004, nextT0:0.0005, nextDet:C.DET_PHASE,
    loaderAt:null, bootMsgAt:null, upgrade:null,
    cache:null, seen:true,
  };
}
const D = {
  w: mkWorld(), s0:null, ev:[], second:1, log:[], lastTrace:[], ver:0, R:null, Rver:-1,
  ui:{ dashTab:'status', dashMenu:0, rearSel:null, series:'D6203A', upl:null, autoFollow:true },
};
function resetAll(){
  D.w = mkWorld(); D.s0 = { w: JSON.parse(JSON.stringify(D.w)), f: mkFw(D.w) };
  D.s0.f.slotAdc = slotAdc(D.w.slot); D.s0.f.mod = 0x10 + ADDRESS_TABLE(D.s0.f.slotAdc);
  D.s0.f.cache = cacheFromFw(D.s0.f, D.s0.w);
  D.ev = []; D.second = 1; D.log = []; D.lastTrace = []; D.ver++; D.ui.upl=null;
}
function deep(o){ return JSON.parse(JSON.stringify(o, (k,v)=> v===Infinity? '__inf' : v), (k,v)=> v==='__inf'? Infinity : v); }

/* ---------------- what each OID reads (GET_PARAM / REPORT_PARAM values) ---------------- */
function refInputVal(f){ if (!f.Astatus && f.reference!==3) return f.notify? 4 : 2; return 1; }   // BIT2 / BIT1 / BIT0
function cardStatusVal(f){ return (!f.Astatus && f.reference!==3 && f.notify)? 4 : 0; }
function oidValue(f, w, oid){
  const B=BRANDS[w.brand];
  switch(oid){
    case 0x0201: return cardStatusVal(f);
    case 0x0202: return refInputVal(f);
    case 0x0302: return f.sample_rate;
    case 0x0303: return f.reference;
    case 0x0301: return 0;
    case 0x0306: return f.slotAdc;
    case 0x0400: return f.notify;
    case 0x0105: return B.product;
    case 0x0102: return B.supplier;
    case 0x0107: return CARD_NAME;
    case 0x010B: return w.ver;
    case 0x0104: return WEBSITE;
  }
  return null;
}
function cacheFromFw(f,w){ const c={}; [0x0105,0x0102,0x0107,0x010B,0x0104,0x0201,0x0202,0x0301,0x0302,0x0303,0x0400].forEach(o=>c[o]=oidValue(f,w,o)); return c; }
function valTxt(oid, v){
  if (v===null || v===undefined) return '—';
  if (oid===0x0202) return v===1? 'Locked' : 'Unlocked';
  if (oid===0x0201) return v===0? 'OK' : 'Ref Input Unlocked';
  if (oid===0x0302) return SR_NAMES[v]||String(v);
  if (oid===0x0303) return REF_NAMES[v]||String(v);
  if (oid===0x0400) return v? 'Yes':'No';
  if (oid===0x0301) return 'Save';
  return String(v);
}

/* ---------------- hardware helpers ---------------- */
function rearDef(w){ return REARS[w.rear]; }
function hasRef(w){ return w.rearIn && !!rearDef(w); }
function csSource(f,w){  // sel4_1 in the FPGA: aes_sw = reference bits 1..0 → REF1 / REF2 / REF3_EXT / GND
  switch(f.reference){
    case 0: return {on:w.ref1.on, fs:w.ref1.fs, name:'REF1 (midplane P2-14 → U12)'};
    case 1: return {on:w.ref2.on, fs:w.ref2.fs, name:'REF2 (midplane P2-10 → U14)'};
    case 2: return {on:w.ext.on && hasRef(w), fs:w.ext.fs, name:'REF3_EXT (rear P1-97 → T1 → U9)'};
    default: return {on:false, fs:0, name:'GND (sel4_1 in4)'};
  }
}
function fsActual(f,w){
  if (f.reference_sel===3) return SR_HZ[f.sample_rate];
  const s=csSource(f,w); return s.on? s.fs : SR_HZ[f.sample_rate];
}
function dfsOf(f,w){ const fs=fsActual(f,w); return fs>125000? 2 : fs>60000? 1 : 0; }
function headroom(h){ return h===-20? 24 : 22; }      // 0 dBFS = +24 / +22 dBu with +4 dBu nominal (manual Fig. 1 "H1 -20 / -18") — inferred
function chanDbfs(w, k){ const inp=k? w.R : w.L; if (!inp.on || !w.rearIn) return null; return inp.dBu - headroom(k? w.H2 : w.H1) + w.rv[k]; }
function frameTime(n){ return (67 + 8*n) * C.CAN_BIT * C.STUFF; }
function canId(prio, src, dst, type, flags){ return ((prio&3)<<27) | ((src&0x3F)<<19) | ((dst&0x3F)<<13) | ((type&0xFF)<<5) | (flags&0x1F); }
function msgLen(kind, w, f){
  const B=BRANDS[w.brand];
  const s = x => 4 + x.length + 1;
  switch(kind){
    case 'MenuSet': return s('Status'); case 'MenuSet1': return s('Control');
    case 'MenuName': return s('Card Info'); case 'MenuName0': return s('Card Status'); case 'MenuName1': return s('Card Settings');
    case 'Menu0OID': return 4 + 2*B.menu0.length; case 'Menu1OID': return 8; case 'Menu2OID': return 14; case 'Menu3OID': return 12;
    case 'ParamOIDS': return 28;
    case 'ParamProductName': return s(B.product); case 'ParamManuName': return s(B.supplier); case 'ParamName': return s(CARD_NAME);
    case 'ParamSoftwareRev': return 9; case 'ParamWebsite': return s(WEBSITE);
  }
  return 8;
}
function multiFrames(len){ const n=Math.floor((len+4)/8); const fr=[]; for (let i=0;i<n;i++) fr.push({len:8, flags:i===0?2:0}); fr.push({len: len-(n*8-4), flags:1}); return fr; }

/* =====================================================================
   SIMULATION — a discrete-event port of main(), the three ISRs and the frame controller,
   run over one second. Re-run whenever the world or the event list changes.
   ===================================================================== */
function simulate(){
  const S = deep(D.s0); const w = S.w, f = S.f;
  const ev = D.ev.slice().sort((a,b)=>a.t-b.t);
  const R = { snaps:[], can:[], segs:[], notes:[], ticks0:[], dashUpd:[], sends:[], end:null, passes:0, worlds:[{t:0, w:deep(w)}] };
  let ei = 0, t = 0;
  const T_END = 1;
  const snap = (tt, extra) => R.snaps.push(Object.assign({ t:tt, mode:f.mode, ref:f.reference, refSel:f.reference_sel, sr:f.sample_rate,
      A:f.Astatus, st:f.clocks_stable, rst:f.reset_adc, rstn:f.rstn, chirp:f.chirp_on, leds:f.leds, a1:f.ALTERA1, a2:f.ALTERA2,
      fs: fsActual(f,w), dfs: dfsOf(f,w), com:f.comLed, init:f.init, pr:f.parameter_refresh, pc:f.parameter_change, nres:f.nres, rc:f.reset_count,
      cal: f.calUntil>tt, da:f.da_disabled, step:-1 }, extra||{}));
  const seg = (t0,t1,kind,label) => R.segs.push({t0,t1,kind,label});
  const note = (tt,s) => R.notes.push({t:tt, s});

  /* ---- CAN bus ---- */
  function txFrame(tt, type, flags, data, desc, dst, oid, val){
    const start = Math.max(tt, f.busyUntil); const dur = frameTime(data.length);
    f.busyUntil = start + dur; f.completed = 0;
    const fr = {t:start, dur, dir:'tx', src:f.mod, dst:(dst===undefined? 0x10 : dst), type, flags, data, desc, oid, val};
    R.can.push(fr); return fr;
  }
  function rxFrame(tt, req){
    const data=[0x00, req.b1||0, req.b2||0]; if (req.type===0x4A) data.push(0x02, 0x00, req.val&0xFF);
    const dur=frameTime(data.length); const start=Math.max(tt, f.busyUntil); f.busyUntil=start+dur;
    const fr={t:start, dur, dir:'rx', src:0x10, dst:f.mod, type:req.type, flags:3, data, desc:req.desc||msgName(req.type), oid:req.oid};
    R.can.push(fr); return start+dur;
  }
  /* DASHBOARD_RESPONSE_SETUP — what the card answers */
  function respond(tt, req){
    const o = req.oid, type=req.type, rt = type|0x80;
    const single = (data, desc, oid, val) => { f.frame_count=0; f.job=null; return txFrame(tt, rt, 3, data, desc, 0x10, oid, val); };
    const unsup = why => single([0x01], 'CANRESP_UNSUPPORTED'+(why?' — '+why:''));
    const multi = (len, name) => { const fr=multiFrames(len); f.job={type:rt, frames:fr, i:1, name, len}; f.frame_count=1;
        const x = txFrame(tt, rt, fr[0].flags, new Array(fr[0].len).fill(0), name+' frame 1/'+fr.length+' (len '+len+', CRC)'); f.comLed=1; return x; };
    const b1=(o>>8)&0xFF, b2=o&0xFF;
    switch(type){
      case 0x45: return single([0x00,0x00,10], 'NUMPARAMS = 10 (*(ParamOIDS_Message+3))');
      case 0x46: return multi(msgLen('ParamOIDS',w,f), 'ParamOIDS_Message');
      case 0x47: {
        if (!OID[o] || OID[o].missing) return unsup('no descriptor for '+oidTxt(o));
        if (o===0x0201||o===0x0202||o===0x0400) return multi(OID[o].dlen, OID[o].desc.split(' ')[0]);
        return multi(OID[o].dlen, OID[o].desc.split(' ')[0]);
      }
      case 0x49: {
        if (o===0x0105) return multi(msgLen('ParamProductName',w,f),'ParamProductName_Message');
        if (o===0x0107) return multi(msgLen('ParamName',w,f),'ParamName_Message');
        if (o===0x0102) return multi(msgLen('ParamManuName',w,f),'ParamManuName_Message');
        if (o===0x010B) return multi(msgLen('ParamSoftwareRev',w,f),'ParamSoftwareRev_Message (MultiFrameMessageTransmission1)');
        if (o===0x0104) return multi(msgLen('ParamWebsite',w,f),'ParamWebsite_Message');
        const v = oidValue(f,w,o); if (v===null) return unsup(oidTxt(o));
        return single([0x00,b1,b2,0x02,(o===0x0306? (v>>8):0), v&0xFF], 'GET_PARAM '+oidTxt(o)+' = '+valTxt(o,v), o, v);
      }
      case 0x4A: {
        const v = req.val;
        if (o===0x0303){ if (f.dashboard_enabled) f.reference=v; csEval(tt); return single([0,b1,b2,2,0,f.dashboard_enabled? v : f.reference], 'SET Reference → '+(f.dashboard_enabled? 'reference = '+v : 'refused (DIP 8 ON) — echoes '+f.reference), o, f.dashboard_enabled? v : f.reference); }
        if (o===0x0302){ if (f.dashboard_enabled) f.sample_rate=v; return single([0,b1,b2,2,0,f.dashboard_enabled? v : f.sample_rate], 'SET Internal Ref Sample Rate → '+(f.dashboard_enabled? 'sample_rate = '+v : 'refused — echoes '+f.sample_rate), o, f.dashboard_enabled? v : f.sample_rate); }
        if (o===0x0301){ f.save_settings = (v ^ 0xFF) & 0xFF; return single([0,b1,b2,2,0,v], 'SET Settings → save_settings = INVERT_DATA('+v+') = 0x'+hx(f.save_settings), o, v); }
        if (o===0x0400){ f.notify=v; return single([0,b1,b2,2,0,v], 'SET Notify on Card Fault → smpte_alarm_enabled = '+v, o, v); }
        if (o===0xFF07){ f.restore_start=v; return single([0,b1,b2,2,0,v], 'SET 255.7 → restore_start = '+v); }
        if (o===0xFF08){ f.restore_start=((v^0xFF)&1); return single([0,b1,b2,2,0,v], 'SET 255.8 → restore_start = '+f.restore_start); }
        return unsup(oidTxt(o));
      }
      case 0x50: return (b1<2)? multi(msgLen(b1?'MenuSet1':'MenuSet',w,f), b1?'MenuSet1_Message "Control"':'MenuSet_Message "Status"') : unsup();
      case 0x51: return (b1<2)? single([0,b1,b1?1:2], 'MENU_COUNT set '+b1+' = '+(b1?1:2)) : unsup();
      case 0x52: { const k=b1+'.'+b2; const m={'0.0':['MenuName','"Card Info"'],'1.0':['MenuName1','"Card Settings"'],'0.1':['MenuName0','"Card Status"']}[k]; return m? multi(msgLen(m[0],w,f), m[0]+'_Message '+m[1]) : unsup(); }
      case 0x53: { const k=b1+'.'+b2; if (k==='0.0') return multi(msgLen('Menu0OID',w,f),'Menu0OID_Message'); if (k==='0.1') return multi(8,'Menu1OID_Message');
                   if (k==='1.0') return f.dashboard_enabled? multi(14,'Menu2OID_Message') : multi(12,'Menu3OID_Message (no Save)'); return unsup(); }
      case 0x43: f.reboot_device=1; return single([0x00], 'REBOOT ok → reboot_device = YES');
      case 0x40: f.reboot_device=1; f.upgrade_device=1; return single([0x14,0x03,0xE8], 'CAN_UPGRADE_WAIT, 0x03E8 = 1000 ms → reboot_device = upgrade_device = YES');
      default: return unsup();
    }
  }
  /* bootloader's rxHandler (bootavr.c / upgrade.c) */
  function loaderRespond(tt, req){
    if (req.type===0x40){
      const ok = req.file && req.file.compat.indexOf(BRANDS[w.brand].product)>=0;
      if (!ok){ txFrame(tt, 0xC0, 3, [0x11], 'startUpgrade: CAN_INVALID_PRODUCT (isCompatibleProduct fails)'); return; }
      f.upgrade = {file:req.file, at:tt}; txFrame(tt, 0xC0, 3, [0x00], 'startUpgrade: CANRESP_OK — flashErasePage(PROGRAM_SIGNATURE), upgradeState = USTATE_UPGRADING');
      return;
    }
    if (req.type===0x43){ txFrame(tt, 0xC3, 3, [0x00], 'rebootApp'); return; }
    txFrame(tt, req.type|0x80, 3, [0x01], 'sendCanErrorMessage(CANRESP_UNSUPPORTED)');
  }
  /* CAN_TX_TIMER (called from timer1_ovf_isr) */
  function canTxTimer(tt){
    if (f.completed){
      f.completed = 0;
      if (f.frame_count===0 && !f.restart_sent){
        txFrame(tt, 0x11, 3, [0x01], 'TRAP CANTRAP_RESTART → CANADDR_TRAP', 0x02); f.restart_sent=1;
      } else if (f.frame_count===0 && !f.restore_start){
        f.comLed = 1;
        const pr=f.parameter_refresh; let oid, val;
        if (pr===1){ oid=0x0202; val=refInputVal(f); }
        else if (pr===3){ oid=0x0303; val=f.reference; }
        else if (pr===0){ oid=0x0201; val=cardStatusVal(f); }
        else { oid=0x0302; val=f.sample_rate; }
        txFrame(tt, 0x10, 3, [0x00,(oid>>8),oid&0xFF,2,0,val], 'REPORT_PARAM '+PR_NAMES[pr]+' ('+oidTxt(oid)+') = '+valTxt(oid,val), 0x02, oid, val);
        f.parameter_tx_complete=1; f.parameter_change=0;
        R.sends.push(tt);
      } else if (f.frame_count!==0 && f.job){
        const j=f.job, fr=j.frames[j.i];
        txFrame(tt, j.type, fr.flags, new Array(fr.len).fill(0), j.name+' frame '+(j.i+1)+'/'+j.frames.length+(fr.len===0?' (zero-length last frame)':''));
        j.i++; if (j.i>=j.frames.length){ f.frame_count=0; f.job=null; f.comLed=0; } else f.frame_count=j.i;
      }
    } else { f.comLed = 0; }
  }
  function t1Tick(tt){
    if (f.busyUntil<=tt) f.completed=1;                 // CANTX_BUFFER_CHECK finds the MOb free
    if (f.frame_count!==0){
      canTxTimer(tt);
      if (f.frame_count!==0){ if (f.txc > C.TX_FRAMES){ if (f.busyUntil<=tt) f.completed=1; canTxTimer(tt); f.txc=0; } else f.txc++; }
    } else if (f.init){ if (f.txc > 1000*(f.mod-0x10)){ canTxTimer(tt); f.txc=0; } else f.txc++; }
    else { if (f.txc > C.TX_HEART){ canTxTimer(tt); f.txc=0; } else f.txc++; }
    f.nextT1 = tt + C.T1_TICK;
  }
  function t0Tick(tt){
    if (f.t0c >= 1000){
      if (f.rxCount < 10){ f.quiet++; if (f.quiet>=3 && f.init){ f.init=0; note(tt,'timer0: < 10 messages for 3 s → dashboard_initializing = NO (heartbeat every 10 000 ticks)'); } }
      else { if (!f.init) note(tt,'timer0: '+f.rxCount+' messages in the last second → dashboard_initializing = YES (report every 1000 × slot ticks)'); f.init=1; f.quiet=0; }
      f.rxCount=0; f.t0c=0; R.ticks0.push({t:tt, sec:true});
    } else f.t0c++;
    f.nextT0 = tt + C.T0;
  }
  /* CS8416 lock model */
  function csEval(tt){
    const s=csSource(f,w);
    if (!s.on){ if (f.cs.locked || f.cs.at!==Infinity){ f.cs.locked=0; f.cs.at=Infinity; f.cs.fs=0; } return; }
    if (f.cs.locked && f.cs.fs!==s.fs){ f.cs.locked=0; f.cs.at=tt+C.CS_LOCK; }
    if (!f.cs.locked && f.cs.at===Infinity) f.cs.at = tt + C.CS_LOCK;
    f.cs.fsT = s.fs;
  }
  function detUpdate(tt){
    if (f.cs.locked){ const fs=f.cs.fs||0; f.det.d96 = (fs>60000 && fs<=125000)?1:0; f.det.d192 = fs>125000?1:0; }
    const dfs = dfsOf(f,w);
    f.fpgaStat = f.det.d96 | (f.det.d192<<1) | (dfs<<2) | ((f.calUntil>tt?1:0)<<4);
    f.nextDet = tt + C.DET_PERIOD;
  }
  function refreshLeds(){
    let L=0; const set=b=>L|=(1<<b);       // bits: 0 REF1, 1 REF2, 2 EXT, 3 INT, 4 CAL, 5 COM
    const r=f.reference;
    if (r===3) set(3);
    else if (r===2){ if (f.Astatus) set(2); else { set(3); if (f.chirp_on) set(2); } }
    else if (r===0){ if (f.Astatus) set(0); else { set(3); if (f.chirp_on) set(0); } }
    else if (r===1){ if (f.Astatus) set(1); else { set(3); if (f.chirp_on) set(1); } }
    if (f.reset_adc) set(4);
    if (f.comLed) set(5);
    return L;
  }
  /* PARAMETER_UPDATE */
  function paramUpdate(){
    if (f.parameter_change) return;
    if (f.Astatus_change){ f.Astatus_change=0; f.parameter_refresh=1; f.parameter_change=1; f.signal_status_change=1; }
    else if (f.reference!==f.preference){ f.parameter_refresh=3; f.parameter_change=1; f.preference=f.reference; }
    else if (f.sample_rate_change){ f.sample_rate_change=0; f.parameter_refresh=2; f.parameter_change=1; }
    else if (f.signal_status_change){ f.parameter_refresh=0; f.parameter_change=1; f.signal_status_change=0; }
    else if (f.parameter_tx_complete){ f.parameter_refresh = f.parameter_refresh>=3? 0 : f.parameter_refresh+1; }
  }
  /* one pass of while(1) in main() */
  function mainPass(tt){
    R.passes++;
    csEval(tt);
    f.Astatus = f.cs.locked?1:0;
    if (f.dip_switch_enabled && !f.dashboard_enabled){ const d=dipDecode(w.dip); if (d.ref!==f.reference){ f.reference=d.ref; csEval(tt); } f.sample_rate=d.sr; }
    f.reference_sel = (f.Astatus && f.clocks_stable)? f.reference : 3;
    f.ALTERA2 = (f.da_disabled<<7)|(f.reference_sel<<5)|(f.sample_rate<<2)|f.reference;
    f.ALTERA1 = f.fpgaStat;
    if (f.reference_sel!==f.preference_sel){ note(tt,'reference_sel '+REF_CODE[f.preference_sel]+' → '+REF_CODE[f.reference_sel]+' ⇒ reset_adc = YES'); f.preference_sel=f.reference_sel; f.reset_adc=1; f.nres=0; }
    if ((f.ALTERA1&3)!==f.pALTERA1){ note(tt,'FPGA det_96/det_192 changed (ALTERA1 bits 1..0 = '+(f.ALTERA1&3)+') ⇒ reset_adc = YES'); f.pALTERA1=f.ALTERA1&3; f.reset_adc=1; f.nres=0; }
    if (f.reset_adc && f.reference_sel===f.preference_sel && f.sample_rate===f.psample_rate){
      if (f.reset_count>=C.ADC_RESET){ f.reset_adc=0; f.reset_count=0; f.nres++; } else f.reset_count++;
    }
    if (!f.no_lock_counter){ if (f.chirp_on){ f.no_lock_counter=C.CHIRP_OFF; f.chirp_on=0; } else { f.no_lock_counter=C.CHIRP_ON; f.chirp_on=1; } } else f.no_lock_counter--;
    f.leds = refreshLeds();
    if (f.mob_error){ f.mob_error=0; f.nextT1 = tt + C.T1_FIRST; f.nextT0 = tt + C.T0; note(tt,'CAN_FUNCTIONS: MOB_error ⇒ CANinit() — also re-runs timer0_init/timer1_init (TCNT1 = 0xD120: next tick in 96 ms)'); }
    paramUpdate();
    if (f.reboot_device){
      if (f.upgrade_device){ f.ee.bootc=0x01; note(tt,'CAN_FUNCTIONS: CLI; eepromWriteByte(BOOT_CONTROL 0xFFE, BOOTC_RUNLDR 0x01); while(1) CLI();'); }
      else note(tt,'CAN_FUNCTIONS: reboot_device ⇒ while(1) CLI(); — no WDR, the watchdog will reset the AVR');
      f.mode='wdt'; f.modeEnd=tt+C.WDT; seg(tt, tt+C.WDT, 'wdt', 'while(1) CLI(); watchdog timeout ≈16 ms'); f.timersOn=false; snap(tt); return;
    }
    let stall=0;
    if (f.save_settings){ f.save_settings=0; f.ee={valid:1, ref:f.reference, sr:f.sample_rate, bootc:f.ee.bootc}; stall=3*C.EE_WRITE; note(tt,'SAVE_INFORMATION_EEPROM: [10]=0xAA, [13]=reference '+f.reference+', [14]=sample_rate '+f.sample_rate); }
    if (f.sample_rate!==f.psample_rate){ f.sample_rate_change=1; f.psample_rate=f.sample_rate; if (f.reference_sel===3){ f.reset_adc=1; f.nres=0; note(tt,'sample_rate → '+SR_NAMES[f.sample_rate]+' with INTERNAL_REF ⇒ reset_adc = YES'); } }
    if (f.Astatus!==f.pAstatus){ f.Astatus_change=1; f.pAstatus=f.Astatus; f.lock_status_changed=1; note(tt,'Astatus → '+(f.Astatus?'locked':'NO_LOCK')); }
    if (f.lock_status_changed){ if (f.Astatus){ if (f.clocks_stable_count>=C.LOCK_CONSTANT){ f.clocks_stable=1; f.lock_status_changed=0; } else { f.clocks_stable_count++; f.clocks_stable=0; } } else { f.clocks_stable=0; f.clocks_stable_count=0; } }
    else f.clocks_stable_count=0;
    const prevRstn=f.rstn; f.rstn = f.reset_adc? 0 : 1;
    if (!prevRstn && f.rstn) f.calUntil = tt + C.CAL_FS/fsActual(f,w);
    snap(tt);
    if (!f.reset_adc && f.nres < C.RESET_MAX){
      f.mode='wait'; f.modeEnd = tt + C.WAIT100 + stall; seg(tt, f.modeEnd, 'wait', 'main(): 2 × wait(50000) — 100 ms with ADC running, then reset_adc = YES');
      return;
    }
    if (stall){ f.mode='wait'; f.modeEnd=tt+stall; f.afterWait='none'; seg(tt,tt+stall,'ee','EEPROM writes (≈'+(stall*1000).toFixed(0)+' ms, inferred)'); return; }
    f.nextPass = tt + C.LOOP_T;
  }
  function startBoot(tt, fromLoader){
    f.mode='boot'; f.bootIx=0; f.modeEnd = tt + C.BOOT[0][0]; f.timersOn=false;
    f.da_disabled=1; f.leds=0; f.comLed=0; f.rstn=0; f.reset_adc=0;
    seg(tt, f.modeEnd, 'boot', C.BOOT[0][1]); note(tt, 'main(): '+C.BOOT[0][1]);
  }
  function bootStep(tt){
    f.bootIx++;
    if (f.bootIx < C.BOOT.length){
      f.modeEnd = tt + C.BOOT[f.bootIx][0]; seg(tt, f.modeEnd, 'boot', C.BOOT[f.bootIx][1]);
      if (f.bootIx===1){ f.slotAdc = slotAdc(w.slot); }
      if (f.bootIx===2){ f.mod = 0x10 + ADDRESS_TABLE(f.slotAdc); note(tt,'ad_result '+f.slotAdc+' → ADDRESS_TABLE = slot '+(f.mod-0x10)+' → mod_address 0x'+hx(f.mod)); }
      if (f.bootIx===3){ f.reference_sel=3; f.reference=3; f.sample_rate=2; csEval(tt); }
      if (f.bootIx===4){
        const d=dipDecode(w.dip); f.dip_switch_enabled=d.dipEnabled?1:0; f.dashboard_enabled=d.dashEnabled?1:0;
        if (!f.dip_switch_enabled){ if (f.ee.valid){ f.reference=f.ee.ref; f.sample_rate=f.ee.sr; } note(tt,'DIP 7 ON → RESTORE_INFORMATION_EEPROM(): '+(f.ee.valid? 'reference '+f.reference+', sample_rate '+f.sample_rate : '[10] ≠ 0xAA, defaults kept')); }
        else { f.reference=d.ref; f.sample_rate=d.sr; note(tt,'DIP 7 OFF → reference = '+REF_NAMES[d.ref]+', sample_rate = '+SR_NAMES[d.sr]+' from SW1–SW5'); }
        csEval(tt);
      }
      snap(tt); return;
    }
    // into while(1)
    f.mode='app'; f.da_disabled=0; f.timersOn=true; f.preference_sel=0xFF; f.psample_rate=0xFF; f.preference=0xFF;
    f.reset_adc=0; f.nres=0; f.reset_count=0; f.init=1; f.quiet=0; f.restart_sent=0; f.txc=0; f.frame_count=0; f.job=null; f.completed=1;
    f.nextT1 = tt + C.T1_FIRST; f.nextT0 = tt + C.T0; f.t0c=0; f.rxCount=0; f.comLed=0;
    f.nextPass = tt; note(tt,'CAN_TX: transceiver out of loop-back; da_disabled = NO; while(1) starts');
  }
  function enterLoader(tt){
    f.mode='loader'; f.leds=0; f.comLed=0; f.timersOn=false; f.da_disabled=1; f.rstn=0;
    f.ee.bootc=0xFF; f.loaderAt=tt; seg(tt, Math.max(tt+0.0005, T_END), 'loader', 'Ross OGP bootloader at 0x1E000: CAN only, card-edge LEDs dark (it toggles PG4, not wired on D6203A)');
    note(tt,'bootloader main(): wdgEnable(WDT_1000MS); BOOT_CONTROL ≠ RUNAPP → stay, write RUNAPP back; canInit(16 + getSlotID())');
    txFrame(tt+0.002, 0x13, 3, BRANDS[w.brand].product.split('').map(c=>c.charCodeAt(0)).slice(0,8), 'BOOTING "'+BRANDS[w.brand].product+'" → CANADDR_TRAP (sent at once: now − msgSent wraps as unsigned char)', 0x02);
    snap(tt);
  }
  /* frame controller agent: sends the next queued request once the last answer is complete */
  function mfcStep(tt){
    if (!f.mfcQ.length){ f.mfcNext=Infinity; return; }
    if (f.busyUntil>tt || f.frame_count){ f.mfcNext = Math.max(f.busyUntil, tt+C.T1_TICK); return; }
    const req=f.mfcQ.shift();
    const tEnd = rxFrame(tt, req);
    if (f.mode==='app' || f.mode==='wait'){ f.rxCount++; respond(tEnd, req); }
    else if (f.mode==='loader') loaderRespond(tEnd, req);
    f.mfcNext = f.mfcQ.length? Math.max(f.busyUntil, tEnd) + C.MFC_GAP : Infinity;
  }
  /* world / user events */
  function applyEvent(e, tt){
    switch(e.kind){
      case 'world': e.fn(w, f); csEval(tt); note(tt, e.label); R.worlds.push({t:tt, w:deep(w)}); break;
      case 'mfc': f.mfcQ.push(...e.reqs); if (f.mfcNext===Infinity) f.mfcNext=tt; note(tt, e.label); break;
      case 'canerr': f.mob_error=1; note(tt,'CAN error interrupt: MOb status error → MOB_ERROR_CHECKER; MOB_error stays YES'); break;
      case 'insert': if (w.card){ startBoot(tt); } break;
      case 'remove': f.mode='off'; f.timersOn=false; f.leds=0; f.comLed=0; seg(tt, T_END, 'off', 'card out of the frame'); snap(tt); break;
      case 'loaderdone': if (f.mode==='loader'){ note(tt,'VERIFY_UPGRADE ok → rebootApp → bootApp()'); startBoot(tt); } break;
    }
  }

  /* initial snapshot / mode */
  if (f.mode==='app'){ f.leds = refreshLeds(); }
  else if (f.mode==='boot'){ seg(0, f.modeEnd, 'boot', C.BOOT[f.bootIx][1]); }
  else if (f.mode==='loader'){ seg(0, T_END, 'loader', 'Ross OGP bootloader running'); }
  else if (f.mode==='off'){ seg(0, T_END, 'off', 'card out of the frame'); }
  else if (f.mode==='wait'){ seg(0, f.modeEnd, 'wait', 'main(): blocking wait'); }
  snap(0);
  let guard=0;
  while (guard++ < 400000){
    const tEv = ei<ev.length? ev[ei].t : Infinity;
    const run = f.mode==='app';
    const timers = f.timersOn && (f.mode==='app' || f.mode==='wait');
    const cands = [ tEv, run? f.nextPass : Infinity, timers? f.nextT1 : Infinity, timers? f.nextT0 : Infinity,
      (f.mode==='boot'||f.mode==='wait'||f.mode==='wdt')? f.modeEnd : Infinity, f.cs.at, f.nextDet, (f.mode==='app'||f.mode==='wait'||f.mode==='loader')? f.mfcNext : Infinity ];
    let tn=Infinity, k=-1; for (let i=0;i<cands.length;i++) if (cands[i]<tn){ tn=cands[i]; k=i; }
    if (tn > T_END) break;
    t = tn;
    if (k===0){ applyEvent(ev[ei++], t); continue; }
    if (k===1){ mainPass(t); continue; }
    if (k===2){ t1Tick(t); continue; }
    if (k===3){ t0Tick(t); continue; }
    if (k===4){
      if (f.mode==='boot') bootStep(t);
      else if (f.mode==='wait'){ f.mode='app'; if (f.afterWait!=='none') f.reset_adc=1; f.afterWait=null; f.nextPass=t; }
      else if (f.mode==='wdt'){ note(t,'watchdog reset → '+(f.ee.bootc===0x01? 'BOOTRST → bootloader' : 'application main()')); f.reboot_device=0; f.upgrade_device=0;
        if (f.ee.bootc===0x01) enterLoader(t); else startBoot(t); }
      continue;
    }
    if (k===5){ f.cs.locked=1; f.cs.fs=f.cs.fsT||0; f.cs.at=Infinity; continue; }
    if (k===6){ detUpdate(t); continue; }
    if (k===7){ mfcStep(t); continue; }
  }
  R.end = S; R.endT = T_END;
  // continue the timers' phases into the next second
  ['nextPass','nextT1','nextT0','modeEnd','nextDet','mfcNext','busyUntil','calUntil'].forEach(k=>{ if (isFinite(f[k])) f[k]-=1; });
  if (isFinite(f.cs.at)) f.cs.at-=1;
  R.can.sort((a,b)=>a.t-b.t);
  // DashBoard cache over time ("as seen by the display")
  R.cache0 = Object.assign({}, D.s0.f.cache);
  const c = Object.assign({}, D.s0.f.cache); R.cacheEv=[];
  R.can.forEach(fr=>{ if (fr.dir==='tx' && fr.oid!==undefined && fr.val!==undefined){ if (c[fr.oid]!==fr.val) R.dashUpd.push({t:fr.t+fr.dur, oid:fr.oid, v:fr.val}); c[fr.oid]=fr.val; R.cacheEv.push({t:fr.t+fr.dur, oid:fr.oid, v:fr.val}); } });
  f.cache = c;
  return R;
}
function sim(){ if (D.Rver!==D.ver || !D.R){ D.R = simulate(); D.Rver=D.ver; } return D.R; }
function snapAt(t){ const s=sim().snaps; let lo=0, hi=s.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if (s[m].t<=t) lo=m; else hi=m-1; } return s[lo]; }
function segAt(t){ const s=sim().segs; let r=null; for (const g of s) if (g.t0<=t && t<g.t1) r=g; return r; }
function cacheAt(t){ const R=sim(); const c=Object.assign({}, R.cache0); for (const e of R.cacheEv){ if (e.t>t) break; c[e.oid]=e.v; } return c; }
function worldAt(t){ const ws=sim().worlds; let r=ws[0]; for (const x of ws){ if (x.t<=t) r=x; else break; } return r.w; }
function stepAt(t){
  const sn=snapAt(t); const g=segAt(t);
  if (g && g.kind!=='ee') return {seg:g, sn};
  const ph = ((t - sn.t)/C.LOOP_T); let a=0, k=0; for (let j=0;j<STEPS.length;j++){ if (ph>=a) k=j; a+=STEPS[j][1]; }
  return {sn, step:k};
}
const STEPS = [
  ['WDR · READ_DIP_SWITCHES', .04, 'PINA → dip_switches (SW1…SW8 on PA7…PA0)'],
  ['CS8416_READ_LOCK_ALL · INVERT_DATA', .22, 'bit-banged read of CS8416 register 0x0C (receiver errors) → Astatus'],
  ['ALTERA_write', .30, 'DIP override? → reference_sel → 16 bits shifted on FPGA3/FPGA2 (PB5/PB6), strobe FPGA1 (PB7); FPGA status shifts back on FPGA4'],
  ['reset_adc bookkeeping', .05, 'reference_sel / det bits changed? count reset_count to 5714'],
  ['NO_LOCK_CHIRP · REFRESH_LEDS', .08, 'chirp 1000 on / 7000 off passes; PE2…PE7 card-edge LEDs'],
  ['WDR · CAN_FUNCTIONS → PARAMETER_UPDATE', .14, 'pick the next REPORT_PARAM; re-init CAN on MOB_error; reboot if asked'],
  ['SAVE_INFORMATION_EEPROM?', .03, 'only when DashBoard sent Settings = Save'],
  ['change detection · clocks_stable', .08, 'sample_rate / Astatus changed? count 25 stable passes'],
  ['RESET_LOW / RESET_HIGH', .06, 'PB2 → FPGA6 → RSTN pin of the AK5394A'],
];

/* ---------------- user actions (what the buttons do in code) ---------------- */
function addEvent(e){
  let t = SIM.t;
  if (t > 0.94){ rollSecond(); t = 0.02; }
  e.t = Math.max(0.0005, t);
  D.ev.push(e); D.ver++;
  return e.t;
}
function rollSecond(){
  const R = sim(); D.s0 = { w: deep(R.end.w), f: deep(R.end.f) };
  D.ev = []; D.second++; D.ver++; SIM.seek(0);
}
function act(name, fn){
  D.lastTrace = [];
  const tr = s => D.lastTrace.push(s);
  const t0 = SIM.t;
  fn(tr);
  D.log.unshift({ t: SIM.t, sec: D.second, name, trace: D.lastTrace.slice() });
  if (D.log.length>60) D.log.length=60;
  if (!SIM.playing && D.ui.autoFollow){ const last = D.ev.length? D.ev[D.ev.length-1].t : SIM.t; SIM.seek(Math.min(0.999, Math.max(SIM.t, last) + 0.002)); }
  else SIM.refresh();
}
function fwNow(){ const sn = snapAt(SIM.t); return sn; }
function worldEv(label, fn){ return addEvent({kind:'world', label, fn}); }
function mfcEv(label, reqs){ return addEvent({kind:'mfc', label, reqs}); }
const A = {
  dashSet(oid, val){
    const o=OID[oid]; act(`DashBoard: set ${o?o.name:oidTxt(oid)} = ${valTxt(oid,val)}`, tr=>{
      const w=worldAt(SIM.t), sn=fwNow();
      if (!w.mfc){ tr('No frame controller — DashBoard cannot reach the card.'); return; }
      tr(`DashBoard → MFC-8310 (Ethernet, openGear protocol ${inf}) → CAN frame SET_PARAM 0x4A to 0x${hx(0x10+w.slot)} (slot ${w.slot}), data [00 ${hx(oid>>8)} ${hx(oid&0xFF)} 02 00 ${hx(val)}] (byte layout of bytes 0/3 ${inf})`);
      tr('can_rx_isr: CANHPMOB → CANRX(MOb): destination == mod_address → can_data_rx++, completed_CAN_tx = NO → DASHBOARD_RESPONSE_SETUP');
      if (oid===0x0303){ tr(sn.mode!=='app'? 'Card is not running the application — no answer.' : (snapDash().dashboard_enabled? `case CANMSG_SET_PARAM, OID 3.3: if (dashboard_enabled) reference = buffer[5] = ${val} (${REF_CODE[val]})` : 'DIP 8 is ON → dashboard_enabled = NO: the reply echoes the old reference, nothing changes'));
        tr('Reply 0xCA (CANMSG_RESPONSE | SET_PARAM) is sent from inside the ISR by CANTX(MOB_buffer_free)');
        tr('Next main-loop pass: ALTERA_write → reference_sel = (Astatus && clocks_stable)? reference : INTERNAL_REF → 16-bit word to the FPGA (aes_sw = reference picks REF1/REF2/EXT/GND for the CS8416)');
        tr('If reference_sel changed: reset_adc = YES → AK5394A held in reset ≈1 s, released 100 ms, reset ≈1 s again (CAL LED on) — the output is silent ≈2.1 s');
        tr('PARAMETER_UPDATE: reference ≠ preference → parameter_refresh = REFERENCE; REPORT_PARAM goes out on the next timer1 heartbeat (≤ 0.96 s)'); }
      if (oid===0x0302){ tr(snapDash().dashboard_enabled? `OID 3.2: sample_rate = ${val} (${SR_NAMES[val]})` : 'refused: DIP 8 ON');
        tr('ALTERA_write puts sample_rate in bits 4..2 → FPGA mclk_sel: 32k = 24.576/3, 44.1k = 33.868/3, 48k = 24.576/2, 96k/192k with DFS 01/10');
        tr('Main loop: sample_rate ≠ psample_rate → sample_rate_change; only if reference_sel == INTERNAL_REF does it start the ADC reset sequence');
        tr('With an external reference locked, the setting is stored but the converter keeps following the reference rate'); }
      if (oid===0x0301) tr('OID 3.1 "Settings → Save": save_settings = INVERT_DATA(buffer[5]) (any value is non-zero) → next pass SAVE_INFORMATION_EEPROM: EEPROM[10]=0xAA, [13]=reference, [14]=sample_rate');
      if (oid===0x0400) tr('OID 4.0 "Notify on Card Fault": smpte_alarm_enabled = '+val+' → with the reference missing, Card Status reports BIT2 (“Ref Input Unlocked”) instead of 0');
      mfcEv('MFC → SET_PARAM '+oidTxt(oid)+' = '+val, [{type:0x4A, oid, b1:oid>>8, b2:oid&0xFF, val}]);
    });
  },
  dashOpen(){ act('DashBoard: open the card (parameter scan)', tr=>{
      const w=worldAt(SIM.t);
      const reqs=[{type:0x45},{type:0x46,oid:0}];
      [0,1].forEach(s=>reqs.push({type:0x50,oid:s<<8}));
      [0,1].forEach(s=>reqs.push({type:0x51,oid:s<<8}));
      [0x0000,0x0001,0x0100].forEach(m=>reqs.push({type:0x52,oid:m}));
      [0x0000,0x0001,0x0100].forEach(m=>reqs.push({type:0x53,oid:m}));
      const oids=[...new Set([...BRANDS[w.brand].menu0, ...MENU1_OIDS, ...MENU2_OIDS])];
      oids.forEach(o=>reqs.push({type:0x47,oid:o}));
      oids.filter(o=>!OID[o].missing).forEach(o=>reqs.push({type:0x49,oid:o}));
      tr(`The frame controller walks the card's object tree: GET_NUMPARAMS, GET_PARAM_OIDS, GET_MENUSET_NAME, GET_MENU_COUNT, GET_MENU_NAME, GET_MENU_OIDS, then GET_DESCRIPTOR and GET_PARAM for each OID — ${reqs.length} requests (the order and pacing are ${inf}; the message set is CANmsg.h)`);
      tr('Each answer longer than 4 bytes goes through MultiFrameMessageTransmission: frame 1 from the CAN ISR, the rest one per timer1 tick (96 µs) once the MOb is free');
      tr('Lengths of the form 8n+4 (e.g. ParamOIDS_Message = 28 bytes) end with a zero-length “last” frame');
      tr('timer0_ovf_isr counts can_data_rx each second: ≥ 10 → dashboard_initializing = YES → reports are spaced 1000 × slot timer1 ticks');
      mfcEv('DashBoard opens the card: '+reqs.length+' requests queued', reqs);
  });},
  dashRefresh(){ act('DashBoard: Refresh', tr=>{ const w=worldAt(SIM.t); const oids=[...new Set([...MENU1_OIDS, 0x0302,0x0303,0x0400])]; tr('GET_PARAM for each visible parameter'); mfcEv('Refresh', oids.map(o=>({type:0x49,oid:o}))); }); },
  dashReboot(){ act('DashBoard: Reboot card', tr=>{ tr('CANMSG_REBOOT (0x43) → DASHBOARD_RESPONSE_SETUP: reply 0x00, reboot_device = YES'); tr('Next pass: CAN_FUNCTIONS → while(1) CLI(); — no WDR → watchdog (WDTCR = 0x08) resets the AVR after ≈16 ms'); tr('BOOT_CONTROL is still 0xFF (RUNAPP) → the bootloader jumps straight to the application → full boot ≈1.5 s'); mfcEv('REBOOT', [{type:0x43}]); }); },
  upload(fileKey){ const F=FILES[fileKey]; act('DashBoard: Upload '+F.name, tr=>{
      tr('DashBoard reads the zeuspack header (product, version '+F.ver+', compatibility 0.0.255.255, CRC) and asks the frame controller to start');
      tr('START_UPGRADE (0x40) reaches the running application: DASHBOARD_RESPONSE_SETUP replies CAN_UPGRADE_WAIT (0x14) with 0x03E8 = 1000 ms, sets reboot_device and upgrade_device');
      tr('Next main-loop pass: CAN_FUNCTIONS → CLI; eepromWriteByte(BOOT_CONTROL = 0xFFE, BOOTC_RUNLDR = 0x01); while(1) CLI(); → watchdog reset ≈16 ms');
      tr('BOOTRST fuse → reset vector 0x1E000 (bootloader). bootavr.c: BOOT_CONTROL ≠ RUNAPP → stays, writes RUNAPP back, canInit(16 + slot), sends BOOTING "'+BRANDS[worldAt(SIM.t).brand].product+'"');
      tr('After the 1000 ms wait the frame controller repeats START_UPGRADE → upgrade.c startUpgrade(): header length, partition, isCompatibleProduct('+F.compat.join(' / ')+')');
      tr('Then UPGRADE_PAGE (0x41) × '+F.pages+' pages of 256 bytes (FLASH_PAGE), VERIFY_UPGRADE (0x42, crc16), REBOOT (0x43) → bootApp() → application boots');
      mfcEv('Upload '+F.name+': START_UPGRADE', [{type:0x40, file:F}]);
      D.ui.upl = { file:fileKey, wall: performance.now(), sec: D.second };
  });},
  cable(which, on){ const nm={ext:'REF IN cable',L:'LEFT input cable',R:'RIGHT input cable'}[which];
    act((on?'Plug in ':'Unplug ')+nm, tr=>{
      const w=worldAt(SIM.t);
      if (which==='ext'){
        if (!hasRef(w)) tr('This rear module position does not reach the card’s REF IN (BNC1_SIG, P1-97).');
        tr(on? 'Rear REF IN → P1-97 BNC1_SIG → T1 transformer → H3 (75/110 Ω) → U9 SN75HVD10 → FPGA pin 72 REF3_EXT → sel4_1 → AES_8416 → CS8416' : 'The CS8416 loses lock; register 0x0C reports errors');
        const sn=fwNow(); if (sn.ref!==2) tr('Reference is not set to External — the CS8416 is not looking at this input, nothing changes.');
        else tr(on? `CS8416 locks (≈${C.CS_LOCK*1000} ms ${inf}); 25 stable passes (≈4.4 ms) → clocks_stable → reference_sel = EXTERNAL_REF → ADC reset sequence; EXTERNAL LED solid, INTERNAL off` : 'Next pass: Astatus = NO_LOCK → reference_sel = INTERNAL_REF at once → ADC reset sequence; EXTERNAL LED chirps (1000 on / 7000 off passes), INTERNAL on; Ref Input → Unlocked on the next REPORT_PARAM');
      } else tr(on? 'Balanced input on the Phoenix block → P1 (AES3/AES4 net names) → NE5532 buffer → AK5394A' : 'Input open: the converter outputs its noise floor (digital near-silence); the firmware does not detect missing audio');
      worldEv((on?'connect ':'disconnect ')+which, (w2)=>{ w2[which].on = on; });
  });},
  frameRef(n, on){ act(`Frame reference ${n} ${on?'present':'removed'}`, tr=>{
      tr(`Midplane REF${n} (P2-${n===1?14:10}) → U${n===1?12:14} SN75HVD10 → FPGA pin ${n===1?56:55} → sel4_1`);
      tr('Only matters when Reference = Frame Ref '+n+'.');
      worldEv(`frame ref ${n} ${on?'on':'off'}`, w2=>{ w2['ref'+n].on=on; });
  });},
  refRate(which, fs){ act(`${which==='ext'?'External':'Frame '+which.slice(-1)} reference rate → ${fs/1000} kHz`, tr=>{
      tr('CS8416 relocks at the new rate; the FPGA SR_DETECT_192 counts the CS8416 MCLK (256·fs) for 1 ms against the 500 Hz from PB3:');
      tr('count > 15 360 (0x3C00) → det_96 (≥ 60 kHz); > 32 000 (0x7D00) → det_192 (≥ 125 kHz); latched once per 16 ms window');
      tr('The new det bits come back in ALTERA1 → (ALTERA1 & 3) ≠ pALTERA1 → reset_adc = YES');
      worldEv(`${which} rate ${fs}`, w2=>{ w2[which].fs=fs; });
  });},
  dip(i){ const w=worldAt(SIM.t); const on=!w.dip[i]; act(`DIP SW${i+1} → ${on?'ON':'OFF'}`, tr=>{
      const nw=deep(w); nw.dip[i]=on; const d=dipDecode(nw.dip);
      tr(`PINA = 0x${hx(d.raw)} (SW1 = PA7 … SW8 = PA0, ON pulls the pin low). READ_DIP_SWITCHES runs every pass.`);
      if (i===6||i===7) tr('SW7 (memory/DIP) and SW8 (DashBoard enable) are only read once in main() after power-up — power-cycle (Reboot) to apply.');
      else { const sn=fwNow(); if (snapDash().dip_switch_enabled && !snapDash().dashboard_enabled) tr(`DIP mode with DashBoard disabled: ALTERA_write re-reads SW1–SW5 every pass → reference ${REF_NAMES[d.ref]}, sample_rate ${SR_NAMES[d.sr]}`);
        else tr('ALTERA_write only obeys SW1–SW5 at run time when SW7 = OFF and SW8 = ON; otherwise they are read at power-up only (if SW7 = OFF).'); }
      worldEv(`DIP SW${i+1} ${on?'ON':'OFF'}`, w2=>{ w2.dip[i]=on; });
  });},
  jumper(k){ const w=worldAt(SIM.t); act(`Jumper ${k} moved`, tr=>{
      if (k==='H3'){ const v=w.H3===75?110:75; tr(`H3 selects the REF IN termination: ${v} Ω (R30 75R / R31 110R on T1's secondary). No firmware involvement.`); worldEv('H3 '+v, w2=>{w2.H3=v;}); }
      else { const key=k; const v=w[key]===-20?-18:-20; tr(`${k} (${k==='H1'?'LEFT':'RIGHT'}) selects the alignment level: +4 dBu = ${v} dBFS (0 dBFS = +${headroom(v)} dBu ${inf}). Hardware only — no OID.`); worldEv(k+' '+v, w2=>{w2[key]=v;}); }
  });},
  trim(k, d){ act(`Trim RV${k+1} (${k?'RIGHT':'LEFT'}) ${d>0?'+':'−'}0.1 dB`, tr=>{ tr(`RV${k+1} is a 2K trimmer in the U${k?5:3} NE5532 feedback network (netlist ${k?'NET00032':'NET00034'}). Range modelled as ±1.5 dB ${inf}. No firmware involvement — DashBoard has no gain/trim parameter.`);
      worldEv('trim '+k, w2=>{ w2.rv[k]=Math.max(-1.5, Math.min(1.5, Math.round((w2.rv[k]+d)*10)/10)); }); }); },
  level(k, dBu){ act(`${k?'RIGHT':'LEFT'} input level → ${dBu} dBu`, tr=>{ tr('Analog source level only.'); worldEv('level', w2=>{ (k?w2.R:w2.L).dBu=dBu; }); }); },
  canErr(){ act('Inject a CAN error frame', tr=>{ tr('can_rx_isr: MOb status shows an error → MOB_ERROR_CHECKER(); MOB_error stays YES'); tr('Next pass: CAN_FUNCTIONS → CANinit(): CANreset + timer0_init + timer1_init → the 96 µs tick restarts with the 96 ms first period'); addEvent({kind:'canerr'}); }); },
  remove(){ act('Pull the card out', tr=>{ tr('Hot-swap: power and CAN disappear; DashBoard keeps its last values until the frame controller notices'); addEvent({kind:'world', label:'card removed', fn:(w2)=>{ w2.card=false; }}); addEvent({kind:'remove'}); }); },
  insert(){ act('Insert the card (power-up)', tr=>{
      tr('main(): init_devices — ports, watchdog (WDTCR = 0x08), ADC; CAN_RX (PD7 high = SN65HVD233 LBK loop-back, so the card stays off the bus)');
      tr('15 × wait(50000) ≈ 750 ms; 100 slot-ID conversions (≈ 0.6 s) → ADDRESS_TABLE → mod_address = slot + 0x10');
      tr('ALTERA_RESET, 150 ms, init_CS8416, DIP / EEPROM restore, DATA_SETUP, CAN_setup → timers; CAN_TX → on the bus');
      tr('First passes: preference_sel = 0xFF ≠ reference_sel → ADC reset; RESTART trap on the first CAN_TX_TIMER; reports every 1000 × slot ticks while dashboard_initializing');
      addEvent({kind:'world', label:'card inserted', fn:(w2)=>{ w2.card=true; }}); addEvent({kind:'insert'}); }); },
  setSlot(n){ act(`Move the card to slot ${n}`, tr=>{ const v=slotAdc(n); tr(`Midplane AN_SLOTID resistor ${SLOT_R[n-1]} Ω with the 1K pull-up → ADC ≈ ${v} → ADDRESS_TABLE = ${ADDRESS_TABLE(v)} → mod_address 0x${hx(0x10+n)}`); tr('Read only during boot: re-insert (power-up) to apply.');
      worldEv('slot '+n, w2=>{ w2.slot=n; }); }); },
  setRear(k){ act(`Fit rear module ${k}`, tr=>{ tr(REARS[k].name+'. ID resistors AN_BMID / AN_BMID2 = '+REARS[k].id+'. The D6203A never reads them (only ADC0, the slot ID, is converted).'); worldEv('rear '+k, w2=>{ w2.rear=k; }); }); },
  brand(k){ act(`Rebuild with common.h #define ${k}`, tr=>{ tr('Dashboard.c picks ParamManuName_Message, ParamProductName_Message and Menu0OID_Message with #ifdef WARD_BECK / ROSS_VIDEO / COBALT. The bootloader’s product tag (written by avrinst) must match for an upload.');
      worldEv('brand '+k, w2=>{ w2.brand=k; }); }); },
};
function snapDash(){ const R=sim(); return R.end? (function(){ // firmware flags at the playhead (dashboard/dip enable only change at boot)
  const s0=D.s0.f; return {dashboard_enabled: s0.dashboard_enabled, dip_switch_enabled: s0.dip_switch_enabled}; })() : {}; }
const FILES = {
  wb104:{name:'D6203a_v1_04.bin', ver:'1.04', compat:['D6203A','ADC-8432','9345'], pages:103, src:'wbs_ztcpack.txt'},
  ross104:{name:'adc-8432_v1_04.bin', ver:'1.04', compat:['D6203A','ADC-8432','9345'], pages:103, src:'ross_ztcpack.txt'},
  cob104:{name:'9345_v1_04.bin', ver:'1.04', compat:['D6203A','ADC-8432','9345'], pages:103, src:'cobalt_ztcpack.txt'},
  wrong:{name:'(a D6204A .bin)', ver:'2.00', compat:['D6204A'], pages:0, src:'wrong product'},
};

/* =====================================================================
   DRAWING: card (real gerber artwork), card edge, rear module, frame, DashBoard window
   ===================================================================== */
/* Card artwork: D6203A #PCB/GERBERS/D6203AISS4.TOP+TSM (copper/pads) and .TSS (silk), rendered at 120 dpi
   over the board area x 2.45…15.33 in, y 5.26…8.60 in (1546 × 401 px). The third-party logo in the silk was blanked.
   Part positions are from D6203Aiss4.pnp (origin 3.095, 6.100 in). Solder mask colour: "BLACK SEMI GLOSS" (drawing note 1). */
const PNP = (x,y)=>[(x/1000+3.095-2.45)*120, (8.60-(y/1000+6.100))*120];
const LED_POS = [[-80.3,2200,'REF1','var(--led-g)'],[-80.3,2065,'REF2','var(--led-g)'],[-80.3,1930,'EXTERNAL','var(--led-g)'],[-80.3,1795,'INTERNAL','var(--led-a)'],[-80.3,1625,'CAL','#ff5a4a'],[-80.3,1480,'COM ACTIVITY','var(--led-g)']];
function ledsOf(sn){ return sn? sn.leds : 0; }
function cardSVG(t, opts){
  opts=opts||{};
  const sn=snapAt(t), L=ledsOf(sn), w=worldAt(t);
  let s=`<svg viewBox="0 0 1546 401" role="img" aria-label="D6203A ISS4 card, top side (real gerber artwork)" style="width:100%;display:block;border-radius:6px">
   <defs><filter id="ogGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect x="0" y="0" width="1546" height="401" fill="var(--panel2)"/>
   <path d="M5 8 H1495 L1505 18 V36 H1536 V318 H1505 V330 H1540 V398 H1503 V364 H62 L8 330 Z" fill="#141716" stroke="#2a2f2c"/>
   <image href="${ASSET}opengear-d6203a-copper.png" width="1546" height="401"/>
   <image href="${ASSET}opengear-d6203a-silk.png" width="1546" height="401" opacity=".92"/>`;
  LED_POS.forEach(([x,y,nm,col],i)=>{ const [px,py]=PNP(x,y); const on=(L>>i)&1;
    s+=`<rect x="${px-9}" y="${py-6}" width="18" height="12" rx="2" fill="${on?col:'#2b2f2c'}" ${on?'filter="url(#ogGlow)"':''}/>`; });
  // DIP switch SW (pnp 3545,1814.5, rot 90): 8 slides, SW1 assumed at the left
  const [dx,dy]=PNP(3545,1814.5);
  for (let i=0;i<8;i++){ const x=dx-43+i*12.3, on=w.dip[i];
    s+=`<g class="og-dip" data-i="${i}" style="cursor:pointer"><rect x="${x-5}" y="${dy-15}" width="10" height="30" rx="1.5" fill="#2d63b8" stroke="#183a72"/><rect x="${x-3.5}" y="${on?dy-13:dy+1}" width="7" height="12" fill="#f2f2f2"/><rect x="${x-7}" y="${dy-22}" width="14" height="44" fill="transparent"><title>SW${i+1} — click to toggle (${on?'ON':'OFF'})</title></rect></g>`; }
  s+=`<text x="${dx-48}" y="${dy+30}" font-size="11" fill="#9fd3ff">1</text><text x="${dx+44}" y="${dy+30}" font-size="11" fill="#9fd3ff">8</text><text x="${dx-48}" y="${dy-20}" font-size="9" fill="#9fd3ff">ON ↑ (orientation ${'inferred'})</text>`;
  // jumpers and trimmers (positions measured on the silk)
  const jp=(x,y,k,v)=>`<g class="og-jp" data-k="${k}" style="cursor:pointer"><rect x="${x-17}" y="${y-6}" width="34" height="12" rx="2" fill="#111" stroke="#666"/><rect x="${(v==='a')?x-16:x}" y="${y-5}" width="16" height="10" rx="2" fill="#e8c23a"/><rect x="${x-20}" y="${y-10}" width="40" height="20" fill="transparent"><title>${k} — click to move the jumper</title></rect></g>`;
  s+= jp(690,100,'H2', w.H2===-20?'a':'b') + jp(690,213,'H1', w.H1===-20?'a':'b') + jp(1380,30,'H3', w.H3===75?'a':'b');
  const pot=(x,y,k,v)=>`<g class="og-rv" data-k="${k}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="13" fill="#2b5ea8" stroke="#123"/><line x1="${x}" y1="${y}" x2="${x+11*Math.cos((v*60-90)*Math.PI/180)}" y2="${y+11*Math.sin((v*60-90)*Math.PI/180)}" stroke="#fff" stroke-width="3"/><circle cx="${x}" cy="${y}" r="18" fill="transparent"><title>RV${k+1} ${k?'RIGHT':'LEFT'} trim ${v>=0?'+':''}${v.toFixed(1)} dB — left half −, right half +</title></circle></g>`;
  s+= pot(668,232,0,w.rv[0]) + pot(668,124,1,w.rv[1]);
  if (opts.labels!==false){
    const lab=(x,y,txt)=>`<text x="${x}" y="${y}" font-size="15" font-weight="700" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke">${txt}</text>`;
    const pc=k=>{ const m={U7:[7866.2,1882.1],U10:[9142.1,1068.8],U1:[7296,630],U6:[9778.7,1920.8],U13:[8935,1800],U8:[11440,-145],U4:[10240,870],U3:[5490,490],U5:[5490,1445],U11:[8260,1065]}[k]; return PNP(m[0],m[1]); };
    [['U7','AT90CAN128'],['U10','EP1C3'],['U1','AK5394A'],['U6','CS8416'],['U13','PLL1705'],['U8','CAN'],['U4','DS34LV87'],['U3','NE5532 L'],['U5','NE5532 R'],['U11','EPCS']].forEach(([k,n])=>{ const [x,y]=pc(k); s+=lab(x-30, y+(k==='U10'?40:k==='U7'?-34:-14), n); });
    s+=lab(1500,200,'P1')+lab(1500,388,'P2');
  }
  if (!w.card) s+=`<rect width="1546" height="401" fill="var(--panel2)" opacity=".75"/><text x="773" y="210" text-anchor="middle" font-size="40" fill="var(--ink)">card removed from the frame</text>`;
  if (sn.mode==='loader') s+=`<text x="120" y="180" font-size="22" fill="#ffd36a">bootloader running — LEDs dark</text>`;
  s+='</svg>';
  return s;
}
/* Card edge: CorelDRAW art D6203A #Functional/D6203A-card-edge.cdr (2008-05-08), converted with Inkscape → assets/opengear-edge.svg.
   LED windows are the six 5.7 × 12.6 pt tabs on the drawing; the live LEDs sit on them. */
const EDGE_LED = [21.9, 43.0, 66.2, 94.1, 115.3, 138.5];   // y of REF1, REF2, EXTERNAL, INTERNAL, CAL, COM ACTIVITY (x 127.55)
function edgeSVG(t){
  const sn=snapAt(t), L=ledsOf(sn);
  let s=`<svg viewBox="5 4 135 160" role="img" aria-label="D6203A card edge (CorelDRAW art)" style="width:100%;max-width:250px;display:block;border-radius:6px">
    <defs><filter id="ogGlow2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <image href="${ASSET}opengear-edge.svg" width="160" height="325"/>`;
  LED_POS.forEach(([x,y,nm,col],i)=>{ const yy=EDGE_LED[i], on=(L>>i)&1;
    s+=`<rect x="124.7" y="${yy-6.3}" width="5.7" height="12.6" rx="1" fill="${on?col:'#2b2f2c'}" stroke="#555" stroke-width=".3" ${on?'filter="url(#ogGlow2)"':''}><title>${nm} ${on?'on':'off'}</title></rect>`; });
  s+='</svg>'; return s;
}
/* Rear modules: CorelDRAW art openGear Rear Module Guides/D6203A - rear module options.cdr (2012-01-16), one cell per module
   (T6302A, T6303A, T6402A, T6403A) → assets/opengear-rear-<T>.svg. Connector centres below are measured on the converted
   art (BNC Ø 10.6 pt; terminal-block centres from the three screw dots). Electrical roles stay from the netlists. */
const REAR_ART = {
  T6302:{c:[[61.7,55.0],[78.8,55.0],[61.7,72.0],[78.8,72.0],[61.7,89.1],[78.8,89.1],[61.7,106.2],[78.9,106.2],[61.7,123.3],[78.9,123.3]], plate:[44,32,52,112]},
  T6303:{c:[[59.6,53.6],[77.8,53.6],[59.6,70.7],[77.8,70.7],[59.6,87.7],[77.8,87.7],[59.6,104.8],[77.8,104.8],[59.6,121.9],[77.8,121.9]], plate:[42,30,52,112]},
  T6402:{c:[[64.4,56.3],[81.5,56.3],[64.4,73.3],[81.5,73.3],[64.4,90.4],[81.5,90.4],[64.4,107.5],[81.6,107.5],[64.4,124.6],[81.6,124.6]], plate:[47,34,52,112]},
  T6403:{c:[[59.8,57.2],[76.9,57.2],[59.8,74.3],[77.0,74.3],[59.8,91.4],[76.9,91.4],[59.8,108.4],[76.9,108.4],[59.8,125.5],[76.9,125.5]], plate:[42,34,52,112]},
};
function rearSVG(t, opts){
  opts=opts||{};
  const w=worldAt(t), key=opts.rear||w.rear, RM=REARS[key], ART=REAR_ART[key];
  const vb = opts.compact? ART.plate.join(' ') : '0 0 147.5 155';
  let s=`<svg viewBox="${vb}" role="img" aria-label="${RM.name} (CorelDRAW art)" style="width:100%;display:block;border-radius:6px">
    <image href="${ASSET}opengear-rear-${key}.svg" width="147.5" height="155"/>`;
  RM.pos.forEach((p,i)=>{
    const [cx,cy]=ART.c[i];
    const [lab,kind,role]=p;
    const mine = !RM.dual || lab.endsWith('#'+(w.pos||1));
    let conn=false, k=null;
    if (role==='refin'){ k='ext'; conn=w.ext.on && mine; }
    if (role==='ainL'){ k='L'; conn=w.L.on && mine; }
    if (role==='ainR'){ k='R'; conn=w.R.on && mine; }
    const clickable = mine && k;
    const act = (role==='out75'||role==='out110') && mine;
    s+=`<g ${clickable?`class="og-jack" data-j="${k}" style="cursor:pointer"`:''}>`;
    if (kind==='bnc'){
      if (conn) s+=`<circle cx="${cx}" cy="${cy}" r="4.3" fill="#2b5f9e" opacity=".85"/><rect x="${cx-1.6}" y="${cy}" width="3.2" height="7" fill="#2b5f9e" opacity=".85"/>`;
      if (act) s+=`<circle cx="${cx+4.6}" cy="${cy-4.6}" r="1.1" fill="${aesActive(t)?'var(--accent)':'#888'}"/>`;
      s+=`<rect x="${cx-6}" y="${cy-6}" width="12" height="12" fill="transparent" ${mine?'':'opacity=".5"'}><title>${i+1} ${lab}${clickable?' — click to '+(conn?'unplug':'plug in'):''}</title></rect>`;
    } else {
      if (conn) s+=`<path d="M${cx+4} ${cy-4} h4 M${cx+4} ${cy} h4 M${cx+4} ${cy+4} h4" stroke="#2b5f9e" stroke-width="1.6"/><rect x="${cx-4}" y="${cy-7}" width="8" height="14" fill="#2b5f9e" opacity=".35"/>`;
      if (act) s+=`<circle cx="${cx+4.6}" cy="${cy-7.6}" r="1.1" fill="${aesActive(t)?'var(--accent)':'#888'}"/>`;
      s+=`<rect x="${cx-5}" y="${cy-8}" width="10" height="16" fill="transparent"><title>${i+1} ${lab}${clickable?' — click to '+(conn?'unplug':'plug in'):''}</title></rect>`;
    }
    s+='</g>';
    if (RM.dual && !mine) s+=`<rect x="${cx-5.5}" y="${cy-7.5}" width="11" height="15" fill="#000" opacity=".12"/>`;
  });
  s+=`</svg>`;
  return s;
}
function aesActive(t){ const sn=snapAt(t); return sn.mode==='app' && !sn.da; }
function frameSVG(t){
  const w=worldAt(t); const RM=REARS[w.rear];
  let s=`<svg viewBox="0 0 640 74" style="width:100%;display:block"><rect width="640" height="74" rx="6" fill="var(--dev)"/>`;
  for (let i=1;i<=20;i++){ const x=10+(i-1)*31; const card=(i===w.slot && w.card);
    const rearSpan = RM.dual? [w.slot] : [w.slot-1, w.slot];
    const isRear = rearSpan.includes(i);
    s+=`<g class="og-slot" data-s="${i}" style="cursor:pointer"><rect x="${x}" y="8" width="27" height="44" rx="2" fill="${card?'#3a4f40':'#202326'}" stroke="${isRear?'#e3a35a':'#3a3f44'}" stroke-width="${isRear?2:1}"/>
      ${card?`<rect x="${x+11}" y="12" width="5" height="36" fill="#141716"/>${[0,1,2,3,4,5].map(k=>`<rect x="${x+8}" y="${14+k*5.5}" width="3" height="3" fill="${(ledsOf(snapAt(t))>>k)&1? (k===3?'#ffb43a':k===4?'#ff5a4a':'#7dff6a'):'#2c332c'}"/>`).join('')}`:''}
      <text x="${x+13.5}" y="64" font-size="9" text-anchor="middle" fill="#9aa0a5">${i}</text><title>Slot ${i}${card?' — D6203A':''}${isRear?' — rear module '+w.rear:''}</title></g>`; }
  s+=`<text x="630" y="70" font-size="8" text-anchor="end" fill="#9aa0a5">20-slot frame, front view (frame controller slot not drawn)</text></svg>`;
  return s;
}
/* DashBoard-style window — a generic period parameter editor, not Ross's design */
function dashHTML(t){
  const w=worldAt(t), sn=snapAt(t), c=cacheAt(t), B=BRANDS[w.brand], R=sim();
  const alive = sn.mode==='app' || sn.mode==='wait';
  const seen = w.card && ((D.s0.f.mode!=='off' && D.s0.f.mode!=='boot') || R.can.some(fr=>fr.dir==='tx' && fr.t<=t));
  const tab=D.ui.dashTab;
  const row=(lab,val,cls)=>`<tr><td class="og-dl">${lab}</td><td class="${cls||''}">${val}</td></tr>`;
  let body='';
  if (!w.mfc) body='<div class="og-dmsg">No frame controller — the frame does not appear.</div>';
  else if (!seen) body='<div class="og-dmsg">Slot '+w.slot+': no card answering yet.</div>';
  else if (tab==='info'){
    body=`<table class="og-dt">${B.menu0.map(o=>row(OID[o].name, `<input readonly value="${String(c[o]??'')}">`)).join('')}</table>
      <div class="og-dnote">Menu “Card Info” = Menu0OID_Message (${B.menu0.length} OIDs for this brand).</div>`;
  } else if (tab==='status'){
    const cs=c[0x0201], ri=c[0x0202];
    body=`<table class="og-dt">${row('Card Status', `<span class="og-alarm" style="background:${cs? 'var(--warn)':'var(--accent)'}"></span> ${valTxt(0x0201,cs)}`)}
      ${row('Ref Input', `<span class="og-alarm" style="background:${ri===1? 'var(--accent)':'var(--warn)'}"></span> ${valTxt(0x0202,ri)}`)}</table>
      <div class="og-dnote">Values are what DashBoard last received (REPORT_PARAM / GET_PARAM replies on the CAN timeline), not the card’s live state.</div>`;
  } else {
    const de = D.s0.f.dashboard_enabled;
    const sr=c[0x0302], rf=c[0x0303], nt=c[0x0400];
    body=`<table class="og-dt">
      ${row('Notify on Card Fault', `<label><input type="checkbox" data-o="1024" ${nt?'checked':''}> Yes</label>`)}
      ${row('Internal Ref Sample Rate', SR_NAMES.map((n,i)=>`<label class="og-r"><input type="radio" name="ogsr" data-o="770" data-v="${i}" ${sr===i?'checked':''}> ${n}</label>`).join(''))}
      ${row('Reference', REF_NAMES.map((n,i)=>`<label class="og-r"><input type="radio" name="ogrf" data-o="771" data-v="${i}" ${rf===i?'checked':''}> ${n}</label>`).join(''))}
      ${row('(OID 3.5)', '<span class="muted small">listed in the menu, card answers UNSUPPORTED</span>')}
      ${de? row('Settings', '<select disabled><option>Save</option></select> <button data-save="1">Apply</button>') : ''}</table>
      ${de? '' : '<div class="og-dnote" style="color:var(--warn)">DIP 8 ON: Menu3OID (no Save); SET_PARAM replies echo the old value.</div>'}`;
  }
  const upl = uploadState();
  return `<div class="og-dash">
   <div class="og-dtitle"><span>Parameter editor — frame tree</span><span class="muted">generic DashBoard-style view</span></div>
   <div class="og-dwrap">
    <div class="og-tree"><div>▾ openGear frame</div><div style="padding-left:12px">▸ Frame controller (MFC-8310)</div>
      ${[...Array(20)].map((_,i)=>i+1).filter(i=>i===w.slot || i===2 || i===7).map(i=>`<div style="padding-left:12px" class="${i===w.slot?'og-sel':''}">${i===w.slot? (seen? `● Slot ${i}: ${B.product}` : `○ Slot ${i}`) : `○ Slot ${i}: (other card)`}</div>`).join('')}
    </div>
    <div class="og-pane">
      <div class="og-phead">Slot ${w.slot}: <b>${seen? B.product : '—'}</b> <span class="muted">${seen? CARD_NAME : ''}</span>${alive?'':' <span style="color:var(--warn)">('+sn.mode+')</span>'}</div>
      <div class="og-ptabs">${[['status','Status ▸ Card Status'],['info','Status ▸ Card Info'],['control','Control ▸ Card Settings']].map(([k,l])=>`<button data-dt="${k}" class="${tab===k?'on':''}">${l}</button>`).join('')}</div>
      <div class="og-pbody">${body}</div>
      <div class="og-pfoot"><button data-da="open">Open / rescan</button><button data-da="refresh">Refresh</button>
        <select id="ogFile">${Object.keys(FILES).map(k=>`<option value="${k}">${FILES[k].name}</option>`).join('')}</select><button data-da="upload">Upload…</button><button data-da="reboot">Reboot</button></div>
      ${upl? `<div class="og-upl"><div class="og-bar"><i style="width:${(upl.p*100).toFixed(1)}%"></i></div><div class="small">${upl.txt}</div></div>`:''}
    </div></div></div>`;
}
const DASH_CSS = `<style>
.og-dash{border:1px solid var(--line);border-radius:6px;background:var(--panel2);font:12.5px var(--sans);overflow:hidden}
.og-dtitle{display:flex;justify-content:space-between;padding:5px 8px;background:color-mix(in srgb,var(--accent2) 22%,var(--panel));border-bottom:1px solid var(--line);font-weight:600}
.og-dwrap{display:grid;grid-template-columns:150px 1fr;min-height:250px}
.og-tree{border-right:1px solid var(--line);padding:6px;font-size:12px;background:var(--lane)}
.og-tree .og-sel{background:color-mix(in srgb,var(--accent) 22%,transparent);border-radius:3px}
.og-pane{display:flex;flex-direction:column}
.og-phead{padding:6px 8px;border-bottom:1px solid var(--line)}
.og-ptabs{display:flex;gap:3px;padding:5px 6px 0}
.og-ptabs button{font-size:11.5px;padding:3px 7px;border-radius:5px 5px 0 0}
.og-pbody{padding:8px;flex:1;border-top:1px solid var(--line)}
.og-dt{border-collapse:collapse;width:100%}.og-dt td{padding:4px 6px;border-bottom:1px dashed var(--grid);vertical-align:top}
.og-dl{color:var(--ink2);width:38%}
.og-dt input[readonly]{width:100%;background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:2px 5px;color:var(--ink);font:12px var(--mono)}
.og-r{display:inline-block;margin-right:8px;white-space:nowrap}
.og-alarm{display:inline-block;width:11px;height:11px;border-radius:50%;vertical-align:-1px}
.og-dnote{margin-top:6px;font-size:11.5px;color:var(--ink2)}
.og-dmsg{padding:20px;color:var(--ink2)}
.og-pfoot{display:flex;flex-wrap:wrap;gap:5px;padding:6px;border-top:1px solid var(--line)}
.og-pfoot button,.og-pfoot select{font-size:11.5px;padding:3px 7px}
.og-upl{padding:6px 8px;border-top:1px solid var(--line)}
.og-bar{height:9px;border-radius:5px;background:var(--grid);overflow:hidden}.og-bar i{display:block;height:100%;background:var(--accent)}
@media (max-width:700px){.og-dwrap{grid-template-columns:1fr}.og-tree{border-right:none;border-bottom:1px solid var(--line)}}
.og-lanehelp{font-size:12px;color:var(--ink2)}
</style>`;
/* upload progress (wall clock): the real duration is not in the archive — this runs a compressed ≈9 s script */
const UPL_STEPS = [
  [0.4,'START_UPGRADE → card: “wait 1000 ms”, reboots into the bootloader (watchdog ≈16 ms)'],
  [1.2,'Frame controller waits 1000 ms, repeats START_UPGRADE → bootloader checks the product name'],
  [6.6,'UPGRADE_PAGE × 103 (256-byte pages, 33 CAN frames each)'],
  [0.4,'VERIFY_UPGRADE: CRC16 over the new load'],
  [0.4,'REBOOT → bootApp() → application main()'],
];
function uploadState(){
  const u=D.ui.upl; if (!u) return null; const F=FILES[u.file];
  const el=(performance.now()-u.wall)/1000;
  if (F.compat.indexOf(BRANDS[worldAt(SIM.t).brand].product)<0){
    const p=Math.min(1, el/2); return {p, txt: p<1? UPL_STEPS[Math.min(1,Math.floor(el/0.6))][1] : 'Bootloader answered CAN_INVALID_PRODUCT (0x11). The old application is intact; the loader reboots into it after BOOT_TIMEOUT (60 s).', done:p>=1};
  }
  let a=0; const tot=UPL_STEPS.reduce((x,s)=>x+s[0],0);
  for (const st of UPL_STEPS){ if (el < a+st[0]) return {p: el/tot, txt: st[1]+(st[1].startsWith('UPGRADE_PAGE')? ` — page ${Math.floor((el-a)/st[0]*103)} / 103`:'')+` (real duration not in the archive; this progress is compressed ${'·'} inferred)`}; a+=st[0]; }
  return {p:1, txt:`Done: ${F.name} v${F.ver} installed. The card has rebooted (≈1.5 s boot, then ≈2.1 s ADC calibration).`, done:true};
}
function finishUploadIfDone(){
  const u=D.ui.upl; if (!u) return; const st=uploadState(); if (!st||!st.done||u.applied) return;
  u.applied=true; const F=FILES[u.file];
  const bad = F.compat.indexOf(BRANDS[worldAt(SIM.t).brand].product)<0;
  // start a new second with the card booting the new image (or, for a refused file, the old one after BOOT_TIMEOUT)
  rollSecond(); if (!bad) D.s0.w.ver=F.ver;
  D.log.unshift({t:0, sec:D.second, name: bad? 'Bootloader: 60 s later, BOOT_TIMEOUT → reboot(FALSE)' : 'Upload complete', trace: bad? ['No START_UPGRADE was accepted, so getSecond() passes BOOT_TIMEOUT (60) and reboot(FALSE) runs the old application.','The card boots normally (≈1.5 s) and announces itself with CANTRAP_RESTART.'] : ['VERIFY_UPGRADE matched the CRC16; REBOOT → bootApp() → jmp 0x00000.','Application main() boots (≈1.5 s), then the ADC calibration (≈2.1 s); Software Rev now reads '+F.ver+'.']}); const f=D.s0.f; f.mode='boot'; f.bootIx=0; f.modeEnd=C.BOOT[0][0]; f.timersOn=false; f.da_disabled=1; f.leds=0; f.comLed=0; f.rstn=0; f.upgrade=null; f.mfcQ=[]; f.mfcNext=Infinity; f.frame_count=0; f.job=null;
  f.ee.bootc=0xFF; D.ver++; SIM.refresh();
}

/* ---------------- binding ---------------- */
function bindAll(root){
  root.querySelectorAll('.og-dip').forEach(g=>g.onclick=()=>A.dip(+g.dataset.i));
  root.querySelectorAll('.og-jp').forEach(g=>g.onclick=()=>A.jumper(g.dataset.k));
  root.querySelectorAll('.og-rv').forEach(g=>g.onclick=e=>{ const r=g.getBoundingClientRect(); A.trim(+g.dataset.k, (e.clientX-r.left)<r.width/2? -0.1 : 0.1); });
  root.querySelectorAll('.og-jack').forEach(g=>g.onclick=()=>{ const k=g.dataset.j, w=worldAt(SIM.t); A.cable(k, !w[k].on); });
  root.querySelectorAll('.og-slot').forEach(g=>g.onclick=()=>A.setSlot(+g.dataset.s));
  root.querySelectorAll('[data-dt]').forEach(b=>b.onclick=()=>{ D.ui.dashTab=b.dataset.dt; SIM.refresh(); });
  root.querySelectorAll('.og-pbody input[type=radio]').forEach(r=>r.onchange=()=>A.dashSet(+r.dataset.o, +r.dataset.v));
  root.querySelectorAll('.og-pbody input[type=checkbox]').forEach(r=>r.onchange=()=>A.dashSet(+r.dataset.o, r.checked?1:0));
  root.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>A.dashSet(0x0301, 0));
  root.querySelectorAll('[data-da]').forEach(b=>b.onclick=()=>{ const k=b.dataset.da;
    if (k==='open') A.dashOpen(); if (k==='refresh') A.dashRefresh(); if (k==='reboot') A.dashReboot();
    if (k==='upload'){ const sel=root.querySelector('#ogFile'); A.upload(sel? sel.value : 'wb104'); } });
}
function worldControlsHTML(){
  const w=worldAt(SIM.t);
  const opt=(v,cur,l)=>`<option value="${v}" ${v===cur?'selected':''}>${l}</option>`;
  const rates=[32000,44100,48000,96000,192000];
  return `<div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px" class="small">
    <label><input type="checkbox" id="ogR1" ${w.ref1.on?'checked':''}> Frame Ref 1</label><select id="ogR1f">${rates.map(r=>opt(r,w.ref1.fs,r/1000+'k')).join('')}</select>
    <label><input type="checkbox" id="ogR2" ${w.ref2.on?'checked':''}> Frame Ref 2</label><select id="ogR2f">${rates.map(r=>opt(r,w.ref2.fs,r/1000+'k')).join('')}</select>
    <label>REF IN rate <select id="ogEf">${rates.map(r=>opt(r,w.ext.fs,r/1000+'k')).join('')}</select></label>
    <label>Rear <select id="ogRear">${Object.keys(REARS).map(k=>opt(k,w.rear,k)).join('')}</select></label>
    <label>L <select id="ogLl">${[-10,0,4,8,18,24].map(v=>opt(v,w.L.dBu,v+' dBu')).join('')}</select></label>
    <label>R <select id="ogRl">${[-10,0,4,8,18,24].map(v=>opt(v,w.R.dBu,v+' dBu')).join('')}</select></label>
    <button id="ogIns">${w.card?'Pull card':'Insert card'}</button><button id="ogErr">CAN error</button>
    <button id="ogNext" title="Carry the state at 1.000 s into a new second">Next second ▶</button><button id="ogRst">Reset</button>
    <label title="After an action, move the playhead 2 ms past it"><input type="checkbox" id="ogFol" ${D.ui.autoFollow?'checked':''}> follow</label></div>`;
}
function bindWorld(root){
  const q=s=>root.querySelector(s);
  const w=()=>worldAt(SIM.t);
  if (!q('#ogR1')) return;
  q('#ogR1').onchange=e=>A.frameRef(1,e.target.checked); q('#ogR2').onchange=e=>A.frameRef(2,e.target.checked);
  q('#ogR1f').onchange=e=>A.refRate('ref1',+e.target.value); q('#ogR2f').onchange=e=>A.refRate('ref2',+e.target.value); q('#ogEf').onchange=e=>A.refRate('ext',+e.target.value);
  q('#ogRear').onchange=e=>A.setRear(e.target.value);
  q('#ogLl').onchange=e=>A.level(0,+e.target.value); q('#ogRl').onchange=e=>A.level(1,+e.target.value);
  q('#ogIns').onclick=()=> w().card? A.remove() : A.insert();
  q('#ogErr').onclick=()=>A.canErr();
  q('#ogNext').onclick=()=>{ rollSecond(); SIM.refresh(); };
  q('#ogRst').onclick=()=>{ resetAll(); SIM.seek(0); };
  q('#ogFol').onchange=e=>{ D.ui.autoFollow=e.target.checked; };
}
document.addEventListener('keydown', e=>{
  if (!window.__opengearKeys || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase(), c=cacheAt(SIM.t);
  const m={ r:()=>A.dashSet(0x0303, ((c[0x0303]??3)+1)%4), s:()=>A.dashSet(0x0302, ((c[0x0302]??2)+1)%5), x:()=>A.cable('ext', !worldAt(SIM.t).ext.on), l:()=>A.cable('L', !worldAt(SIM.t).L.on), o:()=>A.dashOpen(), n:()=>{ rollSecond(); SIM.refresh(); } };
  if (m[k]){ m[k](); e.preventDefault(); }
});

/* =====================================================================
   TIMELINE LANES
   ===================================================================== */
function lanes(){
  const R=sim(); const css=n=>SIM.css(n); const ls=[];
  const txt=(c,s,x,y)=>{ c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(s,x,y); };
  const segFill=(c,X,y,h,kinds)=>{ R.segs.forEach(g=>{ if (!kinds.includes(g.kind)) return; c.fillStyle= g.kind==='wdt'? css('--bad') : g.kind==='loader'? css('--accent2') : g.kind==='off'? css('--grid') : css('--warn'); c.globalAlpha=.45; c.fillRect(X(g.t0),y+3,Math.max(1,X(g.t1)-X(g.t0)),h-6); c.globalAlpha=1; const wpx=X(g.t1)-X(g.t0); if (wpx>120){ c.save(); c.beginPath(); c.rect(X(g.t0),y,wpx,h); c.clip(); txt(c, g.label, Math.max(X(g.t0),X(0))+4, y+h/2+4); c.restore(); } }); };
  const offTimers=(c,X,y,h)=>{ R.segs.forEach(g=>{ if (!['boot','wdt','loader','off'].includes(g.kind)) return; c.fillStyle=css('--panel'); c.fillRect(X(g.t0),y,Math.max(1,X(g.t1)-X(g.t0)),h); c.fillStyle=css('--ink2'); c.font='10px sans-serif'; if (X(g.t1)-X(g.t0)>120) c.fillText('timers stopped ('+g.kind+')', X(g.t0)+4, y+h/2+4); }); };
  const runs=(fn)=>{ const out=[]; let cur=null; R.snaps.forEach(sn=>{ const v=fn(sn); if (!cur || cur.v!==v){ if (cur) cur.t1=sn.t; cur={t0:sn.t, v}; out.push(cur); } }); if (cur) cur.t1=1; return out; };
  ls.push({label:'Card mode (boot · wait · loader)', h:26, draw(c,X,t0,t1,y,h){
    const r=runs(sn=>sn.mode); r.forEach(g=>{ if (g.v==='app') { c.fillStyle=css('--accent'); c.globalAlpha=.18; c.fillRect(X(g.t0),y+6,X(g.t1)-X(g.t0),h-12); c.globalAlpha=1; } });
    segFill(c,X,y,h,['boot','wait','wdt','loader','off','ee']); }});
  ls.push({label:'Timer0 ISR 1 ms → PB3 500 Hz (FPGA5)', h:26, draw(c,X,t0,t1,y,h){
    const span=t1-t0; if (span<0.02){ c.strokeStyle=css('--accent2'); c.beginPath(); for (let k=Math.floor(t0/C.T0)-1;k<=t1/C.T0+1;k++){ const ta=0.0005+k*C.T0, lv=(k&1); c.lineTo(X(ta), y+(lv?6:h-6)); c.lineTo(X(ta+C.T0), y+(lv?6:h-6)); } c.stroke(); }
    else SIM.pulses(c,X,t0,t1,y,h,C.T0,0.0005,2e-5,css('--accent2'),'timer0 ticks / PB3 toggles');
    R.ticks0.forEach(k=>{ if (k.t>=t0&&k.t<=t1){ c.fillStyle=css('--warn'); c.fillRect(X(k.t)-1,y,3,h); } }); offTimers(c,X,y,h); }});
  ls.push({label:'Timer1 ISR 96 µs ticks', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,C.T1_TICK,0.00004,6e-6,css('--ink2'),'timer1 ticks'); R.sends.forEach(ts=>{ if (ts>=t0&&ts<=t1){ c.fillStyle=css('--play'); c.fillRect(X(ts)-1,y,3,h); } }); offTimers(c,X,y,h); }});
  ls.push({label:'Main loop pass ≈175 µs', h:30, draw(c,X,t0,t1,y,h){
    const pxPass=X(t0+C.LOOP_T)-X(t0);
    if (pxPass<3){ const r=runs(sn=>sn.mode==='app'); r.forEach(g=>{ if (g.v){ c.fillStyle=css('--accent'); c.globalAlpha=.55; c.fillRect(X(g.t0),y+4,X(g.t1)-X(g.t0),h-8); c.globalAlpha=1; } }); segFill(c,X,y,h,['boot','wait','wdt','loader','ee']);
      if (X(t1)-X(t0)>200 && R.passes && !R.segs.some(g=>g.kind==='boot'&&g.t0<=t0+0.01)) txt(c, `${R.passes.toLocaleString()} passes this second (5714/s when nothing blocks)`, X(t0)+6, y+h/2+4); return; }
    R.snaps.forEach(sn=>{ if (sn.mode!=='app' || sn.t<t0-C.LOOP_T || sn.t>t1) return; let tt=sn.t;
      STEPS.forEach((st,j)=>{ const d=st[1]*C.LOOP_T; c.fillStyle= j===2? css('--accent2') : j===1? css('--warn') : css('--accent'); c.globalAlpha=j%2?.55:.85; c.fillRect(X(tt),y+4,Math.max(1,X(tt+d)-X(tt)-.5),h-8); c.globalAlpha=1;
        if (X(tt+d)-X(tt)>80){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(st[0].split(' ')[0].slice(0,22), X(tt)+2, y+h/2+3); } tt+=d; }); });
    segFill(c,X,y,h,['boot','wait','wdt','loader','ee']); }});
  ls.push({label:'CAN bus 1 Mbit/s (rx ▼ MFC→card, tx ▲)', h:34, draw(c,X,t0,t1,y,h){
    let n=0; R.can.forEach(fr=>{ if (fr.t+fr.dur<t0||fr.t>t1) return; n++; const rx=fr.dir==='rx';
      c.fillStyle= rx? css('--accent2') : fr.type===0x10? css('--play') : fr.type===0x11||fr.type===0x13? css('--warn') : css('--accent');
      const xa=X(fr.t), xb=Math.max(xa+1.5, X(fr.t+fr.dur)); c.fillRect(xa, rx? y+3 : y+h/2+1, xb-xa, h/2-4);
      if (xb-xa>70){ c.fillStyle='#fff'; c.font='10px '+css('--mono'); c.fillText(msgName(fr.type).slice(0,16), xa+2, (rx?y+3:y+h/2+1)+10); } });
    if (!n){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('bus idle (heartbeat every ≈0.96 s once DashBoard is quiet)', X(t0)+6, y+h/2+4); } }});
  ls.push({label:'DashBoard display changes', h:22, draw(c,X,t0,t1,y,h){ R.dashUpd.forEach(u=>{ if (u.t<t0||u.t>t1) return; c.fillStyle=css('--play'); c.beginPath(); c.arc(X(u.t), y+h/2, 4, 0, 7); c.fill(); if (X(t1)-X(t0)<4000){ c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText(OID[u.oid]? OID[u.oid].name+'='+valTxt(u.oid,u.v) : '', X(u.t)+6, y+h/2+4); } }); }});
  ls.push({label:'CS8416 lock · clocks_stable', h:24, draw(c,X,t0,t1,y,h){ runs(sn=>sn.A*2+sn.st).forEach(g=>{ c.fillStyle= g.v===3? css('--accent') : g.v===2? css('--warn') : css('--grid'); c.fillRect(X(g.t0), y+5, X(g.t1)-X(g.t0), h-10); if (X(g.t1)-X(g.t0)>110){ txt(c, g.v===3?'locked + stable':g.v===2?'locked, counting 25':'NO_LOCK', X(Math.max(g.t0,t0))+4, y+h/2+4); } }); }});
  ls.push({label:'reference_sel → FPGA (ALTERA2 b6..5)', h:22, draw(c,X,t0,t1,y,h){ runs(sn=>sn.refSel).forEach(g=>{ c.fillStyle= g.v===3? css('--warn') : css('--accent'); c.globalAlpha=.5; c.fillRect(X(g.t0),y+4,X(g.t1)-X(g.t0),h-8); c.globalAlpha=1; if (X(g.t1)-X(g.t0)>90) txt(c, REF_CODE[g.v]||'—', X(Math.max(g.t0,t0))+4, y+h/2+4); }); }});
  ls.push({label:'FPGA SR_DETECT 16 ms windows', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,C.DET_PERIOD,C.DET_PHASE-0.008,0.008,css('--accent2'),'8 ms count / 8 ms hold'); }});
  ls.push({label:'AK5394A RSTN · CAL (output silent)', h:24, draw(c,X,t0,t1,y,h){ runs(sn=>sn.rstn?(sn.cal?2:1):0).forEach(g=>{ c.fillStyle= g.v===0? css('--bad') : g.v===2? css('--warn') : css('--accent'); c.globalAlpha=g.v===1?.25:.6; c.fillRect(X(g.t0),y+4,X(g.t1)-X(g.t0),h-8); c.globalAlpha=1; if (X(g.t1)-X(g.t0)>100) txt(c, g.v===0?'RSTN low — reset_adc':g.v===2?'calibrating ('+'inferred'+')':'converting', X(Math.max(g.t0,t0))+4, y+h/2+4); }); }});
  ls.push({label:'ADC samples / AES frames', h:22, draw(c,X,t0,t1,y,h){ const fs=snapAt((t0+t1)/2).fs; SIM.pulses(c,X,t0,t1,y,h,1/fs,0,0.2/fs,css('--accent'),`frames at ${fs/1000} kHz`); }});
  ls.push({label:'AES blocks (192 frames, Z preamble)', h:22, draw(c,X,t0,t1,y,h){ const fs=snapAt((t0+t1)/2).fs; SIM.pulses(c,X,t0,t1,y,h,192/fs,0,1/fs,css('--warn'),'blocks'); }});
  ls.push({label:'AES OUT L / R', h:40, draw(c,X,t0,t1,y,h){
    const pw=X(t1)-X(t0); const N=Math.min(1600, Math.max(200, pw*2)); const cols=[css('--accent'), css('--bad')];
    [0,1].forEach(k=>{ c.strokeStyle=cols[k]; c.lineWidth=1; c.beginPath(); for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N; const v=outSample(k,tt); const yy=y+h/2 - v*(h/2-3); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); }); }});
  ls.push({label:'LEDs REF1 REF2 EXT INT CAL COM', h:42, draw(c,X,t0,t1,y,h){
    const cols=['#4cc38a','#4cc38a','#4cc38a','#ffb43a','#ff5a4a','#5aa9e6'];
    for (let b=0;b<6;b++){ const r=runs(sn=>(sn.leds>>b)&1); c.fillStyle=cols[b]; r.forEach(g=>{ if (g.v) c.fillRect(X(g.t0), y+2+b*6.6, Math.max(1,X(g.t1)-X(g.t0)), 5); }); } }});
  return ls;
}
function outSample(k, t){
  const sn=snapAt(t); if (sn.mode!=='app' && sn.mode!=='wait') return 0; if (!sn.rstn || sn.cal) return 0;
  const w=worldAt(t); const db=chanDbfs(w,k); if (db===null) return 0;
  const fin = (k? w.R : w.L).f; const n=Math.floor(t*sn.fs); const a=Math.pow(10, Math.min(0,db)/20);
  return a*Math.sin(2*Math.PI*fin*n/sn.fs);
}

/* ---------------- AES frame at the playhead ---------------- */
function aesFrame(t){
  const sn=snapAt(t); const fs=sn.fs; const n=Math.floor(t*fs); const fr=n%192;
  const csBits=[17,18,20,186,188,189];     // i2s_gen_cuv: tcb_counter values that set cs='1' (comment says 18,19,21)
  const internal = sn.refSel===3;
  return { n, fr, fs, internal, sub:[0,1].map(side=>{
    const v=outSample(side,t); let s=Math.round(v*8388607); if (s<0) s+=1<<24;
    const bits=new Array(32).fill(0); for (let b=0;b<24;b++) bits[4+b]=(s>>b)&1;
    bits[28]=0; bits[29]=0; bits[30]= internal? (csBits.includes(fr)?1:0) : 0;
    let p=0; for (let b=4;b<31;b++) p^=bits[b]; bits[31]=p;
    return { pre: side? 'Y' : (fr===0?'Z':'X'), bits, v, raw:s }; }) };
}
function biphase(pre, bits, startLevel){
  const P = {X:[1,1,1,0,0,0,1,0], Y:[1,1,1,0,0,1,0,0], Z:[1,1,1,0,1,0,0,0]}[pre];
  const lv=[]; const inv=startLevel?0:1; P.forEach(b=>lv.push(inv?1-b:b)); let cur=lv[lv.length-1];
  for (let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if (bits[i]) cur=1-cur; lv.push(cur); }
  return lv;
}
function drawScope(cv, el, t){
  const F=aesFrame(t); const {c,w}=SIM.canvas(cv,140);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), a2=SIM.css('--accent2'), warn=SIM.css('--warn');
  const A=biphase(F.sub[0].pre,F.sub[0].bits,0), B=biphase(F.sub[1].pre,F.sub[1].bits,A[A.length-1]); const lv=A.concat(B); const cw=(w-20)/lv.length;
  const zones=[[0,8,warn,'pre'],[8,16,ink2,'aux'],[16,56,acc,'audio'],[56,64,a2,'VUCP']];
  [0,64].forEach(off=>zones.forEach(([a,b,col,lb])=>{ c.fillStyle=col; c.globalAlpha=.12; c.fillRect(10+(off+a)*cw,18,(b-a)*cw,64); c.globalAlpha=1; c.fillStyle=ink2; c.font='10px sans-serif'; if ((b-a)*cw>24) c.fillText(lb,12+(off+a)*cw,96); }));
  c.strokeStyle=ink; c.lineWidth=1.5; c.beginPath(); lv.forEach((v,i)=>{ const x=10+i*cw, y=v?26:74; i?c.lineTo(x,y):c.moveTo(x,y); c.lineTo(x+cw,y); }); c.stroke();
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono');
  c.fillText(`frame ${F.n.toLocaleString()} · ${F.fr}/191 of the block · cell ${SIM.fmtDur(1/(F.fs*128))} · fs ${F.fs/1000} kHz`, 10, 122);
  el.innerHTML = F.sub.map((s,i)=>`${i?'B (R)':'A (L)'} ${s.v.toFixed(5)} → 0x${s.raw.toString(16).padStart(6,'0').toUpperCase()} · V=${s.bits[28]} U=${s.bits[29]} C=${s.bits[30]} P=${s.bits[31]}`).join('<br>')+
   `<br><span class="muted">${F.internal? 'Internal reference: i2s_gen_cuv sets C = 1 only at block positions 17, 18, 20 and 186, 188, 189 (byte 0 is all zero, so bit 0 “professional” is 0).' : 'External/frame reference: C, U, V and the Z timing come from the CS8416 serial stream (i2s8416_aes copies in_reg1 bits 36–39) — the reference’s channel status is passed through '+inf+'.'}</span>`;
}

/* =====================================================================
   VIEWS
   ===================================================================== */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> <span class="muted">at ${SIM.fmtT(D.log[0].t)} (second ${D.log[0].sec})</span></div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Use the card, rear module or the parameter window. Each step the firmware takes is listed here, with the function names from the source.</div>'; }
function inspHTML(t){
  const sn=snapAt(t), w=worldAt(t), R=sim(); const st=stepAt(t); const s0=D.s0.f;
  const src=csSource({reference:sn.ref}, w);
  const recent=R.notes.filter(n=>n.t<=t).slice(-5).reverse();
  return `<table class="kv">
   <tr><th>Second</th><td class="mono">#${D.second} · ${SIM.fmtT(t)} · ${D.ev.length} event(s)</td></tr>
   <tr><th>Card</th><td class="mono">${sn.mode}${st.seg? ' — '+st.seg.label : st.step!==undefined? ' — '+STEPS[st.step][0] : ''}</td></tr>
   <tr><th>slot / mod_address</th><td class="mono">${w.slot} · ADC ${slotAdc(w.slot)} → ADDRESS_TABLE ${ADDRESS_TABLE(slotAdc(w.slot))} · 0x${hx(0x10+w.slot)}</td></tr>
   <tr><th>DIP (PINA)</th><td class="mono">0x${hx(dipRaw(w.dip))} · SW7 ${w.dip[6]?'ON (memory)':'OFF (DIP)'} · SW8 ${w.dip[7]?'ON (DashBoard off)':'OFF (DashBoard on)'} · at boot: dip_switch_enabled ${s0.dip_switch_enabled}, dashboard_enabled ${s0.dashboard_enabled}</td></tr>
   <tr><th>reference / sel</th><td class="mono">${REF_CODE[sn.ref]} → reference_sel ${REF_CODE[sn.refSel]||'—'} · CS8416 input ${src.name} ${src.on? '('+src.fs/1000+'k present)':'(nothing)'}</td></tr>
   <tr><th>Astatus · stable</th><td class="mono">${sn.A?'locked':'NO_LOCK'} · clocks_stable ${sn.st}</td></tr>
   <tr><th>sample rate</th><td class="mono">setting ${SR_NAMES[sn.sr]} · converter runs at ${sn.fs/1000} kHz · DFS ${['00 single','01 double','10 quad'][sn.dfs]}</td></tr>
   <tr><th>ALTERA2 → FPGA</th><td class="mono">0x${hx(sn.a2)} = da_off ${(sn.a2>>7)&1} · ref_sel ${(sn.a2>>5)&3} · sr ${(sn.a2>>2)&7} · aes_sw ${sn.a2&3}</td></tr>
   <tr><th>ALTERA1 ← FPGA</th><td class="mono">0x${hx(sn.a1)} = det_96 ${sn.a1&1} · det_192 ${(sn.a1>>1)&1} · dfs ${(sn.a1>>2)&3} · cal ${(sn.a1>>4)&1}</td></tr>
   <tr><th>ADC reset</th><td class="mono">reset_adc ${sn.rst} · reset_count ${sn.rc}/5714 · no_of_adc_resets ${sn.nres}/2 · RSTN ${sn.rstn?'high':'LOW'}</td></tr>
   <tr><th>Next report</th><td class="mono">parameter_refresh ${PR_NAMES[sn.pr]} · change ${sn.pc} · dashboard_initializing ${sn.init}</td></tr>
   <tr><th>EEPROM</th><td class="mono">[10] ${D.s0.f.ee.valid?'0xAA':'—'} [13] ref ${D.s0.f.ee.ref} [14] sr ${D.s0.f.ee.sr} · BOOT_CONTROL 0x${hx(D.s0.f.ee.bootc)} <span class="muted">(at the start of this second)</span></td></tr>
   <tr><th>Firmware notes</th><td class="small mono">${recent.map(n=>`${SIM.fmtT(n.t)} ${n.s}`).join('<br>')||'—'}</td></tr></table>`;
}
function canLogHTML(t){
  const R=sim(); const rows=R.can.filter(fr=>fr.t<=t).slice(-40).reverse();
  return rows.map(fr=>`<div><span class="muted">${SIM.fmtT(fr.t)}</span> ${fr.dir==='rx'?'<b style="color:var(--accent2)">▼ rx</b>':'<b style="color:var(--accent)">▲ tx</b>'} id 0x${hx(canId(0,fr.src,fr.dst,fr.type,fr.flags),8)} <span class="muted">(${hx(fr.src)}→${hx(fr.dst)} type ${hx(fr.type)} fl ${fr.flags})</span> [${fr.data.length}] ${fr.desc}</div>`).join('') || '<div class="muted">No CAN frames yet in this second.</div>';
}
function viewSim(m){
  window.__opengearKeys = true;
  m.innerHTML = DASH_CSS + `
  <div class="grid2">
    <div>${card('Frame, card and card edge at the playhead', `<div id="frm"></div>
        <div style="display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:10px;align-items:start;margin-top:8px"><div id="crd"></div><div id="edge"></div></div>
        <div class="small muted" style="margin-top:4px">Card edge = ${SIM.src('#OPENGEAR #SERIES/D6203A - #Master #OPENGEAR/D6203A #Functional/D6203A-card-edge.cdr','D6203A-card-edge.cdr')} (CorelDRAW, 2008|41). Card = D6203A ISS4 top side from the gerbers (TOP + TSM + TSS, 120 dpi). Click DIP switches, jumpers H1/H2/H3 and trimmers RV1/RV2; click a frame slot to move the card. Keys: R reference · S sample rate · X REF IN cable · L left cable · O open in DashBoard · N next second.</div>
        <div id="wc"></div>`)}</div>
    <div>${card('Parameter window (DashBoard-style, generic)', `<div id="dash"></div>`)}
      ${card('What the firmware did (last action)', `<div id="trace" class="log"></div>`)}</div>
  </div>
  <div class="grid2">
    <div>${card('Rear module — click REF IN and the LEFT/RIGHT blocks to plug or unplug', `<div style="display:grid;grid-template-columns:minmax(0,320px) minmax(0,1fr);gap:12px"><div><div id="rear"></div><div class="small muted">Rear-module art: ${SIM.src('#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6203A - rear module options.cdr','D6203A - rear module options.cdr')} (CorelDRAW, 2012|45)</div></div><div id="rearInfo" class="small"></div></div>`)}</div>
    <div>${card('State at the playhead', `<div id="insp"></div>`)}</div>
  </div>
  ${card('Timeline — one second, as seen by the card and the displays (click to seek)', `<canvas id="tl"></canvas><p class="small muted">Pass time 175 µs is the source’s own figure (ADC_RESET_CONSTANT comment). Timer periods come from the register values (8 MHz, clk/64). CS8416 lock time, MFC pacing and the phase of the 1 s / heartbeat counters are ${inf}. Changes you make are events at the playhead; “Next second” carries the end state forward.</p>`)}
  <div class="grid2">${card('CAN frames (newest first)', `<div id="canlog" class="log"></div>`)}${card('Scope: AES output frame at the playhead', `<canvas id="scope"></canvas><div id="bits" class="small mono"></div>`)}</div>`;
  let wcVer=-1;
  const draw=()=>{
    const t=SIM.t; finishUploadIfDone();
    if (wcVer!==D.ver){ wcVer=D.ver; m.querySelector('#wc').innerHTML=worldControlsHTML(); bindWorld(m); }
    m.querySelector('#frm').innerHTML = frameSVG(t);
    m.querySelector('#crd').innerHTML = cardSVG(t);
    m.querySelector('#edge').innerHTML = edgeSVG(t);
    m.querySelector('#dash').innerHTML = dashHTML(t);
    m.querySelector('#rear').innerHTML = rearSVG(t);
    const w=worldAt(t), RM=REARS[w.rear];
    m.querySelector('#rearInfo').innerHTML = `<b>${RM.name}</b><br>ID resistors AN_BMID / AN_BMID2: ${RM.id} (not read by the D6203A).<br>${RM.dual? `This card is card #<select id="ogPos"><option ${w.pos===1?'selected':''}>1</option><option ${w.pos===2?'selected':''}>2</option></select> of the pair.<br>`:''}
      <table class="kv" style="margin-top:4px">${RM.pos.map((p,i)=>`<tr><td>${i+1}</td><td>${p[0]}</td><td class="mono">P1-${p[3]}</td><td>${{refin:'REF IN → T1 → U9',out75:'AES 75 Ω (U2 EL5263)',out110:'AES 110 Ω (U4 + PE-65612)',ainL:'LEFT → U3',ainR:'RIGHT → U5',nc:'not connected'}[p[2]]}</td></tr>`).join('')}</table>
      <div class="muted">Source: ${RM.src}.</div>`;
    const ps=m.querySelector('#ogPos'); if (ps) ps.onchange=e=>{ worldEv('pos', w2=>{ w2.pos=+e.target.value; }); SIM.refresh(); };
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#insp').innerHTML = inspHTML(t);
    m.querySelector('#canlog').innerHTML = canLogHTML(t);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200});
    drawScope(m.querySelector('#scope'), m.querySelector('#bits'), t);
    bindAll(m);
  };
  SIM.on('time', draw);
  let last=0; SIM.on('frame', ts=>{ if (D.ui.upl && !D.ui.upl.applied && ts-last>250){ last=ts; draw(); } });
}

/* ---------------- tutorial ---------------- */
function endState(){ const R=sim(); return {f:R.end.f, w:R.end.w}; }
const LESSONS = [
  {title:'Meet the D6203A', body:`<p>The D6203A is an openGear card: a stereo <b>analog → AES/EBU</b> converter. Balanced LEFT and RIGHT audio come in on the rear module, the AK5394A converts them at 32–192 kHz, and the FPGA sends the same AES stream to every output connector.</p>
    <p>The card has no knobs. You control it three ways: the <b>DIP switch</b> and <b>jumpers</b> on the board, the <b>rear module</b> you fit behind it, and <b>DashBoard</b> on a PC, which talks to the card through the frame controller and the frame’s CAN bus.</p><p class="muted">Sources: D6203A Manual (2008, issue 1) and the v1.04 firmware.</p>`, check:()=>true, auto:true},
  {title:'1 · Pick the rear module and slot', body:`<p>The manual (Fig. 2) offers four rear modules for the 20-slot frame: <b>T6302</b> (75 Ω BNC outputs, Phoenix analog inputs, one card), <b>T6402</b> (two cards), <b>T6303</b> / <b>T6403</b> (all 110 Ω Phoenix).</p><p>The T6302 is two slots wide, so the manual says to use the <b>even slots</b> 2, 4 … 20.</p><p><b>Goal:</b> fit a T6302 and put the card in an even slot (click a slot in the frame strip).</p>`, check:()=>{ const w=worldAt(1); return w.rear==='T6302' && w.slot%2===0; }, hint:'Rear select → T6302; click slot 2, 4, 6 …'},
  {title:'2 · Set the DIP switch before you insert', body:`<p>The 8-way DIP switch (manual Fig. 4):</p><ul class="small"><li>SW1–SW2 reference: OFF OFF Frame Ref 1 · OFF ON Frame Ref 2 · ON OFF External · ON ON Internal</li><li>SW3–SW5 internal rate: 32 / 44.1 / 48 / 96 / 192 kHz</li><li>SW7 ON = start from the saved settings (EEPROM), OFF = start from SW1–SW5</li><li>SW8 ON = DashBoard may only watch; OFF = DashBoard may change settings</li></ul><p>In the code, SW7 and SW8 are read once, in <span class="mono">main()</span> after power-up.</p><p><b>Goal:</b> SW7 ON and SW8 OFF (settings from memory, DashBoard in control).</p>`, check:()=>{ const w=worldAt(1); return w.dip[6] && !w.dip[7]; }, hint:'Click switches 7 and 8 on the card drawing.'},
  {title:'3 · Insert the card and watch it boot', body:`<p>Pull the card out, then <b>Insert</b> it. Scrub the timeline: <span class="mono">main()</span> spends ≈0.75 s in a start-up delay, ≈0.6 s measuring the slot-ID resistor (100 ADC samples), 150 ms resetting the FPGA, then joins the CAN bus. The first pass starts the ADC calibration (CAL LED) and the card sends a <b>RESTART</b> trap.</p><p><b>Goal:</b> the card has rebooted in this second.</p>`, check:()=>sim().segs.some(g=>g.kind==='boot'), hint:'Press “Pull card”, then “Insert card”.'},
  {title:'4 · Find it in DashBoard', body:`<p>On the PC, DashBoard shows the frame and its slots. Opening the card makes the frame controller read the card’s whole object tree over CAN: number of parameters, the OID list, the menu sets “Status” and “Control”, the menu names and, for every parameter, its <b>descriptor</b> and <b>value</b>.</p><p><b>Goal:</b> press “Open / rescan” and watch the burst of CAN frames on the timeline.</p>`, check:()=>sim().can.filter(f=>f.dir==='rx').length>20, hint:'Press “Open / rescan” in the parameter window.'},
  {title:'5 · Read the status', body:`<p>“Card Info” shows Product, Name, Supplier, Software Rev (and Website on the Ward-Beck build). “Card Status” shows the alarm summary and <b>Ref Input</b>.</p><p>Card-edge LEDs: <b>REF1/REF2/EXTERNAL</b> green = locked to that reference, flashing = chosen but missing; <b>INTERNAL</b> yellow; <b>CAL</b> red while the converter recalibrates; <b>COM ACTIVITY</b> green when the card talks on CAN.</p><p><b>Goal:</b> open the Card Info tab.</p>`, check:()=>D.ui.dashTab==='info', hint:'Click “Status ▸ Card Info”.'},
  {title:'6 · Choose the internal rate', body:`<p>In <b>Control ▸ Card Settings</b>, set <b>Reference = Internal</b> and <b>Internal Ref Sample Rate = 96kHz</b>.</p><p>The card answers the SET at once (inside the CAN interrupt). On the next main-loop pass the new rate goes to the FPGA; because the converter runs from the internal clock, the firmware holds the AK5394A in reset for ≈1 s, lets it run 100 ms, and resets it again ≈1 s — the CAL LED and ≈2 s of silence. The manual calls this “very short”.</p><p><b>Goal:</b> Internal, 96 kHz.</p>`, check:()=>{ const e=endState(); return e.f.reference===3 && e.f.sample_rate===3; }, hint:'Control ▸ Card Settings → Reference: Internal; Internal Ref Sample Rate: 96kHz.'},
  {title:'7 · Lock to an external reference', body:`<p>Plug a cable into the rear <b>IN</b> BNC (click it) and set <b>Reference = External</b>. The CS8416 locks, the firmware waits 25 stable passes (≈4 ms), then switches the converter clock to the reference and recalibrates. EXTERNAL goes solid, INTERNAL goes out.</p><p>Change the REF IN rate to 96k: the FPGA’s <span class="mono">SR_DETECT_192</span> counts the CS8416 clock against a 500 Hz square wave from the AVR and switches the converter to double speed.</p><p><b>Goal:</b> locked to External.</p>`, check:()=>{ const e=endState(); return e.f.reference===2 && e.f.Astatus===1 && e.f.reference_sel===2; }, hint:'Click the rear IN BNC, then Reference: External. Press Play or scrub past ≈30 ms.'},
  {title:'8 · Lose the reference', body:`<p>Unplug REF IN. On the next pass the card falls back to <b>Internal</b> (INTERNAL lit), EXTERNAL <b>chirps</b>: 1000 passes on, 7000 off (≈0.18 s every 1.4 s).</p><p>DashBoard only learns about it when the card sends its next <b>REPORT_PARAM</b>: a timer interrupt every 96 µs counts to 10 000 (≈0.96 s), sending one parameter at a time in rotation. Turn on <b>Notify on Card Fault</b> to make Card Status show “Ref Input Unlocked”.</p><p><b>Goal:</b> Reference External, cable unplugged, notify on.</p>`, check:()=>{ const e=endState(); return e.f.reference===2 && !e.w.ext.on && e.f.notify===1; }, hint:'Click the IN BNC again; tick “Notify on Card Fault”.'},
  {title:'9 · Save, so it survives a power cycle', body:`<p>Nothing is saved automatically. <b>Settings → Save</b> (OID 3.1) makes the next pass write EEPROM bytes 10 = 0xAA, 13 = reference, 14 = sample rate. With SW7 ON, <span class="mono">RESTORE_INFORMATION_EEPROM()</span> loads them at power-up.</p><p><b>Goal:</b> save, then Reboot from DashBoard and check the reference comes back.</p>`, check:()=>{ return D.s0.f.ee.ref===2 || endState().f.ee.ref===2; }, hint:'Card Settings → Apply (Save). Then Reboot.'},
  {title:'10 · Set the input level', body:`<p>There is no gain control in DashBoard. Level is set on the card: jumpers <b>H1</b> (LEFT) and <b>H2</b> (RIGHT) choose the alignment — +4 dBu = −20 or −18 dBFS (manual Fig. 1) — and trimmers <b>RV1</b>/<b>RV2</b> fine-tune each channel. The archive has no D6203A calibration procedure; the AA6201A V5.1 instruction (apply a known level, adjust, save) is the nearest written method ${inf}.</p><p><b>Goal:</b> H1 and H2 at −18, and the LEFT trim moved.</p>`, check:()=>{ const w=worldAt(1); return w.H1===-18 && w.H2===-18 && w.rv[0]!==0; }, hint:'Click H1 and H2 on the card; click the left or right half of RV1.'},
  {title:'11 · Field firmware upgrade', body:`<p>From v1.03 (Aug 2009|42) the card carries the Ross bootloader. In DashBoard choose <span class="mono">D6203a_v1_04.bin</span> and <b>Upload</b>:</p><ol class="small"><li>START_UPGRADE reaches the application, which replies “wait 1000 ms”, writes BOOT_CONTROL = RUNLDR to EEPROM and stops feeding the watchdog.</li><li>The watchdog resets the AVR into the bootloader at 0x1E000 (BOOTRST fuse). It broadcasts BOOTING.</li><li>The frame controller repeats START_UPGRADE; the loader checks the product name, erases the signature page, takes 256-byte pages, verifies the CRC and reboots into the new code.</li></ol><p>Try the wrong file too: the loader refuses it and the old code stays.</p><p><b>Goal:</b> a successful upload.</p>`, check:()=>!!(D.ui.upl && D.ui.upl.applied && FILES[D.ui.upl.file].pages), hint:'Pick D6203a_v1_04.bin → Upload… and wait for the bar.'},
  {title:'12 · Blank boards (factory)', body:`<p>A new board has no bootloader. The AA6201A V5.1 instruction (the only written procedure in the archive) and the SDK’s <span class="mono">avrinst.bat</span> give the order:</p><ol class="small"><li>Program the AVR fuses with <b>EESAVE</b> and <b>BOOTRST</b> on (SDK: fuses 0xC8CF, extended 0xF5).</li><li>Program the bootloader <span class="mono">BOOTAVR.HEX</span> for the right brand (Ward-Beck, Cobalt or Ross) by ISP/JTAG; avrinst also writes the hardware, serial and product tags at 0x1DF20–0x1DF40, then lock bits 0xCC.</li><li>Upload the application <span class="mono">.bin</span> from DashBoard (step 11).</li></ol><p>The FPGA is separate: <span class="mono">D6203.pof</span> into the EPCS1 over a USB-Blaster in Active Serial mode (D6203.cdf). Only the AVR can be upgraded through DashBoard.</p>`, check:()=>true, auto:true},
  {title:'Done', body:`<p>The other tabs show the same operations from the inside: <b>Software</b> traces the loop, interrupts and CAN messages; <b>One second</b> breaks the timing down; <b>Findings</b> lists what the code is really doing.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){
  window.__opengearKeys = true;
  m.innerHTML = DASH_CSS + `<div class="grid2"><div>${card('Tutorial — installing and running a D6203A', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The frame, card and rear module', `<div id="frm"></div><div style="display:grid;grid-template-columns:minmax(0,1fr) 120px;gap:8px;margin-top:6px"><div id="crd"></div><div id="rear"></div></div><div id="wc"></div>`)}${card('Parameter window', `<div id="dash"></div>`)}${card('Card edge', `<div id="edge"></div>`)}</div></div>`;
  let wcVer=-1;
  const draw=()=>{
    const t=SIM.t; finishUploadIfDone();
    if (wcVer!==D.ver){ wcVer=D.ver; m.querySelector('#wc').innerHTML=worldControlsHTML(); bindWorld(m); }
    m.querySelector('#frm').innerHTML=frameSVG(t); m.querySelector('#crd').innerHTML=cardSVG(t,{labels:false}); m.querySelector('#rear').innerHTML=rearSVG(t,{compact:true});
    m.querySelector('#dash').innerHTML=dashHTML(t); m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=>li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx]; let ok=false; try{ ok=L.check(); }catch(e){ ok=false; }
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>
      <p class="small muted">Goals are checked against the state at the end of the simulated second, so a change made at the playhead counts once its effects have run.</p>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ resetAll(); lessonIdx=0; SIM.seek(0); };
    bindAll(m);
  };
  SIM.on('time', draw);
  let last=0; SIM.on('frame', ts=>{ if (D.ui.upl && !D.ui.upl.applied && ts-last>250){ last=ts; draw(); } });
}

/* ---------------- one second, frame by frame ---------------- */
function viewSecond(m){
  window.__opengearKeys = true;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
   <div class="grid2">${card('As seen by the card', `<div id="dev"></div>`)}${card('As seen by the displays', `<div style="display:grid;grid-template-columns:150px minmax(0,1fr);gap:10px"><div id="edge"></div><div id="dview"></div></div><h3>Downstream meter on the AES output</h3><canvas id="meter"></canvas><p class="small muted">Peak over the last 10 ms, −60…0 dBFS ${inf}.</p>`)}</div>
   ${card('Zoom ladder at the playhead (LEFT output, scaled)', `<canvas id="zl"></canvas>`)}`;
  const draw=()=>{
    const t=SIM.t, sn=snapAt(t), R=sim(), fs=sn.fs;
    const tx=R.can.filter(f=>f.dir==='tx').length, rx=R.can.filter(f=>f.dir==='rx').length;
    const rows=[
      ['Main-loop passes (while(1) in main())', R.passes.toLocaleString(), SIM.fmtDur(C.LOOP_T), '5714/s when nothing blocks (source comment); boot, 100 ms waits and EEPROM writes stop it'],
      ['Timer0 interrupts', '1,000', '1 ms', 'toggle PB3 → 500 Hz to FPGA5; once a second count CAN messages (dashboard_initializing)'],
      ['500 Hz half-periods into SR_DETECT_192', '1,000', '1 ms', 'while high, the FPGA counts CS8416 MCLK (256·fs): >15 360 → 96k, >32 000 → 192k'],
      ['SR_DETECT windows', '62.5', '16 ms', 'counter4: 4 periods counting, 4 holding, one det update each'],
      ['Timer1 interrupts', (1/C.T1_TICK).toFixed(0), SIM.fmtDur(C.T1_TICK), 'CANTX_BUFFER_CHECK, CAN_TX_TIMER: next frame of a multi-frame reply, or the heartbeat after 10 000 ticks'],
      ['Heartbeat REPORT_PARAM', (1/((C.TX_HEART+1)*C.T1_TICK)).toFixed(2), SIM.fmtDur((C.TX_HEART+1)*C.T1_TICK), 'one parameter per report, rotating SIGNAL_STATUS → AES1_LOCK → SAMPLE_RATE → REFERENCE (changes jump the queue)'],
      ['CAN frames this second', `${rx} rx · ${tx} tx`, SIM.fmtDur(frameTime(8)), '1 Mbit/s; an 8-byte extended frame ≈ 144 µs with stuffing '+inf],
      ['EXTERNAL/REF LED chirp', (1/((C.CHIRP_ON+C.CHIRP_OFF+2)*C.LOOP_T)).toFixed(2), SIM.fmtDur((C.CHIRP_ON+C.CHIRP_OFF+2)*C.LOOP_T), '1001 passes on, 7001 off'],
      ['ADC reset sequence', '—', '≈2.1 s', '5714 passes in reset, 100 ms running, 5714 passes in reset (RESET_MAX = 2)'],
      ['AES3 blocks', (fs/192).toFixed(2), SIM.fmtDur(192/fs), '192 frames, Z preamble, channel status'],
      ['AES3 frames = samples per channel', fs.toLocaleString(), SIM.fmtDur(1/fs), 'AK5394A LRCK → I2S_s_p → i2s8416_aes'],
      ['AES3 bit cells', (128*fs).toLocaleString(), SIM.fmtDur(1/fs/128), 'biphase-mark from the 256·fs AES MCLK'],
      ['AK5394A MCLK', '', '', `${sn.refSel===3? (['8.192','11.2896','12.288','12.288 (128·fs)','12.288 (64·fs)'][sn.sr]) : 'CS8416 RMCK ÷ 1/2/4'} MHz (mclk_sel)`],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Use the transport’s Step units (pass, timer1 tick, AES frame, block, SR window, heartbeat) to walk through it.</p>`;
    const st=stepAt(t), F=aesFrame(t); const fr=R.can.filter(f=>f.t<=t && f.t+f.dur>=t)[0];
    m.querySelector('#dev').innerHTML = `<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>AT90CAN128</th><td class="mono">${st.seg? st.seg.label : 'pass: '+STEPS[st.step][0]+'<br><span class="muted">'+STEPS[st.step][2]+'</span>'}</td></tr>
      <tr><th>timer1 tick</th><td class="mono">#${Math.floor(t/C.T1_TICK)} · timer0 ms ${Math.floor(t*1000)} · PB3 ${Math.floor((t-0.0005)/C.T0)&1?'high':'low'}</td></tr>
      <tr><th>CAN bus</th><td class="mono">${fr? (fr.dir==='rx'?'▼ ':'▲ ')+fr.desc : 'idle'}</td></tr>
      <tr><th>FPGA</th><td class="mono">SR_DETECT ${((t-C.DET_PHASE+0.016)%0.016)<0.008?'counting':'holding'} · det ${sn.a1&3} · mclk_sel ${sn.refSel===3?'internal '+SR_NAMES[sn.sr]:'from CS8416'}</td></tr>
      <tr><th>AK5394A</th><td class="mono">${!sn.rstn?'in reset':sn.cal?'calibrating':'sample '+F.n.toLocaleString()} · fs ${fs/1000} kHz</td></tr>
      <tr><th>AES frame</th><td class="mono">${F.fr}/191 · L ${F.sub[0].v.toFixed(4)} R ${F.sub[1].v.toFixed(4)} · ${F.sub[0].pre}</td></tr></table>`;
    m.querySelector('#edge').innerHTML = edgeSVG(t);
    const c=cacheAt(t);
    m.querySelector('#dview').innerHTML = `<table class="kv"><tr><th>DashBoard shows</th><td></td></tr>${[0x0201,0x0202,0x0303,0x0302,0x0400].map(o=>`<tr><td>${OID[o].name}</td><td class="mono">${valTxt(o,c[o])}</td></tr>`).join('')}</table><p class="small muted">The card-edge LEDs change on the next main-loop pass; DashBoard waits for a CAN report.</p>`;
    const {c:g,w}=SIM.canvas(m.querySelector('#meter'),64);
    [0,1].forEach(k=>{ let pk=0; for (let i=0;i<64;i++) pk=Math.max(pk, Math.abs(outSample(k, Math.max(0,t-0.01*i/64)))); const db=pk>0?20*Math.log10(pk):-99; const segs=46, lit=Math.max(0,Math.min(segs,Math.round((db+60)/60*segs)));
      for (let s=0;s<segs;s++){ const x=10+s*(w-20)/segs; g.fillStyle = s<lit? (s>=segs-4?'#e3453a':s>=segs-12?'#e8b23a':'#3fbf5f') : SIM.css('--grid'); g.fillRect(x,6+k*28,(w-20)/segs-2,20); }
      g.fillStyle=SIM.css('--ink'); g.font='11px '+SIM.css('--mono'); g.fillText((k?'R ':'L ')+(db>-99?db.toFixed(1)+' dBFS':'—'),12,20+k*28); });
    const levels=[['1 second',1],['1 heartbeat window (100 ms)',0.1],['1 SR window (16 ms)',0.016],['1 ms (timer0)',0.001],['1 AES frame',1/fs]];
    const H=levels.length*44+10; const {c:z,w:zw}=SIM.canvas(m.querySelector('#zl'),H);
    levels.forEach(([nm,span],i)=>{ const y=8+i*44, t0=Math.max(0,Math.min(1-span,t-span/2)); z.fillStyle=SIM.css('--ink'); z.font='12px sans-serif'; z.fillText(nm+' ('+SIM.fmtDur(span)+')',6,y+14);
      const x0=190, pw=zw-x0-10; z.strokeStyle=SIM.css('--grid'); z.strokeRect(x0,y+2,pw,30); z.strokeStyle=SIM.css('--accent'); z.beginPath(); const N=Math.min(800,pw);
      for (let k=0;k<=N;k++){ const tt=t0+span*k/N; const v=outSample(0,tt); const yy=y+17-v*13; k?z.lineTo(x0+pw*k/N,yy):z.moveTo(x0,yy); } z.stroke();
      const px=x0+(t-t0)/span*pw; z.strokeStyle=SIM.css('--play'); z.beginPath(); z.moveTo(px,y); z.lineTo(px,y+34); z.stroke(); });
  };
  SIM.on('time', draw);
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  pc:{x:10,y:10,w:150,h:60,t:'PC: DashBoard',s:['parameter editor','.bin upload'],d:'DashBoard (2.30 archived in OPEN GEAR DashBoard - #Engineering) runs on a PC and talks to the frame controller over Ethernet. Everything the operator sees comes from the card’s CAN replies and reports.'},
  mfc:{x:10,y:110,w:150,h:70,t:'Frame controller',s:['MFC-8310 (v1.12 archived)','Ethernet ↔ CAN'],d:'Turns DashBoard requests into openGear CAN messages (CANmsg.h) addressed to slot + 0x10, and relays the cards’ replies, reports and traps. The frame-controller set-up note in the archive is for the MFC-8320-N (DIP-selected DHCP / 192.168.2.1 / 10.1.2.1).'},
  mid:{x:10,y:220,w:150,h:110,t:'Midplane (P2)',s:['CANH/CANL','REF1 P2-14 · REF2 P2-10','AN_SLOTID P2-6','+12 V, −7.5 V'],d:'P2 (MEDAC20) carries power, the CAN bus, the two frame AES references and the slot-ID resistor (Frame Address ID.xls: 100K for slot 1 … 681R for slot 20 with a 1K pull-up on the card).'},
  rear:{x:10,y:360,w:150,h:100,t:'Rear module (P1)',s:['T6302 / T6303 / T6402 / T6403','REF IN, AES out, L/R in','ID: AN_BMID / AN_BMID2'],d:'Passive connector boards on the 100-pin P1 (MEC1-150). The D6203A reaches REF IN on pin 97, LEFT on 55/57 and RIGHT on 49/51 (net names AES3/AES4 inherited from a DA layout), and drives AES on 34/37/75/80 (75 Ω) and 61–70 (110 Ω).'},
  can:{x:200,y:110,w:150,h:60,t:'SN65HVD233',s:['CAN transceiver','LBK = PD7'],d:'PD5/PD6 = TXCAN/RXCAN. PD7 drives the transceiver’s loop-back pin: the firmware macro CAN_RX sets it (card isolated during boot), CAN_TX clears it.'},
  mcu:{x:390,y:60,w:180,h:150,t:'AT90CAN128 @ 8 MHz',s:['main() super-loop ≈175 µs','timer0 1 ms · timer1 96 µs','CAN ISR + DashBoard tables','EEPROM, DIP, 6 LEDs'],d:'d6203_test.c + CAN.c + Dashboard.c (ICCAVR 7.15). Not the zeuslib/GearOS scheduler: a WBS super-loop with its own CAN driver, using Ross headers (CANmsg.h, paramdef.h) and product.c. 26 KB of code (.mp), bootloader in the top 8 KB.'},
  ui:{x:390,y:250,w:180,h:70,t:'DIP · H1/H2/H3 · RV1/RV2 · LEDs',s:['SW1–8 on PA7…PA0','LEDs PE2…PE7'],d:'The only on-card controls. DIP read every pass; jumpers and trimmers are analog hardware the firmware never sees.'},
  fpga:{x:620,y:60,w:200,h:200,t:'EP1C3T100 Cyclone',s:['shift_in / shift_out (16 bits)','SR_DETECT_192 · mclk_sel','sel4_1 reference mux','I2S_s_p · i2s_gen_cuv','i2s8416_aes → OUT1/OUT2','altpll2 ×2 → 49.152 MHz'],d:'D6203.bdf / D6203_1.bdf (Quartus 7.2–8.0). Configured from the EPCS1 footprint (BOM part M25P40). Receives a 16-bit control word, measures the reference rate, picks the clocks, packs the ADC’s I2S into AES3 and drives both AES pins with the same stream.'},
  cs:{x:620,y:300,w:200,h:70,t:'CS8416 + 3 × SN75HVD10',s:['REF1, REF2, REF IN → one receiver','RMCK 256·fs, AES-format SDOUT'],d:'The FPGA routes the selected reference (aes_sw = reference) to the CS8416. Its lock (register 0x0C) is Astatus; its clock and serial data feed SR_DETECT_192 and i2s_gen_cuv.'},
  pll:{x:620,y:400,w:200,h:60,t:'PLL1705 + 27 MHz',s:['24.576 and 33.8688 MHz'],d:'Fixed audio clocks for the internal reference: 24.576 MHz (÷2 = 48k, ÷3 = 32k, ×2 PLL = 192k AES) and 33.8688 MHz (÷3 = 44.1k).'},
  adc:{x:860,y:60,w:170,h:110,t:'AK5394A',s:['24-bit stereo ADC','master I2S (SMODE1 = 1)','HPF on, ZCAL = 0','RSTN from PB2 via FPGA6'],d:'Sample rate set by MCLK and DFS from mclk_sel. Held in reset (RSTN low) by the AVR during every recalibration.'},
  ain:{x:860,y:200,w:170,h:90,t:'Analog front end',s:['U3 / U5 NE5532','RV1 / RV2 trim','H1 / H2 −20 / −18'],d:'Balanced inputs from the rear module, buffered and scaled before the converter.'},
  out:{x:860,y:320,w:170,h:110,t:'AES outputs',s:['U2 EL5263 → 4 × 75 Ω BNC','U4 DS34LV87T → PE-65612','→ 4 × 110 Ω','all copies of one stream'],d:'OUT1 and OUT2 from the FPGA both carry aes_out, so every output is identical.'},
};
const WIRES=[['pc','mfc','Ethernet'],['mfc','mid','CAN'],['mid','can','CANH/L'],['can','mcu','TX/RX'],['mid','cs','REF1/REF2'],['rear','cs','REF IN'],['rear','ain','L / R'],['mid','mcu','slot ID'],['ui','mcu',''],['mcu','fpga','FPGA1–6'],['cs','fpga','RMCK/SDOUT'],['pll','fpga','clocks'],['fpga','adc','MCLK/DFS/RSTN'],['ain','adc','AIN±'],['adc','fpga','I2S'],['fpga','out','OUT1/OUT2'],['out','rear','AES']];
function viewBlock(m){
  window.__opengearKeys=false;
  let sel='mcu';
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram — frame, controller, DashBoard and the card (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdi"></div>`)}${card('Signal flow in two sentences', `<p>Audio: rear module → NE5532 → AK5394A → FPGA (I2S → AES3) → line drivers → every output. Control: DashBoard → Ethernet → frame controller → CAN → AT90CAN128 → 16-bit word to the FPGA, plus LEDs, EEPROM and the converter’s reset line.</p>`)}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 1040 470" style="width:100%"><defs><marker id="ogar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <rect x="185" y="40" width="660" height="430" rx="10" fill="none" stroke="var(--line)" stroke-dasharray="5 4"/><text x="195" y="56" font-size="11" fill="var(--ink2)">D6203A card (ISS4)</text>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.2}" marker-end="url(#ogar)"/>`;
      if (l) s+=`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-3}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
        <text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    s+='</svg>';
    m.querySelector('#bd').innerHTML=s; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
  };
  draw();
}

/* ---------------- schematics (redrawn from net and pin names) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*17;
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+20+i*17; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+4}" y="${yy+4}" font-size="10" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x-34}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+20+i*17; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-4}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x+w+34}" y="${yy+4}" font-size="10" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  return s;
}
const box=(x,y,w,h,t,sub)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="var(--ink)"/><text x="${x+w/2}" y="${y+h/2}" text-anchor="middle" font-size="11.5" fill="var(--ink)">${t}</text>${sub?`<text x="${x+w/2}" y="${y+h/2+14}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
const SHEETS=[
  {name:'1 · AT90CAN128 (U7)', note:'Pins and net names from D6203A #PCB/D6203Aiss4.net; port functions from D6203A.h, altera.h, cs84xx.h, ADC.c. Pin 10 (PB0, COM_ERROR_LED in the code) has no net.', svg:()=>
    chip(330,50,200,'U7 AT90CAN128',[['4 PE2','REF1_LED'],['5 PE3','REF2_LED'],['6 PE4','EXTERNAL'],['7 PE5','INTERNAL'],['8 PE6','CAL'],['9 PE7','COM_ACTIVITY'],['12 PB2','FPGA6 (ADC reset)'],['13 PB3','FPGA5 (500 Hz)'],['14 PB4','FPGA4 (data in)'],['15 PB5','FPGA3 (data out)'],['16 PB6','FPGA2 (clock)'],['17 PB7','FPGA1 (strobe)'],['23/24','8 MHz X1'],['20','RESET (JTAG1)']],
      [['30 PD5 TXCAN','CAND → U8-1'],['31 PD6 RXCAN','CANR ← U8-4'],['32 PD7','LBK → U8-5'],['35 PC0','ALTERA_RESET → Q3'],['36 PC1','CS8416_IN'],['37 PC2','CS8416_CLK'],['38 PC3','CS8416_OUT'],['39 PC4','CS8416_SEL2 (code: CS1)'],['40 PC5','CS8416_RESET2 (code: RS1)'],['44…51 PA7…PA0','OUT1_1SW…OUT2_4SW = DIP 1…8'],['59 PF2 ADC2','AN_BMID2 (not read)'],['60 PF1 ADC1','AN_BMID (not read)'],['61 PF0 ADC0','AN_SLOTID'],['54–57','JTAG1 TDI/TDO/TMS/TCK']],'TQFP64 · 3.3 V · ICCAVR 7.15')},
  {name:'2 · Cyclone EP1C3T100 (U10)', note:'Pin numbers and names from altera/v100/D6203.qsf, cross-checked with the netlist. U9/U12/U14 RXEN (pins 71/53/54) are not assigned in the .qsf.', svg:()=>
    chip(320,40,210,'U10 EP1C3T100C8',[['97','FPGA1 strobe'],['1','FPGA2 clock'],['2','FPGA3 data in'],['3','FPGA4 data out'],['4','FPGA5 500 Hz ref'],['5','FPGA6 → RSTN'],['56','REF1 (U12_RX)'],['55','REF2 (U14_RX)'],['72','REF3_EXT (U9_RX)'],['74/75/76/77','REF_LRCLK/SCLK/DATA/MCLK'],['78/79/84','GPO_8416_1..3'],['99','INTCLK_24576'],['100','INTCLK_33868'],['98 → 10','pll_out → pll_clk0 (board loop)']],
      [['73','AES_8416 → U6 RXP'],['70','OUT1 → R39 → U4'],['69','OUT2 → R58 → U4'],['20','SDATA_5394'],['21','FSYNCH_5394'],['22','MCLK_5394'],['23/25','DFS0/DFS1_5394'],['24','HPF_5394 (= 1)'],['26','ZCAL (= 0)'],['27','CAL ← U1'],['28','RSTN → U1'],['29','SMODE1 (= 1)'],['34/35','LRCK/SCLK_5394'],['42…38','TP1…TP5']],'Quartus II 7.2 SP1 → 8.0 SP1 · EPCS1')},
  {name:'3 · Analog in and AK5394A', note:'From the netlist: RV1/RV2 sit in the U3/U5 feedback networks (NET00034/NET00032); H1/H2 pick 36K paths (R77/R76). Gains and the −20/−18 labels are from the manual figure; exact resistor roles are inferred.', svg:()=>
    box(30,60,110,50,'LEFT (P1-55/57)','net AES3N/AES3P')+box(30,250,110,50,'RIGHT (P1-49/51)','net AES4N/AES4P')+
    `<path d="M140 85 H190 M140 275 H190" stroke="var(--ink)"/>`+chip(220,50,120,'U3 NE5532',[['3','in'],['2','fb (H1, R77 36K)']],[['1/7','AINL± → U1-4/5'],['6','RV1 2K trim']],'LEFT')+chip(220,240,120,'U5 NE5532',[['3','in'],['2','fb (H2, R76 36K)']],[['1/7','AINR± → U1-25/24'],['6','RV2 2K trim']],'RIGHT')+
    chip(560,60,170,'U1 AK5394A',[['4/5','AINL+ / AINL−'],['25/24','AINR+ / AINR−'],['17','MCLK'],['18/20','DFS0 / DFS1'],['10','RSTN']],[['13','LRCK →'],['14','SCLK →'],['15','SDATA →'],['16','FSYNC →'],['9','CAL →'],['6/19/12','ZCAL / HPFE / SMODE']],'24-bit ΔΣ, 32–192 kHz')},
  {name:'4 · References and clocks', note:'Netlist: frame refs P2-14/P2-10 → U12/U14 (SN75HVD10), rear REF IN P1-97 → T1 (PE-65612) → H3 75/110 Ω (R30/R31) → U9. U13 PLL1705 with X2 27 MHz makes AUDIO_CLOCK / AUDIO_CLOCK2.', svg:()=>
    box(20,50,120,40,'REF1 P2-14')+box(20,110,120,40,'REF2 P2-10')+box(20,180,120,50,'REF IN P1-97','T1 + H3 75/110')+
    chip(200,50,110,'U12',[['A/B','REF1']],[['1 RO','U12_RX → 56']],'SN75HVD10')+chip(200,120,110,'U14',[['A/B','REF2']],[['1 RO','U14_RX → 55']],'SN75HVD10')+chip(200,190,110,'U9',[['A/B','T1']],[['1 RO','U9_RX → 72']],'SN75HVD10')+
    chip(560,40,170,'U6 CS8416',[['4 RXP','AES_8416 (FPGA 73)'],['15/16/17','CS8416_IN/CLK/OUT'],['14','SEL2 (CS)'],['9','RESET2']],[['24 OMCK/RMCK','U6_MCLK → 77'],['26 SDOUT','U6_SDATA → 76'],['27/28','SCLK/LRCLK → 75/74'],['18–20','GPO → 84/79/78']],'reg 1 = 0x04 (256·fs) · reg 5 = 0xB0')+
    chip(560,290,170,'U13 PLL1705',[['10/11','X2 27 MHz']],[['2','AUDIO_CLOCK 24.576 → 99'],['19','AUDIO_CLOCK2 33.8688 → 100']],'audio clock synthesiser')},
  {name:'5 · AES outputs', note:'FPGA OUT1/OUT2 both carry aes_out (D6203_1.bdf). U2 EL5263 drives the 75 Ω BNCs (R13–R21); U4 DS34LV87T drives transformers T2/T3/T5/T6 to P1 61–70.', svg:()=>{
    let s=box(20,180,110,40,'FPGA OUT1 / OUT2','pins 70 / 69'); s+=chip(220,60,140,'U2 EL5263',[['3','OUT1 (R16/R17)'],['5','OUT2 (R40/R41)']],[['1','→ BNC3 P1-75, BNC5 P1-37'],['7','→ BNC4 P1-80, BNC6 P1-34']],'75 Ω video-style driver');
    s+=chip(220,250,140,'U4 DS34LV87T',[['9/15','OUT1'],['1/7','OUT2']],[['10/14','→ T2 / T3'],['2/6','→ T5 / T6']],'RS-422 quad driver');
    s+=box(600,250,180,80,'T2 → AES1 P1-67/69 · T3 → AES2 61/63','T5 → AES5 68/70 · T6 → AES6 62/64'); s+=box(600,60,180,60,'BNC3/4/5/6 → rear OUT1…OUT4'); return s; }},
  {name:'6 · Card edge and rear modules', note:'P1 = MEDAC100 to the rear module, P2 = MEDAC20 to the midplane (netlist). Rear-module ID resistors from each T-module netlist and Frame Address ID.xls.', svg:()=>
    chip(80,40,160,'P2 midplane',[['1/3/5','+12V'],['2','−7.5V'],['6','AN_SLOTID'],['13/11','CANH / CANL'],['14','REF1'],['10','REF2'],['17–20','PSB_IN± / OUT±']],[],'MEDAC20')+
    chip(420,40,170,'P1 rear module',[['1','AN_BMID2'],['2','AN_BMID'],['97 / 96–100','BNC1_SIG / GND (REF IN)'],['92','BNC2 (unused)'],['75 / 80 / 37 / 34','BNC3/4/5/6 (AES 75 Ω)'],['55/57','AES3 = LEFT'],['49/51','AES4 = RIGHT'],['61–70','AES1/2/5/6 (110 Ω)'],['50/52, 56/58','AES7/8 (unused)'],['5, 12, 17, 22','BNC7–10 (unused)']],[],'MEDAC100')+
    `<text x="640" y="80" font-size="11" fill="var(--ink)">T6302: 3K57 / 4K32</text><text x="640" y="98" font-size="11" fill="var(--ink)">T6303: 3K57 / 3K57</text><text x="640" y="116" font-size="11" fill="var(--ink)">T6402: 3K57 / 1K</text><text x="640" y="134" font-size="11" fill="var(--ink)">T6403: 3K57 / 887R</text><text x="640" y="152" font-size="11" fill="var(--bad)">T6406: 3K57 / 887R (allocated 604R)</text>`},
  {name:'7 · FPGA internals (D6203_1.bdf)', note:'Block-to-block nets extracted from D6203_1.bdf (labels case-insensitive as in Quartus). The 16-bit word: shift_in q0–q1 aes_sw, q2–q4 sr, q5–q6 ref_sel, q7 aes_off; shift_out p0 det_96, p1 det_192, p2–p3 dfs, p4 cal, p8–p15 echo.', svg:()=>
    box(20,40,130,50,'shift_in','FPGA1/2/3')+box(20,120,130,50,'shift_out','→ FPGA4')+box(200,40,140,50,'sel4_1','REF1/REF2/REF3/GND')+box(200,120,140,50,'SR_DETECT_192','fpga_ref 500 Hz')+box(390,40,140,60,'mclk_sel','int 24.576/33.868/49.152')+box(390,130,140,50,'div_3_50 ×2','8.192 / 11.2896')+
    box(580,40,140,50,'altpll2','24.576 × 2 = 49.152')+box(200,220,140,50,'I2S_s_p','ADC I2S → CHA/CHB')+box(390,220,140,50,'i2s_gen_cuv','timing + C bits')+box(580,220,140,60,'i2s8416_aes','ext_sel = VCC')+box(580,320,140,40,'OUT1 = OUT2 = aes_out')+
    `<path d="M150 65 H200 M150 145 H200 M340 145 H390 M340 65 H390 M530 70 H580 M340 245 H390 M530 245 H580 M650 280 V320" stroke="var(--ink2)" fill="none"/>`},
];
function viewSchem(m){
  window.__opengearKeys=false; let i=0;
  m.innerHTML = card('Schematic set — redrawn from net, pin and block names (not the original P-CAD drawings)', `<div id="ogsh" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The original CAD is <span class="mono">D6203A #PCB/D6203Aiss4.sch</span> (P-CAD binary). These sheets are a readable guide built from the ASCII netlist, the .qsf and the .bdf, so the connections are exactly as reliable as those names. Blue labels are nets.</p>`);
  const draw=()=>{
    m.querySelector('#ogsh').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#ogsh button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 480" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="848" height="468" fill="none" stroke="var(--line)"/><text x="840" y="466" text-anchor="end" font-size="10" fill="var(--ink2)">D6203A ISS4 · sheet ${i+1}/${SHEETS.length} · redrawn ${SIM.year(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent=SHEETS[i].note;
  };
  draw();
}

/* ---------------- software diagrams ---------------- */
function viewSoft(m){
  window.__opengearKeys=true;
  m.innerHTML = DASH_CSS + `<div class="grid2">
    ${card('main() while(1) — the box lit up runs at the playhead', `<div id="flow"></div>`)}
    <div>${card('Interrupts (CAN.c)', `<div id="isr"></div>`)}${card('16-bit word to and from the FPGA (ALTERA_write)', `<div id="reg"></div>`)}</div></div>
  <div class="grid2">${card('OID table — card value vs what DashBoard shows', `<div id="oids"></div>`)}${card('CAN message map (DASHBOARD_RESPONSE_SETUP)', `<div id="cmap"></div>`)}</div>
  <div class="grid2">${card('FPGA clock and rate pipeline', `<div id="fpga"></div>`)}${card('How the controls did things', `<div id="btn"></div>`)}</div>
  <div class="grid2">${card('The Ross SDK scheduler the D6203A does not use', `<div id="gear"></div>`)}${card('One source tree, three brands', `<div id="brand"></div>`)}</div>`;
  const draw=()=>{
    const t=SIM.t, sn=snapAt(t), st=stepAt(t), w=worldAt(t), R=sim(), c=cacheAt(t);
    let s=`<svg viewBox="0 0 520 ${STEPS.length*42+80}" style="width:100%"><defs><marker id="oga2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <rect x="120" y="6" width="280" height="26" rx="13" fill="${st.seg&&st.seg.kind==='boot'?'var(--warn)':'var(--chip)'}" stroke="var(--line)"/><text x="260" y="24" text-anchor="middle" font-size="11.5" fill="var(--ink)">main(): init, slot ID, FPGA/CS8416 init, DIP/EEPROM</text>`;
    STEPS.forEach((p,j)=>{ const y=44+j*42, on=(st.step===j && !st.seg); s+=`<line x1="260" y1="${y-10}" x2="260" y2="${y}" stroke="var(--ink2)" marker-end="url(#oga2)"/><rect x="30" y="${y}" width="460" height="30" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
      <text x="40" y="${y+13}" font-size="11" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${p[0]}</text><text x="40" y="${y+25}" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${p[2].slice(0,92)}</text>`; });
    const yb=44+STEPS.length*42; s+=`<path d="M490 ${yb-26} h20 V40 h-20" fill="none" stroke="var(--ink2)" marker-end="url(#oga2)"/><text x="30" y="${yb+16}" font-size="11" fill="var(--ink2)">${st.seg? 'Now: '+st.seg.label : 'pass ≈175 µs · '+R.passes.toLocaleString()+' passes this second'}</text></svg>`;
    m.querySelector('#flow').innerHTML=s;
    const near=(arr,per)=>arr.some(x=>Math.abs(x-t)<per);
    const canNow=R.can.find(fr=>fr.dir==='rx' && t>=fr.t+fr.dur && t<fr.t+fr.dur+0.0003);
    m.querySelector('#isr').innerHTML=`<table class="kv">
      <tr><th>timer0_ovf_isr</th><td class="small">every 1 ms: <span class="mono">TOGGLE_500HZ_PIN</span> (PB3 → FPGA5), <span class="mono">WDR()</span>, every 1000 ticks judge <span class="mono">can_data_rx</span> → dashboard_initializing (now ${sn.init?'YES':'NO'}); reload TCNT0 = 0x83 (comment says 100 µs; it is 1 ms)</td></tr>
      <tr><th>timer1_ovf_isr</th><td class="small">every 96 µs: if a multi-frame reply is pending → <span class="mono">CANTX_BUFFER_CHECK</span> + <span class="mono">CAN_TX_TIMER</span> (next frame); else count to ${sn.init? '1000 × slot = '+(1000*w.slot) : '10 000'} ticks → heartbeat <span class="mono">REPORT_PARAM</span>. Reloads 0xFFF4 (comments say “96 ms”).</td></tr>
      <tr><th>can_rx_isr</th><td class="small" style="${canNow?'background:color-mix(in srgb,var(--accent) 20%,transparent)':''}">CANHPMOB → <span class="mono">CANRX(mob)</span>: only frames for mod_address 0x${hx(0x10+w.slot)} → <span class="mono">DASHBOARD_RESPONSE_SETUP</span> → <span class="mono">CANTX(MOB_buffer_free)</span> answers from inside the interrupt.${canNow?' <b>Running: '+canNow.desc+'</b>':''}</td></tr></table>`;
    const a2=sn.a2, a1=sn.a1; const bit=(v,b)=>(v>>b)&1;
    m.querySelector('#reg').innerHTML=`<table class="kv"><tr><th>out (data_upper)</th><td class="mono">0x00 (unused, q8–q15)</td></tr>
      <tr><th>out (data_lower)</th><td class="mono">0x${hx(a2)} = ${a2.toString(2).padStart(8,'0')}b</td></tr>
      <tr><td colspan="2" class="small mono">b7 da_disabled → aes_off ${bit(a2,7)} · b6–5 reference_sel → ref_sel ${(a2>>5)&3} (${REF_CODE[(a2>>5)&3]}) · b4–2 sample_rate → sr ${(a2>>2)&7} · b1–0 reference → aes_sw ${a2&3}</td></tr>
      <tr><th>in (ALTERA1)</th><td class="mono">0x${hx(a1)} = det_96 ${bit(a1,0)} · det_192 ${bit(a1,1)} · dfs ${(a1>>2)&3} · cal ${bit(a1,4)}</td></tr></table>
      <p class="small muted">Bit-banged by write_data(): data on PB5 (FPGA3), clock PB6 (FPGA2), FPGA status read on PB4 (FPGA4), then STROBE_WRITE on PB7 (FPGA1) loads shift_in and reloads shift_out — so the status read back is one pass old. The firmware ignores the cal bit (the CAL LED line using it is commented out).</p>`;
    const list=[0x0105,0x0102,0x0107,0x010B,0x0104,0x0201,0x0202,0x0301,0x0302,0x0303,0x0305,0x0306,0x0400];
    const live={0x0201:cardStatusVal({Astatus:sn.A,reference:sn.ref,notify:R.end.f.notify}),0x0202:refInputVal({Astatus:sn.A,reference:sn.ref,notify:R.end.f.notify}),0x0302:sn.sr,0x0303:sn.ref};
    m.querySelector('#oids').innerHTML=`<table class="kv"><tr><th>OID</th><th>name</th><th>card now</th><th>DashBoard</th><th>in lists</th></tr>${list.map(o=>{ const L=[PARAM_OIDS.indexOf(o)>=0?(PARAM_OIDS.indexOf(o)<10?'P':'P*'):'', BRANDS[w.brand].menu0.includes(o)?'M0':'', MENU1_OIDS.includes(o)?'M1':'', MENU2_OIDS.includes(o)?'M2':''].filter(x=>x).join(' ');
      const lv = live[o]!==undefined? valTxt(o,live[o]) : (OID[o].missing? 'UNSUPPORTED' : o===0x0306? String(slotAdc(w.slot)) : valTxt(o, oidValue(R.end.f, w, o)));
      const dv = c[o]!==undefined? valTxt(o,c[o]) : '—'; const diff = live[o]!==undefined && c[o]!==live[o];
      return `<tr><td class="mono">${oidTxt(o)}</td><td>${OID[o].name}</td><td class="mono">${lv}</td><td class="mono" style="${diff?'color:var(--warn);font-weight:700':''}">${dv}</td><td class="mono small">${L}</td></tr>`; }).join('')}</table>
      <p class="small muted">P = ParamOIDS_Message (count byte 10; P* = entries 11–12 beyond the count) · M0 Card Info · M1 Card Status · M2 Card Settings. Orange = DashBoard is behind the card (waiting for a REPORT_PARAM).</p>`;
    const handled=[[0x45,'3-byte count (10)'],[0x46,'ParamOIDS_Message, multi-frame'],[0x47,'descriptors: static arrays or MESSAGE_CREATOR_PARAMETER_21/22/40'],[0x49,'INT16 values, strings multi-frame'],[0x4A,'3.3, 3.2 (if dashboard_enabled), 3.1 Save, 4.0, 255.7/255.8 DataSafe restore_start'],[0x50,'“Status” / “Control”'],[0x51,'2 / 1'],[0x52,'Card Info / Card Status / Card Settings'],[0x53,'Menu0/1 OIDs, Menu2 or Menu3'],[0x43,'reboot_device = YES'],[0x40,'reply WAIT 1000 ms, reboot into loader'],[0x56,'UNSUPPORTED (SNMP)'],[0x57,'UNSUPPORTED'],[0x58,'UNSUPPORTED'],[0x54,'not handled → default UNSUPPORTED (product.c is linked but never called)']];
    const counts={}; R.can.forEach(fr=>{ if (fr.dir==='rx') counts[fr.type]=(counts[fr.type]||0)+1; });
    m.querySelector('#cmap').innerHTML=`<table class="kv"><tr><th>type</th><th>message</th><th>card does</th><th>this second</th></tr>${handled.map(([ty,d])=>`<tr><td class="mono">0x${hx(ty)}</td><td class="mono small">${MSG[ty]}</td><td class="small">${d}</td><td class="mono">${counts[ty]||''}</td></tr>`).join('')}
      <tr><td class="mono">0x10</td><td class="mono small">REPORT_PARAM</td><td class="small">sent by the card to CANADDR_TRAP (0x02)</td><td class="mono">${R.can.filter(f=>f.type===0x10).length||''}</td></tr>
      <tr><td class="mono">0x11</td><td class="mono small">TRAP</td><td class="small">CANTRAP_RESTART once after boot</td><td class="mono">${R.can.filter(f=>f.type===0x11).length||''}</td></tr></table>
      <p class="small muted">29-bit ID = priority(2) · version(2) · source(6) · destination(6) · type(8) · flags(5) — CANIDT1…4 in CANTX. Flags: 2 first frame, 0 middle, 1 last, 3 single.</p>`;
    const rowsM=[['000 32k','8.192 (24.576÷3)','8.192','00'],['001 44.1k','11.2896 (33.8688÷3)','11.2896','00'],['010 48k','12.288 (24.576÷2)','12.288','00'],['011 96k','12.288','24.576','01'],['1xx 192k','12.288','49.152 (altpll2)','10']];
    const cur = sn.refSel===3? sn.sr : -1;
    m.querySelector('#fpga').innerHTML=`<table class="kv"><tr><th>ref = 11 (internal), sr</th><th>MCLK → AK5394A (MHz)</th><th>AES MCLK</th><th>DFS</th></tr>${rowsM.map((r,i)=>`<tr style="${i===Math.min(cur,4)?'background:color-mix(in srgb,var(--accent) 20%,transparent)':''}"><td class="mono">${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="mono">${r[3]}</td></tr>`).join('')}
      <tr style="${cur<0?'background:color-mix(in srgb,var(--accent) 20%,transparent)':''}"><td class="mono">ref ≠ 11</td><td class="mono">CS8416 RMCK ÷1/÷2/÷4 by det</td><td class="mono">RMCK</td><td class="mono">from det_96/det_192</td></tr></table>
      <p class="small"><b>SR_DETECT_192</b>: while the AVR’s 500 Hz is high (1 ms) count RMCK (256·fs): &gt; 0x3C00 = 15 360 → ≥ 60 kHz, &gt; 0x7D00 = 32 000 → ≥ 125 kHz (second thresholds 70k / 135k for hysteresis). Now: det ${sn.a1&3}, converter at ${sn.fs/1000} kHz.</p>
      <p class="small"><b>i2s8416_aes</b> takes the audio from the ADC (ext_sel tied to VCC) and the V/U/C/Z bits from i2s_gen_cuv, which passes the CS8416 stream through with a reference, or generates a silent stream with fixed C bits on the internal clock. Its −20 dBFS sine table (sd0…sd47) is never used.</p>`;
    m.querySelector('#btn').innerHTML=`<table class="kv"><tr><th>Operator does</th><th>Firmware path</th><th>What changes</th></tr>
      <tr><td>DashBoard Reference</td><td class="mono small">can_rx_isr → CANRX → DASHBOARD_RESPONSE_SETUP (SET 3.3) → ALTERA_write → reset_adc</td><td class="small">FPGA mux + clock, ≈2.1 s calibration, REPORT_PARAM ≤ 0.96 s later</td></tr>
      <tr><td>DashBoard sample rate</td><td class="mono small">SET 3.2 → sample_rate → ALTERA_write sr bits</td><td class="small">only with internal reference</td></tr>
      <tr><td>Settings → Save</td><td class="mono small">SET 3.1 → save_settings → SAVE_INFORMATION_EEPROM</td><td class="small">EEPROM 10/13/14</td></tr>
      <tr><td>Notify on Card Fault</td><td class="mono small">SET 4.0 → smpte_alarm_enabled</td><td class="small">Card Status / Ref Input alarm bit</td></tr>
      <tr><td>DIP SW1–5</td><td class="mono small">READ_DIP_SWITCHES each pass; ALTERA_write overrides only if SW7 OFF and SW8 ON</td><td class="small">else read at power-up (SW7 OFF)</td></tr>
      <tr><td>DIP SW7 / SW8</td><td class="mono small">main(): MIRROR → dip_switch_enabled / dashboard_enabled</td><td class="small">power-up only</td></tr>
      <tr><td>H1/H2, RV1/RV2, H3</td><td class="small">analog hardware</td><td class="small">level / termination, no OID</td></tr>
      <tr><td>Reboot</td><td class="mono small">REBOOT → reboot_device → while(1) CLI()</td><td class="small">watchdog reset, full boot</td></tr>
      <tr><td>Upload</td><td class="mono small">START_UPGRADE → BOOT_CONTROL = RUNLDR → watchdog → bootavr.c → upgrade.c</td><td class="small">new application</td></tr></table>
      <p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none yet'}</b></p>`;
    m.querySelector('#gear').innerHTML=`<p class="small">The Ross OGP-SDK-AVR (zeuslib) offers <b>GearOS</b>, a non-pre-emptive scheduler (<span class="mono">gearos.c</span>): <span class="mono">osRun()</span> loops <span class="mono">osGetTask()</span> → run the first signalled task → <span class="mono">updateClock()</span>, idling in <span class="mono">osIdleTask()</span> (WDR). Timers signal tasks periodically. The ZTC-8399 test card’s list (<span class="mono">ztctasks.c</span>):</p>
      <table class="kv"><tr><th>priority</th><th>task</th><th>timer</th></tr>${[['canReceive','—'],['syncTest','10 ms'],['doTestFunction','TEST_INTERVAL'],['sendStatusReport','1000 ms'],['reportStatus','MONITOR_INTERVAL'],['eeSaveTask','EE_TICK_INTERVAL']].map((r,i)=>`<tr><td>${i}</td><td class="mono">${r[0]}</td><td class="mono">${r[1]}</td></tr>`).join('')}<tr><td>idle</td><td class="mono">headroomCounter</td><td></td></tr></table>
      <p class="small"><b>The D6203A does not use it.</b> Its firmware is the Ward-Beck pattern shared by D6201A/B, D6202A/B, D6204A, D6207A, AA6201A, AV6201/2A, M6202A, M6203A, M6204A and M6206 (<span class="mono">DASHBOARD_RESPONSE_SETUP</span> in each tree): one super-loop plus timer and CAN interrupts, with descriptors stored as byte arrays. Only the M6205 v6xx (DTS) builds and the M6205-3G R&amp;D tree carry zeuslib with <span class="mono">osInit()</span>. See the Series tab.</p>`;
    const B=BRANDS[w.brand];
    m.querySelector('#brand').innerHTML=`<p class="small"><span class="mono">common.h</span> has <span class="mono">#define WARD_BECK</span> (ROSS_VIDEO and COBALT commented out). Dashboard.c then compiles:</p>
      <table class="kv"><tr><th>define</th><th>Product (1.5)</th><th>Supplier (1.2)</th><th>Card Info OIDs</th><th>zeuspack</th></tr>${Object.values(BRANDS).map(b=>`<tr style="${b===B?'background:color-mix(in srgb,var(--accent) 18%,transparent)':''}"><td class="mono"><button data-br="${b.def}" ${b===B?'class="on"':''}>${b.def}</button></td><td class="mono">${b.product}</td><td>${b.supplier}</td><td class="mono">${b.menu0.map(oidTxt).join(' ')}</td><td class="mono small">${b.cfg} → ${b.bin}</td></tr>`).join('')}</table>
      <p class="small">All three zeuspack configs pack the same <span class="mono">D6203_TEST.hex</span> with the same product list (<span class="mono">/p D6203A /P ADC-8432 /P 9345</span>), so the brand comes only from what common.h said when the hex was built ${inf}. The website string www.ward-beck.com is compiled into every brand (only the Ward-Beck menu shows it).</p>`;
    m.querySelectorAll('[data-br]').forEach(b=>b.onclick=()=>A.brand(b.dataset.br));
  };
  SIM.on('time', draw);
}

/* ---------------- series ---------------- */
function viewSeries(m){
  window.__opengearKeys=false;
  m.innerHTML=`<div class="grid2"><div>${card('openGear series — pick a card', `<div id="slist"></div>`)}</div><div>${card('Architecture', `<div id="sarch"></div>`)}</div></div>
    ${card('Common platform', `<p class="small">Every card: an <b>AT90CAN128</b> card controller (8 MHz, ICCAVR 7.x) on the frame’s CAN bus behind a Ross <b>MFC-8310</b> frame controller, operated from <b>DashBoard</b>; Ross OGP bootloader from about 2009|42 for uploads through the frame; brand chosen at build time (<span class="mono">common.h</span> / <span class="mono">boardtype.h</span> + zeuspack). Rear modules: T62xx (first generation), T63xx single slot, T64xx dual. Each Ward-Beck rear module carries AN_BMID = 3K57 plus a type resistor AN_BMID2.</p>`)}`;
  const draw=()=>{
    m.querySelector('#slist').innerHTML=`<table class="kv"><tr><th>card</th><th>type</th><th>firmware stack</th></tr>${SERIES.map(s=>`<tr style="cursor:pointer;${D.ui.series===s.id?'background:color-mix(in srgb,var(--accent) 18%,transparent)':''}" data-s="${s.id}"><td class="mono">${s.id}${s.model?' ●':''}</td><td class="small">${s.type}</td><td class="small">${s.stack}</td></tr>`).join('')}</table><p class="small muted">● = fully modelled in this plugin. Stack: “WBS” = a DASHBOARD_RESPONSE_SETUP super-loop found in that card’s tree; zeuslib = osInit()/GearOS found. Card data from #OPENGEAR #SERIES/README.md.</p>`;
    m.querySelectorAll('[data-s]').forEach(r=>r.onclick=()=>{ D.ui.series=r.dataset.s; draw(); });
    const s=SERIES.find(x=>x.id===D.ui.series);
    const bx=(x,y,w,h,t,sub,on)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${on?'color-mix(in srgb,var(--accent) 18%,var(--panel2))':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+w/2}" y="${y+18}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${t}</text><text x="${x+w/2}" y="${y+34}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`;
    m.querySelector('#sarch').innerHTML=`<svg viewBox="0 0 520 300" style="width:100%">
      ${bx(10,10,150,46,'DashBoard','PC')}${bx(10,90,150,46,'MFC-8310','frame controller')}${bx(200,90,150,46,s.mcu,s.stack.slice(0,26),true)}
      ${bx(380,30,130,46,'FPGA',s.fpga.slice(0,22),s.fpga!=='—')}${bx(380,100,130,46,'DSP / module',s.dsp.slice(0,22),s.dsp!=='—')}${bx(380,170,130,46,'Key ICs',s.ic.slice(0,22),true)}
      ${bx(200,200,150,46,'Rear modules',s.rear.slice(0,26),true)}
      <path d="M85 56 V90 M160 113 H200 M350 113 H380 M350 105 L380 55 M350 120 L380 190 M275 136 V200" stroke="var(--ink2)" fill="none"/>
      <text x="10" y="270" font-size="12" fill="var(--ink)"><tspan font-weight="700">${s.id}</tspan> — ${s.type}${s.oem!=='—'?' · OEM '+s.oem:''}</text>
      <text x="10" y="288" font-size="11" fill="var(--ink2)">${s.model?'Open the Simulator tab for the full model.':'Summary only — see the card’s README in the archive.'}</text></svg>`;
  };
  draw();
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__opengearKeys=false;
  m.innerHTML = card('What the D6203A firmware and hardware are really doing', `<ol>
   <li><b>No zeuslib, no GearOS.</b> The brief and the series README describe cards “built on” the Ross SDK, but the D6203A v104 application is a Ward-Beck super-loop (<span class="mono">d6203_test.c</span> main) with its own CAN driver (<span class="mono">CAN.c</span>) and hand-built descriptor byte arrays (<span class="mono">Dashboard.c</span>). It borrows only Ross headers (<span class="mono">CANmsg.h</span> “ZeusAVR common”, <span class="mono">paramdef.h</span>), <span class="mono">Ross Video/product.c</span> and <span class="mono">eeprom.c</span>, plus the bootloader. <span class="mono">product.c</span>’s functions are linked (D6203_TEST.mp: _getSupplierName … _setBaseProductInfo) but never called; GET_PRODUCT_INFO (0x54) falls to <span class="mono">default:</span> UNSUPPORTED. Across the series only M6205 v6xx and M6205-3G use <span class="mono">osInit()</span>.</li>
   <li><b>The parameter list says 10 but carries 12.</b> <span class="mono">ParamOIDS_Message</span> has count byte 10 followed by 12 OIDs; GET_NUMPARAMS also answers 10. The two beyond the count are Card Status (2.1) and Notify on Card Fault (4.0). The menus still list them, so DashBoard probably finds them through GET_MENU_OIDS ${inf}.</li>
   <li><b>A menu entry with nothing behind it.</b> <span class="mono">Menu2OID_Message</span> and <span class="mono">Menu3OID_Message</span> list OID 3.5, which no case in <span class="mono">DASHBOARD_RESPONSE_SETUP</span> handles — GET_DESCRIPTOR 3.5 is answered CANRESP_UNSUPPORTED.</li>
   <li><b>Zero-length last frames.</b> <span class="mono">MultiFrameMessageTransmission</span> computes <span class="mono">(length+4)/8</span> frames and then sends a “last” frame of <span class="mono">length − (n·8 − 4)</span> bytes; for 28-byte ParamOIDS_Message (and 12-byte messages on the Ross/Cobalt builds) that is 0 bytes.</li>
   <li><b>“Very short” calibration is ≈2 s.</b> The manual says the CAL LED shows a “very short” self-calibration. In <span class="mono">main()</span>, any change of reference_sel, of the FPGA’s det bits, or of the internal rate holds the AK5394A in reset for ADC_RESET_CONSTANT = 5714 passes (“= 1 sec” in the comment), releases it for a blocking 100 ms, then resets it again (RESET_MAX = 2). The output is silent for ≈2.1 s and the main loop stops for the 100 ms.</li>
   <li><b>DashBoard hears about changes up to ≈1 s late.</b> Replies to DashBoard requests go out from inside the CAN interrupt, but spontaneous reports wait for <span class="mono">timer1_ovf_isr</span> to count TX_HEARTBEAT = 10 000 ticks of 96 µs (0.96 s), and each report carries one parameter (PARAMETER_UPDATE rotates SIGNAL_STATUS → AES1_LOCK → SAMPLE_RATE → REFERENCE). The timer comments say “96 ms” and “100us”; the register values give 96 µs and 1 ms.</li>
   <li><b>Staggered start by slot.</b> <span class="mono">dashboard_initializing</span> starts YES and is re-judged every second by timer0 from <span class="mono">can_data_rx</span>; while YES, reports are spaced <span class="mono">TX_INITIALIZE = 1000 × slot_address</span> ticks (slot 4 ≈ 0.38 s), so cards in different slots do not all talk at once after a frame power-up.</li>
   <li><b>The second 750 ms delay never runs.</b> <span class="mono">main()</span> reuses <span class="mono">i</span>: the first <span class="mono">while (i&lt;15)</span> leaves it at 15, so the later <span class="mono">RESET_HIGH; while (i&lt;15) … ; RESET_LOW</span> pulse lasts microseconds, not 750 ms.</li>
   <li><b>A COM ERROR LED that is not there.</b> <span class="mono">D6203A.h</span> drives COM_ERROR_LED on PB0, but DDRB = 0xEC leaves PB0 an input and the ISS4 netlist has no net on U7 pin 10. The card has six LEDs (L2–L6, L8), matching the manual.</li>
   <li><b>“CAN_RX” really means loop-back.</b> The macro sets PD7, which the netlist ties to LBK of the SN65HVD233 (net LBK, U8-5): the card is in transceiver loop-back for the whole ≈1.5 s boot and joins the bus at <span class="mono">CAN_TX</span>.</li>
   <li><b>Every CAN error restarts the timers.</b> When a MOb reports an error, <span class="mono">can_rx_isr</span> leaves MOB_error = YES and <span class="mono">CAN_FUNCTIONS</span> calls <span class="mono">CANinit()</span>, which re-runs <span class="mono">timer0_init()</span> and <span class="mono">timer1_init()</span> (TCNT1 = 0xD120: next tick 96 ms later) — the 500 Hz reference to the FPGA and any pending multi-frame reply stall briefly.</li>
   <li><b>One CS8416 for three references.</b> All of Frame Ref 1, Frame Ref 2 and External share one receiver: the FPGA’s <span class="mono">sel4_1</span> (aes_sw = the <i>setting</i>, ALTERA2 bits 1..0) picks REF1 / REF2 / REF3_EXT / GND. With “Internal” chosen the receiver sees ground, so Astatus is always NO_LOCK, and the Ref Input alarm is suppressed only because the code tests <span class="mono">reference != INTERNAL_REF</span>.</li>
   <li><b>Fixed channel status, and it says “consumer”.</b> On the internal clock, <span class="mono">i2s_gen_cuv</span> sets C = 1 only at block positions 17, 18, 20 and 186, 188, 189 (its comment says 18, 19, 21): byte 0 is all zeros, so AES3 bit 0 (“professional”) is 0, and the CRC byte is hard-coded. A quick CRC recalculation here did not reproduce those three CRC bits (needs a bench check ${inf}). With a reference, C/U/V come from the CS8416 stream, so the output inherits the reference’s channel status ${inf}. A −20 dBFS sine table (sd0…sd47) sits unused in the same file.</li>
   <li><b>Rear-module ID resistors are wired but ignored.</b> AN_BMID / AN_BMID2 reach PF1/PF2 (U7-60/59) with pull-ups, but the firmware only ever converts ADC0 (ADMUX = 0, the slot ID). T6406’s netlist uses 887R — the same as T6403 — instead of its allocated 604R (Frame Address ID.xls), so a card that did read them could not tell the two apart.</li>
   <li><b>Rear-module drawing vs netlist.</b> <span class="mono">D6203-T6302.pdf</span> (2007) labels T6302 positions 8 and 10 “AES1 / AES2”; the 2008 manual’s Fig. 2 says N/C, and the netlists agree: they land on P1 50/52/56/58 (AES7/AES8), which have no connection on the D6203A ISS4. T6403 ISS1 routed REF IN to P1-5, which the D6203A does not use; ISS2 moved it to P1-97.</li>
   <li><b>Net names from another card.</b> The D6203A’s analog inputs travel on nets called AES3P/N and AES4P/N, its DIP switch lines are OUT1_1SW … OUT2_4SW, and <span class="mono">D6203A.c</span> still defines MODE1–MODE6 “OUT1 = IN1 …”, EQ pushbutton prototypes and an <span class="mono">Eq1 Descriptor.txt</span> in the working folder: the design and code were cloned from the D62xx AES DA family. Dashboard.c’s unused <span class="mono">Parameter21_Message</span> still lists “No SDI Input” and “AES2 Unlocked”; the D6203A SOFTWARE HISTORY OID sheet is an SDI/Dolby voice-over template.</li>
   <li><b>Processor name mismatches.</b> The D6203A .aps debug target is AT90CAN128 and the makefile passes <span class="mono">-DAT90CAN128</span>, but the AppBuilder header says “Target: M128”, the link uses <span class="mono">crtatmega.o</span> and <span class="mono">-lcatm128</span>, and <span class="mono">-DATMEGA</span> is also defined. The literal “.aps says atmega128” case is elsewhere in the series: <span class="mono">M6205_cof.aps</span> (M6205 and M6205-3G trees, 17 files) has an AVR-GCC <span class="mono">&lt;PART&gt;atmega128&lt;/PART&gt;</span> beside a CURRENT_PART of AT90CAN128.</li>
   <li><b>Unassigned FPGA pins enable the reference receivers.</b> U9/U12/U14 RXEN go to EP1C3 pins 71, 53 and 54, which <span class="mono">D6203.qsf</span> never assigns; the receivers work only because Quartus treats unused pins as driven low by default ${inf}.</li>
   <li><b>Bootloader quirks on this card.</b> The Ross loader’s LEDs are on PG3/PG4 (<span class="mono">leds.h</span>), not wired on the D6203A, so the card edge is dark during an upload. Its first BOOTING broadcast goes out at once because <span class="mono">now − msgSent</span> (unsigned char, msgSent = 2) wraps to 254. BOOT_TIMEOUT 60 s returns to the old application if no upload starts.</li>
   <li><b>One build, three labels.</b> All three zeuspack configs pack the same hex with the same product list, so <span class="mono">D6203a_v1_04.bin</span>, <span class="mono">adc-8432_v1_04.bin</span> and <span class="mono">9345_v1_04.bin</span> differ only in file name unless common.h was edited between builds ${inf}. Every brand also compiles in “www.ward-beck.com”.</li>
   <li><b>Artwork 2026|59: card edge and rear modules now from CorelDRAW.</b> Card edge from ${SIM.src('#OPENGEAR #SERIES/D6203A - #Master #OPENGEAR/D6203A #Functional/D6203A-card-edge.cdr','D6203A-card-edge.cdr')} (2008-05-08); rear modules T6302A, T6303A, T6402A and T6403A from ${SIM.src('#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6203A - rear module options.cdr','D6203A - rear module options.cdr')} (2012-01-16), the latest of the module drawings (the 2007|40–2008|41 sheets ${SIM.src('#OPENGEAR #SERIES/D6203A - #Master #OPENGEAR/D6203A #Functional/D6203-T6302.cdr','D6203-T6302.cdr')}, ${SIM.src('#OPENGEAR #SERIES/D6203A - #Master #OPENGEAR/D6203A #Functional/D6203-T6402.cdr','D6203-T6402.cdr')} show the same plates in a sheet frame). What the art shows: the 2012 guide labels T6302A positions 8 and 10 “Not Connected”, settling the 2007 “AES1 / AES2” label above in favour of the manual and netlists; the card-edge drawing has exactly six LED windows (no COM ERROR); on T6402A BNC 3 (AES OUT 1 Card 2) is shaded like the two REF IN jacks — a drawing leftover, the netlist gives it no special role; all four modules carry an “A” suffix (T6302A …) that the netlists and the plugin’s IDs do not. The guide’s text was live (Arial), so libcdr kept the words but not their alignment: the small “G – +” pin legends beside the terminal blocks are re-stacked from the drawing’s line breaks and sit slightly off.</li>
   <li><b>Paperwork slips.</b> The history sheet says “Released – Ross Video (DAC-8432)” (it is ADC-8432); the Ross OEM spec for ADC-8432 is headed “DolbyE/AC3 Decoder”, talks of buying D6207A cards and asks for “auto keys” and video frequency response — a template carried over.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
   <li>Main-loop pass = 175 µs everywhere (the source’s own comment); CAN_FUNCTIONS, CS8416 reads and EEPROM writes vary in reality.</li>
   <li>CS8416 lock time 20 ms, AK5394A calibration 8704 sample periods, watchdog 16 ms, CAN bit stuffing +10 %, frame-controller request order and 0.4 ms gaps, phases of the 1 s timer0 window (0.25 s) and the first heartbeat (0.42 s) ${inf}.</li>
   <li>H1/H2 levels (+24 / +22 dBu = 0 dBFS) and the ±1.5 dB RV range ${inf}; the default DIP setting (Internal, 48 kHz, memory, DashBoard on) is ${inf}.</li>
   <li>Byte 0 and byte 3 of SET_PARAM requests, and how DashBoard handles the 10-vs-12 OID count, are ${inf}. The upload progress bar is compressed.</li>
   <li>Card DIP orientation ${inf}. Rear modules and card edge are the CorelDRAW guide art; the jack hit areas were measured on it.</li></ul>`) + card('Sources', `<ul class="small mono">
   <li>#OPENGEAR #SERIES/D6203A - #Master #OPENGEAR/D6203A #Software/atmel/v104/*.c *.h *.mak *.mp *.aps *_ztcpack.txt</li>
   <li>…/D6203A #Software/altera/v100/D6203.qsf, D6203_1.bdf, *.vhd · …/atmel/Bootloader/common/bootavr.c, upgrade.c, leds.h, flashdrv.h</li>
   <li>…/D6203A #PCB/D6203Aiss4.net, .bom, .pnp; GERBERS/D6203AISS4.TOP, .TSM, .TSS → assets/opengear-d6203a-copper.png, opengear-d6203a-silk.png</li>
   <li>${SIM.src('#OPENGEAR #SERIES/D6203A - #Master #OPENGEAR/D6203A #Functional/D6203A-card-edge.cdr','D6203A-card-edge.cdr')} → assets/opengear-edge.svg · ${SIM.src('#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6203A - rear module options.cdr','D6203A - rear module options.cdr')} → assets/opengear-rear-T6302/T6303/T6402/T6403.svg</li>
   <li>…/D6203A #Functional/D6203-T6302.pdf, D6203-T6402.pdf · T6302 - #ENGINEERING/T6302.DXF, T6302-iss3.net · T6303-iss3.net · T6402-iss2.net · T6403.net, T6403-iss2.net · T6406-iss1.net</li>
   <li>#OPEN GEAR - #Engineering/…/openGear #Manuals #OBSOLETE/D6203A Manual.pdf · OpenGear Frame Address ID.xls · AA62XX/AA6201A V5.1 programming instruction.docx · OGP_SDK/…/gearos.c, ztctasks.c · oem specs/ADC-8432 OEM Specification.pdf · Open GearFrame to PC set up instruction.pdf</li></ul>`);
}

/* ---------------- register ---------------- */
resetAll();
SIM.register({
  id:'opengear', name:'openGear series · D6203A A→D converter (2008|41)', duration:1,
  product:'openGear cards — D6203A (Ross ADC-8432 / Cobalt 9345)', year:2008, family:'#OPENGEAR #SERIES',
  folder:'#OPENGEAR #SERIES',
  summary:'Ward-Beck’s openGear card range, with the D6203A stereo analog→AES converter fully modelled: AT90CAN128 super-loop and CAN interrupts talking to DashBoard through the frame controller, an EP1C3 FPGA that measures the reference rate and builds AES3, and an AK5394A converter. Real ISS4 gerber artwork, four rear modules, a working parameter window and the bootloader upload path.',
  highlights:['Card drawn from the ISS4 gerbers with live LEDs, DIP, jumpers and trimmers','DashBoard-style parameter window fed by simulated CAN replies and reports','Every action traced through can_rx_isr → DASHBOARD_RESPONSE_SETUP → main()','One second at 175 µs passes, 96 µs timer ticks and 1 Mbit/s CAN frames','Field upgrade through the Ross bootloader','Findings: 10-vs-12 OID count, 2 s “short” calibration, ignored rear-module IDs'],
  depth:'Full model',
  stepUnits:[
    {label:'1 main-loop pass (175 µs)', period:()=>C.LOOP_T},
    {label:'1 timer1 tick (96 µs)', period:()=>C.T1_TICK},
    {label:'1 ms (timer0)', period:()=>C.T0},
    {label:'1 AES frame', period:()=>1/snapAt(SIM.t).fs},
    {label:'1 AES block (192 frames)', period:()=>192/snapAt(SIM.t).fs},
    {label:'1 SR_DETECT window (16 ms)', period:()=>C.DET_PERIOD},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[0.016,'16 ms (SR window)'],[0.004,'4 ms (AES block @48k)'],[0.001,'1 ms (timer0)'],[0.0004,'400 µs (2 passes)'],[0.0001,'100 µs (timer1 tick)'],[1/48000*4,'4 AES frames @48k']],
  defaultZoom:0,
  init(){ D.ver++; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: install, DashBoard, upgrade', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'series', label:'Series', render:viewSeries},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
