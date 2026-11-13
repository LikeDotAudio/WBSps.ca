/* =====================================================================
   SA-DEMUX4 / DEMUX-4 — 3G/HD/SD-SDI audio de-embedder (Ward-Beck Systems, RD31, 2013|46–2015|48)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, folder "SA-DEMUX4 - #Master"):
   - DEMUX4 - #Engineering/Software/Atmel/V020401-StandAlone/demux4.c  main(), main loop, debounce*,
       processLockStatus, getSaGrpSel/getSaPrSel, getAudioGroups, getSelectedInput, processUart, ISRs
     … serdes.c, demuxer.c, cable.c, exaudio.c, si5324.c/.h, si5335.c, sspi.c/.h, xspi.c/.h, xilinx.c, common.h
     … xspi.lis / demux4.lis (ICCAVR listings: cycle counts of wait() and xRWByte)
     … V020102-AMS4 / V020202-XTM4 demux4.c (host-UART builds)
   - DEMUX4 - #Engineering/Software/Xilinx/V020100-StandAlone/SourceFiles/Demux4.v, Demux4.ucf,
       Control/spi.v (register file), Audio/aes_tx_clkdiv.v, swap_audio.v, mclkSync.v,
       Demuxer/HD/audio_det.v, hd_audio_demux_data.v, Demuxer/SD/sd_demux_top.v; stdaln.prm; Demux4.xise
     … obsolete_V020000/SourceFiles/Demux4.v (host FPGA output mapping)
   - DEMUX4 - #Engineering/DEMUX-4-ISS2 #Schematic.pdf (sheets 4 connectors, 5 controller, 8 AES IO)
   - DEMUX4 - #Engineering/PCB/ISS2/DEMUX4-ISS2-ASSY.PDF (top silk → assets/demux4-top-silk.png)
   - DEMUX4 - #Engineering/PCB/GERBERS/DEMUX4-FAB.PDF (4.400 in board, green mask, white silk)
   - Demux4 - #RD #NOTES #RD31 #ARCHIVE /Software/Demux4/regs.txt; …/AMS82-Front/backup2/V040000/uart.c, AMS82.h
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const ASSET = 'siumulation-plugins/assets/';
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const hex = (v,n)=> (v>>>0).toString(16).toUpperCase().padStart(n||2,'0');
const bin = (v,n)=> (v>>>0).toString(2).padStart(n||8,'0');

/* ---------------- timing constants ---------------- */
const F_CPU = 4.9152e6;                 // X5 4.9152 MHz (BOM, schematic sheet 5; initUart0 comment)
const WAIT_CYC = 7;                     // wait(): wdr, subi, sbci, cpi, cpc, brne(2) — demux4.lis
const BIT_T = 605 / F_CPU;              // xRWByte: wait(20)+wait(40)+wait(20) + call/loop overhead ≈ 605 cycles (xspi.lis)
const XFER_T = 16*BIT_T + 90/F_CPU;     // xReadWrite: address byte + data byte (+ push/pop) ≈ 1.99 ms
const SSPI_BYTE_T = 100 / F_CPU;        // sspiWriteByte/ReadByte: no waits, ≈12 cycles per bit
const OVH_T = 40 / F_CPU;               // small C overhead between calls (inferred)
const WDT_T = 0.12;                     // WDTCR = 0x0B → 128K WDT cycles ("120ms time-out" comment)
const BITSTREAM_BYTES = 0x16AAC8;       // stdaln.prm: demux4.bit occupies 0x000000–0x16AAC7 of the M25P16
const CFG_RATE = 2e6;                   // Demux4.xise "Configuration Rate spartan6" = 2 (default) → ~2 MHz CCLK
const CFG_T = BITSTREAM_BYTES*8/CFG_RATE + 0.004;   // ≈ 5.94 s — inferred from size and default rate
const T_RXLOCK = 0.025;                 // GTP + XAPP1076 rate search to lock — INFERRED
const T_ICAL = 0.15;                    // Si5324 internal calibration to LOL low — INFERRED
const HOST_PERIOD = 0.1;                // host (AMS8x / XTM4) frame repeat — INFERRED
const AMS4_PERIOD = 0.37;               // AMS4 host: pole 2 × 256 + communication_control 50 passes ≈ 0.37 s (ams4.js, from ams1v203.asm)
const hostPeriod = ()=> D.build==='AMS4' ? AMS4_PERIOD : HOST_PERIOD;
const LAT = 16/48000;                   // de-embed FIFO latency SDI→AES — INFERRED
const MCLK = 12.288e6;                  // UCF: TIMESPEC TS_mclk 12.288 MHz (PLL1705)
const AES_PHASE = 0.00137;              // free-running aes_tx_clkdiv counter phase — arbitrary (inferred)
const TICK0 = 1024 / F_CPU;             // Timer0 with TCCR0 |= 0x07 (clk/1024) = 208 µs
const UART_BYTE = 10/9600;              // 9600 8N1 (UBRR0L = 31)
const DEB = {cable:15, sdi:30, clock:10, audio:10};   // CABLE/SDI/CLOCK/AUDIO_DEBOUNCE_VAL

const VF = {
  sd525:    {name:'SD 525i 59.94 (NTSC)',   std:1, clk:27e6,          spl:1716, act:1440, hdr:4, lines:525,  fr:30000/1001, il:true,  sw:[10,273], fam:8, rate:6,   m:1, vpid:0x81, rateTxt:'270 Mb/s'},
  sd625:    {name:'SD 625i 50 (PAL)',       std:1, clk:27e6,          spl:1728, act:1440, hdr:4, lines:625,  fr:25,         il:true,  sw:[6,319],  fam:9, rate:5,   m:0, vpid:0x81, rateTxt:'270 Mb/s'},
  hd720p59: {name:'HD 720p 59.94',          std:2, clk:74.25e6/1.001, spl:1650, act:1280, hdr:8, lines:750,  fr:60000/1001, il:false, sw:[7],      fam:1, rate:0xA, m:1, vpid:0x84, rateTxt:'1.485/1.001 Gb/s'},
  hd1080i59:{name:'HD 1080i 59.94',         std:2, clk:74.25e6/1.001, spl:2200, act:1920, hdr:8, lines:1125, fr:30000/1001, il:true,  sw:[7,569],  fam:0, rate:6,   m:1, vpid:0x85, rateTxt:'1.485/1.001 Gb/s'},
  hd1080i50:{name:'HD 1080i 50',            std:2, clk:74.25e6,       spl:2640, act:1920, hdr:8, lines:1125, fr:25,         il:true,  sw:[7,569],  fam:0, rate:5,   m:0, vpid:0x85, rateTxt:'1.485 Gb/s'},
  g3p59:    {name:'3G-A 1080p 59.94',       std:3, clk:148.5e6/1.001, spl:2200, act:1920, hdr:8, lines:1125, fr:60000/1001, il:false, sw:[7],      fam:0, rate:0xA, m:1, vpid:0x89, rateTxt:'2.97/1.001 Gb/s'},
  g3p50:    {name:'3G-A 1080p 50',          std:3, clk:148.5e6,       spl:2640, act:1920, hdr:8, lines:1125, fr:50,         il:false, sw:[7],      fam:0, rate:9,   m:0, vpid:0x89, rateTxt:'2.97 Gb/s'},
  g3b:      {name:'3G-B 1080i 59.94 (level B)', std:4, clk:74.25e6/1.001, spl:2200, act:1920, hdr:8, lines:1125, fr:30000/1001, il:true, sw:[7,569], fam:0, rate:6, m:1, vpid:0x8A, rateTxt:'2.97/1.001 Gb/s (2 × HD)'},
};
const STD_NAME = {0:'UNLOCKED',1:'LOCK_SD',2:'LOCK_HD',3:'LOCK_3GA',4:'LOCK_3GB'};
const GCOL = ['--accent','--accent2','--warn','--bad'];
const DID = {sd:['0x2FF','0x1FD','0x1FB','0x2F9'], hd:['0x2E7','0x1E6','0x1E5','0x2E4'], hdc:['0x1E3','0x2E2','0x2E1','0x1E0']};

const SCN = {
  steady:{label:'Running (steady state)', end:1.06, pages:[[0,'0 – 1 s']]},
  plug:  {label:'SDI cable plugged in at 50 ms', end:3.1, pages:[[0,'0 – 1 s'],[1,'1 – 2 s'],[2,'2 – 3 s']]},
  boot:  {label:'Power-up (FPGA boots from M25P16)', end:9.1, pages:[[0,'0 – 1 s · PROG pulse, FPGA configuring'],[5.5,'5.5 – 6.5 s · DONE, init'],[6.5,'6.5 – 7.5 s · debounce, lock'],[7.5,'7.5 – 8.5 s · Si5324 ICAL, audio']]},
};
const BUILD = {
  SA:  {name:'V020401 Stand-Alone (DIP SW1)', fpga:'V020100-StandAlone', host:false},
  AMS4:{name:'V020102 AMS4 host build (UART)', fpga:'V020000', host:true},
  XTM4:{name:'V020202 XTM4 host build (UART)', fpga:'V020000', host:true},
};

/* ---------------- device + world state ---------------- */
const D = {
  scn:'steady', page:0, build:'SA', ucStart:0,
  base:{ cable:[true,false], fmt:['hd1080i59','sd525'], gm:[0b0011,0b0001], dip:[true,false,false,false,false,true,false,false], host:{on:false, cmd:0xF0} },
  ev:[], log:[], lastTrace:[], scopeOut:0, selBlock:'dmx', selChip:null,
};
const page0 = ()=> SCN[D.scn].pages[Math.min(D.page, SCN[D.scn].pages.length-1)][0];
const absT = t => page0() + (t===undefined? SIM.t : t);

let WC=null, WKEY='';
function world(t){
  const key = JSON.stringify([D.base, D.ev]);
  if (key!==WKEY){ WKEY=key; WC=[]; let w=JSON.parse(JSON.stringify(D.base)); WC.push({t:-Infinity, w}); for (const e of D.ev){ w=JSON.parse(JSON.stringify(w)); applyEv(w,e); WC.push({t:e.t, w}); } }
  let lo=0, hi=WC.length-1; while (lo<hi){ const m=(lo+hi+1)>>1; if (WC[m].t<=t) lo=m; else hi=m-1; }
  return WC[lo].w;
}
function applyEv(w, e){
  const m = /^(cable|fmt|gm)(\d)$/.exec(e.k);
  if (m) w[m[1]][+m[2]] = e.v;
  else if (e.k==='dip') w.dip = e.v.slice();
  else if (e.k==='host') w.host = Object.assign({}, e.v);
}
function evPoints(keys, t0, t1){ return D.ev.filter(e=> e.t>t0 && e.t<=t1 && keys.some(k=>e.k===k)).map(e=>e.t); }
function lastEv(keys, t){ let r=-1e9; for (const e of D.ev){ if (e.t>t) break; if (keys.includes(e.k)) r=e.t; } return r; }
function addEv(k, v){
  const t = absT();
  D.ev = D.ev.filter(e=> !(e.k===k && e.t >= t - 1e-9));
  D.ev.push({t, k, v}); D.ev.sort((a,b)=>a.t-b.t);
}
function pinb(w){ let v=0; for (let i=0;i<8;i++) if (!w.dip[i]) v |= 1<<i; return v; }   // ON = pin pulled to GND
function saGrp(w, gr){ const p=pinb(w); let s=0; if (gr===1){ if(!(p&4)) s+=1; if(!(p&2)) s+=2; } else { if(!(p&32)) s+=1; if(!(p&16)) s+=2; } return s; }
function saPair(w, gr){ const p=pinb(w); return gr===1 ? (p&8?0:1) : (p&64?0:1); }

/* =====================================================================
   EMULATOR — the firmware's main() and main loop, run against a model of
   the Spartan-6 register file (Control/spi.v) and the world (cables, DIP).
   ===================================================================== */
let S = null, SKEY = '';
function sched(){
  const key = JSON.stringify([D.scn, D.base, D.ev, D.build, D.ucStart]);
  if (key === SKEY && S) return S;
  SKEY = key; S = emulate(); return S;
}

function emulate(){
  const sc = SCN[D.scn], END = sc.end, host = BUILD[D.build].host;
  const st = { ops:[], xf:[], ss:[], passes:[], uart:[], resets:[], notes:[], leds:{sdi:[[-1e9,0]],gr1:[[-1e9,0]],gr2:[[-1e9,0]]}, cfg:[], wdtSpins:[] };
  /* ---------- FPGA model (spi.v register file + datapath status) ---------- */
  const F = { regH:{}, doneAt:-1e9, si:{icals:[], rsts:[], regs:{}, pend:0}, alive:true };
  function regReset(t){ const def={0:1,1:0,2:0xAA,3:0x55}; for (let a=0;a<0x2F;a++){ if (!F.regH[a]) F.regH[a]=[[t, def[a]||0]]; else F.regH[a].push([t, def[a]||0]); } }
  regReset(-1e9);
  const regAt = (a,t)=>{ const h=F.regH[a]; let lo=0, hi=h.length-1; while (lo<hi){ const m=(lo+hi+1)>>1; if (h[m][0]<=t) lo=m; else hi=m-1; } return h[lo][1]; };
  const regChanges = (a,t0,t1)=> F.regH[a].filter(x=>x[0]>t0 && x[0]<=t1).map(x=>x[0]);
  const lastChange = (a,mask,t)=>{ const h=F.regH[a]; let last=-1e9, prev=h[0][1]&mask; for (let i=1;i<h.length;i++){ if (h[i][0]>t) break; const v=h[i][1]&mask; if (v!==prev){ last=h[i][0]; prev=v; } } return last; };
  const configured = t => !st.cfg.some(c=> t>=c.t0 && t<c.t1);
  const lastDone = t => { let d=-1e9; for (const c of st.cfg) if (c.t1<=t) d=Math.max(d,c.t1); return d; };
  const sel = t => (regAt(0x1B,t)>>7)&1;                       // tx1_stream_select
  const refOn = (i,t)=>{ // RX_REF_CLK1 (OEB3) / RX_REF_CLK2 (OEB2), Si5335 out of reset
    const v=regAt(0x08,t); const bit = i? 4:8; return !(v & bit) && !(v & 1); };
  const refSince = (i,t)=>{ const bit=i?4:8; return lastChange(0x08, bit|1, t); };
  const rxSince = (i,t)=> Math.max(lastEv(['cable'+i,'fmt'+i],t), refSince(i,t), lastDone(t));
  function rxLock(i,t){ const w=world(t); return configured(t) && w.cable[i] && refOn(i,t) && t >= rxSince(i,t)+T_RXLOCK; }
  function fmtOf(i,t){ return VF[world(t).fmt[i]]; }
  function rxStat1(i,t){
    if (!rxLock(i,t)) return 0; const f=fmtOf(i,t);
    let v=1; if (f.std===1) v|=2; else if (f.std===2) v|=4; else v|=8;
    if (f.m) v|=16; if (f.std===4) v|=32; if (!f.il) v|=64; v|=128; return v; }
  function cdPre(t){ const w=world(t); return !w.cable[sel(t)] || ((regAt(0x0A,t)>>4)&1); }
  function cdLatch(t){ // LDPE EQ_CD_SR: preset by "no carrier" or SET_EQ_CD_SR; cleared while RST_EQ_CD_SR (bit2) high
    const h=F.regH[0x0A]; let r=null; for (let i=h.length-1;i>=0;i--){ if (h[i][0]>t) continue; if (h[i][1]&4){ r=h[i][0]; break; } }
    if (r===null) return true;
    const pts=[r, ...evPoints(['cable0','cable1'], r, t), ...regChanges(0x0A,r,t), ...regChanges(0x1B,r,t)];
    return pts.some(p=>cdPre(p)) || !configured(t); }
  function srSet(a, bit, t){ // TX reset SR latches (LDPE, PRE = REF_EQ_CD_SR)
    const h=F.regH[a]; let r=null; for (let i=h.length-1;i>=0;i--){ if (h[i][0]>t) continue; if (h[i][1]&bit){ r=h[i][0]; break; } }
    if (r===null) return true;
    const pts=[r, ...evPoints(['cable0','cable1'], r, t), ...regChanges(0x0A,r,t), ...regChanges(0x1B,r,t)];
    return pts.some(p=>cdLatch(p)); }
  function curStd(t){ const s=sel(t); return rxLock(s,t)? fmtOf(s,t).std : 0; }
  function siLocked(t){ let ic=null, rs=-1e9; for (const x of F.si.icals) if (x.t<=t) ic=x; for (const r of F.si.rsts) if (r<=t) rs=r;
    return !!ic && ic.t>rs && t>=ic.t+T_ICAL && ic.std===curStd(t) && ic.std!==0; }
  function txActive(t){ return configured(t) && !srSet(0x25,1,t) && !srSet(0x2D,2,t) && !srSet(0x2D,1,t) && !srSet(0x1B,1,t) && siLocked(t); }
  function grSel(g,t){ return (regAt(0x2A,t) >> (g===1?0:2)) & 3; }
  function presCond(g,t){
    const s=sel(t); if (!rxLock(s,t)) return false; const f=fmtOf(s,t); if (f.std===4) return false;
    if (regAt(0x2C,t)&1) return false;                           // DMX_GR1_RESET resets both demux cores
    return !!((world(t).gm[s] >> grSel(g,t)) & 1); }
  function presSince(g,t){ const s=sel(t); return Math.max(rxSince(s,t)+T_RXLOCK, lastChange(0x2C,1,t), lastChange(0x2A, g===1?3:12, t), lastChange(0x1B,128,t), lastEv(['gm'+s,'fmt'+s,'cable'+s],t)); }
  function grPres(g,t){
    if (!configured(t)) return false;
    const s=sel(t), f=fmtOf(s,t); const W = (f.std===1? 8192 : 65536)/MCLK;   // sd_demux_top PRESENT_COUNT / hd detect_count
    const ws = Math.floor(t/W)*W;
    return presCond(g,t) && presCond(g,ws-W*0.5) && presSince(g,t) <= ws - W; }
  F.read = (a,t)=>{
    switch(a){
      case 0x04: return 1;
      case 0x07: return 0;
      case 0x09: { const l=F.cdLatch(t)?1:0; return l|(l<<1); }       // eq_1_cd and eq_2_cd are both wired to REF_EQ_CD_SR
      case 0x0D: return rxStat1(0,t); case 0x13: return rxStat1(1,t);
      case 0x0E: case 0x14: { const i=a===0x0E?0:1; if(!rxLock(i,t)) return 0; const f=fmtOf(i,t); return (f.rate<<4)|f.fam; }
      case 0x0F: case 0x15: { const i=a===0x0F?0:1; return rxLock(i,t)? fmtOf(i,t).vpid : 0; }
      case 0x19: return (rxLock(0,t)?1:0)|(rxLock(1,t)?2:0);
      case 0x24: return (rxLock(0,t)?1:0)|(rxLock(1,t)?2:0)|(F.txActive(t)?4:0);
      case 0x26: return (grPres(1,t)?1:0)|(grPres(2,t)?2:0);
      case 0x27: case 0x28: case 0x29: return 0;                       // hd_demux_stat2..4 never updated (inputs commented out)
      default: return regAt(a,t);
    } };
  F.write = (a,v,t)=>{ if ([0,1,4,7,9,0x0D,0x0E,0x0F,0x10,0x11,0x12,0x13,0x14,0x15,0x16,0x17,0x18,0x19,0x24,0x26,0x27,0x28,0x29].includes(a)) return;
    F.regH[a].push([t, v&255]); if (a===0x06 && (v&1)) F.si.rsts.push(t); };
  F.siRead = (addr,t)=> addr===130 ? (siLocked(t)?0:1) : (F.si.regs[addr]||0);
  F.siWrite = (addr,v,t)=>{ F.si.regs[addr]=v; if (addr===136 && (v&0x40)) F.si.icals.push({t, std:F.si.pend}); };
  Object.assign(F, {regAt, sel, rxLock, rxStat1, cdLatch, srSet, siLocked, txActive, grPres, grSel, curStd, configured, fmtOf, refOn, lastDone});
  st.F = F;

  /* ---------- MCU ---------- */
  const M = { input:0, pInput:0xFF, cableCd:0, cableCounter:0, vidStandard:0, pStandard:0, rxLockCounter:0, iCal:0, txClock:0, txClockCounter:0,
    unlock_counter:D.ucStart, lock3gb:0, gr1Audio:0, gr2Audio:0, a1:0, a2:0, group1:0, group2:1, pGroup1:0xFF, pGroup2:0xFF, pair1:0, pair2:0, pPair1:0xFF, pPair2:0xFF,
    audio_select1:0, audio_swap1:0, input_select1:0, uart_byte1:0, uart_rx_data0:0, uart_rx_data1:0, uart0_tx_data:0, tcnt0:0, timerOn:false, timerStart:0 };
  const c = { t:0, op:null, pass:-1 };
  const snap = ()=>({ input:M.input, cableCd:M.cableCd, cableCounter:M.cableCounter, vidStandard:M.vidStandard, rxLockCounter:M.rxLockCounter, iCal:M.iCal, txClock:M.txClock, txClockCounter:M.txClockCounter,
    unlock_counter:M.unlock_counter, gr1Audio:M.gr1Audio, gr2Audio:M.gr2Audio, a1:M.a1, a2:M.a2, group1:M.group1, group2:M.group2, pair1:M.pair1, pair2:M.pair2, audio_select1:M.audio_select1, input_select1:M.input_select1 });
  function begin(step, label){ uartUpTo(c.t); c.op = {step, label, t0:c.t, t1:c.t, pass:c.pass, x0:st.xf.length, s:snap()}; st.ops.push(c.op); }
  function end(){ c.t += OVH_T; c.op.t1 = c.t; c.op.x1 = st.xf.length; }
  function xRead(a, fn){ const t0=c.t; const v=F.read(a, t0+XFER_T*0.5); st.xf.push({t0, t1:t0+XFER_T, a, rw:1, v, fn}); c.t+=XFER_T; return v; }
  function xWrite(a, v, fn){ const t0=c.t; st.xf.push({t0, t1:t0+XFER_T, a, rw:0, v:v&255, fn}); c.t+=XFER_T; F.write(a, v, t0+XFER_T); }
  function rmw(a, set, clr, fn){ const r=xRead(a, fn); xWrite(a, ((r&~clr)|set)&255, fn); }
  function wait(n){ c.t += n*WAIT_CYC/F_CPU; }
  function sspiRead(addr, fn){ xWrite(0x05,1,fn+' → sspiSelect(SI5324_1)'); const t0=c.t; c.t+=4*SSPI_BYTE_T; const v=F.siRead(addr,c.t); st.ss.push({t0,t1:c.t,addr,rw:1,v,fn}); xWrite(0x05,0,fn+' → sspiSelect(SI5324_NON)'); return v; }
  function sspiWrite(addr, v, fn){ xWrite(0x05,1,fn+' → sspiSelect(SI5324_1)'); const t0=c.t; c.t+=4*SSPI_BYTE_T; F.siWrite(addr,v,c.t); st.ss.push({t0,t1:c.t,addr,rw:0,v,fn}); xWrite(0x05,0,fn+' → sspiSelect(SI5324_NON)'); }
  function siRmw(addr, f, fn){ const r=sspiRead(addr, fn); sspiWrite(addr, f(r)&255, fn); }
  function led(name, on){ const h=st.leds[name]; if (h[h.length-1][1]!==(on?1:0)) h.push([c.t, on?1:0]); }

  /* UART (ISR side, runs between main-loop statements) */
  const rxBytes = [];
  if (true){ let wasOn=false, cnt=0;
    for (let t=0.0137, HP=hostPeriod(); t<END; t+=HP){ const w=world(t); if (!w.host.on){ wasOn=false; cnt=0; continue; } if (!wasOn){ cnt=0; wasOn=true; }
      const frame = cnt<2 ? [0xE8,0x08] : [w.host.cmd, 0x70]; cnt++;
      frame.forEach((b,i)=> rxBytes.push({t:t+(i+1)*UART_BYTE, b})); } }
  let rxi = 0;
  function uartUpTo(t){
    while (rxi < rxBytes.length && rxBytes[rxi].t <= t){ const e=rxBytes[rxi++]; if (!F.alive) continue;
      st.uart.push({t0:e.t-UART_BYTE, t1:e.t, dir:'rx', b:e.b});
      // uart0_rx_isr → processUart()
      M.uart_rx_data0 = e.b; let reply=null, tc=0;
      if (!M.uart_byte1){ if (e.b & 0x80){ M.uart_rx_data1=e.b; M.uart_byte1=1; } }
      else if (!(e.b & 0x80)){ M.uart_byte1=0; const cmd=M.uart_rx_data1;
        if (cmd===0xFF){} else if (cmd===0xE8){ reply=0xE0; tc=30; st.notes.push({t:e.t, txt:'processUart: 0xE8 “is demux present?” → uart0_tx_data = 0xE0, TCNT0 = 30'}); }
        else if ((cmd&0xE0)===0xE0){ M.audio_select1=cmd&6; M.audio_swap1=cmd&1; M.input_select1=cmd&16;
          reply = M.vidStandard===0 ? 0x02 : 0x00;
          if (D.build!=='XTM4' && M.vidStandard!==0 && M.gr1Audio===0) reply |= 0x3C;     // AMS4-Add (commented out in XTM4 build)
          tc=0; }
      } else { M.uart_rx_data0=0; M.uart_rx_data1=0; M.uart_byte1=0; }
      if (reply!==null){ const tm = e.t + (34-tc+1)*TICK0; st.uart.push({t0:tm, t1:tm+UART_BYTE, dir:'tx', b:reply}); }
    } }

  /* ---------- main() boot ---------- */
  function bootMain(){
    F.alive = true;
    begin('B0','main(): CLI · initWatchDog (WDTCR=0x0B) · initPorts (PORTB=0xFF) · initLeds · initUartControlPin · initTimer0 · initUart0 · initXilinxPins · SEI');
    led('sdi',0); led('gr1',0); led('gr2',0); c.t += 0.0003; end();
    begin('B1','Failure Test: enableFpga · wait(1000) · disableFpga (PD0=1 → Q1 pulls CONF_PROG_B low) · wait(10000) · enableFpga · wait(5000)');
    wait(1000); const progLow=c.t; wait(10000); const rel=c.t; wait(5000); end();
    st.cfg.push({t0: st.cfg.length||D.scn!=='boot' ? progLow : 0, t1:rel+CFG_T}); F.doneAt = rel + CFG_T; regReset(progLow);
    F.si.rsts.push(progLow); F.si.regs={};
    begin('B2','while (!isFpgaReady()) WDR();  — Spartan-6 loads 1 485 512 bytes from the M25P16 (PG3 = CONF_DONE)');
    c.t = Math.max(c.t, F.doneAt); end();
    begin('B3','initXSpi(): X_RESET_ASSERT (PC0 = ALTERA0 = SPI_RESET_N) · wait(10) · X_RESET_CLEAR · initSSpiSclk');
    wait(10); regReset(c.t); c.t += 0.0001; end();
    begin('B4','initSi5335(): si5335SetFsPlan(0) · SetAudioClock(DISABLE) · SetRxRefClk2/1(ENABLE) · si5335Reset');
    rmw(0x08,0,16,'si5335SetFsPlan(0)'); rmw(0x08,2,0,'si5335SetAudioClock(DISABLE) → OEB0=1'); rmw(0x08,0,4,'si5335SetRxRefClk2(ENABLE)'); rmw(0x08,0,8,'si5335SetRxRefClk1(ENABLE)');
    si5335Reset(); end();
    begin('B5','initSi5324(1): si5324Reset · SetOutLevel(LVDS) · SetClockSelector · SetManualClock · SetInBuf · SelectInput · EnOuts · SetC1B · SetLockT(1) · SetFastLock');
    initSi5324(); end();
    begin('B6','initExAes(): setAudGrpInOut(EX_AUD_GRP1/2, AES_OUTPUT) → BNC4/BNC5 driven by DS34LV87T');
    for (const [a,b] of [[0x0B,1],[0x0B,4]]){ rmw(a,0,b,'setGrpOneOutput/setGrpTwoOutput: '+(b===1?'Q2_ON=0':'Q4_ON=0')); rmw(0x0C,0,b===1?1:2,'GRP_IN_EN=0'); rmw(0x0C,b===1?16:32,0,'GRP_OUT_EN=1'); }
    end();
    Object.assign(M, {input:0, pInput:0xFF, cableCd:0, cableCounter:0, vidStandard:0, pStandard:0, rxLockCounter:0, iCal:0, txClock:0, txClockCounter:0, unlock_counter:0, lock3gb:0, gr1Audio:0, gr2Audio:0, a1:0, a2:0, group1:0, group2:1, pGroup1:0xFF, pGroup2:0xFF, pair1:0,pair2:0,pPair1:0xFF,pPair2:0xFF, audio_select1:0, input_select1:0});
  }
  function si5335Reset(){ rmw(0x08,0,1,'si5335Reset: make sure reset is not asserted'); wait(1000); rmw(0x08,1,0,'si5335Reset: assert'); wait(1000); rmw(0x08,0,1,'si5335Reset: release'); }
  function initSi5324(){
    rmw(0x06,0,1,'si5324Reset'); wait(1000); rmw(0x06,1,0,'si5324Reset: assert'); wait(1000); rmw(0x06,0,1,'si5324Reset: release'); wait(1000);
    siRmw(6, r=>(r|0x39)&~6, 'si5324SetOutLevel (reg 6: out2 LVDS, out1 off)');
    siRmw(21, r=>r&~3, 'si5324SetClockSelector (reg 21)'); siRmw(4, r=>r&~0xC0, 'si5324SetManualClock (reg 4)');
    siRmw(11, r=>(r|2)&~1, 'si5324SetInBuf (reg 11)'); siRmw(3, r=>(r&~0xC0)|16, 'si5324SelectInput (reg 3, SQ_ICAL)');
    siRmw(10, r=>(r&~8)|4, 'si5324EnOuts (reg 10)'); siRmw(20, r=>(r|4)&~1, 'si5324SetC1B (reg 20)');
    siRmw(19, r=>(r&~7)|1, 'si5324SetLockT(1) (reg 19)'); siRmw(137, r=>r|1, 'si5324SetFastLock (reg 137)');
  }
  const PLL = {3:{bw:10,n1:2,nc1:[0,0,0x0B],nc2:[0,0,5],n2hs:6,n2ls:[0,1,0x0D],n31:[0,0,0x4A]}, 2:{bw:10,n1:2,nc1:[0,0,0x0B],nc2:[0,0,0x0B],n2hs:4,n2ls:[0,1,0x55],n31:[0,0,0x25]}, 1:{bw:10,n1:5,nc1:[0,0,0x15],nc2:[0,0,3],n2hs:3,n2ls:[0,1,0x8B],n31:[0,0,0x0D]}};
  function setupPll(std){
    const p=PLL[std]; F.si.pend=std; if (!p){ return; }
    siRmw(2, r=>(r&0x0F)|(p.bw<<4), 'si5324SetBW(10)'); siRmw(25, r=>(r&~0xE0)|(p.n1<<5), 'si5324SetN1HS');
    siRmw(31, r=>(r&~0x0F)|p.nc1[0], 'si5324SetNC1LS'); sspiWrite(32,p.nc1[1],'si5324SetNC1LS'); sspiWrite(33,p.nc1[2],'si5324SetNC1LS');
    siRmw(34, r=>(r&~0x0F)|p.nc2[0], 'si5324SetNC2LS'); sspiWrite(35,p.nc2[1],'si5324SetNC2LS'); sspiWrite(36,p.nc2[2],'si5324SetNC2LS');
    siRmw(40, r=>(r&~0xE0)|(p.n2hs<<5), 'si5324SetN2HS'); siRmw(40, r=>(r&~0x0F)|p.n2ls[0], 'si5324SetN2LS (reg 40 again)'); sspiWrite(41,p.n2ls[1],'si5324SetN2LS'); sspiWrite(42,p.n2ls[2],'si5324SetN2LS');
    siRmw(43, r=>(r&~7)|p.n31[0], 'si5324SetN31'); sspiWrite(44,p.n31[1],'si5324SetN31'); sspiWrite(45,p.n31[2],'si5324SetN31');
    siRmw(136, r=>r|0x40, 'si5324Ical (reg 136 bit 6 = ICAL)');
  }

  /* ---------- steady-state start: as if the loop had been running for a long time ---------- */
  function steadyStart(){
    const w=world(-1e-9); F.doneAt=-1e9;
    const hcmd = (host && w.host.on)? w.host.cmd : 0;
    const input = host ? ((hcmd&16)?0:1) : (pinb(w)&1);
    const set=(a,v)=>F.regH[a].push([-1e8,v]);
    set(0x08, input?8:4); set(0x0B,0); set(0x0C,0x30); set(0x0A,0); F.regH[0x0A].push([-5e7,4],[-4e7,0]);
    set(0x1B, input?128:0);
    const std = (w.cable[input]? VF[w.fmt[input]].std : 0);
    const g1 = host? (hcmd&6)>>1 : saGrp(w,1), g2 = host? ((hcmd&6)>>1)+1 : saGrp(w,2), p1 = host?0:saPair(w,1), p2=host?0:saPair(w,2);
    set(0x2A, (g1&3)|((g2&3)<<2));
    const gsel = g => (g===1? g1 : g2) & 3;
    const lockedStd = (std===4)? 0 : std;
    set(0x2C, lockedStd? 0:1); set(0x25,0); set(0x2D,0); F.regH[0x25].push([-3e7,1],[-2.9e7,0]); F.regH[0x2D].push([-3e7,3],[-2.9e7,0]); F.regH[0x1B].push([-3e7,(input?128:0)|1],[-2.9e7,input?128:0]);
    F.si.rsts.push(-2e7); if (lockedStd) F.si.icals.push({t:-1e7, std:lockedStd}); F.si.pend=lockedStd;
    const pres = g => lockedStd && ((w.gm[input]>>gsel(g))&1);
    set(0x2E, (pres(1)?0:2)|(pres(2)?0:4)|(p1?1:0)|(p2?8:0));
    Object.assign(M, {input, pInput:input, cableCd:w.cable[input]?1:0, cableCounter:w.cable[input]?DEB.cable:0, vidStandard:lockedStd, pStandard:lockedStd, rxLockCounter:lockedStd?DEB.sdi:0,
      iCal:0, txClock:lockedStd?1:0, txClockCounter:lockedStd?DEB.clock:0, gr1Audio:pres(1)?1:0, gr2Audio:pres(2)?1:0, a1:pres(1)?DEB.audio:0, a2:pres(2)?DEB.audio:0,
      group1:g1, group2:g2, pGroup1:g1, pGroup2:g2, pair1:p1, pair2:p2, pPair1:p1, pPair2:p2, input_select1: host? 0:0, audio_select1:0 });
    st.leds.sdi.push([-1e8, lockedStd?1:0]); st.leds.gr1.push([-1e8, pres(1)?1:0]); st.leds.gr2.push([-1e8, pres(2)?1:0]);
    if (host){ M.audio_select1=hcmd&6; M.input_select1=hcmd&16; }
  }

  /* ---------- one pass of while(1) in demux4.c ---------- */
  function pass(){
    c.pass++; const p={i:c.pass, t0:c.t, kind:'loop'}; st.passes.push(p);
    begin(0,'WDR()'); end();
    begin(1,'cableCd = getEqCD(input)'); let cd = (xRead(0x09,'getEqCD → xRead(X_REG_CABLE_STAT 0x09)') & (M.input? 2:1)) ? 0 : 1; end();
    if (M.input !== M.pInput){
      begin(2,'input != pInput → selectInput · assertSetEqCdSr · clearSetEqCdSr · setupSi5335(input)');
      cd = 0; rmw(0x1B, M.input?128:0, M.input?0:128, 'selectInput → TX1_STREAM_SELECT');
      rmw(0x0A,16,0,'assertSetEqCdSr'); rmw(0x0A,0,16,'clearSetEqCdSr');
      rmw(0x08,0,16,'setupSi5335 → si5335SetFsPlan(0)'); rmw(0x08,2,0,'si5335SetAudioClock(DISABLE)');
      if (M.input===0){ rmw(0x08,4,0,'si5335SetRxRefClk2(DISABLE)'); rmw(0x08,0,8,'si5335SetRxRefClk1(ENABLE)'); }
      else { rmw(0x08,8,0,'si5335SetRxRefClk1(DISABLE)'); rmw(0x08,0,4,'si5335SetRxRefClk2(ENABLE)'); }
      si5335Reset(); end();
    }
    M.pInput = M.input;
    begin(3,'cableCd = debounceCableCd(cableCd)  (CABLE_DEBOUNCE_VAL 15)');
    if (!cd){ M.cableCounter=0; M.cableCd=0; } else { if (M.cableCounter<DEB.cable){ M.cableCounter++; M.cableCd=0; } else M.cableCd=1; }
    if (!M.cableCd){ rmw(0x0A,4,0,'assertRstEqCdSr(RX1)'); rmw(0x0A,0,4,'clearRstEqCdSr(RX1)'); }
    end();
    begin(4,'vidStandard = getVidStandard(input)');
    const sa = M.input? 0x13:0x0D, nm = M.input? 'X_REG_RX2_STAT1 0x13':'X_REG_RX1_STAT1 0x0D';
    let std = 0; let r = xRead(sa,'getRxModeLocked → xRead('+nm+')');
    if (r&1){ r=xRead(sa,'getRxSdModeLocked'); if (r&2) std=1; else { r=xRead(sa,'getRxHdModeLocked'); if (r&4) std=2; else { r=xRead(sa,'getRx3gModeLocked'); if (r&8){ r=xRead(sa,'getRx3gbLock'); std = (r&32)? 4:3; } else std=-1; } } }
    if (std===-1) std = M.vidStandard;    // uninitialised local "standard" in getVidStandard (see Findings)
    end();
    begin(5,'cableCd UNLOCKED → vidStandard = UNLOCKED · LOCK_3GB → UNLOCKED · debounceVidStandard (30) · unlock_counter');
    if (!M.cableCd){ std=0; M.lock3gb=1; } else M.lock3gb=0;
    if (std===4) std=0;
    if (!std){ M.rxLockCounter=0; M.vidStandard=0; } else { if (M.rxLockCounter<DEB.sdi){ M.rxLockCounter++; M.vidStandard=0; } else M.vidStandard=std; }
    if (!M.vidStandard && M.cableCd && !M.lock3gb) M.unlock_counter++;
    end();
    if (M.unlock_counter > 1000){
      begin(5,'unlock_counter > 1000 → unlock_counter = 0; while(1);  // get a watchdog reset');
      M.unlock_counter=0; const t0=c.t; c.t += WDT_T; st.wdtSpins.push({t0, t1:c.t}); end(); p.t1=c.t; p.kind='wdt';
      st.resets.push({t:c.t, why:'watchdog (unlock_counter > 1000)'}); F.alive=false;
      led('sdi',0); led('gr1',0); led('gr2',0);
      bootMain(); return;
    }
    begin(6, M.vidStandard? 'SDI locked: clearDemuxReset(1) (not SD) · setSdiLed(ON)' : 'SDI unlocked: setDemuxReset(1) · setAesGenReset(1) · setAesGenReset(2) · iCal = NO · setSdiLed(OFF)');
    if (!M.vidStandard){ rmw(0x2C,1,0,'setDemuxReset(1) → X_REG_DEMUX_CTRL3'); rmw(0x2E,2,0,'setAesGenReset(1) → RST_GR1_AES'); rmw(0x2E,4,0,'setAesGenReset(2) → RST_GR2_AES'); M.iCal=0; led('sdi',0); }
    else { if (M.vidStandard!==1) rmw(0x2C,0,1,'clearDemuxReset(1)'); led('sdi',1); }
    end();
    if (M.vidStandard && !M.pStandard){
      begin(7,'processLockStatus: new lock → initSi5324(1) · si5324SetupPll(1, '+STD_NAME[M.vidStandard]+') · iCal = YES');
      initSi5324(); setupPll(M.vidStandard); M.iCal=1; M.txClock=0; M.txClockCounter=0; end();
      st.notes.push({t:c.t, txt:'Si5324 retuned for '+STD_NAME[M.vidStandard]+' and ICAL started'});
    }
    M.pStandard = M.vidStandard;
    if (M.iCal){
      begin(8,'iCal: txClock = si5324GetLockStatus() (reg 130 LOL) · debounceTxClock (10)');
      const lol = sspiRead(130,'si5324GetLockStatus (reg 130)') & 1; const clk = lol? 0:1;
      if (!clk){ M.txClockCounter=0; M.txClock=0; } else { if (M.txClockCounter<DEB.clock){ M.txClockCounter++; M.txClock=0; } else M.txClock=1; }
      if (M.txClock){ M.iCal=0;
        rmw(0x2D,2,0,'setTxDcmReset'); rmw(0x2D,0,2,'clearTxDcmReset'); wait(100);
        rmw(0x25,1,0,'setTxGtpReset'); rmw(0x25,0,1,'clearTxGtpReset'); wait(100);
        rmw(0x2D,1,0,'setVidFifoReset'); rmw(0x2D,0,1,'clearVidFifoReset'); wait(10);
        rmw(0x1B,1,0,'setTxReset'); rmw(0x1B,0,1,'clearTxReset');
        if (M.vidStandard===1) rmw(0x2C,0,1,'clearDemuxReset(1) (SD waits for the TX clock)');
        c.op.label = 'iCal: Si5324 locked → release TX DCM, GTP, video FIFO, TX resets'+(M.vidStandard===1?' · clearDemuxReset(1)':'');
        st.notes.push({t:c.t, txt:'TX clock locked: SR latches cleared, SDI OUT (BNC3) running'});
      }
      end();
    }
    begin(9,'gr1Audio/gr2Audio = getAudioDetect(1/2) · debounceAudio1/2Detect (10)');
    const d1 = xRead(0x26,'getAudioDetect(1) → xRead(X_REG_HD_DEMUX_STAT1 0x26) & DMX_GR1_DETECTED') & 1;
    const d2 = (xRead(0x26,'getAudioDetect(2) → xRead(0x26) & DMX_GR2_DETECTED') >> 1) & 1;
    if (!d1){ M.a1=0; M.gr1Audio=0; } else { if (M.a1<DEB.audio){ M.a1++; M.gr1Audio=0; } else M.gr1Audio=1; }
    if (!d2){ M.a2=0; M.gr2Audio=0; } else { if (M.a2<DEB.audio){ M.a2++; M.gr2Audio=0; } else M.gr2Audio=1; }
    end();
    begin(10,'GR1: '+(M.gr1Audio?'clearAesGenReset(1) · setGr1Led(ON)':'setAesGenReset(1) · setGr1Led(OFF)')+' · GR2: '+(M.gr2Audio?'clearAesGenReset(2) · setGr2Led(ON)':'setAesGenReset(2) · setGr2Led(OFF)'));
    if (M.gr1Audio){ rmw(0x2E,0,2,'clearAesGenReset(1)'); led('gr1',1); } else { rmw(0x2E,2,0,'setAesGenReset(1)'); led('gr1',0); }
    if (M.gr2Audio){ rmw(0x2E,0,4,'clearAesGenReset(2)'); led('gr2',1); } else { rmw(0x2E,4,0,'setAesGenReset(2)'); led('gr2',0); }
    end();
    const w = world(c.t);
    if (!host){
      begin(11,'getAudioGroups(): group1/2 = getSaGrpSel(1/2) · pair1/2 = getSaPrSel(1/2)');
      M.group1=saGrp(w,1); M.group2=saGrp(w,2);
      if (M.pGroup1!==M.group1 || M.pGroup2!==M.group2){ c.op.label += ' → setDmxGroupSelect ×2';
        rmw(0x2A, M.group1&3, 3, 'setDmxGroupSelect(AUDIO_GROUP1, '+M.group1+')'); rmw(0x2A, (M.group2&3)<<2, 12, 'setDmxGroupSelect(AUDIO_GROUP2, '+M.group2+')'); }
      M.pGroup1=M.group1; M.pGroup2=M.group2;
      M.pair1=saPair(w,1); M.pair2=saPair(w,2);
      if (M.pPair1!==M.pair1 || M.pPair2!==M.pair2){ c.op.label += ' → set/clearSwapAes, set/clearSwapAes2';
        rmw(0x2E, M.pair1?1:0, M.pair1?0:1, M.pair1?'setSwapAes':'clearSwapAes'); rmw(0x2E, M.pair2?8:0, M.pair2?0:8, M.pair2?'setSwapAes2':'clearSwapAes2'); }
      M.pPair1=M.pair1; M.pPair2=M.pair2; end();
      begin(12,'getSelectedInput(): input = PINB & BIT0  (SW1-1)'); M.input = pinb(w)&1; end();
    } else {
      begin(11,'getAudioGroups(): group1 = audio_select1 >> 1 · group2 = group1 + 1 (UART)');
      M.group1 = M.audio_select1>>1; M.group2 = M.group1+1;
      if (M.pGroup1!==M.group1 || M.pGroup2!==M.group2){ c.op.label += ' → setDmxGroupSelect ×2';
        rmw(0x2A, M.group1&3, 3, 'setDmxGroupSelect(AUDIO_GROUP1, '+M.group1+')'); rmw(0x2A, (M.group2&3)<<2, 12, 'setDmxGroupSelect(AUDIO_GROUP2, '+M.group2+' & 0x03)'); }
      M.pGroup1=M.group1; M.pGroup2=M.group2; end();
      begin(12,'getSelectedInput(): input = input_select1 ? RX1 : RX2 (UART)'); M.input = M.input_select1? 0:1; end();
    }
    p.t1 = c.t;
  }

  if (D.scn==='boot') bootMain();
  else { steadyStart(); if (D.scn==='plug'){ /* world handles the cable */ } }
  let guard=0;
  while (c.t < END && guard++ < 6000) pass();
  uartUpTo(END+1);
  st.end = END; st.M = M;
  /* replace the slow history scans by piecewise-constant tables (same logic, evaluated once) */
  const pts = [...new Set([0,-1e9, ...D.ev.map(e=>e.t), ...F.regH[0x0A].map(x=>x[0]), ...F.regH[0x1B].map(x=>x[0]), ...F.regH[0x25].map(x=>x[0]), ...F.regH[0x2D].map(x=>x[0]), ...st.cfg.flatMap(c=>[c.t0,c.t1])])].filter(x=>x>-1e9-1).sort((a,b)=>a-b);
  const tbl = (fn)=>{ const out=[]; let st0=null; for (const p of pts){ const v=fn(p, out.length? out[out.length-1][1] : 1); if (v!==st0){ out.push([p,v]); st0=v; } } return out; };
  const look = (tb,t,def)=>{ let lo=0, hi=tb.length-1, r=-1; while (lo<=hi){ const m=(lo+hi)>>1; if (tb[m][0]<=t){ r=m; lo=m+1; } else hi=m-1; } return r<0? def : tb[r][1]; };
  const LT = tbl((p,prev)=> (cdPre(p) || !configured(p)) ? 1 : ((regAt(0x0A,p)&4) ? 0 : prev));
  const fastLatch = t => look(LT,t,1)===1;
  const srTbl = (a,bit)=> tbl((p,prev)=> fastLatch(p) ? 1 : ((regAt(a,p)&bit) ? 0 : prev));
  const SRT = {['25_1']:srTbl(0x25,1), ['2D_2']:srTbl(0x2D,2), ['2D_1']:srTbl(0x2D,1), ['1B_1']:srTbl(0x1B,1)};
  F.cdLatch = fastLatch;
  F.srSet = (a,bit,t)=> look(SRT[hex(a)+'_'+bit], t, 1)===1;
  F.txActive = t => configured(t) && !F.srSet(0x25,1,t) && !F.srSet(0x2D,2,t) && !F.srSet(0x2D,1,t) && !F.srSet(0x1B,1,t) && siLocked(t);
  return st;
}

/* ---------------- schedule queries ---------------- */
function bs(arr, t, key){ let lo=0, hi=arr.length-1, r=-1; while (lo<=hi){ const m=(lo+hi)>>1; if (arr[m][key||'t0']<=t){ r=m; lo=m+1; } else hi=m-1; } return r; }
function opAt(t){ const s=sched(); const i=bs(s.ops,t); return i<0? null : s.ops[i]; }
function xferAt(t){ const s=sched(); const i=bs(s.xf,t); if (i<0) return null; const x=s.xf[i]; return t<x.t1? x : null; }
function ledAt(name,t){ const h=sched().leds[name]; let v=0; for (const [tt,vv] of h){ if (tt>t) break; v=vv; } return v; }
function inCfg(t){ return sched().cfg.some(c=>t>=c.t0 && t<c.t1); }
function inSpin(t){ return sched().wdtSpins.some(c=>t>=c.t0 && t<c.t1); }
function mcuAlive(t){ return !inSpin(t); }
function selIn(t){ return sched().F.sel(t); }

/* ---------------- audio model ---------------- */
const SRC_LEVEL = 0.25;                       // −12 dBFS test tones in the simulated SDI source (not from the archive)
const chFreq = ch => 200*ch;                  // embedded channel n carries a 200·n Hz tone — simulation choice
function outMap(k, t){ // AUDIO1..4 → {group(0-3), channels[2]} after par_aud_8of32_sel + swap_audio
  const F=sched().F, r=F.regAt(0x2E,t); const sw1=r&1, sw2 = BUILD[D.build].host? 0 : (r&8);
  const g = (k<2)? F.grSel(1,t) : F.grSel(2,t); const sw = k<2? sw1 : sw2;
  const first = ((k%2===0) !== !!sw) ? [1,2] : [3,4];
  return {g, ch: first.map(cc=> g*4+cc)};
}
function outActive(k,t){ const F=sched().F; const gr = k<2?1:2; if (!F.configured(t)) return false; if (!F.grPres(gr,t)) return false; return !(F.regAt(0x2E,t) & (gr===1?2:4)); }
function bncOut(n){ return BUILD[D.build].host ? (n===4?0:1) : (n===4?0:2); }      // BNC4 ← AUDIO1; BNC5 ← AUDIO3 (SA) / AUDIO2 (V020000)
function outSample(k, side, t){
  if (!outActive(k,t)) return null;
  const m = Math.floor((t-AES_PHASE)*48000); const ts = m/48000 - LAT; const mp=outMap(k,t); const ch = mp.ch[side];
  const s = selIn(t); const gm = world(ts).gm[s]; if (!((gm>>mp.g)&1)) return 0;
  return SRC_LEVEL*Math.sin(2*Math.PI*chFreq(ch)*ts);
}

/* ---------------- SDI line / HANC model ---------------- */
function curFmt(t){ const w=world(t); return VF[w.fmt[selIn(t)]]; }
function lineT(f){ return 1/(f.fr*f.lines); }
function lineHasNoPkt(f, ln){ return f.sw.some(s=> ln===s+1); }       // no audio data packets on the line after the switching line (simplified)
function lineSamples(f, n){ // samples whose instant falls in line n-1 are carried in line n (simplified)
  const Tl=lineT(f); const ln=(n % f.lines)+1;
  if (lineHasNoPkt(f, ln)) return [];
  let a=Math.ceil((n-1)*Tl*48000-1e-9), b=Math.ceil(n*Tl*48000-1e-9);
  const prevLn = ((n-1) % f.lines)+1; if (n>0 && lineHasNoPkt(f, prevLn)) a=Math.ceil((n-2)*Tl*48000-1e-9);
  const out=[]; for (let k=Math.max(0,a); k<b; k++) out.push(k); return out;
}
function linePackets(f, n, gm){ // [{g, w0, w1, samples}] word offsets from EAV
  const smp = lineSamples(f,n); if (!smp.length) return [];
  const out=[]; let w = f.hdr;
  for (let g=0; g<4; g++){ if (!((gm>>g)&1)) continue;
    if (f.std===1){ const len=7+12*smp.length; out.push({g, w0:w, w1:w+len, samples:smp}); w+=len; }
    else for (const k of smp){ out.push({g, w0:w, w1:w+31, samples:[k]}); w+=31; } }
  return out;
}

/* ---------------- user actions ---------------- */
function act(name, fn){
  D.lastTrace=[]; const tr=s=>D.lastTrace.push(s);
  fn(tr); sched();
  D.log.unshift({t:SIM.t, abs:absT(), name, trace:D.lastTrace.slice()}); if (D.log.length>60) D.log.length=60;
  SIM.refresh();
}
function after(t, pred, arr){ return arr.find(x=> x.t0 >= t && pred(x)); }
function consequence(tr, t0){
  const s=sched();
  const ledCh = (n)=>{ const h=s.leds[n]; const e=h.find(x=>x[0]>t0); return e? `${n.toUpperCase()} LED → ${e[1]?'ON':'OFF'} at +${SIM.fmtDur(e[0]-t0)}` : null; };
  const l = ['sdi','gr1','gr2'].map(ledCh).filter(Boolean);
  if (l.length) tr('Model result: '+l.join(' · '));
  else tr('Model result: no LED change before the end of this scenario ('+SIM.fmtDur(s.end-page0())+' window). Try another page of the timeline.');
}
const A = {
  dip(i){ act(`SW1-${i+1} → ${world(absT()).dip[i]?'OFF':'ON'}`, tr=>{
    const w=world(absT()); const d=w.dip.slice(); d[i]=!d[i]; addEv('dip', d); const w2=world(absT()); const t0=absT();
    tr(`SW1-${i+1} ${d[i]?'closes: PB'+i+' is pulled to GND':'opens: PB'+i+' floats high on its pull-up (PORTB = 0xFF, DDRB = 0x00 in initPorts)'} → PINB = 0x${hex(pinb(w2))}`);
    if (BUILD[D.build].host){ tr(`This is the ${BUILD[D.build].name}: getAudioGroups() takes the selection from the UART (audio_select1), so PORTB is never read. The switch does nothing.`); return; }
    if (i===0) tr(`getSelectedInput(): input = PINB & BIT0 = ${pinb(w2)&1} → ${pinb(w2)&1?'RX2 (BNC2)':'RX1 (BNC1)'}. Next pass: input != pInput → selectInput() writes TX1_STREAM_SELECT (0x1B bit 7), assertSetEqCdSr()/clearSetEqCdSr() force the cable latch, setupSi5335() swaps RX_REF_CLK1/2 and resets the Si5335. cableCd is forced UNLOCKED, so all debouncing starts again.`);
    else if (i===1||i===2) tr(`getAudioGroups() → getSaGrpSel(1): !(PINB & BIT2) adds 1, !(PINB & BIT1) adds 2 → group1 = ${saGrp(w2,1)} (Group ${saGrp(w2,1)+1}). group1 != pGroup1 → setDmxGroupSelect(AUDIO_GROUP1, ${saGrp(w2,1)}): xRead(0x2A), clear bits 1:0, set ${saGrp(w2,1)}, xWrite(X_REG_DEMUX_CTRL1 0x2A).`);
    else if (i===4||i===5) tr(`getAudioGroups() → getSaGrpSel(2): !(PINB & BIT5) adds 1, !(PINB & BIT4) adds 2 → group2 = ${saGrp(w2,2)} (Group ${saGrp(w2,2)+1}) → setDmxGroupSelect(AUDIO_GROUP2, ${saGrp(w2,2)}) writes bits 3:2 of 0x2A.`);
    else if (i===3) tr(`getSaPrSel(1) = ${saPair(w2,1)} → ${saPair(w2,1)?'setSwapAes()':'clearSwapAes()'}: read-modify-write of X_REG_INT_AES_CTRL 0x2E bit 0 (SWAP_AES). In the FPGA swap_audio SWAP_CH13/SWAP_CH24 exchange ch1↔ch3 and ch2↔ch4, so AES BNC4 carries pair ${saPair(w2,1)?'3/4':'1/2'} of GR1.`);
    else if (i===6) tr(`getSaPrSel(2) = ${saPair(w2,2)} → ${saPair(w2,2)?'setSwapAes2()':'clearSwapAes2()'}: 0x2E bit 3 (SWAP_AES2, “Stand-Alone-Add”). SWAP_CH57/SWAP_CH68 swap the pairs of GR2 on AES BNC5.`);
    else tr('PB7 is not read by any function in V020401: SW1-8 is spare.');
    if (i>0 && i<7) tr('The FPGA demux restarts its group-present window (HD: 65 536 MCLK = 5.33 ms; SD: 8 192 MCLK = 0.67 ms); debounceAudio1/2Detect then needs 10 passes before clearAesGenReset + LED ON.');
    consequence(tr, t0);
  }); },
  cable(i){ const on=!world(absT()).cable[i]; act(`${on?'Plug':'Unplug'} SDI into BNC${i+1}`, tr=>{
    addEv('cable'+i, on); const t0=absT(); const s=sched(), sel=s.F.sel(t0);
    tr(`LMH0394 U${i?9:2} ${on?'detects carrier: SDI_EQ'+(i+1)+'_CD goes low':'loses carrier: SDI_EQ'+(i+1)+'_CD goes high'} (FPGA pin ${i?'F14':'F7'}).`);
    if (i!==sel) tr(`BNC${i+1} is not the selected stream (TX1_STREAM_SELECT = ${sel}); REF_EQ_CD only follows RX${sel+1}, so the firmware does not react.`);
    else if (!on){ tr('FPGA: REF_EQ_CD presets the LDPE EQ_CD_SR latch at once; EQ_CD_SR presets DCM_RESET_SR, GTP_GTPRESET_IN_SR, VID_FIFO_RST_SR and RESET_SR → SDI OUT (BNC3) stops immediately, without software.');
      tr('Next pass: getEqCD() reads cable_stat (0x09) = latched → cableCd = UNLOCKED → vidStandard forced UNLOCKED → setDemuxReset(1), setAesGenReset(1/2), setSdiLed(OFF). Every following pass pulses assertRstEqCdSr/clearRstEqCdSr to try to clear the latch.'); }
    else tr('The latch clears on the next assertRstEqCdSr pulse; debounceCableCd needs 15 good passes, then debounceVidStandard 30 more, then processLockStatus() reprograms the Si5324 and waits for ICAL + 10 debounced lock reads before it releases the TX resets.');
    consequence(tr, t0);
  }); },
  fmt(i,f){ act(`Source on BNC${i+1} → ${VF[f].name}`, tr=>{ addEv('fmt'+i, f); const t0=absT();
    tr(`The XAPP1076 triple-rate receiver (triple_sdi_rx_autorate) loses lock and searches again (${SIM.fmtDur(T_RXLOCK)}, ${inf}).`);
    tr(`rx${i+1}_stat1 will read ${STD_NAME[VF[f].std]} (mode bits SD/HD/3G, bit 4 M=${VF[f].m?'1/1.001':'1'}, bit 5 level B=${VF[f].std===4?1:0}).`);
    if (VF[f].std===4) tr('main(): “if (vidStandard == LOCK_3GB) vidStandard = UNLOCKED;  //disable 3G level B for now”. With the cable still locked, unlock_counter now climbs every pass; at 1001 the loop does while(1) and the watchdog resets the MCU (Findings).');
    else tr('If the change is seen as unlock → lock, processLockStatus() calls initSi5324(1) and si5324SetupPll(1, standard) with that standard’s N1_HS/NC1_LS/N2/N31 dividers, then ICAL.');
    consequence(tr, t0); }); },
  groups(i,mask){ act(`Embedded groups on BNC${i+1} → ${[1,2,3,4].filter(g=>(mask>>(g-1))&1).join(',')||'none'}`, tr=>{ addEv('gm'+i, mask); const t0=absT();
    tr(`The source now carries audio data packets for group(s) ${[1,2,3,4].filter(g=>(mask>>(g-1))&1).join(', ')||'— none'} (HD DIDs ${DID.hd.filter((d,g)=>(mask>>g)&1).join(' ')||'—'}).`);
    tr('audio_det / sd_aes_present_flags set the group-present latch only when a packet with the selected DID arrives; group_pres is re-sampled every detect window.');
    consequence(tr, t0); }); },
  host(on){ act(on?'Connect host on P8 (RS-485)':'Disconnect host', tr=>{ const w=world(absT()); addEv('host', {on, cmd:w.host.cmd}); const t0=absT();
    tr(on? 'The host (e.g. an AMS8-2 front panel, uart.c UART1_transmit_counter) sends two-byte frames at 9600 8N1 through ADM3485 U7/U8: first 0xE8 0x08 (“is demux present?”), then 0xE0|select, 0x70.' : 'No more frames.');
    tr('uart0_rx_isr → processUart(): byte 1 must have bit 7 set, byte 2 bit 7 clear. 0xE8 → uart0_tx_data = 0xE0, TCNT0 = 30; select → audio_select1 = b & 0x06, audio_swap1 = b & 1, input_select1 = b & 0x10, reply 0x02 if video unlocked. Timer0 (OCR0 = 34, clk/1024) delays the reply; timer0_ocm_isr sets U7_TX_EN (PE3) and writes UDR0.');
    if (!BUILD[D.build].host) tr('In the Stand-Alone build the UART code is still compiled in and answers, but getAudioGroups() reads the DIP switch, so the host cannot change anything.');
    consequence(tr, t0); }); },
  hostCmd(cmd){ act(`Host select byte → 0x${hex(cmd)}`, tr=>{ const w=world(absT()); addEv('host', {on:w.host.on, cmd}); const t0=absT();
    tr(`Next frame: 0x${hex(cmd)} 0x70 → audio_select1 = 0x${hex(cmd&6)} → group1 = ${(cmd&6)>>1} (Group ${((cmd&6)>>1)+1}), group2 = group1 + 1 = ${((cmd&6)>>1)+1}${((cmd&6)>>1)===3?' → setDmxGroupSelect masks it with 0x03 = 0 (Group 1!)':''}; input_select1 = ${cmd&16?'0x10 → RX1':'0 → RX2'}; swap bit ${cmd&1} is ignored (the swapAud block is commented out).`);
    if (!world(absT()).host.on) tr('The host is not connected: click P8 or “Connect host”.');
    consequence(tr, t0); }); },
  scn(k){ D.scn=k; D.page=0; D.ev = scenarioEvents(k); act('Timeline scenario → '+SCN[k].label, tr=>{ tr(scnText(k)); }); },
  page(i){ D.page=i; SIM.seek(0); SIM.refresh(); },
  build(b){ D.build=b; act('Firmware build → '+BUILD[b].name, tr=>{ tr(BUILD[b].host? `Host build: selection comes from processUart() (audio_select1, input_select1); PORTB is left at 0x00 and never read. Paired with FPGA ${BUILD[b].fpga}: BNC4 = AUDIO1 (GR1 ch1/2), BNC5 = AUDIO2 (GR1 ch3/4), INT_AES_OUT5..8 to the host.` : 'Stand-alone: SW1 selects input, groups and pair swap. FPGA V020100-StandAlone: BNC4 = AUDIO1 (GR1), BNC5 = AUDIO3 (GR2), both gated by DMX_GRn_PRES.'); }); },
  uc(v){ D.ucStart=v; act('unlock_counter at t = 0 → '+v, tr=>{ tr('Preloads the Failure-Test counter so you can watch what happens at 1001 within one simulated second.'); }); },
  reset(){ D.scn='steady'; D.page=0; D.build='SA'; D.ucStart=0; D.ev=[]; D.base={ cable:[true,false], fmt:['hd1080i59','sd525'], gm:[0b0011,0b0001], dip:[true,false,false,false,false,true,false,false], host:{on:false, cmd:0xF0} }; D.log=[]; SKEY=''; SIM.refresh(); },
  shipped(){ A.reset(); D.base.dip=[false,false,false,false,false,false,false,false]; SKEY=''; SIM.refresh(); },
};
function scenarioEvents(k){
  if (k==='plug'){ const w=D.base; const i = BUILD[D.build].host? ((w.host.on && (w.host.cmd&16))?0:1) : (pinb(w)&1); return [{t:-1e8, k:'cable'+i, v:false},{t:0.05, k:'cable'+i, v:true}]; }
  return [];
}
function scnText(k){ return k==='steady' ? 'The unit has been running for a long time: counters are saturated, the Si5324 is calibrated, the audio is flowing. Actions you take land at the playhead.'
  : k==='plug' ? 'At 50 ms a cable is plugged into the selected input. Follow the cable latch, 15-pass cable debounce, 30-pass SDI debounce, Si5324 reprogramming and ICAL, the TX reset release and the 10-pass audio debounce. Use the page selector for seconds 2 and 3.'
  : 'Power-on: main() runs, pulses PROG (Failure-Test code), and waits for DONE while the XC6SLX45T reads its bitstream from the M25P16. Configuration takes ≈'+CFG_T.toFixed(2)+' s ('+inf+'), so pick the later pages to see init, lock and audio.'; }

/* =====================================================================
   DRAWING: the board (real top silk from DEMUX4-ISS2-ASSY.PDF)
   ===================================================================== */
const BW = 1406, BH = 1401, PX_IN = BW/4.4;
const BNC = { 5:{y:222, lbl:'AES BNC 2 (AES_IO_3)'}, 4:{y:460, lbl:'AES BNC 1 (AES_IO_1)'}, 3:{y:700, lbl:'SDI OUT (GS2988)'}, 1:{y:938, lbl:'SDI IN 1 (LMH0394 U2)'}, 2:{y:1175, lbl:'SDI IN 2 (LMH0394 U9)'} };
const CHIPS = [
  ['U1',691,769,980,1056,'XC6SLX45T-3FGG484 Spartan-6: two GTP receivers (XAPP1076 triple-rate), SD/HD demux, aes_tx ×4, SDI TX, spi.v register file'],
  ['U6',230,950,435,1150,'ATmega128L-8AU @ 4.9152 MHz (X5): demux4.c — boots the FPGA, sets up clocks, polls status over bit-banged SPI, drives LEDs, reads SW1'],
  ['U14',480,1107,556,1172,'M25P16 16 Mbit SPI flash: FPGA bitstream (stdaln.mcs, 0x000000–0x16AAC7)'],
  ['X5',258,1197,385,1262,'4.9152 MHz crystal for the ATmega128 (UBRR0L = 31 → 9600 baud)'],
  ['U10',905,600,975,670,'Si5324 jitter cleaner: TX reference clock (TX_REF_CLK1) from the recovered RX clock; programmed through sspi.c'],
  ['X1',850,615,900,685,'114.285 MHz 3rd-overtone crystal for the Si5324'],
  ['U19',815,1180,868,1235,'Si5335 clock generator: 27 MHz free-run, RX_REF_CLK1/2 (148.5 or 148.35 MHz), 135 MHz (disabled by firmware)'],
  ['X3',723,1105,783,1265,'27 MHz crystal for the Si5335'],
  ['U13',538,655,628,690,'PLL1705 audio clock: 12.288 MHz MCLK_PAD from a 27 MHz reference locked to video'],
  ['U12',648,612,730,650,'ICS662-03: 27 MHz (HDCLK) from 74.25 or 74.25/1.001 MHz (ICS662_REF_IN, SEL3 = ~TX1_M)'],
  ['U2',1196,907,1248,962,'LMH0394 cable equaliser for BNC1 → SDI_EQ1 (GTP X0Y0 RX), carrier detect SDI_EQ1_CD'],
  ['U9',1196,1143,1248,1197,'LMH0394 cable equaliser for BNC2 → SDI_EQ2 (GTP X1Y0 RX), carrier detect SDI_EQ2_CD'],
  ['U3',1135,680,1185,730,'GS2988 SDI cable driver for BNC3 (SDI_CD1 from GTP TX, slew from TX1_SLEW)'],
  ['U15',1181,355,1236,488,'DS34LV87T RS-422 driver: EX_AES_OUT1 → AES_IO_1 (BNC4), EX_AES_OUT3 → AES_IO_3 (BNC5)'],
  ['U16',1118,117,1175,247,'DS34LV86T receiver: AES_IO_1/3 → EX_AES_IN1/3 (unused by the firmware: initExAes sets both as outputs)'],
  ['P4',823,160,983,240,'P4 PAN500: INT_AES_OUT1–4 (through 30 Ω resistors)'],
  ['P5',629,162,791,242,'P5 PAN500: INT_AES_OUT5–8'],
  ['P8',82,222,180,322,'P8 PAN300: RS-485 host link (ADM3485 U7/U8 on the bottom side) — click to connect a host'],
  ['P3',85,560,183,727,'P3 PAN500: power in'],
  ['JTAG1',238,775,400,855,'JTAG1 (HLE 2×5): ATmega128 JTAG for the JTAGICE mkII'],
  ['JTAG2',978,1190,1081,1255,'JTAG2 (2×3): Xilinx JTAG for the Platform Cable USB (indirect SPI programming of U14)'],
  ['H2',455,768,520,900,'H2: FPGA_TP1–7 test points (all driven 0 in V020100)'],
  ['H1',520,1222,655,1290,'H1 (2×4): FPGA configuration pins (CONF_*)'],
];
function boardSVG(t, opts){
  opts = opts||{};
  const s = sched(), F = s.F, w = world(t);
  const pwr = true;
  const L = {sdi:ledAt('sdi',t), gr1:ledAt('gr1',t), gr2:ledAt('gr2',t)};
  if (inSpin(t) || inCfg(t)) { /* MCU ports: LEDs follow the PORTE history (cleared at reset) */ }
  const ledBox = (y, on, col, id, lbl)=> `<g class="d4led" data-l="${id}"><rect x="2" y="${y-26}" width="86" height="52" rx="6" fill="${on? col : '#2a2d27'}" stroke="#0d0f0c" stroke-width="3" ${on?'filter="url(#d4glow)"':''}/>
      <circle cx="-26" cy="${y}" r="22" fill="${on? col : '#33372f'}" stroke="#111" stroke-width="3" ${on?'filter="url(#d4glow)"':''}/><title>${lbl}: ${on?'ON':'off'}</title></g>`;
  let dip = `<rect x="4" y="955" width="86" height="252" rx="4" fill="#1b4fa0" stroke="#0b2450" stroke-width="3"/>`;
  for (let i=0;i<8;i++){ const y = 962 + i*30.5, on=w.dip[i];
    dip += `<g class="d4dip" data-i="${i}" style="cursor:pointer"><rect x="-58" y="${y}" width="140" height="28" fill="transparent"/><rect x="-40" y="${y+3}" width="52" height="22" rx="3" fill="#e8e8e2" stroke="#333"/>
      <rect x="${on? -38 : -12}" y="${y+5}" width="22" height="18" rx="2" fill="${on?'#1f7a4d':'#555'}"/><text x="30" y="${y+20}" font-size="17" fill="#fff" font-weight="700">${i+1}</text>
      <title>SW1-${i+1} → PB${i} : ${on?'ON (pin to GND)':'OFF (pull-up, reads 1)'} — ${['input select: ON = RX1/BNC1, OFF = RX2/BNC2','GR1 group +2','GR1 group +1','GR1 pair swap (ch3/4 on BNC4)','GR2 group +2','GR2 group +1','GR2 pair swap (ch3/4 on BNC5)','not used'][i]}</title></g>`; }
  dip += `<text x="-60" y="950" font-size="18" fill="var(--ink2)">ON◂</text>`;
  const bnc = (n)=>{ const b=BNC[n]; const isIn = n<=2, i=n-1;
    const plugged = isIn ? w.cable[i] : true;
    let act = false, col='#7dd3ff';
    if (isIn) act = plugged; else if (n===3) act = F.txActive(t); else act = outActive(bncOut(n),t);
    const cable = (isIn && plugged) || (!isIn);
    return `<g class="${isIn?'d4bnc':'d4out'}" data-n="${n}" style="cursor:pointer">
      <rect x="1300" y="${b.y-80}" width="250" height="160" fill="transparent"/>
      <rect x="1318" y="${b.y-62}" width="88" height="124" rx="6" fill="#c9a63d" stroke="#6b5414" stroke-width="3"/>
      <rect x="1406" y="${b.y-42}" width="44" height="84" fill="#d8bd62" stroke="#6b5414" stroke-width="3"/><circle cx="1428" cy="${b.y}" r="16" fill="#7a5f12"/>
      ${cable? `<rect x="1450" y="${b.y-34}" width="60" height="68" rx="8" fill="${isIn?'#2f6fb4':'#3a3d40'}"/><rect x="1508" y="${b.y-14}" width="48" height="28" fill="${isIn?'#2f6fb4':'#3a3d40'}"/>` : ''}
      <circle cx="1480" cy="${b.y-52}" r="10" fill="${act? (n<=3?'var(--accent2)':'var(--accent)') : '#666'}"/>
      <text x="1300" y="${b.y-68}" font-size="19" text-anchor="end" fill="var(--ink2)">BNC${n}</text>
      <title>BNC${n}: ${b.lbl}${isIn? (plugged? ' — cable in ('+VF[w.fmt[i]].name+'). Click to unplug.' : ' — empty. Click to plug in.') : (act? ' — signal present' : ' — no signal')}</title></g>`; };
  const chips = CHIPS.map(([id,x0,y0,x1,y1,d])=>`<rect class="d4chip" data-c="${id}" x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="${D.selChip===id?'rgba(255,220,80,.28)':'transparent'}" stroke="${D.selChip===id?'#ffd84a':'none'}" stroke-width="4" style="cursor:pointer"><title>${id}: ${d}</title></rect>`).join('');
  // activity overlays (FPGA DONE, MCU state)
  const cfg = inCfg(t), spin = inSpin(t);
  const fpgaTxt = cfg? 'CONFIGURING' : F.configured(t)? (F.rxLock(F.sel(t),t)? 'LOCKED '+STD_NAME[F.curStd(t)].replace('LOCK_','') : 'NO LOCK') : '—';
  const op = opAt(t);
  const hdr = (x,y0,n,on)=>{ let r=''; for (let k=0;k<n;k++) r+=`<circle cx="${x}" cy="${y0+k*0}" r="0"/>`; return r; };
  const intAct = k => BUILD[D.build].host ? (k>=4 ? outActive(k-4,t) : false) : outActive(k%4,t);
  let pins=''; for (let k=0;k<4;k++){ pins += `<circle cx="${843+k*36}" cy="252" r="9" fill="${intAct(k)?'var(--accent)':'#444'}"><title>INT_AES_OUT${k+1}</title></circle><circle cx="${649+k*36}" cy="254" r="9" fill="${intAct(k+4)?'var(--accent)':'#444'}"><title>INT_AES_OUT${k+5}</title></circle>`; }
  const hostOn = w.host.on;
  return `<svg viewBox="-80 -40 1660 1490" role="img" aria-label="DEMUX-4 Issue 2 board, real top silkscreen" style="width:100%;max-width:${opts.max||900}px;display:block;margin:auto">
    <defs><filter id="d4glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect x="0" y="0" width="${BW}" height="${BH}" rx="8" fill="#1d5a36" stroke="#0e2e1b" stroke-width="4"/>
    <image href="${ASSET}demux4-top-silk.png" x="0" y="0" width="${BW}" height="${BH}"/>
    ${chips}
    <rect x="700" y="1010" width="270" height="40" rx="6" fill="rgba(0,0,0,.55)"/><text x="835" y="1037" text-anchor="middle" font-size="22" fill="${cfg?'#ffb43a':F.configured(t)?'#9fffb0':'#aaa'}" font-family="monospace">${fpgaTxt}</text>
    <rect x="236" y="1090" width="196" height="40" rx="6" fill="rgba(0,0,0,.55)"/><text x="334" y="1117" text-anchor="middle" font-size="20" fill="${spin?'#ff7a6e':'#9fd8ff'}" font-family="monospace">${spin?'while(1) → WDT':op? (typeof op.step==='number'? 'loop step '+op.step : 'boot '+op.step) : '—'}</text>
    ${pins}
    ${ledBox(374, pwr, '#7dff6a', 'pwr', 'LED6 POWER_LED (green)')}
    ${ledBox(905, L.sdi, '#7dff6a', 'sdi', 'LED1 SDI_LED (green, PE7)')}
    ${ledBox(836, L.gr1, '#ffd23a', 'gr1', 'LED2 GR1_LED (yellow, PE6)')}
    ${ledBox(768, L.gr2, '#ffd23a', 'gr2', 'LED3 GR2_LED (yellow, PE5)')}
    <text x="-74" y="${905+8}" font-size="17" fill="var(--ink2)" text-anchor="start" transform="rotate(-90 -60 905)"></text>
    ${dip}
    ${[1,2,3,4,5].map(bnc).join('')}
    <g class="d4host" style="cursor:pointer"><rect x="78" y="218" width="106" height="108" fill="${hostOn?'rgba(90,169,230,.35)':'transparent'}" stroke="${hostOn?'#5aa9e6':'none'}" stroke-width="4"/>${hostOn?`<path d="M82 272 H-60" stroke="#5aa9e6" stroke-width="10"/>`:''}<title>P8 RS-485 host link — ${hostOn?'host connected (click to disconnect)':'no host (click to connect)'}</title></g>
    <text x="703" y="1440" text-anchor="middle" font-size="22" fill="var(--ink2)">DEMUX-4 Issue 2 · top silk from DEMUX4-ISS2-ASSY.PDF · board 4.400 in square (DEMUX4-FAB.PDF) · green mask / white silk per fab notes</text>
    ${opts.hot||''}
  </svg>`;
}
function bindBoard(root){
  root.querySelectorAll('.d4dip').forEach(g=> g.addEventListener('click', ()=>A.dip(+g.dataset.i)));
  root.querySelectorAll('.d4bnc').forEach(g=> g.addEventListener('click', ()=>A.cable(+g.dataset.n-1)));
  root.querySelectorAll('.d4out').forEach(g=> g.addEventListener('click', ()=>{ const n=+g.dataset.n; if (n>=4){ D.scopeOut = n===4?0:1; } SIM.refresh(); }));
  root.querySelectorAll('.d4chip').forEach(g=> g.addEventListener('click', ()=>{ D.selChip = D.selChip===g.dataset.c? null : g.dataset.c; SIM.refresh(); }));
  const h=root.querySelector('.d4host'); if (h) h.addEventListener('click', ()=>A.host(!world(absT()).host.on));
}
function chipInfo(){ const c=CHIPS.find(x=>x[0]===D.selChip); return c? `<b>${c[0]}</b>: ${c[5]}` : '<span class="muted">Click a part on the board for what it does. Click a DIP switch to flip it, a BNC to plug or unplug SDI, BNC4/5 to scope that AES output, P8 to connect a host.</span>'; }

function controlsHTML(){
  const w = world(absT());
  const fmtSel = i=>`<select data-fmt="${i}">${Object.keys(VF).map(k=>`<option value="${k}" ${w.fmt[i]===k?'selected':''}>${VF[k].name}</option>`).join('')}</select>`;
  const gmSel = i=>`<span class="small">${[0,1,2,3].map(g=>`<label style="margin-right:4px"><input type="checkbox" data-gm="${i}" data-g="${g}" ${(w.gm[i]>>g)&1?'checked':''}>G${g+1}</label>`).join('')}</span>`;
  return `<div class="small" style="display:grid;grid-template-columns:auto 1fr;gap:4px 10px;align-items:center;margin-top:8px">
    <span class="muted">Timeline</span><span><select id="d4scn">${Object.keys(SCN).map(k=>`<option value="${k}" ${D.scn===k?'selected':''}>${SCN[k].label}</option>`).join('')}</select>
      <select id="d4page">${SCN[D.scn].pages.map((p,i)=>`<option value="${i}" ${D.page===i?'selected':''}>${p[1]}</option>`).join('')}</select></span>
    <span class="muted">Firmware</span><span><select id="d4build">${Object.keys(BUILD).map(k=>`<option value="${k}" ${D.build===k?'selected':''}>${BUILD[k].name}</option>`).join('')}</select></span>
    <span class="muted">BNC1 source</span><span>${fmtSel(0)} ${gmSel(0)} <button data-cab="0">${w.cable[0]?'unplug':'plug in'}</button></span>
    <span class="muted">BNC2 source</span><span>${fmtSel(1)} ${gmSel(1)} <button data-cab="1">${w.cable[1]?'unplug':'plug in'}</button></span>
    <span class="muted">Host (P8)</span><span><button id="d4host">${w.host.on?'disconnect':'connect'}</button> select byte <select id="d4cmd">${[[0xF0,'0xF0 SDI 1/2 (G1+G2, RX1)'],[0xF4,'0xF4 SDI 3/4 (G3+G4, RX1)'],[0xF1,'0xF1 SDI 5/6 (swap bit)'],[0xF2,'0xF2 (G2+G3, RX1)'],[0xF6,'0xF6 (G4+“G5”, RX1)'],[0xE0,'0xE0 (G1+G2, RX2)']].map(([v,l])=>`<option value="${v}" ${w.host.cmd===v?'selected':''}>${l}</option>`).join('')}</select></span>
    <span class="muted">Failure Test</span><span>unlock_counter at t=0 <select id="d4uc">${[0,500,900,985].map(v=>`<option ${D.ucStart===v?'selected':''}>${v}</option>`).join('')}</select> <button id="d4rst">Reset everything</button></span></div>
    <div class="small muted" style="margin-top:4px">Keys: 1–8 flip SW1-1…8 · A / S plug or unplug BNC1 / BNC2 · H host. Actions happen at the playhead; the firmware model reruns from there.</div>`;
}
function bindControls(m){
  const q=s=>m.querySelector(s);
  if (q('#d4scn')) q('#d4scn').onchange=e=>A.scn(e.target.value);
  if (q('#d4page')) q('#d4page').onchange=e=>A.page(+e.target.value);
  if (q('#d4build')) q('#d4build').onchange=e=>A.build(e.target.value);
  m.querySelectorAll('[data-fmt]').forEach(s=> s.onchange=e=>A.fmt(+s.dataset.fmt, e.target.value));
  m.querySelectorAll('[data-gm]').forEach(cb=> cb.onchange=()=>{ const i=+cb.dataset.gm; let mask=0; m.querySelectorAll(`[data-gm="${i}"]`).forEach(x=>{ if (x.checked) mask|=1<<(+x.dataset.g); }); A.groups(i,mask); });
  m.querySelectorAll('[data-cab]').forEach(b=> b.onclick=()=>A.cable(+b.dataset.cab));
  if (q('#d4host')) q('#d4host').onclick=()=>A.host(!world(absT()).host.on);
  if (q('#d4cmd')) q('#d4cmd').onchange=e=>A.hostCmd(+e.target.value);
  if (q('#d4uc')) q('#d4uc').onchange=e=>A.uc(+e.target.value);
  if (q('#d4rst')) q('#d4rst').onclick=()=>A.reset();
}
window.__demux4Active = false;
document.addEventListener('keydown', e=>{
  if (!window.__demux4Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase();
  if (/^[1-8]$/.test(k)){ A.dip(+k-1); e.preventDefault(); }
  else if (k==='a'){ A.cable(0); e.preventDefault(); } else if (k==='s'){ A.cable(1); e.preventDefault(); }
  else if (k==='h'){ A.host(!world(absT()).host.on); e.preventDefault(); }
});

/* =====================================================================
   TIMELINE LANES
   ===================================================================== */
const STEP_COL = i => typeof i!=='number' ? '--warn' : [ '--ink2','--accent2','--bad','--accent2','--accent2','--ink2','--accent','--warn','--warn','--accent2','--accent','--accent','--ink2'][i];
function txtFit(c, s, x, y, maxW){ if (maxW < 18) return; let t=s; while (t.length>2 && c.measureText(t).width > maxW-4) t=t.slice(0,-1); if (t.length<s.length) t=t.slice(0,-1)+'…'; c.fillText(t, x, y); }
function lanes(){
  const s = sched(), F = s.F, P0 = page0(), css=n=>SIM.css(n);
  const ls = [];
  const A0 = t=>P0+t;
  ls.push({label:'SDI in: frames / fields', h:28, draw(c,X,t0,t1,y,h){
    const a=A0(t0), b=A0(t1), i=F.sel(A0(SIM.t)), w=world(A0(SIM.t));
    if (!w.cable[i]){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText(`BNC${i+1}: no cable`, X(t0)+6, y+h/2+4); return; }
    const f=VF[w.fmt[i]], Tf=1/f.fr; const n0=Math.floor(a/Tf), n1=Math.ceil(b/Tf);
    if (n1-n0 > 400){ SIM.pulses(c,X,t0,t1,y,h,Tf,-P0%Tf,Tf*0.02,css('--accent2'),'frames'); return; }
    c.font='10px '+css('--mono');
    for (let n=n0;n<=n1;n++){ const ta=n*Tf-P0; const x=X(ta);
      c.fillStyle=css('--accent2'); c.fillRect(x, y+3, 2, h-6);
      if (f.il){ c.globalAlpha=.5; c.fillRect(X(ta+Tf/2), y+8, 1.5, h-16); c.globalAlpha=1; }
      if (X(ta+Tf)-x > 60){ c.fillStyle=css('--ink'); c.fillText(`frame ${n}${f.il?' F1':''}`, x+4, y+12); }
      if (f.il && X(ta+Tf)-x > 120){ c.fillStyle=css('--ink2'); c.fillText('F2', X(ta+Tf/2)+4, y+12); } }
  }});
  ls.push({label:'SDI lines: EAV · HANC · SAV', h:34, draw(c,X,t0,t1,y,h){
    const a=A0(t0), b=A0(t1), i=F.sel(A0(SIM.t)), w=world(A0(SIM.t)); if (!w.cable[i]) return;
    const f=VF[w.fmt[i]], Tl=lineT(f), wt=1/f.clk; const n0=Math.floor(a/Tl), n1=Math.ceil(b/Tl);
    const pxLine = X(t0+Tl)-X(t0);
    if (pxLine < 3){ SIM.pulses(c,X,t0,t1,y,h,Tl,-P0%Tl,Tl*0.12,css('--ink2'),`lines (${f.lines}/frame, ${f.spl} words each)`); return; }
    for (let n=n0;n<=n1;n++){ const ta=n*Tl-P0;
      const xe=X(ta), xh0=X(ta+f.hdr*wt), xs=X(ta+(f.spl-f.act-4)*wt), xa=X(ta+(f.spl-f.act)*wt), xend=X(ta+Tl);
      c.fillStyle=css('--bad'); c.fillRect(xe, y+4, Math.max(1,xh0-xe), h-8);
      c.fillStyle=css('--chip'); c.fillRect(xh0, y+4, xs-xh0, h-8);
      c.fillStyle=css('--warn'); c.fillRect(xs, y+4, Math.max(1,xa-xs), h-8);
      c.fillStyle=css('--grid'); c.fillRect(xa, y+4, xend-xa, h-8);
      if (pxLine > 30){ for (const p of linePackets(f, n, w.gm[i])){ c.fillStyle=css(GCOL[p.g]); c.fillRect(X(ta+p.w0*wt), y+7, Math.max(1,X(ta+p.w1*wt)-X(ta+p.w0*wt)-0.5), h-14); } }
      if (pxLine > 160){ c.fillStyle=css('--ink'); c.font='10px '+css('--mono'); const ln=(n%f.lines)+1;
        txtFit(c, `line ${ln}`, xa+4, y+h/2+4, xend-xa); if (xs-xh0>60){ c.fillStyle=css('--ink2'); txtFit(c,'HANC', xh0+3, y+12, xs-xh0); } }
    }
  }});
  ls.push({label:'HANC audio packets (G1–G4)', h:30, draw(c,X,t0,t1,y,h){
    const a=A0(t0), b=A0(t1), i=F.sel(A0(SIM.t)), w=world(A0(SIM.t)); if (!w.cable[i]) return;
    const f=VF[w.fmt[i]], Tl=lineT(f), wt=1/f.clk; const gm=w.gm[i]; const n0=Math.floor(a/Tl), n1=Math.ceil(b/Tl);
    const gs=[0,1,2,3].filter(g=>(gm>>g)&1);
    if (!gs.length){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('no embedded audio in this source', X(t0)+6, y+h/2+4); return; }
    if (n1-n0 > (X(t1)-X(t0))/2){ c.globalAlpha=.3; gs.forEach((g,k)=>{ c.fillStyle=css(GCOL[g]); c.fillRect(X(t0), y+3+k*(h-6)/gs.length, X(t1)-X(t0), (h-6)/gs.length-1); }); c.globalAlpha=1;
      c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${f.std===1? 'one packet per group per line (≈'+(48000/(f.fr*f.lines)).toFixed(2)+' samples)' : '48 000 packets/s per group (1 sample each)'} · DIDs ${gs.map(g=>(f.std===1?DID.sd:DID.hd)[g]).join(' ')}`, X(t0)+6, y+h/2+4); return; }
    for (let n=n0;n<=n1;n++){ const ta=n*Tl-P0; for (const p of linePackets(f,n,gm)){ const xa=X(ta+p.w0*wt), xb=X(ta+p.w1*wt); c.fillStyle=css(GCOL[p.g]); c.fillRect(xa, y+4+p.g*(h-8)/4, Math.max(1.5,xb-xa), (h-8)/4-1);
      if (xb-xa>70){ c.fillStyle='#fff'; c.font='10px '+css('--mono'); txtFit(c, `G${p.g+1} ${(f.std===1?DID.sd:DID.hd)[p.g]} s${p.samples[0]}`, xa+2, y+4+p.g*(h-8)/4+7, xb-xa); } } }
  }});
  ls.push({label:'Audio samples 48 kHz (embedder)', h:22, draw(c,X,t0,t1,y,h){ SIM.pulses(c,X,t0,t1,y,h,1/48000,-P0%(1/48000),2e-6,css('--accent'),'samples'); }});
  ls.push({label:'aes_tx ce_word · Z preamble', h:24, draw(c,X,t0,t1,y,h){
    if (!F.configured(A0((t0+t1)/2))) { c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('FPGA not configured', X(t0)+6, y+h/2+4); return; }
    SIM.pulses(c,X,t0,t1,y+h*0.45,h*0.55,1/48000,(AES_PHASE-P0)%(1/48000),1/48000/64,css('--ink2'),'frames (MCLK/256)');
    SIM.pulses(c,X,t0,t1,y,h*0.5,192/48000,(AES_PHASE-P0)%(192/48000),1/48000,css('--warn'),'blocks (192 frames, 0xBFFF wrap)'); }});
  [[4,'AES BNC4'],[5,'AES BNC5']].forEach(([n,lbl])=>{
    ls.push({label:()=>{ const k=bncOut(n); const mp=outMap(k,A0(SIM.t)); return `${lbl}: G${mp.g+1} ch${mp.ch[0]}/${mp.ch[1]}`; }, h:34, draw(c,X,t0,t1,y,h){
      const k=bncOut(n); const pw=X(t1)-X(t0), span=t1-t0; const N=Math.min(1600, Math.max(200, pw*2)); const cols=[css('--accent'), css('--bad')];
      const M=Math.max(1,Math.min(400, Math.ceil(pw/3))); const act=[]; for (let j=0;j<M;j++) act.push(outActive(k,A0(t0+span*(j+.5)/M)));
      c.fillStyle=css('--grid'); for (let j=0;j<M;j++) if (!act[j]) c.fillRect(X(t0+span*j/M), y+2, pw/M+0.6, h-4);
      const mp=outMap(k,A0((t0+t1)/2));
      [0,1].forEach(sd=>{ const fq=chFreq(mp.ch[sd]);
        if (span*fq > pw/3){ c.globalAlpha=.3; c.fillStyle=cols[sd]; for (let j=0;j<M;j++) if (act[j]) c.fillRect(X(t0+span*j/M), y+h/2-SRC_LEVEL*1.6*(h/2-3), pw/M+0.6, SRC_LEVEL*1.6*(h-6)); c.globalAlpha=1; return; }
        c.strokeStyle=cols[sd]; c.lineWidth=1; c.beginPath(); let pen=false;
        for (let j=0;j<=N;j++){ const tt=t0+span*j/N; const sl=Math.min(M-1,Math.floor(j/N*M)); if (!act[sl]){ pen=false; continue; }
          const m=Math.floor((A0(tt)-AES_PHASE)*48000), ts=m/48000-LAT; const v=SRC_LEVEL*Math.sin(2*Math.PI*fq*ts);
          const yy=y+h/2-v*1.6*(h/2-3); if (pen) c.lineTo(X(tt),yy); else { c.moveTo(X(tt),yy); pen=true; } }
        c.stroke(); });
    }}); });
  ls.push({label:'SDI OUT BNC3 (re-clocked)', h:20, draw(c,X,t0,t1,y,h){
    const pw=X(t1)-X(t0), M=Math.min(500,Math.ceil(pw/2)), span=t1-t0;
    for (let j=0;j<M;j++){ const tt=t0+span*(j+.5)/M; c.fillStyle = F.txActive(A0(tt))? css('--accent2') : css('--grid'); c.fillRect(X(t0+span*j/M), y+4, pw/M+0.6, h-8); } }});
  ls.push({label:'ATmega128 main loop', h:34, draw(c,X,t0,t1,y,h){
    const a=A0(t0), b=A0(t1); c.font='10px sans-serif';
    let i=Math.max(0,bs(s.ops,a)); let shown=0;
    for (; i<s.ops.length; i++){ const o=s.ops[i]; if (o.t0>b) break; const xa=X(o.t0-P0), xb=X(o.t1-P0); shown++;
      c.fillStyle=css(STEP_COL(o.step)); c.globalAlpha = typeof o.step==='number' ? (o.step%2? .6 : .85) : .55; c.fillRect(xa, y+3, Math.max(1, xb-xa-0.5), h-6); c.globalAlpha=1;
      if (xb-xa>40 && !s.wdtSpins.some(sp=>Math.abs(sp.t0-o.t0)<1e-3)){ c.fillStyle='#fff'; txtFit(c, o.label.split(':')[0].split('(')[0].slice(0,60), xa+3, y+h/2+3, xb-xa); } }
    for (const sp of s.wdtSpins){ if (sp.t1<a||sp.t0>b) continue; c.fillStyle=css('--bad'); c.globalAlpha=.7; c.fillRect(X(sp.t0-P0), y+3, X(sp.t1-P0)-X(sp.t0-P0), h-6); c.globalAlpha=1; c.fillStyle='#fff'; c.fillText('while(1); — no WDR → watchdog 120 ms', X(Math.max(sp.t0-P0,t0))+4, y+h/2+3); }
  }});
  ls.push({label:'SPI to FPGA (ALTERA1/2/3/8)', h:40, draw(c,X,t0,t1,y,h){
    const a=A0(t0), b=A0(t1); let i=Math.max(0,bs(s.xf,a)); c.font='10px '+css('--mono');
    const bitPx = X(t0+BIT_T)-X(t0);
    for (; i<s.xf.length; i++){ const x=s.xf[i]; if (x.t0>b) break; if (x.t1<a) continue; const xa=X(x.t0-P0), xb=X(x.t1-P0);
      if (bitPx > 14){ // bit level: CS, SCLK, MOSI, MISO
        c.strokeStyle=css('--ink2'); c.lineWidth=1;
        const word = ((x.rw? (x.a|0x80) : (x.a&0x7F))<<8) | (x.rw? 0 : x.v);
        const yC=y+6, yS=y+16, yM=y+27, yI=y+37;
        c.fillStyle=css('--accent2'); c.fillRect(xa, yC-3, xb-xa, 3);
        for (let k=0;k<16;k++){ const bt=x.t0+k*BIT_T-P0; const b1=(word>>(15-k))&1, xi=X(bt), xh=X(bt+BIT_T*20/80), xl=X(bt+BIT_T*60/80), xn=X(bt+BIT_T);
          c.strokeStyle=css('--ink'); c.beginPath(); c.moveTo(xi,yS); c.lineTo(xh,yS); c.lineTo(xh,yS-6); c.lineTo(xl,yS-6); c.lineTo(xl,yS); c.lineTo(xn,yS); c.stroke();
          c.fillStyle=b1? css('--accent') : css('--grid'); c.fillRect(xi, yM-6, xn-xi-1, 6);
          if (x.rw && k>=8){ const mb=(x.v>>(15-k))&1; c.fillStyle=mb? css('--warn') : css('--grid'); c.fillRect(xi, yI-6, xn-xi-1, 6); }
          if (xn-xi > 22){ c.fillStyle=css('--ink'); c.fillText(String(b1), xi+2, yM-8+0); } }
        continue; }
      c.fillStyle = x.rw? css('--accent2') : css('--warn'); c.globalAlpha=.8; c.fillRect(xa, y+4, Math.max(1,xb-xa-0.5), h-8); c.globalAlpha=1;
      if (xb-xa > 46){ c.fillStyle='#fff'; txtFit(c, `${x.rw?'R':'W'} 0x${hex(x.a)}=${hex(x.v)} ${xb-xa>150? x.fn : ''}`, xa+3, y+h/2+4, xb-xa); } }
    if (bitPx > 14){ c.fillStyle=css('--ink2'); c.font='9px sans-serif'; c.fillText('CS', X(t0)+2, y+8); c.fillText('SCLK', X(t0)+2, y+18); c.fillText('MOSI', X(t0)+2, y+29); c.fillText('MISO', X(t0)+2, y+39); }
  }});
  ls.push({label:'Si5324 SPI (sspi) · ICAL', h:22, draw(c,X,t0,t1,y,h){
    const a=A0(t0), b=A0(t1);
    if (F.si.icalAt!==null){ const ia=F.si.icalAt-P0; c.fillStyle=css('--warn'); c.globalAlpha=.35; c.fillRect(X(ia), y+3, X(ia+T_ICAL)-X(ia), h-6); c.globalAlpha=1; }
    const pw=X(t1)-X(t0), M=Math.min(400,Math.ceil(pw/3)), span=t1-t0; for (let j=0;j<M;j++){ const tt=t0+span*(j+.5)/M; if (F.siLocked(A0(tt))){ c.fillStyle=css('--accent'); c.globalAlpha=.4; c.fillRect(X(t0+span*j/M), y+h-6, pw/M+0.6, 3); c.globalAlpha=1; } }
    c.fillStyle=css('--bad'); for (const x of s.ss){ if (x.t1<a||x.t0>b) continue; c.fillRect(X(x.t0-P0), y+4, Math.max(1.5, X(x.t1-P0)-X(x.t0-P0)), h-10); } }});
  ls.push({label:'UART RS-485 (host, 9600 8N1)', h:22, draw(c,X,t0,t1,y,h){
    const a=A0(t0), b=A0(t1); c.font='10px '+css('--mono');
    if (!s.uart.length){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('no host frames (connect a host on P8)', X(t0)+6, y+h/2+4); return; }
    for (const u of s.uart){ if (u.t1<a||u.t0>b) continue; const xa=X(u.t0-P0), xb=X(u.t1-P0); c.fillStyle = u.dir==='rx'? css('--accent2') : css('--accent'); c.fillRect(xa, y+(u.dir==='rx'?3:h/2), Math.max(1.5,xb-xa), h/2-3);
      if (xb-xa>34){ c.fillStyle='#fff'; c.fillText((u.dir==='rx'?'←':'→')+hex(u.b), xa+2, y+(u.dir==='rx'?12:h-3)); } } }});
  ls.push({label:'LEDs: SDI · GR1 · GR2', h:30, draw(c,X,t0,t1,y,h){
    [['sdi','--accent'],['gr1','--warn'],['gr2','--warn']].forEach(([n,col],r)=>{ const hst=s.leds[n]; c.fillStyle=css(col);
      for (let j=0;j<hst.length;j++){ if (!hst[j][1]) continue; const ta=hst[j][0]-P0, tb=(j+1<hst.length? hst[j+1][0] : 1e9)-P0; if (tb<t0||ta>t1) continue; c.fillRect(X(Math.max(ta,t0)), y+3+r*9, X(Math.min(tb,t1))-X(Math.max(ta,t0)), 7); } }); }});
  ls.push({label:'FPGA config · watchdog resets', h:22, draw(c,X,t0,t1,y,h){
    c.font='11px sans-serif';
    for (const g of s.cfg){ const ta=g.t0-P0, tb=g.t1-P0; if (tb<t0||ta>t1) continue; c.fillStyle=css('--warn'); c.globalAlpha=.5; c.fillRect(X(ta), y+3, X(tb)-X(ta), h-6); c.globalAlpha=1; c.fillStyle=css('--ink'); c.fillText((s.resets.some(r=>Math.abs(r.t-g.t0)<0.05)?'WDT reset → ':'')+'PROG_B → configuring from M25P16 → DONE (≈'+CFG_T.toFixed(2)+' s, inferred)', X(Math.max(ta,t0))+4, y+h/2+4); }
    for (const r of s.resets){ const x=X(r.t-P0); c.fillStyle=css('--bad'); c.fillRect(x-1,y+2,3,h-4); }
    if (!s.cfg.length && !s.resets.length){ c.fillStyle=css('--ink2'); c.fillText('FPGA configured; WDR() every pass and inside every wait() loop', X(t0)+6, y+h/2+4); } }});
  return ls.map(l=> typeof l.label==='function' ? Object.assign({}, l, {label:l.label()}) : l);
}

/* =====================================================================
   SCOPE + LINE DIAGRAM
   ===================================================================== */
function aesFrame(t, k){
  const n = Math.max(0, Math.floor((t-AES_PHASE)*48000)); const fr = ((n % 192)+192)%192; const out=[];
  for (const side of [0,1]){ const v=outSample(k, side, t); const vv = v===null? 0 : v;
    let s = Math.round(vv*8388607); if (s<0) s += 1<<24;
    const bits=new Array(32).fill(0); for (let b=0;b<24;b++) bits[4+b]=(s>>b)&1;
    bits[28]=0; bits[29]=0; bits[30]=0;                                  // V = U = C = 0 (Demux4.v: valid1/user1/cs1 tied 1'b0)
    let par=0; for (let b=4;b<31;b++) par^=bits[b]; bits[31]=par;
    out.push({pre: side? 'Y' : (fr===0?'Z':'X'), bits, sample:vv, raw:s, off:v===null}); }
  return {n, fr, sub:out};
}
function biphase(pre, bits, start){ const P={X:[1,1,1,0,0,0,1,0],Y:[1,1,1,0,0,1,0,0],Z:[1,1,1,0,1,0,0,0]}[pre]; const lv=P.map(b=> start? 1-b : b); let cur=lv[lv.length-1]; for (let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if (bits[i]) cur=1-cur; lv.push(cur); } return lv; }
function drawScope(cv, el, t){
  const k = bncOut(D.scopeOut===0?4:5), Fm=aesFrame(t,k); const {c,w} = SIM.canvas(cv, 140);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2');
  if (Fm.sub[0].off){ c.fillStyle=ink2; c.font='13px sans-serif'; c.fillText(`AES BNC${D.scopeOut===0?4:5} is idle here: ${BUILD[D.build].host?'aes_tx held in reset':'EX_AES_OUT = DMX_GR_PRES ? AUDIO : 1\'b0 → a flat low line, no AES3 carrier'}.`, 10, 60); el.innerHTML=''; return; }
  const la=biphase(Fm.sub[0].pre, Fm.sub[0].bits, 0), lb=biphase('Y', Fm.sub[1].bits, la[la.length-1]); const lv=la.concat(lb); const cw=(w-20)/lv.length;
  const zones=[[0,8,'--warn','pre'],[8,16,'--ink2','aux'],[16,56,'--accent','audio'],[56,64,'--accent2','VUCP']];
  [0,64].forEach(off=> zones.forEach(([a,b,col,lb2])=>{ c.fillStyle=SIM.css(col); c.globalAlpha=.12; c.fillRect(10+(off+a)*cw, 18, (b-a)*cw, 70); c.globalAlpha=1; c.fillStyle=ink2; c.font='10px sans-serif'; if ((b-a)*cw>24) c.fillText(lb2, 12+(off+a)*cw, 100); }));
  c.strokeStyle=ink; c.lineWidth=1.5; c.beginPath(); lv.forEach((v,i)=>{ const x=10+i*cw, y=v?28:78; if(!i) c.moveTo(x,y); else c.lineTo(x,y); c.lineTo(x+cw,y); }); c.stroke();
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`Subframe A (${Fm.sub[0].pre})`, 12, 13); c.fillText('Subframe B (Y)', 12+64*cw, 13);
  c.fillText(`frame ${Fm.n.toLocaleString()} · ${Fm.fr}/191 of the block · bit cell ${SIM.fmtDur(1/48000/128)} · ce_bp = MCLK/2 = 6.144 MHz`, 10, 124);
  const mp=outMap(k,t);
  el.innerHTML = Fm.sub.map((s,i)=>`${i?'B':'A'} = embedded ch${mp.ch[i]} (${chFreq(mp.ch[i])} Hz test tone) ${s.sample.toFixed(5)} → 0x${hex(s.raw,6)} · V=0 U=0 <b>C=0</b> P=${s.bits[31]}`).join('<br>') + `<br><span class="muted">Every channel-status bit is 0 (cs1/cs2 = 1'b0 in Demux4.v): byte 0 bit 0 = 0 means “consumer”, and no sample rate is flagged.</span>`;
}
function drawLine(cv, el, t){
  const i=selIn(t), w=world(t); const {c,w:W} = SIM.canvas(cv, 120);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2');
  if (!w.cable[i]){ c.fillStyle=ink2; c.font='13px sans-serif'; c.fillText(`No cable on BNC${i+1}.`, 10, 50); el.innerHTML=''; return; }
  const f=VF[w.fmt[i]], Tl=lineT(f), n=Math.floor(t/Tl), ln=(n%f.lines)+1, wt=1/f.clk, pos=Math.floor((t-n*Tl)/wt);
  const sx = x => 10 + x/f.spl*(W-20);
  const hEnd = f.spl-f.act-4;
  const blk=(a,b,col,lbl,y,hh)=>{ c.fillStyle=SIM.css(col); c.fillRect(sx(a), y, Math.max(1,sx(b)-sx(a)), hh); if (sx(b)-sx(a)>34 && lbl){ c.fillStyle=ink; c.font='10px sans-serif'; c.fillText(lbl, sx(a)+3, y+hh-4); } };
  blk(0,f.hdr,'--bad', f.std===1?'EAV':'EAV LN CRC', 22, 34); blk(f.hdr,hEnd,'--chip','HANC',22,34); blk(hEnd,hEnd+4,'--warn','',22,34); blk(hEnd+4,f.spl,'--grid','active video ('+f.act+' words)',22,34);
  const pk = linePackets(f, n, w.gm[i]);
  pk.forEach(p=>{ c.fillStyle=SIM.css(GCOL[p.g]); c.fillRect(sx(p.w0), 60, Math.max(2,sx(p.w1)-sx(p.w0)-1), 22); });
  // zoomed HANC strip
  const zx = x => 10 + (x)/Math.max(hEnd,1)*(W-20);
  c.fillStyle=SIM.css('--chip'); c.fillRect(zx(0), 88, zx(hEnd)-zx(0), 22);
  pk.forEach(p=>{ c.fillStyle=SIM.css(GCOL[p.g]); c.fillRect(zx(p.w0), 88, Math.max(2,zx(p.w1)-zx(p.w0)-1), 22); if (zx(p.w1)-zx(p.w0)>50){ c.fillStyle='#fff'; c.font='10px '+SIM.css('--mono'); c.fillText(`G${p.g+1} ${(f.std===1?DID.sd:DID.hd)[p.g]}`, zx(p.w0)+2, 103); } });
  c.fillStyle=SIM.css('--play'); c.fillRect(sx(pos)-1, 18, 2, 66);
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`line ${ln} of ${f.lines} · word ${pos} of ${f.spl} · ${f.std===1?'Y/C interleaved 27 MHz words':'C (Cb/Cr) stream, '+(f.clk/1e6).toFixed(3)+' MHz'}`, 10, 13);
  c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText('HANC enlarged ↓', 10, 86);
  const smp=lineSamples(f,n);
  el.innerHTML = `${pk.length? `${pk.length} audio data packet(s) in this line's HANC carry sample${smp.length>1?'s':''} ${smp.join(', ')} of the second (${f.std===1? 'SMPTE 272: one packet per group, 3 words per channel per sample, '+(7+12*smp.length)+' words' : 'SMPTE 299: one packet per sample per group, 31 words = ADF·DID·DBN·DC·24 UDW (CLK, CH1–4, ECC)·CS'}).` : (lineHasNoPkt(f,ln)? 'No audio data packets on the line after the switching line ('+f.sw.join('/')+').' : 'No sample fell inside the previous line period, so this line carries no audio data packet.')}
   <span class="muted">Packet order inside HANC and the sample→line rule are simplified (${inf}); real embedders vary.</span>`;
}

/* =====================================================================
   VIEWS
   ===================================================================== */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function stateTable(t){
  const s=sched(), F=s.F, o=opAt(t), sn=o? o.s : null, i=F.sel(t), w=world(t);
  const x=xferAt(t);
  const f=VF[w.fmt[i]];
  const regs=[0x09,i?0x13:0x0D,0x1B,0x26,0x2A,0x2C,0x2E].map(a=>`<span title="${REGN[a]||''}">0x${hex(a)}=${hex(F.read(a,t))}</span>`).join(' ');
  return `<table class="kv">
    <tr><th>MCU</th><td class="mono small">${inSpin(t)?'<b style="color:var(--bad)">while(1) — waiting for the watchdog</b>' : o? `${typeof o.step==='number'?'pass #'+o.pass+' · step '+o.step:'boot '+o.step}: ${o.label}` : '—'}</td></tr>
    <tr><th>SPI now</th><td class="mono small">${x? `${x.rw?'xRead':'xWrite'}(0x${hex(x.a)} ${REGN[x.a]||''}) = 0x${hex(x.v)} · ${x.fn} · bit ${Math.min(15,Math.floor((t-x.t0)/BIT_T))}/16` : 'idle (CS low)'}</td></tr>
    <tr><th>Firmware variables</th><td class="mono small">${sn? `input=${sn.input?'RX2':'RX1'} cableCd=${sn.cableCd} (${sn.cableCounter}/15) vidStandard=${STD_NAME[sn.vidStandard]} (${sn.rxLockCounter}/30)<br>iCal=${sn.iCal} txClock=${sn.txClock} (${sn.txClockCounter}/10) gr1Audio=${sn.gr1Audio} (${sn.a1}/10) gr2Audio=${sn.gr2Audio} (${sn.a2}/10)<br>group1=${sn.group1} group2=${sn.group2} pair1=${sn.pair1} pair2=${sn.pair2} unlock_counter=${sn.unlock_counter}` : '—'}</td></tr>
    <tr><th>FPGA</th><td class="mono small">${inCfg(t)?'configuring':F.configured(t)? `RX${i+1} ${F.rxLock(i,t)?'locked '+f.name:'not locked'} · EQ_CD_SR=${F.cdLatch(t)?1:0} · Si5324 ${F.siLocked(t)?'locked':'not locked'} · SDI OUT ${F.txActive(t)?'running':'held in reset'}<br>GR1 = Group ${F.grSel(1,t)+1} ${F.grPres(1,t)?'present':'absent'} · GR2 = Group ${F.grSel(2,t)+1} ${F.grPres(2,t)?'present':'absent'}`:'not configured'}</td></tr>
    <tr><th>Registers</th><td class="mono small">${regs}</td></tr>
    <tr><th>DIP SW1</th><td class="mono small">${w.dip.map((d,k)=>d?'<b>'+(k+1)+'</b>':'·').join(' ')} → PINB=0x${hex(pinb(w))}${BUILD[D.build].host?' (ignored in host build)':''}</td></tr>
    <tr><th>AES outputs</th><td class="mono small">${[4,5].map(n=>{ const k=bncOut(n), mp=outMap(k,t); return `BNC${n}: ${outActive(k,t)?'G'+(mp.g+1)+' ch'+mp.ch.join('/'):'idle'}`; }).join(' · ')}</td></tr>
  </table>`;
}
function traceHTML(){ const e=D.log[0]; return e? `<div><b>${e.name}</b> at ${SIM.fmtT(e.t)} <span class="muted">(abs ${e.abs.toFixed(4)} s)</span></div>`+e.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Flip a DIP switch, plug a cable or change the source. Each step the firmware takes is listed here with real function names and register addresses.</div>'; }

function viewSim(m){
  window.__demux4Active = true;
  m.innerHTML = `<div class="grid2">
    <div>${card('DEMUX-4 board at the playhead — real Issue 2 top silkscreen', `<div id="bd"></div><div id="ci" class="small" style="margin-top:4px"></div><div id="ctl"></div>`)}</div>
    <div>${card('What the software did (last action)', `<div id="trace" class="log"></div>`)}${card('State at the playhead', `<div id="insp"></div>`)}</div></div>
    ${card('Timeline — one second as the device sees it (click to seek; zoom with “Zoom window”)', `<canvas id="tl"></canvas>
      <p class="small muted">MCU timing is cycle-counted from the ICCAVR listings: one <span class="mono">xRead/xWrite</span> = 16 bit-banged bits × ≈123 µs ≈ ${SIM.fmtDur(XFER_T)}, so a main-loop pass with 12–20 register accesses takes 25–45 ms. Lock and ICAL times of the FPGA receiver and Si5324 are ${inf}. Group colours: <span style="color:var(--accent)">G1</span> <span style="color:var(--accent2)">G2</span> <span style="color:var(--warn)">G3</span> <span style="color:var(--bad)">G4</span>.</p>`)}
    <div class="grid2">${card('Where the audio sits: the SDI line at the playhead', `<canvas id="ln"></canvas><div id="lninfo" class="small"></div>`)}
      ${card('Scope: one AES3 frame on the selected output (click BNC4/BNC5)', `<canvas id="sc"></canvas><div id="scb" class="small mono"></div>`)}</div>
    ${card('Action log', `<div id="log" class="log"></div>`)}`;
  m.querySelector('#ctl').innerHTML = controlsHTML(); bindControls(m);
  const draw=()=>{
    const t=absT();
    m.querySelector('#bd').innerHTML = boardSVG(t); bindBoard(m.querySelector('#bd'));
    m.querySelector('#ci').innerHTML = chipInfo();
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#insp').innerHTML = stateTable(t);
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200});
    drawLine(m.querySelector('#ln'), m.querySelector('#lninfo'), t);
    drawScope(m.querySelector('#sc'), m.querySelector('#scb'), t);
  };
  let lastKey='';
  SIM.on('time', ()=>{ const k=SKEY+'|'+D.build+D.scn+D.page; if (k!==lastKey){ lastKey=k; m.querySelector('#ctl').innerHTML=controlsHTML(); bindControls(m); } draw(); });
}

/* ---------------- tutorial ---------------- */
const fmtLocked = ()=>{ const t=absT(), F=sched().F; return F.rxLock(F.sel(t),t); };
const LESSONS = [
  {title:'Meet the DEMUX-4', auto:true, body:`<p>The DEMUX-4 (R&amp;D project RD31) takes a <b>3G, HD or SD-SDI</b> signal and pulls out the <b>embedded audio</b>. Two audio <b>groups</b> (four channels each) come out as AES3 on the BNCs and on the internal headers P4/P5. It also re-clocks the SDI to a loop-out BNC.</p>
    <p>It was built as a plug-in option for Ward-Beck monitors (AMS8, AMS4, XTM4, DMS1) and as a stand-alone (“SA”) unit. The stand-alone firmware reads an 8-way DIP switch, SW1.</p>
    <p>On the board: <b>BNC1/BNC2</b> SDI inputs, <b>BNC3</b> SDI out, <b>BNC4/BNC5</b> AES outputs (left edge = LEDs and SW1, right edge = BNCs). Hover over the parts; click one for its job.</p>`, check:()=>true},
  {title:'1 · Power-up: the FPGA boots first', body:`<p>Set the <b>Timeline</b> to <b>Power-up</b>. <span class="mono">main()</span> starts the watchdog, makes PORTB inputs with pull-ups, then pulses <span class="mono">FPGA_PROG_B</span> (the “Failure Test” code) and waits in <span class="mono">while (!isFpgaReady()) WDR();</span>.</p>
    <p>The Spartan-6 reads its 1.49 MB bitstream from the M25P16 at the default 2 MHz configuration clock: about ${CFG_T.toFixed(1)} s (${inf}). Nothing lights except POWER.</p><p><b>Goal:</b> choose Power-up, page “5.5 – 6.5 s”, and move the playhead past DONE.</p>`,
    check:()=> D.scn==='boot' && sched().cfg.length && absT() > sched().cfg[0].t1, hint:'Timeline → Power-up, then the page “5.5 – 6.5 s”, then drag the slider to the right half.'},
  {title:'2 · Feed it SDI and pick the input', body:`<p>SW1-1 is the input selector: <span class="mono">getSelectedInput()</span> does <span class="mono">input = PINB &amp; BIT0</span>. Switch <b>ON</b> pulls PB0 to ground → <b>RX1 (BNC1)</b>. Switch OFF leaves the pull-up → <b>RX2 (BNC2)</b>.</p>
    <p>With every switch OFF (“as shipped”, ${inf}) the unit listens to BNC2.</p><p><b>Goal:</b> back on <b>Running</b>, cable in BNC1, SW1-1 ON, and the green <b>SDI</b> LED lit at the playhead.</p>`,
    check:()=> D.scn!=='boot' && world(absT()).dip[0] && world(absT()).cable[0] && ledAt('sdi',absT()), hint:'Timeline → Running. Click SW1 switch 1 (or key 1). Plug BNC1 if it is empty. If you just changed something, play or scrub forward: debouncing takes 30+ loop passes.'},
  {title:'3 · Read the LEDs', body:`<p>Three status LEDs are driven by the ATmega128 on PORTE:</p><ul><li><b>SDI</b> (green, PE7): <span class="mono">setSdiLed(ON)</span> after 15 good cable reads and 30 good lock reads.</li><li><b>GR1</b> / <b>GR2</b> (yellow, PE6/PE5): the FPGA saw packets of the selected group, debounced 10 passes.</li></ul><p>A fourth green LED is POWER. There is no display: these LEDs are the only things the operator sees.</p><p><b>Goal:</b> GR1 and GR2 both lit.</p>`,
    check:()=> ledAt('gr1',absT()) && ledAt('gr2',absT()), hint:'The BNC1 source must carry the groups that SW1 selects: tick G1 and G2 for BNC1.'},
  {title:'4 · Choose which group comes out', body:`<p>GR1 (BNC4) uses SW1-2 (+2) and SW1-3 (+1); GR2 (BNC5) uses SW1-5 (+2) and SW1-6 (+1). All OFF = Group 1. <span class="mono">getSaGrpSel()</span> adds the values, <span class="mono">setDmxGroupSelect()</span> writes them into register 0x2A.</p>
    <p>Note: with all switches OFF, <b>both</b> outputs carry Group 1.</p><p><b>Goal:</b> put <b>Group 3</b> on GR1 (BNC4) and see GR1 light again. Tick G3 on the source.</p>`,
    check:()=>{ const w=world(absT()); return saGrp(w,1)===2 && ledAt('gr1',absT()); }, hint:'SW1-2 ON, SW1-3 OFF gives 2 = Group 3. Tick G3 in the BNC1 source. Then play: the 5.33 ms detect window plus 10 debounce passes take ~0.3 s.'},
  {title:'5 · Swap the pair', body:`<p>Each AES output carries two channels. SW1-4 (GR1) and SW1-7 (GR2) set <span class="mono">SWAP_AES</span>/<span class="mono">SWAP_AES2</span> in register 0x2E. The FPGA’s <span class="mono">swap_audio</span> blocks then exchange ch1↔ch3 and ch2↔ch4, so BNC4 carries channels <b>3/4</b> of the group instead of 1/2.</p><p><b>Goal:</b> BNC4 carries ch 3/4 (check the timeline lane label or the scope).</p>`,
    check:()=> saPair(world(absT()),1)===1 && sched().F.regAt(0x2E,absT())&1, hint:'SW1-4 ON (key 4), then let the next loop pass run.'},
  {title:'6 · Pull the cable', body:`<p>Unplug the selected input. The FPGA latches “no carrier” at once and holds the SDI output in reset by itself. On the next pass the firmware sees <span class="mono">cableCd = UNLOCKED</span>, resets the demux and AES generators and turns the LEDs off.</p>
    <p>In the stand-alone FPGA the AES outputs are gated by <span class="mono">DMX_GR_PRES</span>: they go completely flat, so downstream gear loses AES lock rather than hearing silence.</p><p><b>Goal:</b> SDI LED off with the cable out.</p>`,
    check:()=>{ const w=world(absT()), i=sched().F.sel(absT()); return !w.cable[i] && !ledAt('sdi',absT()); }, hint:'Click the BNC that is selected (BNC1 if SW1-1 is ON), then scrub forward a little.'},
  {title:'7 · Change format: the Si5324 is retuned', body:`<p>Plug the cable back in and set the source to <b>3G-A 1080p 59.94</b>. When the firmware goes from unlocked to locked, <span class="mono">processLockStatus()</span> calls <span class="mono">initSi5324(1)</span> and <span class="mono">si5324SetupPll(1, LOCK_3GA)</span>, starts ICAL, and after 10 good lock reads releases the TX DCM, GTP, FIFO and TX resets.</p>
    <p>Watch the red bursts on the “Si5324 SPI” lane: each Si5324 register costs two FPGA transfers plus the Si5324 bytes.</p><p><b>Goal:</b> source is 3G-A and the SDI LED is on.</p>`,
    check:()=>{ const w=world(absT()), i=sched().F.sel(absT()); return VF[w.fmt[i]].std===3 && ledAt('sdi',absT()); }, hint:'Choose 3G-A 1080p 59.94 for BNC1, then play for about a second (or use Timeline → “SDI cable plugged in” to see it from the start).'},
  {title:'8 · The 3G level-B trap', body:`<p>The firmware turns 3G level B into “unlocked” (<span class="mono">//disable 3G level B for now</span>). With the cable still good, the Failure-Test counter <span class="mono">unlock_counter</span> climbs every pass and is never cleared. At 1001 the code runs <span class="mono">while(1);</span> and the watchdog resets the MCU, which re-pulses PROG and reloads the FPGA.</p>
    <p><b>Goal:</b> set the source to 3G-B and preload <span class="mono">unlock_counter</span> to 985, then find the WDT reset on the timeline.</p>`,
    check:()=> sched().resets.length>0, hint:'BNC1 source → 3G-B; Failure Test → 985; then look at the “FPGA config · watchdog resets” lane.'},
  {title:'9 · Inside a host (AMS4 / XTM4 / AMS8)', body:`<p>In a host product the board talks to the host over RS-485 on P8 (ADM3485), 9600 baud, two-byte frames. The host first asks <span class="mono">0xE8</span> (“is demux present?”); the board answers <span class="mono">0xE0</span>. Then the host sends <span class="mono">0xE0|select</span> and the board answers <span class="mono">0x00</span> or <span class="mono">0x02</span> (video unlocked), plus bits 2–5 if GR1 audio is missing (AMS4 build).</p>
    <p><b>Goal:</b> switch the firmware to <b>V020102 AMS4</b>, connect the host, and choose select byte 0xF4 (Groups 3+4).</p>`,
    check:()=>{ const s=sched(), o=opAt(absT()); return D.build!=='SA' && world(absT()).host.on && o && o.s.group1===2; }, hint:'Firmware → V020102 AMS4, Host → connect, select byte → 0xF4, then play: the AMS4 host sends a frame about every 0.37 s (its pole / communication_control counters); the first two are the 0xE8 probe, so the select byte arrives on the third, ≈ 0.75 s in.'},
  {title:'Done', auto:true, body:`<p>You have used every control on the DEMUX-4. The <b>Software</b> tab follows the same actions through the code, <b>One second</b> breaks a second down to SDI words and AES bits, and <b>Findings</b> lists what the firmware and FPGA are really up to.</p>`, check:()=>true},
];
let lessonIdx=0;
function viewTutorial(m){
  window.__demux4Active = true;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — operating and integrating the DEMUX-4', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>
      ${card('What the software did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The board', `<div id="bd"></div><div id="ci" class="small"></div><div id="ctl"></div>`)}
      ${card('Timeline (whole page)', `<canvas id="tl"></canvas>`)}</div></div>`;
  m.querySelector('#ctl').innerHTML = controlsHTML(); bindControls(m);
  let lastKey='';
  const draw=()=>{
    const t=absT(); const k=SKEY+'|'+D.build+D.scn+D.page; if (k!==lastKey){ lastKey=k; m.querySelector('#ctl').innerHTML=controlsHTML(); bindControls(m); }
    m.querySelector('#bd').innerHTML = boardSVG(t,{max:700}); bindBoard(m.querySelector('#bd')); m.querySelector('#ci').innerHTML=chipInfo();
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#ls').innerHTML = LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}">${l.title}${l.check()&&!l.auto?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx], ok=L.check();
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button id="pv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="so">Start over (switches all OFF)</button></div>`;
    m.querySelector('#pv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nx').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#so').onclick=()=>{ A.shipped(); lessonIdx=0; };
    SIM.drawLanes(m.querySelector('#tl'), lanes().filter(l=>/LEDs|main loop|SPI to|SDI OUT|AES BNC|watchdog/.test(l.label)), {labelW:170, range:[0,1]});
  };
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewSecond(m){
  window.__demux4Active = true;
  m.innerHTML = `${card('One second, broken down (selected input, this page of the timeline)', `<div id="lad"></div>`)}
    <div class="grid2">${card('As seen by the device at the playhead', `<div id="dev"></div>`)}
      ${card('As seen by the displays', `<div id="leds"></div><h3>Downstream: a meter fed from AES BNC4 / BNC5</h3><canvas id="mt"></canvas><p class="small muted">Peak over the last 10 ms, 46 segments −60…0 dBFS (an AMS8-style bar, ${inf}). When an output is gated off the meter has no AES3 carrier at all.</p>`)}</div>
    ${card('Zoom ladder at the playhead: second → frame → line → HANC packet → AES3 frame', `<canvas id="zl"></canvas>`)}
    ${card('The line under the playhead', `<canvas id="ln"></canvas><div id="lninfo" class="small"></div>`)}`;
  const draw=()=>{
    const t=absT(), s=sched(), F=s.F, i=F.sel(t), w=world(t), f=VF[w.fmt[i]], P0=page0();
    const inPage = arr => arr.filter(x=>x.t0>=P0 && x.t0<P0+1);
    const passes = s.passes.filter(p=>p.t0>=P0 && p.t0<P0+1).length, xf=inPage(s.xf).length, ss=inPage(s.ss).length, ua=inPage(s.uart).length;
    const ledCh = ['sdi','gr1','gr2'].reduce((a,n)=>a+s.leds[n].filter(x=>x[0]>=P0&&x[0]<P0+1).length,0);
    const gs=[0,1,2,3].filter(g=>(w.gm[i]>>g)&1).length;
    const Tl=lineT(f), lps=1/Tl;
    const linesWithPk = f.std===1 ? Math.round(lps*(1-f.sw.length/f.lines)) : null;
    const rows = [
      ['SDI frames', f.fr.toFixed(3), SIM.fmtDur(1/f.fr), f.name+(f.il?' (2 fields each)':'')],
      ['SDI lines', Math.round(lps).toLocaleString(), SIM.fmtDur(Tl), `${f.lines} per frame; EAV ${f.std===1?'':'+ LN + CRC '}then HANC`],
      ['SDI words (per stream)', Math.round(f.clk).toLocaleString(), SIM.fmtDur(1/f.clk), `${f.spl} per line, ${f.rateTxt} serial`],
      ['HANC audio data packets', f.std===1? `≈${(linesWithPk*gs).toLocaleString()}` : (48000*gs).toLocaleString(), '', f.std===1? `SMPTE 272: one per group per line (${gs} group${gs!==1?'s':''})` : `SMPTE 299: one per sample per group (${gs} group${gs!==1?'s':''})`],
      ['Audio samples per channel', '48,000', SIM.fmtDur(1/48000), f.m? '1001 rates: 8008 samples per 5 frames' : '1920 per frame at 25 Hz / 960 at 50 Hz'],
      ['MCLK cycles (PLL1705)', '12,288,000', SIM.fmtDur(1/MCLK), 'aes_tx_clkdiv counter 0…0xBFFF (49 152 = 192 frames × 256)'],
      ['AES3 blocks', '250', '4 ms', 'Z preamble when the counter wraps (frame0)'],
      ['AES3 frames / subframes / bit cells', '48,000 / 96,000 / 6,144,000', SIM.fmtDur(1/48000/128), 'ce_word = MCLK/256 · ce_bit = MCLK/4 · ce_bp = MCLK/2'],
      ['HD group-present windows', f.std===1? Math.round(MCLK/8192) : Math.round(MCLK/65536), SIM.fmtDur((f.std===1?8192:65536)/MCLK), f.std===1? 'sd_demux_top PRESENT_COUNT (13 bit)' : 'hd_audio_demux_data detect_count (16 bit)'],
      ['MCU main-loop passes (this page)', passes, passes? SIM.fmtDur(1/passes) : '', 'measured from the firmware model'],
      ['SPI register transfers / bits', `${xf} / ${(xf*16).toLocaleString()}`, SIM.fmtDur(XFER_T), 'xRead/xWrite bit-banged on PA4 (SCLK), PC1 (CS, active high), PC2/PC3'],
      ['Si5324 SPI accesses', ss, '', 'each wrapped in sspiSelect() = two more FPGA transfers'],
      ['UART bytes', ua, SIM.fmtDur(UART_BYTE), 'RS-485 host link, 9600 8N1'],
      ['LED changes', ledCh, '', 'PORTE bits 7/6/5'],
    ];
    m.querySelector('#lad').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>notes</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">Use the transport’s <b>Step</b> units to move one frame, one line, one loop pass, one SPI transfer, one SPI bit, one AES block or one sample at a time.</p>`;
    const n=Math.floor(t/Tl), ln=(n%f.lines)+1, wt=1/f.clk, pos=Math.floor((t-n*Tl)/wt), fr=Math.floor(t*f.fr);
    const pk=linePackets(f,n,w.gm[i]); const here=pk.find(p=>pos>=p.w0&&pos<p.w1);
    const o=opAt(t), x=xferAt(t), Fm=aesFrame(t,bncOut(4));
    m.querySelector('#dev').innerHTML = `<table class="kv">
      <tr><th>Time</th><td class="mono">${SIM.fmtT(SIM.t)} (abs ${t.toFixed(6)} s)</td></tr>
      <tr><th>SDI (BNC${i+1})</th><td class="mono">${w.cable[i]? `frame ${fr} · line ${ln} · word ${pos} ${pos<f.hdr?'· <b>EAV</b>':pos<f.spl-f.act-4?'· HANC':pos<f.spl-f.act?'· <b>SAV</b>':'· active video'}${here?` · inside the G${here.g+1} audio packet (DID ${(f.std===1?DID.sd:DID.hd)[here.g]})`:''}`:'no cable'}</td></tr>
      <tr><th>FPGA demux</th><td class="mono">GR1 → Group ${F.grSel(1,t)+1} (${F.grPres(1,t)?'present':'absent'}) · GR2 → Group ${F.grSel(2,t)+1} (${F.grPres(2,t)?'present':'absent'})</td></tr>
      <tr><th>AES3 out</th><td class="mono">frame ${Fm.n.toLocaleString()} · ${Fm.fr}/191 · preamble ${Fm.sub[0].pre}${Fm.sub[0].off?' · BNC4 idle':''}</td></tr>
      <tr><th>ATmega128</th><td class="mono small">${inSpin(t)?'spinning until the watchdog bites':o?o.label:'—'}</td></tr>
      <tr><th>SPI wire</th><td class="mono small">${x? `${x.rw?'read':'write'} 0x${hex(x.a)} = 0x${hex(x.v)}, bit ${Math.floor((t-x.t0)/BIT_T)}: SCLK ${((t-x.t0)%BIT_T)/BIT_T>0.25&&((t-x.t0)%BIT_T)/BIT_T<0.75?'high':'low'}`:'idle'}</td></tr></table>`;
    const L={sdi:ledAt('sdi',t),gr1:ledAt('gr1',t),gr2:ledAt('gr2',t)};
    const lc=(on,col,lbl)=>`<div style="display:flex;align-items:center;gap:8px;margin:3px 0"><span style="width:22px;height:22px;border-radius:50%;display:inline-block;background:${on?col:'var(--led-off)'};box-shadow:${on?'0 0 10px '+col:'none'}"></span><span>${lbl}: <b>${on?'ON':'off'}</b></span></div>`;
    m.querySelector('#leds').innerHTML = lc(1,'#7dff6a','POWER (LED6)')+lc(L.sdi,'#7dff6a','SDI (LED1, PE7)')+lc(L.gr1,'#ffd23a','GR1 (LED2, PE6)')+lc(L.gr2,'#ffd23a','GR2 (LED3, PE5)');
    const {c,w:W}=SIM.canvas(m.querySelector('#mt'), 80);
    [4,5].forEach((nn,r)=>{ const k=bncOut(nn); let pk2=0, any=false; for (let j=0;j<96;j++){ for (const sd of [0,1]){ const v=outSample(k,sd,t-0.01*j/96); if (v!==null){ any=true; pk2=Math.max(pk2,Math.abs(v)); } } }
      const db=pk2>0?20*Math.log10(pk2):-99, segs=46, lit=any?Math.max(0,Math.min(segs,Math.round((db+60)/60*segs))):0;
      for (let sg=0;sg<segs;sg++){ const xx=90+sg*(W-100)/segs; c.fillStyle = sg<lit? (sg>=segs-4?'#e3453a':sg>=segs-12?'#e8b23a':'#3fbf5f') : SIM.css('--grid'); c.fillRect(xx, 8+r*34, (W-100)/segs-2, 24); }
      c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--mono'); c.fillText(`BNC${nn} ${any? db.toFixed(1)+' dB':'NO AES'}`, 4, 24+r*34); });
    drawLadder(m.querySelector('#zl'), t);
    drawLine(m.querySelector('#ln'), m.querySelector('#lninfo'), t);
  };
  SIM.on('time', draw);
}
function drawLadder(cv, t){
  const s=sched(), i=selIn(t), w=world(t), f=VF[w.fmt[i]], Tl=lineT(f), P0=page0();
  const levels=[['1 second', 1],['1 frame', 1/f.fr],['1 line', Tl],['HANC (first '+(f.spl-f.act-4)+' words)', (f.spl-f.act-4)/f.clk],['1 AES3 frame', 1/48000]];
  const H=levels.length*46+10; const {c,w:W}=SIM.canvas(cv,H); const x0=170, pw=W-x0-10;
  levels.forEach(([nm,span],li)=>{
    const y=8+li*46; let a = li===3? Math.floor(t/Tl)*Tl : Math.max(P0, Math.min(P0+1-span, t-span/2)); if (li===0) a=P0;
    c.fillStyle=SIM.css('--ink'); c.font='12px sans-serif'; c.fillText(nm, 6, y+14); c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; c.fillText(SIM.fmtDur(span), 6, y+28);
    c.strokeStyle=SIM.css('--grid'); c.strokeRect(x0,y+2,pw,32);
    const X=tt=> x0+(tt-a)/span*pw;
    if (li<=1){ // passes + frames
      for (const p of s.passes){ if (p.t0>a+span) break; if (p.t1<a) continue; c.fillStyle=SIM.css(p.i%2?'--accent':'--accent2'); c.globalAlpha=.5; c.fillRect(X(p.t0), y+20, Math.max(1,X(p.t1)-X(p.t0)-0.5), 12); c.globalAlpha=1; }
      if (w.cable[i]){ const T=li? Tl : 1/f.fr; const n0=Math.ceil(a/T), n1=Math.floor((a+span)/T); if (n1-n0<pw/2) for (let n=n0;n<=n1;n++){ c.fillStyle=SIM.css('--ink2'); c.fillRect(X(n*T), y+4, 1, 14); } else { c.fillStyle=SIM.css('--ink2'); c.globalAlpha=.3; c.fillRect(x0,y+4,pw,14); c.globalAlpha=1; } }
      c.fillStyle=SIM.css('--ink2'); c.font='10px sans-serif'; c.fillText(li? 'lines (ticks) and MCU passes (bars)' : 'frames and MCU passes', x0+4, y+15);
    } else if (li<=3 && w.cable[i]){ const n=Math.floor(t/Tl); const ta=n*Tl; const wt=1/f.clk;
      for (const p of linePackets(f,n,w.gm[i])){ c.fillStyle=SIM.css(GCOL[p.g]); c.fillRect(X(ta+p.w0*wt), y+6, Math.max(1.5,X(ta+p.w1*wt)-X(ta+p.w0*wt)-0.5), 24); }
      c.fillStyle=SIM.css('--bad'); c.fillRect(X(ta), y+6, Math.max(1,X(ta+f.hdr*wt)-X(ta)), 24);
    } else if (li===4){ const Fm=aesFrame(t,bncOut(4)); if (!Fm.sub[0].off){ const lv=biphase(Fm.sub[0].pre,Fm.sub[0].bits,0).concat(biphase('Y',Fm.sub[1].bits,0)); c.strokeStyle=SIM.css('--ink'); c.beginPath(); lv.forEach((v,k)=>{ const xx=x0+k*pw/128, yy=v?y+8:y+28; if(!k) c.moveTo(xx,yy); else c.lineTo(xx,yy); c.lineTo(xx+pw/128,yy); }); c.stroke(); } }
    const px=X(t); c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+36); c.stroke();
  });
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  bnc:{x:10,y:40,w:120,h:90,t:'BNC1 / BNC2',s:['SDI in ×2','LMH0394 EQ ×2'],d:'Two equalised inputs (U2, U9). Carrier detect SDI_EQ1_CD / SDI_EQ2_CD reach the FPGA (pins F7, F14).'},
  gtp:{x:160,y:30,w:150,h:110,t:'GTP RX ×2',s:['XAPP1076 triple-rate','SD/HD/3G autodetect','VPID · EDH · CRC'],d:'triple_sdi_rx_autorate + multi_sdi_decoder per input (RX1_CORE, RX2_CORE). Reference clocks RX_REF_CLK1/2 come from the Si5335; the firmware turns the unused one off in setupSi5335().'},
  selb:{x:340,y:40,w:130,h:90,t:'sdi_tx_control',s:['stream select','TX1_STREAM_SELECT'],d:'Chooses RX1 or RX2 for the demuxers and the SDI output (register 0x1B bit 7, written by selectInput()).'},
  dmx:{x:500,y:20,w:170,h:130,t:'Audio demux',s:['hd_demux_xlx ×2 (SMPTE 299)','sd_demux_top (SMPTE 272)','group_sel from 0x2A','group_pres → 0x26'],d:'HD_DEMUX_1 / HD_DEMUX_2 and SD_DEMUX_1 extract the two selected groups. Both cores are reset by DMX_GR1_RESET; DMX_GR2_RESET is wired to nothing. Presence windows: 65 536 MCLK (HD) or 8 192 MCLK (SD).'},
  sel8:{x:700,y:20,w:150,h:130,t:'Select · swap',s:['par_aud_8of32_sel','swap_audio ×4','SWAP_AES / SWAP_AES2'],d:'par_aud_8of32_sel picks the SD or HD channels (str_sel tied 0). swap_audio exchanges ch1↔3, ch2↔4 (and 5↔7, 6↔8 in the stand-alone FPGA).'},
  aes:{x:880,y:20,w:150,h:130,t:'aes_tx ×4',s:['Xilinx AES3 encoder','MCLK 12.288 MHz','C, U, V bits = 0'],d:'AES1..4_GEN from Xilinx (John Snow, 2005). Reset = RST_GRn_AES | ~DMX_GRn_PRES. Channel status, user and validity inputs are all tied to 0.'},
  outs:{x:1060,y:20,w:140,h:130,t:'AES outputs',s:['DS34LV87T → BNC4/5','P4 / P5 internal ×8'],d:'Stand-alone FPGA: BNC4 = AUDIO1 (GR1), BNC5 = AUDIO3 (GR2), all gated by DMX_GRn_PRES. Host FPGA V020000: BNC4 = AUDIO1, BNC5 = AUDIO2, INT_AES_OUT5..8 to the host.'},
  tx:{x:340,y:200,w:280,h:80,t:'SDI TX path',s:['vid_fifo → TX1_CORE → GTP TX → GS2988 → BNC3','SR-latched resets (EQ_CD_SR)'],d:'The selected stream is re-clocked through vid_fifo and sent out. CRC/EDH/LN/VPID insertion inputs are tied to 1\'b0 in Demux4.v, so the TX control bits in 0x1B do nothing.'},
  clk:{x:660,y:200,w:280,h:110,t:'Clocks',s:['Si5335: 27 MHz, RX ref 148.5/148.35','Si5324: TX ref from recovered clock','ICS662 + PLL1705: MCLK 12.288 MHz'],d:'mclkSync sends pclk (or pclk/2) as 74.25 MHz to the ICS662, which makes HDCLK 27 MHz for the PLL1705, so the 48 kHz audio clock is locked to the incoming video.'},
  spi:{x:340,y:330,w:200,h:90,t:'spi.v register file',s:['0x00–0x2E · CS active high','clocked by SPI SCLK only'],d:'Control/spi.v: rw bit + 7-bit address + 8 data bits. Status bits are sampled on SPI clock edges, so they are only as fresh as the last transfer.'},
  mcu:{x:40,y:300,w:250,h:130,t:'ATmega128L @ 4.9152 MHz',s:['demux4.c main loop','debounce · LEDs · Si5324 setup','DIP SW1 (SA) or UART (host)','watchdog 120 ms'],d:'Polls the FPGA through bit-banged SPI on the ALTERA0..11 pins. One register access ≈ 2 ms, so a pass takes 25–45 ms.'},
  flash:{x:40,y:460,w:150,h:60,t:'M25P16 flash',s:['bitstream 1.49 MB'],d:'Configures the Spartan-6 in SPI master mode after the MCU releases PROG_B (through Q1).'},
  ui:{x:220,y:460,w:220,h:60,t:'SW1 · LEDs · P8',s:['DIP 8 · SDI/GR1/GR2 LEDs · RS-485'],d:'SW1 on PB0..PB7 with pull-ups; LEDs on PE7/PE6/PE5; RS-485 through ADM3485 (PE3 = U7_TX_EN).'},
};
const WIRES=[['bnc','gtp','SDI'],['gtp','selb',''],['selb','dmx','20-bit video'],['dmx','sel8','24-bit × 8'],['sel8','aes',''],['aes','outs','AES3'],['selb','tx',''],['clk','aes','MCLK'],['clk','tx','TX ref'],['mcu','spi','ALTERA pins'],['spi','dmx','0x2A/0x2C/0x26'],['spi','selb','0x1B'],['spi','clk','0x05–0x08'],['flash','mcu',''],['ui','mcu','']];
function viewBlock(m){
  window.__demux4Active = false;
  m.innerHTML = `${card('Block diagram (click a block; colours follow the playhead)', `<div id="bdg" class="scroll"></div>`)}<div class="grid2">${card('Block', `<div id="bi"></div>`)}${card('Signal flow in one sentence', `<p>The FPGA does all the real-time work: it receives SDI, finds the audio packets in HANC, and re-encodes two groups as AES3 on a clock locked to the video. The ATmega128 only watches: it reads lock and audio-present flags over a slow bit-banged SPI link, debounces them, sets the group and pair from SW1 (or a host), lights the LEDs and calibrates the Si5324.</p>`)}</div>`;
  const draw=()=>{
    const t=absT(), F=sched().F; const live={gtp:F.rxLock(F.sel(t),t), dmx:F.grPres(1,t)||F.grPres(2,t), aes:outActive(0,t)||outActive(2,t), outs:outActive(0,t)||outActive(2,t), tx:F.txActive(t), clk:F.siLocked(t), mcu:!inSpin(t), spi:!!xferAt(t), bnc:world(t).cable[F.sel(t)], selb:F.configured(t), sel8:F.configured(t), flash:inCfg(t), ui:true};
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 1210 540" style="width:100%;min-width:760px"><defs><marker id="d4ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=D.selBlock===a||D.selBlock===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#d4ar)"/>${l?`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`:''}`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${D.selBlock===k?'var(--accent)':'var(--line)'}" stroke-width="${D.selBlock===k?2.5:1.2}"/>
        <circle cx="${b.x+b.w-12}" cy="${b.y+12}" r="5" fill="${live[k]?'var(--accent)':'var(--grid)'}"/>
        <text x="${b.x+8}" y="${b.y+19}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+36+i*15}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    s+='</svg>'; m.querySelector('#bdg').innerHTML=s;
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ D.selBlock=g.dataset.b; draw(); });
    const b=BLOCKS[D.selBlock]; m.querySelector('#bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p><p class="small muted">Live dot = ${live[D.selBlock]?'active':'idle'} at the playhead.</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- schematics (redrawn) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*17; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-16}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-3}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+21+i*17; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+4}" y="${yy+4}" font-size="10" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x-34}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+21+i*17; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-4}" y="${yy+4}" font-size="10" text-anchor="end" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x+w+34}" y="${yy+4}" font-size="10" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  return s; }
const SHEETS = [
  {name:'1 · Controller (S5)', note:'ATmega128L U6 from schematic sheet 5 (DEMUX-4-ISS2 #Schematic.pdf) and common.h / initPorts(). SW1 position n pulls PBn−1 to GND; LEDs through 332 Ω (R111–R113).', svg:()=> chip(330,50,200,'U6 ATmega128L-8AU',[['PA4','ALTERA8 = SPI_SCLK'],['PA5..7','ALTERA9..11 (unused)'],['PC0','ALTERA0 = SPI_RESET_N'],['PC1','ALTERA1 = SPI_CS (active high)'],['PC2','ALTERA2 = SPI_MOSI'],['PC3','ALTERA3 = SPI_MISO'],['PC4','ALTERA4 = Si5324_1_SCLK_IN'],['PC5..7','ALTERA5..7 (unused)'],['PD0','FPGA_PROG_B → Q1 2N4401'],['PD1..4','CONF_CCLK/MOSI/DIN/CSO_B'],['PG3','CONF_DONE'],['PG4','CONF_INIT_B'],['XTAL1/2','X5 4.9152 MHz']],[['PB0','SW1-1 input RX1/RX2'],['PB1','SW1-2 GR1 +2'],['PB2','SW1-3 GR1 +1'],['PB3','SW1-4 GR1 swap'],['PB4','SW1-5 GR2 +2'],['PB5','SW1-6 GR2 +1'],['PB6','SW1-7 GR2 swap'],['PB7','SW1-8 spare'],['PE7','SDI_LED → LED1 green'],['PE6','GR1_LED → LED2 yellow'],['PE5','GR2_LED → LED3 yellow'],['PE3','U7_TX_EN (RS-485)'],['PE0/PE1','RXD0/TXD0 → ADM3485 U7/U8 → P8']],'ICCAVR 7.15 · JTAG1 (JTAGICE mkII)')},
  {name:'2 · FPGA control pins (UCF)', note:'Pin locations copied from Demux4.ucf (V020100-StandAlone). The comments name the MCU side ALTERA0..11.', svg:()=> chip(330,40,210,'U1 XC6SLX45T-3FGG484',[['AB19','SPI_RESET_N #ALTERA0'],['AA18','SPI_CS #ALTERA1'],['AB18','SPI_MOSI #ALTERA2'],['AB17','SPI_MISO #ALTERA3'],['AA16','Si5324_1_SCLK_IN #ALTERA4'],['AB16/AB15/AA14','ALTERA5/6/7'],['AB12','SPI_SCLK_PAD #ALTERA8'],['AA12/AB13/AB14','ALTERA9/10/11'],['F7 / F14','SDI_EQ1_CD / SDI_EQ2_CD'],['D9/C9','SDI_EQ1_P/N (GTP X0Y0)'],['D13/C13','SDI_EQ2_P/N (GTP X1Y0)'],['B6/A6','SDI_CD1_P/N → GS2988'],['A5 / A4','SDI_CD1_EQ_EN / SDHD']],[['B1 / D1','EX_AES_OUT1 / OUT3'],['F1 / E3','EX_AES_IN1 / IN3'],['C1 / E4','AES_GR1/2_OUT_EN'],['F2 / F3','AES_GR1/2_IN_EN'],['G3 / D2','Q2_ON / Q4_ON'],['H2 H1 H3 G1','INT_AES_OUT1..4 → P4'],['J4 J3 J1 J6','INT_AES_OUT5..8 → P5'],['P3','MCLK_PAD (PLL1705)'],['R3 / T2','PLL1705_XT1 / SR'],['N1 / M1 / L1','ICS662_REF_IN / SEL3 / HDCLK'],['AB10…AB7','FPGA_TP1..7 → H2']],'ISE 14.1 · M25P16 SPI config')},
  {name:'3 · Clocks', note:'From Demux4.ucf, Demux4.v port comments and si5324.h/si5335.c. Si5324 output frequencies are calculated from the divider registers (fosc = 5.346 GHz for all three standards); the input clock per standard is '+'inferred'+'.', svg:()=> chip(80,60,190,'U19 Si5335',[['XTAL','X3 27 MHz'],['RESET','P22 Si5335_RESET'],['FS1','E22 (plan 148.5 / 148.35)'],['OEB0/2/3','L22 / T22 / U22']],[['CLK0','135 MHz M19/M20 (OEB0=1: off)'],['CLK2','RX_REF_CLK2 E12/F12'],['CLK3','RX_REF_CLK1 C11/D11'],['27M','CLK_27M L20 (DRP, free-run)'],['LOS','R22']],'clock generator')
     + chip(520,60,180,'U10 Si5324',[['IN1','REF_TX_CLK B2/A2 (from FPGA)'],['SPI','H10..H13 via spi.v'],['RST','D4'],['XA/XB','X1 114.285 MHz']],[['OUT2','TX_REF_CLK1 A10/B10 (LVDS)'],['OUT1','RCVRD_CLK1 G9/F10 (disabled)'],['C1B','C4 (CLKIN1 bad)']],'jitter cleaner')
     + chip(80,300,190,'U12 ICS662-03',[['REF_IN','74.25(/1.001) MHz, N1'],['S3','~TX1_M, M1']],[['CLK','HDCLK 27 MHz, L1']],'')
     + chip(520,300,180,'U13 PLL1705',[['XT1','PLL1705_XT1 = HDCLK'],['SR','T2 = 0']],[['SCKO','AUDIO_CLK → MCLK_PAD P3']],'12.288 MHz')
     + `<text x="80" y="440" font-size="11" fill="var(--ink2)">Si5324 (si5324.h): 3G N1_HS=6 NC2=6 N2=10×270 N31=75 → 148.5 MHz · HD N1_HS=6 NC2=12 N2=8×342 N31=38 → 74.25 MHz · SD N1_HS=9 NC2=4 N2=7×396 N31=14 → 148.5 MHz.</text>`},
  {name:'4 · SDI and AES I/O (S3, S4, S8)', note:'BNC assignments and AES IO from schematic sheets 4 and 8. Each AES BNC is shared by a DS34LV87T driver output and a DS34LV86T receiver input; Q2/Q4 switch the input termination.', svg:()=>{
    let s=''; const row=(y,l,mid,r)=> s+=`<text x="40" y="${y}" font-size="12" fill="var(--accent2)">${l}</text><line x1="200" y1="${y-4}" x2="300" y2="${y-4}" stroke="var(--ink)"/><rect x="300" y="${y-18}" width="170" height="28" fill="var(--panel2)" stroke="var(--ink)"/><text x="385" y="${y}" text-anchor="middle" font-size="11" fill="var(--ink)">${mid}</text><line x1="470" y1="${y-4}" x2="560" y2="${y-4}" stroke="var(--ink)"/><circle cx="572" cy="${y-4}" r="10" fill="none" stroke="var(--ink)"/><text x="590" y="${y}" font-size="12" fill="var(--ink)">${r}</text>`;
    row(60,'SDI_EQ1_P/N, CD ←','U2 LMH0394','BNC1 SDI_IN_BNC_1'); row(110,'SDI_EQ2_P/N, CD ←','U9 LMH0394','BNC2 SDI_IN_BNC_2'); row(160,'SDI_CD1_P/N →','U3 GS2988','BNC3 SDI_OUT_BNC');
    row(230,'EX_AES_OUT1 →','U15 DS34LV87T R1','BNC4 AES_BNC_1 (AES_IO_1)'); row(280,'EX_AES_OUT3 →','U15 DS34LV87T R3','BNC5 AES_BNC_2 (AES_IO_3)'); row(330,'EX_AES_IN1/IN3 ←','U16 DS34LV86T','same BNCs, Q2/Q4 terminate');
    row(400,'INT_AES_OUT1..4 →','30 Ω ×4 (R79–R86)','P4 PAN500'); row(450,'INT_AES_OUT5..8 →','30 Ω ×4 (R87–R94)','P5 PAN500'); return s; }},
  {name:'5 · Power (S6)', note:'Regulator part numbers read from the assembly silk (REG1–REG5) and the schematic index; rails are '+'inferred'+' from the LVCMOS33/LVCMOS25 and GTP requirements.', svg:()=> `<text x="40" y="60" font-size="12" fill="var(--ink)">P3 PAN500 power in → REG1 TPS54622 (switcher, L7 600R) → REG2/REG3 TPS7A7200 and REG4 TPS7A7001 LDOs → REG5 TPS79512 (bottom side)</text>
     <text x="40" y="90" font-size="12" fill="var(--ink2)">VCC_3v3 (ATmega128L, LVCMOS33 banks, ADM3485, DS34LV8x), 2.5 V (LVCMOS25 default bank), 1.2 V core and GTP supplies (MGTAVCC) — rails ${'inferred'}.</text>`},
];
let sheetIdx=0;
function viewSchem(m){
  window.__demux4Active = false;
  m.innerHTML = card('Schematic set — REDRAWN from net names in the .ucf, firmware headers and the Altium PDF (not the original CAD)', `<div id="st" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small muted"></p>
    <p class="small muted">The original Altium Designer sheets are <span class="mono">DEMUX4 - #Engineering/PCB/ISS2/Demux4-ISS2-S1…S9.SchDoc</span> (PDF print: <span class="mono">DEMUX-4-ISS2 #Schematic.pdf</span>, 9 sheets, 29 May 2014|47). Blue labels are nets.</p>`);
  const draw=()=>{
    m.querySelector('#st').innerHTML = SHEETS.map((s,k)=>`<button class="${k===sheetIdx?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#st button').forEach(b=>b.onclick=()=>{ sheetIdx=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 900 480" style="width:100%;min-width:680px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="888" height="468" fill="none" stroke="var(--line)"/><text x="880" y="465" text-anchor="end" font-size="10" fill="var(--ink2)">DEMUX-4 ISS2 · redrawn sheet ${sheetIdx+1}/${SHEETS.length} · ${SIM.year(2026)}</text>${SHEETS[sheetIdx].svg()}</svg>`;
    m.querySelector('#sn').textContent = SHEETS[sheetIdx].note;
  };
  draw();
}

/* ---------------- software ---------------- */
const REGN = {0:'DEVICE_ID',1:'VERSION_ID',2:'SCRATCH1',3:'SCRATCH2',4:'SI5324_STAT',5:'SI5324_CTRL1',6:'SI5324_CTRL2',7:'SI5335_STAT',8:'SI5335_CTRL',9:'CABLE_STAT',0x0A:'CABLE_CTRL',0x0B:'EX_AUD_CTRL_A',0x0C:'EX_AUD_CTRL_B',0x0D:'RX1_STAT1',0x0E:'RX1_STAT2',0x0F:'RX1_VPID1',0x10:'RX1_VPID2',0x11:'RX1_VPID3',0x12:'RX1_VPID4',0x13:'RX2_STAT1',0x14:'RX2_STAT2',0x15:'RX2_VPID1',0x16:'RX2_VPID2',0x17:'RX2_VPID3',0x18:'RX2_VPID4',0x19:'RX_VPID_STAT',0x1A:'RX_CTRL',0x1B:'TX1_CTRL1',0x1C:'TX1_VPID1',0x1D:'TX1_VPID2',0x1E:'TX1_VPID3',0x1F:'TX1_VPID4',0x20:'TX1_VPID_LINE_F1_1',0x21:'TX1_VPID_LINE_F1_2',0x22:'TX1_VPID_LINE_F2_1',0x23:'TX1_VPID_LINE_F2_2',0x24:'GTP_STAT',0x25:'GTP_CTRL',0x26:'DEMUX_STAT1 (MCU: HD_DEMUX_STAT1)',0x27:'HD_DEMUX_STAT2',0x28:'HD_DEMUX_STAT3',0x29:'HD_DEMUX_STAT4',0x2A:'DEMUX_CTRL1',0x2B:'HD_DEMUX_CTRL2',0x2C:'DEMUX_CTRL3',0x2D:'TX1_CTRL2',0x2E:'INT_AES_CTRL'};
const REGB = {0x08:'-|-|-|fs1|oeb3|oeb2|oeb0|reset',0x09:'-|-|-|-|-|-|eq_2_cd|eq_1_cd',0x0A:'-|-|-|set_eq_cd_sr|rst_eq2|rst_eq1|-|cd_1_eq_en',0x0B:'-|-|-|-|-|q4_on|-|q2_on',0x0C:'-|-|grp2_out|grp1_out|-|-|grp2_in|grp1_in',0x0D:'t_locked|t_scan|level_b|bit_rate|3g|hd|sd|locked',0x13:'t_locked|t_scan|level_b|bit_rate|3g|hd|sd|locked',0x0E:'t_rate[3:0]|t_family[3:0]',0x1B:'stream_sel|ins_crc|f2_en|ovr_vpid|ins_vpid|ins_edh|ins_ln|tx_rst',0x24:'-|-|-|-|-|txusrclk0|rxusrclk1|rxusrclk0',0x25:'-|-|-|-|-|gtp1_rst0|gtp0_rst1|gtp0_rst0',0x26:'-|-|-|-|-|-|gr2_detect|gr1_detect',0x2A:'-|-|-|-|gr2_sel[1:0]|gr1_sel[1:0]',0x2C:'-|-|-|-|-|-|gr2_reset|gr1_reset',0x2D:'-|-|-|-|-|-|dcm_reset|vid_fifo_rst',0x2E:'-|-|-|-|swap_aes2|rst_gr2|rst_gr1|swap_aes'};
const FLOW = [
  [0,'WDR()','kick the watchdog (120 ms)'],[1,'getEqCD(input)','xRead 0x09: EQ_CD_SR latch'],[2,'input != pInput ?','selectInput · SetEqCdSr · setupSi5335'],[3,'debounceCableCd (15)','UNLOCKED → assert/clearRstEqCdSr'],
  [4,'getVidStandard(input)','xRead 0x0D or 0x13, 1–5 times'],[5,'3G-B → UNLOCKED · debounceVidStandard (30)','unlock_counter++ → >1000: while(1)'],[6,'SDI unlocked / locked','set/clearDemuxReset · AES resets · SDI LED'],
  [7,'processLockStatus','new lock → initSi5324 + si5324SetupPll + ICAL'],[8,'iCal ? si5324GetLockStatus (10)','locked → release TX DCM/GTP/FIFO/TX'],[9,'getAudioDetect(1/2) · debounce (10)','xRead 0x26 twice'],
  [10,'GR1/GR2 AES reset · LEDs','0x2E read-modify-write ×2'],[11,'getAudioGroups()','SW1 (SA) or audio_select1 (host) → 0x2A, 0x2E'],[12,'getSelectedInput()','PINB & BIT0 (SA) or input_select1'],
];
function viewSoft(m){
  window.__demux4Active = true;
  m.innerHTML = `<div class="grid2">${card('ATmega128 main loop (demux4.c) — the step running at the playhead is lit', `<div id="fl"></div>`)}
    <div>${card('Lock acquisition — debounce state machines, live', `<div id="fsm"></div>`)}${card('How the buttons did things — switch → code → register → FPGA', `<div id="btn"></div>`)}</div></div>
    <div class="grid2">${card('SPI register map (Control/spi.v), live at the playhead', `<div id="rm" class="scroll" style="max-height:520px"></div>`)}
      <div>${card('FPGA pipeline, live', `<div id="pipe"></div>`)}${card('Host UART protocol (processUart / timer0_ocm_isr)', `<div id="ua"></div>`)}${card('Last action', `<div id="trace" class="log"></div>`)}</div></div>`;
  const draw=()=>{
    const t=absT(), s=sched(), F=s.F, o=opAt(t), cur = inSpin(t)? 5 : (o && typeof o.step==='number'? o.step : -1);
    let f=`<svg viewBox="0 0 560 ${FLOW.length*40+90}" style="width:100%"><defs><marker id="d4a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <rect x="120" y="6" width="320" height="28" rx="14" fill="${o&&typeof o.step!=='number'?'var(--warn)':'var(--chip)'}" stroke="var(--line)"/><text x="280" y="25" text-anchor="middle" font-size="11.5" fill="var(--ink)">${o&&typeof o.step!=='number'? 'BOOT '+o.step+': '+o.label.slice(0,48)+'…' : 'main(): init, PROG pulse, wait DONE, initXSpi/Si5335/Si5324/ExAes'}</text>`;
    FLOW.forEach(([k,a,b],j)=>{ const y=44+j*40, on=cur===k, bad=inSpin(t)&&k===5;
      f+=`<line x1="280" y1="${y-10}" x2="280" y2="${y}" stroke="var(--ink2)" marker-end="url(#d4a2)"/><rect x="30" y="${y}" width="500" height="30" rx="6" fill="${bad?'var(--bad)':on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
        <text x="40" y="${y+13}" font-size="11.5" font-family="var(--mono)" fill="${on||bad?'#fff':'var(--ink)'}">${a}</text><text x="40" y="${y+26}" font-size="10" fill="${on||bad?'#eef':'var(--ink2)'}">${b}</text>`; });
    const yb=44+FLOW.length*40; f+=`<path d="M530 ${yb-25} h20 V40 h-20" fill="none" stroke="var(--ink2)" marker-end="url(#d4a2)"/><text x="30" y="${yb+18}" font-size="11" fill="var(--ink2)">${o? (typeof o.step==='number'?'pass #'+o.pass+' · '+SIM.fmtDur(o.t1-o.t0)+' in this step':'boot') : ''} · while(1) — ${s.passes.filter(p=>p.t0>=page0()&&p.t0<page0()+1).length} passes in this second</text></svg>`;
    m.querySelector('#fl').innerHTML=f;
    const sn=o? o.s : null;
    const bar=(lbl,v,max,ok)=>`<div style="display:grid;grid-template-columns:150px 1fr 70px;gap:6px;align-items:center;margin:3px 0"><span class="small mono">${lbl}</span><span style="background:var(--grid);border-radius:4px;height:12px;position:relative"><span style="position:absolute;left:0;top:0;bottom:0;width:${Math.min(100,v/max*100)}%;background:${ok?'var(--accent)':'var(--warn)'};border-radius:4px"></span></span><span class="small mono">${v}/${max}</span></div>`;
    m.querySelector('#fsm').innerHTML = sn? bar('cableCounter',sn.cableCounter,15,sn.cableCd)+bar('rxLockCounter',sn.rxLockCounter,30,sn.vidStandard)+bar('txClockCounter',sn.txClockCounter,10,sn.txClock)+bar('audio1DetectCounter',sn.a1,10,sn.gr1Audio)+bar('audio2DetectCounter',sn.a2,10,sn.gr2Audio)+bar('unlock_counter',sn.unlock_counter,1001,false)
      + `<svg viewBox="0 0 520 70" style="width:100%;margin-top:6px">${['no carrier','cable debounce','SDI debounce','Si5324 ICAL','TX released','audio debounce','GR LEDs on'].map((n,k)=>{ const stg = !sn.cableCd? (sn.cableCounter?1:0) : !sn.vidStandard? 2 : sn.iCal? 3 : (!sn.gr1Audio&&!sn.gr2Audio)? 5 : 6; return `<rect x="${4+k*73}" y="14" width="68" height="34" rx="6" fill="${stg===k?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${38+k*73}" y="35" text-anchor="middle" font-size="9.5" fill="${stg===k?'#fff':'var(--ink)'}">${n}</text>`; }).join('')}</svg>` : '<span class="muted">—</span>';
    m.querySelector('#btn').innerHTML = `<table class="kv"><tr><th>Operator</th><th>Firmware path</th><th>Register / FPGA</th></tr>
      <tr><td>SW1-1</td><td class="mono small">getSelectedInput → input; next pass: selectInput, assert/clearSetEqCdSr, setupSi5335</td><td class="small">0x1B bit 7 TX1_STREAM_SELECT; 0x0A bit 4; 0x08 OEB2/OEB3 + reset</td></tr>
      <tr><td>SW1-2/3, 5/6</td><td class="mono small">getAudioGroups → getSaGrpSel → setDmxGroupSelect</td><td class="small">0x2A bits 1:0 / 3:2 → DMX_GRn_GROUP_SEL → hd_demux_xlx.group_sel, sd_demux_top.GROUPn_SEL</td></tr>
      <tr><td>SW1-4 / SW1-7</td><td class="mono small">getSaPrSel → set/clearSwapAes, set/clearSwapAes2</td><td class="small">0x2E bit 0 / bit 3 → swap_audio SWAP_CH13/24, SWAP_CH57/68</td></tr>
      <tr><td>Plug / unplug</td><td class="mono small">getEqCD → debounceCableCd → getVidStandard → debounceVidStandard → processLockStatus</td><td class="small">0x09 latch, 0x0A RST pulses, 0x0D/0x13, 0x2C demux reset, 0x2E AES resets, Si5324 via 0x05</td></tr>
      <tr><td>Host frame</td><td class="mono small">uart0_rx_isr → processUart → (main) getAudioGroups / getSelectedInput</td><td class="small">same registers; reply via timer0_ocm_isr → UDR0</td></tr></table>`;
    const x=xferAt(t); let rm=`<table class="kv"><tr><th>Addr</th><th>Name</th><th>Bits (MSB…LSB)</th><th>Value</th></tr>`;
    for (let a=0;a<=0x2E;a++){ const v=F.read(a,t), hot=x&&x.a===a; rm+=`<tr class="${hot?'hl':''}"><td class="mono">0x${hex(a)}</td><td class="mono small">${REGN[a]||''}</td><td class="mono small">${REGB[a]||''}</td><td class="mono" style="white-space:nowrap">${hex(v)} <span class="muted">${bin(v)}</span></td></tr>`; }
    m.querySelector('#rm').innerHTML = rm+`</table><p class="small muted">0x26 is called X_REG_HD_DEMUX_STAT1 in xspi.h (with “active channel” nibbles) but DEMUX_STAT1 in spi.v (two detect bits). 0x27–0x29 always read 0: their inputs are commented out. 0x2C and 0x2E lie outside the 0x04–0x2D map in the README.</p>`;
    const i=F.sel(t), w=world(t), fmt=VF[w.fmt[i]];
    const stage=(x0,lbl,sub,on)=>`<rect x="${x0}" y="20" width="96" height="46" rx="6" fill="${on?'color-mix(in srgb,var(--accent) 30%,var(--panel2))':'var(--panel2)'}" stroke="var(--line)"/><text x="${x0+48}" y="40" text-anchor="middle" font-size="10.5" fill="var(--ink)">${lbl}</text><text x="${x0+48}" y="56" text-anchor="middle" font-size="9" fill="var(--ink2)">${sub}</text>`;
    m.querySelector('#pipe').innerHTML = `<svg viewBox="0 0 560 120" style="width:100%">${stage(4,'GTP RX'+(i+1),F.rxLock(i,t)?STD_NAME[F.curStd(t)]:'no lock',F.rxLock(i,t))}${stage(116,'demux',`G${F.grSel(1,t)+1} / G${F.grSel(2,t)+1}`,F.grPres(1,t)||F.grPres(2,t))}${stage(228,'swap',`${F.regAt(0x2E,t)&1?'GR1 swapped':'GR1 1/2'}`,true)}${stage(340,'aes_tx ×4',`${outActive(0,t)?'1':'·'}${outActive(1,t)?'2':'·'}${outActive(2,t)?'3':'·'}${outActive(3,t)?'4':'·'} running`,outActive(0,t)||outActive(2,t))}${stage(452,'SDI TX',F.txActive(t)?'running':'in reset',F.txActive(t))}
      <text x="4" y="94" font-size="10.5" fill="var(--ink2)">${w.cable[i]? fmt.name+' · '+fmt.rateTxt : 'no input'} · EQ_CD_SR ${F.cdLatch(t)?'SET':'clear'} · Si5324 ${F.siLocked(t)?'locked':'—'}</text></svg>`;
    const lastU = s.uart.filter(u=>u.t0<=t).slice(-4);
    m.querySelector('#ua').innerHTML = `<p class="small">Frame = 2 bytes (byte 1 bit 7 = 1, byte 2 bit 7 = 0). Command bits: 2:1 audio select, 0 swap, 4 input (1 = RX1). Reply bit 1 = video unlocked; bits 2–5 = GR1 audio missing (AMS4-Add; disabled in XTM4).</p><div class="mono small">${lastU.length? lastU.map(u=>`${u.dir==='rx'?'host → demux':'demux → host'} 0x${hex(u.b)} @ ${(u.t0-page0()).toFixed(4)} s`).join('<br>') : 'no traffic yet'}</div>`;
    m.querySelector('#trace').innerHTML = traceHTML();
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewFindings(m){
  window.__demux4Active = false;
  const SA='Atmel/V020401-StandAlone/', XS='Xilinx/V020100-StandAlone/SourceFiles/';
  m.innerHTML = card('What the DEMUX-4 firmware and FPGA are up to — findings from the source', `<ol>
    <li><b>A slow polling link.</b> <span class="mono">xRWByte()</span> (${SA}xspi.c) calls <span class="mono">wait(20)</span>, <span class="mono">wait(40)</span>, <span class="mono">wait(20)</span> per bit. With 7 cycles per <span class="mono">wait()</span> iteration (demux4.lis) at 4.9152 MHz, one register access takes about 2 ms, which is about 8 kHz SCLK. Demux4.ucf constrains SPI_SCLK_I to 8 MHz, a thousand times faster than it ever runs. A main-loop pass costs 25–45 ms, so the 30-pass SDI debounce alone takes about one second.</li>
    <li><b>The Failure-Test counter never resets.</b> In <span class="mono">main()</span> (demux4.c), <span class="mono">unlock_counter++</span> runs on every pass where the cable is good but video is unlocked, and nothing clears it except reaching 1001. Then <span class="mono">while(1);    //get a watchdog reset</span> lets the 120 ms watchdog reboot the MCU. Each re-lock adds 30 debounce passes to the count, so it adds up over time: after roughly 33 cable-good re-locks the unit reboots, even if each one was healthy (${inf}: depends on how re-locks happen).</li>
    <li><b>3G level B means endless reboots.</b> <span class="mono">if (vidStandard == LOCK_3GB) vidStandard = UNLOCKED;  //disable 3G level B for now</span>. A 3G-B source keeps the cable locked, so <span class="mono">unlock_counter</span> reaches 1001 in about 30 s, the watchdog fires, <span class="mono">main()</span> pulses PROG again and the FPGA reloads (≈6 s, ${inf}). The cycle repeats while the 3G-B source stays connected. Try lesson 8.</li>
    <li><b>Every reset reloads the FPGA.</b> The “Failure Test” block in <span class="mono">main()</span> does <span class="mono">enableFpga(); wait(1000); disableFpga(); wait(10000); enableFpga();</span>. On this board PD0 drives Q1 (2N4401), which inverts it onto CONF_PROG_B, so <span class="mono">disableFpga()</span> really does clear the FPGA. Any watchdog reset therefore costs a full configuration.</li>
    <li><b><span class="mono">lock3gb</span> doesn’t mean 3G-B.</b> It is set to YES when the <i>cable</i> is unlocked and only gates <span class="mono">unlock_counter</span>. It is never set by a 3G-B lock.</li>
    <li><b>Altera leftovers on a Xilinx board.</b> The MCU-to-FPGA pins are ALTERA0..11 in Demux4.ucf, Demux4.v and the PORTA/PORTC comments of <span class="mono">initPorts()</span>. <span class="mono">sspiSelect()</span> (sspi.c) says “chip select is done by setting a register in the Altera FPGA”. These come from the Cyclone-based Demux3 (R&amp;D archive, Quartus 5.1). Only ALTERA0–4 and ALTERA8 are used; ALTERA5–7 and 9–11 are declared “Unused Pin from Atmel to Xilinx”.</li>
    <li><b>Register 0x26 has two meanings.</b> xspi.h calls it <span class="mono">X_REG_HD_DEMUX_STAT1</span> with HD_GR1/GR2_ACTIVE_CHAN nibbles at bits 0 and 4. spi.v defines it as <span class="mono">demux_stat1</span> with only the two detect bits; the active-channel inputs and <span class="mono">hd_demux_stat2..4</span> updates are commented out. So <span class="mono">getHdChannelActive()</span> (demuxer.c) can never return a real channel count. Registers 0x27–0x29 always read 0.</li>
    <li><b>The register map runs past 0x2D.</b> The README says 0x04–0x2D, but the firmware relies on <span class="mono">X_REG_DEMUX_CTRL3 0x2C</span> and <span class="mono">X_REG_INT_AES_CTRL 0x2E</span> (resets and swaps), and <span class="mono">X_REG_TX1_CTRL2</span> sits out of order at 0x2D. <span class="mono">regs.txt</span> lists 0x2E without the stand-alone SWAP_AES2 bit 3.</li>
    <li><b>The SDI output can’t insert anything.</b> spi.v keeps register bits for CRC, EDH, line-number and VPID insertion (0x1B bits 1–6, VPID 0x1C–0x23), but the outputs are commented out, and in Demux4.v TX1_CORE has <span class="mono">.tx_insert_crc(1'b0) .tx_insert_edh(1'b0) .tx_insert_ln(1'b0) .tx_insert_vpid(1'b0)</span>. The serdes.c functions <span class="mono">setTxInsertVpid()</span> etc. write bits nothing reads. BNC3 is a re-clocked copy of the input.</li>
    <li><b>The FPGA holds the TX in reset by itself.</b> REF_EQ_CD presets the LDPE latch EQ_CD_SR, which presets four more latches (DCM, GTP, video FIFO, TX). Only the MCU’s reset pulses after a successful Si5324 ICAL clear them. A cable glitch stops BNC3 even if the firmware never notices.</li>
    <li><b>Both cable-detect bits are the same signal.</b> In Demux4.v, <span class="mono">.eq_1_cd(REF_EQ_CD_SR), .eq_2_cd(REF_EQ_CD_SR)</span> and <span class="mono">.rst_eq2_cd_sr()</span> is unconnected. That is why <span class="mono">main()</span> always calls <span class="mono">assertRstEqCdSr(RX1)</span>, even when the input is RX2. <span class="mono">getEqCD(input)</span> really reports “the selected input”.</li>
    <li><b>Group 2’s demux reset goes nowhere.</b> <span class="mono">DMX_GR2_RESET</span> is commented “//Unused”. HD_DEMUX_2 and the SD core’s RESET2 both use DMX_GR1_RESET. The firmware only ever calls <span class="mono">setDemuxReset(1)</span>.</li>
    <li><b>AES channel status is all zeros.</b> Every aes_tx instance has <span class="mono">.cs1(1'b0) .valid1(1'b0) .user1(1'b0)</span>, so receivers see consumer format with no sample-rate or professional flags. The stand-alone FPGA also gates the outputs: <span class="mono">EX_AES_OUT1 = DMX_GR1_PRES ? AUDIO1_AES : 1'b0</span>. Losing a group removes the AES3 carrier, so downstream gear doesn’t get digital silence.</li>
    <li><b>Default switches put Group 1 on both outputs and listen to BNC2.</b> <span class="mono">PORTB = 0xFF</span> enables pull-ups, so with every switch OFF <span class="mono">getSaGrpSel()</span> returns 0 for both groups and <span class="mono">getSelectedInput()</span> reads PB0 = 1 = RX2. <span class="mono">initPorts()</span> still labels PORTB “DIP1..8”; the unused <span class="mono">initTestPins()</span> would turn the same port into outputs TP1–TP8.</li>
    <li><b>Host builds: group 4 wraps to group 1.</b> V020102/V020202 <span class="mono">getAudioGroups()</span> do <span class="mono">group2 = group1 + 1</span>. Selecting group 4 for GR1 gives group2 = 4, and <span class="mono">setDmxGroupSelect()</span> masks it with 0x03 → Group 1. The swap block <span class="mono">swapAud = audio_swap1 …</span> is commented out in both host builds, although the README credits XTM4 with audio swap.</li>
    <li><b>Host reply bits don’t match the R&amp;D AMS82 host.</b> The demux replies 0x00/0x02 (+0x3C for missing audio). AMS82 V040000 <span class="mono">UART1_translate()</span> reads bit 6 as SD/HD (never set → always “HD”) and <span class="mono">SDI_AUDIO_MASK 0x01</span> for audio (never set). Bit 1 (<span class="mono">SDI_CARRIER_MASK 0x02</span>) agrees. The older reply in the commented-out ISR (0x72/0x70/0x30) did set bit 6 for SD (${inf}: the matching host version isn’t identified).</li>
    <li><b><span class="mono">getVidStandard()</span> can return garbage.</b> If the RX reports “locked” with none of the SD/HD/3G bits set, the local <span class="mono">standard</span> is never assigned (serdes.c). The model keeps the previous value.</li>
    <li><b>A same-lock format change doesn’t retune the Si5324.</b> <span class="mono">processLockStatus()</span> reprograms only on UNLOCKED → locked. <span class="mono">debounceVidStandard()</span> keeps counting if the standard changes from one locked value to another, so if a switch between HD and 3G happens faster than the ~2 ms between reads, the Si5324 keeps the old dividers (${inf}).</li>
    <li><b>Firmware version isn’t readable.</b> spi.v resets <span class="mono">versionID</span> to 8'h00 in both V020000 and V020100, and the MCU never reads registers 0x00–0x03. The DEBUG_MODE block in <span class="mono">main()</span> dumps 0x00–0x2D and Si5324 registers 0–142 (skipping gaps) for a JTAG debugger.</li>
    <li><b>Build paths cross versions.</b> V020401’s DEMUX4.mak and the .lis headers compile from <span class="mono">C:\\Ali\\Projects\\Demux4\\atmel\\sa\\V020400-StandAlone\\</span>, so the archived V020401 listings may come from the V020400 folder. The AMS8 build V020003 has “Henry’s fix for CBC”: all four debounce values set to 1.</li>
    <li><b>Unused and odd clocks.</b> <span class="mono">initSi5335()</span> turns the 135 MHz CLK0 off (<span class="mono">si5335SetAudioClock(DISABLE)</span>) although the README lists it. RCVRD_CLK1 from the Si5324 is an unused input. <span class="mono">si5324SetN2HS()</span> and <span class="mono">si5324SetN2LS()</span> both read-modify-write register 40. The Si5324 SCLK runs inverted twice (sspi.h <span class="mono">SSPI_SCLK_HIGH</span> clears PC4; spi.v inverts it again).</li>
    <li><b>Status registers update only on SPI clock edges.</b> In spi.v all the status copies (<span class="mono">rx1_stat1 &lt;= …</span>) are inside <span class="mono">always @(posedge sclk)</span>, so they are frozen between transfers. Each read returns a value sampled during the address phase of that same transfer.</li>
    <li><b>Corrected 2026|59:</b> the AMS4 host build no longer repeats host frames every 100 ms (a guess). In the AMS4 firmware (<span class="mono">ams1v203.asm</span>) <span class="mono">pole</span> waits 2 × 256 main-loop passes and <span class="mono">communication_control</span> another 50 before each command, ≈ 0.37 s at the AMS4's pass time, so the V020102 AMS4 build now sees a frame about every 0.37 s. The XTM4 build keeps the inferred 100 ms (see ams4.js).</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>CPU timing is cycle-counted from the listings (±5 %). FPGA receiver lock time ${SIM.fmtDur(T_RXLOCK)}, Si5324 ICAL ${SIM.fmtDur(T_ICAL)}, FPGA configuration ${CFG_T.toFixed(2)} s from the bitstream size at the default ConfigRate 2 — all ${inf}.</li>
    <li>The SDI source is simulated: channel n carries a ${chFreq(1)}·n Hz tone at −12 dBFS. Packets are placed in the line after their sample instant, groups in order, none on the line after the switching line (${inf}, simplified SMPTE 272/299). Control packets and EDH are not drawn.</li>
    <li>Host frames repeat about every ${AMS4_PERIOD*1000} ms for the V020102 AMS4 build (the AMS4's <span class="mono">pole</span> 2 × 256 + <span class="mono">communication_control</span> 50 main-loop passes, timed in ams4.js) and every ${HOST_PERIOD*1000} ms for the XTM4 build (${inf}), with the AMS82 byte pattern (${inf}). ISR execution time is ignored. 3G-B is never demuxed (${inf}).</li>
    <li>DIP switch numbering on the board (switch 1 at the top of SW1) and the “as shipped” all-OFF setting are ${inf}. No product photos are in the archive, so the board colours follow the fab notes (green mask, white silk).</li></ul>`)
   + card('Sources', `<ul class="small mono">
    <li>SA-DEMUX4 - #Master/README.md · DEMUX4 - #Engineering/Software/README.md · Atmel/README.md · Xilinx/README.md</li>
    <li>${SA}demux4.c, serdes.c, demuxer.c, cable.c, exaudio.c, si5324.c/.h, si5335.c, sspi.c/.h, xspi.c/.h, xilinx.c, common.h, demux4.lis, xspi.lis, DEMUX4.mak</li>
    <li>Atmel/V020102-AMS4, V020202-XTM4, V020003-AMS8 demux4.c</li>
    <li>${XS}Demux4.v, Demux4.ucf, Control/spi.v, Audio/aes_tx.v, aes_tx_clkdiv.v, swap_audio.v, mclkSync.v, Demuxer/HD/audio_det.v, hd_audio_demux_data.v, Demuxer/SD/sd_demux_top.v · stdaln.prm · Demux4.xise · Demux4_map.map</li>
    <li>Xilinx/obsolete_V020000/SourceFiles/Demux4.v · Demux4 - #RD #NOTES #RD31 #ARCHIVE /Software/Demux4/regs.txt · …/AMS82-Front/backup2/V040000/uart.c, AMS82.h</li>
    <li>DEMUX4 - #Engineering/DEMUX-4-ISS2 #Schematic.pdf · PCB/ISS2/DEMUX4-ISS2-ASSY.PDF · PCB/GERBERS/DEMUX4-FAB.PDF · PCB/ISS2/Demux4-ISS2 BOM.xlsx</li></ul>`);
}

/* ---------------- register plugin ---------------- */
function avgPass(){ const s=sched(), P0=page0(); const ps=s.passes.filter(p=>p.t0>=P0&&p.t0<P0+1&&p.t1); if (!ps.length) return 0.03; return ps.reduce((a,p)=>a+(p.t1-p.t0),0)/ps.length; }
SIM.register({
  footnotes: [{"text": "Artwork 2026|59: the stand-alone DEMUX-4 has no CorelDRAW panel of its own (none in SA-DEMUX4 - #Master); the board view stays on the top silk from DEMUX4-ISS2-ASSY.PDF.", "src": "SA-DEMUX4 - #Master/DEMUX4 - #Engineering/PCB/ISS2/DEMUX4-ISS2-ASSY.PDF"},
    {"text": "The ‘AMS82-DEMUX4’ CorelDRAW sheets are 2005|38–2006|39 AMS8-2 host panels, eight years before the RD31 board: the rear has an SDI IN 1/2, SDI OUT, COMP, Y, Cr, Cb top row and a four-legend SDI IN, SDI OUT, AES 1, AES2 plate, and is still titled AMS-81.", "src": "AMS8 #Engineering #TIM/AMS82/SILK/AMS82-DEMUX4-REARPANEL-SILK-CURVE.cdr"},
    {"text": "Those 2005 ‘CURVE’ sheets still hold their legends as live text (41 to 74 text objects each), and Backup_of_ copies of every sheet sit beside them.", "src": "AMS8 #Engineering #TIM/AMS82/SILK/AMS82-DEMUX4-SILK-CURVE.cdr"},
    {"text": "The board that was built fits the AMS8-2 centre plate with five BNCs (SDI IN 1, SDI IN 2, SDI OUT, AES OUT 1, AES OUT 2), the same five as BNC1–BNC5 on the board.", "src": "AMS82 - #Master/AMS82 - #ARTWORK #DA #2016/AMS8-2AAM (Demux 4).jpg"}],
  id:'demux4', name:'SA-DEMUX4 · 3G/HD/SD-SDI audio de-embedder (2013|46)', duration:1,
  product:'SA-DEMUX4 / DEMUX-4', year:2013, family:'SDI audio de-embedder (RD31)',
  folder:'SA-DEMUX4 - #Master',
  summary:'Board-level 3G/HD/SD-SDI de-embedder: a Spartan-6 receives SDI, pulls two audio groups out of HANC and re-encodes them as AES3; an ATmega128L boots it, tunes the Si5324/Si5335 clocks over bit-banged SPI, debounces lock and audio, lights three LEDs and reads an 8-way DIP switch (stand-alone) or a host UART (AMS4/AMS8/XTM4).',
  highlights:['Board on the real Issue 2 assembly silk, DIP/BNC/P8 clickable','Firmware main loop emulated pass by pass with cycle-counted SPI','SDI frames → lines → HANC audio packets → AES3 bits','11-step stand-alone and host tutorial','22 findings: watchdog reboot trap, 3G-B, ALTERA pins, dead TX insert bits'],
  depth:'Full model',
  stepUnits:[
    {label:'1 video frame', period:()=>1/curFmt(absT()).fr},
    {label:'1 video line', period:()=>lineT(curFmt(absT()))},
    {label:'1 MCU loop pass (avg)', period:()=>avgPass()},
    {label:'1 SPI register transfer', period:()=>XFER_T},
    {label:'1 SPI bit', period:()=>BIT_T},
    {label:'1 AES block (192 frames)', period:()=>192/48000},
    {label:'1 audio sample / AES frame', period:()=>1/48000},
    {label:'1 ms', period:()=>0.001},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[1001/30000,'1 frame (33 ms)'],[0.01,'10 ms'],[0.004,'4 ms (AES block, 2 SPI transfers)'],[0.0005,'500 µs (SPI bits)'],[0.0001,'100 µs (lines)'],[0.00003,'30 µs (1 HD line)'],[1/48000,'1 AES frame (20.8 µs)'],[0.000004,'4 µs (HANC packets)']],
  defaultZoom:1,
  init(){ SKEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the DEMUX-4', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
