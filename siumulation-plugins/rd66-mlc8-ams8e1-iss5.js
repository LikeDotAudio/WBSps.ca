/* =====================================================================
   RD66 — MLC8 on the AMS8E-1 issue 5 main board (Ward-Beck Systems R&D, April 2013|46)
   Plugin for the WBS Device Simulator (../siumulation.html)

   What this models: the port itself. The MLC8 (here the MLC8B = "MLC8AM" front, as the debug sheet
   and the hashes show) moved from the AMS8-1 main board (4 × CS8416 + 4 × AD1895 + Cyclone EP1C6)
   to the AMS8E-1 iss5 board (AES receive + SRC inside a Cyclone IV EP4CE40, only the reference
   CS8416/AD1895 kept). The simulator runs three builds side by side:
     BEFORE    AMS8-1 board + main Atmel v105 (MLC8AM, 2006|39)
     AFTER     AMS8E-1 iss5 + main Atmel v106 (RD66, 2013-04-03) + FPGA copied from RD60
     WORKBENCH AMS8E-1 iss5 + v105 with any subset of the six v106 patches switched on
   The full MLC8A operator model is in mlc8.js; the iss5 board itself is in ams8e.js / ams81.js.

   Sources used (paths relative to ENGINEERING - 2016 RD FILES/RD66-MLC8UsingAMS8E-1-iss5/Software):
   - ATmel/ams8e-1/progress/v105/v100w.c (original) and ATmel/ams8e-1/v105/v100w.c (= progress/v106):
       main, port_init, initialization, CS8416_READ_LOCK_ALL, RESET_CS8416, RESET_CS8416_REF,
       TRANSLATE_AUDIO_INPUT_TYPE, ISOLATE_INPUT_STATUS, ALTERA_SORT, ALTERA_read_write(_data),
       ALIGNMENT_CHECK, SETTINGS_CHECK, CS8416_writeN / CS8416_readN; common.h, altspi.c/.h, AESAudio.c/.h, altspi.lis
   - ATmel (main and front) progress.txt files, Altera progress.txt files, DebugNotes.xlsx
   - Altera/ams8e-1/vcurrent/AMS81.bdf (nets traced with a BDF parser), AMS81.qsf, spicontrol.v,
       shift_in32.vhd, AESRXSRC/aes3_2_i2s.v, src_aes_example_top.v
   - Altera/Front/v200 (MLC8A.qsf …), ATmel/Front/v205/v200w.c (TRANSLATE_PUSHBUTTONS, FLASH_LEDS)
   - #MLC - #SERIES/…/MLC8AM - #Software (AMS8-1/atmel v105, v050000, V050100; atmel/v205),
       …/MLC8A - #Software (atmel/v205, altera/v200, AMS8-1/atmel/v106, sharc/mlc8v106/ams81_main.asm),
       …/MLC8AM Demo - #Software/AMS8-1/altera/v201 (the pre-iss5 EP1C6 main FPGA)
   - #MLC - #SERIES/MLC8N - #TESTREPORT/MLC8B-05AV0000-08APR13.pdf, MLC8A-MLC8AR-05AV0000-15DEC14.pdf
   - RD60-AMS81AUsingAMS81-iss5PCB/software/AMS81-AEM (altera vcurrent, atmel progress, ControlDescription_Jan212013.docx)
   - AMS8E - #Master/AMS8E-1 - #Master/AMS8E-1-ISS5-GERBER.zip (Ams8e-1iss5-net.ipc netlist; board art)
   - Panels: #MLC - #SERIES/MLC6 & MLC8 - #ARTWORK #DA #2016/MLC-8B-FRONT-SILK(CURVE MLC-M11).pdf,
       MLC8B-REAR-SILK(CURVE AMS8-M19).pdf, AMS8-M6-SILK(MLC8-M3) lens; Pics/MLC8-M11(8B).jpg (colours)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ID = 'rd66-mlc8-ams8e1-iss5';
const ASSET = 'siumulation-plugins/assets/'+ID+'-';
const KEY = '__rd66Active';
const inf = '<span class="tag-inf" title="Not stated in the archive; inferred">inferred</span>';
const Y = y => SIM.year(y);
const card = (title, body, cls) => `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`;
const put = (el, h) => { if (el && el._h !== h){ el._h = h; el.innerHTML = h; return true; } return false; };
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* ---------------- constants ---------------- */
const F = 4.9152e6;                      // main ATmega128 clock ("@ 4.9152MHz" comment in v100w.c)
const C = {
  SPI_BIT: 22/F,                         // alteraRWByte loop ≈ 22 cycles per bit (instruction count in altspi.lis) — INFERRED
  SPI_HI: 2/F,                           // sbi/cbi: SCLK high for 2 cycles
  CS_BIT: 20/F,                          // CS8416_write_data / read_data ≈ 20 cycles per bit — INFERRED
  CHAIN_BIT: 24/F,                       // ALTERA_read_write_data ≈ 24 cycles per bit — INFERRED
  WD: 0.014,                             // WDTCR = 0x08 → ~14 ms (ATmega128 datasheet)
  LOCK_COUNTER: 25, ERROR_COUNTER: 200,
  CS_LOCK: 0.020,                        // CS8416 PLL lock time — INFERRED (no datasheet in the archive)
  EDGES: 256,                            // aes3_2_i2s: aes3_input_detected <= pulses_examined[8]
  MUX: 0.0025,                           // SHARC meter mux (TPERIOD1 153600, as mlc8.js) — INFERRED clock
  F_LOOP: 5/6000,                        // front-panel pass (mlc8.js) — INFERRED
  FLASH: 301,                            // FLASH_LEDS: FLASH_CONSTANT 300
  UART_BYTE: 1.82e-3,                    // "bytes approx. 1.82ms apart @ 4.9152MHz"
  POLL_PASSES: 16,                       // a front-panel poll every ~16 passes — INFERRED (≈ mlc8.js 72 ms)
  BOOT: 7.7,                             // 15 × wait_ms(500) + CONFIGURE_ALTERA 200 ms before the first pass
};
C.T_SPI = 16*C.SPI_BIT + 60/F;           // alteraRead(0x00): 2 bytes + call overhead
C.T_CSR = 32*C.CS_BIT + 40/F;            // CS8416_readN: header, address, header, data
C.T_CSW = 24*C.CS_BIT + 30/F;            // CS8416_writeN: 3 bytes
C.T_CHAIN = 640*C.CHAIN_BIT;             // 80 bytes each way
const FS_LIST = [32000,44100,48000,96000];
const T_DET = fs => C.EDGES/(1.5*64*fs); // ≈ 256 biphase edges (1.5 per bit on average) — INFERRED average

/* ---------------- the six v106 patches ---------------- */
const PATCH = {
  D:{t:'PORTA = 0x8F, DDRA = 0xC0', w:'port_init()', d:'Was PORTA = 0xFF, DDRA = 0xF0. On iss5, PA4 is wired to the FPGA’s nCE (net NCE, U4.L3, R182 to ground). v105 drives it high.'},
  A:{t:'#include altspi.h / AESAudio.h, alteraInitSpi()', w:'initialization()', d:'Brings in the SPI driver (altspi.c, from the M6205 via the AMS8 V050000 main board) and sets PC0 SCLK, PC1 MOSI and PC2 CS as outputs and PC3 MISO as an input.'},
  B:{t:'status = 0x0F & aesReadLockStatus()', w:'CS8416_READ_LOCK_ALL()', d:'Replaces CS8416_read1…4(0x0C) with one SPI read of FPGA register 0x00. CS8416_read5 (the reference receiver U24) stays.'},
  C:{t:'/* CS8416_write1…4(0x04, RUN=0) … wait_ms(500) … RUN=1 */', w:'RESET_CS8416()', d:'On a relock, v105 stopped and restarted four receivers that no longer exist, with a 500 ms wait in between.'},
  E:{t:'PORTC = 0xB0, DDRC = 0xE0', w:'port_init()', d:'Was PORTC = 0xBF, DDRC = 0xEF. alteraInitSpi() rewrites PC0–PC3 straight after this, so this edit changes nothing in practice.'},
  F:{t:'//PORTE |= 0x10  (×2)', w:'RESET_CS8416(), RESET_CS8416_REF()', d:'The comment says the line “appears to be useless”. PE4 is the DIM_ENABLED input (GPIO2 on iss5). This line was the only place its pull-up was switched on.'},
};
const PORDER = ['D','A','B','C','E','F'];

/* ---------------- device state ---------------- */
const D = {
  cfg: 'after',                          // 'before' | 'after' | 'bench'
  p: {D:false,A:false,B:false,C:false,E:false,F:false},
  cable0: [true,true,true,true], fs: [48000,48000,48000,48000],
  sdi0: true, ref: false,
  ev: [],                                // {t, k:'cable'|'sdi', p, on}
  source: 'AES110', st: false,           // ST MODE (MODE4) off = 5.1
  gain: [61,61,61,61,61,61,61,61], vol: 30, mute: Array(9).fill(false), sel: 0,
  scopeP: 0, hash: false, pick: 'U4',
  log: [], flags: {},
};
const benchAll = () => PORDER.every(k=>D.p[k]);
function eff(){                          // effective configuration
  if (D.cfg==='before') return {board:'old', fw:'v105', p:{D:false,A:false,B:false,C:false,E:false,F:false}, name:'BEFORE · AMS8-1 + v105'};
  if (D.cfg==='after')  return {board:'iss5', fw:'v106', p:{D:true,A:true,B:true,C:true,E:true,F:true}, name:'AFTER · AMS8E-1 iss5 + v106'};
  return {board:'iss5', fw: benchAll()?'v106':'v105+', p:Object.assign({},D.p), name:'WORKBENCH · iss5 + v105 + patches '+(PORDER.filter(k=>D.p[k]).join('')||'none')};
}
function cfgOf(name){ const s=D.cfg; D.cfg=name; const e=eff(); D.cfg=s; return e; }

/* ---------------- signals and lock ---------------- */
function evFor(k,p){ return D.ev.filter(e=>e.k===k && (k!=='cable'||e.p===p)).sort((a,b)=>a.t-b.t); }
/* presentSince: time since which the selected source carries a signal into pair p, or null if absent at t */
function presentSince(p, t){
  if (D.source==='ANALOG') return -Infinity;                     // analog card always delivers — INFERRED
  const k = D.source==='SDI12' ? 'sdi' : 'cable';
  let on = k==='sdi'? D.sdi0 : D.cable0[p], since = on? -Infinity : null;
  for (const e of evFor(k,p)){ if (e.t>t) break; if (e.on && !on) since=e.t; if (!e.on) since=null; on=e.on; }
  return on? since : null;
}
const fsOf = p => D.source==='AES110' ? D.fs[p] : 48000;
function fpgaOK(e){ return e.board==='old' || e.p.D; }
/* "detected": FPGA aes3_input_detected (iss5) or CS8416 lock (AMS8-1) */
function detected(p, t, e){
  const s = presentSince(p,t); if (s===null) return false;
  return t - s >= (e.board==='old' ? C.CS_LOCK : T_DET(fsOf(p)));
}
function readMode(e){
  if (e.board==='old') return 'cs';
  if (!e.p.B) return 'absent';
  return e.p.A ? 'spi' : 'spi0';
}
/* Astatus after ISOLATE_INPUT_STATUS (1 = locked) as read at time t */
function astatusAt(t, e){
  const m = readMode(e); let v=0;
  for (let p=0;p<4;p++){
    let l;
    if (m==='cs' || m==='spi') l = detected(p,t,e);
    else if (m==='absent') l = false;        // CS8416_read1..4 → PD6 pull-up → 0xFF → "not locked"
    else l = true;                           // SPI pins not set up → 0x00 → "locked"
    if (l) v |= 1<<p;
  }
  return v;
}
/* the 8-bit FPGA register 0x00 and the raw CS8416_READ_LOCK_ALL return value */
function reg00(t,e){ let v=0; for (let p=0;p<4;p++) if (!detected(p,t,e)) v|=1<<p; return v; }   // NOT inst65/73/74/75, [7..4] = GND
function rawStatus(t,e){ const a=astatusAt(t,e); return ((~a)&0x0F) | (D.ref? 0 : 0x10); }

/* ---------------- main-loop schedule ---------------- */
const STEP_NAMES = [
  ['WDR · CS8416_READ_LOCK_ALL', 'lock'],
  ['RESET_CS8416_REF · TRANSLATE_AUDIO_INPUT_TYPE · ISOLATE_INPUT_STATUS · TRANSLATE_AUDIO_REFERENCE_INPUT', 'iso'],
  ['RESET_CS8416', 'rst'],
  ['ALTERA_TRANSLATE_UART0 (incl. CS8416_write4) · ALTERA_SORT', 'sort'],
  ['ALTERA_read_write (80 bytes, PC4–PC7) · ALIGNMENT_CHECK', 'chain'],
  ['DOLBY_error · UART0 / UART1 service', 'uart'],
  ['DOLBY_RESET · SETTINGS_CHECK', 'set'],
];
const STEP_COL = ['--accent2','--ink2','--warn','--ink2','--accent','--ink2','--ink2'];
function lockReadDur(e){ const m=readMode(e); return (m==='cs'||m==='absent') ? 5*C.T_CSR : C.T_SPI + C.T_CSR; }
function stepDurs(e){ return [lockReadDur(e), 20/F*1000/1000+C.T_CSW+20e-6, 10e-6, 150e-6+C.T_CSW, C.T_CHAIN+30e-6, 200e-6, 50e-6]; }
const SCHED = {};
function schedKey(e){ return JSON.stringify([e.board,e.p,D.ev,D.cable0,D.sdi0,D.source,D.fs,D.ref]); }
function schedule(e){
  e = e || eff();
  const key = schedKey(e); const id = e.board+JSON.stringify(e.p);
  if (SCHED[id] && SCHED[id].key===key) return SCHED[id];
  const dur = stepDurs(e), passes=[]; let t=0, i=0;
  const a0 = astatusAt(-1e-9, e);
  let lockStatus = a0? 1:0, lockCounter = a0? 0 : 3*C.LOCK_COUNTER, errChk = 0, ast = a0;
  const stalls=[];
  while (t < 1.0001){
    if (!fpgaOK(e)){                       // FPGA unconfigured: the 'V101' echo never comes back
      const p={i, t0:t, steps:[], ast:astatusAt(t,e), ls:lockStatus, lc:lockCounter, kind:'loop'};
      let a=t; dur.forEach((d,k)=>{ p.steps.push({k,a,b:a+d}); a+=d; }); p.t1=a; errChk++;
      if (errChk > C.ERROR_COUNTER){ p.kind='spin'; p.steps=p.steps.slice(0,5); p.spinFrom=p.steps[4].b; p.t1=p.spinFrom+C.WD; passes.push(p);
        passes.push({i:-1, t0:p.t1, t1:p.t1+C.BOOT, kind:'boot', steps:[]}); break; }
      passes.push(p); t=a; i++; continue;
    }
    const p={i, t0:t, steps:[], kind:'loop'}; let a=t;
    for (let k=0;k<dur.length;k++){
      let d=dur[k];
      if (k===0) ast = astatusAt(a+d*0.5, e);
      if (k===2){                          // RESET_CS8416 (Astatus is already 1 = locked here)
        if (ast===0){ if (lockStatus!==1 && lockCounter<=3*C.LOCK_COUNTER) lockCounter++; lockStatus=0; }
        else if (lockStatus!==1 && lockCounter>=C.LOCK_COUNTER){
          const st = e.p.C ? 0 : 8*C.T_CSW + 0.5;      // v105: RUN=0 ×4, wait_ms(500), RUN=1 ×4
          d += st + 500e-6;                            // + Dolby card reset wait_us(500)
          p.stall = {a:a+10e-6, b:a+10e-6+st, dolby:true, long:st>0};
          if (st>0) stalls.push(p.stall);
          lockStatus=1; lockCounter=0;
        } else { lockStatus=1; lockCounter=0; }
      }
      p.steps.push({k,a,b:a+d}); a+=d;
    }
    p.ast=ast; p.ls=lockStatus; p.lc=lockCounter; p.t1=a; p.poll = (i % C.POLL_PASSES)===0;
    passes.push(p); t=a; i++;
  }
  SCHED[id] = {key, passes, stalls, a0};
  if (stalls.length && e.board) D.flags['freeze_'+(e.board==='old'?'old':'iss5')] = true;
  return SCHED[id];
}
function passAt(t, e){
  const ps = schedule(e).passes; let lo=0, hi=ps.length-1;
  while (lo<hi){ const m=(lo+hi+1)>>1; if (ps[m].t0<=t) lo=m; else hi=m-1; }
  return ps[lo];
}
function stepAt(t, e){
  const p = passAt(t,e); if (!p || p.kind==='boot') return {p, k:-1};
  if (p.kind==='spin' && t>=p.spinFrom) return {p, k:4, spin:true};
  for (const s of p.steps) if (t>=s.a && t<s.b) return {p, k:s.k, stall: p.stall && t>=p.stall.a && t<p.stall.b};
  return {p, k:6};
}
/* what the SHARC last received (TDM_IN_ctl+18 bits 24..27) */
function errAt(t, e){
  e=e||eff();
  if (!fpgaOK(e)) return [true,true,true,true];             // SPORT1 never clocked → word 18 = 0 → err set — INFERRED
  const s=schedule(e); let ast = s.a0;
  const ps=s.passes; let lo=0, hi=ps.length-1;
  while (lo<hi){ const m=(lo+hi+1)>>1; if (ps[m].t0<=t) lo=m; else hi=m-1; }
  for (let j=lo;j>=0;j--){ const p=ps[j]; if (p.kind!=='loop') continue; const ch=p.steps[4]; if (ch && ch.b<=t){ ast=p.ast; break; } }
  ast = (ast===undefined)? s.a0 : ast;
  return [0,1,2,3].map(p=>!((ast>>p)&1));
}
function audioAt(p, t, e){ e=e||eff(); return fpgaOK(e) && detected(p,t,e); }

/* ---------------- programme levels for the meters ---------------- */
const BASE=[-24,-24,-21,-30,-29,-29,-19,-19];
function nz(c,x){ const i=Math.floor(x), f=x-i; const h=n=>{ const s=Math.sin(n*127.1+c*311.7)*43758.5453; return (s-Math.floor(s))*2-1; }; return h(i)*(1-f)+h(i+1)*f; }
function levelAt(c,t){ return BASE[c] + 5*Math.sin(2*Math.PI*0.9*t+c*1.7) + 3*Math.sin(2*Math.PI*2.7*t+c*3.4) + 2.5*nz(c,t*12); }
const THR=[-34,-26,-20,-16,-12,-10,-8,-6,-4,-3,-2,-1,0,1,2,3,4,6,8,10,12,14];   // lens scale, cal −20 dBFS = 0
function segs(c,t,e){ if (!audioAt(c>>1,t,e)) return 0; const rel=levelAt(c,t)+20; let n=0; THR.forEach((h,i)=>{ if (rel>=h) n=i+1; }); return n; }

/* ---------------- actions ---------------- */
function act(name, fn){
  const tr=[]; fn(s=>tr.push(s));
  D.log.unshift({t:SIM.t, name, trace:tr}); if (D.log.length>40) D.log.length=40; SIM.refresh();
}
const A = {
  cable(p){ const on = !(presentSinceCable(p, SIM.t)); D.ev.push({t:SIM.t, k:'cable', p, on}); D.scopeP=p;
    act(`${on?'Plug':'Unplug'} AES IN ${p+1} (110 Ω Phoenix) at ${SIM.fmtT(SIM.t)}`, tr=>traceLock(tr,p,on)); },
  sdi(){ const on=!sdiAt(SIM.t); D.ev.push({t:SIM.t,k:'sdi',on}); act(`SDI carrier ${on?'present':'removed'} at ${SIM.fmtT(SIM.t)}`, tr=>{
    tr('Front v200w.c UART1_translate: SDI_CARRIER_MASK bit '+(on?'0 → sdi_carrier_lock = YES':'1 → sdi_carrier_lock = NO')+'; refresh = YES');
    tr(D.source==='SDI12' ? 'Source is SDI: the four pairs follow the de-embedder; the SDI button LED '+(on?'stays lit':'flashes (FLASH_LEDS, every 301 front passes)') : 'Source is not SDI, so only the SDI button LED reacts (flashes only while SDI is selected).'); }); },
  ref(){ D.ref=!D.ref; act(`${D.ref?'Plug':'Unplug'} REF IN`, tr=>{ tr('Reference receiver U24 (CS8416 #5, kept on iss5): CS8416_read5(0x0C) → status bit 0x10 '+(D.ref?'clear (locked)':'set')+'; RESET_CS8416_REF counts LOCK_COUNTER passes, then resets the Dolby card');
    tr('AES5_REF_MCLK → altpll1 → cs8416pllout_98M304 → input_selector8 (cntrl[26..24], the reference bits of REG20) → SRC external_clock. Unchanged by RD66.'); }); },
  src(s){ act(`Front: press ${s==='AES110'?'AES':s==='ANALOG'?'ANALOG':'SDI (GR 3/4 position)'}`, tr=>{
    const pb = s==='AES110'?'PRESET_PB1':s==='ANALOG'?'PRESET_PB2':'MODE1_PB';
    tr(`MLC8AM v205 TRANSLATE_PUSHBUTTONS: (${pb}) != 0 → source_select = ${s}; PB_LED${s==='AES110'?1:s==='ANALOG'?2:3}_ON; new_data1 = source_take = YES`);
    D.source=s;
    tr('Next main-board poll: source_select → main v100w.c ALTERA_TRANSLATE_UART0 → altera_aes1..4_input codes '+(s==='AES110'?'0,1,2,3 (AES_IN_1–4)':'0,1,2,3 + demuxselect 0x20'+(s==='SDI12'?' + demux12select 0x40':''))+' → REG20 → SHARC loop-through → FPGA cntrl[14..0], cntrl[29], cntrl[30]');
    tr('The same on both boards: RD66 did not touch source selection.'); }); },
  st(){ act('Front: press ST MODE', tr=>{ D.st=!D.st; tr(`MODE4_PB → mode_select = ${D.st?'MODE4 (stereo); PB_LED4_ON':'MODE1 (5.1); PB_LED4_OFF'}; mode_take = YES`); }); },
  turn(k,dir){ act(`Turn ${KNOB[k]} ${dir>0?'clockwise':'counter-clockwise'}`, tr=>{
    if (k<8){ D.gain[k]=Math.max(0,Math.min(255,D.gain[k]+4*dir)); tr(`front PROCESS_SHAFT_ENCODER${k+1} → GAIN_CONTROL_${k+1}: gain${k+1} = ${D.gain[k]}`); tr(`main ALTERA_TRANSLATE_UART0 → volume${k+1}L/R → ALTERA_SORT byte ${44+k}/${56+k} → SHARC TDM_IN_ctl → gain table. Unchanged by RD66.`); }
    else { D.vol=Math.max(0,Math.min(255,D.vol+4*dir)); tr(`MASTER_VOLUME → volume_level ${D.vol} → output1 → ALTERA_SORT byte 40. Unchanged by RD66.`); }
    D.sel=k; }); },
  push(k){ act(`Press ${KNOB[k]} (mute)`, tr=>{ D.mute[k]=!D.mute[k]; tr(`TRANSLATE_ENCODER${k+1}: mute ${D.mute[k]?'on':'off'}; the ring ${D.mute[k]?'dims':'returns'}. Unchanged by RD66.`); D.sel=k; }); },
  cfg(c){ D.cfg=c; act('Configuration → '+eff().name, tr=>describeCfg(tr)); },
  patch(k){ D.p[k]=!D.p[k]; D.cfg='bench'; act(`${D.p[k]?'Apply':'Revert'} patch ${k}: ${PATCH[k].t}`, tr=>{ tr(PATCH[k].w+': '+PATCH[k].d); describeCfg(tr); if (benchAll()) tr('All six applied: this is exactly the RD66 v106 diff. v100w.c sha-256 067d4d455b78… = MLC8AM AMS8-1/atmel/v050000/v100w.c.'); }); },
  benchAll(on){ PORDER.forEach(k=>D.p[k]=on); D.cfg='bench'; act(on?'Workbench: apply all six patches':'Workbench: unmodified v105 on iss5', tr=>describeCfg(tr)); },
  hash(){ D.hash=true; act('Hash-compare RD66 against the masters', tr=>HASH.forEach(h=>tr(`${h[0]} vs ${h[1]}: ${h[2]}`))); },
  replugAll(){ const t=SIM.t; [0,1,2,3].forEach(p=>D.ev.push({t, k:'cable', p, on:false})); [0,1,2,3].forEach(p=>D.ev.push({t:Math.min(0.999,t+0.2), k:'cable', p:0, on:true})); D.ev.push({t:Math.min(0.999,t+0.2),k:'cable',p:1,on:true});
    act(`Unplug all four at ${SIM.fmtT(t)}, plug IN 1 and IN 2 back 200 ms later`, tr=>{ tr('All pairs unlocked → Astatus = 0 → RESET_CS8416: lock_status = NO_LOCK, lock_counter counts up to LOCK_COUNTER (25 passes)'); tr('First pass with any pair locked: the relock branch runs. '+(eff().p.C?'v106: Dolby card reset only (wait_us(500)).':'v105: CS8416_write1…4(0x04,0x00), wait_ms(500), CS8416_write1…4(0x04,0x80) — the main loop freezes for half a second.')); tr('Scrub to the plug-in time to watch it on the main-loop lanes.'); }); },
  clearEv(){ D.ev=[]; act('Clear all timed events (all cables as at t = 0)', tr=>tr('Event list cleared.')); },
  reset(){ Object.assign(D,{cfg:'after', p:{D:false,A:false,B:false,C:false,E:false,F:false}, cable0:[true,true,true,true], fs:[48000,48000,48000,48000], sdi0:true, ref:false, ev:[], source:'AES110', st:false, gain:[61,61,61,61,61,61,61,61], vol:30, mute:Array(9).fill(false), sel:0, hash:false, log:[], flags:{}}); SIM.refresh(); },
};
function presentSinceCable(p,t){ let on=D.cable0[p]; for (const e of evFor('cable',p)){ if (e.t>t) break; on=e.on; } return on; }
function sdiAt(t){ let on=D.sdi0; for (const e of evFor('sdi')){ if (e.t>t) break; on=e.on; } return on; }
function traceLock(tr,p,on){
  const e=eff(), m=readMode(e);
  if (D.source!=='AES110') tr(`Source is ${D.source}: the Phoenix inputs are not routed (aes_input_router sel codes point at the option-card pins), so this changes nothing you can see.`);
  if (e.board==='old'){ tr(`AES_IN_${p+1} → aes_input_router → quad_selector inst18 → pin AES8416_${p+1} → CS8416 #${p+1} → AD1895 #${p+1} → SRCDATA${p+1} (EP1C6 v201)`);
    tr(`CS8416 #${p+1} ${on?'locks after its PLL settles (≈'+C.CS_LOCK*1e3+' ms '+inf+')':'drops lock'} → next pass: CS8416_read${p+1}(0x0C) over PD0/PD1/PD6 with chip-select PA${p+4}`); }
  else {
    if (!e.p.D){ tr('PA4 (= FPGA nCE on iss5) is still driven high by v105 port_init → the Cyclone IV is not configured '+inf+'. Nothing reaches the receivers.'); return; }
    tr(`AES_IN_${p+1} → ALT_INBUF inst${[85,84,86,87][p]} → aes_input_router inst2 → quad_selector inst18 → aes3_in[${p}] → src_aes_example_top inst66`);
    tr(on? `aes3_2_i2s counts 256 biphase edges (pulses_examined[8]) ≈ ${(T_DET(D.fs[p])*1e6).toFixed(0)} µs at ${D.fs[p]/1000} kHz → aes3_input_detected[${p}] = 1` : `No edges: pulse_width saturates → aes3_phy_err → pulses_examined cleared → aes3_input_detected[${p}] = 0 within a microsecond`);
    tr(`NOT inst${[65,73,74,75][p]} → aesrx_lock[${p}] = ${on?0:1} → spicontrol inst41 register 0x00`);
    if (m==='spi') tr(`Next pass: alteraRead(0x00) on PC0–PC3 (16 SCLKs, ≈ ${(C.T_SPI*1e6).toFixed(0)} µs) → CS8416_READ_LOCK_ALL → ISOLATE_INPUT_STATUS inverts → Astatus bit ${p} = ${on?1:0}`);
    else if (m==='absent') tr(`But the firmware still calls CS8416_read${p+1}(0x0C): chip ${p+1} is gone, PD6 floats to its pull-up (PORTD 0xFF, DDRD 0xBF) → 0xFF → “not locked” whatever you plug in.`);
    else tr('The firmware asks the FPGA, but alteraInitSpi() was never called: PC3 is still an output that TRANSLATE_AUDIO_INPUT_TYPE holds at 0 → alteraRead returns 0x00 → every pair looks locked.');
  }
  tr('ALTERA_SORT: byte 72 = Astatus → 80-byte chain → SHARC TDM_IN_ctl+18 → sport0_isr btst r5 by '+(24+p)+' → ERR LED of pair '+(p+1)+' '+(errAt(SIM.t+0.02)[p]?'ON':'off')+' (20 ms after now)');
}
function describeCfg(tr){
  const e=eff(), m=readMode(e);
  tr(e.name);
  if (e.board==='old'){ tr('Four CS8416 receivers and four AD1895 SRCs on the main board; the EP1C6 FPGA (v201) just routes AES to them and takes SRCDATA1–4 back.'); return; }
  if (!e.p.D) tr('PA4 = NCE: v105 port_init (PORTA 0xFF, DDRA 0xF0) drives the Cyclone IV nCE high → no configuration '+inf+' → no “V101” echo → ALIGNMENT_CHECK fails 200 times → while(error0==0) NOP() → watchdog reset → 7.7 s boot → repeat.');
  else if (m==='absent') tr('FPGA runs and audio flows, but CS8416_read1…4 read a floating PD6 (0xFF) → Astatus = 0 → all four ERR LEDs on, lock_status never LOCKED.');
  else if (m==='spi0') tr('Lock comes from the FPGA, but the SPI pins were never initialised → 0x00 → all four pairs “locked”, even unplugged.');
  else tr('Lock bits come from the FPGA receivers over SPI: ERR LEDs follow the cables.');
  if (fpgaOK(e) && !e.p.C) tr('RESET_CS8416 still has the RUN=0 / wait_ms(500) / RUN=1 block → a 500 ms main-loop freeze on every relock.');
}

/* ================================================================
   PANELS
   ================================================================ */
const KNOB = ['L','R','C','LFE','LS','RS','ST L','ST R','MASTER'];
const KX = k => k<8? 1026.5+200*k : 2726.5, KY = 165.5;
/* MLC-8B-FRONT-SILK (2015) button holes; 2013 debug sheet: top AES 110 Ω | Analog, bottom SDI | Stereo 5.1 */
const PB = { sdi1:[2953.5,93.5,'SDI 1','added by RD73 (2015), not in v205'], aes:[3098.5,93.5,'AES','PRESET_PB1 → AES110 · PB_LED1'], analog:[3243.5,93.5,'ANALOG','PRESET_PB2 → ANALOG · PB_LED2'],
  sdi2:[2953.5,233.5,'SDI 2','added by RD73 (2015), not in v205'], sdi:[3098.5,233.5,'GR 3/4 (2013: SDI)','MODE1_PB → SDI12 · PB_LED3'], st:[3243.5,233.5,'ST MODE','MODE4_PB → MODE1/MODE4 · PB_LED4'] };
const MCOL = [224.5,295.5,365.5,435.5,535.5,605.5,675.5,745.5], MROW = r => 29 + 12*r, PAIRX = [262,402,572,712];
const ledCol = r => r<4? '#ff3b2f' : r<12? '#ffc23a' : '#6dff5a';
const ledOff = r => r<4? '#2a1513' : r<12? '#2a2410' : '#152614';
function pbLed(b, t){
  if (b==='aes') return D.source==='AES110';
  if (b==='analog') return D.source==='ANALOG';
  if (b==='sdi') return D.source==='SDI12' && (sdiAt(t) || Math.floor(t/(C.FLASH*C.F_LOOP))%2===0);
  if (b==='st') return D.st;
  return false;
}
function frontSVG(t){
  const e=eff(), err=errAt(t,e);
  let s=`<svg viewBox="0 0 3420 330" role="img" aria-label="MLC8B front panel on the real silkscreen" style="width:100%;display:block;border-radius:6px;background:#141517">
    <defs><filter id="r6g" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="r6k" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#3a3d40"/><stop offset="1" stop-color="#101112"/></radialGradient></defs>
    <rect width="3420" height="330" fill="#141517"/><rect x="183" y="4" width="600" height="322" fill="#070808"/>`;
  for (let c=0;c<8;c++){ const n=segs(c,t,e);
    for (let r=0;r<22;r++){ const j=21-r, on=j<n; s+=`<rect x="${MCOL[c]-11}" y="${MROW(r)-4}" width="22" height="8" rx="1.5" fill="${on?ledCol(r):ledOff(r)}"${on?' filter="url(#r6g)"':''}/>`; } }
  for (let p=0;p<4;p++){ const on=err[p]; s+=`<circle cx="${PAIRX[p]}" cy="222" r="5" fill="#2a2410"/><circle cx="${PAIRX[p]}" cy="259" r="6" fill="${on?'#ff3b2f':'#2a1513'}"${on?' filter="url(#r6g)"':''}><title>ERR pair ${p+1}: ${on?'lit — the SHARC saw “no lock” in TDM_IN_ctl+18 bit '+(24+p):'off'}</title></circle>`; }
  s+=`<image href="${ASSET}lens-white.png" x="182.5" y="14.5" width="600" height="300"/>
    <image href="${ASSET}front-green.png" width="3420" height="330"/><image href="${ASSET}front-white.png" width="3420" height="330"/>`;
  for (let k=0;k<9;k++){ const x=KX(k), big=k===8, hole=big?94.5:66.5, kr=big?56:38, R=big?76:53, r=big?7.2:5.6, val=k<8?D.gain[k]:D.vol, lit=Math.round(val/255*24);
    s+=`<g class="r6knob" data-k="${k}" style="cursor:pointer"><circle cx="${x}" cy="${KY}" r="${hole}" fill="#060707" stroke="#2a2c2e" stroke-width="2"/>`;
    for (let i=0;i<25;i++){ const a=(-135+i*11.25)*Math.PI/180, on=i<=lit && !D.mute[k]; s+=`<circle cx="${(x+R*Math.sin(a)).toFixed(1)}" cy="${(KY-R*Math.cos(a)).toFixed(1)}" r="${r}" fill="${on?(i===12?'#ffb43a':'#7dff6a'):(i===12?'#2d2412':'#16261a')}"/>`; }
    s+=`<circle cx="${x}" cy="${KY}" r="${kr}" fill="url(#r6k)" stroke="${D.sel===k?'var(--accent)':'#2b2d2f'}" stroke-width="${D.sel===k?5:3}"/><circle cx="${x}" cy="${KY}" r="${hole+4}" fill="transparent"><title>${KNOB[k]}: click left = counter-clockwise, centre = mute, right = clockwise; wheel turns</title></circle></g>`; }
  for (const b in PB){ const [x,y,lbl,what]=PB[b], on=pbLed(b,t), dead=b==='sdi1'||b==='sdi2';
    s+=`<g class="r6pb" data-b="${b}" style="cursor:${dead?'not-allowed':'pointer'}"><circle cx="${x}" cy="${y}" r="38.5" fill="#060707"/>
      <rect x="${x-27}" y="${y-27}" width="54" height="54" rx="7" fill="${dead?'#202020':on?'#ffd84a':'#3b3522'}" stroke="#1d1b12" stroke-width="3"${on?' filter="url(#r6g)"':''}/>
      <rect x="${x-40}" y="${y-40}" width="80" height="80" fill="transparent"><title>${lbl}: ${what}</title></rect></g>`; }
  if (!fpgaOK(e)) s+=`<text x="1710" y="318" text-anchor="middle" font-size="22" fill="#ff8a80">main board rebooting: FPGA not configured (PA4 holds nCE high) ${'— inferred'}</text>`;
  return s+'</svg>';
}
const INX = p => 2402 + 109.25*(p+0.5);
function rearSVG(){
  const e=eff();
  let s=`<svg viewBox="0 0 3448 330" role="img" aria-label="MLC8B rear panel on the real silkscreen" style="width:100%;display:block;border-radius:6px;background:#141517">
    <rect width="3448" height="330" fill="#141517"/><image href="${ASSET}rear-white.png" width="3448" height="330"/>`;
  for (let p=0;p<4;p++){ const x=INX(p), on=presentSinceCable(p,SIM.t), lk=!errAt(SIM.t,e)[p];
    s+=`<g class="r6jack" data-p="${p}" style="cursor:pointer">${on?`<rect x="${x-50}" y="212" width="100" height="58" rx="5" fill="#1f8a45" stroke="#9fe0b4" stroke-width="3"/><rect x="${x-12}" y="270" width="24" height="60" fill="#1f8a45"/>`:''}
      <rect x="${x-54}" y="190" width="108" height="140" fill="transparent"><title>IN ${p+1} (AES 110 Ω) — click to ${on?'unplug':'plug in'} at the playhead</title></rect>
      <circle cx="${x}" cy="180" r="10" fill="${lk?'var(--accent)':on?'var(--warn)':'#555'}"/></g>`; }
  const rx=2305.5;
  s+=`<g class="r6ref" style="cursor:pointer">${D.ref?`<rect x="${rx-50}" y="212" width="100" height="58" rx="5" fill="#2b5f9e" stroke="#9cc3f0" stroke-width="3"/>`:''}<rect x="${rx-56}" y="190" width="112" height="140" fill="transparent"><title>REF IN → U24 CS8416 (kept on iss5) — click to ${D.ref?'unplug':'plug in'}</title></rect></g>
    <text x="10" y="322" font-size="20" fill="#9aa">MLC8B-REAR-SILK (AMS8-M19), 2015|48 drafting set — click IN 1–4 and REF IN</text></svg>`;
  return s;
}
/* AMS8E-1 iss5 top side (Gerber GTO/GTS → 696 × 501 px at 120 dpi); part boxes from Ams8e-1iss5-net.ipc */
const MB = {
  U4:{b:[3.98,13.15,4.8,13.98],t:'U4 Cyclone IV EP4CE40F23C6',d:'Runs the RD60 design copied into RD66 (AMS81.bdf): four AES receivers + SRC (src_aes_example_top inst66), routing, TDM to the SHARC, spicontrol for the lock byte. Pins A20/B20/A19/B19 = PORTC0–3, A18 = DPCLK5 (PC4), B18/A17/B17 = PC5–7, L3 = nCE.'},
  U14:{b:[5.72,12.33,6.33,12.94],t:'U14 ATmega128L (main MCU)',d:'Runs v100w.c. On iss5: PA0–PA3 go to DCLK, CNF_DATA, ASDI, NCS (the EPCS lines); PA4 → NCE; PA5/PA6 → U4.B16/A16; PA7 → RESET_TPS70402 (REG2 pin 8, R91 to +1V2); PC0–PC3 → SPI to U4; PD0/1/6/7 → U24 CS8416; PG2 → CS8416_RESET.'},
  U24:{b:[4.68,12.48,5.01,12.71],t:'U24 CS8416 (reference only)',d:'The only CS8416 left. AES_110REF_IN / AES_75REF_IN, control port on CS8416_SEL/IN/CLK/OUT (PD7/PD0/PD1/PD6). CS8416_read5 and CS8416_write5 still talk to it.'},
  U10:{b:[4.2,12.48,4.53,12.76],t:'U10 AD1895 (reference SRC)',d:'Fed by DATA_OUTCS8416 / SCLK_REF_FPGA / LRCLK_REF_FPGA. The four per-input AD1895s of the AMS8-1 are gone.'},
  U1:{b:[5.31,12.43,6.49,13.62],t:'U1 ADSP-21065L SHARC',d:'MLC8 DSP code mlc8v106 (unchanged). SPORT1 receives the 80-byte chain from PC5 (through the FPGA) and loops words 18/19 back on DT1A.'},
  REG2:{b:[2.49,12.18,2.74,12.46],t:'REG2 TPS70402',d:'+1V2 / +2V5 for the FPGA. Pin 8 (RESET_TPS70402, pulled up to +1V2 by R91) goes to PA7 — the old CS8416 #4 chip select.'},
  H2:{b:[5.25,14.91,5.66,15.01],t:'H2 FPGA config header',d:'DCLK, CONF_DONE, N_CONFIG, NCE, CNF_DATA, NCS, ASDI. NCE is also on U14 PA4.'},
  H9:{b:[3.45,11.05,4.35,11.15],t:'H9 AES 1–4',d:'AES1–4 in/out to the rear connector board.'},
};
const OFF=[1.23,10.92];
function boardSVG(){
  const e=eff();
  if (e.board==='old') return oldBoardSVG();
  const P=(x,y)=>[(x-OFF[0])*120,(4.175-(y-OFF[1]))*120], ctr=k=>{ const b=MB[k].b; const [x1,y1]=P(b[0],b[3]),[x2,y2]=P(b[2],b[1]); return [(x1+x2)/2,(y1+y2)/2]; };
  let s=`<svg viewBox="0 0 696 501" style="width:100%;max-width:760px;display:block;border-radius:6px" role="img" aria-label="AMS8E-1 iss5 top side"><rect width="696" height="501" fill="#145a32"/>
    <image href="${ASSET}iss5-pads.png" width="696" height="501"/><image href="${ASSET}iss5-silk.png" width="696" height="501"/>`;
  const wire=(a,b,col,lbl,dy)=>{ const [x1,y1]=ctr(a),[x2,y2]=ctr(b); return `<path d="M${x1},${y1} C${x1},${y1+(dy||-60)} ${x2},${y2+(dy||-60)} ${x2},${y2}" fill="none" stroke="${col}" stroke-width="3" opacity=".9"/><text x="${(x1+x2)/2}" y="${Math.min(y1,y2)+(dy||-60)*0.75}" font-size="11" fill="#fff" text-anchor="middle" style="paint-order:stroke" stroke="#000" stroke-width="3">${lbl}</text>`; };
  s+=wire('U14','U4', e.p.A&&e.p.B?'#7dff6a':'#777', 'PC0–3 SPI (spicontrol)', -50);
  s+=wire('U14','H2', e.p.D?'#777':'#ff5a4a', 'PA4 → NCE '+(e.p.D?'(input)':'(driven HIGH)'), -30);
  s+=wire('U14','REG2', '#ffb43a', 'PA7 → RESET_TPS70402', 70);
  s+=wire('U14','U24', '#5aa9e6', 'PD0/1/6/7 CS8416 bus', 40);
  for (const k in MB){ const b=MB[k].b; const [x1,y1]=P(b[0],b[3]),[x2,y2]=P(b[2],b[1]); const sel=D.pick===k;
    s+=`<rect class="r6mb" data-k="${k}" x="${x1-5}" y="${y1-5}" width="${Math.max(14,x2-x1+10)}" height="${Math.max(14,y2-y1+10)}" rx="3" fill="${sel?'rgba(90,169,230,.25)':'rgba(255,255,255,.04)'}" stroke="${sel?'#5aa9e6':'rgba(255,255,255,.35)'}" stroke-width="2" style="cursor:pointer"><title>${MB[k].t}</title></rect>`; }
  return s+'</svg>';
}
function oldBoardSVG(){
  const bx=(x,y,w,h,t,sub,col)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="var(--panel2)" stroke="${col||'var(--line)'}" stroke-width="2"/><text x="${x+w/2}" y="${y+20}" text-anchor="middle" font-size="13" font-weight="600" fill="var(--ink)">${t}</text><text x="${x+w/2}" y="${y+38}" text-anchor="middle" font-size="11" fill="var(--ink2)">${sub||''}</text>`;
  let s=`<svg viewBox="0 0 696 360" style="width:100%;max-width:760px;display:block" role="img" aria-label="AMS8-1 main board, block drawing"><rect width="696" height="360" fill="var(--lane)" stroke="var(--line)"/>`;
  for (let p=0;p<4;p++){ s+=bx(20,20+p*62,120,48,'CS8416 #'+(p+1),'CS = PA'+(p+4),'var(--accent2)')+bx(160,20+p*62,120,48,'AD1895 #'+(p+1),'→ SRCDATA'+(p+1)); }
  s+=bx(330,30,170,120,'EP1C6Q240C7','v201 (Quartus 5.1)')+bx(330,190,170,70,'ATmega128','v100w.c v105')+bx(530,30,140,120,'ADSP-21065L','mlc8v106')+bx(20,280,260,56,'CS8416 #5 + AD1895 (reference)','CS = PD7');
  s+=`<text x="340" y="110" font-size="11" fill="var(--ink2)">AES8416_1–4 out, SRCDATA1–4 / RMCK1–4 in</text><text x="340" y="126" font-size="11" fill="var(--ink2)">portc0–3 (pins 125–128): unconnected</text>
    <text x="340" y="285" font-size="11" fill="var(--ink2)">PD0/PD1/PD6 shared bus, PA4–PA7 + PD7 selects</text>
    <text x="10" y="352" font-size="11" fill="var(--ink2)">Block drawing from v100w.c v105 and the v201 FPGA pin list; no AMS8-1 Gerber used.</text></svg>`;
  return s;
}
function bindPanels(root){
  root.querySelectorAll('.r6knob').forEach(g=>{ const k=+g.dataset.k;
    g.addEventListener('click', ev=>{ const r=g.getBoundingClientRect(); const x=(ev.clientX-r.left)/r.width; if (x<0.36) A.turn(k,-1); else if (x>0.64) A.turn(k,1); else A.push(k); });
    g.addEventListener('wheel', ev=>{ ev.preventDefault(); A.turn(k, ev.deltaY<0?1:-1); }, {passive:false}); });
  root.querySelectorAll('.r6pb').forEach(g=> g.addEventListener('click', ()=>{ const b=g.dataset.b;
    if (b==='aes') A.src('AES110'); else if (b==='analog') A.src('ANALOG'); else if (b==='sdi') A.src('SDI12'); else if (b==='st') A.st();
    else act('Press '+PB[b][2], tr=>tr('No effect: this button position was added by RD73 (front PCB iss4, 2015|48). MLC8AM v205 reads only PRESET_PB1/2 and MODE1/4_PB.')); }));
  root.querySelectorAll('.r6jack').forEach(g=> g.addEventListener('click', ()=>A.cable(+g.dataset.p)));
  root.querySelectorAll('.r6ref').forEach(g=> g.addEventListener('click', ()=>A.ref()));
  root.querySelectorAll('.r6mb').forEach(g=> g.addEventListener('click', ()=>{ D.pick=g.dataset.k; SIM.refresh(); }));
}
function cfgHTML(){
  const c=D.cfg;
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
    <button data-cfg="before" class="${c==='before'?'on':''}">BEFORE · AMS8-1 + v105</button>
    <button data-cfg="after" class="${c==='after'?'on':''}">AFTER · iss5 + v106</button>
    <button data-cfg="bench" class="${c==='bench'?'on':''}">WORKBENCH · iss5 + v105 + patches</button></div>
    <div style="display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:6px">${PORDER.map(k=>`<label class="small" title="${esc(PATCH[k].d)}"><input type="checkbox" data-pt="${k}" ${D.p[k]?'checked':''}> <b>${k}</b> <span class="mono">${esc(PATCH[k].t)}</span></label>`).join('')}</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;align-items:center">
      <button data-x="none">bench: no patches</button><button data-x="all">bench: all six</button>
      <button data-x="replug">unplug all / replug at playhead</button><button data-x="sdi">SDI carrier on/off</button><button data-x="clr">clear events</button>
      <label class="small">IN rate <select data-x="fs">${FS_LIST.map(f=>`<option value="${f}" ${D.fs[D.scopeP]===f?'selected':''}>${f/1000} kHz</option>`).join('')}</select> (IN ${D.scopeP+1})</label>
      <label class="small">Scope pair <select data-x="sp">${[0,1,2,3].map(p=>`<option value="${p}" ${D.scopeP===p?'selected':''}>IN ${p+1}</option>`).join('')}</select></label>
      <button data-x="rst">reset</button></div>
    <div class="small muted" style="margin-top:4px">Keys: 1–4 plug/unplug IN n at the playhead · A / N / S front AES / ANALOG / SDI · M ST MODE · R replug test · Q/E turn the selected knob.</div>`;
}
function bindCfg(root){
  root.querySelectorAll('[data-cfg]').forEach(b=> b.onclick=()=>A.cfg(b.dataset.cfg));
  root.querySelectorAll('[data-pt]').forEach(b=> b.onchange=()=>A.patch(b.dataset.pt));
  const x=s=>root.querySelector(`[data-x="${s}"]`);
  if (x('none')) x('none').onclick=()=>A.benchAll(false);
  if (x('all')) x('all').onclick=()=>A.benchAll(true);
  if (x('replug')) x('replug').onclick=()=>A.replugAll();
  if (x('sdi')) x('sdi').onclick=()=>A.sdi();
  if (x('clr')) x('clr').onclick=()=>A.clearEv();
  if (x('rst')) x('rst').onclick=()=>A.reset();
  if (x('fs')) x('fs').onchange=ev=>{ D.fs[D.scopeP]=+ev.target.value; act(`IN ${D.scopeP+1} sample rate → ${ev.target.value/1000} kHz`, tr=>{ tr('The FPGA resampler (Altera SRC reference design, sys_clk_freq = 2 → 98.304 MHz) converts it to the internal 48 kHz; the AMS8-1 did the same with an AD1895.'); tr(`aes3_2_i2s needs 256 edges: ≈ ${(T_DET(D.fs[D.scopeP])*1e6).toFixed(0)} µs to detect at this rate.`); }); };
  if (x('sp')) x('sp').onchange=ev=>{ D.scopeP=+ev.target.value; SIM.refresh(); };
}
document.addEventListener('keydown', ev=>{
  if (!window[KEY] || (ev.target.matches && ev.target.matches('input,select,textarea'))) return;
  const k=ev.key.toLowerCase();
  if ('1234'.includes(k) && k.length===1){ A.cable(+k-1); ev.preventDefault(); }
  else if (k==='a') A.src('AES110'); else if (k==='n') A.src('ANALOG'); else if (k==='s') A.src('SDI12'); else if (k==='m') A.st();
  else if (k==='r') A.replugAll(); else if (k==='q') A.turn(D.sel,-1); else if (k==='e') A.turn(D.sel,1);
});

/* ================================================================
   TIMELINE LANES
   ================================================================ */
function txt(c,s,x,y,col){ c.fillStyle=col||SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(s,x,y); }
function loopLane(label, e){
  return {label, h:30, draw(c,X,t0,t1,y,h){
    const s=schedule(e), css=SIM.css;
    for (const p of s.passes){ if (p.t1<t0 || p.t0>t1) continue;
      if (p.kind==='boot'){ c.fillStyle=css('--bad'); c.globalAlpha=.3; c.fillRect(X(p.t0),y+3,X(p.t1)-X(p.t0),h-6); c.globalAlpha=1; txt(c,'watchdog reset → main(): 15 × wait_ms(500) + CONFIGURE_ALTERA (7.7 s)',Math.max(X(p.t0),X(t0))+4,y+h/2+4); continue; }
      const pw=X(p.t1)-X(p.t0);
      if (pw<3){ c.fillStyle=css(p.i%2?'--accent':'--accent2'); c.globalAlpha=.55; c.fillRect(X(p.t0),y+6,Math.max(1,pw),h-12); c.globalAlpha=1; }
      else p.steps.forEach(st=>{ c.fillStyle=css(STEP_COL[st.k]); c.globalAlpha= st.k===4?.75:.55; c.fillRect(X(st.a),y+5,Math.max(1,X(st.b)-X(st.a)-0.5),h-10); c.globalAlpha=1; });
      if (p.stall){ c.fillStyle=css(p.stall.long?'--bad':'--warn'); c.globalAlpha=.45; c.fillRect(X(p.stall.a),y+2,Math.max(2,X(p.stall.b)-X(p.stall.a)),h-4); c.globalAlpha=1;
        if (X(p.stall.b)-X(p.stall.a)>120) txt(c, p.stall.long?'RESET_CS8416 relock: RUN=0 ×4 · wait_ms(500) · RUN=1 ×4 — loop frozen':'Dolby reset', Math.max(X(p.stall.a),X(t0))+4, y+h/2+4); }
      if (p.kind==='spin'){ c.fillStyle=css('--bad'); c.fillRect(X(p.spinFrom),y+2,X(p.t1)-X(p.spinFrom),h-4); if (X(p.t1)-X(p.spinFrom)>60) txt(c,'while(error0==0) NOP() → WDT',X(p.spinFrom)+3,y+h/2+4,'#fff'); }
      if (pw>110) txt(c,'#'+p.i+' '+SIM.fmtDur(p.t1-p.t0), X(p.t0)+3, y+11);
    }
  }};
}
function biphaseHalfbits(n, fs, p){
  // one AES frame n: two subframes of 32 cells, 64 half-bits each
  const out=[]; let lvl=0;
  for (let sf=0;sf<2;sf++){
    const pre = sf===0 ? (n%192===0?[1,1,1,0,1,0,0,0]:[1,1,1,0,0,0,1,0]) : [1,1,1,0,0,1,0,0];
    const inv = lvl===1; pre.forEach(b=>out.push(inv?1-b:b)); lvl=out[out.length-1];
    const v = Math.round(0.3*Math.sin(2*Math.PI*1000*n/fs + sf + p)*0x7FFFF) & 0xFFFFF;
    const bits=[0,0,0,0]; for (let i=0;i<20;i++) bits.push((v>>i)&1); bits.push(0, 0, (n%7===0)?1:0); let par=bits.reduce((a,b)=>a^b,0); bits.push(par);
    bits.forEach(b=>{ const f=1-lvl; out.push(f); const s= b? 1-f : f; out.push(s); lvl=s; });
  }
  return out;
}
function lanes(){
  const e=eff(), css=SIM.css, P=D.scopeP, L=[];
  L.push({label:`AES IN ${P+1} (${fsOf(P)/1000} kHz, biphase)`, h:30, draw(c,X,t0,t1,y,h){
    const fs=fsOf(P), fr=1/fs, w=t1-t0;
    const segsOn=[]; // draw presence spans
    if (w > 60e-6){ for (let x=0;x<=200;x++){ const tt=t0+w*x/200; if (presentSince(P,tt)!==null){ c.fillStyle=css('--accent2'); c.globalAlpha=.3; c.fillRect(X(tt),y+8,X(t0+w/200)-X(t0)+1,h-16); c.globalAlpha=1; } }
      if (w<4e-3) SIM.pulses(c,X,t0,t1,y,h,fr,0,fr*0.06,css('--accent2'),'frames'); else txt(c, presentSince(P,(t0+t1)/2)!==null? `${Math.round(fs*w).toLocaleString()} frames in view (zoom to 20 µs for bits)`:'no signal', X(t0)+6, y+h/2+4); return; }
    const hb=fr/128; c.strokeStyle=css('--accent2'); c.lineWidth=1.5; c.beginPath(); let first=true;
    for (let n=Math.floor(t0/fr); n*fr<t1; n++){ const ts=n*fr; if (presentSince(P,ts)===null) continue; const H=biphaseHalfbits(n,fs,P);
      H.forEach((b,i)=>{ const a=ts+i*hb, yy=b? y+6 : y+h-6; if (first){ c.moveTo(X(a),yy); first=false; } else c.lineTo(X(a),yy); c.lineTo(X(a+hb),yy); }); }
    c.stroke(); txt(c,'preamble B/M/W then 28 cells (aux, 20-bit audio, V U C P)', X(t0)+6, y+11, css('--ink2'));
  }});
  if (e.board==='old') L.push({label:`CS8416 #${P+1} lock (RERR low)`, h:22, draw(c,X,t0,t1,y,h){ stepLane(c,X,t0,t1,y,h,tt=>detected(P,tt,e),'locked','PLL settling ≈20 ms (inferred)'); }});
  else { L.push({label:`inst66 aes3_input_detected[${P}]`, h:22, draw(c,X,t0,t1,y,h){ stepLane(c,X,t0,t1,y,h,tt=>fpgaOK(e)&&detected(P,tt,e),'detected','counting 256 edges'); }});
    L.push({label:`aesrx_lock[${P}] (NOT) → reg 0x00`, h:22, draw(c,X,t0,t1,y,h){ stepLane(c,X,t0,t1,y,h,tt=>!(fpgaOK(e)&&detected(P,tt,e)),'1 = no lock',''); }}); }
  L.push(loopLane('Main loop · BEFORE (v105)', cfgOf('before')));
  L.push(loopLane('Main loop · AFTER (v106)', cfgOf('after')));
  if (D.cfg==='bench') L.push(loopLane('Main loop · WORKBENCH', e));
  L.push({label: e.board==='old'||readMode(e)==='absent' ? 'Lock read: PD1 clk / PD0 / PD6, PA4–7 CS' : 'Lock read: PC2 CS / PC0 SCLK / PC3 MISO', h:46, draw(c,X,t0,t1,y,h){ busLane(c,X,t0,t1,y,h,e); }});
  L.push({label:'PC4–PC7 chain → SHARC SPORT1', h:22, draw(c,X,t0,t1,y,h){
    for (const p of schedule(e).passes){ if (p.kind==='boot'||!p.steps[4]) continue; const s=p.steps[4]; if (s.b<t0||s.a>t1) continue;
      const bw=X(s.a+C.CHAIN_BIT)-X(s.a);
      if (bw<3){ c.fillStyle=css('--accent'); c.globalAlpha=.5; c.fillRect(X(s.a),y+5,Math.max(1,X(s.b)-X(s.a)),h-10); c.globalAlpha=1; if (X(s.b)-X(s.a)>150) txt(c,'640 bits, byte 72 = Astatus 0x'+(p.ast||0).toString(16), X(s.a)+3, y+h/2+4, css('--ink')); }
      else for (let b=0;b<640;b++){ const a=s.a+b*C.CHAIN_BIT; if (a>t1) break; if (a+C.CHAIN_BIT<t0) continue; c.fillStyle=css(b>=576&&b<584?'--warn':'--accent'); c.fillRect(X(a),y+5,Math.max(1,bw*0.45),h-10); }
    } }});
  L.push({label:'Astatus (1 = locked) per pass', h:22, draw(c,X,t0,t1,y,h){
    for (const p of schedule(e).passes){ if (p.kind!=='loop' && p.kind!=='spin') continue; if (p.t1<t0||p.t0>t1) continue; const v=p.ast||0;
      for (let q=0;q<4;q++){ c.fillStyle=(v>>q)&1? css('--accent'):css('--bad'); c.globalAlpha=.7; c.fillRect(X(p.t0),y+2+q*4.5,Math.max(1,X(p.t1)-X(p.t0)-0.5),3.5); c.globalAlpha=1; }
      if (X(p.t1)-X(p.t0)>70) txt(c,'0x'+v.toString(16)+' ls='+(p.ls?'LOCKED':'NO_LOCK')+' lc='+p.lc, X(p.t0)+3, y+h-3); } }});
  L.push({label:'ERR LEDs 1–4 (SHARC btst 24–27)', h:24, draw(c,X,t0,t1,y,h){
    const N=300; for (let x=0;x<N;x++){ const tt=t0+(t1-t0)*x/N, er=errAt(tt,e); for (let q=0;q<4;q++){ if (er[q]){ c.fillStyle='#ff3b2f'; c.fillRect(X(tt),y+2+q*5.5,X(t0+(t1-t0)/N)-X(t0)+1,4); } } } }});
  L.push({label:'UART0 poll ↔ front panel', h:20, draw(c,X,t0,t1,y,h){
    for (const p of schedule(e).passes){ if (!p.poll || p.kind!=='loop') continue; if (p.t0>t1 || p.t0+6*C.UART_BYTE<t0) continue;
      for (let b=0;b<6;b++){ const a=p.t0+b*C.UART_BYTE; c.fillStyle=css('--ink2'); c.fillRect(X(a),y+4,Math.max(1.5,X(a+10/38400)-X(a)),h-8); } } }});
  L.push({label:'Front SDI button LED (FLASH_LEDS)', h:18, draw(c,X,t0,t1,y,h){ stepLane(c,X,t0,t1,y,h,tt=>pbLed('sdi',tt),'lit',''); }});
  return L;
}
function stepLane(c,X,t0,t1,y,h,f,onTxt,midTxt){
  const N=400, css=SIM.css; let prev=null, x0=X(t0);
  for (let i=0;i<=N;i++){ const tt=t0+(t1-t0)*i/N, v=!!f(tt); if (prev===null){ prev=v; x0=X(tt); continue; }
    if (v!==prev || i===N){ c.fillStyle=prev? css('--accent'):css('--grid'); c.globalAlpha=prev?.6:.8; c.fillRect(x0,y+4,X(tt)-x0,h-8); c.globalAlpha=1; if (prev && X(tt)-x0>60) txt(c,onTxt,x0+3,y+h/2+4); x0=X(tt); prev=v; } }
}
function busLane(c,X,t0,t1,y,h,e){
  const css=SIM.css, m=readMode(e);
  for (const p of schedule(e).passes){ if (p.kind==='boot'||!p.steps[0]) continue; const s=p.steps[0]; if (s.b<t0||s.a>t1) continue;
    const span=X(s.b)-X(s.a);
    if (span<160){ c.fillStyle=css('--accent2'); c.globalAlpha=.6; c.fillRect(X(s.a),y+6,Math.max(1,span),h-12); c.globalAlpha=1; if (span>40) txt(c, m==='spi'||m==='spi0'?'SPI+CS5':'CS8416 ×5', X(s.a)+2, y+h/2+4); continue; }
    if (m==='cs'||m==='absent'){
      for (let chip=0;chip<5;chip++){ const a=s.a+chip*C.T_CSR; c.fillStyle=css('--warn'); c.fillRect(X(a),y+2,X(a+C.T_CSR)-X(a)-1,8); txt(c, chip<4?`PA${chip+4} CS${chip+1}`:'PD7 CS5', X(a)+2, y+9, '#000');
        for (let b=0;b<32;b++){ const ba=a+20/F+b*C.CS_BIT; c.fillStyle=css('--ink2'); c.fillRect(X(ba),y+14,Math.max(1,X(ba+C.CS_BIT*0.3)-X(ba)),10);
          const out = b<24 ? ([0x20,0x0C,0x21][b>>3]>>(7-(b&7)))&1 : (chip<4 ? (m==='absent'?1: (detected(chip,a,e)?0:1)) : (D.ref?0:1));
          c.fillStyle= b<24? css('--accent2') : css(out?'--bad':'--accent'); if (out) c.fillRect(X(ba),y+28,X(ba+C.CS_BIT)-X(ba),12); else c.fillRect(X(ba),y+38,X(ba+C.CS_BIT)-X(ba),2); } }
    } else {
      const reg = m==='spi' ? reg00(s.a,e) : 0;
      c.fillStyle=css('--warn'); c.fillRect(X(s.a),y+2,X(s.a+C.T_SPI)-X(s.a),6); txt(c,'PC2 CS high (spicontrol cs)',X(s.a)+2,y+8,'#000');
      for (let b=0;b<16;b++){ const ba=s.a+30/F+b*C.SPI_BIT; c.fillStyle=css('--ink2'); c.fillRect(X(ba+8/F),y+12,Math.max(1,X(ba+8/F+C.SPI_HI)-X(ba+8/F)),10);
        const mosi = b<8 ? (0x80>>(7-b))&1 : 0, miso = b<8 ? 0 : (reg>>(15-b))&1;
        c.fillStyle=css('--accent2'); if (mosi) c.fillRect(X(ba),y+24,X(ba+C.SPI_BIT)-X(ba),6);
        c.fillStyle=css(miso?'--bad':'--accent'); if (miso) c.fillRect(X(ba),y+32,X(ba+C.SPI_BIT)-X(ba),10); else c.fillRect(X(ba),y+40,X(ba+C.SPI_BIT)-X(ba),2); }
      const ra=s.a+C.T_SPI; c.fillStyle=css('--warn'); c.fillRect(X(ra),y+2,X(ra+C.T_CSR)-X(ra),6); txt(c,`MOSI 0x80 0x00 · MISO 0x${reg.toString(16).padStart(2,'0')} · then CS8416_read5 (PD7)`, X(s.a)+2, y+h-1);
    } }
}

/* ================================================================
   VIEWS
   ================================================================ */
function inspectHTML(t){
  const e=eff(), st=stepAt(t,e), p=st.p, er=errAt(t,e);
  return `<table class="kv">
    <tr><th>Build</th><td>${e.name}</td></tr>
    <tr><th>Main-loop pass</th><td class="mono">${!p?'—':p.kind==='boot'?'rebooting (watchdog)':'#'+p.i+' · '+(st.k>=0?STEP_NAMES[st.k][0]:'')}${st.stall?' <b style="color:var(--bad)">FROZEN in RESET_CS8416</b>':''}${st.spin?' <b style="color:var(--bad)">SPINNING (no WDR)</b>':''}</td></tr>
    <tr><th>Lock read path</th><td class="mono small">${{cs:'CS8416_read1…5(0x0C) bit-banged',absent:'CS8416_read1…4 → absent chips → 0xFF',spi:'alteraRead(0x00) over PC0–3 + CS8416_read5',spi0:'alteraRead with uninitialised pins → 0x00'}[readMode(e)]} · ${SIM.fmtDur(lockReadDur(e))}</td></tr>
    <tr><th>FPGA reg 0x00</th><td class="mono">${e.board==='old'?'— (no spicontrol in v201)':fpgaOK(e)?'0x'+reg00(t,e).toString(16).padStart(2,'0')+' (bit n = 1 → pair n not detected)':'FPGA not configured'}</td></tr>
    <tr><th>CS8416_READ_LOCK_ALL</th><td class="mono">0x${rawStatus(t,e).toString(16).padStart(2,'0')} → ISOLATE_INPUT_STATUS → Astatus 0x${astatusAt(t,e).toString(16)}</td></tr>
    <tr><th>ERR LEDs</th><td class="mono">${er.map((x,i)=>`${i+1}:${x?'<b style="color:var(--bad)">ON</b>':'off'}`).join(' ')}</td></tr>
    <tr><th>Inputs</th><td class="mono small">${[0,1,2,3].map(q=>`IN${q+1} ${presentSinceCable(q,t)?'plugged':'—'} ${D.fs[q]/1000}k`).join(' · ')} · REF ${D.ref?'plugged':'—'} · SDI ${sdiAt(t)?'carrier':'none'}</td></tr>
    <tr><th>Front</th><td class="mono small">source_select ${D.source} · ${D.st?'MODE4 (ST)':'MODE1 (5.1)'} · master ${D.vol}</td></tr></table>`;
}
function traceHTML(){ const l=D.log[0]; return l? `<div><b>${esc(l.name)}</b></div>`+l.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Plug a rear input, press a front button or switch builds. Each step the firmware takes is listed here.</div>'; }
function compareHTML(){
  const b=cfgOf('before'), a=cfgOf('after');
  const row=(k,x,y)=>`<tr><th>${k}</th><td class="mono small">${x}</td><td class="mono small">${y}</td></tr>`;
  const d=[stepDurs(b),stepDurs(a)].map(s=>s.reduce((p,q)=>p+q,0));
  return `<table class="kv"><tr><th></th><th>BEFORE (AMS8-1, v105)</th><th>AFTER (iss5, v106)</th></tr>
    ${row('AES receive', '4 × CS8416 + 4 × AD1895 (U-parts)', 'src_aes_example_top inst66 in the EP4CE40')}
    ${row('Main FPGA', 'EP1C6Q240C7, v201, Quartus 5.1', 'EP4CE40F23C6, RD60 vcurrent = V050000, Quartus 11.1')}
    ${row('Lock read per pass', SIM.fmtDur(lockReadDur(b))+' (5 × CS8416_readN)', SIM.fmtDur(lockReadDur(a))+' (SPI + CS8416_read5)')}
    ${row('Pass length '+inf, SIM.fmtDur(d[0]), SIM.fmtDur(d[1]))}
    ${row('Lock detect after plug-in', '≈ '+C.CS_LOCK*1e3+' ms PLL '+inf, '256 edges ≈ '+(T_DET(48000)*1e6).toFixed(0)+' µs at 48 kHz')}
    ${row('Relock (all → any)', 'RUN=0 ×4, wait_ms(500), RUN=1 ×4: loop frozen 0.5 s', 'Dolby card reset only: wait_us(500)')}
    ${row('PC0–PC3', 'outputs “1 = DATA, 0 = PCM” to unconnected FPGA pins', 'SPI to spicontrol (A20/B20/A19/B19)')}
    ${row('PA4–PA7', 'CS8416 #1–#4 chip selects', 'PA4 NCE (input) · PA5/PA6 FPGA B16/A16 · PA7 RESET_TPS70402')}
    ${row('Firmware files', 'v100w.c 7147 lines, common.c', 'v100w.c 6832 + common.h 361 + altspi.c + AESAudio.c')}</table>`;
}
function viewSim(m){
  window[KEY]=true;
  m.innerHTML = `<div class="grid2"><div>
      ${card('Build under test', `<div id="cfg"></div>`)}
      ${card('Front panel (MLC8B silkscreen) at the playhead', `<div id="fp"></div><p class="small muted">MLC-8B-FRONT-SILK (CURVE MLC-M11), 2015|48 drafting set, green and white inks. In April 2013|46 the unit had four buttons (DebugNotes.xlsx: “AES 110Ohm | Analog / SDI | Stereo 5.1”); the SDI 1 / SDI 2 column was added by RD73.</p>`)}
      ${card('Rear panel (MLC8B silkscreen)', `<div id="rp"></div>`)}
    </div><div>
      ${card('What the firmware did', `<div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
      ${card('Main board — click a part', `<div id="mb"></div><p id="mbi" class="small"></p>`)}
    </div></div>
    ${card('Timeline — one second (click to seek). Zoom to 100 µs for the SPI bits, 20 µs for the AES biphase.', `<canvas id="tl"></canvas>
      <p class="small muted">Pass lengths come from instruction counts in the .lis listings at 4.9152 MHz ${inf}. Step colours: blue = lock read, orange = RESET_CS8416, green = the 80-byte chain. Red band = main loop frozen.</p>`)}
    ${card('Before / after at a glance', `<div id="cmp"></div>`)}`;
  const cfg=m.querySelector('#cfg');
  const draw=()=>{
    if (put(cfg,cfgHTML())) bindCfg(cfg);
    let ch=put(m.querySelector('#fp'),frontSVG(SIM.t)); ch=put(m.querySelector('#rp'),rearSVG())||ch; ch=put(m.querySelector('#mb'),boardSVG())||ch;
    if (ch) bindPanels(m);
    m.querySelector('#mbi').innerHTML = eff().board==='iss5' ? `<b>${MB[D.pick].t}</b> — ${MB[D.pick].d}<br><span class="muted">AMS8E-1 iss5 top side drawn from Ams8e-1iss5.GTO/.GTS; part boxes and nets from Ams8e-1iss5-net.ipc.</span>` : '';
    m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#insp').innerHTML=inspectHTML(SIM.t); m.querySelector('#cmp').innerHTML=compareHTML();
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
  };
  SIM.on('time', draw);
}

/* ---------------- tutorial ---------------- */
let lesson=0;
const LESSONS = [
  {title:'1 · The job', body:`<p>April 1, ${Y(2013)}: the new AMS8E-1 issue 5 main board is in (Sencore built it turnkey). RD60 has already moved the AMS81 onto it. Your job, as RD66 (owner Peter, register line “MLC8 implementation using ams8e-1iss5 board”), is to put the <b>MLC8</b> on the same board.</p><p>Start with the old unit. Pick <b>BEFORE</b> and leave all four AES inputs plugged into the rear Phoenix connectors. The meters move and the four red ERR LEDs under the meters are dark.</p>`, check:()=>D.cfg==='before' && [0,1,2,3].every(p=>presentSinceCable(p,SIM.t)), hint:'Build under test → BEFORE.'},
  {title:'2 · How the old board reports lock', body:`<p>Zoom the timeline to <b>10 ms</b>. Each main-loop pass starts with <span class="mono">CS8416_READ_LOCK_ALL</span>: five bit-banged reads of register 0x0C on PD0/PD1/PD6, one per receiver, chip-selected by PA4–PA7 and PD7. That is ≈${(5*C.T_CSR*1e3).toFixed(2)} ms of every pass.</p><p>Now press <b>unplug all / replug</b> with the playhead near 0.2 s and scrub forward. When the first input comes back, <span class="mono">RESET_CS8416</span> stops and restarts four CS8416s around a <span class="mono">wait_ms(500)</span>. The loop freezes for half a second.</p>`, check:()=>D.flags.freeze_old && D.cfg==='before', hint:'Click “unplug all / replug at playhead” while on BEFORE.'},
  {title:'3 · Read what changed on the board', body:`<p>The iss5 board keeps <b>one</b> CS8416 (U24) and one AD1895 (U10), both for the reference input only. The four inputs are received inside the Cyclone IV. The iss5 netlist also moved the AVR pins: PA4 now goes to the FPGA's <b>nCE</b>, PA7 to <b>RESET_TPS70402</b>, and PC0–PC3 to the FPGA (SPI).</p><p>Put the <b>unmodified v105</b> on it: <b>WORKBENCH</b> with no patches. Look at the main-loop lane: 200 passes with no “V101” echo, then <span class="mono">while(error0==0) NOP()</span> and a watchdog reset ${inf}.</p>`, check:()=>D.cfg==='bench' && PORDER.every(k=>!D.p[k]), hint:'Click “bench: no patches”.'},
  {title:'4 · Patch D: let go of nCE', body:`<p>v105's <span class="mono">port_init</span> sets <span class="mono">PORTA = 0xFF, DDRA = 0xF0</span>: PA4–PA7 are outputs, high. On iss5 PA4 holds the FPGA's nCE high. Apply patch <b>D</b> (<span class="mono">PORTA = 0x8F, DDRA = 0xC0</span>).</p><p>The FPGA now runs and audio reaches the meters. But all four ERR LEDs are lit: the code still asks CS8416 #1–#4, which are gone. PD6 floats to its pull-up and every read returns 0xFF, “not locked”.</p>`, check:()=>D.cfg==='bench' && D.p.D && !D.p.B, hint:'Tick patch D only.'},
  {title:'5 · Borrow the FPGA from RD60', body:`<p>An engineer would not rewrite the FPGA: copy RD60's <span class="mono">vcurrent</span> and check that it really is the same design. Press <b>Run the hash check</b> on the Software tab (or here).</p><p><button id="hbtn">Run the hash check</button></p><p>204 of 206 files are identical; only <span class="mono">AMS81.qpf</span> differs. The design already exposes the lock byte: register 0x00 of <span class="mono">spicontrol</span>.</p>`, check:()=>D.hash, hint:'Press the button.'},
  {title:'6 · Patches A and B: read lock from the FPGA', body:`<p>Copy <span class="mono">altspi.c</span> and <span class="mono">AESAudio.c</span> from the AMS8 V050000 main board (hash-identical). Add the includes and <span class="mono">alteraInitSpi()</span> (patch <b>A</b>). Then replace the four <span class="mono">CS8416_readN(0x0C)</span> calls with <span class="mono">status = (0x0F &amp; aesReadLockStatus())</span> (patch <b>B</b>).</p><p>Try B without A first: every pair reads “locked”, even unplugged. With both, the ERR LEDs follow the rear cables. Try unplugging IN 2.</p>`, check:()=>D.cfg==='bench' && D.p.A && D.p.B, hint:'Tick A and B.'},
  {title:'7 · Why no inversion was needed', body:`<p>The RD60 control description says register 0x00 is “1 = locked”. The FPGA drawing says otherwise: <span class="mono">aes3_input_detected</span> passes through NOT gates inst65/73/74/75 before <span class="mono">aesrx_lock</span>. So the register reads <b>1 = no lock</b>, the same as the CS8416, and <span class="mono">ISOLATE_INPUT_STATUS</span> could stay untouched. Unplug IN 3 and look at the “State” table: reg 0x00 bit 2 goes to 1 and Astatus bit 2 goes to 0.</p>`, check:()=>D.cfg!=='before' && fpgaOK(eff()) && readMode(eff())==='spi' && !presentSinceCable(2,SIM.t), hint:'Click IN 3 on the rear panel.'},
  {title:'8 · Patch C: remove the half-second freeze', body:`<p>Run <b>unplug all / replug</b> on the workbench. The relock still writes RUN bits to four absent receivers and waits 500 ms. Apply patch <b>C</b> (the commented-out block in <span class="mono">RESET_CS8416</span>) and run it again: only the Dolby card reset remains.</p>`, check:()=>D.cfg==='bench' && D.p.C && D.p.A && D.p.B && D.p.D, hint:'Tick C.'},
  {title:'9 · Tidy up: E and F', body:`<p>Patch <b>E</b> rewrites PORTC/DDRC, but <span class="mono">alteraInitSpi()</span> sets PC0–PC3 right after <span class="mono">port_init</span>, so it changes nothing. Patch <b>F</b> comments out <span class="mono">PORTE |= 0x10</span> as “useless”. It was in fact the only line that turned on PE4's pull-up, and PE4 is the DIM input. Apply both: the workbench is now byte-for-byte the RD66 v106 diff.</p>`, check:()=>D.cfg==='bench' && benchAll(), hint:'Tick E and F (or “bench: all six”).'},
  {title:'10 · The front panel did not change', body:`<p>The front Atmel (MLC8AM v205) and front FPGA (MLC8A v200) are archived unchanged and hash-identical to the masters. Check it on the panel: press the SDI button, then turn the SDI carrier off. The SDI LED flashes (<span class="mono">FLASH_LEDS</span>). Then go back to AES.</p>`, check:()=>D.source==='AES110' && D.log.some(l=>/SDI/.test(l.name)), hint:'Press the bottom-middle button (SDI), toggle “SDI carrier”, then press AES.'},
  {title:'11 · Ship it', body:`<p>April 3: v106 done. <i>“Seems like the only thing that was different from original mlc software is the main board atmel and main board fpga … nice.”</i> On April 8 the MLC8B comprehensive test lists AMS8E-1 issue 5 with main Atmel <b>V050000</b>, FPGA <b>V050000</b> and DSP <b>V106</b>. The RD66 folder <span class="mono">v105</span> (really v106) is byte-identical to <span class="mono">MLC8AM AMS8-1/atmel/v050000</span>. The MLC8A moved to the same main firmware in December ${Y(2014)}.</p><p>Compare <b>BEFORE</b> and <b>AFTER</b> in the table on the Simulator tab.</p>`, check:()=>D.cfg==='after', hint:'Pick AFTER.'},
];
function viewTutorial(m){
  window[KEY]=true;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — doing RD66 as the engineer did', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('Build under test', `<div id="cfg"></div>`)}${card('Front', `<div id="fp"></div>`)}${card('Rear', `<div id="rp"></div>`)}${card('State', `<div id="insp"></div>`)}</div></div>
    ${card('Timeline', `<canvas id="tl"></canvas>`)}`;
  const draw=()=>{
    const cfg=m.querySelector('#cfg'); if (put(cfg,cfgHTML())) bindCfg(cfg);
    let ch=put(m.querySelector('#fp'),frontSVG(SIM.t)); ch=put(m.querySelector('#rp'),rearSVG())||ch; if (ch) bindPanels(m);
    m.querySelector('#insp').innerHTML=inspectHTML(SIM.t); m.querySelector('#trace').innerHTML=traceHTML();
    schedule(cfgOf('before')); schedule(eff());
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lesson?'font-weight:700;color:var(--accent)':''}">${l.title}${l.check()?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{ lesson=+li.dataset.i; draw(); });
    const L=LESSONS[lesson], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?'✓ Goal reached.':'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${lesson?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${lesson<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    const hb=m.querySelector('#hbtn'); if (hb) hb.onclick=()=>A.hash();
    m.querySelector('#pv').onclick=()=>{ lesson=Math.max(0,lesson-1); draw(); };
    m.querySelector('#nx').onclick=()=>{ lesson=Math.min(LESSONS.length-1,lesson+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); D.cfg='before'; lesson=0; SIM.refresh(); };
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
  };
  SIM.on('time', draw);
}

/* ---------------- one second ---------------- */
function viewSecond(m){
  window[KEY]=true;
  m.innerHTML=`${card('One second, counted', `<div id="tab"></div>`)}
    <div class="grid2">${card('Zoom ladder at the playhead (1 s → 10 ms → 300 µs → 20 µs)', `<canvas id="zl"></canvas>`)}
      ${card('As the displays see it', `<div id="fp"></div><div id="dsp" class="small"></div>`)}</div>`;
  const draw=()=>{
    const b=schedule(cfgOf('before')), a=schedule(cfgOf('after')), n=s=>s.passes.filter(p=>p.kind==='loop'&&p.t0<1).length;
    const row=(k,x,y,z)=>`<tr><th>${k}</th><td class="mono">${x}</td><td class="mono">${y}</td><td class="small">${z}</td></tr>`;
    m.querySelector('#tab').innerHTML=`<table class="kv"><tr><th>Event</th><th>BEFORE</th><th>AFTER</th><th>Notes</th></tr>
      ${row('AES frames per input', '48 000', '48 000', 'each frame = 2 × 32 cells = 128 half-bits')}
      ${row('Biphase edges per input', '≈ 4.6 M', '≈ 4.6 M', 'aes3_2_i2s samples at 98.304 MHz on both clock edges (double_resolution)')}
      ${row('Main-loop passes '+inf, n(b), n(a), 'fewer if a relock freeze lands in the second')}
      ${row('Lock reads', n(b)+' × 5 CS8416 reads', n(a)+' × (SPI + CS8416_read5)', '32 bits each vs 16 SPI bits')}
      ${row('Bits on the PC4–PC7 chain', (640*n(b)).toLocaleString(), (640*n(a)).toLocaleString(), 'AVR → FPGA wire → SHARC DR1A; SHARC echoes on DT1A → PC4 and into shift_in32')}
      ${row('SHARC meter frames '+inf, '400', '400', 'ERR bits come from TDM_IN_ctl+18 at each sport0_isr')}
      ${row('Front polls '+inf, Math.ceil(n(b)/C.POLL_PASSES), Math.ceil(n(a)/C.POLL_PASSES), '#…$ frames on UART0, bytes 1.82 ms apart')}
      ${row('Time to see a plug-in', '≈ 20 ms PLL '+inf+' + ≤ 1 pass', '≈ 56 µs + ≤ 1 pass', '+25 passes for lock_status (Dolby)')}</table>`;
    const cv=m.querySelector('#zl'), {c,w}=SIM.canvas(cv, 4*58+10), css=SIM.css, t=SIM.t;
    [[1,'1 s'],[0.01,'10 ms'],[3e-4,'300 µs'],[2e-5,'20 µs']].forEach(([span,lbl],i)=>{
      const t0=Math.max(0,Math.min(1-span,t-span/2)), y=i*58+4, X=tt=>150+(tt-t0)/span*(w-160);
      c.fillStyle=css('--ink'); c.font='12px '+css('--sans'); c.fillText(lbl+' window',6,y+16);
      const ln = i<2 ? loopLane('',eff()) : i===2 ? {draw:(cc,XX,a0,a1,yy,hh)=>busLane(cc,XX,a0,a1,yy,hh,eff())} : lanes()[0];
      c.save(); c.beginPath(); c.rect(150,y,w-160,52); c.clip(); try{ ln.draw(c,X,t0,t0+span,y,i===2?50:30); }catch(_){} c.restore();
      c.strokeStyle=css('--play'); c.beginPath(); c.moveTo(X(t),y); c.lineTo(X(t),y+52); c.stroke(); });
    put(m.querySelector('#fp'),frontSVG(t));
    const er=errAt(t), e=eff();
    m.querySelector('#dsp').innerHTML=`<p>${e.name}. ERR: ${er.map((x,i)=>`${i+1} ${x?'ON':'off'}`).join(', ')}. Meter bars: ${[0,1,2,3,4,5,6,7].map(c2=>segs(c2,t,e)).join(' ')} of 22 LEDs. Source ${D.source}, SDI LED ${pbLed('sdi',t)?'lit':'dark'}.</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- block diagram ---------------- */
const BLK = {
  aes:{x:10,y:30,w:140,h:70,t:'AES IN 1–4',s:['rear Phoenix 110 Ω','→ H9'],d:'Four AES pairs (MLC8B rear: IN 1–4). Wired to AES_IN_1..4 (Y22, W22, Y21, W21) on iss5.'},
  rx_old:{x:180,y:10,w:170,h:70,t:'CS8416 ×4 + AD1895 ×4',s:['BEFORE only','lock via PD bus'],d:'AMS8-1: the FPGA (v201) sends each pair out on AES8416_1..4 to a CS8416, through an AD1895 SRC, and takes it back as SRCDATA1..4 with RMCK1..4. The AVR reads lock over a shared bit-banged bus (PD0/PD1/PD6) with chip selects PA4–PA7.',old:true},
  rx_new:{x:180,y:95,w:170,h:80,t:'FPGA: AESRXSRC',s:['ALT_INBUF → aes_input_router','→ quad_selector → inst66','aes3_2_i2s ×4 + resampler'],d:'AFTER: the Altera AES-to-I2S plus SRC reference design (src_aes_example_top, num_of_ch_pair = 4, 98.304 MHz). aes3_input_detected[3..0] → NOT → aesrx_lock → spicontrol.',neu:true},
  fpga:{x:390,y:40,w:170,h:100,t:'Main FPGA',s:['before: EP1C6 v201','after: EP4CE40 (RD60 copy)','router · tdm · i2sx4_aes'],d:'Routes the inputs (cntrl[14..0]), mixes the reference clock (cntrl[26..24]), packs TDM for the SHARC and the DACs, and passes PC5/PC6/PC7 straight to SPORT1.'},
  spi:{x:390,y:170,w:170,h:60,t:'spicontrol (inst41)',s:['reg 0x00 = aesrx_lock','PC0–PC3'],d:'Added by RD60. Read flag 0x80 + 7-bit address, then 8 data clocks. Only address 0x00 reads anything; a write to 0x02 lands in an unused “test” register.',neu:true},
  avr:{x:600,y:150,w:180,h:90,t:'Main ATmega128',s:['v105 → v106','CS8416_READ_LOCK_ALL','ALTERA_SORT byte 72'],d:'v100w.c. RD66 changed only this file, moved the defines into common.h and added altspi.c/AESAudio.c.'},
  sharc:{x:600,y:20,w:180,h:90,t:'SHARC ADSP-21065L',s:['mlc8v106 (unchanged)','btst bit 24+n → ERR'],d:'Receives the 80-byte chain as TDM_IN_ctl[20]. sport0_isr tests TDM_IN_ctl+18 bits 24–27 (byte 72 bits 0–3); clear = no lock → err bit → ERR LED. It loops words 18/19 back on DT1A, which the FPGA latches as cntrl[63..0].'},
  ref:{x:180,y:200,w:170,h:60,t:'REF: U24 CS8416 + U10 AD1895',s:['kept on iss5','CS8416_read5 / write5'],d:'The reference receiver stays on both boards: PD7 chip select. Its MCLK feeds altpll1 → input_selector8 → SRC external_clock.'},
  front:{x:820,y:80,w:150,h:90,t:'Front: MLC8AM',s:['Atmel v205 · FPGA v200','UART0 38400'],d:'Unchanged (hash-identical to the masters). Gets the source and mode buttons, sends gains; the main board polls it.'},
};
const BW=[['aes','rx_old','BEFORE'],['aes','rx_new','AFTER'],['rx_old','fpga','SRCDATA1–4'],['rx_new','fpga','srcout_i2sdata'],['rx_new','spi','aes3_det'],['spi','avr','PC0–3'],['rx_old','avr','PD0/1/6 + PA4–7'],['avr','fpga','PC4–7 chain'],['fpga','sharc','SPORT0/1'],['ref','fpga','MCLK_REF'],['ref','avr','PD bus'],['avr','front','UART0'],['sharc','front','meter frames']];
let blkSel='rx_new';
function viewBlock(m){
  window[KEY]=false;
  m.innerHTML=`<div class="grid2">${card('Block diagram — click a block (grey = BEFORE only, green = added by iss5/RD60)', `<div id="bd"></div>`)}${card('Block', `<div id="bi"></div>`)}</div>
    ${card('The change in one paragraph', `<p>Before, the main board's AVR asked four external receivers whether they were locked. After, the receivers are inside the FPGA, and the AVR asks the FPGA one byte over a new 4-wire SPI on the pins that used to carry dead “PCM/data” flags. Everything downstream is the same: byte 72 of the 80-byte chain, the SHARC's bit test and the ERR LEDs. That is why RD66 changed only <span class="mono">v100w.c</span>, and why the front panel and DSP files are byte-identical to the masters.</p>`)}`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 990 280" style="width:100%" role="img" aria-label="RD66 block diagram">`;
    BW.forEach(([a,b,l])=>{ const [x1,y1]=ctr(BLK[a]),[x2,y2]=ctr(BLK[b]); s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" stroke-width="1.5"/><text x="${(x1+x2)/2}" y="${(y1+y2)/2-3}" font-size="10" fill="var(--ink2)" text-anchor="middle">${l}</text>`; });
    for (const k in BLK){ const b=BLK[k]; s+=`<g class="bk" data-k="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${b.old?'var(--chip)':b.neu?'color-mix(in srgb,var(--accent) 18%,var(--panel))':'var(--panel2)'}" stroke="${blkSel===k?'var(--accent2)':'var(--line)'}" stroke-width="${blkSel===k?3:1.5}"/>
      <text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="600" fill="var(--ink)">${b.t}</text>${b.s.map((q,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${q}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>';
    m.querySelectorAll('.bk').forEach(g=>g.onclick=()=>{ blkSel=g.dataset.k; draw(); });
    const b=BLK[blkSel]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`;
  };
  draw();
}

/* ---------------- schematics (redrawn) ---------------- */
function sbox(x,y,w,h,t,pinsL,pinsR,col){
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="${col||'var(--ink2)'}" stroke-width="1.5"/><text x="${x+w/2}" y="${y-6}" font-size="12" font-weight="600" text-anchor="middle" fill="var(--ink)">${t}</text>`;
  (pinsL||[]).forEach((p,i)=>{ const yy=y+18+i*18; s+=`<line x1="${x-14}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink2)"/><text x="${x+4}" y="${yy+4}" font-size="10" fill="var(--ink)">${p}</text>`; });
  (pinsR||[]).forEach((p,i)=>{ const yy=y+18+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+14}" y2="${yy}" stroke="var(--ink2)"/><text x="${x+w-4}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${p}</text>`; });
  return s;
}
const net=(x1,y1,x2,y2,l,col)=>`<polyline points="${x1},${y1} ${(x1+x2)/2},${y1} ${(x1+x2)/2},${y2} ${x2},${y2}" fill="none" stroke="${col||'var(--accent2)'}" stroke-width="1.5"/>${l?`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-3}" font-size="9.5" fill="var(--accent2)">${l}</text>`:''}`;
const SHEETS = [
  {n:'1 · AVR ports: before / after', note:'From v100w.c v105/v106 (port_init, CS8416_*, altspi.h), MLC8AM Demo AMS8-1/altera/v201/AMS81.qsf (EP1C6 pins) and Ams8e-1iss5-net.ipc (iss5 nets).', svg:()=>{
    const rows=[['PA0–PA3','inputs, pull-ups','DCLK · CNF_DATA · ASDI · NCS (EPCS lines!) — inputs, pull-ups'],['PA4','CS8416 #1 select (out)','NCE → U4.L3, R182 to GND — v105 drives HIGH; v106 input'],['PA5','CS8416 #2 select (out)','PORTA5 → U4.B16 — v106 input'],['PA6','CS8416 #3 select (out)','PORTA6 → U4.A16 — still output (low)'],['PA7','CS8416 #4 select (out)','RESET_TPS70402 (REG2.8, R91 to +1V2) — still output, pulsed by CS8416_write4'],['PC0–PC3','PCM/DATA flags → FPGA pins 125–128 (unconnected)','SPI: SCLK A20 · MOSI B20 · CS A19 · MISO B19 (spicontrol)'],['PC4','DATA_READ ← DT1A','DPCLK5 → A18 (same function)'],['PC5–PC7','WRITE → DR1A · CLOCK → TCLK1/RCLK1 · FSYNCH → RFS1','B18 · A17 · B17 (same function)'],['PD0/1/6/7','CS8416 bus (all five)','CS8416_IN/CLK/OUT/SEL → U24 only'],['PE4','DIM_ENABLED (pull-up set in RESET_CS8416)','GPIO2 → R80 → P10.2 — v106 never enables the pull-up'],['PG2','CS8416 reset','CS8416_RESET → U24.9, U10.13']];
    let s=`<svg viewBox="0 0 980 ${30+rows.length*30}" style="width:100%;min-width:760px"><text x="10" y="18" font-size="12" font-weight="600" fill="var(--ink)">ATmega128 pin</text><text x="120" y="18" font-size="12" font-weight="600" fill="var(--ink)">AMS8-1 (v105)</text><text x="500" y="18" font-size="12" font-weight="600" fill="var(--ink)">AMS8E-1 iss5 (v106, netlist)</text>`;
    rows.forEach((r,i)=>{ const y=40+i*30; s+=`<rect x="6" y="${y-16}" width="968" height="26" fill="${i%2?'var(--lane)':'transparent'}"/><text x="10" y="${y}" font-size="11" class="mono" fill="var(--ink)">${r[0]}</text><text x="120" y="${y}" font-size="10.5" fill="var(--ink2)">${r[1]}</text><text x="500" y="${y}" font-size="10.5" fill="${/v106|still|never/.test(r[2])?'var(--warn)':'var(--ink)'}">${r[2]}</text>`; });
    return s+'</svg>'; }},
  {n:'2 · Lock-status path (iss5)', note:'Nets traced from AMS81.bdf (vcurrent): instance names are the BDF’s. Register map from spicontrol.v; AVR side from AESAudio.c, altspi.c and CS8416_READ_LOCK_ALL; SHARC side from ams81_main.asm (mlc8v106).', svg:()=>{
    let s=`<svg viewBox="0 0 1000 300" style="width:100%;min-width:760px">`;
    s+=sbox(20,40,170,110,'src_aes_example_top inst66',[],['aes3_input_detected[0]','[1]','[2]','[3]']);
    for (let i=0;i<4;i++){ const y=58+i*18; s+=`<polygon points="230,${y-6} 230,${y+6} 244,${y}" fill="none" stroke="var(--ink)"/><circle cx="247" cy="${y}" r="3" fill="none" stroke="var(--ink)"/><text x="212" y="${y-7}" font-size="8.5" fill="var(--ink2)">inst${[65,73,74,75][i]}</text>`; s+=net(204,y,230,y)+net(250,y,320,y,'aesrx_lock['+i+']'); }
    s+=`<text x="260" y="150" font-size="10" fill="var(--ink2)">aesrx_lock[7..4] = GND (inst48/56/57/58)</text>`;
    s+=sbox(320,40,170,110,'spicontrol inst41',['aesrx_lock[7..0]','sclk ← portc0','sdin ← portc1','cs ← portc2','reset_n = VCC'],['sdout → portc3']);
    s+=net(504,58,600,58,'A20/B20/A19/B19 · PC0–PC3');
    s+=sbox(600,40,180,110,'ATmega128 (v106)',['alteraRead(0x00)','status = 0x0F & …','|= read5 → 0x10','ISOLATE_INPUT_STATUS','Astatus → byte 72']);
    s+=net(780,130,850,200,'PC4–7 chain');
    s+=sbox(850,170,130,90,'SHARC',['TDM_IN_ctl+18','btst r5 by 24+n','clear → err','→ ERR LED n']);
    s+=`<text x="20" y="200" font-size="11" fill="var(--ink)">Register 0x00, bit n: 1 = pair n NOT detected (the CS8416 polarity).</text><text x="20" y="218" font-size="11" fill="var(--ink)">ISOLATE_INPUT_STATUS: Astatus = ~status & 0x0F → 1 = locked → SHARC bit set → no err.</text><text x="20" y="236" font-size="11" fill="var(--warn)">ControlDescription_Jan212013.docx says “1 = locked”: the drawing’s NOT gates say the opposite.</text>`;
    return s+'</svg>'; }},
  {n:'3 · AES input routing before / after', note:'Before: MLC8AM Demo AMS8-1/altera/v201/AMS81.bdf. After: vcurrent/AMS81.bdf. Select codes from ALTERA_TRANSLATE_UART0 (AES110 → 0,1,2,3; AES75 → 4,5,6,7).', svg:()=>{
    let s=`<svg viewBox="0 0 1000 330" style="width:100%;min-width:760px"><text x="10" y="18" font-size="12" font-weight="600" fill="var(--ink)">BEFORE — EP1C6Q240C7 v201</text>`;
    s+=sbox(20,40,130,100,'pins',[],['AES_IN_1..8']) + sbox(200,40,150,100,'aes_input_router inst2',['Input1..8','sel = cntrl[14..0]'],['output1..4']) + sbox(400,40,130,100,'quad_selector inst18',['in1 / in2','sel = cntrl[29]'],['out1..4']);
    s+=sbox(580,40,170,100,'off-chip',['AES8416_1..4 →','CS8416 ×4 → AD1895 ×4','← SRCDATA1..4, RMCK1..4']) + sbox(800,40,150,100,'router',['PCM1..4'],['TDM → SHARC']);
    s+=net(164,58,200,58)+net(364,58,400,58)+net(544,58,580,58,'AES8416_n')+net(764,58,800,58,'SRCDATAn');
    s+=`<text x="10" y="190" font-size="12" font-weight="600" fill="var(--ink)">AFTER — EP4CE40F23C6 vcurrent (RD60)</text>`;
    s+=sbox(20,210,130,100,'pins',[],['AES_IN_1..4 → ALT_INBUF','AES_IN_5..8']) + sbox(200,210,150,100,'aes_input_router inst2',['Input1..8','sel = cntrl[14..0]'],['output1..4']) + sbox(400,210,130,100,'quad_selector inst18',['in1 (inst2)','in2 (inst27: option card)','sel = cntrl[29]'],['aes3_in[3..0]']);
    s+=sbox(580,210,170,100,'src_aes_example_top inst66',['aes3_in[3..0]','external_clock ← selout_98M304','i2s_sdata_bypass ← cntrl[23..20]'],['srcout_i2sdata[3..0]','aes3_input_detected']) + sbox(800,210,150,100,'router',['PCM1 · PCM2–4 via AND2'],['TDM → SHARC']);
    s+=net(164,228,200,228)+net(364,228,400,228)+net(544,228,580,228,'aes3_in')+net(764,228,800,228,'srcout_i2sdata');
    s+=`<text x="580" y="326" font-size="10" fill="var(--warn)">Pins AES8416_1–4, SRCDATA1–4, RMCK1–4 are still in the iss5 BDF, connected to nothing and with no location in AMS81.qsf.</text>`;
    return s+'</svg>'; }},
  {n:'4 · Control word path (both boards)', note:'Nets from both AMS81.bdf files (identical here); shift_in32.vhd; ams81_main.asm (TDM_OUT_ctl+18/+19 “loop through from atmel”, TDM_OUT_ctl+0 = 0x56313031 “V101”).', svg:()=>{
    let s=`<svg viewBox="0 0 1000 250" style="width:100%;min-width:760px">`;
    s+=sbox(20,40,170,110,'ATmega128',[],['PC5 ALTERA_WRITE','PC6 ALTERA_CLOCK','PC7 ALTERA_FSYNCH','PC4 DATA_READ']);
    s+=sbox(330,30,200,150,'FPGA (wires only)',['portc5 = DR1A','portc6 = TCLK1 = RCLK1','portc7 = RFS1 = strobe','portc4 = DT1A = cntrl_data'],['shift_in32 inst6 → cntrl[31..0]','shift_in32 inst25 → cntrl[63..32]']);
    s+=sbox(700,40,200,110,'SHARC SPORT1',['DR1A → TDM_IN_ctl[20]','TCLK1/RCLK1, RFS1'],['DT1A ← TDM_OUT_ctl: “V101”, …, words 18/19 echoed']);
    s+=net(204,58,330,58)+net(204,76,330,76)+net(204,94,330,94)+net(204,112,330,112)+net(544,58,700,58,'DR1A')+net(544,112,700,112,'DT1A');
    s+=`<text x="20" y="215" font-size="11" fill="var(--ink)">ALIGNMENT_CHECK wants the first 4 bytes read back = 'V','1','0','1' (ALIGNED_DATA0..3). 200 misses → while(error0==0) NOP() → watchdog.</text><text x="20" y="233" font-size="11" fill="var(--ink)">cntrl[31..0] = REG20 (bytes 76–79, routing), cntrl[63..32] = REG19 (bytes 72–75: lock + analog/SDI codes), one frame late.</text>`;
    return s+'</svg>'; }},
  {n:'5 · Clocks and reference (iss5)', note:'AMS81.bdf nets and AMS81.sdc generated clocks.', svg:()=>{
    let s=`<svg viewBox="0 0 1000 220" style="width:100%;min-width:760px">`;
    s+=sbox(20,30,150,60,'DSPCLK1 12.288 MHz',[],['dspref_12M288'])+sbox(220,30,150,60,'altpll2 inst60',['inclk0'],['c0 98.304 MHz'])+sbox(420,30,190,60,'clkdiv inst69 ÷8',['dsppllout_98M304'],['12.288 → RMCK1–4, Internal_REF']);
    s+=sbox(20,130,150,60,'AES5_REF_MCLK (U24)',[],['cs8416ref_12M288'])+sbox(220,130,150,60,'altpll1 inst59',['inclk0'],['c0 98.304 MHz'])+sbox(420,130,190,60,'input_selector8 inst61',['in5 = ref','sel = cntrl[26..24]'],['selout_98M304'])+sbox(700,100,200,60,'inst66 external_clock',['SRC output timing'],[]);
    s+=net(184,48,220,48)+net(384,48,420,48)+net(184,148,220,148)+net(384,148,420,148)+net(624,148,700,118)+net(624,48,700,118);
    return s+'</svg>'; }},
];
let sheet=0;
function viewSchem(m){
  window[KEY]=false;
  m.innerHTML=card('Schematic set — redrawn from the netlist, BDF nets and source (not the original CAD)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p>`);
  const draw=()=>{ m.querySelector('#tabs2').innerHTML=SHEETS.map((s,i)=>`<button data-i="${i}" class="${i===sheet?'on':''}">${s.n}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ sheet=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=SHEETS[sheet].svg(); m.querySelector('#sn').textContent='Redrawn. '+SHEETS[sheet].note; };
  draw();
}

/* ---------------- software ---------------- */
const HUNKS = [
  ['header', '/* Rev: April 3, 2013 - Changes to code to support AMS8E-1 iss5 main board\n   Peter L. which has removed the cs8416 and ad1895.  Also some port changes to the Atmel. */'],
  ['#defines', '348 lines of #define (constants, masks, characters, ALTERA_* port macros) moved verbatim into common.h (only #define _COMMON_H added)'],
  ['includes', '#include "common.h"\n#include "altspi.h"\n#include "AESAudio.h"	// April 3, 2013 added'],
  ['initialization()', ' alteraInitSpi();		  // April 3, 2013 added'],
  ['port_init() PORTA', ' //PORTA = 0xFF;	April 3, 2013 commented out\n //DDRA  = 0xF0;\n PORTA = 0x8F;		// April 3, 2013 added\n DDRA = 0xC0;'],
  ['port_init() PORTC', ' //PORTC = 0xBF; //m103 output only\n //DDRC  = 0xEF;\n PORTC = 0xB0;	// April 3, 2013 Added\n DDRC = 0xE0;'],
  ['RESET_CS8416()', '/* April 3, 2013 ccommented out\n    CS8416_write1..4(0x04,0x00); // RUN=0\n	wait_ms(500);\n	CS8416_write1..4(0x04,0x80); // RUN=1\n   April 3, 2013 end of commenting*/'],
  ['RESET_CS8416(), _REF()', ' //PORTE |= 0x10;  // take CS8416 out of reset April 3, 2013 commented out because this line of code appears to be useless'],
  ['CS8416_READ_LOCK_ALL()', ' /* April 3, 2013 commented out  i = CS8416_read1(0x0C) … CS8416_read4(0x0C) … */\n status = (0x0F & aesReadLockStatus());		  // April 3, 2013 added\n i = CS8416_read5(0x0C);   // reference stays'],
];
const HASH = [
  ['Front Atmel v205','MLC8AM - #Software/atmel/v205','66 / 66 files identical (v200w.c c7b82505…)'],
  ['Front Atmel v205','MLC8A - #Software/atmel/v205','17 identical, 49 differ (incl. v200w.c c957a91e…), 12 only in the master — it is the MLC8B front, not the MLC8A'],
  ['Front FPGA v200','MLC8A - #Software/altera/v200','27 / 27 identical (listing: MLC8B uses “MLC8AV200”)'],
  ['Front FPGA v200','MLC8AM - #Software/altera/V040000','20 identical, 7 differ (MLC8A.bdf/.qsf/.cdf + talkback), 3 only there (spi.v …)'],
  ['Main Atmel progress/v105','MLC8AM AMS8-1/atmel/v105','24 / 24 identical (v100w.c 6bb912fa…)'],
  ['Main Atmel progress/v106','Main Atmel v105 (working folder)','39 / 39 identical — the folder named v105 holds v106'],
  ['Main Atmel v105 folder (= v106)','MLC8AM AMS8-1/atmel/v050000','39 / 39 identical (v100w.c 067d4d45…) — RD66 became release V050000'],
  ['Main Atmel v106','MLC8A AMS8-1/atmel/v106','8 identical, 16 differ, 15 only in RD66 (altspi.*, AESAudio.*, common.h …)'],
  ['MLC8AM V050100','MLC8AM v050000','19 identical, 20 differ: v100w.c adds SDI56 / SDI78 (“Ali-Add”), 10 diff lines'],
  ['Main FPGA vcurrent','RD60 AMS81-AEM/altera/vcurrent','204 identical, 1 differs (AMS81.qpf), 1 extra .bak, 6 only in RD60 (ams81-ep4ce30 revision)'],
  ['Main FPGA vcurrent','AMS8 master Altera V050000','204 identical, 1 differs (AMS81.qpf)'],
  ['Altera Progress/vcurrent','Altera vcurrent','205 identical, 1 extra .bak in vcurrent'],
  ['altspi.c 958c3eaf… / AESAudio.c 9d7df750…','AMS8 Atmel V050000/V050001, RD60, RD72, Demux4 RD31','byte-identical copies'],
  ['common.c 93209b16…','every MLC8/MLC6 main board since 2006|39','unchanged'],
];
function viewSoft(m){
  window[KEY]=false;
  m.innerHTML=`<div class="grid2">${card('Main loop (v100w.c main) — step at the playhead', `<div id="loop"></div>`)}${card('Lock pipeline at the playhead', `<div id="pipe"></div>`)}</div>
    <div class="grid2">${card('SPI frame (altspi.c ↔ spicontrol.v)', `<div id="spi"></div>`)}${card('Port initialisation', `<div id="ports"></div>`)}</div>
    ${card('The v105 → v106 diff, hunk by hunk (ATmel/ams8e-1/progress/v105 → v106, v100w.c)', `<div id="hunks"></div>`)}
    ${card('Hash check against the masters (SHA-256, sidecars ignored) <button id="hb">run</button>', `<div id="hash"></div>`)}`;
  const draw=()=>{
    const e=eff(), st=stepAt(SIM.t,e), d=stepDurs(e);
    m.querySelector('#loop').innerHTML=`<p class="small muted">${e.name}. Before the loop: initialization(), 9 × wait_ms(500), CONFIGURE_ALTERA, 6 × wait_ms(500), RECALL_LAST_SETTINGS, init_CS8416 (write_ALL toggles PA4–PA7 and PD7), RESET_SHARC.</p><ol class="small mono" style="padding-left:18px">${STEP_NAMES.map((s,i)=>`<li class="${st.k===i?'hl':''}">${s[0]} <span class="muted">${SIM.fmtDur(d[i])}</span>${i===2&&st.stall?' <b style="color:var(--bad)">relock freeze</b>':''}</li>`).join('')}</ol>${!fpgaOK(e)?'<p class="small" style="color:var(--bad)">ALIGNMENT_CHECK → error0 = 0 after 200 misses → while(error0 == 0) NOP(); no WDR → watchdog.</p>':''}`;
    const t=SIM.t, r0=fpgaOK(e)&&e.board==='iss5'?reg00(t,e):null, raw=rawStatus(t,e), ast=astatusAt(t,e), er=errAt(t,e);
    const bits=(v,n)=>Array.from({length:n},(_,i)=>(v>>(n-1-i))&1).join('');
    m.querySelector('#pipe').innerHTML=`<table class="kv">
      <tr><th>aes3_input_detected[3..0]</th><td class="mono">${e.board==='iss5'&&fpgaOK(e)?bits([0,1,2,3].reduce((a,p)=>a|(detected(p,t,e)?1<<p:0),0),4):'—'}</td></tr>
      <tr><th>NOT → reg 0x00</th><td class="mono">${r0===null?'—':bits(r0,8)}</td></tr>
      <tr><th>CS8416_READ_LOCK_ALL</th><td class="mono">${bits(raw,8)} <span class="muted">(${{cs:'5 × CS8416 0x0C',absent:'chips 1–4 absent → 1111',spi:'0x0F & SPI, | read5',spi0:'SPI pins dead → 0000'}[readMode(e)]})</span></td></tr>
      <tr><th>ISOLATE_INPUT_STATUS</th><td class="mono">${bits(ast,4)} (1 = locked) → ALTERA_SORT byte 72</td></tr>
      <tr><th>SHARC btst 24…27</th><td class="mono">${er.map((x,i)=>x?'err'+(i+1):'ok').join(' ')}</td></tr>
      <tr><th>TRANSLATE_AUDIO_INPUT_TYPE</th><td class="mono small">PORTC low nibble = ~Astatus &amp; Adata = 0 (Adata == Astatus): always 0, so PC0–PC3 (now SPI) are only ever driven low</td></tr></table>`;
    let s=`<svg viewBox="0 0 520 150" style="width:100%"><text x="6" y="14" font-size="11" fill="var(--ink2)">CS (PC2) high for 16 clocks; MSB first; FPGA samples MOSI on SCLK rising edge</text>`;
    for (let b=0;b<16;b++){ const x=20+b*30, mo=b<8?(0x80>>(7-b))&1:0, mi=b<8?0:((r0||0)>>(15-b))&1;
      s+=`<rect x="${x}" y="24" width="28" height="22" fill="${b<8?'var(--chip)':'color-mix(in srgb,var(--accent) 15%,var(--panel))'}" stroke="var(--line)"/><text x="${x+14}" y="39" text-anchor="middle" font-size="10" fill="var(--ink)">${b===0?'rw':b<8?'a'+(7-b):'d'+(15-b)}</text>
        <text x="${x+14}" y="66" text-anchor="middle" font-size="11" class="mono" fill="var(--accent2)">${mo}</text><text x="${x+14}" y="86" text-anchor="middle" font-size="11" class="mono" fill="var(--bad)">${b<8?'·':mi}</text>`; }
    s+=`<text x="6" y="66" font-size="9" fill="var(--accent2)">MOSI</text><text x="6" y="86" font-size="9" fill="var(--bad)">MISO</text><text x="6" y="112" font-size="10.5" fill="var(--ink)">rw = 1 (ALTERA_READ_FLAG 0x80), address 0x00 → shift_out ← aesrx_lockx at the 8th clock.</text><text x="6" y="128" font-size="10.5" fill="var(--ink2)">Comment says CPOL = 1, CPHA = 1; the AVR idles SCLK low. Both sides use the rising edge, so it works.</text><text x="6" y="144" font-size="10.5" fill="var(--ink2)">One read ≈ ${(C.T_SPI*1e6).toFixed(0)} µs (≈22 cycles per bit ${'— inferred'}).</text></svg>`;
    m.querySelector('#spi').innerHTML=s;
    m.querySelector('#ports').innerHTML=`<table class="kv"><tr><th></th><th>v105</th><th>v106</th><th>effect on iss5</th></tr>
      <tr><td class="mono">PORTA/DDRA</td><td class="mono">FF / F0</td><td class="mono">8F / C0</td><td class="small">PA4 (NCE), PA5 become inputs without pull-up; PA6 out low; PA7 out high</td></tr>
      <tr><td class="mono">PORTC/DDRC</td><td class="mono">BF / EF</td><td class="mono">B0 / E0</td><td class="small">overwritten by alteraInitSpi(): DDRC |= 0x07, DDRC &amp;= ~0x08, PORTC &amp;= ~0x0F</td></tr>
      <tr><td class="mono">PORTD/DDRD</td><td class="mono">FF / BF</td><td class="mono">same</td><td class="small">PD6 input with pull-up: an absent CS8416 reads 0xFF</td></tr>
      <tr><td class="mono">PORTE/DDRE</td><td class="mono">AF / 47</td><td class="mono">same</td><td class="small">PE4 (DIM) pull-up off; v105 switched it on in RESET_CS8416, v106 never does</td></tr></table>`;
    m.querySelector('#hunks').innerHTML=HUNKS.map((h,i)=>`<div style="margin:6px 0"><b class="small">${i+1}. ${h[0]}</b><pre class="mono small" style="margin:2px 0;padding:6px;background:var(--lane);border:1px solid var(--line);border-radius:6px;white-space:pre-wrap">${esc(h[1])}</pre></div>`).join('')+`<p class="small muted">v100w.c: 7147 → 6832 lines, plus common.h (361), altspi.c/.h and AESAudio.c/.h. common.c is unchanged. The main loop itself is untouched.</p>`;
    m.querySelector('#hash').innerHTML = D.hash ? `<table class="kv"><tr><th>RD66</th><th>compared with</th><th>result</th></tr>${HASH.map(h=>`<tr><td class="small">${h[0]}</td><td class="small mono">${h[1]}</td><td class="small">${h[2]}</td></tr>`).join('')}</table><p class="small muted">Computed for this plugin with SHA-256 over each folder (the generated .md sidecars excluded).</p>` : '<p class="muted small">Press “run”.</p>';
    m.querySelector('#hb').onclick=()=>A.hash();
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewFindings(m){
  window[KEY]=false;
  const li=(t,b)=>`<li style="margin-bottom:6px"><b>${t}</b> ${b}</li>`;
  m.innerHTML=card('What RD66 is up to — findings', `<ol class="small">
    ${li('RD66’s result is release V050000, byte for byte.', 'The main-Atmel folder <span class="mono">v105</span> holds v106 (39/39 files identical to <span class="mono">progress/v106</span>) and is identical to <span class="mono">MLC8AM - #Software/AMS8-1/atmel/v050000</span>. The MLC8B test of 8 April '+Y(2013)+' lists main Atmel V050000, FPGA V050000, DSP V106 on AMS8E-1 issue 5. The MLC8A/MLC8AR report of 15 December '+Y(2014)+' uses the same main firmware. V050100 ('+Y(2014)+') only adds SDI56/SDI78.')}
    ${li('It is an MLC8B, not an MLC8A.', 'The front Atmel v205 is identical to <span class="mono">MLC8AM</span> v205 (66/66 files) and differs from MLC8A v205 in 49 files, including <span class="mono">v200w.c</span> (MLC8AM header “MLC8AM V2.04 … February 13, 2007”). DebugNotes.xlsx says “MLC8B version”. Its 2×2 table (AES 110Ohm | Analog / SDI | Stereo 5.1) is the four-button panel that TRANSLATE_PUSHBUTTONS reads: PRESET_PB1 → AES110, PRESET_PB2 → ANALOG, MODE1_PB → SDI12, MODE4_PB → ST/5.1. The front FPGA is MLC8A v200 (27/27), as the software listing says (“MLC8B … MLC8AV200”).')}
    ${li('The FPGA is RD60’s, unchanged, but with an old project file.', 'vcurrent matches RD60 AMS81-AEM vcurrent and the AMS8 master V050000 in 204 of 206 files. Only <span class="mono">AMS81.qpf</span> differs: RD66’s is a Quartus 4.1 header dated February 28, 2005, without the <span class="mono">ams81-ep4ce30</span> revision RD60 added on April 1, 2013. The .qsf <span class="mono">SEARCH_PATH</span> still points at <span class="mono">h:/engineering/rd/rd60-…/aesrxsrc</span>, so a rebuild in the RD66 folder uses RD60’s directory.')}
    ${li('Lock polarity: the document is wrong, the code is right.', '<span class="mono">ControlDescription_Jan212013.docx</span> (RD60) says register 0x00 is “1 = locked, 0 = no lock”. In <span class="mono">AMS81.bdf</span>, aes3_input_detected[3..0] passes through NOT gates inst65/73/74/75 into aesrx_lock[3..0]; bits 7..4 are tied to GND. So the register reads 1 = no lock, like a CS8416, and the unchanged <span class="mono">ISOLATE_INPUT_STATUS</span> and the SHARC’s <span class="mono">btst r5 by 24</span> work. This settles the open question in the AMS81 plugin.')}
    ${li('PA4 is the FPGA’s nCE on iss5.', 'Per Ams8e-1iss5-net.ipc, U14 pin 47 (PA4) is net NCE (U4.L3, H2.6, R182 to ground). v105 makes PA4 an output and drives it high, the old CS8416 #1 select. Holding nCE high stops the Cyclone IV from configuring '+inf+' (Altera handbook rule, not in the archive), so the “V101” echo never arrives and ALIGNMENT_CHECK’s 200-miss limit ends in <span class="mono">while(error0==0) NOP()</span> and a watchdog reset. The DDRA = 0xC0 edit is what frees it, though the log only calls it “some port changes”.')}
    ${li('PA7 drives the regulator’s reset net.', 'PA7 (U14.44) is RESET_TPS70402: REG2 pin 8, pulled up to +1V2 by R91. v106 keeps PA7 an output, high, and <span class="mono">ALTERA_TRANSLATE_UART0</span> still calls <span class="mono">CS8416_write4(0x01,0x14)</span> every pass, which pulls PA7 low for about 0.1 ms. The 3.3 V logic high also meets a net pulled to 1.2 V. What that does to REG2 is not documented '+inf+'.')}
    ${li('PA0–PA3 sit on the EPCS lines.', 'U14 pins 48–51 are NCS, ASDI, CNF_DATA and DCLK. Both versions leave them as inputs with pull-ups (PORTA low nibble = F). This is harmless, but it shows the board was laid out for the AVR to reach the configuration flash.')}
    ${li('“Appears to be useless”: PORTE |= 0x10.', 'v106 comments it out twice. PE4 is DIM_ENABLED (<span class="mono">SETTINGS_CHECK</span>, active low; net GPIO2 → R80 → P10.2 on iss5), and port_init leaves its pull-up off (PORTE = 0xAF). That line was the only one that turned it on. After v106, the DIM input relies on the external resistors '+inf+'.')}
    ${li('Two of the six edits do nothing.', 'PORTC/DDRC (0xB0/0xE0) is overwritten by <span class="mono">alteraInitSpi()</span> a few lines later in <span class="mono">initialization()</span>. The old 0xEF would also have been fixed (PC3 → input) by alteraInitSpi.')}
    ${li('TRANSLATE_AUDIO_INPUT_TYPE writes the SPI pins every pass.', '<span class="mono">PORTC = PORTC &amp; 0xF0 | (~Astatus &amp; Adata)</span>, with <span class="mono">Adata = Astatus</span> one line earlier, so the value is always 0. On the AMS8-1 these “1 = DATA, 0 = PCM” flags went to EP1C6 pins 125–128, which v201 leaves unconnected. On iss5 the same write drives SCLK/MOSI/CS low each pass. It is harmless only because the old bug makes it constant.')}
    ${li('A half-second freeze removed.', 'v105 <span class="mono">RESET_CS8416</span>: on the first lock after ≥ LOCK_COUNTER (25) passes with no pair locked, it sends RUN=0 to four receivers, calls <span class="mono">wait_ms(500)</span>, then sends RUN=1. The main loop (polls, chain, settings) stops for 0.5 s. v106 comments the whole block out, keeping the Dolby reset (<span class="mono">wait_us(500)</span>). RD60’s log (v101, Feb 4) shows the same lesson: <span class="mono">cs8416_reset</span> had to stay, with its CS8416 writes removed.')}
    ${li('Dead receiver code left in.', 'CS8416_read1…4, CS8416_write1…3 and CS8416_READ_AUDIO_ALL are compiled but never called. CS8416_write4 is still called every pass, and init_CS8416’s write_ALL still toggles PA4–PA7.')}
    ${li('Leftover pins and receivers in the copied FPGA.', 'AMS81.bdf has 128 pins and the .qsf places 102. The 26 unplaced pins include 17 outputs (LRCLK1–4, SCLK1–4, BYPASS1–4, DSP_clk_out, AES8416_1–4) that the fitter will put on free balls '+inf+', and 9 inputs (SRCDATA1–4, RMCK1–4, VCO_OUT1). Four <span class="mono">aes3_2_i2s</span> instances (inst37/38/46/47) have every port unconnected. The working receivers are inside src_aes_example_top inst66. SignalTap (stp1.stp, 88 bits) is enabled in the release project. The config device is set to EPCS1, too small for an EP4CE40; the BOM fits an M25P16.')}
    ${li('Borrowed driver, stale comments.', '<span class="mono">altspi.c/.h</span> came from the M6205 project ('+Y(2010)+'). Comments still say “serial data out on PD0, SCLK on PE5, CS on PE7” while the code uses PC1/PC0/PC2. The header defines Gennum GS2970/GS2962 chip-select registers (0x11) that spicontrol does not decode: only read 0x00 and write 0x02 (into an unused <span class="mono">test</span> register) exist.')}
    ${li('Carried-over slip.', '<span class="mono">dialnorm_settings = 0xFF &amp; (BIT7 &amp; BIT6 &amp; BIT5)</span> is always 0 (AND of distinct bits). It is present in v105 and v106.')}
    ${li('Front-panel silk is newer than the firmware.', 'The 2015|48 MLC-8B silk shows six buttons (SDI 1, AES, ANALOG / SDI 2, GR 3/4, ST MODE). v205 reads four. The left column came with RD73 (front PCB iss4, PB5/PB6). The 2013 SDI button is the one later labelled GR 3/4.')}
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>AVR timings from instruction counts in the .lis listings at 4.9152 MHz: ≈22 cycles per SPI bit, ≈20 per CS8416 bit, ≈24 per chain bit, other steps estimated ${inf}.</li>
    <li>CS8416 lock time 20 ms ${inf} (no datasheet in the archive). FPGA detect = 256 biphase edges at an average 1.5 edges per bit.</li>
    <li>v105 on iss5: an unconfigured FPGA because of nCE, no SPORT1 clocks, so the SHARC shows ERR on all pairs and no bars ${inf}.</li>
    <li>“B without A”: the SPI read returns 0x00 because PC3 is never an input ${inf}. The ANALOG card always delivers 4 pairs ${inf}. A front poll every 16 passes ${inf}. Programme levels are synthetic.</li>
    <li>The AMS8-1 board is drawn as blocks, not from its Gerbers.</li></ul>`)
  + card('Sources', `<ul class="small mono">
    <li>ENGINEERING - 2016 RD FILES/RD66-MLC8UsingAMS8E-1-iss5/Software/** (README, progress.txt, DebugNotes.xlsx)</li>
    <li>ENGINEERING - 2016 RD FILES/RD60-AMS81AUsingAMS81-iss5PCB/software/AMS81-AEM/** · R&amp;D_List.xls (RD66: “MLC8 implementation using ams8e-1iss5 board”, Z, peter)</li>
    <li>#MLC - #SERIES/MLC8 - #Engineering/MLC8 - #Software/{MLC8AM, MLC8A, MLC8AM Demo} - #Software/** · MLC8N - #TESTREPORT/*.pdf · MLC8 - Front_Change #RD #RD73/software listing.xls</li>
    <li>AMS81 - #Master/…/AMS8 - #Software #Altera #V050000 · AMS8E - #Master/AMS8E-1 - #Master/AMS8E-1-ISS5-GERBER.zip, AMS8E-1 ISS5 - ALTIUM.csv</li>
    <li>MLC6 &amp; MLC8 - #ARTWORK #DA #2016/MLC-8B-FRONT-SILK(CURVE MLC-M11).pdf, MLC8B-REAR-SILK(CURVE AMS8-M19).pdf, AMS8-M6-SILK(MLC8-M3), Pics/MLC8-M11(8B).jpg</li></ul>`);
}

/* ---------------- register ---------------- */
SIM.register({
  id: ID,
  product: 'RD66 MLC8 on AMS8E-1 iss5',
  name: 'RD66 · MLC8 ported to the AMS8E-1 iss5 main board (2013|46)',
  year: 2013,
  folder: 'ENGINEERING - 2016 RD FILES/RD66-MLC8UsingAMS8E-1-iss5',
  family: 'R&D register',
  summary: 'April 2013|46 R&D: the MLC8B (MLC8AM front) moved from the AMS8-1 main board (four CS8416 receivers + AD1895 SRCs) to the AMS8E-1 issue 5 board, where AES receive and SRC live in a Cyclone IV copied from RD60. Only the main Atmel changed (v105 → v106 = release V050000); the simulator runs before, after and a patch-by-patch workbench side by side.',
  highlights: ['Before / after / workbench builds on one timeline','Six v106 patches you can apply one at a time','SPI and CS8416 lock reads down to the bit; AES biphase','Real MLC8B silkscreen panels; iss5 board from the Gerbers','Hash check of every RD66 folder against the masters','Netlist findings: PA4 = FPGA nCE, PA7 = regulator reset'],
  depth: 'Full model',
  duration: 1,
  stepUnits: [
    {label:'1 main-loop pass (after)', period:()=>stepDurs(cfgOf('after')).reduce((a,b)=>a+b,0)},
    {label:'1 AES frame', period:()=>1/fsOf(D.scopeP)},
    {label:'1 SPI bit', period:()=>C.SPI_BIT},
    {label:'1 ms', period:()=>0.001},
    {label:'10 ms', period:()=>0.01},
  ],
  zooms: [[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms'],[0.001,'1 ms'],[1e-4,'100 µs'],[2e-5,'20 µs (biphase)']],
  defaultZoom: 0,
  tabs: [
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: doing RD66', render:viewTutorial},
    {id:'second', label:'One second, counted', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
