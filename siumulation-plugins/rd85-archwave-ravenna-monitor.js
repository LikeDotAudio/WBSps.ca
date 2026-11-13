/* =====================================================================
   RD85 — Archwave RAVENNA / AES67 monitor (Ward-Beck R&D register, priority B, 2015|48–2016|49)
   Plugin for the WBS Device Simulator (../siumulation.html)

   What it models: the evaluation bench WBS built to put an Archwave uNet2500 ("uNet STANDARD")
   RAVENNA/AES67 module inside its 1RU AMS8-1 monitor platform (AMS8E-1 board), and the FPGA code that
   turns the module's I8S serial audio into the monitor's I2S/AES (off ramp) and back (on ramp).
   The bit-level FPGA path is a JavaScript port of the archived Verilog, run tick by tick.

   Sources (all in ENGINEERING - 2016 RD FILES/RD85-Archwave Ravenna Monitor/ unless noted):
   - Software/FPGA/backup6 … backup33 (Quartus II 11.1, AMS81.qpf): i8s_4xi2s.v, i2sx4_i8s.v, syncOneShotAli.v,
     zero_detector.v (backup6/9); i8sx2_i2sx8.v, i2sx8_i8sx2.v, sync_one_shot.v (backup25/27/33);
     AMS81.qsf pin assignments (ARCH_* on T1/T2/H7/J2/F1/E1; AVB_* in backup6/9), AMS81.sdc (ARCH_REF_12M288,
     ARCH_FSYNC_48K), altpll0.v (×8 of 12.288 MHz), clkdiv_98M304_to_12M288.vhd, i2sx16_tdmV2.v (backup33)
   - Software/atmel front/{backup2,backup3,V040100}/v200w.c, common.h (//Avb-Add " AES67 ", REVISION1..8)
   - Archwave/eval board/uNET_UserManual_11_17_2015.pdf (modes, config tree, packet time, receiver delay,
     timing example, debug console), Archwave/app_ARC_v2.0_draft.pdf (ARC frames, Net_GetPTPStatus 0xA2, COBS),
     Archwave/standard/pinout.xlsx + Book1.xlsx (X102 → H4 harness, FPGA pins, wire colours),
     Archwave/Archwave Price List May 2015 v2.pdf, uNet MINI / COMPACT / STANDARD datasheets
   - #software #Merging/ (Horus manuals, MTRAVENNA_DP2808 switch config), alc/ravenna/ (network requirements)
   - AMS81 - #Master/AMS8 - #Engineering/AMS8-1N/unet-standard-Parameters.xlsx (the "AMS8 Modification" column)
   - #MLC - #SERIES/MLC8N - #TESTREPORT/MLC8N-05AV0100-25MAY16.pdf, 32ME-N/ (rear plate drawing, photos)
   Front panel art reuses the AMS8-1 silk separations made for ams81.js (assets/ams81-*.png).
   Anything not stated in those files is marked "inferred" on screen. The vendor FTP login printed in the
   uNet manual is deliberately not reproduced.
   ===================================================================== */
(function(){
'use strict';
const SIM = window.SIM;
const ID = 'rd85-archwave-ravenna-monitor';
const ASSET = 'siumulation-plugins/assets/';

/* ---------- view kit (local; no globals) ---------- */
const inf = '<span class="tag-inf" title="Not stated in the archive; inferred">inferred</span>';
const infW = why => `<span class="tag-inf" title="Inferred: ${String(why).replace(/"/g,'&quot;')}">inferred</span>`;
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function tbl(head, rows){ return `<table class="kv"><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table>`; }
const Y = y => SIM.year(y);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const hex = (v,n) => (v>>>0).toString(16).toUpperCase().padStart(n||2,'0').slice(-(n||2));
const plink = (id, txt) => `<a href="siumulation.html?plugin=${id}">${txt}</a>`;
const css = n => SIM.css(n);
function bindActs(root, map){ root.querySelectorAll('[data-a]').forEach(b=>{ const f = map[b.dataset.a]; if (f) b.onclick = e=>{ e.preventDefault(); f(b.dataset.v, b); }; }); }
const hrand = n => { let x = (n*2654435761)>>>0; x ^= x>>>13; x = Math.imul(x, 0x5bd1e995)>>>0; x ^= x>>>15; return (x>>>0)/4294967296; };

/* ---------- constants from the archive ---------- */
const C = {
  MCLK: 12.288e6,        // ARCH_MCLK_PIN: create_clock -period 81.380ns (AMS81.sdc); the uNet's SCLK pin in I8S mode
  SCLK: 3.072e6,         // "3.072 MHz output clock" (i8sx2_i2sx8.v comments)
  PLL: 98.304e6,         // altpll0: inclk 81380 ps × 8 → ARCH_98M304
  LINK: 100e6,           // uNet STANDARD 100 Mbps network interface (user manual timing example)
  SWITCH: 150e-6,        // "~150us" network step in the manual's timing example
  IN_DLY: 16, OUT_DLY: 16,   // InputDelay1xFS / OutputDelay1xFS (parameter sheet; "~333us" in the manual)
  PLAYOUT: 512,          // User_PlayoutDelay default (parameter sheet; Merging default also 512)
  HDR: 12+8+20+14+4,     // RTP+UDP+IPv4+Ethernet+FCS bytes — standard values (inferred)
  WIRE_X: 8+12,          // preamble + inter-frame gap (inferred)
  MAXPAY: 1460,          // "a little less than 1500" bytes payload (manual) → 1500 − 20 − 8 − 12
  PHI: 16,               // AMS81 internal LRCLK phase vs FSYNC in MCLK ticks (inferred)
  FSYNC_SEEN: 1,         // FSYNC reaches the one-shot one MCLK after the data edge (inferred; makes AvPortAlign 0 work, as shipped)
};
const LEVELS = [-18,-18,-12,-24,-6,-30,-9,-15];   // stand-in test programme from the Horus (inferred)
const FREQS  = [1000,1000,400,400,2000,2000,100,100];
const PTP_NAMES = {1:'INITIALIZING',2:'FAULTY',3:'DISABLED',4:'LISTENING',5:'PRE_MASTER',6:'MASTER',7:'PASSIVE',8:'UNCALIBRATED',9:'SLAVE'}; // ARC Net_GetPTPStatus
const MODULES = {
  standard:{ name:'uNET STANDARD (uREC2500 family)', ch:32, out:16, i8s:true, price:'€195 / €150 / €120 / €89', note:'Ravenna/AES67 up to 32 ch, or USB 32×32, or USB-drive recording; I2S or I8S serial port; 5 V.' },
  compact: { name:'uNET COMPACT', ch:16, out:16, i8s:true, price:'€120 / €90 / €70 / €55', note:'Ravenna/AES67 up to 16 ch; DM1500 audio processor; 3.3 V; no USB recorder.' },
  mini:    { name:'uNET MINI', ch:4, out:2, i8s:false, price:'€95 / €70 / €55 / €45 (June 2015)', note:'2 in / 2 out, I2S only, 3.3 V, mini-PCIe style. Later used in the PREmo (RD88).' },
};
const SNAPS = {
  b6:  { name:'backup6 — Ravenna to AES 4 Channels AMS81', date:'2015-09-04', off:true, on:false, lines:1, pins:'AVB', dev:'EP4CE40F23C6', mods:'i8s_4xi2s.v · syncOneShotAli.v · zero_detector.v', product:'bench test', zero:true },
  b9:  { name:'backup9 — AES to Ravenna from 110 ins for AMS81', date:'2015-09-04', off:true, on:true, lines:1, pins:'AVB', dev:'EP4CE40F23C6', mods:'i2sx4_i8s.v · i8s_4xi2s.v · zero_detector.v', product:'bench test', zero:true },
  b25: { name:'backup25 — AMS81 off ramp, Altera I2S→AES cores, "timing meets"', date:'2015-11-03', off:true, on:false, lines:2, pins:'ARCH', dev:'EP4CE40F23C6', mods:'i8sx2_i2sx8.v · sync_one_shot.v · clkdiv_98M304_to_12M288.vhd', product:'AMS8-1AN (AMS81.bdf identical to AMS81 master V050100)' },
  b27: { name:'backup27 — MLC8 on ramp, based on 25', date:'2015-11-04', off:true, on:true, lines:2, pins:'ARCH', dev:'EP4CE40F23C6', mods:'i2sx8_i8sx2.v · i8sx2_i2sx8.v · sync_one_shot.v', product:'MLC8N (AMS81.bdf identical to MLC8N v050000)' },
  b33: { name:'backup33 — 32ME on and off ramp', date:'2015-11-11', off:true, on:true, lines:2, pins:'ARCH', dev:'EP4CE30F23C7', mods:'i2sx8_i8sx2.v · i8sx2_i2sx8.v · smux1x4_i2sx16.vhd · Xilinx aes_rx/aes_tx/asrc_gold', product:'32ME-N (inferred)' },
};
const SOURCES = {
  horus:{ name:'Merging Horus (firmware 3.0.5)', gm:true, note:'AD/DA converter from #software #Merging; also the PTP grandmaster' },
  vsc:  { name:'RAVENNA Virtual Sound Card (Windows PC)', gm:false, note:'ALC NetworX WDM driver (alc/ravenna); PTP slave only '+inf },
  none: { name:'nothing streaming', gm:false, note:'' },
};

/* ---------- device / bench state ---------- */
const D = {};
function reset(factory){
  Object.assign(D, {
    power:true, module:'standard', bus:'USB',            // "As shipped from Archwave, the uREC2500 is configured for USB audio streaming"
    link:false, src:'horus', syncLog:-3, load:0, qos:false,
    spp:48, enc:'L24', nch:8, playout:C.PLAYOUT, fs:48000, align:0,
    cfg:{ wbs:false, ModelName:'uNet2500', ManufacturerName:'Archwave', Priority1:200, Priority2:200, AvPortFormat:8, SyncMode:3, AudioModeName:'No Digital I/O', ActiveStreams:'1,2,6,7', AVOutChannels:16 },
    snap:'b25', dir:'off', netInput:true, sel:0, ptpT0:performance.now(), flags:{}, console:[], fpgaOK:true,
  });
  if (!factory){ // the finished bench (AMS8-1N sheet loaded, Horus locked) for the Simulator tab
    D.bus='ETHERNET'; D.link=true; D.ptpT0=performance.now()-60000;
    Object.assign(D.cfg, { wbs:true, ModelName:'AMS8-1AN', ManufacturerName:'Ward-Beck Systems', Priority1:255, Priority2:255, AudioModeName:'AES67 OFF-Ramp', ActiveStreams:'0', AVOutChannels:8 });
  }
  LOG.items = []; VER++;
}
const LOG = { items: [] };
function act(name, fn){
  const trace = []; const tr = s => trace.push(s);
  VER++;
  try { fn(tr); } catch(e){ tr('error: '+e.message); console.error(e); }
  VER++;
  LOG.items.unshift({ t: SIM.t, name, trace });
  if (LOG.items.length > 60) LOG.items.length = 60;
  SIM.refresh();
}
function traceHTML(){
  const e = LOG.items[0];
  return e ? `<div><b>${e.name}</b> <span class="muted">at ${SIM.fmtT(e.t)}</span></div>` + e.trace.map(s=>`<div>→ ${s}</div>`).join('')
           : '<div class="muted">Use the panel and the bench controls. Each action lists the code path, parameter or document it follows.</div>';
}

/* ---------- derived: network / PTP ---------- */
const fs = () => D.fs;
const bps = () => D.enc==='L16' ? 2 : 3;
function sender(){ return D.dir==='on' ? 'unet' : D.src; }
function spp(){ // the uNet builds packets in multiples of 8 samples at 1x (16 at 2x) — user manual, Packetization
  if (sender()==='unet'){ const m = D.fs>48000?16:8; return Math.max(m, Math.ceil(D.spp/m)*m); }
  return D.spp;
}
function payload(){ return spp()*D.nch*bps(); }
function wireT(){ return (payload()+C.HDR+C.WIRE_X)*8/C.LINK; }
function jitter(){ // queueing behind best-effort frames on the 100 Mb/s port (model inferred)
  const mtu = 1538*8/C.LINK, r = D.load/100;
  return 2e-6 + (D.qos ? r*mtu : r/(1-Math.min(r,0.95))*mtu*3);
}
function ptpInt(){ return Math.pow(2, gmIsUnet()? 0 : D.syncLog); }   // uNet LogSyncInterval 0 = 1 s (parameter sheet)
function gmIsUnet(){ return !SOURCES[D.src].gm; }
function annInt(){ return 2; }   // LogAnnounceInterval 1 → 2 s (parameter sheet; same value assumed for the Horus, inferred)
function ptpState(){
  if (!D.power || D.bus!=='ETHERNET') return {code:3, why:'module not in ETHERNET bus mode'};
  if (!D.link) return {code:2, why:'no Ethernet link'};
  const e = (performance.now()-D.ptpT0)/1000;
  if (e < 0.5) return {code:1, why:'PTP stack starting'};
  if (!gmIsUnet()){
    const tA = 0.5 + annInt()*0.6;              // first Announce from the grandmaster
    if (e < tA) return {code:4, why:'waiting for an Announce'};
    if (e < tA + 3*ptpInt()) return {code:8, why:'servo converging on Sync/Follow_Up'};
    return {code:9, why:'locked to the grandmaster (Horus)'};
  }
  const tO = 0.5 + 3*annInt();                  // announceReceiptTimeout = 3 intervals (IEEE 1588 default, inferred)
  if (e < tO) return {code:4, why:'no better clock heard yet'};
  if (e < tO + annInt()) return {code:5, why:'qualification time'};
  return {code:6, why:'no other grandmaster: BMCA picks the uNet even at Priority1 '+D.cfg.Priority1};
}
const ptpOK = () => { const s = ptpState().code; return s===9 || s===6; };
function budget(){
  const F = fs();
  const tIn = C.IN_DLY/F, tPack = spp()/F, tNet = C.SWITCH + wireT(), tJ = jitter(), tOut = C.OUT_DLY/F;
  const need = tIn+tPack+tNet+tOut, play = D.playout/F;
  let late = 0; const N = 400;
  for (let k=0;k<N;k++) if (need + hrand(k+7)*tJ > play) late++;
  return { tIn, tPack, tNet, tJ, tOut, need, play, late: late/N };
}
/* full audio verdict, with every reason */
let VER = 0, AC = null, ACK = '';
function audio(){
  const key = VER+'|'+ptpState().code;
  if (AC && key===ACK) return AC;
  ACK = key; AC = audioCalc(); return AC;
}
function audioCalc(){
  const why = [];
  if (!D.power) why.push('unit off');
  if (D.bus!=='ETHERNET') why.push('uNet in USB bus mode (long-press button A)');
  if (!D.link) why.push('RJ45 unplugged');
  if (D.dir==='off' && D.src==='none') why.push('no stream source on the network');
  if (D.link && D.bus==='ETHERNET' && !ptpOK()) why.push('PTP not locked ('+PTP_NAMES[ptpState().code]+')');
  if (payload() > C.MAXPAY) why.push(`packet payload ${payload()} B > ${C.MAXPAY} B: stream disabled by the resource control`);
  if (D.cfg.AvPortFormat!==8 || !MODULES[D.module].i8s) why.push(MODULES[D.module].i8s? 'AvPortFormat 2 (I2S) but the FPGA expects I8S' : 'uNET MINI has an I2S port only; the FPGA expects two I8S lines');
  const snap = SNAPS[D.snap];
  if (D.dir==='off' && !snap.off) why.push(`${D.snap} has no off-ramp`);
  if (D.dir==='on' && !snap.on) why.push(`${D.snap} has no on-ramp`);
  const b = budget();
  const garbled = D.fs!==48000;   // "This module only handles 48KHz audio for now" (i8sx2_i2sx8.v, backup33)
  const slip = D.align!==0;
  const ok = !why.length;
  return { ok, why, late: ok? b.late : 0, garbled: ok && garbled, slip: ok && slip, b };
}

/* ---------- sample / bit model (runs the archived Verilog logic) ---------- */
const FULL = 8388607;
function srcSample(ch, f){ // 24-bit signed sample the uNet puts in slot ch of I8S frame f
  const a = audio(); if (!a.ok) return 0;
  if (a.garbled) return ((hrand(f*31+ch)*2-1)*FULL)|0;
  const c = ch % 8, A = Math.pow(10, LEVELS[c]/20)*FULL;
  if (a.late && hrand(Math.floor(f/spp())*13+5) < a.late) return 0;   // late packet → that packet's samples dropped
  return Math.round(A*Math.sin(2*Math.PI*FREQS[c]*f/fs() + c*0.7));
}
function bitIn(line, k){ // value on ARCH_SDINn during MCLK tick k (uNet SDOUTn, I8S, MSB first)
  const d = D.align===0 ? 1 : 0;              // AvPortAlign 0 = "standard I2S, one SCK delayed"; 1 = left-justified
  const kk = k - d, f = Math.floor(kk/256), b = kk - f*256, slot = b>>5, i = b&31;
  if (i >= 24) return 0;
  const v = srcSample(line*8+slot, f) & 0xFFFFFF;
  return (v >> (23-i)) & 1;
}
const fsyncSeen = k => (((k - C.FSYNC_SEEN) % 256) + 256) % 256 < 128 ? 1 : 0;   // LRCK polarity 0: CH1 high
const capCache = new Map();
/* i8sx2_i2sx8: input_i8s_reg shifts on posedge input_mclk; sync_one_shot (negedge) loads input_i8s_buffer.
   Returns the 256-bit buffer captured after frame f, as eight 32-bit slot words (CH1 first). */
function capture(line, f){
  const key = [line,f,D.align,D.fs,D.link,D.bus,D.src,D.spp,D.playout,D.load,D.qos,D.module,D.cfg.AvPortFormat,D.dir,D.snap,ptpState().code].join(',');
  if (capCache.has(key)) return capCache.get(key);
  const reg = new Uint8Array(256); let buf = null, sr = 0, d1 = 0, d2 = 0;
  for (let k = 256*f - 4; k < 256*(f+1) + 12 && !buf; k++){
    // posedge at the start of tick k: always @(posedge input_mclk)
    const pulse = d1 && !d2;                                  // assign pulse_out = sr_del1 && !sr_del2
    if (pulse && k > 256*f + 100) buf = reg.slice();          // if (input_fsync_oneshot) input_i8s_buffer <= input_i8s_reg
    reg.copyWithin(1, 0, 255); reg[0] = bitIn(line, k-1);     // input_i8s_reg[255:1] <= [254:0]; [0] <= input_data
    // negedge in the middle of tick k: always @(negedge clk_in) sr_del2 <= sr_del1; sr_del1 <= sr_out
    const p = fsyncSeen(k); if (p) sr = 1;
    d2 = d1; d1 = sr;
    if (!p && d2) sr = 0;                                     // always @* if (pulse_in) sr_out<=1; else if (sr_del2) sr_out<=0
  }
  const words = [];
  for (let j=0;j<8;j++){ let w = 0; for (let i=0;i<32;i++) w = (w*2) + buf[255-32*j-i]; words.push(w>>>0); }
  if (capCache.size > 400) capCache.clear();
  capCache.set(key, words);
  return words;
}
const s24 = w => { let v = (w >>> 8) & 0xFFFFFF; return v & 0x800000 ? v - 0x1000000 : v; };
const dbfs = v => v===0 ? -Infinity : 20*Math.log10(Math.abs(v)/FULL);
function i2sBit(k2, line, t){ // ARCH_I2S_DATA(line+1) during SCLK tick k2 (output_i2sN_reg[63], negedge output_sclk)
  const k = k2*4 - C.PHI; const f = Math.floor(k/256); const i = Math.floor((k - f*256)/4) - 1;
  if (i < 0) return 0;
  const w = capture(Math.floor(line/4), f-1);              // I2S frame f carries the I8S frame captured before it
  const slot = (line%4)*2 + (i>=32?1:0), b = i%32;
  return (w[slot] >>> (31-b)) & 1;
}
function chLevel(ch){ // dBFS the monitor's meters see for network channel ch
  const a = audio(); if (!a.ok) return -Infinity;
  if (a.garbled) return -1;
  let L = LEVELS[ch%8]; if (a.slip) L += 6.02;
  return L;
}

/* ---------- user actions ---------- */
const PATH = 'ENGINEERING - 2016 RD FILES/RD85-Archwave Ravenna Monitor/';
const A = {
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power=!D.power; D.ptpT0=performance.now(); tr(D.power? 'AMS8E-1 boots; FPGA loads from EPCS1; the uNet boots its own firmware (uNet_2500_Release_No_CnE_ 3000.bcd)':'Unit off: the uNet, FPGA and ATmega128 stop'); if (D.power) tr('v200w.c version screen shows revision '+rev()+' (common.h REVISION1..8)'); }); },
  module(v){ act('Evaluate the '+MODULES[v].name, tr=>{ D.module=v; const M=MODULES[v]; tr('Archwave Price List May 2015 v2: '+M.price+' (1+ / 10+ / 100+ / 1k+)'); tr(M.note); if (!M.i8s) tr('No I8S: the FPGA path (two 256-bit I8S lines) cannot be fed from this module'); if (v==='standard') tr('AES67 Ravenna Evaluation Kit: 2 base boards + 2 uNET STANDARD, €1,495'); }); },
  bus(){ act('Long-press button A on the uNet base board', tr=>{ D.bus = D.bus==='USB'?'ETHERNET':'USB'; D.ptpT0=performance.now();
    tr('User manual, Mode Selection: "press and hold button A until all 4 LEDs are off and then release it" → toggles the bus mode and restarts');
    tr('/cne/AppSettings/Global/StreamingInterface = "'+D.bus+'"'); tr(D.bus==='ETHERNET'? 'All LEDs on (AES67/Ravenna mode); hostname unet2500-HH-HH-HH via DHCP/Bonjour':'USB streaming / recorder mode: no network audio'); }); },
  link(){ act(D.link?'Unplug the RJ45':'Plug the RJ45 into the switch', tr=>{ D.link=!D.link; D.ptpT0=performance.now();
    if (D.link){ tr('100BASE-T link up on the Archwave rear plate (Detail B cut-out, UNET STD.-REAR ISS 1)'); tr('PTP port INITIALIZING → LISTENING; Bonjour/RTSP discovery of RAVENNA sessions begins'); }
    else { D.flags.pulled = true; tr('Link lost: PTP port → FAULTY (Net_GetPTPStatus state 2); RTP stops'); tr('The uNet now plays out silence: the FPGA keeps converting zeros, the AES outputs stay locked at 48 kHz');
      if (SNAPS[D.snap].zero) tr('backup6/9 zero_detector.v: 255 zero bits on SCLK → line_is_active = 0 (it cannot tell silence from a lost stream)');
      tr('Front panel still shows " AES67  " — the ATmega128 has no status line from the uNet (SPI/UART/GPIO not in the harness)'); } }); },
  src(v){ act('Stream source: '+SOURCES[v].name, tr=>{ D.src=v; D.ptpT0=performance.now(); tr(SOURCES[v].note||'No stream'); if (v==='vsc') tr('Nobody else can be grandmaster: the uNet takes the role despite Priority1 '+D.cfg.Priority1+' (BMCA, '+'inferred)'); }); },
  syncLog(v){ act('Grandmaster Sync interval 2^'+v+' s', tr=>{ D.syncLog=+v; tr(`logSyncInterval ${v} → ${ptpInt()} s between Sync messages`); tr('The uNet sheet sets its own LogSyncInterval 0 (1 s); it only matters when the uNet is master'); }); },
  spp(v){ act('Packet time: '+v+' samples', tr=>{ D.spp=+v; const s=spp();
    if (sender()==='unet' && s!==D.spp){ D.flags.snap8=true; tr(`The uNet is the sender: SamplesPerPacket1xFS must be a multiple of 8 → ${s} samples (${(s/fs()*1e6).toFixed(0)} µs), not the 6-sample 125 µs packets`); }
    else tr(`${s} samples = ${(s/fs()*1e3).toFixed(3)} ms per packet → ${(fs()/s).toLocaleString()} packets/s; "a receiver must accept the packet time given by the transmitter"`);
    tr(`Payload ${payload()} B (${D.nch} ch × ${bps()} B × ${s}); wire time ${SIM.fmtDur(wireT())} at 100 Mb/s`); }); },
  enc(v){ act('Encoding '+v, tr=>{ D.enc=v; tr('/cne/AppSettings/RavennaConfiguration/User_SampleSize affects outgoing streams; receivers take the provider\'s encoding (L16, L24, L32, AM824)'); }); },
  nch(v){ act('Stream channels: '+v, tr=>{ D.nch=+v; tr(`Payload ${payload()} B ${payload()>C.MAXPAY?'> '+C.MAXPAY+' B: will not fit one Ethernet frame':'fits one frame'}`); }); },
  playout(v){ act('Receiver delay '+v+' samples', tr=>{ D.playout=clamp(+v,1,24000); const b=budget();
    tr(`User_PlayoutDelay = ${D.playout} (${(b.play*1e3).toFixed(2)} ms). Needed: InputDelay ${C.IN_DLY} + packet ${spp()} + network ${(b.tNet*1e6).toFixed(0)} µs + OutputDelay ${C.OUT_DLY} = ${(b.need*1e3).toFixed(3)} ms`);
    if (b.late>0){ D.flags.late=true; tr(`${(b.late*100).toFixed(0)} % of packets arrive after their play-out time: "the destination device will discard expired samples"`); } else tr('Every packet is in the buffer before its play-out time'); }); },
  load(v){ act('Background traffic '+v+' %', tr=>{ D.load=+v; if (D.load>=60 && !D.qos) D.flags.stress=true; tr(`Jitter now ≈ ${(jitter()*1e6).toFixed(0)} µs (queueing behind 1538-byte frames, ${'model inferred'})`); }); },
  qos(){ act(D.qos?'Clear the switch QoS':'Load MTRAVENNA_DP2808 startup-config', tr=>{ D.qos=!D.qos; tr(D.qos? 'Merging network guide: IGMP snooping on, DSCP to Queue mapping puts PTP and RTP ahead of best-effort traffic':'Switch back to unmanaged defaults'); tr(`Jitter ≈ ${(jitter()*1e6).toFixed(0)} µs`); }); },
  fs(v){ act('Network sample rate '+(v/1000)+' kHz', tr=>{ D.fs=+v; tr('/cne/AppSettings/Global/SampleRate = '+(v===96000?4:2)+'; streams only connect between devices at the same rate');
    if (D.fs!==48000){ D.flags.try96=true; tr('I8S now runs 256 bits per 96 kHz frame at 24.576 MHz; altpll0 is built for 12.288 MHz in and the I2S side stays at 48 kHz'); tr('i8sx2_i2sx8.v (backup33): "This module only handles 48KHz audio for now" — MLC8N test report: "only compatible with 48KHz signals"'); } }); },
  align(v){ act('AvPortAlign = '+v, tr=>{ D.align=+v; tr(`cd /cne/AppSettings/Global → set AvPortAlign ${v} (${v==0?'standard I2S, one SCK delayed':'left-justified'})`);
    if (D.align){ D.flags.slip=true; tr('The 256-bit window that sync_one_shot captures is now one bit late: every slot loses its sign bit and doubles (+6 dB); peaks above −6 dBFS wrap round'); } else tr('Window and frame line up again (the value shipped in the AMS8-1N sheet)'); }); },
  applyWbs(){ act('Serial console: apply the AMS8 parameter sheet', tr=>{
    const cmds = ['cd /cne/AppSettings/Global','set AvPortFormat 8','set AvPortAlign 0','set AvPortLRCKPolarity 0','set SyncMode 3','set ModelName AMS8-1AN','set ManufacturerName "Ward-Beck Systems"',
      'cd /cne/AppSettings/RavennaConfiguration/PTP','set Priority1 255','set Priority2 255','cd ../AudioModes/Mode0','set AudioModeName "AES67 OFF-Ramp"','set ActiveStreams 0','set ActiveOutputGroups 1','set AVInChannels 0','set AVOutChannels 8','set ValidSamplingRates 2'];
    D.console = cmds.slice(); Object.assign(D.cfg, { wbs:true, ModelName:'AMS8-1AN', ManufacturerName:'Ward-Beck Systems', Priority1:255, Priority2:255, AvPortFormat:8, SyncMode:3, AudioModeName:'AES67 OFF-Ramp', ActiveStreams:'0', AVOutChannels:8 }); D.align=0;
    tr('RS232 debug console, 115200 8N1, prompt sds://> (user manual p. 23)'); cmds.forEach(c=>tr('<span class="mono">'+c+'</span>'));
    tr('Output group 1 → outputs named CH1…CH8; Priority 255 so the monitor should not become grandmaster'); }); },
  i2sMode(){ act('set AvPortFormat '+(D.cfg.AvPortFormat===8?2:8), tr=>{ D.cfg.AvPortFormat = D.cfg.AvPortFormat===8?2:8; tr('/cne/AppSettings/Global/AvPortFormat: 8 = I8S, 2 = I2S'); }); },
  snap(v){ act('Load Quartus snapshot '+v, tr=>{ D.snap=v; const s=SNAPS[v]; D.dir = s.off ? (D.dir==='on'&&s.on?'on':'off') : 'on';
    tr(`${s.name} (${s.date}) · ${s.dev} · added: ${s.mods}`);
    tr(s.pins==='AVB'? 'AMS81.qsf: T1 = AVB_MCLK_IN, T2 = AVB_SCLK_IN, H7 = AVB_I2S1_IN, J2 = AVB_I2S2_IN — the RD79 XMOS AVB pin names on the same header':'AMS81.qsf: T1 ARCH_FSYNC_PIN, T2 ARCH_MCLK_PIN, H7 ARCH_SDIN0_PIN, J2 ARCH_SDIN1_PIN, F1 ARCH_SDOUT0_PIN, E1 ARCH_SDOUT1_PIN');
    tr('Became: '+s.product); }); },
  dir(v){ act(v==='on'?'On ramp: AES inputs → network':'Off ramp: network → monitor', tr=>{ D.dir=v; const s=SNAPS[D.snap];
    if ((v==='on'&&!s.on)||(v==='off'&&!s.off)) tr(`${D.snap} has no ${v}-ramp module — pick another snapshot`);
    tr(v==='on'? 'i2sx8_i8sx2: 8 I2S lines @ 3.072 MHz → 2 I8S lines @ 12.288 MHz on ARCH_SDOUT0/1 → uNet SDIN0/1 → RTP sender (the uNet decides the packet time)':'uNet SDOUT0/1 → ARCH_SDIN0/1 → i8sx2_i2sx8 → 8 I2S → i2s_2_aes3 → AES outputs, SHARC meters, speakers');
    if (v==='on' && D.spp%8){ D.flags.snap8=true; tr(`Packet time ${D.spp} samples is not a multiple of 8: the uNet sends ${spp()}`); } }); },
  sel(k){ act('Press INPUTS '+['1/2','3/4','5/6','7/8'][k], tr=>{ D.sel=k; tr('AMS8-5 front panel (ATmega128, v200w.c): input pair '+(k+1)+' to the speakers and headphones'); tr(D.netInput? `Network channels CH${2*k+1}/CH${2*k+2} (uNet Output${2*k+1}/${2*k+2} → I2S line ${k+1})`:'AES input pair '+(k+1)); }); },
  netIn(){ act('SELECT: source '+(D.netInput?'AES':'AES67'), tr=>{ D.netInput=!D.netInput;
    tr('v200w.c: the network input reuses the ANALOG source slot — SOURCE_CHANGE(analog_input_source), gated by analog_enabled (input_setup ANALOG_DISPLAY_SCREEN)');
    tr(D.netInput? 'case ANALOG: //Avb-Add → line2 = " AES67  " (chA chE chS NO6 NO7)':'AES source: line2 shows the AES pair'); }); },
  skip(){ act('Wait for PTP (skip ahead)', tr=>{ D.ptpT0 -= 30000; tr('Fast-forwards the PTP servo; state now '+PTP_NAMES[ptpState().code]); }); },
};
function rev(){ return '06AV0100'; }   // common.h V040100: 0 6 A V 0 1 0 0

/* ---------- front panel (AMS8-1 silk, from ams81.js assets) ---------- */
const GEO = { meterX:[459,494,528.6,563.3,612.7,647.6,682,716.6], segTop:14.7, segPitch:5.93, btnX:[801.5,846,890.5,935], btnY:[51.25,110.75],
  disp:{cx:1109.8, cy:51.8, w:183.2, h:49.5}, sel:{x:1040.5,y:111.2}, vol:{x:1179.1,y:111.2}, jack:{x:1281.5,y:81.5,r:19.3}, lensX:438.35, lensW:297 };
const SEGCOL = i => i<4 ? '#ff3b2f' : i<12 ? '#ffc41f' : '#4dff4a';
function displayText(){
  if (!D.power) return '        ';
  return D.netInput ? ' AES67  ' : 'AES '+['1/2','3/4','5/6','7/8'][D.sel]+' ';
}
function meterSeg(ch, t){
  if (!D.power) return 0;
  let L = D.dir==='on' ? LEVELS[ch] : (D.netInput ? chLevel(ch) : LEVELS[(ch+3)%8]);
  const a = audio();
  if (D.dir==='off' && D.netInput && a.ok && a.late && hrand(Math.floor(t*fs()/spp())*13+5) < a.late) L = -Infinity;
  if (D.dir==='off' && D.netInput && a.garbled) L = -3 - 6*hrand(Math.floor(t*40)+ch);
  if (!isFinite(L)) return 0;
  return clamp(Math.round((L+60)/60*22), 0, 22);   // 60 dB over 22 LEDs (scale inferred)
}
function frontSVG(t){
  const d = GEO.disp, pitch = 3.0, x0 = d.cx - (8*6.2*pitch - pitch*1.2)/2, y0 = d.cy - 3*pitch;
  let s = `<svg viewBox="0 0 1707 163" role="img" aria-label="AMS8-1 front panel (real AMS81 silkscreen) with the AES67 input" style="width:100%;border-radius:6px;display:block">
   <defs><filter id="r85glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <rect width="1707" height="163" rx="6" fill="#202326"/><rect x="${GEO.lensX}" y="0" width="${GEO.lensW}" height="163" fill="#0c0b0b"/>
   <image href="${ASSET}ams81-front-cut.png" width="1707" height="163" opacity=".55"/>`;
  for (let ch=0; ch<8; ch++){ const n = meterSeg(ch,t), x = GEO.meterX[ch];
    for (let i=0;i<22;i++){ const y = GEO.segTop + i*GEO.segPitch - 2.1, lit = (22-i) <= n; const col = lit ? SEGCOL(i) : '#1d1a17';
      s += `<rect x="${x-6.2}" y="${y}" width="5.4" height="4.2" rx=".8" fill="${col}"/><rect x="${x+0.8}" y="${y}" width="5.4" height="4.2" rx=".8" fill="${col}"/>`; } }
  s += `<image href="${ASSET}ams81-lens-white.png" x="${GEO.lensX}" y="0" width="${GEO.lensW}" height="163"/>
   <image href="${ASSET}ams81-front-green.png" width="1707" height="163"/><image href="${ASSET}ams81-front-white.png" width="1707" height="163"/>`;
  for (let k=0;k<4;k++){ const x=GEO.btnX[k], y=GEO.btnY[0], lit = D.power && D.sel===k;
    s += `<g class="r85btn" data-k="${k}" style="cursor:pointer"><title>INPUTS ${['1/2','3/4','5/6','7/8'][k]}</title><rect x="${x-16.5}" y="${y-16.5}" width="33" height="33" rx="2.5" fill="#0c0d0e"/><rect x="${x-14}" y="${y-14}" width="28" height="28" rx="2" fill="#3a3d41" stroke="#55595e"/><rect x="${x-6}" y="${y-3.5}" width="12" height="7" rx="1" fill="${lit?'#ff3a4c':'#a9adb2'}" ${lit?'filter="url(#r85glow)"':''}/></g>`;
    const y2=GEO.btnY[1]; s += `<rect x="${x-14}" y="${y2-14}" width="28" height="28" rx="2" fill="#5a5320" stroke="#a28f0a" opacity=".6"/>`; }
  s += `<rect x="${d.cx-d.w/2}" y="${d.cy-d.h/2}" width="${d.w}" height="${d.h}" rx="3" fill="#050605" stroke="#2a2d2f"/>
   <g filter="url(#r85glow)">${SIM.dotMatrix(displayText(), x0, y0, pitch, D.power?'var(--vfd)':'#222', 'rgba(140,200,90,.08)')}</g>
   <g class="r85sel" style="cursor:pointer"><title>SELECT: click to switch the source between AES and AES67 (input setup, simplified)</title><circle cx="${GEO.sel.x}" cy="${GEO.sel.y}" r="30" fill="transparent"/><circle cx="${GEO.sel.x}" cy="${GEO.sel.y}" r="20.5" fill="#101112" stroke="#2c2f31" stroke-width="1.5"/><circle cx="${GEO.sel.x}" cy="${GEO.sel.y}" r="16" fill="#1b1c1e"/></g>
   <circle cx="${GEO.vol.x}" cy="${GEO.vol.y}" r="20.5" fill="#101112" stroke="#2c2f31" stroke-width="1.5"/><circle cx="${GEO.vol.x}" cy="${GEO.vol.y}" r="16" fill="#1b1c1e"/>
   <g class="r85pwr" style="cursor:pointer"><title>Headphone jack — click to power the unit ${D.power?'off':'on'} (simulation shortcut)</title><circle cx="${GEO.jack.x}" cy="${GEO.jack.y}" r="${GEO.jack.r-2}" fill="#7d8084" stroke="#3a3c3f" stroke-width="2"/><circle cx="${GEO.jack.x}" cy="${GEO.jack.y}" r="7" fill="#0b0b0b"/></g></svg>`;
  return s;
}
/* Archwave rear plate, to scale from 32ME-N/UNET STD.-REAR ISS 1 (ARCHWAVE).pdf: 4.262 × .850 in, .051 galv., painted black.
   Holes: Ø.140 csk at (.186,.265) (4.076,.265) (1.121,.425) (3.141,.425). Detail A .490 × .420 centred (1.806,.475);
   Detail B .640 × .530 centred (2.561,.430). Which connector sits in A is inferred (USB). */
function plateSVG(){
  const k = 200, W = 4.262*k, H = 0.85*k, a = audio(), st = ptpState();
  const hole = (x,y)=>`<circle cx="${x*k}" cy="${y*k}" r="${0.12*k}" fill="#2b2d30"/><circle cx="${x*k}" cy="${y*k}" r="${0.07*k}" fill="#0a0a0a"/>`;
  const A_ = {x:1.806-0.245, y:0.475-0.21, w:0.49, h:0.42}, B_ = {x:2.561-0.32, y:0.43-0.265, w:0.64, h:0.53};
  const ledG = D.link && D.power && D.bus==='ETHERNET', ledY = ledG && a.ok;
  return `<svg viewBox="-10 -10 ${W+20} ${H+60}" style="width:100%;max-width:760px;display:block" role="img" aria-label="Archwave rear plate drawn to scale">
   <rect width="${W}" height="${H}" rx="3" fill="#141516" stroke="#3a3c3f"/>
   ${hole(.186,.265)}${hole(4.076,.265)}${hole(1.121,.425)}${hole(3.141,.425)}
   <g class="r85usb" style="cursor:pointer"><title>Detail A (.490 × .420 in) — USB on the uNet STANDARD (inferred). Click for what it does here.</title>
     <rect x="${A_.x*k}" y="${A_.y*k}" width="${A_.w*k}" height="${A_.h*k}" fill="#050505" stroke="#666"/><rect x="${A_.x*k+16}" y="${A_.y*k+18}" width="${A_.w*k-32}" height="${A_.h*k-36}" fill="#c8c8c8"/></g>
   <g class="r85rj" style="cursor:pointer"><title>Detail B (.640 × .530 in) — RJ45 Ethernet. Click to ${D.link?'unplug':'plug in'} the cable.</title>
     <rect x="${B_.x*k}" y="${B_.y*k}" width="${B_.w*k}" height="${B_.h*k}" fill="#050505" stroke="#666"/>
     <rect x="${B_.x*k+14}" y="${B_.y*k+14}" width="${B_.w*k-28}" height="${B_.h*k-40}" fill="#222"/>
     <rect x="${B_.x*k+8}" y="${B_.y*k+B_.h*k-20}" width="18" height="10" fill="${ledG?'#43ff5a':'#203020'}"/><rect x="${B_.x*k+B_.w*k-26}" y="${B_.y*k+B_.h*k-20}" width="18" height="10" fill="${ledY?'#ffc21f':'#302a10'}"/>
     ${D.link?`<rect x="${B_.x*k+30}" y="${B_.y*k-50}" width="${B_.w*k-60}" height="${B_.h*k-12}" fill="#2a6fb0" opacity=".85"/><rect x="${B_.x*k+50}" y="${B_.y*k-60}" width="${B_.w*k-100}" height="16" fill="#2a6fb0"/>`:''}</g>
   <text x="6" y="${H+22}" font-size="15" fill="var(--ink2)">ARCHWAVE REAR PLATE · UNET STD.-REAR ISS 1 (D.A., 20 08 15) · 4.262 × .850 in, scale 200 px/in</text>
   <text x="6" y="${H+42}" font-size="15" fill="var(--ink2)">Link ${D.link?'up':'down'} · PTP ${PTP_NAMES[st.code]} · stream ${a.ok?'playing':'—'}  (link-LED colours ${'inferred'})</text></svg>`;
}
/* uNet X102 harness (pinout.xlsx Sheet2 = the eight wires in 32ME-N/unet.jpg) */
const X102 = { 1:'5V',2:'5V',3:'5V',4:'5V',5:'GND',6:'GND',7:'SPI NCS0',8:'SPI SCK',9:'SPI RXD',10:'SPI TXD',11:'RXD0',12:'TXD0',13:'RXD1',14:'TXD1',15:'GPIO0',16:'GPIO1',17:'GPIO2',18:'GPIO3',19:'GPIO4',20:'GPIO5',21:'GPIO6',22:'GPIO7',23:'SPI NCS1',24:'SYNC',25:'DIGITAL IN',26:'DIGITAL OUT',27:'SDIN0',28:'SDIN1',29:'SDIN2',30:'SDIN3',31:'SDOUT0',32:'SDOUT1',33:'SDOUT2',34:'SDOUT3',35:'GND',36:'MCLK',37:'GND',38:'SCLK',39:'GND',40:'LRCLK' };
const WIRES = {
  2:{c:'#d22',awg:22,h4:'—',fpga:'—',net:'+5 V (one wire is enough: 5 V pins tied inside the uNet)'},
  6:{c:'#eee',awg:22,h4:'—',fpga:'—',net:'GND'},
  40:{c:'#1c49c9',awg:26,h4:'H4_29 FSYNC_IN_I64',fpga:'T1 (CLK3)',net:'ARCH_FSYNC_PIN — 48 kHz frame sync (backup6/9: AVB_MCLK_IN)'},
  38:{c:'#18a03a',awg:26,h4:'H4_33 MCLK_IN_I64',fpga:'T2 (CLK2)',net:'ARCH_MCLK_PIN — the uNet "SCLK" is 12.288 MHz in I8S mode (backup6/9: AVB_SCLK_IN)'},
  31:{c:'#111',awg:26,h4:'H4_26 DATA5_IN_I64',fpga:'H7',net:'ARCH_SDIN0_PIN — uNet SDOUT0, channels 1–8 into the FPGA'},
  32:{c:'#7a4a22',awg:26,h4:'H4_24 DATA4_IN_I64',fpga:'J2',net:'ARCH_SDIN1_PIN — uNet SDOUT1, channels 9–16'},
  27:{c:'#f07a12',awg:26,h4:'H4_14 DATA7_OUT_I64 via R192 49R9',fpga:'F1',net:'ARCH_SDOUT0_PIN — FPGA → uNet SDIN0 (on ramp)'},
  28:{c:'#f2d21a',awg:26,h4:'H4_12 DATA6_OUT_I64 via R193 49R9',fpga:'E1',net:'ARCH_SDOUT1_PIN — FPGA → uNet SDIN1'},
};
let pinSel = 31;
function headerSVG(){
  let s = `<svg viewBox="0 0 640 170" style="width:100%;display:block" role="img" aria-label="uNet X102 header and harness">
   <rect x="0" y="0" width="640" height="170" rx="8" fill="#123a6b"/><text x="10" y="18" font-size="12" fill="#cfe0ff">uNet STANDARD · X102 (2 × 20) · wires per pinout.xlsx Sheet2 — click a pin</text>`;
  for (let p=1;p<=40;p++){ const col = Math.floor((p-1)/2), row = (p-1)%2, x = 20+col*30, y = 60+row*30, w = WIRES[p];
    s += `<g class="r85pin" data-p="${p}" style="cursor:pointer"><title>pin ${p}: ${X102[p]}</title><rect x="${x-9}" y="${y-9}" width="18" height="18" fill="${pinSel===p?'#ffd54a':'#1a1a1a'}" stroke="#666"/><circle cx="${x}" cy="${y}" r="4" fill="#c9a43a"/>
      ${w?`<line x1="${x}" y1="${y}" x2="${x}" y2="${row?y+48:y-30}" stroke="${w.c}" stroke-width="5" stroke-linecap="round"/>`:''}</g>`;
    if (p%2) s += `<text x="${x}" y="${row?118:47}" font-size="8" fill="#9fb8e0" text-anchor="middle"></text>`; }
  s += `<text x="10" y="160" font-size="11" fill="#cfe0ff">odd pins top row, even pins bottom row · SPI, UART, GPIO, MCLK, SYNC, DIGITAL I/O not wired</text></svg>`;
  return s;
}
function pinInfo(){ const w = WIRES[pinSel];
  return `<table class="kv"><tr><th>X102 pin</th><td class="mono">${pinSel} · ${X102[pinSel]}</td></tr>${w?`<tr><th>Wire</th><td>${w.awg} AWG, colour as drawn</td></tr><tr><th>AMS8E-1 H4</th><td class="mono">${w.h4}</td></tr><tr><th>FPGA pin</th><td class="mono">${w.fpga}</td></tr><tr><th>Net</th><td>${w.net}</td></tr>`:'<tr><th>Wire</th><td>not in the final harness (Sheet1 drafted GPIO0–7 and MCLK too)</td></tr>'}</table>`; }
function bindPanel(root){
  root.querySelectorAll('.r85btn').forEach(g=> g.onclick = ()=>A.sel(+g.dataset.k));
  root.querySelectorAll('.r85sel').forEach(g=> g.onclick = ()=>A.netIn());
  root.querySelectorAll('.r85pwr').forEach(g=> g.onclick = ()=>A.power());
  root.querySelectorAll('.r85rj').forEach(g=> g.onclick = ()=>A.link());
  root.querySelectorAll('.r85usb').forEach(g=> g.onclick = ()=>act('Click the USB cut-out', tr=>{ tr('USB is used only in USB bus mode (streaming to a PC or the USB-drive recorder) or for firmware updates (ArchUsbFwUpgrade.exe, Arch_uNet_2500_USB_V6_17_0)'); tr('In the monitor the module stays in ETHERNET mode; the web page also takes a .BCD firmware file'); }));
  root.querySelectorAll('.r85pin').forEach(g=> g.onclick = ()=>{ pinSel = +g.dataset.p; SIM.refresh(); });
}

/* ---------- bench controls ---------- */
function bsel(a, v, label, on){ return `<button data-a="${a}" data-v="${v}" class="${on?'on':''}">${label}</button>`; }
function controlsHTML(compact){
  const row = (t, html) => `<div style="margin:5px 0"><span class="small muted" style="display:inline-block;min-width:120px">${t}</span> ${html}</div>`;
  let s = '';
  s += row('Module', Object.keys(MODULES).map(k=>bsel('module',k,k.toUpperCase(),D.module===k)).join(' '));
  s += row('uNet base board', `<button data-a="bus">Button A (long press): ${D.bus}</button> <button data-a="link" class="${D.link?'on':''}">RJ45 ${D.link?'plugged':'unplugged'}</button> <button data-a="skip">skip PTP wait</button>`);
  s += row('Source / GM', Object.keys(SOURCES).map(k=>bsel('src',k,k==='horus'?'Horus':k==='vsc'?'Virtual Sound Card':'none',D.src===k)).join(' '));
  s += row('Console', `<button data-a="applyWbs" class="${D.cfg.wbs?'on':''}">apply AMS8 sheet</button> ${bsel('align',D.align?0:1,'AvPortAlign '+D.align,D.align!==0)} <button data-a="i2sMode">AvPortFormat ${D.cfg.AvPortFormat}</button>`);
  s += row('FPGA snapshot', Object.keys(SNAPS).map(k=>bsel('snap',k,k.replace('b','backup'),D.snap===k)).join(' '));
  s += row('Direction', bsel('dir','off','off ramp (net → AES)',D.dir==='off')+' '+bsel('dir','on','on ramp (AES → net)',D.dir==='on'));
  s += row('Packet time', [[48,'1 ms'],[16,'333 µs'],[12,'250 µs'],[8,'167 µs'],[6,'125 µs']].map(([v,l])=>bsel('spp',v,l,D.spp===v)).join(' '));
  if (!compact){
    s += row('Stream', [2,8,16].map(v=>bsel('nch',v,v+' ch',D.nch===v)).join(' ')+' '+['L16','L24'].map(v=>bsel('enc',v,v,D.enc===v)).join(' ')+' '+[48000,96000].map(v=>bsel('fs',v,v/1000+' kHz',D.fs===v)).join(' '));
    s += row('GM Sync', [[0,'1 s'],[-3,'125 ms']].map(([v,l])=>bsel('syncLog',v,l,D.syncLog===v)).join(' ')+` <span class="small muted">${inf}</span>`);
  } else s += row('Rate', [48000,96000].map(v=>bsel('fs',v,v/1000+' kHz',D.fs===v)).join(' '));
  s += row('Receiver delay', [512,96,64,48,24].map(v=>bsel('playout',v,v+' smp',D.playout===v)).join(' '));
  s += row('Switch', [0,40,80].map(v=>bsel('load',v,v+' % load',D.load===v)).join(' ')+' '+`<button data-a="qos" class="${D.qos?'on':''}">DP2808 QoS ${D.qos?'on':'off'}</button>`);
  return s;
}
function bindControls(root){ bindActs(root, { module:A.module, bus:A.bus, link:A.link, skip:A.skip, src:A.src, applyWbs:A.applyWbs, align:A.align, i2sMode:A.i2sMode, snap:A.snap, dir:A.dir, spp:A.spp, nch:A.nch, enc:A.enc, fs:A.fs, syncLog:A.syncLog, playout:A.playout, load:A.load, qos:A.qos }); }
function statusHTML(){
  const a = audio(), st = ptpState(), b = a.b;
  const off = (st.code===9) ? ((0.2 + jitter()*1e6*(D.qos?0.05:0.4))*(hrand(Math.floor(performance.now()/500))*2-1)).toFixed(2)+' µs' : '—';
  return `<table class="kv">
   <tr><th>PTP (Net_GetPTPStatus)</th><td><b>${PTP_NAMES[st.code]}</b> (${st.code}) · ${st.why} · domain 0 · offset ${off}</td></tr>
   <tr><th>Stream</th><td>${D.dir==='off'? (SOURCES[D.src].name+' → uNet Output1…'+Math.min(D.nch,MODULES[D.module].out)) : 'uNet → '+SOURCES[D.src==='none'?'horus':D.src].name} · ${spp()} smp/packet · ${(fs()/spp()).toLocaleString()} pkt/s · ${payload()} B payload · ${D.enc} @ ${fs()/1000} kHz</td></tr>
   <tr><th>Audio</th><td>${a.ok? (a.garbled?'<b style="color:var(--bad)">garbled — FPGA is 48 kHz only</b>': a.slip?'<b style="color:var(--warn)">+6 dB and wrap-round: one-bit slot slip</b>': a.late?`<b style="color:var(--warn)">${(a.late*100).toFixed(0)} % of packets late → dropouts</b>`:'<b style="color:var(--accent)">clean</b>') : '<span style="color:var(--bad)">none</span> — '+a.why.join('; ')}</td></tr>
   <tr><th>Latency budget</th><td>in ${(b.tIn*1e6).toFixed(0)} + packet ${(b.tPack*1e6).toFixed(0)} + network ${(b.tNet*1e6).toFixed(0)} + jitter ≤${(b.tJ*1e6).toFixed(0)} + out ${(b.tOut*1e6).toFixed(0)} µs = ${(b.need*1e3).toFixed(3)} ms vs receiver delay ${(b.play*1e3).toFixed(3)} ms</td></tr>
   <tr><th>FPGA</th><td>${SNAPS[D.snap].name} · ${D.dir}-ramp · AvPortAlign ${D.align}</td></tr>
   <tr><th>Front display</th><td class="mono">"${displayText()}" · revision ${rev()}</td></tr></table>`;
}
function budgetSVG(){
  const b = budget(), tot = Math.max(b.need+b.tJ, b.play)*1.08, W = 600, X = v => 10 + v/tot*(W-20);
  const segs = [['InputDelay 16',b.tIn,'#5aa9e6'],['packet '+spp(),b.tPack,'#4cc38a'],['network',b.tNet,'#e3a35a'],['jitter',b.tJ,'#b07ad8'],['OutputDelay 16',b.tOut,'#5aa9e6']];
  let x = 0, s = `<svg viewBox="0 0 ${W} 74" style="width:100%">`;
  segs.forEach(([l,v,c])=>{ s += `<rect x="${X(x)}" y="10" width="${Math.max(1,X(x+v)-X(x))}" height="22" fill="${c}"/>`; if (X(x+v)-X(x) > 46) s += `<text x="${X(x)+3}" y="25" font-size="10" fill="#fff">${l}</text>`; x += v; });
  s += `<line x1="${X(b.play)}" y1="4" x2="${X(b.play)}" y2="40" stroke="var(--bad)" stroke-width="2.5"/><text x="${Math.min(X(b.play)+4, W-150)}" y="52" font-size="11" fill="var(--bad)">receiver delay ${D.playout} smp</text>
   <text x="10" y="68" font-size="10.5" fill="var(--ink2)">After the user manual's timing example (InputDelay1xFS, packetization, ~150 µs switch, receiver buffering, OutputDelay1xFS)</text></svg>`;
  return s;
}

/* ---------- timeline lanes ---------- */
function laneText(c, X, t0, y, h, s, col){ c.fillStyle = col || css('--ink2'); c.font = '11px '+css('--sans'); c.fillText(s, X(t0)+6, y+h/2+4); }
function bitsLane(c, X, t0, t1, y, h, T, levelFn, col, label, ph){
  ph = ph||0; const px = X(t0+T)-X(t0);
  if (px < 1.6) return SIM.pulses(c, X, t0, t1, y, h, T, ph, T/2, col, label);
  const n0 = Math.floor((t0-ph)/T), n1 = Math.ceil((t1-ph)/T);
  c.strokeStyle = col; c.lineWidth = 1.5; c.beginPath(); let first = true;
  for (let n=n0;n<=n1;n++){ const v = levelFn(n), yy = y+4+(1-v)*(h-8), xa = X(ph+n*T), xb = X(ph+(n+1)*T); if (first){ c.moveTo(xa,yy); first=false; } else c.lineTo(xa,yy); c.lineTo(xb,yy); }
  c.stroke(); c.lineWidth = 1;
}
function lanes(){
  const a = audio(), F = fs(), P = spp()/F, b = a.b, net = D.link && D.bus==='ETHERNET' && D.power;
  const tick = 1/C.MCLK, L = [];
  L.push({ label:'PTP Sync/Follow_Up, Announce', h:28, draw(c,X,t0,t1,y,h){
    if (!net){ laneText(c,X,t0,y,h,'no link'); return; }
    const si = ptpInt();
    SIM.pulses(c,X,t0,t1,y,h/2,si,0.0137%si,40e-6,css('--accent2'),'Sync + Follow_Up every '+SIM.fmtDur(si));
    SIM.pulses(c,X,t0,t1,y+h/2,h/2,annInt(),0.31,40e-6,css('--warn'),'Announce every 2 s'); } });
  L.push({ label:'RTP packets sent (wire time)', h:26, draw(c,X,t0,t1,y,h){
    if (!a.ok){ laneText(c,X,t0,y,h,'no stream: '+(a.why[0]||'')); return; }
    const send0 = (spp()+C.IN_DLY)/F; const n0 = Math.max(0,Math.floor((t0-send0)/P)), n1 = Math.ceil((t1-send0)/P);
    if (X(t0+P)-X(t0) < 3){ SIM.pulses(c,X,t0,t1,y,h,P,send0,wireT(),css('--accent'),'RTP packets ('+spp()+' samples each)'); return; }
    c.font='10px '+css('--mono');
    for (let n=n0;n<=n1;n++){ const ts = n*P+send0; c.fillStyle = css('--accent'); c.fillRect(X(ts), y+4, Math.max(1,X(ts+wireT())-X(ts)), h-8);
      if (X(ts+P)-X(ts) > 70){ c.fillStyle = css('--ink'); c.fillText('seq '+((0x3A10+n)&0xFFFF)+' ts +'+(n*spp()), X(ts)+3, y+h/2+3); } } } });
  L.push({ label:'Arrival at the uNet (switch + jitter)', h:26, draw(c,X,t0,t1,y,h){
    if (!a.ok){ laneText(c,X,t0,y,h,'—'); return; }
    const send0 = (spp()+C.IN_DLY)/F, n0 = Math.max(0,Math.floor((t0-send0-0.01)/P)), n1 = Math.ceil((t1-send0)/P);
    if (X(t0+P)-X(t0) < 3){ laneText(c,X,t0,y,h,`${(1/P).toLocaleString()} packets/s, ${(a.late*100).toFixed(0)} % late`, a.late?css('--bad'):null); return; }
    for (let n=n0;n<=n1;n++){ const arr = n*P+send0+b.tNet+hrand(n+7)*b.tJ; const late = (b.need + hrand(n+7)*b.tJ) > b.play;
      c.fillStyle = late? css('--bad') : css('--accent2'); c.fillRect(X(arr-wireT()), y+4, Math.max(1,X(arr)-X(arr-wireT())), h-8); } } });
  L.push({ label:'uNet receive buffer (samples)', h:34, draw(c,X,t0,t1,y,h){
    if (!a.ok || D.dir!=='off'){ laneText(c,X,t0,y,h, D.dir==='on'?'on ramp: the Horus is the receiver':'—'); return; }
    const maxD = D.playout + spp(); c.strokeStyle = css('--accent'); c.beginPath();
    for (let i=0;i<=400;i++){ const t = t0+(t1-t0)*i/400; const played = t*F - D.playout; const arrived = Math.floor((t - b.tIn - b.tNet - b.tPack)/P)*spp()+spp();
      const dep = clamp(arrived - played, 0, maxD); const yy = y+h-3-dep/maxD*(h-6); i? c.lineTo(X(t),yy) : c.moveTo(X(t),yy); }
    c.stroke(); } });
  L.push({ label:'ARCH_FSYNC_PIN (T1) 48 kHz', h:22, draw(c,X,t0,t1,y,h){ if (X(t0+tick)-X(t0)<1.6){ SIM.pulses(c,X,t0,t1,y,h,1/F,C.FSYNC_SEEN*tick,0.5/F,css('--warn'),'FSYNC frames (CH1–4 high)'); return; } bitsLane(c,X,t0,t1,y,h,tick,k=>fsyncSeen(k),css('--warn'),'',0); } });
  L.push({ label:'ARCH_SDIN0_PIN (H7) ← uNet SDOUT0, I8S', h:30, draw(c,X,t0,t1,y,h){
    if (X(t0+tick)-X(t0) < 1.6){ SIM.pulses(c,X,t0,t1,y,h,1/F,0,(256/C.MCLK)*0.98,css('--accent2'),'I8S frames, 8 slots × 32 bits @ 12.288 Mb/s'); return; }
    bitsLane(c,X,t0,t1,y,h,tick,k=>bitIn(0,k),css('--accent2'),'',0);
    c.font='10px '+css('--mono'); c.fillStyle = css('--ink2');
    const k0 = Math.floor(t0/tick), k1 = Math.ceil(t1/tick);
    for (let k=k0;k<=k1;k++){ const kk = k-(D.align?0:1); if (((kk%32)+32)%32===0 && X(t0+32*tick)-X(t0)>40) c.fillText('CH'+((((kk>>5)%8)+8)%8+1), X(k*tick)+2, y+10); } } });
  L.push({ label:'input_fsync_oneshot → buffer load', h:20, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/F,(C.FSYNC_SEEN+0.5)*tick,tick,css('--bad'),'buffer loads (1 per frame)'); } });
  L.push({ label:'ARCH_LRCLK / I2S out 1 (ARCH_I2S_DATA1)', h:30, draw(c,X,t0,t1,y,h){
    const T2 = 1/C.SCLK;
    if (X(t0+T2)-X(t0) < 1.6){ SIM.pulses(c,X,t0,t1,y,h,1/F,C.PHI*tick,0.5/F,css('--accent'),'I2S frames (LRCLK low = left)'); return; }
    bitsLane(c,X,t0,t1,y,h/3,T2,n=>{ const k = n*4 - C.PHI; return (((k%256)+256)%256) < 128 ? 0 : 1; },css('--warn'),'',0);
    bitsLane(c,X,t0,t1,y+h/3,h*2/3,T2,n=>i2sBit(n,0),css('--accent'),'',0); } });
  L.push({ label:'AES_OUT_1 (i2s_2_aes3)', h:22, draw(c,X,t0,t1,y,h){ if (!a.ok || D.dir!=='off'){ laneText(c,X,t0,y,h,'AES out carries '+(D.dir==='off'?'silence':'local programme')); }
    SIM.pulses(c,X,t0,t1,y,h,192/F,0,2/F,css('--warn'),'AES3 blocks (Z preamble every 192 frames = 4 ms)'); } });
  return L;
}

/* ---------- views ---------- */
let lastPtp = -1;
function ptpWatch(){ SIM.on('frame', ()=>{ const s = ptpState().code; if (s !== lastPtp){ lastPtp = s; SIM.refresh(); } }); }
function viewSim(m){
  window.__rd85Active = false;
  m.innerHTML = `<div class="grid2"><div>
     ${card('AMS8-1 with the network card — front panel (real AMS81 silk; meters show what the FPGA delivers)', `<div id="fp"></div><p class="small muted">INPUTS buttons pick the pair, SELECT toggles AES / AES67 (the old Analog slot), the headphone jack is the power shortcut. Meter scale ${inf}. Full AMS8-1A front-panel behaviour: ${plink('ams81','AMS8-1A plugin')}.</p>`)}
     ${card('Rear: the Archwave plate (to scale) and the uNet harness', `<div id="rp"></div><div id="hd" style="margin-top:8px"></div><div id="pi" class="small"></div>`)}
     ${card('Timeline (zoom with the transport; deeper lanes on “One second”)', `<canvas id="tl"></canvas>`)}
   </div><div>
     ${card('Bench (ETHERNET bus, Horus, switch, console, Quartus snapshot)', `<div id="ctl"></div>`)}
     ${card('Status', `<div id="st"></div><div id="bg"></div>`)}
     ${card('What the model did', `<div id="tr" class="log"></div>`)}</div></div>`;
  const draw = ()=>{
    m.querySelector('#fp').innerHTML = frontSVG(SIM.t);
    m.querySelector('#rp').innerHTML = plateSVG();
    m.querySelector('#hd').innerHTML = headerSVG();
    m.querySelector('#pi').innerHTML = pinInfo();
    m.querySelector('#ctl').innerHTML = controlsHTML(false);
    m.querySelector('#st').innerHTML = statusHTML();
    m.querySelector('#bg').innerHTML = budgetSVG();
    m.querySelector('#tr').innerHTML = traceHTML();
    bindPanel(m); bindControls(m);
    SIM.drawLanes(m.querySelector('#tl'), lanes().slice(0,5), {labelW:190});
  };
  SIM.on('time', draw); ptpWatch();
}

/* ---------- tutorial ---------- */
const TUT = { i:0, started:false };
const LESSONS = [
  { title:'The question (2015|48)', body:`<p>The bench starts as Archwave shipped it (USB mode, cable out, factory parameters). WBS monitors already took AES, SDI, MADI and (RD79) an AVB card. In 2015 the broadcast plants were moving to <b>RAVENNA / AES67</b>. Ali and Peter bought Archwave's evaluation kit to answer three questions: which module, how it talks to the AMS8E-1 FPGA, and whether the timing holds up on a real network. Work through it the way the bench did.</p>`, check:()=>true, auto:true },
  { title:'1 · Pick a module', body:`<p>The May 2015 price list offers four modules. Click each in <b>Module</b>. The MINI is cheapest but has 2 outputs and an I2S port only; the STANDARD carries 32 channels over an I8S port. The monitor needs 8 (AMS8-1) to 16 (32ME) channels.</p><p><b>Goal:</b> choose the STANDARD.</p>`, check:()=>D.module==='standard', hint:'Module → STANDARD.' },
  { title:'2 · Ethernet mode', body:`<p>The module ships in USB mode. On the base board, long-press <b>button A</b> until the LEDs go off; it restarts in ETHERNET (RAVENNA) mode.</p><p><b>Goal:</b> ETHERNET bus mode.</p>`, check:()=>D.bus==='ETHERNET', hint:'Press “Button A (long press)”.' },
  { title:'3 · Lock to the Horus', body:`<p>Plug the RJ45 (click the plate's Detail B cut-out or the button) with the Merging Horus on the switch. Watch the PTP state in Status: INITIALIZING → LISTENING → UNCALIBRATED → SLAVE. It takes a few seconds; “skip PTP wait” fast-forwards.</p><p><b>Goal:</b> PTP SLAVE.</p>`, check:()=>ptpState().code===9, hint:'Plug the RJ45, source Horus, wait.' },
  { title:'4 · Configure from the console', body:`<p>WBS set the module through its RS232 debug console, not ARC: the harness has no SPI or UART wires. Press <b>apply AMS8 sheet</b>: I8S port, 1-SCK delay, PTP sync, ModelName AMS8-1AN, Priority 255, audio mode “AES67 OFF-Ramp” with 8 outputs.</p><p><b>Goal:</b> parameter sheet applied.</p>`, check:()=>D.cfg.wbs, hint:'Console → apply AMS8 sheet.' },
  { title:'5 · First audio: backup6', body:`<p>September 2015: backup6 converts <i>one</i> I8S line to 4 I2S pairs and on to AES. Load <b>backup6</b>, keep the off ramp, and look at the meters and the AES67 display.</p><p><b>Goal:</b> backup6 playing clean audio.</p>`, check:()=>D.snap==='b6' && audio().ok && !audio().slip, hint:'FPGA snapshot → backup6, direction off ramp.' },
  { title:'6 · Bit alignment', body:`<p>There is no bit counter in the FPGA: <span class="mono">sync_one_shot</span> grabs the last 256 bits once per FSYNC. Set <b>AvPortAlign 1</b> (left-justified) and watch the meters jump 6 dB as every slot loses its sign bit. Then put it back to 0.</p><p><b>Goal:</b> see the slip, then AvPortAlign 0 again.</p>`, check:()=>D.flags.slip && D.align===0, hint:'Console → AvPortAlign toggle, twice.' },
  { title:'7 · Find the receiver-delay floor', body:`<p>The receiver delay is the latency. Lower it from 512 samples: 96, 64, 48, 24. Below the sum of input delay, packet time, network and output delay, packets arrive after their play-out time and are discarded. Then set a value that works.</p><p><b>Goal:</b> make packets late, then get back to clean audio.</p>`, check:()=>D.flags.late && audio().ok && !audio().late, hint:'Receiver delay 24 smp, then 96 or 512 (with 1 ms packets the floor is about 1.9 ms = 92 samples).' },
  { title:'8 · 125 µs packets', body:`<p>Have the Horus send <b>125 µs</b> packets (6 samples). The uNet accepts any packet time as a receiver; 8000 packets a second now cross the switch (see the One second tab). Note the latency budget shrinks.</p><p><b>Goal:</b> 6-sample packets, audio clean.</p>`, check:()=>D.dir==='off' && D.spp===6 && audio().ok && !audio().late, hint:'Packet time → 125 µs; receiver delay 64 or more.' },
  { title:'9 · The other way: on ramp', body:`<p>For the MLC8 the monitor's AES inputs go <i>onto</i> the network. Load <b>backup27</b> and choose <b>on ramp</b>. Now the uNet sends, and it can only build packets in multiples of 8 samples: the 125 µs setting becomes 167 µs.</p><p><b>Goal:</b> on ramp with the packet time snapped.</p>`, check:()=>D.dir==='on' && D.flags.snap8, hint:'Snapshot backup27, direction on ramp (with 125 µs selected).' },
  { title:'10 · A busy network', body:`<p>Back to the off ramp with <b>333 µs</b> packets and a tight <b>96-sample</b> (2 ms) receiver delay. Put <b>80 % load</b> on the switch: without QoS the queueing jitter makes packets late. Load Merging's <b>DP2808 QoS</b> config and the stream recovers.</p><p><b>Goal:</b> 80 % load, QoS on, clean audio.</p>`, check:()=>D.flags.stress && D.qos && D.load>=80 && audio().ok && !audio().late, hint:'Off ramp, 333 µs, 96 smp, 80 % load, then QoS on.' },
  { title:'11 · 96 kHz?', body:`<p>The uNet can run at 96 kHz. Try it. The FPGA was written for 48 kHz only (its PLL and the 256-bit frame at 12.288 MHz), so the output is garbage. The MLC8N test report says the same. Return to 48 kHz.</p><p><b>Goal:</b> tried 96 kHz, back at 48 kHz.</p>`, check:()=>D.flags.try96 && D.fs===48000, hint:'Rate 96 kHz, then 48 kHz.' },
  { title:'12 · Pull the cable', body:`<p>Unplug the RJ45, look at the front panel (still “ AES67 ”, meters dead), then plug it back and wait for SLAVE. The front-panel processor never learns the network failed.</p><p><b>Goal:</b> unplugged once, PTP SLAVE again.</p>`, check:()=>D.flags.pulled && ptpState().code===9, hint:'Click the RJ45 twice; wait or skip.' },
  { title:'13 · Production build', body:`<p>November 2015: backup25 (AMS81 off ramp, Altera I2S→AES cores, “timing meets”) is the AMS8-1AN design; backup27 is the MLC8N. Load <b>backup25</b> with the off ramp and clean audio.</p><p><b>Goal:</b> backup25 playing.</p>`, check:()=>D.snap==='b25' && D.dir==='off' && audio().ok && !audio().slip && !audio().late, hint:'Snapshot backup25, off ramp.' },
  { title:'Done', body:`<p>That is the evaluation. The Findings tab says what was decided: uNet STANDARD on an I8S harness to header H4, 48 kHz only, configured by console; and where it went: AMS8-1AN, ${plink('mlc8','MLC8N')}, ${plink('ams2','AMS2-N')}, ${plink('32me','32ME-N')} and the uNet MINI in the ${plink('premo','PREmo')}.</p>`, check:()=>true, auto:true },
];
function viewTutorial(m){
  window.__rd85Active = false;
  if (!TUT.started){ TUT.started = true; reset(true); }
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — evaluating the uNet the way the bench did', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>${card('What the model did', `<div id="tr" class="log"></div>`)}</div>
    <div>${card('Front panel', `<div id="fp"></div>`)}${card('Bench', `<div id="ctl"></div>`)}${card('Status', `<div id="st"></div>`)}<div id="rp"></div></div></div>`;
  const draw = ()=>{
    m.querySelector('#fp').innerHTML = frontSVG(SIM.t);
    m.querySelector('#rp').innerHTML = card('Rear plate', plateSVG());
    m.querySelector('#ctl').innerHTML = controlsHTML(true);
    m.querySelector('#st').innerHTML = statusHTML();
    m.querySelector('#tr').innerHTML = traceHTML();
    bindPanel(m); bindControls(m);
    m.querySelector('#ls').innerHTML = LESSONS.map((l,i)=>{ let ok=false; try{ ok=!!l.check(); }catch(e){} return `<li style="cursor:pointer;${i===TUT.i?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${ok&&!l.auto?' ✓':''}</li>`; }).join('');
    m.querySelectorAll('#ls li').forEach(li=> li.onclick = ()=>{ TUT.i = +li.dataset.i; draw(); });
    const l = LESSONS[TUT.i]; let ok = false; try { ok = !!l.check(); } catch(e){}
    m.querySelector('#lesson').innerHTML = `<h2>${l.title}</h2>${l.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok? (l.auto?'Ready.':'✓ Goal reached.') : '◻ Not yet. <span class="muted">Hint: '+(l.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${TUT.i?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${TUT.i<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick = ()=>{ TUT.i = Math.max(0,TUT.i-1); draw(); };
    m.querySelector('#nxt').onclick = ()=>{ TUT.i = Math.min(LESSONS.length-1,TUT.i+1); draw(); };
    m.querySelector('#rs').onclick = ()=>{ reset(true); TUT.i = 0; SIM.refresh(); };
  };
  SIM.on('time', draw); ptpWatch();
}

/* ---------- one second ---------- */
function viewSecond(m){
  window.__rd85Active = false;
  m.innerHTML = `${card('One second on the RAVENNA link and inside the AMS8E-1 FPGA', `<canvas id="tl"></canvas>
     <p class="small muted">Zoom from 1 s down to 2 µs. At 1 ms you see single RTP packets (seq and RTP timestamp) and the receive buffer's sawtooth; at 20 µs one I8S frame (8 × 32-bit slots on ARCH_SDIN0_PIN) and the one-shot that loads the 256-bit buffer; at 2 µs single bits. The I8S and I2S bits are generated by running the Verilog (i8sx2_i2sx8.v + sync_one_shot.v) tick by tick. The PTP phase, sequence-number start and the exact clock edge relations are ${inf}.</p>`)}
    <div class="grid2">${card('Rates in this second', `<div id="rt"></div>`)}${card('At the playhead', `<div id="ph"></div>`)}</div>`;
  const draw = ()=>{
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220});
    const F = fs(), P = spp()/F;
    m.querySelector('#rt').innerHTML = tbl(['Event','Per second','Period','Source'], [
      ['PTP Sync + Follow_Up', (1/ptpInt()).toString(), SIM.fmtDur(ptpInt()), gmIsUnet()? 'uNet LogSyncInterval 0 (sheet)':'grandmaster setting '+inf],
      ['PTP Announce','0.5','2 s','LogAnnounceInterval 1 (sheet)'],
      ['RTP packets', (F/spp()).toLocaleString(), SIM.fmtDur(P), spp()+' samples (SamplesPerPacket)'],
      ['Packet wire time', '—', SIM.fmtDur(wireT()), payload()+' B payload + '+(C.HDR+C.WIRE_X)+' B overhead at 100 Mb/s'],
      ['I8S frames (FSYNC)', F.toLocaleString(), SIM.fmtDur(1/F), 'ARCH_FSYNC_48K (AMS81.sdc)'],
      ['I8S bits per line', (C.MCLK).toLocaleString(), '81.38 ns', 'ARCH_REF_12M288; 256 bits per frame'],
      ['PLL clock ARCH_98M304', C.PLL.toLocaleString(), '10.17 ns', 'altpll0 ×8; clkdiv_98M304_to_12M288 ÷8'],
      ['I2S bits per line (8 lines)', C.SCLK.toLocaleString(), '325.5 ns', 'i8sx2_i2sx8.v output_sclk'],
      ['AES3 frames per output', F.toLocaleString(), SIM.fmtDur(1/F), 'i2s_2_aes3 (Altera core)'],
    ]);
    const f = Math.floor(SIM.t*F), w = capture(0, f), n = Math.floor(Math.max(0, SIM.t - (spp()+C.IN_DLY)/F)/P);
    m.querySelector('#ph').innerHTML = `<table class="kv"><tr><th>Sample frame</th><td class="mono">${f.toLocaleString()} (tick ${Math.floor(SIM.t*C.MCLK).toLocaleString()} of 12.288 M)</td></tr>
      <tr><th>RTP packet</th><td class="mono">seq ${(0x3A10+n)&0xFFFF} · timestamp 0x${hex((0x5A3C0000+n*spp())>>>0,8)} ${inf}</td></tr>
      <tr><th>Buffer after frame ${f}</th><td class="mono small">${w.map((x,j)=>'CH'+(j+1)+' '+hex(x,8)).join(' · ')}</td></tr>
      <tr><th>CH1 sent → captured</th><td class="mono">${srcSample(0,f)} → ${s24(w[0])}</td></tr></table>`;
  };
  SIM.on('time', draw); ptpWatch();
}

/* ---------- block diagram ---------- */
function viewBlock(m){
  window.__rd85Active = false;
  const B = {
    src:{x:10,y:20,w:180,h:74,t:'Horus / Virtual Sound Card',s:['RAVENNA/AES67 source','PTP grandmaster (Horus)'],d:'Merging Horus (firmware 3.0.5 in #software #Merging) or the ALC NetworX RAVENNA virtual sound card: the test sources and sinks. The Horus also serves as PTPv2 grandmaster.',live:()=>D.src!=='none'},
    sw:{x:250,y:20,w:170,h:74,t:'Switch (DP2808)',s:['IGMP snooping','DSCP → queues'],d:'Merging ships MTRAVENNA_DP2808_startup-config_8-port-switch_1.1.ber; its network guide walks through IGMP snooping and DSCP-to-queue mapping on a Dell PowerConnect 28xx. Background load and QoS set the jitter here.',live:()=>D.link},
    unet:{x:480,y:20,w:200,h:96,t:'uNet2500 (uNET STANDARD)',s:['PTP slave, RTP ↔ I8S','receiver delay '+D.playout+' smp','config: console / web'],d:'Archwave module. Hardware PTP counter timestamps samples; packets are built in multiples of 8 samples; output group 1 = CH1…CH8. Parameter tree /cne/... set from the AMS8-1N sheet. ARC over SPI/UART exists but is not wired.',live:()=>ptpOK()},
    hdr:{x:480,y:160,w:200,h:70,t:'Harness X102 → H4',s:['8 wires, 26/22 AWG','T1 T2 H7 J2 F1 E1'],d:'pinout.xlsx Sheet2 and Book1.xlsx: LRCLK→T1, SCLK (12.288 MHz)→T2, SDOUT0/1→H7/J2, SDIN0/1←F1/E1 (49R9 series). The same H4 header carries the i64 MADI card and the RD79 AVB dongle.'},
    pll:{x:250,y:160,w:170,h:70,t:'Clocking',s:['altpll0 ×8 = 98.304 MHz','÷8 → 12.288 MHz'],d:'ARCH_MCLK_PIN (12.288 MHz from the uNet) → altpll0 → ARCH_98M304 → clkdiv_98M304_to_12M288 (counter bit 2) → ARCH_MCLK_INTERNAL; the AMS81 runs slaved to the network clock.'},
    off:{x:480,y:270,w:200,h:76,t:'i8sx2_i2sx8 (off ramp)',s:['2 × 256-bit I8S → 8 I2S','sync_one_shot load'],d:'Shifts every MCLK bit into input_i8s_reg; once per FSYNC the one-shot copies 256 bits into a buffer; each LRCLK the buffer feeds eight 64-bit I2S registers at 3.072 MHz.',live:()=>D.dir==='off'},
    on:{x:250,y:270,w:170,h:76,t:'i2sx8_i8sx2 (on ramp)',s:['8 I2S → 2 I8S','MLC8N, 32ME'],d:'Reverse path: 8 I2S lines captured at LRCLK, loaded into two 256-bit registers on the FSYNC one-shot and shifted out at 12.288 MHz to the uNet SDIN0/1.',live:()=>D.dir==='on'},
    aes:{x:480,y:380,w:200,h:70,t:'i2s_2_aes3 · router',s:['AES_OUT_1…8','input/bypass selectors'],d:'Altera I2S→AES3 cores (backup25 replaced the earlier ones; "timing meets"). Also the AMS81 input router, bypass and non-audio detection.'},
    dsp:{x:250,y:380,w:170,h:70,t:'SHARC + meters',s:['TDM from FPGA','22-LED bargraphs'],d:'The AMS81 SHARC computes meter levels and the speaker mix from the I2S/TDM stream (unchanged AMS81 code).'},
    fp:{x:10,y:380,w:180,h:70,t:'ATmega128 front panel',s:['display " AES67  "','rev 06AV0100'],d:'v200w.c: the Analog source slot now names AES67. No status from the uNet reaches it.'},
    aesin:{x:10,y:270,w:180,h:76,t:'AES inputs (75/110 Ω)',s:['aes3_2_i2s','on-ramp source'],d:'For the on ramp (backup9, 27, 33) local AES inputs are decoded to I2S and sent to the network.'},
  };
  const W = [['src','sw','RTP + PTP'],['sw','unet','100BASE-T'],['unet','hdr','I8S'],['hdr','pll','MCLK 12.288'],['hdr','off','SDIN0/1'],['on','hdr','SDOUT0/1'],['pll','off',''],['off','aes','8 × I2S'],['off','dsp','I2S/TDM'],['dsp','fp',''],['aesin','on','I2S']];
  let sel = 'unet';
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram — click a block (green = active in the current bench state)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bi"></div>`)}${card('In one sentence', `<p>The Archwave module does all the networking, clocking and timestamping; WBS only had to turn its 12.288 Mb/s I8S lines into the I2S its AMS81 FPGA already used, and slave the whole monitor to the network clock.</p>`)}</div></div>`;
  const draw = ()=>{
    const ctr = b=>[b.x+b.w/2, b.y+b.h/2];
    let s = `<svg viewBox="0 0 700 470" style="width:100%"><defs><marker id="ar85" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    W.forEach(([a,b,l])=>{ const A_=B[a], B_=B[b]; let [x1,y1]=ctr(A_), [x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x, dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k, y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot = sel===a||sel===b;
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#ar85)"/>${l?`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`:''}`; });
    for (const k in B){ const b = B[k], live = b.live && b.live();
      s += `<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="${live?'color-mix(in srgb,var(--accent) 14%,var(--panel2))':'var(--panel2)'}" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
       <text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>${(b.s||[]).map((l,i)=>`<text x="${b.x+10}" y="${b.y+37+i*15}" font-size="11" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML = s + '</svg>';
    m.querySelectorAll('[data-b]').forEach(g=> g.onclick = ()=>{ sel = g.dataset.b; draw(); });
    m.querySelector('#bi').innerHTML = `<h3>${B[sel].t}</h3><p>${B[sel].d}</p>`;
  };
  SIM.on('time', draw);
}

/* ---------- schematics (redrawn) ---------- */
function chip(x,y,w,name,left,right,sub){
  const n = Math.max(left.length, right.length), h = 26 + n*18;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  return s;
}
const SHEETS = [
  { name:'1 · Harness X102 → H4 → FPGA', note:'From Archwave/standard/pinout.xlsx (Sheet2, wire colours) and Book1.xlsx (H4 pin, FPGA pin, series resistors). FPGA net names from backup25/27/33 AMS81.qsf; backup6/9 used the RD79 AVB_* names on the same pins.', svg:()=>
    chip(60,70,190,'uNet STANDARD X102',[],[['40 LRCLK · blue',''],['38 SCLK · green',''],['31 SDOUT0 · black',''],['32 SDOUT1 · brown',''],['27 SDIN0 · orange',''],['28 SDIN1 · yellow',''],['2 5V · red 22 AWG',''],['6 GND · white 22 AWG','']],'40-pin, 2.54 mm') +
    chip(390,70,150,'AMS8E-1 H4',[['29','FSYNC_IN_I64'],['33','MCLK_IN_I64'],['26','DATA5_IN_I64'],['24','DATA4_IN_I64'],['14','DATA7_OUT_I64'],['12','DATA6_OUT_I64']],[],'i64 / AVB / uNet header') +
    chip(640,70,170,'EP4CE40F23C6',[['T1 CLK3','ARCH_FSYNC_PIN'],['T2 CLK2','ARCH_MCLK_PIN'],['H7','ARCH_SDIN0_PIN'],['J2','ARCH_SDIN1_PIN'],['F1','ARCH_SDOUT0_PIN'],['E1','ARCH_SDOUT1_PIN']],[],'U? (AMS81 FPGA)') +
    `<text x="400" y="250" font-size="11" fill="var(--ink2)">R190 / R192 / R193 / R194 / R195 = 49R9 series on the H4 output side (Book1.xlsx)</text>
     <text x="40" y="300" font-size="11.5" fill="var(--ink)">Note the inversion: the uNet's SDOUT0 arrives as the FPGA's ARCH_SDIN0 (names from each chip's own side).</text>
     <text x="40" y="320" font-size="11.5" fill="var(--ink)">The uNet "SCLK" (pin 38) is the 12.288 MHz I8S bit clock, so WBS calls it MCLK; the uNet's own MCLK (pin 36) is left unwired.</text>
     <text x="40" y="340" font-size="11.5" fill="var(--ink)">SPI, UART, GPIO, SYNC and DIGITAL I/O are not wired: no ARC control, no status to the ATmega128.</text>` },
  { name:'2 · Clock tree', note:'altpll0.v (clk0 ×8, inclk 81380 ps), clkdiv_98M304_to_12M288.vhd, AMS81.sdc create_clock lines. Backup33 adds plla (×8, ÷4, ÷256) and altpll2 for the i64 MADI side.', svg:()=>
    chip(80,90,150,'ARCH_MCLK_PIN',[],[['12.288 MHz','ARCH_MCLK_IN']],'T2 · ARCH_REF_12M288 81.380 ns') +
    chip(330,90,150,'altpll0',[['inclk0',''],['areset','']],[['c0 ×8','ARCH_98M304'],['c1 ×1','']],'Cyclone IV PLL') +
    chip(600,90,190,'clkdiv_98M304_to_12M288',[['clk',''],['reset_n','']],[['clk_div8','ARCH_MCLK_INTERNAL']],'counter(2) → ÷8') +
    chip(80,280,150,'ARCH_FSYNC_PIN',[],[['48 kHz','ARCH_FSYNC_IN']],'T1 · ARCH_FSYNC_48K 20833.33 ns') +
    chip(330,280,150,'sync_one_shot',[['clk_in',''],['pulse_in','']],[['pulse_out','fsync_oneshot']],'negedge clk_in, SR latch') +
    `<text x="560" y="300" font-size="11.5" fill="var(--ink)">The whole AMS81 audio side runs from the network:</text><text x="560" y="318" font-size="11.5" fill="var(--ink)">uNet PTP media clock → 12.288 MHz → PLL → I2S/AES.</text>` },
  { name:'3 · i8sx2_i2sx8 (off ramp)', note:'Register-level redraw of backup25/27 i8sx2_i2sx8.v (identical in AMS81 master V050100 and MLC8N v050000). Backup33 renames ports to buses i8s_in[1:0] / i2s_out[7:0] and adds: "This module only handles 48KHz audio for now".', svg:()=>
    chip(90,80,160,'input_i8s1/2_reg',[['input_data1',''],['input_data2',''],['posedge mclk','']],[['[255:0]','']],'256-bit shift ×2') +
    chip(360,80,160,'input_i8s1/2_buffer',[['[255:0]',''],['fsync_oneshot','load']],[['[255:192]','i2s1'],['[191:128]','i2s2'],['[127:64]','i2s3'],['[63:0]','i2s4']],'held one frame') +
    chip(640,80,150,'output_i2s1..8_reg',[['negedge sclk',''],['lrclk_oneshot','load']],[['[63]','i2s_1_out…8']],'64-bit shift ×8') +
    chip(360,300,160,'sos_input_fsync',[['input_mclk',''],['input_fsync','']],[['pulse_out','']],'sync_one_shot') +
    chip(640,300,150,'sos_output_lrclk',[['~output_sclk',''],['~output_lrclk','']],[['pulse_out','']],'sync_one_shot') },
  { name:'4 · i2sx8_i8sx2 (on ramp)', note:'backup27 i2sx8_i8sx2.v: 8 I2S inputs at 3.072 MHz / 48 kHz → 2 "i8s" outputs at 12.288 MHz. Backup9 has the smaller i2sx4_i8s.v (4 I2S → 1 line).', svg:()=>
    chip(90,80,170,'input_i2s1..8_reg',[['i2s_1_in…8',''],['negedge input_sclk','']],[['[63:0]','']],'64-bit shift ×8') +
    chip(380,80,170,'input_i2s1..8_buffer',[['lrclk_oneshot','load']],[['[63:0] ×8','']],'sos_input_lrclk on ~sclk, ~lrclk') +
    chip(660,80,150,'output_i8s1/2_reg',[['posedge output_mclk',''],['fsync_oneshot','load']],[['[255]','output_data1/2']],'ARCH_SDOUT0/1 → uNet SDIN0/1') },
  { name:'5 · backup6: i8s_4xi2s + zero_detector', note:'The first bench design (Sept 2015): one I8S line, four I2S outputs, syncOneShotAli (with ce and rst) and zero_detector (8-bit counter of zero bits; line_is_active drops after 255).', svg:()=>
    chip(90,80,160,'i8s_4xi2s',[['mclk',''],['sclk',''],['fsync_oneshot_in',''],['lrclk_oneshot_in',''],['data1_in','ARCH_SDIN0']],[['i2s1_out','ARCH_I2S1'],['i2s2_out','ARCH_I2S2'],['i2s3_out','ARCH_I2S3'],['i2s4_out','ARCH_I2S4']],'') +
    chip(430,80,150,'zero_detector',[['sclk',''],['data','']],[['line_is_active','']],'bit_counter[7:0]') +
    chip(430,260,150,'syncOneShotAli',[['clk_in',''],['pulse_in',''],['ce',''],['rst','']],[['pulse_out','']],'') +
    `<text x="80" y="420" font-size="11.5" fill="var(--ink)">i8s_4xi2s loads on lrclk_oneshot (mclk side) but unloads on fsync_oneshot (sclk side) — the names are swapped against i8sx2_i2sx8.</text>` },
  { name:'6 · uNet base board (eval kit)', note:'User manual, “GPIO functions when using the uNET baseboard”: GPIOUsage = "uNET" redefines the pins. In the monitor GPIOUsage stays "uNET" in the AMS8 sheet although no base board is present.', svg:()=>
    chip(120,80,160,'uNet STANDARD',[],[['GPIO0 (16)','I2C SCL'],['GPIO1 (15)','I2C SDA'],['GPIO2 (18)','NRESET_CODEC'],['GPIO3 (17)','LED-0'],['GPIO4 (20)','LED-1'],['GPIO5 (19)','LED-2'],['GPIO6 (22)','LED-3 + BUTTON A'],['GPIO7 (21)','BUTTON B']],'on the uNET Baseboard') +
    chip(560,80,170,'CS42448 codec',[['I2C','GPIO0/1'],['SDIN/SDOUT','I2S']],[['16 analog in/out','']],'CS42448_F4.pdf in Archwave/') +
    `<text x="80" y="330" font-size="11.5" fill="var(--ink)">LEDs: USB mode = sync status (blink if not in sync); AES67/Ravenna mode = all on. Button A long press toggles USB ↔ ETHERNET.</text>
     <text x="80" y="350" font-size="11.5" fill="var(--ink)">RS232 debug console 115200 8N1 — the way WBS loaded its parameter sheet.</text>` },
];
function viewSchem(m){
  window.__rd85Active = false;
  let i = 0;
  m.innerHTML = card('Schematic set — redrawn from the archived Verilog, .qsf and harness spreadsheets, not the original CAD', `<div id="tb" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p>`);
  const draw = ()=>{
    m.querySelector('#tb').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tb button').forEach(b=> b.onclick = ()=>{ i = +b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 900 470" style="width:100%;min-width:660px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="888" height="458" fill="none" stroke="var(--line)"/><text x="880" y="455" text-anchor="end" font-size="10" fill="var(--ink2)">RD85 · sheet ${i+1}/${SHEETS.length} · redrawn ${Y(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#sn').innerHTML = SHEETS[i].note;
  };
  draw();
}

/* ---------- software ---------- */
function cobs(bytes){ const out = []; let code = 1, idx = 0; out.push(0);
  for (const b of bytes){ if (b===0){ out[idx]=code; idx=out.length; out.push(0); code=1; } else { out.push(b); code++; if (code===0xFF){ out[idx]=code; idx=out.length; out.push(0); code=1; } } }
  out[idx]=code; return out; }
function arcFrame(fid, cmd){ const body = [fid, cmd, 0x00, 0x00]; const sum = body.reduce((a,b)=>a+b,0); const ck = (~sum)&0xFF; return { raw:[...body, ck], wire:[0x00, ...cobs([...body, ck]), 0x00] }; }
function viewSoft(m){
  window.__rd85Active = false;
  m.innerHTML = `${card('I8S frame at the playhead — the Verilog run tick by tick', `<div id="fm"></div><div id="ft"></div>`)}
   <div class="grid2">${card('uNet PTP port state (Net_GetPTPStatus 0xA2 enumeration)', `<div id="ps"></div>`)}${card('RTP packet at the playhead', `<div id="rtp"></div>`)}</div>
   <div class="grid2">${card('Configuration tree (/cne/AppSettings) — factory vs AMS8-1N sheet', `<div id="cf"></div>`)}${card('ARC frame (protocol available, not wired)', `<div id="arc"></div>`)}</div>
   ${card('Front panel code path (v200w.c, V040100)', `<pre class="mono small" style="white-space:pre-wrap;margin:0">case ANALOG:
/*Avb-Rem Start   *(line2 + Audio_Offset + 1..6) = A n a l o g   //Avb-Rem End */
//Avb-Add Start
   *(line2 + Audio_Offset + 0) = SPACE;  + 1 = chA;  + 2 = chE;  + 3 = chS;  + 4 = NO6;  + 5 = NO7;  + 6..7 = SPACE
//Avb-Add End
   input = preset_tally | SOURCE_CHANGE(analog_input_source);

if (input_setup == ANALOG_DISPLAY_SCREEN)   // backup2: " AVB   "   backup3 / V040100: " AES67 " + analog_enabled Y/N
common.h  REVISION1..8 = 0 6 A V 0 1 0 0   (backup2: 0 6 V A 0 0 0 2)</pre><p class="small muted">The display currently reads <span class="mono">"${displayText()}"</span>.</p>`)}`;
  const draw = ()=>{
    const F = fs(), f = Math.floor(SIM.t*F), k = Math.floor(SIM.t*C.MCLK), d = D.align?0:1, b = ((k - d) % 256 + 256) % 256;
    const w = capture(0, f);
    let s = `<svg viewBox="0 0 900 96" style="width:100%">`;
    for (let i=0;i<256;i++){ const x = 6 + i*3.47, slot = i>>5, bit = bitIn(0, 256*f + i + d);
      s += `<rect x="${x}" y="${18}" width="3.2" height="30" fill="${i===b?'var(--bad)':bit?'var(--accent)':(slot%2?'var(--grid)':'var(--chip)')}"/>`; }
    for (let j=0;j<8;j++) s += `<text x="${6+j*111+4}" y="13" font-size="11" fill="var(--ink)">CH${j+1}${j<4?'':''}</text><text x="${6+j*111+4}" y="64" font-size="10" fill="var(--ink2)">I2S ${(j>>1)+1} ${j%2?'R':'L'}</text>`;
    s += `<text x="6" y="88" font-size="10.5" fill="var(--ink2)">frame ${f} on ARCH_SDIN0_PIN · red = bit at the playhead · 24 data bits + 8 zero pad per slot · AvPortAlign ${D.align}</text></svg>`;
    m.querySelector('#fm').innerHTML = s;
    m.querySelector('#ft').innerHTML = tbl(['Slot','uNet sent (24-bit)','input_i8s_buffer word','AES gets','dBFS'], w.map((x,j)=>{ const sv = srcSample(j,f), cv = s24(x); return [`CH${j+1}`, `<span class="mono">${sv}</span>`, `<span class="mono">0x${hex(x,8)}</span>`, `<span class="mono" style="${cv!==sv?'color:var(--bad)':''}">${cv}</span>`, isFinite(dbfs(cv))?dbfs(cv).toFixed(1):'−∞']; }));
    const st = ptpState().code, nodes = [[1,'INITIALIZING',60,40],[4,'LISTENING',220,40],[8,'UNCALIBRATED',380,40],[9,'SLAVE',380,130],[5,'PRE_MASTER',220,130],[6,'MASTER',60,130],[2,'FAULTY',60,210],[3,'DISABLED',220,210]];
    let p = `<svg viewBox="0 0 500 240" style="width:100%"><defs><marker id="pa85" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    [[0,1],[1,2],[2,3],[1,4],[4,5]].forEach(([a,c])=>{ const A_=nodes[a], B_=nodes[c]; p += `<line x1="${A_[2]+50}" y1="${A_[3]+15}" x2="${B_[2]+(B_[3]===A_[3]?0:50)}" y2="${B_[3]+(B_[3]===A_[3]?15:0)}" stroke="var(--ink2)" marker-end="url(#pa85)"/>`; });
    nodes.forEach(([c,n,x,y])=>{ p += `<rect x="${x}" y="${y}" width="100" height="30" rx="6" fill="${c===st?'color-mix(in srgb,var(--accent) 30%,var(--panel2))':'var(--panel2)'}" stroke="${c===st?'var(--accent)':'var(--line)'}" stroke-width="${c===st?2.5:1}"/><text x="${x+50}" y="${y+19}" text-anchor="middle" font-size="10.5" fill="var(--ink)">${c} ${n}</text>`; });
    p += `</svg><p class="small muted">${ptpState().why}. Timings: INITIALIZING 0.5 s, first Announce, 3 Sync intervals to calibrate, announceReceiptTimeout 3 × 2 s — ${inf}.</p>`;
    m.querySelector('#ps').innerHTML = p;
    const P = spp()/F, n = Math.floor(Math.max(0, SIM.t - (spp()+C.IN_DLY)/F)/P), seq = (0x3A10+n)&0xFFFF, ts = (0x5A3C0000 + n*spp())>>>0, ssrc = 0x1D2E3F40;
    const hdr = [0x80, 0x60, seq>>8, seq&255, ts>>>24, (ts>>16)&255, (ts>>8)&255, ts&255, ssrc>>>24, (ssrc>>16)&255, (ssrc>>8)&255, ssrc&255];
    const smp = []; for (let c=0;c<2;c++){ const v = srcSample(c, n*spp()) & 0xFFFFFF; smp.push(v>>16, (v>>8)&255, v&255); }
    m.querySelector('#rtp').innerHTML = `<p class="mono small">${hdr.map(x=>hex(x)).join(' ')} | ${smp.map(x=>hex(x)).join(' ')} …</p>${tbl(['Field','Value'],[['V/P/X/CC','0x80: version 2'],['M/PT','0x60: dynamic payload type 96 '+inf],['Sequence',seq],['Timestamp','0x'+hex(ts,8)+' (media clock, +'+spp()+' per packet; offset '+inf+')'],['SSRC','0x'+hex(ssrc,8)+' '+inf],['Payload',`${spp()} samples × ${D.nch} ch × ${bps()} B = ${payload()} B, ${D.enc} big-endian`],['UDP / multicast','port 5004 · 239.N.AAA.AAA when automatic (manual)']])}`;
    const rows = [['Global/ModelName','uNet2500',D.cfg.ModelName],['Global/ManufacturerName','Archwave',D.cfg.ManufacturerName],['Global/StreamingInterface','ETHERNET',D.bus],['Global/SampleRate','2 (48 kHz)',D.fs===48000?'2':'4'],['Global/AvPortFormat','8 (I8S)',D.cfg.AvPortFormat],['Global/AvPortAlign','0 (1 SCK delay)',D.align],['Global/SyncMode','3 (PTP)',D.cfg.SyncMode],['RavennaConfiguration/PTP/Priority1','200',D.cfg.Priority1],['…/PTP/LogSyncInterval','0 (1 s)','0'],['…/AudioModes/Mode0/AudioModeName','No Digital I/O',D.cfg.AudioModeName],['…/Mode0/ActiveStreams','1,2,6,7',D.cfg.ActiveStreams],['…/Mode0/AVOutChannels','16',D.cfg.AVOutChannels],['…/User_PlayoutDelay','512',D.playout],['…/InputDelay1xFS · OutputDelay1xFS','16 · 16','16 · 16']];
    m.querySelector('#cf').innerHTML = tbl(['Path','Default','Now'], rows.map(r=>[`<span class="mono small">${r[0]}</span>`, r[1], `<b>${r[2]}</b>`]));
    const fr = arcFrame(0x01, 0xA2);
    m.querySelector('#arc').innerHTML = `<p class="small">Request <b>Net_GetPTPStatus</b> (0xA2), frame ID 1, no payload: <span class="mono">0x00 | FrameID | Cmd | Len(2) | Checksum | 0x00</span>, checksum = inverse of the byte sum, whole frame COBS-encoded (app_ARC_v2.0_draft, Annex A).</p>
      <p class="mono small">raw: ${fr.raw.map(x=>hex(x)).join(' ')}<br>on the wire: ${fr.wire.map(x=>hex(x)).join(' ')}</p>
      <p class="small">The reply would be PTP State (U8, now ${ptpState().code}), Domain (0), Current Offset (U64), Grandmaster ID (8 bytes). WBS never wired SPI or UART to H4, so none of this reached the monitor; the PREmo (RD88) later did use ARC over UART 0 (${plink('premo','PREmo plugin')}).</p>`;
  };
  SIM.on('time', draw); ptpWatch();
}

/* ---------- findings ---------- */
function viewNotes(m){
  window.__rd85Active = false;
  m.innerHTML = card('What was decided', `<ul>
   <li><b>Module: the uNET STANDARD (uNet2500).</b> The May 2015 price list put it at €89 in thousands against €55 for the COMPACT and €45 for the MINI, but only the STANDARD and COMPACT have the I8S port that carries 8 channels per wire, and the STANDARD also does USB. The AMS8-1N, MLC8N, AMS2-N and 32ME-N sheets all name <span class="mono">ModelName uNet2500</span>. The MINI went into the PREmo instead (${plink('premo','PREmo')}).</li>
   <li><b>Interface: two I8S lines into the existing FPGA, nothing else.</b> The harness (pinout.xlsx Sheet2, and the eight wires in 32ME-N/unet.jpg) carries LRCLK, the 12.288 MHz SCLK, SDOUT0/1 and SDIN0/1 to header H4 — the header the i64 MADI card and the RD79 AVB dongle used. SPI, UART and GPIO were drafted in Sheet1 and dropped. Control is by the uNet's RS232 console or web page; ARC (SPI/UART) is never used.</li>
   <li><b>Configuration by parameter sheet.</b> The “AMS8 Modification” column: ModelName AMS8-1AN, ManufacturerName Ward-Beck Systems, PTP Priority1/2 255, audio mode “AES67 OFF-Ramp”, ActiveStreams 0, 8 outputs named CH1–CH8, 48 kHz only.</li>
   <li><b>48 kHz only.</b> i8sx2_i2sx8.v (backup33): “This module only handles 48KHz audio for now”. The MLC8N test report (25 May 2016, 05AV0100) repeats it and suggests 96 kHz “later on”.</li></ul>`)
  + card('What became of it', tbl(['Snapshot','Date','Became'], Object.keys(SNAPS).map(k=>[k.replace('b','backup'), SNAPS[k].date, SNAPS[k].product]))
   + `<ul class="small"><li><b>AMS8-1AN</b>: backup25's AMS81.bdf and .qsf are byte-identical to <span class="mono">AMS81 - #Master/…/AMS8 - #Software #Altera #V050100</span>; the AMS8-1N folders hold the uNet sheet, harness and photo.</li>
   <li><b>MLC8N</b>: backup27's AMS81.bdf/.qsf are identical to <span class="mono">MLC8N - #Software #ALTERA #v050000</span>. Test report: 05AV0100, uNet Standard fitted, the demux board no longer fits so three SDI buttons are dead and new silk is needed. (The ${plink('mlc8','MLC8 plugin')} models the MLC8A.)</li>
   <li><b>AMS2-N</b> (“AES67 Monitor” mode, receive only, Digital Out 1–2 into the 7201 switch): ${plink('ams2','AMS2 plugin')}.</li>
   <li><b>32ME-N</b>: uNet on H4 replaces MADI channels 33–48 — ${plink('32me','32ME plugin')}; backup33 is the 32ME on/off ramp. The rear plate drawing (UNET STD.-REAR ISS 1, 20 Aug 2015, file AMS8/AMS82/) sits in 32ME-N.</li>
   <li><b>PREmo (RD88)</b>: uNet MINI, ARC over UART, stream “MIC OUT” — ${plink('premo','PREmo plugin')}.</li>
   <li><b>From AVB</b>: RD63 sized AVB and RD79 built an XMOS listener on the same H4 pins (${plink('rd63-avbresearch','RD63 plugin')}); RD85 replaced it with RAVENNA/AES67. Backup6/9 still use the AVB_* pin names.</li>
   <li>The R&amp;D register still lists RD85 as priority <b>B</b>, not Z (completed), although products shipped.</li></ul>`)
  + card('Findings in the code and files', `<ol class="small">
   <li><b>No bit counter: alignment rides on a one-shot.</b> i8sx2_i2sx8 keeps shifting every MCLK and copies the last 256 bits when <span class="mono">sync_one_shot</span> fires. Which 256 bits that is depends on the FSYNC-to-data edge relation and AvPortAlign. One bit off and every slot loses its sign bit (+6 dB, wrap-round) — try it in the simulator. The sheet's AvPortAlign 0 is what worked; the exact edge relation is ${inf}.</li>
   <li><b>The I2S 1-bit delay is also a one-shot side effect.</b> The output registers load on the negedge of SCLK after the LRCLK one-shot, which lands the MSB one SCLK after the LRCLK edge, as I2S expects.</li>
   <li><b>zero_detector cannot tell silence from a dead stream</b> (backup6/9): 255 consecutive zero bits clear line_is_active, and a digitally silent stream does exactly that.</li>
   <li><b>Front panel is blind to the network.</b> Nothing from the uNet reaches the ATmega128; with the cable out the display still reads “ AES67 ”.</li>
   <li><b>AES67 replaces the Analog input.</b> v200w.c's //Avb-Add blocks overwrite the “Analog” strings; the network source is still selected through <span class="mono">analog_input_source</span> and enabled by <span class="mono">analog_enabled</span>.</li>
   <li><b>Half-relabelled firmware.</b> backup2 (Nov 2015, rev 06VA0002) already shows “ AES67 ” on the main display but “ AVB ” on the input-setup screen; backup3/V040100 (Mar 2016) fix the setup screen and change the revision to 06AV0100 (the V and A swap places).</li>
   <li><b>Swapped names.</b> uNet SDOUT0 becomes ARCH_SDIN0, uNet SCLK becomes ARCH_MCLK; in i8s_4xi2s the mclk-side load is called lrclk_oneshot and the sclk-side one fsync_oneshot, the reverse of the later modules.</li>
   <li><b>Mislabelled file.</b> backup33's <span class="mono">i2sx16_tdmV2.v</span> contains <span class="mono">module syncOneShot</span>, not an I2S-to-TDM converter.</li>
   <li><b>Foreign cores.</b> backup33 carries Xilinx XAPP AES3 Rx/Tx and ASRC sources with .xco/.ngo netlists that Quartus cannot build; a second .qsf (resource_opt_1) targets a Cyclone EP1C6 — leftovers.</li>
   <li><b>Packet time limits.</b> As a sender the uNet builds multiples of 8 samples (manual), so it cannot send 6-sample 125 µs packets (it rounds to 167 µs); as a receiver it takes whatever the sender uses. The default 1 ms is AES67's required packet time.</li>
   <li><b>Payload ceiling.</b> 48 samples × 16 ch × 3 B = 2304 B will not fit one frame: 16 channels at 1 ms need two streams (the factory sheet's streams 1 and 2 are 8 ch each).</li>
   <li><b>Priority 255 is not “never master”.</b> With no other grandmaster the BMCA still elects the uNet (${inf}); the uNet then sends Sync once a second (LogSyncInterval 0).</li>
   <li><b>GPIOUsage “uNET”</b> stays set in the AMS8 sheet although it redefines GPIO for Archwave's base board (I2C codec, LEDs, buttons); harmless only because no GPIO is wired.</li>
   <li><b>Firmware image name.</b> <span class="mono">uNet_2500_Release_No_CnE_ 3000.bcd</span> (2.9 MB, Nov 2015, note the space): “No_CnE” presumably means no CopperLan, which the manual says carries a per-node licence fee (${inf}).</li>
   <li><b>Unrelated vendor file.</b> The Dante Controller manual sits in Archwave/; Dante is a different AoIP system.</li>
   <li><b>Credentials in vendor docs.</b> The uNet manual prints Archwave's FTP login; it is not repeated here.</li></ol>`)
  + card('Main assumptions (marked inferred)', `<ul class="small"><li>Edge timing: FSYNC seen one MCLK after the data edge (so AvPortAlign 0 works, as shipped); AMS81 LRCLK phase ${C.PHI} MCLK ticks.</li><li>Grandmaster sync interval choices, Horus announce interval, PTP state timings, RTP payload type/SSRC/timestamp offset, packet overhead bytes, jitter model, meter scale, Detail A = USB, test-programme levels.</li><li>The front panel's AES / AES67 toggle is simplified to a SELECT press.</li></ul>`)
  + card('Sources', `<ul class="small mono"><li>${PATH}Software/FPGA/backup6…backup33/v05xxxx/ (i8s*.v, i2sx*.v, sync_one_shot.v, syncOneShotAli.v, zero_detector.v, AMS81.qsf/.sdc/.bdf, altpll0.v, clkdiv_98M304_to_12M288.vhd)</li><li>${PATH}Software/atmel front/{backup2,backup3,V040100}/v200w.c, common.h</li><li>${PATH}Archwave/ (uNET_UserManual_11_17_2015.pdf, app_ARC_v2.0_draft.pdf, standard/pinout.xlsx, Book1.xlsx, datasheets, Price List May 2015)</li><li>${PATH}#software #Merging/, alc/ravenna/</li><li>AMS81 - #Master/AMS8 - #Engineering/AMS8-1N/unet-standard-Parameters.xlsx</li><li>#MLC - #SERIES/MLC8N - #TESTREPORT/MLC8N-05AV0100-25MAY16.pdf</li><li>32ME-N/UNET STD.-REAR ISS 1 (ARCHWAVE).pdf, unet.jpg</li></ul>`);
}

reset();
SIM.register({
  id: ID, name: 'RD85 Archwave Ravenna Monitor · uNet AES67 on/off ramp for the AMS8-1 ('+Y(2015)+')', duration: 1,
  product: 'RD85 Archwave Ravenna Monitor', year: 2015, family: 'R&D register', folder: 'ENGINEERING - 2016 RD FILES/RD85-Archwave Ravenna Monitor',
  summary: 'The 2015–2016 evaluation that put an Archwave uNet2500 RAVENNA/AES67 module inside the AMS8-1 monitor. The model runs the archived Verilog bit by bit (I8S → I2S), locks PTP, streams RTP packets at 1 ms or 125 µs through a switch with jitter, and shows the receiver-delay budget. It ends in the AMS8-1AN, MLC8N, AMS2-N and 32ME-N.',
  highlights: ['I8S → I2S off ramp from i8sx2_i2sx8.v, tick by tick','PTP states, RTP packets and the receive buffer in slow motion','Receiver delay, packet time and QoS experiments','X102 → H4 harness and the Archwave rear plate to scale','Front-panel “ AES67 ” relabel in v200w.c','Links to MLC8N, AMS2-N, 32ME-N, PREmo and RD63'],
  depth: 'Full model',
  stepUnits: [ {label:'1 RTP packet', period:()=>spp()/fs()}, {label:'1 sample frame', period:()=>1/fs()}, {label:'1 I2S bit (325.5 ns)', period:()=>1/C.SCLK}, {label:'1 I8S bit (81.4 ns)', period:()=>1/C.MCLK}, {label:'PTP Sync interval', period:()=>ptpInt()} ],
  zooms: [[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms'],[0.002,'2 ms (two 1 ms packets)'],[0.0002,'200 µs'],[0.000025,'25 µs (one I8S frame)'],[0.000004,'4 µs (bits)']],
  defaultZoom: 3,
  tabs: [
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: the evaluation', render:viewTutorial},
    {id:'second', label:'One second, packet by packet', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
