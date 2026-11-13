/* =====================================================================
   POD21 — 6×1 SDI video switcher with audio-follow-video slave port and RS-485 remote
   (Ward-Beck Systems, firmware v1.01 of 12 Jul 2002|35, POD21R remote r2.00)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all under #POD #SERIES/POD21 - #Master/POD21 - #Engineering/ unless noted):
   - Software/21v101/21v101.asm (959 lines): main, init, init_matrix, input, debounce, router,
       next_output1/2, output_led, switch_check, debounce_rel, recieve_uart, reset_uart,
       translate_uart, spi_uart_setup, transmit_uart, timer_check, SPI_trns_cntrl, SPI_master,
       SPI_rcv_ctrl, video_table, audio_table, INPUT1…INPUT6 macros. Ported pass by pass below.
   - Software/21v101CTV/21v101.asm (CTV custom, May 2007|40: MUTED_INPUT + delay),
     Software/21v101t/21v102.asm (test branch, constant1 = 100), Software/21v100/pod21v100.asm (PIC16C73A)
   - Software/21r200/21r102.asm (POD21R remote r2.00, Tim Clarke's com_timeout) — ported pass by pass
   - #POD #SERIES/POD2 - #Master/…/#v202/pod2v200.asm (SPI_slave, SPI_trns_cntrl, SPI_rcv_ctrl of the
     audio switcher at the other end of the slave port)
   - PCB/pod21iss2.net + .bom (P-CAD, POD21 ISSUE2): every net and pin name in the schematics tab
   - MANUAL/POD21-MANUAL.pdf, pod21.pdf (serial protocol, DB9 pin-out, specs), Pod21manCustom.wpd (12×1)
   - SILK/Pod21silk.cdr (CorelDRAW 10) → Inkscape → assets/pod21-front-white.png, pod21-front-green.png,
     pod21-rear-white.png; MANUAL/POD21MANU.cdr (panel drawings), POD21 - Functional Diagram.cdr
   - ../POD21 - #TESTREPORT/POD21-V101-19MAY10.pdf, POD21R-V200-19MAY10.pdf (scanned, read by eye)
   Anything not in those files is marked "inferred" on screen.
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const Y = y => SIM.year(y);
const hex2 = v => '0x'+(v&255).toString(16).padStart(2,'0').toUpperCase();
const hx = v => (v&255).toString(16).padStart(2,'0').toUpperCase();
const bin8 = v => (v&255).toString(2).padStart(8,'0');

/* ---------------- constants from the source, BOM and netlist ---------------- */
const FOSC = 4.9152e6;                 // X1 4.9152 (pod21iss2.bom, XTAL1)
const TCY = 4/FOSC;                    // 813.8 ns
const BAUD = FOSC/(64*(7+1));          // SPBRG = 0x07, BRGH = 0 → 9600 exactly
const BIT_T = 1/BAUD, BYTE_T = 10*BIT_T;
const C = {
  PASS: 163,            // idle main-loop pass, Tcy — hand-counted from 21v101.asm (see Software tab)
  R_PASS: 138,          // POD21R idle pass, Tcy — hand-counted from 21r102.asm
  T2_FIRST: 65536,      // init: TMR2 = 0, T2CON = 0xFF → 1:16 pre × 1:16 post × 256 (PR2 reset value 0xFF)
  T2_FAST: 4096,        // timer_check: T2CON = 0xFF then T2CKPS1:0 = 00 → 1:1 pre × 1:16 post × 256
  SPI_BYTE: 8,          // SSPCON = SSPEN only → SPI master, clock Fosc/4 → 8 Tcy per byte
  CTV_DELAY: 5140,      // CTV 'delay': 5 × 256 × (clrwdt, decfsz, goto) ≈ 5140 Tcy
  PWRT: 0.072,          // power-up timer — config bits are not in the source: INFERRED
  INIT: 70,             // init + init_matrix, Tcy (counted)
  PRESS: 0.15,          // a mouse click holds a button 150 ms — INFERRED
  P2_DEB: 0.03,         // POD2 debounce + loop latency — INFERRED
  HORIZON: 1,
};
const LEDBIT = [6,0,7,1,3,2];          // input 1…6 → bit of pre_output (video_table / switch_check order)
const AUDIO_TABLE = [0xFE,0xFE,0xFD,0xFB,0xF7,0xEF,0xDF];   // index 0 = nop, falls into 0xFE
const VIDEO_TABLE = [0xBF,0xBF,0xFE,0x7F,0xFD,0xF7,0xFB];
const video_table = w => w>=0 && w<=6 ? VIDEO_TABLE[w] : 7;   // W = 7 hits the trailing "return" → W comes back as 7
const audio_table = w => w>=0 && w<=6 ? AUDIO_TABLE[w] : 7;
function firstSel(p){ const order=[6,0,7,1,3]; for (let k=0;k<5;k++) if (!(p&(1<<order[k]))) return k; return 5; }  // switch_check order
function ledsTxt(p){ const a=[]; for (let k=0;k<6;k++) if (!(p&(1<<LEDBIT[k]))) a.push(k+1); return (a.length?'IN '+a.join('+'):'no input')+(p&0x20?'':' · SLAVE'); }
function audTxt(a){ if (a===undefined||a===null) return '—'; const s=[]; for (let k=0;k<6;k++) if (!(a&(1<<k))) s.push(k+1); return (s.length?'A'+s.join('+'):'none')+((a&0x40)?'':' · SUM'); }
const FW = {
  v101:  {name:'v1.01 · 21v101.asm (released, 12 Jul 2002)', short:'v1.01', reload:0x20, init:0xBF, mix:true,  ctv:false},
  ctv:   {name:'v1.01 CTV · 21v101CTV (15 May 2007, mute before each switch)', short:'v1.01 CTV', reload:0x20, init:0xBF, mix:true, ctv:true},
  v102t: {name:'“21v102” test branch · 21v101t (constant1 = 100)', short:'21v102 test', reload:100, init:0x9F, mix:false, ctv:false},
};
const CTLS = { none:'Nothing on CONTROL', remote:'POD21R remote (r2.00, 21r102.asm)', pc:'PC terminal (9600 8N1)' };
const PORTS = { pod2:'POD2 audio switcher (pod2v200.asm, SPI slave)', none:'Nothing on the slave port' };
const STD = {
  '525': {name:'525/59.94 SDI, 270 Mb/s', field:1001/60000, lines:525, words:1716, sw:[10,273]},
  '625': {name:'625/50 SDI, 270 Mb/s',    field:1/50,       lines:625, words:1728, sw:[6,319]},
};
STD['525'].H = 2*STD['525'].field/525; STD['625'].H = 64e-6;

/* ---------------- scenarios ---------------- */
const SCEN = {
  idle:   {name:'Running on input 1, POD2 + POD21R connected', fw:'v101', ctl:'remote', port:'pod2', init:{on:true, sel:0, slave:false, aud:0}, ev:[]},
  press:  {name:'Press input 3 at 200 ms (held 150 ms)', fw:'v101', ctl:'remote', port:'pod2', init:{on:true, sel:0, slave:false, aud:0}, ev:[{t:0.2, u:'A', type:'btn', n:2, dur:0.15}]},
  afv:    {name:'SLAVE at 100 ms, then input 4 at 450 ms: the POD2 follows', fw:'v101', ctl:'remote', port:'pod2', init:{on:true, sel:0, slave:false, aud:0}, ev:[{t:0.1, u:'A', type:'btn', n:6, dur:0.12},{t:0.45, u:'A', type:'btn', n:3, dur:0.12}]},
  vice:   {name:'Slave on: audio 5 pressed on the POD2 at 150 ms', fw:'v101', ctl:'remote', port:'pod2', init:{on:true, sel:0, slave:true, aud:0}, ev:[{t:0.15, type:'p2btn', n:4}]},
  remote: {name:'POD21R: remote button 6 at 150 ms', fw:'v101', ctl:'remote', port:'pod2', init:{on:true, sel:0, slave:false, aud:0}, ev:[{t:0.15, u:'R', type:'btn', n:5, dur:0.15}]},
  pc:     {name:'PC: F0 00 status, F0 9A (V3 A2), F0 C0 (manual: slave on), F0 C7 (manual: off)', fw:'v101', ctl:'pc', port:'pod2', init:{on:true, sel:0, slave:false, aud:0}, ev:[{t:0.1, type:'pc', bytes:[0xF0,0x00]},{t:0.3, type:'pc', bytes:[0xF0,0x9A]},{t:0.55, type:'pc', bytes:[0xF0,0xC0]},{t:0.75, type:'pc', bytes:[0xF0,0xC7]}]},
  noaud:  {name:'No audio switcher: SLAVE at 100 ms (it drops out)', fw:'v101', ctl:'remote', port:'none', init:{on:true, sel:0, slave:false, aud:0}, ev:[{t:0.1, u:'A', type:'btn', n:6, dur:0.12}]},
  ctv:    {name:'CTV build: press input 2 at 200 ms (4.2 ms mute)', fw:'ctv', ctl:'pc', port:'pod2', init:{on:true, sel:0, slave:false, aud:0}, ev:[{t:0.2, u:'A', type:'btn', n:1, dur:0.12},{t:0.2338, type:'pc', bytes:[0xF0,0x00,0xF0,0x00]}]},
  stray:  {name:'PC sends a lone 0x55 after a status request', fw:'v101', ctl:'pc', port:'pod2', init:{on:true, sel:2, slave:false, aud:2}, ev:[{t:0.1, type:'pc', bytes:[0xF0,0x00]},{t:0.4, type:'pc', bytes:[0x55]}]},
  cold:   {name:'Power-up from cold at 20 ms (the remote keeps polling)', fw:'v101', ctl:'remote', port:'pod2', init:{on:false, sel:0, slave:false, aud:0}, ev:[{t:0.02, u:'A', type:'power', on:true}]},
};

/* ---------------- device state (what the user controls) ---------------- */
const D = {
  scenario:'idle', fw:'v101', ctl:'remote', port:'pod2', std:'525', timing:'sync',
  init:null, events:[], press:C.PRESS, log:[],
  inputs:[0,1,2,3,4,5].map(i=>({on:true, off:[0,0,0,0,0,0][i]})),
};
const ASYNC_OFF = [0, 1.37e-3, 7.91e-3, 12.6e-3, 3.3e-3, 15.02e-3];   // free-running sources: arbitrary phases (INFERRED demo values)
function inOff(k){ return D.timing==='sync' ? 0 : ASYNC_OFF[k]; }
function loadScenario(id){
  const s = SCEN[id]; D.scenario=id; D.fw=s.fw; D.ctl=s.ctl; D.port=s.port;
  D.init = JSON.parse(JSON.stringify(s.init));
  D.events = JSON.parse(JSON.stringify(s.ev)).map(e=>(e.scn=true, e));
  EMU_KEY='';
}

/* =====================================================================
   THE EMULATOR — the POD21 PIC16F874 runs 21v101.asm pass by pass with its own variables;
   the POD21R remote runs 21r102.asm pass by pass; the POD2 answers on SPI as pod2v200.asm does.
   Peripherals: TMR2 (polled), USART with 2-byte RX FIFO and OERR, MSSP SPI master, 74HC165,
   74HC4094, CLC018 crosspoint.
   ===================================================================== */
let EMU=null, EMU_KEY='';
function emulate(){
  const key = JSON.stringify([D.fw, D.ctl, D.port, D.events, D.init]);
  if (key===EMU_KEY && EMU) return EMU;
  EMU_KEY = key;
  const H = C.HORIZON, F = FW[D.fw];
  const sig={}, notes=[], items=[], ticks=[], rticks=[], passT=[], passC=[], pcRx=[];
  const rec=(k,t,v)=>{ const a=sig[k]||(sig[k]=[]); if (a.length){ const l=a[a.length-1]; if (l[1]===v) return; if (t<=l[0]){ l[1]=v; if (a.length>1 && a[a.length-2][1]===v) a.pop(); return; } } a.push([t,v]); };
  const note=(t,u,txt,cls)=>notes.push({t,u,txt,cls:cls||''});
  const ev = [];
  D.events.forEach(e=>{ if (e.type==='p2btn') ev.push(Object.assign({}, e, {type:'p2apply', t:e.t+C.P2_DEB})); else ev.push(e); });
  ev.sort((a,b)=>a.t-b.t);
  const held=(u,t)=>{ const r=[]; for (const e of D.events) if (e.type==='btn' && e.u===u && t>=e.t && t<e.t+(e.dur||C.PRESS)) r.push(e.n); return r; };

  /* ---- the units ---- */
  const A = {on:false, phase:'off', next:Infinity, v:{}, fifo:[], oerr:false, t2due:Infinity, txBusy:0, bf:false, bfAt:0, sspIn:0xFF, rc0:0, why:'', spiWhy:''};
  const R = D.ctl==='remote' ? {on:true, next:Infinity, v:{}, fifo:[], oerr:false, t2due:Infinity, txBusy:0} : null;
  const P2 = D.port==='pod2' ? {sel:0x7F, video:0xFF, sspbuf:0xFF, spi_output:0xFF, alt:false, flag2:false, recCount:4, cmdLeft:0} : null;

  /* ---- RS-485 link (4-wire: U9 drives, U10 receives) ---- */
  const Q=[];
  function uartSend(from, b, t, why){
    const tx = from==='A'? A : from==='R'? R : PCU; const s=Math.max(t, tx.txBusy||0);
    const it={kind:'uart', from, b, start:s, end:s+BYTE_T, why}; tx.txBusy=it.end; items.push(it);
    const to = from==='A' ? (D.ctl==='remote'?'R':D.ctl==='pc'?'PC':null) : 'A';
    if (to) Q.push({t:it.end, to, b, it}); return it; }
  const PCU = {txBusy:0};
  function deliver(upTo){
    Q.sort((a,b)=>a.t-b.t);
    while (Q.length && Q[0].t<=upTo){ const q=Q.shift();
      if (q.to==='PC'){ pcRx.push({t:q.t, b:q.b}); continue; }
      const u = q.to==='A' ? A : R; if (!u || !u.on || u.phase==='boot') continue;
      if (u.oerr){ note(q.t,q.to,`${hex2(q.b)} lost: OERR is set and RCREG has not been read yet`,'warn'); continue; }
      if (u.fifo.length>=2){ u.oerr=true; rec(q.to+'.oerr',q.t,1); note(q.t,q.to,`OVERRUN: ${hex2(q.b)} arrived with 2 bytes already waiting in RCREG → OERR = 1, byte lost`,'warn'); continue; }
      u.fifo.push(q.b); } }

  /* ---- POD2 SPI slave (pod2v200.asm: SPI_slave → SPI_rcv_ctrl → SPI_trns_cntrl) ---- */
  function pod2Exchange(mosi, t){
    const miso = P2.sspbuf; P2.sspbuf = P2.spi_output;
    if (mosi===0xF0) P2.flag2 = true;
    else if (!P2.flag2) P2.recCount = 4;
    else { P2.flag2=false;
      if (mosi&0x80) P2.video = mosi|0x80;
      else { P2.cmdLeft=0; if (--P2.recCount===0){ P2.recCount=4; const o=P2.sel; P2.sel = mosi&0x7F; rec('P2.sel',t,P2.sel);
        if (o!==P2.sel) note(t,'P2',`POD2 SPI_rcv_ctrl: 4th command byte ${hex2(mosi)} → spi_rec_setup sets remote_flag,0 → POD2 switches to ${audTxt(P2.sel)}`,'spi'); } } }
    if (!P2.alt){ P2.spi_output=0xF0; P2.alt=true; }
    else { P2.alt=false; let o = P2.sel|0x80;
      if (P2.cmdLeft>0){ P2.cmdLeft--; o &= 0x7F; if (P2.video&0x40) o |= 0x80; else o &= ~0x40; }
      P2.spi_output = o&255; }
    return miso; }

  /* ================= POD21 main unit (21v101.asm) ================= */
  const setXpt=(t,k,why)=>{ A.xpt=k; rec('A.xpt',t,k); };
  const setRC0=(t,v)=>{ if (A.rc0!==v){ A.rc0=v; rec('A.rc0',t,v); } };
  function a_vars(){ return {output_reg:0xBF, pre_output:0xBF, bcount:0xFE, bounce:0, recieved_reg:0, spi_transmit:0, spi_output:0xFF, spi_recieved:0xFF,
    input_reg:0xFF, spi_reg:0xFF, audio:0xFF, video_reg:0xFF, transmit_reg:0, spi_output_temp:0xFF, spi_tran_count:F.reload, spi_rec_count:8, audio_count:F.reload,
    switch_count:8, switch_out:0, input_flag:0, output_flag:0, rel_flag:0, remote_flag:0, switch_flag:0, transmit_flag:0, uart_flag:0, which_flag:0}; }
  function a_init(t, steady){
    A.v = a_vars(); const V=A.v; A.fifo=[]; A.oerr=false; rec('A.oerr',t,0); A.txBusy=0;
    const pat = steady ? ((0xFF & ~(1<<LEDBIT[steady.sel])) & (steady.slave? ~0x20 : 0xFF)) & 255 : F.init;
    V.output_reg = V.pre_output = pat; V.rel_flag = steady ? 0 : 1; V.output_flag = 0;
    A.leds = pat; rec('A.led', t, pat); V.switch_flag = steady ? 0 : 1;
    setRC0(t, 1);
    if (steady){ V.audio = P2 ? P2.sel : 0xFF; V.switch_out = pat & 0xDF; A.t2due = t + 1.13e-3; V.spi_transmit = 0; A.bf = true; A.bfAt = t; A.sspIn = 0xFF;
      setXpt(t, firstSel(pat)); A.phase='loop'; rec('A.phase',t,'loop'); A.next = t; }
    else { A.t2due = t + C.T2_FIRST*TCY; A.bf=true; A.bfAt=t+30*TCY; A.sspIn = P2 ? pod2Exchange(0xFF,t) : 0xFF;
      setXpt(t+60*TCY, 0);
      note(t,'A','init: ports (TRISA 010000, TRISB 11001000, TRISC 10010000, TRISD 0, TRISE 11100000), SPBRG = 7 → 9600 Bd, CREN, TMR2 = 0 / T2CON = 0xFF, SSPCON = SSPEN (SPI master), SSPBUF = 0xFF, output_reg = 0xBF → output_led (input 1 lit), rel_flag,0 = 1, BSF PORTA,0 “turn on PLL”','boot');
      note(t+60*TCY,'A','init_matrix: RES pulse, OA = 110 (output 6), IA = 000 (input 1), LOAD high, CNFG low-high-low → the CLC018 routes input 1. Then goto main.','boot');
      A.phase='loop'; rec('A.phase',t,'loop'); A.next = t + C.INIT*TCY; }
  }
  function a_input(t){ const V=A.v; let r=0xFF;
    for (const n of held('A',t)){ if (n<6) r &= ~(1<<LEDBIT[n]); else if (n===6 && F.mix){ r &= ~0x20; V.input_flag |= 0x80; } }
    V.input_reg = r&255; rec('A.in',t,V.input_reg); return r===0xFF ? 41 : 42; }
  function a_debounce(t){ const V=A.v; if (V.rel_flag&1) return 4;
    let c=18;
    if (V.input_reg===0xFF) V.bcount=0xFF;
    else { if (V.bcount===0xFE){ V.bounce=V.input_reg; c+=4; } if (V.input_reg!==V.bounce) V.bcount=0xFF; }
    V.bcount=(V.bcount-1)&255;
    if (V.bcount===0){ V.bcount=0xFE; V.rel_flag|=1; V.input_flag|=3; V.spi_tran_count=F.reload; V.remote_flag=0; c+=10;
      note(t,'A',`debounce: input_reg = ${hex2(V.input_reg)} has been the same for 254 passes (bcount 0xFE → 0, ≈${(254*C.PASS*TCY*1000).toFixed(1)} ms) → rel_flag,0 = 1, input_flag,0/1 = 1, spi_tran_count = ${hex2(F.reload)}, remote_flag = 0`,'in'); }
    rec('A.db', t, (V.rel_flag&1) ? 2 : (V.input_reg!==0xFF ? 1 : 0)); return c; }
  function a_router(t){ const V=A.v;
    if (V.input_flag&1){ V.input_flag&=~1; const inr=V.input_reg;
      if (!(V.pre_output&0x20)){ if (V.input_reg&0x20) V.input_reg&=~0x20; else V.input_reg=(V.pre_output|0x20)&255; }
      else { if (!(V.input_reg&0x20)) V.input_reg=V.pre_output&~0x20&255; }
      const wasOn=!(V.pre_output&0x20); V.output_reg=V.pre_output=V.input_reg; V.output_flag|=1;
      note(t,'A',`router: input_flag,0 → next_output${wasOn?'1':'2'}: ${!(inr&0x20) ? 'SLAVE button toggles bit 5 → slave '+(V.pre_output&0x20?'OFF':'ON') : 'video button, bit 5 kept (slave '+(wasOn?'on':'off')+')'} → output_reg = pre_output = ${hex2(V.pre_output)} (${ledsTxt(V.pre_output)})`,'in');
      return 30; }
    if (V.remote_flag&1){ V.remote_flag&=~1; V.output_reg=V.pre_output=V.spi_reg; V.output_flag|=1;
      note(t,'A',`router → next_route0: remote_flag,0 (command from the audio switcher) → output_reg = pre_output = spi_reg = ${hex2(V.spi_reg)} (${ledsTxt(V.spi_reg)})`,'spi'); return 20; }
    if (V.remote_flag&2){ V.output_reg=V.video_reg; V.output_flag|=1; V.remote_flag&=~2;
      note(t,'A',`router → next_route1: remote_flag,1 (RS-485 command) → output_reg = video_reg = ${hex2(V.video_reg)} (${ledsTxt(V.video_reg)})`,'rx'); return 20; }
    return 11; }
  function a_output_led(t){ const V=A.v; if (!(V.output_flag&1)) return 5;
    V.switch_flag|=1; V.output_flag&=~1; V.pre_output=V.output_reg;
    A.leds=V.output_reg; rec('A.led', t+52*TCY, V.output_reg); V.bcount=0xFE; return 60; }
  function a_switch_check(t){ const V=A.v; if (!(V.switch_flag&1)) return 5;
    V.switch_flag=0; V.switch_count=8;
    if ((V.pre_output&0xDF)===V.switch_out) return 14;
    V.switch_out = V.pre_output&0xDF; const k=firstSel(V.pre_output); let c=24;
    if (F.ctv){ setXpt(t+18*TCY, 7); c += C.CTV_DELAY;
      note(t,'A',`switch_check (CTV): MUTED_INPUT → IA = 111 (CLC018 input 7, nothing connected) then “call delay” (5 × 256 loops, ≈${(C.CTV_DELAY*TCY*1000).toFixed(2)} ms) — the main loop is frozen meanwhile`,'xpt'); }
    setXpt(t+(c-4)*TCY, k);
    note(t+(c-4)*TCY,'A',`switch_check: (pre_output & 0xDF) ≠ switch_out → INPUT${k+1} macro: LOAD low, IA2/IA1/IA0 = ${(k>>2)&1}${(k>>1)&1}${k&1} on RB4/RD5/RB2, LOAD high, CNFG pulse → CLC018 routes input ${k+1} to output 6 (OUTPUT BNC)`,'xpt');
    return c; }
  function a_debounce_rel(t){ const V=A.v; if (!(V.rel_flag&1)) return 5;
    if (V.input_reg!==0xFF) V.bcount=0xFF;
    V.bcount=(V.bcount-1)&255;
    if (V.bcount===0){ V.bcount=0xFE; V.rel_flag&=~1; rec('A.db',t,0); return 14; }
    rec('A.db', t, V.input_reg!==0xFF ? 2 : 3); return 10; }
  function a_recieve_uart(t){ const V=A.v; if (!A.fifo.length) return 5;
    let c=12; if (A.oerr){ A.oerr=false; rec('A.oerr',t,0); c+=3; note(t,'A','recieve_uart: OERR set → aerror: BCF/BSF RCSTA,CREN clears it','rx'); }
    V.recieved_reg=A.fifo.shift(); V.transmit_flag|=1; A.newRx=true; return c; }
  function a_reset_uart(t){ return (A.v.transmit_flag&1) ? 16 : 5; }
  function spi_uart_setup(W){ const V=A.v; V.spi_output_temp=W&0x7F; V.spi_output=0xF0; V.remote_flag|=0x0C; }
  function status_check(t, why){ const V=A.v;
    if (V.which_flag&1) return send_audio(t);
    V.which_flag|=1; let r=0xFF;
    for (let k=0;k<6;k++) if (!(V.pre_output&(1<<LEDBIT[k]))) r&=~(1<<k);
    if (!(V.pre_output&0x20)) r&=~0x40;
    V.spi_output|=0x40; V.transmit_reg=((~r)&255)|0x80; A.why='status_check: POD21 status';
    note(t,'A',`${why} → status_check: transmit_reg = ~(video bits) | 0x80 = ${hex2(V.transmit_reg)} = ${bin8(V.transmit_reg)}b (1 = selected, bit 6 = slave), which_flag,0 = 1`,'tx'); return 40; }
  function send_audio(t){ const V=A.v; V.transmit_flag|=1; V.which_flag&=~1; V.transmit_reg=(~V.audio)&0x7F; A.why='send_audio: audio switcher status';
    note(t,'A',`translate_uart → send_audio: transmit_reg = ~audio & 0x7F = ${hex2(V.transmit_reg)} (${V.audio===0xFF?'no audio switcher: 00000000, as the manual says':audTxt(V.audio)})`,'tx'); return 12; }
  function a_translate_uart(t){ const V=A.v;
    if (V.which_flag&1) return send_audio(t);
    if (!(V.transmit_flag&1)) return 7;
    const b=V.recieved_reg;
    if (b===0xF0){ V.uart_flag|=0x80; V.transmit_flag&=~1; note(t,'A','translate_uart: 0xF0 address byte → uart_flag,7 = 1, transmit_flag,0 = 0','rx'); return 14; }
    if (!(V.uart_flag&0x80)){ if (!A.newRx) return 12; A.why='stale transmit_reg (stray byte)'; note(t,'A',`translate_uart: ${hex2(b)} without a preceding 0xF0 → next_check1 returns, but transmit_flag,0 (set by recieve_uart) stays 1 → transmit_uart re-sends the old transmit_reg ${hex2(V.transmit_reg)}`,'warn'); return 12; }
    V.uart_flag&=~0x80; let c=20;
    if (!(b&0x80)){
      if (!(b&0x40)) return c+status_check(t, `command ${hex2(b)} = 00xxxxxx: REQUEST STATUS`);
      const nb=(~b)&255; V.recieved_reg=nb; spi_uart_setup(nb); V.spi_output_temp&=~0x40; V.remote_flag&=~1; V.input_flag=0; V.remote_flag|=2; V.video_reg=(V.pre_output|0x20)&255;
      return c+status_check(t, `command ${hex2(b)} = 01xxxxxx: SUM AUDIO → spi_uart_setup(~byte) with bit 6 cleared (sum), video_reg = pre_output with SLAVE off`); }
    if (b&0x40){ const a=b&7;
      if (a===0){ V.video_reg=(V.pre_output|0x20)&255; V.remote_flag=2; V.input_flag=0; return c+status_check(t, `command ${hex2(b)} → slave_mode → “slave_off”: video_reg = pre_output | 0x20 (the manual says F0 C0 turns the slave indicator ON)`); }
      if (a===7){ V.video_reg=V.pre_output&~0x20&255; V.remote_flag=2; V.input_flag=0; spi_uart_setup(V.audio); V.spi_output_temp|=0x40; return c+status_check(t, `command ${hex2(b)} → slave_mode → “slave_on”: video_reg = pre_output & ~0x20, audio register re-sent on SPI (the manual says F0 C7 turns it OFF)`); }
      V.video_reg=video_table(a)&~0x20&255; V.input_flag=0; V.remote_flag=2; spi_uart_setup(audio_table(a)); V.spi_output_temp|=0x40;
      if (!(V.pre_output&0x20)) return c+status_check(t, `command ${hex2(b)} → slave_mode → not_on (slave already on): video_reg = video_table(${a}) with slave, audio_table(${a}) → SPI`);
      spi_uart_setup(V.audio); V.spi_output_temp|=0x40; V.video_reg=V.pre_output&~0x20&255;
      return c+status_check(t, `command ${hex2(b)} → slave_mode → not_on with SLAVE off: the “;test” lines overwrite both registers — slave is turned on but input ${a} is NOT selected`); }
    if ((b&0x7F)===0){ spi_uart_setup(V.audio); V.spi_output_temp|=0x40; return c+status_check(t, 'command 0x80 → cancel_sum: the current audio register is re-sent on SPI with bit 6 set'); }
    const vv=(b&0x38)>>3, aa=b&7; let why=`command ${hex2(b)} = 10 ${(vv).toString(2).padStart(3,'0')} ${(aa).toString(2).padStart(3,'0')}: SWITCH AUDIO AND VIDEO`;
    if (vv){ V.video_reg=video_table(vv); V.remote_flag|=2; why+=`, video_table(${vv}) = ${hex2(V.video_reg)}${vv===7?' (W = 7 falls through the table)':''} — bit 5 set, so SLAVE goes off`; }
    if (aa){ spi_uart_setup(audio_table(aa)); why+=`, audio_table(${aa}) = ${hex2(audio_table(aa))} → spi_uart_setup`; }
    return c+status_check(t, why); }
  function a_transmit_uart(t){ const V=A.v;
    if (t < A.txBusy) return 7;
    setRC0(t,0);
    if (!(V.transmit_flag&1)) return 13;
    V.transmit_flag&=~1; setRC0(t+3*TCY,1); uartSend('A', V.transmit_reg, t+8*TCY, A.why||'transmit_reg'); return 17; }
  function a_timer_check(t){ const V=A.v; if (t < A.t2due) return 5;
    A.t2due = t + 3*TCY + C.T2_FAST*TCY; V.spi_transmit|=1; ticks.push(t); let c=20;
    V.audio_count=(V.audio_count-1)&255; rec('A.acount',t,V.audio_count);
    if (V.audio_count===0){ V.audio_count=F.reload; V.audio=0xFF; rec('A.audio',t,0xFF); c+=6;
      if (!(V.pre_output&0x20)){ V.pre_output|=0x20; V.output_reg=V.pre_output; V.output_flag|=1; c+=a_output_led(t+c*TCY);
        note(t,'A',`timer_check: audio_count reached 0 — no audio-switcher status for ${F.reload} ticks (${(F.reload*C.T2_FAST*TCY*1000).toFixed(1)} ms) → audio = 0xFF, bsf pre_output,5: SLAVE switched off, output_led`,'warn'); } }
    if (V.switch_flag&1){ V.switch_count=(V.switch_count-1)&255; if (!V.switch_count){ V.switch_flag|=2; V.switch_count=8; } }
    return c; }
  function a_spi_trns(t){ const V=A.v; if (!(V.spi_transmit&1)) return 5;
    if (V.remote_flag&8){ V.spi_output=0xF0; V.remote_flag&=~8; A.spiWhy='relay header (remote_flag,3)'; return 12; }
    if (V.remote_flag&4){ V.spi_output=V.spi_output_temp; V.remote_flag&=~4; V.spi_tran_count=(V.spi_tran_count-1)&255;
      if (V.spi_tran_count) V.remote_flag|=0x0C; else V.spi_tran_count=F.reload; A.spiWhy='relayed RS-485 command (spi_output_temp)'; return 18; }
    if (!(V.spi_transmit&2)){ V.spi_output=0xF0; V.spi_transmit|=2; A.spiWhy='header'; return 14; }
    V.spi_transmit&=~2; V.spi_output=0xFF; let why='status';
    if (V.input_flag&2){ V.spi_tran_count=(V.spi_tran_count-1)&255; if (!V.spi_tran_count){ V.input_flag&=~2; V.spi_tran_count=F.reload; }
      if (V.input_flag&0x80){ if (!(V.input_flag&2)) V.input_flag&=~0x80; V.spi_output=(V.audio|0x40)&0x7F; A.spiWhy='spi_special: SLAVE was pressed → audio register sent back as a command'; return 34; }
      if (!(V.pre_output&0x20)){ V.spi_output&=0x7F; why='command: audio follows video'; } }
    for (let k=0;k<6;k++) if (!(V.pre_output&(1<<LEDBIT[k]))) V.spi_output&=~(1<<k);
    if (!(V.pre_output&0x20)) V.spi_output&=~0x40;
    if (!(V.spi_output&0x80)) V.spi_output|=0x40;
    A.spiWhy=why; return 40; }
  function a_spi_master(t){ const V=A.v; if (!(A.bf && t>=A.bfAt) || !(V.spi_transmit&1)) return 8;
    V.spi_recieved=A.sspIn; const mosi=V.spi_output, s=t+7*TCY;
    const miso = P2 ? pod2Exchange(mosi, s) : 0xFF;
    A.sspIn=miso; A.bf=true; A.bfAt=s+C.SPI_BYTE*TCY;
    items.push({kind:'spi', from:'S', b:mosi, start:s, end:s+C.SPI_BYTE*TCY, why:A.spiWhy}); items.push({kind:'spi', from:'M', b:miso, start:s, end:s+C.SPI_BYTE*TCY});
    return 16; }
  function a_spi_rcv(t){ const V=A.v; if (!(V.spi_transmit&1)) return 5;
    V.spi_transmit&=~1; const b=V.spi_recieved;
    if (b===0xF0 && !(V.spi_transmit&4)){ V.spi_transmit|=4; return 12; }
    if (!(V.spi_transmit&4)){ V.spi_rec_count=7; return 14; }
    V.spi_transmit&=~4; V.audio_count=F.reload; rec('A.acount',t,V.audio_count);
    if (b&0x80){ if (V.audio!==(b&0x7F)) note(t,'A',`SPI_rcv_ctrl: F0 then ${hex2(b)} (bit 7 = 1: status) → audio = ${hex2(b&0x7F)} (${audTxt(b&0x7F)}), audio_count = ${hex2(F.reload)}`,'spi');
      V.audio=b&0x7F; rec('A.audio',t,V.audio); return 20; }
    V.spi_rec_count=(V.spi_rec_count-1)&255;
    if (!V.spi_rec_count){ V.remote_flag|=1; V.spi_rec_count=7;
      note(t,'A',`SPI_rcv_ctrl → no_update: command ${hex2(b)} from the audio switcher, spi_rec_setup counted down to 0 → remote_flag,0 = 1`,'spi'); }
    if (!(V.remote_flag&1)) return 24;
    V.spi_reg=0xFF; if (b===0) return 26;
    for (let k=0;k<6;k++) if (!(b&(1<<k))){ V.spi_reg&=~(1<<LEDBIT[k]); break; }
    if (!(b&0x40)) V.spi_reg&=~0x20;
    V.spi_reg&=255; return 44; }
  const AR = [['main: clrwdt',()=>1],['init_loop',()=>22],['input',a_input],['debounce',a_debounce],['router',a_router],['output_led',a_output_led],['switch_check',a_switch_check],
    ['debounce_rel',a_debounce_rel],['recieve_uart',a_recieve_uart],['reset_uart',a_reset_uart],['translate_uart',a_translate_uart],['transmit_uart',a_transmit_uart],
    ['SPI_trns_cntrl',a_spi_trns],['SPI_master',a_spi_master],['SPI_rcv_ctrl',a_spi_rcv],['timer_check',a_timer_check],['goto main',()=>2]];
  function passA(t){
    deliver(t);
    if (A.phase==='boot'){ a_init(t, null); return; }
    let cyc=0; const cs=[]; A.newRx=false;
    for (const [,fn] of AR){ const c=fn(t+cyc*TCY); cs.push(c); cyc+=c; }
    passT.push(t); passC.push(cs);
    const V=A.v; rec('A.up',t,(V.which_flag&1)?2:(V.uart_flag&0x80)?1:0); rec('A.rf',t,V.remote_flag&0x0F); rec('A.sp',t,V.spi_transmit&6);
    A.next = t + cyc*TCY; }

  /* ================= POD21R remote (21r102.asm, r2.00) ================= */
  function r_vars(){ return {slave_flag:0, bcount:0xFE, bounce:0, rel_flag:0, recieved_reg:0, transmit_flag:0, input_flag:0, input_reg:0xFF, video:0xFE, video_audio:0,
    pre_output_video:0xFE, pre_output_audio:0xFE, audio:0xFE, video_output:0xFE, recieved_flag:0, mode_count:0, sum_flag:0, comout:0, comout1:0, comout2:0, comout3:250, led_reg:0xFF}; }
  function r_leds(t){ const V=R.v; R.leds=V.led_reg; rec('R.led',t,V.led_reg); }
  function r_uart_setup(w){ let tmp=1; for (let b=0;b<6;b++){ if (!(w&(1<<b))) break; tmp++; } return tmp; }
  function passR(t){
    deliver(t); const V=R.v; let c=C.R_PASS;
    // input
    let r=0xFF; for (const n of held('R',t)){ if (n<6) r&=~(1<<n); else if (n===6) r&=~0x40; } V.input_reg=r&255; rec('R.in',t,V.input_reg);
    if (!(V.input_reg&0x40)){ if (V.pre_output_video&0x40) V.slave_flag=2; else { V.slave_flag=1; V.pre_output_audio|=0x40; V.audio|=0x40; } }
    // debounce
    if (!(V.rel_flag&1)){ if (V.input_reg===0xFF) V.bcount=0xFF; else { if (V.bcount===0xFE) V.bounce=V.input_reg; if (V.input_reg!==V.bounce) V.bcount=0xFF; }
      V.bcount=(V.bcount-1)&255; if (!V.bcount){ V.bcount=0xFE; V.rel_flag|=1; V.input_flag|=3; note(t,'R',`POD21R debounce: input_reg = ${hex2(V.input_reg)} stable for 254 passes → input_flag,0/1`,'in'); } }
    // recieve_uart
    if (R.fifo.length){ V.comout|=1; V.comout1&=~2; if (R.oerr){ R.oerr=false; rec('R.oerr',t,0); } V.recieved_reg=R.fifo.shift(); V.recieved_flag|=1; }
    // recie_trans
    if (V.recieved_flag&1){ V.recieved_flag&=~1; const nb=(~V.recieved_reg)&255; V.recieved_reg=nb;
      if (!(nb&0x80)){ V.video=V.pre_output_video=nb; } else { V.audio=nb&0x7F; V.pre_output_audio=nb; } }
    // output_video (output_audio is skipped: video_audio,0 = 0)
    if ((V.input_flag&1) && !(V.video_audio&1)){ V.input_flag&=~1;
      if (!(V.input_reg&0x40)) V.pre_output_audio|=0x40;
      if (!(V.pre_output_video&0x40)){ if (V.input_reg&0x40) V.input_reg&=~0x40; else V.input_reg=(V.pre_output_video|0x40)&255; }
      else { if (!(V.input_reg&0x40)) V.input_reg=V.pre_output_video&~0x40&255; }
      V.pre_output_video=V.video_output=V.input_reg;
      note(t,'R',`POD21R output_video: pre_output_video = video_output = ${hex2(V.input_reg)} (the LEDs do not change until the POD21 answers)`,'in'); }
    // output
    if (!(V.comout1&2)){ V.led_reg=V.video; r_leds(t); }
    // debounce_rel
    if (V.rel_flag&1){ if (V.input_reg!==0xFF) V.bcount=0xFF; V.bcount=(V.bcount-1)&255; if (!V.bcount){ V.bcount=0xFE; V.rel_flag&=~1; V.slave_flag=0; V.sum_flag=0; } }
    // trans_setup
    if (V.transmit_flag&1){
      if (!(V.transmit_flag&0x80)){ V.transmit_flag|=0x80; V.recieved_reg=0xF0; R.why='header'; }
      else { V.transmit_flag&=~0x80;
        if (!(V.input_flag&2)){ V.recieved_reg=0; R.why='check: status request'; }
        else { V.input_flag&=~2; let why='';
          if (V.slave_flag&1){ V.slave_flag=0; V.recieved_reg=0xC7; why='slave_on_stuff'; }
          else if (V.slave_flag&2){ V.slave_flag=0; V.recieved_reg=0xC0; why='slave_off_stuff'; }
          else if (V.sum_flag&1){ V.sum_flag=0; V.recieved_reg=0x80; why='sum_gone'; }
          else if (!(V.pre_output_video&0x40)){ V.recieved_reg=(r_uart_setup(V.video_output)|0xC0)&255; why='slave_mode'; }
          else { let rr=r_uart_setup(V.pre_output_audio); const tmp=(r_uart_setup(V.video_output)<<3)&0x38; if (!(V.pre_output_audio&0x40)) rr=0; V.recieved_reg=((rr+tmp)|0x80)&255; why='video_only (audio field from the last status'+((V.pre_output_audio&0x3F)===0x3F?': none → 7':'')+')'; }
          R.why=why; note(t,'R',`POD21R trans_setup → output_info: input_flag,1 → ${why} → command byte ${hex2(V.recieved_reg)}`,'tx'); } } }
    // transmit_uart
    if ((V.transmit_flag&1) && t>=R.txBusy){ V.transmit_flag&=~1; uartSend('R', V.recieved_reg, t+4*TCY, R.why); }
    // timer_check
    if (t>=R.t2due){ R.t2due=t+C.T2_FIRST*TCY; V.transmit_flag|=1; rticks.push(t); V.mode_count=(V.mode_count-1)&255;
      if (!V.mode_count){ V.video_audio=0; V.mode_count=0x80; V.led_reg=V.video; r_leds(t); } }
    // com_timeout
    V.comout2=(V.comout2+1)&255;
    if (!V.comout2){ V.comout3=(V.comout3+1)&255;
      if (!V.comout3){ V.comout3=250;
        if (V.comout&1){ V.comout1&=~2; V.comout=0; }
        else if (!(V.comout1&1)){ V.led_reg=0xFF; r_leds(t); V.comout1|=3; note(t,'R','POD21R com_timeout: no byte from the switcher in 1536 passes → flash_on (led_reg = 0xFF)','warn'); }
        else { V.led_reg=0; r_leds(t); V.comout1=(V.comout1&~1)|2; note(t,'R','POD21R com_timeout: still nothing → flash_off (led_reg = 0x00)','warn'); } } }
    rec('R.flash',t,(V.comout1&2)?1:0);
    R.next = t + c*TCY; }

  /* ---- start state ---- */
  const I = D.init;
  if (P2){ P2.sel = (0x7F & ~(1<<(I.aud||0)))&0x7F; rec('P2.sel',0,P2.sel); P2.video = I.on ? (0x80 | (0x3F & ~(1<<(I.sel||0))) | (I.slave?0:0x40)) : 0xFF; }
  if (I.on){ A.on=true; rec('A.on',0,1); a_init(0, {sel:I.sel||0, slave:!!I.slave}); }
  else { rec('A.on',0,0); rec('A.led',0,-1); rec('A.xpt',0,-1); rec('A.phase',0,'off'); }
  if (R){ R.v=r_vars(); const st = I.on ? (0x7F & ~(1<<(I.sel||0)) & (I.slave? ~0x40 : 0xFF))&255 : 0x7E; R.v.video=R.v.pre_output_video=R.v.video_output=st;
    R.v.pre_output_audio = P2 && I.on ? (P2.sel|0x80) : 0xFF; R.t2due=0.0171; R.v.transmit_flag=0; R.next=0.00004; R.v.led_reg=st; r_leds(0); }

  /* ---- run ---- */
  let ei=0;
  for (let guard=0; guard<200000; guard++){
    const tn = Math.min(A.next, R? R.next : Infinity), te = ei<ev.length ? ev[ei].t : Infinity;
    if (te<=tn){ if (te>H) break; const e=ev[ei++];
      if (e.type==='power'){ if (e.on && !A.on){ A.on=true; A.phase='boot'; rec('A.on',e.t,1); rec('A.phase',e.t,'boot'); A.next=e.t+C.PWRT+1024/FOSC; note(e.t,'A',`Power on: T1 → bridge → LM2825 5 V; the PIC16F874 is held in reset by the power-up timer (≈72 ms, ${'config bits not archived'}) plus 1024 OST cycles`,'boot'); }
        else if (!e.on && A.on){ A.on=false; A.phase='off'; A.next=Infinity; rec('A.on',e.t,0); rec('A.phase',e.t,'off'); rec('A.led',e.t,-1); rec('A.xpt',e.t,-1); setRC0(e.t,0); note(e.t,'A','Power off','boot'); } }
      else if (e.type==='pc'){ e.bytes.forEach(b=>uartSend('PC', b, e.t, 'PC terminal')); note(e.t,'PC',`PC sends ${e.bytes.map(hx).join(' ')}`,'tx'); }
      else if (e.type==='p2apply' && P2){ if (e.n<6){ P2.sel = (0x40 | (0x3F & ~(1<<e.n)))&0x7F; } else { P2.sel = P2.sel & ~0x40 & 0x7F; } P2.cmdLeft=0x20; rec('P2.sel',e.t,P2.sel);
        note(e.t,'P2',`POD2 front panel: ${e.n<6?'audio '+(e.n+1):'SUM'} → pre_output = ${hex2(P2.sel)}; input_flag,1 → its next 32 SPI data bytes are commands${(P2.video&0x40)?' — but POD21 status says SLAVE is off, so no_output keeps bit 7 set (status only)':''}`,'spi'); }
      continue; }
    if (tn>H) break;
    if (tn===A.next) passA(tn); else passR(tn);
  }
  deliver(H);
  if (P2) rec('P2.sel', H, P2.sel);
  const E = {sig, notes:notes.sort((a,b)=>a.t-b.t), items:items.sort((a,b)=>a.start-b.start), ticks, rticks, passT:Float64Array.from(passT), passC, pcRx};
  EMU = E; return E;
}
function idxAt(a, t){ let lo=0, hi=a.length-1; if (!a.length || a[0][0]>t) return -1; while (lo<hi){ const m=(lo+hi+1)>>1; if (a[m][0]<=t) lo=m; else hi=m-1; } return lo; }
function sv(name, t, def){ const a=emulate().sig[name]; if (!a) return def; const i=idxAt(a,t); return i<0 ? def : a[i][1]; }
function fin(name, def){ return sv(name, C.HORIZON, def); }
function ledAt(t){ return sv('A.led', t, -1); }
function xptAt(t){ return sv('A.xpt', t, -1); }
function powerAt(t){ return !!sv('A.on', t, 0); }
function passAt(t){ const P=emulate().passT; let lo=0, hi=P.length-1; if (!P.length || P[0]>t) return -1; while (lo<hi){ const m=(lo+hi+1)>>1; if (P[m]<=t) lo=m; else hi=m-1; } return lo; }
const ROUT = ['main: clrwdt','init_loop','input','debounce','router','output_led','switch_check','debounce_rel','recieve_uart','reset_uart','translate_uart','transmit_uart','SPI_trns_cntrl','SPI_master','SPI_rcv_ctrl','timer_check','goto main'];
const IDLE = [1,22,41,18,11,5,5,5,5,5,7,13,5,8,5,5,2];
function routineAt(t){ const E=emulate(), i=passAt(t); if (i<0) return null; const cs=E.passC[i]; let off=(t-E.passT[i])/TCY, k=0; for (; k<cs.length; k++){ if (off<cs[k]) break; off-=cs[k]; }
  return {pass:i, k:Math.min(k,cs.length-1), cs, tot:cs.reduce((a,b)=>a+b,0)}; }

/* ---------------- actions (every click is inserted at the playhead; the whole second is re-run) ---------------- */
const WHO = {A:'POD21', R:'POD21R', P2:'POD2', PC:'PC'};
function act(name, fn){
  const tr=[]; const t=SIM.t; fn(s=>tr.push(s)); EMU_KEY=''; const E=emulate();
  E.notes.filter(n=>n.t>=t-1e-9 && n.t<=t+0.6).slice(0,16).forEach(n=>tr.push(`<span class="muted">+${SIM.fmtDur(Math.max(0,n.t-t))} [${WHO[n.u]||n.u}]</span> ${n.txt}`));
  D.log.unshift({t, name, trace:tr}); if (D.log.length>50) D.log.length=50; SIM.refresh(); }
const BNAME = n => n<6 ? 'input '+(n+1) : 'SLAVE';
const ACT = {
  btn(u, n){ const t=SIM.t; act(`${u==='R'?'POD21R ':''}Press ${BNAME(n)} for ${Math.round(D.press*1000)} ms`, tr=>{
    if (u==='A' && !powerAt(t)) tr('The POD21 is off: the button does nothing.');
    if (u==='A') tr(`The button pulls ${n<6?'IN'+(n+1):'IN_MIX'} low (H2, R64–R71, 1K SIP R63 pull-ups) → U14 74HC165 bit ${n<6?['D2','D3','D4','D5','D6','D7'][n]:'D0'}. input reads it every pass: LOAD165 (RC1) low-high, then 8 CLK (RA2) pulses on DATA_IN (RA4).`);
    else { if (D.ctl!=='remote') tr('No POD21R is connected to CONTROL: choose it under CONTROL first.'); tr('The remote reads its buttons straight from PORTA/PORTE (POD2 ISS5 board, test report 19 May 2010).'); }
    D.events.push({t, u, type:'btn', n, dur:D.press, user:true}); }); },
  power(){ const t=SIM.t, on=powerAt(t); act(`Power ${on?'off':'on'}`, tr=>{ tr(on?'PWRSW opens: T1 primary off.':'PWRSW → T1 TE70042 (115/230 V jumpers 110_1, 110_2, 220) → D1–D4 → C45/C46 2200 µF → REG2 LM2825 → +5 V.'); D.events.push({t, u:'A', type:'power', on:!on, user:true}); }); },
  p2(n){ const t=SIM.t; act(`POD2: press ${n<6?'audio '+(n+1):'SUM'}`, tr=>{ if (D.port!=='pod2') tr('No audio switcher on the slave port: choose POD2 first.'); tr(`POD2 front panel (pod2v200.asm, debounce + loop ≈${C.P2_DEB*1000} ms ${inf}).`); D.events.push({t, type:'p2btn', n, user:true}); }); },
  pc(bytes){ const t=SIM.t; act(`PC sends ${bytes.map(hx).join(' ')}`, tr=>{ if (D.ctl!=='pc') tr('The PC is not connected: CONTROL is set to '+CTLS[D.ctl]+'.'); tr('DB9 pins 7 RX+ / 2 RX− (manual) → U10 75176 → RC7/RX. 9600 Bd, 8 data, no parity, 1 stop.'); D.events.push({t, type:'pc', bytes, user:true}); }); },
  scenario(id){ loadScenario(id); D.log.unshift({t:0, name:'Scenario: '+SCEN[id].name, trace:[`Firmware ${FW[D.fw].short}; CONTROL: ${CTLS[D.ctl]}; slave port: ${PORTS[D.port]}. Every unit re-ran from 0 to 1 s.`]}); SIM.seek(0); SIM.refresh(); },
  clear(){ D.events=D.events.filter(e=>!e.user); EMU_KEY=''; D.log.unshift({t:SIM.t, name:'Cleared your actions', trace:['Back to the scenario events only.']}); SIM.refresh(); },
  carry(){ const E=emulate(), V={}; const led=fin('A.led',-1); if (led<0){ return; }
    D.init = {on:true, sel:firstSel(led), slave:!(led&0x20), aud: D.port==='pod2' ? Math.max(0,[0,1,2,3,4,5].find(k=>!(fin('P2.sel',0x7E)&(1<<k)))||0) : 0};
    D.events=[]; EMU_KEY=''; D.log.unshift({t:1, name:'Next second', trace:['The state at 1.000 s becomes the start state; all events cleared. Timer phases restart (simplified).']}); SIM.seek(0); },
  fw(f){ D.fw=f; EMU_KEY=''; D.log.unshift({t:SIM.t, name:'Firmware → '+FW[f].name, trace:[]}); SIM.refresh(); },
  ctl(c){ D.ctl=c; EMU_KEY=''; D.log.unshift({t:SIM.t, name:'CONTROL → '+CTLS[c], trace:['DB9F CONTROL: 3 TX+, 8 TX−, 7 RX+, 2 RX−, 5 GND (manual). U9 drives, U10 receives: a 4-wire full-duplex link.']}); SIM.refresh(); },
  port(p){ D.port=p; EMU_KEY=''; D.log.unshift({t:SIM.t, name:'Slave port → '+PORTS[p], trace:[`P1 (PAN500): SCK RC3 via R37, SDO RC5 via R38, SDI RC4 via R39 (netlist). Its route to the rear panel is ${inf} (spare DB9 pins).`]}); SIM.refresh(); },
  input(k, on){ D.inputs[k].on=on; D.log.unshift({t:SIM.t, name:`Input ${k+1}: ${on?'source connected':'unplugged'}`, trace:[`Signal only: BNC INPUT${k+1} → L/75 Ω → U${k+1} CLC014 adaptive equaliser → CLC018 input ${k}. The PIC never looks at the video.`]}); SIM.refresh(); },
  std(s){ D.std=s; SIM.refresh(); }, timing(x){ D.timing=x; SIM.refresh(); },
};

/* ================================================================
   DRAWING: front and rear panel on the real silkscreen
   ================================================================ */
/* Pod21silk.cdr (CorelDRAW 10, 31 Mar 2006|39) converted with Inkscape. Its three separations sit between corner crop
   marks 617.04 × 115.7 pt (8.57″ × 1.607″, the same face as the POD10A artwork). The PODS logo, the bars and the
   “by Ward-Beck Systems” curves are copied verbatim; the text objects lost their alignment in libcdr and were re-anchored
   on the drawing's own drill crosshairs. Rendered at 200 dpi → 1714 × 321 px, recoloured: front green (52,168,83),
   white (240,240,236). Crosshairs (front): SLAVE (480,160), buttons 1–6 at x = 780 + 150·(n−1), y = 160; LED (300,218);
   panel screws (51,160) (1662,160). Rear (red mechanical layer): BNCs at x = 261 + 150·n, y = 198, Ø 0.45″; CONTROL DB9
   vertical at x = 140 (screws y = 31 / 228); mains box 1359–1607 × 33–249. The rocker position comes from the panel
   drawing in POD21MANU.cdr (no photo of a POD21 is in the archive). */
const ASSET = 'siumulation-plugins/assets/';
const BX = [480,780,930,1080,1230,1380,1530], BY = 160;
const BNC_X = [261,411,561,711,861,1011,1161], BNC_Y = 198;
const SRC_COL = ['#3b82c4','#d0782a','#3aa35b','#b4459a','#c9a227','#4bb3b3','#888','#c33'];
function frontSVG(t, opts){
  opts=opts||{}; const rem=!!opts.remote, uid=rem?'R':'A';
  const on = rem ? D.ctl==='remote' : powerAt(t);
  const P = rem ? sv('R.led',t,0xFF) : ledAt(t);
  const lit = n => on && P>=0 && (rem ? (n<6 ? !((P>>n)&1) : !(P&0x40)) : (n<6 ? !((P>>LEDBIT[n])&1) : !(P&0x20)));
  const pressed = n => D.events.some(e=>e.type==='btn' && e.u===uid && e.n===n && t>=e.t && t<e.t+(e.dur||C.PRESS));
  const cls='p21'+uid;
  const btn = (n)=>{ const x = n===6? BX[0] : BX[n+1], L=lit(n), dn=pressed(n);
    return `<g class="${cls}" data-a="btn" data-n="${n}" style="cursor:pointer"><title>${rem?'POD21R ':''}${n<6?'Input '+(n+1):'SLAVE'} — ${rem?['RA2','RA3','RA4','RE0','RE1','RE2','RA0'][n]+' (21r102.asm input; POD2 ISS5 board)':(n<6?'IN'+(n+1):'IN_MIX')+' → 74HC165; LED on '+(n<6?'XPT'+(n+1):'MIX')+' from the 74HC4094'}${L?' · lit':''}</title>
      <rect x="${x-42}" y="${BY-42}" width="84" height="84" fill="transparent"/>
      <rect x="${x-34}" y="${BY-34}" width="68" height="68" rx="6" fill="#0b0b0c" stroke="#3a3c3f" stroke-width="2"/>
      <rect x="${x-28}" y="${BY-28+(dn?3:0)}" width="56" height="56" rx="5" fill="${dn?'#2a2c2f':'#34363a'}" stroke="#55585c" stroke-width="1.5"/>
      <rect x="${x-17}" y="${BY-8+(dn?3:0)}" width="34" height="14" rx="3" fill="${L?'#ff4d4d':'#3d2224'}" ${L?'filter="url(#p21glow)"':''}/></g>`; };
  return `<svg viewBox="0 0 1714 321" role="img" aria-label="POD21${rem?'R remote':''} front panel" style="width:100%;max-width:${opts.max||980}px;border-radius:8px;display:block">
    <defs><filter id="p21glow" x="-80%" y="-200%" width="260%" height="500%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1714" height="321" rx="8" fill="#1c1d1f"/>
    ${rem ? `<text x="54" y="292" font-size="34" fill="#f0f0ec">POD-21R REMOTE</text><text x="1155" y="93" font-size="34" fill="#f0f0ec" text-anchor="middle">INPUT SELECT</text>
        <text x="480" y="238" font-size="34" fill="#f0f0ec" text-anchor="middle">SLAVE</text>${[1,2,3,4,5,6].map(k=>`<text x="${BX[k]}" y="238" font-size="34" fill="#f0f0ec" text-anchor="middle">${k}</text>`).join('')}
        <text x="1660" y="300" font-size="22" fill="#8a8c8e" text-anchor="end">silk not archived: layout ${'inferred'} from the POD21</text>`
      : `<image href="${ASSET}pod21-front-green.png" width="1714" height="321"/><image href="${ASSET}pod21-front-white.png" width="1714" height="321"/>`}
    ${rem ? '' : `<g class="${cls}" data-a="power" style="cursor:pointer"><title>Power rocker PWRSW (PAN256 header) — position from the POD21MANU.cdr panel drawing (${'inferred'}). Click.</title><rect x="158" y="84" width="70" height="128" rx="6" fill="#0b0b0c" stroke="#3a3c3f" stroke-width="2"/>
      <rect x="166" y="${on?94:150}" width="54" height="52" rx="5" fill="#2a2c2f" stroke="#4a4c50"/><rect x="171" y="${on?98:192}" width="44" height="8" rx="2" fill="#3c3e42"/></g>
      <circle cx="300" cy="218" r="13" fill="#0a0a0a"/><circle cx="300" cy="218" r="9" fill="${on?'#9dff6a':'#26321f'}" ${on?'filter="url(#p21glow)"':''}><title>PWR — GREEN LEDRA2 through R40 2K from the unregulated rail</title></circle>`}
    ${[0,1,2,3,4,5,6].map(btn).join('')}
    ${[51,1662].map(x=>`<circle cx="${x}" cy="160" r="11" fill="#8a8886" stroke="#444" stroke-width="2"/><path d="M${x-6} 160 h12 M${x} 154 v12" stroke="#444" stroke-width="2.5"/>`).join('')}
    ${opts.hot||''}
  </svg>`;
}
function rearSVG(t){
  const x = xptAt(t), on = powerAt(t);
  const bnc = (k)=>{ const cx=BNC_X[k], out=k===6, src=out? x : k, live = out ? (on && x>=0 && x<6 && D.inputs[x].on) : D.inputs[k].on;
    const tip = out ? `OUTPUT — CLC018 output 6 → U11 CLC016 retimer → U12 CLC007 driver → OUT1. Now: ${!on?'unit off':x<0?'—':x===7?'input 7 (mute, nothing connected)':'input '+(x+1)+(D.inputs[x].on?'':' (no source!)')}`
      : `INPUT${k+1} — 75 Ω (manual), U${k+1} CLC014 equaliser → CLC018 input ${k}. ${D.inputs[k].on?'Source connected (click to unplug)':'Nothing connected (click to plug a source in)'}`;
    return `<g ${out?'':`class="p21r" data-j="in${k}" style="cursor:pointer"`}><title>${tip}</title>
      <circle cx="${cx}" cy="${BNC_Y}" r="47" fill="#0f1011"/><circle cx="${cx}" cy="${BNC_Y}" r="40" fill="#b9bcc0" stroke="#6d7175" stroke-width="3"/><circle cx="${cx}" cy="${BNC_Y}" r="26" fill="#d2d4d6"/><circle cx="${cx}" cy="${BNC_Y}" r="9" fill="#d6b45a"/>
      ${(out||D.inputs[k].on)?`<rect x="${cx-24}" y="${BNC_Y-30}" width="48" height="60" rx="9" fill="${out?'#555b63':SRC_COL[k]}" opacity=".95"/><rect x="${cx-14}" y="${BNC_Y+28}" width="28" height="${321-BNC_Y-28}" fill="${out?'#454a51':SRC_COL[k]}" opacity=".85"/>`:''}
      ${out?`<circle cx="${cx+42}" cy="${BNC_Y-44}" r="8" fill="${live?SRC_COL[x]:on?'var(--warn)':'#444'}"/>`:''}</g>`; };
  const ctlTip = `CONTROL DB9F — RS-485: 3 TX+, 8 TX−, 7 RX+, 2 RX−, 5 GND (manual). Now: ${CTLS[D.ctl]}; slave port: ${PORTS[D.port]} (its DB9 pins are ${'inferred'}). Click to change what is on RS-485.`;
  return `<svg viewBox="0 0 1714 321" role="img" aria-label="POD21 rear panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <rect width="1714" height="321" rx="8" fill="#1c1d1f"/>
    <g class="p21r" data-j="ctl" style="cursor:pointer"><title>${ctlTip}</title>
      <circle cx="140" cy="31" r="12" fill="#8f9295" stroke="#55585b" stroke-width="2"/><circle cx="140" cy="228" r="12" fill="#8f9295" stroke="#55585b" stroke-width="2"/>
      <rect x="104" y="52" width="72" height="156" rx="10" fill="#c9cdd2" stroke="#7a7e82" stroke-width="2"/><path d="M118 66 h44 l-6 128 h-32 z" fill="#2a2c2f"/>
      ${[0,1,2,3,4].map(k=>`<circle cx="131" cy="${82+k*24}" r="4.5" fill="#d6b45a"/>`).join('')}${[0,1,2,3].map(k=>`<circle cx="149" cy="${94+k*24}" r="4.5" fill="#d6b45a"/>`).join('')}
      ${D.ctl!=='none'||D.port!=='none'?`<rect x="96" y="58" width="88" height="144" rx="10" fill="#4a4f57" opacity=".9"/><path d="M140 202 q 0 60 ${D.ctl==='pc'?60:-40} 119" stroke="#4a4f57" stroke-width="16" fill="none"/><text x="140" y="136" font-size="15" fill="#dfe2e6" text-anchor="middle">${D.ctl==='remote'?'21R':D.ctl==='pc'?'PC':''}</text><text x="140" y="156" font-size="15" fill="#dfe2e6" text-anchor="middle">${D.port==='pod2'?'POD2':''}</text>`:''}</g>
    ${[0,1,2,3,4,5,6].map(bnc).join('')}
    <g class="p21r" data-j="mains" style="cursor:pointer"><title>Mains: 115 VAC, 1/2 A slow-blow (silk). Fuse holder + inlet drawn from the POD21MANU.cdr rear drawing (${'inferred'}). Click: power.</title>
      <rect x="1359" y="33" width="248" height="216" rx="10" fill="#0b0b0c" stroke="#333" stroke-width="2"/>
      <circle cx="1421" cy="141" r="40" fill="#1a1a1b" stroke="#555" stroke-width="3"/><rect x="1403" y="123" width="36" height="36" rx="4" fill="#2b2b2d"/><path d="M1411 141 h20" stroke="#777" stroke-width="5"/>
      <rect x="1478" y="72" width="108" height="140" rx="12" fill="#050505" stroke="#2a2a2a"/>${[[1508,110],[1556,110],[1532,176]].map(([a,b])=>`<rect x="${a-9}" y="${b-13}" width="18" height="26" fill="#c9cdd2"/>`).join('')}</g>
    ${[51,1662].map(x=>`<circle cx="${x}" cy="161" r="10" fill="#8f9295" stroke="#55585b" stroke-width="2"/><path d="M${x-6} 161 h12 M${x} 155 v12" stroke="#47494c" stroke-width="2"/>`).join('')}
    <image href="${ASSET}pod21-rear-white.png" width="1714" height="321"/>
  </svg>`;
}
function bindPanel(root){
  root.querySelectorAll('[class^="p21A"],[class^="p21R"]').forEach(g=>{ const u=g.getAttribute('class').slice(3);
    g.addEventListener('click', ()=>{ if (g.dataset.a==='power') ACT.power(); else ACT.btn(u, +g.dataset.n); }); });
  root.querySelectorAll('.p21r').forEach(g=> g.addEventListener('click', ()=>{ const j=g.dataset.j;
    if (j==='mains') ACT.power(); else if (j==='ctl'){ const ks=Object.keys(CTLS); ACT.ctl(ks[(ks.indexOf(D.ctl)+1)%ks.length]); }
    else if (j.startsWith('in')){ const k=+j.slice(2); ACT.input(k, !D.inputs[k].on); } }));
}
function pod2HTML(t){
  if (D.port!=='pod2') return '<p class="small muted">No audio switcher on the slave port. SLAVE will light for at most 32 Timer2 ticks (≈107 ms) and then drop: timer_check sees audio_count reach 0.</p>';
  const s = sv('P2.sel', t, 0x7F);
  return `<div style="border:1px solid var(--line);border-radius:6px;background:var(--panel2);padding:8px;max-width:560px">
    <div class="small" style="margin-bottom:6px"><b>POD2 audio switcher</b> (SPI slave, model of pod2v200.asm v2.0x) · now ${audTxt(s)}</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap">${[0,1,2,3,4,5].map(k=>`<button data-p2="${k}" class="${!(s&(1<<k))?'on':''}" style="min-width:44px">A${k+1}</button>`).join('')}<button data-p2="6" class="${!(s&0x40)?'on':''}">SUM</button></div>
    <div class="small muted" style="margin-top:4px">Lit = selected. The POD2 sends commands (bit 7 = 0) only while the POD21 reports SLAVE on.</div></div>`;
}
function pcHTML(t){
  if (D.ctl!=='pc') return '';
  const rx = emulate().pcRx.filter(r=>r.t<=t).slice(-8);
  const cmds = [['Status',[0xF0,0x00]],['V3 + A2',[0xF0,0x9A]],['V1 only',[0xF0,0x88]],['A5 only',[0xF0,0x85]],['Sum A1+A2',[0xF0,0x43]],['Cancel sum',[0xF0,0x80]],['Slave + in 4',[0xF0,0xC4]],['F0 C0',[0xF0,0xC0]],['F0 C7',[0xF0,0xC7]],['stray 55',[0x55]]];
  return `<div style="border:1px solid var(--line);border-radius:6px;background:var(--panel2);padding:8px;max-width:560px">
    <div class="small" style="margin-bottom:6px"><b>PC terminal</b> on CONTROL · 9600 8N1 · the manual's 2-byte commands (address F0 + command)</div>
    <div style="display:flex;gap:4px;flex-wrap:wrap">${cmds.map(([l,b])=>`<button data-pc="${b.join(',')}" title="${b.map(hx).join(' ')}">${l}</button>`).join('')}</div>
    <div style="margin-top:6px" class="small">Hex: <input id="pchex" value="F0 00" size="10" style="font:12px var(--mono)"> <button data-pcx="1">Send</button></div>
    <div class="small mono" style="margin-top:6px">Received (up to the playhead): ${rx.length? rx.map(r=>`<span title="${SIM.fmtT(r.t)}" style="border:1px solid var(--line);padding:0 4px;margin-right:3px">${hx(r.b)}</span>`).join('') : '—'}</div>
    ${rx.length>=2?`<div class="small muted">${decodeResp(rx[rx.length-2].b, rx[rx.length-1].b)}</div>`:''}</div>`;
}
function decodeResp(a,b){ const v=[]; for (let k=0;k<6;k++) if (a&(1<<k)) v.push(k+1); const au=[]; for (let k=0;k<6;k++) if (b&(1<<k)) au.push(k+1);
  return (a&0x80) && !(b&0x80) ? `Last pair as the manual reads it: video ${v.join('+')||'none'}${a&0x40?' · slave on':''} / audio ${au.join('+')||'none'}${b&0x40?' · sum':''}` : 'Last two bytes are not a status pair (bit 7 = 1 then 0).'; }
function bindParts(root){
  root.querySelectorAll('[data-p2]').forEach(b=> b.onclick=()=>ACT.p2(+b.dataset.p2));
  root.querySelectorAll('[data-pc]').forEach(b=> b.onclick=()=>ACT.pc(b.dataset.pc.split(',').map(Number)));
  root.querySelectorAll('[data-pcx]').forEach(b=> b.onclick=()=>{ const v=(root.querySelector('#pchex').value||'').trim().split(/[\s,]+/).map(s=>parseInt(s,16)).filter(n=>n>=0&&n<256); if (v.length) ACT.pc(v); });
}
function controlsHTML(){
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px">
    ${[0,1,2,3,4,5].map(n=>`<button data-b="${n}" title="key ${n+1}">${n+1}</button>`).join('')}<button data-b="6" title="S">SLAVE</button><button data-a="power" title="P">Power</button>
    <label class="small">Hold <select data-a="press">${[0.02,0.05,0.15,0.4].map(v=>`<option value="${v}" ${v===D.press?'selected':''}>${v*1000} ms</option>`).join('')}</select></label>
    <span class="small muted">Keys 1–6, S slave, P power</span></div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px">
    <label class="small">Firmware <select data-a="fw">${Object.keys(FW).map(k=>`<option value="${k}" ${k===D.fw?'selected':''}>${FW[k].name}</option>`).join('')}</select></label>
    <label class="small">CONTROL (RS-485) <select data-a="ctl">${Object.keys(CTLS).map(k=>`<option value="${k}" ${k===D.ctl?'selected':''}>${CTLS[k]}</option>`).join('')}</select></label>
    <label class="small">Slave port (SPI) <select data-a="port">${Object.keys(PORTS).map(k=>`<option value="${k}" ${k===D.port?'selected':''}>${PORTS[k]}</option>`).join('')}</select></label></div>
    <div class="small muted" style="margin-top:4px">Every action is inserted at the playhead and the whole second is re-run. A click holds the button for the “Hold” time (${inf}). Presses shorter than ≈34 ms (254 passes) are ignored by the debounce.</div>`;
}
function bindControls(root){
  root.querySelectorAll('button[data-b]').forEach(b=> b.onclick=()=>ACT.btn('A', +b.dataset.b));
  root.querySelectorAll('button[data-a="power"]').forEach(b=> b.onclick=()=>ACT.power());
  const q=s=>root.querySelector(s);
  if (q('select[data-a="press"]')) q('select[data-a="press"]').onchange=e=>{ D.press=+e.target.value; };
  if (q('select[data-a="fw"]')) q('select[data-a="fw"]').onchange=e=>ACT.fw(e.target.value);
  if (q('select[data-a="ctl"]')) q('select[data-a="ctl"]').onchange=e=>ACT.ctl(e.target.value);
  if (q('select[data-a="port"]')) q('select[data-a="port"]').onchange=e=>ACT.port(e.target.value);
}
function inputsHTML(){
  const x=xptAt(SIM.t);
  return `<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center" class="small">
      <label>Format <select data-v="std">${Object.keys(STD).map(k=>`<option value="${k}" ${k===D.std?'selected':''}>${STD[k].name}</option>`).join('')}</select></label>
      <label>Sources <select data-v="timing"><option value="sync" ${D.timing==='sync'?'selected':''}>all timed to house reference</option><option value="async" ${D.timing==='async'?'selected':''}>free-running (random phases)</option></select></label></div>
    <table class="kv" style="margin-top:6px"><tr><th>Input</th><th>source</th><th>phase vs ref</th><th>on OUTPUT now</th></tr>${D.inputs.map((p,k)=>`<tr><td><span style="display:inline-block;width:10px;height:10px;background:${SRC_COL[k]};border-radius:2px"></span> ${k+1}</td><td><input type="checkbox" data-in="${k}" ${p.on?'checked':''}></td><td class="mono">${SIM.fmtDur(inOff(k))||'0'}</td><td>${x===k?'◀':''}</td></tr>`).join('')}</table>
    <p class="small muted">Manual: 6 inputs and 1 output, 75 Ω, 0.8 Vp-p. The PIC never sees the video: it only writes the CLC018's input address. Timing of the sources is ${inf} (the manual says nothing about a reference input — there is none).</p>`;
}
function bindInputs(root){
  root.querySelectorAll('[data-in]').forEach(el=> el.onchange=()=>ACT.input(+el.dataset.in, el.checked));
  root.querySelectorAll('[data-v]').forEach(el=> el.onchange=()=> ACT[el.dataset.v](el.value));
}
window.__pod21Keys = false;
document.addEventListener('keydown', e=>{
  if (!window.__pod21Keys || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  if (e.ctrlKey||e.metaKey||e.altKey) return;
  const k=e.key.toLowerCase();
  if (k>='1' && k<='6'){ ACT.btn('A', +k-1); e.preventDefault(); }
  else if (k==='s'){ ACT.btn('A', 6); e.preventDefault(); }
  else if (k==='p'){ ACT.power(); e.preventDefault(); }
});

/* ---------------- timeline lanes ---------------- */
function drawSig(c, X, t0, t1, y, h, name, colOf, txtOf){
  const a = emulate().sig[name]||[]; let i=Math.max(0, idxAt(a,t0)); c.font='10.5px '+SIM.css('--sans');
  for (; i<a.length && a[i][0]<=t1; i++){ const s=Math.max(t0,a[i][0]), e=Math.min(t1, i+1<a.length?a[i+1][0]:C.HORIZON); if (e<t0) continue;
    const col=colOf(a[i][1]), xa=X(s), xb=X(e);
    if (col){ c.fillStyle=col; c.fillRect(xa, y+3, Math.max(1,xb-xa), h-6); }
    const tx=txtOf && txtOf(a[i][1]); if (tx && xb-xa > c.measureText(tx).width+8){ c.fillStyle = col ? '#fff' : SIM.css('--ink2'); c.fillText(tx, xa+4, y+h/2+4); } }
}
function drawBytes(c, X, t0, t1, y, h, kind, froms){
  const css=SIM.css, E=emulate();
  for (const it of E.items){ if (it.kind!==kind || froms.indexOf(it.from)<0 || it.end<t0 || it.start>t1) continue;
    const xa=X(it.start), xb=X(it.end), w=xb-xa;
    const col = it.from==='A'||it.from==='S' ? css('--accent2') : it.from==='PC' ? '#8a5cc7' : css('--accent');
    const nb = kind==='uart'? 10 : 8;
    if (w > 16*nb){
      const lv = kind==='uart' ? [0,...[0,1,2,3,4,5,6,7].map(k=>(it.b>>k)&1),1] : [7,6,5,4,3,2,1,0].map(k=>(it.b>>k)&1);
      c.strokeStyle=col; c.lineWidth=1.6; c.beginPath(); c.moveTo(Math.max(X(t0),xa-20), kind==='uart'?y+5:y+h-5); c.lineTo(xa, kind==='uart'?y+5:y+h-5);
      lv.forEach((v,k)=>{ const yy=v?y+5:y+h-5; c.lineTo(xa+w*k/nb, yy); c.lineTo(xa+w*(k+1)/nb, yy); });
      c.lineTo(xb, kind==='uart'?y+5:y+h-5); c.stroke();
      c.fillStyle=css('--ink2'); c.font='10px '+css('--mono');
      lv.forEach((v,k)=>{ const lb = kind==='uart' ? (k===0?'start':k===9?'stop':'D'+(k-1)) : 'b'+(7-k); if (w/nb > c.measureText(lb).width+4) c.fillText(lb, xa+w*k/nb+2, y+h/2+3); });
      c.fillStyle=css('--ink'); c.fillText(hex2(it.b), xa+2, y+10);
    } else { c.fillStyle=col; c.globalAlpha=.85; c.fillRect(xa, y+4, Math.max(1,w-1), h-8); c.globalAlpha=1;
      if (w>20){ c.fillStyle='#fff'; c.font='10.5px '+css('--mono'); c.fillText(hx(it.b), xa+3, y+h/2+4); } } }
}
function tag(c, s, x, y, h){ c.font='11px '+SIM.css('--mono'); const w=c.measureText(s).width; c.fillStyle=SIM.css('--panel'); c.globalAlpha=.9; c.fillRect(x-3,y+3,w+6,h-6); c.globalAlpha=1; c.fillStyle=SIM.css('--ink'); c.fillText(s, x, y+h/2+4); }
function videoPos(k, t){ const S=STD[D.std], fr=2*S.field; let p=(t+inOff(k))%fr; if (p<0) p+=fr; const line=Math.floor(p/S.H)+1; return {line, field: p<S.field?1:2, inLine:(p%S.H)/S.H, S}; }
function cutInfo(t, from, to){ const S=STD[D.std]; if (from<0) return {ok:false, txt:'from power-up'}; if (from>5) return {ok:false, txt:'after the mute: downstream re-locks'};
  const p=videoPos(from,t); const ok = S.sw.indexOf(p.line)>=0; return {ok, line:p.line, field:p.field, txt:`field ${p.field}, line ${p.line}${ok?' — inside the RP168 switching line':' — mid-picture'}`}; }
function lanes(){
  const css=SIM.css, E=emulate(), ls=[], S=STD[D.std];
  ls.push({label:'OUTPUT BNC (CLC018 → CLC016 → CLC007)', h:30, draw(c,X,t0,t1,y,h){
    const a=E.sig['A.xpt']||[]; let i=Math.max(0,idxAt(a,t0));
    for (; i<a.length && a[i][0]<=t1; i++){ const s=Math.max(t0,a[i][0]), e=Math.min(t1, i+1<a.length?a[i+1][0]:C.HORIZON); if (e<t0) continue; const k=a[i][1], xa=X(s), xb=X(e);
      if (k<0){ c.fillStyle=css('--ink2'); c.font='10.5px '+css('--sans'); if (xb-xa>60) c.fillText('unit off', xa+4, y+h/2+4); continue; }
      if (k>5 || !D.inputs[k].on){ c.fillStyle=css('--bad'); c.globalAlpha=.35; c.fillRect(xa,y+3,xb-xa,h-6); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='10.5px '+css('--sans'); if (xb-xa>110) c.fillText(k>5?'input 7: mute (no carrier)':'input '+(k+1)+': no source', xa+4, y+h/2+4); continue; }
      c.fillStyle=SRC_COL[k]; c.globalAlpha=.25; c.fillRect(xa,y+3,xb-xa,h-6); c.globalAlpha=1;
      c.save(); c.beginPath(); c.rect(xa,y,xb-xa,h); c.clip();
      const span=t1-t0;
      if (span < 60*S.H) SIM.pulses(c,X,s,e,y+h*0.5,h*0.5,S.H,-inOff(k),S.H*12/S.words,SRC_COL[k],'EAV/SAV');
      SIM.pulses(c,X,s,e,y,h*(span<60*S.H?0.5:1),S.field,-inOff(k),S.H*(S.sw[0]),SRC_COL[k],'fields (V blank)');
      c.restore();
      if (xb-xa>90){ c.fillStyle=css('--ink'); c.font='10.5px '+css('--sans'); c.fillText('input '+(k+1), xa+4, y+11); }
      if (i>0 && a[i][0]>=t0 && a[i-1][1]>=0){ const ci=cutInfo(a[i][0], a[i-1][1], k); c.fillStyle=ci.ok?css('--accent'):css('--play'); c.fillRect(X(a[i][0])-1,y,3,h); if (xb-xa>180) { c.font='10px '+css('--sans'); c.fillText('cut: '+ci.txt, X(a[i][0])+5, y+h-4); } } } }});
  ls.push({label:'CLC018 IA2..0 (LOAD + CNFG)', h:22, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'A.xpt', v=> v<0?null: v===7?css('--bad'):SRC_COL[v], v=> v<0?'':'IA = '+(v>>2&1)+(v>>1&1)+(v&1)+(v===7?' mute':' → in '+(v+1))); }});
  ls.push({label:`PIC16F874 main loop (${C.PASS} Tcy idle)`, h:24, draw(c,X,t0,t1,y,h){
    const P=E.passT; if (!P.length) return; const pxPer = X(t0+C.PASS*TCY)-X(t0);
    if (pxPer < 3){ for (let i=Math.max(0,passAt(t0)); i<P.length && P[i]<=t1; i++){ /* sparse: mark busy passes */ const cs=E.passC[i]; if (cs.some((v,k)=>v>IDLE[k]+2)){ c.fillStyle=css('--warn'); c.fillRect(X(P[i]),y+3,2,h-6); } }
      c.fillStyle=css('--accent'); c.globalAlpha=.25; c.fillRect(X(Math.max(t0,P[0])),y+h*0.35,X(Math.min(t1,P[P.length-1]))-X(Math.max(t0,P[0])),h*0.3); c.globalAlpha=1;
      tag(c, `≈${Math.round((t1-t0)/(C.PASS*TCY)).toLocaleString()} passes · orange = a pass that did work`, X(t0)+6, y, h); return; }
    for (let i=Math.max(0,passAt(t0)); i<P.length && P[i]<=t1; i++){ const cs=E.passC[i], tot=cs.reduce((a,b)=>a+b,0), busy=cs.some((v,k)=>v>IDLE[k]+2);
      const xa=X(P[i]), xb=X(P[i]+tot*TCY); c.fillStyle=busy?css('--warn'):css('--accent'); c.globalAlpha=.75; c.fillRect(xa, y+4, Math.max(1,xb-xa-1), h-8); c.globalAlpha=1;
      if (xb-xa>200){ let o=0; c.font='9.5px '+css('--mono'); cs.forEach((v,k)=>{ const xx=X(P[i]+o*TCY), ww=v*TCY/(t1-t0)*(X(t1)-X(t0)); if (ww>c.measureText(ROUT[k]).width+4){ c.fillStyle='#fff'; c.fillText(ROUT[k], xx+2, y+h/2+3); } c.strokeStyle='rgba(255,255,255,.5)'; c.beginPath(); c.moveTo(xx,y+4); c.lineTo(xx,y+h-4); c.stroke(); o+=v; }); } } }});
  ls.push({label:'Buttons → 74HC165 → input_reg', h:22, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'A.in', v=> v===0xFF?null:css('--accent2'), v=> v===0xFF?'':'input_reg = '+hex2(v)+' ('+(v&0x20?'':'SLAVE ')+ledsTxt(v|0x20).replace(' · SLAVE','')+')'); }});
  ls.push({label:'debounce / debounce_rel (254 passes)', h:22, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'A.db', v=> v===1?css('--warn'):v===2?css('--accent2'):v===3?css('--ink2'):null, v=> ['','counting: bcount 0xFE → 0','rel_flag,0: waiting for release','release: bcount counting'][v]||''); }});
  ls.push({label:'74HC4094 → button LEDs (output_led)', h:24, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'A.led', v=> v<0?null:(v&0x20?css('--accent'):'#c0392b'), v=> v<0?'':hex2(v)+' '+ledsTxt(v)); }});
  ls.push({label:'TMR2 polls → spi_transmit,0', h:18, draw(c,X,t0,t1,y,h){ c.fillStyle=css('--ink2'); const T=E.ticks; let n=0; for (const tk of T){ if (tk<t0||tk>t1) continue; n++; c.fillRect(X(tk),y+3,1.5,h-6); }
    if (n>80) tag(c, `${n} ticks (every ${SIM.fmtDur(C.T2_FAST*TCY)}; first one ${SIM.fmtDur(C.T2_FIRST*TCY)} after init)`, X(t0)+6, y, h); }});
  ls.push({label:'SPI MOSI: SDO → POD2 (1.23 MHz)', h:24, draw(c,X,t0,t1,y,h){ drawBytes(c,X,t0,t1,y,h,'spi',['S']); }});
  ls.push({label:'SPI MISO: POD2 → SDI', h:24, draw(c,X,t0,t1,y,h){ drawBytes(c,X,t0,t1,y,h,'spi',['M']); }});
  ls.push({label:'audio_count · audio (slave watchdog)', h:20, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'A.audio', v=> v===0xFF?'rgba(200,120,40,.35)':null, v=> v===0xFF?'audio = 0xFF (no audio switcher)':'audio = '+hex2(v)+' '+audTxt(v));
    const a=E.sig['A.acount']||[]; c.fillStyle=css('--warn'); for (const [tt,v] of a){ if (tt<t0||tt>t1) continue; const hh=(v/FW[D.fw].reload)*(h-6); c.fillRect(X(tt),y+h-3-hh,1.2,hh); } }});
  ls.push({label:'RS-485 RX: U10 → RC7', h:26, draw(c,X,t0,t1,y,h){ drawBytes(c,X,t0,t1,y,h,'uart',['R','PC']); drawSig(c,X,t0,t1,y,h,'A.oerr', v=> v?'rgba(200,40,30,.25)':null, v=> v?'OERR':''); }});
  ls.push({label:'RS-485 TX: RC6 → U9 (RC0 = DE)', h:26, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'A.rc0', v=> v?'rgba(90,169,230,.18)':null, ()=>''); drawBytes(c,X,t0,t1,y,h,'uart',['A']); }});
  if (D.ctl==='remote') ls.push({label:'POD21R: LEDs (PORTD) · com_timeout', h:24, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'R.led', v=> v===0xFF||v===0?css('--warn'):null, v=> v===0xFF?'all off (flash_on)':v===0?'all on (flash_off)':hex2(v)+' '+ledsTxt(((v&0x3F)===0x3F?0xFF:[0,1,2,3,4,5].reduce((p,k)=>(v&(1<<k))?p:p&~(1<<LEDBIT[k]),0xFF)) & ((v&0x40)?0xFF:~0x20))); }});
  if (D.port==='pod2') ls.push({label:'POD2 audio selection', h:22, draw(c,X,t0,t1,y,h){ drawSig(c,X,t0,t1,y,h,'P2.sel', ()=>'rgba(76,195,138,.35)', v=> audTxt(v)); }});
  return ls;
}

/* ---------------- scopes ---------------- */
function drawSDI(cv, el, t){
  const {c,w}=SIM.canvas(cv,150), css=SIM.css, k=xptAt(t), S=STD[D.std];
  if (k<0 || !powerAt(t)){ c.fillStyle=css('--ink2'); c.font='13px '+css('--sans'); c.fillText('Unit off: no output.',12,70); el.innerHTML=''; return; }
  if (k>5 || !D.inputs[k].on){ c.fillStyle=css('--ink2'); c.font='13px '+css('--sans'); c.fillText(k>5?'CLC018 input 7 (CTV mute): no carrier — the CLC016 drops CD and a downstream SD404 loses lock.':'Input '+(k+1)+' has no source: the CLC014 output is quiet.',12,70); el.innerHTML=''; return; }
  const p=videoPos(k,t), lt0 = t - p.inLine*S.H, x0=10, pw=w-20, Xw = f => x0 + f*pw;
  const eavW=4, hancEnd = S.words-288-4-1440; // words per line: EAV 4, HANC, SAV 4, 1440 active
  const zones=[[0,4,css('--warn'),'EAV 3FF 000 000 XYZ'],[4,S.words-1444,css('--ink2'),'HANC / blanking'],[S.words-1444,S.words-1440,css('--warn'),'SAV'],[S.words-1440,S.words,SRC_COL[k],'active video 1440 words (Cb Y Cr Y)']];
  zones.forEach(([a,b,col,lb])=>{ c.fillStyle=col; c.globalAlpha=.18; c.fillRect(Xw(a/S.words),24,(b-a)/S.words*pw,70); c.globalAlpha=1; c.fillStyle=css('--ink2'); c.font='10px '+css('--sans'); if ((b-a)/S.words*pw>60) c.fillText(lb, Xw(a/S.words)+3, 108); });
  const vb = p.line<=S.sw[0]+10 || (p.line>S.lines/2 && p.line<=S.sw[1]+10);
  c.strokeStyle=css('--ink'); c.lineWidth=1.3; c.beginPath();
  for (let i=0;i<pw;i++){ const f=i/pw, wd=f*S.words; let v;
    if (wd<4 || (wd>=S.words-1444 && wd<S.words-1440)) v = (Math.floor(wd*2)%2)? 1:0;
    else if (wd<S.words-1444 || vb) v = 0.3;
    else v = 0.3 + 0.6*Math.abs(Math.sin((wd-(S.words-1440))/1440*Math.PI*(k+2)));
    const yy = 90 - v*60; i? c.lineTo(x0+i,yy) : c.moveTo(x0+i,yy); }
  c.stroke();
  const px = Xw(p.inLine); c.strokeStyle=css('--play'); c.lineWidth=2; c.beginPath(); c.moveTo(px,18); c.lineTo(px,98); c.stroke();
  const a=emulate().sig['A.xpt']||[]; const cut=a.find(q=>q[0]>lt0 && q[0]<=lt0+S.H);
  if (cut){ const x=Xw((cut[0]-lt0)/S.H); c.strokeStyle=css('--bad'); c.setLineDash([4,3]); c.beginPath(); c.moveTo(x,18); c.lineTo(x,98); c.stroke(); c.setLineDash([]); c.fillStyle=css('--bad'); c.fillText('CLC018 switched here', Math.min(x+4,w-140), 18); }
  c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`input ${k+1} · field ${p.field} · line ${p.line}/${S.lines} · word ${Math.floor(p.inLine*S.words)}/${S.words} · line ${SIM.fmtDur(S.H)}`, 10, 14);
  c.fillText(`10-bit words at 27 MHz → 270 Mb/s serial (one word = ${SIM.fmtDur(1/27e6)}, one bit = ${SIM.fmtDur(1/270e6)})`, 10, 136);
  el.innerHTML = `${vb?'Vertical blanking: ':''}${S.sw.indexOf(p.line)>=0?'<b>this is the RP168 switching line</b> — a cut here would be clean. ':''}The POD21 does not look at the video timing: the crosspoint is written whenever the button debounce or a command finishes. The CLC016 re-clocks the cut stream (U11, rate set by R47–R50 2550/3480/5490/6810 Ω, RD0/RD1 from RE0/RE1).`;
}
function drawByteScope(cv, el, t){
  const {c,w}=SIM.canvas(cv,120), css=SIM.css, E=emulate();
  let it=null, best=1e9; for (const x of E.items){ const d = t<x.start ? x.start-t : t>x.end ? t-x.end : 0; const dd = d*(x.kind==='spi'?20:1); if (dd<best){ best=dd; it=x; } }
  if (!it){ c.fillStyle=css('--ink2'); c.font='13px '+css('--sans'); c.fillText('No serial traffic in this second.',12,60); el.innerHTML=''; return; }
  const uart = it.kind==='uart', n = uart?10:8, lv = uart ? [0,...[0,1,2,3,4,5,6,7].map(k=>(it.b>>k)&1),1] : [7,6,5,4,3,2,1,0].map(k=>(it.b>>k)&1), cw=(w-80)/n;
  c.strokeStyle=css('--ink'); c.lineWidth=1.6; c.beginPath(); c.moveTo(10,uart?30:80); c.lineTo(40,uart?30:80);
  lv.forEach((v,k)=>{ const x=40+k*cw, yy=v?30:80; c.lineTo(x,yy); c.lineTo(x+cw,yy); }); c.lineTo(w-10,uart?30:80); c.stroke();
  if (!uart){ c.strokeStyle=css('--ink2'); c.beginPath(); for (let k=0;k<8;k++){ const x=40+k*cw; c.moveTo(x,96); c.lineTo(x,96); c.lineTo(x,88); c.lineTo(x+cw/2,88); c.lineTo(x+cw/2,96); c.lineTo(x+cw,96); } c.stroke(); }
  c.font='11px '+css('--mono'); c.fillStyle=css('--ink2'); lv.forEach((v,k)=>c.fillText(uart?(k===0?'start':k===9?'stop':'D'+(k-1)+'='+v):'b'+(7-k)+'='+v, 42+k*cw, 112));
  if (t>=it.start && t<=it.end){ const x=40+(t-it.start)/(it.end-it.start)*n*cw; c.strokeStyle=css('--play'); c.beginPath(); c.moveTo(x,16); c.lineTo(x,90); c.stroke(); }
  const who = {A:'POD21 → RS-485', R:'POD21R → POD21', PC:'PC → POD21', S:'POD21 → POD2 (MOSI)', M:'POD2 → POD21 (MISO)'}[it.from];
  c.fillStyle=css('--ink'); c.fillText(`${who}: ${hex2(it.b)} = ${bin8(it.b)}b${it.why?' · '+it.why:''}`, 10, 14);
  el.innerHTML = uart ? `${SIM.fmtT(it.start)} → ${SIM.fmtT(it.end)} · 1 bit = ${SIM.fmtDur(BIT_T)} = ${(BIT_T/TCY).toFixed(0)} Tcy · SPBRG 7, BRGH 0: 4 915 200 / (64 × 8) = 9600 Bd exactly. LSB first.`
    : `${SIM.fmtT(it.start)} · SSPCON = 0x20 (SSPEN, SSPM = 0000: master, Fosc/4) → SCK ${(FOSC/4/1e6).toFixed(4)} MHz, 8 bits in ${SIM.fmtDur(8*TCY)}, MSB first. One byte per Timer2 tick. The POD2 side: SSPCON = 0x25 (slave, SS disabled).`;
}

/* ================================================================
   VIEWS
   ================================================================ */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function traceHTML(){ const l=D.log[0]; return l ? `<div><b>${l.name}</b> at ${SIM.fmtT(l.t)}</div>`+l.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Press a button, plug an input, or send a command. The firmware path the emulator took is listed here, with time offsets after your action.</div>'; }
function scenarioHTML(){ return `<label class="small">Scenario <select class="p21scn">${Object.keys(SCEN).map(k=>`<option value="${k}" ${k===D.scenario?'selected':''}>${SCEN[k].name}</option>`).join('')}</select></label> <button class="p21clr">Clear my actions</button> <button class="p21nxt" title="Carry the state at 1 s over to a new second">Next second ▶</button>`; }
function bindScenario(m){ m.querySelectorAll('.p21scn').forEach(s=>s.onchange=e=>ACT.scenario(e.target.value)); m.querySelectorAll('.p21clr').forEach(b=>b.onclick=()=>ACT.clear()); m.querySelectorAll('.p21nxt').forEach(b=>b.onclick=()=>ACT.carry()); }
const UPTXT = ['waiting for the F0 address byte','F0 seen (uart_flag,7): next byte is the command','status sent, audio byte pending (which_flag,0)'];
function inspectorHTML(t){
  const L=ledAt(t), x=xptAt(t), on=powerAt(t), r=routineAt(t), E=emulate();
  const last = E.notes.filter(n=>n.u==='A' && n.t<=t).slice(-1)[0];
  const db = sv('A.db',t,0), up=sv('A.up',t,0), rf=sv('A.rf',t,0), sp=sv('A.sp',t,0);
  return `<table class="kv">
    <tr><th>Firmware</th><td class="mono">${FW[D.fw].name}</td></tr>
    <tr><th>Power · executing</th><td class="mono">${on?'on':'off'}${on&&r?` · pass ${r.pass.toLocaleString()} (${r.tot} Tcy) · <b>${ROUT[r.k]}</b>`:''}</td></tr>
    <tr><th>pre_output (LED latch)</th><td class="mono">${L<0?'—':hex2(L)+' = '+bin8(L)+'b → '+ledsTxt(L)}</td></tr>
    <tr><th>CLC018 → OUTPUT</th><td class="mono">${x<0?'—':'IA = '+(x>>2&1)+(x>>1&1)+(x&1)+' → '+(x===7?'input 7 (mute)':'input '+(x+1)+(D.inputs[x].on?'':' — no source'))}</td></tr>
    <tr><th>Debounce</th><td class="mono">${['idle (bcount = 0xFE)','press: counting 254 passes','rel_flag,0: pressed, accepted','release: counting 254 passes'][db]}</td></tr>
    <tr><th>audio · audio_count</th><td class="mono">${hex2(sv('A.audio',t,0xFF))} (${sv('A.audio',t,0xFF)===0xFF?'no audio status':audTxt(sv('A.audio',t,0xFF))}) · ${sv('A.acount',t,'—')}/${FW[D.fw].reload}</td></tr>
    <tr><th>RS-485 parser</th><td class="mono">${UPTXT[up]}${sv('A.oerr',t,0)?' · <b style="color:var(--bad)">OERR</b>':''}</td></tr>
    <tr><th>remote_flag · spi_transmit</th><td class="mono">${bin8(rf).slice(4)}b (${rf&8?'relay F0 next ':''}${rf&4?'relay cmd ':''}${rf&2?'UART route ':''}${rf&1?'SPI route':''}${rf?'':'—'}) · ${sp&2?'data byte next':'F0 next'}${sp&4?', F0 received':''}</td></tr>
    <tr><th>Last firmware step</th><td class="small">${last?`<span class="muted">${SIM.fmtT(last.t)}</span> ${last.txt}`:'—'}</td></tr></table>`;
}
function partnersHTML(t){
  let s='';
  if (D.ctl==='remote') s += `<div class="small" style="margin-bottom:4px"><b>POD21R remote</b> (r2.00) · polls every ${SIM.fmtDur(2*C.T2_FIRST*TCY)} · LEDs = PORTD ${hex2(sv('R.led',t,0xFF))}${sv('R.flash',t,0)?' · <b style="color:var(--warn)">com_timeout flashing</b>':''}</div>${frontSVG(t,{remote:true, max:640})}`;
  else if (D.ctl==='pc') s += pcHTML(t);
  else s += '<p class="small muted">Nothing on RS-485. Click the CONTROL connector on the rear panel to plug in the POD21R remote or a PC.</p>';
  return s + `<div style="margin-top:8px">${pod2HTML(t)}</div>`;
}
function viewSim(m){
  window.__pod21Keys = true; m._ck = m._ik = null;
  m.innerHTML = `<div class="grid2"><div>
      ${card('Front panel at the playhead — click the buttons and the rocker', `<div id="fp"></div><div id="ctl"></div>`)}
      ${card('Rear panel — click an input BNC to plug/unplug a source, CONTROL to change what is on RS-485', `<div id="rp"></div><div id="ins" style="margin-top:8px"></div>`)}
    </div><div>
      ${card('What the firmware did (emulated, last action)', `<div style="margin-bottom:6px">${scenarioHTML()}</div><div id="trace" class="log"></div>`)}
      ${card('State at the playhead', `<div id="insp"></div>`)}
      ${card('On CONTROL and the slave port', `<div id="pt"></div>`)}
    </div></div>
    ${card('Timeline — one second, zoomable (click to seek; transport above)', `<canvas id="tl"></canvas>
      <p class="small muted">Main-loop pass = ${C.PASS} Tcy × 813.8 ns = ${SIM.fmtDur(C.PASS*TCY)} when idle, hand-counted from 21v101.asm (Software tab). Zoom to 1 ms to see single passes and the routine each one spent its time in; to 100 µs for UART bits; to 10 µs for SPI bits. Red ticks on the OUTPUT lane are crosspoint writes (green when they land on the RP168 switching line).</p>`)}
    <div class="grid2">${card('Scope: one SDI line on the OUTPUT at the playhead', `<canvas id="sdi"></canvas><div id="sdit" class="small"></div>`)}
      ${card('Scope: the serial byte nearest the playhead (RS-485 or SPI)', `<canvas id="bs"></canvas><div id="bst" class="small"></div>`)}</div>
    ${card('Action log', `<div id="log" class="log"></div>`)}`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#fp').innerHTML=frontSVG(t); m.querySelector('#rp').innerHTML=rearSVG(t);
    bindPanel(m.querySelector('#fp')); bindPanel(m.querySelector('#rp'));
    m.querySelector('#pt').innerHTML=partnersHTML(t); bindPanel(m.querySelector('#pt')); bindParts(m.querySelector('#pt'));
    const ck=JSON.stringify([D.fw,D.ctl,D.port,D.press]); if (ck!==m._ck){ m._ck=ck; m.querySelector('#ctl').innerHTML=controlsHTML(); bindControls(m.querySelector('#ctl')); }
    const ik=JSON.stringify([D.inputs,D.std,D.timing,xptAt(t)]); if (ik!==m._ik){ m._ik=ik; m.querySelector('#ins').innerHTML=inputsHTML(); bindInputs(m.querySelector('#ins')); }
    m.querySelector('#insp').innerHTML=inspectorHTML(t); m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#log').innerHTML=D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('')||'<div class="muted">No actions yet.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:220});
    drawSDI(m.querySelector('#sdi'), m.querySelector('#sdit'), t); drawByteScope(m.querySelector('#bs'), m.querySelector('#bst'), t); };
  bindScenario(m); SIM.on('time', draw);
}

/* ---------------- tutorial (from POD21-MANUAL.pdf / Pod21man.doc and the firmware) ---------------- */
const userEv = f => D.events.some(e=>e.user && f(e));
const LESSONS = [
  { title:'Meet the POD21', body:`<p>The POD21 is a <b>six-by-one SDI video switcher</b> with remote control (manual). Six 75 Ω inputs, one output, 0.8 Vp-p, 270 Mb/s serial digital video.</p>
     <p>Front: power rocker and green power LED, a <b>SLAVE</b> button, and six lit <b>INPUT SELECT</b> buttons. Rear: <b>CONTROL</b> (DB9F, RS-485), <b>INPUT1–6</b>, <b>OUTPUT</b>, mains (115 VAC, ½ A slow-blow).</p>
     <p>“POD21 may be used in conjunction with an analog audio switcher (POD2), or a digital audio switcher (POD10) for audio following video applications.”</p><p class="muted">Hover over the panels to see what each part is wired to. Click “Next” when ready.</p>`, check:()=>true, auto:true },
  { title:'1 · Select an input', body:`<p>Press <b>4</b>. The button LEDs are interlocked: the old one goes out and 4 lights.</p><p>Inside, <span class="mono">input</span> shifts the eight buttons out of the 74HC165 on every pass. <span class="mono">debounce</span> wants the same pattern for <b>254 passes</b> (≈34 ms). Then <span class="mono">router</span>, <span class="mono">output_led</span> and <span class="mono">switch_check</span> light the LED and write the crosspoint, all while you are still holding the button.</p><p><b>Goal:</b> input 4 on the OUTPUT.</p>`,
    check:()=> fin('A.xpt',-1)===3, hint:'Click button 4 on the front panel (or press the 4 key), with the playhead before 0.9 s.' },
  { title:'2 · Catch the debounce', body:`<p>Zoom the timeline to <b>100 ms</b> and look at the <i>debounce</i> lane after your press. Orange = <span class="mono">bcount</span> counting down from 0xFE; blue = <span class="mono">rel_flag,0</span> set, waiting for you to let go; grey = <span class="mono">debounce_rel</span> counting the release.</p><p><b>Goal:</b> put the playhead inside the orange part (press accepted but not yet acted on).</p>`,
    check:()=> sv('A.db',SIM.t,0)===1, hint:'Press a button, then drag the slider to just after the press (within ≈34 ms).' },
  { title:'3 · Slave mode', body:`<p>Make sure an audio switcher is on the slave port (<b>POD2</b>, the default) and press <b>SLAVE</b>. Its LED lights.</p><p>From now on <span class="mono">SPI_trns_cntrl</span> sends every video selection to the POD2 as a <i>command</i> (bit 7 = 0) instead of a status byte.</p><p><b>Goal:</b> SLAVE lit at the end of the second, POD2 connected.</p>`,
    check:()=> D.port==='pod2' && fin('A.led',0xFF)>=0 && !(fin('A.led',0xFF)&0x20), hint:'Click SLAVE (or press S).' },
  { title:'4 · Audio follows video', body:`<p>With SLAVE on, press <b>5</b>. The manual: “any channel selection on the video switcher will result in the same selection on the audio switcher.”</p><p>Watch the <i>SPI MOSI</i> lane: F0, then <span class="mono">0x6F</span> (0 1 101111: command, input 5 low) for 32 messages. The POD2 switches after the 4th (<span class="mono">spi_rec_count</span> = 4 in pod2v200.asm).</p><p><b>Goal:</b> video 5 and audio 5, SLAVE on.</p>`,
    check:()=> fin('A.xpt',-1)===4 && !(fin('P2.sel',0x7F)&0x10) && !(fin('A.led',0xFF)&0x20), hint:()=>`Now: video ${fin('A.xpt',-1)+1}, audio ${audTxt(fin('P2.sel',0x7F))}. Turn SLAVE on first, then press 5 later in the second.` },
  { title:'5 · …and vice versa', body:`<p>Press <b>A2</b> on the POD2 panel (right-hand card). The POD2 answers its next 32 SPI data bytes with commands, and after 7 of them the POD21's <span class="mono">spi_rec_setup</span> sets <span class="mono">remote_flag,0</span>. Then <span class="mono">router</span> copies <span class="mono">spi_reg</span> to the LEDs and the crosspoint.</p><p><b>Goal:</b> video 2 selected by the audio switcher, SLAVE still on.</p>`,
    check:()=> fin('A.xpt',-1)===1 && !(fin('A.led',0xFF)&0x20) && userEv(e=>e.type==='p2btn'), hint:'SLAVE must be on (the POD2 only sends commands when the POD21 reports SLAVE). Then click A2 on the POD2 panel.' },
  { title:'6 · The POD21R remote', body:`<p>Set CONTROL to the <b>POD21R remote</b> and press <b>6</b> on the <i>remote</i> panel. The remote polls the switcher with <span class="mono">F0 00</span> every ${SIM.fmtDur(2*C.T2_FIRST*TCY)}. A press becomes <span class="mono">F0 10vvvaaa</span>. Its LEDs only change when the switcher's next status reply arrives — they are true tallies.</p><p><b>Goal:</b> input 6 selected from the remote.</p>`,
    check:()=> D.ctl==='remote' && fin('A.xpt',-1)===5 && userEv(e=>e.u==='R'), hint:'Choose “POD21R remote” under CONTROL, then click button 6 on the small remote panel.' },
  { title:'7 · The serial protocol (PC)', body:`<p>Load the PC scenario. <button data-scn="pc">Load “PC: F0 00 … F0 C7”</button></p><p>The manual: “The Slave indicator on POD21 may be turned on by sending the command F0, C0 (HEX) and turned off by F0, C7 (HEX).” Watch what the firmware does with each.</p><p><b>Goal:</b> put the playhead after F0 C7 and see SLAVE lit — the opposite of what the manual says.</p>`,
    check:()=> D.ctl==='pc' && SIM.t>0.76 && ledAt(SIM.t)>=0 && !(ledAt(SIM.t)&0x20) && D.events.some(e=>e.type==='pc' && e.bytes.indexOf(0xC7)>=0), hint:'Load the scenario and drag the playhead past 0.76 s.' },
  { title:'8 · Slave with nothing to follow', body:`<p><button data-scn="noaud">Load “No audio switcher”</button>. SLAVE lights, then goes out by itself.</p><p><span class="mono">timer_check</span> decrements <span class="mono">audio_count</span> every 3.33 ms; only a status from the audio switcher reloads it. After 32 ticks without one: <span class="mono">audio = 0xFF</span> and <span class="mono">bsf pre_output,5</span>.</p><p><b>Goal:</b> put the playhead just after SLAVE goes out.</p>`,
    check:()=> D.port==='none' && (emulate().sig['A.led']||[]).some(([tt,v])=>tt<SIM.t && v>=0 && !(v&0x20)) && ledAt(SIM.t)>=0 && (ledAt(SIM.t)&0x20), hint:'Load the scenario and scrub forward from 0.13 s.' },
  { title:'Done', body:`<p>You have used everything an operator can touch on the POD21. <b>Software</b> follows the main loop and both serial protocols. <b>One second, frame by frame</b> goes down to single SPI and UART bits and SDI words. <b>Findings</b> lists what the firmware does that the manual doesn't say.</p>`, check:()=>true, auto:true },
];
let lessonIdx=0;
function resetAll(){ loadScenario('idle'); D.press=C.PRESS; D.inputs.forEach(p=>p.on=true); D.std='525'; D.timing='sync'; D.log=[]; }
function viewTutorial(m){
  window.__pod21Keys = true; m._ck=null;
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — operating the POD21 (from the manual and the firmware)', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div>
      ${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div>
    <div>${card('The unit at the playhead', `<div id="fp"></div><div id="ctl"></div><div id="rp" style="margin-top:8px"></div><div id="pt" style="margin-top:8px"></div><div id="lv" class="small mono" style="margin-top:6px"></div>`)}
      ${card('Timeline (1 s)', `<canvas id="tl"></canvas>`)}</div></div>`;
  const hot = `<g><rect x="150" y="70" width="170" height="170" fill="transparent"><title>Power rocker and green PWR LED</title></rect>
    <rect x="430" y="110" width="100" height="100" fill="transparent"><title>SLAVE: audio-follow-video with a POD2 / POD10 on the slave port</title></rect>
    <rect x="730" y="60" width="850" height="50" fill="transparent"><title>INPUT SELECT 1–6: interlocked, each lights when its input is on the OUTPUT</title></rect></g>`;
  const draw=()=>{ const t=SIM.t;
    m.querySelector('#fp').innerHTML=frontSVG(t,{hot}); m.querySelector('#rp').innerHTML=rearSVG(t);
    bindPanel(m.querySelector('#fp')); bindPanel(m.querySelector('#rp'));
    m.querySelector('#pt').innerHTML=partnersHTML(t); bindPanel(m.querySelector('#pt')); bindParts(m.querySelector('#pt'));
    const ck=JSON.stringify([D.fw,D.ctl,D.port,D.press]); if (ck!==m._ck){ m._ck=ck; m.querySelector('#ctl').innerHTML=controlsHTML(); bindControls(m.querySelector('#ctl')); }
    const x=xptAt(t), L=ledAt(t);
    m.querySelector('#lv').textContent = `OUTPUT: ${x<0?'—':x===7?'mute':'input '+(x+1)} · SLAVE ${L>=0&&!(L&0x20)?'on':'off'} · POD2: ${D.port==='pod2'?audTxt(sv('P2.sel',t,0x7F)):'none'}`;
    m.querySelector('#trace').innerHTML=traceHTML();
    m.querySelector('#lessons').innerHTML=LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=>li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const Ls=LESSONS[lessonIdx], ok=Ls.check(), hint=typeof Ls.hint==='function'?Ls.hint():Ls.hint;
    m.querySelector('#lesson').innerHTML=`<h2>${Ls.title}</h2>${Ls.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(Ls.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nxt" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelectorAll('#lesson [data-scn]').forEach(b=>b.onclick=()=>ACT.scenario(b.dataset.scn));
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nxt').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ resetAll(); lessonIdx=0; SIM.seek(0); };
    SIM.drawLanes(m.querySelector('#tl'), lanes().filter(l=>/OUTPUT|Buttons|debounce|LEDs|MOSI|RX|TX|POD2|POD21R/.test(l.label)), {labelW:200}); };
  SIM.on('time', draw);
}

/* ---------------- one second, frame by frame ---------------- */
function viewAnatomy(m){
  window.__pod21Keys = true;
  const S=STD[D.std];
  m.innerHTML = `${card('One second, broken down', `<div id="ladder"></div>`)}
    <div class="grid2">${card('As seen by the device (PIC16F874 pins at the playhead, names from pod21iss2.net)', `<div id="dev"></div>`)}
      ${card('As seen by the displays (button LEDs over the whole second)', `<div id="fp"></div><canvas id="ledstrip"></canvas><p class="small muted">Rows: SLAVE and inputs 1–6 as latched by U13 74HC4094 (MIX, XPT1–XPT6 → H1, R55–R62). The remote's LEDs follow 0–107 ms later, when the next status reply arrives.</p>`)}</div>
    ${card('Zoom ladder at the playhead', `<canvas id="zl"></canvas>`)}`;
  const draw=()=>{ const t=SIM.t, S=STD[D.std];
    const rows=[
      ['Crystal X1','4 915 200','203.4 ns','HS oscillator, C39/C40 27 pF'],
      ['Instruction cycles (Tcy = 4/Fosc)','1 228 800','813.8 ns','1 Tcy per instruction, 2 for a branch'],
      ['Main-loop passes (idle)',Math.round(1/(C.PASS*TCY)).toLocaleString(),SIM.fmtDur(C.PASS*TCY),'17 calls in main, 163 Tcy counted by hand'],
      ['74HC165 bit reads','≈'+Math.round(8/(C.PASS*TCY)).toLocaleString(),'8 per pass','input: LOAD165 (RC1) pulse, 8 × CLK (RA2), DATA_IN (RA4)'],
      ['Debounce: press accepted after','—',SIM.fmtDur(254*C.PASS*TCY),'bcount 0xFE → 0, same input_reg each pass'],
      ['Timer2 polls (timer_check)',Math.round(1/(C.T2_FAST*TCY)).toLocaleString(),SIM.fmtDur(C.T2_FAST*TCY),'T2CON 1:1 / 1:16, PR2 = 0xFF; the first one 53.3 ms after init'],
      ['SPI bytes to/from the POD2',Math.round(1/(C.T2_FAST*TCY)).toLocaleString(),SIM.fmtDur(8*TCY)+' each','one per tick: F0, data, F0, data… (SCK 1.2288 MHz)'],
      ['Slave watchdog (audio_count)','—',SIM.fmtDur(FW[D.fw].reload*C.T2_FAST*TCY),FW[D.fw].reload+' ticks without an audio status → SLAVE off'],
      ['RS-485 bits (9600 Bd)','9 600',SIM.fmtDur(BIT_T),'SPBRG 7, BRGH 0 — exact with this crystal'],
      ['RS-485 bytes (most the link can carry)','960',SIM.fmtDur(BYTE_T),'start + 8 data + stop'],
      ['POD21R polls (F0 00)','≈9.4',SIM.fmtDur(2*C.T2_FIRST*TCY),'one byte per remote Timer2 period (1:16 / 1:16)'],
      ['POD21R com_timeout window','≈5.8',SIM.fmtDur(1536*C.R_PASS*TCY),'comout2 × comout3: 256 × 6 passes of '+C.R_PASS+' Tcy'],
      [`SDI fields (${D.std})`,(1/S.field).toFixed(2),SIM.fmtDur(S.field),'passed through; nothing on the board looks at them'],
      ['SDI lines',(S.lines/(2*S.field)).toFixed(0),SIM.fmtDur(S.H),`${S.words} words per line incl. EAV/SAV`],
      ['SDI words (10-bit)','27 000 000','37.04 ns','4:2:2 component (SMPTE 259M level C)'],
      ['SDI bits (serial, scrambled NRZI)','270 000 000','3.704 ns','CLC014 equalises, CLC018 switches, CLC016 re-clocks, CLC007 drives'],
    ];
    m.querySelector('#ladder').innerHTML=`<table class="kv"><tr><th>Event</th><th>per second</th><th>period</th><th>who handles it</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</table>
      <p class="small muted">A button press lasts about a thousand main-loop passes, and one pass is about two SDI lines. The PIC never touches the video: it writes three address bits into the CLC018. Use <b>Step</b> on the transport to move one pass, one Timer2 tick, one UART bit or one SDI line at a time.</p>`;
    const on=powerAt(t), x=xptAt(t), L=ledAt(t), E=emulate();
    const ui=E.items.find(i=>i.kind==='uart' && t>=i.start && t<i.end), si=E.items.find(i=>i.kind==='spi' && t>=i.start && t<i.end);
    const bitU = (it,from)=>{ if (!it || from.indexOf(it.from)<0) return 1; const k=Math.floor((t-it.start)/BIT_T); return k===0?0:k>=9?1:(it.b>>(k-1))&1; };
    const ia = x<0?'—':`${x>>2&1}/${x>>1&1}/${x&1}`;
    m.querySelector('#dev').innerHTML = !on ? '<p class="muted">The unit is off.</p>' : `<table class="kv">
      <tr><th>RA0 (CD, “turn on PLL”)</th><td class="mono">1 — set once in init, drives the CLC016 CD net</td></tr>
      <tr><th>RA1 LOAD · RB0 CNFG · RB1 RES</th><td class="mono">CLC018 strobes, pulsed by the INPUTn macros</td></tr>
      <tr><th>RB4 IA2 · RD5 IA1 · RB2 IA0</th><td class="mono">${ia} → CLC018 input ${x<0?'—':x+1}${x===7?' (mute)':''}</td></tr>
      <tr><th>RD7 OA2 · RD6 OA1 · RB5 OA0</th><td class="mono">1/1/0 → output 6 (init_matrix, never changed)</td></tr>
      <tr><th>RA2 CLK · RA3 DATA_OUT · RA5 STR</th><td class="mono">74HC4094 latch = ${L<0?'—':hex2(L)+' ('+ledsTxt(L)+')'}</td></tr>
      <tr><th>RC1 LOAD165 · RA4 DATA_IN</th><td class="mono">74HC165 → input_reg = ${hex2(sv('A.in',t,0xFF))}</td></tr>
      <tr><th>RC6 TX · RC7 RX · RC0 DE (U9)</th><td class="mono">TX ${bitU(ui,['A'])} · RX ${bitU(ui,['R','PC'])} · DE ${sv('A.rc0',t,0)}</td></tr>
      <tr><th>RC3 SCK · RC5 SDO · RC4 SDI</th><td class="mono">${si?'shifting '+hex2(si.b)+' out':'idle'} (P1 via R37–R39)</td></tr>
      <tr><th>RE0/RE1 → CLC016 RD0/RD1</th><td class="mono">outputs (TRISE = 0xE0), never written — power-up latch value</td></tr></table>`;
    m.querySelector('#fp').innerHTML=frontSVG(t,{max:700}); bindPanel(m.querySelector('#fp'));
    const {c,w}=SIM.canvas(m.querySelector('#ledstrip'), 7*14+22); const a=E.sig['A.led']||[];
    c.font='10px '+SIM.css('--mono');
    for (let n=0;n<7;n++){ const bit = n===0 ? 5 : LEDBIT[n-1]; c.fillStyle=SIM.css('--ink2'); c.fillText(n===0?'S':String(n), 4, 14+n*14+8);
      for (let i=0;i<a.length;i++){ const s=Math.max(0,a[i][0]), e=i+1<a.length?a[i+1][0]:1; if (e<=s || a[i][1]<0) continue; if (!((a[i][1]>>bit)&1)){ c.fillStyle='#e0303c'; c.fillRect(20+s*(w-26), 14+n*14, Math.max(1,(e-s)*(w-26)), 10); } } }
    c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(20+t*(w-26),8); c.lineTo(20+t*(w-26),7*14+20); c.stroke();
    drawLadder(m.querySelector('#zl'), t); };
  SIM.on('time', draw);
}
function drawLadder(cv, t){
  const levels=[['1 second',1],['100 ms (a press)',0.1],['10 ms (3 Timer2 ticks)',0.01],['1 ms (one UART byte)',1e-3],['100 µs (one pass)',1e-4],['10 µs (one SPI byte)',1e-5]];
  const L=lanes().filter(l=>/OUTPUT|main loop|MOSI|RS-485 RX|RS-485 TX/.test(l.label));
  const H=levels.length*86+10, {c,w}=SIM.canvas(cv,H);
  levels.forEach(([nm,span],i)=>{ const y=6+i*86, t0=Math.max(0,Math.min(1-span,t-span/2)); c.fillStyle=SIM.css('--ink'); c.font='12px '+SIM.css('--sans'); c.fillText(nm,6,y+14);
    const x0=150, pw=w-x0-10, X=tt=>x0+(tt-t0)/span*pw; c.strokeStyle=SIM.css('--grid'); c.strokeRect(x0,y,pw,80);
    L.slice(0,5).forEach((l,k)=>{ c.save(); c.beginPath(); c.rect(x0,y+k*16,pw,16); c.clip(); try{ l.draw(c,X,t0,t0+span,y+k*16,16,pw); }catch(e){} c.restore(); });
    c.fillStyle=SIM.css('--ink2'); c.font='9.5px '+SIM.css('--sans'); L.slice(0,5).forEach((l,k)=>c.fillText(l.label.slice(0,24),6,y+28+k*12));
    const px=X(t); c.strokeStyle=SIM.css('--play'); c.beginPath(); c.moveTo(px,y); c.lineTo(px,y+80); c.stroke();
    if (i<levels.length-1){ const ns=levels[i+1][1]; const a=X(Math.max(0,Math.min(1-ns,t-ns/2))); c.fillStyle=SIM.css('--play'); c.globalAlpha=.12; c.fillRect(a,y,Math.max(2,ns/span*pw),80); c.globalAlpha=1; } });
}

/* ---------------- block diagram (POD21 - Functional Diagram.cdr + pod21iss2.net) ---------------- */
const BLOCKS = {
  ins:{x:20,y:20,w:180,h:120,t:'INPUT1–6',s:['BNC1 ×6, 75 Ω (manual)','L1–L6 18 nH, 75R terminations','U1–U6 CLC014 “Hi spd. rcvr.”'],d:'Each input: BNC → 18 nH / 75 Ω network → U1…U6 CLC014 adaptive cable equaliser (SO14). Its differential output (pins 13/14, R5/R6-type 75R pull-ups) goes to the crosspoint: U1 → CLC018 pins 46/47, U2 → 50/51, U3 → 53/54, U4 → 56/57, U5 → 59/60, U6 → 62/63 (netlist). The functional diagram calls them “Hi spd. rcvr.”'},
  xpt:{x:260,y:30,w:180,h:120,t:'U7 CLC018',s:['8×8 digital crosspoint','IA2..0, OA2..0, LOAD, CNFG, RES','only output 6 is used'],d:'National CLC018 8×8 crosspoint (“Digital crosspoint switch”). The PIC loads an input address (IA) for output 6 (OA = 110, set once in init_matrix) with LOAD, then CNFG makes it live. Inputs 0–5 carry the six equalisers; input 7 is what the CTV build selects to mute (pins 2/3 tied to +5 V through R76/R77 — that this is input 7 is '+'inferred'+'). Output pins 17/18 → U11.'},
  ret:{x:500,y:30,w:180,h:120,t:'U11 CLC016',s:['data retiming PLL','R47–R50: 2550/3480/5490/6810 Ω','RD0/RD1 ← RE0/RE1, CD ← RA0'],d:'“Data retiming PLL” on the functional diagram. Four VCO-range resistors (R47–R50) select the data rate with RD0/RD1, which the PIC holds on RE0/RE1 (1K pull-ups R74/R75) but never writes. CD (pins 19/28) is on RA0, which init sets high (“turn on PLL”). Re-clocked output pins 24/25 → U12.'},
  drv:{x:740,y:30,w:150,h:120,t:'U12 CLC007',s:['dual output cable driver','C61/C62/C67/C70 1 µF','→ OUT1 BNC (R53)'],d:'“Dual output driver” — only one output reaches the rear panel (OUTPUT, 75 Ω, 0.8 Vp-p terminated per the manual).'},
  mcu:{x:260,y:220,w:200,h:140,t:'U15 PIC16F874',s:['X1 4.9152 MHz (QFP44)','21v101.asm, MPASM','PORTA/B/D → CLC018','RC3–5 SPI, RC6/7 UART'],d:'The microcontroller runs a 17-call polling loop (no interrupts: the vector at 4 is just RETFIE). It scans the buttons through U14, lights the LEDs through U13, addresses the CLC018, talks RS-485 at 9600 Bd and SPI-masters the audio switcher.'},
  sr:{x:20,y:200,w:180,h:120,t:'U14 74HC165 / U13 74HC4094',s:['buttons IN1–6, IN_MIX, IN_SPARE','LEDs XPT1–6, MIX, SPARE','shared CLK = RA2'],d:'Two shift registers on one clock: U14 (parallel-in) reads the front buttons through H2 (1K SIP R63 pull-ups, R64–R71). U13 (serial-in, latched by STR = RA5) drives the button LEDs through H1 and R55–R62. The functional diagram draws them as “SHIFT REGISTER” on each side of the micro.'},
  fp:{x:20,y:360,w:180,h:90,t:'Front panel',s:['SLAVE + INPUT SELECT 1–6','lit buttons, PWR LED, rocker'],d:'Seven lit buttons on a separate board (H1/H2 1×12 headers). The silk also prints positions for three PCB studs (crosshairs at x = 555, 1004, 1454). PWR is a green LEDRA2 through R40 2K.'},
  rs:{x:520,y:220,w:180,h:120,t:'RS-485 (CONTROL)',s:['U9 75176 driver, DE = RC0','U10 75176 receiver (always on)','P2 → DB9F: 3/8 TX, 7/2 RX, 5 GND'],d:'Two 75176 transceivers make a 4-wire full-duplex link: U9 only transmits (RE/DE tied to RC0), U10 only receives (RE/DE grounded), R41/R42 bias. The manual gives the DB9F pin-out. 9600 Bd 8N1, address byte F0.'},
  spi:{x:520,y:370,w:180,h:80,t:'Slave port (P1)',s:['SCK RC3, SDO RC5, SDI RC4','→ POD2 / POD10 SPI slave'],d:'P1 (PAN500) carries the SPI lines through R37–R39. The POD21 is the master (SSPCON = 0x20); the POD2 is a slave (SSPCON = 0x25 in pod2v200.asm). One byte per 3.33 ms tick. How P1 reaches the rear panel is '+'inferred'+' (the rear silk has only CONTROL).'},
  psu:{x:740,y:220,w:150,h:110,t:'Power',s:['T1 TE70042, 115/230 jumpers','D1–D4, C45/C46 2200 µF','REG2 LM2825 → +5 V'],d:'Mains through PWRSW and T1 (two primaries strapped by the 0R links 110_1/110_2/220), bridge D1–D4, then an LM2825 integrated 5 V switcher (DIP24). Manual: 115 V/60 Hz 12 VA, 230 V/50 Hz 6 VA; silk: 1/2 A slow-blow.'},
};
const WIRES=[['ins','xpt','6 × SDI'],['xpt','ret','output 6'],['ret','drv','re-clocked'],['mcu','xpt','IA, LOAD, CNFG, RES'],['mcu','ret','CD, RD0/RD1'],['sr','mcu','DATA_IN / CLK'],['mcu','sr','DATA_OUT / STR'],['fp','sr','buttons, LEDs'],['mcu','rs','TX/RX/DE'],['mcu','spi','SCK/SDO/SDI'],['psu','mcu','+5 V']];
function viewBlock(m){
  window.__pod21Keys=false; let sel='mcu';
  m.innerHTML=`<div class="grid2"><div>${card('Block diagram (click a block) — live at the playhead', `<div id="bd"></div><p class="small muted">Redrawn from <span class="mono">POD21 - Functional Diagram.cdr</span> (converted with Inkscape) with part numbers from <span class="mono">pod21iss2.net</span>.</p>`)}</div><div>${card('Block', `<div id="bdinfo"></div>`)}
    ${card('Signal flow in one sentence', `<p>Six <b>CLC014</b> equalisers feed a <b>CLC018</b> crosspoint; the PIC writes one 3-bit input address; the chosen stream is re-clocked by a <b>CLC016</b> and driven out by a <b>CLC007</b>. Buttons and LEDs go through two shift registers; RS-485 and SPI link it to remotes and the audio switcher.</p>`)}
    ${card('POD21 and its partners', `<table class="kv"><tr><th></th><th>role</th><th>link</th></tr><tr><td>POD21R</td><td>remote: 6 + SLAVE buttons, tallies</td><td>RS-485, polls F0 00</td></tr><tr><td>POD2</td><td>analog stereo 6×1 audio</td><td>SPI slave</td></tr><tr><td>POD10</td><td>AES 6×1 audio (old POD10)</td><td>SPI slave (same protocol)</td></tr><tr><td>PC / automation</td><td>manual's 4 commands</td><td>RS-485 9600 8N1</td></tr></table>`)}</div></div>`;
  const draw=()=>{ const t=SIM.t, x=xptAt(t); const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 910 470" style="width:100%"><defs><marker id="p21ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a], B_=BLOCKS[b]; let [x1,y1]=ctr(A_), [x2,y2]=ctr(B_);
      const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x, dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B_,x2,y2,x1,y1); const hot = sel===a||sel===b || (['ins','xpt','ret'].includes(a) && x>=0 && x<6 && D.inputs[x].on);
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#p21ar)"/>`;
      if (l && (sel===a||sel===b)) s+=`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10" fill="var(--ink)">${l}</text>`; });
    for (const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/>
      <text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+10}" y="${b.y+38+i*15}" font-size="10.5" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    s+=`<text x="260" y="190" font-size="11" fill="var(--accent)">OUTPUT ← ${x<0?'—':x===7?'input 7 (mute)':'input '+(x+1)} · IA = ${x<0?'—':(x>>2&1)+''+(x>>1&1)+(x&1)}</text></svg>`;
    m.querySelector('#bd').innerHTML=s; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdinfo').innerHTML=`<h3>${b.t}</h3><p>${b.d.replace(/inferred/g, inf)}</p><p class="small muted">Connections: ${WIRES.filter(w=>w[0]===sel||w[1]===sel).map(w=>`${BLOCKS[w[0]].t} → ${BLOCKS[w[1]].t} (${w[2]})`).join('; ')}</p>`; };
  SIM.on('time', draw);
}

/* ---------------- schematics (redrawn from pod21iss2.net pin and net names) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18;
  let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-2}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18, [pin,net]=p; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${pin}</text>${net?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${net}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18, [pin,net]=p; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${pin}</text>${net?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${net}</text>`:''}`; });
  return s;
}
function box(x,y,w,h,lines){ return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="var(--ink)"/>`+lines.map((l,i)=>`<text x="${x+w/2}" y="${y+18+i*15}" text-anchor="middle" font-size="11" fill="var(--ink)">${l}</text>`).join(''); }
const SHEETS = [
  { name:'1 · Inputs ×6 (CLC014)', note:'pod21iss2.net: INPUTn-3 → L(n) 18 nH → U(n) CLC014; pins 1/2/4 +5, 10/11 GNDD, 5/12 C(…) 1 µF, 6/7 C 100 pF (equaliser), 8 R4-type, 9 R1-type; outputs 13/14 with 75R pull-ups to +5 → CLC018. Pin functions are from the netlist only; the CLC014 names are not in the archive.', svg:()=>
    `<circle cx="70" cy="110" r="22" fill="none" stroke="var(--ink)" stroke-width="1.5"/><circle cx="70" cy="110" r="6" fill="none" stroke="var(--ink)"/><text x="70" y="150" text-anchor="middle" font-size="11" fill="var(--ink)">INPUT1 (BNC1)</text>
     <line x1="92" y1="110" x2="150" y2="110" stroke="var(--ink)"/><path d="M150 110 q6 -10 12 0 q6 -10 12 0 q6 -10 12 0" fill="none" stroke="var(--ink)"/><text x="150" y="96" font-size="10" fill="var(--ink2)">L7 18 nH</text><line x1="186" y1="110" x2="246" y2="110" stroke="var(--ink)"/>
     <line x1="246" y1="110" x2="246" y2="92" stroke="var(--ink)"/><line x1="246" y1="92" x2="406" y2="92" stroke="var(--ink)"/>
     <text x="150" y="134" font-size="10" fill="var(--ink2)">C1 1 µF, R1/R2 75R network</text>`
    + chip(440,70,170,'U1 CLC014',[['9 IN','C1/R1'],['8 IN−','R4'],['6/7 EQ','C5 100p'],['5/12 AGC','C6 1µ'],['1/2/4 Vcc','+5'],['10/11 GND','GNDD']],[['14 OUT','R6 75R → U7-47'],['13 OUT−','R5 75R → U7-46']],'adaptive cable equaliser')
    + `<text x="40" y="300" font-size="12" fill="var(--ink)">The same six times (netlist):</text>`
    + [['U1','46/47'],['U2','50/51'],['U3','53/54'],['U4','56/57'],['U5','59/60'],['U6','62/63']].map(([u,p],i)=>`<text x="${40+(i%2)*430}" y="${320+Math.floor(i/2)*20}" font-size="11" fill="var(--ink)">INPUT${i+1} → ${u} CLC014 → <tspan fill="var(--accent2)">U7 pins ${p}</tspan> (CLC018 input ${i})</text>`).join('')
    + `<text x="40" y="400" font-size="11" fill="var(--ink2)">Rear silk: INPUT1 … INPUT6, OUTPUT left to right, 0.75″ pitch (Pod21silk.cdr).</text>` },
  { name:'2 · Crosspoint → retimer → driver', note:'U7 CLC018 (pattern CLC018), U11 CLC016 (PLCC28), U12 CLC007 (SO8). Net names RES, CNFG, LOAD, IA0–2, OA0–2, CD, RD0, RD1 are the netlist\'s own. R47–R50 values from the BOM (2550R, 3480R, 5490R, 6810R) on U11 pins 13–17 with a common node on pin 18.', svg:()=>
    chip(160,50,170,'U7 CLC018',[['46/47 IN0','U1'],['50/51 IN1','U2'],['53/54 IN2','U3'],['56/57 IN3','U4'],['59/60 IN4','U5'],['62/63 IN5','U6'],['2/3','R76/R77 → +5'],['44/43/42 IA0–2','IA0 IA1 IA2'],['40/39/38 OA0–2','OA0 OA1 OA2'],['11 LOAD','LOAD'],['10 CNFG','CNFG'],['9 RES','RES']],[['17/18 OUT','→ U11 6/5'],['+5 ×17 pins',''],['GND 12,31,41,49','']],'8×8 digital crosspoint')
    + chip(520,50,150,'U11 CLC016',[['5/6 DIN','U7 18/17'],['13–17 Rset','R50 R49 R48 R47'],['18','R47–R50 common'],['20 RD0','RE0 (R74 1K)'],['21 RD1','RE1 (R75 1K)'],['19/28 CD','RA0']],[['24/25 DOUT','→ U12 7/6'],['9/10/12','loop filter C54/C55 R46'],['4/8','R45, C52']],'data retiming PLL')
    + chip(640,300,100,'U12 CLC007',[['7/6 IN','U11']],[['1–4 OUT','C61 C62 C67 C70'],['→ OUT1','R53']],'cable driver') },
  { name:'3 · PIC16F874, buttons, LEDs', note:'U15 PIC16F874 QFP44 pins from pod21iss2.net, functions from 21v101.asm (TRIS values and macro comments). U14 74HC165 D0…D7 = IN_MIX, IN_SPARE, IN1…IN6 (pins 11,12,13,14,3,4,5,6) — exactly the order input shifts them in. U13 74HC4094 Q0…Q7 = MIX, SPARE, XPT1…XPT6. H3 2×3 is the ICSP header (MCLR, RB6, RB7, RB3/PGM).', svg:()=>
    chip(330,30,210,'U15 PIC16F874',[['19 RA0','CD'],['20 RA1','LOAD'],['21 RA2','CLK'],['22 RA3','DATA_OUT'],['23 RA4','DATA_IN'],['24 RA5','STR'],['8 RB0','CNFG'],['9 RB1','RES'],['10 RB2','IA0'],['14 RB4','IA2'],['15 RB5','OA0'],['30/31 OSC','X1 4.9152'],['18 MCLR','H3-3'],['11 RB3/PGM','H3-6']],
      [['3 RD5','IA1'],['4 RD6','OA1'],['5 RD7','OA2'],['25 RE0','RD0'],['26 RE1','RD1'],['32 RC0','U9 RE/DE'],['35 RC1','LOAD165'],['37 RC3/SCK','R37 → P1-1'],['42 RC4/SDI','R39 → P1-3'],['43 RC5/SDO','R38 → P1-2'],['44 RC6/TX','U9-4'],['1 RC7/RX','U10-1'],['16/17 RB6/7','H3-4 / H3-2']],'MPASM 21v101.asm')
    + chip(160,318,120,'U14 74HC165',[['1 LOAD','LOAD165'],['2 CLK','CLK'],['9 Q7','DATA_IN']],[['11 D0','IN_MIX'],['12 D1','IN_SPARE'],['13 D2','IN1'],['14 D3','IN2'],['3–6 D4–7','IN3…IN6']],'')
    + chip(620,318,120,'U13 74HC4094',[['1 STR','STR'],['2 D','DATA_OUT'],['3 CP','CLK']],[['4 Q0','MIX'],['5 Q1','SPARE'],['6/7 Q2/3','XPT1/2'],['14–11 Q4–7','XPT3…XPT6']],'') },
  { name:'4 · RS-485, slave port, power', note:'U9/U10 75176 (SO8), P1/P2 PAN500 headers, T1 TE70042, D1–D4 1N4003, C45/C46 2200 µF/25 V, REG2 LM2825 (DIP24), PWR GREEN LEDRA2 + R40 2K, ACIN PAN356, PWRSW PAN256 (BOM, netlist). DB9 pin numbers from the manual; the P2 → DB9 harness (POD21-wiring.sch, ACCEL V15, Tim Clarke) is only partly readable.', svg:()=>
    chip(160,50,140,'U9 75176 (TX)',[['4 D','RC6/TX'],['2/3 RE/DE','RC0'],['8 Vcc','+5'],['5 GND','GNDD']],[['6 A','P2-1 → DB9-3 TX+'],['7 B','P2-2 → DB9-8 TX−']],'driver only')
    + chip(160,230,140,'U10 75176 (RX)',[['1 R','RC7/RX'],['2/3 RE/DE','GNDD'],['8 Vcc','+5']],[['6 A','P2-3 (R42) → DB9-7 RX+'],['7 B','P2-4 (R41) → DB9-2 RX−']],'receiver only')
    + box(560,50,250,80,['P1 PAN500 — slave port (SPI)','1 SCK ← RC3 (R37) · 2 SDO ← RC5 (R38)','3 SDI → RC4 (R39) · 4/5 GNDD','to POD2 / POD10 — rear route inferred'])
    + box(560,170,300,100,['ACIN → PWRSW → T1 TE70042','primaries: 0R links 110_1, 110_2 (115 V) / 220','D1–D4 1N4003 → C45, C46 2200 µF/25 V','REG2 LM2825 → +5 V (C48 220 µF, L2)','PWR GREEN via R40 2K'])
    + box(560,300,300,60,['DB9F CONTROL (manual):','3 TX+ · 8 TX− · 7 RX+ · 2 RX− · 5 GND'])
    + `<text x="40" y="410" font-size="11" fill="var(--ink2)">Two one-way 75176s = 4-wire full duplex. RC0 only gates the driver; the receiver is always on.</text>` },
];
function viewSchem(m){
  window.__pod21Keys=false; let i=0;
  m.innerHTML=card('Schematic set — REDRAWN from pod21iss2.net, the BOM and 21v101.asm (not the P-CAD drawing)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">The original is the P-CAD 2001 schematic <span class="mono">PCB/pod21iss2.sch</span> (binary) and board <span class="mono">pod21iss2.pcb</span> (“POD21,ISSUE2”). An unreleased issue 3 is in <span class="mono">PCB/WORKING</span>; the Gerbers are issue 3. These sheets are a reading guide: blue labels are the netlist's net names or the part they connect to.</p>`);
  const draw=()=>{ m.querySelector('#tabs2').innerHTML=SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML=`<svg viewBox="0 0 900 470" style="width:100%;min-width:680px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="888" height="458" fill="none" stroke="var(--line)"/><text x="884" y="460" text-anchor="end" font-size="10" fill="var(--ink2)">POD21 ISSUE2 · sheet ${i+1}/4 · redrawn ${Y(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').innerHTML=SHEETS[i].note.replace(/inferred/g, inf); };
  draw();
}

/* ---------------- software diagrams ---------------- */
function viewSoft(m){
  window.__pod21Keys=true;
  m.innerHTML=`<div class="grid2">${card('main — the 17-call polling loop, live at the playhead', `<div id="loop"></div>`)}
    <div>${card('State machines at the playhead', `<div id="sm"></div>`)}${card('pre_output — the one register everything hangs on', `<div id="reg"></div>`)}</div></div>
    <div class="grid2">${card('RS-485 protocol: manual vs. translate_uart', `<div id="proto"></div>`)}${card('SPI slave-port protocol (SPI_trns_cntrl / SPI_rcv_ctrl ↔ pod2v200.asm)', `<div id="spi"></div>`)}</div>
    ${card('Firmware versions in the archive', `<div id="ver"></div>`)}`;
  const draw=()=>{ const t=SIM.t, r=routineAt(t);
    const busy = r ? r.cs.map((v,k)=>v>IDLE[k]+2) : [];
    let s=`<svg viewBox="0 0 520 ${ROUT.length*24+40}" style="width:100%">`;
    ROUT.forEach((nm,k)=>{ const y=10+k*24, on=r&&r.k===k, b=busy[k];
      s+=`<rect x="10" y="${y}" width="250" height="20" rx="4" fill="${on?'var(--accent)':b?'color-mix(in srgb,var(--warn) 30%,transparent)':'var(--panel2)'}" stroke="var(--line)"/><text x="18" y="${y+14}" font-size="11.5" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${k<2||k===16?'':'call '}${nm}</text>
        <text x="270" y="${y+14}" font-size="10.5" fill="var(--ink2)">${r?r.cs[k]:IDLE[k]} Tcy${IDLE[k]&&r&&r.cs[k]!==IDLE[k]?' (idle '+IDLE[k]+')':''}</text>`; });
    s+=`<path d="M8 ${10+16*24+10} C -10 ${10+16*24+10}, -10 20, 8 20" fill="none" stroke="var(--ink2)" marker-end="url(#p21ar2)"/><defs><marker id="p21ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    s+=`<text x="10" y="${ROUT.length*24+30}" font-size="11" fill="var(--ink)">${r?`pass ${r.pass.toLocaleString()} · ${r.tot} Tcy = ${SIM.fmtDur(r.tot*TCY)} · ${busy.filter(Boolean).length} routines did work (orange)`:'unit off'}</text></svg>`;
    m.querySelector('#loop').innerHTML = s + `<p class="small muted">Idle costs are counted instruction by instruction from 21v101.asm (1 Tcy, 2 for CALL/RETURN/GOTO and taken skips): 1 + 22 + 41 + 18 + 11 + 5 + 5 + 5 + 5 + 5 + 7 + 13 + 5 + 8 + 5 + 5 + 2 = <b>163</b>. <span class="mono">init_loop</span> rewrites ADCON1 and all five TRIS registers on every pass — 22 Tcy, 13 % of the loop. Costs of the busy branches are estimates (${inf}).</p>`;
    const db=sv('A.db',t,0), up=sv('A.up',t,0), sp=sv('A.sp',t,0), L=ledAt(t);
    const st=(lbl,on)=>`<span class="chip" style="${on?'background:var(--accent);color:#fff;border-color:var(--accent)':''}">${lbl}</span>`;
    m.querySelector('#sm').innerHTML = `<div class="small"><b>Buttons</b> (debounce → router → output_led → switch_check → debounce_rel)<br>${st('idle',db===0)} → ${st('bcount counting (254)',db===1)} → ${st('rel_flag,0: acted on',db===2)} → ${st('release counting (254)',db===3)}</div>
      <div class="small" style="margin-top:8px"><b>RS-485</b> (recieve_uart → translate_uart → transmit_uart)<br>${st('wait F0',up===0)} → ${st('uart_flag,7: next = command',up===1)} → ${st('status sent; which_flag,0 → send_audio',up===2)}</div>
      <div class="small" style="margin-top:8px"><b>SPI</b> (timer_check sets spi_transmit,0 every 3.33 ms)<br>${st('send F0',!(sp&2))} ⇄ ${st('send data',!!(sp&2))} · receive: ${st('F0 seen',!!(sp&4))}</div>
      <div class="small" style="margin-top:8px"><b>Slave</b>: ${st('off',L<0||!!(L&0x20))} ${st('on',L>=0&&!(L&0x20))} · audio_count ${sv('A.acount',t,'—')} → 0 forces it off</div>`;
    const bits=[[7,'input 3'],[6,'input 1'],[5,'SLAVE (MIX)'],[4,'spare'],[3,'input 5'],[2,'input 6'],[1,'input 4'],[0,'input 2']];
    m.querySelector('#reg').innerHTML = `<table class="kv"><tr>${bits.map(([b])=>`<th class="mono">b${b}</th>`).join('')}</tr><tr>${bits.map(([b,n])=>`<td class="small">${n}</td>`).join('')}</tr><tr>${bits.map(([b])=>`<td class="mono" style="${L>=0&&!((L>>b)&1)?'color:var(--accent);font-weight:700':''}">${L<0?'—':(L>>b)&1}</td>`).join('')}</tr></table>
      <p class="small muted">Active low: 0 = lit / selected. The odd order is the 74HC165/74HC4094 wiring (IN1 = D2, IN2 = D3 …) folded back by <span class="mono">input</span>; <span class="mono">video_table</span> = BF FE 7F FD F7 FB for inputs 1–6 and <span class="mono">switch_check</span> tests bits 6, 0, 7, 1, 3, else 6. The same byte is the LED latch, the crosspoint choice and the source of both status bytes.</p>`;
    m.querySelector('#proto').innerHTML = `<table class="kv"><tr><th>bytes</th><th>manual</th><th>21v101.asm does</th></tr>
      <tr><td class="mono">F0 00</td><td>request status</td><td>status_check: <span class="mono">1 S v6…v1</span>, then send_audio <span class="mono">0 S a6…a1</span> (1 = selected), no F0 header</td></tr>
      <tr><td class="mono">F0 01aaaaaa</td><td>sum audio</td><td>sum_audio: ~byte to SPI with bit 6 = 0; also <b>turns SLAVE off</b></td></tr>
      <tr><td class="mono">F0 80</td><td>cancel sum</td><td>cancel_sum: audio register re-sent with bit 6 = 1</td></tr>
      <tr><td class="mono">F0 10vvvaaa</td><td>switch audio and video</td><td>video_table(v), audio_table(a); <b>SLAVE goes off</b> (table values have bit 5 = 1); v or a = 7 runs off the end of the table</td></tr>
      <tr><td class="mono">F0 11000iii</td><td>slave A+V to input i</td><td>not_on: only if SLAVE is already on; otherwise the “;test” lines just turn SLAVE on and keep the old inputs</td></tr>
      <tr><td class="mono">F0 C0</td><td>slave indicator <b>on</b></td><td>label <span class="mono">slave_off</span>: bsf video_reg,5 → <b>off</b></td></tr>
      <tr><td class="mono">F0 C7</td><td>slave indicator <b>off</b></td><td>label <span class="mono">slave_on</span>: bcf video_reg,5 → <b>on</b></td></tr>
      <tr><td class="mono">xx (no F0)</td><td>—</td><td>transmit_flag,0 stays set → the old transmit_reg is sent again</td></tr></table>`;
    m.querySelector('#spi').innerHTML = `<table class="kv"><tr><th>byte</th><th>POD21 → POD2 (MOSI)</th><th>POD2 → POD21 (MISO)</th></tr>
      <tr><td class="mono">F0</td><td colspan="2">header, every other tick; the data byte must follow it (spi_transmit,2 / spi_flag,2)</td></tr>
      <tr><td class="mono">1 S v6…v1</td><td>status (active low), S = 0 when SLAVE is on</td><td><span class="mono">1 s a6…a1</span>: audio status → <span class="mono">audio</span>, reloads audio_count</td></tr>
      <tr><td class="mono">0 1 v6…v1</td><td>command for 32 messages after a press with SLAVE on</td><td>command (only while POD21 reports SLAVE): after 7 of them remote_flag,0 → router follows</td></tr>
      <tr><td class="mono">0 x a6…a1</td><td>relayed RS-485 audio command (spi_output_temp), 32 times</td><td>—</td></tr></table>
      <p class="small muted">The POD2 needs 4 commands (spi_rec_count = 4), the POD21 needs 7 (8 the first time after reset). The POD2 can only answer with the byte it loaded after the previous exchange, so every reply is one SPI byte (3.33 ms) late.</p>`;
    m.querySelector('#ver').innerHTML = `<table class="kv"><tr><th>folder</th><th>date</th><th>MCU</th><th>what changes</th></tr>
      <tr><td class="mono">21v100</td><td>—</td><td>PIC16C73A (OTP)</td><td>IA1 on RB3, OA1/OA2 on RB6/RB7</td></tr>
      <tr><td class="mono">21v101</td><td>${Y(2002)} Jul 12</td><td>PIC16F874</td><td>IA1 → RD5, OA → RD6/RD7: frees RB3 (PGM) and RB6/RB7 (ICSP) for H3. Released; test report ${Y(2010)} “modified code to work with ICD3”.</td></tr>
      <tr><td class="mono">21v101CTV</td><td>${Y(2007)} May 15</td><td>PIC16F874</td><td>MUTED_INPUT (IA = 111) + ≈4.2 ms delay before every switch “so the SD404 can see a no lock and reset the clock buffers”</td></tr>
      <tr><td class="mono">21v101t / 21v102.asm</td><td>—</td><td>PIC16F874</td><td>header still “Version 1.01”; constant1 = 100 for all 0x20 counts; boots 0x9F (slave lit); spare and SLAVE buttons commented out</td></tr>
      <tr><td class="mono">Custom 21vCUSTOM</td><td>${Y(2002)} Aug 7</td><td>PIC16F874</td><td>two POD21s cascaded as a 12×1 with the SLAVE button; no remote (Pod21manCustom.wpd)</td></tr>
      <tr><td class="mono">21r100 … 21r200</td><td>${Y(2000)}–${Y(2005)}</td><td>16C73A → 16F874 → 16F73 → 16F874</td><td>POD21R remote; com_timeout added by Tim Clarke (Aug 8, ${Y(2000)}); r2.00 on the POD2 ISS5 board</td></tr></table>`; };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__pod21Keys=false;
  const F=(h,b)=>`<div class="card"><h2>${h}</h2>${b}</div>`;
  m.innerHTML = F('What the POD21 firmware is up to', `<ol class="small" style="padding-left:18px">
    <li><b>The manual has the slave commands backwards.</b> POD21-MANUAL.pdf: “The Slave indicator … may be turned on by sending F0, C0 and turned off by F0, C7.” In <span class="mono">translate_uart</span>, C0 (low bits 000) jumps to <span class="mono">slave_off</span> (<span class="mono">bsf video_reg,5</span>) and C7 to <span class="mono">slave_on</span>. The POD21R remote agrees with the code: <span class="mono">slave_off_stuff</span> sends C0. Try the “PC” scenario.</li>
    <li><b>“Switch audio and video” cancels slave mode.</b> Every <span class="mono">video_table</span> value (BF FE 7F FD F7 FB) has bit 5 set, and bit 5 = 1 means SLAVE off. A remote press of a video button (which sends 10vvvaaa) therefore also drops audio-follow-video.</li>
    <li><b>“Slave A+V to input i” only works if slave is already on.</b> In <span class="mono">not_on</span>, the lines marked <span class="mono">;test</span> overwrite both the SPI command and <span class="mono">video_reg</span> when <span class="mono">pre_output,5</span> is set: the unit turns SLAVE on but stays on its old inputs.</li>
    <li><b>A stray byte makes it repeat itself.</b> <span class="mono">recieve_uart</span> sets <span class="mono">transmit_flag,0</span> on every byte; only the F0 path clears it. A byte that does not follow F0 leaves the flag set, and <span class="mono">transmit_uart</span> sends the old <span class="mono">transmit_reg</span> again (scenario “stray”). A new F0 arriving between the two reply bytes clears the flag and the audio byte is never sent.</li>
    <li><b>SLAVE cannot stay on without an audio switcher.</b> <span class="mono">timer_check</span> counts <span class="mono">audio_count</span> down every 3.33 ms; only an audio status on SPI reloads it. After 32 ticks (106.7 ms) it sets <span class="mono">audio = 0xFF</span> and switches SLAVE off. The manual does not say this.</li>
    <li><b>No vertical-interval switching.</b> The crosspoint is written in the same pass that the debounce or a command completes, so the cut lands anywhere in the picture (red ticks on the OUTPUT lane). Nothing on the board extracts H or V timing. The CTV build of ${Y(2007)} adds a ≈4.2 ms mute to input 7 before every switch “so the SD404 can see a no lock and reset the clock buffers” — field evidence that the raw cut upset downstream equipment.</li>
    <li><b>The CTV mute freezes the whole main loop.</b> <span class="mono">delay</span> is a busy loop (5 × 256 × 4 Tcy). RS-485 bytes keep arriving: three in 4.2 ms overflow RCREG (OERR), and the next <span class="mono">recieve_uart</span> resets CREN and loses them. Scenario “CTV”.</li>
    <li><b>Bank bug in init.</b> <span class="mono">movwf spi_count</span> runs with RP0 = 1 (just after SPBRG), so it writes 0xAF in bank 1, not <span class="mono">spi_count</span> (0x2F). Harmless: <span class="mono">spi_count</span> is only counted down in <span class="mono">SPI_master</span> and never used. The remote does the same with <span class="mono">timer_end0/1</span>.</li>
    <li><b>Variables declared in program memory.</b> <span class="mono">org 20h</span> followed by <span class="mono">res 1</span> lines, then <span class="mono">ORG 4H</span>: in MPASM absolute mode <span class="mono">res</span> just advances the program counter, so the labels get the values 0x20…0x45 that are then used as RAM addresses, and the code at 0x05 onward overwrites nothing because <span class="mono">res</span> emits no words. It works by convention, not by design.</li>
    <li><b>RE0/RE1 drive the CLC016 rate pins but are never written.</b> <span class="mono">TRISE = 11100000</span> makes RE0–RE2 outputs (the comment “E2=AUD1 LED, E1=AUD2 LED, E0=ERROR LED” is from another product). The netlist puts RE0/RE1 on the CLC016 RD0/RD1 nets, pulled up by R74/R75 1K. PORTE powers up undefined, so the selected VCO range depends on the latch at power-up (${inf}: whether the CLC016 auto-selects anyway is not in the archive).</li>
    <li><b>Pins moved for in-circuit programming.</b> v1.00 (PIC16C73A) drove IA1 on RB3 and OA1/OA2 on RB6/RB7. v1.01 moved them to RD5/RD6/RD7. Issue 2 routes RB3 (PGM), RB6, RB7 and MCLR to the H3 2×3 header — an ICSP port that the OTP part never needed.</li>
    <li><b>INPUT1 is not like the others.</b> The INPUT1 macro leaves LOAD high and toggles CNFG low-high-low; INPUT2–6 pulse LOAD and CNFG high-low. Its first comment also says “SET LOAD” where the others say “clear LOAD”.</li>
    <li><b>An abandoned synchronised switch.</b> <span class="mono">synch_check</span> in <span class="mono">timer_check</span> still counts <span class="mono">switch_count</span> down and sets <span class="mono">switch_flag,1</span>, but the test of that flag in <span class="mono">switch_check</span> is commented out. Switching was once meant to wait for 8 ticks (26.7 ms).</li>
    <li><b>Two buttons at once.</b> <span class="mono">input</span> clears both bits, the LEDs show both, the status reports both, and <span class="mono">switch_check</span> routes the first in the order 1, 2, 3, 4, 5, 6.</li>
    <li><b>Without an audio switcher the remote encodes audio “7”.</b> The status's audio byte is 00, the remote complements it to FF, and <span class="mono">uart_setup</span> counts past all six bits → 7. The POD21 then calls <span class="mono">audio_table</span> with W = 7, which runs off the table into its <span class="mono">return</span> and relays 0x07 on SPI 32 times. Harmless when nothing is listening.</li>
    <li><b>The POD21R slave button relies on still being held.</b> <span class="mono">input</span> recomputes <span class="mono">slave_flag</span> from <span class="mono">pre_output_video</span> on every pass while SLAVE is down; <span class="mono">output_video</span> toggles that bit at the end of the debounce, and the next pass flips <span class="mono">slave_flag</span> to the new state. A status reply arriving between the toggle and the next transmit restores the old bit and the press is lost (${inf}: rare, needs the reply to land in that window).</li>
    <li><b>Leftovers.</b> <span class="mono">reset_uart</span> re-programs SPBRG/TXSTA/RCSTA after every received byte; <span class="mono">init_loop</span> re-writes ADCON1 and the TRIS registers every pass; <span class="mono">bsf spi_output,6</span> in <span class="mono">status_check</span> is overwritten before it is ever sent; the remote's <span class="mono">video_audio</span> toggle every 128 ticks is forced straight back to video. The interrupt vector is a lone RETFIE: no interrupts are used.</li>
    </ol>`)
  + F('Archive and file notes', `<ul class="small" style="padding-left:18px">
    <li><b>Misfiled report:</b> <span class="mono">POD21 - #TESTREPORT/POD22-V103-13JUN11.pdf</span> is a POD22 “High Resolution” LED-bar-graph upgrade for CTV (${Y(2011)}), not a POD21 report.</li>
    <li><b>Test reports (scanned, read by eye):</b> POD21 ISS 2 PCB, firmware V101, 19 May ${Y(2010)}, note “modified code to work with ICD3 programmer” — no such change is visible in <span class="mono">21v101.asm</span> (the .err log is dated Jan ${Y(2010)}). POD21R V200 was built on a <b>POD2 ISS 5 (surface-mount) board</b> instead of the ISS 2 board.</li>
    <li><b>Which board issue?</b> The Gerbers say ISS3, <span class="mono">PCB/WORKING/pod21iss3-NOT RELEASED.pcb</span> says not released, and the ${Y(2016)} pick-and-place is for iss2. The iss2 ECO log (17 Jun ${Y(2002)}) changes a “U8 PIC16F73” value.</li>
    <li><b>Duplicates:</b> <span class="mono">Custom/May 17, 2002</span> = <span class="mono">July 28, 2003</span> = <span class="mono">Pod21 - POD - REMOTE - Software VIDEO/pod21c.asm</span>; <span class="mono">August 7, 2002</span> = <span class="mono">POD21-032</span>; <span class="mono">August 31, 2007</span> = <span class="mono">POD21-028</span>. <span class="mono">21r200/21r102.asm</span> is r2.00 under the r1.02 file name. <span class="mono">POD21  #Engineering #TIM</span> is an empty skeleton.</li>
    <li><b>Stray artwork:</b> <span class="mono">SILK/POD2SILK.CDR</span> is the POD2 panel, filed in POD21's SILK folder.</li>
    <li><b>Artwork used here:</b> <span class="mono">Pod21silk.cdr</span> has no SILK PDF in a 2016 drafting set. libcdr dropped the text alignment (labels came out end-anchored), so every label was re-centred on the drawing's own drill crosshairs; the multi-line mains warning was re-broken into its three lines. No photograph of a POD21 is archived: the rocker, button caps, LED colour and mains hardware are drawn from the panel drawings in <span class="mono">POD21MANU.cdr</span> (${inf}).</li>
    </ul>`)
  + F('Assumptions in this model', `<ul class="small" style="padding-left:18px">
    <li>Busy-branch cycle counts, the 72 ms power-up timer (config bits are not in any source), a 150 ms mouse press, POD2 debounce latency (30 ms) and the remote's Timer2 phase are ${inf}.</li>
    <li>The POD2 end of the SPI link is modelled from <span class="mono">pod2v200.asm</span>'s SPI routines only; how it applies a command to its own relays is simplified. MISO with nothing connected reads 0xFF (${inf}).</li>
    <li>The remote runs at the same 4.9152 MHz (SPBRG = 7 for 9600 Bd requires it) and its LEDs are active low like the switcher's (${inf}).</li>
    <li>Video sources, their phases and the picture content are illustrative. The SDI line structure (1716/1728 words, EAV/SAV, RP168 switching lines 10/273 and 6/319) is from the standards, not the archive.</li></ul>`);
}

/* ---------------- register ---------------- */
SIM.register({
  id:'pod21', product:'POD21', family:'POD series', folder:'#POD #SERIES/POD21 - #Master',
  name:'POD21 · 6×1 SDI video switcher with audio-follow-video ('+Y(2002)+')', year:2002, depth:'Full model',
  summary:'A half-rack 6×1 serial digital video switcher: six CLC014 equalisers, a CLC018 crosspoint, a CLC016 retimer and a PIC16F874 that scans seven lit buttons. It slaves a POD2 or POD10 audio switcher over SPI for audio-follow-video and takes RS-485 commands from the POD21R remote or a PC. This model runs the v1.01 assembly and the r2.00 remote pass by pass.',
  highlights:['21v101.asm and the POD21R 21r102.asm ported routine by routine, with the POD2 answering on SPI','Real panels cut from Pod21silk.cdr (Inkscape), labels re-anchored on the drill crosshairs','Timeline from SDI lines down to single SPI and UART bits, with the RP168 switching line marked','The manual has F0 C0 / F0 C7 backwards; SLAVE drops after 107 ms with no audio switcher','CTV 2007 mute build and the 21v102 test branch selectable'],
  duration:1,
  stepUnits:[ {label:'1 main-loop pass ('+SIM.fmtDur(C.PASS*TCY)+')', period:()=>C.PASS*TCY}, {label:'1 Timer2 tick (3.33 ms)', period:()=>C.T2_FAST*TCY}, {label:'1 UART bit (104 µs)', period:()=>BIT_T}, {label:'1 SDI line', period:()=>STD[D.std].H}, {label:'1 SPI bit (814 ns)', period:()=>TCY}, {label:'1 field', period:()=>STD[D.std].field} ],
  zooms:[[1,'1 s'],[0.1,'100 ms'],[0.01,'10 ms'],[0.002,'2 ms'],[0.0005,'500 µs'],[0.0001,'100 µs'],[0.00002,'20 µs']],
  defaultZoom:0,
  init(){ if (!D.init) resetAll(); },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the POD21', render:viewTutorial},
    {id:'second', label:'One second, frame by frame', render:viewAnatomy},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
