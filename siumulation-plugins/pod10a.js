/* =====================================================================
   POD10A — 8-input AES digital audio switcher, single 8×1 or dual 4×1 (Ward-Beck Systems, RD75, 2013|46)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all in this archive, under #POD #SERIES/POD10A - #Master/ unless noted):
   - POD10A - #ENGINEERING #RD75 #ALI/POD10A - #Software/POD10A - #Software #POD10V5/pod10v5.c (779 lines, 11 Mar 2014)
       init, getInput, btnRelease, processInputSingle/Dual, configSwitcher, outputLed, uartTxButton, uartRx,
       uartOption, translateUartRx, uartTransmitStatus, configByOtherUnit, statusRequest, Interrupts, main
   - …/dist/default/production/POD10V5.production.hex, .map (disassembled here: main-loop pass = 121 Tcy,
       RB0 debounce loop at 0x2E3–0x2EF = 14 Tcy × 10 000), V030100.production.hex/.map (built from pod10.c)
   - …/build/default/production/pod10.pre (the preprocessed V030100 source, pod10.c, 20 Feb 2014)
   - …/POD10A - #Software #Remert/…/POD10 Remert.exe.deploy (VB.NET PC test app, Apr 2014; decompiled for the byte values)
   - #POD #SERIES/XXX - POD10 - #Master #OBSOLETE/POD10 - #Engineering/POD10 - #SOFTWARE/
       #V030200/POD10A/pod10.c and #V030200/POD10R/pod10.c (the production V030200 pair, Sep 2014),
       #V100/pd10v103.asm (the old 6-input POD10, PIC16F73), #V030000/pod10.X/pod10.asm
   - POD10A - #PCB/POD10-ISS3.pdf (4 sheets, 26/08/2013), POD10 MASTER BOM.xlsx, the .SchDoc sidecars
   - POD10A - #Manual/POD10A.docx + POD10A MAN.pdf (8 Oct 2013), POD10A - #TESTREPORT/*.pdf
   - POD10A - #ARTWORK #DA #2016 /POD10A-FRONT&REAR-SILK CURVE).pdf → assets/pod10a-*.png,
     Pics/POD10A Front.jpg, POD10A-75 Rear.jpg, POD10A-110 Rear.jpg (panel colour, button/jack positions)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const Y = y => SIM.year(y);
const hex2 = v => '0x'+(v&255).toString(16).padStart(2,'0').toUpperCase();
const hx = v => (v&255).toString(16).padStart(2,'0').toUpperCase();
const bin8 = v => (v&255).toString(2).padStart(8,'0');

/* ---------------- constants from the source and the schematic ---------------- */
const FOSC = 4.9152e6;                 // X1 4.9152MHZ (POD10-ISS3.pdf sheet 3, BOM S1-4M9152)
const TCY = 4/FOSC;                    // 813.8 ns
const BAUD = FOSC/(64*(7+1));          // SPBRG = 0x07, BRGH = 0 (reset value) → exactly 9600
const BIT_T = 1/BAUD, BYTE_T = 10*BIT_T;
const C = {
  PASS_V5_1: 121, PASS_V5_2: 123,      // idle main-loop pass in Tcy, counted from POD10V5.production.hex (single / dual)
  PASS_V0301: 98,                      // V030100.production.hex, counted the same way (approximate)
  PASS_V0302: 100, PASS_R: 100,        // V030200: no hex in the archive — INFERRED from the similar code
  OST: 1024/FOSC,                      // HS oscillator start-up timer (PWRTE = OFF)
  INIT: 0.10e-3,                       // XC8 start-up + init() — INFERRED
  T2_FIRST: 65536*TCY,                 // T2CON = 0xFF: 1:16 × 1:16 × 256 = 53.33 ms
  T2_TICK: (1248+20)*TCY,              // TMR2 = 0xB2, T2CON = 0x06: 78 × 16 = 1248 Tcy + ≈20 Tcy ISR latency (INFERRED)
  DEB: (140000+60)*TCY,                // RBIF loop: 10 000 × 14 Tcy (disassembly 0x2E3–0x2EF) + the rest of the ISR
  R_WAIT_TICK: 7312*TCY,               // POD10R: TMR2 = 55, T2CON = 0x0A (1:16 pre, 1:2 post): (201 + 256) × 16
  R_LOOP_TICK: 64656*TCY,              // POD10R: T2CON = 0xFF (1:16 / 1:16): (201 + 15 × 256) × 16
  PC_LAT: 0.004,                       // Windows SerialPort.DataReceived latency — INFERRED
  PRESS: 0.15,                         // a click holds a button for 150 ms — INFERRED
  HORIZON: 1,
};
const pat = n => (~(0x80>>n))&255;     // button n (0…7) → active-low XPT pattern (getInput)
const FW = {
  v5:      {name:'V5 · pod10v5.c (this folder, Mar 2014)', short:'V5'},
  v030100: {name:'V030100 · pod10.c (stand-alone, Feb 2014 hex)', short:'V030100'},
  v030200: {name:'V030200 · POD10A/pod10.c (production, in the obsolete POD10 folder)', short:'V030200'},
};
const PARTNERS = {
  none: 'Nothing on CONTROL (blank plate, as in the photos)',
  pc:   'PC running “POD10 Remert” (VB.NET test app, 2014)',
  twin: 'A second POD10A with the same firmware',
  r:    'POD10R remote (V030200 remote firmware)',
};
const INNAME = ['1 / A1','2 / A2','3 / A3','4 / A4','5 / B1','6 / B2','7 / B3','8 / B4'];

/* ---------------- scenarios ---------------- */
const SCEN = {
  idle:   {name:'Running, 1-8 mode, input 1 (no link)', fw:'v5', partner:'none', init:{A:{on:true, slide:0, sel:0x7F}}, ev:[]},
  cold:   {name:'Power-up from cold at 0 s (V5 waits for a reply)', fw:'v5', partner:'none', init:{A:{on:false, slide:0}}, ev:[{t:0.02, u:'A', type:'power', on:true}]},
  press:  {name:'Press button 3 at 200 ms, held 300 ms', fw:'v5', partner:'none', init:{A:{on:true, slide:0, sel:0x7F}}, ev:[{t:0.2, u:'A', type:'btn', n:2, dur:0.3}]},
  dual:   {name:'Slide to A-B at 100 ms, then A2 and B4', fw:'v5', partner:'none', init:{A:{on:true, slide:0, sel:0x7F}}, ev:[{t:0.1, u:'A', type:'slide', v:1},{t:0.45, u:'A', type:'btn', n:1, dur:0.12},{t:0.7, u:'A', type:'btn', n:7, dur:0.12}]},
  twin:   {name:'Two V5 units linked: press 3 on the first at 200 ms', fw:'v5', partner:'twin', init:{A:{on:true, slide:0, sel:0x7F}, B:{on:true, slide:0, sel:0x7F}}, ev:[{t:0.2, u:'A', type:'btn', n:2, dur:0.1}]},
  twinboot:{name:'Two V5 units linked, both switched on at 20 ms', fw:'v5', partner:'twin', init:{A:{on:false, slide:0}, B:{on:false, slide:0}}, ev:[{t:0.02, u:'A', type:'power', on:true},{t:0.02, u:'B', type:'power', on:true}]},
  overrun:{name:'Linked V5 units flooding, then the slide is moved (OERR)', fw:'v5', partner:'twin', init:{A:{on:true, slide:0, sel:0x7F}, B:{on:true, slide:0, sel:0x7F}}, ev:[{t:0.1, u:'A', type:'btn', n:1, dur:0.08},{t:0.4, u:'A', type:'slide', v:1}]},
  pcv5:   {name:'V5 + the PC app: Power On, then buttons 2 and 1 (it misreads V5)', fw:'v5', partner:'pc', init:{A:{on:true, slide:0, sel:0x7F}}, ev:[{t:0.1, type:'pc', a:'power'},{t:0.35, type:'pc', a:'btn', n:1},{t:0.65, type:'pc', a:'btn', n:0}]},
  remote: {name:'V030200 with a POD10R remote: remote button 6 at 400 ms', fw:'v030200', partner:'r', init:{A:{on:true, slide:0, sel:0x7F}, B:{on:false}}, ev:[{t:0.02, u:'B', type:'power', on:true},{t:0.45, u:'B', type:'btn', n:5, dur:0.12}]},
  pc0302: {name:'V030200 + the PC app: Power On lights all eight', fw:'v030200', partner:'pc', init:{A:{on:true, slide:0, sel:0x7F}}, ev:[{t:0.1, type:'pc', a:'power'},{t:0.5, type:'pc', a:'btn', n:2}]},
  v0301:  {name:'V030100 (no link): press 4 at 200 ms', fw:'v030100', partner:'none', init:{A:{on:true, slide:0, sel:0x7F}}, ev:[{t:0.2, u:'A', type:'btn', n:3, dur:0.2}]},
};

/* ---------------- device state (what the user controls) ---------------- */
const D = {
  scenario:'idle', fw:'v5', partner:'none', build:75,
  init:null, events:[],
  inputs: [0,1,2,3,4,5,6,7].map(i=>({on: i<6, fs: 48000, vpp: 2.0, f: [1000,440,997,500,1500,250,3000,800][i]})),
  press: C.PRESS,
  log: [],
};
function loadScenario(id){
  const s = SCEN[id]; D.scenario = id; D.fw = s.fw; D.partner = s.partner;
  D.init = JSON.parse(JSON.stringify(s.init));
  D.events = JSON.parse(JSON.stringify(s.ev)).map(e=>(e.scn=true, e));
  EMU_KEY = '';
}

/* =====================================================================
   THE EMULATOR — runs each PIC16F887's firmware pass by pass with its own variables,
   plus the UART between the units (9600 8N1, TXREG/TSR double buffer, 2-byte RX FIFO, OERR).
   ===================================================================== */
let EMU = null, EMU_KEY = '';
function emulate(){
  const key = JSON.stringify([D.init, D.events, D.fw, D.partner, D.inputs]);
  if (key === EMU_KEY && EMU) return EMU;
  EMU_KEY = key;
  const H = C.HORIZON;
  const ev = D.events.slice().sort((a,b)=>a.t-b.t);
  const sig = {}, notes = [], items = [], lost = [];
  const rec = (k,t,v)=>{ const a = sig[k] || (sig[k]=[]); if (a.length){ const l=a[a.length-1]; if (l[1]===v) return; if (t<=l[0]){ l[1]=v; if (a.length>1 && a[a.length-2][1]===v) a.pop(); return; } } a.push([t,v]); };
  const note = (t,u,txt,cls)=>notes.push({t, u, txt, cls:cls||''});
  const Q = [];   // pending UART deliveries {t, to, it}
  const units = {};
  const mk = (id, fw)=>({id, fw, on:false, phase:'off', next:Infinity, v:{}, txQ:[], fifo:[], oerr:false, inIsr:false, isrEnd:0, tmr:Infinity, heldN:-1, rxw:false, slideNow:0});
  units.A = mk('A', D.fw);
  if (D.partner==='twin') units.B = mk('B', D.fw);
  if (D.partner==='r') units.B = mk('B', 'r');
  const pc = D.partner==='pc' ? {id:'P', on:false, mode:'1-8', rb:[0,0,0,0,0,0,0,0], b18:0, bAB:0, buf:[], chk:Infinity, txQ:[], cmd:'', data:''} : null;
  const peer = u => u.id==='A' ? (units.B || pc) : units.A;

  /* ----- inputs as functions of time ----- */
  const presses = u => ev.filter(e=>e.type==='btn' && e.u===u);
  const pressedAt = (u,t)=>{ const r=[]; for (const e of presses(u)) if (t>=e.t && t<e.t+(e.dur||C.PRESS)) r.push(e.n); return r; };
  const firstPressed = (u,t)=>{ const p=pressedAt(u,t); return p.length? Math.min(...p) : -1; };
  const getInput = (u,t)=>{ const n=firstPressed(u,t); return n<0 ? 0xFF : pat(n); };
  const releaseAfter = (u,t)=>{ let r=t; for (let k=0;k<50;k++){ let m=-1; for (const e of presses(u)) if (r>=e.t && r<e.t+(e.dur||C.PRESS)) m=Math.max(m, e.t+(e.dur||C.PRESS)); if (m<0) return r; r=m; } return r; };
  const slideAt = (u,t)=>{ let v = (D.init[u]&&D.init[u].slide)||0; for (const e of ev) if (e.type==='slide' && e.u===u && e.t<=t) v=e.v; return v; };

  /* ----- port writes (recorded) ----- */
  function setD(u,t,val){ u.v.PORTD = val&255; rec(u.id+'.PORTD', t, u.v.PORTD); if (u.id==='A') route(t); }
  function setRB1(u,t,val){ u.v.RB1 = val?1:0; rec(u.id+'.RB1', t, u.v.RB1); if (u.id==='A') route(t); }
  function route(t){ const u=units.A; rec('A.rt', t, u.on ? (u.v.PORTD|0)*2 + (u.v.RB1|0) : -1); }
  const RV = ['preOutput','inputReg','switchConfig','ack','byte1','byte2','count','dataReceived','outputChanged','reps'];
  function recVars(u,t){ RV.forEach(k=>{ if (u.v[k]!==undefined) rec(u.id+'.'+k, t, u.v[k]); }); }
  function phase(u,t,p){ u.phase = p; rec(u.id+'.phase', t, p); }

  /* ----- UART ----- */
  function sched(it){ const to = it.from==='A' ? (units.B || pc) : units.A; if (to) Q.push({t:it.end, to, it}); }
  function tx(u,b,t,why){        // write TXREG
    const q=u.txQ, last=q[q.length-1];
    if (!last || last.end <= t){ const it={from:u.id,b,start:t+TCY,end:t+TCY+BYTE_T,why}; q.push(it); items.push(it); sched(it); }
    else if (last.start <= t){ const it={from:u.id,b,start:last.end,end:last.end+BYTE_T,why}; q.push(it); items.push(it); sched(it); }
    else { lost.push({t, from:u.id, b:last.b, by:b}); note(t,u.id,`TXREG overwritten: ${hex2(last.b)} (${last.why}) is lost under ${hex2(b)} — the firmware never checks TXIF`,'warn'); last.b=b; last.why=why; last.over=(last.over||0)+1; }
  }
  function pcTx(t, bytes, why){ for (const b of bytes){ const last=pc.txQ[pc.txQ.length-1]; const s=Math.max(t, last?last.end:0); const it={from:'P', b, start:s, end:s+BYTE_T, why}; pc.txQ.push(it); items.push(it); Q.push({t:it.end, to:units.A, it}); } }
  function deliver(to, b, t, it){
    if (to===pc) return pcRx(b,t);
    if (!to.on){ return; }
    FWI[to.fw].rx(to, b, t, it);
  }

  /* ----- shared PIC routines (named as in the source) ----- */
  function processInputDual(input, output){ if (input===0xFF) return output; let temp = (input > 0xF0) ? (output|0x0F) : (output|0xF0); return temp & input; }
  function processInputSingle(input, output){ return input===0xFF ? output : input; }
  function configSwitcher(u){ const v=u.v;
    if (v.switchConfig){ if ((v.preOutput&0xF0)===0xF0) v.preOutput &= ~0x80&255; if ((v.preOutput&0x0F)===0x0F) v.preOutput &= ~0x08&255; }
    else { if (v.preOutput > 0xF0) v.preOutput |= 0xF0; else v.preOutput |= 0x0F; } }
  function outputLed(u,t,out){ if (u.v.switchConfig) setRB1(u,t,1); setD(u,t,out); if (!u.v.switchConfig) setRB1(u,t,0); }

  /* ================= V5 (pod10v5.c) ================= */
  const V5 = {
    pass(u){ return (u.v.switchConfig? C.PASS_V5_2 : C.PASS_V5_1)*TCY; },
    reset(u,t){ u.v = {preOutput:0x7F, inputReg:0xFF, switchConfig:0, ack:0, byte1:0, byte2:0, mode:1, pSwitch:0, initFlag:0, count:0, rxCount:0, PORTD:0xFF, RB1:0};
      u.fifo=[]; u.oerr=false; u.inIsr=false; rec(u.id+'.oerr',t,0); },
    boot(u,t){ V5.reset(u,t); phase(u,t,'boot'); setD(u,t,0xFF); u.next = t + C.OST + C.INIT;
      note(t,u.id,'Power on: the PIC16F887 waits 1024 oscillator cycles (OST, PWRTE = OFF) for the 4.9152 MHz crystal, then XC8 start-up clears RAM and calls main()','boot'); },
    steady(u,t,init){ V5.reset(u,t); const v=u.v; v.switchConfig = init.slide?1:0; v.preOutput = init.sel!==undefined ? init.sel : 0x7F; v.initFlag=1; v.mode=2; v.pSwitch=v.switchConfig; v.byte1=0xF0;
      configSwitcher(u); outputLed(u,t,v.preOutput); phase(u,t,'loop'); recVars(u,t); u.next = t + V5.pass(u); },
    init(u,t){ const v=u.v;
      setRB1(u,t,1); setD(u,t,0xFF);
      note(t,u.id,'init(): PORTB = 0x02 (SWITCH_SEL high), PORTD = 0xFF (every XPT high: no receiver enabled, all button LEDs dark), SPBRG = 0x07 → 9600 Bd, CREN, GIE/PEIE/RCIE, RBIE + IOCB0 (slide), TMR2IE','boot');
      tx(u,0xF0,t,'statusRequest()'); tx(u,0x00,t+2*TCY,'statusRequest()');
      note(t,u.id,'statusRequest(): TXREG = 0xF0, TXREG = 0x00 — asks a linked unit for its state; TMR2 = 0, T2CON = 0xFF (1:16 × 1:16)','tx');
      phase(u,t,'wait'); u.tmr = t + C.T2_FIRST; u.next = u.tmr; recVars(u,t); },
    finishWait(u,t,acked){ const v=u.v;
      if (acked){ v.byte2 = v.byte2; note(t,u.id,`ack set by uartRx → T2CON = 0; configByOtherUnit(${hex2(v.byte2)})`,'rx'); V5.configByOtherUnit(u,t,v.byte2); }
      else { v.switchConfig = slideAt(u.id,t); note(t,u.id,`count == 500 (≈${(t*1000).toFixed(0)} ms after power): no reply → switchConfig = RB0 = ${v.switchConfig} (${v.switchConfig?'A-B':'1-8'} on the slide)`,'boot'); }
      v.initFlag = 1; v.mode = 2; v.pSwitch = v.switchConfig;
      v.preOutput = v.switchConfig ? processInputDual(v.inputReg, v.preOutput) : processInputSingle(v.inputReg, v.preOutput);
      configSwitcher(u); outputLed(u,t,v.preOutput); v.ack = 0; v.byte1 = 0xF0;
      note(t,u.id,`initFlag = 1; configSwitcher(); outputLed(${hex2(v.preOutput)}) → ${selTxt(v.preOutput, v.switchConfig)} lit and routed; byte1 = 0xF0; main loop starts`,'boot');
      phase(u,t,'loop'); recVars(u,t); u.next = t + V5.pass(u); },
    configByOtherUnit(u,t,status){ const v=u.v; v.mode = 2;
      if (status > 0x0F){ v.switchConfig = 1;
        const k = status-0x40; if (k<0 || k>15){ note(t,u.id,`configByOtherUnit(${hex2(status)}): switchConfig = 1, then “default: return” — dual mode is forced but nothing else changes`,'warn'); return; }
        const a = pat(k&3), b = pat(4+(k>>2));
        configSwitcher(u); v.preOutput = processInputDual(a, v.preOutput); outputLed(u,t,v.preOutput);
        configSwitcher(u); v.preOutput = processInputDual(b, v.preOutput); outputLed(u,t,v.preOutput);
        note(t,u.id,`configByOtherUnit(${hex2(status)}): A-B mode, A${(k&3)+1} + B${(k>>2)+1} copied from the other unit`,'rx');
      } else { v.switchConfig = 0;
        const m = {1:0x7F,2:0xBF,3:0xDF,4:0xEF,5:0xF7,6:0xFB,7:0xFD,0:0xFE}[status]; if (m!==undefined) v.preOutput = m;
        configSwitcher(u); v.preOutput = processInputSingle(v.inputReg, v.preOutput); outputLed(u,t,v.preOutput);
        note(t,u.id,`configByOtherUnit(${hex2(status)}): 1-8 mode, input ${status===0?8:status} copied from the other unit`,'rx'); } },
    uartRx(u,t,b){ const v=u.v;
      if (v.initFlag){ if (b===0xF0) v.byte1=b; else { v.byte2=b; v.ack=1; } }
      else { if (b===0x80) v.byte1=b; else { v.byte2=b; v.ack=1; } }
      rec(u.id+'.byte1',t,v.byte1); rec(u.id+'.byte2',t,v.byte2); rec(u.id+'.ack',t,v.ack); },
    rx(u,b,t){ const v=u.v;
      if (u.phase==='boot'){ note(t,u.id,`${hex2(b)} arrives before init() has enabled the UART — ignored`,'rx'); return; }
      if (u.oerr){ note(t,u.id,`${hex2(b)} dropped: OERR is set and the firmware never clears CREN — the receiver is dead until power-off`,'warn'); return; }
      if (u.inIsr){ if (u.fifo.length>=2){ u.oerr=true; rec(u.id+'.oerr',t,1); note(t,u.id,`OVERRUN: a third byte (${hex2(b)}) finished while the RB0 interrupt still spins in its debounce loop with GIE off. RCREG holds 2 bytes; OERR = 1 and reception stops for good (no code ever clears CREN).`,'warn'); return; }
        u.fifo.push(b); note(t,u.id,`${hex2(b)} waits in the 2-byte RCREG FIFO (the CPU is inside the RB0 debounce loop, interrupts off)`,'rx'); return; }
      V5.uartRx(u,t,b);
      note(t,u.id,`Interrupts() → RCIF → uartRx(): RCREG = ${hex2(b)} → ${v.initFlag?(b===0xF0?'byte1 = 0xF0':'byte2 = '+hex2(b)+', ack = 1'):(b===0x80?'byte1 = 0x80':'byte2 = '+hex2(b)+', ack = 1')}${u.phase==='held'&&v.ack===1?' (main is stuck in btnRelease())':''}`,'rx');
      if (u.phase==='wait' && v.ack) V5.finishWait(u,t+3e-6,true); },
    slide(u,t){ if (!u.on || u.phase==='boot' || u.inIsr) return;
      u.inIsr = true; u.isrEnd = t + C.DEB; u.resume = u.next; u.next = u.isrEnd; rec(u.id+'.isr',t,1);
      note(t,u.id,`Slide moved → RB0 interrupt-on-change → Interrupts(): RBIF → the debounce loop “time++ until 10000” runs with interrupts off: 10 000 × 14 Tcy = ${(C.DEB*1000).toFixed(1)} ms`,'isr'); },
    isrExit(u,t){ const v=u.v; u.inIsr=false; rec(u.id+'.isr',t,0);
      v.switchConfig = slideAt(u.id,t); if (v.pSwitch !== v.switchConfig) v.pSwitch = v.switchConfig;
      configSwitcher(u);
      v.preOutput = v.switchConfig ? processInputDual(v.inputReg, v.preOutput) : processInputSingle(v.inputReg, v.preOutput);
      outputLed(u,t,v.preOutput);
      const shown = v.preOutput;
      if (v.preOutput > 0xF0) v.preOutput |= 0xF0; else if (v.preOutput < 0xF0) v.preOutput |= 0x0F;
      const lostAck = v.ack===1; v.ack = 0; v.inputReg = v.preOutput;
      note(t,u.id,`…loop ends: switchConfig = RB0 = ${v.switchConfig}; configSwitcher(); outputLed(${hex2(shown)}) → ${selTxt(shown, v.switchConfig)}; preOutput trimmed to ${hex2(v.preOutput)}; ack = 0${lostAck?' (a pending UART command is thrown away)':''}; uartTxButton(${hex2(v.preOutput)})`,'isr');
      V5.uartTxButton(u,t,v.preOutput);
      recVars(u,t);
      const f = u.fifo.splice(0); f.forEach((b,i)=>{ V5.uartRx(u,t+(i+1)*30e-6,b); note(t+(i+1)*30e-6,u.id,`RETFIE → RCIF still set → uartRx(): ${hex2(b)} from the FIFO`,'rx'); });
      if (u.phase==='wait'){ if (v.ack) return V5.finishWait(u,t+1e-4,true); u.tmr = Math.max(u.tmr, t+20e-6); u.next = u.tmr; return; }
      if (u.phase==='held'){ u.next = Math.max(t, releaseAfter(u.id,t)); return; }
      u.next = t + V5.pass(u); },
    uartTxButton(u,t,button){ if (button===0xFF) return;
      const m = {0x7F:0x81,0xBF:0x82,0xDF:0x83,0xEF:0x84,0xF7:0x85,0xFB:0x86,0xFD:0x87,0xFE:0x80}[button];
      const temp = m===undefined ? (u.v.garbage||0x00) : m;
      tx(u,0xF0,t,'uartTxButton()'); tx(u, u.v.switchConfig ? (temp|0x40) : temp, t+2*TCY, 'uartTxButton()');
      note(t,u.id,`uartTxButton(${hex2(button)}): TXREG = 0xF0, TXREG = ${hex2(u.v.switchConfig?(temp|0x40):temp)}${m===undefined?' (temp uninitialised: no case matched)':''}`,'tx'); },
    uartTransmitStatus(u,t){ const v=u.v, P=v.PORTD; let temp;
      if (v.switchConfig){ const a=[0x7F,0xBF,0xDF,0xEF].indexOf(P|0x0F), b=[0xF7,0xFB,0xFD,0xFE].indexOf(P|0xF0); if (a>=0 && b>=0) temp = 0x40 + a + 4*b; }
      else { const m={0x7F:1,0xBF:2,0xDF:3,0xEF:4,0xF7:5,0xFB:6,0xFD:7,0xFE:0}[P]; temp = m; }
      const bad = temp===undefined; if (bad) temp = v.garbage||0;
      tx(u,0x80,t,'uartTransmitStatus()'); tx(u,temp,t+2*TCY,'uartTransmitStatus()');
      note(t,u.id,`uartTransmitStatus(): switch (PORTD = ${hex2(P)}) → TXREG = 0x80, TXREG = ${hex2(temp)}${bad?' — no case matched, temp is uninitialised':''}`,'tx'); },
    loopPass(u,t){ const v=u.v;
      if (v.ack===1){
        if (v.byte1===0xF0){
          const temp = v.byte2 & 0xC0; let what='';
          if (temp===0xC0){ v.switchConfig=1; V5.translate(u); what=`(byte2 & 0xC0) = 0xC0 → switchConfig = 1 (A-B), translateUartRx(): inputReg = ${hex2(v.inputReg)}`; }
          else if (temp===0x80){ v.switchConfig=0; V5.translate(u); what=`(byte2 & 0xC0) = 0x80 → switchConfig = 0 (1-8), translateUartRx(): byte2 & 7 = ${v.byte2&7} → inputReg = ${hex2(v.inputReg)} (input ${(v.byte2&7)||8})`; }
          else what = `(byte2 & 0xC0) = ${hex2(temp)} → nothing to do (status request)`;
          v.preOutput = v.switchConfig ? processInputDual(v.inputReg, v.preOutput) : processInputSingle(v.inputReg, v.preOutput);
          configSwitcher(u); outputLed(u,t,v.preOutput);
          note(t,u.id,`main: ack == 1, byte1 == 0xF0 → RCEN = 0 (that is SSPCON2.RCEN, not the UART); uartOption(): ${what}; outputLed(${hex2(v.preOutput)}) → ${selTxt(v.preOutput,v.switchConfig)}`,'rx');
          V5.uartTransmitStatus(u,t+20e-6);
        } else { v.byte2 = 0; note(t,u.id,'main: ack == 1 but byte1 != 0xF0 → byte2 = 0, ignored','rx'); }
        v.ack = 0; recVars(u,t); u.next = t + 170*TCY; return;
      }
      configSwitcher(u); outputLed(u,t,v.preOutput);
      const n = firstPressed(u.id,t);
      if (n>=0){ u.heldN = n; phase(u,t,'held'); u.next = Math.max(t+TCY, releaseAfter(u.id,t)); rec(u.id+'.held',t,n);
        note(t,u.id,`getInput(): ${n<5?'RA'+n:'RE'+(n-5)} low (PB${n+1}) → btnRelease() spins until all eight buttons are up. Nothing changes yet.`,'in'); return; }
      v.inputReg = 0xFF; u.next = t + V5.pass(u); },
    translate(u){ const v=u.v; v.inputReg = {1:0x7F,2:0xBF,3:0xDF,4:0xEF,5:0xF7,6:0xFB,7:0xFD,0:0xFE}[v.byte2&7]; },
    held(u,t){ const v=u.v;
      if (pressedAt(u.id,t).length){ u.next = releaseAfter(u.id,t); return; }
      const n=u.heldN; rec(u.id+'.held',t,-1);
      if (v.ack===1) note(t,u.id,'A UART command arrived while the button was held: getInput() now overwrites ack = 1 with ack = 2, so that command is lost','warn');
      v.ack = 2; v.inputReg = pat(n);
      v.preOutput = v.switchConfig ? processInputDual(v.inputReg, v.preOutput) : processInputSingle(v.inputReg, v.preOutput);
      v.preOutput = v.switchConfig ? processInputDual(v.inputReg, v.preOutput) : processInputSingle(v.inputReg, v.preOutput);
      configSwitcher(u); outputLed(u,t,v.preOutput); v.ack = 0;
      note(t,u.id,`Released: getInput() returns ${hex2(pat(n))}, ack = 2 → processInput${v.switchConfig?'Dual':'Single'}() → configSwitcher() → outputLed(${hex2(v.preOutput)}): ${selTxt(v.preOutput,v.switchConfig)} — the switch happens on release`,'in');
      V5.uartTxButton(u,t+30e-6,v.inputReg);
      phase(u,t,'loop'); recVars(u,t); u.next = t + V5.pass(u) + 60*TCY; },
    step(u,t){
      if (u.inIsr){ if (t>=u.isrEnd-1e-12) return V5.isrExit(u,t); u.next=u.isrEnd; return; }
      if (u.phase==='boot') return V5.init(u,t);
      if (u.phase==='wait'){ const v=u.v; v.count++; rec(u.id+'.count',t,v.count);
        if (v.count===500) return V5.finishWait(u,t,false);
        u.tmr = t + C.T2_TICK; u.next = u.tmr; return; }
      if (u.phase==='held') return V5.held(u,t);
      if (u.phase==='loop') return V5.loopPass(u,t);
    },
  };

  /* ================= V030100 (pod10.c, stand-alone) ================= */
  const V0301 = {
    boot(u,t){ u.v={preOutput:0x7F, inputReg:0xFF, switchConfig:0, PORTD:0xFF, RB1:0}; phase(u,t,'boot'); setD(u,t,0xFF); u.next=t+C.OST+C.INIT;
      note(t,u.id,'Power on (V030100: WDT on, no UART code)','boot'); },
    steady(u,t,init){ u.v={preOutput:init.sel!==undefined?init.sel:0x7F, inputReg:0xFF, switchConfig:init.slide?1:0, PORTD:0xFF, RB1:0}; configSwitcher(u); outputLed(u,t,u.v.preOutput); phase(u,t,'loop'); recVars(u,t); u.next=t+C.PASS_V0301*TCY; },
    step(u,t){ const v=u.v;
      if (u.phase==='boot'){ setRB1(u,t,1); setD(u,t,0xFF); note(t,u.id,'init(): ports only (PORTB = 0x02, PORTD = 0xFF). The USART is never enabled in this version.','boot'); phase(u,t,'loop'); u.next=t+C.PASS_V0301*TCY; return; }
      const sc = slideAt(u.id,t); if (sc!==v.switchConfig) note(t,u.id,`configSwitcher(): switchConfig = PORTB & 0x01 = ${sc} — read every pass, no interrupt`,'in');
      v.switchConfig = sc; configSwitcher(u); outputLed(u,t,v.preOutput);
      const gi = getInput(u.id,t); v.inputReg = gi;
      const np = v.switchConfig ? processInputDual(gi, v.preOutput) : processInputSingle(gi, v.preOutput);
      if (np!==v.preOutput) note(t,u.id,`getInput() = ${hex2(gi)} → processInput${v.switchConfig?'Dual':'Single'}() = ${hex2(np)}; outputLed() on the next pass — switches on press, no debounce`,'in');
      v.preOutput = np; recVars(u,t); u.next = t + C.PASS_V0301*TCY; },
    rx(u,b,t){ note(t,u.id,`${hex2(b)} on CPU_RX: ignored (V030100 never sets CREN/SPEN)`,'rx'); },
    slide(){},
  };

  /* ================= V030200 master (POD10A/pod10.c) ================= */
  const V0302 = {
    boot(u,t){ u.v={preOutput:0x7F, outputChanged:0, inputReg:0xFF, switchConfig:0, dataReceived:0, PORTD:0xFF, RB1:0}; u.fifo=[]; u.oerr=false; rec(u.id+'.oerr',t,0); phase(u,t,'boot'); setD(u,t,0xFF); u.next=t+C.OST+C.INIT;
      note(t,u.id,'Power on (V030200 master)','boot'); },
    steady(u,t,init){ V0302.boot(u,t); const v=u.v; v.switchConfig=init.slide?1:0; v.preOutput=init.sel!==undefined?init.sel:0x7F; V0302.getSwitch(u,t,true); setD(u,t,v.preOutput); v.outputChanged=0; phase(u,t,'loop'); recVars(u,t); u.next=t+C.PASS_V0302*TCY; },
    getSwitch(u,t,quiet){ const v=u.v; if (!v.dataReceived) v.switchConfig = slideAt(u.id,t);
      configSwitcher(u); if ((v.RB1|0)!==v.switchConfig){ v.outputChanged=1; if (!quiet) note(t,u.id,`getSwitch(): RB1 (${v.RB1}) != switchConfig (${v.switchConfig}) → outputChanged = 1; RB1 = ${v.switchConfig}`,'in'); }
      setRB1(u,t,v.switchConfig); },
    processInput(u,input,previous){ const v=u.v; if (input===0xFF) return previous;
      v.outputReg = v.switchConfig ? (input>0xF0 ? ((previous|0x0F)&input) : ((previous|0xF0)&input)) : input; v.outputChanged=1; return v.outputReg; },
    transmit(u,t,cmd,data,why){ tx(u,cmd,t,why); tx(u,data,t+2*TCY,why); },
    complete(u,t,data){ const v=u.v; u.rxw=false; rec(u.id+'.rxw',t,0);
      if (data===0xFF){ V0302.transmit(u,t,0xF0,v.preOutput,'receive(): status'); note(t,u.id,`receive(): F0 FF = status request → transmit(CMD, preOutput = ${hex2(v.preOutput)})`,'rx'); }
      else { v.switchConfig = (((data&0xF0)===0xF0)||((data&0x0F)===0x0F)) ? 0 : 1; setRB1(u,t,v.switchConfig); v.preOutput=data; v.dataReceived=1;
        note(t,u.id,`receive(): F0 ${hx(data)} → switchConfig = ${v.switchConfig} (${v.switchConfig?'neither nibble is all ones → A-B':'one nibble is all ones → 1-8'}), preOutput = ${hex2(data)}, dataReceived = 1${data===0?' — 0x00 enables all eight receivers at once':''}`,'rx'); }
      v.preOutput = V0302.processInput(u, v.inputReg, v.preOutput); setD(u,t,v.preOutput); v.outputChanged=0;
      V0302.transmit(u,t+20e-6,0xF0,v.preOutput,'main: echo');
      note(t,u.id,`main: PORTD = ${hex2(v.preOutput)} (${selTxt(v.preOutput,v.switchConfig)}); transmit(CMD, preOutput) — every received message is answered`,'tx');
      phase(u,t,'loop'); recVars(u,t); u.next = t + C.PASS_V0302*TCY + 40e-6; },
    receive(u,t){ const cmd = u.fifo.shift();
      if (cmd!==0xF0){ note(t,u.id,`receive(): cmd = ${hex2(cmd)} is not 0xF0 → skipped`,'rx'); const v=u.v; v.preOutput=V0302.processInput(u,v.inputReg,v.preOutput); setD(u,t,v.preOutput); v.outputChanged=0; V0302.transmit(u,t,0xF0,v.preOutput,'main: echo'); u.next=t+C.PASS_V0302*TCY; return; }
      if (u.fifo.length) return V0302.complete(u,t,u.fifo.shift());
      u.rxw = true; rec(u.id+'.rxw',t,1); phase(u,t,'rxwait'); u.next = Infinity;
      note(t,u.id,'receive(): got 0xF0, now “while(cmd == 1)” waits for the second byte — with no timeout','rx'); },
    step(u,t){ const v=u.v;
      if (u.phase==='boot'){ setRB1(u,t,1); setD(u,t,0xFF); v.switchConfig = slideAt(u.id,t); setRB1(u,t,v.switchConfig);
        note(t,u.id,`init(): ports, SPBRG = 0x07, TXEN/SPEN/CREN, INTE + GIE (RB0/INT, rising edge). main: switchConfig = RB0 = ${v.switchConfig}; RB1 = switchConfig. No status request at power-up.`,'boot'); phase(u,t,'loop'); u.next=t+C.PASS_V0302*TCY; return; }
      if (u.phase!=='loop') return;
      const gi = getInput(u.id,t);
      if (gi!==0xFF && u.fifo.length){ const d=u.fifo.shift(); note(t,u.id,`dummy = RCREG (${hex2(d)}): a byte that arrives while a button is held is thrown away`,'warn'); u.next=t+C.PASS_V0302*TCY; return; }
      if (gi===0xFF && u.fifo.length) return V0302.receive(u,t);
      V0302.getSwitch(u,t); v.inputReg = gi;
      const np = V0302.processInput(u, gi, v.preOutput);
      if (np!==v.preOutput) note(t,u.id,`getInput() = ${hex2(gi)} → processInput() = ${hex2(np)}; PORTD = ${hex2(np)} — switches on press`,'in');
      v.preOutput = np; setD(u,t,v.preOutput);
      if (v.outputChanged && gi===0xFF){ v.outputChanged=0; V0302.transmit(u,t,0xF0,v.preOutput,'main: tell remote'); V0302.transmit(u,t+30*TCY,0xF0,v.preOutput,'main: tell remote (2nd)');
        note(t,u.id,`Released / mode changed: transmit(CMD, ${hex2(v.preOutput)}) twice — the second pair lands in a full TXREG`,'tx'); }
      recVars(u,t); u.next = t + C.PASS_V0302*TCY; },
    rx(u,b,t){ if (u.phase==='boot') return; if (u.oerr){ note(t,u.id,`${hex2(b)} dropped (OERR set, never cleared)`,'warn'); return; }
      if (u.rxw) return V0302.complete(u,t,b);
      if (u.fifo.length>=2){ u.oerr=true; rec(u.id+'.oerr',t,1); note(t,u.id,`OVERRUN on ${hex2(b)}: OERR = 1 and the firmware never clears CREN`,'warn'); return; }
      u.fifo.push(b); },
    slide(u,t,val,old){ if (!u.on || u.phase==='boot') return;
      if (val===1 && old===0){ u.v.dataReceived=0; u.v.outputChanged=1; rec(u.id+'.dataReceived',t,0); note(t,u.id,'RB0 rising edge → INT → excuseMe(): dataReceived = 0, outputChanged = 1','isr'); }
      else if (u.v.dataReceived) note(t,u.id,'Slide moved down: INTEDG = 1 means no interrupt on a falling edge, and getSwitch() ignores RB0 while dataReceived = 1 — the slide does nothing','warn'); },
  };

  /* ================= POD10R remote (POD10R/pod10.c) ================= */
  const R = {
    boot(u,t){ u.v={preOutput:0x7F, outputChanged:0, inputReg:0xFF, switchConfig:0, dataReceived:0, connected:0, reps:0, PORTD:0xFF, RB1:0}; u.fifo=[]; u.oerr=false; phase(u,t,'boot'); setD(u,t,0xFF); u.next=t+C.OST+C.INIT;
      note(t,u.id,'POD10R power on','boot'); },
    steady(u,t){ R.boot(u,t); u.next=t; },
    waitForData(u,t){ const v=u.v; v.reps=0; phase(u,t,'rwait'); V0302.transmit(u,t,0xF0,0xFF,'waitForData()'); u.tmr = t + C.R_WAIT_TICK; u.next = u.tmr;
      note(t,u.id,'waitForData(): TMR2ON, transmit(CMD, 0xFF) — status request; LEDs chase until the master answers','tx'); },
    connect(u,t){ const v=u.v; v.connected=1; v.reps=0; u.tmr = t + C.R_LOOP_TICK; phase(u,t,'loop'); u.next=t+C.PASS_R*TCY; note(t,u.id,'dataReceived → connected = 1, T2CON = 0xFF (1:16 / 1:16), TMR2 = 55: main loop','rx'); },
    recv(u,t,data){ const v=u.v; v.switchConfig = (((data&0xF0)===0xF0)||((data&0x0F)===0x0F)) ? 0 : 1; setRB1(u,t,v.switchConfig); v.preOutput=data; v.dataReceived=1; u.rxw=false; },
    step(u,t){ const v=u.v;
      if (u.phase==='boot'){ setRB1(u,t,1); note(t,u.id,'init(): TMR2 = 55, T2CON = 0x0A (comment says 1:16 postscale; the value is 1:2), PR2 = 0xFF','boot'); return R.waitForData(u,t); }
      if (u.phase==='rwait'){ v.reps++; const ch={10:0xFF,20:0x7F,30:0x3F,40:0x1F,50:0x8F,60:0xC7,70:0xE3,80:0xF1,90:0xF8,100:0xFC,110:0xFE,120:0xFF}[v.reps];
        if (ch!==undefined) setD(u,t,ch); if (v.reps===120){ V0302.transmit(u,t,0xF0,0xFF,'waitForData(): retry'); v.reps=0; note(t,u.id,'reps == 120: no answer, transmit(CMD, 0xFF) again','tx'); }
        rec(u.id+'.reps',t,v.reps); u.tmr = t + C.R_WAIT_TICK; u.next = u.tmr; return; }
      if (u.phase==='rxwait') return;
      if (t >= u.tmr){ v.reps++; rec(u.id+'.reps',t,v.reps); u.tmr += C.R_LOOP_TICK;
        if (v.reps===2){ V0302.transmit(u,t,0xF0,0xFF,'main: poll'); note(t,u.id,'TMR2IF, reps == 2 → transmit(CMD, 0xFF): poll the master','tx'); }
        if (v.reps===120){ v.dataReceived=0; v.connected=0; note(t,u.id,'reps == 120 (≈6.3 s of silence) → waitForData()','warn'); return R.waitForData(u,t); } }
      if (u.fifo.length){ const cmd=u.fifo.shift(); if (cmd===0xF0){ if (u.fifo.length) R.recv(u,t,u.fifo.shift()); else { u.rxw=true; phase(u,t,'rxwait'); u.next=Infinity; return; } }
        v.preOutput = V0302.processInput(u, v.inputReg, v.preOutput); setD(u,t,v.preOutput); v.outputChanged=0; v.reps=0; rec(u.id+'.reps',t,0);
        u.next=t+C.PASS_R*TCY; recVars(u,t); return; }
      configSwitcher(u); setRB1(u,t,v.switchConfig);
      const gi=getInput(u.id,t); v.inputReg=gi; const np=V0302.processInput(u,gi,v.preOutput); v.preOutput=np; setD(u,t,np);
      if (v.outputChanged && gi===0xFF){ v.outputChanged=0; V0302.transmit(u,t,0xF0,v.preOutput,'remote: button'); note(t,u.id,`Remote button released → transmit(CMD, ${hex2(v.preOutput)}) to the master`,'tx'); }
      recVars(u,t); u.next=t+C.PASS_R*TCY; },
    rx(u,b,t){ if (u.phase==='boot') return;
      if (u.rxw){ R.recv(u,t,b); if (u.phase==='rwait'){ R.connect(u,t); return; } phase(u,t,'loop'); u.next=t+C.PASS_R*TCY; const v=u.v; v.preOutput=V0302.processInput(u,v.inputReg,v.preOutput); setD(u,t,v.preOutput); v.reps=0; return; }
      if (u.phase==='rwait'){ if (b===0xF0){ u.rxw=true; } return; }
      if (u.fifo.length>=2){ u.oerr=true; return; } u.fifo.push(b); },
    slide(){},
  };
  const FWI = {v5:V5, v030100:V0301, v030200:V0302, r:R};

  /* ================= PC: POD10 Remert ================= */
  function pcAct(e,t){
    if (e.a==='power'){
      if (!pc.on){ pc.on=true; rec('P.on',t,1); pcTx(t,[0xF0,0x00],'btnPower_Click'); note(t,'P','btnPower_Click: comPort.Open() 9600 8N1, then comPort.Write({240,0,0}, 0, Count − 1) → F0 00; buttons enabled','tx'); }
      else { pc.on=false; rec('P.on',t,0); note(t,'P','btnPower_Click: comPort.Close()','tx'); }
      return; }
    if (!pc.on){ note(t,'P','Button is disabled until “Power: On”','in'); return; }
    if (e.a==='mode'){
      let b=0; const rb=pc.rb;
      if (pc.mode==='1-8'){ pc.mode='A-B'; const tb=[0x77,0xB7,0xD7,0xE7,0x77,0x7B,0x7D,0x7E]; const k=rb.findIndex(x=>x); b = k>=0? tb[k] : (pc.lastAB18||0); pc.lastAB18=b; }
      else { pc.mode='1-8'; let k=-1; for (let i=7;i>=0;i--) if (rb[i]){ k=i; break; } b = k>=0? pat(k) : (pc.lastBA||0); pc.lastBA=b; }
      rec('P.mode',t,pc.mode); pcTx(t,[0xF0,b],'btnMode_Click'); note(t,'P',`btnMode_Click → “Mode: ${pc.mode}”, Write F0 ${hx(b)}`,'tx'); return; }
    if (e.a==='btn'){ const n=e.n; let b=0;
      if (pc.mode==='1-8') b = pat(n);
      else if (n<4){ const k=[4,5,6,7].find(i=>pc.rb[i]); b = k!==undefined ? (pat(n)&pat(k)) : 0; }
      else { const k=[0,1,2,3].find(i=>pc.rb[i]); b = k!==undefined ? (pat(n)&pat(k)) : 0; }
      pcTx(t,[0xF0,b],`btn${n+1}_Click`); note(t,'P',`btn${n+1}_Click (“${pc.mode==='1-8'?n+1:(n<4?'A'+(n+1):'B'+(n-3))}”): Write F0 ${hx(b)}${b===0?' — no radio button of the other section is checked, so array[1] stays 0':''}`,'tx'); }
  }
  function pcRx(b,t){ if (!pc.on) return; pc.buf.push(b); if (pc.chk===Infinity) pc.chk = t + C.PC_LAT; }
  function pcCheck(t){ pc.chk = Infinity;
    if (pc.buf.length===2){ const d=pc.buf[1]; pc.cmd=pc.buf[0].toString(16).toUpperCase(); pc.data=d.toString(16).toUpperCase();
      const single = ((d&0xF0)===0xF0) || ((d&0x0F)===0x0F); pc.mode = single?'1-8':'A-B';
      const cases = {}; for (let i=0;i<8;i++) cases[pat(i)] = [i]; for (let a=0;a<4;a++) for (let bb=4;bb<8;bb++) cases[pat(a)&pat(bb)] = [a,bb];
      if (cases[d]) pc.rb = [0,1,2,3,4,5,6,7].map(i=>cases[d].includes(i)?1:0);
      rec('P.data',t,pc.cmd+' '+pc.data); rec('P.mode',t,pc.mode); rec('P.rb',t,pc.rb.join(''));
      note(t,'P',`comPort_DataReceived: BytesToRead == 2 → UpdateDisplay(): CMD “${pc.cmd}” DATA “${pc.data}” → ${pc.mode} mode${cases[d]?', radio '+cases[d].map(i=>i+1).join('+'):' (no radio case matches)'}`,'rx'); }
    else { note(t,'P',`comPort_DataReceived: BytesToRead = ${pc.buf.length} (not 2) → DiscardInBuffer()`,'warn'); rec('P.data',t,'(discarded)'); }
    pc.buf=[]; }

  /* ----- initial state ----- */
  for (const id in units){ const u=units[id], ini=(D.init[id]||{}); u.slideNow = ini.slide||0;
    rec(id+'.slide', 0, u.slideNow);
    if (ini.on){ u.on=true; rec(id+'.power', -10, 1); if (u.fw==='r') FWI.r.steady(u,0); else FWI[u.fw].steady(u, 0, ini); }
    else { rec(id+'.power', 0, 0); rec(id+'.phase', 0, 'off'); setD(u,0,0xFF); } }
  if (pc){ rec('P.on',0,0); rec('P.mode',0,'1-8'); rec('P.data',0,''); rec('P.rb',0,'00000000'); }
  route(0);

  /* ----- the event loop ----- */
  let ei = 0, guard = 0;
  for (;;){
    if (++guard > 400000) break;
    let tU = Infinity, uN = null; for (const id in units){ const u=units[id]; if (u.on && u.next < tU){ tU=u.next; uN=u; } }
    Q.sort((a,b)=>a.t-b.t); const tQ = Q.length? Q[0].t : Infinity;
    const tE = ei<ev.length ? ev[ei].t : Infinity;
    const tP = pc ? pc.chk : Infinity;
    const tn = Math.min(tU, tQ, tE, tP);
    if (tn > H || tn===Infinity) break;
    if (tE===tn){ const e = ev[ei++];
      if (e.type==='power'){ const u=units[e.u]; if (!u) continue;
        if (e.on && !u.on){ u.on=true; rec(u.id+'.power',e.t,1); FWI[u.fw].boot(u,e.t); route(e.t); }
        else if (!e.on && u.on){ u.on=false; u.next=Infinity; u.inIsr=false; rec(u.id+'.power',e.t,0); phase(u,e.t,'off'); setD(u,e.t,0xFF); rec(u.id+'.isr',e.t,0); note(e.t,u.id,'Power off: the VOF-10-5 supply drops; every receiver and LED goes dark','boot'); route(e.t); } }
      else if (e.type==='slide'){ const u=units[e.u]; if (!u) continue; const old=u.slideNow; u.slideNow=e.v; rec(u.id+'.slide',e.t,e.v);
        if (u.on) FWI[u.fw].slide(u,e.t,e.v,old); }
      else if (e.type==='btn'){ const u=units[e.u]; if (u){ rec(u.id+'.btn', e.t, e.n); rec(u.id+'.btn', e.t+(e.dur||C.PRESS), -1); } }
      else if (e.type==='pc' && pc){ pcAct(e, e.t); }
      continue; }
    if (tP===tn){ pcCheck(tn); continue; }
    if (tQ===tn){ const d = Q.shift(); deliver(d.to, d.it.b, d.t, d.it); continue; }
    if (uN){ FWI[uN.fw].step(uN, tn); }
  }
  for (const id in units){ const u=units[id]; rec(id+'.end', H, 1); }
  notes.sort((a,b)=>a.t-b.t);
  items.sort((a,b)=>a.start-b.start);
  EMU = {sig, notes, items, lost, units, pc};
  return EMU;
}

/* ---------------- signal access ---------------- */
function idxAt(a, t){ let lo=0, hi=a.length-1; if (!a.length || a[0][0]>t) return -1; while (lo<hi){ const m=(lo+hi+1)>>1; if (a[m][0]<=t) lo=m; else hi=m-1; } return lo; }
function sv(name, t, def){ const a = emulate().sig[name]; if (!a) return def; const i = idxAt(a,t); return i<0 ? def : a[i][1]; }
function since(name, t){ const a = emulate().sig[name]; if (!a) return 0; const i = idxAt(a,t); return i<0 ? 0 : a[i][0]; }
const fin = (name, def)=> sv(name, C.HORIZON, def);
function selTxt(P, sc){ const en=[]; for (let i=0;i<8;i++) if (!((P>>(7-i))&1)) en.push(i);
  if (!en.length) return 'nothing';
  if (sc) return en.map(i=>i<4?'A'+(i+1):'B'+(i-3)).join(' + ');
  return en.length===1 ? 'input '+(en[0]+1) : 'inputs '+en.map(i=>i+1).join('+')+' (several!)'; }
function routeOf(code){        // A.rt code → what reaches OUTPUT A and B (74HC4053 behaviour INFERRED)
  if (code<0) return {a:null, b:null, why:'unit off'};
  const P = code>>1, sel = code&1; const en=[]; for (let i=0;i<8;i++) if (!((P>>(7-i))&1)) en.push(i);
  const b1 = en.filter(i=>i<4), b2 = en.filter(i=>i>=4);
  const bus = l => l.length===0 ? -1 : l.length>1 ? -2 : l[0];
  const v1 = bus(b1), v2 = bus(b2);
  if (sel) return {a:v1, b:v2, sel};
  if (b1.length && b2.length) return {a:-2, b:-2, sel};
  const v = b1.length ? v1 : v2; return {a:v, b:v, sel};
}
const srcTxt = s => s===null ? 'off' : s===-1 ? 'no receiver enabled' : s===-2 ? 'CONTENTION' : 'input '+(s+1);
function outState(t, side){ const r = routeOf(sv('A.rt', t, -1)); const s = side ? r.b : r.a; if (s===null || s<0) return {s, ok:false};
  const inp = D.inputs[s]; return {s, ok: inp.on && inp.vpp>=0.2, inp}; }
function phaseAt(id,t){ return sv(id+'.phase', t, 'off'); }
function powerAt(id,t){ return !!sv(id+'.power', t, 0); }
function portdAt(id,t){ return sv(id+'.PORTD', t, 0xFF); }
function passT(){ const sc = sv('A.switchConfig', SIM.t, 0); return D.fw==='v5' ? (sc?C.PASS_V5_2:C.PASS_V5_1)*TCY : D.fw==='v030100' ? C.PASS_V0301*TCY : C.PASS_V0302*TCY; }
function fsOut(t){ const o = outState(t,0); return o.ok ? o.inp.fs : 48000; }

/* ---------------- actions ---------------- */
function act(name, fn, uid){
  const tr = []; const t = SIM.t;
  fn(s=>tr.push(s));
  EMU_KEY = ''; const E = emulate();
  const later = E.notes.filter(n=> n.t >= t - 1e-9 && n.t <= t + 1.2).slice(0, 18);
  later.forEach(n=> tr.push(`<span class="muted">+${SIM.fmtDur(Math.max(0,n.t-t))} [${n.u==='A'?'unit':n.u==='B'?(D.partner==='r'?'POD10R':'unit 2'):'PC'}]</span> ${n.txt}`));
  D.log.unshift({t, name, trace:tr}); if (D.log.length>50) D.log.length=50;
  SIM.refresh();
}
const A = {
  btn(u, n){ const t=SIM.t; act(`Press ${u==='A'?'':(D.partner==='r'?'remote ':'unit 2 ')}button ${n+1}${sv(u+'.switchConfig',t,0)?' ('+(n<4?'A'+(n+1):'B'+(n-3))+')':''} for ${Math.round(D.press*1000)} ms`, tr=>{
      if (!powerAt(u,t)) tr('The unit is off: nothing happens.');
      tr(`PB${n+1} → ${n<5?'RA'+n:'RE'+(n-5)} pulled low through the front-panel board (H1, 332 Ω + 3 kΩ pull-up). The firmware polls it once per main-loop pass.`);
      D.events.push({t, u, type:'btn', n, dur:D.press, user:true}); }); },
  slide(u){ const t=SIM.t, v = sv(u+'.slide', t, 0) ? 0 : 1;
    act(`Slide SW1 → ${v?'A-B (dual 4×1)':'1-8 (single 8×1)'}`, tr=>{ tr(`SW1 SPDT → SWITCH_CONFIG → RB0 = ${v} (R11 3 kΩ, R52 1 MΩ). The manual: top = single, bottom = dual.`); D.events.push({t, u, type:'slide', v, user:true}); }); },
  power(u){ const t=SIM.t, on=powerAt(u,t); act(`Power ${on?'off':'on'}${u==='A'?'':' (partner)'}`, tr=>{ tr(on?'Mains off.':'Mains on: CUI VOF-10-5 → +5 V → PIC16F887 (BOR at 4.0 V).'); D.events.push({t, u, type:'power', on:!on, user:true}); }); },
  pc(a, n){ const t=SIM.t; act(`PC app: ${a==='power'?'Power button':a==='mode'?'Mode button':'button '+(n+1)}`, tr=>{ tr('POD10 Remert (VB.NET) writes to the COM port at 9600 8N1.'); D.events.push({t, type:'pc', a, n, user:true}); }); },
  scenario(id){ loadScenario(id); D.log.unshift({t:0, name:'Scenario: '+SCEN[id].name, trace:[`Firmware ${FW[D.fw].short}, CONTROL: ${PARTNERS[D.partner]}. The emulator re-ran every unit from 0 to 1 s.`]}); SIM.seek(0); SIM.refresh(); },
  clear(){ D.events = D.events.filter(e=>!e.user); EMU_KEY=''; D.log.unshift({t:SIM.t, name:'Cleared your actions', trace:['Back to the scenario events only.']}); SIM.refresh(); },
  fw(f){ D.fw=f; EMU_KEY=''; D.log.unshift({t:SIM.t, name:'Firmware → '+FW[f].name, trace:['Every unit on the link now runs this firmware (the POD10R partner keeps its own).']}); SIM.refresh(); },
  partner(p){ D.partner=p; if ((p==='twin'||p==='r') && !D.init.B) D.init.B = p==='r' ? {on:false} : {on:true, slide:0, sel:0x7F};
    if (p==='r' && !D.events.some(e=>e.u==='B' && e.type==='power')) D.events.push({t:0.02, u:'B', type:'power', on:true});
    EMU_KEY=''; D.log.unshift({t:SIM.t, name:'CONTROL → '+PARTNERS[p], trace:[p==='none'?'The UART still transmits; nobody listens.':'DE9 J1 ↔ U11/U12 DS75176 ↔ CPU_TX/CPU_RX (pin-out '+inf+').']}); SIM.refresh(); },
  input(i, prop, v){ D.inputs[i][prop]=v; EMU_KEY='';
    D.log.unshift({t:SIM.t, name:`Input ${i+1}: ${prop==='on'?(v?'source connected':'unplugged'):prop==='fs'?(v/1000)+' kHz':prop==='vpp'?v+' Vpp':v}`, trace:['Signal only — the firmware never sees the inputs. AES3 passes T'+(i+1)+' → U'+(i+1)+' DS75176 (enabled by XPT'+(i+1)+' low) → bus AES'+(i<4?1:2)+'.']}); SIM.refresh(); },
};

/* ================================================================
   DRAWING: front and rear panels on the real silkscreen
   ================================================================ */
/* Built on POD10A - #ARTWORK #DA #2016 /POD10A-FRONT&REAR-SILK CURVE).pdf (sheet dated Jun.19/14).
   tools/silk_extract.py cut FRONT GREEN, FRONT WHITE and REAR WHITE at 200 dpi between the crop marks
   (x 332–2046; y 166–487 / 674–995 / 1192–1513) → 1714 × 321 px. Green ink recoloured to (66,212,148) from Pics/POD10A Front.jpg.
   Drill crosshairs on the artwork: front (50,161) (1006,161) (1664,161) screws, (299,218) power LED; rear (50,161) (1664,161) screws,
   (1078,209) CONTROL plate screw. Buttons sit under the numerals at x = 481 + 150·n, y = 161; the rocker, slide, jacks, DE9 plate and
   IEC inlet are measured from the three photos (scale 1714 / photo width). */
const ASSET = 'siumulation-plugins/assets/';
const BX = n => 481 + 150*n;
function frontSVG(uid, t, opts){
  opts = opts||{};
  const on = powerAt(uid,t), P = portdAt(uid,t), sl = sv(uid+'.slide', t, 0), held = sv(uid+'.btn', t, -1);
  const pressed = n => { const E=emulate(); return D.events.some(e=>e.type==='btn' && e.u===uid && e.n===n && t>=e.t && t<e.t+(e.dur||C.PRESS)); };
  const cls = 'p10f'+uid;
  return `<svg viewBox="0 0 1714 321" role="img" aria-label="POD10A front panel (real silkscreen)" style="width:100%;max-width:${opts.max||980}px;border-radius:8px;display:block">
    <defs><filter id="p10glow" x="-120%" y="-120%" width="340%" height="340%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <radialGradient id="p10red"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#ff5a6a"/><stop offset="1" stop-color="#b0101c"/></radialGradient></defs>
    <rect width="1714" height="321" rx="8" fill="#2a2627"/>
    <image href="${ASSET}pod10a-front-green.png" width="1714" height="321"/>
    <image href="${ASSET}pod10a-front-white.png" width="1714" height="321"/>
    <g class="${cls}" data-a="power" style="cursor:pointer"><title>Power rocker (click)</title><rect x="140" y="64" width="102" height="146" rx="8" fill="#0b0b0c" stroke="#3a3536" stroke-width="2"/>
      <rect x="153" y="${on?78:128}" width="76" height="68" rx="6" fill="#1c1a1b" stroke="#454041"/><rect x="159" y="${on?84:182}" width="64" height="10" rx="3" fill="#2d2a2b"/></g>
    <circle cx="299" cy="218" r="13" fill="#0a0909"/><circle cx="299" cy="218" r="9" fill="${on?'#d8ff5a':'#2b3220'}" ${on?'filter="url(#p10glow)"':''}><title>LED1 green power (R51 511 Ω from +5 V)</title></circle>
    <g class="${cls}" data-a="slide" style="cursor:pointer"><title>SW1 slide: up = 1-8 (single 8×1), down = A-B (dual 4×1) → RB0. Click to move.</title>
      <rect x="336" y="172" width="44" height="78" rx="5" fill="#0d0c0c" stroke="#3b3637"/><rect x="342" y="${sl?212:178}" width="32" height="32" rx="3" fill="#2e2b2c" stroke="#5a5455"/>
      <line x1="346" y1="${sl?222:188}" x2="370" y2="${sl?222:188}" stroke="#4a4546"/><line x1="346" y1="${sl?230:196}" x2="370" y2="${sl?230:196}" stroke="#4a4546"/></g>
    ${[556,1006,1456].map(x=>`<circle cx="${x}" cy="161" r="13" fill="#7c7a78" stroke="#3a3837" stroke-width="2"/><path d="M${x-7} ${161} h14 M${x} ${154} v14" stroke="#3a3837" stroke-width="3"/>`).join('')}
    ${[50,1664].map(x=>`<circle cx="${x}" cy="161" r="11" fill="#8a8886" stroke="#444" stroke-width="2"/><path d="M${x-6} 161 h12 M${x} 155 v12" stroke="#444" stroke-width="2.5"/>`).join('')}
    ${[0,1,2,3,4,5,6,7].map(n=>{ const x=BX(n), lit = on && !((P>>(7-n))&1), dn = pressed(n);
      return `<g class="${cls}" data-a="btn" data-n="${n}" style="cursor:pointer"><title>Button ${n+1} / ${n<4?'A'+(n+1):'B'+(n-3)} — PB${n+1} → ${n<5?'RA'+n:'RE'+(n-5)}; LED on XPT${n+1} = RD${7-n}${lit?' (lit: receiver U'+(n+1)+' enabled)':''}</title>
        <circle cx="${x}" cy="161" r="38" fill="transparent"/><circle cx="${x}" cy="161" r="33" fill="#060505" stroke="#4a4445" stroke-width="3"/>
        <circle cx="${x}" cy="${dn?163:161}" r="${dn?23:25}" fill="${lit?'url(#p10red)':'#3b3a3b'}" stroke="${lit?'#ff8a95':'#5d5a5b'}" stroke-width="2" ${lit?'filter="url(#p10glow)"':''}/>
        ${lit?'':`<circle cx="${x}" cy="161" r="7" fill="#6f7a78"/>`}</g>`; }).join('')}
    ${opts.hot||''}
  </svg>`;
}
function rearSVG(t){
  const b110 = D.build===110, partner = D.partner;
  const ro = routeOf(sv('A.rt', t, -1));
  const jack = (x,y,id,tip,plug,outLed)=>{
    const g = b110 ? `<rect x="${x-45}" y="${y-40}" width="90" height="80" rx="4" fill="#33c27a" stroke="#1d7f4c" stroke-width="2"/>${[-28,0,28].map(d=>`<rect x="${x+d-11}" y="${y-4}" width="22" height="30" rx="3" fill="#145c36"/><circle cx="${x+d}" cy="${y-22}" r="6" fill="#c6ccc8"/>`).join('')}
        ${plug?`<rect x="${x-41}" y="${y-36}" width="82" height="72" rx="4" fill="#2aa868" stroke="#106038" stroke-width="2" opacity=".95"/>${[-28,0,28].map((d,i)=>`<path d="M${x+d} ${y+36} q 0 26 ${8-i*8} 40" stroke="${['#c33','#222','#888'][i]}" stroke-width="6" fill="none"/>`).join('')}`:''}`
      : `<circle cx="${x}" cy="${y}" r="46" fill="#1d4a33"/><circle cx="${x}" cy="${y}" r="38" fill="#b9bcc0" stroke="#6d7175" stroke-width="3"/><circle cx="${x}" cy="${y}" r="25" fill="#cfd2d4"/><circle cx="${x}" cy="${y}" r="9" fill="#d6b45a"/>
        ${plug?`<rect x="${x-22}" y="${y-28}" width="44" height="56" rx="8" fill="#3a74b8"/><rect x="${x-14}" y="${y-80}" width="28" height="54" fill="#2b5f9e"/>`:''}`;
    return `<g ${id?`class="p10r" data-j="${id}" style="cursor:pointer"`:''}><title>${tip}</title>${g}${outLed?`<circle cx="${x+44}" cy="${y-38}" r="7" fill="${outLed}"/>`:''}</g>`; };
  const inX = [419,572,725,878], ins = [];
  for (let i=0;i<8;i++){ const x = inX[i>>1], y = (i&1)? 206 : 87, inp = D.inputs[i];
    ins.push(jack(x,y,'in'+i,`INPUT ${i+1} / ${i<4?'A'+(i+1):'B'+(i-3)}: ${inp.on?(inp.fs/1000)+' kHz AES3, '+inp.vpp+' Vpp (click to unplug)':'nothing connected (click to connect a source)'}. T${i+1} → U${i+1} DS75176 RX (RXEN = XPT${i+1}), R${i+1} ${b110?'110':'75'} Ω termination`, inp.on)); }
  const oc = s => s===null ? null : s===-2 ? 'var(--bad)' : s<0 ? '#555' : (D.inputs[s].on ? 'var(--accent)' : 'var(--warn)');
  const outs = [jack(263,87,null,`OUTPUT A (U9 → T9): ${srcTxt(ro.a)}`, true, oc(ro.a)), jack(263,206,null,`OUTPUT B (U10 → T10): ${srcTxt(ro.b)}`, true, oc(ro.b))];
  const ctlTip = `CONTROL (J1 DE9S, U11/U12 DS75176, 9600 Bd). Now: ${PARTNERS[partner]}. Click to cycle what is connected.`;
  return `<svg viewBox="0 0 1714 321" role="img" aria-label="POD10A rear panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <rect width="1714" height="321" rx="8" fill="#252223"/>
    ${outs.join('')}${ins.join('')}
    <g class="p10r" data-j="ctl" style="cursor:pointer"><title>${ctlTip}</title>
      ${partner==='none' ? `<rect x="1098" y="164" width="150" height="86" rx="6" fill="#141213" stroke="#3a3536"/><text x="1173" y="214" text-anchor="middle" font-size="15" fill="#6d6869">blank plate</text>`
        : `<rect x="1098" y="164" width="150" height="86" rx="6" fill="#1a1819" stroke="#3a3536"/><path d="M1118 182 h110 l-10 52 h-90 z" fill="#c9cdd2" stroke="#7a7e82" stroke-width="2"/>${[0,1,2,3,4].map(k=>`<circle cx="${1136+k*19}" cy="196" r="4" fill="#333"/>`).join('')}${[0,1,2,3].map(k=>`<circle cx="${1145+k*19}" cy="218" r="4" fill="#333"/>`).join('')}
          <rect x="1128" y="120" width="90" height="50" rx="6" fill="#4a4f57"/><path d="M1173 120 q 0 -60 ${partner==='pc'?120:-60} -110" stroke="#4a4f57" stroke-width="12" fill="none"/>`}</g>
    ${[1074,1267].map(x=>`<circle cx="${x}" cy="207" r="11" fill="#8f9295" stroke="#55585b" stroke-width="2"/><path d="M${x-6} 207 h12 M${x} 201 v12" stroke="#47494c" stroke-width="2"/>`).join('')}
    <g class="p10r" data-j="mains" style="cursor:pointer"><title>IEC inlet with fuse drawer, 100–230 VAC → CUI VOF-10-5 (click: power)</title><rect x="1347" y="34" width="245" height="214" rx="12" fill="#0b0b0c" stroke="#333" stroke-width="2"/><rect x="1362" y="54" width="62" height="176" rx="5" fill="#161516"/><rect x="1440" y="62" width="134" height="160" rx="12" fill="#050505"/>
      ${[[1474,96],[1540,96],[1507,180]].map(([x,y])=>`<rect x="${x-10}" y="${y-14}" width="20" height="28" fill="#c9cdd2"/>`).join('')}</g>
    ${[[171,40],[171,277],[986,40],[986,277],[50,161],[1664,161]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="10" fill="#8f9295" stroke="#55585b" stroke-width="2"/><path d="M${x-6} ${y} h12 M${x} ${y-6} v12" stroke="#47494c" stroke-width="2"/>`).join('')}
    <image href="${ASSET}pod10a-rear-white.png" width="1714" height="321"/>
  </svg>`;
}
function bindPanel(root){
  root.querySelectorAll('[class^="p10f"]').forEach(g=>{ const uid = g.getAttribute('class').slice(4);
    g.addEventListener('click', ()=>{ const a=g.dataset.a; if (a==='power') A.power(uid); else if (a==='slide') A.slide(uid); else if (a==='btn') A.btn(uid, +g.dataset.n); }); });
  root.querySelectorAll('.p10r').forEach(g=> g.addEventListener('click', ()=>{ const j=g.dataset.j;
    if (j==='mains') A.power('A');
    else if (j==='ctl'){ const ks=Object.keys(PARTNERS); A.partner(ks[(ks.indexOf(D.partner)+1)%ks.length]); }
    else if (j.startsWith('in')) A.input(+j.slice(2), 'on', !D.inputs[+j.slice(2)].on); }));
}
/* The PC test app window, drawn from the control names and texts in POD10 Remert.exe (btnPower, cmbSerialPort, btn1–8, btnMode, rb1–8, rb18/rbAB, tbCMD/tbDATA) */
function pcHTML(t){
  const on = !!sv('P.on',t,0), mode = sv('P.mode',t,'1-8'), data = sv('P.data',t,''), rb = sv('P.rb',t,'00000000');
  const lab = n => mode==='1-8' ? String(n+1) : (n<4?'A'+(n+1):'B'+(n-3));
  return `<div style="border:1px solid var(--line);border-radius:6px;background:var(--panel2);padding:8px;font:12px var(--sans);max-width:560px">
    <div style="font-weight:700;margin-bottom:6px">POD10 Remert <span class="muted small">(form “POD10”, layout ${inf})</span></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:6px">
      <label class="small">Com Port <select disabled><option>COM1</option></select></label>
      <button data-pc="power" class="${on?'on':''}">Power: ${on?'On':'Off'}</button>
      <button data-pc="mode" ${on?'':'disabled'}>Mode: ${mode}</button>
      <span class="small">Mode <label><input type="radio" disabled ${mode==='1-8'?'checked':''}>1-8</label> <label><input type="radio" disabled ${mode==='A-B'?'checked':''}>A-B</label></span></div>
    <div style="display:flex;gap:4px;flex-wrap:wrap">${[0,1,2,3,4,5,6,7].map(n=>`<button data-pc="btn" data-n="${n}" ${on?'':'disabled'} style="min-width:46px">${lab(n)}</button>`).join('')}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px" class="small">${[0,1,2,3,4,5,6,7].map(n=>`<label><input type="radio" disabled ${rb[n]==='1'?'checked':''}>Ch. ${n+1}/${n<4?'A'+(n+1):'B'+(n-3)}</label>`).join('')}</div>
    <div class="small" style="margin-top:6px">Received Data: <span class="mono" style="border:1px solid var(--line);padding:1px 6px">${(data||'').split(' ')[0]||'&nbsp;'}</span> <span class="mono" style="border:1px solid var(--line);padding:1px 6px">${(data||'').split(' ')[1]||'&nbsp;'}</span></div></div>`;
}
function bindPC(root){ root.querySelectorAll('[data-pc]').forEach(b=> b.onclick = ()=> A.pc(b.dataset.pc, +b.dataset.n)); }

function partnerHTML(t){
  if (D.partner==='none') return '<p class="small muted">Nothing is connected to CONTROL. The photographed units have a blank plate over the DE9 cut-out. Click the plate on the rear panel to connect a PC, a second POD10A or a POD10R remote.</p>';
  if (D.partner==='pc') return pcHTML(t);
  const nm = D.partner==='r' ? 'POD10R remote (same board, remote firmware)' : 'Unit 2 (linked POD10A)';
  return `<div class="small" style="margin-bottom:4px"><b>${nm}</b> · ${phaseAt('B',t)} · PORTD ${hex2(portdAt('B',t))}</div>${frontSVG('B', t, {max:640})}`;
}
function controlsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px">
    ${[0,1,2,3,4,5,6,7].map(n=>`<button data-b="${n}" title="key ${n+1}">${n+1}</button>`).join('')}
    <button data-a="slide" title="S">Slide</button><button data-a="power" title="P">Power</button>
    <label class="small">Hold <select data-a="press">${[0.05,0.15,0.3,0.6].map(v=>`<option value="${v}" ${v===D.press?'selected':''}>${v*1000} ms</option>`).join('')}</select></label>
    <span class="small muted">Keys 1–8 buttons · S slide · P power</span></div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px">
    <label class="small">Firmware <select data-a="fw">${Object.keys(FW).map(k=>`<option value="${k}" ${k===D.fw?'selected':''}>${FW[k].name}</option>`).join('')}</select></label>
    <label class="small">CONTROL <select data-a="partner">${Object.keys(PARTNERS).map(k=>`<option value="${k}" ${k===D.partner?'selected':''}>${PARTNERS[k]}</option>`).join('')}</select></label>
    <label class="small">Build <select data-a="build"><option value="75" ${D.build===75?'selected':''}>POD10A/75 (BNC)</option><option value="110" ${D.build===110?'selected':''}>POD10A/110 (Phoenix)</option></select></label></div>
    <div class="small muted" style="margin-top:4px">Every action is inserted at the playhead and all firmware is re-run from 0 s. A click holds the button for the “Hold” time (${inf}).</div>`;
}
function bindControls(root){
  root.querySelectorAll('button[data-b]').forEach(b=> b.onclick = ()=> A.btn('A', +b.dataset.b));
  const m = {slide:()=>A.slide('A'), power:()=>A.power('A')};
  root.querySelectorAll('button[data-a]').forEach(b=> b.onclick = ()=> m[b.dataset.a]());
  const q = s => root.querySelector(s);
  if (q('select[data-a="press"]')) q('select[data-a="press"]').onchange = e=>{ D.press=+e.target.value; };
  if (q('select[data-a="fw"]')) q('select[data-a="fw"]').onchange = e=> A.fw(e.target.value);
  if (q('select[data-a="partner"]')) q('select[data-a="partner"]').onchange = e=> A.partner(e.target.value);
  if (q('select[data-a="build"]')) q('select[data-a="build"]').onchange = e=>{ D.build=+e.target.value; SIM.refresh(); };
}
function inputsHTML(){
  return `<table class="kv"><tr><th>Input</th><th>source</th><th>rate</th><th>level</th><th>on OUT A / B now</th></tr>${D.inputs.map((p,i)=>{ const r=routeOf(sv('A.rt',SIM.t,-1));
    return `<tr><td>${INNAME[i]}</td><td><input type="checkbox" data-in="${i}" data-p="on" ${p.on?'checked':''}></td>
      <td><select data-in="${i}" data-p="fs">${[32000,44100,48000,96000,192000].map(f=>`<option value="${f}" ${f===p.fs?'selected':''}>${f/1000} k</option>`).join('')}</select></td>
      <td><select data-in="${i}" data-p="vpp">${[0.1,0.3,1,2,5,7].map(f=>`<option value="${f}" ${f===p.vpp?'selected':''}>${f} Vpp</option>`).join('')}</select></td>
      <td class="mono">${r.a===i?'A ':''}${r.b===i?'B':''}</td></tr>`; }).join('')}</table>
    <p class="small muted">Manual: input 0.2–7 Vpp, ${D.build===110?'110 Ω':'75 Ω'} balanced; output 3 Vpp terminated. Below 0.2 Vpp the DS75176 receiver (±200 mV threshold, datasheet) cannot slice the signal. The firmware never looks at the audio: there is no AES receiver chip and no re-clocking.</p>`;
}
function bindInputs(root){ root.querySelectorAll('[data-in]').forEach(el=>{ const i=+el.dataset.in, p=el.dataset.p; el.onchange = ()=> A.input(i, p, p==='on' ? el.checked : +el.value); }); }
window.__pod10aKeys = false;
document.addEventListener('keydown', e=>{
  if (!window.__pod10aKeys || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k>='1' && k<='8'){ A.btn('A', +k-1); e.preventDefault(); }
  else if (k==='s'){ A.slide('A'); e.preventDefault(); }
  else if (k==='p'){ A.power('A'); e.preventDefault(); }
});

/* ---------------- timeline lanes ---------------- */
const PHCOL = {off:null, boot:'--warn', wait:'--warn', loop:null, held:'--accent2', rxwait:'--bad', rwait:'--warn'};
const PHTXT = {off:'off', boot:'start-up', wait:'statusRequest: waiting for a reply (count → 500)', loop:'main loop', held:'btnRelease(): stuck until the buttons are up', rxwait:'receive(): waiting for byte 2', rwait:'waitForData(): LED chase'};
function drawSig(c, X, t0, t1, y, h, name, colOf, txtOf){
  const a = emulate().sig[name] || []; let i = Math.max(0, idxAt(a, t0));
  c.font = '10.5px '+SIM.css('--sans');
  for (; i < a.length && a[i][0] <= t1; i++){
    const s = Math.max(t0, a[i][0]), e = Math.min(t1, i+1<a.length ? a[i+1][0] : C.HORIZON);
    if (e < t0) continue;
    const col = colOf(a[i][1]); const xa = X(s), xb = X(e);
    if (col){ c.fillStyle = col; c.fillRect(xa, y+3, Math.max(1, xb-xa), h-6); }
    const tx = txtOf && txtOf(a[i][1]);
    if (tx && xb-xa > c.measureText(tx).width+8){ c.fillStyle = col ? '#fff' : SIM.css('--ink2'); c.fillText(tx, xa+4, y+h/2+4); }
  }
}
function drawBytes(c, X, t0, t1, y, h, from){
  const css=SIM.css, E=emulate();
  for (const it of E.items){ if (from.indexOf(it.from)<0 || it.end < t0 || it.start > t1) continue;
    const xa=X(it.start), xb=X(it.end), w=xb-xa;
    const col = it.from==='A' ? css('--accent2') : it.from==='P' ? '#8a5cc7' : css('--accent');
    if (w > 160){   // bit level: start, 8 data LSB first, stop
      const lv=[0]; for (let k=0;k<8;k++) lv.push((it.b>>k)&1); lv.push(1);
      c.strokeStyle=col; c.lineWidth=1.6; c.beginPath(); c.moveTo(Math.max(X(t0),xa-20), y+5); c.lineTo(xa, y+5);
      lv.forEach((v,k)=>{ const yy = v? y+5 : y+h-5; c.lineTo(xa+w*k/10, yy); c.lineTo(xa+w*(k+1)/10, yy); });
      c.lineTo(xb, y+5); c.lineTo(xb+20, y+5); c.stroke();
      c.fillStyle=css('--ink2'); c.font='10px '+css('--mono');
      lv.forEach((v,k)=>{ const lb = k===0?'start':k===9?'stop':'b'+(k-1)+'='+v; if (w/10 > c.measureText(lb).width+4) c.fillText(lb, xa+w*k/10+2, y+h/2+3); });
      c.fillStyle=css('--ink'); c.fillText(hex2(it.b)+(it.over?' (overwritten)':''), xa+2, y+10);
    } else {
      c.fillStyle=col; c.globalAlpha=it.over?.5:.85; c.fillRect(xa, y+4, Math.max(1,w-1), h-8); c.globalAlpha=1;
      if (w > 22){ c.fillStyle='#fff'; c.font='10.5px '+css('--mono'); c.fillText(hx(it.b), xa+3, y+h/2+4); }
    }
  }
}
function lanes(){
  const css = SIM.css; const ls = [];
  const fwv = D.fw, E = emulate();
  ls.push({label:'Unit: power · firmware state', h:28, draw(c,X,t0,t1,y,h){
    drawSig(c,X,t0,t1,y,h,'A.phase', v=> PHCOL[v]? css(PHCOL[v]) : null, v=> PHTXT[v]||v);
    drawSig(c,X,t0,t1,y,h,'A.isr', v=> v? css('--bad') : null, v=> v? 'RB0 ISR: debounce loop, interrupts off (113.9 ms)' : ''); }});
  ls.push({label:`PIC main-loop passes (${SIM.fmtDur(passT())})`, h:24, draw(c,X,t0,t1,y,h){
    const a = E.sig['A.phase']||[]; for (let i=0;i<a.length;i++){ if (a[i][1]!=='loop') continue; const s=Math.max(t0,a[i][0]), e=Math.min(t1, i+1<a.length?a[i+1][0]:C.HORIZON); if (e<=s) continue;
      const isr = E.sig['A.isr']||[]; const p=passT(); c.save(); c.beginPath(); c.rect(X(s),y,X(e)-X(s),h); c.clip(); SIM.pulses(c,X,s,e,y,h,p,a[i][0],p*0.15,css('--accent'),'passes'); c.restore(); } }});
  if (fwv==='v5') ls.push({label:'Timer2 ISR count (start-up only)', h:22, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'A.count', v=> v>0&&v<500? css('--warn') : null, v=> v>0&&v<500 ? 'count = '+v : ''); }});
  ls.push({label:'Front buttons PB1–PB8', h:22, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'A.btn', v=> v>=0? css('--accent2') : null, v=> v>=0? 'PB'+(v+1)+' held' : ''); }});
  ls.push({label:'SW1 slide → RB0', h:20, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'A.slide', v=> v? css('--accent2') : null, v=> v? 'A-B (RB0 = 1)' : '1-8 (RB0 = 0)'); }});
  ls.push({label:'PORTD → XPT1–8 (LEDs + receivers)', h:26, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'A.PORTD', v=> v===0xFF? null : css('--accent'), v=> hex2(v)+' '+selTxt(v, sv('A.RB1',(t0+t1)/2,0))); }});
  ls.push({label:'RB1 SWITCH_SEL → 74HC4053', h:20, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'A.RB1', v=> v? css('--accent2') : null, v=> v? '1: OUT A ← AES1, OUT B ← AES2' : '0: one bus to both outputs'); }});
  ls.push({label:'UART TX (CPU_TX → CONTROL)', h:28, draw(c,X,t0,t1,y,h){ drawBytes(c,X,t0,t1,y,h,['A']); }});
  ls.push({label:'UART RX (CONTROL → CPU_RX)', h:28, draw(c,X,t0,t1,y,h){ drawBytes(c,X,t0,t1,y,h,['B','P']); drawSig(c,X,t0,t1,y,h,'A.oerr', v=> v? 'rgba(200,40,30,.25)' : null, v=> v? 'OERR — receiver dead' : ''); }});
  if (fwv==='v5') ls.push({label:'ack · byte1 · byte2', h:22, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'A.ack', v=> v===1? css('--warn') : v===2? css('--accent2') : null, v=> 'ack '+v); }});
  else if (fwv==='v030200') ls.push({label:'dataReceived (slide ignored when 1)', h:22, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'A.dataReceived', v=> v? css('--warn') : null, v=> v? 'dataReceived = 1' : 'dataReceived = 0'); }});
  [0,1].forEach(side=> ls.push({label:`OUTPUT ${side?'B':'A'} (U${9+side} → T${9+side})`, h:26, draw(c,X,t0,t1,y,h){
    const a = E.sig['A.rt']||[]; let i=Math.max(0,idxAt(a,t0));
    for (; i<a.length && a[i][0]<=t1; i++){ const s=Math.max(t0,a[i][0]), e=Math.min(t1, i+1<a.length?a[i+1][0]:C.HORIZON); if (e<s) continue;
      const r=routeOf(a[i][1]), src = side? r.b : r.a, xa=X(s), xb=X(e);
      if (src===null) continue;
      if (src===-2){ c.fillStyle=css('--bad'); c.fillRect(xa,y+3,xb-xa,h-6); c.fillStyle='#fff'; c.font='10.5px '+css('--sans'); if (xb-xa>90) c.fillText('bus contention', xa+4, y+h/2+4); continue; }
      if (src===-1){ c.fillStyle=css('--ink2'); c.font='10.5px '+css('--sans'); if (xb-xa>90) c.fillText('nothing enabled', xa+4, y+h/2+4); continue; }
      const inp=D.inputs[src];
      if (!inp.on || inp.vpp<0.2){ c.fillStyle=css('--warn'); c.globalAlpha=.4; c.fillRect(xa,y+3,xb-xa,h-6); c.globalAlpha=1; c.fillStyle=css('--ink'); if (xb-xa>90) c.fillText(`input ${src+1}: ${inp.on?'too small':'no source'}`, xa+4, y+h/2+4); continue; }
      c.save(); c.beginPath(); c.rect(xa,y,xb-xa,h); c.clip(); SIM.pulses(c,X,s,e,y,h,1/inp.fs,0,0.25/inp.fs,css('--accent'),'AES3 frames from input '+(src+1)); c.restore();
      if (i>0 && a[i][0]>=t0){ c.fillStyle=css('--play'); c.fillRect(X(a[i][0])-1,y+1,3,h-2); } } }}));
  if (D.partner!=='none') ls.push({label: D.partner==='pc' ? 'PC app display (CMD DATA)' : (D.partner==='r'?'POD10R':'Unit 2')+': PORTD / state', h:24, draw(c,X,t0,t1,y,h){
    if (D.partner==='pc') drawSig(c,X,t0,t1,y,h,'P.data', v=> v? '#8a5cc7' : null, v=> v||'');
    else { drawSig(c,X,t0,t1,y,h,'B.phase', v=> PHCOL[v]? css(PHCOL[v]) : null, v=> v==='loop'? '' : (PHTXT[v]||v)); drawSig(c,X,t0,t1,y,h,'B.PORTD', v=> null, v=> hex2(v)+' '+selTxt(v, sv('B.RB1',(t0+t1)/2,0))); } }});
  return ls;
}

/* ---------------- scopes ---------------- */
function aesSub(t, src){
  const inp = D.inputs[src], fs = inp.fs, n = Math.floor(t*fs), fr = n % 192;
  const out=[]; for (const side of [0,1]){ const v = 0.5*Math.sin(2*Math.PI*inp.f*(side?1.5:1)*n/fs);
    let s = Math.round(v*8388607); if (s<0) s += 1<<24; const bits = new Array(32).fill(0);
    for (let b=0;b<24;b++) bits[4+b] = (s>>b)&1; bits[30] = fr===0?1:0; let par=0; for (let b=4;b<31;b++) par^=bits[b]; bits[31]=par;
    out.push({pre: side?'Y':(fr===0?'Z':'X'), bits, v, raw:s}); }
  return {n, fr, fs, sub:out};
}
function biphase(pre, bits, start){
  const Pp = {X:[1,1,1,0,0,0,1,0], Y:[1,1,1,0,0,1,0,0], Z:[1,1,1,0,1,0,0,0]}[pre];
  const lv = []; Pp.forEach(b=>lv.push(start? 1-b : b)); let cur = lv[lv.length-1];
  for (let i=4;i<32;i++){ cur = 1-cur; lv.push(cur); if (bits[i]) cur = 1-cur; lv.push(cur); }
  return lv;
}
function drawScope(cv, el, t){
  const {c,w} = SIM.canvas(cv, 150); const ink=SIM.css('--ink'), ink2=SIM.css('--ink2');
  const o = outState(t,0);
  if (!o.ok){ c.fillStyle=ink2; c.font='13px '+SIM.css('--sans'); c.fillText(o.s===null?'Unit off.':o.s===-2?'Two receivers drive the same bus: the output is garbage.':o.s===-1?'No receiver enabled: OUT A is idle.':'The selected input has no usable source.', 12, 70); el.innerHTML=''; return; }
  const F = aesSub(t, o.s), fs=F.fs;
  const lvA = biphase(F.sub[0].pre, F.sub[0].bits, 0), lvB = biphase(F.sub[1].pre, F.sub[1].bits, lvA[lvA.length-1]);
  const lv = lvA.concat(lvB), cw = (w-20)/lv.length;
  const zones = [[0,8,SIM.css('--warn'),'pre'],[8,56,SIM.css('--accent'),'audio 24 bits (LSB first)'],[56,64,SIM.css('--accent2'),'VUCP']];
  [0,64].forEach(off=>zones.forEach(([a,b,col,lb])=>{ c.fillStyle=col; c.globalAlpha=.12; c.fillRect(10+(off+a)*cw,20,(b-a)*cw,70); c.globalAlpha=1; c.fillStyle=ink2; c.font='10px '+SIM.css('--sans'); if ((b-a)*cw>30) c.fillText(lb, 12+(off+a)*cw, 104); }));
  c.strokeStyle=ink; c.lineWidth=1.5; c.beginPath(); lv.forEach((v,i)=>{ const x=10+i*cw, yy=v?30:80; i?c.lineTo(x,yy):c.moveTo(x,yy); c.lineTo(x+cw,yy); }); c.stroke();
  // was there a switch inside this frame?
  const a = emulate().sig['A.rt']||[]; const f0 = F.n/fs, f1=(F.n+1)/fs; const sw = a.find(p=>p[0]>f0 && p[0]<=f1);
  if (sw){ const x = 10 + (sw[0]-f0)*fs*128*cw; c.strokeStyle=SIM.css('--play'); c.lineWidth=2; c.beginPath(); c.moveTo(x,16); c.lineTo(x,96); c.stroke(); c.fillStyle=SIM.css('--play'); c.fillText('PORTD written here: the stream is cut mid-frame', Math.min(x+4, w-260), 16); }
  c.fillStyle=ink; c.font='11px '+SIM.css('--mono'); c.fillText(`OUT A ← input ${o.s+1} · Subframe A (${F.sub[0].pre})`,12,14); c.fillText('Subframe B (Y)',12+64*cw,14);
  c.fillText(`frame ${F.n.toLocaleString()} · ${F.fr}/191 · cell ${SIM.fmtDur(1/(fs*128))} · frame ${SIM.fmtDur(1/fs)}`, 10, 130);
  el.innerHTML = F.sub.map((s,i)=>`${i?'B':'A'} ${s.v.toFixed(4)} → 0x${s.raw.toString(16).padStart(6,'0').toUpperCase()} · V=${s.bits[28]} U=${s.bits[29]} C=${s.bits[30]} P=${s.bits[31]}`).join('<br>')
    + `<br><span class="muted">The POD10A passes the bits through untouched: DS75176 receiver → bus → DS75176 driver → transformer. The test tone and the frame phase are ${inf} (each input is a separate source).</span>`;
}
function drawUart(cv, el, t){
  const {c,w} = SIM.canvas(cv, 120); const css=SIM.css, E=emulate();
  let it = null, best = 1e9; for (const x of E.items){ const d = t<x.start ? x.start-t : t>x.end ? t-x.end : 0; if (d<best){ best=d; it=x; } }
  if (!it){ c.fillStyle=css('--ink2'); c.font='13px '+css('--sans'); c.fillText('No byte on the CONTROL link in this second.', 12, 60); el.innerHTML=''; return; }
  const lv=[0]; for (let k=0;k<8;k++) lv.push((it.b>>k)&1); lv.push(1); const cw=(w-80)/10;
  c.strokeStyle=css('--ink'); c.lineWidth=1.6; c.beginPath(); c.moveTo(10,30); c.lineTo(40,30);
  lv.forEach((v,k)=>{ const x=40+k*cw, yy=v?30:80; c.lineTo(x,yy); c.lineTo(x+cw,yy); }); c.lineTo(w-10,30); c.stroke();
  c.font='11px '+css('--mono'); c.fillStyle=css('--ink2'); lv.forEach((v,k)=>c.fillText(k===0?'start':k===9?'stop':'D'+(k-1)+'='+v, 42+k*cw, 100));
  if (t>=it.start && t<=it.end){ const x = 40 + (t-it.start)/BIT_T*cw; c.strokeStyle=css('--play'); c.beginPath(); c.moveTo(x,16); c.lineTo(x,88); c.stroke(); }
  c.fillStyle=css('--ink'); c.fillText(`${it.from==='A'?'unit → link':it.from==='P'?'PC → unit':'partner → unit'}: ${hex2(it.b)} = ${bin8(it.b)}b · ${it.why||''}`, 10, 14);
  el.innerHTML = `${SIM.fmtT(it.start)} → ${SIM.fmtT(it.end)} · 1 bit = ${SIM.fmtDur(BIT_T)} = ${(BIT_T/TCY).toFixed(0)} Tcy · SPBRG 7, BRGH 0: 4 915 200 / (64 × 8) = ${BAUD.toFixed(0)} Bd exactly${it.over?' · <b>this TXREG slot was overwritten</b>':''}`;
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ const l=D.log[0]; return l ? `<div><b>${l.name}</b> at ${SIM.fmtT(l.t)}</div>` + l.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Press a button, move the slide or connect something to CONTROL. The firmware path the emulator took is listed here, with time offsets after your action.</div>'; }
function scenarioHTML(){ return `<label class="small">Scenario <select class="p10scn">${Object.keys(SCEN).map(k=>`<option value="${k}" ${k===D.scenario?'selected':''}>${SCEN[k].name}</option>`).join('')}</select></label> <button class="p10clr">Clear my actions</button>`; }
function bindScenario(m){ m.querySelectorAll('.p10scn').forEach(s=>s.onchange=e=>A.scenario(e.target.value)); m.querySelectorAll('.p10clr').forEach(b=>b.onclick=()=>A.clear()); }
function inspectorHTML(t){
  const ph = phaseAt('A',t), P = portdAt('A',t), sc = sv('A.switchConfig',t,0), ro = routeOf(sv('A.rt',t,-1));
  const v = k => { const x = sv('A.'+k, t, undefined); return x===undefined ? '—' : x; };
  const lastNote = emulate().notes.filter(n=>n.u==='A' && n.t<=t).slice(-1)[0];
  return `<table class="kv">
    <tr><th>Firmware</th><td class="mono">${FW[D.fw].name}</td></tr>
    <tr><th>State</th><td class="mono">${PHTXT[ph]||ph}${sv('A.isr',t,0)?' · <b style="color:var(--bad)">inside the RB0 interrupt</b>':''}${sv('A.oerr',t,0)?' · <b style="color:var(--bad)">OERR: UART receive dead</b>':''}</td></tr>
    <tr><th>preOutput · inputReg</th><td class="mono">${typeof v('preOutput')==='number'?hex2(v('preOutput')):'—'} · ${typeof v('inputReg')==='number'?hex2(v('inputReg')):'—'}</td></tr>
    <tr><th>switchConfig · RB0 · RB1</th><td class="mono">${sc} (${sc?'A-B':'1-8'}) · slide ${sv('A.slide',t,0)} · SWITCH_SEL ${sv('A.RB1',t,0)}</td></tr>
    ${D.fw==='v5'?`<tr><th>ack · byte1 · byte2 · count</th><td class="mono">${v('ack')} · ${typeof v('byte1')==='number'?hex2(v('byte1')):'—'} · ${typeof v('byte2')==='number'?hex2(v('byte2')):'—'} · ${v('count')}</td></tr>`:''}
    ${D.fw==='v030200'?`<tr><th>dataReceived · outputChanged</th><td class="mono">${v('dataReceived')} · ${v('outputChanged')}</td></tr>`:''}
    <tr><th>PORTD (XPT1…XPT8)</th><td class="mono">${hex2(P)} = ${bin8(P)}b → ${selTxt(P, sv('A.RB1',t,0))}</td></tr>
    <tr><th>OUTPUT A · B</th><td class="mono">${srcTxt(ro.a)} · ${srcTxt(ro.b)}</td></tr>
    <tr><th>Last firmware step</th><td class="small">${lastNote?`<span class="muted">${SIM.fmtT(lastNote.t)}</span> ${lastNote.txt}`:'—'}</td></tr>
  </table>`;
}

function viewSim(m){
  window.__pod10aKeys = true;
  m._ck = m._ik = null;
  m.innerHTML = `
  <div class="grid2">
    <div>
      ${card('Front panel at the playhead — click the buttons, the slide and the rocker', `<div id="fp"></div><div id="ctl"></div>`)}
      ${card('Rear panel — click an input to plug/unplug, CONTROL to change what is connected', `<div id="rp"></div><div id="ins" style="margin-top:8px"></div>`)}
    </div>
    <div>
      ${card('What the firmware did (emulated, last action)', `<div style="margin-bottom:6px">${scenarioHTML()}</div><div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
      ${card('On the CONTROL link', `<div id="pt"></div>`)}
    </div>
  </div>
  ${card('Timeline — one second, zoomable (click to seek; transport above)', `<canvas id="tl"></canvas>
    <p class="small muted">Main-loop pass = ${C.PASS_V5_1} instruction cycles × 813.8 ns = ${SIM.fmtDur(C.PASS_V5_1*TCY)} (V5, 1-8 mode), counted instruction by instruction in the disassembled <span class="mono">POD10V5.production.hex</span>. UART bytes are drawn bit by bit when you zoom to 2 ms or less. Red ticks on the output lanes mark the instant PORTD changes.</p>`)}
  <div class="grid2">
    ${card('Scope: OUTPUT A at the playhead (one AES3 frame, biphase-mark)', `<canvas id="scope"></canvas><div id="bits" class="small mono"></div>`)}
    ${card('Scope: the CONTROL byte nearest the playhead (9600 8N1)', `<canvas id="uart"></canvas><div id="ub" class="small"></div>`)}
  </div>
  ${card('Action log', `<div id="log" class="log"></div>`)}`;
  const draw = ()=>{
    const t = SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG('A', t); m.querySelector('#rp').innerHTML = rearSVG(t);
    bindPanel(m.querySelector('#fp')); bindPanel(m.querySelector('#rp'));
    m.querySelector('#pt').innerHTML = partnerHTML(t); bindPanel(m.querySelector('#pt')); bindPC(m.querySelector('#pt'));
    const ck = JSON.stringify([D.fw, D.partner, D.build, D.press]); if (ck!==m._ck){ m._ck=ck; m.querySelector('#ctl').innerHTML = controlsHTML(); bindControls(m.querySelector('#ctl')); }
    const ik = JSON.stringify([D.inputs, sv('A.rt',t,-1), D.build]); if (ik!==m._ik){ m._ik=ik; m.querySelector('#ins').innerHTML = inputsHTML(); bindInputs(m.querySelector('#ins')); }
    m.querySelector('#insp').innerHTML = inspectorHTML(t);
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:210});
    drawScope(m.querySelector('#scope'), m.querySelector('#bits'), t);
    drawUart(m.querySelector('#uart'), m.querySelector('#ub'), t);
  };
  bindScenario(m);
  SIM.on('time', draw);
}

/* ---------------- tutorial (from POD10A.docx / POD10A MAN.pdf and the firmware) ---------------- */
const finSel = ()=> fin('A.PORTD', 0xFF);
const LESSONS = [
  { title:'Meet the POD10A', body:`<p>The POD10A is an <b>interlocking digital audio switcher</b> (manual, Oct 2013|46). It can work as one <b>8×1</b> switcher or as two <b>4×1</b> switchers. A slide on the front panel chooses which.</p>
     <p>Front: power rocker and green power LED, the <b>1-8 / A-B</b> slide, and eight lit buttons (<b>1–8</b>, also labelled <b>A1–A4</b> and <b>B1–B4</b>). Rear: eight transformer-balanced inputs and two outputs, <b>A</b> and <b>B</b>. They are BNCs on the POD10A/75 and Phoenix blocks on the POD10A/110. There is also an optional <b>CONTROL</b> port.</p><p class="muted">Hover over the front panel to see what each part does. Click “Next” when you are ready.</p>`, check:()=>true, auto:true },
  { title:'1 · Power it up', body:`<p>Load the cold start and watch the first second. <button data-scn="cold">Load “Power-up from cold”</button></p>
     <p>With the V5 firmware the unit first asks a linked unit for its state (<span class="mono">statusRequest()</span>). It then waits for 500 Timer2 ticks. The comment says 500 ms, but with the 4.9152 MHz crystal it is ≈ 0.57 s. Until then <b>no button is lit and no input is routed</b>.</p><p><b>Goal:</b> put the playhead after start-up, with button 1 lit.</p>`,
    check:()=> D.scenario==='cold' && SIM.t>0.6 && portdAt('A',SIM.t)===0x7F, hint:'Load the scenario, then drag the time slider past 0.6 s.' },
  { title:'2 · Select an input (1-8 mode)', body:`<p>With the slide at the top (<b>1-8</b>), every input goes to <b>both</b> outputs (manual). Press <b>3</b>.</p><p>Watch the timeline. The V5 firmware switches when you <b>let go</b>, not when you press: <span class="mono">getInput()</span> calls <span class="mono">btnRelease()</span>, which waits until all eight buttons are up.</p><p><b>Goal:</b> input 3 on both outputs.</p>`,
    check:()=> finSel()===0xDF && !fin('A.RB1',0), hint:'Click button 3 on the front panel (or press the 3 key).' },
  { title:'3 · Split it: A-B mode', body:`<p>Move the slide down to <b>A-B</b>. Inputs 1–4 (A1–A4) now go to <b>OUTPUT A</b> and inputs 5–8 (B1–B4) to <b>OUTPUT B</b>.</p><p>The slide is on RB0 with interrupt-on-change. The interrupt routine first spins for 10 000 loops (≈114 ms) as a debounce, with every interrupt off. Then <span class="mono">configSwitcher()</span> makes sure each section has one input: B starts on B1 (input 5).</p><p><b>Goal:</b> A-B mode active.</p>`,
    check:()=> fin('A.RB1',0)===1 && fin('A.switchConfig',0)===1, hint:'Click the slide (or press S).' },
  { title:'4 · Pick A2 and B4', body:`<p>In A-B mode the two sections interlock separately. Press <b>2</b> (A2), then <b>8</b> (B4).</p><p><b>Goal:</b> OUTPUT A carries input 2, OUTPUT B carries input 8.</p>`,
    check:()=> finSel()===0xBE && fin('A.RB1',0)===1, hint:()=>`Now: ${selTxt(finSel(), fin('A.RB1',0))}. Press 2, then 8, at different times.` },
  { title:'5 · Back to 1-8', body:`<p>Slide back to <b>1-8</b>. <span class="mono">configSwitcher()</span> keeps the A selection and drops B (<span class="mono">preOutput |= 0x0F</span>). If the only selection was in B, B is kept instead.</p><p><b>Goal:</b> 1-8 mode with input 2 selected.</p>`,
    check:()=> finSel()===0xBF && fin('A.RB1',1)===0, hint:'Click the slide again.' },
  { title:'6 · The remote that shipped (V030200)', body:`<p>The test report of 3 Nov 2014|47 tested a <b>POD10A-110 with remote</b>, both running V030200. That source is not in this folder but in the obsolete POD10 folder. Load it with its remote: <button data-scn="remote">Load “V030200 with a POD10R remote”</button></p>
     <p>The remote is the same board running other firmware. It flashes a chasing pattern until the master answers. Then it asks the master for its state every ≈105 ms (<span class="mono">transmit(CMD, 0xFF)</span>).</p><p><b>Goal:</b> press <b>4</b> on the <i>remote</i> (the small panel on the right) and see the main unit follow.</p>`,
    check:()=> D.fw==='v030200' && D.partner==='r' && finSel()===0xEF, hint:'Load the scenario, put the playhead after 0.6 s (the scripted press of 6 is over) and click button 4 on the remote panel.' },
  { title:'7 · Why V5 could not do this', body:`<p>Now try the same idea with two V5 units. <button data-scn="twin">Load “Two V5 units linked”</button></p>
     <p>V5 answers every command with a status pair <span class="mono">80 xx</span>. The other unit's <span class="mono">uartRx()</span> takes the 0x80 as a new command, so <span class="mono">translateUartRx()</span> decodes <span class="mono">0x80 & 7 = 0</span> → input 8. Each byte received produces a two-byte reply. The link floods, and both units end up on input 8.</p><p><b>Goal:</b> find the moment unit 1 jumps to input 8 (put the playhead after it).</p>`,
    check:()=> D.scenario==='twin' && portdAt('A',SIM.t)===0xFE, hint:'Zoom to 10 ms around 0.3 s (the press is released at 0.3 s) and scrub forward.' },
  { title:'Done', body:`<p>You have used everything an operator can touch on the POD10A. The other tabs show the same events from the inside. <b>Software</b> follows the main loop and the link protocols. <b>One second, frame by frame</b> goes down to single UART bits and AES3 bit cells. <b>Findings</b> lists what the firmware does that the manual doesn't say.</p>`, check:()=>true, auto:true },
];
let lessonIdx = 0;
function viewTutorial(m){
  window.__pod10aKeys = true;
  m._ck = null;
  m.innerHTML = `<div class="grid2">
    <div>${card('Tutorial — operating the POD10A (from the manual and the firmware)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>
      ${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The unit at the playhead', `<div id="fp"></div><div id="ctl"></div><div id="rp" style="margin-top:8px"></div><div id="pt" style="margin-top:8px"></div><div id="lv" class="small mono" style="margin-top:6px"></div>`)}
      ${card('Timeline (1 s)', `<canvas id="tl"></canvas>`)}</div></div>`;
  const hot = `<g><rect x="130" y="56" width="190" height="200" fill="transparent"><title>Power rocker and green power LED</title></rect>
    <rect x="326" y="140" width="64" height="130" fill="transparent"><title>Slide: up = 1-8 (one 8×1 switcher), down = A-B (two 4×1 switchers)</title></rect>
    <rect x="440" y="80" width="1130" height="40" fill="transparent"><title>Buttons 1–8 (1-8 mode): each lights when its input is on the outputs</title></rect>
    <rect x="440" y="200" width="1130" height="80" fill="transparent"><title>A1–A4 → OUTPUT A, B1–B4 → OUTPUT B (A-B mode)</title></rect></g>`;
  const draw = ()=>{
    const t=SIM.t;
    m.querySelector('#fp').innerHTML = frontSVG('A', t, {hot}); m.querySelector('#rp').innerHTML = rearSVG(t);
    bindPanel(m.querySelector('#fp')); bindPanel(m.querySelector('#rp'));
    m.querySelector('#pt').innerHTML = D.partner==='none' ? '' : partnerHTML(t); bindPanel(m.querySelector('#pt')); bindPC(m.querySelector('#pt'));
    const ck = JSON.stringify([D.fw, D.partner, D.build, D.press]); if (ck!==m._ck){ m._ck=ck; m.querySelector('#ctl').innerHTML = controlsHTML(); bindControls(m.querySelector('#ctl')); }
    const ro = routeOf(sv('A.rt',t,-1));
    m.querySelector('#lv').textContent = `OUTPUT A: ${srcTxt(ro.a)} · OUTPUT B: ${srcTxt(ro.b)} · mode ${sv('A.RB1',t,0)?'A-B':'1-8'}`;
    m.querySelector('#trace').innerHTML = traceHTML();
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L = LESSONS[lessonIdx], ok = L.check(); const hint = typeof L.hint==='function' ? L.hint() : L.hint;
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelectorAll('#lesson [data-scn]').forEach(b=>b.onclick=()=>A.scenario(b.dataset.scn));
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ resetAll(); lessonIdx=0; SIM.seek(0); };
    const L2 = lanes(); SIM.drawLanes(m.querySelector('#tl'), L2.filter(l=>/state|buttons|slide|PORTD|OUTPUT|UART/.test(l.label)), {labelW:190});
  };
  SIM.on('time', draw);
}
function resetAll(){ loadScenario('idle'); D.build=75; D.press=C.PRESS; D.inputs.forEach((p,i)=>{ p.on=i<6; p.fs=48000; p.vpp=2; }); D.log=[]; }

/* ---------------- one second, frame by frame ---------------- */
function viewAnatomy(m){
  window.__pod10aKeys = true;
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
  <div class="grid2">
    ${card('As seen by the device (PIC16F887 ports at the playhead)', `<div id="dev"></div>`)}
    ${card('As seen by the displays (button LEDs over the whole second)', `<div id="fp"></div><canvas id="ledstrip"></canvas><p class="small muted">Each row is one button LED (XPT1…XPT8, active low through R20–R27 332 Ω). Lit = that DS75176 receiver is enabled.</p>`)}
  </div>
  ${card('Zoom ladder at the playhead', `<canvas id="zl"></canvas>`)}`;
  const draw = ()=>{
    const t=SIM.t, fs = fsOut(t);
    const rows = [
      ['Crystal X1', '4 915 200', '203.4 ns', 'HS oscillator, 27 pF C25/C26'],
      ['Instruction cycles (Tcy = 4 / Fosc)', '1 228 800', '813.8 ns', 'every PIC16 instruction is 1 Tcy, branches 2'],
      ['Main-loop passes (V5, idle)', Math.round(1/(C.PASS_V5_1*TCY)).toLocaleString(), SIM.fmtDur(C.PASS_V5_1*TCY), 'configSwitcher → outputLed → getInput → processInput, 121 Tcy counted from the hex'],
      ['Writes to PORTD (XPT1–8)', Math.round(1/(C.PASS_V5_1*TCY)).toLocaleString(), SIM.fmtDur(C.PASS_V5_1*TCY), 'outputLed() rewrites the same value every pass'],
      ['Button polls (RA0–RA4, RE0–RE2)', Math.round(8/(C.PASS_V5_1*TCY)).toLocaleString(), '8 per pass', 'getInput(): eight BTFSC tests, 29 Tcy'],
      ['UART bits at 9600 Bd', '9 600', SIM.fmtDur(BIT_T), 'SPBRG = 7, BRGH = 0 → exact with this crystal'],
      ['UART bytes (most the link can carry)', '960', SIM.fmtDur(BYTE_T), '1 start + 8 data + 1 stop'],
      ['V5 messages', '≤ 480', '2 bytes', 'F0 8n / F0 Cn (button), 80 nn (status)'],
      ['V5 Timer2 interrupts (start-up only)', '500 in ≈0.57 s', SIM.fmtDur(C.T2_TICK), 'TMR2 = 0xB2, 1:16 → 1248 Tcy + ISR latency (' + inf + ')'],
      ['V5 slide debounce', '—', SIM.fmtDur(C.DEB), '10 000 × 14 Tcy inside the interrupt'],
      ['POD10R polls (V030200)', '≈ 9.5', SIM.fmtDur(2*C.R_LOOP_TICK), 'reps == 2 of a 52.6 ms Timer2 period'],
      ['AES3 frames on OUTPUT A', fs.toLocaleString(), SIM.fmtDur(1/fs), 'passed through from the selected input'],
      ['AES3 subframes', (2*fs).toLocaleString(), SIM.fmtDur(0.5/fs), 'X/Z = channel 1, Y = channel 2'],
      ['AES3 bit cells (biphase-mark)', (128*fs).toLocaleString(), SIM.fmtDur(1/(128*fs)), `${(128*fs/1e6).toFixed(3)} Mbaud through DS75176 (rated 10 Mb/s)`],
    ];
    m.querySelector('#ladder').innerHTML = `<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">A front-panel press lasts tens of passes and an AES frame is a fifth of a pass. The PIC never sees the audio: it only switches which DS75176 receiver is enabled. Use <b>Step</b> on the transport to move one pass, one UART bit or one AES frame at a time.</p>`;
    const P = portdAt('A',t), rb1 = sv('A.RB1',t,0), on = powerAt('A',t);
    const btn = []; for (let n=0;n<8;n++){ const e=D.events.find(e=>e.type==='btn'&&e.u==='A'&&e.n===n&&t>=e.t&&t<e.t+(e.dur||C.PRESS)); btn.push(e?0:1); }
    const PA = btn.slice(0,5).reduce((a,b,i)=>a|(b<<i),0), PE = btn.slice(5).reduce((a,b,i)=>a|(b<<i),0);
    const PB = (sv('A.slide',t,0)?1:0) | (rb1<<1);
    const txing = emulate().items.find(x=>x.from==='A' && t>=x.start && t<x.end), rxing = emulate().items.find(x=>x.from!=='A' && t>=x.start && t<x.end);
    const bitOf = (x)=>{ if (!x) return 1; const k=Math.floor((t-x.start)/BIT_T); return k===0?0:k>=9?1:(x.b>>(k-1))&1; };
    m.querySelector('#dev').innerHTML = !on ? '<p class="muted">The unit is off.</p>' : `<table class="kv">
      <tr><th>PORTA (RA4…RA0 = PB5…PB1)</th><td class="mono">${bin8(PA|0xE0).slice(3)}b</td></tr>
      <tr><th>PORTE (RE2…RE0 = PB8…PB6)</th><td class="mono">${bin8(PE).slice(5)}b</td></tr>
      <tr><th>PORTB (RB1 SWITCH_SEL, RB0 SWITCH_CONFIG)</th><td class="mono">RB1 ${rb1} · RB0 ${PB&1}</td></tr>
      <tr><th>PORTC (RC7 CPU_RX, RC6 CPU_TX, RC0 TX_RX_EN)</th><td class="mono">RX ${bitOf(rxing)} · TX ${bitOf(txing)} · EN 1 (PORTC = 0x01, never changed)</td></tr>
      <tr><th>PORTD (XPT1 = RD7 … XPT8 = RD0)</th><td class="mono">${bin8(P)}b → ${selTxt(P, rb1)}</td></tr>
      <tr><th>Firmware</th><td class="mono">${PHTXT[phaseAt('A',t)]||phaseAt('A',t)}${sv('A.isr',t,0)?' · in the RB0 interrupt':''}</td></tr></table>`;
    m.querySelector('#fp').innerHTML = frontSVG('A', t, {max:700}); bindPanel(m.querySelector('#fp'));
    const {c,w} = SIM.canvas(m.querySelector('#ledstrip'), 8*14+22); const a = emulate().sig['A.PORTD']||[];
    c.font='10px '+SIM.css('--mono'); for (let n=0;n<8;n++){ c.fillStyle=SIM.css('--ink2'); c.fillText(String(n+1), 4, 14+n*14+8);
      for (let i=0;i<a.length;i++){ const s=Math.max(0,a[i][0]), e=i+1<a.length?a[i+1][0]:1; if (e<=s) continue; const lit = !((a[i][1]>>(7-n))&1) && powerAt('A',(s+e)/2);
        if (lit){ c.fillStyle='#e0303c'; c.fillRect(20+s*(w-26), 14+n*14, Math.max(1,(e-s)*(w-26)), 10); } } }
    c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(20+t*(w-26), 8); c.lineTo(20+t*(w-26), 8*14+20); c.stroke();
    drawLadder(m.querySelector('#zl'), t);
  };
  SIM.on('time', draw);
}
function drawLadder(cv, t){
  const fs = fsOut(t);
  const levels = [['1 second',1],['100 ms (≈ debounce loop)',0.1],['10 ms (≈ 10 UART bytes)',0.01],['1 ms (one byte)',0.001],['100 µs (one pass, one bit)',1e-4],['20 µs (one AES frame)',1/fs]];
  const L = lanes().filter(l=>/PORTD|UART TX|UART RX|OUTPUT A|passes/.test(l.label));
  const H = levels.length*86+10, {c,w} = SIM.canvas(cv, H);
  levels.forEach(([nm,span],i)=>{
    const y=6+i*86, t0=Math.max(0,Math.min(1-span,t-span/2));
    c.fillStyle=SIM.css('--ink'); c.font='12px '+SIM.css('--sans'); c.fillText(nm, 6, y+14);
    const x0=150, pw=w-x0-10, X = tt => x0 + (tt-t0)/span*pw;
    c.strokeStyle=SIM.css('--grid'); c.strokeRect(x0,y,pw,80);
    L.slice(0,5).forEach((l,k)=>{ c.save(); c.beginPath(); c.rect(x0,y+k*16,pw,16); c.clip(); try{ l.draw(c,X,t0,t0+span,y+k*16,16,pw); }catch(e){} c.restore(); });
    c.fillStyle=SIM.css('--ink2'); c.font='9.5px '+SIM.css('--sans'); L.slice(0,5).forEach((l,k)=>c.fillText(l.label.slice(0,24), 6, y+28+k*12));
    const px=X(t); c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+80); c.stroke();
    if (i<levels.length-1){ const ns=levels[i+1][1]; const a=X(Math.max(0,Math.min(1-ns,t-ns/2))); c.fillStyle=SIM.css('--play'); c.globalAlpha=.12; c.fillRect(a,y,Math.max(2,ns/span*pw),80); c.globalAlpha=1; }
  });
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  inA:{x:20,y:20,w:170,h:110,t:'INPUTS 1–4 (A1–A4)',s:['T1–T4 PE-65612/65812','R1–R4 75 Ω or 110 Ω','U1–U4 DS75176 RX'],d:'Each input: BNC (75) or Phoenix (110) → AES pulse transformer → termination resistor → DS75176 RS-485 transceiver used as a line receiver. Its RXEN pin (2) is driven by XPT1–XPT4: low = this receiver drives bus AES1. Sheet 1 “AES In”.'},
  inB:{x:20,y:160,w:170,h:110,t:'INPUTS 5–8 (B1–B4)',s:['T5–T8','R5–R8','U5–U8 DS75176 RX'],d:'The same for inputs 5–8, whose receiver outputs share bus AES2 (sheet 1).'},
  mux:{x:250,y:90,w:170,h:110,t:'U14 74HC4053',s:['SWITCH_SEL (RB1)','1: A ← AES1, B ← AES2','0: one bus to both (' + 'inferred' + ')'],d:'Triple 2-channel analog multiplexer on sheet 2. The schematic text gives only its pins (AX, AY, BX, BY, CX, CY, INH, SWITCH_SEL, R52 1 MΩ). How the channels are wired is inferred from the manual: in 1-8 mode the selected input reaches both outputs, in A-B mode A1–A4 go to A and B1–B4 to B.'},
  out:{x:480,y:90,w:200,h:110,t:'OUTPUTS A / B',s:['U9 / U10 DS75176 TX','T9 / T10 → BNC or Phoenix','“3 Vpp terminated” (manual)'],d:'Drivers U9 and U10 re-square the signal and drive output transformers T9/T10 (sheet 2). Nothing re-clocks the AES3: there is no AES receiver or PLL on the board. A switch is a cut in the bitstream.'},
  mcu:{x:250,y:250,w:170,h:120,t:'U13 PIC16F887',s:['X1 4.9152 MHz','PORTD → XPT1–8','RA0–4, RE0–2 ← PB1–8','RB0 ← SW1, RB1 → SEL'],d:'XC8 1.20 C. V5 = pod10v5.c (1521 words, this folder). It enables exactly one receiver per section on PORTD and sets SWITCH_SEL on RB1. The same XPT lines light the button LEDs.'},
  panel:{x:20,y:300,w:170,h:100,t:'Front panel (POD2-2 board)',s:['8 lit buttons, H1 PB1–8','LEDs on XPT via H2 (332 Ω)','slide SW1, power LED1'],d:'The button board is shared with the POD2 (test reports list “POD2-2 ISS 6”; POD10-POD2-PANEL.PcbDoc). H1 carries PB1–PB8 (332 Ω series, 3 kΩ pull-ups R28–R35), H2 carries XPT1–XPT8 to the LEDs with R20–R27 332 Ω to +5 V.'},
  comm:{x:480,y:250,w:200,h:120,t:'CONTROL link',s:['U11 / U12 DS75176','J1 DE9S (blank plate)','CPU_TX / CPU_RX 9600 Bd','RC0 TX_RX_EN = 1 always'],d:'Two DS75176s with 10 kΩ bias (R36–R39) and 10 Ω series (R43–R46) on sheet 3. One sends, one receives, so the link is full duplex (' + 'inferred' + ' from two transceivers and the constant RC0). Used for the POD10R remote, a slave POD10A or the PC test app. The DE9 pin-out is not in the archive.'},
  psu:{x:250,y:410,w:170,h:70,t:'PSU1 CUI VOF-10-5',s:['100–230 VAC → 5 V 2 A','C27 68 µF'],d:'Open-frame 10 W switcher, new in V030100 (test report 1 Oct 2013|46). One rail: VCC_5V for everything.'},
};
const WIRES = [['inA','mux','AES1 bus'],['inB','mux','AES2 bus'],['mux','out','A, B'],['mcu','inA','XPT1–4 → RXEN'],['mcu','inB','XPT5–8 → RXEN'],['mcu','mux','SWITCH_SEL'],['panel','mcu','PB1–8, SWITCH_CONFIG'],['mcu','panel','XPT → LEDs'],['mcu','comm','CPU_TX/RX'],['psu','mcu','+5 V']];
function viewBlock(m){
  window.__pod10aKeys = false;
  let sel = 'mcu';
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram (click a block) — live at the playhead', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}
    ${card('Signal flow in one sentence', `<p>The <b>PIC</b> never touches the audio. It enables one of eight <b>DS75176 receivers</b> on each bus and sets <b>SWITCH_SEL</b>. The <b>74HC4053</b> sends the buses to the two <b>output drivers</b>, and the same eight lines light the buttons.</p>`)}
    ${card('Compared with the old POD10', `<table class="kv"><tr><th></th><th>POD10 (obsolete, ${Y(1997)}–)</th><th>POD10A ISS3 (${Y(2013)})</th></tr>
      <tr><td>Inputs</td><td>6 (one 6×1)</td><td>8 (8×1 or dual 4×1)</td></tr><tr><td>MCU</td><td>PIC16C73A → PIC16F73, assembly</td><td>PIC16F887, XC8 C</td></tr>
      <tr><td>Video follow</td><td>SPI link to a POD9 (SPI_slave)</td><td>dropped (SPI init commented out)</td></tr><tr><td>Remote</td><td>POD2 remote (pod2r101.asm)</td><td>POD10R / PC app</td></tr>
      <tr><td>UART</td><td colspan="2">SPBRG = 7, 9600 Bd, 0xF0 command prefix in both</td></tr></table>`)}</div></div>`;
  const draw = ()=>{
    const t=SIM.t, ro=routeOf(sv('A.rt',t,-1)), rb1=sv('A.RB1',t,0);
    const ctr = b=>[b.x+b.w/2, b.y+b.h/2];
    let s = `<svg viewBox="0 0 700 500" style="width:100%"><defs><marker id="p10ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    const live = {inA: ro.a>=0&&ro.a<4 || ro.b>=0&&ro.b<4, inB: ro.a>=4 || ro.b>=4};
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a], B_=BLOCKS[b]; let [x1,y1]=ctr(A_), [x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x, dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k, y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot = sel===a||sel===b || (b==='mux' && live[a]);
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#p10ar)"/>`;
      if (l && (sel===a||sel===b)) s += `<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k];
      s += `<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
        <text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+10}" y="${b.y+38+i*15}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    s += `<text x="480" y="225" font-size="11" fill="var(--accent)">A ← ${srcTxt(ro.a)} · B ← ${srcTxt(ro.b)} · SEL ${rb1}</text></svg>`;
    m.querySelector('#bd').innerHTML = s;
    m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b = BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML = `<h3>${b.t}</h3><p>${b.d.replace(/\(inferred\)| inferred /g, m=>m.includes('(')?'('+inf+')':' '+inf+' ')}</p><p class="small muted">Connections: ${WIRES.filter(w=>w[0]===sel||w[1]===sel).map(w=>`${BLOCKS[w[0]].t} → ${BLOCKS[w[1]].t}${w[2]?' ('+w[2]+')':''}`).join('; ')}</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- schematics (redrawn, net-label style) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18, [pin,net]=p; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18, [pin,net]=p; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
function box(x,y,w,h,lines){ return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="var(--ink)"/>`+lines.map((l,i)=>`<text x="${x+w/2}" y="${y+18+i*15}" text-anchor="middle" font-size="11" fill="var(--ink)">${l}</text>`).join(''); }
const SHEETS = [
  { name:'1 · AES IN (×8)', note:'Sheet 1 “POD10-1 AES In” (H:\\Engineering\\RD\\RD75-POD10 Upgrade\\PCB\\POD10-ISS3-S1-AES IN.SchDoc, 26/08/2013). Part pins, references and port names are from the PDF text; which transformer pins go where is drawn generically. The note on the sheet reads “We need a new footprint for this transformer”.', svg:()=>
    `<text x="30" y="80" font-size="12" fill="var(--accent2)">AES1_P</text><text x="30" y="160" font-size="12" fill="var(--accent2)">AES1_N</text>
     <line x1="90" y1="76" x2="150" y2="76" stroke="var(--ink)"/><line x1="90" y1="156" x2="150" y2="156" stroke="var(--ink)"/>
     <path d="M150 76 q14 10 0 20 q14 10 0 20 q14 10 0 20 q14 10 0 20" fill="none" stroke="var(--ink)"/><path d="M176 76 q-14 10 0 20 q-14 10 0 20 q-14 10 0 20 q-14 10 0 20" fill="none" stroke="var(--ink)"/>
     <text x="146" y="66" font-size="11" fill="var(--ink)">T1 AES_Transformer</text><text x="140" y="186" font-size="10" fill="var(--ink2)">PE-65612NL (BOM) / PE-65812NL</text>
     <line x1="176" y1="76" x2="260" y2="76" stroke="var(--ink)"/><line x1="176" y1="156" x2="260" y2="156" stroke="var(--ink)"/>
     <rect x="228" y="96" width="16" height="40" fill="none" stroke="var(--ink)"/><text x="250" y="120" font-size="10" fill="var(--ink2)">R1 110R / 75R</text><line x1="236" y1="76" x2="236" y2="96" stroke="var(--ink)"/><line x1="236" y1="136" x2="236" y2="156" stroke="var(--ink)"/>
     <text x="194" y="210" font-size="10" fill="var(--ink2)">C1, C2 100N/50V</text>`
    + chip(380,60,150,'U1 DS75176',[['6 485+','(T1)'],['7 485−','(T1)'],['2 RXEN','XPT1'],['3 TXEN','GND'],['4 TX','GND']],[['1 RX','AES1 bus'],['8 V+','VCC_5V'],['5 GND','GND']],'RS-485 transceiver used as receiver')
    + `<text x="40" y="296" font-size="12" fill="var(--ink)">The same eight times:</text>`
    + [0,1,2,3,4,5,6,7].map(i=>`<text x="${40+(i>>2)*420}" y="${320+(i%4)*20}" font-size="11" fill="var(--ink)">AES${i+1}_P/N → T${i+1} → U${i+1} · RXEN = <tspan fill="var(--accent2)">XPT${i+1}</tspan> → <tspan fill="var(--accent2)">AES${i<4?1:2}</tspan></text>`).join('')
    + `<text x="40" y="412" font-size="11" fill="var(--ink2)">Receiver outputs are tri-stated when RXEN is high, so four receivers share one bus. Two enabled at once = contention.</text>` },
  { name:'2 · AES OUT + connectors', note:'Sheet 2 “POD10-1 AES Out - Connectors”. U9/U10 DS75176 as drivers, T9/T10, U14 74HC4053M with SWITCH_SEL, R52 1M, R53 DNI, SW1 SW SLIDE SPDT with R11 3K to SWITCH_CONFIG, headers H1 (PB1–PB8, R12–R19 332R, pull-ups R28–R35 3K) and H2 (XPT1–8, R20–R27 332R to VCC_5V), H5 2×3, P1 PAN900 (DNI “Special Build”). The 74HC4053 channel wiring is inferred.', svg:()=>
    chip(320,60,150,'U14 74HC4053M',[['12 AX','AES1 ('+'inferred'+')'],['13 AY','AES2 ('+'inferred'+')'],['2 BX',''],['1 BY',''],['5 CX',''],['3 CY',''],['11/10/9 A B C','SWITCH_SEL'],['6 INH','GND']],[['14 A','→ U9'],['15 B','→ U10'],['4 C',''],['16 VDD','VCC_5V'],['7 VEE / 8 VSS','GND']],'R52 1M pull-down on SWITCH_SEL')
    + chip(650,60,130,'U9 DS75176',[['4 TX','OUT A'],['3 TXEN','VCC_5V']],[['6/7','→ T9 → OUT A'],['R9','110R/75R']],'')
    + chip(650,200,130,'U10 DS75176',[['4 TX','OUT B'],['3 TXEN','VCC_5V']],[['6/7','→ T10 → OUT B'],['R10','110R/75R']],'')
    + box(40,300,250,90,['SW1 SW SLIDE SPDT (E-Switch 500SSP1)','→ R11 3K → SWITCH_CONFIG (RB0)','up = 1-8 → RB0 = 0 · down = A-B → 1 ('+'inferred'+')','manual: top = single'])
    + box(330,330,270,60,['H1 1×12: PB1–PB8 + GND (to POD2-2 buttons)','H2 1×12: XPT1–XPT8 via R20–R27 332R','LED anodes at VCC_5V, cathodes on XPT']) + box(640,330,200,60,['P1 PAN900 (DNI): GPI 1–8 + GND','manual: “GPI Control … option”','wiring to PB1–8 '+'inferred']) },
  { name:'3 · CPU, COMM, POWER', note:'Sheet 3 “POD10-1 CPU - Communication - Power”. PIC16F887 TQFP-44 pin numbers from the PDF text; the port functions are from the init() comments in pod10v5.c. X1 4.9152MHZ with C25/C26 27P. U11/U12 DS75176, R36–R40 10K, R43–R46 10R, R47–R49 30R, J1 DE9S, P2 PAN400, H6 ICSP 2×3, PSU1 VOF-10-5, LED1 GREEN with R51 511R.', svg:()=>
    chip(320,40,200,'U13 PIC16F887-I/PT',[['19 RA0','PB1'],['20 RA1','PB2'],['21 RA2','PB3'],['22 RA3','PB4'],['23 RA4','PB5'],['25 RE0','PB6'],['26 RE1','PB7'],['27 RE2','PB8'],['8 RB0/INT','SWITCH_CONFIG'],['9 RB1','SWITCH_SEL'],['30/31 OSC1/2','X1 4.9152 MHz'],['18 MCLR','H6 ICSP (R50 10K)']],
      [['5 RD7','XPT1'],['4 RD6','XPT2'],['3 RD5','XPT3'],['2 RD4','XPT4'],['41 RD3','XPT5'],['40 RD2','XPT6'],['39 RD1','XPT7'],['38 RD0','XPT8'],['1 RC7/RX','CPU_RX'],['44 RC6/TX','CPU_TX'],['32 RC0','CPU_TX_RX_EN'],['16/17 RB6/7','ICSPCLK/DAT']],'XC8 1.20 · ICD3 · config 0x2007 = 0xEFF2 (V5)')
    + box(40,350,230,70,['U11 / U12 DS75176 (CONTROL)','R36–R39 10K bias, R43–R46 10R','→ J1 DE9S (pin-out '+'inferred'+')']) + box(300,370,240,50,['PSU1 VOF-10-5: AC/L, AC/N → V+ 5 V','C27 68U/10V (C28–C31 DNI “Test”)']) + box(570,370,200,50,['LED1 GREEN (Dialight 551)','R51 511R from VCC_5V']) },
  { name:'4 · REAR PANEL', note:'Sheet 4 “POD10-2 Rear Panel”: BNC1… with P101… 3-pin headers and GNDD, one board for both builds (BOM SA-POD10-TB(75/110)). Connector order from the rear silk and photos: OUTPUT A/B on the left, inputs 1/2, 3/4, 5/6, 7/8 in pairs (top/bottom).', svg:()=>{
    let s=''; const cols=[['A','B'],['1','2'],['3','4'],['5','6'],['7','8']];
    cols.forEach((c,k)=>c.forEach((n,j)=>{ const x=70+k*150, y=80+j*140; s += `<circle cx="${x}" cy="${y}" r="34" fill="none" stroke="var(--ink)" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="10" fill="none" stroke="var(--ink)"/><text x="${x}" y="${y+56}" text-anchor="middle" font-size="12" fill="var(--ink)">${k? 'INPUT '+n+' ('+(+n<5?'A'+n:'B'+(n-4))+')' : 'OUTPUT '+n}</text><text x="${x+40}" y="${y-26}" font-size="10" fill="var(--accent2)">${k?'AES'+n+'_P/N':'AES'+(n==='A'?9:10)+'_P/N'}</text>`; }));
    return s + `<text x="40" y="400" font-size="11" fill="var(--ink2)">/75: BNC shell to GNDD through the transformer secondary. /110: Phoenix + − G (silk legend “BALANCED IOS + − G”). The 110 Ω and 75 Ω builds differ only in R1–R10 (BOM “Only on 110 / 75 Builds”).</text>`; } },
];
function viewSchem(m){
  window.__pod10aKeys = false;
  let i = 0;
  m.innerHTML = card('Schematic set — REDRAWN from the net and part names in POD10-ISS3.pdf, the BOM and the firmware comments (not the Altium drawing)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The original is the Altium project <span class="mono">POD10A - #ENGINEERING #RD75 #ALI/POD10A - #PCB/POD10-ISS3.PrjPcb</span> (4 SchDoc sheets) and its PDF <span class="mono">POD10-ISS3.pdf</span>. These sheets are a reading guide: blue labels are net names, “inferred” marks wiring the text extraction cannot show.</p>`);
  const draw = ()=>{
    m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 900 440" style="width:100%;min-width:680px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="888" height="428" fill="none" stroke="var(--line)"/><text x="884" y="428" text-anchor="end" font-size="10" fill="var(--ink2)">POD10-ISS3 · sheet ${i+1}/4 · redrawn ${Y(2026)}</text>${SHEETS[i].svg().replace(/\(inferred\)|inferred/g,'(inferred)')}</svg>`;
    m.querySelector('#shn').innerHTML = SHEETS[i].note.replace(/is inferred|inferred\.|inferred/g, s=>s.replace('inferred', inf));
  };
  draw();
}

/* ---------------- software diagrams ---------------- */
const FLOW = {
  v5: [
    ['init','init()','ports, 9600 Bd, RCIE, RBIE/IOCB0, TMR2IE','boot'],
    ['req','statusRequest()','TX F0 00; Timer2 1:16/1:16','boot'],
    ['wait','while: ack? count == 500?','≈568 ms (comment: 500 ms)','wait'],
    ['cbo','configByOtherUnit(byte2) / switchConfig = RB0','copy the other unit, or read the slide','wait'],
    ['cfg','configSwitcher()','one input per section','loop'],
    ['led','outputLed(preOutput)','RB1 then PORTD (or PORTD then RB1)','loop'],
    ['get','getInput() → btnRelease()','RA0–RA4, RE0–RE2; waits for release','held'],
    ['proc','processInputSingle/Dual()','new pattern','loop'],
    ['a2','ack == 2: uartTxButton()','TX F0 8n (1-8) / F0 Cn (A-B)','loop'],
    ['a1','ack == 1: uartOption() → translateUartRx()','then uartTransmitStatus(): TX 80 status','loop'],
  ],
  v030100: [['init','init()','ports only, WDT on','boot'],['cfg','clrwdt · configSwitcher()','switchConfig = PORTB & 1','loop'],['led','outputLed()','PORTB |= 0x02 / &= ~0x02','loop'],['get','getInput()','no debounce, no release wait','loop'],['proc','processInputSingle/Dual()','switch on press','loop']],
  v030200: [['init','init()','INTE (RB0 rising edge), GIE','boot'],['rx?','RCIF and a button held?','dummy = RCREG (byte dropped)','loop'],['recv','receive()','F0 + data; F0 FF = status','rxwait'],['echo','PORTD = preOutput; transmit(CMD, preOutput)','every message answered','loop'],['sw','getSwitch()','RB0 unless dataReceived','loop'],['get','getInput() → processInput()','switch on press','loop'],['tx','released: transmit(CMD, preOutput) ×2','tell the remote','loop']],
};
function viewSoft(m){
  window.__pod10aKeys = true;
  m.innerHTML = `<div class="grid2">
    ${card('Main loop — the box lit up is running at the playhead', `<div id="flow"></div>`)}
    <div>${card('V5 ack state machine (live)', `<div id="fsm"></div>`)}${card('Interrupts() (V5)', `<div id="isr"></div>`)}</div></div>
  <div class="grid2">
    ${card('Register map at the playhead (live)', `<div id="reg"></div>`)}
    ${card('Hardware signal path (live)', `<div id="path"></div>`)}
  </div>
  ${card('Link protocols on CONTROL — four dialects in one archive', `<div id="proto"></div>`)}
  ${card('Timing worked out from the crystal and the code', `<div id="tm"></div>`)}`;
  const draw = ()=>{
    const t=SIM.t, ph=phaseAt('A',t), isr=sv('A.isr',t,0), E=emulate();
    const last = E.notes.filter(n=>n.u==='A' && n.t<=t && n.t>t-0.002).slice(-1)[0];
    const F = FLOW[D.fw]; const act = id=>{
      if (ph==='off') return false;
      if (D.fw==='v5'){ if (ph==='boot') return id==='init'||id==='req'; if (ph==='wait') return id==='wait'; if (ph==='held') return id==='get';
        if (last && /uartTxButton|Released/.test(last.txt)) return id==='a2'; if (last && /uartOption|uartTransmitStatus/.test(last.txt)) return id==='a1';
        return ['cfg','led','get','proc'][Math.floor(((t/passT())%1)*4)]===id; }
      if (D.fw==='v030200'){ if (ph==='rxwait') return id==='recv'; if (last && /receive|echo/.test(last.txt)) return id==='echo'||id==='recv'; if (last && /twice/.test(last.txt)) return id==='tx'; return ['sw','get'][Math.floor(((t/passT())%1)*2)]===id; }
      return ph==='boot' ? id==='init' : ['cfg','led','get','proc'][Math.floor(((t/passT())%1)*4)]===id; };
    let s = `<svg viewBox="0 0 520 ${F.length*50+20}" style="width:100%">`;
    F.forEach(([id,a,b],k)=>{ const y=10+k*50, on=act(id);
      s += `<rect x="20" y="${y}" width="480" height="40" rx="7" fill="${on?'color-mix(in srgb, var(--accent) 25%, var(--panel2))':'var(--panel2)'}" stroke="${on?'var(--accent)':'var(--line)'}" stroke-width="${on?2.5:1}"/>
        <text x="32" y="${y+17}" font-size="12.5" font-weight="700" fill="var(--ink)" font-family="var(--mono)">${a}</text><text x="32" y="${y+33}" font-size="10.5" fill="var(--ink2)">${b}</text>`;
      if (k<F.length-1) s += `<line x1="260" y1="${y+40}" x2="260" y2="${y+50}" stroke="var(--ink2)"/>`; });
    s += `</svg><p class="small muted">${FW[D.fw].name}. Which step of a pass is highlighted inside the 98 µs pass is ${inf}; the order is the source's.</p>`;
    m.querySelector('#flow').innerHTML = s;
    const ack = sv('A.ack',t,0);
    m.querySelector('#fsm').innerHTML = D.fw!=='v5' ? '<p class="small muted">Only V5 uses ack. V030200 polls RCIF in main() and has no receive interrupt.</p>' :
      `<svg viewBox="0 0 480 170" style="width:100%">${[[0,'ack = 0','polling buttons',60],[2,'ack = 2','button released',240],[1,'ack = 1','byte2 arrived',420]].map(([v,a,b,x])=>`<circle cx="${x}" cy="70" r="46" fill="${ack===v?'color-mix(in srgb, var(--accent) 30%, var(--panel2))':'var(--panel2)'}" stroke="${ack===v?'var(--accent)':'var(--line)'}" stroke-width="2"/><text x="${x}" y="68" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${a}</text><text x="${x}" y="85" text-anchor="middle" font-size="10" fill="var(--ink2)">${b}</text>`).join('')}
        <path d="M106 60 L194 60" stroke="var(--ink2)" marker-end="url(#p10ar2)"/><path d="M194 82 L106 82" stroke="var(--ink2)" marker-end="url(#p10ar2)"/><path d="M90 30 Q 240 -20 390 30" fill="none" stroke="var(--ink2)" marker-end="url(#p10ar2)"/><path d="M380 110 Q 240 170 100 110" fill="none" stroke="var(--ink2)" marker-end="url(#p10ar2)"/>
        <defs><marker id="p10ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
        <text x="150" y="54" text-anchor="middle" font-size="9.5" fill="var(--ink2)">getInput()</text><text x="150" y="98" text-anchor="middle" font-size="9.5" fill="var(--ink2)">uartTxButton</text><text x="240" y="14" text-anchor="middle" font-size="9.5" fill="var(--ink2)">uartRx(): any byte ≠ F0 (≠ 80 before init)</text><text x="240" y="160" text-anchor="middle" font-size="9.5" fill="var(--ink2)">uartTransmitStatus, ack = 0</text></svg>
        <p class="small">byte1 = <span class="mono">${hex2(sv('A.byte1',t,0))}</span>, byte2 = <span class="mono">${hex2(sv('A.byte2',t,0))}</span>. The missing arrow is the bug: ack = 1 → 2 happens when a byte arrives while a button is held, and the command is lost.</p>`;
    m.querySelector('#isr').innerHTML = `<table class="kv"><tr><th>Flag</th><th>does</th><th>cost</th></tr>
      <tr><td class="mono">RCIF</td><td>uartRx(): store byte1/byte2, ack = 1</td><td class="mono">≈46 words</td></tr>
      <tr><td class="mono">TMR2IF</td><td>count++, TMR2 = 0xB2, T2CON = 0x06 (start-up only)</td><td class="mono">≈1 ms period</td></tr>
      <tr class="${isr?'hl':''}"><td class="mono">RBIF</td><td>for (time = ?; time &lt; 10000; time++) — <i>time</i> is an uninitialised auto · switchConfig = RB0 · configSwitcher · outputLed · uartTxButton</td><td class="mono">${SIM.fmtDur(C.DEB)}</td></tr></table>
      <p class="small muted">Disassembly at 0x2E3–0x2EF of POD10V5.production.hex: MOVLW/ADDWF/BTFSC/MOVLW/ADDWF (16-bit increment), MOVLW 0x27/SUBWF/MOVLW 0x10/BTFSC/SUBWF/BTFSS/GOTO (compare with 10 000) = 14 Tcy per loop. The first entry starts from whatever RAM 0x7A–0x7B holds; later entries start from 0.</p>`;
    const P=portdAt('A',t), rb1=sv('A.RB1',t,0), sl=sv('A.slide',t,0);
    const btns=[]; for (let n=0;n<8;n++) btns.push(D.events.some(e=>e.type==='btn'&&e.u==='A'&&e.n===n&&t>=e.t&&t<e.t+(e.dur||C.PRESS))?0:1);
    const rowB = (nm, bits)=>`<tr><td class="mono">${nm}</td>${bits.map(([l,v])=>`<td class="mono" style="text-align:center;${v===null?'opacity:.35':''}"><div style="font-size:9.5px" class="muted">${l}</div>${v===null?'·':v}</td>`).join('')}</tr>`;
    m.querySelector('#reg').innerHTML = `<table class="kv"><tr><th>port</th>${[7,6,5,4,3,2,1,0].map(b=>`<th style="text-align:center">${b}</th>`).join('')}</tr>
      ${rowB('PORTA',[['OSC1',null],['OSC2',null],['–',null],['PB5',btns[4]],['PB4',btns[3]],['PB3',btns[2]],['PB2',btns[1]],['PB1',btns[0]]])}
      ${rowB('PORTB',[['ICSPDAT',null],['ICSPCLK',null],['–',null],['–',null],['PGM',null],['–',null],['SEL',rb1],['CONFIG',sl]])}
      ${rowB('PORTC',[['RX',null],['TX',null],['SDO',null],['SDI',null],['SCK',null],['–',null],['–',null],['EN',1]])}
      ${rowB('PORTD',[0,1,2,3,4,5,6,7].map(n=>['XPT'+(n+1),(P>>(7-n))&1]))}
      ${rowB('PORTE',[['–',null],['–',null],['–',null],['–',null],['MCLR',null],['PB8',btns[7]],['PB7',btns[6]],['PB6',btns[5]]])}</table>
      <p class="small muted">Bit names from the init() comments (TRISA 0x3F, TRISB 0xCD, TRISC 0x9E, TRISD 0x00, TRISE 0x07). The SPI pins are named but the SPI set-up (SSPCON = 0x25) is commented out.</p>`;
    const ro=routeOf(sv('A.rt',t,-1));
    m.querySelector('#path').innerHTML = `<svg viewBox="0 0 520 250" style="width:100%">${[0,1,2,3,4,5,6,7].map(i=>{ const y=12+i*28, en=!((P>>(7-i))&1) && powerAt('A',t), inp=D.inputs[i];
        return `<text x="6" y="${y+14}" font-size="11" fill="var(--ink)">IN ${i+1}</text><rect x="46" y="${y}" width="40" height="20" fill="none" stroke="var(--ink2)"/><text x="66" y="${y+14}" text-anchor="middle" font-size="9.5" fill="var(--ink2)">T${i+1}</text>
          <rect x="100" y="${y}" width="70" height="20" fill="${en?'color-mix(in srgb, var(--accent) 30%, transparent)':'none'}" stroke="${en?'var(--accent)':'var(--ink2)'}"/><text x="135" y="${y+14}" text-anchor="middle" font-size="9.5" fill="var(--ink)">U${i+1} ${en?'ON':'off'}</text>
          <line x1="170" y1="${y+10}" x2="230" y2="${i<4?70:180}" stroke="${en?'var(--accent)':'var(--line)'}" stroke-width="${en?2.5:1}"/><circle cx="36" cy="${y+10}" r="4" fill="${inp.on?'var(--accent2)':'var(--line)'}"/>`; }).join('')}
      <rect x="230" y="50" width="70" height="40" fill="var(--panel2)" stroke="var(--ink)"/><text x="265" y="74" text-anchor="middle" font-size="11" fill="var(--ink)">AES1</text>
      <rect x="230" y="160" width="70" height="40" fill="var(--panel2)" stroke="var(--ink)"/><text x="265" y="184" text-anchor="middle" font-size="11" fill="var(--ink)">AES2</text>
      <rect x="330" y="90" width="80" height="80" fill="var(--panel2)" stroke="var(--ink)"/><text x="370" y="120" text-anchor="middle" font-size="11" fill="var(--ink)">4053</text><text x="370" y="138" text-anchor="middle" font-size="10" fill="var(--accent2)">SEL ${rb1}</text>
      <line x1="300" y1="70" x2="330" y2="110" stroke="var(--ink2)"/><line x1="300" y1="180" x2="330" y2="150" stroke="var(--ink2)"/>
      <line x1="410" y1="110" x2="440" y2="80" stroke="var(--ink2)"/><line x1="410" y1="150" x2="440" y2="180" stroke="var(--ink2)"/>
      <text x="444" y="84" font-size="11" fill="var(--ink)">A: ${srcTxt(ro.a)}</text><text x="444" y="184" font-size="11" fill="var(--ink)">B: ${srcTxt(ro.b)}</text></svg>
      <p class="small muted">Path per stage: transformer (isolation) → termination ${D.build===110?'110':'75'} Ω → DS75176 receiver (threshold ±200 mV, output tri-state when RXEN high) → shared bus → 74HC4053 (${inf}) → DS75176 driver → transformer. Gains: the signal is re-squared to logic levels, so “gain” is set by the driver and T9/T10 (manual: 3 Vpp terminated; test report: 1 Vpp for 75 Ω, 3–10 Vpp for 110 Ω).</p>`;
    m.querySelector('#proto').innerHTML = `<div class="grid2"><div><h3>V5 (pod10v5.c)</h3><table class="kv"><tr><th>bytes</th><th>meaning</th></tr>
      <tr><td class="mono">F0 00</td><td>statusRequest() at power-up</td></tr><tr><td class="mono">F0 8n</td><td>button n in 1-8 mode (n = 1…7, 0 = input 8)</td></tr><tr><td class="mono">F0 Cn</td><td>button n in A-B mode (BIT6 set)</td></tr>
      <tr><td class="mono">80 0n</td><td>status, 1-8 mode, input n (0 = 8)</td></tr><tr><td class="mono">80 4x</td><td>status, A-B: x = (A−1) + 4·(B−1)</td></tr></table>
      <p class="small">Receive: after start-up the frame byte is F0, so a status reply's leading <b>80</b> lands in byte2 and is decoded as “1-8 mode, input 8”.</p></div>
      <div><h3>V030200 (POD10A + POD10R) and the PC app</h3><table class="kv"><tr><th>bytes</th><th>meaning</th></tr>
      <tr><td class="mono">F0 pp</td><td>pp = the PORTD pattern itself (active low); mode inferred from the nibbles</td></tr><tr><td class="mono">F0 FF</td><td>status request (POD10R polls every ≈105 ms)</td></tr>
      <tr><td class="mono">F0 00</td><td>PC app “Power: On” — to V030200 this means “enable all eight receivers”</td></tr></table>
      <h3>Old POD10 (pd10v103.asm)</h3><p class="small">Also 0xF0 then a data byte; bit 7/6 select audio or POD9 video status (status_check, send_audio). The V5 8n/Cn scheme keeps this bit-7/bit-6 idea; V030200 drops it.</p></div></div>`;
    m.querySelector('#tm').innerHTML = `<table class="kv"><tr><th>Quantity</th><th>From</th><th>Value</th></tr>
      <tr><td>Instruction cycle</td><td>X1 4.9152 MHz / 4</td><td class="mono">813.8 ns</td></tr>
      <tr><td>Baud</td><td>SPBRG = 7, BRGH = 0: Fosc / (64 × 8)</td><td class="mono">9600.0 Bd (0 % error)</td></tr>
      <tr><td>V5 main-loop pass</td><td>disassembly of POD10V5.production.hex, 0x080–0x0B7 + callees</td><td class="mono">121 Tcy = ${SIM.fmtDur(C.PASS_V5_1*TCY)} (A-B: 123)</td></tr>
      <tr><td>V5 first Timer2 interrupt</td><td>T2CON = 0xFF: 256 × 16 × 16</td><td class="mono">${SIM.fmtDur(C.T2_FIRST)}</td></tr>
      <tr><td>V5 later Timer2 interrupts</td><td>TMR2 = 0xB2 → PR2 0xFF = 78 counts × 16</td><td class="mono">1248 Tcy = 1.016 ms + latency</td></tr>
      <tr><td>V5 start-up wait</td><td>count == 500</td><td class="mono">≈ ${((C.T2_FIRST+499*C.T2_TICK)*1000).toFixed(0)} ms</td></tr>
      <tr><td>V5 slide debounce</td><td>10 000 × 14 Tcy</td><td class="mono">${SIM.fmtDur(C.DEB)}</td></tr>
      <tr><td>POD10R chase step / retry</td><td>T2CON = 0x0A, TMR2 = 55: (201 + 256) × 16</td><td class="mono">${SIM.fmtDur(C.R_WAIT_TICK)} × 10 / × 120 = ${SIM.fmtDur(120*C.R_WAIT_TICK)}</td></tr>
      <tr><td>POD10R poll</td><td>T2CON = 0xFF: (201 + 15 × 256) × 16, reps == 2</td><td class="mono">${SIM.fmtDur(2*C.R_LOOP_TICK)}</td></tr>
      <tr><td>Config word 0x2007</td><td>hex files</td><td class="mono">V030100 0xEFFA (WDTE on) · V5 0xEFF2 (WDTE off)</td></tr></table>`;
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__pod10aKeys = false;
  const F = (h, b)=>`<li style="margin-bottom:8px"><b>${h}</b> ${b}</li>`;
  m.innerHTML = card('Findings — what the POD10A and its firmware are up to', `<ol class="small" style="padding-left:18px">
    ${F('The “missing” V030200 source is in the archive.', 'README.md says “V030200 hex files and source are missing”. The source is in <span class="mono">#POD #SERIES/XXX - POD10 - #Master #OBSOLETE/…/POD10 - #SOFTWARE #V030200/POD10A/pod10.c</span> and <span class="mono">…/POD10R/pod10.c</span> (24 Sep 2014). That is the pair the 3 Nov 2014|47 test report ran as POD10A.hex / POD10R.hex. Only their hex files are absent. Deleting the obsolete folder would lose the production firmware.')}
    ${F('V5 is not V030100, and V030100 is not in pod10v5.c.', 'The README infers that pod10v5.c builds V030100. The map files say otherwise. <span class="mono">V030100.production.map</span> lists only <span class="mono">pod10.c</span> (230 words: init, getInput, configSwitcher, outputLed, processInput*), and <span class="mono">POD10V5.production.map</span> lists <span class="mono">pod10v5.c</span> (1344 + 177 words). The V030100 source survives in this folder as the preprocessed <span class="mono">build/…/pod10.pre</span> (20 Feb 2014), and as <span class="mono">pod10.c</span> in the obsolete folder (30 Sep 2013).')}
    ${F('V5 cannot talk to another V5.', 'A V5 unit answers every command with <span class="mono">uartTransmitStatus()</span>: <span class="mono">80 nn</span>. After start-up <span class="mono">uartRx()</span> only treats <span class="mono">F0</span> as a frame byte, so the partner stores <span class="mono">0x80</span> in byte2 with ack = 1. <span class="mono">uartOption()</span> sees <span class="mono">0x80 & 0xC0 = 0x80</span> (“1-8 mode”), and <span class="mono">translateUartRx()</span> maps <span class="mono">0x80 & 7 = 0</span> to <b>input 8</b>. Each received byte produces a two-byte reply, so two linked V5 units flood the link and both settle on input 8. Run scenario “Two V5 units linked”. This was found by emulation; the archive has no test report for V5, which suggests it was an intermediate build.')}
    ${F('Linked units switched on together.', 'Two V5 units powered at the same moment each receive the other\'s <span class="mono">statusRequest()</span> F0 00 while still waiting. Before init, only 0x80 is a frame byte, so F0 lands in byte2 and <span class="mono">configByOtherUnit(0xF0)</span> runs: switchConfig = 1, then <span class="mono">default: return</span>. Both start in A-B mode whatever the slide says. A few milliseconds later the 00 byte triggers a status reply, the reply\'s 80 is decoded as “input 8” (finding 3), and both units end up in 1-8 mode on input 8. Run scenario “Two V5 units linked, both switched on”.')}
    ${F('The slide debounce blocks everything for 114 ms and can kill the link for good.', 'The RBIF branch of <span class="mono">Interrupts()</span> counts an uninitialised <span class="mono">unsigned int time</span> to 10 000 inside the interrupt (14 Tcy per loop in the disassembly = 113.9 ms with GIE off). If a third byte arrives meanwhile, the USART sets OERR. No code ever clears CREN, so the unit never receives again until power-off. Run scenario “Linked V5 units flooding, then the slide is moved”.')}
    ${F('V5 switches on release, and loses remote commands while a button is held.', '<span class="mono">getInput()</span> calls <span class="mono">btnRelease()</span>, which spins until all eight buttons are up. The new input is applied only then. A command received while the button is down sets ack = 1, and then <span class="mono">getInput()</span> overwrites it with ack = 2. V030100 and V030200 switch on press.')}
    ${F('RCEN is not the UART.', 'main() brackets command handling with <span class="mono">RCEN = 0 … RCEN = 1</span>. On the PIC16F887, RCEN is SSPCON2 bit 3 (I²C receive enable). The UART bit is CREN, so reception is never paused.')}
    ${F('Start-up takes 0.57 s, not 500 ms, with everything dark.', 'The first Timer2 period is 1:16 × 1:16 × 256 = 53.3 ms (T2CON = 0xFF in main), and the next 499 are ≈1.03 ms each (TMR2 = 0xB2, 1:16). PORTD stays 0xFF from init(), so no input is routed until then. V030100 and V030200 route on their first pass.')}
    ${F('Two status-table holes.', '<span class="mono">uartTransmitStatus()</span> and <span class="mono">uartTxButton()</span> switch on a byte with no <span class="mono">default</span>. If PORTD holds any other pattern, the uninitialised <span class="mono">temp</span> is sent. Normal operation never reaches this, but the code does not guard against it.')}
    ${F('Leftovers from the old POD10.', 'The commented-out block in init() (<span class="mono">SSPCON = 0x25; spi_tran_count = 0x20; spi_rec_count = 0x04</span>) is a line-by-line copy of the old assembly init in <span class="mono">pd10v103.asm</span>, which drove the SPI audio-follow-video link to a POD9. V030200 still has a commented <span class="mono">video = 0xFF</span> (no semicolon). <span class="mono">mode</span> (MASTER/REMOTE), <span class="mono">rxCount</span>, <span class="mono">input</span> and the <span class="mono">pSwitch</span> test do nothing, and there are no-ops <span class="mono">preOutput = preOutput; switchConfig = switchConfig;</span>. The README says init “sets up SPI (SSPCON = 0x25)”; it does not.')}
    ${F('Watchdog comment.', 'V030100 runs with WDTE = ON and <span class="mono">clrwdt</span> in the loop (config 0xEFFA). V5 sets WDTE = OFF (0xEFF2) but keeps the comment “(WDT enabled)”. V030200 fixed the comment.')}
    ${F('The PC app speaks V030200, not V5.', '“POD10 Remert” (Ward-Beck 2014, VB.NET, Release + ClickOnce publish in <span class="mono">#Software #Remert / #Release</span>) sends F0 followed by the raw PORTD pattern (decompiled: btn1_Click sends 127 = 0x7F). To V5, 0x7F is “status request”, 0xBF is “input 7” and 0xDF is “A-B, B3”. In practice it never gets that far: V5 answers “Power: On” (F0 00, a status request to V5) with 80 01, the app\'s UpdateDisplay() sees neither nibble = F and switches its buttons to A-B mode, and from then on every button sends F0 00 because no radio button matches. Run scenario “V5 + the PC app”. To V5 F0 00 is harmless, but to V030200 it means “enable all eight receivers at once” (all LEDs lit, both buses in contention). In A-B mode, A1 with no B radio checked also sends 0x00. Other quirks: <span class="mono">Write(array, 0, Count − 1)</span> on 3-byte arrays, <span class="mono">ReadBufferSize = 2</span>, and DataReceived discards anything but exactly two waiting bytes.')}
    ${F('V030200 behaviours.', 'The slide uses RB0/INT with the default rising edge, so after any remote command (dataReceived = 1) moving it to 1-8 does nothing until it is moved to A-B again. <span class="mono">receive()</span> waits for the second byte with no timeout. Two V030200 masters would echo every message forever, because each received message is answered; it is only quiet with a POD10R, which does not answer. Bytes arriving while a button is held are discarded (<span class="mono">dummy = RCREG</span>).')}
    ${F('POD10R oddities (for the POD10 plugin).', '<span class="mono">T2CON = 0x0A</span> is commented “POSTSCALER 1:16” but is 1:2. The <span class="mono">excuseMe()</span> interrupt calls <span class="mono">waitForData()</span>, but TMR2IE is never set, so it never runs. A <span class="mono">break</span> inside main\'s <span class="mono">while(1)</span> makes main() return (the remote restarts) if a byte arrives just as a remote button is released.')}
    ${F('Switching is not synchronous.', 'One <span class="mono">MOVWF PORTD</span> disables the old receiver and enables the new one in the same instruction, anywhere in an AES3 frame. Nothing re-clocks the stream (DS75176 line receivers/drivers only), so downstream equipment sees a cut and may mute or re-lock (' + inf + ' consequence). <span class="mono">outputLed()</span> does order the two writes carefully: SWITCH_SEL goes high <i>before</i> PORTD in A-B mode and low <i>after</i> it in 1-8 mode, so the 4053 never briefly routes the wrong bus.')}
    ${F('Version numbers and dates disagree.', 'V030100 (test report 1 Oct 2013|46) is older than V030000 (15 Oct 2013|46, an MPASM port of the 6-input code “as an old version with only 6 inputs”). The V030100 hex in this folder was rebuilt on 20 Feb 2014|47. V5 (11 Mar 2014|47) has no version string or test report.')}
    ${F('Transformer part number.', 'BOM: PE-65612NL for T1–T10. Schematic part numbers: “PE-65812NL/PE-65612NL”. Test report V030100: “surface mount transformers on T1 and T9 (PE-65812)”.')}
    ${F('Panel and file notes.', 'The rear legend “BALANCED IOS + − G” is printed artwork (the Phoenix pin order), not a connector. The photographed units have a blank plate over CONTROL. <span class="mono">POD10-FRONT-SILK(CURVE).pdf</span> in this artwork folder is the old 6-input “POD-10 DIGITAL AUDIO SWITCHER” front (AUG.13/10). The manual offers “GPI Control Connections … (Available as Option)” 1–8 + GND, which matches the DNI 9-pin P1 (“Special Build”); the firmware has no separate GPI code, so GPI must be wired in parallel with the buttons (' + inf + ').')}
    ${F('Manual vs hardware.', 'The manual says inputs are mapped to “both output A and output B simultaneously” in single mode and puts the slide “top = single”. The code agrees: RB0 = 0 → configSwitcher keeps one input; SWITCH_SEL = 0. The 74HC4053 wiring that makes this happen is ' + inf + ' from the manual.')}
  </ol>`)
  + card('Compared with the obsolete POD10 firmware', `<table class="kv"><tr><th></th><th>POD10 V1.03 (pd10v103.asm)</th><th>V030000 (pod10.X, MPASM)</th><th>V030100 (pod10.c)</th><th>V5 (pod10v5.c)</th><th>V030200 (POD10A + POD10R)</th></tr>
    <tr><td>Where</td><td>obsolete</td><td>obsolete</td><td>obsolete + .pre here</td><td>here</td><td>obsolete</td></tr>
    <tr><td>MCU / tool</td><td>PIC16F73 (was 16C73A), MPASM</td><td>PIC16F887, MPASM 5.52</td><td colspan="3">PIC16F887, XC8 1.20, ICD3</td></tr>
    <tr><td>Inputs</td><td>6</td><td>6 on the 8-input board</td><td colspan="3">8, single 8×1 or dual 4×1</td></tr>
    <tr><td>Link</td><td>UART F0 + bit-7/6 commands, SPI to POD9</td><td>“remote and slave work as before”</td><td>none</td><td>F0 8n/Cn, 80 status, statusRequest</td><td>F0 + PORTD pattern, F0 FF poll</td></tr>
    <tr><td>Debounce</td><td>bcount = 0x70 counter</td><td>same</td><td>none</td><td>btnRelease + 114 ms ISR loop</td><td>none (switch on press, send on release)</td></tr>
    <tr><td>Watchdog</td><td>clrwdt</td><td>WDTE on</td><td>WDTE on, clrwdt</td><td>off</td><td>off</td></tr></table>
    <p class="small muted">The obsolete POD10 gets its own plugin (pod10.js), built separately.</p>`)
  + card('Sources', `<ul class="small">
    <li>…/POD10A - #Software #POD10V5/pod10v5.c, funclist, nbproject/configurations.xml (XC8 1.20, ICD3, PIC16F887)</li>
    <li>…/dist/default/production/POD10V5.production.hex/.map/.sym, V030100.production.hex/.map; …/build/default/production/pod10.pre, pod10v5.pre</li>
    <li>…/POD10A - #Software #Remert/Application Files/POD10 Remert_1_0_0_0/POD10 Remert.exe.deploy (decompiled), #Release/POD10 Remert.xml</li>
    <li>xxx-OBSOLETE…/POD10 - #SOFTWARE #V030200/POD10A/pod10.c, POD10R/pod10.c; #V100/pd10v103.asm; #V030000/pod10.X/pod10.asm</li>
    <li>…/POD10A - #PCB/POD10-ISS3.pdf, POD10 MASTER BOM.xlsx, POD10-ISS3-S*.SchDoc sidecars</li>
    <li>…/POD10A - #Manual/POD10A.docx, POD10A MAN.pdf; POD10A - #TESTREPORT/POD10A-V030000-15OCT13.pdf, POD10A-V030100-01OCT13.pdf, POD10A_R-V030200-03NOV14.pdf</li>
    <li>POD10A - #ARTWORK #DA #2016 /POD10A-FRONT&amp;REAR-SILK CURVE).pdf → assets/pod10a-front-green.png, pod10a-front-white.png, pod10a-rear-white.png; Pics/POD10A Front.jpg, POD10A-75 Rear.jpg, POD10A-110 Rear.jpg</li></ul>`);
}

/* ---------------- register plugin ---------------- */
loadScenario('idle');
SIM.register({
  id:'pod10a', name:'POD10A · 8-input AES switcher, 8×1 or dual 4×1 ('+Y(2013)+')', duration:1,
  product:'POD10A', year:2013, family:'POD series',
  folder:'#POD #SERIES/POD10A - #Master',
  summary:'Half-rack AES3 switcher: eight transformer-balanced inputs to two outputs, as one 8×1 or two 4×1 switchers chosen by a front slide. A PIC16F887 enables one DS75176 line receiver per bus and lights the matching button; nothing re-clocks the audio. Three firmware generations are emulated (V030100, V5, V030200) with the CONTROL link to a PC app, a second unit or the POD10R remote.',
  highlights:['Firmware emulated pass by pass (98.5 µs, counted from the hex) with its own variables','Front and rear panel on the real silkscreen, 75 Ω and 110 Ω builds','UART link emulated bit by bit: V5 floods itself, OERR after the 114 ms slide debounce','The 2014 PC test app, decompiled and clickable','8-step operator tutorial'],
  depth:'Full model',
  stepUnits:[
    {label:'1 main-loop pass (≈98.5 µs)', period:()=>passT()},
    {label:'1 UART bit (104.2 µs)', period:()=>BIT_T},
    {label:'1 UART byte (1.042 ms)', period:()=>BYTE_T},
    {label:'1 AES frame', period:()=>1/fsOut(SIM.t)},
    {label:'1 Timer2 tick (≈1.03 ms)', period:()=>C.T2_TICK},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.2,'200 ms (slide debounce)'],[0.02,'20 ms'],[0.005,'5 ms (a few bytes)'],[0.0012,'1.2 ms (one byte, bit level)'],[0.0004,'400 µs (4 passes)'],[0.0001,'100 µs (1 pass)'],[0.00004,'40 µs (2 AES frames)']],
  defaultZoom:0,
  init(){ EMU_KEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the POD10A', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewAnatomy},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
