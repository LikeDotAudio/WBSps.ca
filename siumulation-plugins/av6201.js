/* =====================================================================
   AV6201 (AV6201A) — openGear analog composite-video distribution amplifier, Ward-Beck Systems
   Plugin for the WBS Device Simulator (../siumulation.html) · Full model (firmware + analog path)
   OEM: Cobalt 9231 (the archived build is the Cobalt image).

   Sources used (all under #OPENGEAR #SERIES/AV6201 - #Master #OPENGEAR/AV6201 - #Engineering/AV6201A/):
   - Software/atmel/v101/  v100w.c (main(), REFRESH_LEDS, MIRROR, wait), AV6201A.c/.h (LED and port macros,
       the commented-out pushbutton/ALTERA code), LMH1981.c/.h (LMH1981_VIDEO_DETECT, format table, constants),
       ADC.c/.h (AD_CONVERTER_SETUP, ADDRESS_TABLE), CAN.c (timer0/timer1 ISRs, can_rx_isr, CANinit, CAN_FUNCTIONS,
       ENABLE_MODE), Dashboard.c (PARAMETER_UPDATE, CAN_TX_TIMER, DASHBOARD_RESPONSE_SETUP, every descriptor and
       string), common.h (#define COBALT), paramdef.h (ALARM_TABLE = bit field), *_ztcpack.txt (zeuspack),
       *.lis (compiled listings: cycle counts, compiled brand, format constants), V100W.mp (code size)
   - Software/AV6201A SOFTWARE HISTORY.xls (V100 2008-12-15 Cobalt 9231, V101 2009-11-10 bootloader + DataSafe)
   - PCB/AV6201-iss3.net, .bom, .pnp (every net, part value and position used below)
   - #OPENGEAR #SERIES/AV6201 - #Master #OPENGEAR/AV6201-ISS3 - #Gerbers.zip (.TOP .TSM .TSS → assets/av6201-*.png, 120 dpi)
   - Functional/AV6201-card-edge.cdr, AV6201-T6301.cdr, AV6201-T6401.cdr, AV6201-REAR-MODULES.pdf/.cdr (Inkscape → SVG)
   - Photos/AV6201A-Colour.jpg (black solder mask, white silk, blue multi-turn trimmers on extension rods)
   - #OPEN GEAR - #Engineering/…/openGear #Manuals #OBSOLETE/AV6201A Manual.pdf (issue 1, 2009-01-23)
   - #OPEN GEAR - #Engineering/…/OpenGear Frame Address ID.xls (slot ID resistors, via opengear.js)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = why => `<span class="tag-inf" title="Not stated in the source; inferred${why?' from '+String(why).replace(/"/g,'&quot;'):''}">inferred</span>`;
const hx = (n,w) => (n>>>0).toString(16).toUpperCase().padStart(w||2,'0');
const card = (title, body, cls) => `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`;
const deep = o => JSON.parse(JSON.stringify(o));
const SRC = '#OPENGEAR #SERIES/AV6201 - #Master #OPENGEAR/AV6201 - #Engineering/AV6201A/';

/* =====================================================================
   CONSTANTS FROM THE SOURCE
   ===================================================================== */
const XTAL = 8e6;                                  // v100w.c "Crystal: 8.0000Mhz"
const C = {
  WAIT_IT: 7/XTAL,          // wait(): wdr, subi, sbci, cpi, cpc, brne = 7 cycles (v100w.lis) = 0.875 µs
  BOOT_WAITS: 10,           // main(): ten × wait(3000)
  ADC_CONV: 104e-6,         // adc_init(): "Conversion time: 104uS" (ADCSRA = 0xC6, clk/64)
  ADC_N: 100,               // COUNTER_CONSTANT samples averaged before ADDRESS_TABLE
  PASS: 30e-6,              // idle main-loop pass ≈ 216 cycles (lis count) + ≈10 % timer1 ISR load — inferred
  SETUP: 0.0015,            // DATA_SETUP (CRC of 5 messages) + CANinit — inferred
  T0: 1e-3,                 // timer0: clk/64, TCNT0 = 0x83 → 125 counts (comment says "100us")
  T1_FIRST: 12000/125000,   // timer1_init: TCNT1 = 0xD120 → 12 000 counts = 96 ms
  T1: 12/125000,            // reload 0xFFF4 → 12 counts = 96 µs (comments say "96 ms")
  TX_FRAMES: 10, TX_HEART: 10000, TX_INIT_PER_SLOT: 1000,
  ONE_SECOND: 1000, DINIT_CONST: 10, DCOUNT: 3,
  NO_VIDEO: 1000,           // LMH1981.h NO_VIDEO_CONSTANT (passes)
  NO_HSYNCH: 12500,         // LMH1981.h NO_HSYNCH_CONSTANT (loop-2 iterations)
  L2_IT: 27/XTAL,           // one loop-2 iteration with HSOUT high ≈ 27 cycles (LMH1981.lis) — 12 500 × 3.4 µs ≈ 42 ms
  WDT: 0.0163,              // WDTCR = 0x08: 16K cycles of the 1 MHz watchdog oscillator (AVR data sheet, not archived) — inferred
  CAN_BIT: 1e-6,            // CANBT1=0x00 CANBT2=0x04 CANBT3=0x12 at 8 MHz → 1 Mbit/s
  STUFF: 1.1,               // bit-stuffing allowance — inferred
  MFC_GAP: 0.0006,          // gap between frame-controller requests — inferred
  ISR_BUILD: 0.00035,       // can_rx_isr building a descriptor in MESSAGE_CREATOR_* — inferred
  HS_DLY: 0.2e-6,           // LMH1981 HSOUT delay after the sync edge — inferred
  POLL: 2.0,                // DashBoard auto-poll period when ticked — inferred
};
const fdur = n => (67 + 8*n) * C.CAN_BIT * C.STUFF;          // 29-bit-ID frame with n data bytes
const nFrames = len => len<=8? 1 : Math.ceil((len+4)/8);      // single frame up to 8 bytes, else multi-frame with a 4-byte length/CRC header — inferred

/* ---------- video standards (SMPTE 170M / ITU-R BT.470 practice; not in the archive except the line codes) ---------- */
const STD = {
  NTSC:{name:'NTSC 525/59.94', H:1/15734.2657, hl:1050, N:6, sync:-286, white:714, setup:53.6, fsc:3579545.45, burst:143, burstCyc:9, burstAt:5.3e-6,
        act0:10.9e-6, fp:1.5e-6, eq:2.3e-6, sw:4.7e-6, ser:4.7e-6, vbl:20, mains:60, codes:[260,259], fmt:1},
  PAL: {name:'PAL 625/50', H:64e-6, hl:1250, N:5, sync:-300, white:700, setup:0, fsc:4433618.75, burst:150, burstCyc:10, burstAt:5.6e-6,
        act0:10.5e-6, fp:1.65e-6, eq:2.35e-6, sw:4.7e-6, ser:4.7e-6, vbl:25, mains:50, codes:[310,309], fmt:2},
};
const PH = 0.00471;                     // where field 1 starts relative to t = 0 — inferred (any phase works)
const FMT = ['NO_LOCK','NTSC480','PAL576','PRO480','PRO576','PRO720','INT1080','PRO1080'];
/* LMH1981.c video_format table (values confirmed in LMH1981.lis: cpi 4/ldi 1 = 0x0104 = 260 …) */
const CODES = {260:[1,'NTSC 480i field 1'],259:[1,'NTSC 480i field 2'],310:[2,'PAL 576i field 1'],309:[2,'PAL 576i field 2'],
  522:[3,'480p'],622:[4,'576p'],747:[5,'720p'],560:[6,'1080i field 1'],559:[6,'1080i field 2'],1122:[7,'1080p']};
/* DashBoard descriptors (Dashboard.c MESSAGE_CREATOR_PARAMETER_21/22/40). ALARM_TABLE "alarm encoded as a bit field":
   each entry = (bit number << 8) | severity, the same layout the D6203A uses. Severity 0/1/2 = ok/warn/error — inferred. */
const T21 = [[0x0000,'Locked'],[0x0102,'No Video Detected'],[0x0202,'No Video Detected']];
const T22 = [[0x0002,'Not Available'],[0x0100,'NTSC'],[0x0200,'PAL'],[0x0300,'480p'],[0x0400,'576p'],[0x0500,'720p'],[0x0600,'1080i'],[0x0700,'1080p']];
const alarmDecode = (tab, v) => { if (v==null) return {txt:'—', sev:-1}; const hits=tab.filter(([e])=>(v>>(e>>8))&1);
  if (!hits.length) return {txt:`(no bit set: 0x${hx(v,4)})`, sev:-1}; const sev=Math.max(...hits.map(h=>h[0]&0xFF)); return {txt:[...new Set(hits.map(h=>h[1]))].join(' / '), sev}; };
const BRANDS = {
  COBALT:   {def:'COBALT',    product:'9231',    supplier:'Cobalt Digital',    oids:[0x0201,0x0400,0x0202,0x0105,0x0102,0x010B,0x0106], cfg:'cobalt_ztcpack.txt → bin/9231_v1_01.bin'},
  WARD_BECK:{def:'WARD_BECK', product:'AV6201A', supplier:'Ward-Beck Systems', oids:[0x0201,0x0400,0x0202,0x0105,0x0102,0x010B,0x0106,0x0104], cfg:'wbs_ztcpack.txt → bin/av6201a_v1_01.bin'},
};
const NAME = 'Analog Video Distribution Amplifier', WEB = 'www.ward-beck.com', SWREV = '1.01';   // "1.00" with char 3 = '0'+SOFTWARE_VERSION
const OID = {
  0x0105:{n:'Product', d:'string', desc:'MESSAGE_CREATOR_PRODUCT'}, 0x0106:{n:'Name', d:'string', desc:'MESSAGE_CREATOR_NAME'},
  0x0102:{n:'Supplier', d:'string', desc:'MESSAGE_CREATOR_SUPPLIER'}, 0x010B:{n:'Software Rev', d:'string', desc:'MESSAGE_CREATOR_SOFTWARE_REVISION'},
  0x0104:{n:'Website', d:'string', desc:'MESSAGE_CREATOR_WEBSITE'}, 0x0107:{n:'(1.7 board rev)', d:'—', desc:'branch commented out → CANRESP_UNSUPPORTED'},
  0x0201:{n:'Card Status', d:'alarm', desc:'MESSAGE_CREATOR_PARAMETER_21 (ALARM_TABLE, 3 entries)'},
  0x0202:{n:'Video Status', d:'alarm', desc:'MESSAGE_CREATOR_PARAMETER_22 (ALARM_TABLE, 8 entries)'},
  0x0400:{n:'Notify on Card Fault', d:'choice', desc:'MESSAGE_CREATOR_PARAMETER_40 (CHOICE, RADIO_HORIZONTAL)'},
};
const oidTxt = o => ((o>>8)&0xFF)+'.'+(o&0xFF);
const descLen = o => ({0x0201:68,0x0202:112,0x0400:52,0x0105:21,0x0106:18,0x0102:22,0x010B:26,0x0104:21})[o]||20;   // from the MESSAGE_CREATOR string lengths
const MSG = {0x10:'REPORT_PARAM',0x11:'TRAP',0x43:'REBOOT',0x45:'GET_NUMPARAMS',0x46:'GET_PARAM_OIDS',0x47:'GET_DESCRIPTOR',0x49:'GET_PARAM',0x4A:'SET_PARAM',0x50:'GET_MENUSET_NAME',0x51:'GET_MENU_COUNT',0x52:'GET_MENU_NAME',0x53:'GET_MENU_OIDS'};
const msgName = t => (t&0x80)? (MSG[t&0x7F]||'0x'+hx(t&0x7F))+' resp' : (MSG[t]||'0x'+hx(t));

/* slot ID: OpenGear Frame Address ID.xls ladder (as in opengear.js) and ADC.c ADDRESS_TABLE (non-MF6220 branch) */
const SLOT_R = [100000,30900,15000,9760,6980,5360,4320,3570,3010,2550,2210,1910,1650,1470,1270,1130,1000,887,787,681];
const slotAdc = s => Math.min(1023, Math.round(1024*SLOT_R[s-1]/(SLOT_R[s-1]+1000)));
const ADDR_TH = [1011,980,948,915,883,851,820,788,755,725,692,658,629,593,563,532,502,471,435,406];
function ADDRESS_TABLE(v){ if (v>1023) return 21; for (let i=0;i<20;i++) if (v>ADDR_TH[i]) return i+1; return 21; }

/* rear modules: AV6201-REAR-MODULES.pdf and the manual Fig. 2; P1 pins from AV6201-iss3.net */
const OUTPIN = [['BNC3',75,'U5A','R37'],['BNC4',80,'U5A','R38'],['BNC5',37,'U5B','R39'],['BNC6',34,'U5B','R40'],['BNC7',17,'U6A','R46'],['BNC8',22,'U6A','R47'],['BNC9',5,'U6B','R48'],['BNC10',12,'U6B','R49']];
const REARS = {
  T6201:{name:'T6201', sub:'single card · DFR-8310 (10-slot frame only)', frame:'DFR-8310', dual:false, span:1},
  T6301:{name:'T6301', sub:'single card · DFR-8320 · occupies 2 slots', frame:'DFR-8320', dual:false, span:2},
  T6401:{name:'T6401', sub:'double card · DFR-8320 · 2 cards share it', frame:'DFR-8320', dual:true, span:1},
};
function rearPos(rear){   // [label, role, outIndex|null, P1 pin]
  if (REARS[rear].dual) return [['IN (AV6201-2)','other'],['IN','in',null,97],['OUT1 (AV6201-2)','other'],['OUT1','out',0,75],['OUT2 (AV6201-2)','other'],['OUT2','out',1,80],['OUT3 (AV6201-2)','other'],['OUT3','out',2,37],['OUT4 (AV6201-2)','other'],['OUT4','out',3,34]];
  return [['IN','in',null,97],['N/C','nc',null,92],...OUTPIN.map((o,i)=>['OUT'+(i+1),'out',i,o[1]])];
}

/* =====================================================================
   ANALOG PATH (every value from AV6201-iss3.net / .bom)
   ===================================================================== */
const R12=47.5, R13=180, POT=2000;
/* U4A / U4B are identical shunt-peaking equalisers: −in to GND via Rg, feedback Rf, and a wiper network
   Rs → pot → (Rb to GND, Rw to GND, Rn+Cn, C, CV trimmer). Stage A: EQ pot; stage B: RV1 (factory). */
const EQA = {Rs:100, Rg:3570, Rf:1100, Rb:30, Rw:3320, Rn:2400, Cn:220e-12, C:220e-12, Cv:10e-12, ref:'R20 R22 R23 R16 R21 R19 C14 C11 CV1, EQ pot 2K'};
const EQB = {Rs:100, Rg:3570, Rf:1100, Rb:30, Rw:3320, Rn:2400, Cn:220e-12, C:220e-12, Cv:10e-12, ref:'R33 R29 R30 R41 R51 R50 C32 C30 CV2, RV1 2K'};
function eqGain(f, p, P){            // |1 + Rf/Zsh| at frequency f, wiper position p (0 = ccw, 1 = CW)
  const w=2*Math.PI*Math.max(f,1e-3);
  const par=(...zs)=>{ let re=0, im=0; zs.forEach(([a,b])=>{ const d=a*a+b*b; re+=a/d; im+=-b/d; }); const d=re*re+im*im; return [re/d, -im/d]; };
  const cap = c => [0, -1/(w*c)];
  const Zw = par([POT*p+P.Rb,0],[P.Rw,0],[P.Rn, -1/(w*P.Cn)], cap(P.C), cap(P.Cv));
  const Zs = par([P.Rg,0],[P.Rs+POT*(1-p)+Zw[0], Zw[1]]);
  const d=Zs[0]*Zs[0]+Zs[1]*Zs[1], gr=1+P.Rf*Zs[0]/d, gi=-P.Rf*Zs[1]/d; return Math.hypot(gr,gi);
}
const EQ_MAX_BOOST = 20*Math.log10(eqGain(3579545,1,EQA)/eqGain(0,1,EQA));
const LOSS = EQ_MAX_BOOST/3;     // dB per 100 m at 3.58 MHz chosen so full EQ = 300 m (manual "EQ (0–300m)") — inferred calibration
const cableDb = (len, f) => LOSS*len/100*Math.sqrt(f/3579545);
const lvlK = q => (R13 + POT*q)/(R12 + POT + R13);           // LVL divider: R12 47R5, 2K multi-turn, R13 180R
const CMRR = 40;                                             // U1 two-amp differential receiver, 1 % resistors — inferred
const CLIP = 3.8;                                            // EL2244/ISL55002 output swing on ±5 V — inferred
function lvlNominal(eqm){ const k=1/eqGain(0,eqm/300,EQA); return (k*(R12+POT+R13)-R13)/POT; }
const chainCache = new WeakMap();
function chain(w){ let r=chainCache.get(w); if (!r){ r=chain0(w); chainCache.set(w,r); } return r; }
function chain0(w){
  const s=STD[w.src.std], on=w.src.on && w.card;
  const loads=(w.term==='75'?1:0)+(w.src.looped?1:0);
  const tf = loads===0? 2 : 2*(75/loads)/(75+75/loads);           // 75 Ω source, EMF = 2 × nominal
  const lossC = Math.pow(10,-cableDb(w.src.len,s.fsc)/20);
  const p=w.eq/300, k=lvlK(w.lvl);
  const A0=eqGain(0,p,EQA), Ac=eqGain(s.fsc,p,EQA);
  const contention = w.h3==='IN' && w.r15;                           // R15 0R ties H3-2 to U4A out
  const useB = w.h3==='IN' && !w.r15;
  const B0 = useB? 0.5*eqGain(0,w.rv1,EQB) : 1, Bc = useB? 0.5*eqGain(s.fsc,w.rv1,EQB) : 1;
  const G0 = 2*k*A0*B0*0.5*2*0.5, Gc = 2*k*Ac*Bc*0.5*2*0.5;        // U1 ×2 · LVL · U4 · pad R36/R42 ÷2 · U5/U6 ×2 · back-match ÷2
  const humDiff = w.src.hum * (w.bal? Math.pow(10,-CMRR/20) : 1);   // BAL: shield floats on R6 (differential); H1 fitted: shield grounded
  const syncAtU2 = Math.abs(s.sync)*tf*2/1000;                       // V at VIDEO_IN (U1 gain 2) → LMH1981 via C4
  const detect = on && syncAtU2 > 0.1;                               // LMH1981 sync threshold — inferred
  const clampOK = w.clamp && detect;
  const humOut = w.clamp? (detect? humDiff*G0*2*Math.PI*s.mains*s.H : humDiff*G0) : humDiff*G0;   // keyed clamp leaves only the in-line tilt
  const whiteIn = s.white*tf, syncIn = s.sync*tf;
  const u1Peak = 2*(Math.max(Math.abs(whiteIn+s.burst*tf), Math.abs(syncIn)) + humDiff)/1000;
  const outPk = (Math.max(Math.abs(s.white*tf*G0) , Math.abs(s.sync*tf*G0)) + humOut)/1000;
  return {s, on, loads, tf, lossC, k, p, A0, Ac, B0, Bc, G0, Gc, chromaG: Gc*lossC, contention, useB, humDiff, humOut, detect, clampOK, u1Peak, u1Clip:u1Peak>CLIP, ampClip: 2*outPk>CLIP,
    outPP: on? (s.white - s.sync)*tf*G0/1000 : 0};
}

/* =====================================================================
   VIDEO TIMING AND WAVEFORMS (half-line grid; field 2 starts mid-line)
   ===================================================================== */
function vt(s, t){
  const H2=s.H/2, x=(t-PH)/H2, abs=Math.floor(x), uh=(x-abs)*H2;
  const hl=((abs%s.hl)+s.hl)%s.hl, half=s.hl/2, field=hl<half?0:1, k=field? hl-half : hl;
  const lineStart = (hl%2)===0, u = (lineStart?0:H2)+uh;
  const line = Math.floor(hl/2)+1;
  const fieldNo = Math.floor(abs/half);        // running field count since t = PH
  return {hl, k, field, uh, u, line, fieldNo, lineStart, tFieldStart: t - (k*H2+uh)};
}
const BARS_Y = [1,.886,.701,.587,.413,.299,.114,0].map(v=>v*0.75), BARS_C=[0,.336,.474,.443,.443,.474,.336,0].map(v=>v*0.75), BARS_PH=[0,167,283,241,61,103,347,0];
function comp(s, pat, t){                       // composite at the source, mV: {l: luma incl. sync, c: chroma incl. burst}
  const v=vt(s,t), N=s.N, H2=s.H/2;
  if (v.k<N || (v.k>=2*N && v.k<3*N)) return {l: v.uh<s.eq? s.sync:0, c:0, v};
  if (v.k<2*N) return {l: v.uh<H2-s.ser? s.sync:0, c:0, v};
  const u=v.u; if (u<s.sw) return {l:s.sync, c:0, v};
  let l=0, c=0;
  if (v.k>=3*N+6 && u>=s.burstAt && u<s.burstAt+s.burstCyc/s.fsc) c = s.burst*Math.sin(2*Math.PI*s.fsc*t+Math.PI);
  if (v.k>=2*s.vbl && u>=s.act0 && u<s.H-s.fp){
    const blk=s.setup;
    if (pat==='bars'){ const i=Math.min(7,Math.floor((u-s.act0)/(s.H-s.fp-s.act0)*8)); l=blk+BARS_Y[i]*(s.white-blk); c+=BARS_C[i]*s.white*Math.sin(2*Math.PI*s.fsc*t+BARS_PH[i]*Math.PI/180); }
    else if (pat==='black') l=blk;
    else { const r=(u-s.act0)/(s.H-s.fp-s.act0); l=blk+Math.floor(r*6)/5*(s.white-blk); }   // 5-step staircase
  }
  return {l, c, v};
}
function vsWin(s, t){ const v=vt(s,t), st=v.tFieldStart+s.N*s.H/2; return {st, en:st+3*s.H+1e-6, v}; }   // VSOUT low ≈ 3 lines from the broad pulses — inferred
function srcOn(w){ return w.card && w.src.on && chain(w).detect; }
function vsLow(w,t){ if (!srcOn(w)) return false; const s=STD[w.src.std], z=vsWin(s,t); return t>=z.st && t<z.en; }
function hsLow(w,t){ if (!srcOn(w)) return false; const s=STD[w.src.std], u=((t-PH-C.HS_DLY)%s.H+s.H)%s.H; return u<s.sw; }
function bpOn(w,t){ if (!srcOn(w)) return false; const s=STD[w.src.std], u=((t-PH)%s.H+s.H)%s.H; return u>=5.6e-6 && u<8.6e-6; }      // BPOUT back-porch gate — inferred
function oeOut(w,t){ if (!srcOn(w)) return false; return vt(STD[w.src.std],t).field===0; }
function hum(w,t){ const s=STD[w.src.std]; return Math.sin(2*Math.PI*s.mains*t); }
function inAt(w,t){ if (!(w.src.on)) return 0; const s=STD[w.src.std], ch=chain(w), x=comp(s,w.src.pat,t); return ch.tf*(x.l + x.c*ch.lossC) + w.src.hum*hum(w,t); }   // centre conductor vs card ground: the hum is on both centre and shield
function outAt(w,t,ix){
  const ch=chain(w); if (!ch.on) return 0; const s=ch.s, x=comp(s,w.src.pat,t);
  let v = ch.tf*(x.l*ch.G0 + x.c*ch.lossC*ch.Gc) + ch.humOut*hum(w,t);
  if (ch.contention) v = v*0.55 + 40*Math.sin(2*Math.PI*1.7e6*t);       // two op-amp outputs fighting through R15 — inferred
  if (w.clamp && !ch.clampOK) v += 120;                                     // clamp not keyed: GB4571 drifts — inferred
  const load = w.outLoad[ix||0]? 1 : 2;  v*=load;
  return Math.max(-CLIP*500*load/1, Math.min(CLIP*500*load, v));
}

/* =====================================================================
   WORLD + FIRMWARE STATE
   ===================================================================== */
function mkWorld(){
  const w = { card:true, frame:'DFR-8320', slot:4, rear:'T6301', brand:'COBALT',
    src:{on:true, std:'NTSC', pat:'bars', len:30, hum:0, looped:false},
    term:'75', bal:true, clamp:true, h3:'OUT', r15:true, eq:30, lvl:0.5, rv1:0.5, outLoad:[true,true,true,true,true,true,true,true],
    mfc:true, poll:false };
  w.lvl = Math.round(lvlNominal(w.eq)*1000)/1000; return w;
}
function mkFw(w){ return { mode:'run', modeEnd:Infinity, hs:1, phs:1, format:STD[w.src.std].fmt, vf:STD[w.src.std].codes[0], vdc:0,
  pr:0, pc:0, ssc:0, ptc:1, restart:1, restore:0, smpte:0, dinit:0, dcount:3, canrx:0, txc:3700, int0:420,
  t1next:0.000037, t0next:0.00041, fc:0, resp:null, txBusy:0, reboot:0, upgrade:0, slotAddr:w.slot, adcAvg:slotAdc(w.slot), stall:0 }; }
function mkDash(w){ const B=BRANDS[w.brand]; return {seen:true, desc:true, c:{0x0201:1, 0x0202:1<<STD[w.src.std].fmt, 0x0400:0, 0x0105:B.product, 0x0106:NAME, 0x0102:B.supplier, 0x010B:SWREV, 0x0104:WEB}, src:{}}; }
const D = { s0:null, events:[], ver:0, R:null, Rver:-1, log:[], second:1, ui:{dashTab:'status', follow:true, labels:true}, tut:0 };
function resetAll(){ const w=mkWorld(); D.s0={w, f:mkFw(w), dash:mkDash(w)}; D.events=[]; D.log=[]; D.second=1; D.ver++; }
resetAll();

/* =====================================================================
   THE ONE-SECOND SIMULATION (pass by pass, tick by tick)
   ===================================================================== */
function simulate(){
  let w=deep(D.s0.w); const f=deep(D.s0.f), dash=deep(D.s0.dash);   // w is replaced (never mutated in place) so chain() can cache per object
  const ev=D.events.slice().sort((a,b)=>a.t-b.t); let ei=0;
  const R={snaps:[], busy:[], idle:[], isr:[], can:[], dashUpd:[], adc:[], tcs:[], resets:[], losses:[], ticks0:[], segs:[], passes:0, worlds:[{t:0,w:deep(w)}], notes:[], mfcLog:[]};
  let last='';
  const leds = () => f.mode==='run'? (f.hs?1:2) : (f.mode==='boot'||f.mode==='adc')? 2 : 0;     // bit0 SYNCH (PB1), bit1 NO SYNCH (PB2)
  const snap = t => { const key=[f.mode,f.hs,f.format,f.pc,f.ssc,f.dinit,f.smpte,f.restart,f.restore,f.fc,f.dcount,leds(),f.vf].join(',');
    if (key!==last){ last=key; R.snaps.push({t, mode:f.mode, hs:f.hs, format:f.format, leds:leds(), pc:f.pc, ssc:f.ssc, pr:f.pr, dinit:f.dinit, dcount:f.dcount, smpte:f.smpte, restart:f.restart, restore:f.restore, fc:f.fc, vf:f.vf, slotAddr:f.slotAddr, adcAvg:f.adcAvg}); } };
  const mfcQ=[]; let mfcNext=0, mfcWait=null;
  const dashSet=(t,oid,v,how)=>{ if (!w.mfc) return; dash.c[oid]=v; dash.src[oid]=how; R.dashUpd.push({t,oid,v,how}); };
  const frame=(t,dir,type,n,label,extra)=>{ const d=fdur(n); R.can.push(Object.assign({t,dur:d,dir,type,label},extra||{})); return t+d; };
  const v21b = () => (f.format===0 && f.smpte)? 0x0002 : 0x0000;   // CAN_TX_TIMER SIGNAL_STATUS: BIT1 or 0 ("LOCKED")
  const v21g = () => (f.format===0 && f.smpte)? 0x0004 : 0x0001;   // GET_PARAM 2.1: BIT2 or BIT0
  const v22  = () => f.format? (1<<f.format) : 0x0001;
  const strOf = o => ({0x0105:BRANDS[w.brand].product, 0x0106:NAME, 0x0102:BRANDS[w.brand].supplier, 0x010B:SWREV, 0x0104:WEB})[o];
  function canInit(t){ f.t1next=t+C.T1_FIRST; f.t0next=t+C.T0; f.txc=0; f.int0=0; R.tcs.push(t); }
  function startBoot(t, why){
    f.mode='boot'; f.modeEnd=t+C.BOOT_WAITS*3000*C.WAIT_IT; f.hs=0; f.phs=0; f.format=0; f.vdc=0; f.pr=0; f.pc=0; f.ssc=1; f.ptc=1; f.restart=0; f.restore=0; f.smpte=0;
    f.dinit=1; f.dcount=0; f.canrx=0; f.fc=0; f.resp=null; f.txBusy=0; f.reboot=0; f.upgrade=0; f.t1next=Infinity; f.t0next=Infinity; f.stall=0; f.bootAt=t;
    R.segs.push({t0:t, t1:f.modeEnd, kind:'boot', label:'initialization() · DATA_INITIALIZATION (ERROR LED on) · CAN_RX loop-back · 10 × wait(3000)'});
    if (why) R.notes.push({t, txt:why});
  }
  function canTxTimer(t){
    if (t < f.txBusy) return;                                     // completed_CAN_tx == NO → time_elasped = 0
    if (f.fc===0 && !f.restart){ f.restart=1; f.txBusy=frame(t,'tx',0x11,1,'TRAP CANTRAP_RESTART (flags 3)'); return; }
    if (f.fc===0 && !f.restore){
      const vid = f.pr===1, oid = vid?0x0202:0x0201, val = vid? v22() : v21b();
      f.txBusy=frame(t,'tx',0x10,6,`REPORT_PARAM ${oidTxt(oid)} = 0x${hx(val,4)} (${vid?'VIDEO_DETECTION':'SIGNAL_STATUS'})`,{oid,val});
      dashSet(f.txBusy, oid, val, 'REPORT_PARAM'); f.ptc=1; f.pc=0; return;
    }
    if (f.fc!==0 && f.resp){ const r=f.resp; r.sent++; f.fc--; f.txBusy=frame(t,'tx',r.type|0x80,8,`${msgName(r.type|0x80)} frame ${r.sent}/${r.frames}${r.oid!=null?' · '+oidTxt(r.oid):''}`);
      if (f.fc===0) finishResp(f.txBusy, r); }
  }
  function finishResp(t, r){ f.resp=null; if (r.after) r.after(t); mfcWait=null; mfcNext=t+C.MFC_GAP; }
  function t1Tick(t){
    if (f.fc!==0){ canTxTimer(t); if (f.fc!==0){ if (f.txc>C.TX_FRAMES){ canTxTimer(t); f.txc=0; } else f.txc++; } }
    else if (f.dinit){ if (f.txc>C.TX_INIT_PER_SLOT*f.slotAddr){ canTxTimer(t); f.txc=0; } else f.txc++; }
    else { if (f.txc>C.TX_HEART){ canTxTimer(t); f.txc=0; } else f.txc++; }
  }
  function t0Tick(t){
    if (f.int0===C.ONE_SECOND){ R.ticks0.push({t, rx:f.canrx, dinit0:f.dinit});
      if (f.canrx<C.DINIT_CONST){ f.dcount++; if (f.dcount>=C.DCOUNT) f.dinit=0; } else { f.dinit=1; f.dcount=0; }
      f.int0=0; f.canrx=0; }
    else f.int0++;
  }
  /* DASHBOARD_RESPONSE_SETUP: what the card answers */
  function respond(t, q){
    const B=BRANDS[w.brand]; let len=6, type=q.type, oid=q.oid, after=null, label='';
    switch(q.type){
      case 0x45: len=3; label=`numparams = ${B.oids.length} (*(ParamOIDS_Message+3))`; after=tt=>{ dash.np=B.oids.length; }; break;
      case 0x46: len=4+2*B.oids.length; label=`ParamOIDS_Message (${B.oids.length} OIDs)`; after=tt=>{ dash.oids=B.oids.slice(); }; break;
      case 0x47: len=descLen(oid); label=`descriptor ${oidTxt(oid)} (${OID[oid]?OID[oid].desc:'?'})`; f.stall=Math.max(f.stall, t+C.ISR_BUILD); R.isr.push({t0:t,t1:t+C.ISR_BUILD,label:'can_rx_isr → '+(OID[oid]?OID[oid].desc:'MESSAGE_CREATOR')}); after=tt=>{ dash.desc=true; }; break;
      case 0x49:
        if (oid===0x0201){ const v=v21g(); label=`2.1 = 0x${hx(v,4)}`; after=tt=>dashSet(tt,oid,v,'GET_PARAM'); }
        else if (oid===0x0202){ const v=v22(); label=`2.2 = 0x${hx(v,4)} (1 << format)`; after=tt=>dashSet(tt,oid,v,'GET_PARAM'); }
        else if (oid===0x0400){ const v=f.smpte; label=`4.0 = ${v}`; after=tt=>dashSet(tt,oid,v,'GET_PARAM'); }
        else if (strOf(oid)!=null){ const sv=strOf(oid); len=5+sv.length; label=`${oidTxt(oid)} = "${sv}"`; f.stall=Math.max(f.stall,t+C.ISR_BUILD/3); after=tt=>dashSet(tt,oid,sv,'GET_PARAM'); }
        else { len=1; label='CANRESP_UNSUPPORTED'; after=tt=>dashSet(tt,oid,null,'unsupported'); }
        break;
      case 0x4A:
        if (oid===0x0400){ f.smpte=q.v; label=`4.0 ← ${q.v}: smpte_alarm_enabled = ${q.v} (not saved: SAVE_INFORMATION_EEPROM is commented out)`; after=tt=>dashSet(tt,oid,q.v,'SET_PARAM'); }
        else if (oid===0xFF07){ f.restore=q.v; label=`FF.07 ← ${q.v}: restore_start = ${q.v}`; }
        else if (oid===0xFF08){ f.restore=(~q.v)&1; label=`FF.08 ← ${q.v}: restore_start = (INVERT_DATA(${q.v})) & BIT0 = ${f.restore}`; }
        else { len=1; label='CANRESP_UNSUPPORTED'; }
        break;
      case 0x43: f.reboot=1; len=1; label='reboot_device = YES'; break;
      default: len=1; label='CANRESP_UNSUPPORTED';
    }
    return {type, oid, frames:nFrames(len), sent:0, label, after};
  }
  function mfcStep(t){
    if (!mfcQ.length || t<mfcNext) return;
    if (mfcWait){ if (t>mfcWait.until){ R.mfcLog.push({t, txt:'no reply: '+mfcWait.q.txt}); mfcWait=null; mfcNext=t+C.MFC_GAP; } return; }
    const q=mfcQ.shift(); const te=frame(t,'rx',q.type, q.type===0x4A?6:3, q.txt, {oid:q.oid});
    if (f.mode!=='run' || !w.card){ mfcWait={q, until:t+0.05}; return; }
    f.canrx++;
    const r=respond(te,q); r.sent=1;
    f.txBusy=frame(te,'tx',r.type|0x80,r.frames>1?8:Math.min(8,6),`${msgName(r.type|0x80)} ${r.frames>1?'frame 1/'+r.frames+' · ':''}${r.label}`,{oid:q.oid});
    if (r.frames>1){ f.fc=r.frames-1; f.resp=r; mfcWait={q, until:Infinity}; }
    else { finishResp(f.txBusy, r); }
  }
  function timersTo(t){
    let guard=0;
    while (guard++<200000){
      const a=f.t1next, b=f.t0next, nt=Math.min(a,b);
      if (nt>t) break;
      if (a<=b){ t1Tick(a); f.t1next+=C.T1; } else { t0Tick(b); f.t0next+=C.T0; }
      mfcStep(nt);
    }
    mfcStep(t);
  }
  function paramUpdate(){
    if (f.hs!==f.phs && f.pc!==1){ f.pr=1; f.pc=1; f.ssc=1; f.phs=f.hs; }
    else if (f.ssc===1){ f.pr=0; f.pc=1; f.ssc=0; }
    else if (f.pc===0 && f.ptc===1){ f.pr = f.pr>=1? 0 : f.pr+1; }
  }
  function detectBlock(t){        // LMH1981_VIDEO_DETECT with VSOUT low at entry
    const s=STD[w.src.std], H=s.H, z=vsWin(s,t);
    const firstEdge = tt => { const n=Math.ceil((tt-PH-C.HS_DLY)/H); return PH+C.HS_DLY+n*H; };
    let e=firstEdge(t+1e-9), cnt=0, x=t;
    while (e<z.en && cnt<3){ cnt++; x=e; if (cnt<3) e+=H; }
    let aligned = cnt===3; if (!aligned) x=z.en;
    // loop 2: hsynch_state = LOW; samples FSOUT on each HSOUT rising edge
    const rise0 = (firstEdge(x+1e-9)-H)+s.sw;          // rising edge of the line x is in
    const r = aligned? x+s.sw : (hsLow(w,x)? rise0 : x);   // misaligned: hsynch_state starts LOW, so a high HSOUT counts at once
    const code = s.codes[z.v.field], samples=[];
    let vf=0;
    for (let j=0;j<11;j++){ const tt=r+j*H, bitIx = aligned? j : j-1; const bit = (bitIx>=0 && bitIx<11)? (code>>(10-bitIx))&1 : 0; vf=((vf<<1)|bit)&0xFFFF; samples.push({t:tt, bit}); }
    return {t0:t, t1:r+10*H+0.5e-6, l1:x, code:vf, want:code, aligned, field:z.v.field, samples, fieldNo:z.v.fieldNo};
  }
  let t=0, nextPoll=0.37; snap(0);
  if (f.mode==='run' && !w.card) { f.mode='off'; }
  let guard=0;
  while (t<1 && guard++<200000){
    while (ei<ev.length && ev[ei].t<=t+1e-12){
      const e=ev[ei++];
      if (e.w){ w=deep(w); e.w(w); }
      R.worlds.push({t:e.t, w});
      if (e.kind==='pull'){ f.mode='off'; f.modeEnd=Infinity; f.t1next=f.t0next=Infinity; R.segs.push({t0:t,t1:1,kind:'off',label:'card out of the frame'}); }
      if (e.kind==='insert'){ R.segs.forEach(g=>{ if (g.kind==='off' && g.t1===1) g.t1=Math.max(g.t0,e.t); }); startBoot(Math.max(t,e.t),'power-on reset: the card starts main()'); }
      if (e.kind==='mfc' && w.mfc) (e.reqs||[]).forEach(q=>mfcQ.push(q));
      if (e.kind==='canerr' && f.mode==='run'){ R.notes.push({t, txt:'CAN error interrupt → MOB_error = YES → CANinit() restarts timer0/timer1'}); canInit(t); }
      snap(t);
    }
    while (nextPoll<=t){ if (w.poll && w.mfc) [0x0201,0x0202].forEach(o=>mfcQ.push({type:0x49,oid:o,txt:'GET_PARAM '+oidTxt(o)+' (poll)'})); nextPoll+=C.POLL; }
    const tNextEv = ei<ev.length? ev[ei].t : 1;
    if (f.mode==='off'){ t=tNextEv; continue; }
    if (f.mode==='wdt'){ if (f.modeEnd<=tNextEv){ t=f.modeEnd; startBoot(t,'watchdog reset (no WDR inside while(1) CLI())'); snap(t); } else t=tNextEv; continue; }
    if (f.mode==='boot'){
      if (f.modeEnd<=tNextEv){ t=f.modeEnd; f.mode='adc'; const step=2*3000*C.WAIT_IT+C.ADC_CONV+20e-6; f.adcStep=step; f.modeEnd=t+C.ADC_N*step;
        const v=w.card? slotAdc(w.slot):1023; for (let i=0;i<C.ADC_N;i++) R.adc.push({t:t+i*step, v});
        R.segs.push({t0:t,t1:f.modeEnd,kind:'adc',label:`slot ID: ${C.ADC_N} × AD_CONVERTER_SETUP (2 × wait(3000) between samples) → ADDRESS_TABLE`}); snap(t); }
      else t=tNextEv; continue;
    }
    if (f.mode==='adc'){
      if (f.modeEnd<=tNextEv){ t=f.modeEnd; f.adcAvg=slotAdc(w.slot); f.slotAddr=ADDRESS_TABLE(f.adcAvg);
        R.segs.push({t0:t,t1:t+C.SETUP,kind:'setup',label:`ADDRESS_TABLE(${f.adcAvg}) = ${f.slotAddr} · moduleAddress · DATA_SETUP · CANinit · CAN_TX`});
        t+=C.SETUP; f.mode='run'; canInit(t); snap(t); }
      else t=tNextEv; continue;
    }
    /* ---- run: one pass of while(1) ---- */
    if (f.reboot){ f.mode='wdt'; f.modeEnd=t+C.WDT; f.t1next=f.t0next=Infinity; R.segs.push({t0:t,t1:f.modeEnd,kind:'wdt',label:'CAN_FUNCTIONS: reboot_device → while(1) CLI(); → watchdog'}); snap(t); continue; }
    timersTo(t);
    if (f.stall>t){ R.idle.push({t0:t,t1:f.stall,stall:true}); timersTo(f.stall); t=f.stall; }
    const pass0=t;
    if (vsLow(w,t)){
      const b=detectBlock(t); R.busy.push(b); timersTo(b.t1); t=b.t1;
      const m=CODES[b.code]; if (m) f.format=m[0];
      f.vf=b.code; f.hs=1; f.vdc=0; R.resets.push(t);
    } else {
      f.vdc++; if (f.vdc===C.NO_VIDEO){ f.hs=0; f.format=0; f.vdc=0; R.losses.push(t); R.resets.push(t); }
      t+=C.PASS; R.passes++;
      const id=R.idle[R.idle.length-1]; if (id && !id.stall && Math.abs(id.t1-pass0)<1e-9) id.t1=t; else R.idle.push({t0:pass0,t1:t});
    }
    paramUpdate();
    snap(t);
  }
  R.end={f, w, dash};
  R.leds0 = leds;
  return R;
}
function sim(){ if (D.Rver!==D.ver || !D.R){ D.R=simulate(); D.Rver=D.ver; } return D.R; }
function snapAt(t){ const s=sim().snaps; let lo=0, hi=s.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if (s[m].t<=t) lo=m; else hi=m-1; } return s[lo]; }
function worldAt(t){ const ws=sim().worlds; let r=ws[0].w; for (const x of ws){ if (x.t<=t) r=x.w; else break; } return r; }
function dashAt(t){ const R=sim(), c=Object.assign({}, D.s0.dash.c), src={}; R.dashUpd.forEach(u=>{ if (u.t<=t){ c[u.oid]=u.v; src[u.oid]=u.how; } }); return {c, src}; }
function busyAt(t){ return sim().busy.find(b=>b.t0<=t && t<b.t1); }
function segAt(t){ return sim().segs.filter(g=>g.t0<=t && t<g.t1).pop(); }
function vdcAt(t){ const R=sim(), r=R.resets.filter(x=>x<=t).pop(); const b=busyAt(t); if (b) return 0; const base = r!=null? r : 0; const busyIn=R.busy.filter(x=>x.t0>=base && x.t1<=t).reduce((a,x)=>a+(x.t1-x.t0),0);
  return Math.min(C.NO_VIDEO-1, Math.max(0, Math.floor((t-base-busyIn)/C.PASS) + (r==null? D.s0.f.vdc:0))); }

/* ---------------- events / actions (each logs the firmware path) ---------------- */
function addEvent(e){ e.t=SIM.t; D.events.push(e); D.ver++; return e; }
function act(name, trace, e){ if (e) addEvent(e); D.log.unshift({t:SIM.t, sec:D.second, name, trace}); if (D.log.length>50) D.log.length=50; D.ver++; SIM.refresh(); }
const W = fn => ({w:fn});
function rollSecond(){ const R=sim(); D.s0={w:deep(R.end.w), f:deep(R.end.f), dash:deep(R.end.dash)};
  const f=D.s0.f; ['t1next','t0next','txBusy','stall','modeEnd'].forEach(k=>{ if (isFinite(f[k])) f[k]=Math.max(0,f[k]-1); });
  if (f.resp){ f.resp=null; f.fc=0; }
  D.events=[]; D.second++; D.ver++; }
const A = {
  src(on){ const w=worldAt(SIM.t); act(on?'Plug video into IN (rear position 1)':'Unplug the IN cable', on? [
      'BNC1_SIG (P1-97) → R4 33R2 → U1 pin 5; shield BNC1_GND → R5 33R2 → U1 pin 3 (differential receiver, gain 2) → VIDEO_IN',
      'VIDEO_IN → C4 → LMH1981 pin 4: HSOUT (PA2), VSOUT (PA3), FSOUT (PA4), BPOUT → GB4571 pin 4',
      'main(): the next pass that finds VSOUT_PIN low runs LMH1981_VIDEO_DETECT to completion → hsynch_detected = YES',
      'REFRESH_LEDS(): SYNCH_LED_ON (PORTB |= BIT1), ERROR_LED_OFF (PORTB &= ~BIT2)',
      'PARAMETER_UPDATE(): hsynch_detected ≠ phsynch_detected → parameter_refresh = VIDEO_DETECTION, then on the next pass SIGNAL_STATUS (the first is overwritten)'] : [
      'LMH1981 outputs stop: VSOUT_PIN never goes low, so LMH1981_VIDEO_DETECT returns at once',
      `each pass video_detect_counter++; at NO_VIDEO_CONSTANT (1000 passes ≈ ${(C.NO_VIDEO*C.PASS*1000).toFixed(0)} ms ${'after the last field'}) status = NO, format = NO_LOCK`,
      'REFRESH_LEDS(): SYNCH off, ERROR (NO SYNCH, red LED2) on',
      'The analog path is not switched by the AVR: outputs simply carry whatever reaches them'], W(x=>{ x.src.on=on; })); },
  std(v){ act('Feed '+STD[v].name, [`LMH1981 now reports ${v==='NTSC'?'260 / 259':'310 / 309'} on FSOUT (lines per field − 3)`, 'LMH1981_VIDEO_DETECT: video_format matches the table → format = '+(v==='NTSC'?'NTSC480 (1)':'PAL576 (2)'), 'hsynch_detected stays YES, so PARAMETER_UPDATE sees no change: the new format only reaches DashBoard on a later REPORT_PARAM or GET_PARAM'], W(x=>{ x.src.std=v; })); },
  term(v){ act('TERM jumper → '+(v==='75'?'75 Ω':'HI-Z'), [v==='75'?'TERM pins 1–2: R2 75R between BNC1_SIG and BNC1_GND':'TERM pins 2–3: both are BNC1_SIG, so R2 is out; only R1 22K1 loads the line', 'No firmware involvement (jumper only).'], W(x=>{ x.term=v; })); },
  bal(v){ act('BAL jumper (H1) → '+(v?'removed: differential':'fitted: shield grounded'), [v?'H1 open: BNC1_GND floats on R6 22K1 (DC) and C2+R3 (RF); U1 subtracts it from the signal':'H1 fitted: GNDD – BNC1_GND, the input becomes single-ended and ground-loop hum adds to the video', 'No firmware involvement.'], W(x=>{ x.bal=v; })); },
  clamp(v){ act('CLAMP jumper (H2) → '+(v?'ON':'OFF'), [v?'H2 2–3: LVL wiper → C52/C53 → GB4571 (U3) → R26 → U4 pin 3; BPOUT keys the clamp every line':'H2 1–2: LVL wiper straight to U4 pin 3 (DC coupled)', 'No firmware involvement.'], W(x=>{ x.clamp=v; })); },
  h3(v){ const w=worldAt(SIM.t); act('EQ jumper (H3) → '+v, [v==='IN'?'H3 selects U4B (the RV1 "fixed" equaliser) after U4A':'H3 selects U4A only', w.r15&&v==='IN'?'R15 0R is fitted (BOM): it already ties H3-2 to U4A out, so U4A and U4B outputs are now shorted together':'R15 position: '+(w.r15?'0R fitted (H3 OUT is redundant)':'empty')], W(x=>{ x.h3=v; })); },
  r15(v){ act('R15 → '+(v?'0R fitted (as in the ISS3 BOM)':'removed'), ['R15 joins NET00042 (H3-2) to NET00013 (U4A out). The P-CAD pick-and-place lists it as "DNI/0R".'], W(x=>{ x.r15=v; })); },
  pot(k, d){ const w=worldAt(SIM.t); const nm={lvl:'LVL (Level) pot',eq:'EQ pot',rv1:'RV1 trimmer'}[k];
    act(`${nm} ${d>0?'+':'−'}`, k==='lvl'? [`2K multi-turn between R12 47R5 (VIDEO_IN) and R13 180R: wiper ratio ${lvlK(Math.max(0,Math.min(1,w.lvl+d))).toFixed(3)}`,'Analog only — the AVR never sees it.'] : k==='eq'? ['EQ pot in U4A’s shunt network: more of the R21/C11/R19-C14/CV1 network reaches −in, so gain rises with frequency','Analog only.'] : ['RV1 does the same in U4B (used only when H3 = IN and R15 is out)'],
      W(x=>{ if (k==='eq') x.eq=Math.max(0,Math.min(300,x.eq+d)); else x[k]=Math.max(0,Math.min(1,Math.round((x[k]+d)*1000)/1000)); })); },
  load(i){ const w=worldAt(SIM.t); act(`OUT${i+1}: ${w.outLoad[i]?'remove':'attach'} the 75 Ω load`, [`${OUTPIN[i][3]} 75R back-match from ${OUTPIN[i][2]} (gain 2): ${w.outLoad[i]?'open circuit → 2 × level':'terminated → 1 × level'}`], W(x=>{ x.outLoad[i]=!x.outLoad[i]; })); },
  srcSet(k,v){ act(`Source: ${k} = ${v}`, ['Changes the feed, not the card.'], W(x=>{ x.src[k]=v; })); },
  pull(){ act('Pull the card out', ['Power is lost: LEDs off, outputs dead, CAN silent.'], {kind:'pull', w:x=>{ x.card=false; }}); },
  insert(){ act('Insert the card (power-on)', ['main(): initialization() → port_init, watchdog_init (WDTCR = 0x08), adc_init (ADCSRA = 0xC6 starts a conversion)',
      'DATA_INITIALIZATION(): ERROR_LED_ON, SYNCH_LED_OFF · CAN_RX (PORTD |= BIT7 → SN65HVD233 LBK loop-back)',
      `10 × wait(3000) = ${(C.BOOT_WAITS*3000*C.WAIT_IT*1000).toFixed(2)} ms`, `100 slot-ID samples, ≈${(2*3000*C.WAIT_IT*1000+0.12).toFixed(2)} ms apart → ADDRESS_TABLE → slot ${worldAt(SIM.t).slot}`,
      'DATA_SETUP (CRC of every message) · CANinit (timer0, timer1: first overflow 96 ms) · CAN_TX (loop-back off) · while(1)'], {kind:'insert', w:x=>{ x.card=true; }}); },
  setSlot(n){ const w=worldAt(SIM.t); if (n===w.slot) return; act(`Move the card to slot ${n}`, [`AN_SLOTID resistor ${SLOT_R[n-1]} Ω → ADC ≈ ${slotAdc(n)} → ADDRESS_TABLE → ${ADDRESS_TABLE(slotAdc(n))}`, 'The card reboots on insertion; TX_INITIALIZE = 1000 × slot_address timer1 ticks between reports while DashBoard is initializing'], {kind:'insert', w:x=>{ x.slot=n; x.card=true; }}); },
  rear(v){ act('Rear module → '+v, ['AN_BMID (PF1) and AN_BMID2 (PF2) carry the module ID resistors, but the firmware never reads them (only ADC0, the slot ID).'], W(x=>{ x.rear=v; x.frame=REARS[v].frame; if (v==='T6201' && x.slot>10) x.slot=10; })); },
  brand(v){ act('Firmware build → '+v, [`common.h #define ${v}: Product "${BRANDS[v].product}", Supplier "${BRANDS[v].supplier}", ${BRANDS[v].oids.length} parameters in ParamOIDS_Message`, `zeuspack ${BRANDS[v].cfg}`, 'Takes effect on the next DashBoard read.'], W(x=>{ x.brand=v; })); },
  mfc(reqs, name, trace){ act(name, trace, {kind:'mfc', reqs}); },
  canErr(){ act('CAN error', ['can_rx_isr: CANGIT error bits → MOB_error stays YES','CAN_FUNCTIONS: MOB_error → CANIE1/2 = 0, CANinit() → timer1 restarts with the 96 ms first period'], {kind:'canerr'}); },
};
const DASH = {
  open(){ const B=BRANDS[worldAt(SIM.t).brand]; const reqs=[{type:0x45,txt:'GET_NUMPARAMS'},{type:0x46,txt:'GET_PARAM_OIDS'}];
    B.oids.forEach(o=>reqs.push({type:0x47,oid:o,txt:'GET_DESCRIPTOR '+oidTxt(o)}));
    B.oids.forEach(o=>reqs.push({type:0x49,oid:o,txt:'GET_PARAM '+oidTxt(o)}));
    A.mfc(reqs, 'DashBoard: open the card (rescan)', ['MFC → card: GET_NUMPARAMS, GET_PARAM_OIDS, then a descriptor and a value for each OID', 'can_rx_isr → CANRX → DASHBOARD_RESPONSE_SETUP builds each reply (MESSAGE_CREATOR_* inside the interrupt) and CANTX sends frame 1', 'Further frames go out from timer1_ovf_isr → CAN_TX_TIMER while frame_count ≠ 0', 'can_data_rx counts every request: ≥ 10 in a second keeps dashboard_initializing = YES']); },
  refresh(){ A.mfc([0x0201,0x0202,0x0400].map(o=>({type:0x49,oid:o,txt:'GET_PARAM '+oidTxt(o)})), 'DashBoard: refresh status', ['GET_PARAM 2.1 → 0x0001 (BIT0 "Locked") or 0x0004 (BIT2) when format = NO_LOCK and smpte_alarm_enabled','GET_PARAM 2.2 → 1 << format','GET_PARAM 4.0 → smpte_alarm_enabled']); },
  notify(v){ A.mfc([{type:0x4A,oid:0x0400,v,txt:'SET_PARAM 4.0 = '+v}], `DashBoard: Notify on Card Fault → ${v?'Enabled':'Disabled'}`, [`DASHBOARD_RESPONSE_SETUP case CANMSG_SET_PARAM, OID 4.0: smpte_alarm_enabled = ${v}`, 'Echo reply with the new value', 'Not written to EEPROM (SAVE_INFORMATION_EEPROM is inside a comment): a reboot forgets it']); },
  reboot(){ A.mfc([{type:0x43,txt:'REBOOT'}], 'DashBoard: Reboot', ['case CANMSG_REBOOT: reboot_device = YES','next pass, CAN_FUNCTIONS(): while(1) CLI(); → no WDR → watchdog reset ≈ 16 ms','main() starts again: ≈ 0.57 s until the first loop pass']); },
  datasafe(){ A.mfc([{type:0x4A,oid:0xFF07,v:1,txt:'SET_PARAM FF.07 = 1'}], 'DataSafe: restore start (FF.07 = 1)', ['restore_start = 1: CAN_TX_TIMER stops sending REPORT_PARAM until FF.08 arrives (V101 “dataSafe capabilities”)']); },
  datasafeEnd(){ A.mfc([{type:0x4A,oid:0xFF08,v:1,txt:'SET_PARAM FF.08 = 1'}], 'DataSafe: restore done (FF.08 = 1)', ['restore_start = (INVERT_DATA(1)) & BIT0 = 0 → reports resume']); },
};

/* =====================================================================
   DRAWINGS
   ===================================================================== */
/* Card: AV6201-ISS3 gerbers rendered at 120 dpi over x 2.45…15.35 in, y 5.55…8.65 in (1548 × 372 px).
   PNP (origin 3095, 6100 mil) → px = ((X+3095)/1000 − 2.45)·120, py = (8.65 − (Y+6100)/1000)·120.
   Through-hole jumpers and pots were placed on the silk outlines. The third-party logo was blanked. */
const PNP = (x,y)=>[((x+3095)/1000-2.45)*120, (8.65-(y+6100)/1000)*120];
const PARTS = {U1:[1374,94,'U1 EL2244 (ISL55002)'],U2:[1251,106,'U2 LMH1981'],U3:[1312,175,'U3 GB4571'],U4:[1296,265,'U4 EL2244'],U5:[1430,165,'U5'],U6:[1430,245,'U6'],U7:[1440,318,'U7 HVD233'],U8:[1025,243,'U8 AT90CAN128'],REG1:[372,240,'LM337'],REG2:[582,240,'LM317'],REG3:[811,262,'LM1117']};
function cardSVG(t, opts){
  opts=opts||{}; const sn=snapAt(t), w=worldAt(t), ch=chain(w), L=sn.leds;
  const jmp=(x,y,vert,pos,key,tip)=>{ const d=vert? [[0,-11],[0,0],[0,11]] : [[-11,0],[0,0],[11,0]]; const a=pos? d[1]:d[0], b=pos? d[2]:d[1];
    return `<g class="av-hot" data-k="${key}" style="cursor:pointer">${d.map(([dx,dy])=>`<circle cx="${x+dx}" cy="${y+dy}" r="3.2" fill="#c9c9bf"/>`).join('')}
      <rect x="${Math.min(x+a[0],x+b[0])-6}" y="${Math.min(y+a[1],y+b[1])-6}" width="${Math.abs(a[0]-b[0])+12}" height="${Math.abs(a[1]-b[1])+12}" rx="3" fill="#1d5fbf" stroke="#0b2c66" opacity=".95"/>
      <rect x="${x-18}" y="${y-18}" width="36" height="36" fill="transparent"><title>${tip} — click to move the jumper</title></rect></g>`; };
  const pot=(x,y,wd,ht,key,val,tip)=>`<g class="av-pot" data-k="${key}" style="cursor:pointer"><rect x="${x-wd/2}" y="${y-ht/2}" width="${wd}" height="${ht}" rx="3" fill="#2a63c4" stroke="#0d2b66"/>
      <circle cx="${x+wd/2-9}" cy="${y}" r="5" fill="#d9d4b8"/><line x1="${x+wd/2-13}" y1="${y}" x2="${x+wd/2-5}" y2="${y}" stroke="#333" stroke-width="2" transform="rotate(${val*900} ${x+wd/2-9} ${y})"/>
      <rect x="${x-wd/2}" y="${y-ht/2}" width="${wd/2}" height="${ht}" fill="transparent" data-d="-1"><title>${tip} — click left half to turn down</title></rect>
      <rect x="${x}" y="${y-ht/2}" width="${wd/2}" height="${ht}" fill="transparent" data-d="1"><title>${tip} — click right half to turn up</title></rect></g>`;
  let s=`<svg viewBox="0 0 1548 372" role="img" aria-label="AV6201 ISS3 card, top side (real gerber artwork)" style="width:100%;display:block;border-radius:6px">
    <defs><filter id="avGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1548" height="372" fill="var(--panel2)"/>
    <path d="M6 7 H1488 L1500 19 V38 H1530 V300 H1500 V316 H1522 V356 H1488 V366 H6 Z" fill="#121514" stroke="#2c312e"/>
    <image href="${ASSET}av6201-copper.png" width="1548" height="372"/>
    <image href="${ASSET}av6201-silk.png" width="1548" height="372" opacity=".93"/>`;
  [[68,102,1,'#5dff5a','LED1 SYNCH (green, PB1 via R62 750R)'],[68,121,2,'#ff4a3d','LED2 NO SYNCH (red, PB2 via R61 750R; ERROR_LED in AV6201A.h)']].forEach(([x,y,b,col,tip])=>{ const on=(L&b)!==0;
    s+=`<g><title>${tip}: ${on?'lit':'off'}</title><rect x="${x-11}" y="${y-6}" width="22" height="12" rx="2" fill="${on?col:'#2b2f2c'}" ${on?'filter="url(#avGlow)"':''}/></g>`; });
  s+= jmp(1451,58,true, w.term==='75', 'term', `TERM: ${w.term==='75'?'75 Ω (lower pair)':'HI-Z (upper pair)'}`)
    + jmp(1465,98,true, !w.bal, 'bal', `BAL (H1): ${w.bal?'parked — shield floats (differential)':'fitted — shield to ground'}`)
    + jmp(1295,209,false, w.clamp, 'clamp', `CLAMP (H2): ${w.clamp?'ON (via GB4571)':'OFF (direct)'}`)
    + jmp(1344,260,true, w.h3==='IN', 'h3', `EQ (H3): ${w.h3} ${inf('which end is IN is read from the silk')}`.replace(/<[^>]+>/g,''))
    + pot(1250,55,92,22,'lvl',w.lvl,`LVL 2K multi-turn: wiper ${(w.lvl*100).toFixed(0)} % → ${(20*Math.log10(Math.max(1e-6,ch.G0))).toFixed(2)} dB overall`)
    + pot(1088,172,100,22,'eq',w.eq/300,`EQ 2K multi-turn: ${w.eq} m`)
    + `<g class="av-pot" data-k="rv1" style="cursor:pointer"><circle cx="1170" cy="213" r="15" fill="#2a63c4" stroke="#0d2b66"/><line x1="1170" y1="213" x2="${1170+12*Math.cos((w.rv1*270-225)*Math.PI/180)}" y2="${213+12*Math.sin((w.rv1*270-225)*Math.PI/180)}" stroke="#fff" stroke-width="3"/>
       <rect x="1153" y="196" width="17" height="34" fill="transparent" data-d="-1"><title>RV1 2K (U4B equaliser) ${(w.rv1*100).toFixed(0)} % — left half −</title></rect><rect x="1170" y="196" width="17" height="34" fill="transparent" data-d="1"><title>RV1 — right half +</title></rect></g>`;
  const [rx,ry]=PNP(10680,452);
  s+=`<g class="av-hot" data-k="r15" style="cursor:pointer"><rect x="${rx-9}" y="${ry-5}" width="18" height="10" fill="${w.r15?'#d8d8d0':'transparent'}" stroke="${w.r15?'#555':'#ffd36a'}" stroke-dasharray="${w.r15?'':'2 2'}"/><rect x="${rx-14}" y="${ry-12}" width="28" height="24" fill="transparent"><title>R15 ${w.r15?'0R fitted':'empty'} — click to ${w.r15?'remove':'fit'}</title></rect></g>`;
  if (opts.labels!==false && D.ui.labels){
    const lab=(x,y,txt)=>`<text x="${x}" y="${y}" font-size="14" font-weight="700" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke">${txt}</text>`;
    Object.values(PARTS).forEach(([x,y,n])=>{ s+=lab(x-25,y-18,n); });
    s+=lab(1490,180,'P1')+lab(1490,345,'P2')+lab(1200,32,'LVL')+lab(1040,150,'EQ')+lab(1420,30,'TERM')+lab(1478,128,'BAL')+lab(1268,232,'CLAMP')+lab(1360,290,'H3')+lab(1140,248,'RV1')+lab(90,92,'SYNCH')+lab(90,140,'NO SYNCH');
  }
  if (!w.card) s+=`<rect width="1548" height="372" fill="var(--panel2)" opacity=".78"/><text x="774" y="200" text-anchor="middle" font-size="40" fill="var(--ink)">card removed from the frame</text>`;
  else if (sn.mode==='boot'||sn.mode==='adc'||sn.mode==='wdt') s+=`<text x="160" y="190" font-size="22" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke">${sn.mode==='wdt'?'watchdog reset pending':'booting — '+(sn.mode==='adc'?'reading the slot ID':'wait(3000) × 10')}</text>`;
  return s+'</svg>';
}
/* Card edge: AV6201-card-edge.cdr (converted with Inkscape): ERROR LED, SYNCH LED, Clamp Switch, Level POT,
   EQ POT, EQ Fixed Switch, ejector "AV6201A". Positions scaled from the drawing (edge 195…565, ejector 567…648). */
/* Card edge: CorelDRAW art AV6201A/Functional/AV6201-card-edge.cdr (2008-05-12) → assets/av6201-edge.svg.
   LED windows, switch buttons and trimmer screws measured on the converted art. */
const ART_SRC = '#OPENGEAR #SERIES/AV6201 - #Master #OPENGEAR/AV6201 - #Engineering/AV6201A/Functional/';
function edgeSVG(t){
  const sn=snapAt(t), L=sn.leds, w=worldAt(t);
  const led=(x,y,on,col,tip)=>`<rect x="${x-2.85}" y="${y-6.3}" width="5.7" height="12.6" rx="1" fill="${on?col:'#2b2f2c'}" stroke="#555" stroke-width=".3" ${on?'filter="url(#avGlow2)"':''}><title>${tip}</title></rect>`;
  const sw=(x,y,key,on,tip)=>`<g class="av-hot" data-k="${key}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="7.3" fill="${on?'#2b5f9e':'transparent'}" opacity=".55"/><text x="${x+13}" y="${y+3}" font-size="8" font-weight="700" fill="${on?'#2b5f9e':'#777'}">${on?'ON':'OFF'}</text><rect x="${x-11}" y="${y-10}" width="34" height="20" fill="transparent"><title>${tip}</title></rect></g>`;
  const pot=(x,y,tip)=>`<circle cx="${x}" cy="${y}" r="6" fill="transparent"><title>${tip}</title></circle>`;
  return `<svg viewBox="0 0 170 220" role="img" aria-label="AV6201A card edge (CorelDRAW art)" style="width:100%;max-width:260px;display:block;border-radius:6px">
    <defs><filter id="avGlow2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <image href="${ASSET}av6201-edge.svg" width="170" height="220"/>
    ${led(127.6,25.1,(L&2)!==0,'#ff4a3d','ERROR LED — drawn on top in the .cdr; on ISS3 it is LED2 (red), below SYNCH')}
    ${led(127.6,46.3,(L&1)!==0,'#5dff5a','SYNCH LED — LED1 green (PB1)')}
    ${sw(135.8,78.6,'clamp',!!w.clamp,`Clamp: ${w.clamp?'ON':'OFF'} — on ISS3 this is jumper H2 on the board, not a switch (click to toggle)`)}
    ${pot(136.4,108.4,'Level: multi-turn trimmer on an extension rod (photo)')}
    ${pot(136.4,172.8,'EQ: multi-turn trimmer on an extension rod (photo)')}
    ${sw(135.8,203.9,'h3',w.h3==='IN',`EQ fixed: ${w.h3} — on ISS3 this is jumper H3 (click to change)`)}</svg>`;
}
/* Rear modules: CorelDRAW art AV6201-REAR-MODULES.cdr (2008-08-07): T6201, T6301, T6401 plates → assets/av6201-rear-<T>.svg.
   BNC centres measured on the converted art. */
const REAR_ART = {
  T6201:{w:195,h:310, c:[[73.6,54.5],[121.9,54.5],[73.6,96.7],[121.9,96.7],[74.1,139.8],[122.5,139.8],[73.6,181.9],[121.9,181.9],[74.0,223.5],[122.4,223.5]], r:16, plate:[40,22,108,245]},
  T6301:{w:195,h:310, c:[[69.9,60.4],[114.9,60.4],[69.9,105.4],[114.9,105.4],[69.9,150.4],[114.9,150.4],[69.9,195.4],[114.9,195.4],[69.9,240.4],[114.9,240.4]], r:14, plate:[46,18,110,252]},
  T6401:{w:195,h:310, c:[[70.9,61.9],[115.9,61.9],[70.9,106.9],[115.9,106.9],[70.9,151.9],[115.9,151.9],[70.9,196.9],[115.9,196.9],[70.9,241.9],[115.9,241.9]], r:14, plate:[47,20,110,252]},
};
function rearSVG(t, opts){
  opts=opts||{};
  const w=worldAt(t), RM=REARS[w.rear], P=rearPos(w.rear), ch=chain(w), ART=REAR_ART[w.rear];
  const vb = opts.compact? ART.plate.join(' ') : `0 0 ${ART.w} ${ART.h}`;
  let s=`<svg viewBox="${vb}" role="img" aria-label="${RM.name} rear module (CorelDRAW art)" style="width:100%;display:block;border-radius:6px">
    <image href="${ASSET}av6201-rear-${w.rear}.svg" width="${ART.w}" height="${ART.h}"/>`;
  P.forEach((p,i)=>{ const [cx,cy]=ART.c[i], r=ART.r; const [lab,role,oi]=p;
    const mine = role==='in'||role==='out', conn = role==='in'? w.src.on : role==='out'? w.outLoad[oi] : false;
    const live = role==='out' && ch.on;
    s+=`<g ${mine?`class="av-jack" data-r="${role}" data-i="${oi==null?'':oi}" style="cursor:pointer"`:''}>
      ${conn?`<circle cx="${cx}" cy="${cy}" r="${r*0.75}" fill="#2b5f9e" opacity=".85"/><rect x="${cx-r*0.28}" y="${cy}" width="${r*0.56}" height="${r*1.1}" fill="#2b5f9e" opacity=".85"/>`:''}
      ${role==='out'?`<circle cx="${cx-r*0.95}" cy="${cy-r*0.95}" r="3" fill="${live?(w.outLoad[oi]?'#2f8f46':'#d9a21b'):'#888'}"/>`:''}
      ${role==='other'||role==='nc'?`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#000" opacity=".13"/>`:''}
      <rect x="${cx-r-2}" y="${cy-r-2}" width="${2*r+4}" height="${2*r+4}" fill="transparent"><title>${i+1} ${lab}${role==='in'?(conn?' — click to unplug the feed':' — click to plug in the feed'):role==='out'?(conn?' — 75 Ω load attached (click to remove)':' — open (click to attach a 75 Ω load)'):role==='nc'?' — not connected (P1-92 BNC2_SIG has no other node)':' — belongs to the other card'}</title></rect></g>`; });
  s+=`</svg>`;
  return s;
}
function rearSrc(){ return `Rear-module art: ${SIM.src(ART_SRC+'AV6201-REAR-MODULES.cdr','AV6201-REAR-MODULES.cdr')} (CorelDRAW, 2008|41) · ${REARS[worldAt(SIM.t).rear].sub}`; }
function frameSVG(t){
  const w=worldAt(t), n=w.frame==='DFR-8310'?10:20, RM=REARS[w.rear], sn=snapAt(t), sw=620/n;
  let s=`<svg viewBox="0 0 640 74" style="width:100%;display:block" role="img" aria-label="openGear frame"><rect width="640" height="74" rx="6" fill="var(--dev)"/>`;
  for (let i=1;i<=n;i++){ const x=10+(i-1)*sw, me=(i===w.slot && w.card), span=RM.span===2? [w.slot-1,w.slot] : [w.slot], isRear=span.includes(i);
    s+=`<g class="av-slot" data-s="${i}" style="cursor:pointer"><rect x="${x}" y="8" width="${sw-4}" height="44" rx="2" fill="${me?'#3a4f40':'#202326'}" stroke="${isRear?'#e3a35a':'#3a3f44'}" stroke-width="${isRear?2:1}"/>
      ${me?`<rect x="${x+sw/2-5}" y="12" width="5" height="36" fill="#141716"/><rect x="${x+sw/2-9}" y="14" width="4" height="4" fill="${sn.leds&1?'#7dff6a':'#2c332c'}"/><rect x="${x+sw/2-9}" y="21" width="4" height="4" fill="${sn.leds&2?'#ff5a4a':'#2c332c'}"/>`:''}
      <text x="${x+(sw-4)/2}" y="64" font-size="9" text-anchor="middle" fill="#9aa0a5">${i}</text><title>Slot ${i}${me?' — AV6201':''}${isRear?' — rear module '+w.rear:''} (click to move the card here)</title></g>`; }
  s+=`<text x="630" y="71" font-size="8" text-anchor="end" fill="#9aa0a5">${w.frame} front view · orange = slots under the ${w.rear}</text></svg>`;
  return s;
}
/* DashBoard-style window — a generic parameter editor, not Ross's design */
const CSS = `<style>
.av-dash{border:1px solid var(--line);border-radius:6px;background:var(--panel2);font:12.5px var(--sans);overflow:hidden}
.av-dtitle{display:flex;justify-content:space-between;padding:5px 8px;background:color-mix(in srgb,var(--accent2) 22%,var(--panel));border-bottom:1px solid var(--line);font-weight:600}
.av-dwrap{display:grid;grid-template-columns:150px minmax(0,1fr);min-height:230px}
.av-tree{border-right:1px solid var(--line);padding:6px;font-size:12px;background:var(--lane)}
.av-tree .sel{background:color-mix(in srgb,var(--accent) 22%,transparent);border-radius:3px}
.av-pane{display:flex;flex-direction:column;min-width:0}
.av-phead{padding:6px 8px;border-bottom:1px solid var(--line)}
.av-ptabs{display:flex;gap:3px;padding:5px 6px 0;flex-wrap:wrap}
.av-ptabs button{font-size:11.5px;padding:3px 7px;border-radius:5px 5px 0 0}
.av-pbody{padding:8px;flex:1;border-top:1px solid var(--line)}
.av-dt{border-collapse:collapse;width:100%}.av-dt td{padding:4px 6px;border-bottom:1px dashed var(--grid);vertical-align:top}
.av-dl{color:var(--ink2);width:38%}
.av-dt input[readonly]{width:100%;background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:2px 5px;color:var(--ink);font:12px var(--mono)}
.av-dot{display:inline-block;width:11px;height:11px;border-radius:50%;vertical-align:-1px;margin-right:4px}
.av-note{margin-top:6px;font-size:11.5px;color:var(--ink2)}
.av-pfoot{display:flex;flex-wrap:wrap;gap:5px;padding:6px;border-top:1px solid var(--line)}
.av-pfoot button{font-size:11.5px;padding:3px 7px}
.av-ctl{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px}
.av-ctl select,.av-ctl button{font-size:12px}
@media (max-width:700px){.av-dwrap{grid-template-columns:1fr}.av-tree{border-right:none;border-bottom:1px solid var(--line)}}
</style>`;
const sevCol = s => s===0? '#2f8f46' : s===1? '#d9a21b' : s===2? '#c0392b' : '#8a8f93';
function dashHTML(t){
  const w=worldAt(t), sn=snapAt(t), dc=dashAt(t), c=dc.c, B=BRANDS[w.brand], tab=D.ui.dashTab;
  const row=(lab,val,oid)=>`<tr><td class="av-dl">${lab}${oid!=null?` <span class="muted mono" style="font-size:10px">${oidTxt(oid)}</span>`:''}</td><td>${val}</td></tr>`;
  const how=o=>dc.src[o]? `<span class="muted small"> · via ${dc.src[o]}</span>`:'';
  let body='';
  if (!w.mfc) body='<div class="av-note">No frame controller: DashBoard cannot see the frame.</div>';
  else if (tab==='status'){
    const a=alarmDecode(T21,c[0x0201]), b=alarmDecode(T22,c[0x0202]);
    body=`<table class="av-dt">${row('Card Status', `<span class="av-dot" style="background:${sevCol(a.sev)}"></span>${a.txt} <span class="muted mono">0x${hx(c[0x0201]??0,4)}</span>${how(0x0201)}`,0x0201)}
      ${row('Video Status', `<span class="av-dot" style="background:${sevCol(b.sev)}"></span>${b.txt} <span class="muted mono">0x${hx(c[0x0202]??0,4)}</span>${how(0x0202)}`,0x0202)}</table>
      <div class="av-note">Menu set “Status” › menu “Card Status” (Menu1OID_Message: 2.1, 2.2). Values are what DashBoard last received on the CAN timeline, decoded with the card’s own ALARM_TABLE descriptors (entry = bit &lt;&lt; 8 | severity ${inf('paramdef.h “alarm encoded as a bit field” and the D6203A tables')}).</div>`;
  } else if (tab==='info'){
    const oids=[0x0105,0x0106,0x0102,0x0107,0x010B,0x0104];
    body=`<table class="av-dt">${oids.map(o=>row(OID[o].n, o===0x0107? '<span class="muted">listed in Menu0OID, card answers UNSUPPORTED</span>' : `<input readonly value="${c[o]!=null?String(c[o]):''}">`, o)).join('')}</table>
      <div class="av-note">Menu “Card Info” = Menu0OID_Message (count byte 6: 1.5 1.6 1.2 1.7 1.11 1.4). This build (${B.def}) lists ${B.oids.length} parameters in ParamOIDS_Message${w.brand==='COBALT'?' — no 1.4 Website':''}.</div>`;
  } else {
    const v=c[0x0400];
    body=`<table class="av-dt">${row('Notify on Card Fault', [[1,'Enabled'],[0,'Disabled']].map(([k,l])=>`<label style="margin-right:10px"><input type="radio" name="avnt" data-nt="${k}" ${v===k?'checked':''}> ${l}</label>`).join(''),0x0400)}</table>
      <div class="av-note">Menu set “Control” has two menus, both named “Card Settings”: the first (Menu2OID_Message) lists 18 OIDs left over from an SDI/Dolby card (5.6, 2.16, 6.1 …); the card answers UNSUPPORTED to all of them. Only the second (Menu4OID: 4.0) is real.</div>`;
  }
  return `<div class="av-dash"><div class="av-dtitle"><span>Parameter editor — frame tree</span><span class="muted">generic DashBoard-style view</span></div>
    <div class="av-dwrap"><div class="av-tree"><div>▾ openGear ${w.frame}</div><div style="padding-left:12px">▸ Frame controller (MFC-8310)</div>
      <div style="padding-left:12px" class="sel">${w.card?'●':'○'} Slot ${w.slot}: ${c[0x0105]||'—'}</div><div style="padding-left:24px" class="muted">Status › Card Info</div><div style="padding-left:24px" class="muted">Status › Card Status</div><div style="padding-left:24px" class="muted">Control › Card Settings ×2</div></div>
    <div class="av-pane"><div class="av-phead">Slot ${w.slot}: <b>${c[0x0105]||'—'}</b> <span class="muted">${c[0x0106]||''}</span> ${sn.mode!=='run'?`<span style="color:var(--warn)">(${sn.mode==='off'?'no card':'not answering: '+sn.mode})</span>`:''}</div>
      <div class="av-ptabs">${[['status','Status › Card Status'],['info','Status › Card Info'],['settings','Control › Card Settings']].map(([k,l])=>`<button data-dt="${k}" class="${tab===k?'on':''}">${l}</button>`).join('')}</div>
      <div class="av-pbody">${body}</div>
      <div class="av-pfoot"><button data-da="open">Open / rescan</button><button data-da="refresh">Refresh</button><button data-da="reboot">Reboot</button><button data-da="ds1">DataSafe FF.07</button><button data-da="ds2">FF.08</button>
        <label class="small"><input type="checkbox" data-da="poll" ${w.poll?'checked':''}> auto-poll ${inf()}</label></div></div></div></div>`;
}
function bindAll(root){
  root.querySelectorAll('.av-hot').forEach(g=>g.onclick=()=>{ const k=g.dataset.k, w=worldAt(SIM.t);
    if (k==='term') A.term(w.term==='75'?'HIZ':'75'); if (k==='bal') A.bal(!w.bal); if (k==='clamp') A.clamp(!w.clamp); if (k==='h3') A.h3(w.h3==='IN'?'OUT':'IN'); if (k==='r15') A.r15(!w.r15); });
  root.querySelectorAll('.av-pot rect[data-d]').forEach(r=>r.onclick=e=>{ e.stopPropagation(); const k=r.parentNode.dataset.k, d=+r.dataset.d; A.pot(k, k==='eq'? d*10 : k==='lvl'? d*0.005 : d*0.02); });
  root.querySelectorAll('.av-jack').forEach(g=>g.onclick=()=>{ const w=worldAt(SIM.t); if (g.dataset.r==='in') A.src(!w.src.on); else A.load(+g.dataset.i); });
  root.querySelectorAll('.av-slot').forEach(g=>g.onclick=()=>A.setSlot(+g.dataset.s));
  root.querySelectorAll('[data-dt]').forEach(b=>b.onclick=()=>{ D.ui.dashTab=b.dataset.dt; SIM.refresh(); });
  root.querySelectorAll('[data-nt]').forEach(r=>r.onchange=()=>DASH.notify(+r.dataset.nt));
  root.querySelectorAll('[data-da]').forEach(b=>{ const k=b.dataset.da;
    if (k==='poll') b.onchange=()=>{ act('DashBoard auto-poll '+(b.checked?'on':'off'), [b.checked?`MFC sends GET_PARAM 2.1 and 2.2 every ${C.POLL} s (inferred pacing); can_data_rx stays below 10/s`:'Only REPORT_PARAM broadcasts update the window'], W(x=>{ x.poll=b.checked; })); };
    else b.onclick=()=>({open:DASH.open, refresh:DASH.refresh, reboot:DASH.reboot, ds1:DASH.datasafe, ds2:DASH.datasafeEnd})[k](); });
  root.querySelectorAll('[data-ctl]').forEach(el=>{ const k=el.dataset.ctl; const fire=()=>{ const v=el.type==='checkbox'?el.checked:el.value;
      if (k==='std') A.std(v); else if (k==='pat') A.srcSet('pat',v); else if (k==='len') A.srcSet('len',+v); else if (k==='hum') A.srcSet('hum',+v); else if (k==='looped') A.srcSet('looped',v);
      else if (k==='rear') A.rear(v); else if (k==='brand') A.brand(v); else if (k==='ins') { worldAt(SIM.t).card? A.pull() : A.insert(); } else if (k==='err') A.canErr();
      else if (k==='next'){ rollSecond(); SIM.seek(0); } else if (k==='reset'){ resetAll(); SIM.seek(0); } else if (k==='labels'){ D.ui.labels=v; SIM.refresh(); } };
    if (el.tagName==='BUTTON') el.onclick=fire; else el.onchange=fire; });
}
function controlsHTML(){
  const w=worldAt(SIM.t), o=(v,cur,l)=>`<option value="${v}" ${String(v)===String(cur)?'selected':''}>${l}</option>`;
  return `<div class="av-ctl small">
    <b>Feed</b> <select data-ctl="std">${o('NTSC',w.src.std,'NTSC')}${o('PAL',w.src.std,'PAL')}</select>
    <select data-ctl="pat">${o('bars',w.src.pat,'75 % bars')}${o('black',w.src.pat,'black burst')}${o('stairs',w.src.pat,'5-step staircase')}</select>
    cable <select data-ctl="len">${[0,30,100,150,200,250,300].map(v=>o(v,w.src.len,v+' m')).join('')}</select>
    hum <select data-ctl="hum">${[0,30,100,300,1000].map(v=>o(v,w.src.hum,v+' mV')).join('')}</select>
    <label><input type="checkbox" data-ctl="looped" ${w.src.looped?'checked':''}> looped to another 75 Ω</label></div>
    <div class="av-ctl small"><b>Card</b> rear <select data-ctl="rear">${Object.keys(REARS).map(k=>o(k,w.rear,k)).join('')}</select>
    build <select data-ctl="brand">${o('COBALT',w.brand,'COBALT (archived)')}${o('WARD_BECK',w.brand,'WARD_BECK')}</select>
    <button data-ctl="ins">${w.card?'Pull card':'Insert card'}</button><button data-ctl="err">CAN error</button>
    <button data-ctl="next" title="Carry the state at 1.000 s into a new second">Next second ▶</button><button data-ctl="reset">Reset</button>
    <label><input type="checkbox" data-ctl="labels" ${D.ui.labels?'checked':''}> part labels</label> <span class="muted">second #${D.second}</span></div>`;
}

/* =====================================================================
   TIMELINE LANES
   ===================================================================== */
function lanes(){
  const R=sim(), css=n=>SIM.css(n), ls=[];
  const txt=(c,s,x,y,col)=>{ c.fillStyle=col||css('--ink'); c.font='11px '+css('--mono'); c.fillText(s,x,y); };
  const span=(c,X,t0,t1,y,h,a,b,col,alpha,label)=>{ const xa=X(Math.max(a,t0)), xb=X(Math.min(b,t1)); if (xb<xa) return; c.fillStyle=col; c.globalAlpha=alpha||1; c.fillRect(xa,y+3,Math.max(1,xb-xa),h-6); c.globalAlpha=1; if (label && xb-xa>90){ c.save(); c.beginPath(); c.rect(xa,y,xb-xa,h); c.clip(); txt(c,label,xa+4,y+h/2+4); c.restore(); } };
  const runs = fn => { const out=[]; let cur=null; R.snaps.forEach(sn=>{ const v=fn(sn); if (!cur||cur.v!==v){ if (cur) cur.t1=sn.t; cur={t0:sn.t,v}; out.push(cur); } }); if (cur) cur.t1=1; return out; };
  const wave=(label,fn,h,col,unit)=>({label, h:h||40, draw(c,X,t0,t1,y,hh){
    const pw=X(t1)-X(t0), sp=t1-t0, w0=worldAt((t0+t1)/2), s=STD[w0.src.std], lo=-400, hi=900, Y=v=>y+hh-3-(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo)*(hh-6);
    c.strokeStyle=css('--grid'); c.beginPath(); c.moveTo(X(t0),Y(0)); c.lineTo(X(t1),Y(0)); c.stroke();
    if (sp > 400*s.H){ // envelope: a band from sync tip to peak per pixel column, gaps where there is no signal
      const N=Math.min(900,pw); c.fillStyle=col; c.globalAlpha=.3;
      for (let i=0;i<N;i++){ const tt=t0+sp*(i+.5)/N, w=worldAt(tt), ch=chain(w), g=(unit==='out'? ch.G0*(w.outLoad[0]?1:2) : 1)*ch.tf;
        if (unit==='out'? !ch.on : !w.src.on) continue; const ss=STD[w.src.std]; c.fillRect(X(t0)+pw*i/N, Y(ss.white*0.75*g), Math.max(1,pw/N), Y(ss.sync*g)-Y(ss.white*0.75*g)); }
      c.globalAlpha=1; txt(c, `${(sp/(s.H*s.hl/4)).toFixed(0)} fields in view — zoom to “1 line” or “10 µs” for sync pulses and burst`, X(t0)+6, y+12);
      return; }
    const N=Math.min(5000, Math.max(300, pw*3)); c.strokeStyle=col; c.lineWidth=1; c.beginPath();
    for (let i=0;i<=N;i++){ const tt=t0+sp*i/N; const v=fn(worldAt(tt),tt); i? c.lineTo(X(tt),Y(v)) : c.moveTo(X(tt),Y(v)); } c.stroke();
    c.fillStyle=css('--ink2'); c.font='9px sans-serif'; c.fillText('700 mV', X(t0)+2, Y(700)+3); c.fillText('−286', X(t0)+2, Y(-286)+3); }});
  ls.push({label:'AT90CAN128 mode (boot · slot ADC · run)', h:24, draw(c,X,t0,t1,y,h){
    runs(sn=>sn.mode).forEach(g=>{ if (g.v==='run') span(c,X,t0,t1,y,h,g.t0,g.t1,css('--accent'),.18); else if (g.v==='off') span(c,X,t0,t1,y,h,g.t0,g.t1,css('--grid'),.8,'card out / no power'); });
    R.segs.forEach(g=>span(c,X,t0,t1,y,h,g.t0,g.t1, g.kind==='wdt'? css('--bad') : g.kind==='adc'? css('--accent2') : g.kind==='off'? css('--grid') : css('--warn'), .55, g.label)); }});
  ls.push({label:'Video fields (input)', h:26, draw(c,X,t0,t1,y,h){
    const w0=worldAt(t0); if (!w0.src.on && !worldAt(t1).src.on){ txt(c,'no input',X(t0)+6,y+h/2+4,css('--ink2')); return; }
    const s=STD[w0.src.std], FT=s.H*s.hl/4; const n0=Math.floor((t0-PH)/FT)-1, n1=Math.ceil((t1-PH)/FT);
    for (let n=n0;n<=n1;n++){ const a=PH+n*FT, b=a+FT; const fld=((n%2)+2)%2; const tt=(a+b)/2; if (!worldAt(Math.max(0,Math.min(1,tt))).src.on) continue;
      c.fillStyle= fld? css('--accent2') : css('--accent'); c.globalAlpha=.35; c.fillRect(X(a),y+3,Math.max(1,X(b)-X(a)-1),h-6);
      c.globalAlpha=.9; c.fillStyle=css('--ink'); const vb=a+3*s.N*s.H/2; c.fillRect(X(a), y+3, Math.max(1,X(vb)-X(a)), h-6); c.globalAlpha=1;
      if (X(b)-X(a)>70) txt(c, `field ${fld+1}${X(b)-X(a)>200?' · '+(s.hl/2)/2+' lines':''}`, X(a)+4, y+h/2+4);
      if (X(a+s.H)-X(a)>4){ for (let L=0; L<s.hl/4; L++){ const lt=a+L*s.H+(fld? s.H/2:0); if (lt<t0||lt>t1) continue; c.fillStyle=css('--ink2'); c.fillRect(X(lt),y+h-7,1,4); if (X(lt+s.H)-X(lt)>36) txt(c, 'L'+(vt(s,lt+1e-7).line), X(lt)+2, y+h-8, css('--ink2')); } } } }});
  ls.push(wave('Composite at IN (BNC 1), mV', (w,tt)=>inAt(w,tt), 44, SIM.css('--ink2'), 'in'));
  ls.push(wave('Composite at OUT1, mV', (w,tt)=>outAt(w,tt,0), 44, SIM.css('--accent'), 'out'));
  const bl=(label,fn,col)=>({label, h:20, draw(c,X,t0,t1,y,h){ const sp=t1-t0, pw=X(t1)-X(t0), s=STD[worldAt(t0).src.std];
    if (fn===hsLow && sp>600*s.H){ c.fillStyle=col; c.globalAlpha=.35; c.fillRect(X(t0),y+6,pw,h-12); c.globalAlpha=1; txt(c, `${Math.round(sp/s.H).toLocaleString()} × HSOUT pulses (every ${SIM.fmtDur(s.H)})`, X(t0)+6, y+h/2+4); return; }
    const N=Math.min(6000,Math.max(200,pw*3)); c.fillStyle=col; for (let i=0;i<N;i++){ const tt=t0+sp*(i+.5)/N; if (fn(worldAt(tt),tt)) c.fillRect(X(t0)+pw*i/N, y+4, pw/N+0.7, h-8); } }});
  ls.push(bl('LMH1981 HSOUT low → PA2', hsLow, SIM.css('--accent2')));
  ls.push(bl('LMH1981 VSOUT low → PA3', vsLow, SIM.css('--warn')));
  ls.push(bl('LMH1981 BPOUT → GB4571 clamp key', bpOn, SIM.css('--ink2')));
  ls.push({label:'FSOUT bits sampled (PA4)', h:22, draw(c,X,t0,t1,y,h){ R.busy.forEach(b=>{ if (b.t1<t0||b.t0>t1) return; b.samples.forEach(sm=>{ c.fillStyle= sm.bit? css('--accent') : css('--grid'); c.fillRect(X(sm.t)-1, y+4, 3, h-8); if (X(b.samples[1].t)-X(b.samples[0].t)>14) txt(c, String(sm.bit), X(sm.t)+3, y+h/2+4); });
      if (X(b.t1)-X(b.t0)>160) txt(c, `→ video_format = ${b.code}${CODES[b.code]?' ('+CODES[b.code][1]+')':' (not in the table)'}`, X(b.samples[10].t)+10, y+h/2+4); }); }});
  ls.push({label:'Main loop: passes · LMH1981 busy-wait', h:30, draw(c,X,t0,t1,y,h){
    const pxPass=X(t0+C.PASS)-X(t0);
    R.idle.forEach(g=>{ if (g.t1<t0||g.t0>t1) return; if (g.stall){ span(c,X,t0,t1,y,h,g.t0,g.t1,css('--bad'),.6,'ISR builds a descriptor'); return; }
      if (pxPass<3) span(c,X,t0,t1,y,h,g.t0,g.t1,css('--accent'),.45); else { for (let k=0; g.t0+k*C.PASS<g.t1; k++){ const a=g.t0+k*C.PASS; if (a>t1) break; if (a+C.PASS<t0) continue; const xa=X(a), xb=X(Math.min(g.t1,a+C.PASS)); c.fillStyle=css('--accent'); c.globalAlpha=k%2?.4:.7; c.fillRect(xa,y+5,Math.max(1,xb-xa-.5),h-10); c.globalAlpha=1; if (xb-xa>150) txt(c,'pass: WDR · LMH1981_VIDEO_DETECT (returns) · REFRESH_LEDS · CAN_FUNCTIONS',xa+3,y+h/2+4,'#fff'); } } });
    R.busy.forEach(b=>{ if (b.t1<t0||b.t0>t1) return; span(c,X,t0,t1,y,h,b.t0,b.l1,css('--warn'),.85, 'loop 1: VSOUT low, count 3 HSOUT'); span(c,X,t0,t1,y,h,b.l1,b.t1,'#9b59b6',.8, 'loop 2: 11 HSOUT rising edges, shift FSOUT into video_format'); });
    R.segs.forEach(g=>{ if (g.kind!=='run') span(c,X,t0,t1,y,h,g.t0,g.t1,css('--panel'),1); });
    if (X(t1)-X(t0)>300 && t1-t0>0.3) txt(c, `${R.passes.toLocaleString()} idle passes + ${R.busy.length} field detections this second`, X(t0)+6, y+h/2+4); }});
  ls.push({label:'video_detect_counter (0…1000)', h:26, draw(c,X,t0,t1,y,h){ const pw=X(t1)-X(t0), N=Math.min(600,pw); c.strokeStyle=css('--warn'); c.beginPath();
    for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N; const v=snapAt(tt).mode==='run'? vdcAt(tt) : 0; const yy=y+h-3-v/C.NO_VIDEO*(h-6); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke();
    R.losses.forEach(l=>{ if (l>=t0&&l<=t1){ c.fillStyle=css('--bad'); c.fillRect(X(l)-1,y,3,h); } }); }});
  ls.push({label:'Timer1 96 µs · Timer0 1 ms', h:24, draw(c,X,t0,t1,y,h){ const tc=R.tcs.filter(x=>x<=t1).pop(); const base = tc!=null? tc+C.T1_FIRST : D.s0.f.t1next;
    if (snapAt((t0+t1)/2).mode!=='run'){ txt(c,'timers stopped',X(t0)+6,y+h/2+4,css('--ink2')); return; }
    SIM.pulses(c,X,t0,t1,y,h/2,C.T1,base%C.T1,6e-6,css('--ink2'),'timer1');
    SIM.pulses(c,X,t0,t1,y+h/2,h/2,C.T0,(tc!=null?tc:D.s0.f.t0next)%C.T0,2e-5,css('--accent2'),'timer0');
    R.ticks0.forEach(k=>{ if (k.t>=t0&&k.t<=t1){ c.fillStyle=css('--warn'); c.fillRect(X(k.t)-1,y,3,h); } }); }});
  ls.push({label:'CAN 1 Mbit/s (▼ MFC→card · ▲ card)', h:34, draw(c,X,t0,t1,y,h){ let n=0;
    R.can.forEach(fr=>{ if (fr.t+fr.dur<t0||fr.t>t1) return; n++; const rx=fr.dir==='rx'; c.fillStyle= rx? css('--accent2') : fr.type===0x10? css('--play') : fr.type===0x11? css('--warn') : css('--accent');
      const xa=X(fr.t), xb=Math.max(xa+2, X(fr.t+fr.dur)); c.fillRect(xa, rx? y+3 : y+h/2+1, xb-xa, h/2-4); if (xb-xa>90) txt(c, fr.label.slice(0,Math.floor((xb-xa)/7)), xa+2, (rx?y+3:y+h/2+1)+11, '#fff'); });
    if (!n) txt(c,'bus idle for this card',X(t0)+6,y+h/2+4,css('--ink2')); }});
  ls.push({label:'hsynch_detected · format', h:24, draw(c,X,t0,t1,y,h){ runs(sn=>sn.mode==='run'? sn.hs*10+sn.format : -1).forEach(g=>{ if (g.v<0) return; const hs=g.v>=10, fm=g.v%10; span(c,X,t0,t1,y,h,g.t0,g.t1, hs? css('--accent') : css('--bad'), .45, `hsynch_detected ${hs?'YES':'NO'} · format ${FMT[fm]}`); }); }});
  ls.push({label:'LEDs SYNCH (green) · NO SYNCH (red)', h:24, draw(c,X,t0,t1,y,h){ runs(sn=>sn.leds).forEach(g=>{ if (g.v&1){ c.fillStyle='#4cc38a'; c.fillRect(X(Math.max(g.t0,t0)),y+3,X(Math.min(g.t1,t1))-X(Math.max(g.t0,t0)),8); } if (g.v&2){ c.fillStyle='#ff5a4a'; c.fillRect(X(Math.max(g.t0,t0)),y+13,X(Math.min(g.t1,t1))-X(Math.max(g.t0,t0)),8); } }); }});
  ls.push({label:'DashBoard display changes', h:22, draw(c,X,t0,t1,y,h){ R.dashUpd.forEach(u=>{ if (u.t<t0||u.t>t1) return; c.fillStyle=css('--play'); c.beginPath(); c.arc(X(u.t),y+h/2,4,0,7); c.fill(); if (X(t1)-X(t0)<3000||true){ const tx=u.oid===0x0201? alarmDecode(T21,u.v).txt : u.oid===0x0202? alarmDecode(T22,u.v).txt : String(u.v); txt(c, `${OID[u.oid]?OID[u.oid].n:oidTxt(u.oid)}: ${tx}`, X(u.t)+6, y+h/2+4); } }); }});
  return ls;
}

/* ---------------- scopes ---------------- */
function drawLineScope(cv, t, lines){
  const w=worldAt(t), s=STD[w.src.std], {c,w:W}=SIM.canvas(cv, 210); const v=vt(s,t), ls=t-v.u, span=(lines||1)*s.H, t0=ls-0.5e-6, t1=t0+span+1e-6;
  const x0=44, pw=W-x0-10, X=tt=>x0+(tt-t0)/(t1-t0)*pw, lo=-450, hi=1000, Y=mv=>182-(Math.max(lo,Math.min(hi,mv))-lo)/(hi-lo)*170;
  const ink2=SIM.css('--ink2'), grid=SIM.css('--grid');
  c.font='10px '+SIM.css('--mono'); [-286,0,350,714].forEach(mv=>{ c.strokeStyle=grid; c.beginPath(); c.moveTo(x0,Y(mv)); c.lineTo(W-10,Y(mv)); c.stroke(); c.fillStyle=ink2; c.fillText(mv+'',2,Y(mv)+3); });
  [[0,s.sw,'sync'],[s.burstAt,s.burstAt+s.burstCyc/s.fsc,'burst'],[5.6e-6,8.6e-6,'BPOUT'],[s.act0,s.H-s.fp,'active video']].forEach(([a,b,l],i)=>{ c.fillStyle=[SIM.css('--warn'),SIM.css('--accent2'),ink2,SIM.css('--accent')][i]; c.globalAlpha=.1; c.fillRect(X(ls+a),8,X(ls+b)-X(ls+a),176); c.globalAlpha=1; c.fillStyle=ink2; c.fillText(l,X(ls+a)+2,18+i*10); });
  const N=Math.min(4000,pw*3);
  [[t2=>inAt(w,t2),ink2],[t2=>outAt(w,t2,0),SIM.css('--accent')]].forEach(([fn,col])=>{ c.strokeStyle=col; c.lineWidth=1.2; c.beginPath(); for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N, yy=Y(fn(tt)); i?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); });
  const px=X(t); c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(px,8); c.lineTo(px,184); c.stroke();
  c.fillStyle=SIM.css('--ink'); c.fillText(`${s.name} · line ${v.line} (field ${v.field+1}) · H = ${SIM.fmtDur(s.H)} · grey = IN, green = OUT1 · ${w.outLoad[0]?'OUT1 terminated':'OUT1 open'}`, x0, 202);
}
function drawVScope(cv, t){
  const w=worldAt(t), s=STD[w.src.std], {c,w:W}=SIM.canvas(cv, 230); const bs=sim().busy, bb=bs.find(b=>b.t1>=t)||bs[bs.length-1]; const z=vsWin(s, bb? bb.t0 : t), t0=z.v.tFieldStart-s.H, t1=t0+16*s.H;
  const x0=150, pw=W-x0-10, X=tt=>x0+(tt-t0)/(t1-t0)*pw; const ink=SIM.css('--ink'), ink2=SIM.css('--ink2');
  const rows=[['composite IN',44],['HSOUT (PA2)',18],['VSOUT (PA3)',18],['BPOUT → GB4571',18],['FSOUT samples (PA4)',22],['AVR LMH1981_VIDEO_DETECT',26],['OEOUT (field)',18]]; let y=8;
  c.font='11px sans-serif';
  rows.forEach(([nm,h],i)=>{ c.fillStyle=ink; c.fillText(nm,6,y+h/2+4); const N=Math.min(3000,pw*2);
    if (i===0){ c.strokeStyle=ink2; c.beginPath(); for (let k=0;k<=N;k++){ const tt=t0+(t1-t0)*k/N, v=inAt(w,tt)/1000; const yy=y+h*0.62-v*h*0.85; k?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); }
    else if (i<=3 || i===6){ const fn=[null,hsLow,vsLow,bpOn,null,null,oeOut][i]; c.strokeStyle=SIM.css(i===2?'--warn':'--accent2'); c.beginPath(); for (let k=0;k<=N;k++){ const tt=t0+(t1-t0)*k/N, lv=fn(w,tt)? (i===3||i===6?1:0) : (i===3||i===6?0:1); const yy=y+h-3-lv*(h-6); k?c.lineTo(X(tt),yy):c.moveTo(X(tt),yy); } c.stroke(); }
    else if (i===4){ sim().busy.filter(b=>b.t1>t0&&b.t0<t1).forEach(b=>b.samples.forEach(sm=>{ c.fillStyle=sm.bit?SIM.css('--accent'):SIM.css('--grid'); c.fillRect(X(sm.t)-1.5,y+2,3,h-4); c.fillStyle=ink; c.font='10px '+SIM.css('--mono'); c.fillText(String(sm.bit),X(sm.t)+3,y+h/2+4); c.font='11px sans-serif'; })); }
    else if (i===5){ sim().busy.filter(b=>b.t1>t0&&b.t0<t1).forEach(b=>{ c.fillStyle=SIM.css('--warn'); c.fillRect(X(b.t0),y+3,X(b.l1)-X(b.t0),h-6); c.fillStyle='#9b59b6'; c.fillRect(X(b.l1),y+3,X(b.t1)-X(b.l1),h-6); c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(`loop 1 → loop 2 → video_format = ${b.code}`, X(b.l1)+4, y+h/2+4); c.font='11px sans-serif'; }); }
    y+=h+4; });
  for (let L=0; L<=16; L++){ const lt=t0+L*s.H; c.strokeStyle=SIM.css('--grid'); c.beginPath(); c.moveTo(X(lt),4); c.lineTo(X(lt),y); c.stroke(); }
  const px=X(t); if (px>=x0){ c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(px,4); c.lineTo(px,y); c.stroke(); }
  c.fillStyle=ink2; c.font='10px '+SIM.css('--mono'); c.fillText(`vertical interval of field ${z.v.field+1} (16 lines from one line before the field start; pre-equalising, broad, post-equalising pulses)`, x0, y+10);
}
function canLogHTML(t){ const R=sim(); const fr=R.can.filter(f=>f.t<=t).slice(-40).reverse(); return fr.length? fr.map(f=>`<div>${f.dir==='rx'?'▼':'▲'} <span class="muted">${SIM.fmtT(f.t)}</span> ${f.label}</div>`).join('') : '<div class="muted">No CAN frames yet in this second.</div>'; }
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> <span class="muted">@ ${SIM.fmtT(D.log[0].t)} (second ${D.log[0].sec})</span></div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click the card (jumpers, pots, R15), the rear module (IN, outputs), the frame slots or the DashBoard window. The code path appears here, with names from the source.</div>'; }
function inspHTML(t){
  const sn=snapAt(t), w=worldAt(t), ch=chain(w), b=busyAt(t), g=segAt(t), dc=dashAt(t);
  const db=x=>(20*Math.log10(Math.max(1e-9,x))).toFixed(2)+' dB';
  return `<table class="kv">
    <tr><th>Second</th><td class="mono">#${D.second} · ${SIM.fmtT(t)}</td></tr>
    <tr><th>AVR</th><td class="mono">${sn.mode}${g?' — '+g.label:''}${b?` — inside LMH1981_VIDEO_DETECT (${t<b.l1?'loop 1: VSOUT low, counting HSOUT':'loop 2: shifting FSOUT'})`:sn.mode==='run'?' — idle pass':''}</td></tr>
    <tr><th>LMH1981 → AVR</th><td class="mono">hsynch_detected ${sn.hs?'YES':'NO'} · format ${FMT[sn.format]} · video_format ${sn.vf} (0b${(sn.vf>>>0).toString(2).padStart(11,'0')}) · video_detect_counter ${sn.mode==='run'?vdcAt(t):'—'}</td></tr>
    <tr><th>PARAMETER_UPDATE</th><td class="mono">parameter_change ${sn.pc} · signal_status_change ${sn.ssc} · parameter_refresh toggles every idle pass</td></tr>
    <tr><th>CAN timers</th><td class="mono">dashboard_initializing ${sn.dinit?'YES':'NO'} (count ${sn.dcount}) · restart_sent ${sn.restart} · restore_start ${sn.restore} · frame_count ${sn.fc} · slot_address ${sn.slotAddr} (ADC ${sn.adcAvg})</td></tr>
    <tr><th>smpte_alarm_enabled</th><td class="mono">${sn.smpte} (Notify on Card Fault ${sn.smpte?'Enabled':'Disabled'})</td></tr>
    <tr><th>Analog</th><td class="mono">line ×${ch.tf.toFixed(2)} (${ch.loads} load${ch.loads===1?'':'s'}) · U1 ×2 · LVL ${ch.k.toFixed(3)} · U4A ${ch.A0.toFixed(2)} (DC) / ${ch.Ac.toFixed(2)} (fsc)${ch.useB?` · U4B ${(2*ch.B0).toFixed(2)}/2`:''} → luma ${db(ch.G0*ch.tf)}, chroma ${db(ch.chromaG*ch.tf)}</td></tr>
    <tr><th>Output</th><td class="mono">${ch.outPP.toFixed(3)} V sync-to-white into 75 Ω${ch.contention?' · U4A/U4B outputs shorted by R15!':''}${ch.u1Clip?' · U1 clipping':''}${ch.ampClip?' · output amp clipping':''} · hum ${(ch.humOut).toFixed(1)} mV${w.clamp&&!ch.clampOK?' · clamp not keyed (no BPOUT)':''}</td></tr>
    <tr><th>DashBoard shows</th><td class="mono">Card Status ${alarmDecode(T21,dc.c[0x0201]).txt} · Video Status ${alarmDecode(T22,dc.c[0x0202]).txt} · Notify ${dc.c[0x0400]?'Enabled':'Disabled'}</td></tr></table>`;
}

/* =====================================================================
   VIEWS
   ===================================================================== */
const KEYS = { i:()=>A.src(!worldAt(SIM.t).src.on), t:()=>A.term(worldAt(SIM.t).term==='75'?'HIZ':'75'), c:()=>A.clamp(!worldAt(SIM.t).clamp), b:()=>A.bal(!worldAt(SIM.t).bal), o:()=>DASH.open(), r:()=>DASH.refresh(), n:()=>{ rollSecond(); SIM.seek(0); } };
document.addEventListener('keydown', e=>{ if (!window.__av6201Active || (e.target.matches && e.target.matches('input,select,textarea'))) return; const f=KEYS[e.key.toLowerCase()]; if (f){ f(); e.preventDefault(); } });
function viewSim(m){
  window.__av6201Active = true;
  m.innerHTML = CSS + `<div class="grid2">
    <div>${card('Frame, card and card edge at the playhead', `<div id="frm"></div><div style="display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:10px;align-items:start;margin-top:8px"><div id="crd"></div><div id="edge"></div></div>
      <div class="small muted" style="margin-top:4px">Card edge = ${SIM.src(ART_SRC+'AV6201-card-edge.cdr','AV6201-card-edge.cdr')} (CorelDRAW, 2008|41). Card = AV6201 ISS3 top side from the gerbers (TOP + TSM + TSS, 120 dpi; black mask as in the photo). Click TERM, BAL, CLAMP and H3 to move jumpers, the left/right half of LVL, EQ and RV1 to turn them, R15 to fit or remove it. Keys: I input · T term · B bal · C clamp · O open in DashBoard · R refresh · N next second.</div><div id="wc"></div>`)}</div>
    <div>${card('Parameter window (DashBoard-style, generic)', `<div id="dash"></div>`)}${card('What the card did (last action)', `<div id="trace" class="log"></div>`)}</div></div>
  <div class="grid2"><div>${card('Rear module — click IN to plug/unplug, an output to attach/remove its 75 Ω load', `<div style="display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:12px"><div><div id="rear"></div><div id="rearSrc" class="small muted"></div></div><div id="rearInfo" class="small"></div></div>`)}</div>
    <div>${card('State at the playhead', `<div id="insp"></div>`)}</div></div>
  ${card('Timeline — one second as the card, the LMH1981 and DashBoard see it (click to seek; pick “1 line” or “10 µs” zoom for sync pulses)', `<canvas id="tl"></canvas><p class="small muted">Timer periods, the busy-wait loops and every message come from the source. The idle pass time (${C.PASS*1e6} µs), VSOUT width, LMH1981 serial-word timing, MFC pacing and the phase of the counters are ${inf('the compiled listings and LMH1981 practice')}. Changes are events at the playhead; “Next second” carries the end state forward.</p>`)}
  <div class="grid2">${card('Scope: the video line at the playhead', `<canvas id="scope"></canvas>`)}${card('CAN frames (newest first)', `<div id="canlog" class="log" style="max-height:230px;overflow:auto"></div>`)}</div>`;
  let wcVer=-1;
  const draw=()=>{ const t=SIM.t; const w=worldAt(t);
    if (wcVer!==D.ver){ wcVer=D.ver; m.querySelector('#wc').innerHTML=controlsHTML(); }
    m.querySelector('#frm').innerHTML=frameSVG(t); m.querySelector('#crd').innerHTML=cardSVG(t); m.querySelector('#edge').innerHTML=edgeSVG(t);
    m.querySelector('#dash').innerHTML=dashHTML(t); m.querySelector('#rear').innerHTML=rearSVG(t); m.querySelector('#rearSrc').innerHTML=rearSrc();
    const ch=chain(w);
    m.querySelector('#rearInfo').innerHTML=`<b>${w.rear}</b> — ${REARS[w.rear].sub}<table class="kv" style="margin-top:4px">${rearPos(w.rear).map((p,i)=>`<tr><td>${i+1}</td><td>${p[0]}</td><td class="mono">${p[3]?'P1-'+p[3]:''}</td><td>${p[1]==='in'?'BNC1_SIG → TERM/R4 → U1':p[1]==='out'?`${OUTPIN[p[2]][2]} → ${OUTPIN[p[2]][3]} 75R · ${(w.outLoad[p[2]]?ch.outPP:2*ch.outPP).toFixed(2)} V`:p[1]==='nc'?'BNC2_SIG: no other node':'other card'}</td></tr>`).join('')}</table>
      <div class="muted">Labels: AV6201-REAR-MODULES.pdf (it labels position 2 “IN”; the netlist and manual say N/C).${REARS[w.rear].dual?' Which four amplifier outputs reach a T6401 is not in the archive '+inf()+'.':''}</div>`;
    m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#insp').innerHTML=inspHTML(t); m.querySelector('#canlog').innerHTML=canLogHTML(t);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:205});
    drawLineScope(m.querySelector('#scope'), t, 1);
    bindAll(m);
  };
  SIM.on('time', draw);
}

/* ---------------- tutorial (from the AV6201A manual, issue 1) ---------------- */
const endSnap = () => { const R=sim(); return R.snaps[R.snaps.length-1]; };
const LESSONS = [
  {title:'Meet the AV6201A', body:`<p>The AV6201A is an openGear <b>analog video distribution amplifier</b>: one composite input with a <b>differential receiver</b>, a <b>clamp</b>, a <b>0–300 m cable equaliser</b> and <b>eight 75 Ω outputs</b> (manual, “Overview”). The video path is all analogue. An AT90CAN128 only watches the LMH1981 sync separator, drives two LEDs and talks to DashBoard.</p><p>The archived firmware is the <b>Cobalt 9231</b> build (common.h <span class="mono">#define COBALT</span>).</p>`, check:()=>true, auto:true},
  {title:'1 · Install it (manual step 2)', body:`<p>“When using the AV6201A with the T6301A for maximum I/O … the even numbered slots are to be used.” The T6301 covers two slots. Put the card in an <b>even slot</b> of the DFR-8320 with a <b>T6301</b> rear module.</p>`, check:()=>{ const w=worldAt(1); return w.rear==='T6301' && w.slot%2===0 && w.card; }, hint:'Rear = T6301, then click an even slot in the frame.'},
  {title:'2 · Watch it boot', body:`<p>Click <b>Pull card</b>, then <b>Insert card</b>. The red NO SYNCH LED comes on at once (DATA_INITIALIZATION), the AVR waits 26 ms, reads the slot-ID resistor 100 times (≈0.54 s), then starts its loop and the green SYNCH LED takes over at the first field it catches. Move the playhead past the boot.</p>`, check:()=>{ const R=sim(); return R.segs.some(g=>g.kind==='adc') && snapAt(SIM.t).mode==='run' && (snapAt(SIM.t).leds&1); }, hint:'Insert the card, then drag the playhead to ≈0.7 s.'},
  {title:'3 · Termination', body:`<p>A video line must be terminated in 75 Ω exactly once. Tick <b>looped to another 75 Ω</b> (the feed also goes to another device): the output drops to 2/3. Now move <b>TERM</b> to <b>HI-Z</b>: back to 1 V.</p>`, check:()=>{ const w=worldAt(SIM.t); return w.src.looped && w.term!=='75'; }, hint:'Tick “looped”, then click the TERM jumper.'},
  {title:'4 · Differential input', body:`<p>Set <b>hum</b> to 300 mV (a ground-potential difference between the source and the frame). Fit the <b>BAL</b> jumper (H1 ties the BNC shield to ground): hum rides on the video. Park it again (shield floats on R6 22K1) and U1 subtracts the shield from the centre.</p>`, check:()=>{ const w=worldAt(SIM.t); return w.src.hum>=300 && w.bal; }, hint:'hum → 300 mV, then make sure BAL is parked (differential).'},
  {title:'5 · Clamp', body:`<p>Switch <b>CLAMP</b> OFF and look at the scope: the residual hum and any DC shift go straight through. Switch it ON: the GB4571 pulls each line’s back porch to 0 V, keyed by the LMH1981’s <b>BPOUT</b>. Unplug the input with CLAMP ON — without sync there is no BPOUT and the clamp is not keyed.</p>`, check:()=>{ const w=worldAt(SIM.t); return w.clamp && w.src.on; }, hint:'CLAMP ON with the input plugged in.'},
  {title:'6 · Cable EQ', body:`<p>Set the cable to <b>200 m</b>: the burst and colour on the bars shrink. Turn the <b>EQ pot</b> up to 200 m. The EQ is a shunt-peaking network around U4A, so the luma level also rises a little (DC gain ${eqGain(0,0,EQA).toFixed(2)} → ${eqGain(0,1,EQA).toFixed(2)}).</p>`, check:()=>{ const w=worldAt(SIM.t), ch=chain(w); return w.src.len>=200 && Math.abs(20*Math.log10(ch.chromaG/ch.G0))<0.6; }, hint:'cable 200 m, then click the right half of the EQ pot until chroma matches luma (State table).'},
  {title:'7 · Level', body:`<p>Use the <b>LVL</b> pot to bring the output back to <b>1.00 V</b> sync-to-white (±0.02 V) into 75 Ω. The manual quotes ±3 dB; the R12/2K/R13 divider actually spans about −17 to +5 dB around the nominal setting.</p>`, check:()=>{ const ch=chain(worldAt(SIM.t)); return Math.abs(ch.outPP-1)<=0.02; }, hint:'Click the left or right half of the LVL pot; watch “Output” in the State table.'},
  {title:'8 · DashBoard', body:`<p>Click <b>Open / rescan</b>. The MFC asks for the parameter list, every descriptor and every value. Each descriptor is built inside the CAN interrupt and sent over many frames by timer1. Read <b>Card Info</b>: Product <b>9231</b>, Supplier <b>Cobalt Digital</b>.</p>`, check:()=>sim().can.some(f=>f.type===0x47), hint:'Open / rescan in the parameter window.'},
  {title:'9 · Notify on Card Fault', body:`<p>With the default <b>Disabled</b>, the card never reports a fault in Card Status. Set <b>Notify on Card Fault → Enabled</b>, then unplug the input. After ≈30 ms the LEDs change; DashBoard learns it only at the next REPORT_PARAM (up to ≈0.96 s) or a refresh.</p>`, check:()=>{ const sn=snapAt(SIM.t), dc=dashAt(SIM.t); return sn.smpte && !worldAt(SIM.t).src.on && alarmDecode(T21,dc.c[0x0201]).sev===2; }, hint:'Control › Card Settings → Enabled, unplug IN, then Refresh or wait for a report (Next second).'},
  {title:'10 · Reboot forgets', body:`<p>Click <b>Reboot</b>. The card stops kicking the watchdog, resets, and boots again. <b>Notify on Card Fault</b> is back to Disabled: SAVE_INFORMATION_EEPROM is inside a comment, so nothing is stored.</p>`, check:()=>sim().segs.some(g=>g.kind==='wdt') && !endSnap().smpte, hint:'Reboot in the parameter window.'},
  {title:'Done', body:`<p>See <b>One second</b> for fields, lines and the busy-wait, <b>Software</b> for the loop and message flow, and <b>Findings</b> for what the firmware and documents are up to.</p>`, check:()=>true, auto:true},
];
function viewTutorial(m){
  window.__av6201Active = true;
  m.innerHTML = CSS + `<div class="grid2"><div>${card('Tutorial — installing and running an AV6201A', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('What the card did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('Frame, card, edge and rear', `<div id="frm"></div><div id="crd" style="margin-top:6px"></div><div style="display:grid;grid-template-columns:150px 150px minmax(0,1fr);gap:8px;margin-top:6px"><div id="edge"></div><div id="rear"></div><div id="insp2" class="small"></div></div><div id="wc"></div>`)}${card('Parameter window', `<div id="dash"></div>`)}${card('Scope: line at the playhead', `<canvas id="scope"></canvas>`)}</div></div>`;
  let wcVer=-1;
  const draw=()=>{ const t=SIM.t, w=worldAt(t), ch=chain(w);
    if (wcVer!==D.ver){ wcVer=D.ver; m.querySelector('#wc').innerHTML=controlsHTML(); }
    m.querySelector('#frm').innerHTML=frameSVG(t); m.querySelector('#crd').innerHTML=cardSVG(t,{labels:false}); m.querySelector('#edge').innerHTML=edgeSVG(t); m.querySelector('#rear').innerHTML=rearSVG(t,{compact:true});
    m.querySelector('#dash').innerHTML=dashHTML(t); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#insp2').innerHTML=`<table class="kv"><tr><th>Output</th><td class="mono">${ch.outPP.toFixed(3)} V</td></tr><tr><th>chroma/luma</th><td class="mono">${(20*Math.log10(ch.chromaG/ch.G0)).toFixed(2)} dB</td></tr><tr><th>hum out</th><td class="mono">${ch.humOut.toFixed(1)} mV</td></tr><tr><th>LEDs</th><td>${snapAt(t).leds&1?'SYNCH':''}${snapAt(t).leds&2?'NO SYNCH':''}</td></tr></table>`;
    const L=LESSONS[D.tut]; let ok=false; try{ ok=L.check(); }catch(e){ ok=false; }
    m.querySelector('#lessons').innerHTML=LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===D.tut?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<D.tut?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=>li.onclick=()=>{ D.tut=+li.dataset.i; draw(); });
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${D.tut?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${D.tut<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>
      <p class="small muted">Goals are checked at the playhead (or over the simulated second for boot, rescan and reboot).</p>`;
    m.querySelector('#prv').onclick=()=>{ D.tut=Math.max(0,D.tut-1); draw(); }; m.querySelector('#nxt').onclick=()=>{ D.tut=Math.min(LESSONS.length-1,D.tut+1); draw(); }; m.querySelector('#rs').onclick=()=>{ resetAll(); D.tut=0; SIM.seek(0); };
    drawLineScope(m.querySelector('#scope'), t, 1);
    bindAll(m);
  };
  SIM.on('time', draw);
}

/* ---------------- one second ---------------- */
function viewSecond(m){
  window.__av6201Active = true;
  m.innerHTML = CSS + `${card('One second, broken down', `<div id="ladder"></div>`)}
    <div class="grid2">${card('As seen by the card', `<div id="dev"></div>`)}${card('As seen by the displays', `<div style="display:grid;grid-template-columns:150px minmax(0,1fr);gap:10px"><div id="edge"></div><div id="dview"></div></div>`)}</div>
    ${card('The next vertical interval the card catches after the playhead — what LMH1981_VIDEO_DETECT samples', `<canvas id="vs"></canvas>`)}
    ${card('Zoom ladder at the playhead (composite at OUT1)', `<canvas id="zl"></canvas>`)}
    ${card('Timeline', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{ const t=SIM.t, R=sim(), w=worldAt(t), s=STD[w.src.std], sn=snapAt(t);
    const FT=s.H*s.hl/4, tx=R.can.filter(f=>f.dir==='tx').length, rx=R.can.filter(f=>f.dir==='rx').length;
    const rows=[
      ['Video fields', (1/FT).toFixed(3), SIM.fmtDur(FT), `${s.name}: field 1 starts on a line, field 2 half a line later`],
      ['Video lines (H)', (1/s.H).toFixed(1), SIM.fmtDur(s.H), `sync ${SIM.fmtDur(s.sw)}, burst ${s.burstCyc} cycles of ${(s.fsc/1e6).toFixed(6)} MHz, active from ${SIM.fmtDur(s.act0)}`],
      ['Sync pulses in a vertical interval', String(6*s.N), SIM.fmtDur(s.H/2), `${s.N} equalising + ${s.N} broad + ${s.N} equalising, at twice line rate`],
      ['Subcarrier cycles', Math.round(s.fsc).toLocaleString(), SIM.fmtDur(1/s.fsc), 'only the chroma and burst; the EQ and cable loss act here'],
      ['LMH1981 HSOUT / BPOUT pulses', (1/s.H).toFixed(0), SIM.fmtDur(s.H), 'HSOUT → PA2 (polled), BPOUT → GB4571 clamp key (hardware only)'],
      ['LMH1981_VIDEO_DETECT completions', R.busy.length.toString(), SIM.fmtDur(R.busy.length? (R.busy[0].t1-R.busy[0].t0):0), 'busy-wait: ≤3 lines in loop 1, 11 lines in loop 2 → video_format'],
      ['Idle main-loop passes', R.passes.toLocaleString(), SIM.fmtDur(C.PASS), `WDR · VSOUT test · video_detect_counter++ · REFRESH_LEDS · CAN_FUNCTIONS ${inf('≈216 cycles counted in the .lis plus ISR load')}`],
      ['Timer1 interrupts', Math.round(1/C.T1).toLocaleString(), SIM.fmtDur(C.T1), 'CAN_TX_TIMER pacing: multi-frame replies, then every 1000 × slot ticks (initializing) or 10 001 ticks (heartbeat)'],
      ['Timer0 interrupts', '1,000', '1 ms', 'once per 1001 ticks: can_data_rx < 10 three times → dashboard_initializing = NO'],
      ['CAN frames', `${rx} rx · ${tx} tx`, SIM.fmtDur(fdur(8)), '1 Mbit/s, extended IDs, 8 data bytes ≈ 144 µs with stuffing '+inf()],
      ['LED refresh', R.passes.toLocaleString(), SIM.fmtDur(C.PASS), 'REFRESH_LEDS writes PORTB every pass'],
    ];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>notes</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Step units (transport): 1 field, 1 line, half-line (vertical-interval pulse), 1 main-loop pass, 1 timer1 tick, 1 subcarrier cycle.</p>`;
    const v=vt(s,t), b=busyAt(t), fr=R.can.find(f=>f.t<=t && f.t+f.dur>=t), x=comp(s,w.src.pat,t);
    m.querySelector('#dev').innerHTML=`<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>Video</th><td class="mono">field ${v.field+1} · line ${v.line} · ${(v.u*1e6).toFixed(2)} µs into the line · ${v.k<3*s.N? (v.k<s.N||v.k>=2*s.N?'equalising pulse':'broad (vertical sync) pulse') : v.u<s.sw?'H sync tip':v.u<s.act0?'back porch / burst':'active video'}</td></tr>
      <tr><th>IN / OUT1</th><td class="mono">${inAt(w,t).toFixed(0)} mV / ${outAt(w,t,0).toFixed(0)} mV (luma ${x.l.toFixed(0)}, chroma ${x.c.toFixed(0)} at the source)</td></tr>
      <tr><th>LMH1981</th><td class="mono">HSOUT ${hsLow(w,t)?'low':'high'} · VSOUT ${vsLow(w,t)?'low':'high'} · BPOUT ${bpOn(w,t)?'on':'off'} · OEOUT ${oeOut(w,t)?'odd':'even'}</td></tr>
      <tr><th>AT90CAN128</th><td class="mono">${sn.mode!=='run'? (segAt(t)||{}).label||sn.mode : b? (t<b.l1?'LMH1981_VIDEO_DETECT loop 1 (while VSOUT_PIN == 0)':'LMH1981_VIDEO_DETECT loop 2 (while detected_vsynch == YES)') : 'idle pass'}</td></tr>
      <tr><th>CAN</th><td class="mono">${fr?(fr.dir==='rx'?'▼ ':'▲ ')+fr.label:'idle'}</td></tr></table>`;
    m.querySelector('#edge').innerHTML=edgeSVG(t);
    const dc=dashAt(t);
    m.querySelector('#dview').innerHTML=`<table class="kv"><tr><th>Card edge</th><td>${sn.leds&1?'SYNCH (green)':''} ${sn.leds&2?'NO SYNCH (red)':''}${!sn.leds?'dark':''}</td></tr><tr><th>DashBoard Card Status</th><td>${alarmDecode(T21,dc.c[0x0201]).txt}</td></tr><tr><th>DashBoard Video Status</th><td>${alarmDecode(T22,dc.c[0x0202]).txt}</td></tr><tr><th>Monitor on OUT1</th><td>${chain(w).on? s.name+', '+chain(w).outPP.toFixed(2)+' V' : 'black'}</td></tr></table>
      <p class="small muted">The LEDs change ≈${(C.NO_VIDEO*C.PASS*1000).toFixed(0)} ms after the last caught field; DashBoard only at the next REPORT_PARAM or GET_PARAM reply.</p>`;
    drawVScope(m.querySelector('#vs'), t);
    const levels=[['1 second',1],['2 fields',2*FT],['8 lines',8*s.H],['1 line',s.H],['sync + burst (10 µs)',10e-6],['4 subcarrier cycles',4/s.fsc]];
    const H=levels.length*46+8, {c:z,w:zw}=SIM.canvas(m.querySelector('#zl'),H);
    levels.forEach(([nm,sp],i)=>{ const y=6+i*46, t0=Math.max(0,Math.min(1-sp,t-sp/2)); z.fillStyle=SIM.css('--ink'); z.font='12px sans-serif'; z.fillText(nm+' ('+SIM.fmtDur(sp)+')',6,y+16);
      const x0=200, pw=zw-x0-10; z.strokeStyle=SIM.css('--grid'); z.strokeRect(x0,y+2,pw,38); z.strokeStyle=SIM.css('--accent'); z.beginPath(); const N=Math.min(2400,pw*2);
      for (let k=0;k<=N;k++){ const tt=t0+sp*k/N; const vv=outAt(worldAt(tt),tt,0); const yy=y+28-vv/1000*30; k?z.lineTo(x0+pw*k/N,yy):z.moveTo(x0,yy); } z.stroke();
      const px=x0+(t-t0)/sp*pw; z.strokeStyle=SIM.css('--play'); z.beginPath(); z.moveTo(px,y); z.lineTo(px,y+42); z.stroke(); });
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:205});
  };
  SIM.on('time', draw);
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  rin:{x:10,y:20,w:130,h:66,t:'Rear: IN',s:['T6201/T6301/T6401','BNC1_SIG P1-97'],d:'The input BNC on the rear module reaches the card on P1-97 (BNC1_SIG) with its shield on P1-89…100 (BNC1_GND). The shield is not the card ground: it floats on R6 22K1 and C2 + R3 24R unless H1 (BAL) is fitted.',src:'AV6201-iss3.net: BNC1_SIG, BNC1_GND'},
  term:{x:10,y:110,w:130,h:66,t:'TERM · BAL',s:['R2 75R via TERM','H1: shield → GNDD'],d:'TERM pins 1–2 put R2 75R across the input; pins 2–3 are both BNC1_SIG (Hi-Z, only R1 22K1). H1 has two live pins: GNDD and BNC1_GND. Fitted = single-ended input; parked = true differential input.',src:'TERM-1 → R2 → BNC1_GND; H1-1 GNDD, H1-2 BNC1_GND'},
  u1:{x:170,y:60,w:140,h:80,t:'U1 diff receiver',s:['EL2244 (ISL55002 fitted)','VIDEO_IN = 2·(sig − shield)'],d:'Two-amplifier instrumentation stage: amp A (pins 1–3) multiplies the shield by 2 (R7/R8 1K), amp B (5–7) gives 2·sig − 2·shield through R10/R11 1K. R9 is DNI. Output net VIDEO_IN.',src:'U1, R4/R5 33R2, R7–R11, C6 DNI'},
  lvl:{x:340,y:20,w:130,h:70,t:'LVL pot',s:['R12 47R5 · 2K · R13 180R','multi-turn, extension rod'],d:'A plain divider from VIDEO_IN. Wiper ratio 0.081…0.979; with U4A’s DC gain the overall level spans about −17…+5 dB around unity (the manual says ±3 dB).',src:'LVL CW → R12 → VIDEO_IN; ccw → R13 → GND'},
  clamp:{x:340,y:110,w:130,h:80,t:'CLAMP (H2)',s:['C52+C53 → U3 GB4571','keyed by BPOUT'],d:'H2 1–2 sends the LVL wiper straight to U4 pin 3. H2 2–3 goes through two 47 µF capacitors in series (a non-polar coupling) into the Gennum GB4571 DC restorer (hold capacitor C12 1 nF), whose clamp pulse is the LMH1981 BPOUT. Output via R26 33R2.',src:'H2, C52, C53, U3, C12, R26, BPOUT'},
  u4:{x:500,y:60,w:140,h:90,t:'U4 equalisers',s:['U4A: EQ pot (0–300 m)','U4B: RV1 (fixed EQ)','H3 / R15 select'],d:'Two identical shunt-peaking stages: −in to ground through R22 3K57 and through R20 100R + EQ pot into an RC network (R21 3K32, C11 220p, R19 2K4 + C14 220p, CV1). Turning the pot raises the gain at high frequency (and a little at DC). U4B repeats it with RV1/CV2 after a ÷2 (R27/R28). H3 picks U4A or U4B, but R15 0R (fitted in the BOM) already ties H3-2 to U4A.',src:'U4, R20–R23, R27–R30, R33, R41, R50, R51, C11, C14, C30, C32, CV1, CV2, H3, R15'},
  pad:{x:670,y:60,w:110,h:70,t:'75 Ω pad',s:['R36 75R / R42 75R','÷2 → NET00030'],d:'H3-2 → R36 75R → R14 → the four output amplifiers, with R42 75R to ground: a 6 dB pad that the output stages win back.',src:'R36, R42, R14 (0R in BOM, 10R in PNP)'},
  out:{x:670,y:170,w:110,h:90,t:'U5 · U6 outputs',s:['4 amps, gain 2','2 × 75R each → 8 BNC'],d:'Each EL2244 half has R24/R25-style 1K/1K feedback (gain 2) and drives two outputs through separate 75R back-match resistors: OUT1/2 share U5A, OUT3/4 U5B, OUT5/6 U6A, OUT7/8 U6B.',src:'U5, U6, R24/25 R31/32 R34/35 R43/44, R37–R40, R46–R49'},
  rout:{x:670,y:290,w:110,h:60,t:'Rear: OUT1–8',s:['P1-75 80 37 34 17 22 5 12'],d:'BNC3…BNC10 on the netlist. A T6401 gives each of two cards IN + OUT1–4.',src:'BNC3_SIG … BNC10_SIG'},
  u2:{x:170,y:200,w:140,h:90,t:'U2 LMH1981',s:['sync separator','HSOUT VSOUT FSOUT','BPOUT CSOUT OEOUT'],d:'Fed from VIDEO_IN through C4. HSOUT → PA2, VSOUT → PA3, FSOUT → PA4 (read), CSOUT → PA5 and OEOUT → PA7 (wired, never read), BPOUT → GB4571.',src:'U2 pins 7, 8, 9, 12, 13, 14; R17 10K, C7 DNI on pin 1'},
  mcu:{x:340,y:220,w:150,h:110,t:'U8 AT90CAN128',s:['8 MHz X1','LMH1981_VIDEO_DETECT','PB1 SYNCH · PB2 NO SYNCH','ADC0 slot ID'],d:'Runs main(): boot, slot ID, then a loop that polls the LMH1981, refreshes the two LEDs and services CAN. It does not touch the video path at all.',src:'v100w.c, LMH1981.c, CAN.c, Dashboard.c'},
  can:{x:520,y:240,w:120,h:70,t:'U7 SN65HVD233',s:['CAN 1 Mbit/s','LBK = PD7'],d:'3.3 V CAN transceiver. CAN_RX / CAN_TX macros drive its LBK (loop-back) pin: loop-back during boot, normal once CANinit is done.',src:'U7, CANH/CANL P2-13/11, LBK U8-32'},
  mid:{x:520,y:330,w:120,h:70,t:'Midplane P2',s:['+12 V, −7.5 V','AN_SLOTID P2-6','REF1/REF2 unused'],d:'Power, CAN, the slot-ID resistor (read 100 times at boot) and the frame AES references (REF1 P2-14, REF2 P2-10 — not connected on this card).',src:'P2 MEDAC20'},
  pwr:{x:10,y:330,w:150,h:70,t:'Power',s:['LM317 +5 V, LM337 −5 V','LM1117 +3.3 V'],d:'+12 V → F1 RXE050 → FB1 → REG2 LM317 (R58 221 / R57 665 → 5.01 V) and REG3 LM1117-3.3; −7.5 V → F2 → FB2 → REG1 LM337 (→ −5.01 V). Manual: +12 V 120 mA, −7.5 V 55 mA.',src:'REG1–3, F1, F2, FB1, FB2, R55–R58'},
};
const WIRES=[['rin','term',''],['term','u1','sig/shield'],['u1','lvl','VIDEO_IN'],['u1','u2','C4'],['lvl','clamp','wiper'],['clamp','u4','H2'],['u4','pad','H3'],['pad','out','÷2'],['out','rout','75R'],['u2','clamp','BPOUT'],['u2','mcu','HS/VS/FS'],['mcu','can','TXD/RXD'],['can','mid','CANH/L'],['mid','mcu','AN_SLOTID'],['pwr','u1','±5 V']];
function viewBlock(m){
  window.__av6201Active=false; let sel='u2';
  m.innerHTML=`<div class="grid2"><div>${card('Block diagram (click a block) — from AV6201-iss3.net', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}${card('Live levels through the path', `<div id="lv"></div>`)}</div></div>`;
  const draw=()=>{ const B=BLOCKS, ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 800 410" style="width:100%"><defs><marker id="avar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=B[a],B_=B[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_); const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y,sx=dx?(bx.w/2)/Math.abs(dx):1e9,sy=dy?(bx.h/2)/Math.abs(dy):1e9,k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#avar)"/>${l?`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`:''}`; });
    for (const k in B){ const b=B[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=B[sel]; m.querySelector('#bdinfo').innerHTML=`<h3 style="margin-top:0">${b.t}</h3><p>${b.d}</p><p class="small muted mono">${b.src}</p>`;
    m.querySelector('#lv').innerHTML=ladderHTML(worldAt(SIM.t)); };
  draw(); SIM.on('time', ()=>{ m.querySelector('#lv').innerHTML=ladderHTML(worldAt(SIM.t)); });
}
function ladderHTML(w){
  const ch=chain(w), s=ch.s, pp=(s.white-s.sync)/1000, rows=[
    ['Source (EMF 2 V p-p, 75 Ω)', 2*pp, '1 V nominal into 75 Ω'], ['Input BNC (line, '+ch.loads+' × 75 Ω load)', pp*ch.tf, w.term==='75'?'TERM 75 Ω':'TERM Hi-Z'],
    ['VIDEO_IN (U1 × 2)', 2*pp*ch.tf, ch.u1Clip?'clipping':'differential, CMRR '+CMRR+' dB '+inf()], ['LVL wiper', 2*pp*ch.tf*ch.k, `ratio ${ch.k.toFixed(3)}`],
    ['U4A out (DC gain)', 2*pp*ch.tf*ch.k*ch.A0, `${ch.A0.toFixed(3)} DC, ${ch.Ac.toFixed(3)} at ${(s.fsc/1e6).toFixed(2)} MHz`], ...(ch.useB?[['U4B out', 2*pp*ch.tf*ch.k*ch.A0*ch.B0, 'R27/R28 ÷2, RV1 stage']]:[]),
    ['Pad R36/R42', pp*ch.tf*ch.k*ch.A0*ch.B0, '÷2'], ['U5/U6 output pin', 2*pp*ch.tf*ch.G0, ch.ampClip?'clipping':'gain 2'], ['OUT BNC into 75 Ω', pp*ch.tf*ch.G0, `${(20*Math.log10(ch.G0*ch.tf)).toFixed(2)} dB re source`]];
  const mx=Math.max(...rows.map(r=>r[1]),2.2);
  return `<table class="kv">${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1].toFixed(3)} V</td><td style="width:35%"><div style="height:10px;background:${r[1]>CLIP*0.95&&/U|VIDEO/.test(r[0])?'var(--bad)':'var(--accent)'};width:${Math.min(100,r[1]/mx*100)}%;border-radius:3px"></div></td><td class="small muted">${r[2]}</td></tr>`).join('')}</table>
    <p class="small muted">Sync-to-white volts (luma path). Chroma at OUT relative to luma: ${(20*Math.log10(ch.chromaG/ch.G0)).toFixed(2)} dB after ${w.src.len} m of cable (${LOSS.toFixed(2)} dB/100 m at 3.58 MHz ${inf('chosen so that full EQ = 300 m, as the manual says')}).</p>`;
}

/* ---------------- schematics (redrawn from the netlist) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18;
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([pin,net],i)=>{ const yy=y+22+i*18; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach(([pin,net],i)=>{ const yy=y+22+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
const res=(x,y,lbl,v,vert)=>vert? `<rect x="${x-5}" y="${y}" width="10" height="28" fill="none" stroke="var(--ink)"/><text x="${x+8}" y="${y+12}" font-size="10" fill="var(--ink)">${lbl}</text><text x="${x+8}" y="${y+24}" font-size="10" fill="var(--ink2)">${v}</text>` : `<rect x="${x}" y="${y-5}" width="28" height="10" fill="none" stroke="var(--ink)"/><text x="${x}" y="${y-8}" font-size="10" fill="var(--ink)">${lbl} ${v}</text>`;
const SHEETS=[
  {name:'1 · Input & differential receiver', note:'TERM pins 2 and 3 are both BNC1_SIG, so “HI-Z” simply parks the jumper. H1 (BAL) has only two live pins: GNDD and BNC1_GND. U1 is drawn as EL2244 on the schematic; the BOM fits ISL55002IBZ.', svg:()=>
    chip(420,140,120,'U1 EL2244',[['3 +A','NET00021 (shield)'],['2 −A','NET00004'],['5 +B','NET00022 (sig)'],['6 −B','NET00006']],[['1 OUTA','NET00005'],['7 OUTB','VIDEO_IN'],['8 V+','+5V'],['4 V−','-5V']],'ISL55002IBZ fitted')+
    `<text x="20" y="60" font-size="12" fill="var(--ink)">P1-97 BNC1_SIG ─ R1 22K1 → GND · R4 33R2 → U1-5 · TERM-2/3</text><text x="20" y="80" font-size="12" fill="var(--ink)">P1-89…100 BNC1_GND ─ R6 22K1 → GND · R5 33R2 → U1-3 · C2 0.1 + R3 24R → GND · H1-2</text>
     <text x="20" y="260" font-size="12" fill="var(--ink)">TERM-1 → R2 75R → BNC1_GND   (jumper 1–2 = 75 Ω, 2–3 = Hi-Z)</text><text x="20" y="280" font-size="12" fill="var(--ink)">H1-1 GNDD — H1-2 BNC1_GND   (fitted = shield grounded; open = differential)</text>
     <text x="20" y="310" font-size="12" fill="var(--ink)">R7 1K OUTA→−A · R8 1K −A→GND · R9 DNI · R10 1K OUTA→−B · R11 1K −B→VIDEO_IN</text><text x="20" y="330" font-size="12" fill="var(--ink2)">→ VIDEO_IN = 2·(BNC1_SIG − BNC1_GND)</text>
     <text x="20" y="360" font-size="12" fill="var(--ink)">VIDEO_IN → C4 0.1 → U2-4 (LMH1981) · → R12 47R5 → LVL (CW)</text>`},
  {name:'2 · Level, clamp, equalisers', h:520, note:'Both equaliser stages are the same circuit. R15 is “DNI/0R” in the pick-and-place and 0R in the BOM: fitted, it joins H3-2 to U4A out. R41 is 30R in the BOM but 1K5 in the pick-and-place.', svg:()=>
    chip(380,70,110,'U4 EL2244',[['3 +A','NET00002 (H2-2)'],['2 −A','NET00011'],['5 +B','NET00041'],['6 −B','NET00040']],[['1 OUTA','NET00013'],['7 OUTB','NET00028'],['8','+5V'],['4','-5V']])+
    chip(380,260,110,'U3 GB4571',[['2 IN','NET00050 (C53)'],['4 CLAMP','BPOUT'],['1 HOLD','C12 1nF'],['3,5','GNDD']],[['7 OUT','R26 → H2-3'],['8','+5V'],['6','-5V']],'DC restorer')+
    `<text x="20" y="40" font-size="12" fill="var(--ink)">LVL 2K: CW ← R12 47R5 ← VIDEO_IN · ccw → R13 180R → GND · wiper → H2-1, C52 47/63</text>
     <text x="20" y="200" font-size="11.5" fill="var(--ink)">U4A −in: R22 3K57 → GND · R23 1K1 ← OUTA · R20 100R → EQ CW</text><text x="20" y="216" font-size="11.5" fill="var(--ink)">EQ ccw → R16 30R → GND · wiper: R21 3K32, C11 220p, R19 2K4+C14 220p, CV1 → GND (R18/C13 DNI)</text>
     <text x="20" y="232" font-size="11.5" fill="var(--ink)">U4B +in: R27 1K ← OUTA, R28 1K → GND · −in: R29 3K57, R30 1K1, R33 100R → RV1 → R41 → GND; RV1 wiper: R51, C30, R50+C32, CV2</text>
     <text x="20" y="420" font-size="11.5" fill="var(--ink)">C52 47/63 + C53 47/63 in series (NET00047) → U3-2 · H2: 1 = LVL wiper, 2 = U4-3, 3 = R26 ← U3-7</text>
     <text x="20" y="440" font-size="11.5" fill="var(--ink)">H3: 1 = U4-7 (OUTB), 2 = NET00042 → R36 75R → R14 → amps, 3 = U4-1 (OUTA) · R15 0R: NET00042 ↔ NET00013</text>
     <text x="20" y="470" font-size="11.5" fill="var(--ink2)">Live: EQ ${worldAt(SIM.t).eq} m → U4A ${eqGain(0,worldAt(SIM.t).eq/300,EQA).toFixed(2)}× DC, ${eqGain(3579545,worldAt(SIM.t).eq/300,EQA).toFixed(2)}× at 3.58 MHz</text>`},
  {name:'3 · Output amplifiers', note:'Each amplifier half drives two outputs. The four non-inverting inputs share NET00030 (R42 75R to ground, C8 DNI).', svg:()=>
    chip(300,60,110,'U5 EL2244',[['3 +A','NET00030'],['2 −A','R24/R25 1K'],['5 +B','NET00030'],['6 −B','R31/R32 1K']],[['1 OUTA','R37→BNC3 · R38→BNC4'],['7 OUTB','R39→BNC5 · R40→BNC6']])+
    chip(300,220,110,'U6 EL2244',[['3 +A','NET00030'],['2 −A','R34/R35 1K'],['5 +B','NET00030'],['6 −B','R43/R44 1K']],[['1 OUTA','R46→BNC7 · R47→BNC8'],['7 OUTB','R48→BNC9 · R49→BNC10']])+
    `<text x="20" y="380" font-size="12" fill="var(--ink)">BNC3 P1-75 OUT1 · BNC4 P1-80 OUT2 · BNC5 P1-37 OUT3 · BNC6 P1-34 OUT4</text><text x="20" y="400" font-size="12" fill="var(--ink)">BNC7 P1-17 OUT5 · BNC8 P1-22 OUT6 · BNC9 P1-5 OUT7 · BNC10 P1-12 OUT8 · all back-match resistors 75R</text>
     <text x="20" y="430" font-size="12" fill="var(--ink2)">P1 also carries AES1P…AES8N nets (pins 49–70) with no other node — the AES-card connector template.</text>`},
  {name:'4 · Sync detect & controller', note:'Port pins from the AT90CAN128 TQFP-64 pin-out. CSOUT and OEOUT are wired but never read. AV6201A.h still defines HSYNCH as PINC & BIT3, which is not where HSOUT goes.', svg:()=>
    chip(80,70,120,'U2 LMH1981',[['4 VIN','C4 ← VIDEO_IN'],['1 RSET','R17 10K, C7 DNI'],['3,6,11','+3V3'],['2,5,10','GNDD']],[['7 HSOUT','HSYNCH'],['8 VSOUT','VSOUT'],['9','FSOUT'],['12 CSOUT','CSOUT'],['13 BPOUT','BPOUT → U3-4'],['14 OEOUT','OEOUT']])+
    chip(560,70,150,'U8 AT90CAN128',[['49 PA2','HSYNCH'],['48 PA3','VSOUT'],['47 PA4','FSOUT'],['46 PA5','CSOUT'],['44 PA7','OEOUT'],['61 PF0/ADC0','AN_SLOTID'],['60 PF1','AN_BMID'],['59 PF2','AN_BMID2']],[['11 PB1','SYNCH → R62 750R → LED1 green'],['12 PB2','NO_SYNCH → R61 750R → LED2 red'],['30 TXCAN','CAND'],['31 RXCAN','CANR'],['32 PD7','LBK'],['23/24','X1 8 MHz'],['54–57','JTAG1']],'TQFP-64')},
  {name:'5 · CAN, IDs, power', note:'The rear-module ID lines AN_BMID/AN_BMID2 have pull-ups (R53/R52 1K to +3V3) but the firmware only samples ADC0.', svg:()=>
    chip(80,70,130,'U7 SN65HVD233',[['1 D','CAND'],['4 R','CANR'],['5 LBK','LBK (PD7)'],['3','+3V3']],[['7 CANH','P2-13'],['6 CANL','P2-11'],['2,8','GNDD']])+
    chip(520,70,130,'P2 midplane',[['1,3,5','+12V'],['2','-7V5'],['6','AN_SLOTID'],['13/11','CANH/CANL']],[['14','REF1 (n/c)'],['10','REF2 (n/c)'],['17–20','PSB_IN/OUT (n/c)'],['8,9,12,15,16','GNDD']])+
    `<text x="20" y="300" font-size="12" fill="var(--ink)">+12V → F1 RXE050 → FB1 → REG2 LM317 (R58 221 / R57 665 → +5.01 V) · → REG3 LM1117-3.3 → +3V3</text>
     <text x="20" y="320" font-size="12" fill="var(--ink)">−7V5 → F2 RXE050 → FB2 → REG1 LM337 (R56 221 / R55 665 → −5.01 V)</text>
     <text x="20" y="340" font-size="12" fill="var(--ink)">AN_SLOTID → R54 1K → +3V3 (frame resistor to GND) · AN_BMID → R53 1K · AN_BMID2 → R52 1K</text>`},
];
function viewSchem(m){
  window.__av6201Active=false; let i=0;
  m.innerHTML=card('Schematic set — REDRAWN from AV6201-iss3.net / .bom (net and pin names as in the netlist), not the original P-CAD schematic', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>`);
  const draw=()=>{ m.querySelector('#tabs2').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join(''); m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    const H=SHEETS[i].h||470; m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 ${H}" style="width:100%;min-width:640px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="848" height="${H-12}" fill="none" stroke="var(--line)"/><text x="840" y="${H-15}" text-anchor="end" font-size="10" fill="var(--ink2)">AV6201 ISS3 · sheet ${i+1}/${SHEETS.length} · REDRAWN 2026|59 — not the original CAD</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').innerHTML=SHEETS[i].note; };
  draw();
}

/* ---------------- software ---------------- */
function viewSoft(m){
  window.__av6201Active=true;
  m.innerHTML=CSS+`<div class="grid2">${card('main() and while(1) — the running step is highlighted', `<div id="loop"></div>`)}${card('Interrupts and the message flow', `<div id="isr"></div>`)}</div>
    <div class="grid2">${card('PARAMETER_UPDATE → CAN_TX_TIMER', `<div id="pu"></div>`)}${card('LMH1981_VIDEO_DETECT: the format table', `<div id="fmt"></div>`)}</div>
    <div class="grid2">${card('OID map (live)', `<div id="oid"></div>`)}${card('Port map, build and memory', `<div id="port"></div>`)}</div>
    ${card('Equaliser vs cable (from the netlist values)', `<canvas id="eqc"></canvas><p class="small muted">Green: U4A gain relative to DC at the EQ setting. Grey: cable loss for the chosen length (√f law ${inf()}). Orange: what reaches OUT relative to DC. A single shelf cannot follow √f exactly, so the match is best at the subcarrier.</p>`)}`;
  const draw=()=>{ const t=SIM.t, sn=snapAt(t), b=busyAt(t), g=segAt(t), w=worldAt(t), R=sim();
    const step = sn.mode!=='run'? (g? g.kind : sn.mode) : b? (t<b.l1?'l1':'l2') : 'idle';
    const box=(x,y,wd,h,txt,on,sub)=>`<rect x="${x}" y="${y}" width="${wd}" height="${h}" rx="6" fill="${on?'color-mix(in srgb,var(--accent) 30%,var(--panel2))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?2.5:1}"/><text x="${x+8}" y="${y+16}" font-size="11.5" font-weight="700" fill="var(--ink)">${txt}</text>${sub?`<text x="${x+8}" y="${y+30}" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
    m.querySelector('#loop').innerHTML=`<svg viewBox="0 0 420 430" style="width:100%;max-width:470px">
      ${box(10,10,190,38,'initialization()',step==='boot','ports, WDT 16K, adc_init')}${box(10,56,190,38,'DATA_INITIALIZATION · CAN_RX',step==='boot','ERROR LED on, LBK loop-back')}
      ${box(10,102,190,38,'10 × wait(3000)',step==='boot','26.25 ms')}${box(10,148,190,38,'100 × AD_CONVERTER_SETUP',step==='adc','slot ID, ≈5.4 ms each')}
      ${box(10,194,190,38,'ADDRESS_TABLE · DATA_SETUP',step==='setup','moduleAddress, CRCs')}${box(10,240,190,38,'CANinit · CAN_TX',step==='setup','timers start')}
      ${box(220,10,190,50,'while(1): WDR × 2',step==='idle'||step==='l1'||step==='l2')}
      ${box(220,70,190,56,'LMH1981_VIDEO_DETECT',step==='l1'||step==='l2','returns at once unless VSOUT_PIN == 0')}
      ${box(232,134,178,36,'loop 1: count 3 × HSOUT↓',step==='l1')}${box(232,176,178,36,'loop 2: 11 × HSOUT↑ ← FSOUT',step==='l2')}
      ${box(220,222,190,38,'REFRESH_LEDS',step==='idle','PB1 / PB2 from hsynch_detected')}
      ${box(220,268,190,56,'CAN_FUNCTIONS',step==='idle','PARAMETER_UPDATE · MOB_error · reboot')}
      ${box(220,332,190,38,'while(1) CLI();',step==='wdt','reboot_device: watchdog reset')}
      <path d="M200 260 C 210 260 210 35 220 35" fill="none" stroke="var(--ink2)" marker-end="url(#avar2)"/><path d="M410 300 C 418 300 418 35 410 35" fill="none" stroke="var(--ink2)" stroke-dasharray="4 3"/>
      <defs><marker id="avar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <text x="10" y="392" font-size="10" fill="var(--ink2)">Commented out in v100w.c: CS8416_READ_LOCK_ALL,</text><text x="10" y="405" font-size="10" fill="var(--ink2)">PROCESS_EQ_PUSHBUTTONS, PROCESS_MODES, READ_DIP_SWITCHES,</text><text x="10" y="418" font-size="10" fill="var(--ink2)">ALTERA_write, ALTERA_read (D6201A AES DA leftovers).</text></svg>`;
    m.querySelector('#isr').innerHTML=`<table class="kv">
      <tr><th>timer0_ovf_isr</th><td>every 1 ms (TCNT0 = 0x83, clk/64). When interrupt_counter == 1000: if can_data_rx &lt; 10, dashboard_count++ (3 → dashboard_initializing = NO), else YES and count = 0. Then can_data_rx = 0.</td></tr>
      <tr><th>timer1_ovf_isr</th><td>first 96 ms after CANinit (0xD120), then every 96 µs (0xFFF4). frame_count ≠ 0: CAN_TX_TIMER each tick (next frame once the previous one is out). Otherwise CAN_TX_TIMER after 1000 × slot_address ticks while initializing (slot ${sn.slotAddr}: ${SIM.fmtDur((C.TX_INIT_PER_SLOT*sn.slotAddr+1)*C.T1)}) or 10 001 ticks (${SIM.fmtDur((C.TX_HEART+1)*C.T1)}).</td></tr>
      <tr><th>can_rx_isr</th><td>MOB_error = YES first; on a good reception CANRX → can_data_rx++ → DASHBOARD_RESPONSE_SETUP (builds the reply, descriptors included) → CANTX frame 1. Any error leaves MOB_error set → CANinit in the next pass.</td></tr>
      <tr><th>Now</th><td class="mono">${(()=>{ const fr=R.can.filter(f=>f.t<=t).pop(); return fr? `last frame ${fr.dir==='rx'?'▼':'▲'} ${fr.label} @ ${SIM.fmtT(fr.t)}` : 'no CAN traffic yet'; })()}</td></tr></table>`;
    m.querySelector('#pu').innerHTML=`<svg viewBox="0 0 420 210" style="width:100%;max-width:470px">
      ${box(10,10,180,44,'hsynch_detected changed',sn.pc&&sn.ssc,'pr = VIDEO_DETECTION, pc = ssc = 1')}${box(230,10,180,44,'next pass: ssc == YES',sn.pc&&!sn.ssc,'pr = SIGNAL_STATUS (overwrites!)')}
      ${box(10,80,180,44,'idle: pc == NO',!sn.pc,'pr toggles 0 ↔ 1 every pass')}${box(230,80,180,44,'CAN_TX_TIMER',false,'REPORT_PARAM of pr · pc = NO')}
      <text x="10" y="150" font-size="11" fill="var(--ink)">Now: parameter_change ${sn.pc} · signal_status_change ${sn.ssc} · reports ${sn.restore?'paused (restore_start)':'enabled'}</text>
      <text x="10" y="170" font-size="10" fill="var(--ink2)">VIDEO_DETECTION lives for one pass (≈${C.PASS*1e6} µs) before SIGNAL_STATUS</text>
      <text x="10" y="184" font-size="10" fill="var(--ink2)">replaces it, so a Video Status change is only reported when a later</text><text x="10" y="198" font-size="10" fill="var(--ink2)">heartbeat happens to catch parameter_refresh = 1.</text></svg>`;
    const lb=R.busy.filter(x=>x.t0<=t).pop();
    m.querySelector('#fmt').innerHTML=`<table class="kv"><tr><th>video_format</th><th>format</th><th>notes</th></tr>${Object.entries(CODES).map(([k,v])=>`<tr><td class="mono">${k} (0b${(+k).toString(2).padStart(11,'0')})</td><td>${FMT[v[0]]}</td><td class="small">${v[1]}${lb&&lb.code===+k?' ← last read':''}</td></tr>`).join('')}<tr><td class="mono">anything else</td><td>unchanged</td><td class="small">detect = YES anyway (the NO_LOCK lines are commented out)</td></tr></table>
      <p class="small">Last completion: ${lb? `${SIM.fmtT(lb.t0)} → <span class="mono">${lb.code}</span>, loop 1 ${SIM.fmtDur(lb.l1-lb.t0)}, loop 2 ${SIM.fmtDur(lb.t1-lb.l1)}${lb.aligned?'':' (entered late: fewer than 3 HSOUT edges inside VSOUT, word misread)'}` : 'none yet'}. Each table value is the line count of that field minus 3 (NTSC 263/262, PAL 313/312, 1080p 1125) ${inf('arithmetic on the table')}.</p>`;
    const dc=dashAt(t), B=BRANDS[w.brand];
    m.querySelector('#oid').innerHTML=`<table class="kv"><tr><th>OID</th><th>name</th><th>in ParamOIDS</th><th>value DashBoard holds</th></tr>${[0x0105,0x0106,0x0102,0x010B,0x0104,0x0107,0x0201,0x0202,0x0400].map(o=>`<tr><td class="mono">${oidTxt(o)}</td><td>${OID[o].n}<div class="small muted">${OID[o].desc}</div></td><td>${B.oids.includes(o)?'yes':'no'}</td><td class="mono">${o===0x0201?alarmDecode(T21,dc.c[o]).txt+' (0x'+hx(dc.c[o]??0,4)+')':o===0x0202?alarmDecode(T22,dc.c[o]).txt+' (0x'+hx(dc.c[o]??0,4)+')':dc.c[o]!=null?String(dc.c[o]):'—'}</td></tr>`).join('')}
      <tr><td class="mono">FF.07 / FF.08</td><td>DataSafe restore start / end</td><td>no</td><td class="mono">restore_start ${sn.restore}</td></tr></table>
      <p class="small muted">Card Status values on the wire: REPORT_PARAM sends 0x0002 (fault) or 0x0000; GET_PARAM replies 0x0004 (fault) or 0x0001. Fault needs format == NO_LOCK <i>and</i> smpte_alarm_enabled.</p>`;
    m.querySelector('#port').innerHTML=`<table class="kv">
      <tr><th>PORTA (DDRA 0x00, pull-ups)</th><td>PA2 HSOUT · PA3 VSOUT · PA4 FSOUT (read) · PA5 CSOUT · PA7 OEOUT (unread)</td></tr>
      <tr><th>PORTB (DDRB 0xFF, PORTB 0x08)</th><td>PB1 SYNCH LED · PB2 NO SYNCH/ERROR LED</td></tr>
      <tr><th>PORTD</th><td>PD7 → SN65HVD233 LBK (CAN_RX = loop-back, CAN_TX = normal)</td></tr>
      <tr><th>PORTF / ADC</th><td>ADC0 AN_SLOTID (ADMUX 0, 104 µs) · PF1/PF2 AN_BMID/AN_BMID2 never sampled</td></tr>
      <tr><th>Watchdog</th><td>WDTCR = 0x08, WDR in every loop, wait() and the busy-wait</td></tr>
      <tr><th>Build</th><td>ICCAVR 7.15, -DAT90CAN128, v100w.prj / V100W.mak; zeuspack /v 1.01 /c 0.0.255.255, /p AV6201A /P 9231 (both WBS and Cobalt configs)</td></tr>
      <tr><th>Code size</th><td>text 0x5A32 = 23,090 bytes (V100W.mp); application 0x0000–0x1DFFF, top 8 KB = OGP bootloader</td></tr>
      <tr><th>This build</th><td>common.h <span class="mono">#define ${B.def}</span> → Product “${B.product}”, Supplier “${B.supplier}”; ${B.cfg}</td></tr></table>`;
    const {c,w:W}=SIM.canvas(m.querySelector('#eqc'),200); const x0=40, pw=W-x0-10, F=[1e5,1e7], X=f=>x0+(Math.log10(f)-5)/2*pw, Y=db=>100-db*8;
    c.strokeStyle=SIM.css('--grid'); c.fillStyle=SIM.css('--ink2'); c.font='10px '+SIM.css('--mono'); [-10,-5,0,5,10].forEach(d=>{ c.beginPath(); c.moveTo(x0,Y(d)); c.lineTo(W-10,Y(d)); c.stroke(); c.fillText(d+' dB',2,Y(d)+3); });
    [1e5,1e6,3.58e6,1e7].forEach(f=>{ c.beginPath(); c.moveTo(X(f),10); c.lineTo(X(f),190); c.stroke(); c.fillText(f>=1e6?(f/1e6)+' MHz':(f/1e3)+' kHz',X(f)+2,196); });
    const p=w.eq/300, curve=(fn,col)=>{ c.strokeStyle=col; c.lineWidth=1.6; c.beginPath(); for (let i=0;i<=200;i++){ const f=Math.pow(10,5+2*i/200), v=fn(f); i?c.lineTo(X(f),Y(v)):c.moveTo(X(f),Y(v)); } c.stroke(); };
    curve(f=>20*Math.log10(eqGain(f,p,EQA)/eqGain(0,p,EQA)), SIM.css('--accent')); curve(f=>-cableDb(w.src.len,f), SIM.css('--ink2')); curve(f=>20*Math.log10(eqGain(f,p,EQA)/eqGain(0,p,EQA))-cableDb(w.src.len,f), SIM.css('--warn'));
    c.fillStyle=SIM.css('--ink'); c.fillText(`EQ ${w.eq} m · cable ${w.src.len} m · max boost at 3.58 MHz ${EQ_MAX_BOOST.toFixed(2)} dB (EQ pot fully CW)`, x0+4, 14);
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
const FINDINGS = [
  ['The pushbutton and FPGA code is one big comment', 'AV6201A.c: the block comment that opens before <span class="mono">PROCESS_EQ_PUSHBUTTONS</span> is never closed until “THIS IS THE END OF THE ALTERA SUBROUTINES */”, so READ_SWITCHES, TRANSLATE_SWITCHES, DEBOUNCE_PUSHBUTTONS, TRANSLATE_EQ_PUSHBUTTONS and ALTERA_write do not exist in the build. The README says the AVR “handles front-edge EQ pushbuttons”; it does not. The file header still reads “D6201A.C”.'],
  ['The archived build is the Cobalt 9231 image', 'common.h has <span class="mono">#define COBALT</span> (WARD_BECK and ROSS_VIDEO commented), and Dashboard.lis (2009|42-11-05) shows the “Cobalt Digital” and “9231” strings compiled. Cobalt’s ParamOIDS_Message has 7 OIDs and leaves out 1.4 Website, yet MESSAGE_CREATOR_WEBSITE_RESPONSE still returns “www.ward-beck.com”.'],
  ['“Ross ADC-8432” is the D6203A, not this card', 'The README lists Ross ADC-8432 as an OEM name. ross_ztcpack.txt in this tree is the D6203A file: <span class="mono">/i D6203_TEST.hex /o bin/adc-8432_v1_03.bin /p D6203A /P ADC-8432 /P 9345</span>. ADC-8432 is the D6203A A/D converter (opengear.js). wbs_ztcpack and cobalt_ztcpack both say <span class="mono">/p AV6201A /P 9231</span>.'],
  ['Notify on Card Fault is off by default and never saved', 'smpte_alarm_enabled starts at NO; SET_PARAM 4.0 writes it, but SAVE_INFORMATION_EEPROM / RESTORE_INFORMATION_EEPROM sit inside a comment (and save “calibration” and “tone_generation”, D6203A variables). After any reboot the card reports Card Status “Locked” even with no input — only Video Status shows the loss.'],
  ['A Video Status change is overwritten one pass later', 'PARAMETER_UPDATE sets parameter_refresh = VIDEO_DETECTION and signal_status_change = YES when hsynch_detected changes. On the next pass the <span class="mono">else if (signal_status_change == YES)</span> branch runs even though parameter_change is still YES, and replaces it with SIGNAL_STATUS. The next REPORT_PARAM is therefore Card Status; Video Status reaches DashBoard only when a later heartbeat happens to fire while parameter_refresh (toggling every idle pass) is 1, or on a GET_PARAM.'],
  ['Two encodings for “Locked”', 'CAN_TX_TIMER sends Card Status 0x0000 for OK and 0x0002 (BIT1) for a fault; the GET_PARAM reply sends 0x0001 (BIT0) and 0x0004 (BIT2). The ALARM_TABLE descriptor (entry = bit &lt;&lt; 8 | severity) has bit 0 “Locked”, bits 1 and 2 “No Video Detected”. Both fault values decode, but a broadcast OK sets no bit at all '+inf('paramdef.h “alarm encoded as a bit field” and the D6203A tables')+'. Video Status is consistent: 1 &lt;&lt; format against entries 0x0002, 0x0100 … 0x0700.'],
  ['Unknown line counts still count as video', 'LMH1981_VIDEO_DETECT ends with <span class="mono">else { detect = YES; }</span> (the NO_LOCK lines are commented out). A misread word keeps the old format and resets the loss counter. That matters when the loop enters VSOUT late — for example when can_rx_isr is busy building a descriptor at the start of a field (try Open / rescan and zoom on a field start).'],
  ['Loss of video depends on the loop speed', 'NO_VIDEO_CONSTANT is 1000 <i>passes</i>, not a time. At ≈'+C.PASS*1e6+' µs per idle pass that is ≈30 ms, 1.8 NTSC fields or 1.5 PAL fields between catches. A loop about 1.5× faster would make PAL video drop out between fields '+inf('cycle count from the .lis')+'. NO_HSYNCH_CONSTANT (12 500 iterations ≈ 42 ms) is the only other timeout.'],
  ['The format word is read with a busy-wait every field', 'Each field the loop spends up to 3 lines waiting for HSOUT edges inside VSOUT and then 11 lines shifting FSOUT (≈0.85 ms, ≈5 % of the CPU). The values in the table equal lines per field minus 3. LMH1981_SYNCH_DETECT is never called; CSOUT (PA5) and OEOUT (PA7) are wired but unread; AV6201A.h still defines HSYNCH as PINC & BIT3.'],
  ['R15 0R defeats the EQ jumper', 'In AV6201-iss3.net R15 joins NET00042 (H3-2, the output select) to NET00013 (U4A out), and the ISS3 BOM fits it as 0R (the pick-and-place says “DNI/0R”). With R15 fitted H3 OUT is redundant and H3 IN shorts the U4A and U4B outputs together. The card-edge drawing still shows an “EQ Fixed Switch”.'],
  ['BOM and pick-and-place disagree', 'R41 (U4B ground leg, the twin of R16 30R) is 30R in the BOM and 1K5 in the PNP; R14 is 0R in the BOM and 10R in the PNP; the BOM part for U7 is spelled “SN65HDV233D”.'],
  ['Level range is wider than the manual says', 'The LVL pot is a 2K multi-turn between R12 47R5 and R13 180R: wiper ratio 0.081…0.979. With U4A’s DC gain of ≈1.8 the overall gain spans about −17 to +5 dB around unity; the manual quotes ±3 dB '+inf('assumes nominal = unity gain')+'. The EQ also moves the DC gain (1.82 → 2.12, +1.3 dB), so EQ and level interact.'],
  ['Card-edge drawing vs the board', 'AV6201-card-edge.cdr puts ERROR LED above SYNCH LED and shows a “Clamp Switch” and “EQ Fixed Switch”. On ISS3 LED1 (SYNCH, green) is above LED2 (red), as the manual says, and clamp and EQ are jumpers H2 and H3 inside the card. Level and EQ are blue multi-turn trimmers reached by extension rods (photo; “Brkts&Rods” quote, 2013|46).'],
  ['Manual vs hardware and firmware', 'The LED table calls NO SYNCH green (BOM: red LED2; Fig. 1: “RD”). Supplier is shown as “Ward-Beck Systems Ltd.” (firmware: “Ward-Beck Systems”), Software Rev as “##” (firmware: “1.01”). The DashBoard table lists only Card Status, not Video Status or Notify on Card Fault. BAL “selects between a balanced and differential input”. Ordering information lists an “AV6201AUM Universal Analog Audio Distribution Amplifier User Manual”.'],
  ['Rear-module drawing labels position 2 “IN”', 'AV6201-REAR-MODULES.pdf marks positions 1 and 2 “IN” on T6201 and T6301 and names MF6220 as the frame; the netlist has BNC2_SIG (P1-92) with no other node and the manual says N/C and DFR-8310/8320. The firmware never reads the rear-module ID (AN_BMID/AN_BMID2 on PF1/PF2).'],
  ['Menus full of another card', 'Menu set “Control” has two menus both named “Card Settings”. The first serves Menu2OID_Message: 18 OIDs (5.6, 2.16, 2.20, 6.1 … 6.27, 4.1–4.7) from an SDI/Dolby card, all answered CANRESP_UNSUPPORTED. Menu0OID lists 1.7, whose handler is commented out; Dashboard.c also carries “External AES Input”, “Locked-Dolby E”, “VANC Detected” and “Raw Data / Dolby AC-3 / PCM” strings, and P1 carries unused AES1–AES8 nets.'],
  ['Timer comments are wrong by 1000×', 'timer0_ovf_isr reloads “for 100us” but the period is 1 ms; timer1 reloads marked “96 ms” are 96 µs (only the first, 0xD120, is 96 ms). TX_INITIALIZE = 1000 × slot_address, so while DashBoard is initializing a card in slot 20 reports every 1.9 s and one in slot 1 every 96 ms.'],
  ['Solder mask colour', 'The gerber note says “SOLDER MASK: GREEN”; the photo of the ISS3 card shows black. The silkscreen file was re-issued 2012|45-08-27, four years after the copper.'],
  ['ENABLE_MODE’s condition does not match its comment', 'CAN_FUNCTIONS calls ENABLE_MODE when <span class="mono">(CANGSTA & (BIT0|BIT2)) == 0</span>, i.e. when the controller is disabled and not error-passive; its comment says “if previously in error passive mode”. ENABLE_MODE also clears frame_count, which would cut off a multi-frame reply '+inf('only after STANDBY_MODE (bus-off)')+'.'],,
  ['Artwork 2026|59: card edge and rear modules now from CorelDRAW', 'Card edge from '+SIM.src(ART_SRC+'AV6201-card-edge.cdr','AV6201-card-edge.cdr')+' (2008-05-12); T6201, T6301 and T6401 from '+SIM.src(ART_SRC+'AV6201-REAR-MODULES.cdr','AV6201-REAR-MODULES.cdr')+' (2008-08-07). The later '+SIM.src('#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/AV6201A - rear module options.cdr','AV6201A - rear module options.cdr')+' (2012-01-16) shows only T6301A and T6401A and labels T6301A position 2 “Not Connected” — the 2012|45 guide fixes the “IN” slip above; T6201 (10-slot DFR-8310 frame) is not in it. It also numbers the outputs differently: OUT 1–4 down the left column and OUT 5–8 down the right, where the 2008|41 sheet (and this simulation, following it and the netlist order) alternates OUT1/OUT2 across each row — a customer wiring from the 2012 guide would find OUT2 where they expect OUT5. On the 2008 sheet T6201 shades BNCs 1, 2, 9 and 10 (IN, IN, OUT7, OUT8) darker than the rest, while T6301 and T6401 draw all ten alike; nothing in the netlist singles out 9 and 10 — a drawing leftover. The card-edge art puts ERROR above SYNCH, the reverse of the ISS3 board (see above), and shows Clamp and EQ Fixed as push-buttons where ISS3 has jumpers H2/H3.']
];
const ASSUME = [
  `Idle pass ≈ ${C.PASS*1e6} µs: ≈216 cycles counted through main, LMH1981_VIDEO_DETECT (early return), REFRESH_LEDS and CAN_FUNCTIONS in the .lis files, plus ≈10 % timer1 ISR load ${inf()}.`,
  `LMH1981 timing (VSOUT ≈3 lines from the broad pulses, HSOUT width = sync width, BPOUT 5.6–8.6 µs, the FSOUT word clocked out on HSOUT) ${inf('the way LMH1981.c samples the pins; the data sheet is not in the archive')}.`,
  `Cable loss ∝ √f, ${LOSS.toFixed(2)} dB/100 m at 3.58 MHz so that the EQ pot’s full boost (${EQ_MAX_BOOST.toFixed(2)} dB, from the netlist) equals the manual’s 300 m ${inf()}; CV1/CV2 at 10 pF ${inf()}.`,
  `Hum: common-mode at mains rate; CMRR ${CMRR} dB; a keyed clamp leaves only the in-line tilt ${inf()}. Amplifier clipping at ±${CLIP} V ${inf()}.`,
  `DashBoard pacing (0.6 ms between requests, optional poll every ${C.POLL} s), descriptor build time in the ISR (${C.ISR_BUILD*1e3} ms) and the phases of the timers in the first second ${inf()}.`,
  'Waveforms: 75 % colour bars (stylised), SMPTE 170M / BT.470 sync and burst timing; PAL line numbers and V-switch are simplified.',
];
function viewFindings(m){
  window.__av6201Active=false;
  m.innerHTML=card('What the AV6201 and its firmware are up to', `<ol>${FINDINGS.map(([h,b])=>`<li style="margin-bottom:8px"><b>${h}.</b> ${b}</li>`).join('')}</ol>`)+
    card('Assumptions in this simulation', `<ul class="small">${ASSUME.map(a=>`<li>${a}</li>`).join('')}</ul>`)+
    card('Sources and artwork', `<ul class="small mono">
      <li>${SRC}Software/atmel/v101/ — v100w.c, AV6201A.c/.h, LMH1981.c/.h, ADC.c/.h, CAN.c/.h, Dashboard.c/.h, common.h, paramdef.h, *.lis, V100W.mp, *_ztcpack.txt</li>
      <li>${SRC}Software/AV6201A SOFTWARE HISTORY.xls — V100 ${SIM.year(2008)}-12-15 (Cobalt 9231), V101 ${SIM.year(2009)}-11-10 (bootloader + DataSafe)</li>
      <li>${SRC}PCB/AV6201-iss3.net, .bom, .pnp</li>
      <li>AV6201-ISS3 - #Gerbers.zip → assets/av6201-copper.png (TOP + TSM), av6201-silk.png (TSS, third-party logo blanked)</li>
      <li>${SIM.src(ART_SRC+'AV6201-card-edge.cdr','AV6201-card-edge.cdr')} → assets/av6201-edge.svg · ${SIM.src(ART_SRC+'AV6201-REAR-MODULES.cdr','AV6201-REAR-MODULES.cdr')} → assets/av6201-rear-T6201/T6301/T6401.svg (CorelDRAW via Inkscape)</li>
      <li>${SRC}Photos/AV6201A-Colour.jpg → mask and trimmer colours</li>
      <li>#OPEN GEAR - #Engineering/…/openGear #Manuals #OBSOLETE/AV6201A Manual.pdf (issue 1, ${SIM.year(2009)}-01-23) → tutorial, controls, rear modules</li>
      <li>Slot-ID ladder: OpenGear Frame Address ID.xls (as used in opengear.js)</li></ul>`);
}

/* =====================================================================
   REGISTER
   ===================================================================== */
const stdNow = () => STD[worldAt(SIM.t).src.std];
SIM.register({
  id:'av6201', product:'AV6201', name:`AV6201 · openGear analog video DA (${SIM.year(2008)})`, year:2008,
  folder:'#OPENGEAR #SERIES/AV6201 - #Master #OPENGEAR', family:'openGear',
  summary:'openGear composite-video distribution amplifier (sold as AV6201A and Cobalt 9231): differential input, GB4571 clamp, two-stage cable equaliser, eight 75 Ω outputs. An AT90CAN128 busy-waits on an LMH1981 sync separator once per field and reports to DashBoard over CAN. Modelled pass by pass from the V101 firmware and the ISS3 netlist.',
  highlights:['Fields, lines and sync pulses through the analog path (IN vs OUT, cable, EQ, hum, clamp)','LMH1981_VIDEO_DETECT busy-wait and the 11-bit line-count word','Real ISS3 gerber card, card edge, T6201/T6301/T6401 rear modules and DashBoard-style window','PARAMETER_UPDATE, heartbeat and DashBoard messages on a 1 Mbit/s CAN timeline','Findings: Cobalt build, commented-out pushbuttons, R15 vs the EQ jumper, unsaved Notify'],
  depth:'Full model', duration:1,
  stepUnits:[{label:'1 field', period:()=>stdNow().H*stdNow().hl/4, phase:()=>PH},{label:'1 line', period:()=>stdNow().H, phase:()=>PH},{label:'½ line (V-interval pulse)', period:()=>stdNow().H/2, phase:()=>PH},
    {label:'1 main-loop pass', period:()=>C.PASS},{label:'1 timer1 tick (96 µs)', period:()=>C.T1},{label:'1 subcarrier cycle', period:()=>1/stdNow().fsc},{label:'1 ms', period:()=>1e-3}],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.04,'2 fields'],[0.002,'2 ms (≈31 lines)'],[0.0003,'≈5 lines'],[0.00007,'1 line'],[0.00001,'10 µs (sync + burst)'],[0.000001,'1 µs (subcarrier)']], defaultZoom:2,
  tabs:[{id:'sim',label:'Simulator',render:viewSim},{id:'tutorial',label:'Tutorial',render:viewTutorial},{id:'second',label:'One second',render:viewSecond},{id:'block',label:'Block diagram',render:viewBlock},{id:'schematic',label:'Schematics',render:viewSchem},{id:'software',label:'Software',render:viewSoft},{id:'findings',label:'Findings',render:viewFindings}],
});
})();
