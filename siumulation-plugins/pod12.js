/* =====================================================================
   POD12 — AES/EBU reclocking distribution amplifier, Ward-Beck Systems.
   Plugin for the WBS Device Simulator (../siumulation.html). Full model.

   Folder (manifest id pod12): #POD #SERIES/XXX - POD12 - #Master #OBSOLETE
   Two generations live in this folder:
   - ISS1 (1999|32 PCB, 2002|35 manual): one input, six outputs, front EQ button + LVL trim,
     LOCK / CONFIDENCE / NO LOCK tallies, CS8412 receiver + PIC16C54A. No firmware archived.
   - ISS2 (RD77 redesign, 2013|46–2014|47, sold as POD12A): POD12-1 ISS2 main board (AT90CAN128
     + Cyclone EP1C3 + 2 × CS8416 + AD1895 SRC) and POD12-2 rear module. Firmware IS archived here.

   Sources used (all inside the folder above unless noted):
   - POD12 - #Engineering/POD12 - #Software/…/#V020000/  v100w.c, D6202B.c/.h, cs84xx.c/.h, altera.c/.h,
     common.c/.h, V100W.mp, v100w.prj (MCU firmware V020000, 27 Jan 2014)
   - POD12 - Update - #RD #RD77/Software/Atmel/backup1/v100/  (earlier build, 8 Jan 2014) — diffed against V020000
   - POD12 - Update - #RD #RD77/Software/FPGA/v100/  D6201A.bdf/.qsf + VHDL (FPGA “D6201BV100”); the .bdf netlist
     was traced wire by wire for the FPGA tab
   - POD12 - #Engineering/POD12 - #ISS2 #GERBERS/POD12-ISS2.zip → POD12-iss2-net.ipc (IPC-D-356A, 15 Dec 2013)
   - POD12 - #Engineering/POD12 - #ISS2 #PCB/POD12-ISS2-BOM.xls (part values)
   - POD12 - #Engineering/POD12 - #SILK/POD12A-FRONT(FINAL CURVE).cdr and POD12A-75-110-REAR SILK(FINAL CURVE).cdr,
     converted with Inkscape (libcdr), cut into ink layers → assets/pod12-front-green.png, -front-white.png, -rear-white.png
   - POD12 - #Engineering/POD12 - #MANUAL/POD12A MANUAL.pdf (2014) and Obsolete/pod12.pdf, Pod12man.pdf (2002)
   - POD12 - #Engineering/POD12 - Functional Diagram.pdf (ISS1), POD12 - #MECHANICAL/Obsolete/POD12FRT, 1275RER, 12110RER
   - POD12 - #TESTREPORT/POD12A-02AV0000-13JAN14.pdf
   - photos for ink colours: #POD #SERIES/POD12A - #Master/POD12A - #ARTWORK #DA #2016/Pics/
   Anything not stated in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
"use strict";
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the archive; inferred">inferred</span>';
const card = (t,b,cls)=>`<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`;
const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
const ASSET = 'siumulation-plugins/assets/';
const hex2 = v=>(v&255).toString(16).toUpperCase().padStart(2,'0');
const bin8 = v=>(v&255).toString(2).padStart(8,'0');
const kHz = f=>(f/1000).toFixed(f%1000?1:0)+' kHz';

/* =====================================================================
   1. Constants (sources in comments; estimates marked)
   ===================================================================== */
const XTAL = 8e6;                         // v100w.c header: "Crystal: 8.0000Mhz" (X2, C74/C75 27 pF)
const CYC = {                             // cycle counts
  bit: 14.5,                              // write_data / CS8416_write_data inner loop, counted from altera.lis / cs84xx.lis
  byteCall: 15,                           // call + prologue + ret (estimate from the .lis)
  waitIter: 7,                            // wait(): wdr, subi, sbci, cpi, cpc, brne (common.lis)
};
const BYTE = 8*CYC.bit + CYC.byteCall;    // ≈ 131 cycles per bit-banged byte
const RD8416 = 3*BYTE + (8*14 + CYC.byteCall) + 22;   // CS8416_readN: header, address, header, read byte
const WR8416 = 3*BYTE + 14;                           // CS8416_writeN: header, address, data
const STEPS = [  // main-loop steps of v100w.c main() while(1)
  {n:'WDR · CS8416_READ_LOCK_ALL · INVERT_DATA', c:()=>2*RD8416+20, d:'Reads register 0x0C (RERR) of U5 then U6 over the bit-banged port C bus; 0 = locked. Astatus = INVERT_DATA(status).'},
  {n:'WDR · PROCESS_MODES', c:()=> (input2Active()?2:1)*WR8416+30, d:'Rewrites CS8416 register 0x04 every pass: 0x80 (RXP0 = flat input) or 0x89 (RXP1 = EQ input), for each active input.'},
  {n:'READ_DIP_SWITCHES · MIRROR(PINA)', c:()=>45, d:'PA7..PA4 → bits 0..3, inverted (ON = shorted to ground = 1).'},
  {n:'REFRESH_LEDS', c:()=>70, d:'LOCK/NO LOCK/EQ per active input, 1X8/1X4 from mode, SRC from src_is_active.'},
  {n:'WDR · ALTERA_write', c:()=>120+2*BYTE+10, d:'Recomputes mode/EQ from the DIP, builds data_upper/data_lower, shifts 16 bits into the FPGA (FPGA3 data, FPGA4 clock) and strobes FPGA2.'},
];
const K = {
  startup: 0.0041,      // AVR crystal start-up delay — fuse bytes are not archived (README) → inferred typical
  wait3000: (3000*CYC.waitIter+8)/XTAL,
  altReset: (1000*CYC.waitIter+10)/XTAL,
  fpgaCfg: 0.040,       // EP1C3 Active-Serial configuration from U7 M25P40: inferred (≈0.63 Mbit at 15–20 MHz DCLK)
  initRegs: 7*(WR8416+10)/XTAL,
  lockT: 0.020,         // CS8416 PLL lock time after RUN=1 or signal arrival: inferred
  wdt: 0.016,           // WDTCR=0x08 → 16K WDT-oscillator cycles ≈ 16 ms: inferred from the AT90CAN128 data sheet
  srcMclk: 24.576e6,    // X1 CSX-750V-24.576 (BOM) → AD1895 MCLK via FPGA pin 10 "vco" → pin 54 "src_mclk"
  srcMaxFs: 24.576e6/138, // AD1895 needs MCLK ≥ 138 × fs: inferred from the data sheet (not archived)
  srcDelay: 0.0030,     // AD1895 group delay: inferred
  fpgaLat: 2,           // FPGA re-encode latency in AES frames (i2s8416_aes.vhd: captured on LRCLK, loaded at next preamble) — inferred
};
// cable reach from the manuals (metres). ISS2 = POD12A manual 2014; ISS1 = pod12.pdf 2002
const REACH = { iss2:{'75':[300,750],'110':[150,250]}, iss1:{'75':[600,1500],'110':[250,600]} };
const FSLIST = [32000,44100,48000,88200,96000,176400,192000];
const OUTN = ['A1','A2','A3','A4','B1','B2','B3','B4'];
const DIPN = ['DUAL','SRC','EQ1','EQ2'];

/* =====================================================================
   2. Device state
   ===================================================================== */
const D = {
  iss:'iss2', fw:'V020000', ver:'75',
  power:true, powerAt:0,                 // power applied at t = 0 so the first second shows the boot
  dip:[0,0,0,0],                         // SW1 DUAL, SW2 SRC, SW3 EQ1, SW4 EQ2 (rear legend, confirmed by the firmware); 1 = ON
  dipAt:-1,
  in:[ {on:true, fs:48000, cable:40, at:-1, f:1000, dbfs:-20}, {on:true, fs:48000, cable:40, at:-1, f:400, dbfs:-18} ],
  iss1:{ eq:false, lvl:5, mon:false, loopThru:false },
  scopeOut:0, log:[]
};
const FACT = JSON.parse(JSON.stringify(D));
let tutIdx = 0;

/* =====================================================================
   3. Firmware model (V020000 / v100) — the same decisions as the C source
   ===================================================================== */
function dipByte(){ let b=0; D.dip.forEach((v,i)=>{ if(v) b|=1<<i; }); return b; }          // = MIRROR(PINA)
function modeRaw(){ return dipByte() & 0x03; }                                               // mode = dip_switches & 0x03
function mode(){ const m=modeRaw(); return m>=2 ? 2 : m; }                                  // ALTERA_write: else-branch forces OUTPUT_1x8_SRC
const MODEN = ['OUTPUT_1x8','OUTPUT_2x4','OUTPUT_1x8_SRC'];
function input2Active(){ return mode()===1 || mode()===2; }                                 // PROCESS_MODES
function eq1(){ return !!(dipByte() & 4); }
function eq2(){ return D.fw==='v100' ? (!!(dipByte()&8) && input2Active()) : (!!(dipByte()&8) && modeRaw()===1); }
function reach(k){ const r=REACH[D.iss][D.ver]; const e = D.iss==='iss1' ? false : (k===0?eq1():eq2()); return r[e?1:0]*Math.sqrt(48000/D.in[k].fs); }  // fs scaling inferred

/* ---- boot / pass schedule (ISS2) ---- */
let BP=null, BPK='';
function bootPlan(){ const key=D.powerAt+'|'+input2Active(); if (key!==BPK){ BPK=key; BP=bootPlan_(); } return BP; }
function bootPlan_(){
  const t0 = D.powerAt; let t=t0; const ph=[];
  const add=(name,dur,d)=>{ ph.push({name,t0:t,t1:t+dur,d}); t+=dur; };
  add('Reset · oscillator start-up', K.startup, 'Fuse bytes are not archived; start-up delay '+inf);
  add('port_init · watchdog_init · initialization', 40/XTAL, 'PORTC = 0xFF → PC0 = 1 → R62 → Q1 on → N_CONFIG low: the FPGA is held blank. CLI() and never SEI(): the program runs with no interrupts.');
  add('wait(3000) × 10', 10*K.wait3000, 'Each wait(3000) is 3000 × 7 cycles = '+SIM.fmtDur(K.wait3000)+'; WDR() inside keeps the watchdog fed. (ADC slot-address code between them is commented out: //Ali-Rem.)');
  add('ALTERA_RESET(1000)', K.altReset, 'PC0 high for 1000 loops, then low → Q1 off → N_CONFIG released: the EP1C3 starts loading itself from U7 M25P40.');
  const cfg0=t;
  add('wait(3000) × 20', 20*K.wait3000, '5 waits from the openGear code plus 15 added by “Ali-Add”. The FPGA configures meanwhile.');
  const rs0=t;
  add('init_CS8416: RS1/RS2 low, wait(3000) × 5', 5*K.wait3000, 'Both receivers held in reset (PC7, PC5 low).');
  add('CS8416_write_ALL × 7 (regs 00–06)', K.initRegs, '00=00 01=04 02=0B 03=BB 04=80 (RUN) 05=B0 06=10, both chips at once (CS1 and CS2 low together).');
  add('READ_DIP_SWITCHES · mode · ALTERA_write', (45+STEPS[4].c())/XTAL, 'dip_switch_enabled = YES, dashboard_enabled = NO (CAN/DashBoard never started).');
  return { ph, cfg:{t0:cfg0, t1:cfg0+K.fpgaCfg}, rsLow:rs0, run:t-(45+STEPS[4].c())/XTAL, loop:t };
}
function passCycles(){ return STEPS.reduce((a,s)=>a+s.c(),0) + 4; }
function passT(){ return passCycles()/XTAL; }
let SF=null, SFK='';
function stepFr(){ const key=''+input2Active(); if (key!==SFK){ SFK=key; SF=stepFr_(); } return SF; }
function stepFr_(){ let a=0; const tot=passCycles(); return STEPS.map(s=>{ const r=a; a+=s.c(); return [r/tot, a/tot]; }); }
function powered(t){ return D.power && t>=D.powerAt; }
function where(t){   // what the MCU is doing at t
  if (!powered(t)) return {kind:'off'};
  const B=bootPlan();
  if (t < B.loop){ const i=B.ph.findIndex(p=>t>=p.t0&&t<p.t1); return {kind:'boot', i, p:B.ph[i]}; }
  const P=passT(), n=Math.floor((t-B.loop)/P), f=((t-B.loop)/P)-n; const fr=stepFr(); let s=0; fr.forEach((r,j)=>{ if(f>=r[0]) s=j; });
  return {kind:'loop', n, step:s, t0:B.loop+n*P, P};
}
/* ---- receivers ---- */
function sigOK(k){ const c=D.in[k]; return c.on && c.fs>=30000 && c.fs<=192000 && c.cable<=reach(k); }
function lockAt(k,t){                 // CS8416 lock (hardware), ISS2: RUN=1 written during boot, then the PLL needs lockT
  if (!powered(t) || !sigOK(k)) return false;
  const B=bootPlan(); return t >= Math.max(B.run, D.in[k].at) + K.lockT;
}
/* the MCU only learns things once per pass: n = index of the last pass whose step s has finished by t (−1 = boot write) */
function lastPass(t, s){ const B=bootPlan(); if(!powered(t)||t<B.loop) return null; const P=passT(), fr=stepFr();
  let n=Math.floor((t-B.loop)/P); if (t < B.loop+n*P+fr[s][1]*P) n--; return n; }
function readTime(n){ const B=bootPlan(); return B.loop + n*passT() + stepFr()[0][1]*passT(); }
function seenAt(k,n){ return n>=0 && lockAt(k, readTime(n)) && (k===0 || input2Active()); }   // aesN_lock (aes2_lock is stale when input2 is INACTIVE; modelled as 0)
function mcuSeen(k,t){ const n=lastPass(t,4); return n!==null && seenAt(k,n); }               // value used by the last ALTERA_write
function srcFsOK(){ return D.in[0].fs<=K.srcMaxFs && D.in[1].fs<=K.srcMaxFs && D.in[1].fs/D.in[0].fs<=7.75 && D.in[0].fs/D.in[1].fs<=8; }
function srcActive(t){ return mode()===2 && mcuSeen(1,t); }                                  // src_is_active
function dataLower(t){                 // ALTERA_write, exactly as coded (V020000 and v100 agree here)
  let b = 0x0C;                        // tone_generation1/2 = NO → BIT2, BIT3 set
  const n = lastPass(t,4); const write = n===null ? 1 : n+2;        // the boot ALTERA_write is call #1
  if (write <= 4) b &= ~0x20; else b |= 0x20;                       // src_reset = YES until src_reset_count reaches SRC_CONSTANT (3)
  const m=mode(), a2 = n!==null && seenAt(1,n);
  if (m===0) b &= ~(0x10|0x02|0x01);
  else if (m===1){ b |= 0x02; b &= ~(0x10|0x01); }
  else if (a2){ b |= 0x10|0x04|0x02|0x01; b &= ~0x08; }
  else { b &= ~(0x10|0x02|0x01); b |= 0x04|0x08; }
  return b;
}
function dataUpper(t){ const n=lastPass(t,4); const a1=n!==null&&seenAt(0,n), a2=n!==null&&seenAt(1,n); return ((a1?0:1)<<7) | ((a2?0:1)<<6); }
/* ---- FPGA (D6201A.bdf traced) ---- */
function fpga(t){
  const lo=dataLower(t), up=dataUpper(t);
  return { q:[...Array(8)].map((_,i)=>(lo>>i)&1).concat([...Array(8)].map((_,i)=>(up>>i)&1)),
    selA: lo&1, selB: (lo>>1)&1, ext1: ((lo>>2)&1)?0:1, ext2: ((lo>>3)&1)?0:1, swSel:(lo>>4)&1, srcRst:(lo>>5)&1, off1:(up>>7)&1, off2:(up>>6)&1 };
}
/* ---- outputs ---- */
function outInfo(o,t){   // what output o carries at t
  if (D.iss==='iss1') return iss1Out(o,t);
  if (!powered(t)) return {live:false, why:'power off'};
  const B=bootPlan(); if (t<B.cfg.t1) return {live:false, why:'FPGA not configured (pins tri-stated, inferred)'};
  if (t<B.loop) return {live:false, why:'boot: CS8416s not running yet'};
  const F=fpga(t); const sel = o<4 ? F.selA : F.selB;          // switch2x1 inst20 (OUT1/OUT2) or inst21 (OUT3/OUT4)
  if (sel===0){ // aes1 encoder inst2: IN1 (ext_sel 0) or tone (ext_sel 1)
    if (!lockAt(0,t)) return {live:false, why:'IN1 not locked: no RMCK from U5, and q15 no_lock mutes inst2 (aes1 AND NOT off)'};
    if (F.off1) return {live:false, why:'muted by q15 no_lock until the next ALTERA_write'};
    return {live:true, src:0, fs:D.in[0].fs, tone:F.ext1===1, path:'U5 → inst2 i2s8416_aes → inst'+(o<4?'20':'21')};
  }
  // aes2 encoder inst3 runs on U6 clocks: IN2 (ext_sel 0) or sw2x2x1x24 (ext_sel 1 → SRC when q4 = 1)
  if (!lockAt(1,t)) return {live:false, why:'IN2 not locked: inst3 has no clock (U6 RMCK)'};
  if (F.off2) return {live:false, why:'muted by q14 no_lock2'};
  if (F.ext2 && F.swSel){
    if (!srcFsOK()) return {live:true, src:0, fs:D.in[1].fs, bad:true, path:'U5 → inst2 I2S → U9 AD1895 → inst23 i2s_par → inst22 → inst3', why:'AD1895 out of range (MCLK 24.576 MHz / 138 = '+kHz(K.srcMaxFs)+')'};
    return {live:true, src:0, fs:D.in[1].fs, viaSRC:true, silent:!lockAt(0,t), path:'U5 → inst2 I2S → U9 AD1895 → inst23 i2s_par → inst22 → inst3 (U6 clocks)'};
  }
  return {live:true, src:1, fs:D.in[1].fs, tone:F.ext2===1, path:'U6 → inst3 i2s8416_aes → inst'+(o<4?'20':'21')};
}
/* ---- LEDs ---- */
function leds(t){
  if (D.iss==='iss1') return iss1Leds(t);
  const L={pwr:powered(t)};
  const n=lastPass(t,3); if (n===null || n<0) return Object.assign(L,{x8:0,x4:0,src:0,eq1:0,eq2:0,l1:0,n1:0,l2:0,n2:0});   // port_init leaves every MCU LED off
  const a1=seenAt(0,n), a2=seenAt(1,n), m=mode();
  L.l1=a1; L.n1=!a1; L.eq1=eq1();
  if (input2Active()){ L.l2=a2; L.n2=!a2; L.eq2=eq2(); } else { L.l2=0; L.n2=0; L.eq2=0; }
  L.x4 = m===1; L.x8 = m!==1;
  L.src = D.fw==='V020000' && m===2 && n>0 && seenAt(1,n-1);   // src_is_active comes from the previous pass's ALTERA_write
  return L;
}
/* ---- ISS1 (2002) — hardware model, PIC firmware not archived ---- */
function iss1Eye(){   // residual cable loss after the equaliser, in "reach units" (1 = edge of lock without EQ) — all inferred
  const c=D.in[0]; const r=REACH.iss1[D.ver]; const u = c.cable/r[0]*Math.sqrt(c.fs/48000);
  const boost = D.iss1.eq ? (D.iss1.lvl/10)*(r[1]/r[0]) : 0;
  return u - boost;
}
function iss1Lock(t){ const c=D.in[0]; if(!powered(t)||!c.on||c.fs<30000||c.fs>50000) return false; const e=iss1Eye(); return e<=1 && e>=-0.9 && t>=Math.max(D.powerAt,c.at)+0.03; }
function iss1Conf(t){ const e=iss1Eye(); return iss1Lock(t) && (e>0.8 || e<-0.55); }       // eye-pattern warning band: inferred
function iss1Leds(t){ const lk=iss1Lock(t); return {pwr:powered(t), lock:lk, conf:iss1Conf(t), nolock:powered(t)&&!lk, eq:powered(t)&&D.iss1.eq}; }
function iss1Out(o,t){ if(!powered(t)) return {live:false,why:'power off'}; if(!iss1Lock(t)) return {live:false, why:'receiver not locked: no reclocked data to the drivers (inferred)'}; return {live:true, src:0, fs:D.in[0].fs, path:'EQ → CS8412 → re-clocked driver'}; }

/* =====================================================================
   4. Actions — each logs the firmware path it exercises
   ===================================================================== */
function act(name, fn){
  const trace=[]; const tr=s=>trace.push(s);
  fn(tr);
  D.log.unshift({t:SIM.t, name, trace, sum:summary()}); if (D.log.length>60) D.log.length=60;
  SIM.refresh();
}
function summary(){
  if (D.iss==='iss1'){ const L=iss1Leds(1); return `ISS1 · ${L.lock?'LOCK':'NO LOCK'}${L.conf?' + CONFIDENCE':''} · EQ ${D.iss1.eq?'ON lvl '+D.iss1.lvl:'off'}`; }
  return `${MODEN[mode()]} · IN1 ${lockAt(0,1)?'LOCK':'NO LOCK'} · IN2 ${lockAt(1,1)?'LOCK':'NO LOCK'}${mode()===2?(lockAt(1,1)&&srcFsOK()?' · SRC→'+kHz(D.in[1].fs):' · SRC idle'):''}`;
}
const A = {
  power(){ act(D.power?'Power off':'Power on', tr=>{ D.power=!D.power; if (D.power){ D.powerAt=SIM.t;
    if (D.iss==='iss1'){ tr('115 V AC → transformer → LM317/LM337 rails (ISS1 POD12.DSN) → PIC16C54A and CS8412 start; tallies follow the receiver flags (PIC program not archived)'); return; }
    tr('P1/P2 → PSU1 VOF-10-5 → VCC_5V (LED1 power on via R1) → REG1 LM1117-3.3 → VCC_3V3 → REG3 LM1117-ADJ → VCC_1V2 (really 1.52 V, R2 221R / R3 47R5)');
    tr('main(): initialization() → port_init(): PORTC = 0xFF, DDRC = 0xFD → PC0 high → R62 → Q1 → N_CONFIG low (FPGA held blank)');
    tr('watchdog_init(): WDTCR = 0x08 (≈16 ms, '+inf+') · CLI() — interrupts are never enabled again');
    tr('wait(3000) × 10 = '+SIM.fmtDur(10*K.wait3000)+' → ALTERA_RESET(1000) → PC0 low → EP1C3 loads from U7 M25P40 (DCLK / CONF_DATA / NCS / ASDI)');
    tr('wait(3000) × 20 → init_CS8416(): CS8416_RS1/RS2 low, 5 × wait(3000), high → CS8416_write_ALL(00..06) = 00 04 0B BB 80 B0 10');
    tr('READ_DIP_SWITCHES() → mode = dip & 0x03 → ALTERA_write() → while(1) at '+SIM.fmtDur(bootPlan().loop-D.powerAt)+' after power-on'); } else tr('All rails collapse; outputs stop, LEDs off'); }); },
  dip(i){ act(`Rear DIP ${i+1} (${DIPN[i]}) → ${D.dip[i]?'OFF':'ON'}`, tr=>{ D.dip[i]^=1; D.dipAt=SIM.t;
    const pin=[44,45,46,47][i], port=['PA7','PA6','PA5','PA4'][i];
    tr(`SW1 pin ${8-i} → R${72+i} (110 R) → U10 pin ${pin} ${port} = ${D.dip[i]?'0 (ON grounds it)':'1 (internal pull-up, PORTA = 0xFF)'}`);
    tr(`next pass: READ_DIP_SWITCHES() → MIRROR(PINA) → dip_switches = ${bin8(dipByte())}b`);
    tr(`ALTERA_write(): mode = dip_switches & 0x03 = ${modeRaw()}${modeRaw()===3?' → else-branch sets mode = OUTPUT_1x8_SRC (SRC overrides DUAL)':''} → ${MODEN[mode()]}`);
    if (i===0||i===1){ const m=mode();
      tr(m===0?'data_lower &= ~(BIT4|BIT1|BIT0): FPGA q0 = q1 = 0 → switch2x1 inst20 and inst21 both pick aes1 → all eight outputs carry INPUT A'
        : m===1?'data_lower |= BIT1: q1 = 1 → inst21 picks aes2 → B1–B4 carry INPUT B; A1–A4 stay on INPUT A'
        : 'SRC: if aes2_lock, data_lower |= BIT4|BIT2|BIT1|BIT0 and &= ~BIT3 → inst3 ext_sel = 1, inst22 sel = 1 → AD1895 output re-encoded on INPUT B clocks; else falls back to 1×8');
      tr(`REFRESH_LEDS: ${m===1?'DUAL_LED_ON (PG3) · SINGLE_LED_OFF':'SINGLE_LED_ON (PG4) · DUAL_LED_OFF'}${m===0?' · input2 = INACTIVE → LOCK2 and NO LOCK2 both dark':''}`); }
    if (i===2) tr(`eq1_active = ${eq1()?'YES':'NO'} → PROCESS_MODES: CS8416_write1(0x04, ${eq1()?'0x89':'0x80'}) → U5 receives ${eq1()?'RXP1 = IN1_EQ (EL5263 U1-B boost path)':'RXP0 = IN1 (flat buffer U1-A)'} · EQ1 LED PE3`);
    if (i===3) tr(`eq2_active = ${eq2()?'YES':'NO'}${D.fw==='V020000'?' (V020000: only when mode == OUTPUT_2x4)':' (v100: whenever input2 is ACTIVE)'} → CS8416_write2(0x04, ${eq2()?'0x89':'0x80'}) · EQ2 LED PE7`);
  }); },
  plug(k){ act(`${D.in[k].on?'Unplug':'Plug in'} INPUT ${'AB'[k]}`, tr=>{ const c=D.in[k]; c.on=!c.on; c.at=SIM.t;
    if (D.iss==='iss1'){ tr(c.on?'Signal → transformer → EQ → CS8412: LOCK once the receiver PLL settles':'CS8412 loses lock → PIC → NO LOCK tally and NO LOCK alarm (open collector, pin per Fig 1.1)'); return; }
    tr(`T${9+k} PE-65612 → I${k+1} termination jumper (R${k?'24/…':'25 110R / R35 75R'}) → U${k+1} EL5263 → R${k?22:12} IN${k+1} and R${k?23:13} IN${k+1}_EQ → U${5+k} CS8416 RXP0 / RXP1`);
    tr(c.on? `U${5+k} PLL locks after ≈${SIM.fmtDur(K.lockT)} (${inf}) → RERR (0x0C) UNLOCK clears → next CS8416_READ_LOCK_ALL sees 0 → Astatus bit ${k} = 1`
           : `U${5+k} RERR UNLOCK = 1 (only UNLOCK is unmasked: register 06 = 0x10) → Astatus bit ${k} = 0 → NO LOCK${k+1} LED, data_upper bit ${7-k} = 1 → FPGA q${15-k} mutes aes${k+1}`); }); },
  cable(k,v){ D.in[k].cable=v; D.in[k].at=SIM.t; act(`INPUT ${'AB'[k]} cable → ${v} m`, tr=>{ const r=reach(k);
    tr(`${D.ver} Ω reach at ${kHz(D.in[k].fs)}: ${Math.round(r)} m with EQ${k+1} ${D.iss==='iss1'?'(button)':(k?eq2():eq1())?'on':'off'} (manual figures; scaling with fs is ${inf})`);
    tr(v<=r? 'Within reach: the CS8416 holds lock':'Beyond reach: the receiver PLL drops lock → NO LOCK'); }); },
  fs(k,v){ act(`INPUT ${'AB'[k]} sample rate → ${kHz(v)}`, tr=>{ D.in[k].fs=+v; D.in[k].at=SIM.t;
    tr(`CS8416 re-locks; RMCK = 256 × fs = ${(256*v/1e6).toFixed(3)} MHz drives i2s8416_aes bit_counter → AES out at ${kHz(v)}`);
    if (mode()===2) tr(srcFsOK()? 'AD1895 within range' : `AD1895 out of range: MCLK 24.576 MHz / 138 = ${kHz(K.srcMaxFs)} max (test report: “SRC at 192KHz not work”)`); }); },
  ver(v){ act(`Rear module → POD12/${v}`, tr=>{ D.ver=v; tr(v==='75'?'POD12-2 rear with BNCs; jumpers I1/I2 → 75 R (R35/R36), O1–O8 → 75 R series (R37–R44)':'POD12-2 rear with Phoenix MCV1.5/3; jumpers → 110 R termination (R25/R26) and 110 R series (R27–R34)'); }); },
  fw(v){ act(`Load firmware ${v}`, tr=>{ D.fw=v; tr(v==='v100'?'RD77 backup1/v100 (8 Jan 2014): no SRC LED code; eq2_active = (dip & BIT3) in any mode with input 2 active':'V020000 (27 Jan 2014, test-report firmware 02AV0000): SRC_LED on PB0 driven from src_is_active; EQ2 only in OUTPUT_2x4'); }); },
  iss(v){ act(`Show ${v==='iss1'?'ISS1 (2002 POD12)':'ISS2 (2014 POD12-1 / POD12A)'}`, tr=>{ D.iss=v; D.powerAt=SIM.t; tr(v==='iss1'?'CS8412 receiver + PIC16C54A tallies, six outputs + monitor jack. The PIC program is not in the archive: tallies follow the manual':'AT90CAN128 + EP1C3 + 2 × CS8416 + AD1895: firmware V020000 and FPGA D6201BV100 are in this folder'); }); },
  eqBtn(){ act(`EQUALIZER ${D.iss1.eq?'off':'on'}`, tr=>{ D.iss1.eq=!D.iss1.eq; tr('Front push-button → equaliser stage in circuit (POD12 Functional Diagram: EQUALIZER block with LEVEL pot and EQ ON/OFF switch, EQ LED)'); tr('Residual eye after EQ: '+iss1Eye().toFixed(2)+' (1 = edge of lock, '+inf+')'); }); },
  lvl(d){ D.iss1.lvl=clamp(D.iss1.lvl+d,0,10); act(`EQ LVL → ${D.iss1.lvl}`, tr=>{ tr('EQ-LVL trimmer (RVM) sets the high-frequency boost'); tr(iss1Conf(1)?'CONFIDENCE still lit: eye too closed (or over-equalised)':'Eye open: CONFIDENCE out'); }); },
  mon(){ act(`Monitor jack ${D.iss1.mon?'unplugged':'plugged'}`, tr=>{ D.iss1.mon=!D.iss1.mon; tr('Seventh output on the front ¼-inch jack (for an Audio Bit Buddy or a POD11) — pod12.pdf'); }); },
  reset(){ const keep={iss:D.iss}; Object.assign(D, JSON.parse(JSON.stringify(FACT))); D.iss=keep.iss; D.powerAt=SIM.t; D.log=[]; SIM.refresh(); },
};

/* =====================================================================
   5. Panels
   ISS2: real silk (1714 × 321 px at 200 dpi, 8.57 × 1.606 in), parts placed on the artwork's own circles.
   ISS1: drawn to the same scale from POD12FRT / 1275RER / 12110RER (Obsolete mechanical) and Pod12man.pdf.
   ===================================================================== */
const PW=1714, PH=321;
const ART12='#POD #SERIES/POD12A - #Master/POD12A - #ARTWORK #DA #2016/POD12A-FRONT&REAR-SILK (CURVE).cdr';
const LEDPOS = { pwr:[299,219], x8:[551.5,219], x4:[611.5,219], src:[786.5,219], eq1:[846.5,219], eq2:[906.5,219], l1:[1081.5,219], n1:[1141.5,219], l2:[1361.5,219], n2:[1421.5,219] };
const LEDCOL = { pwr:'#8dff5a', x8:'#ffd23a', x4:'#ffd23a', src:'#ffd23a', eq1:'#ffd23a', eq2:'#ffd23a', l1:'#8dff5a', n1:'#ff4a3a', l2:'#8dff5a', n2:'#ff4a3a' };
const LEDREF = { pwr:'LED1 · VCC_5V via R1', x8:'LED7 · DA_1X8 · PG4 (pin 19)', x4:'LED8 · DA_1X4 · PG3 (pin 18)', src:'LED6 · SRC_LED · PB0 (pin 10)', eq1:'LED3 · EQ1 · PE3 (pin 5)', eq2:'LED5 · EQ2 · PE7 (pin 9)', l1:'LED2 · LOCK1 · PE0 (pin 2)', n1:'LED9 · NOLOCK1 · PD1 (pin 26)', l2:'LED4 · LOCK2 · PE4 (pin 6)', n2:'LED10 · NOLOCK2 · PD0 (pin 25)' };
const COLX=[264.5,420.5,576.5,732.5,888.5], ROWY=[71.5,201];
const JACK = { inA:[COLX[0],ROWY[0]], inB:[COLX[0],ROWY[1]], o:[[1,0],[1,1],[2,0],[2,1],[3,0],[3,1],[4,0],[4,1]].map(([c,r])=>[COLX[c],ROWY[r]]) };
function svgOpen(label,id){ return `<svg viewBox="0 0 ${PW} ${PH}" role="img" aria-label="${label}" style="width:100%;max-width:1000px;display:block;border-radius:8px">
  <defs><filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <rect width="${PW}" height="${PH}" rx="8" fill="var(--dev)"/>`; }
function screw(x,y){ return `<circle cx="${x}" cy="${y}" r="13" fill="#6d7175" stroke="#33363a" stroke-width="2"/><path d="M${x-7} ${y}h14M${x} ${y-7}v14" stroke="#2c2f33" stroke-width="3"/>`; }
function ledSVG(x,y,on,col,title,glow){ return `<g><title>${title}</title><circle cx="${x}" cy="${y}" r="15" fill="#090a0a"/><circle cx="${x}" cy="${y}" r="11" fill="${on?col:'#2b302b'}" ${on?`filter="url(#${glow})"`:''}/>${on?`<circle cx="${x-3}" cy="${y-4}" r="3" fill="#fff" opacity=".55"/>`:''}</g>`; }
function rocker(x0,y0,x1,y1,on){ const w=x1-x0,h=y1-y0; return `<g class="p12pwr" style="cursor:pointer"><title>Power rocker: click to switch ${on?'off':'on'}</title><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="8" fill="#08090a" stroke="#34373b" stroke-width="2"/>
  <rect x="${x0+14}" y="${on?y0+10:y0+h/2}" width="${w-28}" height="${h/2-10}" rx="6" fill="#1c1f22" stroke="#3b3f43" stroke-width="2"/><text x="${x0+w/2}" y="${on?y0+h/4+14:y0+3*h/4+6}" text-anchor="middle" font-size="26" fill="#5d6266">${on?'I':'O'}</text></g>`; }
function bnc(x,y,plugged,cls,title,live){ return `<g class="${cls||''}" style="${cls?'cursor:pointer':''}"><title>${title||''}</title><circle cx="${x}" cy="${y}" r="44" fill="#b6a05a" stroke="#6c5c24" stroke-width="3"/><circle cx="${x}" cy="${y}" r="29" fill="#e3d6a6"/><circle cx="${x}" cy="${y}" r="10" fill="#7a5f12"/>
  ${plugged?`<circle cx="${x}" cy="${y}" r="38" fill="#2b5f9e" opacity=".92"/><circle cx="${x}" cy="${y}" r="15" fill="#3d78bd"/>`:''}${live!=null?`<circle cx="${x+34}" cy="${y-34}" r="8" fill="${live?'#4cd07a':'#8a3b35'}"/>`:''}</g>`; }
function phx(x,y,plugged,cls,title,live){ return `<g class="${cls||''}" style="${cls?'cursor:pointer':''}"><title>${title||''}</title><rect x="${x-52}" y="${y-30}" width="104" height="60" rx="4" fill="#27a457" stroke="#0e5d2b" stroke-width="2"/>${[-32,0,32].map(d=>`<rect x="${x+d-12}" y="${y-15}" width="24" height="30" fill="#0e4d25"/><circle cx="${x+d}" cy="${y}" r="7" fill="#9aa"/>`).join('')}
  ${plugged?`<rect x="${x-48}" y="${y-26}" width="96" height="20" fill="#2b5f9e" opacity=".85"/>`:''}${live!=null?`<circle cx="${x+44}" cy="${y-38}" r="8" fill="${live?'#4cd07a':'#8a3b35'}"/>`:''}</g>`; }
function iec(cx,cy,w,h){ const x0=cx-w/2,y0=cy-h/2; return `<g><title>IEC inlet with fuse drawer, 100–230 V AC → PSU1 VOF-10-5</title><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="12" fill="#0b0c0d" stroke="#2c2f33" stroke-width="3"/><rect x="${x0+w*.2}" y="${y0+h*.18}" width="${w*.6}" height="${h*.64}" rx="10" fill="#141618"/>
  ${[[.38,.36],[.62,.36],[.5,.68]].map(([a,b])=>`<rect x="${x0+w*a-8}" y="${y0+h*b-16}" width="16" height="32" fill="#777"/>`).join('')}</g>`; }
function dipSVG(x0,y0,w,h,st){ const sw=w/4; let s=`<rect x="${x0-4}" y="${y0-4}" width="${w+8}" height="${h+8}" rx="3" fill="#3f7fcf" stroke="#1d4d8a" stroke-width="2"/>`;
  st.forEach((on,i)=>{ const x=x0+i*sw; s+=`<g class="p12dip" data-i="${i}" style="cursor:pointer"><title>SW1-${i+1} ${DIPN[i]}: ${on?'ON':'OFF'} — click to flip (→ U10 ${['PA7','PA6','PA5','PA4'][i]})</title><rect x="${x+3}" y="${y0}" width="${sw-6}" height="${h}" fill="#e9edf0"/><rect x="${x+5}" y="${on?y0+3:y0+h/2}" width="${sw-10}" height="${h/2-3}" fill="#272a2e"/></g>`; });
  return s; }

function frontISS2(t){
  const L=leds(t); let s=svgOpen('POD12 ISS2 front panel','g12f');
  s+=`<image href="${ASSET}pod12-front.svg" width="${PW}" height="${PH}"/>`;
  s+=rocker(130,56,231,208,D.power)+screw(49,162)+screw(1664,161);
  for (const k in LEDPOS){ const [x,y]=LEDPOS[k]; s+=ledSVG(x,y,!!L[k],LEDCOL[k],LEDREF[k],'g12f'); }
  return s+'</svg>';
}
function rearISS2(t){
  let s=svgOpen('POD12 ISS2 rear panel ('+D.ver+' Ω)','g12r');
  s+=`<image href="${ASSET}pod12-rear.svg" width="${PW}" height="${PH}"/>`;
  const J = D.ver==='75'? bnc : phx;
  s+=J(JACK.inA[0],JACK.inA[1],D.in[0].on,'p12in" data-k="0',`INPUT A (T9 → U5): ${D.in[0].on?'plugged — click to unplug':'empty — click to plug in'}`);
  s+=J(JACK.inB[0],JACK.inB[1],D.in[1].on,'p12in" data-k="1',`INPUT B (T10 → U6): ${D.in[1].on?'plugged — click to unplug':'empty — click to plug in'}`);
  JACK.o.forEach(([x,y],o)=>{ const oi=outInfo(o,t); s+=J(x,y,true,'p12out" data-o="'+o,`OUTPUT ${o+1} = ${OUTN[o]} (T${o+1}): ${oi.live?(oi.viaSRC?'IN A via SRC':'IN '+'AB'[oi.src])+' @ '+kHz(oi.fs):'no signal — '+oi.why}. Click to show it on the scope.`, oi.live); });
  s+=dipSVG(1129,187,96,54,D.dip)+iec(1483,142,249,218)+screw(50,162)+screw(1664,162);
  [[161,27],[161,287],[991,27],[991,287]].forEach(([x,y])=>s+=`<circle cx="${x}" cy="${y}" r="9" fill="#55595d"/>`);
  return s+'</svg>';
}
/* ---- ISS1 drawn panels (x positions from the Obsolete mechanical drawings, inches × 200) ---- */
const G='#34a853', W='#f0f0ec';
function t1(x,y,txt,sz,col,anchor,wt){ return `<text x="${x}" y="${y}" font-size="${sz}" fill="${col}" ${anchor?`text-anchor="${anchor}"`:''} font-family="Arial, Helvetica, sans-serif" ${wt?`font-weight="${wt}"`:''}>${txt}</text>`; }
function frontISS1(t){
  const L=iss1Leds(t); let s=svgOpen('POD12 ISS1 front panel (drawn)','g11f');
  s+=`<rect x="20" y="14" width="190" height="16" fill="${G}"/><rect x="560" y="14" width="1134" height="16" fill="${G}"/>`+t1(250,62,'PODS',54,W,null,'900')+t1(570,62,'by Ward-Beck Systems',24,G,null,'700');
  s+=t1(64,300,'POD-12 DIGITAL AUDIO DISTRIBUTION AMPLIFIER',25,W);
  s+=rocker(130,70,231,220,D.power)+screw(49,162)+screw(1664,161)+ledSVG(299,220,L.pwr,'#8dff5a','Power LED','g11f');
  s+=`<path d="M845 152 v-14 h170 v14" fill="none" stroke="${W}" stroke-width="3"/>`+t1(930,132,'STATUS',22,W,'middle');
  s+=ledSVG(869,220,L.lock,'#8dff5a','LOCK (green): receiver locked','g11f')+ledSVG(929,220,L.conf,'#ffd23a','CONFIDENCE (yellow): eye-pattern warning','g11f')+ledSVG(989,220,L.nolock,'#ff4a3a','NO LOCK (red)','g11f');
  s+=t1(860,262,'LOCK',20,W,'middle')+t1(929,188,'CONFIDENCE',17,W,'middle')+t1(1000,262,'NO LOCK',20,W,'middle');
  s+=`<path d="M1200 152 v-14 h220 v14" fill="none" stroke="${W}" stroke-width="3"/>`+t1(1310,132,'EQUALIZER',22,W,'middle');
  s+=ledSVG(1229,220,L.eq,'#ffd23a','EQ LED','g11f');
  s+=`<g class="p11eq" style="cursor:pointer"><title>EQUALIZER ON/OFF push-button — click</title><circle cx="1309" cy="220" r="28" fill="#1d2023" stroke="#55595d" stroke-width="3"/><circle cx="1309" cy="220" r="${D.iss1.eq?16:20}" fill="#3a3e42"/></g>`;
  const a=(-135+27*D.iss1.lvl)*Math.PI/180, dx=Math.sin(a)*13, dy=-Math.cos(a)*13;
  s+=`<g class="p11lvl" style="cursor:pointer"><title>LVL trimmer ${D.iss1.lvl}/10 — click right half to raise, left half to lower</title><circle cx="1389" cy="220" r="30" fill="transparent"/><circle cx="1389" cy="220" r="18" fill="#c9cbcc" stroke="#55595c" stroke-width="3"/><line x1="${1389-dx}" y1="${220-dy}" x2="${1389+dx}" y2="${220+dy}" stroke="#222" stroke-width="5" stroke-linecap="round"/></g>`;
  s+=t1(1309,272,'ON/OFF',18,W,'middle')+t1(1389,272,'LVL',18,W,'middle');
  s+=`<g class="p11mon" style="cursor:pointer"><title>DIGITAL MONITOR ¼-inch jack (seventh output) — click to plug</title><circle cx="1557" cy="159" r="39" fill="#bfc2c4" stroke="#6b6f73" stroke-width="3"/><circle cx="1557" cy="159" r="20" fill="#0c0d0e"/>${D.iss1.mon?'<circle cx="1557" cy="159" r="30" fill="#2b5f9e" opacity=".9"/>':''}</g>`;
  s+=t1(1557,226,'DIGITAL',17,W,'middle')+t1(1557,248,'MONITOR',17,W,'middle');
  return s+'</svg>';
}
function rearISS1(t){
  let s=svgOpen('POD12 ISS1 rear panel (drawn)','g11r'); const live=outInfo(0,t).live;
  if (D.ver==='75'){
    s+=bnc(190,75,D.in[0].on,'p11in',`INPUT (looping, HiZ): ${D.in[0].on?'click to unplug':'click to plug in'}`)+bnc(190,205,D.iss1.loopThru,'p11loop','INPUT loop-through (terminate with the internal TERM jumper or a 75 Ω cap)');
    [[400,75],[505,205],[610,75],[715,205],[820,75],[925,205]].forEach(([x,y],i)=>{ s+=bnc(x,y,true,'',`OUT ${i+1}: ${live?'reclocked AES':'no signal'}`,live)+t1(x,y>150?296:26,'OUT '+(i+1),19,W,'middle'); });
    s+=t1(190,300,'INPUT',20,W,'middle');
  } else {
    s+=phx(220,75,D.in[0].on,'p11in',`INPUT + − G: ${D.in[0].on?'click to unplug':'click to plug in'}`)+t1(220,30,'+  −  G',18,W,'middle')+t1(110,82,'INPUT',19,W);
    s+=phx(220,205,false,'','ALARM terminal: CONFIDENCE, NO LOCK, GND (open collector, same transistors as the CONTROL connector)')+t1(64,240,'ALARM',19,W);
    s+=`<rect x="449" y="40" width="476" height="70" rx="4" fill="#27a457" stroke="#0e5d2b" stroke-width="2"/>`;
    for(let i=0;i<18;i++) s+=`<rect x="${456+i*26}" y="55" width="20" height="38" fill="#0e4d25"/>`;
    s+=t1(687,140,'+ − G  + − G  + − G  + − G  + − G  + − G',17,W,'middle')+t1(687,170,'1        2        3        4        5        6',17,W,'middle')+t1(687,30,'OUTPUTS',20,W,'middle');
  }
  s+=`<g><title>CONTROL (DE-9): CONFIDENCE and NO LOCK open-collector alarms (Fig 1.1; pin labels lost in the archived conversion)</title><path d="M1110 130 h136 l-12 62 h-112 z" fill="#c9cbcc" stroke="#55595c" stroke-width="3"/>${[0,1,2,3,4].map(i=>`<circle cx="${1134+i*22}" cy="148" r="5" fill="#333"/>`).join('')}${[0,1,2,3].map(i=>`<circle cx="${1145+i*22}" cy="172" r="5" fill="#333"/>`).join('')}<circle cx="1079" cy="161" r="9" fill="#888"/><circle cx="1277" cy="161" r="9" fill="#888"/></g>`+t1(1178,232,'CONTROL',19,W,'middle');
  s+=`<circle cx="1454" cy="161" r="48" fill="#141516" stroke="#55595c" stroke-width="4"/><rect x="1440" y="128" width="28" height="66" rx="4" fill="#33363a"/>`+t1(1454,240,'FUSE',18,W,'middle');
  s+=`<circle cx="1534" cy="161" r="44" fill="#0b0c0d" stroke="#3c3f43" stroke-width="4"/><path d="M1534 161 L1700 300" stroke="#0b0c0d" stroke-width="26"/>`+t1(1560,40,'115 VAC, 1/2 A.S.B.',18,W,'middle');
  s+=t1(1400,300,'DISCONNECT POWER BEFORE SERVICING',15,W,'middle')+screw(50,162)+screw(1664,162);
  return s+'</svg>';
}
function frontSVG(t){ return D.iss==='iss1'? frontISS1(t) : frontISS2(t); }
function rearSVG(t){ return D.iss==='iss1'? rearISS1(t) : rearISS2(t); }
function bindPanel(root){
  root.querySelectorAll('.p12pwr').forEach(g=>g.onclick=()=>A.power());
  root.querySelectorAll('.p12dip').forEach(g=>g.onclick=()=>A.dip(+g.dataset.i));
  root.querySelectorAll('.p12in').forEach(g=>g.onclick=()=>A.plug(+g.dataset.k));
  root.querySelectorAll('.p12out').forEach(g=>g.onclick=()=>{ D.scopeOut=+g.dataset.o; SIM.refresh(); });
  root.querySelectorAll('.p11in').forEach(g=>g.onclick=()=>A.plug(0));
  root.querySelectorAll('.p11loop').forEach(g=>g.onclick=()=>{ D.iss1.loopThru=!D.iss1.loopThru; SIM.refresh(); });
  root.querySelectorAll('.p11eq').forEach(g=>g.onclick=()=>A.eqBtn());
  root.querySelectorAll('.p11mon').forEach(g=>g.onclick=()=>A.mon());
  root.querySelectorAll('.p11lvl').forEach(g=>{ g.onclick=e=>{ const r=g.getBoundingClientRect(); A.lvl((e.clientX-r.left)/r.width<0.5?-1:1); }; g.addEventListener('wheel',e=>{ e.preventDefault(); A.lvl(e.deltaY<0?1:-1); },{passive:false}); });
}
/* operator controls not on the panel (the signal you feed it) */
function controlsHTML(){
  const ins = D.iss==='iss1'? [0] : [0,1];
  return `<div class="small" style="display:flex;flex-wrap:wrap;gap:8px 16px;margin-top:8px;align-items:center">
    <label>Board <select id="p12iss"><option value="iss2" ${D.iss==='iss2'?'selected':''}>ISS2 · 2014 (POD12-1 = POD12A)</option><option value="iss1" ${D.iss==='iss1'?'selected':''}>ISS1 · 2002 POD12</option></select></label>
    ${D.iss==='iss2'?`<label>MCU firmware <select id="p12fw"><option value="V020000" ${D.fw==='V020000'?'selected':''}>V020000 (27 Jan 2014)</option><option value="v100" ${D.fw==='v100'?'selected':''}>v100 (8 Jan 2014)</option></select></label>`:''}
    <label>Rear <select id="p12ver"><option value="75" ${D.ver==='75'?'selected':''}>/75 (BNC)</option><option value="110" ${D.ver==='110'?'selected':''}>/110 (terminal)</option></select></label>
    <button id="p12rst">Factory state, power-on now</button></div>
    ${ins.map(k=>`<div class="small" style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:6px;align-items:center"><b>INPUT ${D.iss==='iss1'?'':'AB'[k]}</b>
      <button data-plug="${k}">${D.in[k].on?'Unplug':'Plug in'}</button>
      <label>fs <select data-fs="${k}">${FSLIST.map(f=>`<option value="${f}" ${f===D.in[k].fs?'selected':''}>${kHz(f)}</option>`).join('')}</select></label>
      <label>cable <input type="range" min="0" max="1600" step="10" value="${D.in[k].cable}" data-cab="${k}" style="width:150px;vertical-align:middle"> <span class="mono">${D.in[k].cable} m</span></label>
      <span class="muted">reach ${Math.round(reach(k))} m</span></div>`).join('')}`;
}
function bindControls(root){
  const q=s=>root.querySelector(s);
  if (q('#p12iss')) q('#p12iss').onchange=e=>A.iss(e.target.value);
  if (q('#p12fw')) q('#p12fw').onchange=e=>A.fw(e.target.value);
  if (q('#p12ver')) q('#p12ver').onchange=e=>A.ver(e.target.value);
  if (q('#p12rst')) q('#p12rst').onclick=()=>A.reset();
  root.querySelectorAll('[data-plug]').forEach(b=>b.onclick=()=>A.plug(+b.dataset.plug));
  root.querySelectorAll('[data-fs]').forEach(s=>s.onchange=()=>A.fs(+s.dataset.fs, +s.value));
  root.querySelectorAll('[data-cab]').forEach(s=>s.onchange=()=>A.cable(+s.dataset.cab, +s.value));
}

/* =====================================================================
   6. AES3 helpers and signals
   ===================================================================== */
function toneAt(k,t,fsOut){ const c=D.in[k]; const fs=fsOut||c.fs; const n=Math.floor(t*fs); return Math.pow(10,c.dbfs/20)*Math.sin(2*Math.PI*c.f*n/fs); }
function outSample(o,t){
  const oi=outInfo(o,t); if(!oi.live) return null;
  if (D.iss==='iss1') return toneAt(0,t-2/oi.fs);
  if (oi.tone){ const n=Math.floor(t*oi.fs); return 0.1*Math.sin(2*Math.PI*n/48); }        // tone_gen1: 48-step sine table, −20 dBFS
  if (oi.viaSRC) return oi.silent?0:toneAt(0,t-K.srcDelay,oi.fs);
  if (oi.bad) return Math.sin(t*1e5)*0.6*(Math.random()-0.5);
  return toneAt(oi.src, t-K.fpgaLat/oi.fs);
}
function subframe(sample, pre, fib, fs){
  let v=Math.round(clamp(sample,-1,0.99999988)*8388607); if (v<0) v+=1<<24;
  const b=new Array(32).fill(0); for(let i=0;i<24;i++) b[4+i]=(v>>i)&1;
  const cs0 = fs===48000?0x85:fs===44100?0x45:fs===32000?0xC5:0x05; b[30]= fib<8?(cs0>>fib)&1:0;
  let par=0; for(let i=4;i<31;i++) par^=b[i]; b[31]=par; return {pre,bits:b,raw:v};
}
function biphase(pre,bits,start){ const P={X:[1,1,1,0,0,0,1,0],Y:[1,1,1,0,0,1,0,0],Z:[1,1,1,0,1,0,0,0]}[pre];
  const lv=P.map(x=>start?1-x:x); let cur=lv[lv.length-1]; for(let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if(bits[i]) cur=1-cur; lv.push(cur); } return lv; }
function frameAt(o,t){ const oi=outInfo(o,t); const fs=oi.live?oi.fs:48000; const n=Math.floor(t*fs); const fib=n%192; const v=outSample(o,t);
  return {oi, fs, n, fib, A:subframe(v==null?0:v, fib===0?'Z':'X', fib, fs), B:subframe(v==null?0:v*0.9, 'Y', fib, fs), v}; }
function drawScope(cv, el, t){
  const o=D.iss==='iss1'?0:D.scopeOut; const F=frameAt(o,t); const {c,w}=SIM.canvas(cv,150);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), a2=SIM.css('--accent2'), warn=SIM.css('--warn'), bad=SIM.css('--bad');
  const lvA=biphase(F.A.pre,F.A.bits,0), lvB=biphase(F.B.pre,F.B.bits,lvA[lvA.length-1]), lv=lvA.concat(lvB), cw=(w-20)/lv.length;
  [[0,8,warn,'preamble'],[8,16,ink2,'aux'],[16,56,acc,'audio (20 MSBs)'],[56,64,a2,'V U C P']].forEach(([a,b,col,lb])=>[0,64].forEach(off=>{ c.fillStyle=col; c.globalAlpha=.12; c.fillRect(10+(off+a)*cw,22,(b-a)*cw,66); c.globalAlpha=1; c.fillStyle=ink2; c.font='10px sans-serif'; if((b-a)*cw>30) c.fillText(lb,12+(off+a)*cw,102); }));
  if (!F.oi.live){ c.strokeStyle=bad; c.lineWidth=2; c.beginPath(); c.moveTo(10,80); c.lineTo(w-10,80); c.stroke(); c.fillStyle=bad; c.font='12px sans-serif'; c.fillText('No transitions: '+F.oi.why.replace(/<[^>]+>/g,''),14,60); }
  else { c.strokeStyle=ink; c.lineWidth=1.5; c.beginPath(); lv.forEach((v,i)=>{ const x=10+i*cw, y=55+(v?-24:24); if(!i) c.moveTo(x,y); else c.lineTo(x,y); c.lineTo(x+cw,y); }); c.stroke(); }
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`OUTPUT ${D.iss==='iss1'?'1':(o+1)+' ('+OUTN[o]+')'} · subframe A (${F.A.pre})`,12,14); c.fillText('subframe B (Y)',14+64*cw,14);
  c.fillText(`bit cell ${SIM.fmtDur(1/(F.fs*64))} · frame ${SIM.fmtDur(1/F.fs)} · ${(F.fs*128/1e6).toFixed(3)} Mbaud biphase`,10,130);
  el.innerHTML = F.oi.live? `frame #${F.n.toLocaleString()} (block frame ${F.fib}${F.fib===0?' = Z preamble, block start':''}) · sample ${F.v==null?'—':F.v.toFixed(4)} → 24-bit ${F.A.raw.toString(16).toUpperCase().padStart(6,'0')}h · C bit ${F.A.bits[30]} · parity ${F.A.bits[31]} · path: ${F.oi.path}${F.oi.tone?' · <b>internal tone_gen1</b>':''}${F.oi.bad?' · <b style="color:var(--bad)">SRC out of range</b>':''}` : '<span class="muted">This output is silent at the playhead.</span>';
}

/* =====================================================================
   7. Timeline lanes
   ===================================================================== */
function boolLane(label, fn, color, h){ return {label, h:h||18, draw(c,X,t0,t1,y,hh){ const N=Math.min(900,Math.max(80,(X(t1)-X(t0))/1.5)), sp=t1-t0; c.fillStyle=color||SIM.css('--accent');
  for (let i=0;i<N;i++){ const tt=t0+sp*(i+.5)/N; if (fn(tt)) c.fillRect(X(t0+sp*i/N), y+3, (X(t1)-X(t0))/N+0.7, hh-6); } }}; }
function segLane(label, segsFn, h){ return {label, h:h||26, draw(c,X,t0,t1,y,hh){ const segs=segsFn(t0,t1); c.font='10.5px '+SIM.css('--sans');
  segs.forEach(sg=>{ const a=Math.max(X(sg.t0),X(t0)-2), b=Math.min(X(sg.t1),X(t1)+2); if (b<a) return; c.fillStyle=sg.col; c.globalAlpha=sg.alpha||.75; c.fillRect(a,y+3,Math.max(1,b-a),hh-6); c.globalAlpha=1;
    if (b-a>40 && sg.label){ c.fillStyle=sg.ink||'#fff'; c.save(); c.beginPath(); c.rect(a,y,b-a,hh); c.clip(); c.fillText(sg.label,a+4,y+hh/2+4); c.restore(); } }); }}; }
function framesLane(label, fsFn, liveFn, color){ return {label, h:22, draw(c,X,t0,t1,y,hh){
  const tm=(t0+t1)/2, fs=fsFn(tm); if(!fs){ return; }
  const pxPer=X(t0+1/fs)-X(t0);
  if (pxPer<2.2){ const N=Math.min(600,Math.max(60,(X(t1)-X(t0))/2)), sp=t1-t0; c.fillStyle=color; c.globalAlpha=.4; for(let i=0;i<N;i++){ const tt=t0+sp*(i+.5)/N; if(liveFn(tt)) c.fillRect(X(t0+sp*i/N),y+6,(X(t1)-X(t0))/N+.7,hh-12); } c.globalAlpha=1;
    c.fillStyle=SIM.css('--ink'); c.font='10.5px '+SIM.css('--mono'); c.fillText(`AES frames every ${SIM.fmtDur(1/fs)} (${kHz(fs)})`, X(t0)+6, y+hh/2+4); return; }
  const n0=Math.ceil(t0*fs), n1=Math.floor(t1*fs); for(let n=n0;n<=n1;n++){ const ta=n/fs; if(!liveFn(ta)) continue; c.fillStyle= n%192===0? SIM.css('--warn') : color; c.fillRect(X(ta),y+3,Math.max(1,Math.min(pxPer*0.12,6)),hh-6);
    if (pxPer>60){ c.fillStyle=SIM.css('--ink2'); c.font='10px '+SIM.css('--mono'); c.fillText((n%192===0?'Z ':'X ')+'#'+n,X(ta)+8,y+hh/2+4); } } }}; }
function bitsLane(label, o){ return {label:label, h:34, draw(c,X,t0,t1,y,hh){
  const F=frameAt(o,(t0+t1)/2); if(!F.oi.live){ c.fillStyle=SIM.css('--ink2'); c.font='10.5px sans-serif'; c.fillText('silent',X(t0)+6,y+hh/2+4); return; }
  const fs=F.fs, cell=1/(fs*128); if (X(t0+cell)-X(t0) < 1.2){ c.fillStyle=SIM.css('--ink2'); c.font='10.5px '+SIM.css('--mono'); c.fillText('biphase-mark half-cells every '+SIM.fmtDur(cell)+' — zoom to one frame to see them',X(t0)+6,y+hh/2+4); return; }
  c.strokeStyle=SIM.css('--accent'); c.lineWidth=1.3; c.beginPath(); let first=true;
  const f0=Math.floor(t0*fs), f1=Math.floor(t1*fs); let lvl=0;
  for (let n=f0;n<=f1;n++){ const Fm=frameAt(o,(n+0.5)/fs); const lv=biphase(Fm.A.pre,Fm.A.bits,lvl).concat(biphase(Fm.B.pre,Fm.B.bits,0)); 
    lv.forEach((v,i)=>{ const ta=n/fs+i*cell, x=X(ta), yy=y+hh/2+(v?-11:11); if(first){ c.moveTo(x,yy); first=false; } else c.lineTo(x,yy); c.lineTo(X(ta+cell),yy); }); lvl=lv[lv.length-1]; }
  c.stroke(); }}; }
const STEPCOL=['#2f7fbf','#6a5acd','#8a8f96','#c08a2a','#1f9a5a'];
function loopSegs(t0,t1){ const out=[]; const B=bootPlan(); if(!D.power) return out;
  B.ph.forEach((p,i)=>out.push({t0:p.t0,t1:p.t1,col:i%2?'#7a6a3a':'#9a7b2c',label:p.name}));
  const P=passT(), fr=stepFr(); const n0=Math.max(0,Math.floor((t0-B.loop)/P)), n1=Math.floor((t1-B.loop)/P);
  if (n1<n0) return out;
  if ((n1-n0) > 400){ out.push({t0:Math.max(B.loop,t0), t1, col:'#2f7fbf', alpha:.35, label:`${(n1-n0+1).toLocaleString()} main-loop passes × ${SIM.fmtDur(P)}`, ink:SIM.css('--ink')}); return out; }
  for (let n=n0;n<=n1;n++){ const ps=B.loop+n*P; fr.forEach((r,j)=>out.push({t0:ps+r[0]*P, t1:ps+r[1]*P, col:STEPCOL[j], label:STEPS[j].n.replace('WDR · ','')})); }
  return out; }
function lanesISS2(){
  const B=bootPlan();
  return [
    segLane('MCU U10 (AT90CAN128) — what main() is doing', loopSegs, 30),
    boolLane('N_CONFIG low (Q1 on, FPGA blank)', t=>powered(t)&&t<bootPlan().ph[3].t1, SIM.css('--warn')),
    boolLane('FPGA AS configuration (U7 → U8) '+'[time inferred]', t=>powered(t)&&t>=bootPlan().cfg.t0&&t<bootPlan().cfg.t1, '#9b59b6'),
    boolLane('CS8416 RS1/RS2 low (reset)', t=>powered(t)&&t>=bootPlan().rsLow&&t<bootPlan().run, SIM.css('--bad')),
    boolLane('Port C bus: CS8416_SEL1/SEL2 active', t=>{ const w=where(t); return w.kind==='loop'? (w.step<=1) : (w.kind==='boot' && w.i===6); }, '#2f7fbf'),
    boolLane('FPGA4 clock / FPGA2 strobe (shift_in)', t=>{ const w=where(t); return w.kind==='loop'? w.step===4 : (w.kind==='boot'&&w.i===7); }, '#1f9a5a'),
    framesLane('INPUT A (T9 → U5) AES frames', ()=>D.in[0].on?D.in[0].fs:0, t=>powered(t)||true, SIM.css('--accent2')),
    boolLane('U5 locked (RERR UNLOCK = 0)', t=>lockAt(0,t), SIM.css('--accent')),
    framesLane('INPUT B (T10 → U6) AES frames', ()=>D.in[1].on?D.in[1].fs:0, t=>true, SIM.css('--accent2')),
    boolLane('U6 locked', t=>lockAt(1,t), SIM.css('--accent')),
    boolLane('AD1895 active (src_is_active)', t=>srcActive(t), '#c08a2a'),
    framesLane('Outputs A1–A4 (FPGA OUT1/OUT2)', t=>{ const oi=outInfo(0,t); return oi.live?oi.fs:(D.in[0].fs); }, t=>outInfo(0,t).live, '#1f9a5a'),
    framesLane('Outputs B1–B4 (FPGA OUT3/OUT4)', t=>{ const oi=outInfo(4,t); return oi.live?oi.fs:(D.in[1].fs); }, t=>outInfo(4,t).live, '#1f9a5a'),
    bitsLane('OUTPUT '+(D.scopeOut+1)+' line (biphase)', D.scopeOut),
    boolLane('LED LOCK 1 (green)', t=>leds(t).l1, '#5ec95e', 14), boolLane('LED NO LOCK 1 (red)', t=>leds(t).n1, '#e0483a', 14),
    boolLane('LED LOCK 2 (green)', t=>leds(t).l2, '#5ec95e', 14), boolLane('LED NO LOCK 2 (red)', t=>leds(t).n2, '#e0483a', 14),
    boolLane('LED 1X8 / 1X4', t=>leds(t).x8||leds(t).x4, '#e0b030', 14), boolLane('LED SRC', t=>leds(t).src, '#e0b030', 14), boolLane('LED EQ1 / EQ2', t=>leds(t).eq1||leds(t).eq2, '#e0b030', 14),
  ];
}
function lanesISS1(){
  return [
    framesLane('INPUT (transformer → EQ → CS8412)', ()=>D.in[0].on?D.in[0].fs:0, t=>true, SIM.css('--accent2')),
    boolLane('CS8412 locked', t=>iss1Lock(t), SIM.css('--accent')),
    boolLane('CONFIDENCE (eye warning) '+'[inferred]', t=>iss1Conf(t), '#e0b030'),
    framesLane('OUT 1–6 + monitor (reclocked)', ()=>D.in[0].fs, t=>iss1Lock(t), '#1f9a5a'),
    bitsLane('OUT 1 line (biphase)', 0),
    boolLane('LED LOCK', t=>iss1Leds(t).lock, '#5ec95e', 14), boolLane('LED CONFIDENCE', t=>iss1Leds(t).conf, '#e0b030', 14), boolLane('LED NO LOCK', t=>iss1Leds(t).nolock, '#e0483a', 14),
    boolLane('ALARM NO LOCK (open collector on)', t=>iss1Leds(t).nolock, '#e0483a', 14),
  ];
}
function lanes(){ return D.iss==='iss1'? lanesISS1() : lanesISS2(); }

/* =====================================================================
   8. Simulator tab
   ===================================================================== */
function traceHTML(hint){ const e=D.log[0]; return e? `<div><b>${e.name}</b> at ${SIM.fmtT(e.t)}</div>`+e.trace.map(s=>`<div>→ ${s}</div>`).join('') : `<div class="muted">${hint||'Use a control on the panels. The firmware path it takes is listed here.'}</div>`; }
function logHTML(){ return D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span> → ${e.sum}</div>`).join('') || '<div class="muted">No actions yet.</div>'; }
function stateHTML(t){
  if (D.iss==='iss1'){ const L=iss1Leds(t), e=iss1Eye();
    return `<table class="kv"><tr><th>Board</th><td>ISS1 (2002): CS8412 + PIC16C54A — PIC program not archived</td></tr>
      <tr><th>Residual cable loss after EQ</th><td class="mono">${e.toFixed(2)} (lock needs −0.9…1.0, clean needs −0.55…0.8 — ${inf})</td></tr>
      <tr><th>Tallies</th><td class="mono">LOCK ${L.lock?'●':'○'} · CONFIDENCE ${L.conf?'●':'○'} · NO LOCK ${L.nolock?'●':'○'} · EQ ${L.eq?'●':'○'}</td></tr>
      <tr><th>Alarms (CONTROL / ALARM)</th><td class="mono">CONFIDENCE ${L.conf?'pulled low':'open'} · NO LOCK ${L.nolock?'pulled low':'open'}</td></tr>
      <tr><th>Outputs</th><td>${outInfo(0,t).live?'OUT 1–6 and the monitor jack carry the reclocked input at '+kHz(D.in[0].fs):'silent: '+outInfo(0,t).why}</td></tr></table>`; }
  const w=where(t), B=bootPlan(), F=fpga(t), lo=dataLower(t), up=dataUpper(t);
  const outs = [0,4].map(o=>{ const oi=outInfo(o,t); return `<tr><th>${o?'B1–B4':'A1–A4'}</th><td>${oi.live? (oi.viaSRC?'INPUT A through the AD1895, re-timed to INPUT B':'INPUT '+'AB'[oi.src])+' @ '+kHz(oi.fs)+(oi.tone?' (internal tone)':'')+(oi.silent?' — silent: INPUT A not locked':'')+(oi.bad?' — <b style="color:var(--bad)">garbage: '+oi.why+'</b>':'') : '<span style="color:var(--bad)">silent</span> — '+oi.why}</td></tr>`; }).join('');
  return `<table class="kv">
    <tr><th>MCU</th><td class="mono small">${w.kind==='off'?'unpowered':w.kind==='boot'?'boot: '+w.p.name:'pass #'+w.n.toLocaleString()+' · '+STEPS[w.step].n}</td></tr>
    <tr><th>Pass length</th><td class="mono">${SIM.fmtDur(passT())} = ${Math.round(passCycles())} cycles @ 8 MHz (${inf}: from .lis instruction counts) → ${Math.round(1/passT()).toLocaleString()} passes/s</td></tr>
    <tr><th>dip_switches · mode</th><td class="mono">${bin8(dipByte())}b · ${modeRaw()} → ${MODEN[mode()]}</td></tr>
    <tr><th>Astatus (U5, U6)</th><td class="mono">${lockAt(0,t)?'1':'0'} ${lockAt(1,t)?'1':'0'} · input2 ${input2Active()?'ACTIVE':'INACTIVE'} · eq1 ${eq1()?'YES':'NO'} eq2 ${eq2()?'YES':'NO'}</td></tr>
    <tr><th>ALTERA_write word</th><td class="mono">data_upper ${bin8(up)}b · data_lower ${bin8(lo)}b</td></tr>
    <tr><th>FPGA shift_in</th><td class="mono small">q0 ${F.selA} (OUT1/2 sel) · q1 ${F.selB} (OUT3/4 sel) · ext_sel ${F.ext1}/${F.ext2} · q4 ${F.swSel} (SRC/tone) · q5 src_reset ${F.srcRst?'released':'held'} · off ${F.off1}/${F.off2}</td></tr>
    ${outs}</table>`;
}
function viewSim(m){
  window.__pod12Active = true;
  m.innerHTML = `<div class="grid2"><div>
      ${card('Front panel at the playhead', `<div id="fp"></div><div id="ctl"></div>`)}
      ${card('Rear panel — click an input to plug it, the DIP to switch, an output to scope it', `<div id="rp"></div><div class="small muted" style="margin-top:4px">${D.iss==='iss1'?'ISS1 panels drawn from POD12FRT / 1275RER / 12110RER and Pod12man.pdf.':`ISS2 (POD12A) artwork: ${SIM.src(ART12,'POD12A-FRONT&REAR-SILK (CURVE).cdr')} (Jun.19/14 sheet, saved Jun 17 2016): FRONT GREEN, FRONT WHITE and REAR WHITE plates; the black panel outline, hole and connector layer is shown as faint guides.`}</div>`)}
    </div><div>
      ${card('What the firmware did (last action)', `<div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="st"></div>`)}
      <p class="small muted">Keys: <span class="mono">1–4</span> DIP switches · <span class="mono">A</span>/<span class="mono">B</span> plug inputs · <span class="mono">P</span> power · <span class="mono">E</span> ISS1 EQ button.</p>
    </div></div>
    ${card('Timeline — one second from power-on, zoomable (click to seek)', `<canvas id="tl"></canvas><p class="small muted">Boot phases and the pass length come from the code (wait(3000) = 21 000 cycles; bit-bang loops counted in the .lis files). FPGA configuration time, the CS8416 lock time and the AVR start-up delay are ${inf}. Zoom to “1 pass” to see the five steps of while(1), and to “1 AES frame” to see the biphase line.</p>`)}
    <div class="grid2">${card('Scope: selected output at the playhead (one AES3 frame)', `<canvas id="sc"></canvas><div id="bits" class="small mono"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#fp').innerHTML=frontSVG(t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML=rearSVG(t); bindPanel(m.querySelector('#rp'));
    const ctl=m.querySelector('#ctl'); ctl.innerHTML=controlsHTML(); bindControls(ctl);
    m.querySelector('#trace').innerHTML=traceHTML(); m.querySelector('#st').innerHTML=stateHTML(t); m.querySelector('#log').innerHTML=logHTML();
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220}); drawScope(m.querySelector('#sc'), m.querySelector('#bits'), t);
  };
  SIM.on('time', draw);
}
let keysBound=false;
function bindKeys(){ if (keysBound) return; keysBound=true; document.addEventListener('keydown', e=>{ if(!window.__pod12Active || (e.target.matches&&e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase(); const map={'1':()=>A.dip(0),'2':()=>A.dip(1),'3':()=>A.dip(2),'4':()=>A.dip(3),'a':()=>A.plug(0),'b':()=>A.plug(1),'p':()=>A.power(),'e':()=>A.eqBtn()};
  if (map[k]){ if (D.iss==='iss1' && /[1-4b]/.test(k)) return; map[k](); e.preventDefault(); } }); }

/* =====================================================================
   9. Tutorial (POD12A MANUAL.pdf for ISS2, pod12.pdf for ISS1)
   ===================================================================== */
const T_END=()=>Math.min(1, SIM.duration);
const LESSONS = [
  {title:'Meet the POD12', auto:true, body:`<p>Two boards share this folder. <b>ISS2</b> (2014) is a dual-input AES DA: one <b>1×8</b> or two <b>1×4</b> amplifiers, cable EQ per input and a sample-rate converter (manual: “POD12A DIGITAL AUDIO DISTRIBUTION AMPLIFIER … 30 kHz to 192 kHz”). <b>ISS1</b> (2002) is the original one-in, six-out reclocking DA.</p><p>The lessons use ISS2 first. Its firmware is in the folder, so every step below shows the code that ran.</p>`, check:()=>true, setup:()=>{ D.iss='iss2'; }},
  {title:'Power on and watch it boot', hint:'Click the power rocker twice (off, then on), or press P twice.', body:`<p>Switch the unit off and on. Then drag the playhead through the first 100 ms on the timeline.</p><p>For about ${Math.round(bootPlan().loop*1000)} ms only the green power LED is lit. main() is busy in 35 × <span class="mono">wait(3000)</span>, with ALTERA_RESET and init_CS8416 in between. The MCU LEDs come on with the first REFRESH_LEDS.</p>`, check:()=>D.log.some(e=>e.name==='Power on')},
  {title:'Feed INPUT A and check LOCK', hint:'If INPUT A is empty, click the INPUT A connector (or press A).', body:`<p>Plug a 48 kHz AES feed into <b>INPUT A</b>. The manual’s Table 1: “Input 1 Lock — Green — a valid AES/EBU signal is detected”.</p><p class="small muted">Code: CS8416_READ_LOCK_ALL reads register 0x0C of U5; 0 means locked → LOCK1_LED_ON (PE0).</p>`, check:()=>D.in[0].on && leds(T_END()).l1},
  {title:'1×8 mode: one input to eight outputs', hint:'All four DIP switches OFF (down).', body:`<p>With every DIP OFF the unit is a <b>1×8</b> DA (Table 2: “Dual — Off: 1x8 mode selected”). The 1X8 LED is lit. INPUT 2’s LOCK and NO LOCK are <b>both dark</b>: PROCESS_MODES marks input2 INACTIVE.</p><p>Click any output on the rear to scope it. All eight carry INPUT A.</p>`, check:()=>dipByte()===0 && leds(T_END()).x8},
  {title:'Dual 1×4: split the outputs', hint:'Flip DIP 1 (DUAL) ON, and plug INPUT B.', body:`<p>Turn on <b>DUAL</b> and plug <b>INPUT B</b>. Now A1–A4 carry INPUT A and B1–B4 carry INPUT B (silk: “A1 … B4”).</p><p class="small muted">ALTERA_write sets data_lower BIT1 → FPGA q1 → switch2x1 inst21 picks aes2 for FPGA OUT3/OUT4.</p>`, check:()=>mode()===1 && D.in[1].on && outInfo(4,T_END()).live && outInfo(4,T_END()).src===1},
  {title:'Long cable on INPUT A → EQ1', hint:'Set INPUT A cable to 500 m (75 Ω), see NO LOCK, then flip DIP 3 (EQ1) ON.', body:`<p>The manual: 300 m (75 Ω) / 150 m (110 Ω) without EQ, 750 m / 250 m with it. Push INPUT A to <b>500 m</b>: NO LOCK. Then turn <b>EQ1</b> on.</p><p class="small muted">PROCESS_MODES writes 0x89 to U5 register 04: RXSEL = RXP1, the EL5263 boost path (IN1_EQ).</p>`, check:()=>D.in[0].cable>=400 && eq1() && leds(T_END()).l1},
  {title:'EQ2 works only in dual mode', hint:'With DUAL ON, flip DIP 4 (EQ2) ON. Then try it with DUAL OFF.', body:`<p>“In 1x8 mode only EQ1 is available. In dual 1x4 mode both EQ1 and EQ2 are available, provided SRC is disabled.” Turn EQ2 on in dual mode and watch the EQ2 LED.</p><p class="small muted">V020000 line: <span class="mono">if ((dip_switches &amp; BIT3) &amp;&amp; (mode == OUTPUT_2x4)) eq2_active = YES;</span></p>`, check:()=>eq2() && leds(T_END()).eq2},
  {title:'SRC: INPUT B becomes the reference', hint:'Flip DIP 2 (SRC) ON. Keep INPUT B plugged and set it to a different rate from INPUT A (e.g. A 44.1 kHz, B 48 kHz).', body:`<p>Turn on <b>SRC</b>. The manual only says SRC “restricts operation to 1x8 mode”. The code and the FPGA show <b>what it converts to</b>: INPUT A is resampled by the AD1895 onto <b>INPUT B’s clock</b>, and all eight outputs carry it at B’s rate.</p><p>Without B the SRC LED stays dark and the outputs fall back to plain 1×8.</p>`, check:()=>srcActive(T_END()) && D.in[0].fs!==D.in[1].fs && outInfo(0,T_END()).viaSRC},
  {title:'SRC at 192 kHz', hint:'In SRC mode, set INPUT B (or A) to 192 kHz.', body:`<p>The 2014 test report notes: “SRC at 192KHz not work”. The AD1895’s master clock is X1, 24.576 MHz. The AD1895 needs MCLK ≥ 138 × fs (${inf}, from the data sheet), so its ceiling is ${kHz(K.srcMaxFs)}.</p>`, check:()=>mode()===2 && !srcFsOK()},
  {title:'Compare the two firmware builds', hint:'Choose MCU firmware v100 in the controls, with SRC on and INPUT B locked.', body:`<p>The RD77 folder holds the earlier build, <b>v100</b> (8 Jan 2014). It has no SRC LED code: SRC works but the LED never lights. It also lets EQ2 act on the reference input in SRC mode. V020000 removed that.</p>`, check:()=>D.fw==='v100' && mode()===2 && lockAt(1,T_END())},
  {title:'ISS1: CONFIDENCE and the LVL trim', hint:'Choose Board: ISS1. Set the cable to 700 m, press EQ (or E), then turn LVL until CONFIDENCE goes out.', body:`<p>The 2002 manual: CONFIDENCE (yellow) “is a warning that the incoming signal is approaching the limits … it may be necessary to activate the equalizer and adjust the gain”. On ISS1 the gain is the front <b>LVL</b> trimmer. Too much boost also closes the eye (${inf}).</p>`, check:()=>D.iss==='iss1' && D.in[0].cable>=600 && D.iss1.eq && iss1Lock(T_END()) && !iss1Conf(T_END())},
  {title:'Done', auto:true, body:`<p>See <b>Software</b> for the live main loop and FPGA routing, and <b>Findings</b> for what the code shows that the manual does not.</p>`, check:()=>true},
];
function viewTutorial(m){
  window.__pod12Active = true;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial: using the POD12', `<ol id="ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="le"></div></div>
    <div>${card('The unit', `<div id="u"></div><div id="ctl"></div>`)}${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div></div>`;
  const draw=()=>{
    const L=LESSONS[tutIdx]; if (L.setup && L._done!==true){ L.setup(); L._done=true; }
    m.querySelector('#u').innerHTML = frontSVG(SIM.t)+'<div style="height:6px"></div>'+rearSVG(SIM.t); bindPanel(m.querySelector('#u'));
    const ctl=m.querySelector('#ctl'); ctl.innerHTML=controlsHTML(); bindControls(ctl);
    m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;padding:2px 0;${i===tutIdx?'font-weight:700;color:var(--accent)':''}">${i+1}. ${l.title}${i<tutIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#ls li').forEach(li=>li.onclick=()=>{ tutIdx=+li.dataset.i; SIM.refresh(); });
    const ok=L.check();
    m.querySelector('#le').innerHTML=`<h2>${tutIdx+1}. ${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+L.hint+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="pv" ${tutIdx?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${tutIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>
      <p class="small muted">The goal is checked at the end of the simulated second, after the receivers have had time to lock.</p>`;
    m.querySelector('#pv').onclick=()=>{ tutIdx=Math.max(0,tutIdx-1); SIM.refresh(); };
    m.querySelector('#nx').onclick=()=>{ tutIdx=Math.min(LESSONS.length-1,tutIdx+1); SIM.refresh(); };
    m.querySelector('#rs').onclick=()=>{ A.reset(); D.iss='iss2'; tutIdx=0; LESSONS.forEach(l=>l._done=false); SIM.refresh(); };
  };
  SIM.on('time', draw);
}

/* =====================================================================
   10. One second, frame by frame
   ===================================================================== */
function viewSecond(m){
  window.__pod12Active = false;
  const B=bootPlan(), P=passT();
  m.innerHTML = `${card('The same second at five magnifications (each window is centred on the playhead; click to seek)', `<div id="lad"></div>`)}
    <div class="grid2">${card('What happens in one second', `<div id="cnt"></div>`)}${card('Boot sequence (main(), from v100w.c)', `<div id="boot"></div>`)}</div>`;
  const levels = D.iss==='iss1' ? [['Whole second',1],['10 ms',0.01],['1 AES block (192 frames)',192/D.in[0].fs],['1 AES frame',1/D.in[0].fs]]
    : [['Whole second',1],['Boot (100 ms)',0.1],['3 main-loop passes',3*P],['1 main-loop pass',P],['1 AES frame',1/(outInfo(0,SIM.t).fs||D.in[0].fs)]];
  m.querySelector('#lad').innerHTML = levels.map((l,i)=>`<div class="small" style="margin:8px 0 2px"><b>${l[0]}</b> · ${SIM.fmtDur(l[1])}</div><canvas data-l="${i}"></canvas>`).join('');
  const draw=()=>{ const t=SIM.t;
    levels.forEach((l,i)=>{ const span=l[1]; let a=t-span/2; if (i===0) a=0; if (D.iss==='iss2' && i===1) a=D.powerAt; a=Math.max(0,Math.min(1-span,a));
      const ls = lanes().filter((x,j)=> D.iss==='iss1' ? true : (i<=1 ? [0,1,2,3,4,5,7,9,10,11,12,14,15,18].includes(j) : i<=3 ? [0,4,5,7,9,11,12].includes(j) : [0,6,11,13].includes(j)));
      SIM.drawLanes(m.querySelector(`canvas[data-l="${i}"]`), ls, {labelW:220, range:[a,a+span]}); });
    if (D.iss==='iss1'){ m.querySelector('#cnt').innerHTML=`<table class="kv"><tr><th>AES frames in and out</th><td class="mono">${D.in[0].fs.toLocaleString()} per second</td></tr><tr><th>Biphase half-cells per output</th><td class="mono">${(D.in[0].fs*128).toLocaleString()} per second</td></tr><tr><th>PIC16C54A</th><td>Program not archived. It reads the CS8412 flags and drives three tallies and two open-collector alarms (Functional Diagram).</td></tr></table>`; m.querySelector('#boot').innerHTML='<p class="small muted">ISS1 has no archived boot code.</p>'; return; }
    const fsA=outInfo(0,1).live?outInfo(0,1).fs:0, fsB=outInfo(4,1).live?outInfo(4,1).fs:0, nloop=Math.floor((1-B.loop)/P);
    m.querySelector('#cnt').innerHTML=`<table class="kv">
      <tr><th>Boot (power-on → while(1))</th><td class="mono">${SIM.fmtDur(B.loop-D.powerAt)}</td></tr>
      <tr><th>Main-loop passes in the rest of the second</th><td class="mono">${nloop.toLocaleString()} × ${SIM.fmtDur(P)}</td></tr>
      <tr><th>CS8416 register reads (0x0C)</th><td class="mono">${(2*nloop).toLocaleString()} (2 per pass)</td></tr>
      <tr><th>CS8416 register writes (0x04)</th><td class="mono">${((input2Active()?2:1)*nloop).toLocaleString()} — the same value, every pass</td></tr>
      <tr><th>Bits shifted into the FPGA</th><td class="mono">${(16*nloop).toLocaleString()} (16 per pass, then a strobe on FPGA2)</td></tr>
      <tr><th>WDR() between watchdog timeouts</th><td class="mono">every ≤ ${SIM.fmtDur(P)} vs ≈${SIM.fmtDur(K.wdt)} timeout (${inf})</td></tr>
      <tr><th>AES frames out of A1–A4 / B1–B4</th><td class="mono">${fsA.toLocaleString()} / ${fsB.toLocaleString()} per second, ×4 drivers each</td></tr>
      <tr><th>Biphase half-cells on one output</th><td class="mono">${(fsA*128).toLocaleString()} per second (${(fsA*64/1e6).toFixed(3)} Mbit/s)</td></tr>
      <tr><th>FPGA bit_counter clock (RMCK)</th><td class="mono">${(256*D.in[0].fs/1e6).toFixed(3)} MHz = 256 × fs from U5 (CS8416 register 01 = 0x04 → RMCKF = 0)</td></tr></table>`;
    const w=where(SIM.t);
    m.querySelector('#boot').innerHTML=`<table class="kv">${B.ph.map((p,i)=>`<tr style="${w.kind==='boot'&&w.i===i?'background:color-mix(in srgb,var(--accent) 20%,transparent)':''}"><th class="mono small">${p.name}</th><td class="mono small">${SIM.fmtDur(p.t0-D.powerAt)} → ${SIM.fmtDur(p.t1-D.powerAt)}</td><td class="small">${p.d}</td></tr>`).join('')}
      <tr><th class="mono small">while(1)</th><td class="mono small">${SIM.fmtDur(B.loop-D.powerAt)} →</td><td class="small">${STEPS.length} steps per pass, no interrupts</td></tr></table>`;
  };
  SIM.on('time', draw);
}

/* =====================================================================
   11. Block diagram
   ===================================================================== */
const BLK2 = {
  inA:{x:10,y:40,w:130,h:62,t:'INPUT A',s:['BNC / Phoenix','T9 PE-65612','I1 jumper 75/110 R'],d:'Rear module POD12-2 → H5 → T9 transformer → I1 jumper picks R35 (75 R) or R25 (110 R) termination → R4 110 R → U1 pin 3, clamped by D1/D2 to ±5 V.'},
  inB:{x:10,y:300,w:130,h:62,t:'INPUT B',s:['T10 PE-65612','I2 jumper','R24 100k bleed'],d:'Same as INPUT A through T10, I2, R14 → U2. INPUT B is also the SRC reference.'},
  eqA:{x:170,y:30,w:150,h:82,t:'U1 EL5263',s:['A: ×2 buffer → IN1','B: HF boost → IN1_EQ','R7‖R9+C15‖R11+C17'],d:'Section A (R5/R6 750 R) gains 2 and feeds IN1 through R12 75 R. Section B is an inverting stage: R8 750 R over R7 750 R in parallel with R9 365 R + C15 1 nF and R11 110 R + C17 220 pF. That gives 0 dB at low frequency and ≈ +20 dB at high frequency (see Schematics). Its output goes to IN1_EQ through R13. Both reach the CS8416, and the firmware picks one.'},
  eqB:{x:170,y:290,w:150,h:82,t:'U2 EL5263',s:['IN2 / IN2_EQ','same network','R16–R23'],d:'Mirror of U1 for INPUT B.'},
  rx1:{x:350,y:40,w:140,h:62,t:'U5 CS8416',s:['RXP0 = IN1','RXP1 = IN1_EQ','AES3-direct out'],d:'Register 04 = 0x80 (RUN, RXP0) or 0x89 (RUN, RXP1, TX pass-through also RXP1). Register 05 = 0xB0: master, AES3-direct NRZ out to the FPGA with RMCK = 256 fs. Register 06 = 0x10: only UNLOCK is reported in RERR (0x0C).'},
  rx2:{x:350,y:300,w:140,h:62,t:'U6 CS8416',s:['RXP0 = IN2','RXP1 = IN2_EQ','clocks = SRC ref'],d:'Same set-up. Its LRCLK/SCLK also clock the AD1895 output side and encoder inst3, so in SRC mode INPUT B sets the output rate.'},
  mcu:{x:350,y:160,w:140,h:82,t:'U10 AT90CAN128',s:['8 MHz X2','V020000 firmware','no interrupts'],d:'Bit-bangs both CS8416s on port C, reads the DIP on PA7..PA4, drives 9 LEDs on ports B/D/E/G, and shifts 16 bits into the FPGA on PB4/PB5/PB6 every pass. PC0 → Q1 → N_CONFIG restarts the FPGA. CAN/DashBoard code is linked in but never called.'},
  dip:{x:170,y:170,w:150,h:62,t:'SW1 206-4RAST',s:['DUAL · SRC · EQ1 · EQ2','R72–R75 110 R','ON = ground'],d:'Four rear DIP switches, internal pull-ups (PORTA = 0xFF). MIRROR() turns PA7..PA4 into bits 0..3, inverted.'},
  fpga:{x:530,y:150,w:170,h:102,t:'U8 EP1C3T100',s:['D6201A.bdf (D6201BV100)','2 × i2s8416_aes','2 × switch2x1 · sw2x2','shift_in 16-bit'],d:'Re-encodes each CS8416’s AES3-direct stream into a new AES3 line (i2s8416_aes: bit_counter on RMCK, preambles X/Y/Z, parity). switch2x1 inst20/inst21 pick aes1 or aes2 for OUT1/2 and OUT3/4. sw2x2x1x24 picks tone or the SRC return. Configured from U7 M25P40 over Active Serial.'},
  src:{x:530,y:300,w:170,h:62,t:'U9 AD1895',s:['in: inst2 I2S (IN A)','out: U6 clocks (IN B)','MCLK X1 24.576 MHz'],d:'Asynchronous SRC. Input side: INPUT A’s I2S from encoder inst2. Output side: slaved to U6 LRCLK/SCLK, so INPUT A comes out at INPUT B’s rate and phase. BYPASS is tied low in the FPGA. RESET comes from shift_in q5 (src_reset).'},
  vcxo:{x:530,y:20,w:170,h:70,t:'X1 VCXO 24.576 MHz',s:['UP/DN = GND in FPGA','R55, R59 not fitted','Vc ≈ 0 V'],d:'CSX-750V VCXO with a lead-lag loop filter (R56 1M, R57 2k, R58 280R, C52 0.47 µF). The FPGA drives UP and DN to GND, and R55/R59 are DNI, so the control voltage sits at 0 V and X1 free-runs at the bottom of its pull range. It only clocks the AD1895, which tolerates that.'},
  drv:{x:730,y:150,w:140,h:102,t:'U3, U4 DS34LV87T',s:['OUT1 → AES1, AES2','OUT2 → AES3, AES4','OUT3/4 → AES5–8','O1–O8 jumpers'],d:'Each FPGA output drives two differential drivers. The negative leg goes through C28.. and O-jumper-selected R27–R34 (110 R) or R37–R44 (75 R) into T1–T8.'},
  outs:{x:730,y:290,w:140,h:72,t:'T1–T8 → H3/H4',s:['A1–A4, B1–B4','POD12-2 rear module','BNC or Phoenix'],d:'PE-65612 transformers, then 12-pin headers H3/H4 to the rear module (H101/H102 sockets, BNC1–10 or P101–110).'},
  led:{x:170,y:400,w:300,h:44,t:'10 front LEDs',s:['LED1 power · LED2–10 MCU (R76–R84 332 R)'],d:'1X8 (PG4), 1X4 (PG3), SRC (PB0), EQ1 (PE3), EQ2 (PE7), LOCK1 (PE0), NO LOCK1 (PD1), LOCK2 (PE4), NO LOCK2 (PD0).'},
  psu:{x:530,y:400,w:340,h:44,t:'Power',s:['PSU1 VOF-10-5 → 5 V → LM1117-3.3 → LM1117-ADJ “1V2” = 1.52 V · MAX660 −5 V'],d:'IEC inlet → P1/P2 → PSU1. REG2 MAX660 makes −5 V for the EL5263s. REG3 sets 1.25 × (1 + 47.5/221) = 1.52 V for the Cyclone core (EP1C3 VCCINT is 1.5 V), although the net is named VCC_1V2.'},
};
const WIR2 = [['inA','eqA',''],['inB','eqB',''],['eqA','rx1','IN1 / IN1_EQ'],['eqB','rx2','IN2 / IN2_EQ'],['mcu','rx1','CS8416_CLK/IN/OUT'],['mcu','rx2',''],['dip','mcu','PA7..PA4'],['mcu','fpga','FPGA2/3/4'],['rx1','fpga','U5 SDATA/SCLK/LRCLK/MCLK'],['rx2','fpga','U6 …'],['fpga','src','SDATA_I'],['src','fpga','SDATA'],['vcxo','fpga','VCO_OUT'],['fpga','drv','OUT1–OUT4'],['drv','outs',''],['mcu','led','']];
const BLK1 = {
  in:{x:10,y:150,w:140,h:62,t:'INPUT',s:['BNC looping (75)','or terminals (110)','TERM jumper'],d:'POD12/75: transformer-balanced looping Hi-Z input (20 kΩ). POD12/110: transformer-balanced terminals. Install the jumper at TERM “IN” to terminate (pod12.pdf).'},
  eq:{x:180,y:150,w:150,h:62,t:'EQUALIZER',s:['OPA650 ×2','LEVEL pot','EQ ON/OFF'],d:'Functional Diagram: buffer → EQUALIZER with LEVEL and EQ ON/OFF → buffer. POD12.DSN lists two OPA650s.'},
  rx:{x:370,y:150,w:150,h:62,t:'AES RECEIVER',s:['CS8412','reclocks the stream'],d:'CS8412 (POD12.DSN). The Functional Diagram feeds the output drivers from the receiver: this is what makes it a “reclocking” DA.'},
  mcu:{x:370,y:280,w:150,h:62,t:'MICRO CONTROLLER',s:['PIC16C54A','program not archived'],d:'Reads the receiver flags and drives the LOCK / CONFIDENCE / NO LOCK tallies and two open-collector alarm transistors.'},
  drv:{x:560,y:60,w:160,h:72,t:'DRIVERS',s:['‘A’ 75 Ω: 1 driver → 6 BNC','‘B’ 110 Ω: 6 × driver + xfmr','EL2099 / DS2631'],d:'“A” circuit installed in POD12/75, “B” circuit in POD12/110 (Functional Diagram).'},
  mon:{x:560,y:170,w:160,h:52,t:'AES MONITOR JACK',s:['front ¼-inch, 7th output'],d:'“A convenient seventh output on a ¼ inch jack on the front panel” (pod12.pdf).'},
  tal:{x:180,y:280,w:150,h:62,t:'TALLIES',s:['LOCK green','CONFIDENCE yellow','NO LOCK red'],d:'pod12.pdf status table.'},
  alm:{x:560,y:280,w:160,h:62,t:'ALARMS',s:['CONTROL DE-9 + ALARM','open collector 30 V 60 mA'],d:'Confidence and No Lock follow the tallies; for POD12/110 the terminal block and the CONTROL connector share the same transistors.'},
};
const WIR1=[['in','eq',''],['eq','rx',''],['rx','drv','reclocked'],['rx','mon',''],['rx','mcu','flags'],['mcu','tal',''],['mcu','alm','']];
function viewBlock(m){
  window.__pod12Active=false;
  const iss1=D.iss==='iss1', BL=iss1?BLK1:BLK2, WI=iss1?WIR1:WIR2, vb=iss1?[740,370]:[880,460];
  let sel=iss1?'rx':'fpga';
  m.innerHTML=`<div class="grid2"><div>${card(`Block diagram — ${iss1?'ISS1 (2002), from POD12 - Functional Diagram.pdf':'ISS2 (2014), from the IPC netlist, BOM, firmware and D6201A.bdf'} · click a block`, `<div id="bd"></div><p class="small muted">Switch boards in the Simulator tab to see the other generation.</p>`)}</div><div>${card('Block', `<div id="bi"></div>`)}${card('Live state', `<div id="lv"></div>`)}</div></div>`;
  const draw=()=>{
    const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 ${vb[0]} ${vb[1]}" style="width:100%"><defs><marker id="b12" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WI.forEach(([a,b,l])=>{ const P=BL[a],Q=BL[b]; let [x1,y1]=ctr(P),[x2,y2]=ctr(Q);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y, sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9, k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(P,x1,y1,x2,y2); [x2,y2]=clip(Q,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.4:1.2}" marker-end="url(#b12)"/>`+(l?`<text x="${(x1+x2)/2+3}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink2)">${l}</text>`:''); });
    for (const k in BL){ const b=BL[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="7" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.6:1.2}"/><text x="${b.x+8}" y="${b.y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+8}" y="${b.y+34+i*14}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>';
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    m.querySelector('#bi').innerHTML=`<h3>${BL[sel].t}</h3><p>${BL[sel].d}</p>`;
    m.querySelector('#lv').innerHTML=stateHTML(SIM.t);
  };
  SIM.on('time', draw);
}

/* =====================================================================
   12. Schematics (redrawn from POD12-iss2-net.ipc, the BOM, D6201A.bdf and the firmware — not the original CAD)
   ===================================================================== */
const ink='var(--ink)', ink2='var(--ink2)', netc='var(--accent2)';
function T(x,y,s,sz,col,anc,wt){ return `<text x="${x}" y="${y}" font-size="${sz||11}" fill="${col||ink}" ${anc?`text-anchor="${anc}"`:''} ${wt?`font-weight="${wt}"`:''}>${s}</text>`; }
function Wr(pts,col,wd){ return `<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${col||ink}" stroke-width="${wd||1.2}"/>`; }
function chip(x,y,w,name,sub,left,right){ const n=Math.max(left.length,right.length), h=22+n*17; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="${ink}" stroke-width="1.4"/>`+T(x+w/2,y-16,name,12.5,ink,'middle','700')+T(x+w/2,y-4,sub,10,ink2,'middle');
  left.forEach(([p,nm,hot],i)=>{ const yy=y+20+i*17; s+=Wr([[x-30,yy],[x,yy]])+T(x+4,yy+4,p,10)+T(x-34,yy+4,nm,10,hot?'var(--accent)':netc,'end',hot?'700':null); });
  right.forEach(([p,nm,hot],i)=>{ const yy=y+20+i*17; s+=Wr([[x+w,yy],[x+w+30,yy]])+T(x+w-4,yy+4,p,10,ink,'end')+T(x+w+34,yy+4,nm,10,hot?'var(--accent)':netc,null,hot?'700':null); });
  return s; }
function R(x1,y1,x2,y2,lbl,val,dni){ const hz=y1===y2, mx=(x1+x2)/2, my=(y1+y2)/2; let p;
  if (hz){ const a=mx-16; p=`M${x1} ${y1}H${a}`+[0,1,2,3,4,5].map(i=>`L${a+32*(i+.5)/6} ${y1+(i%2?6:-6)}`).join('')+`L${a+32} ${y1}H${x2}`; }
  else { const a=my-16; p=`M${x1} ${y1}V${a}`+[0,1,2,3,4,5].map(i=>`L${x1+(i%2?6:-6)} ${a+32*(i+.5)/6}`).join('')+`L${x1} ${a+32}V${y2}`; }
  return `<path d="${p}" fill="none" stroke="${dni?ink2:ink}" stroke-dasharray="${dni?'3 3':''}"/>`+T(hz?mx:x1+10,hz?y1-10:my-2,lbl+(dni?' DNI':''),10,dni?'var(--warn)':ink,hz?'middle':null)+T(hz?mx:x1+10,hz?y1+18:my+10,val||'',10,ink2,hz?'middle':null); }
function C(x1,y1,x2,y2,lbl,val,dni){ const hz=y1===y2, mx=(x1+x2)/2, my=(y1+y2)/2; const st=dni?` stroke-dasharray="3 3"`:'';
  return (hz?`<path d="M${x1} ${y1}H${mx-4}M${mx+4} ${y1}H${x2}M${mx-4} ${y1-9}v18M${mx+4} ${y1-9}v18" stroke="${ink}" fill="none"${st}/>`+T(mx,y1-13,lbl+(dni?' DNI':''),10,dni?'var(--warn)':ink,'middle')+T(mx,y1+22,val||'',10,ink2,'middle')
     :`<path d="M${x1} ${y1}V${my-4}M${x1} ${my+4}V${y2}M${x1-9} ${my-4}h18M${x1-9} ${my+4}h18" stroke="${ink}" fill="none"${st}/>`+T(x1+13,my,lbl+(dni?' DNI':''),10,dni?'var(--warn)':ink)+T(x1+13,my+11,val||'',10,ink2)); }
function OA(x,y,name){ return `<path d="M${x} ${y-28}L${x+56} ${y}L${x} ${y+28}Z" fill="var(--panel2)" stroke="${ink}"/>`+T(x+5,y-8,'−',13)+T(x+5,y+17,'+',12)+T(x+14,y+42,name,10,ink2); }
function GND(x,y){ return `<path d="M${x} ${y}v7M${x-8} ${y+7}h16M${x-5} ${y+11}h10M${x-2} ${y+15}h4" stroke="${ink}" fill="none"/>`; }
function NET(x,y,s,anc,hot){ return T(x,y+4,s,10.5,hot?'var(--accent)':netc,anc,hot?'700':null); }
function DOT(x,y){ return `<circle cx="${x}" cy="${y}" r="2.6" fill="${ink}"/>`; }
/* EQ network response: H = R8 / (R7 ‖ (R9 + 1/sC15) ‖ (R11 + 1/sC17)), values from the BOM (R10/C16 not fitted) */
function eqGain(f){ const w=2*Math.PI*f; const y=(re,im)=>{ const d=re*re+im*im; return [re/d,-im/d]; };
  const a=[1/750,0], b=y(365,-1/(w*1e-9)), c=y(110,-1/(w*220e-12)); const Yr=a[0]+b[0]+c[0], Yi=a[1]+b[1]+c[1]; return 750*Math.hypot(Yr,Yi); }
function eqPlot(x,y,w,h){ let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="var(--line)"/>`; const f0=1e4,f1=3e7, X=f=>x+Math.log10(f/f0)/Math.log10(f1/f0)*w, Y=db=>y+h-(db+2)/26*h;
  [1e4,1e5,1e6,1e7].forEach(f=>{ s+=`<line x1="${X(f)}" y1="${y}" x2="${X(f)}" y2="${y+h}" stroke="var(--grid)"/>`+T(X(f),y+h+12,f>=1e6?f/1e6+' MHz':f/1e3+' kHz',9,ink2,'middle'); });
  [0,10,20].forEach(d=>{ s+=`<line x1="${x}" y1="${Y(d)}" x2="${x+w}" y2="${Y(d)}" stroke="var(--grid)"/>`+T(x-4,Y(d)+3,d+' dB',9,ink2,'end'); });
  let p=''; for(let i=0;i<=120;i++){ const f=f0*Math.pow(f1/f0,i/120); p+=(i?'L':'M')+X(f).toFixed(1)+' '+Y(20*Math.log10(eqGain(f))).toFixed(1); } s+=`<path d="${p}" fill="none" stroke="var(--accent)" stroke-width="2"/>`;
  const fb=64*D.in[0].fs; s+=`<line x1="${X(fb)}" y1="${y}" x2="${X(fb)}" y2="${y+h}" stroke="var(--warn)" stroke-dasharray="4 3"/>`+T(X(fb)+3,y+12,`${(fb/1e6).toFixed(2)} MHz = 64 fs: ${(20*Math.log10(eqGain(fb))).toFixed(1)} dB`,9.5,'var(--warn)');
  return s+T(x,y-6,'U1-B gain vs frequency (computed from BOM values)',10.5,ink,null,'700'); }
const SHEETS = [
  {name:'1 · Input + cable EQ (U1)', note:'INPUT A. INPUT B is the same with U2, R14–R23 and C21–C23. Nets and parts are from the IPC netlist, values from the BOM. The EQ stage inverts the signal, which is harmless: biphase-mark coding ignores polarity. The firmware never mixes the two paths. It tells the CS8416 which pin to listen to (register 04: 0x80 = RXP0, 0x89 = RXP1).', svg:()=>{
    let s=T(20,30,'T9 PE-65612',11,ink,null,'700')+`<path d="M60 60 q10 10 0 20 q10 10 0 20 q10 10 0 20M76 60v60M80 60v60M96 60 q-10 10 0 20 q-10 10 0 20 q-10 10 0 20" fill="none" stroke="${ink}"/>`+NET(20,64,'AES9_P')+NET(20,118,'AES9_N');
    s+=Wr([[96,60],[150,60]])+DOT(150,60)+T(150,48,'AES9',10,netc,'middle')+Wr([[150,60],[150,150]])+T(20,250,'I1: 1-2 = R25 110R · 2-3 = R35 75R',10,ink2)+GND(150,190)+R(150,150,150,190,'R25/35','term');
    s+=R(150,60,250,60,'R4','110R')+DOT(250,60)+T(258,36,'D1/D2 1N4148 to ±5 V',9.5,ink2)+Wr([[250,60],[262,60],[262,84],[300,84]]);
    s+=OA(300,72,'U1-A EL5263')+Wr([[300,60],[292,60],[292,150]])+R(292,150,292,200,'R5','750R')+GND(292,200)+R(292,150,370,150,'R6','750R')+Wr([[356,72],[380,72],[380,150],[370,150]])+DOT(380,72);
    s+=R(380,72,470,72,'R12','75R')+DOT(470,72)+NET(476,72,'IN1 → C36 → U5 pin 4 RXP0')+R(470,72,470,112,'R45','75R')+GND(470,112);
    s+=Wr([[380,72],[380,250],[420,250]])+DOT(380,250)+R(420,250,500,250,'R7','750R')+DOT(500,250);
    s+=Wr([[380,250],[380,320]])+R(380,320,440,320,'R9','365R')+C(440,320,500,320,'C15','1nF')+Wr([[500,320],[500,250]]);
    s+=Wr([[380,320],[380,380]])+R(380,380,440,380,'R11','110R')+C(440,380,500,380,'C17','220pF')+Wr([[500,380],[500,320]]);
    s+=T(380,420,'R10 + C16 not fitted (DNI)',10,'var(--warn)');
    s+=Wr([[500,250],[520,250],[520,262],[540,262]])+OA(540,274,'U1-B')+Wr([[540,286],[530,286],[530,300]])+GND(530,300)+R(520,220,600,220,'R8','750R')+Wr([[520,250],[520,220]])+Wr([[596,274],[620,274],[620,220],[600,220]])+DOT(620,274);
    s+=R(620,274,700,274,'R13','75R')+DOT(700,274)+NET(706,274,'IN1_EQ → C37 → U5 pin 3 RXP1')+R(700,274,700,314,'R46','75R')+GND(700,314);
    return s+eqPlot(560,350,270,90); }},
  {name:'2 · Receivers U5/U6 (CS8416)', note:'Both CS8416s share CS8416_CLK, CS8416_IN and CS8416_OUT. Each has its own SEL (chip select) and RESET. init_CS8416 programs both at once (CS1 and CS2 low together). Registers: 00=00, 01=04 (HOLD = replace bad samples with zero), 02=0B and 03=BB (GPO0–2 = TX pass-through), 04=80/89, 05=B0 (master, AES3-direct), 06=10 (report UNLOCK only).', svg:()=>
    chip(180,50,170,'U5 CS8416','INPUT A receiver',[['3 RXP1','IN1_EQ',eq1()],['4 RXP0','IN1',!eq1()],['9 RST','CS8416_RESET1 (PC7)'],['14 AD0/CS','CS8416_SEL1 (PC6)'],['15 SDA/CDIN','CS8416_IN (PC3)'],['16 SCL/CCLK','CS8416_CLK (PC2)'],['17 AD1/CDOUT','CS8416_OUT (PC1)']],[['18 GPO2','U5_GPO2 → U8 90 (unused)'],['19 GPO1','U5_GPO1 → U8 89 (unused)'],['20 GPO0','U5_GPO0 → U8 88 (unused)'],['24 RMCK','U5_MCLK → U8 87'],['26 SDOUT','U5_SDATA → U8 86'],['27 OSCLK','U5_SCLK → U8 77'],['28 OLRCK','U5_LRCLK → U8 76']])+
    chip(180,260,170,'U6 CS8416','INPUT B receiver (SRC reference)',[['3 RXP1','IN2_EQ',eq2()],['4 RXP0','IN2',!eq2()],['9 RST','CS8416_RESET2 (PC5)'],['14 AD0/CS','CS8416_SEL2 (PC4)'],['15 SDA/CDIN','CS8416_IN'],['16 SCL/CCLK','CS8416_CLK'],['17 AD1/CDOUT','CS8416_OUT']],[['18–20 GPO2..0','U6_GPO → U8 1/100/99 (unused)'],['24 RMCK','U6_MCLK → U8 98'],['26 SDOUT','U6_SDATA → U8 97'],['27 OSCLK','U6_SCLK → U8 92'],['28 OLRCK','U6_LRCLK → U8 91']])},
  {name:'3 · MCU U10 (AT90CAN128)', note:'Every MCU pin used, with its net from the IPC netlist and its use from the firmware (D6202B.h, cs84xx.h, altera.h, v100w.c port_init). The pins agree with the board one for one. Highlighted pins are high at the playhead.', svg:()=>{ const L=leds(SIM.t);
    return chip(300,30,200,'U10 AT90CAN128-16AE','X2 8 MHz · JTAG2 · V020000',[['2 PE0','LOCK1',L.l1],['5 PE3','EQ1',L.eq1],['6 PE4','LOCK2',L.l2],['9 PE7','EQ2',L.eq2],['10 PB0','SRC_LED',L.src],['12 PB2','FPGA6 (spare)'],['13 PB3','FPGA5 (spare)'],['14 PB4','FPGA4 = shift_in clock'],['15 PB5','FPGA3 = shift_in data'],['16 PB6','FPGA2 = shift_in strobe'],['17 PB7','FPGA1 (unused)'],['18 PG3','DA_1X4',L.x4],['19 PG4','DA_1X8',L.x8],['23/24','X2 8 MHz']],
      [['25 PD0','NOLOCK2',L.n2],['26 PD1','NOLOCK1',L.n1],['35 PC0','ALTERA_RESET → R62 → Q1'],['36 PC1','CS8416_OUT (input)'],['37 PC2','CS8416_CLK'],['38 PC3','CS8416_IN'],['39 PC4','CS8416_SEL2'],['40 PC5','CS8416_RESET2'],['41 PC6','CS8416_SEL1'],['42 PC7','CS8416_RESET1'],['44 PA7','SW1-8 DUAL (R72)',D.dip[0]],['45 PA6','SW1-7 SRC (R73)',D.dip[1]],['46 PA5','SW1-6 EQ1 (R74)',D.dip[2]],['47 PA4','SW1-5 EQ2 (R75)',D.dip[3]]]); }},
  {name:'4 · FPGA U8 + config', note:'EP1C3T100C8, pins from D6201A.qsf, matched to the IPC netlist. U7 M25P40 holds the configuration (Active Serial, header H1). Q1 2N4401 lets the MCU pull N_CONFIG low (ALTERA_RESET). TP1–TP5 go to header H2 and are not driven by the design.', svg:()=>
    chip(320,40,190,'U8 EP1C3T100C8','top entity D6201A (Quartus 5.1 → 9.1 SP1)',[['2','FPGA4 shift clock'],['3','FPGA3 shift data'],['4','FPGA2 strobe'],['5','FPGA1 (out, not driven)'],['6/7/16/17','NCS/CONF_DATA/DCLK/ASDI → U7'],['8','N_CONFIG ← Q1 ← R62 ← PC0'],['10','VCO_OUT ← X1'],['36/37','DN / UP → loop filter (= GND)'],['49','U9_RESET ← q5 src_reset'],['50','BYPASS = GND'],['51–53','LRCLK_I/SCLK_I/SDATA_I → U9'],['54','MCLKOUT → U9 (= vco)'],['55–57','SDATA/LRCLK/SCLK ↔ U9']],
      [['68/69','OUT4 / OUT3 → U4'],['74/75','OUT2 / OUT1 → U3'],['76/77','U5_LRCLK / U5_SCLK'],['86/87','U5_SDATA / U5_MCLK'],['88–90','U5_GPO0–2 (ignored)'],['91/92','U6_LRCLK / U6_SCLK'],['97/98','U6_SDATA / U6_MCLK'],['99/100/1','U6_GPO0–2 (ignored)'],['21–25','TP5..TP1 → H2'],['33/44/82/93','VCC_1V2 (1.52 V)'],['60/61','CONF_DONE / N_STATUS'],['62–67','JTAG1']])},
  {name:'5 · SRC U9 + VCXO X1', note:'AD1895 input side: I2S from encoder inst2 (INPUT A). Output side: slave to U6 (INPUT B) LRCLK/SCLK. MCLK is X1, passed through the FPGA (vco → src_mclk). The VCXO control loop is wired but idle: the FPGA ties UP and DN to GND, and R55 and R59 are not fitted. Dashed parts are DNI in the BOM.', svg:()=>{
    let s=chip(470,60,170,'U9 AD1895','asynchronous SRC',[['2 MCLK_I','MCLKOUT ← U8 54'],['4 SDATA_I','← U8 53 (IN A data)'],['5 SCLK_I','← U8 52'],['6 LRCLK_I','← U8 51'],['9 BYPASS','← U8 50 = GND'],['13 RESET','← U8 49 (q5)']],[['23 SDATA_O','→ U8 55 → i2s_par'],['24 LRCLK_O','↔ U8 56 = U6_LRCLK'],['25 SCLK_O','↔ U8 57 = U6_SCLK'],['14/15','tied together']]);
    s+=T(30,40,'X1 CSX-750V 24.576 MHz VCXO',11,ink,null,'700')+`<rect x="60" y="60" width="90" height="70" fill="var(--panel2)" stroke="${ink}"/>`+T(105,100,'X1',12,ink,'middle')+NET(155,82,'4 VCO_OUT → U8 10')+NET(155,112,'2 ← R59 DNI ← 3V3');
    s+=Wr([[60,95],[40,95],[40,200]])+DOT(40,200)+T(10,90,'1 Vc',10,ink2)+R(40,200,140,200,'R57','2k')+DOT(140,200);
    s+=R(40,200,40,260,'R58','280R')+C(40,260,40,320,'C52','0.47µF')+GND(40,320)+C(80,200,80,260,'C53','',true);
    s+=R(140,200,140,260,'R56','1M')+GND(140,260)+Wr([[140,200],[200,200]])+T(205,195,'D5 ← UP (U8 37) · D6 → DN (U8 36)',10,ink)+R(200,240,300,240,'R55','',true)+NET(305,240,'UP = GND in D6201A.bdf');
    return s+T(30,380,'With UP = DN = 0 V both diodes are off, R56 pulls the node to 0 V, and X1 free-runs at Vc ≈ 0 V.',10.5,ink2)+T(30,398,'AD1895 limit: MCLK / 138 = '+kHz(K.srcMaxFs)+' ('+'data sheet, not archived) — matches “SRC at 192KHz not work”.',10.5,ink2); }},
  {name:'6 · Outputs (U3/U4 → T1–T8)', note:'Each FPGA output feeds two drivers of a DS34LV87T. The negative leg goes through a DC-blocking cap and a jumper-selected series resistor into the transformer primary. The secondary goes to H3/H4 and the POD12-2 rear module. Shown for AES1. The other seven are identical (R27–R34 110 R, R37–R44 75 R).', svg:()=>{
    let s=chip(160,60,150,'U3 DS34LV87T','quad differential driver',[['15 / 9 IN','OUT1 (U8 75)'],['1 / 7 IN','OUT2 (U8 74)']],[['10 OUT+','AES1P → T1-1'],['11 OUT−','AES1N_SEL → O1-2'],['14 OUT+','AES2P → T2-1'],['13 OUT−','AES2N_SEL → O2-2'],['2/3, 6/5','AES3/AES4']]);
    s+=T(470,60,'O1 jumper: 1-2 → R27 110R · 2-3 → R37 75R',10.5)+R(470,100,560,100,'R27 / R37','110R / 75R')+C(560,100,640,100,'C28','0.1µF')+NET(646,100,'AES1N → T1-2');
    s+=T(470,180,'T1 PE-65612',11,ink,null,'700')+`<path d="M500 200 q10 10 0 20 q10 10 0 20 q10 10 0 20M516 200v60M520 200v60M536 200 q-10 10 0 20 q-10 10 0 20 q-10 10 0 20" fill="none" stroke="${ink}"/>`+NET(560,204,'T1-3 AES1_P → H4-12')+NET(560,258,'T1-4 AES1_N → H4-11');
    const rows=OUTN.map((n,o)=>{ const oi=outInfo(o,SIM.t); return `${n}: ${oi.live?'live '+kHz(oi.fs):'silent'}`; });
    return s+T(30,330,'Live at the playhead:',11,ink,null,'700')+rows.map((r,i)=>T(30+(i%4)*200,350+Math.floor(i/4)*18,r,10.5,ink2)).join(''); }},
  {name:'7 · Power', note:'From the netlist and BOM. REG3 has R2 (221 R) from VOUT to ADJ and R3 (47.5 R) from ADJ to ground, so VOUT = 1.25 × (1 + 47.5 / 221) = 1.52 V. The EP1C3 core needs 1.5 V, so the part is right and the net name “VCC_1V2” is wrong.', svg:()=>
    T(40,50,'IEC inlet → P1 / P2 → PSU1 VOF-10-5 (PSU2 position DNI)',12)+T(40,90,'VCC_5V ─┬─ REG1 LM1117MP-3.3 → VCC_3V3 (MCU, CS8416, FPGA I/O, drivers, U9, X1)',12)+T(40,120,'        ├─ REG2 MAX660 → VCC_5VN (−5 V for the EL5263 pair, D2/D4 clamps)',12)+T(40,150,'        └─ LED1 power (R1 332 R)',12)+T(40,190,'VCC_3V3 ─ REG3 LM1117-ADJ (R2 221 R, R3 47.5 R) → “VCC_1V2” = '+(1.25*(1+47.5/221)).toFixed(3)+' V → U8 33/44/82/93; PLL via R64 10 R / C67 / C68',12)},
  {name:'8 · Inside the FPGA (D6201A.bdf)', note:'Traced from the .bdf wire geometry. Every connection shown is in the file. shift_in q bits come from ALTERA_write: data_upper is sent first (MSB first), so data_upper bit 7 → q15 and data_lower bit 0 → q0. Highlighted values are live at the playhead.', svg:()=>{ const F=fpga(SIM.t);
    const bx=(x,y,w,h,t,sub,hot)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${hot?'color-mix(in srgb,var(--accent) 22%,var(--panel2))':'var(--panel2)'}" stroke="${ink}"/>`+T(x+6,y+15,t,11,ink,null,'700')+(sub||[]).map((l,i)=>T(x+6,y+30+i*13,l,9.5,ink2)).join('');
    let s=bx(20,30,140,86,'inst2 i2s8416_aes','',false)+T(26,60,'mclk/sclk/lrclk ← U5',9.5,ink2)+T(26,73,'i2s1 ← U5_SDATA',9.5,ink2)+T(26,86,'off ← q15 = '+F.off1,9.5,F.off1?'var(--bad)':ink2)+T(26,99,'ext_sel ← NOT q2 = '+F.ext1,9.5,ink2)+T(26,112,'audio_out → U9 SDATA_I',9.5,ink2);
    s+=bx(20,300,140,86,'inst3 i2s8416_aes','',false)+T(26,330,'clocks ← U6',9.5,ink2)+T(26,343,'off ← q14 = '+F.off2,9.5,F.off2?'var(--bad)':ink2)+T(26,356,'ext_sel ← NOT q3 = '+F.ext2,9.5,ink2)+T(26,369,'extCH ← inst22',9.5,ink2);
    s+=bx(200,170,150,60,'inst22 sw2x2x1x24',['sel ← q4 = '+F.swSel,F.swSel?'→ SRC return (inst23)':'→ tone (inst8)'],F.ext2===1);
    s+=bx(200,250,150,44,'inst23 i2s_par',['← U9 SDATA_O on U6 clocks'])+bx(200,110,150,44,'inst7 / inst8 tone_gen1',['1 kHz @ 48 k, −20 dBFS table']);
    s+=bx(420,60,150,60,'inst20 switch2x1',['sel ← q0 = '+F.selA,'→ OUT1 + OUT2 (A1–A4)'],true)+bx(420,280,150,60,'inst21 switch2x1',['sel ← q1 = '+F.selB,'→ OUT3 + OUT4 (B1–B4)'],true);
    s+=Wr([[160,60],[420,80]],F.selA===0?'var(--accent)':ink2,F.selA===0?2.5:1)+Wr([[160,340],[420,100]],F.selA===1?'var(--accent)':ink2,F.selA===1?2.5:1)+Wr([[160,60],[420,300]],F.selB===0?'var(--accent)':ink2,F.selB===0?2.5:1)+Wr([[160,340],[420,320]],F.selB===1?'var(--accent)':ink2,F.selB===1?2.5:1);
    s+=Wr([[350,200],[160,350]],F.ext2&&F.swSel?'var(--accent)':ink2)+Wr([[275,250],[275,230]])+Wr([[275,154],[275,170]]);
    s+=bx(620,150,210,150,'inst shift_in (16 bit)',['data ← FPGA3, clock ← FPGA4, strobe ← FPGA2','q0 dip1 → inst20.sel = '+F.q[0],'q1 dip2 → inst21.sel = '+F.q[1],'q2 dip3 → NOT → inst2.ext_sel','q3 dip4 → NOT → inst3.ext_sel','q4 dip5 → inst22.sel = '+F.q[4],'q5 dip6 → pin 49 src_reset = '+F.q[5],'q6, q7, q8–q13 unused','q14 → inst3.off · q15 → inst2.off']);
    return s+T(620,330,'Pins tied in the .bdf: up, dn, src_bypass → GND;',10,ink2)+T(620,344,'src_mclk = vco; TP1–TP5, FPGA1 not driven;',10,ink2)+T(620,358,'U5/U6 GPO0–2 inputs unconnected.',10,ink2); }},
  {name:'9 · ISS1 (2002) functional', note:'Redrawn from POD12 - Functional Diagram.pdf (two identical copies in #Engineering). POD12.DSN (OrCAD, 2002) adds the part numbers: CS8412, PIC16C54A, 2 × OPA650, EL2099, DS2631, 74LS00. The PIC program is not in the archive.', svg:()=>{
    const bx=(x,y,w,h,t)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="${ink}"/>`+T(x+w/2,y+h/2+4,t,11,ink,'middle');
    let s=T(20,40,'INPUT (BNC 75S / 110S) → transformer',11)+Wr([[60,80],[120,80]])+OA(120,80,'buffer')+Wr([[176,80],[200,80]])+bx(200,55,110,50,'EQUALIZER')+T(205,125,'LEVEL pot · EQ ON/OFF',10,ink2)+Wr([[310,80],[330,80]])+OA(330,80,'buffer')+Wr([[386,80],[420,80],[420,200]]);
    s+=bx(380,200,110,60,'AES RECEIVER')+T(392,280,'CS8412',10,ink2)+Wr([[490,215],[540,215],[540,80],[600,80]])+T(600,60,"'A' 75 Ω: one driver → OUT1–6",10.5)+Wr([[540,215],[540,150],[600,150]])+T(600,145,"'B' 110 Ω: six drivers + transformers",10.5)+Wr([[540,215],[540,230],[600,230]])+T(600,234,'AES MONITOR JACK (front)',10.5);
    s+=bx(180,200,140,60,'MICRO CONTROLLER')+T(192,280,'PIC16C54A',10,ink2)+Wr([[320,230],[380,230]])+T(20,215,'LOCK',10.5)+T(20,232,'CONFIDENCE',10.5)+T(20,249,'NO LOCK',10.5)+Wr([[100,230],[180,230]])+Wr([[250,260],[250,340],[600,340]])+T(600,344,'ALARMS 1, 2, COM (open collector)',10.5);
    return s; }},
];
function viewSchem(m){
  window.__pod12Active=false; let i=D.iss==='iss1'?8:0;
  m.innerHTML=card('Schematic set — redrawn, not the original CAD drawings', `<div id="sb" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="sn" class="small"></p>
    <p class="small muted">The Altium sheets exist in the archive (POD12 - #ISS2 #PCB/POD12-ISS2-S1…S7 .pdf/.SchDoc). These redrawings use the IPC-D-356A netlist inside POD12-ISS2.zip, so every pin-to-net connection is real. Values come from POD12-ISS2-BOM.xls.</p>`);
  const draw=()=>{ m.querySelector('#sb').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#sb button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 860 470" style="width:100%;min-width:660px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="5" y="5" width="850" height="460" fill="none" stroke="var(--line)"/>${SHEETS[i].svg()}${T(848,458,'POD12 · sheet '+(i+1)+'/'+SHEETS.length+' · REDRAWN 2026|59 — not the original CAD',9.5,ink2,'end')}</svg>`;
    m.querySelector('#sn').innerHTML=SHEETS[i].note; };
  SIM.on('time', draw);
}

/* =====================================================================
   13. Software tab
   ===================================================================== */
const MODE_ROWS = [
  {dip:'DUAL off, SRC off', raw:0, lo:'0x2C → q0 0 · q1 0 · q2 1 · q3 1', out:'A1–B4 ← INPUT A', leds:'1X8 · LOCK1/NO LOCK1 · IN2 tallies dark · EQ1'},
  {dip:'DUAL on, SRC off', raw:1, lo:'0x2E → q1 1', out:'A1–A4 ← A · B1–B4 ← B', leds:'1X4 · both inputs · EQ1, EQ2'},
  {dip:'SRC on (DUAL any), B locked', raw:2, lo:'0x37 → q0 1 · q1 1 · q3 0 · q4 1', out:'all ← A via AD1895 at B’s rate', leds:'1X8 · SRC · both inputs · EQ1 only (V020000)'},
  {dip:'SRC on, B not locked', raw:-2, lo:'0x2C → like 1×8', out:'A1–B4 ← INPUT A (fallback)', leds:'1X8 · SRC dark · NO LOCK2'},
];
function viewSoft(m){
  window.__pod12Active=false;
  m.innerHTML=`<div class="grid2">${card('main() — the step running at the playhead is lit (ISS2, V020000)', `<div id="flow"></div>`)}
    <div>${card('DIP → mode → FPGA word (ALTERA_write)', `<div id="mt"></div>`)}${card('The 16 bits shifted into the FPGA every pass', `<div id="w16"></div>`)}</div></div>
    <div class="grid2">${card('CS8416 registers (init_CS8416 + PROCESS_MODES)', `<div id="regs"></div>`)}${card('AT90CAN128 ports at the playhead', `<div id="ports"></div>`)}</div>
    <div class="grid2">${card('How the controls did things — switch → code → signal', `<div id="how"></div>`)}${card('What is in the 33 KB image (V100W.mp)', `<div id="mem"></div>`)}</div>
    <div class="grid2">${card('AES3 re-encoder in the FPGA (i2s8416_aes.vhd)', `<div id="enc"></div>`)}${card('v100 (8 Jan 2014) → V020000 (27 Jan 2014)', `<div id="diff"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t, w=where(t), B=bootPlan();
    // flow
    let s=`<svg viewBox="0 0 540 ${STEPS.length*50+130}" style="width:100%"><defs><marker id="s12" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    const bootOn=w.kind==='boot'; s+=`<rect x="40" y="6" width="460" height="56" rx="8" fill="${bootOn?'var(--warn)':'var(--panel2)'}" stroke="var(--line)"/>`+T(50,24,'main(): initialization · 35 × wait(3000) · ALTERA_RESET · init_CS8416 · ALTERA_write',11,bootOn?'#fff':ink)+T(50,42,bootOn?'now: '+w.p.name:'took '+SIM.fmtDur(B.loop-D.powerAt)+' after power-on; dip_switch_enabled = YES, dashboard_enabled = NO',10,bootOn?'#fff':ink2)+T(50,56,'CANinit(), DATA_SETUP(), EEPROM restore: all commented out (//Ali-Rem)',10,bootOn?'#fff':ink2);
    STEPS.forEach((st,j)=>{ const y=80+j*50, on=w.kind==='loop'&&w.step===j; s+=`<line x1="270" y1="${y-14}" x2="270" y2="${y}" stroke="var(--ink2)" marker-end="url(#s12)"/><rect x="40" y="${y}" width="460" height="38" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>`+T(50,y+15,st.n+` · ${Math.round(st.c())} cyc = ${SIM.fmtDur(st.c()/XTAL)}`,11,on?'#fff':ink)+T(50,y+30,st.d.length>92?st.d.slice(0,90)+'…':st.d,9.5,on?'#eef':ink2); });
    const yb=80+STEPS.length*50; s+=`<path d="M500 ${yb-31} h24 V${80} h-24" fill="none" stroke="var(--ink2)" marker-end="url(#s12)"/>`+T(40,yb+16,`while(1): pass ${w.kind==='loop'?'#'+w.n.toLocaleString():'—'} · ${SIM.fmtDur(passT())} per pass (inferred cycle estimate) · no interrupts, no CAN_FUNCTIONS()`,10.5,ink2)+T(40,yb+34,'save_settings / SAVE_INFORMATION_EEPROM and PROCESS_EQ_PUSHBUTTONS: removed. Settings are never stored: the DIP is read every pass.',10.5,ink2);
    m.querySelector('#flow').innerHTML=s+'</svg>';
    // mode table
    const cur = mode()===2 ? (mcuSeen(1,t)?2:-2) : mode();
    m.querySelector('#mt').innerHTML=`<table class="kv"><tr><th>DIP</th><th>data_lower → FPGA</th><th>Outputs</th><th>LEDs</th></tr>${MODE_ROWS.map(r=>`<tr style="${r.raw===cur?'background:color-mix(in srgb,var(--accent) 20%,transparent)':''}"><td class="small">${r.dip}</td><td class="mono small">${r.lo}</td><td class="small">${r.out}</td><td class="small">${r.leds}</td></tr>`).join('')}</table>
      <p class="small muted">mode = dip_switches &amp; 0x03, so DUAL + SRC gives 3. ALTERA_write’s last <span class="mono">else</span> then writes 2 (OUTPUT_1x8_SRC) back into the global <span class="mono">mode</span>. PROCESS_MODES and REFRESH_LEDS run before ALTERA_write in the next pass, so they only ever see 0, 1 or 2. SRC wins over DUAL only because of that side effect.</p>`;
    // 16-bit word
    const up=dataUpper(t), lo=dataLower(t), bits=[...Array(8)].map((_,i)=>(up>>(7-i))&1).concat([...Array(8)].map((_,i)=>(lo>>(7-i))&1));
    const qn=['q15 no_lock → inst2.off','q14 no_lock2 → inst3.off','q13 —','q12 —','q11 —','q10 —','q9 —','q8 —','q7 dip8 —','q6 dip7 —','q5 src_reset','q4 SRC/tone sel','q3 → NOT → inst3.ext_sel','q2 → NOT → inst2.ext_sel','q1 OUT3/4 sel','q0 OUT1/2 sel'];
    let ws=`<svg viewBox="0 0 560 150" style="width:100%">`; bits.forEach((b,i)=>{ const x=10+i*34; ws+=`<rect x="${x}" y="10" width="30" height="30" rx="4" fill="${b?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>`+T(x+15,30,b,13,b?'#fff':ink,'middle','700')+`<text x="${x+15}" y="50" font-size="9" fill="var(--ink2)" transform="rotate(50 ${x+15} 50)">${qn[i]}</text>`; });
    m.querySelector('#w16').innerHTML=ws+'</svg>'+`<p class="small">data_upper <span class="mono">${bin8(up)}</span> then data_lower <span class="mono">${bin8(lo)}</span>, MSB first. write_data(): PB5 = bit, PB4 high/low (≈${CYC.bit} cycles a bit). Then STROBE_WRITE_LOW/HIGH/LOW on PB6 latches q0–q15.</p>`;
    // registers
    const r4a = eq1()?0x89:0x80, r4b = eq2()?0x89:0x80;
    m.querySelector('#regs').innerHTML=`<table class="kv"><tr><th>Reg</th><th>Value</th><th>Meaning (CS8416 data sheet — ${inf} where not commented in the code)</th></tr>
      <tr><td class="mono">00 Control0</td><td class="mono">00</td><td class="small">defaults</td></tr>
      <tr><td class="mono">01 Control1</td><td class="mono">04</td><td class="small">HOLD = 01: replace an errored sample with zero · RMCKF = 0: RMCK = 256 fs</td></tr>
      <tr><td class="mono">02 Control2</td><td class="mono">0B</td><td class="small">GPO0 = TX pass-through</td></tr>
      <tr><td class="mono">03 Control3</td><td class="mono">BB</td><td class="small">GPO1, GPO2 = TX pass-through (“GPO2/1 AES PASS THROUGHS”). The FPGA ignores all three.</td></tr>
      <tr><td class="mono">04 Control4</td><td class="mono">U5 ${hex2(r4a)} · U6 ${input2Active()?hex2(r4b):'(not rewritten)'}</td><td class="small">RUN · RXSEL/TXSEL = ${eq1()?'RXP1 (IN1_EQ)':'RXP0 (IN1)'} — rewritten every pass</td></tr>
      <tr><td class="mono">05 Ser. format</td><td class="mono">B0</td><td class="small">master · SORES = 11: AES3-direct output (comment: “Master Mode - aes output”)</td></tr>
      <tr><td class="mono">06 RERR mask</td><td class="mono">10</td><td class="small">only UNLOCK is reported in 0x0C: V, parity, CRC and confidence errors are ignored</td></tr>
      <tr><td class="mono">0C RERR</td><td class="mono">U5 ${lockAt(0,t)?'00':'10'} · U6 ${lockAt(1,t)?'00':'10'}</td><td class="small">read twice per pass by CS8416_READ_LOCK_ALL: any non-zero value = NO LOCK</td></tr></table>`;
    // ports
    const L=leds(t), pa=(D.dip[0]?0:0x80)|(D.dip[1]?0:0x40)|(D.dip[2]?0:0x20)|(D.dip[3]?0:0x10)|0x0F, pb=0x70|(L.src?1:0), pd=(L.n1?2:0)|(L.n2?1:0), pe=(L.l1?1:0)|(L.eq1?8:0)|(L.l2?16:0)|(L.eq2?128:0), pg=(L.x4?8:0)|(L.x8?16:0);
    m.querySelector('#ports').innerHTML=`<table class="kv"><tr><th>Port</th><th>DDR</th><th>Value</th><th>Use (port_init comments)</th></tr>
      <tr><td class="mono">PINA</td><td class="mono">00</td><td class="mono">${bin8(pa)}</td><td class="small">SW1–SW4 on PA7..PA4, pull-ups on</td></tr>
      <tr><td class="mono">PORTB</td><td class="mono">71</td><td class="mono">${bin8(pb)}</td><td class="small">PB6 strobe · PB5 data · PB4 clock · PB0 SRC_LED</td></tr>
      <tr><td class="mono">PORTC</td><td class="mono">FD</td><td class="mono">${bin8(0xFE)}</td><td class="small">CS8416 RESET1/SEL1/RESET2/SEL2/IN/CLK, OUT (in), ALTERA_RESET</td></tr>
      <tr><td class="mono">PORTD</td><td class="mono">03</td><td class="mono">${bin8(pd)}</td><td class="small">PD1 NOLOCK1 · PD0 NOLOCK2</td></tr>
      <tr><td class="mono">PORTE</td><td class="mono">99</td><td class="mono">${bin8(pe)}</td><td class="small">PE7 EQ2 · PE4 LOCK2 · PE3 EQ1 · PE0 LOCK1</td></tr>
      <tr><td class="mono">PORTG</td><td class="mono">18</td><td class="mono">${bin8(pg)}</td><td class="small">PG4 DA_1X8 · PG3 DA_1X4</td></tr></table>`;
    m.querySelector('#how').innerHTML=`<table class="kv"><tr><th>Operator does</th><th>Firmware path</th><th>What changes on the wire</th></tr>
      <tr><td>DIP 1 DUAL</td><td class="mono small">READ_DIP_SWITCHES → ALTERA_write: mode = 1</td><td class="small">data_lower BIT1 → q1 → inst21 sel → OUT3/OUT4 = aes2 · PG3/PG4 LEDs</td></tr>
      <tr><td>DIP 2 SRC</td><td class="mono small">mode = 2/3 → else-branch → aes2_lock?</td><td class="small">BIT4|2|1|0, ~BIT3 → AD1895 path on U6 clocks · src_is_active → PB0</td></tr>
      <tr><td>DIP 3 EQ1</td><td class="mono small">eq1_active → PROCESS_MODES → CS8416_write1(0x04, 0x89)</td><td class="small">U5 listens on RXP1 (U1-B boost) · PE3</td></tr>
      <tr><td>DIP 4 EQ2</td><td class="mono small">eq2_active (only OUTPUT_2x4) → CS8416_write2(0x04, 0x89)</td><td class="small">U6 listens on RXP1 · PE7</td></tr>
      <tr><td>Plug / unplug an input</td><td class="mono small">CS8416_READ_LOCK_ALL → Astatus → REFRESH_LEDS → ALTERA_write data_upper</td><td class="small">LOCK/NO LOCK LEDs · q15/q14 mute the FPGA encoder</td></tr>
      <tr><td>Power on</td><td class="mono small">main() boot, ${SIM.fmtDur(B.loop-D.powerAt)}</td><td class="small">PC0 → Q1 → N_CONFIG; RS1/RS2; register writes</td></tr></table>
      <p class="small">Last action: <b>${D.log[0]?D.log[0].name:'none yet'}</b></p>`;
    // memory
    const segs=[['main, ports, LEDs (v100w.c)',0x0504,0x0689,true],['ADC slot address (unused)',0x0689,0x07D8,false],['altera.c',0x07D8,0x08A9,true],['D6202B.c modes + ALTERA_write',0x08A9,0x09EB,true],['timers + CAN.c (never started)',0x09EB,0x17E5,false],['cs84xx.c + common.c',0x17E5,0x18C7,true],['Dashboard.c + Ross product.c (never called)',0x18C7,0x4548,false],['ICCAVR runtime',0x4548,0x4605,true]];
    const tot=0x4605-0x0504; let ms=`<svg viewBox="0 0 520 70" style="width:100%">`; let x=10; segs.forEach(([n,a,b,live])=>{ const w2=(b-a)/tot*500; ms+=`<rect x="${x}" y="10" width="${w2}" height="26" fill="${live?'var(--accent)':'var(--chip)'}" stroke="var(--line)"><title>${n}: ${(b-a)*2} bytes</title></rect>`; x+=w2; });
    const liveB=segs.filter(s=>s[3]).reduce((a,s)=>a+(s[2]-s[1])*2,0);
    m.querySelector('#mem').innerHTML=ms+T(10,56,`reachable ≈ ${liveB.toLocaleString()} B of ${(tot*2).toLocaleString()} B text (green); grey = linked but never called`,10.5,ink2)+'</svg>'+`<p class="small">From the symbol addresses in V100W.mp (word addresses). The DashBoard parameter tables, the CAN message engine and the Ross <span class="mono">getProductName</span> strings all ship inside the POD12 image. wbs_ztcpack.txt still packs it as <span class="mono">D6202b_v1_00.bin</span> for an openGear D6202B.</p>`;
    m.querySelector('#enc').innerHTML=`<table class="kv"><tr><th>Clock</th><td class="small">mclk = CS8416 RMCK = 256 fs (${(256*D.in[0].fs/1e6).toFixed(3)} MHz) · bit_counter(7:0) counts it: bit 7 = subframe, bits 6..2 = 32 time slots, bits 1..0 = 4 mclk per slot (2 per half-cell)</td></tr>
      <tr><th>Input</th><td class="small">in_reg1 shifts the CS8416’s AES3-direct SDOUT on SCLK. On each LRCLK edge it copies 24 + 24 data bits into shiftout/buffer1.</td></tr>
      <tr><th>Preambles</th><td class="small">x / y / z decoded from bit_counter(3..0) when bit_counter(6..4) = 000. z when the 192-frame block counter wraps (tcb).</td></tr>
      <tr><th>Biphase</th><td class="small">aes1_pt = template OR (data AND bitx2) → a toggle flip-flop → aes1. Then <span class="mono">aes1 &lt;= aes1_pt_t AND NOT off</span>: a muted output sits at a steady 0 with no transitions.</td></tr>
      <tr><th>Latency</th><td class="small">about ${K.fpgaLat} frames (${SIM.fmtDur(K.fpgaLat/D.in[0].fs)}) from CS8416 output to line (${inf})</td></tr></table>`;
    m.querySelector('#diff').innerHTML=`<table class="kv"><tr><th>File</th><th>Change (diff of the two folders)</th></tr>
      <tr><td class="mono">v100w.c</td><td class="small">+ <span class="mono">src_is_active</span> (“//Ali-Add”), + SRC_LED_ON/OFF in REFRESH_LEDS, EQ2 test gets <span class="mono">&amp;&amp; (mode == OUTPUT_2x4)</span></td></tr>
      <tr><td class="mono">D6202B.c</td><td class="small">src_is_active set YES/NO in each ALTERA_write branch; same EQ2 restriction</td></tr>
      <tr><td class="mono">D6202B.h</td><td class="small">+ <span class="mono">#define SRC_LED_ON PORTB |= BIT0</span>. That is the same bit as COM_ACTIVITY_LED_ON, still defined above it.</td></tr>
      <tr><td class="mono">v100w.prj</td><td class="small">project path C:\\Ali\\Projects\\POD12\\Atmel\\v100 → \\V020000</td></tr>
      <tr><td>All other .c/.h</td><td class="small">byte-identical (ADC, altera, CAN, common, cs84xx, D6201B, Dashboard, eeprom, headers)</td></tr></table>
      <p class="small">The firmware selector in the Simulator switches between the two. Under v100 the SRC LED never lights, and EQ2 also works in SRC mode, where INPUT B is the reference.</p>`;
  };
  SIM.on('time', draw);
}

/* =====================================================================
   14. Findings
   ===================================================================== */
function viewFindings(m){
  window.__pod12Active=false;
  m.innerHTML=card('What the POD12 folder is up to', `<ol>
    <li><b>The POD12A firmware is in this folder.</b> <span class="mono">pod12a.js</span> and the POD12A master README say “Hardware only. There is no firmware”. The ISS2 board here, POD12-1 ISS2 (netlist 15 Dec 2013), is the POD12A, and its MCU program is <span class="mono">POD12 - #Engineering/POD12 - #Software/…/#V020000/</span>. The test report <span class="mono">POD12A-02AV0000-13JAN14.pdf</span> lists “MC: V020000, FPGA: D6201BV100”. Every port pin in the firmware (D6202B.h, cs84xx.h, altera.h) matches U10’s nets in the IPC netlist. The FPGA source is the D6201A Quartus project in <span class="mono">POD12 - Update - #RD #RD77/Software/FPGA/v100/</span>, and its pinout (D6201A.qsf) matches U8 too. An earlier MCU build, v100, sits in <span class="mono">RD77/Software/Atmel/backup1/v100/</span>. Only the .hex/.pof outputs are missing (removed in the archive cleanup).</li>
    <li><b>SRC converts INPUT A to INPUT B’s clock.</b> The manual only says SRC “restricts operation to 1x8 mode”. In D6201A.bdf the AD1895’s input is encoder inst2’s I2S (INPUT A). Its output side, the i2s_par reader and encoder inst3 all run on U6’s LRCLK/SCLK (INPUT B). ALTERA_write only engages the SRC path <span class="mono">if (aes2_lock == YES)</span>. INPUT B is a sync reference whose audio is discarded. With no B, the unit quietly runs plain 1×8 and the SRC LED stays dark. <span class="mono">pod12a.js</span> assumes SRC on input A to a fixed 48 kHz from the VCXO. The code says otherwise.</li>
    <li><b>“SRC at 192KHz not work” has a clear cause.</b> The AD1895 master clock is X1, 24.576 MHz (BOM). The AD1895 needs MCLK ≥ 138 × fs (${inf}: data sheet, not archived), which caps it at ${kHz(K.srcMaxFs)}. The manual still promises “30kHz to 192kHz”.</li>
    <li><b>The VCXO loop is wired but switched off.</b> The FPGA ties <span class="mono">up</span>, <span class="mono">dn</span> and <span class="mono">src_bypass</span> to GND (.bdf), and R55 and R59 are DNI in the BOM. X1’s control voltage rests at 0 V through R56 (1 MΩ), so it free-runs at the bottom of its pull range. That only matters to the AD1895, whose MCLK may be asynchronous.</li>
    <li><b>SRC beats DUAL through a side effect.</b> <span class="mono">mode = dip_switches &amp; 0x03</span> gives 3 when both are on. Only ALTERA_write’s final <span class="mono">else</span> rewrites the global to OUTPUT_1x8_SRC (2), and PROCESS_MODES and REFRESH_LEDS see that value on the next pass. Without the rewrite, mode 3 would make both inputs INACTIVE.</li>
    <li><b>In 1×8 mode INPUT 2’s LOCK and NO LOCK are both dark</b>, not “no lock”. PROCESS_MODES sets input2 = INACTIVE and REFRESH_LEDS blanks both. The manual table implies there is always a lock indication per input.</li>
    <li><b>The EQ is a second receiver input, not a switch in the signal.</b> Each EL5263 drives the CS8416 twice: section A (gain 2) → IN1 on RXP0, and section B → IN1_EQ on RXP1. Section B is an inverting stage with R8 750 R over R7 750 R ‖ (R9 365 R + C15 1 nF) ‖ (R11 110 R + C17 220 pF): 0 dB at low frequency, about +${(20*Math.log10(eqGain(3.072e6))).toFixed(0)} dB at 3 MHz. EQ1/EQ2 just write 0x80 or 0x89 to register 04. The EQ path is inverted, which biphase-mark coding ignores.</li>
    <li><b>V020000 took EQ away from the SRC reference.</b> In v100, EQ2 worked whenever input 2 was active, including SRC mode, where a long reference cable might need it. V020000 adds <span class="mono">&amp;&amp; (mode == OUTPUT_2x4)</span>, and the January 2014 manual documents the restriction.</li>
    <li><b>SRC_LED reuses COM_ACTIVITY_LED’s bit.</b> D6202B.h defines COM_ACTIVITY_LED (PORTB BIT0) from the openGear card and then SRC_LED_ON on the same PORTB BIT0. That is harmless only because DATA_INITIALIZATION() and the CAN code are no longer called.</li>
    <li><b>About 94 % of the image is dead openGear code.</b> V100W.mp shows 33,282 bytes of text. CAN.c, Dashboard.c, the Ross product.c strings and the timer ISRs are all linked. CANinit, CAN_FUNCTIONS and the EEPROM save are commented out (“//Ali-Rem”), and interrupts are never enabled (CLI, no SEI). Headers still say “PRODUCT: OPEN GEAR (D6201B), FEBRUARY 13, 2008, PROTOTYPE”, BOARD_ISSUE 3, and wbs_ztcpack.txt builds <span class="mono">D6202b_v1_00.bin</span>.</li>
    <li><b>The boot is mostly waiting.</b> 35 × <span class="mono">wait(3000)</span> = ${SIM.fmtDur(35*K.wait3000)} at 8 MHz, of which 15 were added (“//Ali-Add”), so the loop starts about ${Math.round((bootPlan().loop-D.powerAt)*1000)} ms after power-on. port_init sets PORTC = 0xFF, which drives PC0 high and holds N_CONFIG low through Q1, so the FPGA cannot finish configuring until ALTERA_RESET releases it.</li>
    <li><b>The receivers are polled and rewritten constantly.</b> Every pass (~${SIM.fmtDur(passT())}) the MCU reads RERR from both CS8416s and rewrites register 04 with the same value, about ${Math.round(2/passT()).toLocaleString()} SPI transactions a second. Register 06 = 0x10 unmasks UNLOCK only, so validity, parity and confidence errors never reach the LEDs (${inf} from the data sheet).</li>
    <li><b>Leftover FPGA features.</b> Two tone_gen1 blocks (1 kHz, −20 dBFS at 48 kHz) are in the design, but the firmware forces <span class="mono">tone_generation1/2 = NO</span>. The CS8416 GPO pass-throughs are configured (registers 02/03) but go to unconnected FPGA inputs. shift_in q6–q13, FPGA1, FPGA5/FPGA6 and TP1–TP5 are unused. The MCU’s ALTERA_read path would use PA4/PA6 as FPGA data inputs, the same pins as the DIP switches, but it is never called.</li>
    <li><b>The “1V2” rail is 1.52 V</b> (LM1117-ADJ, R2 221 R / R3 47.5 R), which is right for the Cyclone EP1C3 core. Only the net name is wrong.</li>
    <li><b>ISS1 is the original POD12</b> (Pod12.pcb 24 Dec 1999, POD12.DSN May 2002, manual July 2002): a CS8412 receiver, a PIC16C54A for the tallies, an OPA650 equaliser with a front LVL trim, six outputs, a front monitor jack and CONFIDENCE alarms. Its PIC program is not in the archive. The 2002 manual claims 600 m / 1500 m on 75 Ω. The 2014 POD12A manual says 300 m / 750 m, and its test report measured 300 m / 1000 m (75 Ω).</li>
    <li><b>Duplicates and mislabels.</b> “POD12 - Functional Diagram” and “POD12 - #Functional Diagram” are the same drawing (identical .cdr). The RD77 PCB folder has five backups exchanged with the layout contractor, and ISS2 again under #Engineering. The obsolete silk folder holds an earlier “POD-12A” (one input, five or seven outputs, LOCK / NO LOCK / EQ). The name POD12A was used twice. The test report is a generic openGear checklist, with Dolby, video and analog sections marked N/A.</li>
    <li><b>Artwork ${SIM.year(2026)}: front/rear panels now from ${SIM.src(ART12,'POD12A - #ARTWORK #DA #2016/POD12A-FRONT&REAR-SILK (CURVE).cdr')} (Jun.19/14, file Jun 17 2016).</b> The newest sheet holds FRONT GREEN, FRONT WHITE and REAR WHITE plates plus a pure-black (#000) mechanical layer: panel outline, rocker cut-out, the ten LED holes, both mounting screws, the ten BNC/XLR rings with their square flats, the DIP window and the IEC opening. It registers on the earlier cuts with zero offset (x 280 px on the 200 dpi sheet), so LEDs, rocker and connectors stay put. The older PNG cuts had printed that black layer in ink colour; it is now a faint guide, since it is not silk. The 2014 front ${SIM.src('#POD #SERIES/XXX - POD12 - #Master #OBSOLETE/POD12 - #Engineering/POD12 - #SILK/POD12A-FRONT(FINAL CURVE).cdr','POD12A-FRONT(FINAL CURVE).cdr')} is byte-identical in three folders, and the rear exists in three different saves (2014, May 2015, Jun 2016). Besides the two mounting screws, the sheet puts its ⊕ crosshair on only two of the ten LED holes, PWR and INPUT 1 LOCK, on both front plates: these look like the screen-registration holes ${inf}.</li>
  </ol>`)+card('Assumptions in this simulation', `<ul class="small">
    <li>Pass length (${SIM.fmtDur(passT())}) is estimated from instruction counts in the .lis files. Call overheads and REFRESH_LEDS/MIRROR costs are estimates (${inf}).</li>
    <li>AVR start-up delay ${SIM.fmtDur(K.startup)}, FPGA configuration ${SIM.fmtDur(K.fpgaCfg)}, CS8416 lock ${SIM.fmtDur(K.lockT)}, AD1895 delay ${SIM.fmtDur(K.srcDelay)}, FPGA latency ${K.fpgaLat} frames: all ${inf}.</li>
    <li>Cable reach uses the manual figures at 48 kHz and scales with √(48 k / fs) (${inf}).</li>
    <li>In SRC mode with INPUT A unlocked, the outputs keep running at B’s rate and carry silence (${inf}).</li>
    <li>ISS1 tallies and alarms follow the 2002 manual. The CONFIDENCE band and the LVL → boost mapping are ${inf}, and the PIC program is not archived.</li>
  </ul>`);
}

/* =====================================================================
   15. Register
   ===================================================================== */
bindKeys();
SIM.register({
  id:'pod12', file:'pod12.js',
  name:'POD12 · AES/EBU reclocking distribution amplifier (1999|32)',
  product:'POD12', year:1999, family:'Obsolete products',
  folder:'#POD #SERIES/XXX - POD12 - #Master #OBSOLETE',
  summary:'Half-rack AES/EBU DA. The 2002 ISS1 (CS8412 + PIC, six outputs, EQ trim) was redesigned in 2013|46–2014|47 as POD12-1 ISS2, sold as the POD12A: two CS8416 receivers, an AT90CAN128, a Cyclone EP1C3 that re-encodes AES and an AD1895 SRC. Its firmware (V020000) and FPGA project are archived in this folder.',
  highlights:['Real silkscreen panels with working DIP, inputs and power','Boot and main loop timed from the code (35 × wait(3000), 5-step pass)','FPGA routing traced from D6201A.bdf: what each of the 16 shifted bits does','SRC locks INPUT A to INPUT B’s clock; the 192 kHz failure explained','The POD12A firmware the POD12A folder says does not exist'],
  depth:'Full model',
  duration:1,
  stepUnits:[
    {label:'1 main-loop pass', period:()=>passT(), phase:()=>bootPlan().loop%passT()},
    {label:'wait(3000) = 2.63 ms', period:()=>K.wait3000},
    {label:'1 AES frame (IN A)', period:()=>1/D.in[0].fs},
    {label:'1 AES block (192 frames)', period:()=>192/D.in[0].fs},
    {label:'1 ms', period:()=>0.001},
    {label:'10 ms', period:()=>0.01},
  ],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms (boot)'],[0.01,'10 ms'],[0.001,'1 ms (≈3 passes)'],[0.0003,'300 µs (1 pass)'],[1/48000*4,'4 AES frames (83 µs)'],[1/48000,'1 AES frame (20.8 µs)']],
  defaultZoom:1,
  init(){ BPK=''; SFK=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the POD12', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
