/* =====================================================================
   DEMUX-3 — SD/HD-SDI audio de-embedder board (Ward-Beck Systems, 2005|38–2012|45)
   ATmega128 @ 4.9152 MHz + Altera Cyclone EP1C12Q240C6 (Quartus 5.1 project "demux3", top entity pod31)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in "#DEMUX #SERIES/XXX - DEMUX3 - #Master #OBSOLETE"):
   - DEMUX3 - #Engineering/DEMUX-3 - #software/DEMUX-3 - #atmel/v400/demux3_v400.c   main(), port_init,
       uart0_init, process_uart, UART0_receive, UART0_transmit_counter, ALTERA_RESET, ALTERA_write,
       write_data, ALTERA_read, read_data/1/2, READ_GS1560_STATUS, PROCESS_SDI_LOCK_STATUS,
       PROCESS_HD_SD_CONTROL, Audio1..4_Detect, COMPARE_AUDIOx_AUDIOy, SAMPLE_COUNT, SAMPLE_COMPARE,
       TRANSLATE_/DEBOUNCE_ERRORx, PROCESS_SAMPLExx_COMPARE, PROCESS_GROUP_COMPARE1/2,
       PROCESS_HD_SD_COMPARE, TRANSLATE_RESET_VECTOR(1), PROCESS_AUDIO_INFORMATION
     … demux3_v400.lis / V400.mp (ICCAVR listing: cycle counts of read_data/write_data, 4746-byte text)
     … v201-4, v204, v203, v202, v203-POD19, v200-ams4, Released/v100, v101 (diffed against v400)
   - …/DEMUX-3 - #altera/v301: pod31.bdf (top level, netlist extracted from the BDF), v105.qsf (pins),
       v10x_description.txt, shift_in.vhd, sd demux/shifter_out_48bit.vhd, SDdemux.bdf, CHACT_FLAGS.bdf,
       group_detector.vhd, group selector.vhd (both copies), I2S_shifter.vhd, I2S_generator.vhd,
       start_pulse.vhd, reset.vhd, SD403_FIFO.vhd (128 × 30), group_detectorHD.vhd, hd_group_detect.vhd,
       HD_group_sel.vhd, dcfifo0.vhd (64 × 64), I2S_64_par_ser_reva.vhd, SD_HD_SEL.vhd, AES_enable.vhd,
       swap.vhd, switch2x1.vhd, stabalizer.vhd, PDF_DETECTOR.bdf, i2sx4_aes.vhd, altpll1.vhd, lpm_counter0.vhd
   - …/DEMUX-3 - #PCB/DEMUX-3ISS4.net, .bom, .pnp (P-CAD); WORKING/Imported DEMUX-3ISS4.PRJPCB/
       Project Outputs…/DEMUX-3ISS4.PDF (top assembly → assets/demux3-top-assy.png), DEMUX-3ISS4.GKO (outline)
   - AMS8 #Engineering #TIM/SILK/AMS81-DEMUX3rearsilk-CURVE.cdr (2006-06-29, white plate) + AMS81 - #Master/AMS8 - #Engineering/
       PANEL VIEWS/AMS81-DEMUX3-REARVIEW.cdr (2009-11-04, connector outlines, same sheet registration) → Inkscape/libcdr →
       assets/demux3-rear.svg: the DEMUX-3 section of the AMS8-1 rear (artwork pass 2026|59)
   - DEMUX3 - #TESTREPORT/*.pdf (v1003 cable length, v2003, v2004, DMS1 v4000, XTM4 v4000)
   - DEMUX-3 - #software/readme.doc (27 Feb 2008, Tim Clarke)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const REAR_SILK = 'AMS8 #Engineering #TIM/SILK/AMS81-DEMUX3rearsilk-CURVE.cdr', REAR_VIEW = 'AMS81 - #Master/AMS8 - #Engineering/PANEL VIEWS/AMS81-DEMUX3-REARVIEW.cdr';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const hex = (v,n)=> (v>>>0).toString(16).toUpperCase().padStart(n||2,'0');
const bin = (v,n)=> (v>>>0).toString(2).padStart(n||8,'0');
const clamp = (v,a,b)=> Math.max(a, Math.min(b, v));

/* ---------------- timing (cycle counts from demux3_v400.lis) ---------------- */
const F_CPU = 4.9152e6, CYC = 1/F_CPU;          // "Crystal: 4.9152Mhz" header; X1 4.9152 on the BOM
const RD_BIT = 15, WR_BIT = 14;                 // read_data: sbi,cbi,lsl,sbic,rjmp,andi/ori,xjmp + loop ≈15 cyc; write_data ≈14
const RD_BYTE = 8*RD_BIT + 12, WR_BYTE = 8*WR_BIT + 10;
const WR_CYC = 6*WR_BYTE + 46, RD_CYC = 18*RD_BYTE + 58;
const STEPS = [   // [label, cycles] — one pass of the v400 main loop
  ['WDR · UART0_receive · process_uart · UART0_transmit_counter', 110],
  ['READ_GS1560_STATUS · PROCESS_SDI_LOCK_STATUS · PROCESS_HD_SD_CONTROL', 95],
  ['TRANSLATE_INPUT(CD) · DEBOUNCE_INPUT', 60],
  ['PROCESS_AUDIO_INFORMATION', 85],
  ['ALTERA_write: 6 bytes → 48-bit shift chain', WR_CYC],
  ['ALTERA_read: 3 strobes × 6 bytes', RD_CYC],
  ['Audio1_Detect · Audio2_Detect', 110],
  ['ALIGNMENT_CHECK(ALTERA6) · ERROR2 debounce', 120],
  ['COMPARE_AUDIO1_AUDIO2 / 3_4 · PROCESS_SAMPLE12/34_COMPARE', 420],
  ['Audio3_Detect · Audio4_Detect', 110],
  ['COMPARE_AUDIO5_AUDIO6 / 7_8 · PROCESS_SAMPLE56/78_COMPARE', 420],
  ['PROCESS_GROUP_COMPARE1 · PROCESS_HD_SD_COMPARE · TRANSLATE_RESET_VECTOR', 160],
  ['PROCESS_GROUP_COMPARE2 · PROCESS_HD_SD_COMPARE · TRANSLATE_RESET_VECTOR1', 160],
];
const STEP_OFF = []; { let a=0; for (const s of STEPS){ STEP_OFF.push(a); a+=s[1]; } STEP_OFF.push(a); }
const PASS_CYC = STEP_OFF[STEPS.length];                 // ≈5 060 cycles ≈ 1.03 ms
const PASS_T = PASS_CYC*CYC;
const INIT_PASS_T = 120*CYC;                            // "if (init == YES) goto loop;" — only the UART calls run
const TICK0 = 23*1024*CYC;                              // TCNT0 = 0xE9, clk/1024 → 4.792 ms ("actual value: 4.792mSec")
const ISR0_CYC = 30;                                    // timer0_ovf_isr: push, TCNT0 reload, pop, reti (inferred)
const UART_BYTE = 10/9600;                              // UBRR0L = 0x1F → 9600 8N1
const ALT_RESET_T = 1000*6*CYC;                         // ALTERA_RESET(1000): WDR + 16-bit decrement + branch ≈ 6 cycles
const T_MCU = 0.065;                                    // ATmega128 start-up delay after power (SUT) — inferred
const T_POR = 0.100;                                    // Cyclone POR delay — inferred
const CFG_BITS = 2323240;                               // EP1C12 raw configuration size — inferred (Altera data)
const T_CFG = CFG_BITS/20e6;                            // Active Serial from the M25P40 at ≈20 MHz DCLK ≈ 0.116 s — inferred
const T_GSLOCK = 0.018;                                 // GS1560A lock/relock after carrier or format change — inferred
const HOST_T = 0.055, HOST_ISR_T = 0.010, HOST_PROBE_T = 0.30, HOST_PHASE = 0.0137;   // host frame cadence — inferred
const SD_LAT = 64, HD_LAT = 16;                         // read starts at wrusedw bit 6 (SD403_FIFO) / bit 4 (dcfifo0)

/* ---------------- video formats ---------------- */
const VF = {
  sd525:{name:'SD 525i 59.94', std:1, clk:27e6, spl:1716, act:1440, hdr:4, lines:525, fr:30000/1001, il:true, sw:[10,273], rate:'270 Mb/s'},
  sd625:{name:'SD 625i 50', std:1, clk:27e6, spl:1728, act:1440, hdr:4, lines:625, fr:25, il:true, sw:[6,319], rate:'270 Mb/s'},
  hd1080i59:{name:'HD 1080i 59.94', std:2, clk:74.25e6/1.001, spl:2200, act:1920, hdr:8, lines:1125, fr:30000/1001, il:true, sw:[7,569], rate:'1.485/1.001 Gb/s'},
  hd1080i50:{name:'HD 1080i 50', std:2, clk:74.25e6, spl:2640, act:1920, hdr:8, lines:1125, fr:25, il:true, sw:[7,569], rate:'1.485 Gb/s'},
  hd720p59:{name:'HD 720p 59.94', std:2, clk:74.25e6/1.001, spl:1650, act:1280, hdr:8, lines:750, fr:60000/1001, il:false, sw:[7], rate:'1.485/1.001 Gb/s'},
};
const GCOL = ['--accent','--accent2','--warn','--bad'];
const DID = {sd:['0x2FF','0x1FD','0x1FB','0x2F9'], hd:['0x2E7','0x1E6','0x1E5','0x2E4']};
const fieldT = f => 1/(f.fr*(f.il?2:1));
const lineT = f => 1/(f.fr*f.lines);

/* ---------------- firmware builds (diffed against v400) ---------------- */
const BUILDS = {
  v400:{name:'v400 · XTM4 / DMS1 (Aug 2011|44)', file:'v400/demux3_v400.c', proto:'poll', e8:true, initLoop:false, grpConst:3, txHD:7, cdMute:false, cdReset:false, fix56:false},
  v2014:{name:'v201-4 · XTM4 (Oct 2006|39)', file:'v201-4/demux_201-4.c', proto:'poll', e8:true, initLoop:true, grpConst:3, txHD:7, cdMute:false, cdReset:false, fix56:false},
  v204:{name:'v204 · Ali’s build (Apr 2011|44)', file:'v204/demux204.c', proto:'poll', e8:false, initLoop:false, grpConst:10, txHD:10, cdMute:false, cdReset:false, fix56:false},
  v203:{name:'v203 · AMS8 (Aug 2009|42)', file:'v203/demux_201.c', proto:'isr', e8:true, initLoop:false, grpConst:3, txHD:7, cdMute:true, cdReset:true, fix56:true},
  p19:{name:'v203-POD19 (Jun 2010|43)', file:'v203-POD19/demux_201.c', proto:'pod19', e8:false, initLoop:false, grpConst:3, txHD:7, cdMute:true, cdReset:true, fix56:true},
};
const SCN = {
  steady:{label:'Running (steady state)', end:1.02, boot:false, pages:[[0,'0 – 1 s']]},
  plug:{label:'SDI cable plugged in at 50 ms', end:2.02, boot:false, pages:[[0,'0 – 1 s'],[1,'1 – 2 s']]},
  boot:{label:'Power-up (FPGA loads from the M25P40)', end:2.02, boot:true, pages:[[0,'0 – 1 s'],[1,'1 – 2 s']]},
};
const HCMD = [[0xE0,'0xE0 · Group 1 (+ Group 2)'],[0xE2,'0xE2 · Group 2 (+ Group 3)'],[0xE4,'0xE4 · Group 3 (+ Group 4)'],[0xE6,'0xE6 · Group 4 (+ “Group 5” → 1)'],[0xE1,'0xE1 · Group 1, bit 0 set']];

/* ---------------- device + world state ---------------- */
const BASE0 = ()=>({ cable:true, fmt:'sd525', gm:0b0011, host:true, hcmd:0xE0, p19g:0, skew:0 });
const D = { scn:'steady', page:0, build:'v400', base:BASE0(), ev:[], log:[], lastTrace:[], scope:0, selChip:null, selBlock:'mcu', selStep:null, sheet:0, lesson:0 };
const page0 = ()=> SCN[D.scn].pages[Math.min(D.page, SCN[D.scn].pages.length-1)][0];
const absT = t => page0() + (t===undefined? SIM.t : t);

let WC=null, WKEY='';
function world(t){
  const key = JSON.stringify([D.base, D.ev]);
  if (key!==WKEY){ WKEY=key; WC=[]; let w=JSON.parse(JSON.stringify(D.base)); WC.push({t:-Infinity, w}); for (const e of D.ev){ w=JSON.parse(JSON.stringify(w)); applyEv(w,e); WC.push({t:e.t, w}); } }
  let lo=0, hi=WC.length-1; while (lo<hi){ const m=(lo+hi+1)>>1; if (WC[m].t<=t) lo=m; else hi=m-1; }
  return WC[lo].w;
}
function applyEv(w,e){ if (e.k==='skew') w.skew = (w.skew|0) + 1; else if (e.k!=='probe') w[e.k]=e.v; }
function lastEv(k, t){ let r=-1e9; for (const e of D.ev){ if (e.t>t) break; if (e.k===k) r=e.t; } return r; }
function addEv(k, v){ const t=absT(); if (k!=='skew' && k!=='probe') D.ev = D.ev.filter(e=> !(e.k===k && e.t>=t-1e-9)); D.ev.push({t,k,v}); D.ev.sort((a,b)=>a.t-b.t); }
function cableSince(t){ // time the GS1560 last (re)started locking: cable plug or format change
  const w=world(t); if (!w.cable) return null;
  let s = SCN[D.scn].boot ? 0 : -1e9;
  for (const e of D.ev){ if (e.t>t) break; if ((e.k==='cable' && e.v) || e.k==='fmt') s=e.t; }
  return s;
}
function vidOK(t){ const s=cableSince(t); return s!==null && t >= s + T_GSLOCK; }
function nextStart(t, f){ // start_pulse: 8 lines into the vertical interval of the next field
  const Tf=fieldT(f), off=8*lineT(f); const k=Math.ceil((t-off)/Tf-1e-9); return k*Tf+off; }

/* ---------------- host byte schedule (RS-485, 9600 8N1) ---------------- */
function hostBytes(T0, END, B){
  const out=[]; if (B.proto==='pod19') return out;
  const sc=SCN[D.scn]; const per = B.proto==='isr'? HOST_ISR_T : HOST_T;
  let probed = !sc.boot;
  const probes = D.ev.filter(e=>e.k==='probe').map(e=>e.t);
  for (let t=T0+HOST_PHASE; t<END; t+=per){
    const w=world(t); if (!w.host) continue;
    if (sc.boot && t < HOST_PROBE_T) continue;
    let frame;
    if (!probed || probes.some(p=>p<=t && p>t-per)){ frame = B.proto==='isr'? [0x88] : [0xE8, 0x55]; probed=true; }
    else frame = B.proto==='isr'? [w.hcmd] : [w.hcmd, 0x55];
    frame.forEach((b,i)=> out.push({t0:t+i*UART_BYTE, t1:t+(i+1)*UART_BYTE, b, dir:'h', first:i===0}));
  }
  return out;
}

/* =====================================================================
   EMULATOR — main() of the selected build, pass by pass, against a model
   of the pod31 FPGA (shift chain, SD/HD demux, FIFOs, flags).
   ===================================================================== */
let S=null, SKEY='';
function sched(){ const key=JSON.stringify([D.scn, D.build, D.base, D.ev]); if (S && key===SKEY) return S; SKEY=key; S=emulate(); return S; }

function newM(){ return {
  CD:0, sd_hd:0x80, prev_sd_hd:0x80, rc_byp:0, lock60:0, smpte:0, release1:0, switch1:0, switch1_counter:0,
  AUDIO:[0,0,0,0], AI:0, RV:0, RV1:0, gd:0, audio_select1:0, audio_select2:2,
  ERROR2:1, ERROR3:1, ERROR4:1, ERROR5:1, ERROR6:1, ERROR2_3:1, ERROR2_4:1, ERROR2_5:1, ERROR2_6:1,
  CHK:{3:1,4:1,23:1,24:1}, sw:{2:0,3:0,4:0,23:0,24:0}, rel:{2:0,3:0,4:0,23:0,24:0}, swc:{2:0,3:0,4:0,23:0,24:0},
  RESET:{2:0,3:0,4:0,23:0,24:0}, errc:{2:0,3:0,4:0,23:0,24:0},
  prev_g1:0xFF, prev_g2:0xFF, reset_enable:0, reset_counter:0, reset_enable1:0, reset_counter1:0,
  uart_received0:0, uart_byte1:0, rx0:0, rx1:0, data_available0:0, transmit_counter0:0, uart_tx_data0:0, uart0_tx_data:0,
  init:0, power_up_test_complete:0, group_sel:0, pgroup_sel:0, group_sel_counter:0, pf2:0, isrbuf:0,
  ALT:new Array(18).fill(0), ledY:0, ledR:0, p19sdi:0, p19aud:0, running:false };
}
const snapM = M => JSON.parse(JSON.stringify(M));

function emulate(){
  const sc=SCN[D.scn], B=BUILDS[D.build], END=sc.end;
  const T0 = sc.boot? 0 : -1.4;
  const st = { passes:[], wr:[], rd:[], uart:[], isr0:[], cfg:[], ncfg:[], notes:[], fifoEv:[], B, T0, END, waitE8:null };
  const hb = hostBytes(T0, END, B); hb.forEach(b=> st.uart.push(b));
  /* ---------- FPGA model ---------- */
  const F = { cfg:[], gd:0, RV:0, RV1:0, AI:0, sdPin:0x80, fifo:[0,1,2,3].map(()=>({st:'reset', rel:null, run:null, skewT:null, hiT:null})),
    hdrst:[true,true], enHD:[0,0], lastPkt:[-1e9,-1e9], presSince:[null,null,null,null] };
  if (sc.boot){ F.cfg.push({t0:T_POR, t1:T_POR+T_CFG}); }
  else F.cfg.push({t0:-1e9, t1:-1e9});
  const inCfg = t => F.cfg.some(c=>t>=c.t0 && t<c.t1) || (sc.boot && t<T_POR);
  const g1of = gd => (gd&7)>>1, g2of = gd => ((gd>>3)&7)>>1;
  function applyWrite(t){ // STROBE_WRITE: shift_in q-outputs latch the chain
    if (inCfg(t)) return;
    const w=world(t), f=VF[w.fmt], sdMode = !!(F.sdPin&0x80);
    for (let p=0;p<4;p++){ const low = !((F.RV>>p)&1) || !((F.RV>>4)&1); const q=F.fifo[p];
      if (low){ if (q.st!=='reset') st.fifoEv.push({t, p, kind:'reset'}); q.st='reset'; q.rel=null; q.run=null; q.skewT=null; q.hiT=null; }
      else if (q.st==='reset' && q.hiT===null) q.hiT=t; }
    F.hdrst=[!((F.RV>>4)&1), !((F.RV1>>4)&1)];
  }
  function fpgaAt(t){ // evaluate the datapath at time t (called at ALTERA_read)
    const w=world(t), f=VF[w.fmt], vid=vidOK(t), sdIn = f.std===1, sdMode=!!(F.sdPin&0x80);
    const gsel=[g1of(F.gd), g2of(F.gd)];
    // FIFO release at the next start pulse (needs video: start_pulse is clocked by hsynch)
    for (let p=0;p<4;p++){ const q=F.fifo[p];
      if (q.st==='reset' && q.hiT!==null && vid && sdIn){ if (q.rel===null) q.rel=nextStart(Math.max(q.hiT, cableSince(t)+T_GSLOCK), f); if (q.rel<=t){ q.st='run'; q.run=q.rel; st.fifoEv.push({t:q.rel, p, kind:'release'}); } }
      const g=gsel[p>>1]; const pres = vid && sdIn && ((w.gm>>g)&1);
      if (pres){ if (F.presSince[p]===null) F.presSince[p]=t; } else F.presSince[p]=null;
      if (p===0 && q.st==='run' && w.skew && q.skewT===null && lastEv('skew',t)>q.run) q.skewT=lastEv('skew',t);
    }
    // HD group detect (hd_group_detect: set on a packet, cleared after 8 'vertical' edges without one)
    for (let k=0;k<2;k++){ if (vid && !sdIn){ const g=gsel[k]; if ((w.gm>>g)&1){ F.enHD[k]=1; F.lastPkt[k]=t; } else if (t-F.lastPkt[k] >= 8*fieldT(f)) F.enHD[k]=0; } }
    const A = new Array(18).fill(0);
    if (inCfg(t)) return {A:A.fill(0xFF), cfg:true};
    for (let p=0;p<4;p++){ const q=F.fifo[p], ps=F.presSince[p]; let fill=0, ch=0;
      if (ps!==null && t-ps >= fieldT(f)) ch=1;
      if (q.st==='run' && ps!==null){ const n=Math.floor((t-Math.max(q.run, ps))*48000); fill = n<SD_LAT? Math.max(0,n) : SD_LAT + ((Math.floor(t*997)%3)-1); }
      const fb = clamp(fill + (q.skewT!==null && fill>=SD_LAT-1? 4 : 0), 0, 127);
      const base = p<2? p*2 : 6+(p-2)*2;
      A[base] = (ch<<7)|fill; A[base+1] = (ch<<7)|fb; }
    A[4]=0; A[5]=0xA8; A[10]=0; A[11]=0xA8; A[12]=0; A[13]=(F.enHD[0]<<7)|(F.enHD[1]<<6); A[17]=0xA8;
    return {A, cfg:false};
  }
  /* ---------- MCU ---------- */
  const M = newM();
  let t;
  if (sc.boot){
    t = T_MCU;
    st.notes.push({t, txt:'init_devices(): port_init, watchdog_init (WDTCR = 0x09, ≈32 ms), timer0_init, uart0_init, TIMSK = 0x01, SEI'});
    t += 260*CYC;
    if (B.initLoop){ st.waitE8 = {t0:t, t1:null}; }
  } else {
    t = T0; M.running=true; M.CD=0; M.init=0; M.power_up_test_complete=1;
  }
  // steady-state seeding: FPGA configured, last group written
  const w0=world(T0);
  if (!sc.boot){ M.audio_select1 = B.proto==='pod19'? (w0.p19g&3)*2 : (w0.hcmd&6); M.audio_select2=M.audio_select1+2; M.prev_g1=(M.audio_select1&6)>>1; M.prev_g2=M.prev_g1;
    M.sd_hd = VF[w0.fmt].std===1? 0x80 : 0; M.prev_sd_hd=M.sd_hd; }
  else { M.prev_sd_hd = 0; if (B.proto==='pod19'){ M.audio_select1=(w0.p19g&3)*2; M.audio_select2=M.audio_select1+2; } }  // .bss = 0, previous_group_sel1 = 0xFF
  F.sdPin=M.sd_hd;
  let hbi = 0;                          // next host byte not yet seen by the MCU
  let rxq = [];                         // bytes in the UART receive buffer
  let nextT0 = Math.ceil((t)/TICK0)*TICK0;
  let txBusyUntil = -1e9;
  let altResetDone = !sc.boot, passN=0, stage = sc.boot? (B.initLoop? 'initwait':'reset') : 'loop';
  const sendByte = (tt, b, via)=>{ const t0=Math.max(tt, txBusyUntil); txBusyUntil=t0+UART_BYTE; const r={t0, t1:t0+UART_BYTE, b, dir:'d', via, pf2Off:null}; st.uart.push(r); return r; };
  let lastTx=null;
  // ISR-protocol replies happen in uart0_rx_isr at each byte end
  function isrBytes(upTo){
    while (hbi<hb.length && hb[hbi].t1<=upTo){ const hbyte=hb[hbi++];
      if (B.proto==='isr' && M.running!==null){
        M.isrbuf++; let reply=null;
        if (M.isrbuf>=11){ M.isrbuf=0; // process_uart scans the 11 stored bytes (only the newest is modelled)
          if (hbyte.b===0x88) reply=0xE0; else if (hbyte.b&0x80){ M.group_sel=hbyte.b&7; M.audio_select1=hbyte.b&6; M.audio_select2=M.audio_select1+2; }
          if (reply!==null) sendByte(hbyte.t1, reply, 'U10'); }
        const temp = M.sd_hd? (0x70 | ((M.AUDIO.every(a=>!a))?1:0) | (M.CD?0:2)) : (0x30 | (M.CD?0:2));
        if (hbyte.t1>=txBusyUntil) sendByte(hbyte.t1, temp, 'U10');
      } else rxq.push(hbyte);
    }
  }
  function uartPoll(tt){ // UART0_receive + process_uart + UART0_transmit_counter at time tt
    isrBytes(tt);
    let got=null; if (rxq.length){ got=rxq.shift(); M.uart_received0++; M.rx0=got.b; }
    if (M.uart_received0){ M.uart_received0--;
      if (!M.uart_byte1){ if (M.rx0&0x80){ M.rx1=M.rx0; M.uart_byte1=1; } }
      else if (!(M.rx0&0x80)){ M.uart_byte1=0; const c=M.rx1;
        if (c===0xFF){}
        else if (c===0xE8 && B.e8){ M.uart0_tx_data=0xE0; M.data_available0=1; M.init=1; M.power_up_test_complete=1; st.notes.push({t:tt, txt:'process_uart: 0xE8 → uart0_tx_data = 0xE0, init = YES (power-up test)'}); }
        else if ((c&0xE0)===0xE0){ M.data_available0=1; M.pgroup_sel=c&6; M.audio_select1=M.pgroup_sel; M.audio_select2=M.audio_select1+2;
          if (!(M.uart_tx_data0&1)) M.pgroup_sel|=1;
          M.uart0_tx_data = M.CD? 0 : 2;
          if (M.group_sel!==M.pgroup_sel){ if (M.group_sel_counter!==B.grpConst) M.group_sel_counter++; else { M.group_sel_counter=0; M.group_sel=M.pgroup_sel; } } else M.group_sel_counter=0; }
      } else { M.rx0=0; M.rx1=0; M.uart_byte1=0; } }
    if (M.data_available0){ const lim = (M.sd_hd===0 || !M.CD)? B.txHD : 7;
      if (M.transmit_counter0 < lim) M.transmit_counter0++;
      else if (M.uart_tx_data0===0){ M.pf2=1; lastTx = sendByte(tt, M.uart0_tx_data, 'U8+U10'); M.uart_tx_data0=1; M.transmit_counter0=0; }
      else if (M.uart_tx_data0===1){ M.pf2=0; if (lastTx) lastTx.pf2Off=tt; M.data_available0=0; M.uart_tx_data0=0; M.transmit_counter0=0; M.init=0; } }
  }
  // ---- boot: wait for E8 (v201-4), then ALTERA_RESET(1000) → Q1 pulls nCONFIG low
  while (stage!=='loop' && t<END){
    if (stage==='initwait'){ const t1=t+INIT_PASS_T; uartPoll(t); st.passes.push({t0:t, t1, init:true, s:snapM(M)}); t=t1; if (M.power_up_test_complete && !M.data_available0){ st.waitE8.t1=t; stage='reset'; } continue; }
    if (stage==='reset'){ st.ncfg.push({t0:t, t1:t+ALT_RESET_T}); st.notes.push({t, txt:'ALTERA_RESET(1000): PORTG |= BIT2 → R69 → Q1 → nCONFIG low for ≈'+SIM.fmtDur(ALT_RESET_T)+'; PORTC |= 0x1F'});
      const rel = t+ALT_RESET_T, c0 = F.cfg[0];
      if (rel <= c0.t0) {}                                        // pulse ends while the POR delay is still running: one load
      else if (t < c0.t1){ F.cfg = [{t0:Math.max(c0.t0, rel), t1:Math.max(c0.t0, rel)+T_CFG, restart:true}]; }  // load aborted, starts again
      else F.cfg.push({t0:rel, t1:rel+T_CFG, restart:true});      // already in user mode: full reconfiguration from the EPCS
      t = rel + 40*CYC; M.running=true; stage='loop'; }
  }
  st.cfg = F.cfg; st.inCfg = inCfg;
  // ---- main loop
  while (t < END){
    const p0=t; let tt=t; passN++;
    const isr = (nextT0 < p0+PASS_T)? 1 : 0; if (isr){ st.isr0.push(nextT0); nextT0+=TICK0; }
    // step 0
    if (B.proto==='poll'){ uartPoll(tt); if (M.init){ const t1=tt+INIT_PASS_T; st.passes.push({t0:p0, t1, init:true, s:snapM(M)}); t=t1; continue; } }
    else isrBytes(tt);
    const w = world(tt), f=VF[w.fmt];
    // step 1: READ_GS1560_STATUS / PROCESS_SDI_LOCK_STATUS / PROCESS_HD_SD_CONTROL
    tt = p0 + STEP_OFF[1]*CYC;
    const lk = vidOK(tt); M.rc_byp=lk?0x80:0; M.lock60=lk?4:0; M.smpte=lk?8:0;
    M.sd_hd = (cableSince(tt)!==null)? (f.std===1? 0x80:0) : M.sd_hd;
    if (M.rc_byp && M.lock60 && M.smpte){ M.ledY=1; M.ledR=0; M.CD=1; } else { M.ledR=1; M.ledY=0; M.CD=0; }
    if (B.proto==='pod19') M.p19sdi=M.CD;
    F.sdPin = M.sd_hd;
    // step 2: TRANSLATE_INPUT / DEBOUNCE_INPUT
    if (!M.CD){ if (!M.release1 && !M.switch1) M.switch1=1; } else if (M.switch1) M.release1=1;
    if (M.release1){ if (M.switch1_counter<255) M.switch1_counter++; else { M.switch1_counter=0; M.release1=0; M.switch1=0; } }
    // step 3: PROCESS_AUDIO_INFORMATION
    let AI=255; const AU=M.AUDIO;
    if (B.cdMute && !M.CD) AI=0; else { if(!AU[1]) AI&=~0x80; if(!AU[0]) AI&=~0x40; if(!AU[3]) AI&=~0x20; if(!AU[2]) AI&=~0x10; if(!AU[1]) AI&=~8; if(!AU[0]) AI&=~4; if(!AU[3]) AI&=~2; if(!AU[2]) AI&=~1; }
    M.AI=AI;
    // step 4: ALTERA_write
    const tW = p0 + STEP_OFF[4]*CYC;
    M.gd = (M.audio_select1 | (M.audio_select2<<3) | (M.CD<<6)) & 0xFF;
    F.gd=M.gd; F.RV=M.RV; F.RV1=M.RV1; F.AI=M.AI;
    st.wr.push({t0:tW, t1:tW+WR_CYC*CYC, bytes:[0xFF&~0x78, 0xFF, ((M.RV1<<5|M.RV)>>8)&0xFF, (M.RV1<<5|M.RV)&0xFF, M.AI, M.gd]});
    applyWrite(tW+WR_CYC*CYC);
    // step 5: ALTERA_read
    const tR = p0 + STEP_OFF[5]*CYC; const fp = fpgaAt(tR); M.ALT = fp.A.slice();
    st.rd.push({t0:tR, t1:tR+RD_CYC*CYC, bytes:M.ALT.slice(), cfg:fp.cfg});
    const A=M.ALT;
    // step 6: Audio1/2_Detect
    const det = (d1,d2,pin)=> M.sd_hd? (((d1&0x80)||(d2&0x80)) && M.CD ? 1:0) : ((A[13]&pin) && M.CD ? 1:0);
    M.AUDIO[0]=det(A[0],A[1],0x80); M.AUDIO[1]=det(A[2],A[3],0x80);
    if (B.proto==='pod19') M.p19aud=M.AUDIO[0];
    // step 7: alignment (ERROR2) — debounced, result unused
    M.ERROR2 = ((A[5]&0xF0)===0xA0)?1:0;
    translate(M,2,M.ERROR2); debounce(M,2);
    if (M.RESET[2]===0 && M.sw[2]===0){ M.RESET[2]=1; M.errc[2]=0; } else if (M.RESET[2]===1 && M.sw[2]===0){ if (M.errc[2]===255) M.RESET[2]=0; else M.errc[2]++; } else if (M.RESET[2]===1 && M.sw[2]===1) M.RESET[2]=0;
    // step 8: sample-count compares, group 1
    const cnt=(au,d)=> au? (d&0x7F) : 0;
    const cmp=(a,b)=>{ let i=((a-b)<<24)>>24; if (M.CD){ if (i<0) i=b-a; } else i=0; return (i&0xFF)>2? 0:1; };
    M.CHK[3]=cmp(cnt(M.AUDIO[0],A[0]), cnt(M.AUDIO[0],A[1])); translate(M,3,M.CHK[3]); debounce(M,3); procCmp(M,3,'ERROR3',3);
    M.CHK[4]=cmp(cnt(M.AUDIO[1],A[2]), cnt(M.AUDIO[1],A[3])); translate(M,4,M.CHK[4]); debounce(M,4); procCmp(M,4,'ERROR4',4);
    // step 9: Audio3/4_Detect
    M.AUDIO[2]=det(A[6],A[7],0x40); M.AUDIO[3]=det(A[8],A[9],0x40);
    // step 10: group 2 compares
    M.CHK[23]=cmp(cnt(M.AUDIO[2],A[6]), cnt(M.AUDIO[2],A[7])); translate(M,23,M.CHK[23]); debounce(M,23); procCmp(M,23,'ERROR2_3', B.fix56? 23 : 3);
    M.CHK[24]=cmp(cnt(M.AUDIO[3],A[8]), cnt(M.AUDIO[3],A[9])); translate(M,24,M.CHK[24]); debounce(M,24); procCmp(M,24,'ERROR2_4',24);
    // step 11: group 1 compare / standard compare / RESET_VECTOR
    let tmp=(M.audio_select1&6)>>1; M.ERROR5 = tmp!==M.prev_g1? 0:1; M.prev_g1=tmp;
    if (M.sd_hd!==M.prev_sd_hd){ M.ERROR6=0; M.ERROR2_6=0; } else { M.ERROR6=1; M.ERROR2_6=1; } M.prev_sd_hd=M.sd_hd;
    M.RV = trv(M, [M.ERROR3,M.ERROR4,M.ERROR2_3,M.ERROR2_4,M.ERROR5,M.ERROR6], '', B);
    // step 12: group 2 compare (second PROCESS_HD_SD_COMPARE call always sees "no change")
    tmp=(M.audio_select1&6)>>1; M.ERROR2_5 = tmp!==M.prev_g2? 0:1; M.prev_g2=tmp;
    if (M.sd_hd!==M.prev_sd_hd){ M.ERROR6=0; M.ERROR2_6=0; } else { M.ERROR6=1; M.ERROR2_6=1; } M.prev_sd_hd=M.sd_hd;
    M.RV1 = trv(M, [M.ERROR2_3,M.ERROR2_3,M.ERROR2_3,M.ERROR2_3,M.ERROR2_5,M.ERROR2_6], '1', B);
    if (B.proto==='pod19'){ const g=world(p0+PASS_T).p19g&3; M.audio_select1=g*2; M.audio_select2=M.audio_select1+2; }
    const t1 = p0 + (PASS_CYC + (B.proto==='pod19'?40:0) + isr*ISR0_CYC)*CYC;
    st.passes.push({t0:p0, tW, tR, t1, n:passN, s:snapM(M), F:{gd:F.gd, RV:F.RV, RV1:F.RV1, AI:F.AI, sdPin:F.sdPin, fifo:F.fifo.map(q=>({st:q.st, run:q.run, skewT:q.skewT})), enHD:F.enHD.slice(), hdrst:F.hdrst.slice()}});
    t = t1;
  }
  isrBytes(END);
  st.uart.sort((a,b)=>a.t0-b.t0);
  return st;
}
function translate(M,k,check){ const data=(~check)&1; if (!data){ M.sw[k]=1; M.swc[k]=0; M.rel[k]=0; } else if (M.sw[k]===1) M.rel[k]=1; }
function debounce(M,k){ if (M.rel[k]===1){ if (M.swc[k]<255) M.swc[k]++; else { M.swc[k]=0; M.rel[k]=0; M.sw[k]=0; } } }
function procCmp(M,k,err,rk){ const R=M.RESET;
  if (R[rk]===0 && M.sw[k]===0){ R[k]=1; M.errc[k]=0; M[err]=0; }
  else if (R[k]===1 && M.sw[k]===0){ if (M.errc[k]===500) R[k]=0; else M.errc[k]++; }
  else if (R[k]===1 && M.sw[k]===1){ R[k]=0; M[err]=1; } }
function trv(M, e, sfx, B){ let d=0x0F; if(!e[0]) d&=~1; if(!e[1]) d&=~2; if(!e[2]) d&=~4; if(!e[3]) d&=~8;
  const en='reset_enable'+sfx, cn='reset_counter'+sfx;
  if (!e[4] || !e[5] || (B.cdReset && !M.CD)){ d&=~0x10; M[en]=1; M[cn]=255; }
  else if (M[en] && M[cn]!==0) M[cn]--;
  else { d|=0x10; M[en]=0; }
  return d; }
/* ---------------- lookups on the schedule ---------------- */
function bs(arr, t, key){ let lo=0, hi=arr.length-1, r=-1; key=key||'t0'; while (lo<=hi){ const m=(lo+hi)>>1; if (arr[m][key]<=t){ r=m; lo=m+1; } else hi=m-1; } return r; }
function passAt(t){ const s=sched(), i=bs(s.passes,t); return i<0? null : s.passes[i]; }
function fullPassAt(t){ const s=sched(); let i=bs(s.passes,t); while (i>=0 && s.passes[i].init) i--; return i<0? null : s.passes[i]; }
function lastWrite(t){ const s=sched(); let i=bs(s.passes,t); while (i>=0 && (s.passes[i].init || !(s.passes[i].tW+WR_CYC*CYC<=t))) i--; return i<0? null : s.passes[i]; }
function inCfg(t){ return sched().inCfg(t); }
function stepAt(p, t){ if (!p) return null; if (p.init) return 0; const c=(t-p.t0)/CYC; for (let k=STEPS.length-1;k>=0;k--) if (c>=STEP_OFF[k]) return k; return 0; }
function mcuState(t){ const s=sched(); if (s.waitE8 && t>=s.waitE8.t0 && (s.waitE8.t1===null || t<s.waitE8.t1)) return 'init_loop'; const p=passAt(t); if (!p) return s.B && SCN[D.scn].boot && t<T_MCU? 'off' : 'boot'; return p.init? 'init' : 'loop'; }
function ledsAt(t){ const p=passAt(t); if (!p || mcuState(t)==='init_loop') return {y:0,r:0,sdi:0,aud:0}; const m=p.s; return {y:m.ledY, r:m.ledR, sdi:m.p19sdi, aud:m.p19aud}; }

/* ---------------- audio / AES model ---------------- */
const SRC_LEVEL = 0.25;                     // −12 dBFS test tones in the simulated SDI source (not from the archive)
const chFreq = ch => 200*ch;                // embedded channel n carries a 200·n Hz tone — simulation choice
const AI_BIT = [6,7,4,5];                   // aes_on[1..4] = shift_in inst46 q14,q15,q12,q13 = AUDIO_INFORMATION bits
function outState(k, t){ // k: FPGA AES output 0..3 (AES1, AES2 = group 1 pairs; OUT_P3/P4_3,4 = group 2 pairs)
  if (SCN[D.scn].boot && t<T_POR) return {on:false, why:'no power yet / FPGA in POR'};
  if (inCfg(t)) return {on:false, why:'FPGA configuring from the M25P40: user I/O tri-stated'};
  const p=lastWrite(t); if (!p) return {on:false, why:'main loop has not written the shift chain yet'};
  const F=p.F, w=world(t), f=VF[w.fmt], sdMode=!!(F.sdPin&0x80), pr=k>>1;
  const g = k<2? (F.gd&7)>>1 : ((F.gd>>3)&7)>>1, ch=[g*4+1+2*(k%2), g*4+2+2*(k%2)];
  if (sdMode){
    if (!((F.AI>>AI_BIT[k])&1)) return {on:false, why:`AES_enable (SD): sd_off${k%2+1} = AUDIO_INFORMATION bit ${AI_BIT[k]} = 0 → output held low, no AES3 carrier`};
    const q=F.fifo[k]; if (q.st!=='run') return {on:true, mode:'zero', g, ch, why:'SD403_FIFO pair held in aclr (RESET_VECTOR) → I2S_shifter sends zeros'};
    if (!vidOK(t) || f.std!==1 || !((w.gm>>g)&1)) return {on:true, mode:'zero', g, ch, why:'FIFO empty (no packets) → zeros'};
    return {on:true, mode:'audio', g, ch, lat:SD_LAT, bits:20, skew: q.skewT!==null && k===0 ? 4 : 0};
  }
  if (!F.enHD[pr]) return {on:false, why:`AES_enable (HD): enable = enableHD${pr?'2':''} = 0 (hd_group_detect saw no G${g+1} packets for 8 fields)`};
  if (F.hdrst[pr]) return {on:true, mode:'zero', g, ch, why:`res${pr+1}_g low: dcfifo0 aclr, read_en${pr+1} cleared → zeros`};
  if (!vidOK(t)) return {on:true, mode:'stale', g, ch, why:'no video → no “vertical” edges → hd_group_detect never times out: enableHD stays 1 and the I2S serialiser repeats the last FIFO word ('+inf+')'};
  if (f.std===1 || !((w.gm>>g)&1)) return {on:true, mode:'stale', g, ch, why:'group gone: output still enabled until 8 fields pass ('+inf+' content)'};
  return {on:true, mode:'audio', g, ch, lat:HD_LAT, bits:24, skew:0};
}
function outSample(k, side, t){
  const o=outState(k,t); if (!o.on) return null; if (o.mode==='zero') return 0; if (o.mode==='stale') return 0.0917;
  const n=Math.floor(t*48000) - o.lat - (side? o.skew : 0); const ts=n/48000;
  const v = SRC_LEVEL*Math.sin(2*Math.PI*chFreq(o.ch[side])*ts); const q = o.bits===20? 1/(1<<19) : 1/(1<<23); return Math.round(v/q)*q;
}
function aesFrame(t, k){
  const n=Math.max(0, Math.floor(t*48000)), fr=n%192, out=[];
  for (const side of [0,1]){ const v=outSample(k,side,t), vv=v===null?0:v; let s=Math.round(vv*8388607); if (s<0) s+=1<<24;
    const bits=new Array(32).fill(0); for (let b=0;b<24;b++) bits[4+b]=(s>>b)&1;
    const c = (fr===0 || fr===185 || fr===188 || fr===189)? 1 : 0;      // tcb_int: pro bit; tcb_int2: hand-set CRC bits (frame index inferred)
    bits[28]=0; bits[29]=0; bits[30]=c; let par=0; for (let b=4;b<31;b++) par^=bits[b]; bits[31]=par;
    out.push({pre: side?'Y':(fr===0?'Z':'X'), bits, sample:vv, raw:s, off:v===null, c}); }
  return {n, fr, sub:out};
}
function biphase(pre, bits, start){ const P={X:[1,1,1,0,0,0,1,0],Y:[1,1,1,0,0,1,0,0],Z:[1,1,1,0,1,0,0,0]}[pre]; const lv=P.map(b=> start? 1-b : b); let cur=lv[lv.length-1]; for (let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if (bits[i]) cur=1-cur; lv.push(cur); } return lv; }

/* ---------------- SDI line / HANC model ---------------- */
const curFmt = t => VF[world(t).fmt];
function lineHasNoPkt(f, ln){ return f.sw.some(s=> ln===s+1); }
function lineSamples(f, n){ const Tl=lineT(f), ln=(n%f.lines)+1; if (lineHasNoPkt(f,ln)) return [];
  let a=Math.ceil((n-1)*Tl*48000-1e-9), b=Math.ceil(n*Tl*48000-1e-9); const prev=((n-1)%f.lines)+1; if (n>0 && lineHasNoPkt(f,prev)) a=Math.ceil((n-2)*Tl*48000-1e-9);
  const out=[]; for (let k=Math.max(0,a);k<b;k++) out.push(k); return out; }
function linePackets(f, n, gm){ const smp=lineSamples(f,n); if (!smp.length) return []; const out=[]; let w=f.hdr;
  for (let g=0; g<4; g++){ if (!((gm>>g)&1)) continue;
    if (f.std===1){ const len=7+12*smp.length; out.push({g, w0:w, w1:w+len, samples:smp}); w+=len; }
    else for (const k of smp){ out.push({g, w0:w, w1:w+31, samples:[k]}); w+=31; } }
  return out; }

/* ---------------- user actions ---------------- */
function act(name, fn){ D.lastTrace=[]; const tr=s=>D.lastTrace.push(s); fn(tr); sched();
  D.log.unshift({t:SIM.t, abs:absT(), name, trace:D.lastTrace.slice()}); if (D.log.length>60) D.log.length=60; SIM.refresh(); }
function consequence(tr, t0){
  const s=sched(); const ps=s.passes.filter(p=>!p.init && p.t0>t0);
  const ch=(get,lbl)=>{ const p0=fullPassAt(t0); const v0=p0? get(p0) : null; const q=ps.find(p=>get(p)!==v0); return q? `${lbl} → ${get(q)} at +${SIM.fmtDur(q.t0-t0)}` : null; };
  const l=[ch(p=>p.s.CD,'CD'), ch(p=>p.s.AUDIO.join(''),'AUDIO1–4'), ch(p=>hex(p.s.RV),'RESET_VECTOR 0x'), ch(p=>hex(p.s.AI),'AUDIO_INFORMATION 0x')].filter(Boolean);
  tr(l.length? 'Model result: '+l.join(' · ') : 'Model result: no flag changed before the end of this page.');
}
const A = {
  cable(){ const on=!world(absT()).cable; act(`${on?'Plug':'Unplug'} SDI at INPUT1`, tr=>{ addEv('cable', on); const t0=absT(), B=BUILDS[D.build];
    tr(on? `GS1574 (U1) equalises the cable; its carrier detect CD/MUTE1 rises (to GS1560 pin 5 and PE4). The GS1560A needs ≈${SIM.fmtDur(T_GSLOCK)} to lock (${inf}); then LOCK_60 (PD2), ~RC_BYP (PE7) and SMPTE (PG3) all read 1.` : 'GS1574 loses carrier; the GS1560A drops LOCK_60 at once.');
    tr('Next pass: READ_GS1560_STATUS() → PROCESS_SDI_LOCK_STATUS(): '+(on? 'rc_byp && lock60 && smpte → PORTA |= LED_Y_mask (PA3 yellow), PORTA &= ~LED_R_mask, CD = 1.' : 'one of them is 0 → PORTA |= LED_R_mask (PA2 red), CD = 0.'));
    if (!on){ tr('Audio1_Detect … Audio4_Detect AND every flag with CD, so AUDIO1–4 = 0 on the same pass → PROCESS_AUDIO_INFORMATION clears AUDIO_INFORMATION bits on the next pass → in SD AES_enable gates the outputs off.');
      tr(B.cdReset? 'This build (v202+) also has “|| (CD == 0)” in TRANSLATE_RESET_VECTOR: RESET_VECTOR bit 4 (res1_g) drops for 255 passes, clearing every FIFO.' : 'v400 has no “CD == 0” term in TRANSLATE_RESET_VECTOR (added in v202, lost again): in HD the FPGA keeps enableHD = 1 and the AES outputs keep running on stale data (see Findings).');
      if (B.cdMute) tr('v203: “if (CD == 0) AUDIO_INFORMATION = 0x00” mutes all eight AES enables at once.'); }
    consequence(tr, t0); }); },
  fmt(f){ act(`Source format → ${VF[f].name}`, tr=>{ addEv('fmt', f); const t0=absT();
    tr(`The GS1560A relocks (${SIM.fmtDur(T_GSLOCK)}, ${inf}) and its SD/~HD pin goes ${VF[f].std===1?'high (SD)':'low (HD)'} → PIND bit 7.`);
    tr(`PROCESS_HD_SD_CONTROL(): ${VF[f].std===1? 'PORTB |= BIT7 (ALTERA15 = 1, SD demux path), PORTG &= ~BIT4 (GS1560 10-bit mode)' : 'PORTB &= ~BIT7 (ALTERA15 = 0, HD path), PORTG |= BIT4 (GS1560 20-bit mode)'}.`);
    tr('PROCESS_HD_SD_COMPARE() sees sd_hd != previous_sd_hd → ERROR6 = 0 → TRANSLATE_RESET_VECTOR clears bit 4 and loads reset_counter = 255: res1_g stays low for 255 passes (≈'+SIM.fmtDur(255*PASS_T)+').');
    tr('The second PROCESS_HD_SD_COMPARE() call in the same pass finds no change and sets ERROR2_6 = 1 again, so RESET_VECTOR1 (group 2) never sees the standard change.');
    consequence(tr, t0); }); },
  groups(mask){ act(`Embedded groups → ${[1,2,3,4].filter(g=>(mask>>(g-1))&1).join(',')||'none'}`, tr=>{ addEv('gm', mask); const t0=absT();
    tr(`The source now carries audio data packets for group(s) ${[1,2,3,4].filter(g=>(mask>>(g-1))&1).join(', ')||'— none'} (SD DIDs ${DID.sd.filter((d,g)=>(mask>>g)&1).join(' ')||'—'}, HD ${DID.hd.filter((d,g)=>(mask>>g)&1).join(' ')||'—'}).`);
    tr('SD: CHACT_FLAGS sets CHn only if a FIFO write happened during the last field; ALTERA1–4 bit 7 follow one field later. HD: hd_group_detect drops enableHD after 8 “vertical” edges without a packet.');
    consequence(tr, t0); }); },
  host(on){ act(on?'Connect host on P2 (RS-485)':'Disconnect host', tr=>{ addEv('host', on); const t0=absT(); const B=BUILDS[D.build];
    if (B.proto==='pod19') tr('The POD19 build has no UART (#define UARTCOM is commented out): P2 pins 1/2 are the group-select inputs PE5/PE2 instead.');
    else tr(on? (B.proto==='isr'? 'The host (AMS8) sends single command bytes; uart0_rx_isr stores each one and answers 0x70/0x30 status at once.' : 'The host (XTM4 / DMS1) sends two-byte frames every ≈55 ms ('+inf+'): 0xE0|group, then a byte with bit 7 clear.') : 'No more frames: the board keeps the last group.');
    consequence(tr, t0); }); },
  hcmd(cmd){ act(`Host select byte → 0x${hex(cmd)}`, tr=>{ addEv('hcmd', cmd); const t0=absT(); const B=BUILDS[D.build];
    const a1=cmd&6, a2=a1+2;
    if (B.proto==='pod19'){ tr('Ignored: POD19 build reads the group from P2.'); return; }
    if (B.proto==='poll') tr(`process_uart(): first byte 0x${hex(cmd)} has bit 7 set → uart_rx_data1; second byte has bit 7 clear → (0x${hex(cmd)} & 0xE0) == 0xE0 → pgroup_sel = audio_select1 = 0x${hex(a1)}, audio_select2 = 0x${hex(a2)}${cmd&1?' (bit 0 = 1 is masked off: the FPGA swap input stays 0)':''}.`);
    else tr(`uart0_rx_isr(): the byte is stored; only when 11 bytes have arrived does process_uart() scan them: bit 7 set → group_sel = 0x${hex(cmd&7)}, audio_select1 = 0x${hex(a1)}.`);
    tr(`ALTERA_write() on the next pass: group_data = audio_select1 | (audio_select2 << 3) | (CD << 6) → shift_in inst46 q0–q2 = group_sel (Group ${(a1>>1)+1}), q3–q5 = group_sel2 (${a2>=8? '0b000 → Group 1; bit 3 of “8” lands on q6 sdi_lock':'Group '+((a2>>1)+1)}).`);
    tr('PROCESS_GROUP_COMPARE1/2 see the change → ERROR5 = ERROR2_5 = 0 → RESET_VECTOR and RESET_VECTOR1 bit 4 low for 255 passes: all FIFOs restart at the next field.');
    if (B.proto==='poll') tr(`The debounce counter group_sel_counter (GROUP_CONSTANT = ${B.grpConst}) only updates group_sel, which no other code reads.`);
    consequence(tr, t0); }); },
  p19g(g){ act(`POD19 SELECT → group ${g+1}`, tr=>{ addEv('p19g', g); const t0=absT();
    tr(`readgroupselect(): pod19reg[0] = PE5 | PE2<<1 = ${g} → audio_select1 = ${g*2}, audio_select2 = ${g*2+2}. The POD19 PODXX board drives these two lines (DEMUX3 P2 pins 1 and 2).`);
    consequence(tr, t0); }); },
  skew(){ act('Slip: AES1 ch 2 FIFO gets 4 extra samples', tr=>{ addEv('skew', 1); const t0=absT(); const f=curFmt(t0);
    if (f.std!==1) tr('In HD both channels of a pair travel in one 64-bit dcfifo0 word, so they cannot slip. Nothing happens (switch to an SD format).');
    else { tr(`SD403_FIFO inst21 (AES1 ch B) now holds 4 more words than inst10 (ch A): ALTERA2 & 0x7F − ALTERA1 & 0x7F = 4 > COUNT_DIFFERENCE_MAX (2) → COMPARE_AUDIO1_AUDIO2() returns 0.`);
      tr('TRANSLATE_ERROR3: release3 = 1; DEBOUNCE_ERROR3 needs 255 consecutive bad passes (≈'+SIM.fmtDur(255*PASS_T)+') before switch3 = 0. Then PROCESS_SAMPLE12_COMPARE: RESET3 = 1, ERROR3 = 0 → RESET_VECTOR bit 0 = 0 → res1_1 → reset.vhd Resout1 low → RESET1 DFF clears → FIFO pair 0/1 aclr.');
      tr('Next pass the counts read 0/0 → ERROR3 = 1; RESET1 rises again only at the next start_pulse (8 lines into the next field), so both FIFOs refill together and the pair is re-aligned.'); }
    consequence(tr, t0); }); },
  probe(){ act('Host sends the 0xE8 power-up probe', tr=>{ addEv('probe', 1); const t0=absT(); const B=BUILDS[D.build];
    if (B.proto==='poll' && B.e8) tr('process_uart(): 0xE8 → uart0_tx_data = 0xE0, init = YES. While init is YES main() jumps back to “loop:” right after UART0_transmit_counter(): the passes shrink to ≈'+SIM.fmtDur(INIT_PASS_T)+' and nothing else runs. After 7 short passes PF2 = 1 (U8 driver on) and UDR0 = 0xE0; 7 short passes later UDRE0 is already set → PF2 = 0 while the byte is still on the wire.');
    else if (B.proto==='poll') tr('v204 removed the 0xE8 handler (“Ali-Rem”): 0xE8 & 0xE0 == 0xE0, so the probe is taken as a group select (Group 1) and answered 0x00/0x02 instead of 0xE0.');
    else if (B.proto==='isr') tr('The ISR build expects 0x88 as its probe; it is only seen when process_uart() scans the buffer after 11 bytes.');
    else tr('No UART in the POD19 build.');
    consequence(tr, t0); }); },
  scn(k){ D.scn=k; D.page=0; D.ev = scenarioEvents(k); act('Timeline scenario → '+SCN[k].label, tr=> tr(scnText(k))); },
  page(i){ D.page=i; SIM.seek(0); SIM.refresh(); },
  build(b){ D.build=b; act('Firmware → '+BUILDS[b].name, tr=>{ const B=BUILDS[b];
    tr(`${B.file}: ${B.proto==='poll'?'polled UART (UART0_receive/process_uart/UART0_transmit_counter), 2-byte frames':B.proto==='isr'?'interrupt UART (uart0_rx_isr, 10-byte buffer, 0x88 probe)':'no UART; group from P2 pins (readgroupselect), SDI/AUDIO LEDs on PE1/PE0'}.`);
    tr(`GROUP_CONSTANT ${B.grpConst} · Transmit_Counter_HD ${B.txHD} · 0xE8 reply ${B.e8&&B.proto==='poll'?'yes':'no'} · init_loop ${B.initLoop?'yes (waits for 0xE8 before ALTERA_RESET)':'no'} · CD in reset vector ${B.cdReset?'yes':'no'} · CD mute ${B.cdMute?'yes':'no'} · RESET2_3 typo ${B.fix56?'fixed':'present'}.`); }); },
  reset(){ D.scn='steady'; D.page=0; D.build='v400'; D.ev=[]; D.base=BASE0(); D.log=[]; SKEY=''; SIM.seek(0); SIM.refresh(); },
};
function scenarioEvents(k){ if (k==='plug') return [{t:-1e8,k:'cable',v:false},{t:0.05,k:'cable',v:true}]; return []; }
function scnText(k){ return k==='steady'? 'The board has been running for a while: FIFOs are aligned, the host is polling. Actions land at the playhead and the firmware model reruns from there.'
  : k==='plug'? 'At 50 ms a cable is plugged into INPUT1. Follow the GS1560 lock, CD, the field-aligned FIFO release and the AUDIO flags.'
  : `Power-on: the Cyclone waits for its POR (${inf}), loads ≈2.3 Mbit from the M25P40 (≈${SIM.fmtDur(T_CFG)}, ${inf}); the ATmega128 starts after its start-up delay, runs init_devices() and ALTERA_RESET(1000).`; }

/* =====================================================================
   DRAWING: the board (real top assembly drawing DEMUX-3ISS4.PDF)
   ===================================================================== */
const BW=2199, BH=1885;            // 4.401 × 3.775 in (DEMUX-3ISS4.GKO) at ≈500 px/in
const BNC = { aes2:{y0:210,y1:580,lbl:'AES2 BNC (EL5263 U15 out A, net AES_OUT3 ← FPGA “AES2” pin 120)', k:1},
  aes1:{y0:590,y1:840,lbl:'AES1 BNC (EL5263 U15 out B, net AES_OUT4 ← FPGA “AES1” pin 119)', k:0},
  out:{y0:960,y1:1210,lbl:'OUTPUT1: re-clocked SDI loop-out (GS1528 U9 cable driver, slew from SD/~HD)'},
  in:{y0:1330,y1:1590,lbl:'INPUT1: SDI in (GS1574 U1 adaptive equaliser → GS1560A U2)'} };
const CHIPS = [
  ['U3',870,350,1540,1040,'EP1C12Q240C6 Cyclone (BOM “EP1C12240” in an EP1C6-240 footprint): Quartus project demux3, top entity pod31 (v301). SD demux (SDdemux.bdf), HD demux (group_detectorHD), 4 × AES3 encoders, VCXO phase detectors, 48-bit control shift chain.'],
  ['U11',470,1130,780,1440,'ATmega128(L) @ 4.9152 MHz (X1): demux3_v400.c. Bit-bangs the FPGA on PORTC/PORTB (ALTERA0–15), reads the GS1560 status pins, talks RS-485 on UART0, drives the yellow/red LEDs (PA3/PA2).'],
  ['U2',1250,1160,1520,1480,'GS1560A SD/HD deserialiser: 20-bit parallel out (D0–D9 → Cin, D10–D19 → Yin), PCLK → FPGA pin 28; LOCK_60 → PD2, ~RC_BYP → PE7, SMPTE → PG3, SD/~HD → PD7, 20/10-bit ← PG4. Its GSPI (SCLK/SDIN/SDOUT/CS on PD3–PD6) is never used.'],
  ['U5',990,1370,1130,1440,'GO1525: VCO for the GS1560A (VCO_VCC filtered supply)'],
  ['U1',1740,1380,1840,1470,'GS1574 adaptive cable equaliser for INPUT1; CD/MUTE1 carrier detect to the GS1560 and PE4'],
  ['U9',1700,1190,1775,1300,'GS1528 SDI cable driver for OUTPUT1 (re-clocked loop-out); slew-rate pin on SD/~HD'],
  ['U15',1800,350,1915,440,'EL5263 dual op-amp: AES_OUT4 → AES1 BNC and AES_OUT3 → AES2 BNC as 75 Ω unbalanced AES (inverting stages, R57/R67, R62/R63)'],
  ['U6',1705,840,1770,950,'ICS662-03 audio clock generator: REF_IN from FPGA pin 65, HDCLK to pin 74, SEL0–3 on pins 66/68/75/67 — none of these pins is assigned in any v301 .qsf, so the part idles'],
  ['U7',1395,180,1460,262,'M25P40 4 Mbit SPI flash in the EPCS1 footprint: the Cyclone loads its bitstream from it in Active Serial mode (H11 = AS programming header)'],
  ['X1',805,1205,915,1415,'4.9152 MHz crystal (27 pF) for the ATmega128: UBRR0L = 31 → 9600 baud exactly'],
  ['X3',770,55,990,215,'CSX750V 12.288 MHz VCXO #2 (VCO_OUT2 → FPGA pin 178 vco_2 = mclk2, group 2 / SD audio clock); charge pump UP2/DN2 through D3/D4'],
  ['X2',1000,55,1210,215,'CSX750V 12.288 MHz VCXO #1 (VCO_OUT1 → pin 160 vco_1 = mclk, group 1 HD audio clock); charge pump UP1/DN1 through D1/D2 into an RC loop filter'],
  ['U8',440,1545,555,1615,'ADM3485 U8: half-duplex RS-485 on P2 pins 1/2 — RO → CPU_RX (PE0), DI ← CPU_TX, RE/DE ← PF2 (switched by UART0_transmit_counter)'],
  ['U10',560,1545,675,1615,'ADM3485 U10: transmit-only RS-485 on P2 pins 3/4 — DI ← CPU_TX, DE ← PF3 (set once in uart0_init: always driving)'],
  ['REG2',295,315,505,545,'LM2596 switcher from +12 V (P1 via polyfuse F1, SK33 D5) → +5 V; LM1117s make VCC_1 3.3 V (Gennum), 3V (logic), 1.8V (GS1560 core) and VCC_INT (FPGA core)'],
  ['H1',1795,610,1905,815,'H1 2×4: FPGA test points TP1–TP7 (pins 100,101,98,99,86,87,85). v301 drives TP5 = mclk2, TP6 = HD vertical, TP7 = sd_hd'],
  ['H11',1275,65,1585,205,'H11 2×5: Altera Active Serial header (DCLK, CONF_DONE, nCONFIG, nCE, DATA, nCS, ASDI) for programming the M25P40 with a ByteBlaster/USB-Blaster'],
  ['JTAG1',245,1445,345,1725,'JTAG1 2×5: ATmega128 JTAG (AVR JTAGICE)'],
  ['JTAG2',1765,65,2045,205,'JTAG2 2×5: FPGA JTAG (not fitted, “DNI-H2X5”)'],
  ['P1',8,295,165,475,'P1 PAN300: +12 V and ground from the host'],
  ['P4',25,8,285,165,'P4 PAN500: OUT_P4_1–4 (FPGA 187/186/185/200, 30 Ω + 1 kΩ): AES1, AES2 (group 1) and AES3, AES4 (group 2) to the host — “Use P4 for XTM4 and AMS4” (demux3_main.c v100)'],
  ['P3',405,8,665,165,'P3 PAN500: OUT_P3_1–4 (FPGA 184/183/182/181): the swap()-ed pair of group 1 plus group 2 — “Use P3 for AMS81 and AMS82”'],
  ['P2',435,1655,695,1815,'P2 PAN500: RS-485 host link (U8 on pins 1/2, U10 on pins 3/4). In the POD19 build pins 1–4 are group LSB/MSB in and SDI/AUDIO lock out.'],
];
function boardSVG(t, opts){
  opts=opts||{}; const w=world(t), L=ledsAt(t), ms=mcuState(t), p=passAt(t), B=BUILDS[D.build];
  const vid=vidOK(t), f=VF[w.fmt];
  const led=(y,on,col,lbl)=>`<g><circle cx="-52" cy="${y}" r="34" fill="${on?col:'#30352d'}" stroke="#111" stroke-width="5" ${on?'filter="url(#d3glow)"':''}/><rect x="-20" y="${y-22}" width="40" height="44" fill="#bdb9a8"/><title>${lbl}: ${on?'ON':'off'}</title></g>`;
  const bnc=(key)=>{ const b=BNC[key], y=(b.y0+b.y1)/2; let act=false, plugged=true, cls='d3out';
    if (key==='in'){ plugged=w.cable; act=vid; cls='d3in'; } else if (key==='out') act=vid; else act=outState(b.k,t).on;
    return `<g class="${cls}" data-k="${key}" style="cursor:pointer"><rect x="2150" y="${b.y0}" width="330" height="${b.y1-b.y0}" fill="transparent"/>
      <rect x="2165" y="${y-80}" width="120" height="160" rx="8" fill="#c9a63d" stroke="#6b5414" stroke-width="4"/><rect x="2285" y="${y-52}" width="60" height="104" fill="#d8bd62" stroke="#6b5414" stroke-width="4"/><circle cx="2315" cy="${y}" r="20" fill="#7a5f12"/>
      ${plugged? `<rect x="2345" y="${y-42}" width="80" height="84" rx="10" fill="${key==='in'?'#2f6fb4':'#3a3d40'}"/><rect x="2423" y="${y-17}" width="60" height="34" fill="${key==='in'?'#2f6fb4':'#3a3d40'}"/>`:''}
      <circle cx="2380" cy="${y-68}" r="13" fill="${act?(key==='in'||key==='out'?'var(--accent2)':'var(--accent)'):'#666'}"/>
      <text x="2470" y="${y-60}" font-size="26" text-anchor="end" fill="var(--ink2)">${key==='in'?'INPUT1':key==='out'?'OUTPUT1':key.toUpperCase()}</text>
      <title>${b.lbl}${key==='in'? (plugged? ' — cable in ('+f.name+'). Click to unplug.' : ' — empty. Click to plug in.') : key==='out'? (act?' — running':' — no lock') : ' — '+(act?'AES3 present (click to scope)':'no carrier: '+outState(b.k,t).why)}</title></g>`; };
  const chips = CHIPS.map(([id,x0,y0,x1,y1,d])=>`<rect class="d3chip" data-c="${id}" x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="${D.selChip===id?'rgba(255,220,80,.28)':'transparent'}" stroke="${D.selChip===id?'#ffd84a':'none'}" stroke-width="6" style="cursor:pointer"><title>${id}: ${d}</title></rect>`).join('');
  const pins=(x0,on,lbl)=>[0,1,2,3].map(i=>`<circle cx="${x0+30+i*58}" cy="182" r="14" fill="${on[i]?'var(--accent)':'#444'}"><title>${lbl} pin ${i+1}: ${on[i]?'AES3 running':'idle'}</title></circle>`).join('');
  const o=[0,1,2,3].map(k=>outState(k,t).on);
  const cfg=inCfg(t) || (SCN[D.scn].boot && t<T_POR);
  const fp=lastWrite(t);
  const fpgaTxt = cfg? 'CONFIGURING' : !fp? '—' : (fp.F.sdPin&0x80? 'SD path' : 'HD path')+(vid?' · '+f.name.replace(/^(SD|HD) /,''):' · no video');
  const st = stepAt(p,t);
  const mcuTxt = ms==='off'? 'power-up' : ms==='init_loop'? 'init_loop: waiting for 0xE8' : ms==='boot'? 'init / ALTERA_RESET' : ms==='init'? 'init = YES: UART only' : 'step '+st+': '+STEPS[st][0].split(' ')[0];
  const hostOn = w.host && B.proto!=='pod19';
  return `<svg viewBox="-130 -40 2640 1990" role="img" aria-label="DEMUX-3 issue 4 board, top assembly drawing" style="width:100%;max-width:${opts.max||900}px;display:block;margin:auto">
    <defs><filter id="d3glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect x="0" y="0" width="${BW}" height="${BH}" rx="10" fill="#1d5a36" stroke="#0e2e1b" stroke-width="5"/>
    <image href="${ASSET}demux3-top-assy.png" x="0" y="0" width="${BW}" height="${BH}"/>
    <rect x="960" y="540" width="130" height="100" fill="none" stroke="#ffffff88" stroke-dasharray="10 8" stroke-width="3"><title>U4 PLL1705 sits on the bottom side and is DNI on issue 4 (BOM “DNI PLL1705”); v105: “In SD mode use external PLL instead of PLL1705”</title></rect>
    ${chips}
    <rect x="985" y="900" width="440" height="56" rx="8" fill="rgba(0,0,0,.6)"/><text x="1205" y="937" text-anchor="middle" font-size="30" fill="${cfg?'#ffb43a':vid?'#9fffb0':'#ccc'}" font-family="monospace">${fpgaTxt}</text>
    <rect x="380" y="1060" width="500" height="54" rx="8" fill="rgba(0,0,0,.6)"/><text x="630" y="1096" text-anchor="middle" font-size="26" fill="${ms==='init_loop'?'#ff7a6e':'#9fd8ff'}" font-family="monospace">${mcuTxt}</text>
    ${pins(25,[o[0],o[1],o[2],o[3]],'P4')} ${pins(405,[o[0],o[1],o[2],o[3]],'P3')}
    ${led(1515, L.y, '#ffd23a', 'LED3 YEL (PA3, LED_Y_mask): SDI valid')}
    ${led(1655, L.r, '#ff4a3a', 'LED4 RED (PA2, LED_R_mask): SDI not valid')}
    ${['aes2','aes1','out','in'].map(bnc).join('')}
    <g class="d3host" style="cursor:pointer"><rect x="430" y="1650" width="270" height="170" fill="${hostOn?'rgba(90,169,230,.30)':'transparent'}" stroke="${hostOn?'#5aa9e6':'none'}" stroke-width="6"/>${hostOn?`<path d="M565 1820 V1930" stroke="#5aa9e6" stroke-width="14"/>`:''}<title>P2 RS-485 host link — ${B.proto==='pod19'?'POD19 build: group-select pins':hostOn?'host connected (click to disconnect)':'no host (click to connect)'}</title></g>
    <text x="1100" y="1940" text-anchor="middle" font-size="28" fill="var(--ink2)">DEMUX-3 issue 4 · top assembly from DEMUX-3ISS4.PDF (Altium, Jul 2009|42) · 4.401 × 3.775 in (DEMUX-3ISS4.GKO) · mask/silk colours ${'assumed'}</text>
  </svg>`;
}
function bindBoard(root){
  root.querySelectorAll('.d3in').forEach(g=> g.addEventListener('click', ()=>A.cable()));
  root.querySelectorAll('.d3out').forEach(g=> g.addEventListener('click', ()=>{ const k=g.dataset.k; if (k==='aes1') D.scope=0; else if (k==='aes2') D.scope=1; SIM.refresh(); }));
  root.querySelectorAll('.d3chip').forEach(g=> g.addEventListener('click', ()=>{ D.selChip = D.selChip===g.dataset.c? null : g.dataset.c; SIM.refresh(); }));
  const h=root.querySelector('.d3host'); if (h) h.addEventListener('click', ()=>{ if (BUILDS[D.build].proto!=='pod19') A.host(!world(absT()).host); });
}
/* AMS8-1 rear, DEMUX-3 section: CorelDRAW silk + panel-view outlines; connectors sit on the drawn BNC / D-sub outlines */
function rearSVG(t){
  const w=world(t), oc=k=>{ const o=outState(k,t); return o.on && o.mode==='audio'; };
  const bnc=(x,cls,k,tip,live,plug,sel)=>`<g class="${cls}" ${k?`data-k="${k}"`:''} style="cursor:pointer"><title>${tip}</title><circle cx="${x}" cy="93" r="56" fill="transparent"/>
      <circle cx="${x}" cy="93" r="31" fill="#a68a3c" stroke="#5e4d1c" stroke-width="3"/><circle cx="${x}" cy="93" r="20" fill="#d8c27a"/><circle cx="${x}" cy="93" r="7" fill="#7a5f12"/>
      ${plug?`<rect x="${x-20}" y="70" width="40" height="46" rx="7" fill="#3a74b8"/><rect x="${x-13}" y="112" width="26" height="60" fill="#2b5f9e"/>`:''}
      <circle cx="${x+48}" cy="40" r="10" fill="${live?'var(--accent)':'#555'}" stroke="#111"/>${sel?`<circle cx="${x}" cy="93" r="46" fill="none" stroke="var(--accent)" stroke-width="5" stroke-dasharray="10 8"/>`:''}</g>`;
  const tipBox=(x,y,wd,ht,tip)=>`<rect x="${x-wd/2}" y="${y-ht/2}" width="${wd}" height="${ht}" fill="transparent"><title>${tip}</title></rect>`;
  return `<svg viewBox="880 0 1080 330" role="img" aria-label="AMS8-1 rear panel, DEMUX-3 section (real silkscreen)" style="width:100%;max-width:640px;display:block;border-radius:6px">
    <rect x="880" width="1080" height="330" fill="#202326"/>
    <image href="${ASSET}demux3-rear.svg" width="3448" height="330"/>
    ${tipBox(1025,165,100,170,'DOLBY E METADATA (DE-9): host-unit port; not wired to the DEMUX-3 in the files read (inferred)')}
    ${tipBox(1155,165,100,170,'SERIAL COMM (DE-9): the AMS8-1 serial port; the DEMUX-3 talks to the AMS8 on its own P2 inside the unit (inferred)')}
    ${tipBox(1618,243,370,95,'AUX (DB-25): AMS8-1 auxiliary I/O; which DEMUX-3 pins reach it (P3 group-2 pairs?) is not in the files read (inferred)')}
    ${bnc(1405,'d3in','',`SDI IN = DEMUX-3 INPUT1 (GS1574 equaliser) — click to ${w.cable?'unplug':'plug in'} SDI`,w.cable,w.cable,false)}
    ${bnc(1555,'','', 'SDI OUT = OUTPUT1, re-clocked loop-out (GS1528)',w.cable,false,false)}
    ${bnc(1708,'d3out','aes1','AES1 = FPGA AES output 1 (group 1 pair) — click to scope',oc(0),false,D.scope===0)}
    ${bnc(1858,'d3out','aes2','AES2 = FPGA AES output 2 — click to scope',oc(1),false,D.scope===1)}
  </svg>`;
}
function setBoard(el, html){ if (el._h===html) return; el._h=html; el.innerHTML=html; bindBoard(el); }
function chipInfo(){ const c=CHIPS.find(x=>x[0]===D.selChip); return c? `<b>${c[0]}</b>: ${c[5]}` : '<span class="muted">Click a part for what it does. Click INPUT1 to plug/unplug SDI, AES1/AES2 to scope that output, P2 to connect the host.</span>'; }
function controlsHTML(){
  const w=world(absT()), B=BUILDS[D.build];
  return `<div class="small" style="display:grid;grid-template-columns:auto 1fr;gap:4px 10px;align-items:center;margin-top:8px">
    <span class="muted">Timeline</span><span><select id="d3scn">${Object.keys(SCN).map(k=>`<option value="${k}" ${D.scn===k?'selected':''}>${SCN[k].label}</option>`).join('')}</select>
      <select id="d3page">${SCN[D.scn].pages.map((p,i)=>`<option value="${i}" ${D.page===i?'selected':''}>${p[1]}</option>`).join('')}</select></span>
    <span class="muted">ATmega firmware</span><span><select id="d3build">${Object.keys(BUILDS).map(k=>`<option value="${k}" ${D.build===k?'selected':''}>${BUILDS[k].name}</option>`).join('')}</select> <span class="muted">FPGA v301</span></span>
    <span class="muted">SDI source</span><span><select id="d3fmt">${Object.keys(VF).map(k=>`<option value="${k}" ${w.fmt===k?'selected':''}>${VF[k].name}</option>`).join('')}</select>
      ${[0,1,2,3].map(g=>`<label style="margin-right:3px"><input type="checkbox" data-gm="${g}" ${(w.gm>>g)&1?'checked':''}>G${g+1}</label>`).join('')} <button id="d3cab">${w.cable?'unplug':'plug in'}</button></span>
    <span class="muted">Host (P2)</span><span>${B.proto==='pod19'? `POD19 SELECT <select id="d3p19">${[0,1,2,3].map(g=>`<option value="${g}" ${w.p19g===g?'selected':''}>Group ${g+1}</option>`).join('')}</select>`
      : `<button id="d3host">${w.host?'disconnect':'connect'}</button> select <select id="d3cmd">${HCMD.map(([v,l])=>`<option value="${v}" ${w.hcmd===v?'selected':''}>${l}</option>`).join('')}</select> <button id="d3probe">send 0xE8 probe</button>`}</span>
    <span class="muted">Fault</span><span><button id="d3skew">slip AES1 ch 2 by 4 samples (SD)</button> <button id="d3rst">Reset everything</button></span></div>
    <div class="small muted" style="margin-top:4px">Keys: C cable · H host · 1–4 group · S slip · P probe. Actions happen at the playhead; the firmware model reruns from there.</div>`;
}
function bindControls(m){
  const q=s=>m.querySelector(s);
  if (q('#d3scn')) q('#d3scn').onchange=e=>A.scn(e.target.value);
  if (q('#d3page')) q('#d3page').onchange=e=>A.page(+e.target.value);
  if (q('#d3build')) q('#d3build').onchange=e=>A.build(e.target.value);
  if (q('#d3fmt')) q('#d3fmt').onchange=e=>A.fmt(e.target.value);
  m.querySelectorAll('[data-gm]').forEach(cb=> cb.onchange=()=>{ let mask=0; m.querySelectorAll('[data-gm]').forEach(x=>{ if (x.checked) mask|=1<<(+x.dataset.gm); }); A.groups(mask); });
  if (q('#d3cab')) q('#d3cab').onclick=()=>A.cable();
  if (q('#d3host')) q('#d3host').onclick=()=>A.host(!world(absT()).host);
  if (q('#d3cmd')) q('#d3cmd').onchange=e=>A.hcmd(+e.target.value);
  if (q('#d3p19')) q('#d3p19').onchange=e=>A.p19g(+e.target.value);
  if (q('#d3probe')) q('#d3probe').onclick=()=>A.probe();
  if (q('#d3skew')) q('#d3skew').onclick=()=>A.skew();
  if (q('#d3rst')) q('#d3rst').onclick=()=>A.reset();
}
window.__demux3Active = false;
document.addEventListener('keydown', e=>{
  if (!window.__demux3Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase(), B=BUILDS[D.build];
  if (k==='c'){ A.cable(); e.preventDefault(); }
  else if (k==='h' && B.proto!=='pod19'){ A.host(!world(absT()).host); e.preventDefault(); }
  else if (/^[1-4]$/.test(k)){ if (B.proto==='pod19') A.p19g(+k-1); else A.hcmd(0xE0|((+k-1)*2)); e.preventDefault(); }
  else if (k==='s'){ A.skew(); e.preventDefault(); }
  else if (k==='p'){ A.probe(); e.preventDefault(); }
});
/* =====================================================================
   TIMELINE LANES
   ===================================================================== */
function txtFit(c, s, x, y, maxW){ if (maxW < 18) return; let t=s; while (t.length>2 && c.measureText(t).width > maxW-4) t=t.slice(0,-1); if (t.length<s.length) t=t.slice(0,-1)+'…'; c.fillText(t, x, y); }
function passRange(a, b){ const s=sched(); let i=Math.max(0,bs(s.passes,a)); const out=[]; for (; i<s.passes.length && s.passes[i].t0<=b; i++) out.push(s.passes[i]); return out; }
function levelRows(c, X, P0, a, b, y, rows){ // rows: [{get, col, h, lbl}] drawn from pass snapshots
  const ps=passRange(a,b); const css=SIM.css;
  let yy=y;
  for (const r of rows){
    let run=null, v0=null;
    const flush=(tEnd)=>{ if (run!==null && v0){ c.fillStyle=css(typeof v0==='string'? v0 : r.col); c.fillRect(X(run-P0), yy+1, Math.max(1, X(tEnd-P0)-X(run-P0)), r.h-2); } };
    for (let i=0;i<ps.length;i++){ const p=ps[i]; const v=r.get(p); const vv = v===true? r.col : v;
      if (vv!==v0){ flush(p.t0); run=p.t0; v0=vv; } }
    flush(Math.min(b, ps.length? (ps[ps.length-1].t1||b) : b));
    c.fillStyle=css('--ink2'); c.font='9px '+css('--mono'); c.fillText(r.lbl, X(a-P0)+3, yy+r.h-2);
    yy+=r.h; }
}
function graph(c, X, P0, a, b, y, h, get, max, col){
  const ps=passRange(a,b); if (!ps.length) return; c.strokeStyle=SIM.css(col); c.lineWidth=1.3; c.beginPath();
  ps.forEach((p,i)=>{ const v=get(p); if (v===null) return; const yy=y+h-2-(h-4)*clamp(v/max,0,1); if (!i) c.moveTo(X(p.t0-P0),yy); else c.lineTo(X(p.t0-P0),yy); c.lineTo(X((p.t1||p.t0)-P0),yy); }); c.stroke(); }
function lanes(){
  const s=sched(), P0=page0(), css=n=>SIM.css(n), ls=[];
  ls.push({label:'SDI in: frames / fields', h:26, draw(c,X,t0,t1,y,h){
    const a=P0+t0, b=P0+t1, w=world(P0+SIM.t); if (!w.cable){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('INPUT1: no cable', X(t0)+6, y+h/2+4); return; }
    const f=VF[w.fmt], Tf=1/f.fr; const n0=Math.floor(a/Tf), n1=Math.ceil(b/Tf);
    if (n1-n0>400){ SIM.pulses(c,X,t0,t1,y,h,Tf,-P0%Tf,Tf*0.02,css('--accent2'),'frames'); return; }
    c.font='10px '+css('--mono');
    for (let n=n0;n<=n1;n++){ const ta=n*Tf-P0, x=X(ta); c.fillStyle=css('--accent2'); c.fillRect(x,y+3,2,h-6);
      if (f.il){ c.globalAlpha=.5; c.fillRect(X(ta+Tf/2), y+8, 1.5, h-16); c.globalAlpha=1; }
      if (X(ta+Tf)-x>70){ c.fillStyle=css('--ink'); c.fillText(`frame ${n}${f.il?' F1':''}`, x+4, y+12); }
      if (f.il && X(ta+Tf)-x>140){ c.fillStyle=css('--ink2'); c.fillText('F2', X(ta+Tf/2)+4, y+12); } } }});
  ls.push({label:'SDI lines · HANC audio packets', h:34, draw(c,X,t0,t1,y,h){
    const a=P0+t0, b=P0+t1, w=world(P0+SIM.t); if (!w.cable) return;
    const f=VF[w.fmt], Tl=lineT(f), wt=1/f.clk, n0=Math.floor(a/Tl), n1=Math.ceil(b/Tl), pxLine=X(t0+Tl)-X(t0);
    if (pxLine<3){ SIM.pulses(c,X,t0,t1,y,h,Tl,-P0%Tl,Tl*0.12,css('--ink2'),`${f.lines} lines/frame · ${f.spl} words/line · ${f.std===1?'one packet per group per line':'one packet per sample per group'}`); return; }
    const p=lastWrite(P0+SIM.t), g1=p? (p.F.gd&7)>>1 : 0, g2=p? ((p.F.gd>>3)&7)>>1 : 1;
    for (let n=n0;n<=n1;n++){ const ta=n*Tl-P0, xe=X(ta), xh=X(ta+f.hdr*wt), xs=X(ta+(f.spl-f.act-4)*wt), xa=X(ta+(f.spl-f.act)*wt), xend=X(ta+Tl);
      c.fillStyle=css('--bad'); c.fillRect(xe,y+4,Math.max(1,xh-xe),h-8); c.fillStyle=css('--chip'); c.fillRect(xh,y+4,xs-xh,h-8);
      c.fillStyle=css('--warn'); c.fillRect(xs,y+4,Math.max(1,xa-xs),h-8); c.fillStyle=css('--grid'); c.fillRect(xa,y+4,xend-xa,h-8);
      if (pxLine>30) for (const pk of linePackets(f,n,w.gm)){ c.fillStyle=css(GCOL[pk.g]); c.globalAlpha=(pk.g===g1||pk.g===g2)?1:.35; c.fillRect(X(ta+pk.w0*wt), y+7, Math.max(1,X(ta+pk.w1*wt)-X(ta+pk.w0*wt)-.5), h-14); c.globalAlpha=1; }
      if (pxLine>160){ c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); txtFit(c, `line ${(n%f.lines)+1}`, xa+4, y+h/2+4, xend-xa); } } }});
  ls.push({label:'Embedded audio samples (48 kHz)', h:18, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/48000,-P0%(1/48000),2e-6,css('--accent'),'48 000 samples/s per channel'); }});
  ls.push({label:'GS1560A lock · SD/~HD (PD7)', h:22, draw(c,X,t0,t1,y,h){ levelRows(c,X,P0,P0+t0,P0+t1,y,[{h:22, col:'--accent2', lbl:'', get:p=> p.s.rc_byp&&p.s.lock60&&p.s.smpte ? (p.s.sd_hd?'--accent2':'--accent') : false}]);
    const w=world(P0+SIM.t); c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText(`blue = locked SD (SD/~HD = 1) · green = locked HD · ${VF[w.fmt].name}`, X(t0)+4, y+14); }});
  ls.push({label:'FPGA: nCONFIG · AS load · user mode', h:20, draw(c,X,t0,t1,y,h){
    s.ncfg.forEach(n=>{ c.fillStyle=css('--bad'); c.fillRect(X(n.t0-P0), y+2, Math.max(2,X(n.t1-P0)-X(n.t0-P0)), h-4); });
    s.cfg.forEach(cf=>{ if (cf.t1<-1e8) return; c.fillStyle=css('--warn'); c.fillRect(X(cf.t0-P0), y+4, Math.max(1,X(cf.t1-P0)-X(cf.t0-P0)), h-8); c.fillStyle=css('--ink'); c.font='10px sans-serif'; if (X(cf.t1-P0)-X(cf.t0-P0)>120) c.fillText(cf.restart?'reload after ALTERA_RESET (nCONFIG)':'AS load ≈2.3 Mbit from M25P40', X(cf.t0-P0)+4, y+14); });
    if (SCN[D.scn].boot){ c.fillStyle=css('--grid'); c.fillRect(X(0-P0), y+6, Math.max(1,X(T_POR-P0)-X(0-P0)), h-12); } }});
  ls.push({label:'ATmega128 main loop', h:30, draw(c,X,t0,t1,y,h){
    const ps=passRange(P0+t0,P0+t1); const px=(X(t1)-X(t0))/Math.max(1,ps.length);
    if (s.waitE8){ const a=s.waitE8.t0, b=s.waitE8.t1===null? s.END : s.waitE8.t1; c.fillStyle=css('--bad'); c.globalAlpha=.25; c.fillRect(X(a-P0),y+2,X(b-P0)-X(a-P0),h-4); c.globalAlpha=1; }
    ps.forEach((p,i)=>{ const x0=X(p.t0-P0), x1=X((p.t1||p.t0)-P0);
      if (p.init){ c.fillStyle=css('--warn'); c.fillRect(x0,y+8,Math.max(1,x1-x0-.5),h-16); return; }
      if (px<3){ if (i%2===0){ c.fillStyle=css('--accent2'); c.globalAlpha=.55; c.fillRect(x0,y+4,Math.max(1,x1-x0),h-8); c.globalAlpha=1; } return; }
      for (let k=0;k<STEPS.length;k++){ const a=X(p.t0+STEP_OFF[k]*CYC-P0), b=X(p.t0+STEP_OFF[k+1]*CYC-P0); c.fillStyle=css(k===4?'--accent2':k===5?'--accent':k%2?'--grid':'--chip'); c.fillRect(a,y+3,Math.max(.5,b-a-.3),h-6);
        if (b-a>90){ c.fillStyle=css('--ink'); c.font='9.5px '+css('--mono'); txtFit(c, STEPS[k][0], a+2, y+h/2+3, b-a); } }
      if (px>40 && px<500){ c.fillStyle=css('--ink2'); c.font='9px '+css('--mono'); c.fillText('#'+p.n, x0+2, y+10); } });
    c.fillStyle=css('--ink2'); c.font='10px sans-serif'; if (px<3) c.fillText(`${ps.filter(p=>!p.init).length} passes · ${SIM.fmtDur(PASS_T)} each (${PASS_CYC} cycles, ${inf.replace(/<[^>]+>/g,'')} for the non-I/O steps)`, X(t0)+4, y+h-4); }});
  ls.push({label:'ALTERA bus: write 48 b · read 3×48 b', h:26, draw(c,X,t0,t1,y,h){
    const a=P0+t0, b=P0+t1; const wr=s.wr.slice(Math.max(0,bs(s.wr,a)), Math.max(0,bs(s.wr,b))+1), rd=s.rd.slice(Math.max(0,bs(s.rd,a)), Math.max(0,bs(s.rd,b))+1);
    const draw1=(x,col,bitc,n,yo)=>{ const x0=X(x.t0-P0), x1=X(x.t1-P0); c.fillStyle=css(col); c.fillRect(x0,y+yo,Math.max(1,x1-x0),9);
      if (x1-x0>n*4){ c.fillStyle=css('--ink'); for (let i=0;i<n;i++){ const xx=X(x.t0+(i*bitc+ (bitc>14?20:12))*CYC-P0); c.fillRect(xx,y+yo-2,1,13); } } };
    wr.forEach(x=>draw1(x,'--accent2',WR_BIT+(10/8),48,3)); rd.forEach(x=>draw1(x, x.cfg?'--warn':'--accent',RD_BIT+1.5,144,14));
    const pw=wr.length? X(wr[0].t1-P0)-X(wr[0].t0-P0) : 0; c.fillStyle=css('--ink2'); c.font='10px sans-serif';
    if (pw<30) c.fillText(`blue = ALTERA_write (${SIM.fmtDur(WR_CYC*CYC)}) · green = ALTERA_read (${SIM.fmtDur(RD_CYC*CYC)}) · ticks = ALTERA5 clock`, X(t0)+4, y+h-1); }});
  ls.push({label:'UART 9600: host → board · replies (PF2)', h:30, draw(c,X,t0,t1,y,h){
    const a=P0+t0, b=P0+t1; c.font='10px '+css('--mono');
    s.uart.forEach(u=>{ if (u.t1<a || u.t0>b) return; const x0=X(u.t0-P0), x1=X(u.t1-P0), yy = u.dir==='h'? y+2 : y+16;
      c.fillStyle=css(u.dir==='h'?'--accent2':'--warn'); c.fillRect(x0,yy,Math.max(1.5,x1-x0),12);
      if (x1-x0>34){ c.fillStyle='#fff'; c.fillText('0x'+hex(u.b), x0+2, yy+10); }
      if (u.dir==='d' && u.pf2Off!==null){ const xo=X(u.pf2Off-P0); c.strokeStyle=css(u.pf2Off<u.t1?'--bad':'--ink2'); c.lineWidth=2; c.beginPath(); c.moveTo(xo,yy-2); c.lineTo(xo,yy+14); c.stroke(); if (u.pf2Off<u.t1 && x1-x0>60){ c.fillStyle=css('--bad'); c.fillText('PF2→0: U8 cut', xo+3, yy-1); } } });
    c.fillStyle=css('--ink2'); c.font='9px sans-serif'; c.fillText('upper: host · lower: DEMUX-3 reply · line = PF2 back to RX (U8 driver off)', X(t1)-330, y+h-1); }});
  ls.push({label:'Timer0 overflow ISR', h:14, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,TICK0,((Math.ceil(s.T0/TICK0)*TICK0)-P0)%TICK0,ISR0_CYC*CYC,css('--ink2'),'timer0_ovf_isr: TCNT0 = 0xE9 every 4.79 ms (does nothing else)'); }});
  ls.push({label:'CD · AUDIO1–4 (MCU flags)', h:40, draw(c,X,t0,t1,y,h){ levelRows(c,X,P0,P0+t0,P0+t1,y,[
    {h:8, col:'--accent2', lbl:'CD', get:p=>!!p.s.CD}, {h:8, col:'--accent', lbl:'AUDIO1', get:p=>!!p.s.AUDIO[0]}, {h:8, col:'--accent', lbl:'AUDIO2', get:p=>!!p.s.AUDIO[1]},
    {h:8, col:'--accent2', lbl:'AUDIO3', get:p=>!!p.s.AUDIO[2]}, {h:8, col:'--accent2', lbl:'AUDIO4', get:p=>!!p.s.AUDIO[3]}]); }});
  ls.push({label:'RESET_VECTOR (red = reset)', h:48, draw(c,X,t0,t1,y,h){ levelRows(c,X,P0,P0+t0,P0+t1,y,[
    {h:8, col:'--bad', lbl:'bit0 AES1 pair (res1_1)', get:p=>!(p.s.RV&1)}, {h:8, col:'--bad', lbl:'bit1 AES2 pair', get:p=>!(p.s.RV&2)}, {h:8, col:'--bad', lbl:'bit2 G2 AES3', get:p=>!(p.s.RV&4)},
    {h:8, col:'--bad', lbl:'bit3 G2 AES4', get:p=>!(p.s.RV&8)}, {h:8, col:'--bad', lbl:'bit4 res1_g (global)', get:p=>!(p.s.RV&16)}, {h:8, col:'--bad', lbl:'RV1 bit4 res2_g', get:p=>!(p.s.RV1&16)}]); }});
  ls.push({label:'Debounce counters', h:30, draw(c,X,t0,t1,y,h){ c.fillStyle=css('--lane');
    graph(c,X,P0,P0+t0,P0+t1,y,h,p=>p.s.swc?p.s.swc[3]:null,255,'--warn'); graph(c,X,P0,P0+t0,P0+t1,y,h,p=>p.s.reset_counter,255,'--bad'); graph(c,X,P0,P0+t0,P0+t1,y,h,p=>p.s.switch1_counter,255,'--ink2');
    c.fillStyle=css('--ink2'); c.font='9px sans-serif'; c.fillText('orange switch3_counter → 255 · red reset_counter 255 → 0 · grey switch1_counter (CD, unused)', X(t0)+4, y+9); }});
  ls.push({label:'SD403_FIFO fill AES1 A/B (ALTERA1/2 & 0x7F)', h:30, draw(c,X,t0,t1,y,h){
    graph(c,X,P0,P0+t0,P0+t1,y,h,p=>p.s.ALT?p.s.ALT[0]&0x7F:null,127,'--accent'); graph(c,X,P0,P0+t0,P0+t1,y,h,p=>p.s.ALT?p.s.ALT[1]&0x7F:null,127,'--warn');
    c.fillStyle=css('--ink2'); c.font='9px sans-serif'; c.fillText('green ch A · orange ch B · 0x7F = 127 while the FPGA is unconfigured', X(t0)+4, y+9); }});
  ls.push({label:'AES out: AES1 / AES2 BNC', h:28, draw(c,X,t0,t1,y,h){
    const span=t1-t0, N=Math.min(600, Math.max(40, Math.round((X(t1)-X(t0))/2)));
    [0,1].forEach(k=>{ for (let i=0;i<N;i++){ const ta=t0+span*i/N, o=outState(k,P0+ta); c.fillStyle=css(!o.on?'--grid':o.mode==='audio'?'--accent':o.mode==='zero'?'--accent2':'--warn'); c.fillRect(X(ta), y+2+k*13, (X(t1)-X(t0))/N+.6, 11); } });
    const B=192/48000; if (X(t0+B)-X(t0)>6){ const k0=Math.floor((P0+t0)/B), k1=Math.ceil((P0+t1)/B); c.fillStyle=css('--ink'); for (let k=k0;k<=k1;k++) c.fillRect(X(k*B-P0), y, 1, h); }
    c.fillStyle=css('--ink2'); c.font='9px sans-serif'; c.fillText('green audio · blue zeros (carrier on) · orange stale · grey no carrier · ticks = Z preamble (192 frames)', X(t0)+4, y+h-1); }});
  ls.push({label:'LEDs: YEL (PA3) · RED (PA2)', h:18, draw(c,X,t0,t1,y,h){ levelRows(c,X,P0,P0+t0,P0+t1,y,[{h:9, col:'--warn', lbl:'YEL', get:p=>!!p.s.ledY && mcuState(p.t0)!=='init_loop'}, {h:9, col:'--bad', lbl:'RED', get:p=>!!p.s.ledR && mcuState(p.t0)!=='init_loop'}]); }});
  return ls;
}

/* ---------------- scope + line views ---------------- */
function drawScope(cv, el, t){
  const k=D.scope, Fm=aesFrame(t,k), o=outState(k,t); const {c,w}=SIM.canvas(cv,140); const ink=SIM.css('--ink'), ink2=SIM.css('--ink2');
  if (!o.on){ c.fillStyle=ink2; c.font='13px sans-serif'; c.fillText(`AES${k+1} BNC is flat: ${o.why.replace(/<[^>]+>/g,'')}`.slice(0,150), 10, 60); el.innerHTML=''; return; }
  const la=biphase(Fm.sub[0].pre, Fm.sub[0].bits, 0), lb=biphase('Y', Fm.sub[1].bits, la[la.length-1]); const lv=la.concat(lb), cw=(w-20)/lv.length;
  const zones=[[0,8,'--warn','pre'],[8,16,'--ink2','aux'],[16,56,'--accent','audio'],[56,64,'--accent2','VUCP']];
  [0,64].forEach(off=> zones.forEach(([a,b,col,l])=>{ c.fillStyle=SIM.css(col); c.globalAlpha=.12; c.fillRect(10+(off+a)*cw,18,(b-a)*cw,70); c.globalAlpha=1; c.fillStyle=ink2; c.font='10px sans-serif'; if ((b-a)*cw>24) c.fillText(l, 12+(off+a)*cw, 100); }));
  c.strokeStyle=ink; c.lineWidth=1.5; c.beginPath(); lv.forEach((v,i)=>{ const x=10+i*cw, y=v?28:78; if (!i) c.moveTo(x,y); else c.lineTo(x,y); c.lineTo(x+cw,y); }); c.stroke();
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`Subframe A (${Fm.sub[0].pre})`,12,13); c.fillText('Subframe B (Y)',12+64*cw,13);
  c.fillText(`frame ${Fm.n.toLocaleString()} · ${Fm.fr}/191 · bit cell ${SIM.fmtDur(1/48000/128)} · i2sx4_aes from mclk${k<2?'':'2'} (VCXO 12.288 MHz)`,10,124);
  el.innerHTML = Fm.sub.map((sb,i)=>`${i?'B':'A'} = ${o.mode==='audio'? `G${o.g+1} ch${o.ch[i]} (${chFreq(o.ch[i])} Hz tone, ${o.bits}-bit)` : o.mode} ${sb.sample.toFixed(5)} → 0x${hex(sb.raw,6)} · V=0 U=0 C=${sb.c} P=${sb.bits[31]}`).join('<br>')
    + `<br><span class="muted">${o.mode==='audio'? `Latency through the FPGA ≈ ${o.lat} samples (${SIM.fmtDur(o.lat/48000)}): reading starts when wrusedw bit ${o.lat===64?6:4} sets.` : o.why} Channel status: only the professional bit (frame 0) and three hand-set CRC bits (tcb_int2) are 1; V/U inputs are tied to GND.</span>`;
}
function drawLine(cv, el, t){
  const w=world(t); const {c,w:W}=SIM.canvas(cv,120); const ink=SIM.css('--ink'), ink2=SIM.css('--ink2');
  if (!w.cable){ c.fillStyle=ink2; c.font='13px sans-serif'; c.fillText('No cable on INPUT1.',10,50); el.innerHTML=''; return; }
  const f=VF[w.fmt], Tl=lineT(f), n=Math.floor(t/Tl), ln=(n%f.lines)+1, wt=1/f.clk, pos=Math.floor((t-n*Tl)/wt), hEnd=f.spl-f.act-4;
  const sx=x=>10+x/f.spl*(W-20);
  const blk=(a,b,col,l,y,hh)=>{ c.fillStyle=SIM.css(col); c.fillRect(sx(a),y,Math.max(1,sx(b)-sx(a)),hh); if (sx(b)-sx(a)>34 && l){ c.fillStyle=ink; c.font='10px sans-serif'; c.fillText(l,sx(a)+3,y+hh-4); } };
  blk(0,f.hdr,'--bad',f.std===1?'EAV':'EAV LN CRC',22,34); blk(f.hdr,hEnd,'--chip','HANC',22,34); blk(hEnd,hEnd+4,'--warn','',22,34); blk(hEnd+4,f.spl,'--grid','active video ('+f.act+' words)',22,34);
  const pk=linePackets(f,n,w.gm); const p=lastWrite(t), g1=p?(p.F.gd&7)>>1:0, g2=p?((p.F.gd>>3)&7)>>1:1;
  pk.forEach(q=>{ c.fillStyle=SIM.css(GCOL[q.g]); c.fillRect(sx(q.w0),60,Math.max(2,sx(q.w1)-sx(q.w0)-1),22); });
  const zx=x=>10+x/Math.max(hEnd,1)*(W-20); c.fillStyle=SIM.css('--chip'); c.fillRect(zx(0),88,zx(hEnd)-zx(0),22);
  pk.forEach(q=>{ c.fillStyle=SIM.css(GCOL[q.g]); c.globalAlpha=(q.g===g1||q.g===g2)?1:.4; c.fillRect(zx(q.w0),88,Math.max(2,zx(q.w1)-zx(q.w0)-1),22); c.globalAlpha=1; if (zx(q.w1)-zx(q.w0)>50){ c.fillStyle='#fff'; c.font='10px '+SIM.css('--mono'); c.fillText(`G${q.g+1} ${(f.std===1?DID.sd:DID.hd)[q.g]}`, zx(q.w0)+2, 103); } });
  c.fillStyle=SIM.css('--play'); c.fillRect(sx(pos)-1,18,2,66);
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`line ${ln} of ${f.lines} · word ${pos} of ${f.spl} · ${f.std===1?'Yin: Y/C interleaved 10-bit words, 27 MHz':'Cin (Cb/Cr) stream, '+(f.clk/1e6).toFixed(3)+' MHz (GS1560 20-bit mode)'}`,10,13);
  c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText('HANC enlarged ↓ (bright = groups the FPGA is extracting)',10,86);
  const smp=lineSamples(f,n);
  el.innerHTML = `${pk.length? `${pk.length} audio data packet(s) in this line's HANC carry sample${smp.length>1?'s':''} ${smp.join(', ')} of the second. ${f.std===1? `SMPTE 272: one packet per group, 3 words (X, X+1, X+2) per channel per sample, ${7+12*smp.length} words. group_detector.vhd matches ADF 000 3FF 3FF + DID ${DID.sd[g1]} and loads every third word into a 30-bit audio_data; I2S_shifter keeps 20 bits (no AUX).` : `SMPTE 299: one 31-word packet per sample per group. group_detectorHD.vhd keeps a 24-word delay line (x0…x23), matches ADF + DID ${DID.hd[g1]} at x20, takes CLK from x17/x16 and 4 × 24-bit channels from x15…x0.`}` : (lineHasNoPkt(f,ln)? 'No audio data packets on the line after the switching line ('+f.sw.join('/')+').' : 'No sample fell inside the previous line period, so this line carries no audio data packet.')}
    <span class="muted">Packet order inside HANC and the sample→line rule are simplified (${inf}).</span>`;
}

/* =====================================================================
   VIEWS
   ===================================================================== */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
const ALT_NAME = ['ALTERA1 CH0|fifo0','ALTERA2 CH1|fifo1','ALTERA3 CH2|fifo2','ALTERA4 CH3|fifo3','ALTERA5 (status 32–39 = 0)','ALTERA6 trailer','ALTERA7 CH4|fifo4','ALTERA8 CH5|fifo5','ALTERA9 CH6|fifo6','ALTERA10 CH7|fifo7','ALTERA11 (0)','ALTERA12 trailer','ALTERA13 cntrl 0–7','ALTERA14 enableHD|enableHD2','ALTERA15','ALTERA16','ALTERA17','ALTERA18 trailer'];
function stateTable(t){
  const p=fullPassAt(t), m=p? p.s : null, ms=mcuState(t), w=world(t), st=stepAt(passAt(t),t);
  const wr=(()=>{ const s=sched(); const i=bs(s.wr,t); const x=i>=0? s.wr[i] : null; return x && t<x.t1? x : null; })();
  const rd=(()=>{ const s=sched(); const i=bs(s.rd,t); const x=i>=0? s.rd[i] : null; return x && t<x.t1? x : null; })();
  return `<table class="kv">
    <tr><th>MCU</th><td class="mono small">${ms==='off'?'not started':ms==='init_loop'?'<b style="color:var(--bad)">init_loop: waiting for 0xE8 before ALTERA_RESET</b>':ms==='boot'?'init_devices / ALTERA_RESET(1000)':ms==='init'?'init = YES → “goto loop” after the UART calls':`pass #${passAt(t).n} · step ${st}: ${STEPS[st][0]}`}</td></tr>
    <tr><th>ALTERA bus now</th><td class="mono small">${wr? `write bit ${Math.min(47,Math.floor((t-wr.t0)/(WR_BYTE/8*CYC)))}/48 · bytes ${wr.bytes.map(b=>hex(b)).join(' ')}` : rd? `read bit ${Math.min(143,Math.floor((t-rd.t0)/(RD_BYTE/8*CYC)))}/144 (${['PC1 ← ALTERA1 = SDdemux altera10','PB3 ← ALTERA11 = SDdemux altera11','PB4 ← ALTERA12 = shifter_out_48bit'][Math.min(2,Math.floor((t-rd.t0)/(RD_CYC*CYC/3)))]})` : 'idle'}</td></tr>
    <tr><th>Flags</th><td class="mono small">${m? `CD=${m.CD} sd_hd=0x${hex(m.sd_hd)} AUDIO1–4=${m.AUDIO.join('')} · AUDIO_INFORMATION=0x${hex(m.AI)} · RESET_VECTOR=0x${hex(m.RV)} RESET_VECTOR1=0x${hex(m.RV1)}<br>ERROR3=${m.ERROR3} (switch3=${m.sw[3]}, ${m.swc[3]}/255, RESET3=${m.RESET[3]}, ${m.errc[3]}/500) ERROR4=${m.ERROR4} ERROR2_3=${m.ERROR2_3} ERROR2_4=${m.ERROR2_4} ERROR5=${m.ERROR5} ERROR6=${m.ERROR6} reset_counter=${m.reset_counter}` : '—'}</td></tr>
    <tr><th>Group select</th><td class="mono small">${m? `audio_select1=${m.audio_select1} (G${(m.audio_select1>>1)+1}) audio_select2=${m.audio_select2} (${m.audio_select2>=8?'G1 — wraps':'G'+((m.audio_select2>>1)+1)}) · group_data=0x${hex(m.gd)} · group_sel=${m.group_sel} (unused)` : '—'}</td></tr>
    <tr><th>UART</th><td class="mono small">${m? `uart_byte1=${m.uart_byte1} data_available0=${m.data_available0} transmit_counter0=${m.transmit_counter0} uart_tx_data0=${m.uart_tx_data0} uart0_tx_data=0x${hex(m.uart0_tx_data)} PF2=${m.pf2} init=${m.init}` : '—'}</td></tr>
    <tr><th>ALTERA1–18</th><td class="mono small">${m? m.ALT.map((b,i)=>`<span title="${ALT_NAME[i]}">${hex(b)}</span>`).join(' ') : '—'}</td></tr>
    <tr><th>AES outputs</th><td class="mono small">${[0,1,2,3].map(k=>{ const o=outState(k,t); return `${['AES1','AES2','P4_3','P4_4'][k]}: ${!o.on?'off':o.mode==='audio'?'G'+(o.g+1)+' ch'+o.ch.join('/'):o.mode}`; }).join(' · ')}</td></tr></table>`;
}
function traceHTML(){ const e=D.log[0]; return e? `<div><b>${e.name}</b> at ${SIM.fmtT(e.t)} <span class="muted">(abs ${e.abs.toFixed(4)} s)</span></div>`+e.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Unplug the input, change the format or the groups, select a group from the host or slip a FIFO. Each step the firmware and the FPGA take is listed here with real function, variable and net names.</div>'; }
function viewSim(m){
  window.__demux3Active = true;
  m.innerHTML = `<div class="grid2"><div>${card('DEMUX-3 issue 4 at the playhead — real top assembly drawing', `<div id="bd"></div><div id="ci" class="small" style="margin-top:4px"></div><div id="ctl"></div>`)}${card('In an AMS8-1: the DEMUX-3 section of the rear panel', `<div id="rp"></div><p class="small muted">Artwork: ${SIM.src(REAR_SILK,'AMS81-DEMUX3rearsilk-CURVE.cdr')} (white plate, 29 Jun 2006) with the connector outlines of ${SIM.src(REAR_VIEW,'AMS81-DEMUX3-REARVIEW.cdr')} in grey (both drawn on the same 19 × 5 in sheet, so they register exactly). Click SDI IN to plug the cable, AES1 / AES2 to scope; hover the D-subs.</p>`)}</div>
    <div>${card('What the software did (last action)', `<div id="trace" class="log"></div>`)}${card('State at the playhead', `<div id="insp"></div>`)}</div></div>
    ${card('Timeline — one second as the board sees it (click to seek; zoom with “Zoom window”)', `<canvas id="tl"></canvas>
      <p class="small muted">MCU timing is counted from demux3_v400.lis: a bit of <span class="mono">read_data</span> ≈ ${RD_BIT} cycles, of <span class="mono">write_data</span> ≈ ${WR_BIT}, so one pass ≈ ${PASS_CYC} cycles = ${SIM.fmtDur(PASS_T)} at 4.9152 MHz (the non-I/O steps are estimated from function sizes, ${inf}). GS1560 lock, FPGA load and host cadence are ${inf}. Group colours: <span style="color:var(--accent)">G1</span> <span style="color:var(--accent2)">G2</span> <span style="color:var(--warn)">G3</span> <span style="color:var(--bad)">G4</span>.</p>`)}
    <div class="grid2">${card('Where the audio sits: the SDI line at the playhead', `<canvas id="ln"></canvas><div id="lninfo" class="small"></div>`)}
      ${card('Scope: one AES3 frame on the selected BNC (click AES1 / AES2)', `<canvas id="sc"></canvas><div id="scb" class="small mono"></div>`)}</div>
    ${card('Action log', `<div id="log" class="log"></div>`)}`;
  m.querySelector('#ctl').innerHTML=controlsHTML(); bindControls(m);
  const draw=()=>{ const t=absT();
    setBoard(m.querySelector('#bd'), boardSVG(t)); setBoard(m.querySelector('#rp'), rearSVG(t)); m.querySelector('#ci').innerHTML=chipInfo();
    m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#insp').innerHTML=stateTable(t);
    m.querySelector('#log').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('')||'<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
    drawLine(m.querySelector('#ln'), m.querySelector('#lninfo'), t); drawScope(m.querySelector('#sc'), m.querySelector('#scb'), t); };
  let lastKey=''; SIM.on('time', ()=>{ const k=SKEY+'|'+D.page; if (k!==lastKey){ lastKey=k; m.querySelector('#ctl').innerHTML=controlsHTML(); bindControls(m); } draw(); });
}
/* ---------------- tutorial ---------------- */
const curM = ()=>{ const p=fullPassAt(absT()); return p? p.s : null; };
const LESSONS = [
  {title:'Meet the DEMUX-3', auto:true, body:`<p>The DEMUX-3 is not a product you hold: it is a 4.4 × 3.8 in <b>option board</b> that lives inside Ward-Beck monitors (XTM4, DMS1, AMS4, AMS8/AMS8E-1, AIP8-2A, POD19, POD31). It takes an <b>SD or HD-SDI</b> signal on INPUT1, pulls two <b>groups</b> of embedded audio out of the horizontal blanking (HANC), and hands them to the host as AES3 on headers P3/P4 and on two BNCs. OUTPUT1 is a re-clocked loop-out.</p>
    <p>There is no manual for the board itself: these steps follow the <b>comprehensive test outlines</b> in <span class="mono">DEMUX3 - #TESTREPORT</span> (check LEDs, all ins and outs, AES mapping L/R, failure test: pull input in/out, sample rate) and the host behaviour coded in the firmware.</p>
    <p>On the board: the <b>FPGA</b> (big square) does all real-time work; the <b>ATmega128</b> (lower left) watches, sets the group and talks to the host on P2. The only indicators are a <b>yellow</b> and a <b>red</b> LED on the left edge. Hover over parts; click one for its job.</p>`, check:()=>true},
  {title:'1 · Power-up: the FPGA loads, then is loaded again', body:`<p>Set the <b>Timeline</b> to <b>Power-up</b>. The Cyclone loads its bitstream from the M25P40 by itself (Active Serial). Meanwhile the ATmega128 runs <span class="mono">init_devices()</span> and <span class="mono">ALTERA_RESET(1000)</span>: PG2 → R69 → Q1 pulls <span class="mono">nCONFIG</span> low for ≈${SIM.fmtDur(ALT_RESET_T)}. If that lands after the first load, the FPGA starts loading again from scratch.</p>
    <p>While the FPGA is unconfigured its pins float high: the MCU reads <span class="mono">0xFF</span> for every ALTERA byte (${inf}).</p><p><b>Goal:</b> choose Power-up and move the playhead past the end of the last load, with the <b>yellow</b> LED lit.</p>`,
    check:()=> D.scn==='boot' && absT() > sched().cfg[sched().cfg.length-1].t1 && ledsAt(absT()).y, hint:'Timeline → Power-up; drag the playhead to about 0.5 s. Try firmware v201-4 too: it waits for the host’s 0xE8 before it even resets the FPGA.'},
  {title:'2 · Failure test: pull the input', body:`<p>The yellow LED means <i>signal valid</i>: <span class="mono">PROCESS_SDI_LOCK_STATUS()</span> lights it when the GS1560A reports <span class="mono">~RC_BYP</span>, <span class="mono">LOCK_60</span> and <span class="mono">SMPTE</span> all high, and sets <span class="mono">CD = 1</span>. Otherwise the red LED lights and <span class="mono">CD = 0</span>.</p>
    <p>With CD = 0 every AUDIO flag is forced to 0, so the next <span class="mono">ALTERA_write</span> clears the AES enables (in SD).</p><p><b>Goal:</b> back on <b>Running</b>, unplug INPUT1 and see the <b>red</b> LED.</p>`,
    check:()=> D.scn!=='boot' && !world(absT()).cable && ledsAt(absT()).r, hint:'Click INPUT1 (bottom BNC) or press C, then step forward a pass or two (Step → 1 MCU pass).'},
  {title:'3 · Select a group from the host', body:`<p>Plug the cable back in. The host (XTM4, DMS1, AMS4…) sends a two-byte frame: <span class="mono">0xE0 | group×2</span>, then a byte with bit 7 clear. <span class="mono">process_uart()</span> sets <span class="mono">audio_select1</span>; the second group is always <span class="mono">audio_select2 = audio_select1 + 2</span>, i.e. the next group.</p>
    <p>The change makes <span class="mono">PROCESS_GROUP_COMPARE1()</span> raise ERROR5, which holds RESET_VECTOR bit 4 low for 255 passes so every FIFO restarts on the new group.</p><p><b>Goal:</b> tick G2 on the source, choose select byte <b>0xE2</b>, and get AUDIO1 = 1 for Group 2.</p>`,
    check:()=>{ const m=curM(); return m && world(absT()).cable && m.audio_select1===2 && m.AUDIO[0]; }, hint:'Host → select 0xE2 (or press 2). Make sure G2 is ticked. The host repeats its frame every ≈55 ms and the FIFOs restart one field after the 255-pass reset — play ≈0.4 s.'},
  {title:'4 · Check the AES mapping', body:`<p>The test outline asks to “check mapping (AES position, L/R)”. The AES1 BNC carries channels 1/2 of the selected group, AES2 carries channels 3/4. P4 pins 3/4 carry the second group. In this simulation embedded channel n is a 200·n Hz tone, so the scope tells you which channel you are looking at.</p>
    <p><b>Goal:</b> click the <b>AES2</b> BNC so the scope shows Group 2 channels 3/4 (embedded channels 7/8: 1 400 / 1 600 Hz).</p>`,
    check:()=>{ const o=outState(1,absT()); return D.scope===1 && o.on && o.mode==='audio' && o.g===1; }, hint:'Click the AES2 BNC (top right). Group 2 must be selected and present.'},
  {title:'5 · A missing group in SD', body:`<p>In SD the FPGA sets <span class="mono">CHn</span> (CHACT_FLAGS) only if at least one sample for that channel was written during the last field. The MCU reads it as bit 7 of ALTERA1–4, so <span class="mono">Audio1_Detect()</span> drops AUDIO1, <span class="mono">PROCESS_AUDIO_INFORMATION()</span> clears bit 6 and <span class="mono">AES_enable</span> turns the output off: no AES3 carrier at all.</p>
    <p><b>Goal:</b> with an SD source, untick the group that feeds AES1 and see the AES1 BNC go flat.</p>`,
    check:()=>{ const w=world(absT()); return VF[w.fmt].std===1 && w.cable && !outState(0,absT()).on; }, hint:'Untick the selected group (G2 if you followed step 3). It takes one field plus a pass or two.'},
  {title:'6 · HD: a different detector', body:`<p>Switch the source to <b>HD 1080i 59.94</b>. The GS1560A drives SD/~HD low, <span class="mono">PROCESS_HD_SD_CONTROL()</span> clears ALTERA15 and sets 20-bit mode. In HD the audio packets sit in the Cb/Cr stream; <span class="mono">group_detectorHD</span> matches the DID and <span class="mono">hd_group_detect</span> raises <span class="mono">enableHD</span>. The MCU now reads AUDIO1/2 from ALTERA14 bit 7 and AUDIO3/4 from bit 6.</p>
    <p><b>Goal:</b> HD source, selected group ticked, AUDIO1 = 1.</p>`,
    check:()=>{ const m=curM(), w=world(absT()); return m && VF[w.fmt].std===2 && m.AUDIO[0] && m.sd_hd===0; }, hint:'Source → HD 1080i 59.94, keep the group ticked, then play ≈0.3 s (ERROR6 holds the global reset for 255 passes).'},
  {title:'7 · The sample-count supervisor', body:`<p>Back in <b>SD</b>, press <b>slip</b>: AES1 channel 2’s FIFO gets four extra samples. ALTERA1/ALTERA2 carry each FIFO’s <span class="mono">wrusedw</span>; <span class="mono">COMPARE_AUDIO1_AUDIO2()</span> flags a difference above 2. After 255 bad passes in a row the debounce gives up, <span class="mono">PROCESS_SAMPLE12_COMPARE()</span> clears RESET_VECTOR bit 0 and the FPGA re-starts the pair at the next field — this is how the board keeps L and R of an AES pair in step.</p>
    <p><b>Goal:</b> see a reset on RESET_VECTOR bit 0 after your slip (red on the “RESET_VECTOR” lane).</p>`,
    check:()=>{ const s=sched(), ts=lastEv('skew',1e9); return ts>-1e8 && s.fifoEv.some(e=>e.p===0 && e.kind==='reset' && e.t>ts); }, hint:'Source → SD 525i; press S (slip) early in the page, then play: ≈0.27 s later bit 0 drops.'},
  {title:'8 · Pull the cable in HD — v400 vs v203', body:`<p>In HD, AES_enable ignores the MCU: the output follows <span class="mono">enableHD</span>, which only times out after 8 “vertical” edges — and with no video there are no edges. v400 has no CD term in its reset vector, so the AES outputs keep running on stale data (${inf}). v202/v203 added <span class="mono">|| (CD == 0)</span> to TRANSLATE_RESET_VECTOR: res1_g drops, the dcfifo0s are cleared and the outputs carry digital silence.</p>
    <p><b>Goal:</b> firmware <b>v203</b>, HD source, cable out: AES1 carries zeros.</p>`,
    check:()=>{ const w=world(absT()), o=outState(0,absT()); return D.build==='v203' && VF[w.fmt].std===2 && !w.cable && o.on && o.mode==='zero'; }, hint:'Firmware → v203; Source → HD; unplug. Compare with v400, where the AES out lane turns orange (stale).'},
  {title:'9 · The power-up reply race', body:`<p>With v400, press <b>send 0xE8 probe</b>. While <span class="mono">init == YES</span> the main loop only runs the three UART calls, so a “pass” lasts ≈${SIM.fmtDur(INIT_PASS_T)}. <span class="mono">UART0_transmit_counter()</span> turns the U8 driver on (PF2 = 1), writes 0xE0, and seven short passes later sees UDRE0 = 1 — the byte has only moved into the shift register — and turns U8 off again ≈200 µs into a 1.04 ms byte.</p>
    <p>U10 (PF3, always on) still sends the whole byte on P2 pins 3/4; a host that listens on pins 1/2 would see a broken byte (${inf}).</p><p><b>Goal:</b> zoom the timeline so a 0xE0 reply with the red “PF2→0” mark is in view.</p>`,
    check:()=>{ const s=sched(), [a,b]=SIM.window(), P0=page0(); return s.uart.some(u=>u.dir==='d' && u.b===0xE0 && u.pf2Off!==null && u.pf2Off<u.t1 && u.t0>=P0+a && u.t1<=P0+b) && (b-a)<0.02; }, hint:'Press P, then set Zoom window to 10 ms and drag the playhead to the probe (orange bytes on the UART lane).'},
  {title:'Done', auto:true, body:'<p>You have used every control. <b>One second</b> breaks a second down to SDI lines, HANC packets and AES3 bits; <b>Software</b> shows the main loop, the shift chain and the debounce machines live; <b>Findings</b> lists what the firmware and FPGA are really up to.</p>', check:()=>true},
];
function viewTutorial(m){
  window.__demux3Active = true;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — operating and testing the DEMUX-3', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('What the software did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The board', `<div id="bd"></div><div id="ci" class="small"></div><div id="ctl"></div>`)}${card('Timeline', `<canvas id="tl"></canvas>`)}</div></div>`;
  m.querySelector('#ctl').innerHTML=controlsHTML(); bindControls(m);
  let lastKey='';
  const draw=()=>{ const t=absT(); const k=SKEY+'|'+D.page; if (k!==lastKey){ lastKey=k; m.querySelector('#ctl').innerHTML=controlsHTML(); bindControls(m); }
    setBoard(m.querySelector('#bd'), boardSVG(t,{max:700})); m.querySelector('#ci').innerHTML=chipInfo(); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===D.lesson?'font-weight:700;color:var(--accent)':''}">${l.title}${!l.auto&&l.check()?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(li=> li.onclick=()=>{ D.lesson=+li.dataset.i; draw(); });
    const L=LESSONS[D.lesson], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button id="pv" ${D.lesson?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${D.lesson<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="so">Start over</button></div>`;
    m.querySelector('#pv').onclick=()=>{ D.lesson=Math.max(0,D.lesson-1); draw(); }; m.querySelector('#nx').onclick=()=>{ D.lesson=Math.min(LESSONS.length-1,D.lesson+1); draw(); }; m.querySelector('#so').onclick=()=>{ A.reset(); D.lesson=0; };
    SIM.drawLanes(m.querySelector('#tl'), lanes().filter(l=>/GS1560|main loop|UART|CD ·|RESET_VECTOR|AES out|LEDs|FPGA:/.test(l.label)), {labelW:170});
  };
  SIM.on('time', draw);
}

/* ---------------- one second ---------------- */
function viewSecond(m){
  window.__demux3Active = true;
  m.innerHTML = `${card('One second, broken down (this page of the timeline)', `<div id="lad"></div>`)}
    <div class="grid2">${card('As seen by the board at the playhead', `<div id="dev"></div>`)}${card('As seen by the displays', `<div id="leds"></div><h3>Downstream: a host meter fed from AES1 / AES2</h3><canvas id="mt"></canvas><p class="small muted">Peak over the last 10 ms on a 46-segment −60…0 dBFS bar (host meter style, ${inf}). “NO AES” = no carrier.</p>`)}</div>
    ${card('Zoom ladder at the playhead: second → field → line → HANC → AES3 frame', `<canvas id="zl"></canvas>`)}
    ${card('The line under the playhead', `<canvas id="ln"></canvas><div id="lninfo" class="small"></div>`)}
    ${card('The ALTERA bytes of the current pass (what ALTERA_read shifted in)', `<div id="altb" class="small"></div>`)}`;
  const draw=()=>{
    const t=absT(), s=sched(), w=world(t), f=VF[w.fmt], P0=page0();
    const inP=a=>a.filter(x=>x.t0>=P0 && x.t0<P0+1);
    const passes=inP(s.passes).filter(p=>!p.init).length, ip=inP(s.passes).filter(p=>p.init).length, ub=inP(s.uart);
    const gs=[0,1,2,3].filter(g=>(w.gm>>g)&1).length, Tl=lineT(f), lps=1/Tl;
    const rows=[
      ['SDI frames / fields', `${f.fr.toFixed(3)} / ${(f.fr*(f.il?2:1)).toFixed(2)}`, SIM.fmtDur(1/f.fr), f.name+(f.il?' interlaced':' progressive')],
      ['SDI lines', Math.round(lps).toLocaleString(), SIM.fmtDur(Tl), `${f.lines} per frame · start_pulse fires 8 lines into each field`],
      ['Parallel words (GS1560 PCLK)', Math.round(f.clk).toLocaleString(), SIM.fmtDur(1/f.clk), `${f.spl} per line · ${f.std===1?'10-bit Y/C muxed on Yin':'20-bit: Y on Yin, Cb/Cr on Cin'} · ${f.rate}`],
      ['HANC audio packets', f.std===1? `≈${Math.round(lps*(1-f.sw.length/f.lines)*gs).toLocaleString()}` : (48000*gs).toLocaleString(), '', f.std===1? 'SMPTE 272: one per group per line' : 'SMPTE 299: one per sample per group'],
      ['Audio samples per channel', '48 000', SIM.fmtDur(1/48000), '8008 per 5 frames at 59.94'],
      ['VCXO MCLK (X2, X3)', '12 288 000', SIM.fmtDur(1/12.288e6), 'I2S_Generator: LRCK = MCLK/256, SCLK = MCLK/4'],
      ['SD 48 kHz reference', '48 000', '', 'altpll1: 27 MHz × 8/9 = 24 MHz → lpm_counter0 mod 500 → q[8]'],
      ['AES3 blocks / frames / bit cells', '250 / 48 000 / 6 144 000', SIM.fmtDur(1/48000/128), 'i2sx4_aes block_counter 0…191'],
      ['MCU main-loop passes', passes+(ip?` (+${ip} init passes)`:''), passes? SIM.fmtDur(1/passes) : '', `${PASS_CYC} cycles each, counted from the listing`],
      ['ALTERA bus bits', ((passes)*(48+144)).toLocaleString(), SIM.fmtDur(RD_BIT*CYC), '48 written + 144 read per pass (ALTERA5 clock)'],
      ['Timer0 interrupts', Math.round(1/TICK0), SIM.fmtDur(TICK0), 'reloads TCNT0 and returns'],
      ['UART bytes (host / reply)', `${ub.filter(u=>u.dir==='h').length} / ${ub.filter(u=>u.dir==='d').length}`, SIM.fmtDur(UART_BYTE), '9600 8N1 on P2'],
      ['FIFO resets (pairs)', s.fifoEv.filter(e=>e.kind==='reset' && e.t>=P0 && e.t<P0+1).length, '', 'RESET_VECTOR bits 0–4'],
    ];
    m.querySelector('#lad').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>notes</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table><p class="small muted">Step units in the transport move one field, line, MCU pass, ALTERA byte, UART byte, AES block or sample.</p>`;
    const n=Math.floor(t/Tl), ln=(n%f.lines)+1, pos=Math.floor((t-n*Tl)*f.clk), pk=linePackets(f,n,w.gm), here=pk.find(q=>pos>=q.w0&&pos<q.w1), fm=Math.floor(t*f.fr), Fm=aesFrame(t,0), p=passAt(t), st=stepAt(p,t);
    m.querySelector('#dev').innerHTML=`<table class="kv"><tr><th>Time</th><td class="mono">${SIM.fmtT(SIM.t)} (abs ${t.toFixed(6)} s)</td></tr>
      <tr><th>SDI</th><td class="mono">${w.cable? `frame ${fm} · line ${ln} · word ${pos} ${pos<f.hdr?'· <b>EAV</b>':pos<f.spl-f.act-4?'· HANC':pos<f.spl-f.act?'· <b>SAV</b>':'· active video'}${here?` · inside the G${here.g+1} packet (DID ${(f.std===1?DID.sd:DID.hd)[here.g]})`:''}`:'no cable'}</td></tr>
      <tr><th>AES3 out</th><td class="mono">frame ${Fm.n.toLocaleString()} · ${Fm.fr}/191 · preamble ${Fm.sub[0].pre}</td></tr>
      <tr><th>ATmega128</th><td class="mono small">${mcuState(t)==='loop'? 'pass #'+p.n+' step '+st+': '+STEPS[st][0] : mcuState(t)}</td></tr>
      <tr><th>FPGA</th><td class="mono small">${inCfg(t)?'configuring':(()=>{ const q=lastWrite(t); return q? `group_sel ${(q.F.gd&7)>>1} · group_sel2 ${((q.F.gd>>3)&7)>>1} · ALTERA15 ${q.F.sdPin?'SD':'HD'} · FIFO pairs ${q.F.fifo.map(x=>x.st).join('/')} · enableHD ${q.F.enHD.join('/')}` : '—'; })()}</td></tr></table>`;
    const L=ledsAt(t); const lc=(on,col,l)=>`<div style="display:flex;align-items:center;gap:8px;margin:3px 0"><span style="width:22px;height:22px;border-radius:50%;display:inline-block;background:${on?col:'var(--led-off)'};box-shadow:${on?'0 0 10px '+col:'none'}"></span><span>${l}: <b>${on?'ON':'off'}</b></span></div>`;
    const lastReply = s.uart.filter(u=>u.dir==='d' && u.t1<=t).pop();
    m.querySelector('#leds').innerHTML = lc(L.y,'#ffd23a','YEL LED3 (PA3) — SDI valid') + lc(L.r,'#ff4a3a','RED LED4 (PA2) — not valid') + (D.build==='p19'? lc(L.sdi,'#7dff6a','POD19 front SDI (PE1 → P2-3)')+lc(L.aud,'#7dff6a','POD19 front AES (PE0 → P2-4)') : '')
      + `<div class="small">Host sees: ${lastReply? `last reply <span class="mono">0x${hex(lastReply.b)}</span> → ${lastReply.b===0xE0?'“demux present”':lastReply.b&0x80?'status':((lastReply.b&2)?'“no SDI” (CD = 0)':'“SDI OK”')}` : 'no reply yet'}</div>`;
    const {c,w:W}=SIM.canvas(m.querySelector('#mt'),80);
    [0,1].forEach(k=>{ let pk2=0, any=false; for (let j=0;j<96;j++) for (const sd of [0,1]){ const v=outSample(k,sd,t-0.01*j/96); if (v!==null){ any=true; pk2=Math.max(pk2,Math.abs(v)); } }
      const db=pk2>0?20*Math.log10(pk2):-99, segs=46, lit=any?clamp(Math.round((db+60)/60*segs),0,segs):0;
      for (let sg=0;sg<segs;sg++){ const xx=96+sg*(W-106)/segs; c.fillStyle= sg<lit? (sg>=segs-4?'#e3453a':sg>=segs-12?'#e8b23a':'#3fbf5f') : SIM.css('--grid'); c.fillRect(xx,8+k*34,(W-106)/segs-2,24); }
      c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(`AES${k+1} ${any? (pk2>0? db.toFixed(1)+' dB':'silence') : 'NO AES'}`,4,24+k*34); });
    drawLadder(m.querySelector('#zl'), t); drawLine(m.querySelector('#ln'), m.querySelector('#lninfo'), t);
    const fp=fullPassAt(t);
    m.querySelector('#altb').innerHTML = fp? `<table class="kv"><tr><th>byte</th><th>source</th><th>value</th><th>meaning</th></tr>${fp.s.ALT.map((b,i)=>`<tr><td class="mono">ALTERA${i+1}</td><td class="small">${ALT_NAME[i].split(' ').slice(1).join(' ')}</td><td class="mono">0x${hex(b)} ${bin(b)}</td><td class="small">${altMeaning(i,b)}</td></tr>`).join('')}</table>` : '<span class="muted">No pass yet.</span>';
  };
  SIM.on('time', draw);
}
function altMeaning(i,b){
  if (b===0xFF) return 'FPGA not configured (all ones)';
  if ([0,1,2,3,6,7,8,9].includes(i)) return `CH${[0,1,2,3,,,4,5,6,7][i]} = ${b>>7} (a sample was written last field) · wrusedw = ${b&0x7F}`;
  if (i===5||i===11||i===17) return `trailer “10101000” from shifter_out_48bit counts 40–47 · ${i===5? 'ALIGNMENT_CHECK: (0x'+hex(b)+' & 0xF0) == 0xA0 → '+(((b&0xF0)===0xA0)?'aligned':'ERROR2') : 'never checked'}`;
  if (i===13) return `bit 7 = enableHD (HD_AUDIO_LOCK_PIN1) = ${b>>7&1} · bit 6 = enableHD2 = ${b>>6&1}`;
  return 'unused (status bits tied to GND)';
}
function drawLadder(cv, t){
  const w=world(t), f=VF[w.fmt], Tl=lineT(f), P0=page0();
  const levels=[['1 second',1],['1 field',fieldT(f)],['1 line',Tl],[`HANC (${f.spl-f.act-4} words)`,(f.spl-f.act-4)/f.clk],['1 AES3 frame',1/48000]];
  const H=levels.length*46+10; const {c,w:W}=SIM.canvas(cv,H); const x0=170, pw=W-x0-10;
  levels.forEach(([nm,span],li)=>{ const y=8+li*46; let a = li===3? Math.floor(t/Tl)*Tl : clamp(t-span/2, P0, P0+1-span); if (li===0) a=P0;
    c.fillStyle=SIM.css('--ink'); c.font='12px sans-serif'; c.fillText(nm,6,y+14); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; c.fillText(SIM.fmtDur(span),6,y+28);
    c.fillStyle=SIM.css('--lane'); c.fillRect(x0,y,pw,36); const X=tt=>x0+(tt-a)/span*pw; c.save(); c.beginPath(); c.rect(x0,y,pw,36); c.clip();
    if (li===0){ const ps=passRange(a,a+span); c.fillStyle=SIM.css('--accent2'); c.globalAlpha=.5; ps.forEach((p,i)=>{ if (i%8===0) c.fillRect(X(p.t0),y+4,1,12); }); c.globalAlpha=1;
      const Tf=fieldT(f); for (let k=Math.ceil(a/Tf);k*Tf<a+span;k++){ c.fillStyle=SIM.css('--warn'); c.fillRect(X(k*Tf),y+18,1.5,16); } }
    else if (li===1){ for (let k=Math.ceil(a/Tl);k*Tl<a+span;k++){ c.fillStyle=SIM.css('--ink2'); c.fillRect(X(k*Tl),y+20,1,14); } const ps=passRange(a,a+span); ps.forEach(p=>{ c.fillStyle=SIM.css(p.init?'--warn':'--accent2'); c.fillRect(X(p.t0),y+3,Math.max(1,X(p.t1||p.t0)-X(p.t0)-1),12); }); }
    else if (li===2||li===3){ const n=Math.floor(t/Tl), ta=n*Tl, wt=1/f.clk; const hEnd=f.spl-f.act-4;
      const seg=(u0,u1,col)=>{ c.fillStyle=SIM.css(col); c.fillRect(X(ta+u0*wt),y+4,Math.max(1,X(ta+u1*wt)-X(ta+u0*wt)),28); };
      seg(0,f.hdr,'--bad'); seg(f.hdr,hEnd,'--chip'); if (li===2){ seg(hEnd,hEnd+4,'--warn'); seg(hEnd+4,f.spl,'--grid'); }
      linePackets(f,n,w.gm).forEach(q=>{ c.fillStyle=SIM.css(GCOL[q.g]); c.fillRect(X(ta+q.w0*wt),y+8,Math.max(1,X(ta+q.w1*wt)-X(ta+q.w0*wt)-1),20); }); }
    else { const Fm=aesFrame(t,0); const la=biphase(Fm.sub[0].pre,Fm.sub[0].bits,0), lb=biphase('Y',Fm.sub[1].bits,la[la.length-1]), lv=la.concat(lb), cw=pw/lv.length;
      c.strokeStyle=SIM.css('--ink'); c.beginPath(); lv.forEach((v,i)=>{ const xx=x0+i*cw, yy=v?y+6:y+30; if (!i) c.moveTo(xx,yy); else c.lineTo(xx,yy); c.lineTo(xx+cw,yy); }); c.stroke(); }
    c.fillStyle=SIM.css('--play'); c.fillRect(X(t)-1,y,2,36); c.restore(); });
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  in:{x:10,y:40,w:130,h:80,t:'INPUT1',s:['GS1574 equaliser','CD/MUTE1'],d:'75 Ω BNC into the GS1574 (U1) adaptive cable equaliser. Its carrier detect CD/MUTE1 reaches the GS1560A pin 5 and PE4 (never read by v400).'},
  rx:{x:170,y:30,w:160,h:110,t:'GS1560A + GO1525',s:['SD/HD deserialiser','PCLK 27 / 74.25 MHz','D0–D19 → Cin / Yin','LOCK · SMPTE · RC_BYP'],d:'U2 recovers the clock and data; 10-bit SD comes out multiplexed on D10–D19 (Yin), 20-bit HD as Y on Yin and Cb/Cr on Cin. Status pins go straight to the ATmega128 (PD2, PG3, PE7, PD7).'},
  loop:{x:170,y:170,w:160,h:60,t:'GS1528 → OUTPUT1',s:['re-clocked loop-out'],d:'U9 cable driver; slew follows SD/~HD.'},
  sdd:{x:370,y:10,w:190,h:130,t:'SD demux (SDdemux.bdf)',s:['group_detector: ADF+DID 2FF/1FD/1FB/2F9','group_selector → fifo_write0–7','8 × SD403_FIFO 128×30','CHACT_FLAGS · I2S_shifter ×4'],d:'Finds SMPTE 272 packets in the 27 MHz Yin stream, writes each channel into its own 128-word FIFO and reads them out as I2S once wrusedw reaches 64. CHn = “a sample arrived during the last field”.'},
  hdd:{x:370,y:160,w:190,h:130,t:'HD demux',s:['dff10 → group_detectorHD','didin / didin2 from HD_group_sel','4 × dcfifo0 64×64','hd_group_detect → enableHD'],d:'Finds SMPTE 299 packets in Cin, keeps 24-bit samples, pairs ch1/2 and ch3/4 in 64-bit FIFO words, and rebuilds the sample clock (srclock) from the CLK words for the VCXO loop.'},
  sel:{x:590,y:90,w:130,h:110,t:'SD_HD_SEL ×2',s:['ALTERA15 = sd_hd','MCLK · LRCK · SCLK · data'],d:'Two-to-one multiplexers between the SD (SDdemux) and HD (I2S_64_par_ser_reva) I2S streams, steered by ALTERA15 which the MCU copies from the GS1560 SD/~HD pin.'},
  aes:{x:750,y:60,w:150,h:150,t:'AES out',s:['i2sx4_aes ×2 (pro CS)','AES_enable ×2','swap (group 1)','→ AES1/2 BNC · P3 · P4'],d:'Each i2sx4_aes encodes two AES3 streams. AES_enable gates them: SD → AUDIO_INFORMATION bits from the MCU; HD → enableHD from the FPGA itself.'},
  clk:{x:590,y:230,w:200,h:110,t:'Audio clocks',s:['2 × CSX750V VCXO 12.288 MHz','PDF_DETECTOR up/down','SD: altpll1 27→24 MHz ÷500','HD: srclock from CLK words'],d:'Each group has its own VCXO, phase-locked by a charge pump (UP/DN pins, D1–D4) to 48 kHz: from the video clock in SD, from the embedded audio clock phase in HD.'},
  ctl:{x:370,y:320,w:190,h:90,t:'Control chain',s:['3 × shift_in (48 bits in)','3 × shifter_out_48bit','ALTERA5 clk · 6/7 strobes'],d:'The MCU shifts 6 bytes in (Dolby leftovers, RESET_VECTOR(1), AUDIO_INFORMATION, group_data) and reads 3 × 6 status bytes back, each ending in the 0xA8 trailer.'},
  mcu:{x:110,y:300,w:220,h:120,t:'ATmega128 @ 4.9152 MHz',s:['demux3_v400.c main loop ≈1 ms','GS1560 status → CD, LEDs','error debounce → RESET_VECTOR','RS-485 host protocol'],d:'Never touches audio: it polls, debounces, decides when the FPGA must reset its FIFOs and tells the host whether SDI is present.'},
  host:{x:10,y:440,w:170,h:70,t:'P2 · RS-485',s:['U8 half duplex · U10 TX only'],d:'9600 8N1 to the host front panel. v400 switches U8 with PF2; U10 always drives.'},
  cfg:{x:600,y:380,w:170,h:60,t:'M25P40 + H11',s:['Active Serial config'],d:'EPCS-compatible flash; nCONFIG pulled low by Q1 when the MCU calls ALTERA_RESET().'},
  led:{x:200,y:440,w:150,h:70,t:'LEDs',s:['YEL PA3 · RED PA2'],d:'Signal valid / not valid. The only operator indicators on the board.'},
};
const WIRES=[['in','rx','SDI'],['rx','loop',''],['rx','sdd','Yin 10b'],['rx','hdd','Cin 10b'],['sdd','sel','I2S'],['hdd','sel','I2S'],['sel','aes',''],['clk','aes','MCLK'],['hdd','clk','srclock'],['mcu','ctl','ALTERA0–15'],['ctl','sdd','resets · groups'],['ctl','hdd','didin · res_g'],['ctl','aes','AES enables'],['rx','mcu','status'],['host','mcu','UART0'],['mcu','led',''],['mcu','cfg','nCONFIG']];
function viewBlock(m){
  window.__demux3Active = false;
  m.innerHTML = `${card('Block diagram (click a block; dots follow the playhead)', `<div id="bdg" class="scroll"></div>`)}<div class="grid2">${card('Block', `<div id="bi"></div>`)}${card('Signal flow in one sentence', `<p>The GS1560A turns the cable into parallel words; the Cyclone finds the audio packets, keeps two groups in FIFOs and re-encodes them as AES3 on two VCXO clocks; the ATmega128 only watches the status bits, picks the groups the host asks for, and pulls the FPGA’s FIFO resets when the counts disagree, the group changes or the standard changes.</p>`)}</div>`;
  const draw=()=>{ const t=absT(), w=world(t), p=lastWrite(t), sd=p? !!(p.F.sdPin&0x80) : true, vid=vidOK(t);
    const live={in:w.cable, rx:vid, loop:vid, sdd:vid&&sd, hdd:vid&&!sd, sel:!inCfg(t), aes:outState(0,t).on||outState(1,t).on, clk:!inCfg(t), ctl:mcuState(t)==='loop', mcu:mcuState(t)!=='off', host:w.host, cfg:inCfg(t), led:true};
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 920 520" style="width:100%;min-width:700px"><defs><marker id="d3ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=D.selBlock===a||D.selBlock===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.2}" marker-end="url(#d3ar)"/>${l?`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-3}" font-size="10" fill="var(--ink2)">${l}</text>`:''}`; });
    for (const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${D.selBlock===k?'var(--accent)':'var(--line)'}" stroke-width="${D.selBlock===k?2.5:1.2}"/><circle cx="${b.x+b.w-11}" cy="${b.y+11}" r="5" fill="${live[k]?'var(--accent)':'var(--grid)'}"/>
      <text x="${b.x+7}" y="${b.y+18}" font-size="12" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+7}" y="${b.y+34+i*14}" font-size="10" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    s+='</svg>'; m.querySelector('#bdg').innerHTML=s; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ D.selBlock=g.dataset.b; draw(); });
    const b=BLOCKS[D.selBlock]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p><p class="small muted">Live dot = ${live[D.selBlock]?'active':'idle'} at the playhead.</p>`; };
  SIM.on('time', draw);
}
/* ---------------- schematics (redrawn) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*17; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-16}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-3}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+21+i*17; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+4}" y="${yy+4}" font-size="10" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x-34}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+21+i*17; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-4}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x+w+34}" y="${yy+4}" font-size="10" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  return s; }
function row(y,l,mid,r){ return `<text x="30" y="${y}" font-size="11.5" fill="var(--accent2)">${l}</text><line x1="230" y1="${y-4}" x2="300" y2="${y-4}" stroke="var(--ink)"/><rect x="300" y="${y-18}" width="230" height="28" fill="var(--panel2)" stroke="var(--ink)"/><text x="415" y="${y}" text-anchor="middle" font-size="11" fill="var(--ink)">${mid}</text><line x1="530" y1="${y-4}" x2="600" y2="${y-4}" stroke="var(--ink)"/><text x="608" y="${y}" font-size="11.5" fill="var(--ink)">${r}</text>`; }
const SHEETS = [
  {name:'1 · Controller', note:'U11 ATmega128(L) pins and nets from DEMUX-3ISS4.net (P-CAD netlist), roles from demux3_v400.c (port_init and the #defines). Net names in blue.', svg:()=> chip(330,50,210,'U11 ATmega128(L)',[['35–42 PC0–PC7','ALTERA0–7'],['10–17 PB0–PB7','ALTERA8–15'],['2 PE0 RXD0','CPU_RX ← U8 RO'],['3 PE1 TXD0','CPU_TX → U8/U10 DI'],['5 PE3','N_CONFIG (input)'],['6 PE4','CD/MUTE1 (unused)'],['9 PE7','~RC_BYP'],['59 PF2','U8 RE/DE (TX mode)'],['58 PF3','U10 DE (always 1)'],['23/24 XTAL','X1 4.9152 MHz'],['43 PG2','ALTERA_RESET → R69 → Q1']],
     [['48 PA3','LED1 → YEL (LED_Y_mask)'],['49 PA2','LED2 → RED (LED_R_mask)'],['27 PD2','LOCK_60 (lock60_mask)'],['28–30 PD3–5','SDCLK/SDIN/SDOUT_60 (unused)'],['31 PD6','CS_60 (held high)'],['32 PD7','SD/~HD (SD_HD_mask)'],['18 PG3','SMPTE (SMPTE_mask)'],['19 PG4','GS1560 20/10 bit'],['JTAG','JTAG1 2×5']],'ICCAVR V7 · demux3_v400.c')},
  {name:'2 · FPGA ↔ MCU (qsf)', note:'v301/v105.qsf pin names (inconsistent spelling kept) against the board nets ALTERA0–15 and the pod31.bdf nets they reach.', svg:()=> chip(330,40,240,'U3 EP1C12Q240C6 (v105.qsf)',[['8 ALTER0','PC0 — not connected in bdf'],['7 ALTERA1 (out)','PC1 ← SDdemux altera10 (group 1)'],['6/5/4 ALTER2–4','PC2–4 — not connected'],['3 ALTER5','PC5 → shift/strobe clock'],['2 ALTER6','PC6 → read strobe'],['1 ALTER7','PC7 → write strobe'],['233 ALTER8','PB0 — not connected'],['234 ALTER9','PB1 → shift_in data'],['235 ALTERA10 (out)','PB2 — driven by nothing'],['236 ALTERA11 (out)','PB3 ← SDdemux altera11 (group 2)'],['237 ALTERA12 (out)','PB4 ← shifter_out_48bit (aux)'],['238 ALTER13','PB5 — not connected'],['239 altera14 (out)','PB6 ← enableHD'],['240 ALTER15','PB7 → sd_hd (SD_HD_SEL, AES_enable)']],
     [['28 pclk','PCLK ← GS1560 69'],['62…54 Cin[0..9]','D0–D9'],['53…42 Yin[0..9]','D10–D19'],['160 vco_1 / 178 vco_2','VCO_OUT1/2 ← X2/X3'],['169/166 up1/down1','UP1/DN1 → D1/D2'],['180/179 up2/down2','UP2/DN2 → D3/D4'],['119/120 AES1/AES2','AES_OUT4/3 → U15'],['184–181 OUT_P3_1–4','→ P3'],['187,186,185,200 OUT_P4_1–4','→ P4'],['159 pll1700_27out','→ U4 PLL1705 (DNI)'],['193 pll1700_aclk','← U4 (DNI)'],['100,101,98,99,86,87,85','TP1–TP7 → H1'],['65,74,66,68,75,67','ICS662 REF_IN/HDCLK/SEL — unassigned']],'Quartus 5.1 · pod31')},
  {name:'3 · SDI front end', note:'From the netlist and BOM: GS1574 → GS1560A (+GO1525 VCO) → FPGA; GS1528 loop-out. GS1560 status pins go to the MCU, not to the FPGA.', svg:()=> row(60,'INPUT1 BCJ-RA (75 Ω)','U1 GS1574 equaliser','DDI1P/N → U2 · CD/MUTE1 → U2-5, PE4')
     + row(110,'U2 GS1560A deserialiser','D0–D19, PCLK (69)','→ FPGA Cin/Yin, pin 28') + row(160,'U2 status','LOCK_60 72 · SMPTE 18 · ~RC_BYP 70','→ PD2 · PG3 · PE7') + row(210,'U2 SD/~HD pin 11','also U9 GS1528 pin 6','→ PD7') + row(260,'U2 20bit/10bit pin 12','R28/R29','← PG4 (PROCESS_HD_SD_CONTROL)')
     + row(310,'U5 GO1525','VCO_VCC filtered','→ U2 pin 76') + row(360,'U9 GS1528','SDI cable driver','→ OUTPUT1 BCJ-RA') + row(410,'U2 GSPI pins 27–30','CS_60 · SDOUT/SDIN/SDCLK_60','→ PD6…PD3 (firmware never uses)')},
  {name:'4 · Audio clocks', note:'VCXO loops from pod31.bdf (PDF_DETECTOR, stabalizer, switch2x1, altpll1, lpm_counter0) and the netlist (X2/X3, D1–D4, R23/R24/R45/R50). The loop-filter values are on the BOM (2K, 1M, 0.47, 10/10); their exact topology is '+'inferred'+'.', svg:()=> chip(70,60,190,'X2 CSX750V 12.288',[['1 VC','loop filter ← UP1/DN1'],['5/6','V_X2']],[['4 OUT','VCO_OUT1 → vco_1 (mclk)']],'group 1 / HD')
     + chip(70,200,190,'X3 CSX750V 12.288',[['1 VC','loop filter ← UP2/DN2'],['5/6','V_X3']],[['4 OUT','VCO_OUT2 → vco_2 (mclk2)']],'group 2 / SD')
     + chip(520,60,250,'PDF_DETECTOR (×2)',[['PDF_SIG_IN','srclock (HD) or 48 kHz (SD)'],['PDF_COMP_IN','lrclk = MCLK/256']],[['up → pin down1','DFF Q (labels crossed)'],['down → pin up1','NOT of the other DFF']],'two-DFF phase/frequency detector')
     + chip(520,230,250,'altpll1 + lpm_counter0',[['inclk0 37 037 ps','pclk (27 MHz in SD)']],[['c0 ×8/9 = 24 MHz','→ counter mod 500'],['q[8] = 48 kHz','→ switch2x1 in2 (SD)'],['c1 = 27 MHz','→ pll1700_27out (DNI)']],'SD reference')
     + `<text x="40" y="420" font-size="11" fill="var(--ink2)">ICS662-03 (U6) is fitted but its FPGA pins 65/74/66/68/75/67 carry no qsf assignment; PLL1705 (U4) is DNI — v105: “use external PLL instead of PLL1705”.</text>`},
  {name:'5 · AES outputs and connectors', note:'Netlist: FPGA AES1 (119) → R91 → net AES_OUT4 → C89 → U15 B → C87/R64 → AES1 BNC; AES2 (120) → R92 → AES_OUT3 → U15 A → C85/R59 → AES2 BNC. P3/P4 through 30 Ω series and 1 kΩ to ground.', svg:()=> row(60,'FPGA 119 “AES1”','R91 · AES_OUT4 · U15 B (EL5263)','→ AES1 BNC (R64 75 Ω)') + row(110,'FPGA 120 “AES2”','R92 · AES_OUT3 · U15 A','→ AES2 BNC (R59 75 Ω)')
     + row(170,'OUT_P3_1–4 (184–181)','30 Ω R80/R77/R79/R75 · 1 kΩ','→ P3 1–4') + row(220,'OUT_P4_1–4 (187,186,185,200)','30 Ω R76/R81/R78/R82 · 1 kΩ','→ P4 1–4')
     + row(280,'CPU_RX / CPU_TX, PF2','U8 ADM3485 (half duplex)','→ P2 1/2') + row(330,'CPU_TX, PF3','U10 ADM3485 (TX only)','→ P2 3/4') + row(380,'+12V','P1 PAN300 · F1 RXE050','→ LM2596 REG2') + row(430,'TP1–TP7','H1 2×4','test header (TP5 mclk2 · TP6 v · TP7 sd_hd)')},
  {name:'6 · Power', note:'Regulators from the BOM and the netlist rail names.', svg:()=> row(60,'+12V (P1-3)','F1 RXE050 polyfuse → D5 SK33','→ REG2 LM2596 + PE-53823') + row(110,'REG2 out','LM2596 switcher','→ +5V (U15 EL5263)') + row(160,'+5V','REG1 LM1117-3.3','→ VCC_1 (GS1560, GS1528)') + row(210,'+5V','REG5 LM1117-3.3','→ 3V (MCU, FPGA I/O, ADM3485, ICS662)')
     + row(260,'+5V / 3V','REG3 LM1117-ADJ','→ 1.8V (GS1560 core)') + row(310,'+5V / 3V','REG4 LM1117-ADJ','→ VCC_INT (Cyclone core, 1.5 V '+'inferred'+')') + row(360,'EQ_VCC','FB / L','→ GS1574 pins 13/16')},
  {name:'7 · FPGA top level (pod31.bdf)', note:'Instances and nets read out of v301/pod31.bdf with a geometric netlist extraction (wires joined at end points and by name). Unconnected outputs listed are really open in the BDF.', svg:()=> {
     let s=''; const bx=(x,y,w,h,t,l)=>{ s+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="var(--panel2)" stroke="var(--ink)"/><text x="${x+6}" y="${y+15}" font-size="11.5" font-weight="700" fill="var(--ink)">${t}</text>`+l.map((q,i)=>`<text x="${x+6}" y="${y+30+i*13}" font-size="9.5" fill="var(--ink2)">${q}</text>`).join(''); };
     bx(20,20,200,120,'inst46/58/59 shift_in ×3',['ALTER9 → data_in, ALTER5 clock, ALTER7 strobe','inst46: group_sel q0–2, group_sel2 q3–5,','  sdi_lock q6 (open!), aes_on q8–q15','inst58: res1_1–4,res1_g q0–4; res2_* q5–9','inst59: PGP…RESET_552 (CAT552 pins)']);
     bx(240,20,200,120,'inst43 SDdemux',['Yin, clkin = pclk, audio_clock = mclk2','altera0–4 = res1_*  · altera5/6 clocks','altera10 → ALTERA1, altera11 → ALTERA11','AUDIO_1–4 I2S → SD_HD_SEL','groupsel0–3 from HD_group_sel']);
     bx(460,20,200,120,'inst3 group_detectorHD',['data = Cinb (dff10 inst32)','didin/didin2 from inst1/inst79','audio1/audio2 → dcfifo0 inst9/16/75/76','group1/2 → hd_group_detect inst12/13','srclock1/2 → VCXO loops']);
     bx(680,20,200,120,'inst62 shifter_out_48bit',['cntrl_status[8] = enableHD','cntrl_status[9] = enableHD2','others open (0) → ALTERA13,15–17 = 0','bits 40–47 = 1010 1000','→ ALTERA12 pin']);
     bx(20,170,200,110,'inst2/inst17 SD_HD_SEL',['sd = ALTER15','HD: I2S_64_par_ser_reva inst49/8/66/68','SD: SDdemux AUDIO_1–4 / LRCK / SCLK','→ i2sx4_aes inst4 / inst5']);
     bx(240,170,200,110,'inst4/inst5 i2sx4_aes',['u1/c1/v1 → GND','aes3/aes4, i2s3/i2s4 open','tcb, test open','→ AES_enable inst40 / inst80']);
     bx(460,170,200,110,'inst40/80 AES_enable + inst6 swap',['SD: & aes_on (MCU)','HD: & enableHD / enableHD2','inst6 swap ← inst1 swap (bit 0)','→ AES1/2, OUT_P3_*, OUT_P4_*']);
     bx(680,170,200,110,'clocks',['inst altpll1: c0 → lpm_counter0 (mod 500)','  c1 → pll1700_27out; locked open','inst25/42 I2S_Generator from mclk/mclk2','inst28/47 PDF_DETECTOR → up/down pins','inst30/48 stabalizer']);
     bx(20,310,860,70,'open / unused in v301',['Inputs ALTER0, ALTER2–4, ALTER8, ALTER13, pll1700_aclk; outputs TP1–TP4, ALTERA10; nets sdi_lock, cat0/cat1/os0/os1, aes_on[5..8], swap2, h; inst28/47 PDF_OUT; inst24/55 AND2 outputs;',' the Dolby CAT552 outputs PGP, PLS, PLE, DLM0–2, PRG0–2, MAP0–1, RESET_552 exist in the BDF but have no pin assignment in v105.qsf.']);
     return s; }},
];
function viewSchem(m){
  window.__demux3Active = false;
  m.innerHTML = card('Schematic set — REDRAWN from the P-CAD netlist, BOM, .qsf and pod31.bdf (not the original CAD)', `<div id="st" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p>
    <p class="small muted">Original sheets: <span class="mono">DEMUX-3 - #PCB/DEMUX-3ISS4.sch</span> (P-CAD) and <span class="mono">WORKING/Imported DEMUX-3ISS4.PRJPCB/Sheet1–5.SCHDOC</span> (Altium import, Jul 2009|42); issue 5 in <span class="mono">Imported DEMUX-3ISS5.PRJPCB</span>. Blue labels are nets.</p>`);
  const draw=()=>{ m.querySelector('#st').innerHTML=SHEETS.map((s,k)=>`<button class="${k===D.sheet?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#st button').forEach(b=>b.onclick=()=>{ D.sheet=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 900 480" style="width:100%;min-width:700px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="888" height="468" fill="none" stroke="var(--line)"/><text x="880" y="465" text-anchor="end" font-size="10" fill="var(--ink2)">DEMUX-3 ISS4 · redrawn sheet ${D.sheet+1}/${SHEETS.length} · ${SIM.year(2026)}</text>${SHEETS[D.sheet].svg()}</svg>`;
    m.querySelector('#sn').textContent=SHEETS[D.sheet].note; };
  draw();
}

/* ---------------- software ---------------- */
const CHAIN = [ // 48 bits written MSB first: first byte ends deepest (inst59)
  ['dolby_upper','inst59 q15–q8','RESET_552 · os1 · os0 · cat1 · cat0 · MAP1 · MAP0 · PRG2','0x87 (DOLBY_INITIALIZATION) — CAT552 pins with no package pin'],
  ['dolby_lower','inst59 q7–q0','PRG1 · PRG0 · DLM2–0 · PLE · PLS · PGP','0xFF'],
  ['reset_data_upper','inst58 q15–q8','— · — · — · — · — · — · res2_g (q9) · res2_4 (q8)','RESET_VECTOR1 bits 4..3'],
  ['reset_data_lower','inst58 q7–q0','res2_3 · res2_2 · res2_1 · res1_g · res1_4 · res1_3 · res1_2 · res1_1','RESET_VECTOR1 bits 2..0 · RESET_VECTOR bits 4..0'],
  ['AUDIO_INFORMATION','inst46 q15–q8','aes_on2 · aes_on1 · aes_on4 · aes_on3 · aes_on6 · aes_on5 · aes_on8 · aes_on7','bits 7..4 = AUDIO2,1,4,3 (5–8 open)'],
  ['group_data','inst46 q7–q0','— · sdi_lock · group_sel2[2..0] · group_sel[2..0]','audio_select1 | audio_select2<<3 | CD<<6'],
];
const FLOWG = [[0,'UART: receive · process_uart · transmit_counter','init = YES → goto loop'],[1,'GS1560 status → LEDs, CD','PROCESS_SDI_LOCK_STATUS'],[2,'CD debounce (result unused)','switch1'],[3,'AUDIO_INFORMATION','AUDIO1–4 of last pass'],[4,'ALTERA_write','48 bits'],[5,'ALTERA_read','144 bits'],[6,'AUDIO1/2','ALTERA1–4 or ALTERA14'],[7,'0xA0 alignment','ERROR2 (unused)'],[8,'sample compare G1','ERROR3/4'],[9,'AUDIO3/4',''],[10,'sample compare G2','ERROR2_3/2_4'],[11,'RESET_VECTOR','group · standard'],[12,'RESET_VECTOR1','only bit 4 is wired']];
function viewSoft(m){
  window.__demux3Active = true;
  m.innerHTML = `${card('Main loop (live: the step under the playhead is highlighted; click a step)', `<div id="flow"></div>`)}
    <div class="grid2">${card('Inside the step', `<div id="stepi"></div>`)}${card('RS-485 protocol of this build', `<div id="proto"></div>`)}</div>
    ${card('Error debounce state machines (TRANSLATE → DEBOUNCE → PROCESS)', `<div id="fsm"></div>`)}
    ${card('ALTERA_write: the 48-bit chain (three shift_in blocks, value at the playhead)', `<div id="chain" class="scroll"></div>`)}
    ${card('FPGA datapath (pod31.bdf) — live', `<div id="pipe" class="scroll"></div>`)}
    ${card('Firmware family (diffed against v400)', `<div id="fam" class="scroll"></div>`)}`;
  const draw=()=>{
    const t=absT(), p=passAt(t), st=stepAt(p,t), ms=mcuState(t), fp=fullPassAt(t), M=fp? fp.s : null, B=BUILDS[D.build];
    const cur = ms==='loop'? st : (ms==='init'?0:null);
    const W=900, bw=128, bh=56; let s=`<svg viewBox="0 0 ${W} 300" style="width:100%">`;
    FLOWG.forEach(([k,a,b],i)=>{ const col=i%7, rw=Math.floor(i/7), x=10+col*bw, y=20+rw*110, on=cur===k, sel=D.selStep===k;
      s+=`<g data-s="${k}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${bw-14}" height="${bh+20}" rx="8" fill="${on?'color-mix(in srgb,var(--accent) 28%,var(--panel2))':'var(--panel2)'}" stroke="${sel?'var(--warn)':on?'var(--accent)':'var(--line)'}" stroke-width="${on||sel?2.5:1.2}"/>
        <text x="${x+6}" y="${y+16}" font-size="10" fill="var(--ink2)">step ${k}</text><foreignObject x="${x+4}" y="${y+20}" width="${bw-22}" height="${bh}"><div xmlns="http://www.w3.org/1999/xhtml" style="font-size:10.5px;line-height:1.2;color:var(--ink)"><b>${a}</b><br><span style="color:var(--ink2)">${b}</span></div></foreignObject></g>`;
      if (i<FLOWG.length-1 && col<6) s+=`<line x1="${x+bw-14}" y1="${y+38}" x2="${x+bw}" y2="${y+38}" stroke="var(--ink2)"/>`; });
    s+=`<path d="M ${10+5*bw+bw/2} ${20+110+bh+20} V 280 H 60 V ${20+bh+20}" fill="none" stroke="var(--ink2)" stroke-dasharray="4 3"/><text x="70" y="275" font-size="10" fill="var(--ink2)">while(1) — WDR() at steps 0, 1, 6, 9; Timer0 ISR can cut in anywhere</text></svg>`;
    m.querySelector('#flow').innerHTML = s + `<p class="small muted">${ms==='init_loop'?'<b>v201-4 init_loop</b>: only WDR, UART0_receive, process_uart and UART0_transmit_counter run until power_up_test_complete.':ms==='init'?'init = YES: the pass ends after step 0.':''} ${B.proto==='pod19'?'POD19 build: readgroupselect() runs after step 12.':''}</p>`;
    m.querySelectorAll('[data-s]').forEach(g=>g.onclick=()=>{ D.selStep=+g.dataset.s; draw(); });
    const k = D.selStep!==null? D.selStep : (cur===null?0:cur);
    m.querySelector('#stepi').innerHTML = `<h3>Step ${k}: ${STEPS[k][0]}</h3><p class="small">${STEP_TXT[k]}</p><p class="small muted">${STEPS[k][1]} cycles ≈ ${SIM.fmtDur(STEPS[k][1]*CYC)}${k>=4&&k<=5?' (counted from the listing)':' ('+inf+')'}.</p>`
      + (M? `<p class="small mono">CD=${M.CD} AUDIO=${M.AUDIO.join('')} AI=0x${hex(M.AI)} RV=0x${hex(M.RV)} RV1=0x${hex(M.RV1)} ERROR5=${M.ERROR5} ERROR6=${M.ERROR6} ERROR2_6=${M.ERROR2_6}</p>` : '');
    m.querySelector('#fsm').innerHTML = M? `<table class="kv"><tr><th></th><th>check</th><th>switch</th><th>release · counter</th><th>RESET · counter</th><th>ERROR</th></tr>${[[2,'ALIGNMENT (0xA0)','ERROR2'],[3,'AES1 A vs B','ERROR3'],[4,'AES2 A vs B','ERROR4'],[23,'G2 AES3 A vs B','ERROR2_3'],[24,'G2 AES4 A vs B','ERROR2_4']].map(([k2,l,e])=>`<tr><td>${l}</td><td class="mono">${k2===2?M.ERROR2:M.CHK[k2]}</td><td class="mono">${M.sw[k2]}</td><td class="mono">${M.rel[k2]} · ${M.swc[k2]}/255</td><td class="mono">${M.RESET[k2]} · ${M.errc[k2]}/${k2===2?255:500}</td><td class="mono">${k2===2?'— (unused)':M[e]}</td></tr>`).join('')}</table>
      <p class="small">A bad check sets <span class="mono">release</span>; 255 bad passes in a row clear <span class="mono">switch</span>; then PROCESS_SAMPLExx_COMPARE sets <span class="mono">RESET = 1, ERROR = 0</span> (reset the FIFO pair). One good check sets <span class="mono">switch = 1</span> and the next pass <span class="mono">ERROR = 1</span>. If it stays bad, RESET drops after 500 more passes and the cycle repeats.${B.fix56?'':' <b>v400:</b> PROCESS_SAMPLE56_COMPARE tests <span class="mono">RESET3</span> instead of <span class="mono">RESET2_3</span> in its first branch (fixed in v202, lost again).'}</p>` : '—';
    m.querySelector('#proto').innerHTML = B.proto==='poll'? `<table class="kv"><tr><th>host → board</th><td class="mono">byte 1 (bit 7 = 1), byte 2 (bit 7 = 0)</td></tr><tr><th>0xE8, x</th><td>${B.e8?'reply 0xE0, init = YES (power-up test)':'<b>not handled</b> (“Ali-Rem”): taken as select 0xE8 → Group 1, reply 0x00/0x02'}</td></tr><tr><th>0xE0–0xFF, x</th><td>audio_select1 = byte & 0x06 · reply 0x02 if CD = 0 else 0x00</td></tr><tr><th>reply delay</th><td>${B.txHD} passes (HD or no CD), 7 (SD) · PF2 back to RX after the same count again</td></tr><tr><th>drivers</th><td>U8 (P2-1/2) switched by PF2 · U10 (P2-3/4) always on</td></tr></table>`
      : B.proto==='isr'? `<table class="kv"><tr><th>every byte</th><td>uart0_rx_isr stores it; if UDRE0: reply SD 0x70|AUDIO-none|noCD<<1, HD 0x30|noCD<<1</td></tr><tr><th>after 11 bytes</th><td>process_uart: 0x88 → UDR0 = 0xE0; bit 7 set → group_sel, audio_select1</td></tr><tr><th>buffer</th><td>uart0_rx[10] but the pointer wraps at &uart0_rx[11]: one byte is written past the array</td></tr><tr><th>drivers</th><td>PF2 never set: replies only on U10 (P2-3/4)</td></tr></table>`
      : `<p class="small">No UART. DEMUX3 P2: 1 = PE5 group LSB, 2 = PE2 group MSB, 3 = PE1 SDI lock LED, 4 = PE0 audio lock LED (header comment, Peter L., Jun 28 2010).</p>`;
    const vals = M? [0x87, 0xFF, ((M.RV1<<5|M.RV)>>8)&0xFF, (M.RV1<<5|M.RV)&0xFF, M.AI, M.gd] : [0,0,0,0,0,0];
    m.querySelector('#chain').innerHTML = `<table class="kv"><tr><th>#</th><th>C variable</th><th>lands in</th><th>bits (MSB → LSB)</th><th>value</th><th>notes</th></tr>${CHAIN.map((c,i)=>`<tr><td>${i+1}</td><td class="mono">${c[0]}</td><td class="mono small">${c[1]}</td><td class="small">${c[2]}</td><td class="mono">${bin(vals[i])}</td><td class="small">${c[3]}</td></tr>`).join('')}</table><p class="small muted">write_data() shifts MSB first on ALTER9 with ALTER5 as the clock, then STROBE_WRITE (ALTER7) copies the 48 bits to the q outputs. The first byte written ends up at the far end of the chain.</p>`;
    m.querySelector('#pipe').innerHTML = pipeSVG(t);
    m.querySelector('#fam').innerHTML = `<table class="kv"><tr><th>build (file)</th><th>date</th><th>UART</th><th>0xE8→0xE0</th><th>init_loop</th><th>GROUP_CONSTANT</th><th>Tx HD</th><th>CD in reset</th><th>CD mute</th><th>RESET2_3 typo</th></tr>
      ${[['Released/v100 demux3_main.c','Aug 2005','ISR','0x88','–','–','–','no','no','no (different code)'],['v200-ams4','May 2006','poll','yes','no','3','10','no','no','yes'],['v201','May 2006','ISR','0x88','no','–','–','no','no','yes'],['v201-4','Oct 2006','poll','yes','<b>yes</b>','3','7','no','no','yes'],['v201-aip8-2a','Jan 2007','ISR (2 selects)','0x88','no','–','–','no','no','yes'],['v202 (= test)','May 2009','ISR','0x88','no','–','–','<b>yes</b>','no','fixed'],['v203','Aug 2009','ISR','0x88','no','–','–','yes','<b>yes</b>','fixed'],['v203-POD19','Jun 2010','none','–','–','–','–','yes','yes','fixed'],['v204','Apr 2011','poll','<b>removed</b>','no','10','10','no','no','yes'],['v400','Aug 2011','poll','yes','removed','3','7','no','no','yes']].map(r=>`<tr>${r.map(x=>`<td class="small">${x}</td>`).join('')}</tr>`).join('')}</table>
      <p class="small muted">v400 differs from v201-4 in exactly two lines (the init_loop is commented “Ali-Rem”). Columns read from the source with grep; “–” = not applicable.</p>`;
  };
  SIM.on('time', draw);
}
const STEP_TXT = [
  'WDR(); uart_rx_data0 = UART0_receive() (one byte if RXC0, else an uninitialised local); process_uart() assembles the two-byte frame; UART0_transmit_counter() counts passes, then PF2 = 1 + UDR0, then PF2 = 0. If init == YES the loop jumps back here.',
  'READ_GS1560_STATUS(): rc_byp = PINE & BIT7, lock60 = PIND & BIT2, smpte = PING & BIT3, sd_hd = PIND & BIT7. PROCESS_SDI_LOCK_STATUS(): all three → yellow LED, CD = 1; else red LED, CD = 0. PROCESS_HD_SD_CONTROL(): copies SD/HD to PB7 (ALTERA15) and the inverse to PG4 (GS1560 20/10-bit).',
  'TRANSLATE_INPUT(CD) / DEBOUNCE_INPUT(): a 255-pass debounce of CD into switch1 — which nothing reads.',
  'PROCESS_AUDIO_INFORMATION(): AUDIO_INFORMATION = 255, then clears bits 7/6/5/4 (and 3/2/1/0) for AUDIO2/1/4/3 = NO_LOCK. In SD these become the AES enables. v203 adds “if (CD == 0) AUDIO_INFORMATION = 0x00”.',
  'ALTERA_write(): write_data(dolby_upper, dolby_lower, reset_data_upper, reset_data_lower, AUDIO_INFORMATION, group_data), then STROBE_WRITE low-high-low. Each bit: set PB1, PC5 high, PC5 low.',
  'ALTERA_read(): STROBE_READ pulse, six read_data() from PC1 (SDdemux altera10, group 1 status); pulse, six read_data1() from PB3 (altera11, group 2); pulse, six read_data2() from PB4 (shifter_out_48bit). Each bit: PC5 high, PC5 low, shift, sample the pin.',
  'AUDIO1 = Audio1_Detect(ALTERA1, ALTERA2, sd_hd): SD → bit 7 of either byte and CD; HD → ALTERA14 bit 7 (HD_AUDIO_LOCK_PIN1) and CD. Audio2_Detect also uses PIN1 in HD. PROCESS_AUDIO1/2_DETECT() are empty (LED code commented out).',
  'ERROR2 = ALIGNMENT_CHECK(ALTERA6): (byte & 0xF0) == 0xA0. TRANSLATE_ERROR2, DEBOUNCE_ERROR2, PROCESS_ALIGNMENT_CHECK move RESET2 and error2_counter — but CONFIGURE_ALTERA() is commented out and RESET2 is never used.',
  'COMPARE_AUDIO1_AUDIO2(): SAMPLE_COUNT(AUDIO1, ALTERA1/2) = byte & 0x7F (FIFO wrusedw), SAMPLE_COMPARE(CD, a, b) = |a − b|; > COUNT_DIFFERENCE_MAX (2) → 0. Then TRANSLATE_ERROR3 / DEBOUNCE_ERROR3 / PROCESS_SAMPLE12_COMPARE, and the same for AES2 (ERROR4).',
  'AUDIO3 = Audio3_Detect(ALTERA7, ALTERA8, sd_hd), AUDIO4 = Audio4_Detect(ALTERA9, ALTERA10, sd_hd): HD uses ALTERA14 bit 6 (HD_AUDIO_LOCK_PIN2).',
  'COMPARE_AUDIO5_AUDIO6 / 7_8 for the second group, PROCESS_SAMPLE56_COMPARE (first branch tests RESET3 — typo in v400) and PROCESS_SAMPLE78_COMPARE.',
  'PROCESS_GROUP_COMPARE1(): (audio_select1 & 6)>>1 changed → ERROR5 = 0. PROCESS_HD_SD_COMPARE(): sd_hd changed → ERROR6 = ERROR2_6 = 0. RESET_VECTOR = TRANSLATE_RESET_VECTOR(ERROR3, ERROR4, ERROR2_3, ERROR2_4, ERROR5, ERROR6): bits 0–3 per FIFO pair, bit 4 low for 255 passes on a group or standard change.',
  'PROCESS_GROUP_COMPARE2() (also from audio_select1), PROCESS_HD_SD_COMPARE() again — now always “no change”, so ERROR2_6 = 1 — then RESET_VECTOR1 = TRANSLATE_RESET_VECTOR1(ERROR2_3, ERROR2_3, ERROR2_3, ERROR2_3, ERROR2_5, ERROR2_6). Only its bit 4 (res2_g) is wired in the FPGA.',
];
function pipeSVG(t){
  const w=world(t), p=lastWrite(t), sd=p? !!(p.F.sdPin&0x80) : true, vid=vidOK(t), F=p? p.F : null;
  const on=(c)=>c?'var(--accent)':'var(--grid)';
  const box=(x,y,w2,h,t1,t2,lit)=>`<rect x="${x}" y="${y}" width="${w2}" height="${h}" rx="6" fill="var(--panel2)" stroke="${lit?'var(--accent)':'var(--line)'}" stroke-width="${lit?2:1}"/><text x="${x+6}" y="${y+15}" font-size="11" font-weight="700" fill="var(--ink)">${t1}</text><text x="${x+6}" y="${y+29}" font-size="9.5" fill="var(--ink2)">${t2}</text>`;
  const ar=(x1,y1,x2,y2,lit)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${lit?'var(--accent)':'var(--ink2)'}" stroke-width="${lit?2:1}" marker-end="url(#d3ar2)"/>`;
  const g1=F? (F.gd&7)>>1 : 0, g2=F? ((F.gd>>3)&7)>>1 : 1;
  const fifo = F? F.fifo.map(q=>q.st).join(' / ') : '—';
  return `<svg viewBox="0 0 960 330" style="width:100%;min-width:760px"><defs><marker id="d3ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
    ${box(10,20,140,40,'Yin[9..0] 27 MHz','GS1560 10-bit (SD)',vid&&sd)} ${box(10,170,140,40,'Cin → dff10','GS1560 20-bit (HD)',vid&&!sd)}
    ${box(180,10,170,60,'group_detector','ADF+DID G'+(g1+1)+'/G'+(g2+1)+' · 3 words/sample',vid&&sd)} ${box(380,10,170,60,'8 × SD403_FIFO','pairs: '+fifo,vid&&sd)}
    ${box(580,10,150,60,'I2S_shifter ×4','20 bits, LRCK = mclk2/256',vid&&sd)}
    ${box(180,160,170,60,'group_detectorHD','DID '+DID.hd[g1]+' / '+DID.hd[g2]+' · CLK → srclock',vid&&!sd)} ${box(380,160,170,60,'4 × dcfifo0 64×64','enableHD '+(F?F.enHD.join('/'):'—')+(F&&F.hdrst.some(x=>x)?' · res_g!':''),vid&&!sd)}
    ${box(580,160,150,60,'I2S_64_par_ser_reva','24 bits, LRCK = mclk/256',vid&&!sd)}
    ${box(760,85,180,60,'SD_HD_SEL → i2sx4_aes','ALTERA15 = '+(sd?'1 (SD)':'0 (HD)'),!inCfg(t))}
    ${box(760,200,180,60,'AES_enable · swap','AES1 '+(outState(0,t).on?'on':'off')+' · AES2 '+(outState(1,t).on?'on':'off'),outState(0,t).on)}
    ${box(380,240,170,50,'VCXO ×2 + PDF_DETECTOR', sd?'ref: 24 MHz ÷ 500 = 48 kHz':'ref: srclock (HD CLK words)',!inCfg(t))}
    ${ar(150,40,180,40,vid&&sd)}${ar(350,40,380,40,vid&&sd)}${ar(550,40,580,40,vid&&sd)}${ar(730,40,800,85,vid&&sd)}
    ${ar(150,190,180,190,vid&&!sd)}${ar(350,190,380,190,vid&&!sd)}${ar(550,190,580,190,vid&&!sd)}${ar(730,190,800,145,vid&&!sd)}${ar(850,145,850,200,outState(0,t).on)}
    ${ar(465,240,665,220,!inCfg(t))}<text x="10" y="322" font-size="10" fill="var(--ink2)">Green = carrying data at the playhead. FIFO pair states come from the RESET_VECTOR the MCU last wrote and the field-aligned release (start_pulse).</text></svg>`;
}

/* ---------------- findings ---------------- */
function viewFindings(m){
  window.__demux3Active = false;
  const F_ = (h,b)=>`<li><b>${h}</b> ${b}</li>`;
  m.innerHTML = card('What the DEMUX-3 firmware and FPGA are really up to', `<ol class="small" style="line-height:1.5">
    ${F_('Artwork 2026|59: the AMS8-1 rear (DEMUX-3 section) now comes from '+SIM.src(REAR_SILK,'AMS81-DEMUX3rearsilk-CURVE.cdr')+' (29 Jun 2006).', 'The silk has no DEMUX-3 panel of its own: the board appears as six openings on the AMS8-1 rear, labelled SDI IN, SDI OUT, AES1, AES2, DOLBY E METADATA and SERIAL COMM, plus an AUX DB-25. The silk carries only labels, so connector outlines come from '+SIM.src(REAR_VIEW,'AMS81-DEMUX3-REARVIEW.cdr')+' (2009), drawn on the same sheet origin. The rear silk names the unit “AMS-81”. The same CURVE file is stored three times (TIM/SILK and two “Older Drawings” folders, identical bytes); the 2005 '+SIM.src('AMS8 #Engineering #TIM/SILK/AMS81-DEMUX3rearsilk.cdr','non-curve original')+' and its Backup_of_ copy are older. The board’s two group-2 outputs (P3/P4) have no BNC of their own on this panel; whether they reach AUX is '+inf+'.')}
 is the 2006 v201-4 with two lines commented out.', 'A diff of <span class="mono">v400/demux3_v400.c</span> against <span class="mono">v201-4/demux_201-4.c</span> (13 Oct 2006) differs only in “/*Ali-Rem Start init_loop: … goto init_loop; //Ali-Rem End */”. The DMS1 and XTM4 test reports (16 Aug 2011, 27 Apr 2012) say v400 / firmware 4.0.0.0 fixed communication problems and front-panel freezes in SDI mode; in code terms the fix was dropping the wait-for-0xE8 loop and going back to the 2006 source. The archive README describes v204 → v400 as “GROUP_CONSTANT 3 → 10” — it is the other way round: v204 has 10 (“Ali-Add”), v400 has 3.')}
    ${F_('v400 lost every v202/v203 fix.', 'v202 added <span class="mono">|| (CD == 0)</span> to TRANSLATE_RESET_VECTOR(1), corrected <span class="mono">RESET3 → RESET2_3</span> in PROCESS_SAMPLE56_COMPARE and widened the reset counters; v203 added “if (CD == 0) AUDIO_INFORMATION = 0x00”. v204 and v400 come from the other (polled-UART) branch and have none of them. See the family table on the Software tab.')}
    ${F_('HD audio is not muted when the cable is pulled (v400).', `In HD, <span class="mono">AES_enable</span> follows <span class="mono">enableHD</span> from <span class="mono">hd_group_detect.vhd</span>, which only clears after 8 rising edges of “vertical” — derived from the video itself. With no video there are no edges, so enableHD stays 1 and the outputs keep serialising the last FIFO word; with no CD term in v400’s reset vector the MCU never clears the dcfifo0s (${inf}: content). RD60’s copy of pod31.bdf gates the four serialisers with <span class="mono">sdi_lock</span> — exactly this hole.`)}
    ${F_('sdi_lock is wired in the chain but goes nowhere.', 'group_data bit 6 (CD) lands on <span class="mono">inst46 q6 = sdi_lock</span>, which no block uses in the DEMUX3 master v301. Selecting Group 4 makes audio_select2 = 8: its bit 3 also lands on q6, and group_sel2 becomes 000 → the second group wraps to Group 1.')}
    ${F_('RESET_VECTOR1 never sees a standard change.', 'main() calls PROCESS_HD_SD_COMPARE() twice per pass; the second call always finds sd_hd unchanged and sets ERROR2_6 = 1 just before TRANSLATE_RESET_VECTOR1. It is also called with ERROR2_3 four times (ERROR2_4 ignored). Only bit 4 of RESET_VECTOR1 (res2_g, the HD group-2 FIFOs) is wired, so the HD group-2 FIFOs are reset on a group change but not on an SD↔HD change.')}
    ${F_('All four SD FIFO pairs hang off RESET_VECTOR bits 0–3.', 'In SDdemux.bdf, reset.vhd ANDs altera0–3 with altera4 (res1_g); res2_1–4 from RESET_VECTOR1 are unconnected. That is why TRANSLATE_RESET_VECTOR takes ERROR3, ERROR4, ERROR2_3, ERROR2_4: bit 2/3 reset the second group’s SD pairs. Reset release is synchronised: RESETn DFFs re-arm only on start_pulse, 8 lines into the next field.')}
    ${F_('The group debounce feeds a variable nobody reads.', 'process_uart() sets audio_select1 directly from each frame; GROUP_CONSTANT only debounces <span class="mono">group_sel</span>, which nothing uses. Ali’s v204 change 3 → 10 therefore had no effect on audio. The line “if ((uart_tx_data0 & BIT0) == 0) pgroup_sel |= BIT0” tests a transmit counter, not data.')}
    ${F_('The 0xE0 power-up reply is cut short on the half-duplex pair.', `While init = YES each pass is only the UART calls (≈${SIM.fmtDur(INIT_PASS_T)}). UART0_transmit_counter() turns U8 on (PF2), writes UDR0 and seven short passes later tests UDRE0 — set as soon as the byte moves into the shift register — and turns U8 off ≈0.2 ms into a 1.04 ms byte. U10 (PF3, always on) still carries it on P2-3/4. Normal replies are safe because the second count spans ≈7 ms. (Wiring from DEMUX-3ISS4.net; effect on a 2-wire host ${inf}.)`)}
    ${F_('ALTERA_RESET() reconfigures the FPGA.', 'Its comments say “altera in reset”, but PG2 = ALTERA_RESET → R69 → Q1 2N4401 → N_CONFIG: the Cyclone throws its configuration away and reloads from the M25P40. Its “PORTC |= 0x1F //SET SD RESETS” drives ALTERA0–4; the v301 FPGA leaves ALTER0, ALTER2–4 unconnected (the resets moved into the serial chain, readme.doc: “Made the CD a trigger for the global RESET VECTOR”).')}
    ${F_('The FPGA is the POD31 Dolby design.', 'The Quartus top entity is <span class="mono">pod31</span>; the chain still carries dolby_upper/dolby_lower to CAT552 pins (PGP, PLS, PLE, DLM, PRG, MAP, RESET_552) that have no assignment in v105.qsf, so Quartus would place them on free pins on its own. demux3_v400.c declares ≈400 RAW_ Dolby metadata variables and prototypes for 40 Dolby conversion routines that are never called; Released/v101 even ships <span class="mono">pod31_main.c</span>.')}
    ${F_('Clever bit-order trick in the status read.', 'SDdemux.bdf wires latch7 <span class="mono">output[6..0]</span> to <span class="mono">STATUS[1..7]</span>; shifter_out_48bit sends bit 0 first and read_data() shifts left, so each byte arrives as CHn in bit 7 and wrusedw[6..0] in bits 6..0 with no bit reversal in software. Every 48-bit block ends with 1010 1000 (0xA8); only ALTERA6 is checked, and only its high nibble (0xA0).')}
    ${F_('Latency differs by a factor of four.', 'SD FIFO reading starts when SD403_FIFO wrusedw bit 6 sets (64 of 128 words ≈ 1.33 ms); HD when dcfifo0 wrusedw bit 4 sets (16 of 64 ≈ 0.33 ms). SD audio is 20-bit (I2S_shifter takes the X/X+1/X+2 words, no AUX); HD is 24-bit.')}
    ${F_('HD clock recovery hard-codes 2200.', `group_detectorHD rebuilds each sample instant from the CLK words plus a line counter; when the CLK word’s bit 12 is 0 it adds “00100010011000” = 2200 clocks — one 1080-line 59.94/60 Hz line. 1080i50 lines are 2640 and 720p lines 1650 clocks, so those formats would feed a wrong phase to the VCXO loop (${inf}). The counter is reloaded with 840 at every EAV.`)}
    ${F_('The swap is dead in v400.', 'process_uart masks the select byte with 0x06, so HD_group_sel.swap is always 0 and P3 carries the same group-1 pairs as P4. Released/v100 says “Use P3 for AMS81 and AMS82 … P4 for XTM4 and AMS4”.')}
    ${F_('Unused parts and pins on issue 4.', 'ICS662-03 (U6) is fitted but its FPGA pins 65, 66, 67, 68, 74, 75 are unassigned in every v301 .qsf; PLL1705 (U4) is DNI while pll1700_27out / pll1700_aclk stay in the qsf (v105: “use external PLL instead of PLL1705”); the GS1560 GSPI is wired to PD3–PD6 but only CS_60 is driven (high). DEMUX-4 later reuses the ICS662 → HDCLK idea.')}
    ${F_('Names that do not match.', 'FPGA “AES1”/“AES2” (pins 119/120) are board nets AES_OUT4/AES_OUT3; the qsf mixes ALTER0, ALTERA1, altera14; PDF_DETECTOR’s “up” drives the pin called down1 and vice versa; the BOM lists an EP1C12 in an “EP1C6-240” footprint and an M25P40 in an “EPCS1” footprint. The README’s EP1C6T144C7 belongs to the SD403iss1 sub-project.')}
    ${F_('Two copies of “group selector.vhd”.', 'The one in <span class="mono">sd demux/</span> only drives fifo_write0–3 (group 2 outputs undriven); the top-level copy (listed in v105.qsf) drives all eight. Which one Quartus uses depends on file order and USER_LIBRARIES.')}
    ${F_('Small code smells.', 'UART0_receive() returns an uninitialised local when nothing arrived; SAMPLE_COMPARE’s “else i = 0xFF” is unreachable; TRANSLATE_INPUT/DEBOUNCE_INPUT compute switch1 that nothing reads; PROCESS_ALIGNMENT_CHECK runs but CONFIGURE_ALTERA() is commented out; the ISR builds wrap their 10-byte buffer at &uart0_rx[11], writing one byte past it and acting only every 11 bytes.')}
    ${F_('Test-report history.', 'DEMUX3-V2004-18AUG10: “Altera software was changed to V301 from V302 to fix a problem … audio artifacts on AES4 CH2” — v302 is not in the archive; the WBS listing calls it “v301 fixed audio artifacts”. DEMUX3-V1003-CABLE LENGTH (issue 3) has a hand-written table where SD is “noisy on all chans” at some lengths and HD goes “noisy (severe)” then “no lock” on longer runs (lengths partly illegible). The form’s own spec: HD 100 m, SD 350 m.')}
    ${F_('Archive gaps.', '<span class="mono">WORKING/Imported DEMUX-3ISS4.PRJPCB/Assembly Drawings.pdf</span> is 0 bytes; the board artwork here comes from <span class="mono">Project Outputs…/DEMUX-3ISS4.PDF</span>. Both “SOFTWARE HISTORY.xls” files are empty workbooks. Prebuilt .hex/.pof files were removed in the 2026|59 clean-up.')}
  </ol>`) + card('Main assumptions (marked inferred on screen)', `<ul class="small"><li>Non-I/O main-loop steps: cycle counts estimated from function sizes in V400.mp (the read/write bit loops are counted from the listing).</li><li>GS1560 lock time ${SIM.fmtDur(T_GSLOCK)}, Cyclone POR ${SIM.fmtDur(T_POR)}, AS load ≈${SIM.fmtDur(T_CFG)} (2.3 Mbit at 20 MHz), ATmega start-up ${SIM.fmtDur(T_MCU)}.</li><li>Host cadence: XTM4/DMS1 frames every 55 ms, AMS8 bytes every 10 ms, probe at 0.3 s after power; second frame byte 0x55.</li><li>FPGA I/O read as 0xFF while unconfigured; FIFO fill jitter ±1; CHn needs one field of packets.</li><li>Embedded audio = 200·n Hz tones at −12 dBFS; “stale” output is drawn as a constant.</li><li>Board colours (green mask, white legend) — the assembly drawing is monochrome.</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>#DEMUX #SERIES/XXX - DEMUX3 - #Master #OBSOLETE/README.md</li><li>…/DEMUX-3 - #software/DEMUX-3 - #atmel/{v400,v204,v203,v203-POD19,v202,v201,v201-4,v200-ams4,v201-aip8-2a,test,Released/v100,v101}</li><li>…/DEMUX-3 - #altera/v301 (pod31.bdf, v105.qsf, *.vhd, sd demux/*), working/, Released/, readme.doc</li><li>…/DEMUX-3 - #PCB/DEMUX-3ISS4.net/.bom/.pnp, WORKING/Imported DEMUX-3ISS4.PRJPCB/Project Outputs for DEMUX-3ISS4/DEMUX-3ISS4.PDF, .GKO</li><li>DEMUX3 - #TESTREPORT/*.pdf</li><li>Related plugins: demux4.js (successor), rd60-ams81a-iss5.js (sdi_lock gates), pod19.js (2010 DEMUX-3 retrofit), xtm4.js, ams4.js (hosts)</li></ul>`);
}

/* ---------------- register ---------------- */
function avgPass(){ const s=sched(), P0=page0(); const ps=s.passes.filter(p=>!p.init && p.t0>=P0 && p.t0<P0+1); if (ps.length<2) return PASS_T; return (ps[ps.length-1].t0-ps[0].t0)/(ps.length-1); }
SIM.register({
  footnotes: [{"text": "The rear silk names the unit “AMS-81”, not AMS8-1.", "src": "AMS8 #Engineering #TIM/SILK/AMS81-DEMUX3rearsilk-CURVE.cdr"}, {"text": "AMS81-DEMUX3rearsilk-CURVE.cdr is stored three times with identical bytes (TIM/SILK and two “Older Drawings” folders).", "src": "AMS81 - #Master/AMS8 - #Engineering/SILK/Older Drawings/AMS81-DEMUX3rearsilk-CURVE.cdr"}, {"text": "The 2005 non-curve original and its Backup_of_ copy are older and smaller than the 2006 CURVE file.", "src": "AMS8 #Engineering #TIM/SILK/AMS81-DEMUX3rearsilk.cdr"}, {"text": "The rear silk carries labels only; the connector outlines come from the 2009 REARVIEW drawing, which shares the same 19 × 5 in sheet origin and registers exactly.", "src": "AMS81 - #Master/AMS8 - #Engineering/PANEL VIEWS/AMS81-DEMUX3-REARVIEW.cdr"}, {"text": "AMS81-DEMUX3-REARVIEW.cdr is stored twice, byte for byte (PANEL VIEWS and AMS8E - #PANEL VIEWS #MANUAL).", "src": "AMS81 - #Master/AMS8 - #Engineering/AMS8E - #PANEL VIEWS #MANUAL/AMS81-DEMUX3-REARVIEW.cdr"}, {"text": "The DEMUX-3’s group-2 outputs (P3/P4) have no BNC on the AMS8-1 rear; whether they reach the AUX DB-25 is not in the files read.", "src": "AMS8 #Engineering #TIM/SILK/AMS81-DEMUX3rearsilk-CURVE.cdr"}],
  
  id:'demux3', name:'DEMUX3 · SD/HD-SDI audio de-embedder board (2005|38)', duration:1,
  product:'DEMUX3', year:2005, family:'Obsolete products',
  folder:'#DEMUX #SERIES/XXX - DEMUX3 - #Master #OBSOLETE',
  summary:'The shared SD/HD-SDI de-embedder board inside XTM4, DMS1, AMS4, AMS8, AIP8-2A, POD19 and POD31: a GS1560A deserialises the cable, an Altera Cyclone EP1C12 (Quartus 5.1, top entity pod31) extracts two embedded audio groups into FIFOs and re-encodes them as AES3 on two VCXO clocks, and an ATmega128 polls its status over a 48/144-bit bit-banged chain, debounces errors into FIFO resets and answers the host over RS-485.',
  highlights:['Board on the real issue 4 assembly drawing; INPUT1, AES BNCs and P2 clickable','v400 main loop emulated pass by pass (≈1.03 ms, cycle-counted ALTERA bus)','SDI fields → lines → HANC packets → FIFO counts → AES3 bits','Five firmware builds: v400, v201-4, v204, v203 (AMS8), v203-POD19','21 findings: v400 = 2006 source, HD outputs not muted on cable loss, cut 0xE0 reply, dead swap'],
  depth:'Full model',
  stepUnits:[
    {label:'1 video field', period:()=>fieldT(curFmt(absT()))},
    {label:'1 video line', period:()=>lineT(curFmt(absT()))},
    {label:'1 MCU loop pass', period:()=>avgPass()},
    {label:'1 ALTERA byte (read)', period:()=>RD_BYTE*CYC},
    {label:'1 UART byte (9600)', period:()=>UART_BYTE},
    {label:'1 AES block (192 frames)', period:()=>192/48000},
    {label:'1 audio sample / AES frame', period:()=>1/48000},
    {label:'1 ms', period:()=>0.001},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.3,'300 ms (255-pass resets)'],[0.1,'100 ms'],[1001/60000,'1 field (16.7 ms)'],[0.01,'10 ms'],[0.002,'2 ms (≈2 passes)'],[0.0006,'600 µs (ALTERA read)'],[0.0001,'100 µs (lines, bus bits)'],[1/48000,'1 AES frame (20.8 µs)'],[0.000004,'4 µs (HANC packets)']],
  defaultZoom:0,
  init(){ SKEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: testing a DEMUX-3', render:viewTutorial},
    {id:'second', label:'One second, line by line', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
