/* =====================================================================
   M6202 — openGear HD/SD-SDI AES de-embedder with Dolby E / AC-3 decoding (Ward-Beck Systems)
   M6202A (firmware 1.0.x, 2008|41) and M6202AE (firmware 2.0.x, 2009|42); openGear twin of the POD31.
   Plugin for the WBS Device Simulator (../siumulation.html) · Full model

   Sources used (all in this archive, folder "#OPENGEAR #SERIES/M6202 - #Master #OPENGEAR"):
   - M6202 - #Engineering/M6202A/Software/atmel/v202/  (M6202AE 2.02, the build modelled first)
       v100w.c      main(): boot waits, ADC slot read, ALTERA_RESET, three write/read rounds, DIP decision,
                    while(1) loop; REFRESH_LEDS; ALTERA_SORT (register decode); SD_CLOCK_PHASE_CHECK
       M6202A.c     ALTERA_write (dolby_upper/dolby_lower bit map), SD_RESET, READ_GS1560_STATUS,
                    PROCESS_SDI_LOCK_STATUS, PROCESS_HD_SD_CONTROL, TRANSLATE/DEBOUNCE_INPUT, PROCESS_DIP_SWITCHES
       altera.c     write_data / read_data / read_data1 / read_data2 / ALTERA_read / ALTERA_RESET
       CAT552.c     CAT552_RESET, init_CAT552, RESET_DOLBY, DOLBY_DECODER_STATUS, DOLBY_CAT552_AUDIO_ERROR_CHECK
       CAN.c        timer0_ovf_isr (1 ms, SD_RESET), timer1_ovf_isr (96 µs, TX_HEARTBEAT / TX_SIGNALCHANGE),
                    CANinit (1 Mbit/s at 8 MHz), CAN_FUNCTIONS
       Dashboard.c  every DashBoard OID, menu, string and SET handler; PARAMETER_UPDATE; SAVE/RESTORE_INFORMATION_EEPROM
       M6202.h, CAT552.h, altera.h, common.c (wait, MIRROR), ADC.c/.h, V100W.mak (file list), *.lis (cycle counts),
       wbs_ztcpack.txt (bin/m6202ae_v2_02.bin), M6202AE SOFTWARE HISTORY.xls
   - …/atmel/v104 - not released/ (M6202A 1.04): M6202A.c (POD31 DIP decode, ALTERA_write with group_data),
       v100w.c (POD31-style loop), Dashboard.c (Mode / Group 1 / Group 2 selector, pod31_mode forced to 0), M62xx.h, dolby.c
   - …/altera/v102/ (FPGA "pod31", EP1C12Q240C6): pod31.qsf (pins), pod31.bdf (instances), HD_group_sel.vhd (DIDs),
       OUTPUT_SELECT.vhd, CAT552_switch.vhd, non_audio_detector.vhd (SMPTE 337 Pa/Pb), shift_in.vhd, switch_110.vhd,
       AES_enable.vhd, zero24_31.vhd, readme.txt;   altera/Obsolete/v200.zip, v201.zip (M6202.pof only)
   - m6202 operational ctl info (22 feb 08).doc  (ALTERA1–18 register map, v1 FPGA)
   - M6202A/Manual/v2000/M6202AE Manual .doc (LEDs, DIP table, DashBoard menus, Table 2 channel map, rear modules)
   - POD31MAN_ROUGH.doc (POD31 modes and DIP table)
   - M6202A/PCB/M6202A-iss3.bom / .net / .pnp and GERBERS/M6202A-ISS3.TOP/.TSM/.TSS (card artwork in assets/)
   - M6202A/Functional/*.cdr converted with Inkscape: M6202AE-FUNCTIONAL.cdr (8×2 / 2×1 routing), M6202AE Rear Modules.cdr
       (T6204 / T6304 / T6306), M6202-card-edge.cdr (LED column);  M6202A/Photos/M6202A Color.jpg (black mask, gold pads)
   Anything not in those files is marked "inferred" on screen. Format names are plain text; no third-party logos.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const infT = why => `<span class="tag-inf" title="Not stated in the source; inferred from ${String(why).replace(/"/g,'&quot;')}">inferred</span>`;
const hx = (v,n)=> (v>>>0).toString(16).toUpperCase().padStart(n||2,'0');
const bn = (v,n)=> (v>>>0).toString(2).padStart(n||8,'0');
const mirror = v => { let r=0; for (let i=0;i<8;i++) if (v&(1<<i)) r|=1<<(7-i); return r; };   // common.c MIRROR()
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');

/* ---------------- timing constants (source unless marked) ---------------- */
const F_CPU = 8e6;                         // BOM X1 8MHz; v100w.c "Crystal: 8.0000Mhz"
const WAIT_CYC = 7;                        // common.lis _wait: wdr, subi, sbci, cpi, cpc, brne(2)
const W = n => n*WAIT_CYC/F_CPU;           // wait(n) in seconds
const T0 = 125*64/F_CPU;                   // timer0: prescale 64, TCNT0 = 0x83 → 1.000 ms ("for 100us" comment is wrong)
const T1 = 12*64/F_CPU;                    // timer1: TCNT1 = 0xFFF4 → 96 µs
const TX_HEARTBEAT = 10000, TX_SIGNALCHANGE = 1000;   // CAN.c
const SWITCH1_DEBOUNCE = 255;              // M6202.h
const SD_STABLE = 165;                     // SD_AUDIO_STABLE_COUNTER_CONSTANT (timer0 ticks)
const RESET_VECTOR_CONSTANT = 2;
const DOLBY_ERROR_COUNTER = 5000, DOLBY_CAT_AUDIO_ERROR_COUNTER = 10000;
const NA_HOLD = 32767/48000;               // non_audio_detector: count = "111111111111111" LRCLK frames
const CFG_BITS = 2323240, CFG_CLK = 17e6;  // EP1C12 configuration size, AS DCLK — inferred (Cyclone family figures)
const CFG_T = CFG_BITS/CFG_CLK;            // ≈ 0.137 s
const T_GSLOCK = 0.012;                    // GS1559 lock after carrier — inferred
const CAN_BIT = 1e-6;                      // CANBT1..3 → 1 Mbit/s at 8 MHz (CAN.c CANinit)
/* main-loop cost in CPU cycles, estimated from the ICCAVR listings (write_data ≈ 12 cyc/bit, read_data ≈ 13 cyc/bit) */
const CY = { wdr:5, gs:28, lock:46, hdsd:20, deb:34, dip:84, write:60+6*104, read:3*10+18*112, sort:9*46+360, set:42, align:30, leds:330, can:56 };
const WBIT = 12/F_CPU, RBIT = 13/F_CPU, BYTE_OVH = 8/F_CPU;

/* ---------------- SDI formats (GS1559 is SD/HD only) ---------------- */
const VF = {
  sd525:    {name:'SD 525i/59.94',  sd:1, clk:27e6,          spl:1716, act:1440, hdr:4, lines:525,  fr:30000/1001, il:1, sw:[10,273], dash:'SD 525',          a1:0x00, a3:0x02, rate:'270 Mb/s'},
  sd625:    {name:'SD 625i/50',     sd:1, clk:27e6,          spl:1728, act:1440, hdr:4, lines:625,  fr:25,         il:1, sw:[6,319],  dash:'SD 625',          a1:0x00, a3:0x01, rate:'270 Mb/s'},
  hd1080i59:{name:'HD 1080i/59.94', sd:0, clk:74.25e6/1.001, spl:2200, act:1920, hdr:8, lines:1125, fr:30000/1001, il:1, sw:[7,569],  dash:'HD 1080i/59.94',  a1:0x06, a3:0x00, rate:'1.485/1.001 Gb/s'},
  hd1080i50:{name:'HD 1080i/50',    sd:0, clk:74.25e6,       spl:2640, act:1920, hdr:8, lines:1125, fr:25,         il:1, sw:[7,569],  dash:'HD 1080i/50',     a1:0x05, a3:0x00, rate:'1.485 Gb/s'},
  hd720p59: {name:'HD 720p/59.94',  sd:0, clk:74.25e6/1.001, spl:1650, act:1280, hdr:8, lines:750,  fr:60000/1001, il:0, sw:[7],      dash:'HD 720p/59.94',   a1:0x0A, a3:0x00, rate:'1.485/1.001 Gb/s'},
  hd1080p24:{name:'HD 1080PsF/23.98', sd:0, clk:74.25e6/1.001, spl:2750, act:1920, hdr:8, lines:1125, fr:24000/1001, il:1, sw:[7,569], dash:'HD 1080p/23.98', a1:0x04, a3:0x10, rate:'1.485/1.001 Gb/s'},
};
const DID = { hd:['0x2E7','0x1E6','0x1E5','0x2E4'], sd:['0x2FF','0x1FD','0x1FB','0x2F9'] };   // HD_group_sel.vhd group1_ID… ; SMPTE 272M
const GCOL = ['--accent','--accent2','--warn','--bad'];
const TYPE = { P:'PCM', E:'Dolby E', D:'Dolby Digital (AC-3)', N:'none' };

/* Dolby programme configurations → decoder channels 1..8 (M6202AE manual, Table 2) */
const PROG = {
  '5.1+2':   {kind:'E', ch:['1L','1R','1C','1LFE','1Ls','1Rs','2L','2R']},
  '5.1+1+1': {kind:'E', ch:['1L','1R','1C','1LFE','1Ls','1Rs','2C','3C']},
  '4+4':     {kind:'E', ch:['1L','1R','1C','1S','2C','2S','2L','2R']},
  '2+2+2+2': {kind:'E', ch:['1L','1R','3L','3R','4L','4R','2L','2R']},
  '5.1':     {kind:'E', ch:['1L','1R','1C','1LFE','1Ls','1Rs',null,null]},
  '1+1+1+1+1+1+1+1': {kind:'E', ch:['1C','2C','3C','4C','5C','6C','7C','8C']},
  '3/2L':    {kind:'D', ch:['1L','1R','1C','1LFE','1Ls','1Rs',null,null]},
  '3/2':     {kind:'D', ch:['1L','1R','1C',null,'1Ls','1Rs',null,null]},
  '2/0':     {kind:'D', ch:['1L','1R',null,null,null,null,null,null]},
};
/* decoded-channel test tones (simulation choice, not from the archive) */
const CHF = {L:300, R:400, C:500, LFE:60, Ls:700, Rs:800, S:600};
const toneOf = lab => { if (!lab) return null; const m=/^(\d)(.*)$/.exec(lab); const p=+m[1], k=m[2]; return (CHF[k]||450) + (p-1)*1100; };

/* =====================================================================
   WORLD (what is plugged in and set) — piecewise constant, edited at the playhead
   ===================================================================== */
const SCN = {
  steady:{label:'Running (steady state)', end:1.0, pages:[[0,'0 – 1 s']]},
  plug:  {label:'SDI cable plugged in at 50 ms', end:1.0, pages:[[0,'0 – 1 s']]},
  boot:  {label:'Power-up (main() boot, FPGA reconfigured)', end:2.0, pages:[[0,'0 – 1 s · boot waits, ALTERA_RESET, first loop'],[1,'1 – 2 s · running']]},
  nodec: {label:'Decoder module missing (DOLBY_ERROR_COUNTER resets)', end:3.0, pages:[[0,'0 – 1 s'],[1,'1 – 2 s'],[2,'2 – 3 s']]},
};
function baseWorld(){ return {
  cable:true, fmt:'hd1080i59',
  grp:[{on:true,p:['E','P']},{on:true,p:['P','P']},{on:false,p:['P','P']},{on:false,p:['P','P']}],
  prog:'5.1+2', ac3:'3/2L', dialnorm:-27,
  dip:[false,false,true,false,false,false,false,false],          // SW3 ON = Dolby decoding (manual DIP table); others OFF
  cat:true, rear:'T6204', slot:3,
}; }
const D = {
  build:'AE', scn:'steady', page:0, base:baseWorld(), ev:[], log:[], lastTrace:[],
  fw:{ downmix:0, dialnorm:0, pcm:1, notify:1, eeprom:{valid:false, pcm:1, downmix:0, dialnorm:0, notify:1} },
  scope:1, selChip:null, dashTab:'status', dashNode:'status', ui:{},
};
const page0 = ()=> SCN[D.scn].pages[Math.min(D.page, SCN[D.scn].pages.length-1)][0];
const absT = t => page0() + (t===undefined? SIM.t : t);
let WC=null, WKEY='';
function world(t){
  const key = JSON.stringify([D.base, D.ev]);
  if (key!==WKEY){ WKEY=key; WC=[]; let w=JSON.parse(JSON.stringify(D.base)); WC.push({t:-Infinity, w});
    for (const e of D.ev){ if (e.k==='dash') continue; w=JSON.parse(JSON.stringify(w)); applyEv(w,e); WC.push({t:e.t, w}); } }
  let lo=0, hi=WC.length-1; while (lo<hi){ const m=(lo+hi+1)>>1; if (WC[m].t<=t) lo=m; else hi=m-1; }
  return WC[lo].w;
}
function applyEv(w,e){ if (e.k==='grp') w.grp=JSON.parse(JSON.stringify(e.v)); else if (e.k==='dip') w.dip=e.v.slice(); else w[e.k]=e.v; }
function lastEv(keys, t){ let r=-1e9; for (const e of D.ev){ if (e.t>t) break; if (keys.includes(e.k)) r=e.t; } return r; }
function addEv(k, v){ const t=absT(); D.ev = D.ev.filter(e=> !(e.k===k && e.k!=='dash' && e.t >= t-1e-9)); D.ev.push({t,k,v}); D.ev.sort((a,b)=>a.t-b.t); }

/* =====================================================================
   HARDWARE / FPGA MODEL (functions of time)
   ===================================================================== */
function fmtAt(t){ return VF[world(t).fmt]; }
function lockSince(t){ return Math.max(lastEv(['cable','fmt'],t), -1e8) + T_GSLOCK; }
function gsLocked(t){ const w=world(t); return w.cable && t >= lockSince(t); }               // GS1559 LOCK / SMPTE / ~RC_BYP pins
function frameT(f){ return 1/f.fr; }
/* group present (HD: group_detectorHD looks for the group DID; SD: SD403 demux) — one frame to declare (inferred) */
function grpPresent(g, t){ const w=world(t); if (!gsLocked(t) || !w.grp[g].on) return false; return t >= Math.max(lockSince(t), lastEv(['grp','fmt','cable'],t)) + frameT(fmtAt(t)); }
/* SMPTE 337 bursts: Dolby E once per video frame, AC-3 every 1536 samples (32 ms) */
function burstPeriod(type, f){ return type==='E' ? frameT(f) : 1536/48000; }
function burstLen(type, f){ return type==='E' ? frameT(f)*0.9 : 448/48000; }      // E: guard band ≈ 10 % (inferred); AC-3 448 kb/s → 1792 bytes = 448 frames (inferred rate)
function burstPhase(type, f){ return type==='E' ? frameT(f)*0.05 : 0.0031; }       // inferred
function pairType(g, pr, t){ const w=world(t); return w.grp[g].on ? w.grp[g].p[pr] : 'N'; }
function lastBurstBefore(type, f, t){ const P=burstPeriod(type,f), ph=burstPhase(type,f); return Math.floor((t-ph)/P)*P+ph; }
/* non_audio_detector: flag set 2 frames after Pa/Pb, held 32767 frames after the last sync (≈ 0.683 s) */
function compressedFlag(g, pr, t){
  if (!grpPresent(g,t)) return null;
  const w=world(t), f=fmtAt(t), ty=pairType(g,pr,t);
  const since = Math.max(lastEv(['grp','fmt','cable'],t), -1e8);
  if (ty==='E' || ty==='D'){ const first = lastBurstBefore(ty,f,since)+burstPeriod(ty,f); if (t >= first + 2/48000) return ty;
    return heldFrom(g,pr,since,t); }
  return heldFrom(g,pr,since,t);
}
function heldFrom(g,pr,since,t){ // a pair that stopped being compressed keeps the flag for NA_HOLD after its last burst
  if (since<-1e7) return 'P'; const before = world(since-1e-9), ty=before.grp[g].on? before.grp[g].p[pr] : 'N';
  if (ty!=='E' && ty!=='D') return 'P'; const lb = lastBurstBefore(ty, VF[before.fmt], since);
  return (t < lb + NA_HOLD) ? ty : 'P';
}
/* DIP as seen by the FPGA (dip1..dip8 pins 181-188, pulled up: ON = 0) */
function dipRaw(w){ let v=0; for (let i=0;i<8;i++) if (!w.dip[i]) v|=1<<i; return v; }
/* AE routing (FPGA v201 is only a .pof): taken from the manual + M6202AE-FUNCTIONAL.cdr — inferred implementation */
function dipDecodeAE(w){ const r=dipRaw(w);
  return { dolbyEn: !(r&4), downmixAES4: !(r&2), selAES: (r&8)?0:1, grp: ((r&16)?0:2) + ((r&32)?0:1), sw7:!!(r&64), sw8:!!(r&128) }; }
function dipDecodeA(w){ const r=dipRaw(w);   // v1.04 PROCESS_DIP_SWITCHES after MIRROR (bit i = SW i+1, inferred order)
  return { g1: ((r&1)?0:2) + ((r&2)?0:1), g2: ((r&4)?0:2) + ((r&8)?0:1), sw7:!!(r&64), sw8:!!(r&128) }; }

/* ---------------- CAT552 decoder module ---------------- */
function decInput(t){ const w=world(t), d=dipDecodeAE(w); return {g:d.grp, pr:d.selAES, ty:pairType(d.grp,d.selAES,t)}; }
function decState(t, resets){
  const w=world(t);
  if (!w.cat) return {st:'absent'};
  for (const r of resets) if (t>=r.t0 && t<r.t1) return {st:'reset', r};
  if (!gsLocked(t)) return {st:'idle'};
  const inp = decInput(t), f=fmtAt(t);
  let lastR=-1e9; for (const r of resets) if (r.t1<=t) lastR=Math.max(lastR,r.t1);
  const since = Math.max(lastR, lastEv(['grp','fmt','cable','dip','prog','ac3'],t), lockSince(t));
  const ty = grpPresent(inp.g,t) ? inp.ty : 'N';
  if (ty==='E'){ const acq = 2*frameT(f); return t>=since+acq ? {st:'E', since:since+acq} : {st:'acq', ty, until:since+acq}; }   // 2 Dolby E frames — inferred
  if (ty==='D'){ const acq = 3*1536/48000; return t>=since+acq ? {st:'D', since:since+acq} : {st:'acq', ty, until:since+acq}; } // 3 AC-3 frames — inferred
  if (ty==='P') return {st:'PCM'};
  return {st:'idle'};
}

/* =====================================================================
   FIRMWARE EMULATOR — main() and while(1) of v100w.c, the timer0 ISR (SD_RESET),
   the shift-register bus to the FPGA and the CAT552 reset line, run against the world.
   ===================================================================== */
const DASH_SET = {   // SET_PARAM handlers in Dashboard.c (v202) / (v104): which ones really store the value
  AE:{ 0x0703:'dialnorm', 0x0704:'downmix', 0x0708:'pcm', 0x0400:'notify', 0x0301:'save',
       0x0701:null, 0x0702:null, 0x0705:null, 0x0706:null, 0x0707:null },
  A: { 0x0303:'g1', 0x0304:'g2', 0x0305:'autoswap', 0x0302:null, 0x0400:'notify', 0x0301:'save' },
};
let S=null, SKEY='';
function sched(){ const key=JSON.stringify([D.build,D.scn,D.base,D.ev,D.fw]); if (key===SKEY && S) return S; SKEY=key; S=emulate(); return S; }

function emulate(){
  const AE = D.build==='AE', sc=SCN[D.scn], END=sc.end;
  const st = { ops:[], xf:[], isr:[], sdrst:[], resets:[], cfg:[], can:[], notes:[], changes:[], leds:{}, snaps:[], bootOps:[], end:END };
  ['sd','hd','err','a1','a2','a3','a4','d1','d2','d3','d4','com','cerr'].forEach(n=> st.leds[n]=[[-1e9,0]]);
  const c = { t:0, pass:-1, op:null };
  const configured = t => !st.cfg.some(g=> t>=g.t0 && t<g.t1);
  const fw = D.fw;
  const M = { CD:0, sdi_format:0, release1:0, switch1:0, switch1_counter:0, dip_switch_enabled:1, dashboard_enabled:1,
    dolby_selector:0, group3_sel:0, dolby_swap:0, dolby_enabled:1, dolby_stereo_output:0,
    dolby_upper:0xFF, dolby_lower:0xFF, ALT:new Array(19).fill(0), DIP:0xFF,
    reset_enable:0, reset_counter:RESET_VECTOR_CONSTANT, sd_audio_stable_counter:SD_STABLE, sd_audio_stable:0,
    flags:{}, pflags:{}, sdi_change:0, agd:0, emb:0, fmt:[0,0,0,0,0,0,0,0], comp:[0,0,0,0,0,0,0,0], lock:[0,0,0,0,0,0,0,0],
    Dolby_card_status:1, dolby_counter:0, Dolby_decoder_functioning:1, chk_done:1, cat_err_ctr:0, cat_ok_ctr:0,
    downmix:fw.downmix, dialnorm:fw.dialnorm, pcm:fw.pcm, notify:fw.notify, pdownmix:0xFF, pdialnorm:0xFF, ppcm:0xFF,
    error_checker:0, data_sync_verified:0, g1:0, g2:1, autoswap:1, save:0, interrupt:'' };
  const led = (n,on)=>{ const h=st.leds[n]; if (h[h.length-1][1]!==(on?1:0)) h.push([c.t,on?1:0]); };
  const snap = ()=>({ CD:M.CD, sdi_format:M.sdi_format, DIP:M.DIP, dolby_enabled:M.dolby_enabled, dolby_selector:M.dolby_selector, group3_sel:M.group3_sel, dolby_stereo_output:M.dolby_stereo_output,
    dip_switch_enabled:M.dip_switch_enabled, dashboard_enabled:M.dashboard_enabled, dolby_upper:M.dolby_upper, dolby_lower:M.dolby_lower, ALT:M.ALT.slice(), reset_enable:M.reset_enable, reset_counter:M.reset_counter,
    sd_audio_stable:M.sd_audio_stable, sd_audio_stable_counter:M.sd_audio_stable_counter, Dolby_card_status:M.Dolby_card_status, dolby_counter:M.dolby_counter, lock:M.lock.slice(), agd:M.agd, emb:M.emb,
    downmix:M.downmix, dialnorm:M.dialnorm, pcm:M.pcm, notify:M.notify, g1:M.g1, g2:M.g2, switch1_counter:M.switch1_counter, error_checker:M.error_checker });
  function begin(step,label){ dashUpTo(c.t); isrUpTo(c.t); c.op={step,label,t0:c.t,t1:c.t,pass:c.pass}; st.ops.push(c.op); }
  function end(cyc){ c.t += (cyc||10)/F_CPU; c.op.t1=c.t; }
  function chg(what){ st.changes.push({t:c.t, what}); }

  /* ---- FPGA side of the shift-register bus ---- */
  function fpgaRead(t){   // the 18 bytes clocked out after STROBE_READ (as stored by ALTERA_read, before MIRROR)
    const A = new Array(19).fill(0);
    if (!configured(t)){ for (let i=1;i<=18;i++) A[i]=0xFF; return A; }       // unconfigured I/O read high — inferred
    const w=world(t), f=fmtAt(t), lk=gsLocked(t);
    let gd=0; for (let g=0;g<4;g++) if (grpPresent(g,t)) gd|=1<<g;
    const a1 = lk? (f.a1 | (gd<<4)) : 0, a3 = lk? f.a3 : 0;
    let emb=0; if (lk && f.sd) for (let g=0;g<4;g++) if (gd&(1<<g)) emb |= 0xF<<(g*4);
    const fmtNib = (g,pr)=>{ const cf=compressedFlag(g,pr,t); if (!cf || cf==='P') return 0; return 8 | (cf==='D'?1:2); };   // v201 3-bit code (M6202.h PC_DOLBY_AC3=1, PC_DOLBY_E=2) — inferred encoding
    A[1]=mirror(a1); A[2]=0xFF; A[3]=mirror(a3); A[4]=mirror(emb&0xFF); A[5]=mirror((emb>>8)&0xFF); A[6]=0xA8;
    for (let g=0;g<4;g++) A[13+g] = mirror(fmtNib(g,0) | (fmtNib(g,1)<<4));
    A[17] = AE ? dipRaw(w) : 0; A[18]=0xA8;
    if (!AE){ A[13] = mirror(dipRaw(w)); }   // v1: ALTERA13 = DIP switch byte (operational ctl info), read through MIRROR
    return A;
  }
  function decErrPin(t){ const ds=decState(t, st.resets); return (ds.st==='absent' || ds.st==='reset') ? 0 : 1; }   // P5-70 ERR → FPGA → ALTERA13 net → PINC2 (inferred polarity)

  /* ---- MCU bus primitives ---- */
  function ALTERA_write(from){
    if (AE){ // M6202A.c (v202): PME, OS0/CAT1/CAT0 cleared, MAP from downmix, PRG=111, DLM from dialnorm, PLE/PLS/PGP=1
      let u=M.dolby_upper, l=M.dolby_lower;
      if (M.pcm===1) u|=0x40; else u&=~0x40; u&=~0x38;
      if (M.downmix===1){ u|=4; u&=~2; } else { u|=6; }
      u|=1; l|=0xC0; if (M.dialnorm===1) l&=~0x38; else l|=0x38; l|=7;
      M.dolby_upper=u&255; M.dolby_lower=l&255;
    } else { // v104: OS = pod31_mode (forced 0), CAT = cat_input1-0x31
      M.dolby_upper = (M.dolby_upper & ~0x78) & 255; M.dolby_lower = 0xFF;
    }
    const grp = AE ? null : ((M.g1<<1) | ((M.g2<<1)<<3));
    const bytes = [M.dolby_upper, M.dolby_lower, AE?null:0x00, AE?null:0x00, 0x00, grp];   // null = uninitialised stack byte (v202)
    const t0=c.t; c.t += 6*(8*WBIT+BYTE_OVH) + 6/F_CPU;
    st.xf.push({t0, t1:c.t, w:1, bytes, from});
  }
  function ALTERA_read(){
    const t0=c.t; const A=fpgaRead(t0);
    c.t += 18*(8*RBIT+BYTE_OVH) + 18/F_CPU;
    st.xf.push({t0, t1:c.t, w:0, bytes:A.slice(1), from:'ALTERA_read'});
    for (let i=1;i<=18;i++) M.ALT[i]=A[i];
    if (AE) M.DIP = M.ALT[17]; else M.DIP = mirror(M.ALT[13]);
  }
  function CAT552_RESET(delay, from){   // CAT552.c: RESET_552 (dolby_upper bit 7) low, ALTERA_write, wait(delay), high, ALTERA_write
    M.dolby_upper &= 0x7F; ALTERA_write(from+' → CAT552_RESET: RESET_552 low'); const r0=c.t;
    c.t += W(delay); M.dolby_upper |= 0x80; ALTERA_write(from+' → CAT552_RESET: RESET_552 high');
    st.resets.push({t0:r0, t1:c.t, why:from, delay});
  }

  /* ---- timer0_ovf_isr every 1 ms: SD_RESET + sd_audio_stable (v202, SDI_RESET_ENABLED) ---- */
  let next0 = 1e9;
  function isrUpTo(t){
    while (next0 <= t){
      const ti=next0; next0 += T0; if (!AE) { continue; }
      const saveT=c.t; c.t=Math.max(ti, st.isr.length? st.isr[st.isr.length-1].t1 : -1);
      const t0=c.t; let what='';
      if (M.CD){
        if (M.reset_enable && M.reset_counter){ M.reset_counter--; M.sd_audio_stable_counter=SD_STABLE; const was=st.sdrst.length && st.sdrst[st.sdrst.length-1].t1>=t0-T0*1.5 && st.sdrst[st.sdrst.length-1].open; if (!was) st.sdrst.push({t0, t1:t0+T0, open:true}); else st.sdrst[st.sdrst.length-1].t1=t0+T0; what='SD_RESET: SD_RESET_ACTIVE (PA5 low), reset_counter → '+M.reset_counter; }
        else { if (M.reset_enable){ CAT552_RESET(1000,'timer0_ovf_isr → SD_RESET'); M.chk_done=0; M.cat_err_ctr=0; M.cat_ok_ctr=0; what='SD_RESET: CAT552_RESET(1000) inside the ISR, SD_RESET_INACTIVE'; }
          if (st.sdrst.length) st.sdrst[st.sdrst.length-1].open=false;
          M.reset_enable=0; M.reset_counter=RESET_VECTOR_CONSTANT; }
      } else M.reset_counter=RESET_VECTOR_CONSTANT;
      if (M.sdi_format && M.sd_audio_stable_counter===0) M.sd_audio_stable=1; else { if (M.sd_audio_stable_counter) M.sd_audio_stable_counter--; M.sd_audio_stable=0; }
      c.t += 70/F_CPU;
      if (what) st.isr.push({t0, t1:c.t, what}); 
      const dt = c.t - t0; c.t = Math.max(saveT, saveT + (dt>0.0002? dt : 0));
    }
  }
  /* ---- CAN SET_PARAM from DashBoard (can_rx_isr → DASHBOARD_RESPONSE_SETUP) ---- */
  const dashEv = D.ev.filter(e=>e.k==='dash'); let di=0;
  function dashUpTo(t){
    while (di<dashEv.length && dashEv[di].t<=t){ const e=dashEv[di++]; const v=e.v; const map=DASH_SET[D.build];
      st.can.push({t0:e.t, t1:e.t+frameDur(6), dir:'rx', label:`SET_PARAM 0x${hx(v.oid,4)} = ${v.val}`});
      let stored=false, var_=map[v.oid];
      if (var_==='save'){ M.save=1; stored=true; }
      else if (var_==='notify'){ M.notify=v.val; stored=true; }
      else if (var_ && M.dashboard_enabled){ M[var_]=v.val; stored=true; }
      const echo = stored? v.val : (var_===undefined? null : curParam(v.oid));
      st.can.push({t0:e.t+frameDur(6)+40e-6, t1:e.t+2*frameDur(6)+40e-6, dir:'tx', label: echo===null? `RESPONSE 0x${hx(v.oid,4)} CANRESP_UNSUPPORTED` : `RESPONSE 0x${hx(v.oid,4)} = ${echo}${stored?'':' (value ignored, current one echoed)'}`});
      st.notes.push({t:e.t, txt:`DashBoard SET 0x${hx(v.oid,4)} → ${stored?'stored in '+(var_):'not stored'}`});
      chg('param 0x'+hx(v.oid,4));
    }
  }
  function curParam(oid){ return ({0x0701:M.dolby_enabled,0x0702:M.dolby_selector,0x0705:M.group3_sel,0x0706:M.dolby_swap,0x0707:M.dolby_stereo_output,0x0302:0})[oid] ?? 0; }

  /* ---- PROCESS_DIP_SWITCHES ---- */
  function dipAE(){ const d=M.DIP; M.dolby_selector=0; M.group3_sel=0; M.dolby_swap=0; M.dolby_enabled=1; M.dolby_stereo_output=0;
    if (!(d&2)) M.dolby_stereo_output=1; if (d&4) M.dolby_enabled=0;
    if (!(d&16)) M.dolby_selector+=4; if (!(d&32)) M.dolby_selector+=2; if (!(d&8)) M.dolby_selector+=1;
    if (!(d&16)) M.group3_sel+=2; if (!(d&32)) M.group3_sel+=1; }
  function dipA(){ if (M.dip_switch_enabled && !M.dashboard_enabled){ const d=M.DIP; let a1=0,a2=0; if (!(d&2)) a1+=2; if (!(d&1)) a1+=4; if (!(d&8)) a2+=2; if (!(d&4)) a2+=4; M.g1=a1>>1; M.g2=a2>>1; } }

  /* ---- ALTERA_SORT (v202) ---- */
  function sortAE(){
    const A=M.ALT; if (!(A[6]===0xA8 && A[18]===0xA8)) return 'ALTERA6/18 ≠ 0xA8 → NOP (values kept from the last good read)';
    const a1=mirror(A[1]), a3=mirror(A[3]);
    if (M.CD){
      const F={fr50:a1&1, fr60:(a1>>1)&1, l1080:(a1>>2)&1, l720:(a1>>3)&1, l625:a3&1, l525:(a3>>1)&1, l5994:(a3>>3)&1, fr24:(a3>>4)&1, fr30:(a3>>5)&1, fr25:(a3>>6)&1, sd:M.sdHdPin};
      M.flags=F; M.agd=(a1>>4)&15; M.emb=(mirror(A[5])<<8)|mirror(A[4]);
      for (let g=0;g<4;g++){ const v=mirror(A[13+g]); M.fmt[g*2]=v&7; M.comp[g*2]=(v>>3)&1; M.fmt[g*2+1]=(v>>4)&7; M.comp[g*2+1]=(v>>7)&1; }
      let txt='';
      if (M.dolby_enabled && M.sd_audio_stable){
        M.Dolby_card_status = decErrPin(c.t) ? 1 : 0;                                   // DOLBY_DECODER_STATUS
        if (M.Dolby_card_status===0){ if (M.dolby_counter<=DOLBY_ERROR_COUNTER) M.dolby_counter++; else { M.Dolby_decoder_functioning=0; M.dolby_counter=0; M.Dolby_card_status=1; M.reset_enable=1; M.reset_counter=RESET_VECTOR_CONSTANT; CAT552_RESET(1000,'RESET_DOLBY (dolby_counter > 5000)'); txt+=' · RESET_DOLBY → CAT552_RESET(1000), reset_enable'; chg('Dolby_card_status'); } }
        else { M.Dolby_decoder_functioning=1; M.dolby_counter=0; }
        if (!M.chk_done){ const me=(a3>>2)&1; if (me){ M.cat_ok_ctr=0; if (M.cat_err_ctr<=DOLBY_CAT_AUDIO_ERROR_COUNTER) M.cat_err_ctr++; else { M.cat_err_ctr=0; M.chk_done=1; M.reset_enable=1; CAT552_RESET(1000,'DOLBY_CAT552_AUDIO_ERROR_CHECK'); } }
          else { M.cat_err_ctr=0; if (M.cat_ok_ctr<=DOLBY_CAT_AUDIO_ERROR_COUNTER) M.cat_ok_ctr++; else { M.cat_ok_ctr=0; M.chk_done=1; } } }
      }
      const keys=['sd','l525','l625','fr30','fr24','fr50','fr60','l1080','l720','l5994'];
      if (keys.some(k=>M.pflags[k]!==F[k])){ M.sdi_change=1; if (!M.reset_enable) M.reset_enable=1; M.pflags=Object.assign({},F); txt+=' · SDI format changed → sdi_change, reset_enable = YES'; chg('SDI'); }
      return 'CD: lock flags, formats, Emb_Astatus decoded'+txt;
    } else {
      M.flags={}; M.agd=0; M.emb=0; M.fmt.fill(0); M.comp.fill(0); M.sd_audio_stable_counter=SD_STABLE; M.sd_audio_stable=0; M.sdi_format=0;
      return 'no CD: everything cleared, SD_RESET_ACTIVE, sd_audio_stable_counter = 165';
    }
  }
  function lockCode(i){ if (!M.comp[i]) return 1; return M.fmt[i]===1? 3 : M.fmt[i]===2? 4 : 2; }   // PCM 1, COMPRESSED 2, DOLBY_AC3 3, DOLBY_E 4
  function refreshLeds(){
    const was=M.lock.join();
    if (M.sdi_format===1){ led('hd',0); led('err',0); led('sd',1); } else if (M.sdi_format===2){ led('hd',1); led('sd',1); led('err',0); }
    else if (M.CD){ led('hd',0); led('err',0); led('sd',1); } else { led('hd',0); led('sd',0); led('err',1); }
    if (M.sdi_format===2){ for (let g=0;g<4;g++){ const on=(M.agd>>g)&1; M.lock[g*2]=on?lockCode(g*2):0; M.lock[g*2+1]=on?lockCode(g*2+1):0; led('a'+(g+1),on); } }
    else { for (let g=0;g<4;g++) led('a'+(g+1), (M.emb>>(g*4))&15); for (let i=0;i<8;i++) M.lock[i] = (((~M.emb)>>(i*2))&3)===0 ? lockCode(i) : 0; }
    for (let g=0;g<4;g++) led('d'+(g+1), M.lock[g*2]>2 || M.lock[g*2+1]>2);
    if (M.lock.join()!==was) chg('AES lock');
  }

  /* ---------------- main() boot ---------------- */
  function bootMain(){
    const B=(lab,dt)=>{ const o={step:'B', label:lab, t0:c.t, t1:c.t+dt}; st.ops.push(o); st.bootOps.push(o); c.t+=dt; };
    st.cfg.push({t0:0, t1:0.02+CFG_T, why:'power-on: EP1C12 loads from the EPCS4 (AUTO_RESTART_CONFIGURATION ON)'});
    B('initialization(): port_init, watchdog_init (WDTCR=0x08), adc_init · DATA_INITIALIZATION: all LEDs off · CANinit_temp', 0.00006);
    B('wait(3000) ×5', 5*W(3000)); B('wait(63000) ×4', 4*W(63000));
    B('ADC slot ID: COUNTER_CONSTANT = 3 samples → ADDRESS_TABLE → moduleAddress', 0.00012);
    B('wait(63000) ×4', 4*W(63000)); B('ADC slot ID again', 0.00012);
    const tr=c.t; B('ALTERA_RESET(1000): PG2 high → R69 → Q1 pulls N_CONFIG low → FPGA reconfigures', 1000*5/F_CPU);
    st.cfg.push({t0:tr, t1:tr+CFG_T, why:'ALTERA_RESET → Q1 → N_CONFIG: EP1C12 reloads from the EPCS4'});
    B('wait(3000) ×5', 5*W(3000));
    for (let k=0;k<3;k++){ c.op={step:'B',label:'',t0:c.t}; ALTERA_write('main() round '+(k+1)); ALTERA_read(); const o={step:'B', label:`ALTERA_write + ALTERA_read #${k+1} → ALTERA6 = 0x${hx(M.ALT[6])}${configured(c.t)?'':' (FPGA still configuring)'}`, t0:c.op.t0, t1:c.t}; st.ops.push(o); st.bootOps.push(o); B('wait(3000) ×10', 10*W(3000)); }
    if (!AE){ let n=0; while (M.ALT[6]!==0xA8 && n<40){ n++; B('while (ALTERA6 != 0xA8): wait(3000) ×10', 10*W(3000)); ALTERA_write('main() wait loop'); ALTERA_read(); } }
    const d=M.DIP; M.dip_switch_enabled = (d&64)?1:0; M.dashboard_enabled = (d&128)?1:0;
    if (!M.dip_switch_enabled){ if (fw.eeprom.valid){ M.pcm=fw.eeprom.pcm; M.downmix=fw.eeprom.downmix; M.dialnorm=fw.eeprom.dialnorm; M.notify=fw.eeprom.notify; } }
    else if (AE){ M.downmix=0; M.dialnorm=0; M.pcm=1; dipAE(); }
    else dipA();
    B(`DIP decision: DIP_SWITCHES = 0x${hx(d)} → dip_switch_enabled = ${M.dip_switch_enabled?'YES':'NO'}, dashboard_enabled = ${M.dashboard_enabled?'YES':'NO'}`+(M.dip_switch_enabled? (AE?' → downmix LTRT, dialnorm DISABLED, pcm_metadata ENABLED (EEPROM ignored)':' → group selectors from DIP') : ' → RESTORE_INFORMATION_EEPROM'), 0.00004);
    if (configured(c.t-1e-6)===false) st.notes.push({t:c.t, txt:'DIP decision made while the FPGA was still configuring: DIP_SWITCHES read as 0xFF'});
    c.op={step:'B',t0:c.t}; ALTERA_write('main() after DIP'); st.ops.push({step:'B', label:'ALTERA_write · DATA_SETUP · CANinit (timer0 1 ms, timer1 96 µs start)', t0:c.op.t0, t1:c.t+0.0002}); c.t+=0.0002;
    st.can.push({t0:c.t+0.001, t1:c.t+0.001+frameDur(1), dir:'tx', label:'TRAP CANTRAP_RESTART (CAN_TX_TIMER, restart_sent)'});
    next0 = c.t + T0;
  }
  function steadyStart(){
    const w=world(-1e-9);
    const A=fpgaRead(-1e-9); for (let i=1;i<=18;i++) M.ALT[i]=A[i]; M.DIP = AE? A[17] : mirror(A[13]);
    M.dip_switch_enabled = (M.DIP&64)?1:0; M.dashboard_enabled=(M.DIP&128)?1:0;
    if (AE) dipAE(); else { M.g1=dipDecodeA(w).g1; M.g2=dipDecodeA(w).g2; }
    M.pdownmix=M.downmix; M.pdialnorm=M.dialnorm; M.ppcm=M.pcm;
    const lk=gsLocked(-1e-9);
    M.CD=lk?1:0; M.sdi_format = lk? (fmtAt(-1e-9).sd?1:2) : 0; M.sdHdPin = lk? fmtAt(-1e-9).sd : 0;
    M.sd_audio_stable = M.sdi_format?1:0; M.sd_audio_stable_counter = M.sdi_format?0:SD_STABLE;
    if (lk){ const a1=mirror(A[1]), a3=mirror(A[3]); M.pflags={fr50:a1&1, fr60:(a1>>1)&1, l1080:(a1>>2)&1, l720:(a1>>3)&1, l625:a3&1, l525:(a3>>1)&1, l5994:(a3>>3)&1, fr24:(a3>>4)&1, fr30:(a3>>5)&1, fr25:(a3>>6)&1, sd:M.sdHdPin}; }
    M.dolby_counter = D.scn==='nodec' ? 4170 : 0;     // phase of the 5000-pass error counter — arbitrary (inferred)
    st.leds.sd.push([-1e8, lk?1:0]); st.leds.hd.push([-1e8, lk&&!fmtAt(-1e-9).sd?1:0]); st.leds.err.push([-1e8, lk?0:1]);
    c.t=-1e8; if (AE) sortAE(); else { const a1=mirror(A[1]); M.agd=(a1>>4)&15; M.emb=(mirror(A[5])<<8)|mirror(A[4]); for (let g=0;g<4;g++){ const v=mirror(A[13+g]); M.fmt[g*2]=v&7; M.comp[g*2]=(v>>3)&1; M.fmt[g*2+1]=(v>>4)&7; M.comp[g*2+1]=(v>>7)&1; } }
    refreshLeds(); c.t=0; st.changes.length=0; st.resets.length=0;
    next0 = 0.00037;   // timer0 phase — arbitrary
    if (D.scn==='steady' || D.scn==='nodec'){ st.can.push({t0:0.31, t1:0.31+frameDur(6), dir:'tx', label:'REPORT_PARAM (heartbeat, round-robin parameter_refresh)'}); }
  }

  /* ---------------- one pass of while(1) ---------------- */
  function passAE(){
    c.pass++;
    begin(0,'WDR()'); end(CY.wdr);
    begin(1,'READ_GS1560_STATUS(): rc_byp = PINE7, lock60 = PIND2, smpte = PING3, sd_hd = PINE4');
    const lk=gsLocked(c.t); M.pins={rc_byp:lk, lock60:lk, smpte:lk}; M.sdHdPin = lk? fmtAt(c.t).sd : 0; end(CY.gs);
    begin(2,'PROCESS_SDI_LOCK_STATUS(): CD, sdi_format, SD/HD/ERROR LEDs');
    const was=M.sdi_format;
    if (lk){ led('err',0); M.CD=1; led('sd',1); if (M.sdHdPin){ led('hd',0); M.sdi_format=1; } else { led('hd',1); M.sdi_format=2; } }
    else { led('err',1); led('sd',0); led('hd',0); M.CD=0; M.sdi_format=0; }
    if (was!==M.sdi_format) chg('sdi_format'); end(CY.lock);
    begin(3,`PROCESS_HD_SD_CONTROL(): PORTC0 (ALTERA15) = ${M.sdHdPin?'1 → SD demux, PG4 10-bit':'0 → HD demux, PG4 20-bit'}`); end(CY.hdsd);
    begin(4,'TRANSLATE_INPUT(CD) · DEBOUNCE_INPUT() (SWITCH1_DEBOUNCE 255)');
    if (!M.CD){ if (!M.release1 && !M.switch1) M.switch1=1; } else if (M.switch1) M.release1=1;
    if (M.release1){ if (M.switch1_counter<SWITCH1_DEBOUNCE) M.switch1_counter++; else { M.switch1_counter=0; M.release1=0; M.switch1=0; } } end(CY.deb);
    begin(5,`PROCESS_DIP_SWITCHES(): CLI … SEI, DIP_SWITCHES = ALTERA17 = 0x${hx(M.DIP)}`);
    const pd=[M.dolby_enabled,M.dolby_selector,M.group3_sel,M.dolby_stereo_output].join(); dipAE(); if (pd!==[M.dolby_enabled,M.dolby_selector,M.group3_sel,M.dolby_stereo_output].join()) chg('DIP'); end(CY.dip);
    begin(6,'ALTERA_write(): dolby_upper, dolby_lower, reset_data_upper*, reset_data_lower*, AUDIO_INFORMATION, group_data* → STROBE_WRITE (PA0)'); ALTERA_write('loop'); end(8);
    begin(7,'ALTERA_read(): 3 × (STROBE_READ PA1) × 6 bytes on PINC3 / PINC5 / PINC4'); ALTERA_read(); end(8);
    begin(8,'ALTERA_SORT()'); c.op.label += ': '+sortAE(); end(CY.sort);
    if (M.pdialnorm!==M.dialnorm || M.pdownmix!==M.downmix || M.ppcm!==M.pcm){
      begin(9,'settings changed → CAT552_RESET(55000): the main loop stalls ≈ 48 ms'); CAT552_RESET(55000,'main(): dialnorm/downmix/pcm_metadata changed');
      M.pdialnorm=M.dialnorm; M.pdownmix=M.downmix; M.ppcm=M.pcm; end(10); chg('settings'); }
    begin(10,'ALTERA_ALIGNMENT_CHECK(): ALTERA6 == 0xA8 ?');
    if (M.ALT[6]===0xA8){ M.error_checker=0; M.data_sync_verified=1; } else if (M.error_checker<=1000) M.error_checker++; else { M.error_checker=0; M.data_sync_verified=0; } end(CY.align);
    begin(11,'REFRESH_LEDS(): SD/HD/ERR, AES1–4 (HD: audio_group_detect, SD: Emb_Astatus), DOLBY1–4'); refreshLeds(); end(CY.leds);
    begin(12,'WDR() · CAN_FUNCTIONS()'); end(CY.can);
    if (M.save){ begin(13,'save_settings → SAVE_INFORMATION_EEPROM(): bytes 10, 11, 12, 13, 15'); M.save=0; fw.eeprom={valid:true, pcm:M.pcm, downmix:M.downmix, dialnorm:M.dialnorm, notify:M.notify}; end(5*3.4e-3*F_CPU); }
    if (c.pass%8===0) st.snaps.push(Object.assign({t:c.t}, snap()));
  }
  function passA(){
    c.pass++;
    begin(0,'DOLBY_DECODER_STATUS() (dolby.c: PINC2 = DOLBY_INSTALLED) · WDR()'); end(40);
    begin(1,'READ_GS1560_STATUS(): sd_hd = PIND7 in v1 (M62xx.h)'); const lk=gsLocked(c.t); M.sdHdPin=lk? fmtAt(c.t).sd:0; end(CY.gs);
    begin(2,'PROCESS_SDI_LOCK_STATUS()'); const was=M.sdi_format;
    if (lk){ led('err',0); M.CD=1; led('sd',1); if (M.sdHdPin){ led('hd',0); M.sdi_format=1; } else { led('hd',1); M.sdi_format=2; } } else { led('err',1); led('sd',0); led('hd',0); M.CD=0; M.sdi_format=0; }
    if (was!==M.sdi_format) chg('sdi_format'); end(CY.lock);
    begin(3,'PROCESS_HD_SD_CONTROL() · TRANSLATE_INPUT · DEBOUNCE_INPUT · PROCESS_AUDIO_INFORMATION'); end(CY.hdsd+CY.deb+60);
    begin(6,'ALTERA_write(): dolby_upper (OS = pod31_mode = 0), dolby_lower, RESET_VECTOR1:RESET_VECTOR, AUDIO_INFORMATION, group_data = audio1 | audio2<<3'); ALTERA_write('loop'); end(8);
    begin(7,'ALTERA_read(): ALTERA1–18'); ALTERA_read(); end(8);
    begin(5,`PROCESS_DIP_SWITCHES(): ALTERA13 = MIRROR → 0x${hx(M.DIP)}; used only if dip_switch_enabled && !dashboard_enabled`); const pg=M.g1+','+M.g2; dipA(); if (pg!==M.g1+','+M.g2) chg('groups'); end(CY.dip);
    begin(8,'PROCESS_AUDIO_FORMAT() · Audio1–4_Detect · ALIGNMENT_CHECK · COMPARE_AUDIO… · TRANSLATE/DEBOUNCE_ERROR… · PROCESS_SAMPLE12…78_COMPARE · RESET_VECTOR(1)'); 
    const A=M.ALT; if (A[6]===0xA8){ const a1=mirror(A[1]); M.agd=(a1>>4)&15; M.emb=(mirror(A[5])<<8)|mirror(A[4]); for (let g=0;g<4;g++){ const v=mirror(A[13+g]); M.fmt[g*2]=v&7; M.comp[g*2]=(v>>3)&1; M.fmt[g*2+1]=(v>>4)&7; M.comp[g*2+1]=(v>>7)&1; } } end(1400);
    begin(11,'NO_LOCK_CHIRP() · METADATA_CHIRP() · REFRESH_LEDS()'); refreshLeds(); end(CY.leds+120);
    begin(12,'WDR() · CAN_FUNCTIONS()'); end(CY.can);
    if (M.save){ begin(13,'SAVE_INFORMATION_EEPROM()'); M.save=0; end(4*3.4e-3*F_CPU); }
    if (c.pass%8===0) st.snaps.push(Object.assign({t:c.t}, snap()));
  }

  if (D.scn==='boot') bootMain(); else steadyStart();
  let guard=0; const pass = AE? passAE : passA;
  while (c.t < END && guard++ < 12000) pass();
  isrUpTo(END); dashUpTo(END+1);
  /* CAN reports: PARAMETER_UPDATE from timer1_ovf_isr — every change is reported three times (x counter), TX_SIGNALCHANGE (≈ 96 ms) apart;
     otherwise a heartbeat report every TX_HEARTBEAT (≈ 0.96 s). Simplified schedule — inferred from CAN.c / Dashboard.c. */
  const T_SIG=(TX_SIGNALCHANGE+1)*T1, T_HB=(TX_HEARTBEAT+1)*T1;
  let busy=0; const seen={};
  for (const ch of st.changes){ const k=ch.what; if (seen[k]!==undefined && ch.t-seen[k]<0.05) continue; seen[k]=ch.t;
    let t=Math.max(ch.t, busy); t = Math.ceil(t/T_SIG)*T_SIG + 0.0004;
    for (let r=0;r<3;r++){ const tt=t+r*T_SIG; if (tt>END) break; st.can.push({t0:tt, t1:tt+frameDur(6), dir:'tx', label:`REPORT_PARAM (${k}) ${r+1}/3`}); busy=tt+T_SIG; } }
  for (let t=0.31+T_HB; t<END; t+=T_HB) st.can.push({t0:t, t1:t+frameDur(6), dir:'tx', label:'REPORT_PARAM (heartbeat)'});
  st.can.sort((a,b)=>a.t0-b.t0);
  st.M=M; st.configured=configured; st.fpgaRead=fpgaRead;
  return st;
}
function frameDur(n){ return (47+8*n)*1.2*CAN_BIT; }   // standard frame + ~20 % stuffing (inferred)

/* ---------------- schedule queries ---------------- */
function bs(arr, t, key){ let lo=0, hi=arr.length-1, r=-1; while (lo<=hi){ const m=(lo+hi)>>1; if (arr[m][key||'t0']<=t){ r=m; lo=m+1; } else hi=m-1; } return r; }
function opAt(t){ const s=sched(); const i=bs(s.ops,t); return i<0? null : s.ops[i]; }
function snapAt(t){ const s=sched(); const i=bs(s.snaps,t,'t'); return i<0? (s.snaps[0]||null) : s.snaps[i]; }
function ledAt(n,t){ const h=sched().leds[n]; let v=0; for (const [tt,vv] of h){ if (tt>t) break; v=vv; } return v; }
function resets(){ return sched().resets; }
function fpgaUp(t){ return sched().configured(t); }

/* =====================================================================
   AUDIO OUTPUTS (AES1–6) — what each output carries at time t
   ===================================================================== */
function embPair(g, pr, t){
  if (!grpPresent(g,t)) return null; const ty=pairType(g,pr,t);
  if (ty==='E' || ty==='D') return {kind:'data', ty, src:`G${g+1} AES${pr+1} (${ty==='E'?'Dolby E':'AC-3'} bitstream)`};
  const ch = g*4 + pr*2;
  return {kind:'pcm', src:`G${g+1} AES${pr+1} (embedded ch ${ch+1}/${ch+2})`, tones:[[[200*(ch+1),0.25]],[[200*(ch+2),0.25]]]};
}
function outRoute(k, t){   // k = 0..5 (AES1..AES6)
  const w=world(t);
  if (!gsLocked(t) || !fpgaUp(t)) return null;
  if (D.build==='A'){ const d=dipDecodeA(w), sn=snapAt(t)||{g1:d.g1,g2:d.g2}; if (k>=4) return null; const g = k<2? sn.g1 : sn.g2; return embPair(g, k%2, t); }
  const d=dipDecodeAE(w);
  if (k>=4) return embPair(d.grp, k-4, t);
  if (!d.dolbyEn){ return embPair(k<2?0:1, k%2, t); }
  const ds=decState(t, resets());
  if (ds.st==='PCM'){ if (k!==0) return null; const e=embPair(d.grp, d.selAES, t); return e? Object.assign({}, e, {src:'decoder pass-through of '+e.src}) : null; }
  if (ds.st!=='E' && ds.st!=='D') return null;
  const P = ds.st==='E' ? PROG[w.prog] : PROG[w.ac3];
  const sn=snapAt(t)||{}; const atten = (sn.dialnorm===1) ? Math.pow(10, -(31+w.dialnorm)/20) : 1;   // DLM: dialnorm applied — inferred gain law
  if (k===3 && d.downmixAES4){
    const g=(lab,a)=>{ const i=P.ch.indexOf(lab); return i<0? [] : [[toneOf(lab), a*0.25*atten]]; };
    const lo = (sn.downmix===1);
    const L=[...g('1L',1), ...g('1C',.707), ...g('1Ls', lo? .707 : -.5), ...g('1Rs', lo? 0 : -.5)];
    const R=[...g('1R',1), ...g('1C',.707), ...g('1Rs', lo? .707 : .5), ...g('1Ls', lo? 0 : .5)];
    return {kind:'pcm', src:`decoder ${lo?'Lo/Ro':'Lt/Rt'} downmix of programme 1 (DIP SW2 ON)`, tones:[L,R], labels:[lo?'Lo':'Lt', lo?'Ro':'Rt']};
  }
  const a=P.ch[k*2], b=P.ch[k*2+1];
  return {kind:'pcm', src:`decoder ch ${k*2+1}/${k*2+2} (${a||'none'} / ${b||'none'})`, tones:[a?[[toneOf(a),0.25*atten]]:[], b?[[toneOf(b),0.25*atten]]:[]], labels:[a||'—', b||'—']};
}
function outSample(k, side, t){ const r=outRoute(k,t); if (!r) return null; if (r.kind==='data') return dataWord(t, r.ty, side);
  const m=Math.floor(t*48000)/48000; let v=0; for (const [f,a] of r.tones[side]) v += a*Math.sin(2*Math.PI*f*m); return v; }
function dataWord(t, ty, side){ const f=fmtAt(t), P=burstPeriod(ty,f), ph=burstPhase(ty,f), u=((t-ph)%P+P)%P; if (u>burstLen(ty,f)) return 0;
  const n=Math.floor(t*48000); const x=Math.sin(n*12.9898+side*78.233)*43758.5453; return ((x-Math.floor(x))*2-1)*0.9; }

/* =====================================================================
   USER ACTIONS — every action logs the firmware / FPGA path it takes
   ===================================================================== */
function act(name, fn){
  D.lastTrace=[]; const tr=s=>D.lastTrace.push(s); const t0=absT();
  fn(tr); sched(); consequence(tr, t0);
  D.log.unshift({t:SIM.t, abs:t0, name, trace:D.lastTrace.slice()}); if (D.log.length>60) D.log.length=60;
  SIM.refresh();
}
function consequence(tr, t0){
  const s=sched(); const names={sd:'SD',hd:'HD',err:'ERR',a1:'AES1',a2:'AES2',a3:'AES3',a4:'AES4',d1:'DOLBY1',d2:'DOLBY2',d3:'DOLBY3',d4:'DOLBY4'};
  const l=Object.keys(names).map(n=>{ const e=s.leds[n].find(x=>x[0]>t0+1e-9); return e? `${names[n]} ${e[1]?'on':'off'} at +${SIM.fmtDur(e[0]-t0)}` : null; }).filter(Boolean);
  const r=s.resets.find(x=>x.t0>=t0-1e-9); const cn=s.can.find(x=>x.t0>t0+1e-6 && x.dir==='tx');
  tr('Model result: '+(l.length? 'LEDs — '+l.slice(0,5).join(' · ') : 'no LED change before the end of this page')+(r? ` · RESET_552 pulse at +${SIM.fmtDur(r.t0-t0)} (${SIM.fmtDur(r.t1-r.t0)}, ${r.why})`:'')+(cn? ` · next CAN frame to DashBoard at +${SIM.fmtDur(cn.t0-t0)}`:''));
}
const A = {
  dip(i){ const w=world(absT()); const on=!w.dip[i]; act(`SW1-${i+1} → ${on?'ON':'OFF'}`, tr=>{
    const d=w.dip.slice(); d[i]=on; addEv('dip', d); const w2=world(absT()), raw=dipRaw(w2);
    tr(`SW1-${i+1} ${on?'closes to ground':'opens (pull-up)'} → FPGA pin ${181+[0,1,2,3,4,5,6,7][i]} (dip${i+1}). DIP byte as the FPGA sees it: 0x${hx(raw)} (ON = 0).`);
    if (D.build==='AE'){
      tr(`ALTERA_read() clocks it out as ALTERA17 on PINC4 (read_data2); next pass PROCESS_DIP_SWITCHES() rebuilds dolby_enabled, dolby_selector, group3_sel and dolby_stereo_output from it — every pass, whatever dip_switch_enabled says (the if is commented out).`);
      const dd=dipDecodeAE(w2);
      tr(({0:'SW1 is not read by v2.02 (the dolby_selector += 4 line for BIT0 is commented out). Manual: “Reserved”.',
           1:`SW2: dolby_stereo_output = ${dd.downmixAES4?1:0} → AES4 OUT = ${dd.downmixAES4?'decoder Lt/Rt downmix':'decoder ch 7/8'} (manual Table 2 note).`,
           2:`SW3: dolby_enabled = ${dd.dolbyEn?'YES':'NO'} → AES1–4 = ${dd.dolbyEn?'decoder outputs':'Group 1 / Group 2 de-embedded pairs'}.`,
           3:`SW4: dolby_selector bit 0 = ${dd.selAES} → decoder input is AES${dd.selAES+1} of the selected group.`,
           4:`SW5 (MSB): group3_sel = ${dd.grp} → Group ${dd.grp+1} feeds AES5/AES6 and the decoder input.`,
           5:`SW6 (LSB): group3_sel = ${dd.grp} → Group ${dd.grp+1} feeds AES5/AES6 and the decoder input.`,
           6:`SW7: read once at boot as dip_switch_enabled (BIT6). ${on?'ON → NO → RESTORE_INFORMATION_EEPROM at the next boot.':'OFF → YES → defaults at boot, EEPROM ignored.'} Manual: “Reserved”.`,
           7:`SW8: read once at boot as dashboard_enabled (BIT7). ${on?'ON → NO → DashBoard SETs of Downmix / Dialnorm / PCM Metadata are echoed but not stored (next boot).':'OFF → YES.'} Manual: “Reserved”.`})[i]);
      tr(`Routing itself is done in the FPGA from the DIP pins (v202's ALTERA_write never sends dolby_selector or group3_sel) — ${infT('the v202 ALTERA_write byte list and the M6202AE functional drawing; the v201 FPGA source is not in the archive')}.`);
    } else {
      const dd=dipDecodeA(w2); const sn=snapAt(absT())||{};
      tr(`v1.04: ALTERA13 = MIRROR(DIP). PROCESS_DIP_SWITCHES() only uses it when dip_switch_enabled == YES && dashboard_enabled == NO (SW7 OFF, SW8 ON at boot). Now: dip_switch_enabled = ${sn.dip_switch_enabled?'YES':'NO'}, dashboard_enabled = ${sn.dashboard_enabled?'YES':'NO'}.`);
      tr(`If used: audio1 = ${dd.g1*2} → group_sel1 = ${dd.g1} (Group ${dd.g1+1}), audio2 = ${dd.g2*2} → group_sel2 = ${dd.g2} (Group ${dd.g2+1}); ALTERA_write sends group_data = audio1 | audio2<<3 so the FPGA HD_group_sel picks DID ${DID.hd[dd.g1]} / ${DID.hd[dd.g2]}.`);
    }
  }); },
  cable(){ const on=!world(absT()).cable; act(`${on?'Plug':'Unplug'} SDI into SDI IN`, tr=>{ addEv('cable', on);
    tr(`GS1574A U1 ${on?'equalises the cable; GS1559 U2 locks (≈'+SIM.fmtDur(T_GSLOCK)+', '+inf+') and raises LOCK_60 (PD2), SMPTE (PG3), ~RC_BYP (PE7)':'loses carrier; GS1559 LOCK/SMPTE/~RC_BYP drop'}.`);
    tr(on? 'Next pass: READ_GS1560_STATUS → PROCESS_SDI_LOCK_STATUS: CD = 1, SD LED on (also for HD), HD LED if PE4 = 0. ALTERA_SORT sees new lock flags → sdi_change → reset_enable; timer0 SD_RESET holds PA5 low 2 ms, then CAT552_RESET(1000) inside the ISR. sd_audio_stable after 165 ms.'
         : 'Next pass: CD = 0, ERR LED on, ALTERA_SORT clears everything, SD_RESET_ACTIVE, sd_audio_stable_counter = 165. AES outputs stop (FPGA has no audio).');
  }); },
  fmt(f){ act(`Source format → ${VF[f].name}`, tr=>{ addEv('fmt', f);
    tr(`GS1559 relocks to ${VF[f].rate}; PE4 (SD/~HD) = ${VF[f].sd?1:0} → PROCESS_HD_SD_CONTROL sets PORTC0 (ALTERA15) for the ${VF[f].sd?'SD403 SD':'HD'} demux and PG4 for ${VF[f].sd?'10':'20'}-bit.`);
    tr(`FPGA lock bits: ALTERA1 = MIRROR(0x${hx(VF[f].a1)} | groups<<4), ALTERA3 = MIRROR(0x${hx(VF[f].a3)}) → DashBoard “${VF[f].dash}”. The changed flags set sdi_change → reset_enable → SD_RESET + CAT552_RESET(1000).`); }); },
  grp(g, pr, ty){ const w=world(absT()); const G=JSON.parse(JSON.stringify(w.grp)); if (pr<0) G[g].on=!G[g].on; else { G[g].p[pr]=ty; G[g].on=true; }
    act(pr<0? `Group ${g+1} ${G[g].on?'embedded':'removed'}` : `G${g+1} AES${pr+1} → ${TYPE[ty]}`, tr=>{ addEv('grp', G);
      tr(`Source now embeds ${G.map((x,i)=>x.on?`G${i+1} [${x.p.join(' ')}]`:null).filter(Boolean).join(', ')||'no audio'} (HD DIDs ${DID.hd.filter((d,i)=>G[i].on).join(' ')||'—'}).`);
      if (pr>=0 && (ty==='E'||ty==='D')) tr(`non_audio_detector waits for four zero words then Pa = F872 / Pb = 4E1F (16-, 20- or 24-bit alignment), copies Pc bits 6..0 (data type) into PA and sets the compressed flag; ${ty==='E'?'Dolby E repeats every video frame':'AC-3 repeats every 1536 samples (32 ms)'}.`);
      if (pr>=0 && ty==='P') tr(`The compressed flag is not cleared at once: count1/count2 hold it for 32767 LRCLK frames (${SIM.fmtDur(NA_HOLD)}) after the last sync word.`); }); },
  prog(p){ act(`Dolby programme → ${p}`, tr=>{ addEv(PROG[p].kind==='E'?'prog':'ac3', p); tr(`Decoder output map from the M6202AE manual Table 2: ${PROG[p].ch.map((c,i)=>`ch${i+1} ${c||'none'}`).join(', ')}.`); }); },
  cat(){ const on=!world(absT()).cat; act(on?'Fit the decoder module on P5':'Remove the decoder module from P5', tr=>{ addEv('cat', on);
    tr(on? 'P5 (CAT_NO_552_RA, 2 × 36) carries EAD/EABC/EAFS (bitstream in), DADA–DADD + DADM (decoded I2S out), RESET_552, MAP0/1, DLM0–2, PRG0–2, PLE/PLS/PGP, PME, ERR.' : 'With no module the ERR line (P5-70 → FPGA pin 11 → ALTERA13 net → PINC2) reads low.');
    tr('DOLBY_DECODER_STATUS() runs only while dolby_enabled && sd_audio_stable: Dolby_card_status = PINC2 ? OK : ERROR; RESET_DOLBY counts ERROR passes and after DOLBY_ERROR_COUNTER (5000 ≈ '+SIM.fmtDur(5001*passT())+') calls CAT552_RESET(1000) and sets reset_enable — then starts counting again.'); }); },
  rear(r){ D.base.rear=r; SKEY=''; SIM.refresh(); },
  dash(oid, val, label){ act(`DashBoard: ${label} → ${val}`, tr=>{ addEv('dash', {oid, val}); const sn=snapAt(absT())||{}; const map=DASH_SET[D.build]; const v=map[oid];
    if (v===undefined){ tr(`OID 0x${hx(oid,4)} has no SET handler → CANRESP_UNSUPPORTED.`); return; }
    tr(`Frame controller sends SET_PARAM for OID 0x${hx(oid,4)}; can_rx_isr → DASHBOARD_RESPONSE_SETUP(MOB_index) → case CANMSG_SET_PARAM.`);
    if (v===null) tr(`This handler is commented out in Dashboard.c (${D.build==='AE'?'“/* if (dashboard_enabled == YES){ … } else{ */”':'pod31_mode = 0 before the commented block'}): the reply echoes the current value, so DashBoard snaps back. The setting really comes from the DIP switches.`);
    else if (v==='save') tr('Settings → Save: save_settings = YES; end of the next pass calls SAVE_INFORMATION_EEPROM(): byte 10 = 0xAA, 11 pcm_metadata, 12 downmix, 13 dialnorm, 15 smpte_alarm_enabled. They are only read back when SW7 is ON at boot.');
    else if (v==='notify') tr('smpte_alarm_enabled gates the Card Status alarms (No SDI Input / No AES Audio Detected).');
    else if (!sn.dashboard_enabled) tr('dashboard_enabled == NO (SW8 was ON at boot): the reply echoes the old value; nothing is stored.');
    else { tr(`Stored in ${v}. Next main-loop pass: p${v==='pcm'?'pcm_metadata':v+'_settings'} != ${v} → CAT552_RESET(55000): RESET_552 low for ${SIM.fmtDur(W(55000))} with ALTERA_write before and after; the main loop and the LEDs stall for that time.`);
      tr(`ALTERA_write puts it on the CAT552 pins: ${v==='downmix'?'MAP1:MAP0 = '+(val? '10 (Lo/Ro)':'11 (Lt/Rt)'):v==='dialnorm'?'DLM2..0 = '+(val?'000 (dialnorm applied)':'111'):'PME = '+(val?1:0)} — ${infT('the pin names in pod31.qsf / the netlist; the CAT552 pin functions are not documented in the archive')}.`); }
  }); },
  scn(k){ D.scn=k; D.page=0; D.ev=[]; if (k==='plug') D.ev=[{t:-1e8,k:'cable',v:false},{t:0.05,k:'cable',v:true}]; if (k==='nodec') D.ev=[{t:-1e8,k:'cat',v:false}];
    act('Timeline scenario → '+SCN[k].label, tr=>tr(({steady:'Long-running card: counters saturated, decoder locked. Actions land at the playhead.', plug:'The SDI cable goes in at 50 ms: GS1559 lock, sdi_change, SD_RESET, CAT552_RESET(1000) inside timer0, 165 ms sd_audio_stable, decoder acquisition.', boot:'Power-up: main() waits ≈ 0.45 s, reads the slot ID twice, pulses ALTERA_RESET (FPGA reloads from the EPCS4), does three write/read rounds and decides dip_switch_enabled / dashboard_enabled — before the FPGA is back (v2.02 dropped the ALTERA6 == 0xA8 wait loop).', nodec:'Card running with the decoder module missing: Dolby_card_status = ERROR every pass, RESET_DOLBY counts 5000 passes, then CAT552_RESET(1000) + SD_RESET. Repeats.'})[k])); },
  page(i){ D.page=i; SIM.seek(0); SIM.refresh(); },
  build(b){ D.build=b; act('Firmware build → '+(b==='AE'?'M6202AE v2.02 (atmel/v202)':'M6202A v1.04 not released (atmel/v104)'), tr=>tr(b==='AE'? 'CAT552.c module control, 6 AES outputs, DIP-driven routing, Dolby settings in DashBoard.' : 'POD31-derived loop: group selectors (DIP or DashBoard), sample-count error checks; pod31_mode is forced to 0 everywhere, so the decoder is never used.')); },
  reset(){ D.base=baseWorld(); D.ev=[]; D.scn='steady'; D.page=0; D.fw={ downmix:0, dialnorm:0, pcm:1, notify:1, eeprom:{valid:false, pcm:1, downmix:0, dialnorm:0, notify:1} }; D.log=[]; SKEY=''; SIM.refresh(); },
};
function passT(){ return (CY.wdr+CY.gs+CY.lock+CY.hdsd+CY.deb+CY.dip+CY.sort+CY.align+CY.leds+CY.can+60+24)/F_CPU + 6*(8*WBIT+BYTE_OVH) + 18*(8*RBIT+BYTE_OVH); }

/* =====================================================================
   DRAWINGS — card (real ISS3 gerbers), card edge, rear modules, DashBoard window
   ===================================================================== */
/* Card artwork: GERBERS/M6202A-ISS3.TOP + .TSM (copper, pads) and .TSS (silk), rendered at 120 dpi over x 2.45…15.50 in,
   y 5.40…8.70 in (1566 × 396 px). Black mask / gold pads / white silk per M6202A Color.jpg. Third-party logo blanked.
   Part positions from M6202A-iss3.pnp (origin 3.495, 5.885 in). */
const PNP = (x,y)=>[(x/1000+3.495-2.45)*120, (8.70-(y/1000+5.885))*120];
const LEDS = [['sd',-495.3,2390,'SD','#7dff6a'],['hd',-495.3,2290,'HD','#7dff6a'],['err',-495.3,2190,'ERR','#ff4a3a'],
  ['a1',-495.3,1990,'AES 1','#ffd23a'],['a2',-495.3,1885,'AES 2','#ffd23a'],['a3',-495.3,1785,'AES 3','#ffd23a'],['a4',-495.3,1685,'AES 4','#ffd23a'],
  ['d1',29.7,1990,'DOLBY 1','#ffd23a'],['d2',29.7,1885,'DOLBY 2','#ffd23a'],['d3',29.7,1785,'DOLBY 3','#ffd23a'],['d4',29.7,1685,'DOLBY 4','#ffd23a'],
  ['com',-345.7,1016.6,'COM ACTIVITY','#7dff6a'],['cerr',-345.7,914.2,'ERROR','#ff4a3a']];
const LEDREF = {sd:'LED14 GRN, PE2',hd:'LED13 GRN, PE5',err:'LED12 RED, PE6',a1:'LED11 YEL, PB0',a2:'LED4 YEL, PB1',a3:'LED3 YEL, PB2',a4:'LED9 YEL, PB3',d1:'LED8 YEL, PB4',d2:'LED7 YEL, PB5',d3:'LED5 YEL, PB6',d4:'LED2 YEL, PG1',com:'LED10 GRN, PG0',cerr:'LED6 RED, PB7'};
const CHIPS = [
  ['U11',4923.1,1838.8,58,58,'AT90CAN128 @ 8 MHz (X1): v100w.c main loop, CAN to the openGear frame (SN65HDV233 U9), shift-register bus to the FPGA on PORTA/PORTC, LEDs on PORTB/E/G'],
  ['U3',7699.7,1575.7,150,150,'EP1C12Q240C6 Cyclone (“pod31”): SD and HD de-embedders, group/DID select, non_audio_detector, CAT552 routing, OUTPUT_SELECT, i2sx4_aes AES3 generators, shift_in/shift_out register bus'],
  ['U7',8685,1680,26,22,'M25P40 (EPCS footprint): FPGA configuration, loaded at power-up and on every ALTERA_RESET (Q1 → N_CONFIG)'],
  ['U2',9753,2276.4,52,52,'GS1559 HD/SD deserializer + reclocker: 20-bit D0–D19 + PCLK to the FPGA, LOCK_60 / SMPTE / ~RC_BYP / SD/~HD status to the MCU, reclocked serial to U6'],
  ['U5',9831.5,1815.7,30,30,'GO1525 VCO for the GS1559 PLL'],
  ['U1',11002.2,2263.4,26,26,'GS1574A adaptive cable equaliser (SDI IN)'],
  ['U6',10839.5,1745,28,24,'GS1528 cable driver: reclocked SDI OUT'],
  ['U4',8100,397,36,36,'PLL1705: audio master clocks for the AES generators (with X2/X3 12.288 MHz oscillators)'],
  ['U10',7165,2475,24,22,'ICS662-03 video-locked clock synthesiser'],
  ['U8',4363.5,2129.4,24,22,'ADM3485 RS-485 on the AVR UART (CPU_RX/TX → P1 “AES7” pins) — not used by v2.02'],
  ['U9',11040,45,24,22,'SN65HDV233 CAN transceiver to the frame (P2 CANH/CANL)'],
  ['T1',8935,760,46,46,'PE-65812 AES transformer — AES_OUT1'],['T2',8935,210,46,46,'PE-65812 — AES_OUT2'],['T3',9615,760,46,46,'PE-65812 — AES_OUT3'],
  ['T4',9620,210,46,46,'PE-65812 — AES_OUT4'],['T5',10305,210,46,46,'PE-65812 — AES_OUT5 (U13-7 in, U13-6 out)'],['T6',10305,760,46,46,'PE-65812 — AES_OUT6 (U13-1 in, U13-2 out)'],
  ['JTAG1',4970,2470,40,18,'AVR JTAG header'],['H11',9125,1565,40,18,'Active-serial header for the EPCS (Quartus Programmer)'],
];
function cardSVG(t, opts){
  opts=opts||{}; const w=world(t), s=sched();
  let x=`<svg viewBox="0 0 1566 396" role="img" aria-label="M6202A ISS3 card, top side (real gerber artwork)" style="width:100%;display:block;border-radius:6px">
   <defs><filter id="m62glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect width="1566" height="396" fill="var(--panel2)"/>
   <path d="M2 8 H1505 V360 H52 L2 312 Z" fill="#121513" stroke="#2a2f2c"/>
   <image href="${ASSET}m6202-card-copper.png" width="1566" height="396"/>
   <image href="${ASSET}m6202-card-silk.png" width="1566" height="396" opacity=".92"/>`;
  CHIPS.forEach(([id,px,py,cw,ch,dsc])=>{ const [cx,cy]=PNP(px,py); const sel=D.selChip===id;
    x+=`<rect class="m62chip" data-c="${id}" x="${(cx-cw/2).toFixed(1)}" y="${(cy-ch/2).toFixed(1)}" width="${cw}" height="${ch}" fill="${sel?'rgba(255,220,80,.25)':'transparent'}" stroke="${sel?'#ffd84a':'none'}" stroke-width="2" style="cursor:pointer"><title>${id}: ${dsc}</title></rect>`; });
  LEDS.forEach(([n,px,py,lab,col])=>{ const [cx,cy]=PNP(px,py); const on=ledAt(n,t);
    x+=`<rect x="${cx-8}" y="${cy-5}" width="16" height="10" rx="2" fill="${on?col:'#2b2f2c'}" ${on?'filter="url(#m62glow)"':''}><title>${lab} (${LEDREF[n]}): ${on?'ON':'off'}</title></rect>`; });
  const [sx,sy]=PNP(1625,2049.5);
  for (let i=0;i<8;i++){ const xx=sx+(i-3.5)*12.2, on=w.dip[i];
    x+=`<g class="m62dip" data-i="${i}" style="cursor:pointer"><rect x="${xx-5}" y="${sy-13}" width="10" height="26" rx="1.5" fill="#1a1a1a" stroke="#555"/><rect x="${xx-3.5}" y="${on?sy-11:sy+1}" width="7" height="10" fill="#f2f2f2"/><rect x="${xx-6}" y="${sy-22}" width="12" height="44" fill="transparent"><title>SW1-${i+1} → FPGA dip${i+1}: ${on?'ON':'OFF'} — click to toggle</title></rect></g>`; }
  x+=`<text x="${sx-52}" y="${sy-17}" font-size="9" fill="#9fd3ff">ON ↑ · 1 … 8 (${'orientation inferred'})</text>`;
  const cat=w.cat;
  x+=`<g class="m62cat" style="cursor:pointer"><rect x="428" y="${cat?232:268}" width="556" height="${cat?118:78}" rx="4" fill="${cat?'rgba(30,70,140,.82)':'transparent'}" stroke="${cat?'#9fc3ff':'#ffd36a'}" stroke-dasharray="${cat?'':'6 4'}" stroke-width="2"/>
     <text x="706" y="${cat?280:300}" text-anchor="middle" font-size="16" font-weight="700" fill="${cat?'#eaf2ff':'#ffd36a'}" stroke="#000" stroke-width="${cat?0:3}" paint-order="stroke">${cat?'Decoder module (CAT No. 552) on P5':'P5 empty — click to fit the decoder module'}</text>
     ${cat?`<text x="706" y="300" text-anchor="middle" font-size="11" fill="#cfe0ff">${(()=>{ const ds=decState(t, s.resets); return 'state: '+({absent:'—',reset:'RESET_552 low',idle:'idle (no input)',acq:'acquiring '+(ds.ty==='E'?'Dolby E':'AC-3'),E:'decoding Dolby E',D:'decoding AC-3',PCM:'PCM pass-through'})[ds.st]; })()}</text>`:''}
     <title>P5 CAT_NO_552_RA — click to ${cat?'remove':'fit'} the decoder module</title></g>`;
  if (opts.labels!==false){
    const lab=(px,py,txt,dy)=>{ const [cx,cy]=PNP(px,py); return `<text x="${cx}" y="${cy+(dy||0)}" text-anchor="middle" font-size="13" font-weight="700" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke" pointer-events="none">${txt}</text>`; };
    x+=lab(4923.1,1838.8,'AT90CAN128',-36)+lab(7699.7,1575.7,'EP1C12')+lab(9753,2276.4,'GS1559',38)+lab(11002.2,2263.4,'EQ',-14)+lab(8100,397,'PLL1705',-24)+lab(9300,1000,'AES out (DS34LV87T + T1–T6)',-4);
    x+=`<text x="1534" y="150" font-size="13" font-weight="700" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke" text-anchor="middle">P1</text><text x="1534" y="340" font-size="13" font-weight="700" fill="#ffd36a" stroke="#000" stroke-width="3" paint-order="stroke" text-anchor="middle">P2</text>`;
  }
  const op=opAt(t);
  x+=`<rect x="640" y="160" width="150" height="22" rx="4" fill="rgba(0,0,0,.6)"/><text x="715" y="175" text-anchor="middle" font-size="12" fill="#9fd8ff" font-family="monospace">${op? (op.step==='B'?'boot':'loop step '+op.step) : '—'}</text>`;
  x+=`<rect x="985" y="226" width="130" height="22" rx="4" fill="rgba(0,0,0,.6)"/><text x="1050" y="241" text-anchor="middle" font-size="12" fill="${fpgaUp(t)?'#9fffb0':'#ffb43a'}" font-family="monospace">${fpgaUp(t)?'FPGA running':'CONFIGURING'}</text>`;
  x+='</svg>'; return x;
}
function edgeSVG(t){   // M6202-card-edge.cdr: SD, HD, ERR, AES1–4, COM Activity, Error (DOLBY LEDs beside AES1–4)
  const rows=[['sd',0],['hd',1],['err',2],['a1',3.75],['a2',4.75],['a3',5.8],['a4',6.85],['com',8.4],['cerr',9.4]];
  let s=`<svg viewBox="0 0 230 300" style="width:100%;max-width:230px;display:block"><rect width="230" height="300" rx="8" fill="var(--dev)"/>
    <defs><filter id="m62g2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect x="30" y="12" width="14" height="262" fill="#121513" stroke="#333"/><text x="115" y="294" font-size="9.5" text-anchor="middle" fill="#8a8f8c">card edge (M6202-card-edge.cdr)</text>`;
  const L=Object.fromEntries(LEDS.map(l=>[l[0],l]));
  rows.forEach(([n,r])=>{ const y=28+r*25, on=ledAt(n,t), col=L[n][4];
    s+=`<rect x="31" y="${y-6}" width="12" height="12" rx="2" fill="${on?col:'#2b2f2c'}" ${on?'filter="url(#m62g2)"':''}/><text x="58" y="${y+5}" font-size="13" fill="#e6e6e6">${L[n][3]}</text>`;
    if (n[0]==='a'){ const dn='d'+n[1], don=ledAt(dn,t); s+=`<rect x="14" y="${y-5}" width="10" height="10" rx="2" fill="${don?'#ffd23a':'#2b2f2c'}" ${don?'filter="url(#m62g2)"':''}><title>DOLBY ${n[1]} (manual: “reserved”)</title></rect>`; } });
  s+=`<text x="19" y="${28+3.2*25}" font-size="8" fill="#8a8f8c" text-anchor="middle">D</text></svg>`; return s;
}
const REARS = {
  T6204:{frame:'DFR-8310 (10-slot)', imp:'110 Ω', kinds:['bnc','bnc','tb','tb','tb','tb','tb','tb','tb','tb']},
  T6304:{frame:'DFR-8320 (20-slot)', imp:'110 Ω', kinds:['bnc','bnc','tb','tb','tb','tb','tb','tb','tb','tb']},
  T6306:{frame:'DFR-8320 (20-slot)', imp:'75 Ω',  kinds:['bnc','bnc','bnc','bnc','bnc','bnc','bnc','bnc','bnc','tb']},
};
const POSN = ['SDI IN','SDI OUT','AES 1','AES 5','AES 2','AES 6','AES 3','NOT USED','AES 4','METADATA OUT'];
const POS_OUT = [null,null,0,4,1,5,2,null,3,null];
function rearSVG(t){   // geometry from M6202AE Rear Modules.cdr (panel ≈ 1 : 2.35), labels as drawn
  const w=world(t), R=REARS[w.rear]; const tx = fpgaUp(t) && gsLocked(t);
  let s=`<svg viewBox="0 0 240 560" role="img" aria-label="${w.rear} rear module" style="width:100%;max-width:240px;display:block">
    <rect x="20" y="20" width="200" height="500" rx="3" fill="#c9ccd0" stroke="#7a7f85"/><rect x="45" y="520" width="150" height="14" fill="#c9ccd0" stroke="#7a7f85"/>
    <circle cx="120" cy="44" r="12" fill="#9aa0a6" stroke="#555"/><path d="M112 44 h16 M120 36 v16" stroke="#333"/>
    <text x="120" y="552" font-size="12" text-anchor="middle" fill="var(--ink2)">${w.rear} · ${R.imp} · ${R.frame}</text>`;
  const cx=[72,168];
  for (let i=0;i<10;i++){ const col=i%2, row=Math.floor(i/2), x=cx[col], y = row===0? 100 : 175+(row-1)*86; const kind=R.kinds[i], o=POS_OUT[i];
    const live = o!==null ? !!outRoute(o,t) : (i===1? tx : i===0? w.cable : false);
    const cls = i===0? 'm62sdi' : o!==null? 'm62out' : '';
    if (kind==='bnc'){ const r= row===0? 30 : 26;
      s+=`<g class="${cls}" data-o="${o}" style="cursor:${cls?'pointer':'default'}"><circle cx="${x}" cy="${y}" r="${r}" fill="#b9a160" stroke="#6b5a25"/><circle cx="${x}" cy="${y}" r="${r*0.6}" fill="#e2d39b"/><circle cx="${x}" cy="${y}" r="5" fill="#6b5a25"/>
        ${i===0&&w.cable?`<circle cx="${x}" cy="${y}" r="${r-4}" fill="#2b5f9e" opacity=".85"/><rect x="${x-6}" y="${y}" width="12" height="40" fill="#2b5f9e"/>`:''}
        <circle cx="${x+r-2}" cy="${y-r+2}" r="5" fill="${live?(i<2?'var(--accent2)':'var(--accent)'):'#888'}"/>
        <rect x="${x-r-4}" y="${y-r-4}" width="${2*r+8}" height="${2*r+8}" fill="${D.scope===o&&o!==null?'rgba(255,220,80,.25)':'transparent'}"><title>${i+1} ${POSN[i]}${i===0?' — click to '+(w.cable?'unplug':'plug in'):o!==null?' — click to put it on the scope':''}</title></rect></g>`;
    } else {
      s+=`<g class="${cls}" data-o="${o}" style="cursor:${cls?'pointer':'default'}"><rect x="${x-17}" y="${y-36}" width="34" height="72" fill="#24944d" stroke="#0b4b26"/>${[0,1,2].map(k=>`<rect x="${x-11}" y="${y-31+k*22}" width="22" height="18" fill="#1d7a40" stroke="#0b4b26"/><circle cx="${x}" cy="${y-22+k*22}" r="4" fill="#0b2b16"/>`).join('')}
        <circle cx="${x+22}" cy="${y-30}" r="5" fill="${live?'var(--accent)':'#888'}"/>
        <rect x="${x-24}" y="${y-40}" width="48" height="80" fill="${D.scope===o&&o!==null?'rgba(255,220,80,.25)':'transparent'}"><title>${i+1} ${POSN[i]} (G − + / + − G)${o!==null?' — click to put it on the scope':''}</title></rect></g>`;
    }
    s+=`<text x="${x}" y="${y+(row===0?-36:47)}" font-size="9" text-anchor="middle" fill="${live?'#1b1d20':'#6c7176'}" font-weight="${live?700:400}">${i+1} ${POSN[i]}</text>`;
  }
  s+='</svg>'; return s;
}

/* ---------------- DashBoard-style parameter window (generic layout, not Ross's design) ---------------- */
if (!document.getElementById('m62css')){ const st=document.createElement('style'); st.id='m62css'; st.textContent=`
.m62dash{border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel2);font-size:12.5px}
.m62dash .tb{display:flex;gap:8px;align-items:center;padding:5px 9px;background:color-mix(in srgb,var(--accent2) 16%,var(--panel));border-bottom:1px solid var(--line);font-weight:600}
.m62dash .tb .sp{flex:1}.m62dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:middle}
.m62dash .bd{display:grid;grid-template-columns:150px minmax(0,1fr)}
.m62dash .tree{border-right:1px solid var(--line);padding:6px 0;background:var(--panel)}
.m62dash .tree div{padding:3px 10px;cursor:pointer}.m62dash .tree div.on{background:color-mix(in srgb,var(--accent) 20%,transparent);font-weight:600}
.m62dash .pp{padding:8px 10px}.m62dash h4{margin:8px 0 4px;font-size:12px;color:var(--ink2);border-bottom:1px solid var(--line)}
.m62dash table{border-collapse:collapse;width:100%}.m62dash td{padding:2px 5px;vertical-align:top}.m62dash td:first-child{color:var(--ink2);width:46%}
.m62dash select,.m62dash button{font-size:12px;padding:2px 6px}
@media (max-width:700px){.m62dash .bd{grid-template-columns:minmax(0,1fr)}.m62dash .tree{display:flex;flex-wrap:wrap;border-right:none;border-bottom:1px solid var(--line)}}
`; document.head.appendChild(st); }
const LOCKCH = {0:'-',1:'P',2:'C',3:'D',4:'E'};
const DEC_IN = ['Emb. Audio Grp 1 - AES1','Emb. Audio Grp 1 - AES2','Emb. Audio Grp 2 - AES1','Emb. Audio Grp 2 - AES2','Emb. Audio Grp 3 - AES1','Emb. Audio Grp 3 - AES2','Emb. Audio Grp 4 - AES1','Emb. Audio Grp 4 - AES2','N/A'];
const dot = c=>`<span class="m62dot" style="background:${c}"></span>`;
const G='#2fbf5b', R='#e0453a', Y='#9aa0a6';
function dashModel(t){
  const sn=snapAt(t)||sched().M, AE=D.build==='AE', w=world(t);
  const f=VF[w.fmt]; const nolock = !sn.sdi_format;
  const sdi = nolock? [R,'Unlocked'] : [G, f.dash];
  const allNo = [0,1,2,3].every(i=>!sn.lock[i]);
  const cs = (nolock && sn.notify)? [R,'No SDI Input'] : (allNo && sn.notify)? [R,'No AES Audio Detected'] : [G,'OK'];
  if (!AE){
    const c1=v=>({0:'Unlocked',1:'Locked-PCM',2:'Locked-Dolby AC3',3:'Locked-Dolby E'})[v]||'Unlocked';
    return { title:'M6202A', state:cs, info:[['Product','M6202A'],['Name','MD-SDI Embedded Audio Demultiplexer'],['Manufacturer','Ward-Beck Systems'],['Software Rev','1.04 (not released)'],['Website','www.ward-beck.com']],
      status:[['h','Status'],['Card Status',cs],['SDI Input',nolock?[R,'Unlocked']:[G,f.sd?'SD':'HD']],
        ...['Gr 1 Embd AES 1','Gr 1 Embd AES 2','Gr 2 Embd AES 1','Gr 2 Embd AES 2'].map((n,i)=>{ const g= i<2? sn.g1 : sn.g2, li=g*2+(i%2); const v= sn.lock[li]? (sn.lock[li]===1?1:sn.lock[li]===3?2:sn.lock[li]===4?3:1):0; return [n,[v?G:R, c1(v)]]; }),
        ['Dolby Decoder', w.cat? [G,'OK'] : [Y,'N/A']]],
      control:[['h','Control'],['Mode',{oid:0x0302, val:0, opts:['2 Group Demux (No Dolby Decoding)','1 Group Demux (6 Channel Dolby Decoding and 1 PCM)','1 Group Demux (8 Channel Dolby Decoding)','1 Group Demux (6 Channel Dolby Decoding and 1 Downmix (LtRt))']}],
        ['Group 1 Selector',{oid:0x0303, val:sn.g1, opts:['1','2','3','4']}],['Group 2 Selector',{oid:0x0304, val:sn.g2, opts:['1','2','3','4']}],
        ['Dolby Auto Swap',{oid:0x0305, val:1, opts:['Disabled','Enabled']}],['Notify on Card Fault',{oid:0x0400, val:sn.notify, opts:['Disabled','Enabled']}],['Settings',{oid:0x0301, button:'Save'}]] };
  }
  const en=sn.dolby_enabled, err=!sn.Dolby_card_status;
  const outD = (k,lab)=> nolock? [R,'N/A'] : !en? [G, ['Emb. Audio Grp 1 - AES1','Emb. Audio Grp 1 - AES2','Emb. Audio Grp 2 - AES1','Emb. Audio Grp 2 - AES2'][k]] : [err?R:G, lab];
  const aes4 = nolock? [R,'N/A'] : !en? [G,'Emb. Audio Grp 2 - AES2'] : [err?R:G, sn.dolby_stereo_output? 'Dolby Decoder Main Program Downmix (LtRt)' : 'Dolby Decoder Ch7/8'];
  const g5 = nolock? [R,'N/A'] : [G, DEC_IN[Math.min(8,(sn.dolby_selector>>1)*2)]], g6 = nolock? [R,'N/A'] : [G, DEC_IN[Math.min(8,(sn.dolby_selector>>1)*2+1)]];
  const emb = sn.lock.map(v=>LOCKCH[v]+LOCKCH[v]); const embS = `${emb[0]}${emb[1]}  ${emb[2]}${emb[3]}  ${emb[4]}${emb[5]}  ${emb[6]}${emb[7]}`;
  return { title:'M6202AE', state:cs,
    info:[['Product','M6202AE'],['Name','MD-SDI Embedded Audio Demultiplexer w/ Dolby Decoding'],['Manufacturer','Ward-Beck Systems'],['Software Rev','2.02'],['Website','www.ward-beck.com']],
    status:[['h','Inputs'],['Card Status',cs],['SDI',sdi],['Embedded Audio',[Y,embS]],['Dolby Decoder Status', !en? [G,'N/A'] : err? [R,'Error'] : [G,'OK']],
      ['h','Outputs'],['AES 1',outD(0,'Dolby Decoder Ch1/2')],['AES 2',outD(1,'Dolby Decoder Ch3/4')],['AES 3',outD(2,'Dolby Decoder Ch5/6')],['AES 4',aes4],['AES 5',g5],['AES 6',g6],
      ['h','Settings'],['Dolby Decoding',[G, en?'Enabled':'Disabled']],['Dolby Decoder Input',[G, en? DEC_IN[sn.dolby_selector] : 'N/A']]],
    control:[['h','Settings'],['Dolby Decoding',[G, en?'Enabled':'Disabled']],['Secondary Audio Selector (AES4)',[G, sn.dolby_stereo_output?'Dolby Decoder LtRt Downmix':'Embedded Dolby Secondary Audio Program']],
      ['Group 3 Output Selector (AES5/AES6)',[G, ['Emb. Audio Grp 1','Emb. Audio Grp 2','Emb. Audio Grp 3','Emb. Audio Grp 4'][sn.group3_sel&3]]],
      ['h','Dolby Decoder Settings'],['Dolby Decoder Input',[G, en? DEC_IN[sn.dolby_selector] : 'N/A']],['Downmix',{oid:0x0704,val:sn.downmix,opts:['LtRt','LoRo']}],['Dialnorm',{oid:0x0703,val:sn.dialnorm,opts:['Disabled','Enabled']}],
      ...(sn.dashboard_enabled? [['PCM Metadata',{oid:0x0708,val:sn.pcm,opts:['Disabled','Enabled']}],['Settings',{oid:0x0301,button:'Save'}]] : []),
      ['h','In ParamOIDS but in no menu'],['Notify on Card Fault (0x0400)',{oid:0x0400,val:sn.notify,opts:['Disabled','Enabled']}],['Dolby Decoder AES Selector (0x0706, read-write)',{oid:0x0706,val:sn.dolby_swap||0,opts:['AES 1','AES 2']}]] };
}
function dashHTML(t){
  const m=dashModel(t), s=sched(); const lastTx=[...s.can].reverse().find(f=>f.t0<=absT(t) && f.dir==='tx');
  const node=D.dashNode; const rows = node==='info'? m.info.map(([a,b])=>['',a,b]) : node==='control'? m.control : m.status;
  const cell = v=>{ if (Array.isArray(v)) return `${dot(v[0])}${esc(v[1])}`; if (typeof v==='string') return esc(v);
    if (v.button) return `<button data-oid="${v.oid}" data-val="0" data-lab="Settings">${v.button}</button>`;
    return `<select data-oid="${v.oid}" data-lab="${esc(v.lab||'')}">${v.opts.map((o,i)=>`<option value="${i}" ${i===v.val?'selected':''}>${esc(o)}</option>`).join('')}</select>`; };
  let body='<table>'; for (const r of rows){ if (r[0]==='h'){ body+=`</table><h4>${esc(r[1])}</h4><table>`; continue; } const [a,b] = r.length===3? [r[1],r[2]] : r; body+=`<tr><td>${esc(a)}</td><td>${cell(b)}</td></tr>`; } body+='</table>';
  return `<div class="m62dash"><div class="tb">${m.title} · slot ${world(absT(t)).slot}<span class="sp"></span>${dot(m.state[0])}${esc(m.state[1])} · ${dot(G)}Online</div>
    <div class="bd"><div class="tree">${[['info','Card Info'],['status','Card Status'],['control','Card Settings']].map(([k,l])=>`<div data-node="${k}" class="${node===k?'on':''}">${l}</div>`).join('')}</div>
    <div class="pp">${body}<div class="small muted" style="margin-top:6px">Values are the firmware variables at the playhead; DashBoard sees them on the next CAN report${lastTx? ` (last frame to the frame controller: ${esc(lastTx.label)} at ${SIM.fmtT(lastTx.t0-page0())})`:''}.</div></div></div></div>`;
}

/* ---------------- world controls ---------------- */
function controlsHTML(){
  const w=world(absT()), sn=snapAt(absT())||{};
  const sel=(id,opts,cur)=>`<select id="${id}">${opts.map(([v,l])=>`<option value="${v}" ${String(cur)===String(v)?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
  const gr = g=>`<span style="white-space:nowrap"><label><input type="checkbox" data-gon="${g}" ${w.grp[g].on?'checked':''}>G${g+1}</label> ${[0,1].map(pr=>`<select data-g="${g}" data-p="${pr}">${['P','E','D'].map(k=>`<option value="${k}" ${w.grp[g].p[pr]===k?'selected':''}>AES${pr+1} ${k==='P'?'PCM':k==='E'?'Dolby E':'AC-3'}</option>`).join('')}</select>`).join(' ')}</span>`;
  return `<div class="small" style="display:grid;grid-template-columns:auto 1fr;gap:5px 10px;align-items:center">
    <span class="muted">Timeline</span><span>${sel('m62scn',Object.keys(SCN).map(k=>[k,SCN[k].label]),D.scn)} ${sel('m62page',SCN[D.scn].pages.map((p,i)=>[i,p[1]]),D.page)}</span>
    <span class="muted">Firmware</span><span>${sel('m62build',[['AE','M6202AE v2.02 (atmel/v202)'],['A','M6202A v1.04 not released (atmel/v104)']],D.build)}</span>
    <span class="muted">SDI source</span><span>${sel('m62fmt',Object.keys(VF).map(k=>[k,VF[k].name]),w.fmt)} <button id="m62cab">${w.cable?'unplug':'plug in'}</button></span>
    <span class="muted">Embedded audio</span><span>${[0,1,2,3].map(gr).join('<br>')}</span>
    <span class="muted">Programme</span><span>Dolby E ${sel('m62prog',Object.keys(PROG).filter(k=>PROG[k].kind==='E').map(k=>[k,k]),w.prog)} · AC-3 ${sel('m62ac3',Object.keys(PROG).filter(k=>PROG[k].kind==='D').map(k=>[k,k]),w.ac3)}</span>
    <span class="muted">Hardware</span><span><button id="m62catb">${w.cat?'remove':'fit'} decoder module</button> rear ${sel('m62rear',Object.keys(REARS).map(k=>[k,k+' ('+REARS[k].imp+')']),w.rear)} <button id="m62rst">Reset everything</button></span></div>
    <div class="small muted" style="margin-top:4px">Keys: 1–8 flip SW1-1…8 · C plug/unplug SDI · M fit/remove module · B rebuild (switch firmware). Actions happen at the playhead and the firmware model reruns from there.</div>`;
}
function bindAll(m){
  const q=s=>m.querySelector(s);
  m.querySelectorAll('.m62dip').forEach(g=>g.addEventListener('click',()=>A.dip(+g.dataset.i)));
  m.querySelectorAll('.m62chip').forEach(g=>g.addEventListener('click',()=>{ D.selChip = D.selChip===g.dataset.c? null : g.dataset.c; SIM.refresh(); }));
  m.querySelectorAll('.m62cat').forEach(g=>g.addEventListener('click',()=>A.cat()));
  m.querySelectorAll('.m62sdi').forEach(g=>g.addEventListener('click',()=>A.cable()));
  m.querySelectorAll('.m62out').forEach(g=>g.addEventListener('click',()=>{ D.scope=+g.dataset.o; SIM.refresh(); }));
  m.querySelectorAll('.m62dash [data-node]').forEach(d=>d.addEventListener('click',()=>{ D.dashNode=d.dataset.node; SIM.refresh(); }));
  m.querySelectorAll('.m62dash select[data-oid]').forEach(s=>s.addEventListener('change',()=>{ const lab=s.closest('tr').firstChild.textContent; A.dash(+s.dataset.oid, +s.value, lab); }));
  m.querySelectorAll('.m62dash button[data-oid]').forEach(b=>b.addEventListener('click',()=>A.dash(+b.dataset.oid, 0, 'Settings → Save')));
  if (q('#m62scn')) q('#m62scn').onchange=e=>A.scn(e.target.value);
  if (q('#m62page')) q('#m62page').onchange=e=>A.page(+e.target.value);
  if (q('#m62build')) q('#m62build').onchange=e=>A.build(e.target.value);
  if (q('#m62fmt')) q('#m62fmt').onchange=e=>A.fmt(e.target.value);
  if (q('#m62cab')) q('#m62cab').onclick=()=>A.cable();
  if (q('#m62catb')) q('#m62catb').onclick=()=>A.cat();
  if (q('#m62rst')) q('#m62rst').onclick=()=>A.reset();
  if (q('#m62rear')) q('#m62rear').onchange=e=>A.rear(e.target.value);
  if (q('#m62prog')) q('#m62prog').onchange=e=>A.prog(e.target.value);
  if (q('#m62ac3')) q('#m62ac3').onchange=e=>A.prog(e.target.value);
  m.querySelectorAll('[data-gon]').forEach(c=>c.onchange=()=>A.grp(+c.dataset.gon,-1));
  m.querySelectorAll('select[data-g]').forEach(s=>s.onchange=()=>A.grp(+s.dataset.g,+s.dataset.p,s.value));
}
window.__m6202Active=false;
document.addEventListener('keydown', e=>{
  if (!window.__m6202Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase();
  if (/^[1-8]$/.test(k)){ A.dip(+k-1); e.preventDefault(); } else if (k==='c'){ A.cable(); e.preventDefault(); } else if (k==='m'){ A.cat(); e.preventDefault(); }
  else if (k==='b'){ A.build(D.build==='AE'?'A':'AE'); e.preventDefault(); }
});

/* =====================================================================
   TIMELINE LANES
   ===================================================================== */
function lineT(f){ return 1/(f.fr*f.lines); }
function lineHasNoPkt(f, ln){ return f.sw.some(s=> ln===s+1); }      // no audio packets on the line after the switching line (SMPTE 299M/272M, simplified)
function lineSamples(f, n){ const Tl=lineT(f), ln=(n%f.lines)+1; if (lineHasNoPkt(f,ln)) return [];
  let a=Math.ceil((n-1)*Tl*48000-1e-9), b=Math.ceil(n*Tl*48000-1e-9); const pl=((n-1)%f.lines)+1; if (n>0 && lineHasNoPkt(f,pl)) a=Math.ceil((n-2)*Tl*48000-1e-9);
  const o=[]; for (let k=Math.max(0,a); k<b; k++) o.push(k); return o; }
function linePackets(f, n, gm){ const smp=lineSamples(f,n); if (!smp.length) return []; const o=[]; let wd=f.hdr;
  for (let g=0; g<4; g++){ if (!((gm>>g)&1)) continue; if (f.sd){ const len=7+12*smp.length; o.push({g,w0:wd,w1:wd+len,samples:smp}); wd+=len; } else for (const k of smp){ o.push({g,w0:wd,w1:wd+31,samples:[k]}); wd+=31; } }
  return o; }
function gmask(t){ const w=world(t); let m=0; w.grp.forEach((g,i)=>{ if (g.on) m|=1<<i; }); return m; }
const STEPC = s => s==='B'? '--warn' : ['--ink2','--accent2','--accent','--ink2','--ink2','--warn','--bad','--accent2','--accent','--bad','--ink2','--accent','--ink2','--warn'][s] || '--ink2';
function txtFit(c, s, x, y, maxW){ if (maxW<16) return; let t=s; while (t.length>2 && c.measureText(t).width>maxW-4) t=t.slice(0,-1); if (t.length<s.length) t=t.slice(0,-1)+'…'; c.fillText(t,x,y); }
function lanes(){
  const s=sched(), P0=page0(), A0=t=>P0+t, css=n=>SIM.css(n); const L=[];
  const nocab=(c,X,t0,y,h)=>{ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('SDI IN: no signal', X(t0)+6, y+h/2+4); };
  L.push({label:'SDI in: frames / fields', h:26, draw(c,X,t0,t1,y,h){ const tm=A0(SIM.t); if (!world(tm).cable) return nocab(c,X,t0,y,h);
    const f=fmtAt(tm), Tf=1/f.fr, a=A0(t0), b=A0(t1), n0=Math.floor(a/Tf), n1=Math.ceil(b/Tf);
    if (n1-n0>400){ SIM.pulses(c,X,t0,t1,y,h,Tf,((-P0)%Tf),Tf*0.02,css('--accent2'),'frames'); return; }
    c.font='10px '+css('--mono'); for (let n=n0;n<=n1;n++){ const ta=n*Tf-P0, x=X(ta); c.fillStyle=css('--accent2'); c.fillRect(x,y+3,2,h-6);
      if (f.il){ c.globalAlpha=.5; c.fillRect(X(ta+Tf/2),y+8,1.5,h-16); c.globalAlpha=1; } if (X(ta+Tf)-x>70){ c.fillStyle=css('--ink'); c.fillText(`frame ${n}${f.il?' F1':''}`, x+4, y+12); } } }});
  L.push({label:'SDI lines: EAV · HANC · SAV', h:32, draw(c,X,t0,t1,y,h){ const tm=A0(SIM.t); if (!world(tm).cable) return;
    const f=fmtAt(tm), Tl=lineT(f), wt=1/f.clk, a=A0(t0), b=A0(t1), n0=Math.floor(a/Tl), n1=Math.ceil(b/Tl), pxl=X(t0+Tl)-X(t0), gm=gmask(tm);
    if (pxl<3){ SIM.pulses(c,X,t0,t1,y,h,Tl,((-P0)%Tl),Tl*0.12,css('--ink2'),`lines (${f.lines}/frame, ${f.spl} words each)`); return; }
    for (let n=n0;n<=n1;n++){ const ta=n*Tl-P0, xe=X(ta), xh=X(ta+f.hdr*wt), xs=X(ta+(f.spl-f.act-4)*wt), xa=X(ta+(f.spl-f.act)*wt), xn=X(ta+Tl);
      c.fillStyle=css('--bad'); c.fillRect(xe,y+4,Math.max(1,xh-xe),h-8); c.fillStyle=css('--chip'); c.fillRect(xh,y+4,xs-xh,h-8);
      c.fillStyle=css('--warn'); c.fillRect(xs,y+4,Math.max(1,xa-xs),h-8); c.fillStyle=css('--grid'); c.fillRect(xa,y+4,xn-xa,h-8);
      if (pxl>30) for (const p of linePackets(f,n,gm)){ c.fillStyle=css(GCOL[p.g]); c.fillRect(X(ta+p.w0*wt),y+7,Math.max(1,X(ta+p.w1*wt)-X(ta+p.w0*wt)-.5),h-14); }
      if (pxl>160){ c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); txtFit(c,`line ${(n%f.lines)+1} · active video`, xa+4, y+h/2+4, xn-xa); c.fillStyle=css('--ink2'); txtFit(c,'EAV', xe+1, y+h-6, xh-xe+20); txtFit(c,'HANC',xh+3,y+12,xs-xh); } } }});
  L.push({label:'HANC audio packets G1–G4', h:30, draw(c,X,t0,t1,y,h){ const tm=A0(SIM.t); if (!world(tm).cable) return;
    const f=fmtAt(tm), Tl=lineT(f), wt=1/f.clk, gm=gmask(tm), a=A0(t0), b=A0(t1), n0=Math.floor(a/Tl), n1=Math.ceil(b/Tl), gs=[0,1,2,3].filter(g=>(gm>>g)&1);
    if (!gs.length){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('no embedded audio', X(t0)+6, y+h/2+4); return; }
    if (n1-n0 > (X(t1)-X(t0))/2){ c.globalAlpha=.3; gs.forEach((g,k)=>{ c.fillStyle=css(GCOL[g]); c.fillRect(X(t0),y+3+k*(h-6)/gs.length,X(t1)-X(t0),(h-6)/gs.length-1); }); c.globalAlpha=1;
      c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${f.sd?'one packet per group per line':'48 000 packets/s per group'} · DIDs ${gs.map(g=>(f.sd?DID.sd:DID.hd)[g]).join(' ')}`, X(t0)+6, y+h/2+4); return; }
    for (let n=n0;n<=n1;n++){ const ta=n*Tl-P0; for (const p of linePackets(f,n,gm)){ const xa=X(ta+p.w0*wt), xb=X(ta+p.w1*wt); c.fillStyle=css(GCOL[p.g]); c.fillRect(xa,y+4+p.g*(h-8)/4,Math.max(1.5,xb-xa),(h-8)/4-1);
      if (xb-xa>80){ c.fillStyle='#fff'; c.font='9px '+css('--mono'); txtFit(c,`G${p.g+1} DID ${(f.sd?DID.sd:DID.hd)[p.g]} s${p.samples[0]}`, xa+2, y+4+p.g*(h-8)/4+6, xb-xa); } } } }});
  L.push({label:'48 kHz audio samples', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/48000,((-P0)%(1/48000)),2e-6,css('--accent'),'samples'); }});
  L.push({label:()=>{ const d=dipDecodeAE(world(A0(SIM.t))); return `SMPTE 337 bursts · G${d.grp+1} AES${d.selAES+1}`; }, h:30, draw(c,X,t0,t1,y,h){
    const tm=A0(SIM.t), inp=decInput(tm), f=fmtAt(tm), ty=inp.ty; const pw=X(t1)-X(t0), span=t1-t0;
    if (ty==='E'||ty==='D'){ const P=burstPeriod(ty,f), ph=burstPhase(ty,f), Lb=burstLen(ty,f); const n0=Math.floor((A0(t0)-ph)/P)-1, n1=Math.ceil((A0(t1)-ph)/P);
      for (let n=n0;n<=n1 && n-n0<3000;n++){ const ta=n*P+ph-P0; if (!grpPresent(inp.g, ta+P0)) continue; c.fillStyle=css(ty==='E'?'--accent2':'--warn'); c.globalAlpha=.55; c.fillRect(X(ta),y+3,Math.max(1,X(ta+Lb)-X(ta)),h*0.5-3); c.globalAlpha=1;
        c.fillStyle=css('--bad'); c.fillRect(X(ta),y+2,Math.max(1.5,X(ta+2/48000)-X(ta)),h*0.5);
        if (X(ta+Lb)-X(ta)>120){ c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); c.fillText(`Pa F872 · Pb 4E1F · Pc type ${ty==='E'?28:1} · ${ty==='E'?'Dolby E frame':'AC-3 sync frame'}`, X(ta)+4, y+12); } } }
    const M=Math.min(400,Math.ceil(pw/2)); for (let j=0;j<M;j++){ const tt=t0+span*(j+.5)/M, cf=compressedFlag(inp.g,inp.pr,A0(tt)); if (cf && cf!=='P'){ c.fillStyle=css('--bad'); c.globalAlpha=.6; c.fillRect(X(t0+span*j/M), y+h*0.62, pw/M+0.6, h*0.3); c.globalAlpha=1; } }
    c.fillStyle=css('--ink2'); c.font='9px sans-serif'; c.fillText('non_audio_detector flag (held 32767 frames)', X(t0)+4, y+h-2); }});
  L.push({label:'CAT552: RESET_552 · decoder', h:28, draw(c,X,t0,t1,y,h){
    const pw=X(t1)-X(t0), span=t1-t0, M=Math.min(500,Math.ceil(pw/2)); const col={reset:'--bad',acq:'--warn',E:'--accent2',D:'--accent2',PCM:'--accent',idle:'--grid',absent:'--grid'};
    for (let j=0;j<M;j++){ const tt=t0+span*(j+.5)/M, st=decState(A0(tt), s.resets).st; c.fillStyle=css(col[st]); c.globalAlpha= st==='idle'||st==='absent'? .5 : .75; c.fillRect(X(t0+span*j/M), y+5, pw/M+0.6, h-10); c.globalAlpha=1; }
    c.font='10px sans-serif'; for (const r of s.resets){ const a=r.t0-P0, b=r.t1-P0; if (b<t0||a>t1) continue; c.fillStyle='#fff'; if (X(b)-X(a)>60) txtFit(c, `RESET_552 low ${SIM.fmtDur(r.t1-r.t0)} · ${r.why}`, X(a)+3, y+h/2+4, X(b)-X(a)); }
    const st=decState(A0((t0+t1)/2), s.resets).st; c.fillStyle=css('--ink'); c.font='10px sans-serif'; if (st==='absent') c.fillText('no module on P5', X(t0)+6, y+h/2+4); }});
  for (let k=0;k<6;k++) L.push({label:()=>{ const r=outRoute(k,A0(SIM.t)); return `AES${k+1} OUT: ${r? (r.kind==='data'?'bitstream':(r.labels? r.labels.join('/') : r.src.replace(/^.*\(embedded /,'emb ').replace(')',''))) : '—'}`; }, h:26, draw(c,X,t0,t1,y,h){
    const pw=X(t1)-X(t0), span=t1-t0, M=Math.max(1,Math.min(300,Math.ceil(pw/3))), N=Math.min(1600,Math.max(200,pw*2)), cols=[css('--accent'),css('--bad')];
    const act=[]; for (let j=0;j<M;j++) act.push(outRoute(k,A0(t0+span*(j+.5)/M)));
    c.fillStyle=css('--grid'); for (let j=0;j<M;j++) if (!act[j]) c.fillRect(X(t0+span*j/M),y+2,pw/M+0.6,h-4);
    const mid=act[Math.floor(M/2)]; if (!mid) return;
    if (mid.kind==='data'){ c.fillStyle=css('--warn'); c.globalAlpha=.25; for (let j=0;j<M;j++) if (act[j]&&act[j].kind==='data') c.fillRect(X(t0+span*j/M),y+4,pw/M+.6,h-8); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText(mid.src+' — passed as data', X(t0)+6, y+h/2+4); return; }
    [0,1].forEach(sd=>{ const fmax=Math.max(0,...mid.tones[sd].map(z=>z[0])); if (!mid.tones[sd].length) return;
      if (span*fmax > pw/3){ c.globalAlpha=.3; c.fillStyle=cols[sd]; for (let j=0;j<M;j++) if (act[j]&&act[j].kind==='pcm') c.fillRect(X(t0+span*j/M), y+h/2-0.3*(h/2-2), pw/M+.6, 0.6*(h/2-2)); c.globalAlpha=1; return; }
      c.strokeStyle=cols[sd]; c.lineWidth=1; c.beginPath(); let pen=false;
      for (let j=0;j<=N;j++){ const tt=t0+span*j/N, sl=Math.min(M-1,Math.floor(j/N*M)); if (!act[sl]||act[sl].kind!=='pcm'){ pen=false; continue; } const v=outSample(k,sd,A0(tt))||0, yy=y+h/2-v*1.5*(h/2-2); if (pen) c.lineTo(X(tt),yy); else { c.moveTo(X(tt),yy); pen=true; } }
      c.stroke(); }); }});
  L.push({label:'AT90CAN128 main loop', h:32, draw(c,X,t0,t1,y,h){ const a=A0(t0), b=A0(t1); c.font='10px sans-serif'; let i=Math.max(0,bs(s.ops,a));
    for (; i<s.ops.length; i++){ const o=s.ops[i]; if (o.t0>b) break; const xa=X(o.t0-P0), xb=X(o.t1-P0); c.fillStyle=css(STEPC(o.step)); c.globalAlpha= o.step==='B'? .55 : (o.step%2? .6 : .85); c.fillRect(xa,y+3,Math.max(1,xb-xa-.4),h-6); c.globalAlpha=1;
      if (xb-xa>40){ c.fillStyle='#fff'; txtFit(c, o.label.split(':')[0], xa+3, y+h/2+3, xb-xa); } } }});
  L.push({label:'FPGA bus: CLK PA2 · DATA PA7 · PINC3/5/4', h:40, draw(c,X,t0,t1,y,h){ const a=A0(t0), b=A0(t1); let i=Math.max(0,bs(s.xf,a)); c.font='10px '+css('--mono');
    const bpx=X(t0+WBIT)-X(t0);
    for (; i<s.xf.length; i++){ const x=s.xf[i]; if (x.t0>b) break; if (x.t1<a) continue; const xa=X(x.t0-P0), xb=X(x.t1-P0);
      if (bpx>9){ const bt = x.w? WBIT : RBIT, per=8*bt+BYTE_OVH;
        x.bytes.forEach((v,bi)=>{ const tb=x.t0+bi*per-P0; for (let k=0;k<8;k++){ const t=tb+k*bt, x0=X(t), x1=X(t+bt); if (x1<X(t0)-5||x0>X(t1)+5) continue; const bit = v===null? (Math.sin((bi*8+k)*91.7+x.t0*1e4)>0?1:0) : (v>>(7-k))&1;
          c.strokeStyle=css('--ink'); c.beginPath(); c.moveTo(x0,y+14); c.lineTo(x0+(x1-x0)*.5,y+14); c.lineTo(x0+(x1-x0)*.5,y+6); c.lineTo(x1,y+6); c.stroke();
          c.fillStyle= bit? css(x.w?'--accent':'--warn') : css('--grid'); c.fillRect(x0,y+18,x1-x0-1,8);
          if (x1-x0>14){ c.fillStyle=css('--ink'); c.fillText(v===null?'?':String(bit), x0+2, y+36); } }
          if (per*1/(t1-t0)*(X(t1)-X(t0))>60){ c.fillStyle=css('--ink2'); c.fillText(`${x.w?'W':'R'}${bi+1} ${v===null?'??':'0x'+hx(v)}`, X(tb)+2, y+h-1); } });
        continue; }
      c.fillStyle=css(x.w?'--warn':'--accent2'); c.globalAlpha=.85; c.fillRect(xa,y+5,Math.max(1,xb-xa-.4),h-10); c.globalAlpha=1;
      if (xb-xa>60){ c.fillStyle='#fff'; txtFit(c, x.w? `ALTERA_write ${x.bytes.map(v=>v===null?'??':hx(v)).join(' ')}${xb-xa>260?' · '+x.from:''}` : `ALTERA_read ${x.bytes.slice(0,6).map(v=>hx(v)).join(' ')} …`, xa+3, y+h/2+4, xb-xa); } }
    if (bpx>9){ c.fillStyle=css('--ink2'); c.font='9px sans-serif'; c.fillText('CLK', X(t0)+2, y+12); c.fillText('DATA', X(t0)+2, y+26); } }});
  L.push({label:'timer0 1 ms · SD_RESET (PA5)', h:22, draw(c,X,t0,t1,y,h){ if (D.build==='AE') SIM.pulses(c,X,t0,t1,y,h*0.5,T0,0.00037%T0,10e-6,css('--ink2'),'timer0_ovf_isr');
    for (const r of s.sdrst){ const a=r.t0-P0, b=r.t1-P0; if (b<t0||a>t1) continue; c.fillStyle=css('--bad'); c.fillRect(X(a),y+h*0.55,Math.max(2,X(b)-X(a)),h*0.4); }
    for (const r of s.isr){ const a=r.t0-P0; if (a<t0||a>t1) continue; c.fillStyle=css('--warn'); c.fillRect(X(a)-1,y+2,3,h-4); } }});
  L.push({label:'CAN 1 Mbit/s (timer1 96 µs)', h:24, draw(c,X,t0,t1,y,h){ const a=A0(t0), b=A0(t1); if (X(t0+T1)-X(t0)>4) SIM.pulses(c,X,t0,t1,y+h-6,5,T1,0,2e-6,css('--grid'),'timer1');
    c.font='10px '+css('--mono'); for (const f of s.can){ if (f.t1<a||f.t0>b) continue; const xa=X(f.t0-P0), xb=X(f.t1-P0); c.fillStyle=css(f.dir==='rx'?'--accent2':'--accent'); c.fillRect(xa,y+(f.dir==='rx'?3:h/2-3),Math.max(2,xb-xa),h/2-3);
      if (xb-xa>70){ c.fillStyle='#fff'; txtFit(c,(f.dir==='rx'?'← ':'→ ')+f.label, xa+2, y+(f.dir==='rx'?12:h-8), xb-xa); } else { c.fillStyle=css('--ink2'); c.fillText(f.dir==='rx'?'←':'→', xa+3, y+(f.dir==='rx'?12:h-8)); } } }});
  L.push({label:'LEDs SD HD ERR · AES1–4 · DOLBY1–4', h:36, draw(c,X,t0,t1,y,h){ const rows=[['sd','#2fbf5b'],['hd','#2fbf5b'],['err','#e0453a'],['a1','#e3a400'],['a2','#e3a400'],['a3','#e3a400'],['a4','#e3a400'],['d1','#b58a00'],['d2','#b58a00'],['d3','#b58a00'],['d4','#b58a00']];
    rows.forEach(([n,col],r)=>{ const hs=s.leds[n]; c.fillStyle=col; for (let j=0;j<hs.length;j++){ if (!hs[j][1]) continue; const ta=hs[j][0]-P0, tb=(j+1<hs.length?hs[j+1][0]:1e9)-P0; if (tb<t0||ta>t1) continue; c.fillRect(X(Math.max(ta,t0)),y+2+r*3,X(Math.min(tb,t1))-X(Math.max(ta,t0)),2.4); } }); }});
  L.push({label:'FPGA configuration (EPCS4)', h:20, draw(c,X,t0,t1,y,h){ c.font='11px sans-serif'; let any=false;
    for (const g of s.cfg){ const a=g.t0-P0, b=g.t1-P0; if (b<t0||a>t1) continue; any=true; c.fillStyle=css('--warn'); c.globalAlpha=.5; c.fillRect(X(a),y+3,X(b)-X(a),h-6); c.globalAlpha=1; c.fillStyle=css('--ink'); txtFit(c, g.why+' ('+SIM.fmtDur(CFG_T)+', inferred)', X(Math.max(a,t0))+4, y+h/2+4, X(b)-X(Math.max(a,t0))); }
    if (!any){ c.fillStyle=css('--ink2'); c.fillText('FPGA configured (CONF_DONE high)', X(t0)+6, y+h/2+4); } }});
  return L.map(l=> typeof l.label==='function'? Object.assign({},l,{label:l.label()}) : l);
}

/* ---------------- AES3 scope ---------------- */
function aesFrame(t, k){ const n=Math.max(0,Math.floor(t*48000)), fr=((n%192)+192)%192, r=outRoute(k,t); const out=[];
  for (const side of [0,1]){ const v=outSample(k,side,t); const vv=v===null?0:v; let s=Math.round(vv*8388607); if (s<0) s+=1<<24;
    const bits=new Array(32).fill(0); for (let b=0;b<24;b++) bits[4+b]=(s>>b)&1; let p=0; for (let b=4;b<31;b++) p^=bits[b]; bits[31]=p;
    out.push({pre: side?'Y':(fr===0?'Z':'X'), bits, v:vv, raw:s}); }
  return {n, fr, sub:out, r}; }
function biphase(pre, bits, start){ const P={X:[1,1,1,0,0,0,1,0],Y:[1,1,1,0,0,1,0,0],Z:[1,1,1,0,1,0,0,0]}[pre]; const lv=P.map(b=> start?1-b:b); let cur=lv[lv.length-1]; for (let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if (bits[i]) cur=1-cur; lv.push(cur); } return lv; }
function drawScope(cv, el, t){
  const Fm=aesFrame(t, D.scope); const {c,w}=SIM.canvas(cv,130); const ink=SIM.css('--ink'), ink2=SIM.css('--ink2');
  if (!Fm.r){ c.fillStyle=ink2; c.font='13px sans-serif'; c.fillText(`AES${D.scope+1} OUT carries nothing at this instant (no lock, FPGA configuring, decoder muted or not routed).`, 10, 60); el.innerHTML=''; return; }
  const la=biphase(Fm.sub[0].pre,Fm.sub[0].bits,0), lb=biphase('Y',Fm.sub[1].bits,la[la.length-1]), lv=la.concat(lb), cw=(w-20)/lv.length;
  [[0,8,'--warn','preamble'],[8,16,'--ink2','aux'],[16,56,'--accent','audio (20 bits)'],[56,64,'--accent2','V U C P']].forEach(([a,b,col,lab])=>[0,64].forEach(o=>{ c.fillStyle=SIM.css(col); c.globalAlpha=.12; c.fillRect(10+(o+a)*cw,14,(b-a)*cw,70); c.globalAlpha=1; c.fillStyle=ink2; c.font='10px sans-serif'; if ((b-a)*cw>30) c.fillText(lab, 12+(o+a)*cw, 98); }));
  c.strokeStyle=ink; c.lineWidth=1.5; c.beginPath(); lv.forEach((v,i)=>{ const x=10+i*cw, yy=v?24:74; if (i===0) c.moveTo(x,yy); else c.lineTo(x,yy); c.lineTo(x+cw,yy); }); c.stroke();
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`${Fm.sub[0].pre} subframe A · Y subframe B · frame ${Fm.fr} of 192`, 10, 120);
  el.innerHTML = `<b>AES${D.scope+1} OUT</b> ← ${esc(Fm.r.src)} · A = ${Fm.sub[0].raw.toString(16).padStart(6,'0')} (${(Fm.sub[0].v).toFixed(3)}), B = ${Fm.sub[1].raw.toString(16).padStart(6,'0')}${Fm.r.kind==='data'?' · bitstream passed bit-exact: the receiver must see channel-status byte 0 bit 1 = non-PCM ('+inf+')':''}`;
}

/* =====================================================================
   VIEWS
   ===================================================================== */
const card = (title, body, cls)=>`<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`;
function traceHTML(){ const l=D.log[0]; return l? `<div><b>${esc(l.name)}</b> <span class="muted">at ${SIM.fmtT(l.t)} (absolute ${l.abs.toFixed(4)} s)</span></div>`+l.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click the DIP switches, the P5 module, SDI IN on the rear module, or change a DashBoard parameter. Each step the firmware and FPGA take is listed here with the names from the source.</div>'; }
function chipInfo(){ const c=CHIPS.find(x=>x[0]===D.selChip); return c? `<b>${c[0]}</b>: ${c[5]}` : '<span class="muted">Click a part on the card for what it does.</span>'; }
function inspHTML(t){ const sn=snapAt(t)||sched().M, op=opAt(t), w=world(t), ds=decState(t, resets());
  const A=sn.ALT||[]; return `<table class="kv"><tr><th>playhead op</th><td class="mono">${op? esc((op.step==='B'?'boot · ':'step '+op.step+' · ')+op.label) : '—'}</td></tr>
   <tr><th>CD · sdi_format</th><td class="mono">${sn.CD} · ${['NO_LOCK','SD_FORMAT','HD_FORMAT'][sn.sdi_format]}</td></tr>
   <tr><th>DIP_SWITCHES</th><td class="mono">0x${hx(sn.DIP)} = ${bn(sn.DIP)} (bit n = SW n+1, ON = 0)</td></tr>
   <tr><th>dolby_enabled · selector · group3_sel · stereo_out</th><td class="mono">${sn.dolby_enabled} · ${sn.dolby_selector} · ${sn.group3_sel} · ${sn.dolby_stereo_output}</td></tr>
   <tr><th>dip_switch_enabled · dashboard_enabled</th><td class="mono">${sn.dip_switch_enabled?'YES':'NO'} · ${sn.dashboard_enabled?'YES':'NO'}</td></tr>
   <tr><th>dolby_upper · dolby_lower</th><td class="mono">0x${hx(sn.dolby_upper)} (${bn(sn.dolby_upper)}) · 0x${hx(sn.dolby_lower)} (${bn(sn.dolby_lower)})</td></tr>
   <tr><th>downmix · dialnorm · pcm_metadata</th><td class="mono">${sn.downmix?'LORO':'LTRT'} · ${sn.dialnorm?'ENABLED':'DISABLED'} · ${sn.pcm?'ENABLED':'DISABLED'}</td></tr>
   <tr><th>reset_enable · reset_counter · sd_audio_stable</th><td class="mono">${sn.reset_enable} · ${sn.reset_counter} · ${sn.sd_audio_stable} (counter ${sn.sd_audio_stable_counter})</td></tr>
   <tr><th>Dolby_card_status · dolby_counter</th><td class="mono">${sn.Dolby_card_status?'OK':'ERROR'} · ${sn.dolby_counter} / 5000</td></tr>
   <tr><th>aes1…8_lock</th><td class="mono">${sn.lock.map(v=>LOCKCH[v]).join(' ')}</td></tr>
   <tr><th>ALTERA1–18 (raw)</th><td class="mono small">${A.slice(1).map(v=>hx(v)).join(' ')}</td></tr>
   <tr><th>decoder (P5)</th><td>${({absent:'not fitted',reset:'held in reset',idle:'idle',acq:'acquiring',E:'decoding Dolby E',D:'decoding AC-3',PCM:'PCM pass-through'})[ds.st]} · input G${decInput(t).g+1} AES${decInput(t).pr+1} (${TYPE[decInput(t).ty]})</td></tr></table>`; }
let CTRLKEY='';
function viewSim(m){
  window.__m6202Active=true;
  m.innerHTML = card('M6202A ISS3 card — top side from the gerbers', `<div id="m62card"></div><div class="small" id="m62chip" style="margin-top:4px"></div>
     <div class="small muted">GERBERS/M6202A-ISS3.TOP + .TSM + .TSS rendered at 120 dpi; LEDs, SW1 and the P5 outline placed from M6202A-iss3.pnp. The photo (M6202A Color.jpg, ISS2) shows black mask and gold pads; it has no decoder module fitted.</div>`)
   + `<div class="grid2"><div>${card('Rear module · card edge', `<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start"><div id="m62rear" style="flex:1;min-width:180px"></div><div id="m62edge" style="flex:1;min-width:170px"></div></div><div class="small muted">Rear module from M6202AE Rear Modules.cdr; click SDI IN to plug or unplug, click an AES output to scope it.</div>`)}
       ${card('Source and hardware', '<div id="m62ctl"></div>')}
       ${card('AES3 output at the playhead', '<canvas id="m62scope"></canvas><div class="small" id="m62scopeTxt"></div>')}</div>
     <div>${card('DashBoard (frame controller view)', '<div id="m62dash"></div>')}
       ${card('What the firmware did', '<div class="log" id="m62trace"></div>')}
       ${card('Inspector (firmware variables at the playhead)', '<div id="m62insp"></div>')}</div></div>`;
  CTRLKEY='';
  SIM.on('time', ()=>{ const t=absT();
    m.querySelector('#m62card').innerHTML=cardSVG(t); m.querySelector('#m62chip').innerHTML=chipInfo();
    m.querySelector('#m62rear').innerHTML=rearSVG(t); m.querySelector('#m62edge').innerHTML=edgeSVG(t);
    const ck=JSON.stringify([D.base,D.ev,D.scn,D.page,D.build]); if (ck!==CTRLKEY){ CTRLKEY=ck; m.querySelector('#m62ctl').innerHTML=controlsHTML(); }
    const dk=document.activeElement && document.activeElement.closest && document.activeElement.closest('#m62dash'); if (!dk) m.querySelector('#m62dash').innerHTML=dashHTML(SIM.t);
    m.querySelector('#m62trace').innerHTML=traceHTML(); m.querySelector('#m62insp').innerHTML=inspHTML(t);
    drawScope(m.querySelector('#m62scope'), m.querySelector('#m62scopeTxt'), t);
    bindAll(m); });
}
function viewSecond(m){
  window.__m6202Active=true;
  m.innerHTML = card('One second in slow motion', `<div id="m62ctl2"></div><canvas id="m62tl"></canvas>
     <div class="small muted" style="margin-top:4px">Zoom to 1 ms to see the main-loop passes (≈ ${SIM.fmtDur(passT())} each, ${infT('instruction counts in the ICCAVR listings')}), to 100 µs for SDI lines and HANC packets, to 20 µs for single bits on the FPGA bus. Click the timeline to move the playhead.</div>`)
   + `<div class="grid2">${card('At the playhead', '<div id="m62here"></div>')}${card('AES3 output', '<canvas id="m62scope2"></canvas><div class="small" id="m62scopeTxt2"></div>')}</div>`;
  CTRLKEY='';
  SIM.on('time', ()=>{ const t=absT();
    const ck=JSON.stringify([D.base,D.ev,D.scn,D.page,D.build]); if (ck!==CTRLKEY){ CTRLKEY=ck; m.querySelector('#m62ctl2').innerHTML=controlsHTML(); bindAll(m); }
    SIM.drawLanes(m.querySelector('#m62tl'), lanes(), {labelW:210});
    const f=fmtAt(t), Tl=lineT(f), n=Math.floor(t/Tl), ln=(n%f.lines)+1, pk=linePackets(f,n,gmask(t)), op=opAt(t), s=sched();
    const near=s.can.find(x=>x.t0<=t && x.t1>=t), xf=s.xf[bs(s.xf,t)];
    m.querySelector('#m62here').innerHTML = `<table class="kv"><tr><th>SDI</th><td>${world(t).cable? `${f.name} · line ${ln} of ${f.lines} · word ${Math.floor((t-n*Tl)*f.clk)} of ${f.spl}` : 'no signal'}</td></tr>
      <tr><th>HANC packets on this line</th><td class="mono small">${pk.length? pk.map(p=>`G${p.g+1} ${(f.sd?DID.sd:DID.hd)[p.g]} (${p.samples.length} smp)`).join(' · ') : 'none (switching line or no audio)'}</td></tr>
      <tr><th>MCU</th><td class="mono small">${op? esc(op.label) : '—'}</td></tr>
      <tr><th>FPGA bus</th><td class="mono small">${xf && t<xf.t1? (xf.w?'ALTERA_write ':'ALTERA_read ')+xf.bytes.map(v=>v===null?'??':hx(v)).join(' ') : 'idle'}</td></tr>
      <tr><th>CAN</th><td class="mono small">${near? esc(near.label) : 'idle'}</td></tr>
      <tr><th>Decoder</th><td>${decState(t,s.resets).st}</td></tr></table>`;
    drawScope(m.querySelector('#m62scope2'), m.querySelector('#m62scopeTxt2'), t); });
}
const TUT = [
  {h:'Read the card edge', d:'With the default HD 1080i/59.94 source, look at the LEDs on the card (or the card-edge strip). The manual says SD = “valid SD-SDI signal”.', goal:()=>ledAt('hd',absT()) && ledAt('sd',absT()), hint:'REFRESH_LEDS() turns SD_LED_ON for HD too (sdi_format == HD_FORMAT → HD_LED_ON and SD_LED_ON). That is a finding, not a fault in your setup.'},
  {h:'Pull the SDI cable and put it back', d:'Click SDI IN on the rear module (or press C) twice. Watch ERR, then the SD_RESET pulse and the CAT552 reset on the One-second tab.', goal:()=> D.ev.some(e=>e.k==='cable'&&e.v===false) && D.ev.some(e=>e.k==='cable'&&e.v===true && e.t>0), hint:'PROCESS_SDI_LOCK_STATUS sets CD; ALTERA_SORT sees new lock flags → reset_enable; timer0 SD_RESET holds PA5 low for 2 ms and calls CAT552_RESET(1000) from inside the ISR.'},
  {h:'Two-group de-embedder: Dolby decoding off', d:'Set SW3 OFF (click switch 3 on the card, or press 3). AES1–4 become Group 1 AES1/AES2 and Group 2 AES1/AES2 (manual Table 3).', goal:()=> !world(absT()).dip[2], hint:'PROCESS_DIP_SWITCHES: (DIP_SWITCHES & BIT2) != 0 → dolby_enabled = NO. DashBoard Outputs switch to “Emb. Audio Grp …”.'},
  {h:'Decode the Dolby E pair', d:'Turn SW3 back ON. The decoder input is selected by SW5/SW6 (group) and SW4 (AES1 or AES2). The default source has Dolby E on Group 1 AES1.', goal:()=> world(absT()).dip[2] && decState(absT(),resets()).st==='E', hint:'Leave SW4, SW5, SW6 OFF: dolby_selector = 0 → “Emb. Audio Grp 1 - AES1”. AES1–3 then carry 1L/1R, 1C/1LFE, 1Ls/1Rs.'},
  {h:'Lt/Rt downmix on AES4', d:'Set SW2 ON. AES4 OUT stops carrying ch 7/8 (2L/2R) and carries the decoder downmix of programme 1.', goal:()=> world(absT()).dip[1] && (outRoute(3,absT())||{}).labels && /t|o/.test((outRoute(3,absT()).labels||[''])[0]), hint:'dolby_stereo_output = 1 → DashBoard “Secondary Audio Selector (AES4)” = “Dolby Decoder LtRt Downmix”.'},
  {h:'Change the downmix type in DashBoard', d:'Open Card Status → Dolby Decoder Settings → Downmix and pick LoRo. Then look at the CAT552 lane on the One-second tab.', goal:()=> D.ev.some(e=>e.k==='dash'&&e.v.oid===0x0704), hint:'downmix_settings changes; the next pass sees pdownmix_settings != downmix_settings and calls CAT552_RESET(55000): RESET_552 low ≈ 48 ms and the main loop blocked for the same time.'},
  {h:'Try the one read-write Dolby selector', d:'Card Settings → “In ParamOIDS but in no menu” → Dolby Decoder AES Selector (0x0706). Pick AES 2 and watch it snap back.', goal:()=> D.ev.some(e=>e.k==='dash'&&e.v.oid===0x0706), hint:'MESSAGE_CREATOR_PARAMETER_76 declares it ACCESS_READWRITE, but the SET handler is commented out: the reply echoes dolby_swap. Dolby Decoding, Decoder Input, Secondary Audio and Group 3 are ACCESS_READONLY — only the DIP switches move them.'},
  {h:'Save the settings', d:'Card Settings → Settings → Save. Then read step 9 of the Findings: the saved values come back only if SW7 is ON at boot.', goal:()=> D.ev.some(e=>e.k==='dash'&&e.v.oid===0x0301), hint:'SAVE_INFORMATION_EEPROM writes bytes 10–15; RESTORE_INFORMATION_EEPROM runs only when dip_switch_enabled == NO.'},
  {h:'Remove the decoder module', d:'Click the P5 module on the card (or press M), or pick the scenario “Decoder module missing”.', goal:()=> !world(absT()).cat, hint:'PINC2 low → Dolby_card_status = ERROR → RESET_DOLBY counts 5000 passes (≈ 2.6 s) → CAT552_RESET(1000) + SD_RESET. DashBoard: Dolby Decoder Status “Error”, AES1–4 red.'},
  {h:'Watch a power-up', d:'Pick the scenario “Power-up”. Find the ALTERA_RESET pulse, the FPGA reconfiguring, and the DIP decision on the main-loop lane.', goal:()=> D.scn==='boot', hint:'The three write/read rounds end ≈ 0.52 s, but the FPGA reloaded at 0.455 s takes ≈ '+SIM.fmtDur(CFG_T)+' ('+'inferred'+'): DIP_SWITCHES reads 0xFF, so SW7/SW8 are read as OFF.'},
];
function viewTutorial(m){
  window.__m6202Active=true;
  m.innerHTML = card('Operator tutorial (M6202AE manual, issue 1 – firmware 2.0.0.0)', `<p class="small">Work through the steps on the Simulator tab (keep this tab in another window, or switch back and forth). Goals are checked live against the model.</p><ol id="m62tut"></ol>`)
    + card('Quick reference — DIP switch (manual, “DIP Switch Settings”)', `<table class="kv"><tr><th>SW</th><th>Manual</th><th>v2.02 code (PROCESS_DIP_SWITCHES / main)</th></tr>
      <tr><td>1</td><td>Reserved</td><td>not read (BIT0 line commented out)</td></tr><tr><td>2</td><td>Program 7 and 8 / Downmix Selector: ON = Lt/Rt on AES4</td><td>BIT1 == 0 → dolby_stereo_output = 1</td></tr>
      <tr><td>3</td><td>Dolby Enable: ON = decoding</td><td>BIT2 != 0 → dolby_enabled = NO</td></tr><tr><td>4</td><td>Decoder AES selector: ON = AES2</td><td>BIT3 == 0 → dolby_selector += 1</td></tr>
      <tr><td>5 / 6</td><td>AES5/AES6 group & decoder group: MSB / LSB</td><td>BIT4 == 0 → +4 / +2 to dolby_selector, +2 / +1 to group3_sel</td></tr>
      <tr><td>7</td><td>Reserved</td><td>BIT6 at boot → dip_switch_enabled (ON → RESTORE_INFORMATION_EEPROM)</td></tr><tr><td>8</td><td>Reserved</td><td>BIT7 at boot → dashboard_enabled (ON → DashBoard SETs ignored)</td></tr></table>`);
  SIM.on('time', ()=>{ const ol=m.querySelector('#m62tut'); let first=true;
    ol.innerHTML = TUT.map((s,i)=>{ let ok=false; try{ ok=!!s.goal(); }catch(e){} const cur = !ok && first; if (cur) first=false;
      return `<li style="margin-bottom:8px"><b>${s.h}</b> ${ok?'<span class="chip" style="background:var(--accent);color:#fff">done</span>':cur?'<span class="chip">next</span>':''}<div class="small">${s.d}</div>${cur?`<div class="small muted">Hint: ${s.hint}</div>`:''}</li>`; }).join(''); });
}
/* ---------------- block diagram ---------------- */
const BLK = [
  ['in',20,40,110,44,'SDI IN (rear BNC 1)','75 Ω BNC on the T6204 / T6304 / T6306 (rear module drawing).'],
  ['eq',150,40,110,44,'GS1574A U1','Adaptive cable equaliser.'],
  ['des',280,30,140,64,'GS1559 U2 + GO1525 U5','Deserialiser/reclocker: D0–D19 + PCLK to the FPGA (U3 pins 41–63, 28); LOCK_60, SMPTE, ~RC_BYP, SD/~HD to the MCU; reclocked serial to U6.'],
  ['drv',280,120,140,40,'GS1528 U6 → SDI OUT','Cable driver for the reclocked output (rear BNC 2).'],
  ['dmx',450,30,150,64,'FPGA: SD403 / HD de-embed','pod31.bdf: SDdemux (sd403iss1) or HD path chosen by PORTC0 (ALTERA15); HD_group_sel turns a group number into the DID (0x2E7, 0x1E6, 0x1E5, 0x2E4); group_detectorHD flags present groups.'],
  ['sel',450,120,150,54,'8×2 group select','M6202AE-FUNCTIONAL.cdr: the eight de-embedded pairs → AES5/AES6 and the decoder input, set by DIP 5,6; DIP 4 picks AES1 or AES2 (2×1). In v102 this is CAT552_switch.vhd.'],
  ['nad',450,200,150,44,'non_audio_detector ×2','SMPTE 337: four zero words then F872/4E1F; PA = Pc bits 6..0; flag held 32767 frames.'],
  ['dec',640,120,150,64,'P5 decoder module','CAT No. 552 on P5: EAD/EABC/EAFS in, DADA–DADD + DADM out; RESET_552, MAP0/1, DLM0–2, PRG0–2, PLE/PLS/PGP, PME from the FPGA pins that dolby_upper/dolby_lower drive.'],
  ['osel',820,60,150,64,'Output select (2×1 ×4)','AES1–4 = de-embedded G1/G2 pairs or decoder D1–D4; AES4 = D4 or D5 (downmix) by DIP 2. v102: OUTPUT_SELECT.vhd with OS1/OS0.'],
  ['aes',820,160,150,44,'i2sx4_aes · AES_enable','AES3 generators (zero24_31 blanks bits 24–31).'],
  ['drvA',1000,100,150,54,'DS34LV87T U12/U13 + T1–T6','RS-422 drivers and PE-65812 transformers → P1 → rear module AES 1–6. META on U13 pins 9/15.'],
  ['mcu',450,300,170,56,'AT90CAN128 U11','8 MHz; v100w.c main loop; shift-register bus (PA0 strobe W, PA1 strobe R, PA2 clock, PA7 data out, PINC3/5/4 data in).'],
  ['dip',280,300,140,44,'SW1 (8-way DIP)','To FPGA pins 181–188 (dip1–dip8); read back to the MCU as ALTERA17.'],
  ['can',660,300,150,44,'SN65HDV233 U9 → frame','CAN 1 Mbit/s to the openGear frame controller and DashBoard.'],
  ['led',840,300,130,44,'13 card-edge LEDs','PORTB/E/G (LEDREF in this file).'],
  ['cfg',20,300,130,44,'EPCS (U7) · Q1','Configuration; ALTERA_RESET (PG2) → R69 → Q1 → N_CONFIG reloads it.'],
  ['clk',20,200,150,44,'PLL1705 U4 · X2/X3 · ICS662','Audio clocks for the AES generators; video-locked synthesiser.'],
];
function blockSVG(t){ const s=sched(), ds=decState(t,s.resets), d=dipDecodeAE(world(t)), lk=gsLocked(t);
  const live={in:world(t).cable, eq:world(t).cable, des:lk, drv:lk, dmx:lk&&fpgaUp(t), sel:fpgaUp(t), nad:fpgaUp(t)&&!!compressedFlag(decInput(t).g,decInput(t).pr,t)&&compressedFlag(decInput(t).g,decInput(t).pr,t)!=='P', dec:['E','D','PCM'].includes(ds.st), osel:fpgaUp(t), aes:fpgaUp(t)&&lk, drvA:[0,1,2,3,4,5].some(k=>outRoute(k,t)), mcu:true, dip:true, can:true, led:true, cfg:!fpgaUp(t), clk:true};
  let x=`<svg viewBox="0 0 1170 370" style="width:100%;display:block"><defs><marker id="m62ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="var(--ink2)"/></marker></defs>`;
  const ar=(a,b,c2,d2,lab)=>`<path d="M${a} ${b} L${c2} ${d2}" stroke="var(--ink2)" stroke-width="1.6" marker-end="url(#m62ar)" fill="none"/>${lab?`<text x="${(a+c2)/2}" y="${(b+d2)/2-4}" font-size="10" fill="var(--ink2)" text-anchor="middle">${lab}</text>`:''}`;
  x+=ar(130,62,150,62)+ar(260,62,280,62)+ar(350,94,350,120)+ar(420,62,450,62,'20-bit')+ar(525,94,525,120,'8 pairs')+ar(600,147,640,152,'DIP 4,5,6')+ar(525,174,525,200)+ar(790,152,820,100,'D1–D5')+ar(600,130,820,80,'G1/G2')+ar(895,124,895,160)+ar(970,182,1000,130)+ar(600,230,640,170)+ar(535,300,535,244,'shift bus')+ar(420,322,450,322)+ar(620,328,660,322)+ar(620,340,840,322)+ar(150,305,450,90,'config')+ar(170,222,450,190);
  BLK.forEach(([id,bx,by,bw,bh,lab])=>{ const on=live[id];
    x+=`<g class="m62blk" data-b="${id}" style="cursor:pointer"><rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="6" fill="${D.ui.blk===id?'color-mix(in srgb,var(--accent2) 25%,var(--panel))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?2.4:1.2}"/><text x="${bx+bw/2}" y="${by+bh/2+4}" text-anchor="middle" font-size="11.5" fill="var(--ink)">${lab}</text></g>`; });
  x+=`<text x="1165" y="365" font-size="10" text-anchor="end" fill="var(--ink2)">green outline = active now · DIP: decoder ${d.dolbyEn?'ON':'OFF'}, input G${d.grp+1} AES${d.selAES+1}, AES4 ${d.downmixAES4?'downmix':'ch 7/8'}</text></svg>`; return x; }
function viewBlock(m){
  window.__m6202Active=false;
  m.innerHTML = card('Block diagram (click a block)', `<div id="m62blk"></div><div class="small" id="m62blkTxt" style="margin-top:6px"></div><div class="small muted">Drawn from M6202AE-FUNCTIONAL.cdr (8×2, 2×1, DOLBY CARD, D1–D5, DIPSW 2/4/5,6), pod31.bdf and the M6202A-iss3 netlist. The v201 FPGA (M6202AE) exists only as M6202.pof, so its internal blocks follow the v102 source and the drawing — ${inf}.</div>`);
  SIM.on('time', ()=>{ const t=absT(); m.querySelector('#m62blk').innerHTML=blockSVG(t); const b=BLK.find(z=>z[0]===D.ui.blk); m.querySelector('#m62blkTxt').innerHTML= b? `<b>${b[5]}</b>: ${b[6]}` : '<span class="muted">Click a block.</span>';
    m.querySelectorAll('.m62blk').forEach(g=>g.onclick=()=>{ D.ui.blk=g.dataset.b; SIM.refresh(); }); });
}
/* ---------------- schematic sheets (redrawn) ---------------- */
function chipBox(name, sub, left, right, opts){ opts=opts||{}; const n=Math.max(left.length,right.length), H=40+n*16, Wd=opts.w||560, bx=Wd/2-80;
  let s=`<svg viewBox="0 0 ${Wd} ${H+20}" style="width:100%;max-width:${Wd+80}px;display:block"><rect x="${bx}" y="20" width="160" height="${H-10}" rx="4" fill="var(--panel2)" stroke="var(--ink)"/>
    <text x="${Wd/2}" y="14" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${name}</text><text x="${Wd/2}" y="${H+16}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`;
  left.forEach(([pin,net,live],i)=>{ const y=40+i*16; s+=`<line x1="${bx-30}" y1="${y}" x2="${bx}" y2="${y}" stroke="${live?'var(--accent)':'var(--ink2)'}" stroke-width="${live?2:1}"/><text x="${bx+4}" y="${y+4}" font-size="9.5" fill="var(--ink)">${pin}</text><text x="${bx-34}" y="${y+4}" font-size="10" text-anchor="end" fill="var(--ink)">${net}</text>`; });
  right.forEach(([pin,net,live],i)=>{ const y=40+i*16; s+=`<line x1="${bx+160}" y1="${y}" x2="${bx+190}" y2="${y}" stroke="${live?'var(--accent)':'var(--ink2)'}" stroke-width="${live?2:1}"/><text x="${bx+156}" y="${y+4}" font-size="9.5" text-anchor="end" fill="var(--ink)">${pin}</text><text x="${bx+194}" y="${y+4}" font-size="10" fill="var(--ink)">${net}</text>`; });
  return s+'</svg>'; }
function viewSchem(m){
  window.__m6202Active=false;
  m.innerHTML = `<div class="card"><h2>Schematic set — redrawn from M6202A-iss3.net / .bom and pod31.qsf (not the original P-CAD sheets)</h2><div class="small muted">Pin numbers and net names are copied from the netlist; port functions from M6202.h / M62xx.h / altera.h. Live nets are drawn green.</div></div><div class="grid2"><div id="m62s1"></div><div id="m62s2"></div></div><div class="grid2"><div id="m62s3"></div><div id="m62s4"></div></div>`;
  SIM.on('time', ()=>{ const t=absT(), lk=gsLocked(t), s=sched(); const xf=s.xf[bs(s.xf,t)], bus = xf && t<xf.t1;
    m.querySelector('#m62s1').innerHTML = card('Sheet 1 · AT90CAN128 U11', chipBox('U11 AT90CAN128-16AU (TQFP64)','X1 8 MHz · JTAG1 · CAN via U9',
      [['51 PA0','ALTERA7 = STROBE_WRITE',bus&&xf.w],['50 PA1','ALTERA6 = STROBE_READ',bus&&!xf.w],['49 PA2','ALTERA5 = CLOCK',bus],['46 PA5','ALTERA2 = SD_RESET',s.sdrst.some(r=>t>=r.t0&&t<r.t1)],['44 PA7','ALTERA0 = DATA OUT',bus&&xf.w],['38 PC3','ALTERA12 = DATA_READ',bus&&!xf.w],['40 PC5','ALTERA10 = DATA_READ1',bus&&!xf.w],['39 PC4','ALTERA11 = DATA_READ2',bus&&!xf.w],['37 PC2','ALTERA13 = decoder ERR (PINC2)',decState(t,s.resets).st!=='absent'],['35 PC0','ALTERA15 = SD/HD demux select',lk&&fmtAt(t).sd],['43 PG2','ALTERA_RESET → R69 → Q1 → N_CONFIG',false],['5 PE3','N_CONFIG',false]],
      [['4 PE2','LED14 SD',ledAt('sd',t)],['7 PE5','LED13 HD',ledAt('hd',t)],['8 PE6','LED12 ERR',ledAt('err',t)],['10–13 PB0–3','LED11/4/3/9 AES1–4',ledAt('a1',t)],['14–16 PB4–6','LED8/7/5 DOLBY1–3',ledAt('d1',t)],['34 PG1','LED2 DOLBY4',ledAt('d4',t)],['33 PG0','LED10 COM ACTIVITY',false],['17 PB7','LED6 ERROR',false],['27 PD2','LOCK_60 (GS1559)',lk],['18 PG3','SMPTE (GS1559)',lk],['9 PE7','~RC_BYP (GS1559)',lk],['6 PE4','SD/~HD (GS1559, GS1528)',lk&&fmtAt(t).sd],['26/28/29/25','CS_60, SDCLK_60, SDIN_60, SDOUT_60 (unused)',false],['30/31 PD5/6','CAND / CANR → U9',s.can.some(f=>t>=f.t0&&t<f.t1)],['61 PF0','AN_SLOTID (slot ID ladder)',false]]));
    m.querySelector('#m62s2').innerHTML = card('Sheet 2 · EP1C12Q240C6 U3 (pod31.qsf)', chipBox('U3 EP1C12Q240C6','config from U7 (DCLK 36, NCS 24, CNF_DATA 25, ASDI 37) · CONF_DONE 145',
      [['41–63','D0–D19 from GS1559',lk],['28','PCLK',lk],['123–141','ALTER0…ALTER15 bus to U11',bus],['181–188','dip1–dip8 ← SW1',true],['26','N_CONFIG',!fpgaUp(t)],['233/235','pll1700_aclk / 27out',true]],
      [['194','RESET_552 → P5-3',s.resets.some(r=>t>=r.t0&&t<r.t1)],['195/196','MAP0 / MAP1 → P5-7/8',true],['206–208','DLM0–2 → P5-31..33',true],['197/200/202','PRG0–2 → P5-11..13',true],['213–215','PLE PLS PGP',true],['193','PME → P5-10',true],['218/222/219','EAD EABC EAFS → decoder in',['E','D','PCM'].includes(decState(t,s.resets).st)],['216/217/224/225','DADA DADB DADC DADD ← decoder',['E','D'].includes(decState(t,s.resets).st)],['223','DADM (downmix)',['E','D'].includes(decState(t,s.resets).st)],['11','ERR ← P5-70',false],['16–21','AES1–AES6 → U12/U13',[0,1,2,3,4,5].some(k=>outRoute(k,t))],['2 / 1','META → U13 · META_IN ← P5-60',false]]));
    m.querySelector('#m62s3').innerHTML = card('Sheet 3 · SDI path', chipBox('U2 GS1559 (BGA100)','U1 GS1574A EQ → U2 → U6 GS1528 · U5 GO1525 VCO (A1, A2, A5)',
      [['(U1)','SDI IN via GS1574A',world(t).cable],['A1/A2/A5','GO1525 U5 VCO loop',lk],['E4','SD/~HD → U11-6, U6-6',lk],['F4','20BIT ← U11-19 (PG4)',true]],
      [['K9…A10','D0–D19 → U3',lk],['A7','PCLK → U3-28',lk],['D6','LOCK_60 → U11-27',lk],['G5','SMPTE → U11-18',lk],['C7','~RC_BYP → U11-9',lk],['K3/K4','serial out → U6 GS1528 → SDI OUT',lk],['H4/H5/H6/J6','host interface → U11 (not used)',false]]));
    m.querySelector('#m62s4').innerHTML = card('Sheet 4 · decoder connector P5 and AES outputs', chipBox('P5 CAT_NO_552_RA','+5V on 2,5,6,14–16,19–23,26,30,47,71 · module '+(world(t).cat?'fitted':'not fitted'),
      [['3','RESET_552',s.resets.some(r=>t>=r.t0&&t<r.t1)],['7/8','MAP0 / MAP1',true],['10','PME',true],['11–13','PRG0–2',true],['17/18','PDN / ACS',false],['31–33','DLM0–2',true],['34–36','PLE PLS PGP',true],['49/50/51','EAD EAFS EABC',true]],
      [['45/46','DADA / DADB',true],['53/54','DADC / DADD',true],['52','DADM',true],['55/56','DAFS / DABC',true],['57–59','PB2/PB0/PB1',false],['60','META_IN',false],['69','SYNC',false],['70','ERR → R134 → U3-11',false]])
      + `<table class="kv small" style="margin-top:6px"><tr><th>AES</th><th>FPGA pin</th><th>Driver</th><th>Transformer</th></tr>${[['AES_OUT1','U12-1','T1'],['AES_OUT2','U12-7','T2'],['AES_OUT3','U12-9','T3'],['AES_OUT4','U12-15','T4'],['AES_OUT5','U13-7','T5'],['AES_OUT6','U13-1','T6']].map(([a,b,c2],i)=>`<tr><td>${a}${outRoute(i,t)?' ●':''}</td><td>${16+i}</td><td>${b}</td><td>${c2} PE-65812 → P1</td></tr>`).join('')}</table>`);
  });
}
/* ---------------- software ---------------- */
const LOOP_AE = [[0,'WDR()'],[1,'READ_GS1560_STATUS()'],[2,'PROCESS_SDI_LOCK_STATUS()'],[3,'PROCESS_HD_SD_CONTROL()'],[4,'TRANSLATE_INPUT / DEBOUNCE_INPUT'],[5,'PROCESS_DIP_SWITCHES()'],[6,'ALTERA_write()'],[7,'ALTERA_read()'],[8,'ALTERA_SORT()'],[9,'settings changed? → CAT552_RESET(55000)'],[10,'ALTERA_ALIGNMENT_CHECK()'],[11,'REFRESH_LEDS()'],[12,'WDR · CAN_FUNCTIONS()'],[13,'save_settings? → SAVE_INFORMATION_EEPROM()']];
const LOOP_A = [[0,'DOLBY_DECODER_STATUS · WDR'],[1,'READ_GS1560_STATUS'],[2,'PROCESS_SDI_LOCK_STATUS'],[3,'HD_SD_CONTROL · INPUT · AUDIO_INFORMATION'],[6,'ALTERA_write'],[7,'ALTERA_read'],[5,'PROCESS_DIP_SWITCHES'],[8,'AUDIO_FORMAT · Audio1–4_Detect · error checks · RESET_VECTOR(1)'],[11,'NO_LOCK_CHIRP · METADATA_CHIRP · REFRESH_LEDS'],[12,'WDR · CAN_FUNCTIONS'],[13,'SAVE_INFORMATION_EEPROM?']];
function bitsTable(v, names, title){ return `<table class="kv small"><tr><th>${title}</th>${names.map((n,i)=>`<th style="text-align:center">${7-i}</th>`).join('')}</tr><tr><td class="mono">0x${hx(v)}</td>${names.map((n,i)=>{ const b=(v>>(7-i))&1; return `<td style="text-align:center;background:${b?'color-mix(in srgb,var(--accent) 22%,transparent)':'transparent'}"><div class="mono">${b}</div><div style="font-size:10px">${n}</div></td>`; }).join('')}</tr></table>`; }
function viewSoft(m){
  window.__m6202Active=false;
  m.innerHTML = `<div class="grid2"><div>${card('Main loop (while(1) in v100w.c) — running step highlighted', '<div id="m62loop"></div>')}${card('main() boot sequence', '<div id="m62boot"></div>')}</div>
    <div>${card('Shift-register bus: what ALTERA_write sends', '<div id="m62wr"></div>')}${card('What ALTERA_read brings back (ALTERA1–18, v2 map)', '<div id="m62rd"></div>')}</div></div>
    <div class="grid2"><div>${card('State machines', '<div id="m62sm"></div>')}</div><div>${card('FPGA audio path', '<div id="m62fp"></div>')}${card('Builds compared', '<div id="m62cmp"></div>')}</div></div>`;
  SIM.on('time', ()=>{ const t=absT(), op=opAt(t), sn=snapAt(t)||sched().M, s=sched(), AE=D.build==='AE';
    const L = AE? LOOP_AE : LOOP_A;
    m.querySelector('#m62loop').innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:6px">${L.map(([k,l],i)=>`<div class="chip" style="padding:4px 9px;${op&&op.step===k?'background:var(--accent);color:#fff;border-color:var(--accent)':''}">${i+1}. ${l}</div>${i<L.length-1?'<span class="muted">→</span>':''}`).join('')}<span class="muted">↺</span></div>
      <div class="small" style="margin-top:6px">One pass ≈ ${SIM.fmtDur(passT())} at 8 MHz (${infT('the ICCAVR listings: write_data ≈ 12 cycles per bit, read_data ≈ 13, 18 bytes read and 6 written per pass')}) → ≈ ${Math.round(1/passT())} passes per second. Interrupts: timer0 every 1.000 ms (SD_RESET, sd_audio_stable), timer1 every 96 µs (CAN reports), CAN rx (DashBoard).</div>
      <div class="small mono" style="margin-top:4px">${op? esc((op.step==='B'?'boot: ':'step '+op.step+': ')+op.label) : ''}</div>`;
    m.querySelector('#m62boot').innerHTML = s.bootOps.length? `<table class="kv small">${s.bootOps.map(o=>`<tr style="${t>=o.t0&&t<o.t1?'background:color-mix(in srgb,var(--accent) 22%,transparent)':''}"><td class="mono">${o.t0.toFixed(4)} s</td><td>${esc(o.label)}</td><td class="mono">${SIM.fmtDur(o.t1-o.t0)}</td></tr>`).join('')}</table>` : '<div class="small muted">Pick the “Power-up” scenario to run main() from reset: wait(3000)×5, wait(63000)×4, ADC, wait(63000)×4, ADC, ALTERA_RESET(1000), wait(3000)×5, three ALTERA_write/ALTERA_read rounds, the DIP decision, DATA_SETUP, CANinit.</div>';
    m.querySelector('#m62wr').innerHTML = AE? bitsTable(sn.dolby_upper,['RESET_552','PME','OS0','CAT1','CAT0','MAP1','MAP0','PRG2'],'dolby_upper') + bitsTable(sn.dolby_lower,['PRG1','PRG0','DLM2','DLM1','DLM0','PLE','PLS','PGP'],'dolby_lower')
      + `<div class="small">Bytes 3–6: reset_data_upper, reset_data_lower and group_data are <b>uninitialised locals</b> in v2.02's ALTERA_write (shown “??” on the bus lane); AUDIO_INFORMATION is always 0. Then STROBE_WRITE_LOW/HIGH/LOW on PA0 latches the 48 bits into shift_in ×3 (pod31.bdf inst43/46/51). MAP1:MAP0 = 11 Lt/Rt, 10 Lo/Ro; DLM = 000 when dialnorm ENABLED; PRG = 111; RESET_552 low only inside CAT552_RESET().</div>`
      : `<div class="small">v1.04: dolby_upper = (RESET_552, OS1, OS0, CAT1, CAT0, MAP1, MAP0, PRG2) with OS1:OS0 = pod31_mode (always 0 → OUTPUT_SELECT “2 Group Demux”) and CAT = cat_input1 − 0x31; bytes 3–4 = RESET_VECTOR1:RESET_VECTOR (5 bits each, sample-count errors), byte 5 AUDIO_INFORMATION, byte 6 group_data = audio1 | audio2&lt;&lt;3 | dolby_off_110&lt;&lt;6 → HD_group_sel.</div>`+bitsTable(sn.dolby_upper,['RESET_552','OS1','OS0','CAT1','CAT0','MAP1','MAP0','PRG2'],'dolby_upper');
    const A=sn.ALT||[], mi=v=>mirror(v||0);
    const rd=[['1','fr50 fr60 lock1080 lock720 · groups G1–G4 (b4–7)',mi(A[1])],['2','~chact (SD channel-active errors)',A[2]],['3','lock625 lock525 cat552_map_error lock60_5994 fr24 fr30 fr25',mi(A[3])],['4–5','Emb_Astatus (SD, 2 bits per AES)',(mi(A[5])<<8)|mi(A[4])],['6','alignment 0xA8',A[6]],['13–16','per AES pair: format (3 bits) + compressed (bit 3 / 7)',[13,14,15,16].map(i=>hx(mi(A[i]))).join(' ')],['17','DIP_SWITCHES (not mirrored)',A[17]],['18','alignment 0xA8',A[18]]];
    m.querySelector('#m62rd').innerHTML = `<table class="kv small"><tr><th>ALTERA</th><th>meaning (ALTERA_SORT, v2.02)</th><th>value</th></tr>${rd.map(([a,b,v])=>`<tr><td>${a}</td><td>${b}</td><td class="mono">${typeof v==='number'?'0x'+hx(v,v>255?4:2):v}</td></tr>`).join('')}</table>
      <div class="small muted">The 22 Feb 2008 “operational ctl info” defines a different v1 map (ALTERA1–4 = sample counts + lock, ALTERA13 = DIP, ALTERA14–17 = per-AES Dolby indicator with “compressed flag 0 = yes”). ALTERA_SORT MIRRORs bytes 1–5 and 13–16; it skips everything unless ALTERA6 and ALTERA18 both read 0xA8.</div>`;
    const ds=decState(t,s.resets); const sr=s.sdrst.some(r=>t>=r.t0&&t<r.t1);
    m.querySelector('#m62sm').innerHTML = `<h3>SD_RESET (timer0_ovf_isr, every 1 ms)</h3><div style="display:flex;gap:6px;flex-wrap:wrap" class="small">${[['idle','reset_enable = NO',!sn.reset_enable&&!sr],['armed','reset_enable = YES (sdi_change, chact error, Dolby error)',sn.reset_enable&&!sr],['PA5 low','SD_RESET_ACTIVE, reset_counter 2 → 0, sd_audio_stable_counter = 165',sr],['CAT552_RESET(1000)','inside the ISR: RESET_552 low 0.875 ms',s.resets.some(r=>t>=r.t0&&t<r.t1&&/SD_RESET/.test(r.why))]].map(([a,b,on])=>`<div class="chip" style="${on?'background:var(--warn);color:#fff':''}"><b>${a}</b> · ${b}</div>`).join('→')}</div>
      <h3>Decoder health (DOLBY_DECODER_STATUS → RESET_DOLBY)</h3><div class="small">Runs only while dolby_enabled && sd_audio_stable. Dolby_card_status = PINC2 ? OK : ERROR → <b>${sn.Dolby_card_status?'OK':'ERROR'}</b>; dolby_counter <b>${sn.dolby_counter}</b> / ${DOLBY_ERROR_COUNTER} passes (≈ ${SIM.fmtDur(DOLBY_ERROR_COUNTER*passT())}) → CAT552_RESET(1000) + reset_enable. DOLBY_CAT552_AUDIO_ERROR_CHECK counts ALTERA3 bit 2 (cat552_map_error) for ${DOLBY_CAT_AUDIO_ERROR_COUNTER} passes after every reset.</div>
      <h3>Decoder module (P5)</h3><div class="small">state <b>${ds.st}</b> · RESET_552 pulses so far on this page: ${s.resets.filter(r=>r.t0>=page0()&&r.t0<page0()+1).map(r=>SIM.fmtDur(r.t1-r.t0)).join(', ')||'none'} · acquisition after a reset: 2 Dolby E frames / 3 AC-3 frames (${inf}).</div>
      <h3>non_audio_detector (FPGA, per AES pair)</h3><div class="small">shift_in_1/2 (64 bits) → x1…x10 word pipeline on LRCLK → if four zero words then Pa/Pb = F872/4E1F (or the 20/24-bit forms 6F8720/54E1F0, 96F872/A54E1F): PA(6..0) = Pc bits, detect = 1, count = 32767 → PA(7) = compressed while count ≠ 0. Decoder input now: <b>${(()=>{ const i=decInput(t), cf=compressedFlag(i.g,i.pr,t); return cf? (cf==='P'?'PCM':cf==='E'?'Dolby E (Pc type 28)':'AC-3 (Pc type 1)') : 'no group'; })()}</b>.</div>
      <h3>CAN reporting (timer1_ovf_isr, 96 µs ticks)</h3><div class="small">frame_count ≠ 0 → multi-frame every TX_FRAMES (10 ticks) · dashboard_initializing → every 1000 × slot ticks · parameter_change_refresh → PARAMETER_UPDATE every TX_SIGNALCHANGE (1000 ticks ≈ 96 ms) · otherwise heartbeat every TX_HEARTBEAT (10000 ticks ≈ 0.96 s). PARAMETER_UPDATE reports each change three times (x counter) before moving on.</div>`;
    const d=dipDecodeAE(world(t));
    m.querySelector('#m62fp').innerHTML = `<table class="kv small"><tr><th>v102 OUTPUT_SELECT (OS1:OS0)</th><th>OUT1_1/1_2 (AES1/2)</th><th>OUT2_1 (AES3)</th><th>OUT2_2 (AES4)</th></tr>
      <tr><td>00 2 Group Demux</td><td>group A pairs</td><td>group B AES1</td><td>group B AES2</td></tr><tr><td>01 6 ch + 1 PCM</td><td>DADA / DADB</td><td>DADC</td><td>the other pair of the CAT group</td></tr><tr><td>10 8 ch</td><td>DADA / DADB</td><td>DADC</td><td>DADD</td></tr><tr><td>11 6 ch + downmix</td><td>DADA / DADB</td><td>DADC</td><td>DADM</td></tr></table>
      <div class="small" style="margin-top:6px">M6202AE (v201, ${inf}: DIP-driven): decoder ${d.dolbyEn?'<b>ON</b>':'off'} → AES1–3 = ${d.dolbyEn?'DADA–DADC':'G1 AES1, G1 AES2, G2 AES1'}, AES4 = ${d.dolbyEn?(d.downmixAES4?'DADM (downmix)':'DADD (ch 7/8)'):'G2 AES2'}, AES5/6 = G${d.grp+1} AES1/AES2; decoder input (CAT552_switch) = G${d.grp+1} AES${d.selAES+1}. zero24_31 forces bits 24–31 of each I2S word to 0; i2sx4_aes builds the AES3 subframes; AES_enable gates each output.</div>`;
    m.querySelector('#m62cmp').innerHTML = `<table class="kv small"><tr><th></th><th>M6202A v1.04 (not released)</th><th>M6202AE v2.02</th></tr>
      <tr><td>Decoder control</td><td>dolby.c (PINC2 = DOLBY_INSTALLED)</td><td>CAT552.c (RESET_552, error counters)</td></tr>
      <tr><td>Outputs</td><td>4 (2 groups); OS forced to 0</td><td>6 (+ AES5/6 group 3 selector)</td></tr>
      <tr><td>DIP use</td><td>groups, only if SW7 OFF + SW8 ON</td><td>decoder / routing, every pass</td></tr>
      <tr><td>DashBoard control</td><td>Mode (ignored), Group 1/2, Auto Swap</td><td>Downmix, Dialnorm, PCM Metadata</td></tr>
      <tr><td>Boot waits for FPGA</td><td>yes: while (ALTERA6 != 0xA8)</td><td>no (“I WILL NEED IT BACK IN”)</td></tr>
      <tr><td>Error machinery</td><td>sample-count compares, RESET_VECTOR(1)</td><td>SD_RESET in timer0, Dolby counters</td></tr>
      <tr><td>FPGA</td><td>v102 source (pod31)</td><td>v201 .pof only</td></tr></table>`;
  });
}
/* ---------------- findings ---------------- */
const FINDINGS = [
  ['SD LED lights for HD','REFRESH_LEDS() and PROCESS_SDI_LOCK_STATUS() (v100w.c / M6202A.c) turn SD_LED_ON for any lock and add HD_LED_ON for HD, so an HD signal shows SD + HD. The manual table says SD = “valid SD-SDI signal”.'],
  ['DashBoard “Settings” are read-only; one read-write parameter does nothing','Dashboard.c: Dolby Decoding (0x0701), Decoder Input (0x0702), Group 3 Output Selector (0x0705) and Secondary Audio (0x0707) are ACCESS_READONLY; their SET branches are commented out. Dolby Decoder AES Selector (0x0706, MESSAGE_CREATOR_PARAMETER_76) is ACCESS_READWRITE but its SET is commented out too, and it is in no menu. For 0x0702 the GET leaves buffer[5] stale when dolby_enabled == NO.'],
  ['DIP switches override everything, every pass','M6202A.c PROCESS_DIP_SWITCHES(): the “if ((dip_switch_enabled == YES) && (dashboard_enabled == NO))” guard is commented out and v100w.c calls it on every pass, wrapped in CLI()/SEI(). At boot group3_sel is set to GROUP3 (2) plus the switch value (2–5) and the first pass rewrites it to 0–3.'],
  ['SW7/SW8 “Reserved” in the manual but read at boot','v100w.c main(): BIT6 → dip_switch_enabled, BIT7 → dashboard_enabled. With SW7 OFF (factory) the boot code loads defaults (Lt/Rt, dialnorm DISABLED, PCM metadata ENABLED) and never calls RESTORE_INFORMATION_EEPROM, so “Settings → Save” only survives a power cycle with SW7 ON. SW8 ON makes DashBoard SETs echo without storing.'],
  ['The DIP decision is taken while the FPGA is reloading','v2.02 main() pulses ALTERA_RESET(1000) (PG2 → R69 → Q1 → N_CONFIG, per M6202A-iss3.net) then reads DIP_SWITCHES 3 rounds later (≈ 67 ms). The “while(ALTERA6 != 0xA8)” wait from v1.04 is commented out (“I WILL NEED IT BACK IN”). With an EP1C12 configuration time of ≈ '+(CFG_T*1000).toFixed(0)+' ms ('+'inferred'+') the read is 0xFF, i.e. SW7/SW8 read as OFF whatever they are set to.'],
  ['ALTERA_write sends uninitialised bytes','M6202A.c ALTERA_write() (v2.02) declares group_data, reset_data_upper, reset_data_lower as locals and writes them without assignment; AUDIO_INFORMATION is never changed from 0. dolby_selector and group3_sel are never sent — the v201 FPGA must take routing from its own DIP pins.'],
  ['CAT552_RESET from inside an interrupt','CAN.c timer0_ovf_isr() → SD_RESET() → CAT552_RESET(1000): wait(1000) (0.875 ms) and two ALTERA_write() calls inside the ISR. If the 1 ms tick lands while the main loop is in write_data/read_data, both drive PA2 (clock) and PA7 (data): the shift registers get a mixed frame.'],
  ['Every Dolby setting change blocks the card for 48 ms','v100w.c: if (pdialnorm_settings != dialnorm_settings …) CAT552_RESET(55000) = '+SIM.fmtDur(W(55000))+' with WDR() in wait(); LEDs, the FPGA bus and the error counters stop. The p-values start at 0xFF, so it also happens on the first pass after every boot.'],
  ['“Dolby Decoder Error” alarm can never show','Dashboard.c Card Status: the Dolby branch needs pod31_mode > 0, which v2.02 never sets. The alarm table (Parameter21_Message) still carries a “Voiceover Unlocked” entry from another product.'],
  ['Missing decoder → endless resets','CAT552.c RESET_DOLBY(): with no module PINC2 reads ERROR; every DOLBY_ERROR_COUNTER (5000 passes ≈ '+SIM.fmtDur(5001*passT())+') it calls CAT552_RESET(1000) and sets reset_enable, which also pulses SD_RESET. DIP SW3 OFF is the only way to stop it (scenario “Decoder module missing”).'],
  ['AES4 label ignores Lo/Ro','Dashboard.c MESSAGE_CREATOR_PARAMETER_88_RESPONSE: “Dolby Decoder Main Program Downmix (LtRt)” whatever Downmix is set to; the Secondary Audio string also says “LtRt Downmix”.'],
  ['AES5/AES6 status follows the decoder input','MESSAGE_CREATOR_PARAMETER_89/8A_RESPONSE pick the string from dolby_selector, not group3_sel. Under DIP control both come from SW5/SW6, so it only shows if they ever diverge.'],
  ['Leftover v1 parameters and mapping','Dashboard.c v2.02 still builds 0x0203–0x0206 (“Gr 1 Embd AES 1”…) with MESSAGE_CREATOR_PARAMETER_23_RESPONSE mapping 1 PCM / 2 AC3 / 3 E, while M6202.h now has PCM 1, COMPRESSED 2, DOLBY_AC3 3, DOLBY_E 4 — AC-3 would read “Dolby E” and Dolby E “Unlocked”. Menu2OID lists 14 OIDs (including v1 0x0302–0x0305) behind a count of 8; Menu1OID lists 21 behind a count of 15.'],
  ['Comments that do not match the code','CAN.c timer0: “reload counter value for 100us” — it is 1.000 ms; READ_GS1560_STATUS reads a GS1559; M6202.h defines SD_HD_mask and CD_MUTE as the same pin (PE4); the 2008 control document says “Compressed Flag (0=yes)” but v1.04 tests bit != 0.'],
  ['Slot-ID “average” is one sample three times','v100w.c main() adds ad_result whenever ad_flag == WAIT; ADC.c keeps WAIT for 1000 calls, so COUNTER_CONSTANT (3) samples are the same conversion.'],
  ['COM ACTIVITY and ERROR LEDs never light','v2.02 CAN.c only calls COM_ACTIVITY_LED_OFF (the ON is commented, history 1.0.0.1 “COM LED only after DashBoard comms”), and COM_ERROR_LED_ON is never called (“Modified so the COM ERROR LED never turns on”). The manual marks both “Reserved”, and calls the four DOLBY LEDs “reserved” although REFRESH_LEDS drives them.'],
  ['Wired but unused hardware','GS1559 host interface (CS_60, SDCLK_60, SDIN_60, SDOUT_60 on PD1/PD3/PD4/PD0) and the ADM3485 U8 on the AVR UART (to P1 “AES7” pins) are never used by the firmware.'],
  ['v1.04 never decodes','atmel/v104 Dashboard.c: the Mode SET (0x0302) sets pod31_mode = 0 before the commented-out choice code, and PROCESS_DIP_SWITCHES forces pod31_mode = 0 — the M6202A 1.04 build is a two-group de-embedder whatever is fitted on P5.'],
  ['non_audio_detector holds the flag 0.68 s','altera/v102 non_audio_detector.vhd: count1/count2 = 32767 LRCLK frames after the last Pa/Pb, so a Dolby → PCM switch keeps “compressed” for '+SIM.fmtDur(NA_HOLD)+'. pa1(7) follows count1 while pa2(7) is set and cleared inside the counter branch — the two channels are written differently.'],
  ['Archive: FPGA source for the released AE build is missing','altera/Obsolete/v200.zip and v201.zip contain only M6202.pof; altera/v201/ is empty. dolby.c and M6202A-1.c sit in atmel/v202 but are not in V100W.mak FILES; M62xx.h is not included by any v2.02 file.'],
];
function viewFindings(m){
  window.__m6202Active=false;
  m.innerHTML = card('Findings — what the M6202 firmware and FPGA are up to', `<ol>${FINDINGS.map(([h,d])=>`<li style="margin-bottom:8px"><b>${h}.</b> <span class="small">${d.replace('inferred',inf)}</span></li>`).join('')}</ol>`)
    + card('Release history (M6202A / M6202AE SOFTWARE HISTORY.xls)', `<table class="kv small"><tr><th>Release</th><th>Date</th><th>Atmel</th><th>Altera</th><th>Note</th></tr>${[['M6202A 1.0.0.0','2008|41-02-25','v100','v101','first release'],['M6202A 1.0.0.1','2008|41-10-08','v101','v102','COM LED only after DashBoard comms'],['M6202A 1.0.0.2','2009|42-01-28','v102','v102','alarm fixes; mode via DashBoard + DIP'],['M6202A 1.0.0.3','2009|42-02-13','v103','v102','AC-3 / Dolby E indications swapped fix'],['M6202A 1.0.0.4','not released','v104','v102','bootloader + DataSafe'],['M6202AE 2.0.0.0','2009|42-06-08','v200','v200','AE variant'],['M6202AE 2.0.0.1','2009|42-08-25','v201','v201','bootloader'],['M6202AE 2.0.0.2','2010|43-03-04','v202','v201','DataSafe (test report M6202AE-V202-03MAR10.pdf)']].map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table>`)
    + card('Main assumptions (marked inferred on screen)', `<ul class="small"><li>v201 FPGA routing (DIP pins → 8×2 / 2×1 selectors) from the manual and M6202AE-FUNCTIONAL.cdr, since only the .pof survives.</li><li>Main-loop pass ≈ ${SIM.fmtDur(passT())} from listing cycle counts; GS1559 lock ${SIM.fmtDur(T_GSLOCK)}; EP1C12 configuration ${SIM.fmtDur(CFG_T)}.</li><li>Decoder acquisition 2 Dolby E / 3 AC-3 frames; ERR pin polarity; dialnorm gain law; downmix coefficients; burst lengths and guard band.</li><li>CAN report schedule simplified from timer1_ovf_isr / PARAMETER_UPDATE; DIP switch numbering vs FPGA pins.</li><li>Test tones (embedded ch n = 200·n Hz, decoded channels 300–1000 Hz) are a simulation choice.</li></ul>`);
}

/* =====================================================================
   REGISTER
   ===================================================================== */
SIM.register({
  id:'m6202', folder:'#OPENGEAR #SERIES/M6202 - #Master #OPENGEAR', family:'openGear', product:'M6202',
  name:'M6202 · openGear HD/SD-SDI AES de-embedder with Dolby E / AC-3 decoder (2008|41)', year:2008, depth:'Full model',
  summary:'The openGear twin of the POD31: an EP1C12 de-embeds SD/HD-SDI audio groups to six AES outputs and routes one pair through a plug-in decoder module (CAT No. 552) for Dolby E or AC-3. The model runs the AT90CAN128 firmware (M6202AE v2.02, with the unreleased M6202A v1.04 for comparison) against SDI lines, HANC packets, SMPTE 337 bursts and the CAT552 reset line, on the real ISS3 gerber artwork with a DashBoard-style panel.',
  highlights:['One second down to SDI lines, HANC packets, SMPTE 337 bursts and single bits on the FPGA bus','Real ISS3 card from the gerbers, T6204/T6304/T6306 rear modules, clickable DIP and P5 module','DashBoard panel driven by the real OIDs, SET handlers and their commented-out branches','CAT552_RESET from inside the 1 ms timer interrupt, 48 ms stalls, endless resets without a module','20 findings: SD LED on HD, settings lost at reboot, DIP read before the FPGA is back'],
  duration:1,
  stepUnits:[ {label:'1 main-loop pass (≈'+SIM.fmtDur(passT())+')', period:()=>passT()}, {label:'1 ms (timer0)', period:()=>T0}, {label:'96 µs (timer1)', period:()=>T1},
    {label:'1 audio sample (48 kHz)', period:()=>1/48000}, {label:'1 SDI line', period:()=>lineT(fmtAt(absT()))}, {label:'1 video frame', period:()=>1/fmtAt(absT()).fr} ],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms'],[0.001,'1 ms'],[0.0002,'200 µs'],[0.00004,'40 µs'],[0.00001,'10 µs']],
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
