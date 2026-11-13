/* =====================================================================
   POD17 — adjustable-gain AES distribution amplifier with SRC
   (Ward-Beck Systems, firmware v1.00, 2000|33)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, folder #POD #SERIES/POD17 - #Master):
   - POD17 - #Engineering/Software/pic/pod17.asm (Slava Lee, 9 Mar 2000, v1.00, PIC16C73A)
       main loop, AtoD_data_preparing / AtoD / Average / Hysterisis, Prepare_Link_to_SHARC,
       Link_to_SHARC, SHARC_link_control, jmp_input, debounce, switch_8420_modes,
       set_bypass_mode / set_SRC_mode, channel_status_proc, LED_processing, flush8420reg,
       AES_output_control, delay, the 4-byte / 16-nibble SHARC protocol
   - .../Software/pic/POD17.$$$ (MPLAB backup), POD17.ERR, pod17.pjt
   - .../Software/sharc/pod17core.asm, pod17init.asm, pod17def.h, pod17.ldf, pod17.mak,
       D8205_vol.dat, D8205_trm.dat (gain tables), pod17tstn.asm (not in the build)
   - .../PCB/POD17-1ISS2-PNP.bom (4.9152 MHz crystal, 24.576 MHz osc, 2× CS8420, ADSP-21061,
       27C512, EL2099, 9× PE65612), PCB/OBSOLETE/POD17-1.net (Issue 1 netlist: pins and nets)
   - .../MANUAL/pod17.pdf, POD17MAN.doc, POD17MAN.cdr; POD17 - Functional Diagram.cdr
   - POD17 - #ARTWORK #DA #2016/POD17-FRONT-SILK (CURVE).pdf, POD17-REAR-SILK(CURVE).pdf, Pics/*.jpg
   - POD17 - #Mechanical #DA #2016/POD17- FRONT ISS 1, POD17-75 REAR ISS 1, POD17-110 REAR ISS 2 (PANEL).pdf
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const Y = y => SIM.year(y);
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';

/* ---------------- constants from the source ---------------- */
const C = {
  FOSC: 4.9152e6,                 // X2 4.9152 MHz (BOM) on PIC OSC1/OSC2 (netlist U1-9/U1-10), _HS_OSC
  TCY: 4/4.9152e6,                // 813.8 ns per PIC instruction
  DELAY_CYC: 1535,                // delay: 256 × (3 nop + decfsz + goto) — comment says “1.54mS” (true at 4 MHz)
  SPI_BYTE: 22,                   // one SSP byte incl. SSP_RDY_WAIT polling — INFERRED (SSPM=0000 → Fosc/4)
  BCOUNT: 31,                     // BCOUNT_NUM 0x1f
  AES_ON: 21,                     // AES_OUTPUT_CONTROL_NUM 0x15
  HYST_N: 256,                    // HSTRZ_CNT_NUM1 0x00 / NUM2 0x01 → 256 steady samples
  SH_CLK: 24.576e6,               // SHARC CLKIN — INFERRED: the only other clock on the BOM is the 24.576 MHz OSC2
  SH_DELAY: 0x1fffff*10/24.576e6, // pod17core.asm delay with DELAY_POWER_ON: r5=0x1fffff, ≈10 cycles a turn
  BOOTLOAD: 0.012,                // 27C512 8-bit PROM boot of ~4 kwords — INFERRED
  SYNC_T: 0.0005,                 // _synhron_SPORT0 handshake — INFERRED
  FRAME: 0xE4,
};
const STEPS = [
  ['AtoD_data_preparing · AtoD', 'One ADC phase: process a result (Average + Hysterisis), set up, start or read'],
  ['Prepare_Link_to_SHARC', 'switch on sharc_adr_xmit → pick the next nibble (aaaadddd)'],
  ['Link_to_SHARC', '4 SPI bytes: E4 · R · 00 · aaaadddd; CS_SHARC low only for the first byte'],
  ['SHARC_link_control', 'All four LEDs off, delay ×3, flush8420reg (SHARC check commented out)'],
  ['jmp_input', 'Read SW1, SW2, JMP, INPUT_1/2 and both CS8420 receive-error registers (16)'],
  ['debounce', 'input_reg1 must stay the same for 31 passes before MODE1 changes'],
  ['switch_8420_modes', 'Unlocked → mute; reference locked → SRC; reference gone → BYPASS'],
  ['channel_status_proc', 'One of 8 steps: catch, read, rewrite the channel-status blocks'],
  ['LED_processing', 'AUDIO / SRC / ERROR / REMOTE LEDs and the two tally outputs on'],
  ['flush8420reg', 'Rewrite 9 registers in each CS8420 (18 SPI writes)'],
  ['AES_output_control', 'Count down 21 passes after a mode change, then un-mute and ask the SHARC to resync'],
];
const CS_STEPS = ['chan_status_set_DE_CH1','chan_status_read_CH1','chan_status_set_DE_CH2','chan_status_read_CH2','chan_status_OUT','chan_status_fs_CH','chan_status_write_CH1','chan_status_write_CH2'];
const RD = 4*C.SPI_BYTE+10, WR = 3*C.SPI_BYTE+8, FLUSH = 18*(WR+6);
const CYC = { ATOD:45, ATOD_PROC:160, PREP:30, LINK:4*C.SPI_BYTE+14, SHLC:3*(C.DELAY_CYC+4)+FLUSH+12, JMP:2*RD+30, DEB:20, SW:15, CSP:25, LED:30, FLUSH, AOC:12,
  CS:[2*RD+2*(WR+6), RD+(WR+6)+23*(RD+8)+40, 2*RD+2*(WR+6), RD+(WR+6)+23*(RD+8)+40, 8, 80, 23*(WR+8)+RD+(WR+6), 23*(WR+8)+RD+(WR+6)],
  INIT: 2*C.DELAY_CYC + 34*WR + FLUSH + 2*(23*(WR+8)+2*(WR+6)) + 60 };

/* Gain tables (SHARC D8205_vol.dat / D8205_trm.dat, 256 floats each, regenerated from their exact law) */
const VOL = Array.from({length:256}, (_,i)=> i*0.015551061349745990);            // linear: 0 … 3.9655 (+11.97 dB); 1.0 at code 64.3
const TRM = Array.from({length:256}, (_,i)=> Math.pow(10, (-15 + 30*i/256)/20));  // −15 dB … +14.88 dB in 0.117 dB steps; 0 dB at 128
const db = g => g>0 ? 20*Math.log10(g) : -Infinity;
const fmtDb = (g,d=1) => g<=0 ? '−∞' : (db(g)>=0?'+':'−') + Math.abs(db(g)).toFixed(d);
const RATES = [22050, 32000, 44100, 48000, 88200, 96000];
const fmtFs = f => (f/1000).toFixed(f%1000?1:0)+' kHz';

/* ---------------- device state ---------------- */
/* Physical inputs (switches, pots, cables) change at an instant. D.base is the state at t = 0 (the unit
   has been sitting like this for a while); D.ev are changes made during the simulated second. The
   firmware then reacts on its own schedule — that is what the timeline shows. */
const BASE0 = { power:1, mono:0, inv:0, jmp20:0, potA:0.5, potB:0.5, remote:0, remPos:0.5, volMode:0,
  inOn:1, inFs:48000, inErr:0, refOn:0, refFs:48000, monitor:0 };
const D = {
  base: {...BASE0}, ev: [], variant: '75', sig: 'same', lvl: -20,
  log: [], ledMode: 'perceived', scopeSide: 0,
};
function phys(t){ const s = {...D.base}; for (const e of D.ev){ if (e.t <= t) s[e.k] = e.v; else break; } return s; }
function physEnd(){ return phys(1e9); }
function setPhys(k, v, t){
  t = (t===undefined) ? SIM.t : t;
  D.ev = D.ev.filter(e => !(e.k===k && e.t >= t));
  D.ev.push({t, k, v}); D.ev.sort((a,b)=>a.t-b.t); invalidate();
}
function commitAll(){ D.base = physEnd(); D.ev = []; invalidate(); }

/* ---------------- input signal ---------------- */
function srcSig(side, t){
  const a = Math.pow(10, D.lvl/20);
  if (D.sig === 'same')  return a*Math.sin(2*Math.PI*1000*t);
  if (D.sig === 'opp')   return (side? -a : a)*Math.sin(2*Math.PI*1000*t);
  return side ? a*Math.sin(2*Math.PI*400*t) : a*Math.sin(2*Math.PI*1000*t);   // 'split'
}
const SIG_NAMES = {same:'L = R = 1 kHz (mono-compatible)', split:'L 1 kHz · R 400 Hz', opp:'R = −L (one leg wired backwards)'};

/* ---------------- the PIC16C73A main loop, pass by pass ----------------
   simulate() runs the real loop of pod17.asm over the simulated second: every pass is the 11 calls
   in main, timed from the instruction counts at 4.9152 MHz. It returns the passes, every register
   write that reaches a CS8420, every frame the SHARC receives, and the SHARC's own state. */
let SIMR = null, SIMKEY = '';
function invalidate(){ SIMKEY = ''; }
const noise = i => [0,1,0,-1,0,0,1,-1][(i*7+3)%8];   // ±1 LSB pot/ADC noise — INFERRED, drives the hysteresis
function adcRaw(code, p, i){
  const pos = code===0? p.potA : code===1? p.potB : (p.remote? p.remPos : 0);   // remote wipers read 0 when nothing is plugged — INFERRED
  return Math.max(0, Math.min(255, Math.round(pos*255) + (pos>0.002 && pos<0.998 ? noise(i) : 0)));
}
function settledState(p){
  const code = k => Math.round((k===0?p.potA:k===1?p.potB:(p.remote?p.remPos:0))*255);
  const m1 = modeBits(p, true);
  return {
    MODE1: m1, debOn:false, bcount:0, bounce:0,
    codes:[0,1,2,3].map(code), avg:[0,1,2,3].map(k=>[code(k),code(k),code(k),code(k)]),
    hyst:[0,1,2,3].map(k=>({stor:code(k), c1:0, c2:0, flg:1})),
    adGo:false, adPhase:0, adCh:3, adRes:code(3), in1:p.volMode, in2:p.remote,
    nib:0, latch:0, frame:[0xE4,0,m1,0,code(0),code(1),code(2),code(3)],
    unlocked: !(p.inOn), src: !!(p.inOn && p.refOn), txoff: !p.inOn, aesDelay:false, aesCnt:0, resync:false,
    shadow:{ txoff: !p.inOn, src: !!(p.inOn&&p.refOn), w20: !!p.jmp20 },
    csStep:0, flgErr: !!(p.inErr || !p.inOn), leds: ledsFrom(m1, !!(p.inErr||!p.inOn)),
  };
}
function modeBits(p, settled){
  // input_reg1 as built by jmp_input: bit0 JMP, 1 SW1 (mono), 2 SW2 (invert), 3 INPUT_1 (RA4, volume), 4 INPUT_2 (RA3, remote), 6 CH2 lock, 7 CH1 lock
  return (p.jmp20?1:0) | (p.mono?2:0) | (p.inv?4:0) | (p.volMode?8:0) | (p.remote?16:0) | (p.refOn?64:0) | (p.inOn?128:0);
}
function ledsFrom(m1, err){ return { audio: !!(m1&128), src: !!(m1&64), err: !!err, rem: !!(m1&16) }; }

function simulate(){
  const key = JSON.stringify([D.base, D.ev]);
  if (key === SIMKEY && SIMR) return SIMR;
  SIMKEY = key;
  const passes = [], commits = [], frames = [], sharc = [], ledsOn = [], resyncs = [];
  const p0 = phys(0);
  let S = p0.power ? settledState(p0) : null, t = 0, idx = 0;
  let curTx = S ? {txoff:S.shadow.txoff, src:S.shadow.src, w20:S.shadow.w20} : {txoff:true, src:false, w20:false};
  commits.push({t:0, ...curTx});
  frames.push({t:0, ji: S? (S.MODE1<<8):0, codes: S? S.codes.slice():[0,0,0,0], init:true});
  sharc.push({t0:0, kind: p0.power? 'run':'off'});
  if (S) ledsOn.push({t0:0, leds:{...S.leds}, tally:{OUT_2: !!(S.MODE1&128), OUT_1: S.flgErr}});
  const powerEvents = D.ev.filter(e=>e.k==='power');
  const commit = (tt)=>{ const n={txoff:S.shadow.txoff, src:S.shadow.src, w20:S.shadow.w20}; if (n.txoff!==curTx.txoff || n.src!==curTx.src || n.w20!==curTx.w20){ commits.push({t:tt, ...n}); curTx=n; } };
  const END = 1.03;
  while (t < END){
    if (!S){
      const on = powerEvents.find(e=>e.t>=t && e.v===1); if (!on) break;
      t = on.t;
      // power-on: init (2 delays, preset_chips, flush, init_channel_status); LEDs all on as a lamp test
      const pn = phys(t);
      S = settledState(pn); S.MODE1 = 0; S.codes=[0,0,0,0]; S.avg=[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
      S.hyst=[0,1,2,3].map(()=>({stor:0,c1:0,c2:1,flg:0})); S.adGo=false; S.adCh=3; S.adRes=0;
      S.unlocked=false; S.src=false; S.shadow={txoff:true, src:false, w20:false}; S.aesDelay=true; S.aesCnt=C.AES_ON; S.flgErr=false;
      S.leds={audio:true,src:true,err:true,rem:true};
      const ti = CYC.INIT*C.TCY;
      passes.push({i:-1, t0:t, t1:t+ti, kind:'init'});
      ledsOn.push({t0:t+2*C.DELAY_CYC*C.TCY*0.5, t1:t+ti+CYC.ATOD*C.TCY+ (CYC.PREP+CYC.LINK)*C.TCY, leds:{...S.leds}});
      commit(t+ti);
      const bootEnd = t + C.BOOTLOAD + C.SH_DELAY + 0.12 + 2*C.SH_DELAY + C.SYNC_T;
      sharc.push({t0:t, t1:bootEnd, kind:'boot'}); sharc.push({t0:bootEnd, kind:'run'});
      t += ti; idx = 0; continue;
    }
    const pass = runPass(S, t, idx);
    // power-off inside this pass?
    const off = powerEvents.find(e=>e.v===0 && e.t>=t && e.t<pass.t1);
    if (off){
      pass.t1 = off.t; pass.cut = true; pass.steps = pass.steps.map(s=> s && s.t0<off.t ? s : undefined); pass.steps.forEach(s=>{ if (s) s.t1 = Math.min(s.t1, off.t); }); delete pass.modeChange;
      passes.push(pass); S = null; t = off.t;
      sharc.push({t0:off.t, kind:'off'}); commits.push({t:off.t, txoff:true, src:false, w20:false, off:true}); curTx={txoff:true,src:false,w20:false};
      continue;
    }
    // apply its side effects in time order
    pass.commitsAt.forEach(c=>{ const keep=S.shadow; S.shadow=c.sh; commit(c.t); S.shadow=keep; });
    if (pass.frameDone) frames.push(pass.frameDone);
    if (pass.resyncAt !== undefined) resyncs.push(pass.resyncAt);
    if (pass.ledOn) ledsOn.push(pass.ledOn);
    passes.push(pass); t = pass.t1; idx++;
  }
  // close LED intervals at the next pass's SHARC_link_control
  for (let k=0;k<ledsOn.length;k++){ if (ledsOn[k].t1 === undefined){ const nx = passes.find(p=>p.t0 >= ledsOn[k].t0 && p.steps && p.steps[3]); ledsOn[k].t1 = nx ? nx.steps[3].t0 : ledsOn[k].t0 + 0.0012; } }
  // SHARC: each resync command → beg_synhron: silence for the power-on delay, then _synhron_SPORT0
  resyncs.forEach(tr=>{
    const cur = sharcAt(sharc, tr);
    if (cur.kind==='off') return;
    if (cur.kind==='boot' && tr < cur.t1 - C.SH_DELAY - C.SYNC_T) return;   // still loading / waiting for the frame code
    if (cur.kind==='resync' || cur.kind==='boot'){ cur.t1 = tr + C.SH_DELAY + C.SYNC_T; resortRun(sharc, cur); return; }
    const t1 = tr + C.SH_DELAY + C.SYNC_T;
    insertSharc(sharc, {t0:tr, t1, kind:'resync'});
  });
  // the SHARC only takes frames while its main loop is running (ctrl_proc is called once per sample)
  const fr = frames.filter(f=> f.init || sharcAt(sharc, f.t).kind==='run');
  const avgPass = (()=>{ const ps=passes.filter(p=>p.kind==='loop'); return ps.length? (ps[ps.length-1].t1-ps[0].t0)/ps.length : 0.0072; })();
  SIMR = { passes, commits, frames: fr, allFrames: frames, sharc, ledsOn, resyncs, avgPass };
  return SIMR;
}
function insertSharc(list, iv){
  // split the 'run' interval that contains iv.t0
  const out=[]; list.forEach(s=>out.push(s));
  out.push(iv); out.push({t0:iv.t1, kind:'run'});
  out.sort((a,b)=>a.t0-b.t0);
  // drop 'run' starts that fall inside the new interval
  for (let i=out.length-1;i>=0;i--){ const s=out[i]; if (s!==iv && s.t0>iv.t0 && s.t0<iv.t1) out.splice(i,1); }
  list.length=0; out.forEach(s=>list.push(s));
}
function resortRun(list, cur){
  for (let i=list.length-1;i>=0;i--){ const s=list[i]; if (s!==cur && s.kind==='run' && s.t0>cur.t0) list.splice(i,1); }
  list.push({t0:cur.t1, kind:'run'}); list.sort((a,b)=>a.t0-b.t0);
}
function sharcAt(list, t){
  let cur = list[0];
  for (const s of list){ if (s.t0 <= t) cur = s; else break; }
  if (cur.t1!==undefined && t>=cur.t1) return {kind:'run', t0:cur.t1};
  return cur;
}

function runPass(S, t0, i){
  const P = {i, t0, kind:'loop', steps:[], commitsAt:[], adc:null, nib:null, csStep:S.csStep, link:null};
  let t = t0;
  const step = (k, cyc)=>{ const d=cyc*C.TCY; P.steps[k] = {k, t0:t, t1:t+d}; t += d; return P.steps[k]; };
  const shadowCommit = tt => P.commitsAt.push({t:tt, sh:{...S.shadow}});
  // 0 · AtoD_data_preparing + AtoD
  let cyc = CYC.ATOD;
  if (!S.adGo){
    const k = S.adCh;                                 // result belongs to the channel converted last
    const a = S.avg[k]; a.unshift(S.adRes); a.length = 4;
    const avg = (a[0]+a[1]+a[2]+a[3])>>2;               // Average: sum of 4, rrf ×2 with the carry folded back in
    const h = S.hyst[k]; let out = avg;
    const diff = Math.abs(avg - h.stor);
    if (h.flg){ if (diff<=1) out = h.stor; else { h.c1=0; h.c2=1; h.stor=avg; h.flg=0; } }
    else if (diff<=1){ h.stor=avg; h.c1=(h.c1-1)&255; if (h.c1===0){ h.c2--; if (h.c2===0) h.flg=1; } }
    else { h.c1=0; h.c2=1; h.stor=avg; h.flg=0; }
    S.codes[k] = out;
    if (k===3){ const p=phys(t); S.in1 = p.volMode; S.in2 = p.remote; }   // sw_3: PORTA briefly digital → INPUT_1 (RA4), INPUT_2 (RA3)
    S.adCh = (k+1)%4; S.adGo = true; S.adPhase = 1; cyc = CYC.ATOD_PROC;
    P.adc = {proc:k, code:out, avg, raw:a.slice(), hflg:h.flg, setup:S.adCh};
  } else if (S.adPhase===1){ S.adRes = adcRaw(S.adCh, phys(t), i); S.adPhase = 2; P.adc = {start:S.adCh, raw:S.adRes}; }
  else { S.adGo = false; P.adc = {done:S.adCh, raw:S.adRes}; }
  step(0, cyc);
  // 1 · Prepare_Link_to_SHARC
  const a = S.nib;
  const byteVal = j => [C.FRAME, 0, S.MODE1, 0, S.codes[0], S.codes[1], S.codes[2], S.codes[3]][j];
  if (!(a&1)) S.latch = byteVal(a>>1);
  const d = (a&1) ? (S.latch & 15) : (S.latch >> 4);
  S.frame[a>>1] = S.latch;
  P.nib = {a, d, byte: (a<<4)|d};
  S.nib = (a+1)&15;
  step(1, CYC.PREP);
  // 2 · Link_to_SHARC
  const R = S.resync; S.resync = false;
  const ls = step(2, CYC.LINK);
  P.link = {bytes:[C.FRAME, R?1:0, 0, P.nib.byte], R};
  if (R) P.resyncAt = ls.t0 + 2*C.SPI_BYTE*C.TCY;
  if (a===15) P.frameDone = { t: ls.t1, ji: (S.frame[2]<<8)|S.frame[3], codes:[S.frame[4],S.frame[5],S.frame[6],S.frame[7]], pass:i };
  // 3 · SHARC_link_control — LEDs off, delay ×3, flush
  const sh = step(3, CYC.SHLC); shadowCommit(sh.t1);
  // 4 · jmp_input
  const pj = phys(t);
  const ch1 = !!pj.inOn, ch2 = !!pj.refOn;
  let inReg = (pj.jmp20?1:0) | (pj.mono?2:0) | (pj.inv?4:0) | (S.in1?8:0) | (S.in2?16:0) | (ch2?64:0) | (ch1?128:0);
  S.flgErr = !!(pj.inErr || !pj.inOn);               // receive-error reg 16: CONF / BIP (no signal → errors — INFERRED)
  P.inReg = inReg;
  step(4, CYC.JMP);
  // 5 · debounce
  let dcyc = CYC.DEB;
  if (!S.debOn){ if (inReg !== S.MODE1){ S.debOn = true; S.bounce = inReg; S.bcount = C.BCOUNT; } }
  else if (inReg !== S.bounce){ S.debOn = false; }
  else { S.bcount--; if (S.bcount===0){ const xor = S.bounce ^ S.MODE1; S.MODE1 = S.bounce; S.debOn=false; P.modeChange = {xor, MODE1:S.MODE1}; if (xor & 1) S.shadow.w20 = !!(S.MODE1&1); dcyc += 30; } }
  P.deb = {on:S.debOn, bcount:S.bcount, MODE1:S.MODE1};
  step(5, dcyc);
  // 6 · switch_8420_modes
  let scyc = CYC.SW; P.sw = null;
  const shutoff = ()=>{ S.shadow.txoff = true; S.aesCnt = C.AES_ON; S.aesDelay = true; };
  if (!(S.MODE1 & 128)){ shutoff(); if (!S.unlocked) P.sw='unlocked'; S.unlocked = true; }
  else if (S.unlocked){ S.unlocked = false; S.shadow.w20 = !!(S.MODE1&1); P.sw = 'relock'; }
  else if ((S.MODE1 & 64) && !S.src){ S.src = true; S.shadow.src = true; shutoff(); scyc += FLUSH+10; P.sw='SRC'; }
  else if (!(S.MODE1 & 64) && S.src){ S.src = false; S.shadow.src = false; shutoff(); scyc += FLUSH+10; P.sw='BYPASS'; }
  const sw = step(6, scyc); if (P.sw==='SRC'||P.sw==='BYPASS') shadowCommit(sw.t1);
  // 7 · channel_status_proc — one step per pass
  const k = S.csStep; let ccyc = CYC.CSP;
  const lockedFor = k<2 ? (S.MODE1&128) : (k<4 ? (S.MODE1&64) : 1);
  ccyc += (lockedFor || k>=4) ? CYC.CS[k] : 10;
  P.cs = {step:k, skipped: !lockedFor && k<4};
  S.csStep = (k+1)&7;
  step(7, ccyc);
  // 8 · LED_processing
  const led = step(8, CYC.LED);
  S.leds = ledsFrom(S.MODE1, S.flgErr);
  P.ledOn = {t0: led.t1, leds:{...S.leds}, tally:{OUT_2: !!(S.MODE1&128), OUT_1: S.flgErr}};
  // 9 · flush8420reg
  const fl = step(9, CYC.FLUSH); shadowCommit(fl.t1);
  // 10 · AES_output_control
  let acyc = CYC.AOC;
  if (S.aesDelay){ S.aesCnt--; if (S.aesCnt===0){ S.shadow.txoff = false; S.aesDelay = false; S.resync = true; acyc += FLUSH; P.unmute = true; } }
  P.aes = {delay:S.aesDelay, cnt:S.aesCnt};
  const ao = step(10, acyc); if (P.unmute) shadowCommit(ao.t1);
  P.t1 = t; P.MODE1 = S.MODE1; P.src = S.src; P.codes = S.codes.slice(); P.hyst = S.hyst.map(h=>h.flg);
  return P;
}

/* ---------------- what is happening at time t ---------------- */
function bsearch(arr, t, key){ let lo=0, hi=arr.length-1, r=-1; while(lo<=hi){ const m=(lo+hi)>>1; if (arr[m][key] <= t){ r=m; lo=m+1; } else hi=m-1; } return r; }
function passAt(t){ const ps = simulate().passes; const k = bsearch(ps, t, 't0'); return k<0? null : (t < ps[k].t1 ? ps[k] : null); }
function stepAt(t){ const p = passAt(t); if (!p) return {pass:null, step:-1}; if (p.kind!=='loop') return {pass:p, step:-1}; for (const s of p.steps) if (s && t>=s.t0 && t<s.t1) return {pass:p, step:s.k}; return {pass:p, step:10}; }
function commitAt(t){ const c = simulate().commits; return c[Math.max(0,bsearch(c, t, 't'))]; }
function frameAt(t){ const f = simulate().frames; return f[Math.max(0,bsearch(f, t, 't'))]; }
function ledAt(t){
  const L = simulate().ledsOn; const k = bsearch(L, t, 't0');
  if (!phys(t).power || k<0) return {leds:{audio:false,src:false,err:false,rem:false}, on:false, tally:{OUT_1:false,OUT_2:false}};
  const iv = L[k]; return {leds:iv.leds, on: t < iv.t1, tally: iv.tally || {OUT_1:false,OUT_2:false}};
}
function ledDuty(){ const L = simulate().ledsOn.filter(l=>l.t1!==undefined && l.t0>0.01); const ps = simulate().passes.filter(p=>p.kind==='loop'); if (!ps.length) return 0; const on = L.reduce((a,l)=>a+(l.t1-l.t0),0); return on/(ps[ps.length-1].t1-ps[0].t0); }

/* gain the SHARC applies (sample_proc, case_0…case_3) */
function gains(ji, codes){
  const sel = (ji>>11)&3;                   // fext r4 by 11:2 → MODE1 bit3 (volume) + 2×bit4 (remote)
  const front = (sel&1) && !(sel&2) ? VOL : TRM;
  let gL = front[codes[0]], gR = front[codes[1]], rL = 1, rR = 1;
  if (sel & 2){ const T = (sel&1)? VOL : TRM; rL = T[codes[2]]; rR = T[codes[3]]; }
  return { sel, gL: gL*rL, gR: gR*rR, fL:gL, fR:gR, rL, rR, mono: !!(ji & (1<<9)), inv: !!(ji & (1<<10)), w20: !!(ji & (1<<8)) };
}
const SEL_NAMES = ['case_0 · front pots, trim ±15 dB','case_1 · front pots, volume (silence … +12 dB)','case_2 · remote trim × front trim','case_3 · remote volume × front trim'];
function outAt(t){
  const p = phys(t), R = simulate(), c = commitAt(t), sh = sharcAt(R.sharc, t);
  const fr = frameAt(t), g = gains(fr.ji, fr.codes);
  const fsIn = p.inFs, fsOut = c.src ? (p.refOn ? p.refFs : p.inFs) : p.inFs;
  const carrier = !!(p.power && p.inOn && !c.txoff);
  return { p, c, sh, fr, g, fsIn, fsOut, carrier, silent: sh.kind!=='run', src: c.src };
}
function outSample(t, side, o){
  o = o || outAt(t);
  if (!o.carrier) return null;
  if (o.silent) return 0;
  const n = Math.floor(t*o.fsOut), tt = n/o.fsOut;
  let L = srcSig(0, tt), R = srcSig(1, tt);
  if (o.g.inv) R = -R;
  if (o.g.mono){ const m = (L+R)*0.5; L = m; R = m; }
  let v = side ? R*o.g.gR : L*o.g.gL;
  v = Math.max(-1, Math.min(1 - 1/8388608, v));           // fix f2: saturating float → fixed (ALUSAT)
  if (o.g.w20) v = Math.round(v*524288)/524288;
  return v;
}
function peakDb(side, t){
  const o = outAt(t); if (!o.carrier) return null; if (o.silent) return -Infinity;
  const aL = Math.pow(10,D.lvl/20);
  const L = 1, Rs = D.sig==='opp' ? -1 : 1;
  let a;
  if (o.g.mono){ a = D.sig==='split' ? aL : (o.g.inv ? (D.sig==='opp'? aL : 0) : (D.sig==='opp'? 0 : aL)); }
  else a = aL;
  const g = side ? o.g.gR : o.g.gL;
  return a<=0 ? -Infinity : Math.min(0, 20*Math.log10(a*g));
}

/* ---------------- channel status the CS8420 transmits (channel_status_proc) ---------------- */
function csOut(t){
  const o = outAt(t);
  // input: a professional stream at fsIn (byte 0 bit 7 in the CS8420 buffer = AES bit 0 “pro”; bits 1:0 = fs)
  const fsCode = f => f===48000?1 : f===44100?2 : f===32000?3 : 0;
  const inB = [0x80 | fsCode(o.fsIn), 0, 0x34, 0, (o.fsIn===96000? 0x50 : o.fsIn===88200? 0x48 : 0)];   // byte 4: extended fs for 96k/88.2k — INFERRED layout
  const b = inB.slice();
  if (o.src) b[0] = (b[0] & 0xFC) | fsCode(o.fsOut);         // chan_status_insert_fs_CH1 (professional only, 2 bits)
  b[2] = (b[2] & 0x03) | (o.g.w20 ? 0x30 : 0x34);            // chan_status_insert_24_20_CH1
  return { b, fsIn:o.fsIn, fsOut:o.fsOut, src:o.src };
}

/* ================================================================
   USER ACTIONS — what the buttons, pots and cables do in the code
   ================================================================ */
function act(name, fn){
  const tr = []; const add = s => tr.push(s);
  fn(add);
  D.log.unshift({ t: SIM.t, name, trace: tr });
  if (D.log.length > 60) D.log.length = 60;
  SIM.refresh();
}
function effectNote(add, what){
  const R = simulate();
  const after = R.passes.filter(p=>p.kind==='loop' && p.t0 >= SIM.t);
  const mc = after.find(p=>p.modeChange);
  if (mc) add(`On this timeline: debounce commits MODE1 = ${hex2(mc.modeChange.MODE1)} in pass #${mc.i} at ${SIM.fmtT(mc.steps[5].t1)} (${((mc.steps[5].t1-SIM.t)*1000).toFixed(0)} ms later).`);
  if (what==='sharc'){ const f = R.frames.find(f=>!f.init && mc && f.t > mc.steps[5].t1); if (f) add(`The SHARC gets it in the next complete 16-nibble frame, at ${SIM.fmtT(f.t)}: that is when the audio changes.`); else add('The next complete frame to the SHARC lands after the end of this simulated second.'); }
}
const hex2 = v => '0x'+(v&255).toString(16).toUpperCase().padStart(2,'0');
const A = {
  mono(){ const v = phys(SIM.t).mono ? 0 : 1; act(v? 'Press STEREO/MONO in (MONO)' : 'Release STEREO/MONO (STEREO)', add=>{
    if (!phys(SIM.t).power){ add('Unit is off: the latching switch moves but nothing reads it.'); setPhys('mono', v); return; }
    setPhys('mono', v);
    add(`SW1 (RB5, pin 26) goes ${v?'low':'high'}. jmp_input: btfss SW1 → input_reg1 bit 1 = ${v}`);
    add('debounce: input_reg1 ≠ MODE1 → DEBOUNCE_ON, bounce_reg1 = input_reg1, bcount = BCOUNT_NUM (0x1f = 31)');
    add('After 31 more identical passes: MODE1 = bounce_reg1; MODE_change_analize only cares about bit 0 (20/24 bit), so nothing is written to the CS8420s');
    add('Prepare_Link_to_SHARC sends MODE1 as nibbles 4 and 5; the SHARC rebuilds ji_input when nibble F arrives (ctrl_proc)');
    add(`SHARC sample_proc: btst r4 by JMP_AUD_STEREO_MONO (bit 9) → ${v?'f2 = (f2 + f3) × 0.5; f3 = f2 — both outputs carry (L+R)/2':'skip_mono — L and R pass separately'}`);
    effectNote(add, 'sharc');
  }); },
  inv(){ const v = phys(SIM.t).inv ? 0 : 1; act(v? 'Press R/−R in (invert right)' : 'Release R/−R', add=>{
    setPhys('inv', v);
    if (!phys(SIM.t).power){ add('Unit is off.'); return; }
    add(`SW2 (RB4, pin 25) goes ${v?'low':'high'} → input_reg1 bit 2 = ${v}; debounced 31 passes into MODE1 bit 2`);
    add(`SHARC sample_proc: btst r4 by JMP_INVERT_RIGHT_CHANNEL (bit 10) → ${v?'f3 = f3 × −1.0':'skip_invert'}`);
    add('Order in sample_proc: invert first, then mono. With MONO also in, the output is (L − R)/2, not an inverted mono (see Findings).');
    effectNote(add, 'sharc');
  }); },
  pot(k, delta){ const keys=['potA','potB','remPos']; const key=keys[k]; const cur=phys(SIM.t)[key]; const v=Math.max(0,Math.min(1, Math.round((cur+delta)*1000)/1000));
    act(`${['CH A trim','CH B trim','Remote fader'][k]} → ${(v*100).toFixed(1)} %`, add=>{
      setPhys(key, v);
      if (!phys(SIM.t).power){ add('Unit is off.'); return; }
      const ch = ['AN1 (RA1, pin 3) = ANAL_PIN1 → code1','AN0 (RA0, pin 2) = ANAL_PIN2 → code2','AN2 (RA2, pin 4) and AN4 (RA5, pin 7) → code3 / code4'][k];
      add(`Wiper voltage → ${ch}. The ADC reads one of the four inputs every 3 passes, so each one every 12 passes (≈ ${(12*simulate().avgPass*1000).toFixed(0)} ms).`);
      add(`ADRES ≈ ${Math.round(v*255)} (±1 LSB noise ${inf}). Average: mean of the last 4 readings → the new value walks in over 4 readings (≈ ${(48*simulate().avgPass*1000).toFixed(0)} ms).`);
      add('Hysterisis: more than ±1 away from the stored code → unlock, the output follows the input. It locks again only after 256 steady readings.');
      const p = phys(SIM.t), sel = (p.volMode?1:0) + (p.remote?2:0);
      const tbl = (k===2) ? (p.volMode? VOL:TRM) : (sel===1? VOL : TRM);
      add(`SHARC: ${SEL_NAMES[sel]} → table[${Math.round(v*255)}] = ${fmtDb(tbl[Math.round(v*255)])} dB${k<2 && sel===3 ? ' (front pots are always TRIM once REMOTE is on)' : ''}`);
      if (k===2 && !p.remote) add('Nothing is plugged into CONTROL: the remote wipers are not read as anything useful and REMOTE is off.');
    }); },
  setPot(k, v){ const keys=['potA','potB','remPos']; setPhys(keys[k], Math.max(0,Math.min(1,v))); SIM.refresh(); },
  input(on){ act(on? 'Connect AES INPUT' : 'Disconnect AES INPUT', add=>{
    setPhys('inOn', on?1:0);
    add(`CS8420 CH1 (U4, “main”) ${on?'locks its receive PLL':'loses lock'} → receive-error register 16 bit 4 (UNLOCK) = ${on?0:1}`);
    add(`jmp_input: btfss DATAI,4 → input_reg1 bit 7 (CH1_8420_LOCKED) = ${on?1:0}; the lock bit goes through the same 31-pass debounce as the buttons`);
    if (!on){ add('switch_8420_modes: CH1 not locked → shut_off_AES_output_CH1 (CH1_8420reg3 bit 6 TXOFF = 1, every pass), UNLOCKED_MODE = 1');
      add('All six outputs and the DIGITAL MONITOR lose the AES carrier. ERROR lights (no signal → confidence/biphase errors, '+inf+').'); }
    else { add('After debounce: UNLOCKED_MODE cleared, MODE_change_analize re-applies 20/24 bit; next pass picks SRC or BYPASS');
      add(`AES_output_control counts AES_OUTPUT_CONTROL_NUM = 21 passes, clears TXOFF, sets SHARC_RESYNHRON_FLAG → the SHARC re-syncs its SPORT and is silent for ≈ ${(C.SH_DELAY*1000).toFixed(0)} ms (${inf})`); }
    effectNote(add);
  }); },
  ref(on){ act(on? 'Connect AES REFERENCE' : 'Disconnect AES REFERENCE', add=>{
    setPhys('refOn', on?1:0);
    add(`CS8420 CH2 (U5, “reference”) ${on?'locks':'unlocks'} → input_reg1 bit 6 (CH2_8420_LOCKED) = ${on?1:0}, debounced 31 passes`);
    add(on? 'switch_8420_modes → set_SRC_mode: CH1 reg3 low bits = 01001 (AES rx → SRC → serial out; serial in → AES tx), reg4 = 000001 (output time base from OMCK = the reference chip’s RMCK, U5 pin 10 → U4 pin 21)'
          : 'switch_8420_modes → set_BYPASS_mode: CH1 reg3 low bits = 01101 (AES rx → serial out, SRC unused), reg4 = 001001 (output time base = recovered input clock)');
    add('shut_off_AES_output_CH1 → outputs muted for 21 passes, then un-muted with a SHARC resync (silence while the SHARC waits in its delay loop).');
    add(on? 'channel_status_proc step 5 (chan_status_fs_CH): copy the reference fs bits into the output channel status — professional streams only' : 'Output sample rate goes back to the input rate.');
    effectNote(add);
  }); },
  inFs(f){ act('Input sample rate → '+fmtFs(f), add=>{ setPhys('inFs', f); add('The CS8420 re-locks at the new rate. In BYPASS the outputs follow it; in SRC mode only the input side of the converter changes.');
    const p=phys(SIM.t); if (p.refOn){ const r=Math.max(f/p.refFs, p.refFs/f); if (r>3) add(`Ratio ${r.toFixed(2)}:1 is outside the CS8420 SRC range (manual: max 1:3 or 3:1). What the unit does then is not documented.`); } }); },
  refFs(f){ act('Reference sample rate → '+fmtFs(f), add=>{ setPhys('refFs', f); add('In SRC mode every output now runs at '+fmtFs(f)+'. The channel-status fs bits are rewritten on the next channel_status_proc cycle (8 passes).');
    if (f===96000||f===88200) add('Byte 0 has no code for '+fmtFs(f)+': chan_status_extract_fs_CH2 can only copy 00 “not indicated”, 01 48k, 10 44.1k, 11 32k (see Findings).'); }); },
  err(on){ act(on? 'Inject input errors (biphase / confidence)' : 'Clean input', add=>{ setPhys('inErr', on?1:0);
    add('jmp_input reads CS8420 CH1 register 16: bit 2 (CONF) or bit 1 (BIP) set → FLG_ERROR_CH1 = 1 (not debounced)');
    add('LED_processing: LED_2 (RB0) = ERROR and OUT_1 (RB7) tally follow FLG_ERROR_CH1 on the very next pass. Audio is not muted.'); }); },
  remote(on){ act(on? 'Plug the REMOTE FADER into CONTROL' : 'Unplug the REMOTE FADER', add=>{ setPhys('remote', on?1:0);
    add(`DE-9 pin 7 → R14 → RA3 (INPUT_2) ${on?'pulled low by the fader cable '+inf:'released'}. RA3 is an analog pin: sw_3 makes PORTA digital for 5 NOPs every 12 passes to read it.`);
    add('INPUT_2 → input_reg1 bit 4 = REMOTE_ENABLE, debounced 31 passes → REMOTE LED (LED_3, RB1)');
    add(on? 'SHARC sample_proc → case_2/case_3: f10/f11 come from code3/code4 (DE-9 pins 2 and 1), then it jumps back to case_0 so the front pots stay in circuit as TRIM.' : 'SHARC back to case_0/case_1: only the front pots.'); }); },
  volMode(on){ act(on? 'Strap CONTROL pin 5 to ground (VOLUME mode)' : 'Remove the pin-5 strap (TRIM mode)', add=>{ setPhys('volMode', on?1:0);
    add(`DE-9 pin 5 → R11 → RA4 (INPUT_1) ${on?'low':'high'} → input_reg1 bit 3 (MODE1 bit 3 “0 = trim / 1 = volume”). The manual says the unit “may be programmed”; which pin does it is from the Issue 1 netlist.`);
    add(on? 'D8205_vol.dat: gain = code × 0.01555 (linear): silence at 0, unity at code 64 (a quarter of the travel), +12 dB at 255' : 'D8205_trm.dat: gain = −15 dB + code × 30/256 dB: 0 dB at mid-travel (code 128)'); }); },
  jmp(on){ act(on? 'Fit jumper H3 (20-bit)' : 'Remove jumper H3 (24-bit)', add=>{ setPhys('jmp20', on?1:0);
    add('JMP (RB3, pin 24) → input_reg1 bit 0 → debounce → MODE_change_analize → W_24bit_20bit_XOR set → '+(on?'set_20bit':'set_24bit'));
    add(`CH1_8420reg5 / reg6 bits 5:4 = ${on?'01 (20-bit)':'00 (24-bit)'} written by the next flush8420reg; channel_status_insert_24_20 writes byte 2 = ${on?'0x30':'0x34'}`);
    add(`SHARC jumpers_analize: shift_left_num = ${on?12:8}, shift_right_num = ${on?-12:-8}`); }); },
  power(){ const on = phys(SIM.t).power ? 0 : 1; act(on? 'Power ON' : 'Power OFF', add=>{ setPhys('power', on);
    if (on){ add('PIC: WHOLE_RESET → init: delay, all four LEDs on (lamp test), RESET pulse to both CS8420s and the SHARC, preset_chips, init_modes (BYPASS), shut_off both AES outputs, init_channel_status (pro, 48 kHz, 24 bit)');
      add('SHARC: boots from the 27C512 (060_prom loader), then delay → wait for 255 frame codes → delay → beg_synhron: delay → _synhron_SPORT0. With DELAY_POWER_ON that is three ≈'+(C.SH_DELAY*1000).toFixed(0)+' ms waits '+inf+': no audio for about '+(3*C.SH_DELAY+0.13).toFixed(1)+' s.');
      add('MODE1 starts at 0, so the PIC thinks the input is unlocked until the first debounce completes (32 passes).'); }
    else add('Everything stops. Outputs drop immediately.'); }); },
  monitor(){ const v = phys(SIM.t).monitor ? 0 : 1; act(v? 'Plug a monitor into DIGITAL MONITOR' : 'Unplug the monitor', add=>{ setPhys('monitor', v); add('The TRS jack is fed through its own transformer (T9) from the output driver: a split of the same AES stream as OUT 1–6.'); }); },
  clearEvents(){ D.ev = []; invalidate(); D.log.unshift({t:SIM.t, name:'Clear the timeline (back to the t = 0 state)', trace:[]}); SIM.refresh(); },
  settle(){ commitAll(); D.log.unshift({t:SIM.t, name:'Make the end of this second the new starting state', trace:['Every change is now “old”: the unit has settled with these settings, the timeline starts clean.']}); SIM.refresh(); },
  reset(){ D.base = {...BASE0}; D.ev = []; D.sig='same'; D.lvl=-20; D.log=[]; invalidate(); SIM.refresh(); },
};

/* ================================================================
   PANELS on the real silkscreen
   ================================================================ */
/* Built on POD17 - #ARTWORK #DA #2016/POD17-FRONT-SILK (CURVE).pdf and POD17-REAR-SILK(CURVE).pdf (sheets dated Jun.25/14).
   tools/silk_extract.py cut each separation at 200 dpi between the crop marks (x 251–1965; front GREEN y 406–727, front
   WHITE y 999–1320; rear 75 y 342–663, rear 110 y 1060–1381) → 1714 × 321 px = 8.570 × 1.606 in. Positions come from the
   2016|49 mechanical drawings (×200 px/in), rotated upright and mirrored from their “INSIDE VIEW” for the rears:
   POD17- FRONT ISS 1: .130 holes at y 1.102 x 1.496 / 4.246 / 4.596 / 4.946 / 5.296 / 5.753 / 6.278, .281 buttons at 2.484 and
   3.584 (y 1.090), .505×.770 rocker at .900/.656, .390 monitor jack at 7.785/.796. The silk has no crosshair for SRC (4.596)
   or CH A (5.753); those two come from the drawing. POD17-75 REAR ISS 1: 8 BNC D-holes on .525 pitches, DE-9 between studs
   at 2.193/3.177 (inside), single-D .500×.470 and double-D .512×.450 (cord bushing and fuse holder, inferred from the silk’s
   “115 VAC, 1/2 A.S.B.”). POD17-110 REAR ISS 2 (“modified to AC connector”, 2008|41): Phoenix cut-outs, IEC inlet 1.256×1.080. */
const ASSET = 'siumulation-plugins/assets/';
/* Panel artwork 2026|59: CorelDRAW sheet converted with Inkscape (libcdr) → assets/pod17-front.svg and rear SVG(s)
   (ink plates coloured green rgb(52,168,83) / white rgb(240,240,236), cut-outs as dark holes, drill crosshairs faint;
   registered to the older PNG silks to ±1 px so every control keeps its place). The PNGs stay on a toggle. */
const ART = {cdr:true};
const ART_CDR = '#POD #SERIES/POD17 - #Master/POD17 - #ARTWORK #DA #2016/POD17-FRONT&REAR-SILK (CURVE).cdr';
function artNote(){ return `<div class="small muted" style="margin-top:4px">Panel artwork: ${SIM.src(ART_CDR, ART_CDR.split('/').pop())} (CorelDRAW, default) · <label><input type="checkbox" class="pod17-art" ${ART.cdr?'':'checked'}> show the older PNG silks (cut from ${SIM.src('#POD #SERIES/POD17 - #Master/POD17 - #ARTWORK #DA #2016/POD17-FRONT-SILK (CURVE).pdf','FRONT-SILK (CURVE).pdf')} / ${SIM.src('#POD #SERIES/POD17 - #Master/POD17 - #ARTWORK #DA #2016/POD17-REAR-SILK(CURVE).pdf','REAR-SILK(CURVE).pdf')})</label></div>`; }
document.addEventListener('change', e=>{ if (e.target && e.target.classList && e.target.classList.contains('pod17-art')){ ART.cdr = !e.target.checked; SIM.refresh(); } });
const LEDS_X = { audio:849, src:919, rem:989, err:1059 };
const LED_COL = { audio:'#4dff5a', src:'#4dff5a', rem:'#ffd23a', err:'#ff3b2f' };
function frontSVG(t, opts){
  opts = opts || {};
  const p = phys(t), la = ledAt(t), duty = ledDuty();
  const lit = k => p.power && la.leds[k] && (D.ledMode==='perceived' || la.on);
  const led = (x, k, tip)=>`<g><title>${tip}${p.power? ' — duty ≈ '+(duty*100).toFixed(0)+' % (on only between LED_processing and the next SHARC_link_control)':''}</title><circle cx="${x}" cy="219" r="15" fill="#060707"/><circle cx="${x}" cy="219" r="10.5" fill="${lit(k)?LED_COL[k]:'#2a2222'}" ${lit(k)?'filter="url(#p17glow)"':''} opacity="${lit(k)&&D.ledMode==='perceived'? (0.55+duty*1.6).toFixed(2):1}"/>${lit(k)?`<circle cx="${x-3}" cy="216" r="3.5" fill="#fff" opacity=".5"/>`:''}</g>`;
  const btn = (x, on, cls, tip)=>`<g class="${cls}" style="cursor:pointer"><title>${tip}</title><circle cx="${x}" cy="218" r="40" fill="transparent"/><circle cx="${x}" cy="218" r="30" fill="#050606" stroke="#2c2f32" stroke-width="3"/>
      <circle cx="${x}" cy="218" r="${on?19:23}" fill="${on?'#121314':'#1d2022'}" stroke="#3b3f43" stroke-width="2"/>${on?`<circle cx="${x}" cy="218" r="13" fill="none" stroke="#0a0a0a" stroke-width="2"/>`:''}</g>`;
  const pot = (x, k, v, tip)=>{ const ang = -150 + v*300; const rad = ang*Math.PI/180;
    return `<g class="p17pot" data-k="${k}" style="cursor:ew-resize"><title>${tip}: ${(v*100).toFixed(1)} % — click left/right half or use the wheel (multi-turn trimmer)</title>
      <circle cx="${x}" cy="219" r="28" fill="transparent"/><circle cx="${x}" cy="219" r="12" fill="#151617" stroke="#000" stroke-width="2"/>
      <circle cx="${x}" cy="219" r="8.5" fill="#c9a640" stroke="#6b5414" stroke-width="1.5"/><line x1="${x-7*Math.sin(rad)}" y1="${219+7*Math.cos(rad)}" x2="${x+7*Math.sin(rad)}" y2="${219-7*Math.cos(rad)}" stroke="#3a2b05" stroke-width="2.4"/></g>`; };
  return `<svg viewBox="0 0 1714 321" role="img" aria-label="POD17 front panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <defs><filter id="p17glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1714" height="321" rx="8" fill="#141517"/>
    ${ART.cdr ? `<image href="${ASSET}pod17-front.svg" width="1714" height="321"/>` : `<image href="${ASSET}pod17-front-green.png" width="1714" height="321"/>
    <image href="${ASSET}pod17-front-white.png" width="1714" height="321"/>`}
    <g class="p17pwr" style="cursor:pointer"><title>Power rocker (PAN256) — click</title><rect x="129" y="54" width="102" height="154" rx="8" fill="#0b0c0d" stroke="#2d3033" stroke-width="2"/>
      <rect x="143" y="${p.power?68:126}" width="74" height="68" rx="6" fill="#1b1d20" stroke="#3a3e42"/><rect x="149" y="${p.power?74:184}" width="62" height="10" rx="3" fill="#2b2e31"/></g>
    <circle cx="299" cy="220" r="14" fill="#060707"/><circle cx="299" cy="220" r="10" fill="${p.power?'#9dff7a':'#1f2a1c'}" ${p.power?'filter="url(#p17glow)"':''}><title>Power LED (green, straight off the 5 V rail via R33)</title></circle>
    ${btn(497, p.mono, 'p17mono', 'STEREO/MONO (SW1 → RB5). Out = STEREO, in = MONO. Click (key M)')}
    ${btn(717, p.inv, 'p17inv', 'R/−R (SW2 → RB4). In = right channel inverted. Click (key R)')}
    ${led(LEDS_X.audio,'audio','AUDIO — LED_0 (RC7): CH1_8420_LOCKED')}${led(LEDS_X.src,'src','SRC — LED_1 (RB2): CH2_8420_LOCKED (reference present)')}
    ${led(LEDS_X.rem,'rem','REMOTE — LED_3 (RB1): MODE1 bit 4 REMOTE_ENABLE')}${led(LEDS_X.err,'err','ERROR — LED_2 (RB0): FLG_ERROR_CH1 (confidence or biphase error)')}
    ${pot(1151, 0, p.potA, 'CH A trim → AN1 → code1 (left)')}${pot(1256, 1, p.potB, 'CH B trim → AN0 → code2 (right)')}
    <g class="p17mon" style="cursor:pointer"><title>DIGITAL MONITOR TRS (T9 split of the output) — click to ${p.monitor?'unplug':'plug in'} a monitor</title>
      <circle cx="1557" cy="159" r="48" fill="transparent"/><circle cx="1557" cy="159" r="40" fill="#0b0c0d" stroke="#3a3d40" stroke-width="3"/><circle cx="1557" cy="159" r="30" fill="#8a8d90"/><circle cx="1557" cy="159" r="22" fill="#151617"/><circle cx="1557" cy="159" r="9" fill="#050505"/>
      ${p.monitor?`<circle cx="1557" cy="159" r="26" fill="#2a2c2e" stroke="#6a6d70" stroke-width="3"/><rect x="1545" y="185" width="24" height="136" fill="#2a2c2e"/>`:''}</g>
    ${[[50,160],[1664,160]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="10" fill="#8f9295" stroke="#55585b" stroke-width="2"/><path d="M${x-6} ${y} h12 M${x} ${y-6} v12" stroke="#47494c" stroke-width="2"/>`).join('')}
    ${opts.hot || ''}
  </svg>`;
}
function rearSVG(t){
  const p = phys(t), o = outAt(t);
  const outTxt = !p.power ? 'unit off' : !o.carrier ? 'no AES (TXOFF / no input)' : o.silent ? 'AES carrier, digital silence (SHARC resyncing)' : fmtFs(o.fsOut)+' AES3, '+(o.src?'sample-rate converted':'bypass');
  const screw = (x,y)=>`<circle cx="${x}" cy="${y}" r="10" fill="#8f9295" stroke="#55585b" stroke-width="2"/><path d="M${x-6} ${y} h12 M${x} ${y-6} v12" stroke="#47494c" stroke-width="2"/>`;
  const de9 = `<g class="p17j" data-j="remote" style="cursor:pointer"><title>CONTROL (DE-9S, J1): remote fader, VOLUME strap, tallies. Click to ${p.remote?'unplug':'plug'} the REMOTE FADER</title>
      <rect x="1100" y="160" width="152" height="98" rx="10" fill="#b8bbbe" stroke="#6d7175" stroke-width="3"/><path d="M1116 180 h120 l-10 60 h-100 z" fill="#1a1b1c"/>
      ${[0,1,2,3,4].map(i=>`<circle cx="${1134+i*21}" cy="196" r="4" fill="#d9c27c"/>`).join('')}${[0,1,2,3].map(i=>`<circle cx="${1144+i*21}" cy="222" r="4" fill="#d9c27c"/>`).join('')}
      ${p.remote?`<rect x="1110" y="168" width="132" height="82" rx="8" fill="#3a3d40" stroke="#222" stroke-width="2"/><rect x="1150" y="250" width="52" height="71" fill="#2a2c2e"/><text x="1176" y="215" fill="#ddd" font-size="18" text-anchor="middle">REMOTE</text>`:''}
      ${screw(1078,209)}${screw(1275,209)}</g>`;
  let s = `<svg viewBox="0 0 1714 321" role="img" aria-label="POD17/${D.variant} rear panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <rect width="1714" height="321" rx="8" fill="#141517"/>${ART.cdr ? `<image href="${ASSET}pod17-rear${D.variant}.svg" width="1714" height="321"/>` : ''}`;
  if (D.variant === '75'){
    const bnc = (x,y,plug,id,tip)=>`<g ${id?`class="p17j" data-j="${id}" style="cursor:pointer"`:''}><title>${tip}</title>
      <circle cx="${x}" cy="${y}" r="40" fill="#1a1b1c"/><circle cx="${x}" cy="${y}" r="33" fill="#b9bcc0" stroke="#6d7175" stroke-width="3"/><circle cx="${x}" cy="${y}" r="21" fill="#d6c27c"/><circle cx="${x}" cy="${y}" r="7" fill="#7a5f12"/>
      ${plug?`<rect x="${x-22}" y="${y-26}" width="44" height="52" rx="8" fill="${id==='ref'?'#b8742e':'#3a74b8'}" opacity=".95"/><circle cx="${x}" cy="${y}" r="9" fill="#1d2b3a"/>`:''}</g>`;
    s += bnc(186,75,p.refOn,'ref',`REFERENCE (75 Ω BNC → T2 → 75176 U10 → CS8420 CH2). ${p.refOn?fmtFs(p.refFs)+' — click to unplug':'click to plug in a reference'}`);
    s += bnc(186,205,p.inOn,'in',`INPUT (75 Ω BNC → T1 → 75176 U11 → CS8420 CH1). ${p.inOn?fmtFs(p.inFs)+' — click to unplug':'click to plug in'}`);
    [[396,75],[501,205],[606,75],[711,205],[816,75],[921,205]].forEach(([x,y],k)=> s += bnc(x,y,true,null,`OUT ${k+1} (EL2099 driver → PE65612 → BNC): ${outTxt}`));
    s += de9;
    s += `<g><title>AC cord strain-relief bushing (.500 × .470 single-D) — POD17-75 REAR ISS 1 (${inf} function)</title><circle cx="1374" cy="161" r="47" fill="#0b0c0d" stroke="#2e3134" stroke-width="3"/><circle cx="1374" cy="161" r="22" fill="#1d1f21"/><rect x="1360" y="161" width="28" height="160" fill="#111"/></g>
      <g><title>Fuse holder (.512 × .450 double-D), 1/2 A slow-blow per the silk</title><circle cx="1534" cy="161" r="48" fill="#0b0c0d" stroke="#2e3134" stroke-width="3"/><circle cx="1534" cy="161" r="34" fill="#202224"/><path d="M1516 161 h36 M1534 143 v36" stroke="#55585b" stroke-width="5"/></g>
      <circle cx="1454" cy="41" r="6" fill="#5a5d60"><title>PEM stud FH-440-5 (pressed in from inside; flush head outside)</title></circle>`;
  } else {
    const phx = (x,y,n,w,plugMask,id,tip)=>{ let g = `<g ${id?`class="p17j" data-j="${id}" style="cursor:pointer"`:''}><title>${tip}</title><rect x="${x}" y="${y}" width="${n*w}" height="86" rx="3" fill="#2fbf4f" stroke="#167a2c" stroke-width="2"/>`;
      for (let i=0;i<n;i++){ g += `<rect x="${x+i*w+4}" y="${y+36}" width="${w-8}" height="40" rx="3" fill="#0f4a1e"/><circle cx="${x+i*w+w/2}" cy="${y+18}" r="${Math.min(9,w/3)}" fill="#bfc6c0"/>`; if (plugMask && plugMask(i)) g += `<path d="M${x+i*w+w/2} ${y+76} q 0 40 ${4-(i%3)*4} 70" stroke="${['#c33','#222','#888'][i%3]}" stroke-width="5" fill="none"/>`; }
      return g + '</g>'; };
    s += phx(279,29,3,30, p.refOn? ()=>true : null, 'ref', `REFERENCE (Phoenix + − G, 110 Ω → T2 → CS8420 CH2). ${p.refOn?fmtFs(p.refFs)+' — click to unplug':'click to plug in'}`);
    s += phx(279,116,3,30, p.inOn? ()=>true : null, 'in', `INPUT (Phoenix + − G, 110 Ω → T1 → CS8420 CH1). ${p.inOn?fmtFs(p.inFs)+' — click to unplug':'click to plug in'}`);
    s += phx(449,72,18,28.67, ()=>true, null, `OUTPUTS 1–6 (+ − G, PE65612 transformers, 110 Ω): ${outTxt}`);
    s += de9;
    s += `<g><title>IEC inlet with fuse drawer (POD17-110 REAR ISS 2, “modified to AC connector”, 03 Jan 2008)</title><rect x="1357" y="33" width="251" height="216" rx="12" fill="#0b0c0d" stroke="#2e3134" stroke-width="2"/><rect x="1377" y="55" width="70" height="172" rx="5" fill="#16181a"/><rect x="1465" y="66" width="122" height="150" rx="10" fill="#050606"/>
      ${[[1500,105],[1552,105],[1526,180]].map(([x,y])=>`<rect x="${x-10}" y="${y-14}" width="20" height="28" fill="#c9cdd2"/>`).join('')}</g>
      ${[[253,111],[253,211],[991,111],[991,211]].map(([x,y])=>screw(x,y)).join('')}`;
  }
  s += [[50,160],[1664,160]].map(([x,y])=>screw(x,y)).join('');
  s += ART.cdr ? `<image href="${ASSET}pod17-rear${D.variant}-ink.svg" width="1714" height="321"/>` /* legends stay readable over the cord and plugs */
               : `<image href="${ASSET}pod17-rear${D.variant}-white.png" width="1714" height="321"/>`;
  if (p.power && o.carrier) s += `<circle cx="${D.variant==='75'?965:985}" cy="${D.variant==='75'?150:40}" r="8" fill="${o.silent?'var(--warn)':'var(--accent)'}"><title>${outTxt}</title></circle>`;
  return s + '</svg>';
}
/* POD17R remote fader box: drawn from POD17 - #Engineering/SILK/REMOTE FADER.cdr (converted with Inkscape):
   a fader slot with a wedge, LOCK and NO LOCK LEDs at the right, CONTROL connector on the back. Size not documented. */
function remoteSVG(t){
  const p = phys(t), la = ledAt(t);
  const y = 40 + (1-p.remPos)*120;
  return `<svg viewBox="0 0 460 210" style="width:100%;max-width:360px;display:block" role="img" aria-label="POD17R remote fader">
    <rect x="4" y="4" width="452" height="202" rx="10" fill="#141517" stroke="#2e3134"/>
    <path d="M60 172 L330 160 L330 176 Z" fill="#34a853" opacity=".9"/>
    <rect x="182" y="30" width="16" height="140" rx="6" fill="#050606" stroke="#2c2f32"/>
    <g class="p17fader" style="cursor:ns-resize"><title>Remote fader ${(p.remPos*100).toFixed(1)} % — drag, click above/below, or wheel</title><rect x="150" y="30" width="80" height="150" fill="transparent"/>
      <rect x="160" y="${y-12}" width="60" height="24" rx="4" fill="#d6d8da" stroke="#555"/><line x1="160" y1="${y}" x2="220" y2="${y}" stroke="#333" stroke-width="2"/></g>
    ${[['LOCK',70,la.tally.OUT_2,'#4dff5a'],['NO LOCK',110,la.tally.OUT_1,'#ff3b2f']].map(([n,yy,on,c])=>`<circle cx="390" cy="${yy}" r="9" fill="${p.remote&&p.power&&on?c:'#2a2222'}"/><text x="374" y="${yy+5}" fill="#f0f0ec" font-size="13" text-anchor="end">${n}</text>`).join('')}
    <text x="20" y="196" fill="#f0f0ec" font-size="14">REMOTE FADER</text><text x="440" y="196" fill="#f0f0ec" font-size="12" text-anchor="end">${p.remote?'connected to CONTROL':'not connected'}</text>
    <text x="236" y="${y+5}" fill="var(--ink2)" font-size="12">${p.remote? fmtDb((p.volMode?VOL:TRM)[Math.round(p.remPos*255)])+' dB':''}</text>
  </svg>`;
}
/* every control goes through run(): in the Tutorial tab a change is placed at 0.050 s (after settling what came
   before) and the playhead jumps to the end of the second, so the panel shows the settled result */
let tutMode = false;
function run(name, ...args){
  if (!tutMode) return A[name](...args);
  commitAll(); SIM.t = 0.05;
  A[name](...args);
  const p = physEnd(); if (!p.inOn) tut.seen.inOff = true; if (p.inErr) tut.seen.err = true;
  SIM.seek(1);
}
function bindPanel(root){
  root.querySelectorAll('.p17mono').forEach(g=>g.addEventListener('click', ()=>run('mono',)));
  root.querySelectorAll('.p17inv').forEach(g=>g.addEventListener('click', ()=>run('inv',)));
  root.querySelectorAll('.p17pwr').forEach(g=>g.addEventListener('click', ()=>run('power',)));
  root.querySelectorAll('.p17mon').forEach(g=>g.addEventListener('click', ()=>run('monitor',)));
  root.querySelectorAll('.p17j').forEach(g=>g.addEventListener('click', ()=>{ const j=g.dataset.j, p=phys(SIM.t); if (j==='in') run('input',!p.inOn); else if (j==='ref') run('ref',!p.refOn); else if (j==='remote') run('remote',!p.remote); }));
  root.querySelectorAll('.p17pot').forEach(g=>{ const k=+g.dataset.k;
    g.addEventListener('click', e=>{ const r=g.getBoundingClientRect(); run('pot',k, (e.clientX-r.left)/r.width < 0.5 ? -0.05 : 0.05); });
    g.addEventListener('wheel', e=>{ e.preventDefault(); run('pot',k, (e.deltaY<0?1:-1)*(e.shiftKey?0.004:0.02)); }, {passive:false}); });
  root.querySelectorAll('.p17fader').forEach(g=>{
    g.addEventListener('click', e=>{ const r=g.getBoundingClientRect(); const fy=(e.clientY-r.top)/r.height; run('pot',2, fy<0.5? 0.05 : -0.05); });
    g.addEventListener('wheel', e=>{ e.preventDefault(); run('pot',2, (e.deltaY<0?1:-1)*0.02); }, {passive:false}); });
}
function controlsHTML(){
  const p = phys(SIM.t);
  const opt = (arr, cur) => arr.map(f=>`<option value="${f}" ${f===cur?'selected':''}>${fmtFs(f)}</option>`).join('');
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin-top:8px">
    <button data-a="mono" class="${p.mono?'on':''}">STEREO/MONO</button><button data-a="inv" class="${p.inv?'on':''}">R/−R</button>
    <span class="muted">CH A</span><button data-a="a-">−</button><button data-a="a+">+</button>
    <span class="muted">CH B</span><button data-a="b-">−</button><button data-a="b+">+</button>
    <button data-a="pwr">${p.power?'Power off':'Power on'}</button>
  </div>
  <div class="small" style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin-top:6px">
    <button data-a="in" class="${p.inOn?'on':''}">INPUT ${p.inOn?'connected':'unplugged'}</button><label>rate <select data-s="inFs">${opt(RATES,p.inFs)}</select></label>
    <button data-a="ref" class="${p.refOn?'on':''}">REFERENCE ${p.refOn?'connected':'unplugged'}</button><label>rate <select data-s="refFs">${opt(RATES.slice(1),p.refFs)}</select></label>
    <button data-a="err" class="${p.inErr?'on':''}">Input errors</button>
  </div>
  <div class="small" style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin-top:6px">
    <button data-a="rem" class="${p.remote?'on':''}">REMOTE FADER ${p.remote?'plugged':'unplugged'}</button>
    <button data-a="vol" class="${p.volMode?'on':''}">CONTROL pin 5 strap (${p.volMode?'VOLUME':'TRIM'})</button>
    <button data-a="jmp" class="${p.jmp20?'on':''}">Jumper H3 (${p.jmp20?'20-bit':'24-bit'})</button>
    <label>Source <select data-s="sig">${Object.keys(SIG_NAMES).map(k=>`<option value="${k}" ${k===D.sig?'selected':''}>${SIG_NAMES[k]}</option>`).join('')}</select></label>
    <label>at <select data-s="lvl">${[-30,-24,-20,-18,-12,-6].map(v=>`<option value="${v}" ${v===D.lvl?'selected':''}>${v} dBFS</option>`).join('')}</select></label>
    <label>Rear <select data-s="variant"><option value="75" ${D.variant==='75'?'selected':''}>POD17/75 (BNC)</option><option value="110" ${D.variant==='110'?'selected':''}>POD17/110 (Phoenix)</option></select></label>
  </div>
  <div class="small muted" style="margin-top:4px">${tutMode?'In the Tutorial each change is placed at 0.050 s.':'Each change happens at the playhead.'} Keys: M mono · R invert · A/Z CH A · S/X CH B · I input · F reference. Click a pot's left or right half, or use the wheel (Shift = fine).</div>`;
}
function bindControls(root){
  const map = { mono:()=>run('mono',), inv:()=>run('inv',), 'a-':()=>run('pot',0,-0.05), 'a+':()=>run('pot',0,0.05), 'b-':()=>run('pot',1,-0.05), 'b+':()=>run('pot',1,0.05),
    pwr:()=>run('power',), in:()=>run('input',!phys(SIM.t).inOn), ref:()=>run('ref',!phys(SIM.t).refOn), err:()=>run('err',!phys(SIM.t).inErr),
    rem:()=>run('remote',!phys(SIM.t).remote), vol:()=>run('volMode',!phys(SIM.t).volMode), jmp:()=>run('jmp',!phys(SIM.t).jmp20) };
  root.querySelectorAll('[data-a]').forEach(b=> b.onclick = ()=>{ (map[b.dataset.a]||(()=>{}))(); });
  root.querySelectorAll('select[data-s]').forEach(s=> s.onchange = ()=>{ const k=s.dataset.s, v=s.value;
    if (k==='inFs') run('inFs',+v); else if (k==='refFs') run('refFs',+v); else if (k==='sig'){ D.sig=v; SIM.refresh(); } else if (k==='lvl'){ D.lvl=+v; SIM.refresh(); } else if (k==='variant'){ D.variant=v; SIM.refresh(); } });
}
document.addEventListener('keydown', e=>{
  if (!window.__pod17Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k = e.key.toLowerCase(), p = phys(SIM.t);
  const m = { m:()=>run('mono',), r:()=>run('inv',), a:()=>run('pot',0,0.02), z:()=>run('pot',0,-0.02), s:()=>run('pot',1,0.02), x:()=>run('pot',1,-0.02), i:()=>run('input',!p.inOn), f:()=>run('ref',!p.refOn) };
  if (m[k]){ m[k](); e.preventDefault(); }
});

/* ================================================================
   TIMELINE
   ================================================================ */
const STEP_COL = ['--accent2','--accent','--accent2','--warn','--accent','--ink2','--accent','--accent2','--accent','--bad','--ink2'];
function txt(c, s, x, y, col){ c.fillStyle = col || SIM.css('--ink'); c.font = '11px '+SIM.css('--mono'); c.fillText(s, x, y); }
function lanes(){
  const css = n => SIM.css(n), R = simulate();
  const ls = [];
  const inLane = (label, key, fsKey) => ({label, h:24, draw(c,X,t0,t1,y,h){
    const N = 240, span = t1-t0; let last=null, segStart=t0;
    const flush=(tt)=>{ if (last===null) return; if (last){ const fs = phys((segStart+tt)/2)[fsKey]; c.save(); c.beginPath(); c.rect(X(segStart), y, X(tt)-X(segStart), h); c.clip(); SIM.pulses(c,X,Math.max(t0,segStart),Math.min(t1,tt),y,h,192/fs,0,1/fs,css('--warn'),'AES blocks @ '+fmtFs(fs)); c.restore(); } else { c.fillStyle=css('--ink2'); c.globalAlpha=.25; c.fillRect(X(segStart), y+h/2-1, X(tt)-X(segStart), 2); c.globalAlpha=1; } };
    for (let i=0;i<=N;i++){ const tt=t0+span*i/N; const p=phys(tt); const on = !!(p[key] && p.power!==undefined); if (on!==last){ flush(tt); last=on; segStart=tt; } }
    flush(t1);
  }});
  ls.push(inLane('AES INPUT (CS8420 CH1 rx)', 'inOn', 'inFs'));
  ls.push(inLane('AES REFERENCE (CH2 rx)', 'refOn', 'refFs'));
  ls.push({label:'PIC16C73A main loop', h:36, draw(c,X,t0,t1,y,h){
    const ps = R.passes; let shown=0;
    for (const p of ps){ if (p.t1 < t0 || p.t0 > t1) continue; shown++;
      if (p.kind==='init'){ c.fillStyle=css('--warn'); c.globalAlpha=.6; c.fillRect(X(p.t0),y+3,Math.max(2,X(p.t1)-X(p.t0)),h-6); c.globalAlpha=1; txt(c,'init',X(p.t0)+3,y+h/2+4); continue; }
      const pxPass = X(p.t1)-X(p.t0);
      if (pxPass > 40){
        p.steps.forEach((s,j)=>{ if(!s) return; c.fillStyle=css(STEP_COL[j]); c.globalAlpha = j===3? .45 : .8; c.fillRect(X(s.t0), y+3, Math.max(1,X(s.t1)-X(s.t0)-0.5), h-6); c.globalAlpha=1;
          if (X(s.t1)-X(s.t0) > 64){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(STEPS[j][0].split(' ')[0].slice(0,26), X(s.t0)+3, y+h/2+3); } });
        if (pxPass > 120){ c.fillStyle=css('--ink'); c.font='10px sans-serif'; c.fillText('#'+p.i, X(p.t0)+2, y+10); }
      } else { c.fillStyle = p.i%2? css('--accent') : css('--accent2'); c.globalAlpha=.7; c.fillRect(X(p.t0), y+3, Math.max(1,pxPass-0.5), h-6); c.globalAlpha=1; }
    }
    const pxAvg = X(t0+R.avgPass)-X(t0);
    if (pxAvg < 3) txt(c, `${shown} passes (avg ${(R.avgPass*1000).toFixed(2)} ms: 3 × delay = 3.75 ms + 2 × flush8420reg + SPI); zoom in to see the 11 calls`, X(t0)+6, y+h/2+4);
  }});
  ls.push({label:'SPI: CS8420s / SHARC', h:22, draw(c,X,t0,t1,y,h){
    for (const p of R.passes){ if (p.kind!=='loop' || p.t1<t0 || p.t0>t1) continue;
      const seg=(s,col,yy,hh)=>{ if(!s) return; c.fillStyle=css(col); c.fillRect(X(s.t0), y+yy, Math.max(1,X(s.t1)-X(s.t0)), hh); };
      seg(p.steps[2],'--accent2',3,h-6);                        // SHARC
      const sh=p.steps[3]; if (sh){ const f0 = sh.t1 - CYC.FLUSH*C.TCY; c.fillStyle=css('--warn'); c.fillRect(X(f0), y+3, Math.max(1,X(sh.t1)-X(f0)), h-6); }
      seg(p.steps[4],'--warn',3,h-6); seg(p.steps[7],'--warn',3,h-6); seg(p.steps[9],'--warn',3,h-6);
    }
    txt(c,'blue = SHARC link · orange = CS8420 register traffic', X(t0)+6, y+h-4, css('--ink2'));
  }});
  ls.push({label:'Nibble to SHARC (aaaadddd)', h:24, draw(c,X,t0,t1,y,h){
    for (const p of R.passes){ if (p.kind!=='loop' || p.cut || p.t1<t0 || p.t0>t1) continue; const s=p.steps[2]; const x=X(s.t0);
      c.fillStyle = p.nib.a===15? css('--accent') : p.link.R? css('--bad') : css('--accent2'); c.fillRect(x, y+4, Math.max(1.5, X(s.t1)-x), h-8);
      if (X(p.t1)-X(p.t0) > 34) txt(c, p.nib.a.toString(16).toUpperCase()+':'+p.nib.d.toString(16).toUpperCase()+(p.link.R?' R':''), x+3, y+h/2+4); }
    if (X(t0+R.avgPass)-X(t0) < 34) txt(c,'one nibble per pass; green = nibble F completes a frame (every 16 passes); red = resync bit', X(t0)+6, y+h/2+4, css('--ink'));
  }});
  ls.push({label:'ADC: AN1 · AN0 · AN2 · AN4', h:22, draw(c,X,t0,t1,y,h){
    const names=['AN1 CH A','AN0 CH B','AN2 rem L','AN4 rem R'];
    for (const p of R.passes){ if (p.kind!=='loop' || p.cut || !p.adc || p.t1<t0 || p.t0>t1) continue; const s=p.steps[0];
      if (p.adc.start!==undefined){ c.fillStyle=css('--accent'); c.fillRect(X(s.t0), y+3, Math.max(1.5,X(s.t1)-X(s.t0)), h-6); if (X(p.t1)-X(p.t0)>60) txt(c,'GO '+names[p.adc.start], X(s.t0)+3, y+h/2+4); }
      if (p.adc.proc!==undefined){ c.fillStyle=css('--accent2'); c.fillRect(X(s.t0), y+3, Math.max(1.5,X(s.t1)-X(s.t0)), h-6); if (X(p.t1)-X(p.t0)>60) txt(c,'code'+(p.adc.proc+1)+'='+p.adc.code, X(s.t0)+3, y+h/2+4); } }
  }});
  ls.push({label:'debounce / MODE1', h:22, draw(c,X,t0,t1,y,h){
    for (const p of R.passes){ if (p.kind!=='loop' || p.t1<t0 || p.t0>t1) continue;
      if (p.deb.on){ c.fillStyle=css('--warn'); c.globalAlpha=.25+.6*(1-p.deb.bcount/31); c.fillRect(X(p.t0), y+4, X(p.t1)-X(p.t0), h-8); c.globalAlpha=1; }
      if (p.modeChange){ const x=X(p.steps[5].t1); c.fillStyle=css('--bad'); c.fillRect(x-1, y, 3, h); txt(c,'MODE1='+hex2(p.modeChange.MODE1), x+4, y+h/2+4); } }
  }});
  ls.push({label:'CS8420 CH1 TX / mode', h:24, draw(c,X,t0,t1,y,h){
    const cm = R.commits;
    for (let k=0;k<cm.length;k++){ const a=Math.max(t0,cm[k].t), b=Math.min(t1, k+1<cm.length? cm[k+1].t : 2); if (b<=a) continue;
      c.fillStyle = cm[k].txoff? css('--bad') : cm[k].src? css('--accent2') : css('--accent'); c.globalAlpha=cm[k].txoff? .45 : .65; c.fillRect(X(a), y+4, X(b)-X(a), h-8); c.globalAlpha=1;
      if (X(b)-X(a)>90) txt(c, cm[k].off? 'power off' : cm[k].txoff? 'TXOFF (muted)' : cm[k].src? 'SRC → AES tx' : 'BYPASS → AES tx', X(a)+4, y+h/2+4, '#fff'); }
  }});
  ls.push({label:'ADSP-21061 SHARC', h:24, draw(c,X,t0,t1,y,h){
    const sh = R.sharc;
    for (let k=0;k<sh.length;k++){ const s=sh[k]; const a=Math.max(t0,s.t0), b=Math.min(t1, s.t1!==undefined? s.t1 : (k+1<sh.length? sh[k+1].t0 : 2)); if (b<=a) continue;
      if (s.kind==='run'){ const fs = outAt((a+b)/2).fsOut; c.save(); c.beginPath(); c.rect(X(a),y,X(b)-X(a),h); c.clip(); SIM.pulses(c,X,a,b,y,h,1/fs,0,0.2/fs,css('--accent'),'SPORT0 rx IRQ → sample_proc @ '+fmtFs(fs)); c.restore(); }
      else { c.fillStyle = s.kind==='off'? css('--ink2') : css('--warn'); c.globalAlpha=.55; c.fillRect(X(a), y+3, X(b)-X(a), h-6); c.globalAlpha=1; txt(c, s.kind==='off'?'off': s.kind==='boot'? 'boot: PROM load · delay · frame code · delay · beg_synhron' : 'beg_synhron: delay (≈'+(C.SH_DELAY*1000).toFixed(0)+' ms) → _synhron_SPORT0', X(a)+4, y+h/2+4); }
    }
    for (const f of R.frames){ if (f.init || f.t<t0 || f.t>t1) continue; c.fillStyle=css('--bad'); c.fillRect(X(f.t)-1, y, 2, h); }
  }});
  for (const side of [0,1]){
    ls.push({label:`OUT 1–6 ${side?'B (right)':'A (left)'}`, h:38, draw(c,X,t0,t1,y,h){
      const pw = X(t1)-X(t0), span=t1-t0; const N = Math.min(1600, Math.max(200, pw*2));
      const col = side? css('--bad') : css('--accent');
      // density check: tone 1 kHz/400 Hz
      if (span*1000 > pw/3){
        for (let i=0;i<N;i++){ const tt=t0+span*(i+.5)/N; const o=outAt(tt); const x=X(t0+span*i/N), w=pw/N+0.6;
          if (!o.carrier){ c.fillStyle=css('--grid'); c.fillRect(x, y+h/2-1, w, 2); continue; }
          if (o.silent){ c.fillStyle=css('--warn'); c.fillRect(x, y+h/2-1, w, 2); continue; }
          const pk = peakDb(side, tt); const a = pk===-Infinity? 0 : Math.pow(10,pk/20); c.fillStyle=col; c.globalAlpha=.45; c.fillRect(x, y+h/2-a*(h/2-2), w, 2*a*(h/2-2)+0.5); c.globalAlpha=1; }
        return;
      }
      c.strokeStyle=col; c.lineWidth=1.2; c.beginPath(); let pen=false;
      for (let i=0;i<=N;i++){ const tt=t0+span*i/N; const v=outSample(tt, side); if (v===null){ pen=false; continue; } const yy=y+h/2 - v*(h/2-2); if(pen) c.lineTo(X(tt),yy); else { c.moveTo(X(tt),yy); pen=true; } }
      c.stroke();
    }});
  }
  ls.push({label:'LED port pins (RC7 RB2 RB1 RB0)', h:34, draw(c,X,t0,t1,y,h){
    const rows=[['audio',LED_COL.audio],['src',LED_COL.src],['rem',LED_COL.rem],['err',LED_COL.err]];
    for (const L of R.ledsOn){ if (L.t1<t0 || L.t0>t1) continue; rows.forEach(([k,col],r)=>{ if (!L.leds[k]) return; c.fillStyle=col; c.fillRect(X(L.t0), y+2+r*8, Math.max(1,X(L.t1)-X(L.t0)), 6); }); }
    if (X(t0+R.avgPass)-X(t0) < 6) txt(c, `LEDs are pulsed: on only from LED_processing to the next SHARC_link_control ≈ ${(ledDuty()*100).toFixed(0)} % duty at ≈ ${(1/R.avgPass).toFixed(0)} Hz`, X(t0)+6, y+h-3, css('--ink'));
  }});
  return ls;
}

/* ---------------- AES3 scope on OUT 1 at the playhead ---------------- */
function aesFrameBits(t){
  const o = outAt(t); const fs = o.fsOut; const n = Math.floor(t*fs); const fr = n%192;
  const cs = csOut(t).b;
  const out = [];
  for (const side of [0,1]){
    const v = outSample(t, side, o) || 0;
    let s = Math.round(v*8388607); if (s<0) s += 1<<24;
    const bits = new Array(32).fill(0);
    for (let b=0;b<24;b++) bits[4+b] = (s>>b)&1;
    // channel-status bit fr: the CS8420 buffer stores AES bit 0 in D7 of byte 0 (MSB first) — INFERRED from the fs codes in pod17.asm
    const byte = fr>>3, bit = fr&7; bits[30] = byte < cs.length ? (cs[byte]>>(7-bit))&1 : 0;
    let par=0; for (let b=4;b<31;b++) par^=bits[b]; bits[31]=par;
    out.push({pre: side? 'Y' : (fr===0?'Z':'X'), bits, sample:v, raw:s});
  }
  return {n, fr, sub:out, fs, o};
}
function biphase(pre, bits, startLevel){
  const P = {X:[1,1,1,0,0,0,1,0], Y:[1,1,1,0,0,1,0,0], Z:[1,1,1,0,1,0,0,0]}[pre];
  const lv = []; const inv = startLevel? 0:1; P.forEach(b=>lv.push(inv? 1-b : b));
  let cur = lv[lv.length-1]; for (let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if (bits[i]) cur=1-cur; lv.push(cur); } return lv;
}
function drawScope(cv, el, t){
  const {c,w} = SIM.canvas(cv, 140);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), a2=SIM.css('--accent2'), warn=SIM.css('--warn');
  const F = aesFrameBits(t);
  if (!F.o.carrier){ c.fillStyle=ink2; c.font='13px sans-serif'; c.fillText('No AES carrier at the playhead: '+(!F.o.p.power?'unit off':'TXOFF set in CS8420 CH1 reg 3 (muted) or no input'), 12, 60); el.innerHTML=''; return; }
  const lvA = biphase(F.sub[0].pre, F.sub[0].bits, 0), lvB = biphase(F.sub[1].pre, F.sub[1].bits, lvA[lvA.length-1]);
  const lv = lvA.concat(lvB), cw = (w-20)/lv.length;
  [0,64].forEach(off=>[[0,8,warn,'pre'],[8,16,ink2,'aux'],[16,56,acc,'audio'],[56,64,a2,'VUCP']].forEach(([a,b,col,lb])=>{ c.fillStyle=col; c.globalAlpha=.12; c.fillRect(10+(off+a)*cw,20,(b-a)*cw,70); c.globalAlpha=1; c.fillStyle=ink2; c.font='10px sans-serif'; if ((b-a)*cw>24) c.fillText(lb, 12+(off+a)*cw, 104); }));
  c.strokeStyle=ink; c.lineWidth=1.5; c.beginPath(); lv.forEach((v,i)=>{ const x=10+i*cw, yy=v?30:80; if(!i) c.moveTo(x,yy); else c.lineTo(x,yy); c.lineTo(x+cw,yy); }); c.stroke();
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`Subframe A (${F.sub[0].pre})`, 12, 14); c.fillText('Subframe B (Y)', 12+64*cw, 14);
  c.fillText(`frame ${F.n.toLocaleString()} · ${F.fr}/191 of block · cell ${SIM.fmtDur(1/(F.fs*128))} · ${fmtFs(F.fs)}${F.o.silent?' · SHARC resyncing → zeros':''}`, 10, 128);
  const fmt = s => s.bits.slice(4,28).reverse().join('');
  el.innerHTML = F.sub.map((s,i)=>`${i?'B':'A'} ${s.sample.toFixed(5)} → 0x${s.raw.toString(16).padStart(6,'0').toUpperCase()} (${fmt(s)}) · V=${s.bits[28]} U=${s.bits[29]} C=${s.bits[30]} P=${s.bits[31]}`).join('<br>');
}
function csTable(t){
  const cs = csOut(t), b = cs.b;
  const fsName = v => ['not indicated','48 kHz','44.1 kHz','32 kHz'][v&3];
  return `<table class="kv"><tr><th>Byte</th><th>Value</th><th>Meaning (AES3, CS8420 MSB-first buffer ${inf})</th></tr>
    <tr><td>0</td><td class="mono">${hex2(b[0])}</td><td>bit 7 = professional; fs bits = ${fsName(b[0])}${cs.src && cs.fsOut!==cs.fsIn?' <b>(rewritten from the reference)</b>':''}${(cs.fsOut===96000||cs.fsOut===88200)?' <span style="color:var(--warn)">— the real rate '+fmtFs(cs.fsOut)+' has no code here</span>':''}</td></tr>
    <tr><td>2</td><td class="mono">${hex2(b[2])}</td><td>${b[2]===0x34?'aux “max 24 bit”, word length 101 = 24 bits':'aux “max 24 bit”, word length 100 = <b>23 bits</b> (the 20-bit jumper writes 0x30)'}</td></tr>
    <tr><td>4</td><td class="mono">${hex2(b[4])}</td><td>${b[4]? 'copied untouched from the input: says '+(cs.fsIn===96000?'96':'88.2')+' kHz'+(cs.fsOut!==cs.fsIn?' <span style="color:var(--warn)">while the output runs at '+fmtFs(cs.fsOut)+'</span>':'') : 'no extended rate'}</td></tr></table>`;
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ return D.log[0] ? `<div><b>${D.log[0].name}</b> at ${SIM.fmtT(D.log[0].t)}</div>` + D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Press a button, turn a pot or plug a cable. Each step the firmware takes is listed here.</div>'; }
function inspectorHTML(t){
  const o = outAt(t), st = stepAt(t), p = st.pass, la = ledAt(t), fr = o.fr;
  const P = p && p.kind==='loop' ? p : null;
  return `<table class="kv">
    <tr><th>PIC pass</th><td class="mono">${!o.p.power?'— (off)': !p? '—' : p.kind==='init'?'init (WHOLE_RESET)':'#'+p.i+' · '+STEPS[st.step][0]}</td></tr>
    <tr><th>MODE1 (debounced)</th><td class="mono">${P? hex2(P.MODE1)+' = '+P.MODE1.toString(2).padStart(8,'0')+'b' : '—'} <span class="muted">7 CH1 lock · 6 CH2 lock · 4 remote · 3 volume · 2 invert · 1 mono · 0 20-bit</span></td></tr>
    <tr><th>codes 1–4 (PIC)</th><td class="mono">${P? P.codes.join(' · ')+' <span class="muted">hysteresis '+P.hyst.map(f=>f?'L':'u').join('')+'</span>' : '—'}</td></tr>
    <tr><th>SHARC has</th><td class="mono">ji_input ${'0x'+fr.ji.toString(16).toUpperCase().padStart(4,'0')} · codes ${fr.codes.join(' · ')} · ${o.sh.kind}</td></tr>
    <tr><th>Gain applied</th><td class="mono">${SEL_NAMES[o.g.sel]}<br>A ${fmtDb(o.g.gL,2)} dB · B ${fmtDb(o.g.gR,2)} dB${o.g.mono?' · MONO':''}${o.g.inv?' · R inverted':''}</td></tr>
    <tr><th>CS8420 CH1</th><td class="mono">${o.c.txoff?'TXOFF':'transmitting'} · ${o.c.src?'SRC mode':'BYPASS mode'} · ${o.c.w20?'20-bit':'24-bit'} serial</td></tr>
    <tr><th>Outputs</th><td class="mono">${!o.carrier?'no AES carrier': o.silent? 'AES at '+fmtFs(o.fsOut)+', digital silence' : fmtFs(o.fsOut)+' · A '+(peakDb(0,t)===-Infinity?'silence':peakDb(0,t).toFixed(1)+' dBFS')+' · B '+(peakDb(1,t)===-Infinity?'silence':peakDb(1,t).toFixed(1)+' dBFS')}</td></tr>
    <tr><th>LED pins now</th><td class="mono">${la.on?'driven (between LED_processing and SHARC_link_control)':'all off (inside SHARC_link_control / rest of the pass)'}</td></tr></table>`;
}
function viewSim(m){
  window.__pod17Active = true; tutMode = false;
  m.innerHTML = `
  <div class="grid2">
    <div>
      ${card('Front panel at the playhead (real silkscreen)', `<div id="fp"></div><div id="ctl"></div>`)}
      ${card('Rear panel — click INPUT / REFERENCE / CONTROL', `<div id="rp"></div>${artNote()}`)}
    </div>
    <div>
      ${card('What the firmware did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>
        <div class="small" style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><button id="clr">Clear changes</button><button id="settle">Settle (make the end state the start)</button><button id="rst">Factory state</button>
        <label>LEDs <select id="ledm"><option value="perceived" ${D.ledMode==='perceived'?'selected':''}>as the eye sees them</option><option value="instant" ${D.ledMode==='instant'?'selected':''}>instantaneous pin state</option></select></label></div>`)}
      <div id="remcard">${card('POD17R remote fader (from REMOTE FADER.cdr)', `<div id="remote"></div>`)}</div>
    </div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek)', `<canvas id="tl"></canvas>
     <p class="small muted">Pass timing is computed from the 4.9152 MHz crystal and the instruction counts in pod17.asm (SPI byte time ${inf}). Each pass runs <span class="mono">delay</span> three times inside <span class="mono">SHARC_link_control</span> and rewrites 18 CS8420 registers twice, so the PIC needs ≈ ${(simulate().avgPass*1000).toFixed(1)} ms per pass. Everything the operator does reaches the audio on this clock: 31 passes of debounce, 16 passes per SHARC frame, 12 passes per pot reading.</p>`)}
  <div class="grid2">
    ${card('Scope: OUT 1 at the playhead (one AES3 frame, biphase-mark)', `<canvas id="scope"></canvas><div id="bits" class="small mono"></div>`)}
    <div>${card('Channel status the outputs carry', `<div id="cs"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>
  </div>`;
  const draw = ()=>{
    const t = SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(t); bindPanel(m.querySelector('#rp'));
    m.querySelector('#remote').innerHTML = remoteSVG(t); bindPanel(m.querySelector('#remote'));
    m.querySelector('#ctl').innerHTML = controlsHTML(); bindControls(m.querySelector('#ctl'));
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#insp').innerHTML = inspectorHTML(t);
    m.querySelector('#cs').innerHTML = csTable(t);
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200});
    drawScope(m.querySelector('#scope'), m.querySelector('#bits'), t);
  };
  m.querySelector('#clr').onclick = ()=>A.clearEvents();
  m.querySelector('#settle').onclick = ()=>A.settle();
  m.querySelector('#rst').onclick = ()=>A.reset();
  m.querySelector('#ledm').onchange = e=>{ D.ledMode = e.target.value; SIM.refresh(); };
  SIM.on('time', draw);
}

/* ---------------- tutorial (from MANUAL/pod17.pdf and POD17MAN.doc) ---------------- */
const LESSONS = [
  { title:'Meet the POD17', body:`<p>The POD17 is a half-rack <b>AES digital audio distribution amplifier</b>: one AES input, six AES outputs and a front monitor jack. Its main job, in the words of the manual, is to let you <b>adjust the level of an AES stream</b> “via a familiar analog rotary potentiometer”, because plants that standardised on −20 dBFS still received feeds anywhere from −20 to −12 dBFS.</p>
     <p>It can also <b>convert the sample rate</b> to match an AES reference, make a <b>mono</b> sum and <b>invert the right channel</b>. Inside, a PIC16C73A reads the controls and an ADSP-21061 SHARC does the arithmetic; two CS8420 chips receive, convert and transmit the AES.</p>
     <p class="muted">The tutorial places each action at 0.050 s and moves the playhead to the end of the second, so you see the settled result. Scrub back to watch it happen. Hover over panel parts for details.</p>`, check:()=>true, auto:true },
  { title:'1 · Power and lock', body:`<p>With the unit on and an AES feed on <b>INPUT</b>, the green <b>AUDIO</b> LED is lit: the input CS8420 is locked. Unplug the input on the rear panel and watch AUDIO go out and <b>ERROR</b> come on. The outputs stop completely (the transmitter is switched off).</p><p><b>Goal:</b> unplug the input, then plug it back in.</p>`,
    check:()=>tut.seen.inOff && phys(9).inOn, hint:'Click INPUT on the rear panel twice (or press I twice).' },
  { title:'2 · Set the trims (CH A, CH B)', body:`<p>The two recessed pots on the front are <b>multi-turn trims</b>, one per channel. In the standard <b>TRIM</b> setting they cover <b>−15 dB to +15 dB</b>; mid-travel is 0 dB.</p><p>Take a feed that arrives at −20 dBFS and bring channel A up to about −12 dBFS: that needs roughly <b>+8 dB</b>.</p><p><b>Goal:</b> CH A between +7 and +9 dB.</p>`,
    check:()=>{ const g=db(TRM[Math.round(phys(9).potA*255)]); return g>7 && g<9; }, hint:'Click the right half of CH A, or press A, until the inspector shows about +8 dB for A.' },
  { title:'3 · Make it mono', body:`<p>Press <b>STEREO/MONO</b> in. Both outputs now carry (L + R) / 2. The firmware waits for the switch to stay put for 31 loop passes (≈ ${(31*0.0072*1000).toFixed(0)} ms) before it believes it, then sends it to the DSP in the next 16-nibble frame. Scrub back on the timeline to find the red <span class="mono">MODE1=</span> marker.</p><p><b>Goal:</b> MONO in.</p>`, check:()=>phys(9).mono===1, hint:'Click STEREO/MONO on the panel, or press M.' },
  { title:'4 · Phase invert and the mono trap', body:`<p>The manual says that in mono mode R/−R lets you invert the audio. The DSP code inverts the <b>right channel first</b> and then sums, so with both buttons in the output is <b>(L − R) / 2</b>: on a mono-compatible source (L = R) <b>everything cancels</b>.</p><p>Set the source to “L = R = 1 kHz” and press <b>R/−R</b> in while MONO is in. Watch the outputs go silent.</p><p><b>Goal:</b> MONO and R/−R both in.</p>`, check:()=>phys(9).mono===1 && phys(9).inv===1, hint:'Press R/−R (key R) with MONO still in.' },
  { title:'5 · Back to stereo', body:`<p>Release both buttons. R/−R alone is the useful case: it fixes a feed where one leg of the right channel was wired backwards (try the source “R = −L”).</p><p><b>Goal:</b> STEREO, R/−R out.</p>`, check:()=>phys(9).mono===0 && phys(9).inv===0, hint:'Press MONO and R/−R again so both are out.' },
  { title:'6 · Sample-rate conversion', body:`<p>Feed a 48 kHz <b>REFERENCE</b> and set the input to <b>44.1 kHz</b>. The <b>SRC</b> LED lights and every output now runs at the reference rate. The output mutes for 21 loop passes while the CS8420 changes over, and then stays silent while the DSP re-synchronises (about ${(C.SH_DELAY*1000).toFixed(0)} ms, ${inf}).</p><p><b>Goal:</b> input 44.1 kHz, reference 48 kHz connected.</p>`,
    check:()=>{ const p=phys(9); return p.refOn && p.refFs===48000 && p.inFs===44100; }, hint:'Set the input rate select to 44.1 kHz, then click REFERENCE on the rear panel.' },
  { title:'7 · The remote fader', body:`<p>The <b>POD17R</b> came with a <b>REMOTE FADER</b> box that plugs into the rear <b>CONTROL</b> connector. When it is plugged in, the yellow <b>REMOTE</b> LED lights and the fader sets the level. The front trims stay in circuit as trims on top of it.</p><p><b>Goal:</b> remote fader plugged in.</p>`, check:()=>phys(9).remote===1, hint:'Click the CONTROL connector on the rear panel.' },
  { title:'8 · Volume mode', body:`<p>The unit “may be programmed” as a <b>volume control</b> instead of a trim: silence at the bottom to <b>+12 dB</b> at the top. On the Issue 1 board this is a ground on CONTROL pin 5. The volume table is <b>linear in amplitude</b>, so unity gain sits a quarter of the way up and the top three quarters are all boost.</p><p><b>Goal:</b> VOLUME mode on, fader at unity (between −1 and +1 dB).</p>`,
    check:()=>{ const p=phys(9); const g=db(VOL[Math.round(p.remPos*255)]); return p.volMode===1 && p.remote===1 && g>-1 && g<1; }, hint:'Click “CONTROL pin 5 strap”, then move the fader down to about 25 %.' },
  { title:'9 · Errors', body:`<p>Inject <b>input errors</b> (biphase or confidence errors on the incoming stream). The red <b>ERROR</b> LED lights on the very next loop pass: unlike the lock bits it is not debounced. The audio is not muted.</p><p><b>Goal:</b> ERROR on, then clean the input again.</p>`, check:()=>tut.seen.err && !phys(9).inErr, hint:'Click “Input errors” twice.' },
  { title:'Done', body:`<p>You have used every control on the POD17. <b>Software</b> traces each one through the PIC and SHARC code, <b>One second</b> breaks the loop and the AES stream down, and <b>Findings</b> lists what the firmware does that the manual doesn’t say.</p>`, check:()=>true, auto:true },
];
const tut = { idx:0, seen:{} };
function viewTutorial(m){
  window.__pod17Active = true; tutMode = true;
  m.innerHTML = `<div class="grid2">
    <div>${card('Tutorial — operating the POD17 (from the manual)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>
      ${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The unit (settled, end of the second)', `<div id="fp"></div><div id="ctl"></div><div id="rp" style="margin-top:8px"></div><div id="remote" style="margin-top:8px"></div><div id="insp" style="margin-top:8px"></div>`)}</div></div>`;
  const hot = `<g><rect x="800" y="180" width="300" height="80" fill="transparent"><title>Tallies: AUDIO = input locked, SRC = reference locked, REMOTE = remote fader in use, ERROR = errors or no signal</title></rect>
    <rect x="1120" y="180" width="170" height="80" fill="transparent"><title>CH A / CH B multi-turn trims</title></rect></g>`;
  const draw = ()=>{
    const t = SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG(t, {hot});
    m.querySelector('#rp').innerHTML = rearSVG(t);
    m.querySelector('#remote').innerHTML = remoteSVG(t);
    m.querySelector('#ctl').innerHTML = controlsHTML();
    m.querySelector('#insp').innerHTML = inspectorHTML(t);
    m.querySelector('#trace').innerHTML = traceHTML();
    bindPanel(m.querySelector('#fp')); bindPanel(m.querySelector('#rp')); bindPanel(m.querySelector('#remote')); bindControls(m.querySelector('#ctl'));
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===tut.idx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<tut.idx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ tut.idx=+li.dataset.i; draw(); });
    const L = LESSONS[tut.idx], ok = L.check();
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${tut.idx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${tut.idx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over (factory state)</button></div>`;
    m.querySelector('#prv').onclick=()=>{ tut.idx=Math.max(0,tut.idx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ tut.idx=Math.min(LESSONS.length-1,tut.idx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); tut.idx=0; tut.seen={}; SIM.seek(1); };
  };
  SIM.on('time', draw);
  if (SIM.t < 0.99) setTimeout(()=>SIM.seek(1), 0);
}

/* ---------------- one second, broken down ---------------- */
function viewSecond(m){
  window.__pod17Active = true; tutMode = false;
  m.innerHTML = `
  ${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">
    ${card('As seen by the device at the playhead', `<div id="dev"></div>`)}
    ${card('As seen by the panel and a meter on OUT 1', `<div id="fp"></div><h3>Downstream meter on OUT 1 (peak, −60 … 0 dBFS)</h3><canvas id="meter"></canvas><p class="small muted">A generic AES meter fed from OUT 1 or the DIGITAL MONITOR jack. Shows the tone peak after the POD17's gain, or the carrier state.</p>`)}
  </div>
  ${card('Zoom ladder at the playhead', `<canvas id="zl"></canvas>`)}
  ${card('How long things take — from the code', `<div id="lat"></div>`)}`;
  const draw = ()=>{
    const t = SIM.t, R = simulate(), o = outAt(t), T = R.avgPass;
    const rows = [
      ['PIC instruction cycles', (C.FOSC/4).toLocaleString(), SIM.fmtDur(C.TCY), '4.9152 MHz crystal ÷ 4'],
      ['PIC main-loop passes', (1/T).toFixed(0), SIM.fmtDur(T), 'computed from the instruction counts: 11 calls; 3 × delay (1.249 ms each) dominate'],
      ['delay calls', (3/T).toFixed(0), '1.249 ms', '“Provide a 1.54mS delay” — that is the time at 4 MHz, not 4.9152 MHz'],
      ['CS8420 register writes', (36/T).toFixed(0), '', 'flush8420reg runs twice a pass: 2 × 18 writes of 3 SPI bytes'],
      ['Nibbles to the SHARC', (1/T).toFixed(0), SIM.fmtDur(T), 'one aaaadddd byte per pass in Link_to_SHARC'],
      ['Complete frames to the SHARC', (1/(16*T)).toFixed(1), SIM.fmtDur(16*T), '16 nibbles: frame code, reserved, MODE1, MODE2, code1–4'],
      ['ADC readings per pot', (1/(12*T)).toFixed(1), SIM.fmtDur(12*T), 'AtoD takes 3 passes per channel, 4 channels'],
      ['Channel-status cycles', (1/(8*T)).toFixed(1), SIM.fmtDur(8*T), 'channel_status_proc, one of 8 steps per pass'],
      ['LED refresh (pulse)', (1/T).toFixed(0), SIM.fmtDur(T), `on ≈ ${(ledDuty()*100).toFixed(0)} % of the time`],
      ['AES3 blocks out', (o.fsOut/192).toFixed(2), SIM.fmtDur(192/o.fsOut), '192 frames; channel status = 24 bytes per block'],
      ['AES3 frames (samples) out', o.fsOut.toLocaleString(), SIM.fmtDur(1/o.fsOut), 'one SPORT0 receive interrupt → sample_proc per frame'],
      ['AES3 bit cells', (128*o.fsOut).toLocaleString(), SIM.fmtDur(1/o.fsOut/128), `${(128*o.fsOut/1e6).toFixed(3)} Mbaud through the EL2099 to six transformers`],
      ['SHARC cycles per sample', Math.round(C.SH_CLK/o.fsOut).toLocaleString(), SIM.fmtDur(1/C.SH_CLK), `at 24.576 MHz ${inf}; sample_proc needs well under 100`],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>`;
    const st = stepAt(t), P = st.pass, F = aesFrameBits(t);
    m.querySelector('#dev').innerHTML = `<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(t)}</td></tr>
      <tr><th>PIC16C73A</th><td class="mono">${!P?'—':P.kind==='init'?'init':'pass #'+P.i+': '+STEPS[st.step][0]}<br><span class="muted">${P&&P.kind==='loop'?STEPS[st.step][1]:''}</span></td></tr>
      <tr><th>This pass</th><td class="mono">${P&&P.kind==='loop'? 'nibble '+P.nib.a.toString(16).toUpperCase()+':'+P.nib.d.toString(16).toUpperCase()+' · ADC '+(P.adc.start!==undefined?'start AN'+[1,0,2,4][P.adc.start]:P.adc.proc!==undefined?'code'+(P.adc.proc+1)+' = '+P.adc.code:'read result')+' · '+CS_STEPS[P.cs.step]+(P.cs.skipped?' (skipped, unlocked)':'') : '—'}</td></tr>
      <tr><th>CS8420 CH1</th><td class="mono">${o.c.txoff?'TXOFF':'TX on'} · ${o.c.src?'SRC':'BYPASS'}</td></tr>
      <tr><th>SHARC</th><td class="mono">${o.sh.kind==='run'? 'sample '+F.n.toLocaleString()+': sample_proc ×'+'('+fmtDb(o.g.gL,1)+' / '+fmtDb(o.g.gR,1)+' dB)' : o.sh.kind}</td></tr>
      <tr><th>OUT frame</th><td class="mono">${o.carrier? F.fr+'/191 · A='+F.sub[0].sample.toFixed(4)+' B='+F.sub[1].sample.toFixed(4)+' · '+F.sub[0].pre : 'no carrier'}</td></tr></table>`;
    m.querySelector('#fp').innerHTML = frontSVG(t); bindPanel(m.querySelector('#fp'));
    const {c,w} = SIM.canvas(m.querySelector('#meter'), 70);
    [0,1].forEach(sd=>{ const pk = peakDb(sd, t); const segs=46; const lit = pk===null||pk===-Infinity? 0 : Math.max(0,Math.min(segs, Math.round((pk+60)/60*segs)));
      for (let s=0;s<segs;s++){ const x=10+s*(w-20)/segs; const col = s>=segs-4?'#e3453a': s>=segs-12?'#e8b23a':'#3fbf5f'; c.fillStyle = s<lit? col : SIM.css('--grid'); c.fillRect(x, 8+sd*28, (w-20)/segs-2, 20); }
      c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText((sd?'B ':'A ')+(pk===null?'no AES':pk===-Infinity?'silence':pk.toFixed(1)+' dBFS'), 12, 22+sd*28); });
    drawLadder(m.querySelector('#zl'), t);
    const lat = [
      ['Press a button (MONO, R/−R) → audio changes', `1 pass to notice + 31 debounce passes + up to 16 passes for nibble F + 1 sample ≈ ${(33*T*1000).toFixed(0)}–${(48*T*1000).toFixed(0)} ms`],
      ['Turn a pot → new gain', `next reading of that pot within 12 passes, averaged over 4 readings (48 passes) + frame ≈ ${(12*T*1000).toFixed(0)}–${(64*T*1000).toFixed(0)} ms to settle`],
      ['Pot jitter suppressed (hysteresis lock)', `256 steady readings × 12 passes ≈ ${(256*12*T).toFixed(1)} s (the comment says “about 4 second”)`],
      ['Plug a reference → SRC output', `32 passes (debounce) + 1 + 21 passes muted + ≈ ${(C.SH_DELAY*1000).toFixed(0)} ms SHARC resync silence ${inf} ≈ ${((54*T)+C.SH_DELAY).toFixed(2)} s`],
      ['Input error → ERROR LED', 'next pass (not debounced), ≤ '+(T*1000).toFixed(1)+' ms'],
      ['Power on → audio', `PIC: ≈ ${(CYC.INIT*C.TCY*1000).toFixed(1)} ms init; SHARC: PROM boot + 3 × ${(C.SH_DELAY*1000).toFixed(0)} ms delays ≈ ${(3*C.SH_DELAY+0.13).toFixed(1)} s ${inf}`],
    ];
    m.querySelector('#lat').innerHTML = `<table class="kv"><tr><th>Operator does</th><th>Time until it is heard / seen</th></tr>${lat.map(r=>`<tr><td>${r[0]}</td><td class="small">${r[1]}</td></tr>`).join('')}</table>`;
  };
  SIM.on('time', draw);
}
function drawLadder(cv, t){
  const R = simulate(), o = outAt(t);
  const levels = [['1 second',1],['100 ms (≈ 14 passes)',0.1],['1 PIC pass',R.avgPass],['1 AES block',192/o.fsOut],['1 ms',0.001],['1 AES frame',1/o.fsOut]];
  const H = levels.length*44+10; const {c,w} = SIM.canvas(cv, H);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), play=SIM.css('--play'), grid=SIM.css('--grid');
  levels.forEach(([nm,span],i)=>{
    const y=8+i*44, t0=Math.max(0, Math.min(1-span, t-span/2));
    c.fillStyle=ink; c.font='12px sans-serif'; c.fillText(nm+' ('+SIM.fmtDur(span)+')', 6, y+14); c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText('OUT A + PIC steps', 6, y+28);
    const x0=180, pw=w-x0-10; c.strokeStyle=grid; c.strokeRect(x0,y+2,pw,30);
    for (const p of R.passes){ if (p.kind!=='loop' || p.t1<t0 || p.t0>t0+span) continue; p.steps.forEach((s,j)=>{ if(!s) return; const a=Math.max(t0,s.t0), b=Math.min(t0+span,s.t1); if (b<=a) return; c.fillStyle=SIM.css(STEP_COL[j]); c.globalAlpha=.18; c.fillRect(x0+(a-t0)/span*pw, y+2, Math.max(.5,(b-a)/span*pw), 30); c.globalAlpha=1; }); }
    c.strokeStyle=acc; c.beginPath(); const N=Math.min(800,pw); let pen=false;
    for (let k=0;k<=N;k++){ const tt=t0+span*k/N; const v=outSample(tt,0); if (v===null){pen=false; continue;} const g=Math.max(0.05, o.g.gL*Math.pow(10,D.lvl/20)); const yy=y+17-Math.max(-1,Math.min(1,v/g))*13; if(pen) c.lineTo(x0+pw*k/N,yy); else { c.moveTo(x0+pw*k/N,yy); pen=true; } }
    c.stroke();
    const px=x0+(t-t0)/span*pw; c.strokeStyle=play; c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+34); c.stroke();
  });
}

/* ---------------- block diagram (POD17 - Functional Diagram.cdr, 2004|37, + Issue 1 netlist) ---------------- */
const BLOCKS = {
  inp:{x:20,y:30,w:170,h:70,t:'INPUT',s:['75 Ω BNC or 110 Ω Phoenix','T1 PE65612 → 75176 (U11)'],d:'The Functional Diagram shows INPUT through a transformer and a buffer into the first AES receiver. Issue 1 netlist: T1 → U11 (75176 used as a receiver) → U4 pins 4/5 (RXP/RXN). The 2016 manual specs list selectable 75 Ω / 110 Ω / Hi-Z termination.'},
  ref:{x:20,y:130,w:170,h:70,t:'REFERENCE',s:['T2 PE65612 → 75176 (U10)','→ CS8420 CH2 (U5)'],d:'Same front end as the input, into the second CS8420. Only its lock and its recovered clock are used: U5 pin 10 (RMCK) → U4 pin 21 (OMCK) in the netlist.'},
  rx1:{x:250,y:30,w:190,h:90,t:'CS8420 “CH1” (U4)',s:['AES rx · SRC · AES tx','reg3/reg4: BYPASS or SRC','channel status in/out'],d:'The “main” chip. In BYPASS mode the received audio goes straight to the serial port (to the SHARC) and the SHARC’s output comes back to the transmitter, clocked from the input. In SRC mode the received audio passes through the on-chip sample-rate converter first and the transmitter runs on OMCK from the reference chip. CS = PIC RC2 (CS1).'},
  rx2:{x:250,y:150,w:190,h:70,t:'CS8420 “CH2” (U5)',s:['reference receiver','RMCK → U4 OMCK'],d:'Reference receiver. Serial output in master mode (reg6 = 0x88). Its lock bit (receive-error register bit 4) decides SRC vs BYPASS. CS = PIC RC1 (CS2).'},
  dsp:{x:500,y:30,w:180,h:110,t:'ADSP-21061 SHARC (U3)',s:['SPORT0: audio ↔ CH1','SPORT1: PIC control','gain tables, mono, invert','boots from 27C512 (U6)'],d:'pod17core.asm. One receive interrupt per sample; sample_proc floats L and R, inverts R, makes mono, multiplies by the table gains, saturates back to fixed point. The 27C512 holds the PROM boot image (pod17.mak: elfloader -bprom).'},
  pic:{x:250,y:260,w:190,h:110,t:'PIC16C73A (U1)',s:['4 pots → ADC (AN0/1/2/4)','SW1, SW2, H3, DE-9 straps','SPI master to CH1, CH2, SHARC','LEDs + 2 tallies'],d:'pod17.asm, 4.9152 MHz. Polls everything in one main loop (no interrupts: the vector is just RETFIE). SSP in SPI master mode talks to both CS8420s and to the SHARC’s SPORT1.'},
  panel:{x:20,y:260,w:170,h:110,t:'Front panel',s:['STEREO/MONO · R/−R','AUDIO SRC REMOTE ERROR','CH A · CH B trims','power LED'],d:'SW1, SW2 are latching pushbuttons; the trims are multi-turn (POD17MAN.doc). LED colours from the ECO file: LED3 YELLOW (REMOTE), LED4 RED (ERROR).'},
  remote:{x:20,y:400,w:170,h:70,t:'CONTROL (DE-9, J1)',s:['remote fader L/R wipers','pin 5 volume · pin 7 remote','tallies via Q1/Q2'],d:'Issue 1 netlist: J1-1 → RA5/AN4, J1-2 → RA2/AN2, J1-5 → RA4, J1-7 → RA3, J1-3/J1-4 from transistors Q1/Q2 (the LOCK and ERROR tallies, OUT_2/OUT_1). The POD17R REMOTE FADER plugs in here.'},
  drv:{x:500,y:180,w:180,h:90,t:'EL2099 output driver (U8)',s:['CH1 TXP (U4-26) via R40','→ 7 transformers'],d:'One video-amplifier driver feeds all outputs through 110 Ω / 75 Ω build resistors and transformers T3–T8; T9 feeds the front TRS jack. The Functional Diagram notes the output transformers are not installed in the 75 Ω version.'},
  outs:{x:500,y:300,w:180,h:80,t:'OUT 1–6 · MONITOR',s:['75 Ω BNC or 110 Ω Phoenix','front TRS split'],d:'Six identical copies of CH1’s transmitter. Muted together when TXOFF is set.'},
};
const WIRES = [['inp','rx1','AES'],['ref','rx2','AES'],['rx2','rx1','OMCK'],['rx1','dsp','SPORT0 audio'],['dsp','rx1',''],['pic','dsp','SPORT1: 4 bytes/pass'],['pic','rx1','SPI'],['pic','rx2','SPI'],['panel','pic','switches, pots, LEDs'],['remote','pic','DE-9'],['rx1','drv','TXP'],['drv','outs','×7']];
function viewBlock(m){
  window.__pod17Active = false; tutMode = false;
  let sel = 'dsp';
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram (click a block) — after POD17 - Functional Diagram.cdr', `<div id="bd"></div><p class="small muted">The 2004|37 Functional Diagram (CorelDRAW 10, converted with Inkscape for this simulator) is titled “POD17 AES RECLOCKING DA WITH SRC & AUDIO GAIN CONTROL”. Part numbers and pins are added from the Issue 1 netlist and the BOM.</p>`)}</div>
    <div>${card('Block', `<div id="bdinfo"></div>`)}${card('Signal flow in one sentence', `<p>The PIC reads the operator; the reference CS8420 decides whether the main CS8420 converts the rate; the main CS8420 hands every sample to the SHARC and takes it back with the gain applied; one driver copies it to six outputs and the monitor jack.</p>`)}${card('Live', `<div id="live"></div>`)}</div></div>`;
  const draw = ()=>{
    const ctr = b=>[b.x+b.w/2, b.y+b.h/2];
    let s = `<svg viewBox="0 0 700 490" style="width:100%"><defs><marker id="p17ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a], B_=BLOCKS[b]; let [x1,y1]=ctr(A_), [x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x, dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot = sel===a||sel===b;
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#p17ar)"/>`;
      if (l) s += `<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s += `<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
        <text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+10}" y="${b.y+38+i*15}" font-size="11" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML = s + '</svg>';
    m.querySelectorAll('[data-b]').forEach(g=> g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b = BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML = `<h3>${b.t}</h3><p>${b.d}</p>`;
    const o = outAt(SIM.t); m.querySelector('#live').innerHTML = `<p class="small mono">CH1: ${o.c.txoff?'TXOFF':'TX'} ${o.c.src?'SRC':'BYPASS'} · out ${fmtFs(o.fsOut)} · SHARC ${o.sh.kind} · gain A ${fmtDb(o.g.gL)} B ${fmtDb(o.g.gR)} dB</p>`;
  };
  draw(); SIM.on('time', ()=>{ const el=m.querySelector('#live'); if (el){ const o=outAt(SIM.t); el.innerHTML=`<p class="small mono">CH1: ${o.c.txoff?'TXOFF':'TX'} ${o.c.src?'SRC':'BYPASS'} · out ${fmtFs(o.fsOut)} · SHARC ${o.sh.kind} · gain A ${fmtDb(o.g.gL)} B ${fmtDb(o.g.gR)} dB</p>`; } });
}

/* ---------------- schematics (redrawn from net names) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/>
   <text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18; const [pin,net]=p; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
const SHEETS = [
  { name:'1 · PIC16C73A', note:'Pin numbers from the Issue 1 netlist (PCB/OBSOLETE/POD17-1.net, DIP-28) and the #defines in pod17.asm. R1–R8, R11–R14, R22, R31, R37, R41, R44 are the series / pull resistors seen in the netlist.', svg:()=>
    chip(330,50,200,'U1 PIC16C73A',[
      ['2 RA0/AN0','CH B trim (code2)'],['3 RA1/AN1','CH A trim (code1)'],['4 RA2/AN2','J1-2 remote L (code3)'],['5 RA3','J1-7 INPUT_2 remote'],['6 RA4','J1-5 INPUT_1 volume'],['7 RA5/AN4','J1-1 remote R (code4)'],
      ['9/10 OSC','X2 4.9152 MHz'],['1 MCLR','R1/C1 reset'],
    ],[
      ['11 RC0','CS3 → SHARC'],['12 RC1','CS2 → U5 CH2'],['13 RC2','CS1 → U4 CH1'],['14 RC3','SCK'],['15 RC4','SDI'],['16 RC5','SDO'],['17 RC6','RESET (all)'],['18 RC7','LED_0 AUDIO'],
      ['21 RB0','LED_2 ERROR'],['22 RB1','LED_3 REMOTE'],['23 RB2','LED_1 SRC'],['24 RB3','JMP H3 (20/24)'],['25 RB4','SW2 R/−R'],['26 RB5','SW1 MONO'],['27 RB6','OUT_2 lock tally'],['28 RB7','OUT_1 error tally'],
    ],'MPASM · _HS_OSC _WDT_ON _BODEN_ON _PWRTE_ON') },
  { name:'2 · CS8420 ×2', note:'U4 = “CH1”/main (CS1), U5 = “CH2”/reference (CS2). Pins from the netlist; register meanings from the comments in preset_chips, set_bypass_mode and set_SRC_mode.', svg:()=>
    chip(150,50,170,'U4 CS8420 (CH1)',[['4/5 RXP/RXN','U11 ← T1 INPUT'],['2 CS','CS1 (RC2)'],['27 SDA/CDOUT','SDO bus'],['1 CDIN','SDI bus'],['28 SCL/CCLK','SCK'],['9 RST','RESET']],[['14 SDIN','SDIN ← SHARC'],['18 SDOUT','SDOUT → SHARC'],['12/17 ILRCK','ILRCLK'],['13/16 ISCLK','ISCLK'],['21 OMCK','← U5-10 RMCK'],['26 TXP','R40 → EL2099']],'main: rx · SRC · tx')
    + chip(560,50,170,'U5 CS8420 (CH2)',[['4/5 RXP/RXN','U10 ← T2 REF'],['2 CS','CS2 (RC1)'],['27/1/28','SPI bus'],['9 RST','RESET']],[['10 RMCK','→ U4-21 OMCK'],['6','R18/C21/C22 (PLL filter)']],'reference receiver')
    + `<text x="40" y="380" font-size="11.5" fill="var(--ink)" font-family="var(--mono)">CH1 reg3 BYPASS = x0001101 · SRC = x0001001 · bit 6 = TXOFF (mute)</text><text x="40" y="398" font-size="11.5" fill="var(--ink)" font-family="var(--mono)">CH1 reg4 BYPASS = xx001001 · SRC = xx000001 (output time base: recovered clock vs OMCK)</text>
       <text x="40" y="416" font-size="11.5" fill="var(--ink)" font-family="var(--mono)">CH2 reg3 = 0x01 · reg4 = 0x49 · reg6 = 0x88 (serial out master, 24-bit right-justified)</text>` },
  { name:'3 · SHARC + boot PROM', note:'U3 ADSP-21061 (MQFP-240) and U6 27C512. Address/data pins from the netlist; SPORT use from pod17core.asm (SPORT0 multichannel, 2 slots, DMA; SPORT1 32-bit control word).', svg:()=>
    chip(320,40,210,'U3 ADSP-21061',[['80','SDIN → U4-14'],['83','SDOUT ← U4-18'],['81/84','ISCLK'],['85','ILRCLK'],['72','SDI → PIC RC4'],['75','SDO ← PIC RC5'],['73/76','SCK'],['74/77','CS3 ← PIC RC0'],['234','RESET']],[['13…33 ADDR0–15','U6 A0–A15'],['149…158 DATA','U6 D0–D7'],['FLAG1/2/3','scope test points (FLG_OUTPUT)'],['CLKIN','24.576 MHz? '+'(inferred)']],'VisualDSP · lib060 · 060_prom loader')
    + chip(660,330,120,'U6 27C512',[['A0–A15',''],['D0–D7','']],[],'64 KB boot PROM')
    + `<text x="40" y="430" font-size="11" fill="var(--ink2)">Pin numbers are the MQFP-240 pins in the netlist; which SPORT pin each one is (SPORT0 = audio, SPORT1 = PIC) is inferred from the net names.</text>` },
  { name:'4 · Outputs and monitor', note:'U8 EL2099 drives T3–T8 through R46, R47, R26, R28, R34, R32 (net NET00118), and the monitor transformer T9 through R30 → MONITOR TRS pins. Header H1/H2 (1×12) carry the outputs to the rear connectors.', svg:()=>{
    let s = chip(120,150,130,'U8 EL2099',[['4 IN','R40 ← U4-26 TXP'],['5','R38 (DNI) / R29']],[['2 OUT','NET00118 bus']],'video amp, ±5 V');
    const rs=['R46','R47','R26','R28','R34','R32','R30']; const ts=['T3','T4','T5','T6','T7','T8','T9'];
    for (let k=0;k<7;k++){ const y=60+k*52; s += `<line x1="430" y1="172" x2="470" y2="${y}" stroke="var(--ink)"/><rect x="470" y="${y-7}" width="40" height="14" fill="none" stroke="var(--ink)"/><text x="490" y="${y-11}" font-size="10" text-anchor="middle" fill="var(--ink2)">${rs[k]}</text>
      <path d="M510 ${y} h20" stroke="var(--ink)"/><path d="M530 ${y-12} q8 6 0 12 q8 6 0 12" fill="none" stroke="var(--ink)"/><path d="M548 ${y-12} q-8 6 0 12 q-8 6 0 12" fill="none" stroke="var(--ink)"/><text x="539" y="${y-16}" font-size="10" text-anchor="middle" fill="var(--ink2)">${ts[k]}</text>
      <line x1="548" y1="${y}" x2="600" y2="${y}" stroke="var(--ink)"/><text x="606" y="${y+4}" font-size="11.5" fill="var(--accent2)">${k<6?'OUT '+(k+1)+' (H1/H2)':'DIGITAL MONITOR TRS'}</text>`; }
    return s + `<line x1="284" y1="172" x2="430" y2="172" stroke="var(--ink)"/><text x="290" y="166" font-size="10.5" fill="var(--accent2)">NET00118</text>`; } },
  { name:'5 · CONTROL connector', note:'DE-9S J1 on the Issue 1 board. Pins 6, 8 and 9 are not in the nets traced here; +5 V and ground for the remote pot are inferred.', svg:()=>{
    const pins=[['1','remote R wiper → R4 → RA5/AN4 (code4)'],['2','remote L wiper → R3 → RA2/AN2 (code3)'],['3','Q1 tally output'],['4','Q2 tally output'],['5','R11/R13 → RA4 INPUT_1: ground = VOLUME'],['6','R12 (remote pot supply? inferred)'],['7','R14/R21 → RA3 INPUT_2: ground = REMOTE'],['8','(not traced)'],['9','(not traced)']];
    let s = `<rect x="120" y="60" width="120" height="250" rx="16" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="180" y="50" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">J1 DE-9S “CONTROL”</text>`;
    pins.forEach(([n,l],i)=>{ const y=80+i*26; s+=`<circle cx="220" cy="${y}" r="6" fill="none" stroke="var(--ink)"/><text x="200" y="${y+4}" text-anchor="end" font-size="11" fill="var(--ink)">${n}</text><line x1="226" y1="${y}" x2="300" y2="${y}" stroke="var(--ink)"/><text x="306" y="${y+4}" font-size="11.5" fill="var(--accent2)">${l}</text>`; });
    return s + `<text x="120" y="360" font-size="11" fill="var(--ink2)">POD17R: the REMOTE FADER box (SILK/REMOTE FADER.cdr) has one fader and LOCK / NO LOCK LEDs; one fader driving both wipers is ${'inferred'}.</text>`; } },
];
function viewSchem(m){
  window.__pod17Active = false; tutMode = false;
  let i = 0;
  m.innerHTML = card('Schematic set (redrawn from net and pin names — not the P-CAD drawings)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The original schematic is in P-CAD binary form (<span class="mono">PCB/OBSOLETE/POD17-1.sch</span>, Issue 1); the Issue 2 board <span class="mono">POD17-1ISS2.pcb</span> (P-CAD ASCII, last saved 22 Jan 2008|41) carries the same parts per its BOM. These sheets are rebuilt from the Issue 1 netlist and the firmware's pin names. Blue labels are nets.</p>`);
  const draw = ()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=> b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 900 470" style="width:100%;min-width:680px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="888" height="458" fill="none" stroke="var(--line)"/><text x="884" y="456" text-anchor="end" font-size="10" fill="var(--ink2)">POD17 · sheet ${i+1}/${SHEETS.length} · redrawn ${Y(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent = SHEETS[i].note;
  };
  draw();
}

/* ---------------- software diagrams ---------------- */
function viewSoft(m){
  window.__pod17Active = true; tutMode = false;
  m.innerHTML = `<div class="grid2">
    ${card('PIC main loop (pod17.asm) — the call running at the playhead is lit', `<div id="flow"></div>`)}
    <div>${card('Mode state machine (switch_8420_modes + AES_output_control)', `<div id="fsm"></div>`)}
      ${card('Debounce (debounce) — live', `<div id="deb"></div>`)}</div></div>
  <div class="grid2">
    ${card('PIC → SHARC protocol: 4 bytes per pass, one nibble of a 16-nibble frame', `<div id="proto"></div>`)}
    ${card('SHARC (pod17core.asm): start-up, interrupts, sample_proc', `<div id="sharc"></div>`)}
  </div>
  <div class="grid2">
    ${card('Gain tables: D8205_trm.dat and D8205_vol.dat (256 entries each)', `<canvas id="gt"></canvas><p class="small muted">Dots = the codes the SHARC holds now. TRIM is linear in dB; VOLUME is linear in amplitude, so 0 dB sits at code 64.</p>`)}
    ${card('Pot path: ADC → Average → Hysterisis (code1, CH A)', `<canvas id="pot"></canvas><p class="small muted" id="potn"></p>`)}
  </div>
  ${card('How the buttons did things — control → code → signal', `<div id="btn"></div>`)}`;
  const draw = ()=>{
    const t = SIM.t, st = stepAt(t), R = simulate(), P = st.pass && st.pass.kind==='loop' ? st.pass : null;
    // flow
    let s = `<svg viewBox="0 0 540 ${STEPS.length*42+70}" style="width:100%"><defs><marker id="p17a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <rect x="150" y="6" width="240" height="24" rx="12" fill="var(--chip)" stroke="var(--line)"/><text x="270" y="22" text-anchor="middle" font-size="11.5" fill="var(--ink)">WHOLE_RESET: call init → main</text>`;
    STEPS.forEach((p,j)=>{ const y=40+j*42, on = st.step===j; const ms = P && P.steps[j] ? ((P.steps[j].t1-P.steps[j].t0)*1000).toFixed(2)+' ms' : '';
      s += `<line x1="270" y1="${y-10}" x2="270" y2="${y}" stroke="var(--ink2)" marker-end="url(#p17a2)"/><rect x="30" y="${y}" width="480" height="32" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
        <text x="40" y="${y+14}" font-size="11.5" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${p[0]}</text><text x="500" y="${y+14}" font-size="10" text-anchor="end" fill="${on?'#fff':'var(--ink2)'}">${ms}</text><text x="40" y="${y+27}" font-size="9.8" fill="${on?'#eef':'var(--ink2)'}">${p[1]}</text>`; });
    const yb = 40+STEPS.length*42; s += `<path d="M510 ${yb-26} h18 V36 h-18" fill="none" stroke="var(--ink2)" marker-end="url(#p17a2)"/><text x="30" y="${yb+18}" font-size="11" fill="var(--ink2)">goto main · pass ${P?'#'+P.i+' = '+((P.t1-P.t0)*1000).toFixed(2)+' ms':'—'} · no interrupts (vector 4h = RETFIE)</text></svg>`;
    m.querySelector('#flow').innerHTML = s;
    // fsm
    const c = commitAt(t), mode = !phys(t).power ? 'OFF' : c.txoff ? (P && !(P.MODE1&128) ? 'UNLOCKED' : 'MUTED') : c.src ? 'SRC' : 'BYPASS';
    const node=(x,y,l,on,sub)=>`<g><circle cx="${x}" cy="${y}" r="44" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="${x}" y="${y-2}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${l}</text><text x="${x}" y="${y+13}" text-anchor="middle" font-size="8.5" fill="${on?'#eef':'var(--ink2)'}">${sub}</text></g>`;
    m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 560 235" style="width:100%">
      ${node(60,110,'UNLOCKED',mode==='UNLOCKED','TXOFF each pass')}${node(230,52,'MUTED',mode==='MUTED','21 passes')}${node(410,52,'BYPASS',mode==='BYPASS','rx→SHARC→tx')}${node(410,178,'SRC',mode==='SRC','rx→SRC→SHARC')}
      <path d="M100 90 Q150 50 194 50" fill="none" stroke="var(--ink2)"/><text x="120" y="48" font-size="9.5" fill="var(--ink2)">CH1 locked</text>
      <path d="M266 50 H364" fill="none" stroke="var(--ink2)"/><text x="315" y="42" font-size="9.5" text-anchor="middle" fill="var(--ink2)">cnt = 0 → TX on,</text><text x="315" y="74" font-size="9.5" text-anchor="middle" fill="var(--ink2)">SHARC resync</text>
      <path d="M400 86 V144" fill="none" stroke="var(--ink2)"/><text x="406" y="120" font-size="9.5" fill="var(--ink2)">CH2 locks → set_SRC_mode + mute</text>
      <path d="M370 160 Q300 130 250 86" fill="none" stroke="var(--ink2)"/><text x="230" y="140" font-size="9.5" fill="var(--ink2)">CH2 lost → set_BYPASS_mode + mute</text>
      <path d="M70 146 Q70 210 360 190" fill="none" stroke="var(--ink2)" stroke-dasharray="4 3"/><text x="90" y="215" font-size="9.5" fill="var(--ink2)">CH1 lost (from any state) → UNLOCKED</text></svg>
      <p class="small muted">All the inputs to this machine are the <b>debounced</b> MODE1 lock bits, so every transition waits 31 passes. Now: <b>${mode}</b>.</p>`;
    // debounce
    m.querySelector('#deb').innerHTML = P ? `<table class="kv"><tr><th>input_reg1 (this pass)</th><td class="mono">${P.inReg.toString(2).padStart(8,'0')}b</td></tr><tr><th>MODE1</th><td class="mono">${P.MODE1.toString(2).padStart(8,'0')}b</td></tr>
      <tr><th>DEBOUNCE_ON / bcount</th><td class="mono">${P.deb.on? 'waiting, bcount = '+P.deb.bcount : 'idle'}</td></tr></table><p class="small muted">Bits: 7 CH1 lock · 6 CH2 lock · 4 REMOTE (RA3) · 3 VOLUME (RA4) · 2 SW2 · 1 SW1 · 0 JMP. Lock bits share this debounce with the buttons.</p>` : '<p class="muted">Not in a main-loop pass at the playhead.</p>';
    // protocol
    const nb = P ? P.nib : null;
    const names = ['FRAME hi','FRAME lo','reserved','reserved','MODE1 hi','MODE1 lo','MODE2 hi','MODE2 lo','code1 hi','code1 lo','code2 hi','code2 lo','code3 hi','code3 lo','code4 hi','code4 lo'];
    m.querySelector('#proto').innerHTML = `<svg viewBox="0 0 560 110" style="width:100%">${names.map((n,i)=>`<rect x="${6+i*34.5}" y="10" width="32" height="40" rx="4" fill="${nb&&nb.a===i?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${22+i*34.5}" y="27" text-anchor="middle" font-size="11" font-family="var(--mono)" fill="${nb&&nb.a===i?'#fff':'var(--ink)'}">${i.toString(16).toUpperCase()}</text><text x="${22+i*34.5}" y="43" text-anchor="middle" font-size="7.5" fill="${nb&&nb.a===i?'#fff':'var(--ink2)'}">${n.split(' ')[0].slice(0,6)}</text>`).join('')}
      <text x="6" y="72" font-size="11" font-family="var(--mono)" fill="var(--ink)">This pass: ${P? P.link.bytes.map(hex2).join(' ')+'  (E4 · R · 00 · aaaadddd)' : '—'}</text>
      <text x="6" y="92" font-size="10.5" fill="var(--ink2)">SSP master → SHARC SPORT1; CS_SHARC low only for byte 0 (frame sync); SHARC echoes E4.</text></svg>
      <table class="kv"><tr><th>SHARC ctrl_proc</th><td class="small">Accepts nibble n only if n = CTRL_decod_stp, ORs it into CTRL_decod_data1/2; on nibble F extracts received_FRAME_CODE, ji_input (= MODE1:MODE2) and code1–4. A nibble out of order resets the step to 0 but leaves the half-built words ORed (see Findings).</td></tr>
      <tr><th>Frame the SHARC holds</th><td class="mono">ji_input 0x${frameAt(t).ji.toString(16).toUpperCase().padStart(4,'0')} · codes ${frameAt(t).codes.join(' · ')} (from ${frameAt(t).init?'before t = 0':'pass #'+frameAt(t).pass})</td></tr></table>`;
    // sharc
    const sh = sharcAt(R.sharc, t);
    const box=(x,y,w,l,on,sub)=>`<rect x="${x}" y="${y}" width="${w}" height="40" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+8}" y="${y+16}" font-size="11" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${l}</text><text x="${x+8}" y="${y+31}" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${sub}</text>`;
    m.querySelector('#sharc').innerHTML = `<svg viewBox="0 0 560 250" style="width:100%">
      ${box(6,6,130,'start',sh.kind==='boot','flags, SYSCON, tables')}${box(146,6,130,'wait_for_FRAMECODE',sh.kind==='boot','255 × E4 from the PIC')}${box(286,6,130,'beg_synhron',sh.kind==='resync'||sh.kind==='boot','zero DMA, delay ≈'+(C.SH_DELAY*1000).toFixed(0)+' ms')}${box(426,6,128,'_synhron_SPORT0',false,'short words, MC + DMA')}
      ${box(110,70,340,'main: ctrl_proc · jumpers_analize · sample_proc',sh.kind==='run','when sampl_gn is set: once per sample; FLAG3 low while busy')}
      ${box(6,140,265,'SPORT0_r_asserted (each sample)',sh.kind==='run','bits 31:23 not sign-extended → resync')}
      ${box(285,140,269,'SPORT1_r_asserted (each PIC pass)',false,'bit 16 → synhron_error_flag, else rx_buf_CTRL')}
      <text x="6" y="210" font-size="11" fill="var(--ink)" font-family="var(--mono)">sample_proc: f3 = −f3 (inv) → f2 = f3 = (f2+f3)/2 (mono) → × f8·f10 / f9·f11 → fix</text>
      <text x="6" y="230" font-size="10.5" fill="var(--ink2)">Now: ${sh.kind==='run'? SEL_NAMES[outAt(t).g.sel] : 'not processing samples ('+sh.kind+')'}</text></svg>`;
    // gain tables
    const fr = frameAt(t), g = gains(fr.ji, fr.codes);
    { const {c:cx,w} = SIM.canvas(m.querySelector('#gt'), 200); const x0=40, pw=w-50, y0=10, ph=160; const Ydb = d=> y0 + (16-d)/(16+40)*ph;
      cx.strokeStyle=SIM.css('--grid'); cx.fillStyle=SIM.css('--ink2'); cx.font='10px '+SIM.css('--mono');
      [12,0,-15,-30].forEach(d=>{ cx.beginPath(); cx.moveTo(x0,Ydb(d)); cx.lineTo(x0+pw,Ydb(d)); cx.stroke(); cx.fillText((d>0?'+':'')+d, 4, Ydb(d)+3); });
      [[TRM,'--accent2','TRIM'],[VOL,'--accent','VOLUME']].forEach(([T,col,n],q)=>{ cx.strokeStyle=SIM.css(col); cx.lineWidth=2; cx.beginPath(); T.forEach((v,i)=>{ const d=Math.max(-40,db(v)); const x=x0+i/255*pw; i?cx.lineTo(x,Ydb(d)):cx.moveTo(x,Ydb(d)); }); cx.stroke(); cx.fillStyle=SIM.css(col); cx.fillText(n, x0+(q?0.55:0.8)*pw, Ydb(db(T[Math.round((q?0.55:0.8)*255)]))+(q?-8:16)); });
      const sel=g.sel; const T0 = (sel===1)? VOL : TRM;
      [[fr.codes[0],T0,'A'],[fr.codes[1],T0,'B']].concat(sel&2? [[fr.codes[2],(sel&1)?VOL:TRM,'rA'],[fr.codes[3],(sel&1)?VOL:TRM,'rB']]:[]).forEach(([cd,T,l])=>{ const x=x0+cd/255*pw, y=Ydb(Math.max(-40,db(T[cd]))); cx.fillStyle=SIM.css('--play'); cx.beginPath(); cx.arc(x,y,4,0,7); cx.fill(); cx.fillStyle=SIM.css('--ink'); cx.fillText(l+' '+cd, x+5, y-5); });
      cx.fillStyle=SIM.css('--ink2'); cx.fillText('code 0 … 255 →', x0, y0+ph+20); }
    // pot path
    { const {c:cx,w} = SIM.canvas(m.querySelector('#pot'), 150); const ps = R.passes.filter(p=>p.kind==='loop' && p.adc && (p.adc.start===0 || p.adc.proc===0));
      const x0=40, pw=w-50; const Xt=tt=>x0+tt*pw; const codes = ps.map(p=>p.adc.start===0? p.adc.raw : p.adc.code); const lo=Math.min(...codes,255)-3, hi=Math.max(...codes,0)+3; const Yc=v=>10+(hi-v)/(hi-lo||1)*110;
      cx.font='10px '+SIM.css('--mono'); cx.fillStyle=SIM.css('--ink2'); cx.fillText(hi, 4, 14); cx.fillText(lo, 4, 122);
      ps.forEach(p=>{ if (p.adc.start===0){ cx.fillStyle=SIM.css('--ink2'); cx.fillRect(Xt(p.t0)-1.5, Yc(p.adc.raw)-1.5, 3, 3); } });
      cx.strokeStyle=SIM.css('--accent'); cx.lineWidth=2; cx.beginPath(); let first=true; ps.forEach(p=>{ if (p.adc.proc===0){ const x=Xt(p.t0), y=Yc(p.adc.code); if(first){cx.moveTo(x,y);first=false;} else cx.lineTo(x,y); } }); cx.stroke();
      const px = Xt(t); cx.strokeStyle=SIM.css('--play'); cx.beginPath(); cx.moveTo(px,6); cx.lineTo(px,126); cx.stroke();
      cx.fillStyle=SIM.css('--ink'); cx.fillText('grey = raw ADRES (±1 LSB noise, inferred) · green = code1', x0, 142);
      const last = ps.filter(p=>p.adc.proc===0 && p.t0<=t).pop(); m.querySelector('#potn').innerHTML = last? `Hysteresis for code1 is <b>${last.hyst[0]?'locked':'unlocked'}</b> at the playhead. After any move it needs 256 steady readings (≈ ${(256*12*R.avgPass).toFixed(1)} s) to lock again, so inside one second a touched pot always passes its ±1 LSB noise through (≈ ±0.12 dB in TRIM).` : ''; }
    // buttons
    m.querySelector('#btn').innerHTML = `<table class="kv"><tr><th>Operator does</th><th>Firmware path</th><th>What changes in the signal</th></tr>
      <tr><td>STEREO/MONO</td><td class="mono small">SW1 → jmp_input bit 1 → debounce → MODE1,1 → nibbles 4/5 → ctrl_proc → ji_input bit 9 → sample_proc</td><td class="small">f2 = f3 = (L+R)/2 from the next sample</td></tr>
      <tr><td>R/−R</td><td class="mono small">SW2 → bit 2 → … → ji_input bit 10</td><td class="small">f3 × −1.0, before the mono sum</td></tr>
      <tr><td>CH A / CH B</td><td class="mono small">AN1/AN0 → AtoD → Average → Hysterisis → code1/code2 → nibbles 8–B</td><td class="small">f8/f9 = trm[code] (or vol[code] in case_1)</td></tr>
      <tr><td>Remote fader</td><td class="mono small">AN2/AN4 → code3/code4 → nibbles C–F; RA3 → MODE1,4</td><td class="small">f10/f11 = table[code]; front pots become trims</td></tr>
      <tr><td>CONTROL pin 5</td><td class="mono small">RA4 (read every 12 passes in sw_3) → MODE1,3</td><td class="small">TRIM ⇄ VOLUME table</td></tr>
      <tr><td>Jumper H3</td><td class="mono small">RB3 → MODE1,0 → MODE_change_analize → set_20bit / set_24bit; SHARC jumpers_analize</td><td class="small">CS8420 serial ports 20/24 bit; SHARC shifts 12/8; channel status byte 2</td></tr>
      <tr><td>Plug / unplug INPUT</td><td class="mono small">CH1 reg 16 bit 4 → MODE1,7 → switch_8420_modes → shut_off_AES_output_CH1</td><td class="small">TXOFF; back on 21 passes after relock + SHARC resync</td></tr>
      <tr><td>Plug / unplug REFERENCE</td><td class="mono small">CH2 reg 16 bit 4 → MODE1,6 → set_SRC_mode / set_BYPASS_mode</td><td class="small">reg3/reg4 of CH1; output rate; channel-status fs</td></tr>
      <tr><td>Input errors</td><td class="mono small">CH1 reg 16 bits 2/1 → FLG_ERROR_CH1 (no debounce)</td><td class="small">ERROR LED + OUT_1 tally only</td></tr></table>
      <p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none yet — use the Simulator or Tutorial tab'}</b></p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewFindings(m){
  window.__pod17Active = false; tutMode = false;
  const T = simulate().avgPass;
  m.innerHTML = card('What the POD17 firmware is up to — findings from the source', `<ol>
    <li><b>Artwork 2026|59: front/rear panels now from ${SIM.src(ART_CDR, ART_CDR.split('/').pop())}</b> (file 2015-10-02, sheet dated Jun.25/14: front GREEN, front WHITE, rear 75 and rear 110 plates on one sheet). Its cut-out layer confirms what the plugin had taken from the mechanical drawings: real LED holes at SRC and CH A although the legend has no crosshair for either, the 75 Ω rear's D-cut BNC holes, single-D cord bushing and double-D fuse holder, and a PEM-stud hole printed over the “115 VAC, 1/2 A.S.B.” legend. The 110 Ω rear plate has an unlabelled hole at its top right corner (as on POD19). The older PNG silks are on the toggle under the rear panel.</li>
    <li><b>The SHARC handshake is switched off, and its delays run every pass.</b> In <span class="mono">SHARC_link_control</span> the frame-code check and the timeout that would jump to <span class="mono">WHOLE_RESET</span> are all commented out. What is left (clear the LEDs, <span class="mono">CALL delay</span> three times, clear <span class="mono">SHARC_IN_INIT</span>, <span class="mono">flush8420reg</span>) was meant to run once, when the SHARC answered. It now runs on every pass: 3.75 ms of the ≈ ${(T*1000).toFixed(1)} ms loop is spent waiting, and the PIC never notices if the SHARC is dead.</li>
    <li><b>The front LEDs are pulsed at ≈ ${(1/T).toFixed(0)} Hz.</b> <span class="mono">SHARC_link_control</span> clears LED_0–LED_3 at the start of every pass; <span class="mono">LED_processing</span> sets them again 9 calls later. They are only lit for ≈ ${(ledDuty()*100).toFixed(0)} % of the time (set the LED view to “instantaneous” in the Simulator). The power LED, wired straight to the supply, is the only steady one.</li>
    <li><b>Timing comments from a 4 MHz design.</b> <span class="mono">delay</span> says “Provide a 1.54mS delay”: 1535 cycles is 1.54 ms at 4 MHz but 1.25 ms with the POD17's 4.9152 MHz crystal (BOM X2). The hysteresis comment says lock-up takes “about 4 second”; with this loop it is 256 readings × 12 passes ≈ ${(256*12*T).toFixed(0)} s.</li>
    <li><b>MONO + R/−R gives L − R, not an inverted mono.</b> POD17MAN.doc: “In mono mode, the ability to invert the audio signal is possible with the R/-R button.” <span class="mono">sample_proc</span> inverts f3 (right) <i>before</i> the mono sum, so the result is (L − R)/2: a mono-compatible programme cancels to silence (Tutorial step 4).</li>
    <li><b>One bad sample when a switch changes.</b> <span class="mono">sample_proc</span> tests r4 for the invert and mono bits but never loads it. It works because <span class="mono">jumpers_analize</span> returns early with r4 = ji_input_old = ji_input. On the one call where ji_input has changed, it returns with r4 = shift_right_num (−8 = 0xFFFFFFF8, bits 9 and 10 set), so that single sample is processed as mono + invert.</li>
    <li><b>Lock changes are debounced like push buttons.</b> The CS8420 lock bits go into <span class="mono">input_reg1</span> with the switches, so AUDIO, SRC and the SRC/BYPASS switch-over all wait 31 passes (≈ ${(31*T*1000).toFixed(0)} ms). ERROR is read straight from register 16 and is not debounced.</li>
    <li><b>Every mode change costs about a second of silence.</b> After the 21-pass mute, <span class="mono">AES_output_control</span> sets <span class="mono">SHARC_RESYNHRON_FLAG</span>; the SHARC then runs <span class="mono">beg_synhron</span>, which calls <span class="mono">delay</span> with <span class="mono">DELAY_POWER_ON</span> defined: 0x1FFFFF turns of a 10-cycle loop, ≈ ${(C.SH_DELAY*1000).toFixed(0)} ms at 24.576 MHz (${inf}). The carrier stays up, the audio is zeros.</li>
    <li><b>Channel status in SRC mode only half follows the new rate.</b> <span class="mono">chan_status_insert_fs_CH1</span> copies two fs bits of byte 0, and only for professional streams. A 96 kHz or 88.2 kHz reference has no code there (“not indicated”), byte 4 is passed through from the input untouched, and consumer-format inputs keep their old byte-3 rate. A 96 kHz input converted to 48 kHz therefore still says 96 kHz in byte 4.</li>
    <li><b>The 20-bit jumper announces 23 bits.</b> <span class="mono">chan_status_insert_24_20</span> writes byte 2 = 0x30 for 20-bit and 0x34 for 24-bit. Read against the AES3 table (CS8420 buffer MSB-first, ${inf}), 0x34 is “max 24, 24 bits” but 0x30 is “max 24, 23 bits”; 20 bits would need 0x24.</li>
    <li><b><span class="mono">set_CH1_dither_on</span> turns dither off.</b> It clears bit 3 and then falls straight into <span class="mono">set_CH1_dither_off</span>, which sets it again: there is no <span class="mono">return</span> between them. Neither is called.</li>
    <li><b>Names that disagree.</b> The header says LED_0 = “Lock to CH2 (First input)”; the code drives LED_0 from CH1. <span class="mono">LED_processing</span>'s comment speaks of an “internal 48 kHz mode” on LED2. <span class="mono">REMOTE_ENABLE_XOR</span> is MODE_XOR1 bit 3 while REMOTE_ENABLE is MODE1 bit 4. In <span class="mono">pod17def.h</span> (marked “D8208”) JMP_REMOTE_ENABLE = 11 and JMP_TRIM_VOLUME = 12, the reverse of how <span class="mono">sample_proc</span> actually uses bits 11 and 12. The protocol comment calls byte 3 “PRODUCT_NUMBER”; the PIC sends 0.</li>
    <li><b>Parts from other products.</b> Every SHARC file is headed “D8206 ADSP-21061 Digital audio test tone generator” (Slava Li, 17 Jan 2000); the gain tables are <span class="mono">D8205_vol.dat</span> / <span class="mono">D8205_trm.dat</span>; <span class="mono">pod17def.h</span> defines D8205 and D8206. <span class="mono">pod17tstn.asm</span> (a test-tone generator) is in the folder but not in <span class="mono">pod17.mak</span>.</li>
    <li><b>File dates a year early.</b> The SHARC sources are dated Jan–Mar 1999 on disk, before the “January 17, 2000” in their headers; <span class="mono">POD17.$$$</span> (Mar 1999) differs from <span class="mono">pod17.asm</span> (17 Mar 2000) only in <span class="mono">swm_1</span> (set MODE_XOR1 bits 2 and 3 vs 0xFF). The development PC's clock was probably a year behind (${inf}).</li>
    <li><b>A half-received frame is ORed into the next.</b> <span class="mono">ctrl_proc</span> clears CTRL_decod_data1/2 only after nibble F. If a nibble arrives out of order the step resets to 0 but the bits already ORed in stay, and they are ORed into the next frame's codes.</li>
    <li><b>The volume law is linear.</b> <span class="mono">D8205_vol.dat</span> is code × 0.01555: unity gain at code 64, so three quarters of the pot travel is boost (+12 dB at the top), and the bottom eighth covers −∞ to −12 dB. The trim table is linear in dB (−15 … +14.88 dB) and never quite reaches +15.</li>
    <li><b>The manuals disagree with each other and with the panel.</b> <span class="mono">pod17.pdf</span>: 22–96 kHz, one input; <span class="mono">POD17MAN.doc</span>: 32–96 kHz, “two AES digital audio signals”. The cover art in <span class="mono">POD17MAN.cdr</span> shows a different front panel (STATUS: LOCK / CONFIDENCE / NO LOCK and EQUALIZER ON/OFF), apparently from another reclocking DA.</li>
    <li><b>Rear-panel drawings and photos differ.</b> POD17-75 REAR ISS 1 (drawn May 2000) and its silk show a cord bushing and fuse holder (“115 VAC, 1/2 A.S.B.”); the 2015 photo of a 75 Ω unit has an IEC inlet and the CAUTION block of the 110 Ω silk, which only POD17-110 REAR ISS 2 (“modified to AC connector”, 2008|41) describes. The panel here follows the drawing and silk. <span class="mono">POD17-75 REAR ISS 1 (PANEL) .pdf</span> (trailing space, 2016|49) is the same drawing in portrait. The 75 Ω drawing's note refers to artwork “#PO17-REAR-SILK”.</li>
    <li><b>The silk is missing two drill marks.</b> The front silk has crosshairs for AUDIO, REMOTE, ERROR and CH B but not for SRC (x 4.596) or CH A (x 5.753), which the mechanical drawing has.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>PIC pass time: instruction counts at 4.9152 MHz with ≈ ${C.SPI_BYTE} cycles per SPI byte (SSP at Fosc/4 plus polling) — ${inf}. Channel-status steps are assumed never to wait for the EFTC/DETC interrupts (a block is ≈ 4 ms, shorter than a pass).</li>
    <li>SHARC CLKIN = 24.576 MHz (the BOM's only other clock) and ≈ 10 cycles per delay-loop turn → ≈ ${(C.SH_DELAY*1000).toFixed(0)} ms resync silence; PROM boot ≈ 12 ms — ${inf}.</li>
    <li>CS8420 lock and unlock are instant; with no input the receive-error register reports errors (ERROR on). ±1 LSB ADC noise on the pots — ${inf}.</li>
    <li>REMOTE FADER: one fader drives both remote wipers and its cable grounds DE-9 pin 7; with nothing plugged the remote inputs read 0 — ${inf}. Pin meanings come from the Issue 1 netlist; Issue 2 may differ.</li>
    <li>SRC is modelled as ideal; the CS8420's own group delay and the ratio limit (1:3 … 3:1) only produce a warning.</li></ul>`) + card('Sources', `<ul class="small mono">
    <li>#POD #SERIES/POD17 - #Master/POD17 - #Engineering/Software/pic/pod17.asm, POD17.$$$, POD17.ERR, pod17.pjt</li>
    <li>…/Software/sharc/pod17core.asm, pod17init.asm, pod17def.h, pod17.ldf, pod17.mak, D8205_vol.dat, D8205_trm.dat, pod17tstn.asm</li>
    <li>…/PCB/POD17-1ISS2-PNP.bom, POD17-1ISS2.ECO, POD17-1ISS2.pcb, OBSOLETE/POD17-1.net</li>
    <li>…/MANUAL/pod17.pdf, POD17MAN.doc, POD17MAN.cdr · …/POD17 - Functional Diagram.cdr · …/SILK/REMOTE FADER.cdr</li>
    <li>POD17 - #ARTWORK #DA #2016/POD17-FRONT-SILK (CURVE).pdf, POD17-REAR-SILK(CURVE).pdf, Pics/POD17 Front.jpg, Rear 75.jpg, Rear 110.jpg</li>
    <li>POD17 - #Mechanical #DA #2016/POD17- FRONT ISS 1 (PANEL).pdf, POD17-75 REAR ISS 1 (PANEL).pdf, POD17-110 REAR ISS 2 (PANEL).pdf</li></ul>`);
}

/* ---------------- register plugin ---------------- */
SIM.register({
  footnotes: [
    { text: "The front has LED holes at SRC and CH A, although the legend has no drill crosshair for either.", src: "#POD #SERIES/POD17 - #Master/POD17 - #ARTWORK #DA #2016/POD17-FRONT&REAR-SILK (CURVE).cdr" },
    { text: "On the 75 Ω rear, a PEM-stud hole is printed over the “115 VAC, 1/2 A.S.B.” legend.", src: "#POD #SERIES/POD17 - #Master/POD17 - #ARTWORK #DA #2016/POD17-FRONT&REAR-SILK (CURVE).cdr" },
    { text: "On the 75 Ω rear, the BNC holes are D-cuts, the cord bushing is a single-D hole and the fuse holder a double-D hole.", src: "#POD #SERIES/POD17 - #Master/POD17 - #ARTWORK #DA #2016/POD17-FRONT&REAR-SILK (CURVE).cdr" },
    { text: "The 110 Ω rear plate has an unlabelled round hole at its top right corner, as on POD19.", src: "#POD #SERIES/POD17 - #Master/POD17 - #ARTWORK #DA #2016/POD17-FRONT&REAR-SILK (CURVE).cdr" },
    { text: "One sheet holds four plates: front GREEN, front WHITE, rear 75 and rear 110 (dated Jun.25/14). The separate FRONT-SILK and REAR-SILK CDRs repeat the same art.", src: "#POD #SERIES/POD17 - #Master/POD17 - #ARTWORK #DA #2016/POD17-FRONT&REAR-SILK (CURVE).cdr" },
    { text: "The CDR draws a drill crosshair at every hole on both the green and white plates; the real panels (Pics/ photos) carry no crosshairs, so the simulator shows them faint.", src: "#POD #SERIES/POD17 - #Master/POD17 - #ARTWORK #DA #2016/POD17-FRONT&REAR-SILK (CURVE).cdr" }
  ],
  id:'pod17', name:'POD17 · AES gain-control DA with SRC ('+Y(2000)+')', duration:1,
  product:'POD17', year:2000, family:'POD series',
  folder:'#POD #SERIES/POD17 - #Master',
  summary:'Half-rack 1-in / 6-out AES distribution amplifier that trims or fades the level of the AES stream, sums to mono, inverts the right channel and converts to a reference sample rate. A PIC16C73A polls the panel and drives two CS8420s; an ADSP-21061 SHARC applies the gain sample by sample.',
  highlights:['Real silkscreen front and 75 Ω / 110 Ω rears, all controls live','PIC main loop simulated pass by pass from the crystal and the code','Debounce, ADC averaging and the 16-nibble PIC→SHARC frame on the timeline','SRC/BYPASS switching with mute and SHARC resync','Gain tables, channel status and AES3 bits at the playhead','18 findings, incl. MONO + R/−R = L − R'],
  depth:'Full model',
  stepUnits:[
    {label:'1 PIC pass (avg)', period:()=>simulate().avgPass},
    {label:'1 delay call (1.249 ms)', period:()=>C.DELAY_CYC*C.TCY},
    {label:'1 AES block', period:()=>192/outAt(SIM.t).fsOut},
    {label:'1 AES frame (sample)', period:()=>1/outAt(SIM.t).fsOut},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.25,'250 ms (debounce)'],[0.1,'100 ms'],[0.02,'20 ms (≈ 3 passes)'],[0.0075,'1 pass (7.5 ms)'],[0.004,'1 AES block (4 ms)'],[0.0005,'500 µs'],[1/48000*4,'4 AES frames (83 µs)']],
  defaultZoom:2,
  init(){ invalidate(); },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the POD17', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
