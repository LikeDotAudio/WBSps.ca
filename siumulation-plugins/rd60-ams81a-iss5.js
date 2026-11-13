/* =====================================================================
   RD60 — AMS81A ported to the AMS8E-1 Issue 5 main board (Ward-Beck Systems R&D, 2013|46)
   Plugin for the WBS Device Simulator (../siumulation.html)

   What this models: the R&D port itself, not the finished product (that is ams81.js, the 06VA0002 set).
   The before/after simulator puts the ISS2/3 board (EP1C6 + EPCS1 + four CS8416/AD1895 receive chains)
   next to the ISS5 board (EP4CE40 + M25P16, AES receive and SRC inside the FPGA) and replays the
   engineering steps v100 … V050000 from the RD60 progress logs, with the bugs each step had.
   Sources (paths relative to the archive root):
   - ENGINEERING - 2016 RD FILES/RD60-AMS81AUsingAMS81-iss5PCB/… : README.md; software/AMS81-AEM/altera/
     progress/progress.txt, vcurrent/AMS81.qsf, AMS81.bdf, AMS81.sdc, AMS81.cdf, AMS81.jdi, ams81-ep4ce30.*,
     spicontrol.v, altpll0/1/2.v, AESRXSRC/aes3_2_i2s.v, src_aes_example_top.v; progress/v203Original/*;
     atmel/ams8e-1/vcurrent/v200w.c, v200w.lis, altspi.c/.h, AESAudio.c/.h, common.h,
     ControlDescription_Jan212013.docx, progress/Progress.txt, progress/v104/*; atmel/ams8e-5/04VA0000/*,
     progress/PROGRESS.TXT; Mode6-Version2/C050000/*; AMS81-CAM/…/PROGRESS*.txt; AMS8-1B/…;
     demux3/altera/v301/pod31.bdf, pod31.qsf, v10x_description.txt, *.cdf; ams82/… ; firmwareDebugNotes.xlsx
   - AMS8E - #Master/AMS8E-1 - #Master/AMS8E-1 ISS5 - ALTIUM.csv, AMS8E-1-ISS5-Assy-drawing.pdf,
     AMS8E-1-ISS5-GERBER.zip (Ams8e-1iss5-net.ipc, .GTO, .GM6); AMS8E - #PNP/AMS8E-1 - #PNP #2016/… (ISS2–ISS5)
   - AMS8 #Engineering #TIM/pcb/Ams8e-1/: AMS8E-1ISS2-ASSY.pdf, Ams8e-1iss2/3/4.bom, .pnp, AMS8E-1iss2/3/4.net, AMS8E-1iss4.ECO
   - ENGINEERING - 2016 RD FILES/RD10_cycloneIV/cyiv-51008Programming.pdf, cyc_c51014EPCSDevicesDatasheet.pdf
   - AMS81 - #Master/AMS8 - #Engineering/AMS8 - #Software/… (the master, compared by SHA-256)
   - #DEMUX #SERIES/XXX - DEMUX3 - #Master #OBSOLETE/…/DEMUX-3 - #altera/v301 ; SA-DEMUX4 - #Master/…/Demux3/v301
   Board artwork: assets/rd60-ams81a-iss5-iss2-assy.png and -iss5-assy.png are page 1 of the two real
   assembly drawings, cut to the board outline and scaled to 160 px per inch. Front/rear panel crops reuse
   the AMS8-1A CorelDRAW art: assets/rd60-ams81a-iss5-front.svg, -rear.svg (artwork pass 2026|59; formerly ams81's PNGs).
   Anything not stated in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const INF = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const M = s => `<span class="mono">${s}</span>`;
const card = (t,b,extra) => `<div class="card"${extra||''}><h2>${t}</h2>${b}</div>`;

/* ---------------- constants from the sources ---------------- */
const K = {
  MCU: 4.9152e6,                 // X2 4.9152 MHz (ISS5 BOM); UBRR0L 0x1F → 9600 Bd checks it
  WMS_CYC: 808,                  // wait_ms inner loop from v200w.lis: wdr,subi,sbci,cpi,ldi,cpc,brlt = 8 cycles × 100 + 8
  WUS_CYC: 28,                   // wait_us: 2 × 9 cycles + ~10 (v200w.lis)
  FS: 48000, CELL: 48000*128,    // AES3: 64 bit slots per frame → 128 biphase cells, 6.144 MHz
  F98: 98.304e6,                 // altpll0 (24.576 MHz × 4) / altpll1,2 (12.288 MHz × 8)
  BITS_C4: 9534304,              // cyiv-51008 Table 8-2: EP4CE30 and EP4CE40
  BITS_C1: 1167216,              // EP1C6 — datasheet figure, NOT in the archive (inferred)
  DCLK_C4: 40e6,                 // "40-MHz internal oscillator" (cyiv-51008); 20 MHz is the slow corner
  DCLK_C1: 20e6,                 // Cyclone I AS DCLK — inferred
  EPCS: {EPCS1:1048576, EPCS4:4194304, EPCS16:16777216, 'M25P40':4194304, 'M25P16':16777216},
  MB_PASS: 0.004,                // main-loop pass, inferred in ams81.js from the 80-byte bit-banged chain
  LOCK_COUNTER: 25,              // common.h
};
K.WMS = K.WMS_CYC/K.MCU;         // one "ms" of wait_ms = 164.4 µs
K.WUS = K.WUS_CYC/K.MCU;         // one "µs" of wait_us = 5.7 µs
K.W500 = 500*K.WMS;              // wait_ms(500) = 82.2 ms

/* ---------------- the engineering steps (progress.txt files) ---------------- */
const STEPS = [
  {id:'S0', board:'iss3', date:'2009–2012', fpga:'v203Original (EP1C6Q240C7)', atmel:'v2017 (Ams8E-1 C1.01)', front:'V2200', label:'Before: ISS2/3 board, original AMS81 firmware',
   rx:2, b110:1, varOut:1, dolby:1, m1lock:1, refFall:0, refReset:0, sdiReset:0, m4:1, stuck1:0, refIntBug:0,
   note:'Four CS8416 receivers (U4/U6/U9/U12) and four AD1895 SRCs (U3/U5/U7/U10) do AES receive and rate conversion; the EP1C6 only muxes AES_IN_1..8 to AES8416_1..4 and takes SRCDATA/LRCLK/SCLK back.'},
  {id:'v100', board:'iss5', date:'2013-01-22', fpga:'v100', atmel:'v100', front:'V2200', label:'v100 — pins and clocks reassigned',
   rx:0, b110:0, varOut:0, dolby:0, m1lock:0, refFall:0, refReset:0, sdiReset:0, m4:0, stuck1:0, refIntBug:0,
   note:'"Modified all pin assignments and clocks / audio data. Next step is to compile and test it." Atmel v100 removes the CS8416 receive code and adds the addressed-register SPI (altspi.c).'},
  {id:'v101', board:'iss5', date:'2013-01-24', fpga:'v101', atmel:'v100', front:'V2200', label:'v101 — AES RX, SRC and I2S→AES3 cores integrated',
   rx:1, b110:0, varOut:0, dolby:0, m1lock:0, refFall:0, refReset:0, sdiReset:0, m4:0, stuck1:0, refIntBug:0,
   note:'"No lrclk coming out of my SRC core. Received audio is noisy."'},
  {id:'v102', board:'iss5', date:'2013-01-25', fpga:'v102', atmel:'v100', front:'V2200', label:'v102 — audio clean, meters correct',
   rx:2, b110:0, varOut:0, dolby:0, m1lock:0, refFall:0, refReset:0, sdiReset:0, m4:0, stuck1:0, refIntBug:0,
   note:'"110ohm and 75ohm inputs are not switchable currently. At the moment only input H9 works." The .cdf switches from EPCS1 to EPCS16 at this version.'},
  {id:'v103', board:'iss5', date:'2013-01-29', fpga:'v103', atmel:'v100', front:'V2200', label:'v103 — 75 Ω / 110 Ω switchable (ALT_INBUF)',
   rx:2, b110:1, varOut:0, dolby:0, m1lock:0, refFall:0, refReset:0, sdiReset:0, m4:0, stuck1:0, refIntBug:0,
   note:'"Inputs 75ohm and 110ohm now switchable and audio being received cleanly by adding input buffers." Four ALT_INBUF (inst84–87) appear in AMS81.bdf.'},
  {id:'v105', board:'iss5', date:'2013-01-30', fpga:'v105', atmel:'v100', front:'V2200', label:'v105 — timing constraints, variable AES outputs',
   rx:2, b110:1, varOut:1, dolby:0, m1lock:0, refFall:0, refReset:0, sdiReset:0, m4:0, stuck1:0, refIntBug:0,
   note:'"timing constraints created. all variable outputs working now both 75ohm and 110ohm. next step is to have Dolby working."'},
  {id:'V107', board:'iss5', date:'2013-01-31', fpga:'V107', atmel:'v100', front:'V2200', label:'v106/V107 — bypass switching, RX LRCLK/SCLK out',
   rx:2, b110:1, varOut:1, dolby:0, m1lock:0, refFall:0, refReset:0, sdiReset:0, m4:0, stuck1:0, refIntBug:0,
   note:'"bypass switching enabled in aesrx and src block" (v106); "AESRX LRCLK AND SCLK both provided on output of src rx core" (V107).'},
  {id:'v108', board:'iss5', date:'2013-02-04', fpga:'v108', atmel:'v102', front:'V2200', label:'v108 + Atmel v101/v102 — Dolby card, Mode 1 lock, reference fallback',
   rx:2, b110:1, varOut:1, dolby:1, m1lock:1, refFall:1, refReset:0, sdiReset:0, m4:0, stuck1:0, refIntBug:0,
   note:'FPGA: "Dolby audio rx through dolby card ok". Atmel v101: cs8416_reset re-enabled to cure "No Lock" in Mode 1; v102: automatic fallback to the internal reference. Still wrong: Mode 4 meters and distorted AES outputs.'},
  {id:'v109', board:'iss5', date:'2013-02-05', fpga:'v109', atmel:'v102', front:'v100', label:'v109 + front v100 — Mode 4 fixed',
   rx:2, b110:1, varOut:1, dolby:1, m1lock:1, refFall:1, refReset:0, sdiReset:0, m4:1, stuck1:0, refIntBug:0,
   note:'"MODE4 audio displaying correctly on meters and aes outputs are correct." Front v100 (Feb 6) fixes the Mode 4 LED selector, a bug "which existed in the previous ams81 versions that have already gone out to customers". The v109 AMS81.bdf is byte-identical to the final one.'},
  {id:'v103v1', board:'iss5', date:'2013-02-11', fpga:'v109', atmel:'v103v1', front:'v100', label:'Atmel v103v1 — Dolby reset on reference loss',
   rx:2, b110:1, varOut:1, dolby:1, m1lock:1, refFall:1, refReset:1, sdiReset:0, m4:1, stuck1:0, refIntBug:1,
   note:'Bob: with Ref = 75 Ω in Mode 1/4, plugging then pulling the reference left the Dolby-card audio "all distorted". Fix: pulse the CAT552 reset (PORTE bit 2) in RESET_CS8416_REF.'},
  {id:'v104', board:'iss5', date:'2013-03-28', fpga:'v109', atmel:'v104', front:'v101', label:'Atmel v104 + front v101 — Dolby reset on SDI re-lock',
   rx:2, b110:1, varOut:1, dolby:1, m1lock:1, refFall:1, refReset:1, sdiReset:2, m4:1, stuck1:1, refIntBug:1,
   note:'An SDI-lock byte is inserted after \'A\' in the front→main frame; the main board resets the Dolby card on a 0→1 edge. "Bob has discovered that this version of firmware never leaves mode1."'},
  {id:'V050000', board:'iss5', date:'2013-04-01', fpga:'V050000 (= v109 RTL)', atmel:'vcurrent', front:'04VA0000 (shows 06VA0000)', label:'V050000 / vcurrent — RD60 release candidate',
   rx:2, b110:1, varOut:1, dolby:1, m1lock:1, refFall:1, refReset:1, sdiReset:3, m4:1, stuck1:0, refIntBug:1,
   note:'Parser fixed (index2 11→12, voiceover from rx_buffer[18]); a third wait_ms(500) added before the SDI reset. Hash-identical to the AMS81 master FPGA V050000 and front V040000; the main-board code equals master V050000 apart from comments.'},
  {id:'V050001', board:'iss5', date:'2013-06-24', fpga:'V050000', atmel:'V050001 (AMS81 master)', front:'V040002 (06VA0002)', label:'After RD60 — AMS81 master V050001 (06VA0002 set)',
   rx:2, b110:1, varOut:1, dolby:1, m1lock:1, refFall:1, refReset:1, sdiReset:3, m4:1, stuck1:0, refIntBug:0,
   note:'Not in the RD60 folder. Master V050001 adds "&& (reference != INTERNAL)" to RESET_CS8416_REF (June 24, 2013): removing AES1 while monitoring SDI with the internal reference no longer resets the CAT552. This is the build ams81.js models.'},
];
const LAST_RD = 11;

/* ---------------- device state ---------------- */
function fresh(){
  return {
    step: LAST_RD,
    in75:[1,1,0,0], in110:[1,0,0,0],          // signal present on rear inputs 1–4
    bank: 75, inputNo: 1, mode: 2,
    ref: 'INT', refPlug: 'none',               // Setup "Ref" item; what is plugged into REF IN
    dolbyCard: false, demux: true, sdiLock: false,
    dist: null,                                // pending Dolby-path distortion text
    cfgFpga: 'EP4CE40', cfgDev: 'M25P16', dclk: 40, programmed: null,
    scen: 'boot', evSdi: true, ev2: 'ref',
    pick: 'a:U4', blockPick: null, sch: 0,
    tut: 0, tutSeen: {}, hashOpen: false, fpgaClicked: {},
    log: [],
  };
}
let D = fresh();
const ST = () => STEPS[D.step];
const isIss5 = () => ST().board==='iss5';

/* ---------------- derived behaviour ---------------- */
function bankSig(){ return D.bank===110 ? D.in110 : D.in75; }
function coreLock(k){                              // aes3_2_i2s core k (or CS8416 k on ISS3) has lock
  const s=ST(); if (!bankSig()[k]) return false;
  if (s.rx===0) return false;
  if (D.bank===110 && !s.b110) return false;      // v102: "only input H9 works" (bank on H9 = 75 Ω — inferred)
  return true;
}
function lockByte(){ let b=0; for (let k=0;k<4;k++) if (coreLock(k)) b|=1<<k; return b; }   // alteraRead(0x00): 1 = locked
function refLocked(){ return D.ref!=='INT' && D.refPlug===({'75':'75','110':'110'})[D.ref]; }
function refSource(){
  const s=ST();
  if (D.ref==='INT') return 'RMCK6 (internal 12.288 MHz)';
  if (refLocked()) return 'RMCK5 (CS8416 U24 recovered MCLK_REF)';
  return s.refFall ? 'RMCK6 (fell back to internal — v102 code)' : 'RMCK5 selected but unlocked — no fallback before Atmel v102 '+INF;
}
function displayText(){
  const s=ST(), k=D.inputNo-1;
  if (D.mode===1 && !D.dolbyCard) return 'No Card ';
  if (!coreLock(k)) return ' No Lock';
  if (D.mode===1 && !s.m1lock) return ' No Lock';
  return '   PCM  ';
}
function audioState(){
  const s=ST(), k=D.inputNo-1, L=[];
  if (!coreLock(k)) return {q:'silence', cls:'muted', why: !bankSig()[k] ? 'nothing on the selected input' : s.rx===0 ? 'no AES receive cores in the FPGA yet (v100)' : 'the 110 Ω bank is not connected to the receive cores yet (v102)'};
  if (s.rx===1) return {q:'noisy', cls:'bad', why:'v101: no LRCLK out of the SRC core'};
  if (D.mode===4 && !s.m4) return {q:'distorted AES outputs, wrong meter levels', cls:'bad', why:'v108 Mode 4 bug (fixed in v109)'};
  if (D.mode===1 && D.dolbyCard && !s.dolby) return {q:'no audio through the Dolby card', cls:'bad', why:'Dolby path not routed before v108 '+INF};
  if (D.mode===1 && !D.dolbyCard) return {q:'silence', cls:'muted', why:'Mode 1 decodes through the CAT552 card; none fitted'};
  if (D.dist) return {q:'distorted (Dolby card)', cls:'bad', why:D.dist};
  return {q:'clean', cls:'ok', why: s.varOut ? 'AES outputs follow VOLUME (O/P Var)' : 'AES outputs not variable yet (before v105)'};
}

/* ---------------- configuration-device model ---------------- */
const FPGAS = { EP1C6:{bits:K.BITS_C1, dclk:K.DCLK_C1, fam:'Cyclone', pkg:'PQFP-240', inf:true}, EP4CE30:{bits:K.BITS_C4, fam:'Cyclone IV E', pkg:'FBGA-484'}, EP4CE40:{bits:K.BITS_C4, fam:'Cyclone IV E', pkg:'FBGA-484'} };
const DEVS = { EPCS1:'EPCS1 (1 Mbit, SO8) — ISS2/ISS3 U13', M25P40:'M25P40-VMN6P (4 Mbit, SO8, in the "EPCS1" symbol) — ISS4 U13', EPCS16:'EPCS16 (16 Mbit) — what the .cdf/.jdi name', M25P16:'M25P16-VMF6P (16 Mbit, SO16-300 mil) — ISS5 U13' };
function cfgFit(f,d){ const F=FPGAS[f], cap=K.EPCS[d]; const c4 = F.fam==='Cyclone IV E'; const ok = F.bits<=cap && !(c4 && d==='EPCS1');
  return {bits:F.bits, cap, ok, pct:F.bits/cap*100, t:F.bits/(F.dclk || D.dclk*1e6), note: c4 && d==='EPCS1' ? '"EPCS1 does not support Cyclone IV devices because of its insufficient memory capacity." (cyiv-51008, archived in RD10)' : F.bits>cap ? 'bitstream larger than the device' : 'fits'}; }

/* ---------------- boot timing (power-up second) ---------------- */
function boot(){
  const c4 = isIss5();
  const bits = c4 ? K.BITS_C4 : K.BITS_C1, f = c4 ? D.dclk*1e6 : K.DCLK_C1;
  const init = 0.002;                                     // initialization(): port_init … uart init — inferred
  const release = init + 9*K.W500 + 200*K.WMS;             // nine wait_ms(500), then CONFIGURE_ALTERA's wait_ms(100)×2
  const cfgStart = release + 0.00023;                      // tCF2ST1 — inferred from the PS table the handbook points to
  const cfgEnd = cfgStart + bits/f, user = cfgEnd + 0.0003; // init clocks — inferred
  const recallEnd = release + 0.004, rw1 = recallEnd + 0.0025, cs = rw1 + 0.001, shEnd = cs + 10*K.WMS; // inferred durations except RESET_SHARC
  return {init, release, cfgStart, cfgEnd, user, recallEnd, rw1, cs, shEnd, loop: shEnd, bits, f, c4};
}

/* ---------------- run scenario events ---------------- */
function runEvents(){
  const s=ST(), E=[];
  if (D.evSdi){
    const t=0.30, n=s.sdiReset;
    E.push({t, kind:'sdi', freeze: n*K.W500, rst: n? [t+(n-1)*K.W500, t+n*K.W500] : null});
  }
  if (D.ev2==='ref' && D.ref!=='INT'){
    E.push({t:0.70, kind:'refloss', pulse: s.refReset ? [0.70+K.MB_PASS, 0.70+K.MB_PASS+500*K.WUS] : null});
  }
  if (D.ev2==='aes1'){
    const bug = s.refReset && s.refIntBug && D.ref==='INT';
    E.push({t:0.70, kind:'aes1off', pulse: bug ? [0.70+K.MB_PASS, 0.70+K.MB_PASS+500*K.WUS] : null});
    const relock = 0.85 + K.LOCK_COUNTER*K.MB_PASS;
    E.push({t:0.85, kind:'aes1on', pulse: bug ? [relock, relock+500*K.WUS] : null, relock});
  }
  return E;
}
function frozenAt(t){ for (const e of runEvents()) if (e.kind==='sdi' && t>=e.t && t<e.t+e.freeze) return e; return null; }

/* ---------------- main loop (v200w.c main(), vcurrent) ---------------- */
const LOOP = [   // [name, share of a 4 ms pass — inferred weights]
  ['WDR(); CS8416_READ_LOCK_ALL()  → alteraRead(0x00) + CS8416_read5(0x0C)',0.05],
  ['RESET_CS8416_REF()',0.01],['TRANSLATE_AUDIO_INPUT_TYPE()',0.01],['ISOLATE_INPUT_STATUS_MODE2 / ISOLATE_INPUT_STATUS',0.01],
  ['TRANSLATE_AUDIO_REFERENCE_INPUT()  → CS8416_write5(0x04, 0x80/0x88/0x92)',0.04],['RESET_CS8416()',0.01],
  ['ALTERA_TRANSLATE_UART0(); ALTERA_SORT()',0.06],['ALTERA_read_write()  — 80 bytes each way, bit-banged',0.55],['ALIGNMENT_CHECK()  — "V201"?',0.01],
  ['SPI_translation(); Metadata_translation()',0.06],['UART0_translate / UART0_setup / UART0_transmit_counter',0.06],
  ['UART1_translate()',0.03],['SAVE_MIX_IN_EEPROM(); SPI_control()',0.04],['MODE1/4: DOLBY_DECODER_STATUS, DOLBY_CAT552_AUDIO_ERROR_CHECK',0.04],
  ['if (sdiLockStatus==1 && pSdiLockStatus==0) { wait_ms(500)… PORTE &= ~BIT2 … }',0.02],
];
function loopStepAt(t){
  if (D.scen==='boot'){ const b=boot(); if (t<b.loop) return -1; t-=b.loop; }
  else if (frozenAt(t)) return LOOP.length-1;
  const ph=(t % K.MB_PASS)/K.MB_PASS; let a=0;
  for (let i=0;i<LOOP.length;i++){ a+=LOOP[i][1]; if (ph<a) return i; }
  return LOOP.length-1;
}

/* ---------------- actions ---------------- */
function act(name, fn){
  const tr=[]; fn(s=>tr.push(s));
  D.log.unshift({t:SIM.t, name, tr, disp: displayText()}); if (D.log.length>50) D.log.length=50;
  rerender();
}
const MB='<span class="muted">(main MCU)</span>', FP='<span class="muted">(front MCU)</span>', FG='<span class="muted">(FPGA)</span>';
const A = {
  step(i){ act(`Load ${STEPS[i].label}`, tr=>{
    const was=D.step; D.step=i; D.dist=null; const s=ST();
    if (s.board==='iss3'){ D.cfgFpga='EP1C6'; D.cfgDev='EPCS1'; } else if (STEPS[was].board!=='iss5'){ D.cfgFpga='EP4CE40'; D.cfgDev='M25P16'; }
    tr(`Board ${s.board==='iss5'?'AMS8E-1 ISS5 (Altium, 2012-11)':'AMS8E-1 ISS2/3 (P-CAD)'} · FPGA ${s.fpga} · main Atmel ${s.atmel} · front ${s.front} · ${s.date}`);
    tr(s.note);
    if (s.stuck1) tr('Known bug carried by this build: after a setup change the unit stays in Mode 1 (see Software → parser).');
  }); },
  input(bank,k){ act(`Rear: ${bank===110?'Phoenix 110 Ω':'BNC 75 Ω'} IN ${k} ${(bank===110?D.in110:D.in75)[k-1]?'unplugged':'plugged (PCM)'}`, tr=>{
    const arr = bank===110?D.in110:D.in75; arr[k-1]^=1;
    if (isIss5()){
      tr(`${FG} DS34LV86T ${k<=4?'U8/U11':''} → AES_IN_${bank===110?k+4:k} (ball ${['Y22','W22','Y21','W21','U22','U21','U20','R21'][bank===110?k+3:k-1]}) → ALT_INBUF → input_SELECTOR2 → aes3_2_i2s core ${k-1} (inst${[37,38,46,47][k-1]})`);
      tr(`${FG} aes3_2_i2s counts pulse widths at 98.304 MHz (16 clocks per biphase cell); aes3_input_detected → aesrx_lock[${k-1}] ${arr[k-1]?'goes 1 after the first preambles':'drops to 0'}`);
      tr(`${MB} next pass: CS8416_READ_LOCK_ALL: status = 0x0F & aesReadLockStatus() = alteraRead(0x00 | 0x80) → 0x${lockByte().toString(16).padStart(2,'0')} (1 = locked, ControlDescription_Jan212013)`);
    } else {
      tr(`${FG} EP1C6 routes AES_IN_${k} to AES8416_${k} → CS8416 U${[4,6,9,12][k-1]} RXP0; its RMCK${k} and the AD1895 U${[3,5,7,10][k-1]} SRCDATA${k}/LRCLK${k}/SCLK${k} come back to the FPGA`);
      tr(`${MB} CS8416_read${k}(0x0C) — error register; 0 = locked (separate chip select CS8416_SEL${k} on U14-${[47,46,45,44][k-1]})`);
    }
    tr(`Display “${displayText()}” · speakers: ${audioState().q}`);
  }); },
  bank(b){ act(`SOURCE → ${b} Ω bank`, tr=>{ D.bank=b;
    tr(`${FP} PROCESS_SOURCE_INCREMENT → source = ${b===75?'AES75 (1)':'AES110 (2)'}; general frame 'E' byte → ${MB} TRANSLATE_AUDIO_INPUT_TYPE → ALTERA_SORT bytes 78/79`);
    if (isIss5() && b===110 && !ST().b110) tr(`${FG} ${ST().id}: the 110 Ω receivers are not yet buffered into the cores ("only input H9 works") — no lock`);
    tr(`Display “${displayText()}” · ${audioState().q}`); }); },
  inputNo(k){ act(`Press INPUTS ${['1/2','3/4','5/6','7/8'][k-1]}`, tr=>{ D.inputNo=k;
    tr(`${FP} TRANSLATE_PUSHBUTTONS → input_number = NO${k} → ${MB} altera_audio_input (byte 77) = 0x${(1<<(k-1)).toString(16).padStart(2,'0')}`);
    tr(`Display “${displayText()}” · ${audioState().q} (${audioState().why})`); }); },
  mode(m){ act(`Setup: Mode ${m}`, tr=>{
    if (ST().stuck1 && D.mode===1 && m!==1){ tr(`${MB} v104 parser: index2 jumps to 11 after the volume digits (one short since the SDI byte was added), so the setup fields never parse — the unit stays in Mode 1 (Bob, Mar 28). Fixed in vcurrent: index2 = 12, voiceover = rx_buffer[18]`); return; }
    D.mode=m; D.dist=null;
    tr(`${FP} SETUP_COM frame (#L … M${m} …$) → ${MB} mode_select (byte 3) → FPGA bypass1..4 / router; SHARC mode`);
    if (m===1) tr(D.dolbyCard? 'Mode 1: AES input 1 is decoded by the CAT552 card on P5 (72-pin SIMM socket)':'Mode 1 needs the Dolby decoder card — none fitted');
    tr(`Display “${displayText()}” · ${audioState().q}`); }); },
  ref(r){ act(`Setup: Ref ${r==='INT'?'Int':r+' Ω'}`, tr=>{ D.ref=r;
    tr(`${MB} TRANSLATE_AUDIO_REFERENCE_INPUT: CS8416_write5(0x04, 0x${({INT:'80','75':'88','110':'92'})[r]}) — RXSEL picks ${r==='INT'?'RXP0 = AES_REF_FPGA (U4-A13)':r==='75'?'RXP1 = AES_75REF_IN (U27 pin 5)':'RXP2 = AES_110REF_IN (U27 pin 3)'}`);
    tr(`ALTERA_SORT: altera_reference_input = ${refSource()}`); }); },
  plug(p){ act(p==='none'?'Rear: reference removed':`Rear: DARS reference into REF IN ${p} Ω`, tr=>{
    const wasLocked=refLocked(); D.refPlug=p; const nowLocked=refLocked(); const s=ST();
    tr(`${MB} CS8416_read5(0x0C) on CS5 (PD7) → Astatus bit 4 (0x10) = ${nowLocked?0:1} (0 = locked)`);
    if (wasLocked && !nowLocked){
      if (s.refReset){ tr(`RESET_CS8416_REF: was LOCKED, now unlocked → PORTE &= ~0x04; wait_us(500) (≈ ${(500*K.WUS*1e3).toFixed(2)} ms real, from v200w.lis); PORTE |= 0x04 — CAT552 reset (Feb 11, 2013)`); D.dist=null; }
      else if (D.dolbyCard && (D.mode===1||D.mode===4)){ D.dist='reference pulled with Ref = '+D.ref+' Ω; the Dolby card is not reset before Atmel v103v1'; tr('No reset code yet: Dolby-card audio is now distorted (Bob, Feb 11)'); }
    }
    if (!wasLocked && nowLocked) tr(`After LOCK_COUNTER = 25 unlocked passes counted earlier: relock path resets the CAT552 too and clears frame_sync/buffer_full`);
    tr(`altera_reference_input = ${refSource()}`); }); },
  dolby(){ act(D.dolbyCard?'Remove Dolby CAT552 card':'Fit Dolby CAT552 card in P5', tr=>{ D.dolbyCard=!D.dolbyCard; D.dist=null;
    tr(`P5 CAT_NO_552_RA: RESET_552, MAP0/1, PRG0–2, DLM0–2, PLE/PLS/PGP, ACS, PDN on FPGA balls V4 V3 T3 T4 U1 T5 P2 P1 N2 N1 M2 R1 R2 (qsf)`);
    tr(`Display “${displayText()}”`); }); },
  sdi(on){ act(on?'SDI demux3 locks':'SDI demux3 loses lock', tr=>{ const was=D.sdiLock; D.sdiLock=on; const s=ST();
    tr(`demux3 (pod31, EP1C12) carrier lock → ${FP} UART1_translate: sdi_carrier_lock = ${on?'YES':'NO'}`);
    if (!s.sdiReset){ tr(`${FP}/${MB} ${s.id}: lock is not passed to the main board yet (added Mar 28 / front v101)`); if (on && !was && D.dolbyCard && D.mode===1) D.dist='SDI pulled and re-applied; no Dolby reset before Atmel v104 ("distorted sometimes")'; return; }
    tr(`${FP} general frame now # A <sdi_carrier_lock> B C … (uart.c: UART0_transmit(sdi_carrier_lock) after chA)`);
    tr(`${MB} sdiLockStatus = rx_buffer[1]`);
    if (on && !was){ D.dist=null; tr(`${MB} 0→1 edge: ${s.sdiReset===3?'wait_ms(500); wait_ms(500); ':'wait_ms(500); '}PORTE &= ~BIT2; wait_ms(500); PORTE |= BIT2 → the whole loop stops for ${(s.sdiReset*K.W500*1e3).toFixed(0)} ms (wait_ms(1) = 808 cycles = 164 µs, not 1 ms). See the Run timeline at 0.30 s.`); }
  }); },
  cfg(f,d){ act(`Config: ${f} with ${d}`, tr=>{ D.cfgFpga=f; D.cfgDev=d; D.programmed=null; const r=cfgFit(f,d);
    tr(`${f} bitstream ${r.bits.toLocaleString()} bits${FPGAS[f].inf?' ('+INF+')':''} vs ${d} ${r.cap.toLocaleString()} bits → ${r.pct.toFixed(1)} % — ${r.note}`); }); },
  program(){ act(`Program ${D.cfgDev} over Active Serial (H2)`, tr=>{ const r=cfgFit(D.cfgFpga,D.cfgDev);
    tr(`Quartus Programmer: chain file AMS81.cdf — ChainType(asc), Device PartName(${D.cfgDev.replace('M25P16','EPCS16').replace('M25P40','EPCS4')}) File("AMS81.pof")`);
    tr(`H2 pins: 1 DCLK, 3 CONF_DONE, 5 N_CONFIG, 6 NCE, 7 CNF_DATA, 8 NCS, 9 ASDI (ISS5 IPC netlist). The ATmega shares the same four AS lines (U14-48…51).`);
    if (!r.ok){ D.programmed=false; tr(`<b style="color:var(--bad)">Fails:</b> ${r.note}. This is what the qsf's leftover CYCLONE_CONFIGURATION_DEVICE EPCS1 asks for.`); return; }
    D.programmed=true; tr(`OK: ${r.pct.toFixed(1)} % of the device used; at power-up the FPGA reads it in ${(r.t*1e3).toFixed(0)} ms (DCLK ${(FPGAS[D.cfgFpga].dclk||D.dclk*1e6)/1e6} MHz).`); }); },
  reset(){ const keep={scen:D.scen,tut:D.tut,tutSeen:D.tutSeen}; D=fresh(); Object.assign(D,keep); rerender(); },
};

/* ================================================================
   DRAWINGS
   ================================================================ */
/* Real assembly drawings, both at 160 px/in, in the shared P-CAD/Altium frame (inches, IPC/PnP absolute):
   ISS2 board 5.80 × 3.58 in, origin (1.200, 10.925); ISS5 board 5.80 × 4.159 in, origin (1.230, 10.920). */
const PPI=160;
const P2 = (x,y)=>[(x-1.200)*PPI, (3.58-(y-10.925))*PPI];
const P5 = (x,y)=>[(x-1.230)*PPI, (4.159-(y-10.920))*PPI];
const iss2 = (X,Y)=>[1.727+X/1000, 10.993+Y/1000];       // Ams8e-1iss2.pnp report origin (1727, 10993) mil
function boxC(c,w,h){ return [c[0]-w/2, c[1]-h/2, c[0]+w/2, c[1]+h/2]; }
const BEFORE = {
  U4:{b:boxC(iss2(915.3,2223.2),.42,.22), k:'gone', t:'U4 CS8416 (AES RX 1)', d:'192 kHz AES receiver. RXP0 ← AES1 (U21-14); RMCK1 → U21-11. Removed in ISS5.'},
  U6:{b:boxC(iss2(915.3,1798.2),.42,.22), k:'gone', t:'U6 CS8416 (AES RX 2)', d:'Second receive chain. Removed in ISS5.'},
  U9:{b:boxC(iss2(915.3,1373.2),.42,.22), k:'gone', t:'U9 CS8416 (AES RX 3)', d:'Third receive chain. Removed in ISS5.'},
  U12:{b:boxC(iss2(915.3,948.2),.42,.22), k:'gone', t:'U12 CS8416 (AES RX 4)', d:'Fourth receive chain. Removed in ISS5.'},
  U3:{b:boxC(iss2(1309.7,2214.2),.42,.27), k:'gone', t:'U3 AD1895 (SRC 1)', d:'MCLK_IN ← DSP_CLK_OUT (U21-13); SRCDATA1/LRCLK1/SCLK1 → U21-15/16/17; BYPASS1 ← U21-12. MCLKOUT1 daisy-chains to U5. Removed.'},
  U5:{b:boxC(iss2(1309.7,1789.2),.42,.27), k:'gone', t:'U5 AD1895 (SRC 2)', d:'Removed.'},
  U7:{b:boxC(iss2(1309.7,1364.2),.42,.27), k:'gone', t:'U7 AD1895 (SRC 3)', d:'Removed.'},
  U10:{b:boxC(iss2(1309.7,939.2),.42,.27), k:'kept', t:'U10 AD1895 (SRC 4)', d:'The designator survives in ISS5 as the one "reference" AD1895 — but see Findings: the V050000 FPGA never drives its master clock.'},
  U21:{b:boxC([4.154,13.044],1.40,1.40), k:'gone', t:'U21 EP1C6Q240C7 (Cyclone)', d:'5,980 LEs, PQFP-240. In v203Original it only muxes AES lines and packs TDM: aes_input_router ×2, quad_selector ×2, router, tdm_i2sx5, i2sx5_tdm, shift_in32 ×2, i2sx4_aes. Replaced by U4 EP4CE40.'},
  U13:{b:boxC(iss2(2498,3297),.22,.22), k:'gone', t:'U13 EPCS1 (SO8)', d:'1,048,576-bit serial configuration device. AS lines also wired to the ATmega (U14-48…51). Becomes an SO16 M25P16 on ISS5.'},
  U24:{b:boxC(iss2(3370.3,878.2),.42,.22), k:'kept', t:'U24 CS8416 (reference)', d:'Fifth CS8416, chip select CS8416_SEL5 (U14-32). Kept on ISS5 for the REF IN 75/110 Ω inputs.'},
  U1:{b:boxC(iss2(4171.5,2032),1.18,1.18), k:'same', t:'U1 ADSP-21065 SHARC', d:'Same part and the same coordinate (5.8985, 13.025 in) on ISS2, ISS3 and ISS5: the layout was carried forward. Metering code v205 unchanged.'},
  U14:{b:boxC(iss2(4387,966),.6,.6), k:'same', t:'U14 ATmega128L (main)', d:'X2 4.9152 MHz. Talks to five CS8416s on a shared bit-banged bus with five chip selects.'},
  U8:{b:boxC(iss2(2123,442),.4,.22), k:'same', t:'U8 DS34LV86T', d:'Quad RS-422 receiver: AES IN 1–4 → FPGA.'},
  U11:{b:boxC(iss2(2173,1117),.4,.22), k:'same', t:'U11 DS34LV86T', d:'AES IN 5–8 → FPGA.'},
};
const BB5 = {"U1":[5.308,12.434,6.489,13.616],"U2":[5.545,13.91,6.095,14.36],"U4":[3.976,13.149,4.802,13.976],"U8":[3.425,11.325,3.775,11.545],"U10":[4.202,12.48,4.534,12.76],"U11":[3.475,12.0,3.825,12.22],"U12":[4.78,11.325,5.13,11.545],"U13":[3.37,14.04,3.72,14.42],"U24":[4.68,12.477,5.012,12.705],"U29":[4.78,12.0,5.13,12.22],"X3":[3.11,13.405,3.31,13.57],"X4":[3.113,12.939,3.313,13.104],"P13":[2.195,11.732,2.578,14.232],"H2":[5.255,14.91,5.655,15.01],"H4":[3.37,14.85,4.97,14.95],"H11":[4.8,11.05,5.7,11.15],"H12":[4.795,11.725,5.695,11.825],"REG2":[2.493,12.179,2.737,12.461],"R97":[4.44,14.06,4.54,14.2],"Q1":[5.33,14.7,5.48,14.87],"U14":[5.721,12.327,6.335,12.941],"JTAG2":[6.05,11.66,6.45,11.88]};
const AFTER = {
  U4:{k:'new', t:'U4 EP4CE40F23C6N (Cyclone IV E)', d:'FBGA-484, 1 mm. Now does the AES receive (aes3_2_i2s ×4 via ALT_INBUF), the SRC (resampler / src_aes_example_top, Altera reference design), the router and TDM to the SHARC, AES outputs and the SPI register (spicontrol). 102 pins assigned in AMS81.qsf — every one lands on the expected IPC net. Alternate revision ams81-ep4ce30 targets EP4CE30F23I7.'},
  U13:{k:'new', t:'U13 M25P16-VMF6P (16 Mbit, SO16)', d:'EPCS16-compatible SPI flash. 9,534,304-bit EP4CE40 image = 56.8 % of it. Pins 7 NCS, 8 DATA (via R97 25R5 to U4-K1), 15 ASDI, 16 DCLK. The qsf still says EPCS1.'},
  U24:{k:'kept', t:'U24 CS8416 (reference only)', d:'AES_75REF_IN (pin 3) and AES_110REF_IN (pin 2) from U27; RXP0 (pin 4) ← AES_REF_FPGA (U4-A13). MCLK_REF (pin 24) → U4-B12 = AES5_REF_MCLK → altpll1 × 8 = 98.304 MHz. Read by CS8416_read5(0x0C).'},
  U10:{k:'kept', t:'U10 AD1895 (populated, idle)', d:'Its MCLK_IN (U4-F22), BYPASS (H22), MMODE0–2, WLNGTH0/1 and TDM_IN pins go to FPGA balls that AMS81.qsf never assigns (reserved "as input tri-stated"). With no master clock the SRC cannot run; the reference path uses only the CS8416 MCLK.'},
  U1:{k:'same', t:'U1 ADSP-21065 SHARC', d:'Unchanged position and firmware (ams81v205 hash-identical to the master v205). Boots from U2 (AM29LV040B in a PLCC-32 socket).'},
  U2:{k:'same', t:'U2 AM29LV040B socket', d:'SHARC boot flash. ISS4 had swapped to an ADSP-21262 + AT25F512A; ISS5 returns to the ISS2/3 pair, which is why the SHARC code needed no change.'},
  U14:{k:'same', t:'U14 ATmega128L (bottom side)', d:'Now drives NCE (U14-47, was CS8416_SEL1) and still shares the AS bus (U14-48…51). PC0–PC3 carry spicontrol (SCLK, MOSI, CS, MISO).'},
  U8:{k:'same', t:'U8 DS34LV86T', d:'AES_IN1–4 → Y22 W22 Y21 W21. EN and EN* both on EN_AES1-4 (U4-C13, never assigned).'},
  U11:{k:'same', t:'U11 DS34LV86T', d:'AES_IN5–8 → U22 U21 U20 R21.'},
  U12:{k:'new', t:'U12/U29 DS34LV86T (AES 9–16)', d:'Eight more AES inputs to the FPGA (AES_IN9–16). Unused by the AMS81 design; they serve the 32ME-MADI build of the same board (PnP folder "32ME-MADI").'},
  U29:{k:'new', t:'U29 DS34LV86T (AES 13–16)', d:'See U12.'},
  H11:{k:'new', t:'H11 / H12 AES 9–16 headers', d:'Unused by AMS81.'},
  H12:{k:'new', t:'H12 AES 13–16', d:'Unused by AMS81.'},
  H4:{k:'new', t:'H4 2×17 i64 header', d:'DATA1–8_IN/OUT_I64, FSYNC, MCLK — the MADI module / uNet. None assigned in AMS81.qsf.'},
  P13:{k:'new', t:'P13 Dolby CAT1100 (bottom)', d:'100-pin Molex. About 70 FPGA nets (IADA, OADA, EXPIO, HSP …), none used by AMS81, which keeps the CAT552 on P5.'},
  X3:{k:'new', t:'X3 / X4 oscillators (bottom)', d:'CSX750V 24.576 MHz (into altpll0 × 4 → 98.304 MHz) and 22.5792 MHz.'},
  X4:{k:'new', t:'X4 22.5792 MHz', d:'44.1 kHz family. Left out of the 32ME-MADI pick-and-place program.'},
  REG2:{k:'new', t:'REG2 TPS70402 (bottom)', d:'Dual LDO for the Cyclone IV core (1.2 V) and PLL (2.5 V) supplies — the EP1C6 needed only LM1117-ADJ.'},
  H2:{k:'same', t:'H2 FPGA AS header', d:'1 DCLK, 3 CONF_DONE, 5 N_CONFIG, 6 NCE, 7 CNF_DATA, 8 NCS, 9 ASDI. USB-Blaster in AS mode.'},
  Q1:{k:'same', t:'Q1 2N4401 nCONFIG driver', d:'ALTERA_RESET (PB7, U14-17) → R181 → Q1 → N_CONFIG. port_init sets PB7 high, so the FPGA is held unconfigured until CONFIGURE_ALTERA.'},
  R97:{k:'new', t:'R97 25R5 series resistor', d:'CNF_DATA → U4-K1 (DATA0). The Cyclone IV handbook asks for a 25 Ω series resistor on DATA[0] in AS mode.'},
  JTAG2:{k:'same', t:'JTAG2 Atmel JTAG', d:'HLE 2×5 SMT.'},
};
const KCOL = {gone:'#d33a2c', kept:'#d99a1e', new:'#1f9a55', same:'#3a7bd5'};
function boardSVG(which){
  const bef = which==='before', W=928, H=bef?573:665, parts = bef?BEFORE:AFTER;
  let s=`<svg viewBox="0 0 ${W} ${H}" style="width:100%;display:block;border-radius:6px" role="img" aria-label="AMS8E-1 ${bef?'ISS2':'ISS5'} assembly drawing">
   <rect width="${W}" height="${H}" fill="#f4f1e6"/><image href="${ASSET}rd60-ams81a-iss5-${bef?'iss2':'iss5'}-assy.png" width="${W}" height="${H}"/>`;
  for (const k in parts){
    const p=parts[k]; let x1,y1,x2,y2;
    if (bef){ [x1,y1]=P2(p.b[0],p.b[3]); [x2,y2]=P2(p.b[2],p.b[1]); }
    else { const b=BB5[k]; if(!b) continue; [x1,y1]=P5(b[0]-.03,b[3]+.03); [x2,y2]=P5(b[2]+.03,b[1]-.03); }
    const sel = D.pick===(bef?'b:':'a:')+k, c=KCOL[p.k];
    s+=`<rect class="rdpart" data-p="${bef?'b':'a'}:${k}" x="${x1}" y="${y1}" width="${Math.max(12,x2-x1)}" height="${Math.max(12,y2-y1)}" rx="3" fill="${c}" fill-opacity="${sel?.35:.13}" stroke="${c}" stroke-width="${sel?3.5:2}" style="cursor:pointer"><title>${p.t}</title></rect>`;
  }
  s+=`<text x="8" y="${H-8}" font-size="13" fill="#333">${bef?'AMS8E-1 ISS2 (P-CAD, 2006) — 5.80 × 3.58 in':'AMS8E-1 ISS5 (Altium, 2012) — 5.80 × 4.16 in'} · same scale</text></svg>`;
  return s;
}
function partInfo(){
  const [w,k]=(D.pick||'a:U4').split(':'); const p=(w==='b'?BEFORE:AFTER)[k]; if(!p) return '';
  return `<div style="border-left:4px solid ${KCOL[p.k]};padding-left:8px"><b>${p.t}</b> <span class="chip">${{gone:'removed in ISS5',kept:'kept',new:'new in ISS5',same:'unchanged'}[p.k]}</span><div class="small">${p.d}</div></div>`;
}

/* ---- front display + input buttons, rear jacks: CorelDRAW vector art (artwork pass 2026|59) ----
   assets/rd60-ams81a-iss5-front.svg / -rear.svg, cut by Inkscape from AMS8-1A-FRONT-SILK (CURVES).cdr (OCT.19/15) and
   AMS8-M2-Rear-SILK(Curve).cdr (MAY 07/15) between the crop marks: viewBox = the panel outline in pt, drawn as 1707 × 163
   (the frame of the earlier PNG crops, so the controls keep their hole coordinates). Front: GREEN plate in POD green,
   WHITE plate in white, cut-outs from the GREEN plate's mechanical lines; live-text labels re-anchored on the button,
   knob and display centres. */
const ART = { DIR:'AMS81 - #Master/AMS81 - #ARTWORK #DA #2016/', FRONT:'AMS8-1A-FRONT-SILK (CURVES).cdr', REAR:'AMS8-M2-Rear-SILK(Curve).cdr' };
const artSrc = k => SIM.src(ART.DIR+ART[k], ART[k]);
const artNote = () => `<div class="small muted" style="margin-top:4px">Panel artwork: ${artSrc('REAR')} (MAY 07/15) and ${artSrc('FRONT')} (OCT.19/15), CorelDRAW vector art cropped to the parts RD60 touches.</div>`;
function frontSVG(){
  const txt=displayText(), pitch=3.0, x0=1109.8-(8*6.2*pitch-pitch*1.2)/2, y0=51.8-3*pitch, BX=[801.5,846,890.5,935];
  let s=`<svg viewBox="782 0 458 163" style="width:100%;display:block;border-radius:6px" role="img" aria-label="AMS8-1A front panel crop (real silkscreen)">
    <defs><filter id="rdglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect x="782" width="458" height="163" fill="#202326"/><image href="${ASSET}rd60-ams81a-iss5-front.svg" width="1707" height="163" preserveAspectRatio="none"/>
    <rect x="${1109.8-91.6}" y="${51.8-24.7}" width="183.2" height="49.5" rx="3" fill="#0b0d0b"/>`;
  for (let i=0;i<8;i++){ const ch=txt[i]||' '; s+=SIM.dotMatrix(ch, x0+i*6.2*pitch, y0, pitch, '#9dff3a', '#1b2a14'); }
  BX.forEach((x,k)=>{ const lit=D.inputNo===k+1; s+=`<g class="rdin" data-k="${k+1}" style="cursor:pointer"><title>INPUTS ${['1/2','3/4','5/6','7/8'][k]}</title><rect x="${x-16.5}" y="34.75" width="33" height="33" rx="2.5" fill="#0c0d0e"/><rect x="${x-14}" y="37.25" width="28" height="28" rx="2" fill="#3a3d41" stroke="#55595e"/><rect x="${x-6}" y="47.75" width="12" height="7" rx="1" fill="${lit?'#ff3a4c':'#a9adb2'}" ${lit?'filter="url(#rdglow)"':''}/></g>`; });
  s+=`</svg>`;
  return s;
}
function rearSVG(){
  const bnc=(x,id,on,lbl)=>`<g class="rdjack" data-j="${id}" style="cursor:pointer"><title>${lbl}: ${on?'connected':'empty'} — click</title><circle cx="${x}" cy="46.1" r="24" fill="#a68a3c" stroke="#5e4d1c" stroke-width="2"/><circle cx="${x}" cy="46.1" r="15" fill="#d8c27a"/><circle cx="${x}" cy="46.1" r="5" fill="#7a5f12"/>${on?`<rect x="${x-9}" y="58" width="18" height="30" fill="#2b5f9e"/><rect x="${x-15}" y="50" width="30" height="16" rx="4" fill="#3a74b8"/>`:''}</g>`;
  const phx=(x0,id,on,lbl)=>`<g class="rdjack" data-j="${id}" style="cursor:pointer"><title>${lbl}: ${on?'connected':'empty'} — click</title><rect x="${x0+2}" y="107" width="50" height="29" fill="transparent"/>${[9,27,45].map(d=>`<circle cx="${x0+d}" cy="121.5" r="5.5" fill="#0d3a1c"/>`).join('')}${on?`<rect x="${x0+6}" y="99" width="42" height="10" rx="2" fill="#1f6b3a"/>`:''}</g>`;
  let s=`<svg viewBox="960 0 700 163" style="width:100%;display:block;border-radius:6px" role="img" aria-label="AMS8-1A rear panel crop (real silkscreen)">
    <rect x="960" width="700" height="163" fill="#202326"/><image href="${ASSET}rd60-ams81a-iss5-rear.svg" width="1707" height="163" preserveAspectRatio="none"/>
    <rect x="986" y="105" width="108" height="33" rx="2" fill="#2a9d55" stroke="#145a2e"/><rect x="1115" y="105" width="54" height="33" rx="2" fill="#2a9d55" stroke="#145a2e"/><rect x="1189" y="105" width="216" height="33" rx="2" fill="#2a9d55" stroke="#145a2e"/><rect x="1427" y="105" width="216" height="33" rx="2" fill="#2a9d55" stroke="#145a2e"/>`;
  s+=bnc(1045.9,'r75',D.refPlug==='75','REF IN 75 Ω');
  [1120.1,1182,1243.9,1305.8].forEach((x,k)=> s+=bnc(x,'b'+(k+1),D.in75[k],'IN '+(k+1)+' (75 Ω)'));
  s+=phx(1115,'r110',D.refPlug==='110','REF IN 110 Ω');
  for (let k=0;k<4;k++) s+=phx(1189+k*54,'p'+(k+1),D.in110[k],'IN '+(k+1)+' (110 Ω)');
  s+=`</svg>`;
  return s;
}
function bindPanels(root){
  root.querySelectorAll('.rdin').forEach(g=>g.addEventListener('click',()=>A.inputNo(+g.dataset.k)));
  root.querySelectorAll('.rdjack').forEach(g=>g.addEventListener('click',()=>{ const j=g.dataset.j;
    if (j==='r75') return A.plug(D.refPlug==='75'?'none':'75'); if (j==='r110') return A.plug(D.refPlug==='110'?'none':'110');
    A.input(j[0]==='p'?110:75, +j[1]); }));
  root.querySelectorAll('.rdpart').forEach(r=>r.addEventListener('click',()=>{ D.pick=r.dataset.p; D.fpgaClicked[r.dataset.p]=1; rerender(); }));
}

/* ================================================================
   TIMELINE LANES
   ================================================================ */
function seg(c,X,a,b,y,h,col,lbl,t0,t1){ if (b<t0||a>t1) return; const xa=X(Math.max(a,t0)), xb=X(Math.min(b,t1)); c.fillStyle=col; c.fillRect(xa,y+4,Math.max(1,xb-xa),h-8);
  if (lbl && xb-xa>40){ c.fillStyle='#fff'; c.font='11px '+SIM.css('--sans'); c.save(); c.beginPath(); c.rect(xa,y,xb-xa,h); c.clip(); c.fillText(lbl,xa+4,y+h/2+4); c.restore(); } }
function level(c,X,t0,t1,y,h,col,fnHigh,steps){ c.strokeStyle=col; c.lineWidth=1.5; c.beginPath(); const n=steps||600; for (let i=0;i<=n;i++){ const t=t0+(t1-t0)*i/n; const v=fnHigh(t)?y+5:y+h-5; i?c.lineTo(X(t),v):c.moveTo(X(t),v); } c.stroke(); c.lineWidth=1; }
/* AES3 biphase-mark for input 1 (programme = 1 kHz tone, −20 dBFS — inferred test signal) */
function subframeBits(n,ch){
  const v = Math.round(0.1*Math.sin(2*Math.PI*1000*n/K.FS)*8388607) & 0xFFFFFF;
  const b=new Array(32).fill(0);
  for (let i=0;i<24;i++) b[4+i]=(v>>i)&1;                   // LSB first: aux nibble then 20-bit audio
  b[28]=0; b[29]=0; b[30]= (n%192===0 && ch===0)?1:0;       // V U C (C: just a marker bit)
  let p=0; for (let i=4;i<31;i++) p^=b[i]; b[31]=p;          // even parity
  return b;
}
const PRE = {Z:[1,1,1,0,1,0,0,0], X:[1,1,1,0,0,0,1,0], Y:[1,1,1,0,0,1,0,0]};
function frameCells(n){
  const cells=[]; let lv=0;
  for (let ch=0; ch<2; ch++){
    const pat = ch===1? PRE.Y : (n%192===0? PRE.Z : PRE.X), inv = lv===1;
    for (let i=0;i<8;i++){ lv = inv? 1-pat[i] : pat[i]; cells.push(lv); }
    const b=subframeBits(n,ch);
    for (let i=4;i<32;i++){ lv=1-lv; cells.push(lv); if (b[i]) lv=1-lv; cells.push(lv); }
  }
  return cells;
}
function aesLane(c,X,t0,t1,y,h,present){
  const cw=1/K.CELL, n0=Math.floor(t0/cw), n1=Math.ceil(t1/cw);
  if (!present){ c.fillStyle=SIM.css('--ink2'); c.font='11px sans-serif'; c.fillText('no signal on this input', X(t0)+6, y+h/2+4); return; }
  if (n1-n0>3000){ SIM.pulses(c,X,t0,t1,y,h,1/K.FS,0,1/K.FS*0.0625,SIM.css('--accent2'),'AES frames (preamble Z/X/Y + 2 × 32 bit slots)'); return; }
  const col=SIM.css('--accent2'); c.strokeStyle=col; c.lineWidth=1.5; c.beginPath(); let first=true, cache={};
  for (let i=n0;i<=n1;i++){ const f=Math.floor(i/128), ci=((i%128)+128)%128; const cells = cache[f]||(cache[f]=frameCells(f)); const lv=cells[ci]; const yy=lv?y+5:y+h-5;
    if (first){ c.moveTo(X(i*cw),yy); first=false; } else c.lineTo(X(i*cw),yy); c.lineTo(X((i+1)*cw),yy); }
  c.stroke(); c.lineWidth=1;
  if (X(cw*8)-X(0)>40){ c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; for (let f=Math.floor(t0*K.FS); f<=Math.ceil(t1*K.FS); f++){ for (const ch of [0,1]){ const ts=(f*128+ch*64)*cw; if (ts>=t0&&ts<=t1) c.fillText(ch? 'Y':(f%192===0?'Z':'X'), X(ts)+2, y+11); } } }
}
function lanes(){
  const css=SIM.css, L=[], s=ST(), i5=isIss5();
  if (D.scen==='boot'){
    const b=boot();
    L.push({label:'Main MCU (ATmega128)', h:30, draw(c,X,t0,t1,y,h){
      seg(c,X,0,b.init,y,h,css('--ink2'),'init',t0,t1);
      for (let i=0;i<9;i++) seg(c,X,b.init+i*K.W500,b.init+(i+1)*K.W500-0.0004,y,h,i%2?'#6b7f99':'#7f93ad',`wait_ms(500) #${i+1} = 82.2 ms`,t0,t1);
      seg(c,X,b.release-200*K.WMS,b.release,y,h,css('--warn'),'CONFIGURE_ALTERA',t0,t1);
      seg(c,X,b.release,b.recallEnd,y,h,'#8a6fb0','RECALL_*',t0,t1); seg(c,X,b.recallEnd,b.rw1,y,h,'#5d8f6f','ALTERA_read_write',t0,t1);
      seg(c,X,b.rw1,b.cs,y,h,'#a07a3a','init_CS8416',t0,t1); seg(c,X,b.cs,b.shEnd,y,h,css('--bad'),'RESET_SHARC',t0,t1);
      const n0=Math.max(0,Math.floor((t0-b.loop)/K.MB_PASS)), n1=Math.floor((t1-b.loop)/K.MB_PASS);
      for (let n=n0;n<=n1 && n-n0<400;n++){ const a=b.loop+n*K.MB_PASS; seg(c,X,a,a+K.MB_PASS*0.96,y,h,css('--accent'),'pass '+(n+1),t0,t1); } }});
    L.push({label:'PB7 ALTERA_RESET → Q1 → nCONFIG', h:24, draw(c,X,t0,t1,y,h){ level(c,X,t0,t1,y,h,css('--warn'),t=>t<b.init*0.5||t>=b.release); }});
    L.push({label:`FPGA ${i5?'EP4CE40':'EP1C6'} state`, h:28, draw(c,X,t0,t1,y,h){
      seg(c,X,b.init*0.5,b.release,y,h,'#7a7f86','held unconfigured (nCONFIG low)',t0,t1);
      seg(c,X,b.cfgStart,b.cfgEnd,y,h,css('--warn'),`AS configuration: ${(b.bits/1e6).toFixed(2)} Mbit at ${(b.f/1e6)} MHz = ${((b.cfgEnd-b.cfgStart)*1e3).toFixed(0)} ms`,t0,t1);
      seg(c,X,b.cfgEnd,b.user,y,h,'#8a6fb0','init',t0,t1); seg(c,X,b.user,9,y,h,css('--accent'),'user mode',t0,t1); }});
    L.push({label:'DCLK (from FPGA to U13)', h:24, draw(c,X,t0,t1,y,h){ const a=Math.max(t0,b.cfgStart), z=Math.min(t1,b.cfgEnd); if (z>a) SIM.pulses(c,X,a,z,y,h,1/b.f,b.cfgStart,0.5/b.f,css('--accent2'),'DCLK'); }});
    L.push({label:'Bits read from flash', h:26, draw(c,X,t0,t1,y,h){ c.strokeStyle=css('--accent2'); c.beginPath(); for (let i=0;i<=300;i++){ const t=t0+(t1-t0)*i/300; const p=Math.max(0,Math.min(1,(t-b.cfgStart)/(b.cfgEnd-b.cfgStart))); const yy=y+h-4-p*(h-8); i?c.lineTo(X(t),yy):c.moveTo(X(t),yy);} c.stroke(); }});
    L.push({label:'CONF_DONE (U4-M18 / H2-3)', h:22, draw(c,X,t0,t1,y,h){ level(c,X,t0,t1,y,h,css('--accent'),t=>t>=b.cfgEnd); }});
    L.push({label:'SHARC reset PE6 (low = reset)', h:22, draw(c,X,t0,t1,y,h){ level(c,X,t0,t1,y,h,css('--bad'),t=>t>=b.shEnd || (t>=b.init && t<0)); }});
    L.push({label:'TDM FSYNC hold (PG0)', h:22, draw(c,X,t0,t1,y,h){ level(c,X,t0,t1,y,h,css('--ink2'),t=>t>=b.shEnd); }});
    L.push({label:'ALIGNMENT_CHECK "V201"', h:24, draw(c,X,t0,t1,y,h){ const n0=Math.max(0,Math.floor((t0-b.loop)/K.MB_PASS)), n1=Math.floor((t1-b.loop)/K.MB_PASS);
      if (n1-n0>500){ seg(c,X,b.loop,b.user+0.001,y,h,css('--bad'),'miss',t0,t1); seg(c,X,b.user+0.001,9,y,h,css('--accent'),'match',t0,t1); return; }
      for (let n=n0;n<=n1;n++){ const a=b.loop+n*K.MB_PASS+K.MB_PASS*0.6; seg(c,X,a,a+K.MB_PASS*0.3,y,h,a>b.user+0.001?css('--accent'):css('--bad'),'',t0,t1); } }});
    L.push({label:'AES IN 1 (biphase, external)', h:30, draw(c,X,t0,t1,y,h){ aesLane(c,X,t0,t1,y,h,D.in75[0]); }});
    L.push({label:`${i5?'aesrx_lock[0]':'CS8416 U4 lock'}`, h:22, draw(c,X,t0,t1,y,h){ level(c,X,t0,t1,y,h,css('--accent'),t=>D.in75[0] && s.rx>0 && t>=b.user+2/K.FS); }});
  } else {
    const E=runEvents();
    L.push({label:'AES IN 1 (biphase, 6.144 MHz cells)', h:32, draw(c,X,t0,t1,y,h){ const off=E.find(e=>e.kind==='aes1off'); aesLane(c,X,t0,t1,y,h,D.in75[0] && !(off && t0>=0.70 && t1<=0.85)); if (off){ seg(c,X,0.70,0.85,y,h,'rgba(120,120,120,.35)','AES1 removed',t0,t1); } }});
    L.push({label: i5?'aes3_2_i2s sample clock 98.304 MHz':'CS8416 U4 RMCK 12.288 MHz', h:22, draw(c,X,t0,t1,y,h){ const f=i5?K.F98:12.288e6; SIM.pulses(c,X,t0,t1,y,h,1/f,0,0.5/f,css('--ink2'),i5?'clk_in (16 per cell)':'RMCK'); }});
    L.push({label: i5?'RX I2S out: LRCLK 48 kHz':'CS8416 OLRCK 48 kHz', h:22, draw(c,X,t0,t1,y,h){ if ((t1-t0)*K.FS>200) SIM.pulses(c,X,t0,t1,y,h,1/K.FS,0,0.5/K.FS,css('--accent'),'LRCLK periods'); else level(c,X,t0,t1,y,h,css('--accent'),t=>((t*K.FS)%1)>=0.5, 800); }});
    L.push({label: i5?'RX I2S SCLK 3.072 MHz (÷32)':'AD1895 SCLK1', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/3.072e6,0,0.5/3.072e6,css('--accent2'),'SCLK'); }});
    L.push({label: i5?'SRC out (src_core i2s_tx) → router':'AD1895 SRCDATA1 → FPGA', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/K.FS,0.3/K.FS,0.5/K.FS,css('--warn'),'output frames'); }});
    L.push({label:'Main loop passes (4 ms '+'inferred)', h:30, draw(c,X,t0,t1,y,h){
      const n0=Math.floor(t0/K.MB_PASS), n1=Math.ceil(t1/K.MB_PASS);
      if (n1-n0>400) { c.fillStyle=css('--accent'); c.globalAlpha=.35; c.fillRect(X(t0),y+6,X(t1)-X(t0),h-12); c.globalAlpha=1; }
      else for (let n=n0;n<=n1;n++){ const a=n*K.MB_PASS; if (frozenAt(a)) continue; seg(c,X,a,a+K.MB_PASS*0.95,y,h,css('--accent'),'pass',t0,t1); }
      for (const e of E) if (e.kind==='sdi' && e.freeze) seg(c,X,e.t,e.t+e.freeze,y,h,css('--bad'),`frozen in wait_ms: ${(e.freeze*1e3).toFixed(0)} ms`,t0,t1); }});
    L.push({label:'SPI to FPGA: alteraRead(0x00)', h:24, draw(c,X,t0,t1,y,h){
      const bt=4e-6, n0=Math.floor(t0/K.MB_PASS), n1=Math.ceil(t1/K.MB_PASS);   // ≈4 µs per bit-banged bit — inferred
      if (!i5){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('ISS3: no FPGA register — four CS8416_readN(0x0C) on the shared CS8416 bus instead', X(t0)+6, y+h/2+4); return; }
      if (n1-n0>300){ SIM.pulses(c,X,t0,t1,y,h,K.MB_PASS,0,16*bt,css('--accent2'),'16-bit transfers'); return; }
      for (let n=n0;n<=n1;n++){ const a=n*K.MB_PASS; if (frozenAt(a)) continue; if (X(a+16*bt)-X(a)<30){ seg(c,X,a,a+16*bt,y,h,css('--accent2'),'',t0,t1); continue; }
        const word=(0x80<<8)|lockByte(); for (let i=0;i<16;i++){ const ta=a+i*bt; c.fillStyle=(word>>(15-i))&1?css('--accent2'):css('--grid'); c.fillRect(X(ta),y+4,Math.max(1,X(ta+bt*0.9)-X(ta)),h-8); }
        c.fillStyle=css('--ink'); c.font='10px monospace'; c.fillText('addr 0x80 | data 0x'+lockByte().toString(16).padStart(2,'0'), X(a)+2, y+h-2); } }});
    L.push({label:'Dolby CAT552 reset (PORTE bit 2, low = reset)', h:24, draw(c,X,t0,t1,y,h){ level(c,X,t0,t1,y,h,css('--bad'),t=>{ for (const e of E){ const r=e.rst||e.pulse; if (r && t>=r[0] && t<r[1]) return false; } return true; }, 1200); }});
    L.push({label:'Reference clock in use', h:24, draw(c,X,t0,t1,y,h){ const loss=E.find(e=>e.kind==='refloss');
      const ext = refLocked() || (loss && D.ref!=='INT');
      if (!ext){ seg(c,X,t0,t1,y,h,'#6b7f99','RMCK6 internal',t0,t1); return; }
      seg(c,X,0,loss?0.70:9,y,h,'#3a7bd5','RMCK5 = CS8416 MCLK_REF ×8 (altpll1)',t0,t1);
      if (loss) seg(c,X,0.70,9,y,h,s.refFall?'#6b7f99':css('--bad'), s.refFall?'fell back to RMCK6':'still RMCK5, unlocked (no fallback)',t0,t1); }});
    L.push({label:'Events', h:22, draw(c,X,t0,t1,y,h){ c.font='11px sans-serif'; for (const e of E){ c.fillStyle=css('--warn'); c.fillRect(X(e.t)-1,y+2,2,h-4); c.fillStyle=css('--ink'); c.fillText({sdi:'SDI lock 0→1',refloss:'REF unplugged',aes1off:'AES1 out',aes1on:'AES1 back'}[e.kind], X(e.t)+4, y+h/2+4); } }});
  }
  return L;
}

/* ================================================================
   VIEWS
   ================================================================ */
function stepSelect(){ return `<label class="small">Build <select id="rdStep">${STEPS.map((s,i)=>`<option value="${i}" ${i===D.step?'selected':''}>${s.date} · ${s.label}</option>`).join('')}</select></label>`; }
function benchHTML(){
  const au=audioState();
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
    <span class="small muted">Source bank</span><button data-r="bank75" class="${D.bank===75?'on':''}">75 Ω</button><button data-r="bank110" class="${D.bank===110?'on':''}">110 Ω</button>
    <span class="small muted" style="margin-left:8px">Mode</span>${[1,2,4].map(m=>`<button data-r="mode${m}" class="${D.mode===m?'on':''}">${m}</button>`).join('')}
    <span class="small muted" style="margin-left:8px">Ref</span>${['INT','75','110'].map(r=>`<button data-r="ref${r}" class="${D.ref===r?'on':''}">${r==='INT'?'Int':r+' Ω'}</button>`).join('')}
    <button data-r="dolby" class="${D.dolbyCard?'on':''}">Dolby card</button><button data-r="sdi" class="${D.sdiLock?'on':''}">SDI ${D.sdiLock?'locked':'unlocked'}</button><button data-r="reset">Reset bench</button></div>
    <table class="kv" style="margin-top:8px"><tr><th>Display</th><td class="mono">“${displayText()}”</td><th>Speakers / AES out</th><td><b style="color:${au.cls==='bad'?'var(--bad)':au.cls==='ok'?'var(--accent)':'var(--ink2)'}">${au.q}</b> <span class="small muted">${au.why}</span></td></tr>
    <tr><th>Lock read</th><td class="mono">${isIss5()?`alteraRead(0x00) = 0x${lockByte().toString(16).padStart(2,'0')}`:'CS8416_read1..4(0x0C)'}</td><th>Reference</th><td class="small">${refSource()}</td></tr></table>`;
}
function cfgHTML(){
  const r=cfgFit(D.cfgFpga,D.cfgDev);
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
    <label class="small">FPGA <select id="rdF">${Object.keys(FPGAS).map(f=>`<option ${f===D.cfgFpga?'selected':''}>${f}</option>`).join('')}</select></label>
    <label class="small">Config device <select id="rdC">${Object.keys(DEVS).map(d=>`<option value="${d}" ${d===D.cfgDev?'selected':''}>${DEVS[d]}</option>`).join('')}</select></label>
    <label class="small">DCLK <select id="rdK"><option value="40" ${D.dclk===40?'selected':''}>40 MHz (nominal)</option><option value="20" ${D.dclk===20?'selected':''}>20 MHz (slow corner)</option></select></label>
    <button id="rdProg">Program over AS</button></div>
    <div style="margin-top:8px;height:22px;border:1px solid var(--line);border-radius:5px;position:relative;background:var(--lane);overflow:hidden">
      <div style="height:100%;width:${Math.min(100,r.pct)}%;background:${r.ok?'var(--accent)':'var(--bad)'};opacity:.8"></div>
      <span class="mono small" style="position:absolute;left:8px;top:2px">${r.bits.toLocaleString()} / ${r.cap.toLocaleString()} bits = ${r.pct.toFixed(1)} % ${r.ok?'— fits':'— does NOT fit'}</span></div>
    <p class="small">${r.note}. Load time ≈ <b>${(r.t*1e3).toFixed(0)} ms</b>. ${D.programmed===true?'<b style="color:var(--accent)">Programmed and verified.</b>':D.programmed===false?'<b style="color:var(--bad)">Programming failed.</b>':''}</p>
    <table class="kv small"><tr><th>Where the choice is written</th><th>Says</th></tr>
      <tr><td>${M('AMS81.qsf')} (every iss5 revision, both device revisions)</td><td>${M('CYCLONE_CONFIGURATION_DEVICE EPCS1')} — inherited from the 2004 EP1C6 project (ORIGINAL_QUARTUS_VERSION 4.1 SP2)</td></tr>
      <tr><td>${M('AMS81.cdf')} v100, v101</td><td>EPCS1, empty path</td></tr>
      <tr><td>${M('AMS81.cdf')} v102 … vcurrent; ${M('ams81-ep4ce30.cdf')}</td><td>EPCS16, path ${M('H:/Engineering/RD/RD60-…/software/altera/V107/')}</td></tr>
      <tr><td>${M('AMS81.jdi')}</td><td>${M('AMS81.pof')} for EPCS16, checksum 0x1A7E0549 (sof 0x007BAF2E) — the image was built, though no .pof is archived</td></tr>
      <tr><td>ISS5 BOM / PnP</td><td>U13 ${M('M25P16-VMF6P')}, SO16-300 mil</td></tr>
      <tr><td>ISS4 BOM (2009)</td><td>${M('M25P40-VMN6P')} placed with the ${M('EPCS1')} component</td></tr></table>`;
}
function viewSim(m){
  window.__rd60Active=false;
  m.innerHTML = `<div class="card"><h2>Before / after: the AMS81A on the ISS5 board</h2>
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">${stepSelect()}
      <button data-r="before">Before (ISS2/3)</button><button data-r="after">After (V050000)</button><button data-r="master">AMS81 master V050001</button></div>
      <p class="small muted" id="rdNote" style="margin:6px 0 0">${ST().note}</p></div>
    <div class="grid2"><div>
      ${card('Boards to scale — click a part', `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div>${boardSVG('before')}</div><div>${boardSVG('after')}</div></div>
        <div class="small" style="margin-top:6px">${Object.entries({gone:'removed',kept:'kept',new:'new',same:'unchanged'}).map(([k,l])=>`<span class="chip" style="border-color:${KCOL[k]}"><span style="color:${KCOL[k]}">■</span> ${l}</span>`).join('')}</div>
        <div id="rdPart" style="margin-top:6px">${partInfo()}</div>
        <p class="small muted">Drawings: page 1 of ${M('AMS8E-1ISS2-ASSY.pdf')} (rotated) and ${M('AMS8E-1-ISS5-Assy-drawing.pdf')}. Overlays: ISS2 PnP centres and ISS5 IPC-356 pin extents, which share one CAD frame.</p>`)}
      ${card('Rear panel and front display (AMS8-1A silk) — click jacks and INPUTS', `${rearSVG()}<div style="height:6px"></div>${frontSVG()}${artNote()}<div style="margin-top:8px">${benchHTML()}</div>`)}
    </div><div>
      ${card('Configuration chip: will the bitstream fit?', cfgHTML())}
      ${card('Firmware trace', `<div class="log" id="rdLog">${D.log.map(e=>`<div><b>${SIM.fmtT(e.t)}</b> ${e.name}<br>${e.tr.map(x=>'· '+x).join('<br>')}</div>`).join('')||'<span class="muted">Click a jack, button or build step.</span>'}</div>`)}
    </div></div>
    ${card('Timeline', `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:6px"><span class="small muted">Scenario</span><button data-r="scenboot" class="${D.scen==='boot'?'on':''}">Power-up</button><button data-r="scenrun" class="${D.scen==='run'?'on':''}">Running: SDI re-lock 0.30 s + event at 0.70 s</button>
      <label class="small">event at 0.70 s <select id="rdEv"><option value="ref" ${D.ev2==='ref'?'selected':''}>REF IN unplugged</option><option value="aes1" ${D.ev2==='aes1'?'selected':''}>AES1 removed, back at 0.85 s</option><option value="none" ${D.ev2==='none'?'selected':''}>none</option></select></label></div><canvas id="rdTl"></canvas>`)}`;
  wire(m);
  SIM.on('time', ()=>{ SIM.drawLanes(m.querySelector('#rdTl'), lanes(), {labelW:210}); });
}
function wire(m){
  bindPanels(m);
  const q=s=>m.querySelector(s);
  if (q('#rdStep')) q('#rdStep').onchange=e=>{ A.step(+e.target.value); };
  m.querySelectorAll('[data-r]').forEach(b=>b.addEventListener('click',()=>{ const r=b.dataset.r;
    if (r==='before') A.step(0); else if (r==='after') A.step(LAST_RD); else if (r==='master') A.step(12);
    else if (r.startsWith('bank')) A.bank(+r.slice(4)); else if (r.startsWith('mode')) A.mode(+r.slice(4)); else if (r.startsWith('ref')) A.ref(r.slice(3));
    else if (r==='dolby') A.dolby(); else if (r==='sdi') A.sdi(!D.sdiLock); else if (r==='reset') A.reset();
    else if (r==='scenboot'){ D.scen='boot'; } else if (r==='scenrun'){ D.scen='run'; }
    rerender(); }));
  if (q('#rdF')) q('#rdF').onchange=e=>{ A.cfg(e.target.value,D.cfgDev); rerender(); };
  if (q('#rdC')) q('#rdC').onchange=e=>{ A.cfg(D.cfgFpga,e.target.value); rerender(); };
  if (q('#rdK')) q('#rdK').onchange=e=>{ D.dclk=+e.target.value; rerender(); };
  if (q('#rdProg')) q('#rdProg').onclick=()=>{ A.program(); rerender(); };
  if (q('#rdEv')) q('#rdEv').onchange=e=>{ D.ev2=e.target.value; rerender(); };
}
let curTab='sim';
function rerender(){ const y=window.scrollY; SIM.openTab(curTab); window.scrollTo(0,y); }

/* ---------------- tutorial ---------------- */
const TUT = [
  {t:'Look at the old board', b:`Start where the engineer started: the ISS2/3 main board. Press <b>Before (ISS2/3)</b> and click the four CS8416 chips (U4, U6, U9, U12) on the left drawing. Each AES pair had its own receiver and its own AD1895 sample-rate converter next to it.`, h:'The parts are the red-outlined boxes in the column left of the big EP1C6.', ok:()=>D.step===0 && ['b:U4','b:U6','b:U9','b:U12'].filter(k=>D.fpgaClicked[k]).length>=2},
  {t:'Find where they went', b:`Press <b>After (V050000)</b> and click <b>U4</b> on the right-hand ISS5 drawing. The EP4CE40 replaces the EP1C6 and swallows all four receive chains: ${M('aes3_2_i2s')} ×4 and the Altera SRC reference design. Only U24 (CS8416) and U10 (AD1895) remain, for the reference input.`, h:'U4 is the large green box in the middle of the ISS5 drawing.', ok:()=>isIss5() && D.fpgaClicked['a:U4']},
  {t:'v100: pick a configuration chip', b:`The new FPGA must load from serial flash. The project still says ${M('CYCLONE_CONFIGURATION_DEVICE EPCS1')}. Set FPGA = EP4CE40 and config device = EPCS1, press <b>Program over AS</b> and watch it fail. Then choose the M25P16 and program again.`, h:'The configuration card is top right on the Simulator tab.', ok:()=>D.cfgFpga!=='EP1C6' && D.cfgDev.match(/16/) && D.programmed===true && D.log.some(e=>/Program EPCS1/.test(e.name))},
  {t:'v101 → v102: get clean audio', b:`Set the build to <b>v101</b>: the cores are in but the SRC gives no LRCLK and the audio is "noisy". Move to <b>v102</b>: clean on the 75 Ω bank.`, h:'Use the Build drop-down. The bench line "Speakers / AES out" tells you what Bob heard.', ok:()=>D.log.some(e=>/v101/.test(e.name)) && D.step>=3 && audioState().q==='clean'},
  {t:'v103: the 110 Ω bank', b:`At v102 select the <b>110 Ω</b> bank: no lock ("only input H9 works"). Load <b>v103</b>, where four ${M('ALT_INBUF')} input buffers were added, and the 110 Ω input locks.`, h:'IN 1 on the 110 Ω Phoenix block is plugged by default.', ok:()=>D.bank===110 && D.step>=4 && coreLock(D.inputNo-1)},
  {t:'Atmel v101: "No Lock" in Mode 1', b:`Fit the Dolby card, set Mode 1 on build <b>V107</b>: the display says “ No Lock” although audio is present. Atmel v101 (Feb 4) re-enabled ${M('cs8416_reset')}; load <b>v108</b> and the display shows PCM.`, h:'Mode buttons are on the bench line under the panels.', ok:()=>D.mode===1 && D.dolbyCard && D.step>=7 && displayText().trim()==='PCM'},
  {t:'v102/v103v1: losing the reference', b:`On <b>v108</b> set Ref 75 Ω, plug the 75 Ω REF IN (the BNC left of IN 1), then unplug it. The unit falls back to the internal clock (Atmel v102), but the Dolby audio is distorted. Load <b>v103v1</b> and repeat: ${M('RESET_CS8416_REF')} now pulses the CAT552 reset.`, h:'Keep Mode 1 and the Dolby card from the last step.', ok:()=>D.step>=9 && D.log.some(e=>/reference removed/.test(e.name) && e.tr.some(x=>/CAT552 reset/.test(x)))},
  {t:'v104: SDI re-lock costs a quarter second', b:`Load <b>V050000</b>, open the <b>Running</b> scenario and look at 0.30 s on the timeline: on an SDI lock edge the main loop sits in ${M('wait_ms')} for three × 82 ms while the Dolby card is reset. Seek the playhead into that gap.`, h:'Click inside the timeline to seek; the red bar is the freeze.', ok:()=>D.scen==='run' && D.step>=10 && frozenAt(SIM.t)},
  {t:'Power-up: when does the FPGA come alive?', b:`Switch to the <b>Power-up</b> scenario. The ATmega holds nCONFIG low through nine ${M('wait_ms(500)')} calls, releases it in ${M('CONFIGURE_ALTERA')}, and only then does the EP4CE40 read 9.5 Mbit from U13. Seek past CONF_DONE.`, h:'Use the 250 ms zoom around 0.8–1.1 s.', ok:()=>D.scen==='boot' && isIss5() && SIM.t>boot().cfgEnd},
  {t:'Check the result against the master', b:`Open the <b>Findings</b> tab and read the SHA-256 table: the RD60 FPGA "vcurrent" is byte-identical to the AMS81 master V050000, the SHARC to v205 and the front panel to V040000; the main-board code differs from master V050000 only in comments. Press the button below when done.`, h:'The table is the second card on Findings.', ok:()=>D.hashOpen},
];
function viewTutorial(m){
  window.__rd60Active=false;
  const L=TUT[D.tut], done=L.ok();
  if (done) D.tutSeen[D.tut]=1;
  m.innerHTML = `<div class="grid2"><div>${card(`Step ${D.tut+1} of ${TUT.length}: ${L.t}`, `<p>${L.b}</p>
      <p class="small"><b>Goal:</b> <span style="color:${done?'var(--accent)':'var(--warn)'}">${done?'✔ done':'not yet'}</span> · <span class="muted">Hint: ${L.h}</span></p>
      <div style="display:flex;gap:6px"><button id="tPrev" ${D.tut?'':'disabled'}>◀ previous</button><button id="tNext" ${D.tut<TUT.length-1?'':'disabled'}>next ▶</button>${D.tut===TUT.length-1?'<button id="tHash">I have read the hash table</button>':''}</div>
      <ol class="small" style="margin-top:10px">${TUT.map((x,i)=>`<li style="${i===D.tut?'font-weight:600':''}">${D.tutSeen[i]?'✔ ':''}${x.t}</li>`).join('')}</ol>`)}
      ${card('Bench', `${stepSelect()}<div style="margin-top:6px">${rearSVG()}</div><div style="height:4px"></div>${frontSVG()}${artNote()}<div style="margin-top:6px">${benchHTML()}</div>`)}</div>
    <div>${card('Boards', `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px"><div>${boardSVG('before')}</div><div>${boardSVG('after')}</div></div><div style="margin-top:6px">${partInfo()}</div>`)}
      ${card('Configuration', cfgHTML())}
      ${card('Timeline', `<button data-r="scenboot" class="${D.scen==='boot'?'on':''}">Power-up</button> <button data-r="scenrun" class="${D.scen==='run'?'on':''}">Running</button><canvas id="rdTl"></canvas>`)}
      ${card('Trace', `<div class="log">${D.log.slice(0,8).map(e=>`<div><b>${SIM.fmtT(e.t)}</b> ${e.name}<br>${e.tr.map(x=>'· '+x).join('<br>')}</div>`).join('')}</div>`)}</div></div>`;
  wire(m);
  m.querySelector('#tPrev').onclick=()=>{ D.tut=Math.max(0,D.tut-1); rerender(); };
  m.querySelector('#tNext').onclick=()=>{ D.tut=Math.min(TUT.length-1,D.tut+1); rerender(); };
  const th=m.querySelector('#tHash'); if (th) th.onclick=()=>{ D.hashOpen=true; rerender(); };
  let last=done;
  SIM.on('time', ()=>{ SIM.drawLanes(m.querySelector('#rdTl'), lanes(), {labelW:190}); const now=TUT[D.tut].ok(); if (now!==last){ last=now; rerender(); } });
}

/* ---------------- one second ---------------- */
function readout(t){
  if (D.scen==='boot'){ const b=boot();
    const ph = t<b.init?'MCU initialization()' : t<b.release-200*K.WMS?`boot delay: wait_ms(500) #${Math.min(9,1+Math.floor((t-b.init)/K.W500))} of 9` : t<b.release?'CONFIGURE_ALTERA: nCONFIG held low (wait_ms(100)×2 = 33 ms)' : t<b.cfgStart?'nCONFIG released, nSTATUS rising' : t<b.cfgEnd?`AS configuration: ${Math.round((t-b.cfgStart)*b.f).toLocaleString()} of ${b.bits.toLocaleString()} bits` : t<b.user?'FPGA initialization':'FPGA in user mode';
    const mcu = t<b.release?'—': t<b.recallEnd?'RECALL_MODE_FROM_EEPROM / RECALL_MIX_FROM_EEPROM' : t<b.rw1?'first ALTERA_read_write (FPGA not configured yet!)' : t<b.cs?'init_CS8416':t<b.shEnd?'RESET_SHARC (10 "ms" = 1.6 ms)':`main loop, ALIGNMENT_CHECK ${t>b.user+0.001?'matches "V201"':'misses (error_checker counting to 200)'}`;
    return `<table class="kv"><tr><th>Board</th><td>${b.c4?'ISS5 EP4CE40 + U13 M25P16':'ISS2/3 EP1C6 + U13 EPCS1'}</td></tr><tr><th>FPGA</th><td>${ph}</td></tr><tr><th>Main MCU</th><td>${mcu}</td></tr>
      <tr><th>Key times</th><td class="mono small">nCONFIG release ${SIM.fmtT(b.release)} · CONF_DONE ${SIM.fmtT(b.cfgEnd)} · user ${SIM.fmtT(b.user)}</td></tr></table>`;
  }
  const f=Math.floor(t*K.FS), cell=Math.floor(t*K.CELL)%128, ch=cell<64?'A (left)':'B (right)', slot=Math.floor((cell%64)/2), fr=frozenAt(t), st=loopStepAt(t);
  return `<table class="kv"><tr><th>AES frame</th><td>#${f} (block frame ${f%192}) · subframe ${ch} · slot ${slot} ${slot<4?'(preamble)':slot<8?'(aux)':slot<28?'(audio)':['(V)','(U)','(C)','(P)'][slot-28]}</td></tr>
    <tr><th>aes3_2_i2s</th><td>${Math.floor((t*K.F98)%16)} of 16 clk_in ticks in this cell</td></tr>
    <tr><th>Main loop</th><td>${fr?'<b style="color:var(--bad)">frozen in wait_ms after SDI lock</b>':LOOP[st][0]}</td></tr></table>`;
}
function viewSecond(m){
  window.__rd60Active=false;
  m.innerHTML = `${card('One second (and a bit) in slow motion', `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${stepSelect()}<button data-r="scenboot" class="${D.scen==='boot'?'on':''}">Power-up</button><button data-r="scenrun" class="${D.scen==='run'?'on':''}">Running</button>
      <button data-r="before">ISS2/3</button><button data-r="after">ISS5</button><label class="small">DCLK <select id="rdK"><option value="40" ${D.dclk===40?'selected':''}>40 MHz</option><option value="20" ${D.dclk===20?'selected':''}>20 MHz</option></select></label></div>
      <p class="small">Power-up runs 1.3 s because the ISS5 FPGA only reaches user mode at ≈1.01 s (≈1.25 s at the 20 MHz DCLK corner). Every wait in the main MCU uses the measured cost of ${M('wait_ms')}: 808 cycles at 4.9152 MHz = 164 µs per "ms". Zoom to 10 µs to see AES biphase cells, to 1 µs for DCLK.</p><canvas id="rdTl"></canvas>`)}
    ${card('At the playhead', `<div id="rdRO"></div>`)}
    ${card('Where the numbers come from', `<table class="kv small">
      <tr><td>wait_ms = 164.4 µs, wait_us = 5.7 µs</td><td>cycle count of ${M('_wait_ms')} / ${M('_wait_us')} in ${M('v200w.lis')} (ICCAVR output), X2 = 4.9152 MHz (BOM)</td></tr>
      <tr><td>nCONFIG low from reset</td><td>${M('port_init')}: PORTB = 0xF4, DDRB = 0xFB → PB7 (ALTERA_RESET, U14-17) high → R181 → Q1 → N_CONFIG (IPC netlist)</td></tr>
      <tr><td>9,534,304 bits, 40 MHz DCLK</td><td>cyiv-51008 (Cyclone IV handbook ch. 8, archived in RD10)</td></tr>
      <tr><td>EP1C6 1,167,216 bits, 20 MHz</td><td>${INF} — Cyclone I figures are not in the archive</td></tr>
      <tr><td>98.304 MHz, ÷2048 LRCLK, ÷32 SCLK</td><td>altpll0/1/2.v, ${M('AMS81.sdc')} (V107 generated clocks)</td></tr>
      <tr><td>4 ms main-loop pass, 4 µs SPI bit</td><td>${INF} (ams81.js estimate; bit-bang cost)</td></tr></table>`)}`;
  wire(m);
  SIM.on('time', ()=>{ SIM.drawLanes(m.querySelector('#rdTl'), lanes(), {labelW:220}); m.querySelector('#rdRO').innerHTML=readout(SIM.t); });
}

/* ---------------- block diagram ---------------- */
const BLK = {
  before:[
    {id:'rx',x:10,y:30,w:120,h:60,t:'DS34LV86T ×3',s:['AES IN 1–8','75 Ω BNC / 110 Ω'],d:'Line receivers U8, U11, U27.'},
    {id:'f1',x:160,y:20,w:150,h:200,t:'EP1C6 (U21)',s:['aes_input_router ×2','AES_IN_n → AES8416_n','quad_selector ×2','router · tdm_i2sx5','i2sx4_aes (outputs)'],d:'v203Original: a mux and TDM design with 127 pins assigned in the qsf. No AES decoding inside.'},
    {id:'cs',x:340,y:20,w:120,h:90,t:'CS8416 ×4',s:['U4 U6 U9 U12','RMCK1–4 → FPGA'],d:'Receive, lock, PLL. Lock read by CS8416_read1..4(0x0C).'},
    {id:'src',x:340,y:130,w:120,h:90,t:'AD1895 ×4',s:['U3 U5 U7 U10','SRCDATA/LRCLK/SCLK'],d:'Asynchronous SRC to the local 48 kHz; MCLK from DSP_CLK_OUT.'},
    {id:'dsp',x:490,y:60,w:110,h:80,t:'ADSP-21065',s:['TDM SPORT0/1','meters, mix'],d:'v205.'},
    {id:'mcu',x:160,y:240,w:150,h:60,t:'ATmega128',s:['5 CS8416 selects','80-byte chain'],d:'CS8416_SEL1–5 on U14-47/46/45/44/32.'},
    {id:'ref',x:340,y:240,w:120,h:60,t:'CS8416 U24 (ref)',s:['REF 75/110'],d:'Fifth receiver for the reference.'},
    {id:'cfg',x:10,y:240,w:120,h:60,t:'EPCS1 (SO8)',s:['1 Mbit'],d:'Configuration flash.'},
  ],
  after:[
    {id:'rx',x:10,y:30,w:120,h:60,t:'DS34LV86T ×5',s:['AES IN 1–16','(9–16 unused)'],d:'U8, U11 feed the AMS81; U12, U29 add AES 9–16 for 32ME.'},
    {id:'f4',x:160,y:10,w:300,h:220,t:'EP4CE40F23C6 (U4)',s:['ALT_INBUF ×4 (inst84–87)','input_SELECTOR2 → aes3_2_i2s ×4','resampler / src_aes_example_top','router (input_selector8, bypass_SELECTOR)','i2sx5_tdm / tdm_i2sx5 → SHARC','i2s_2_aes3 + i2sx4_aes → AES OUT','spicontrol (reg 0x00 = aesrx_lock)','altpll0/1/2 → 98.304 MHz'],d:'V050000 = v109 RTL. Altera SRC reference design (©2005, built for Cyclone II/III kits) re-targeted.'},
    {id:'dsp',x:490,y:60,w:110,h:80,t:'ADSP-21065',s:['unchanged v205'],d:'Hash-identical to master v205.'},
    {id:'mcu',x:160,y:240,w:150,h:60,t:'ATmega128',s:['PC0–3 SPI to FPGA','NCE, AS bus'],d:'altspi.c (Glenn Greig, M6205, 2010).'},
    {id:'ref',x:340,y:240,w:120,h:60,t:'CS8416 U24',s:['MCLK_REF → B12'],d:'Only clock-recovery job left.'},
    {id:'u10',x:490,y:240,w:110,h:60,t:'AD1895 U10',s:['no MCLK — idle'],d:'Pins unassigned in AMS81.qsf.'},
    {id:'cfg',x:10,y:240,w:120,h:60,t:'M25P16 (SO16)',s:['16 Mbit'],d:'EPCS16-compatible.'},
  ],
};
function blockSVG(which){
  const B=BLK[which]; let s=`<svg viewBox="0 0 610 310" style="width:100%;display:block" role="img" aria-label="${which} block diagram"><rect width="610" height="310" fill="var(--lane)" rx="6"/>`;
  const arrow=(x1,y1,x2,y2)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink2)" stroke-width="1.6" marker-end="url(#rdar)"/>`;
  s+=`<defs><marker id="rdar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ink2)"/></marker></defs>`;
  if (which==='before') s+=arrow(130,60,160,60)+arrow(310,50,340,50)+arrow(400,110,400,130)+arrow(340,190,310,190)+arrow(310,100,490,100)+arrow(235,240,235,220)+arrow(400,240,340,200)+arrow(130,270,160,180);
  else s+=arrow(130,60,160,60)+arrow(460,100,490,100)+arrow(235,240,235,230)+arrow(400,240,400,230)+arrow(130,270,160,200);
  for (const b of B){ const sel=D.blockPick===which+':'+b.id;
    s+=`<g class="rdblk" data-b="${which}:${b.id}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="6" fill="var(--panel)" stroke="${sel?'var(--accent)':'var(--line)'}" stroke-width="${sel?3:1.5}"/>
      <text x="${b.x+6}" y="${b.y+16}" font-size="12" font-weight="600" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+6}" y="${b.y+32+i*15}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
  return s+'</svg>';
}
function viewBlock(m){
  window.__rd60Active=false;
  const pk=D.blockPick && BLK[D.blockPick.split(':')[0]].find(b=>b.id===D.blockPick.split(':')[1]);
  m.innerHTML = `<div class="grid2">${card('Before: ISS2/3 + v203Original', blockSVG('before'))}${card('After: ISS5 + V050000', blockSVG('after'))}</div>
    ${card('Selected block', pk?`<b>${pk.t}</b><p class="small">${pk.d}</p>`:'<span class="muted">Click a block.</span>')}
    ${card('Pin budget (from the two .qsf files)', `<table class="kv small"><tr><th></th><th>v203Original EP1C6</th><th>V050000 EP4CE40</th></tr>
      <tr><td>assigned pins</td><td>127</td><td>102</td></tr>
      <tr><td>gone</td><td colspan="2">${M('BYPASS1–4, RMCK1–4, SCLK1–4, LRCLK1–4, SRCDATA1–4, AES8416_1–4, DSP_clk_out')} (25 pins to the CS8416/AD1895 chains), ${M('t5')}</td></tr>
      <tr><td>new</td><td colspan="2">${M('DATA_OUT_1')} (was unassigned), AES_IN_n now terminate in the FPGA; ${M('portc0–3')} carry spicontrol</td></tr>
      <tr><td>wired on ISS5 but unassigned</td><td colspan="2">AES_IN9–16 / AES_OUT9–16, EN_AES1-4 … 13-16, all of P13 (CAT1100), H4 i64, AD1895 U10 control, LRCLK/SCLK_REF_FPGA, AES_75/110REF_IN, CS8416 GPO0–2</td></tr></table>`)}`;
  m.querySelectorAll('.rdblk').forEach(g=>g.addEventListener('click',()=>{ D.blockPick=g.dataset.b; rerender(); }));
}

/* ---------------- schematics (redrawn) ---------------- */
function chip(x,y,w,name,left,right,title){
  const h=Math.max(left.length,right.length)*18+28; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y+15}" font-size="12" text-anchor="middle" font-weight="600" fill="var(--ink)">${name}</text>`;
  if (title) s+=`<text x="${x+w/2}" y="${y+h+14}" font-size="10" text-anchor="middle" fill="var(--ink2)">${title}</text>`;
  left.forEach((p,i)=>{ const yy=y+34+i*18; s+=`<line x1="${x-60}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink2)"/><text x="${x+4}" y="${yy+4}" font-size="10" fill="var(--ink)">${p[0]}</text><text x="${x-58}" y="${yy-3}" font-size="10" fill="var(--accent2)">${p[1]}</text>`; });
  right.forEach((p,i)=>{ const yy=y+34+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+60}" y2="${yy}" stroke="var(--ink2)"/><text x="${x+w-4}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${p[0]}</text><text x="${x+w+4}" y="${yy-3}" font-size="10" fill="var(--accent2)">${p[1]}</text>`; });
  return s;
}
const SCH = [
  {t:'1 · FPGA configuration (ISS5, with the ISS3 part for comparison)', svg:()=>`<svg viewBox="0 0 900 440" style="width:100%">
    ${chip(90,20,130,'U13 M25P16 SO16',[['7 S#','NCS'],['16 C','DCLK'],['15 D','ASDI'],['8 Q','CNF_DATA']],[],'ISS5 (was EPCS1 SO8: pins 1,6,5,2)')}
    ${chip(380,20,150,'U4 EP4CE40',[['E2 nCSO','NCS'],['K2 DCLK','DCLK'],['D1 ASDO','ASDI'],['K1 DATA0','R97 25R5'],['K5 nCONFIG','N_CONFIG'],['L3 nCE','NCE'],['M18 CONF_DONE','CONF_DONE'],['K6 nSTATUS','R186']],[],'Cyclone IV E')}
    ${chip(660,20,140,'U14 ATmega128L',[],[['48 PA3','NCS'],['51 PA0','DCLK'],['49 PA2','ASDI'],['50 PA1','CNF_DATA'],['47 PA4','NCE'],['5 PE3','N_CONFIG'],['17 PB7','ALTERA_RESET']],'pins per IPC netlist; port names inferred')}
    ${chip(120,230,130,'H2 AS header',[['1','DCLK'],['3','CONF_DONE'],['5','N_CONFIG'],['6','NCE'],['7','CNF_DATA'],['8','NCS'],['9','ASDI']],[])}
    <text x="380" y="300" font-size="11" fill="var(--ink)">ALTERA_RESET (PB7) → R181 → Q1 (2N4401) collector → N_CONFIG</text>
    <text x="380" y="318" font-size="11" fill="var(--ink2)">CONFIGURE_ALTERA: PB7=1 (Q1 on, nCONFIG low), wait_ms(100)×2, PB7=0</text>
    <text x="380" y="336" font-size="11" fill="var(--ink2)">R97 25R5 on DATA0: the handbook's 25 Ω series resistor</text>
    <text x="380" y="354" font-size="11" fill="var(--ink2)">ISS3: EPCS1 SO8 pins 1 nCS, 6 DCLK, 5 ASDI, 2 DATA; nCE pulled by R30 (not MCU)</text>
    <text x="10" y="430" font-size="10" fill="var(--warn)">Redrawn from Ams8e-1iss5-net.ipc and AMS8E-1iss3.net — not the original Altium/P-CAD sheet.</text></svg>`},
  {t:'2 · Reference clock (ISS5)', svg:()=>`<svg viewBox="0 0 900 410" style="width:100%">
    ${chip(80,20,130,'U27 DS34LV86T',[],[['5','AES_75REF_IN'],['3','AES_110REF_IN']],'also to U4-B14 / A14 (unassigned)')}
    ${chip(330,20,150,'U24 CS8416',[['3 RXP1','AES_75REF_IN'],['2 RXP2','AES_110REF_IN'],['4 RXP0','AES_REF_FPGA'],['15/16/17','CS8416_IN/CLK/OUT'],['14 CS','CS8416_SEL'],['9 RST','CS8416_RESET']],[['24 RMCK','MCLK_REF'],['27 OSCLK','SCLK_REF_FPGA'],['28 OLRCK','LRCLK_REF_FPGA'],['26 SDOUT','DATA_OUTCS8416']],'register 4: 0x80 / 0x88 / 0x92')}
    ${chip(620,20,160,'U4 EP4CE40',[['B12 AES5_REF_MCLK','MCLK_REF'],['A13 AES-5_ref_out','AES_REF_FPGA'],['A12 (unassigned)','SCLK_REF_FPGA'],['B13 (unassigned)','LRCLK_REF_FPGA'],['C15 (unassigned)','DATA_OUTCS8416']],[['altpll1','×8 → 98.3M']],'')}
    ${chip(330,230,150,'U10 AD1895',[['2 MCLK_I','MCLK_INAD1895'],['4 SDATA_I','DATA_OUTCS8416'],['5/6','SCLK/LRCLK_REF_FPGA'],['13 RST','CS8416_RESET']],[['3 MCLK_O','→ U4-G22'],['9 BYPASS','→ U4-H22']],'MCLK_IN from U4-F22 — never assigned: idle')}
    <text x="10" y="400" font-size="10" fill="var(--warn)">Redrawn from Ams8e-1iss5-net.ipc + AMS81.qsf (V050000). CS8416 pin functions from its standard pin-out ${'(inferred)'}.</text></svg>`},
  {t:'3 · AES receive path, before and after', svg:()=>`<svg viewBox="0 0 900 380" style="width:100%">
    <text x="10" y="16" font-size="12" font-weight="600" fill="var(--ink)">ISS3 (AMS8E-1iss3.net)</text>
    ${chip(90,26,120,'U21 EP1C6',[['14','AES1'],['11','RMCK1'],['12','BYPASS1']],[['13','DSP_CLK_OUT'],['15','SRCDATA1'],['16/17','LRCLK1/SCLK1']])}
    ${chip(360,26,110,'U4 CS8416',[['4 RXP0','AES1'],['14 CS','CS8416_SEL1']],[['24 RMCK','RMCK1']])}
    ${chip(620,26,110,'U3 AD1895',[['2 MCLK_I','DSP_CLK_OUT'],['9 BYPASS','BYPASS1']],[['23','SRCDATA1'],['24/25','LRCLK1/SCLK1'],['3 MCLK_O','MCLKOUT1 → U5']])}
    <text x="10" y="200" font-size="12" font-weight="600" fill="var(--ink)">ISS5 (IPC netlist + AMS81.bdf)</text>
    ${chip(90,210,140,'U8 DS34LV86T',[],[['3','AES_IN1 → Y22'],['13','AES_IN2 → W22'],['5','AES_IN3 → Y21'],['11','AES_IN4 → W21'],['4,12 EN/EN*','EN_AES1-4 (C13)']])}
    <rect x="420" y="210" width="440" height="120" fill="var(--panel)" stroke="var(--ink)"/><text x="430" y="228" font-size="12" font-weight="600" fill="var(--ink)">U4 EP4CE40 — AMS81.bdf</text>
    <text x="430" y="250" font-size="11" fill="var(--ink)">AES_IN_1..8 → ALT_INBUF inst84–87 → input_SELECTOR2 (75/110)</text>
    <text x="430" y="268" font-size="11" fill="var(--ink)">→ aes3_2_i2s inst37/38/46/47 (clk_in 98.304 MHz, double_resolution)</text>
    <text x="430" y="286" font-size="11" fill="var(--ink)">→ src_aes_example_top inst66 / resampler inst40 → router → i2sx5_tdm</text>
    <text x="430" y="304" font-size="11" fill="var(--ink)">aes3_input_detected → aesrx_lock[7..0] → spicontrol inst41 (reg 0x00)</text>
    <text x="10" y="370" font-size="10" fill="var(--warn)">Redrawn from netlists and the .bdf instance list — not the original schematic. DS34LV86T EN/EN* behaviour from its data sheet (inferred).</text></svg>`},
];
function viewSchem(m){
  window.__rd60Active=false;
  m.innerHTML = card('Schematic set — redrawn, not the original CAD', `<div style="display:flex;gap:6px;flex-wrap:wrap">${SCH.map((s,i)=>`<button data-s="${i}" class="${D.sch===i?'on':''}">${s.t}</button>`).join('')}</div><div style="margin-top:8px">${SCH[D.sch].svg()}</div>`)
   + card('Pin audit: AMS81.qsf against the ISS5 netlist', `<p class="small">All 102 ${M('set_location_assignment')} lines of V050000 land on the IPC net of the same name (for example ${M('AES_IN_1 → Y22 → AES_IN1 → U8-3')}, ${M('portc4 → A18 → DPCLK5 → U14-39')}, ${M('MUTE → B21 → R2')}). Mismatches in naming only: ${M('AES5_REF_MCLK')} = net ${M('MCLK_REF')}, ${M('AES-5_ref_out')} = ${M('AES_REF_FPGA')}, ${M('DAC_MCK/DAC_SCLK')} go through R187/R188.</p>`);
  m.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{ D.sch=+b.dataset.s; rerender(); });
}

/* ---------------- software ---------------- */
function viewSoft(m){
  window.__rd60Active=false;
  m.innerHTML = `<div class="grid2"><div>${card('Main loop (v200w.c main(), vcurrent) — running step highlighted', `<div style="display:flex;gap:6px;margin-bottom:6px"><button data-r="scenboot" class="${D.scen==='boot'?'on':''}">Power-up</button><button data-r="scenrun" class="${D.scen==='run'?'on':''}">Running</button></div><ol class="small mono" id="rdLoop">${LOOP.map(l=>`<li>${l[0]}</li>`).join('')}</ol><p class="small muted">Step shares of the 4 ms pass are ${INF}; the order is the source's.</p>`)}
    ${card('Lock status, end to end', `<div id="rdLock"></div>`)}</div><div>
    ${card('spicontrol.v — the only register', `<svg viewBox="0 0 520 120" style="width:100%"><rect width="520" height="120" fill="var(--lane)"/>
      ${Array.from({length:16},(_,i)=>`<rect x="${10+i*31}" y="30" width="29" height="30" fill="${i===0?'var(--warn)':i<8?'var(--accent2)':'var(--accent)'}" opacity=".75"/><text x="${24+i*31}" y="50" font-size="10" text-anchor="middle" fill="#fff">${i===0?'R/W':i<8?'A'+(7-i):'D'+(15-i)}</text><text x="${24+i*31}" y="75" font-size="9" text-anchor="middle" fill="var(--ink2)">cnt ${i}</text>`).join('')}
      <text x="10" y="20" font-size="11" fill="var(--ink)">CS high (PC2) · MSB first · data out on SCLK rising (PC0), read back on PC3</text>
      <text x="10" y="100" font-size="10.5" fill="var(--ink2)">cnt 7: address latched; read of 7'h00 preloads shift_out = aesrx_lockx. cnt 15: write commits (7'h02 → reg "test", unused).</text></svg>
      <table class="kv small"><tr><th>Address</th><th>Dir</th><th>Content</th><th>Source</th></tr><tr><td>0x00</td><td>R</td><td>aesrx_lock[7..0], 1 = locked</td><td>ControlDescription_Jan212013.docx</td></tr><tr><td>0x02</td><td>W</td><td>test[7:0] — goes nowhere</td><td>spicontrol.v</td></tr>
      <tr><td>0x0E, 0x0F, 0x11</td><td>—</td><td>ALTERA_REG_LED_2/LED_1/EXT_CS, CS_GS2970/GS2962: Gennum leftovers from M6205 in altspi.h, never used</td><td>altspi.h</td></tr></table>`)}
    ${card('Front → main general frame after Mar 28, 2013', `<div class="mono small" style="overflow-x:auto">#  A  <b style="color:var(--warn)">sdi</b>  B  C  prog  E  src  in  F  h  t  o  G  preset  sel  P  pl  V  …  $</div>
      <table class="kv small"><tr><th>rx_buffer[]</th><th>main-board parser (vcurrent)</th></tr><tr><td>[1]</td><td>${M('sdiLockStatus = rx_buffer[1]')}</td></tr><tr><td>[3]</td><td>${M('ProgramNumber = rx_buffer[3]')} — reads the letter 'C'; should be [4] (bug kept to V050001)</td></tr><tr><td>[8]…[11]</td><td>'F' and volume digits</td></tr><tr><td>[18]</td><td>${M('voiceover')} (v104 read [17])</td></tr></table>
      <p class="small">${M('firmwareDebugNotes.xlsx')} (2013-04-02/03) lists 24 rx_buffer bytes "good" vs "bad": the bad frame has an extra 0x00 after 'A' — the new SDI byte. ${M('common.h')} gains the comment "RX_BUFFER … increased to 24" the same day, but the define still reads 23.</p>`)}
    ${card('FPGA clocks (altpll*.v, AMS81.sdc)', `<table class="kv small"><tr><td>altpll0</td><td>24.576 MHz (X3) × 4 → 98.304 MHz; ÷2 → 12.288</td></tr><tr><td>altpll1</td><td>12.288 MHz MCLK_REF (CS8416) × 8 → 98.304</td></tr><tr><td>altpll2</td><td>12.288 MHz DSPCLK1 × 8 → 98.304</td></tr><tr><td>input_selector8</td><td>chooses the 98.304 domain (RMCK5 external / RMCK6 internal, ALTERA_SORT byte 76)</td></tr><tr><td>aes3_2_i2s</td><td>LRCLK = 98.304 M ÷ 2048 = 48 kHz, SCLK ÷ 32 = 3.072 MHz (sdc "CLOCK LOCATION COULD BE WRONG!")</td></tr></table>`)}</div></div>`;
  wire(m);
  SIM.on('time', ()=>{ const st=loopStepAt(SIM.t); m.querySelectorAll('#rdLoop li').forEach((li,i)=>li.classList.toggle('hl',i===st));
    const lb=lockByte(), ast=(0x0F&lb)|(refLocked()?0:0x10);
    m.querySelector('#rdLock').innerHTML = isIss5()? `<table class="kv small mono"><tr><td>alteraRead(0x00|0x80)</td><td>0x${lb.toString(16).padStart(2,'0')} (1 = locked)</td></tr><tr><td>0x0F & aesReadLockStatus()</td><td>0x${(lb&15).toString(16).padStart(2,'0')}</td></tr><tr><td>| CS8416_read5(0x0C) → bit 4</td><td>Astatus = 0x${ast.toString(16).padStart(2,'0')}</td></tr><tr><td>ISOLATE_INPUT_STATUS → INVERT_DATA</td><td>0x${((~ast)&0x1F).toString(16).padStart(2,'0')} — the inversion assumes "CS8416 locked = 0" (see ams81.js Findings)</td></tr></table>`
      : `<p class="small">ISS3: ${M('CS8416_read1..4(0x0C)')} — 0 = locked per chip, merged into Astatus bits 0–3; bit 4 from CS8416 #5.</p>`; });
}

/* ---------------- findings ---------------- */
const HASH = [
  ['software/AMS81-AEM/altera/vcurrent (and v050000)','AMS8 - #Software #Altera #V050000','34 / 34 identical','AMS81.qsf 5b76c6432b84, AMS81.bdf 64fa508eaffa'],
  ['software/AMS81-AEM/altera/progress/v109','#V050000','30 / 32','only .qpf/.qsf differ (SEARCH_PATH V107 vs vcurrent); AMS81.bdf identical — the RTL froze on Feb 5'],
  ['software/Mode6-Version2/C050000','#VC050000','36 / 36 identical','adds i8sx2_i2sx8.v, sync_one_shot.v; project path C:/Ali/Projects/AMS81-mode-6/06AC0000'],
  ['software/AMS81-AEM/altera/progress/v203Original','#V203','21 / 22','qsf only: LAST_QUARTUS 9.1 SP2 vs 8.1, PIN_239 renamed DATA_OUT_1 → t5, two MISC_FILE lines'],
  ['software/AMS81-AEM/atmel/ams8e-1/vcurrent','#Ams8e-1 #V050000','8 / 15','v200w.c (f12e0380c780 vs e54e78693c6a) differs only in comments; .s/.mak/.prj are build artefacts'],
  ['  (same)','#Ams8e-1 #V050001','—','V050001 adds the June 24, 2013 "reference != INTERNAL" fix (770523eb3a74)'],
  ['software/AMS81-AEM/atmel/ams8e-5/04VA0000','#Ams8e-5 #V040000','20 / 20 identical','folder says 04VA, the display string is 06VA0000'],
  ['software/AMS81-AEM/sharc/ams81v205','#Sharc #v205','24 / 24 identical','ams81_main.asm 816dbc3058cb'],
  ['demux3/altera/v301','DEMUX3 master v301 (#DEMUX #SERIES)','57 / 60','pod31.bdf (1b162e9da9a1 vs 562cfa46dfa7): RD60 adds four AND2 gates (inst7/10/15/19) that gate the four I2S_64_par_ser_reva outputs with sdi_lock; re-saved in 9.1 SP2'],
  ['ams82/vcurrent','AMS82 master mode5','—','v100 inserts sdi_carrier_lock after chA; vcurrent shows "03AV0000" and re-enables SETUP_COM at start-up'],
];
function viewNotes(m){
  window.__rd60Active=false; D.hashOpen=D.hashOpen||false;
  const li=(t,b)=>`<li><b>${t}</b> ${b}</li>`;
  m.innerHTML = card('What RD60 is up to — findings', `<ol>
    ${li('The config-chip setting was never updated.', `Every iss5 ${M('AMS81.qsf')} (v100…vcurrent, both revisions, Mode 6) keeps ${M('CYCLONE_CONFIGURATION_DEVICE EPCS1')} from the 2004 EP1C6 project. The archive's own Cyclone IV handbook (RD10) says EPCS1 cannot hold a Cyclone IV image: 9,534,304 bits against 1,048,576. The engineer worked around it in the Programmer: the .cdf names EPCS16 from v102 on (v100/v101 still EPCS1 with an empty path, so the first two builds were probably loaded over JTAG ${INF}), and ${M('AMS81.jdi')} records an EPCS16 .pof. The board carries an M25P16 (EPCS16-class, SO16).`)}
    ${li('The flash grew in three steps and changed footprint.', `ISS2/3: EPCS1, SO8. ISS4 (2009): M25P40-VMN6P placed with the "EPCS1" component. ISS5: M25P16-VMF6P in SO16-300 mil, so the AS pins moved (nCS 1→7, DATA 2→8, ASDI 5→15, DCLK 6→16). The EP4CE40 image fills 56.8 %.`)}
    ${li('The "reference" AD1895 does nothing.', `U10 is fitted and wired to eight FPGA balls (F22 MCLK_IN, H22 BYPASS, E21/D22/D21 MMODE, K19/K17 WLNGTH, K21 TDM_IN), none of which V050000 assigns. Without MCLK the SRC cannot run. The README says the CS8416/AD1895 pair recovers the reference clock; in the code only the CS8416's RMCK (MCLK_REF → B12 → altpll1) is used.`)}
    ${li('wait_ms is six times faster than its name.', `From ${M('v200w.lis')}: the inner loop is 8 cycles × 100 = 808 cycles = 164 µs at 4.9152 MHz. So the nine-step boot delay is 0.74 s, not 4.5 s; CONFIGURE_ALTERA holds nCONFIG for 33 ms, not 200 ms; the SDI-relock Dolby reset freezes the loop for 247 ms (V050000) or 164 ms (v104), not 1.5 s; ${M('wait_us(500)')} is 2.85 ms. (ams81.js models the nominal 1.5 s.)`)}
    ${li('The FPGA configures last.', `${M('port_init')} drives PB7 (ALTERA_RESET) high, which holds nCONFIG low through Q1 from reset until CONFIGURE_ALTERA, so the EP4CE40 starts loading at 0.775 s and reaches user mode at ≈1.01 s (≈1.25 s at a 20 MHz DCLK). The MCU does not wait: its first ${M('ALTERA_read_write')}, ${M('init_CS8416')} and ${M('RESET_SHARC')} run into an unconfigured FPGA; ${M('ALIGNMENT_CHECK')} counts misses but ${M('error0')} is never used, so nothing breaks.`)}
    ${li('The ISS5 board is bigger and was laid out for more than the AMS81.', `Measured at one scale, the ISS2 board is 5.80 × 3.58 in and ISS5 5.80 × 4.16 in. ISS5 adds AES 9–16 receivers and drivers, the H4 i64 header, a Dolby CAT1100 socket (P13) and a 22.5792 MHz oscillator — all unassigned in AMS81.qsf; the PnP folder for ISS5 is called "32ME-MADI". The SHARC (U1) sits at exactly the same coordinate on ISS2, ISS3 and ISS5.`)}
    ${li('ISS4 was a detour.', `The ISS4 BOM uses an ADSP-21262 (QFP-144) with an AT25F512A SPI boot flash — the AMS16 DSP. ISS5 goes back to the ISS2/3 ADSP-21065 + AM29LV040B, which is why the RD60 SHARC code "needed no changes". All three P-CAD BOMs (ISS2, ISS3, ISS4) still carry the title "AMS8E-1,ISS2".`)}
    ${li('The SDI byte broke the parser twice.', `Inserting ${M('sdi_carrier_lock')} after 'A' (v104, Mar 28) left index2 = 11 and voiceover = rx_buffer[17]: Bob's "never leaves mode1". vcurrent fixes those two, adds a third wait_ms(500), but leaves ${M('ProgramNumber = rx_buffer[3]')} (now the letter 'C') and RX_BUFFER = 23 under a comment claiming 24. The April 2–3 debug sheet is the investigation.`)}
    ${li('The reference reset had a side effect that outlived RD60.', `Atmel v103v1 resets the CAT552 whenever the reference CS8416 loses lock. With Ref = Int, RXSEL 0 listens to ${M('AES_REF_FPGA')} (U4-A13), a copy of AES 1 ${INF}, so pulling AES 1 while monitoring SDI reset the Dolby card. The fix (${M('&& reference != INTERNAL')}) is dated June 24, 2013 and exists only in the AMS81 master V050001, not in RD60.`)}
    ${li('The demux3 copy is not the DEMUX3 master.', `${M('pod31.bdf')} gains four AND2 gates fed by ${M('sdi_lock')} right after the four I2S serialisers — audio is muted while SDI is unlocked ${INF} — and was re-saved in Quartus 9.1 SP2. Everything else in v301 matches the DEMUX3 master and the SA-DEMUX4 archive copy byte for byte.`)}
    ${li('Leftovers.', `${M('altspi.c')} is Glenn Greig's 2010 M6205 driver: ${M('altspi.h')} still defines Gennum chip selects (GS2970/GS2962) and LED registers. Its comments say "SCLK on PE5", "CS on PE7" while the macros use PC0/PC2. spicontrol's write register 0x02 ("test") goes nowhere. The SDC carries "CLOCK LOCATION COULD BE WRONG!". The AMS8-1B variant pairs iss5 Atmel code with an EP1C6 FPGA project, which cannot fit the ISS5 BGA footprint.`)}
    ${li('Version labels.', `RD60's front-panel folder is 04VA0000 but shows "06VA0000"; ams82 vcurrent shows "03AV0000"; the main board still prints "Ams8E-1 C1.01 for Issue 2 PCB … April 20, 2006" in its header. The CAM progress note ponders whether the CAM needs the Dolby reset ("since there is no Dolby feature??").`)}
  </ol>`) + card('What differs from the AMS81 master — checked by SHA-256', `<table class="kv small"><tr><th>RD60 folder</th><th>Best master match</th><th>Files equal</th><th>Notes</th></tr>${HASH.map(r=>`<tr><td class="mono">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</table>
    <p class="small muted">Method: SHA-256 of every source file (.v .vhd .bdf .qsf .sdc .c .h .s .asm .dat .prj .mak .cdf .qpf .dpj), excluding Quartus db folders and the third-party AESRXSRC/sampleSRC trees, matched by name against every leaf folder of AMS81 - #Master, AMS82 - #Master, the DEMUX3 master and SA-DEMUX4. Short hashes are the first 12 hex digits.</p>
    <button id="rdHashOk">${D.hashOpen?'✔ read':'Mark as read (tutorial)'}</button>`)
  + card('Assumptions in this simulation', `<ul class="small">
    <li>EP1C6 bitstream 1,167,216 bits and Cyclone I DCLK 20 MHz ${INF}: not in the archive. The 4 ms main-loop pass and the 4 µs SPI bit are ${INF}.</li>
    <li>Which steps break which behaviour follows the progress.txt sentences; "only input H9 works" is shown as "the 110 Ω bank does not lock" ${INF} (H9 carries AES_IN1–4, which feed U8).</li>
    <li>tCF2ST1, FPGA initialisation and the start-up routines' durations are ${INF}; RESET_SHARC and every wait are computed from the .lis cycle counts.</li>
    <li>The test signal on AES IN 1 is a 1 kHz tone at −20 dBFS ${INF}; channel status is not modelled beyond the Z preamble.</li>
    <li>Boards: overlays use PnP centres and IPC pin extents; part boxes on the ISS2 drawing are sized by eye from the drawing.</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>ENGINEERING - 2016 RD FILES/RD60-AMS81AUsingAMS81-iss5PCB/** (README, progress.txt files, qsf/cdf/jdi/bdf/sdc, spicontrol.v, altpll*.v, aes3_2_i2s.v, v200w.c/.lis, altspi.*, AESAudio.*, common.h, ControlDescription_Jan212013.docx, firmwareDebugNotes.xlsx, demux3/altera/v301, ams82)</li>
    <li>AMS8E - #Master/AMS8E-1 - #Master: AMS8E-1 ISS5 - ALTIUM.csv, AMS8E-1-ISS5-Assy-drawing.pdf, AMS8E-1-ISS5-GERBER.zip (Ams8e-1iss5-net.ipc); AMS8E - #PNP/AMS8E-1 - #PNP #2016/ISS2–ISS5</li>
    <li>AMS8 #Engineering #TIM/pcb/Ams8e-1: AMS8E-1ISS2-ASSY.pdf, Ams8e-1iss2/3/4.bom/.pnp, AMS8E-1iss2/3/4.net, AMS8E-1iss4.ECO</li>
    <li>ENGINEERING - 2016 RD FILES/RD10_cycloneIV: cyiv-51008Programming.pdf, cyc_c51014EPCSDevicesDatasheet.pdf</li>
    <li>AMS81 - #Master/AMS8 - #Engineering/AMS8 - #Software/** · #DEMUX #SERIES/XXX - DEMUX3 - #Master #OBSOLETE · SA-DEMUX4 - #Master</li></ul>`);
  m.querySelector('#rdHashOk').onclick=()=>{ D.hashOpen=true; rerender(); };
}

/* ---------------- register ---------------- */
function tab(id,label,fn){ return {id,label,render(m){ curTab=id; fn(m); }}; }
SIM.register({
  id:'rd60-ams81a-iss5',
  product:'RD60 AMS81A on ISS5',
  name:'RD60 AMS81A on ISS5 · AMS8-1A port to the AMS8E-1 issue 5 board (2013|46)',
  year:2013, family:'R&D register', folder:'ENGINEERING - 2016 RD FILES/RD60-AMS81AUsingAMS81-iss5PCB',
  summary:'The 2013|46 R&D job that moved the AMS8-1A monitor from the ISS2/3 main board (EP1C6, EPCS1, four CS8416 + four AD1895 receive chains) to the AMS8E-1 issue 5 board, where a Cyclone IV EP4CE40 does AES receive and sample-rate conversion itself. The simulator replays each build from v100 to V050000 against both real assembly drawings, with the configuration-chip question, the power-up timing and the Dolby-reset fixes.',
  highlights:['Before/after boards on the real ISS2 and ISS5 assembly drawings, to scale','12 build steps from the progress logs, each with its bugs','EPCS1 in the qsf vs EPCS16 in the .cdf vs M25P16 on the BOM','Power-up: nCONFIG held for 0.74 s, 9.5 Mbit load, user mode at ≈1.01 s','SHA-256 comparison with the AMS81, DEMUX3 and AMS82 masters'],
  depth:'Full model',
  duration:1.3,
  stepUnits:[
    {label:'1 AES biphase cell (163 ns)', period:()=>1/K.CELL},
    {label:'1 AES frame (20.8 µs)', period:()=>1/K.FS},
    {label:'1 DCLK (25 ns)', period:()=>1/(D.dclk*1e6)},
    {label:'1 wait_ms "ms" (164 µs)', period:()=>K.WMS},
    {label:'1 main-loop pass (4 ms)', period:()=>K.MB_PASS},
    {label:'1 wait_ms(500) (82 ms)', period:()=>K.W500},
    {label:'10 ms', period:()=>0.01},
  ],
  zooms:[[1.3,'1.3 s (whole)'],[0.25,'250 ms'],[0.05,'50 ms'],[0.01,'10 ms'],[0.001,'1 ms'],[0.0002,'200 µs'],[0.00005,'50 µs (frames)'],[0.00001,'10 µs (cells)'],[0.000001,'1 µs (DCLK)']],
  defaultZoom:0,
  init(){ D=fresh(); },
  tabs:[
    tab('sim','Simulator: before / after',viewSim),
    tab('tutorial','Tutorial: porting to ISS5',viewTutorial),
    tab('second','One second, frame by frame',viewSecond),
    tab('block','Block diagram',viewBlock),
    tab('schematic','Schematics',viewSchem),
    tab('software','Software',viewSoft),
    tab('findings','Findings',viewNotes),
  ],
});
})();
