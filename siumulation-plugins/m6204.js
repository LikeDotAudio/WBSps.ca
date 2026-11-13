/* =====================================================================
   M6204A — openGear HD/SD-SDI 4-group AES audio embedder ("MD-SDI Embedded Audio Multiplexer")
   Ward-Beck Systems, firmware 1.0.0.0 (2009|42) … 3.0.0.0 / v300 (2012|45); M6204AE encoder variant;
   Dolby encoder R&D (RD6). Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all under #OPENGEAR #SERIES/M6204 - #Master #OPENGEAR/):
   - M6204 - #Engineering/M6204A/Software/atmel/v300/
       v100w.c       main(), boot waits, slot-ID averaging, PROCESS_AUDIO_INFORMATION, REFRESH_LEDS,
                     ALTERA_SORT (the live 2-bit router + reset/swap logic; the 6-bit version is commented out)
       M6204A.c      SD_RESET (called from timer0_ovf_isr), READ_DIP_SWITCHES, PROCESS_DIP_SWITCHES
       M6204.h       LED port macros, EMB_AUDIO/AES_AUDIO/SRC_AUDIO/MUTE_AUDIO, RESET_VECTOR_CONSTANT,
                     SD_AUDIO_STABLE_COUNTER_CONSTANT, leftovers (MODE1–6, DOLBY1–4 LEDs)
       altera.c/.h   ALTERA_read_write (16 bytes, CLI, FSYNCH PB4 / CLK PB5 / DATA PB6 / in PB7), ALTERA_RESET
       altera.lis    cycle count of ALTERA_read_write_data (21 cycles per bit)
       cs84xx.c/.h   init_CS8416, CS8416_READ_LOCK_ALL (register 0x0C of eight receivers)
       gennum.c      PROCESS_SDI_LOCK_STATUS (GS1559 build)
       CAN.c         timer0_ovf_isr (1 ms, SD_RESET), timer1_ovf_isr (96 µs, TX_HEARTBEAT 4000), CANinit
       ADC.c         adc_init, AD_CONVERTER_SETUP, ADDRESS_TABLE (and the #ifdef MF6220 table)
       Dashboard_b.c (the file the makefile links): every OID, PARAMETER_UPDATE, CAN_TX_TIMER,
                     DASHBOARD_RESPONSE_SETUP, MESSAGE_CREATOR_PARAMETER_24/25/2F/22/33/43/52/54, SAVE/RESTORE
       Dashboard.h, common.h, paramdef.h, V100W.mak, V100W.mp, wbs_ztcpack.txt
   - M6204 - #Engineering/M6204A/Software/altera/v300/  M6204A.qsf (pins, SignalTap), m6204a.bdf (top level,
       traced with a small netlister), audio_router.vhd, mux_active_groups.vhd, shift_in_128.vhd,
       vc_299m_291mo_new_2.v (HD 299M/291M embed core: switching lines, 31-word packets, control packets),
       HD_mux.bdf, SD_mux.bdf, hd_demux.bdf, sd_demux.bdf
   - M6204 - #Engineering/M6204A/M6204A operational  info.doc (2009|42-02-25 register map), M6204A dip switch.pdf,
       M6204A SOFTWARE HISTORY.xls; M6204AE/M6204AE SOFTWARE HISTORY.xls
   - M6204 - #Engineering/PCB/M6204A-iss3.net/.bom/.pnp; OBSOLETE/M6204A.net (ISS1), M6204A-iss2.net;
       WORKING/M6204A-iss4.net; GERBERS/M6204A-ISS3.TOP/.TSM/.TSS/.BRD → assets/m6204-card-copper.png,
       m6204-card-silk.png (120 dpi, third-party logo in the silk blanked)
   - M6204 - #Engineering/M6204A Rear Modules.pdf (T6301A, T6308A), M6204A-T6305.cdr, M6204-card-edge.cdr,
       M6204-FUNCTIONAL.cdr (converted with Inkscape), M6204C700 REAR MODULE.pdf; Photo/*.jpg
   - M6204 - #Engineering/m6204_dd/CAT CARDS PINOUTS.xlsx; M6204 - Dolby Encoder #RD #RD6/Ali/
       Cat559_Implementation_manual_DRAFT_20080208.pdf (latency, I/O), Encoder Schedual.xlsx
   - T6308 - #Master/T6308 - #ENGINEERING/T6308 - #PCB/T6308.net; t6301.js (T6301 pinout and geometry)
   - opengear.js (CAN frame timing, frame-controller behaviour), demux4.js (SDI line / HANC model),
     aa6201a.js (slot-ID check method)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const infT = s => `<span class="tag-inf" title="${String(s).replace(/"/g,'&quot;')}">inferred</span>`;
const hx = (n,w) => (n>>>0).toString(16).toUpperCase().padStart(w||2,'0');
const bn = (n,w) => (n>>>0).toString(2).padStart(w||8,'0');
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
function deep(o){ return JSON.parse(JSON.stringify(o, (k,v)=> v===Infinity? '__inf' : v), (k,v)=> v==='__inf'? Infinity : v); }

/* ---------------- timing constants ---------------- */
const F_CPU = 8e6;                          // v100w.c "Crystal: 8.0000Mhz"; BOM X1 8MHz
const C = {
  WAIT1: 7/F_CPU,                           // one wait() iteration: wdr, subi, sbci, cp/cpc, brne ≈ 7 cycles — inferred
  T0: 1e-3,                                 // timer0: clk/64, TCNT0 = 0x83 → 125 counts = 1 ms
  T1: 12*64/F_CPU,                          // timer1: reload 0xFFF4 → 12 counts × 8 µs = 96 µs
  TX_HEART: 4000, TX_FRAMES: 10,            // CAN.c TX_HEARTBEAT (4000; was 10000 on the D6203A), TX_FRAMES
  XFER: 16*(8*21+22)/F_CPU,                 // ALTERA_read_write: 16 × (8 bits × 21 cycles + call) ≈ 0.38 ms, interrupts off
  XFER_BIT: 21/F_CPU,
  CS_READ: 8*(32*12+70)/F_CPU,              // CS8416_READ_LOCK_ALL: 8 × (4 bytes bit-banged) ≈ 0.45 ms — inferred cycle estimate
  RESET_VEC: 10, SD_STABLE: 35, HD_STABLE_PASSES: 10*20, COUNT_MAX: 200,
  CAN_BIT: 1e-6, STUFF: 1.1,                // CANBT1/2/3 = 00/04/12 at 8 MHz → 1 Mbit/s
  SDI_LOCK: 0.004,                          // GS1574A + GS1559 lock — inferred
  GRP_DET: 0.040,                           // group detectors need ≈ 1 frame of packets — inferred
  CS_LOCK: 0.020,                           // CS8416 PLL lock — inferred (data sheet not in archive)
  MFC_GAP: 0.0004,                          // frame controller request spacing — inferred (as opengear.js)
  EE_WRITE: 0.0085,                         // AVR EEPROM byte write — data-sheet value, inferred
  FPGA_CFG: 0.35,                           // EP2C35 from EPCS16 (active serial) — inferred
};
C.WAIT3000 = 3000*C.WAIT1;                  // ≈ 2.63 ms
C.SLOT_SAMPLE = 2*C.WAIT3000 + 104e-6;      // AD_CONVERTER_SETUP: WAIT → 2 × wait(3000) → RESET → 104 µs conversion
/* Main loop of v100w.c, one pass. Durations are cycle estimates — inferred, except ALTERA_read_write (listing). */
const STEPS = [
  ['READ_DIP_SWITCHES · PROCESS_DIP_SWITCHES', 14e-6, 'dip_switches = MIRROR(PINC); audio_groups_enabled from bits 1/0; cascade bits only if DIP mode and DashBoard disabled'],
  ['CS8416_READ_LOCK_ALL', C.CS_READ, 'eight bit-banged reads of register 0x0C (CS1…CS8 on PD1–PD4, PE0–PE3); Astatus = INVERT_DATA(…)'],
  ['ALTERA_read_write (CLI)', C.XFER, '128 bits out (bit 0 first) and 128 bits in, FSYNCH PB4, CLK PB5, DATA PB6 → FPGA, PB7 ← FPGA; interrupts off'],
  ['PROCESS_SDI_LOCK_STATUS', 4e-6, 'sdi_format = SD_FORMAT / HD_FORMAT / NO_LOCK from smpte, sd, hd (decoded by the previous ALTERA_SORT)'],
  ['PROCESS_AUDIO_INFORMATION', 18e-6, 'aes1_lock … aes8_lock = NO / PCM / DOLBY_AC3 / DOLBY_E / COMPRESSED'],
  ['REFRESH_LEDS', 40e-6, 'SD/HD/ERR, AES1–8, CASCADE; embedded aes_lock1…8 from audio_group_detect (HD) or Emb_Astatus (SD)'],
  ['CAN_FUNCTIONS', 12e-6, 'MOb error check; replies are sent from the ISRs'],
  ['ALTERA_SORT', 70e-6, 'emb_aesN from emb_aesN_cha and auto_src[]; ALTERA_BUFFER_out[0..1], [12] = 3, [14] = swap; decode ALTERA_BUFFER_in; reset/swap logic'],
  ['SAVE_INFORMATION_EEPROM (if save_settings)', 0, '17 eepromWriteByte calls'],
];
const PASS_T = STEPS.reduce((a,s)=>a+s[1],0);

/* ---------------- video formats (what the FPGA can lock and report) ---------------- */
const VF = {
  sd525:    {name:'SD 525i 59.94', std:1, clk:27e6, spl:1716, act:1440, hdr:4, lines:525, fr:30000/1001, sw:[10,273], bits:{smpte:1,sd:1,l525:1,fr60:1,l6060:0}, rep:'SD 525'},
  sd625:    {name:'SD 625i 50', std:1, clk:27e6, spl:1728, act:1440, hdr:4, lines:625, fr:25, sw:[6,319], bits:{smpte:1,sd:1,l625:1,fr50:1}, rep:'SD 625'},
  hd1080i59:{name:'HD 1080i 59.94', std:2, clk:74.25e6/1.001, spl:2200, act:1920, hdr:8, lines:1125, fr:30000/1001, sw:[7,569], ctl:[9,571], bits:{smpte:1,hd:1,l1080:1,fr60:1,l6060:0}, rep:'HD 1080i/59.94'},
  hd1080i50:{name:'HD 1080i 50', std:2, clk:74.25e6, spl:2640, act:1920, hdr:8, lines:1125, fr:25, sw:[7,569], ctl:[9,571], bits:{smpte:1,hd:1,l1080:1,fr50:1}, rep:'HD 1080i/50'},
  hd1080i60:{name:'HD 1080i 60', std:2, clk:74.25e6, spl:2200, act:1920, hdr:8, lines:1125, fr:30, sw:[7,569], ctl:[9,571], bits:{smpte:1,hd:1,l1080:1,fr60:1,l6060:1}, rep:'HD 1080i/60'},
  hd720p59: {name:'HD 720p 59.94', std:2, clk:74.25e6/1.001, spl:1650, act:1280, hdr:8, lines:750, fr:60000/1001, sw:[7], ctl:[9], bits:{smpte:1,hd:1,l720:1,fr60:1,l6060:0}, rep:'HD 720p/59.94'},
  hd720p60: {name:'HD 720p 60', std:2, clk:74.25e6, spl:1650, act:1280, hdr:8, lines:750, fr:60, sw:[7], ctl:[9], bits:{smpte:1,hd:1,l720:1,fr60:1,l6060:1}, rep:'HD 720p/60'},
  hd720p50: {name:'HD 720p 50', std:2, clk:74.25e6, spl:1980, act:1280, hdr:8, lines:750, fr:50, sw:[7], ctl:[9], bits:{smpte:1,hd:1,l720:1,fr50:1}, rep:null},
};
const DID = {sd:['2FF','1FD','1FB','2F9'], hd:['2E7','1E6','1E5','2E4'], hdc:['1E3','2E2','2E1','1E0']};   // vc_299m GROUPn_DID; SMPTE 272M (SD) — SD DIDs from the standard, inferred
const GCOL = ['--accent','--accent2','--warn','--bad'];
const SEL_NAME = ['EMB (cascade)','AES','SRC','MUTE'];       // M6204.h EMB_AUDIO 0, AES_AUDIO 1, SRC_AUDIO 2, MUTE_AUDIO 3 = audio_router sel "00/01/10/11"
const LOCK_NAME = ['NO','PCM','DOLBY_AC3','DOLBY_E','COMPRESSED'];
const KIND = {pcm:{n:'PCM 48 kHz (house-locked)', fmt:0, comp:0, lk:1, ch:'P'}, pcm441:{n:'PCM 44.1 kHz (asynchronous)', fmt:0, comp:0, lk:1, ch:'P'},
              ac3:{n:'Dolby Digital (AC-3) bitstream', fmt:1, comp:1, lk:2, ch:'D'}, dolbye:{n:'Dolby E bitstream', fmt:2, comp:1, lk:3, ch:'E'}};
const SLOT_R = [100000,30900,15000,9760,6980,5360,4320,3570,3010,2550,2210,1910,1650,1470,1270,1130,1000,887,787,681];  // Frame Address ID.xls (via opengear.js)
const ADDR_TH = [1023,1000,980,948,915,883,851,820,788,755,725,692,658,629,593,563,532,502,471,435,406];               // ADC.c ADDRESS_TABLE (#ifndef MF6220)
function slotAdc(s){ const R=SLOT_R[s-1]; return Math.min(1023, Math.floor(1024*R/(R+1000))); }
function ADDRESS_TABLE(v){ for (let i=0;i<20;i++) if (v>ADDR_TH[i+1] && v<=ADDR_TH[i]) return i+1; return 21; }
function slotMargin(s){ const a=slotAdc(s); return Math.min(a-ADDR_TH[s], ADDR_TH[s-1]-a); }

/* ---------------- rear modules ---------------- */
/* pos: [label, role, edge pin]. role: sdiin, sdiout1, sdiout2, aesN (card input N), meta, nc.
   T6301A / T6308A: M6204A Rear Modules.pdf + T6308.net + t6301.js; T6305: M6204A-T6305.cdr; C700: M6204C700 REAR MODULE.pdf */
const REARS = {
  T6301:{name:'T6301A — SDI IN, 7 × AES IN, 2 × SDI OUT', id:'3K57 / 5K36', src:'M6204A Rear Modules.pdf · T6301-iss4.net',
    pos:[['SDI IN','sdiin','97'],['AES IN7','aes7','92'],['AES IN1','aes1','75'],['AES IN2','aes2','80'],['AES IN3','aes3','37'],['AES IN4','aes4','34'],['AES IN5','aes5','17'],['AES IN6','aes6','22'],['SDI OUT1','sdiout1','5'],['SDI OUT2','sdiout2','12']]},
  T6308:{name:'T6308A — SDI IN, 8 × AES IN, 1 × SDI OUT', id:'3K57 / 1K65', src:'M6204A Rear Modules.pdf · T6308.net',
    pos:[['SDI IN','sdiin','97'],['AES IN7','aes7','92'],['AES IN1','aes1','75'],['AES IN2','aes2','80'],['AES IN3','aes3','37'],['AES IN4','aes4','34'],['AES IN5','aes5','17'],['AES IN6','aes6','22'],['SDI OUT','sdiout1','5'],['AES IN8','aes8','51']]},
  T6305:{name:'T6305 drawing — 8 AES + META DATA (draft)', id:'3K57 / 2K55', src:'M6204A-T6305.cdr (labels as drawn)',
    pos:[['SDI IN','sdiin','97'],['AES IN7','aes7','92'],['AES IN1','aes1','75'],['AES IN2','aes2','80'],['AES IN3','aes3','37'],['AES IN4','aes4','34'],['AES IN5','aes5','17'],['AES IN8','nc','22'],['AES IN8','nc','5'],['META DATA','meta','50/52']]},
  C700:{name:'M6204AC700 on T6301 — one AES input', id:'3K57 / 5K36', src:'M6204C700 REAR MODULE.pdf',
    pos:[['SDI IN','sdiin','97'],['NOT USED','nc','92'],['NOT USED','nc','75'],['NOT USED','nc','80'],['NOT USED','nc','37'],['NOT USED','nc','34'],['AES IN','aes5','17'],['NOT USED','nc','22'],['SDI OUT1','sdiout1','5'],['SDI OUT2','sdiout2','12']]},
};
function rearHasAes(rear, i){ return REARS[rear].pos.some(p=>p[1]==='aes'+(i+1)); }

/* ---------------- DashBoard OIDs (Dashboard_b.c) ---------------- */
const OIDS = {
  0x0105:'Product (ParamProductName "M6204A")', 0x0106:'Name ("MD-SDI Embedded Audio Multiplexer")', 0x0102:'Manufacturer ("Ward-Beck Systems")',
  0x010B:'Software Rev ("3.00")', 0x0104:'Website ("www.ward-beck.com")',
  0x0201:'Signal Status (Parameter21: OK / No SDI Input / AES1/AES2 Unlocked)', 0x0204:'SDI Format (ALARM_TABLE, 16 entries)', 0x020F:'Embedded Audio (string)',
  0x0202:'External AES Inputs (string)', 0x0205:'Number of Groups Enabled (1–4)', 0x090D:'Swap (Disabled / Enabled)', 0x090C:'Settings (Save)',
};
function oidTxt(o){ return ((o>>8)&0xFF)+'.'+(o&0xFF).toString(16).toUpperCase(); }
const MENU1 = [0x0201,0x0204,0x020F,0x0202,0x0205,0x090D,0x0206,0x0207,0x0208,0x0209,0x020A];   // count byte says 6

/* =====================================================================
   WORLD (cables, sources, DIP, rear) and events inside the simulated second(s)
   ===================================================================== */
const SCN = {
  steady:{label:'Running (steady state)', end:1.0, pages:[[0,'0 – 1 s']]},
  plug:  {label:'HD source plugged into SDI IN at 50 ms', end:1.0, pages:[[0,'0 – 1 s']]},
  boot:  {label:'Power-up: card inserted at 0 s', end:2.0, pages:[[0,'0 – 1 s · boot, slot ID'],[1,'1 – 2 s · FPGA handshake, main loop']]},
};
function mkBase(){ return {
  card:true, slot:4, rear:'T6301', mfc:true, variant:'M6204A',
  sdi:{on:true, fmt:'hd1080i59', gm:0b0011},                         // source carries groups 1 and 2
  aes:[{on:true,kind:'pcm'},{on:true,kind:'pcm'},{on:true,kind:'pcm441'},{on:false,kind:'pcm'},{on:false,kind:'pcm'},{on:false,kind:'pcm'},{on:false,kind:'pcm'},{on:false,kind:'pcm'}],
  dip:[true,true,false,true,false,false,false,false],               // SW1..8 ON?  1+2 ON = 4 groups, 4 ON = cascade group 2 — assumed setting, inferred
};}
const D = {
  scn:'steady', page:0, base:mkBase(), ev:[],
  ee:{valid:false, cha:[1,1,1,1,1,1,1,1], auto:[1,0,0,0,0,0,0,0]},  // EEPROM bytes 10, 11–18, 21–28 (blank card)
  log:[], lastTrace:[], ui:{dashTab:'status', blk:'fpga', sch:0, follow:true, scopeG:0}, second:1,
};
const page0 = ()=> SCN[D.scn].pages[Math.min(D.page, SCN[D.scn].pages.length-1)][0];
const absT = t => page0() + (t===undefined? SIM.t : t);

let WC=null, WKEY='';
function world(t){
  const key = JSON.stringify([D.scn, D.base, D.ev.filter(e=>e.k!=='set'&&e.k!=='open')]);
  if (key!==WKEY){ WKEY=key; WC=[]; let w=deep(D.base);
    if (D.scn==='plug') w.sdi.on=false;
    WC.push({t:-Infinity, w});
    const evs = D.ev.filter(e=>e.k!=='set'&&e.k!=='open').slice();
    if (D.scn==='plug') evs.push({t:0.05, k:'sdi.on', v:true});
    evs.sort((a,b)=>a.t-b.t);
    for (const e of evs){ w=deep(w); applyW(w,e); WC.push({t:e.t, w, e}); } }
  let lo=0, hi=WC.length-1; while (lo<hi){ const m=(lo+hi+1)>>1; if (WC[m].t<=t) lo=m; else hi=m-1; }
  return WC[lo].w;
}
function applyW(w,e){ const p=e.k.split('.'); let o=w; for (let i=0;i<p.length-1;i++) o=o[p[i]]; o[p[p.length-1]] = deep(e.v); }
function lastW(pred, t){ let r=-1e9; for (const x of (world(t), WC)) if (x.e && x.t<=t && pred(x.e)) r=x.t; return r; }
function addEv(k, v){ const t=absT(); D.ev = D.ev.filter(e=> !(e.k===k && Math.abs(e.t-t)<1e-9)); D.ev.push({t, k, v}); D.ev.sort((a,b)=>a.t-b.t); }

/* =====================================================================
   FPGA model: what the EP2C35 reports in the 128-bit word, and what it embeds
   ===================================================================== */
function sdiLockedAt(t){ const w=world(t); if (!w.card || !w.sdi.on) return false;
  const since = lastW(e=>e.k.startsWith('sdi')||e.k==='card'||e.k==='slot', t);
  return t - since >= C.SDI_LOCK; }
function fpgaGroupsOut(w){ const a = !w.dip[0], b = !w.dip[1];     // grp[1] = NOT dip_sw1, grp[0] = NOT dip_sw2 (m6204a.bdf inst97/98)
  return 1 + ((a?0:2) + (b?0:1)); }                                  // DIP ON = 0 → group_enable bit 1 → "11" = 16 channels
function aesLockedAt(i, t){ const w=world(t); const a=w.aes[i]; if (!w.card || !a.on || !rearHasAes(w.rear,i)) return false;
  const since = lastW(e=>e.k==='aes.'+i||e.k==='rear'||e.k==='card'||e.k==='slot', t);
  return t - since >= C.CS_LOCK; }
function fpgaIn(t, fw){   // ALTERA_BUFFER_in[0..15] as the AVR stores it (in[15] = first byte = bits 127..120)
  const w=world(t), b=new Array(16).fill(0);
  if (!w.card || fw.fpgaReset || t < fw.fpgaReadyAt){ return b; }
  b[15]=0xAA;
  const lk = sdiLockedAt(t), f=VF[w.sdi.fmt], x=f.bits;
  if (lk){ b[1] = (1<<7)|((x.sd?1:0)<<6)|((x.hd?1:0)<<5)|((x.fr50?1:0)<<4)|((x.fr60?1:0)<<3)|((x.l1080?1:0)<<2)|((x.l720?1:0)<<1)|(x.l525?1:0);
           b[0] = ((x.l625?1:0)<<7)|((x.l6060?1:0)<<6); }
  for (let i=0;i<8;i++){ const a=w.aes[i]; if (!aesLockedAt(i,t)) continue; const K=KIND[a.kind]; const nib=(K.comp<<3)|K.fmt; b[2+(i>>1)] |= (i&1)? nib<<4 : nib; }
  const since = lastW(e=>e.k.startsWith('sdi')||e.k==='card', t);
  const gIn = lk && (t-since>C.GRP_DET)? w.sdi.gm : 0;
  if (lk && f.std===2){ b[10] = gIn & 0x0F; }
  const muxRun = lk && (t-since>C.GRP_DET) && !(fw.sdReset);
  b[10] |= (muxRun && f.std===1? 0x80:0) | (muxRun && f.std===2? 0x40:0);
  if (lk && f.std===1){ let ea=0; for (let g=0;g<4;g++) if ((gIn>>g)&1) ea |= 0xF<<(4*g); b[11]=ea&0xFF; b[12]=(ea>>8)&0xFF; }
  b[13] = 0xFF;                                                      // SD clock-phase flags: all good — inferred
  return b;
}

/* =====================================================================
   FIRMWARE EMULATOR — main() of v100w.c pass by pass, timer0 (SD_RESET), timer1 (CAN_TX_TIMER),
   the CAN receive ISR (DASHBOARD_RESPONSE_SETUP) and the frame controller.
   ===================================================================== */
const LEDN = ['SD','HD','ERR','AES1','AES2','AES3','AES4','AES5','AES6','AES7','AES8','CASCADE'];
const LEDC = ['var(--led-g)','var(--led-g)','#ff5a4a','var(--led-g)','var(--led-g)','var(--led-g)','var(--led-g)','var(--led-g)','var(--led-g)','var(--led-g)','var(--led-g)','var(--led-a)'];
function mkFw(){ return {
  mode:'app', bootIx:-1, bootEnd:0, bootT0:0, cli:false,
  dip_switch_enabled:1, dashboard_enabled:1, emb_cha:[1,1,1,1,1,1,1,1], emb_chb:[0,0,0,0,0,0,0,0], auto_src:[1,0,0,0,0,0,0,0], swap:0,
  out:new Array(16).fill(0), inb:new Array(16).fill(0), fpgaOut:new Array(16).fill(0), fpgaReadyAt:-1e9, fpgaReset:false, sdReset:false,
  smpte:0, sd:0, hd:0, fr50:0, fr60:0, l1080:0, l720:0, l525:0, l625:0, l6060:0, agd:0, g1mux:0, hdg1mux:0, embA:0,
  aesFmt:[0,0,0,0,0,0,0,0], aesComp:[0,0,0,0,0,0,0,0], Astatus:0, aes_lock:[0,0,0,0,0,0,0,0], aes_lockE:[0,0,0,0,0,0,0,0],
  sdi_format:0, psmpte:0, sdi_no_lock:1, sdi_change:0,
  reset_enable:0, reset_counter:C.RESET_VEC, reset_active:0, sd_stable_ctr:C.SD_STABLE, sd_stable:0,
  hd_ctr:C.RESET_VEC, hd_stable:0, hd_cnt:0, hd_uncnt:0, count:0, emb:[1,1,1,1,1,1,1,1],
  leds:0, agroups:3, pagroups:-1,
  restart_sent:1, pchg:0, prefresh:0, ptxc:1, prev:{}, frame_count:0, job:null, txNext:0.21, init:0, rxCount:0, t0ctr:0, quiet:3,
  save:0, ee:null, slot:4, mod:0x14, busyUntil:-1, mfcQ:[], mfcNext:Infinity, mfcWait:false,
};}
function bootSegs(){ const W=C.WAIT3000; return [
  [0.0002,'initialization(); DATA_INITIALIZATION(): ERROR LED on, every other LED off; CAN_RX (transceiver in loop-back)'],
  [6*W,'6 × wait(3000)'],
  [100*C.SLOT_SAMPLE,'slot ID pass 1: 100 × AD_CONVERTER_SETUP (2 × wait(3000) + 104 µs each) → average → ADDRESS_TABLE'],
  [6*W,'6 × wait(3000)'],
  [100*C.SLOT_SAMPLE,'slot ID pass 2: the same 100 samples again (overwrites pass 1)'],
  [6*W,'6 × wait(3000)'],
  [0.0009,'ALTERA_RESET(1000): PG2 high, 1000 × WDR, low'],
  [5*W+0.0003,'init_CS8416(): RS low, 5 × wait(3000), RS high; registers 0x00–0x06 written to all eight receivers'],
  [0.0005,'ALTERA_SORT(); ALTERA_read_write(): first 128-bit exchange'],
  [0.0004,'while (ALTERA_BUFFER_in[15] != 0xAA) … ; READ_DIP_SWITCHES; RESTORE_INFORMATION_EEPROM or DIP cascade'],
  [0.018,'moduleAddress(slot_address); DATA_SETUP(): length + CRC of every message — duration inferred'],
  [0.0005,'CANinit(); CAN_TX → while(1)'],
];}
function dipBits(w){ let r=0; for (let i=0;i<8;i++) if (!w.dip[i]) r|=1<<i; return r; }   // MIRROR(PINC): position p → bit p-1, ON = 0
function lockOf(comp, fmt){ return comp? (fmt===1? 2 : fmt===2? 3 : 4) : 1; }
function frameTime(n){ return (67 + 8*n) * C.CAN_BIT * C.STUFF; }
function multiFrames(len){ const n=Math.floor((len+4)/8); return n+1; }
function fmtValue(f){ // CAN_TX_TIMER: REPORT_PARAM 2.4 value byte (buffer[5])
  if (f.sdi_format===1) return f.l525? 0x02 : f.l625? 0x04 : 0x00;              // BIT8 → unsigned char = 0
  if (f.sdi_format===2){ if (f.l1080){ if (f.fr50) return 0x08; if (f.fr60 && !f.l6060) return 0x10; if (f.fr60 && f.l6060) return 0x20; return 0; }
    if (f.l720){ if (f.fr60 && !f.l6060) return 0x40; if (f.fr60 && f.l6060) return 0x80; return 0; } return 0; }
  return 0x01; }
const FMT_BIT = ['Unlocked','SD 525','SD 625','HD 1080i/50','HD 1080i/59.94','HD 1080i/60','HD 720p/59.94','HD 720p/60'];
function fmtValTxt(v){ if (!v) return '(no bit set — nothing shown)'; for (let b=0;b<8;b++) if (v&(1<<b)) return FMT_BIT[b]; return '?'; }
function statStr(arr){ const ch = v=> v===1?'P':v===4?'C':v===2?'D':v===3?'E':'-'; let s=''; for (let g=0;g<4;g++){ s+=ch(arr[2*g]).repeat(2)+ch(arr[2*g+1]).repeat(2); if (g<3) s+='  '; } return s; }

let S=null, SKEY='';
function sched(){ const key=JSON.stringify([D.scn, D.base, D.ev, D.carry?1:0, D.second, D.ee]); if (key===SKEY && S) return S; SKEY=key; S=emulate(); return S; }

function emulate(){
  const END = SCN[D.scn].end;
  const R = { passes:[], snaps:[], segs:[], xfers:[], can:[], notes:[], cacheEv:[], cache0:{}, t0ticks:0, saves:[], end:null };
  let f = mkFw(); f.ee = deep(D.ee);
  const note=(t,s)=>R.notes.push({t,s});
  const seg=(t0,t1,kind,label)=>R.segs.push({t0,t1,kind,label});
  /* ---- CAN ---- */
  function tx(t, type, data, desc, extra){ const st=Math.max(t, f.busyUntil); const d=frameTime(data); f.busyUntil=st+d; const fr=Object.assign({t:st, dur:d, dir:'tx', type, desc}, extra||{}); R.can.push(fr); return fr; }
  function rx(t, type, data, desc){ const st=Math.max(t, f.busyUntil); const d=frameTime(data); f.busyUntil=st+d; R.can.push({t:st, dur:d, dir:'rx', type, desc}); f.rxCount++; return st+d; }
  const cacheSet=(t,oid,v)=>R.cacheEv.push({t,oid,v});
  function oidVal(oid){
    const g=oid&0xFF;
    switch(oid){ case 0x0204: return fmtValue(f); case 0x020F: return statStr(f.aes_lockE); case 0x0202: return statStr(f.aes_lock);
      case 0x0205: return f.agroups; case 0x090D: return f.swap; case 0x0201: return 0; }
    if ((oid>>8)===3) return (g<8 && (g&1))? f.emb_chb[g>>1] : f.emb_cha[g>>1];
    if ((oid>>8)===4) return g&1? f.emb_chb[g>>1] : f.auto_src[g>>1];
    return null;
  }
  /* ---- the timer1 "CAN_TX_TIMER" ---- */
  function parameterUpdate(t){
    const p=f.prev;
    if (f.pchg) return;
    const fmtKey=[f.sd,f.hd,f.l525,f.l625,f.fr50,f.fr60,f.l1080,f.l720,f.l6060].join();
    if (p.groups!==f.agroups){ f.prefresh=2; f.pchg=1; p.groups=f.agroups; }
    else if (p.fmt!==fmtKey){ f.prefresh=0; f.pchg=1; if (f.sdi_format!==0 && f.sdi_no_lock){ f.sdi_change=1; f.sdi_no_lock=0; note(t,'PARAMETER_UPDATE: format change after a loss of lock → sdi_change = YES (ALTERA_SORT will start an SD/HD audio reset)'); } p.fmt=fmtKey; }
    else if (p.ext!==f.aes_lock.join()){ f.prefresh=1; f.pchg=1; p.ext=f.aes_lock.join(); }
    else if (p.emb!==f.aes_lockE.join()){ f.prefresh=3; f.pchg=1; p.emb=f.aes_lockE.join(); }
    else if (f.ptxc){ f.prefresh = f.prefresh>=3? 0 : f.prefresh+1; }
  }
  function canTxTimer(t){
    if (f.frame_count>0 && f.job){ const j=f.job; j.i++;
      tx(t, j.type, j.i===j.n? Math.max(1,j.len-(j.n-1)*8+4) : 8, `${j.name} frame ${j.i}/${j.n}`, {oid:j.oid});
      if (j.i>=j.n){ f.frame_count=0; if (j.cache) cacheSet(t, j.oid, j.val); if (j.hb){ f.ptxc=1; f.pchg=0; } if (j.mfc){ f.mfcWait=false; f.mfcNext=Math.max(f.mfcNext===Infinity? 0 : f.mfcNext, t+C.MFC_GAP); } f.job=null; }
      return; }
    if (!f.restart_sent){ tx(t, 0x11, 1, 'TRAP CANTRAP_RESTART → CANADDR_TRAP (0x02)'); f.restart_sent=1; return; }
    parameterUpdate(t);
    const r=f.prefresh;
    if (r===0){ const v=fmtValue(f); tx(t, 0x10, 6, `REPORT_PARAM 2.4 SDI Format = 0x${hx(v)} (${fmtValTxt(v)})`, {oid:0x0204}); cacheSet(t,0x0204,v); f.ptxc=1; f.pchg=0; }
    else if (r===2){ tx(t, 0x10, 6, `REPORT_PARAM 2.5 Number of Groups Enabled = ${f.agroups} (“${f.agroups+1}”)`, {oid:0x0205}); cacheSet(t,0x0205,f.agroups); f.ptxc=1; f.pchg=0; }
    else { const oid = r===1? 0x0202 : 0x020F; const val=oidVal(oid); const n=multiFrames(27);
      f.job={type:0xC9, n, i:1, len:27, name:`unsolicited GET_PARAM resp ${oidTxt(oid)} “${val}”`, oid, val, cache:true, hb:true}; f.frame_count=1; f.ptxc=0;
      tx(t, 0xC9, 8, `${f.job.name} frame 1/${n} (MultiFrameMessageTransmission1 → GEAR_CONTROLLER 0x00)`, {oid}); }
  }
  function txInterval(){ return f.frame_count>0? (C.TX_FRAMES+1)*C.T1 : f.init? (1000*f.slot+1)*C.T1 : (C.TX_HEART+1)*C.T1; }
  /* ---- the CAN receive ISR: DashBoard requests ---- */
  function rxIsr(t, rq){
    const done = rx(t, rq.type, rq.type===0x4A? 6 : 3, rq.desc);
    if (rq.type===0x4A){ const o=rq.oid, v=rq.val, g=o&0xFF, hi=o>>8; let msg='', echo=v;
      if (hi===3){ const i=g>>1;
        if (g<8 && (g&1)){ f.emb_chb[i]=v; msg=`emb_aes${i+1}_chb = ${v} (never read by ALTERA_SORT; not gated by dashboard_enabled)`; }
        else if (f.dashboard_enabled){ f.emb_cha[i]=v; msg=`emb_aes${i+1}_cha = ${v} (${v===0?'EMB_AUDIO, cascade':'AES_AUDIO, external'})${g&1?' — odd OID 3.'+g.toString(16).toUpperCase()+' writes cha, not chb':''}`; }
        else { echo=f.emb_cha[i]; msg='DIP 8 ON: dashboard_enabled = NO → reply echoes emb_aes'+(i+1)+'_cha = '+echo; } }
      else if (hi===4){ const i=g>>1;
        if (g&1){ f.emb_chb[i]=v; msg=`emb_aes${i+1}_chb = ${v} (odd 4.x OID)`; }
        else if (f.dashboard_enabled){ f.auto_src[i]=v; msg=`auto_src[${i}] = ${v} (${v?'Auto':'Off'})`; } else { echo=f.auto_src[i]; msg='refused, echoes auto_src = '+echo; } }
      else if (o===0x090C){ f.save=(~v)&0xFF; msg=`save_settings = INVERT_DATA(${v}) = 0x${hx(f.save)}`; }
      else if (o===0x090D){ f.swap=v; msg=`swap = ${v} → ALTERA_BUFFER_out[14] bit 7 → ctl_in[119] (“swaptest”)`; }
      else msg='CANRESP_UNSUPPORTED';
      const fr=tx(done+20e-6, 0xCA, 6, `SET_PARAM resp ${oidTxt(o)} = ${echo} — ${msg}`, {oid:o}); cacheSet(fr.t+fr.dur, o, echo);
      f.mfcWait=false; f.mfcNext=fr.t+fr.dur+C.MFC_GAP; return; }
    // GET-type requests from "open DashBoard": single or multi-frame replies
    if (rq.len<=8){ const fr=tx(done+20e-6, rq.type|0x80, rq.len, rq.rdesc||(MSGN[rq.type]+' resp'), {oid:rq.oid}); if (rq.oid) cacheSet(fr.t+fr.dur, rq.oid, oidVal(rq.oid)); f.mfcWait=false; f.mfcNext=fr.t+fr.dur+C.MFC_GAP; return; }
    const n=multiFrames(rq.len); f.job={type:rq.type|0x80, n, i:1, len:rq.len, name:rq.rdesc, oid:rq.oid, val:rq.oid? oidVal(rq.oid):null, cache:!!rq.oid && rq.type===0x49, mfc:true}; f.frame_count=1;
    tx(done+20e-6, rq.type|0x80, 8, `${rq.rdesc} frame 1/${n}`, {oid:rq.oid}); f.txNext = done + (C.TX_FRAMES+1)*C.T1;
  }
  /* ---- timer0: SD_RESET + sd_audio_stable + DashBoard-initialising detector ---- */
  function t0Tick(t){
    if (f.smpte){
      if (f.reset_enable && f.reset_counter!==0){ f.reset_counter--; f.sd_stable_ctr=C.SD_STABLE; f.sdReset=true; if (!f.swap) note(t,'SD_RESET (timer0): SD_RESET_ACTIVE (PF3 low), swap = YES → HD channel 16 carries 0xAAAAAA'); f.swap=1; f.hd_stable=0; f.hd_ctr=C.RESET_VEC; f.hd_cnt=0; f.hd_uncnt=0; f.reset_active=1; }
      else { f.sdReset=false; f.reset_active=0; }
    } else { f.reset_counter=C.RESET_VEC; f.hd_ctr=C.RESET_VEC; f.swap=0; f.hd_stable=0; f.hd_cnt=0; f.hd_uncnt=0; }
    if (f.sdi_format!==0 && f.sd_stable_ctr===0){ if (!f.sd_stable) note(t,'timer0: sd_audio_stable_counter reached 0 → sd_audio_stable = YES'); f.sd_stable=1; }
    else { f.sd_stable_ctr=(f.sd_stable_ctr+255)&0xFF; f.sd_stable=0; }
    f.t0ctr++; if (f.t0ctr>=1000){ f.t0ctr=0; if (f.rxCount<10){ f.quiet++; if (f.quiet>=3 && f.init){ f.init=0; note(t,'timer0: fewer than 10 CAN messages for 3 s → dashboard_initializing = NO'); } } else { if (!f.init) note(t,'timer0: '+f.rxCount+' messages this second → dashboard_initializing = YES (reports every 1000 × slot ticks)'); f.init=1; f.quiet=0; } f.rxCount=0; }
  }
  /* ---- one main-loop pass ---- */
  function pass(t, rec){
    const w=world(t); let tt=t; const st=[];
    // 1 READ_DIP_SWITCHES / PROCESS_DIP_SWITCHES
    const dip=dipBits(w); f.agroups = ((dip&2)?0:1) + ((dip&1)?0:2);
    if (f.dip_switch_enabled && !f.dashboard_enabled){ for (let g=0;g<4;g++){ const c=(dip>>(2+g))&1? 1 : 0; f.emb_cha[2*g]=c; f.emb_cha[2*g+1]=c; } f.auto_src=[1,1,1,1,1,1,1,1]; }
    st.push(tt); tt+=STEPS[0][1];
    // 2 CS8416_READ_LOCK_ALL
    st.push(tt); let a=0; for (let i=0;i<8;i++) if (aesLockedAt(i, tt+(i+0.5)*C.CS_READ/8)) a|=1<<i; f.Astatus=a; tt+=STEPS[1][1];
    // 3 ALTERA_read_write
    st.push(tt); f.inb = fpgaIn(tt+C.XFER, f); f.fpgaOut = f.out.slice(); if (rec) R.xfers.push({t0:tt, t1:tt+C.XFER, out:f.out.slice(), inb:f.inb.slice()}); const xEnd=tt+C.XFER; tt+=STEPS[2][1];
    // 4 PROCESS_SDI_LOCK_STATUS (+ psmpte bookkeeping in main)
    st.push(tt); if (f.smpte){ if (f.sd) f.sdi_format=1; else if (f.hd) f.sdi_format=2; } else f.sdi_format=0;
    if (f.psmpte!==f.smpte){ if (!f.smpte) f.sdi_no_lock=1; f.psmpte=f.smpte; } tt+=STEPS[3][1];
    // 5 PROCESS_AUDIO_INFORMATION
    st.push(tt); for (let i=0;i<8;i++) f.aes_lock[i] = (f.Astatus>>i)&1? lockOf(f.aesComp[i], f.aesFmt[i]) : 0; tt+=STEPS[4][1];
    // 6 REFRESH_LEDS
    st.push(tt); let L=0; if (f.sdi_format===1) L|=1; else if (f.sdi_format===2) L|=3; else if (f.smpte) L|=1; else L|=4;
    for (let i=0;i<8;i++) if (f.aes_lock[i]) L|=1<<(3+i);
    if (f.emb_cha.some(x=>x===0)) L|=1<<11;
    if (f.sdi_format===2){ for (let g=0;g<4;g++){ const v=(f.agd>>g)&1? 1:0; f.aes_lockE[2*g]=v; f.aes_lockE[2*g+1]=v; } }
    else { for (let i=0;i<8;i++) f.aes_lockE[i] = ((~f.embA)>>(2*i)&3)===0? 1 : 0; }
    f.leds=L; tt+=STEPS[5][1];
    // 7 CAN_FUNCTIONS
    st.push(tt); tt+=STEPS[6][1];
    // 8 ALTERA_SORT
    st.push(tt); altSort(tt); tt+=STEPS[7][1];
    // 9 save
    st.push(tt); if (f.save){ let n=0; const E=f.ee, put=(k,arr,v)=>{ if (arr[k]!==v){ arr[k]=v; n++; } };
      if (!E.valid){ E.valid=true; n++; } for (let i=0;i<8;i++){ put(i,E.cha,f.emb_cha[i]); put(i,E.auto,f.auto_src[i]); }
      const d=n*C.EE_WRITE; if (rec){ R.saves.push({t0:tt, t1:tt+d, n}); note(tt, `SAVE_INFORMATION_EEPROM: 17 eepromWriteByte calls, ${n} byte(s) differ → ≈${(d*1000).toFixed(0)} ms with the loop stalled (write-if-different, ${'8.5 ms'} per byte — inferred)`); }
      tt+=d; f.save=0; }
    if (rec){ R.passes.push({t0:t, t1:tt, st, xEnd}); R.snaps.push(snap(t)); }
    return tt;
  }
  function altSort(t){
    for (let i=0;i<8;i++){ const c=f.emb_cha[i]; f.emb[i] = c===1? (f.auto_src[i]? (f.aes_lock[i]>1? 1 : 2) : 1) : c; }
    const o=f.out; o.fill(0);
    o[0]=(f.emb[3]&3)<<6|(f.emb[2]&3)<<4|(f.emb[1]&3)<<2|(f.emb[0]&3); o[1]=(f.emb[7]&3)<<6|(f.emb[6]&3)<<4|(f.emb[5]&3)<<2|(f.emb[4]&3);
    o[12]=3; o[14]=(f.swap<<7)|(1<<6); o[15]=0xAA;
    const b=f.inb;
    if (b[15]===0xAA){ f.count=0; f.smpte=(b[1]>>7)&1;
      if (f.smpte){ f.sd=(b[1]>>6)&1; f.hd=(b[1]>>5)&1; f.fr50=(b[1]>>4)&1; f.fr60=(b[1]>>3)&1; f.l1080=(b[1]>>2)&1; f.l720=(b[1]>>1)&1; f.l525=b[1]&1; f.l625=(b[0]>>7)&1; f.l6060=(b[0]>>6)&1;
        f.agd=b[10]&0x0F; f.g1mux=(b[10]>>7)&1; f.hdg1mux=(b[10]>>6)&1; f.embA=(b[12]<<8)|b[11];
        for (let i=0;i<8;i++){ const nib = (b[2+(i>>1)] >> ((i&1)*4)) & 0xF; f.aesFmt[i]=nib&7; f.aesComp[i]=(nib>>3)&1; }
        if (!f.reset_active && f.sdi_format===1 && f.sd_stable){ f.reset_enable=0; f.reset_counter=C.RESET_VEC; }
        if (f.sd_stable && !f.g1mux && !f.reset_enable && f.sdi_format===1) f.reset_enable=1;
        if (f.sd_stable && !f.hdg1mux && !f.reset_enable && f.sdi_format===2) f.reset_enable=1;
        if (f.sdi_change){ f.reset_enable=1; f.sdi_change=0; }
        if (f.reset_enable && !f.reset_active && f.swap && f.sd_stable && f.hdg1mux && f.sdi_format===2){
          if (!f.hd_stable && f.hd_ctr!==0){ if (f.hd_cnt<=C.HD_STABLE_PASSES) f.hd_cnt++; else { f.hd_ctr=0; f.hd_stable=1; f.reset_enable=0; f.swap=0; note(t,'ALTERA_SORT: hd_audio_stable_count passed 200 → hd_audio_stable = YES, swap = NO (channel 16 back to audio)'); } }
          else { f.swap=0; f.hd_ctr=C.RESET_VEC; f.hd_stable=1; f.reset_enable=0; f.reset_counter=C.RESET_VEC; f.hd_cnt=0; f.hd_uncnt=0; } }
      } else {
        f.sd=f.hd=f.fr50=f.fr60=f.l1080=f.l720=f.l525=f.l625=f.l6060=0; f.agd=0; f.embA=0;
        for (let i=0;i<8;i++){ const nib = (b[2+(i>>1)] >> ((i&1)*4)) & 0xF; f.aesFmt[i]=nib&7; f.aesComp[i]=(nib>>3)&1; }
        f.sdReset=true; f.sd_stable_ctr=C.SD_STABLE; f.sd_stable=0; f.hd_ctr=C.RESET_VEC; f.swap=0; f.hd_stable=0; f.reset_counter=C.RESET_VEC;
      }
    } else { if (f.count>=C.COUNT_MAX){ if (!f.cli){ f.cli=true; f.mode='dead'; note(t,'ALTERA_SORT: 200 reads without 0xAA → CLI(): interrupts off for good — timers and CAN stop, the loop keeps running and kicking the watchdog'); } } else f.count++; }
  }
  function snap(t){ return {t, mode:f.mode, leds:f.leds, emb:f.emb.slice(), cha:f.emb_cha.slice(), auto:f.auto_src.slice(), out:f.out.slice(), inb:f.inb.slice(), fo:f.fpgaOut.slice(),
    fmt:f.sdi_format, al:f.aes_lock.slice(), ae:f.aes_lockE.slice(), swap:f.swap, ra:f.reset_active, re:f.reset_enable, rc:f.reset_counter, ss:f.sd_stable, ssc:f.sd_stable_ctr,
    hc:f.hd_cnt, hs:f.hd_stable, sdr:f.sdReset, ag:f.agroups, de:f.dashboard_enabled, dse:f.dip_switch_enabled, init:f.init, cli:f.cli, cnt:f.count, smpte:f.smpte, sd:f.sd, hd:f.hd, swOut:(f.fpgaOut[14]>>7)&1 }; }
  /* ---- boot / app transitions ---- */
  function startBoot(t){ const keepEe=f.ee; const sl=world(t).slot; f=Object.assign(mkFw(), {ee:keepEe, mode:'boot', bootIx:0, bootT0:t, restart_sent:0, leds:4, txNext:Infinity, fpgaReadyAt:t+C.FPGA_CFG, busyUntil:f.busyUntil, slot:sl}); f.bootEnd=t+bootSegs()[0][0]; R.segs.push({t0:t, t1:f.bootEnd, kind:'boot', label:bootSegs()[0][1]}); }
  function enterApp(t){ const w=world(t); const dip=dipBits(w);
    const adc=slotAdc(w.slot); f.slot=ADDRESS_TABLE(adc); f.mod=0x10+f.slot;
    f.dip_switch_enabled=(dip&0x40)? 1:0; f.dashboard_enabled=(dip&0x80)? 1:0;
    if (!f.dip_switch_enabled){ if (f.ee.valid){ f.emb_cha=f.ee.cha.slice(); f.auto_src=f.ee.auto.slice(); } }
    else { for (let g=0;g<4;g++){ const c=(dip>>(2+g))&1? 1:0; f.emb_cha[2*g]=c; f.emb_cha[2*g+1]=c; } f.auto_src=[1,1,1,1,1,1,1,1]; }
    f.mode='app'; f.txNext=t+0.096; f.prev={};   // first timer1 period after CANinit: TCNT1 = 0xD120 → 12 000 counts = 96 ms
    note(t, `main(): slot ADC ${adc} → ADDRESS_TABLE = ${f.slot} (mod_address 0x${hx(f.mod)}); DIP 0x${hx(dip)} → dip_switch_enabled ${f.dip_switch_enabled?'YES':'NO'}, dashboard_enabled ${f.dashboard_enabled?'YES':'NO'}; ${f.dip_switch_enabled? 'cascade from DIP 3–6, auto_src all YES' : f.ee.valid? 'RESTORE_INFORMATION_EEPROM (byte 10 = 0xAA)' : 'EEPROM byte 10 ≠ 0xAA: defaults kept (emb_aesN_cha = AES_AUDIO, auto_src = {YES,0,0,0,0,0,0,0})'}`); }
  /* ---- set-up of the starting state ---- */
  const evs = D.ev.slice().sort((x,y)=>x.t-y.t);
  const wEvents = ()=> (world(0), WC.filter(x=>x.e).map(x=>({t:x.t, e:x.e})));
  let t=0;
  if (D.scn==='boot'){ f.mode='off'; f.leds=0; startBoot(0); f.fpgaReadyAt=C.FPGA_CFG; }
  else if (D.carry){ f=deep(D.carry); for (const k of ['txNext','mfcNext','busyUntil','fpgaReadyAt']) if (isFinite(f[k])) f[k]-=1; if (f.job) f.job=null, f.frame_count=0; f.mfcQ=[]; f.mfcWait=false; t=0.0001; }
  else { // warm-up: run 0.6 s of passes on the starting world (not recorded)
    f.ee=deep(D.ee); enterApp(-1.3); f.fpgaReadyAt=-1e9; let tw=-1.2; f.txNext=-1.0;
    while (tw<0){ const nt=pass(tw,false); t0TicksBetween(tw, nt); for (let i=0;i<3 && f.txNext<=nt;i++){ canTxTimer(f.txNext); f.txNext+=txInterval(); } tw=nt; }
    R.can.length=0; R.notes.length=0; R.cacheEv.length=0; f.busyUntil=-1; f.txNext=0.213; f.pchg=0; f.ptxc=1; f.restart_sent=1;
    t=0.00015;
  }
  function t0TicksBetween(a,b){ let k=Math.floor(a/C.T0)+1; while (k*C.T0<=b){ t0Tick(k*C.T0); k++; } }
  // DashBoard cache at t = 0: in steady state DashBoard already holds every value
  if (D.scn!=='boot'){ [0x0204,0x020F,0x0202,0x0205,0x090D].forEach(o=>R.cache0[o]=oidVal(o)); for (let g=0;g<16;g++){ R.cache0[0x0300+g]=oidVal(0x0300+g); R.cache0[0x0400+g]=oidVal(0x0400+g); } }
  // events affecting firmware
  const wev = wEvents().filter(x=>x.t>=0 && x.t<END && (x.e.k==='card'||x.e.k==='slot'));
  const fev = evs.filter(e=>e.k==='set'||e.k==='open');
  let wi=0, fi=0;
  const mfcPush = (t0, list)=>{ f.mfcQ.push(...list); if (!f.mfcWait) f.mfcNext=Math.min(f.mfcNext, t0); };
  /* ---- main time loop ---- */
  let guard=0;
  while (t<END && guard++<200000){
    // world events that power-cycle the card
    while (wi<wev.length && wev[wi].t<=t){ const e=wev[wi++].e; const w=world(e.t);
      if (!w.card){ f.mode='off'; f.leds=0; f.txNext=Infinity; f.fpgaReadyAt=Infinity; f.mfcQ=[]; R.segs.push({t0:e.t, t1:END, kind:'off', label:'card out of the frame'}); note(e.t,'card removed: no power, LEDs dark'); }
      else { startBoot(e.t); note(e.t, e.k==='slot'? 'card re-seated in slot '+w.slot+': power-up' : 'card inserted: power-up'); } }
    while (fi<fev.length && fev[fi].t<=t){ const e=fev[fi++];
      if (!world(e.t).mfc) continue;
      if (e.k==='set'){ f.mfcQ.unshift({type:0x4A, oid:e.v.oid, val:e.v.val, desc:`SET_PARAM ${oidTxt(e.v.oid)} = ${e.v.val}`}); if (!f.mfcWait) f.mfcNext=Math.min(f.mfcNext, e.t); }   // user changes go ahead of the parameter dump — inferred
      if (e.k==='open') mfcPush(e.t, openRequests()); }
    const nextW = wi<wev.length? wev[wi].t : END, nextF = fi<fev.length? fev[fi].t : END;
    if (f.mode==='off'){ t=Math.min(nextW, nextF, END); if (t===END) break; continue; }
    if (f.mode==='boot'){
      const B=bootSegs();
      if (t>=f.bootEnd){ f.bootIx++;
        if (f.bootIx>=B.length){ enterApp(t); continue; }
        if (f.bootIx===9 && t<f.fpgaReadyAt){ const re=Math.ceil((f.fpgaReadyAt-t)/(6*C.WAIT3000)); R.segs.push({t0:t, t1:t+re*6*C.WAIT3000, kind:'boot', label:`ALTERA_BUFFER_in[15] ≠ 0xAA: FPGA still configuring — ${re} × (6 × wait(3000), ALTERA_SORT, ALTERA_read_write)`}); t+=re*6*C.WAIT3000; }
        f.bootEnd=t+B[f.bootIx][0]; R.segs.push({t0:t, t1:f.bootEnd, kind:'boot', label:B[f.bootIx][1]}); }
      t=Math.min(f.bootEnd, nextW, nextF); if (R.snaps.length===0 || t-R.snaps[R.snaps.length-1].t>0.002) R.snaps.push(snap(t)); continue; }
    if (f.mode==='dead'){ const nt=pass(t,true); t=nt; continue; }
    // app: one pass, with interrupts serviced at their own times
    const t0p=t; const nt=pass(t,true);
    const xf=R.xfers[R.xfers.length-1];
    t0TicksBetween(t0p, nt);
    while (f.txNext<=nt){ const tt=f.txNext; const tq = (tt>=xf.t0 && tt<xf.t1)? xf.t1 : tt; canTxTimer(tq); f.txNext=tt+txInterval(); }
    while (!f.mfcWait && !f.job && f.mfcQ.length && f.mfcNext<=nt){ const rq=f.mfcQ.shift(); let tr=Math.max(f.mfcNext, f.busyUntil); if (tr>=xf.t0 && tr<xf.t1) tr=xf.t1; f.mfcWait=true; rxIsr(tr, rq); }
    t=nt;
  }
  R.cacheEv.sort((a,b)=>a.t-b.t); R.can.sort((a,b)=>a.t-b.t);
  R.end=f; R.endT=t; return R;
}
const MSGN = {0x45:'GET_NUMPARAMS',0x46:'GET_PARAM_OIDS',0x47:'GET_DESCRIPTOR',0x49:'GET_PARAM',0x4A:'SET_PARAM',0x50:'GET_MENUSET_NAME',0x51:'GET_MENU_COUNT',0x52:'GET_MENU_NAME',0x53:'GET_MENU_OIDS',0x10:'REPORT_PARAM',0x11:'TRAP'};
const PARAM_OIDS = [0x020F,0x0105,0x0102,0x010B,0x0106,0x0104,0x0202,0x0204,0x0205,0x0300,0x0302,0x0304,0x0306,0x0308,0x030A,0x030C,0x030E,0x0500,0x0501,0x0502,0x0503,0x0504,0x0505,0x0506,0x0507,0x0508,0x0509,0x0400,0x0402,0x0404,0x0406,0x0408,0x040A,0x040C,0x040E,0x090C,0x090D];  // ParamOIDS_Message (count byte 36)
function descLen(o){ const hi=o>>8; if (hi===1) return 26; if (o===0x0204) return 236; if (o===0x0202||o===0x020F) return 40; if (o===0x0205) return 60; if (hi===3) return 62; if (hi===4) return 30; if (hi===5) return 22; if (o===0x090C) return 27; if (o===0x090D) return 42; return 20; }
function openRequests(){ const L=[{type:0x45, len:3, desc:'GET_NUMPARAMS', rdesc:'NUMPARAMS = *(ParamOIDS_Message+3) = 36'},{type:0x46, len:78, desc:'GET_PARAM_OIDS', rdesc:'ParamOIDS_Message (37 OIDs, count says 36)'},{type:0x50, len:11, desc:'GET_MENUSET_NAME', rdesc:'MenuSet_Message “Status”'}];
  PARAM_OIDS.slice(0,36).forEach(o=>{ L.push({type:0x47, len:descLen(o), oid:0, desc:'GET_DESCRIPTOR '+oidTxt(o), rdesc:'descriptor '+oidTxt(o)}); const hi=o>>8; const isStr = hi===1 || o===0x0202 || o===0x020F || hi===5;
    L.push({type:0x49, len:isStr? 28 : 6, oid:(hi===1||hi===5)? 0 : o, desc:'GET_PARAM '+oidTxt(o), rdesc:'GET_PARAM resp '+oidTxt(o)}); });
  return L; }

/* ---------------- query helpers ---------------- */
function snapAt(t){ const s=sched().snaps; if (!s.length) return null; let lo=0, hi=s.length-1; if (t<s[0].t) return s[0]; while (lo<hi){ const m=(lo+hi+1)>>1; if (s[m].t<=t) lo=m; else hi=m-1; } return s[lo]; }
function passAt(t){ const p=sched().passes; let lo=0, hi=p.length-1; if (!p.length || t<p[0].t0) return null; while (lo<hi){ const m=(lo+hi+1)>>1; if (p[m].t0<=t) lo=m; else hi=m-1; } const x=p[lo]; return (t<x.t1)? x : null; }
function stepAt(t){ const p=passAt(t); if (!p) return -1; for (let i=p.st.length-1;i>=0;i--) if (t>=p.st[i]) return i; return 0; }
function segAt(t){ let r=null; for (const g of sched().segs) if (g.t0<=t && t<g.t1) r=g; return r; }
function cacheAt(t){ const R=sched(); const c=Object.assign({}, R.cache0); for (const e of R.cacheEv){ if (e.t>t) break; c[e.oid]=e.v; } return c; }
function modeAt(t){ const sn=snapAt(t); const g=segAt(t); if (g && g.kind==='off') return 'off'; if (g && g.kind==='boot') return 'boot'; return sn? sn.mode : 'app'; }

/* =====================================================================
   VIDEO LINES AND HANC PACKETS (what the embedder inserts)
   ===================================================================== */
function lineT(f){ return 1/(f.fr*f.lines); }
function swLine(f, ln){ return f.sw.some(s=> ln===s+1); }      // vc_299m: output_packet_on_next_line = 0 when line_reg is 7 / 569 → no packets on lines 8 / 570
function lineSamples(f, n){
  const Tl=lineT(f), ln=(n % f.lines)+1; if (swLine(f, ln)) return [];
  let a=Math.ceil((n-1)*Tl*48000-1e-9), b=Math.ceil(n*Tl*48000-1e-9);
  const prev=((n-1+f.lines) % f.lines)+1; if (swLine(f, prev)) a=Math.ceil((n-2)*Tl*48000-1e-9);
  const out=[]; for (let k=Math.max(0,a); k<b; k++) out.push(k); return out;
}
function outPackets(f, n, G){   // M6204 output: HD = one 31-word packet per sample per group (ADF·DID·DBN·DC·CLK×2·UDW×16·ECC×6·CS), sample-major — order inferred
  const smp=lineSamples(f,n); if (!smp.length || !G) return [];
  const out=[]; let w=f.hdr;
  if (f.std===2){ for (const k of smp) for (let g=0;g<G;g++){ out.push({g, w0:w, w1:w+31, s:k}); w+=31; } }
  else for (let g=0;g<G;g++){ const len=7+12*smp.length; out.push({g, w0:w, w1:w+len, s:smp[0], n:smp.length}); w+=len; }
  return out;
}
function inPackets(f, n, gm){ const G=[0,1,2,3].filter(g=>(gm>>g)&1); const smp=lineSamples(f,n); if (!smp.length) return []; const out=[]; let w=f.hdr;
  if (f.std===2){ for (const k of smp) for (const g of G){ out.push({g, w0:w, w1:w+31, s:k}); w+=31; } } else for (const g of G){ const len=7+12*smp.length; out.push({g,w0:w,w1:w+len,s:smp[0],n:smp.length}); w+=len; } return out; }
function ctlLine(f, ln){ return f.std===2 && f.ctl && f.ctl.includes(ln); }

/* audio content (simulated sources): external AES n = 500·n Hz (A) / 500·n+100 Hz (B); embedded group g ch c = 250·(4g+c+1) Hz; −20 dBFS */
function chanSource(sn, w, g, c){ const p=2*g+(c>>1), sub=c&1; const sel = sn? sn.emb[p] : 1;
  if (g===3 && c===3 && sn && sn.swOut) return {txt:'0xAAAAAA (swap test word)', v:0xAAAAAA, raw:true};
  if (sel===3) return {txt:'mute', v:0};
  if (sel===0){ const on = w.sdi.on && ((w.sdi.gm>>g)&1); return {txt:`cascade: embedded G${g+1} ch${c+1}`, f: on? 250*(4*g+c+1) : 0}; }
  const a=w.aes[p]; const on=a.on && rearHasAes(w.rear,p) && sn && sn.al[p];
  const kind=on? KIND[a.kind] : null;
  if (!on) return {txt:`AES IN${p+1} ${sub?'B':'A'} (no signal)`, v:0};
  if (kind.comp) return {txt:`AES IN${p+1} ${sub?'B':'A'} — ${kind.n} (data words)`, data:true, sel};
  return {txt:`AES IN${p+1} ${sub?'B':'A'} via ${sel===2?'AD1895 SRC':'direct AES path'}`, f:500*(p+1)+100*sub, async: a.kind==='pcm441' && sel===1};
}
function sampleVal(src, k){ if (src.raw) return src.v; if (src.data) return ((k*2654435761)>>>8)&0xFFFFFF; if (!src.f) return 0; const v=Math.round(0.1*8388607*Math.sin(2*Math.PI*src.f*k/48000)); return v & 0xFFFFFF; }

/* =====================================================================
   ACTIONS (each logs the firmware path)
   ===================================================================== */
function act(name, fn){
  D.lastTrace=[]; const tr=s=>D.lastTrace.push(s); const t=absT();
  fn(tr); sched(); consequence(tr, t);
  D.log.unshift({t:SIM.t, abs:t, sec:D.second, name, trace:D.lastTrace.slice()}); if (D.log.length>60) D.log.length=60;
  SIM.refresh();
}
function consequence(tr, t){ const R=sched(); const c=R.can.filter(x=>x.t>=t-1e-9 && x.t<t+0.6).slice(0,4); const n=R.notes.filter(x=>x.t>=t-1e-9 && x.t<t+0.6).slice(0,4);
  n.forEach(x=>tr(`<span class="muted">+${SIM.fmtDur(x.t-t)}</span> ${x.s}`)); c.forEach(x=>tr(`<span class="muted">+${SIM.fmtDur(x.t-t)}</span> CAN ${x.dir==='rx'?'▼':'▲'} ${x.desc}`));
  const a=snapAt(t-1e-6), b=snapAt(t+0.3); if (a && b && a.leds!==b.leds){ const ch=[]; LEDN.forEach((l,i)=>{ const x=(a.leds>>i)&1, y=(b.leds>>i)&1; if (x!==y) ch.push(l+(y?' on':' off')); }); tr('LEDs within 300 ms: '+ch.join(', ')); } }
const A = {
  dip(i){ const w=world(absT()); const v=w.dip.slice(); v[i]=!v[i]; act(`DIP SW1-${i+1} → ${v[i]?'ON':'OFF'}`, tr=>{
    addEv('dip', v); const sn=snapAt(absT());
    tr(`SW1 position ${i+1} pulls ALTERA${7-i} (PC${7-i}) to ground when ON. The FPGA reads the same eight lines (pins altera0–7).`);
    tr(`READ_DIP_SWITCHES: dip_switches = MIRROR(PINC) = 0x${hx(dipBits({dip:v}))} (position ${i+1} → bit ${i}).`);
    if (i<2){ const G=fpgaGroupsOut({dip:v}); tr(`FPGA: grp[${i?0:1}] = NOT dip_sw${i+1} → mux_active_groups group_enable = "${bn(G-1,2)}" → chnl_active_hd = ${'1'.repeat(4*G).padStart(16,'0')}: the embedder now writes ${G} group(s) — immediately, without the AVR.`);
      tr(`AVR: PROCESS_DIP_SWITCHES → audio_groups_enabled = ${G-1}; ALTERA_SORT still sends number_of_groups = 3 in ALTERA_BUFFER_out[12], which the FPGA ignores. PARAMETER_UPDATE reports OID 2.5 at the next heartbeat.`); }
    else if (i<6){ const g=i-2; if (sn && sn.dse && !sn.de) tr(`PROCESS_DIP_SWITCHES (DIP mode, DashBoard disabled): emb_aes${2*g+1}_cha = emb_aes${2*g+2}_cha = ${v[i]?'EMB_AUDIO (cascade group '+(g+1)+')':'AES_AUDIO (external AES '+(2*g+1)+'/'+(2*g+2)+')'}; auto_src all YES. ALTERA_SORT rewrites the router bits on this pass.`);
      else tr(`Ignored until the next power-up: PROCESS_DIP_SWITCHES only applies cascade switches when dip_switch_enabled == YES and dashboard_enabled == NO (now ${sn&&sn.dse?'YES':'NO'} / ${sn&&sn.de?'YES':'NO'}). main() read them once at boot.`); }
    else tr(`Position ${i+1} is read only in main() at power-up (${i===6?'dip_switch_enabled: ON = settings from EEPROM, OFF = from the DIP switch':'dashboard_enabled: ON = DashBoard may only watch'}). Re-seat the card to apply it.`); }); },
  sdiCable(){ const w=world(absT()); act(`${w.sdi.on?'Unplug':'Plug'} SDI IN (rear position 1)`, tr=>{ addEv('sdi.on', !w.sdi.on);
    tr(`BNC1 → P1-97 → L1/R1 → GS1574A equaliser (U1) → GS1559 deserialiser (U7) → 20-bit Y/C into the FPGA (hd274_296_decoder / sd656_decoder).`);
    tr(w.sdi.on? 'Lock is lost: the FPGA clears smpte_lock (ctl_out bit 15); ALTERA_SORT takes the no-lock branch: SD_RESET_ACTIVE, sd_audio_stable = NO, swap = NO; main() sets sdi_no_lock_occurred.' : `GS1559 locks after ≈${C.SDI_LOCK*1000} ms ${inf}; the next ALTERA_read_write returns smpte/sd/hd and the format bits; LEDs follow on the same pass.`); }); },
  sdiFmt(k){ act(`SDI source format → ${VF[k].name}`, tr=>{ addEv('sdi.fmt', k); tr(`FPGA lock bits for ${VF[k].name}: ${Object.keys(VF[k].bits).join(', ')}. DashBoard 2.4 will show ${VF[k].rep? '“'+VF[k].rep+'”' : 'nothing: the firmware writes BIT8 (“Locked”) into an 8-bit byte → 0'}.`); }); },
  sdiGroups(m){ act(`SDI source carries groups ${[1,2,3,4].filter(g=>(m>>(g-1))&1).join(', ')||'none'}`, tr=>{ addEv('sdi.gm', m); tr('hd_demux (audio_group_detector_HD) / sd_demux (group_detector_SD) see the incoming DIDs; audio_group_detect (ctl_out bits 83..80) feeds the “Embedded Audio” string and the cascade path.'); }); },
  aesCable(i){ const w=world(absT()); act(`${w.aes[i].on?'Unplug':'Plug'} AES IN${i+1}`, tr=>{ addEv('aes.'+i, Object.assign({}, w.aes[i], {on:!w.aes[i].on}));
    if (!rearHasAes(w.rear,i)) tr(`${w.rear} has no AES IN${i+1} position: the cable goes nowhere.${i===7?' AES IN8 exists only on the T6308A (BNC10 → P1-51, the card net named “AES4P”).':''}`);
    else tr(`Rear → ${i<7?'DS34LV86T line receiver ('+(i===0||i===1||i===6?'U4':'U5')+')':'U4 channel 4 (from P1-51)'} → FPGA aes_in${i+1} → aes_out${i+1} → CS8416 (${['U18','U19','U21','U24','U31','U30','U26','U29'][i]}) → I2S into the FPGA and the AD1895 SRC. CS8416_READ_LOCK_ALL sees register 0x0C go ${w.aes[i].on?'non-zero (unlock)':'to 0 after ≈20 ms '+inf}.`); }); },
  aesKind(i,k){ const w=world(absT()); act(`AES IN${i+1} source → ${KIND[k].n}`, tr=>{ addEv('aes.'+i, Object.assign({}, w.aes[i], {kind:k}));
    tr(`non_audio_detector2 flags the pair as ${KIND[k].comp?'compressed (format '+KIND[k].fmt+')':'PCM'} in ctl_out bits ${16+4*i+3}..${16+4*i}; PROCESS_AUDIO_INFORMATION → aes${i+1}_lock = ${LOCK_NAME[KIND[k].lk]}.`);
    tr(`ALTERA_SORT with auto_src[${i}] = YES: ${KIND[k].comp? 'aes_lock > PCM → emb_aes'+(i+1)+' = AES_AUDIO: the bitstream bypasses the sample-rate converter' : 'PCM → emb_aes'+(i+1)+' = SRC_AUDIO: the AD1895 re-times it to the video-locked 48 kHz'}.`); }); },
  setRear(k){ act(`Fit rear module ${k}`, tr=>{ addEv('rear', k); tr(`${REARS[k].name}. ID resistors ${REARS[k].id}. The M6204A never reads them (adc_init: ADMUX = 0, only the slot ID on ADC0), so it cannot tell a T6301A from a T6308A.`); }); },
  setSlot(s){ act(`Move the card to slot ${s}`, tr=>{ addEv('slot', s); const a=slotAdc(s); tr(`Power-up in slot ${s}: ID resistor ${SLOT_R[s-1]} Ω with the 1K pull-up → ADC ${a} → ADDRESS_TABLE = ${ADDRESS_TABLE(a)} (margin ${slotMargin(s)} counts) → mod_address 0x${hx(0x10+ADDRESS_TABLE(a))}.`); tr('The boot takes ≈1.14 s (two 100-sample slot-ID passes); see the Power-up scenario for the whole sequence.'); }); },
  card(){ const w=world(absT()); act(w.card? 'Pull the card' : 'Insert the card', tr=>{ addEv('card', !w.card); tr(w.card? 'Power off: LEDs dark, no CAN, SDI OUT stops (no bypass relay on the card).' : 'Power-up: initialization(), slot ID ×2, ALTERA_RESET, init_CS8416, 0xAA handshake, CANinit — ≈1.14 s.'); }); },
  dashSet(oid, val){ act(`DashBoard: set ${oidTxt(oid)} = ${val}`, tr=>{ const w=world(absT()); if (!w.mfc){ tr('No frame controller: DashBoard cannot reach the card.'); return; }
    D.ev.push({t:absT(), k:'set', v:{oid,val}}); D.ev.sort((a,b)=>a.t-b.t);
    tr(`DashBoard → frame controller → CAN SET_PARAM (0x4A) to 0x${hx(0x10+w.slot)}: [00 ${hx(oid>>8)} ${hx(oid&0xFF)} 02 00 ${hx(val)}]`);
    tr('can_rx_isr → CANRX → DASHBOARD_RESPONSE_SETUP, case CANMSG_SET_PARAM; the reply 0xCA is sent from the ISR. If the request lands inside ALTERA_read_write (CLI) the ISR waits for SEI.'); }); },
  dashOpen(){ act('DashBoard: open the card (parameter dump)', tr=>{ D.ev.push({t:absT(), k:'open', v:1}); D.ev.sort((a,b)=>a.t-b.t);
    tr('Frame controller: GET_NUMPARAMS → 36, GET_PARAM_OIDS (37 OIDs listed), then GET_DESCRIPTOR + GET_PARAM for each. Multi-frame replies go out one frame per 11 timer1 ticks (1.06 ms).');
    tr('More than 10 messages in a second → timer0 sets dashboard_initializing = YES → heartbeat every 1000 × slot ticks.'); }); },
  variant(v){ act(`Card variant → ${v}`, tr=>{ addEv('variant', v); tr(v==='M6204AE'? 'M6204AE: CAT-559 encoder module on P5 (72-pin, iss3 BOM “CAT-559-E-D”). Its DashBoard.c is byte-identical to the M6204A v102 file: the encoder controls named in the history sheet are not in the archived code.' : 'M6204A: P5 empty.'); }); },
  mfc(){ const w=world(absT()); act(`${w.mfc?'Remove':'Fit'} the frame controller`, tr=>{ addEv('mfc', !w.mfc); }); },
};
function rollSecond(){ const R=sched(); const e=R.end; const w=deep(world(SCN[D.scn].end-1e-6)); D.carry=deep(e); D.ee=deep(e.ee); D.base=w; D.scn='steady'; D.page=0; D.ev=[]; D.second++; SKEY=''; SIM.seek(0); }
function resetAll(){ D.base=mkBase(); D.ev=[]; D.carry=null; D.ee={valid:false, cha:[1,1,1,1,1,1,1,1], auto:[1,0,0,0,0,0,0,0]}; D.log=[]; D.second=1; SKEY=''; SIM.seek(0); }

/* =====================================================================
   DRAWING: card (ISS3 gerbers), card edge, rear module, frame, DashBoard window
   ===================================================================== */
/* Card artwork: GERBERS/M6204A-ISS3.TOP + .TSM (copper/pads, gold = immersion gold) and .TSS (silk), 120 dpi,
   board area x 2.45…15.33 in, y 5.58…8.70 in → 1545 × 374 px. Mask GREEN, silk WHITE (drawing notes 5) — ISS3 photo agrees.
   Part positions: M6204A-iss3.pnp (origin 3625, 5825 mil). */
const PNP = (x,y)=>[(3.625 + x/1000 - 2.45)*120, (8.70 - 5.825 - y/1000)*120];
const LEDXY = [[-625.3,2450],[-625.3,2350],[-630.3,2250],[-625.3,2069.4],[-625.3,1970],[-625.3,1870],[-625.3,1770],[-625.3,1590],[-625.3,1490],[-625.3,1390],[-625.3,1290],[-555.3,910]].map(p=>PNP(p[0],p[1]));
const LEDREF = ['LED8 PA7','LED9 PA6','LED10 PA5','LED11 PA4','LED12 PA3','LED13 PA2','LED14 PA1','LED15 PA0','LED2 PE4','LED3 PE5','LED4 PE6','LED7 PE7'];
const PARTS = {U11:[3852.1,1838.8,'AT90CAN128'],U3:[8087.6,1588.4,'EP2C35F484'],U7:[9607.3,2324.6,'GS1559'],U13:[9583.7,769.5,'GS1531'],U1:[10872.2,2323.4,'GS1574A'],U16:[10548,655.1,'GS1528'],
  U6:[9250.3,1443.5,'PLL1705'],U2:[7891.4,875,'ICS662'],U4:[10851.7,1720.5,'DS34LV86'],U5:[10690,1195,'DS34LV86'],U25:[9920,1385,'ADM3485'],U10:[10859,111.8,'CAN'],U12:[7220.4,2055.1,'EPCS16 (bottom)'],
  U18:[4986.7,736.9,'CS8416 AES1'],U31:[5090.1,2283,'CS8416 AES5'],U17:[4965.6,1168,'AD1895'],U33:[5063.9,1844.6,'AD1895']};
function cardSVG(t, opts){
  opts=opts||{}; const w=world(t), sn=snapAt(t), md=modeAt(t); const L = (md==='app'||md==='dead'||md==='boot') && sn? sn.leds : 0;
  let s=`<svg viewBox="0 0 1545 374" role="img" aria-label="M6204A ISS3 card, top side (real gerber artwork)" style="width:100%;display:block;border-radius:6px">
   <defs><filter id="m6Glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect width="1545" height="374" fill="var(--panel2)"/>
   <path d="M5 6 H1478 V57 H1544 V293 H1478 V313 H1544 V357 H1478 V369 H5 Z" fill="#1d5c36" stroke="#0e3a20"/>
   <image href="${ASSET}m6204-card-copper.png" width="1545" height="374"/>
   <image href="${ASSET}m6204-card-silk.png" width="1545" height="374" opacity=".95"/>`;
  LEDXY.forEach(([x,y],i)=>{ const on=(L>>i)&1; s+=`<rect x="${x-7}" y="${y-4.5}" width="14" height="9" rx="1.5" fill="${on?LEDC[i]:'#2b2f2c'}" ${on?'filter="url(#m6Glow)"':''}><title>${LEDN[i]} (${LEDREF[i]})${on?' — on':''}</title></rect>`; });
  const [dx,dy]=PNP(1785,224.5);
  for (let i=0;i<8;i++){ const x=dx-42+i*12, on=w.dip[i];
    s+=`<g class="m6-dip" data-i="${i}" style="cursor:pointer"><rect x="${x-5}" y="${dy-13}" width="10" height="26" rx="1.5" fill="#c4332c" stroke="#7a1b16"/><rect x="${x-3.5}" y="${on?dy-11:dy+1}" width="7" height="10" fill="#f2f2f2"/><rect x="${x-6}" y="${dy-20}" width="12" height="40" fill="transparent"><title>SW1-${i+1}: ${['groups (MSB)','groups (LSB)','cascade group 1','cascade group 2','cascade group 3','cascade group 4','settings from EEPROM','DashBoard disable'][i]} — ${on?'ON':'OFF'} (click)</title></rect></g>`; }
  s+=`<text x="${dx-46}" y="${dy+26}" font-size="10" fill="#ffd36a">1</text><text x="${dx+40}" y="${dy+26}" font-size="10" fill="#ffd36a">8</text><text x="${dx-48}" y="${dy-16}" font-size="8.5" fill="#ffd36a">ON ↑ · position 1 at left (${'inferred'})</text>`;
  if (w.variant==='M6204AE') s+=`<g><rect x="430" y="64" width="500" height="272" rx="6" fill="#3f7a4a" fill-opacity=".88" stroke="#c9b25a" stroke-width="2"/><text x="680" y="190" text-anchor="middle" font-size="22" fill="#fff">CAT-559 encoder module on P5</text><text x="680" y="216" text-anchor="middle" font-size="14" fill="#e8f0e0">72-pin edge connector · M6204AE (photo M6204AE.jpg)</text></g>`;
  if (opts.labels!==false){ const lab=(x,y,txt)=>`<text x="${x}" y="${y}" font-size="13" font-weight="700" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke">${txt}</text>`;
    Object.keys(PARTS).forEach(k=>{ const [x,y,n]=PARTS[k]; const [px,py]=PNP(x,y); if (w.variant==='M6204AE' && px>420 && px<940 && py>60 && py<340) return; s+=lab(px-24, py+(k==='U3'?-60:k==='U11'?-30:-12), n); });
    s+=lab(1490,180,'P1')+lab(1490,340,'P2'); }
  if (!w.card) s+=`<rect width="1545" height="374" fill="var(--panel2)" opacity=".78"/><text x="772" y="200" text-anchor="middle" font-size="40" fill="var(--ink)">card removed from the frame</text>`;
  else if (md==='boot') s+=`<text x="120" y="30" font-size="18" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke">booting: ${(segAt(t)||{label:''}).label.slice(0,70)}</text>`;
  else if (md==='dead') s+=`<text x="120" y="30" font-size="18" fill="#ff8a7a">CLI() trap: interrupts off — no CAN, no timers</text>`;
  return s+'</svg>';
}
/* ---- Artwork 2026|59: card edge and rear modules are the CorelDRAW drawings (converted with Inkscape / the archive's
   LibreOffice renderings, cleaned in tools by the artwork pass). Controls sit on the BNC and LED centres read from those SVGs. */
const ART_DIR = '#OPENGEAR #SERIES/M6204 - #Master #OPENGEAR/M6204 - #Engineering/';
const EDGE_ART = {href:ASSET+'m6204-edge.svg', vb:[120,130,142,456], x:244.05, ys:[151.7,172.3,192.8,228.5,249.7,270.9,292.5,329.4,348.9,368.4,387.9,439.7],
  src:()=>SIM.src(ART_DIR+'M6204-card-edge.cdr','M6204-card-edge.cdr')+' (2009-03-02)'};
const REAR_ART = {
  T6301:{href:ASSET+'m6204-rear-t6301a.svg', vb:[330,213,96,129], cols:[365.83,384.73], y0:254.13, dy:18.9, r:5.85,
    src:()=>SIM.src('#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/M6204A - rear module options.cdr','M6204A - rear module options.cdr')+' (2012-01-09)'},
  T6308:{href:ASSET+'m6204-rear-t6308a.svg', vb:[482,213,98,129], cols:[519.93,538.83], y0:254.08, dy:18.9, r:5.85,
    src:()=>SIM.src('#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/M6204A - rear module options.cdr','M6204A - rear module options.cdr')+' (2012-01-09)'},
  T6305:{href:ASSET+'m6204-rear-t6305.svg', vb:[262,328,274,348], cols:[359.86,419.86], y0:400.5, dy:60, r:18.7,
    src:()=>SIM.src(ART_DIR+'M6204A-T6305.cdr','M6204A-T6305.cdr')+' (2007-10-11)'},
  C700:{href:ASSET+'m6204-rear-c700.svg', vb:[287,293,267.5,348], cols:[383.2,443.3], y0:365.47, dy:59.8, r:18.7,
    src:()=>SIM.src(ART_DIR+'M6204A/Custom/M6204AC700/M6205C400-IO.cdr','M6204AC700/M6205C400-IO.cdr')+' (2009-11-25)'},
};
[EDGE_ART.href, ...Object.values(REAR_ART).map(a=>a.href)].forEach(u=>{ const im=new Image(); im.src=u; });   // warm the image cache: panels are redrawn every tick
function edgeSVG(t){ const sn=snapAt(t), md=modeAt(t); const L=(md!=='off'&&sn)? sn.leds:0; const E=EDGE_ART, v=E.vb;
  const nm=['SD','HD','ERR','AES 1','AES 2','AES 3','AES 4','AES5','AES6','AES7','AES8','CASCADE ON'];
  let s=`<svg viewBox="${v.join(' ')}" style="width:100%;max-width:170px;display:block;border-radius:6px" role="img" aria-label="M6204A card edge (M6204-card-edge.cdr)">
    <defs><filter id="m6EGlow" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <image href="${E.href}" x="${v[0]}" y="${v[1]}" width="${v[2]}" height="${v[3]}"/>`;
  E.ys.forEach((y,i)=>{ const on=(L>>i)&1; s+=`<circle cx="${E.x}" cy="${y}" r="4.2" fill="${on?LEDC[i]:'#2c332c'}" fill-opacity="${on?1:.55}" ${on?'filter="url(#m6EGlow)"':''}><title>${nm[i]} LED (${LEDREF[i]})${on?' — on':' — off'}</title></circle>`; });
  return s+`<text transform="translate(238.5 554.5) rotate(-90)" text-anchor="middle" font-size="9" font-weight="700" fill="#111">M6204A</text></svg>
    <div class="small muted" style="margin-top:2px">Card edge: ${E.src()}</div>`; }
function rearSVG(t){
  const w=world(t), RM=REARS[w.rear], A_=REAR_ART[w.rear], md=modeAt(t), v=A_.vb, r=A_.r;
  let s=`<svg viewBox="${v.join(' ')}" role="img" aria-label="${RM.name}" style="width:100%;max-width:300px;display:block;border-radius:6px">
    <image href="${A_.href}" x="${v[0]}" y="${v[1]}" width="${v[2]}" height="${v[3]}"/>`;
  RM.pos.forEach((p,i)=>{ const cx=A_.cols[i%2], cy=A_.y0+Math.floor(i/2)*A_.dy; const [lab,role]=p;
    let conn=false, key=null, live=false;
    if (role==='sdiin'){ key='sdi'; conn=w.sdi.on; }
    const m=/^aes(\d)$/.exec(role); if (m){ key='aes'+(m[1]-1); conn=w.aes[m[1]-1].on; }
    if (role.startsWith('sdiout')) live = w.card && md==='app';
    const col = key==='sdi'?'#2b5f9e':'#7a3fa0';
    s+=`<g ${key?`class="m6-jack" data-j="${key}" style="cursor:pointer"`:''}>
      ${conn?`<rect x="${cx-r*.28}" y="${cy}" width="${r*.56}" height="${r*1.9}" fill="${col}"/><circle cx="${cx}" cy="${cy}" r="${r*.78}" fill="${col}" opacity=".85"/>`:''}
      ${role.startsWith('sdiout')?`<circle cx="${cx+r*.95}" cy="${cy+r*.95}" r="${r*.2}" fill="${live?'var(--accent)':'#888'}" stroke="#333" stroke-width="${r*.03}"/>`:''}
      <rect x="${cx-r*1.15}" y="${cy-r*1.15}" width="${r*2.3}" height="${r*2.3}" fill="transparent"><title>${i+1} ${lab} (edge P1-${p[2]})${role==='nc'?' — not connected on this card':''}${key?' — click to '+(conn?'unplug':'plug in'):''}</title></rect></g>`; });
  return s+`</svg><div class="small muted" style="margin-top:2px">${w.rear==='C700'?'T6301 (C700)':w.rear+(w.rear==='T6305'?'':'A')}: ${A_.src()} · ${RM.src} · ID ${RM.id}</div>`;
}
function frameSVG(t){ const w=world(t), sn=snapAt(t), md=modeAt(t);
  let s=`<svg viewBox="0 0 640 76" style="width:100%;display:block"><rect width="640" height="76" rx="6" fill="var(--dev)"/>`;
  for (let i=1;i<=20;i++){ const x=10+(i-1)*31, card=(i===w.slot && w.card);
    s+=`<g class="m6-slot" data-s="${i}" style="cursor:pointer"><rect x="${x}" y="8" width="27" height="44" rx="2" fill="${card?'#2f5a3c':'#202326'}" stroke="${i===w.slot?'#e3a35a':'#3a3f44'}" stroke-width="${i===w.slot?2:1}"/>
      ${card?LEDN.map((n,k)=>`<rect x="${x+9}" y="${11+k*3.3}" width="3" height="2.4" fill="${(md!=='off'&&sn&&(sn.leds>>k)&1)? (k===2?'#ff5a4a':k===11?'#ffb43a':'#7dff6a') : '#2c332c'}"/>`).join(''):''}
      <text x="${x+13.5}" y="65" font-size="9" text-anchor="middle" fill="${ADDRESS_TABLE(slotAdc(i))!==i?'#ff5a4a':'#9aa0a5'}">${i}</text><title>Slot ${i}: ID ${SLOT_R[i-1]} Ω → ADC ${slotAdc(i)} → slot ${ADDRESS_TABLE(slotAdc(i))} (margin ${slotMargin(i)})${card?' — M6204A':''}</title></g>`; }
  return s+`<text x="630" y="74" font-size="8" text-anchor="end" fill="#9aa0a5">20-slot frame (front). Every slot decodes correctly with ADC.c’s table (≥ 8 counts margin)</text></svg>`; }

/* DashBoard-style window — a generic parameter editor, not Ross's design */
function dashHTML(t){
  const w=world(t), c=cacheAt(t), md=modeAt(t), sn=snapAt(t); const R=sched();
  const seen = w.card && w.mfc && (D.scn!=='boot' || R.can.some(fr=>fr.dir==='tx' && fr.t<=t));
  const tab=D.ui.dashTab, row=(lab,val,cls)=>`<tr><td class="m6-dl">${lab}</td><td class="${cls||''}">${val}</td></tr>`;
  const v=(o,def)=> c[o]===undefined? def : c[o];
  let body='';
  if (!w.mfc) body='<div class="m6-dmsg">No frame controller — the frame does not appear.</div>';
  else if (!seen) body=`<div class="m6-dmsg">Slot ${w.slot}: no card answering yet.</div>`;
  else if (tab==='info') body=`<table class="m6-dt">${row('Product','<input readonly value="M6204A">')}${row('Name','<input readonly value="MD-SDI Embedded Audio Multiplexer">')}${row('Manufacturer','<input readonly value="Ward-Beck Systems">')}${row('Software Rev','<input readonly value="3.00">')}${row('Website','<input readonly value="www.ward-beck.com">')}</table><div class="m6-dnote">Menu0OID: 1.5, 1.6, 1.2, 1.B, 1.4 (Board Rev 1.7 commented out of DATA_SETUP).</div>`;
  else if (tab==='status'){ const fv=v(0x0204,1);
    body=`<table class="m6-dt">${row('Signal Status (2.1)','<span class="muted">— (v300 never reports it: SIGNAL_STATUS is commented out of PARAMETER_UPDATE)</span>')}
      ${row('SDI Format (2.4)', `<span class="m6-alarm" style="background:${fv>1?'var(--accent)':fv===1?'var(--bad)':'var(--grid)'}"></span> ${fmtValTxt(fv)} <span class="muted mono">0x${hx(fv)}</span>`)}
      ${row('Embedded Audio (2.F)', `<span class="mono">${String(v(0x020F,'--------------------')).replace(/ /g,'&nbsp;')}</span>`)}
      ${row('External AES Inputs (2.2)', `<span class="mono">${String(v(0x0202,'--------------------')).replace(/ /g,'&nbsp;')}</span>`)}
      ${row('Number of Groups Enabled (2.5)', String(v(0x0205,3)+1))}
      ${row('Swap (9.D)', ['Disabled','Enabled'].map((n,i)=>`<label class="m6-r"><input type="radio" name="m6sw" data-o="${0x090D}" data-v="${i}" ${v(0x090D,0)===i?'checked':''}> ${n}</label>`).join(''))}</table>
      <div class="m6-dnote">Strings: two characters per AES (P = PCM, D = AC-3, E = Dolby E, C = other compressed, - = none), four AES pairs per group. Values are what DashBoard last received; the card pushes one status per heartbeat (${(C.TX_HEART+1)*C.T1*1000|0} ms) in the order 2.4 → 2.2 → 2.5 → 2.F unless something changed. Menu1OID lists 11 OIDs but its count byte says 6, so AES status 2.6–2.A never appear.</div>`; }
  else { // routing: Menu2OID order
    const grp = g=>{ let h=`<tr><td colspan="2" class="m6-title">Group ${g+1}</td></tr>`;
      for (let k=0;k<4;k++){ const o=0x0300+4*g+k, even=!(k&1), n=even? 2*g+(k>>1)+1 : 0, val=v(o, even?1:0);
        h+=row(even? `<span class="muted">(3.${(4*g+k).toString(16).toUpperCase()}, name “ ”)</span>` : `<span class="muted">(3.${(4*g+k).toString(16).toUpperCase()}, name “ ”)</span>`, [['External AES '+n,1],['Cascade Embedded AES '+n,0]].map(([lb,vv])=>`<label class="m6-r ${even?'':'m6-odd'}"><input type="radio" name="m6r${o}" data-o="${o}" data-v="${vv}" ${val===vv?'checked':''}> ${lb}</label>`).join('')); }
      return h; };
    const srcg = g=>{ let h=`<tr><td colspan="2" class="m6-title">Group ${g+1} SRC</td></tr>`;
      for (let k=0;k<4;k++){ const o=0x0400+4*g+k, even=!(k&1), val=v(o, even? (g===0&&k===0?1:0) : 0);
        h+=row(`<span class="muted">(4.${(4*g+k).toString(16).toUpperCase()})</span>`, [['Auto',1],['Off',0]].map(([lb,vv])=>`<label class="m6-r ${even?'':'m6-odd'}"><input type="radio" name="m6s${o}" data-o="${o}" data-v="${vv}" ${val===vv?'checked':''}> ${lb}</label>`).join('')); }
      return h; };
    body=`<div class="m6-sub">Routing (5.4)</div><table class="m6-dt">${[0,1,2,3].map(grp).join('')}${row('Settings (9.C)','<button data-save="1">Save</button>')}</table>
      <div class="m6-sub">SRC (5.5)</div><table class="m6-dt">${[0,1,2,3].map(srcg).join('')}${row('Settings (9.C)','<button data-save="1">Save</button>')}</table>
      <div class="m6-dnote">MESSAGE_CREATOR_PARAMETER_33 offers 2 of its 4 choices (choices = 2): “SRC Audio” and “Mute” are defined but never shown. Odd rows (3.1, 3.3 …, 4.1 …) are labelled with digit 0 and write emb_aesN_chb, which nothing uses (pairs 5–8: they overwrite cha). ${sn && !sn.de? '<b style="color:var(--warn)">DIP 8 ON: dashboard_enabled = NO — SETs on even rows are echoed back unchanged.</b>':''}</div>`; }
  return `<div class="m6-dash"><div class="m6-dtitle"><span>Parameter editor — frame tree</span><span class="muted">generic DashBoard-style view</span></div>
   <div class="m6-dwrap"><div class="m6-tree"><div>▾ openGear frame</div><div style="padding-left:12px">▸ Frame controller</div>
     ${[2,w.slot,9].filter((x,i,a)=>a.indexOf(x)===i).sort((a,b)=>a-b).map(i=>`<div style="padding-left:12px" class="${i===w.slot?'m6-sel':''}">${i===w.slot? (seen? '● Slot '+i+': M6204A' : '○ Slot '+i) : '○ Slot '+i+': (other card)'}</div>`).join('')}</div>
    <div class="m6-pane"><div class="m6-phead">Slot ${w.slot}: <b>${seen?'M6204A':'—'}</b> <span class="muted small">${seen?'MD-SDI Embedded Audio Multiplexer':''}</span>${md==='app'||!w.card?'':' <span style="color:var(--warn)">('+md+')</span>'}</div>
      <div class="m6-ptabs">${[['status','Status ▸ Card Status'],['info','Status ▸ Card Info'],['routing','Control ▸ Card Settings']].map(([k,l])=>`<button data-dt="${k}" class="${tab===k?'on':''}">${l}</button>`).join('')}</div>
      <div class="m6-pbody">${body}</div>
      <div class="m6-pfoot"><button data-da="open">Open / rescan</button></div></div></div></div>`;
}
const M6_CSS = `<style>
.m6-dash{border:1px solid var(--line);border-radius:6px;background:var(--panel2);font:12.5px var(--sans);overflow:hidden}
.m6-dtitle{display:flex;justify-content:space-between;padding:5px 8px;background:color-mix(in srgb,var(--accent2) 22%,var(--panel));border-bottom:1px solid var(--line);font-weight:600}
.m6-dwrap{display:grid;grid-template-columns:140px minmax(0,1fr);min-height:250px}
.m6-tree{border-right:1px solid var(--line);padding:6px;font-size:12px;background:var(--lane)}
.m6-sel{background:color-mix(in srgb,var(--accent) 22%,transparent);border-radius:3px}
.m6-pane{display:flex;flex-direction:column;min-width:0}.m6-phead{padding:6px 8px;border-bottom:1px solid var(--line)}
.m6-ptabs{display:flex;flex-wrap:wrap;gap:3px;padding:5px 6px 0}.m6-ptabs button{font-size:11.5px;padding:3px 7px;border-radius:5px 5px 0 0}
.m6-pbody{padding:8px;flex:1;border-top:1px solid var(--line);max-height:520px;overflow:auto}
.m6-dt{border-collapse:collapse;width:100%}.m6-dt td{padding:3px 6px;border-bottom:1px dashed var(--grid);vertical-align:top}
.m6-dl{color:var(--ink2);width:34%}.m6-title{font-weight:700;padding-top:7px!important;color:var(--accent2)}
.m6-sub{font-weight:700;margin:6px 0 2px;border-bottom:2px solid var(--line)}
.m6-dt input[readonly]{width:100%;background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:2px 5px;color:var(--ink);font:12px var(--mono)}
.m6-r{display:inline-block;margin-right:10px;white-space:nowrap}.m6-odd{opacity:.6}
.m6-alarm{display:inline-block;width:11px;height:11px;border-radius:50%;vertical-align:-1px}
.m6-dnote{margin-top:6px;font-size:11.5px;color:var(--ink2)}.m6-dmsg{padding:20px;color:var(--ink2)}
.m6-pfoot{display:flex;flex-wrap:wrap;gap:5px;padding:6px;border-top:1px solid var(--line)}.m6-pfoot button{font-size:11.5px;padding:3px 7px}
.m6-ctl{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px}
.m6-ctl select,.m6-ctl button{font-size:12px;padding:3px 6px}
.m6-blk{cursor:pointer}.m6-blk:hover rect{stroke:var(--accent);stroke-width:2.5}
.m6-bits td{font:11px var(--mono);padding:1px 4px;text-align:center;border:1px solid var(--grid)}
.m6-step{padding:4px 8px;border:1px solid var(--line);border-radius:6px;margin:3px 0;font-size:12.5px}
.m6-step.on{background:color-mix(in srgb,var(--accent) 25%,transparent);border-color:var(--accent)}
@media (max-width:700px){.m6-dwrap{grid-template-columns:1fr}.m6-tree{border-right:none;border-bottom:1px solid var(--line)}}
</style>`;

function bindAll(root){
  root.querySelectorAll('.m6-dip').forEach(g=>g.onclick=()=>A.dip(+g.dataset.i));
  root.querySelectorAll('.m6-jack').forEach(g=>g.onclick=()=>{ const k=g.dataset.j; if (k==='sdi') A.sdiCable(); else A.aesCable(+k.slice(3)); });
  root.querySelectorAll('.m6-slot').forEach(g=>g.onclick=()=>A.setSlot(+g.dataset.s));
  root.querySelectorAll('[data-dt]').forEach(b=>b.onclick=()=>{ D.ui.dashTab=b.dataset.dt; SIM.refresh(); });
  root.querySelectorAll('.m6-pbody input[type=radio]').forEach(r=>r.onchange=()=>A.dashSet(+r.dataset.o, +r.dataset.v));
  root.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>A.dashSet(0x090C, 0));
  root.querySelectorAll('[data-da]').forEach(b=>b.onclick=()=>A.dashOpen());
}
function controlsHTML(){
  const w=world(absT()); const opt=(v,cur,l)=>`<option value="${v}" ${v===cur?'selected':''}>${l}</option>`;
  return `<div class="m6-ctl small">
    <label>Scenario <select id="m6Scn">${Object.keys(SCN).map(k=>opt(k,D.scn,SCN[k].label)).join('')}</select></label>
    ${SCN[D.scn].pages.length>1?`<label>Page <select id="m6Pg">${SCN[D.scn].pages.map((p,i)=>opt(String(i),String(D.page),p[1])).join('')}</select></label>`:''}
    <label>SDI source <select id="m6Fmt">${Object.keys(VF).map(k=>opt(k,w.sdi.fmt,VF[k].name)).join('')}</select></label>
    <span>groups in source ${[0,1,2,3].map(g=>`<label><input type="checkbox" class="m6-gm" data-g="${g}" ${(w.sdi.gm>>g)&1?'checked':''}>G${g+1}</label>`).join(' ')}</span>
    <label>Rear <select id="m6Rear">${Object.keys(REARS).map(k=>opt(k,w.rear,k)).join('')}</select></label>
    <label>Variant <select id="m6Var">${['M6204A','M6204AE'].map(k=>opt(k,w.variant,k)).join('')}</select></label></div>
   <div class="m6-ctl small">${w.aes.map((a,i)=>`<label title="AES IN${i+1}">AES${i+1} <select class="m6-ak" data-i="${i}">${Object.keys(KIND).map(k=>opt(k,a.kind,{pcm:'PCM 48k',pcm441:'PCM 44.1k',ac3:'AC-3',dolbye:'Dolby E'}[k])).join('')}</select><input type="checkbox" class="m6-ao" data-i="${i}" ${a.on?'checked':''} title="cable plugged"></label>`).join('')}</div>
   <div class="m6-ctl small"><button id="m6CardBtn">${w.card?'Pull card':'Insert card'}</button><button id="m6Open">Open DashBoard</button><button id="m6Mfc">${w.mfc?'Remove':'Fit'} frame controller</button>
    <button id="m6Next" title="Carry the state at the end into a new second">Next second ▶</button><button id="m6Rst">Reset</button>
    <label title="After an action, move the playhead to it"><input type="checkbox" id="m6Fol" ${D.ui.follow?'checked':''}> follow</label>
    <span class="muted">second ${D.second} · keys: d = DIP 1, s = SDI cable, 1–8 = AES cables, o = open DashBoard, n = next second</span></div>`;
}
function bindControls(root){
  const q=s=>root.querySelector(s); if (!q('#m6Fmt')) return;
  q('#m6Scn').onchange=e=>{ D.scn=e.target.value; D.page=0; D.ev=[]; D.carry=null; SKEY=''; SIM.seek(0); };
  if (q('#m6Pg')) q('#m6Pg').onchange=e=>{ D.page=+e.target.value; SIM.refresh(); };
  q('#m6Fmt').onchange=e=>A.sdiFmt(e.target.value);
  root.querySelectorAll('.m6-gm').forEach(c=>c.onchange=()=>{ let m=0; root.querySelectorAll('.m6-gm').forEach(x=>{ if (x.checked) m|=1<<(+x.dataset.g); }); A.sdiGroups(m); });
  q('#m6Rear').onchange=e=>A.setRear(e.target.value); q('#m6Var').onchange=e=>A.variant(e.target.value);
  root.querySelectorAll('.m6-ak').forEach(s=>s.onchange=()=>A.aesKind(+s.dataset.i, s.value));
  root.querySelectorAll('.m6-ao').forEach(s=>s.onchange=()=>A.aesCable(+s.dataset.i));
  q('#m6CardBtn').onclick=()=>A.card(); q('#m6Open').onclick=()=>A.dashOpen(); q('#m6Mfc').onclick=()=>A.mfc();
  q('#m6Next').onclick=()=>{ rollSecond(); }; q('#m6Rst').onclick=()=>{ resetAll(); };
  q('#m6Fol').onchange=e=>{ D.ui.follow=e.target.checked; };
}
document.addEventListener('keydown', e=>{
  if (!window.__m6204Keys || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase();
  if (k==='d') A.dip(0); else if (k==='s') A.sdiCable(); else if (k==='o') A.dashOpen(); else if (k==='n') rollSecond(); else if (k>='1' && k<='8') A.aesCable(+k-1); else return;
  e.preventDefault();
});

/* =====================================================================
   TIMELINE LANES
   ===================================================================== */
function txtFit(c, s, x, y, maxW){ if (maxW < 18) return; let t=s; while (t.length>2 && c.measureText(t).width > maxW-4) t=t.slice(0,-1); if (t.length<s.length) t=t.slice(0,-1)+'…'; c.fillText(t, x, y); }
function lanes(opts){
  opts=opts||{}; const R=sched(), P0=page0(), css=n=>SIM.css(n), A0=t=>P0+t, ls=[];
  const runs=(fn)=>{ const out=[]; let cur=null; R.snaps.forEach(sn=>{ const v=fn(sn); if (!cur || cur.v!==v){ if (cur) cur.t1=sn.t; cur={t0:sn.t, v}; out.push(cur); } }); if (cur) cur.t1=R.endT||SCN[D.scn].end; return out; };
  const segBand=(c,X,y,h,kinds)=>R.segs.forEach(g=>{ if (!kinds.includes(g.kind)) return; const a=X(g.t0-P0), b=X(g.t1-P0); c.fillStyle= g.kind==='off'? css('--grid') : css('--warn'); c.globalAlpha=.4; c.fillRect(a,y+3,Math.max(1,b-a),h-6); c.globalAlpha=1; if (b-a>140){ c.save(); c.beginPath(); c.rect(a,y,b-a,h); c.clip(); c.fillStyle=css('--ink'); c.font='10.5px '+css('--mono'); c.fillText(g.label, Math.max(a,X(0))+4, y+h/2+4); c.restore(); } });
  ls.push({label:'Card mode (boot · main loop)', h:24, draw(c,X,t0,t1,y,h){ runs(sn=>sn.mode).forEach(g=>{ if (g.v==='app'||g.v==='dead'){ c.fillStyle=css(g.v==='dead'?'--bad':'--accent'); c.globalAlpha=.2; c.fillRect(X(g.t0-P0),y+5,X(g.t1-P0)-X(g.t0-P0),h-10); c.globalAlpha=1; } }); segBand(c,X,y,h,['boot','off']); }});
  ls.push({label:'SDI in: frames / fields', h:24, draw(c,X,t0,t1,y,h){ const w=world(A0(SIM.t)); if (!w.sdi.on){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('no SDI cable', X(t0)+6, y+h/2+4); return; }
    const f=VF[w.sdi.fmt], Tf=1/f.fr, a=A0(t0), b=A0(t1), n0=Math.floor(a/Tf), n1=Math.ceil(b/Tf);
    if (n1-n0>300){ SIM.pulses(c,X,t0,t1,y,h,Tf,(-P0)%Tf,Tf*0.02,css('--accent2'),'frames'); return; }
    c.font='10px '+css('--mono'); for (let n=n0;n<=n1;n++){ const x=X(n*Tf-P0); c.fillStyle=css('--accent2'); c.fillRect(x,y+3,2,h-6); if (f.lines!==750){ c.globalAlpha=.5; c.fillRect(X(n*Tf+Tf/2-P0),y+7,1.5,h-14); c.globalAlpha=1; } if (X((n+1)*Tf-P0)-x>60){ c.fillStyle=css('--ink'); c.fillText('frame '+n, x+4, y+12); } } }});
  ls.push({label:'SDI out lines: EAV · HANC · SAV', h:30, draw(c,X,t0,t1,y,h){ const w=world(A0(SIM.t)); if (!w.sdi.on||!w.card) return; const f=VF[w.sdi.fmt], Tl=lineT(f), wt=1/f.clk, a=A0(t0), b=A0(t1);
    const pxL=X(t0+Tl)-X(t0); if (pxL<3){ SIM.pulses(c,X,t0,t1,y,h,Tl,(-P0)%Tl,Tl*0.12,css('--ink2'),`lines (${f.lines}/frame, ${f.spl} words)`); return; }
    const G=fpgaGroupsOut(w); for (let n=Math.floor(a/Tl); n<=Math.ceil(b/Tl); n++){ const ta=n*Tl-P0, xe=X(ta), xh=X(ta+f.hdr*wt), xs=X(ta+(f.spl-f.act-4)*wt), xa=X(ta+(f.spl-f.act)*wt), xn=X(ta+Tl);
      c.fillStyle=css('--bad'); c.fillRect(xe,y+4,Math.max(1,xh-xe),h-8); c.fillStyle=css('--chip'); c.fillRect(xh,y+4,xs-xh,h-8); c.fillStyle=css('--warn'); c.fillRect(xs,y+4,Math.max(1,xa-xs),h-8); c.fillStyle=css('--grid'); c.fillRect(xa,y+4,xn-xa,h-8);
      if (pxL>30) outPackets(f,n,G).forEach(p=>{ c.fillStyle=css(GCOL[p.g]); c.fillRect(X(ta+p.w0*wt),y+7,Math.max(1,X(ta+p.w1*wt)-X(ta+p.w0*wt)-.5),h-14); });
      if (pxL>160){ c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); txtFit(c,'line '+((n%f.lines)+1), xa+4, y+h/2+4, xn-xa); } } }});
  ls.push({label:'HANC in (source packets)', h:26, draw(c,X,t0,t1,y,h){ hancLane(c,X,t0,t1,y,h,false); }});
  ls.push({label:'HANC out (inserted by HD_mux / SD_mux)', h:34, draw(c,X,t0,t1,y,h){ hancLane(c,X,t0,t1,y,h,true); }});
  ls.push({label:'48 kHz samples (SRC out / AES)', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/48000,(-P0)%(1/48000),2e-6,css('--accent'),'samples'); }});
  ls.push({label:'Main loop pass (v100w.c while(1))', h:30, draw(c,X,t0,t1,y,h){
    const pxP=X(t0+PASS_T)-X(t0);
    if (pxP<3){ runs(sn=>sn.mode).forEach(g=>{ if (g.v==='app'){ c.fillStyle=css('--accent'); c.globalAlpha=.5; c.fillRect(X(g.t0-P0),y+4,X(g.t1-P0)-X(g.t0-P0),h-8); c.globalAlpha=1; } });
      R.saves.forEach(s=>{ c.fillStyle=css('--bad'); c.fillRect(X(s.t0-P0),y+4,Math.max(2,X(s.t1-P0)-X(s.t0-P0)),h-8); });
      const n=R.passes.filter(p=>p.t0>=A0(t0)&&p.t0<A0(t1)).length; if (X(t1)-X(t0)>200 && n){ c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${n.toLocaleString()} passes, ≈${(PASS_T*1e3).toFixed(2)} ms each (${'cycle estimate'})`, X(t0)+6, y+h/2+4); } segBand(c,X,y,h,['boot']); return; }
    R.passes.forEach(p=>{ if (p.t1<A0(t0)||p.t0>A0(t1)) return; p.st.forEach((s0,j)=>{ const s1 = j+1<p.st.length? p.st[j+1] : p.t1; c.fillStyle=css(j===2?'--accent2':j===1?'--warn':j===8?'--bad':'--accent'); c.globalAlpha=j%2?.6:.9; c.fillRect(X(s0-P0),y+4,Math.max(1,X(s1-P0)-X(s0-P0)-.5),h-8); c.globalAlpha=1;
      if (X(s1-P0)-X(s0-P0)>70){ c.fillStyle='#fff'; c.font='10px sans-serif'; txtFit(c, STEPS[j][0], X(s0-P0)+2, y+h/2+3, X(s1-P0)-X(s0-P0)); } }); }); segBand(c,X,y,h,['boot']); }});
  ls.push({label:'ALTERA_read_write 128 bits (CLI)', h:26, draw(c,X,t0,t1,y,h){ const xs=R.xfers.filter(x=>x.t1>=A0(t0)&&x.t0<=A0(t1)); const pxX=X(t0+C.XFER)-X(t0);
    if (pxX<2){ c.fillStyle=css('--accent2'); c.globalAlpha=.35; c.fillRect(X(t0),y+6,X(t1)-X(t0),h-12); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); if (X(t1)-X(t0)>200) c.fillText(`${xs.length.toLocaleString()} exchanges · interrupts off ${(C.XFER/PASS_T*100).toFixed(0)} % of the time`, X(t0)+6, y+h/2+4); return; }
    xs.forEach(x=>{ const a=X(x.t0-P0), b=X(x.t1-P0); c.fillStyle=css('--accent2'); c.globalAlpha=.25; c.fillRect(a,y+3,b-a,h-6); c.globalAlpha=1;
      if (b-a>400){ c.strokeStyle=css('--ink'); c.lineWidth=1; c.beginPath(); for (let k=0;k<128;k++){ const bit=(x.out[k>>3]>>(k&7))&1; const xa=X(x.t0+k*C.XFER/128-P0), xb=X(x.t0+(k+1)*C.XFER/128-P0); c.moveTo(xa,y+(bit?6:h-6)); c.lineTo(xb,y+(bit?6:h-6)); } c.stroke();
        c.fillStyle=css('--ink'); c.font='9px '+css('--mono'); for (let k=0;k<16;k++){ const xa=X(x.t0+k*C.XFER/16-P0), xb=X(x.t0+(k+1)*C.XFER/16-P0); if (xb-xa>40) c.fillText('out['+k+']=0x'+hx(x.out[k]), xa+2, y+h-2); } }
      else if (b-a>70){ c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); txtFit(c,`out ${hx(x.out[1])}${hx(x.out[0])}… in[15]=${hx(x.inb[15])}`, a+2, y+h/2+4, b-a); } }); }});
  ls.push({label:'timer0 1 ms · SD reset · swap (ch16)', h:28, draw(c,X,t0,t1,y,h){
    runs(sn=>sn.sdr?1:0).forEach(g=>{ if (g.v){ c.fillStyle=css('--bad'); c.globalAlpha=.5; c.fillRect(X(g.t0-P0),y+3,Math.max(1,X(g.t1-P0)-X(g.t0-P0)),h/2-3); c.globalAlpha=1; } });
    runs(sn=>sn.swOut).forEach(g=>{ if (g.v){ c.fillStyle=css('--warn'); c.globalAlpha=.6; c.fillRect(X(g.t0-P0),y+h/2,Math.max(1,X(g.t1-P0)-X(g.t0-P0)),h/2-3); c.globalAlpha=1; if (X(g.t1-P0)-X(g.t0-P0)>150){ c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText('swap = YES: HD ch16 = 0xAAAAAA', X(g.t0-P0)+4, y+h-6); } } });
    if (X(t0+C.T0)-X(t0)>4) SIM.pulses(c,X,t0,t1,y,h/2,C.T0,(-P0)%C.T0,6e-6,css('--ink2'),''); }});
  ls.push({label:'CAN 1 Mbit/s (▼ rx · ▲ tx)', h:30, draw(c,X,t0,t1,y,h){ let n=0;
    R.can.forEach(fr=>{ const a=fr.t-P0, b=a+fr.dur; if (b<t0||a>t1) return; n++; const xa=X(a), xb=Math.max(xa+2,X(b)); c.fillStyle=css(fr.dir==='rx'?'--accent2':'--accent'); c.fillRect(xa, fr.dir==='rx'? y+3 : y+h/2, xb-xa, h/2-3);
      if (xb-xa>90){ c.fillStyle='#fff'; c.font='10px '+css('--mono'); txtFit(c, fr.desc, xa+2, fr.dir==='rx'? y+h/2-4 : y+h-6, xb-xa); } });
    if (!n){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('bus idle in this window', X(t0)+6, y+h/2+4); } }});
  ls.push({label:'LEDs (SD HD ERR AES1–8 CASC)', h:36, draw(c,X,t0,t1,y,h){ const rh=(h-4)/12;
    for (let i=0;i<12;i++) runs(sn=>(sn.leds>>i)&1).forEach(g=>{ if (g.v){ c.fillStyle= i===2? css('--bad') : i===11? css('--warn') : css('--accent'); c.fillRect(X(g.t0-P0), y+2+i*rh, Math.max(1,X(g.t1-P0)-X(g.t0-P0)), rh-0.6); } }); segBand(c,X,y,h,['off']); }});
  return ls;
}
function hancLane(c,X,t0,t1,y,h,out){
  const P0=page0(), css=n=>SIM.css(n), w=world(P0+SIM.t); if (!w.sdi.on || (out && !w.card)) return;
  const f=VF[w.sdi.fmt], Tl=lineT(f), wt=1/f.clk, a=P0+t0, b=P0+t1, n0=Math.floor(a/Tl), n1=Math.ceil(b/Tl);
  const G=fpgaGroupsOut(w), gm=w.sdi.gm, sn=snapAt(P0+SIM.t);
  const gs = out? [...Array(G).keys()] : [0,1,2,3].filter(g=>(gm>>g)&1);
  if (!gs.length){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText(out?'no groups':'no embedded audio in the source', X(t0)+6, y+h/2+4); return; }
  if (n1-n0 > (X(t1)-X(t0))/2){ c.globalAlpha=.3; gs.forEach((g,k)=>{ c.fillStyle=css(GCOL[g]); c.fillRect(X(t0), y+3+k*(h-6)/gs.length, X(t1)-X(t0), (h-6)/gs.length-1); }); c.globalAlpha=1;
    c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${f.std===2? (48000*gs.length).toLocaleString()+' packets/s (one per sample per group), 31 words each' : 'one packet per group per line (≈'+(48000/(f.fr*f.lines)).toFixed(2)+' samples)'} · DIDs ${gs.map(g=>(f.std===1?DID.sd:DID.hd)[g]+'h').join(' ')}${out? ' · sources '+[0,1,2,3,4,5,6,7].slice(0,2*G).map(p=>sn?['E','A','S','M'][sn.emb[p]]:'?').join(''):''}`, X(t0)+6, y+h/2+4); return; }
  for (let n=n0;n<=n1;n++){ const ta=n*Tl-P0; const pk = out? outPackets(f,n,G) : inPackets(f,n,gm);
    pk.forEach(p=>{ const xa=X(ta+p.w0*wt), xb=X(ta+p.w1*wt); c.fillStyle=css(GCOL[p.g]); c.fillRect(xa, y+3+p.g*(h-6)/4, Math.max(1.5,xb-xa), (h-6)/4-1);
      if (xb-xa>70){ c.fillStyle='#fff'; c.font='10px '+css('--mono'); txtFit(c, `G${p.g+1} ${(f.std===1?DID.sd:DID.hd)[p.g]}h s${p.s}`, xa+2, y+3+p.g*(h-6)/4+(h-6)/4-2, xb-xa); } });
    if (out && ctlLine(f,(n%f.lines)+1)){ c.strokeStyle=css('--ink'); c.setLineDash([3,2]); c.strokeRect(X(ta+f.hdr*wt), y+1, Math.max(2,X(ta+(f.hdr+18*G)*wt)-X(ta+f.hdr*wt)), h-2); c.setLineDash([]); } }
}

/* =====================================================================
   VIEWS
   ===================================================================== */
function card(title, body, extra){ return `<div class="card" ${extra||''}><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ const l=D.log[0]; return l? `<div><b>${l.name}</b> <span class="muted">at ${SIM.fmtT(l.t)} (second ${l.sec})</span></div>`+l.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click the DIP switch, a rear BNC, a slot, or a DashBoard parameter. Each step the firmware and FPGA take is listed here with the names from the source.</div>'; }
function inspHTML(t){
  const sn=snapAt(t), w=world(t), md=modeAt(t), st=stepAt(t), g=segAt(t);
  if (!sn) return '<span class="muted">no state yet</span>';
  const G=fpgaGroupsOut(w);
  return `<table class="kv small">
   <tr><th>Card</th><td>${md}${md==='boot'&&g?': '+g.label:''}${md==='app'&&st>=0?' · now in <b>'+STEPS[st][0]+'</b>':''}</td></tr>
   <tr><th>SDI</th><td>${w.sdi.on? VF[w.sdi.fmt].name+' · source groups '+([1,2,3,4].filter(x=>(w.sdi.gm>>(x-1))&1).join(',')||'none') : 'no cable'} · sdi_format = ${['NO_LOCK','SD_FORMAT','HD_FORMAT'][sn.fmt]}</td></tr>
   <tr><th>Embedder</th><td>${G} group(s) from DIP 1–2 (FPGA) · AVR audio_groups_enabled = ${sn.ag} · number_of_groups sent = 3</td></tr>
   <tr><th>Router</th><td class="mono">${sn.emb.map((e,i)=>`AES${i+1}:${['EMB','AES','SRC','MUTE'][e]}`).join(' ')}</td></tr>
   <tr><th>Ext AES</th><td class="mono">${sn.al.map((v,i)=>`${i+1}:${LOCK_NAME[v]}`).join(' ')}</td></tr>
   <tr><th>Reset / swap</th><td>reset_enable ${sn.re} · reset_active ${sn.ra} · sd_audio_stable ${sn.ss} (ctr ${sn.ssc}) · hd_audio_stable_count ${sn.hc} · swap ${sn.swap} → ch16 ${sn.swOut?'0xAAAAAA':'audio'}</td></tr>
   <tr><th>Flags</th><td>dip_switch_enabled ${sn.de!==undefined?(sn.dse?'YES':'NO'):'—'} · dashboard_enabled ${sn.de?'YES':'NO'} · dashboard_initializing ${sn.init?'YES':'NO'}${sn.cli?' · <b style="color:var(--bad)">CLI trap</b>':''}</td></tr></table>`;
}
function canLogHTML(t){ const R=sched(), P0=page0(); const L=R.can.filter(f=>f.t<=P0+t).slice(-8).reverse();
  return L.length? L.map(f=>`<div><span class="muted">${SIM.fmtT(f.t-P0)}</span> ${f.dir==='rx'?'▼':'▲'} 0x${hx(f.type)} ${f.desc}</div>`).join('') : '<div class="muted">no CAN traffic yet in this second</div>'; }
function viewSim(m){
  window.__m6204Keys=true;
  m.innerHTML = M6_CSS + `${card('M6204A card — ISS3 artwork from the Gerbers (click DIP SW1)', `<div id="m6Card"></div><div class="small muted" style="margin-top:4px">Copper/pads M6204A-ISS3.TOP+TSM, silk .TSS, positions from M6204A-iss3.pnp; LEDs and SW1 sit on their placement coordinates. Green mask per the fab note and the ISS3 photo (ISS1/ISS2 were black).</div>`)}
   <div class="grid2"><div>${card('Rear module, frame and card edge', `<div style="display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:10px;align-items:start"><div id="m6Rear"></div><div><div id="m6Edge"></div></div></div><div id="m6Frame" style="margin-top:8px"></div>`)}</div>
   <div>${card('DashBoard (parameter editor)', `<div id="m6Dash"></div>`)}</div></div>
   ${card('World', controlsHTML())}
   <div class="grid2">${card('What the firmware did', `<div class="log" id="m6Trace"></div>`)}${card('State at the playhead', `<div id="m6Insp"></div><h3>CAN (last frames)</h3><div class="log" id="m6Can" style="max-height:170px"></div>`)}</div>
   ${card('One second on the card — zoom with “Zoom window”, step with the transport', `<canvas id="m6Tl"></canvas>`)}`;
  bindControls(m);
  const draw=()=>{ const t=absT();
    m.querySelector('#m6Card').innerHTML=cardSVG(t); m.querySelector('#m6Rear').innerHTML=rearSVG(t); m.querySelector('#m6Edge').innerHTML=edgeSVG(t); m.querySelector('#m6Frame').innerHTML=frameSVG(t);
    m.querySelector('#m6Dash').innerHTML=dashHTML(t); m.querySelector('#m6Trace').innerHTML=traceHTML(); m.querySelector('#m6Insp').innerHTML=inspHTML(t); m.querySelector('#m6Can').innerHTML=canLogHTML(SIM.t);
    bindAll(m); SIM.drawLanes(m.querySelector('#m6Tl'), lanes(), {labelW:190}); };
  SIM.on('time', draw);
  const oldAct = m.__act;
}
/* ---------------- tutorial (from the operational info doc, DIP sheet and the firmware) ---------------- */
function endSnap(){ const R=sched(); return R.snaps[R.snaps.length-1]; }
const LESSONS = [
  {title:'1 · Read the card edge', body:`<p>The M6204A has twelve LEDs at the front edge (silk: SD, HD, ERR, AES 1–8, ON). <span class="mono">REFRESH_LEDS</span> lights <b>SD</b> for SD-SDI and <b>SD + HD</b> together for HD-SDI, <b>ERR</b> (red) with no SDI lock, AES <i>n</i> when CS8416 <i>n</i> is locked, and the bottom yellow LED when any pair is set to cascade (the card-edge drawing calls it “CASCADE ON”).</p><p><b>Goal:</b> plug SDI IN on the rear (position 1) so that the HD LED lights.</p>`,
   hint:'Scenario “HD source plugged…” starts unplugged; or click BNC 1 on the rear module.', goal:()=>{ const s=endSnap(); return s && (s.leds&2); }},
  {title:'2 · Set the number of groups (DIP 1–2)', body:`<p>SW1 positions 1 and 2 choose how many audio groups the embedder writes: OFF/OFF = 1, OFF/ON = 2, ON/OFF = 3, ON/ON = 4 (DIP sheet). In the v300 FPGA these two switches drive <span class="mono">mux_active_groups</span> directly; the AVR only reports the number to DashBoard (OID 2.5).</p><p><b>Goal:</b> make the embedder write exactly 2 groups.</p>`,
   hint:'Position 1 OFF, position 2 ON. Watch the “HANC out” lane: only G1 and G2 packets remain.', goal:()=>fpgaGroupsOut(world(page0()+0.999))===2},
  {title:'3 · Feed external AES', body:`<p>With a T6301A, AES IN1–7 are BNCs 3–8 and 2. Each goes through a DS34LV86T line receiver, through the FPGA and into its own CS8416. The AVR reads register 0x0C of all eight receivers every pass and lights AES <i>n</i>.</p><p><b>Goal:</b> AES 4 and AES 5 LEDs on.</p>`,
   hint:'Click rear positions 6 (AES IN4) and 7 (AES IN5), or tick AES4/AES5 in the World row.', goal:()=>{ const s=endSnap(); return s && (s.leds>>6&1) && (s.leds>>7&1); }},
  {title:'4 · Cascade or external, per group (DIP 3–6)', body:`<p>Positions 3–6 choose, per group, whether the incoming embedded pairs pass through (“cascade”, ON) or the external AES pairs replace them (OFF). They apply live only when position 7 is OFF (DIP mode) <i>and</i> position 8 is ON (DashBoard disabled); otherwise <span class="mono">main()</span> reads them once at power-up.</p><p><b>Goal:</b> group 2 external (AES 3/4) and the CASCADE LED off.</p>`,
   hint:'Set position 8 ON, re-seat the card (click its slot) so dashboard_enabled = NO, then turn position 4 OFF. Or use the DashBoard routing page instead.', goal:()=>{ const s=endSnap(); return s && s.cha[2]===1 && s.cha[3]===1 && !(s.leds>>11&1); }},
  {title:'5 · Hand control to DashBoard', body:`<p>Position 7 ON means “card parameters from non-volatile memory”; position 8 OFF lets DashBoard change them. Both are read only in <span class="mono">main()</span>. A blank card restores nothing (EEPROM byte 10 ≠ 0xAA) and starts with every pair external, SRC only on pair 1.</p><p><b>Goal:</b> dip_switch_enabled = NO and dashboard_enabled = YES.</p>`,
   hint:'Position 7 ON, position 8 OFF, then click the card’s slot to re-seat it (or Pull/Insert). The boot takes ≈1.1 s; press “Next second” if needed.', goal:()=>{ const s=endSnap(); return s && !s.dse && s.de; }},
  {title:'6 · Route in DashBoard', body:`<p>Control ▸ Card Settings lists Group 1–4 with one radio pair per AES: “External AES <i>n</i>” or “Cascade Embedded AES <i>n</i>”. Each choice is a SET_PARAM to OID 3.(2<i>n</i>−2), answered from the CAN interrupt. The SRC page sets <span class="mono">auto_src</span>: Auto puts PCM through the AD1895 rate converter and lets Dolby bitstreams bypass it.</p><p><b>Goal:</b> pair 3 external with SRC Auto, so the router sends SRC for a PCM input.</p>`,
   hint:'Routing: Group 2 first row → External AES 3. SRC: Group 2 SRC first row → Auto. Plug AES IN3 (PCM 44.1k in the default world).', goal:()=>{ const s=endSnap(); return s && s.emb[2]===2; }},
  {title:'7 · Save to EEPROM', body:`<p>“Save” (OID 9.C) sets <span class="mono">save_settings</span>; the main loop then calls <span class="mono">SAVE_INFORMATION_EEPROM</span>: byte 10 = 0xAA, bytes 11–18 = emb_aes1…8_cha, 21–28 = auto_src. The write-if-different EEPROM driver stalls the loop ≈8.5 ms per changed byte ${inf}.</p><p><b>Goal:</b> the EEPROM holds a valid image.</p>`,
   hint:'Press Save on the Card Settings page; the red block in the main-loop lane is the stall.', goal:()=>{ const R=sched(); return R.end && R.end.ee && R.end.ee.valid; }},
  {title:'8 · Dolby E on an AES input', body:`<p>Set AES IN4 to a Dolby E source. The FPGA’s non-audio detector flags it, <span class="mono">PROCESS_AUDIO_INFORMATION</span> makes <span class="mono">aes4_lock = DOLBY_E</span>, and with <span class="mono">auto_src</span> on, <span class="mono">ALTERA_SORT</span> switches the pair to the direct AES path so the bitstream is not resampled. DashBoard’s “External AES Inputs” string shows <b>EE</b> for it.</p><p><b>Goal:</b> pair 4 carries a Dolby E source and is routed AES (not SRC).</p>`,
   hint:'World row: AES4 → Dolby E and plugged; DIP mode gives auto_src = YES on every pair.', goal:()=>{ const s=endSnap(); return s && s.al[3]===3 && s.emb[3]===1; }},
  {title:'9 · See where the packets go', body:`<p>Open “One second, frame by frame”. Zoom to <b>30 µs</b> (one HD line): after EAV, LN and CRC the HD_mux core writes one 31-word packet per audio sample per group into the C-stream HANC. Line 8 (the line after the switching line 7) carries none, so line 9 carries three samples’ worth.</p><p><b>Goal:</b> zoom window of 30 µs or less.</p>`,
   hint:'Transport: Zoom window → 30 µs (1 HD line) or 4 µs.', goal:()=>SIM.win<=0.00003+1e-9},
  {title:'10 · Lock DashBoard out', body:`<p>With position 8 ON at power-up, <span class="mono">dashboard_enabled = NO</span>: SET_PARAM replies echo the old value and nothing changes — except the odd rows (3.1, 3.3 …) and Swap, which the code never checks.</p><p><b>Goal:</b> a DashBoard SET that the card refused.</p>`,
   hint:'Position 8 ON, re-seat, then click a routing radio button. The trace says “echoes”.', goal:()=>sched().can.some(f=>f.dir==='tx' && /echoes/.test(f.desc))},
];
function viewTutorial(m){
  window.__m6204Keys=true;
  m.innerHTML = M6_CSS + `<div class="grid2"><div>${LESSONS.map((L,i)=>card(L.title, L.body+`<div class="small"><b>Goal:</b> <span id="m6g${i}"></span> · <a href="#" data-h="${i}">hint</a><div id="m6h${i}" class="muted" style="display:none">${L.hint}</div></div>`)).join('')}</div>
   <div>${card('Card', `<div id="m6Card"></div><div style="display:grid;grid-template-columns:minmax(0,260px) minmax(0,1fr);gap:8px;margin-top:8px"><div id="m6Rear"></div><div id="m6Edge"></div></div><div id="m6Frame"></div>`)}${card('DashBoard', `<div id="m6Dash"></div>`)}${card('World', controlsHTML())}${card('Trace', `<div class="log" id="m6Trace"></div>`)}</div></div>`;
  bindControls(m);
  m.querySelectorAll('[data-h]').forEach(a=>a.onclick=e=>{ e.preventDefault(); const d=m.querySelector('#m6h'+a.dataset.h); d.style.display=d.style.display==='none'?'block':'none'; });
  SIM.on('time', ()=>{ const t=absT(); m.querySelector('#m6Card').innerHTML=cardSVG(t,{labels:false}); m.querySelector('#m6Rear').innerHTML=rearSVG(t); m.querySelector('#m6Edge').innerHTML=edgeSVG(t); m.querySelector('#m6Frame').innerHTML=frameSVG(t); m.querySelector('#m6Dash').innerHTML=dashHTML(t); m.querySelector('#m6Trace').innerHTML=traceHTML(); bindAll(m);
    LESSONS.forEach((L,i)=>{ let ok=false; try{ ok=!!L.goal(); }catch(e){} const el=m.querySelector('#m6g'+i); el.innerHTML= ok? '<b style="color:var(--accent)">✔ done</b>' : '<span class="muted">not yet</span>'; }); });
}
/* ---------------- one second, down to SDI lines and HANC packets ---------------- */
function viewSecond(m){
  window.__m6204Keys=false;
  m.innerHTML = M6_CSS + `${card('Zoom ladder at the playhead: second → frame → line → HANC → packet', `<canvas id="m6Zl"></canvas>`)}
   <div class="grid2">${card('The line at the playhead: what comes in, what the M6204A writes', `<canvas id="m6Ln"></canvas><div id="m6LnTxt" class="small" style="margin-top:6px"></div>`)}${card('The packet at the playhead, word by word', `<div id="m6Pk" class="small"></div>`)}</div>
   <div class="grid2">${card('What happens in one second', `<div id="m6Cnt"></div>`)}${card('Where the audio comes from', `<div id="m6Src"></div>`)}</div>
   ${card('Timeline', `<canvas id="m6Tl2"></canvas>`)}`;
  SIM.on('time', ()=>{ const t=absT(), w=world(t); drawLadder(m.querySelector('#m6Zl'), t); drawLine(m.querySelector('#m6Ln'), m.querySelector('#m6LnTxt'), t); m.querySelector('#m6Pk').innerHTML=packetHTML(t); m.querySelector('#m6Cnt').innerHTML=countsHTML(t); m.querySelector('#m6Src').innerHTML=sourcesHTML(t);
    SIM.drawLanes(m.querySelector('#m6Tl2'), lanes().filter((l,i)=>[1,2,3,4,5,8].includes(i)), {labelW:190}); });
}
function drawLadder(cv, t){
  const w=world(t), f=VF[w.sdi.fmt]; const {c,w:W}=SIM.canvas(cv, 200); const ink=SIM.css('--ink'), ink2=SIM.css('--ink2');
  const Tl=lineT(f), Tf=1/f.fr, hEnd=f.spl-f.act-4;
  const levels=[['1 second', 0, 1],['1 frame', Math.floor(t/Tf)*Tf, Tf],['1 line', Math.floor(t/Tl)*Tl, Tl],['HANC ('+(hEnd-f.hdr)+' words)', Math.floor(t/Tl)*Tl+f.hdr/f.clk, (hEnd-f.hdr)/f.clk],['1 packet (31 words)', 0, 31/f.clk]];
  const G=fpgaGroupsOut(w); const n=Math.floor(t/Tl); const pk=outPackets(f,n,G); const pos=(t-n*Tl)*f.clk; const here=pk.find(p=>pos>=p.w0&&pos<p.w1)||pk[0];
  if (here) levels[4][1]=n*Tl+here.w0/f.clk;
  levels.forEach(([lab,a,span],i)=>{ const y=8+i*38; c.fillStyle=ink2; c.font='11px sans-serif'; c.fillText(lab, 6, y+16); const x0=150, pw=W-160; c.strokeStyle=SIM.css('--line'); c.strokeRect(x0,y,pw,26);
    const X=tt=>x0+(tt-a)/span*pw;
    if (i===0){ for (let k=0;k<Math.ceil(f.fr);k++){ c.fillStyle=SIM.css('--accent2'); c.fillRect(X(k*Tf),y+2,1,22); } }
    if (i===1){ for (let k=0;k<f.lines;k+=Math.max(1,Math.floor(f.lines/200))){ c.fillStyle=SIM.css('--grid'); c.fillRect(X(a+k*Tl),y+4,1,18); } c.fillStyle=ink; c.font='10px '+SIM.css('--mono'); c.fillText(`${f.lines} lines, ${(Tf*1000).toFixed(3)} ms`, x0+4, y+16); }
    if (i===2){ const blk=(w0,w1,col)=>{ c.fillStyle=SIM.css(col); c.fillRect(X(a+w0/f.clk),y+3,Math.max(1,X(a+w1/f.clk)-X(a+w0/f.clk)),20); }; blk(0,f.hdr,'--bad'); blk(f.hdr,hEnd,'--chip'); blk(hEnd,hEnd+4,'--warn'); blk(hEnd+4,f.spl,'--grid'); pk.forEach(p=>blk(p.w0,p.w1,GCOL[p.g])); c.fillStyle=ink; c.font='10px '+SIM.css('--mono'); c.fillText(`line ${(n%f.lines)+1}: EAV${f.std===2?' LN CRC':''} · HANC · SAV · ${f.act} active words — ${SIM.fmtDur(Tl)}`, X(a+(hEnd+8)/f.clk), y+16); }
    if (i===3){ pk.forEach(p=>{ c.fillStyle=SIM.css(GCOL[p.g]); c.fillRect(X(n*Tl+p.w0/f.clk),y+3,Math.max(1,X(n*Tl+p.w1/f.clk)-X(n*Tl+p.w0/f.clk)-1),20); c.fillStyle='#fff'; c.font='10px '+SIM.css('--mono'); if (X(n*Tl+p.w1/f.clk)-X(n*Tl+p.w0/f.clk)>50) c.fillText(`G${p.g+1} s${p.s}`, X(n*Tl+p.w0/f.clk)+3, y+17); }); if (!pk.length){ c.fillStyle=ink2; c.font='11px sans-serif'; c.fillText(swLine(f,(n%f.lines)+1)? 'no packets: line after the switching line' : 'no packets on this line', x0+6, y+17); } }
    if (i===4 && here){ const parts=[['ADF',3,'--ink2'],['DID',1,'--bad'],['DBN',1,'--warn'],['DC',1,'--warn'],['CLK',2,'--accent2'],['CH1',4,GCOL[0]],['CH2',4,GCOL[1]],['CH3',4,GCOL[2]],['CH4',4,GCOL[3]],['ECC',6,'--ink2'],['CS',1,'--bad']]; let ww=0;
      if (f.std===2) parts.forEach(([nm,k,col])=>{ c.fillStyle=SIM.css(col); c.globalAlpha=.75; c.fillRect(x0+ww/31*pw,y+3,k/31*pw-1,20); c.globalAlpha=1; c.fillStyle=ink; c.font='10px '+SIM.css('--mono'); c.fillText(nm, x0+ww/31*pw+2, y+17); ww+=k; });
      else { c.fillStyle=ink2; c.font='11px sans-serif'; c.fillText('SD: SMPTE 272M packet, 3 words per channel per sample (core vc_272m_291mo is a netlist; layout inferred)', x0+6, y+17); } }
    // playhead
    if (t>=a && t<=a+span){ c.fillStyle=SIM.css('--play'); c.fillRect(X(t)-1,y-2,2,30); }
  });
}
function drawLine(cv, el, t){
  const w=world(t), f=VF[w.sdi.fmt]; const {c,w:W}=SIM.canvas(cv, 150);
  if (!w.sdi.on){ c.fillStyle=SIM.css('--ink2'); c.font='13px sans-serif'; c.fillText('No SDI cable on rear position 1.', 10, 50); el.innerHTML=''; return; }
  const Tl=lineT(f), n=Math.floor(t/Tl), ln=(n%f.lines)+1, pos=Math.floor((t-n*Tl)*f.clk), hEnd=f.spl-f.act-4, G=fpgaGroupsOut(w);
  const sx=x=>10+x/f.spl*(W-20), zx=x=>10+x/hEnd*(W-20);
  const blk=(a,b,col,y,hh,lbl,X)=>{ X=X||sx; c.fillStyle=SIM.css(col); c.fillRect(X(a),y,Math.max(1,X(b)-X(a)),hh); if (lbl && X(b)-X(a)>30){ c.fillStyle=SIM.css('--ink'); c.font='10px sans-serif'; c.fillText(lbl,X(a)+3,y+hh-4); } };
  const pin=inPackets(f,n,w.sdi.gm), pout=w.card? outPackets(f,n,G) : [];
  c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(`line ${ln} of ${f.lines} · word ${pos} of ${f.spl} · ${f.std===2? 'C stream (HANC audio), '+(f.clk/1e6).toFixed(3)+' MHz' : 'Y/C words, 27 MHz'}`, 10, 12);
  [['in',22,pin],['out',58,pout]].forEach(([k,y,pk])=>{ blk(0,f.hdr,'--bad',y,26,f.std===2?'EAV LN CRC':'EAV'); blk(f.hdr,hEnd,'--chip',y,26,'HANC'); blk(hEnd,hEnd+4,'--warn',y,26,''); blk(hEnd+4,f.spl,'--grid',y,26,'active video ('+f.act+')'); pk.forEach(p=>blk(p.w0,p.w1,GCOL[p.g],y+4,18,'')); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; c.fillText(k==='in'?'SDI IN':'SDI OUT', W-60, y-2); });
  c.fillStyle=SIM.css('--chip'); c.fillRect(zx(0),100,zx(hEnd)-zx(0),24); c.fillStyle=SIM.css('--bad'); c.fillRect(zx(0),100,zx(f.hdr)-zx(0),24);
  pout.forEach(p=>{ blk(p.w0,p.w1,GCOL[p.g],100,24,'',zx); if (zx(p.w1)-zx(p.w0)>46){ c.fillStyle='#fff'; c.font='10px '+SIM.css('--mono'); c.fillText(`G${p.g+1} ${(f.std===1?DID.sd:DID.hd)[p.g]}h`, zx(p.w0)+2, 116); } });
  if (ctlLine(f,ln)){ c.strokeStyle=SIM.css('--ink'); c.setLineDash([3,2]); c.strokeRect(zx(f.hdr),127,zx(f.hdr+18*G)-zx(f.hdr),10); c.setLineDash([]); c.fillStyle=SIM.css('--ink2'); c.font='9px sans-serif'; c.fillText('audio control packets in Y (DID '+DID.hdc.slice(0,G).join(' ')+')', zx(f.hdr+18*G)+4, 136); }
  c.fillStyle=SIM.css('--play'); c.fillRect(sx(pos)-1,18,2,72); if (pos<hEnd) c.fillRect(zx(pos)-1,96,2,32);
  c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; c.fillText('output HANC enlarged ↓', 10, 96);
  const smp=lineSamples(f,n);
  el.innerHTML = `${pout.length? `The embedder writes ${pout.length} packet(s) into this line’s HANC: ${f.std===2? `one per sample per group (samples ${smp.join(', ')} of the second × ${G} group${G>1?'s':''}), starting at word ${f.hdr} after EAV, LN and CRC — vc_299m_291mo_new_2 assembles ADF·DID·DBN·DC, 2 clock words, 16 audio words, 6 ECC words and CS.` : `one per group (${smp.length} samples each, 3 words per channel) — SMPTE 272M layout ${inf}.`}` : swLine(f,ln)? `Line ${ln} follows the switching line (${f.sw.join('/')}): the core sets output_packet_on_next_line = 0, so no audio here; the next line carries the backlog.` : 'No sample fell in the previous line period, so no packet.'}
    ${ctlLine(f,ln)? ' This line also carries the audio control packets in the Y stream (“two lines after the switching point”, core 2DO note).':''}
    <span class="muted">Input packets are what a source with groups ${[1,2,3,4].filter(g=>(w.sdi.gm>>(g-1))&1).join(',')||'—'} would carry by the same rule. Whether the FPGA blanks the incoming HANC before re-embedding is not visible in the archived schematics ${inf}; cascade audio is de-embedded by hd_demux and re-inserted by HD_mux.</span>`;
}
function packetHTML(t){
  const w=world(t), f=VF[w.sdi.fmt], sn=snapAt(t); if (!w.sdi.on||!w.card) return '<span class="muted">no SDI output</span>';
  const Tl=lineT(f), n=Math.floor(t/Tl), G=fpgaGroupsOut(w); const pos=(t-n*Tl)*f.clk; let pk=outPackets(f,n,G); let p=pk.find(q=>pos>=q.w0&&pos<q.w1)||pk[0];
  if (!p){ let k=n+1; while (!p && k<n+5){ pk=outPackets(f,k,G); p=pk[0]; k++; } }
  if (!p) return '<span class="muted">no packet nearby</span>';
  if (f.std!==2) return `<p>SD (SMPTE 272M): group ${p.g+1} packet of ${p.w1-p.w0} words carrying ${p.n} sample(s) × 4 channels × 3 words. The SD embed core <span class="mono">vc_272m_291mo.vqm</span> is a compiled netlist, so the exact word layout is not readable ${inf}.</p>`;
  const did=DID.hd[p.g]; const words=[['ADF','000'],['ADF','3FF'],['ADF','3FF'],['DID',did],['DBN',hx(((p.s%255)+1)|0x200,3)],['DC','218']];
  const clk = Math.round(((p.s/48000) % lineT(f)) * f.clk) & 0xFFF; words.push(['CLK0',hx(0x200|(clk&0xFF),3)],['CLK1',hx(0x200|((clk>>8)&0xF),3)]);
  const rows=[];
  for (let ch=0; ch<4; ch++){ const src=chanSource(sn, w, p.g, ch); const v=sampleVal(src, p.s);
    const parts=[ (v&0xF)<<4 | (ch===0? 0:0), (v>>4)&0xFF, (v>>12)&0xFF, (v>>20)&0xF ];
    parts.forEach((b,i)=>words.push([`CH${ch+1}.${i}`, hx(0x200 | (b&0xFF), 3)])); rows.push(`<tr><td>G${p.g+1} ch${ch+1}</td><td class="mono">0x${hx(v,6)}</td><td>${src.txt}${src.async?' <b style="color:var(--warn)">— 44.1 kHz source not rate-converted: samples repeat/drop</b>':''}</td></tr>`); }
  for (let i=0;i<6;i++) words.push(['ECC'+i, hx(0x200|((p.s*37+i*11)&0xFF),3)]); words.push(['CS', hx(0x1FF&words.slice(3).reduce((a,x)=>a+parseInt(x[1],16),0) | 0, 3)]);
  return `<p>Line ${(n%f.lines)+1}, words ${p.w0}–${p.w1-1}: <b>group ${p.g+1}</b> audio data packet for sample ${p.s} of the second (DID ${did}h, SMPTE 299M; core <span class="mono">vc_299m_291mo_new_2</span>).</p>
   <table class="kv small"><tr><th>channel</th><th>24-bit sample</th><th>source (router sel)</th></tr>${rows.join('')}</table>
   <div class="mono small" style="margin-top:6px;line-height:1.7">${words.map(([n,v])=>`<span class="chip" title="${n}">${n} ${v}</span>`).join('')}</div>
   <p class="small muted">Word values are illustrative: the DID, DC = 218h (24) and the 31-word layout are from the core; the bit packing of samples into the four channel words, ECC and the clock words are simplified ${inf}.</p>`;
}
function countsHTML(t){ const w=world(t), f=VF[w.sdi.fmt], G=fpgaGroupsOut(w), R=sched();
  const lps=f.fr*f.lines, skip=f.sw.length*f.fr; const pk = f.std===2? 48000*G : Math.round((lps-skip)*G);
  const rows=[['Video frames', f.fr.toFixed(3), SIM.fmtDur(1/f.fr), f.lines===750?'progressive':'interlaced, 2 fields'],['SDI lines', Math.round(lps).toLocaleString(), SIM.fmtDur(1/lps), `${f.spl} words · HANC ${f.spl-f.act-4-f.hdr} words after ${f.std===2?'EAV+LN+CRC':'EAV'}`],
    ['Audio samples', '48 000', SIM.fmtDur(1/48000), `≈${(48000/lps).toFixed(3)} per line; none on line${f.sw.length>1?'s':''} ${f.sw.map(x=>x+1).join('/')}`],
    ['Audio packets written', pk.toLocaleString(), '', f.std===2? `${G} group(s) × 48 000, 31 words = ${(31*pk/1e6).toFixed(2)} M words/s of HANC` : `${G} group(s) × one per line`],
    ['Audio control packets', f.std===2? (G*f.ctl.length*f.fr).toFixed(0) : '—', '', f.std===2? 'Y stream, lines '+f.ctl.join('/') : ''],
    ['Main-loop passes', R.passes.filter(p=>p.t0>=page0()&&p.t0<page0()+1).length.toLocaleString(), SIM.fmtDur(PASS_T), 'cycle estimate'],
    ['128-bit FPGA exchanges', R.xfers.filter(p=>p.t0>=page0()&&p.t0<page0()+1).length.toLocaleString(), SIM.fmtDur(C.XFER), '21 cycles per bit (altera.lis)'],
    ['CAN frames', R.can.filter(p=>p.t>=page0()&&p.t<page0()+1).length, '', 'heartbeat every '+((C.TX_HEART+1)*C.T1*1000).toFixed(0)+' ms']];
  return `<table class="kv small"><tr><th></th><th>per second</th><th>period</th><th></th></tr>${rows.map(r=>`<tr><th>${r[0]}</th><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</table>`; }
function sourcesHTML(t){ const w=world(t), sn=snapAt(t), G=fpgaGroupsOut(w); if (!sn) return '';
  let h='<table class="kv small"><tr><th>Group / pair</th><th>sel</th><th>chA → ch</th><th>source</th></tr>';
  for (let g=0;g<G;g++) for (let q=0;q<2;q++){ const p=2*g+q; const s=chanSource(sn,w,g,2*q); h+=`<tr><td>G${g+1} ch${2*q+1}/${2*q+2} (AES pair ${p+1})</td><td class="mono">${bn(sn.emb[p],2)} ${['EMB','AES','SRC','MUTE'][sn.emb[p]]}</td><td>${p===7&&sn.swOut?'<b>ch16 = 0xAAAAAA</b>':''}</td><td>${s.txt}</td></tr>`; }
  return h+`</table><p class="small muted">audio_router.vhd: sel(2p+1 downto 2p) picks input a (embedded), b (AES), c (SRC) or zero for both channels of pair p; ctl_in[15..0] = ALTERA_BUFFER_out[1..0]. ${G<4? 'Groups '+(G+1)+'–4 are not written (DIP 1–2).' : 'All four groups are written (DIP 1–2 both ON).'}</p>`; }

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  rear:{x:10,y:40,w:110,h:270,t:'Rear module',s:'T6301A / T6308A',info:`<p>Passive 10-BNC module (M6204A Rear Modules.pdf). T6301A: SDI IN, AES IN1–7, SDI OUT1/2. T6308A: AES IN8 on BNC10 → P1-51 instead of SDI OUT2. ID resistors 3K57 + 5K36 / 1K65 are never read by this card.</p>`},
  eq:{x:150,y:40,w:110,h:46,t:'GS1574A',s:'cable EQ (U1)',info:'<p>Adaptive cable equaliser on BNC1 (P1-97 via L1/R1). CD1 carrier detect.</p>'},
  des:{x:150,y:100,w:110,h:46,t:'GS1559',s:'deserialiser (U7)',info:'<p>HD/SD deserialiser: DD0–19 (20-bit Y/C) and PCLK2 to the FPGA; LOCK_602, SD/~HD2, SMPTE2 status; serial host interface CS_602/SDCLK_602.</p>'},
  lrx:{x:150,y:170,w:110,h:46,t:'DS34LV86T ×2',s:'AES line rx (U4, U5)',info:'<p>Quad RS-422 receivers used for the 75 Ω AES BNCs: U4 → AES_IN1, IN2, IN7, IN8 (IN8 from P1-51); U5 → AES_IN3…IN6.</p>'},
  fpga:{x:300,y:40,w:300,h:270,t:'EP2C35F484C6 (U3)',s:'Cyclone II, EPCS16',info:`<p>Top level <span class="mono">m6204a.bdf</span>: hd274_296_decoder / sd656_decoder → hd_demux (8 × lpm_fifo_dc0, audio_group_detector_HD) / sd_demux (16 FIFOs, group_detector_SD, chact_sd) → <b>audio_router</b> (embedded / AES / SRC / mute per pair) → HD_mux (<span class="mono">vc_299m_291mo_new_2</span>, PugMedia 2007 core) / SD_mux (<span class="mono">vc_272m_291mo</span> netlist) → Yout/Cout. 16 × non_audio_detector2, 8 × i2s_par24, src_tdm_gen, shift_in_128 / shift_out_128, mux_active_groups (from DIP 1–2), lock59, det1001.</p>`},
  cs:{x:640,y:170,w:120,h:46,t:'CS8416 ×8',s:'AES receivers',info:'<p>U18 AES1, U19 AES2, U21 AES3, U24 AES4, U31 AES5, U30 AES6, U26 AES7, U29 AES8. The FPGA passes aes_inN → aes_outN to their inputs; their I2S (lrcl_in_N, sclk_N, i2s_N) comes back to the FPGA. Register 0x0C read by the AVR every pass.</p>'},
  src:{x:640,y:236,w:120,h:46,t:'AD1895 ×8',s:'sample-rate converters',info:'<p>U17, U20, U22, U23, U27, U28, U32, U33: re-time each external AES to the video-locked 48 kHz (src_mclk1/2, tdm_* from src_tdm_gen). Used when sel = 10 (SRC).</p>'},
  ser:{x:640,y:40,w:120,h:46,t:'GS1531',s:'serialiser (U13)',info:'<p>HD/SD serialiser fed by Yout/Cout and pclk_out; SDO_EN31, SD/~HD_31.</p>'},
  drv:{x:640,y:100,w:120,h:46,t:'GS1528',s:'dual cable driver (U16)',info:'<p>Two outputs → P1-5 (SDI OUT1) and P1-12 (SDI OUT2; terminated on the T6308 by R9).</p>'},
  avr:{x:300,y:340,w:180,h:60,t:'AT90CAN128 (U11)',s:'8 MHz, ICCAVR 7.15',info:'<p>Ward-Beck’s own main loop (v100w.c), not zeuslib: reads DIP (PC0–7), eight CS8416 (bit-banged), 128-bit FPGA word (PB4–PB7, interrupts off), drives 12 LEDs (PA0–7, PE4–7), slot ID on ADC0 (PF0), CAN to the frame.</p>'},
  can:{x:520,y:340,w:120,h:60,t:'SN65HVD233',s:'CAN (U10) → P2-11/13',info:'<p>1 Mbit/s to the frame controller. CANBT1/2/3 = 00/04/12.</p>'},
  dip:{x:150,y:340,w:110,h:60,t:'SW1 (8-way)',s:'ALTERA0–7',info:'<p>Shared by the AVR (PINC) and the FPGA (pins altera0–7). Positions 1–2 go straight to mux_active_groups.</p>'},
  cat:{x:640,y:300,w:120,h:40,t:'P5 → CAT-559',s:'encoder (M6204AE)',info:'<p>72-pin SIMM-style connector for the encoder module (iss3 BOM “CAT-559-E-D”): MOD0–2, DEFR0–2, DEBD0–1, DEPT, AFSA/ABCA/ADA… four I2S inputs, SPI (DIN/DOUT/SCLK/SSEL), MSD/MSFS/MSBC also on AVR PB0–PB2, VFS, ERR. Latency per CAT559 manual: Dolby Digital 166 ms, Dolby E one video frame, pass-through &lt; 5 ms.</p>'},
  meta:{x:150,y:236,w:110,h:46,t:'ADM3485',s:'META (U25)',info:'<p>RS-485 transceiver on the edge pins named AES8P/AES8N (P1-52/50): META, META_INPUT, META_DIR to the FPGA. The T6305 drawing labels position 10 “META DATA”. Purpose (Dolby metadata) inferred.</p>'},
  clk:{x:300,y:410,w:220,h:40,t:'PLL1705 · ICS662 · 24.576 MHz',s:'',info:'<p>U6 PLL1705 (27 MHz → audio MCLK), U2 ICS662-03 (sel662_0–3, ref662), X4 CSX750V 24.576 MHz.</p>'},
};
const WIRES=[['rear','eq','SDI IN'],['eq','des',''],['des','fpga','DD0–19'],['rear','lrx','AES IN1–8'],['lrx','fpga','AES_IN1–8'],['fpga','cs','aes_out1–8'],['cs','fpga','I2S ×8'],['fpga','src',''],['src','fpga','TDM'],['fpga','ser','Yout/Cout'],['ser','drv',''],['drv','rear','SDI OUT'],['avr','fpga','128-bit'],['avr','cs','SPI'],['avr','can','CAN'],['dip','avr','PC0–7'],['dip','fpga','altera0–7'],['fpga','cat','P5'],['rear','meta','P1-50/52'],['meta','fpga','META'],['clk','fpga','']];
function viewBlock(m){
  window.__m6204Keys=false;
  m.innerHTML = M6_CSS + `<div class="grid2">${card('Block diagram (click a block; colours follow the playhead)', `<div id="m6Bd" class="scroll"></div><p class="small muted">Redrawn from M6204-FUNCTIONAL.cdr, the ISS3 netlist and m6204a.bdf.</p>`)}${card('Block', `<div id="m6Bi"></div>`)}</div>
   ${card('Functional drawing (M6204-FUNCTIONAL.cdr, redrawn)', `<p class="small">EQ → S/P → DEMUX → AUDIO ROUTING → MUX → P/S → SDI 1, SDI 2. AES IN 1…8 → SRC (8) with a BYPASS bus (8) from CONTROL; CONTROL gets CAN ADDRESS / CAN BUS from the mid-plane and TERMINATION ADDRESS from the rear (the last is drawn but never read by the firmware).</p>`)}`;
  SIM.on('time', ()=>{ const t=absT(), w=world(t), sn=snapAt(t), md=modeAt(t);
    const live={rear:true, eq:w.sdi.on, des:w.sdi.on&&sdiLockedAt(t), lrx:w.aes.some(a=>a.on), fpga:md==='app', cs:sn&&sn.al.some(x=>x), src:sn&&sn.emb.some(x=>x===2), ser:md==='app'&&w.sdi.on, drv:md==='app'&&w.sdi.on, avr:md!=='off', can:w.mfc&&md==='app', dip:true, cat:w.variant==='M6204AE', meta:false, clk:md!=='off'};
    let s=`<svg viewBox="0 0 780 460" style="width:100%;min-width:640px;display:block"><defs><marker id="m6Ar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ink2)"/></marker></defs>`;
    const ctr=k=>{ const b=BLOCKS[k]; return [b.x+b.w/2, b.y+b.h/2]; };
    WIRES.forEach(([a,b,l])=>{ const A0=BLOCKS[a], B=BLOCKS[b]; let [x1,y1]=ctr(a), [x2,y2]=ctr(b);
      if (A0.x+A0.w<B.x){ x1=A0.x+A0.w; x2=B.x; } else if (B.x+B.w<A0.x){ x1=A0.x; x2=B.x+B.w; } else if (A0.y+A0.h<B.y){ y1=A0.y+A0.h; y2=B.y; } else { y1=A0.y; y2=B.y+B.h; }
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" marker-end="url(#m6Ar)"/>${l?`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-3}" font-size="9" fill="var(--ink2)">${l}</text>`:''}`; });
    Object.keys(BLOCKS).forEach(k=>{ const b=BLOCKS[k]; s+=`<g class="m6-blk" data-b="${k}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="6" fill="${live[k]?'color-mix(in srgb, var(--accent) 18%, var(--panel))':'var(--panel2)'}" stroke="${D.ui.blk===k?'var(--accent)':'var(--ink2)'}" stroke-width="${D.ui.blk===k?2.5:1}"/><text x="${b.x+b.w/2}" y="${b.y+18}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${b.t}</text><text x="${b.x+b.w/2}" y="${b.y+33}" text-anchor="middle" font-size="10" fill="var(--ink2)">${b.s}</text></g>`; });
    const fb=BLOCKS.fpga; ['decoder → demux','audio_router','HD_mux / SD_mux','shift_in/out_128'].forEach((x,i)=>{ s+=`<rect x="${fb.x+20}" y="${fb.y+50+i*52}" width="${fb.w-40}" height="38" rx="4" fill="none" stroke="var(--line)"/><text x="${fb.x+fb.w/2}" y="${fb.y+74+i*52}" text-anchor="middle" font-size="11" fill="var(--ink)">${x}${i===1&&sn? ' · sel '+bn(sn.out[1],8)+bn(sn.out[0],8):''}${i===2? ' · '+fpgaGroupsOut(w)+' group(s)':''}</text>`; });
    m.querySelector('#m6Bd').innerHTML=s+'</svg>';
    m.querySelectorAll('.m6-blk').forEach(g=>g.onclick=()=>{ D.ui.blk=g.dataset.b; SIM.refresh(); });
    const B=BLOCKS[D.ui.blk]; m.querySelector('#m6Bi').innerHTML=`<h3>${B.t}</h3>${B.info}`; });
}
/* ---------------- schematics (redrawn from the ISS3 netlist, .qsf and .bdf) ---------------- */
function chip(x,y,w,name,left,right,sub){ const h=Math.max(left.length,right.length)*16+30;
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel)" stroke="var(--ink)"/><text x="${x+w/2}" y="${y+16}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y+h-6}" text-anchor="middle" font-size="9.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+34+i*16; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+4}" y="${yy+4}" font-size="9.5" fill="var(--ink)">${p[0]}</text><text x="${x-36}" y="${yy-2}" text-anchor="end" font-size="9.5" fill="var(--accent2)">${p[1]}</text>`; });
  right.forEach((p,i)=>{ const yy=y+34+i*16; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-4}" y="${yy+4}" text-anchor="end" font-size="9.5" fill="var(--ink)">${p[0]}</text><text x="${x+w+36}" y="${yy-2}" font-size="9.5" fill="var(--accent2)">${p[1]}</text>`; });
  return s; }
const SHEETS=[
  ['AT90CAN128 (U11) — every pin from M6204A-iss3.net', ()=>`<svg viewBox="0 0 860 640" style="width:100%;min-width:700px">${chip(330,20,200,'U11 AT90CAN128',
    [['2 PE0','CS8416_SEL5'],['3 PE1','CS8416_SEL6'],['4 PE2','CS8416_SEL7'],['5 PE3','CS8416_SEL8'],['6 PE4','LED2 AES6'],['7 PE5','LED3 AES7'],['8 PE6','LED4 AES8'],['9 PE7','LED7 CASCADE (“ON”)'],['10 PB0','MSFS (P5-58)'],['11 PB1','MSBC (P5-59)'],['12 PB2','MSD (P5-57)'],['13 PB3','CS8416_RESET'],['14 PB4','ALTERA9 FSYNCH'],['15 PB5','ALTERA10 CLK'],['16 PB6','ALTERA11 DATA→'],['17 PB7','ALTERA12 ←DATA'],['18 PG3','(n.c. — ISS1: LED16 COM)'],['19 PG4','N_CONFIG'],['20 RESET','SRST_ATMEL'],['23/24 XTAL','8 MHz X1'],['25 PD0','CS8416_OUT'],['26 PD1','CS8416_SEL1'],['27 PD2','CS8416_SEL2'],['28 PD3','CS8416_SEL3'],['29 PD4','CS8416_SEL4'],['30 PD5','CAND (TXCAN)'],['31 PD6','CANR (RXCAN)'],['32 PD7','LBK (CAN_TX/RX)']],
    [['33 PG0','CS8416_CLK'],['34 PG1','CS8416_IN'],['35 PC0','ALTERA0 = DIP 8'],['36 PC1','ALTERA1 = DIP 7'],['37 PC2','ALTERA2 = DIP 6'],['38 PC3','ALTERA3 = DIP 5'],['39 PC4','ALTERA4 = DIP 4'],['40 PC5','ALTERA5 = DIP 3'],['41 PC6','ALTERA6 = DIP 2'],['42 PC7','ALTERA7 = DIP 1'],['43 PG2','ALTERA_RESET'],['44 PA7','LED8 SD'],['45 PA6','LED9 HD'],['46 PA5','LED10 ERR'],['47 PA4','LED11 AES1'],['48 PA3','LED12 AES2'],['49 PA2','LED13 AES3'],['50 PA1','LED14 AES4'],['51 PA0','LED15 AES5'],['54 PF7','TDI_ATMEL'],['55 PF6','TDO_ATMEL'],['56 PF5','TMS_ATMEL'],['57 PF4','TCK_ATMEL'],['58 PF3','ALTERA8 SD_RESET'],['59 PF2','AN_BMID2 (never read)'],['60 PF1','AN_BMID (never read)'],['61 PF0','AN_SLOTID (ADC0)']], 'TQFP64 · redrawn, not the original CAD')}</svg>`],
  ['AES input chain, per input', ()=>{ const rx=[['U4','9/10→11'],['U4','1/2→3'],['U4','6/7→5'],['U5','14/15→13'],['U5','9/10→11'],['U5','1/2→3'],['U5','6/7→5'],['U4','14/15→13']]; const pin=[['F22','T3'],['F21','U3'],['H21','U4'],['H22','V4'],['G21','N3'],['G22','N5'],['E22','M5'],['E21','M6']];
    const lr=[['P1','P2','R1'],['R2','T1','T2'],['U1','U2','V1'],['W1','W2','Y1'],['J1','J2','N1'],['G2','H1','H2'],['F1','F2','G1'],['C2','D1','D2']]; const csu=['U18','U19','U21','U24','U31','U30','U26','U29']; const edge=['75','80','37','34','17','22','92','51 (“AES4P”)']; const bnc=['3','4','5','6','7','8','2','10 (T6308A only)'];
    return `<table class="kv small"><tr><th>AES IN</th><th>rear BNC</th><th>edge pin</th><th>line receiver</th><th>FPGA aes_in / aes_out</th><th>CS8416</th><th>I2S back (lrcl, sclk, data)</th></tr>${[0,1,2,3,4,5,6,7].map(i=>`<tr><td>${i+1}</td><td>${bnc[i]}</td><td>P1-${edge[i]}</td><td>${rx[i][0]} ch ${rx[i][1]}</td><td class="mono">${pin[i][0]} / ${pin[i][1]}</td><td>${csu[i]} (SEL${i+1})</td><td class="mono">${lr[i].join(', ')}</td></tr>`).join('')}</table>
    <p class="small muted">From M6204A-iss3.net, M6204A.qsf (v300), T6308.net and t6301.js. Balanced pairs AES1P/N…AES7P/N on P1-55…70 end at the edge connector (no part on the card); AES8P/N go to the ADM3485 “META” transceiver. Redrawn, not the original CAD.</p>`; }],
  ['SDI path', ()=>`<svg viewBox="0 0 860 300" style="width:100%;min-width:700px">${chip(20,40,120,'GS1574A U1',[['IN','BNC1_SIG (P1-97)']],[['OUT','→ U7 DDI1P/N'],['CD1','carrier']])}${chip(250,40,150,'GS1559 U7',[['DDI1P/N','from EQ']],[['DD0–19','Yin/Cin[9..0]'],['PCLK2','pclk_in_pin M22'],['LOCK_602','lock_59 E20'],['SD/~HD2','SD_HD_059'],['SMPTE2','smpte_bypass59']])}${chip(500,40,150,'EP2C35 U3',[['Yin/Cin','D21… / B17…'],['pclk_in','M22']],[['Yout[9..0]','AB19…V21'],['Cout[9..0]','U22…N21'],['pclk_out','AB18']])}${chip(250,180,150,'GS1531 U13',[['DIN0–19','Yout/Cout'],['PCLK_OUT','pclk']],[['SDO','→ U16'],['SD/~HD_31','W20']])}${chip(500,190,150,'GS1528 U16',[['IN','from U13']],[['OUT1','BNC9_SIG P1-5'],['OUT2','BNC10_SIG P1-12']])}</svg><p class="small muted">Nets from M6204A-iss3.net, pins from M6204A.qsf. Redrawn.</p>`],
  ['FPGA control port and DIP', ()=>`<svg viewBox="0 0 860 330" style="width:100%;min-width:700px">${chip(40,30,170,'AT90CAN128',[],[['PB4','FSYNCH → strobe'],['PB5','CLK'],['PB6','DATA →'],['PB7','← DATA'],['PG2','ALTERA_RESET'],['PF3','SD reset (ALTERA8)'],['PC0–7','DIP (pull-ups)']])}${chip(420,30,220,'EP2C35: shift_in_128 / shift_out_128',[['altera9','ctl_in_strobe'],['altera10','ctl_sclk'],['altera11','ctl_data_in'],['altera12','ctl_data_out'],['altera8','reset'],['altera0–7','dip_sw1–8']],[['ctl_in[15..0]','audio_router.sel'],['ctl_in[119]','“swaptest” → ch16 = 0xAAAAAA'],['ctl_in[118]','pclk_on'],['NOT dip_sw1/2','mux_active_groups'],['ctl_out[127..0]','status word']])}</svg>
    <p class="small">The operational-info document lists Altera9/10/11 on PB5/PB6/PB7 and Altera12 on PB7 again; the netlist and <span class="mono">altera.h</span> agree with each other on PB4–PB7 as drawn here.</p>`],
  ['P5: CAT-559 encoder connector', ()=>`<table class="kv small"><tr><th>P5 pin</th><th>net</th><th>CAT559 meaning (CAT CARDS PINOUTS.xlsx / manual)</th></tr>${[['3','RESET_552','RST, 0 = reset'],['5–7','MOD0–2','mode, 111 = DD encoding'],['8','MDS','metadata 1 = external'],['9–10','MRM0–1','metadata reversion mode'],['11–13','DEFR0–2','Dolby E frame rate'],['14–15','DEBD0–1','Dolby E bit depth'],['16','DEPT','pass-through'],['19/20','CPE/CPC','control port disable / SPI'],['22','RCS0','reference clock source'],['27–30','DIN, DOUT, SCLK, SSEL','SPI control port (mode 3, ≤ 128 kbit/s)'],['34–36','PCCM0–2',''],['45–52','AFSA/ABCA/ADA …','I2S audio inputs A, B'],['53–56','EADA, EADB, EAFS, EABC','encoded audio out'],['57–59','MSD, MSFS, MSBC','metadata serial (also AVR PB2/PB0/PB1)'],['60','META_IN',''],['61–66','AFSC…ADD','I2S inputs C, D'],['67','LTC',''],['68','VFS','video frame sync valid'],['69','SYNC','video reference'],['70','ERR','error flag']].map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table><p class="small muted">Nets from M6204A-iss3.net; meanings from the CAT559 implementation manual draft (third-party) and the pin sheet in m6204_dd.</p>`],
];
function viewSchem(m){ window.__m6204Keys=false;
  m.innerHTML = M6_CSS + card('Schematic set (redrawn from the ISS3 netlist, .qsf and .bdf — not the original P-CAD drawings)', `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px">${SHEETS.map((s,i)=>`<button data-s="${i}" class="${D.ui.sch===i?'on':''}">${s[0]}</button>`).join('')}</div><div id="m6Sh" class="scroll"></div>`);
  const draw=()=>{ m.querySelector('#m6Sh').innerHTML=SHEETS[D.ui.sch][1](); m.querySelectorAll('[data-s]').forEach(b=>{ b.classList.toggle('on', +b.dataset.s===D.ui.sch); b.onclick=()=>{ D.ui.sch=+b.dataset.s; draw(); }; }); };
  draw(); }
/* ---------------- software ---------------- */
function regTable(bytes, dir){ const dec = dir==='out'? (i=>i===0||i===1? 'router sel AES'+(4*i+1)+'–'+(4*i+4)+': '+[0,1,2,3].map(k=>['E','A','S','M'][(bytes[i]>>(2*k))&3]).join('') : i===12? 'number_of_groups (ignored by FPGA)' : i===14? 'bit7 swap → ctl_in[119], bit6 → pclk_on' : i===15? '0xAA sync' : 'reserved')
  : (i=>i===15?'0xAA sync':i===1?'smpte sd hd 50 60 1080 720 525':i===0?'625, 60/59.94':i>=2&&i<=5?'ext AES '+(2*(i-2)+1)+'/'+(2*(i-2)+2)+' non-audio + format':i>=6&&i<=9?'emb AES '+(2*(i-6)+1)+'/'+(2*(i-6)+2)+' non-audio':i===10?'grp1 mux SD, grp1 mux HD, -, -, grp4..grp1':i===11||i===12?'SD chact (Emb_Astatus)':i===13?'SD demux equal':'reserved');
  return `<table class="kv small"><tr><th>byte</th><th>bits</th><th>value</th><th>meaning</th></tr>${bytes.map((b,i)=>`<tr><td>${dir==='out'?'out':'in'}[${i}]</td><td class="mono">${8*i+7}..${8*i}</td><td class="mono">${bn(b,8)} (0x${hx(b)})</td><td>${dec(i)}</td></tr>`).reverse().join('')}</table>`; }
function viewSoft(m){
  window.__m6204Keys=false;
  m.innerHTML = M6_CSS + `<div class="grid2">${card('Main loop (v100w.c) — the running step is highlighted', `<div id="m6Loop"></div>`)}${card('Interrupts and boot', `<div id="m6Isr"></div>`)}</div>
   <div class="grid2">${card('AVR → FPGA, 128 bits (bit 0 first), at the playhead', `<div id="m6Out"></div>`)}${card('FPGA → AVR, 128 bits (bit 127 first)', `<div id="m6In"></div>`)}</div>
   <div class="grid2">${card('Router decision per AES pair (ALTERA_SORT)', `<div id="m6Rt"></div>`)}${card('SD/HD audio reset and the channel-16 swap (SD_RESET + ALTERA_SORT)', `<div id="m6Sm"></div>`)}</div>
   <div class="grid2">${card('DashBoard OIDs (Dashboard_b.c)', `<div id="m6Oid"></div>`)}${card('FPGA pipeline and the Dolby encoder R&D', `<div id="m6Fp"></div>`)}</div>`;
  SIM.on('time', ()=>{ const t=absT(), sn=snapAt(t), st=stepAt(t), md=modeAt(t), R=sched();
    m.querySelector('#m6Loop').innerHTML = STEPS.map((s,i)=>`<div class="m6-step ${md==='app'&&st===i?'on':''}"><b>${i+1}. ${s[0]}</b> <span class="muted mono">${s[1]? SIM.fmtDur(s[1]) : 'only when save_settings'}</span><div class="small muted">${s[2]}</div></div>`).join('') + `<p class="small muted">≈${(PASS_T*1000).toFixed(2)} ms per pass. Only ALTERA_read_write is cycle-counted (altera.lis, 21 cycles per bit); the rest are estimates ${inf}.</p>`;
    const g=segAt(t);
    m.querySelector('#m6Isr').innerHTML = `<table class="kv small"><tr><th>timer0_ovf_isr</th><td>every 1 ms (clk/64, TCNT0 = 0x83): SD_RESET(), sd_audio_stable counter (35 ms), per-second count of CAN messages → dashboard_initializing</td></tr>
      <tr><th>timer1_ovf_isr</th><td>every 96 µs (TCNT1 = 0xFFF4): heartbeat every TX_HEARTBEAT = 4000 ticks (384 ms), or 1000 × slot ticks while DashBoard initialises, or every 11 ticks while a multi-frame message is going out → CAN_TX_TIMER → PARAMETER_UPDATE</td></tr>
      <tr><th>can_rx_isr</th><td>CANRX → DASHBOARD_RESPONSE_SETUP; held off while ALTERA_read_write runs with CLI</td></tr></table>
      <h3>Boot (main before while(1))</h3>${bootSegs().map((b,i)=>`<div class="m6-step ${g&&g.kind==='boot'&&g.label===b[1]?'on':''}"><span class="mono">${SIM.fmtDur(b[0])}</span> ${b[1]}</div>`).join('')}`;
    if (sn){ m.querySelector('#m6Out').innerHTML = regTable(sn.out,'out'); m.querySelector('#m6In').innerHTML = regTable(sn.inb,'in') + '<p class="small muted">Byte numbers are ALTERA_BUFFER_in indices (in[15] is the first byte clocked in). The 2009|42 document’s map agrees for this direction.</p>';
      m.querySelector('#m6Rt').innerHTML = `<table class="kv small"><tr><th>pair</th><th>emb_aesN_cha</th><th>auto_src</th><th>aesN_lock</th><th>→ emb_aesN (sel)</th></tr>${[0,1,2,3,4,5,6,7].map(i=>`<tr><td>${i+1}</td><td>${['EMB_AUDIO','AES_AUDIO','SRC_AUDIO','MUTE_AUDIO'][sn.cha[i]]}</td><td>${sn.auto[i]?'YES':'NO'}</td><td>${LOCK_NAME[sn.al[i]]}</td><td class="mono">${bn(sn.emb[i],2)} ${['EMB','AES','SRC','MUTE'][sn.emb[i]]}</td></tr>`).join('')}</table>
        <p class="small mono">if (cha == AES_AUDIO) emb = auto_src ? (lock &gt; PCM ? AES_AUDIO : SRC_AUDIO) : AES_AUDIO; else emb = cha;</p><p class="small muted">So with Auto, PCM (and “no lock”) goes through the AD1895 and compressed audio bypasses it. Nothing in the menus can choose SRC or MUTE directly.</p>`;
      const state = !sn.smpte? 'NO_LOCK' : sn.ra? 'RESET' : (sn.re && sn.swap && !sn.ss)? 'WAIT_STABLE' : (sn.re && sn.swap)? 'COUNT' : 'RUN';
      const ST=[['NO_LOCK','smpte = 0: SD_RESET_ACTIVE held, swap = NO, counters reloaded'],['RESET','reset_enable && reset_counter: 10 timer0 ticks with PF3 low, swap = YES'],['WAIT_STABLE','reset done; waiting 35 ms for sd_audio_stable'],['COUNT','HD: hd_audio_stable_count++ each pass up to 200 (swap still YES)'],['RUN','reset_enable = NO, swap = NO']];
      m.querySelector('#m6Sm').innerHTML = `<svg viewBox="0 0 520 90" style="width:100%">${ST.map((s,i)=>`<rect x="${6+i*103}" y="10" width="96" height="40" rx="8" fill="${state===s[0]?'color-mix(in srgb, var(--accent) 35%, var(--panel))':'var(--panel2)'}" stroke="var(--ink2)"/><text x="${54+i*103}" y="35" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)">${s[0]}</text>${i<4?`<path d="M${102+i*103} 30 h6" stroke="var(--ink2)"/>`:''}`).join('')}<text x="6" y="72" font-size="10.5" fill="var(--ink2)">entered by sdi_change (format change after a loss of lock, set in PARAMETER_UPDATE at the next heartbeat) or a missing group-1 mux flag</text></svg>
        <div class="small">${ST.find(s=>s[0]===state)[1]}. reset_counter ${sn.rc}, sd_audio_stable_counter ${sn.ssc}, hd_audio_stable_count ${sn.hc}. While swap = YES the FPGA’s <span class="mono">sel2x1x24</span> (inst47) feeds HD channel 16 with <span class="mono">constant24_aaaaaa</span> instead of audio16 — a group-4 marker for <span class="mono">group4_start_detector_HD</span> ${inf}.</div>`; }
    m.querySelector('#m6Oid').innerHTML = `<table class="kv small"><tr><th>OID</th><th>what the code does</th></tr>${[['1.5 / 1.6 / 1.2 / 1.B / 1.4','Card Info strings (Software Rev hard-coded “3.00”, “Ali-Add”)'],['2.1','Signal Status descriptor (OK / No SDI Input / AES1/AES2 Unlocked) — never reported'],['2.4','SDI Format: REPORT_PARAM with one bit set; BIT8 “Locked” truncated to 0'],['2.F / 2.2','22-character strings, pushed as unsolicited GET_PARAM responses (0xC9) to address 0x00'],['2.5','Number of Groups Enabled, from DIP 1–2'],['3.0, 3.2 … 3.E','emb_aesN_cha: External AES n (1) / Cascade Embedded AES n (0); checks dashboard_enabled'],['3.1, 3.3 …','pairs 1–4: emb_aesN_chb (unused, no check); pairs 5–8: emb_aesN_cha again'],['4.0, 4.2 … 4.E','auto_src[N]: Auto (1) / Off (0)'],['4.1, 4.3 …','emb_aesN_chb'],['5.0–5.3, 5.6–5.9','titles “Group n”, “Group n SRC”; 5.4 “Routing”, 5.5 “SRC” (MESSAGE_CREATOR_PARAMETER_54)'],['9.C','Settings: Save → save_settings = INVERT_DATA(value)'],['9.D','Swap Disabled / Enabled → swap (no dashboard_enabled check)'],['255.7 / 255.8','restore_start (frame-controller restore)']].map(r=>`<tr><td class="mono">${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`;
    m.querySelector('#m6Fp').innerHTML = `<p class="small"><b>HD:</b> GS1559 20-bit → hd274_296_decoder (line, hblanking) → hd_demux (4 × hd_fifo_ctl, 8 × dual-clock FIFOs, srclock_gen) → audio_router input a. External: CS8416 I2S → 8 × i2s_par24 → input b; AD1895 TDM → src_tdm_gen → input c. Router out audio1x…16x → HD_mux: reset_hd_mux, format_generator, group_one_detector_HD, group4_start_detector_HD, parity_gen16, <span class="mono">vc_299m_291mo_new_2</span> → anc_data_y/c → Yout/Cout → GS1531.</p>
      <p class="small"><b>SD:</b> sd656_decoder → sd_demux (group_selector_SD, group_detector_SD, chact_sd, sd_fifo_ctl/latch) → router → SD_mux (<span class="mono">vc_272m_291mo</span>, group_one_detector_SD). History: v300 replaced the HD core (“PUG core … fix the CRC error on group1 audio, also problem with 60Hz formats”).</p>
      <h3>Dolby encoder R&D (RD6)</h3><p class="small">Plan (Encoder Schedual.xlsx): learn Dolby Digital vs Dolby E; CAT552/CAT559; the M6204 hardware; the existing <b>m6204_dd</b> FPGA core’s Dolby part; adapt it for Dolby E; timing analysis; SignalTap; AVR changes; a DashBoard GUI; test. CAT559 (manual draft 2008|41): four 2-channel I2S inputs, one SMPTE 337M output, SPI control ≤ 128 kbit/s, latency Dolby Digital 166 ms (adjustable 150–300 ms in the next release), Dolby E one video frame, pass-through &lt; 5 ms; Dolby E needs a video sync matching DEFR. The M6204AE history entry “Dashboard displays controls for encoder” has no matching code in the archive.</p>`;
  });
}
/* ---------------- findings ---------------- */
function viewFindings(m){
  window.__m6204Keys=false;
  const F=[
   ['The router in the code is not the router in the document', `<span class="mono">M6204A operational info.doc</span> (2009|42-02-25) describes 6 bits per channel for 16 outputs (bits 47..0, <span class="mono">000000</span> = aes1chA … <span class="mono">100000</span> = mute). v300’s live <span class="mono">ALTERA_SORT</span> sends 2 bits per AES <i>pair</i> in <span class="mono">ALTERA_BUFFER_out[0..1]</span> (EMB_AUDIO 0, AES_AUDIO 1, SRC_AUDIO 2, MUTE_AUDIO 3), and <span class="mono">audio_router.vhd</span> decodes exactly that. The 6-bit packing survives only inside a commented-out copy of ALTERA_SORT and the unused AES1_CHA…EMB_AES8_CHB defines in M6204.h.`],
   ['DIP 1–2 bypass the processor', `The document puts the group count in bits 49..48; the firmware writes <span class="mono">number_of_groups = 3</span> (hard-coded at the top of ALTERA_SORT) into out[12] = bits 103..96. Neither matters: in <span class="mono">m6204a.bdf</span> the <span class="mono">mux_active_groups</span> input <span class="mono">group_enable[1..0]</span> is wired through two NOT gates (inst97/inst98) straight from <span class="mono">dip_sw1/dip_sw2</span>. DashBoard’s “Number of Groups Enabled” (2.5) only reports the switch.`],
   ['Channel 16 can be replaced by a test word', `<span class="mono">ctl_in[119]</span> (the AVR’s <span class="mono">swap</span>, out[14] bit 7) drives <span class="mono">sel2x1x24</span> inst47, which feeds HD_mux’s HD16 with <span class="mono">constant24_aaaaaa</span> instead of audio16. The firmware sets swap during every SD_RESET after a format change and clears it after <span class="mono">hd_audio_stable_count</span> passes 200 (≈${(10+35+200*PASS_T*1000).toFixed(0)} ms in total), so group 4 channel 4 carries 0xAAAAAA for a moment after each HD lock. DashBoard OID 9.D “Swap Enabled” leaves it there permanently, and is not gated by DIP 8. The marker’s purpose (group-4 alignment for group4_start_detector_HD) is ${inf}.`],
   ['Only two of four routing choices reach DashBoard', `<span class="mono">MESSAGE_CREATOR_PARAMETER_33</span> builds four entries (External AES n, Cascade Embedded AES n, SRC Audio, Mute) but sends <span class="mono">choices = 2</span>. SRC is reached only through <span class="mono">auto_src</span>; Mute (sel 11) is unreachable from any menu or switch.`],
   ['The odd OIDs are ghosts — and half of them are wrong', `Menu2OID lists 3.0–3.F and 4.0–4.F. The odd ones get the label “ ” and choices ending in “AES 0” (the digit table only covers even OIDs). SET 3.1/3.3/3.5/3.7 and 4.x odd write <span class="mono">emb_aesN_chb</span>, which ALTERA_SORT never reads, without the <span class="mono">dashboard_enabled</span> check; SET 3.9/3.B/3.D/3.F write <span class="mono">emb_aes5…8_cha</span> again, so the “ghost” rows for pairs 5–8 really re-route them.`],
   ['A blank card bypasses the SRC on seven pairs', `<span class="mono">unsigned char auto_src[8] = {YES};</span> initialises only element 0; C zero-fills the rest. In memory mode with no saved image (EEPROM byte 10 ≠ 0xAA), pairs 2–8 run with auto_src = NO → AES_AUDIO, i.e. an asynchronous AES input is embedded without rate conversion. DIP mode sets all eight to YES.`],
   ['“SDI Format” can show nothing', `CAN_TX_TIMER reports 2.4 as one bit in <span class="mono">buffer[5]</span>. The fallback “Locked” is <span class="mono">BIT8</span> (0x100) stored in an unsigned char → 0, so 720p/50 (locked, but neither 59.94 nor 60) and any unlisted SD format report no bit at all. The descriptor’s 1080p and 23.98/24 entries are never sent.`],
   ['Status pushed as answers to questions nobody asked', `PARAMETER_UPDATE rotates SDI_FORMAT → EXTERNAL_AES → AUDIO_GROUPS_ENABLED → EMBEDDED_AUDIO, one per heartbeat (TX_HEARTBEAT 4000 = 384 ms; the D6203A used 10000). 2.4 and 2.5 go out as REPORT_PARAM; the 2.2 and 2.F strings go out as multi-frame GET_PARAM <i>responses</i> (0xC9) to GEAR_CONTROLLER 0x00. SIGNAL_STATUS (2.1) and the per-input AES1–8 status OIDs are commented out.`],
   ['Menu counts disagree with their lists', `Menu1OID’s count byte is 6 but 11 OIDs follow (2.6–2.A never shown); ParamOIDS says 36 and lists 37 (9.D last, never counted by NUMPARAMS); Menu2OID lists Save (9.C) twice; MenuName2/3 are “Voiceover Status/Settings” — leftovers from the M6206 voice-over card.`],
   ['The makefile links Dashboard_b.c', `README and the software notes cite <span class="mono">Dashboard.c</span>, but <span class="mono">V100W.mak</span> builds <span class="mono">Dashboard_b.o</span>; Dashboard.c is a stale sibling. Also: v300 shows “3.00” on DashBoard (<span class="mono">ParamSoftwareRev_Message</span>, “Ali-Add”) while <span class="mono">wbs_ztcpack.txt</span> still writes <span class="mono">bin/m6204a_v1_02.bin</span> with <span class="mono">/v 1.02</span>, and Dashboard.h keeps SOFTWARE_VERSION 2.`],
   ['Pin table in the document is off by one', `The document maps Altera9 = PB5 fsynch, Altera10 = PB6 sclk, Altera11 = PB7 data and Altera12 = PB7 again. The ISS3 netlist (U11 pins 14–17 = ALTERA9–12) and <span class="mono">altera.h</span> (FSYNCH PB4, CLK PB5, DATA out PB6, DATA in PB7) agree with each other.`],
   ['Interrupts are off 40 % of the time, and can stay off forever', `ALTERA_read_write runs 16 × 8 bits at 21 cycles per bit with <span class="mono">CLI()</span> (≈${(C.XFER*1000).toFixed(2)} ms of a ≈${(PASS_T*1000).toFixed(2)} ms pass), so a CAN request can wait that long for its ISR. If 200 reads in a row lack the 0xAA sync byte, ALTERA_SORT (and the boot loop) call <span class="mono">CLI()</span> and never <span class="mono">SEI()</span>: timers and CAN die while the loop keeps kicking the watchdog — the card vanishes from DashBoard but does not reset.`],
   ['A validity flag counts as “unlocked”', `<span class="mono">CS8416_READ_LOCK_ALL</span> reads register 0x0C of each receiver and treats any non-zero value as unlock. On the CS8416 that register holds the receiver error bits (parity, bi-phase, confidence, validity, unlock, CRC) ${infT('CS8416 data sheet is not in the archive')}, so a source with V set would light no AES LED.`],
   ['“ON” is not power', `The silk next to the yellow LED says “ON”; the card-edge drawing says “CASCADE ON”, and the netlist puts it on PE7 = <span class="mono">CASCADE_LED</span> (lit when any emb_aesN_cha = EMB_AUDIO). ISS1 had a COM ACTIVITY LED (LED16 on PG3); ISS2 removed it, but the firmware still toggles <span class="mono">COM_ACTIVITY_LED</span> on the now unconnected PG3. HD lights both SD and HD LEDs.`],
   ['Eight AES inputs only with the T6308A', `README says eight external AES. With the T6301A only seven BNCs reach the card (AES IN7 is BNC2). The eighth arrives only from the T6308A, whose BNC10 goes to P1-51 — a card net named <span class="mono">AES4P</span> — into DS34LV86T U4 channel 4 → AES_IN8. The card never reads the rear-module ID resistors (adc_init leaves ADMUX = 0), so it cannot know which rear is fitted. The real AES8P/N edge pins feed the ADM3485 “META” transceiver; the T6305 drawing labels that position “META DATA” and repeats AES IN8 twice.`],
   ['The slot-ID bug does not recur here', `ADC.c keeps the original evenly spaced ADDRESS_TABLE (the AA6201A’s re-tuned table misreads slots 13, 14 and 19). With the Frame Address ID.xls resistors and the 1K pull-up every slot 1–20 decodes correctly with at least ${Math.min(...[...Array(20)].map((_,i)=>slotMargin(i+1)))} counts of margin. A second, interleaved table sits under <span class="mono">#ifdef MF6220</span> (never defined). The boot still measures the slot twice (100 samples each, ≈1.07 s).`],
   ['SignalTap shipped in the v300 build, aimed at AES4', `<span class="mono">M6204A.qsf</span> v300 has <span class="mono">ENABLE_SIGNALTAP ON</span> with <span class="mono">stp2.stp</span> probing <span class="mono">audio_router:inst31|sel[15..0]</span> and <span class="mono">sclk_4</span> on <span class="mono">pclk_in_pin</span>. The v300 test report notes a noisy AES4 SCLK on issue 3, fixed with a wire from U24 OSCLK to TP7; U24 is the AES4 CS8416. The .qsf also points at <span class="mono">m6204_dd</span> and another engineer’s desktop copy of V101 as MISC_FILEs.`],
   ['Leftovers from sister cards', `M6204.h: MODE1–6 (“OUT1 = IN1 … REF1”), EQ1/EQ2 and LOCK1/2 LED logic inside commented-out REFRESH_LEDS / MODE_SELECTOR (a reclocking DA), comments “from M6206A.c”, DOLBY1–4 LED macros on PB4–PB6 and PG1 — the FPGA serial and CS8416 data lines on this board — and <span class="mono">#ifdef M6205CE</span> Dolby CAT552 checks.`],
   ['ISS4 grows a DSP', `<span class="mono">PCB/WORKING/M6204A-iss4.net</span> adds U8/U15, X5 and nets DAI_P1…P20, FLAG0–11, SPICLK/MOSI/MISO and SHARC_RESET — an ADSP-21262, the path the M6205 took. SD_RESET still carries a commented <span class="mono">SHARC_RESET</span>.`],
   ['The encoder variant’s controls are not in the code', `The ISS3 BOM already lists “CAT-559-E-D” and the M6204AE photo shows a CAT 559 module on P5. The AE history says “Dashboard displays controls for encoder”, but its Dashboard.c is byte-identical to the M6204A v102 file and no encoder OIDs exist. The RD6 schedule stops at “Make the Dashboard GUI for Encoder Card”.`],
   ['Prototype OID sheet vs code', `SOFTWARE HISTORY.xls “OIDs – Prototype” puts Signal Status on 2.4 and SDI Format on 2.1; the code swapped them. It also lists Board Revision 1.7, whose DATA_SETUP lines are commented out.`],
   ['Artwork 2026|59: card edge and rear modules now from the CorelDRAW files', `Card edge: ${EDGE_ART.src()}; T6301A/T6308A: ${REAR_ART.T6301.src()}; T6305: ${REAR_ART.T6305.src()}; C700: ${REAR_ART.C700.src()} (a file named M6205C400 in the M6204AC700 folder, titled “M6204C700”). The drawings agree with the model: the T6301A has no AES IN8 and two SDI outputs; only the T6308A carries AES IN8 (BNC10) at the cost of SDI OUT2. The T6305 drawing puts AES IN8 on BNC8 <i>and</i> on terminal block 9, has no AES IN6 and no SDI output at all — a draft never matched by a T6305 for this card. The card-edge drawing names the yellow LED “CASCADE ON LED”, not “ON”. The PCB silk renders stay in the Card view.`],
   ['Third-party HD core, edited in place', `<span class="mono">vc_299m_291mo_new_2.v</span> (PugMedia Inc., 2007) has the Ward-Beck edit “Ali-Rem/Ali-Add” renaming ch1 to ch1x; its own to-do list still says “50Hz behavior : Not now”. Packets are suppressed on the line after the switching point (lines 8/570 for 1080i, 8 for 720p) and audio control packets go in Y on lines 9/571.`],
  ];
  m.innerHTML = M6_CSS + card(`Findings — what the M6204A and its firmware are “up to” (${F.length})`, `<ol>${F.map(f=>`<li style="margin-bottom:8px"><b>${f[0]}.</b> ${f[1]}</li>`).join('')}</ol>`) +
   card('Sources and inferred values', `<p class="small">Firmware: <span class="mono">M6204A/Software/atmel/v300</span> (v100w.c, M6204A.c, altera.c, cs84xx.c, gennum.c, CAN.c, ADC.c, Dashboard_b.c, headers, V100W.mak, wbs_ztcpack.txt). FPGA: <span class="mono">altera/v300</span> (M6204A.qsf, m6204a.bdf, audio_router.vhd, mux_active_groups.vhd, shift_in_128.vhd, vc_299m_291mo_new_2.v). Hardware: ISS1/ISS2/ISS3/ISS4 netlists, ISS3 BOM, PNP and Gerbers, T6308.net, rear-module and card-edge drawings, photos. Documents: operational info, DIP sheet, software histories, CAT559 manual draft, encoder schedule.</p>
    <p class="small">Inferred (marked on screen): main-loop step durations other than ALTERA_read_write, wait() at 7 cycles per iteration, GS1559/CS8416 lock times, group-detect delay, FPGA configuration time, EEPROM write time, frame-controller spacing, the order of packets inside HANC, SD packet layout, the sample bits inside HD channel words, the DIP orientation on the board, the purpose of the swap word and of the META transceiver.</p>`);
}

/* =====================================================================
   REGISTER
   ===================================================================== */
const FOOTNOTES = [
 {
  "text": "Card-edge and rear-module artwork (2026|59) is from the CorelDRAW files: M6204-card-edge.cdr (2009-03-02), M6204A - rear module options.cdr (2012-01-09), M6204A-T6305.cdr (2007-10-11) and the M6204AC700 IO drawing.",
  "src": "#OPENGEAR #SERIES/M6204 - #Master #OPENGEAR/M6204 - #Engineering/M6204-card-edge.cdr"
 },
 {
  "text": "The card-edge drawing names the yellow LED “CASCADE ON LED”; the PCB silk next to it says only “ON”.",
  "src": "#OPENGEAR #SERIES/M6204 - #Master #OPENGEAR/M6204 - #Engineering/M6204-card-edge.cdr"
 },
 {
  "text": "The T6305 drawing labels both BNC 8 and terminal block 9 “AES IN8”, has no AES IN6 and no SDI output.",
  "src": "#OPENGEAR #SERIES/M6204 - #Master #OPENGEAR/M6204 - #Engineering/M6204A-T6305.cdr"
 },
 {
  "text": "The T6308A gets AES IN8 on BNC 10 by giving up SDI OUT2; the T6301A has two SDI outputs and only seven AES inputs.",
  "src": "#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/M6204A - rear module options.cdr"
 },
 {
  "text": "The C700 rear drawing is filed as M6205C400-IO.cdr in the M6204AC700 folder but is titled “M6204C700”; it differs from the M6205CE400 file of the same name, and a Backup_of_ copy sits beside it.",
  "src": "#OPENGEAR #SERIES/M6204 - #Master #OPENGEAR/M6204 - #Engineering/M6204A/Custom/M6204AC700/M6205C400-IO.cdr"
 },
 {
  "text": "M6204A-T6301.cdr (2007-06-26) and the 2012 rear-module guide draw the same T6301 layout; the guide adds the T6308A.",
  "src": "#OPENGEAR #SERIES/M6204 - #Master #OPENGEAR/M6204 - #Engineering/M6204A-T6301.cdr"
 },
 {
  "text": "Inkscape’s CDR import drops the BNC drawings of the 2007 rear-module files; the archive’s LibreOffice rendering (M6204A-T6305.pdf) keeps them and is what the T6305 panel uses.",
  "src": "#OPENGEAR #SERIES/M6204 - #Master #OPENGEAR/M6204 - #Engineering/M6204A-T6305.pdf"
 }
];
SIM.register({footnotes:FOOTNOTES, 
  id:'m6204', name:'M6204A · openGear HD/SD-SDI 4-group AES embedder (2009|42)', duration:1,
  product:'M6204A', year:2009, family:'openGear', folder:'#OPENGEAR #SERIES/M6204 - #Master #OPENGEAR',
  summary:'openGear card that embeds up to four groups of audio into HD/SD-SDI: eight external AES inputs (CS8416 receivers, AD1895 rate converters) or the incoming embedded pairs, chosen per AES pair, are written into the HANC by a Cyclone II EP2C35. An AT90CAN128 running Ward-Beck’s own main loop reads the receivers and a 128-bit FPGA status word, drives twelve LEDs and talks to DashBoard; an M6204AE variant carries a CAT-559 Dolby encoder module.',
  highlights:['Card drawn from the ISS3 Gerbers with live LEDs and a clickable DIP switch','SDI lines down to the 31-word HANC packets the embed core inserts','Firmware main loop, 128-bit FPGA exchange and CAN heartbeat emulated pass by pass','DashBoard routing and SRC pages with the real OIDs, including the ghost rows','22 findings: DIP-wired group count, the channel-16 test word, 2-of-4 routing choices'],
  depth:'Full model',
  stepUnits:[
    {label:'1 main-loop pass', period:()=>PASS_T},
    {label:'1 video frame', period:()=>1/VF[world(absT()).sdi.fmt].fr},
    {label:'1 video line', period:()=>lineT(VF[world(absT()).sdi.fmt])},
    {label:'1 audio sample (48 kHz)', period:()=>1/48000},
    {label:'1 HD packet (31 words)', period:()=>31/VF[world(absT()).sdi.fmt].clk},
    {label:'1 ms (timer0)', period:()=>0.001},
    {label:'96 µs (timer1)', period:()=>C.T1},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.4,'400 ms (one heartbeat)'],[0.1,'100 ms'],[1001/30000,'1 frame (33 ms)'],[0.01,'10 ms'],[0.003,'3 ms (3 loop passes)'],[0.0005,'500 µs (128-bit exchange)'],[0.0001,'100 µs (3 HD lines)'],[0.00003,'30 µs (1 HD line)'],[1/48000,'1 audio sample (20.8 µs)'],[0.000004,'4 µs (HANC packets)'],[0.0000005,'0.5 µs (one packet)']],
  defaultZoom:2,
  init(){ SKEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: setting up an embedder', render:viewTutorial},
    {id:'second', label:'One second, down to HANC packets', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
