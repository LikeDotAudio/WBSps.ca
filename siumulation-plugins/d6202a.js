/* =====================================================================
   D6202A — openGear 1×8 110 Ω balanced AES distribution amplifier (2008|41, firmware V104 2009|42)
   OEM: Ross ADA-8401-B / Cobalt 9252.  Plugin for the WBS Device Simulator (../siumulation.html)

   Sources (all under #OPENGEAR #SERIES/D6202A - #Master #OPENGEAR/D6202A - #Engineering/ unless noted):
   - Software/atmel/v104/  v100w.c (main, REFRESH_LEDS, boot waits), D6202B.c/.h (the file the makefile links:
       PROCESS_MODES, EQ push-button debounce, ALTERA_write, port/LED map, BOARD_ISSUE 3, SOFTWARE_VERSION 4),
       cs84xx.c (init_CS8416 register values, CS8416_READ_LOCK_ALL), altera.c/.h, ADC.c (ADDRESS_TABLE),
       common.c/.h (wait(), #define COBALT), common.lis (wait loop = 7 cycles), CAN.c (timer0/timer1 ISRs,
       CAN_FUNCTIONS, CANinit bit timing), Dashboard.c (every descriptor, PARAMETER_UPDATE, CAN_TX_TIMER,
       DASHBOARD_RESPONSE_SETUP, SAVE/RESTORE_INFORMATION_EEPROM, MESSAGE_CREATOR_PARAMETER_21/22/40),
       V100W.mak (links D6202B.o, runs cobalt zeuspack), V100W.mp (code size), *_ztcpack.txt
   - Software/atmel/D6202A SOFTWARE HISTORY.xls (V100…V104, FPGA = D6201B project)
   - Software/lattice/  d6202a_top.vhd + d6202a.lpf + d6202a.jed (2007-08-30), v100/ (2008-01-31 clock probe)
   - PCB/OBSOLETE/ISS3/D6202A-iss3.net + .bom (header "D6201B"); OBSOLETE/D6202A-iss2.bom/.net/.pnp;
       OBSOLETE/D6202A dsbxp.net/.bom (LFXP3KC-T100); PCB/D6202A-ISS4.txt; PCB/GERBERS/D6202A-ISS4.TOP/.TSM/.TSS/.OTL
       → assets/d6202a-copper.png, d6202a-silk.png (120 dpi, rendered with gerbonara; openGear logotype blanked)
   - D6202A #Gerber #PNP/D6202A - #PNP #2016/*.prg (which parts are fitted on a D6202A vs a D6202B)
   - Functional/Functional.cdr, D6202A-card-edge.cdr, Rear Modules.cdr, D6202A-T6203/T6204/T6303/T6403.cdr
       (converted with Inkscape), Photo/D6202A/D6202A iss2.jpg, D6202A Iss3.jpg
   - ../D6201  # Problem…/D6201 - #Engineering/D6201B/Software/altera/v101/D6201A.qsf, D6201A.bdf,
       shift_in16_version_out.vhd, i2s8416_aes.vhd, tone_gen1.vhd (the FPGA image the history sheet names)
   - siumulation-plugins/opengear.js (frame, slot ID, CAN framing), t6203.js / t6204.js (rear-module ID read)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const hx = (n,w) => (n>>>0).toString(16).toUpperCase().padStart(w||2,'0');
const KEYFLAG = '__d6202aActive';

/* ---------------- constants from the source ---------------- */
const W3000 = 3000*7/8e6;      // common.lis: wait() loop = wdr, subi, sbci, cpi, cpc, brne = 7 cycles at 8 MHz → 2.625 ms
const C = {
  LOOP_T: 160e-6,             // one main-loop pass — inferred (CS8416 read + reg 0x04 write + 16-bit FPGA word, bit-banged)
  T0: 1e-3,                   // timer0: clk/64, TCNT0 = 0x83 → 125 counts = 1 ms ("100us" in the comment)
  T1_FIRST: 12000/125000,     // timer1 after CANinit: TCNT1 = 0xD120 → 96 ms
  T1_TICK: 12/125000,         // reload 0xFFF4 → 96 µs
  TX_HEART: 10000, TX_FRAMES: 10, DINIT_RX: 10, DINIT_QUIET: 3,
  WDT: 0.016,                 // WDTCR = 0x08 → 16K WDT cycles ≈ 16 ms (data sheet) — inferred
  CAN_BIT: 1e-6, STUFF: 1.1,  // CANBT1/2/3 = 0x00/0x04/0x12 → 1 Mbit/s; stuffing +10 % inferred
  CS_LOCK: 0.020,             // CS8416 PLL lock time — inferred
  DEBOUNCE: 255,              // EQ_PUSHBUTTON_DEBOUNCE passes after release
  EE_WRITE: 0.0085,           // AVR EEPROM byte write — inferred
  MFC_GAP: 0.0004,            // frame-controller pacing — inferred
  FPGA_CFG: 0.040,            // EP1C3 Active Serial configuration from the EPCS after nCONFIG — inferred
  HEART_FIRST: 0.31,          // phase of the heartbeat in a steady second — inferred
  T0_SEC_PHASE: 0.27,         // phase of timer0's 1 s window — inferred
};
const BOOT = [
  [15*W3000, 'initialization() · DATA_INITIALIZATION() · CAN_RX (PD7 → LBK: transceiver in loop-back) · 15 × wait(3000)'],
  [100*(2*W3000+104e-6), 'slot ID: 100 × AD_CONVERTER_SETUP() (2 × wait(3000) + 104 µs conversion per sample) → average → ADDRESS_TABLE()'],
  [10*W3000+0.0009, '5 × wait(3000) · ALTERA_RESET(1000): PC0 → Q3 → nCONFIG (FPGA reloads from the EPCS) · 5 × wait(3000)'],
  [5*W3000+0.0003, 'init_CS8416(): RS1 low, 5 × wait(3000), RS1 high, registers 0x00–0x06'],
  [25*W3000, 'READ_DIP_SWITCHES() (never used) · dip_switch_enabled = NO · dashboard_enabled = YES · 25 × wait(3000)'],
  [0.003, 'moduleAddress() · DATA_SETUP() (CRC of every descriptor) · CANinit() · CAN_TX · ALTERA_write()'],
];
const BOOT_T = BOOT.reduce((a,b)=>a+b[0],0);
const SLOT_R = [100000,30900,15000,9760,6980,5360,4320,3570,3010,2550,2210,1910,1650,1470,1270,1130,1000,887,787,681];
const SR = [32000,44100,48000,96000,192000];
const MSG = {0x10:'REPORT_PARAM',0x11:'TRAP',0x13:'BOOTING',0x40:'START_UPGRADE',0x41:'UPGRADE_PAGE',0x42:'VERIFY_UPGRADE',0x43:'REBOOT',0x45:'GET_NUMPARAMS',0x46:'GET_PARAM_OIDS',0x47:'GET_DESCRIPTOR',0x49:'GET_PARAM',0x4A:'SET_PARAM',0x50:'GET_MENUSET_NAME',0x51:'GET_MENU_COUNT',0x52:'GET_MENU_NAME',0x53:'GET_MENU_OIDS',0x54:'GET_PRODUCT_INFO',0x56:'GET_SNMP_BASE'};
const msgName = t => (t&0x80)? (MSG[t&0x7F]||'0x'+hx(t&0x7F))+' resp' : (MSG[t]||'0x'+hx(t));
const oidTxt = o => ((o>>8)&0xFF)+'.'+(o&0xFF);

/* Brand: common.h in v104 says #define COBALT (WARD_BECK and ROSS_VIDEO commented out) */
const BRANDS = {
  COBALT:    {def:'COBALT', product:'9252', supplier:'Cobalt Digital', menu0:[0x0105,0x0107,0x0102,0x010B], bin:'9252_v1_04.bin', cfg:'cobalt_ztcpack.txt', pn:9, sn:19},
  WARD_BECK: {def:'WARD_BECK', product:'D6202A', supplier:'Ward-Beck Systems', menu0:[0x0105,0x0107,0x0102,0x010B,0x0104], bin:'D6202a_v1_04.bin', cfg:'wbs_ztcpack.txt', pn:11, sn:22},
  ROSS_VIDEO:{def:'ROSS_VIDEO', product:'ADA-8401-B', supplier:'Ross Video Ltd', menu0:[0x0105,0x0107,0x0102,0x010B], bin:'ada-8401-b_v1_04.bin', cfg:'ross_ztcpack.txt', pn:15, sn:19},
};
const CARD_NAME = 'Balanced AES Audio Distribution Amplifier';   // ParamName_Message
const WEBSITE = 'www.ward-beck.com';
const OID = {
  0x0105:{name:'Product', d:'ParameterProduct_Message', dl:21},
  0x0102:{name:'Supplier', d:'ParameterManu_Message', dl:25},
  0x0107:{name:'Name', d:'ParameterName_Message', dl:18},
  0x010B:{name:'Software Rev', d:'ParameterSoftware_Message', dl:26},
  0x0104:{name:'Website', d:'ParameterWebsite_Message', dl:21},
  0x0201:{name:'Card Status', d:'MESSAGE_CREATOR_PARAMETER_21 (ALARM_TABLE: OK / No AES Audio Lock)', dl:53, alarm:['OK','No AES Audio Lock']},
  0x0202:{name:'AES Input', d:'MESSAGE_CREATOR_PARAMETER_22 (ALARM_TABLE: Locked / Unlocked / Unlocked)', dl:58, alarm:['Locked','Unlocked','Unlocked']},
  0x0203:{name:'(AES Input 2)', d:'only with AES2_AVAILABLE → CANRESP_UNSUPPORTED', missing:true},
  0x0301:{name:'Settings', d:'Parameter31_Message (BUTTON_PROMPT “Save”)', dl:27},
  0x0302:{name:'Equalizer', d:'Parameter32_Message (RADIO_HORIZONTAL Enabled / Disabled)', dl:47, ch:[[1,'Enabled'],[0,'Disabled']]},
  0x0303:{name:'(EQ 2)', d:'only with AES2_AVAILABLE → CANRESP_UNSUPPORTED', missing:true},
  0x0305:{name:'Tone Generator', d:'Parameter35_Message (COMBO Disabled / Enabled)', dl:52, ch:[[0,'Disabled'],[1,'Enabled']]},
  0x0306:{name:'AD Result', d:'Parameter36_Message (RANGE 0…1023, ACCESS_READWRITE)', dl:29},
  0x0400:{name:'Notify on Card Fault', d:'MESSAGE_CREATOR_PARAMETER_40 (RADIO Enabled / Disabled)', dl:58, ch:[[1,'Enabled'],[0,'Disabled']]},
};
const PARAM_OIDS = [0x0201,0x0202,0x0302,0x0105,0x0102,0x010B,0x0107,0x0301,0x0400,0x0104,0x0306,0x0203,0x0303,0x0305]; // count byte = 11
const MENU_STATUS = [0x0201,0x0202];                 // Menu2OID_Message (menu 0.1, count 2)
const MENU_SET = [0x0400,0x0302,0x0305,0x0306];     // Menu1OID_Message (menu 1.0, count byte 3, four OIDs)
const PR_NAMES = {0:'AES1_LOCK (2.2)',1:'EQ1_ENABLE (3.2)',2:'SIGNAL_STATUS (2.1)',5:'TONE_GENERATION (3.5)'};

/* ---------------- FPGA variants (the switch) ---------------- */
const FPGAS = {
  EP1C3: {name:'Altera Cyclone EP1C3T100 · D6201B V100 image', short:'EP1C3', mute:true, cuv:'pass', outs:4, run:true,
    src:'D6201A.qsf/.bdf (D6201B project, Quartus 5.1 → 9.0 SP1); ISS2/ISS3/ISS4 BOMs and photos'},
  XP3_AES:{name:'Lattice LFXP3C-5 · d6202a.jed (2007-08-30, I2SX4_AES)', short:'LFXP3 I2SX4', mute:false, cuv:'zero', outs:4, run:true,
    src:'lattice/d6202a_top.vhd + d6202a.lpf; LFXP3KC-T100 only on the dsbxp layout'},
  XP3_PROBE:{name:'Lattice LFXP3C-5 · v100/d6202a.jed (2008-01-31, clock probe)', short:'LFXP3 probe', mute:false, cuv:'none', outs:0, run:false,
    src:'lattice/v100/d6202a_top.vhd: out_clk <= U5_MCLK AND U5_LRCLK AND U5_SCLK'},
};

/* ---------------- rear modules (Functional/*.cdr, Rear Modules.cdr, netlists via t6203.js / t6204.js / opengear.js) ---------------- */
const AESPIN = {1:'67/69',2:'61/63',3:'55/57',4:'49/51',5:'68/70',6:'62/64',7:'56/58',8:'50/52'};
const DRVOF = n => (n<=4? 'U13' : 'U12')+' DS34LV87T → T'+n;
const OUTOF = n => Math.ceil(n/2);                      // AES1/2 ← OUT1 (pin 75), AES3/4 ← OUT2 (74), AES5/6 ← OUT3 (69), AES7/8 ← OUT4 (68)
const OUTPIN = [0,75,74,69,68];
const STD10 = [[1,'IN1','in'],[2,'N/C','nc'],[3,'AES1','o1'],[4,'AES5','o5'],[5,'AES2','o2'],[6,'AES6','o6'],[7,'AES3','o3'],[8,'AES7','o7'],[9,'AES4','o4'],[10,'AES8','o8']];
const REARS = {
  T6303:{name:'T6303 — single slot, 10 terminal blocks (DFR-8320)', dual:false, bnc:[], id:[3570,3570], src:'D6202A-T6303-iss2.cdr · Rear Modules.cdr (T6303A)', pos:STD10},
  T6203:{name:'T6203 — 10 terminal blocks, first generation (DFR-8310)', dual:false, bnc:[], id:[3570,9760], src:'D6202A-T6203.cdr · T6203-iss2.net (t6203.js)', pos:STD10},
  T6204:{name:'T6204 — 2 BNC + 8 terminal blocks (MF6220)', dual:false, bnc:[1,2], id:[3570,Infinity], src:'D6202A-T6204.cdr (“DUAL 110Ω AES DA”) · T6204.net ISS1 (t6204.js)',
    pos:[[1,'IN1','in'],[2,'IN2','nc'],[3,'AES1','o1'],[4,'AES5','o5'],[5,'AES2','o2'],[6,'AES6','o6'],[7,'AES3','o3'],[8,'AES7','o7'],[9,'AES4','o4'],[10,'AES8','o8']]},
  T6403:{name:'T6403 — dual slot, 10 terminal blocks, two cards (MF6220)', dual:true, bnc:[], id:[3570,887], src:'D6202A-T6403-iss2.cdr · Rear Modules.cdr (T6403A) · T6403-iss2.net',
    pos:[[1,'IN2','in',2],[2,'IN1','in',1],[3,'AES1-2','o1',2],[4,'AES1-1','o1',1],[5,'AES2-2','o2',2],[6,'AES2-1','o2',1],[7,'AES3-2','o3',2],[8,'AES3-1','o3',1],[9,'AES4-2','o4',2],[10,'AES4-1','o4',1]]},
};
function rearOutputs(w){ const RM=REARS[w.rear]; const s=new Set(); RM.pos.forEach(p=>{ if (p[2][0]==='o' && (!RM.dual || p[3]===w.pos)) s.add(+p[2].slice(1)); }); return s; }
function inputPos(w){ const RM=REARS[w.rear]; return RM.pos.find(p=>p[2]==='in' && (!RM.dual || p[3]===w.pos)); }
function inputIsBnc(w){ const p=inputPos(w); return p && REARS[w.rear].bnc.includes(p[0]); }
/* zeuslib-style ID read (t6203.js): ratiometric ADC with 1K pull-up, 32 bins */
function adcOf(R){ return R===Infinity? 1023 : Math.min(1023, Math.floor(1024*R/(R+1000))); }
function binOf(a){ return 32 - Math.floor((a+16)/32); }
function rTxt(r){ if (r===Infinity) return 'open'; return r>=1000? String(r/1000).replace('.','K')+(String(r/1000).includes('.')?'':'K') : r+'R'; }

/* ---------------- slot ID (ADC.c ADDRESS_TABLE) ---------------- */
function slotAdc(slot){ const R=SLOT_R[slot-1]; return Math.min(1023, Math.round(1024*R/(R+1000))); }
function ADDRESS_TABLE(v){ const th=[1011,980,948,915,883,851,820,788,755,725,692,658,629,593,563,532,502,471,435,406];
  if (v>1011 && v<=1023) return 1; for (let i=1;i<th.length;i++) if (v>th[i] && v<=th[i-1]) return i+1; return 21; }

/* ---------------- analog input model (netlist values; cable and threshold numbers inferred) ---------------- */
function rxPath(w, eqOn){
  const p=inputPos(w), bnc=inputIsBnc(w);
  const o={ok:false, why:'', vterm:0, loss:0, eye:0, frac:0, gamma:0, zs: bnc?75:110, conn: bnc?'BNC (75 Ω coax, AES-3id)':'terminal block (110 Ω pair, AES3)'};
  if (!w.card){ o.why='card removed'; return o; }
  if (!p){ o.why='rear module has no input for this card'; return o; }
  if (!w.src.on){ o.why='no cable on '+p[1]; return o; }
  const Vn = bnc? 1.0 : 4.0;                                   // nominal p-p into a matched load — inferred
  const Rt = w.H1;                                             // H1: R8 75R or R9 110 across T1A's secondary
  o.vterm = 2*Vn*Rt/(o.zs+Rt); o.gamma = (Rt-o.zs)/(Rt+o.zs);
  const k = bnc? 0.02 : 0.07;                                  // dB per metre at the 48 kHz bit rate — inferred
  o.loss = w.src.len * k * Math.sqrt(w.src.fs/48000);
  const boost = eqOn? 10 : 0;                                  // U1B HF lift (R6 365 + C4 1 nF ≈ 436 kHz corner) — inferred size
  const res = o.loss - boost;
  o.frac = Math.max(0, 1 - (res>=0? res/16 : -res/22)) * (1 - Math.abs(o.gamma)*0.5);
  o.eye = o.vterm * Math.pow(10, -Math.max(0,res)/20) * o.frac;   // U1A gain 2 then 75R/75R divider → ×1 at RXP0/RXP1
  o.ok = o.eye >= 0.2 && o.frac >= 0.15;                     // CS8416 needs ≈200 mV — inferred
  o.why = o.ok? 'eye open' : (o.frac<0.15? 'eye closed by cable loss (ISI)' : 'too small for the CS8416');
  return o;
}

/* ---------------- world + firmware ---------------- */
function mkWorld(){ return { slot:6, rear:'T6303', pos:1, card:true, mfc:true, brand:'COBALT', ver:'1.04', fpga:'EP1C3',
  src:{on:true, fs:48000, len:40, dbfs:-20, f:1000}, H1:110, dip:[false,false,false,false,false,false,false,false],
  load:[true,true,true,true,true,true,true,true], pb:false }; }
function mkFw(w){ return {
  mode:'app', modeEnd:Infinity, bootIx:-1, timersOn:true,
  cs:{locked:1, at:Infinity, run:true}, A:1, lock:1, plock:1, reg4:0x80, eq:0, peq:0, tone:0, ptone:0, notify:0, sigc:0,
  pr:0, pc:0, ptc:1, restart_sent:1, restore_start:0, dinit:0, quiet:3, rxCount:0, save:0, reboot:0, upgrade:0, mob_error:0,
  pb:0, pbRel:0, pbCnt:0, word:0x000C, com:0, comOff:0,
  ee:{aa:0, tone:0xFF, bootc:0xFF}, adc:0, mod:0,
  t1c: C.TX_HEART+1-Math.round(C.HEART_FIRST/C.T1_TICK), t0c: 1000-Math.round(C.T0_SEC_PHASE/C.T0),
  nextPass:0.00002, nextT1:0.00004, nextT0:0.0005,
  busyUntil:0, job:null, mfcQ:[], mfcWait:false, mfcNext:Infinity, upgrade_ok:null, cache:null,
}; }
const D = { w:mkWorld(), s0:null, ev:[], second:1, log:[], ver:0, R:null, Rver:-1,
  ui:{ dashTab:'status', upl:null, follow:true, sheet:0, block:'fpga', lesson:0 } };
function deep(o){ return JSON.parse(JSON.stringify(o,(k,v)=>v===Infinity?'__inf':v),(k,v)=>v==='__inf'?Infinity:v); }
function resetAll(){
  D.w=mkWorld(); const f=mkFw(D.w); f.adc=slotAdc(D.w.slot); f.mod=0x10+ADDRESS_TABLE(f.adc);
  D.s0={w:deep(D.w), f}; f.cache=cacheFrom(f,D.w); D.ev=[]; D.second=1; D.log=[]; D.ver++; D.ui.upl=null;
}

/* ---------------- what each OID reads ---------------- */
function oidValue(f,w,o){ const B=BRANDS[w.brand];
  switch(o){
    case 0x0201: return f.lock? 1 : 4;                       // GET_PARAM 2.1: BIT0 locked / BIT2 unlocked (ignores Notify)
    case 0x0202: return f.lock? 1 : (f.notify? 4 : 2);       // BIT0 / BIT2 (notify) / BIT1
    case 0x0302: return f.eq; case 0x0305: return f.tone; case 0x0306: return f.adc; case 0x0400: return f.notify; case 0x0301: return 0;
    case 0x0105: return B.product; case 0x0102: return B.supplier; case 0x0107: return CARD_NAME; case 0x010B: return w.ver; case 0x0104: return WEBSITE;
  } return null; }
function reportValue(f,o){ if (o===0x0201) return (!f.lock && f.notify)? 2 : 0; return oidValue(f,null,o); }   // CAN_TX_TIMER's SIGNAL_STATUS
function cacheFrom(f,w){ const c={}; [0x0105,0x0102,0x0107,0x010B,0x0104,0x0201,0x0202,0x0302,0x0305,0x0306,0x0400].forEach(o=>c[o]=oidValue(f,w,o)); return c; }
/* ALARM_TABLE decode: entry k lit when bit k is set — the rule is inferred (Ross descriptor format not archived) */
function alarmTxt(o,v){ const t=OID[o].alarm; const lit=t.map((s,k)=>(v>>k)&1? s : null).filter(Boolean); const extra=v>>t.length;
  return (lit.length? lit.join(' + ') : '(no entry lit)')+(extra? ' + bit '+(t.length+Math.log2(extra&-extra))+' (no entry)':''); }
function valTxt(o,v){ if (v===null||v===undefined) return '—'; if (OID[o]&&OID[o].alarm) return alarmTxt(o,v)+' ['+v+']';
  if (OID[o]&&OID[o].ch){ const c=OID[o].ch.find(x=>x[0]===v); return c? c[1] : String(v); } return String(v); }

/* ---------------- CAN helpers ---------------- */
function frameTime(n){ return (67+8*n)*C.CAN_BIT*C.STUFF; }
function canId(src,dst,type,flags){ return ((src&0x3F)<<19)|((dst&0x3F)<<13)|((type&0xFF)<<5)|(flags&0x1F); }
function multiFrames(len){ const n=Math.floor((len+4)/8); const fr=[]; for (let i=0;i<n;i++) fr.push({len:8,flags:i?0:2}); fr.push({len:len-(n*8-4),flags:1}); return fr; }
function strLen(s){ return 4+s.length+1; }

/* =====================================================================
   SIMULATION — main() passes, timer0/timer1/CAN interrupts, CS8416 lock, frame controller; one second
   ===================================================================== */
function simulate(){
  const S=deep(D.s0), w=S.w, f=S.f; const ev=D.ev.slice().sort((a,b)=>a.t-b.t);
  const R={snaps:[], can:[], segs:[], notes:[], worlds:[{t:0,w:deep(w)}], cache0:deep(f.cache), cacheEv:[], passes:0, pb:[], end:null};
  let ei=0, t=0;
  const FP=()=>FPGAS[w.fpga];
  const snap=(tt)=>{ const o={t:tt, mode:f.mode, A:f.A, lock:f.lock, eq:f.eq, reg4:f.reg4, word:f.word, com:f.com, pr:f.pr, pc:f.pc, dinit:f.dinit, notify:f.notify, tone:f.tone,
      outOn: outActive(), csAt:f.cs.at, pb:f.pb, pbRel:f.pbRel, pbCnt:f.pbCnt };
    const l=R.snaps[R.snaps.length-1]; if (l && l.t===tt) R.snaps[R.snaps.length-1]=o; else R.snaps.push(o); };
  const note=(tt,s)=>R.notes.push({t:tt,s});
  const seg=(t0,t1,kind,label)=>R.segs.push({t0,t1,kind,label});
  function outActive(){ const F=FP(); if (!w.card || f.mode!=='app' && f.mode!=='wdt') return false; if (!F.run) return false; if (F.mute) return !!f.lock; return f.cs.run; }
  /* CAN */
  function txFrame(tt,type,flags,data,desc,oid,val){ const st=Math.max(tt,f.busyUntil), d=frameTime(data.length); f.busyUntil=st+d;
    const fr={t:st,dur:d,dir:'tx',src:f.mod,dst:0x10,type,flags,data,desc,oid,val}; R.can.push(fr); f.com=1; f.comOff=st+d+0.001; return fr; }
  function rxFrame(tt,req){ const data=[0,req.b1||0,req.b2||0]; if (req.type===0x4A) data.push(2,0,req.val&0xFF);
    const st=Math.max(tt,f.busyUntil), d=frameTime(data.length); f.busyUntil=st+d; R.can.push({t:st,dur:d,dir:'rx',src:0x10,dst:f.mod,type:req.type,flags:3,data,desc:req.desc||msgName(req.type),oid:req.oid}); f.rxCount++; return st+d; }
  function cacheSet(tt,o,v){ R.cacheEv.push({t:tt,oid:o,v}); }
  function respond(tt,req){
    const o=req.oid||0, b1=(o>>8)&0xFF, b2=o&0xFF, rt=req.type|0x80, B=BRANDS[w.brand];
    const single=(data,desc,oid,val)=>{ f.job=null; return txFrame(tt,rt,3,data,desc,oid,val); };
    const unsup=why=>single([1],'CANRESP_UNSUPPORTED'+(why?' — '+why:''));
    const multi=(len,name)=>{ const fr=multiFrames(len); f.job={type:rt,frames:fr,i:1,name}; const x=txFrame(tt,rt,fr[0].flags,new Array(fr[0].len).fill(0),name+' frame 1/'+fr.length+' (len '+len+')'); return x; };
    switch(req.type){
      case 0x45: return single([0,0,11],'NUMPARAMS = *(ParamOIDS_Message+3) = 11 (14 OIDs follow)');
      case 0x46: return multi(32,'ParamOIDS_Message');
      case 0x47: { const d=OID[o]; if (!d||d.missing) return unsup('no descriptor for '+oidTxt(o)); return multi(d.dl, d.d.split(' ')[0]); }
      case 0x49: {
        const sm={0x0105:['ParamProductName_Message',B.pn],0x0107:['ParamName_Message',46],0x0102:['ParamManuName_Message',B.sn],0x010B:['ParamSoftwareRev_Message',9],0x0104:['ParamWebsite_Message',22]}[o];
        if (sm){ const v=oidValue(f,w,o); cacheSet(tt,o,v); return multi(sm[1], sm[0]); }
        const v=oidValue(f,w,o); if (v===null || OID[o].missing || o===0x0301 && false) return unsup(oidTxt(o));
        cacheSet(tt+frameTime(6),o,v); return single([0,b1,b2,2,(v>>8)&0xFF,v&0xFF],'GET_PARAM '+oidTxt(o)+' = '+v+' → '+valTxt(o,v),o,v); }
      case 0x4A: { const v=req.val;
        if (o===0x0302){ f.eq=f.peq=v?1:0; cacheSet(tt,o,f.eq); return single([0,b1,b2,2,0,f.eq],'SET Equalizer → eq1_active = peq1_active = '+f.eq+' (no report: peq already equal)',o,f.eq); }
        if (o===0x0305){ f.tone=v?1:0; cacheSet(tt,o,f.tone); return single([0,b1,b2,2,0,f.tone],'SET Tone Generator → tone_generation = '+f.tone+' (ALTERA_write ignores it without AES2_AVAILABLE)',o,f.tone); }
        if (o===0x0400){ f.notify=v; cacheSet(tt,o,v); return single([0,b1,b2,2,0,v],'SET 4.0 → smpte_alarm_enabled = '+v,o,v); }
        if (o===0x0301){ f.save=((v^0xFF)&0xFF)?1:0; return single([0,b1,b2,2,0,v],'SET 3.1 → save_settings = INVERT_DATA('+v+') = 0x'+hx((v^0xFF)&0xFF),o,v); }
        if (o===0x0306) return single([0,b1,b2,2,f.adc>>8,f.adc&0xFF],'SET 3.6 → answers ad_result (nothing written)',o,f.adc);
        if (o===0x0201) return single([0,b1,b2,2,0,v],'SET 2.1 → echoed, nothing changes');
        if (o===0xFF07){ f.restore_start=v?1:0; return single([0,b1,b2,2,0,v],'SET 255.7 → restore_start = '+f.restore_start+(f.restore_start?' (reports paused)':'')); }
        if (o===0xFF08){ f.restore_start=((v^0xFF)&1); return single([0,b1,b2,2,0,v],'SET 255.8 → restore_start = '+f.restore_start); }
        return unsup(oidTxt(o)); }
      case 0x50: return b1===0? multi(11,'MenuSet_Message "Status"') : b1===1? multi(12,'MenuSet1_Message "Control"') : unsup();
      case 0x51: return (b1<2)? single([0,b1,b1?1:2],'MENU_COUNT set '+b1+' = '+(b1?1:2)) : unsup();
      case 0x52: { const m={'0.0':[14,'MenuName_Message "Card Info"'],'1.0':[18,'MenuName1_Message "Card Settings"'],'0.1':[16,'MenuName0_Message "Card Status"']}[b1+'.'+b2]; return m? multi(m[0],m[1]) : unsup(); }
      case 0x53: { const k=b1+'.'+b2; if (k==='0.0') return multi(4+2*B.menu0.length,'Menu0OID_Message ('+B.menu0.length+' OIDs)'); if (k==='0.1') return multi(8,'Menu2OID_Message (2.1, 2.2)');
                   if (k==='1.0') return multi(12,'Menu1OID_Message (count 3: 4.0, 3.2, 3.5 + 3.6)'); return unsup(); }
      case 0x43: f.reboot=1; return single([0],'REBOOT ok → reboot_device = YES');
      case 0x40: f.reboot=1; f.upgrade=1; return single([0x14,0x03,0xE8],'CAN_UPGRADE_WAIT, 0x03E8 = 1000 ms → reboot_device = upgrade_device = YES');
      default: return unsup();
    }
  }
  function loaderRespond(tt,req){
    if (req.type===0x40){ const ok=req.file && req.file.compat.includes(BRANDS[w.brand].product);
      if (!ok){ txFrame(tt,0xC0,3,[0x11],'bootloader startUpgrade: CAN_INVALID_PRODUCT'); f.upgrade_ok=false; return; }
      f.upgrade_ok=true; txFrame(tt,0xC0,3,[0],'bootloader startUpgrade: CANRESP_OK → UPGRADE_PAGE × '+req.file.pages+' follow'); return; }
    txFrame(tt,req.type|0x80,3,[1],'bootloader: CANRESP_UNSUPPORTED');
  }
  /* boot / modes */
  function startBoot(tt,why){ f.mode='boot'; f.bootIx=0; f.modeEnd=tt+BOOT[0][0]; f.timersOn=false; f.cs={locked:0,at:Infinity,run:false}; f.A=0; f.lock=0; f.plock=0;
    f.eq=0; f.peq=0; f.tone=0; f.ptone=0; f.notify=0; f.sigc=1; f.pr=0; f.pc=0; f.ptc=0; f.restart_sent=0; f.restore_start=0; f.dinit=1; f.quiet=0; f.rxCount=0;
    f.job=null; f.mfcQ=[]; f.mfcWait=false; f.mfcNext=Infinity; f.reboot=0; f.upgrade=0; f.pb=0; f.pbRel=0; f.pbCnt=0; f.reg4=0x80; f.com=0; f.word=0x800C; f.mob_error=1;
    note(tt,'power-up ('+why+') → main()'); snap(tt); }
  function enterApp(tt){ f.mode='app'; f.modeEnd=Infinity; f.timersOn=true; f.nextPass=tt+C.LOOP_T; f.nextT1=tt+C.LOOP_T+C.T1_FIRST; f.nextT0=tt+C.T0; f.t1c=0; f.t0c=0;
    f.adc=slotAdc(w.slot); f.mod=0x10+ADDRESS_TABLE(f.adc); note(tt,'enter while(1); first pass: CAN_FUNCTIONS sees MOB_error = YES (its initial value) → CANinit() again → timers restart, first timer1 tick 96 ms later'); snap(tt); }
  if (f.mode==='boot') { /* carried over from a previous second */ }
  const T_END=1;
  while (true){
    const nEv = ei<ev.length? ev[ei].t : Infinity;
    const nMode = f.modeEnd;
    const nPass = f.mode==='app'? f.nextPass : Infinity;
    const nT1 = f.timersOn && f.mode==='app'? f.nextT1 : Infinity;
    const nT0 = f.timersOn && f.mode==='app'? f.nextT0 : Infinity;
    const nM = f.mode==='app' || f.mode==='loader'? f.mfcNext : Infinity;
    const nCom = f.com? f.comOff : Infinity;
    t = Math.min(nEv,nMode,nPass,nT1,nT0,nM,nCom);
    if (t>=T_END) break;
    if (t===nEv){ const e=ev[ei++];
      if (e.kind==='world'){ e.fn(w); R.worlds.push({t,w:deep(w)}); }
      else if (e.kind==='mfc'){ if (w.mfc && w.card){ f.mfcQ.push(...e.reqs.map(r=>Object.assign({},r))); if (!f.mfcWait && f.mfcNext===Infinity) f.mfcNext=t; } }
      else if (e.kind==='remove'){ if (f.mode!=='off') seg(t,t,'off','card removed'); f.mode='off'; f.modeEnd=Infinity; f.timersOn=false; f.cs.locked=0; f.cs.run=false; f.lock=0; f.A=0; f.com=0; note(t,'card pulled: power and CAN gone'); }
      else if (e.kind==='insert'){ startBoot(t,'card inserted'); }
      else if (e.kind==='canerr'){ if (f.mode==='app'){ f.mob_error=1; note(t,'MOb error flagged by can_rx_isr'); } }
      snap(t); continue; }
    if (t===nCom){ f.com=0; f.comOff=Infinity; snap(t); continue; }
    if (t===nMode){
      if (f.mode==='boot'){ const st=t-BOOT[f.bootIx][0]; seg(st,t,'boot',BOOT[f.bootIx][1]);
        if (f.bootIx===3){ f.cs.run=true; const p=rxPath(w,false); f.cs.at=p.ok? t+C.CS_LOCK : Infinity; }
        f.bootIx++; if (f.bootIx<BOOT.length){ f.modeEnd=t+BOOT[f.bootIx][0]; } else enterApp(t); }
      else if (f.mode==='wdt'){ seg(t-C.WDT,t,'wdt','while(1) CLI(); — no WDR → watchdog reset ≈16 ms');
        if (f.upgrade){ f.mode='loader'; f.modeEnd=Infinity; f.cs.run=false; f.cs.locked=0; f.lock=0; f.A=0; f.ee.bootc=0x01;
          note(t,'reset vector 0x1E000 (BOOTRST): Ross bootloader; BOOT_CONTROL = RUNLDR → stay in the loader, broadcast BOOTING');
          txFrame(t,0x13,3,[0],'BOOTING (bootloader '+BRANDS[w.brand].product+')'); seg(t,1,'loader','Ross OGP bootloader (bootavr.c) — waiting for START_UPGRADE'); }
        else startBoot(t,'watchdog'); }
      snap(t); continue; }
    if (t===nM){
      if (!f.mfcQ.length){ f.mfcNext=Infinity; continue; }
      if (f.job || f.busyUntil>t){ f.mfcNext=Math.max(t+0.0001,f.busyUntil); continue; }
      const req=f.mfcQ.shift(); const tr=rxFrame(t,req);
      if (f.mode==='loader') loaderRespond(tr,req); else { respond(tr,req); }
      f.mfcNext = f.mfcQ.length? Math.max(f.busyUntil,tr)+C.MFC_GAP : Infinity; snap(t); continue; }
    if (t===nT0){ f.nextT0=t+C.T0; f.t0c++;
      if (f.t0c>=1000){ f.t0c=0; if (f.rxCount<C.DINIT_RX){ f.quiet++; if (f.quiet>=C.DINIT_QUIET && f.dinit){ f.dinit=0; note(t,'timer0: 3 quiet seconds → dashboard_initializing = NO (reports every 10 001 ticks)'); } } else { f.dinit=1; f.quiet=0; } f.rxCount=0; snap(t); }
      continue; }
    if (t===nT1){ f.nextT1=t+C.T1_TICK;
      if (f.job){ const j=f.job; const fr=j.frames[j.i]; txFrame(t,j.type,fr.flags,new Array(fr.len).fill(0),j.name+' frame '+(j.i+1)+'/'+j.frames.length+(fr.len===0?' (zero-length last frame)':'')); j.i++; if (j.i>=j.frames.length) f.job=null; continue; }
      const lim = f.dinit? 1000*w.slot : C.TX_HEART; f.t1c++;
      if (f.t1c>lim){ f.t1c=0;
        if (!f.restart_sent){ f.restart_sent=1; txFrame(t,0x11,3,[1],'TRAP CANTRAP_RESTART (to CANADDR_TRAP)'); }
        else if (!f.restore_start){ let o=0x0202, v;
          if (f.pr===1) o=0x0302; else if (f.pr===2) o=0x0201; else if (f.pr===5) o=0x0305;
          v = o===0x0201? reportValue(f,o) : oidValue(f,w,o);
          txFrame(t,0x10,3,[0,o>>8,o&0xFF,2,0,v],'REPORT_PARAM '+oidTxt(o)+' = '+v+' ('+PR_NAMES[f.pr]+') → '+valTxt(o,v),o,v); cacheSet(t+frameTime(6),o,v);
          f.ptc=1; f.pc=0; }
        snap(t); }
      continue; }
    if (t===nPass){ R.passes++; f.nextPass=t+C.LOOP_T;
      const before=JSON.stringify([f.A,f.lock,f.eq,f.reg4,f.word,f.pr,f.pc,f.pb,f.pbRel]);
      // CS8416_READ_LOCK_ALL + INVERT_DATA
      const p=rxPath(w, f.reg4===0x89);
      if (!p.ok){ if (f.cs.locked) note(t,'CS8416 loses lock: '+p.why); f.cs.locked=0; f.cs.at=Infinity; }
      else if (!f.cs.locked && f.cs.at===Infinity) f.cs.at=t+C.CS_LOCK;
      if (f.cs.at<=t){ f.cs.locked=1; f.cs.at=Infinity; note(t,'CS8416 locked (register 0x0C reads 0)'); }
      f.A=f.cs.locked;
      // PROCESS_EQ_PUSHBUTTONS
      const data=w.pb?1:0; let refresh=0;
      if (data){ if (!f.pbRel && !f.pb){ f.pb=1; refresh=1; } } else if (f.pb) f.pbRel=1;
      if (f.pbRel){ if (f.pbCnt<C.DEBOUNCE) f.pbCnt++; else { f.pbCnt=0; f.pbRel=0; f.pb=0; } }
      if (refresh){ f.eq^=1; note(t,'TRANSLATE_EQ_PUSHBUTTONS: eq1_active = '+f.eq); }
      // PROCESS_MODES
      const r4=f.eq?0x89:0x80; if (r4!==f.reg4){ f.reg4=r4; note(t,'PROCESS_MODES: CS8416_write1(0x04, 0x'+hx(r4)+') → RXSEL = RXP'+(r4===0x89?1:0)+(r4===0x89?' (IN1_EQ)':' (IN1)')+' — receiver re-acquires');
        f.cs.locked=0; f.A=0; f.cs.at = rxPath(w,r4===0x89).ok? t+C.CS_LOCK : Infinity; }
      // REFRESH_LEDS
      f.lock=f.A;
      // ALTERA_write: data_upper = (!aes1_lock)<<7, data_lower = BIT2|BIT3 (tone generators off), BIT0/1/4 = 0 (1×8, no SRC)
      f.word=((f.lock?0:1)<<15)|0x000C;
      // CAN_FUNCTIONS → PARAMETER_UPDATE
      if (!f.pc){
        if (f.lock!==f.plock){ f.pr=0; f.pc=1; f.plock=f.lock; f.sigc=1; }
        else if (f.eq!==f.peq){ f.pr=1; f.pc=1; f.peq=f.eq; }
        else if (f.tone!==f.ptone){ f.pr=5; f.pc=1; f.ptone=f.tone; }
        else if (f.sigc){ f.pr=2; f.pc=1; f.sigc=0; }
        else if (f.ptc){ f.pr = (f.pr>=2? 0 : f.pr+1); }   // parameter_tx_complete is never cleared → advances every pass
      }
      if (f.mob_error){ f.mob_error=0; f.nextT1=t+C.T1_FIRST; f.nextT0=t+C.T0; f.t1c=0; f.job=null; }
      if (f.reboot){ if (f.upgrade){ f.ee.bootc=0x01; note(t,'CAN_FUNCTIONS: CLI(); eepromWriteByte(BOOT_CONTROL, BOOTC_RUNLDR); while(1) CLI();'); }
        else note(t,'CAN_FUNCTIONS: reboot_device → while(1) CLI();');
        f.mode='wdt'; f.modeEnd=t+C.WDT; f.timersOn=false; f.reboot=0; snap(t); continue; }
      if (f.save){ f.save=0; f.ee.aa=0xAA; f.ee.tone=f.tone; seg(t,t+2*C.EE_WRITE,'ee','SAVE_INFORMATION_EEPROM: [10] = 0xAA, [14] = tone_generation'); note(t,'EEPROM [10]=0xAA [14]='+f.tone+' (eq1_active and Notify are not saved)'); f.nextPass=t+2*C.EE_WRITE; }
      if (JSON.stringify([f.A,f.lock,f.eq,f.reg4,f.word,f.pr,f.pc,f.pb,f.pbRel])!==before || R.snaps.length===0) snap(t);
      continue; }
    break;
  }
  if (f.mode==='boot' && f.bootIx>=0 && f.bootIx<BOOT.length){ const st=f.modeEnd-BOOT[f.bootIx][0]; seg(st,Math.min(1,f.modeEnd),'boot',BOOT[f.bootIx][1]); }
  if (f.mode==='wdt') seg(f.modeEnd-C.WDT,1,'wdt','watchdog');
  if (f.mode==='off') seg(R.segs.filter(g=>g.kind==='off').slice(-1)[0]? R.segs.filter(g=>g.kind==='off').slice(-1)[0].t0 : 0,1,'off','card out of the frame');
  // carry the end state into the next second
  f.nextPass-=1; f.nextT1-=1; f.nextT0-=1; if (f.cs.at!==Infinity) f.cs.at-=1; if (f.modeEnd!==Infinity) f.modeEnd-=1; if (f.mfcNext!==Infinity) f.mfcNext=Math.max(0,f.mfcNext-1); f.busyUntil=Math.max(0,f.busyUntil-1); if (f.comOff!==Infinity) f.comOff-=1;
  const c=Object.assign({},R.cache0); R.cacheEv.forEach(e=>c[e.oid]=e.v); f.cache=c;
  R.end={f,w}; if (!R.snaps.length) snap(0);
  return R;
}
function sim(){ if (D.Rver!==D.ver||!D.R){ D.R=simulate(); D.Rver=D.ver; } return D.R; }
function snapAt(t){ const s=sim().snaps; let lo=0,hi=s.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if (s[m].t<=t) lo=m; else hi=m-1; } return s[lo]; }
function segAt(t){ let r=null; for (const g of sim().segs) if (g.t0<=t && t<g.t1) r=g; return r; }
function cacheAt(t){ const R=sim(); const c=Object.assign({},R.cache0); for (const e of R.cacheEv){ if (e.t>t) continue; c[e.oid]=e.v; } return c; }
function worldAt(t){ const ws=sim().worlds; let r=ws[0]; for (const x of ws){ if (x.t<=t) r=x; else break; } return r.w; }
const STEPS = [
  ['WDR · CS8416_READ_LOCK_ALL · INVERT_DATA', .30, 'bit-banged read of CS8416 register 0x0C (receiver errors, only UNLOCK unmasked by reg 0x06 = 0x10) → Astatus'],
  ['PROCESS_EQ_PUSHBUTTONS', .05, 'READ_SWITCHES (PE2 = SW1) · TRANSLATE_SWITCHES · DEBOUNCE (255 passes) · TRANSLATE_EQ'],
  ['PROCESS_MODES', .22, 'CS8416_write1(0x04, eq1_active ? 0x89 : 0x80) — every pass, RXP0 = IN1 or RXP1 = IN1_EQ'],
  ['READ_DIP_SWITCHES · REFRESH_LEDS', .06, 'PINA mirrored into dip_switches (unused); LOCK1 PE0, NO_LOCK1 PE1, EQ1 PE3'],
  ['ALTERA_write', .25, 'data_upper = !aes1_lock << 7, data_lower = 0x0C → 16 bits on PB5 (data) / PB4 (clock), strobe PB6'],
  ['WDR · CAN_FUNCTIONS → PARAMETER_UPDATE', .10, 'pick the next REPORT_PARAM; re-init CAN on MOB_error; reboot if asked'],
  ['save_settings?', .02, 'SAVE_INFORMATION_EEPROM only after DashBoard OID 3.1'],
];
function stepAt(t){ const sn=snapAt(t), g=segAt(t); if (g && g.kind!=='ee') return {seg:g, sn};
  if (sn.mode!=='app') return {sn, seg:{label:sn.mode}}; const ph=((t-sn.t)/C.LOOP_T)%1; let a=0,k=0; for (let j=0;j<STEPS.length;j++){ if (ph>=a) k=j; a+=STEPS[j][1]; } return {sn, step:k}; }

/* ---------------- actions (what the controls do in code) ---------------- */
function addEvent(e){ let t=SIM.t; if (t>0.94){ rollSecond(); t=0.02; } e.t=Math.max(0.0005,t); D.ev.push(e); D.ver++; return e.t; }
function rollSecond(){ const R=sim(); D.s0={w:deep(R.end.w), f:deep(R.end.f)}; D.ev=[]; D.second++; D.ver++; SIM.seek(0); }
function act(name, fn){ const tr=[]; fn(s=>tr.push(s)); D.log.unshift({t:SIM.t, sec:D.second, name, trace:tr}); if (D.log.length>60) D.log.length=60;
  if (!SIM.playing && D.ui.follow){ const last=D.ev.length? D.ev[D.ev.length-1].t : SIM.t; SIM.seek(Math.min(0.999, Math.max(SIM.t,last)+0.025)); } else SIM.refresh(); }
const worldEv=(label,fn)=>addEvent({kind:'world',label,fn});
const mfcEv=(label,reqs)=>addEvent({kind:'mfc',label,reqs});
const FILES = {
  cob:{name:'9252_v1_04.bin', ver:'1.04', compat:['D6202A','ADA-8401-B','9252'], pages:108},
  wbs:{name:'D6202a_v1_04.bin', ver:'1.04', compat:['D6202A','ADA-8401-B','9252'], pages:108},
  ross:{name:'ada-8401-b_v1_04.bin', ver:'1.04', compat:['D6202A','ADA-8401-B','9252'], pages:108},
  wrong:{name:'(a D6203A .bin)', ver:'1.04', compat:['D6203A','ADC-8432','9345'], pages:0},
};
const A = {
  src(on){ act((on?'Connect':'Disconnect')+' the AES source on IN1', tr=>{ const w=worldAt(SIM.t), p=inputPos(w);
    if (!p){ tr('This rear-module position has no input for this card.'); return; }
    tr(`Rear position ${p[0]} (${p[1]}) → P1-97 BNC1_SIG / P1-95,96,98–100 BNC1_GND (isolated) → C1 0.1 µF → T1A PE-65612 → H1 termination (${w.H1} Ω) → R7 110 → U1A EL5263 (gain 2, D1/D2 clamps)`);
    tr('U1A → R11 75R → IN1 → C52 → CS8416 RXP0 (pin 4); U1A → U1B equaliser (R4 750, R6 365 + C4 1 nF) → R5 75R → IN1_EQ → C51 → RXP1 (pin 3)');
    tr(on? `CS8416 locks ≈${C.CS_LOCK*1000} ms later ${inf}; the next pass reads register 0x0C = 0 → Astatus BIT0 → aes1_lock = YES → LOCK1 green, FPGA mute bit cleared → all outputs start` : 'Next pass: register 0x0C ≠ 0 → aes1_lock = NO → NO LOCK1 red; ALTERA_write sets bit 15 (no_lock) → i2s8416_aes “off”: every AES output is held low');
    tr('PARAMETER_UPDATE: aes1_lock ≠ paes1_lock → parameter_refresh = AES1_LOCK, signal_status_change = YES → the next heartbeat REPORT_PARAM carries 2.2');
    worldEv('source '+on, w2=>{ w2.src.on=on; }); }); },
  srcSet(k,v){ act(`Source ${k==='fs'?'sample rate → '+v/1000+' kHz':'cable length → '+v+' m'}`, tr=>{ const w=worldAt(SIM.t); const nw=deep(w); nw.src[k]=v;
    const p0=rxPath(nw,false), p1=rxPath(nw,true);
    tr(`Cable model ${inf}: loss ≈ ${p0.loss.toFixed(1)} dB at the bit rate → eye at RXP0 (direct) ${p0.eye.toFixed(2)} V ${p0.ok?'✓':'✗'}, at RXP1 (EQ) ${p1.eye.toFixed(2)} V ${p1.ok?'✓':'✗'}`);
    if (k==='fs') tr('The CS8416 follows any rate 32–192 kHz; the FPGA just re-times the CS8416’s AES3-format SDOUT with its RMCK — the firmware never looks at the rate.');
    worldEv(k+' '+v, w2=>{ w2.src[k]=v; }); }); },
  eqPress(){ act('Press SW1 (EQ1) on the card edge', tr=>{
    tr('SW1 pulls PE2 (EQ1_SWITCH) low. Next pass READ_SWITCHES → BIT0; TRANSLATE_SWITCHES: pb = YES, eq_refresh = YES; TRANSLATE_EQ_PUSHBUTTONS: eq1_active ^= 1');
    tr('PROCESS_MODES (same pass): CS8416_write1(0x04, 0x89 or 0x80) → the receiver switches between RXP0 (flat) and RXP1 (equalised) and re-locks ('+inf+' ≈20 ms of no lock → outputs held low)');
    tr('After release DEBOUNCE_PUSHBUTTONS counts 255 passes (≈41 ms) before another press is accepted. EQ1 LED (PE3) follows eq1_active.');
    tr('PARAMETER_UPDATE: eq1_active ≠ peq1_active → REPORT_PARAM 3.2 on the next heartbeat (≤0.96 s). Not saved: power-up always starts with EQ off.');
    const t0=worldEv('SW1 down', w2=>{ w2.pb=true; }); D.ev.push({kind:'world',label:'SW1 up',t:Math.min(0.999,t0+0.12),fn:w2=>{ w2.pb=false; }}); D.ver++; }); },
  dashSet(o,v){ act(`DashBoard: set ${OID[o]?OID[o].name:oidTxt(o)} = ${valTxt(o,v)}`, tr=>{ const w=worldAt(SIM.t);
    if (!w.mfc){ tr('No frame controller.'); return; }
    tr(`DashBoard → frame controller (Ethernet) → CAN SET_PARAM 0x4A to 0x${hx(0x10+w.slot)}, data [00 ${hx(o>>8)} ${hx(o&0xFF)} 02 00 ${hx(v)}] (bytes 0/3 ${inf})`);
    tr('can_rx_isr → CANRX → DASHBOARD_RESPONSE_SETUP → CANTX: the reply goes out from inside the interrupt');
    if (o===0x0302) tr('case SET 3.2: eq1_active = peq1_active = '+(v?'YES':'NO')+' → next pass PROCESS_MODES writes CS8416 reg 0x04 = 0x'+(v?'89':'80')+'; no REPORT (peq1_active was set too)');
    if (o===0x0305) tr('case SET 3.5: tone_generation = '+v+'. ALTERA_write is built without AES2_AVAILABLE, so it always sends BIT2|BIT3 (tones off): this control does nothing on the D6202A. PARAMETER_UPDATE still reports it.');
    if (o===0x0400) tr('case SET 4.0: smpte_alarm_enabled = '+v+' → AES Input reports BIT2 instead of BIT1 when unlocked, and Card Status reports BIT1 instead of 0 (REPORT_PARAM only — GET_PARAM 2.1 ignores it)');
    if (o===0x0301) tr('case SET 3.1: save_settings = INVERT_DATA(buffer[5]) → next pass SAVE_INFORMATION_EEPROM: [10] = 0xAA, [14] = tone_generation. RESTORE_INFORMATION_EEPROM() is never called.');
    mfcEv('SET '+oidTxt(o), [{type:0x4A, oid:o, b1:o>>8, b2:o&0xFF, val:v}]); }); },
  dashOpen(){ act('DashBoard: open the card (object-tree scan)', tr=>{ const w=worldAt(SIM.t); const B=BRANDS[w.brand];
    const reqs=[{type:0x45},{type:0x46,oid:0}]; [0,1].forEach(s=>reqs.push({type:0x50,oid:s<<8})); [0,1].forEach(s=>reqs.push({type:0x51,oid:s<<8}));
    [0x0000,0x0001,0x0100].forEach(m=>reqs.push({type:0x52,oid:m})); [0x0000,0x0001,0x0100].forEach(m=>reqs.push({type:0x53,oid:m}));
    const oids=[...B.menu0, ...MENU_STATUS, ...MENU_SET.slice(0,3)];
    oids.forEach(o=>reqs.push({type:0x47,oid:o})); oids.forEach(o=>reqs.push({type:0x49,oid:o}));
    tr(`GET_NUMPARAMS → 11, GET_PARAM_OIDS (14 OIDs), menu sets “Status”/“Control”, menu names and OID lists, then GET_DESCRIPTOR and GET_PARAM for each menu entry — ${reqs.length} requests (order and the use of the menu counts are ${inf})`);
    tr('Menu “Card Settings” has count byte 3: Notify on Card Fault, Equalizer, Tone Generator. The fourth OID, 3.6 AD Result, sits beyond the count; 3.1 Save is in no menu at all.');
    tr('Multi-frame answers: frame 1 from the CAN ISR, the rest one per 96 µs timer1 tick. 12-byte menu lists end with a zero-length last frame.');
    mfcEv('open ('+reqs.length+' requests)', reqs); }); },
  dashRefresh(){ act('DashBoard: refresh', tr=>{ tr('GET_PARAM for the visible parameters'); mfcEv('refresh',[0x0201,0x0202,0x0400,0x0302,0x0305,0x0306].map(o=>({type:0x49,oid:o}))); }); },
  dashGet(o){ act('DashBoard: GET_PARAM '+oidTxt(o), tr=>{ tr('One request, answered inside can_rx_isr.'); mfcEv('GET '+oidTxt(o),[{type:0x49,oid:o}]); }); },
  dashReboot(){ act('DashBoard: reboot the card', tr=>{ tr('CANMSG_REBOOT (0x43) → reply 0x00, reboot_device = YES'); tr('Next pass CAN_FUNCTIONS: while(1) CLI(); — no WDR → watchdog reset after ≈16 ms ('+inf+')'); tr('Bootloader sees BOOT_CONTROL = 0xFF (RUNAPP) → application main() → '+(BOOT_T*1000).toFixed(0)+' ms of start-up waits before the card is back. EQ comes back OFF.'); mfcEv('REBOOT',[{type:0x43}]); }); },
  upload(k){ const F=FILES[k]; act('DashBoard: upload '+F.name, tr=>{ tr('START_UPGRADE (0x40) → application replies CAN_UPGRADE_WAIT 0x14, 1000 ms; reboot_device = upgrade_device = YES');
    tr('Next pass: eepromWriteByte(BOOT_CONTROL 0xFFE, BOOTC_RUNLDR) → while(1) CLI() → watchdog → bootloader at 0x1E000 broadcasts BOOTING');
    tr('Frame controller repeats START_UPGRADE → isCompatibleProduct('+F.compat.join(' / ')+') against “'+BRANDS[worldAt(SIM.t).brand].product+'” → UPGRADE_PAGE × '+F.pages+' (256 bytes; code is 27 492 bytes per V100W.mp) → VERIFY_UPGRADE → REBOOT');
    mfcEv('START_UPGRADE',[{type:0x40}]); const t1=Math.min(0.99,SIM.t+0.05); D.ev.push({kind:'mfc',label:'START_UPGRADE (repeat)',t:Math.min(0.999,t1+0.03),reqs:[{type:0x40,file:F}]}); D.ver++;
    D.ui.upl={file:k, wall:performance.now(), sec:D.second}; }); },
  jumperH1(){ const w=worldAt(SIM.t); const v=w.H1===110?75:110; act('Move jumper H1 → '+v+' Ω', tr=>{ tr(`H1 joins T1A’s secondary (pin 2) to ${v===75?'R8 75R (pin 1, “75”)':'R9 110 (pin 3, “110”)'} — the input termination. No firmware involvement.`);
    const nw=deep(w); nw.H1=v; const p=rxPath(nw,false); tr(`With a ${p.zs} Ω source the reflection coefficient becomes ${p.gamma.toFixed(2)}; terminated level ${p.vterm.toFixed(2)} V p-p ${inf}.`); worldEv('H1 '+v, w2=>{ w2.H1=v; }); }); },
  dip(i){ const w=worldAt(SIM.t); const on=!w.dip[i]; act(`DIP SW3-${i+1} → ${on?'ON':'OFF'}`, tr=>{ tr('PINA is read every pass by READ_DIP_SWITCHES → dip_switches = MIRROR(PINA).'); tr('main() forces dip_switch_enabled = NO and dashboard_enabled = YES (the DIP tests are commented out) and ALTERA_write’s DIP branch only exists with AES2_AVAILABLE — so no switch changes anything on a D6202A.'); worldEv('dip', w2=>{ w2.dip[i]=on; }); }); },
  load(n){ const w=worldAt(SIM.t); const on=!w.load[n-1]; act(`${on?'Connect':'Disconnect'} the 110 Ω load on AES${n}`, tr=>{ tr(`AES${n} = P1-${AESPIN[n]} ← T${n} ← C (0.1 µF) ← 110 Ω ← ${DRVOF(n)} ← FPGA OUT${OUTOF(n)} (pin ${OUTPIN[OUTOF(n)]}).`); tr(on? 'Loaded: ≈3.3 V p-p at the load ('+inf+')' : 'Open: ≈6.6 V p-p at the terminal ('+inf+'); the other outputs are unaffected (separate drivers and transformers).'); worldEv('load', w2=>{ w2.load[n-1]=on; }); }); },
  fpga(k){ act('FPGA variant → '+FPGAS[k].name, tr=>{ const F=FPGAS[k];
    if (k==='EP1C3') tr('i2s8416_aes re-times the CS8416’s AES3-format SDOUT and copies V, U, C and the Z flag (in_reg1 bits 36–39); aes1 <= aes_pt AND NOT off, where off = control-word bit 15 = !aes1_lock. switch2x1 (sel = q0/q1) picks aes1 for OUT1–OUT4 in 1×8.');
    if (k==='XP3_AES') tr('d6202a_top: I2SX4_AES builds four AES streams from U5’s I2S with c1, u1, v1 left open (C/U/V = 0 '+inf+'). There is no AVR control word, so nothing mutes the outputs on loss of lock. The .lpf puts aes1/aes2 on pins 79/81, which the dsbxp netlist leaves unconnected — modelled here as if the streams reached OUT1–OUT4.');
    if (k==='XP3_PROBE') tr('v100/d6202a_top: out_clk <= U5_MCLK AND U5_LRCLK AND U5_SCLK — a bring-up probe. No AES output at all.');
    tr('Source: '+F.src); worldEv('fpga '+k, w2=>{ w2.fpga=k; }); }); },
  rear(k){ act('Fit rear module '+k, tr=>{ const RM=REARS[k]; tr(RM.name+'. AN_BMID / AN_BMID2 = '+rTxt(RM.id[0])+' / '+rTxt(RM.id[1])+'. The D6202A never converts ADC1/ADC2 (ADMUX = 0, slot ID only), so it cannot tell which module is fitted.');
    if (RM.dual) tr('Dual-slot module: each card reaches IN + AES1–AES4 only. The functional drawing: “outputs 5 to 8 are available for single card”.'); worldEv('rear '+k, w2=>{ w2.rear=k; }); }); },
  slot(n){ act('Move the card to slot '+n, tr=>{ const v=slotAdc(n); tr(`AN_SLOTID ${SLOT_R[n-1]} Ω with the 1K pull-up → ADC ≈ ${v} → ADDRESS_TABLE = ${ADDRESS_TABLE(v)} → mod_address 0x${hx(0x10+n)} (read at power-up only)`); worldEv('slot '+n, w2=>{ w2.slot=n; }); }); },
  brand(k){ act('Rebuild with common.h #define '+k, tr=>{ tr('Dashboard.c selects ParamManuName_Message, ParamProductName_Message and Menu0OID_Message by #ifdef. The archived v104 common.h says COBALT, and V100W.mak runs “zeuspack /f cobalt_ztcpack.txt”.'); worldEv('brand', w2=>{ w2.brand=k; }); }); },
  remove(){ act('Pull the card', tr=>{ tr('Power and CAN gone; outputs stop.'); addEvent({kind:'world',label:'removed',fn:w2=>{ w2.card=false; }}); addEvent({kind:'remove'}); }); },
  insert(){ act('Insert the card (power-up)', tr=>{ BOOT.forEach(b=>tr(`${(b[0]*1000).toFixed(1)} ms — ${b[1]}`)); tr('Total ≈'+(BOOT_T*1000).toFixed(0)+' ms (wait(3000) = 3000 × 7 cycles = 2.625 ms). CS8416 starts acquiring after init_CS8416.');
    addEvent({kind:'world',label:'inserted',fn:w2=>{ w2.card=true; }}); addEvent({kind:'insert'}); }); },
  canErr(){ act('Inject a CAN error', tr=>{ tr('can_rx_isr leaves MOB_error = YES → next pass CAN_FUNCTIONS → CANinit(): timers restart (next timer1 tick 96 ms later)'); addEvent({kind:'canerr'}); }); },
};
/* upload progress (wall clock, compressed) */
function uploadState(){ const u=D.ui.upl; if (!u) return null; const F=FILES[u.file]; const el=(performance.now()-u.wall)/1000;
  if (!F.compat.includes(BRANDS[worldAt(SIM.t).brand].product)){ const p=Math.min(1,el/2); return {p, txt:p<1?'START_UPGRADE → bootloader checks the product…':'Bootloader: CAN_INVALID_PRODUCT. The old application stays; BOOT_TIMEOUT (60 s) runs it again.', done:p>=1, bad:true}; }
  const tot=8; if (el<tot) return {p:el/tot, txt:`UPGRADE_PAGE ${Math.floor(el/tot*F.pages)} / ${F.pages} (compressed; the real duration is not in the archive · ${'inferred'})`};
  return {p:1, txt:`Done: ${F.name} v${F.ver}. VERIFY_UPGRADE ok → REBOOT → main() (≈${(BOOT_T*1000).toFixed(0)} ms).`, done:true}; }
function finishUpload(){ const u=D.ui.upl; if (!u||u.applied) return; const st=uploadState(); if (!st||!st.done) return; u.applied=true; const F=FILES[u.file];
  rollSecond(); if (!st.bad) D.s0.w.ver=F.ver; const f=D.s0.f; f.mode='boot'; f.bootIx=0; f.modeEnd=BOOT[0][0]; f.timersOn=false; f.cs={locked:0,at:Infinity,run:false}; f.lock=0; f.A=0; f.ee.bootc=0xFF;
  f.eq=0; f.peq=0; f.restart_sent=0; f.dinit=1; f.mfcQ=[]; f.mfcNext=Infinity; f.job=null; f.word=0x800C;
  D.log.unshift({t:0,sec:D.second,name:st.bad?'Bootloader timeout → old application':'Upload complete',trace:[st.txt]}); D.ver++; SIM.refresh(); }

/* =====================================================================
   DRAWING: the card from the ISS4 gerbers, card edge, rear module, frame, parameter window
   ===================================================================== */
/* Card artwork: GERBERS/D6202A-ISS4.TOP+TSM+OTL (copper/pads) and .TSS (silk) at 120 dpi: px = (x+0.01)·120, py = (3.04−y)·120.
   Part positions from D6202A-iss3-T.prg (PnP 2016): px = 73 + x·120, py = 307.8 + y·120. Mask colour from the ISS3 photo. */
const POS = { L2:[62,44], L3:[62,67], L4:[62,90], L5:[62,121], L6:[62,146], L7:[62,170], L8:[149,215], L9:[149,230], SW1:[97,57], SW2:[97,142], SW3:[459,84],
  H1:[1385,53], H4:[1367,325], U5:[1153,74], U6:[1073,74], U7:[855,164], U10:[1117,180], U11:[1009,180], U1:[1322,57], U3:[1300,120], U9:[1150,286], X2:[1062,240],
  U12:[1206,275], U13:[1216,211], U8:[1446,325], T1A:[1422,62], T1B:[1422,112], T:{4:[1305,190],3:[1347,190],2:[1392,190],1:[1435,190],8:[1305,255],7:[1347,255],5:[1392,255],6:[1435,255]} };
function ledsOf(sn, w){ if (!sn || (sn.mode!=='app' && sn.mode!=='wdt')) return {lock:0,nolock:0,eq:0,com:0,err:0};
  return {lock:sn.lock, nolock:sn.lock?0:1, eq:sn.eq, com:sn.com, err:0}; }
function cardSVG(t, opts){ opts=opts||{}; const sn=snapAt(t), w=worldAt(t), L=ledsOf(sn,w), F=FPGAS[w.fpga];
  const glow=(on,col)=>on? `fill="${col}" filter="url(#dGlow)"` : 'fill="#2b2f2c"';
  let s=`<svg viewBox="0 0 1540 366" role="img" aria-label="D6202A ISS4 card, top side (from the gerbers)" style="width:100%;display:block;border-radius:6px">
   <defs><filter id="dGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
   <pattern id="dHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#ffb43a" stroke-width="2" opacity=".55"/></pattern></defs>
   <rect width="1540" height="366" fill="var(--panel2)"/>
   <image href="${ASSET}d6202a-copper.png" width="1540" height="366"/>
   <rect x="1510" y="47" width="30" height="248" fill="#c9a24a" opacity=".85"/><rect x="1490" y="307" width="24" height="48" fill="#c9a24a" opacity=".85"/>
   <image href="${ASSET}d6202a-silk.png" width="1540" height="366" opacity=".92"/>
   <text x="152" y="346" font-size="13" fill="#e8e8e2">openGear</text>`;
  const led=(k,on,col,tip)=>{ const [x,y]=POS[k]; return `<rect x="${x-8}" y="${y-5}" width="16" height="10" rx="2" ${glow(on,col)}><title>${k} ${tip}</title></rect>`; };
  s+=led('L2',L.lock,'var(--led-g)','LOCK1 (PE0)')+led('L3',L.nolock,'#ff4a3a','NO LOCK1 (PE1)')+led('L4',L.eq,'#ffd23a','EQ1 (PE3)')+led('L8',L.com,'var(--led-g)','COM ACTIVITY (PB0)')+led('L9',L.err,'#ff4a3a','ERROR (PB1) — never switched on by the firmware');
  ['L5','L6','L7'].forEach(k=>{ const [x,y]=POS[k]; s+=`<rect x="${x-8}" y="${y-5}" width="16" height="10" fill="url(#dHatch)" stroke="#ffb43a" stroke-width=".8"><title>${k} not fitted on a D6202A (D6202A-iss3-T.prg)</title></rect>`; });
  const [bx,by]=POS.SW1; s+=`<g class="d2-pb" style="cursor:pointer"><rect x="${bx-9}" y="${by-11}" width="18" height="22" rx="2" fill="#c8c8c0" stroke="#555"/><rect x="${bx-5}" y="${by-6}" width="10" height="12" rx="2" fill="${w.pb?'#888':'#eee'}"/><rect x="${bx-16}" y="${by-18}" width="32" height="36" fill="transparent"><title>SW1 EQ1 push-button — click to press</title></rect></g>`;
  const [b2x,b2y]=POS.SW2; s+=`<rect x="${b2x-9}" y="${b2y-11}" width="18" height="22" fill="url(#dHatch)" stroke="#ffb43a" stroke-width=".8"><title>SW2 (EQ2) not fitted on a D6202A</title></rect>`;
  const [dx,dy]=POS.SW3; for (let i=0;i<8;i++){ const x=dx-39+i*11.2, on=w.dip[i];
    s+=`<g class="d2-dip" data-i="${i}" style="cursor:pointer"><rect x="${x-4.5}" y="${dy-14}" width="9" height="28" rx="1.5" fill="#2d63b8" stroke="#183a72"/><rect x="${x-3}" y="${on?dy-12:dy+1}" width="6" height="11" fill="#f2f2f2"/><rect x="${x-6}" y="${dy-20}" width="12" height="40" fill="transparent"><title>SW3-${i+1} (PA${7-i}) — read every pass, never used</title></rect></g>`; }
  const [hx1,hy1]=POS.H1; s+=`<g class="d2-h1" style="cursor:pointer"><rect x="${hx1-7}" y="${hy1-17}" width="14" height="34" rx="2" fill="#111" stroke="#666"/><rect x="${hx1-6}" y="${w.H1===75?hy1-16:hy1}" width="12" height="16" rx="2" fill="#e8c23a"/><rect x="${hx1-14}" y="${hy1-22}" width="28" height="44" fill="transparent"><title>H1 input termination: ${w.H1} Ω — click to move</title></rect></g>`;
  ['U6','U3','U9','X2'].forEach(k=>{ const [x,y]=POS[k]; s+=`<rect x="${x-22}" y="${y-14}" width="44" height="28" fill="url(#dHatch)" stroke="#ffb43a" stroke-width=".8"><title>${k} not fitted on a D6202A (dual-input/SRC parts of the D6202B)</title></rect>`; });
  const on=sn.outOn;
  Object.entries(POS.T).forEach(([n,[x,y]])=>{ const reach=rearOutputs(w).has(+n); s+=`<rect x="${x-19}" y="${y-28}" width="38" height="56" rx="3" fill="${on?'var(--accent)':'transparent'}" opacity="${on?(reach?.35:.15):0}"/><text x="${x}" y="${y+5}" text-anchor="middle" font-size="11" fill="${on?'#fff':'#9a9'}" font-weight="700">${on?'AES'+n:''}</text>`; });
  if (opts.labels!==false){
    const lab=(k,txt,dy2)=>{ const [x,y]=POS[k]; return `<text x="${x}" y="${y+(dy2||-18)}" text-anchor="middle" font-size="14" font-weight="700" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke">${txt}</text>`; };
    s+=lab('U7','AT90CAN128',-34)+lab('U10',F.short.startsWith('LFXP3')?'LFXP3 (dsbxp)':'EP1C3',44)+lab('U5','CS8416',-16)+lab('U1','EL5263',-14)+lab('U12','DS34LV87T',26)+lab('U13','DS34LV87T',-20)+lab('U8','CAN',-14)+lab('U11','EPCS',-22)+lab('SW3','DIP (unused)',38);
    s+=`<text x="1500" y="40" font-size="14" font-weight="700" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke">P1</text><text x="1470" y="345" font-size="14" font-weight="700" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke">P2</text>`;
  }
  if (w.fpga!=='EP1C3') s+=`<text x="770" y="350" font-size="15" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke">Lattice variant: the dsbxp layout has no archived artwork — ISS4 board shown, U10 relabelled</text>`;
  if (!w.card) s+=`<rect width="1540" height="366" fill="var(--panel2)" opacity=".75"/><text x="770" y="190" text-anchor="middle" font-size="40" fill="var(--ink)">card removed from the frame</text>`;
  else if (sn.mode==='boot') s+=`<text x="300" y="300" font-size="20" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke">booting: main() start-up waits</text>`;
  else if (sn.mode==='loader') s+=`<text x="300" y="300" font-size="20" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke">bootloader running</text>`;
  return s+'</svg>'; }
/* card edge and rear modules: CorelDRAW artwork (artwork pass 2026|59). The archive .cdr files were converted with
   Inkscape to assets/d6202a-*.svg; LEDs, SW1 and the connectors are drawn on the artwork's own coordinates (pt). */
const ART={"edge":{"vb":[63,129,225,311],"led":[[179.7,135.58,5.74,12.58],[179.7,156.74,5.74,12.58],[179.81,179.93,5.74,12.58],[179.7,207.85,5.74,12.58],[179.7,229.0,5.74,12.58],[179.81,252.19,5.74,12.58],[179.7,296.04,5.74,12.58],[179.81,319.23,5.74,12.58]],"sw":[[179.64,138.61,15.87,27.94],[179.64,210.87,15.87,27.94]],"href":"d6202a-edge.svg"},"rear":{"T6303":{"vb":[315.5,211.5,147.5,186.5],"panel":[366.06,256.9,39.83,99.57],"s":1.006,"pos":{"1":[372.9,271.99],"2":[391.91,271.99],"3":[372.9,291.0],"4":[391.91,291.0],"5":[372.9,310.01],"6":[391.91,310.01],"7":[372.9,329.02],"8":[391.91,329.02],"9":[372.9,348.03],"10":[391.91,348.03]},"href":"d6202a-rear-t6303.svg"},"T6203":{"vb":[205,250,187,324],"pos":{"1":[274.78,311.0],"2":[324.53,311.0],"3":[274.78,348.0],"4":[324.53,348.0],"5":[274.78,385.0],"6":[324.53,385.0],"7":[274.78,421.0],"8":[324.53,421.0],"9":[274.78,458.0],"10":[324.53,458.0]},"s":2.41,"panel":[250.1,273.7,95.4,223.2],"href":"d6202a-rear-t6203.svg"},"T6204":{"vb":[205,250,187,324],"pos":{"1":[274.78,311.0],"2":[324.6,311.0],"3":[274.78,348.0],"4":[324.6,348.0],"5":[274.78,385.0],"6":[324.6,385.0],"7":[274.78,421.0],"8":[324.6,421.0],"9":[274.78,458.0],"10":[324.6,458.0]},"s":2.41,"panel":[250.1,273.7,95.4,223.2],"href":"d6202a-rear-t6204.svg"},"T6403":{"vb":[463.8,211.5,148.7,186.5],"panel":[517.63,256.9,39.83,99.57],"s":1.006,"pos":{"1":[524.47,271.99],"2":[543.48,271.99],"3":[524.47,291.0],"4":[543.48,291.0],"5":[524.47,310.01],"6":[543.48,310.01],"7":[524.47,329.02],"8":[543.48,329.02],"9":[524.47,348.03],"10":[543.48,348.03]},"href":"d6202a-rear-t6403.svg"}}};
const ARTCITE='Artwork: '+SIM.src('#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6202A - rear module options.cdr','D6202A - rear module options.cdr (2012-01-16): T6303A, T6403A')+' · '+SIM.src('#OPENGEAR #SERIES/D6202A - #Master #OPENGEAR/D6202A - #Engineering/Functional/D6202A-T6203.cdr','D6202A-T6203.cdr (2008-10-08)')+' · '+SIM.src('#OPENGEAR #SERIES/D6202A - #Master #OPENGEAR/D6202A - #Engineering/Functional/D6202A-T6204.cdr','D6202A-T6204.cdr (2008-10-07)')+' · card edge '+SIM.src('#OPENGEAR #SERIES/D6202A - #Master #OPENGEAR/D6202A - #Engineering/Functional/D6202A-card-edge.cdr','D6202A-card-edge.cdr (2008-05-08)');
function edgeSVG(t){ const sn=snapAt(t), w=worldAt(t), L=ledsOf(sn,w), A=ART.edge, [vx,vy,vw,vh]=A.vb;
  // art lens order (top→bottom): Lock1, No Lock1, EQ1, Lock2, No Lock2, EQ2, COM Activity, Error
  const rows=[['Lock1',L.lock,'var(--led-g)'],['No Lock1',L.nolock,'#ff4a3a'],['EQ1',L.eq,'#ffd23a'],['Lock2',null],['No Lock2',null],['EQ2',null],['COM Activity',L.com,'var(--led-g)'],['Error',L.err,'#ff4a3a']];
  let s=`<svg viewBox="${vx} ${vy} ${vw} ${vh+12}" style="width:100%;max-width:300px;display:block;border-radius:8px" role="img" aria-label="D6202A card edge">
   <defs><filter id="dGlow2" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect x="${vx}" y="${vy}" width="${vw}" height="${vh+12}" fill="#f4f4ef"/><image href="siumulation-plugins/assets/${A.href}" x="${vx}" y="${vy}" width="${vw}" height="${vh}"/>`;
  const [b1,b2]=A.sw;
  s+=`<g class="d2-pb" style="cursor:pointer"><title>EQ1 switch (SW1) — click</title><rect x="${b1[0]-1}" y="${b1[1]-1}" width="${b1[2]+8}" height="${b1[3]+2}" rx="1.5" fill="${w.pb?'#000':'#fff'}" fill-opacity="${w.pb?.3:.01}" stroke="#2b5f9e" stroke-width=".7" stroke-dasharray="2 1.2"/></g>
   <g><title>EQ2 switch (SW2): not fitted on a D6202A (PnP program) — the artwork is the dual-channel card</title><path d="M${b2[0]} ${b2[1]} l${b2[2]} ${b2[3]} M${b2[0]+b2[2]} ${b2[1]} l${-b2[2]} ${b2[3]}" stroke="#c0392b" stroke-width=".8"/></g>`;
  rows.forEach(([nm,on,col],i)=>{ const r=A.led[i];
    if (on===null) s+=`<g><title>${nm} LED: not fitted on a D6202A</title><path d="M${r[0]-1} ${r[1]} l${r[2]+2} ${r[3]} M${r[0]+r[2]+1} ${r[1]} l${-r[2]-2} ${r[3]}" stroke="#c0392b" stroke-width=".7"/></g>`;
    else s+=`<g><title>${nm} LED (${on?'lit':'off'})</title><rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" rx="1.2" fill="${on?col:'#5a5f5a'}" fill-opacity="${on?1:.25}" stroke="#1b1918" stroke-width=".3" ${on?'filter="url(#dGlow2)"':''}/></g>`; });
  s+=`<text x="${vx+4}" y="${vy+vh+8}" font-size="6.5" fill="#55595c">Artwork: D6202A-card-edge.cdr · red ✕ = not fitted on D6202A</text></svg>`;
  return s; }
function rearSVG(t){ const w=worldAt(t), RM=REARS[w.rear], sn=snapAt(t), A=ART.rear[w.rear], [vx,vy,vw,vh]=A.vb, k=A.s||1, P=A.panel;
  let s=`<svg viewBox="${vx} ${vy} ${vw} ${vh+10}" role="img" aria-label="${RM.name}" style="width:100%;max-width:340px;display:block;border-radius:6px"><rect x="${vx}" y="${vy}" width="${vw}" height="${vh+10}" fill="#f4f4ef"/>
   ${P?`<rect x="${P[0]}" y="${P[1]}" width="${P[2]}" height="${P[3]}" fill="#c9ccd0"/>`:''}<image href="siumulation-plugins/assets/${A.href}" x="${vx}" y="${vy}" width="${vw}" height="${vh}"/>`;
  RM.pos.forEach(p=>{ const [n,lab,role,cd]=p, [cx,cy]=A.pos[n], left=n%2===1;
    const mine=!RM.dual || cd===w.pos; const isIn=role==='in' && mine; const o=role[0]==='o'? +role.slice(1) : 0;
    const act = o && mine && sn.outOn; const loaded = o? w.load[o-1] : false;
    const cls = isIn? 'class="d2-in" style="cursor:pointer"' : (o&&mine? `class="d2-out" data-o="${o}" style="cursor:pointer"` : '');
    const tip = isIn? `${n} ${lab}: ${w.src.on?'cable connected — click to unplug':'click to connect the source'}` : o&&mine? `${n} ${lab} ← P1-${AESPIN[o]} ← ${DRVOF(o)} ← OUT${OUTOF(o)} — click to ${loaded?'remove':'connect'} the 110 Ω load` : `${n} ${lab}`+(RM.dual&&!mine?' (not this card)':'');
    const hl=(isIn||(o&&mine))?'stroke="#2b5f9e"':'stroke="none"';
    if (RM.bnc.includes(n)){ s+=`<g ${cls}><title>${tip}</title><circle cx="${cx}" cy="${cy}" r="${6.2*k}" fill="#fff" fill-opacity=".01" ${hl} stroke-width="${.5*k}" stroke-dasharray="${1.5*k} ${k}"/>${isIn&&w.src.on?`<circle cx="${cx}" cy="${cy}" r="${4.6*k}" fill="#3a74b8" opacity=".85"/><circle cx="${cx}" cy="${cy}" r="${1.4*k}" fill="#cfe0f5"/>`:''}</g>`; }
    else { const wired=(isIn&&w.src.on)||(o&&mine&&loaded);
      s+=`<g ${cls}><title>${tip}</title><rect x="${cx-4.2*k}" y="${cy-7.6*k}" width="${8.4*k}" height="${15.2*k}" rx="${k}" fill="#fff" fill-opacity=".01" ${hl} stroke-width="${.5*k}" stroke-dasharray="${1.5*k} ${k}"/>${wired?[-4.6,0,4.6].map(d=>`<line x1="${cx+(left?-3:3)*k}" y1="${cy+d*k}" x2="${cx+(left?-11:11)*k}" y2="${cy+d*k}" stroke="${isIn?'#2b5f9e':'#666'}" stroke-width="${1.6*k}" stroke-linecap="round"/>`).join(''):''}</g>`; }
    if (o && mine) s+=`<circle cx="${cx+(left?-7.4:7.4)*k}" cy="${cy+6*k}" r="${1.9*k}" stroke="#1b1918" stroke-width="${.3*k}" fill="${act?'#2f8f46':'#7d8286'}"><title>${lab}: ${act?'aes_out running':'output low'}</title></circle>`; });
  s+=`<text x="${vx+3}" y="${vy+vh+7}" font-size="${Math.min(6,vw/40)}" fill="#55595c">${w.rear} · ID ${rTxt(RM.id[0])} / ${rTxt(RM.id[1])} (not read)</text></svg>`; return s; }
function frameSVG(t){ const w=worldAt(t), RM=REARS[w.rear], sn=snapAt(t), L=ledsOf(sn,w);
  let s=`<svg viewBox="0 0 640 74" style="width:100%;display:block"><rect width="640" height="74" rx="6" fill="var(--dev)"/>`;
  for (let i=1;i<=20;i++){ const x=10+(i-1)*31, c=(i===w.slot&&w.card); const span=RM.dual?[w.slot,w.pos===1?w.slot-1:w.slot+1]:[w.slot];
    s+=`<g class="d2-slot" data-s="${i}" style="cursor:pointer"><rect x="${x}" y="8" width="27" height="44" rx="2" fill="${c?'#3a4f40':'#202326'}" stroke="${span.includes(i)?'#e3a35a':'#3a3f44'}" stroke-width="${span.includes(i)?2:1}"/>
     ${c?`<rect x="${x+11}" y="12" width="5" height="36" fill="#141716"/>${[[L.lock,'#7dff6a'],[L.nolock,'#ff5a4a'],[L.eq,'#ffd23a'],[L.com,'#7dff6a']].map(([on,col],k)=>`<rect x="${x+7}" y="${14+k*6}" width="3" height="3" fill="${on?col:'#2c332c'}"/>`).join('')}`:''}
     <text x="${x+13.5}" y="64" font-size="9" text-anchor="middle" fill="#9aa0a5">${i}</text><title>Slot ${i}${c?' — D6202A':''}</title></g>`; }
  return s+`<text x="630" y="72" font-size="8" text-anchor="end" fill="#9aa0a5">20-slot frame (click a slot; orange = rear-module footprint)</text></svg>`; }
/* DashBoard-style window (generic period parameter editor, not Ross's design) */
function dashHTML(t){ const w=worldAt(t), sn=snapAt(t), c=cacheAt(t), B=BRANDS[w.brand]; const tab=D.ui.dashTab;
  const row=(l,v)=>`<tr><td class="d2-dl">${l}</td><td>${v}</td></tr>`; let body='';
  const alive = sn.mode==='app';
  if (!w.mfc) body='<div class="d2-msg">No frame controller.</div>';
  else if (tab==='info') body=`<table class="d2-dt">${B.menu0.map(o=>row(OID[o].name,`<input readonly value="${String(c[o]??'')}">`)).join('')}</table><div class="d2-note">Menu “Card Info” = Menu0OID_Message (${B.menu0.length} OIDs on the ${B.def} build).</div>`;
  else if (tab==='status'){ const cs=c[0x0201], ai=c[0x0202];
    body=`<table class="d2-dt">${row('Card Status',`<span class="d2-al" style="background:${cs&&!(cs&1)?'var(--warn)':'var(--accent)'}"></span> ${valTxt(0x0201,cs)}`)}${row('AES Input',`<span class="d2-al" style="background:${ai===1?'var(--accent)':'var(--warn)'}"></span> ${valTxt(0x0202,ai)}`)}</table>
     <div class="d2-note">What DashBoard last received (GET_PARAM replies and REPORT_PARAM), not the card’s live state. ALARM_TABLE decode: entry k lit when bit k is set ${inf}.</div>`; }
  else { const rad=(o,nm)=>OID[o].ch.map(([v,l])=>`<label class="d2-r"><input type="radio" name="${nm}" data-o="${o}" data-v="${v}" ${c[o]===v?'checked':''}> ${l}</label>`).join('');
    body=`<table class="d2-dt">${row('Notify on Card Fault',rad(0x0400,'d2n'))}${row('Equalizer',rad(0x0302,'d2e'))}${row('Tone Generator',`<select data-o="${0x0305}">${OID[0x0305].ch.map(([v,l])=>`<option value="${v}" ${c[0x0305]===v?'selected':''}>${l}</option>`).join('')}</select> <span class="muted small">(does nothing on a D6202A)</span>`)}
      ${row('<span class="muted">AD Result (3.6)</span>',`<span class="mono">${c[0x0306]??'—'}</span> <button data-get="774">get</button> <span class="muted small">beyond the menu count</span>`)}</table>
      <div class="d2-note">“Card Settings” = Menu1OID_Message: count byte 3, four OIDs. Settings → Save (3.1) is in ParamOIDS but in no menu: <button data-save="1">send SET 3.1 by hand</button></div>`; }
  const upl=uploadState();
  return `<div class="d2-dash"><div class="d2-title"><span>Parameter editor — frame tree</span><span class="muted">generic DashBoard-style view</span></div>
   <div class="d2-wrap"><div class="d2-tree"><div>▾ openGear frame</div><div style="padding-left:12px">▸ Frame controller</div><div style="padding-left:12px" class="d2-sel">● Slot ${w.slot}: ${B.product}</div></div>
   <div class="d2-pane"><div class="d2-head">Slot ${w.slot}: <b>${B.product}</b> <span class="muted">${CARD_NAME}</span>${alive?'':' <span style="color:var(--warn)">('+sn.mode+')</span>'}</div>
    <div class="d2-tabs">${[['status','Status ▸ Card Status'],['info','Status ▸ Card Info'],['control','Control ▸ Card Settings']].map(([k,l])=>`<button data-dt="${k}" class="${tab===k?'on':''}">${l}</button>`).join('')}</div>
    <div class="d2-body">${body}</div>
    <div class="d2-foot"><button data-da="open">Open / rescan</button><button data-da="refresh">Refresh</button><select id="d2File">${Object.keys(FILES).map(k=>`<option value="${k}">${FILES[k].name}</option>`).join('')}</select><button data-da="upload">Upload…</button><button data-da="reboot">Reboot</button></div>
    ${upl?`<div class="d2-upl"><div class="d2-bar"><i style="width:${(upl.p*100).toFixed(1)}%"></i></div><div class="small">${upl.txt}</div></div>`:''}</div></div></div>`; }
const CSS = `<style>
.d2-dash{border:1px solid var(--line);border-radius:6px;background:var(--panel2);font:12.5px var(--sans);overflow:hidden}
.d2-title{display:flex;justify-content:space-between;padding:5px 8px;background:color-mix(in srgb,var(--accent2) 22%,var(--panel));border-bottom:1px solid var(--line);font-weight:600}
.d2-wrap{display:grid;grid-template-columns:140px 1fr;min-height:230px}.d2-tree{border-right:1px solid var(--line);padding:6px;font-size:12px;background:var(--lane)}
.d2-sel{background:color-mix(in srgb,var(--accent) 22%,transparent);border-radius:3px}.d2-pane{display:flex;flex-direction:column}.d2-head{padding:6px 8px;border-bottom:1px solid var(--line)}
.d2-tabs{display:flex;flex-wrap:wrap;gap:3px;padding:5px 6px 0}.d2-tabs button{font-size:11.5px;padding:3px 7px;border-radius:5px 5px 0 0}.d2-body{padding:8px;flex:1;border-top:1px solid var(--line)}
.d2-dt{border-collapse:collapse;width:100%}.d2-dt td{padding:4px 6px;border-bottom:1px dashed var(--grid);vertical-align:top}.d2-dl{color:var(--ink2);width:36%}
.d2-dt input[readonly]{width:100%;background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:2px 5px;color:var(--ink);font:12px var(--mono)}
.d2-r{display:inline-block;margin-right:8px;white-space:nowrap}.d2-al{display:inline-block;width:11px;height:11px;border-radius:50%;vertical-align:-1px}
.d2-note{margin-top:6px;font-size:11.5px;color:var(--ink2)}.d2-msg{padding:20px;color:var(--ink2)}.d2-foot{display:flex;flex-wrap:wrap;gap:5px;padding:6px;border-top:1px solid var(--line)}
.d2-foot button,.d2-foot select{font-size:11.5px;padding:3px 7px}.d2-upl{padding:6px 8px;border-top:1px solid var(--line)}.d2-bar{height:9px;border-radius:5px;background:var(--grid);overflow:hidden}.d2-bar i{display:block;height:100%;background:var(--accent)}
.d2-eye{height:12px;border-radius:6px;background:var(--grid);overflow:hidden;margin:3px 0}.d2-eye i{display:block;height:100%}
@media (max-width:700px){.d2-wrap{grid-template-columns:1fr}.d2-tree{border-right:none;border-bottom:1px solid var(--line)}}
</style>`;
function bindAll(root){
  root.querySelectorAll('.d2-pb').forEach(g=>g.onclick=()=>A.eqPress());
  root.querySelectorAll('.d2-dip').forEach(g=>g.onclick=()=>A.dip(+g.dataset.i));
  root.querySelectorAll('.d2-h1').forEach(g=>g.onclick=()=>A.jumperH1());
  root.querySelectorAll('.d2-in').forEach(g=>g.onclick=()=>A.src(!worldAt(SIM.t).src.on));
  root.querySelectorAll('.d2-out').forEach(g=>g.onclick=()=>A.load(+g.dataset.o));
  root.querySelectorAll('.d2-slot').forEach(g=>g.onclick=()=>A.slot(+g.dataset.s));
  root.querySelectorAll('[data-dt]').forEach(b=>b.onclick=()=>{ D.ui.dashTab=b.dataset.dt; SIM.refresh(); });
  root.querySelectorAll('.d2-body input[type=radio]').forEach(r=>r.onchange=()=>A.dashSet(+r.dataset.o,+r.dataset.v));
  root.querySelectorAll('.d2-body select[data-o]').forEach(r=>r.onchange=()=>A.dashSet(+r.dataset.o,+r.value));
  root.querySelectorAll('[data-get]').forEach(b=>b.onclick=()=>A.dashGet(+b.dataset.get));
  root.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>A.dashSet(0x0301,0));
  root.querySelectorAll('[data-da]').forEach(b=>b.onclick=()=>{ const k=b.dataset.da; if (k==='open') A.dashOpen(); if (k==='refresh') A.dashRefresh(); if (k==='reboot') A.dashReboot(); if (k==='upload'){ const s=root.querySelector('#d2File'); A.upload(s?s.value:'cob'); } });
}
function controlsHTML(){ const w=worldAt(SIM.t); const opt=(v,cur,l)=>`<option value="${v}" ${v===cur?'selected':''}>${l}</option>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px" class="small">
   <label><input type="checkbox" id="d2Src" ${w.src.on?'checked':''}> AES source on IN1</label>
   <label>rate <select id="d2Fs">${SR.map(r=>opt(r,w.src.fs,r/1000+' kHz')).join('')}</select></label>
   <label>cable <select id="d2Len">${[2,20,40,100,150,200,250,300,350,450,600,900,1200].map(v=>opt(v,w.src.len,v+' m')).join('')}</select></label>
   <label>FPGA <select id="d2Fpga">${Object.keys(FPGAS).map(k=>opt(k,w.fpga,FPGAS[k].short)).join('')}</select></label>
   <label>rear <select id="d2Rear">${Object.keys(REARS).map(k=>opt(k,w.rear,k)).join('')}</select></label>
   ${REARS[w.rear].dual?`<label>card # <select id="d2Pos">${opt(1,w.pos,'1 (right column)')}${opt(2,w.pos,'2 (left column)')}</select></label>`:''}
   <label>build <select id="d2Brand">${Object.keys(BRANDS).map(k=>opt(k,w.brand,k)).join('')}</select></label>
   <button id="d2Ins">${w.card?'Pull card':'Insert card'}</button><button id="d2Err">CAN error</button>
   <button id="d2Next" title="Carry the state at 1.000 s into a new second">Next second ▶</button><button id="d2Rst">Reset</button>
   <label title="After an action, move the playhead 25 ms past it"><input type="checkbox" id="d2Fol" ${D.ui.follow?'checked':''}> follow</label></div>`; }
function bindControls(root){ const q=s=>root.querySelector(s); if (!q('#d2Src')) return;
  q('#d2Src').onchange=e=>A.src(e.target.checked); q('#d2Fs').onchange=e=>A.srcSet('fs',+e.target.value); q('#d2Len').onchange=e=>A.srcSet('len',+e.target.value);
  q('#d2Fpga').onchange=e=>A.fpga(e.target.value); q('#d2Rear').onchange=e=>A.rear(e.target.value); q('#d2Brand').onchange=e=>A.brand(e.target.value);
  const ps=q('#d2Pos'); if (ps) ps.onchange=e=>{ act('Rear position → card #'+e.target.value, tr=>{ tr('This card now uses the '+(e.target.value==='1'?'right':'left')+' column of the dual module.'); worldEv('pos', w2=>{ w2.pos=+e.target.value; }); }); };
  q('#d2Ins').onclick=()=> worldAt(SIM.t).card? A.remove() : A.insert(); q('#d2Err').onclick=()=>A.canErr();
  q('#d2Next').onclick=()=>{ rollSecond(); SIM.refresh(); }; q('#d2Rst').onclick=()=>{ resetAll(); SIM.seek(0); }; q('#d2Fol').onchange=e=>{ D.ui.follow=e.target.checked; }; }
document.addEventListener('keydown', e=>{ if (!window[KEYFLAG] || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase(), m={ e:()=>A.eqPress(), i:()=>A.src(!worldAt(SIM.t).src.on), o:()=>A.dashOpen(), h:()=>A.jumperH1(), n:()=>{ rollSecond(); SIM.refresh(); } };
  if (m[k]){ m[k](); e.preventDefault(); } });

/* =====================================================================
   TIMELINE LANES
   ===================================================================== */
function runs(fn){ const R=sim(); const out=[]; let cur=null; R.snaps.forEach(sn=>{ const v=fn(sn); if (!cur||cur.v!==v){ if (cur) cur.t1=sn.t; cur={t0:sn.t,v}; out.push(cur); } }); if (cur) cur.t1=1; return out; }
function lanes(){ const R=sim(), css=n=>SIM.css(n), ls=[];
  const txt=(c,s,x,y)=>{ c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(s,x,y); };
  const band=(c,X,y,h,r,col,lab)=>r.forEach(g=>{ const cc=col(g.v); if (!cc) return; c.fillStyle=cc; c.globalAlpha=.55; c.fillRect(X(g.t0),y+5,Math.max(1,X(g.t1)-X(g.t0)),h-10); c.globalAlpha=1; const wpx=X(g.t1)-X(g.t0); if (lab && wpx>70){ c.save(); c.beginPath(); c.rect(X(g.t0),y,wpx,h); c.clip(); txt(c,lab(g.v),Math.max(X(g.t0),0)+4,y+h/2+4); c.restore(); } });
  const appOnly=(c,X,y,h,draw)=>{ runs(sn=>sn.mode==='app').forEach(g=>{ if (!g.v) return; c.save(); c.beginPath(); c.rect(X(g.t0),y,X(g.t1)-X(g.t0),h); c.clip(); draw(); c.restore(); }); };
  ls.push({label:'Card mode (boot · app · wdt · loader)', h:28, draw(c,X,t0,t1,y,h){ band(c,X,y,h,runs(sn=>sn.mode),v=>v==='app'?css('--accent'):v==='boot'?css('--warn'):v==='off'?css('--grid'):css('--bad'),v=>v);
    R.segs.forEach(g=>{ const wp=X(g.t1)-X(g.t0); c.strokeStyle=css('--ink2'); c.strokeRect(X(g.t0),y+4,Math.max(1,wp),h-8); if (wp>160){ c.save(); c.beginPath(); c.rect(X(g.t0),y,wp,h); c.clip(); txt(c,g.label,X(g.t0)+4,y+h/2+4); c.restore(); } }); }});
  ls.push({label:`main() passes (${C.LOOP_T*1e6} µs ${'inferred'})`, h:24, draw(c,X,t0,t1,y,h){ appOnly(c,X,y,h,()=>SIM.pulses(c,X,t0,t1,y,h,C.LOOP_T,0.00002,C.LOOP_T*0.3,css('--accent2'),'passes')); }});
  ls.push({label:'CS8416 lock (reg 0x0C) · RXSEL', h:26, draw(c,X,t0,t1,y,h){ band(c,X,y,h,runs(sn=>sn.mode==='app'?(sn.A?'L':'U')+(sn.reg4===0x89?'1':'0'):'-'),v=>v[0]==='L'?css('--accent'):v[0]==='U'?css('--bad'):null,v=>(v[0]==='L'?'locked':'NO LOCK')+' · RXP'+v[1]+(v[1]==='1'?' (EQ)':' (flat)')); }});
  ls.push({label:'CS8416_write1(0x04) every pass', h:22, draw(c,X,t0,t1,y,h){ appOnly(c,X,y,h,()=>SIM.pulses(c,X,t0,t1,y,h,C.LOOP_T,0.00002+C.LOOP_T*0.35,C.LOOP_T*0.22,css('--warn'),'reg 0x04 writes')); }});
  ls.push({label:'ALTERA_write word (bit 15 = no_lock)', h:24, draw(c,X,t0,t1,y,h){ band(c,X,y,h,runs(sn=>sn.mode==='app'?sn.word:-1),v=>v<0?null:(v&0x8000)?css('--bad'):css('--accent2'),v=>'0x'+hx(v,4)+((v&0x8000)?' mute':' run')); }});
  ls.push({label:'Timer0 ISR 1 ms', h:20, draw(c,X,t0,t1,y,h){ appOnly(c,X,y,h,()=>SIM.pulses(c,X,t0,t1,y,h,C.T0,0.0005,20e-6,css('--ink2'),'timer0')); }});
  ls.push({label:'Timer1 ISR 96 µs → heartbeat', h:24, draw(c,X,t0,t1,y,h){ appOnly(c,X,y,h,()=>SIM.pulses(c,X,t0,t1,y,h,C.T1_TICK,0.00004,8e-6,css('--ink2'),'timer1 ticks'));
    R.can.filter(f=>f.type===0x10||f.type===0x11).forEach(f=>{ const x=X(f.t); c.fillStyle=css('--play'); c.fillRect(x-1,y+1,3,h-2); }); }});
  ls.push({label:'CAN bus 1 Mbit/s (▼ rx ▲ tx)', h:30, draw(c,X,t0,t1,y,h){ R.can.forEach(f=>{ if (f.t+f.dur<t0||f.t>t1) return; const x0=X(f.t), x1=X(f.t+f.dur); c.fillStyle=f.dir==='rx'?css('--accent2'):css('--accent'); c.fillRect(x0,f.dir==='rx'?y+3:y+h/2,Math.max(1.5,x1-x0),h/2-4); if (x1-x0>90){ c.save(); c.beginPath(); c.rect(x0,y,x1-x0,h); c.clip(); txt(c,f.desc,x0+3,f.dir==='rx'?y+13:y+h-6); c.restore(); } }); }});
  ls.push({label:'AES3 input frames', h:22, draw(c,X,t0,t1,y,h){ runs(()=>0); const ws=sim().worlds; ws.forEach((x,i)=>{ const a=x.t, b=i+1<ws.length?ws[i+1].t:1; if (!x.w.src.on||!x.w.card) return; c.save(); c.beginPath(); c.rect(X(a),y,X(b)-X(a),h); c.clip(); SIM.pulses(c,X,Math.max(t0,a),Math.min(t1,b),y,h,1/x.w.src.fs,0,0.1/x.w.src.fs,css('--accent2'),'frames @ '+x.w.src.fs/1000+'k'); c.restore(); }); }});
  ls.push({label:'AES out (OUT1–4 → AES1–8)', h:26, draw(c,X,t0,t1,y,h){ band(c,X,y,h,runs(sn=>sn.outOn?1:0),v=>v?css('--accent'):css('--bad'),v=>v?'8 outputs running (4 FPGA pins × 2 drivers)':'outputs held low / idle'); }});
  ls.push({label:'LEDs LOCK1 · NO LOCK1 · EQ1 · COM', h:30, draw(c,X,t0,t1,y,h){ const w=worldAt(0); [['lock','#3fbf5f'],['nolock','#e3453a'],['eq','#e8b23a'],['com','#3fbf5f']].forEach(([k,col],i)=>{ runs(sn=>ledsOf(sn,w)[k]).forEach(g=>{ if (!g.v) return; c.fillStyle=col; c.fillRect(X(g.t0),y+3+i*6.5,Math.max(1.5,X(g.t1)-X(g.t0)),5); }); }); }});
  ls.push({label:'SW1 · debounce (255 passes)', h:22, draw(c,X,t0,t1,y,h){ band(c,X,y,h,runs(sn=>sn.pbRel?'r':sn.pb?'p':''),v=>v==='p'?css('--warn'):v==='r'?css('--ink2'):null,v=>v==='p'?'pressed':'debounce'); }});
  return ls; }

/* ---------------- AES output frame and input eye ---------------- */
function outSample(t){ const sn=snapAt(t), w=worldAt(t); if (!sn.outOn || !w.src.on) return 0; const n=Math.floor(t*w.src.fs); return Math.pow(10,w.src.dbfs/20)*Math.sin(2*Math.PI*w.src.f*n/w.src.fs); }
function aesFrame(t){ const w=worldAt(t), F=FPGAS[w.fpga], fs=w.src.fs, n=Math.floor(t*fs), fr=n%192; const v=outSample(t);
  const cs0=[1,0,0,0,0,0,0,0]; // source assumed to send professional channel status (byte 0 bit 0 = 1) — inferred
  return {n,fr,fs,sub:[0,1].map(side=>{ let s=Math.round(v*8388607); if (s<0) s+=1<<24; const b=new Array(32).fill(0); for (let i=0;i<24;i++) b[4+i]=(s>>i)&1;
    b[28]=0; b[29]=0; b[30]= F.cuv==='pass'? (fr<8? cs0[fr]:0) : 0; let p=0; for (let i=4;i<31;i++) p^=b[i]; b[31]=p; return {pre:side?'Y':(fr===0?'Z':'X'),bits:b,v,raw:s}; })}; }
function biphase(pre,bits,start){ const P={X:[1,1,1,0,0,0,1,0],Y:[1,1,1,0,0,1,0,0],Z:[1,1,1,0,1,0,0,0]}[pre]; const lv=[]; const inv=start?0:1; P.forEach(b=>lv.push(inv?1-b:b)); let cur=lv[lv.length-1]; for (let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if (bits[i]) cur=1-cur; lv.push(cur); } return lv; }
function drawScope(cv, el, t){ const sn=snapAt(t), w=worldAt(t), F=aesFrame(t); const {c,w:W}=SIM.canvas(cv,150); const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), bad=SIM.css('--bad');
  c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText('AES output (AES1–AES8 identical): one frame, sub-frames A and B', 10, 12);
  if (!sn.outOn){ c.strokeStyle=bad; c.lineWidth=2; c.beginPath(); c.moveTo(10,74); c.lineTo(W-10,74); c.stroke(); c.fillStyle=bad; c.fillText(FPGAS[w.fpga].run? 'held low: i2s8416_aes “off” (aes1_lock = NO)' : 'no AES: the clock-probe bitstream drives no outputs', 14, 66); el.innerHTML='<span class="muted">No output frame at the playhead.</span>'; return; }
  const a=biphase(F.sub[0].pre,F.sub[0].bits,0), b=biphase(F.sub[1].pre,F.sub[1].bits,a[a.length-1]); const lv=a.concat(b); const cw=(W-20)/lv.length;
  c.strokeStyle=ink; c.lineWidth=1.5; c.beginPath(); lv.forEach((v,i)=>{ const x=10+i*cw, yy=v?30:78; i?c.lineTo(x,yy):c.moveTo(x,yy); c.lineTo(x+cw,yy); }); c.stroke();
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`frame ${F.n.toLocaleString()} · ${F.fr}/191 of the block · cell ${SIM.fmtDur(1/(F.fs*128))} · fs ${F.fs/1000} kHz`,10,104);
  const p=rxPath(w, sn.reg4===0x89); c.fillText(`input eye at RXP${sn.reg4===0x89?1:0}: ${p.eye.toFixed(2)} V (${(p.frac*100).toFixed(0)} % open) · cable loss ${p.loss.toFixed(1)} dB ${'(inferred model)'}`,10,124);
  el.innerHTML=F.sub.map((s,i)=>`${i?'B':'A'} ${s.v.toFixed(4)} → 0x${s.raw.toString(16).padStart(6,'0').toUpperCase()} · V=${s.bits[28]} U=${s.bits[29]} C=${s.bits[30]} P=${s.bits[31]}`).join('<br>')+
   `<br><span class="muted">${FPGAS[w.fpga].cuv==='pass'? 'EP1C3: V/U/C and the Z (block start) come from the CS8416’s AES3-format SDOUT (reg 0x05 = 0xB0), so the input’s channel status passes through; the source is assumed to send “professional” '+inf+'.' : 'Lattice I2SX4_AES: c1/u1/v1 left open → C = U = V = 0: channel status reads “consumer, nothing set” '+inf+'.'}</span>`; }

/* =====================================================================
   VIEWS
   ===================================================================== */
function card(title, body){ return `<div class="card"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> <span class="muted">at ${SIM.fmtT(D.log[0].t)} (second ${D.log[0].sec})</span></div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Use the card, the rear module or the parameter window. Each step the firmware takes is listed here with the names from the source.</div>'; }
function signalHTML(t){ const w=worldAt(t), sn=snapAt(t); const p0=rxPath(w,false), p1=rxPath(w,true); const bar=(p)=>`<div class="d2-eye"><i style="width:${Math.min(100,p.eye/1.5*100).toFixed(0)}%;background:${p.ok?'var(--accent)':'var(--bad)'}"></i></div>`;
  return `<table class="kv"><tr><th>Input</th><td>${p0.conn} · ${w.src.on?w.src.fs/1000+' kHz, '+w.src.len+' m':'unplugged'} · H1 = ${w.H1} Ω (Γ ${p0.gamma.toFixed(2)})</td></tr>
   <tr><th>RXP0 flat ${sn.reg4===0x80?'◂':''}</th><td>${p0.eye.toFixed(2)} V · ${p0.why}${bar(p0)}</td></tr>
   <tr><th>RXP1 EQ ${sn.reg4===0x89?'◂':''}</th><td>${p1.eye.toFixed(2)} V · ${p1.why}${bar(p1)}</td></tr>
   <tr><th>Outputs</th><td>${sn.outOn?'running':'held low / idle'} · reach the rear: ${[...rearOutputs(w)].sort().map(n=>'AES'+n).join(', ')||'none'}</td></tr></table>
   <p class="small muted">Cable loss, EQ lift and the 200 mV threshold are an ${inf} model; the circuit (T1A, H1, U1A gain 2, U1B equaliser, 75R pads, RXP0/RXP1) is from the ISS3 netlist.</p>`; }
function inspHTML(t){ const sn=snapAt(t), w=worldAt(t), R=sim(), st=stepAt(t), f0=D.s0.f; const recent=R.notes.filter(n=>n.t<=t).slice(-5).reverse();
  return `<table class="kv"><tr><th>Second</th><td class="mono">#${D.second} · ${SIM.fmtT(t)} · ${D.ev.length} event(s)</td></tr>
   <tr><th>Card</th><td class="mono">${sn.mode}${st.seg?' — '+st.seg.label:st.step!==undefined?' — '+STEPS[st.step][0]:''}</td></tr>
   <tr><th>slot / mod_address</th><td class="mono">${w.slot} · ADC ${slotAdc(w.slot)} → ${ADDRESS_TABLE(slotAdc(w.slot))} · 0x${hx(0x10+w.slot)}</td></tr>
   <tr><th>Astatus · aes1_lock</th><td class="mono">${sn.A?'BIT0 (locked)':'0 (no lock)'} · ${sn.lock?'YES':'NO'}</td></tr>
   <tr><th>eq1_active · reg 0x04</th><td class="mono">${sn.eq?'YES':'NO'} · 0x${hx(sn.reg4)} (RXSEL ${sn.reg4===0x89?1:0})</td></tr>
   <tr><th>FPGA word</th><td class="mono">0x${hx(sn.word,4)} · q15 no_lock ${(sn.word>>15)&1} · q3/q2 tones off · q1/q0 = 00 (1×8) · q4 0 (no SRC) · ${FPGAS[w.fpga].short}</td></tr>
   <tr><th>Reports</th><td class="mono">parameter_refresh ${PR_NAMES[sn.pr]||sn.pr} · change ${sn.pc} · dashboard_initializing ${sn.dinit}</td></tr>
   <tr><th>DIP (PINA)</th><td class="mono">${w.dip.map(x=>x?1:0).join('')} — ignored</td></tr>
   <tr><th>EEPROM</th><td class="mono">[10] ${f0.ee.aa?'0xAA':'—'} [14] tone ${f0.ee.tone===0xFF?'—':f0.ee.tone} · BOOT_CONTROL 0x${hx(f0.ee.bootc)} <span class="muted">(start of this second)</span></td></tr>
   <tr><th>Firmware notes</th><td class="small mono">${recent.map(n=>SIM.fmtT(n.t)+' '+n.s).join('<br>')||'—'}</td></tr></table>`; }
function canLogHTML(t){ const rows=sim().can.filter(f=>f.t<=t).slice(-40).reverse();
  return rows.map(f=>`<div><span class="muted">${SIM.fmtT(f.t)}</span> ${f.dir==='rx'?'<b style="color:var(--accent2)">▼ rx</b>':'<b>▲ tx</b>'} id 0x${hx(canId(f.src,f.dst,f.type,f.flags),8)} [${f.data.length}] ${f.desc}</div>`).join('') || '<div class="muted">No CAN frames yet in this second.</div>'; }
function rearInfoHTML(t){ const w=worldAt(t), RM=REARS[w.rear], outs=rearOutputs(w);
  const role=p=>{ if (RM.dual && p[3]!==w.pos) return 'other card'; if (p[2]==='in') return 'IN1 → P1-97 / BNC1_GND'; if (p[2]==='nc') return 'P1-92 BNC2 → T1B (D6202B input 2; nothing fitted behind it)'; const n=+p[2].slice(1); return `AES${n} P1-${AESPIN[n]} ← ${DRVOF(n)} ← OUT${OUTOF(n)}`; };
  const id=[adcOf(RM.id[0]),adcOf(RM.id[1])];
  return `<b>${RM.name}</b><table class="kv" style="margin-top:4px">${RM.pos.map(p=>`<tr><td>${p[0]}</td><td>${p[1]}</td><td class="small">${role(p)}</td></tr>`).join('')}</table>
   <div class="small" style="margin-top:4px">${outs.size} of 8 outputs reach connectors. ID resistors AN_BMID ${rTxt(RM.id[0])} / AN_BMID2 ${rTxt(RM.id[1])}: a zeuslib card would read bins ${binOf(id[0])}.${binOf(id[1])} (t6203.js method); the D6202A firmware never converts ADC1/ADC2.</div><div class="muted small">Source: ${RM.src}.</div>`; }
function viewSim(m){ window[KEYFLAG]=true;
  m.innerHTML=CSS+`<div class="grid2"><div>${card('Frame, card and card edge at the playhead',`<div id="frm"></div><div style="display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:10px;align-items:start;margin-top:8px"><div id="crd"></div><div id="edge"></div></div>
     <div class="small muted" style="margin-top:4px">Card = D6202A ISS4 top side from the gerbers (TOP + TSM + OTL + TSS, 120 dpi). Hatched = not fitted on a D6202A (PnP program). Click SW1 (EQ1), the DIP switch and jumper H1; click a frame slot to move the card. Keys: E EQ1 · I input cable · H H1 · O open in DashBoard · N next second.</div><div id="wc"></div>`)}</div>
   <div>${card('Parameter window (DashBoard-style, generic)',`<div id="dash"></div>`)}${card('What the firmware did (last action)',`<div id="trace" class="log"></div>`)}</div></div>
   <div class="grid2"><div>${card('Rear module — click IN1 to plug/unplug, an output to connect/remove its 110 Ω load',`<div style="display:grid;grid-template-columns:270px minmax(0,1fr);gap:12px"><div><div id="rear"></div><div class="small" style="margin-top:4px">${ARTCITE}</div></div><div id="rinfo" class="small"></div></div>`)}</div>
   <div>${card('Signal path at the playhead',`<div id="sig"></div>`)}${card('State at the playhead',`<div id="insp"></div>`)}</div></div>
   ${card('Timeline — one second as the card, the bus and the outputs see it (click to seek)',`<canvas id="tl"></canvas><p class="small muted">Boot waits, timer periods and CAN bit rate come from the code and register values. Pass time, CS8416 lock time, watchdog, frame-controller pacing and the heartbeat phase are ${inf}. Changes are events at the playhead; “Next second” carries the end state forward.</p>`)}
   <div class="grid2">${card('CAN frames (newest first)',`<div id="canlog" class="log"></div>`)}${card('Scope: AES output frame at the playhead',`<canvas id="scope"></canvas><div id="bits" class="small mono"></div>`)}</div>`;
  let wv=-1;
  const draw=()=>{ const t=SIM.t; finishUpload(); if (wv!==D.ver){ wv=D.ver; m.querySelector('#wc').innerHTML=controlsHTML(); bindControls(m); }
    m.querySelector('#frm').innerHTML=frameSVG(t); m.querySelector('#crd').innerHTML=cardSVG(t); m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#dash').innerHTML=dashHTML(t);
    m.querySelector('#rear').innerHTML=rearSVG(t); m.querySelector('#rinfo').innerHTML=rearInfoHTML(t); m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#sig').innerHTML=signalHTML(t);
    m.querySelector('#insp').innerHTML=inspHTML(t); m.querySelector('#canlog').innerHTML=canLogHTML(t); SIM.drawLanes(m.querySelector('#tl'),lanes(),{labelW:210}); drawScope(m.querySelector('#scope'),m.querySelector('#bits'),t); bindAll(m); };
  SIM.on('time',draw); let last=0; SIM.on('frame',ts=>{ if (D.ui.upl && !D.ui.upl.applied && ts-last>250){ last=ts; draw(); } }); }

/* ---------------- tutorial (no D6202A manual in the archive: built from the functional and card-edge drawings and the code) ---------------- */
const endS=()=>sim().end;
const LESSONS=[
 {title:'Meet the D6202A', body:`<p>The D6202A is an openGear <b>AES distribution amplifier</b>: one balanced 110 Ω AES3 input, eight transformer-isolated 110 Ω outputs, all carrying the same re-clocked stream (functional drawing: input → cable EQ → reclock → 8 drivers).</p><p>It is the D6202B board with the second input, the sample-rate converter and the local oscillator left off (pick-and-place program). Controls: the <b>EQ1</b> push-button on the card edge, jumper <b>H1</b> (input termination), and <b>DashBoard</b> through the frame controller.</p><p class="muted">No D6202A, ADA-8401-B or 9252 manual is in the archive; the steps follow the drawings and the v104 firmware.</p>`, check:()=>true, auto:true},
 {title:'1 · Pick the rear module', body:`<p>The functional drawing offers <b>T6203A</b> (DFR-8310 frames), <b>T6303A</b> (DFR-8320) and <b>T6403A</b> (dual, MF6220); a T6204 drawing gives two BNC inputs. Single-card modules bring out all eight outputs; on the dual T6403 each card gets its input and <b>AES1–AES4</b> only (“outputs 5 to 8 are available for single card”).</p><p><b>Goal:</b> fit a T6303.</p>`, check:()=>worldAt(1).rear==='T6303', hint:'Controls → rear: T6303.'},
 {title:'2 · Terminate the input', body:`<p>Jumper <b>H1</b> next to the input transformer T1A chooses the termination across its secondary: <b>75</b> (R8 75R) or <b>110</b> (R9 110 Ω). Use 110 Ω for balanced pair on a terminal block, 75 Ω for coax on the T6204’s BNC.</p><p><b>Goal:</b> H1 matches the input connector.</p>`, check:()=>{ const w=worldAt(1); return w.H1===(inputIsBnc(w)?75:110); }, hint:'Click H1 on the card (top right, beside T1A).'},
 {title:'3 · Connect the source and watch it lock', body:`<p>Click the IN1 terminal block on the rear module. The CS8416 locks (≈20 ms ${inf}); on the next main-loop pass the firmware reads register 0x0C = 0, lights <b>LOCK1</b> green, and clears the mute bit it sends to the FPGA, so all eight outputs start.</p><p><b>Goal:</b> locked at the end of the second.</p>`, check:()=>endS().f.lock===1, hint:'Click IN1 on the rear module (or press I).'},
 {title:'4 · Long cable: use the EQ', body:`<p>Set the cable to <b>300 m</b>. The flat input (RXP0) loses lock: NO LOCK1 goes red and every output is held low. Press <b>EQ1</b>: the AVR writes CS8416 register 0x04 = 0x89, switching the receiver to <b>RXP1</b>, which is fed by the EL5263 equaliser stage. EQ1 lights yellow and the input locks again.</p><p><b>Goal:</b> locked through a cable of 250 m or more with EQ on.</p>`, check:()=>{ const e=endS(); return e.f.lock===1 && e.f.eq===1 && e.w.src.len>=250; }, hint:'cable → 300 m; then click SW1 on the card or the card edge (E).'},
 {title:'5 · The outputs', body:`<p>The FPGA drives four pins (OUT1–OUT4); each feeds two DS34LV87T drivers, a 110 Ω resistor, a 0.1 µF capacitor and a PE-65612 transformer, so eight isolated outputs. Click an output on the rear module to load or unload it: the others don’t care. Unplug the input and watch the timeline: with the EP1C3 image the outputs are <b>held low</b>, not filled with silence.</p><p><b>Goal:</b> source unplugged, outputs held low.</p>`, check:()=>{ const e=endS(); return !e.w.src.on && e.w.fpga==='EP1C3'; }, hint:'Click IN1 again.'},
 {title:'6 · Find it in DashBoard', body:`<p>Reconnect the input, then press <b>Open / rescan</b>. The frame controller reads the card’s object tree over CAN; long answers go out one 8-byte frame per 96 µs timer tick.</p><p><b>Goal:</b> more than 20 requests answered in this second.</p>`, check:()=>sim().can.filter(f=>f.dir==='rx').length>20, hint:'Press “Open / rescan”.'},
 {title:'7 · Status and alarms', body:`<p><b>Card Status</b> and <b>AES Input</b> are alarm tables. Turn on <b>Notify on Card Fault</b> (Control ▸ Card Settings): AES Input then reports BIT2 (alarm) instead of BIT1 when unlocked, and Card Status reports “No AES Audio Lock”. The card only tells DashBoard on its heartbeat, up to ≈1 s later.</p><p><b>Goal:</b> Notify on Card Fault enabled.</p>`, check:()=>endS().f.notify===1, hint:'Control ▸ Card Settings → Notify on Card Fault: Enabled.'},
 {title:'8 · EQ from DashBoard', body:`<p>The <b>Equalizer</b> radio does the same as the push-button (OID 3.2). The reply comes straight from the CAN interrupt; the CS8416 is switched on the next pass.</p><p><b>Goal:</b> set Equalizer from DashBoard.</p>`, check:()=>D.log.some(l=>/set Equalizer/.test(l.name)), hint:'Control ▸ Card Settings → Equalizer.'},
 {title:'9 · “Save”', body:`<p>OID 3.1 <b>Settings → Save</b> is in the parameter list but in no menu, so a normal DashBoard view never shows it. Send it by hand: the card writes EEPROM [10] = 0xAA and [14] = <i>tone_generation</i> — not the EQ, not Notify. And <span class="mono">RESTORE_INFORMATION_EEPROM()</span> is never called.</p><p><b>Goal:</b> EEPROM marker written.</p>`, check:()=>D.s0.f.ee.aa===0xAA || endS().f.ee.aa===0xAA, hint:'Card Settings → “send SET 3.1 by hand”.'},
 {title:'10 · Reboot', body:`<p>Press <b>Reboot</b>. The card answers, stops feeding the watchdog, resets after ≈16 ms ${inf} and runs main()’s ${(BOOT_T*1000).toFixed(0)} ms of start-up waits (slot ID: 100 ADC samples). The EQ comes back <b>off</b> whatever was “saved”.</p><p><b>Goal:</b> the card has rebooted with EQ off.</p>`, check:()=>sim().segs.some(g=>g.kind==='boot') && endS().f.eq===0, hint:'Press Reboot, then let the second run.'},
 {title:'11 · The FPGA switch', body:`<p>Switch <b>FPGA</b> to the Lattice options. The I2SX4 bitstream rebuilds AES from the CS8416’s I2S with channel-status bits tied to 0 and nothing to mute the outputs; the 2008 bitstream is a clock probe with no AES out at all. Compare the scope with the EP1C3 image.</p><p><b>Goal:</b> a Lattice variant selected.</p>`, check:()=>worldAt(1).fpga!=='EP1C3', hint:'Controls → FPGA.'},
 {title:'12 · Field upgrade', body:`<p>From V103 the card carries the Ross bootloader. Choose <span class="mono">9252_v1_04.bin</span> (the archived build is the Cobalt one) and <b>Upload</b>. Try the D6203A file too: the loader refuses it.</p><p><b>Goal:</b> a successful upload.</p>`, check:()=>!!(D.ui.upl&&D.ui.upl.applied&&FILES[D.ui.upl.file].pages), hint:'Pick 9252_v1_04.bin → Upload… and wait.'},
 {title:'Done', body:`<p>The <b>Software</b> tab shows the same operations from inside the AVR and FPGA; <b>Findings</b> lists what the code is really doing.</p>`, check:()=>true, auto:true},
];
function viewTutorial(m){ window[KEYFLAG]=true;
  m.innerHTML=CSS+`<div class="grid2"><div>${card('Tutorial — installing and running a D6202A',`<ol id="les" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('What the firmware did',`<div id="trace" class="log"></div>`)}</div>
   <div>${card('Frame, card and rear module',`<div id="frm"></div><div style="display:grid;grid-template-columns:minmax(0,1fr) 200px;gap:8px;margin-top:6px"><div id="crd"></div><div id="rear"></div></div><div id="wc"></div>`)}${card('Parameter window',`<div id="dash"></div>`)}<div class="grid2">${card('Card edge',`<div id="edge"></div>`)}${card('Signal',`<div id="sig"></div>`)}</div></div></div>`;
  let wv=-1;
  const draw=()=>{ const t=SIM.t; finishUpload(); if (wv!==D.ver){ wv=D.ver; m.querySelector('#wc').innerHTML=controlsHTML(); bindControls(m); }
    m.querySelector('#frm').innerHTML=frameSVG(t); m.querySelector('#crd').innerHTML=cardSVG(t,{labels:false}); m.querySelector('#rear').innerHTML=rearSVG(t); m.querySelector('#dash').innerHTML=dashHTML(t); m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#sig').innerHTML=signalHTML(t);
    const li=D.ui.lesson; m.querySelector('#les').innerHTML=LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===li?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<li?' ✓':''}</li>`).join('');
    m.querySelectorAll('#les li').forEach(x=>x.onclick=()=>{ D.ui.lesson=+x.dataset.i; draw(); });
    const L=LESSONS[li]; let ok=false; try{ ok=L.check(); }catch(e){}
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${li?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${li<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div><p class="small muted">Goals are checked against the end of the simulated second.</p>`;
    m.querySelector('#prv').onclick=()=>{ D.ui.lesson=Math.max(0,li-1); draw(); }; m.querySelector('#nxt').onclick=()=>{ D.ui.lesson=Math.min(LESSONS.length-1,li+1); draw(); }; m.querySelector('#rs').onclick=()=>{ resetAll(); D.ui.lesson=0; SIM.seek(0); };
    bindAll(m); };
  SIM.on('time',draw); let last=0; SIM.on('frame',ts=>{ if (D.ui.upl && !D.ui.upl.applied && ts-last>250){ last=ts; draw(); } }); }

/* ---------------- one second, frame by frame ---------------- */
function viewSecond(m){ window[KEYFLAG]=true;
  m.innerHTML=CSS+`${card('One second, broken down',`<div id="ladder"></div>`)}<div class="grid2">${card('As seen by the card',`<div id="dev"></div>`)}${card('As seen by the displays',`<div style="display:grid;grid-template-columns:130px minmax(0,1fr);gap:10px"><div id="edge"></div><div id="dv"></div></div><h3>Meter on AES1 (downstream)</h3><canvas id="meter"></canvas><p class="small muted">Peak over the last 10 ms ${inf}.</p>`)}</div>${card('Zoom ladder at the playhead (AES output, scaled)',`<canvas id="zl"></canvas>`)}`;
  const draw=()=>{ const t=SIM.t, sn=snapAt(t), R=sim(), w=worldAt(t), fs=w.src.fs; const tx=R.can.filter(f=>f.dir==='tx').length, rx=R.can.length-tx;
    const rows=[
      ['main() passes', R.passes.toLocaleString(), SIM.fmtDur(C.LOOP_T)+' '+inf, 'CS8416 lock read, EQ button, CS8416 reg 0x04 write, LEDs, 16-bit FPGA word, PARAMETER_UPDATE'],
      ['CS8416 register 0x04 writes', R.passes.toLocaleString(), SIM.fmtDur(C.LOOP_T), 'PROCESS_MODES rewrites 0x80/0x89 on every pass (24 bits bit-banged on PC2/PC3)'],
      ['FPGA control words', R.passes.toLocaleString(), SIM.fmtDur(C.LOOP_T), 'ALTERA_write: 16 bits on PB5/PB4, strobe PB6 → shift_in16_version_out'],
      ['Timer0 interrupts', '1 000', '1 ms', 'WDR; once a second count CAN frames for this card → dashboard_initializing'],
      ['Timer1 interrupts', Math.round(1/C.T1_TICK).toLocaleString(), SIM.fmtDur(C.T1_TICK), 'next frame of a multi-frame answer, or count to the heartbeat'],
      ['Heartbeat REPORT_PARAM', sn.dinit? (1/((1000*w.slot+1)*C.T1_TICK)).toFixed(2) : (1/((C.TX_HEART+1)*C.T1_TICK)).toFixed(2), sn.dinit? SIM.fmtDur((1000*w.slot+1)*C.T1_TICK) : SIM.fmtDur((C.TX_HEART+1)*C.T1_TICK), sn.dinit? 'dashboard_initializing: 1000 × slot ticks' : '10 001 ticks; one parameter per report'],
      ['CAN frames this second', `${rx} rx · ${tx} tx`, SIM.fmtDur(frameTime(8)), '1 Mbit/s, 8-byte frame ≈144 µs with stuffing '+inf],
      ['EQ debounce after release', '—', SIM.fmtDur(C.DEBOUNCE*C.LOOP_T), '255 passes'],
      ['Boot (power-up to while(1))', '—', SIM.fmtDur(BOOT_T), '15 + 200 + 10 + 5 + 25 wait(3000) calls of 2.625 ms + 100 ADC conversions'],
      ['AES3 blocks', (fs/192).toFixed(2), SIM.fmtDur(192/fs), '192 frames; Z preamble and channel status from the CS8416 stream'],
      ['AES3 frames', fs.toLocaleString(), SIM.fmtDur(1/fs), 'one per input frame — the DA re-times, it does not resample'],
      ['AES3 bit cells (biphase)', (128*fs).toLocaleString(), SIM.fmtDur(1/fs/128), '8 copies on AES1–AES8 (4 FPGA pins × 2 drivers)'],
    ];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    const st=stepAt(t), F=aesFrame(t), fr=R.can.find(f=>f.t<=t && f.t+f.dur>=t);
    m.querySelector('#dev').innerHTML=`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
     <tr><th>AT90CAN128</th><td class="mono">${st.seg? st.seg.label : 'pass: '+STEPS[st.step][0]+'<br><span class="muted">'+STEPS[st.step][2]+'</span>'}</td></tr>
     <tr><th>timer1</th><td class="mono">tick #${Math.floor(t/C.T1_TICK)} · timer0 ms ${Math.floor(t*1000)}</td></tr>
     <tr><th>CAN bus</th><td class="mono">${fr?(fr.dir==='rx'?'▼ ':'▲ ')+fr.desc:'idle'}</td></tr>
     <tr><th>CS8416</th><td class="mono">${sn.A?'locked':'no lock'} · RXP${sn.reg4===0x89?1:0} · ${fs/1000} kHz</td></tr>
     <tr><th>FPGA</th><td class="mono">${FPGAS[w.fpga].short} · word 0x${hx(sn.word,4)} · ${sn.outOn?'aes_out running':'outputs low'}</td></tr>
     <tr><th>AES frame</th><td class="mono">${F.fr}/191 · ${F.sub[0].pre} · A ${F.sub[0].v.toFixed(4)}</td></tr></table>`;
    m.querySelector('#edge').innerHTML=edgeSVG(t); const c=cacheAt(t);
    m.querySelector('#dv').innerHTML=`<table class="kv"><tr><th>DashBoard shows</th><td></td></tr>${[0x0201,0x0202,0x0302,0x0400].map(o=>`<tr><td>${OID[o].name}</td><td class="mono small">${valTxt(o,c[o])}</td></tr>`).join('')}</table><p class="small muted">LEDs change on the next pass (≈${C.LOOP_T*1e6} µs); DashBoard waits for a report.</p>`;
    const {c:g,w:W}=SIM.canvas(m.querySelector('#meter'),36); let pk=0; for (let i=0;i<64;i++) pk=Math.max(pk,Math.abs(outSample(Math.max(0,t-0.01*i/64)))); const db=pk>0?20*Math.log10(pk):-99, segs=46, lit=Math.max(0,Math.min(segs,Math.round((db+60)/60*segs)));
    for (let s=0;s<segs;s++){ const x=10+s*(W-20)/segs; g.fillStyle=s<lit?(s>=segs-4?'#e3453a':s>=segs-12?'#e8b23a':'#3fbf5f'):SIM.css('--grid'); g.fillRect(x,6,(W-20)/segs-2,20); }
    g.fillStyle=SIM.css('--ink'); g.font='11px '+SIM.css('--mono'); g.fillText(db>-99?db.toFixed(1)+' dBFS':'— no signal',12,21);
    const levels=[['1 second',1],['1 heartbeat (≈96 ms window)',0.1],['1 AES block',192/fs],['1 ms',0.001],['1 AES frame',1/fs]]; const H=levels.length*44+10; const {c:z,w:zw}=SIM.canvas(m.querySelector('#zl'),H);
    levels.forEach(([nm,span],i)=>{ const y=8+i*44, t0=Math.max(0,Math.min(1-span,t-span/2)); z.fillStyle=SIM.css('--ink'); z.font='12px sans-serif'; z.fillText(nm+' ('+SIM.fmtDur(span)+')',6,y+14);
      const x0=210, pw=zw-x0-10; z.strokeStyle=SIM.css('--grid'); z.strokeRect(x0,y+2,pw,30); z.strokeStyle=SIM.css('--accent'); z.beginPath(); const N=Math.min(800,pw);
      for (let k=0;k<=N;k++){ const tt=t0+span*k/N, v=outSample(tt), yy=y+17-v*130; k?z.lineTo(x0+pw*k/N,Math.max(y+3,Math.min(y+31,yy))):z.moveTo(x0,yy); } z.stroke();
      const px=x0+(t-t0)/span*pw; z.strokeStyle=SIM.css('--play'); z.beginPath(); z.moveTo(px,y); z.lineTo(px,y+34); z.stroke(); }); };
  SIM.on('time',draw); }

/* ---------------- block diagram ---------------- */
const BLOCKS={
  pc:{x:10,y:10,w:150,h:56,t:'PC: DashBoard',s:['parameter editor','.bin upload'],d:'DashBoard talks to the frame controller over Ethernet. Everything it shows comes from the card’s CAN replies and heartbeat reports.'},
  mfc:{x:10,y:96,w:150,h:60,t:'Frame controller',s:['Ethernet ↔ CAN'],d:'Sends openGear CAN messages to slot + 0x10 and relays replies, reports and traps.'},
  mid:{x:10,y:186,w:150,h:96,t:'Midplane P2',s:['CANH P2-13 / CANL P2-11','AN_SLOTID P2-6','REF1 P2-14, REF2 P2-10','+12 V, −7.5 V'],d:'P2 (MEDAC20): power, CAN, the slot-ID resistor and two frame references (H4 → Q2: only used by the D6202B’s second receiver, not fitted here).'},
  rear:{x:10,y:312,w:150,h:110,t:'Rear module P1',s:['T6203 / T6204 / T6303 / T6403','IN1: P1-97 + BNC1_GND','AES1–8: P1-49…70','ID AN_BMID/BMID2 (unread)'],d:'P1 (MEDAC100): IN1 on BNC1_SIG (97) with the isolated BNC1_GND pins, IN2 on BNC2 (92, unused), and the eight AES pairs.'},
  can:{x:200,y:96,w:140,h:56,t:'SN65HVD233',s:['CAN transceiver, LBK = PD7'],d:'CAN_RX sets PD7 (loop-back) for the whole boot; CAN_TX clears it.'},
  mcu:{x:380,y:40,w:190,h:150,t:'AT90CAN128 @ 8 MHz',s:['main() super-loop','timer0 1 ms · timer1 96 µs','CAN ISR + DashBoard tables','SW1 EQ1 (PE2), LEDs PE0/1/3, PB0/1','DIP SW3 on PA (read, unused)'],d:'v100w.c + D6202B.c + CAN.c + Dashboard.c (ICCAVR 7.15, 27 492 bytes). A Ward-Beck super-loop with its own CAN driver and hand-built descriptor arrays, like the D6203A — not the zeuslib GearOS scheduler.'},
  inp:{x:200,y:230,w:150,h:110,t:'Input stage',s:['C1 → T1A PE-65612','H1: R8 75R / R9 110','U1A EL5263 ×2 → RXP0','U1B equaliser → RXP1'],d:'Transformer-isolated input, jumper-selected termination, one buffer for the flat path (IN1) and one equaliser (IN1_EQ). Both go to the CS8416; the AVR picks one with register 0x04.'},
  cs:{x:390,y:230,w:170,h:100,t:'CS8416 (U5)',s:['RXSEL 0 = IN1, 1 = IN1_EQ','SDOUT AES3 format (reg5 0xB0)','RMCK, GPO pass-through','reg 0x0C → Astatus'],d:'The AES receiver. Control port bit-banged on PC1/PC2/PC3, chip select PC6, reset PC7. U6, the second receiver, is not fitted.'},
  fpga:{x:610,y:40,w:200,h:200,t:'FPGA (U10)',s:['EP1C3T100 + EPCS (ISS2–ISS4)','shift_in16_version_out','i2s8416_aes (mute = off)','switch2x1 ×2 · tone_gen1 (off)','sw2x2x1x24 (SRC path, unused)','LFXP3: dsbxp layout only'],d:'The D6201B Quartus image: re-times the CS8416 stream into AES3 with its own V/U/C copy and mutes (holds low) on the no_lock bit. OUT1–OUT4 on pins 75/74/69/68.'},
  out:{x:850,y:40,w:180,h:200,t:'Output stage ×8',s:['U13: OUT1 → T1,T2 · OUT2 → T3,T4','U12: OUT3 → T5,T6 · OUT4 → T7,T8','DS34LV87T → 110 Ω → 0.1 µF','PE-65612 → P1 AESn','AES1–8 = 67/69 … 50/52'],d:'Each FPGA pin feeds two RS-422 drivers; each driver has its own 110 Ω source resistor, DC block and pulse transformer — eight isolated 110 Ω outputs.'},
  dnp:{x:610,y:290,w:200,h:100,t:'Fitted on the D6202B only',s:['U6 CS8416 #2, U3 EL5263 #2','U9 AD1895 SRC, X2 24.576 MHz','L5–L7, SW2'],d:'The pick-and-place programs for D6202A ISS3 leave these out; the same board with them fitted is the D6202B.'},
};
const WIRES=[['pc','mfc','Ethernet'],['mfc','mid','CAN'],['mid','can','CANH/L'],['can','mcu','TX/RX'],['mid','mcu','slot ID'],['rear','inp','IN1'],['inp','cs','RXP0/RXP1'],['mcu','cs','SPI-like port'],['cs','fpga','SDOUT/RMCK/LRCK/SCLK'],['mcu','fpga','FPGA2–4 word'],['fpga','out','OUT1–OUT4'],['out','rear','AES1–8']];
function viewBlock(m){ window[KEYFLAG]=false; m.innerHTML=`<div class="grid2"><div>${card('Block diagram — click a block',`<div id="bd"></div>`)}</div><div>${card('Block',`<div id="bdi"></div>`)}${card('Signal flow',`<p>Audio: rear IN1 → T1A → H1 → EL5263 (flat or equalised) → CS8416 → FPGA re-timing → 4 pins × 2 drivers → 8 transformers → rear AES1–AES8. Control: DashBoard → frame controller → CAN → AT90CAN128 → CS8416 register 0x04 and a 16-bit word to the FPGA, plus LEDs.</p><p class="small muted">From Functional.cdr, the ISS3 netlist and the D6201B .bdf.</p>`)}</div></div>`;
  const draw=()=>{ const sel=D.ui.block, ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 1040 430" style="width:100%"><defs><marker id="d2ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs><rect x="185" y="22" width="860" height="404" rx="10" fill="none" stroke="var(--line)" stroke-dasharray="5 4"/><text x="195" y="36" font-size="11" fill="var(--ink2)">D6202A card (ISS3 = ISS4 schematic)</text>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_); const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y,sx=dx?(bx.w/2)/Math.abs(dx):1e9,sy=dy?(bx.h/2)/Math.abs(dy):1e9,k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b; s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.2}" marker-end="url(#d2ar)"/><text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-3}" font-size="10" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}" ${k==='dnp'?'stroke-dasharray="5 3"':''}/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ D.ui.block=g.dataset.b; draw(); }); const b=BLOCKS[sel]; m.querySelector('#bdi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`; };
  draw(); }

/* ---------------- schematics (redrawn from net, pin and block names) ---------------- */
function chip(x,y,w,name,left,right,sub){ const n=Math.max(left.length,right.length), h=26+n*17;
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+20+i*17; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+4}" y="${yy+4}" font-size="10" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x-34}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+20+i*17; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-4}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x+w+34}" y="${yy+4}" font-size="10" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  return s; }
const box=(x,y,w,h,t,sub)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="var(--ink)"/><text x="${x+w/2}" y="${y+h/2}" text-anchor="middle" font-size="11.5" fill="var(--ink)">${t}</text>${sub?`<text x="${x+w/2}" y="${y+h/2+14}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
const SHEETS=[
  {name:'1 · AT90CAN128 (U7)', note:'Pins and nets from PCB/OBSOLETE/ISS3/D6202A-iss3.net; port use from D6202B.h, altera.h, cs84xx.h. PB2/PB3 (REF1/REF2 LED macros) and PB7 have no LED: U7-12/13 are unconnected and FPGA1 (U7-17) is an FPGA output.', svg:()=>
    chip(330,50,200,'U7 AT90CAN128',[['2 PE0','LOCK1 → L2 GRN'],['3 PE1','NO_LOCK1 → L3 RED'],['4 PE2','SW1 (EQ1 button)'],['5 PE3','EQ1 → L4 YEL'],['6/7/9 PE4/5/7','LOCK2/NO_LOCK2/EQ2 (L5–L7 not fitted)'],['8 PE6','SW2 (not fitted)'],['10 PB0','COM_ACTIVITY → L8'],['11 PB1','ERROR → L9 (never lit)'],['14 PB4','FPGA4 = ALTERA_CLOCK'],['15 PB5','FPGA3 = ALTERA_DATA'],['16 PB6','FPGA2 = STROBE_WRITE'],['17 PB7','FPGA1 (FPGA drives it too)'],['23/24','X1 8 MHz']],
      [['30 PD5','CAND → U8-1'],['31 PD6','CANR ← U8-4'],['32 PD7','LBK → U8-5'],['35 PC0','ALTERA_RESET → Q3 → nCONFIG'],['36 PC1','CS8416_OUT'],['37 PC2','CS8416_CLK'],['38 PC3','CS8416_IN'],['41 PC6','CS8416_SEL1'],['42 PC7','CS8416_RESET1'],['39/40 PC4/5','SEL2/RESET2 (U6 not fitted)'],['44…51 PA7…PA0','OUT1_1SW…OUT2_4SW = SW3 DIP'],['60/59 PF1/PF2','AN_BMID / AN_BMID2 (never read)'],['61 PF0','AN_SLOTID (ADMUX = 0)']],'TQFP64 · 3.3 V · v104')},
  {name:'2 · Input and CS8416 (U5)', note:'From the ISS3 netlist. R values: R7 110, R8 75R, R9 110, R1/R2/R3/R4 750, R5/R11/R48/R50 75R, R6 365, R12 110, C4 1 nF, C7 220p, C5 DNI. The EQ network topology is read from the nets; its frequency response is not documented.', svg:()=>
    box(20,60,120,50,'P1-97 BNC1_SIG','BNC1_GND 95/96/98–100')+`<path d="M140 85 H175" stroke="var(--ink)"/>`+box(175,60,90,50,'C1 → T1A','PE-65612')+box(175,150,90,46,'H1','1: R8 75R · 3: R9 110')+`<path d="M220 110 V150" stroke="var(--ink)"/>`+
    chip(330,50,140,'U1 EL5263',[['3 +IN A','R7 110 ← T1A-3'],['2 −IN A','R3/R1 750 (gain 2)'],['6 −IN B','R4 750, C4/R6, C7/R12']],[['1 OUT A','R11 75R → IN1'],['7 OUT B','R5 75R → IN1_EQ']],'dual op-amp, ±5 V, D1/D2 clamps')+
    chip(620,50,170,'U5 CS8416',[['4 RXP0','C52 ← IN1 (R50 75R)'],['3 RXP1','C51 ← IN1_EQ (R48 75R)'],['15/16/17','CS8416_IN/CLK/OUT'],['14','SEL1'],['9','RESET1']],[['26 SDOUT','U5_SDATA → FPGA 86'],['24 RMCK','U5_MCLK → 87'],['28/27','LRCLK/SCLK → 76/77'],['20/19/18','GPO0–2 → 88/89/90']],'init: 00 01=04 02=0B 03=BB 04=80/89 05=B0 06=10')},
  {name:'3 · FPGA and outputs', note:'FPGA pins from the D6201B project (D6201A.qsf, v101) — they match the D6202A ISS3 netlist. Each FPGA output drives two DS34LV87T channels → 110 Ω → 0.1 µF → PE-65612 → P1.', svg:()=>
    chip(160,40,170,'U10 EP1C3T100',[['86','U5_SDATA'],['87','U5_MCLK'],['76/77','U5_LRCLK/SCLK'],['88–90','U5_GPO0–2'],['4','FPGA2 strobe'],['2','FPGA4 clock'],['3','FPGA3 data'],['5','FPGA1 version out'],['49–57','AD1895 (not fitted)']],[['75','OUT1'],['74','OUT2'],['69','OUT3'],['68','OUT4'],['10','vco (X2 not fitted)'],['21–25','TP1–TP5 (H5)']],'EPCS1 footprint, BOM M25P40')+
    chip(560,40,140,'U13 DS34LV87T',[['15/9','OUT1'],['1/7','OUT2']],[['14/13','→ T2 → AES2 61/63'],['10/11','→ T1 → AES1 67/69'],['2/3','→ T3 → AES3 55/57'],['6/5','→ T4 → AES4 49/51']],'')+
    chip(560,250,140,'U12 DS34LV87T',[['15/9','OUT3'],['1/7','OUT4']],[['14/13','→ T5 → AES5 68/70'],['10/11','→ T6 → AES6 62/64'],['2/3','→ T7 → AES7 56/58'],['6/5','→ T8 → AES8 50/52']],'')},
  {name:'4 · FPGA internals (D6201B image)', note:'Nets traced in D6201A.bdf (v101) by joining connector end points: q0/q1 → switch2x1 sel (dip1/dip2), q2/q3 → NOT → tone_gen1, q4 → sw2x2x1x24 (SRC), q14/q15 → i2s8416_aes “off” (no_lock2 / no_lock). Which switch output feeds which OUT pin is inferred.', svg:()=>
    box(20,40,160,60,'shift_in16_version_out','FPGA3 data · FPGA4 clk · FPGA2 strobe')+box(20,140,160,50,'q15 = no_lock','= !aes1_lock')+box(230,40,170,60,'i2s8416_aes (inst2)','U5 SDATA/MCLK/LRCLK/SCLK')+box(230,140,170,50,'aes1 = aes_pt AND NOT off')+
    box(450,40,150,50,'switch2x1 inst20','sel = q0 (dip1)')+box(450,110,150,50,'switch2x1 inst21','sel = q1 (dip2)')+box(450,190,150,50,'tone_gen1 ×2','A_off/B_off ← NOT q2/q3')+box(450,270,150,50,'sw2x2x1x24','sel = q4 → AD1895 path')+
    box(660,40,160,60,'OUT1 / OUT2','pins 75 / 74 ('+'inferred'+')')+box(660,110,160,60,'OUT3 / OUT4','pins 69 / 68')+box(20,250,380,70,'D6202A word: 0x800C unlocked / 0x000C locked','q3,q2 = 1 (tones off) · q1,q0 = 0 (both switches → aes1) · q4 = 0 · q5 = 0')+
    `<path d="M180 70 H230 M180 165 H230 M400 70 H450 M400 70 L450 135 M600 65 H660 M600 135 H660" stroke="var(--ink2)" fill="none"/>`},
  {name:'5 · Lattice variants', note:'Software/lattice: d6202a_top.vhd + d6202a.lpf (JEDEC 2007-08-30) and v100/ (JEDEC 2008-01-31), device LFXP3C-5TQFP100. Board pins from PCB/OBSOLETE/D6202A dsbxp.net — the .lpf sites do not match them.', svg:()=>
    chip(120,50,200,'LFXP3 · d6202a.jed (2007)',[['i2s1','U5 SDATA (unlocated)'],['mclk/lrclk/sclk','U5 clocks (unlocated)']],[['aes1','site 79 (no net on dsbxp)'],['aes2','site 81 (no net on dsbxp)'],['aes3/aes4','unlocated']],'I2SX4_AES, c1/u1/v1 => open')+
    chip(560,50,200,'LFXP3 · v100/d6202a.jed (2008)',[['U5_MCLK','site 69'],['U5_LRCLK','site 70'],['U5_SCLK','unlocated']],[['out_clk','= MCLK AND LRCLK AND SCLK']],'clock-presence probe')+
    chip(320,260,220,'dsbxp board U10 LFXP3KC-T100',[['9','U5_MCLK'],['5','U5_LRCLK'],['6','U5_SCLK'],['8','U5_SDATA'],['29–32','FPGA4…FPGA1']],[['98 → R94','OUT1'],['97 → R80','OUT2'],['93 → R81','OUT3'],['92 → R79','OUT4']],'D6202A dsbxp.net')},
  {name:'6 · Card edge and rear modules', note:'P1 = MEDAC100, P2 = MEDAC20 (netlist). Rear-module pin use from the D6202A .cdr drawings and the T-module netlists (via t6203.js, t6204.js, opengear.js). ID resistors: Frame Address ID.xls / netlists.', svg:()=>
    chip(80,40,170,'P2 midplane',[['1/3/5','+12V'],['2','−7.5V'],['6','AN_SLOTID'],['13/11','CANH / CANL'],['14 / 10','REF1 / REF2 → H4'],['17–20','PSB (unused)']],[],'MEDAC20')+
    chip(420,40,190,'P1 rear module',[['97 + 95/96/98–100','IN1: BNC1_SIG + BNC1_GND'],['92 + 89–91/93/94','IN2: BNC2 (D6202B only)'],['67/69 · 61/63','AES1 · AES2'],['55/57 · 49/51','AES3 · AES4'],['68/70 · 62/64','AES5 · AES6'],['56/58 · 50/52','AES7 · AES8'],['2 / 1','AN_BMID / AN_BMID2']],[],'MEDAC100')+
    `<text x="660" y="70" font-size="11" fill="var(--ink)">T6203: 3K57 / 9K76 · all 8 outputs</text><text x="660" y="88" font-size="11" fill="var(--ink)">T6204: 3K57 / — (ISS1) · BNC IN1</text><text x="660" y="106" font-size="11" fill="var(--ink)">T6303: 3K57 / 3K57 · all 8 outputs</text><text x="660" y="124" font-size="11" fill="var(--ink)">T6403: 3K57 / 887R · AES1–4 per card</text>`},
];
function viewSchem(m){ window[KEYFLAG]=false;
  m.innerHTML=card('Schematic set — redrawn from net, pin and block names (not the original P-CAD drawings)',`<div id="shb" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p><p class="small muted">The original CAD is <span class="mono">PCB/D6202A-iss3.sch</span> (P-CAD binary; ISS4 is the same schematic). Blue labels are nets.</p>`);
  const draw=()=>{ const i=D.ui.sheet; m.querySelector('#shb').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join(''); m.querySelectorAll('#shb button').forEach(b=>b.onclick=()=>{ D.ui.sheet=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 400" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="848" height="388" fill="none" stroke="var(--line)"/><text x="840" y="386" text-anchor="end" font-size="10" fill="var(--ink2)">D6202A ISS3/ISS4 · sheet ${i+1}/${SHEETS.length} · redrawn ${SIM.year(2026)}</text>${SHEETS[i].svg()}</svg>`; m.querySelector('#shn').textContent=SHEETS[i].note; };
  draw(); }

/* ---------------- software ---------------- */
function viewSoft(m){ window[KEYFLAG]=true;
  m.innerHTML=CSS+`<div class="grid2">${card('main() while(1) — the box lit up runs at the playhead',`<div id="flow"></div>`)}<div>${card('Interrupts (CAN.c)',`<div id="isr"></div>`)}${card('PARAMETER_UPDATE — which parameter the next heartbeat reports',`<div id="pu"></div>`)}</div></div>
   <div class="grid2">${card('CS8416 register map (init_CS8416 / PROCESS_MODES)',`<div id="csr"></div>`)}${card('16-bit word to the FPGA (ALTERA_write → shift_in16_version_out)',`<div id="reg"></div>`)}</div>
   <div class="grid2">${card('OID table — card value vs what DashBoard shows',`<div id="oids"></div>`)}${card('CAN message map (DASHBOARD_RESPONSE_SETUP)',`<div id="cmap"></div>`)}</div>
   <div class="grid2">${card('How the controls did things',`<div id="btn"></div>`)}${card('FPGA variants (the switch) and builds',`<div id="var"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t, sn=snapAt(t), st=stepAt(t), w=worldAt(t), R=sim(), c=cacheAt(t);
    let s=`<svg viewBox="0 0 520 ${STEPS.length*44+84}" style="width:100%"><defs><marker id="d2a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <rect x="110" y="6" width="300" height="26" rx="13" fill="${st.seg&&st.seg.kind==='boot'?'var(--warn)':'var(--chip)'}" stroke="var(--line)"/><text x="260" y="24" text-anchor="middle" font-size="11.5" fill="var(--ink)">main(): waits, slot ID, ALTERA_RESET, init_CS8416, CANinit</text>`;
    STEPS.forEach((p,j)=>{ const y=44+j*44, on=st.step===j; s+=`<line x1="260" y1="${y-10}" x2="260" y2="${y}" stroke="var(--ink2)" marker-end="url(#d2a2)"/><rect x="30" y="${y}" width="460" height="32" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="40" y="${y+14}" font-size="11" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${p[0]}</text><text x="40" y="${y+27}" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${p[2].slice(0,96)}</text>`; });
    const yb=44+STEPS.length*44; s+=`<path d="M490 ${yb-28} h20 V40 h-20" fill="none" stroke="var(--ink2)" marker-end="url(#d2a2)"/><text x="30" y="${yb+18}" font-size="11" fill="var(--ink2)">${st.seg?'Now: '+st.seg.label.slice(0,80):'pass ≈'+C.LOOP_T*1e6+' µs ('+'inferred'+') · '+R.passes.toLocaleString()+' passes this second'}</text></svg>`;
    m.querySelector('#flow').innerHTML=s;
    m.querySelector('#isr').innerHTML=`<table class="kv"><tr><th>timer0_ovf_isr</th><td class="small">every 1 ms: WDR; every 1000 ticks compare <span class="mono">can_data_rx</span> with 10: three quiet seconds → <span class="mono">dashboard_initializing</span> = NO (now ${sn.dinit?'YES':'NO'}). No 500 Hz output on this card.</td></tr>
     <tr><th>timer1_ovf_isr</th><td class="small">every 96 µs: next frame of a multi-frame answer; otherwise count to ${sn.dinit?'1000 × slot = '+1000*w.slot:'10 000'} → <span class="mono">CAN_TX_TIMER</span>: RESTART trap once, then one REPORT_PARAM.</td></tr>
     <tr><th>can_rx_isr</th><td class="small"><span class="mono">CANRX</span>: frames for 0x${hx(0x10+w.slot)} → <span class="mono">can_data_rx++</span> → <span class="mono">DASHBOARD_RESPONSE_SETUP</span> → <span class="mono">CANTX</span> from inside the ISR.</td></tr></table>`;
    const prs=[[0,'AES1_LOCK','2.2 AES Input'],[1,'EQ1_ENABLE','3.2 Equalizer'],[2,'SIGNAL_STATUS','2.1 Card Status'],[5,'TONE_GENERATION','3.5 (only on change)']];
    m.querySelector('#pu').innerHTML=`<svg viewBox="0 0 470 120" style="width:100%">${prs.map(([k,n,o],i)=>`<rect x="${10+i*115}" y="20" width="105" height="46" rx="8" fill="${sn.pr===k?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${62+i*115}" y="40" text-anchor="middle" font-size="11" font-family="var(--mono)" fill="${sn.pr===k?'#fff':'var(--ink)'}">${n}</text><text x="${62+i*115}" y="56" text-anchor="middle" font-size="10" fill="${sn.pr===k?'#eef':'var(--ink2)'}">${o}</text>`).join('')}
      <path d="M115 43 h10 M230 43 h10 M345 43 h10" stroke="var(--ink2)"/><path d="M290 66 v20 H60 v-20" fill="none" stroke="var(--ink2)" marker-end="url(#d2a2)"/><text x="10" y="106" font-size="10.5" fill="var(--ink2)">parameter_change ${sn.pc} · parameter_tx_complete never cleared → steps every pass</text></svg>
      <p class="small">A change (lock, EQ, tone, signal status) sets parameter_change and pins the choice until the next heartbeat sends it. With nothing pending, the index advances 0→1→2→0 <b>on every main-loop pass</b> (≈${Math.round(1/C.LOOP_T)} times a second), so which parameter a quiet heartbeat carries is effectively random.</p>`;
    const regs=[['0x00','0x00','Control 0'],['0x01','0x04','Control 1 (HOLD bits '+inf+')'],['0x02','0x0B','Control 2: GPO0 = pass-through'],['0x03','0xBB','Control 3: GPO1/GPO2 = AES pass-through'],['0x04',sn.reg4===0x89?'0x89':'0x80','Control 4: RUN, RXSEL '+(sn.reg4===0x89?'1 (IN1_EQ)':'0 (IN1)')+', TXSEL same'],['0x05','0xB0','Serial output: master, AES3-direct format'],['0x06','0x10','Error unmask: UNLOCK only'],['0x0C','read','Receiver errors → Astatus (0 = locked)']];
    m.querySelector('#csr').innerHTML=`<table class="kv"><tr><th>reg</th><th>value</th><th>meaning (CS8416 data sheet, not archived ${inf})</th></tr>${regs.map(r=>`<tr style="${r[0]==='0x04'?'background:color-mix(in srgb,var(--accent) 16%,transparent)':''}"><td class="mono">${r[0]}</td><td class="mono">${r[1]}</td><td class="small">${r[2]}</td></tr>`).join('')}</table><p class="small muted">Header 0x20 write / 0x21 read, bit-banged MSB first on PC3 (out), PC2 (clock), PC1 (in), chip select PC6.</p>`;
    const wd=sn.word; m.querySelector('#reg').innerHTML=`<table class="kv"><tr><th>bits sent</th><td class="mono">0x${hx(wd,4)} = ${wd.toString(2).padStart(16,'0')}b</td></tr>
     <tr><td colspan="2" class="small mono">q15 ${(wd>>15)&1} no_lock (i2s8416_aes off) · q14 0 no_lock2 · q4 0 SRC · q3 ${(wd>>3)&1} q2 ${(wd>>2)&1} tones off · q1 0 q0 0 switch2x1 → aes1</td></tr></table>
     <p class="small muted">write_data() shifts data_upper then data_lower MSB first on PB5 with PB4 as clock; STROBE_WRITE on PB6 latches q0–q15 and reloads the version register, whose MSB comes back on FPGA1 — a pin the AVR drives as an output (DDRB = 0xFF). ALTERA_read is commented out and would use port A pins that the DIP switch owns.</p>`;
    const list=[0x0105,0x0102,0x0107,0x010B,0x0104,0x0201,0x0202,0x0203,0x0301,0x0302,0x0303,0x0305,0x0306,0x0400]; const end=R.end.f;
    const live={0x0201:oidValue({lock:sn.lock},w,0x0201),0x0202:oidValue({lock:sn.lock,notify:end.notify},w,0x0202),0x0302:sn.eq,0x0305:sn.tone,0x0400:sn.notify};
    m.querySelector('#oids').innerHTML=`<table class="kv"><tr><th>OID</th><th>name</th><th>card (GET)</th><th>DashBoard</th><th>lists</th></tr>${list.map(o=>{ const ix=PARAM_OIDS.indexOf(o); const L=[ix>=0?(ix<11?'P':'P*'):'',BRANDS[w.brand].menu0.includes(o)?'M0':'',MENU_STATUS.includes(o)?'M2':'',MENU_SET.includes(o)?(MENU_SET.indexOf(o)<3?'M1':'M1*'):''].filter(Boolean).join(' ');
      const lv=OID[o].missing?'UNSUPPORTED':live[o]!==undefined?valTxt(o,live[o]):valTxt(o,oidValue(end,w,o)); const dv=c[o]!==undefined?valTxt(o,c[o]):'—'; const diff=live[o]!==undefined&&c[o]!==undefined&&c[o]!==live[o];
      return `<tr><td class="mono">${oidTxt(o)}</td><td>${OID[o].name}</td><td class="mono small">${lv}</td><td class="mono small" style="${diff?'color:var(--warn);font-weight:700':''}">${dv}</td><td class="mono small">${L}</td></tr>`; }).join('')}</table>
      <p class="small muted">P = ParamOIDS_Message (count 11; P* = beyond it) · M0 Card Info · M2 Card Status · M1 Card Settings (count 3; M1* beyond). Orange = DashBoard differs from a fresh GET. Card Status by GET (BIT2 when unlocked) and by REPORT (0 or BIT1) use different values.</p>`;
    const handled=[[0x45,'3 bytes: count 11'],[0x46,'ParamOIDS_Message (32 bytes, 5 frames)'],[0x47,'static arrays or MESSAGE_CREATOR_PARAMETER_21/22/40'],[0x49,'INT16 values; strings multi-frame'],[0x4A,'3.2, 3.5, 3.1, 4.0, 3.6, 2.1, 2.4, 255.7/255.8'],[0x50,'“Status” / “Control”'],[0x51,'2 / 1'],[0x52,'Card Info / Card Status / Card Settings'],[0x53,'Menu0 / Menu2 / Menu1 (Menu3 if DashBoard disabled — never)'],[0x43,'reboot_device'],[0x40,'WAIT 1000 ms → bootloader'],[0x56,'UNSUPPORTED (SNMP 0x56–0x58)']];
    const counts={}; R.can.forEach(f=>{ if (f.dir==='rx') counts[f.type]=(counts[f.type]||0)+1; });
    m.querySelector('#cmap').innerHTML=`<table class="kv"><tr><th>type</th><th>message</th><th>card does</th><th>now</th></tr>${handled.map(([ty,d])=>`<tr><td class="mono">0x${hx(ty)}</td><td class="mono small">${MSG[ty]}</td><td class="small">${d}</td><td class="mono">${counts[ty]||''}</td></tr>`).join('')}<tr><td class="mono">0x10</td><td class="mono small">REPORT_PARAM</td><td class="small">heartbeat, one parameter</td><td class="mono">${R.can.filter(f=>f.type===0x10).length||''}</td></tr><tr><td class="mono">0x11</td><td class="mono small">TRAP</td><td class="small">CANTRAP_RESTART once after boot</td><td class="mono">${R.can.filter(f=>f.type===0x11).length||''}</td></tr></table><p class="small muted">29-bit ID = priority · version · source(6) · destination(6) · type(8) · flags(5). Flags 2 first, 0 middle, 1 last, 3 single.</p>`;
    m.querySelector('#btn').innerHTML=`<table class="kv"><tr><th>Operator does</th><th>Firmware path</th><th>What changes</th></tr>
     <tr><td>SW1 EQ1</td><td class="mono small">READ_SWITCHES → TRANSLATE_SWITCHES → TRANSLATE_EQ_PUSHBUTTONS → PROCESS_MODES</td><td class="small">CS8416 RXSEL 0/1, EQ1 LED, relock, report 3.2</td></tr>
     <tr><td>DashBoard Equalizer</td><td class="mono small">can_rx_isr → SET 3.2 → eq1_active = peq1_active</td><td class="small">same, but no report</td></tr>
     <tr><td>Notify on Card Fault</td><td class="mono small">SET 4.0 → smpte_alarm_enabled</td><td class="small">alarm values in REPORT_PARAM / GET 2.2</td></tr>
     <tr><td>Tone Generator</td><td class="mono small">SET 3.5 → tone_generation</td><td class="small">nothing (ALTERA_write ignores it)</td></tr>
     <tr><td>Save (3.1, by hand)</td><td class="mono small">save_settings → SAVE_INFORMATION_EEPROM</td><td class="small">EEPROM 10/14; never restored</td></tr>
     <tr><td>Input lost</td><td class="mono small">CS8416_READ_LOCK_ALL → REFRESH_LEDS → ALTERA_write q15</td><td class="small">outputs held low, NO LOCK1, report 2.2</td></tr>
     <tr><td>H1, DIP, loads</td><td class="small">hardware only / ignored</td><td class="small">termination; nothing; level</td></tr>
     <tr><td>Reboot / Upload</td><td class="mono small">reboot_device → while(1) CLI() → WDT → (bootloader)</td><td class="small">${(BOOT_T*1000).toFixed(0)} ms boot, EQ off</td></tr></table><p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none yet'}</b></p>`;
    const B=BRANDS[w.brand];
    m.querySelector('#var').innerHTML=`<table class="kv"><tr><th>variant</th><th>mute on unlock</th><th>C/U/V</th><th>outputs</th></tr>${Object.entries(FPGAS).map(([k,F])=>`<tr style="${k===w.fpga?'background:color-mix(in srgb,var(--accent) 18%,transparent)':''}"><td><button data-fp="${k}" class="${k===w.fpga?'on':''}">${F.short}</button><div class="small muted">${F.name}</div></td><td>${F.mute?'yes (held low)':'no'}</td><td>${F.cuv==='pass'?'from input':F.cuv==='zero'?'all 0':'—'}</td><td>${F.outs?F.outs+' pins × 2':'none'}</td></tr>`).join('')}</table>
     <h3>Brand builds</h3><table class="kv"><tr><th>#define</th><th>Product</th><th>Supplier</th><th>zeuspack</th></tr>${Object.values(BRANDS).map(b=>`<tr style="${b===B?'background:color-mix(in srgb,var(--accent) 18%,transparent)':''}"><td><button data-br="${b.def}" class="${b===B?'on':''}">${b.def}</button></td><td class="mono">${b.product}</td><td>${b.supplier}</td><td class="mono small">${b.cfg} → ${b.bin}</td></tr>`).join('')}</table><p class="small muted">The archived v104 common.h defines COBALT and V100W.mak runs the Cobalt zeuspack config: the tree as left builds the 9252.</p>`;
    m.querySelectorAll('[data-fp]').forEach(b=>b.onclick=()=>A.fpga(b.dataset.fp)); m.querySelectorAll('[data-br]').forEach(b=>b.onclick=()=>A.brand(b.dataset.br)); };
  SIM.on('time',draw); }

/* ---------------- findings ---------------- */
function viewFindings(m){ window[KEYFLAG]=false;
  m.innerHTML=card('What the D6202A is really doing',`<ol>
   <li><b>Artwork 2026|59: card edge and rear modules now from the CorelDRAW files.</b> Card edge: ${SIM.src('#OPENGEAR #SERIES/D6202A - #Master #OPENGEAR/D6202A - #Engineering/Functional/D6202A-card-edge.cdr')} (2008-05-08|41). T6303 and T6403: ${SIM.src('#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/D6202A - rear module options.cdr')} (2012-01-16|45, T6303A / T6403A). T6203: ${SIM.src('#OPENGEAR #SERIES/D6202A - #Master #OPENGEAR/D6202A - #Engineering/Functional/D6202A-T6203.cdr')} (2008-10-08|41). T6204: ${SIM.src('#OPENGEAR #SERIES/D6202A - #Master #OPENGEAR/D6202A - #Engineering/Functional/D6202A-T6204.cdr')} (2008-10-07|41). Assets: <span class="mono">assets/d6202a-*.svg</span>.</li>
   <li><b>The card-edge drawing is the dual card.</b> ${SIM.src('#OPENGEAR #SERIES/D6202A - #Master #OPENGEAR/D6202A - #Engineering/Functional/D6202A-card-edge.cdr')} shows Lock2, No Lock2, EQ2 and the EQ2 switch, the same layout as the D6201B edge. None of these are fitted on a D6202A (PnP program); they are crossed out on the artwork here.</li>
   <li><b>A legend typo in the 2012 guide.</b> The T6403A legend repeats “OUT 3 Card 2” at position 9, where OUT 4 Card 2 is meant (the D6202B guide has the same typo). The Ω in the 2008 label sheets used the “WP Greek Helve” font, and libcdr turned it into Σ; the assets were corrected.</li>
   <li><b>Issue 2 was not the Lattice card.</b> The READMEs say ISS2 used a Lattice LFXP3 and ISS3 moved to the EP1C3. In the archive, <span class="mono">D6202A-iss2.bom</span>, <span class="mono">.net</span> and <span class="mono">.pnp</span> all list U10 = EP1C3T100, and <span class="mono">Photo/D6202A iss2.jpg</span> shows an Altera Cyclone. The LFXP3KC-T100 appears only in the alternative <span class="mono">D6202A dsbxp</span> layout (June 2008) and its pick-and-place program. The simulator still offers both as a switch.</li>
   <li><b>The Lattice bitstreams don’t fit the Lattice board.</b> <span class="mono">d6202a.lpf</span> puts aes1/aes2 on sites 79/81 and v100’s clocks on 69/70; the dsbxp netlist wires OUT1–OUT4 to pins 98/97/93/92 and U5’s clocks to 9/5/6. The 2007 design (I2SX4_AES) leaves c1/u1/v1 open, so its channel status would be zero; the 2008 one is only <span class="mono">out_clk &lt;= U5_MCLK AND U5_LRCLK AND U5_SCLK</span>.</li>
   <li><b>A D6202A is a depopulated D6202B.</b> The ISS3 BOM header says “D6201B” and lists two CS8416s, an AD1895 SRC and two push-buttons, but <span class="mono">D6202A-iss3-T.prg</span> places no U6, U3, U9, X2 or L5–L7 (the D6202B program places them all). Channel-2 parts, jumpers H2–H4 and the second card-edge switch are bare footprints.</li>
   <li><b>The firmware is the D6202B’s, built single-input.</b> <span class="mono">V100W.mak</span> links <span class="mono">D6202B.o</span>; <span class="mono">D6201A.c</span> and <span class="mono">D6201B.c</span> sit unused in the folder. With <span class="mono">AES2_AVAILABLE</span> undefined, <span class="mono">ALTERA_write</span> always sends 0x000C/0x800C: 1×8, no SRC, tone generators off.</li>
   <li><b>The archived tree builds the Cobalt card.</b> <span class="mono">common.h</span> (v104) has <span class="mono">#define COBALT</span> and the makefile runs <span class="mono">zeuspack /f cobalt_ztcpack.txt</span>. The three zeuspack configs share one product list (D6202A / ADA-8401-B / 9252), so the brand strings depend only on which #define was set at compile time.</li>
   <li><b>Tone Generator does nothing.</b> OID 3.5 is listed, has a descriptor, can be set, is reported and is the one value <span class="mono">SAVE_INFORMATION_EEPROM</span> stores — but <span class="mono">ALTERA_write</span> ignores <span class="mono">tone_generation</span> without AES2_AVAILABLE. The FPGA’s tone_gen1 (a 48-sample −20 dBFS sine) is never enabled.</li>
   <li><b>Nothing is ever restored.</b> Save writes EEPROM [10] = 0xAA and [14] = tone_generation (Notify’s [11] line is commented out; EQ is not saved), and <span class="mono">RESTORE_INFORMATION_EEPROM()</span> is called nowhere. Every power-up starts with EQ off and Notify off. “V104 DataSafe” in the history sheet is only <span class="mono">restore_start</span> (OIDs 255.7/255.8), which pauses the heartbeat reports.</li>
   <li><b>Save is hidden.</b> OID 3.1 is inside the ParamOIDS count but in no menu: Menu1OID_Message lists 4.0, 3.2, 3.5, 3.6 and its count byte says 3, so 3.6 AD Result is beyond the count and Save is nowhere.</li>
   <li><b>Counts that don’t match.</b> GET_NUMPARAMS answers 11 while ParamOIDS_Message carries 14 OIDs; two of the extras (2.3, 3.3) answer CANRESP_UNSUPPORTED because their descriptors exist only in dual-input builds.</li>
   <li><b>The report rotation spins.</b> <span class="mono">parameter_tx_complete</span> is set YES after the first heartbeat and never cleared, so <span class="mono">PARAMETER_UPDATE</span> advances <span class="mono">parameter_refresh</span> 0→1→2 on every main-loop pass. A quiet heartbeat therefore reports AES Input, Equalizer or Card Status more or less at random.</li>
   <li><b>Card Status has two meanings.</b> GET_PARAM 2.1 answers BIT0 (locked) or BIT2 (unlocked) and ignores Notify; REPORT_PARAM 2.1 sends 0 or BIT1 (only when Notify is on). The descriptor built by <span class="mono">MESSAGE_CREATOR_PARAMETER_21</span> has two entries, so BIT2 has no entry at all ${inf} on how DashBoard draws it.</li>
   <li><b>Dead descriptors.</b> The static <span class="mono">Parameter22_Message</span> (“Locked-Dolby E / Locked-Dolby AC3”), <span class="mono">Parameter21/24_Message</span> (“Voiceover Unlocked”, “AES2 Input Unlocked”) and <span class="mono">Parameter40_Message</span> “SMPTE Alarm” whose two choices are both named “Save” are compiled in but replaced by the MESSAGE_CREATOR functions. The history sheet’s OID table is an SDI/Dolby voice-over template.</li>
   <li><b>The DIP switch is decoration.</b> SW3 is read every pass, but <span class="mono">main()</span> forces <span class="mono">dip_switch_enabled = NO</span> and <span class="mono">dashboard_enabled = YES</span> (the tests are commented out), and the DIP branch of ALTERA_write exists only with AES2_AVAILABLE. The functional drawing shows DIP switches driving the control block.</li>
   <li><b>Loss of lock silences the line, not the audio.</b> In the D6201B image <span class="mono">aes1 &lt;= aes1_pt_t and not off</span>, with off = control-word bit 15 = !aes1_lock: all eight outputs are held low, so downstream gear sees no carrier rather than digital silence. Switching EQ makes the CS8416 re-select its input every time, a short drop-out ${inf}.</li>
   <li><b>Register 0x04 is rewritten 6 000 times a second.</b> <span class="mono">PROCESS_MODES</span> writes CS8416 register 0x04 (0x80 or 0x89) on every pass, whether or not EQ changed.</li>
   <li><b>LED and pin leftovers.</b> REF1/REF2 LED macros drive PB2/PB3, which have no nets; the ERROR LED (L9, PB1) is only ever switched off. FPGA1 is an FPGA output (the version shift register) on a pin the AVR configures as an output (DDRB = 0xFF). <span class="mono">altera.h</span> (“FROM D6204A”) maps ALTERA_read onto port A, the DIP-switch port.</li>
   <li><b>CAN starts twice.</b> <span class="mono">MOB_error</span> is initialised YES, so the first <span class="mono">CAN_FUNCTIONS</span> after <span class="mono">CANinit()</span> calls CANinit() again; the first timer1 tick (and the RESTART trap) come 96 ms later.</li>
   <li><b>The boot is ≈${(BOOT_T*1000).toFixed(0)} ms of waits.</b> 80 calls of <span class="mono">wait(3000)</span> at 7 cycles per loop (common.lis) plus 100 slot-ID samples that each wait 5.25 ms. <span class="mono">ad_result</span> holds the average, but OID 3.6 “AD Result” returns <span class="mono">ad_result_upper/lower</span> — the last single sample — and its descriptor says READWRITE.</li>
   <li><b>Dual-input typo.</b> <span class="mono">CAN_TX_TIMER</span> tests <span class="mono">#ifdef AES2_AVAIABLE</span> (misspelt): a dual-input build would drop the <i>if</i> line of the SIGNAL_STATUS report. Harmless in this single-input build.</li>
   <li><b>Rear modules.</b> The firmware never reads AN_BMID/AN_BMID2 (ADMUX = 0). On a T6403 each card reaches only AES1–AES4. The T6204 drawing is titled “DUAL 110Ω AES DA” but behind a D6202A only BNC IN1 is used, into a transformer input with H1 set to 75 Ω.</li>
   <li><b>Archive duplicates.</b> <span class="mono">D6202A-ISS4 - #Gerbers.zip</span> exists three times (top level, #Gerber #PNP, PCB/GERBERS) with one MD5; the empty <span class="mono">D6202A  #Engineering #TIM #PCB</span> skeleton mirrors an old layout. The history sheet calls the Ross part “ADA-8402”; the zeuspack configs say ADA-8401-B.</li>
  </ol>`)+card('Assumptions in this simulation',`<ul class="small">
   <li>Main-loop pass ${C.LOOP_T*1e6} µs; CS8416 lock 20 ms; re-acquisition on every RXSEL change; watchdog 16 ms; EEPROM write 8.5 ms; CAN stuffing +10 %; frame-controller order and 0.4 ms gaps; heartbeat and timer0 phases ${inf}.</li>
   <li>Cable model (0.07 dB/m pair, 0.02 dB/m coax at 48 kHz, ∝√fs), ≈10 dB of EQ lift, 200 mV receiver threshold, nominal 4 V / 1 V source levels and the output levels (≈3.3 V p-p loaded) ${inf}.</li>
   <li>ALTERA_RESET → nCONFIG through Q3 and the FPGA re-configuring during boot; which switch2x1 feeds which OUT pin; DashBoard reading menus up to their count bytes; ALARM_TABLE bit-to-entry decoding ${inf}.</li>
   <li>The Lattice I2SX4 variant is modelled as if its outputs reached OUT1–OUT4; the dsbxp board has no archived artwork, so the ISS4 board is drawn for every variant.</li>
   <li>Rear-module drawings reuse the T6302 DXF grid (as in opengear.js); the T6204 ISS1 has no AN_BMID2 resistor (t6204.js).</li></ul>`)+card('Sources',`<ul class="small mono">
   <li>D6202A - #Engineering/Software/atmel/v104/*.c *.h *.mak *.mp *.lis *_ztcpack.txt · atmel/D6202A SOFTWARE HISTORY.xls</li>
   <li>…/Software/lattice/d6202a_top.vhd, d6202a.lpf, d6202a.jed, v100/d6202a_top.vhd, v100/d6202a.lpf, v100/d6202a.jed</li>
   <li>…/PCB/OBSOLETE/ISS3/D6202A-iss3.net, .bom · OBSOLETE/D6202A-iss2.bom/.net/.pnp · OBSOLETE/D6202A dsbxp.net, D6202A-dsbxp.bom · PCB/D6202A-ISS4.txt</li>
   <li>…/PCB/GERBERS/D6202A-ISS4.TOP, .TSM, .TSS, .OTL → assets/d6202a-copper.png, assets/d6202a-silk.png</li>
   <li>D6202A #Gerber #PNP/D6202A - #PNP #2016/D6202A-iss3-T.prg, D6202B-iss3-T.prg, D6202A-iss2-T.prg, D6202A-dsbxp-T.prg</li>
   <li>…/Functional/Functional.cdr, D6202A-card-edge.cdr, Rear Modules.cdr, D6202A-T6203.cdr, D6202A-T6204.cdr, D6202A-T6303-iss2.cdr, D6202A-T6403-iss2.cdr · Photo/D6202A/*.jpg</li>
   <li>D6201  # Problem…/D6201 - #Engineering/D6201B/Software/altera/v101/D6201A.qsf, D6201A.bdf, shift_in16_version_out.vhd, i2s8416_aes.vhd, tone_gen1.vhd</li>
   <li>siumulation-plugins/opengear.js, t6203.js, t6204.js</li></ul>`); }

/* ---------------- register ---------------- */
resetAll();
SIM.register({
  id:'d6202a', name:'D6202A · openGear 1×8 110 Ω AES DA (2008|41)', duration:1, year:2008,
  product:'D6202A', family:'openGear', folder:'#OPENGEAR #SERIES/D6202A - #Master #OPENGEAR',
  summary:'The D6202A openGear AES distribution amplifier (Ross ADA-8401-B / Cobalt 9252) modelled from its v104 firmware, ISS3 netlist and the D6201B FPGA image: transformer input with switchable cable EQ, a CS8416 receiver, an FPGA that re-times and mutes, and eight transformer-coupled 110 Ω outputs. The card is drawn from the ISS4 gerbers and driven through its EQ button, termination jumper, rear modules and a DashBoard-style window; an FPGA switch compares the Altera EP1C3 image with the two Lattice LFXP3 bitstreams.',
  highlights:['Card from the ISS4 gerbers, parts not fitted on a D6202A shown hatched','EQ button and DashBoard Equalizer traced to CS8416 register 0x04','FPGA switch: EP1C3 D6201B image vs Lattice I2SX4 vs clock probe','Cable/termination model with lock, mute and eight output paths','CAN timing: 96 µs ticks, heartbeat reports, multi-frame answers','Findings: ISS2 was already Altera, Save hidden and never restored, spinning report rotation'],
  depth:'Full model',
  stepUnits:[
    {label:'1 main-loop pass (≈160 µs)', period:()=>C.LOOP_T},
    {label:'1 timer1 tick (96 µs)', period:()=>C.T1_TICK},
    {label:'1 ms (timer0)', period:()=>C.T0},
    {label:'1 AES frame', period:()=>1/worldAt(SIM.t).src.fs},
    {label:'1 AES block (192 frames)', period:()=>192/worldAt(SIM.t).src.fs},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[0.02,'20 ms (CS8416 lock)'],[0.004,'4 ms (AES block @48k)'],[0.001,'1 ms (timer0)'],[0.0005,'500 µs (3 passes)'],[0.0002,'200 µs (CAN frame)'],[4/48000,'4 AES frames @48k']],
  defaultZoom:0,
  init(){ D.ver++; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
