/* =====================================================================
   AA6201A — openGear analog audio distribution amplifier with silence detection
   (Cobalt 9241 / Ross ADA-8404-C), firmware V100 2008|41 … v5.01 2012|45 (SNMP from v5.00)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources (all under #OPENGEAR #SERIES/AA6201A - #Master #OPENGEAR/AA6201A - #Engineering/):
   - AA6201A - #SOFTWARE/AA6201A - #SOFTWARE #atmel/AA6201A - #SOFTWARE #atmelv501/
       v100w.c      main(), port_init, READ_DIP_SWITCHES, REFRESH_LEDS, boot waits, slot-ID averaging, init_delay
       AA6201A.c/.h PROCESS_MODES (74HC4053 select pins), AD_CONVERTER_AA6201A_SETUP, CALIBRATION_TABLE,
                    CONSTANT_20dBu … CONSTANT_60dBu, LED / port macros, MONO_CHB commented out
       ADC.c/.h     adc_init (104 µs conversion), AD_CONVERTER_SETUP, ADDRESS_TABLE (re-tuned slot thresholds)
       CAN.c/.h     timer0_ovf_isr (1 ms, timer0_interrupt_occurred[]), timer1_ovf_isr (96 µs, TX_INITIALIZE,
                    TX_HEARTBEAT), can_rx_isr, CAN_FUNCTIONS, CANinit (1 Mbit/s), CRC table
       Dashboard.c  every OID, PARAMETER_UPDATE, CAN_TX_TIMER, DASHBOARD_RESPONSE_SETUP, MESSAGE_CREATOR_*,
                    CANMSG_COMMAND "cal"/"fin", SNMP base/OID/trap replies, SAVE/RESTORE_*_EEPROM
       common.h/.c (brand + SNMP_ENABLED defines, INVERT_DATA, wait), CANmsg.h, paramdef.h, OpenGear.h,
       Ross Video/eeprom.c (eepromWriteByte write-if-different), *_ztcpack.txt, V100W.mak
     … #atmel v204/ and #atmelv500/ for the version differences
   - AA6201A - #SOFTWARE/AA6201A SOFTWARE HISTORY.xls (releases, prototype OID sheet)
   - AA6201A - SNMP #Software/AA6201A - #SOFTWARE v500/AA6201-CARD.mib, WARD-BECK*.mib
   - AA6201A - #PCB/AA6201Aiss5.net, .bom, .pnp; GERBERS/AA6201AISS5.TOP/.TSM/.TSS
       → assets/aa6201a-card-copper.png, aa6201a-card-silk.png (120 dpi; third-party logo in the silk blanked)
   - AA6201A - #FUNCTIONAL/AA6201-REAR-MODULES.pdf, AA6201A-T6203.pdf, AA6201A-TOP-ASSY.pdf (ISS1),
       DIP Switch.cdr, AA6201A-card-edge.cdr (converted with Inkscape)
   - AA6201A - #SOFTWARE AA6201A V5.1 programming instruction.docx, … programming instruction(obsolete).docx
   - Fanless.xls (current draw vs level, fanless-frame temperatures)
   - ../AA6201A - #TESTREPORT/AA6201A-V501-24APR12.pdf (scanned checklist)
   - T6303-iss3.net, T6403-iss2.net, T6406-iss1.net (rear modules); opengear.js (slot-ID resistor table)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const infT = s => `<span class="tag-inf" title="${s.replace(/"/g,'&quot;')}">inferred</span>`;
const hx = (n,w) => (n>>>0).toString(16).toUpperCase().padStart(w||2,'0');
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const db = x => 20*Math.log10(Math.max(1e-9, x));
function deep(o){ return JSON.parse(JSON.stringify(o, (k,v)=> v===Infinity? '__inf' : v), (k,v)=> v==='__inf'? Infinity : v); }

/* ---------------- constants from the source ---------------- */
const C = {
  AD_WAIT: 3000,            // AA6201A.c  #define AD_CONVERTER_AA6201A_CONSTANT 3000 (passes between evaluations)
  AD_FIRST: 1000,           // ADC.h      AD_CONVERTER_CONSTANT (left in ad_counter by the slot-ID loop)
  CONV: 104e-6,             // ADC.c      adc_init(): "Conversion time: 104uS" (ADCSRA = 0xC6, clk/64)
  T0: 1e-3,                 // CAN.c      timer0: prescale 64, TCNT0 = 0x83 → 1.000 ms
  T1_FIRST: 0.096,          // CAN.c      timer1: TCNT1 = 0xD120 → 12 000 counts at 125 kHz
  T1_TICK: 96e-6,           // CAN.c      reload 0xFFF4 → 12 counts = 96 µs ("desired value: 100uSec")
  TX_HEART: 10000, TX_FRAMES: 10, TX_INIT_PER_SLOT: 1000,   // TX_HEARTBEAT, TX_FRAMES, TX_INITIALIZE (1000*slot_address)
  DASH_INIT_RX: 10, DASH_INIT_COUNT: 3,                      // DASHBOARD_INITIALIZATION_CONSTANT, DASHBOARD_COUNT_CONSTANT
  SIL_TICKS: 5000,          // AA6201A.c  silence_detection_time_interval*10*500 timer0 ticks per menu step
  PASS: 25e-6,              // main-loop pass time — inferred (no figure in the source; adjustable)
  WAIT_IT: 1e-6,            // one wait() iteration ≈ 1 µs — inferred (D6203A source: wait(50000) "50ms of delay")
  INIT_IT: 1.5e-6,          // one init_delay-- iteration (long decrement + WDR) — inferred
  SLOTID: 0.0061,           // one slot-ID sample: 2 × wait(3000) + 104 µs conversion
  WDT: 0.016,               // WDTCR = 0x08: 16K WDT cycles ≈ 16 ms (AT90CAN128 data sheet) — inferred
  EE_WRITE: 0.0085,         // EEPROM byte write ≈ 8.5 ms (data sheet) — inferred
  CAN_BIT: 1e-6, STUFF: 1.1,// CANBT1/2/3 = 0x00/0x04/0x12 at 8 MHz → 1 Mbit/s; stuffing allowance inferred
  MFC_GAP: 0.0004, MFC_TIMEOUT: 0.1,   // frame-controller pacing — inferred
  DET_TAU: 0.010,           // R44/R63 10K × C26/C34 1.0µ (AA6201Aiss5.bom)
  FIT_A: 906.7, FIT_B: 13.7,// count = A·10^((dBu+20)/20) − B : least-squares fit to CONSTANT_20dBu … CONSTANT_50dBu — inferred fit
  CLIP_OUT: 25.6,           // ±12 V rails (CC6-1212DF), ≈ ±10.5 V per leg → +25.6 dBu balanced — inferred
  SNAP: 0.0005,
};
const THR_CONST = [893,499,273,147,78,39,23,3,3];           // CONSTANT_20dBu … CONSTANT_60dBu (AA6201A.h)
const THR_MENU = [[0,'-20'],[2,'-30'],[4,'-40']];             // MESSAGE_CREATOR_PARAMETER_34: value[j*2], 3 choices
const MODES = ['Stereo DA (Dual 1x4)','Mono Mix ((ChA+ChB)/2)','Mono DA (ChA - 1x8)'];   // Parameter32_Message (v501)
const MODE_CODE = ['STEREO','MONO','MONO_CHA','MONO_CHB'];
const SLOT_R = [100000,30900,15000,9760,6980,5360,4320,3570,3010,2550,2210,1910,1650,1470,1270,1130,1000,887,787,681];  // Frame Address ID.xls (via opengear.js)
const MSG = {0x00:'PRINT',0x10:'REPORT_PARAM',0x11:'TRAP',0x12:'EVENT_LOG',0x13:'BOOTING',0x40:'START_UPGRADE',0x41:'UPGRADE_PAGE',0x42:'VERIFY_UPGRADE',0x43:'REBOOT',0x44:'COMMAND',
  0x45:'GET_NUMPARAMS',0x46:'GET_PARAM_OIDS',0x47:'GET_DESCRIPTOR',0x48:'GET_PARAM_NAME',0x49:'GET_PARAM',0x4A:'SET_PARAM',0x4B:'SET_RELATIVE',0x50:'GET_MENUSET_NAME',0x51:'GET_MENU_COUNT',0x52:'GET_MENU_NAME',0x53:'GET_MENU_OIDS',0x56:'GET_SNMP_BASE',0x57:'GET_SNMP_OID',0x58:'GET_SNMP_TRAP'};
const msgName = t => (t & 0x80) ? (MSG[t & 0x7F]||'0x'+hx(t&0x7F))+' resp' : (MSG[t]||'0x'+hx(t));

/* Brand: common.h #define WARD_BECK / COBALT / ROSS_VIDEO selects these strings in Dashboard.c */
const BRANDS = {
  WARD_BECK: {product:'AA6201A', supplier:'Ward-Beck Systems', menu0:[0x0105,0x0107,0x0102,0x010B,0x0104]},
  COBALT:    {product:'9241', supplier:'Cobalt Digital', menu0:[0x0105,0x0107,0x0102,0x010B]},
  ROSS_VIDEO:{product:'ADA-8404-C', supplier:'Ross Video Ltd', menu0:[0x0105,0x0107,0x0102,0x010B]},
};
const WEBSITE = 'www.ward-beck.com';
const PARAM_OIDS = [0x0102,0x0104,0x0105,0x0107,0x010B,0x0201,0x0202,0x0203,0x0301,0x0302,0x0303,0x0304,0x0400,0x0500,0x0501];  // ParamOIDS_Message (15)
const OID = {
  0x0102:{name:'Supplier', dlen:22, ro:true}, 0x0104:{name:'Website', dlen:21, ro:true}, 0x0105:{name:'Product', dlen:21, ro:true},
  0x0107:{name:'Name', dlen:18, ro:true}, 0x010B:{name:'Software Rev', dlen:26, ro:true},
  0x0201:{name:'Card Status', dlen:112, ro:true}, 0x0202:{name:'Input CHA', dlen:74, ro:true}, 0x0203:{name:'Input CHB', dlen:74, ro:true},
  0x0301:{name:'Settings', dlen:31}, 0x0302:{name:'Mode', dlen:93}, 0x0303:{name:'Silence Detection Time Interval', dlen:151},
  0x0304:{name:'Silence Detection Threshold (dBu)', dlen:69}, 0x0400:{name:'Notify on Card Fault', dlen:58},
  0x0500:{name:'Calibration Left', dlen:36}, 0x0501:{name:'Calibration Right', dlen:37},
};
const oidTxt = o => ((o>>8)&0xFF)+'.'+(o&0xFF);
/* SNMP: MESSAGE_CREATOR_GET_SNMP_* (v5.x, WARD_BECK only), base "25030.1.1.4" */
const SNMP_OID = {0x0104:'1.2.1.8',0x0107:'1.2.1.7',0x010B:'1.2.1.4',0x0105:'1.2.1.3',0x0102:'1.2.1.2',0x0201:'1.3.1.1',0x0202:'1.3.1.2',0x0203:'1.3.1.3',0x0400:'1.4.1.1',0x0302:'1.4.1.2',0x0303:'1.4.1.3',0x0304:'1.4.1.4',0x0301:'1.4.1.5'};
const SNMP_TRAP = {0x0201:'0.3',0x0202:'0.4',0x0203:'0.5'};
const SNMP_NAME = {0x0104:'AA6201Website',0x0107:'AA6201Name',0x010B:'AA6201CardSoftwareRev',0x0105:'AA6201CardProduct',0x0102:'AA6201CardSupplier',0x0201:'aa6201CardStatus',0x0202:'aa6201InputChA',0x0203:'aa6201InputChB',0x0400:'AA6201NotifyOnFault',0x0302:'AA6201Mode',0x0303:'AA6201SilenceDetectionTimeInterval',0x0304:'AA6201SilenceDetectionThreshold',0x0301:'AA6201Save'};

/* ---------------- rear modules (netlists + AA6201-REAR-MODULES.pdf + AA6201A-T6203.pdf) ---------------- */
/* role: inA/inB = balanced input to U11/U12 (BNC1/BNC2 nets), oAn / oBn = output n of group A / B (AES1–4 / AES5–8 nets) */
const REARS = {
  T6303:{name:'T6303 — single card, 10 terminal blocks', dual:false, id:'3K57 / 3K57', src:'T6303-iss3.net · AA6201-REAR-MODULES.pdf', kind:'tb10',
    pos:[['IN1','inA','97/99'],['IN2','inB','92/90'],['OUT1-1','oA1','69/67'],['OUT2-1','oB1','70/68'],['OUT1-2','oA2','63/61'],['OUT2-2','oB2','64/62'],['OUT1-3','oA3','57/55'],['OUT2-3*','oB3','58/56'],['OUT1-4','oA4','51/49'],['OUT2-4','oB4','52/50']]},
  T6203:{name:'T6203 — first-generation 10 TB (DFR-8310 frame)', dual:false, id:'3K57 / 9K76', src:'AA6201A-T6203.pdf · t6203.js (T6203-iss2.net)', kind:'tb10',
    pos:[['IN 1','inA','97/99'],['IN 2','inB','92/90'],['OUT 1-1','oA1','69/67'],['OUT 2-1','oB1','70/68'],['OUT 1-2','oA2','63/61'],['OUT 2-2','oB2','64/62'],['OUT 1-3','oA3','57/55'],['OUT 2-3','oB3','58/56'],['OUT 1-4','oA4','51/49'],['OUT 2-4','oB4','52/50']]},
  T6403:{name:'T6403 — dual card, 10 TB (one input + four outputs per card)', dual:true, id:'3K57 / 887R', src:'T6403-iss2.net · AA6201-REAR-MODULES.pdf', kind:'tb10',
    pos:[['IN1 #2','inA','97/99',2],['IN1 #1','inA','97/99',1],['OUT1 #2','oA1','69/67',2],['OUT1 #1','oA1','69/67',1],['OUT2 #2','oA2','63/61',2],['OUT2 #1','oA2','63/61',1],['OUT3 #2','oA3','57/55',2],['OUT3 #1','oA3','57/55',1],['OUT4 #2','oA4','51/49',2],['OUT4 #1','oA4','51/49',1]]},
  T6406:{name:'T6406 — dual card, 4 × 9-pin TB (2 × 3 DA per card)', dual:true, id:'3K57 / 887R (same as T6403)', src:'T6406-iss1.net · AA6201-REAR-MODULES.pdf', kind:'tb9',
    blocks:[{card:2,col:0,row:0,tb:'TB1',items:[['IN1 #2','inA'],['OUT1-1 #2','oA1'],['OUT1-2 #2','oA2'],['OUT1-3 #2','oA3']]},
            {card:2,col:0,row:1,tb:'TB2',items:[['IN2 #2','inB'],['OUT2-1 #2','oB1'],['OUT2-2 #2','oB2'],['OUT2-3 #2','oB3']]},
            {card:1,col:1,row:0,tb:'TB3',items:[['IN1 #1','inA'],['OUT1-1 #1','oA1'],['OUT1-2 #1','oA2'],['OUT1-3 #1','oA3']]},
            {card:1,col:1,row:1,tb:'TB4',items:[['IN2 #1','inB'],['OUT2-1 #1','oB1'],['OUT2-2 #1','oB2'],['OUT2-3 #1','oB3']]}]},
};
function rearHasIn(w,k){ const RM=REARS[w.rear]; if (!w.rearIn || !RM) return false;
  if (RM.kind==='tb9') return RM.blocks.some(b=>b.card===w.pos && b.items.some(i=>i[1]===(k?'inB':'inA')));
  return RM.pos.some(p=>p[1]===(k?'inB':'inA') && (!RM.dual || p[3]===w.pos)); }
function rearOuts(w){ const RM=REARS[w.rear]; if (!w.rearIn || !RM) return [];
  if (RM.kind==='tb9') return RM.blocks.filter(b=>b.card===w.pos).flatMap(b=>b.items.filter(i=>i[1][0]==='o').map(i=>[i[0],i[1]]));
  return RM.pos.filter(p=>p[1][0]==='o' && (!RM.dual || p[3]===w.pos)).map(p=>[p[0],p[1]]); }

/* ---------------- analog model (AA6201Aiss5.net / .bom) ---------------- */
/* U3 inverting stage: R2 5K49 in, R9 43K2 feedback, plus LVLA 5K pot (CW = GND, CCW = U3 out, wiper → R5 1K → summing node).
   Thevenin of the pot: α·Vout behind α(1−α)·5K. Gain g(α) = (1/R2) / (1/R9 + α/(R5 + 5K·α(1−α))). SSM2143 (×½) and the
   balanced output pair (×2) cancel, so the input-to-output gain is g(α). */
function trimGain(a){ return (1/5490) / (1/43200 + a/(1000 + 5000*a*(1-a))); }
const UNITY_A = (function(){ let lo=0, hi=1; for (let i=0;i<50;i++){ const m=(lo+hi)/2; if (trimGain(m)>1) lo=m; else hi=m; } return (lo+hi)/2; })();
const TURNS = 25;  // multi-turn trimmer ("MULTI 5K") — turn count inferred
function srcLevel(w, k, tAbs){   // input-referred dBu at the card input, or null when nothing is connected
  const s = k? w.B : w.A;
  if (!w.card || !rearHasIn(w,k) || s.src==='off') return null;
  if (s.src==='mute') return -95;
  if (s.src==='program'){ const e = 0.35 + 0.65*Math.abs(Math.sin(2*Math.PI*0.37*tAbs + k)) * (0.6+0.4*Math.abs(Math.sin(2*Math.PI*2.3*tAbs))); return s.dBu + db(e); }
  return s.dBu;
}
function inSample(w, k, tAbs){
  const s = k? w.B : w.A; const L = srcLevel(w,k,tAbs); if (L===null) return 0;
  const a = 0.775*Math.SQRT2*Math.pow(10, L/20);
  if (s.src==='mute') return a*Math.sin(2*Math.PI*7919*tAbs)*0.3;
  if (s.src==='program') return a*(0.6*Math.sin(2*Math.PI*220*tAbs)+0.3*Math.sin(2*Math.PI*330*tAbs+1)+0.2*Math.sin(2*Math.PI*523*tAbs+2))/0.7;
  return a*Math.sin(2*Math.PI*s.f*tAbs);
}
/* outputs: group A from U2 (4053 U1 selects), group B from U7 (4053 U5 selects). sw = {u1a,u1b,u1c,u5a,u5c} pin levels. */
function outSample(w, sw, grp, tAbs){
  const lim = 0.775*Math.SQRT2*Math.pow(10, C.CLIP_OUT/20);
  const a = trimGain(w.lvl[0])*inSample(w,0,tAbs), b = trimGain(w.lvl[1])*inSample(w,1,tAbs);
  let A = 0; if (!sw.u1a) A += a/2; if (!sw.u1b) A += a/2; if (!sw.u1c) A += b/2;   // R11/R14/R18 20K into R1 10K
  A = clamp(A, -lim, lim);
  if (grp===0) return A;
  let B = 0; if (!sw.u5a) B += A; if (!sw.u5c) B += b;                              // R31/R37 10K into R42 10K
  return clamp(B, -lim, lim);
}
function rmsDbu(fn, tAbs){ let s=0; const N=400; for (let i=0;i<N;i++){ const v=fn(tAbs + i*0.05/N); s+=v*v; } const r=Math.sqrt(s/N); return r>1e-7? db(r/0.775) : -120; }
const SW_OF = m => m===0? {u1a:0,u1b:0,u1c:1,u5a:1,u5c:0} : m===1? {u1a:0,u1b:1,u1c:0,u5a:0,u5c:1} : {u1a:0,u1b:0,u1c:1,u5a:0,u5c:1};
const SW_MUTE = {u1a:1,u1b:1,u1c:1,u5a:1,u5c:1};   // port_init: PORTE = 0xFF, DDRE = 0xFF

/* ---------------- slot ID (ADC.c ADDRESS_TABLE, AA6201A thresholds) ---------------- */
function slotAdc(slot){ const R=SLOT_R[slot-1]; return Math.min(1023, Math.floor(1024*R/(R+1000))); }   // R96 1K pull-up to 3V, AREF = 3V
const ADDR_TH = [[1010,1023],[975,1009],[943,975],[911,943],[879,911],[847,879],[815,847],[783,815],[751,783],[730,751],[700,730],[670,700],[640,670],[610,640],[570,610],[540,570],[510,540],[480,510],[450,480],[399,450]];
function ADDRESS_TABLE(v){ for (let i=0;i<20;i++){ const [lo,hi]=ADDR_TH[i]; if (v>lo && v<=hi) return i+1; } return 21; }
/* DIP: SW1..SW4 on PB3..PB6 (nets SW1–SW4 → U9-13…16), pulled up, ON = 0. READ_DIP_SWITCHES: (PINB & 0x78) << 1 */
function dipBits(dip){ let r=0; for (let i=0;i<4;i++) if (!dip[i]) r |= (1<<(4+i)); return r; }
function dipMode(dip){ const inv=dipBits(dip)^0xFF; let m=0; if (inv&0x20) m+=1; if (inv&0x10) m+=2; return Math.min(m,2); }

/* ---------------- detector → ADC counts ---------------- */
function detTarget(w,k,tAbs){ const L=srcLevel(w,k,tAbs); const Ld = (L===null? -100 : L) + db(trimGain(w.lvl[k])); return Math.pow(10, (Math.min(Ld, 19.6)+20)/20); }
function countOf(w,k,env,t){ const n = Math.round(Math.sin(t*9157.3+k*3.1)*0.9); return clamp(Math.round(C.FIT_A*env - C.FIT_B + w.err[k] + n), 0, 1023); }
function dbuOfCount(c){ return 20*Math.log10(Math.max(1e-6,(c + C.FIT_B)/C.FIT_A)) - 20; }

/* ---------------- world + firmware state ---------------- */
function mkWorld(){ return {
  slot:4, rear:'T6303', pos:1, card:true, rearIn:true, mfc:true, brand:'WARD_BECK', ver:'5.01', snmp:true,
  A:{src:'tone', dBu:4, f:1000}, B:{src:'tone', dBu:4, f:400}, lastA:'tone', lastB:'tone',
  dip:[false,false,false,false], lvl:[UNITY_A, UNITY_A],
  err:[37,-22],          // this card's uncalibrated detector offset in counts (what "cal" corrects) — inferred demo values
  passT: C.PASS, scopeOut:'oA1',
};}
function ramInit(f){   // globals at power-up (initialisers in AA6201A.c / Dashboard.c / CAN.c)
  Object.assign(f, {mode:0, pmode:0, sdti:0, sdth:2, notify:0, cal:[0,0], calState:0, cmdRx:0, p501:0,
    audio:[0,0], paudio:[0,0], cnt:[0,0], t0occ:[0,0], adFlag:'READ', adCtr:C.AD_FIRST, input:0, adResult:0, convEnd:0, thr:THR_CONST[5],
    dash_en:1, dip_en:0, sigChange:1, pchange:0, pr:0, txComplete:1, restart_sent:0, dash_init:1, dash_count:0, rxSec:0, intCtr:0, txCtr:0,
    save:0, reboot:0, upgrade:0, leds:0, sw:deep(SW_MUTE), txQ:[], timers:false, canOn:false, stallUntil:0, passes:0});
}
function mkFw(w){
  const f = {phase:'app', bootIx:-1, phaseEnd:Infinity, ee:{10:0xAA,11:0,12:0,13:0,14:2,15:0,16:0,17:0,18:0}, env:[0,0], envT:0,
    mfcQ:[], mfcWait:false, mfcNext:0, mfcTimeout:Infinity, slot:w.slot, slotAdc:slotAdc(w.slot), mod:0x10+w.slot};
  ramInit(f);
  // steady state: a freshly programmed card (V5.1 instruction step 3) that has been running for a while, not yet calibrated
  Object.assign(f, {mode:dipMode(w.dip), pmode:dipMode(w.dip), dip_en:1, dash_en:1, cal:[0,0], restart_sent:1, dash_init:0, adFlag:'WAIT', adCtr:1700, input:1,
    timers:true, canOn:true, nextT0:0.0004, nextT1:0.00003, sw:SW_OF(dipMode(w.dip)), audio:[1,1], paudio:[1,1], sigChange:0, txCtr:5800});
  for (let k=0;k<2;k++) f.env[k]=detTarget(w,k,0);
  f.adResult = countOf(w,1,f.env[1],0);   // last conversion was CHB
  f.thr = THR_CONST[f.sdth]; f.leds = 6;
  return f;
}
function cacheFromFw(f,w){ const c={desc50:f.calState?'slider':'hidden', seen:true}; PARAM_OIDS.forEach(o=>c[o]=getValue(f,w,o)); return c; }
const D = { w:mkWorld(), s0:null, ev:[], second:1, log:[], ver:0, R:null, Rver:-1,
  ui:{dashTab:'status', autoFollow:true, upl:null, consoleOut:[], blk:'det', sheet:0, lesson:0} };
function resetAll(){
  D.w = mkWorld(); const f = mkFw(D.w);
  D.s0 = { w: deep(D.w), f, cache: cacheFromFw(f, D.w) };
  D.ev = []; D.second = 1; D.log = []; D.ver++; D.ui.upl = null; D.ui.consoleOut = [];
}

/* ---------------- parameter values (DASHBOARD_RESPONSE_SETUP / CAN_TX_TIMER) ---------------- */
const brandOf = w => BRANDS[w.brand];
const v5 = w => parseFloat(w.ver) >= 5;
function nameStr(w){ return 'Analog Audio Distribution Amplifier' + (v5(w) && w.snmp ? ' w/SNMP' : ''); }
function inVal(f, k){ if (k===0 && f.mode===3) return 4; if (k===1 && f.mode===2) return 4; return f.audio[k]? 2 : 1; }   // BIT2 Not Used / BIT1 Audio / BIT0 Silence
function statusGet(f){   // case CANMSG_GET_PARAM, OID 2.1
  const sil = f.sdti!==0 && f.notify;
  if (sil && !f.audio[0] && !f.audio[1]) return 2;
  if (sil && !f.audio[0] && (f.mode===2 || f.mode===1)) return 4;
  if (sil && !f.audio[1] && (f.mode===3 || f.mode===1)) return 8;
  return 0;
}
function statusReport(f){ // CAN_TX_TIMER, parameter_refresh == SIGNAL_STATUS
  const sil = f.sdti!==0 && f.notify;
  if (sil && !f.audio[0] && !f.audio[1] && (f.mode===1 || f.mode===0)) return 2;
  if (sil && !f.audio[0] && (f.mode===2 || f.mode===1 || f.mode===0)) return 4;
  if (sil && !f.audio[1] && (f.mode===3 || f.mode===1 || f.mode===0)) return 8;
  return 0;
}
function getValue(f, w, o){
  const B = brandOf(w);
  switch(o){
    case 0x0102: return B.supplier; case 0x0104: return WEBSITE; case 0x0105: return B.product; case 0x0107: return nameStr(w); case 0x010B: return w.ver;
    case 0x0201: return statusGet(f); case 0x0202: return inVal(f,0); case 0x0203: return inVal(f,1);
    case 0x0301: return 0; case 0x0302: return f.mode; case 0x0303: return f.sdti; case 0x0304: return f.sdth; case 0x0400: return f.notify;
    case 0x0500: return f.cal[0]; case 0x0501: return f.cal[1];
  }
  return null;
}
function valTxt(o, v){
  if (v===undefined || v===null) return '—';
  switch(o){
    case 0x0201: return {0:'Ok',2:'CHA and CHB Silence Detected',4:'CHA Silence Detected',8:'CHB Silence Detected'}[v] || ('0x'+hx(v));
    case 0x0202: case 0x0203: return {1:'Silence Detected',2:'Audio Detected',4:'Not Used'}[v] || ('0x'+hx(v));
    case 0x0302: return MODES[v] || `${v} (${MODE_CODE[v]||'?'})`;
    case 0x0303: return v===0? 'Off' : (v<=9? v*5+' Secs' : `${v} (not in menu)`);
    case 0x0304: { const m=THR_MENU.find(x=>x[0]===v); return m? m[1]+' dBu' : (v<=8? `${-20-5*v} dBu (not in menu)` : `${v} (ignored)`); }
    case 0x0400: return v? 'Enabled' : 'Disabled';
    case 0x0500: case 0x0501: return (v>0?'+':'')+v;
  }
  return String(v);
}
function calBytes(v){ return [v<0?0xFF:0x00, v & 0xFF]; }
function calFromBytes(hi, lo){ return hi===0xFF? (lo|0xFFFFFF00) : lo; }

/* ---------------- CAN ---------------- */
function frameTime(n){ return (67 + 8*n) * C.CAN_BIT * C.STUFF; }
function canId(src, dst, type, flags){ return ((src&0x3F)<<19) | ((dst&0x3F)<<13) | ((type&0xFF)<<5) | (flags&0x1F); }
function multiFrames(len){ if (len<=8) return [len]; const n=Math.ceil(len/8); const a=[]; for (let i=0;i<n;i++) a.push(Math.min(8, len-i*8)); return a; }

/* ---------------- boot sequence (v100w.c main(), v5.x) ---------------- */
function bootSegs(slot){ return [
  [0.063, 'initialization(): port_init (PORTE = 0xFF → every 74HC4053 select high → outputs muted), adc_init, DATA_INITIALIZATION (CHA/CHB LEDs on), CAN_RX (transceiver loop-back); wait(63000)'],
  [100*C.SLOTID, 'slot ID pass 1: 100 × AD_CONVERTER_SETUP (2 × wait(3000) each) → average → ADDRESS_TABLE'],
  [0.063, 'wait(63000)'],
  [100*C.SLOTID, 'slot ID pass 2: the same 100 samples again (the first result is thrown away)'],
  [10000*slot*C.INIT_IT, `init_delay = 10000 × slot_address (${slot}) busy loop: cards in higher slots start later`],
  [0.063, 'wait(63000)'],
  [0.008, 'READ_DIP_SWITCHES · RESTORE_CALIBRATION_EEPROM · DIP mode or RESTORE_INFORMATION_EEPROM · DATA_SETUP (CRC of every message) · CAN_setup · CAN_TX'],
];}

/* =====================================================================
   SIMULATION OF ONE SECOND
   ===================================================================== */
function simulate(){
  const S = deep(D.s0); let w = S.w; const f = S.f;
  const R = {snaps:[], segs:[], can:[], evals:[], convs:[], notes:[], hbs:[], passes:0, t1n:0, t0n:0, worlds:[{t:0, w:deep(w)}], cacheEv:[], cache0:deep(D.s0.cache), ee:0, traps:[]};
  const evs = D.ev.slice().sort((a,b)=>a.t-b.t); let ei = 0;
  const note = (t,s)=>R.notes.push({t,s});
  let busFree = 0, segStart = null, segLabel = '', segKind = '';
  const tAbs = t => (D.second-1) + t;
  const openSeg = (t, kind, label)=>{ closeSeg(t); segStart=t; segLabel=label; segKind=kind; };
  const closeSeg = t=>{ if (segStart!==null){ R.segs.push({t0:segStart, t1:t, kind:segKind, label:segLabel}); segStart=null; } };
  if (f.phase!=='app') openSeg(0, f.phase, f.phase==='boot'? bootSegs(f.slot)[f.bootIx][1] : f.phase==='off'? 'card out of the frame' : f.phase==='wdt'? 'hung in while(1) CLI() — waiting for the watchdog' : f.phase);
  if (f.stallUntil>0) openSeg(0, 'ee', 'SAVE_*_EEPROM: eepromWriteByte busy-waits');

  const sendFrame = (t, fr)=>{ const st=Math.max(t,busFree); const dur=frameTime(fr.len); busFree=st+dur; fr.t=st; fr.dur=dur; R.can.push(fr);
    if (fr.cache) fr.cache.forEach(([o,v])=>R.cacheEv.push({t:st+dur, o, v}));
    if (fr.last && fr.dir==='tx' && fr.reply){ f.mfcWait=false; f.mfcNext=st+dur+C.MFC_GAP; f.mfcTimeout=Infinity; }
    return st+dur; };
  const txMsg = (t, type, dst, data, desc, cache, reply)=>{
    const lens = multiFrames(data.length); let off=0;
    lens.forEach((n,i)=>{ const fr={dir:'tx', src:f.mod, dst, type, flags:lens.length===1?3:(i===0?2:(i===lens.length-1?1:0)), data:data.slice(off,off+n), len:n, desc:(i? `… frame ${i+1}/${lens.length}` : desc + (lens.length>1? ` (${lens.length} frames)`:'')), last:i===lens.length-1, reply};
      if (i===lens.length-1 && cache) fr.cache=cache; off+=n;
      if (i===0) sendFrame(t, fr); else f.txQ.push(fr); });
  };
  const sw = ()=> f.sw;
  const envUpdate = t=>{ const dt=t-f.envT; if (dt<=0) return; const a=1-Math.exp(-dt/C.DET_TAU); for (let k=0;k<2;k++) f.env[k] += (detTarget(w,k,tAbs(t))-f.env[k])*a; f.envT=t; };

  /* ---- firmware pieces ---- */
  const enterBoot = (t, why)=>{ ramInit(f); f.phase='boot'; f.bootIx=0; f.slot=ADDRESS_TABLE(slotAdc(w.slot)); const B=bootSegs(f.slot); f.phaseEnd=t+B[0][0];
    f.leds = 6; f.sw = deep(SW_MUTE); openSeg(t,'boot',B[0][1]); note(t, why); };
  const enterApp = t=>{
    f.slotAdc = slotAdc(w.slot); f.slot = ADDRESS_TABLE(f.slotAdc); f.mod = 0x10 + f.slot;
    const dip = dipBits(w.dip); f.dip_en = (dip & 0x40)? 1:0; f.dash_en = (dip & 0x80)? 1:0;
    const ee = f.ee; const rdCal = (hi,lo)=> lo===0xFF? 0 : calFromBytes(hi,lo);
    if (ee[10]===0xAA){ f.cal=[rdCal(ee[15],ee[16]), rdCal(ee[17],ee[18])]; }
    if (!f.dip_en){ if (ee[10]===0xAA){ f.notify=ee[11]; f.mode=ee[12]; f.sdti=ee[13]; f.sdth=ee[14]; } }
    else f.mode = dipMode(w.dip);
    f.pmode = f.mode;
    f.phase='app'; f.phaseEnd=Infinity; f.adFlag='WAIT'; f.adCtr=C.AD_FIRST; f.input=0; f.adResult=f.slotAdc;
    f.timers=true; f.canOn=true; f.nextT0=t+C.T0; f.nextT1=t+C.T1_FIRST; f.txCtr=0; f.intCtr=0;
    openSeg(t,'app',''); segStart=null;
    note(t, `main(): slot ${f.slot} (ADC ${f.slotAdc}), mod_address 0x${hx(f.mod)}; DIP 0x${hx(dip)} → dip_switch_enabled ${f.dip_en?'YES':'NO'}, dashboard_enabled ${f.dash_en?'YES':'NO'}; mode ${MODE_CODE[f.mode]} from ${f.dip_en?'the DIP switch':'EEPROM'}; cal L ${f.cal[0]} R ${f.cal[1]}`);
  };
  const evaluate = (t,k)=>{
    const cal = f.cal[k]; const [hi,lo] = calBytes(cal); let r = f.adResult;
    if (hi===0xFF){ const tmp=((~lo)&0xFF)+1; r = tmp>r? 0 : r-tmp; } else r = r + lo;   // CALIBRATION_TABLE
    const lim = (f.sdti*C.SIL_TICKS) & 0xFFFF; let added = 0;
    if (r > f.thr){ f.audio[k]=1; f.cnt[k]=0; }
    else { if (f.t0occ[k]>0){ added=f.t0occ[k]; f.cnt[k]=(f.cnt[k]+f.t0occ[k])&0xFFFF; f.t0occ[k]=0; } if (f.cnt[k]>=lim){ f.audio[k]=0; f.cnt[k]=lim; } }
    R.evals.push({t, k, raw:f.adResult, r, thr:f.thr, a:f.audio[k], cnt:f.cnt[k], added});
  };
  const heartbeat = t=>{
    if (!f.restart_sent){ f.restart_sent=1; txMsg(t, 0x11, 0x02, [0x01], 'TRAP CANTRAP_RESTART (card has booted)'); R.hbs.push({t,k:'restart'}); return; }
    if (f.cmdRx){ const p=f.p501? 1:0; txMsg(t, 0x11, 0x02, [0x02,0x05,p,0x02], `TRAP [02 05 0${p} 02] after “cal”/“fin” (OID 5.${p}) ${''}`); R.traps.push({t,o:p?0x0501:0x0500});
      if (!f.p501) f.p501=1; else { f.p501=0; f.cmdRx=0; } f.txComplete=1; f.pchange=0; R.hbs.push({t,k:'cal trap'}); return; }
    let o, v;
    if (f.pr===0){ o=0x0202; v=inVal(f,0); } else if (f.pr===2){ o=0x0302; v=f.mode; } else if (f.pr===1){ o=0x0203; v=inVal(f,1); } else { o=0x0201; v=statusReport(f); }
    txMsg(t, 0x10, 0x02, [0x00, o>>8, o&0xFF, 2, 0, v], `REPORT_PARAM ${oidTxt(o)} ${OID[o].name} = ${valTxt(o,v)}`, [[o,v]]);
    if (SNMP_TRAP[o] && v5(w) && w.snmp && w.brand==='WARD_BECK') R.traps.push({t,o,v});
    f.txComplete=1; f.pchange=0; R.hbs.push({t,k:OID[o].name});
  };
  const timer0 = t=>{ R.t0n++; f.t0occ[0]=(f.t0occ[0]+1)&0xFF; f.t0occ[1]=(f.t0occ[1]+1)&0xFF;
    if (f.intCtr===1000){ if (f.rxSec < C.DASH_INIT_RX){ f.dash_count++; if (f.dash_count>=C.DASH_INIT_COUNT){ if (f.dash_init) note(t,'timer0_ovf_isr: fewer than 10 CAN messages in 3 seconds → dashboard_initializing = NO (heartbeat every 10 000 ticks)'); f.dash_init=0; } }
      else { if (!f.dash_init) note(t,'timer0_ovf_isr: ≥ 10 CAN messages this second → dashboard_initializing = YES (fast reports)'); f.dash_init=1; f.dash_count=0; }
      f.intCtr=0; f.rxSec=0; } else f.intCtr++; };
  const timer1 = t=>{ R.t1n++;
    if (f.txQ.length){ sendFrame(t, f.txQ.shift()); return; }
    f.txCtr++; const thr = f.dash_init? C.TX_INIT_PER_SLOT*f.slot : C.TX_HEART;
    if (f.txCtr > thr){ f.txCtr=0; heartbeat(t); } };
  const pass = t=>{
    R.passes++; f.passes++;
    // AD_CONVERTER_AA6201A_SETUP
    if (f.adFlag==='READ'){ if (t>=f.convEnd){ envUpdate(t); f.adResult=countOf(w,f.input,f.env[f.input],t); f.adFlag='WAIT'; } }
    else if (f.adFlag==='WAIT'){ if (f.adCtr>0) f.adCtr--; else { f.adFlag='RESET'; f.adCtr=C.AD_WAIT; evaluate(t, f.input); } }
    else if (f.adFlag==='RESET'){ f.input^=1; f.convEnd=t+C.CONV; f.adFlag='READ'; R.convs.push({t, k:f.input}); }
    // PROCESS_MODES
    if (f.dip_en && !f.dash_en) f.mode = dipMode(w.dip);
    if (f.sdth>=0 && f.sdth<=8) f.thr = THR_CONST[f.sdth];
    if (f.mode!==0 && f.mode!==1) f.mode = 2;
    f.sw = SW_OF(f.mode);
    // REFRESH_LEDS (COM_ACTIVITY_LED_ON is commented out everywhere)
    f.leds = (f.audio[0]?4:0) | (f.audio[1]?2:0);
    // CAN_FUNCTIONS → PARAMETER_UPDATE
    if (!f.pchange){
      if (f.audio[0]!==f.paudio[0]){ f.pr=0; f.pchange=1; f.paudio[0]=f.audio[0]; f.sigChange=1; }
      else if (f.mode!==f.pmode){ f.pr=2; f.pchange=1; f.pmode=f.mode; f.sigChange=1; }
      else if (f.audio[1]!==f.paudio[1]){ f.pr=1; f.pchange=1; f.paudio[1]=f.audio[1]; }
      else if (f.sigChange){ f.pr=3; f.pchange=1; f.sigChange=0; }
      else if (f.txComplete){ f.pr = (f.pr+1)&3; }
    }
    if (f.reboot){ f.reboot=0; f.phase='wdt'; f.phaseEnd=t+C.WDT; f.timers=false; f.canOn=false; openSeg(t,'wdt', f.upgrade? 'START_UPGRADE: BOOT_CONTROL = RUNLDR, while(1) CLI() → watchdog' : 'REBOOT: while(1) CLI() → watchdog reset'); note(t, 'CAN_FUNCTIONS: reboot_device → while(1) CLI(); the watchdog (WDTCR = 0x08) resets the AVR'); return; }
    if (f.save){ f.save=0; const want={10:0xAA,11:f.notify,12:f.mode,13:f.sdti,14:f.sdth}; const cb=[...calBytes(f.cal[0]),...calBytes(f.cal[1])]; want[15]=cb[0]; want[16]=cb[1]; want[17]=cb[2]; want[18]=cb[3];
      let n=0; for (const a in want){ if (f.ee[a]!==want[a]){ f.ee[a]=want[a]; n++; } } R.ee+=n;
      f.stallUntil = t + n*C.EE_WRITE; if (n) openSeg(t,'ee',`SAVE_INFORMATION_EEPROM + SAVE_CALIBRATION_EEPROM: ${n} byte(s) changed`);
      note(t, `main(): save_settings → SAVE_INFORMATION_EEPROM, SAVE_CALIBRATION_EEPROM; eepromWriteByte only writes bytes that differ: ${n} write(s) ≈ ${(n*C.EE_WRITE*1000).toFixed(0)} ms ${'(inferred timing)'}`); }
  };
  /* ---- CAN requests from the frame controller ---- */
  const handleReq = (t, rq)=>{   // can_rx_isr → CANRX → DASHBOARD_RESPONSE_SETUP (runs inside the ISR)
    f.rxSec++;
    const ty=rq.type, rsp=0x80|ty, d=rq.d||[];
    const send = (data, desc, cache)=>txMsg(t, rsp, 0x01, data, desc, cache, true);
    const str = s=>Array.from(s).map(c=>c.charCodeAt(0));
    const ver5 = v5(w), snmp = ver5 && w.snmp && w.brand==='WARD_BECK';
    switch(ty){
      case 0x45: return send([0,0,15], 'GET_NUMPARAMS resp: 15');
      case 0x46: return send([0,0,0,15, ...PARAM_OIDS.flatMap(o=>[o>>8,o&0xFF])], 'GET_PARAM_OIDS resp: 15 OIDs');
      case 0x50: return send([0, d[0], 0, ...str(d[0]?'Control':'Status'),0], `GET_MENUSET_NAME resp: “${d[0]?'Control':'Status'}”`);
      case 0x51: return send([0, d[0], d[0]?1:2], `GET_MENU_COUNT resp: ${d[0]?1:2}`);
      case 0x52: { const nm = d[0]? 'Card Settings' : d[1]? 'Card Status' : 'Card Info'; return send([0,d[0],d[1],...str(nm),0], `GET_MENU_NAME resp: “${nm}”`); }
      case 0x53: { let L; if (!d[0] && !d[1]) L=brandOf(w).menu0; else if (!d[0]) L=[0x0201,0x0202,0x0203]; else L = f.dash_en? [0x0400,0x0302,0x0303,0x0304,0x0301,0x0500,0x0501] : [0x0400,0x0302,0x0303,0x0304,0x0500,0x0501];
        if (!ver5 && d[0]) L=L.filter(o=>o<0x0500);
        return send([0,d[0],d[1],L.length,...L.flatMap(o=>[o>>8,o&0xFF])], `GET_MENU_OIDS resp: ${d[0]? (f.dash_en?'Menu1OID':'Menu3OID (no Save)') : (d[1]?'Menu2OID':'Menu0OID')} [${L.map(oidTxt).join(' ')}]`); }
      case 0x47: { const o=(d[0]<<8)|d[1]; if (!OID[o] || (!ver5 && o>=0x0500)) return send([0x11,d[0],d[1]], `GET_DESCRIPTOR ${oidTxt(o)}: CANRESP_PARAM_NOTFOUND`);
        const len=OID[o].dlen; const data=[0,d[0],d[1],len-4]; while (data.length<len) data.push(0);
        let desc = `GET_DESCRIPTOR resp ${oidTxt(o)} “${OID[o].name}”`; const cache=[];
        if (o===0x0500||o===0x0501){ desc += ` — calibState ${f.calState} → ${f.calState?'WIDGET_SLIDER_HORIZONTAL':'WIDGET_HIDDEN'}`; cache.push(['desc50', f.calState?'slider':'hidden']); }
        return send(data, desc, cache); }
      case 0x49: { const o=(d[0]<<8)|d[1]; if (!OID[o] || (!ver5 && o>=0x0500)) return send([0x11,d[0],d[1]], `GET_PARAM ${oidTxt(o)}: CANRESP_PARAM_NOTFOUND`);
        const v=getValue(f,w,o); const data = typeof v==='string'? [0,d[0],d[1],v.length+1,...str(v),0] : [0,d[0],d[1],2, ...(o>=0x0500? calBytes(v) : [0,v&0xFF])];
        return send(data, `GET_PARAM resp ${oidTxt(o)} ${OID[o].name} = ${typeof v==='string'? '“'+v+'”' : valTxt(o,v)}`, [[o,v]]); }
      case 0x4A: { const o=(d[0]<<8)|d[1]; const hi=d[4]||0, lo=d[5]||0; let echo=[hi,lo], extra='';
        if (o===0x0400){ f.notify=lo; extra='smpte_alarm_enabled = '+lo; }
        else if (o===0x0301){ f.save = ((~lo)&0xFF)? 1:0; extra='save_settings = INVERT_DATA(' + lo + ') = 0x'+hx((~lo)&0xFF); }
        else if (o===0x0303){ f.sdti=lo; extra='silence_detection_time_interval = '+lo+' (no range check)'; }
        else if (o===0x0304){ f.sdth=lo; extra='silence_detection_threshold = '+lo+' (no range check)'; }
        else if ((o===0x0500||o===0x0501) && ver5){ const k=o&1; f.cal[k]=calFromBytes(hi,lo); extra=`calibration_${k?'right':'left'}_upper/lower = 0x${hx(hi)} 0x${hx(lo)} (${f.cal[k]})`; }
        else if (o===0x0302){ if (f.dash_en){ f.mode=lo; f.pmode=lo; extra='dashboard_enabled: mode = pmode = '+lo; } else { echo=[0,f.mode]; extra='SW4 ON → dashboard_enabled = NO: reply echoes the old mode, nothing changes'; } }
        else return send([0x11,d[0],d[1]], `SET_PARAM ${oidTxt(o)}: CANRESP_PARAM_NOTFOUND`);
        const v = o>=0x0500? calFromBytes(echo[0],echo[1]) : echo[1];
        rq.trace && rq.trace.push('DASHBOARD_RESPONSE_SETUP, case CANMSG_SET_PARAM: '+extra);
        return send([0,d[0],d[1],2,echo[0],echo[1]], `SET_PARAM resp ${oidTxt(o)} = ${valTxt(o,v)} — ${extra}`, [[o,v]]); }
      case 0x44: { const s=String.fromCharCode(...d.filter(x=>x)); if (ver5 && (s==='cal'||s==='fin')){ f.cmdRx=1; f.calState = s==='cal'? 1:0; return send([0], `COMMAND “${s}” → CANRESP_OK; commandReceived = 1, calibState = ${f.calState}`); }
        return send([1], `COMMAND “${s}” → CANRESP_UNSUPPORTED`); }
      case 0x43: f.reboot=1; return send([0], 'REBOOT resp OK → reboot_device = YES');
      case 0x40: f.reboot=1; f.upgrade=1; return send([0x14,0x03,0xE8], 'START_UPGRADE resp: CAN_UPGRADE_WAIT 1000 ms → reboot into the bootloader');
      case 0x56: if (!snmp) return send([1],'GET_SNMP_BASE: CANRESP_UNSUPPORTED'); return send([0,12,...str('25030.1.1.4'),0], 'GET_SNMP_BASE resp “25030.1.1.4”');
      case 0x57: { const o=(d[0]<<8)|d[1]; if (!snmp || !SNMP_OID[o]) return send([snmp?0x11:1, d[0], d[1]], `GET_SNMP_OID ${oidTxt(o)}: ${snmp?'not found':'unsupported'}`); return send([0,d[0],d[1],SNMP_OID[o].length+1,...str(SNMP_OID[o]),0], `GET_SNMP_OID ${oidTxt(o)} → “${SNMP_OID[o]}”`); }
      case 0x58: { const o=(d[0]<<8)|d[1]; if (!snmp || !SNMP_TRAP[o]) return send([snmp?0x11:1, d[0], d[1]], `GET_SNMP_TRAP ${oidTxt(o)}: ${snmp?'OGP_PARAM_NOTFOUND':'unsupported'}`); return send([0,d[0],d[1],SNMP_TRAP[o].length+1,...str(SNMP_TRAP[o]),0], `GET_SNMP_TRAP ${oidTxt(o)} → “${SNMP_TRAP[o]}”`); }
      default: return send([1], msgName(ty)+': CANRESP_UNSUPPORTED');
    }
  };
  const mfcPump = t=>{
    if (f.mfcWait && t>=f.mfcTimeout){ f.mfcWait=false; f.mfcNext=t; note(t,'frame controller: no answer from slot '+w.slot+' (timeout '+(C.MFC_TIMEOUT*1000)+' ms, inferred)'); }
    if (f.mfcWait || !f.mfcQ.length || t<f.mfcNext || !w.mfc) return;
    const rq=f.mfcQ.shift(); const dst=0x10+w.slot;
    const fr={dir:'rx', src:0x01, dst, type:rq.type, flags:3, data:(rq.d||[]).slice(0,8), len:Math.min(8,(rq.d||[]).length||0), desc:rq.desc||msgName(rq.type)};
    const te = sendFrame(t, fr); f.mfcWait=true; f.mfcTimeout = te + C.MFC_TIMEOUT;
    if (f.phase==='app' && f.canOn && w.card && dst===f.mod) handleReq(te, rq);
  };
  const advancePhase = t=>{
    if (f.phase==='boot'){ const B=bootSegs(f.slot); f.bootIx++; if (f.bootIx>=B.length){ enterApp(t); return; } f.phaseEnd=t+B[f.bootIx][0]; openSeg(t,'boot',B[f.bootIx][1]); }
    else if (f.phase==='wdt'){ if (f.upgrade){ f.phase='loader'; f.phaseEnd=t+60; openSeg(t,'loader','Ross bootloader (BOOTRST) waiting for UPGRADE_PAGE …'); note(t,'watchdog reset → bootloader at 0x1E000 (BOOTRST fuse)'); }
      else enterBoot(t, 'watchdog reset → main() restarts'); }
  };
  const applyEvent = (e, t)=>{
    if (e.kind==='world'){ envUpdate(t); const before=deep(w); e.fn(w, f, t); R.worlds.push({t, w:deep(w)});
      if (before.card && !w.card){ f.phase='off'; f.timers=false; f.canOn=false; f.leds=0; f.sw=deep(SW_MUTE); f.txQ=[]; openSeg(t,'off','card out of the frame'); note(t,'card pulled: power lost'); }
      if (!before.card && w.card){ enterBoot(t, 'card inserted: power-up, main() starts'); } }
    else if (e.kind==='mfc'){ e.reqs.forEach(r=>f.mfcQ.push(r)); }
    else if (e.kind==='boot'){ enterBoot(t, e.label||'power cycle'); }
  };

  /* ---- time loop ---- */
  let t = 0, nextSnap = 0;
  const snap = ts=>{ envUpdate(ts); R.snaps.push({t:ts, ph:f.phase, bi:f.bootIx, ad:f.adFlag, inp:f.input, c:[countOf(w,0,f.env[0],ts), countOf(w,1,f.env[1],ts)], a:f.audio.slice(), k:f.cnt.slice(), o:f.t0occ.slice(),
    leds:f.leds, sw:Object.assign({},f.sw), mode:f.mode, pr:f.pr, thr:f.thr, ctr:f.adCtr, dash:f.dash_init, txc:f.txCtr, stall:ts<f.stallUntil, ps:f.passes}); };
  while (t < 1){
    while (ei<evs.length && evs[ei].t<=t) applyEvent(evs[ei++], t);
    if (f.phase!=='app' && f.phase!=='off' && t>=f.phaseEnd) advancePhase(f.phaseEnd);
    if (f.timers){ while (f.nextT0<=t){ timer0(f.nextT0); f.nextT0+=C.T0; } while (f.nextT1<=t){ timer1(f.nextT1); f.nextT1+=C.T1_TICK; } }
    mfcPump(t);
    const running = f.phase==='app' && t>=f.stallUntil;
    if (f.phase==='app' && segStart!==null && segKind==='ee' && t>=f.stallUntil) closeSeg(f.stallUntil);
    if (running) pass(t);
    while (nextSnap<=t){ snap(nextSnap); nextSnap+=C.SNAP; }
    t += running? w.passT : 0.00025;
  }
  closeSeg(1);
  // carry state into the next second
  const F = deep(f); ['phaseEnd','nextT0','nextT1','convEnd','stallUntil','mfcNext','mfcTimeout','envT'].forEach(k=>{ if (isFinite(F[k])) F[k]-=1; });
  F.txQ = []; F.passes = 0;
  R.end = {w:deep(w), f:F};
  return R;
}
function sim(){ if (D.Rver!==D.ver || !D.R){ D.R = simulate(); D.Rver=D.ver; } return D.R; }
function snapAt(t){ const s=sim().snaps; let lo=0, hi=s.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if (s[m].t<=t) lo=m; else hi=m-1; } return s[lo]; }
function worldAt(t){ const ws=sim().worlds; let r=ws[0]; for (const x of ws){ if (x.t<=t) r=x; else break; } return r.w; }
function cacheAt(t){ const R=sim(); const c=Object.assign({}, R.cache0); for (const e of R.cacheEv){ if (e.t>t) break; c[e.o]=e.v; } return c; }
function segAt(t){ for (const g of sim().segs) if (g.t0<=t && t<g.t1) return g; return null; }

/* ---------------- events and actions ---------------- */
function addEvent(e){ let t=SIM.t; if (t>0.97){ rollSecond(); t=0.01; } e.t=Math.max(0.0005,t); D.ev.push(e); D.ver++; return e.t; }
function rollSecond(){ const R=sim(); D.s0={w:deep(R.end.w), f:deep(R.end.f), cache:cacheAt(1)}; D.ev=[]; D.second++; D.ver++; SIM.seek(0); }
function skip(n){ for (let i=0;i<n;i++){ rollSecond(); sim(); } act(`Skipped ${n} s`, tr=>tr(`Ran ${n} whole seconds with no changes (now second ${D.second}). Silence counters, heartbeats and DashBoard reports carried on.`)); }
function act(name, fn){
  const trace=[]; const tr=s=>trace.push(s);
  fn(tr);
  D.log.unshift({t:SIM.t, sec:D.second, name, trace}); if (D.log.length>60) D.log.length=60;
  if (!SIM.playing && D.ui.autoFollow){ const last=D.ev.length? D.ev[D.ev.length-1].t : SIM.t; SIM.seek(Math.min(0.999, Math.max(SIM.t, last)+0.003)); } else SIM.refresh();
}
const worldEv = (fn)=>addEvent({kind:'world', fn});
const mfcEv = reqs=>addEvent({kind:'mfc', reqs});
const fwNow = ()=>snapAt(SIM.t);
const REQ = {
  get:o=>({type:0x49, d:[o>>8,o&0xFF], desc:`GET_PARAM ${oidTxt(o)}`}),
  desc:o=>({type:0x47, d:[o>>8,o&0xFF], desc:`GET_DESCRIPTOR ${oidTxt(o)}`}),
};
function openReqs(w){
  const L=[{type:0x45,desc:'GET_NUMPARAMS'},{type:0x46,d:[0,0],desc:'GET_PARAM_OIDS'},{type:0x50,d:[0],desc:'GET_MENUSET_NAME 0'},{type:0x50,d:[1],desc:'GET_MENUSET_NAME 1'},{type:0x51,d:[0],desc:'GET_MENU_COUNT 0'},{type:0x51,d:[1],desc:'GET_MENU_COUNT 1'},
    {type:0x52,d:[0,0]},{type:0x52,d:[0,1]},{type:0x52,d:[1,0]},{type:0x53,d:[0,0]},{type:0x53,d:[0,1]},{type:0x53,d:[1,0]}];
  PARAM_OIDS.forEach(o=>{ L.push(REQ.desc(o)); L.push(REQ.get(o)); });
  if (v5(w)){ L.push({type:0x56, desc:'GET_SNMP_BASE'}); Object.keys(SNMP_OID).forEach(o=>L.push({type:0x57,d:[o>>8,o&0xFF],desc:'GET_SNMP_OID '+oidTxt(+o)})); Object.keys(SNMP_TRAP).forEach(o=>L.push({type:0x58,d:[o>>8,o&0xFF],desc:'GET_SNMP_TRAP '+oidTxt(+o)})); }
  return L;
}
const A = {
  dashSet(o, v){ act(`DashBoard: set ${OID[o].name} = ${valTxt(o,v)}`, tr=>{
    const w=worldAt(SIM.t), sn=fwNow();
    if (!w.mfc){ tr('No frame controller — DashBoard cannot reach the card.'); return; }
    const by = o>=0x0500? calBytes(v) : [0, v&0xFF];
    tr(`DashBoard → frame controller → CAN SET_PARAM (0x4A) to 0x${hx(0x10+w.slot)}: [00 ${hx(o>>8)} ${hx(o&0xFF)} 02 ${hx(by[0])} ${hx(by[1])}]`);
    tr('can_rx_isr → CANRX(MOb) → can_data_rx++ → DASHBOARD_RESPONSE_SETUP(MOB_index), case CANMSG_SET_PARAM');
    if (sn.ph!=='app') tr(`The card is in “${sn.ph}”: the transceiver is in loop-back (CAN_RX) or the card is off — no answer.`);
    else if (o===0x0302 && !(sim().end.f.dash_en)) tr('SW4 is ON (dashboard_enabled = NO): the reply echoes the current mode and nothing changes.');
    else if (o===0x0301) tr('save_settings = INVERT_DATA(0) = 0xFF → next main-loop pass: SAVE_INFORMATION_EEPROM(); SAVE_CALIBRATION_EEPROM(); (bytes 10–18)');
    else if (o===0x0302) tr(`mode = pmode = ${v} (so PARAMETER_UPDATE will not report it). Next pass PROCESS_MODES drives U1_A/B/C (PE5/PE4/PE3) and U5_A/C (PE7/PE6): ${JSON.stringify(SW_OF(v)).replace(/"/g,'')}`);
    else if (o===0x0303) tr(`silence_detection_time_interval = ${v}: silence is declared after ${v}×10×500 = ${v*5000} timer0 ticks (${v*5} s) below the threshold${v===0?' — with Off the first low reading clears audio1/audio2 at once, but Card Status never alarms':''}`);
    else if (o===0x0304) tr(`silence_detection_threshold = ${v} → PROCESS_MODES: silence_threshold = CONSTANT_${20+5*v}dBu = ${THR_CONST[v]} counts`);
    else if (o===0x0400) tr(`smpte_alarm_enabled = ${v}: Card Status may now report silence (needs interval ≠ Off).`);
    else tr(`calibration_${o&1?'right':'left'}_upper = 0x${hx(by[0])}, _lower = 0x${hx(by[1])}; AD_CONVERTER_AA6201A_SETUP applies it via CALIBRATION_TABLE on the next evaluation.`);
    tr('The reply 0xCA (CANMSG_RESPONSE | SET_PARAM) is sent from inside the ISR: CANTX(MOB_buffer_free).');
    mfcEv([{type:0x4A, d:[o>>8,o&0xFF,0,2,by[0],by[1]], desc:`SET_PARAM ${oidTxt(o)} = ${valTxt(o,v)}`}]);
  }); },
  dashOpen(){ act('DashBoard: open the card (read its object tree)', tr=>{
    const w=worldAt(SIM.t); tr('The frame controller asks the card for its whole tree: GET_NUMPARAMS (15), GET_PARAM_OIDS, menu sets “Status”/“Control”, menu names and OID lists, then a GET_DESCRIPTOR and GET_PARAM for every OID'+(v5(w)?', then the SNMP base, OID and trap strings (order '+inf+')':'')+'.');
    tr('Each long answer goes out one 8-byte frame per timer1 tick (MultiFrameMessageTransmission, frame_count).');
    tr('Descriptors of 5.0/5.1 (Calibration Left/Right) are built by MESSAGE_CREATOR_PARAMETER_50: WIDGET_SLIDER_HORIZONTAL if calibState, otherwise WIDGET_HIDDEN.');
    mfcEv(openReqs(w)); }); },
  dashRefresh(){ act('DashBoard: refresh values', tr=>{ tr('GET_PARAM for each of the 15 OIDs (descriptors are not re-read, so hidden/visible sliders do not change).'); mfcEv(PARAM_OIDS.map(REQ.get)); }); },
  dashReboot(){ act('DashBoard: reboot the card', tr=>{ tr('CANMSG_REBOOT 0x43 → reply OK, reboot_device = YES → CAN_FUNCTIONS: while(1) CLI(); → the watchdog resets the AVR (≈16 ms '+inf+') → full boot ≈1.4 s.'); mfcEv([{type:0x43, desc:'REBOOT'}]); }); },
  cmd(s){ act(`DashBoard debug console: “${s}”`, tr=>{ const w=worldAt(SIM.t);
    tr(`CANMSG_COMMAND 0x44 with ASCII “${s}\\0” → DASHBOARD_RESPONSE_SETUP case CANMSG_COMMAND (v5.01 “Ali-Add”).`);
    if (!v5(w)) tr('This firmware ('+w.ver+') has no command handler: default → CANRESP_UNSUPPORTED.');
    else if (s==='cal'||s==='fin') tr(`commandReceived = 1, calibState = ${s==='cal'?1:0}. The next two heartbeats send TRAP [02 05 00 02] and [02 05 01 02] instead of a REPORT_PARAM. Re-open the card in DashBoard so it re-reads the 5.0/5.1 descriptors (${s==='cal'?'sliders appear':'sliders hidden'}).`);
    else tr('Not “cal” or “fin” → CANRESP_UNSUPPORTED.');
    D.ui.consoleOut.unshift('> '+s); mfcEv([{type:0x44, d:[...Array.from(s).map(c=>c.charCodeAt(0)),0], desc:`COMMAND “${s}”`}]); }); },
  dip(i){ act(`DIP SW${i+1} → ${worldAt(SIM.t).dip[i]?'OFF':'ON'}`, tr=>{ const f=sim().end.f;
    worldEv(w=>{ w.dip[i]=!w.dip[i]; });
    tr(`SW${i+1} is on PB${3+i} (net SW${i+1} → U9-${13+i}), pulled up: ON reads 0. READ_DIP_SWITCHES: dip_switches = (PINB & 0x78) << 1 every pass.`);
    if (i<2) tr(f.dip_en && !f.dash_en? 'dip_switch_enabled = YES and dashboard_enabled = NO: PROCESS_MODES re-reads the mode from SW1/SW2 on the next pass.' : `PROCESS_MODES only follows SW1/SW2 live when SW3 is OFF and SW4 is ON. Now: dip_switch_enabled = ${f.dip_en?'YES':'NO'}, dashboard_enabled = ${f.dash_en?'YES':'NO'} → the new mode is used at the next power-up only.`);
    else tr(`SW${i+1} (${i===2?'Default: dip switch / memory':'Dashboard enable'}) is only read once in main(), after the boot waits. Pull and re-insert the card (or Reboot) to apply it.`); }); },
  trim(k, d){ act(`LEVEL CH${k?'B':'A'} trimmer ${d>0?'+':'−'}`, tr=>{ worldEv(w=>{ w.lvl[k]=clamp(w.lvl[k]+d,0,1); }); const a=clamp(worldAt(SIM.t).lvl[k]+d,0,1);
    tr(`LVL${k?'B':'A'} (5K multi-turn) in U3${k?'B':'A'}’s feedback: gain ${db(trimGain(a)).toFixed(2)} dB (range +17.9 … −15.0 dB). The firmware never sees this — but the silence detector does, because U${k?8:6} rectifies U3’s output.`); }); },
  cable(k){ act(`IN${k+1} cable ${worldAt(SIM.t)[k?'B':'A'].src==='off'?'plugged in':'unplugged'}`, tr=>{ worldEv(w=>{ const s=k?w.B:w.A; if (s.src==='off') s.src = (k?w.lastB:w.lastA)||'tone'; else { if (k) w.lastB=s.src; else w.lastA=s.src; s.src='off'; } });
    tr(`The SSM2143 (U${k?12:11}) input floats; the detector (U${k?8:6}, τ = 10 ms) decays. The next CH${k?'B':'A'} evaluation compares the count with silence_threshold and starts counting timer0 ticks.`); }); },
  source(k, src){ act(`IN${k+1} source → ${src}`, tr=>{ worldEv(w=>{ (k?w.B:w.A).src=src; if (src!=='off'){ if (k) w.lastB=src; else w.lastA=src; } }); tr('Signal generator change at the rear-module terminal block.'); }); },
  level(k, v){ act(`IN${k+1} level → ${v} dBu`, tr=>{ worldEv(w=>{ (k?w.B:w.A).dBu=v; }); tr(`Detector at unity gain: ≈${Math.round(C.FIT_A*Math.pow(10,(v+20)/20)-C.FIT_B)} counts (fit to the CONSTANT_xxdBu table ${inf}).`); }); },
  setRear(r){ act(`Rear module → ${r}`, tr=>{ worldEv(w=>{ w.rear=r; if (!REARS[r].dual) w.pos=1; }); const RM=REARS[r]; tr(RM.name+'. '+(r==='T6403'? 'Only IN1 and four outputs reach each card: CHB is open, so use Mono DA (ChA - 1x8) or CHB will report silence.' : r==='T6406'? 'Each card gets IN1 + three outputs and IN2 + three outputs; AES4/AES8 (OUT1-4/OUT2-4) are not wired.' : 'Two inputs, eight outputs.')); }); },
  pos(p){ act(`This card is #${p} of the dual module`, tr=>{ worldEv(w=>{ w.pos=p; }); }); },
  insert(){ act('Insert the card', tr=>{ worldEv(w=>{ w.card=true; }); tr('Power-up: main() runs initialization(), waits, measures the slot ID twice (≈1.2 s), waits init_delay (slot-dependent), restores settings, starts CAN. Outputs stay muted until the first PROCESS_MODES ≈1.4 s later.'); }); },
  remove(){ act('Pull the card', tr=>{ worldEv(w=>{ w.card=false; }); tr('All outputs and LEDs go dead; the frame controller stops getting answers.'); }); },
  setSlot(s){ act(`Move the card to slot ${s}`, tr=>{ worldEv(w=>{ w.slot=s; w.card=true; }); addEvent({kind:'boot', label:`card re-seated in slot ${s}: power-up`});
    const a=slotAdc(s), r=ADDRESS_TABLE(a); tr(`Slot ID resistor ${SLOT_R[s-1]} Ω with R96 1K to 3.3 V → ADC ${a} → ADDRESS_TABLE = ${r}${r!==s?' (WRONG SLOT!)':''}; mod_address = 0x${hx(0x10+r)}. Margin to the nearest threshold: ${slotMargin(s)} counts.`); }); },
  upload(file){ const F=FILES[file]; act(`DashBoard: upload ${F.name}`, tr=>{ const w=worldAt(SIM.t);
    tr('START_UPGRADE (0x40) → application replies CAN_UPGRADE_WAIT [14 03 E8] (1000 ms), reboot_device = upgrade_device = YES.');
    tr('CAN_FUNCTIONS: CLI(); eepromWriteByte(BOOT_CONTROL, BOOTC_RUNLDR); while(1) → watchdog → Ross bootloader (BOOTRST) → pages → VERIFY → REBOOT.');
    tr(`zeuspack /p AA6201A /P ADA-8404-C /P 9241: every brand’s .bin lists all three products, so the loader accepts it on any brand of card ${inf}.`);
    mfcEv([{type:0x40, desc:'START_UPGRADE '+F.name}]); D.ui.upl={file, wall:performance.now(), applied:false}; }); },
};
function slotMargin(s){ const a=slotAdc(s), [lo,hi]=ADDR_TH[s-1]; return Math.min(a-lo, hi-a); }
const FILES = {
  wbsnmp:{name:'bin/snmp/wbs/AA6201a_v5_01.bin', ver:'5.01', brand:'WARD_BECK', snmp:true},
  wb:{name:'bin/wbs/AA6201a_v5_01.bin', ver:'5.01', brand:'WARD_BECK', snmp:false},
  ross:{name:'bin/ross/ada-8404-c_v5_01.bin', ver:'5.01', brand:'ROSS_VIDEO', snmp:false},
  cob:{name:'bin/cobalt/9241_v5_01.bin', ver:'5.01', brand:'COBALT', snmp:false},
  v204:{name:'AA6201a_v2_04.bin', ver:'2.04', brand:'WARD_BECK', snmp:false},
};
function uploadState(){ const u=D.ui.upl; if (!u) return null; const el=(performance.now()-u.wall)/1000;
  const steps=[[0.5,'START_UPGRADE → “wait 1000 ms”, watchdog reset into the bootloader'],[1.0,'frame controller repeats START_UPGRADE; loader checks the product list'],[5.5,'UPGRADE_PAGE × ≈ 110 (256-byte pages) '+'(page count inferred from V100W.mp code size)'],[0.5,'VERIFY_UPGRADE (CRC16)'],[0.5,'REBOOT → application main()']];
  let a=0; const tot=steps.reduce((x,s)=>x+s[0],0);
  for (const st of steps){ if (el<a+st[0]) return {p:el/tot, txt:st[1]+' — progress compressed, real duration not in the archive '}; a+=st[0]; }
  return {p:1, txt:'Done: '+FILES[u.file].name+' installed; the card is booting.', done:true}; }
function finishUploadIfDone(){ const u=D.ui.upl; if (!u || u.applied) return; const st=uploadState(); if (!st || !st.done) return; u.applied=true; const F=FILES[u.file];
  rollSecond(); D.s0.w.ver=F.ver; D.s0.w.brand=F.brand; D.s0.w.snmp=F.snmp; const f=D.s0.f; ramInit(f); f.phase='boot'; f.bootIx=0; f.slot=ADDRESS_TABLE(slotAdc(D.s0.w.slot)); f.phaseEnd=bootSegs(f.slot)[0][0]; f.leds=6;
  D.log.unshift({t:0, sec:D.second, name:'Upload complete', trace:['VERIFY_UPGRADE matched; REBOOT → application main() boots (≈1.4 s).', `Software Rev now ${F.ver}, brand strings ${BRANDS[F.brand].product} / ${BRANDS[F.brand].supplier}${F.snmp?', SNMP_ENABLED':''}. Re-open the card in DashBoard.`]}); D.ver++; SIM.refresh(); }

/* =====================================================================
   DRAWING: card (real ISS5 gerber artwork), card edge, rear module, frame, DashBoard window
   ===================================================================== */
/* Card artwork: GERBERS/AA6201AISS5.TOP + TSM (copper, pads) and TSS (silk), 120 dpi over x 2.45…15.35 in, y 5.50…8.65 in.
   Parts from AA6201Aiss5.pnp (report origin 3060, 6135 mil). Solder mask colour: "BLACK SEMI GLOSS" (AA6201A-TOP-ASSY.pdf note 1). */
const PNP = (x,y)=>[(x/1000+3.060-2.45)*120, (8.65-(y/1000+6.135))*120];
const LEDS = [{ref:'L1', x:104.7, y:1700, name:'AUDIO A (CHA LED)', bit:4},{ref:'L2', x:99.7, y:745, name:'AUDIO B (CHB LED)', bit:2},{ref:'L3', x:664.7, y:515, name:'COM ACTIVITY', bit:1}];
function cardSVG(t, opts){
  opts=opts||{}; const sn=snapAt(t), w=worldAt(t), L=sn.leds;
  let s=`<svg viewBox="0 0 1547 378" role="img" aria-label="AA6201A ISS5 card, top side (gerber artwork)" style="width:100%;display:block;border-radius:6px">
   <defs><filter id="aaGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect width="1547" height="378" fill="var(--panel2)"/>
   <path d="M4 4 H1478 L1490 16 V40 H1543 V292 H1490 V300 H1543 V374 H52 L4 326 Z" fill="#141716" stroke="#2a2f2c"/>
   <image href="${ASSET}aa6201a-card-copper.png" width="1547" height="378"/>
   <image href="${ASSET}aa6201a-card-silk.png" width="1547" height="378" opacity=".95"/>`;
  // extension rods from the card edge to the trimmers (MF6220-1M28/1M29/1M33 shafts, quote "with Brkts&Rods")
  [[55,0],[170,1]].forEach(([y,k])=>{ s+=`<line x1="6" y1="${y}" x2="800" y2="${y}" stroke="#d9d2c0" stroke-width="5" stroke-opacity=".35" stroke-dasharray="14 6"/>`; });
  LEDS.forEach(l=>{ const [px,py]=PNP(l.x,l.y); const on=L & l.bit; s+=`<rect x="${px-10}" y="${py-6}" width="20" height="12" rx="2" fill="${on?'var(--led-g)':'#2b2f2c'}" ${on?'filter="url(#aaGlow)"':''}><title>${l.ref} ${l.name}${l.bit===1?' — never switched on by any archived firmware':''}</title></rect>`; });
  // trimmers LVLA / LVLB (clickable: left half −, right half +)
  [[812,55,0],[812,170,1]].forEach(([x,y,k])=>{ const a=w.lvl[k], ang=a*TURNS*360; s+=`<g class="aa-trim" data-k="${k}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="14" fill="#c9b27a" stroke="#5a4a20"/><line x1="${x-11*Math.cos(ang*Math.PI/180)}" y1="${y-11*Math.sin(ang*Math.PI/180)}" x2="${x+11*Math.cos(ang*Math.PI/180)}" y2="${y+11*Math.sin(ang*Math.PI/180)}" stroke="#222" stroke-width="3"/><circle cx="${x}" cy="${y}" r="22" fill="transparent"><title>LVL${k?'B':'A'} level trim: ${db(trimGain(a)).toFixed(2)} dB (${(a*TURNS).toFixed(1)} of ${TURNS} turns ${'— turn count inferred'}). Click left half −, right half +; shift = fine.</title></circle></g>`; });
  // DIP SW1 (pnp 4095, 365, rot 90): four slides
  const [dx,dy]=PNP(4095,365);
  for (let i=0;i<4;i++){ const x=dx-18+i*12, on=w.dip[i];
    s+=`<g class="aa-dip" data-i="${i}" style="cursor:pointer"><rect x="${x-5}" y="${dy-17}" width="10" height="34" rx="1.5" fill="#2d63b8" stroke="#183a72"/><rect x="${x-3.5}" y="${on?dy-15:dy+1}" width="7" height="14" fill="#f2f2f2"/><rect x="${x-7}" y="${dy-24}" width="14" height="48" fill="transparent"><title>SW${i+1} ${['Mode Sel (MSB)','Mode Sel (LSB)','Default (dip switch / memory)','Dashboard enable'][i]} — ${on?'ON':'OFF'} (click)</title></rect></g>`; }
  s+=`<text x="${dx-26}" y="${dy+34}" font-size="11" fill="#9fd3ff">1 2 3 4 · ON ↑ ${'(orientation inferred)'}</text>`;
  if (opts.labels!==false){
    const lab=(x,y,txt)=>`<text x="${x}" y="${y}" font-size="14" font-weight="700" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke">${txt}</text>`;
    [['U9 AT90CAN128',5076,459,-40,-30],['U11 SSM2143',7350,2030,-40,-18],['U12 SSM2143',7350,1070,-40,26],['U3 NE5532',6320,1575,-36,30],['U6/U8 OP275 detectors',7095,1060,-60,4],['U1 4053',7950,1720,-20,-20],['U5 4053',7950,490,-20,32],['U2 OP275 OUT A',8625,1775,-30,46],['U7 OP275 OUT B',8625,425,-30,-24],['TIP29/TIP30 boosters',9600,1150,-40,6],['30R1 build-outs',10400,700,-20,90],['U10 CAN',11470,-195,-40,-12],['CC6-1212DF ±12 V',1700,300,-60,-56]].forEach(([n,x,y,ox,oy])=>{ const [px,py]=PNP(x,y); s+=lab(px+ox,py+oy,n); });
    s+=lab(1490,170,'P1')+lab(1484,340,'P2')+lab(830,92,'LVLA')+lab(830,207,'LVLB');
  }
  if (!w.card) s+=`<rect width="1547" height="378" fill="var(--panel2)" opacity=".75"/><text x="773" y="200" text-anchor="middle" font-size="40" fill="var(--ink)">card removed from the frame</text>`;
  else if (sn.ph==='boot') s+=`<text x="230" y="140" font-size="22" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke">booting — outputs muted (PORTE = 0xFF)</text>`;
  else if (sn.ph==='loader') s+=`<text x="230" y="140" font-size="22" fill="#ffd36a">bootloader running</text>`;
  return s+'</svg>';
}
/* Card edge: AA6201A-card-edge.cdr (LEVEL CHA, CHA LED, LEVEL CHB, CHB LED, COM Activity LED) */
/* Card edge: CorelDRAW art AA6201A - #FUNCTIONAL/AA6201A-card-edge.cdr (2007-12-19) → assets/aa6201a-edge.svg.
   Trimmer and LED positions measured on the converted art (LVLA/LVLB screws, CHA / CHB / COM Activity windows). */
const EDGE = {pot:[[139.1,28.8],[139.1,100.6]], led:{CHA:[130.4,60.8], CHB:[130.3,170.5], COM:[130.9,132.6]}};
const ART_SRC = '#OPENGEAR #SERIES/AA6201A - #Master #OPENGEAR/AA6201A - #Engineering/AA6201A - #FUNCTIONAL/';
function edgeSVG(t){
  const sn=snapAt(t), w=worldAt(t), L=sn.leds;
  const led=(k,on,lab)=>{ const [x,y]=EDGE.led[k]; return `<rect x="${x-2.9}" y="${y-6.3}" width="5.8" height="12.6" rx="1" fill="${on?'var(--led-g)':'#2b2f2c'}" stroke="#555" stroke-width=".3" ${on?'filter="url(#aaGlow2)"':''}><title>${lab} ${on?'on':'off'}</title></rect>`; };
  const pot=(k,lab)=>{ const [x,y]=EDGE.pot[k], ang=w.lvl[k]*TURNS*360*Math.PI/180; return `<g class="aa-trim" data-k="${k}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="4.4" fill="#9a9a9a" stroke="#333" stroke-width=".4"/><line x1="${x-3.6*Math.cos(ang)}" y1="${y-3.6*Math.sin(ang)}" x2="${x+3.6*Math.cos(ang)}" y2="${y+3.6*Math.sin(ang)}" stroke="#111" stroke-width="1.4"/><rect x="${x-12}" y="${y-11}" width="24" height="22" fill="transparent"><title>${lab}: ${db(trimGain(w.lvl[k])).toFixed(2)} dB — click left half −, right half +</title></rect></g><text x="${x+12}" y="${y+14}" font-size="8" fill="#555">${db(trimGain(w.lvl[k])).toFixed(1)} dB</text>`; };
  return `<svg viewBox="10 4 240 190" role="img" aria-label="AA6201A card edge (CorelDRAW art)" style="width:100%;max-width:300px;display:block;border-radius:6px">
    <defs><filter id="aaGlow2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <image href="${ASSET}aa6201a-edge.svg" width="250" height="205"/>
    ${pot(0,'LEVEL CHA')}${pot(1,'LEVEL CHB')}${led('CHA',L&4,'CHA LED')}${led('CHB',L&2,'CHB LED')}${led('COM',L&1,'COM Activity LED')}</svg>`;
}
/* Rear modules: CorelDRAW art. T6303, T6403, T6406 from AA6201-REAR-MODULES.cdr (2008-08-07); T6203 from AA6201A-T6203.cdr
   (2008-09-24) → assets/aa6201a-rear-<T>.svg. Terminal-block bodies measured on the converted art; for T6406 the
   click targets are the art's own side labels (one 9-pin block carries an input and three outputs). */
const REAR_ART = {
  T6303:{w:217,h:318, file:'AA6201-REAR-MODULES.cdr', cx:[72.1,122.6], cy:[67.3,112.3,157.3,202.3,247.3], bw:20.5, bh:36, plate:[50,22,115,260]},
  T6403:{w:219,h:318, file:'AA6201-REAR-MODULES.cdr', cx:[71.3,118.9], cy:[67.3,112.3,157.3,202.3,247.3], bw:20.5, bh:36, plate:[48,22,115,260]},
  T6203:{w:204,h:295, file:'AA6201A-T6203.cdr', cx:[78.8,128.3], cy:[66.6,103.6,140.2,176.4,213.0], bw:20.6, bh:36, plate:[44,18,115,245]},
  T6406:{w:220,h:318, file:'AA6201-REAR-MODULES.cdr', cx:[74.1,121.4], cy:[100.6,207.3], bw:20.6, bh:100,
    lab:[[72,98,119.8,141],[178.4,204.5,226.6,247.4]], lx:[[5,50],[155,207]], plate:[50,22,115,260]},
};
function rearSVG(t, opts){
  opts=opts||{};
  const w=worldAt(t), RM=REARS[w.rear], ART=REAR_ART[w.rear];
  const sel=w.scopeOut;
  const vb = opts.compact? ART.plate.join(' ') : `0 0 ${ART.w} ${ART.h}`;
  let s=`<svg viewBox="${vb}" role="img" aria-label="${RM.name} (CorelDRAW art)" style="width:100%;display:block;border-radius:6px">
    <image href="${ASSET}aa6201a-rear-${w.rear}.svg" width="${ART.w}" height="${ART.h}"/>`;
  const sig = role=> role==='inA'? w.A.src!=='off' : role==='inB'? w.B.src!=='off' : false;
  const hit=(x,y,ww,hh,lab,role,mine)=>`<rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="transparent"><title>${lab}${mine? (role[0]==='i'? ' — click to '+(sig(role)?'unplug':'plug in') : ' — click to show on the scope') : ' (other card)'}</title></rect>`;
  if (RM.kind==='tb9'){
    RM.blocks.forEach(b=>{ const cx=ART.cx[b.col], cy=ART.cy[b.row], mine=b.card===w.pos;
      if (!mine) s+=`<rect x="${cx-ART.bw/2}" y="${cy-ART.bh/2}" width="${ART.bw}" height="${ART.bh}" fill="#000" opacity=".12"/>`;
      b.items.forEach((it,i)=>{ const yy=ART.lab[b.row][i], [x0,x1]=ART.lx[b.col], role=it[1], isIn=role[0]==='i';
        const conn=isIn&&mine&&sig(role), on=!isIn&&mine&&sel===role;
        s+=`<g class="aa-jack" data-r="${role}" data-mine="${mine?1:0}" style="cursor:${mine?'pointer':'default'}">`;
        if (conn) s+=`<circle cx="${b.col? x1-2 : x0+1}" cy="${yy-3}" r="2.6" fill="#2b5f9e"/>`;
        if (on) s+=`<rect x="${x0-1}" y="${yy-9}" width="${x1-x0+2}" height="12" rx="2" fill="none" stroke="#e3a35a" stroke-width="1.2"/>`;
        if (!isIn && mine){ const lvl=outLevelOf(t, role); s+=`<circle cx="${b.col? cx-ART.bw/2-3 : cx+ART.bw/2+3}" cy="${yy-3}" r="1.6" fill="${lvl>-60?'var(--accent)':'#888'}"/>`; }
        s+=hit(x0,yy-10,x1-x0,13,it[0],role,mine)+'</g>'; }); });
  } else RM.pos.forEach((p,i)=>{
    const col=i%2, row=Math.floor(i/2), cx=ART.cx[col], cy=ART.cy[row], [lab,role]=p;
    const mine=!RM.dual || p[3]===w.pos, isIn=role[0]==='i', conn=isIn&&mine&&sig(role);
    const x=cx-ART.bw/2, y=cy-ART.bh/2;
    s+=`<g class="aa-jack" data-r="${role}" data-mine="${mine?1:0}" style="cursor:${mine?'pointer':'default'}">`;
    if (conn) s+=`<rect x="${x}" y="${y}" width="${ART.bw}" height="${ART.bh}" fill="#2b5f9e" opacity=".35"/><path d="M${col?x+ART.bw:x} ${cy-8} h${col?8:-8} M${col?x+ART.bw:x} ${cy} h${col?8:-8} M${col?x+ART.bw:x} ${cy+8} h${col?8:-8}" stroke="#2b5f9e" stroke-width="2.4"/>`;
    if (!isIn && mine && sel===role) s+=`<rect x="${x-1.5}" y="${y-1.5}" width="${ART.bw+3}" height="${ART.bh+3}" fill="none" stroke="#e3a35a" stroke-width="2"/>`;
    if (!isIn && mine){ const lvl=outLevelOf(t, role); s+=`<circle cx="${col? x-3 : x+ART.bw+3}" cy="${y+3}" r="2" fill="${lvl>-60?'var(--accent)':'#888'}"/>`; }
    if (!mine) s+=`<rect x="${x}" y="${y}" width="${ART.bw}" height="${ART.bh}" fill="#000" opacity=".12"/>`;
    s+=hit(x-3,y-2,ART.bw+6,ART.bh+4,(i+1)+' '+lab,role,mine)+'</g>'; });
  s+=`</svg>`;
  return s;
}
function rearSrc(){ const w=worldAt(SIM.t), A=REAR_ART[w.rear]; return `Rear-module art: ${SIM.src(ART_SRC+A.file, A.file)} (CorelDRAW, 2008|41)`; }
function outLevelOf(t, role){ const w=worldAt(t), sn=snapAt(t); if (!w.card) return -120; const grp=role[1]==='B'?1:0; const sw = sn.ph==='app'? sn.sw : SW_MUTE; return rmsDbu(tt=>outSample(w,sw,grp,tt), (D.second-1)+t); }
function frameSVG(t){
  const w=worldAt(t), RM=REARS[w.rear], sn=snapAt(t);
  let s=`<svg viewBox="0 0 640 74" style="width:100%;display:block"><rect width="640" height="74" rx="6" fill="var(--dev)"/>`;
  for (let i=1;i<=20;i++){ const x=10+(i-1)*31; const card=(i===w.slot && w.card); const rearSpan = RM.dual? [w.slot, w.pos===1? w.slot+1 : w.slot-1] : [w.slot];
    const isRear = rearSpan.includes(i);
    s+=`<g class="aa-slot" data-s="${i}" style="cursor:pointer"><rect x="${x}" y="8" width="27" height="44" rx="2" fill="${card?'#3a4f40':'#202326'}" stroke="${isRear?'#e3a35a':'#3a3f44'}" stroke-width="${isRear?2:1}"/>
      ${card?`<rect x="${x+11}" y="12" width="5" height="36" fill="#141716"/>${[4,2,1].map((b,k)=>`<rect x="${x+8}" y="${16+k*9}" width="3" height="3" fill="${sn.leds&b?'#7dff6a':'#2c332c'}"/>`).join('')}`:''}
      <text x="${x+13.5}" y="64" font-size="9" text-anchor="middle" fill="${ADDRESS_TABLE(slotAdc(i))!==i?'#ff5a4a':slotMargin(i)<3?'#e3a35a':'#9aa0a5'}">${i}</text><title>Slot ${i}: ID ${SLOT_R[i-1]} Ω → ADC ${slotAdc(i)} → ${ADDRESS_TABLE(slotAdc(i))} (margin ${slotMargin(i)} counts)${card?' — AA6201A':''}${isRear?' — rear '+w.rear:''}</title></g>`; }
  return s+`<text x="630" y="72" font-size="8" text-anchor="end" fill="#9aa0a5">20-slot frame (front); red: slot ID decodes to another slot · orange: margin under 3 counts</text></svg>`;
}
/* DashBoard-style window — a generic parameter editor, not Ross's design */
function dashHTML(t){
  const w=worldAt(t), sn=snapAt(t), c=cacheAt(t), B=brandOf(w), R=sim();
  const seen = w.card && w.mfc && (D.s0.cache.seen || R.can.some(fr=>fr.dir==='tx' && fr.t<=t));
  const tab=D.ui.dashTab, de=R.end.f.dash_en, ver5=v5(w);
  const row=(lab,val)=>`<tr><td class="aa-dl">${lab}</td><td>${val}</td></tr>`;
  const alarm=(ok)=>`<span class="aa-alarm" style="background:${ok?'var(--accent)':'var(--bad)'}"></span>`;
  let body='';
  if (!w.mfc) body='<div class="aa-dmsg">No frame controller.</div>';
  else if (!seen) body=`<div class="aa-dmsg">Slot ${w.slot}: no card answering yet.</div>`;
  else if (tab==='info') body=`<table class="aa-dt">${B.menu0.map(o=>row(OID[o].name, `<input readonly value="${String(c[o]??'')}">`)).join('')}</table><div class="aa-dnote">Menu “Card Info” = Menu0OID_Message (${B.menu0.length} OIDs for this brand).</div>`;
  else if (tab==='status') body=`<table class="aa-dt">${row('Card Status', alarm(!c[0x0201])+' '+valTxt(0x0201,c[0x0201]))}${row('Input CHA', alarm(c[0x0202]!==1)+' '+valTxt(0x0202,c[0x0202]))}${row('Input CHB', alarm(c[0x0203]!==1)+' '+valTxt(0x0203,c[0x0203]))}</table>
      <div class="aa-dnote">These are the last values DashBoard received (replies and REPORT_PARAM heartbeats), not the card’s live state.</div>`;
  else if (tab==='control'){
    const opt=(o,list)=>`<select data-o="${o}">${list.map(([v,l])=>`<option value="${v}" ${c[o]===v?'selected':''}>${l}</option>`).join('')}${list.some(x=>x[0]===c[o])?'':`<option selected>${valTxt(o,c[o])}</option>`}</select>`;
    const slider=k=>{ const o=0x0500+k, v=c[o]??0; return `<input type="range" min="-100" max="100" step="1" value="${v}" data-cal="${k}" style="width:55%"> <b class="mono">${v}</b> <button data-cal1="${k}" data-d="-1">−1</button><button data-cal1="${k}" data-d="1">+1</button>`; };
    body=`<table class="aa-dt">
      ${row('Notify on Card Fault', [[1,'Enabled'],[0,'Disabled']].map(([v,l])=>`<label class="aa-r"><input type="radio" name="aant" data-o="1024" data-v="${v}" ${c[0x0400]===v?'checked':''}> ${l}</label>`).join(''))}
      ${row('Mode', opt(0x0302, MODES.map((m,i)=>[i,m])))}
      ${row('Silence Detection Time Interval', opt(0x0303, [...Array(10)].map((_,i)=>[i, i?i*5+' Secs':'Off'])))}
      ${row('Silence Detection Threshold (dBu)', opt(0x0304, THR_MENU))}
      ${de? row('Settings', '<button data-save="1">Save</button>') : ''}
      ${ver5 && c.desc50==='slider'? row('Calibration Left', slider(0))+row('Calibration Right', slider(1)) : ''}</table>
      ${de? '' : '<div class="aa-dnote" style="color:var(--warn)">SW4 ON at boot: Menu3OID (no Save) and Mode changes are refused — but threshold, interval, notify and calibration still change.</div>'}
      ${ver5 && c.desc50!=='slider'? '<div class="aa-dnote">Calibration Left/Right (OID 5.0/5.1) are in the menu but their descriptor says WIDGET_HIDDEN. Type “cal” in the debug console, then re-open the card.</div>':''}`;
  } else if (tab==='console'){
    body=`<div class="aa-dnote">Debug console: sends CANMSG_COMMAND (0x44) with the typed text. v5.01 understands “cal” and “fin”.</div>
      <div style="display:flex;gap:6px;margin:6px 0"><input id="aaCmd" placeholder="cal" style="flex:1;font:12px var(--mono);padding:3px 6px;border:1px solid var(--line);border-radius:5px;background:var(--panel);color:var(--ink)"><button id="aaCmdGo">Enter</button></div>
      <div class="log" style="max-height:120px">${(D.ui.consoleOut.length? D.ui.consoleOut : ['(no commands yet)']).map(x=>`<div>${x}</div>`).join('')}${R.can.filter(f=>f.t<=t && (f.type===0xC4 || (f.type===0x11 && f.data[0]===2))).slice(-6).reverse().map(f=>`<div class="muted">${SIM.fmtT(f.t)} ${f.desc}</div>`).join('')}</div>`;
  } else if (tab==='snmp'){
    const ok = ver5 && w.snmp && w.brand==='WARD_BECK';
    body = ok? `<table class="aa-dt">${Object.keys(SNMP_OID).map(o=>+o).map(o=>row(`<span class="mono small">…25030.1.1.4.${SNMP_OID[o]}.<i>f</i>.<i>s</i></span>`, `<span class="small">${SNMP_NAME[o]}</span> = <b class="small">${typeof c[o]==='string'? c[o] : valTxt(o,c[o])}</b>`)).join('')}</table>
      <div class="aa-dnote">enterprises.25030 (WARD-BECK.mib) → openGear(1).openGearObjects(1).AA6201CardMib(4). The card only answers GET_SNMP_BASE/OID/TRAP with these strings; the SNMP agent is the frame controller ${inf}. Index <i>f.s</i> = openGearFrameIndex, AA6201CardIndex (AA6201-CARD.mib).</div>
      <h4 style="margin:6px 0 2px">Notifications the frame controller would raise (from REPORT_PARAM of 2.1/2.2/2.3) ${inf}</h4>
      <div class="log" style="max-height:110px">${R.traps.filter(x=>x.t<=t && x.o<0x0500).slice(-8).reverse().map(x=>`<div>${SIM.fmtT(x.t)} trap ${SNMP_TRAP[x.o]} ${['AA6201CardStatusEvent','AA6201InputChAEvent','AA6201InputChBEvent'][x.o-0x0201]} (${valTxt(x.o,x.v)})</div>`).join('')||'<div class="muted">none this second</div>'}</div>`
      : `<div class="aa-dmsg">No SNMP: ${!ver5? 'firmware '+w.ver+' predates v5.00' : w.brand!=='WARD_BECK'? 'the MIB is only defined for the Ward-Beck build (“DON’T USE FOR ROSS OR COBALT”)' : 'this .bin was built without SNMP_ENABLED'}. GET_SNMP_* → CANRESP_UNSUPPORTED.</div>`;
  }
  const upl=uploadState();
  return `<div class="aa-dash"><div class="aa-dtitle"><span>Parameter editor — frame tree</span><span class="muted">generic DashBoard-style view</span></div>
   <div class="aa-dwrap"><div class="aa-tree"><div>▾ openGear frame</div><div style="padding-left:12px">▸ Frame controller</div>
     ${[2,w.slot,9].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b).map(i=>`<div style="padding-left:12px" class="${i===w.slot?'aa-sel':''}">${i===w.slot? (seen? `● Slot ${i}: ${B.product}` : `○ Slot ${i}`) : `○ Slot ${i}: (other card)`}</div>`).join('')}</div>
    <div class="aa-pane"><div class="aa-phead">Slot ${w.slot}: <b>${seen? (c[0x0105]||B.product) : '—'}</b> <span class="muted small">${seen? (c[0x0107]||'') : ''}</span>${sn.ph==='app'||!w.card?'':' <span style="color:var(--warn)">('+sn.ph+')</span>'}</div>
     <div class="aa-ptabs">${[['status','Status ▸ Card Status'],['info','Status ▸ Card Info'],['control','Control ▸ Card Settings'],['console','Debug console'],['snmp','SNMP']].map(([k,l])=>`<button data-dt="${k}" class="${tab===k?'on':''}">${l}</button>`).join('')}</div>
     <div class="aa-pbody">${body}</div>
     <div class="aa-pfoot"><button data-da="open">Open / rescan</button><button data-da="refresh">Refresh</button><select id="aaFile">${Object.keys(FILES).map(k=>`<option value="${k}">${FILES[k].name}</option>`).join('')}</select><button data-da="upload">Upload…</button><button data-da="reboot">Reboot</button></div>
     ${upl&&!upl.done? `<div class="aa-upl"><div class="aa-bar"><i style="width:${(upl.p*100).toFixed(1)}%"></i></div><div class="small">${upl.txt}${inf}</div></div>`:''}</div></div></div>`;
}
const DASH_CSS = `<style>
.aa-dash{border:1px solid var(--line);border-radius:6px;background:var(--panel2);font:12.5px var(--sans);overflow:hidden}
.aa-dtitle{display:flex;justify-content:space-between;padding:5px 8px;background:color-mix(in srgb,var(--accent2) 22%,var(--panel));border-bottom:1px solid var(--line);font-weight:600}
.aa-dwrap{display:grid;grid-template-columns:140px 1fr;min-height:250px}
.aa-tree{border-right:1px solid var(--line);padding:6px;font-size:12px;background:var(--lane)}
.aa-tree .aa-sel{background:color-mix(in srgb,var(--accent) 22%,transparent);border-radius:3px}
.aa-pane{display:flex;flex-direction:column;min-width:0}
.aa-phead{padding:6px 8px;border-bottom:1px solid var(--line)}
.aa-ptabs{display:flex;flex-wrap:wrap;gap:3px;padding:5px 6px 0}
.aa-ptabs button{font-size:11.5px;padding:3px 7px;border-radius:5px 5px 0 0}
.aa-pbody{padding:8px;flex:1;border-top:1px solid var(--line)}
.aa-dt{border-collapse:collapse;width:100%}.aa-dt td{padding:4px 6px;border-bottom:1px dashed var(--grid);vertical-align:top}
.aa-dl{color:var(--ink2);width:40%}
.aa-dt input[readonly]{width:100%;background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:2px 5px;color:var(--ink);font:12px var(--mono)}
.aa-dt select{max-width:100%;font-size:12px;padding:2px 4px}
.aa-dt button{font-size:11.5px;padding:2px 7px}
.aa-r{display:inline-block;margin-right:8px;white-space:nowrap}
.aa-alarm{display:inline-block;width:11px;height:11px;border-radius:50%;vertical-align:-1px}
.aa-dnote{margin-top:6px;font-size:11.5px;color:var(--ink2)}
.aa-dmsg{padding:20px;color:var(--ink2)}
.aa-pfoot{display:flex;flex-wrap:wrap;gap:5px;padding:6px;border-top:1px solid var(--line)}
.aa-pfoot button,.aa-pfoot select{font-size:11.5px;padding:3px 7px;max-width:100%}
.aa-upl{padding:6px 8px;border-top:1px solid var(--line)}
.aa-bar{height:9px;border-radius:5px;background:var(--grid);overflow:hidden}.aa-bar i{display:block;height:100%;background:var(--accent)}
.aa-two{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:10px;align-items:start}
.aa-rear{display:grid;grid-template-columns:minmax(0,320px) minmax(0,1fr);gap:12px}
@media (max-width:700px){.aa-dwrap{grid-template-columns:1fr}.aa-tree{border-right:none;border-bottom:1px solid var(--line)}.aa-two,.aa-rear{grid-template-columns:1fr}}
.aa-hot{fill:color-mix(in srgb,var(--accent) 25%,var(--panel2))!important;stroke:var(--accent)!important;stroke-width:2.5!important}
</style>`;

/* ---------------- binding ---------------- */
function bindAll(root){
  root.querySelectorAll('.aa-dip').forEach(g=>g.onclick=()=>A.dip(+g.dataset.i));
  root.querySelectorAll('.aa-trim').forEach(g=>g.onclick=e=>{ const r=g.getBoundingClientRect(); const d=(e.shiftKey?0.002:0.01)*((e.clientX-r.left)<r.width/2? -1 : 1); A.trim(+g.dataset.k, d); });
  root.querySelectorAll('.aa-jack').forEach(g=>g.onclick=()=>{ if (g.dataset.mine!=='1') return; const r=g.dataset.r; if (r==='inA') A.cable(0); else if (r==='inB') A.cable(1); else if (r[0]==='o'){ worldEv(w=>{ w.scopeOut=r; }); SIM.refresh(); } });
  root.querySelectorAll('.aa-slot').forEach(g=>g.onclick=()=>A.setSlot(+g.dataset.s));
  root.querySelectorAll('[data-dt]').forEach(b=>b.onclick=()=>{ D.ui.dashTab=b.dataset.dt; SIM.refresh(); });
  root.querySelectorAll('.aa-pbody input[type=radio]').forEach(r=>r.onchange=()=>A.dashSet(+r.dataset.o, +r.dataset.v));
  root.querySelectorAll('.aa-pbody select[data-o]').forEach(s=>s.onchange=()=>{ const v=parseInt(s.value,10); if (!isNaN(v)) A.dashSet(+s.dataset.o, v); });
  root.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>A.dashSet(0x0301, 0));
  root.querySelectorAll('[data-cal]').forEach(r=>r.onchange=()=>A.dashSet(0x0500+(+r.dataset.cal), +r.value));
  root.querySelectorAll('[data-cal1]').forEach(b=>b.onclick=()=>{ const k=+b.dataset.cal1, c=cacheAt(SIM.t); A.dashSet(0x0500+k, clamp((c[0x0500+k]||0)+(+b.dataset.d),-100,100)); });
  const go=root.querySelector('#aaCmdGo'), inp=root.querySelector('#aaCmd');
  if (go){ go.onclick=()=>{ const v=(inp.value||'cal').trim(); A.cmd(v); }; inp.onkeydown=e=>{ if (e.key==='Enter'){ e.preventDefault(); go.click(); } }; }
  root.querySelectorAll('[data-da]').forEach(b=>b.onclick=()=>{ const k=b.dataset.da; if (k==='open') A.dashOpen(); if (k==='refresh') A.dashRefresh(); if (k==='reboot') A.dashReboot(); if (k==='upload'){ const s=root.querySelector('#aaFile'); A.upload(s? s.value : 'wbsnmp'); } });
}
function worldControlsHTML(){
  const w=worldAt(SIM.t); const opt=(v,cur,l)=>`<option value="${v}" ${v===cur?'selected':''}>${l}</option>`;
  const srcSel=k=>{ const s=k?w.B:w.A; return `<label>IN${k+1} <select id="aaS${k}">${['tone','program','mute','off'].map(x=>opt(x,s.src,{tone:'tone '+s.f+' Hz',program:'program',mute:'silent source',off:'unplugged'}[x])).join('')}</select></label><select id="aaL${k}">${[-50,-40,-35,-30,-25,-20,-10,0,4,8,18,24,27].map(v=>opt(v,s.dBu,v+' dBu')).join('')}</select>`; };
  return `<div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px" class="small">
    ${srcSel(0)} ${srcSel(1)}
    <label>Rear <select id="aaRear">${Object.keys(REARS).map(k=>opt(k,w.rear,k)).join('')}</select></label>
    ${REARS[w.rear].dual? `<label>this card <select id="aaPos">${opt(1,w.pos,'#1')}${opt(2,w.pos,'#2')}</select></label>`:''}
    <label title="Main-loop pass time is not in the source">pass <select id="aaPass">${[15e-6,20e-6,25e-6,35e-6,45e-6,60e-6].map(v=>opt(v,w.passT,(v*1e6)+' µs')).join('')}</select>${inf}</label>
    <button id="aaIns">${w.card?'Pull card':'Insert card'}</button>
    <button id="aaNext" title="Carry the state at 1.000 s into a new second">Next second ▶</button><button id="aaSkip5">Skip 5 s ▶▶</button><button id="aaRst">Reset</button>
    <label title="After an action, move the playhead just past it"><input type="checkbox" id="aaFol" ${D.ui.autoFollow?'checked':''}> follow</label></div>`;
}
function bindWorld(root){
  const q=s=>root.querySelector(s); if (!q('#aaIns')) return;
  [0,1].forEach(k=>{ q('#aaS'+k).onchange=e=>A.source(k,e.target.value); q('#aaL'+k).onchange=e=>A.level(k,+e.target.value); });
  q('#aaRear').onchange=e=>A.setRear(e.target.value); const p=q('#aaPos'); if (p) p.onchange=e=>A.pos(+e.target.value);
  q('#aaPass').onchange=e=>{ act('Assumed pass time → '+(+e.target.value*1e6)+' µs', tr=>{ D.s0.w.passT=+e.target.value; D.ver++; tr('Changes how many passes fit in a second, how long 3000-pass ADC waits take, and so the silence timer (see Software tab).'); }); };
  q('#aaIns').onclick=()=> worldAt(SIM.t).card? A.remove() : A.insert();
  q('#aaNext').onclick=()=>{ rollSecond(); SIM.refresh(); }; q('#aaSkip5').onclick=()=>skip(5);
  q('#aaRst').onclick=()=>{ resetAll(); SIM.seek(0); }; q('#aaFol').onchange=e=>{ D.ui.autoFollow=e.target.checked; };
}
document.addEventListener('keydown', e=>{
  if (!window.__aa6201aKeys || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase(), c=cacheAt(SIM.t);
  const m={ a:()=>A.cable(0), b:()=>A.cable(1), m:()=>A.dashSet(0x0302, ((c[0x0302]||0)+1)%3), o:()=>A.dashOpen(), n:()=>{ rollSecond(); SIM.refresh(); }, s:()=>skip(5) };
  if (m[k]){ m[k](); e.preventDefault(); }
});

/* =====================================================================
   TIMELINE LANES
   ===================================================================== */
function lanes(){
  const R=sim(); const css=n=>SIM.css(n); const ls=[];
  const txt=(c,s,x,y)=>{ c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(s,x,y); };
  const step=(c,X,y,h,fn,color)=>{ c.strokeStyle=color; c.lineWidth=1.5; c.beginPath(); R.snaps.forEach((sn,i)=>{ const v=fn(sn); const yy=y+h-4-v*(h-8); i? c.lineTo(X(sn.t),yy) : c.moveTo(X(sn.t),yy); }); c.stroke(); };
  ls.push({label:'Card (boot · app · EEPROM · watchdog)', h:26, draw(c,X,t0,t1,y,h){
    c.fillStyle=css('--accent'); c.globalAlpha=.15; c.fillRect(X(0),y+5,X(1)-X(0),h-10); c.globalAlpha=1;
    R.segs.forEach(g=>{ c.fillStyle= g.kind==='wdt'? css('--bad') : g.kind==='loader'? css('--accent2') : g.kind==='off'? css('--grid') : g.kind==='ee'? css('--play') : css('--warn'); c.globalAlpha=.55; c.fillRect(X(g.t0),y+3,Math.max(1,X(g.t1)-X(g.t0)),h-6); c.globalAlpha=1;
      const wpx=X(g.t1)-X(g.t0); if (wpx>90){ c.save(); c.beginPath(); c.rect(X(g.t0),y,wpx,h); c.clip(); txt(c,g.label,Math.max(X(g.t0),X(t0))+4,y+h/2+4); c.restore(); } }); }});
  ls.push({label:'Main loop: AD_CONVERTER state (READ · WAIT · RESET)', h:28, draw(c,X,t0,t1,y,h){
    const w=worldAt(t0); const pp=X(t0+w.passT)-X(t0);
    if (pp<4){ let prev=null; R.snaps.forEach(sn=>{ if (sn.ph!=='app') return; if (prev){ c.fillStyle= sn.ad==='READ'? css('--accent2') : sn.ad==='RESET'? css('--play') : (sn.inp? css('--warn') : css('--accent')); c.globalAlpha=.55; c.fillRect(X(prev.t),y+5,X(sn.t)-X(prev.t)+0.6,h-10); c.globalAlpha=1; } prev=sn; });
      txt(c, `${R.passes.toLocaleString()} passes · colour = input being waited on (green CHA, orange CHB)`, X(t0)+6, y+h/2+4); return; }
    R.snaps.forEach(sn=>{ if (sn.ph!=='app' || sn.t<t0-0.001 || sn.t>t1) return; for (let tt=sn.t; tt<sn.t+C.SNAP; tt+=w.passT){ c.fillStyle=css('--accent'); c.globalAlpha=.7; c.fillRect(X(tt),y+5,Math.max(1,pp-1),h-10); c.globalAlpha=1; } });
    R.convs.forEach(v=>{ if (v.t>=t0&&v.t<=t1){ c.fillStyle=css('--play'); c.fillRect(X(v.t)-1,y,3,h); } }); }});
  ls.push({label:'ADC: conversions (104 µs) and evaluations', h:28, draw(c,X,t0,t1,y,h){
    R.convs.forEach(v=>{ if (v.t+C.CONV<t0||v.t>t1) return; c.fillStyle= v.k? css('--warn') : css('--accent'); c.fillRect(X(v.t),y+4,Math.max(2,X(v.t+C.CONV)-X(v.t)),h/2-5); });
    R.evals.forEach(e=>{ if (e.t<t0||e.t>t1) return; c.fillStyle= e.k? css('--warn') : css('--accent'); c.beginPath(); c.arc(X(e.t), y+h*0.72, 4, 0, 7); c.fill(); if (X(t1)-X(t0) < 4000 && (t1-t0)<0.5){ txt(c, `${e.k?'B':'A'} ${e.r}${e.r>e.thr?'>':'≤'}${e.thr}`, X(e.t)+6, y+h-3); } }); }});
  ls.push({label:'Timer0 1 ms · timer0_interrupt_occurred[0] (wraps at 256)', h:30, draw(c,X,t0,t1,y,h){
    SIM.pulses(c,X,t0,t1,y,h*0.35,C.T0,0.0004,2e-5,css('--accent2'),'timer0'); step(c,X,y+h*0.3,h*0.7,sn=>sn.o[0]/255,css('--ink2')); }});
  ls.push({label:'Timer1 96 µs ticks · heartbeat / reports', h:24, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,C.T1_TICK,0.00003,6e-6,css('--ink2'),'timer1 ticks'); R.hbs.forEach(b=>{ if (b.t>=t0&&b.t<=t1){ c.fillStyle=css('--play'); c.fillRect(X(b.t)-1,y,3,h); if (X(t1)-X(t0)>0) txt(c,b.k,X(b.t)+4,y+h-4); } }); }});
  [0,1].forEach(k=>ls.push({label:`Detector CH${k?'B':'A'} (U${k?8:6}) counts vs threshold`, h:42, draw(c,X,t0,t1,y,h){
    const sc=v=>y+h-3-Math.log10(1+Math.min(1023,Math.max(0,v)))/Math.log10(1024)*(h-6);   // log scale
    c.strokeStyle=css('--bad'); c.setLineDash([4,3]); c.beginPath(); R.snaps.forEach((sn,i)=>{ i? c.lineTo(X(sn.t),sc(sn.thr)) : c.moveTo(X(sn.t),sc(sn.thr)); }); c.stroke(); c.setLineDash([]);
    c.strokeStyle= k? css('--warn') : css('--accent'); c.lineWidth=1.5; c.beginPath(); R.snaps.forEach((sn,i)=>{ i? c.lineTo(X(sn.t),sc(sn.c[k])) : c.moveTo(X(sn.t),sc(sn.c[k])); }); c.stroke();
    R.evals.forEach(e=>{ if (e.k!==k||e.t<t0||e.t>t1) return; c.fillStyle=css('--ink'); c.beginPath(); c.arc(X(e.t),sc(e.r),3,0,7); c.fill(); }); }}));
  ls.push({label:'Silence counters input1_count / input2_count', h:34, draw(c,X,t0,t1,y,h){
    const w=worldAt(t0), f=R.end.f; const lim=Math.max(1,(f.sdti||0)*C.SIL_TICKS);
    step(c,X,y,h,sn=>Math.min(1,sn.k[0]/lim),css('--accent')); step(c,X,y,h,sn=>Math.min(1,sn.k[1]/lim),css('--warn'));
    txt(c, f.sdti? `limit ${lim} ticks (${f.sdti*5} s)` : 'interval Off → limit 0', X(t0)+6, y+11); }});
  ls.push({label:'audio1 / audio2 → CHA / CHB LEDs', h:28, draw(c,X,t0,t1,y,h){
    [0,1].forEach(k=>{ c.fillStyle= k? css('--warn') : css('--accent'); let prev=null; R.snaps.forEach(sn=>{ if (prev && (sn.leds & (k?2:4))) c.fillRect(X(prev.t),y+3+k*(h/2),X(sn.t)-X(prev.t)+0.6,h/2-6); prev=sn; }); }); }});
  ls.push({label:'74HC4053 selects U1_A B C · U5_A C (high = muted path)', h:30, draw(c,X,t0,t1,y,h){
    ['u1a','u1b','u1c','u5a','u5c'].forEach((p,i)=>{ const yy=y+3+i*5.2; c.fillStyle=css('--ink2'); let prev=null; R.snaps.forEach(sn=>{ if (prev && sn.sw[p]) c.fillRect(X(prev.t),yy,X(sn.t)-X(prev.t)+0.6,3.5); prev=sn; }); }); }});
  ls.push({label:'CAN bus 1 Mbit/s (rx ▼ from frame controller, tx ▲)', h:34, draw(c,X,t0,t1,y,h){
    let n=0; R.can.forEach(fr=>{ if (fr.t+fr.dur<t0||fr.t>t1) return; n++; const rx=fr.dir==='rx';
      c.fillStyle= rx? css('--accent2') : fr.type===0x10? css('--play') : fr.type===0x11? css('--warn') : css('--accent');
      c.fillRect(X(fr.t), rx? y+4 : y+h/2+1, Math.max(1.5, X(fr.t+fr.dur)-X(fr.t)), h/2-5);
      if (X(fr.t+fr.dur)-X(fr.t)>110){ c.save(); c.beginPath(); c.rect(X(fr.t),y,X(fr.t+fr.dur)-X(fr.t),h); c.clip(); c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(fr.desc, X(fr.t)+2, rx? y+15 : y+h-6); c.restore(); } });
    if (!n) txt(c,'idle',X(t0)+6,y+h/2+4); }});
  ls.push({label:'IN1 and OUT1-1 (+ leg) waveforms', h:46, draw(c,X,t0,t1,y,h){
    const w=worldAt(t0); const N=Math.min(1600, Math.max(200, X(t1)-X(t0)));
    const amp=0.775*Math.SQRT2*Math.pow(10,27/20)/((h-6)/2);
    [[0,css('--ink2')],[1,css('--accent')]].forEach(([which,col])=>{ c.strokeStyle=col; c.lineWidth=1; c.beginPath();
      for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N, sn=snapAt(tt), ta=(D.second-1)+tt; const wv=worldAt(tt); const v = which? (sn.ph==='app'? outSample(wv,sn.sw,0,ta)/2 : 0) : inSample(wv,0,ta);
        const yy=y+h/2-v/amp*4; i? c.lineTo(X(tt),yy) : c.moveTo(X(tt),yy); } c.stroke(); });
    if (t1-t0>0.02) txt(c,'zoom in to see the cycles (grey IN1, green OUT1-1 +leg, ×4)',X(t0)+6,y+11); }});
  return ls;
}

/* ---------------- scope + meters ---------------- */
function drawScope(cv, t){
  const {c,w:W,h:H}=SIM.canvas(cv,170); const w=worldAt(t), sn=snapAt(t), ta=(D.second-1)+t; const span=0.005;
  const sw = sn.ph==='app'? sn.sw : SW_MUTE; const grp = w.scopeOut[1]==='B'?1:0;
  c.strokeStyle=SIM.css('--grid'); for (let i=0;i<=10;i++){ c.beginPath(); c.moveTo(i*W/10,0); c.lineTo(i*W/10,H); c.stroke(); } c.beginPath(); c.moveTo(0,H/2); c.lineTo(W,H/2); c.stroke();
  const lv=Math.max(-40, ...[0,1].map(k=>srcLevel(w,k,ta)??-99), outLevelOf(t,w.scopeOut)); const full = 0.775*Math.SQRT2*Math.pow(10, (lv+4)/20);
  const tr=(fn,col,lw)=>{ c.strokeStyle=col; c.lineWidth=lw||1.5; c.beginPath(); for (let i=0;i<=W;i++){ const v=fn(ta-span/2+span*i/W); const y=H/2-v/full*(H/2-6); i? c.lineTo(i,y) : c.moveTo(i,y); } c.stroke(); };
  tr(tt=>inSample(w,0,tt), SIM.css('--ink2'), 1); tr(tt=>inSample(w,1,tt), SIM.css('--accent2'), 1); tr(tt=>outSample(w,sw,grp,tt), SIM.css('--accent'), 2);
  c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono');
  c.fillText(`5 ms · ±${(full).toFixed(1)} V · grey IN1, blue IN2, green ${w.scopeOut} (balanced, ${outLevelOf(t,w.scopeOut).toFixed(1)} dBu)`, 6, 13);
}
function metersHTML(t){
  const w=worldAt(t), outs=rearOuts(w);
  const row=(n,l)=>{ const p=clamp((l+40)/(C.CLIP_OUT+40),0,1)*100; return `<tr><td>${n}</td><td style="width:60%"><div style="height:9px;border-radius:4px;background:var(--grid);overflow:hidden"><i style="display:block;height:100%;width:${p}%;background:${l>C.CLIP_OUT-0.5?'var(--bad)':l>18?'var(--warn)':'var(--accent)'}"></i></div></td><td class="mono">${l<-90?'—':l.toFixed(1)+' dBu'}</td></tr>`; };
  const lA=srcLevel(w,0,(D.second-1)+t), lB=srcLevel(w,1,(D.second-1)+t);
  const levA=outLevelOf(t,'oA1'), levB=outLevelOf(t,'oB1');
  const pw=powerOf(w, levA, levB);
  return `<table class="kv"><tr><th>Input</th><td colspan="2" class="mono">IN1 ${lA===null?'not connected':lA.toFixed(1)+' dBu'} · IN2 ${lB===null?'not connected':lB.toFixed(1)+' dBu'}</td></tr>${outs.map(([n,r])=>row(n, r[1]==='A'? levA : levB)).join('')}</table>
   <p class="small muted">Every output of a group is the same amplifier through its own 2 × 30R1 build-out (60 Ω source). Clip at ≈ +${C.CLIP_OUT} dBu ${inf}. Supply estimate ${pw.mA} mA × 12 V = ${pw.W.toFixed(2)} W (Fanless.xls, 600 Ω loads) — the sheet’s limit for a frame with no moving air is 2 W per slot.</p>`;
}
function powerOf(w, a, b){ // Fanless.xls: 4/18/27 dBu → 1 ch 240/300/410 mA, 2 ch 270/370/780 mA
  const tab=[[4,240,270],[18,300,370],[27,410,780]]; const lv=Math.max(a,b); const two = a>-60 && b>-60;
  const interp=col=>{ if (lv<=4) return tab[0][col]-Math.max(0,(4-Math.max(lv,-40))*0.6); for (let i=0;i<2;i++) if (lv<=tab[i+1][0]){ const f=(lv-tab[i][0])/(tab[i+1][0]-tab[i][0]); return tab[i][col]+f*(tab[i+1][col]-tab[i][col]); } return tab[2][col]; };
  const mA=Math.round(interp(two?2:1)); return {mA, W:mA*12/1000};
}

/* ---------------- shared bits ---------------- */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> <span class="muted">at ${SIM.fmtT(D.log[0].t)} (second ${D.log[0].sec})</span></div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Use the card (DIP, LEVEL trims), the rear module (inputs), the frame strip or the parameter window. Each step the firmware takes is listed here with the function names from the source.</div>'; }
function inspHTML(t){
  const sn=snapAt(t), w=worldAt(t), R=sim(), f=R.end.f, seg=segAt(t);
  const last=k=>{ const e=R.evals.filter(x=>x.k===k && x.t<=t).pop(); return e? `${e.raw}${f.cal[k]?` ${f.cal[k]>0?'+':'−'} ${Math.abs(f.cal[k])}`:''} = ${e.r} ${e.r>e.thr?'>':'≤'} ${e.thr} → ${e.a?'audio':'counting'}${e.added?` (+${e.added} ticks)`:''}` : '—'; };
  return `<table class="kv">
   <tr><th>Second</th><td class="mono">#${D.second} · ${SIM.fmtT(t)} · ${D.ev.length} event(s)</td></tr>
   <tr><th>Card</th><td class="mono">${sn.ph}${seg? ' — '+seg.label : ''}</td></tr>
   <tr><th>slot / mod_address</th><td class="mono">${w.slot} · ADC ${slotAdc(w.slot)} → ${ADDRESS_TABLE(slotAdc(w.slot))} · 0x${hx(0x10+ADDRESS_TABLE(slotAdc(w.slot)))} · margin ${slotMargin(w.slot)}</td></tr>
   <tr><th>DIP (PINB≪1)</th><td class="mono">0x${hx(dipBits(w.dip))} · SW1–4 ${w.dip.map(x=>x?'ON':'off').join(' ')} · dip_switch_enabled ${f.dip_en?'YES':'NO'} · dashboard_enabled ${f.dash_en?'YES':'NO'}</td></tr>
   <tr><th>mode</th><td class="mono">${MODE_CODE[sn.mode]} · U1 A${sn.sw.u1a}B${sn.sw.u1b}C${sn.sw.u1c} · U5 A${sn.sw.u5a}C${sn.sw.u5c}</td></tr>
   <tr><th>ad_flag / input</th><td class="mono">${sn.ad} · INPUT${sn.inp+1} · ad_counter ${sn.ctr}</td></tr>
   <tr><th>detector counts</th><td class="mono">A ${sn.c[0]} (${dbuOfCount(sn.c[0]-w.err[0]).toFixed(1)} dBu) · B ${sn.c[1]} · threshold ${sn.thr}</td></tr>
   <tr><th>last CHA eval</th><td class="mono">${last(0)}</td></tr><tr><th>last CHB eval</th><td class="mono">${last(1)}</td></tr>
   <tr><th>silence counts</th><td class="mono">${sn.k[0]} / ${sn.k[1]} of ${f.sdti*C.SIL_TICKS} · t0occ ${sn.o[0]}/${sn.o[1]}</td></tr>
   <tr><th>audio1 / audio2</th><td class="mono">${sn.a[0]?'YES':'NO'} / ${sn.a[1]?'YES':'NO'} · LEDs ${sn.leds&4?'A':'-'}${sn.leds&2?'B':'-'}</td></tr>
   <tr><th>settings</th><td class="mono">interval ${valTxt(0x0303,f.sdti)} · threshold ${valTxt(0x0304,f.sdth)} · notify ${f.notify} · cal ${f.cal[0]}/${f.cal[1]} · calibState ${f.calState}</td></tr>
   <tr><th>CAN</th><td class="mono">parameter_refresh ${['AUDIO1','AUDIO2','MODE','SIGNAL_STATUS'][sn.pr]} · dashboard_initializing ${sn.dash?'YES':'NO'} · tx_interrupt_counter ${sn.txc}</td></tr>
   <tr><th>EEPROM 10–18</th><td class="mono">${[10,11,12,13,14,15,16,17,18].map(a=>hx(f.ee[a]??0xFF)).join(' ')}</td></tr>
   <tr><th>Notes</th><td class="small mono">${R.notes.filter(n=>n.t<=t).slice(-4).reverse().map(n=>`${SIM.fmtT(n.t)} ${n.s}`).join('<br>')||'—'}</td></tr></table>`;
}
function canLogHTML(t){ const rows=sim().can.filter(fr=>fr.t<=t).slice(-40).reverse();
  return rows.map(fr=>`<div><span class="muted">${SIM.fmtT(fr.t)}</span> ${fr.dir==='rx'?'<b style="color:var(--accent2)">▼ rx</b>':'<b>▲ tx</b>'} id 0x${hx(canId(fr.src,fr.dst,fr.type,fr.flags),8)} <span class="muted">(${hx(fr.src)}→${hx(fr.dst)} ${msgName(fr.type)})</span> [${fr.data.map(x=>hx(x)).join(' ')}] ${fr.desc}</div>`).join('') || '<div class="muted">No CAN frames yet in this second.</div>'; }

/* ---------------- Simulator tab ---------------- */
function viewSim(m){
  window.__aa6201aKeys = true;
  m.innerHTML = DASH_CSS + `
  <div class="grid2"><div>${card('Frame, card and card edge at the playhead', `<div id="frm"></div><div class="aa-two" style="margin-top:8px"><div id="crd"></div><div id="edge"></div></div>
     <div class="small muted" style="margin-top:4px">Card edge = ${SIM.src(ART_SRC+'AA6201A-card-edge.cdr','AA6201A-card-edge.cdr')} (CorelDRAW, 2007|40). Card = AA6201A ISS5 top side from the gerbers (TOP + TSM + TSS). Click the DIP switch, the LVLA/LVLB trimmers (left half −, right half +, shift = fine) or a frame slot. Keys: A / B IN1/IN2 cable · M mode · O open in DashBoard · N next second · S skip 5 s.</div><div id="wc"></div>`)}</div>
   <div>${card('Parameter window (DashBoard-style, generic)', `<div id="dash"></div>`)}${card('What the firmware did (last action)', `<div id="trace" class="log"></div>`)}</div></div>
  <div class="grid2"><div>${card('Rear module — click IN1/IN2 to plug/unplug; click an output to scope it', `<div class="aa-rear"><div><div id="rear"></div><div id="rearSrc" class="small muted"></div></div><div id="rearInfo" class="small"></div></div>`)}</div>
   <div>${card('State at the playhead', `<div id="insp"></div>`)}</div></div>
  ${card('Timeline — one second as seen by the card and its LEDs (click to seek)', `<canvas id="tl"></canvas><p class="small muted">Timer periods come from the register values (8 MHz, clk/64). The main-loop pass time is ${inf} (selectable above); the 3000-pass wait between ADC evaluations and therefore the silence timing scale with it. Detector counts follow a fit to the firmware’s CONSTANT_xxdBu table ${inf}.</p>`)}
  <div class="grid2">${card('Scope at the playhead', `<canvas id="scope"></canvas>`)}${card('Outputs and supply', `<div id="meters"></div>`)}</div>
  ${card('CAN frames (newest first)', `<div id="canlog" class="log"></div>`)}`;
  let wcVer=-1;
  const draw=()=>{
    const t=SIM.t; finishUploadIfDone();
    if (wcVer!==D.ver){ wcVer=D.ver; m.querySelector('#wc').innerHTML=worldControlsHTML(); bindWorld(m); }
    m.querySelector('#frm').innerHTML=frameSVG(t); m.querySelector('#crd').innerHTML=cardSVG(t); m.querySelector('#edge').innerHTML=edgeSVG(t);
    m.querySelector('#dash').innerHTML=dashHTML(t); m.querySelector('#rear').innerHTML=rearSVG(t); m.querySelector('#rearSrc').innerHTML=rearSrc();
    const w=worldAt(t), RM=REARS[w.rear];
    m.querySelector('#rearInfo').innerHTML=`<b>${RM.name}</b><br>ID resistors AN_BMID / AN_BMID2: ${RM.id} (AN_BMID reaches PF3/ADC3, U9-58, but the firmware never reads it).
      <table class="kv" style="margin-top:4px">${(RM.kind==='tb9'? RM.blocks.flatMap(b=>b.items.map(i=>[i[0],i[1],b.tb+' → P1'+(b.card===2?'01':'02')])) : RM.pos.map((p,i)=>[(i+1)+' '+p[0],p[1],'P1-'+p[2]])).map(r=>`<tr><td>${r[0]}</td><td>${{inA:'→ U11 SSM2143 (BNC1_SIG/GND)',inB:'→ U12 SSM2143 (BNC2_SIG/GND)'}[r[1]]||('group '+r[1][1]+' output '+r[1][2]+' (AES'+(r[1][1]==='A'? r[1][2] : 4+ +r[1][2])+'P/N)')}</td><td class="mono">${r[2]}</td></tr>`).join('')}</table><div class="muted">Source: ${RM.src}.${w.rear==='T6303'?' *Position 8 is labelled “OUT1-3” on AA6201-REAR-MODULES.pdf; the netlist puts AES7 (OUT2-3) there.':''}</div>`;
    m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#insp').innerHTML=inspHTML(t); m.querySelector('#canlog').innerHTML=canLogHTML(t);
    m.querySelector('#meters').innerHTML=metersHTML(t);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210}); drawScope(m.querySelector('#scope'), t);
    bindAll(m);
  };
  SIM.on('time', draw);
  let last=0; SIM.on('frame', ts=>{ if (D.ui.upl && !D.ui.upl.applied && ts-last>250){ last=ts; draw(); } });
}

/* ---------------- tutorial ---------------- */
const endF = ()=>sim().end.f, endW = ()=>sim().end.w;
const LESSONS = [
  {title:'Meet the AA6201A', body:`<p>The AA6201A is an openGear card that copies two balanced analog audio inputs to up to eight balanced outputs. It also watches each input: if the level stays under a threshold for a set time it reports <b>silence</b> to DashBoard (and, from v5.00, to SNMP through the frame controller).</p>
    <p>On the card: two <b>LEVEL</b> trimmers reached from the card edge by plastic extension shafts, three LEDs and a 4-way DIP switch. Everything else is set in DashBoard.</p><p class="muted">Sources: v5.01 firmware, AA6201A V5.1 programming instruction (2012|45), DIP Switch.cdr, AA6201A-card-edge.cdr, AA6201-REAR-MODULES.pdf. The archive has no user manual for this card.</p>`, check:()=>true, auto:true},
  {title:'1 · Rear module', body:`<p>Four rear modules are drawn for this card: <b>T6203</b> (first-generation frame), <b>T6303</b> (one card: IN1, IN2, OUT1-1…1-4, OUT2-1…2-4), and the two-card <b>T6403</b> (one input and four outputs per card) and <b>T6406</b> (2 × 3 per card).</p><p><b>Goal:</b> fit a T6303.</p>`, check:()=>endW().rear==='T6303', hint:'Simulator controls: Rear → T6303.'},
  {title:'2 · DIP switch before you insert', body:`<p>DIP Switch.cdr: <b>SW1</b> Mode Sel (MSB), <b>SW2</b> Mode Sel (LSB), <b>SW3</b> Default (dip switch / memory), <b>SW4</b> Dashboard enable. In the code an OFF switch reads 1:</p>
    <ul class="small"><li>SW1 OFF, SW2 OFF = Stereo DA · SW2 ON = Mono Mix · SW1 ON = Mono DA (ChA 1×8) · both ON = also Mono DA (MONO_CHB was removed).</li><li>SW3 <b>OFF</b> = take the mode from SW1/SW2 at power-up; <b>ON</b> = restore everything saved in EEPROM.</li><li>SW4 <b>OFF</b> = DashBoard may change the mode; <b>ON</b> = SW1/SW2 rule live, DashBoard’s Mode is refused and Save disappears.</li></ul><p>SW3 and SW4 are read once, after the boot waits.</p><p><b>Goal:</b> all four OFF (Stereo, DIP default, DashBoard enabled).</p>`, check:()=>endW().dip.every(x=>!x), hint:'Click the four blue slides on the card.'},
  {title:'3 · Insert the card and watch it boot', body:`<p>Pull the card, then Insert. Scrub the timeline: main() spends 63 ms, then two rounds of 100 slot-ID samples (≈0.6 s each), a slot-dependent delay (10 000 × slot loops), another 63 ms, then restores settings and joins CAN. Boot takes ≈1.4 s, so use <b>Next second</b>.</p><p>All through the boot <span class="mono">port_init</span> drives every 74HC4053 select high: <b>the outputs are muted</b> until the first <span class="mono">PROCESS_MODES</span>. The CHA/CHB LEDs are on during boot (DATA_INITIALIZATION).</p><p><b>Goal:</b> the card has booted and is running.</p>`, check:()=>sim().segs.some(g=>g.kind==='boot') || D.log.some(l=>l.name==='Insert the card'), hint:'Pull card, Insert card, then Next second.'},
  {title:'4 · Open it in DashBoard', body:`<p>Opening the card makes the frame controller read the card’s tree: 15 parameters, menus “Status” (Card Info, Card Status) and “Control” (Card Settings), descriptors and values, and on v5 the SNMP strings.</p><p><b>Goal:</b> press Open / rescan and watch the burst of CAN frames.</p>`, check:()=>sim().can.filter(f=>f.dir==='rx').length>30, hint:'Open / rescan in the parameter window.'},
  {title:'5 · Stereo DA, unity gain', body:`<p>V5.1 instruction steps 4–5: set the card to <b>Stereo DA Mode</b> and both channels to <b>unity gain</b>.</p><p>The LEVEL trimmers sit in U3’s feedback; range ≈ +18 dB to −15 dB. Unity is about a third of the way round ${inf}.</p><p><b>Goal:</b> Mode = Stereo and both LEVEL trims within ±0.3 dB of unity.</p>`, check:()=>{ const w=endW(); return endF().mode===0 && Math.abs(db(trimGain(w.lvl[0])))<0.3 && Math.abs(db(trimGain(w.lvl[1])))<0.3; }, hint:'Card Settings → Mode; trims are already near unity after Reset.'},
  {title:'6 · −30 dBu threshold and test tone', body:`<p>Steps 6–7: set <b>Silence Detection Threshold = −30</b> and apply <b>−30 dBu</b> to both inputs. Leave the time interval at <b>Off</b> so the LEDs react on every reading (about every 6000 main-loop passes per channel).</p><p><b>Goal:</b> threshold −30, both inputs −30 dBu tone.</p>`, check:()=>{ const w=endW(); return endF().sdth===2 && w.A.dBu===-30 && w.B.dBu===-30 && w.A.src==='tone' && w.B.src==='tone'; }, hint:'Level selects next to IN1/IN2.'},
  {title:'7 · “cal” in the debug console', body:`<p>Steps 8–10: open the Debug Console for the card and type <b>cal</b>. The card answers OK, sets <span class="mono">calibState = 1</span> and sends two traps on the next heartbeats. Then re-open the card: the Calibration Left/Right descriptors now say slider instead of hidden.</p><p><b>Goal:</b> calibration sliders visible in Card Settings.</p>`, check:()=>cacheAt(1).desc50==='slider', hint:'Debug console tab → cal → Enter, then Open / rescan.'},
  {title:'8 · Trim the calibration until the LEDs go off', body:`<p>Step 11: with −30 dBu in and the threshold at −30, lower Calibration Left and Right until <b>both LEDs just turn off</b>. The value is added to (or subtracted from) every ADC reading by <span class="mono">CALIBRATION_TABLE</span>, so the card then calls exactly −30 dBu “silence”.</p><p>This simulated card reads 37 counts high on CHA (LED on: lower the value) and 22 low on CHB (LED already off: raise it until the LED comes on, then back one step) ${inf}.</p><p><b>Goal:</b> both LEDs off with −30 dBu applied, and a reading within 4 counts of 273.</p>`, check:()=>{ const R=sim(); const e0=R.evals.filter(e=>e.k===0).pop(), e1=R.evals.filter(e=>e.k===1).pop(); return e0&&e1&&!e0.a&&!e1.a&&e0.r>=269&&e1.r>=269; }, hint:'Use the −1/+1 buttons; watch the LED lanes and “last CHA/CHB eval”.'},
  {title:'9 · Save, then “fin”', body:`<p>Steps 12–13: <b>Save</b> (OID 3.1). The next pass writes EEPROM bytes 10–18 — but only bytes that changed (eepromWriteByte compares first). Then type <b>fin</b> to hide the sliders again.</p><p>Watch out: a calibration of exactly <b>−1</b> is stored as FF FF, and RESTORE treats a low byte of 0xFF as “never saved” and loads 0.</p><p><b>Goal:</b> calibration saved and calibState back to 0.</p>`, check:()=>{ const f=endF(); return f.calState===0 && calFromBytes(f.ee[15],f.ee[16])===f.cal[0] && f.cal[0]!==0; }, hint:'Card Settings → Save, then console “fin”.'},
  {title:'10 · Silence detection in service', body:`<p>Set the inputs back to +4 dBu, <b>interval = 10 Secs</b> and <b>Notify on Card Fault = Enabled</b>. Unplug IN2 and press <b>Skip 5 s</b> twice. After 10 × 10 × 500 timer0 ticks below threshold, audio2 = NO, the CHB LED goes out and the next SIGNAL_STATUS report says “CHB Silence Detected”.</p><p>With the interval at <b>Off</b> the LEDs still drop at once, but Card Status never alarms (it needs interval ≠ 0).</p><p><b>Goal:</b> DashBoard Card Status shows CHB silence.</p>`, check:()=>cacheAt(1)[0x0201]===8 || cacheAt(1)[0x0201]===2, hint:'Interval 10 s, notify Enabled, unplug IN2 (click it on the rear), then Skip 5 s until Card Status changes — the CHB-only alarm waits for a lucky routine report (Findings), often 15–20 s.'},
  {title:'11 · Make it survive a power cycle', body:`<p>With SW3 OFF (the default) only the calibration is restored at power-up; interval, threshold, notify and mode come back as Off / −30 / Disabled / DIP mode. Set <b>SW3 ON</b>, Save, then Reboot from DashBoard.</p><p><b>Goal:</b> SW3 ON and the interval still 10 s after a reboot.</p>`, check:()=>{ const f=endF(), w=endW(); return w.dip[2] && f.sdti===2 && D.log.some(l=>l.name.startsWith('DashBoard: reboot')); }, hint:'Click SW3, Save, Reboot, Next second ×2.'},
  {title:'12 · SNMP (v5.x, Ward-Beck build only)', body:`<p>Open the SNMP tab. The card itself only tells the frame controller which enterprise OIDs (base 25030.1.1.4) belong to each parameter and which notification to raise for Card Status / Input CHA / Input CHB.</p><p><b>Goal:</b> look at the SNMP tab.</p>`, check:()=>D.ui.dashTab==='snmp', hint:'SNMP tab in the parameter window.'},
  {title:'13 · Field firmware upgrade', body:`<p>From V203 (2009|42) the card carries the Ross bootloader. Choose a .bin and Upload: START_UPGRADE → watchdog → loader → pages → verify → reboot. The zeuspack files list all three product names, so a Ross or Cobalt card accepts the Ward-Beck SNMP image and becomes a Ward-Beck card in DashBoard ${inf}.</p><p><b>Goal:</b> upload a .bin.</p>`, check:()=>D.log.some(l=>l.name==='Upload complete'), hint:'Pick a file next to Upload…, press Upload…, wait ~8 s.'},
  {title:'Done', body:`<p><b>One second</b> breaks the timing down, <b>Software</b> traces the loop, state machine and messages, <b>Findings</b> lists what the code really does.</p>`, check:()=>true, auto:true},
];
function viewTutorial(m){
  window.__aa6201aKeys = true;
  m.innerHTML = DASH_CSS + `<div class="grid2"><div>${card('Tutorial — installing and calibrating an AA6201A', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('Frame, card, card edge and rear module', `<div id="frm"></div><div id="crd" style="margin-top:6px"></div><div style="display:grid;grid-template-columns:minmax(0,1fr) 130px;gap:8px;margin-top:6px"><div id="edge"></div><div id="rear"></div></div><div id="wc"></div>`)}${card('Parameter window', `<div id="dash"></div>`)}</div></div>`;
  let wcVer=-1;
  const draw=()=>{
    const t=SIM.t; finishUploadIfDone();
    if (wcVer!==D.ver){ wcVer=D.ver; m.querySelector('#wc').innerHTML=worldControlsHTML(); bindWorld(m); }
    m.querySelector('#frm').innerHTML=frameSVG(t); m.querySelector('#crd').innerHTML=cardSVG(t,{labels:false}); m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#rear').innerHTML=rearSVG(t,{compact:true});
    m.querySelector('#dash').innerHTML=dashHTML(t); m.querySelector('#trace').innerHTML=traceHTML();
    const li=D.ui.lesson;
    m.querySelector('#lessons').innerHTML=LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===li?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<li?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(x=>x.onclick=()=>{ D.ui.lesson=+x.dataset.i; draw(); });
    const L=LESSONS[li]; let ok=false; try{ ok=L.check(); }catch(e){ ok=false; }
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${li?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${li<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>
      <p class="small muted">Goals are checked against the state at the end of the simulated second, so a change counts once its effect has run.</p>`;
    m.querySelector('#prv').onclick=()=>{ D.ui.lesson=Math.max(0,li-1); draw(); }; m.querySelector('#nxt').onclick=()=>{ D.ui.lesson=Math.min(LESSONS.length-1,li+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ resetAll(); D.ui.lesson=0; SIM.seek(0); };
    bindAll(m);
  };
  SIM.on('time', draw);
  let last=0; SIM.on('frame', ts=>{ if (D.ui.upl && !D.ui.upl.applied && ts-last>250){ last=ts; draw(); } });
}

/* ---------------- one second ---------------- */
function viewSecond(m){
  window.__aa6201aKeys = true;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
   <div class="grid2">${card('As seen by the card', `<div id="dev"></div>`)}${card('As seen by the LEDs and DashBoard', `<div style="display:grid;grid-template-columns:150px minmax(0,1fr);gap:10px"><div id="edge"></div><div id="dview"></div></div>`)}</div>
   ${card('Zoom ladder at the playhead (OUT1-1, + leg)', `<canvas id="zl"></canvas>`)}`;
  const draw=()=>{
    const t=SIM.t, R=sim(), w=worldAt(t), f=R.end.f, P=w.passT;
    const evalP = 2*(C.AD_WAIT+3)*P + 2*C.CONV;
    const tx=R.can.filter(x=>x.dir==='tx').length, rx=R.can.filter(x=>x.dir==='rx').length;
    const rows=[
      ['Main-loop passes (while(1) in main())', R.passes.toLocaleString(), SIM.fmtDur(P), 'AD_CONVERTER_AA6201A_SETUP · PROCESS_MODES · READ_DIP_SWITCHES · REFRESH_LEDS · CAN_FUNCTIONS — pass time '+inf],
      ['ADC conversions (ADMUX 0 ↔ 1)', R.convs.length, SIM.fmtDur(C.CONV), 'single conversion, ADCSRA |= BIT6, polled by ad_flag READ'],
      ['Evaluations per channel', (R.evals.length/2).toFixed(1), SIM.fmtDur(evalP), 'every 3000 WAIT passes one channel is compared with silence_threshold, then the mux flips'],
      ['Timer0 interrupts', R.t0n.toLocaleString(), '1 ms', 'timer0_interrupt_occurred[0/1]++ (unsigned char, wraps at 256) and the 1-second CAN message count'],
      ['Silence interval', f.sdti? (f.sdti*5)+' s' : 'Off', f.sdti? (f.sdti*5000)+' ticks' : '0', `≈ ${Math.ceil(f.sdti*5/evalP)} evaluations; if one evaluation period exceeds 255 ms the tick counter wraps and the interval stretches`],
      ['Timer1 interrupts', R.t1n.toLocaleString(), '96 µs', 'CANTX_BUFFER_CHECK / CAN_TX_TIMER: next frame of a long reply, or a heartbeat when tx_interrupt_counter passes its limit'],
      ['Heartbeat REPORT_PARAM', R.hbs.length, f.dash_init? SIM.fmtDur(C.TX_INIT_PER_SLOT*f.slot*C.T1_TICK) : SIM.fmtDur((C.TX_HEART+1)*C.T1_TICK), f.dash_init? 'dashboard_initializing: 1000 × slot ticks' : '10 000 ticks; the parameter sent is whatever parameter_refresh happens to hold (it advances every pass)'],
      ['CAN frames', `${rx} rx · ${tx} tx`, SIM.fmtDur(frameTime(8)), '1 Mbit/s; 8-byte frame ≈ 144 µs with stuffing '+inf],
      ['Detector time constant', '—', '10 ms', 'R44/R63 10K · C26/C34 1 µF after a ×173 half-wave rectifier (R41 220K / R47 1K27)'],
      ['Audio samples (analog, no sampling)', '—', '—', 'the audio path is continuous: SSM2143 → NE5532 → 74HC4053 → OP275 + TIP29/TIP30 → 30R1 build-outs'],
    ];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>this second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    const sn=snapAt(t), seg=segAt(t); const fr=R.can.find(x=>x.t<=t && x.t+x.dur>=t);
    m.querySelector('#dev').innerHTML=`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>AT90CAN128</th><td class="mono">${seg? seg.label : 'pass #'+sn.ps.toLocaleString()+' · '+sn.ad+' on INPUT'+(sn.inp+1)}</td></tr>
      <tr><th>timer0 / timer1</th><td class="mono">ms ${Math.floor(t*1000)} · tick #${Math.floor(t/C.T1_TICK)}</td></tr>
      <tr><th>ADC</th><td class="mono">ADMUX ${sn.inp} · detector A ${sn.c[0]} B ${sn.c[1]}</td></tr>
      <tr><th>4053 selects</th><td class="mono">U1 A${sn.sw.u1a}B${sn.sw.u1b}C${sn.sw.u1c} U5 A${sn.sw.u5a}C${sn.sw.u5c} → ${sn.ph==='app'?MODE_CODE[sn.mode]:'muted'}</td></tr>
      <tr><th>CAN bus</th><td class="mono">${fr? (fr.dir==='rx'?'▼ ':'▲ ')+fr.desc : 'idle'}</td></tr>
      <tr><th>OUT1-1</th><td class="mono">${outLevelOf(t,'oA1').toFixed(1)} dBu</td></tr></table>`;
    m.querySelector('#edge').innerHTML=edgeSVG(t);
    const c=cacheAt(t);
    m.querySelector('#dview').innerHTML=`<table class="kv"><tr><th>DashBoard shows</th><td></td></tr>${[0x0201,0x0202,0x0203,0x0302,0x0303,0x0304].map(o=>`<tr><td>${OID[o].name}</td><td class="mono">${valTxt(o,c[o])}</td></tr>`).join('')}</table><p class="small muted">The LEDs change on the next pass after an evaluation; DashBoard waits for a REPORT_PARAM or a GET reply.</p>`;
    const levels=[['1 second',1],['100 ms',0.1],['one evaluation period',evalP],['10 ms (detector τ)',0.01],['1 ms (timer0)',0.001]];
    const H=levels.length*44+10; const {c:z,w:zw}=SIM.canvas(m.querySelector('#zl'),H); const full=0.775*Math.SQRT2*Math.pow(10,(Math.max(-40,outLevelOf(t,'oA1'))+4)/20);
    levels.forEach(([nm,span],i)=>{ span=Math.min(1,span); const y=8+i*44, t0=Math.max(0,Math.min(1-span,t-span/2)); z.fillStyle=SIM.css('--ink'); z.font='12px sans-serif'; z.fillText(nm+' ('+SIM.fmtDur(span)+')',6,y+14);
      const x0=190, pw=zw-x0-10; z.strokeStyle=SIM.css('--grid'); z.strokeRect(x0,y+2,pw,30); z.strokeStyle=SIM.css('--accent'); z.beginPath(); const N=Math.min(900,pw*2);
      for (let k=0;k<=N;k++){ const tt=t0+span*k/N; const s2=snapAt(tt); const v=s2.ph==='app'? outSample(worldAt(tt),s2.sw,0,(D.second-1)+tt)/2 : 0; const yy=y+17-v/full*26; k?z.lineTo(x0+pw*k/N,yy):z.moveTo(x0,yy); } z.stroke();
      const px=x0+(t-t0)/span*pw; z.strokeStyle=SIM.css('--play'); z.beginPath(); z.moveTo(px,y); z.lineTo(px,y+34); z.stroke(); });
  };
  SIM.on('time', draw);
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  pc:{x:10,y:10,w:150,h:58,t:'PC: DashBoard',s:['parameter editor','debug console, .bin upload'],d:'DashBoard talks to the frame controller over Ethernet. The AA6201A V5.1 instruction uses its Debug Console to send “cal” and “fin”.'},
  mfc:{x:10,y:95,w:150,h:70,t:'Frame controller',s:['Ethernet ↔ CAN','SNMP agent (v5 cards)'],d:'Turns DashBoard requests into openGear CAN messages addressed to slot + 0x10. For SNMP it asks the card for its base OID (25030.1.1.4) and per-parameter OID/trap strings; the agent itself is in the frame controller '+'(inferred).'},
  mid:{x:10,y:190,w:150,h:96,t:'Midplane (P2)',s:['+12 V (P2-1/3/5), −7V5','CANH P2-13 · CANL P2-11','AN_SLOTID P2-6'],d:'P2 (MEDAC20). The slot-ID resistor (100K … 681R) against R96 1K to 3V gives ADC2 a slot-dependent voltage. REF1/REF2 and the PSB pins reach P2 but are not used by this card.'},
  rear:{x:10,y:312,w:150,h:96,t:'Rear module (P1)',s:['T6203 / T6303 / T6403 / T6406','IN1 P1-97/99, IN2 P1-92/90','OUT on the AES1–8 pairs'],d:'Passive terminal blocks on the 100-pin P1. The inputs use the nets named BNC1/BNC2 SIG/GND, the outputs the pairs named AES1–AES8 — names inherited from the D6201A digital DA layout.'},
  rx:{x:200,y:312,w:150,h:96,t:'U11 / U12 SSM2143',s:['balanced line receivers','gain ½ (−6 dB)','R2/R3 5K49 + 68 µF'],d:'Differential receivers. Their output is AC-coupled (C13/C14 68/10) into the level stage.'},
  lvl:{x:390,y:312,w:160,h:96,t:'U3 NE5532 + LVLA/LVLB',s:['inverting, R9/R27 43K2','5K multi-turn in feedback','+17.9 … −15 dB overall'],d:'The level trimmers form a T in U3’s feedback (pot to GND, wiper via R5/R25 1K). Unity input-to-output gain is about a third of the way round '+'(inferred from the resistor values).'},
  det:{x:390,y:190,w:160,h:96,t:'U6 / U8 OP275 detectors',s:['×173 half-wave rectifier','10K + 1 µF (10 ms) · buffer','÷ 10K/6K49 → XLR1/XLR2'],d:'Precision half-wave rectifiers (R47 1K27 in, R41 220K + D11/D12) feed RC filters and followers, then a divider into PF0/PF1 (nets XLR1/XLR2). The AVR samples these with its 10-bit ADC.'},
  mcu:{x:600,y:150,w:180,h:150,t:'AT90CAN128 @ 8 MHz',s:['main() super-loop','timer0 1 ms · timer1 96 µs','ADC0/1 silence · ADC2 slot','CAN ISR + DashBoard tables','PE3–7 → 4053 selects'],d:'v100w.c + AA6201A.c + Dashboard.c + CAN.c (ICCAVR 7.15). The firmware never touches the audio: it chooses the routing with five port pins and watches the detector voltages.'},
  ui:{x:600,y:40,w:180,h:80,t:'SW1 4-way DIP · 3 LEDs',s:['SW1–4 on PB3–PB6','CHA PB2 · CHB PB1 · COM PB0'],d:'DIP Switch.cdr: Mode Sel MSB, Mode Sel LSB, Default (dip switch / memory), Dashboard enable. COM ACTIVITY on PB0 is never switched on.'},
  sw:{x:600,y:330,w:180,h:80,t:'U1 / U5 74HC4053',s:['route A, B or (A+B)/2 to group A','route B or copy of A to group B'],d:'Six analog switches; the firmware drives three on U1 and two on U5. Each switch either feeds a 20K/10K summing resistor or shorts it to ground.'},
  oa:{x:830,y:270,w:180,h:70,t:'U2 OP275 + boosters → OUT A',s:['summer 10K · inverter 10K','TIP29/TIP30 per leg'],d:'AOUT+ from the summer, AOUT− from the inverter; each leg buffered by a TIP29/TIP30 pair with 4R7 emitter resistors and a 2N4401 (current limit, inferred) and split to four outputs through 30R1 build-outs.'},
  ob:{x:830,y:360,w:180,h:70,t:'U7 OP275 + boosters → OUT B',s:['B, or a copy of AOUT−','same output stage'],d:'In the mono modes U5 feeds AOUT− into U7, so the B outputs carry the A signal (inverted, then re-inverted by the balanced pair).'},
  can:{x:830,y:150,w:180,h:60,t:'U10 SN65HVD233',s:['CAN transceiver, LBK = PD7'],d:'CAN_RX (PD7 high) holds the transceiver in loop-back during the whole ≈1.4 s boot; CAN_TX releases it after CAN_setup.'},
  psu:{x:830,y:40,w:180,h:80,t:'Power',s:['F1 RXE050 · CC6-1212DF ±12 V','LM1117-3.3 → AVR + ADC ref'],d:'+12 V from the midplane through a polyfuse into a ±12 V DC-DC (analog rails) and a 3.3 V regulator (logic and AREF). Fanless.xls: 2.9–9.4 W depending on level.'},
};
const WIRES=[['pc','mfc','Ethernet'],['mfc','mid','CAN'],['mid','can','CANH/L'],['can','mcu','TX/RX'],['mid','mcu','slot ID'],['rear','rx','IN1/IN2'],['rx','lvl',''],['lvl','det',''],['det','mcu','XLR1/XLR2'],['lvl','sw',''],['mcu','sw','PE3–PE7'],['ui','mcu',''],['sw','oa',''],['sw','ob',''],['oa','rear','AES1–4'],['ob','rear','AES5–8'],['psu','mcu','3V']];
function viewBlock(m){
  window.__aa6201aKeys=false;
  m.innerHTML=`<div class="grid2"><div>${card('Block diagram — click a block', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdi"></div>`)}${card('Signal flow in two sentences', `<p>Audio: rear module → SSM2143 → NE5532 level stage → 74HC4053 routing → OP275 summers and TIP29/TIP30 boosters → four or eight balanced outputs. Control: the AVR only sets the routing pins and watches two rectified, smoothed copies of the level-stage outputs; DashBoard sees the result through CAN.</p>`)}</div></div>`;
  const draw=()=>{ const sel=D.ui.blk; const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 1020 440" style="width:100%"><defs><marker id="aaar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <rect x="185" y="25" width="830" height="410" rx="10" fill="none" stroke="var(--line)" stroke-dasharray="5 4"/><text x="195" y="40" font-size="11" fill="var(--ink2)">AA6201A card (ISS5)</text>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.2}" marker-end="url(#aaar)"/>`; if (l) s+=`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-3}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ D.ui.blk=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdi').innerHTML=`<h3>${b.t}</h3><p>${b.d.replace('(inferred)',inf).replace('(inferred from the resistor values)',infT('from the resistor values'))}</p>`; };
  draw();
}

/* ---------------- schematics (redrawn from AA6201Aiss5.net / .bom) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*17;
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+20+i*17; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+4}" y="${yy+4}" font-size="10" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x-34}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+20+i*17; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-4}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x+w+34}" y="${yy+4}" font-size="10" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  return s;
}
const box=(x,y,w,h,t,sub)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="var(--ink)"/><text x="${x+w/2}" y="${y+h/2}" text-anchor="middle" font-size="11.5" fill="var(--ink)">${t}</text>${sub?`<text x="${x+w/2}" y="${y+h/2+14}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
const wire=(pts,c)=>`<path d="M${pts.map(p=>p.join(' ')).join(' L')}" fill="none" stroke="${c||'var(--ink)'}" stroke-width="1.3"/>`;
const res=(x,y,lab,vert)=> vert? `<rect x="${x-5}" y="${y}" width="10" height="26" fill="var(--panel)" stroke="var(--ink)"/><text x="${x+9}" y="${y+16}" font-size="9.5" fill="var(--ink)">${lab}</text>` : `<rect x="${x}" y="${y-5}" width="26" height="10" fill="var(--panel)" stroke="var(--ink)"/><text x="${x+13}" y="${y-8}" font-size="9.5" text-anchor="middle" fill="var(--ink)">${lab}</text>`;
const SHEETS=[
  {name:'1 · Input receiver and level trim (channel A; B identical)', note:'U11 SSM2143 (B: U12), R2 5K49 (R3), C13 68/10 (C14), U3A NE5532 (U3B), R5 1K (R25), R9 43K2 (R27), LVLA 5K multi-turn (LVLB), C5 27p (C17). Gain curve computed from those values.', svg:()=>{
    let s=chip(110,60,110,'U11 SSM2143',[['3 +IN','BNC1_SIG P1-97'],['2 −IN','BNC1_GND P1-95…100'],['1 REF','GND']],[['6 OUT',''],['5 SENSE','']],'gain ½');
    s+=wire([[250,80],[280,80]])+res(280,80,'R2 5K49')+wire([[306,80],[330,80]])+`<text x="318" y="100" font-size="9.5" fill="var(--ink)">C13 68µ</text>`+wire([[330,80],[370,80],[370,110],[400,110]]);
    s+=`<path d="M400 95 L400 145 L450 120 Z" fill="var(--panel2)" stroke="var(--ink)"/><text x="404" y="113" font-size="10" fill="var(--ink)">−</text><text x="404" y="140" font-size="10" fill="var(--ink)">+</text><text x="408" y="165" font-size="10" fill="var(--ink)">U3A NE5532</text>`+wire([[400,135],[385,135],[385,150]])+`<text x="380" y="162" font-size="9" fill="var(--ink2)">GND</text>`;
    s+=wire([[450,120],[540,120]])+`<text x="545" y="124" font-size="10.5" fill="var(--accent2)">NET00049 → R11/R14 (4053), R47 (detector)</text>`;
    s+=wire([[370,110],[370,40],[420,40]])+res(420,40,'R9 43K2')+wire([[446,40],[500,40],[500,120]]);
    s+=wire([[500,120],[500,200]])+`<rect x="490" y="200" width="20" height="70" fill="var(--panel)" stroke="var(--ink)"/><text x="516" y="240" font-size="9.5" fill="var(--ink)">LVLA 5K</text>`+wire([[500,270],[500,290]])+`<text x="492" y="302" font-size="9" fill="var(--ink2)">CW: GND</text>`;
    s+=wire([[490,235],[440,235]])+res(414,235,'R5 1K')+wire([[414,235],[370,235],[370,110]]);
    // gain curve
    const gx=620, gy=180, gw=330, gh=130; s+=`<rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" fill="none" stroke="var(--grid)"/><text x="${gx}" y="${gy-6}" font-size="11" fill="var(--ink)">input → output gain vs LVLA rotation (CW … CCW)</text>`;
    let p=''; for (let i=0;i<=100;i++){ const a=i/100, g=db(trimGain(a)); p+=(i?'L':'M')+(gx+a*gw).toFixed(1)+' '+(gy+gh/2-g/20*gh/2).toFixed(1); } s+=`<path d="${p}" fill="none" stroke="var(--accent)" stroke-width="2"/><line x1="${gx}" y1="${gy+gh/2}" x2="${gx+gw}" y2="${gy+gh/2}" stroke="var(--ink2)" stroke-dasharray="3 3"/><text x="${gx+4}" y="${gy+12}" font-size="10" fill="var(--ink2)">+20 dB</text><text x="${gx+4}" y="${gy+gh-3}" font-size="10" fill="var(--ink2)">−20 dB</text><text x="${gx+UNITY_A*gw+4}" y="${gy+gh/2-4}" font-size="10" fill="var(--accent)">unity ≈ ${(UNITY_A*100).toFixed(0)}%</text>`;
    return s; }},
  {name:'2 · Silence detector (channel A; B = U8, R64/R59/R63/R60/R66)', note:'R47 1K27, R41 220K, D11/D12 1N4148, C25 27p, R44 10K, C26 1µ, U6A/U6B OP275, R43 10K, R49 6K49 → XLR1 → U9-61 (PF0/ADC0). AREF on the 3V net.', svg:()=>{
    let s=`<text x="20" y="64" font-size="10.5" fill="var(--accent2)">U3A out</text>`+wire([[70,60],[100,60]])+res(100,60,'R47 1K27')+wire([[126,60],[170,60],[170,90],[200,90]]);
    s+=`<path d="M200 75 L200 125 L250 100 Z" fill="var(--panel2)" stroke="var(--ink)"/><text x="204" y="93" font-size="10" fill="var(--ink)">−</text><text x="204" y="120" font-size="10" fill="var(--ink)">+</text><text x="198" y="142" font-size="10" fill="var(--ink)">U6A OP275</text>`;
    s+=wire([[250,100],[290,100]])+`<path d="M290 92 L290 108 L304 100 Z" fill="var(--ink)"/><line x1="304" y1="92" x2="304" y2="108" stroke="var(--ink)"/><text x="282" y="86" font-size="9.5" fill="var(--ink)">D12</text>`+wire([[304,100],[350,100]]);
    s+=wire([[170,60],[170,30],[330,30]])+res(330,30,'R41 220K')+wire([[356,30],[350,30],[350,100]]);
    s+=wire([[270,100],[270,160],[180,160],[180,90]])+`<text x="190" y="175" font-size="9.5" fill="var(--ink)">D11 (feedback on the other half)</text>`;
    s+=wire([[350,100],[390,100]])+res(390,100,'R44 10K')+wire([[416,100],[460,100]])+wire([[440,100],[440,130]])+`<line x1="430" y1="130" x2="450" y2="130" stroke="var(--ink)"/><line x1="430" y1="136" x2="450" y2="136" stroke="var(--ink)"/><text x="454" y="136" font-size="9.5" fill="var(--ink)">C26 1µ (τ 10 ms)</text>`;
    s+=`<path d="M470 85 L470 125 L510 105 Z" fill="var(--panel2)" stroke="var(--ink)"/><text x="468" y="145" font-size="10" fill="var(--ink)">U6B follower</text>`+wire([[460,100],[470,100]])+wire([[510,105],[540,105]])+res(540,105,'R43 10K')+wire([[566,105],[620,105]])+res(600,105,'R49 6K49',true)+wire([[600,131],[600,150]])+`<text x="592" y="162" font-size="9" fill="var(--ink2)">GND</text>`;
    s+=`<text x="626" y="109" font-size="10.5" fill="var(--accent2)">XLR1 → U9-61 PF0/ADC0</text>`;
    s+=`<text x="20" y="220" font-size="11.5" fill="var(--ink)">DC at ADC0 ≈ 0.394 × 173 × Vpk/π of the U3 output (half-wave average). By that arithmetic −20 dBu at unity gain gives ≈ ${Math.round(0.3936*173.2*0.5*0.1096/Math.PI/3.3*1024)} counts,</text><text x="20" y="236" font-size="11.5" fill="var(--ink)">while the firmware’s CONSTANT_20dBu is 893 — see Findings. The simulator uses the firmware table (fit A·10^(L/20) − B, ${inf.replace(/<[^>]+>/g,'')}).</text>`;
    let g=''; const gx=20, gy=260, gw=900, gh=100; g+=`<rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" fill="none" stroke="var(--grid)"/>`;
    for (let L=-60;L<=-15;L+=5){ const x=gx+(L+60)/45*gw; g+=`<line x1="${x}" y1="${gy}" x2="${x}" y2="${gy+gh}" stroke="var(--grid)"/><text x="${x-12}" y="${gy+gh+12}" font-size="9.5" fill="var(--ink2)">${L}</text>`; }
    let p=''; for (let i=0;i<=90;i++){ const L=-60+i/2; const cnt=clamp(C.FIT_A*Math.pow(10,(L+20)/20)-C.FIT_B,0,1023); p+=(i?'L':'M')+(gx+(L+60)/45*gw).toFixed(1)+' '+(gy+gh-cnt/1023*gh).toFixed(1); }
    g+=`<path d="${p}" fill="none" stroke="var(--accent)" stroke-width="2"/>`+THR_CONST.map((c,i)=>{ const L=-20-5*i; const x=gx+(L+60)/45*gw, y=gy+gh-c/1023*gh; return `<circle cx="${x}" cy="${y}" r="3.5" fill="var(--bad)"/><text x="${x+5}" y="${y-4}" font-size="9" fill="var(--bad)">${c}</text>`; }).join('');
    return s+g+`<text x="${gx}" y="${gy-4}" font-size="10.5" fill="var(--ink)">ADC counts vs input dBu: red = CONSTANT_20dBu … CONSTANT_60dBu, green = fit</text>`; }},
  {name:'3 · Mode switching (74HC4053 U1, U5) and summers', note:'U1: X (14) ← R11 20K, Y (15) ← R14 20K from U3A; Z (4) ← R18 20K from U3B; X0/Y0/Z0 (12/2/5) → U2 pin 2 (NET00036, R1 10K feedback); X1/Y1/Z1 → GND. U5: X (14) ← R31 10K from AOUT−, Z (4) ← R37 10K from U3B; X0/Z0 → U7 pin 2 (R42 10K). Selects A/B/C on pins 11/10/9 = U1_A/U1_B/U1_C (PE5/PE4/PE3), U5_A/U5_C (PE7/PE6).', svg:()=>{
    const sn=snapAt(SIM.t), sw=sn.ph==='app'? sn.sw : SW_MUTE;
    const swc=(x,y,lab,src,on)=>`<text x="${x-150}" y="${y+4}" font-size="10.5" fill="var(--ink)">${src}</text>`+wire([[x-60,y],[x-20,y]])+`<circle cx="${x-20}" cy="${y}" r="3" fill="var(--ink)"/><line x1="${x-20}" y1="${y}" x2="${x+12}" y2="${on? y-12 : y+12}" stroke="${on?'var(--accent)':'var(--bad)'}" stroke-width="2.5"/><text x="${x+18}" y="${y-10}" font-size="9.5" fill="var(--ink)">→ sum</text><text x="${x+18}" y="${y+18}" font-size="9.5" fill="var(--ink2)">→ GND</text><text x="${x-56}" y="${y-6}" font-size="9.5" fill="var(--ink2)">${lab}</text>`;
    let s=`<text x="20" y="24" font-size="12" fill="var(--ink)">At the playhead: ${sn.ph==='app'? MODE_CODE[sn.mode] : 'boot / off — all selects high = everything grounded'}</text>`;
    s+=swc(220,70,'R11 20K · U1_A '+sw.u1a,'U3A (CHA)',!sw.u1a)+swc(220,120,'R14 20K · U1_B '+sw.u1b,'U3A (CHA)',!sw.u1b)+swc(220,170,'R18 20K · U1_C '+sw.u1c,'U3B (CHB)',!sw.u1c);
    s+=wire([[270,58],[330,58],[330,160]])+`<path d="M330 90 L330 140 L380 115 Z" fill="var(--panel2)" stroke="var(--ink)"/><text x="336" y="160" font-size="10" fill="var(--ink)">U2A Σ (R1 10K)</text>`+wire([[380,115],[430,115]])+`<text x="435" y="119" font-size="10.5" fill="var(--accent2)">AOUT+ → U2B inverter (R28/R23 10K) → AOUT−</text>`;
    s+=swc(220,260,'R31 10K · U5_A '+sw.u5a,'AOUT− (copy of A)',!sw.u5a)+swc(220,310,'R37 10K · U5_C '+sw.u5c,'U3B (CHB)',!sw.u5c);
    s+=wire([[270,248],[330,248],[330,300]])+`<path d="M330 260 L330 310 L380 285 Z" fill="var(--panel2)" stroke="var(--ink)"/><text x="336" y="330" font-size="10" fill="var(--ink)">U7A Σ (R42 10K)</text>`+wire([[380,285],[430,285]])+`<text x="435" y="289" font-size="10.5" fill="var(--accent2)">BOUT+ → U7B inverter (R55/R54 10K) → BOUT−</text>`;
    s+=`<g font-size="10.5" fill="var(--ink)"><text x="600" y="190">PROCESS_MODES (AA6201A.c):</text><text x="600" y="206">STEREO  : U1 A0 B0 C1 · U5 A1 C0 → OUT A = A, OUT B = B</text><text x="600" y="222">MONO    : U1 A0 B1 C0 · U5 A0 C1 → OUT A = (A+B)/2, OUT B = OUT A</text><text x="600" y="238">MONO_CHA: U1 A0 B0 C1 · U5 A0 C1 → OUT A = A, OUT B = OUT A</text><text x="600" y="254" fill="var(--ink2)">MONO_CHB (commented out): U1 A1 B1 C0 · U5 A1 C0 → OUT A = B/2 (−6 dB) ${'(inferred)'}</text></g>`;
    return s; }},
  {name:'4 · Output stage and rear-module pins', note:'Per leg (AOUT+ shown): U2 output → Q1 TIP29 / Q3 TIP30 followers, Q2 2N4401 + R8 3K65/R17 6K81/R19 5K62/D3 bias network, emitters through R6/R10 and R12/R13 4R7 to AOUT+. AOUT+ → R72–R75 30R1 → AES1P–AES4P; AOUT− → R68–R71 30R1 → AES1N–AES4N; BOUT± → R76–R83 → AES5–AES8.', svg:()=>{
    let s=`<path d="M20 70 L20 120 L70 95 Z" fill="var(--panel2)" stroke="var(--ink)"/><text x="18" y="140" font-size="10" fill="var(--ink)">U2A</text>`+wire([[70,95],[120,95]]);
    s+=box(120,50,120,40,'Q1 TIP29','to +VA')+box(120,100,120,40,'Q3 TIP30','to −VA')+box(260,75,110,40,'Q2 2N4401','R8/R17/R19, D3');
    s+=wire([[240,70],[400,70],[400,120],[240,120]])+`<text x="300" y="64" font-size="9.5" fill="var(--ink)">R6, R10 4R7</text><text x="300" y="138" font-size="9.5" fill="var(--ink)">R12, R13 4R7</text>`+wire([[400,95],[450,95]])+`<text x="455" y="99" font-size="11" fill="var(--accent2)">AOUT+</text>`;
    const pins=[['AES1P','R72','69'],['AES2P','R73','63'],['AES3P','R74','57'],['AES4P','R75','51'],['AES1N','R68','67'],['AES2N','R69','61'],['AES3N','R70','55'],['AES4N','R71','49']];
    pins.forEach((p,i)=>{ const y=180+i*22; s+=wire([[520,y],[560,y]])+res(560,y,p[1]+' 30R1')+wire([[586,y],[640,y]])+`<text x="646" y="${y+4}" font-size="10.5" fill="var(--ink)">${p[0]} → P1-${p[2]}</text><text x="470" y="${y+4}" font-size="10" fill="var(--accent2)">${i<4?'AOUT+':'AOUT−'}</text>`; });
    s+=`<text x="780" y="200" font-size="10.5" fill="var(--ink)">Group B: BOUT± → R76–R83 → AES5–AES8</text><text x="780" y="216" font-size="10.5" fill="var(--ink)">(P1-70/68, 64/62, 58/56, 52/50)</text><text x="780" y="248" font-size="10.5" fill="var(--ink)">Source impedance 2 × 30.1 Ω = 60 Ω balanced</text><text x="780" y="264" font-size="10.5" fill="var(--ink)">Fanless.xls: +27 dBu into 4 × 600 Ω, 2 channels</text><text x="780" y="280" font-size="10.5" fill="var(--ink)">→ 780 mA from +12 V (9.4 W)</text>`;
    return s; }},
  {name:'5 · AT90CAN128 (U9), CAN and power', note:'Pin numbers and nets from AA6201Aiss5.net; port use from AA6201A.h, ADC.c, v100w.c (port_init: DDRB 0x07, DDRE 0xFF, DDRD 0x80).', svg:()=>
    chip(330,50,220,'U9 AT90CAN128',[['5 PE3','U1_C'],['6 PE4','U1_B'],['7 PE5','U1_A'],['8 PE6','U5_C'],['9 PE7','U5_A'],['10 PB0','COM_ACTIVITY (L3)'],['11 PB1','CHB LED (L2)'],['12 PB2','CHA LED (L1)'],['13 PB3','SW1 Mode MSB'],['14 PB4','SW2 Mode LSB'],['15 PB5','SW3 Default'],['16 PB6','SW4 DashBoard en.']],
      [['61 PF0 ADC0','XLR1 (CHA detector)'],['60 PF1 ADC1','XLR2 (CHB detector)'],['59 PF2 ADC2','AN_SLOTID (P2-6, R96 1K)'],['58 PF3 ADC3','AN_BMID (P1-2) — unused'],['30 PD5 TXCAN','CAND → U10-1'],['31 PD6 RXCAN','CANR ← U10-4'],['32 PD7','LBK → U10-5'],['62 AREF','3V'],['23/24','X1 8 MHz'],['JTAG1','HLE-SAMT-2X5']],'8 MHz · ICCAVR 7.15')+
    box(30,330,160,40,'U10 SN65HVD233','CANH P2-13 · CANL P2-11')+box(220,330,160,40,'F1 RXE050 → CC6-1212DF','+12 V → ±12 V (±VA)')+box(410,330,160,40,'LM1117-3.3 (REG1)','→ 3V: AVR, AREF, 4053')+box(600,330,180,40,'P2 MEDAC20','+12V 1/3/5 · −7V5 2 · SLOTID 6')},
];
function viewSchem(m){
  window.__aa6201aKeys=false;
  m.innerHTML=`${card('Schematics — redrawn from net, pin and part names (not the original P-CAD drawings)', `<div id="tabs2" style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px"></div><div id="sh"></div><p class="small muted" id="shn"></p><p class="small muted">Source: AA6201A - #PCB/AA6201Aiss5.net, .bom, .pnp (P-CAD 2002, ISS5, 2009|42). The original .sch is binary P-CAD; these sheets are a redraw for reading, with simplified symbols.</p>`)}`;
  const draw=()=>{ const i=D.ui.sheet; m.querySelector('#tabs2').innerHTML=SHEETS.map((s,k)=>`<button data-k="${k}" class="${k===i?'on':''}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ D.ui.sheet=+b.dataset.k; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 1000 400" style="width:100%;background:var(--panel2);border-radius:8px">${SHEETS[i].svg()}</svg>`; m.querySelector('#shn').textContent=SHEETS[i].note; };
  SIM.on('time', ()=>{ if (D.ui.sheet===2) draw(); }); draw();
}

/* ---------------- software ---------------- */
const LOOP = [['WDR(); AD_CONVERTER_AA6201A_SETUP()','READ: poll ADCSRA bit 6 · WAIT: count 3000 passes, then CALIBRATION_TABLE + threshold + silence count · RESET: flip ADMUX, start conversion'],
  ['PROCESS_MODES()','DIP mode if dip_switch_enabled && !dashboard_enabled; threshold index → CONSTANT_xxdBu; mode → U1_A/B/C, U5_A/C'],
  ['READ_DIP_SWITCHES()','dip_switches = (PINB & 0x78) << 1'],
  ['REFRESH_LEDS()','CHA_LED = audio1, CHB_LED = audio2'],
  ['CAN_FUNCTIONS()','PARAMETER_UPDATE(); re-enable CAN after errors; CANinit() if MOB_error; reboot → while(1) CLI()'],
  ['if (save_settings) …','SAVE_INFORMATION_EEPROM(); SAVE_CALIBRATION_EEPROM()']];
function viewSoft(m){
  window.__aa6201aKeys=false;
  m.innerHTML=`<div class="grid2"><div>${card('main() super-loop at the playhead', `<div id="loop"></div>`)}${card('AD_CONVERTER_AA6201A_SETUP state machine', `<div id="adsm"></div>`)}${card('Silence counting — what the pass time does to it', `<div id="silc"></div>`)}</div>
   <div>${card('Interrupts', `<table class="kv"><tr><th>timer0_ovf_isr</th><td>1 ms (TCNT0 = 0x83, clk/64). timer0_interrupt_occurred[0..1]++; once a second: can_data_rx &lt; 10 three times in a row → dashboard_initializing = NO.</td></tr><tr><th>timer1_ovf_isr</th><td>96 µs (reload 0xFFF4). With frame_count ≠ 0: next frame of a long reply. Otherwise tx_interrupt_counter++ and, past 1000 × slot (initialising) or 10 000 ticks, CAN_TX_TIMER(): RESTART trap once, then the cal traps, then one REPORT_PARAM.</td></tr><tr><th>can_rx_isr</th><td>CANRX → DASHBOARD_RESPONSE_SETUP builds the answer and CANTX sends its first frame inside the ISR. MOB_error is set at ISR entry and only cleared on a good reception, so the main loop calls CANinit() after any error.</td></tr></table>`)}
    ${card('PARAMETER_UPDATE priorities (every pass)', `<ol class="small"><li>audio1 changed → AUDIO1 (2.2), and signal_status_change = YES</li><li>mode changed → MODE (3.2), signal_status_change = YES</li><li>audio2 changed → AUDIO2 (2.3) — <b>without</b> setting signal_status_change</li><li>signal_status_change → SIGNAL_STATUS (2.1)</li><li>otherwise parameter_refresh++ (0…3) on every pass</li></ol><p class="small">CAN_TX_TIMER sends the chosen one at the next heartbeat. Because the round-robin advances each pass, the “routine” report is effectively random.</p>`)}
    ${card('OIDs (Dashboard.c, v5.01)', `<div id="oids"></div>`)}</div></div>
   <div class="grid2">${card('DIP decode (v100w.c, AA6201A.c)', `<table class="kv"><tr><th>SW</th><th>pin</th><th>bit</th><th>meaning</th></tr><tr><td>SW1</td><td>PB3</td><td>4</td><td>Mode MSB (ON adds 2)</td></tr><tr><td>SW2</td><td>PB4</td><td>5</td><td>Mode LSB (ON adds 1); 3 → clamped to MONO_CHA</td></tr><tr><td>SW3</td><td>PB5</td><td>6</td><td>OFF: dip_switch_enabled (mode from DIP) · ON: RESTORE_INFORMATION_EEPROM</td></tr><tr><td>SW4</td><td>PB6</td><td>7</td><td>OFF: dashboard_enabled · ON: DIP mode live, Mode SET refused, Menu3OID</td></tr></table>`)}
    ${card('EEPROM map (SAVE/RESTORE_*_EEPROM)', `<table class="kv"><tr><th>10</th><td>0xAA = valid</td></tr><tr><th>11</th><td>smpte_alarm_enabled (Notify)</td></tr><tr><th>12</th><td>mode</td></tr><tr><th>13</th><td>silence_detection_time_interval</td></tr><tr><th>14</th><td>silence_detection_threshold</td></tr><tr><th>15/16</th><td>calibration_left_upper/lower (lower 0xFF → treated as unset)</td></tr><tr><th>17/18</th><td>calibration_right_upper/lower</td></tr></table>`)}</div>
   <div class="grid2">${card('CAN message map handled by DASHBOARD_RESPONSE_SETUP', `<table class="kv small">${[[0x45,'15'],[0x46,'ParamOIDS_Message (15 OIDs)'],[0x47,'static tables or MESSAGE_CREATOR_PARAMETER_21/22/34/40/50'],[0x49,'value; unknown OID → CANRESP_PARAM_NOTFOUND (0x11)'],[0x4A,'4.0, 3.1, 3.3, 3.4, 5.0, 5.1 always; 3.2 only if dashboard_enabled; no range checks'],[0x50,'“Status” / “Control”'],[0x51,'2 / 1'],[0x52,'Card Info, Card Status, Card Settings'],[0x53,'Menu0OID (brand), Menu2OID, Menu1OID or Menu3OID'],[0x43,'reboot_device'],[0x40,'CAN_UPGRADE_WAIT 1000 ms, upgrade_device'],[0x44,'“cal” / “fin” (v5.01)'],[0x56,'“25030.1.1.4” (SNMP_ENABLED + WARD_BECK)'],[0x57,'13 OID strings'],[0x58,'2.1 → 0.3, 2.2 → 0.4, 2.3 → 0.5']].map(([t,d])=>`<tr><td class="mono">0x${hx(t)} ${MSG[t]}</td><td>${d}</td></tr>`).join('')}</table>`)}
    ${card('Versions in the archive', `<table class="kv small"><tr><th>V100 2008|41</th><td>Cobalt 9241 release</td></tr><tr><th>V200/V201 2009|42</th><td>components changed for resolution; thresholds −20/−30/−40</td></tr><tr><th>V202</th><td>Ross ADA-8404-C name</td></tr><tr><th>V203</th><td>bootloader capability</td></tr><tr><th>V204</th><td>“DataSafe”; boot waits 15 × wait(3000)</td></tr><tr><th>V500 2012|45</th><td>SNMP strings; boot rewritten with wait(63000) and init_delay = 10000 × slot; Software Rev “5.00”</td></tr><tr><th>v501</th><td>Calibration Left/Right OIDs 5.0/5.1, debug commands cal/fin, Name “… w/SNMP”</td></tr></table><p class="small muted">AA6201A SOFTWARE HISTORY.xls; diffs of the v204 / v500 / v501 trees.</p>`)}</div>`;
  const draw=()=>{
    const t=SIM.t, sn=snapAt(t), R=sim(), w=worldAt(t), f=R.end.f;
    const frac = sn.ph==='app'? ((t/w.passT)%1) : -1; const share=[.18,.34,.06,.08,.3,.04]; let acc=0, step=-1; if (frac>=0) for (let i=0;i<share.length;i++){ acc+=share[i]; if (frac<acc){ step=i; break; } }
    m.querySelector('#loop').innerHTML=`<svg viewBox="0 0 520 ${LOOP.length*46+30}" style="width:100%">${LOOP.map((l,i)=>`<rect x="10" y="${10+i*46}" width="500" height="38" rx="7" fill="var(--panel2)" stroke="${i===step?'var(--accent)':'var(--line)'}" stroke-width="${i===step?3:1}"/><text x="20" y="${26+i*46}" font-size="12" font-weight="700" fill="var(--ink)" font-family="monospace">${l[0]}</text><text x="20" y="${41+i*46}" font-size="10" fill="var(--ink2)">${l[1].slice(0,95)}</text>`).join('')}<text x="10" y="${LOOP.length*46+24}" font-size="11" fill="var(--ink2)">${sn.ph==='app'? 'pass #'+sn.ps.toLocaleString()+' (step split within a pass is '+'inferred)' : 'not running: '+(segAt(t)||{label:sn.ph}).label.slice(0,80)}</text></svg>`;
    const st=sn.ad; const node=(x,y,n,d)=>`<rect x="${x}" y="${y}" width="150" height="54" rx="10" fill="var(--panel2)" stroke="${st===n?'var(--accent)':'var(--line)'}" stroke-width="${st===n?3:1}"/><text x="${x+75}" y="${y+22}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${n}</text><text x="${x+75}" y="${y+40}" text-anchor="middle" font-size="9.5" fill="var(--ink2)">${d}</text>`;
    m.querySelector('#adsm').innerHTML=`<svg viewBox="0 0 520 170" style="width:100%"><defs><marker id="aaar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      ${node(10,20,'RESET','input ^= 1; ADMUX; ADCSRA |= BIT6')}${node(185,20,'READ','wait for BIT6 = 0 (104 µs)')}${node(360,20,'WAIT','ad_counter: 3000 → 0')}
      <path d="M160 47 H183" stroke="var(--ink2)" marker-end="url(#aaar2)"/><path d="M335 47 H358" stroke="var(--ink2)" marker-end="url(#aaar2)"/><path d="M435 76 V120 H85 V78" fill="none" stroke="var(--ink2)" marker-end="url(#aaar2)"/>
      <text x="20" y="140" font-size="10.5" fill="var(--ink)">at 0: CALIBRATION_TABLE → compare with silence_threshold → audio = YES, or add timer0 ticks</text>
      <text x="20" y="156" font-size="10.5" fill="var(--ink2)">now: ${st} · INPUT${sn.inp+1} · ad_counter ${sn.ctr} · first WAIT after boot uses the slot-ID reading (${f.slotAdc})</text></svg>`;
    const evalP=2*(C.AD_WAIT+3)*w.passT+2*C.CONV, ms=evalP*1000, add=Math.round(ms)%256, eff = f.sdti? (f.sdti*5)*(ms/Math.max(1,add)) : 0;
    m.querySelector('#silc').innerHTML=`<table class="kv"><tr><th>pass time</th><td class="mono">${(w.passT*1e6).toFixed(0)} µs ${inf}</td></tr><tr><th>one channel evaluated every</th><td class="mono">${ms.toFixed(1)} ms (2 × 3003 passes + 2 conversions)</td></tr><tr><th>ticks added per evaluation</th><td class="mono">${add}${ms>255?` (${Math.round(ms)} mod 256 — the unsigned char wrapped)`:''}</td></tr><tr><th>interval setting</th><td class="mono">${valTxt(0x0303,f.sdti)}</td></tr><tr><th>real time to declare silence</th><td class="mono">${f.sdti? (eff.toFixed(1)+' s'+(ms>255?' (stretched!)':'')) : 'first low reading'}</td></tr></table>
      <p class="small">While audio is present nobody clears timer0_interrupt_occurred[], so the first silent evaluation also adds whatever the counter wrapped to (0–255 ms early).</p>`;
    const c=cacheAt(t);
    m.querySelector('#oids').innerHTML=`<table class="kv small"><tr><th>OID</th><th>name</th><th>card now</th><th>DashBoard</th><th>SNMP</th></tr>${PARAM_OIDS.map(o=>{ const v=getValue(f,w,o); return `<tr><td class="mono">${oidTxt(o)}</td><td>${OID[o].name}</td><td class="mono">${typeof v==='string'?v:valTxt(o,v)}</td><td class="mono">${typeof c[o]==='string'?c[o]:valTxt(o,c[o])}</td><td class="mono">${SNMP_OID[o]||''}</td></tr>`; }).join('')}</table>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__aa6201aKeys=false;
    const F=[
    ['Every output is muted for the whole boot', 'v100w.c port_init() sets PORTE = 0xFF with DDRE = 0xFF, so U1_A/B/C and U5_A/C are all high and every 74HC4053 path goes to ground until the first PROCESS_MODES ≈1.4 s later (63 ms + 2 × 0.61 s slot ID + init_delay + 63 ms). A reboot from DashBoard drops audio for that long.'],
    ['The first CHA reading after boot is the slot-ID voltage', 'The slot-ID loop leaves ad_flag = WAIT, ad_counter = 1000 and ad_result = the averaged slot reading (928 for slot 4). The main loop’s first evaluation treats that as CHA level: audio1 = YES even with nothing connected. With an interval of 5–45 s “Audio Detected” then stands for that long (AA6201A.c, v100w.c).'],
    ['“Off” does not switch silence detection off', 'silence_detection_time_interval = 0 makes the limit 0 ticks, so the first reading under the threshold clears audio1/audio2 and the LEDs at once. Only Card Status is suppressed (silence_detection_time_interval != 0 in CAN_TX_TIMER and GET_PARAM). The calibration procedure relies on this instant reaction.'],
    ['Silence timer can stretch or start early', 'timer0_interrupt_occurred[] is an unsigned char that is only cleared when a channel is below the threshold. The first silent evaluation adds whatever it wrapped to (up to 255 ms early), and if one channel’s evaluation period (2 × 3000 passes) exceeds 255 ms, ticks are lost and the interval runs long. The pass time is not in the source; the Software tab shows the effect for each assumed value '+inf+'.'],
    ['Card Status differs between GET_PARAM and REPORT_PARAM', 'Dashboard.c: the polled answer (GET_PARAM 2.1) reports CHA-only or CHB-only silence only in MONO / MONO_CHA, while the heartbeat (CAN_TX_TIMER) also includes STEREO. In Stereo with one channel silent, “Refresh” shows Ok but the next routine report shows the alarm.'],
    ['Routine reports are a lottery', 'PARAMETER_UPDATE advances parameter_refresh on every main-loop pass when nothing changed, so the parameter in each ~0.96 s heartbeat depends on the pass count at that instant. audio2 changes also do not set signal_status_change, so a CHB-only silence reaches Card Status only by chance.'],
    ['COM ACTIVITY LED never lights', 'Every COM_ACTIVITY_LED_ON in CAN.c and Dashboard.c (v204, v500, v501) is commented out; DATA_INITIALIZATION turns it off. L3 and the card-edge “COM Activity LED” are dead hardware.'],
    ['MONO_CHB was removed, but its traces remain', 'PROCESS_MODES has the MONO_CHB branch commented out and clamps anything above MONO_CHA; the v501 Mode menu offers three choices. The REPORT/GET code still tests mode == MONO_CHB, and the MIB lists only three modes. By the resistor network that mode would have put CHB on the A outputs at −6 dB (only R18 20K into R1 10K) '+inf+'.'],
    ['Thresholds: menu vs code vs README', 'The code has CONSTANT_20dBu … CONSTANT_60dBu (−55 and −60 both = 3 counts), the dead static Parameter34_Message lists four choices, but MESSAGE_CREATOR_PARAMETER_34 builds only −20 / −30 / −40 (value[j*2]); the history sheet confirms “−20, −30 and −40 dBU” (V201). The archive README’s “−20 … −60 dBu” is the constant table, not the menu.'],
    ['No range checks on SET_PARAM', 'SET 3.4 = 7 selects CONSTANT_55dBu (3 counts) — silence is then practically never detected; values above 8 leave the old threshold in place. SET 3.2 = 3 or more is silently turned into MONO_CHA. SET 3.3 above 13 overflows the 16-bit tick limit.'],
    ['SW4 only locks the Mode', 'With SW4 ON (dashboard_enabled = NO) the Save entry disappears (Menu3OID) and SET 3.2 is echoed unchanged — but threshold, interval, Notify and Calibration are still accepted from DashBoard.'],
    ['“Save” does little with SW3 OFF', 'RESTORE_INFORMATION_EEPROM only runs when SW3 is ON. With the default SW3 OFF, only the calibration (RESTORE_CALIBRATION_EEPROM) survives a power cycle; interval, threshold and Notify come back as Off / −30 / Disabled. The MIB’s AA6201Save text warns about this.'],
    ['A calibration of −1 is forgotten', 'calibration −1 is stored as upper 0xFF, lower 0xFF; RESTORE_*_EEPROM treats a lower byte of 0xFF as erased and loads 0.'],
    ['Detector arithmetic does not match the constants', `By the ISS5 values (R47 1K27, R41 220K half-wave, R43/R49 divider, 3.3 V reference) −20 dBu at unity gain gives ≈ ${Math.round(0.3936*173.2*0.5*0.1096/Math.PI/3.3*1024)} counts, but CONSTANT_20dBu = 893 (about 7.7 dB more); the ±100-count calibration cannot bridge that. The V200 note “changed components for better resolution” and the ISS1 drawing (OPA2064 detectors, 2K trims) suggest the constants were measured on different hardware ${inf}. The simulator uses the firmware table.`],
    ['The re-tuned slot table disagrees with the frame’s ID resistors', `ADC.c ADDRESS_TABLE was edited for slots 10–20 (the original evenly spaced bounds are left as comments). With the resistors and the 1K / 3.3 V pull-up from OpenGear Frame Address ID.xls (whose own “Actual ADC” columns agree with the readings used here), the nominal readings decode as: ${[...Array(20)].map((_,i)=>i+1).filter(s=>ADDRESS_TABLE(slotAdc(s))!==s || slotMargin(s)<3).map(s=>`slot ${s} → ADC ${slotAdc(s)} → ${ADDRESS_TABLE(slotAdc(s))}${ADDRESS_TABLE(slotAdc(s))!==s?' (wrong)':' (margin '+slotMargin(s)+')'}`).join('; ')}. A card in slot 13 would answer as slot 14 — invisible to DashBoard and clashing with the real slot-14 card. The DFR-8310A column of the sheet has only slots 1–10, where the table is fine; the problem is in the 20-slot MF6220 range ${inf}.`],
    ['The cal traps eat a pending report', 'After “cal”/“fin” the next two heartbeats send TRAP [02 05 0x 02]; the code after the branch still sets parameter_tx_complete = YES and parameter_change = NO, so a status change that was waiting is never reported.'],
    ['Template leftovers', 'cs84xx.c, altera.c and D6201A.* (CS8416 and FPGA drivers from the D6201A digital DA, dated 2007) still sit in the v501 folder although V100W.SRC / V100W.mak only build v100w, AA6201A, ADC, CAN, common, Dashboard, eeprom and product; net names on P1 are BNC1/BNC2 and AES1–AES8 although the card is analog; Parameter22/23 are commented “AES1 INPUT”; Parameter35 “Tone Generator” and Parameter36 “AD Result” are still defined but unreachable; the prototype OID sheet in the history .xls lists “AES Input” and “EQ”. AA6201A.h says BOARD_ISSUE 3 on an ISS5 board.'],
    ['Website and SNMP name leak across brands', 'OID 1.4 (www.ward-beck.com) is in ParamOIDS_Message for every brand (only the Ward-Beck Menu0 shows it). The SNMP build’s Name says “… w/SNMP”. With SNMP_ENABLED and ROSS_VIDEO/COBALT defined, MESSAGE_CREATOR_GET_SNMP_BASE_RESPONSE has no string, so those builds would not compile — which enforces the history note “DON’T USE FOR ROSS OR COBALT” '+inf+'.'],
    ['Any brand image fits any brand card', 'All four v501 *_ztcpack.txt files list /p AA6201A /P ADA-8404-C /P 9241, so a Ross card will accept the Ward-Beck SNMP .bin and re-brand itself in DashBoard '+inf+'.'],
    ['Drawing and documentation slips', 'AA6201-REAR-MODULES.pdf labels T6303 position 8 “OUT1-3” (it is OUT2-3 on AES7, T6303-iss3.net). T6406 uses the same 887R ID as T6403. AA6201A-TOP-ASSY.pdf is ISS1 (2007|40: 2K trims, OPA2064 detectors, NE5532 output) while the BOM/netlist are ISS5 (5K multi-turn, OP275). The MIB says LAST-UPDATED 2007 although SNMP arrived in 2012|45.'],
    ['Artwork 2026|59: card edge and rear modules now from CorelDRAW', 'Card edge from '+SIM.src(ART_SRC+'AA6201A-card-edge.cdr','AA6201A-card-edge.cdr')+' (2007-12-19); T6303, T6403 and T6406 from '+SIM.src(ART_SRC+'AA6201-REAR-MODULES.cdr','AA6201-REAR-MODULES.cdr')+' (2008-08-07); T6203 from '+SIM.src(ART_SRC+'AA6201A-T6203.cdr','AA6201A-T6203.cdr')+' (2008-09-24). The separate AA6201A-T6303.cdr (2008-01-17), AA6201-T6403.cdr and AA6201-T6406.cdr (2008-06-10) are earlier single-module sheets of the same plates. The CorelDRAW sheet repeats the “OUT1-3” slip at T6303 position 8 (so the PDF inherited it), and the T6406 side labels mix “IN1#1” / “OUT1-2#2” with “IN2 #1” / “OUT1-1 #2” (spacing typed by hand). The card-edge drawing has exactly three LED windows and two trimmer screws, matching the model. Text in these files is live Arial: libcdr kept the words but not the alignment, so the stacked “G – +” pin legends beside the terminal blocks sit slightly off.'],
    ['Thermal limit', 'Fanless.xls: 240 mA at +4 dBu with one channel, 780 mA (9.4 W) at +27 dBu with both; “each slot can not consume more than 2 W” without airflow, so a still-air frame holds about ten AA6201As with a space between them; 16 cards at +18 dBu exceeded 60 °C.'],
    ['Test report', 'AA6201A-V501-24APR12.pdf (scanned checklist, 5 h): “the DC offset calibration software with or without SNMP are included in this version to simplify the programming steps”. Analog checks ticked: waveform, THD, frequency response, amplitude, noise, mapping; alarm on/off; DataSafe; DIP switch.'],
  ];
  m.innerHTML=card('Findings — what the AA6201A firmware and hardware are really doing', `<ol>${F.map(([h,d])=>`<li style="margin-bottom:8px"><b>${h}.</b> ${d}</li>`).join('')}</ol>`)+
   card('Sources', `<ul class="small"><li>#OPENGEAR #SERIES/AA6201A - #Master #OPENGEAR/AA6201A - #Engineering/AA6201A - #SOFTWARE/AA6201A - #SOFTWARE #atmel/AA6201A - #SOFTWARE #atmelv501/ (v100w.c, AA6201A.c/.h, ADC.c/.h, CAN.c/.h, Dashboard.c/.h, common.c/.h, CANmsg.h, paramdef.h, OpenGear.h, Ross Video/eeprom.c, *_ztcpack.txt) · …#atmel v204/ · …#atmelv500/</li>
     <li>…/AA6201A - #SOFTWARE/AA6201A SOFTWARE HISTORY.xls · …/AA6201A - SNMP #Software/AA6201A - #SOFTWARE v500/AA6201-CARD.mib, WARD-BECK*.mib</li>
     <li>…/AA6201A - #PCB/AA6201Aiss5.net, .bom, .pnp · GERBERS/AA6201AISS5.TOP, .TSM, .TSS → assets/aa6201a-card-copper.png, aa6201a-card-silk.png (third-party logo blanked)</li>
     <li>Panel art: ${SIM.src(ART_SRC+'AA6201A-card-edge.cdr','AA6201A-card-edge.cdr')} → assets/aa6201a-edge.svg · ${SIM.src(ART_SRC+'AA6201-REAR-MODULES.cdr','AA6201-REAR-MODULES.cdr')} → assets/aa6201a-rear-T6303/T6403/T6406.svg · ${SIM.src(ART_SRC+'AA6201A-T6203.cdr','AA6201A-T6203.cdr')} → assets/aa6201a-rear-T6203.svg</li>
     <li>…/AA6201A - #FUNCTIONAL/AA6201-REAR-MODULES.pdf, AA6201A-T6203.pdf, AA6201A-TOP-ASSY.pdf, DIP Switch.cdr, AA6201A-card-edge.cdr</li>
     <li>…/AA6201A - #SOFTWARE AA6201A V5.1 programming instruction.docx, …(obsolete).docx · Fanless.xls · ../AA6201A - #TESTREPORT/AA6201A-V501-24APR12.pdf</li>
     <li>T6303 - …/iss3/T6303-iss3.net · T6403 - …/T6403-iss2.net · T6406 - …/T6406-iss1.net · t6203.js · opengear.js (slot-ID resistors)</li>
     <li>Plastic extension shafts: AA6201A Plastic extension shaft #Mechanical/MF6220-1M28, 1M29, 1M33 (.dwg/.edrw; drawn here only as the rod positions)</li></ul>`);
}

/* ---------------- register ---------------- */
resetAll();
SIM.register({
  id:'aa6201a', name:'AA6201A · openGear analog audio DA with silence detection (2008|41)', duration:1,
  product:'AA6201A (Cobalt 9241 / Ross ADA-8404-C)', year:2008, family:'openGear',
  folder:'#OPENGEAR #SERIES/AA6201A - #Master #OPENGEAR',
  summary:'A two-input, eight-output openGear analog audio DA whose AT90CAN128 only sets the routing (Stereo, Mono Mix, Mono DA) through two 74HC4053s and watches two rectified detector voltages to report silence. The v5.01 firmware is modelled pass by pass: ADC state machine, silence timers, DashBoard over CAN, the “cal”/“fin” calibration and the SNMP strings, on the real ISS5 gerber artwork.',
  highlights:['Card drawn from the ISS5 gerbers with live LEDs, DIP switch and LEVEL trims','Slot-ID table misreads slots 13, 14 and 19 of a 20-slot frame','Silence detection traced through AD_CONVERTER_AA6201A_SETUP and timer0 ticks','DashBoard-style window with debug console, calibration sliders and SNMP view','V5.1 factory calibration procedure as a step-by-step tutorial','Findings: muted boot, first reading is the slot ID, “Off” is not off, report lottery'],
  depth:'Full model',
  stepUnits:[
    {label:'1 main-loop pass', period:()=>worldAt(SIM.t).passT},
    {label:'1 timer1 tick (96 µs)', period:()=>C.T1_TICK},
    {label:'1 ADC conversion (104 µs)', period:()=>C.CONV},
    {label:'1 ms (timer0)', period:()=>C.T0},
    {label:'10 ms (detector τ)', period:()=>0.01},
    {label:'one evaluation period', period:()=>2*(C.AD_WAIT+3)*worldAt(SIM.t).passT+2*C.CONV},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.2,'200 ms (≈ one evaluation per channel)'],[0.05,'50 ms'],[0.01,'10 ms (detector τ)'],[0.002,'2 ms'],[0.0005,'500 µs (conversion + ticks)'],[0.0001,'100 µs (a few passes)']],
  defaultZoom:0,
  init(){ D.ver++; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: install and calibrate', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
