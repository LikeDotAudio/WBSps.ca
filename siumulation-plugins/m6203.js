/* =====================================================================
   M6203 / M6203A — openGear SD/HD/3G-SDI reclocking distribution amplifier, 1 in → 8 out, ASI pass
   Gennum GS2974A equaliser → GS2975A reclocker → 4 × GS2978 cable drivers; AT90CAN128 control; no FPGA.
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, under #OPENGEAR #SERIES/):
   - M6203 - #Master #OPENGEAR/M6203 - #Engineering/M6203A/Software/atmel/v101/
       v100w.c        main(), wait(), port_init (DDRA 0xC1, DDRD 0x11, DDRF 0x0C), DATA_INITIALIZATION, NO_LOCK_CHIRP (unused)
       M6203A.c       READ_GS2975_STATUS, PROCESS_SDI_LOCK_STATUS_UPDATE (101-sample lock debounce, PL Jan 10 09),
                      PROCESS_SDI_LOCK_STATUS (LEDs, BYPASS, DDO_MUTE, DATA/CLOCK, SDI_OUTPUTS_ENABLED)
       M6203.h        port macros, lock60_mask/los_mask, SR_270/SR_1G5/SR_3G0 codes, SD/HD, PARAMETER_MAX
       Dashboard.c    PARAMETER_UPDATE, CAN_TX_TIMER, DASHBOARD_RESPONSE_SETUP, MESSAGE_CREATOR_PARAMETER_24/40, all OID strings
       CAN.c          timer0_ovf_isr (1 ms, dashboard_initializing), timer1_ovf_isr (96 µs, TX_HEARTBEAT 10000,
                      TX_INITIALIZE 1000*slot_address), CAN_FUNCTIONS, CANinit (CANBT 00/04/12 → 1 Mbit/s)
       ADC.c/ADC.h    adc_init, AD_CONVERTER_SETUP (2 × wait(3000) per sample), ADDRESS_TABLE, COUNTER_CONSTANT 100
       M6203A.lis, v100w.lis   instruction listings → cycle counts of wait() and of the debounce loop
       V100W.mp       memory map (dashboard_counter_buffer 0x02F2, canbus_status_buffer 0x03BA; text 21 924 bytes)
       wbs_ztcpack.txt  zeuspack: m6203a_v1_01.bin, /v 1.01, /p M6203A
     …/atmel/v100/ (1.00), …/atmel/C030000/ (S&L build), …/atmel/Prototype/ (2007|40, single-sample lock)
     …/Software/M6203A SOFTWARE HISTORY.xls (release log, prototype OID sheet)
   - …/M6203A/PCB/M6203A-iss3.net (+ OBSOLETE/ISS2/M6203A-iss2.net, OBSOLETE/M6203B-iss1.net) — every net name below
   - …/M6203A/PCB/GERBERS/M6203A-ISS3.TOP/.TSM/.TSS → assets/m6203-card-copper.png, m6203-card-silk.png (120 dpi);
       M6203A-iss3.pnp (part positions, origin 3495,5885 mil), M6203A-iss3-bot.pnp, M6203-PCB Questions.doc
   - …/M6203A/Functional/M6203A-FUNCTIONAL.pdf, M6203A-T6301.cdr, M6203A-T6401.cdr, M6203A-card-edge.cdr;
       …/MANUAL/M6203A LED Status.cdr (converted with Inkscape; text re-anchored)
   - M6203A - #Master #OPENGEAR/M6203A - #TESTREPORT/ (ASI PASS 24JUN10, CABLE_LENGTH 06DEC10 + undated, SUMMARY,
       V1001-17NOV11 3G evaluation, V1001-09JAN12 iss3, 03AC0000-17JUN13)
   - T6401 - …/T6401iss4.net (dual-card routing); T6301 BNC geometry as in t6301.js (T6301-iss4 Gerbers)
   - SA-DEMUX4 - #Master/…/Parts Research/SDI Reclocker/GS2975A_Datasheet.pdf (pins, SS[2:0], lock time, mute table, ASI)
   SDI line structure (EAV/SAV/XYZ, word counts) is from the SMPTE standards, as in demux4.js — not from this folder.
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
/* ---- CorelDRAW artwork (artwork pass 2026|59): the panels are the archive's .cdr drawings, converted with Inkscape
   (text kept live, re-anchored where libcdr lost alignment); the live parts sit on the drawn holes, in the drawing's pt coordinates. ---- */
const ART_CSS = `<style>.arthl{fill:transparent;stroke:transparent;stroke-width:.7}.og62-hot:hover .arthl,.arthot:hover .arthl{stroke:#2b8cff}</style>`;
function artSVG(o){ // o: {src, vb:[x,y,w,h], maxw, label, fid, body}
  const [x,y,w,h]=o.vb;
  return `<svg viewBox="${x} ${y} ${w} ${h}" style="width:100%;max-width:${o.maxw||300}px;display:block;margin:auto;background:#f4f4f0;border-radius:6px" role="img" aria-label="${o.label}">${ART_CSS}
    <defs><filter id="${o.fid}" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <image href="${ASSET}${o.src}" x="${x}" y="${y}" width="${w}" height="${h}"/>${o.body||''}</svg>`;
}
/* one LED lens drawn over the LED box in the card-edge drawing */
function artLed(o){ // {x,y,w,h, on, col, fid, attrs, title}
  return `<g ${o.attrs||''}><title>${o.title||''}</title><rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="1" fill="${o.on?o.col:'rgba(28,32,30,.55)'}" ${o.on?`filter="url(#${o.fid})"`:''}/><rect class="arthl" x="${o.x-1}" y="${o.y-1}" width="${o.w+2}" height="${o.h+2}" rx="1.5"/></g>`;
}
/* a connector on the rear-module drawing: hit area, optional plugged cable, live dot, scope highlight */
function artJack(o){ // {cx,cy,r, kind:'bnc'|'tb', w,h, conn, live, sel, attrs, title}
  const r=o.r||6, lv=o.live===undefined?'':`<circle cx="${o.cx+(o.kind==='tb'?o.w/2+2:r+0.6)}" cy="${o.cy+(o.kind==='tb'?-(o.h/2-1.5):r-0.6)}" r="1.7" fill="${o.live===true?'#2f8f46':o.live==='warn'?'#d9a21b':o.live==='err'?'#c0392b':'#8d9296'}" stroke="#fff" stroke-width=".35"/>`;
  let g='';
  if (o.conn) g+= o.kind==='tb'? `<rect x="${o.cx-o.w/2-.8}" y="${o.cy-o.h/2-.8}" width="${o.w+1.6}" height="${o.h+1.6}" rx="1" fill="#2b5f9e" opacity=".55"/>`
                               : `<circle cx="${o.cx}" cy="${o.cy}" r="${r*0.82}" fill="#2b5f9e" opacity=".8"/><circle cx="${o.cx}" cy="${o.cy}" r="${r*0.3}" fill="#9cc3ef"/>`;
  if (o.sel) g+=`<circle cx="${o.cx}" cy="${o.cy}" r="${r+1.6}" fill="rgba(255,210,60,.35)" stroke="#e5b21b" stroke-width=".5"/>`;
  const hit = o.kind==='tb'? `<rect class="arthl" x="${o.cx-o.w/2-1}" y="${o.cy-o.h/2-1}" width="${o.w+2}" height="${o.h+2}" rx="1"/>` : `<circle class="arthl" cx="${o.cx}" cy="${o.cy}" r="${r+0.6}"/>`;
  return `<g ${o.attrs||''}><title>${o.title||''}</title>${g}${lv}${hit}</g>`;
}
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const infT = s => `<span class="tag-inf" title="${String(s).replace(/"/g,'&quot;')}">inferred</span>`;
const hx = (n,w) => (n>>>0).toString(16).toUpperCase().padStart(w||2,'0');
const esc = s => String(s).replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const card = (title, body, extra) => `<div class="card" ${extra||''}><h2>${title}</h2>${body}</div>`;

/* ---------------- timing constants (8 MHz crystal X1, ICCAVR listings) ---------------- */
const CYC = 1/8e6;
const C = {
  WAIT_CYC: 7,                 // wait(): wdr, subi, sbci, cpi, cpc, brne(2) — v100w.lis
  WAIT_MAIN: 1000,             // wait(1000) in while(1)
  WAIT_PROTO: 300,             // Prototype v100w.c: wait(300)
  UPD_OVH: 46,                 // PROCESS_SDI_LOCK_STATUS_UPDATE: 4 sts pairs + switch + sbi — M6203A.lis
  UPD_IT: 32, UPD_IT_CNT: 41,  // one loop iteration: 32 cycles, 41 when lock60_counter++ runs — M6203A.lis
  READ_CYC: 26, PROC_CYC: 70, CANF_CYC: 90,   // READ_GS2975_STATUS / PROCESS / CAN_FUNCTIONS+PARAMETER_UPDATE — estimated from code size (inferred)
  ISR_K: 1.08,                 // timer1 every 96 µs + timer0 every 1 ms steal ≈ 8 % of the CPU — inferred
  T0: 1e-3,                    // timer0: clk/64, TCNT0 = 0x83 → 125 counts = 1 ms
  T1: 96e-6, T1_FIRST: 0.096,  // timer1: reload 0xFFF4 = 12 counts × 8 µs; first load 0xD120 = 12 000 counts
  HEART: 10000, TXF: 10,       // TX_HEARTBEAT, TX_FRAMES
  CAN_BIT: 1e-6, STUFF: 1.1,   // CANBT1/2/3 = 00/04/12 at 8 MHz → 1 Mbit/s; stuffing ≈10 % (inferred)
  WDT: 0.0163,                 // WDTCR = 0x08: 16K WDT cycles (AT90CAN128 data sheet, not in the archive) — inferred
  LOADER: 0.003,               // Ross bootloader checks BOOT_CONTROL and jumps to 0x0000 — inferred
  BOOT_WAIT: 5*3000*7*CYC,     // 5 × wait(3000) = 13.1 ms
  ADC_SAMPLE: (2*3000*7 + 13*64 + 60)*CYC,   // AD_CONVERTER_SETUP: 2 × wait(3000) then a 104 µs conversion
  ADC_N: 100,                  // COUNTER_CONSTANT
  SETUP: 0.004,                // DATA_SETUP: CRC16 of ≈30 messages — inferred
  DWELL: 0.5e-3,               // GS2975A rate search: time spent on each rate — inferred (data sheet: async lock typ 1.5 ms, max 10 ms)
  LOS_T: 7.5e-6,               // GS2975A tLA = 5–10 µs
  MFC_GAP: 0.0006, MFC_TO: 0.05,   // frame-controller pacing and timeout — inferred
  DROP_MEAN: 0.045,            // marginal cable: mean time between PLL drop-outs — inferred
  T0_PHASE: 0.37, HEART_PHASE: 0.58,   // where the 1 s counters stand at t = 0 of a steady second — inferred
};
const PASS_V101 = (C.READ_CYC + C.UPD_OVH + 101*C.UPD_IT + C.PROC_CYC + C.WAIT_MAIN*C.WAIT_CYC + 10 + C.CANF_CYC)*CYC*C.ISR_K;
const PASS_PROTO = (C.READ_CYC + C.PROC_CYC + C.WAIT_PROTO*C.WAIT_CYC + 10 + C.CANF_CYC)*CYC*C.ISR_K;
const BOOT_TOTAL = C.LOADER + C.BOOT_WAIT + C.ADC_N*C.ADC_SAMPLE + C.SETUP;

/* ---------------- SDI formats (rates from GS2975A Table 4-2; line structure from SMPTE) ---------------- */
const FMT = {
  sd525:   {name:'SD 525i 59.94', short:'525i', cls:'sd', rate:270e6, ss:2, lines:525, fps:30000/1001, il:true, k:1, act:720, vb:[[1,19],[264,282]]},
  sd625:   {name:'SD 625i 50', short:'625i', cls:'sd', rate:270e6, ss:2, lines:625, fps:25, il:true, k:1, act:720, vb:[[1,22],[311,335],[624,625]]},
  hd1080i59:{name:'HD 1080i 59.94', short:'1080i', cls:'hd', rate:1.485e9/1.001, ss:5, lines:1125, fps:30000/1001, il:true, k:2, act:1920, vb:[[1,20],[561,583],[1124,1125]]},
  hd1080i50:{name:'HD 1080i 50', short:'1080i50', cls:'hd', rate:1.485e9, ss:5, lines:1125, fps:25, il:true, k:2, act:1920, vb:[[1,20],[561,583],[1124,1125]]},
  hd720p59:{name:'HD 720p 59.94', short:'720p', cls:'hd', rate:1.485e9/1.001, ss:5, lines:750, fps:60000/1001, il:false, k:2, act:1280, vb:[[1,25],[746,750]]},
  g3a59:   {name:'3G-A 1080p 59.94', short:'1080p', cls:'3g', rate:2.97e9/1.001, ss:6, lines:1125, fps:60000/1001, il:false, k:2, act:1920, vb:[[1,41],[1122,1125]]},
  g3a50:   {name:'3G-A 1080p 50', short:'1080p50', cls:'3g', rate:2.97e9, ss:6, lines:1125, fps:50, il:false, k:2, act:1920, vb:[[1,41],[1122,1125]]},
  g3b59:   {name:'3G-B 1080p 59.94 (2 links)', short:'3G-B', cls:'3g', rate:2.97e9/1.001, ss:6, lines:1125, fps:30000/1001, il:true, k:4, act:1920, vb:[[1,20],[561,583],[1124,1125]]},
  asi:     {name:'DVB-ASI 270 Mb/s', short:'ASI', cls:'sd', rate:270e6, ss:2, asi:true},
  m143:    {name:'143 Mb/s (SMPTE 259M-A, NTSC composite)', short:'143M', cls:'sd', rate:143.18e6, unsup:true},
  m360:    {name:'360 Mb/s (SMPTE 259M-D, 16:9 SD)', short:'360M', cls:'sd', rate:360e6, unsup:true},
};
Object.values(FMT).forEach(f=>{ if (f.lines){ f.lineT = 1/(f.fps*f.lines); f.W = Math.round(f.rate*f.lineT/10); f.actW = f.act*f.k; } });
/* input equaliser reach (M6203A-SUMMARY-NODATE.pdf; failure lengths from CABLE_LENGTH-06DEC10.pdf); output reach from the summary */
const REACH = { sd:{ok:400, fail:450, out:465}, hd:{ok:150, fail:175, out:210}, '3g':{ok:75, fail:100, out:125} };   // SD fail length inferred (415 m still passed)
const RATE_NAME = {0:'—', 2:'270 Mb/s', 5:'1.485 Gb/s', 6:'2.97 Gb/s'};
const SEARCH = [2,6,5];     // GS2975A Figure 4-3: 270 → 2.970 → 1.485 Gb/s

/* ---------------- card pins (M6203A-iss3.net) ---------------- */
/* P1 card-edge pin → cable driver and pin. Pin 12 is the true-polarity output: inferred from the ASI test (see Findings). */
const P1OUT = {
  75:{drv:'U4', pin:12, src:'DDO0', bnc:'BNC3_SIG', L:'L4', C:'C33'},
  80:{drv:'U4', pin:11, src:'DDO0', bnc:'BNC4_SIG', L:'L3', C:'C32'},
  37:{drv:'U5', pin:12, src:'DDO0', bnc:'BNC5_SIG', L:'L6', C:'C53'},
  34:{drv:'U5', pin:11, src:'DDO0', bnc:'BNC6_SIG', L:'L5', C:'C52'},
  17:{drv:'U6', pin:11, src:'DDO1', bnc:'BNC7_SIG', L:'L8', C:'C66'},
  22:{drv:'U6', pin:12, src:'DDO1', bnc:'BNC8_SIG', L:'L7', C:'C67'},
   5:{drv:'U7', pin:12, src:'DDO1', bnc:'BNC9_SIG', L:'L9', C:'C74'},
  12:{drv:'U7', pin:11, src:'DDO1', bnc:'BNC10_SIG', L:'L10', C:'C73'},
};
/* rear modules — labels from M6203A-T6301.cdr / M6203A-T6401.cdr; routing from t6301.js (T6301-iss4.net) and T6401iss4.net */
const REARS = {
  T6301:{name:'T6301 — single card, 10 BNC', dual:false, bmid2:'5K36', pos:[
    {n:1,lab:'SDI IN',p1:97,role:'in'},{n:2,lab:'NOT USED',p1:92,role:'nc'},
    {n:3,lab:'OUT1',p1:75,role:'out'},{n:4,lab:'OUT5',p1:80,role:'out'},{n:5,lab:'OUT2',p1:37,role:'out'},{n:6,lab:'OUT6',p1:34,role:'out'},
    {n:7,lab:'OUT3',p1:17,role:'out'},{n:8,lab:'OUT7',p1:22,role:'out'},{n:9,lab:'OUT4',p1:5,role:'out'},{n:10,lab:'OUT8',p1:12,role:'out'}]},
  T6401:{name:'T6401 — two cards, 5 BNC each', dual:true, bmid2:'1K13', pos:[
    {n:1,lab:'SDI IN',p1:97,role:'in',c:2},{n:2,lab:'SDI IN',p1:97,role:'in',c:1},
    {n:3,lab:'OUT1',p1:75,role:'out',c:2},{n:4,lab:'OUT1',p1:75,role:'out',c:1},{n:5,lab:'OUT2',p1:37,role:'out',c:2},{n:6,lab:'OUT2',p1:37,role:'out',c:1},
    {n:7,lab:'OUT3',p1:17,role:'out',c:2},{n:8,lab:'OUT3',p1:17,role:'out',c:1},{n:9,lab:'OUT4',p1:5,role:'out',c:2},{n:10,lab:'OUT4',p1:5,role:'out',c:1}]},
};
const BNC_XY = [[0.238,0.505],[0.863,0.505],[0.238,1.13],[0.863,1.13],[0.238,1.755],[0.863,1.755],[0.238,2.38],[0.863,2.38],[0.238,3.005],[0.863,3.005]];
const SLOT_R = [100000,30900,15000,9760,6980,5360,4320,3570,3010,2550,2210,1910,1650,1470,1270,1130,1000,887,787,681]; // Frame Address ID.xls (as opengear.js)
function slotAdc(slot){ const R=SLOT_R[slot-1]; return Math.min(1023, Math.round(1024*R/(R+1000))); }
function ADDRESS_TABLE(v){ const th=[1011,980,948,915,883,851,820,788,755,725,692,658,629,593,563,532,502,471,435,406];
  if (v>1011 && v<=1023) return 1; for (let i=1;i<th.length;i++) if (v>th[i] && v<=th[i-1]) return i+1; return 21; }

/* ---------------- DashBoard objects (Dashboard.c) ---------------- */
const VARIANTS = {
  v101:{label:'v101 — 1.01 (2009|42, release)', rev:'1.01', product:'M6203A', manu:'Ward-Beck Systems', web:'www.ward-beck.com', trap:'once', numparams:9, upgrade:true, debounce:true},
  v100:{label:'v100 — 1.00', rev:'1.00', product:'M6203A', manu:'Ward-Beck Systems', web:'www.ward-beck.com', trap:'untilDump', numparams:5, upgrade:false, debounce:true},
  c030000:{label:'C030000 — 03AC0000 (2013|46, S&L build)', rev:'-', product:'-', manu:'-', web:'-', trap:'once', numparams:9, upgrade:true, debounce:true},
  proto:{label:'Prototype (2007|40)', rev:'1.01', product:'M6203A', manu:'Ward-Beck Systems', web:'www.ward-beck.com', trap:'once', numparams:9, upgrade:false, debounce:false},
};
const CARD_NAME = 'MD-SDI Re-Clocking Distribution Amplifier';   // ParamName_Message (42 bytes)
const PARAM_OIDS = [0x0400,0x0201,0x0202,0x0204,0x0105,0x0106,0x0102,0x010B,0x0104,0x0107];   // ParamOIDS_Message: count byte 9, 10 OIDs listed
const MENU0 = [0x0105,0x0106,0x0102,0x0107,0x010B,0x0104];   // Menu0OID "Card Info"
const MENU1 = [0x0201,0x0204,0x0202];                        // Menu1OID "Card Status"
const MENU2 = [0x0400];                                      // Menu2OID "Card Settings"
const OID = {
  0x0105:{name:'Product', desc:'ParameterProduct_Message', dlen:21, ro:true},
  0x0106:{name:'Name', desc:'ParameterName_Message', dlen:18, ro:true},
  0x0102:{name:'Manufacturer', desc:'ParameterManu_Message', dlen:25, ro:true},
  0x0107:{name:'Board Rev', desc:'descriptor commented out → UNSUPPORTED', dlen:0, ro:true, missing:true},
  0x010B:{name:'Software Rev', desc:'ParameterSoftware_Message', dlen:26, ro:true},
  0x0104:{name:'Website', desc:'ParameterWebsite_Message', dlen:21, ro:true},
  0x0201:{name:'Card Status', desc:'Parameter21_Message (ALARM_TABLE: OK / No SDI Input)', dlen:48, ro:true},
  0x0202:{name:'Sample Rate', desc:'Parameter22_Message (CHOICE: Unlocked / 270 Mbps / 1.5 Gbps / 3.0 Gbps)', dlen:73, ro:true},
  0x0204:{name:'SDI Input', desc:'MESSAGE_CREATOR_PARAMETER_24 (ALARM_TABLE: Locked / HD / SD / Unlocked)', dlen:58, ro:true},
  0x0400:{name:'Notify on Card Fault', desc:'MESSAGE_CREATOR_PARAMETER_40 (RADIO: Enabled / Disabled)', dlen:58},
};
const oidTxt = o => ((o>>8)&0xFF)+'.'+(o&0xFF);
const MSG = {0x10:'REPORT_PARAM',0x11:'TRAP',0x13:'BOOTING',0x40:'START_UPGRADE',0x43:'REBOOT',0x45:'GET_NUMPARAMS',0x46:'GET_PARAM_OIDS',0x47:'GET_DESCRIPTOR',0x49:'GET_PARAM',0x4A:'SET_PARAM',0x50:'GET_MENUSET_NAME',0x51:'GET_MENU_COUNT',0x52:'GET_MENU_NAME',0x53:'GET_MENU_OIDS'};
const msgName = t => (t&0x80)? (MSG[t&0x7F]||'0x'+hx(t&0x7F))+' resp' : (MSG[t]||'0x'+hx(t));
/* SDI Input alarm table as built by MESSAGE_CREATOR_PARAMETER_24: entry = (byte a, byte b, label) */
const P24_TABLE = [[0x00,0x00,'Locked'],[0x01,0x00,'HD'],[0x02,0x00,'SD'],[0x03,0x02,'Unlocked']];
const P21_TABLE = [[0x00,0x00,'OK'],[0x01,0x02,'No SDI Input']];
function alarmLabel(tab, v){ for (const e of tab) if (e[1] && (v & e[1])) return e[2]; return tab[0][2]; }   // first entry whose mask matches, else entry 0 — inferred reading of ALARM_TABLE
function valTxt(oid, v, vr){
  if (v===null || v===undefined) return '—';
  const V=VARIANTS[vr||'v101'];
  switch(oid){
    case 0x0204: return {2:'HD',4:'SD',8:'NO LOCK'}[v]!==undefined ? `${v} (${ {2:'HD',4:'SD',8:'NO LOCK'}[v] })` : String(v);
    case 0x0202: return ['Unlocked','270 Mbps','1.5 Gbps','3.0 Gbps'][v] || String(v);
    case 0x0201: return v===2? 'No SDI Input' : 'OK';
    case 0x0400: return v? 'Enabled' : 'Disabled';
    case 0x0105: return V.product; case 0x0106: return CARD_NAME; case 0x0102: return V.manu; case 0x010B: return V.rev; case 0x0104: return V.web;
  }
  return String(v);
}
function respLen(kind, vr){
  const V=VARIANTS[vr]; const str=s=>4+s.length+1;
  return ({ParamOIDS:24, MenuSet:11, MenuSet1:12, MenuName:14, MenuName0:16, MenuName1:18, Menu0OID:16, Menu1OID:10, Menu2OID:6,
    ParamProductName:str(V.product), ParamName:str(CARD_NAME), ParamManuName:str(V.manu), ParamWebsite:str(V.web), ParamSoftwareRev:str(V.rev)})[kind] || 8;
}
function multiFrames(len){ const n=Math.floor((len+4)/8); const fr=[]; for (let i=0;i<n;i++) fr.push({len:8, flags:i===0?2:0}); fr.push({len:Math.max(0,len-(n*8-4)), flags:1}); return fr; }
function frameTime(n){ return (67 + 8*n) * C.CAN_BIT * C.STUFF; }

/* ---------------- world + firmware state ---------------- */
function mkWorld(){ return { slot:4, rear:'T6301', pos:1, card:true, mfc:true, fw:'v101', in:{cable:true, fmt:'hd1080i59', len:30}, outLen:20 }; }
function mkFw(w){ return {
  mode:'app', modeEnd:Infinity, bootIx:-1, timersOn:true,
  lock60:0x10, sdi_format:2, psdi_format:2, ss:5, pss:5, signal_status_change:0, parameter_change:0, parameter_refresh:0, parameter_tx_complete:1,
  smpte_alarm_enabled:0, restart_sent:1, start_parameter_dump:1, restore_start:0, dashboard_initializing:0, dashboard_count:3,
  t0c: 1000-Math.round(C.T0_PHASE/C.T0), can_data_rx:0, txc: C.HEART+1-Math.round(C.HEART_PHASE/C.T1), dash_index:37,
  frame_count:0, job:null, busyUntil:0, completed:1, reboot_device:0, upgrade_device:0, MOB_error:0,
  pins:{leds:0b00101, pa6:1, pd4:1, pa0:0, pa7:1, z:0},
  link:{locked:true, rate:5, ssPrev:5},
  slot_address: ADDRESS_TABLE(slotAdc(w.slot)),
  nextPass:0.00011, nextT1:0.00003, nextT0:0.00061,
  mfcQ:[], mfcNext:Infinity, mfcWait:false,
  cache:null,
}; }
const D = { w:mkWorld(), s0:null, ev:[], second:1, log:[], ver:0, R:null, Rver:-1,
  ui:{ dashTab:'status', outSel:75, follow:true, lesson:0 } };
function deep(o){ return JSON.parse(JSON.stringify(o, (k,v)=> v===Infinity?'__inf':v), (k,v)=> v==='__inf'?Infinity:v); }
function resetAll(){
  D.w = mkWorld(); const f=mkFw(D.w);
  f.cache = {0x0204:2, 0x0202:2, 0x0201:0, 0x0400:0, 0x0105:'M6203A', 0x0106:CARD_NAME, 0x0102:'Ward-Beck Systems', 0x010B:'1.01', 0x0104:'www.ward-beck.com', seen:true};
  D.s0 = { w: deep(D.w), f };
  D.ev=[]; D.second=1; D.log=[]; D.ver++;
}

/* =====================================================================
   SIGNAL MODEL — equaliser reach, GS2975A rate search, LOCKED / LOS / SS[2:0] / SD/HD pins
   ===================================================================== */
function rng(seed){ let a=seed>>>0; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function rearInputFor(w){ const RM=REARS[w.rear]; return RM.pos.find(p=>p.role==='in' && (!RM.dual || p.c===w.pos)); }
function linkStatus(w){
  if (!w.card) return {pow:false, sig:false, ok:false, why:'card out of the frame'};
  const F=FMT[w.in.fmt];
  if (!w.in.cable) return {pow:true, sig:false, ok:false, F, why:'no cable on SDI IN'};
  const r=REACH[F.cls]; const eye = w.in.len<=r.ok? 'ok' : w.in.len<r.fail? 'marg' : 'bad';
  const ok = !F.unsup && eye!=='bad';
  return {pow:true, sig:true, F, eye, ok, why: F.unsup? F.name+' is not a GS2975A rate' : eye==='bad'? 'cable too long for the GS2974A at this rate' : eye==='marg'? 'cable at the edge of the equaliser reach' : 'ok'};
}
function newSeg(t, w, prev, glitches){
  const st=linkStatus(w);
  const s={t0:t, t1:1, st, lockAt:Infinity, rate:0, drops:[], search:[], ssPrev: prev? prev.ssPrevEnd : 0, cyc:false};
  if (st.pow && st.ok){
    const tgt=st.F.ss; s.rate=tgt;
    const prevLocked = prev && prev.st.pow && prev.st.ok && prev.rate===tgt && prev.lockAt<=t && !inDrop(prev,t);
    if (prevLocked) s.lockAt=t;
    else { const idx=SEARCH.indexOf(tgt); for (let i=0;i<=idx;i++) s.search.push([t+i*C.DWELL, t+(i+1)*C.DWELL, SEARCH[i]]); s.lockAt=t+(idx+1)*C.DWELL; }
    if (st.eye==='marg'){
      const R=rng(9173*D.second + Math.round(t*1e6) + w.in.len*31);
      let tt=s.lockAt + -Math.log(1-R()*0.999)*C.DROP_MEAN;
      while (tt<1.05){ const d=0.00005+R()*0.0006 + (SEARCH.indexOf(tgt)+1)*C.DWELL; s.drops.push([tt, tt+d]); tt += d + -Math.log(1-R()*0.999)*C.DROP_MEAN; }
    }
    (glitches||[]).forEach(g=>{ if (g>=s.lockAt) s.drops.push([g, g+0.0003+(SEARCH.indexOf(tgt)+1)*C.DWELL]); });
    s.drops.sort((a,b)=>a[0]-b[0]);
  } else if (st.pow && st.sig){ s.cyc=true; }
  return s;
}
function inDrop(s,t){ for (const d of s.drops){ if (d[0]>t) break; if (t<d[1]) return true; } return false; }
function segAt(R,t){ const L=R.link; let lo=0, hi=L.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if (L[m].t0<=t) lo=m; else hi=m-1; } return L[lo]; }
function lockedAt(R,t){ const s=segAt(R,t); return !!(s.st.pow && s.st.ok && t>=s.lockAt && !inDrop(s,t)); }
function losAt(R,t){ const s=segAt(R,t); return s.st.pow && !s.st.sig && (t-s.t0)>=C.LOS_T; }
function ssAt(R,t){ const s=segAt(R,t); if (!s.st.pow) return 0; return (s.st.ok && t>=s.lockAt)? s.rate : s.ssPrev; }
function sdhdAt(R,t){ return lockedAt(R,t) && segAt(R,t).rate===2 ? 1 : 0; }
function searchAt(R,t){ const s=segAt(R,t); if (!s.st.pow || !s.st.sig) return null; if (s.cyc) return SEARCH[Math.floor((t-s.t0)/C.DWELL)%3];
  for (const x of s.search) if (t>=x[0] && t<x[1]) return x[2]; for (const d of s.drops) if (t>=d[0] && t<d[1]) return SEARCH[Math.floor((t-d[0])/C.DWELL)%3]; return null; }
function lockIntervals(R,t0,t1){ const out=[];
  R.link.forEach(s=>{ const a=Math.max(t0, s.t0, s.lockAt), b=Math.min(t1, s.t1); if (!(s.st.pow && s.st.ok) || a>=b) return;
    let cur=a; for (const d of s.drops){ if (d[1]<=cur) continue; if (d[0]>=b) break; if (d[0]>cur) out.push([cur, Math.min(d[0],b)]); cur=Math.max(cur,d[1]); } if (cur<b) out.push([cur,b]); });
  return out; }

/* =====================================================================
   FIRMWARE SIMULATION — discrete-event port of main(), PROCESS_*, timer0/timer1/can_rx ISRs and the frame controller
   ===================================================================== */
function simulate(){
  const S=deep(D.s0), w=S.w, f=S.f;
  const ev=D.ev.slice().sort((a,b)=>a.t-b.t);
  const glitches=ev.filter(e=>e.kind==='glitch').map(e=>e.t);
  const R={ link:[], passes:[], pins:[], can:[], segs:[], notes:[], t0sec:[], heart:[], cacheEv:[], cache0:Object.assign({}, f.cache), worlds:[{t:0, w:deep(w)}], end:null };
  const V=()=>VARIANTS[w.fw];
  const prevSeg = f.link.locked ? {st:{pow:true, ok:true}, rate:f.link.rate, lockAt:-1, drops:[], ssPrevEnd:f.link.rate} : null;
  let seg=newSeg(0, w, prevSeg, glitches); if (!prevSeg && f.link.ssPrev) seg.ssPrev=f.link.ssPrev; R.link.push(seg);
  function reseg(t){ seg.t1=t; seg.ssPrevEnd = (seg.st.ok && seg.lockAt<=t)? seg.rate : seg.ssPrev; const s=newSeg(t, w, seg, glitches.filter(g=>g>=t)); R.link.push(s); seg=s; }
  seg.ssPrevEnd = seg.ssPrev;
  const note=(t,s)=>R.notes.push({t,s});
  const pinsPush=(t)=>R.pins.push({t, leds:f.pins.leds, pa6:f.pins.pa6, pd4:f.pins.pd4, pa0:f.pins.pa0, pa7:f.pins.pa7, z:f.pins.z, fmt:f.sdi_format, ss:f.ss, l60:f.lock60, mode:f.mode});
  pinsPush(0);
  const cacheSet=(t,oid,v)=>R.cacheEv.push({t,oid,v});

  /* ---- CAN ---- */
  function txFrame(tt, type, flags, len, desc, oid, val){
    const start=Math.max(tt, f.busyUntil), dur=frameTime(len); f.busyUntil=start+dur; f.completed=0;
    const fr={t:start, dur, dir:'tx', type, flags, len, desc, oid, val}; R.can.push(fr);
    if (oid!==undefined && val!==undefined) cacheSet(start+dur, oid, val);
    return fr;
  }
  function rxFrame(tt, req){ const len=req.type===0x4A?6:3; const start=Math.max(tt, f.busyUntil), dur=frameTime(len); f.busyUntil=start+dur;
    R.can.push({t:start, dur, dir:'rx', type:req.type, flags:3, len, desc:req.desc||msgName(req.type), oid:req.oid}); return start+dur; }
  function respond(tt, req){
    const o=req.oid||0, rt=req.type|0x80, vr=w.fw, VV=V();
    const single=(len, desc, oid, val)=>{ f.frame_count=0; f.job=null; return txFrame(tt, rt, 3, len, desc, oid, val); };
    const unsup=why=>single(1, 'CANRESP_UNSUPPORTED'+(why?' — '+why:''));
    const multi=(len, name, oid, val)=>{ const fr=multiFrames(len); f.job={type:rt, frames:fr, i:1, name, len, oid, val}; f.frame_count=1;
      return txFrame(tt, rt, fr[0].flags, fr[0].len, name+' frame 1/'+fr.length+' (length '+len+' + CRC)'); };
    switch(req.type){
      case 0x45: f.start_parameter_dump=1; return single(3, 'NUMPARAMS = '+VV.numparams+(w.fw==='v100'?' (hard-coded 5)':' (*(ParamOIDS_Message+3))'));
      case 0x46: return multi(respLen('ParamOIDS',vr), 'ParamOIDS_Message');
      case 0x47: { const d=OID[o]; if (!d || d.missing) return unsup('no descriptor for '+oidTxt(o)); return multi(d.dlen, d.desc.split(' ')[0]); }
      case 0x49: {
        const str={0x0105:'ParamProductName',0x0106:'ParamName',0x0102:'ParamManuName',0x0104:'ParamWebsite',0x010B:'ParamSoftwareRev'}[o];
        if (str) return multi(respLen(str,vr), str+'_Message'+(o===0x010B?' (MultiFrameMessageTransmission1)':''), o, valTxt(o,1,vr));
        if (o===0x0204){ const v=f.sdi_format===2?2:f.sdi_format===1?4:8; return single(6, 'GET_PARAM 2.4 SDI Input = '+v, o, v); }
        if (o===0x0202){ const v=f.ss===5?2:f.ss===6?3:f.ss===2?1:0; return single(6, 'GET_PARAM 2.2 Sample Rate = '+v+' ('+valTxt(0x0202,v)+')', o, v); }
        if (o===0x0201){ const v=(f.sdi_format===0 && f.smpte_alarm_enabled)?2:1; return single(6, 'GET_PARAM 2.1 Card Status = '+v+(v===1?' (BIT0, not 0 as in REPORT_PARAM)':''), o, v===1?0:2); }
        if (o===0x0400) return single(6, 'GET_PARAM 4.0 = smpte_alarm_enabled '+f.smpte_alarm_enabled, o, f.smpte_alarm_enabled);
        return unsup(oidTxt(o)+(o===0x0107?' (ParamBoardRev commented out)':''));
      }
      case 0x4A: {
        if (o===0x0400){ f.smpte_alarm_enabled=req.val; return single(6, 'SET 4.0 → smpte_alarm_enabled = '+req.val, o, req.val); }
        if (o===0xFF07 && w.fw!=='v100'){ f.restore_start=req.val; return single(6, 'SET 255.7 → restore_start = '+req.val); }
        if (o===0x0301||o===0x0302||o===0x0303||o===0x0304) return single(6, 'SET '+oidTxt(o)+' accepted (M6202A leftover: output1/output2, never used)');
        return unsup(oidTxt(o));
      }
      case 0x50: return req.b1<2? multi(respLen(req.b1?'MenuSet1':'MenuSet',vr), req.b1?'MenuSet1_Message "Control"':'MenuSet_Message "Status"') : unsup();
      case 0x51: return req.b1<2? single(3, 'MENU_COUNT set '+req.b1+' = '+(req.b1?1:2)) : unsup();
      case 0x52: { const k=req.b1+'.'+req.b2; const m={'0.0':['MenuName','"Card Info"'],'0.1':['MenuName0','"Card Status"'],'1.0':['MenuName1','"Card Settings"']}[k]; return m? multi(respLen(m[0],vr), m[0]+'_Message '+m[1]) : unsup(); }
      case 0x53: { const k=req.b1+'.'+req.b2; const m={'0.0':'Menu0OID','0.1':'Menu1OID','1.0':'Menu2OID'}[k]; return m? multi(respLen(m,vr), m+'_Message') : unsup(); }
      case 0x43: f.reboot_device=1; return single(1, 'REBOOT ok → reboot_device = YES');
      case 0x40: if (!VV.upgrade) return unsup('no START_UPGRADE case in '+w.fw);
                 f.reboot_device=1; f.upgrade_device=1; return single(3, 'CAN_UPGRADE_WAIT 0x03E8 (1000 ms) → reboot_device = upgrade_device = YES');
      default: return unsup();
    }
  }
  function canTxTimer(tt){
    if (f.completed){
      f.completed=0;
      const trapNow = V().trap==='once'? !f.restart_sent : !f.start_parameter_dump;
      if (f.frame_count===0 && trapNow){
        txFrame(tt, 0x11, 3, 1, 'TRAP CANTRAP_RESTART → CANADDR_TRAP'+(V().trap==='once'?'':' (v100: repeats until GET_NUMPARAMS)')); f.restart_sent=1;
      } else if (f.frame_count===0 && !f.restore_start){
        let oid, v; const pr=f.parameter_refresh;
        if (pr===0){ oid=0x0204; v=f.sdi_format===1?4:f.sdi_format===2?2:8; }
        else if (pr===1){ oid=0x0202; v=(f.ss===5&&f.sdi_format===2)?2:(f.ss===6&&f.sdi_format===2)?3:(f.ss===2&&f.sdi_format===1)?1:0; if (!v) f.ss=0; }
        else { oid=0x0201; v=(f.sdi_format===0 && f.smpte_alarm_enabled)?2:0; }
        txFrame(tt, 0x10, 3, 6, 'REPORT_PARAM '+['SDI_FORMAT','SAMPLE_RATE','SIGNAL_STATUS'][pr]+' ('+oidTxt(oid)+') = '+v, oid, v);
        f.parameter_tx_complete=1; f.parameter_change=0; R.heart.push(tt);
      } else if (f.frame_count!==0 && f.job){
        const j=f.job, fr=j.frames[j.i];
        const x=txFrame(tt, j.type, fr.flags, fr.len, j.name+' frame '+(j.i+1)+'/'+j.frames.length);
        j.i++; if (j.i>=j.frames.length){ if (j.oid!==undefined) cacheSet(x.t+x.dur, j.oid, j.val); f.frame_count=0; f.job=null; } else f.frame_count=j.i;
      }
    }
  }
  function t1Tick(tt){
    if (f.busyUntil<=tt) f.completed=1;                // CANTX_BUFFER_CHECK
    if (f.frame_count!==0){
      canTxTimer(tt);
      if (f.frame_count!==0){ if (f.txc>C.TXF){ if (f.busyUntil<=tt) f.completed=1; canTxTimer(tt); f.txc=0; } else f.txc++; }
    } else if (f.dashboard_initializing){ if (f.txc > 1000*f.slot_address){ canTxTimer(tt); f.txc=0; } else f.txc++; }
    else { if (f.txc > C.HEART){ canTxTimer(tt); f.txc=0; } else f.txc++; }
  }
  function t0Tick(tt){
    if (f.t0c===1000){
      if (f.dash_index>=100) R.notes.push({t:tt, s:'timer0: dashboard_counter_buffer['+f.dash_index+'] written — one past the end (0x03BA = canbus_status_buffer)'});
      f.dash_index = f.dash_index<100? f.dash_index+1 : 0;
      if (f.can_data_rx < 10){ f.dashboard_count++; if (f.dashboard_count>=3 && f.dashboard_initializing){ f.dashboard_initializing=0; note(tt,'timer0: < 10 CAN messages for 3 s → dashboard_initializing = NO (heartbeat every 10 000 ticks)'); } }
      else { if (!f.dashboard_initializing) note(tt,'timer0: '+f.can_data_rx+' messages in the last second → dashboard_initializing = YES (report every 1000 × slot_address ticks)'); f.dashboard_initializing=1; f.dashboard_count=0; }
      R.t0sec.push(tt); f.t0c=0; f.can_data_rx=0;
    } else f.t0c++;
  }
  /* ---- PROCESS_SDI_LOCK_STATUS ---- */
  function processLock(sd_hd, ssPin){
    let L=f.pins.leds; const on=b=>L|=(1<<b), off=b=>L&=~(1<<b);
    f.ss=ssPin;
    if (f.lock60){
      on(0); f.pins.pa0=0; f.pins.pa6=1; f.pins.pa7=1; f.pins.pd4=1;
      if (sd_hd){ f.sdi_format=1; off(4); if (f.ss===2){ on(1); off(2); off(3); } else { f.ss=0; off(1); off(2); off(3); } }
      else { f.sdi_format=2; off(4); if (f.ss===5){ off(1); on(2); off(3); } else if (f.ss===6){ off(1); off(2); on(3); } else { f.ss=0; off(1); off(2); off(3); } }
    } else {
      on(4); off(0); f.pins.pa0=0; f.pins.pa6=0; f.sdi_format=0; f.ss=0; off(1); off(2); off(3); f.pins.pd4=0;
    }
    f.pins.leds=L; f.pins.z=0;
  }
  function parameterUpdate(){
    if (f.parameter_change) return;
    if (f.sdi_format!==f.psdi_format){ f.parameter_refresh=0; f.parameter_change=1; f.psdi_format=f.sdi_format; f.signal_status_change=1; }
    else if (f.ss!==f.pss){ f.parameter_refresh=1; f.parameter_change=1; f.pss=f.ss; f.signal_status_change=1; }
    else if (f.signal_status_change){ f.parameter_refresh=2; f.parameter_change=1; f.signal_status_change=0; }
    else if (f.parameter_tx_complete){ f.parameter_refresh = f.parameter_refresh===2? 0 : f.parameter_refresh+1; }
  }
  function mainPass(t){
    const K=C.ISR_K, rec={t};
    const sd_hd=sdhdAt(R,t), ssPin=ssAt(R,t);
    rec.ssPin=ssPin; rec.sdhd=sd_hd;
    let tt=t+C.READ_CYC*CYC*K;
    if (V().debounce){
      rec.tU0=tt; tt+=C.UPD_OVH*CYC*K; let cnt=0; const was=f.lock60; const smp=[];
      for (let i=0;i<=100;i++){ const v=lockedAt(R,tt); const hit = was? !v : v; if (hit) cnt++; smp.push(v?1:0); tt += (hit?C.UPD_IT_CNT:C.UPD_IT)*CYC*K; }
      if (!was && cnt>=95) f.lock60=0x10; else if (was && cnt>=5) f.lock60=0;
      rec.n=cnt; rec.was=was; rec.smp=smp; rec.tU1=tt;
    } else { f.lock60 = lockedAt(R,t)? 0x10 : 0; rec.tU0=rec.tU1=tt; rec.n=f.lock60?1:0; rec.was=-1; }
    rec.tP=tt; processLock(sd_hd, ssPin); const p=R.pins[R.pins.length-1];
    if (!p || p.leds!==f.pins.leds || p.pd4!==f.pins.pd4 || p.pa6!==f.pins.pa6 || p.fmt!==f.sdi_format || p.ss!==f.ss || p.l60!==f.lock60 || p.mode!==f.mode) pinsPush(tt);
    tt += C.PROC_CYC*CYC*K; rec.tW=tt;
    tt += ((w.fw==='proto'?C.WAIT_PROTO:C.WAIT_MAIN)*C.WAIT_CYC+10)*CYC*K; rec.tC=tt;
    parameterUpdate();
    if (f.MOB_error){ f.MOB_error=0; note(tt,'CAN_FUNCTIONS: MOB_error starts as YES → CANinit() a second time (timers restart)'); f.nextT1=tt+C.T1_FIRST; f.nextT0=tt+C.T0; f.txc=0; }
    rec.pr=f.parameter_refresh; rec.pc=f.parameter_change; rec.l60=f.lock60; rec.fmt=f.sdi_format; rec.ss=f.ss;
    tt += C.CANF_CYC*CYC*K; rec.end=tt;
    R.passes.push(rec);
    if (f.reboot_device){
      f.reboot_device=0; const upg=f.upgrade_device; f.upgrade_device=0;
      note(tt, upg? 'CAN_FUNCTIONS: eepromWriteByte(BOOT_CONTROL, BOOTC_RUNLDR); while(1) CLI(); — watchdog reset into the bootloader' : 'CAN_FUNCTIONS: reboot_device → while(1) CLI(); — no WDR, the watchdog resets the AVR');
      enterWdt(tt, upg); return;
    }
    f.nextPass=tt;
  }
  /* ---- modes ---- */
  function seg2(t0,t1,kind,label){ R.segs.push({t0,t1,kind,label}); }
  function floatPins(t){ f.pins={leds:0, pa6:1, pd4:1, pa0:0, pa7:1, z:1}; pinsPush(t); }
  function enterWdt(t, upg){ f.mode='wdt'; f.timersOn=false; f.modeEnd=t+C.WDT; f.upg=upg; f.frame_count=0; f.job=null; floatPins(t); seg2(t, t+C.WDT, 'wdt', 'watchdog time-out ≈16 ms (interrupts off, no WDR)'); }
  function startBoot(t, cold){
    f.mode='boot'; f.timersOn=false; f.bootIx=0; f.bootT=t;
    Object.assign(f, {lock60:0, sdi_format:0, psdi_format:0, ss:0, pss:0, signal_status_change:0, parameter_change:0, parameter_refresh:0, parameter_tx_complete:0, smpte_alarm_enabled:0,
      restart_sent:0, start_parameter_dump:0, restore_start:0, dashboard_initializing:1, dashboard_count:0, t0c:0, can_data_rx:0, txc:0, frame_count:0, job:null, MOB_error:1, mfcQ:[], mfcNext:Infinity, mfcWait:false});
    f.slot_address = ADDRESS_TABLE(slotAdc(w.slot));
    f.bootPlan = [[C.LOADER,'loader','Ross bootloader: BOOT_CONTROL ≠ RUNLDR → jump to application '+'(duration inferred)'],
      [C.BOOT_WAIT,'init','initialization(); DATA_INITIALIZATION(); CAN_RX; 5 × wait(3000) = 13.1 ms — LEDs off, PD4 low (drivers disabled)'],
      [C.ADC_N*C.ADC_SAMPLE,'slotid','slot ID: 100 × AD_CONVERTER_SETUP (2 × wait(3000) + 104 µs conversion each) → ADDRESS_TABLE = slot '+f.slot_address],
      [C.SETUP,'setup','DATA_SETUP (CRC16 of every message) · CANinit (timers start) · CAN_TX']];
    nextBootPhase(t, cold);
  }
  function nextBootPhase(t){
    const ph=f.bootPlan[f.bootIx];
    if (!ph){ f.mode='app'; f.timersOn=true; f.nextT1=t+C.T1_FIRST; f.nextT0=t+C.T0; f.nextPass=t; f.modeEnd=Infinity; note(t,'main(): CANinit done, entering while(1) — first timer1 overflow in 96 ms'); return; }
    if (ph[1]==='loader') floatPins(t);
    if (ph[1]==='init'){ f.pins={leds:0, pa6:1, pd4:0, pa0:0, pa7:1, z:0}; pinsPush(t); }
    seg2(t, t+ph[0], ph[1], ph[2]); f.modeEnd=t+ph[0]; f.bootIx++;
  }
  function powerOff(t){ f.mode='off'; f.timersOn=false; f.modeEnd=Infinity; f.pins={leds:0,pa6:0,pd4:0,pa0:0,pa7:0,z:0}; f.frame_count=0; f.job=null; f.mfcQ=[]; f.mfcNext=Infinity; pinsPush(t); }

  /* ---- MFC: the frame controller sends DashBoard's requests one at a time ---- */
  function mfcStep(t){
    const req=f.mfcQ.shift(); if (!req){ f.mfcNext=Infinity; return; }
    if (!w.mfc){ f.mfcQ=[]; f.mfcNext=Infinity; return; }
    if (f.mode!=='app'){ R.can.push({t, dur:frameTime(3), dir:'rx', type:req.type, flags:3, len:3, desc:(req.desc||msgName(req.type))+' — no answer (card '+f.mode+')', oid:req.oid}); f.mfcNext=t+C.MFC_TO; return; }
    const end=rxFrame(t, req); f.can_data_rx++;
    respond(end, req);
    if (f.frame_count!==0) f.mfcWait=true; else f.mfcNext=f.busyUntil+C.MFC_GAP;
  }

  /* ---- main event loop ---- */
  let ei=0, t=0, guard=0;
  if (f.mode==='boot' && f.bootPlan && f.bootIx>0){ const ph=f.bootPlan[f.bootIx-1]; seg2(0, Math.min(1,f.modeEnd), ph[1], ph[2]+' (continued)'); }
  if (f.mode==='wdt') seg2(0, Math.min(1,f.modeEnd), 'wdt', 'watchdog time-out (continued)');
  if (f.mode==='loader') seg2(0, 1, 'loader', 'Ross bootloader waiting for the upgrade pages');
  while (t<1 && guard++<400000){
    const tEv = ei<ev.length? ev[ei].t : Infinity;
    const tPass = f.mode==='app'? f.nextPass : Infinity;
    const tT1 = f.timersOn? f.nextT1 : Infinity, tT0 = f.timersOn? f.nextT0 : Infinity;
    const tM = f.modeEnd, tMfc = f.mfcNext;
    t = Math.min(tEv, tPass, tT1, tT0, tM, tMfc);
    if (t>=1) break;
    if (t===tEv){
      const e=ev[ei++];
      if (e.kind==='world'){ const hadCard=w.card; e.fn(w); R.worlds.push({t, w:deep(w)}); reseg(t);
        if (hadCard && !w.card){ powerOff(t); note(t,'card pulled: power gone'); }
        if (!hadCard && w.card){ note(t,'card inserted: power-on reset'); startBoot(t, true); } }
      else if (e.kind==='mfc'){ f.mfcQ.push(...e.reqs.map(r=>Object.assign({},r))); if (f.mfcNext===Infinity && !f.mfcWait) f.mfcNext=t; }
      continue;
    }
    if (t===tM){
      if (f.mode==='wdt'){ if (f.upg){ f.mode='loader'; f.modeEnd=Infinity; seg2(t, 1, 'loader', 'Ross bootloader: BOOT_CONTROL = RUNLDR → BOOTING, waits for UPGRADE_PAGE (the page transfer is modelled in the openGear plugin)'); }
                           else startBoot(t); }
      else if (f.mode==='boot') nextBootPhase(t);
      continue;
    }
    if (t===tMfc){ mfcStep(t); continue; }
    if (t===tT1){ t1Tick(t); f.nextT1 = t + C.T1;
      if (f.mfcWait && f.frame_count===0){ f.mfcWait=false; f.mfcNext=f.busyUntil+C.MFC_GAP; } continue; }
    if (t===tT0){ t0Tick(t); f.nextT0 = t + C.T0; continue; }
    if (t===tPass){ mainPass(t); continue; }
  }
  seg.t1=1; seg.ssPrevEnd = (seg.st.ok && seg.lockAt<1)? seg.rate : seg.ssPrev;
  // carry into the next second
  f.nextPass-=1; f.nextT1-=1; f.nextT0-=1; if (f.modeEnd!==Infinity) f.modeEnd-=1; if (f.mfcNext!==Infinity) f.mfcNext=Math.max(0,f.mfcNext-1); f.busyUntil=Math.max(0,f.busyUntil-1);
  f.link={locked: lockedAt(R,0.99999), rate: seg.rate, ssPrev: seg.ssPrevEnd};
  const c=Object.assign({}, R.cache0); R.cacheEv.sort((a,b)=>a.t-b.t).forEach(e=>{ c[e.oid]=e.v; c.seen=true; }); f.cache=c;
  R.end={w:deep(w), f};
  return R;
}
function sim(){ if (D.Rver!==D.ver || !D.R){ D.R=simulate(); D.Rver=D.ver; } return D.R; }
function worldAt(t){ const ws=sim().worlds; let r=ws[0]; for (const x of ws){ if (x.t<=t) r=x; else break; } return r.w; }
function pinsAt(t){ const P=sim().pins; let lo=0, hi=P.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if (P[m].t<=t) lo=m; else hi=m-1; } return P[lo]; }
function passAt(t){ const P=sim().passes; let lo=0, hi=P.length-1; if (hi<0) return null; while(lo<hi){ const m=(lo+hi+1)>>1; if (P[m].t<=t) lo=m; else hi=m-1; } const p=P[lo]; return (p.t<=t && t<p.end+0.002)? p : null; }
function segModeAt(t){ let r=null; for (const g of sim().segs) if (g.t0<=t && t<g.t1) r=g; return r; }
function cacheAt(t){ const R=sim(); const c=Object.assign({}, R.cache0); for (const e of R.cacheEv){ if (e.t>t) break; c[e.oid]=e.v; c.seen=true; } return c; }
function outState(t){ // what the cable drivers put out
  const p=pinsAt(t), R=sim(), w=worldAt(t);
  if (!w.card || p.mode==='off') return 'off';
  if (p.z) return 'z';
  if (!p.pd4) return 'disabled';
  if (!p.pa6) return 'muted';
  return lockedAt(R,t)? 'on' : 'invalid';
}
const OUT_TXT = {on:'reclocked SDI', muted:'muted (DDO latched — no transitions)', disabled:'drivers disabled (~DISABLE low)', invalid:'unlocked reclocker: invalid data (no AUTOBYPASS)', z:'control pins floating (reset / bootloader)', off:'no power'};
function stepAt(t){ const g=segModeAt(t); if (g) return {seg:g};
  const p=passAt(t); if (!p) return {idle:true};
  if (t<p.tU0) return {p, k:0}; if (t<p.tU1) return {p, k:1, i: Math.min(100, Math.floor((t-p.tU0)/((p.tU1-p.tU0)/101)))}; if (t<p.tW) return {p,k:2}; if (t<p.tC) return {p,k:3}; return {p,k:4}; }
const STEPS = [
  ['WDR · READ_GS2975_STATUS', 'los = PINA & BIT3 (really SS2) · sd_hd = PIND & BIT7 · ss = (PINA & 0x0E) >> 1'],
  ['PROCESS_SDI_LOCK_STATUS_UPDATE', '101 samples of LOCKED (PA4): ≥95 high → lock60 = 0x10; ≥5 low → 0x00'],
  ['PROCESS_SDI_LOCK_STATUS', 'LOCK / NO LOCK / 270M / 1.5G / 3G LEDs (PB0–PB4), ~DDO_MUTE (PA6), ~DISABLE (PD4), BYPASS low'],
  ['wait(1000)', '7 000 cycles of WDR + count ≈ 0.9 ms — the loop does nothing else'],
  ['CAN_FUNCTIONS → PARAMETER_UPDATE', 'pick the next REPORT_PARAM; re-init CAN on MOB_error; reboot if asked'],
];

/* =====================================================================
   USER ACTIONS — each one logs the real code path
   ===================================================================== */
function addEvent(e){ let t=SIM.t; if (t>0.95){ rollSecond(); t=0.02; } e.t=Math.max(0.0004, t); D.ev.push(e); D.ver++; return e.t; }
function rollSecond(){ const R=sim(); D.s0={w:deep(R.end.w), f:deep(R.end.f)}; D.ev=[]; D.second++; D.ver++; SIM.seek(0); }
function act(name, fn){
  const tr=[]; fn(s=>tr.push(s));
  D.log.unshift({t:SIM.t, sec:D.second, name, trace:tr}); if (D.log.length>50) D.log.length=50;
  if (!SIM.playing && D.ui.follow){ const last=D.ev.length? D.ev[D.ev.length-1].t : SIM.t; SIM.seek(Math.min(0.999, Math.max(SIM.t,last)+0.004)); } else SIM.refresh();
}
const worldEv=(label,fn)=>addEvent({kind:'world', label, fn});
const mfcEv=(label,reqs)=>addEvent({kind:'mfc', label, reqs});
function powerCycle(fn){ const t=addEvent({kind:'world', label:'pull', fn:w2=>{ fn(w2); w2.card=false; }}); D.ev.push({kind:'world', label:'insert', t:t+0.00002, fn:w2=>{ w2.card=true; }}); D.ver++; }
function openReqs(vr){
  const n=VARIANTS[vr].numparams, list=PARAM_OIDS.slice(0,n);
  const r=[{type:0x45}, {type:0x46, desc:'GET_PARAM_OIDS'}];
  list.forEach(o=>r.push({type:0x47, oid:o, desc:'GET_DESCRIPTOR '+oidTxt(o)}));
  [[0x50,0],[0x50,1],[0x51,0],[0x51,1]].forEach(([ty,b])=>r.push({type:ty, b1:b, desc:msgName(ty)+' '+b}));
  [[0,0],[0,1],[1,0]].forEach(([a,b])=>r.push({type:0x52, b1:a, b2:b, desc:'GET_MENU_NAME '+a+'.'+b}));
  [[0,0],[0,1],[1,0]].forEach(([a,b])=>r.push({type:0x53, b1:a, b2:b, desc:'GET_MENU_OIDS '+a+'.'+b}));
  MENU0.concat(MENU1, MENU2).filter(o=>list.indexOf(o)<0).forEach(o=>r.push({type:0x47, oid:o, desc:'GET_DESCRIPTOR '+oidTxt(o)+' (from a menu)'}));
  MENU0.concat(MENU1, MENU2).forEach(o=>r.push({type:0x49, oid:o, desc:'GET_PARAM '+oidTxt(o)}));
  return r;
}
const A = {
  cable(on){ act(on? 'Plug a cable into SDI IN' : 'Unplug SDI IN', tr=>{
    const w=worldAt(SIM.t), F=FMT[w.in.fmt], RM=REARS[w.rear], p=rearInputFor(w);
    worldEv('cable', w2=>{ w2.in.cable=on; });
    tr(`${w.rear} position ${p.n} → P1-97 (BNC1_SIG) → R1 75R / L1 4.7n return-loss network → C1/C2 → U1 GS2974A adaptive equaliser`);
    if (on){ const st=linkStatus(Object.assign(deep(w),{in:Object.assign({},w.in,{cable:true})}));
      tr(`GS2974A → C5/C6 4.7 µF → U3 GS2975A DDI0. Rate search 270 → 2970 → 1485 Mb/s, ${C.DWELL*1e3} ms per rate ${inf}; data sheet: asynchronous lock typ 1.5 ms`);
      tr(st.ok? `LOCKED (U3-28 → PA4) goes high; SS[2:0] = ${F.ss.toString(2).padStart(3,'0')} (${RATE_NAME[F.ss]}) on PA3..PA1; SD/HD (U3-33 → PD7) = ${F.ss===2?'HIGH':'LOW'}` : `No lock: ${st.why}. LOCKED stays low — the firmware keeps the outputs muted and disabled.`);
      tr('Next pass: PROCESS_SDI_LOCK_STATUS_UPDATE needs 95 of 101 LOCKED samples high → lock60 = 0x10 → PROCESS_SDI_LOCK_STATUS lights LOCK and the rate LED, raises ~DDO_MUTE (PA6) and ~DISABLE (PD4).');
    } else {
      tr('GS2975A: no transitions on DDI0 → LOS (U3-29) high after 5–10 µs; the PLL drops LOCKED and starts searching.');
      tr('Next pass: 5 or more of the 101 samples low → lock60 = 0 → NO LOCK LED (PB4), DDO_MUTE_ENABLED (PA6 low), SDI_OUTPUTS_DISABLED (PD4 low), sdi_format = NO_LOCK, ss = 0.');
      tr('PARAMETER_UPDATE: sdi_format ≠ psdi_format → parameter_refresh = SDI_FORMAT; DashBoard hears it at the next heartbeat (≤0.96 s), then SAMPLE_RATE and SIGNAL_STATUS one heartbeat each.');
    } }); },
  fmt(k){ act('Input format → '+FMT[k].name, tr=>{
    worldEv('fmt', w2=>{ w2.in.fmt=k; });
    const F=FMT[k];
    tr(F.unsup? `${F.name}: the GS2975A only locks to 270, 1483.5/1485 and 2967/2970 Mb/s (Table 4-2). AUTOBYPASS (U3-20) is tied to GND and the firmware never sets BYPASS, so the card mutes instead of passing it.`
      : `${F.name}${F.asi?' — 8b/10b at 270 Mb/s; the GS2975A reclocks DVB-ASI like SD (data sheet 4.9)':''}: rate ${(F.rate/1e6).toFixed(F.rate<1e9?0:1)} Mb/s → GS2975A relocks; SS[2:0] = ${F.ss.toString(2).padStart(3,'0')}.`);
    tr('The PLL loses lock while it re-searches: a few passes see LOCKED low → lock60 = 0 → outputs muted for ≈1 pass, then re-enabled.'); }); },
  len(m){ act('Input cable length → '+m+' m', tr=>{ worldEv('len', w2=>{ w2.in.len=m; }); const w=worldAt(SIM.t), F=FMT[w.in.fmt], r=REACH[F.cls];
    tr(`GS2974A reach at ${F.cls.toUpperCase()}: ${r.ok} m tested good, ${r.fail} m failed (CABLE_LENGTH-06DEC10 / SUMMARY test sheets).`);
    tr(m<=r.ok? 'Eye open: steady lock.' : m<r.fail? `Marginal: the reclocker drops lock now and then ${inf}; each drop-out longer than ≈20 µs inside an UPDATE window trips the 5-of-101 rule.` : 'Too long: no lock.'); }); },
  glitch(){ act('Inject a 0.3 ms PLL drop-out', tr=>{ addEvent({kind:'glitch'});
    tr('LOCKED low for 0.3 ms + the rate search to relock. If the drop overlaps a PROCESS_SDI_LOCK_STATUS_UPDATE window by ≥5 samples (≈20 µs), lock60 → 0 and the outputs mute for a pass; if it falls inside wait(1000) the firmware never sees it.'); }); },
  setSlot(s){ act('Move the card to slot '+s, tr=>{ powerCycle(w2=>{ w2.slot=s; });
    tr(`Pull and re-insert in slot ${s}: AN_SLOTID (P2-6 → PF0) reads the frame's ID ladder (${SLOT_R[s-1]} Ω) → ADC ${slotAdc(s)} → ADDRESS_TABLE = ${ADDRESS_TABLE(slotAdc(s))}; moduleAddress() → CAN address 0x${hx(0x10+ADDRESS_TABLE(slotAdc(s)))} ${inf}.`); }); },
  setRear(r){ act('Fit rear module '+r, tr=>{ worldEv('rear', w2=>{ w2.rear=r; }); const RM=REARS[r];
    tr(`${RM.name}: AN_BMID2 ${RM.bmid2} (P1-1 → PF2). The firmware never reads it — and port_init() makes PF2 an output (DDRF = 0x0C), driving the ID line low against R54 1K.`);
    if (RM.dual) tr('Each card gets SDI IN + OUT1–OUT4 on P1-97, 75, 37, 17, 5. P1-80/34/22/12 (OUT5–OUT8) end at the connector unused.'); }); },
  insert(on){ act(on?'Insert the card':'Pull the card', tr=>{ worldEv('card', w2=>{ w2.card=on; });
    if (on){ tr('Power-on reset → Ross bootloader (BOOTRST fuse) → main(): initialization(), DATA_INITIALIZATION() — every LED off, PD4 low: the 8 outputs stay off for the whole boot.');
      tr(`5 × wait(3000) = 13.1 ms; slot ID = 100 ADC samples × ${(C.ADC_SAMPLE*1e3).toFixed(2)} ms = ${(C.ADC_N*C.ADC_SAMPLE).toFixed(3)} s; DATA_SETUP; CANinit; CAN_TX — ≈${BOOT_TOTAL.toFixed(2)} s before the first pass.`);
      tr('dashboard_initializing starts YES, so the RESTART trap waits 96 ms + 1000 × slot_address timer1 ticks.'); }
    else tr('All power gone: the GS2975A, the cable drivers and the AVR stop. Downstream equipment sees loss of signal at once.'); }); },
  dashOpen(){ act('DashBoard: open the card (rescan)', tr=>{ const w=worldAt(SIM.t);
    if (!w.mfc){ tr('No frame controller.'); return; }
    const reqs=openReqs(w.fw); mfcEv('open', reqs);
    tr(`Frame controller → CAN: ${reqs.length} requests to 0x${hx(0x10+ADDRESS_TABLE(slotAdc(w.slot)))} (order of the requests ${inf}).`);
    tr(`GET_NUMPARAMS answers ${VARIANTS[w.fw].numparams}${w.fw==='v100'?' (v100 hard-codes 5)':' — the count byte of ParamOIDS_Message, although 10 OIDs follow'}; Board Rev 1.7 is in Menu0OID but its descriptor is commented out → UNSUPPORTED.`);
    tr('Each request lands in can_rx_isr → CANRX → DASHBOARD_RESPONSE_SETUP; multi-frame replies go out one frame per timer1 tick (CAN_TX_TIMER). can_data_rx counts them: ≥10 in a second → dashboard_initializing = YES at the next timer0 second.'); }); },
  dashRefresh(){ act('DashBoard: refresh status', tr=>{ const reqs=MENU1.concat(MENU2).map(o=>({type:0x49, oid:o, desc:'GET_PARAM '+oidTxt(o)})); mfcEv('refresh', reqs);
    tr('GET_PARAM 2.1, 2.4, 2.2, 4.0 — answered straight from sdi_format, ss and smpte_alarm_enabled.'); tr('Note: GET_PARAM 2.1 returns BIT0 (1) for OK, REPORT_PARAM sends 0.'); }); },
  notify(v){ act('DashBoard: Notify on Card Fault → '+(v?'Enabled':'Disabled'), tr=>{ mfcEv('notify', [{type:0x4A, oid:0x0400, val:v, desc:'SET_PARAM 4.0 = '+v}]);
    tr(`SET_PARAM 0x4A [00 04 00 02 00 ${hx(v)}] → DASHBOARD_RESPONSE_SETUP → smpte_alarm_enabled = ${v}; echoed back.`);
    tr('Nothing is written to EEPROM: after a power cycle the card starts with smpte_alarm_enabled = NO (DataSafe on the frame controller would have to restore it '+inf+').');
    tr('Card Status (2.1) only changes on the next SIGNAL_STATUS report — the SET itself does not set signal_status_change.'); }); },
  reboot(){ act('DashBoard: Reboot', tr=>{ mfcEv('reboot', [{type:0x43, desc:'REBOOT'}]);
    tr('CANMSG_REBOOT → reply 00 → reboot_device = YES. Next CAN_FUNCTIONS(): while(1) CLI(); — interrupts off, no WDR.');
    tr(`Watchdog (WDTCR = 0x08, ≈16 ms ${inf}) resets the AVR. Its pins float until port_init(): ~DISABLE, ~DDO_MUTE, BYPASS and DATA/CLOCK have no pull resistors in the netlist.`);
    tr(`Then the full boot: outputs disabled for ≈${(C.WDT+BOOT_TOTAL).toFixed(2)} s, mostly the 100-sample slot-ID average.`); }); },
  upgrade(){ act('DashBoard: Upload firmware', tr=>{ const w=worldAt(SIM.t); mfcEv('upgrade', [{type:0x40, desc:'START_UPGRADE m6203a_v1_01.bin'}]);
    if (!VARIANTS[w.fw].upgrade){ tr(`${w.fw}: DASHBOARD_RESPONSE_SETUP has no CANMSG_START_UPGRADE case → UNSUPPORTED. Field upgrade arrived with v101 ("datasafe and bootloader", history sheet 2009-10-20).`); return; }
    tr('START_UPGRADE → CAN_UPGRADE_WAIT, 0x03E8 → reboot_device = upgrade_device = YES.');
    tr('CAN_FUNCTIONS: CLI(); eepromWriteByte(BOOT_CONTROL, BOOTC_RUNLDR); while(1) CLI(); → watchdog → the Ross bootloader stays resident and takes the pages of m6203a_v1_01.bin (zeuspack /p M6203A /v 1.01).'); }); },
  fw(k){ act('Firmware build → '+VARIANTS[k].label, tr=>{ powerCycle(w2=>{ w2.fw=k; });
    tr('Re-flash and reboot with this build (modelled as a pull/insert).');
    if (k==='proto') tr('Prototype: READ_GS2975_STATUS sets lock60 = PINA & BIT4 directly — one sample per pass, no debounce; the loop waits wait(300) only.');
    if (k==='v100') tr('v100: CAN_TX_TIMER sends TRAP RESTART over and over until DashBoard sends GET_NUMPARAMS (start_parameter_dump); NUMPARAMS = 5; no START_UPGRADE.');
    if (k==='c030000') tr('C030000 (S&L): Product, Manufacturer, Software Rev and Website strings are "-" (Ali-Rem/Ali-Add blocks); the card Name string is unchanged.'); }); },
  outLen(m){ act('Output cable → '+m+' m', tr=>{ worldEv('olen', w2=>{ w2.outLen=m; }); const w=worldAt(SIM.t), r=REACH[FMT[w.in.fmt].cls];
    tr(`GS2978 cable driver reach at ${FMT[w.in.fmt].cls.toUpperCase()}: ${r.out} m (SUMMARY sheet). The undated sheet notes "bad eye" from 25 m at 3G even when picture and audio are OK.`); }); },
};

/* =====================================================================
   DRAWING — card (ISS3 gerbers), card edge, rear module, frame, DashBoard window
   ===================================================================== */
/* PNP (mil, origin 3495,5885) → image px: board area x 2.45…15.30 in, y 5.60…8.65 in at 120 dpi (1542 × 366) */
const PNP = (x,y)=>[(x/1000+3.495-2.45)*120, (8.65-(y/1000+5.885))*120];
const LEDS = [ // LED1..LED5 (iss3 netlist + pnp), silk labels LOCK / 270M / 1.5G / 3G / NO LOCK
  {ref:'LED1', y:2230, lab:'LOCK', col:'var(--led-g)', port:'PB0', mac:'LOCK_LED'},
  {ref:'LED2', y:2040, lab:'270M', col:'var(--led-a)', port:'PB1', mac:'SR_270_LED'},
  {ref:'LED3', y:1850, lab:'1.5G', col:'var(--led-a)', port:'PB2', mac:'SR_1G5_LED'},
  {ref:'LED4', y:1660, lab:'3G', col:'var(--led-a)', port:'PB3', mac:'SR_3G0_LED'},
  {ref:'LED5', y:1470, lab:'NO LOCK', col:'#ff4a3a', port:'PB4', mac:'NO_LOCK_LED'},
];
const PARTS = { U1:[11002.2,2263.4,'GS2974A EQ'], U3:[10001.4,1979.8,'GS2975A'], U4:[10802.8,1791.6,'GS2978'], U5:[10802.8,1361.6,'GS2978'], U6:[10802.8,901.6,'GS2978'], U7:[10802.8,461.6,'GS2978'],
  U11:[8052,1765,'AT90CAN128'], U9:[11100,55,'CAN xcvr'], X2:[10395,1860,'GO1535'], JTAG1:[8035,2415,'JTAG'], L2:[3908,1470,'LM2676 3.3 V'], F2:[4440,90,'fuse'] };
function cardSVG(t, opts){
  opts=opts||{}; const p=pinsAt(t), w=worldAt(t);
  let s=`<svg viewBox="0 0 1542 366" role="img" aria-label="M6203A ISS3 card, top side (from the gerbers)" style="width:100%;display:block;border-radius:6px">
   <defs><filter id="m6Glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect width="1542" height="366" fill="var(--panel2)"/>
   <path d="M8 6 H1498 L1510 18 V40 H1538 V296 H1510 V300 H1538 V358 H1500 V362 H60 L8 310 Z" fill="#17602f" stroke="#0c3d1d"/>
   <image href="${ASSET}m6203-card-copper.png" width="1542" height="366"/>
   <image href="${ASSET}m6203-card-silk.png" width="1542" height="366"/>`;
  LEDS.forEach((L,i)=>{ const [x,y]=PNP(-745.3, L.y), on=(p.leds>>i)&1;
    s+=`<rect x="${x-10}" y="${y-6}" width="20" height="12" rx="2" fill="${on?L.col:'#2b2f2c'}" ${on?'filter="url(#m6Glow)"':''}><title>${L.ref} ${L.lab} — ${L.port} (${L.mac}_ON/OFF) ${on?'ON':'off'}</title></rect>`; });
  if (opts.labels!==false){
    const lab=(x,y,txt)=>`<text x="${x}" y="${y}" font-size="15" font-weight="700" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke">${txt}</text>`;
    Object.entries(PARTS).forEach(([k,v])=>{ const [x,y]=PNP(v[0],v[1]); const dx = k==='U1'||k==='U4'||k==='U5'||k==='U6'||k==='U7'||k==='U9'? -150 : -30;
      s+=`<g class="m6-part" data-k="${k}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="16" fill="transparent" stroke="#ffd36a" stroke-dasharray="3 3"/>${lab(x+dx, y+(k==='U11'?-28:k==='U3'?-26:5), k+' '+v[2])}<title>${k} ${v[2]} — click for its pins</title></g>`; });
    s+=lab(1490,180,'P1')+lab(1490,340,'P2');
  }
  const os=outState(t);
  s+=`<text x="130" y="350" font-size="14" fill="${os==='on'?'#9fffb0':'#ffb0a0'}" stroke="#000" stroke-width="3" paint-order="stroke">outputs: ${OUT_TXT[os]}</text>`;
  if (!w.card) s+=`<rect width="1542" height="366" fill="var(--panel2)" opacity=".78"/><text x="771" y="190" text-anchor="middle" font-size="40" fill="var(--ink)">card removed from the frame</text>`;
  return s+'</svg>';
}
/* Artwork 2026|59: card edge from M6203A LED Status.cdr (MANUAL, 2010-04-28; LED boxes at x 275.5 pt), rear modules from the
   openGear Rear Module Guide M6203A - rear module options.cdr (2012-01-16): T6301A-3G and T6401A, BNC pitch 18.9 pt. */
const ART62 = {
  edge:'#OPENGEAR #SERIES/M6203 - #Master #OPENGEAR/M6203 - #Engineering/M6203A/MANUAL/M6203A LED Status.cdr',
  edge0:'#OPENGEAR #SERIES/M6203 - #Master #OPENGEAR/M6203 - #Engineering/M6203A/Functional/M6203A-card-edge.cdr',
  rear:'#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/M6203A - rear module options.cdr',
  t6301:'#OPENGEAR #SERIES/M6203 - #Master #OPENGEAR/M6203 - #Engineering/M6203A/Functional/M6203A-T6301.cdr',
  t6401:'#OPENGEAR #SERIES/M6203 - #Master #OPENGEAR/M6203 - #Engineering/M6203A/Functional/M6203A-T6401.cdr',
  EDGE_YS:[350.6,370.1,389.6,409.4,427.4],
  RM:{T6301:{src:'m6203-rear-t6301a.svg', vb:[336,220,122,148], x:[377.0,395.9], y0:277.0, name:'T6301A-3G'},
      T6401:{src:'m6203-rear-t6401a.svg', vb:[470,220,130,148], x:[521.4,540.3], y0:277.4, name:'T6401A'}} };
function edgeSVG(t){ const p=pinsAt(t);
  const body=LEDS.map((L,i)=>artLed({x:275.7, y:ART62.EDGE_YS[i]-6.1, w:5.3, h:12.2, on:(p.leds>>i)&1, col:L.col, fid:'m63ag', title:`${L.lab} LED (${(p.leds>>i)&1?'lit':'off'})`})).join('');
  return artSVG({src:'m6203-edge.svg', vb:[186,290,120,350], maxw:200, label:'M6203A card edge', fid:'m63ag', body})
    + `<div class="small muted" style="text-align:center">${SIM.src(ART62.edge,'M6203A LED Status.cdr')} (2010-04-28)</div>`;
}
function rearSVG(t){
  const w=worldAt(t), RM=REARS[w.rear], A=ART62.RM[w.rear], os=outState(t), F=FMT[w.in.fmt];
  let body='';
  RM.pos.forEach(p=>{
    const cx=A.x[(p.n-1)%2], cy=A.y0+Math.floor((p.n-1)/2)*18.9;
    const mine=!RM.dual || p.c===w.pos, isIn=p.role==='in', isOut=p.role==='out';
    const sel = mine && isOut && D.ui.outSel===p.p1;
    const P=P1OUT[p.p1]; const pol = P? (P.pin===12?'+':'−') : '';
    const live = mine && isOut && os==='on' && (!F.asi || P.pin===12);
    body+=artJack({cx, cy, r:5.9, conn:isIn&&mine&&w.in.cable, sel, live: isOut&&mine? (live?true:os==='on'?'warn':'off') : undefined,
      attrs:`class="m6-jack" data-n="${p.n}" style="cursor:${mine&&(isIn||isOut)?'pointer':'default'}"`,
      title:`${p.n} ${p.lab}${RM.dual?' (card '+p.c+')':''} — P1-${p.p1}${P?' ← '+P.drv+'-'+P.pin+' ('+P.src+', polarity '+pol+')':''}${mine&&isIn?' — click to '+(w.in.cable?'unplug':'plug in'):''}${mine&&isOut?' — click to watch this output':''}`});
    if (RM.dual && !mine) body+=`<circle cx="${cx}" cy="${cy}" r="6.2" fill="rgba(80,84,88,.35)" pointer-events="none"/>`;
  });
  return artSVG({src:A.src, vb:A.vb, maxw:300, label:A.name+' rear module', fid:'m63ar', body})
    + `<div class="small muted" style="text-align:center">${A.name}: ${SIM.src(ART62.rear,'M6203A - rear module options.cdr')} (2012-01-16)${RM.dual?' · this card = card '+w.pos:''}</div>`;
}
function frameSVG(t){
  const w=worldAt(t), RM=REARS[w.rear], p=pinsAt(t);
  let s=`<svg viewBox="0 0 640 74" style="width:100%;display:block"><rect width="640" height="74" rx="6" fill="var(--dev)"/>`;
  for (let i=1;i<=20;i++){ const x=10+(i-1)*31, c=(i===w.slot && w.card); const span = RM.dual? (w.pos===1?[w.slot,w.slot+1]:[w.slot-1,w.slot]) : [w.slot];
    const isRear=span.includes(i);
    s+=`<g class="m6-slot" data-s="${i}" style="cursor:pointer"><rect x="${x}" y="8" width="27" height="44" rx="2" fill="${c?'#2f5a3c':'#202326'}" stroke="${isRear?'#e3a35a':'#3a3f44'}" stroke-width="${isRear?2:1}"/>
      ${c? LEDS.map((L,k)=>`<rect x="${x+9}" y="${14+k*7}" width="4" height="4" fill="${(p.leds>>k)&1? (k===0?'#7dff6a':k===4?'#ff4a3a':'#ffb43a') : '#2c332c'}"/>`).join('') : ''}
      <text x="${x+13.5}" y="64" font-size="9" text-anchor="middle" fill="#9aa0a5">${i}</text><title>Slot ${i}${c?' — M6203A':''}${isRear?' — rear '+w.rear:''} (click to move the card)</title></g>`; }
  return s+`<text x="630" y="71" font-size="8" text-anchor="end" fill="#9aa0a5">20-slot openGear frame (MF6220), front view</text></svg>`;
}
const DASH_CSS = `<style>
.m6-dash{border:1px solid var(--line);border-radius:6px;background:var(--panel2);font:12.5px var(--sans);overflow:hidden}
.m6-dtitle{display:flex;justify-content:space-between;padding:5px 8px;background:color-mix(in srgb,var(--accent2) 22%,var(--panel));border-bottom:1px solid var(--line);font-weight:600}
.m6-dwrap{display:grid;grid-template-columns:150px 1fr;min-height:230px}
.m6-tree{border-right:1px solid var(--line);padding:6px;font-size:12px;background:var(--lane)}
.m6-tree .sel{background:color-mix(in srgb,var(--accent) 22%,transparent);border-radius:3px}
.m6-ptabs{display:flex;flex-wrap:wrap;gap:3px;padding:5px 6px 0}.m6-ptabs button{font-size:11.5px;padding:3px 7px;border-radius:5px 5px 0 0}
.m6-pbody{padding:8px;border-top:1px solid var(--line)}
.m6-dt{border-collapse:collapse;width:100%}.m6-dt td{padding:4px 6px;border-bottom:1px dashed var(--grid);vertical-align:top}
.m6-dl{color:var(--ink2);width:38%}
.m6-dt input[readonly]{width:100%;background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:2px 5px;color:var(--ink);font:12px var(--mono)}
.m6-alarm{display:inline-block;width:11px;height:11px;border-radius:50%;vertical-align:-1px}
.m6-note{margin-top:6px;font-size:11.5px;color:var(--ink2)}
.m6-foot{display:flex;flex-wrap:wrap;gap:5px;padding:6px;border-top:1px solid var(--line)}.m6-foot button{font-size:11.5px;padding:3px 7px}
.m6-ctl{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px;font-size:12.5px}
@media (max-width:700px){.m6-dwrap{grid-template-columns:1fr}.m6-tree{border-right:none;border-bottom:1px solid var(--line)}}
</style>`;
function dashHTML(t){
  const w=worldAt(t), p=pinsAt(t), c=cacheAt(t), V=VARIANTS[w.fw], R=sim();
  const seen = w.card && w.mfc && (c.seen || R.can.some(fr=>fr.dir==='tx' && fr.t<=t));
  const row=(l,v)=>`<tr><td class="m6-dl">${l}</td><td>${v}</td></tr>`;
  let body='';
  const tab=D.ui.dashTab;
  if (!w.mfc) body='<div class="m6-note">No frame controller.</div>';
  else if (!seen) body='<div class="m6-note">Slot '+w.slot+': no card answering yet.</div>';
  else if (tab==='info') body=`<table class="m6-dt">${MENU0.map(o=>row(OID[o].name, o===0x0107? '<span class="muted small">(GET_DESCRIPTOR → UNSUPPORTED)</span>' : `<input readonly value="${esc(c[o]!==undefined? c[o] : valTxt(o,1,w.fw))}">`)).join('')}</table>
      <div class="m6-note">Menu “Card Info” = Menu0OID_Message.${w.fw==='c030000'?' C030000 blanks four strings to “-”; the Name still reads “'+CARD_NAME+'”.':''}</div>`;
  else if (tab==='status'){
    const cs=c[0x0201], si=c[0x0204], sr=c[0x0202];
    const siLab = si===undefined? '—' : alarmLabel(P24_TABLE, si);
    body=`<table class="m6-dt">${row('Card Status', `<span class="m6-alarm" style="background:${cs===2?'var(--bad)':'var(--accent)'}"></span> ${valTxt(0x0201,cs)}`)}
      ${row('SDI Input', `<span class="m6-alarm" style="background:${siLab==='Unlocked'?'var(--bad)':'var(--accent)'}"></span> ${siLab} <span class="muted small">— value ${si===undefined?'—':si} = firmware's ${({2:'HD',4:'SD',8:'NO LOCK'})[si]||'?'} ${infT('Label = first ALARM_TABLE entry whose mask byte matches the value (MESSAGE_CREATOR_PARAMETER_24: masks 00/00/00/02); DashBoard’s exact rule is not in the archive')}</span>`)}
      ${row('Sample Rate', valTxt(0x0202,sr))}</table>
      <div class="m6-note">What DashBoard last received (REPORT_PARAM or GET_PARAM on the CAN lane), not the card's live state.</div>`;
  } else {
    const nt=c[0x0400];
    body=`<table class="m6-dt">${row('Notify on Card Fault', `<label><input type="radio" name="m6nt" data-v="1" ${nt===1?'checked':''}> Enabled</label> <label><input type="radio" name="m6nt" data-v="0" ${nt===0?'checked':''}> Disabled</label>`)}</table>
      <div class="m6-note">WIDGET_RADIO_HORIZONTAL, OID 4.0 → smpte_alarm_enabled. Not saved on the card.</div>`;
  }
  const alive = p.mode==='app';
  return `<div class="m6-dash"><div class="m6-dtitle"><span>Parameter window — frame tree</span><span class="muted">generic DashBoard-style view</span></div>
   <div class="m6-dwrap"><div class="m6-tree"><div>▾ openGear frame</div><div style="padding-left:12px">▸ Frame controller</div>
     ${[2,w.slot,9].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b).map(i=>`<div style="padding-left:12px" class="${i===w.slot?'sel':''}">${i===w.slot? (seen?'● Slot '+i+': '+V.product:'○ Slot '+i) : '○ Slot '+i+': (other card)'}</div>`).join('')}</div>
   <div><div style="padding:6px 8px;border-bottom:1px solid var(--line)">Slot ${w.slot}: <b>${seen?esc(V.product):'—'}</b> <span class="muted">${seen?CARD_NAME:''}</span>${alive?'':' <span style="color:var(--warn)">('+p.mode+')</span>'}</div>
     <div class="m6-ptabs">${[['status','Status ▸ Card Status'],['info','Status ▸ Card Info'],['control','Control ▸ Card Settings']].map(([k,l])=>`<button data-dt="${k}" class="${tab===k?'on':''}">${l}</button>`).join('')}</div>
     <div class="m6-pbody">${body}</div>
     <div class="m6-foot"><button data-da="open">Open / rescan</button><button data-da="refresh">Refresh</button><button data-da="reboot">Reboot</button><button data-da="upgrade">Upload m6203a_v1_01.bin…</button></div></div></div></div>`;
}
function controlsHTML(){
  const w=worldAt(SIM.t), opt=(v,cur,l)=>`<option value="${v}" ${v===cur?'selected':''}>${l}</option>`;
  return `<div class="m6-ctl">
    <label>Input <select id="m6Fmt">${Object.keys(FMT).map(k=>opt(k,w.in.fmt,FMT[k].name)).join('')}</select></label>
    <label>Input cable <select id="m6Len">${[2,30,75,90,110,150,165,200,300,400,430,480].map(v=>opt(v,w.in.len,v+' m')).join('')}</select></label>
    <button id="m6Cab">${w.in.cable?'Unplug input':'Plug input'}</button><button id="m6Gl" title="0.3 ms drop-out of LOCKED">Glitch</button>
    <label>Rear <select id="m6Rear">${Object.keys(REARS).map(k=>opt(k,w.rear,k)).join('')}</select></label>
    ${REARS[w.rear].dual?`<label>card # <select id="m6Pos">${opt(1,w.pos,'1')}${opt(2,w.pos,'2')}</select></label>`:''}
    <label>Firmware <select id="m6Fw">${Object.keys(VARIANTS).map(k=>opt(k,w.fw,VARIANTS[k].label)).join('')}</select></label>
    <label>Output cable <select id="m6OLen">${[5,25,50,100,125,150,210,300,465].map(v=>opt(v,w.outLen,v+' m')).join('')}</select></label>
    <button id="m6Ins">${w.card?'Pull card':'Insert card'}</button>
    <button id="m6Next" title="Carry the state at 1.000 s into a new second">Next second ▶</button><button id="m6Rst">Reset</button>
    <label title="After an action, move the playhead just past it"><input type="checkbox" id="m6Fol" ${D.ui.follow?'checked':''}> follow</label></div>`;
}
function bindAll(root){
  const q=s=>root.querySelector(s);
  root.querySelectorAll('.m6-jack').forEach(g=>g.onclick=()=>{ const w=worldAt(SIM.t), RM=REARS[w.rear], p=RM.pos[+g.dataset.n-1]; if (RM.dual && p.c!==w.pos) return;
    if (p.role==='in') A.cable(!w.in.cable); else if (p.role==='out'){ D.ui.outSel=p.p1; SIM.refresh(); } });
  root.querySelectorAll('.m6-slot').forEach(g=>g.onclick=()=>A.setSlot(+g.dataset.s));
  root.querySelectorAll('.m6-part').forEach(g=>g.onclick=()=>{ D.ui.part=g.dataset.k; SIM.refresh(); });
  root.querySelectorAll('[data-dt]').forEach(b=>b.onclick=()=>{ D.ui.dashTab=b.dataset.dt; SIM.refresh(); });
  root.querySelectorAll('input[name=m6nt]').forEach(r=>r.onchange=()=>A.notify(+r.dataset.v));
  root.querySelectorAll('[data-da]').forEach(b=>b.onclick=()=>({open:A.dashOpen, refresh:A.dashRefresh, reboot:A.reboot, upgrade:A.upgrade})[b.dataset.da]());
  if (q('#m6Fmt')){
    q('#m6Fmt').onchange=e=>A.fmt(e.target.value); q('#m6Len').onchange=e=>A.len(+e.target.value);
    q('#m6Cab').onclick=()=>A.cable(!worldAt(SIM.t).in.cable); q('#m6Gl').onclick=()=>A.glitch();
    q('#m6Rear').onchange=e=>A.setRear(e.target.value); if (q('#m6Pos')) q('#m6Pos').onchange=e=>{ worldEv('pos', w2=>{ w2.pos=+e.target.value; }); SIM.refresh(); };
    q('#m6Fw').onchange=e=>A.fw(e.target.value); q('#m6OLen').onchange=e=>A.outLen(+e.target.value);
    q('#m6Ins').onclick=()=>A.insert(!worldAt(SIM.t).card);
    q('#m6Next').onclick=()=>{ rollSecond(); SIM.refresh(); }; q('#m6Rst').onclick=()=>{ resetAll(); SIM.seek(0); };
    q('#m6Fol').onchange=e=>{ D.ui.follow=e.target.checked; };
  }
}
document.addEventListener('keydown', e=>{
  if (!window.__m6203Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase(), w=worldAt(SIM.t), keys=Object.keys(FMT);
  const m={ c:()=>A.cable(!w.in.cable), f:()=>A.fmt(keys[(keys.indexOf(w.in.fmt)+1)%keys.length]), g:()=>A.glitch(), o:()=>A.dashOpen(), n:()=>{ rollSecond(); SIM.refresh(); } };
  if (m[k]){ m[k](); e.preventDefault(); }
});

/* =====================================================================
   SDI WORDS, BITS AND THE SCOPE
   ===================================================================== */
const BARS = [[721,512,512],[646,176,567],[525,625,176],[450,289,231],[335,735,793],[260,399,848],[139,848,457],[64,512,512]];   // 75 % bars, 10-bit — test pattern assumed
function lineAt(F, t){ const lt=F.lineT, n=Math.floor(t/lt), ln=(n % F.lines)+1, fr=Math.floor(n/F.lines); return {n, ln, fr, ph:(t - n*lt)/lt}; }
function xyz(F, ln, h){ let fl=0; if (F.il) fl = ln > Math.ceil(F.lines/2) ? 1 : 0; let v=0; for (const r of F.vb) if (ln>=r[0] && ln<=r[1]) v=1;
  const p3=v^h, p2=fl^h, p1=fl^v, p0=fl^v^h; return 0x200 | (fl<<8) | (v<<7) | (h<<6) | (p3<<5) | (p2<<4) | (p1<<3) | (p0<<2); }
function wordAt(F, ln, i){ // word i of line ln (line starts at EAV)
  const k=F.k, W=F.W;
  const hdr = k===1? 4 : 4*k + 4*k;              // EAV (+ LN, CRC)
  const savAt = W - (F.cls==='sd'? F.act*2 : F.act*k) - 4*k;
  const trs=[0x3FF,0x000,0x000,null];
  if (i < 4*k){ const j=Math.floor(i/k); return {v: j===3? xyz(F,ln,1) : trs[j], tag:'EAV'}; }
  if (k>1 && i < hdr){ const j=Math.floor((i-4*k)/k); const L=[0x200|((ln&0x7F)<<2), 0x200|((ln>>7)<<2), 0x1A5, 0x0C3][j]; return {v:L, tag:['LN0','LN1','CR0','CR1'][j]}; }
  if (i < savAt) return {v: (i%2)? 0x040 : 0x200, tag:'HANC'};
  if (i < savAt+4*k){ const j=Math.floor((i-savAt)/k); return {v: j===3? xyz(F,ln,0) : trs[j], tag:'SAV'}; }
  const a=i-savAt-4*k, frac=a/((F.cls==='sd'? F.act*2 : F.act*k)), b=BARS[Math.min(7,Math.floor(frac*8))];
  let v; if (F.cls==='sd') v = [b[1], b[0], b[2], b[0]][a%4]; else v = (a%2)? b[0] : [b[1],b[2]][Math.floor(a/2)%2];
  let vb=0; for (const r of F.vb) if (ln>=r[0] && ln<=r[1]) vb=1; if (vb) v = (a%2)? 0x040 : 0x200;
  return {v, tag:'active'};
}
/* serialise: 10 bits LSB first, scrambler x^9+x^4+1, then NRZI x+1 (scrambler state 200 words back assumed zero — inferred) */
function serialBits(F, ln, i0, nWords){
  const out=[]; let sh=0, lvl=0; const start=Math.max(0, i0-200);
  for (let i=start; i<i0+nWords; i++){ const wd=wordAt(F, ln, i).v;
    for (let b=0;b<10;b++){ const d=(wd>>b)&1; const sc=d ^ ((sh>>3)&1) ^ ((sh>>8)&1); sh=((sh<<1)|sc)&0x1FF; lvl^=sc; if (i>=i0) out.push({lvl, i, b}); } }
  return out;
}
const K285 = {neg:'0011111010', pos:'1100000101'}, D72 = {neg:'1110001001', pos:'0001111001'};
function asiCodes(n, inv){ const out=[]; let rd='neg'; const seq=['K28.5','K28.5','D7.2 (0x47 sync)','K28.5','K28.5','K28.5'];
  for (let i=0;i<n;i++){ const s=seq[i%seq.length]; let c; if (s.startsWith('K')){ c=K285[rd]; rd = rd==='neg'?'pos':'neg'; } else c=D72[rd];
    if (inv) c=c.split('').map(x=>x==='1'?'0':'1').join(''); out.push({sym:s, bits:c, dec: inv? (s.startsWith('K')?'K28.5 (wrong disparity)':'D7.6 = 0xC7 — not 0x47') : s}); }
  return out; }
function drawScope(cv, info, t){
  const {c,w:W,h:H}=SIM.canvas(cv, 230); const w=worldAt(t), F=FMT[w.in.fmt], R=sim(), os=outState(t), P=P1OUT[D.ui.outSel];
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), warn=SIM.css('--warn'), grid=SIM.css('--grid');
  c.font='11px '+SIM.css('--mono');
  const rows=[{y:28, lab:'SDI IN (after EQ)'}, {y:118, lab:'OUT P1-'+D.ui.outSel+' ('+P.drv+'-'+P.pin+')'}];
  const sig = w.card && w.in.cable;
  const n = W<560? 20 : 48, x0=120, bw=(W-x0-10)/n;
  let lines=[];
  if (F.asi){
    const k=Math.floor(t*27e6); const codes=asiCodes(6,false), codesO=asiCodes(6, P.pin!==12);
    [[codes,rows[0],sig],[codesO,rows[1],sig && os==='on']].forEach(([cs,r,on])=>{
      c.fillStyle=ink; c.fillText(r.lab, 4, r.y+20);
      if (!on){ c.fillStyle=ink2; c.fillText(on===false&&r===rows[1]? OUT_TXT[os] : 'no signal', x0, r.y+20); return; }
      let x=x0; c.strokeStyle=acc; c.lineWidth=1.5; c.beginPath(); let prev=null;
      cs.slice(0,4).forEach((cd,j)=>{ const bwa=(W-x0-10)/40; for (const ch of cd.bits){ const yv=ch==='1'? r.y+4 : r.y+36; if (prev!==null && prev!==yv) c.lineTo(x,yv); else if (prev===null) c.moveTo(x,yv); c.lineTo(x+bwa,yv); prev=yv; x+=bwa; } });
      c.stroke(); x=x0; cs.slice(0,4).forEach(cd=>{ const bwa=(W-x0-10)/40; c.fillStyle=cd.dec.includes('not')||cd.dec.includes('wrong')? SIM.css('--bad') : ink2; c.fillText(cd.dec.slice(0,26), x+2, r.y+52); c.fillStyle=grid; c.fillRect(x, r.y, 1, 40); x+=10*bwa; });
    });
    info.innerHTML = `DVB-ASI is 8b/10b, not scrambled NRZI: polarity matters. Output P1-${D.ui.outSel} comes from ${P.drv} pin ${P.pin} — ${P.pin===12? 'the true side: K28.5 commas and the 0x47 TS sync decode.' : 'the inverted side: every code group is complemented; 0x47 (D7.2) arrives as D7.6 = 0xC7 and the receiver never finds TS sync.'} Code groups from the 8b/10b tables (standard, not in the archive).`;
    return;
  }
  if (F.unsup || !F.lines){
    c.fillStyle=ink; c.fillText(rows[0].lab, 4, rows[0].y+20); c.fillText(rows[1].lab, 4, rows[1].y+20);
    c.fillStyle=ink2; c.fillText(sig? F.name+': GS2975A cannot lock — outputs '+OUT_TXT[os] : 'no signal', x0, rows[0].y+20);
    info.textContent=''; return;
  }
  const L=lineAt(F,t), bitT=1/F.rate, wordIdx=Math.floor(L.ph*F.W), wd=wordAt(F,L.ln,wordIdx);
  const bits=serialBits(F, L.ln, wordIdx, Math.ceil(n/10)+1).slice(0,n);
  const draw=(r, on, inv, noise)=>{
    c.fillStyle=ink; c.fillText(r.lab, 4, r.y+20);
    if (!on){ c.fillStyle=ink2; c.fillText(r===rows[1]? OUT_TXT[os] : 'no signal', x0, r.y+20); return; }
    c.strokeStyle=r===rows[0]? warn : acc; c.lineWidth=1.6; c.beginPath();
    let prev=null; bits.forEach((b,j)=>{ const lv=inv? 1-b.lvl : b.lvl; const yv= lv? r.y+4 : r.y+36; const x=x0+j*bw, jit=noise? (Math.sin(j*12.9898+t*1e7)*noise) : 0;
      if (prev===null) c.moveTo(x,yv); else if (prev!==yv) c.lineTo(x+jit,yv); c.lineTo(x+bw,yv); prev=yv; });
    c.stroke();
    let lastI=-1; bits.forEach((b,j)=>{ if (b.i!==lastI){ lastI=b.i; const x=x0+j*bw; c.fillStyle=grid; c.fillRect(x, r.y-2, 1, 46); const wv=wordAt(F,L.ln,b.i); c.fillStyle=wv.tag==='EAV'||wv.tag==='SAV'? SIM.css('--bad') : ink2; c.fillText(hx(wv.v,3)+(wv.tag!=='active'&&wv.tag!=='HANC'?' '+wv.tag:''), x+2, r.y+54); } });
  };
  const st=linkStatus(w), noise = st.eye==='marg'? bw*0.35 : st.eye==='bad'? bw*0.6 : bw*0.08;
  draw(rows[0], sig, false, noise);
  draw(rows[1], os==='on', P.pin!==12, 0);
  c.fillStyle=ink2; c.fillText(`bit ${SIM.fmtDur(bitT)} · word ${SIM.fmtDur(bitT*10)} · ${n} bit cells shown`, x0, H-8);
  info.innerHTML = `${F.name} · frame ${L.fr+1} · line ${L.ln}/${F.lines} · word ${wordIdx}/${F.W} (${wd.tag}${wd.tag==='EAV'||wd.tag==='SAV'?' XYZ = '+hx(xyz(F,L.ln,wd.tag==='EAV'?1:0),3):''}) · 10 bits LSB first → scrambler x⁹+x⁴+1 → NRZI x+1. NRZI ignores polarity, so pin 11 (inverted) outputs still decode for SDI. Scrambler state 200 words before the playhead assumed zero (it self-synchronises within 9 bits) ${inf}; bars test pattern assumed.`;
}
function eyeSVG(t){
  const w=worldAt(t), F=FMT[w.in.fmt], st=linkStatus(w), os=outState(t), r=REACH[F.cls];
  const eye=(x,lab,open,jit,on)=>{ let s=`<g transform="translate(${x},0)"><rect x="0" y="14" width="150" height="80" fill="var(--dev)" rx="4"/><text x="75" y="10" text-anchor="middle" font-size="10" fill="var(--ink2)">${lab}</text>`;
    if (!on) return s+`<text x="75" y="58" text-anchor="middle" font-size="10" fill="#aaa">no signal</text></g>`;
    for (let k=0;k<14;k++){ const j=(Math.sin(k*7.1)*jit), a=open*(0.8+0.2*Math.cos(k*3.3));
      s+=`<path d="M${10+j} ${54-30*a} C ${50+j} ${54-30*a}, ${55+j} ${54+30*a}, ${75+j} ${54+30*a} S ${100+j} ${54+30*a}, ${140+j} ${54+30*a}" fill="none" stroke="#7dff6a" stroke-opacity=".35"/>
          <path d="M${10+j} ${54+30*a} C ${50+j} ${54+30*a}, ${55+j} ${54-30*a}, ${75+j} ${54-30*a} S ${100+j} ${54-30*a}, ${140+j} ${54-30*a}" fill="none" stroke="#7dff6a" stroke-opacity=".35"/>`; }
    return s+'</g>'; };
  const inOpen = st.eye==='ok'? 1-0.5*w.in.len/r.ok : st.eye==='marg'? 0.25 : 0.06, inJit = st.eye==='ok'? 4+12*w.in.len/r.ok : st.eye==='marg'? 22 : 30;
  const outBad = w.outLen>r.out, outOpen = outBad? 0.15 : 1-0.6*w.outLen/r.out;
  return `<svg viewBox="0 0 470 100" style="width:100%;max-width:520px">${eye(0,'after GS2974A EQ ('+w.in.len+' m)', inOpen, inJit, w.card&&w.in.cable)}${eye(160,'GS2975A reclocked', 1, 2, os==='on')}${eye(320,'far end of '+w.outLen+' m output cable', outOpen, 6+20*w.outLen/r.out, os==='on')}</svg>
    <div class="small muted">Sketch, not a measurement ${inf}. Reach from the test sheets: input ${r.ok} m, output ${r.out} m at ${F.cls.toUpperCase()}. ${F.cls==='3g'?'Nov 2011|44: 3G works but fails the rise-time test; the undated sheet marks “bad eye” at 25 m.':''}</div>`;
}

/* =====================================================================
   TIMELINE LANES
   ===================================================================== */
function lanes(){
  const R=sim(), css=n=>SIM.css(n), ls=[];
  const txt=(c,s,x,y,col)=>{ c.fillStyle=col||css('--ink'); c.font='11px '+css('--mono'); c.fillText(s,x,y); };
  const band=(c,X,a,b,y,h,col,al)=>{ c.globalAlpha=al||1; c.fillStyle=col; c.fillRect(X(a), y, Math.max(1, X(b)-X(a)), h); c.globalAlpha=1; };
  const pinRuns=(fn)=>{ const out=[]; let cur=null; R.pins.forEach(p=>{ const v=fn(p); if (!cur || cur.v!==v){ if (cur) cur.t1=p.t; cur={t0:p.t, v}; out.push(cur); } }); if (cur) cur.t1=1; return out; };
  /* 1 — input SDI frames / lines / words */
  ls.push({label:'SDI IN: frames · lines · words', h:34, draw(c,X,t0,t1,y,h){
    R.worlds.forEach((wv,i)=>{ const a=Math.max(t0,wv.t), b=Math.min(t1, i+1<R.worlds.length? R.worlds[i+1].t : 1); if (a>=b) return;
      const w=wv.w, F=FMT[w.in.fmt]; if (!w.card || !w.in.cable){ txt(c,'no input',X(a)+4,y+h/2+4,css('--ink2')); return; }
      if (!F.lines){ band(c,X,a,b,y+8,h-16,css('--accent2'),.25); if (X(b)-X(a)>140) txt(c, F.asi? 'ASI: 8b/10b, 27 Mbyte/s, TS packets + K28.5 stuffing' : F.name+' (not SDI to the GS2975A)', Math.max(X(a),X(t0))+4, y+h/2+4); return; }
      const frT=1/F.fps, lt=F.lineT, wt=10/F.rate;
      const pxF=X(t0+frT)-X(t0), pxL=X(t0+lt)-X(t0), pxW=X(t0+wt)-X(t0);
      if (pxW>4){ const i0=Math.floor(a/wt), i1=Math.ceil(b/wt); for (let i=i0;i<=i1;i++){ const tt=i*wt, L=lineAt(F,tt+wt/2), wi=Math.floor(L.ph*F.W), wd=wordAt(F,L.ln,wi);
          c.fillStyle= wd.tag==='EAV'||wd.tag==='SAV'? css('--bad') : wd.tag==='active'? css('--accent') : css('--ink2'); c.globalAlpha=.55; c.fillRect(X(tt)+0.5, y+6, Math.max(1,pxW-1), h-12); c.globalAlpha=1;
          if (pxW>34) txt(c, hx(wd.v,3), X(tt)+2, y+h/2+4, '#fff'); } return; }
      if (pxL>6){ const n0=Math.floor(a/lt), n1=Math.ceil(b/lt); for (let n=n0;n<=n1;n++){ const ta=n*lt; const ln=(n%F.lines)+1; const fW=F.W, sav=(fW-(F.cls==='sd'?F.act*2:F.act*F.k)-4*F.k)/fW;
          band(c,X,ta,ta+lt*0.003+4/F.rate*10,y+4,h-8,css('--bad'),.8); band(c,X,ta,ta+lt*sav,y+10,h-20,css('--ink2'),.25); band(c,X,ta+lt*sav,ta+lt,y+10,h-20,css('--accent'),.35);
          if (pxL>70) txt(c,'line '+ln, X(ta)+3, y+12); } return; }
      SIM.pulses(c,X,a,b,y,h,lt,0,lt*0.02,css('--ink2'),'lines');
      const f0=Math.floor(a/frT), f1=Math.ceil(b/frT); if (pxF>1.5) for (let k=f0;k<=f1;k++){ const ta=k*frT; c.fillStyle=css('--accent2'); c.fillRect(X(ta)-1,y,2.5,h); if (pxF>60) txt(c,(F.il?'frame ':'frame ')+(k+1), X(ta)+4, y+h-4); if (F.il && pxF>12){ c.fillStyle=css('--ink2'); c.fillRect(X(ta+frT/2),y+h-10,1,10); } }
    }); }});
  /* 2 — equaliser */
  ls.push({label:'GS2974A EQ: cable / eye', h:22, draw(c,X,t0,t1,y,h){
    R.link.forEach(s=>{ const a=Math.max(t0,s.t0), b=Math.min(t1,s.t1); if (a>=b) return; const st=s.st;
      const col = !st.pow? css('--grid') : !st.sig? css('--grid') : st.eye==='ok'? css('--accent') : st.eye==='marg'? css('--warn') : css('--bad');
      band(c,X,a,b,y+5,h-10,col,.5); if (X(b)-X(a)>160) txt(c, !st.pow?'no power':!st.sig?'no cable':(st.F.name+' · '+worldAt(a).in.len+' m · '+(st.eye==='ok'?'eye open':st.eye==='marg'?'marginal':'closed')), Math.max(X(a),X(t0))+4, y+h/2+4); }); }});
  /* 3 — PLL search + LOCKED */
  ls.push({label:'GS2975A PLL: search · LOCKED (U3-28→PA4)', h:30, draw(c,X,t0,t1,y,h){
    R.link.forEach(s=>{ const a=Math.max(t0,s.t0), b=Math.min(t1,s.t1); if (a>=b || !s.st.pow || !s.st.sig) return;
      const dw=C.DWELL, px=X(t0+dw)-X(t0); const blocks=[]; if (s.cyc){ blocks.push([a,b,null]); } else { s.search.forEach(x=>blocks.push(x)); s.drops.forEach(d=>blocks.push([d[0],d[1],null])); }
      blocks.forEach(bk=>{ const A0=Math.max(a,bk[0]), B0=Math.min(b,bk[1]); if (A0>=B0) return;
        if (px>18){ for (let k=Math.floor((A0-(bk[2]===null?bk[0]:A0))/dw); ; k++){ const ta=(bk[2]===null?bk[0]:bk[0])+k*dw; if (ta>=B0) break; const tb=Math.min(ta+dw,B0); if (tb<=A0) continue;
            const rate = bk[2]!==null? bk[2] : SEARCH[((k%3)+3)%3]; band(c,X,Math.max(ta,A0),tb,y+3,h-6,css('--warn'),.35); if (X(tb)-X(Math.max(ta,A0))>34) txt(c,({2:'270',6:'2970',5:'1485'})[rate], X(Math.max(ta,A0))+3, y+h/2+4); } }
        else band(c,X,A0,B0,y+3,h-6,css('--warn'),.45); });
      if (s.cyc && X(b)-X(a)>220) txt(c,'searching 270 → 2970 → 1485 … never locks', Math.max(X(a),X(t0))+4, y+h/2+4); });
    lockIntervals(R,t0,t1).forEach(([a,b])=>band(c,X,a,b,y+8,h-16,css('--accent'),.85)); }});
  /* 4 — LOS, SS, SD/HD */
  ls.push({label:'LOS · SS[2:0] · SD/HD pins', h:24, draw(c,X,t0,t1,y,h){
    const N=Math.min(900, Math.max(60, X(t1)-X(t0))); let prev=null, x0=0;
    for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N; const v=losAt(R,tt)?'LOS':(()=>{ const ss=ssAt(R,tt); return 'SS '+ss.toString(2).padStart(3,'0')+(sdhdAt(R,tt)?' SD':' HD'); })();
      if (v!==prev || i===N){ if (prev!==null){ const xa=x0, xb=X(tt); c.fillStyle= prev==='LOS'? css('--bad') : css('--accent2'); c.globalAlpha=.3; c.fillRect(xa,y+4,Math.max(1,xb-xa),h-8); c.globalAlpha=1; if (xb-xa>70) txt(c,prev==='LOS'?'LOS high':prev,xa+3,y+h/2+4); } prev=v; x0=X(tt); } } }});
  /* 5 — main loop passes */
  ls.push({label:'AVR main loop (pass ≈'+(PASS_V101*1e3).toFixed(2)+' ms)', h:30, draw(c,X,t0,t1,y,h){
    R.segs.forEach(g=>{ const a=Math.max(t0,g.t0), b=Math.min(t1,g.t1); if (a>=b) return; band(c,X,a,b,y+3,h-6, g.kind==='wdt'?css('--bad'):g.kind==='loader'?css('--accent2'):css('--warn'), .5); if (X(b)-X(a)>140){ c.save(); c.beginPath(); c.rect(X(a),y,X(b)-X(a),h); c.clip(); txt(c,g.label,X(a)+4,y+h/2+4); c.restore(); } });
    const pxPass=X(t0+PASS_V101)-X(t0);
    if (pxPass<4){ let n=0; R.passes.forEach(p=>{ if (p.end<t0||p.t>t1) return; n++; c.fillStyle=css('--accent'); c.globalAlpha=.6; c.fillRect(X(p.t),y+8,Math.max(1,X(p.end)-X(p.t)),h-16); c.globalAlpha=1; }); if (X(t1)-X(t0)>300 && n) txt(c, n.toLocaleString()+' passes in view', X(t0)+6, y+h/2+4); return; }
    R.passes.forEach(p=>{ if (p.end<t0||p.t>t1) return;
      const seg=[[p.t,p.tU0,css('--ink2'),'READ'],[p.tU0,p.tU1,css('--warn'),'UPDATE '+(p.was===-1?'1 sample':(p.n+(p.was?' low':' high')+'/101'))],[p.tU1,p.tW,css('--accent2'),'PROCESS'],[p.tW,p.tC,css('--grid'),'wait(1000)'],[p.tC,p.end,css('--accent'),'CAN_F']];
      seg.forEach(sg=>{ band(c,X,sg[0],sg[1],y+4,h-8,sg[2],.8); if (X(sg[1])-X(sg[0])>60) txt(c, sg[3], X(sg[0])+2, y+h/2+4, sg[2]===css('--grid')?css('--ink'):'#fff'); });
      if (p.smp && X(p.tU1)-X(p.tU0)>300){ const dt=(p.tU1-p.tU0)/101; p.smp.forEach((v,i)=>{ c.fillStyle= v? css('--accent') : css('--bad'); c.fillRect(X(p.tU0+i*dt), y+(v?2:h-6), 2, 4); }); }
    }); }});
  /* 6 — lock60 + sdi_format */
  ls.push({label:'lock60 · sdi_format · ss (firmware)', h:24, draw(c,X,t0,t1,y,h){
    pinRuns(p=>p.l60+'|'+p.fmt+'|'+p.ss+'|'+p.mode).forEach(r=>{ const a=Math.max(t0,r.t0), b=Math.min(t1,r.t1); if (a>=b) return; const [l,fm,ss,mode]=r.v.split('|');
      band(c,X,a,b,y+4,h-8, mode!=='app'? css('--grid') : +l? css('--accent') : css('--bad'), .45);
      if (X(b)-X(a)>110) txt(c, mode!=='app'? mode : (+l?'0x10 ':'0x00 ')+['NO_LOCK','SD_FORMAT','HD_FORMAT'][+fm]+' ss '+ss, X(a)+3, y+h/2+4); }); }});
  /* 7 — outputs */
  ls.push({label:'Outputs: ~DDO_MUTE (PA6) · ~DISABLE (PD4)', h:24, draw(c,X,t0,t1,y,h){
    const N=Math.min(1200, Math.max(60, X(t1)-X(t0))); let prev=null, xa=0;
    const col={on:css('--accent'), muted:css('--warn'), disabled:css('--bad'), invalid:css('--warn'), z:css('--ink2'), off:css('--grid')};
    for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N, v=outState(tt);
      if (v!==prev || i===N){ if (prev!==null){ const xb=X(tt); c.fillStyle=col[prev]; c.globalAlpha=.55; c.fillRect(xa,y+4,Math.max(1,xb-xa),h-8); c.globalAlpha=1; if (xb-xa>120) txt(c, OUT_TXT[prev].slice(0,32), xa+3, y+h/2+4); } prev=v; xa=X(tt); } }
    }});
  /* 8 — LEDs */
  ls.push({label:'Card-edge LEDs LOCK·270M·1.5G·3G·NO LOCK', h:40, draw(c,X,t0,t1,y,h){
    LEDS.forEach((L,k)=>{ const yy=y+3+k*7; pinRuns(p=>(p.leds>>k)&1).forEach(r=>{ if (!r.v) return; const a=Math.max(t0,r.t0), b=Math.min(t1,r.t1); if (a<b){ c.fillStyle= k===0?'#3fbf4a':k===4?'#e0402e':'#e0a030'; c.fillRect(X(a), yy, Math.max(1,X(b)-X(a)), 5); } }); }); }});
  /* 9 — timers */
  ls.push({label:'timer1 96 µs · timer0 1 ms', h:22, draw(c,X,t0,t1,y,h){
    const on=R.segs.filter(g=>['wdt','loader','init','slotid','setup'].includes(g.kind));
    SIM.pulses(c,X,t0,t1,y,h/2,C.T1,0.00003,4e-6,css('--ink2'),'timer1');
    SIM.pulses(c,X,t0,t1,y+h/2,h/2,C.T0,0.00061,2e-5,css('--accent2'),'timer0');
    R.heart.forEach(tt=>{ if (tt>=t0&&tt<=t1){ c.fillStyle=css('--play'); c.fillRect(X(tt)-1,y,3,h); } });
    R.t0sec.forEach(tt=>{ if (tt>=t0&&tt<=t1){ c.fillStyle=css('--warn'); c.fillRect(X(tt)-1,y+h/2,3,h/2); } });
    on.forEach(g=>{ const a=Math.max(t0,g.t0), b=Math.min(t1,g.t1); if (a<b){ c.fillStyle=css('--panel'); c.fillRect(X(a),y,X(b)-X(a),h); } }); }});
  /* 10 — CAN */
  ls.push({label:'CAN 1 Mbit/s (▼ MFC→card · ▲ card)', h:30, draw(c,X,t0,t1,y,h){
    let shown=0; R.can.forEach(fr=>{ if (fr.t+fr.dur<t0||fr.t>t1) return; const rx=fr.dir==='rx'; c.fillStyle= rx? css('--accent2') : fr.type===0x10? css('--play') : css('--accent');
      const xa=X(fr.t), xb=Math.max(xa+2, X(fr.t+fr.dur)); c.fillRect(xa, rx? y+3 : y+h/2+1, xb-xa, h/2-4);
      if (xb-xa>90 && shown<40){ txt(c, (rx?'▼ ':'▲ ')+fr.desc.slice(0, Math.floor((xb-xa)/7)), xa+2, rx? y+h/2-3 : y+h-4, '#fff'); shown++; } }); }});
  /* 11 — DashBoard */
  ls.push({label:'DashBoard sees: SDI Input · Rate · Status', h:24, draw(c,X,t0,t1,y,h){
    const R2=sim(); const pts=[0].concat(R2.cacheEv.map(e=>e.t)).filter(x=>x<=1).sort((a,b)=>a-b);
    pts.forEach((ta,i)=>{ const tb=i+1<pts.length? pts[i+1] : 1; const a=Math.max(t0,ta), b=Math.min(t1,tb); if (a>=b) return; const cc=cacheAt(ta+1e-9);
      const bad = cc[0x0204]===8 || cc[0x0201]===2; band(c,X,a,b,y+4,h-8, bad? css('--bad') : css('--accent2'), .3);
      if (X(b)-X(a)>150) txt(c, `2.4=${cc[0x0204]??'—'} 2.2=${valTxt(0x0202,cc[0x0202])} 2.1=${valTxt(0x0201,cc[0x0201])}`, X(a)+3, y+h/2+4); }); }});
  return ls;
}

/* =====================================================================
   VIEWS
   ===================================================================== */
function traceHTML(){ return D.log[0]? `<div><b>${esc(D.log[0].name)}</b> <span class="muted">at ${SIM.fmtT(D.log[0].t)} (second ${D.log[0].sec})</span></div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('')
  : '<div class="muted">Use the controls, the card, the rear BNCs or the parameter window. Each step the hardware and firmware take is listed here, with the names from the source.</div>'; }
function inspHTML(t){
  const p=pinsAt(t), w=worldAt(t), R=sim(), st=stepAt(t), pa=passAt(t), F=FMT[w.in.fmt];
  const P=P1OUT[D.ui.outSel];
  return `<table class="kv">
   <tr><th>Card mode</th><td>${st.seg? esc(st.seg.label) : p.mode==='app'? 'application, while(1)' : p.mode}</td></tr>
   <tr><th>Now running</th><td class="mono">${st.p? STEPS[st.k][0]+(st.k===1?' — sample '+st.i+'/100':'') : st.seg? st.seg.kind : '—'}</td></tr>
   <tr><th>GS2975A pins</th><td class="mono">LOCKED ${lockedAt(R,t)?1:0} · LOS ${losAt(R,t)?1:0} · SS ${ssAt(R,t).toString(2).padStart(3,'0')} (${RATE_NAME[ssAt(R,t)]||'—'}) · SD/HD ${sdhdAt(R,t)} · search ${searchAt(R,t)===null?'—':RATE_NAME[searchAt(R,t)]}</td></tr>
   <tr><th>Last UPDATE</th><td class="mono">${pa&&pa.was!==undefined&&pa.was!==-1? (pa.was? pa.n+' of 101 samples low (≥5 → unlock)' : pa.n+' of 101 samples high (≥95 → lock)') : w.fw==='proto'?'one sample per pass (Prototype)':'—'}</td></tr>
   <tr><th>Firmware vars</th><td class="mono">lock60 0x${hx(p.l60)} · sdi_format ${['NO_LOCK','SD_FORMAT','HD_FORMAT'][p.fmt]} · ss ${p.ss}${pa?' · parameter_refresh '+pa.pr+(pa.pc?' (change pending)':''):''}</td></tr>
   <tr><th>AVR outputs</th><td class="mono">${p.z?'pins floating (reset)':`PORTB ${hx(p.leds)} · PA0 BYPASS ${p.pa0} · PA6 ~DDO_MUTE ${p.pa6} · PA7 DATA/CLK ${p.pa7} · PD4 ~DISABLE ${p.pd4}`}</td></tr>
   <tr><th>Outputs</th><td>${OUT_TXT[outState(t)]}${F.asi&&outState(t)==='on'?' · ASI good on pin-12 outputs only':''}</td></tr>
   <tr><th>Watched output</th><td class="mono">P1-${D.ui.outSel} ← ${P.drv} pin ${P.pin} ← ${P.src} (${P.src==='DDO0'?'U3-44/46 via R14/R15 0R':'U3-38/40 via R17/R21 0R'})</td></tr>
   <tr><th>CAN address</th><td class="mono">slot ${w.slot} → slot_address ${ADDRESS_TABLE(slotAdc(w.slot))} → 0x${hx(0x10+ADDRESS_TABLE(slotAdc(w.slot)))} ${inf}</td></tr></table>`;
}
function canLogHTML(t){ const R=sim(); const L=R.can.filter(fr=>fr.t<=t).slice(-40).reverse(); const N=R.notes.filter(n=>n.t<=t).slice(-6).reverse();
  return (N.length? N.map(n=>`<div style="color:var(--warn)">${SIM.fmtT(n.t)} ${esc(n.s)}</div>`).join('') : '') +
    (L.length? L.map(fr=>`<div><span class="muted">${SIM.fmtT(fr.t)}</span> ${fr.dir==='rx'?'▼':'▲'} <b>${msgName(fr.type)}</b> ${esc(fr.desc)}</div>`).join('') : '<div class="muted">No CAN frames yet this second. The heartbeat is every 10 001 timer1 ticks (≈0.96 s).</div>'); }
function partHTML(){ const k=D.ui.part; if (!k) return '<span class="muted small">Click a dashed circle on the card for that part’s pins.</span>'; const B=BLOCKS[{U1:'eq',U3:'rc',U4:'drv',U5:'drv',U6:'drv',U7:'drv',U11:'mcu',U9:'can',X2:'rc',JTAG1:'mcu',L2:'pwr',F2:'pwr'}[k]];
  return `<b>${k}</b> — ${B.t}<div class="small">${B.d}</div>`; }
function viewSim(m){
  window.__m6203Active=true;
  m.innerHTML = DASH_CSS + `<div class="grid2"><div>${card('Frame, card and card edge at the playhead', `<div id="frm"></div><div style="display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:10px;align-items:start;margin-top:8px"><div id="crd"></div><div id="edge"></div></div>
      <div class="small muted" style="margin-top:4px">Card: M6203A ISS3 top side from the gerbers (TOP + TSM + TSS at 120 dpi; the third-party logo in the silk is blanked; outline drawn from the silk ${inf}). LEDs sit on their pick-and-place positions. Keys: C cable · F next format · G glitch · O open in DashBoard · N next second.</div>
      <div id="part" style="margin-top:6px"></div><div id="wc"></div>`)}</div>
    <div>${card('Parameter window (DashBoard-style, generic)', `<div id="dash"></div>`)}${card('What the hardware and firmware did (last action)', `<div id="trace" class="log"></div>`)}</div></div>
  <div class="grid2"><div>${card('Rear module — click SDI IN to plug or unplug, an OUT to watch it', `<div style="display:grid;grid-template-columns:190px minmax(0,1fr);gap:12px"><div id="rear"></div><div id="rearInfo" class="small"></div></div>`)}</div>
    <div>${card('State at the playhead', `<div id="insp"></div>`)}</div></div>
  ${card('Timeline — one second as the card, the reclocker and DashBoard see it (click to seek)', `<canvas id="tl"></canvas><p class="small muted">Pass time is counted from the instruction listings (wait(1000) = 7 000 cycles, 101 debounce iterations × 32/41 cycles at 8 MHz) plus ≈8 % interrupt load ${inf}. Rate-search dwell, marginal-cable drop-outs and the phase of the 1 s counters are ${inf}.</p>`)}
  <div class="grid2">${card('Serial scope at the playhead', `<canvas id="scope"></canvas><div id="sinfo" class="small"></div>`)}${card('Eyes', `<div id="eye"></div>`)}</div>
  ${card('CAN frames and firmware notes (newest first)', `<div id="canlog" class="log"></div>`)}`;
  let wcVer=-1;
  const draw=()=>{
    const t=SIM.t;
    if (wcVer!==D.ver){ wcVer=D.ver; m.querySelector('#wc').innerHTML=controlsHTML(); }
    m.querySelector('#frm').innerHTML=frameSVG(t); m.querySelector('#crd').innerHTML=cardSVG(t); m.querySelector('#edge').innerHTML=edgeSVG(t);
    m.querySelector('#dash').innerHTML=dashHTML(t); m.querySelector('#rear').innerHTML=rearSVG(t); m.querySelector('#part').innerHTML=partHTML();
    const w=worldAt(t), RM=REARS[w.rear];
    m.querySelector('#rearInfo').innerHTML=`<b>${RM.name}</b> · AN_BMID2 ${RM.bmid2} (never read)<table class="kv" style="margin-top:4px">${RM.pos.filter(p=>!RM.dual||p.c===w.pos).map(p=>{ const P=P1OUT[p.p1];
      return `<tr style="${D.ui.outSel===p.p1&&p.role==='out'?'background:color-mix(in srgb,#ffd34d 25%,transparent)':''}"><td>${p.n}</td><td>${p.lab}</td><td class="mono">P1-${p.p1}</td><td class="small">${p.role==='in'?'BNC1_SIG → U1 GS2974A':p.role==='nc'?'BNC2_SIG — not connected on the card':P.drv+' pin '+P.pin+' ('+(P.pin===12?'+':'−')+') ← '+P.src}</td></tr>`; }).join('')}</table>
      <div class="muted">Labels: M6203A-${w.rear}.cdr; routing: ${w.rear==='T6301'?'T6301-iss4.net (via t6301.js)':'T6401iss4.net'}; card side: M6203A-iss3.net. Polarity of pins 11/12 ${inf} from the ASI test.</div>`;
    m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#insp').innerHTML=inspHTML(t); m.querySelector('#canlog').innerHTML=canLogHTML(t);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
    drawScope(m.querySelector('#scope'), m.querySelector('#sinfo'), t); m.querySelector('#eye').innerHTML=eyeSVG(t);
    bindAll(m);
  };
  SIM.on('time', draw);
}

/* ---------------- tutorial ---------------- */
function endState(){ return sim().end; }
const LESSONS = [
  {t:'Meet the M6203A', b:`<p>The M6203A is an openGear <b>reclocking distribution amplifier</b>: one SDI input, eight outputs. A Gennum <b>GS2974A</b> equalises the input cable, a <b>GS2975A</b> recovers the clock and re-times the data at 270 Mb/s, 1.485 Gb/s or 2.97 Gb/s, and four <b>GS2978</b> drivers each feed two BNCs.</p><p>The AT90CAN128 does not touch the video. It watches four reclocker pins, lights five LEDs, mutes and disables the outputs when there is no lock, and answers DashBoard over CAN.</p><p class="muted">The archive has no M6203A manual (the 3G manual folders are empty). These steps follow the functional drawing, the LED legend, the rear-module drawings, the test outlines and the firmware.</p>`, ok:()=>true, auto:true},
  {t:'1 · Fit the rear module and the card', b:`<p>The functional drawing offers <b>T6301</b> (single card: SDI IN, NOT USED, OUT1–OUT8) and <b>T6401</b> (two cards, SDI IN + OUT1–OUT4 each). The T6401 README warns it is for HD/SD only, not 3G.</p><p><b>Goal:</b> T6301 fitted and the card running in slot 4.</p>`, ok:()=>{ const e=endState(); return e.w.rear==='T6301' && e.w.card && e.f.mode==='app'; }, hint:'Rear → T6301. If the card is out, Insert card and play past ≈0.56 s.'},
  {t:'2 · Watch it boot', b:`<p>Pull the card and insert it again. Scrub the main-loop lane: 13 ms of start-up waits, then ≈0.54 s averaging 100 ADC readings of the slot-ID resistor, then <span class="mono">CANinit()</span> and the loop. All eight outputs stay <b>disabled</b> until the first pass sees lock — PD4 is low from <span class="mono">port_init()</span>.</p><p><b>Goal:</b> a boot in this second.</p>`, ok:()=>sim().segs.some(g=>g.kind==='slotid'), hint:'Press “Pull card” then “Insert card”.'},
  {t:'3 · Lock to HD', b:`<p>Feed <b>HD 1080i 59.94</b> on a short cable. The GS2975A searches 270 → 2970 → 1485, locks, raises LOCKED and sets SS[2:0] = 101. The next pass counts ≥95 of 101 LOCKED samples high: <b>LOCK</b> (green) and <b>1.5G</b> light, NO LOCK goes out, outputs are enabled.</p><p><b>Goal:</b> LOCK and 1.5G lit at the end of the second.</p>`, ok:()=>{ const p=pinsAt(0.9999); return (p.leds&0b11111)===0b00101; }, hint:'Input → HD 1080i 59.94, cable 30 m, input plugged.'},
  {t:'4 · Try 3G and SD', b:`<p>Switch to <b>3G-A 1080p</b>: the 3G LED. Then <b>SD 525i</b>: the GS2975A raises SD/HD (PD7) and the firmware takes the SD branch — <b>270M</b>.</p><p><b>Goal:</b> 270M lit.</p>`, ok:()=>{ const p=pinsAt(0.9999); return (p.leds&0b11111)===0b00011; }, hint:'Input → SD 525i 59.94.'},
  {t:'5 · Lose the input', b:`<p>Unplug SDI IN. LOS goes high within 10 µs, LOCKED drops, and the next pass sees ≥5 low samples: <b>NO LOCK</b> (red), <span class="mono">DDO_MUTE_ENABLED</span> and <span class="mono">SDI_OUTPUTS_DISABLED</span>. Downstream gear sees no signal rather than garbage.</p><p><b>Goal:</b> NO LOCK lit, outputs disabled.</p>`, ok:()=>{ const p=pinsAt(0.9999); return ((p.leds>>4)&1) && !p.pd4; }, hint:'Click SDI IN on the rear (or press C).'},
  {t:'6 · Open the card in DashBoard', b:`<p>Press <b>Open / rescan</b>. The frame controller reads the card's tree over CAN: parameter count, OIDs, the “Status” and “Control” menu sets, descriptors and values. Watch the CAN lane fill up. Card Info shows Product <b>M6203A</b>, Name “${CARD_NAME}”, Software Rev <b>1.01</b>.</p><p><b>Goal:</b> the card opened and the Card Info tab shown.</p>`, ok:()=>sim().can.filter(f=>f.dir==='rx').length>15 && D.ui.dashTab==='info', hint:'Open / rescan, then Status ▸ Card Info.'},
  {t:'7 · Alarm on loss of input', b:`<p>Control ▸ Card Settings: set <b>Notify on Card Fault = Enabled</b>. With the input unplugged, <b>Card Status</b> turns to “No SDI Input” — but only when the card next sends its SIGNAL_STATUS report. Reports go out one at a time on the heartbeat (≈0.96 s), so allow two or three seconds (“Next second”).</p><p><b>Goal:</b> DashBoard shows Card Status = No SDI Input.</p>`, ok:()=>cacheAt(0.9999)[0x0201]===2, hint:'Notify Enabled, input unplugged, then Next second ▶ once or twice.'},
  {t:'8 · Long cables', b:`<p>Plug the input back in, choose <b>3G-A 1080p</b> and a <b>90 m</b> cable. The test sheets found 75 m good and 100 m failing. At the edge the PLL drops lock now and then; each drop that covers ≥5 of the 101 UPDATE samples mutes the outputs for a pass. A drop during <span class="mono">wait(1000)</span> is not seen at all.</p><p><b>Goal:</b> a marginal 3G cable with at least one muted pass.</p>`, ok:()=>{ const R=sim(), e=R.end.w; return FMT[e.in.fmt].cls==='3g' && linkStatus(e).eye==='marg' && R.passes.some(p=>p.was===0x10 && p.l60===0); }, hint:'Input → 3G-A 1080p 59.94, cable 90 m.'},
  {t:'9 · ASI through the DA', b:`<p>Choose <b>DVB-ASI</b> on a short cable. The GS2975A locks at 270 Mb/s (LED 270M). Now watch outputs in the scope: <b>OUT1</b> (P1-75, U4 pin 12) decodes; <b>OUT5</b> (P1-80, U4 pin 11) is inverted — the 0x47 sync arrives as 0xC7. The test summary lists outputs 1, 3, 6, 7 as the ASI-safe ones, counted in panel order.</p><p><b>Goal:</b> ASI in, watching an inverted output.</p>`, ok:()=>{ const e=endState().w; return e.in.fmt==='asi' && P1OUT[D.ui.outSel].pin===11; }, hint:'Input → DVB-ASI; click OUT5 on the rear.'},
  {t:'10 · Reboot from DashBoard', b:`<p>Press <b>Reboot</b>. The card answers, stops feeding the watchdog, and restarts. Scrub the outputs lane: ≈16 ms with floating control pins, then ≈0.56 s with the drivers disabled while it re-measures its slot. A reboot is an outage on all eight outputs.</p><p><b>Goal:</b> a watchdog reboot in this second.</p>`, ok:()=>sim().segs.some(g=>g.kind==='wdt'), hint:'Press Reboot in the parameter window (early in the second).'},
  {t:'Done', b:`<p>The <b>One second</b> tab breaks the timing down to frames, lines, words and bits; <b>Software</b> shows the loop and the DashBoard protocol; <b>Findings</b> lists what the firmware is really doing.</p>`, ok:()=>true, auto:true},
];
function viewTutorial(m){
  window.__m6203Active=true;
  m.innerHTML = DASH_CSS + `<div class="grid2"><div>${card('Tutorial — installing and running an M6203A', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('What the hardware and firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('Frame, card, rear module', `<div id="frm"></div><div style="display:grid;grid-template-columns:minmax(0,1fr) 120px;gap:8px;margin-top:6px"><div id="crd"></div><div id="rear"></div></div><div id="wc"></div>`)}${card('Parameter window', `<div id="dash"></div>`)}
      <div class="grid2">${card('Card edge', `<div id="edge"></div>`)}${card('Scope', `<canvas id="scope"></canvas><div id="sinfo" class="small"></div>`)}</div></div></div>`;
  let wcVer=-1;
  const draw=()=>{
    const t=SIM.t;
    if (wcVer!==D.ver){ wcVer=D.ver; m.querySelector('#wc').innerHTML=controlsHTML(); }
    m.querySelector('#frm').innerHTML=frameSVG(t); m.querySelector('#crd').innerHTML=cardSVG(t,{labels:false}); m.querySelector('#rear').innerHTML=rearSVG(t);
    m.querySelector('#dash').innerHTML=dashHTML(t); m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#trace').innerHTML=traceHTML();
    drawScope(m.querySelector('#scope'), m.querySelector('#sinfo'), t);
    const li=D.ui.lesson;
    m.querySelector('#lessons').innerHTML=LESSONS.map((l,i)=>{ let ok=false; try{ ok=l.ok(); }catch(e){} return `<li style="cursor:pointer;${i===li?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${ok&&!l.auto?'✓ ':''}${l.t}</li>`; }).join('');
    m.querySelectorAll('#lessons li').forEach(x=>x.onclick=()=>{ D.ui.lesson=+x.dataset.i; draw(); });
    const L=LESSONS[li]; let ok=false; try{ ok=L.ok(); }catch(e){ ok=false; }
    m.querySelector('#lesson').innerHTML=`<h2>${L.t}</h2>${L.b}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${li?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${li<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>
      <p class="small muted">Goals are checked against the simulated second (most at its end), so a change made at the playhead counts once it has run.</p>`;
    m.querySelector('#prv').onclick=()=>{ D.ui.lesson=Math.max(0,li-1); draw(); }; m.querySelector('#nxt').onclick=()=>{ D.ui.lesson=Math.min(LESSONS.length-1,li+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ resetAll(); D.ui.lesson=0; SIM.seek(0); };
    bindAll(m);
  };
  SIM.on('time', draw);
}

/* ---------------- one second ---------------- */
function viewSecond(m){
  window.__m6203Active=true;
  const zbtn=[['1 s',1],['1 frame',null,'fr'],['1 line',null,'ln'],['1 main-loop pass',PASS_V101*1.1],['UPDATE window',0.0006],['1 timer1 tick',0.0002],['8 words',null,'wd'],['40 bits',null,'bt']];
  m.innerHTML = DASH_CSS + `${card('One second, broken down', `<div id="ladder"></div>`)}
    <div class="grid2">${card('As seen by the card', `<div id="dev"></div>`)}${card('As seen by the displays', `<div style="display:grid;grid-template-columns:140px minmax(0,1fr);gap:10px"><div id="edge"></div><div id="dview"></div></div>`)}</div>
    ${card('Timeline', `<div class="m6-ctl" id="zb">Zoom to: ${zbtn.map((z,i)=>`<button data-z="${i}">${z[0]}</button>`).join('')}</div><canvas id="tl"></canvas>`)}
    ${card('Serial scope at the playhead', `<canvas id="scope"></canvas><div id="sinfo" class="small"></div>`)}`;
  m.querySelectorAll('[data-z]').forEach(b=>b.onclick=()=>{ const z=zbtn[+b.dataset.z], F=FMT[worldAt(SIM.t).in.fmt]; let v=z[1];
    if (!v){ const ln=F.lineT||63.6e-6, fr=F.fps?1/F.fps:1/30; v = z[2]==='fr'? fr*1.05 : z[2]==='ln'? ln*1.2 : z[2]==='wd'? 80/F.rate : 40/F.rate; }
    SIM.win=v; const zs=document.querySelector('#zoomSel'); if (zs){ let o=[...zs.options].find(x=>Math.abs(+x.value-v)/v<1e-6); if (!o){ o=document.createElement('option'); o.value=v; o.textContent=z[0]; zs.appendChild(o); } zs.value=o.value; } SIM.refresh(); });
  const draw=()=>{
    const t=SIM.t, R=sim(), w=worldAt(t), F=FMT[w.in.fmt], p=pinsAt(t), st=stepAt(t);
    const rx=R.can.filter(f=>f.dir==='rx').length, tx=R.can.length-rx;
    const rows=[];
    if (F.lines){ rows.push(['SDI frames'+(F.il?' (2 fields each)':''), (F.fps).toFixed(3), SIM.fmtDur(1/F.fps), F.name+(F.k===4?' — two 1080-line streams interleaved':'')],
      ['SDI lines', (F.fps*F.lines).toFixed(1), SIM.fmtDur(F.lineT), F.lines+' per frame; each starts with EAV '+(F.k>1?'+ LN + CRC ':'')+'then HANC, SAV, active'],
      ['10-bit words', (F.rate/10/1e6).toFixed(3)+' M', SIM.fmtDur(10/F.rate), F.W+' per line'+(F.k>1?' ('+F.k+' interleaved streams)':'')],
      ['Serial bits', (F.rate/1e6).toFixed(2)+' M', SIM.fmtDur(1/F.rate), 'scrambled NRZI; the GS2975A re-times every one'] ); }
    else rows.push([F.name, '—', SIM.fmtDur(1/F.rate)+' per bit', F.asi? '8b/10b; 188-byte TS packets with K28.5 stuffing' : 'not a GS2975A rate: never locks']);
    rows.push(['GS2975A rate-search dwell', '—', SIM.fmtDur(C.DWELL), '270 → 2970 → 1485 Mb/s until the divided VCO is within 1 % of the crystal '+inf],
      ['Main-loop passes', R.passes.length.toLocaleString(), SIM.fmtDur(w.fw==='proto'?PASS_PROTO:PASS_V101), w.fw==='proto'? 'Prototype: one LOCKED sample + wait(300)' : 'READ · UPDATE (101 samples) · PROCESS · wait(1000) · CAN_FUNCTIONS'],
      ['LOCKED samples', (R.passes.length*(w.fw==='proto'?1:101)).toLocaleString(), SIM.fmtDur(C.UPD_IT*CYC*C.ISR_K), 'only during UPDATE: ≈'+((101*C.UPD_IT*CYC*C.ISR_K)/PASS_V101*100).toFixed(0)+' % of each pass is watched'],
      ['timer1 ticks', Math.round(1/C.T1).toLocaleString(), '96 µs', 'multi-frame replies one frame per tick; heartbeat after 10 001 ticks'],
      ['Heartbeat REPORT_PARAM', R.heart.length+' this second', SIM.fmtDur((C.HEART+1)*C.T1), 'one of SDI_FORMAT / SAMPLE_RATE / SIGNAL_STATUS — whichever parameter_refresh holds'],
      ['timer0 ticks', '1,000', '1 ms', 'once a second: can_data_rx < 10 for 3 s → dashboard_initializing = NO'],
      ['CAN frames', rx+' rx · '+tx+' tx', SIM.fmtDur(frameTime(8)), '1 Mbit/s, 29-bit IDs'],
      ['Boot (power-up or reboot)', '—', SIM.fmtDur(BOOT_TOTAL), '13 ms waits + 100 × '+SIM.fmtDur(C.ADC_SAMPLE)+' slot-ID samples + DATA_SETUP']);
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>what happens</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Step units in the transport walk frame by frame, line by line, pass by pass, sample by sample or bit by bit.</p>`;
    const L=F.lines? lineAt(F,t) : null, wi=L? Math.floor(L.ph*F.W) : 0, wd=L? wordAt(F,L.ln,wi) : null;
    const fr=R.can.find(x=>x.t<=t && x.t+x.dur>=t);
    m.querySelector('#dev').innerHTML=`<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>SDI input</th><td class="mono">${!w.card||!w.in.cable? 'no input' : L? `frame ${L.fr+1}${F.il?' field '+(L.ln>Math.ceil(F.lines/2)?2:1):''} · line ${L.ln} · word ${wi} ${wd.tag} ${hx(wd.v,3)}` : F.name}</td></tr>
      <tr><th>GS2975A</th><td class="mono">${lockedAt(R,t)? 'LOCKED at '+RATE_NAME[ssAt(R,t)] : searchAt(R,t)!==null? 'searching: trying '+RATE_NAME[searchAt(R,t)] : losAt(R,t)? 'LOS — no transitions' : 'unlocked'}</td></tr>
      <tr><th>AT90CAN128</th><td class="mono">${st.seg? esc(st.seg.label) : st.p? STEPS[st.k][0]+(st.k===1?' — sample '+st.i+' of 101':'')+'<br><span class="muted">'+STEPS[st.k][1]+'</span>' : 'between passes / interrupt'}</td></tr>
      <tr><th>timers</th><td class="mono">timer1 tick #${Math.floor(t/C.T1)} · timer0 ${Math.floor(t*1000)} ms</td></tr>
      <tr><th>CAN bus</th><td class="mono">${fr? (fr.dir==='rx'?'▼ ':'▲ ')+esc(fr.desc) : 'idle'}</td></tr>
      <tr><th>Outputs</th><td>${OUT_TXT[outState(t)]}</td></tr></table>`;
    m.querySelector('#edge').innerHTML=edgeSVG(t);
    const c=cacheAt(t);
    m.querySelector('#dview').innerHTML=`<table class="kv"><tr><th>Card edge</th><td>${LEDS.filter((L,i)=>(p.leds>>i)&1).map(L=>L.lab).join(' + ')||'dark'}</td></tr>
      <tr><th>DashBoard SDI Input</th><td>${c[0x0204]===undefined?'—':alarmLabel(P24_TABLE,c[0x0204])+' (value '+c[0x0204]+')'}</td></tr><tr><th>DashBoard Sample Rate</th><td>${valTxt(0x0202,c[0x0202])}</td></tr><tr><th>DashBoard Card Status</th><td>${valTxt(0x0201,c[0x0201])}</td></tr>
      <tr><th>Downstream monitor</th><td>${outState(t)==='on'? (F.asi&&P1OUT[D.ui.outSel].pin===11? 'ASI: no TS sync on this output' : 'picture') : 'loss of signal'}</td></tr></table>
      <p class="small muted">The LEDs follow the card within one pass (≈1.4 ms). DashBoard follows only when a REPORT_PARAM or GET_PARAM reply arrives.</p>`;
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
    drawScope(m.querySelector('#scope'), m.querySelector('#sinfo'), t);
  };
  SIM.on('time', draw);
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  rear:{x:10,y:40,w:120,h:70,t:'Rear module', d:'T6301 (single card, OUT1–OUT8) or T6401 (two cards, OUT1–OUT4 each). BNC1 (P1-97) is the input; BNC2 (P1-92) is “NOT USED” on the card. Outputs on P1-75/80/37/34/17/22/5/12. ID resistors on P1-1/P1-2 are not read.'},
  eq:{x:170,y:40,w:120,h:70,t:'GS2974A equaliser (U1)', d:'Adaptive cable equaliser. BNC1_SIG → R1 75R ‖ L1 4.7 nH return-loss network, C1/C2 1 µF AC coupling → U1-2/3; out U1-10/11 → C5/C6 4.7 µF → GS2975A DDI0. ~CD (U1-15) is left unconnected. Reach (test sheets): 3G 75 m, HD 150 m, SD 400 m.'},
  rc:{x:330,y:40,w:140,h:70,t:'GS2975A reclocker (U3)', d:'Auto rate detect (AUTO/MAN U3-21 = 3V): 270 / 1485 / 2970 Mb/s, DVB-ASI at 270. Reference: X2 GO1535 on XTAL± (U3-52/53). Outputs DDO0 (U3-44/46) and RCO/DDO1 (U3-38/40, RCO_MUTE = 3V). Status to the AVR: LOCKED U3-28→PA4, LOS U3-29→PA5, SS0/1/2 U3-24/25/26→PA1/PA2/PA3, SD/~HD U3-33→PD7. Controls: BYPASS U3-19←PA0, ~DDO_MUTE U3-36←PA6, DATA/CLOCK U3-37←PA7. AUTOBYPASS U3-20 tied to GND.'},
  drv:{x:520,y:20,w:120,h:110,t:'4 × GS2978 cable drivers (U4–U7)', d:'U4, U5 take DDO0 (via R14/R15 0R, 49R9 back-terminations R44/R45/R6/R7); U6, U7 take DDO1 (R17/R21 0R, R40/R41/R43/R38). Each drives two BNCs from pins 11 and 12 through 4.7 nH + 75R networks and 4.7 µF coupling caps. SD/~HD (pin 10) sets the slew rate straight from the GS2975A; ~DISABLE (pin 6) ← PD4.'},
  mcu:{x:330,y:170,w:140,h:80,t:'AT90CAN128 (U11), 8 MHz', d:'Watches LOCKED, SS[2:0], SD/HD (LOS is read from the wrong pin). Drives LED1–LED5 (PB0–PB4), BYPASS (always low), ~DDO_MUTE, DATA/CLOCK (always data) and ~DISABLE. Slot ID on PF0 (AN_SLOTID ← P2-6). JTAG header JTAG1. 21 924 bytes of code (V100W.mp).'},
  led:{x:170,y:180,w:120,h:60,t:'Card-edge LEDs', d:'LED1 LOCK (green, PB0), LED2 270M, LED3 1.5G, LED4 3G (yellow, PB1–PB3), LED5 NO LOCK (red, PB4); 330 Ω each. The firmware also writes COM_ACTIVITY (PG0), COM_ERROR (PB7) and ERROR (PE6) — none of them is wired.'},
  can:{x:520,y:170,w:120,h:60,t:'SN65HVD233 CAN transceiver (U9)', d:'CAND (PD5/TXCAN) → U9-1, CANR U9-4 → PD6/RXCAN; CANH/CANL on P2-13/P2-11. LBK (U9-5) is unconnected; the firmware’s CAN_RX/CAN_TX macros toggle PF7 (the JTAG TDI pin) instead.'},
  mfc:{x:520,y:260,w:120,h:50,t:'Frame controller + DashBoard', d:'1 Mbit/s CAN on the midplane. DashBoard reads Card Info, Card Status (SDI Input, Sample Rate, Card Status) and sets Notify on Card Fault.'},
  pwr:{x:10,y:180,w:120,h:70,t:'Power', d:'+12V (P2-1/3/5) → F2 RXE-050 polyfuse → FB1 → R49 2R2 → REG1 LM2676-3.3 switcher with L2 47 µH and D1 SK33 → 3V rail for every chip. −7.5V (P2-2) unused.'},
};
const WIRES=[['rear','eq','BNC1_SIG',0.2],['eq','rc','DDI0'],['rc','drv','DDO0 / DDO1'],['drv','rear','8 × SDI out',0.88],['rc','mcu','LOCKED · SS · SD/HD'],['mcu','rc','~DDO_MUTE · BYPASS · DATA/CLK'],['mcu','drv','~DISABLE',0.78],['mcu','led','PB0–PB4'],['mcu','can','TXCAN/RXCAN'],['can','mfc','CANH/L'],['pwr','mcu','3V',0.12]];
function viewBlock(m){
  window.__m6203Active=false;
  m.innerHTML=`<div class="grid2">${card('Block diagram — click a block (redrawn from M6203A-FUNCTIONAL.pdf and M6203A-iss3.net)', `<div id="bd"></div>`)}<div>${card('Selected block', `<div id="bi"></div>`)}${card('Live at the playhead', `<div id="bl"></div>`)}</div></div>`;
  let sel='rc';
  const draw=()=>{
    const t=SIM.t, R=sim(), p=pinsAt(t), os=outState(t);
    const live={rear:worldAt(t).in.cable, eq:linkStatus(worldAt(t)).sig, rc:lockedAt(R,t), drv:os==='on', mcu:p.mode==='app', led:p.leds>0, can:R.can.some(f=>Math.abs(f.t-t)<0.05), mfc:worldAt(t).mfc, pwr:worldAt(t).card};
    const cen=k=>{ const b=BLOCKS[k]; return [b.x+b.w/2, b.y+b.h/2]; };
    const lbl=[]; let s=`<svg viewBox="0 0 660 330" style="width:100%"><defs><marker id="m6a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l,fr])=>{ let [x1,y1]=cen(a), [x2,y2]=cen(b); const twin=WIRES.some(x=>x[0]===b&&x[1]===a);
      if (twin){ const dx=x2-x1, dy=y2-y1, L=Math.hypot(dx,dy), o=a<b?7:-7; x1+=-dy/L*o; x2+=-dy/L*o; y1+=dx/L*o; y2+=dx/L*o; }
      const q=fr!==undefined?fr:(twin&&a>b?0.3:0.5), lx=x1+(x2-x1)*q, ly=y1+(y2-y1)*q+(twin&&a>b?14:0);
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" marker-end="url(#m6a)"/><text x="${lx+5}" y="${ly-3}" font-size="9.5" fill="var(--ink)" stroke="var(--panel)" stroke-width="3" paint-order="stroke">${l}</text>`; });
    Object.entries(BLOCKS).forEach(([k,b])=>{ s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="7" fill="${k===sel?'color-mix(in srgb,var(--accent) 25%,var(--panel))':'var(--panel2)'}" stroke="${live[k]?'var(--accent)':'var(--line)'}" stroke-width="${live[k]?2.5:1}"/>
      <foreignObject x="${b.x+4}" y="${b.y+4}" width="${b.w-8}" height="${b.h-8}"><div xmlns="http://www.w3.org/1999/xhtml" style="font-size:11.5px;line-height:1.25;color:var(--ink)">${b.t}</div></foreignObject></g>`; });
    s=s.replace(/(<line[^>]*marker-end="url\(#m6a\)"\/>)(<text[^>]*>[^<]*<\/text>)/g,(m0,l1,t1)=>{ lbl.push(t1); return l1; }) + lbl.join('');
    s+=`</svg><div class="small muted">A green border means the block is active at the playhead.</div>`;
    m.querySelector('#bd').innerHTML=s;
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    m.querySelector('#bi').innerHTML=`<b>${BLOCKS[sel].t}</b><p class="small">${BLOCKS[sel].d}</p>`;
    m.querySelector('#bl').innerHTML=inspHTML(t);
  };
  SIM.on('time', draw);
}

/* ---------------- schematics (redrawn) ---------------- */
function chip(x,y,w,name,left,right,sub){ const h=Math.max(left.length,right.length)*16+30;
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+w/2}" y="${y+14}" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y+26}" text-anchor="middle" font-size="9.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+40+i*16; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink2)"/><text x="${x+4}" y="${yy+4}" font-size="9.5" fill="var(--ink)">${p[0]}</text><text x="${x-36}" y="${yy-3}" text-anchor="end" font-size="9" fill="var(--accent2)">${p[1]}</text>`; });
  right.forEach((p,i)=>{ const yy=y+40+i*16; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink2)"/><text x="${x+w-4}" y="${yy+4}" text-anchor="end" font-size="9.5" fill="var(--ink)">${p[0]}</text><text x="${x+w+36}" y="${yy-3}" font-size="9" fill="var(--accent2)">${p[1]}</text>`; });
  return s; }
const SHEETS = [
  {t:'Sheet 1 — SDI path: input, equaliser, reclocker', h:250, svg:()=>`
    ${chip(200,20,150,'U1 GS2974A',[['2 SDI','C1 1µ ← BNC1_SIG'],['3 SDI̅','C2 1µ → R3 37R5'],['5','C4'],['6','C4 / C76 0.47µ'],['8','R4/R5 1K, C77']],[['11 SDO','C5 → U3-1'],['10 SDO̅','C6 → U3-3'],['15 ~CD','n.c.'],['13,16','3V']],'adaptive EQ (QFN16)')}
    ${chip(560,20,200,'U3 GS2975A',[['1/3 DDI0','C5/C6 4.7µ'],['19 BYPASS','PA0'],['20 AUTOBYPASS','GND'],['21 AUTO/MAN','3V'],['36 ~DDO_MUTE','PA6'],['37 DATA/CLK','PA7'],['52/53 XTAL±','X2 GO1535']],[['28 LOCKED','PA4'],['29 LOS','PA5'],['24-26 SS0-2','PA1-PA3'],['33 SD/~HD','PD7, U4-U7/10'],['44/46 DDO0','0R → U4,U5'],['38/40 DDO1','0R → U6,U7'],['63/62 LF','C11 47n']],'reclocker (QFN64)')}
    <text x="10" y="200" font-size="10" fill="var(--ink)">BNC1_SIG = P1-97: R1 75R ‖ L1 4.7 nH to the input, R2 75R termination</text><text x="10" y="215" font-size="9.5" fill="var(--ink2)">BNC1_GND (P1-95, 96, 98, 99, 100) → C3 1µ to ground · X2 GO1535 via R16 100R on XTAL+</text>`},
  {t:'Sheet 2 — cable drivers and outputs', h:330, svg:()=>{ let s=''; [['U4','DDO0','BNC3 P1-75','BNC4 P1-80','R44/R45 49R9 · C81'],['U5','DDO0','BNC5 P1-37','BNC6 P1-34','R6/R7 49R9 · C25'],['U6','DDO1','BNC8 P1-22','BNC7 P1-17','R41/R43 49R9 · C80'],['U7','DDO1','BNC9 P1-5','BNC10 P1-12','R38/R40 49R9 · C69']].forEach((u,i)=>{
      s+=chip(110+(i%2)*330, 20+Math.floor(i/2)*150, 110, u[0]+' GS2978', [['1 SDI',u[1]],['2 SDI̅',u[1]+'̅'],['6 ~DISABLE','PD4'],['10 SD/~HD','U3-33']], [['12 SDO',u[2]],['11 SDO̅',u[3]],['4 RSET','750 Ω']], u[4]); }); return s+`<text x="10" y="308" font-size="10" fill="var(--ink2)">Each output: driver pin → 4.7 nH + 75 Ω → 4.7 µF → BNCx_SIG. U6 swaps which pin feeds the lower-numbered BNC.</text><text x="10" y="322" font-size="10" fill="var(--ink2)">M6203B-iss1.net had DDO1 / DDO1̅ crossed at U6 and the drivers’ ~DISABLE tied to GND.</text>`; }},
  {t:'Sheet 3 — AT90CAN128 control', h:290, svg:()=>chip(330,20,190,'U11 AT90CAN128',[['10 PB0','LED1 LOCK'],['11 PB1','LED2 270M'],['12 PB2','LED3 1.5G'],['13 PB3','LED4 3G'],['14 PB4','LED5 NO LOCK'],['29 PD4','~DISABLE'],['30 PD5 TXCAN','CAND → U9-1'],['31 PD6 RXCAN','CANR ← U9-4'],['32 PD7','SD/~HD'],['23/24 XTAL','X1 8 MHz, C62/C63 27p'],['20 RESET','R35 10K, JTAG1-6']],
      [['51 PA0','BYPASS'],['50 PA1','SS0'],['49 PA2','SS1'],['48 PA3','SS2'],['47 PA4','LOCKED'],['46 PA5','LOS'],['45 PA6','~DDO_MUTE'],['44 PA7','DATA_CLK'],['61 PF0 ADC0','AN_SLOTID (P2-6, R55 1K)'],['60 PF1','AN_BMID (P1-2, R53 1K)'],['59 PF2','AN_BMID2 (P1-1, R54 1K)'],['54–57 PF4–7','JTAG1'],['64 AVCC','R42 10R, C75']],'8 MHz · TQFP64')},
  {t:'Sheet 4 — CAN and power', h:110, svg:()=>chip(170,10,140,'U9 SN65HVD233',[['1 D','CAND (PD5)'],['4 R','CANR (PD6), C79 15p'],['5 LBK','(no connection)']],[['7 CANH','P2-13'],['6 CANL','P2-11'],['3 VCC','3V']],'3.3 V CAN')+chip(560,10,140,'REG1 LM2676-3.3',[['VIN','+12V → F2 → FB1 → R49 2R2'],['GND','GNDD']],[['OUT','L2 47µH → 3V'],['SW','D1 SK33'],['FB','C40–C47 68µ']],'buck regulator')},
];
function viewSchem(m){
  window.__m6203Active=false;
  m.innerHTML=SHEETS.map(sh=>card(sh.t+' <span class="muted small">(redrawn from M6203A-iss3.net — not the original P-CAD schematic)</span>', `<svg viewBox="0 0 900 ${sh.h}" style="width:100%">${sh.svg()}</svg>`)).join('') +
    card('Net list summary (M6203A-iss3.net, 145 parts, 129 nets)', `<table class="kv"><tr><th>Net</th><th>Pins</th></tr>${[['LOCKED','U11-47 U3-28'],['LOS','U11-46 U3-29'],['SS0 / SS1 / SS2','U11-50 U3-24 / U11-49 U3-25 / U11-48 U3-26'],['SD/~HD','U11-32 U3-33 U4-10 U5-10 U6-10 U7-10'],['~DDO_MUTE','U11-45 U3-36'],['DATA_CLK','U11-44 U3-37'],['BYPASS','U11-51 U3-19'],['~DISABLE','U11-29 U4-6 U5-6 U6-6 U7-6'],['DDO / ~DDO','U4-1/2 U5-1/2 R14/R15 0R R6 R7 R44 R45'],['DDO1 / ~DDO1','U6-1/2 U7-1/2 R17/R21 0R R38 R40 R41 R43'],['LED1…LED5','U11-10…14 → R52 R51 R50 R56 R57 330R'],['~CD','U1-15 only'],['LBK','U9-5 only'],['AN_SLOTID','P2-6 R55 U11-61'],['BNC2_SIG','P1-92 only (NOT USED)']].map(r=>`<tr><td class="mono">${r[0]}</td><td class="mono small">${r[1]}</td></tr>`).join('')}</table>
      <p class="small muted">Issue history: M6203B-iss1 → M6203A-iss2 → iss3 (netlist 2010-05-03, Gerbers 2011-12-06). iss2→iss3 only removes the isolated BNC10_GND net in the netlist; the Jan 2012 test note says iss3 “should improve the eye pattern of the output” (layout change).</p>`);
}

/* ---------------- software ---------------- */
function viewSoft(m){
  window.__m6203Active=false;
  m.innerHTML=DASH_CSS+`<div class="grid2">${card('main() while(1) — the box lit up runs at the playhead', `<div id="flow"></div>`)}<div>${card('Lock debounce state machine (lock60)', `<div id="fsm"></div>`)}${card('Interrupts (CAN.c)', `<div id="isr"></div>`)}</div></div>
    <div class="grid2">${card('PROCESS_SDI_LOCK_STATUS — inputs → pins', `<div id="tt"></div>`)}${card('PARAMETER_UPDATE and the heartbeat', `<div id="pu"></div>`)}</div>
    <div class="grid2">${card('DashBoard objects (Dashboard.c)', `<div id="oids"></div>`)}${card('Port map (M6203.h vs the netlist)', `<div id="ports"></div>`)}</div>
    ${card('Firmware builds in the archive', `<div id="vars"></div>`)}`;
  const draw=()=>{
    const t=SIM.t, st=stepAt(t), R=sim(), p=pinsAt(t), w=worldAt(t), pa=passAt(t);
    let s=`<svg viewBox="0 0 520 ${STEPS.length*44+96}" style="width:100%"><defs><marker id="m6a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <rect x="90" y="6" width="340" height="28" rx="14" fill="${st.seg?'var(--warn)':'var(--chip)'}" stroke="var(--line)"/><text x="260" y="24" text-anchor="middle" font-size="11" fill="var(--ink)">main(): init · 5 × wait(3000) · slot ID (100 ADC) · DATA_SETUP · CANinit</text>`;
    STEPS.forEach((x,j)=>{ const y=48+j*44, on=st.p && st.k===j; s+=`<line x1="260" y1="${y-12}" x2="260" y2="${y}" stroke="var(--ink2)" marker-end="url(#m6a2)"/><rect x="20" y="${y}" width="480" height="32" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
      <text x="30" y="${y+14}" font-size="11" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${x[0]}${on&&j===1?' — sample '+st.i:''}</text><text x="30" y="${y+27}" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${x[1]}</text>`; });
    const yb=48+STEPS.length*44; s+=`<path d="M500 ${yb-28} h14 V44 h-14" fill="none" stroke="var(--ink2)" marker-end="url(#m6a2)"/><text x="20" y="${yb+16}" font-size="11" fill="var(--ink2)">${st.seg? 'Now: '+esc(st.seg.label).slice(0,90) : R.passes.length.toLocaleString()+' passes this second · ≈'+(PASS_V101*1e3).toFixed(2)+' ms each'}</text>
      <text x="20" y="${yb+32}" font-size="10" fill="var(--ink2)">wait(1000) is ≈${((C.WAIT_MAIN*7*CYC*C.ISR_K)/PASS_V101*100).toFixed(0)} % of the pass; the 101 LOCKED samples cover the other ≈${((101*C.UPD_IT*CYC*C.ISR_K)/PASS_V101*100).toFixed(0)} %.</text></svg>`;
    m.querySelector('#flow').innerHTML=s;
    const L=p.l60;
    m.querySelector('#fsm').innerHTML=`<svg viewBox="0 0 440 130" style="width:100%"><defs><marker id="m6a3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <circle cx="90" cy="65" r="44" fill="${!L?'var(--bad)':'var(--panel2)'}" stroke="var(--line)"/><text x="90" y="62" text-anchor="middle" font-size="12" fill="${!L?'#fff':'var(--ink)'}">lock60 = 0x00</text><text x="90" y="78" text-anchor="middle" font-size="9.5" fill="${!L?'#fff':'var(--ink2)'}">NO LOCK, muted</text>
      <circle cx="350" cy="65" r="44" fill="${L?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="350" y="62" text-anchor="middle" font-size="12" fill="${L?'#fff':'var(--ink)'}">lock60 = 0x10</text><text x="350" y="78" text-anchor="middle" font-size="9.5" fill="${L?'#fff':'var(--ink2)'}">LOCK, outputs on</text>
      <path d="M134 50 Q220 10 306 50" fill="none" stroke="var(--ink2)" marker-end="url(#m6a3)"/><text x="220" y="22" text-anchor="middle" font-size="10" fill="var(--ink)">≥95 of 101 samples high</text>
      <path d="M306 82 Q220 122 134 82" fill="none" stroke="var(--ink2)" marker-end="url(#m6a3)"/><text x="220" y="124" text-anchor="middle" font-size="10" fill="var(--ink)">≥5 of 101 samples low</text></svg>
      <div class="small">${pa&&pa.smp? 'Last window: '+pa.smp.map(v=>v?'█':'▁').join('') : w.fw==='proto'? 'Prototype: lock60 = PINA & BIT4 every pass (no window).' : '—'}</div>
      <p class="small muted">The header comment says “10 times out of 100”; the code sets lock60_nolock_limit = 5 and loops i = 0…100 (101 samples). PORTC bit 1 pulses at the start of each window — PC1 goes nowhere on the board (a scope test point that was never routed ${inf}).</p>`;
    m.querySelector('#isr').innerHTML=`<table class="kv"><tr><th>timer0_ovf_isr</th><td class="small">every 1 ms; at 1000: can_data_rx &lt; 10 three seconds running → dashboard_initializing = NO (see the timer lane). Also writes dashboard_counter_buffer[dashboard_index] — index runs 0…100 in a 100-entry array.</td></tr>
      <tr><th>timer1_ovf_isr</th><td class="small">every 96 µs: next frame of a multi-frame reply; else count to ${'1000 × slot_address ('+(1000*ADDRESS_TABLE(slotAdc(w.slot)))+')'} while DashBoard is initialising, or 10 000 (heartbeat).</td></tr>
      <tr><th>can_rx_isr</th><td class="small">CANRX → DASHBOARD_RESPONSE_SETUP → CANTX: replies from inside the interrupt; can_data_rx++.</td></tr></table>`;
    const rowsTT=[['lock60 = 0','—','—','NO LOCK','PA6 = 0 (mute), PD4 = 0 (disable)','NO_LOCK, ss = 0'],['0x10','1 (SD)','010','LOCK + 270M','PA6 = 1, PD4 = 1, PA7 = 1','SD_FORMAT'],['0x10','1 (SD)','other','LOCK only','enabled','SD_FORMAT, ss = 0'],['0x10','0 (HD)','101','LOCK + 1.5G','enabled','HD_FORMAT'],['0x10','0 (HD)','110','LOCK + 3G','enabled','HD_FORMAT'],['0x10','0 (HD)','other','LOCK only','enabled','HD_FORMAT, ss = 0']];
    const cur = !p.l60? 0 : p.fmt===1? (p.ss===2?1:2) : (p.ss===5?3:p.ss===6?4:5);
    m.querySelector('#tt').innerHTML=`<table class="kv"><tr><th>lock60</th><th>sd_hd (PD7)</th><th>ss</th><th>LEDs</th><th>outputs</th><th>sdi_format</th></tr>${rowsTT.map((r,i)=>`<tr class="${i===cur&&p.mode==='app'?'hl':''}">${r.map(x=>`<td class="small mono">${x}</td>`).join('')}</tr>`).join('')}</table>
      <p class="small muted">BYPASS_MODE_OFF in both branches: the reclocker is never bypassed. DATA_NOT_CLOCK_ENABLED only in the lock branch (and at start-up). The “HD” branch covers 3G too: the GS2975A holds SD/HD low for both.</p>`;
    m.querySelector('#pu').innerHTML=`<ol class="small"><li>sdi_format changed → report SDI_FORMAT (2.4)</li><li>else ss changed → SAMPLE_RATE (2.2)</li><li>else signal_status_change → SIGNAL_STATUS (2.1)</li><li>else, once parameter_tx_complete is YES (never cleared again), <b>parameter_refresh steps 0→1→2→0 on every pass</b> — so the heartbeat reports whichever one the counter is on when timer1 fires.</li></ol>
      <p class="small">Now: parameter_refresh = ${pa?pa.pr:'—'}${pa&&pa.pc?' (change pending — held until the next heartbeat)':''}. Heartbeats this second: ${R.heart.map(x=>SIM.fmtT(x)).join(', ')||'none'}.</p>
      <p class="small muted">A lock change therefore reaches DashBoard as three reports on three heartbeats (≈3 s), unless DashBoard is polling.</p>`;
    const c=cacheAt(t);
    m.querySelector('#oids').innerHTML=`<table class="kv"><tr><th>OID</th><th>name</th><th>descriptor</th><th>DashBoard now</th></tr>${[0x0105,0x0106,0x0102,0x0107,0x010B,0x0104,0x0201,0x0204,0x0202,0x0400].map(o=>`<tr><td class="mono">${oidTxt(o)}</td><td>${OID[o].name}</td><td class="small">${OID[o].desc}</td><td class="small">${o===0x0204&&c[o]!==undefined? alarmLabel(P24_TABLE,c[o])+' ('+c[o]+')' : c[o]!==undefined? esc(o>=0x0200? valTxt(o,c[o]) : c[o]) : '—'}</td></tr>`).join('')}</table>
      <p class="small muted">ParamOIDS_Message: count byte 9, ten OIDs (1.7 last, dropped). Menus: Status → “Card Info” (Menu0OID) and “Card Status” (Menu1OID); Control → “Card Settings” (Menu2OID). Leftover from the M6202A: Parameter23/25–2A/31–39 arrays, “Voiceover Status/Settings” menu names, SET handlers for 3.1–3.4.</p>`;
    m.querySelector('#ports').innerHTML=`<table class="kv"><tr><th>macro / variable</th><th>code</th><th>netlist</th></tr>${[
      ['LOCK_LED … NO_LOCK_LED','PB0, PB1, PB2, PB3, PB4','LED1…LED5 ✓'],['COM_ACTIVITY_LED','PG0','not connected ✗'],['COM_ERROR_LED / ERROR_LED','PB7 / PE6','not connected ✗'],
      ['lock60_mask','BIT4 (comment “PA2”)','LOCKED = PA4 ✓ (comment wrong)'],['los_mask','BIT3 (comment “PA3”)','PA3 is SS2; LOS is PA5 ✗'],['ss','(PINA & 0x0E) >> 1','SS0/1/2 = PA1/2/3 ✓'],['SD_HD_mask','PIND BIT7','SD/~HD = PD7 ✓'],
      ['BYPASS_MODE','PA0','BYPASS ✓ (also STROBE_WRITE in the template macros)'],['DDO_MUTE','PA6 (low = mute)','~DDO_MUTE ✓'],['DATA_NOT_CLOCK','PA7','DATA_CLK ✓'],['SDI_OUTPUTS_ENABLED','PD4 high','~DISABLE ✓'],
      ['CAN_RX / CAN_TX','PF7','JTAG TDI; transceiver LBK unconnected ✗'],['DDRF = 0x0C','PF2, PF3 outputs','PF2 = AN_BMID2 rear-ID line ✗'],['PORTC |= BIT1','PC1 strobe','not connected']
    ].map(r=>`<tr><td class="mono small">${r[0]}</td><td class="mono small">${r[1]}</td><td class="small">${r[2]}</td></tr>`).join('')}</table>`;
    m.querySelector('#vars').innerHTML=`<table class="kv"><tr><th>build</th><th>date</th><th>differences in the source</th></tr>
      <tr><td>Prototype</td><td>2007|40-08-21, ICC 7.07</td><td class="small">lock60 = PINA & BIT4 in READ_GS2975_STATUS (no debounce); wait(300); DashBoard code inside M6203A.c (1292 lines, M6202A copy with Dolby/audio routines)</td></tr>
      <tr><td>OBSOLETE/Jan 12, 09 - WORKING</td><td>2009|42-01-12</td><td class="small">snapshot two days after the “PL Jan 10, 09” debounce was written</td></tr>
      <tr><td>v100 (1.00)</td><td>—</td><td class="small">TRAP RESTART repeated until GET_NUMPARAMS (start_parameter_dump); NUMPARAMS hard-coded 5; no START_UPGRADE, no restore_start; EEPROM_initialization() still called</td></tr>
      <tr><td>v101 (1.01) “1.0.0.1”</td><td>2009|42-10-20, ICC 7.15</td><td class="small">“datasafe and bootloader”: START_UPGRADE, TRAP once, 255.7/255.8 restore_start; zeuspack → m6203a_v1_01.bin</td></tr>
      <tr><td>C030000 “03AC0000”</td><td>2013|46-06-28</td><td class="small">S&amp;L Technology: Product, Manufacturer, Software Rev, Website = “-” (Ali-Rem / Ali-Add); Name string still sent</td></tr></table>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewFind(m){
  window.__m6203Active=false;
  const F=[
    ['The bypass the README mentions is never used', 'PROCESS_SDI_LOCK_STATUS (M6203A.c) calls BYPASS_MODE_OFF in both the lock and the no-lock branch, and AUTOBYPASS (U3-20) is tied to GND in M6203A-iss3.net. Rates the GS2975A cannot lock to (143 Mb/s, 360 Mb/s, other non-SMPTE data) are muted, not passed. The GS2975A data sheet says unlocked outputs “produce invalid data” without bypass, which is why the firmware mutes.'],
    ['LOS is read from the wrong pin', 'M6203.h: los_mask = BIT3, comment “PA3”. In the netlist PA3 (U11-48) is SS2; LOS is on PA5 (U11-46). READ_GS2975_STATUS therefore stores SS2 in los. Harmless — los is never used — but the loss-of-signal output the board routes to the AVR is ignored.'],
    ['Comments that disagree with the code', 'lock60_mask is BIT4 with the comment “PA2” (the netlist agrees with BIT4 = PA4 = LOCKED). The debounce header says 10 of 100 samples unlock; the code uses lock60_nolock_limit = 5 and samples i = 0…100 (101 times). TCNT0 “reload counter value for 100us” is 1 ms; timer1 “96 ms” is 96 µs.'],
    ['The debounce only watches about a third of the time', `PROCESS_SDI_LOCK_STATUS_UPDATE samples LOCKED 101 times in ≈${(101*C.UPD_IT*CYC*C.ISR_K*1e6).toFixed(0)} µs, then wait(1000) burns ≈${(C.WAIT_MAIN*7*CYC*1e3).toFixed(2)} ms (counts from M6203A.lis / v100w.lis). A PLL drop-out that falls inside the wait is never seen; one that covers ≥5 samples (≈20 µs) mutes all outputs for a whole pass. The decision is made inside one pass, not across passes.`],
    ['SDI Input values do not match its descriptor', 'CAN_TX_TIMER and GET_PARAM send 2.4 = BIT1 (2) for HD, BIT2 (4) for SD and BIT3 (8) for no lock. MESSAGE_CREATOR_PARAMETER_24 describes an ALARM_TABLE with entries Locked (00 00), HD (01 00), SD (02 00), Unlocked (03 02). Read as (severity, bit mask), only bit 1 matches — and that entry is “Unlocked”, so an HD input could show as Unlocked and loss of lock as “Locked” '+inf+'. The static Parameter24_Message (CHOICE Unlocked / SD / HD) is left over and unused.'],
    ['Card Status: two encodings', 'REPORT_PARAM 2.1 sends 0 for OK and BIT1 for “No SDI Input”; GET_PARAM 2.1 returns BIT0 (1) for OK. Both happen to map to “OK” under the alarm-table reading above, but they are not the same value.'],
    ['Ten OIDs, count of nine; a menu item with no descriptor', 'ParamOIDS_Message has count byte 9 followed by ten OIDs — Board Rev 1.7 is the one left out. Menu0OID (“Card Info”) still lists 1.7, but its descriptor and GET_PARAM cases are commented out: DashBoard gets CANRESP_UNSUPPORTED. BOARD_ISSUE is 1 while the board is issue 3.'],
    ['No COM activity LED, three phantom LEDs', 'The firmware drives COM_ACTIVITY_LED (PG0), COM_ERROR_LED (PB7) and ERROR_LED (PE6). None of those pins is in M6203A-iss3.net; the card has five LEDs: LOCK, 270M, 1.5G, 3G, NO LOCK (M6203A LED Status.cdr).'],
    ['DashBoard hears about a lock change one heartbeat at a time', 'PARAMETER_UPDATE queues one change; CAN_TX_TIMER sends it only on the heartbeat (TX_HEARTBEAT = 10 000 × 96 µs ≈ 0.96 s). A loss of input becomes three reports — SDI_FORMAT, SAMPLE_RATE, SIGNAL_STATUS — over ≈3 s. In between, because parameter_tx_complete is never cleared, parameter_refresh spins 0→1→2 every pass, so which OID a quiet heartbeat reports is effectively random.'],
    ['High slots report slower while DashBoard initialises', 'TX_INITIALIZE = 1000 × slot_address ticks: slot 1 every 96 ms, slot 20 every 1.92 s — slower than the normal 0.96 s heartbeat for slots 11 and up.'],
    ['Buffer overrun every 101 seconds', 'timer0_ovf_isr: temp = sizeof(dashboard_counter_buffer) >> 1 = 100; dashboard_index runs 0…100 and buffer[100] is written. V100W.mp puts dashboard_counter_buffer at 0x02F2 (200 bytes), so the write lands on canbus_status_buffer at 0x03BA.'],
    ['CANinit runs twice', 'main() calls CANinit(); MOB_error starts as YES, so the first CAN_FUNCTIONS() calls it again and restarts both timers.'],
    ['Template macros that touch the wrong pins', 'CAN_RX / CAN_TX (meant for a transceiver loop-back) write PORTF bit 7 — the JTAG TDI pin, not an output under DDRF = 0x0C; the transceiver’s LBK pin is unconnected. DDRF = 0x0C makes PF2 an output driven low, and PF2 is AN_BMID2, the rear-module ID line pulled up by R54 1K (the ID is never read). PORTC bit 1, pulsed by the debounce, goes nowhere.'],
    ['A reboot is an eight-output outage', `REBOOT and START_UPGRADE end in while(1) CLI(); the watchdog (≈16 ms ${inf}) resets the AVR. Until port_init() its pins float — ~DISABLE, ~DDO_MUTE, BYPASS and DATA_CLK have no pull resistors in the netlist — then PD4 is held low for the 13 ms start-up waits and the ≈0.54 s slot-ID average. Total ≈${(C.WDT+BOOT_TOTAL).toFixed(2)} s with no output.`],
    ['ASI works on four outputs — and the two lists disagree', 'The 24 Jun 2010 e-mail lists ASI on outputs 1, 3, 5, 7; the undated summary says 1, 3, 6, 7 and blames “the negative side of the differential transmitter”. The netlist explains it: each GS2978 feeds one BNC from pin 12 and one from pin 11, and U6 is the one whose pins are swapped (pin 11 → BNC7, pin 12 → BNC8). Pin 12 feeds T6301 positions 3, 5, 8, 9 — outputs 1, 3, 6, 7 counted in panel order, exactly the summary. SDI does not care (NRZI); 8b/10b ASI does. On a T6401 the inverted one would be OUT3 (P1-17 ← U6-11) '+inf+'.'],
    ['M6203B is the older board', 'M6203B-iss1.net has DDO1/DDO1̅ crossed at U6, no 49R9 back-terminations and the drivers’ ~DISABLE tied to GND; M6203A-iss2/iss3 add AVR control of ~DISABLE. The 2011 fab query is headed “M6203B-ISS2” while the Gerbers are M6203A-ISS3, and it settles the mask colour: green, “same as AA6201A and AV6201A”, white silk.'],
    ['Mislabelled pick-and-place file', 'GERBERS/M6203A-iss3-bot.pnp is the top-side list again, every part shifted +105 mil and still marked “Top”.'],
    ['DataSafe without a save', 'The history sheet says v101 added “datasafe and bootloader”. The only EEPROM write left is BOOT_CONTROL for the bootloader; smpte_alarm_enabled is not stored, so Notify on Card Fault starts Disabled after every power-up unless the frame controller writes it back. 255.7 / 255.8 only pause the reports (restore_start).'],
    ['The S&L build still names the card', 'C030000 replaces Product, Manufacturer, Software Rev and Website with “-”; ParamName_Message — “MD-SDI Re-Clocking Distribution Amplifier” — is unchanged, although the history says the card name is hidden.'],
    ['v100 shouts RESTART', 'In v100 the first branch of CAN_TX_TIMER sends TRAP CANTRAP_RESTART every time it runs until DashBoard sends GET_NUMPARAMS (start_parameter_dump = YES); v101 sends it once (restart_sent).'],
    ['M6202A leftovers', 'v100w.c declares dozens of M6202A externs (Dolby, audio groups, PROCESS_AUDIO*, DOLBY_INITIALIZATION); altera.c is compiled although there is no FPGA; Dashboard.c keeps AES/Dolby descriptors, “Voiceover Status/Settings” menu names and SET handlers for OIDs 3.1–3.4 (output1/output2, never used); a stub PROCESS_SDI_LOCK_STATUS that forces HD 1.5G is left commented out above the real one. Typo: Parcameter33_Message.'],
    ['Cable reach was the weak point', 'Input (Dec 2010): 3G 75 m good, 100 m failed; HD 150 m good, 175 m failed; SD 415 m good. Output (summary): 3G 125 m, HD 210 m, SD 465 m. Nov 2011: 3G works but fails rise time; summary: “the cable lengths are not impressive”. The 3G manual folders are empty, and the T6401 README says the dual rear is HD/SD only.'],
    ['Artwork '+SIM.year(2026)+': panels now from the CorelDRAW files', 'Card edge from '+SIM.src(ART62.edge,'M6203A LED Status.cdr')+' (2010-04-28, the manual figure: LOCK, 270M, 1.5G, 3G, NO LOCK — the same five LEDs as the netlist); rear modules from '+SIM.src(ART62.rear,'M6203A - rear module options.cdr')+' (2012-01-16), T6301A-3G and T6401A. The LEDs and BNCs sit on the drawn boxes and holes. The older '+SIM.src(ART62.edge0,'M6203A-card-edge.cdr')+' (2008-05-08) spaces the LEDs differently (3G and No Lock lower down); the 2007 sheets '+SIM.src(ART62.t6301,'M6203A-T6301.cdr')+' and '+SIM.src(ART62.t6401,'M6203A-T6401.cdr')+' have only the two top BNCs drawn in their Inkscape conversion, so the 2012 guide is used.'],
    ['The double module is not a 3G part',    ['2007 rear sheets', 'Both 2007 sheets carry the frame caption MF6220 (SINGLE / DOUBLE CARD TERMINATION).'],
 'The 2012 guide captions the single module “T6301A-3G … M6203A-3G/HD/SD-SDI DA” but the dual T6401A “M6203A-3G/HD/SD-SDI DA- NOT 3G”: two cards sharing a T6401A were only rated for HD/SD. Position 2 of the T6301A is drawn “Not Connected” (the 2007 sheet says “NOT USED”).'],
    ['“MD-SDI” is a name, not a typo', 'The card Name string, the functional drawing (“MD SDI INPUT”) and both rear drawings (“MD-SDI DA”) all use MD-SDI.'],
  ];
  m.innerHTML=card('Findings — what the M6203A and its firmware are up to', `<ol>${F.map(f=>`<li style="margin-bottom:8px"><b>${f[0]}.</b> <span class="small">${f[1]}</span></li>`).join('')}</ol>`)+
    card('Sources', `<ul class="small"><li>#OPENGEAR #SERIES/M6203 - #Master #OPENGEAR/M6203 - #Engineering/M6203A/Software/atmel/v101/: v100w.c, M6203A.c, M6203.h, Dashboard.c, CAN.c, ADC.c, *.lis, V100W.mp, wbs_ztcpack.txt; …/v100, …/C030000, …/Prototype; M6203A SOFTWARE HISTORY.xls</li>
      <li>…/M6203A/PCB/M6203A-iss3.net, OBSOLETE/ISS2/M6203A-iss2.net, OBSOLETE/M6203B-iss1.net; GERBERS/M6203A-ISS3.TOP/.TSM/.TSS → assets/m6203-card-copper.png, m6203-card-silk.png; M6203A-iss3.pnp, -bot.pnp; M6203-PCB Questions.doc</li>
      <li>…/M6203A/Functional/M6203A-FUNCTIONAL.pdf, ${SIM.src(ART62.t6301,'M6203A-T6301.cdr')}, ${SIM.src(ART62.t6401,'M6203A-T6401.cdr')}, ${SIM.src(ART62.edge0,'M6203A-card-edge.cdr')}; ${SIM.src(ART62.edge,'MANUAL/M6203A LED Status.cdr')} → assets/m6203-edge.svg</li><li>Artwork ${SIM.year(2026)}: ${SIM.src(ART62.rear,'openGear Rear Module Guides/M6203A - rear module options.cdr')} → assets/m6203-rear-t6301a.svg, m6203-rear-t6401a.svg</li>
      <li>M6203A - #Master #OPENGEAR/M6203A - #TESTREPORT/*.pdf (ASI, cable length, summary, 2011/2012/2013 test outlines)</li>
      <li>T6401 - #Master…/T6401iss4.net; T6301 geometry and routing as in t6301.js; slot-ID table as in opengear.js</li>
      <li>SA-DEMUX4 - #Master/…/Parts Research/SDI Reclocker/GS2975A_Datasheet.pdf</li></ul>`);
}

/* ---------------- register ---------------- */
resetAll();
SIM.register({
  id:'m6203',
  footnotes:[{text:'Card edge and rear artwork from the CorelDRAW files (2026|59): M6203A LED Status.cdr (2010-04-28) and the guide M6203A - rear module options.cdr (2012-01-16).', src:'#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/M6203A - rear module options.cdr'},
    {text:'The card-edge figure in the manual folder shows five LEDs, LOCK, 270M, 1.5G, 3G and NO LOCK, the same five as the ISS3 netlist; no COM or error LED.', src:'#OPENGEAR #SERIES/M6203 - #Master #OPENGEAR/M6203 - #Engineering/M6203A/MANUAL/M6203A LED Status.cdr'},
    {text:'The older M6203A-card-edge.cdr (2008-05-08) spaces the LEDs differently from the 2010 manual figure (3G and No Lock lower down).', src:'#OPENGEAR #SERIES/M6203 - #Master #OPENGEAR/M6203 - #Engineering/M6203A/Functional/M6203A-card-edge.cdr'},
    {text:'The 2012 guide captions the dual T6401A “M6203A-3G/HD/SD-SDI DA- NOT 3G”, while the single module is T6301A-3G.', src:'#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/M6203A - rear module options.cdr'},
    {text:'Rear position 2 of the single module is “Not Connected” in the 2012 guide and “NOTUSED” in the 2007 sheet.', src:'#OPENGEAR #SERIES/M6203 - #Master #OPENGEAR/M6203 - #Engineering/M6203A/Functional/M6203A-T6301.cdr'},
    {text:'In the Inkscape conversion of the 2007 T6301 and T6401 sheets only the two top BNCs are drawn; both carry the frame caption MF6220.', src:'#OPENGEAR #SERIES/M6203 - #Master #OPENGEAR/M6203 - #Engineering/M6203A/Functional/M6203A-T6401.cdr'}],
   product:'M6203', year:2007, family:'openGear', folder:'#OPENGEAR #SERIES/M6203 - #Master #OPENGEAR',
  name:'M6203 · openGear SD/HD/3G reclocking SDI DA (2007|40)', duration:1,
  summary:'A 1-in, 8-out openGear SDI distribution amplifier: GS2974A equaliser, GS2975A multi-rate reclocker (ASI too) and four GS2978 drivers, with an AT90CAN128 that debounces the reclocker’s LOCKED pin, lights the rate LEDs, mutes and disables the outputs, and reports to DashBoard. Modelled down to SDI frames, lines, words and bits, the reclocker’s rate search and every main-loop pass.',
  highlights:['Card drawn from the ISS3 gerbers with live LEDs; T6301/T6401 rear modules from the CorelDRAW drawings','GS2975A rate search, LOCKED/LOS/SS pins and the 101-sample lock debounce, sample by sample','SDI lines, EAV/SAV words and scrambled NRZI bits at the playhead; ASI on true vs inverted outputs','DashBoard window fed by simulated CAN reports and replies, with reboot and upgrade paths','Findings: unused bypass, LOS on the wrong pin, SDI Input alarm mismatch, ASI output list explained from the netlist'],
  depth:'Full model',
  stepUnits:[
    {label:'1 SDI frame', period:()=>{ const F=FMT[worldAt(SIM.t).in.fmt]; return F.fps? 1/F.fps : 1/30; }},
    {label:'1 SDI line', period:()=>{ const F=FMT[worldAt(SIM.t).in.fmt]; return F.lineT || 63.556e-6; }},
    {label:'1 main-loop pass (≈1.4 ms)', period:()=>PASS_V101},
    {label:'1 LOCKED sample (4 µs)', period:()=>C.UPD_IT*CYC*C.ISR_K},
    {label:'1 timer1 tick (96 µs)', period:()=>C.T1},
    {label:'1 ms (timer0)', period:()=>C.T0},
    {label:'1 SDI word', period:()=>10/FMT[worldAt(SIM.t).in.fmt].rate},
    {label:'1 SDI bit', period:()=>1/FMT[worldAt(SIM.t).in.fmt].rate},
  ],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[0.034,'1 frame (≈33 ms)'],[0.004,'4 ms (3 passes)'],[0.0015,'1 main-loop pass'],[0.0006,'UPDATE window'],[0.0002,'200 µs (timer1)'],[0.00004,'1 HD line (30 µs)'],[3e-7,'8 HD words'],[3e-8,'40 HD bits']],
  defaultZoom:0,
  init(){ D.ver++; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: install, lock, DashBoard', render:viewTutorial},
    {id:'second', label:'One second: frames → bits', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFind},
  ],
});
})();
