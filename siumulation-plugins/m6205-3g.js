/* =====================================================================
   M6205-3G / M6205A-3G — 3G/HD/SD-SDI embedded audio processor platform (openGear)
   Ward-Beck Systems R&D 2010|43–2011|44 (JRTI hand-off 2010|43-12-09, IBC 2010|43 launch)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Model build: Ali/M62053GNLC/M6205 (DTS NLC 5.1 build, sources 2011|44-05-12, objects obj/*.s 2011|44-05-12)
   Sources used (all under #OPENGEAR #SERIES/M6205-3G - #Master #OPENGEAR/M6205-3G SDI #RD #RD1/ unless noted):
   - Ali/M62053GNLC/M6205/application/
       main.c        initPorts, main() boot order, FPGA/DTS ready loops, setBaseProductInfo strings
       apptask.c     appTask() (APPTASK_INTERVAL 40), updateLeds, getExtPairLock, updateHardwareState (dead)
       wbsutils.c    resetAndInit, resetIfNewLock, serDesReset, set1001Flag, set50Flag, sdiFormatSelector, sendUpmixIputMode
       gs2970.c / gs2962.c / gspi.c  GS2970 RASTER_STRUC (0x22) decode, SMPTE 352M payload words, Gennum SPI via FPGA CS
       altspi.c/.h   alteraRead/alteraWrite (2012|45 edit re-pins them), obj/altspi.s (2011 build: PE5/PE6/PE7 + PD0)
       leds.c        LED bit map (HD 0, SD 1, ERR 2, AUDIO 3–6, AES 7–8, META 9, 3G 10; active low)
       cs8416.c      CS8416 SPI on PD1–PD4 / PG0–PG1, cs8416Init register values
       settings.c    readSW1/readSW2, DIP decoding, initSettings/updateSettings, NLC presets, initDtsBoard, COMP_ROUT routing
       dtsserial.c/.h  DaySequerra/DTS daughter-card protocol: '/' F0 board opcode data… checksum CR; Master_Transfer
       sigstat.c     format names, embedded-audio status string, setDtsStatus
       dbparams.c / dbmenus.c / dboids.h  DashBoard parameters, menus and OIDs
       tasklist.c    gearOS tasks/timers; zeuslib/common/gearos.c, timers.c, clock.c (Ross OGP-SDK-AVR), statmon.c, upgrade.c, headroom.c
       obj/util.s    wait() = 7 cycles per count;  M6205pack.txt (zeuspack /p M6205-3G-NLC, /p M6205-3G-MM)
   - pETER/Altera/Hardware/Progress/DTSv2/v106Bdts/rtl/  Control/spi.v (register file), AudioSW/par_sel_2of40.v,
       EgressAudio/egress_dts_multimerge.v, EgressVideo/hd_audio_mux_top.v (Xilinx XAPP1014), AES_Test.v
   - PUG/ vc_299m_291mo_new.v and Core_Updates/ (PugMedia SMPTE 299M core, Juan updates 2011|44-06)
   - JRTI/m6053g/M6205 3G Documentation/ M6205-3G_software.pdf (2010|43-12-02), m6205 3G hardware.pdf, FpgaRegUsed.txt
   - JRTI/m6053g/Layout/ 8399AR-500-02-SCH-DR1.pdf (part list), RV8399R-500-02-VEN-DR1/ L1-TOP.pho, ST.pho (card artwork),
       8399R-500-02-PCB-DR1.ipc (IPC-D-356 netlist: U3 pin nets, part centroids)
   - M6205-3G - #SalesInfo/NLC/M6205A-3G.pdf (manual issue 1, 2011|44-09-30), NLC_Dipswitch.xls (2011|44-05-19), specs2_updated.xls
   - ../M6205 - #Master #OPENGEAR/M6205 - #Engineering/ M6205-3G rear module.cdr (T6301A-3G panel), card photos
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const infT = s => `<span class="tag-inf" title="${String(s).replace(/"/g,'&quot;')}">inferred</span>`;
const hx = (n,w) => (n>>>0).toString(16).toUpperCase().padStart(w||2,'0');
const Y = y => SIM.year(y);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

/* ---------------- timing constants (8 MHz crystal: schematic "8.000MHz", clock.c CLK/64 = 125 kHz) ---------------- */
const FCPU = 8e6;
const C = {
  ALT: 390/FCPU,          // alteraRead/alteraWrite: 2 × alteraRWByte (≈20 cycles/bit, obj/altspi.s) + CS/call ≈ 49 µs
  GB: 180/FCPU,           // one gspi byte (obj/gspi.s, same loop shape)
  CSB: 140/FCPU,          // one cs8416 byte (aesWriteByte/aesReadByte, no MISO test on write) — inferred from source
  WAITC: 7,               // wait(): wdr, subi, sbci, cpi, cpc, brne(2) — obj/util.s
  WAIT2C: 8,              // wait2() in dtsserial.c (signed int loop) — inferred
  DTS_WB: 760/FCPU,       // spi_write + spi_selectChip + spi_unselectChip: 304+228+60 NOPs + bit code ≈ 760 cycles
  DTS_RB: 640/FCPU,       // spi_read (288 NOPs) + select/unselect ≈ 640 cycles
  DTS_SLASH: 40,          // bytes the master clocks in before the card returns '/' — inferred
  T_LOCK: 0.020,          // GS2974A + GS2970 lock/rate-detect after a cable or format change — inferred
  CONF: 0.45,             // EP2C35 AS configuration from the EPCS (≈6.9 Mbit) after power-up — inferred
  MAIN0: 0.065,           // AVR power-on + Ross bootloader hand-off to main() — inferred
  FPGA_IT: 22/FCPU,       // main(): one pass of while(!isAlteraReady() && fpgaReadyTime < 100000) — inferred
  CAN_BIT: 1e-6,          // candrv.c "Set up the CAN bus timing for 1 Mbps"
  OS: 12e-6,              // osRun overhead per task switch — inferred
};
C.GW = 2*C.ALT + 4*C.GB;              // gspiWrite: alteraWrite(0x11,dev) + addr word + data word + alteraWrite(0x11,0)
C.GR = 2*C.ALT + 6*C.GB;              // gspiRead: … + addr word + data word + dummy word ("work around Gennum bug")
C.CSR = 4*C.CSB + 20/FCPU;            // cs8416Read: MAP write (2 bytes) then read (tag + data)
C.CSW = 3*C.CSB;
const waitT = n => n*C.WAITC/FCPU;    // wait(n)
const wait2T = n => n*C.WAIT2C/FCPU;
const DTS_X = ok => 256*C.DTS_WB + 3*wait2T(5000) + (ok ? (C.DTS_SLASH+255)*C.DTS_RB : 1024*C.DTS_RB);  // Master_Transfer

/* ---------------- video formats (GS2970 codes from vidinfo.h, names from sigstat.c formatTable) ---------------- */
const VF = {
  g3p59: {name:'3G 1080p/59.94', std:3, rate:2, fmt:0x2B, m:1, il:false, clk:148.5e6/1.001, spl:2200, act:1920, lines:1125, fr:60000/1001, hdr:8, sw:[7], rateTxt:'2.97/1.001 Gb/s', r4:0x04},
  g3p60: {name:'3G 1080p/60',    std:3, rate:2, fmt:0x2B, m:0, il:false, clk:148.5e6,       spl:2200, act:1920, lines:1125, fr:60,         hdr:8, sw:[7], rateTxt:'2.97 Gb/s', r4:0x04},
  g3p50: {name:'3G 1080p/50',    std:3, rate:2, fmt:0x2D, m:0, il:false, clk:148.5e6,       spl:2640, act:1920, lines:1125, fr:50,         hdr:8, sw:[7], rateTxt:'2.97 Gb/s', r4:0x05},
  g3b59: {name:'3G level B 1080p/59.94', std:4, rate:2, fmt:0x2B, m:1, il:false, clk:148.5e6/1.001, spl:2200, act:1920, lines:1125, fr:60000/1001, hdr:8, sw:[7], rateTxt:'2.97/1.001 Gb/s (2 × HD links)', r4:0x04},
  hd1080i59:{name:'HD 1080i/59.94', std:2, rate:0, fmt:0x0A, m:1, il:true, clk:74.25e6/1.001, spl:2200, act:1920, lines:1125, fr:30000/1001, hdr:8, sw:[7,569], rateTxt:'1.485/1.001 Gb/s', r4:0x02},
  hd1080i50:{name:'HD 1080i/50',  std:2, rate:0, fmt:0x0C, m:0, il:true, clk:74.25e6,       spl:2640, act:1920, lines:1125, fr:25,         hdr:8, sw:[7,569], rateTxt:'1.485 Gb/s', r4:0x03},
  hd720p59: {name:'HD 720p/59.94', std:2, rate:0, fmt:0x00, m:1, il:false, clk:74.25e6/1.001, spl:1650, act:1280, lines:750, fr:60000/1001, hdr:8, sw:[7], rateTxt:'1.485/1.001 Gb/s', r4:0x07},
  hd720p50: {name:'HD 720p/50',   std:2, rate:0, fmt:0x04, m:0, il:false, clk:74.25e6,       spl:1980, act:1280, lines:750, fr:50,         hdr:8, sw:[7], rateTxt:'1.485 Gb/s', r4:0x09},
  hd1080p23:{name:'HD 1080p/23.98',std:2, rate:0, fmt:0x10, m:1, il:false, clk:74.25e6/1.001, spl:2750, act:1920, lines:1125, fr:24000/1001, hdr:8, sw:[7], rateTxt:'1.485/1.001 Gb/s', r4:0x06},
  sd525:  {name:'SD 525',  std:1, rate:1, fmt:0x16, m:1, il:true, clk:27e6, spl:1716, act:1440, lines:525, fr:30000/1001, hdr:4, sw:[10,273], rateTxt:'270 Mb/s', r4:0x04},
  sd625:  {name:'SD 625',  std:1, rate:1, fmt:0x18, m:0, il:true, clk:27e6, spl:1728, act:1440, lines:625, fr:25,         hdr:4, sw:[6,319],  rateTxt:'270 Mb/s', r4:0x04},
};
const STD = ['LOCK_NONE','LOCK_SD','LOCK_HD','LOCK_3GA','LOCK_3GB'];
const STD_TXT = ['Unlocked','Locked (SD)','Locked (HD)','Locked (3G A)','3GB Not Supported'];   // dbparams.c alarm table
const GCOL = ['--accent','--accent2','--warn','--bad'];
const LEDN = ['HD','SD','ERR','AUDIO 1','AUDIO 2','AUDIO 3','AUDIO 4','AES 1','AES 2','META DATA','3G'];          // leds.c bit order
const LEDDS = ['DS1','DS2','DS3','DS4','DS5','DS6','DS7','DS8','DS9','DS10','DS11'];
const LEDCOL = ['#7dff6a','#7dff6a','#ff4a3a','#ffd23a','#ffd23a','#ffd23a','#ffd23a','#ffd23a','#ffd23a','#7dff6a','#7dff6a'];  // manual Table 1
/* LED centres on the card artwork (IPC-D-356 centroids of DS1…DS12, + (1.0, 1.0) in to the gerber origin, 120 px/in) */
const LEDXY = {DS1:57.6, DS2:70.8, DS3:84.0, DS4:106.8, DS5:116.4, DS6:126.0, DS7:135.6, DS8:163.2, DS9:172.8, DS10:192.0, DS11:43.8, DS12:211.2};

/* NLC presets: settings.c nlcLight… / nlcMedium… / nlcAggressive… (#define), User defaults = static nlcUser… */
const PRESETS = [
  {name:'Light',      ratio:80,  ut:0, lt:0, db:12, nf:30, att:50, rel:220, fs:0, cth:5, cr:50},
  {name:'Medium',     ratio:95,  ut:0, lt:0, db:8,  nf:30, att:30, rel:120, fs:0, cth:5, cr:50},
  {name:'Aggressive', ratio:100, ut:0, lt:0, db:2,  nf:30, att:15, rel:60,  fs:0, cth:3, cr:80},
  {name:'User',       ratio:80,  ut:0, lt:0, db:12, nf:30, att:50, rel:220, fs:0, cth:5, cr:50},
];
/* output router choices (dbparams.c, COMP_ROUT) and daughter-board input choices */
const ROUTE = {0x18:'DTS L',0x19:'DTS R',0x1A:'DTS C',0x1B:'DTS LFE',0x1C:'DTS Ls',0x1D:'DTS Rs',0x1E:'DTS Lt',0x1F:'DTS Rt',
  0x10:'Ext AES1 L /SRC OFF',0x11:'Ext AES1 R /SRC OFF',0x12:'Ext AES2 L /SRC OFF',0x13:'Ext AES2 R /SRC OFF',
  0x14:'Ext AES1 L /SRC ON',0x15:'Ext AES1 R /SRC ON',0x16:'Ext AES2 L /SRC ON',0x17:'Ext AES2 R /SRC ON'};
for (let i=0;i<16;i++) ROUTE[i] = `Emb AES${(i>>1)+1} ${i&1?'R':'L'}`;
const DBIN = {}; for (let i=0;i<16;i++) DBIN[i] = `Embedded AES${(i>>1)+1} ${i&1?'R':'L'}`;
Object.assign(DBIN, {0x10:'Ext AES1 L /SRC OFF',0x11:'Ext AES1 R /SRC OFF',0x12:'Ext AES2 L /SRC OFF',0x13:'Ext AES2 R /SRC OFF',0x28:'Ext AES1 L /SRC ON',0x29:'Ext AES1 R /SRC ON',0x2A:'Ext AES2 L /SRC ON',0x2B:'Ext AES2 R /SRC ON'});
const MUX_DEF = [0x18,0x19,0x1A,0x1B,0x1C,0x1D,0x06,0x07, 0x08,0x09,0x0A,0x0B,0x0C,0x0D,0x0E,0x0F];   // updateMuxAudioRouting(1) with DTS_NLC
const DBIN_DEF = [0x00,0x01,0x02,0x03,0x04,0x05,0x06,0x07];
/* archived FPGA v106Bdts par_sel_2of40 decode of the same 8-bit code */
function fpgaDecode(code, load){
  if (load==='match'){ if (code<0x10) return {k:'emb', ch:code}; if (code<0x14) return {k:'ext', ch:code-0x10}; if (code<0x18) return {k:'src', ch:code-0x14}; if (code<0x20) return {k:'dts', ch:code-0x18}; return {k:'none'}; }
  if (code<0x10) return {k:'emb', ch:code}; if (code<0x14) return {k:'ext', ch:code-0x10};
  if (code<0x20) return {k:'none', why:`code 0x${hx(code)} = ext_aes${((code-0x10)>>1)+1}${code&1?'b':'a'} (port left unconnected in AES_Test.v)`};
  if (code<0x28) return {k:'dts', ch:code-0x20}; if (code<0x2C) return {k:'src', ch:code-0x28}; return {k:'none'};
}
const OIDS = { SDI_STATUS:0x0C01, SDI_FORMAT:0x0C02, EAUDIO:0x0D00, XAUDIO:0x0D01, GROUPS:0x0D10, MUX1:0x0D11, DBIN1:0x0D20, DTS_STATUS:0x0F00, DTS_MODEL:0x0F01,
  NLC_OUT:0x0F30, NLC_TARGET:0x0F31, NLC_PRESET:0x0F32 };
const OIDNAME = {0x0C01:'SDI (OID_SDI_STATUS)',0x0C02:'SDI Format',0x0D00:'Embedded Audio',0x0D01:'External Audio',0x0D10:'Audio Groups Enabled',0x0F00:'DTS Function (status)',0x0F01:'Model No.',0x0F30:'NLC Output Mode',0x0F31:'Target Level',0x0F32:'Preset'};

/* ---------------- scenarios and pages ---------------- */
const SCN = {
  steady:{label:'Running, 3G-A locked (steady state)', pages:[[0,'0 – 1 s']]},
  plug:  {label:'SDI cable plugged in at 100 ms', pages:[[0,'0 – 1 s'],[1,'1 – 2 s']]},
  boot:  {label:'Power-up in the frame', pages:[[0,'0 – 1 s · main()'],[1,'1 – 2 s · initDtsBoard, gearOS'],[2,'2 – 3 s']]},
};

/* ---------------- world (what is plugged in, switches) ---------------- */
function mkBase(){ return {
  sdi:true, fmt:'g3p59', groups:0b1111, content:['P','P','P','P'],
  aes:[false,false], dbd:true, fpgaLoad:'match', confT:C.CONF,
  sw1:[false,false,false,false,false,false,false,false],    // SW1 DIP-1…8 ON?  (all OFF: 1 group, Light, In-line, from DIP, DashBoard YES)
  sw2:[false,false,false,false],                            // SW2 DIP-9…12 (target level in NLC_Dipswitch.xls; not read by this build)
  prog:'dramaAd',
}; }
const D = {
  scn:'steady', page:0, base:mkBase(), ev:[], log:[], lastTrace:[],
  ui:{ dashTab:'status', dashCfg:'routing', blk:'fpga', sch:0, scopeOut:0, autoFollow:true },
  ver:0,
};
const page0 = ()=> SCN[D.scn].pages[Math.min(D.page, SCN[D.scn].pages.length-1)][0];
const absT = t => page0() + (t===undefined? SIM.t : t);
/* world history: base + timed events */
let WC=null, WKEY='';
function world(t){
  const key = JSON.stringify([D.scn, D.base, D.ev]);
  if (key!==WKEY){ WKEY=key; WC=[]; let w=JSON.parse(JSON.stringify(D.base)); if (D.scn==='plug') w.sdi=false; WC.push({t:-Infinity, w});
    for (const e of D.ev){ if (e.kind!=='w') continue; w=JSON.parse(JSON.stringify(w)); applyW(w,e); WC.push({t:e.t, w}); } }
  let lo=0, hi=WC.length-1; while (lo<hi){ const m=(lo+hi+1)>>1; if (WC[m].t<=t) lo=m; else hi=m-1; }
  return WC[lo].w;
}
function applyW(w,e){ const p=e.k.split('.'); if (p.length===1) w[p[0]] = e.v; else w[p[0]][+p[1]] = e.v; }
function lastChange(keys, t){ let r=-1e9; if (D.scn==='plug' && keys.includes('sdi')) r = 0.1; for (const e of D.ev){ if (e.t>t) break; if (e.kind==='w' && keys.includes(e.k.split('.')[0])) r=e.t; } return r; }
function addEv(e){ e.t = absT(); D.ev = D.ev.filter(x=> !(x.kind===e.kind && x.k===e.k && Math.abs(x.t-e.t)<1e-9)); D.ev.push(e); D.ev.sort((a,b)=>a.t-b.t); D.ver++; }
/* the scenario's own cable plug event */
function sdiOn(t){ const w=world(t); if (D.scn==='plug' && t<0.1 && !D.ev.some(e=>e.kind==='w'&&e.k==='sdi'&&e.t<=t)) return false; if (D.scn==='plug' && t>=0.1 && !D.ev.some(e=>e.kind==='w'&&e.k==='sdi'&&e.t<=t)) return true; return w.sdi; }

/* DIP decoding — settings.c: readSW1 = ~PINA (DIP-n on PA(n-1), ON = 1); readSW2 = (~PINC) & 0xF0 */
function sw1Byte(w){ let v=0; w.sw1.forEach((on,i)=>{ if (on) v |= 1<<i; }); return v; }
function sw2Byte(w){ let v=0; w.sw2.forEach((on,i)=>{ if (on) v |= 1<<(4+i); }); return v; }
const readAudioGroups = d => ((d&2)?1:0) + ((d&1)?2:0);
const readDtsNlcPreset = d => ((d&8)?1:0) + ((d&4)?2:0);
const readNlcOutputMode = d => (d&16)?1:0;
const xlsTarget = w => -35 + ((w.sw2[0]?8:0)+(w.sw2[1]?4:0)+(w.sw2[2]?2:0)+(w.sw2[3]?1:0));   // NLC_Dipswitch.xls table

/* ---------------- program loudness (what the SDI source carries; a simulation choice) ---------------- */
const PROG = {
  dramaAd:{label:'Quiet drama (−32 LKFS), loud ad starts at 400 ms (−14 LKFS)', at:t=> t<0.4 ? -32 : -14},
  steady24:{label:'Programme already at −24 LKFS', at:t=> -24},
  adDrama:{label:'Loud ad (−14) ends at 300 ms, quiet drama follows (−32)', at:t=> t<0.3 ? -14 : -32},
};
/* NLC gain model — DTS Neural Loudness Control internals are not in the archive: first-order ballistics
   using the preset numbers (Attack/Rise, Release/Fall, Dead Band, Correction Ratio, Noise Floor). Inferred. */
function nlcGainTrack(w, t0, t1, fw){
  const P = PRESETS[fw.preset] , target = fw.target - 40, dt = 0.0005, out=[];
  let g = 0, Ssm = PROG[w.prog].at(Math.max(0,t0-1));
  for (let t=t0-1; t<=t1+1e-9; t+=dt){
    const S = PROG[world(t).prog].at(t);
    Ssm += (S - Ssm)*(1-Math.exp(-dt/0.2));                 // 200 ms loudness integration (inferred)
    let want = g;
    if (Ssm < target - P.nf) want = g;                     // below the noise floor: hold
    else { const e = target - Ssm; if (Math.abs(e) > P.db/2) want = clamp(e*P.ratio/100, -30, 20); }
    const tau = (want < g ? P.att : P.rel)/1000;
    g += (want - g)*(1-Math.exp(-dt/tau));
    if (t>=t0) out.push([t, S, Ssm, g]);
  }
  return out;
}

/* =====================================================================
   EMULATOR — main() boot, gearOS (osRun) with the observed-tick timers, appTask passes,
   resetAndInit, canReceive (DashBoard requests), reportStatus, against a model of the FPGA
   register file (spi.v), the GS2970/GS2962 and the DTS daughter card.
   ===================================================================== */
let S=null, SKEY='';
function sched(){ const key=JSON.stringify([D.scn, D.base, D.ev]); if (key===SKEY && S) return S; SKEY=key; S=emulate(); return S; }

function emulate(){
  const END = SCN[D.scn].pages.length + 0.05;
  const st = { ops:[], tasks:[], can:[], leds:[], regs:{}, notes:[], fw:[], egr:[], lockH:[], obs:[], dts:[], rxH:[], txH:[] };
  /* ---- FPGA model ---- */
  const R = {};                                    // current register file
  const rdef = ()=>({0x00:1,0x01:0,0x02:0,0x03:0xFF,0x04:0,0x09:0,0x0D:0,0x0E:(R[0x0E]??0),0x0F:0xAA,0x10:0,0x11:0,0x14:0,0x16:0,0x22:3});
  let fpgaRstN = false, cfgDone = Infinity;
  const ledSnap = t => st.leds.push({t, on: ledsNow(t)});
  function ledsNow(t){ if (!(t >= cfgDone)) return 0; const l=R[0x0F]??0xFF, h=R[0x0E]??0xFF; let on=0; for (let i=0;i<8;i++) if (!((l>>i)&1)) on|=1<<i; for (let i=0;i<3;i++) if (!((h>>i)&1)) on|=1<<(8+i); return on; }
  function fpgaReset(t){ Object.assign(R, rdef()); fpgaRstN=false; st.egr.push({t, on:false, why:'FPGA_RESET_N low: control_status = 0'}); ledSnap(t); rxSet(t, true); st.txH.push({t, rst:true}); txRst=true; }
  let t_now = 0;
  /* ---- serdes model ---- */
  let rxRst = true, txRst = true, rxRelease = -1e9;
  const rxSet = (t, rst)=>{ if (rst!==rxRst || !st.rxH.length){ st.rxH.push({t, rst, fpga:fpgaRstN}); } rxRst = rst; };
  const lockedAt = t => { const w=world(t); if (!sdiOn(t) || rxRst || !fpgaRstN || !(t>=cfgDone)) return false;
    const since = Math.max(lastChange(['sdi','fmt'], t), rxRelease); return t >= since + C.T_LOCK; };
  /* ---- firmware state ---- */
  const b0 = D.base;
  const fw = { mode:'off', resetHappened:1, loopAfterReset:0, goInReset:0, wentInReset:0,
    dashEn:true, dipEn:true, groups:0, preset:0, outMode:0, target:16, mux:MUX_DEF.slice(), dbin:DBIN_DEF.slice(), routeDef:1,
    sdiStd:-1, sdiFmt:'', embFmt:-1, embGrp:-1, extFmt:-1, extPair:-1, dtsStatus:-1, lost:0, repTick:0, dtsAlive:true };
  const snapFw = t => st.fw.push({t, f:JSON.parse(JSON.stringify(fw))});
  function op(t, dur, lane, label, o){ const x=Object.assign({t0:t, t1:t+dur, lane, label}, o||{}); st.ops.push(x); return t+dur; }
  function AW(t, a, v, fn){ const live = fpgaRstN && t>=cfgDone;
    if (live){ R[a]=v&0xFF; if (a===0x0F||a===0x0E) ledSnap(t+C.ALT);
      if (a===0x09) st.egr.push({t:t+C.ALT, on: !!(v&1), why:`alteraWrite(0x09, 0x${hx(v)}) → control_status → update_done`});
      if (a===0x16){ const r=!(v&0x10); if (rxRst && !r) rxRelease=t+C.ALT; rxSet(t+C.ALT, r); }
      if (a===0x14){ const r=!(v&0x10); if (r!==txRst) st.txH.push({t:t+C.ALT, rst:r}); txRst = r; } }
    return op(t, C.ALT, 'A', `W 0x${hx(a)}=${hx(v)}${live?'':' (ignored: FPGA in reset)'}`, {a, v, rw:0, fn}); }
  function AR(t, a, fn){ let v = fpgaRstN && t>=cfgDone ? (R[a]??0) : 0x00; return {v, t:op(t, C.ALT, 'A', `R 0x${hx(a)}`, {a, v, rw:1, fn})}; }
  function GW(t, dev, a, v, fn){ return op(t, C.GW, 'G', `${dev} W ${hx(a,3)}=${hx(v,4)}`, {dev, a, v, rw:0, fn}); }
  function GR(t, dev, a, v, fn){ return op(t, C.GR, 'G', `${dev} R ${hx(a,3)}`, {dev, a, v, rw:1, fn}); }
  function CSR(t, dev, a, v){ return op(t, C.CSR, 'C', `CS8416 #${dev} R 0x${hx(a)}`, {dev, a, v, rw:1, fn:'getExtPairLock → cs8416Read'}); }
  function WAITop(t, d, fn){ return op(t, d, 'W', fn, {fn}); }
  function canMsg(t, oid, kind, note){ // OGP message: ~2 CAN frames (multi-frame header + value) — inferred
    let tt=t; for (let k=0;k<2;k++){ const d=(67+8*8)*C.CAN_BIT*1.1; st.can.push({t0:tt, t1:tt+d, oid, kind, note, k}); tt+=d+2e-6; } }
  function report(t, oid, note){ canMsg(t, oid, 'REPORT_PARAM 0x10', note); }
  function dtsXfer(t, opcode, name){ const ok = world(t).dbd && fpgaRstN && t>=cfgDone; const d = DTS_X(ok);
    const msgLen = {0x4A:10,0x4F:10,0x4C:14,0x4B:6,0x50:6,0x4D:10,0x01:6,0x02:6,0x03:6,0x04:6,0x05:6}[opcode]||10;
    st.dts.push({t0:t, t1:t+d, opcode, name, ok, len:msgLen});
    return {t: op(t, d, 'D', `${name} (0x${hx(opcode)})`, {fn:`Master_Transfer: 256 B written, ${ok?'"/" found':'1024 B read, no "/" → FALSE'}`, opcode, ok}), ok}; }
  /* ---- read the video info the way gs2970ReadVidInfo does ---- */
  function vidInfo(t){ if (!lockedAt(t)) return {std:0, fmt:0, m:0, il:0}; const f=VF[world(t).fmt]; return {std:f.std, fmt:(f.std===4?0x2B:f.fmt), m:f.m, il:f.il?1:0, f}; }
  function parseFmt(v, f){ if (!v.std) return 'Unlocked'; if (v.std===4) return '3GB Not Supported'; return f? f.name : 'Unknown'; }

  /* ---- resetAndInit (wbsutils.c) ---- */
  function resetAndInit(t, why){
    const t0=t; const tr=[`${why} → resetAndInit()`];
    t = WAITop(t, 0.010, 'enableAltera(); waitMillis(10)');
    fpgaReset(t); t = WAITop(t, 0.010, 'disableAltera(); waitMillis(10) — FPGA_RESET_N (PG3) low');
    fpgaRstN = true; t = WAITop(t, 0.010, 'enableAltera(); waitMillis(10)');
    let r = AR(t, 0x16, 'resetAndInit'); t=r.t; t = AW(t, 0x16, r.v|0x10, 'GS2970 out of reset'); t = WAITop(t, 0.010, 'waitMillis(10)');
    r = AR(t, 0x14, 'resetAndInit'); t=r.t; t = AW(t, 0x14, r.v|0x10, 'GS2962 out of reset'); t = WAITop(t, 0.010, 'waitMillis(10)');
    t = AW(t, 0x0D, 0x01, 'loopback'); t = AW(t, 0x0D, 0x00, 'normal');
    t = WAITop(t, waitT(15000), 'cs8416Reset(): 5 × wait(3000)');
    for (const d of [1,2]) for (let k=0;k<7;k++) t = op(t, C.CSW, 'C', `CS8416 #${d} W ${k}`, {fn:'cs8416Init'});
    t = GW(t, 'GS2970', 0x009, 0x2DE3 , 'gs2970Init: IOCONFIG_2'); t = GW(t, 'GS2962', 0x000, 0x0240, 'gs2962Init: IOPROC');
    t = WAITop(t, 0.100, 'waitMillis(100)');
    t = initDtsBoard(t, 'resetAndInit → initDtsBoard()');
    fw.resetHappened = 1; fw.loopAfterReset = 0;
    st.tasks.push({t0, t1:t, kind:'reset', label:'resetAndInit()', why});
    return t;
  }
  function initDtsBoard(t, why){
    const t0=t; t = WAITop(t, 12*waitT(60000), 'initDtsBoard: 12 × wait(60000)');
    let x = dtsXfer(t, 0x4A, 'Set_NLC_Preset', true); t=x.t;
    if (!x.ok){ t = WAITop(t, waitT(60000), 'wait(60000) — retry'); x = dtsXfer(t, 0x4A, 'Set_NLC_Preset (retry)'); t=x.t; if (!x.ok) fw.preset = 0; }
    t = WAITop(t, waitT(60000), 'wait(60000)');
    x = dtsXfer(t, 0x4F, 'Set_NLC_OutMode'); t=x.t; if (!x.ok) fw.outMode = 0;
    t = WAITop(t, waitT(60000), 'wait(60000)');
    x = dtsXfer(t, 0x4C, 'Set_NLC_TargetLevel'); t=x.t; if (!x.ok) fw.target = 0;
    st.tasks.push({t0, t1:t, kind:'dts', label:'initDtsBoard()', why});
    return t;
  }

  /* ---- one appTask() pass (apptask.c) ---- */
  function appPass(t){
    const t0=t; t_now=t;
    if (!(t >= cfgDone)){ st.tasks.push({t0, t1:t+20e-6, kind:'app', label:'appTask: isAlteraReady() = 0 → nothing', idle:true}); return t+20e-6; }
    const w = world(t);
    // updateSettings()
    if (fw.dipEn && !fw.dashEn){
      const d = sw1Byte(w); const g = readAudioGroups(d);
      if (g!==fw.groups){ fw.groups=g; report(t, OIDS.GROUPS, 'updateSettings: audioGroups from DIP-1/2'); }
      const p = readDtsNlcPreset(d); if (p!==fw.preset){ report(t, OIDS.NLC_PRESET, `updateSettings: DIP preset ${PRESETS[p].name} ≠ ${PRESETS[fw.preset].name} → setDtsNlcPreset() does nothing (dashboardEnabled = FALSE) → reportParamValue again`); }
      const o = readNlcOutputMode(d); if (o!==fw.outMode){ report(t+3e-4, OIDS.NLC_OUT, 'updateSettings: DIP output mode ≠ nlcOutputMode → setNlcOutputMode() ignored → report again'); }
    }
    t += 30e-6;
    // gs2970ReadVidInfo
    const v = vidInfo(t); const f = v.f;
    t = GR(t, 'GS2970', 0x022, v.std? (0x1000 | ((v.std>=3?2:v.std===1?1:0)<<14) | (v.m?0x2000:0) | (v.il?0x800:0)) : 0, 'gs2970ReadVidInfo: RASTER_STRUC_4');
    if (v.std){ for (const a of [0x006,0x007,0x01F,0x020,0x021]) t = GR(t, 'GS2970', a, a===0x006? (v.fmt<<8)|0x66 : 0, 'gs2970ReadVidInfo'); }
    st.lockH.push({t, std:v.std});
    // resetIfNewLock
    if (fw.goInReset){ if (!fw.resetHappened){ t = resetAndInit(t, 'resetIfNewLock: new lock'); } fw.goInReset=0; fw.wentInReset=1; }
    else { if (!v.std) fw.wentInReset=0; else if (!fw.wentInReset) fw.goInReset=1; }
    // payload: pSdoLevel/pVidInfo are locals → this branch runs on every pass
    if (v.std>=3){ t=GW(t,'GS2970',0x01D,0xC089|(v.fmt===0x2B?(v.m?0x0A00:0x0B00):0x0900),'gs2970SetPayloadID'); t=GW(t,'GS2970',0x01E,0x0100,'gs2970SetPayloadID'); t=GW(t,'GS2970',0x001,0x0080,'gs2970SetPayloadID: IOPROC_2 (B→A)'); }
    else t=GW(t,'GS2970',0x001,0x0100,'gs2970SetPayloadID: IOPROC_2 default');
    t=GR(t,'GS2962',0x000,0x0240,'gs2962Set3GLevel');
    if (v.std>=3){ for (const a of [0x0A,0x0B,0x0C,0x0D]) t=GW(t,'GS2962',a,0,'gs2962Set3GLevel: 352M level A'); t=GW(t,'GS2962',0x000,0x0240,'gs2962Set3GLevel: IOPROC'); }
    else { t=GW(t,'GS2962',0x000,0x0240,'gs2962Set3GLevel: SD/HD'); for (const a of [0x0A,0x0B,0x0C,0x0D]) t=GW(t,'GS2962',a,0,'gs2962Set3GLevel: no 352M'); }
    t = AW(t, 0x22, fw.groups, 'appTask: audio groups (DTS_NLC)');
    let r = AR(t, 0x16, 'appTask: desResetStatus'); t=r.t;
    if (r.v !== 0x10){ if (!fw.resetHappened) t = resetAndInit(t, `alteraRead(0x16) = 0x${hx(r.v)} ≠ BIT4 → serDesReset`); }
    // getEmbeddedAudioInfo
    const g = (v.std && lockedAt(t)) ? w.groups : 0;
    if (v.std===1) t=GR(t,'GS2970',0x403,g<<4,'gs2970ReadSDAudioDetect'); else if (v.std) t=GR(t,'GS2970',0x202,g<<1,'gs2970ReadHDAudioDetect');
    let fmt32=0; for (let k=0;k<4;k++){ const c=w.content[k]; const n = c==='E'?10: c==='D'?9 : 0; fmt32 |= (n | (n<<4)) << (8*k); }
    for (const a of [0x30,0x31,0x32,0x33]){ r=AR(t,a,'appTask: audioStat'); t=r.t; }
    const embGrp = (v.std>=2) ? g : 0;                     // reg 0x05 = group_det_hd[3:0]: the HD detector only
    r = AR(t, 0x05, 'appTask: embAudGrp'); t=r.t;
    r = AR(t, 0x41, 'appTask: extAudFmt'); t=r.t;
    const ext = (w.aes[0]?1:0) | (w.aes[1]?2:0);
    t = CSR(t, 1, 0x0C, w.aes[0]?0:0x10); t = CSR(t, 2, 0x0C, w.aes[1]?0:0x10);
    // status parameters → reportParamValue on change
    if (fw.sdiStd!==v.std){ fw.sdiStd=v.std; report(t, OIDS.SDI_STATUS, `setSdiStandard(${STD[v.std]})`); }
    const fn = parseFmt(v, f); if (fw.sdiFmt!==fn){ fw.sdiFmt=fn; report(t+1e-4, OIDS.SDI_FORMAT, `setSdiFormat: "${fn}"`); }
    if (fw.embFmt!==fmt32 || fw.embGrp!==embGrp){ fw.embFmt=fmt32; fw.embGrp=embGrp; report(t+2e-4, OIDS.EAUDIO, 'setEmbFormat'); }
    if (fw.extPair!==ext){ fw.extPair=ext; report(t+3e-4, OIDS.XAUDIO, 'setExtFormat'); }
    r = AR(t, 0x20, 'setDtsStatus(alteraRead(0x20))'); t=r.t;
    const ds = w.dbd ? 0x10 : 0x01; if (fw.dtsStatus!==ds){ fw.dtsStatus=ds; report(t, OIDS.DTS_STATUS, `setDtsStatus → ${ds===0x10?'BIT4 (OK)':'BIT0 (Error)'}`); }
    // updateLeds → writeLedReg
    let l1=0xFF, l2=0x0F; const on=(i)=>{ if (i<8) l1&=~(1<<i); else l2&=~(1<<(i-8)); };
    if (v.std===1) on(1); else if (v.std===2) on(0); else if (v.std>=3) on(10); else on(2);
    for (let k=0;k<4;k++) if ((g>>k)&1) on(3+k);
    if (ext&1) on(7); if (ext&2) on(8);
    t = AW(t, 0x0F, l1, 'writeLedReg'); t = AW(t, 0x0E, l2, 'writeLedReg');
    // set1001Flag / set50Flag / sdiFormatSelector / sendUpmixIputMode
    t = GR(t,'GS2970',0x022,0,'set1001Flag'); t = AW(t, 0x0D, (v.std && v.m) ? 0x00 : 0x10, 'set1001Flag → MODE[4] detSel1 (ICS662_SEL3)');
    const r10 = ((f && (f.fmt===0x2D||f.fmt===0x0C||f.fmt===0x04)) && v.std ? 0x08:0) | (v.std>=3?0x10:0);
    t = AW(t, 0x10, r10, 'set50Flag → video1 (lock50, lock_3g)');
    const r4 = (v.std && f ? f.r4 : 0x04) | [0x10,0x30,0x70,0xF0][fw.groups];
    t = AW(t, 0x04, r4, 'sdiFormatSelector → line_std / groups_enabled');
    t = AW(t, 0x06, 1, 'sendUpmixIputMode (NLC build: always 1)');
    if (fw.resetHappened){
      if (fw.loopAfterReset<1){ t=AW(t,0x09,0x00,'reset loop 1: control_status = 0'); fw.loopAfterReset++; }
      else if (fw.loopAfterReset<2){ t=AW(t,0x09,0x01,'reset loop 2: control_status = 1'); fw.loopAfterReset++; }
      else if (fw.loopAfterReset<10) fw.loopAfterReset++;
      else { fw.resetHappened=0; fw.loopAfterReset=0; }
    }
    for (let k=0;k<16;k++) t = AW(t, 0x50+k, fw.mux[k], 'updateMuxAudio');
    for (let k=0;k<8;k++) t = AW(t, 0x60+k, fw.dbin[k], 'updateDboardInputs');
    st.tasks.push({t0, t1:t, kind:'app', label:'appTask()', std:v.std});
    snapFw(t);
    return t;
  }

  /* ---- canReceive: DashBoard requests queued by the user ---- */
  function canReq(t, e){
    const t0=t; const tr=[];
    st.can.push({t0:Math.max(e.t,t-3e-4), t1:Math.max(e.t,t-3e-4)+1.6e-4, oid:e.oid||0, kind:`SET_PARAM 0x4A (from DashBoard)`, note:e.label, rx:true});
    if (e.k==='reboot') return t;
    if (!fw.dashEn && e.k!=='dtsinfo'){ report(t+2e-4, e.oid||0, 'set function ignored: dashboardEnabled = FALSE (DIP-8 ON) → old value echoed'); st.tasks.push({t0, t1:t+4e-4, kind:'can', label:'canReceive: '+e.label}); return t+4e-4; }
    t += 2e-4;
    if (e.k==='preset'){ let x=dtsXfer(t,0x4A,'Set_NLC_Preset'); t=x.t; if (x.ok){ const y=dtsXfer(t,0x4C,'Set_NLC_TargetLevel'); t=y.t; if (y.ok) fw.preset=e.v; } t=dtsXfer(t,0x4B,'Get_NLC_Preset').t; canMsg(t, 0, 'TRAP (sendMenuChangeTrap ×2)', 'menu change'); }
    else if (e.k==='target'){ const x=dtsXfer(t,0x4C,'Set_NLC_TargetLevel'); t=x.t; if (x.ok) fw.target=e.v; t=dtsXfer(t,0x4D,'Get_NLC_TargetLevel').t; }
    else if (e.k==='outmode'){ const x=dtsXfer(t,0x4F,'Set_NLC_OutMode'); t=x.t; if (x.ok) fw.outMode=e.v; t=dtsXfer(t,0x50,'Get_NLC_OutMode').t; }
    else if (e.k==='groups'){ fw.groups=e.v; t+=1e-4; }
    else if (e.k==='routeDef'){ fw.routeDef=e.v; if (e.v) fw.mux=MUX_DEF.slice(); t+=1e-4; }
    else if (e.k==='mux'){ fw.mux[e.i]=e.v; fw.routeDef=0; t+=1e-4; }
    else if (e.k==='dbin'){ fw.dbin[e.i]=e.v; t+=1e-4; }
    else if (e.k==='dtsinfo'){ for (const [o,n] of [[0x01,'Get_ModelNumber'],[0x02,'Get_SerialNumber'],[0x03,'Get_HardwareREV'],[0x04,'Get_FirmwareREV'],[0x05,'Get_DTSAlgorithmREV']]) t=dtsXfer(t,o,n).t; }
    report(t, e.oid||0, 'reply');
    st.tasks.push({t0, t1:t, kind:'can', label:'canReceive: '+e.label});
    snapFw(t);
    return t;
  }

  /* ---- boot (main.c) ---- */
  let t = 0, osT = 0;
  const steadyInit = ()=>{ fpgaRstN=true; cfgDone=-1e9; rxSet(-2, false); txRst=false; st.txH.push({t:-2, rst:false}); Object.assign(R, rdef()); R[0x16]=0x10; R[0x14]=0x10; R[0x09]=1;
    fw.mode='os'; fw.resetHappened=0; const w=world(-1); fw.dashEn = !w.sw1[7]; fw.dipEn = !w.sw1[6];
    const d=sw1Byte(w); fw.groups = readAudioGroups(d); fw.preset = readDtsNlcPreset(d); fw.outMode = readNlcOutputMode(d); fw.target=16;
    if (D.scn==='steady'){ fw.wentInReset = 1; fw.sdiStd=-1; } else { fw.wentInReset = 0; }
    st.egr.push({t:-1, on:true, why:'running'}); };
  if (D.scn==='boot'){
    const w=world(0); cfgDone = w.confT; st.notes.push({t:0, txt:'power applied: EP2C35 starts AS configuration from the EPCS'});
    st.egr.push({t:0, on:false, why:'power-up'}); st.leds.push({t:0, on:0});
    t = C.MAIN0; fw.mode='boot';
    t = WAITop(t, 0.0002, 'wdgEnable(WDT_1000MS); initPorts(); clockInit(); setupCan(); SEI()');
    const tWaitEnd = Math.min(t + 100000*C.FPGA_IT, Math.max(t, cfgDone));
    t = WAITop(t, tWaitEnd - t, `while (!isAlteraReady() && fpgaReadyTime < 100000) WDR();`);
    const ready = t >= cfgDone;
    if (!ready){ const sv=fpgaRstN; Object.assign(R, rdef()); fpgaRstN=false; st.leds.push({t:cfgDone, on: ledsNow(cfgDone)}); st.notes.push({t:cfgDone, txt:'CONF_DONE: FPGA configured but held in reset by PG3 = 0 (initPorts: PORTG = 0x07, DDRG bit 3 output) — spi.v reset values drive the LEDs'}); }
    st.notes.push({t, txt: ready? 'isAlteraReady() = 1: FPGA came out of configuration in time' : 'fpgaReadyTime reached 100000 first: FPGA still configuring, enableAltera() block skipped (FPGA_RESET_N stays low)'});
    if (ready){ t=WAITop(t,0.010,'enableAltera(); waitMillis(10)'); fpgaRstN=true; Object.assign(R, rdef()); ledSnap(t); rxSet(t, true); t=WAITop(t,0.010,'disableAltera(); waitMillis(10)'); t=WAITop(t,0.010,'enableAltera(); waitMillis(10); alteraInitSpi(); initDtsSpi()'); }
    let r=AR(t,0x16,'main'); t=r.t; t=AW(t,0x16,r.v|0x10,'main: GS2970 out of reset'); t=WAITop(t,0.010,'waitMillis(10)');
    r=AR(t,0x14,'main'); t=r.t; t=AW(t,0x14,r.v|0x10,'main: GS2962 out of reset'); t=WAITop(t,0.010,'waitMillis(10)');
    t=AW(t,0x0D,1,'main: loopback'); t=AW(t,0x0D,0,'main: normal');
    t=WAITop(t, waitT(15000), 'cs8416Reset(): 5 × wait(3000)'); t=GW(t,'GS2970',0x009,0x2DE3,'gs2970Init'); t=GW(t,'GS2962',0x000,0x0240,'gs2962Init');
    const w0=world(t); const d=sw1Byte(w0); fw.dashEn = !w0.sw1[7]; fw.dipEn = !w0.sw1[6];
    if (fw.dipEn){ fw.groups=readAudioGroups(d); fw.preset=readDtsNlcPreset(d); fw.outMode=readNlcOutputMode(d); fw.target=16; }
    t=WAITop(t, 0.004, 'setBaseProductInfo("M6205-3G-NLC"); initSettings(); initParams(); initSettings(); initMenus(); initStatusMonitor(); initCli()');
    canMsg(t, 0, 'TRAP 0x11 (ogpSendRestartTrap)', 'restart'); t += 3e-4;
    const dtsReady = w0.dbd && t >= cfgDone;
    t = WAITop(t, dtsReady? 2e-5 : 100000*C.FPGA_IT, `while (!isDtsSpiReady() && dtsReadyTime++ < 100000) — dtsReadyTime is never initialised`);
    if (dtsReady) t = initDtsBoard(t, 'main → initDtsBoard()');
    t = WAITop(t, 1e-4, 'initTaskList(); osRun()');
    fw.mode='os'; osT = t; snapFw(t); st.tasks.push({t0:C.MAIN0, t1:t, kind:'main', label:'main(): boot sequence'});
  } else { steadyInit(); osT = -1.65; snapFw(-1); ledSnap(-1); if (D.scn==='steady'){ /* steady LED state comes from the first pass */ } }

  /* ---- gearOS: osRun() with observed-tick task timers ---- */
  const reqs = D.ev.filter(e=>e.kind==='dash').map(e=>Object.assign({}, e));
  t = osT; let nextApp = 40, nextRep = 1000;            // initTaskTimers: countdown = ticks
  let O0 = Math.floor(t*1000);                          // observed ticks start
  const O = tt => Math.floor(tt*1000) - O0 - fw.lost;
  let guard = 0;
  while (t < END && guard++ < 20000){
    t_now = t;
    const tAppReal = Math.max(t, (O0 + fw.lost + nextApp)/1000 + 5e-5);
    const tRepReal = Math.max(t, (O0 + fw.lost + nextRep)/1000 + 5e-5);
    const rq = reqs.find(e=>!e.done);
    const tReq = rq ? Math.max(t, rq.t) : Infinity;
    const tn = Math.min(tAppReal, tRepReal, tReq);
    if (tn >= END) break;
    st.obs.push([t, O(t)]);
    let t1;
    if (tReq <= tn + 1e-12){ rq.done=true; if (rq.k==='reboot'){ st.notes.push({t:tReq, txt:'REBOOT from DashBoard: the page below restarts at main() — use the Power-up scenario to watch it'}); }
      t1 = canReq(tReq, rq); }
    else if (tAppReal <= tRepReal){ t1 = appPass(tAppReal); nextApp += 40; }
    else { t1 = tRepReal + 3e-4; fw.repTick++; report(tRepReal, OIDS.SDI_STATUS, 'reportStatus (monParams, interval 1)'); report(tRepReal+1.6e-4, OIDS.DTS_STATUS, 'reportStatus (monParams, interval 1)'); st.tasks.push({t0:tRepReal, t1, kind:'rep', label:'reportStatus()'}); nextRep += 1000; }
    const ticks = Math.floor(t1*1000) - Math.floor(tn*1000); if (ticks > 1) fw.lost += ticks - 1;   // updateClock() calls updateTimers() once per osRun pass
    t = t1 + C.OS;
  }
  st.obs.push([t, O(t)]);
  st.end = {fw: JSON.parse(JSON.stringify(fw)), R: Object.assign({}, R)};
  st.R = R; st.cfgDone = cfgDone;
  st.ops.sort((a,b)=>a.t0-b.t0); st.tasks.sort((a,b)=>a.t0-b.t0); st.can.sort((a,b)=>a.t0-b.t0);
  return st;
}
/* ---- lookups ---- */
function bs(arr, t, key){ let lo=0, hi=arr.length-1, r=-1; key=key||'t0'; while (lo<=hi){ const m=(lo+hi)>>1; if (arr[m][key]<=t){ r=m; lo=m+1; } else hi=m-1; } return r; }
function fwAt(t){ const s=sched().fw; let r=s[0]; for (const x of s){ if (x.t<=t) r=x; else break; } return r? r.f : null; }
function ledsAt(t){ const L=sched().leds; let v=0; for (const x of L){ if (x.t<=t) v=x.on; else break; } return v; }
function egrAt(t){ const E=sched().egr; let v={on:true,why:''}; for (const x of E){ if (x.t<=t) v=x; else break; } return v; }
function taskAt(t){ const T=sched().tasks; const i=bs(T,t); if (i<0) return null; for (let k=i;k>=Math.max(0,i-6);k--){ const x=T[k]; if (t>=x.t0 && t<x.t1) return x; } return null; }
function opAt(t){ const s=sched().ops; const i=bs(s,t); if (i<0) return null; const x=s[i]; return t<x.t1? x : null; }
function rxLockedAt(t){ const s=sched(); let rst=true, since=-1e9; for (const x of s.rxH){ if (x.t>t) break; if (rst && !x.rst) since=x.t; rst=x.rst; }
  if (rst || !sdiOn(t)) return false; return t >= Math.max(since, lastChange(['sdi','fmt'], t)) + C.T_LOCK; }
function txOnAt(t){ const s=sched(); let rst=true; for (const x of s.txH){ if (x.t>t) break; rst=x.rst; } return !rst; }
function lockAt(t){ const L=sched().lockH; let v=null; for (const x of L){ if (x.t<=t) v=x.std; else break; } return v; }

/* =====================================================================
   AUDIO PATH MODEL — sources, NLC daughter card, output router, AES outputs
   ===================================================================== */
const SRCLV = { aux:-20, tone:-20, ext:-18 };       // simulation choices for the test source (not from the archive)
const toneF = ch => 200*(ch+1);
let GCACHE = {key:'', tr:null};
function gainTrack(){ const s=sched(); const key=SKEY+'|g'; if (GCACHE.key===key) return GCACHE.tr;
  const f=s.end.fw; const tr = nlcGainTrack(world(0), -0.2, SCN[D.scn].pages.length+0.05, f); GCACHE={key, tr}; return tr; }
function gainAt(t){ const tr=gainTrack(); if (!tr.length) return {S:-99,Ss:-99,g:0}; const i=clamp(Math.round((t-tr[0][0])/0.0005),0,tr.length-1); const r=tr[i]; return {S:r[1], Ss:r[2], g:r[3]}; }
function embLevel(ch, t){ const w=world(t); if (!rxLockedAt(t)) return null; const g=ch>>2; if (!((w.groups>>g)&1)) return null; if (w.content[g]!=='P') return null;
  if (ch<6) return PROG[w.prog].at(t) + (ch===3? -10 : ch>=4? -3 : 0); if (ch<8) return SRCLV.aux; return SRCLV.tone; }
function srcLevel(dec, t){ const w=world(t);
  if (dec.k==='emb') return embLevel(dec.ch, t);
  if (dec.k==='ext'||dec.k==='src') return w.aes[dec.ch>>1] ? SRCLV.ext : null;
  if (dec.k==='dts') return dtsOut(dec.ch, t);
  return null; }
function dbinDecode(code){ if (code<0x10) return {k:'emb', ch:code}; if (code<0x14) return {k:'ext', ch:code-0x10}; if (code>=0x28 && code<0x2C) return {k:'src', ch:code-0x28}; return {k:'none'}; }
function dtsOut(k, t){ const w=world(t), f=fwAt(t); if (!w.dbd || !f) return null; if (!(t>=sched().cfgDone)) return null;
  const inL = srcLevel(dbinDecode(f.dbin[k]), t); if (inL===null) return null;
  if (k>=6) return inL;                                                    // Lt/Rt: NLC 5.1 leaves the aux pair as is — inferred
  return f.outMode? inL : inL + gainAt(t).g; }
function outSrc(n, t){ const f=fwAt(t); if (!f) return {code:0, dec:{k:'none'}}; const code=f.mux[n]; return {code, dec: fpgaDecode(code, world(t).fpgaLoad)}; }
function outLevel(n, t){ return srcLevel(outSrc(n,t).dec, t); }
function chFreqOf(dec){ if (dec.k==='emb') return dec.ch<6? 997*(1+dec.ch*0.25) : toneF(dec.ch); if (dec.k==='ext'||dec.k==='src') return 997; if (dec.k==='dts') return 997*(1+dec.ch*0.25); return 0; }
function srcName(code){ return ROUTE[code] || ('0x'+hx(code)); }

/* =====================================================================
   ACTIONS — every action logs the firmware path it takes
   ===================================================================== */
function act(name, fn){
  const tr=[]; fn(s=>tr.push(s));
  D.log.unshift({t:absT(), name, trace:tr}); if (D.log.length>40) D.log.length=40;
  SIM.refresh();
}
function nextTask(te, kind){ const T=sched().tasks; return T.find(x=>x.t0>=te && (!kind || x.kind===kind)); }
function T3(t){ return (t*1000).toFixed(1)+' ms'; }
function consequence(tr, te){
  const s=sched(); const p=nextTask(te,'app'); if (!p) return;
  tr(`next appTask() pass starts at ${T3(p.t0)} and runs ${((p.t1-p.t0)*1000).toFixed(2)} ms`);
  const rst = s.tasks.find(x=>x.kind==='reset' && x.t0>=te); if (rst && rst.t0 < te+1.5) tr(`resetAndInit() at ${T3(rst.t0)} → ${T3(rst.t1)} (${rst.why})`);
  const c = s.can.filter(x=>x.t0>=te && x.k===0 && !x.rx).slice(0,4); c.forEach(x=>tr(`CAN ${x.kind} OID 0x${hx(x.oid,4)} ${OIDNAME[x.oid]||''} at ${T3(x.t0)} — ${x.note}`));
}
const A = {
  sdi(){ const on=!sdiOn(absT()); act(on?'Plug SDI into T6301A-3G BNC 1 (SDI IN)':'Unplug SDI IN', tr=>{ addEv({kind:'w', k:'sdi', v:on});
      tr(`J10 BNC1_SIG → GS2974A cable equaliser (U10) → GS2970 deserializer (U9): ${on? 'carrier detect, rate search, LOCKED after ≈20 ms '+inf : 'LOCKED drops at once'}`);
      tr(on? 'appTask → gs2970ReadVidInfo(): gs2970Read(0x22) RASTER_STRUC_4 bit 12 = locked, bits 15:14 = rate (0 HD, 2 3G, else SD)' : 'gs2970ReadVidInfo(): bit 12 clear → info->standard = LOCK_NONE; resetIfNewLock(): wentInReset = NO');
      if (on) tr('resetIfNewLock(): first locked pass sets goInReset = 1; the pass after calls resetAndInit() unless resetHappened is still set');
      consequence(tr, absT()); }); },
  fmt(k){ act(`Source format → ${VF[k].name}`, tr=>{ addEv({kind:'w', k:'fmt', v:k}); const f=VF[k];
      tr(`GS2970 re-locks (≈20 ms ${inf}); RASTER_STRUC_4 rate field → ${STD[f.std]}; DATA_FORMAT_DS1 (0x006) bits 13:8 = 0x${hx(f.fmt)}`);
      if (f.std===4) tr('Level B: rate = 3G and DS1 == DS2 == 0x..66 → LOCK_3GB; DashBoard shows "3GB Not Supported" (red), but the 3G LED is lit');
      tr(`sdiFormatSelector(): alteraWrite(0x04, 0x${hx(f.r4)} | groups) · set50Flag(): 0x10 = 0x${hx(((f.fmt===0x2D||f.fmt===0x0C||f.fmt===0x04)?8:0)|(f.std>=3?0x10:0))} · set1001Flag(): MODE[4] = ${f.m?0:1}`);
      tr('A brief unlock seen by a pass clears wentInReset → the next locked pass schedules resetAndInit()'); consequence(tr, absT()); }); },
  group(g){ const w=world(absT()); const v=w.groups ^ (1<<g); act(`Source: audio group ${g+1} ${(v>>g)&1?'present':'removed'}`, tr=>{ addEv({kind:'w', k:'groups', v});
      tr(`HANC packets for group ${g+1} (DIDs ${['0x2E7','0x1E6','0x1E5','0x2E4'][g]} HD/3G, ${['0x2FF','0x1FD','0x1FB','0x2F9'][g]} SD) ${(v>>g)&1?'appear':'disappear'}`);
      tr('appTask → getEmbeddedAudioInfo(): gs2970ReadHDAudioDetect() = (gs2970Read(0x202) >> 1) & 0x0F → updateLeds() → setAudioLed(group) → writeLedReg(): alteraWrite(0x0F)');
      tr('setEmbFormat(audioStat 0x30–0x33, alteraRead(0x05)) → reportParamValue(OID 0x0D00 "Embedded Audio")'); consequence(tr, absT()); }); },
  content(g){ const w=world(absT()); const c={P:'E',E:'D',D:'P'}[w.content[g]]; act(`Source: group ${g+1} carries ${c==='P'?'PCM':c==='E'?'Dolby E':'AC-3'}`, tr=>{ addEv({kind:'w', k:'content.'+g, v:c});
      tr('FPGA non_audio_detector2 sets bit 3 of the pair nibble in audioFormat (0x30–0x33); 9 = AC-3 "DD", 10 = Dolby E "EE" (sigstat.c getAudioStatusString)');
      tr('The NLC still receives whatever dboardIn selects; a Dolby E pair fed to loudness control is noise to it'); }); },
  aes(i){ const on=!world(absT()).aes[i]; act(`${on?'Plug':'Unplug'} AES IN ${i+1} (T6301A-3G BNC ${7+i})`, tr=>{ addEv({kind:'w', k:'aes.'+i, v:on});
      tr(`CS8416 #${i+1} (U${i?6:5}) ${on?'locks':'loses lock'}; register 0x0C bit 4 (UNLOCK) ${on?'clears':'sets'}`);
      tr(`appTask → getExtPairLock(): cs8416Read(${i+1}, 0x0C) over PD2/PD3/PD4 with CS on PG${i?0:1} → extAudPair bit ${i} → setAesLed(${i}) → AES ${i+1} LED`);
      tr(`The pair also reaches the router directly (codes 0x${hx(0x10+2*i)}/0x${hx(0x11+2*i)}) and through the AD1895 SRC U${i?30:28} (0x${hx(0x14+2*i)}/0x${hx(0x15+2*i)})`); consequence(tr, absT()); }); },
  dbd(){ const on=!world(absT()).dbd; act(`${on?'Fit':'Remove'} the DTS daughter card (J4)`, tr=>{ addEv({kind:'w', k:'dbd', v:on});
      tr(on? 'J4 72-pin SIMM: DaySequerra AudioXpress card with DTS NLC 5.1. It answers Master_Transfer() with "/" …' : 'Nothing answers on PB0/PB1/PB2 → every Master_Transfer() reads 1024 bytes looking for "/" and returns FALSE (≈120 ms each)');
      tr('appTask → setDtsStatus(alteraRead(0x20)): bit 0 → status BIT4 "OK" or BIT0 "Error" → reportParamValue(OID 0x0F00)'); consequence(tr, absT()); }); },
  sw1(i){ const w=world(absT()); const on=!w.sw1[i]; act(`SW1 DIP-${i+1} ${on?'ON':'OFF'}`, tr=>{ addEv({kind:'w', k:'sw1.'+i, v:on});
      const f=fwAt(absT());
      tr(`PINA bit ${i} ${on?'pulled low':'pulled high'}; readSW1() = ~PINA = 0x${hx(sw1Byte(world(absT()+1e-6)))}`);
      if (i>=6) tr(`DIP-${i+1} is read only by initSettings() at boot (${i===7?'dashboardEnabled':'dipsEnabled'}): nothing changes until the card restarts`);
      else if (!f || !f.dipEn || f.dashEn) tr(`updateSettings() reads the DIPs only when dipsEnabled && !dashboardEnabled (DIP-7 OFF and DIP-8 ON at boot). Now: dipsEnabled=${f&&f.dipEn?1:0}, dashboardEnabled=${f&&f.dashEn?1:0} → ignored`);
      else { if (i<2) tr('readAudioGroups(): DIP-1 = BIT0 (+2), DIP-2 = BIT1 (+1) → audioGroups → alteraWrite(0x22) and 0x04 high nibble next pass');
        if (i===2||i===3) tr('readDtsNlcPreset(): BIT3 +1, BIT2 +2 (DIP-4/DIP-3) — the sheet says DIP-4/DIP-5. setDtsNlcPreset() returns at once (dashboardEnabled is FALSE), so the preset never changes and reportParamValue(OID 0x0F32) repeats on every pass');
        if (i===4) tr('readNlcOutputMode(): BIT4 = DIP-5 (the sheet says DIP-3). setNlcOutputMode() is ignored the same way → OID 0x0F30 reported every pass'); }
      consequence(tr, absT()); }); },
  sw2(i){ const on=!world(absT()).sw2[i]; act(`SW2 DIP-${9+i} ${on?'ON':'OFF'}`, tr=>{ addEv({kind:'w', k:'sw2.'+i, v:on});
      tr(`readSW2() = (~PINC) & 0xF0 = 0x${hx(sw2Byte(world(absT()+1e-6)))}. NLC_Dipswitch.xls (2011|44-05-19) gives DIP-9…12 as Target Level ${xlsTarget(world(absT()+1e-6))} dB, but this build never reads dipSwitch2 for NLC: initSettings() sets nlcTargetLevel = 16 (−24) instead`); }); },
  prog(k){ act(`Source programme: ${PROG[k].label}`, tr=>{ addEv({kind:'w', k:'prog', v:k}); tr(`The NLC sees the change on its 5.1 input (dboardIn 0x60–0x65) and moves its gain with the preset's Attack/Rise and Release/Fall ${inf}`); }); },
  dash(k, v, label, oid, i){ act(`DashBoard: ${label}`, tr=>{ addEv({kind:'dash', k, v, i, label, oid});
      const f=fwAt(absT());
      tr(`DashBoard → frame controller → CAN SET_PARAM 0x4A to the card (OID 0x${hx(oid||0,4)}) → can_rx ISR queues it; gearOS runs canReceive() only between tasks (non-pre-emptive)`);
      if (f && !f.dashEn && k!=='dtsinfo'){ tr('settings.c set…(): if (dashboardEnabled) … else nothing — DIP-8 was ON at boot'); return; }
      if (k==='preset') tr(`setDtsNlcPreset(${v}): Set_NLC_Preset(0x05, ${v}) → Set_NLC_TargetLevel(0x05, ${v}, nlcTargetLevel) → updateNlcPresetParams() → sendMenuChangeTrap(1,4/6,…) → Get_NLC_Preset(): three ≈60 ms Master_Transfer() calls inside canReceive`);
      if (k==='target') tr(`setNlcTargetLevel(${v}): Set_NLC_TargetLevel(0x05, preset, ${v}) sends byte ${v}−40 = ${v-40} (0x${hx((v-40)&0xFF)} FF FF FF), then Get_NLC_TargetLevel() for a cprintf`);
      if (k==='outmode') tr(`setNlcOutputMode(${v}): Set_NLC_OutMode(0x05, ${v}) (opcode 0x4F) then Get_NLC_OutMode (0x50)`);
      if (k==='groups') tr(`setAudioGroups(${v}) → next pass alteraWrite(0x22, ${v}) and sdiFormatSelector() 0x04 high nibble 0x${hx([0x10,0x30,0x70,0xF0][v])}`);
      if (k==='mux') tr(`muxAes${(i>>1)+1}[${i&1}] = 0x${hx(v)} "${srcName(v)}" → next pass updateMuxAudio(): alteraWrite(0x${hx(0x50+i)}, 0x${hx(v)}) → par_sel_2of40 picks the source for output channel ${i+1}`);
      if (k==='routeDef') tr(`updateMuxAudioRouting(${v}): ${v?'defaults 0x18–0x1D (DTS L…Rs), 0x06/0x07 (DTS_NLC: AES4 passes embedded pair 4), 0x08–0x0F':'user table'}`);
      if (k==='dbin') tr(`dboardIn${(i>>1)+1}[${i&1}] = 0x${hx(v)} → updateDboardInputs(): alteraWrite(0x${hx(0x60+i)}) → egress_dts_multimerge par_sel_16of40 → MSB-aligned serial to J4 (DOLBY_EAD/PLE/PLS/PGP)`);
      if (k==='dtsinfo') tr('DTS Info menu: each of the five getDts…() functions calls Get_…() → Master_Transfer() while DashBoard waits (≈60 ms each)');
      consequence(tr, absT()); }); },
};

/* =====================================================================
   DRAWINGS
   ===================================================================== */
const PX = (x,y)=>[(x-0.95)*120, (4.03-y)*120];        // gerber inches → card artwork pixels
const PARTS = [
  // ref, x, y (artwork px), w, h, name, what it does
  ['U3', 942,184, 75,75, 'AT90CAN128-16AU', 'The card controller (8 MHz). Runs main() and gearOS: canReceive, appTask every 40 ticks, reportStatus every 1000 ticks. Talks to the FPGA on PE5/PE6/PE7/PD0 (nets FPGA_LED_CLK/DATA/ST and FPGA_LED_1 — names left over from the LED shift register of the original M6205).'],
  ['U17',1205,152,100,100,'EP2C35F484C6', 'Cyclone II FPGA (AES_Test project): SDI audio de-embed, 16×40 router (par_sel_16of40), daughter-card serial out, XAPP1014 hd_audio_mux embedder, AES encoders, the register file in spi.v and the gated SPI path to the Gennum parts.'],
  ['U9', 1363,62, 45,45, 'GS2970', '3G/HD/SD deserializer. gs2970ReadVidInfo() reads RASTER_STRUC_4 (0x22), DATA_FORMAT_DS1/DS2 (0x06/0x07), word and line counts. Its SPI goes through the FPGA (gennum1 bit 0).'],
  ['U10',1438,65, 20,20, 'GS2974A', 'Cable equaliser in front of the GS2970 (schematic part list).'],
  ['U11',1388,283, 45,45, 'GS2962', '3G/HD/SD serializer for both SDI outputs. gs2962Set3GLevel() writes IOPROC (0x00) and the SMPTE 352M payload words (0x0A–0x0D) on every pass.'],
  ['U5', 982,94, 28,40, 'CS8416 #1', 'AES IN 1 receiver. cs8416Read(1, 0x0C) bit 4 = unlock → AES 1 LED.'],
  ['U6', 917,93, 28,40, 'CS8416 #2', 'AES IN 2 receiver (MISO comes back through the FPGA on PC0).'],
  ['U28',990,43, 40,33, 'AD1895', 'Sample-rate converter for AES IN 1 ("SRC ON" router choices).'],
  ['U30',925,43, 40,33, 'AD1895', 'Sample-rate converter for AES IN 2.'],
  ['U19',1301,266, 26,28, 'PLL1705', 'Audio clock PLL (PLL1705_AUDIO_CLK).'],
  ['U20',1068,148, 26,20, 'ICS662', 'Audio clock from video: ICS662_SEL3 = MODE[4] (detSel1), written by set1001Flag() — 0 for 1/1.001 rates.'],
  ['U16',1080,96, 44,44, 'EPCS', 'FPGA configuration flash. Also reprogrammed by the AVR through as.c (asBulkErase/asProg) when DashBoard uploads an FPGA file.'],
  ['U7', 764,177, 100,100,'ADSP-21262 (footprint)', 'SHARC DSP footprint (DSP_DAI_P1…20 nets). The ISS5 photo shows it fitted; the 3G firmware only drives DSP_RESET (PB3) — and spi_write() in dtsserial.c clears PB3 on every DTS byte.'],
  ['U4', 1406,331, 26,20, 'SN65HVD233', 'CAN transceiver to the frame (1 Mbit/s).'],
  ['U13',245,248, 92,46, 'PTH12050W', 'Point-of-load power module from the frame +12 V.'],
  ['J4', 672,325, 455,14, 'J4 72-pin SIMM', 'Daughter-card socket. Nets DOLBY_* from the Dolby decoder era: EAFS/EABC/EAD/PLE/PLS/PGP carry 4 MSB-aligned stereo streams to the card; DADA–DADD bring 8 channels back; MSFS/MSBC/MSD (PB0/PB1/PB2) carry the DTS control serial.'],
  ['SW1',761,49, 86,46, 'SW1 (DIP-1…8)', 'PA0…PA7. NLC: DIP-1/2 groups, DIP-3/4 preset (firmware), DIP-5 output mode (firmware), DIP-7 init from EEPROM, DIP-8 DashBoard control off.'],
  ['SW2',862,49, 38,46, 'SW2 (DIP-9…12)', 'PC4…PC7, read by readSW2(). Not used by the NLC build.'],
  ['J10',1529,170, 18,232, 'J10 rear connector', 'BNC1…BNC10 to the T6301A-3G rear module.'],
];
function cardSVG(t, opts){
  opts=opts||{}; const L=ledsAt(t), w=world(t), f=fwAt(t)||{};
  const pw = t>=0 || D.scn!=='boot';
  let s=`<svg viewBox="0 0 1542 370" role="img" aria-label="M6205 ISS6 card, top side, from the JRTI gerbers" style="width:100%;display:block;border-radius:6px">
   <defs><filter id="m3Glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect width="1542" height="370" fill="var(--panel2)"/>
   <path d="M4 4 H1452 L1470 22 V52 H1530 V320 H1490 V362 H120 L4 248 Z" fill="#17402a" stroke="#2b5a3e"/>
   <image href="${ASSET}m6205-3g-card-copper.png" width="1542" height="370" opacity=".5"/>
   <image href="${ASSET}m6205-3g-card-silk.png" width="1542" height="370" opacity=".95"/>`;
  // LEDs (DS1…DS11 driven by the FPGA, DS12 = power)
  LEDDS.forEach((ds,i)=>{ const y=LEDXY[ds], on=(L>>i)&1; s+=`<rect x="49" y="${y-4}" width="15" height="8" rx="2" fill="${on?LEDCOL[i]:'#2b2f2c'}" ${on?'filter="url(#m3Glow)"':''}><title>${ds} ${LEDN[i]} — leds.c bit ${i} (${i<8?'0x0F':'0x0E'} bit ${i%8}), ${on?'ON':'off'}</title></rect>`; });
  s+=`<rect x="49" y="${LEDXY.DS12-4}" width="15" height="8" rx="2" fill="${pw?'#7dff6a':'#2b2f2c'}" ${pw?'filter="url(#m3Glow)"':''}><title>DS12 POWER</title></rect>`;
  // daughter card over J4 (plain drawing; position from the 2011 photo)
  if (w.dbd) s+=`<g class="m3-hot" data-k="dbd" style="cursor:pointer"><rect x="447" y="48" width="540" height="226" rx="4" fill="#1f5a36" stroke="#9ccfaa" stroke-width="1.5" opacity=".93"/>
     <rect x="520" y="110" width="110" height="110" fill="#222" stroke="#555"/><rect x="760" y="110" width="90" height="90" fill="#2a2a2a" stroke="#555"/>
     <text x="717" y="78" text-anchor="middle" font-size="17" fill="#e8f2ea" font-weight="700">DaySequerra AudioXpress daughter card</text>
     <text x="717" y="98" text-anchor="middle" font-size="13" fill="#cfe3d5">DTS NLC 5.1 · in J4 (72-pin SIMM) · click to remove</text>
     <text x="575" y="168" text-anchor="middle" font-size="11" fill="#bbb">DSP</text><text x="805" y="158" text-anchor="middle" font-size="11" fill="#bbb">FPGA</text></g>`;
  else s+=`<g class="m3-hot" data-k="dbd" style="cursor:pointer"><rect x="447" y="280" width="450" height="40" fill="transparent" stroke="#ffd36a" stroke-dasharray="6 4"/><text x="672" y="304" text-anchor="middle" font-size="13" fill="#ffd36a">J4 empty — click to fit the DTS daughter card</text></g>`;
  // DIP switches: SW1 (8) and SW2 (4); DIP-1 at the left — inferred
  const dip=(cx,cy,n,arr,k,base)=>{ let g=''; const pitch=12, x0=cx-(n-1)*pitch/2; for (let i=0;i<n;i++){ const x=x0+i*pitch, on=arr[i];
      g+=`<g class="m3-dip" data-k="${k}" data-i="${i}" style="cursor:pointer"><rect x="${x-5}" y="${cy-15}" width="10" height="30" rx="1.5" fill="#c43b3b" stroke="#6a1d1d"/><rect x="${x-3.5}" y="${on?cy-13:cy+1}" width="7" height="12" fill="#f2f2f2"/><rect x="${x-6.5}" y="${cy-20}" width="13" height="42" fill="transparent"><title>DIP-${base+i} ${on?'ON':'OFF'} — click to flip</title></rect></g>`; }
    return g; };
  s+=dip(761,49,8,w.sw1,'sw1',1)+dip(862,49,4,w.sw2,'sw2',9);
  s+=`<text x="712" y="82" font-size="10" fill="#ffd36a">ON ↑ ${'(inferred)'}</text><text x="713" y="18" font-size="10" fill="#ffd36a">1</text><text x="803" y="18" font-size="10" fill="#ffd36a">8</text><text x="839" y="18" font-size="10" fill="#ffd36a">9</text><text x="881" y="18" font-size="10" fill="#ffd36a">12</text>`;
  if (opts.labels!==false){
    const lab=(x,y,txt)=>`<text x="${x}" y="${y}" font-size="13" font-weight="700" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke" text-anchor="middle">${txt}</text>`;
    PARTS.forEach(p=>{ if (p[0]==='J4'||p[0].startsWith('SW')||p[0]==='J10') return; if (p[0]==='U7' && w.dbd) return; if ((p[0]==='U5'||p[0]==='U6'||p[0]==='U28'||p[0]==='U30') && false) return;
      s+=`<g class="m3-part" data-p="${p[0]}" style="cursor:pointer"><rect x="${p[1]-p[3]/2}" y="${p[2]-p[4]/2}" width="${p[3]}" height="${p[4]}" fill="transparent" stroke="${D.ui.part===p[0]?'#ffd36a':'transparent'}" stroke-width="2"/>${lab(p[1], p[2]+(p[4]>60?4:-p[4]/2-4), p[5].split(' ')[0])}<title>${p[0]} ${p[5]}</title></g>`; });
  }
  // activity marks
  const lock = rxLockedAt(t), tx = txOnAt(t), egr=egrAt(t).on;
  s+=`<circle cx="1500" cy="60" r="7" fill="${lock?'#5aa9e6':'#444'}"><title>SDI IN ${lock?'locked':'not locked'}</title></circle><text x="1490" y="44" font-size="11" fill="#cfe" text-anchor="end">SDI IN</text>
      <circle cx="1500" cy="290" r="7" fill="${tx?(egr?'#4cc38a':'#e3a35a'):'#444'}"><title>SDI OUT: ${tx?(egr?'video + embedded audio':'video, embedder held in reset (update_done = 0)'):'GS2962 in reset'}</title></circle><text x="1490" y="312" font-size="11" fill="#cfe" text-anchor="end">SDI OUT</text>`;
  const tk=taskAt(t); if (tk) s+=`<text x="942" y="236" font-size="12" text-anchor="middle" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">${tk.label}</text>`;
  if (D.scn==='boot' && t < sched().cfgDone) s+=`<text x="1205" y="215" font-size="13" text-anchor="middle" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke">configuring from EPCS…</text>`;
  s+='</svg>'; return s;
}
/* ---- Artwork 2026|59: card edge = M6205-card-edge-v10.cdr (no 3G-specific edge drawing exists), rear = M6205-3G rear module.cdr.
   LEDs and BNC hot spots sit on the lens / BNC centres read from the converted SVGs. */
const ART_DIR='#OPENGEAR #SERIES/M6205 - #Master #OPENGEAR/M6205 - #Engineering/';
const EDGE_ART={href:ASSET+'m6205-edge.svg', vb:[58,168,204,418], x:243.8, src:()=>SIM.src(ART_DIR+'M6205-card-edge-v10.cdr','M6205-card-edge-v10.cdr')+' (2008-10-30)'};
const EDGE_Y=[217.4,189.2,248.3,295.3,319.2,343.4,367.2,401.4,425.1,468.3,492];   // LEDN order (HD, SD, …); 3G has no lens on the drawing
const REAR_ART={href:ASSET+'m6205-3g-rear-t6301a.svg', vb:[272,388,276,228], cols:[382.92,426.72], ys:[427.03,467.61,508.18,548.76,589.35], r:11.2,
  src:()=>SIM.src(ART_DIR+'M6205-3G rear module.cdr','M6205-3G rear module.cdr')+' (2011-04-27)'};
[EDGE_ART.href, REAR_ART.href].forEach(u=>{ const im=new Image(); im.src=u; });   // warm the image cache: the panels are redrawn every tick
function edgeSVG(t){
  const L=ledsAt(t), E=EDGE_ART, v=E.vb;
  let s=`<svg viewBox="${v.join(' ')}" style="width:100%;max-width:200px;display:block;border-radius:6px" role="img" aria-label="M6205A-3G card edge (M6205-card-edge-v10.cdr)">
    <defs><filter id="m3Glow2" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <image href="${E.href}" x="${v[0]}" y="${v[1]}" width="${v[2]}" height="${v[3]}"/>`;
  LEDN.forEach((n,i)=>{ const on=(L>>i)&1, y=EDGE_Y[i];
    if (i===10) s+=`<rect x="240" y="${y-5}" width="8" height="10" rx="1.5" fill="#d8d8d0" stroke="#777" stroke-dasharray="1.5 1"/><path d="M200 ${y} h36" stroke="#333" stroke-width=".8"/><text x="196" y="${y+3.5}" font-size="10" text-anchor="end" fill="#555" font-style="italic">3G LED (not drawn)</text>`;
    s+=`<circle cx="${E.x}" cy="${y}" r="4.2" fill="${on?LEDCOL[i]:'#2c332c'}" fill-opacity="${on?1:.55}" ${on?'filter="url(#m3Glow2)"':''}><title>${n}${on?' — on':' — off'}${i===10?' (position inferred: the v10 drawing has no 3G LED)':''}</title></circle>`; });
  return s+`<text transform="translate(238.5 554.5) rotate(-90)" text-anchor="middle" font-size="8" font-weight="700" fill="#111">M6205A-3G</text></svg><div class="small muted" style="margin-top:2px">Card edge: ${E.src()}; 3G LED placed below META DATA <span class="tag-inf" title="Inferred: the manual's LED table lists a 3G LED; no 3G card-edge drawing exists">inferred</span></div>`;
}
/* T6301A-3G rear module: M6205-3G rear module.cdr (positions, labels) and manual Fig. 2 */
const RBNC = [ // [label, kind]
  ['SDI IN','sdiin'],['NOT USED','nc'],['AES OUT 1','aes0'],['AES OUT 2','aes1'],['AES OUT 3','aes2'],['AES OUT 4','aes3'],['AES IN 1','ain0'],['AES IN 2','ain1'],['SDI OUT1','sdo'],['SDI OUT2','sdo'] ];
function rearSVG(t){
  const w=world(t), R=REAR_ART, v=R.vb, r=R.r;
  let s=`<svg viewBox="${v.join(' ')}" role="img" aria-label="T6301A-3G rear module (archive drawing)" style="width:100%;max-width:300px;display:block;border-radius:6px">
    <image href="${R.href}" x="${v[0]}" y="${v[1]}" width="${v[2]}" height="${v[3]}"/>`;
  RBNC.forEach(([lab,k],i)=>{ const cx=R.cols[i%2], cy=R.ys[i>>1]; let fill='transparent', live=false, title=lab;
    if (k==='sdiin'){ live=sdiOn(t); fill=live?'#2b5f9e':'transparent'; title+=live?' — cable plugged (click to unplug)':' — click to plug a 3G/HD/SD source'; }
    if (k.startsWith('ain')){ live=w.aes[+k[3]]; fill=live?'#2b5f9e':'transparent'; title+=live?' — AES source plugged':' — click to plug an AES source'; }
    if (k.startsWith('aes')){ const lv=outLevel(+k[3]*2,t); live=true; fill = lv!==null? 'rgba(76,195,138,.55)':'rgba(140,140,140,.35)'; title+=` — pair ${+k[3]+1} of the output router (click to scope)`; }
    if (k==='sdo'){ live=txOnAt(t); fill= live? 'rgba(90,169,230,.5)':'transparent'; }
    s+=`<g class="m3-bnc" data-k="${k}" style="cursor:pointer">${(k==='sdiin'||k.startsWith('ain'))&&live?`<rect x="${cx-r*.25}" y="${cy}" width="${r*.5}" height="${r*1.6}" fill="#2b5f9e" opacity=".9"/>`:''}<circle cx="${cx}" cy="${cy}" r="${r*.9}" fill="${fill}"/>
      ${k.startsWith('aes')&&D.ui.scopeOut===+k[3]?`<circle cx="${cx}" cy="${cy}" r="${r*1.02}" fill="none" stroke="#e0a800" stroke-width="${r*.12}"/>`:''}<circle cx="${cx}" cy="${cy}" r="${r*1.1}" fill="transparent"><title>${i+1} ${title}</title></circle></g>`; });
  return s+`</svg><div class="small muted" style="margin-top:2px">T6301A-3G: ${R.src()}</div>`;
}
function rearLegend(){ return `<table class="kv small">${RBNC.map((r,i)=>`<tr><td>${i+1}</td><td>${r[0]}</td><td class="muted">J10 BNC${i+1}_SIG</td></tr>`).join('')}</table>`; }

/* DashBoard-style parameter window — a generic editor, not Ross's design */
const DASH_CSS = `<style>.m3d{border:1px solid var(--line);border-radius:8px;overflow:hidden;font-size:12.5px}.m3d .hd{display:flex;gap:4px;background:var(--chip);padding:5px}.m3d .hd button{font-size:12px;padding:3px 8px}
.m3d .bd{padding:8px 10px;max-height:460px;overflow:auto}.m3d .row{display:grid;grid-template-columns:44% 56%;gap:6px;align-items:center;border-bottom:1px dashed var(--grid);padding:3px 0}
.m3d .dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:middle}.m3d select,.m3d input{font-size:12px;padding:2px 4px;max-width:100%}.m3d .sec{font-weight:700;margin:8px 0 3px;color:var(--accent2)}</style>`;
function embString(f){ let s=''; for (let g=0;g<4;g++){ if (g) s+='  '; for (let p=0;p<2;p++){ const n=(f.embFmt>>>(4*(2*g+p)))&0x0F; s += ((f.embGrp>>g)&1) ? (n&8 ? (n===9?'DD':n===10?'EE':'CC') : 'PP') : '--'; } } return s; }
function dashHTML(t){
  const f=fwAt(t), w=world(t), tab=D.ui.dashTab;
  if (!f || f.mode!=='os'){ return DASH_CSS+`<div class="m3d"><div class="bd muted">Card not answering yet (main() is still running; canReceive starts with osRun()).</div></div>`; }
  const row=(k,v)=>`<div class="row"><div>${k}</div><div>${v}</div></div>`;
  const dot=c=>`<span class="dot" style="background:${c}"></span>`;
  let h = DASH_CSS + `<div class="m3d"><div class="hd">${[['status','Status'],['routing','Audio Routing'],['nlc','NLC Settings'],['preset','NLC Preset'],['dts','DTS Info']].map(([k,l])=>`<button class="m3-dt ${tab===k?'on':''}" data-t="${k}">${l}</button>`).join('')}</div><div class="bd">`;
  const dis = !f.dashEn;
  if (tab==='status'){
    h+=`<div class="sec">Card Info</div>`+row('Product','M6205-3G-NLC')+row('Name','SD/HD/3G SDI Embedded Audio Processor w/ DTS NLC')+row('Supplier','Ward-Beck Systems')+row('Software Rev','1.00')+row('Website','www.ward-beck.com');
    h+=`<div class="sec">Card Status</div>`+row('SDI', dot(f.sdiStd===0||f.sdiStd===4?'var(--bad)':'var(--accent)')+(STD_TXT[f.sdiStd]||'—'))+row('SDI Format', f.sdiFmt||'—')
      +row('Embedded Audio', `<span class="mono">${embString(f)}</span>`)+row('External Audio', `<span class="mono">${(f.extPair&1?'PP':'--')+(f.extPair&2?'PP':'--')}</span>`)
      +row('DTS Function', dot(f.dtsStatus===0x10?'var(--accent)':'var(--bad)')+(f.dtsStatus===0x10?'OK':'Error'));
    h+=`<p class="small muted">Embedded Audio uses FPGA register 0x05 (the HD group detector) for presence, so an SD input shows "--" here even while its AUDIO LEDs are lit.</p>`;
  } else if (tab==='routing'){
    h+= dis? `<p class="small" style="color:var(--warn)">DashBoard control disabled (DIP-8 ON at boot): the hidable "Audio Routing" menu shows the read-only variant.</p>` : '';
    h+=row('Audio Groups Enabled', `<select class="m3-ds" data-k="groups" data-o="${OIDS.GROUPS}" ${dis?'disabled':''}>${[0,1,2,3].map(v=>`<option value="${v}" ${f.groups===v?'selected':''}>${v+1}</option>`).join('')}</select>`);
    h+=row('SDI Embedded Audio', `<button class="m3-db" data-k="routeDef" data-v="${f.routeDef?0:1}" ${dis?'disabled':''}>${f.routeDef?'Go to Custom Settings':'Go to Default Settings'}</button>`);
    for (let n=0;n<8;n++){ h+=row(`Group${(n>>1)+1}, AES${n+1}`, [0,1].map(sd=>{ const i=2*n+sd; return `<select class="m3-ds" data-k="mux" data-i="${i}" data-o="${OIDS.MUX1+n}" ${dis||f.routeDef?'disabled':''} title="${sd?'Right':'Left'}">${Object.keys(ROUTE).map(Number).sort((a,b)=>a-b).map(c=>`<option value="${c}" ${f.mux[i]===c?'selected':''}>${ROUTE[c]}</option>`).join('')}</select>`; }).join(' ')); }
  } else if (tab==='nlc'){
    h+= dis? `<p class="small" style="color:var(--warn)">DashBoard control disabled (DIP-8 ON at boot).</p>`:'';
    h+=`<div class="sec">DTS Audio In (${f.routeDef?'Default':'Custom'})</div>`;
    ['AES1 (L / R)','AES2 (C / LFE)','AES3 (Ls / Rs)'].forEach((nm,n)=>{ h+=row(nm, [0,1].map(sd=>{ const i=2*n+sd; return `<select class="m3-ds" data-k="dbin" data-i="${i}" data-o="${OIDS.DBIN1+n}" ${dis?'disabled':''}>${Object.keys(DBIN).map(Number).sort((a,b)=>a-b).map(c=>`<option value="${c}" ${f.dbin[i]===c?'selected':''}>${DBIN[c]}</option>`).join('')}</select>`; }).join(' ')); });
    h+=`<div class="sec">Output</div>`+row('Output Mode', `<select class="m3-ds" data-k="outmode" data-o="${OIDS.NLC_OUT}" ${dis?'disabled':''}><option value="0" ${!f.outMode?'selected':''}>In-line</option><option value="1" ${f.outMode?'selected':''}>Bypass</option></select>`)
      +row('Target Level (db)', `<input type="range" class="m3-dr" data-k="target" data-o="${OIDS.NLC_TARGET}" min="0" max="40" value="${f.target}" ${dis?'disabled':''} style="width:60%"> <b>${f.target-40}</b>`);
  } else if (tab==='preset'){
    const P=PRESETS[f.preset];
    h+=row('Preset', `<select class="m3-ds" data-k="preset" data-o="${OIDS.NLC_PRESET}" ${dis?'disabled':''}>${PRESETS.map((p,i)=>`<option value="${i}" ${f.preset===i?'selected':''}>${p.name}</option>`).join('')}</select>`);
    [['Correction Ratio',P.ratio,'%'],['Upper Threshold (db)',P.ut,''],['Lower Threshold (db)',P.lt,''],['Dead Band (db)',P.db,''],['Noise Floor (db)',P.nf,''],['Attack/Rise (ms)',P.att,''],['Release/Fall (ms)',P.rel,''],['Frequency Shaping',P.fs,''],['Compressor Threshold (db)',P.cth,''],['Compressor Ratio',P.cr,'']].forEach(([k,v,u])=>{ h+=row(k, `<span class="mono">${v}${u}</span> <span class="muted small">${f.preset===3?'(user slider)':'(_ALT read-only)'}</span>`); });
  } else if (tab==='dts'){
    h+=`<p class="small">Opening this menu makes DashBoard ask for five parameters; each get function talks to the card through Master_Transfer().</p><button class="m3-db" data-k="dtsinfo" data-v="0">Read DTS Info now</button>`;
    h+=row('Model No.', w.dbd?'(from card)':'0')+row('Serial No.', w.dbd?'(from card)':'0')+row('Hardware Revision','1.0')+row('Firmware Revision','1.0')+row('DTS Algorithm Revision','1.0');
  }
  h+=`</div></div>`; return h;
}
function bindDash(root){
  root.querySelectorAll('.m3-dt').forEach(b=>b.onclick=()=>{ D.ui.dashTab=b.dataset.t; SIM.refresh(); });
  const lab = el => (el.closest('.row')? el.closest('.row').firstChild.textContent : el.dataset.k);
  root.querySelectorAll('.m3-ds').forEach(s=>s.onchange=()=>{ const v=+s.value, i=s.dataset.i!==undefined? +s.dataset.i : undefined; A.dash(s.dataset.k, v, `${lab(s)} = ${s.options[s.selectedIndex].text}`, +s.dataset.o, i); });
  root.querySelectorAll('.m3-dr').forEach(s=>s.onchange=()=>A.dash(s.dataset.k, +s.value, `${lab(s)} = ${+s.value-40} dB`, +s.dataset.o));
  root.querySelectorAll('.m3-db').forEach(b=>b.onclick=()=>A.dash(b.dataset.k, +b.dataset.v, b.textContent, b.dataset.k==='dtsinfo'? OIDS.DTS_MODEL : 0x0D19));
}
function bindHW(root){
  root.querySelectorAll('.m3-dip').forEach(g=>g.onclick=()=>A[g.dataset.k](+g.dataset.i));
  root.querySelectorAll('.m3-hot').forEach(g=>g.onclick=()=>A[g.dataset.k]());
  root.querySelectorAll('.m3-part').forEach(g=>g.onclick=()=>{ D.ui.part=g.dataset.p; SIM.refresh(); });
  root.querySelectorAll('.m3-bnc').forEach(g=>g.onclick=()=>{ const k=g.dataset.k; if (k==='sdiin') A.sdi(); else if (k.startsWith('ain')) A.aes(+k[3]); else if (k.startsWith('aes')){ D.ui.scopeOut=+k[3]; SIM.refresh(); } });
}
function partInfo(){ const p=PARTS.find(x=>x[0]===D.ui.part); return p? `<b>${p[0]} ${p[5]}</b>: ${p[6]}` : '<span class="muted">Click a part on the card for what it does. Click DIP switches to flip them, the daughter card to remove or fit it. On the rear module click SDI IN or AES IN to plug a source, an AES OUT to scope it.</span>'; }
function worldHTML(){
  const w=world(absT()); const sel=(id,opts,cur)=>`<select id="${id}" style="max-width:100%">${opts.map(([v,l])=>`<option value="${v}" ${v===cur?'selected':''}>${l}</option>`).join('')}</select>`;
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;margin-top:8px;min-width:0">
    <label>Scenario ${sel('m3scn', Object.keys(SCN).map(k=>[k,SCN[k].label]), D.scn)}</label>
    <label>Page ${sel('m3pg', SCN[D.scn].pages.map((p,i)=>[String(i),p[1]]), String(D.page))}</label>
    <label>Source ${sel('m3fmt', Object.keys(VF).map(k=>[k,VF[k].name]), w.fmt)}</label>
    <button id="m3sdi">${sdiOn(absT())?'Unplug SDI':'Plug SDI'}</button>
    <span>Groups ${[0,1,2,3].map(g=>`<button class="m3g ${(w.groups>>g)&1?'on':''}" data-g="${g}">${g+1}</button>`).join('')}</span>
    <span>Content ${[0,1,2,3].map(g=>`<button class="m3c" data-g="${g}" title="group ${g+1}: PCM → Dolby E → AC-3">${w.content[g]}</button>`).join('')}</span>
    <label>Programme ${sel('m3prog', Object.keys(PROG).map(k=>[k,PROG[k].label]), w.prog)}</label>
    <label title="Which FPGA load decodes the router codes">FPGA load ${sel('m3load', [['match','load matching the firmware (not archived) — inferred'],['v106B','archived v106Bdts (2011-04-26)']], D.base.fpgaLoad)}</label>
    ${D.scn==='boot'?`<label>CONF_DONE at ${sel('m3conf', [['0.25','250 ms (fast)'],['0.45','450 ms']], String(D.base.confT))} ${inf}</label>`:''}
    <button id="m3clr" title="Remove every action you added">Clear my actions</button></div>`;
}
function bindWorld(m){
  const q=s=>m.querySelector(s);
  q('#m3scn').onchange=e=>{ D.scn=e.target.value; D.page=0; D.ev=[]; D.log=[]; SIM.seek(0); };
  q('#m3pg').onchange=e=>{ D.page=+e.target.value; SIM.refresh(); };
  q('#m3fmt').onchange=e=>A.fmt(e.target.value);
  q('#m3sdi').onclick=()=>A.sdi();
  m.querySelectorAll('.m3g').forEach(b=>b.onclick=()=>A.group(+b.dataset.g));
  m.querySelectorAll('.m3c').forEach(b=>b.onclick=()=>A.content(+b.dataset.g));
  q('#m3prog').onchange=e=>A.prog(e.target.value);
  q('#m3load').onchange=e=>{ D.base.fpgaLoad=e.target.value; act(`FPGA load: ${e.target.value}`, tr=>{ tr(e.target.value==='v106B'? 'par_sel_2of40 (v106Bdts): 0x14–0x1F = ext_aes3a…ext_aes8b (ports commented out in AES_Test.v), 0x20–0x27 = daughter-card outputs, 0x28–0x2B = SRC. The firmware writes 0x18–0x1D for "DTS L…Rs", so AES OUT 1–3 fall silent with this load.' : 'A load whose decode matches the firmware table in dbparams.c (0x14–0x17 SRC ON, 0x18–0x1F DTS) — inferred: it is not in the archive.'); }); };
  if (q('#m3conf')) q('#m3conf').onchange=e=>{ D.base.confT=+e.target.value; SIM.refresh(); };
  q('#m3clr').onclick=()=>{ D.ev=[]; D.log=[]; SIM.refresh(); };
}
function traceHTML(){ return D.log[0]? `<div><b>${D.log[0].name}</b> <span class="muted">at ${SIM.fmtT(D.log[0].t)}</span></div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Use the card, the rear module, the source controls or the parameter window. Each step the firmware takes is listed here with the function names from the source.</div>'; }
function card(title, body){ return `<div class="card"><h2>${title}</h2>${body}</div>`; }

/* =====================================================================
   TIMELINE LANES
   ===================================================================== */
function txtFit(c, s, x, y, maxW){ if (maxW < 16) return; let t=s; while (t.length>2 && c.measureText(t).width > maxW-4) t=t.slice(0,-1); if (t.length<s.length) t=t.slice(0,-1)+'…'; c.fillText(t, x, y); }
const TCOL = {app:'--accent2', reset:'--bad', dts:'--warn', can:'--accent', rep:'--ink2', main:'--ink2'};
function lineT(f){ return 1/(f.fr*f.lines); }
function lanes(){
  const s=sched(), P0=page0(), css=n=>SIM.css(n), A0=t=>P0+t;
  const ls=[];
  ls.push({label:'SDI IN: frames / fields', h:26, draw(c,X,t0,t1,y,h){
    const a=A0(t0), b=A0(t1), w=world(a); if (!sdiOn(A0(SIM.t))){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('no cable on SDI IN', X(t0)+6, y+h/2+4); return; }
    const f=VF[w.fmt], Tf=1/f.fr, n0=Math.floor(a/Tf), n1=Math.ceil(b/Tf);
    if (n1-n0>400){ SIM.pulses(c,X,t0,t1,y,h,Tf,-P0%Tf,Tf*0.02,css('--accent2'),'frames'); return; }
    c.font='10px '+css('--mono');
    for (let n=n0;n<=n1;n++){ const ta=n*Tf-P0, x=X(ta); c.fillStyle=css('--accent2'); c.fillRect(x,y+3,2,h-6);
      if (f.il){ c.globalAlpha=.5; c.fillRect(X(ta+Tf/2),y+8,1.5,h-16); c.globalAlpha=1; }
      if (X(ta+Tf)-x>70){ c.fillStyle=css('--ink'); c.fillText(`frame ${n} · ${f.name}`, x+4, y+12); } } }});
  ls.push({label:'SDI lines: EAV · HANC · SAV', h:30, draw(c,X,t0,t1,y,h){
    const a=A0(t0), b=A0(t1), w=world(a); if (!sdiOn(a)) return; const f=VF[w.fmt], Tl=lineT(f), wt=1/f.clk, n0=Math.floor(a/Tl), n1=Math.ceil(b/Tl), px=X(t0+Tl)-X(t0);
    if (px<3){ SIM.pulses(c,X,t0,t1,y,h,Tl,-P0%Tl,Tl*0.12,css('--ink2'),`lines (${f.lines}/frame, ${f.spl} words, ${f.rateTxt})`); return; }
    for (let n=n0;n<=n1;n++){ const ta=n*Tl-P0, xe=X(ta), xh=X(ta+f.hdr*wt), xs=X(ta+(f.spl-f.act-4)*wt), xa=X(ta+(f.spl-f.act)*wt), xn=X(ta+Tl);
      c.fillStyle=css('--bad'); c.fillRect(xe,y+4,Math.max(1,xh-xe),h-8); c.fillStyle=css('--chip'); c.fillRect(xh,y+4,xs-xh,h-8);
      c.fillStyle=css('--warn'); c.fillRect(xs,y+4,Math.max(1,xa-xs),h-8); c.fillStyle=css('--grid'); c.fillRect(xa,y+4,xn-xa,h-8);
      if (px>40){ [0,1,2,3].forEach(g=>{ if (!((w.groups>>g)&1)) return; const w0=f.hdr+8+g*(f.std===1?40:31), w1=w0+(f.std===1?36:31); c.fillStyle=css(GCOL[g]); c.fillRect(X(ta+w0*wt),y+7,Math.max(1,X(ta+w1*wt)-X(ta+w0*wt)),h-14); }); }
      if (px>160){ c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); txtFit(c, `line ${(n%f.lines)+1}`, xa+4, y+h/2+4, xn-xa); txtFit(c,'HANC: audio packets G1–G4', xh+3, y+12, xs-xh); } } }});
  ls.push({label:'GS2970 LOCKED · standard', h:22, draw(c,X,t0,t1,y,h){
    const pw=X(t1)-X(t0), M=Math.min(500,Math.ceil(pw/2)), sp=t1-t0; let last=-1;
    for (let j=0;j<M;j++){ const tt=A0(t0+sp*(j+.5)/M); const L=rxLockedAt(tt); c.fillStyle=L?css('--accent2'):css('--grid'); c.fillRect(X(t0+sp*j/M),y+4,pw/M+0.6,h-8); }
    const st=lockAt(A0(SIM.t)); c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText(`last read by appTask: ${STD[st||0]}`, X(t0)+6, y+h/2+4); }});
  ls.push({label:'gearOS on the AT90CAN128', h:34, draw(c,X,t0,t1,y,h){
    const a=A0(t0), b=A0(t1); c.font='10px sans-serif';
    for (const k of s.tasks){ if (k.t1<a||k.t0>b) continue; const xa=X(k.t0-P0), xb=X(k.t1-P0); c.fillStyle=css(TCOL[k.kind]||'--ink2'); c.globalAlpha=k.idle?.3:.85; c.fillRect(xa,y+3,Math.max(1,xb-xa),h-6); c.globalAlpha=1;
      if (xb-xa>40){ c.fillStyle='#fff'; txtFit(c, k.label+(k.why?` — ${k.why}`:''), xa+3, y+h/2+3, xb-xa); } }
    for (const n of s.notes){ if (n.t<a||n.t>b) continue; c.fillStyle=css('--warn'); c.fillRect(X(n.t-P0)-1,y,2,h); } }});
  ls.push({label:'wait() / waitMillis() spins', h:18, draw(c,X,t0,t1,y,h){ const a=A0(t0), b=A0(t1); c.font='10px sans-serif';
    for (const o of s.ops){ if (o.lane!=='W'||o.t1<a||o.t0>b) continue; const xa=X(o.t0-P0), xb=X(o.t1-P0); c.fillStyle=css('--ink2'); c.globalAlpha=.45; c.fillRect(xa,y+3,Math.max(1,xb-xa),h-6); c.globalAlpha=1; if (xb-xa>50){ c.fillStyle=css('--ink'); txtFit(c,o.label,xa+3,y+h/2+4,xb-xa); } } }});
  ls.push({label:'FPGA SPI (PE5 SCLK · PE6 MOSI · PE7 CS · PD0 MISO)', h:40, draw(c,X,t0,t1,y,h){
    const a=A0(t0), b=A0(t1); const bitT=20/FCPU; const bitPx=X(t0+bitT)-X(t0); c.font='10px '+css('--mono'); let i=Math.max(0,bs(s.ops,a)-40);
    for (;i<s.ops.length;i++){ const o=s.ops[i]; if (o.t0>b) break; if (o.lane!=='A'||o.t1<a) continue; const xa=X(o.t0-P0), xb=X(o.t1-P0);
      if (bitPx>12){ const word=((o.rw?(o.a|0x80):(o.a&0x7F))<<8)|(o.rw?0:o.v); const yC=y+6,yS=y+16,yM=y+27,yI=y+37; const t00=o.t0+30/FCPU;
        c.fillStyle=css('--accent2'); c.fillRect(xa,yC-3,xb-xa,3);
        for (let k=0;k<16;k++){ const bt=t00+k*bitT+(k>=8?14/FCPU:0)-P0, b1=(word>>(15-k))&1, xi=X(bt), xh=X(bt+bitT*0.55), xl=X(bt+bitT*0.65), xn=X(bt+bitT);
          c.strokeStyle=css('--ink'); c.beginPath(); c.moveTo(xi,yS); c.lineTo(xh,yS); c.lineTo(xh,yS-6); c.lineTo(xl,yS-6); c.lineTo(xl,yS); c.lineTo(xn,yS); c.stroke();
          c.fillStyle=b1?css('--accent'):css('--grid'); c.fillRect(xi,yM-6,xn-xi-1,6);
          if (o.rw && k>=8){ const mb=(o.v>>(15-k))&1; c.fillStyle=mb?css('--warn'):css('--grid'); c.fillRect(xi,yI-6,xn-xi-1,6); }
          if (xn-xi>18){ c.fillStyle=css('--ink'); c.fillText(String(b1), xi+2, yM-8); } }
        continue; }
      c.fillStyle=o.rw?css('--accent2'):css('--warn'); c.globalAlpha=.85; c.fillRect(xa,y+5,Math.max(1,xb-xa-0.4),h-10); c.globalAlpha=1;
      if (xb-xa>44){ c.fillStyle='#fff'; txtFit(c, `${o.label} ${xb-xa>140?o.fn:''}`, xa+3, y+h/2+4, xb-xa); } }
    if (bitPx>12){ c.fillStyle=css('--ink2'); c.font='9px sans-serif'; ['CS','SCLK','MOSI','MISO'].forEach((l,k)=>c.fillText(l, X(t0)+2, y+8+k*10.5)); } }});
  ls.push({label:'Gennum SPI through the FPGA (0x11)', h:22, draw(c,X,t0,t1,y,h){ const a=A0(t0), b=A0(t1); c.font='10px '+css('--mono');
    for (const o of s.ops){ if (o.lane!=='G'||o.t1<a||o.t0>b) continue; const xa=X(o.t0-P0), xb=X(o.t1-P0); c.fillStyle=o.dev==='GS2970'?css('--accent2'):css('--accent'); c.globalAlpha=o.rw?.9:.6; c.fillRect(xa,y+3,Math.max(1,xb-xa-0.4),h-6); c.globalAlpha=1; if (xb-xa>40){ c.fillStyle='#fff'; txtFit(c,o.label+' '+o.fn,xa+3,y+h/2+4,xb-xa); } } }});
  ls.push({label:'CS8416 SPI (PD1–PD4, PG0/PG1)', h:16, draw(c,X,t0,t1,y,h){ const a=A0(t0), b=A0(t1);
    for (const o of s.ops){ if (o.lane!=='C'||o.t1<a||o.t0>b) continue; c.fillStyle=css('--accent'); c.fillRect(X(o.t0-P0),y+3,Math.max(1,X(o.t1-P0)-X(o.t0-P0)),h-6); } }});
  ls.push({label:'DTS card serial (PB0 · PB1 · PB2 → J4)', h:26, draw(c,X,t0,t1,y,h){ const a=A0(t0), b=A0(t1); c.font='10px '+css('--mono');
    for (const d of s.dts){ if (d.t1<a||d.t0>b) continue; const xa=X(d.t0-P0), xb=X(d.t1-P0), w1=X(d.t0+256*C.DTS_WB-P0), w2=X(d.t0+256*C.DTS_WB+3*wait2T(5000)-P0);
      c.fillStyle=css('--warn'); c.fillRect(xa,y+3,Math.max(1,w1-xa),h-6); c.fillStyle=css('--grid'); c.fillRect(w1,y+3,Math.max(0,w2-w1),h-6); c.fillStyle=d.ok?css('--accent'):css('--bad'); c.fillRect(w2,y+3,Math.max(1,xb-w2),h-6);
      if (xb-xa>60){ c.fillStyle='#fff'; txtFit(c, `${d.name}: '/' F0 05 ${hx(d.opcode)} … CS CR (256 B out)${d.ok?'':' — no answer'}`, xa+3, y+h/2+4, xb-xa); } } }});
  ls.push({label:'CAN to the frame (OGP)', h:22, draw(c,X,t0,t1,y,h){ const a=A0(t0), b=A0(t1); c.font='10px '+css('--mono');
    for (const m of s.can){ if (m.t1<a||m.t0>b) continue; const xa=X(m.t0-P0), xb=X(m.t1-P0); c.fillStyle=m.rx?css('--accent2'):(m.kind.startsWith('TRAP')?css('--bad'):css('--accent')); c.fillRect(xa,y+(m.rx?3:h/2),Math.max(1.5,xb-xa),h/2-3);
      if (xb-xa>70 && m.k===0){ c.fillStyle='#fff'; txtFit(c, `${m.rx?'←':'→'} ${m.kind} ${hx(m.oid,4)}`, xa+2, y+(m.rx?12:h-3), xb-xa); } } }});
  ls.push({label:'Card-edge LEDs (3G·HD·SD·ERR·A1–4·AES1·2)', h:46, draw(c,X,t0,t1,y,h){ const a=A0(t0), b=A0(t1); const order=[10,0,1,2,3,4,5,6,7,8]; const rh=(h-4)/order.length;
    order.forEach((bit,r)=>{ c.fillStyle=LEDCOL[bit]; const L=s.leds; for (let j=0;j<L.length;j++){ if (!((L[j].on>>bit)&1)) continue; const ta=L[j].t-P0, tb=(j+1<L.length?L[j+1].t:1e9)-P0; if (tb<t0||ta>t1) continue; c.fillRect(X(Math.max(ta,t0)), y+2+r*rh, X(Math.min(tb,t1))-X(Math.max(ta,t0)), rh-1); } }); }});
  ls.push({label:'Embedder: update_done (0x09) · GS2962', h:20, draw(c,X,t0,t1,y,h){ const pw=X(t1)-X(t0), M=Math.min(400,Math.ceil(pw/2)), sp=t1-t0;
    for (let j=0;j<M;j++){ const tt=A0(t0+sp*(j+.5)/M); const tx=txOnAt(tt), e=egrAt(tt).on; c.fillStyle= !tx? css('--grid') : e? css('--accent') : css('--warn'); c.fillRect(X(t0+sp*j/M),y+4,pw/M+0.6,h-8); } }});
  ls.push({label:'Observed ticks lost (timers)', h:20, draw(c,X,t0,t1,y,h){ const O=s.obs; if (!O.length) return; c.strokeStyle=css('--bad'); c.beginPath(); let first=true;
    for (const [tt,o] of O){ if (tt-P0<t0-0.05||tt-P0>t1+0.05) continue; const lost=Math.floor(tt*1000)-o; const yy=y+h-3-Math.min(h-6,(lost-(O[0][0]*1000-O[0][1]))/150*(h-6)); if (first){ c.moveTo(X(tt-P0),yy); first=false; } else c.lineTo(X(tt-P0),yy); } c.stroke();
    const f=fwAt(A0(SIM.t)); c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText(`ticks the task timers missed so far: ${f?f.lost:0} ms`, X(t0)+6, y+12); }});
  ls.push({label:'48 kHz audio samples', h:18, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/48000,-P0%(1/48000),2e-6,css('--accent'),'samples'); }});
  ls.push({label:'NLC: input loudness · gain', h:46, draw(c,X,t0,t1,y,h){ const pw=X(t1)-X(t0), M=Math.min(600,Math.ceil(pw)), sp=t1-t0; const yv=v=>y+h-3-clamp((v+40)/40,0,1)*(h-6); const f=fwAt(A0(SIM.t));
    c.strokeStyle=css('--grid'); c.beginPath(); c.moveTo(X(t0),yv(f?f.target-40:-24)); c.lineTo(X(t1),yv(f?f.target-40:-24)); c.stroke();
    [['S','--ink2'],['Ss','--accent2'],['out','--accent'],['g','--warn']].forEach(([k,col])=>{ c.strokeStyle=css(col); c.lineWidth=k==='out'?2:1; c.beginPath();
      for (let j=0;j<=M;j++){ const tt=A0(t0+sp*j/M), G=gainAt(tt), ff=fwAt(tt); const g = (!world(tt).dbd || (ff&&ff.outMode)) ? 0 : G.g; const v = k==='S'?G.S : k==='Ss'?G.Ss : k==='out'? G.Ss+g : -20+g; const xx=X(t0+sp*j/M); if (j) c.lineTo(xx,yv(v)); else c.moveTo(xx,yv(v)); } c.stroke(); });
    c.lineWidth=1; c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); const G=gainAt(A0(SIM.t)); c.fillText(`in ${G.Ss.toFixed(1)} LKFS · gain ${G.g>=0?'+':''}${G.g.toFixed(1)} dB · target ${f?f.target-40:-24} (model ${'inferred'})`, X(t0)+6, y+11); }});
  [0,1,2,3].forEach(n=> ls.push({label:`AES OUT ${n+1} (BNC ${3+n})`, h:28, draw(c,X,t0,t1,y,h){
    const pw=X(t1)-X(t0), sp=t1-t0, M=Math.min(500,Math.ceil(pw/2)); const sL=outSrc(2*n, A0((t0+t1)/2));
    const fq=chFreqOf(sL.dec);
    if (sp*fq < pw/3 && fq){ c.strokeStyle=css('--accent'); c.beginPath(); const N=Math.ceil(pw*1.5); let pen=false;
      for (let j=0;j<=N;j++){ const tt=A0(t0+sp*j/N); const lv=outLevel(2*n,tt); if (lv===null){ pen=false; continue; } const m=Math.floor(tt*48000)/48000; const v=Math.pow(10,lv/20)*Math.sin(2*Math.PI*fq*m); const yy=y+h/2-v*(h/2-3)*2; if (pen) c.lineTo(X(t0+sp*j/N),yy); else { c.moveTo(X(t0+sp*j/N),yy); pen=true; } } c.stroke(); }
    else for (let j=0;j<M;j++){ const tt=A0(t0+sp*(j+.5)/M), lv=outLevel(2*n,tt); if (lv===null){ c.fillStyle=css('--grid'); c.fillRect(X(t0+sp*j/M),y+h/2-1,pw/M+0.6,2); continue; } const a=clamp((lv+60)/60,0,1)*(h/2-3); c.fillStyle=css('--accent'); c.globalAlpha=.6; c.fillRect(X(t0+sp*j/M),y+h/2-a,pw/M+0.6,2*a); c.globalAlpha=1; }
    c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText(`L ← 0x${hx(sL.code)} ${srcName(sL.code)}${sL.dec.k==='none'?' → silence':''}`, X(t0)+6, y+10); }}));
  return ls;
}

/* ---------------- AES3 scope (subframe bits at the playhead) ---------------- */
function biphase(pre, bits, start){ const P={X:[1,1,1,0,0,0,1,0],Y:[1,1,1,0,0,1,0,0],Z:[1,1,1,0,1,0,0,0]}[pre]; const lv=P.map(b=>start?1-b:b); let cur=lv[lv.length-1]; for (let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if (bits[i]) cur=1-cur; lv.push(cur); } return lv; }
function aesSub(n, side, t){ const lv=outLevel(2*n+side, t); const dec=outSrc(2*n+side,t).dec; const m=Math.floor(t*48000); const v = lv===null? 0 : Math.pow(10,lv/20)*Math.sin(2*Math.PI*chFreqOf(dec)*m/48000);
  let s=Math.round(v*8388607); if (s<0) s+=1<<24; const bits=new Array(32).fill(0); for (let b=0;b<24;b++) bits[4+b]=(s>>b)&1; let par=0; for (let b=4;b<31;b++) par^=bits[b]; bits[31]=par; return {bits, v, raw:s, fr:m%192, off:lv===null}; }
function drawScope(cv, el, t){
  const n=D.ui.scopeOut; const {c,w}=SIM.canvas(cv,130); const ink=SIM.css('--ink'), ink2=SIM.css('--ink2');
  const L=aesSub(n,0,t), R=aesSub(n,1,t); const la=biphase(L.fr===0?'Z':'X', L.bits, 0), lb=biphase('Y', R.bits, la[la.length-1]); const lv=la.concat(lb), cw=(w-20)/lv.length;
  [[0,8,'--warn'],[8,16,'--ink2'],[16,56,'--accent'],[56,64,'--accent2']].forEach(([a,b,col])=>[0,64].forEach(off=>{ c.fillStyle=SIM.css(col); c.globalAlpha=.12; c.fillRect(10+(off+a)*cw,14,(b-a)*cw,70); c.globalAlpha=1; }));
  c.strokeStyle=SIM.css('--accent'); c.lineWidth=1.5; c.beginPath(); lv.forEach((b,i)=>{ const x=10+i*cw, yy=b?24:74; if (i) c.lineTo(x,yy); else c.moveTo(x,yy); c.lineTo(x+cw,yy); }); c.stroke();
  c.fillStyle=ink2; c.font='11px sans-serif'; c.fillText(`AES OUT ${n+1}: frame ${L.fr} of the 192-frame block · ${L.fr===0?'Z':'X'} preamble (left) · Y (right) · 128 biphase cells of 1/(128·48 kHz) = 163 ns`, 10, 100);
  el.innerHTML = `<span class="mono small">L = 0x${hx(L.raw,6)} ${L.off?'(silence)':''} · R = 0x${hx(R.raw,6)} ${R.off?'(silence)':''}</span> <span class="muted small">— encoder i2sx4_aes (EgressAudio); V/U/C bits shown 0 ${inf}</span>`;
}

/* =====================================================================
   VIEWS
   ===================================================================== */
function viewSim(m){
  window.__m6205_3gActive=false;
  m.innerHTML = `<div class="grid2"><div>${card('M6205 ISS6 card (8399R-500-02 gerbers L1-TOP + ST)', `<div id="crd"></div><p class="small" id="pinfo"></p>`)}
      ${card('One second on the card', `<canvas id="tl"></canvas><p class="small muted">Click the timeline to move the playhead. Zoom in to see the 16-bit FPGA SPI words bit by bit (≈2.5 µs per bit) or single SDI lines.</p>`)}</div>
    <div>${card('Rear module and the outside world', `<div style="display:grid;grid-template-columns:240px minmax(0,1fr);gap:10px"><div id="rear"></div><div style="min-width:0;overflow:hidden"><div id="wc"></div><div id="edge" style="margin-top:8px"></div></div></div>`)}
      ${card('Parameter window (DashBoard-style)', `<div id="dash"></div>`)}
      ${card('What the firmware did', `<div id="trace" class="log"></div>`)}
      ${card('AES3 at the playhead', `<canvas id="sc"></canvas><div id="scl"></div>`)}</div></div>`;
  let wv='';
  const draw=()=>{ const t=absT();
    m.querySelector('#crd').innerHTML=cardSVG(t); m.querySelector('#pinfo').innerHTML=partInfo();
    m.querySelector('#rear').innerHTML=rearSVG(t); m.querySelector('#edge').innerHTML=edgeSVG(t);
    const key=JSON.stringify([D.scn,D.page,D.base,D.ev.length]); if (key!==wv){ wv=key; m.querySelector('#wc').innerHTML=worldHTML(); bindWorld(m); }
    m.querySelector('#dash').innerHTML=dashHTML(t); bindDash(m.querySelector('#dash'));
    m.querySelector('#trace').innerHTML=traceHTML(); bindHW(m);
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:190});
    drawScope(m.querySelector('#sc'), m.querySelector('#scl'), t);
  };
  SIM.on('time', draw);
}

/* ---------------- tutorial (manual M6205A-3G issue 1, NLC_Dipswitch.xls) ---------------- */
const endFw = ()=> sched().end.fw;
const LESSONS = [
  {title:'1 · The card and its rear module', body:`<p>The M6205A-3G sits in an even slot of a DFR-8320 frame (manual: slots 2, 4 … 20) with a <b>T6301A-3G</b> rear module: BNC 1 SDI IN, 3–6 AES OUT 1–4, 7–8 AES IN 1–2, 9–10 SDI OUT 1–2. BNC 2 is not used.</p><p>Goal: plug a 3G source into <b>SDI IN</b> on the rear module (or use "Plug SDI").</p>`, hint:'Click BNC 1 on the rear module drawing.', check:()=> D.scn!=='plug' ? sdiOn(absT()) : D.ev.some(e=>e.k==='sdi')||sdiOn(absT()), auto:false},
  {title:'2 · Read the card-edge LEDs', body:`<p>Manual Table 1: <b>3G</b>, <b>HD</b>, <b>SD</b> (green) show the input standard, <b>ERR</b> (red) means no valid input, <b>AUDIO 1–4</b> (yellow) the embedded groups, <b>AES 1–2</b> the aux inputs. In the code: appTask → updateLeds() → writeLedReg() writes FPGA registers 0x0F/0x0E (a 0 bit lights an LED).</p><p>Goal: switch the source to <b>HD 1080i/59.94</b> and watch the HD LED take over.</p>`, hint:'Use the Source menu.', check:()=>{ const f=endFw(); return f.sdiStd===2; }},
  {title:'3 · Audio groups embedded on the output', body:`<p>"Audio Groups Enabled" sets how many groups the embedder writes (FPGA 0x22 and the high nibble of 0x04). With DashBoard control on (DIP-8 OFF), set it in the Audio Routing tab.</p><p>Goal: enable <b>4</b> groups.</p>`, hint:'Parameter window → Audio Routing → Audio Groups Enabled = 4.', check:()=> endFw().groups===3},
  {title:'4 · NLC preset', body:`<p>The NLC Preset tab picks Light, Medium, Aggressive or User. The card sends three commands to the DTS daughter card through <span class="mono">Master_Transfer()</span>; each writes the whole 256-byte buffer and waits for a "/" reply, about 60 ms. Watch the DTS lane and the gap it leaves in the gearOS lane.</p><p>Goal: choose <b>Medium</b>.</p>`, hint:'Parameter window → NLC Preset → Preset = Medium.', check:()=> endFw().preset===1},
  {title:'5 · Target level', body:`<p>The slider runs 0…40 and shows −40…0 dB; the card sends <span class="mono">value − 40</span> as a signed 32-bit number. The build boots with 16 (−24 dB) and ignores the target-level DIPs on SW2.</p><p>Goal: set the target to <b>−23 dB</b> (EBU R 128 style).</p>`, hint:'NLC Settings → Target Level, slide to −23.', check:()=> endFw().target===17},
  {title:'6 · Watch loudness control work', body:`<p>Pick the programme "Quiet drama, loud ad at 400 ms". In the NLC lane the grey line is the input, blue the short-term loudness, orange the gain and green the output. Then set <b>Output Mode = Bypass</b> and see the gain stop.</p><p>Goal: Output Mode = Bypass.</p>`, hint:'NLC Settings → Output Mode → Bypass.', check:()=> endFw().outMode===1},
  {title:'7 · Custom routing: put AES IN 1 on AES OUT 4', body:`<p>Plug a source into AES IN 1 (the AES 1 LED lights), then in Audio Routing press <b>Go to Custom Settings</b> and set Group2, AES4 Left and Right to <b>Ext AES1 L/R /SRC ON</b>. The next appTask pass writes 0x56/0x57.</p>`, hint:'Plug BNC 7, then Custom Settings, then the AES4 selectors.', check:()=>{ const f=endFw(); return world(9).aes[0] && f.mux[6]===0x14 && f.mux[7]===0x15; }},
  {title:'8 · Try the archived FPGA load', body:`<p>The firmware's router codes (0x18–0x1F = DTS outputs) do not match the decode in the archived FPGA <span class="mono">v106Bdts</span>, where 0x18–0x1F are unconnected AES ports and the daughter-card outputs are 0x20–0x27.</p><p>Goal: switch "FPGA load" to the archived v106Bdts and see AES OUT 1–3 go silent.</p>`, hint:'Source controls → FPGA load.', check:()=> D.base.fpgaLoad==='v106B'},
  {title:'9 · DIP-only operation and its bug', body:`<p>With <b>DIP-8 ON</b> (DashBoard control off) and DIP-7 OFF (settings from the DIPs) at power-up, <span class="mono">updateSettings()</span> polls the DIPs on every pass. Choose the Power-up scenario, set DIP-8 ON, then flip DIP-4 later in the second: the preset never changes and OID 0x0F32 is reported every 40 ms.</p><p>Goal: Power-up scenario with DIP-8 ON.</p>`, hint:'Scenario → Power-up, then click DIP-8 on the card before the playhead reaches main().', check:()=> D.scn==='boot' && !endFw().dashEn},
];
let lessonIdx=0;
function viewTutorial(m){
  window.__m6205_3gActive=false;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — operating an M6205A-3G with the NLC daughter card', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('Card, rear module and source', `<div id="crd"></div><div style="display:grid;grid-template-columns:140px 150px;gap:8px;margin-top:6px"><div id="rear"></div><div id="edge"></div></div><div id="wc" style="min-width:0;overflow:hidden"></div>`)}${card('Parameter window', `<div id="dash"></div>`)}</div></div>`;
  let wv='';
  const draw=()=>{ const t=absT();
    m.querySelector('#crd').innerHTML=cardSVG(t,{labels:false}); m.querySelector('#rear').innerHTML=rearSVG(t); m.querySelector('#edge').innerHTML=edgeSVG(t);
    const key=JSON.stringify([D.scn,D.page,D.base,D.ev.length]); if (key!==wv){ wv=key; m.querySelector('#wc').innerHTML=worldHTML(); bindWorld(m); }
    m.querySelector('#dash').innerHTML=dashHTML(t); bindDash(m.querySelector('#dash')); bindHW(m); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#lessons').innerHTML=LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=>li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx]; let ok=false; try{ ok=L.check(); }catch(e){ ok=false; }
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?'✓ Goal reached.':'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>
      <p class="small muted">Goals are checked against the firmware state at the end of the simulated page, so a change made at the playhead counts once the card has acted on it.</p>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ D.scn='steady'; D.page=0; D.base=mkBase(); D.ev=[]; D.log=[]; lessonIdx=0; SIM.seek(0); };
  };
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewSecond(m){
  window.__m6205_3gActive=false;
  m.innerHTML = `${card('The second at a glance', `<div id="sum"></div>`)}
    <div class="grid2">${card('Frame by frame (SDI frames of the current source)', `<div id="ff" class="scroll" style="max-height:420px"></div>`)}
    ${card('Zoom ladder at the playhead', `<canvas id="zl"></canvas><p class="small muted">Each row is the same instant at ten times the magnification of the row above.</p>`)}</div>`;
  const draw=()=>{ const s=sched(), P0=page0(), t=absT(), w=world(t), f=VF[w.fmt];
    const T=s.tasks.filter(x=>x.t0>=P0 && x.t0<P0+1); const app=T.filter(x=>x.kind==='app'&&!x.idle); const durs=app.map(x=>(x.t1-x.t0)*1000);
    const can=s.can.filter(x=>x.t0>=P0&&x.t0<P0+1&&x.k===0&&!x.rx); const dts=s.dts.filter(x=>x.t0>=P0&&x.t0<P0+1);
    const lost0=(fwAt(P0)||{lost:0}).lost, lost1=(fwAt(P0+0.999)||{lost:0}).lost;
    const busy=T.reduce((a,x)=>a+Math.min(x.t1,P0+1)-x.t0,0);
    m.querySelector('#sum').innerHTML=`<table class="kv"><tr><th>Source</th><td>${sdiOn(t)?f.name+' · '+f.rateTxt+' · '+f.lines+' lines × '+f.spl+' words · '+(f.fr).toFixed(3)+' frames/s':'no cable'}</td></tr>
      <tr><th>appTask passes</th><td>${app.length} (APPTASK_INTERVAL = 40 ticks → 25 per second if a pass took under 1 ms). Pass length ${durs.length?Math.min(...durs).toFixed(2)+'–'+Math.max(...durs).toFixed(2)+' ms':'—'}; ${Math.round((app.length&&app.length>1? (app[app.length-1].t0-app[0].t0)/(app.length-1):0)*1000*10)/10} ms between passes ${inf} from the cycle counts</td></tr>
      <tr><th>Timer ticks lost</th><td>${lost1-lost0} ms this second: <span class="mono">updateClock()</span> sets prevTick = ticks, so <span class="mono">updateTimers()</span> runs once per osRun loop however many 1 ms ticks a long task spanned</td></tr>
      <tr><th>CPU busy</th><td>${(busy*100).toFixed(1)} % of the second in tasks; the rest is <span class="mono">headroomCounter()</span> spins</td></tr>
      <tr><th>CAN messages out</th><td>${can.length} OGP messages (${[...new Set(can.map(x=>x.kind))].join(', ')||'none'})</td></tr>
      <tr><th>DTS transfers</th><td>${dts.length} × Master_Transfer, ${(dts.reduce((a,x)=>a+x.t1-x.t0,0)*1000).toFixed(0)} ms in total</td></tr>
      <tr><th>Audio</th><td>48 000 samples per channel; ${sdiOn(t)? (f.std===1? 'SD: one packet per group per line, ≈'+(48000/(f.fr*f.lines)).toFixed(2)+' samples' : 'HD/3G: ≈'+(48000/(f.fr*f.lines)).toFixed(2)+' samples per line, one 299M packet per group per sample') : 'no SDI'}</td></tr></table>`;
    let h='<table class="kv small"><tr><th>frame</th><th>starts</th><th>what the controller did in this frame</th></tr>';
    const Tf=1/f.fr; const n0=Math.floor(P0/Tf), n1=Math.floor((P0+1)/Tf);
    for (let n=n0;n<=n1;n++){ const a=n*Tf, b=a+Tf; const tk=s.tasks.filter(x=>x.t0<b && x.t1>a && !x.idle).map(x=>x.label+(x.kind==='app'?` ${((x.t1-x.t0)*1000).toFixed(1)} ms`:'')); const cm=s.can.filter(x=>x.t0>=a&&x.t0<b&&x.k===0).map(x=>(x.rx?'←':'→')+x.kind.split(' ')[0]);
      const cur = t>=a && t<b; h+=`<tr class="${cur?'hl':''}" style="cursor:pointer" data-t="${a-P0}"><td>${n-n0}</td><td class="mono">${SIM.fmtT(Math.max(0,a-P0))}</td><td>${[...new Set(tk)].join(' · ')||'<span class="muted">idle (headroomCounter)</span>'}${cm.length?' · CAN '+cm.join(' '):''}</td></tr>`; }
    h+='</table>'; const ff=m.querySelector('#ff'); const st=ff.scrollTop; ff.innerHTML=h; ff.scrollTop=st; ff.querySelectorAll('tr[data-t]').forEach(r=>r.onclick=()=>SIM.seek(+r.dataset.t+1e-6));
    // zoom ladder
    const cv=m.querySelector('#zl'); const spans=[1,0.1,0.01,0.001,0.0001,0.00001]; const ls=lanes(); const pick=['gearOS on the AT90CAN128','FPGA SPI (PE5 SCLK · PE6 MOSI · PE7 CS · PD0 MISO)','SDI lines: EAV · HANC · SAV'];
    const {c,w:W}=SIM.canvas(cv, spans.length*58+10); const lw=120;
    spans.forEach((sp,i)=>{ const a=clamp(SIM.t-sp/2,0,Math.max(0,1-sp)), b=a+sp; const y=i*58+4; const X=tt=>lw+(tt-a)/(b-a)*(W-lw-6);
      c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(SIM.fmtDur(sp), 4, y+16);
      c.save(); c.beginPath(); c.rect(lw,y,W-lw,56); c.clip();
      pick.forEach((nm,k)=>{ const L=ls.find(l=>l.label===nm); if (L) L.draw(c,X,a,b,y+k*18,18); });
      c.restore(); c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(X(SIM.t),y); c.lineTo(X(SIM.t),y+54); c.stroke(); });
  };
  SIM.on('time', draw);
}

/* ---------------- block diagram ---------------- */
const BLK = {
  eq:{x:20,y:60,w:110,h:46,t:'GS2974A EQ', d:'Adaptive cable equaliser on SDI IN (BNC 1). Manual: 3G 80 m, HD 170 m, SD 400 m of Belden 1694A.'},
  rx:{x:160,y:60,w:120,h:46,t:'GS2970 deserializer', d:'Locks to 3G/HD/SD, converts level B to A (IOPROC_2 = 0x0080 written every pass), detects audio groups (0x202 HD, 0x403 SD). 20-bit parallel video and its own AOUT pins go to the FPGA.'},
  fpga:{x:320,y:30,w:260,h:250,t:'EP2C35 FPGA (AES_Test)', d:'Ingress: hd_demux/sd_demux de-embed 16 channels. par_sel_16of40 picks 16 output channels from 16 embedded + 4 AES + 8 daughter-card + 4 SRC sources (codes in registers 0x50–0x5F). egress_dts_multimerge picks 8 channels for the daughter card (0x60–0x67). Egress: Xilinx XAPP1014 hd_audio_mux_top ×4 (v106Bdts) re-embeds groups enabled by 0x04 high nibble. Control: spi.v register file.'},
  tx:{x:620,y:60,w:120,h:46,t:'GS2962 serializer', d:'Drives SDI OUT 1 and 2 (BNC 9, 10). gs2962Set3GLevel() writes IOPROC 0x0240 and 352M words every pass; always level A.'},
  aesout:{x:620,y:150,w:120,h:60,t:'AES OUT 1–4', d:'i2sx4_aes encoders: output channels 1–8 of the router ("AES outputs follow what is embedded"), 48 kHz, BNC 3–6.'},
  aesin:{x:20,y:190,w:110,h:60,t:'AES IN 1–2', d:'CS8416 receivers U5/U6 (BNC 7, 8) → direct to the router (SRC OFF) and through AD1895 sample-rate converters U28/U30 (SRC ON).'},
  src:{x:160,y:190,w:120,h:60,t:'AD1895 SRC ×2', d:'Dolby-compliant sample-rate converters; manual: "automatically turn off to allow seamless Dolby embedding".'},
  dbd:{x:340,y:320,w:220,h:60,t:'J4 daughter card (DTS NLC 5.1)', d:'72-pin SIMM. FPGA sends 4 MSB-aligned stereo streams (DOLBY_EAD/PLE/PLS/PGP, EAFS/EABC clocks); 8 processed channels return on DADA–DADD. Control: PB0/PB1/PB2 (DOLBY_MSFS/MSBC/MSD) bit-banged by dtsserial.c.'},
  avr:{x:620,y:260,w:140,h:70,t:'AT90CAN128 (8 MHz)', d:'main() + gearOS: canReceive, appTask (40 ticks), reportStatus (1000 ticks). FPGA register SPI on PE5/PE6/PE7/PD0, CS8416 SPI on PD1–PD4/PG0/PG1, DIPs on PA0–7 and PC4–7, FPGA_RESET_N on PG3, CONF_DONE on PG4, EPCS on PE0–PE4.'},
  can:{x:800,y:270,w:110,h:46,t:'CAN → frame', d:'SN65HVD233 to the DFR-8320 frame controller; DashBoard talks OGP over it (1 Mbit/s).'},
  clk:{x:160,y:290,w:120,h:46,t:'ICS662 · PLL1705', d:'Audio clocks locked to video; ICS662_SEL3 = MODE[4] chooses the 1/1.001 ratio (set1001Flag).'},
};
const BLINKS = [['eq','rx'],['rx','fpga'],['fpga','tx'],['fpga','aesout'],['aesin','src'],['aesin','fpga'],['src','fpga'],['fpga','dbd'],['dbd','fpga'],['avr','fpga'],['avr','can'],['clk','fpga'],['avr','dbd']];
function viewBlock(m){
  window.__m6205_3gActive=false;
  m.innerHTML = `<div class="grid2">${card('Block diagram (click a block)', `<div id="bd"></div>`)}${card('Block', `<div id="bi"></div>`)}</div>
    ${card('Manual Figure 1, as text', `<p class="small">SDI INPUT → Demux → (16 embedded channels, 4 auxiliary AES channels through SRC, DTS processor in the user-selectable path) → Output Router → Mux → SDI OUTPUT ×2 and AES OUTPUT 1–4. The default path sends embedded pairs 1–3 through the NLC and passes pair 4 and groups 3–4 straight through (updateMuxAudioRouting with DTS_NLC).</p>`)}`;
  const draw=()=>{ const t=absT(); const css=n=>SIM.css(n);
    const live={rx:rxLockedAt(t), tx:txOnAt(t), dbd:world(t).dbd, aesin:world(t).aes.some(x=>x), fpga:t>=sched().cfgDone};
    let s=`<svg viewBox="0 0 930 400" style="width:100%"><defs><marker id="m3ar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="${css('--ink2')}"/></marker></defs>`;
    BLINKS.forEach(([a,b])=>{ const A_=BLK[a], B_=BLK[b]; const x1=A_.x+A_.w/2, y1=A_.y+A_.h/2, x2=B_.x+B_.w/2, y2=B_.y+B_.h/2; s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${css('--ink2')}" stroke-width="1.5" marker-end="url(#m3ar)" opacity=".7"/>`; });
    Object.entries(BLK).forEach(([k,b])=>{ const on=live[k]!==false; s+=`<g class="m3-blk" data-k="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${D.ui.blk===k?css('--chip'):css('--panel2')}" stroke="${on?css('--accent'):css('--line')}" stroke-width="${D.ui.blk===k?3:1.5}"/><text x="${b.x+b.w/2}" y="${b.y+20}" text-anchor="middle" font-size="12" font-weight="700" fill="${css('--ink')}">${b.t}</text></g>`; });
    const f=fwAt(t); if (f){ s+=`<text x="330" y="70" font-size="11" fill="${css('--ink2')}">router: ${f.mux.slice(0,8).map(c=>hx(c)).join(' ')}</text><text x="330" y="88" font-size="11" fill="${css('--ink2')}">to card: ${f.dbin.map(c=>hx(c)).join(' ')}</text><text x="330" y="106" font-size="11" fill="${css('--ink2')}">groups enabled ${f.groups+1} · update_done ${egrAt(t).on?1:0}</text>`; }
    s+='</svg>'; m.querySelector('#bd').innerHTML=s; const b=BLK[D.ui.blk]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p class="small">${b.d}</p>`;
    m.querySelectorAll('.m3-blk').forEach(g=>g.onclick=()=>{ D.ui.blk=g.dataset.k; draw(); });
  };
  SIM.on('time', draw);
}

/* ---------------- schematics (redrawn) ---------------- */
const U3PINS = [[2,'PE0','FPGA_NCE'],[3,'PE1','FPGA_NCS'],[4,'PE2','FPGA_DCLK'],[5,'PE3','FPGA_CNF_DATA'],[6,'PE4','FPGA_ASDI'],[7,'PE5','FPGA_LED_CLK (SPI SCLK)'],[8,'PE6','FPGA_LED_DATA (SPI MOSI)'],[9,'PE7','FPGA_LED_ST (SPI CS)'],
  [10,'PB0','DOLBY_MSFS (DTS CS)'],[11,'PB1','DOLBY_MSBC (DTS CLK)'],[12,'PB2','DOLBY_MSD (DTS DATA OUT)'],[13,'PB3','DSP_RESET'],[14,'PB4','AT90_FPGA9'],[15,'PB5','AT90_FPGA10'],[16,'PB6','AT90_FPGA11'],[17,'PB7','AT90_FPGA12'],
  [18,'PG3','FPGA_RESET_N'],[19,'PG4','FPGA_CONF_DONE'],[25,'PD0','FPGA_LED_1 (SPI MISO)'],[26,'PD1','CS8416_RESET'],[27,'PD2','CS8416_IN1'],[28,'PD3','CS8416_CLK1'],[29,'PD4','CS8416_OUT1'],[30,'PD5','CAN_DRV_TX'],[31,'PD6','CAN_DRV_RX'],[32,'PD7','CAN_DRV_TX_EN_N'],
  [33,'PG0','CS8416_SEL2'],[34,'PG1','CS8416_SEL1'],[35,'PC0','AT90_FPGA0 (CS8416 #2 MISO)'],[36,'PC1','AT90_FPGA1'],[37,'PC2','AT90_FPGA2 (DTS DATA IN)'],[38,'PC3','AT90_FPGA3'],[39,'PC4','SW2-1'],[40,'PC5','SW2-2'],[41,'PC6','SW2-3'],[42,'PC7','SW2-4'],[43,'PG2','FPGA_PROG'],
  [44,'PA7','SW1-8'],[45,'PA6','SW1-7'],[46,'PA5','SW1-6'],[47,'PA4','SW1-5'],[48,'PA3','SW1-4'],[49,'PA2','SW1-3'],[50,'PA1','SW1-2'],[51,'PA0','SW1-1'],[58,'PF3','AT90_FPGA8 (FSYNCH)'],[59,'PF2','AN_BMID2'],[60,'PF1','AN_BMID'],[61,'PF0','AN_SLOTID']];
function chipSVG(x,y,w,name,left,right,sub){ const ph=15, h=Math.max(left.length,right.length)*ph+30; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+w/2}" y="${y+16}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${name}</text>`+(sub?`<text x="${x+w/2}" y="${y+h+13}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:'');
  left.forEach((p,i)=>{ const yy=y+30+i*ph; s+=`<line x1="${x-28}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink2)"/><text x="${x+4}" y="${yy+4}" font-size="10" fill="var(--ink)">${p[0]}</text><text x="${x-30}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--accent2)">${p[1]}</text>`; });
  right.forEach((p,i)=>{ const yy=y+30+i*ph; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+28}" y2="${yy}" stroke="var(--ink2)"/><text x="${x+w-4}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${p[0]}</text><text x="${x+w+30}" y="${yy+4}" font-size="10" fill="var(--accent2)">${p[1]}</text>`; });
  return s; }
const SHEETS = [
  {t:'1 · Controller U3 AT90CAN128 (pins from the IPC-D-356 netlist)', h:560, draw(){ const L=U3PINS.filter(p=>p[0]<=32).map(p=>[`${p[1]} (${p[0]})`, p[2]]), R=U3PINS.filter(p=>p[0]>32).map(p=>[`${p[1]} (${p[0]})`, p[2]]);
    return chipSVG(330,20,190,'U3 AT90CAN128-16AU',L,R,'8.000 MHz crystal on XTAL1/XTAL2 · redrawn from 8399R-500-02-PCB-DR1.ipc'); }},
  {t:'2 · FPGA register SPI and the Gennum pass-through (spi.v)', h:360, draw(){ let s=chipSVG(60,20,170,'U3 AT90CAN128',[],[['PE7','CS (active high)'],['PE5','SCLK'],['PE6','MOSI'],['PD0','MISO']],'');
    s+=chipSVG(470,20,200,'U17 spi.v',[['cs','FPGA_LED_ST'],['sclk','FPGA_LED_CLK'],['sdin','FPGA_LED_DATA'],['sdout','FPGA_LED_1']],[['gs2970_cs','= ~(gennum1[0] & ~cs)'],['gs2962_cs','= ~(gennum1[1] & ~cs)'],['gs2970_sdin','= ~gs2970_cs & sdin'],['gs2962_sdin','= gennum1[1] & sdin'],['sclk ×2','= sclk']],'register 0x11 gennum1 selects the Gennum part; it is talked to while CS is LOW');
    s+=`<text x="40" y="250" font-size="11" fill="var(--ink)">Frame: [rw][addr 7 bits][data 8 bits], MSB first, 16 clocks with CS high. sdout = (gennum1[0] & gs2970_sdout) | (gennum1[1] & gs2962_sdout) | (cs & fpga_sdout).</text>
      <text x="40" y="270" font-size="11" fill="var(--ink)">gspiRead(): alteraWrite(0x11, dev) → CS low → 16-bit command (bit 15 read, bit 12 auto-increment) → 16-bit data → a second dummy word → alteraWrite(0x11, 0).</text>
      <text x="40" y="290" font-size="11" fill="var(--ink2)">Redrawn from rtl/Control/spi.v (v106Bdts), gspi.c and altspi.c; not the original CAD.</text>`; return s; }},
  {t:'3 · AES inputs: CS8416 → AD1895 → FPGA', h:300, draw(){ let s=chipSVG(30,20,150,'U5 CS8416 #1',[['RXP','CS8416_AES1 (BNC 7)']],[['SDOUT','AD1895_SDATA_IN1'],['OLRCK','AD1895_LRCLK_IN1'],['OSCLK','AD1895_SCLK_IN1'],['CCLK/CDIN','PD3 / PD2'],['CDOUT','PD4'],['CS','PG1 SEL1']],'');
    s+=chipSVG(420,20,160,'U28 AD1895',[['SDATA_I','AD1895_SDATA_IN1'],['LRCLK_I','AD1895_LRCLK_IN1'],['SCLK_I','AD1895_SCLK_IN1']],[['SDATA_O','AD1895_SDATA1_O'],['LRCLK_O','AD1895_LRCLK1_O'],['MCLK_I','AD1895_MCLK1_IN'],['BYPASS','AD1895_BYPASS_1']],'second channel: U6 / U30 with SEL2 on PG0, MISO via FPGA on PC0');
    s+=`<text x="30" y="270" font-size="11" fill="var(--ink2)">Nets from the IPC netlist; cs8416Init writes reg 1 = 0x04 (mute on error), reg 4 = 0x80 (run), reg 5 = 0x80 (master, I²S). Redrawn, not the original CAD.</text>`; return s; }},
  {t:'4 · Daughter-card socket J4 and rear connector J10', h:330, draw(){ let s=chipSVG(60,20,180,'J4 72-pin SIMM',[['EAFS / EABC','frame / bit clock to card'],['EAD PLE PLS PGP','4 × stereo to card'],['DADA…DADD','4 × stereo from card'],['MSFS MSBC MSD','DTS control (PB0–PB2)'],['ERR','dolby_stat → 0x20']],[],'DOLBY_* names kept from the Dolby decoder board');
    s+=chipSVG(560,20,170,'J10 rear',[['BNC1_SIG','SDI IN'],['BNC2_SIG','not used'],['BNC3–6_SIG','AES OUT 1–4'],['BNC7–8_SIG','AES IN 1–2'],['BNC9–10_SIG','SDI OUT 1–2']],[],'T6301A-3G mapping from the rear-module drawing'); return s; }},
];
function viewSchem(m){
  window.__m6205_3gActive=false;
  m.innerHTML = `${card('Schematic set — redrawn from the netlist and RTL (not the original CAD)', `<div id="tabs2" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px"></div><div id="sh"></div>`)}
    ${card('Source drawings in the archive', `<p class="small">JRTI/m6053g/Layout/8399AR-500-02-SCH-DR1.pdf (11 pages, OCT-2010, "4 CHANNEL (2 in, 4out) MD AUDIO MUX, DE-MUX"); 8399R-500-02-PCB-DR1.ipc; RV8399R-500-02-VEN-DR1 gerbers. The title block on the fab drawing 8399DR-500-02-CTL-DR1 is a Ross Video one (spec S000-073R).</p>`)}`;
  const draw=()=>{ m.querySelector('#tabs2').innerHTML=SHEETS.map((x,i)=>`<button class="${D.ui.sch===i?'on':''}" data-i="${i}">${x.t.split('·')[0]}${x.t.split('·')[1]}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ D.ui.sch=+b.dataset.i; draw(); });
    const S_=SHEETS[D.ui.sch]; m.querySelector('#sh').innerHTML=`<h3>${S_.t}</h3><svg viewBox="0 0 900 ${S_.h}" style="width:100%;font-family:var(--mono)">${S_.draw()}</svg>`; };
  draw();
}

/* ---------------- software ---------------- */
const APPSTEPS = [
  ['updateSettings','updateSettings(): DIPs only if dipsEnabled && !dashboardEnabled'],
  ['gs2970ReadVidInfo','gs2970ReadVidInfo(): 0x022, 0x006, 0x007, 0x01F–0x021'],
  ['resetIfNewLock','resetIfNewLock(): goInReset / wentInReset / resetHappened'],
  ['gs2970SetPayloadID','gs2970SetPayloadID(&vid, 1) + gs2962Set3GLevel(&vid, 0) — every pass'],
  ['appTask: audio groups','alteraWrite(0x22, getAudioGroups())'],
  ['desResetStatus','alteraRead(0x16) ≠ BIT4 → serDesReset()'],
  ['AudioDetect','getEmbeddedAudioInfo(): GS2970 0x202 / 0x403'],
  ['audioStat','alteraRead(0x30–0x33), 0x05, 0x41; getExtPairLock()'],
  ['setDtsStatus','setSdiStandard/Format, setEmbFormat, setExtFormat, setDtsStatus(0x20)'],
  ['writeLedReg','updateLeds() → writeLedReg(): 0x0F, 0x0E'],
  ['set1001Flag','set1001Flag (0x0D) · set50Flag (0x10) · sdiFormatSelector (0x04) · sendUpmixIputMode (0x06)'],
  ['reset loop','loopAfterReset: 0x09 = 0, then 1, then count to 10'],
  ['updateMuxAudio','updateMuxAudio(): 0x50–0x5F'],
  ['updateDboardInputs','updateDboardInputs(): 0x60–0x67'],
];
function stepOf(o){ if (!o) return -1; const fn=(o.fn||o.label||''); for (let i=APPSTEPS.length-1;i>=0;i--) if (fn.includes(APPSTEPS[i][0])) return i; if (/set50Flag|sdiFormatSelector|sendUpmix/.test(fn)) return 10; if (/CS8416|cs8416Read/.test(fn+o.label)) return 7; return -1; }
function viewSoft(m){
  window.__m6205_3gActive=false;
  m.innerHTML = `<div class="grid2"><div>${card('gearOS (Ross OGP-SDK-AVR zeuslib) — task running at the playhead', `<div id="os"></div>`)}${card('appTask() — the step at the playhead', `<div id="steps"></div>`)}${card('resetIfNewLock() state', `<div id="rsm"></div>`)}</div>
    <div>${card('FPGA register file (spi.v) at the end of the page', `<div id="regs" class="scroll" style="max-height:360px"></div>`)}${card('DTS daughter-card packet (dtsserial.c)', `<div id="pkt"></div>`)}${card('Boot order (main.c)', `<ol class="small" style="margin:0;padding-left:18px">${['wdgEnable(WDT_1000MS); initPorts(); clockInit() (timer0 CTC, OCR0 = 124 → 1 ms); setupCan(); SEI()','wait for CONF_DONE: up to 100 000 loop passes (≈275 ms '+'inferred'+') — Ali replaced "getSecond() < 5"','if ready: enableAltera / disableAltera / enableAltera with 10 ms gaps, alteraInitSpi(), initDtsSpi()','alteraWrite 0x16 |= 0x10 (GS2970 out of reset), 0x14 |= 0x10 (GS2962), 0x0D = 1 then 0 (loopback "to get clock to lock up")','initLeds(); cs8416Reset() (5 × wait(3000)); cs8416Init(1), (2); gs2970Init(); gs2962Init()','setBaseProductInfo("Ward-Beck Systems","M6205-3G-NLC",…); initSettings(); initParams(); initSettings() again; initMenus(); initStatusMonitor(); initCli(); initStackCheck()','ogpSendRestartTrap(); showVersion()','while (!isDtsSpiReady() && dtsReadyTime++ < 100000) — dtsReadyTime uninitialised; initDtsBoard() (12 × wait(60000) ≈ 630 ms + 3 commands)','initTaskList(): canReceive, appTask, reportStatus; idle = headroomCounter; timers reportStatus 1000, appTask 40, eeSaveTask 100 (no task → never runs); osRun()'].map(x=>`<li>${x}</li>`).join('')}</ol>`)}</div></div>`;
  const draw=()=>{ const t=absT(), tk=taskAt(t), o=opAt(t), f=fwAt(t)||{}, s=sched();
    const tasks=[['canReceive','can','highest priority; DashBoard SET/GET → settings.c set…() (may call the DTS card)'],['appTask','app','every 40 observed ticks (APPTASK_INTERVAL)'],['reportStatus','rep','every 1000 ticks: OID_SDI_STATUS, OID_DTS_STATUS'],['(eeSaveTask)','none','commented out of osTaskList; its timer finds NO_TASKID'],['idle: headroomCounter','idle','spins ≈1/8 ms, then WDR()']];
    const cur = tk? tk.kind : 'idle';
    m.querySelector('#os').innerHTML=`<table class="kv small">${tasks.map(([n,k,d])=>`<tr class="${(k===cur||(k==='app'&&cur==='reset'))?'hl':''}"><td><b>${n}</b></td><td>${d}</td></tr>`).join('')}</table><p class="small">At the playhead: <b>${tk?tk.label:'idle'}</b>${o?` · <span class="mono">${o.label}</span> <span class="muted">${o.fn||''}</span>`:''}</p><p class="small muted">${cur==='reset'?'resetAndInit() runs inside appTask: nothing else, CAN included, is served until it returns.':''}</p>`;
    const si = (tk && (tk.kind==='app'||tk.kind==='reset'))? stepOf(o) : -1;
    m.querySelector('#steps').innerHTML=`<ol class="small" style="margin:0;padding-left:18px">${APPSTEPS.map((x,i)=>`<li class="${i===si?'hl':''}">${x[1]}</li>`).join('')}</ol>`;
    m.querySelector('#rsm').innerHTML=`<svg viewBox="0 0 640 120" style="width:100%"><g font-size="11" fill="var(--ink)">
      ${[['NO LOCK',20,'wentInReset = 0'],['LOCK SEEN',170,'goInReset = 1'],['RESET DONE',320,'wentInReset = 1']].map(([n,x,d],i)=>{ const a = (i===0 && !f.wentInReset && !f.goInReset) || (i===1 && f.goInReset) || (i===2 && f.wentInReset && !f.goInReset); return `<rect x="${x}" y="20" width="120" height="44" rx="8" fill="${a?'var(--accent)':'var(--panel2)'}" stroke="var(--ink2)"/><text x="${x+60}" y="38" text-anchor="middle" fill="${a?'#fff':'var(--ink)'}" font-weight="700">${n}</text><text x="${x+60}" y="55" text-anchor="middle" fill="${a?'#fff':'var(--ink2)'}">${d}</text>`; }).join('')}
      <text x="20" y="90">resetHappened = ${f.resetHappened} · loopAfterReset = ${f.loopAfterReset} · resetAndInit() only when resetHappened = 0</text><text x="20" y="108" fill="var(--ink2)">LOCK SEEN → next pass → resetAndInit() → RESET DONE; any unlocked pass → NO LOCK</text></g></svg>`;
    const R=s.end.R; const names={0x00:'deviceID',0x01:'versionID',0x04:'video_xlnx_hdemb (line_std | groups_enabled)',0x05:'audio_present (HD groups) R',0x06:'dts_upmix',0x09:'control_status → update_done',0x0D:'MODE (loopback, detSel1)',0x0E:'led_h',0x0F:'led_l',0x10:'video1 (lock50 b3, lock_3g b4)',0x11:'gennum1 (Gennum select)',0x14:'SERIALIZER2 (b4 reset_n)',0x16:'RECEIVER2 (b4 reset_n)',0x20:'dolby_stat R',0x22:'sel_dolby (groups)',0x30:'audioFormat R'};
    let h='<table class="kv small mono"><tr><th>addr</th><th>value</th><th>spi.v name</th></tr>'; Object.keys(names).map(Number).forEach(a=>{ h+=`<tr><td>0x${hx(a)}</td><td>${R[a]!==undefined?'0x'+hx(R[a]):'—'}</td><td>${names[a]}</td></tr>`; });
    for (let k=0;k<16;k++) h+=`<tr><td>0x${hx(0x50+k)}</td><td>0x${hx(R[0x50+k]??0)}</td><td>ch${k+1}_sel → ${srcName(R[0x50+k]??0)}</td></tr>`;
    for (let k=0;k<8;k++) h+=`<tr><td>0x${hx(0x60+k)}</td><td>0x${hx(R[0x60+k]??0)}</td><td>ch${k+1}_sel_in → ${DBIN[R[0x60+k]??0]||'?'}</td></tr>`;
    m.querySelector('#regs').innerHTML=h+'</table>';
    const pre=PRESETS[f.preset||0]; const msg=[0x2F,0xF0,0x05,0x4A,(f.preset||0),0,0,0]; let acc=0xAA; msg.forEach(b=>acc+=b); while(acc>255) acc-=255; msg.push((~acc)&0xFF, 0x0D);
    m.querySelector('#pkt').innerHTML=`<p class="small">Build_Master_write_message(SET_NLC_PRESET_OPCODE 0x4A, board 0x05, msg_length 10): </p><div class="mono" style="display:flex;flex-wrap:wrap;gap:4px">${msg.map((b,i)=>`<span class="chip" title="${['"/" SLASH_CHAR','MSG_HDR','board type (NLC = 0x05)','opcode','preset ('+pre.name+')','0','0','0','CalcCheckSum: 0xAA + bytes, end-around carry, inverted','CARRIAGE_RETURN'][i]}">${hx(b)}</span>`).join('')}</div>
      <p class="small">Master_Transfer() then clocks out all <b>256</b> bytes of spi_data (CMD_BUFFER_SIZE; spi_tx_len is computed but never used), waits 3 × wait2(5000), reads single bytes until it sees "/" (CR or 1024 tries → FALSE), then reads 255 more. Each byte carries ${304+228+60} NOPs of bit delays: ≈${(DTS_X(true)*1000).toFixed(0)} ms per command ${inf}.</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewFindings(m){
  window.__m6205_3gActive=false;
  const F=[
    ['Artwork 2026|59: rear module and card edge now from the CorelDRAW files', `Rear: ${REAR_ART.src()} (also drawn in ${SIM.src('#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/M6205A-3G - Rear Module Options.cdr','M6205A-3G - Rear Module Options.cdr')}, 2012-01-09, same layout). Card edge: ${EDGE_ART.src()} — there is no 3G card-edge drawing, so the 3G LED that leds.c drives (bit 10) and the manual lists has no lens on any drawing; it is placed below META DATA here. The rear drawing’s DFR-8320-C caption and “Axillary AES Input” spelling are on the sheet; BNC2 is NOT USED. The earlier PNG cut-out (m6205-3g-rear-t6301a.png) is retired.`],
    ['Timers lose ticks during every long task', 'zeuslib common/clock.c updateClock(): <span class="mono">prevTick = ticks</span> (the <span class="mono">prevTick++</span> line is commented out), so updateTimers() runs once per osRun loop. An appTask pass of ≈5.7 ms (≈40 FPGA SPI accesses, 17 Gennum accesses — from the cycle counts) costs ≈4.7 ticks, so appTask runs about every 45 ms instead of 40 and reportStatus every ≈1.1 s. resetAndInit() and DTS commands (≈60 ms each) stretch them much further.'],
    ['Payload/serializer setup runs on every pass', 'apptask.c appTask(): <span class="mono">VidInfo pVidInfo</span> and <span class="mono">pSdoLevel = -1</span> are locals, so "if (sdoLevel != pSdoLevel …)" is always true: gs2970SetPayloadID() and gs2962Set3GLevel() (up to 8 Gennum writes and a read) repeat 25 times a second. <span class="mono">outputB</span> is computed and never used; the level is always A.'],
    ['DIP preset/output-mode change loops forever', 'settings.c updateSettings() only reads the DIPs when <span class="mono">dipsEnabled && !dashboardEnabled</span>, but setDtsNlcPreset() and setNlcOutputMode() only act <span class="mono">if (dashboardEnabled)</span>. A DIP flip never reaches the card and reportParamValue(OID 0x0F32 / 0x0F30) is sent on every pass.'],
    ['DIP numbering in the firmware ≠ the DIP sheet', 'NLC_Dipswitch.xls (2011|44-05-19) and the manual: DIP-3 Output Mode, DIP-4/5 Preset, DIP-9…12 Target Level. readDtsNlcPreset() uses BIT3/BIT2 (DIP-4/DIP-3), readNlcOutputMode() BIT4 (DIP-5), and nothing reads SW2 for NLC (nlcTargetLevel is forced to 16 = −24 dB). The manual\'s target table lists 16 levels for 3 switches.'],
    ['Router codes do not match the archived FPGA', 'dbparams.c output choices: 0x14–0x17 "Ext AES /SRC ON", 0x18–0x1F "DTS L…Rt" (default AES1–3). The newest archived FPGA, pETER/…/DTSv2/v106Bdts par_sel_2of40.v, decodes 0x14–0x1F as ext_aes3a…8b (ports commented out in AES_Test.v), the daughter-card outputs as 0x20–0x27 and SRC as 0x28–0x2B. The daughter-card <i>input</i> table (0x28–0x2B) does match. The FPGA that shipped with this firmware is not in the archive.'],
    ['Firmware pins vs. 2012 edit', 'obj/altspi.s (built 2011|44-05-12) drives the FPGA SPI on PE5/PE6/PE7 with MISO on PD0 — the board nets FPGA_LED_CLK/DATA/ST/LED_1. altspi.h/.c were edited 2012|45-11-29/30 to PC1/PC2/PC3 + PG1: PG1 is CS8416_SEL1 (cs8416.c) and PC2 is the DTS data-in (dtsserial.c SER_DATA_IN), and altspi._h swaps MOSI/MISO relative to altspi.h. The NLC source tree therefore no longer builds the binary that was tested.'],
    ['DTS bit-bang clears PORTB', 'dtsserial.c spi_write(): <span class="mono">p = PINB & 0x07; … PORTB = p;</span> writes 0 to PB3–PB7 on every bit: DSP_RESET (PB3) is pulled low and the PB6 pull-up is cleared.'],
    ['Master_Transfer sends 256 bytes for a 10-byte command', 'dtsserial.c: spi_drv_writebytes(spi_data, CMD_BUFFER_SIZE) ignores spi_tx_len; with ≈600 NOP cycles per byte a command takes ≈60 ms, and DashBoard\'s DTS Info menu (five Get_… calls inside canReceive) stalls the card ≈0.3 s.'],
    ['FPGA-upgrade verify reply is broken', 'zeuslib common/upgrade.c verifyUpgrade() (Ali-Add): on a CRC failure it writes <span class="mono">message[1] = OGP_INVALID_CRC</span> and then overwrites message[1] with requestType, leaving message[0] unset. The "used without modification" statement in M6205-3G_software.pdf no longer holds for zeuslib.'],
    ['Boot can outrun the FPGA', 'main.c: the "wait up to 10 seconds" loop on getSecond() was replaced by 100 000 counter passes (≈275 ms '+'inferred'+'). If CONF_DONE comes later, enableAltera() is skipped and PG3 holds the FPGA in reset; the card recovers only after 11 passes when serDesReset() calls resetAndInit(). <span class="mono">dtsReadyTime</span> is never initialised.'],
    ['initDtsBoard() on every new lock', 'wbsutils.c resetAndInit() ends with waitMillis(100) and initDtsBoard(): 12 × wait(60000) (630 ms at 7 cycles per count, obj/util.s) plus three DTS commands — about 1.1 s with no CAN service every time the SDI input re-locks.'],
    ['LEDs show the FPGA reset pattern during re-init', 'spi.v reset: led_l = 1010 1010 (HD, ERR, AUDIO 2, AUDIO 4 lit; led_h has no reset value). initLeds() only sets the software copies; writeLedReg() runs at the next appTask pass, ≈1 s later.'],
    ['Embedded-audio status uses the HD detector', 'appTask: embAudGrp = alteraRead(0x05) = group_det_hd. For SD input DashBoard shows "--" while the AUDIO LEDs (from GS2970 0x403) are lit. FPGA registers 0x07/0x08 (audio_present_sd) are never read.'],
    ['Leftovers', 'updateHardwareState() is never called (it would toggle PC1/PC3, which the 2012 altspi edit later uses for the FPGA). configureAudioDemux() is commented out. readExternalAudioStatus() returns 0. The NLC loudness readouts (Get_NLC_InShortAvg…) exist but their menu and monParams entries are commented out. eeSaveTask has a timer but no task. initSettings() is called twice.'],
    ['Naming leftovers', 'set1001Flag() writes MODE[4] = detSel1 (ICS662_SEL3) and overwrites the loopback bit in the same register every pass. Board nets keep DOLBY_* names for the DTS bus and FPGA_LED_* names for the SPI. altera.c comments say "M6205 Issue 5"; the silk says ISS6.'],
    ['Hardware documents', 'README says there is no SHARC on this board; the layout keeps U7 (DSP_DAI nets, ADSP-21262SKSTZ200 in the schematic part list) and the 2010|43-10-22 photo "M6205-3G Edit.jpg" (ISS5) shows it fitted. The rear-module photo is named "T6302A-3G" while the manual and drawing say T6301A-3G. The fab drawing title block is Ross Video\'s.'],
    ['PugMedia core vs. XAPP1014', 'JRTI\'s EgressVideo used the PugMedia vc_299m_291mo core; v106Bdts (2011|44-04) replaced it ("Ali-Rem") with Xilinx XAPP1014 hd_audio_mux_top ×4. Juan\'s June 2011 updates to the PugMedia core widen mpf_checksum_reg from 9 to 10 bits and add a cs_flag counter — the "CS errors" fix later cited by the production M6205 firmware.'],
  ];
  const builds = [
    ['Ali/M62053GNLC/M6205 (model)','2011|44-05-12 (+2012|45 altspi edit)','DTS NLC 5.1 (boardtype.h), COMP_ROUT routing, helptext, 49 files, 15 709 lines'],
    ['Ali/M62053Gdts/Atmel/M6205, backup1, backup2','2011|44-01-17','first DTS UpMix/MultiMerge integration (dtsboard.c)'],
    ['Ali/M62053Gdts/firstversion','2010|43-12-15','first DTS version'],
    ['Ali/M62053G/Atmel/M6205','2011|44-01-19','Dolby build with as.c FPGA upgrade, 6 262 lines'],
    ['Ali/M62053G/Atmel/test, testbackup1, backup1–6','2010|43-12-23 → 2011|44-01-18','JRTI code + FPGA reset after lock, Dolby menus, LED status, 3G-A output, 1/1.001 flag'],
    ['JRTI/m6053g/Code/Software/M6205_20101202.zip','2010|43-12-02','Glenn Greig\'s rewrite on the OGP-SDK-AVR (4 tasks)'],
    ['FPGA: pETER/Altera/Hardware/Progress v100a…v100test5v3, v502, DTSver/v102dts, DTSv2/v106Bdts','2010|43-12 → 2011|44-04','AES_Test Quartus projects; v106Bdts is the newest'],
    ['FPGA: JRTI/m6053g/Code/Hardware, PUG/m6205_3g_pug Milestone3/5','2010|43-11 → 2011|44-01','JRTI hand-off and PugMedia integration'],
  ];
  m.innerHTML = `${card('What the M6205-3G firmware and hardware are up to', `<ol class="small">${F.map(([a,b])=>`<li style="margin-bottom:6px"><b>${a}.</b> ${b}</li>`).join('')}</ol>`)}
    ${card('Builds in the folder (most complete one modelled)', `<table class="kv small"><tr><th>tree</th><th>dates</th><th>what it is</th></tr>${builds.map(r=>`<tr><td class="mono">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table>`)}
    ${card('Inferred in this model', `<ul class="small"><li>Cycle counts per SPI byte (≈20 cycles/bit from obj/altspi.s; DTS bytes from the NOP counts) and so every pass length.</li><li>GS2970 lock time (20 ms), EP2C35 configuration time (450 ms), AVR start-up (65 ms), the main() wait-loop pass (22 cycles).</li><li>When the DTS card answers "/" (40 bytes in).</li><li>The NLC loudness algorithm: first-order ballistics from the preset numbers; DTS's real algorithm is not in the archive.</li><li>LED colours from the manual, LED states during FPGA reset from spi.v reset values, power-up value 0 for led_h.</li><li>The FPGA load whose router decode matches the firmware.</li><li>DIP-1 at the left of SW1 and ON = up.</li></ul>`)}
    ${card('Artwork', `<p class="small">Card: rendered from JRTI/m6053g/Layout/RV8399R-500-02-VEN-DR1/L1-TOP.pho and ST.pho (RS-274-X, PADS 9.1) at 120 px/in, cropped to the board (x 0.95–13.80 in, y 0.95–4.03 in); the openGear logo on the silk is removed. Part positions from the IPC-D-356 netlist (offset +1.0 in, +1.0 in). Rear: ../M6205 - #Master #OPENGEAR/M6205 - #Engineering/M6205-3G rear module.cdr via Inkscape. Daughter card drawn plain from the 2011|44-06-30 photo; no third-party logos.</p>`)}`;
}

const FOOTNOTES = [
 {
  "text": "Rear artwork (2026|59) is from M6205-3G rear module.cdr (2011-04-27); the 2012 rear-module guide draws the same T6301A-3G.",
  "src": "#OPENGEAR #SERIES/M6205 - #Master #OPENGEAR/M6205 - #Engineering/M6205-3G rear module.cdr"
 },
 {
  "text": "The rear drawing spells the AES inputs “Axillary AES Input” (for Auxiliary).",
  "src": "#OPENGEAR #SERIES/M6205 - #Master #OPENGEAR/M6205 - #Engineering/M6205-3G rear module.cdr"
 },
 {
  "text": "BNC 2 of the T6301A-3G is drawn “NOT USED”; the drawing is captioned DFR-8320-C.",
  "src": "#OPENGEAR #SERIES/#OPEN GEAR - #Engineering/OPEN GEAR - #Engineering/openGear Rear Module Guides/M6205A-3G - Rear Module Options.cdr"
 },
 {
  "text": "There is no 3G card-edge drawing: the panel uses M6205-card-edge-v10.cdr, which has no lens for the 3G LED that leds.c drives.",
  "src": "#OPENGEAR #SERIES/M6205 - #Master #OPENGEAR/M6205 - #Engineering/M6205-card-edge-v10.cdr"
 },
 {
  "text": "M6205-3G NLC5.1 Presets.cdr has a Backup_of_ copy beside it, both dated 2011-06-02.",
  "src": "#OPENGEAR #SERIES/M6205 - #Master #OPENGEAR/M6205 - #Engineering/Backup_of_M6205-3G NLC5.1 Presets.cdr"
 }
];
SIM.register({footnotes:FOOTNOTES, 
  id:'m6205-3g', folder:'#OPENGEAR #SERIES/M6205-3G - #Master #OPENGEAR', family:'openGear',
  product:'M6205-3G', year:2010,
  name:`M6205-3G · 3G/HD/SD-SDI audio processor with DTS NLC (${Y(2010)})`,
  summary:'The openGear M6205A-3G de-embeds up to 16 channels from 3G, HD or SD-SDI, routes them with two AES inputs through a plug-in DTS or Dolby daughter card, and re-embeds them on two SDI outputs and four AES outputs. This model runs the 2011 DTS NLC 5.1 firmware (gearOS on an AT90CAN128) against a model of the Cyclone II register file, the Gennum GS2970/GS2962 and the DaySequerra card protocol.',
  highlights:['Card drawn from the JRTI ISS6 gerbers with live LEDs and DIP switches','gearOS timing worked out from the compiled code, including lost timer ticks','resetAndInit on every new lock: about 1.1 s with no CAN service','DTS daughter-card protocol, 256-byte transfers and NLC loudness ballistics','Firmware router codes against the archived FPGA decode'],
  depth:'Full model',
  duration:1,
  stepUnits:[ {label:'1 ms (timer0 tick)', period:()=>0.001}, {label:'40 ms (appTask interval)', period:()=>0.040}, {label:'1 SDI frame', period:()=>1/VF[world(absT()).fmt].fr}, {label:'1 SDI line', period:()=>lineT(VF[world(absT()).fmt])}, {label:'1 audio sample (48 kHz)', period:()=>1/48000}, {label:'1 FPGA SPI access (≈49 µs)', period:()=>C.ALT} ],
  zooms:[[1,'1 s (whole page)'],[0.2,'200 ms'],[0.05,'50 ms (≈1 appTask period)'],[0.01,'10 ms (one pass)'],[0.001,'1 ms'],[0.0002,'200 µs (FPGA SPI words)'],[0.00004,'40 µs (SPI bits)'],[0.00002,'20 µs (SDI lines)']],
  defaultZoom:0,
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
