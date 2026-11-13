/* =====================================================================
   D8204B — AES/EBU reclocking distribution amplifier, 1 in × 8 out, 75 Ω
   (Ward-Beck Systems, MF8200 series, 2005|38). Plugin for the WBS Device Simulator.

   Sources used (all in this archive, #MF8200 #SERIES/…):
   - D8204B - #Master #MF82/D8204B - #Software/…#v101/v200.asm (2010) and …#v100/v200.asm (2005),
       …#v100/V200.$$$ (MPLAB backup, May 9 2005), d8204b.pjt, v100.mcp
       → INIT, MAIN, REFRESHSTATUS, refresh8420_1/2, shiftout, read8420s, shiftin, cs8420reg* constants
   - D8204B - #PCB/d8204B-ISS3.net (net names and pins), d8204B-iss3.bom, d8204B-iss3.pnp (part positions),
       d8204B-iss3.ECO, OnlineDRC.ERR.txt (ISS4, 2010), OBSOLETE/ ISS1 + ISS2 netlists, BOMs and ECOs
   - D8204B - #PCB/GERBERS/D8204B-ISS3.SLK + .TOP  → assets/d8204b-board-silk-white.png, d8204b-board-copper.png
       (rendered at 150 dpi by a small RS-274-D renderer; 1 px = 1/150 in)
   - D8204B - #PCB/OBSOLETE/D8204B-ISS2-SILK.pdf  → assets/d8204b-iss2-silk-white.png (P-CAD silk print, 2005)
   - D8204B - #PNP #2016 #MF82/D8204B-ISS2-ASSY - #Assembly.pdf  (LED colours, "LOCK / NO LOCK", "ALARM / OUT 8")
   - D8204 - #Master #MF82/D8204 - #Engineering/D8204MAN.WPD and "D8204 March 13 2012 Complete Manual.pdf"
       (operator manual: termination, EQ button, LEDs, BNC1/BNC3 rear terminals, specifications; its
       schematic pages are the D8204B ISS3 board)
   - XXX - ENGINEERING - 2016 RD FILES/RD9-DSPResearch/Ali/datasheet/CS8427_F5.pdf (register bit meanings)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const card = (t,b,cls)=>`<div class="card ${cls||''}"><h2>${t}</h2>${b}</div>`;
const ASSET = 'siumulation-plugins/assets/';
const hex = v=>'0x'+(v&255).toString(16).toUpperCase().padStart(2,'0');
const bin = v=>(v&255).toString(2).padStart(8,'0');
const esc = s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');

/* ---------------- constants from the source ---------------- */
const XTAL = 4.9152e6, TCY = 4/XTAL;          // X2 = 4.9152 MHz (BOM/netlist) → 813.8 ns per instruction
const REG = { r1:0x00, r2:0x00, r3:0x95, r4:0x49, r5:0x00, r6:0x92, r9:0x00, r17:0x10, r3off:0xD5 }; // cs8420reg*def
const RAIL_T = 0.005;                         // rails + oscillator start after a power-up — inferred
const LOCK_T = 0.035;                         // CS8427 PLL lock time, datasheet table 7 (32–96 kHz filter) — inferred for this board's filter
const RST_CYC = 34 + 1 + 767 + 32 + 1;        // INIT → powerupdelay (256 × decfsz) → defaults → bsf portc,7
const INIT_CYC = RST_CYC + 2*863;             // … + the two refreshes INIT calls

/* ---------------- one main-loop pass, instruction by instruction ----------------
   Cycle counts from v200.asm: shiftout = 8 × (bcf 1 + btfsc/bsf 2 + PBCLOCK 2) + return 2 = 42, +call 2.
   A "movlw/movf; movwf; call shiftout" byte = 46 cycles, a bare "call shiftout" = 44.               */
const PROG = (()=>{
  const ops=[], steps=[]; let c=0;
  const add=(n,o)=>{ if(o) ops.push(Object.assign({o:c,cyc:n},o)); c+=n; };
  const wbyte=(cs,label,val,bare,tag)=>{ const st=c+(bare?2:4); const clk=[]; for(let k=0;k<8;k++) clk.push(st+5*k+3);
    ops.push({o:c,cyc:bare?44:46,kind:'w',cs,label,val,clk,bare:!!bare,tag}); c+=bare?44:46; };
  const step=(name,fn,desc)=>{ const a=c; fn(); steps.push({name,a,b:c,desc}); };
  step('clrwdt', ()=>add(1), 'Kick the watchdog (WDT config not in the source)');
  const refresh=(cs)=>{
    add(3,{kind:'cs',cs,lvl:0,label:`call refresh8420_${cs}; bcf portc,${cs==='1'?2:4} (CS${cs} low)`});
    wbyte(cs,'chip address 0010000 + W',0x20); wbyte(cs,'MAP = 1 + 128 (INCR)',0x81);
    const nm=['','Misc Control 1','Misc Control 2','Data Flow Control','Clock Source Control','Serial In Format','Serial Out Format'];
    for(let k=1;k<=6;k++) wbyte(cs,`reg ${k} ${nm[k]}`, k===3&&cs==='1'? 'reg13' : REG['r'+k], false, k===3&&cs==='1'?'r3':k===4&&cs==='1'?'r4':null);
    add(1,{kind:'misc',label:'clrf temp0'});
    wbyte(cs,'reg 7 (read-only, skipped)',0x00,true); wbyte(cs,'reg 8 (read-only, skipped)',0x00,true);
    wbyte(cs,'reg 9 Interrupt 1 Mask',REG.r9);
    for(let k=10;k<=16;k++) wbyte(cs,`reg ${k} ← temp0 still = reg 9 value`,REG.r9,true);
    wbyte(cs,'reg 17 Receiver Error Mask',REG.r17);
    add(3,{kind:'cs',cs,lvl:1,label:`bsf portc,${cs==='1'?2:4}; return`});
  };
  step('REFRESH8420_1', ()=>refresh('1'), 'Rewrite CS8427 registers 1–17 (19 SPI bytes, CS1 = RC2)');
  step('REFRESH8420_2', ()=>refresh('2'), 'Same 19 bytes to a second CS8420 on CS2 = RC4 — not fitted on this board');
  step('READ8420s', ()=>{
    add(3,{kind:'misc',label:'call read8420s; clrf lock_8420'});
    add(2,{kind:'cs',cs:'12',lvl:0,label:'bcf portc,4; bcf portc,2 (both CS low)'});
    wbyte('12','chip address + W (global)',0x20); wbyte('12','MAP = 16 (Receiver Errors)',0x10);
    add(2,{kind:'cs',cs:'12',lvl:1,label:'bsf portc,4; bsf portc,2'});
    for (const ch of ['1','2']){
      add(1,{kind:'cs',cs:ch,lvl:0,label:`bcf portc,${ch==='1'?2:4}`});
      wbyte(ch,'chip address + R',0x21);
      const st=c+3, clk=[]; for(let k=0;k<7;k++) clk.push(st+4*k+2);
      ops.push({o:c,cyc:35,kind:'r',cs:ch,label:`shiftin → temp2 (reg 16 of AES${ch})`,clk,tag:'rd'+ch}); c+=35;
      add(1,{kind:'cs',cs:ch,lvl:1,label:`bsf portc,${ch==='1'?2:4}`});
      add(2,{kind:'misc',label:`btfss temp2,4 / bsf lock_8420,${ch==='1'?0:1}`});
    }
    add(2,{kind:'misc',label:'return'});
  }, 'Point both parts at reg 16, then read it back from each');
  step('REFRESHSTATUS', ()=>add(21,{kind:'status',label:'REFRESHSTATUS: RD7, RB0, RC6, cs8420reg13'}), 'Drive the LEDs and the alarm, choose reg 3 for the next pass');
  step('goto main', ()=>add(2), '');
  const find=tag=>ops.find(o=>o.tag===tag);
  return { ops, steps, total:c, r3:find('r3').o+find('r3').cyc, r4:find('r4').o+find('r4').cyc,
           rd1:find('rd1').o+3+4*3, st:ops.find(o=>o.kind==='status').o+6 };
})();
const PASS = PROG.total*TCY;                  // 2021 cycles ≈ 1.645 ms

/* ---------------- device state ---------------- */
const D = {
  in0:true, ev:[], bootAt:null,               // input present at t=0, later plug events, power-cycle time
  src:1.0, len:300, fs:48000,                 // upstream level (V p-p into 75 Ω), coax length (m), sample rate
  term:'75', loop:'open', eq:false, h1:'OUT8', rear:'BNC3', fw:'v101',
  load:[true,true,true,true,true,true,true,true],
  log:[], lastTrace:[], sel:'U25',
};

/* ---------------- analog front end (static) ---------------- */
const cx=(r,i)=>({r,i}), cadd=(a,b)=>cx(a.r+b.r,a.i+b.i), cinv=a=>{ const m=a.r*a.r+a.i*a.i; return cx(a.r/m,-a.i/m); }, cabs=a=>Math.hypot(a.r,a.i);
function rc(R,C,f){ return cx(R, -1/(2*Math.PI*f*C)); }
function stage2Gain(f, eq){            // U1B: Rf = R3 750R; input R30 110R + (R5 750R ∥ EQ networks when SW1 is in)
  let y = cx(1/750,0);
  if (eq){ y = cadd(y, cinv(rc(330,1000e-12,f))); y = cadd(y, cinv(rc(110,220e-12,f))); }   // R13/C9, R19/C15 (R17/C14 = DNI)
  const zin = cadd(cx(110,0), cinv(y));
  return 750 / cabs(zin);
}
let FE=null, FEkey='';
function frontEnd(){
  const key=[D.src,D.len,D.fs,D.term,D.loop,D.eq,D.rear].join('|'); if (key===FEkey) return FE; FEkey=key;
  const f0 = 64*D.fs;                                           // AES3 bit rate = fundamental of an all-ones run
  const Rt = D.term==='75'?75 : D.term==='110'?110 : 3000;      // HiZ: only R49 3K across T1's secondary
  const Rl = (D.rear==='BNC3' && D.loop==='75')? 75 : Infinity;
  const R = 1/(1/Rt + 1/Rl);
  const vcard = D.src*2*R/(75+R);                               // source is D.src into 75 Ω → 2·D.src open circuit
  const gam = (R-75)/(R+75);
  const pen = -20*Math.log10(1-0.6*Math.abs(gam));              // reflection eye penalty — inferred
  const kdb = 14/600;                                           // dB/m at 3.07 MHz: 1 V just fails at 600 m (manual) — inferred
  const loss = kdb*D.len*Math.sqrt(f0/3.072e6);
  const g2 = stage2Gain(f0, D.eq), g2lf = stage2Gain(1000, false), boost = 20*Math.log10(g2/g2lf);
  const eyeIn = vcard*Math.pow(10,-(loss+pen)/20);              // HF eye at the card input, before EQ
  const rxp = eyeIn*2*g2;                                        // U1A ×2 (R4/R1), U1B −g2 → RXP
  const thr = 0.2*2*g2lf;                                        // 0.2 V p-p manual minimum, referred to RXP
  const ok = rxp >= thr;
  const maxLen = (20*Math.log10(D.src*2*R/(75+R)/0.2) - pen + boost)/kdb;
  FE = { f0, Rt, Rl, R, vcard, gam, pen, loss, g2, g2lf, boost, eyeIn, rxp, thr, ok, margin:20*Math.log10(rxp/thr),
         over: Math.max(0, boost-loss), overload: vcard>7, fsOk: D.fs>=30000 && D.fs<=50000, maxLen,
         lfAtU1A: vcard*2, outU1B: vcard*2*g2lf };
  return FE;
}

/* ---------------- time model ---------------- */
const BLK = ()=>192/D.fs;
const bf = t=>Math.floor(t/BLK())*BLK();
function eraAt(t){
  if (D.bootAt===null || t<D.bootAt) return {kind:'run', T0:0, pre:true};
  const f0 = D.bootAt+RAIL_T; if (t<f0) return {kind:'off'};
  const ms = f0 + INIT_CYC*TCY; if (t<ms) return {kind:'init', f0, ms};
  return {kind:'run', T0:ms, pre:false};
}
function chipRunSince(t){
  const e=eraAt(t); if (e.kind!=='run') return null; if (e.pre) return -1e9;
  const r = e.T0 + PROG.r4*TCY; return t>=r? r : null;          // RUN=1 lands with reg 4 of the first MAIN pass (see Findings)
}
function inputSince(t){ let on=D.in0, since=-1e9; for (const e of D.ev){ if (e.t>t) break; if (e.on && !on) since=e.t; on=e.on; } return on? since : null; }
function inputOn(t){ return inputSince(t)!==null; }
function pll(t){
  if (!frontEnd().ok) return false;
  const a=inputSince(t), b=chipRunSince(t); if (a===null || b===null) return false;
  const s=Math.max(a,b); return s<-1 || t-s>=LOCK_T;
}
function pllState(t){
  const e=eraAt(t); if (e.kind!=='run' || chipRunSince(t)===null) return 'off';
  if (pll(t)) return 'locked';
  if (!inputOn(t)) return 'nosig';
  return frontEnd().ok? 'acq' : 'weak';
}
function unlockBit(t){ return !pll(bf(t)); }                    // UNLOCK "updated on CS block boundaries" (datasheet 10h)
function Lpass(e,n){                                            // lock_8420 bit 0 after READ8420s of pass n
  if (!e.pre && n<0) return null;
  const tr = e.T0 + (n*PROG.total + PROG.rd1)*TCY, tp = tr - PASS;
  if (!e.pre && chipRunSince(tr)===null) return 0;
  return (unlockBit(tr) || unlockBit(tp))? 0 : 1;               // sticky: any UNLOCK since the previous read
}
function fwAt(t){
  const e=eraAt(t), o={era:e.kind, eq:D.eq&&e.kind!=='off'};
  if (e.kind==='off'){ return Object.assign(o,{chip:'off',green:0,red:0,rb2:0,alarm:0,txoff:false,L:null,step:-1}); }
  if (e.kind==='init'){
    const rst = t >= e.f0 + RST_CYC*TCY;
    return Object.assign(o,{chip:rst?'stopped':'reset',green:1,red:0,rb2:0,alarm:0,txoff:false,L:null,step:-1,initCyc:Math.floor((t-e.f0)/TCY)});
  }
  const n = Math.floor((t-e.T0)/PASS), cyc = (t-e.T0)/TCY - n*PROG.total;
  let step=0; PROG.steps.forEach((s,i)=>{ if (cyc>=s.a) step=i; });
  const ns = Math.floor((t - e.T0 - PROG.st*TCY)/PASS);
  let L = (e.pre || ns>=0)? Lpass(e,ns) : null;
  const m = Math.floor((t - e.T0 - PROG.r3*TCY)/PASS);
  const Lm = (e.pre || m-1>=0)? Lpass(e,m-1) : 1;
  const txoff = (e.pre || m>=0) ? Lm===0 : false;
  let green, red, rb2, alarm;
  if (L===null){ green=1; red=0; rb2=0; alarm=0; }
  else { green=L; alarm=L?0:1; if (D.fw==='bak'){ red=0; rb2=L?0:1; } else { red=L?0:1; rb2=0; } }
  const chip = chipRunSince(t)===null? 'stopped' : 'run';
  return Object.assign(o,{n, cyc, step, L, green, red, rb2, alarm, txoff, chip, reg13: Lm===0? REG.r3off : REG.r3, pre:e.pre});
}
function txAt(t){ const f=fwAt(t); if (f.chip!=='run') return 'low'; if (f.txoff) return 'txoff'; return pll(t)? 'aes' : 'free'; }
const TXTXT = {aes:'AES3, reclocked', free:'free-running PLL (garbage)', txoff:'0 V (TXOFF)', low:'0 V (reset / stopped)'};

/* ---------------- outputs ---------------- */
// P1 output pins in order, the driver and coupling parts that feed them (ISS3 netlist). BNC numbering → pin is inferred.
const OUTS = [
  {pin:7, net:'P1D', drv:'U5A (net OUT4)', c:'C30', r:'R15'}, {pin:9, net:'P1E', drv:'U5A (net OUT4)', c:'C29', r:'R14'},
  {pin:11,net:'P1F', drv:'U5B (net OUT3)', c:'C25', r:'R6'},  {pin:13,net:'P1H', drv:'U5B (net OUT3)', c:'C24', r:'R7'},
  {pin:15,net:'P1J', drv:'U2A (net OUT1)', c:'C28', r:'R8'},  {pin:17,net:'P1K', drv:'U2A (net OUT1)', c:'C19', r:'R11'},
  {pin:19,net:'P1L', drv:'U2B (net OUT2)', c:'C31', r:'R12'}, {pin:21,net:'P1M', drv:'U2B (net OUT2) via H1', c:'C32', r:'R16'},
];
function outAt(k,t){                         // what BNC k (0..7) carries
  if (k===7 && D.h1==='ALARM') return {alarm:true, low: fwAt(t).alarm===1};
  if (D.rear==='BNC1' && k>=6) return {absent:true};
  const s=txAt(t); const vpp = s==='aes'||s==='free'? 2.5*(D.load[k]? 0.5 : 1) : 0;
  return {s, vpp};
}

/* ---------------- user actions ---------------- */
function act(name, fn){
  D.lastTrace=[]; const tr=s=>D.lastTrace.push(s);
  fn(tr);
  D.log.unshift({t:SIM.t, name, trace:D.lastTrace.slice()}); if (D.log.length>60) D.log.length=60;
  SIM.refresh();
}
const ms = x=>(x*1e3).toFixed(3)+' ms';
function traceChain(tr, from){               // follow the firmware forward from `from`, report each stage
  const e=eraAt(from); if (e.kind!=='run'){ tr('Card is not running the main loop at this instant.'); return; }
  let n0 = Math.floor((from-e.T0)/PASS), Lprev = Lpass(e,n0-1);
  for (let n=n0; n<n0+80; n++){
    const L = Lpass(e,n); if (L===Lprev || L===null) continue;
    const tr_ = e.T0+(n*PROG.total+PROG.rd1)*TCY, ts = e.T0+(n*PROG.total+PROG.st)*TCY, t3 = e.T0+((n+1)*PROG.total+PROG.r3)*TCY;
    tr(`Pass #${n}: READ8420s at ${ms(tr_)} shifts in reg 16 = ${hex(L?0:0x10)} → btfss temp2,4 ${L?'sets':'leaves clear'} lock_8420,0 (= ${L})`);
    tr(`REFRESHSTATUS at ${ms(ts)}: RD7 (green LOCK) ← ${L}; ${D.fw==='bak'?'RB2 (not connected on ISS3) ← '+(1-L)+'; RB0 red stays 0':'RB0 (red NO LOCK) ← '+(1-L)}; RC6 → Q1 ${L?'off':'on'} (NO_LOCK ${L?'released':'pulled low'}); cs8420reg13 ← ${L?'cs8420reg3def 0x95':'cs8420reg3off 0xD5'}`);
    tr(`Pass #${n+1}: REFRESH8420_1 sends reg 3 = ${L?'0x95 (TXOFF=0)':'0xD5 (TXOFF=1)'} at ${ms(t3)} → TXP ${L?'carries the reclocked AES again':'driven to 0 V: all outputs go flat'}`);
    return;
  }
  tr('lock_8420 does not change in the next 80 passes (≈130 ms).');
}
const A = {
  eq(){ act(`Press EQ (SW1) → ${D.eq?'off':'on'}`, tr=>{ D.eq=!D.eq; const fe=frontEnd();
    tr(`SW1 (PHA-2UEE) pole A ${D.eq?'links':'unlinks'} NET00103 to NET00067: R13+C9 (330R+1000p) and R19+C15 (110R+220p) ${D.eq?'go in parallel with':'leave'} R5 750R at U1B's inverting input`);
    tr(`U1B gain at ${(fe.f0/1e6).toFixed(3)} MHz: ${fe.g2.toFixed(2)} (flat = ${fe.g2lf.toFixed(3)}) → ${fe.boost.toFixed(1)} dB of HF boost`);
    tr(`Pole B ${D.eq?'grounds':'opens'} the EQ LED cathode: +5 V → R75 330R → yellow EQ LED ${D.eq?'ON':'OFF'}. The PIC never reads SW1 (no port pin on its nets).`);
    tr(`Eye at RXP ${fe.rxp.toFixed(3)} V p-p vs ${fe.thr.toFixed(3)} V needed → ${fe.ok?'receiver can lock':'still NO LOCK'} (margin ${fe.margin.toFixed(1)} dB)`);
  }); },
  term(v){ act(`INPUT TERMINATION jumper → ${v==='HIZ'?'removed (HiZ)':v+' Ω'}`, tr=>{ D.term=v; const fe=frontEnd();
    tr(v==='75'?'TERM pins 2–1: T1 secondary (NET00096) → R24 75R to ground': v==='110'?'TERM pins 2–3: NET00096 → R9 110R to ground':'Jumper parked: only R49 3K loads T1 secondary');
    tr(`Line sees ${fe.R>2000?'≈3 kΩ':fe.R.toFixed(1)+' Ω'} → level at the card ${fe.vcard.toFixed(2)} V p-p, reflection Γ = ${fe.gam.toFixed(2)}, eye penalty ${fe.pen.toFixed(1)} dB (${'inferred'})`);
    tr(`Margin now ${fe.margin.toFixed(1)} dB → ${fe.ok?'lock':'NO LOCK'}`); }); },
  h1(v){ act(`H1 jumper → ${v}`, tr=>{ D.h1=v;
    tr(v==='ALARM'?'H1 pins 2–3: edge pin P1-21 (P1M) ← NO_LOCK: Q1 collector through R44 4K7 (open collector, pulls low when unlocked)':'H1 pins 2–1: P1-21 ← R16 75R ← C32 ← U2B: output 8 is an AES output');
    tr(v==='ALARM'?'On the BNC3 terminal the OUT 8 BNC now carries the alarm tally (pin mapping inferred)':'All eight outputs carry AES'); }); },
  input(on){ act(on?'Plug the AES input in (at the playhead)':'Pull the AES input (at the playhead)', tr=>{
    const t=SIM.t; D.ev=D.ev.filter(e=>e.t<t); D.ev.push({t,on}); D.ev.sort((a,b)=>a.t-b.t);
    tr(on? `Signal reaches T1 at ${ms(t)}. The CS8427 PLL needs ≈${LOCK_T*1e3} ms to lock (${'inferred'}: datasheet table 7)` : `Signal gone at ${ms(t)}. The PLL drops out; the VCO falls to ≈300 kHz (datasheet)`);
    tr(`Reg 16 UNLOCK updates only on channel-status block boundaries (every ${ms(BLK())})`);
    traceChain(tr, t); }); },
  power(){ act('Pull the card and plug it back in (at the playhead)', tr=>{ const t=SIM.t; D.bootAt=t;
    const f0=t+RAIL_T;
    tr(`+20 V → F2 → R35 → LM2596 → +5 V; −20 V → F3 → LM337 (R25 221R / R27 665R → −5.01 V). Rails and oscillator up after ≈${RAIL_T*1e3} ms (${'inferred'})`);
    tr(`INIT at ${ms(f0)}: PORTD = 11100110 → RD7 = 1 → green LOCK lit before anything is known; PORTC = 0 → CS1, CS2 low, CS8427 held in reset`);
    tr(`powerupdelay: 256 × decfsz = 767 cycles (0.624 ms); then bsf portc,7 at ${ms(f0+RST_CYC*TCY)} releases RESET`);
    tr('INIT calls refresh8420_1: CS1 was already low, so the CS8427 never sees the high→low CS edge that selects SPI mode — this first write is probably ignored (inferred, datasheet §9)');
    tr(`MAIN starts at ${ms(f0+INIT_CYC*TCY)}; pass #0 writes RUN=1 (reg 4) with a proper CS edge; the PLL then needs ≈${LOCK_T*1e3} ms`);
    traceChain(tr, f0+INIT_CYC*TCY); }); },
  set(k,v,label){ act(label, tr=>{ D[k]=v; const fe=frontEnd(); tr(`Eye at RXP ${fe.rxp.toFixed(3)} V p-p, needed ${fe.thr.toFixed(3)} V → ${fe.ok?'lock':'NO LOCK'} (margin ${fe.margin.toFixed(1)} dB)`); if (k==='fs') tr(fe.fsOk? 'Inside the manual\'s 30–50 kHz range' : 'Outside the manual\'s 30–50 kHz range; the CS8427 itself is rated 8–108 kHz, so it is shown locking ('+'inferred'+')'); }); },
  load(k){ act(`Output ${k+1}: ${D.load[k]?'disconnect the load':'connect a 75 Ω load'}`, tr=>{ D.load[k]=!D.load[k]; tr(`${OUTS[k].drv} → ${OUTS[k].c} 1.0u → ${OUTS[k].r} 75R → P1-${OUTS[k].pin}: ${D.load[k]?'2.5 V p-p into 75R+75 Ω → 1.25 V p-p':'unterminated → 2.5 V p-p'} (${'inferred'} from TXP 0–5 V and the R18/R26 ÷2)`); }); },
  fw(v){ act(`Firmware → ${v==='bak'?'V200.$$$ (May 9 2005 backup)':v}`, tr=>{ D.fw=v;
    tr(v==='bak'?'REFRESHSTATUS drives RB2 for "signal1 error" and leaves RB0 alone. On ISS3 RB2 (U25-10) has no net: the red NO LOCK LED never lights. On ISS1, RB2 drove a second red LED (L5 via R34).':'Runtime behaviour of v100 and v101 is identical; only the RESET/interrupt vectors moved (see Software → memory map).'); }); },
  clearEv(){ D.ev=[]; D.bootAt=null; act('Clear input events and power-cycles', tr=>tr('Card running, input as set at t = 0')); },
  reset(){ Object.assign(D,{in0:true,ev:[],bootAt:null,src:1.0,len:300,fs:48000,term:'75',loop:'open',eq:false,h1:'OUT8',rear:'BNC3',fw:'v101',load:[true,true,true,true,true,true,true,true],log:[]}); FEkey=''; SIM.refresh(); },
};

/* ================================================================
   DRAWING: the board (real ISS3 silkscreen), the front edge, the rear terminal
   ================================================================ */
/* Board: assets rendered from GERBERS/D8204B-ISS3.SLK (silk) and .TOP (copper) at 150 dpi, 1622 × 417 px =
   10.81″ × 2.78″. PnP coordinates (mil, origin 4350,7525) map to px as x = (0.18 + X/1000)·150, y = (0.155 − Y/1000)·150. */
const P = (X,Y)=>[(0.18+X/1000)*150, (0.155-Y/1000)*150];
const PARTS = {
  U25:{xy:P(4962.5,-1240),w:70,h:70,t:'U25 PIC16F874 (QFP44)',d:'Runs v200.asm. 4.9152 MHz crystal X2 → 1.2288 MIPS. Bit-bangs SPI on RC0/RC1/RC3 to the CS8427, drives the LOCK/NO LOCK LEDs and the alarm transistor Q1. ICSP on H13.'},
  U3:{xy:P(7045,-1375),w:110,h:44,t:'U3 CS8427 AES3 transceiver (SO28)',d:'Receives on RXP (C10) with RXN AC-grounded (C12); PLL filter R23 4K7, C20 .068µ, C17 6800p. Configured TXD=10 / OUTC=1 / RXD=01: the AES3 transmitter is fed straight from the receiver, clocked by the recovered clock — a reclocker. The netlist symbol still says CS8420.'},
  U1:{xy:P(7750,-275),w:40,h:32,t:'U1 EL5263IS input amplifier',d:'U1A ×2 (R4/R1 750R), U1B inverting with the switchable cable EQ (R5 750R, R13/C9, R19/C15) → R31 110R → C10 → RXP. D1/D2 clamp the input. ±5 V.'},
  U2:{xy:P(8920,-1447),w:40,h:32,t:'U2 EL5263IS output drivers',d:'Both halves are followers (Rf 750R, no Rg) fed by TXP ÷2 (R18/R26). U2A → outputs on P1-15, P1-17; U2B → P1-19 and, via H1, P1-21.'},
  U5:{xy:P(8920,-872),w:40,h:32,t:'U5 EL5263IS output drivers',d:'TXP ÷2 via R47/R45. U5A → P1-7, P1-9; U5B → P1-11, P1-13. Each output: 1.0µ coupling + 75R series.'},
  T1:{xy:[1418,58],w:80,h:50,t:'T1 PE-65612 AES transformer',d:'Isolates the input: primary from P1-1 (through C16) and P1-2, secondary to the TERM jumper, R49 3K and R10 110R → U1A.'},
  REG2:{xy:P(2585,-1460),w:60,h:60,t:'REG2 LM2596 buck regulator',d:'+20 V (P1-29/30) → F2 RXE-050 → R35 10R ½W → LM2596 → L1 PE-53823 / D5 SK33 → +5 V, filtered by L2 and seven 68µ/10 V tantalums.'},
  REG1:{xy:P(7590,-2000),w:46,h:64,t:'REG1 LM337 negative regulator',d:'−20 V (P1-25/26) → F3 → LM337; R25 221R / R27 665R → −1.25·(1+665/221) = −5.01 V for the three EL5263s. Added in ISS2 (the ISS1 −5 V net had no source).'},
  Q1:{xy:P(5850,-271.5),w:24,h:20,t:'Q1 2N4401 alarm transistor',d:'Base from RC6 (R29 4K7). Collector → R44 4K7 → NO_LOCK → H1 pin 3 → (ALARM position) P1-21. On = card unlocked.'},
  X2:{xy:[784,262],w:48,h:30,t:'X2 4.9152 MHz crystal',d:'C64/C66 27p. TCY = 4/4.9152 MHz = 813.8 ns. The MPLAB project says 4 MHz (simulator setting only).'},
  H13:{xy:[711,205],w:30,h:44,t:'H13 ICSP header (2×3)',d:'1 +5 V, 2 RB7/PGD, 3 MCLR (D11), 4 RB6/PGC, 5 GND, 6 RB3/PGM. No .hex is in the archive.'},
};
function boardSVG(t, opts){
  opts=opts||{}; const f=fwAt(t);
  const glow = (x,y,on,col,w,h)=>`<rect x="${x-(w||13)}" y="${y-(h||8)}" width="${2*(w||13)}" height="${2*(h||8)}" rx="3" fill="${on?col:'#2a2d2b'}" ${on?'filter="url(#d4bglow)"':''} opacity="${on?1:.85}"/>`;
  const jT = {'110':[42,57],'75':[57,72]}[D.term];
  let s=`<svg viewBox="0 0 1622 417" role="img" aria-label="D8204B ISS3 board, top side (real silkscreen and copper from the Gerbers)" style="width:100%;display:block;border-radius:6px">
   <defs><filter id="d4bglow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
   <path d="M2,8 H1545 L1556,36 H1622 V396 H1556 L1545,410 H2 Z" fill="#1c5b38"/>
   ${opts.iss2? `<image href="${ASSET}d8204b-iss2-silk-white.png" x="-14" y="-6" width="1652" height="427"/>` :
     `<image href="${ASSET}d8204b-board-copper.png" width="1622" height="417" opacity=".9"/><image href="${ASSET}d8204b-board-silk-white.png" width="1622" height="417"/>`}`;
  if (!opts.iss2){
    s += glow(34.5,53.2,f.green,'#3fe06a') + glow(34.5,75.7,f.red,'#ff4636') + glow(132,117,f.eq,'#ffd23a');
    // SW1 actuator
    s += `<g class="d4b-hot" data-a="eq" style="cursor:pointer"><rect x="196" y="44" width="62" height="40" fill="transparent" stroke="${D.eq?'#ffd23a':'transparent'}" stroke-width="3" rx="4"/><rect x="${D.eq?160:148}" y="58" width="${D.eq?40:52}" height="12" rx="3" fill="#d9d4c4" stroke="#6b665a"/><title>SW1 EQ push-button (click): ${D.eq?'IN — equalizer on':'OUT — flat'}</title></g>`;
    // TERM jumper
    s += `<g class="d4b-hot" data-a="term" style="cursor:pointer"><rect x="1350" y="30" width="40" height="56" fill="transparent"/>
      ${jT? `<rect x="1361" y="${jT[0]-7}" width="17" height="${jT[1]-jT[0]+14}" rx="3" fill="#202020" stroke="#777"/>` : `<rect x="1378" y="34" width="17" height="16" rx="3" fill="#202020" stroke="#777"/>`}
      <title>INPUT TERMINATION jumper (click): ${D.term==='HIZ'?'removed = HiZ':D.term+' Ω'}</title></g>`;
    // H1 jumper
    const jH = D.h1==='ALARM'? [1488,1503] : [1503,1518];
    s += `<g class="d4b-hot" data-a="h1" style="cursor:pointer"><rect x="1478" y="262" width="52" height="26" fill="transparent"/><rect x="${jH[0]-7}" y="267" width="${jH[1]-jH[0]+14}" height="15" rx="3" fill="#202020" stroke="#777"/><title>H1 jumper (click): ${D.h1==='ALARM'?'ALARM — P1-21 = NO_LOCK tally':'OUT 8 — P1-21 = AES output 8'}</title></g>`;
    // parts
    for (const k in PARTS){ const p=PARTS[k]; s+=`<rect data-p="${k}" x="${p.xy[0]-p.w/2}" y="${p.xy[1]-p.h/2}" width="${p.w}" height="${p.h}" fill="${D.sel===k&&opts.sel?'rgba(255,200,60,.18)':'transparent'}" stroke="${D.sel===k&&opts.sel?'#ffc83c':'transparent'}" stroke-width="2" style="cursor:pointer"><title>${p.t}</title></rect>`; }
    // edge fingers: 15 per side, pin 2k−1 on top, 2k underneath
    const fn = ['IN + (C16 → T1)','IN − (T1-2)','n/c / GND','OUT 1 / GND','OUT 2 / GND','OUT 3 / GND','OUT 4 / GND','OUT 5 / n/c','OUT 6 / n/c','OUT 7 / n/c','OUT 8 or ALARM (H1) / n/c','n/c / n/c','−20 V (F3)','GND','+20 V (F2)'];
    for (let k=0;k<15;k++){ const y=45.7+k*23.37; const a = k>=3&&k<=10? outAt(k-3,t) : null;
      const live = a && !a.absent && (a.alarm? false : a.vpp>0);
      s+=`<rect x="1562" y="${y-6}" width="58" height="12" fill="${live?'rgba(80,220,120,.45)':a&&a.alarm&&a.low?'rgba(255,70,54,.5)':'transparent'}"><title>P1-${2*k+1}/${2*k+2}: ${fn[k]}</title></rect>`; }
  }
  s += `</svg>`;
  return s;
}
/* Front edge: heights from the Gerber (LED pads at 0.355/0.505/0.78 in, handle holes at 0.93/1.23/1.55 in from the top edge).
   The handle plate outline and the button position are inferred: no handle drawing exists for this card. */
function frontSVG(t){
  const f=fwAt(t); const y=v=>14+v*100;
  const led=(yy,on,col,lb)=>`<circle cx="34" cy="${yy}" r="7" fill="#111"/><circle cx="34" cy="${yy}" r="5" fill="${on?col:'#3a3d3b'}" ${on?'filter="url(#d4bglow2)"':''}/><text x="48" y="${yy+4}" font-size="9.5" fill="#b8bcbf">${lb}</text>`;
  return `<svg viewBox="0 0 120 310" style="width:100%;max-width:150px;display:block" role="img" aria-label="D8204B front edge">
    <defs><filter id="d4bglow2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect x="8" y="14" width="100" height="275" rx="5" fill="var(--dev)" stroke="var(--line)"/>
    ${led(y(.355),f.green,'#3fe06a','LOCK')}${led(y(.505),f.red,'#ff4636','NO LOCK')}${led(y(.78),f.eq,'#ffd23a','EQ')}
    <g class="d4b-hot" data-a="eq" style="cursor:pointer"><circle cx="94" cy="${y(.66)}" r="9" fill="#0c0c0c"/><circle cx="94" cy="${y(.66)}" r="${D.eq?5:6.5}" fill="#d9d4c4"/><title>EQ button (SW1). Click.</title></g>
    <rect x="18" y="${y(.86)}" width="80" height="${y(1.62)-y(.86)}" rx="6" fill="var(--dev2)" stroke="var(--line)"/>
    ${[.93,1.23,1.55].map(v=>`<circle cx="58" cy="${y(v)}" r="4" fill="#555"/>`).join('')}
    <text x="58" y="${y(2.1)}" font-size="13" font-weight="700" fill="#cfd3d6" text-anchor="middle" transform="rotate(90 58 ${y(2.1)})">D8204B</text>
    <text x="58" y="304" font-size="8.5" fill="var(--ink2)" text-anchor="middle">1.00″ × 2.75″</text></svg>`;
}
/* Rear terminal: BNC3 (MF82/10: input + loop, 8 outputs) and BNC1 (MF82/12: input, 6 outputs), drawn from the
   2012 manual page "D8204 TERMINAL OPTIONS" — layout only, not to scale. */
function rearSVG(t){
  const bnc=(x,y,lb,state,act,title)=>{
    const col = state==='aes'?'var(--led-g)':state==='free'?'var(--warn)':state==='alarm'?'var(--bad)':state==='on'?'var(--accent)':'#666';
    return `<g ${act?`class="d4b-hot" data-a="${act}" style="cursor:pointer"`:''}><circle cx="${x}" cy="${y}" r="21" fill="#a98d3c" stroke="#5e4d1c" stroke-width="2"/><circle cx="${x}" cy="${y}" r="13" fill="#e1cf8c"/><circle cx="${x}" cy="${y}" r="4" fill="#6d5410"/>
      <circle cx="${x+17}" cy="${y-17}" r="4.5" fill="${col}"/><text x="${x}" y="${y+32}" font-size="10" text-anchor="middle" fill="#b8bcbf">${lb}</text>${title?`<title>${title}</title>`:''}</g>`; };
  const oState=k=>{ const o=outAt(k,t); if (o.absent) return null; if (o.alarm) return o.low?'alarm':'off'; return o.s==='aes'?'aes':o.s==='free'?'free':'off'; };
  const oTitle=k=>{ const o=outAt(k,t); if (o.alarm) return `OUT 8 BNC = ALARM (P1-21, NO_LOCK open collector): ${o.low?'pulled low — card unlocked':'open — locked'}`; return `DIGITAL OUT ${k+1} (P1-${OUTS[k].pin}, ${OUTS[k].drv}): ${TXTXT[o.s]}, ${o.vpp.toFixed(2)} V p-p ${D.load[k]?'into 75 Ω':'unterminated'}. Click to ${D.load[k]?'remove':'add'} the load.`; };
  const inS = inputOn(t)?'on':'off';
  let s=`<svg viewBox="0 0 230 350" style="width:100%;max-width:250px;display:block" role="img" aria-label="${D.rear} rear terminal">
    <rect x="40" y="6" width="150" height="338" rx="6" fill="var(--dev)" stroke="var(--line)"/><text x="115" y="22" text-anchor="middle" font-size="11" font-weight="700" fill="#cfd3d6">${D.rear}${D.rear==='BNC3'?' (MF82/10)':' (MF82/12)'}</text>`;
  if (D.rear==='BNC3'){
    s+=bnc(85,52,'INPUT',inS,'in','DIGITAL INPUT (P1-1/2). Click to pull / plug the input at the playhead.');
    s+=bnc(145,52,'LOOP',D.loop==='75'?'on':'off','loop',`INPUT LOOP: ${D.loop==='75'?'cable to a terminated device':'open'} (click)`);
    s+=`<line x1="106" y1="52" x2="124" y2="52" stroke="#5e4d1c" stroke-width="3"/>`;
    for (let k=0;k<8;k++) s+=bnc(k%2?145:85, 112+Math.floor(k/2)*58, k===7&&D.h1==='ALARM'?'ALARM':'OUT '+(k+1), oState(k), 'out'+k, oTitle(k));
  } else {
    s+=bnc(85,52,'INPUT',inS,'in','DIGITAL INPUT. Click to pull / plug the input at the playhead.');
    for (let k=0;k<6;k++) s+=bnc(k%2?85:145, 92+k*36, 'OUT '+(k+1), oState(k), 'out'+k, oTitle(k));
  }
  return s+`</svg>`;
}
function bindHot(root){
  root.querySelectorAll('.d4b-hot').forEach(g=>g.onclick=()=>{ const a=g.dataset.a;
    if (a==='eq') A.eq(); else if (a==='term') A.term({'75':'110','110':'HIZ','HIZ':'75'}[D.term]); else if (a==='h1') A.h1(D.h1==='ALARM'?'OUT8':'ALARM');
    else if (a==='in') A.input(!inputOn(SIM.t)); else if (a==='loop') A.set('loop', D.loop==='75'?'open':'75', `Input loop BNC: ${D.loop==='75'?'open':'cable to a terminated device'}`);
    else if (a.startsWith('out')){ const k=+a.slice(3); if (!(k===7&&D.h1==='ALARM')) A.load(k); } });
  root.querySelectorAll('[data-p]').forEach(r=>r.onclick=()=>{ D.sel=r.dataset.p; SIM.refresh(); });
}
document.addEventListener('keydown', e=>{
  if (!window.__d8204bActive || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  const k=e.key.toLowerCase(); const m={q:()=>A.eq(), t:()=>A.term({'75':'110','110':'HIZ','HIZ':'75'}[D.term]), i:()=>A.input(!inputOn(SIM.t)), h:()=>A.h1(D.h1==='ALARM'?'OUT8':'ALARM'), p:()=>A.power()};
  if (m[k]){ m[k](); e.preventDefault(); }
});
function controlsHTML(){
  const opt=(arr,cur)=>arr.map(([v,l])=>`<option value="${v}" ${String(v)===String(cur)?'selected':''}>${l}</option>`).join('');
  return `<div class="d4b-ctl" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px">
    <label class="small">Coax <input type="range" id="d4b-len" min="0" max="1600" step="10" value="${D.len}" style="vertical-align:middle;width:120px"> <span class="mono" id="d4b-lenv">${D.len} m</span></label>
    <label class="small">Source <select id="d4b-src">${opt([[0.2,'0.2 V'],[0.5,'0.5 V'],[1,'1.0 V'],[2,'2.0 V'],[7,'7.0 V']],D.src)}</select></label>
    <label class="small">fs <select id="d4b-fs">${opt([[32000,'32 kHz'],[44100,'44.1 kHz'],[48000,'48 kHz'],[96000,'96 kHz']],D.fs)}</select></label>
    <label class="small">TERM <select id="d4b-term">${opt([['75','75 Ω'],['110','110 Ω'],['HIZ','HiZ (removed)']],D.term)}</select></label>
    <label class="small">H1 <select id="d4b-h1">${opt([['OUT8','OUT 8'],['ALARM','ALARM']],D.h1)}</select></label>
    <label class="small">Rear <select id="d4b-rearsel">${opt([['BNC3','BNC3 (MF82/10)'],['BNC1','BNC1 (MF82/12)']],D.rear)}</select></label>
    <label class="small">Firmware <select id="d4b-fw">${opt([['v101','v101 (2010)'],['v100','v100 (2005)'],['bak','V200.$$$ (9 May 2005)']],D.fw)}</select></label>
    <button data-b="eq">EQ button</button><button data-b="in">${inputOn(SIM.t)?'Pull input here':'Plug input here'}</button><button data-b="pw">Power-cycle here</button><button data-b="clr">Clear events</button><button data-b="rst">Defaults</button></div>
    <div class="small muted" style="margin-top:4px">Click the board: SW1 (EQ), the TERM and H1 jumpers, any chip for its notes. Click the rear BNCs to pull the input or change loads. Keys: Q EQ · T term · H H1 · I input · P power.</div>`;
}
function bindControls(root){
  const g=id=>root.querySelector('#'+id);
  if (g('d4b-len')){ g('d4b-len').oninput=e=>{ g('d4b-lenv').textContent=e.target.value+' m'; }; g('d4b-len').onchange=e=>A.set('len',+e.target.value,`Coax length → ${e.target.value} m`); }
  if (g('d4b-src')) g('d4b-src').onchange=e=>A.set('src',+e.target.value,`Upstream level → ${e.target.value} V p-p`);
  if (g('d4b-fs')) g('d4b-fs').onchange=e=>A.set('fs',+e.target.value,`Upstream sample rate → ${e.target.value/1000} kHz`);
  if (g('d4b-term')) g('d4b-term').onchange=e=>A.term(e.target.value);
  if (g('d4b-h1')) g('d4b-h1').onchange=e=>A.h1(e.target.value);
  if (g('d4b-rearsel')) g('d4b-rearsel').onchange=e=>A.set('rear',e.target.value,`Rear terminal → ${e.target.value}`);
  if (g('d4b-fw')) g('d4b-fw').onchange=e=>A.fw(e.target.value);
  root.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>({eq:()=>A.eq(), in:()=>A.input(!inputOn(SIM.t)), pw:()=>A.power(), clr:()=>A.clearEv(), rst:()=>A.reset()})[b.dataset.b]());
}

/* ---------------- timeline lanes ---------------- */
function bar(c,X,t0,t1,y,h,fn){            // fn(t) → [colour,label] or null; sampled per 2 px, labels on long runs
  const x0=X(t0), x1=X(t1), N=Math.max(20,Math.min(1600,Math.floor((x1-x0)/2))); let run=null;
  const flush=(xe)=>{ if (run && run.v){ if (xe-run.x>60){ c.fillStyle=SIM.css('--ink'); c.font='10.5px sans-serif'; c.fillText(run.v[1], run.x+4, y+h/2+4); } } };
  for (let i=0;i<N;i++){ const ta=t0+(t1-t0)*i/N, tb=t0+(t1-t0)*(i+1)/N; const v=fn((ta+tb)/2); const xa=X(ta), xb=X(tb);
    if (v){ c.fillStyle=v[0]; c.globalAlpha=.55; c.fillRect(xa,y+4,xb-xa+.6,h-8); c.globalAlpha=1; }
    if (!run || (run.v&&run.v[1])!==(v&&v[1])){ flush(xa); run={x:xa,v}; } }
  flush(x1);
}
function passesIn(t0,t1,cb){                 // iterate main-loop passes in [t0,t1]
  const segs=[];
  if (D.bootAt===null) segs.push([0,t0,t1]);
  else { if (t0<D.bootAt) segs.push([0,t0,Math.min(t1,D.bootAt)]); const ms_=D.bootAt+RAIL_T+INIT_CYC*TCY; if (t1>ms_) segs.push([ms_, Math.max(t0,ms_), t1]); }
  const seen=new Set();
  for (const [T0,a,b] of segs){ if (b<=a) continue; const n0=Math.floor((a-T0)/PASS), n1=Math.floor((b-T0)/PASS);
    for (let n=n0;n<=n1;n++){ const key=T0+'/'+n; if (seen.has(key)) continue; seen.add(key); const ps=T0+n*PASS, pe=ps+PASS; const lim=(D.bootAt!==null && T0===0)? D.bootAt : Infinity; if (ps>=lim) continue; cb(n,ps,Math.min(pe,lim)); } }
}
const STEPCOL = ['--ink2','--accent','--accent2','--warn','--led-g','--ink2'];
function lanes(){
  const css=n=>SIM.css(n); const fe=frontEnd();
  const L=[];
  L.push({label:`AES in at the card (${D.fs/1000} kHz frames)`, h:26, draw(c,X,t0,t1,y,h){
    bar(c,X,t0,t1,y,h,t=>inputOn(t)?null:[css('--ink2'),'no input']);
    if (inputOn((t0+t1)/2)) SIM.pulses(c,X,t0,t1,y,h,1/D.fs,0,0.5/D.fs/32,fe.ok?css('--accent'):css('--warn'),'AES3 frames'+(fe.ok?'':' (eye too small)')); }});
  L.push({label:'CS8427 PLL', h:24, draw(c,X,t0,t1,y,h){ bar(c,X,t0,t1,y,h,t=>{ const s=pllState(t); return s==='locked'?[css('--led-g'),'locked']:s==='acq'?[css('--warn'),'acquiring (≈35 ms, inferred)']:s==='nosig'?[css('--bad'),'no signal — VCO ≈300 kHz']:s==='weak'?[css('--bad'),'signal below threshold']:[css('--ink2'),'off / reset / RUN=0']; }); }});
  L.push({label:'reg 16 UNLOCK (block edges)', h:22, draw(c,X,t0,t1,y,h){ bar(c,X,t0,t1,y,h,t=>fwAt(t).chip==='run'&&unlockBit(t)?[css('--bad'),'UNLOCK = 1']:null);
    SIM.pulses(c,X,t0,t1,y+h-6,6,BLK(),0,BLK()/192,css('--ink2'),'blocks'); }});
  L.push({label:'PIC16F874 main loop', h:30, draw(c,X,t0,t1,y,h){
    bar(c,X,t0,t1,y,h,t=>{ const e=eraAt(t); return e.kind==='off'?[css('--ink2'),'power off']:e.kind==='init'?[css('--warn'),'INIT · powerupdelay · first refreshes']:null; });
    const px=X(t0+PASS)-X(t0); let cnt=0;
    passesIn(t0,t1,(n,ps,pe)=>{ cnt++;
      if (px>40){ PROG.steps.forEach((s,i)=>{ const a=ps+s.a*TCY, b=Math.min(pe,ps+s.b*TCY); c.fillStyle=css(STEPCOL[i]); c.globalAlpha=.75; c.fillRect(X(a),y+3,Math.max(1,X(b)-X(a)-.5),h-6); c.globalAlpha=1;
          if (X(b)-X(a)>80){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(s.name, X(a)+3, y+h/2+3); } }); }
      else if (px>2.5){ c.fillStyle=n%2?css('--accent'):css('--accent2'); c.globalAlpha=.7; c.fillRect(X(ps),y+3,Math.max(1,X(pe)-X(ps)-.5),h-6); c.globalAlpha=1; } });
    if (px<=2.5 && cnt){ c.fillStyle=css('--accent'); c.globalAlpha=.25; c.fillRect(X(t0),y+8,X(t1)-X(t0),h-16); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${cnt} passes of ${PROG.total} cycles = ${SIM.fmtDur(PASS)} (crystal 4.9152 MHz)`, X(t0)+6, y+h/2+4); } }});
  L.push({label:'SPI: CS1 · CS2 · CCLK', h:40, draw(c,X,t0,t1,y,h){
    const pxc = (X(t0+TCY)-X(t0)); const px=pxc*PROG.total;
    if (px<6){ c.fillStyle=css('--ink2'); c.font='11px '+css('--mono'); c.fillText(`${44*Math.round((t1-t0)/PASS)} bytes · ≈${Math.round(350*(t1-t0)/PASS).toLocaleString()} CCLK pulses in view`, X(t0)+6, y+h/2+4); return; }
    passesIn(t0,t1,(n,ps,pe)=>{ for (const o of PROG.ops){ if (o.kind!=='w' && o.kind!=='r') continue; const a=ps+o.o*TCY, b=ps+(o.o+o.cyc)*TCY; if (b<t0||a>t1||a>=pe) continue;
      const row = o.cs==='12'? [0,1] : o.cs==='1'? [0] : [1];
      row.forEach(r=>{ c.fillStyle = r? css('--ink2') : (o.kind==='r'? css('--warn') : css('--accent')); c.globalAlpha=.6; c.fillRect(X(a), y+2+r*12, Math.max(1,X(b)-X(a)-.5), 10); c.globalAlpha=1; });
      if (X(b)-X(a)>34){ c.fillStyle=css('--ink'); c.font='9.5px '+css('--mono'); const v = o.kind==='r'? (o.cs==='1'? hex(Lpass(eraAt(a),n)?0:0x10) : 'Z?') : hex(o.val==='reg13'? fwAt(a).reg13 : o.val); c.fillText(v, X(a)+2, y+11+(o.cs==='2'?12:0)); }
      if (pxc>0.6) o.clk.forEach(k=>{ const ta=ps+k*TCY; c.fillStyle=css('--ink'); c.fillRect(X(ta), y+27, Math.max(1,pxc), 10); });
    } });
    c.fillStyle=css('--ink2'); c.font='9px sans-serif'; c.fillText('CS1', X(t0)+1, y+10); c.fillText('CS2', X(t0)+1, y+22); }});
  L.push({label:'lock_8420 bit 0', h:20, draw(c,X,t0,t1,y,h){ bar(c,X,t0,t1,y,h,t=>{ const f=fwAt(t); return f.L===null? null : f.L? [css('--led-g'),'1 = locked'] : [css('--bad'),'0 = no lock']; }); }});
  L.push({label:'LEDs: LOCK · NO LOCK · EQ', h:30, draw(c,X,t0,t1,y,h){
    const N=Math.max(40,Math.min(1200,Math.floor((X(t1)-X(t0))/2))); const rows=[['green','#3fc04a'],['red','#e3453a'],['eq','#e8c23a']];
    rows.forEach(([k,col],r)=>{ c.fillStyle=col; for (let i=0;i<N;i++){ const ta=t0+(t1-t0)*(i+.5)/N; if (fwAt(ta)[k]) c.fillRect(X(t0+(t1-t0)*i/N), y+3+r*9, (X(t1)-X(t0))/N+.6, 7); } }); }});
  L.push({label:`NO_LOCK (Q1) → P1-21 ${D.h1==='ALARM'?'(ALARM)':'(H1 on OUT 8: not wired out)'}`, h:20, draw(c,X,t0,t1,y,h){ bar(c,X,t0,t1,y,h,t=>fwAt(t).alarm?[css('--bad'),'pulled low']:null); }});
  L.push({label:'reg 3 as last written', h:20, draw(c,X,t0,t1,y,h){ bar(c,X,t0,t1,y,h,t=>{ const f=fwAt(t); return f.chip!=='run'?null: f.txoff?[css('--bad'),'0xD5 TXOFF=1']:[css('--accent2'),'0x95']; }); }});
  L.push({label:'TXP → 8 output drivers', h:24, draw(c,X,t0,t1,y,h){ bar(c,X,t0,t1,y,h,t=>{ const s=txAt(t); return s==='aes'?[css('--led-g'),TXTXT.aes]:s==='free'?[css('--warn'),TXTXT.free]:[css('--ink2'),TXTXT[s]]; }); }});
  return L;
}

/* ---------------- scope: one AES3 subframe in and out ---------------- */
function frameBits(n, trunc){
  const v = 0.1*Math.sin(2*Math.PI*1000*n/D.fs);
  let s = Math.round(v*8388607) + ((n*7919)%13 - 6); if (trunc) s = s & ~0xF; if (s<0) s += 1<<24;
  const bits=new Array(32).fill(0); for (let b=0;b<24;b++) bits[4+b]=(s>>b)&1;
  let par=0; for (let b=4;b<31;b++) par^=bits[b]; bits[31]=par;
  return {bits, raw:s};
}
function biphase(pre, bits){
  const P={X:[1,1,1,0,0,0,1,0],Z:[1,1,1,0,1,0,0,0]}[pre]; const lv=P.slice(); let cur=lv[7];
  for (let i=4;i<32;i++){ cur=1-cur; lv.push(cur); if (bits[i]) cur=1-cur; lv.push(cur); } return lv;
}
function drawScope(cv, info, t){
  const {c,w} = SIM.canvas(cv, 190); const fe=frontEnd(); const n=Math.floor(t*D.fs), pre = n%192===0?'Z':'X';
  const fin=frameBits(n,false), fout=frameBits(n,true);
  const lvIn=biphase(pre,fin.bits), lvOut=biphase(pre,fout.bits);
  const ink=SIM.css('--ink'), ink2=SIM.css('--ink2'), acc=SIM.css('--accent'), bad=SIM.css('--bad'), grid=SIM.css('--grid');
  const x0=60, pw=w-x0-10, cw=pw/64;
  // input at RXP: one-pole low-pass for the net HF loss (cable − EQ), plus overshoot when over-equalised — inferred shape
  const on = inputOn(t), net = fe.loss + fe.pen - fe.boost, hc = 1/(128*D.fs);
  const fc = net>0.3? fe.f0/Math.sqrt(Math.pow(10,net/10)-1) : fe.f0*8;
  const amp = fe.vcard*2*fe.g2lf/2;                  // LF half-swing at RXP
  const ys = 52, sc = 34/Math.max(amp, fe.thr);
  c.strokeStyle=grid; c.beginPath(); c.moveTo(x0,ys); c.lineTo(x0+pw,ys); c.stroke();
  c.setLineDash([4,3]); c.strokeStyle=bad; [1,-1].forEach(sg=>{ c.beginPath(); c.moveTo(x0,ys-sg*fe.thr/2*sc); c.lineTo(x0+pw,ys-sg*fe.thr/2*sc); c.stroke(); }); c.setLineDash([]);
  c.strokeStyle=acc; c.lineWidth=1.4; c.beginPath(); let yv=0, prev=lvIn[0]?1:-1, hp=0;
  const sub=10, a1=1-Math.exp(-2*Math.PI*fc*hc/sub);
  for (let i=0;i<64;i++){ const xv=lvIn[i]?1:-1; for (let k=0;k<sub;k++){ const lp=yv+(xv-yv)*a1; hp = (xv!==prev && k===0)? (xv-prev)*Math.min(1,fe.over/12) : hp*0.6; yv=lp; prev=xv; const out=on? (yv+hp)*amp : 0; const X=x0+(i+k/sub)*cw, Y=ys-out*sc; (i||k)?c.lineTo(X,Y):c.moveTo(X,Y); } }
  c.stroke(); c.lineWidth=1;
  c.fillStyle=ink; c.font='11px sans-serif'; c.fillText('RXP', 6, ys+4); c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText(on? `eye ${fe.rxp.toFixed(2)} V p-p` : 'no input', 6, ys+18);
  // output
  const yo=140, st=txAt(t); c.fillStyle=ink; c.font='11px sans-serif'; c.fillText('OUT', 6, yo+4); c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText(st==='aes'?'1.25 V p-p':TXTXT[st].split(' (')[0], 6, yo+18);
  c.strokeStyle=st==='aes'?SIM.css('--led-g'):st==='free'?SIM.css('--warn'):ink2; c.lineWidth=1.4; c.beginPath();
  for (let i=0;i<64;i++){ let v = st==='aes'? (lvOut[i]?1:-1) : st==='free'? (Math.sin(i*0.37+n)>0?1:-1) : 0; if (st==='free' && i%7) v = (Math.sin(Math.floor(i/7)+n)>0?1:-1); const Y=yo-v*24; i?c.lineTo(x0+i*cw,Y):c.moveTo(x0,Y); c.lineTo(x0+(i+1)*cw,Y); }
  c.stroke(); c.lineWidth=1;
  [[0,8,'preamble'],[8,16,'aux 4 bits'],[16,56,'audio 20 bits'],[56,64,'V U C P']].forEach(([a,b,l])=>{ c.fillStyle=ink2; c.font='10px sans-serif'; c.fillText(l, x0+a*cw+2, 100); c.strokeStyle=grid; c.beginPath(); c.moveTo(x0+a*cw,88); c.lineTo(x0+a*cw,180); c.stroke(); });
  const fmt=b=>b.slice(4,28).reverse().join('');
  info.innerHTML = `frame ${n.toLocaleString()} (${n%192}/191 of the block) · subframe A · one cell = ${SIM.fmtDur(hc)} · fundamental ${(fe.f0/1e6).toFixed(3)} MHz<br>
    in : 0x${fin.raw.toString(16).padStart(6,'0').toUpperCase()} = ${fmt(fin.bits)}<br>
    out: 0x${fout.raw.toString(16).padStart(6,'0').toUpperCase()} = ${fmt(fout.bits)} <span class="muted">— reg 6 = 0x92 sets SORES = 01 (20-bit) for “SDOUT and the AES3 output” (datasheet), so the 4 LSBs are shown cleared and the parity recomputed; whether the TXD=10 path really truncates is ${inf}</span><br>
    <span class="muted">Upstream test signal: 1 kHz at −20 dBFS with a little noise in the LSBs (${'chosen for the demo'}). The red dashed lines are the lock threshold referred to RXP; the input trace shape is ${inf}.</span>`;
}

/* ================================================================ VIEWS ================================================================ */
function partInfo(){ const p=PARTS[D.sel]; return p? `<h3>${p.t}</h3><p class="small">${p.d}</p>` : ''; }
function feTable(){ const fe=frontEnd();
  return `<table class="kv">
    <tr><th>Line</th><td class="mono">${D.src} V p-p source · ${D.len} m 75 Ω coax · ${D.fs/1000} kHz · loss ${fe.loss.toFixed(1)} dB at ${(fe.f0/1e6).toFixed(2)} MHz ${inf}</td></tr>
    <tr><th>Termination</th><td class="mono">${D.term==='HIZ'?'HiZ (R49 3K)':D.term+' Ω'}${fe.Rl<1e6?' ∥ 75 Ω on the loop':''} → ${fe.R>2000?'≈3 kΩ':fe.R.toFixed(1)+' Ω'} · Γ ${fe.gam.toFixed(2)} · ${fe.vcard.toFixed(2)} V p-p at T1${fe.overload?' <b style="color:var(--bad)">over 7 V spec</b>':''}</td></tr>
    <tr><th>U1A ×2 → U1B</th><td class="mono">LF ${fe.lfAtU1A.toFixed(2)} → ${fe.outU1B.toFixed(2)} V p-p · U1B HF gain ${fe.g2.toFixed(2)} (${D.eq?'EQ in, +'+fe.boost.toFixed(1)+' dB':'flat'})${fe.over>1?' · over-equalised by '+fe.over.toFixed(1)+' dB':''}</td></tr>
    <tr><th>RXP eye</th><td class="mono">${fe.rxp.toFixed(3)} V p-p vs ${fe.thr.toFixed(3)} needed → <b style="color:${fe.ok?'var(--led-g)':'var(--bad)'}">${fe.ok?'can lock':'NO LOCK'}</b> (${fe.margin>=0?'+':''}${fe.margin.toFixed(1)} dB)</td></tr>
    <tr><th>Longest cable now</th><td class="mono">≈${Math.max(0,fe.maxLen).toFixed(0)} m ${inf} · manual: 600 m flat, “5000 ft” with EQ${fe.fsOk?'':' · <b style="color:var(--warn)">fs outside 30–50 kHz spec</b>'}</td></tr></table>`; }
function stateTable(t){ const f=fwAt(t), e=eraAt(t); const st = f.step>=0? PROG.steps[f.step] : null;
  return `<table class="kv">
    <tr><th>PIC</th><td class="mono">${f.era==='off'?'no power':f.era==='init'?'INIT (cycle '+f.initCyc+' of '+INIT_CYC+')':'pass #'+f.n+' · cycle '+Math.floor(f.cyc)+'/'+PROG.total+' · '+st.name}</td></tr>
    <tr><th>CS8427</th><td class="mono">${f.chip} · PLL ${pllState(t)} · UNLOCK ${f.chip==='run'?(unlockBit(t)?1:0):'—'}</td></tr>
    <tr><th>lock_8420</th><td class="mono">${f.L===null?'— (INIT)':'0b0000000'+f.L+' (bit 1 = floating read of the missing AES2)'}</td></tr>
    <tr><th>Ports</th><td class="mono">RD7=${f.green} RB0=${f.red} RB2=${f.rb2} RC6=${f.alarm} RC7(RST)=${f.chip==='reset'||f.chip==='off'?0:1}</td></tr>
    <tr><th>cs8420reg13</th><td class="mono">${f.reg13!==undefined?hex(f.reg13)+' '+bin(f.reg13):'0x95 (INIT)'}</td></tr>
    <tr><th>Outputs</th><td class="mono">${TXTXT[txAt(t)]}${D.h1==='ALARM'?' · OUT 8 = ALARM '+(f.alarm?'(low)':'(open)'):''}</td></tr></table>`; }
function traceHTML(){ return D.log[0]? `<div><b>${esc(D.log[0].name)}</b> at ${SIM.fmtT(D.log[0].t)}</div>`+D.log[0].trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Click the EQ button, a jumper or a BNC. Each step the hardware and v200.asm take is listed here.</div>'; }

function viewSim(m){
  window.__d8204bActive = true;
  m.innerHTML = `
  ${card('D8204B ISS3 board at the playhead — real silkscreen and copper (GERBERS/D8204B-ISS3.SLK, .TOP)', `<div id="d4b-board"></div>${controlsHTML()}`)}
  <div class="grid2">
    <div>${card('Front edge · rear terminal', `<div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap"><div id="d4b-front" style="flex:0 0 150px"></div><div id="d4b-rear" style="flex:0 0 250px"></div><div id="d4b-part" style="flex:1 1 200px"></div></div>
      <p class="small muted">Front edge heights come from the Gerber; the handle plate outline is ${inf}. The rear terminal is drawn from the 2012 manual's “D8204 TERMINAL OPTIONS” page; which BNC number goes to which P1 pin is ${inf} (in pin order).</p>`)}
      ${card('Signal at each stage (static)', `<div id="d4b-fe"></div>`)}</div>
    <div>${card('What the hardware and firmware did (last action)', `<div id="d4b-trace" class="log"></div>`)}${card('State at the playhead', `<div id="d4b-state"></div>`)}</div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek)', `<canvas id="d4b-tl"></canvas><p class="small muted">Pass length is worked out from v200.asm and the 4.9152 MHz crystal: ${PROG.total} cycles × 813.8 ns = ${ms(PASS)}. Zoom to “1 loop pass” to see the 44 SPI bytes, then to 40 µs to see each CCLK pulse.</p>`)}
  <div class="grid2">${card('Scope at the playhead: one AES3 subframe at RXP and at an output', `<canvas id="d4b-scope"></canvas><div id="d4b-bits" class="small mono"></div>`)}${card('Action log', `<div id="d4b-log" class="log"></div>`)}</div>`;
  bindControls(m);
  const draw=()=>{ const t=SIM.t;
    const b=m.querySelector('#d4b-board'); b.innerHTML=boardSVG(t,{sel:true}); bindHot(b);
    const f=m.querySelector('#d4b-front'); f.innerHTML=frontSVG(t); bindHot(f);
    const r=m.querySelector('#d4b-rear'); r.innerHTML=rearSVG(t); bindHot(r);
    m.querySelector('#d4b-part').innerHTML=partInfo();
    m.querySelector('#d4b-fe').innerHTML=feTable(); m.querySelector('#d4b-state').innerHTML=stateTable(t);
    m.querySelector('#d4b-trace').innerHTML=traceHTML();
    const ib=m.querySelector('[data-b="in"]'); if (ib) ib.textContent = inputOn(t)?'Pull input here':'Plug input here';
    m.querySelector('#d4b-log').innerHTML = D.log.map(e=>`<div><b>${esc(e.name)}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#d4b-tl'), lanes(), {labelW:200});
    drawScope(m.querySelector('#d4b-scope'), m.querySelector('#d4b-bits'), t);
  };
  SIM.on('time', draw);
}

/* ---------------- tutorial (from the 2012 D8204 manual, which documents this board) ---------------- */
const LESSONS = [
  {title:'Meet the D8204B', body:`<p>The D8204B is a plug-in card for the Ward-Beck <b>MF82</b> frames. It takes one AES/EBU digital audio feed on 75 Ω coax and gives out <b>eight</b> clean copies. It doesn't just copy the signal: a CS8427 receiver locks to it and a transmitter sends it out again on a fresh clock (<b>reclocking</b>).</p><p>On the front edge you see three LEDs (green LOCK, red NO LOCK, yellow EQ) and an EQ push-button. On the board there are two jumpers: <b>INPUT TERMINATION</b> and <b>H1</b> (ALARM / OUT 8).</p><p class="muted">The 2012 “D8204 manual” in the archive describes exactly this board: its schematic pages are D8204B ISS3.</p>`, check:()=>true, auto:true},
  {title:'1 · Pick the rear terminal', body:`<p>The card plugs into the frame; the cables go on a terminal module behind it. The manual lists two: <b>BNC1</b> (MF82/12 frame, 1 input + 6 outputs) and <b>BNC3</b> (MF82/10 only, input with loop-through + all 8 outputs).</p><p><b>Goal:</b> choose BNC3 so all eight outputs are usable.</p>`, check:()=>D.rear==='BNC3', hint:'Use the Rear menu under the board.'},
  {title:'2 · Set the input termination', body:`<p>The factory setting is <b>75 Ω</b>: the jumper bridges the two pins marked 75. The 110 position is for 110 Ω lines. With the jumper removed the input is high-impedance (HiZ).</p><p>Click the TERM jumper near T1 at the right of the board to step through the positions and watch the reflection figure in “Signal at each stage”.</p><p><b>Goal:</b> 75 Ω, with the loop BNC open.</p>`, check:()=>D.term==='75'&&D.loop==='open', hint:'Click the TERM jumper until it shows 75 Ω; click the LOOP BNC on the rear to open it.'},
  {title:'3 · Loop-through means HiZ', body:`<p>If the input continues on through the LOOP BNC to another device that terminates the line, this card must <b>not</b> terminate too. Two 75 Ω loads in parallel give 37.5 Ω and reflections.</p><p>Connect the loop (click the LOOP BNC), see the margin drop, then remove the jumper (HiZ).</p><p><b>Goal:</b> loop connected, jumper HiZ.</p>`, check:()=>D.loop==='75'&&D.term==='HIZ', hint:'Click LOOP on the rear, then set TERM to HiZ.'},
  {title:'4 · Read the LEDs', body:`<p>Put the termination back to 75 Ω and the loop open. <b>Green LOCK</b> means the receiver is locked to the incoming signal. <b>Red NO LOCK</b> means it cannot lock: no signal, or a signal it can't recover.</p><p>Behind the LEDs is the PIC: every ${ms(PASS)} it reads the CS8427's error register and sets RD7 (green) and RB0 (red).</p><p><b>Goal:</b> green LOCK lit at the playhead.</p>`, check:()=>D.term==='75'&&D.loop==='open'&&fwAt(SIM.t).green===1&&D.eq===false, hint:'TERM 75, loop open, EQ off; a short cable.'},
  {title:'5 · A long cable', body:`<p>The manual says the card copes with up to <b>600 m</b> (2000 ft) of coax without help. Drag the coax slider to <b>900 m</b>.</p><p>The eye at the receiver shrinks below the threshold: the PLL drops out, the red LED lights, and a pass or so later the firmware writes TXOFF so all eight outputs go to 0 V instead of sending garbage.</p><p><b>Goal:</b> 900 m or more, red NO LOCK lit.</p>`, check:()=>D.len>=900&&fwAt(SIM.t).red===1, hint:'Coax slider to 900 m (firmware v101).'},
  {title:'6 · Switch in the equalizer', body:`<p>“For cable lengths in excess of 600 metres, we recommend that the input equalization be activated.” Press the <b>EQ button</b> on the front edge. The yellow LED at the bottom of the LED array lights.</p><p>SW1 puts two RC networks across U1B's input resistor, giving about ${(20*Math.log10(stage2Gain(3.072e6,true)/stage2Gain(3.072e6,false))).toFixed(1)} dB more gain at the AES bit rate (computed from the part values). No firmware is involved.</p><p><b>Goal:</b> EQ on and green LOCK back.</p>`, check:()=>D.eq&&fwAt(SIM.t).green===1, hint:'Click SW1 on the board or the EQ button on the front edge (Q key).'},
  {title:'7 · Wire out the alarm', body:`<p>Jumper <b>H1</b> chooses what edge pin P1-21 carries: output 8, or <b>ALARM</b>, an open-collector tally (Q1) that pulls low when the card is unlocked. The silkscreen marks the two positions “ALARM” and “OUT 8”.</p><p><b>Goal:</b> H1 on ALARM.</p>`, check:()=>D.h1==='ALARM', hint:'Click the H1 jumper near the edge connector, or press H.'},
  {title:'8 · Lose the input', body:`<p>Set the cable back to something short (say 100 m). Then move the playhead to about 0.3 s and <b>pull the input</b> (click INPUT on the rear, or I).</p><p>Read the trace: the CS8427 raises UNLOCK at the next channel-status block boundary, the next READ8420s sees it, REFRESHSTATUS turns the LEDs and the alarm over, and on the next pass reg 3 = 0xD5 turns the transmitter off.</p><p><b>Goal:</b> an input-pull event in the timeline.</p>`, check:()=>D.ev.some(e=>!e.on), hint:'Seek to ~0.3 s, then click the INPUT BNC.'},
  {title:'9 · Plug it back', body:`<p>Move the playhead later (say 0.6 s) and plug the input back. The PLL needs about 35 ms (${inf}) to lock, and the outputs come back one loop pass after the green LED.</p><p>Zoom the timeline to 100 ms around the event to see the hand-off: PLL → UNLOCK bit → lock_8420 → LEDs → reg 3.</p><p><b>Goal:</b> input plugged back after a pull.</p>`, check:()=>{ const i=D.ev.findIndex(e=>!e.on); return i>=0 && D.ev.slice(i).some(e=>e.on); }, hint:'Seek forward, click INPUT again.'},
  {title:'Done', body:`<p>You've set up and tested the card the way the manual describes. The <b>Software</b> tab shows the loop and every SPI byte, <b>One second</b> counts what happens per second, and <b>Findings</b> lists what the firmware and the drawings are “up to”.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){
  window.__d8204bActive = true;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — installing and using the card', `<ol id="d4b-ls" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="d4b-lesson"></div>${card('What the hardware and firmware did', `<div id="d4b-trace" class="log"></div>`)}</div>
    <div>${card('The card', `<div id="d4b-board"></div>${controlsHTML()}<div style="display:flex;gap:16px;margin-top:8px;flex-wrap:wrap"><div id="d4b-front" style="flex:0 0 130px"></div><div id="d4b-rear" style="flex:0 0 230px"></div></div>`)}${card('Signal at each stage', `<div id="d4b-fe"></div>`)}</div></div>`;
  bindControls(m);
  const draw=()=>{ const t=SIM.t;
    const b=m.querySelector('#d4b-board'); b.innerHTML=boardSVG(t); bindHot(b);
    const f=m.querySelector('#d4b-front'); f.innerHTML=frontSVG(t); bindHot(f);
    const r=m.querySelector('#d4b-rear'); r.innerHTML=rearSVG(t); bindHot(r);
    m.querySelector('#d4b-fe').innerHTML=feTable(); m.querySelector('#d4b-trace').innerHTML=traceHTML();
    m.querySelector('#d4b-ls').innerHTML=LESSONS.map((l,i)=>`<li data-i="${i}" style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#d4b-ls li').forEach(li=>li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx], ok=L.check();
    m.querySelector('#d4b-lesson').innerHTML=`<h2>${L.title}</h2>${L.body}<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="d4b-prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="d4b-nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="d4b-rs">Start over</button></div>`;
    m.querySelector('#d4b-prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#d4b-nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#d4b-rs').onclick=()=>{ A.reset(); lessonIdx=0; };
  };
  SIM.on('time', draw);
}

/* ---------------- one second ---------------- */
function viewSecond(m){
  window.__d8204bActive = true;
  m.innerHTML = `${card('One second on the D8204B', `<div id="d4b-ladder"></div>`)}
   <div class="grid2">${card('As the device sees it, at the playhead', `<div id="d4b-state"></div><div id="d4b-op" class="small mono" style="margin-top:6px"></div>`)}${card('As the operator sees it', `<div style="display:flex;gap:16px;flex-wrap:wrap"><div id="d4b-front" style="flex:0 0 130px"></div><div id="d4b-rear" style="flex:0 0 230px"></div></div>`)}</div>
   ${card('Zoom ladder at the playhead (each strip is the highlighted slice of the one above)', `<canvas id="d4b-zl"></canvas>`)}`;
  const draw=()=>{ const t=SIM.t, fs=D.fs, pps=1/PASS;
    const rows=[
      ['AES3 frames (= samples per channel)', fs.toLocaleString(), SIM.fmtDur(1/fs), 'CS8427 receiver → transmitter, reclocked'],
      ['AES3 bit cells (biphase half-cells)', (128*fs).toLocaleString(), SIM.fmtDur(1/fs/128), `${(64*fs/1e6).toFixed(3)} Mbit/s on all 8 outputs`],
      ['Channel-status blocks', (fs/192).toFixed(2), SIM.fmtDur(192/fs), 'UNLOCK in reg 16 is updated on these edges'],
      ['PIC instruction cycles', (XTAL/4).toLocaleString(), '813.8 ns', '4.9152 MHz ÷ 4'],
      ['Main-loop passes', pps.toFixed(1), ms(PASS), `${PROG.total} cycles: clrwdt · 2 × refresh (863) · read (271) · status (21) · goto`],
      ['SPI bytes', Math.round(44*pps).toLocaleString(), SIM.fmtDur(46*TCY), '38 writes + 6 for the read, every pass; half go to a chip that is not fitted'],
      ['CCLK pulses', Math.round(350*pps).toLocaleString(), SIM.fmtDur(5*TCY), 'bit-banged on RC1, 1 cycle high (814 ns) — ≈246 kHz while shifting'],
      ['Full CS8427 register rewrites', Math.round(pps).toLocaleString(), ms(PASS), 'registers 1–17 every pass, whether or not anything changed'],
      ['Lock decisions (LEDs, alarm)', Math.round(pps).toLocaleString(), ms(PASS), 'REFRESHSTATUS'],
      ['Reaction to a lost input', '—', `≤ ${ms(BLK()+2*PASS)}`, 'one block for UNLOCK, up to one pass to read it, one more pass to write TXOFF'],
    ];
    m.querySelector('#d4b-ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table><p class="small muted">Use Step on the transport (1 pass, 1 SPI byte, 1 instruction cycle) to walk through it.</p>`;
    m.querySelector('#d4b-state').innerHTML=stateTable(t);
    const f=fwAt(t); let op='';
    if (f.era==='run'){ const o=PROG.ops.filter(o=>o.o<=f.cyc).pop(); if (o) op=`instruction group: ${esc(o.label)}${o.kind==='w'?' = '+hex(o.val==='reg13'?f.reg13:o.val)+' on CS'+o.cs:''}`; }
    m.querySelector('#d4b-op').innerHTML=op;
    const fr=m.querySelector('#d4b-front'); fr.innerHTML=frontSVG(t); bindHot(fr);
    const r=m.querySelector('#d4b-rear'); r.innerHTML=rearSVG(t); bindHot(r);
    drawLadder(m.querySelector('#d4b-zl'), t);
  };
  SIM.on('time', draw);
}
function drawLadder(cv,t){
  const levels=[['1 second',1],['100 ms',0.1],['1 channel-status block',BLK()],['1 loop pass',PASS],['1 SPI byte',46*TCY]];
  const H=levels.length*46+8, {c,w}=SIM.canvas(cv,H); const x0=170, pw=w-x0-10;
  levels.forEach(([nm,span],i)=>{ const y=6+i*46; const t0=Math.max(0,Math.min(1-span,t-span/2)), t1=t0+span; const X=tt=>x0+(tt-t0)/span*pw;
    c.fillStyle=SIM.css('--ink'); c.font='12px sans-serif'; c.fillText(nm+' ('+SIM.fmtDur(span)+')', 6, y+16);
    c.save(); c.beginPath(); c.rect(x0,y,pw,36); c.clip();
    bar(c,X,t0,t1,y,18,tt=>{ const s=txAt(tt); return s==='aes'?[SIM.css('--led-g'),'outputs: AES']:s==='free'?[SIM.css('--warn'),'free-run']:[SIM.css('--ink2'),'0 V']; });
    if (span<=0.1) passesIn(t0,t1,(n,ps,pe)=>PROG.steps.forEach((s,k)=>{ const a=ps+s.a*TCY,b=Math.min(pe,ps+s.b*TCY); c.fillStyle=SIM.css(STEPCOL[k]); c.globalAlpha=.7; c.fillRect(X(a),y+20,Math.max(1,X(b)-X(a)),14); c.globalAlpha=1; }));
    if (span<1e-4){ passesIn(t0,t1,(n,ps)=>PROG.ops.forEach(o=>(o.clk||[]).forEach(k=>{ const tt=ps+k*TCY; if (tt>t0&&tt<t1){ c.fillStyle=SIM.css('--ink'); c.fillRect(X(tt),y+20,Math.max(1,X(tt+TCY)-X(tt)),14); } }))); }
    c.restore();
    const px=X(t); c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+36); c.stroke();
    if (i<levels.length-1){ const ns=levels[i+1][1], a=Math.max(0,Math.min(1-ns,t-ns/2)); c.fillStyle=SIM.css('--play'); c.globalAlpha=.15; c.fillRect(X(a),y,Math.max(2,ns/span*pw),36); c.globalAlpha=1; }
  });
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  in:{x:16,y:40,w:150,h:84,t:'Input P1-1/2',s:['BNC IN (+ loop on BNC3)','C16 → T1 PE-65612','TERM 75 / 110 / HiZ'],d:'The input arrives on edge pins 1 and 2 from the rear terminal. T1 isolates it. The INPUT TERMINATION jumper puts R24 75R or R9 110R across the secondary (R49 3K is always there).'},
  amp:{x:210,y:40,w:170,h:84,t:'U1 input amp + EQ',s:['U1A ×2 (R4/R1)','U1B −0.87, SW1 EQ networks','D1/D2 clamps'],d:'EL5263 current-feedback dual. SW1 switches R13/C9 and R19/C15 across R5, lifting the gain at the AES bit rate for long cables. The yellow EQ LED is on the same switch.'},
  rx:{x:430,y:40,w:180,h:120,t:'U3 CS8427',s:['receiver + PLL (FILT R23/C20/C17)','TXD=10: TX ← receiver','OUTC=1: recovered clock','TXP → drivers'],d:'Software mode (H/S grounded), SPI control port. Data flow 0x95 / clock 0x49: AES3 in → AES3 out, reclocked by the PLL; the serial audio ports are unused.'},
  pic:{x:430,y:210,w:180,h:100,t:'U25 PIC16F874',s:['4.9152 MHz (X2)','bit-bang SPI RC0/RC1/RC3','CS1 = RC2 (CS2 = RC4: no part)'],d:'v200.asm: rewrites the CS8427 every 1.645 ms, reads reg 16 for UNLOCK, sets the LEDs, alarm and TXOFF.'},
  drv:{x:660,y:40,w:170,h:120,t:'U2, U5 drivers',s:['TXP ÷2 (R18/R26, R47/R45)','4 followers (EL5263)','each → 2 × (1µ + 75R)'],d:'Four amplifier halves, each feeding two outputs through its own coupling capacitor and 75R build-out resistor.'},
  out:{x:870,y:40,w:140,h:120,t:'8 outputs',s:['P1-7 … P1-19','P1-21: OUT 8 or ALARM','(H1 jumper)'],d:'Eight 75 Ω unbalanced outputs. On BNC1 (MF82/12) only six reach BNCs.'},
  led:{x:660,y:210,w:170,h:100,t:'Front edge',s:['L4 green LOCK (RD7)','L3 red NO LOCK (RB0)','EQ yellow (SW1)'],d:'Three 1206 LEDs at the front edge. Green and red are firmware; yellow is wired to the EQ switch.'},
  alm:{x:870,y:210,w:140,h:100,t:'Q1 alarm',s:['RC6 → R29 → 2N4401','R44 4K7 → NO_LOCK','→ H1 → P1-21'],d:'Open-collector tally: Q1 on (pulls low) when the card is unlocked.'},
  pwr:{x:16,y:210,w:364,h:100,t:'Power',s:['+20 V P1-29/30 → F2 → R35 → LM2596 → +5 V','−20 V P1-25/26 → F3 → LM337 → −5.01 V','GND P1-3,8,10,12,14,27,28'],d:'Polyfuses F2/F3 (RXE-050). The buck converter feeds the logic, the CS8427 and the amps\' +5 V; the LM337 gives the −5 V the EL5263s need. Manual: +20 V 47 mA, −20 V 37 mA.'},
};
const WIRES=[['in','amp','balanced → single-ended'],['amp','rx','RXP (C10)'],['rx','drv','TXP'],['drv','out',''],['pic','rx','SPI'],['rx','pic','CDOUT (reg 16)'],['pic','led','RD7 / RB0'],['pic','alm','RC6'],['alm','out','']];
function viewBlock(m){
  window.__d8204bActive=false; let sel='rx';
  m.innerHTML=`<div class="grid2"><div>${card('Block diagram (click a block)', `<div id="d4b-bd"></div>`)}</div><div>${card('Block', `<div id="d4b-bi"></div>`)}${card('Signal path in one line', `<p class="small">Coax → T1 → termination → U1 ×2 and EQ → CS8427 receiver/PLL → CS8427 transmitter (recovered clock) → TXP ÷2 → four EL5263 followers → 8 × (1 µF + 75 Ω) → rear BNCs. The PIC only watches lock and switches the transmitter off.</p>`)}</div></div>`;
  const draw=()=>{ const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 1030 330" style="width:100%"><defs><marker id="d4bar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B_=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const k=Math.min(dx?(bx.w/2)/Math.abs(dx):1e9, dy?(bx.h/2)/Math.abs(dy):1e9); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.4:1.3}" marker-end="url(#d4bar)"/>${l?`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-5}" font-size="10.5" fill="var(--ink2)">${l}</text>`:''}`; });
    for (const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-k="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/><text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+10}" y="${b.y+39+i*16}" font-size="11" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#d4b-bd').innerHTML=s+'</svg>';
    m.querySelectorAll('[data-k]').forEach(g=>g.onclick=()=>{ sel=g.dataset.k; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#d4b-bi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`; };
  draw();
}

/* ---------------- schematics (redrawn from the ISS3 netlist) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=24+n*18;
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-16}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-3}" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach(([pin,net],i)=>{ const yy=y+20+i*18; s+=`<line x1="${x-30}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+4}" y="${yy+4}" font-size="10" fill="var(--ink)">${pin}</text><text x="${x-34}" y="${yy+4}" font-size="10" fill="var(--accent2)" text-anchor="end">${net}</text>`; });
  right.forEach(([pin,net],i)=>{ const yy=y+20+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+30}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-4}" y="${yy+4}" font-size="10" fill="var(--ink)" text-anchor="end">${pin}</text><text x="${x+w+34}" y="${yy+4}" font-size="10" fill="var(--accent2)">${net}</text>`; });
  return s;
}
const T=(x,y,s,o)=>`<text x="${x}" y="${y}" font-size="${(o&&o.fs)||11}" fill="${(o&&o.c)||'var(--ink)'}" ${o&&o.a?`text-anchor="${o.a}"`:''}>${s}</text>`;
const SHEETS=[
  {name:'1 · PIC16F874 (U25)', note:'TQFP-44 pin numbers from d8204B-ISS3.net. Pins not listed are not connected. The code\'s port comments (E2/E1/E0 LEDs, "C6 = CD LED") do not match the board: see Findings.', svg:()=>
    chip(330,50,200,'U25 PIC16F874',[['1 RC7','RESET → U3-9'],['32 RC0','SDO → U3-27 CDIN'],['35 RC1','SCK → U3-28 CCLK'],['36 RC2','CS1 → U3-2'],['37 RC3','SDI ← U3-1 CDOUT'],['42 RC4','CS2 (no other node)'],['43 RC5','n/c'],['44 RC6','R29 4K7 → Q1 base'],['30 OSC1','X2 4.9152 MHz, C64 27p'],['31 OSC2','X2, C66 27p']],
      [['5 RD7','R33 330R → L4 GREEN'],['8 RB0','R32 330R → L3 RED'],['9 RB1','n/c (NET00025)'],['10 RB2','n/c (ISS1: R34 → L5 red)'],['11 RB3/PGM','H13-6'],['16 RB6/PGC','H13-4'],['17 RB7/PGD','H13-2'],['18 MCLR','H13-3, D11'],['7, 28 VDD','+5V'],['6, 29 VSS','GNDD']],'flash, ICSP · MPASM · v200.asm')
    + T(40,330,'Q1 2N4401: B ← R29 ← RC6 · E → GND · C → R44 4K7 → NO_LOCK → H1-3',{fs:11}) + T(40,350,'H1: 1 = R16 75R ← C32 ← OUT2 · 2 = P1-21 (P1M) · 3 = NO_LOCK   (silk: “OUT 8” 1–2, “ALARM” 2–3)',{fs:11})
    + T(40,370,'H13 ICSP 2×3: 1 +5V · 2 PGD · 3 MCLR · 4 PGC · 5 GND · 6 PGM',{fs:11}) + T(40,390,'L4 GREEN, L3 RED: cathodes to GNDD; EQ YELLOW: +5V → R75 330R → EQ → SW1-5 (pole B → SW1-3 GND)',{fs:11}) },
  {name:'2 · CS8427 (U3)', note:'Pins from the netlist; the netlist part is still called CS8420 (ISS1 used one). Pin names from the CS8427 datasheet (software mode).', svg:()=>
    chip(330,50,200,'U3 CS8427 (netlist: CS8420)',[['1 SDA/CDOUT','SDI → RC3'],['2 AD0/CS','CS1 ← RC2'],['3 EMPH','n/c'],['4 RXP','C10 0.1 ← R31 110R ← U1B'],['5 RXN','C12 0.1 → GND'],['6 VA+','R2 10R ← +5V, C3/C7'],['7 AGND','GND'],['8 FILT','R23 4K7 + C20 .068µ ∥ C17 6800p'],['9 RST','RESET ← RC7'],['10–20','RMCK, RERR, ports, INT, U: n/c']],
      [['28 SCL/CCLK','SCK ← RC1'],['27 AD1/CDIN','SDO ← RC0'],['26 (TXN)','n/c'],['25 (TXP)','NET00014 → R18/R26, R47/R45'],['24 H/S','GND (software mode)'],['23 VL+','+5V'],['22 DGND','GND'],['21 OMCK','n/c']],'AES3 transceiver · SPI · S028')
    + T(40,330,'Registers written every pass (v200.asm): 1=0x00 2=0x00 3=0x95/0xD5 4=0x49 5=0x00 6=0x92 9=0x00 10–16=reg 9 value 17=0x10',{fs:11})
    + T(40,350,'Read every pass: reg 16 (Receiver Errors), bit 4 UNLOCK. Only UNLOCK is unmasked (reg 17 = 0x10).',{fs:11}) },
  {name:'3 · Input and EQ (U1)', note:'EL5263IS on the BOM (netlist symbol EL2280C). Component values from the netlist / BOM.', svg:()=>
    T(30,60,'P1-1 ─ C16 0.1 ─ T1-1  T1 PE-65612  T1-3 ─ NET00096 ─┬─ TERM-2',{fs:12}) + T(30,80,'P1-2 ─────────── T1-2          T1-4 ─ GND        ├─ R49 3K ─ GND',{fs:12})
    + T(30,100,'TERM-1 ─ R24 75R ─ GND   ·   TERM-3 ─ R9 110R ─ GND        └─ R10 110R ─ U1-3 (+) · D1/D2 4148 clamps to ±5 V',{fs:12})
    + T(30,140,'U1A: out U1-1 → R4 750R → U1-2 (−) → R1 750R → GND   gain +2',{fs:12})
    + T(30,160,'U1A out → R30 110R → NET00067 → R5 750R → U1-6 (−);  U1-5 (+) = GND;  R3 750R from U1-7 → U1-6   gain −750/860',{fs:12})
    + T(30,180,'EQ network NET00102 (U1-6) → R13 330R + C9 1000p, R19 110R + C15 220p, R17 + C14 (DNI) → NET00103 → SW1-6',{fs:12})
    + T(30,200,'SW1 PHA-2UEE: pole A 6 ↔ 4 (NET00067) when pressed in — inferred pin pairing; pole B 5 ↔ 3 (EQ LED cathode → GND)',{fs:12})
    + T(30,220,'U1-7 → R31 110R → C10 0.1 → U3-4 RXP',{fs:12})
    + T(30,260,`U1B HF gain at 3.072 MHz: flat ${stage2Gain(3.072e6,false).toFixed(3)}, EQ in ${stage2Gain(3.072e6,true).toFixed(2)} → +${(20*Math.log10(stage2Gain(3.072e6,true)/stage2Gain(3.072e6,false))).toFixed(1)} dB (computed from the part values)`,{fs:12,c:'var(--accent2)'}) },
  {name:'4 · Output drivers (U2, U5)', note:'Followers: R22/R28/R38/R41 750R from each output to its inverting input, no resistor to ground.', svg:()=>{
    let s=T(30,50,'U3-25 (TXP) ─┬─ R18 750R ─ NET00010 (U2-3, U2-5) ─ R26 750R ─ GND',{fs:12})+T(30,70,'              └─ R47 750R ─ NET00028 (U5-3, U5-5) ─ R45 750R ─ GND',{fs:12});
    OUTS.forEach((o,k)=>{ s+=T(30,110+k*22,`${o.drv.padEnd(22,' ')} → ${o.c} 1.0u → ${o.r} 75R → P1-${o.pin} (${o.net})${k===7?' → H1-1 → (OUT 8 position) → P1-21':''}`,{fs:12}); });
    return s+T(30,300,'Estimated swing: TXP 0–5 V ÷2 = 2.5 V p-p at each follower → 1.25 V p-p into 75 Ω (manual spec: 1 V p-p) — '+'inferred',{fs:12,c:'var(--accent2)'}); }},
  {name:'5 · Power and edge connector', note:'P1 is an EDAC 30-way 0.156″ edge (footprint value "D8205PCB"). Finger k carries pins 2k−1 (top) and 2k (bottom).', svg:()=>
    T(30,50,'P1-29, P1-30 (+20 V) → F2 RXE-050 → R35 10R ½W → C27 220µ/35 → REG2 LM2596 → L1 PE-53823, D5 SK33 → L2 AL05 → +5V (C46,C47,C100–C104 68µ/10)',{fs:11.5})
    + T(30,74,'P1-25, P1-26 (−20 V) → F3 RXE-050 → C68 220µ/35 → REG1 LM337 → −5V; ADJ: R25 221R to −5V, R27 665R to GND → −1.25 × (1 + 665/221) = −5.01 V',{fs:11.5})
    + T(30,98,'GNDD: P1-3, 8, 10, 12, 14, 27, 28',{fs:11.5})
    + T(30,130,'Edge pins: 1 IN (C16→T1) · 2 IN return (T1-2) · 4, 6 n/c (P1_2, P1_3) · 5 n/c (P1C) · 7, 9, 11, 13, 15, 17, 19 outputs · 21 OUT 8 / ALARM',{fs:11.5})
    + T(30,150,'16, 18, 20, 22, 24 n/c (P1_8…P1_12) · 23 n/c (P1N) · 25/26 −20 V · 27/28 GND · 29/30 +20 V',{fs:11.5})
    + T(30,190,'Manual (2012): +20 V 47 mA max, −20 V 37 mA max.',{fs:11.5,c:'var(--accent2)'}) },
];
function viewSchem(m){
  window.__d8204bActive=false; let i=0;
  m.innerHTML=card('Schematic set — redrawn from d8204B-ISS3.net and the BOM, not the original P-CAD drawing', `<div id="d4b-st" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div style="overflow-x:auto"><div id="d4b-sh"></div></div><p class="small muted" id="d4b-sn"></p>
   <p class="small muted">Original: <span class="mono">D8204B - #PCB/d8204B-ISS3.sch</span> (P-CAD 2002 binary); it is also printed on pages 5–6 of the 2012 D8204 manual. These sheets are a readable guide built from the netlist's pin and net names.</p>`);
  const draw=()=>{ m.querySelector('#d4b-st').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#d4b-st button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#d4b-sh').innerHTML=`<svg viewBox="0 0 900 420" style="width:100%;min-width:720px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="888" height="408" fill="none" stroke="var(--line)"/>${SHEETS[i].svg()}<text x="884" y="406" text-anchor="end" font-size="10" fill="var(--ink2)">D8204B ISS3 · sheet ${i+1}/${SHEETS.length} · redrawn</text></svg>`;
    m.querySelector('#d4b-sn').textContent=SHEETS[i].note; };
  draw();
}

/* ---------------- software ---------------- */
const REGDOC = [
  [1,'Control 1','0x00','SWCLK=0 VSET=0 MUTESAO=0 MUTEAES=0 INT=00 TCBLD=0','defaults'],
  [2,'Control 2','0x00','HOLD=00 (hold last sample on an unmasked error) RMCKF=0 MMR/MMT=0','defaults'],
  [3,'Data Flow Control','0x95 / 0xD5','bit7=1 (reserved “0” on CS8427) TXOFF=0/1 AESBP=0 TXD=10 (TX ← AES3 receiver) SPD=10 bit0=1 (reserved)','TXOFF is the mute; bits 7 and 0 look like CS8420 leftovers'],
  [4,'Clock Source Control','0x49','RUN=1 CLK=00 OUTC=1 (TX clock = recovered clock) INC=0 RXD=01 (PLL from AES3 frames)','reclocking mode, OMCK unused'],
  [5,'Serial In Format','0x00','slave, unused','port not wired'],
  [6,'Serial Out Format','0x92','SOMS=1 SOSF=0 SORES=01 (20-bit) SOJUST=0 SODEL=0 SOSPOL=1 SOLRPOL=0','SORES also applies to the AES3 output (datasheet); D8204A uses 0x82 (24-bit)'],
  [7,'Int 1 Status','(0x00)','read-only — the byte is clocked past','skipped by auto-increment'],
  [8,'Int 2 Status','(0x00)','read-only','skipped'],
  [9,'Int 1 Mask','0x00','all interrupts masked; INT pin not wired',''],
  ['10–16','Int modes, Int 2 mask, CS, errors','= reg 9','seven bare “call shiftout” resend temp0 = cs8420reg19','harmless only while reg 9 = 0'],
  [17,'Receiver Error Mask','0x10','UNLOCKM=1, every other error masked','BIP / parity / validity errors never reported'],
];
function viewSoft(m){
  window.__d8204bActive=true;
  m.innerHTML=`<div class="grid2">${card('Main loop — the step running at the playhead is lit', `<div id="d4b-flow"></div>`)}<div>${card('Lock state machine (REFRESHSTATUS)', `<div id="d4b-fsm"></div>`)}${card('Port map: code comments vs the board', `<div id="d4b-ports"></div>`)}</div></div>
   ${card('CS8427 registers as v200.asm writes them every pass (decoded with the CS8427 datasheet)', `<table class="kv"><tr><th>reg</th><th>name</th><th>value</th><th>bits</th><th>note</th></tr>${REGDOC.map(r=>`<tr><td class="mono">${r[0]}</td><td>${r[1]}</td><td class="mono">${r[2]}</td><td class="small mono">${r[3]}</td><td class="small">${r[4]}</td></tr>`).join('')}</table>`)}
   <div class="grid2">${card('One pass on the SPI bus (the byte at the playhead is marked)', `<div id="d4b-spi" style="max-height:420px;overflow:auto"></div>`)}${card('Memory map: v100 vs v101', `<div id="d4b-mem"></div>`)}</div>`;
  const draw=()=>{ const t=SIM.t, f=fwAt(t);
    let s=`<svg viewBox="0 0 420 380" style="width:100%">`; const bx=(x,y,w,h,lab,sub,on)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${on?'color-mix(in srgb,var(--accent) 30%,var(--panel2))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?2.5:1.2}"/><text x="${x+10}" y="${y+18}" font-size="12.5" font-weight="700" fill="var(--ink)">${lab}</text><text x="${x+10}" y="${y+33}" font-size="10" fill="var(--ink2)">${sub}</text>`;
    s+=bx(10,8,400,40,'INIT','ports/TRIS · powerupdelay · defaults · bsf portc,7 · refresh ×2',f.era==='init');
    PROG.steps.forEach((st,i)=>{ s+=bx(30,62+i*50,360,40,`${st.name}  (${st.b-st.a} cycles, ${SIM.fmtDur((st.b-st.a)*TCY)})`, st.desc, f.era==='run'&&f.step===i); s+=`<line x1="210" y1="${102+i*50}" x2="210" y2="${112+i*50}" stroke="var(--ink2)"/>`; });
    s+=`<path d="M30,342 H14 V82 H30" fill="none" stroke="var(--ink2)" marker-end="url(#d4bar2)"/><defs><marker id="d4bar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs></svg>`;
    m.querySelector('#d4b-flow').innerHTML=s+`<p class="small muted">${f.era==='run'?'Pass #'+f.n+', cycle '+Math.floor(f.cyc):'Not in MAIN'}. No interrupts (the vector at 0x004 is a bare retfie), no timer, no delay: the loop runs flat out.</p>`;
    const Lk=f.L; const n1=(x,lab,sub,on,col)=>`<rect x="${x}" y="20" width="170" height="80" rx="40" fill="${on?col:'var(--panel2)'}" stroke="var(--line)"/><text x="${x+85}" y="52" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${lab}</text><text x="${x+85}" y="70" text-anchor="middle" font-size="10" fill="var(--ink2)">${sub}</text>`;
    m.querySelector('#d4b-fsm').innerHTML=`<svg viewBox="0 0 420 150" style="width:100%">${n1(10,'LOCKED','RD7=1 RB0=0 RC6=0 reg3=0x95',Lk===1,'color-mix(in srgb,var(--led-g) 35%,transparent)')}${n1(240,'NO LOCK','RD7=0 RB0=1 RC6=1 reg3=0xD5',Lk===0,'color-mix(in srgb,var(--bad) 35%,transparent)')}
      <text x="210" y="16" text-anchor="middle" font-size="10" fill="var(--ink2)">reg16 bit4 = 1 (any time since last read)</text><line x1="180" y1="40" x2="240" y2="40" stroke="var(--ink2)" marker-end="url(#d4bar2)"/>
      <text x="210" y="128" text-anchor="middle" font-size="10" fill="var(--ink2)">a read with UNLOCK = 0 (nothing latched since the last read)</text><line x1="240" y1="82" x2="180" y2="82" stroke="var(--ink2)" marker-end="url(#d4bar2)"/>
      <text x="210" y="145" text-anchor="middle" font-size="10" fill="var(--ink2)">no hysteresis, no count: one bad read flips it (only every ${ms(PASS)})</text></svg>`;
    m.querySelector('#d4b-ports').innerHTML=`<table class="kv small"><tr><th>pin</th><th>code says</th><th>board (ISS3 net)</th></tr>
      <tr><td class="mono">RD7</td><td>“signal1 lock” / INIT “error”</td><td>green LOCK (L4)</td></tr><tr><td class="mono">RB0</td><td>“signal1 error” / INIT “confidence”</td><td>red NO LOCK (L3)</td></tr>
      <tr><td class="mono">RB2</td><td>“signal1 error” (V200.$$$; commented out later)</td><td>not connected (ISS1: L5)</td></tr><tr><td class="mono">RC6</td><td>TRISC “C6=CD LED”; loop “error open collector”</td><td>Q1 → NO_LOCK alarm</td></tr>
      <tr><td class="mono">RE0–RE2</td><td>“E2=AUD1 LED, E1=AUD2 LED, E0=ERROR LED”</td><td>not connected</td></tr><tr><td class="mono">RC4</td><td>“aes2 cs”</td><td>not connected</td></tr><tr><td class="mono">RC7</td><td>“take 8420 out of reset”</td><td>CS8427 RST</td></tr></table>`;
    let cur=-1; if (f.era==='run') PROG.ops.forEach((o,i)=>{ if (o.o<=f.cyc) cur=i; });
    let rows='', usStart=0;
    PROG.ops.forEach((o,i)=>{ if (o.kind!=='w' && o.kind!=='r') return; const v = o.kind==='r'? (o.cs==='1'? (f.L===0?'0x10':'0x00')+' (UNLOCK '+(f.L===0?1:0)+')' : 'floating') : hex(o.val==='reg13'? (f.reg13===undefined?REG.r3:f.reg13) : o.val);
      rows+=`<tr style="${i===cur?'background:color-mix(in srgb,var(--accent) 22%,transparent)':''}"><td class="mono">${(o.o*TCY*1e6).toFixed(1)}</td><td class="mono">CS${o.cs==='12'?'1+2':o.cs}</td><td class="mono">${o.kind==='r'?'R':'W'}</td><td class="mono">${v}</td><td class="small">${esc(o.label)}</td></tr>`; });
    m.querySelector('#d4b-spi').innerHTML=`<table class="kv"><tr><th>µs</th><th>CS</th><th></th><th>byte</th><th>meaning</th></tr>${rows}</table>`;
    m.querySelector('#d4b-mem').innerHTML=`<table class="kv small"><tr><th></th><th>v100 (2005)</th><th>v101 (2010)</th></tr>
      <tr><td>Source order</td><td>ORG 20H + RES block first, then ORG 0 / ORG 4H</td><td>ORG 0 / ORG 4H first, then ORG 20H + RES</td></tr>
      <tr><td>RESET 0x000</td><td class="mono">GOTO INIT</td><td class="mono">GOTO INIT</td></tr><tr><td>0x004</td><td class="mono">retfie</td><td class="mono">retfie</td></tr>
      <tr><td>INIT at</td><td class="mono">0x005</td><td class="mono">0x038</td></tr>
      <tr><td>Why</td><td colspan="2">In absolute MPASM, RES advances the <i>program</i> counter. The 24 RES lines (0x20–0x37) are used as RAM addresses by number only. In v100 the ORG 0 that follows resets the counter, so INIT lands at 0x005; in v101 code resumes after the RES block at 0x038. Same behaviour, different addresses.</td></tr>
      <tr><td>RAM (bank 0)</td><td colspan="2" class="mono">0x20 DELAY1 · 0x21 DELAY2 · 0x22 temp0 · 0x23 temp1 · 0x24 temp2 · 0x25 lock_8420 · 0x26–0x2D cs8420reg11…117 · 0x2E–0x35 cs8420reg21…217 · 0x36 CS8420_16 · 0x37 cs8420_6 <span class="muted">(DELAY1/2, temp1, CS8420_16, cs8420_6 never used)</span></td></tr>
      <tr><td>Banner</td><td colspan="2">Both say “VERSION V1.00, may 9, 2005”; the v101 folder name is the only sign of the 2010 change.</td></tr></table>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
const FINDINGS = [
  ['The firmware drives a second receiver that is not on the board', 'refresh8420_2 and the AES2 half of read8420s talk to CS2 = RC4. In d8204B-ISS3.net the net CS2 has only one node (U25-42). Half of every pass (863 + 85 cycles, ≈0.77 ms) is spent writing 19 bytes to nobody, and lock_8420 bit 1 is read from a floating CDOUT line. The code came from a two-receiver design (its names are cs8420reg1x/2x, “aud4,aud3,aud2,aud1”); the D8204A firmware of June 2005 is the same file with a CS4392 DAC added.'],
  ['Every register is rewritten every 1.645 ms', 'MAIN has no delay and no change test: 38 bytes of configuration plus a 6-byte read, about 608 times a second, with CCLK toggling almost continuously. The CS8427 datasheet asks for the control port to stay static when idle to avoid interference. The upside: a register upset by a glitch is repaired within a pass.'],
  ['The first configuration write probably misses', 'INIT sets PORTC = 0, so CS1 (RC2) is already low when RESET (RC7) is released. The CS8427 selects SPI mode on a high→low CS edge after reset (datasheet §9); there is none before INIT\'s refresh8420_1, so that write is likely taken as I²C and ignored. The CS line goes high at its end, and pass #0 of MAIN configures the part properly. (Inferred; the simulator starts the chip at pass #0.)'],
  ['Registers 10–16 get reg 9\'s value', 'After writing reg 9, refresh8420_x calls shiftout seven times without reloading temp0, so registers 0x0A–0x10 receive cs8420reg19 (0x00). Harmless only because reg 9 is zero; set cs8420reg9def to unmask an interrupt and it would also change the interrupt modes and the Int 2 mask.'],
  ['CS8420 bits written to a CS8427', 'cs8420reg3def = 10010101: on the CS8427 bits 7 and 0 of reg 3 are reserved “0” (the datasheet says reserved bits must not be written). On the CS8420 they are other controls. Everything is still named cs8420*, the netlist symbol for U3 is still CS8420, and U1/U2/U5 are still EL2280C, while the ISS2/ISS3 BOMs say CS8427 and EL5263IS.'],
  ['Only UNLOCK is watched', 'cs8420reg17def = 00010000 unmasks UNLOCK only. Bi-phase, parity, confidence and validity errors are masked: they are never reported and (per the datasheet) never trigger the HOLD behaviour. A badly damaged but locked signal shows green.'],
  ['One read decides, with no filtering', 'REFRESHSTATUS acts on a single read of the sticky UNLOCK bit. There is no counter or hysteresis; the LEDs and the TXOFF mute follow each 1.6 ms read. UNLOCK itself only changes on channel-status block boundaries (4 ms at 48 kHz), which acts as the only debounce.'],
  ['Lost input → up to about 7 ms of garbage, then silence', 'Between the PLL dropping out and TXOFF the transmitter keeps running from the free-running VCO (≈300 kHz per the datasheet). TXOFF arrives one block (≤4 ms) + up to one pass (read) + one more pass (reg 3 write) later. The simulator shows this window in amber.'],
  ['20-bit output word length', 'cs8420reg6def = 10010010 sets SORES = 01. The CS8427 datasheet says SORES sets the resolution “on SDOUT and on the AES3 output”, so the D8204B probably sends 20-bit audio (4 LSBs dropped). The D8204A sets 10000010 (24-bit). Inferred: not measured.'],
  ['The May 9 2005 backup lights the wrong LED', 'V200.$$$ (identical in both folders) sets portb,2 for “signal1 error”. On ISS1 that pin drove a second red LED (L5 via R34); ISS2 removed it. The May 18 v200.asm moves the error to portb,0 (the remaining red L3). Pick “V200.$$$” in the Firmware menu: the red LED never lights on ISS3.'],
  ['Comments describe another board', 'TRISE: “E2=AUD1 LED, E1=AUD2 LED, E0=ERROR LED” — RE0–RE2 are not connected. TRISC: “C6=CD LED” — RC6 drives the alarm transistor Q1. INIT: “bsf portd,7 ;error” — RD7 is the green LOCK LED, so the card shows LOCK for the ≈2.7 ms of INIT before the first status.'],
  ['v100 and v101 differ only in where INIT lands', 'v101 (May 26 2010) moves the RESET/interrupt vectors above the RES block. Because RES advances the program counter in absolute MPASM, INIT moves from 0x005 to 0x038; behaviour is unchanged. The banner still says V1.00, May 9 2005. The same week saw the ISS4 PCB (DRC log May 25 2010), which has no BOM, netlist or Gerbers in the archive.'],
  ['Clock mismatch in the project files', 'd8204b.pjt says Frequency = 4 MHz; the board crystal X2 is 4.9152 MHz. Only MPLAB\'s simulator timing is affected. No config word (__CONFIG) is in the source and no .hex exists, so WDT, PWRT and LVP settings are unknown. RB3/PGM goes to the ICSP header and the code enables PORTB pull-ups.'],
  ['ISS1 had a −5 V rail with no source', 'In d8204B-ISS1.net the −5V net is U1-4, C11 and D2 only — no regulator. ISS2\'s ECO adds a 79L05, then replaces it with the LM337 (REG1, R25/R27) and moves U2/U5 from single supply to ±5 V. ISS3\'s ECO changes R27 to 665R and adds C26; the 2008 PnP edit adds two fiducials.'],
  ['The README lists parts the card does not have', 'The folder README mentions a CS4390 DAC, DS26LS31 drivers, NE5532 op-amps and an analog stereo output. None of the ISS1, ISS2 or ISS3 BOMs have them (the only hits are coordinates inside Gerber files). The D8204B is a pure 1×8 AES DA; the analog outputs belong to the D8204A.'],
  ['A D820x layout underneath', 'The P-CAD file carries layers named D820575, D8205110, D820675 … D8208110 and the edge connector\'s value is “D8205PCB”: the board outline and edge pattern come from the D8205–D8208 family.'],
  ['PLL filter values are not from the CS8427 tables', 'FILT uses R23 4K7, C20 .068 µF, C17 6800 pF. None of the CS8427 datasheet\'s recommended sets (e.g. 3.0 kΩ / 0.047 µF / 2.2 nF) match, so lock time and jitter are not the published ones. The simulator uses 35 ms (inferred).'],
  ['Output level is higher than the spec (inferred)', 'TXP (0–5 V) is halved by R18/R26 and buffered at unity, then 75R into 75 Ω gives about 1.25 V p-p. The manual specifies 1 V p-p terminated (AES-3id: 1.0 V ±10 %).'],
  ['Product naming', 'The 2012 “D8204 manual” has the D8204B ISS3 schematic as its pages 5–6, but its specification page still lists the HiZ/75 Ω input of the 1998 D8204. The D8204B appears to have shipped as the D8204.'],
];
function viewFindings(m){
  window.__d8204bActive=false;
  m.innerHTML=card('What the D8204B and its firmware are “up to”', `<ol>${FINDINGS.map(f=>`<li style="margin-bottom:8px"><b>${f[0]}.</b> <span class="small">${f[1]}</span></li>`).join('')}</ol>`)
   + card('Board revisions in the archive', `<table class="kv small"><tr><th>Issue</th><th>Date</th><th>What changed</th></tr>
     <tr><td>ISS1</td><td>2005|38 Apr</td><td>CS8420, EL2280C; two red LEDs (L3 on RB0, L5 on RB2); output drivers on a single supply; −5 V net with no source. Silk + assembly PDFs in OBSOLETE.</td></tr>
     <tr><td>ISS2</td><td>2005|38 May – 2006|39 Feb</td><td>LM337 −5 V rail; CS8427, EL5263IS on the BOM; ISS2 silk PDF (below).</td></tr>
     <tr><td>ISS3</td><td>2006|39 Mar (PnP 2008|41)</td><td>R27 665R, C26 added; Gerbers; fiducials added 2008; PnP program 2015|48.</td></tr>
     <tr><td>ISS4</td><td>2010|43 May</td><td>PCB file and clean DRC log only.</td></tr></table>
     <div style="margin-top:8px">${boardSVG(0,{iss2:true})}</div><p class="small muted">ISS2 silkscreen from <span class="mono">OBSOLETE/D8204B-ISS2-SILK.pdf</span> (2005): note L5 and R34 (the second red LED), and R20/R21/R40/R46 of the older output stage.</p>`)
   + card('Inferred assumptions in this model', `<ul class="small"><li>Cable loss 14 dB per 600 m at 3.07 MHz, scaling with √f (fitted to the manual's “600 m without EQ” and 0.2 V p-p minimum).</li><li>Lock threshold = the manual's 0.2 V p-p minimum referred through U1.</li><li>Reflection penalty from the termination mismatch; HiZ = R49 3K only.</li><li>PLL lock time 35 ms; rails up 5 ms after power.</li><li>UNLOCK rises/falls on the next block boundary even with no input.</li><li>Output swing from TXP = 0–5 V; BNC numbers → P1 pins in pin order; SW1 pin pairing.</li><li>Front-edge handle outline and button position.</li></ul>`);
}

/* ---------------- register ---------------- */
SIM.register({
  id:'d8204b', name:'D8204B · AES/EBU reclocking DA, 1×8, 75 Ω (2005|38)', duration:1,
  product:'D8204B', year:2005, family:'8200 Distribution Series',
  folder:'#MF8200 #SERIES/D8204B - #Master #MF82',
  summary:'MF82 plug-in card that receives one AES/EBU feed on 75 Ω coax, reclocks it through a CS8427 transceiver and drives eight 75 Ω outputs. A PIC16F874 rewrites the CS8427 every 1.6 ms, reads its UNLOCK bit, drives the LOCK / NO LOCK LEDs and an alarm, and switches the transmitter off when the input is lost.',
  highlights:['Real ISS3 silkscreen and copper from the Gerbers','Switchable cable EQ and termination with stage-by-stage levels','Every SPI byte and CCLK pulse of the 2021-cycle main loop','Lost-input sequence: UNLOCK → LEDs → TXOFF','9-step tutorial from the 2012 manual','Findings: a phantom second receiver, CS8420 leftovers, 20-bit output'],
  depth:'Full model',
  stepUnits:[
    {label:'1 MCU loop pass', period:()=>PASS},
    {label:'1 AES block (192 frames)', period:()=>BLK()},
    {label:'1 AES frame', period:()=>1/D.fs},
    {label:'1 SPI byte (46 cycles)', period:()=>46*TCY},
    {label:'1 instruction cycle', period:()=>TCY},
    {label:'1 ms', period:()=>0.001},
  ],
  zooms:[[1,'1 s (whole second)'],[0.1,'100 ms'],[0.02,'20 ms'],[0.004,'1 AES block (4 ms)'],[0.0017,'1 loop pass (1.6 ms)'],[0.0002,'200 µs'],[0.00004,'40 µs (one SPI byte)'],[0.000005,'5 µs']],
  defaultZoom:1,
  init(){ FEkey=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: installing the card', render:viewTutorial},
    {id:'second', label:'One second', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewFindings},
  ],
});
})();
