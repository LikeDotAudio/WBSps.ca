/* =====================================================================
   RD72 — Dolby CAT1100 decoder module evaluation on the AMS8E-1 Iss5 (Ward-Beck Systems, 2013|46)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, folder ENGINEERING - 2016 RD FILES/RD72-Cat1100 unless noted):
   - atmel/V050001/v200w.c, dolby.c/.h, altspi.c/.h, AESAudio.c, common.h  (ATmega128 main-board firmware,
       revision notes Jan 21 … Jun 24 2013; "Ali-Rem"/"Ali-Add" edits that move the Dolby reset PE2 → PA6)
   - altera/v050000, altera/adam/v050000, altera/ali/backup1, backup2, v050000: AMS81.bdf / AMS81.qsf (five FPGA
       copies, nets traced from the .bdf), CATMAPERR.vhd, non_audio_detector.vhd, spicontrol.v
   - cat1100.xls, pins.xls (Ali, 28 Aug 2013): CAT1100 ↔ CAT552 strap and pin table, "Correct Pin Name" column
   - Technical Documents/: CAT552 withdrawal notice (16 Aug 2013), CAT1100 Implementation Manual Issue 1, Use Case
       Guide Issue 1, FB259 in-chassis update. These are Dolby CONFIDENTIAL: only headline figures, pin names and
       parameter/register names are used here. No packet bytes, IDs, CRC tables or layouts are reproduced.
   - deliverables/: firmware 2.0.0.4 and test-kit 2.0.0.3 file listings (dates and tool names only)
   - RD22-MADI/PCB/AMS8E-1/Nov12012_FromIrinaFinal/Gerbers: Ams8e-1iss5.GBO/.GBS (bottom silk + mask → assets
       rd72-cat1100-bot-*.png, mirrored = seen from below) and Ams8e-1iss5-net.ipc (P5, P13, U14 nets and pads)
   - RD22-MADI/PRODUCTION/Sencore Production Notes.docx, R&D_List.xls (RD72 priority A, not completed)
   No Dolby logo or trade dress is drawn; the cards are plain outlines with text labels.
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const ASSET = 'siumulation-plugins/assets/';

/* ---------------- constants from the source ---------------- */
const C = {
  FS: 48000,
  FOSC: 4.9152e6,          // spi_init comment "clock rate: 1228799hz" = fosc/4 → X2 4.9152 MHz; UBRR0 0x1F → 9600 Bd
  PASS: 0.004,             // main-loop pass — INFERRED (same figure as ams81.js: 80-byte bit-banged ALTERA chain dominates)
  LOCK_COUNTER: 25,        // common.h
  LOOP_CONSTANT: 400,      // common.h (was 1200, 800): SPI re-enabled after 400 passes
  SPI_BUFFER_CONSTANT: 3,  // common.h (was 12): SPI disabled after 3 metadata buffers
  TX_EVERY: 3,             // Transmit_Counter 2 → one UART0 byte every 3 passes
  CAT_ERR_COUNT: 10000,    // DOLBY_CAT_AUDIO_ERROR_COUNTER (dolby.h)
  RX_FRAME: 136,           // RECEIVE_BUFFER: 0x02 0xCF sync + 134 (+1) bytes
  C552_SPI: 1e6,           // CAT552 metadata SPI bit clock — INFERRED
  C1100_SMD: 125e3,        // CAT1100 subset SPI master default (manual headline figure)
  C1100_PKT: 60,           // subset packet length in bytes — INFERRED (size varies with programs)
  BOOT_552: 0.3,           // CAT552 restart after reset — INFERRED
  BOOT_1100: 18,           // CAT1100 boot — manual: "less than 20 seconds"; 18 s INFERRED
  HSP_HZ: 1e6,             // host SPI on the fixture (manual recommends > 1 MHz) — INFERRED
};
const SIGS = {
  none:   {n:'nothing connected', coded:false},
  pcm:    {n:'PCM programme (48 kHz)', coded:false},
  dd:     {n:'Dolby Digital (AC-3) 3/2L, 384 kb/s', coded:true, per:1536/48000, pc:1},
  ddp:    {n:'Dolby Digital Plus 3/2L', coded:true, per:1536/48000, pc:16},
  dolbyE: {n:'Dolby E 5.1+2, 29.97 fps', coded:true, per:1001/30000, pc:28},
};
const DD_CFG = ['1+1','1/0','2/0','3/0','2/1','3/1','2/2','3/2','3/2L','2/2L','3/1L','2/1L','3/0L'];
const DE_CFG = {0:'5.1+2',1:'5.1+1+1',2:'4+4',3:'4+2+2',11:'5.1',63:'not Dolby E'};
const MODE_N = {1:'MODE1 · Dolby decode (input 1–4 → card)',2:'MODE2 · normal PCM (card bypassed)',4:'MODE4 · input 4 → card, 1–3 PCM'};

/* Five FPGA copies, wiring of both decoder sockets traced from each AMS81.bdf */
const BUILDS = {
  v050000:{n:'v050000 (master, 3 Jun 2013)', c552:'pins', in:false, out:false, meta:false, rst:'none', aok:'float', straps:'float', vsync:'float', clk:'none', err:'none',
    d:'CAT552 audio is drawn in the schematic (DADA → CATMAPERR and router DD1, router EAD) but the CAT552 pins have no location assignment in AMS81.qsf. The CAT1100 OADA/IADA pins are assigned but not connected to anything.'},
  adam:{n:'adam/v050000 (20 Jun 2013)', c552:false, in:true, out:true, meta:false, rst:'none', aok:'float', straps:'float', vsync:'float', clk:'main', err:'none',
    d:'First CAT1100 audio path: router EAD → IADA0/IAFS0/IABC0, OADA0–3 → router DD1–DD4, OADA4 → DD_AUX (the CAT552 DADM slot), OAFS/OABC driven from the main lrm/sclkm clocks. The CAT552 DADA/EAD nets are disconnected. No straps, reset or metadata yet.'},
  backup1:{n:'ali/backup1 (13 Aug 2013)', c552:false, in:true, out:true, meta:true, rst:'PA6', aok:'gnd', straps:'set', vsync:'gnd', clk:'main', err:'none',
    d:'The full CAT1100 integration: audio as Adam’s, straps HPC=110 (SPI slave), ASF=000 (I²S), OCS=110 (OABC/OAFS inputs), RUN=11, N_AOK tied low, N_RST ← PORTA6 (the firmware’s “Ali-Add”), and the subset metadata SMD_TXD/SMD_CLK/N_SMD_DS0 → ATMEL_PB2/PB1/PB0 (FPGA N6/L6/M6) into the ATmega’s hardware SPI. VSYNC0 is tied to ground.'},
  backup2:{n:'ali/backup2 (22 Aug 2013)', c552:true, in:true, out:false, meta:false, rst:'vcc', aok:'gnd', straps:'set', vsync:'gnd', clk:'main', err:'TP1/TP2',
    d:'CAT552 audio restored (DADA → DD1). Router EAD now drives both the P5 EAD pin and IADA0, so both cards see the stream, but the CAT1100 outputs go nowhere. N_RST tied high; N_ERR0/N_ERR1 brought out to TP1/TP2.'},
  ali:{n:'ali/v050000 (28 Aug 2013, latest)', c552:true, in:false, out:false, meta:false, rst:'TP6', aok:'TP2', straps:'set', vsync:'gnd', clk:'gnd', err:'TP3/TP5',
    d:'The CAT552 path is the working one. The CAT1100 is parked: straps kept, IADA0/IAFS0/IABC0, OAFS/OABC, HSP lines and VSYNC0 tied to ground, outputs unconnected, N_RST from test point TP6, N_AOK from TP2, N_ERR0/1 to TP3/TP5. Saved the same day as cat1100.xls and pins.xls.'},
};
const BUILD_KEYS = Object.keys(BUILDS);

/* ---------------- device state ---------------- */
const D = {
  bench: 'chassis',            // 'chassis' (AMS8E-1 Iss5) or 'fixture' (Dolby ET253 + host PC)
  card: 'cat552',              // 'cat552' (P5 SIMM) | 'cat1100' (P13 100-pin) | 'none'
  build: 'ali',
  fw: 'PA6',                   // V050001 as archived ("Ali-Add": PORTA bit 6) or 'PE2' (the lines marked "Ali-Rem")
  sig: 'dolbyE', depth: 20, mode: 1, input: 1,
  reference: 'INTERNAL', refIn: false,
  frontLinked: true,           // front board sends its general frame (sets ProgramNumber)
  ev: [],                      // timed events {t, k}
  fx: { power:false, booted:false, pinged:false, info:false, cfg:false, meta:false, upd:false, run:'11', params:{} },
  updTried: false,
  log: [], lastTrace: [],
  pick: 'P13',
};

/* ---------------- derived ---------------- */
const B = ()=>BUILDS[D.build];
const sig = ()=>SIGS[D.sig];
function routed(){ // altera_audio_input: does the selected input reach the decoder socket?
  if (D.mode===1) return true;
  if (D.mode===4) return D.input===4;
  return false;
}
function pulled(t){ return D.ev.some(e=>e.k==='pull' && t>=e.t && t<e.t+0.1); }
function lockedAt(t){ return D.sig!=='none' && !pulled(t); }
/* reset pulses on the PA6 / PE2 line produced by the firmware for each event */
function resetPulses(){
  const out=[];
  D.ev.forEach(e=>{
    if (e.k==='pull'){ const a=e.t+0.1+C.LOCK_COUNTER*C.PASS; out.push({a, b:a+500e-6, why:'RESET_CS8416: input re-lock after LOCK_COUNTER passes', line:'fw'}); }
    if (e.k==='refloss' && D.reference!=='INTERNAL') out.push({a:e.t, b:e.t+500e-6, why:'RESET_CS8416_REF: reference lost (Feb 11 2013 fix)', line:'fw'});
    if (e.k==='sdi'){ out.push({a:e.t+1.0, b:e.t+1.5, why:'main(): SDI lock rising edge → wait 1 s, reset 500 ms (Mar 28 2013 fix)', line:'fw'}); }
    if (e.k==='ple'){ out.push({a:e.t, b:e.t+500e-6, why:'ALTERA_TRANSLATE_UART0: Pro Logic switched on (pPLEenable)', line:'fw'}); }
    if (e.k==='tp6'){ out.push({a:e.t, b:e.t+0.01, why:'engineer grounds TP6 (N_RST) by hand', line:'tp6'}); }
  });
  return out.sort((x,y)=>x.a-y.a);
}
function resetReaches(p){
  if (D.bench!=='chassis') return false;
  if (D.card==='cat552') return p.line==='fw' && D.fw==='PE2';
  if (D.card==='cat1100'){ if (p.line==='fw') return D.fw==='PA6' && B().rst==='PA6'; if (p.line==='tp6') return B().rst==='TP6'; }
  return false;
}
function bootT(){ return D.card==='cat1100' ? C.BOOT_1100 : C.BOOT_552; }
/* card state at time t: 'off', 'reset', 'boot', 'run' */
function cardState(t){
  if (D.bench==='fixture') return !D.fx.power ? 'off' : (D.fx.run==='01' ? 'upgrade' : 'run');
  if (D.card==='none') return 'off';
  let st='run';
  resetPulses().forEach(p=>{ if (!resetReaches(p)) return; if (t>=p.a && t<p.b) st='reset'; else if (t>=p.b && t<p.b+bootT()) st='boot'; });
  return st;
}
/* why the decoded audio does (not) come out, at time t */
function decodeAt(t){
  const s=sig(), st=cardState(t), b=B();
  const r={ ok:false, why:'', err0:false, err1:false, ds1:false, out:'silence' };
  if (D.bench==='fixture'){
    if (st==='off'){ r.why='fixture off'; return r; }
    if (st==='upgrade'){ r.why='RUN0=0, RUN1=1: firmware upgrader'; return r; }
    r.ds1 = s.coded || D.sig==='pcm';
    if (D.sig==='none'){ r.why='no input'; return r; }
    if (D.sig==='dolbyE' && D.fx.params['Decode_0.DolbyE_vsyncAlign']==='1' && !D.fx.vsync){ r.err1=true; r.why='Dolby E with vsyncAlign but no VSYNC0 (inferred warning)'; return r; }
    r.ok=true; r.out = s.coded? 'decoded '+(D.sig==='dolbyE'?'5.1 + 2':'3/2L')+' on OADA0–3, downmix on OADA4' : 'PCM passed through'; return r;
  }
  if (D.card==='none'){ r.why='no decoder card fitted'; return r; }
  if (!routed()){ r.why=MODE_N[D.mode]+': altera_audio_input = 0, card not fed'; r.out='PCM path only'; return r; }
  if (!lockedAt(t)){ r.why='input not locked'; return r; }
  if (st!=='run'){ r.why= st==='reset'?'card held in reset':'card booting after reset ('+SIM.fmtDur(bootT())+')'; return r; }
  if (D.card==='cat552'){
    if (b.c552===false){ r.why='this FPGA build has no CAT552 audio nets (CAT1100 build)'; return r; }
    if (b.c552==='pins'){ r.why='CAT552 nets drawn but its pins are unassigned in the .qsf ('+inf+')'; return r; }
    if (D.sig==='ddp'){ r.ok=true; r.out='decoded (CAT552 supports DD+, notice 2013)'; return r; }
    r.ok=true; r.out = s.coded? 'decoded on DADA–DADD, downmix on DADM' : 'PCM through the card (PME=1)'; r.ds1=s.coded; return r;
  }
  // CAT1100 in chassis
  if (!b.in){ r.why='IADA0 not driven in this build (no stream reaches the card)'; return r; }
  if (b.aok==='float' || b.aok==='TP2'){ r.why='/AOK not pulled low ('+b.aok+') → processing disabled'; r.err1=false; return r; }
  if (b.clk!=='main'){ r.err0=true; r.why='OABC/OAFS tied low while OCS selects them as inputs → clock loss: mute, /ERR0'; return r; }
  r.ds1 = s.coded || D.sig==='pcm';
  if (D.sig==='dolbyE' && b.vsync==='gnd'){ r.err1=true; r.why='Dolby E needs a VSYNC reference; VSYNC0 is grounded → no frame alignment ('+inf+')'; return r; }
  if (!b.out){ r.ok=true; r.out='decodes, but OADA0–4 go nowhere in this build'; r.ok=false; r.why=r.out; return r; }
  r.ok=true; r.out = s.coded? 'decoded on OADA0–3 → router DD1–DD4, OADA4 → DD_AUX' : 'PCM bypass'; return r;
}

/* ---------------- what the ATmega sees: metadata SPI (spi_stc_isr) ---------------- */
function metaSource(){
  if (D.bench!=='chassis' || D.card==='none') return null;
  if (D.card==='cat552') return B().c552===true ? 'cat552' : null;   // P5 MSD/MSBC/MSFS → PB2/PB1/PB0 directly on the PCB
  return B().meta ? 'cat1100' : null;
}
function metaPackets(){ // list of {t, n, kind} in [0,1]
  const src=metaSource(); const out=[]; if (!src || !routed()) return out;
  const s=sig(); const per = s.coded ? s.per : 0.032;      // PCM: one frame per 32 ms — INFERRED (PME = 1)
  for (let t=0.002, i=0; t<1; t+=per, i++){
    if (!lockedAt(t) || cardState(t)!=='run') continue;
    if (src==='cat552') out.push({t, n:C.RX_FRAME, kind:'552', dur:C.RX_FRAME*8/C.C552_SPI});
    else out.push({t, n:C.C1100_PKT, kind:'1100', dur:C.C1100_PKT*8/C.C1100_SMD});
  }
  if (src==='cat1100') for (let t=0.25; t<1; t+=0.5) out.push({t, n:C.C1100_PKT, kind:'loud', dur:C.C1100_PKT*8/C.C1100_SMD}); // loudness packet every 500 ms
  return out.sort((a,b)=>a.t-b.t);
}
/* SPI_control: enabled at start; after SPI_BUFFER_CONSTANT full buffers it is disabled for LOOP_CONSTANT passes */
function spiWindows(){
  const pk=metaPackets().filter(p=>p.kind==='552'); const win=[]; let a=0, cnt=0;
  for (const p of pk){ if (p.t<a) continue; cnt++; if (cnt>=C.SPI_BUFFER_CONSTANT){ const b=p.t+p.dur+C.PASS; win.push([a,b]); a=b+C.LOOP_CONSTANT*C.PASS; cnt=0; } }
  if (a<1) win.push([a,1.0001]);
  return win;
}
function syncedFrames(t){ return metaPackets().filter(p=>p.kind==='552' && p.t+p.dur<=t && spiWindows().some(w=>p.t>=w[0]&&p.t<w[1])); }

/* the CAT552 metadata frame the WBS firmware expects (byte positions and masks from SPI_translation / common.h) */
function frame552(){
  const b=new Array(C.RX_FRAME).fill(0);
  const de=D.sig==='dolbyE', dd=D.sig==='dd';
  b[0] = de ? ({24:0x40,20:0x50,16:0x60}[D.depth]|4) : dd ? 0x00 : 0x70;   // BITSTREAM_FORMAT_MASK 0x70 + DOLBY_FRAME_RATE_MASK 0x07 (4 = 29.97)
  b[3] = de ? 0x00 : 0x3F;                                                 // PROGRAM_CONFIGURATION_MASK 0x3F (0 = 5.1+2, 63 = not Dolby E)
  b[12] = dd ? 0x80 : 0x00;                                                // PROGRAM_LFE_MASK
  b[13] = (dd ? 0xE0 : 0) | (de ? 27 : 24);                                // PROGRAM_DD_CONFIGURATION_MASK 0xE0 (3/2) + DIALOGUE_NORMALIZATION_MASK 0x1F
  b[29] = dd ? 14 : 0;                                                     // DOLBY_DATA_RATE_MASK 0x1F (14 = 384 kb/s per the commented table)
  return b;
}
/* firmware variables after Metadata_translation (Dolby_*_Conversion) for the last synced frame */
function fwVars(t){
  const v={ lock: lockedAt(t)?1:0, RAW:1, Dformat:0, configuration:0, frame_rate:255, data_rate:255, dialnorm:0, ProgramNumber: D.frontLinked? 0x43 : 0x31, synced:false };
  const fr=syncedFrames(t);
  if (fr.length){ const b=frame552(); v.synced=true; v.RAW=b[0]&0x70; v.fr=b[0]&7; v.byte0=b[0];
    if (!D.frontLinked) v.dialnorm=b[13]&0x1F; }
  // Dolby_Bitstream_Format_Conversion
  const fmt=raw=>({0:2,0x10:2,0x20:2,0x30:2,0x40:3,0x50:3,0x60:3}[raw] ?? 1);
  if (D.mode===1 || (D.mode===4 && D.input===4)) v.Dformat = v.lock ? fmt(v.RAW) : 0;
  else v.Dformat = v.lock ? 1 : 0;
  if (v.synced){ const b=frame552();
    if (v.Dformat===3){ v.configuration=b[3]&0x3F; v.frame_rate=b[0]&7; }
    if (v.Dformat===2){ const k=b[13]&0xE0, lfe=b[12]&0x80; v.configuration = {0:0,0x20:1,0x40:2,0x60:lfe?12:3,0x80:lfe?11:4,0xA0:lfe?10:5,0xC0:lfe?9:6}[k] ?? (lfe?8:7); v.data_rate=b[29]&0x1F; } }
  return v;
}
function displayText(t){
  const v=fwVars(t);
  if (v.Dformat===0) return ' No Lock';
  if (v.Dformat===1) return '  PCM   ';
  if (v.Dformat===2) return pad8('DD '+(DD_CFG[v.configuration]||'?'));
  return pad8('E '+(DE_CFG[v.configuration]||v.configuration));
}
function pad8(s){ s=String(s).slice(0,8); while(s.length<8) s+=' '; return s; }

/* ALTERA_SORT bytes 72–79 (the routing registers that matter to the decoder) */
function regs(){
  const ple = 0x08;                    // PLEenable = YES → PLE = 0x08 (Pro Logic disabled)
  const ain = D.mode===1 ? (1<<(D.input-1)) : (D.mode===4 && D.input===4) ? 0x08 : 0;
  const by = D.mode===1 ? 0xF0 : D.mode===4 ? 0x80 : 0;
  const ref = (D.reference!=='INTERNAL' && D.refIn) ? 0x04 : 0x05;
  return { 75: 0xE0, 76: 0x10|ple|ref, 77: by|ain, 78: 0x40|(0x03<<1), 79: (0x02<<3)|0x01 };
}
/* UART0 general frame back to the front board (UART0_transmit_counter, one byte every 3 passes) */
function uartFrame(t){ const v=fwVars(t); return ['#','A',v.Dformat,'B',v.configuration,'C',v.ProgramNumber,v.dialnorm,'D',255,'R',v.frame_rate,'T',v.data_rate,'X','A',0,'M',D.mode,'$']; }
const hx=v=> typeof v==='string'? v : '0x'+(v&255).toString(16).padStart(2,'0').toUpperCase();

/* ---------------- SMPTE 337 burst preamble and the FPGA detector ---------------- */
function preamble(){
  const s=sig(); if (!s.coded) return null;
  const dep = D.sig==='dolbyE' ? D.depth : 16;
  const pa = {16:0xF872,20:0x6F872,24:0x96F872}[dep], pb={16:0x4E1F,20:0x54E1F,24:0xA54E1F}[dep];
  const mode = {16:0,20:1,24:2}[dep];
  const pc = s.pc | (mode<<5);                                          // data_type bits 0–4, data_mode bits 5–6
  const pd = D.sig==='dolbyE' ? 0 : 12288;                              // AC-3 at 384 kb/s: 1536 samples → 12288 bits; Dolby E Pd not modelled
  const just = w=> (w<<(24-dep)) & 0xFFFFFF;                            // MSB-justified in the 24-bit AES word
  const words=[0,0,0,0,just(pa),just(pb),just(pc),just(pd)];            // non_audio_detector looks for 4 zero words then Pa,Pb
  const pa1 = (words[6]>>8)&0x7F;                                       // pa1(6 downto 0) <= x7(14 downto 8)
  return {dep, pa, pb, pc, pd, words, pa1};
}

/* ---------------- user actions ---------------- */
function act(name, fn){
  D.lastTrace=[]; const tr=s=>D.lastTrace.push(s);
  fn(tr);
  D.log.unshift({t:SIM.t, name, trace:D.lastTrace.slice()}); if (D.log.length>60) D.log.length=60;
  SIM.refresh();
}
const MBP='<b>ATmega</b>', FP='<b>FPGA</b>', CAT='<b>card</b>';
const A = {
  bench(b){ act(b==='fixture'?'Card to the Dolby ET253 test fixture':'Card back into the AMS8E-1 Iss5', tr=>{ D.bench=b;
    if (b==='fixture'){ D.card='cat1100'; tr('The ET253 fixture holds one CAT1100 and connects its host serial port to a PC. Dolby’s tools: cat1100_cli.exe, cat1100_gui.exe, cat1100_capture.exe, cat1100_upgrade.exe, aardvark.dll (a USB–SPI adapter driver, '+inf+')'); tr('Power it with the fixture switch, then talk to it from the host window.'); }
    else tr('Back on the AMS8E-1 Iss5 main board: P5 (CAT552 SIMM) and P13 (CAT1100 Molex) are both on the bottom side, wired to the FPGA U4 and the ATmega U14.'); }); },
  card(c){ act(c==='none'?'Remove the decoder card':'Fit the '+(c==='cat552'?'CAT552 in P5':'CAT1100 in P13'), tr=>{ D.card=c; D.bench='chassis';
    if (c==='cat552') tr('P5 “CAT_NO_552_RA” 72-pin SIMM, +5 V. RESET_552 = U14 pin 4 (PE2), ERR = U14 pin 9 (PE7), MSD/MSFS/MSBC = P5-57/58/59 → U14 PB2/PB0/PB1 (and FPGA N6/M6/L6).');
    if (c==='cat1100') tr('P13 Molex 55091-1075, +3.3 V only. Every one of its 100 pins goes to the FPGA U4 — none goes to the ATmega directly.');
    tr(`${MBP} DOLBY_DECODER_STATUS reads PINE & BIT7 (“DOLBY_INSTALLED”). That pin is the CAT552 ERR line with the PORTE pull-up on: `+(c==='cat552'?'high = OK.':'with no CAT552 it floats high, so the firmware still says “installed”.')); }); },
  build(k){ act('Load FPGA copy '+BUILDS[k].n, tr=>{ D.build=k; tr(BUILDS[k].d); }); },
  fw(k){ act(k==='PA6'?'Firmware: V050001 as archived (reset on PA6)':'Firmware: the “Ali-Rem” lines (reset on PE2)', tr=>{ D.fw=k;
    tr(k==='PA6'?'Every “PORTE &= ~BIT2 / PORTE |= BIT2” is commented “//Ali-Rem” and replaced by “PORTA &= ~BIT6 … //Ali-Add”. PA6 = U14 pin 45 → FPGA A16 (net PORTA6).':'The pre-Ali code pulses PE2 = U14 pin 4 = RESET_552 → P5-3: the CAT552 reset, straight on the PCB.');
    tr('pins.xls (28 Aug 2013) lists PA6 → A16 as “not assigned”: only the 13 Aug FPGA copy routes it on to N_RST.'); }); },
  sig(s){ act('Input carries '+SIGS[s].n, tr=>{ D.sig=s; const p=preamble();
    tr(`${FP} AESRXSRC locks; spicontrol returns aesrx_lock[7:0] for alteraRead(0x00); ${MBP} CS8416_READ_LOCK_ALL = 0x0F & aesReadLockStatus()`);
    if (p) tr(`Stream: SMPTE 337 bursts every ${SIM.fmtDur(SIGS[s].per)}, Pa/Pb = 0x${p.pa.toString(16).toUpperCase()}/0x${p.pb.toString(16).toUpperCase()} (${p.dep}-bit), Pc data_type ${SIGS[s].pc}`);
    const d=decodeAt(SIM.t); tr(d.ok? 'Decoder: '+d.out : 'Decoder: '+d.why);
    tr(`Front display at the playhead: “${displayText(SIM.t)}”`); }); },
  depth(n){ act('Dolby E word length '+n+'-bit', tr=>{ D.depth=+n; const p=preamble(); if (p) tr(`Pa = 0x${p.pa.toString(16).toUpperCase()}; non_audio_detector reads pa1(6:0) = x7(14 downto 8) = ${p.pa1} (true data_type ${SIGS[D.sig].pc})`); }); },
  mode(m){ act('Mode '+m, tr=>{ D.mode=+m; const r=regs(); tr(`${MBP} ALTERA_TRANSLATE_UART0: altera_audio_input = 0x${hx(r[77]&15).slice(2)}, bypass bits 0x${(r[77]&0xF0).toString(16)} → ALTERA_SORT byte 77 = ${hx(r[77])}`); tr(MODE_N[m]); }); },
  input(n){ act('Monitor input '+n, tr=>{ D.input=+n; tr(`altera_audio_input one-hot (“CAT552 input(=1 only 1 input can be set)”, byte 77 bits 19–16) = ${hx(regs()[77]&15)}`); }); },
  pull(){ act('Pull the AES input out and plug it back in', tr=>{ D.ev.push({t:SIM.t,k:'pull'});
    tr(`${MBP} Astatus = 0 → RESET_CS8416: lock_status = NO_LOCK, lock_counter counts`);
    tr(`After LOCK_COUNTER (25) locked passes: “reset the DOLBY card” = ${D.fw==='PA6'?'PORTA &= ~0x40':'PORTE &= ~0x04'}; wait_us(500); release; frame_sync = NO; buffer_full = NO`);
    const p=resetPulses().filter(x=>x.why.startsWith('RESET_CS8416:')).pop(); tr(p&&resetReaches(p)? `The pulse reaches the ${D.card.toUpperCase()}: it restarts (${D.card==='cat1100'?'boot < 20 s':'≈'+SIM.fmtDur(C.BOOT_552)+' '+inf})` : 'The pulse goes nowhere: '+(D.card==='cat552'?'PA6 is not the CAT552 reset (RESET_552 is PE2)':'this FPGA copy does not route PORTA6 to N_RST'));
    tr('Scrub forward on the timeline to watch it.'); }); },
  refloss(){ act('Remove the AES reference', tr=>{ D.ev.push({t:SIM.t,k:'refloss'}); tr(`${MBP} RESET_CS8416_REF: (Astatus & 0x10) set while ref_lock_status = LOCKED and reference ≠ INTERNAL → Dolby reset (Feb 11 2013: “audio … distorted when unit defaults back to the internal reference”)`); if (D.reference==='INTERNAL') tr('reference = INTERNAL in Setup, so the June 24 2013 guard skips the reset.'); }); },
  sdi(){ act('SDI demux re-locks (Mode 1, SDI input)', tr=>{ D.ev.push({t:SIM.t,k:'sdi'}); tr(`${MBP} UART0_translate stores sdiLockStatus = rx_buffer[1]; main(): sdiLockStatus 1 && pSdiLockStatus 0 → wait_ms(500) ×2, reset 500 ms. The whole loop (and the watchdog-fed WDR) stalls 1.5 s.`); }); },
  tp6(){ act('Ground TP6 (CAT1100 N_RST) with a probe', tr=>{ D.ev.push({t:SIM.t,k:'tp6'}); tr(B().rst==='TP6'?'In ali/v050000 N_RST comes from FPGA pin input TP6: grounding it resets the CAT1100.':'This FPGA copy does not take N_RST from TP6.'); }); },
  clearEv(){ D.ev=[]; SIM.refresh(); },
  ref(r){ act('Setup: reference '+r, tr=>{ D.reference=r; tr(`TRANSLATE_AUDIO_REFERENCE_INPUT; altera_reference_input = ${r!=='INTERNAL'&&D.refIn?'RMCK5 (external)':'RMCK6 (internal)'}`); }); },
  refIn(on){ act(on?'Connect the AES reference':'No reference connected', tr=>{ D.refIn=on; }); },
  front(on){ act(on?'Front board connected (general frames arrive)':'Front board unplugged', tr=>{ D.frontLinked=on;
    tr(on?`${MBP} UART0_translate: the ‘C’ test is “rx_buffer[3] == chC”, then “ProgramNumber = rx_buffer[3]” → ProgramNumber = 0x43 (‘C’), never NO1–NO8`:'ProgramNumber keeps its start value NO1 (0x31).');
    tr(on?'SPI_translation and Metadata_translation only copy dialnorm, mix levels etc. inside “if (ProgramNumber == NOx)”, so none of them update.':'The program-1 branch runs: dialnorm = byte 13 & 0x1F.'); }); },
  /* fixture: host PC over the CAT1100 host serial port (SPI slave, DHIP packets) */
  fxPower(){ act(D.fx.power?'Fixture power off':'Fixture power on', tr=>{ D.fx.power=!D.fx.power; D.bench='fixture'; D.card='cat1100';
    if (D.fx.power){ D.fx.booted=true; tr('RUN0 = RUN1 = 1: normal boot; power-on diagnostics check the software set (manual: boot < 20 s). Blue DS2 shows boot progress; /ERR0, /ERR1 low during boot, high after.'); tr('HPC2..0 = 110 → host serial port is an SPI slave (up to 10 MHz; auto-detects SPI mode 0 or 3).'); }
    else { Object.assign(D.fx,{booted:false,pinged:false,info:false,cfg:false,meta:false}); } }); },
  fxCmd(c){ act('cat1100_cli: '+c, tr=>{ const fx=D.fx;
    if (!fx.power){ tr('Fixture is off: no response, /HSP_ATN stays high.'); return; }
    if (fx.run==='01'){ tr('In upgrade mode the card only accepts a .mod file.'); return; }
    D.ev.push({t:SIM.t,k:'hsp',c});
    tr('Host (SPI master) drives /HSP_SEL low and clocks a DHIP packet in: sync · length · seq # · cmd · data_length · data · CRC (CalculateCRC over the message).');
    if (c==='Ping'){ fx.pinged=true; tr('Command: Ping. /HSP_ATN falls when the Ping Response is queued; the host clocks dummy bytes to read it back.'); }
    if (c==='Get ModuleInfo'){ fx.info=true; tr('Get Value × 3: ModuleInfo · ProductName, SerialNumber, ReleaseVersion. Get Value Response carries a cmd status per value.'); tr('Release in the archive: firmware 2.0.0.4 (Binaries/cat1100.mod, 17 Nov 2014); the June 2013 work used an earlier release '+inf+'.'); }
    if (c==='Use Case Two'){ fx.cfg=true; USE_CASE2.forEach(([p,v,why])=>{ fx.params[p]=v; tr(`Set Value ${p} = ${v}  — ${why}`); }); tr('Straps for this case (Use Case Guide fig. 3-1): HPC2/HPC1 = 3.3 V, HPC0 = 0 V; OCS2/OCS1 = 3.3 V, OCS0 = 0 V; ASF2..0 = 0 V — exactly what cat1100.xls and the Aug 2013 FPGA copies strap.'); }
    if (c==='Get Metadata Subset'){ fx.meta=true; tr('Get Metadata Subset (subset_type AUDIO_MD, instance_id 0) → Get Metadata Subset Response with a packed big-endian structure.');
      tr(D.sig==='dolbyE'?'Dolby E fields: E_ERROR_COUNT, FRAME_COUNT, NUM_PROGRAMS = 2, PROGRAM_CONFIG = 0 (5.1+2), BIT_DEPTH, FRAME_RATE (29.97), then per programme ACMOD, LFE_ON, DIALNORM, BITSTREAM_MODE …': D.sig==='dd'?'Dolby Digital fields: ERROR_COUNT, BITSTREAM_ID, SAMPLE_RATE, ACMOD (3/2), LFE_ON, DIALNORM, DATA_RATE (384 kb/s) …':D.sig==='ddp'?'Dolby Digital Plus time-slice: AGGREGATE_ACMOD, AGGREGATE_DATA_RATE, NUM_SUBSTREAMS, then substreams':'PCM status: SAMPLE_RATE, NUM_CHANNELS');
      tr('The same packets also stream unasked out of SMD_TXD/SMD_CLK (SPI master, mode 3, 125 kHz default), one per frame, loudness every 500 ms.'); }
  }); },
  fxVsync(on){ act(on?'Fixture VSYNC0 from a video reference':'Fixture VSYNC0 open', tr=>{ D.fx.vsync=on; }); },
  upgrade(){ act('Try an in-chassis firmware update (FB259)', tr=>{ D.updTried=true;
    if (D.bench==='fixture'){ D.fx.run = D.fx.run==='01'?'11':'01'; tr(D.fx.run==='01'?'RUN0 = 0, RUN1 = 1 at reset: upgrader. Send cat1100.mod (2,178,982 bytes) over the host SPI (≤ 8 MHz): ≈ '+SIM.fmtDur(2178982*8/8e6)+' of clocking, then poll with dummy writes once a second for ‘L’ (‘M’ = header checksum error, ‘N’ = image or flash error).':'RUN pins back to 11: normal boot.'); return; }
    tr('FB259 needs the host serial port and RUN0/RUN1 under host control. On the AMS8E-1 Iss5 HSP_CLK/HSP_RXD are FPGA pins tied to ground, N_HSP_SEL tied high and RUN0/RUN1 tied high (backup1, backup2 and ali/v050000).');
    tr('Neither the ATmega nor any FPGA copy speaks DHIP: there is no in-chassis update path. Firmware would go in on the ET253 fixture before fitting the card.'); }); },
  reset(){ Object.assign(D,{bench:'chassis',card:'cat552',build:'ali',fw:'PA6',sig:'dolbyE',depth:20,mode:1,input:1,reference:'INTERNAL',refIn:false,frontLinked:true,ev:[],updTried:false,log:[]});
    D.fx={power:false,booted:false,pinged:false,info:false,cfg:false,meta:false,upd:false,run:'11',params:{},vsync:false}; SIM.refresh(); },
};
const USE_CASE2 = [
  ['MdEmulation_0.mainCompMode_DolbyE','0','no metadata applied on the main output'],
  ['Decode_0.DolbyE_mainOutProgSel','0','main output = programme 1'],
  ['Decode_0.DolbyE_auxOutProgSel','0','aux output = programme 1'],
  ['MdEmulation_0.auxCompMode_DolbyE','3','aux in RF mode'],
  ['Downmix_0.auxMixType','3','aux downmix Pro Logic II compatible'],
  ['BsDetect_0.muteMask','12','decode Dolby E + PCM autoswitch, DD and DD+ muted'],
  ['Decode_0.pcmMinLatencyEn','0','PCM latency matched to Dolby E'],
  ['Decode_0.pcmMetadataEn','0','PCM metadata off'],
  ['LdEstimation_0.DolbyEProgSel','0','loudness on programme 1'],
  ['LdEstimation_0.LdEstMode','3','Leq(A) + Dialogue Intelligence'],
  ['Decode_0.DolbyE_vsyncAlign','1','Dolby E locked to the video rate'],
  ['Decode_0.DolbyE_frameSyncEn','1','Dolby E frame sync on'],
];

/* ================================================================
   DRAWING: the AMS8E-1 Iss5 bottom side (both decoder sockets), from the Gerbers
   ================================================================ */
const DPI=160, BW=5.8, BH=4.175;
const V=(x,y)=>[(BW-x)*DPI, (BH-y)*DPI];                          // mirrored: seen from below
const p13=n=>V(n%2? 1.3477:1.1823, 1.9502+Math.floor((n-1)/2)*0.025);
const p5=n=>V(1.27+(n-1)*0.05, n%2? 3.63:3.73);
const u14=n=> n<=16? V(5.105,1.95-(n-1)*0.0315) : n<=32? V(5.0341-(n-17)*0.0315,1.4067) : n<=48? V(4.4908,1.4776+(n-33)*0.0315) : V(4.5617+(n-49)*0.0315,2.0209);
const NETS = [ // [label, list of [part,pin], colour key, explanation]
  ['RESET_552', [['u',4],['p5',3]], 'rst', 'PE2 → P5-3. The CAT552 reset. V050001 no longer drives it (“Ali-Rem”).'],
  ['ERR / “DOLBY_INSTALLED”', [['u',9],['p5',70]], 'err', 'PE7 ← P5-70. dolby.h calls PINE & BIT7 “DOLBY_INSTALLED”; it is the CAT552 ERR output.'],
  ['MSD/MSFS/MSBC → PB2/PB0/PB1', [['u',10],['u',11],['u',12],['p5',57],['p5',58],['p5',59]], 'meta', 'CAT552 metadata SPI straight into the ATmega hardware SPI (slave, mode 3: SPCR = 0xCC). Also to FPGA M6/L6/N6.'],
  ['PORTA6 → FPGA A16', [['u',45]], 'rst', 'The new Dolby reset line (“Ali-Add”). Only ali/backup1 routes it to N_RST.'],
  ['PORTG1 ← CATMAPERR', [['u',34]], 'err', 'DOLBY_AUDIO_CAT_ERROR_FLAG = PING & BIT1: the FPGA CATMAPERR output.'],
  ['N_RST (P13-99)', [['p13',99]], 'rst', 'CAT1100 reset → FPGA Y3.'],
  ['N_AOK (P13-92)', [['p13',92]], 'err', 'Audio valid, active low → FPGA AA4.'],
  ['N_ERR / N_ERR1 (P13-53/57)', [['p13',53],['p13',57]], 'err', 'Error / warning → FPGA T10 / V10, then test points.'],
  ['SMD_TXD/CLK/DS0 (P13-97/56/58)', [['p13',97],['p13',56],['p13',58]], 'meta', 'Subset metadata SPI master out → FPGA Y4/AA14/AB13.'],
  ['HSP (P13-36/38/40/44/51)', [['p13',36],['p13',38],['p13',40],['p13',44],['p13',51]], 'host', 'Host serial port → FPGA only. No controller drives it.'],
  ['HPC/OCS/ASF/RUN straps', [['p13',1],['p13',39],['p13',86],['p13',67],['p13',65],['p13',93],['p13',69],['p13',73],['p13',76],['p13',72],['p13',85]], 'host', 'Boot-time configuration pins, all from FPGA outputs. PCB nets HPC0/HPC2 are swapped against Dolby’s pin numbers (pins.xls “Correct Pin Name”).'],
  ['IADA0/OADA0–4/OAFS/OABC', [['p13',8],['p13',6],['p13',4],['p13',28],['p13',21],['p13',23],['p13',25],['p13',59],['p13',30],['p13',32]], 'audio', 'I²S in (encoded) and out (decoded) to the FPGA router.'],
  ['VSYNC0 (P13-47)', [['p13',47]], 'host', 'Dolby E frame reference. Tied to ground in every Aug 2013 copy.'],
];
const NCOL={rst:'#ff6a5a',err:'#ffb43a',meta:'#5ad0ff',host:'#c99bff',audio:'#7dff6a'};
function boardSVG(t){
  const dec=decodeAt(t), st=cardState(t), b=B();
  const pt=([k,n])=> k==='u'?u14(n): k==='p5'?p5(n): p13(n);
  let s=`<svg viewBox="0 0 928 668" style="width:100%;max-width:900px;display:block;border-radius:8px" role="img" aria-label="AMS8E-1 Iss5 bottom side from the Gerbers">
    <defs><filter id="r72g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="928" height="668" fill="#145a32"/>
    <image href="${ASSET}rd72-cat1100-bot-pads.png" width="928" height="668"/><image href="${ASSET}rd72-cat1100-bot-silk.png" width="928" height="668"/>`;
  // CAT552 card outline (P5 SIMM, outline from the bottom silk)
  const c552 = D.card==='cat552' && D.bench==='chassis';
  s+=`<g class="r72hot" data-h="P5" style="cursor:pointer"><rect x="48" y="58" width="745" height="${c552?110:36}" rx="4" fill="${c552?'rgba(40,60,110,.72)':'transparent'}" stroke="${D.pick==='P5'?'var(--accent2)':'rgba(255,255,255,.35)'}" stroke-width="${D.pick==='P5'?3:1.2}" stroke-dasharray="${c552?'':'5 4'}"/>
    ${c552?`<text x="70" y="128" font-size="15" fill="#dfe8ff" font-weight="700">CAT552 decoder module (72-pin SIMM, +5 V) — plain outline</text><text x="70" y="148" font-size="12" fill="#c8d4ee">${st==='run'?'running':st}</text>`:''}<title>P5 “CAT_NO_552_RA” — click to ${c552?'remove':'fit'} a CAT552</title></g>`;
  // CAT1100 card outline to scale: 47.5 × 73.66 mm = 1.870 × 2.900 in, centred on P13 (orientation inferred)
  const c11 = D.card==='cat1100' && D.bench==='chassis';
  const cx=(p13(1)[0]+p13(2)[0])/2, cy=(p13(1)[1]+p13(99)[1])/2, w=1.870*DPI, h=2.9*DPI;
  s+=`<g class="r72hot" data-h="P13" style="cursor:pointer"><rect x="${cx-w/2}" y="${cy-h/2}" width="${w}" height="${h}" rx="6" fill="${c11?'rgba(30,40,60,.62)':'transparent'}" stroke="${D.pick==='P13'?'var(--accent2)':'rgba(255,255,255,.35)'}" stroke-width="${D.pick==='P13'?3:1.2}" stroke-dasharray="${c11?'':'5 4'}"/>`;
  if (c11){ const L=(x,y,on,col,lbl)=>`<circle cx="${x}" cy="${y}" r="7" fill="${on?col:'#2c332c'}" ${on?'filter="url(#r72g)"':''}/><text x="${x+11}" y="${y+4}" font-size="11" fill="#dde">${lbl}</text>`;
    s+=`<text x="${cx-w/2+10}" y="${cy-h/2+20}" font-size="14" fill="#e8eefc" font-weight="700">CAT1100 (100-pin, 3.3 V)</text><text x="${cx-w/2+10}" y="${cy-h/2+36}" font-size="11" fill="#c8d4ee">47.5 × 73.66 mm · outline ${'inferred orientation'}</text>`
      + L(cx-w/2+20, cy+h/2-70, dec.ds1&&st==='run', '#6aff6a','DS1 valid input') + L(cx-w/2+20, cy+h/2-48, st==='boot'||st==='reset', '#5aa9ff','DS2 boot/host')
      + L(cx-w/2+20, cy+h/2-26, dec.err0||dec.err1||st==='boot', dec.err0?'#ff4a3a':'#ffb43a', 'DS6 '+(dec.err0?'error':dec.err1?'warning':st==='boot'?'boot':'ok'));
  }
  s+=`<title>P13 Molex 55091-1075 — click to ${c11?'remove':'fit'} a CAT1100</title></g>`;
  s+=`<g class="r72hot" data-h="U14" style="cursor:pointer"><rect x="105" y="338" width="112" height="112" fill="transparent" stroke="${D.pick==='U14'?'var(--accent2)':'transparent'}" stroke-width="3"/><title>U14 ATmega128L (X2 4.9152 MHz)</title></g>`;
  // nets
  NETS.forEach(([lbl,pins,k,why],i)=>{ const col=NCOL[k];
    pins.forEach(pp=>{ const [x,y]=pt(pp); s+=`<circle cx="${x}" cy="${y}" r="4.2" fill="${col}" stroke="#000" stroke-width=".8"><title>${lbl}: ${pp[0]==='u'?'U14':pp[0]==='p5'?'P5':'P13'}-${pp[1]} — ${why}</title></circle>`; }); });
  s+=`<text x="10" y="660" font-size="11" fill="#dfe">AMS8E-1 ISS5 bottom side, seen from below (Ams8e-1iss5.GBO/.GBS, mirrored). Dots = nets from Ams8e-1iss5-net.ipc — hover them.</text>`;
  // live test points / status chip
  s+=`<rect x="250" y="520" width="300" height="74" rx="6" fill="rgba(0,0,0,.55)"/><text x="262" y="540" font-size="12" fill="#fff" font-weight="700">${D.card==='none'?'no card':D.card.toUpperCase()} · ${b.n.split(' (')[0]}</text>
    <text x="262" y="558" font-size="11" fill="${dec.ok?'#8f8':'#fb8'}">${(dec.ok?dec.out:dec.why).replace(/<[^>]+>/g,'').slice(0,52)}</text>
    <text x="262" y="576" font-size="11" fill="#cde">reset line: ${D.fw} · card state: ${cardState(t)}</text>`;
  return s+'</svg>';
}
function hostSVG(){
  const fx=D.fx;
  return `<svg viewBox="0 0 460 150" style="width:100%;max-width:520px;display:block">
    <rect x="2" y="2" width="456" height="146" rx="8" fill="var(--dev)" stroke="var(--line)"/>
    <rect x="12" y="12" width="200" height="126" rx="6" fill="#0b0d10" stroke="#333"/>
    <text x="22" y="32" font-size="12" fill="#9fe" font-family="monospace">ET253 fixture (drawing inferred)</text>
    <circle cx="40" cy="70" r="9" fill="${fx.power?'#6aff6a':'#2c332c'}"/><text x="56" y="74" font-size="11" fill="#cde">power</text>
    <circle cx="40" cy="98" r="9" fill="${fx.power&&fx.run==='01'?'#5aa9ff':fx.power&&(fx.pinged||fx.info)?'#3a6fd0':'#2c332c'}"/><text x="56" y="102" font-size="11" fill="#cde">DS2 blue: ${fx.run==='01'?'upgrader':'host traffic'}</text>
    <circle cx="40" cy="126" r="9" fill="${decodeAt(SIM.t).ds1&&fx.power?'#6aff6a':'#2c332c'}"/><text x="56" y="130" font-size="11" fill="#cde">DS1 green: valid input</text>
    <rect x="222" y="12" width="226" height="126" rx="6" fill="#101418" stroke="#333"/>
    <text x="232" y="32" font-size="11" fill="#cfc" font-family="monospace">C:\\Tools&gt; cat1100_cli</text>
    ${['Ping','Get ModuleInfo','Use Case Two','Get Metadata Subset'].map((c,i)=>`<text x="232" y="${54+i*18}" font-size="11" fill="${[fx.pinged,fx.info,fx.cfg,fx.meta][i]?'#7dff6a':'#8a98a8'}" font-family="monospace">${[fx.pinged,fx.info,fx.cfg,fx.meta][i]?'✓':'·'} ${c}</text>`).join('')}
    <text x="232" y="130" font-size="10" fill="#8a98a8" font-family="monospace">SPI ${C.HSP_HZ/1e6} MHz ${'(inferred)'} · /HSP_ATN</text></svg>`;
}

/* ================================================================
   TIMELINE
   ================================================================ */
const STEPS = [
  ['WDR · CS8416_READ_LOCK_ALL (alteraRead 0x00) · RESET_CS8416_REF', .12],
  ['TRANSLATE_AUDIO_INPUT_TYPE · ISOLATE_INPUT_STATUS · RESET_CS8416', .08],
  ['ALTERA_TRANSLATE_UART0 · ALTERA_SORT', .08],
  ['ALTERA_read_write (80 bytes bit-banged) · ALIGNMENT_CHECK', .40],
  ['SPI_translation · Metadata_translation', .08],
  ['UART0_translate · UART0_setup · UART0_transmit_counter', .08],
  ['UART1_translate · SAVE_MIX_IN_EEPROM · SPI_control', .06],
  ['DOLBY_DECODER_STATUS · DOLBY_CAT552_AUDIO_ERROR_CHECK', .05],
  ['SDI lock edge check', .05],
];
const STEP_FRAC=(()=>{ let a=0; return STEPS.map(s=>{ const r=a; a+=s[1]; return r; }); })();
function sdiStall(){ return D.ev.filter(e=>e.k==='sdi').map(e=>[e.t+0.0, e.t+1.5]); }
function stepAt(t){ const st=sdiStall().find(w=>t>=w[0]&&t<w[1]); if (st) return {pass:Math.floor(st[0]/C.PASS), step:8, stall:true};
  const n=Math.floor(t/C.PASS), f=t/C.PASS-n; let k=0; STEP_FRAC.forEach((v,j)=>{ if (f>=v) k=j; }); return {pass:n, step:k}; }
function lanes(){
  const css=SIM.css, s=sig(); const ls=[];
  const txt=(c,x,y,m,col)=>{ c.fillStyle=col||css('--ink2'); c.font='11px sans-serif'; c.fillText(m,x,y); };
  ls.push({label:'AES input: 48 kHz frames / 337 bursts', h:30, draw(c,X,t0,t1,y,h){
    if (D.sig==='none'){ txt(c,X(t0)+6,y+h/2+4,'nothing connected'); return; }
    if (t1-t0 < 0.002) SIM.pulses(c,X,t0,t1,y+h*0.5,h*0.5,1/C.FS,0,0.3/C.FS,css('--ink2'),'AES frames');
    if (s.coded) SIM.pulses(c,X,t0,t1,y,h*0.5,s.per,0.0005,8/C.FS,css('--accent2'),'Pa Pb Pc Pd bursts');
    D.ev.filter(e=>e.k==='pull').forEach(e=>{ c.fillStyle=css('--bad'); c.globalAlpha=.35; c.fillRect(X(e.t),y,X(e.t+0.1)-X(e.t),h); c.globalAlpha=1; txt(c,X(e.t)+3,y+h-4,'unplugged',css('--bad')); });
  }});
  ls.push({label:'ATmega128 main loop (4 ms '+'pass, inferred)', h:30, draw(c,X,t0,t1,y,h){
    const px=X(t0+C.PASS)-X(t0);
    for (let n=Math.floor(t0/C.PASS); n*C.PASS<t1; n++){ const a=n*C.PASS;
      if (sdiStall().some(w=>a>=w[0]&&a<w[1])) continue;
      if (px>80){ STEPS.forEach((st,j)=>{ const x0=X(a+STEP_FRAC[j]*C.PASS), x1=X(a+(STEP_FRAC[j]+st[1])*C.PASS); c.fillStyle=j===3?css('--accent2'):j===4?css('--warn'):css('--accent'); c.globalAlpha=j%2?.55:.8; c.fillRect(x0,y+3,Math.max(1,x1-x0-1),h-6); c.globalAlpha=1; if (x1-x0>70){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(st[0].split(' · ')[0].slice(0,26),x0+3,y+h/2+3); } }); }
      else { c.fillStyle=n%2?css('--accent'):css('--accent2'); c.globalAlpha=.7; c.fillRect(X(a),y+3,Math.max(.6,px-.5),h-6); c.globalAlpha=1; }
    }
    sdiStall().forEach(w=>{ c.fillStyle=css('--warn'); c.globalAlpha=.5; c.fillRect(X(w[0]),y+3,X(w[1])-X(w[0]),h-6); c.globalAlpha=1; txt(c,Math.max(X(w[0]),X(t0))+4,y+h/2+4,'SDI edge: wait_ms ×3 — whole loop stalled 1.5 s',css('--ink')); });
  }});
  ls.push({label:'Decoder metadata SPI → PB0–PB2', h:28, draw(c,X,t0,t1,y,h){
    const pk=metaPackets(); if (!pk.length){ txt(c,X(t0)+6,y+h/2+4, D.bench==='fixture'?'on the fixture the subset port goes to the PC capture tool':metaSource()?'no packets (card not running / not routed)':'nothing reaches the ATmega SPI in this set-up'); return; }
    pk.forEach(p=>{ if (p.t+p.dur<t0||p.t>t1) return; c.fillStyle=p.kind==='552'?css('--accent2'):p.kind==='loud'?css('--warn'):css('--bad'); c.fillRect(X(p.t),y+4,Math.max(1.5,X(p.t+p.dur)-X(p.t)),h-8);
      if (X(p.t+p.dur)-X(p.t)>60) txt(c,X(p.t)+3,y+h/2+4,p.kind==='552'?'0x02 0xCF + 134 bytes':p.kind==='loud'?'loudness subset':'DHIP subset packet','#fff'); });
  }});
  ls.push({label:'spi_stc_isr: SPIE window · frame_sync', h:26, draw(c,X,t0,t1,y,h){
    if (!metaPackets().length){ txt(c,X(t0)+6,y+h/2+4,'—'); return; }
    spiWindows().forEach(w=>{ c.fillStyle=css('--accent'); c.globalAlpha=.25; c.fillRect(X(w[0]),y+2,X(Math.min(w[1],1))-X(w[0]),h-4); c.globalAlpha=1; });
    const fr=syncedFrames(1.01); fr.forEach(p=>{ c.fillStyle=css('--accent'); c.fillRect(X(p.t+p.dur)-1,y+2,3,h-4); });
    if (metaSource()==='cat1100') txt(c,X(t0)+6,y+h/2+4,'bytes arrive, but 0x02 0xCF never appears → frame_sync stays NO, buffer_full never set',css('--bad'));
    else if (X(t1)-X(t0)>200) txt(c,X(t0)+6,y+h-5,'green band = SPI interrupt enabled; bar = buffer_full (3 per window, then 400 passes off)');
  }});
  ls.push({label:'Dolby reset line ('+D.fw+')', h:24, draw(c,X,t0,t1,y,h){
    const ps=resetPulses(); if (!ps.length){ txt(c,X(t0)+6,y+h/2+4,'high (no reset) — use “pull input”, “remove reference”, “SDI relock”'); return; }
    c.strokeStyle=css('--ink'); c.beginPath(); c.moveTo(X(t0),y+4); ps.forEach(p=>{ const a=Math.max(X(p.a),X(t0)), b=Math.max(X(p.b),a+1.5); c.lineTo(a,y+4); c.lineTo(a,y+h-4); c.lineTo(b,y+h-4); c.lineTo(b,y+4); }); c.lineTo(X(t1),y+4); c.stroke();
    ps.forEach(p=>txt(c,X(p.a)+4,y+h/2+3,(resetReaches(p)?'→ card':'→ goes nowhere')+' · '+SIM.fmtDur(p.b-p.a), resetReaches(p)?css('--bad'):css('--ink2')));
  }});
  ls.push({label:'Decoder card state / output', h:28, draw(c,X,t0,t1,y,h){
    const N=Math.min(500,Math.max(60,(X(t1)-X(t0))/2)), span=t1-t0;
    for (let i=0;i<N;i++){ const tt=t0+span*(i+.5)/N, st=cardState(tt), d=decodeAt(tt);
      c.fillStyle = st==='reset'?css('--bad'): st==='boot'?css('--warn'): d.ok?css('--accent'): css('--grid'); c.fillRect(X(t0+span*i/N),y+4,(X(t1)-X(t0))/N+.5,h-8); }
    const d=decodeAt((t0+t1)/2); txt(c,X(t0)+6,y+h/2+4,(d.ok?d.out:d.why).replace(/<[^>]+>/g,'').slice(0,90),css('--ink'));
  }});
  ls.push({label:'UART0 → front board (1 byte / 3 passes)', h:24, draw(c,X,t0,t1,y,h){
    const per=C.TX_EVERY*C.PASS, f=uartFrame((t0+t1)/2); const px=X(t0+per)-X(t0);
    for (let i=Math.floor(t0/per); i*per<t1; i++){ const a=i*per; const v=f[i%f.length]; c.fillStyle=typeof v==='string'?css('--accent2'):css('--accent'); c.fillRect(X(a),y+4,Math.max(1,X(a+10/9600)-X(a)),h-8); if (px>34) txt(c,X(a)+2,y+h-6,hx(v),css('--ink')); }
  }});
  ls.push({label:'/ERR0 · /ERR1 (CAT1100)', h:22, draw(c,X,t0,t1,y,h){
    if (!(D.card==='cat1100'||D.bench==='fixture')){ txt(c,X(t0)+6,y+h/2+4,'CAT552: single ERR line on PE7 (high = OK)'); return; }
    const N=200, span=t1-t0; for (let i=0;i<N;i++){ const tt=t0+span*(i+.5)/N, d=decodeAt(tt), st=cardState(tt);
      if (d.err0||st==='boot'){ c.fillStyle=css('--bad'); c.fillRect(X(t0+span*i/N),y+3,(X(t1)-X(t0))/N+.5,7); }
      if (d.err1||st==='boot'){ c.fillStyle=css('--warn'); c.fillRect(X(t0+span*i/N),y+12,(X(t1)-X(t0))/N+.5,7); } }
    txt(c,X(t1)-200,y+h-3,'top /ERR0 (error) · bottom /ERR1 (warning)');
  }});
  ls.push({label:'Host SPI (fixture: cat1100_cli)', h:22, draw(c,X,t0,t1,y,h){
    const ev=D.ev.filter(e=>e.k==='hsp'); if (!ev.length){ txt(c,X(t0)+6,y+h/2+4, D.bench==='fixture'?'no commands yet':'not connected on the AMS8E-1 (N_HSP_SEL tied high)'); return; }
    ev.forEach(e=>{ const n=e.c==='Use Case Two'?12:e.c==='Get ModuleInfo'?3:1; for (let k=0;k<n;k++){ const a=e.t+k*0.004, d=24*8/C.HSP_HZ; c.fillStyle=css('--accent2'); c.fillRect(X(a),y+3,Math.max(1.5,X(a+d)-X(a)),h/2-4); c.fillStyle=css('--warn'); c.fillRect(X(a+d+0.0005),y+h/2+1,Math.max(1.5,X(a+2*d)-X(a+d)),h/2-4); } txt(c,X(e.t)+4,y+h-2,e.c,css('--ink')); });
  }});
  return ls;
}

/* ---------------- scope: one 337 burst start + the detector ---------------- */
function drawScope(cv, el){
  const {c,w,h}=SIM.canvas(cv,150), p=preamble(); const ink=SIM.css('--ink'), ink2=SIM.css('--ink2');
  c.clearRect(0,0,w,h);
  if (!p){ c.fillStyle=ink2; c.font='12px sans-serif'; c.fillText('PCM input: no SMPTE 337 preamble — choose a coded signal.',10,30); el.innerHTML=''; return; }
  const cw=(w-20)/(8*24); const names=['0','0','0','0','Pa','Pb','Pc','Pd'];
  p.words.forEach((wd,i)=>{ for (let b=23;b>=0;b--){ const x=10+(i*24+(23-b))*cw, bit=(wd>>b)&1; c.fillStyle= i===4||i===5?SIM.css('--accent2'): i===6?SIM.css('--warn'):SIM.css('--accent'); c.globalAlpha=bit?.9:.12; c.fillRect(x,30,cw-.4,40); c.globalAlpha=1;
      if (i===6 && b<=14 && b>=8){ c.strokeStyle=SIM.css('--bad'); c.strokeRect(x,26,cw,48); } }
    c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(names[i]+' '+wd.toString(16).toUpperCase().padStart(6,'0'),12+i*24*cw,92); });
  c.fillStyle=ink2; c.font='11px sans-serif'; c.fillText('8 subframes (L,R,L,R…) MSB→LSB · red box = bits 14..8 that non_audio_detector copies to pa1(6:0)',10,16);
  c.fillText(`${p.dep}-bit mode · Pc = 0x${p.pc.toString(16).toUpperCase()} (data_type ${SIGS[D.sig].pc}, data_mode ${({16:0,20:1,24:2})[p.dep]}) · Pd = ${p.pd||'not modelled'}`,10,112);
  c.fillStyle= p.pa1===(p.pc&0x7F)?SIM.css('--accent'):SIM.css('--bad'); c.fillText(`pa1(6:0) = ${p.pa1} ${p.pa1===(p.pc&0x7F)?'= Pc[6:0] ✓':'≠ Pc[6:0] ('+(p.pc&0x7F)+') — wrong bits for '+p.dep+'-bit streams'}`,10,132);
  el.innerHTML=`Matches 4 zero words then Pa/Pb in all three alignments (0xF87200/0x4E1F00, 0x6F8720/0x54E1F0, 0x96F872/0xA54E1F). The data-type grab is only right in 16-bit mode. The block is not instantiated in any of the five FPGA copies (orphan file); the CAT552 or CAT1100 does its own detection.`;
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
const sel=(id,opts,v)=>`<select id="${id}">${opts.map(([k,l])=>`<option value="${k}" ${String(k)===String(v)?'selected':''}>${l}</option>`).join('')}</select>`;
function controlsHTML(){
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
    <label>Bench ${sel('r72bench',[['chassis','AMS8E-1 Iss5'],['fixture','ET253 fixture + PC']],D.bench)}</label>
    <label>Card ${sel('r72card',[['cat552','CAT552 (P5)'],['cat1100','CAT1100 (P13)'],['none','none']],D.card)}</label>
    <label>FPGA ${sel('r72build',BUILD_KEYS.map(k=>[k,BUILDS[k].n]),D.build)}</label>
    <label>ATmega ${sel('r72fw',[['PA6','V050001 (reset PA6)'],['PE2','“Ali-Rem” (reset PE2)']],D.fw)}</label></div>
  <div class="small" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px">
    <label>Input ${sel('r72sig',Object.keys(SIGS).map(k=>[k,SIGS[k].n]),D.sig)}</label>
    <label>DE bits ${sel('r72dep',[[16,'16'],[20,'20'],[24,'24']],D.depth)}</label>
    <label>Mode ${sel('r72mode',[[1,'1'],[2,'2'],[4,'4']],D.mode)}</label>
    <label>AES in ${sel('r72in',[[1,1],[2,2],[3,3],[4,4]],D.input)}</label>
    <label>Ref ${sel('r72ref',[['INTERNAL','Internal'],['AES75','AES 75 Ω'],['AES110','AES 110 Ω']],D.reference)}</label>
    <label><input type="checkbox" id="r72front" ${D.frontLinked?'checked':''}> front board linked</label></div>
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
    <button data-a="pull">Pull + replug input</button><button data-a="refloss">Remove reference</button><button data-a="sdi">SDI relock</button><button data-a="tp6">Ground TP6</button><button data-a="upd">In-chassis update</button><button data-a="clr">Clear events</button><button data-a="rst">Start over</button></div>`;
}
function bindControls(m){
  const on=(id,f)=>{ const e=m.querySelector('#'+id); if (e) e.onchange=ev=>f(ev.target.type==='checkbox'?ev.target.checked:ev.target.value); };
  on('r72bench',A.bench); on('r72card',A.card); on('r72build',A.build); on('r72fw',A.fw); on('r72sig',A.sig); on('r72dep',A.depth); on('r72mode',A.mode); on('r72in',A.input); on('r72ref',A.ref); on('r72front',A.front);
  const map={pull:A.pull,refloss:A.refloss,sdi:A.sdi,tp6:A.tp6,upd:A.upgrade,clr:A.clearEv,rst:A.reset};
  m.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>map[b.dataset.a]());
  m.querySelectorAll('[data-fx]').forEach(b=>b.onclick=()=>{ const k=b.dataset.fx; if (k==='pwr') A.fxPower(); else if (k==='vs') A.fxVsync(!D.fx.vsync); else A.fxCmd(k); });
}
function bindBoard(el){
  el.querySelectorAll('.r72hot').forEach(g=>g.addEventListener('click',()=>{ const k=g.dataset.h; D.pick=k;
    if (k==='P5') A.card(D.card==='cat552'?'none':'cat552'); else if (k==='P13') A.card(D.card==='cat1100'?'none':'cat1100'); else SIM.refresh(); }));
}
function hostHTML(){ return `${hostSVG()}<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"><button data-fx="pwr">Fixture power</button><button data-fx="vs">VSYNC0 ${D.fx.vsync?'on':'off'}</button>${['Ping','Get ModuleInfo','Use Case Two','Get Metadata Subset'].map(c=>`<button data-fx="${c}">${c}</button>`).join('')}</div>`; }
function traceHTML(){ const e=D.log[0]; return e? `<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`+e.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Change the set-up or press a button. Each step the firmware, FPGA or card takes is listed here.</div>'; }
function frontDisp(t){ return `<svg viewBox="0 0 420 70" style="width:100%;max-width:420px;display:block"><rect width="420" height="70" rx="6" fill="#040504"/><g>${SIM.dotMatrix(displayText(t),14,14,6.4,'var(--vfd)','rgba(140,200,90,.07)')}</g></svg>`; }

function inspector(t){
  const v=fwVars(t), r=regs(), st=stepAt(t), d=decodeAt(t), p=preamble();
  return `<table class="kv">
    <tr><th>Main-loop pass</th><td class="mono">#${st.pass} · ${STEPS[st.step][0]}${st.stall?' <b style="color:var(--warn)">STALLED</b>':''}</td></tr>
    <tr><th>Card</th><td class="mono">${D.bench==='fixture'?'CAT1100 on ET253':D.card} · ${cardState(t)} · ${d.ok?'<span style="color:var(--accent)">'+d.out+'</span>':'<span style="color:var(--warn)">'+d.why+'</span>'}</td></tr>
    <tr><th>Metadata frames synced</th><td class="mono">${syncedFrames(t).length} by the playhead${metaSource()==='cat1100'?' (CAT1100 packets: never)':''} · SPI_data_buffer[0] = ${v.synced?hx(v.byte0):'—'}</td></tr>
    <tr><th>RAW_bitstream_format → Dformat</th><td class="mono">${hx(v.RAW)} → ${v.Dformat} (${['no lock','PCM','Dolby Digital','Dolby E'][v.Dformat]})</td></tr>
    <tr><th>configuration · frame_rate · data_rate</th><td class="mono">${v.configuration} · ${v.frame_rate} · ${v.data_rate}</td></tr>
    <tr><th>ProgramNumber · dialnorm</th><td class="mono">${hx(v.ProgramNumber)} · ${v.dialnorm}${D.frontLinked?' <span style="color:var(--bad)">(stale: ProgramNumber = ‘C’)</span>':''}</td></tr>
    <tr><th>ALTERA_SORT 75–79</th><td class="mono">${[75,76,77,78,79].map(k=>`[${k}] ${hx(r[k])}`).join(' ')}</td></tr>
    <tr><th>UART0 frame</th><td class="mono small">${uartFrame(t).map(hx).join(' ')}</td></tr>
    <tr><th>337 preamble</th><td class="mono">${p?`Pa 0x${p.pa.toString(16).toUpperCase()} Pb 0x${p.pb.toString(16).toUpperCase()} Pc ${p.pc} (${p.dep}-bit)`:'— (PCM)'}</td></tr>
  </table>`;
}
function viewSim(m){
  window.__rd72Active=false;
  m.innerHTML = `${card('Set-up', controlsHTML())}
  <div class="grid2">
    <div>${card('AMS8E-1 Iss5 bottom side — both decoder sockets (click P5 or P13 to fit a card)', `<div id="bd"></div>`)}
      ${card('Front display (AMS8 8-character), driven by Dformat', `<div id="fd"></div>`)}
      ${card('Bench: Dolby ET253 fixture and host PC', `<div id="host"></div>`)}</div>
    <div>${card('What the code did (last action)', `<div id="trace" class="log"></div>`)}${card('State at the playhead', `<div id="insp"></div>`)}</div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek)', `<canvas id="tl"></canvas><p class="small muted">Main-loop pass ≈ 4 ms is ${inf} (the 80-byte bit-banged ALTERA_read_write at 4.9152 MHz dominates; the same figure as the AMS8-1 model). CAT552 metadata bit clock ${inf}; CAT1100 subset clock 125 kHz is the module’s default; packet sizes ${inf}.</p>`)}
  <div class="grid2">${card('Scope: SMPTE 337 burst start as non_audio_detector sees it', `<canvas id="sc"></canvas><div id="scn" class="small muted"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#bd').innerHTML=boardSVG(t); bindBoard(m.querySelector('#bd'));
    m.querySelector('#fd').innerHTML=frontDisp(t)+`<div class="small muted">“${displayText(t)}” · UART0 byte after ‘A’ = Dformat ${fwVars(t).Dformat}</div>`;
    m.querySelector('#host').innerHTML=hostHTML(); bindControls(m.querySelector('#host'));
    m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#insp').innerHTML=inspector(t);
    m.querySelector('#log').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('')||'<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
    drawScope(m.querySelector('#sc'), m.querySelector('#scn'));
  };
  bindControls(m);
  SIM.on('time', draw);
}

/* ---------------- tutorial: the evaluation, as the engineer did it ---------------- */
const has=k=>D.ev.some(e=>e.k===k);
const LESSONS = [
  {title:'Why RD72 exists', body:`<p>Ward-Beck’s decoding products (POD31, M6202, M6206, D6207A, the AMS8 “M” variants) plug a <b>Dolby CAT552</b> decoder module into a 72-pin SIMM socket. On <b>16 Aug 2013</b> Dolby announced the CAT552 would be withdrawn from sale on <b>31 Dec 2014</b>, with software support ending <b>30 Jun 2016</b>, and named the <b>CAT1100</b> as its functional replacement.</p><p>The CAT1100 is a different part: a 100-pin Molex card (47.5 × 73.66 mm), 3.3 V instead of 5 V, three DSPs, and a packet host protocol instead of strap pins. The AMS8E-1 issue 5 board (Gerbers 1 Nov 2012) already carries both sockets: P5 for the CAT552 and P13 for the CAT1100.</p><p class="muted">Click Next.</p>`, check:()=>true, auto:true},
  {title:'1 · Bring the card up on the bench', body:`<p>An engineer first meets a new module on the maker’s fixture, not in the product. Set <b>Bench = ET253 fixture</b> and press <b>Fixture power</b>.</p><p>The run-mode pins RUN0/RUN1 = 11 select a normal boot; the manual says boot takes under 20 s. The blue LED DS2 shows boot, and both error pins are held low until it is done.</p>`, check:()=>D.bench==='fixture'&&D.fx.power, hint:'Bench selector → ET253 fixture, then “Fixture power”.'},
  {title:'2 · Is anybody home? Ping it', body:`<p>The host serial port is strapped as an <b>SPI slave</b> (HPC = 110). The PC is the master, so after each command it has to clock dummy bytes to read the reply. The card pulls <span class="mono">/HSP_ATN</span> low when it has something to say.</p><p>Press <b>Ping</b>. Watch the “Host SPI” lane on the Simulator tab.</p>`, check:()=>D.fx.pinged, hint:'Press Ping in the host window.'},
  {title:'3 · Read what it is', body:`<p>Press <b>Get ModuleInfo</b>: three Get Value requests for ProductName, SerialNumber and ReleaseVersion. Every reply carries its own command status.</p><p>The archive holds firmware 2.0.0.4 (cat1100.mod, Nov 2014), so the evaluation was still going a year after the FPGA work.</p>`, check:()=>D.fx.info, hint:'Press Get ModuleInfo.'},
  {title:'4 · Configure it for Dolby E', body:`<p>Dolby’s Use Case Guide gives a ready script for Dolby E decoding (Use Case Two). Press <b>Use Case Two</b>: it is a list of Set Value writes (BsDetect_0.muteMask, Decode_0.DolbyE_vsyncAlign, Downmix_0.auxMixType …).</p><p>Read the trace: the strap values in that use case are exactly the ones Ali later wrote into cat1100.xls.</p>`, check:()=>D.fx.cfg, hint:'Press Use Case Two.'},
  {title:'5 · Feed Dolby E and read the metadata', body:`<p>Set <b>Input = Dolby E</b>. With vsyncAlign = 1 the card wants a frame reference: turn <b>VSYNC0 on</b>. Then press <b>Get Metadata Subset</b>.</p><p>On the bench the green DS1 lights for a valid coded input and the metadata comes back as named fields: PROGRAM_CONFIG, FRAME_RATE, DIALNORM …</p>`, check:()=>D.sig==='dolbyE'&&D.fx.vsync&&D.fx.meta, hint:'Input → Dolby E; VSYNC0 on; Get Metadata Subset.'},
  {title:'6 · Into the product: the 13 August build', body:`<p>Now put the card in the AMS8E-1. Set <b>Bench = AMS8E-1</b>, <b>Card = CAT1100</b> and <b>FPGA = ali/backup1 (13 Aug 2013)</b>: the only copy that wires everything: audio, straps, reset on PORTA6, and the subset metadata into the ATmega’s SPI pins.</p><p>Look at the board: every P13 dot goes to the FPGA, never to the ATmega.</p>`, check:()=>D.bench==='chassis'&&D.card==='cat1100'&&D.build==='backup1', hint:'Three selectors: bench, card, FPGA.'},
  {title:'7 · Why does the display say PCM?', body:`<p>With Mode 1 and Dolby E in, the decoded audio comes out, but the AMS8 shows “<span class="mono">  PCM   </span>” (or only the lock state). Find out why in the timeline lanes <i>metadata SPI</i> and <i>spi_stc_isr</i>.</p><p>The firmware still hunts for the CAT552’s <b>0x02 0xCF</b> header and a 134-byte frame. The CAT1100 sends DHIP-style subset packets, so <span class="mono">frame_sync</span> never sets, <span class="mono">RAW_bitstream_format</span> keeps its start value 1, and <span class="mono">Dolby_Bitstream_Format_Conversion</span> falls to <span class="mono">default: Dformat = 1</span> (PCM).</p>`, check:()=>D.bench==='chassis'&&D.card==='cat1100'&&D.build==='backup1'&&D.sig==='dolbyE'&&D.mode===1, hint:'Input = Dolby E, Mode = 1.'},
  {title:'8 · The re-lock test', body:`<p>Pull the AES input out and plug it back (<b>Pull + replug input</b>). After 25 locked passes <span class="mono">RESET_CS8416</span> pulses the Dolby reset for 500 µs, as it did for the CAT552 so the decoder re-syncs.</p><p>With the CAT1100 that 500 µs pulse costs a full re-boot (under 20 s, ${inf} 18 s here): the monitor goes silent. Scrub forward to see the card state lane go red then orange.</p>`, check:()=>D.card==='cat1100'&&D.build==='backup1'&&has('pull'), hint:'Press “Pull + replug input” with the CAT1100 on backup1.'},
  {title:'9 · Compare: the CAT552 on the same firmware', body:`<p>Set <b>Card = CAT552</b>, <b>FPGA = ali/v050000 (28 Aug)</b>, then pull the input again. The pulse now goes nowhere: the firmware drives PA6, but the CAT552 reset (RESET_552) is wired to PE2.</p><p>Switch <b>ATmega = “Ali-Rem” (reset PE2)</b> and pull again: the old code resets the CAT552 directly.</p>`, check:()=>D.card==='cat552'&&D.fw==='PE2'&&has('pull'), hint:'Card CAT552, ATmega PE2, then Pull + replug.'},
  {title:'10 · Can we update it in the field?', body:`<p>Dolby’s field bulletin FB259 says products must be able to update the card in-chassis, over the host port, with RUN0/RUN1 under control. Press <b>In-chassis update</b>.</p>`, check:()=>D.updTried, hint:'Press “In-chassis update”.'},
  {title:'11 · Where it was left', body:`<p>Select <b>FPGA = ali/v050000 (28 Aug 2013)</b>. That copy, saved the same day as cat1100.xls and pins.xls, puts the CAT552 back in charge and parks the CAT1100: straps kept, inputs and clocks grounded, reset and /AOK on test points TP6 and TP2, errors on TP3/TP5.</p><p>The R&D list keeps RD72 at priority A, never marked Z (completed). The production notes say the CAT1100 connector “needs to be masked off when not used”. So the CAT1100 was evaluated and half-integrated, but in the archived builds it never <b>replaced</b> the CAT552.</p>`, check:()=>D.build==='ali'&&D.updTried, hint:'Finish step 10, then FPGA → ali/v050000.'},
];
let lessonIdx=0;
function viewTutorial(m){
  window.__rd72Active=false;
  m.innerHTML=`<div class="grid2"><div>${card('Tutorial — evaluating the CAT1100 as a CAT552 replacement', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('What the code did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The set-up', `<div id="ctl"></div>`)}${card('Board', `<div id="bd"></div>`)}${card('Bench', `<div id="host"></div>`)}</div></div>`;
  const draw=()=>{
    m.querySelector('#ctl').innerHTML=controlsHTML(); bindControls(m.querySelector('#ctl'));
    m.querySelector('#bd').innerHTML=boardSVG(SIM.t)+frontDisp(SIM.t); bindBoard(m.querySelector('#bd'));
    m.querySelector('#host').innerHTML=hostHTML(); bindControls(m.querySelector('#host'));
    m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}">${l.title}${l.check()&&!l.auto?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx], ok=L.check();
    m.querySelector('#lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); lessonIdx=0; draw(); };
  };
  SIM.on('time', draw);
}

/* ---------------- one second ---------------- */
function viewSecond(m){
  window.__rd72Active=false;
  const s=sig(), per=s.coded?s.per:0.032;
  const rows=[
    ['48 kHz audio samples','48,000','20.83 µs','both cards: Dolby E is 48 kHz only; DD/DD+ also 32/44.1 (CAT1100 headline)'],
    ['Coded frames ('+SIGS[D.sig].n+')', s.coded?(1/per).toFixed(2):'—', s.coded?SIM.fmtDur(per):'—', 'one SMPTE 337 burst each (Pa Pb Pc Pd)'],
    ['ATmega main-loop passes', String(Math.round(1/C.PASS)), SIM.fmtDur(C.PASS), inf+' — 80-byte bit-banged ALTERA chain dominates'],
    ['UART0 bytes to the front board', String(Math.round(1/(C.TX_EVERY*C.PASS))), SIM.fmtDur(C.TX_EVERY*C.PASS), '20-byte frame “#A…$” every '+SIM.fmtDur(20*C.TX_EVERY*C.PASS)],
    ['CAT552 metadata frames accepted','≤ 3 per window', SIM.fmtDur(C.LOOP_CONSTANT*C.PASS)+' off', 'SPI_control: 3 buffers, then 400 passes with SPIE off'],
    ['CAT1100 subset packets', s.coded?(1/per).toFixed(1):'≈31', SIM.fmtDur(C.C1100_PKT*8/C.C1100_SMD)+' each', '125 kHz SPI master default; loudness packet every 500 ms'],
    ['Reset after input re-lock','1 pulse','500 µs', 'harmless for the CAT552, a < 20 s reboot for the CAT1100'],
    ['SDI relock stall','1','1.5 s','wait_ms(500) × 3 with no WDR — longer than the 1 s window'],
  ];
  m.innerHTML=card('One second on the AMS8E-1 with a decoder card', `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>note</th></tr>${rows.map(r=>`<tr>${r.map((x,i)=>`<td class="${i&&i<3?'mono':''}">${x}</td>`).join('')}</tr>`).join('')}</table>`)
   + card('Zoomed timeline (use the zoom menu; 1 frame, 1 pass, 1 byte)', `<canvas id="tl2"></canvas><div id="at" class="small mono" style="margin-top:6px"></div>`)
   + card('How long is a decoder reset?', `<canvas id="rb"></canvas><p class="small muted">Bars to scale on a log axis. CAT552 restart time is ${inf}; the CAT1100 “less than 20 seconds” boot is the manual’s headline figure.</p>`);
  const draw=()=>{ SIM.drawLanes(m.querySelector('#tl2'), lanes(), {labelW:210});
    const st=stepAt(SIM.t); m.querySelector('#at').innerHTML=`t = ${SIM.fmtT(SIM.t)} · pass #${st.pass} · ${STEPS[st.step][0]} · card ${cardState(SIM.t)} · display “${displayText(SIM.t)}”`;
    const {c,w}=SIM.canvas(m.querySelector('#rb'),110); c.clearRect(0,0,w,110); const L=v=>(Math.log10(v)+5)/(Math.log10(30)+5)*(w-160);
    [['reset pulse (fw)',500e-6,'--accent2'],['CAT552 restart',C.BOOT_552,'--accent'],['SDI stall',1.5,'--warn'],['CAT1100 boot',C.BOOT_1100,'--bad']].forEach(([n,v,col],i)=>{ c.fillStyle=SIM.css(col); c.fillRect(150,8+i*24,L(v),16); c.fillStyle=SIM.css('--ink'); c.font='11px sans-serif'; c.fillText(n,4,20+i*24); c.fillText(SIM.fmtDur(v),156+L(v),20+i*24); }); };
  SIM.on('time', draw);
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  aes:{x:10,y:30,w:150,h:70,t:'AES inputs 1–4',s:['FPGA AESRXSRC (Iss5)','8 receivers + SRC'],d:'Issue 5 moved AES receive and sample-rate conversion into the FPGA (AESRXSRC, Altera SRC reference design per the RD72 README). Lock comes back to the ATmega through spicontrol register 0x00.'},
  fpga:{x:220,y:30,w:200,h:150,t:'U4 EP4CE40 FPGA',s:['router: EAD → card','DD1–DD4, DD_AUX ← card','CATMAPERR → PORTG1','spicontrol (reg 0x00)','straps / test points'],d:'The FPGA owns every CAT1100 pin and the CAT552 audio pins. Which socket is live depends on the FPGA copy (see the Set-up selector).'},
  c552:{x:520,y:10,w:170,h:80,t:'P5 CAT552 (SIMM)',s:['+5 V, strap pins','metadata SPI → ATmega'],d:'Configured by strap pins (MOD, MAP, PRG, DLM, PLE, PLS, PGP, ACS, PDN — cat1100.xls column “CAT552 Value”). Its metadata SPI (MSD/MSFS/MSBC) and ERR and RESET_552 go straight to the ATmega on the PCB.'},
  c1100:{x:520,y:150,w:170,h:90,t:'P13 CAT1100 (100-pin)',s:['+3.3 V, 3 DSPs','host SPI/UART (DHIP)','subset SPI master'],d:'Configured at boot by HPC/ASF/OCS/RUN straps, at run time by Set Value packets on the host port. Every pin goes to the FPGA.'},
  mcu:{x:220,y:250,w:200,h:100,t:'U14 ATmega128L',s:['V050001 firmware','SPI slave ← metadata','alteraRead/Write (PC0–3)','80-byte ALTERA chain','UART0 → front board'],d:'Parses CAT552 metadata frames, packs routing registers 72–79, sends Dformat/config/dialnorm to the front board and pulses the Dolby reset on PA6 (was PE2).'},
  front:{x:10,y:250,w:150,h:70,t:'Front board',s:['8-char display','UART 9600 Bd'],d:'Shows “E 5.1+2”, “DD 3/2L”, “  PCM   ” from the Dformat and configuration bytes.'},
  out:{x:10,y:140,w:150,h:70,t:'Monitor / meters',s:['SHARC meters','DACs, speakers'],d:'Decoded channels come back on DD1–DD4 and DD_AUX and are metered and monitored like PCM.'},
  pc:{x:520,y:290,w:170,h:60,t:'Host PC + ET253',s:['cat1100_cli / gui','aardvark.dll (USB–SPI)'],d:'Only on the bench. Nothing on the AMS8E-1 drives the host serial port.'},
};
const WIRES=[['aes','fpga','I²S'],['fpga','c552','EAD, DADA–DADM'],['fpga','c1100','IADA0, OADA0–4, SMD_*'],['c552','mcu','MSD→PB2, RESET_552, ERR',0.78],['mcu','fpga','PC0–3, PA6, chain'],['fpga','out','DD1–4'],['mcu','front','UART0'],['pc','c1100','HSP (bench)']];
function viewBlock(m){
  window.__rd72Active=false; let sb='c1100';
  m.innerHTML=`<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bi"></div>`)}${card('In one sentence', `<p>The FPGA decides which socket hears the coded stream and whose outputs reach the monitor; the ATmega reads the decoder’s metadata on its own SPI pins and resets the card when lock changes — and both of those habits were written for the CAT552.</p>`)}</div></div>`;
  const draw=()=>{ const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 700 360" style="width:100%"><defs><marker id="r72ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    let lbl='';
    const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const k=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9, dy?(bx.h/2)/Math.abs(dy):1e9); return [x+dx*k,y+dy*k]; };
    WIRES.forEach(([a,b,l,fr],i)=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_); [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sb===a||sb===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.4:1.2}" marker-end="url(#r72ar)"/>`;
      const q=fr||0.5, mx=x1+(x2-x1)*q-(fr?40:0), my=y1+(y2-y1)*q+(i%2?10:-4); lbl+=`<text x="${mx}" y="${my}" text-anchor="middle" font-size="10" fill="${hot?'var(--accent)':'var(--ink2)'}" stroke="var(--panel)" stroke-width="3" paint-order="stroke">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sb===k?'var(--accent)':'var(--line)'}" stroke-width="${sb===k?2.5:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+lbl+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sb=g.dataset.b; draw(); });
    m.querySelector('#bi').innerHTML=`<h3>${BLOCKS[sb].t}</h3><p>${BLOCKS[sb].d}</p>`; };
  draw();
}

/* ---------------- schematics (redrawn from net names) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*17; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.3"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([pin,net],i)=>{ const yy=y+20+i*17; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+4}" y="${yy+4}" font-size="10" fill="var(--ink)">${pin}</text><text x="${x-33}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--accent2)">${net}</text>`; });
  right.forEach(([pin,net],i)=>{ const yy=y+20+i*17; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-4}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${pin}</text><text x="${x+w+33}" y="${yy+4}" font-size="10" fill="var(--accent2)">${net}</text>`; });
  return s;
}
const SHEETS=[
  {name:'1 · P13 CAT1100 socket', note:'Pin numbers and nets from Ams8e-1iss5-net.ipc; FPGA balls from AMS81.qsf (ali/v050000). The PCB nets on pins 1 and 86 read HPC0 / HPC2; Dolby’s pin-out (and pins.xls “Correct Pin Name”) says pin 1 = HPC2, pin 86 = HPC0. Pins 80/82 are N_HSP_IRQ / N_HSP_BSY on the PCB, EXPIO15/16 in Issue 1 of the manual.', svg:()=>
    chip(330,40,180,'P13 Molex 55091-1075',[['8 IADA0','U4 AB19'],['6 IAFS0','U4 AA20'],['4 IABC0','U4 AA21'],['28 OADA0','U4 W15'],['21 OADA1','U4 T16'],['23 OADA2','U4 V16'],['25 OADA3','U4 W14'],['59 OADA4','U4 V9'],['30 OAFS','U4 T15'],['32 OABC','U4 U14'],['47 VSYNC0','U4 U12'],['97 SMD_TXD','U4 Y4'],['56 SMD_CLK','U4 AA14'],['58 SMD_DS0','U4 AB13']],
      [['1 (HPC0 net = HPC2)','U4 AB20'],['39 HPC1','U4 V12'],['86 (HPC2 net = HPC0)','U4 AA5'],['67/65/93 OCS0–2','V7/Y7/Y6'],['69/73/76 ASF0–2','U8/U7/AB7'],['72/85 RUN0/1','AB8/Y10'],['99 N_RST','U4 Y3'],['92 N_AOK','U4 AA4'],['53 N_ERR','U4 T10'],['57 N_ERR1','U4 V10'],['36/38/40 HSP','U13/AA17/AB16'],['44 N_HSP_SEL','U4 AA16'],['51 N_HSP_ATN','U4 T11'],['80/82 IRQ/BSY','AA7/AB5']],'+3.3 V on 10 pins, ground on 15 (redrawn)')},
  {name:'2 · P5 CAT552 socket and the ATmega', note:'P5 nets and U14 pins from the netlist. The CAT552 talks to the ATmega directly; the CAT1100 never does.', svg:()=>
    chip(120,50,170,'P5 CAT552 (72-pin SIMM)',[['3 RST','RESET_552'],['70 ERR','ERR'],['57 MSD','PB2'],['58 MSFS','PB0'],['59 MSBC','PB1'],['49/50/51 EAD/EAFS/EABC','U4 P5/N7/P4'],['45/46 DADA/DADB','U4 P3/P6'],['53/54/52 DADC/DADD/DADM','U4 M3/M4/N5'],['55/56 DAFS/DABC','U4 M1/M5']],[['7/8 MAP0/1','U4 V4/V3'],['11–13 PRG0–2','U4 T3/T4/U1'],['31–33 DLM0–2','U4 T5/P2/P1'],['34/35/36 PLE/PLS/PGP','U4 N2/N1/M2'],['17/18 PDN/ACS','U4 R2/R1'],['60 META','U25-4']],'+5 V')
    + chip(560,50,160,'U14 ATmega128L',[['4 PE2','RESET_552'],['9 PE7','ERR'],['10 PB0 SS','PB0'],['11 PB1 SCK','PB1'],['12 PB2 MOSI','PB2'],['45 PA6','PORTA6 → U4 A16'],['34 PG1','PORTG1 ← CATMAPERR']],[['35–38 PC0–3','spicontrol'],['39–42 PC4–7','ALTERA chain'],['2/3 RX/TX','CPU_RX/TX'],['23/24 X2','4.9152 MHz']],'SPCR = 0xCC: SPI slave, mode 3')},
  {name:'3 · The five FPGA copies', note:'Each row is what the .bdf of that copy connects (traced net by net). “—” = pin present but unconnected.', svg:()=>{
    const cols=['CAT552 audio','CAT1100 IADA0','OADA → router','SMD → PB0–2','N_RST','N_AOK','VSYNC0'];
    const rows=[['v050000 3 Jun','drawn, pins unplaced','—','—','—','—','—','—'],['adam 20 Jun','cut','EAD','DD1–4, AUX','—','—','—','—'],['backup1 13 Aug','cut','EAD','DD1–4, AUX','yes','PORTA6','GND','GND'],['backup2 22 Aug','yes','EAD (shared)','—','—','VCC','GND','GND'],['ali 28 Aug','yes','GND','—','—','TP6','TP2','GND']];
    let s='<g font-size="11" fill="var(--ink)">'; ['copy'].concat(cols).forEach((h,i)=>{ s+=`<text x="${20+i*112}" y="60" font-weight="700">${h}</text>`; });
    rows.forEach((r,j)=>r.forEach((v,i)=>{ s+=`<text x="${20+i*112}" y="${90+j*30}" fill="${v==='—'||v==='cut'||v==='GND'?'var(--ink2)':'var(--accent)'}">${v}</text>`; }));
    return s+'</g>'; }},
  {name:'4 · CATMAPERR and the error loop', note:'CATMAPERR.vhd: on each LRCLK it compares stream 1 (decoded ch 1/2) with streams 2 and 3. CATERR = 1 when ch 1/2 are all-zero while ch 3–6 are all non-zero. Its header comment (“detect IEC61934/smpte337m compressed audio synch”) is copied from non_audio_detector.vhd.', svg:()=>
    chip(120,60,170,'CATMAPERR',[['LRCLK','lrm / DAFS'],['SCLK','sclkm / DABC'],['I2S_1','DADA (DD1)'],['I2S_2','DADB (DD2)'],['I2S_3','DADC (DD3)']],[['CATERR','MAP_ERR → SOFT → portg1'],['ZERO','MAP_ZERO (unused)']],'FPGA')
    + `<text x="470" y="80" font-size="12" fill="var(--ink)">ATmega PG1 (DOLBY_AUDIO_CAT_ERROR_FLAG)</text><text x="470" y="100" font-size="12" fill="var(--ink2)">DOLBY_CAT552_AUDIO_ERROR_CHECK, Mode 1 only,</text><text x="470" y="118" font-size="12" fill="var(--ink2)">once per Dformat change:</text><text x="470" y="140" font-size="12" fill="var(--ink2)">10 001 passes of CATERR (≈ 40 s ${'(inferred pass)'})</text><text x="470" y="158" font-size="12" fill="var(--ink2)">→ PA6 low, wait_ms(500), PA6 high</text>`},
];
function viewSchem(m){
  window.__rd72Active=false; let i=0;
  m.innerHTML=card('Schematic set (redrawn from the netlist, .qsf and .bdf — not the Altium drawings)', `<div id="st" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p>`);
  const draw=()=>{ m.querySelector('#st').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#st button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 900 400" style="width:100%;min-width:680px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="5" y="5" width="890" height="390" fill="none" stroke="var(--line)"/><text x="885" y="388" text-anchor="end" font-size="10" fill="var(--ink2)">RD72 · sheet ${i+1}/${SHEETS.length} · redrawn 2026|59</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#sn').textContent=SHEETS[i].note; };
  draw();
}

/* ---------------- software ---------------- */
function viewSoft(m){
  window.__rd72Active=false;
  m.innerHTML=`<div class="grid2">${card('ATmega main loop (V050001 main()) — lit box runs at the playhead', `<div id="flow"></div>`)}
    <div>${card('Metadata path: spi_stc_isr state machine', `<div id="fsm"></div>`)}${card('Format detection, three ways', `<div id="fmt"></div>`)}</div></div>
    <div class="grid2">${card('Host interface: CAT552 straps vs CAT1100 parameters', `<div id="host"></div>`)}${card('Registers the ATmega writes', `<div id="reg"></div>`)}</div>`;
  const draw=()=>{ const st=stepAt(SIM.t), v=fwVars(SIM.t);
    let f=`<svg viewBox="0 0 420 ${STEPS.length*34+20}" style="width:100%;max-width:520px">`;
    STEPS.forEach((s,j)=>{ const y=8+j*34, on=j===st.step; f+=`<rect x="10" y="${y}" width="400" height="26" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="18" y="${y+17}" font-size="11" fill="${on?'#fff':'var(--ink)'}">${s[0]}</text>`; });
    m.querySelector('#flow').innerHTML=f+'</svg><p class="small muted">The init sequence before the loop: initialization(), TDM FSYNC held low, 9 × wait_ms(500) (4.5 s), CONFIGURE_ALTERA, RECALL_MODE/MIX_FROM_EEPROM, one ALTERA exchange, init_CS8416, RESET_SHARC, FSYNC released. ALIGNMENT_CHECK’s “while (error0 == 0) NOP();” is commented out.</p>';
    const src=metaSource(); const fs=[['frame_sync = NO','shift frame_sync2 ← frame_sync1 ← SPDR'],['0x02 then 0xCF seen','frame_sync = YES, receive_in = 0'],['receive_in < 134','SPI_data_buffer[receive_in++] = SPDR'],['byte 135','SPI_data_buffer[135] = SPDR (index 134 skipped); buffer_full = YES'],['main loop','SPI_translation → masks → Metadata_translation → Dformat']];
    const cur = !src? -1 : src==='cat1100'? 0 : v.synced? 4 : 0;
    m.querySelector('#fsm').innerHTML=fs.map((r,i)=>`<div style="padding:4px 8px;margin:3px 0;border-radius:6px;background:${i===cur?'color-mix(in srgb,var(--accent) 20%,transparent)':'var(--chip)'}"><b class="mono">${r[0]}</b> → ${r[1]}</div>`).join('')+`<p class="small">${src==='cat1100'?'<b style="color:var(--bad)">CAT1100 packets loop forever in the first state.</b>':src?'CAT552 frames sync.':'Nothing reaches PB0–PB2 in this set-up.'}</p>`;
    const p=preamble();
    m.querySelector('#fmt').innerHTML=`<table class="kv"><tr><th>FPGA non_audio_detector.vhd</th><td>Pa/Pb in 16/20/24-bit alignment; pa(7) held 32767 LRCLKs (≈ 0.68 s). ${p?`Here: pa1 = ${p.pa1}`:'—'}. <b>Not instantiated</b> in any copy.</td></tr>
      <tr><th>Card (CAT552 / CAT1100)</th><td>The decoder detects the burst itself. CAT552 reports it in byte 0 of its frame (0x00–0x30 DD, 0x40/0x50/0x60 Dolby E 24/20/16-bit). CAT1100: BsDetect_0 (muteMask), and the subset type (PCM, Dolby E, DD, DD+, loudness).</td></tr>
      <tr><th>ATmega Dolby_Bitstream_Format_Conversion</th><td>RAW = ${hx(v.RAW)} → Dformat ${v.Dformat}. Modes 2 and 6 only report 0/1 from lock; Mode 4 decodes only input 4. No case for DD+.</td></tr></table>`;
    m.querySelector('#host').innerHTML=`<table class="kv"><tr><th>CAT552 (pins, cat1100.xls)</th><td class="mono small">MOD0/1 = 11 auto detect · MAP0/1 = 01 Lo/Ro aux · PCL 0 · PME 1 · PRG = 111 programme 1 · DCM 11 line · ACM 1 · PDN 1 off · PLS 1 · PGP 0 · ACS 1 channel 1 · CPE 1 serial control off</td></tr>
      <tr><th>CAT1100 straps (Aug 2013)</th><td class="mono small">HPC = 110 SPI slave · ASF = 000 I²S · OCS = 110 OABC/OAFS inputs · RUN = 11 normal · N_HSP_SEL = 1 (never selected) · HSP_CLK/RXD = 0</td></tr>
      <tr><th>CAT1100 run-time (bench only)</th><td class="mono small">${Object.keys(D.fx.params).length? Object.entries(D.fx.params).map(([k,v])=>k+' = '+v).join('<br>') : 'no Set Value sent yet (fixture → Use Case Two)'}</td></tr></table>
      <p class="small muted">On the CAT552 each feature is a strap pin the FPGA can drive (PLE ← cntrl[27], byte 76 bit 3). The CAT1100 has no such pins: PLE, PRG, DLM, MAP become parameters behind the host port, and nothing in the AMS8E-1 drives that port.</p>`;
    const r=regs(); m.querySelector('#reg').innerHTML=`<table class="kv"><tr><th>alteraWrite / alteraRead</th><td class="mono small">bit-banged on PC0 SCLK, PC1 MOSI, PC2 CS (active high), PC3 MISO; address | 0x80 = read. Only register 0x00 (aesrx_lock) is implemented in spicontrol.v; altspi.h still names 0x0F/0x0E LEDs and 0x11 Gennum chip-selects from the M6205.</td></tr>
      ${[[75,'dialnorm 7–5, mute 4, mode4 3, non-in-4 2, solo 1–0'],[76,'monitor 7, demux 6–5, monitor on 4, PLE 3, reference 2–0'],[77,'SRC bypass 7–4, CAT552 input one-hot 3–0'],[78,'swap, AES4/AES3 routing'],[79,'AES3/2/1 routing']].map(([k,d])=>`<tr><th>ALTERA_BUFFER_out[${k}]</th><td class="mono">${hx(r[k])} <span class="muted small">${d}</span></td></tr>`).join('')}</table>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__rd72Active=false;
  const li=(h,b)=>`<li><b>${h}</b> ${b}</li>`;
  m.innerHTML = card('Did the CAT1100 replace the CAT552?', `<p><b>For Dolby, yes; in the archived Ward-Beck builds, no.</b> Dolby’s notice of 16 Aug 2013 withdraws the CAT552 (last sale 31 Dec 2014, software support to 30 Jun 2016) and names the CAT1100 as its functional replacement. Ward-Beck designed the AMS8E-1 issue 5 with both sockets and wired the CAT1100 fully into one FPGA copy (ali/backup1, 13 Aug 2013). Fifteen days later the latest copy (ali/v050000, 28 Aug) and the pin spreadsheets put the CAT552 back as the working decoder and park the CAT1100 on test points. The ATmega firmware never learned the CAT1100’s packet protocol. RD72 stays at priority A on the R&D list, not completed. Dolby firmware 2.0.0.4 (Nov 2014) in the deliverables shows the evaluation was still alive a year later, but no Ward-Beck code for it is archived.</p>`)
  + card('What RD72 is up to — findings from the source', `<ol>
    ${li('The firmware cannot read CAT1100 metadata.', '<span class="mono">spi_stc_isr</span> (v200w.c) looks for the CAT552 header 0x02 0xCF and 134 bytes. The CAT1100 subset port sends DHIP-format packets, so with backup1 routing SMD_* to PB0–PB2 the ISR never syncs; <span class="mono">RAW_bitstream_format</span> keeps its start value 1 and <span class="mono">Dolby_Bitstream_Format_Conversion</span> reports PCM for Dolby E.')}
    ${li('The new reset line reaches nothing in the final build.', 'Every Dolby reset was moved from PE2 (RESET_552, wired to P5-3) to PA6 (“Ali-Add”). PA6 goes to FPGA A16, which only ali/backup1 connects to N_RST; pins.xls lists it “not assigned”. With V050001 and ali/v050000 neither card is ever reset by the firmware.')}
    ${li('Resetting on every lock change suits the CAT552, not the CAT1100.', 'RESET_CS8416, RESET_CS8416_REF, the Pro Logic switch and the SDI edge each pulse the decoder reset (500 µs or 500 ms). The CAT1100 needs only 1 µs but then reboots, under 20 s by the manual, so each re-lock would silence the monitor.')}
    ${li('“DOLBY_INSTALLED” is the CAT552 error pin.', 'dolby.h: <span class="mono">PINE & BIT7</span> is net ERR from P5-70, with the PORTE pull-up on. With only a CAT1100 fitted it floats high, so DOLBY_DECODER_STATUS always says installed; the CAT1100’s N_ERR/N_ERR1 go to the FPGA and end on test points.')}
    ${li('ProgramNumber is always ‘C’.', 'UART0_translate tests <span class="mono">rx_buffer[3] == chC</span> and then stores <span class="mono">ProgramNumber = rx_buffer[3]</span>, i.e. 0x43. SPI_translation and Metadata_translation only copy dialnorm and the other per-programme fields inside <span class="mono">if (ProgramNumber == NO1…NO8)</span>, so once the front board talks they stop updating.')}
    ${li('Index 134 is never written.', 'The ISR stores bytes 0–133, then writes the next byte to <span class="mono">SPI_data_buffer[135]</span>. Harmless (the parser stops at byte 115), but a sign the 136-byte buffer was sized by trial.')}
    ${li('Dead branch in the UART reply.', 'In UART0_transmit_counter the ‘K’ / analog_available bytes are tested inside the <span class="mono">uart_tx_data0 == 16</span> branch, so they can never be sent.')}
    ${li('No DD+ handling.', 'The CAT552 decodes Dolby Digital Plus (Dolby’s notice), but the WBS format switch has only DD and Dolby E codes; anything else is PCM.')}
    ${li('VSYNC0 is grounded.', 'All August copies tie VSYNC0 to ground, yet the manual requires a vertical sync reference for Dolby E, and Use Case Two (whose straps WBS copied) aligns Dolby E to VSYNC0. The AMS8E-1 has no video reference input on P13.')}
    ${li('No in-chassis update path.', 'FB259 requires field updates over the host port. HSP_CLK/HSP_RXD are tied low, N_HSP_SEL high, RUN0/RUN1 high: the card could only be updated on the ET253 fixture.')}
    ${li('Pin-name mismatches caught by hand.', 'The PCB nets on P13 pins 1 and 86 are HPC0 and HPC2, reversed against Dolby’s pin-out; pins 80/82 are N_HSP_IRQ/N_HSP_BSY on the PCB but EXPIO15/16 in Issue 1 of the manual. pins.xls adds a “Correct Pin Name” column, and the FPGA .qsf follows Dolby’s numbering.')}
    ${li('The master FPGA copy is not the newest.', 'v050000 (3 Jun) draws the CAT552 audio nets but has no pin assignments for them; Adam’s (20 Jun) and Ali’s three August copies each wire the two sockets differently (Schematics sheet 3).')}
    ${li('Orphan and copied files.', 'non_audio_detector.vhd is not used by any copy, and its data-type grab (bits 14..8) is right only for 16-bit streams. CATMAPERR.vhd carries the same “detect smpte337m” comment but checks for silent decoded channels. altspi.c/.h are from the M6205 project (Glenn Greig, 12 Aug 2010) and still name its LED and Gennum GS2970/GS2962 registers.')}
    ${li('Comments that lag the code.', 'common.h says RX_BUFFER was raised to 24 (Apr 2 2013) but still defines 23. The error check is called DOLBY_CAT552_AUDIO_ERROR_CHECK and the router input byte is commented “CAT552 input” after the CAT1100 move.')}
    ${li('Power is not a problem.', 'The manual’s single-DSP case is about 0.6 A (2 W) at 3.3 V nominal. The AMS8E-1 test sheet measured +0.29 A at +5 V with the Dolby card fitted (see the AMS8E plugin), well inside RD22’s 1.7 A budget.')}
  </ol>`)
  + card('Products with Dolby decoder daughter cards', `<table class="kv">
    <tr><th><a href="siumulation.html?plugin=pod31#sim">POD31</a></th><td>Half-rack SDI de-embedder, plug-in CAT No. 552 (72-pin SIMM).</td></tr>
    <tr><th><a href="siumulation.html?plugin=m6202#sim">M6202</a></th><td>openGear twin of the POD31, CAT552 for Dolby E / AC-3.</td></tr>
    <tr><th><a href="siumulation.html?plugin=m6206#sim">M6206</a></th><td>openGear voice-over card for Astral, CAT552 decoder.</td></tr>
    <tr><th><a href="siumulation.html?plugin=d6207a#sim">D6207A</a></th><td>openGear decoder (Ross DED-8420), CAT552 module; the FPGA finds SMPTE 337 bursts and routes them to it.</td></tr>
    <tr><th><a href="siumulation.html?plugin=m6205#sim">M6205</a></th><td>openGear SDI audio processor; the CE300/CE400 and 3G+DD builds carry a decoder daughter card in the 72-pin SIMM. RD72’s altspi.c comes from this project.</td></tr>
    <tr><th><a href="siumulation.html?plugin=d6208a#sim">D6208A</a> · <a href="siumulation.html?plugin=d6208#sim">D6208</a></th><td>The D6208 line: the 2010 eight-input design socketed a CAT-559 (the module Dolby’s dual-DSP CAT1100 case is compared with). The D6208A 2007 schematic itself is the D6207A CAT552 platform.</td></tr>
    <tr><th><a href="siumulation.html?plugin=ams81#sim">AMS8-1</a> · <a href="siumulation.html?plugin=ams8e#sim">AMS8E</a></th><td>The host product and its boards; the AMS8-1 model runs the CAT552 path of the same V050001-era firmware.</td></tr></table>
    <p class="small">Every one of these uses the CAT552/CAT559 SIMM generation (5 V, strap pins). The CAT1100 is not pin- or voltage-compatible with them; Dolby’s manual maps the old signal names to new pins but warns the voltages are 3.3 V. None of them shows a CAT1100 redesign in the archive.</p>`)
  + card('Assumptions in this simulation', `<ul class="small">
    <li>Main-loop pass 4 ms, CAT552 metadata SPI at 1 MHz, CAT552 restart 0.3 s, CAT1100 boot 18 s (manual: under 20 s), CAT1100 subset packet 60 bytes, PCM metadata every 32 ms, host SPI 1 MHz on the fixture — all ${inf}.</li>
    <li>What the CAT1100 does with Dolby E when vsyncAlign is set and VSYNC0 is missing (warning, muted) is ${inf}; the manual only says the reference is required.</li>
    <li>The CAT1100 outline orientation on P13 and the ET253 fixture drawing are ${inf}. Card LED meanings follow the manual.</li>
    <li>The CAT552 frame shows only the bytes the WBS parser reads, with values chosen for the demo signals.</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>RD72-Cat1100/atmel/V050001/v200w.c, dolby.c/.h, altspi.c/.h, common.h</li><li>RD72-Cat1100/altera/{v050000, adam/v050000, ali/backup1, ali/backup2, ali/v050000}/AMS81.bdf, AMS81.qsf; CATMAPERR.vhd, non_audio_detector.vhd, spicontrol.v</li><li>RD72-Cat1100/cat1100.xls, pins.xls; Technical Documents/ (withdrawal notice, Implementation Manual, Use Case Guide, FB259); deliverables/ listings</li><li>RD22-MADI/PCB/AMS8E-1/Nov12012_FromIrinaFinal/Gerbers/Ams8e-1iss5.GBO, .GBS, -net.ipc · RD22-MADI/PRODUCTION/Sencore Production Notes.docx · R&amp;D_List.xls</li></ul>`);
}

/* ---------------- register ---------------- */
SIM.register({
  id:'rd72-cat1100', product:'RD72 CAT1100', year:2013,
  name:'RD72 CAT1100 · Dolby decoder module evaluation on the AMS8E-1 (2013|46)',
  folder:'ENGINEERING - 2016 RD FILES/RD72-Cat1100', family:'R&D register',
  summary:'Dolby withdrew the CAT552 decoder module in 2013 and named the CAT1100 as its replacement. RD72 put the new 100-pin card next to the old SIMM on the AMS8E-1 issue 5 main board. The model runs the ATmega firmware, five FPGA copies and the card’s host interface, from the bench fixture to the half-finished in-chassis integration.',
  highlights:['Both decoder sockets drawn from the issue-5 Gerbers and netlist','Five FPGA copies traced net by net','Metadata parser that cannot read CAT1100 packets','Reset line moved to a pin that goes nowhere','11-step evaluation tutorial, bench to chassis','Links to every CAT552/CAT559 product'],
  depth:'Full model', duration:1,
  stepUnits:[
    {label:'1 main-loop pass', period:()=>C.PASS},
    {label:'1 coded frame', period:()=>sig().coded?sig().per:0.032},
    {label:'1 UART0 byte slot', period:()=>C.TX_EVERY*C.PASS},
    {label:'1 AES sample', period:()=>1/C.FS},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.25,'250 ms'],[0.1,'100 ms'],[1001/30000,'1 Dolby E frame (33.4 ms)'],[0.012,'3 passes (12 ms)'],[0.004,'1 pass (4 ms)'],[0.0012,'1.2 ms'],[0.0002,'200 µs (10 samples)']],
  defaultZoom:1,
  init(){ window.__rd72Active=false; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: evaluating the CAT1100', render:viewTutorial},
    {id:'second', label:'One second', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
