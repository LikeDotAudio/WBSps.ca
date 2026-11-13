/* =====================================================================
   POD23 / POD23A — remote control panel for the DA305A leveller DA and the POD22 meter
   (Ward-Beck Systems, POD23 2003|36, POD23A 2004|37)
   Plugin for the WBS Device Simulator (../siumulation.html)

   Sources used (all under #POD #SERIES/POD23 - #Engineering/ unless noted):
   - POD23 - #Software/POD23A - #SOFTWARE #POD23A/POD23 - #SOFTWARE #POD23A #v100/
       pod23.asm (main, display_version, input_routine, debounce, knob_setup, display1..6, display_reset,
       loss_com_display), init.asm (pins, char codes, constants, defaults, SPBRG 7, T2CON 0x7F, write1..6 macros),
       encoder2..6.asm (NEXT state tables), level/target/ratio/range/threshold/peak/address/output.asm,
       uart.asm (txuart, communication_control, pole, scanuart, settxdata, loss_of_com, processdata,
       timer_uart, cycle_data), encpbb-88.pjt (/c-, 4 MHz simulator setting), pod23.err
   - …/#R&D Nov 09/pod23.asm (banner diff), …/#CTV, …/#AMS8 (variants, by README)
   - POD23 - #Software/POD23 - #SOFTWARE #554265/ (2003 two-knob panel: pod23.asm, level.asm, lrlevel.asm,
       address.asm, uart.asm, init.asm, Project 554265 Instructions.doc)
   - POD23 - #Software/POD23 - #SOFTWARE #working/POD23Com/ Da305rev/uart305.asm, POD22/uart.asm (the receivers)
   - POD23 PROTOCOLv2.wpd (12 Mar 2004) and POD23 PROTOCOL.wpd (preliminary)
   - XXX - POD22 - #Master # Obsolte/POD22 - #Engineering/Software/554265/pod22v1.asm, uart.asm (the POD22 master for #554265,
     Nov 2004; Corrected 2026|59, see pod22.js)
   - POD23 - #NAB 2004/nab04 ctl pnl2.net, .bom (the POD23A board: PIC16F877 QFP44, 6× SLG2016,
       74HC138, 74HC165, 2× 75176, X1 4.9152 MHz) · POD23 - #PCB/POD23iss1.net, .bom (2003 board, 2× PDSP1884)
   - POD23 - #SILK/POD23-Silk.cdr (2003) and POD23-SilkV2.cdr (2004), converted with Inkscape (libcdr)
       → assets/pod23-front.svg (2003), pod23-a-front.svg (POD23A, V2), pod23-rear.svg (vector, 2026|59; replace the earlier PNG cuts)
   - POD23 - #MECHANICAL/*.dwg.md and #Poduction Assembly/POD23-2 ASSEMBLY.dwg.md (recovered text only:
       "EXTRA FINE TEXTURED WBS BLACK", "5 PITCHES @ 1.250 CENTRES", ".032 GREY CHROMA FILTER",
       "DB 9PIN CONNECTOR", "THIS ASSEMBLY IS FOR POD23A")
   No photo of the unit and no manual exist in the archive. Anything not in those files is marked "inferred".
   ===================================================================== */
(function(){
const SIM = window.SIM;
const inf = '<span class="tag-inf" title="Not stated in the source; inferred">inferred</span>';
const Y = y => SIM.year(y);
const hex2 = v => '0x'+(v&255).toString(16).padStart(2,'0').toUpperCase();
const hx = v => (v&255).toString(16).padStart(2,'0').toUpperCase();
const ch = c => c.charCodeAt(0);

/* ---------------- constants from the source and the board ---------------- */
const FOSC = 4.9152e6;                 // X1 4.9152 (nab04 ctl pnl2.bom). The .pjt says 4 MHz: that is only the MPLAB simulator setting
const TCY = 4/FOSC;                    // 813.8 ns
const BAUD = FOSC/(64*(7+1));          // TXSTA = 0x20 (BRGH = 0), SPBRG = 7 → exactly 9600
const BIT_T = 1/BAUD, BYTE_T = 10*BIT_T;
const C = {
  T2_TICK: 16*16*256*TCY,              // T2CON = 0x7F (1:16 pre, 1:16 post), PR2 = 255 → 53.33 ms
  OST: 1024/FOSC,                      // XT/HS start-up timer; PWRTE unknown (config bits not in source) — INFERRED off
  INIT_TCY: 330,                       // init: straight-line code, counted by hand
  BANNER_IT: 256*40,                   // window_counter (0 → 256) × window_counter1 (window = 40)
  BANNER_IT_TCY: 318,                  // one display_version iteration, counted by hand (5 × display write + loads)
  EDGE_T: 0.005,                       // one quadrature edge while a knob is turned: 4 edges = 20 ms a click — INFERRED
  PUSH_T: 0.15,                        // a press holds SELECT for 150 ms — INFERRED
  DA_LAT: 0.003, DA_GAP: 0.0002,       // DA305A reply latency after AA and between its two bytes — INFERRED
  COUNTER_200: 218, TIME_UART: 20, POLE_TIME: 8, COM_TIME: 245, COM_COUNT: 2,
};
/* the main-loop pass, step by step (Tcy counted by hand from pod23.asm — INFERRED to ±20 %) */
const STEPS = [
  ['clrwdt · input_routine', s=>62, 'Read RB3 (SELECT push) and the A/B pins of encoders 2–6; clear mode, mode1…mode5'],
  ['encoder_routine2 … encoder_routine6', s=>170, 'NEXT state tables decode one quadrature step per click'],
  ['debounce · knob_setup', s=>22, '16 equal passes accept a press; knob_setup flips disctl1 (upper ⇄ lower row)'],
  ['level_mode1 · level_dis1', s=>s.up?78:10, 'LEVEL: ±15 dB in 1 dB steps (code 165…225, 2 per dB)'],
  ['target_mode1 · target_dis1', s=>s.up?62:10, 'TARGET −40 … −12 dB (only with a leveller output)'],
  ['ratio_mode1 · ratio_dis1', s=>s.up?60:10, 'RATIO 1:1 … 1:12'],
  ['range_mode1 · range_dis1', s=>s.up?60:10, 'RANGE 2 … 24 dB'],
  ['threshold_mode1 · threshold_dis1', s=>s.up?10:62, 'THRESHOLD −70 … −40 dB in 5 dB steps'],
  ['peak_mode1 · peak_dis1', s=>s.up?10:60, 'PEAK LIMIT −12 … 0 dB'],
  ['address_mode2 · address_dis2', s=>s.up?48:18, 'SELECT: address A1…A10; recall that address’s output and leveller flags'],
  ['output_mode2 · output_mode_dis1/2', s=>s.up?14:72, 'OUTPUT 1 / OUTPUT 2: ST, MN, TN, LV'],
  ['loss_com_display', s=>s.err?300:5, 'If tx,1: write “**** COMM ERR  ****” to displays 3–6'],
  ['display2 … display6', s=>276, 'Write 5 × 4 characters to the SLG2016s through the 74HC138'],
  ['display_reset', s=>9, 'TMR2IF: activity counter (218 × 53.3 ms) → back to the upper row'],
  ['communication_control · pole · cycle_data · scanuart · loss_of_com · processdata · settxdata', s=>62, 'Link bookkeeping'],
  ['txuart · timer_uart', s=>22, 'At most one byte per 20 passes'],
];
const stepTcy = s => STEPS.map(x=>x[1](s));
const passTcy = s => stepTcy(s).reduce((a,b)=>a+b,0);

/* ---------------- tables copied from the asm ---------------- */
const N5 = [0,20,0xCA,0, 0,4,4,28, 16,8,8,12, 12,4,24,12, 16,0x95,8,16, 0,20,20,28, 16,24,24,12, 28,4,24,28];   // NEXT3/5/7/9/11
const N6 = [0,28,6,0, 4,1,8,4, 8,4,12,8, 12,8,16,12, 16,12,20,16, 20,16,24,20, 24,20,28,24, 28,24,0,28];      // NEXT4/6/8/10/12
const RATIO_B = [0,128,170,191,204,213,219,223,227,230,232,234];   // ratio_table1
const D1 = n => String((10 - n%10)%10);
const OUTN = ['ST','MN','TN','LV'];
const KNOB = {1:'(unlabelled, E1)', 2:'SELECT / PUSH', 3:'LEVEL / OUTPUT 1', 4:'TARGET / OUTPUT 2', 5:'RATIO / THRESHOLD', 6:'RANGE / PEAK LIMIT'};
const CMDN = ['Level','Delay','Target','Ratio','Range','Threshold','Peak','Output'];
const WRMAP = {5:1, 4:2, 3:3, 2:4, 1:5, 0:6};       // 74HC138 Yn → ~WRk (nab04 ctl pnl2.net: U1-10…15)
const WMAC = {                                      // write1…write6 macros as RC3/RC2/RC1 bit operations
  1:['s3','c2','s1','N','N','N','s3','s2','s1'], 2:['c3','c2','s1','N','N','N','s3','c2','s1'],
  3:['s3','s2','c1','N','N','N','s3','s2','s1'], 4:['c3','s2','c1','N','N','N','c3','s2','s1'],
  5:['s3','c2','c1','N','N','N','s3','c2','s1'], 6:['L','A','N','N','N','L','O'] };

/* ---------------- scenarios ---------------- */
const SCEN = {
  idle:   {name:'Running: A1, upper row, DA305A answering', power:-5.75, link:true, ev:[]},
  boot:   {name:'Power-up: the banner, then the first frame', power:-2.3, link:true, ev:[]},
  turn:   {name:'Turn LEVEL five clicks clockwise at 100 ms', power:-6.2, link:true, ev:[{t:0.1,type:'turn',k:3,dir:1,n:5}]},
  reverse:{name:'LEVEL up 3, then down 3: the reversal costs a click', power:-6.2, link:true, ev:[{t:0.1,type:'turn',k:3,dir:1,n:3},{t:0.32,type:'turn',k:3,dir:-1,n:3}]},
  lower:  {name:'PUSH at 150 ms, then OUTPUT 1 → LV and THRESHOLD up', power:-6.2, link:true, ev:[{t:0.15,type:'push',dur:0.15},{t:0.4,type:'turn',k:3,dir:1,n:3},{t:0.7,type:'turn',k:5,dir:1,n:2}]},
  level:  {name:'Leveller on (set earlier); spin TARGET 10 clicks fast', power:-6.2, link:true, ev:[{t:-2.6,type:'push',dur:0.15},{t:-2.2,type:'turn',k:3,dir:1,n:3},{t:-1.8,type:'push',dur:0.15},{t:0.1,type:'turn',k:4,dir:1,n:10,edge:0.0025}]},
  address:{name:'SELECT to A2 at 100 ms, then LEVEL down three clicks', power:-6.2, link:true, ev:[{t:0.1,type:'turn',k:2,dir:1,n:1},{t:0.35,type:'turn',k:3,dir:-1,n:3}]},
  comerr: {name:'DA305A unplugged: COMM ERR after the second time-out', power:-8.6, link:false, ev:[]},
  timeout:{name:'Lower row times out 11.6 s after the last change, not after the push', power:-13.95, link:true, ev:[{t:-2.0,type:'push',dur:0.15}]},
};
const PARTNERS = { da305:'DA305A leveller DA (replies C1 + address)', pod22:'POD22 loudness meter (replies 81 + address)' };

/* ---------------- device state (what the user controls) ---------------- */
const D = {
  variant:'a',               // 'a' = POD23A v100 (2004, six knobs) · 'two' = POD23 #554265 (2003, two knobs)
  scenario:'idle', start:{power:-5.75}, snap:null, link:true, partner:'da305', daAddr:0,
  events:[], log:[], jump:true, sel:3,
  B:null,                    // POD23 (2003) state-level model
};
function loadScenario(id){
  const s=SCEN[id]; D.scenario=id; D.snap=null; D.start={power:s.power}; D.link=s.link;
  D.events = JSON.parse(JSON.stringify(s.ev)).map(e=>(e.scn=true,e)); EMU_KEY='';
}

/* =====================================================================
   THE EMULATOR — POD23A v100 run pass by pass with the firmware's own variables,
   the SLG2016 bus through the 74HC138, the USART at 9600 8N1 and a DA305A on COM1.
   ===================================================================== */
const HORIZON = 1.0;
let EMU=null, EMU_KEY='';
function freshState(){
  const ten = v => new Array(10).fill(v);
  return { phase:'off', next:0, bootEnd:0, nextTick:Infinity, tmr2if:0,
    input2:0, bounce_reg2:0, bounce_count:10, bounce_flag:0, input_flag:16, input_flag1:0,
    modes:[0,0,0,0,0,0,0], st:[null,null,[0,0],[0,0],[0,0],[0,0],[0,0]], enc:[0,0,0,0,0,0,0],
    disctl1:0, level1:195, target_temp1:20, ratio_temp1:3, range_temp1:11, threshold_temp1:10, peak_temp1:12,
    target1:52, ratio1:191, range1:24, threshold1:120, peak1:0, output1:0, output2:0,
    output_mode:0, level_enable:0, source_mode:0, source_mode2:0, address_2temp:0, address_2:0,
    command1:0, tx_command:0, response:0, txflags:1, tx_flags:0, tx:0, timerx:C.TIME_UART,
    polecount0:0, polecount1:10, polecount2:1, comout2:0, comout3:C.COM_TIME, com_counter:C.COM_COUNT,
    uart0:0, uart1:0, uart_mode:0, activity_flag:0, counter200:C.COUNTER_200, counter5:1,
    slot:{lv:ten(195), tg:ten(20), ra:ten(3), rg:ten(11), th:ten(10), pk:ten(12), out:ten(0), lev:ten(0), s1:ten(0), s2:ten(0)},
    dis:[null,[32,32,32,32],[32,32,32,32],[32,32,32,32],[32,32,32,32],[32,32,32,32],[32,32,32,32]],
    pe:0, pd:0x7F, rc:[0,0,0], ram:[null,[32,32,32,32],[32,32,32,32],[32,32,32,32],[32,32,32,32],[32,32,32,32],[32,32,32,32]],
    rc0:0, rc0LowAt:-1e9, tsrEnd:-1e9, fifo:[], oerr:0,
    pend:[],                 // bytes on the wire waiting to be delivered {t (end), start, to:'P'|'D', b}
    da:{buf:null, regs:{}, frames:0}, link:true, on:false, passN:0 };
}
function shiftState(S, dt){
  S.next-=dt; S.bootEnd-=dt; S.nextTick-=dt; S.rc0LowAt-=dt; S.tsrEnd-=dt; S.pend.forEach(p=>{p.t-=dt; p.start-=dt;});
  return S;
}
function emulate(){
  const key = JSON.stringify([D.start, D.events, D.link, D.partner, D.daAddr, D.snap?1:0]);
  if (EMU && key===EMU_KEY) return EMU;
  EMU_KEY = key;
  const sig={}, notes=[], items=[], passes=[], snaps=[];
  const rec=(k,t,v)=>{ const a=sig[k]||(sig[k]=[]); if (a.length){ const l=a[a.length-1]; if (l[1]===v) return; if (t<=l[0]){ l[1]=v; return; } } a.push([t,v]); };
  const note=(t,txt,cls)=>{ if (t>-0.05) notes.push({t,txt,cls:cls||''}); };
  const ev = D.events.slice().sort((a,b)=>a.t-b.t);
  let S, t0;
  if (D.snap){ S = JSON.parse(JSON.stringify(D.snap)); t0 = 0; }
  else { S = freshState(); t0 = D.start.power; S.link = D.link; }
  const linkAt = t => { let on = D.snap ? D.snap.link : D.link; for (const e of ev) if (e.type==='link' && e.t<=t) on=e.on; return on; };
  /* ---- inputs as functions of time ---- */
  const turns = ev.filter(e=>e.type==='turn');
  const encCode = (k,t)=>{ let code=0; for (const e of turns){ if (e.k!==k) continue; const E=e.edge||C.EDGE_T, len=4*E*e.n; if (t<e.t || t>=e.t+len) continue;
      const ph=Math.floor((t-e.t)/E)%4; code = (e.dir>0 ? [2,3,1,0] : [1,3,2,0])[ph]; } return code; };
  const pushed = t => ev.some(e=>e.type==='push' && t>=e.t && t<e.t+(e.dur||C.PUSH_T));
  const ramStr = k => S.ram[k].slice().reverse().map(c=>String.fromCharCode(c)).join('');
  const recRam = t => { for (let k=1;k<=6;k++) rec('ram'+k, t, S.on ? ramStr(k) : null); };
  /* ---- the display bus: PORTE address, PORTD data, RC3/RC2/RC1 → 74HC138 → ~WR1…~WR6 ---- */
  const yOf = rc => rc[0] + 2*rc[1] + 4*rc[2];
  function busOp(op, ctx){
    const old = yOf(S.rc);
    if (op==='N') return;
    if (op==='L') return;                 // movlw: no port change
    if (op==='A'){ S.rc=[0,0,0]; }        // andwf portc with 0xF1
    else if (op==='O'){ S.rc=[1,1,1]; }   // iorwf portc with 0xFE
    else { const v = op[0]==='s'?1:0, b={'3':0,'2':1,'1':2}[op[1]]; S.rc[b]=v; }
    const nw = yOf(S.rc);
    if (old!==nw && WRMAP[old]){ const k=WRMAP[old]; S.ram[k][S.pe]=S.pd; if (ctx && k!==ctx.k && ctx.ghost) ctx.ghost.push(k); }
  }
  function displayK(k, ctx){
    for (let d=0; d<4; d++){ S.pe=d; S.pd=S.dis[k][3-d]; WMAC[k].forEach(op=>busOp(op, ctx)); }
  }
  /* ---- UART ---- */
  function txByte(t, b, why){
    const start=t+TCY, end=start+BYTE_T; S.tsrEnd=end;
    const it={dir:'tx', b, start, end, why}; if (end>-0.05) items.push(it);
    if (linkAt(start)) S.pend.push({t:end, start, to:'D', b});
  }
  function daReceive(t, b){             // DA305A / POD22 behaviour per POD23 PROTOCOLv2.wpd (its firmware for this frame is not archived)
    const da=S.da;
    if (b===0xFF){ da.buf=[]; return; }
    if (!da.buf) return;
    da.buf.push(b);
    const n=da.buf.length, cmd=da.buf[1], need = cmd===7 ? 6 : 5;
    if (n<need) return;
    const [ad, , resp, d1, d2] = da.buf; const term = da.buf[need-1]; da.buf=null;
    if (term!==0xAA){ note(t,`${D.partner==='pod22'?'POD22':'DA305A'}: frame not terminated by AA (${hex2(term)}) — dropped`,'warn'); return; }
    if (ad!==D.daAddr && ad!==129) return;
    da.frames++;
    const r = da.regs; if (cmd===7){ r.out1=d1; r.out2=d2; } else r[cmd]=d1;
    note(t,`${D.partner==='pod22'?'POD22':'DA305A'} @${ad}: frame complete, ${CMDN[cmd]||'cmd '+cmd} = ${cmd===7?d1+', '+d2:d1}${resp===0?' — handshake requested, replying':''}`,'rx');
    if (resp===0){
      const id = D.partner==='pod22' ? 0x81 : 0xC1;
      const s1=t+C.DA_LAT, e1=s1+BYTE_T, s2=e1+C.DA_GAP, e2=s2+BYTE_T;
      [[id,s1,e1],[ad,s2,e2]].forEach(([bb,s,e])=>{ const it={dir:'rx', b:bb, start:s, end:e, why:'reply'}; if (e>-0.05) items.push(it); S.pend.push({t:e, start:s, to:'P', b:bb, it}); });
    }
  }
  function podReceive(p){
    if (!S.on || S.phase!=='loop' && S.phase!=='banner'){ if (p.it) p.it.lost='POD23A off'; return; }
    if (!(S.rc0===0 && S.rc0LowAt<=p.start)){ if (p.it) p.it.lost='receiver disabled (RC0 high)'; note(p.t,`${hex2(p.b)} lost: the 75176 receiver was still disabled (RC0 = 1)`,'warn'); return; }
    if (S.fifo.length>=2){ S.oerr=1; if (p.it) p.it.lost='OERR'; note(p.t,`${hex2(p.b)} lost: RCREG FIFO full → OERR`,'warn'); return; }
    S.fifo.push(p.b);
  }
  function deliver(upto){
    for(;;){ S.pend.sort((a,b)=>a.t-b.t); if (!(S.pend.length && S.pend[0].t<=upto)) break; const p=S.pend.shift();
      if (!linkAt(p.start) || !linkAt(p.t)){ if (p.it) p.it.lost='link unplugged'; continue; }
      if (p.to==='D') daReceive(p.t, p.b); else podReceive(p); }
  }
  /* ---- one main-loop pass of pod23.asm ---- */
  function pass(t){
    const v=S, sl=S.slot; const tr=[];
    const up0 = !(v.disctl1&1);
    // input_routine
    v.input2 = pushed(t) ? 2 : 0;
    for (let k=2;k<=6;k++) v.enc[k]=encCode(k, t+40*TCY);
    v.modes=[0,0,0,0,0,0,0];
    // encoder_routine2..6
    for (let k=2;k<=6;k++){
      const s=v.st[k]; s[0]&=0xDC; s[1]&=0xDC;
      const temp=N5[(v.enc[k]|s[0])&0x1F]; s[0]=(temp|(s[0]&0xC0))&255;
      s[1]=N6[((s[0]&3)|s[1])&0x1F];
      const dn = s[0]&1, upE = !dn && (s[0]&2);
      if (dn||upE){ v.modes[k] = dn?2:1; v.input_flag1 |= 1<<(k-1); v.txflags|=1; if (k!==6) v.tx&=~0x80; v.tx&=~0x40; v.tx&=~0x02;
        tr.push(`encoder_routine${k}: NEXT table → encoder_${dn?'dn':'up'}${k}: mode${k-1},${dn?1:0} = 1, input_flag1,${k-1} = 1, txflags,0 = 1, tx,6 = 0 (no reply needed), tx,1 = 0`); }
    }
    // debounce + knob_setup
    if (v.bounce_flag&1){ if (v.input2) v.bounce_count=0; v.bounce_count++; if (v.bounce_count&64){ v.bounce_flag&=~3; v.bounce_count=0; } }
    else if (v.input2!==v.bounce_reg2 || v.input2===0){ v.bounce_count=0; v.bounce_reg2=v.input2; }
    else { v.bounce_count++; if (v.bounce_count&16){ v.input_flag|=1; v.bounce_flag|=3; v.txflags|=1; v.bounce_count=0; v.bounce_reg2=v.input2; } }
    if (v.input_flag&1){ v.input_flag&=~1; if (v.input2&2){ v.disctl1^=1; tr.push(`debounce: 16 equal passes → input_flag,0; knob_setup: pbdepress1 → disctl1 ^= 1 → ${v.disctl1?'lower row (PUSH functions)':'upper row'}`); } }
    const a=v.address_2temp, up=!(v.disctl1&1);
    const flag = b => { if (v.input_flag1 & b){ v.input_flag1&=~b; return true; } return false; };
    // level_mode1 / level_dis1
    if (up && flag(4)){ v.activity_flag=1; v.command1=0; const o=v.level1;
      if (v.modes[3]&1){ if (v.level1!==225){ v.level1+=2; sl.lv[a]=v.level1; } } else if (v.modes[3]&2){ if (v.level1!==165){ v.level1-=2; sl.lv[a]=v.level1; } }
      tr.push(`level_mode1: command1 = 0; level1 ${o} → ${v.level1} (${dbTxt(o)} → ${dbTxt(v.level1)} dB, 2 codes per dB, stops at 165 / 225); level_address → level_temp${a+1}`); }
    if (up){ v.level1=sl.lv[a]; const L=v.level1, idx=L-165, dd=String(Math.abs((idx>>1)-15)%10), d0=L<177, d1=L>=215, dig=d0||d1;
      v.dis[3]=[32, L===195?32:(L>=197?ch('+'):ch('-')), dig?ch('1'):ch(dd), dig?ch(dd):32]; }
    // target
    if (up && flag(8)){ if (v.level_enable){ v.activity_flag=1; v.command1=2; const o=v.target_temp1;
        if (v.modes[4]&1){ if (v.target_temp1!==28){ v.target_temp1++; sl.tg[a]=v.target_temp1; } } else if (v.modes[4]&2){ if (v.target_temp1!==0){ v.target_temp1--; sl.tg[a]=v.target_temp1; } }
        tr.push(`target_mode1: command1 = 2; target_temp1 ${o} → ${v.target_temp1} (${-40+o} → ${-40+v.target_temp1} dB)`); }
      else tr.push('target_mode1: level_enable = 0 → return (TARGET does nothing until an output is LV)'); }
    if (up){ v.target_temp1=sl.tg[a]; const i=v.target_temp1; v.target1=86-2*i;
      v.dis[4] = v.level_enable ? [32, ch('-'), ch(i===0?'4':i<=10?'3':i<=20?'2':'1'), ch(D1(i))] : [45,45,45,45]; }
    // ratio
    if (up && flag(16)){ if (v.level_enable){ v.activity_flag=1; v.command1=3; const o=v.ratio_temp1;
        if (v.modes[5]&1){ if (v.ratio_temp1!==11){ v.ratio_temp1++; sl.ra[a]=v.ratio_temp1; } } else if (v.modes[5]&2){ if (v.ratio_temp1!==0){ v.ratio_temp1--; sl.ra[a]=v.ratio_temp1; } }
        tr.push(`ratio_mode1: command1 = 3; ratio_temp1 ${o} → ${v.ratio_temp1} (1:${o+1} → 1:${v.ratio_temp1+1}, byte ${RATIO_B[v.ratio_temp1]})`); }
      else tr.push('ratio_mode1: level_enable = 0 → return'); }
    if (up){ v.ratio_temp1=sl.ra[a]; const i=v.ratio_temp1, dc=ch(String((i+1)%10)); v.ratio1=RATIO_B[i];
      v.dis[5] = v.level_enable ? [ch('1'), ch(':'), i<9?dc:ch('1'), i<9?32:dc] : [45,45,45,45]; }
    // range
    if (up && flag(32)){ if (v.level_enable){ v.activity_flag=1; v.command1=4; const o=v.range_temp1;
        if (v.modes[6]&1){ if (v.range_temp1!==23){ v.range_temp1++; sl.rg[a]=v.range_temp1; } } else if (v.modes[6]&2){ if (v.range_temp1!==1){ v.range_temp1--; sl.rg[a]=v.range_temp1; } }
        tr.push(`range_mode1: command1 = 4; range_temp1 ${o} → ${v.range_temp1} (${o+1} → ${v.range_temp1+1} dB)`); }
      else tr.push('range_mode1: level_enable = 0 → return'); }
    if (up){ v.range_temp1=sl.rg[a]; const i=v.range_temp1, u=ch(String((i+1)%10)); v.range1=2*(i+1);
      v.dis[6] = !v.level_enable ? [45,45,45,45] : i>=9 ? [32, ch(i>=19?'2':'1'), u, 32] : [32, u, 32, 32]; }
    // threshold (lower row)
    if (!up && flag(16)){ if (v.level_enable){ v.activity_flag=1; v.command1=5; const o=v.threshold_temp1;
        if (v.modes[5]&1){ if (v.threshold_temp1!==30){ v.threshold_temp1+=5; sl.th[a]=v.threshold_temp1; } } else if (v.modes[5]&2){ if (v.threshold_temp1!==0){ v.threshold_temp1-=5; sl.th[a]=v.threshold_temp1; } }
        tr.push(`threshold_mode1: command1 = 5; threshold_temp1 ${o} → ${v.threshold_temp1} (${-70+o} → ${-70+v.threshold_temp1} dB, steps of 5)`); }
      else tr.push('threshold_mode1: level_enable = 0 → return'); }
    if (!up){ v.threshold_temp1=sl.th[a]; const i=v.threshold_temp1; v.threshold1=140-2*i;
      v.dis[5] = !v.level_enable ? [45,45,45,45] : [32, ch('-'), ch(i===0?'7':i>=11?(i>=21?'4':'5'):'6'), ch(D1(i))]; }
    // peak
    if (!up && flag(32)){ if (v.level_enable){ v.activity_flag=1; v.command1=6; const o=v.peak_temp1;
        if (v.modes[6]&1){ if (v.peak_temp1!==12){ v.peak_temp1++; sl.pk[a]=v.peak_temp1; } } else if (v.modes[6]&2){ if (v.peak_temp1!==0){ v.peak_temp1--; sl.pk[a]=v.peak_temp1; } }
        tr.push(`peak_mode1: command1 = 6; peak_temp1 ${o} → ${v.peak_temp1} (${o-12} → ${v.peak_temp1-12} dB)`); }
      else tr.push('peak_mode1: level_enable = 0 → return'); }
    if (!up){ v.peak_temp1=sl.pk[a]; const i=v.peak_temp1, c=ch(String((12-i)%10)); v.peak1=24-2*i;
      v.dis[6] = !v.level_enable ? [45,45,45,45] : [32, i===12?32:ch('-'), i>=3?c:ch('1'), i>=3?32:c]; }
    // address
    if (up && flag(2)){ const o=v.address_2temp;
      if (v.modes[2]&1) v.address_2temp = o===9?0:o+1; else if (v.modes[2]&2) v.address_2temp = o===0?9:o-1;
      v.address_2 = v.address_2temp;
      tr.push(`address_mode2: address_2temp ${o} → ${v.address_2temp} (A${o+1} → A${v.address_2temp+1}); address_table → address_2 = ${v.address_2} (the byte sent is one less than the A-number)`); }
    const a2=v.address_2temp;
    if (up){ v.dis[2]=[32, ch('A'), ch(a2<9?String(a2+1):'1'), a2===9?ch('0'):32]; v.output_mode=sl.out[a2]; v.level_enable=sl.lev[a2]; }
    else v.dis[2]=[42,42,42,42];
    // output_mode2 (display) — runs BEFORE output_mode_dis1/2 in main
    if (!up){ v.output_mode=sl.out[a2]; v.level_enable=sl.lev[a2]; outputDisplay(v); }
    if (!up && flag(4)){ v.activity_flag=1; v.command1=7; const o=v.source_mode;
      v.source_mode = (v.modes[3]&2) ? (o===0?3:o-1) : (o===3?0:o+1);
      v.output_mode &= ~3; v.level_enable &= ~1; if (v.source_mode===1) v.output_mode|=1; if (v.source_mode===2) v.output_mode|=2; if (v.source_mode===3) v.level_enable|=1;
      sl.s1[a2]=v.source_mode; sl.out[a2]=v.output_mode; sl.lev[a2]=v.level_enable;
      tr.push(`output_mode_dis1: command1 = 7; source_mode ${o} → ${v.source_mode} (OUTPUT 1 ${OUTN[o]} → ${OUTN[v.source_mode]}); output_mode = ${v.output_mode}, level_enable = ${v.level_enable}; source1_address stores them for A${a2+1} (the display follows on the next pass)`); }
    if (!up && flag(8)){ v.activity_flag=1; v.command1=7; const o=v.source_mode2;
      v.source_mode2 = (v.modes[4]&2) ? (o===0?3:o-1) : (o===3?0:o+1);
      v.output_mode &= ~12; v.level_enable &= ~2; if (v.source_mode2===1) v.output_mode|=4; if (v.source_mode2===2) v.output_mode|=8; if (v.source_mode2===3) v.level_enable|=2;
      sl.s2[a2]=v.source_mode2; sl.out[a2]=v.output_mode; sl.lev[a2]=v.level_enable;
      tr.push(`output_mode_dis2: command1 = 7; source_mode2 ${o} → ${v.source_mode2} (OUTPUT 2 ${OUTN[o]} → ${OUTN[v.source_mode2]}); output_mode = ${v.output_mode}, level_enable = ${v.level_enable}`); }
    // loss_com_display, display2..6
    const tw = t + (stepTcy({up:!(v.disctl1&1), err:v.tx&2}).slice(0,11).reduce((p,q)=>p+q,0))*TCY;
    const ctx={k:0, ghost:[]};
    if (v.tx&2){ v.dis[3]=[42,42,42,42]; v.dis[4]=[ch('C'),ch('O'),ch('M'),ch('M')]; v.dis[5]=[ch('E'),ch('R'),ch('R'),32]; v.dis[6]=[42,42,42,42];
      for (let k=3;k<=6;k++){ ctx.k=k; displayK(k, ctx); } }
    for (let k=2;k<=6;k++){ ctx.k=k; displayK(k, ctx); }
    recRam(tw);
    // display_reset
    if (v.tmr2if){ v.tmr2if=0;
      if (v.activity_flag){ v.counter5=1; v.counter200=C.COUNTER_200; v.activity_flag=0; }
      else { v.counter200=(v.counter200-1)&255; if (v.counter200===0){ v.counter200=C.COUNTER_200; v.counter5=(v.counter5-1)&255; if (v.counter5===0){ v.counter5=1; if (v.disctl1&1) tr.push('display_reset: counter200 ran out (218 × 53.3 ms = 11.6 s with no knob activity) → disctl1,0 = 0: back to the upper row'); v.disctl1&=~1; } } } }
    // ---- UART ----
    const tu = t + (passTcy({up:!(v.disctl1&1), err:v.tx&2})-80)*TCY;
    // communication_control
    if (!(v.txflags&0x10) && (v.txflags&1)){ v.polecount2=(v.polecount2-1)&255; if (!v.polecount2){ v.polecount2=1; v.polecount1=C.POLE_TIME; v.polecount0=0; v.txflags|=0x40; } }
    // pole
    if (!(v.txflags&8) && !(v.txflags&0x10)){ v.polecount0=(v.polecount0-1)&255; if (!v.polecount0){ v.polecount1=(v.polecount1-1)&255; if (!v.polecount1){ v.polecount1=C.POLE_TIME; v.polecount0=0; v.txflags|=1; v.tx|=0x80; } } }
    // cycle_data
    if (v.tx&0x80){ v.tx&=~0x80; v.tx|=0x40; const o=v.command1; if (v.command1===7) v.command1=0; else { v.command1++; if (v.command1===1) v.command1=2; }
      tr.push(`pole: 2048 quiet passes → txflags,0, tx,7; cycle_data: command1 ${o} → ${v.command1} (${CMDN[v.command1]}), tx,6 = 1 (handshake: the product must reply)`); }
    // scanuart
    if (v.txflags&0x10){
      if (v.oerr){ v.oerr=0; v.fifo=[]; tr.push('scanuart: OERR → restart (CREN 0 → 1, twice)'); }
      else if (v.fifo.length){ const b=v.fifo.shift(); v.uart1=b; v.comout3=C.COM_TIME; v.comout2=0; v.com_counter=C.COM_COUNT;
        if (b&0x80){ v.uart0=b; tr.push(`scanuart: RCREG = ${hex2(b)} (bit 7 set) → uart0 = product ID`); }
        else { v.tx|=1; tr.push(`scanuart: RCREG = ${hex2(b)} (bit 7 clear) → uart1 = address, tx,0 = 1`); } } }
    // loss_of_com
    if (v.txflags&0x10){ v.comout2=(v.comout2+1)&255; if (!v.comout2){ v.comout3=(v.comout3+1)&255; if (!v.comout3){ v.comout3=C.COM_TIME; v.comout2=0; v.txflags&=~1; v.polecount2=1; v.polecount1=C.POLE_TIME; v.polecount0=0;
      v.com_counter=(v.com_counter-1)&255; if (v.com_counter){ tr.push('loss_of_com: 2816 passes with no reply (1st time-out) — keep waiting'); }
      else { v.com_counter=C.COM_COUNT; v.tx|=2; v.txflags|=0x80; tr.push('loss_of_com: 2nd time-out → tx,1 = 1 (COMM ERR on displays 3–6), txflags,7 = 1 (re-transmit)'); } } } }
    // processdata
    if (v.tx&1){ v.tx&=~1; if (v.uart1===v.address_2){ const id=v.uart0; if (id===0xC1) v.uart_mode&=~1; v.uart0=0; v.uart1=0; v.comout3=C.COM_TIME; v.comout2=0; v.txflags&=~0x10; v.tx&=~2;
        tr.push(`processdata: address ${v.address_2} matches; product ID ${hex2(id)} (${id===0xC1?'DA305A':id===0x81?'POD22':'?'}) → txflags,4 = 0 (reply received), tx,1 = 0`); } else tr.push(`processdata: address byte ${v.uart1} ≠ address_2 ${v.address_2} → ignored`); }
    // settxdata
    let start=false;
    if (v.txflags&0x80) start=true; else if (!(v.txflags&8) && !(v.txflags&0x10) && (v.txflags&0x40)) start=true;
    if (start){ v.polecount1=C.POLE_TIME; v.polecount0=0; v.txflags=0x08; v.tx_flags=0xFF; tr.push(`settxdata: start a frame → txflags = 0x08 (busy), tx_flags = 0xFF; command1 = ${v.command1} (${CMDN[v.command1]}), reply ${v.tx&0x40?'requested':'not requested'}`); }
    // txuart
    const trmt = S.tsrEnd <= tu;
    if (v.tx_flags&0x80){ v.tx_flags&=~0x80;
      if ((v.txflags&8) && trmt){
        if (v.tx_flags&1){ setRC0(tu,1); v.tx_flags&=~1; txByte(tu,0xFF,'framing'); }
        else if (v.tx_flags&2){ v.tx_flags&=~2; txByte(tu,v.address_2,'address'); }
        else if (v.tx_flags&4){ v.tx_command=v.command1; v.tx_flags&=~4; txByte(tu,v.command1,'command: '+CMDN[v.command1]); }
        else if (v.tx_flags&8){ const r=(v.tx&0x40)?0:1; v.response=r; v.tx_flags&=~8; txByte(tu,r,r?'response: none':'response: handshake'); }
        else if (v.tx_flags&16){ const c=v.tx_command; const d = c===0?v.level1:c===2?v.target1:c===3?v.ratio1:c===4?v.range1:c===5?v.threshold1:c===6?v.peak1:c===7?v.output1:null;
          if (d===null){ v.tx_flags&=~16; txByte(tu,v.target1,'data: delay_byte is commented out → falls into target_byte'); } else { v.tx_flags&=~16; txByte(tu,d,'data: '+CMDN[c]); } }
        else if (v.tx_flags&32){ v.tx_flags&=~32; if (v.tx_command===7) txByte(tu,v.output2,'data 2: output2'); }
        else if (v.tx_flags&64){ v.tx_flags&=~64; txByte(tu,0xAA,'termination'); }
        else { setRC0(tu,0); v.txflags&=~8; if (!(v.response&1)) v.txflags|=0x10; else v.txflags&=~0x10; v.uart_mode&=~0x60;
          tr.push(`txuart6: TSR empty → RC0 = 0 (75176 back to receive), txflags,3 = 0${v.response&1?'':'; txflags,4 = 1: wait for the reply'}`); }
      } }
    // timer_uart
    if (v.txflags&8){ if (!(v.tx_flags&0x40)) v.tx_flags|=0x80; else { v.timerx=(v.timerx-1)&255; if (!v.timerx){ v.timerx=C.TIME_UART; v.tx_flags|=0x80; } } }
    return tr;
  }
  function setRC0(t,val){ S.rc0=val; if (!val) S.rc0LowAt=t; rec('rc0', t, val); }
  function outputDisplay(v){
    const om=v.output_mode, d3=[32,0,0,32], d4=[32,0,0,32]; const set=(d,s)=>{ d[1]=ch(s[0]); d[2]=ch(s[1]); };
    const T = {0:['ST','ST',0,0,1],1:['MN','ST',1,0,1],2:['TN','ST',2,1,1],4:['ST','MN',0,1,1],5:['MN','MN',1,1,0],6:['TN','MN',2,1,0],8:['ST','TN',0,2,1],9:['MN','TN',1,2,0],10:['TN','TN',2,2,0]}[om];
    if (!T) return;
    set(d3,T[0]); set(d4,T[1]); v.output1=T[2]; v.output2=T[3];
    if (T[4]){ if (v.level_enable&1){ v.output1=3; set(d3,'LV'); } if (v.level_enable&2){ v.output2=3; set(d4,'LV'); } }
    v.dis[3]=d3; v.dis[4]=d4;
  }
  /* ---- the run ---- */
  let t = t0;
  const powerEv = ev.filter(e=>e.type==='power');
  function bootFrom(tp){
    const keepLink = S.link; const keepDa=S.da;
    S = freshState(); S.link=keepLink; S.da=keepDa; S.on=true; S.phase='boot';
    const tInit = tp + C.OST, tBanner = tInit + C.INIT_TCY*TCY;
    // init: PORTC = 0 (decoder on Y0 = ~WR6 low), PORTD = 0x7F, PORTE = 0xFD
    S.rc=[0,0,0]; S.pd=0x7F; S.pe=2;
    S.nextTick = tInit + C.INIT_TCY*TCY + C.T2_TICK;
    // banner: display_version writes WARD / BECK / " POD" / " 23A" / V100 on displays 2–6 (twice so the bus settles)
    S.dis[2]=[ch('W'),ch('A'),ch('R'),ch('D')]; S.dis[3]=[ch('B'),ch('E'),ch('C'),ch('K')]; S.dis[4]=[32,ch('P'),ch('O'),ch('D')]; S.dis[5]=[32,ch('2'),ch('3'),ch('A')]; S.dis[6]=[ch('V'),ch('1'),ch('0'),ch('0')];
    for (let r=0;r<2;r++) for (let k=2;k<=6;k++) displayK(k, null);
    S.phase='banner'; S.bootEnd = tBanner + C.BANNER_IT*C.BANNER_IT_TCY*TCY; S.next = S.bootEnd;
    rec('phase', tp, 'boot'); rec('phase', tBanner, 'banner'); recRam(tBanner);
    note(tp, 'Power on: oscillator start-up (1024 × Tosc), init: ports, USART 9600 (SPBRG = 7), TMR2 1:16/1:16, defaults (level 195 = 0 dB, A1, ST/ST, leveller off)', 'boot');
    note(tBanner, `display_version: “WARD” “BECK” “ POD” “ 23A” “V100” on displays 2–6, repeated 256 × 40 times ≈ ${(C.BANNER_IT*C.BANNER_IT_TCY*TCY).toFixed(2)} s`, 'boot');
  }
  if (!D.snap){ S.on=false; rec('phase', t0-1e-6, 'off'); recRam(t0-1e-6); bootFrom(D.start.power); }
  else { rec('phase', 0, S.on ? (S.phase==='loop'?'loop':S.phase) : 'off'); recRam(0); }
  let lastOn = S.on;
  const END = HORIZON + 0.0005;
  let guard = 0;
  while (guard++ < 60000){
    // power changes
    const pe = powerEv.find(e=>e.t>t && e.t<=S.next && e.t<=END && e.on!==lastOn);
    if (pe){ deliver(pe.t); if (!pe.on){ S.on=false; S.phase='off'; S.next=Infinity; rec('phase',pe.t,'off'); recRam(pe.t); setRC0(pe.t,0); note(pe.t,'Power off: the SLG2016s go dark; the panel forgets everything (no EEPROM in v100)','boot'); }
      else bootFrom(pe.t); lastOn=pe.on; t=pe.t; continue; }
    if (S.next > END){ deliver(END); break; }
    t = S.next; deliver(t);
    if (S.phase==='banner'){ S.phase='loop'; rec('phase', t, 'loop'); note(t,'Banner done → main loop starts; txflags,0 (set in init) sends a first Level frame at once','boot'); }
    while (S.nextTick <= t){ S.tmr2if=1; if (S.nextTick>-0.06) rec('tick', S.nextTick, S.nextTick); S.nextTick += C.T2_TICK; }
    rec('tickN', t, S.counter200);
    const up = !(S.disctl1&1), err = !!(S.tx&2);
    const L = passTcy({up, err})*TCY;
    const tr = pass(t);
    S.passN++;
    if (t>-0.06) passes.push({t0:t, t1:t+L, up, err, n:S.passN});
    if (t>=-0.002) snaps.push({t:t+L, s:JSON.stringify(S)});
    tr.forEach(x=>note(t,x,'fw'));
    rec('disctl1', t, S.disctl1&1); rec('err', t, S.tx&2?1:0); rec('busy', t, S.txflags&8?1:0); rec('wait', t, S.txflags&0x10?1:0);
    rec('cmd', t, S.command1); rec('addr', t, S.address_2temp);
    S.next = t + L;
  }
  sig.tick = sig.tick || [];
  EMU = {sig, notes, items, passes, snaps, ev, finalS:S};
  return EMU;
}
function dbTxt(L){ const d=(L-195)/2; return (d>0?'+':'')+d; }
function sigAt(k,t){ const a=EMU&&EMU.sig[k]; if(!a||!a.length) return undefined; let lo=0,hi=a.length-1; if (t<a[0][0]) return undefined; while(lo<hi){ const m=(lo+hi+1)>>1; if(a[m][0]<=t) lo=m; else hi=m-1; } return a[lo][1]; }
function stateAt(t){ const E=emulate(); const s=E.snaps; if (!s.length || t<s[0].t) return (D.snap && t>=0) ? {t:0, S:JSON.parse(JSON.stringify(D.snap))} : null; let lo=0,hi=s.length-1; while(lo<hi){ const m=(lo+hi+1)>>1; if(s[m].t<=t) lo=m; else hi=m-1; } return {t:s[lo].t, S:JSON.parse(s[lo].s)}; }
function passAt(t){ const ps=emulate().passes; let lo=0,hi=ps.length-1; if(!ps.length||t<ps[0].t0) return null; while(lo<hi){ const m=(lo+hi+1)>>1; if(ps[m].t0<=t) lo=m; else hi=m-1; } return ps[lo].t1>t?ps[lo]:null; }
function stepAt(t){ const p=passAt(t); if(!p) return {p:null, k:-1}; const tc=stepTcy({up:p.up, err:p.err}); let acc=0; const f=(t-p.t0)/TCY; for (let k=0;k<tc.length;k++){ acc+=tc[k]; if (f<acc) return {p,k}; } return {p,k:tc.length-1}; }
function ramAt(t){ emulate(); const r=[null]; for (let k=1;k<=6;k++) r.push(sigAt('ram'+k,t)); return r; }

/* ---------------- user actions ---------------- */
function act(name, fn){
  const tr=[]; fn(s=>tr.push(s));
  D.log.unshift({t:SIM.t, name, trace:tr}); if (D.log.length>60) D.log.length=60;
  SIM.refresh();
}
/* Move the run on: the state at the playhead becomes the new start and the playhead returns near 0 */
function rebase(t){
  const st = stateAt(t); if (!st) return false;
  const S = st.S; S.link = linkAt_(st.t); shiftState(S, st.t); D.snap = S; D.events = []; EMU_KEY=''; SIM.seek(0); return true;
}
function busyAt(t){ return D.events.some(e=>(e.type==='turn' && t>=e.t && t<e.t+4*(e.edge||C.EDGE_T)*e.n) || (e.type==='push' && t>=e.t && t<e.t+(e.dur||C.PUSH_T))); }
const A = {
  turn(k, dir, n){ n=n||1; if (D.variant==='two') return B_.turn(k,dir);
    let t=SIM.t; while (busyAt(t)) t+=0.002;
    if (t + 4*C.EDGE_T*n > 0.92 || t<0.0005){ rebase(Math.max(SIM.t,0.001)); t=0.02; }
    act(`Turn ${KNOB[k]} ${dir>0?'clockwise':'counter-clockwise'}${n>1?' × '+n:''}`, tr=>{
      if (k===1){ tr('E1 is wired to RA4/RA5 (ENCODER1A/B), but encoder_routine1 is commented out in v100: nothing reads it.'); }
      tr(`${n} click${n>1?'s':''} = ${4*n} quadrature edges on ${k===1?'RA4/RA5':['','','RA2/RA3','RA0/RA1','RB4/RB5','RC4/RC5','RB0/RB1'][k]}, starting at ${SIM.fmtT(t)} (${C.EDGE_T*1000} ms per edge, inferred)`);
      tr('The emulator re-ran the firmware: see the trace lines on the timeline and in the action log.');
      D.events.push({t, type:'turn', k, dir, n, user:true});
      if (D.jump) setTimeout(()=>SIM.seek(Math.min(0.999, t + 4*C.EDGE_T*n + 0.004)),0);
    }); },
  push(k){ if (D.variant==='two') return B_.push(k);
    let t=SIM.t; while (busyAt(t)) t+=0.002;
    if (t + C.PUSH_T > 0.9 || t<0.0005){ rebase(Math.max(SIM.t,0.001)); t=0.02; }
    act(`Press ${KNOB[k]} knob`, tr=>{
      if (k!==2){ tr(`Encoder E${k}'s push switch goes to the 74HC165 (U20), but read_switches is commented out in v100 (only SELECT was re-wired to RB3). Nothing happens.`); return; }
      tr('SELECT push pulls RB3 low (the “switch2 to portb,3” modification). debounce needs 16 equal passes, then knob_setup flips disctl1.');
      D.events.push({t, type:'push', dur:C.PUSH_T, user:true});
      if (D.jump) setTimeout(()=>SIM.seek(Math.min(0.999, t + 0.02)),0);
    }); },
  link(on){ let t=Math.max(SIM.t,0.001); if (t>0.95){ rebase(t); t=0.02; }
    act(on?`Plug the ${D.partner==='pod22'?'POD22':'DA305A'} into CONTROL`:'Unplug CONTROL', tr=>{ tr(on?'COM1 (U3 75176, half duplex) is connected again.':'Nothing answers on COM1 now. Frames that ask for a reply wait 2 × 2816 passes before COMM ERR.'); D.events.push({t, type:'link', on, user:true}); }); },
  power(){ let t=Math.max(SIM.t,0.001); const st=stateAt(t); const on = st ? st.S.on : true; if (t>0.95){ rebase(t); t=0.02; }
    act(on?'Power off':'Power on', tr=>{ tr(on?'Mains off at the 115 VAC inlet.':'Mains on: OST, init, then the 2.65 s banner.'); D.events.push({t, type:'power', on:!on, user:true}); }); },
  scenario(id){ loadScenario(id); D.log.unshift({t:0, name:'Scenario: '+SCEN[id].name, trace:['The emulator ran the firmware from power-on ('+SIM.fmtT(D.start.power)+') to the end of this second.']}); SIM.seek(0); SIM.refresh(); },
  next(){ act('Continue: run the next second', tr=>{ tr('The state at the end of this second becomes the new start (t = 0).'); rebase(0.999); }); },
  clear(){ D.events = D.events.filter(e=>!e.user); EMU_KEY=''; SIM.refresh(); },
};

/* =====================================================================
   POD23 (2003, project #554265) — state-level model of the two-knob panel
   ===================================================================== */
const B_ = {
  reset(){ D.B = {level1:195, level2:195, disctl1:1, address:0, address_mode:0, aes_lock:1, err:0, activity:0, actAt:-1, other:0}; },
  disp(){ const b=D.B; const lv = L=>{ const idx=L-165, dd=String(Math.abs((idx>>1)-15)%10), dig=(L<177||L>=215); return [L===195?' ':(L>=197?'+':'-'), dig?'1':dd, dig?dd:' ']; };
    if (b.err) return ['  COMM  ', '  ERROR '];
    if (!b.aes_lock) return ['   NO   ', '  LOCK  '];
    if (b.address_mode) return ['ADDRESS ', '    '+(b.address&1)+'   '];
    if (b.disctl1){ const s=lv(b.level1); return [' STEREO ', '   '+s.join('')+'  ']; }
    const l=lv(b.level1), r=lv(b.level2); return [' LT '+l.join('')+' ', ' RT '+r.join('')+' ']; },
  turn(k, dir){ const b=D.B; act(`Turn ${k===1?'left (CONTROL 1)':'right (CONTROL 2)'} knob ${dir>0?'clockwise':'counter-clockwise'}`, tr=>{
      const step = v => dir>0 ? (v===225?v:v+2) : (v===165?v:v-2);
      if (b.address_mode){ if (k===2){ b.address^=1; tr(`address_mode1 (right knob, input_flag1,0): either direction → address ^= 1 → ${b.address}; eewrite`); } else tr('Address screen: the left knob does nothing'); return; }
      if (b.disctl1){ if (k===2){ const o=b.level1; b.level1=step(b.level1); b.level2=b.level1; b.activity=1; tr(`level_mode1 (right knob): level1 ${o} → ${b.level1}, level2 = level1 (${dbTxt(b.level1)} dB stereo); command1 = 0; eewrite; activity_flag = 1`); }
        else tr('Stereo mode: only the right knob trims (l_mode1 needs disctl1 = 0)'); }
      else { if (k===1){ const o=b.level1; b.level1=step(b.level1); tr(`l_mode1 (left knob, input_flag1,1): level1 ${o} → ${b.level1} (left ${dbTxt(b.level1)} dB); command1 = 1`); } else { const o=b.level2; b.level2=step(b.level2); tr(`r_mode1 (right knob): level2 ${o} → ${b.level2} (right ${dbTxt(b.level2)} dB); command1 = 1`); } b.activity=1; }
      b.actAt=SIM.t; tr(`activity_flag,0 = 1 → at the next POD22 exchange for ${hex2(0xF0|b.address)} txuart answers ${hex2(0xF0|b.address|8)} (address + 8), then level1, level2, disctl1 (pod22v1.asm polls with F0/F1 + 2·lock, then 0, 1, 2)`);
      tr(b.other?'POD22 uart_rx sees the +8 header → activity_flag,1 → txuart4 sets activity_flag,0: its next exchange, with the other POD23, is an update (header + 8) carrying these levels — the two panels mirror each other':'POD22 uart_process copies the levels to sharc_out+9/13 (left) and +11/15 (right): the SHARC trims follow the knob'); }); },
  push(k){ const b=D.B; act(`Press ${k===1?'left':'right'} knob`, tr=>{
      if (k===1){ b.disctl1^=1; tr(`pbdepress2 (switch1 on RA2): disctl1 ^= 1 → ${b.disctl1?'STEREO':'L/R'}`); }
      else { b.address_mode^=1; tr(`pbdepress1 (switch2 on RA5): address_mode ^= 1 → ${b.address_mode?'ADDRESS screen':'back to trim'}`); } }); },
  lock(){ const b=D.B; act(b.aes_lock?'POD22 reports: no AES lock':'POD22 reports: AES locked', tr=>{ b.aes_lock^=1; tr(`POD22 txuart: header = ${hex2(0xF0|b.address)} ${b.aes_lock?'+ 2 (sharc_out+7 bit 0: AES locked; always + 2 in analog mode)':'without + 2'} → POD23 scanuart: bit 1 → aes_lock,0; no_lock_display shows “NO LOCK” while it is clear`); }); },
  link(){ const b=D.B; act(b.err?'POD22 polls again':'POD22 stops polling', tr=>{ b.err^=1; tr(b.err?'POD23 loss_of_com: comout2/comout3 run out with no received byte → tx,1 → “COMM ERROR”':'Any good poll resets comout3 and clears the error'); }); },
  other(){ const b=D.B; act(b.other?'Remove the second POD23':'Add a second POD23 (the other address)', tr=>{ b.other^=1; tr(b.other?`pod22v1.asm alternates F0 and F1 (uart_mode ^= 1 in txuart4): each panel is polled every ≈${SIM.fmtDur(2*EXCH)}`:`The POD22 still tries ${hex2(0xF0|(b.address^1))}: loss_of_com waits 256 passes (≈${SIM.fmtDur(TO22)}) for an answer, then switches back and flags that address for an update (activity_flag,2/3)`); }); },
};
B_.reset();

/* =====================================================================
   DRAWING
   ===================================================================== */
/* POD23A front (2004): built on POD23 - #SILK/POD23-SilkV2.cdr. Inkscape/libcdr converted it; the lower of its two
   identical copies (the upper one adds 0.22 pt drafting outlines of the six cells) was cut at 200 dpi to the panel
   size of every POD silk (8.575 × 1.61 in = 1715 × 322 px). Labels were re-centred in their dash gaps (libcdr drops the
   centre alignment). Cells sit on 1.250 in centres (“5 PITCHES @ 1.250 CENTRES”, POD23-2 ASSEMBLY.dwg); the windows
   (1.003 × 0.407 in) and the 0.629 in knob outlines are the artwork's own guides. The 2004 artwork has one ink only. */
const ASSET = 'siumulation-plugins/assets/';
const ART_V1 = '#POD #SERIES/POD23 - #Engineering/POD23 - #SILK/POD23-Silk.cdr', ART_V2 = '#POD #SERIES/POD23 - #Engineering/POD23 - #SILK/POD23-SilkV2.cdr';
const artCap = (p, l) => `<div class="small muted" style="margin:2px 0 6px">Panel artwork: ${SIM.src(p, l)} (CorelDRAW, live Arial text re-centred on its cells; green and white plates registered)</div>`;
const CELLX = i => 232.3 + 250*i;
const GLYPH_STAR = [0,4,21,14,21,4,0];
function dm(text, x, y, p, on, off){
  let s=''; const r=p*0.4;
  for (let i=0;i<text.length;i++){ const c=text[i], cx=x+i*p*6.2;
    if (c==='*'){ for (let row=0;row<7;row++) for (let col=0;col<5;col++){ const o=(GLYPH_STAR[row]>>(4-col))&1; s+=`<circle cx="${(cx+col*p).toFixed(1)}" cy="${(y+row*p).toFixed(1)}" r="${r.toFixed(2)}" fill="${o?on:off}"/>`; } }
    else s += SIM.dotMatrix(c, cx, y, p, on, off); }
  return s;
}
function knobAngle(k, t){ let n=0; for (const e of (EMU?EMU.ev:[])) if (e.type==='turn' && e.k===k && e.t<=t){ const E=e.edge||C.EDGE_T; n += e.dir*Math.min(e.n, Math.floor((t-e.t)/(4*E))); } return n*18; }
function frontA(t, opts){
  opts=opts||{}; const r = ramAt(t), on = sigAt('phase',t)!=='off';
  const st = stateAt(t), S = st && st.S;
  const ledOn='#5dff6e', ledOff='rgba(90,255,110,.06)';
  let s = `<svg viewBox="0 0 1715 322" role="img" aria-label="POD23A front panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <defs><filter id="p23glow" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <radialGradient id="p23knob" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#3b3e42"/><stop offset="1" stop-color="#0d0e0f"/></radialGradient></defs>
    <rect width="1715" height="322" rx="8" fill="#141517"/>
    <image href="${ASSET}pod23-a-front.svg" width="1715" height="322"/>`;
  for (let i=0;i<6;i++){ const k=i+1, x=CELLX(i), txt = on && r[k]!=null ? r[k] : '    ';
    s += `<g class="p23disp" data-k="${k}"><title>Display ${k} (SLG2016 U${5+k}, ~WR${k}${k===1?': v100 never calls display1 — what shows here is latched by decoder glitches (inferred)':''})</title>
      <rect x="${x-100.3}" y="22" width="200.6" height="81.4" rx="3" fill="#0b0c0c" stroke="#2a2d30" stroke-width="2"/>
      <rect x="${x-90}" y="30" width="180" height="65" rx="2" fill="#151818" opacity=".9"/>
      <g ${on?'filter="url(#p23glow)"':''}>${dm(txt, x-71.5, 44, 5.9, ledOn, ledOff)}</g></g>`;
    const ang = knobAngle(k, t);
    s += `<g class="p23knob" data-k="${k}" style="cursor:pointer"><title>${KNOB[k]} — click left/right side to turn, centre to press; mouse wheel turns</title>
      <circle cx="${x}" cy="232.7" r="70" fill="transparent"/>
      <circle cx="${x}" cy="232.7" r="56" fill="url(#p23knob)" stroke="#2c2f32" stroke-width="2"/>
      <circle cx="${x}" cy="232.7" r="44" fill="#16181a" stroke="#34383c" stroke-width="1.5"/>
      <line x1="${x}" y1="232.7" x2="${x+38*Math.sin(ang*Math.PI/180)}" y2="${232.7-38*Math.cos(ang*Math.PI/180)}" stroke="#d8dad6" stroke-width="4" stroke-linecap="round"/>
      ${D.sel===k?`<circle cx="${x}" cy="232.7" r="62" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 5" opacity=".7"/>`:''}</g>`;
  }
  s += `<circle cx="51" cy="161" r="9" fill="#3a3d40"/><circle cx="1664" cy="161" r="9" fill="#3a3d40"/>`;
  if (S && on && S.phase==='loop') s += `<text x="1700" y="16" text-anchor="end" font-size="13" fill="#7d8389">${S.disctl1&1?'lower row (PUSH)':'upper row'}</text>`;
  s += (opts.hot||'') + `</svg>` + artCap(ART_V2, 'POD23-SilkV2.cdr, Mar 15 2004');
  return s;
}
/* POD23 front (2003): POD23-Silk.cdr. Its middle copy is the white separation (CONTROL 1, CONTROL 2, POD-23 CONTROL PANEL),
   its lower copy the green one (top bar, two window frames, Ward-Beck Systems). Two PDSP1884 8-character displays
   (POD23iss1.bom) and two encoders sit inside the frames; their exact positions are not in a readable drawing — INFERRED. */
function frontB(){
  const [l1,l2] = B_.disp();
  const frame = (x0,txt,k)=>`<rect x="${x0+34}" y="112" width="300" height="72" rx="3" fill="#0b0c0c" stroke="#2a2d30" stroke-width="2"/>
     <g filter="url(#p23glow)">${dm(txt, x0+50, 131, 4.85, '#5dff6e', 'rgba(90,255,110,.06)')}</g>
     <g class="p23knob" data-k="${k}" style="cursor:pointer"><title>${k===1?'Left knob (CONTROL 1)':'Right knob (CONTROL 2)'} — left/right side turns, centre presses</title>
       <circle cx="${x0+478}" cy="160" r="66" fill="transparent"/><circle cx="${x0+478}" cy="160" r="54" fill="url(#p23knob)" stroke="#2c2f32" stroke-width="2"/><circle cx="${x0+478}" cy="160" r="42" fill="#16181a" stroke="#34383c"/></g>`;
  return `<svg viewBox="0 0 1715 322" role="img" aria-label="POD23 (2003) front panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <defs><filter id="p23glow" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <radialGradient id="p23knob" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#3b3e42"/><stop offset="1" stop-color="#0d0e0f"/></radialGradient></defs>
    <rect width="1715" height="322" rx="8" fill="#141517"/>
    <image href="${ASSET}pod23-front.svg" width="1715" height="322"/>
    ${frame(213,l1,1)}${frame(871,l2,2)}
    <circle cx="51" cy="161" r="9" fill="#3a3d40"/><circle cx="1664" cy="161" r="9" fill="#3a3d40"/></svg>${artCap(ART_V1, 'POD23-Silk.cdr, Mar 17 2003')}`;
}
/* Rear (both versions): the rear copy of either .cdr (CONTROL, 115 VAC 1/2 A.S.B., DISCONNECT POWER BEFORE SERVICING).
   POD23-M2.dwg names a “DB 9PIN CONNECTOR”; the inlet/fuse and the DB9 are drawn under their labels — INFERRED positions. */
function rearSVG(t){
  const link = D.variant==='a' ? linkAt_(t) : !D.B.err;
  const on = D.variant==='a' ? sigAt('phase',t)!=='off' : true;
  const pins=[[-40,0],[-20,0],[0,0],[20,0],[40,0],[-30,24],[-10,24],[10,24],[30,24]];
  return `<svg viewBox="0 0 1715 322" role="img" aria-label="POD23 rear panel (real silkscreen)" style="width:100%;max-width:980px;border-radius:8px;display:block">
    <rect width="1715" height="322" rx="8" fill="#141517"/>
    <g class="p23link" style="cursor:pointer"><title>CONTROL: DB9 (POD23-M2.dwg) wired to P2 — COM1 ± (U3, half duplex), COM2 ± (U4, transmit only), GND. Pin-out to the DB9 is not in the archive. Click to ${link?'unplug':'plug in'} the ${D.partner==='pod22'?'POD22':'DA305A'}.</title>
      <path d="M496 92 h160 l-14 70 h-132 z" fill="#9aa0a6" stroke="#5d6166" stroke-width="3"/><path d="M510 100 h132 l-11 54 h-110 z" fill="#1d1f22"/>
      ${pins.map(([dx,dy])=>`<circle cx="${576+dx}" cy="${116+dy}" r="5" fill="#c9b469"/>`).join('')}
      <circle cx="470" cy="127" r="10" fill="#8f9295"/><circle cx="682" cy="127" r="10" fill="#8f9295"/>
      ${link?`<rect x="488" y="84" width="176" height="86" rx="10" fill="#2e3a4a" stroke="#4d6a8c" stroke-width="3" opacity=".95"/><rect x="546" y="170" width="60" height="152" fill="#24303d"/><text x="576" y="134" text-anchor="middle" font-size="18" fill="#cfe0f2">${D.partner==='pod22'?'POD22':'DA305A'}</text>`:''}</g>
    <g class="p23pwr" style="cursor:pointer"><title>115 VAC inlet with ½ A slow-blow fuse (silk text). Internal supply → P1 +5 V (not in the archive). Click for power ${on?'off':'on'}.</title>
      <rect x="1404" y="96" width="130" height="96" rx="8" fill="#0b0c0d" stroke="#2e3134" stroke-width="2"/><rect x="1422" y="112" width="94" height="64" rx="6" fill="#16181a"/>
      ${[[1449,136],[1489,136],[1469,160]].map(([x,y])=>`<rect x="${x-7}" y="${y-11}" width="14" height="22" fill="#c9cdd2"/>`).join('')}
      <circle cx="1606" cy="146" r="28" fill="#1b1d20" stroke="#3a3d40" stroke-width="3"/><rect x="1596" y="136" width="20" height="20" rx="3" fill="#2b2e31"/>
      <circle cx="1350" cy="146" r="8" fill="${on?'var(--accent)':'#444'}"/></g>
    <image href="${ASSET}pod23-rear.svg" width="1715" height="322"/>
    <circle cx="51" cy="161" r="9" fill="#3a3d40"/><circle cx="1664" cy="161" r="9" fill="#3a3d40"/></svg>${artCap(ART_V2, 'POD23-SilkV2.cdr, Mar 15 2004 (rear copy; identical in POD23-Silk.cdr)')}`;
}
function linkAt_(t){ let on = D.snap ? D.snap.link : D.link; for (const e of D.events) if (e.type==='link' && e.t<=t) on=e.on; return on; }
function bindPanel(root){
  root.querySelectorAll('.p23knob').forEach(g=>{ const k=+g.dataset.k;
    g.addEventListener('click', e=>{ const r=g.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width; D.sel=k; if (x<0.36) A.turn(k,-1); else if (x>0.64) A.turn(k,1); else A.push(k); });
    g.addEventListener('wheel', e=>{ e.preventDefault(); D.sel=k; A.turn(k, e.deltaY<0?1:-1); }, {passive:false}); });
  const l=root.querySelector('.p23link'); if (l) l.addEventListener('click', ()=>{ if (D.variant==='two') return B_.link(); A.link(!linkAt_(SIM.t)); });
  const p=root.querySelector('.p23pwr'); if (p) p.addEventListener('click', ()=>{ if (D.variant==='a') A.power(); });
}
function controlsHTML(){
  if (D.variant==='two') return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
    <span class="small muted">Left</span><button data-a="t1-">⟲</button><button data-a="p1">press</button><button data-a="t1+">⟳</button>
    <span class="small muted" style="margin-left:10px">Right</span><button data-a="t2-">⟲</button><button data-a="p2">press</button><button data-a="t2+">⟳</button>
    <button data-a="lock" style="margin-left:10px">toggle POD22 AES lock</button><button data-a="other" title="pod22v1.asm polls F0 and F1">toggle a second POD23</button></div>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px">
    <label class="small">Knob <select data-a="sel">${[1,2,3,4,5,6].map(k=>`<option value="${k}" ${D.sel===k?'selected':''}>${k} · ${KNOB[k]}</option>`).join('')}</select></label>
    <button data-a="l5">⟲ ×5</button><button data-a="l">⟲</button><button data-a="p">press</button><button data-a="r">⟳</button><button data-a="r5">⟳ ×5</button>
    <span class="small muted">Keys: 1–6 pick a knob · ← → turn · Enter press</span></div>
    <div class="small muted" style="margin-top:4px">Click a knob's left side to turn it counter-clockwise, its right side clockwise, its centre to press. Each action is placed at the playhead and the firmware is re-run; the playhead then jumps to the result. Near the end of the second the run moves on automatically.</div>`;
}
function bindControls(root){
  const m = {l:()=>A.turn(D.sel,-1), r:()=>A.turn(D.sel,1), l5:()=>A.turn(D.sel,-1,5), r5:()=>A.turn(D.sel,1,5), p:()=>A.push(D.sel),
    't1-':()=>B_.turn(1,-1),'t1+':()=>B_.turn(1,1),'t2-':()=>B_.turn(2,-1),'t2+':()=>B_.turn(2,1),p1:()=>B_.push(1),p2:()=>B_.push(2),lock:()=>B_.lock(),other:()=>B_.other()};
  root.querySelectorAll('button[data-a]').forEach(b=> b.onclick=()=>m[b.dataset.a]());
  const s=root.querySelector('select[data-a="sel"]'); if (s) s.onchange=e=>{ D.sel=+e.target.value; SIM.refresh(); };
}
document.addEventListener('keydown', e=>{
  if (!window.__pod23Active || (e.target.matches && e.target.matches('input,select,textarea'))) return;
  if (/^[1-6]$/.test(e.key)){ D.sel=+e.key; SIM.refresh(); e.preventDefault(); return; }
  if (e.key==='ArrowLeft'){ A.turn(D.variant==='two'?(D.sel===1?1:2):D.sel,-1); e.preventDefault(); }
  else if (e.key==='ArrowRight'){ A.turn(D.variant==='two'?(D.sel===1?1:2):D.sel,1); e.preventDefault(); }
  else if (e.key==='Enter'){ A.push(D.variant==='two'?(D.sel===1?1:2):D.sel); e.preventDefault(); }
});

/* ---------------- timeline lanes ---------------- */
function drawBytes(c,X,t0,t1,y,h,list,col,lbl){
  const css=SIM.css;
  for (const it of list){ if (it.end<t0 || it.start>t1) continue;
    const a=X(it.start), b=X(it.end), w=b-a;
    if (w>120){ // bit level: start, 8 data LSB first, stop (idle high)
      const bits=[0]; for (let i=0;i<8;i++) bits.push((it.b>>i)&1); bits.push(1);
      c.strokeStyle=it.lost?css('--bad'):col; c.lineWidth=1.6; c.beginPath();
      bits.forEach((bt,i)=>{ const xa=X(it.start+i*BIT_T), xb=X(it.start+(i+1)*BIT_T), yy=bt? y+4 : y+h-4; if(i===0) c.moveTo(xa,y+4); c.lineTo(xa,yy); c.lineTo(xb,yy); });
      c.stroke(); c.fillStyle=css('--ink2'); c.font='10px '+css('--mono');
      bits.forEach((bt,i)=>{ const xa=X(it.start+(i+0.5)*BIT_T); c.fillText(i===0?'S':i===9?'P':String(bt), xa-3, y+h/2+3); });
      c.fillStyle=css('--ink'); c.fillText(hex2(it.b)+' '+(it.why||''), a+2, y+10);
    } else {
      c.fillStyle=it.lost?css('--bad'):col; c.globalAlpha=.85; c.fillRect(a, y+4, Math.max(1.5,w), h-8); c.globalAlpha=1;
      if (w>18){ c.fillStyle='#fff'; c.font='10px '+css('--mono'); c.fillText(hx(it.b), a+2, y+h/2+3); }
    }
  }
}
function segLane(c,X,t0,t1,y,h,key,colFn,txtFn){
  const a=EMU.sig[key]||[]; for (let i=0;i<a.length;i++){ const s=a[i][0], e=i+1<a.length?a[i+1][0]:t1+1; if (e<t0||s>t1) continue; const col=colFn(a[i][1]); if(!col) continue;
    c.fillStyle=col; c.globalAlpha=.7; c.fillRect(X(Math.max(s,t0)), y+5, Math.max(1,X(Math.min(e,t1))-X(Math.max(s,t0))), h-10); c.globalAlpha=1;
    const tx=txtFn&&txtFn(a[i][1]); if (tx && X(Math.min(e,t1))-X(Math.max(s,t0))>60){ c.fillStyle=SIM.css('--ink'); c.font='11px '+SIM.css('--sans'); c.fillText(tx, X(Math.max(s,t0))+4, y+h/2+4); } } }
function lanes(){
  const E=emulate(), css=n=>SIM.css(n); const L=[];
  if (D.variant==='two') return lanesB();
  const ks=[...new Set(E.ev.filter(e=>e.type==='turn').map(e=>e.k))].slice(0,3);
  if (!ks.length) ks.push(D.sel>1?D.sel:3);
  ks.forEach(k=>L.push({label:`E${k} ${KNOB[k].split(' /')[0]}: A / B pins`, h:30, draw(c,X,t0,t1,y,h){
    const turns=E.ev.filter(e=>e.type==='turn'&&e.k===k);
    [[2,'A'],[1,'B']].forEach(([bit,nm],j)=>{ const yy=y+3+j*13; c.strokeStyle=j?css('--accent2'):css('--accent'); c.lineWidth=1.3; c.beginPath(); let lv=0; c.moveTo(X(t0), yy+10);
      for (const e of turns){ const Ed=e.edge||C.EDGE_T; for (let i=0;i<4*e.n;i++){ const tt=e.t+i*Ed; if (tt<t0||tt>t1) continue; const code=(e.dir>0?[2,3,1,0]:[1,3,2,0])[i%4]; const nl=(code&bit)?1:0; if(nl!==lv){ c.lineTo(X(tt), yy+(lv?0:10)); c.lineTo(X(tt), yy+(nl?0:10)); lv=nl; } } }
      c.lineTo(X(t1), yy+(lv?0:10)); c.stroke(); });
    E.notes.filter(n=>n.cls==='fw' && n.txt.startsWith(`encoder_routine${k}`)).forEach(n=>{ if(n.t<t0||n.t>t1) return; c.fillStyle=css('--warn'); c.beginPath(); c.arc(X(n.t), y+h/2, 3.5, 0, 7); c.fill(); });
    if (!turns.length){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('no turns in this second — click a knob', X(t0)+6, y+h/2+4); } }}));
  L.push({label:'SELECT push (RB3) · accepted', h:22, draw(c,X,t0,t1,y,h){
    for (const e of E.ev.filter(e=>e.type==='push')){ const a=X(e.t), b=X(e.t+(e.dur||C.PUSH_T)); c.fillStyle=css('--accent2'); c.globalAlpha=.5; c.fillRect(a,y+4,Math.max(1,b-a),h-8); c.globalAlpha=1; }
    E.notes.filter(n=>n.txt.startsWith('debounce:')).forEach(n=>{ if(n.t<t0||n.t>t1) return; c.fillStyle=css('--bad'); c.fillRect(X(n.t)-1, y+2, 3, h-4); }); }});
  L.push({label:'PIC16F877 main loop', h:30, draw(c,X,t0,t1,y,h){
    const ph=E.sig.phase||[]; ph.forEach((p,i)=>{ if (p[1]==='loop') return; const s=p[0], e=i+1<ph.length?ph[i+1][0]:t1; if (e<t0||s>t1) return; c.fillStyle=p[1]==='off'?css('--grid'):css('--warn'); c.globalAlpha=.55; c.fillRect(X(Math.max(s,t0)),y+3,X(Math.min(e,t1))-X(Math.max(s,t0)),h-6); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px sans-serif'; if (X(Math.min(e,t1))-X(Math.max(s,t0))>140) c.fillText(p[1]==='banner'?'display_version banner (WARD BECK POD 23A V100)':p[1]==='off'?'power off':'start-up', X(Math.max(s,t0))+5, y+h/2+4); });
    let shown=0; const pw = X(t0+0.0008)-X(t0);
    for (const p of E.passes){ if (p.t1<t0||p.t0>t1) continue; shown++;
      if (pw>90){ const tc=stepTcy({up:p.up, err:p.err}); let tt=p.t0; tc.forEach((n,j)=>{ const d=n*TCY; c.fillStyle = j===12? css('--accent2') : j>=14? css('--warn') : css('--accent'); c.globalAlpha=j%2?.55:.85; c.fillRect(X(tt),y+3,Math.max(1,X(tt+d)-X(tt)-.5),h-6); c.globalAlpha=1;
          if (X(tt+d)-X(tt)>70){ c.fillStyle='#fff'; c.font='10px sans-serif'; c.fillText(STEPS[j][0].split(' ')[0].slice(0,22), X(tt)+3, y+h/2+3); } tt+=d; }); }
      else { c.fillStyle = p.err? css('--bad') : p.up? css('--accent') : css('--accent2'); c.globalAlpha = p.n%2? .55:.85; c.fillRect(X(p.t0), y+3, Math.max(.6,X(p.t1)-X(p.t0)-.3), h-6); c.globalAlpha=1; } }
    if (pw<2.5 && shown){ c.fillStyle=css('--ink'); c.font='11px '+css('--mono'); c.fillText(`${shown} passes (≈${(passTcy({up:true})*TCY*1e3).toFixed(2)} ms upper row / ${(passTcy({up:false})*TCY*1e3).toFixed(2)} ms lower, inferred) — blue = lower row, red = COMM ERR`, X(t0)+6, y+h/2+4); } }});
  L.push({label:'SLG2016 writes ~WR1…~WR6', h:26, draw(c,X,t0,t1,y,h){
    const span=t1-t0; if (span>0.006){ for (const p of E.passes){ if (p.t1<t0||p.t0>t1) continue; const tc=stepTcy({up:p.up,err:p.err}); const s=p.t0+tc.slice(0,11).reduce((a,b)=>a+b,0)*TCY; c.fillStyle=css('--accent2'); c.fillRect(X(s), y+5, Math.max(1, X(s+(tc[11]+tc[12])*TCY)-X(s)), h-10); }
        if (span>0.05){ c.fillStyle=css('--ink2'); c.font='11px sans-serif'; c.fillText('every pass rewrites displays 2–6; zoom to ≤ 5 ms to see each strobe', X(t0)+6, y+h/2+4); } return; }
    for (const p of E.passes){ if (p.t1<t0||p.t0>t1) continue; const tc=stepTcy({up:p.up,err:p.err}); let tt=p.t0+tc.slice(0,11).reduce((a,b)=>a+b,0)*TCY + (p.err?tc[11]*TCY:0) + 4*TCY;
      let rc=[1,1,1]; const yOf=r=>r[0]+2*r[1]+4*r[2];
      for (let k=2;k<=6;k++){ for (let d=0; d<4; d++){ tt+=4*TCY; for (const op of WMAC[k]){ const old=yOf(rc); if (op==='A') rc=[0,0,0]; else if (op==='O') rc=[1,1,1]; else if (op!=='N'&&op!=='L'){ const v=op[0]==='s'?1:0; rc[{'3':0,'2':1,'1':2}[op[1]]]=v; }
            const nw=yOf(rc); if (old!==nw && WRMAP[old]){ const kk=WRMAP[old]; c.fillStyle= kk===1? css('--bad') : css('--accent2'); c.fillRect(X(tt)-1, y+3+(kk-1)*3.4, 2, 3); }
            tt+=TCY; } } } }
    c.fillStyle=css('--ink2'); c.font='10px sans-serif'; c.fillText('rows: WR1 (red = latched by a glitch) … WR6', X(t0)+4, y+h-2); }});
  L.push({label:'TMR2IF (53.3 ms) · counter200', h:22, draw(c,X,t0,t1,y,h){
    (E.sig.tick||[]).forEach(([tt])=>{ if (tt<t0||tt>t1) return; c.fillStyle=css('--ink2'); c.fillRect(X(tt)-.5, y+4, 1.5, h-8); });
    const v=sigAt('tickN', SIM.t); c.font='11px '+css('--mono'); const tx_=`counter200 = ${v===undefined?'—':v} (218 → 0 returns to the upper row)`; c.fillStyle=css('--panel'); c.fillRect(X(t0)+3,y+4,c.measureText(tx_).width+8,h-8); c.fillStyle=css('--ink'); c.fillText(tx_, X(t0)+7, y+h/2+4); }});
  L.push({label:'COM1 TX → DA305A (FF ADDR CMD RESP DATA AA)', h:34, draw(c,X,t0,t1,y,h){ drawBytes(c,X,t0,t1,y,h,E.items.filter(i=>i.dir==='tx'),css('--accent'),'tx'); }});
  L.push({label:'RC0: 75176 driver enable (U3)', h:20, draw(c,X,t0,t1,y,h){ segLane(c,X,t0,t1,y,h,'rc0',v=>v?css('--warn'):null,v=>v?'transmitting':''); }});
  L.push({label:'COM1 RX ← reply (ID, address)', h:34, draw(c,X,t0,t1,y,h){ drawBytes(c,X,t0,t1,y,h,E.items.filter(i=>i.dir==='rx'),css('--accent2'),'rx'); }});
  L.push({label:'txflags: busy / waiting / COMM ERR', h:24, draw(c,X,t0,t1,y,h){
    segLane(c,X,t0,t1,y,h,'busy',v=>v?css('--accent'):null,v=>v?'busy (txflags,3)':'');
    segLane(c,X,t0,t1,y+0,h,'wait',v=>v?css('--accent2'):null,v=>v?'waiting for reply (txflags,4)':'');
    segLane(c,X,t0,t1,y,h,'err',v=>v?css('--bad'):null,v=>v?'COMM ERR (tx,1)':''); }});
  L.push({label:'Row shown (disctl1)', h:20, draw(c,X,t0,t1,y,h){ segLane(c,X,t0,t1,y,h,'disctl1',v=>v?css('--accent2'):css('--chip'),v=>v?'lower: OUTPUT 1/2, THRESHOLD, PEAK':'upper: SELECT, LEVEL, TARGET, RATIO, RANGE'); }});
  return L;
}
/* POD22 master (XXX - POD22 - #Master # Obsolte/POD22 - #Engineering/Software/554265/pod22v1.asm + uart.asm, Nov 2 2004):
   one byte pair every time_uart = 5 POD22 passes, 4 pairs per exchange; loss_of_com after 256 passes (com_time 255); pass ≈ 1.32 ms (pod22.js estimate, inferred) */
const P22=0.00132, PAIR=5*P22, EXCH=4*PAIR, TO22=256*P22;
function linkSched(t0,t1){ const b=D.B, out=[]; if (b.err) return out;
  const per = b.other ? 2*EXCH : EXCH + BYTE_T + TO22;
  for (let n=Math.max(0,Math.floor(t0/per)-1); n*per<t1; n++){ const base=n*per+0.002;
    const mine={t:base, ad:b.address, me:true}, oth={t:base+EXCH, ad:b.address^1, me:false, absent:!b.other};
    [mine,oth].forEach(e=>{ if (e.t>t1+EXCH || e.t+EXCH<t0) return; const prevT=e.t-per;
      const myUpd = e.me && b.actAt>=prevT && b.actAt<e.t;                                     // POD23 activity_flag,0 → header + 8
      const push = !e.me && b.other && b.actAt>=prevT-EXCH && b.actAt<e.t-EXCH;                // POD22 activity_flag,0 → update to the other panel
      const hdrM = 0xF0|e.ad|(b.aes_lock?2:0)|(push?8:0);
      e.M = push ? [hdrM,b.level1,b.level2,b.disctl1] : [hdrM,0,1,2];
      e.S = e.absent ? null : (e.me ? [0xF0|e.ad|(myUpd?8:0), b.level1, b.level2, b.disctl1] : [0xF0|e.ad, b.level1, b.level2, b.disctl1]);
      if (e.absent) e.M=[hdrM];
      out.push(e); }); }
  return out; }
function lanesB(){
  const css=n=>SIM.css(n), PASS=0.0006;
  return [
    {label:'PIC16F874 main loop (≈0.6 ms, inferred)', h:26, draw(c,X,t0,t1,y,h){ if (X(t0+PASS)-X(t0)<3){ c.fillStyle=css('--accent'); c.globalAlpha=.5; c.fillRect(X(t0),y+4,X(t1)-X(t0),h-8); c.globalAlpha=1; c.fillStyle=css('--ink'); c.font='11px sans-serif'; c.fillText('≈1700 passes: input_routine, encoder_routine1/2, debounce, level/l/r/address handlers, refresh (16 chars), scanuart, txuart', X(t0)+6, y+h/2+4); return; }
      for (let tt=Math.floor(t0/PASS)*PASS; tt<t1; tt+=PASS){ c.fillStyle=css('--accent'); c.globalAlpha=Math.round(tt/PASS)%2?.5:.8; c.fillRect(X(tt),y+4,X(tt+PASS)-X(tt)-.5,h-8); } c.globalAlpha=1; }},
    {label:'POD22 master (pod22v1.asm): F0/F1 + 2·lock (+8 update), 0, 1, 2', h:30, draw(c,X,t0,t1,y,h){ linkSched(t0,t1).forEach(e=>{ drawBytes(c,X,t0,t1,y,h,e.M.map((v,i)=>({start:e.t+i*PAIR, end:e.t+i*PAIR+BYTE_T, b:v, why:['header '+hex2(0xF0|e.ad),'level / 0','level / 1','display / 2'][i]})), e.me?css('--accent2'):css('--ink2'));
        if (e.absent && X(e.t+BYTE_T+TO22)-X(e.t)>60){ c.fillStyle=css('--warn'); c.font='10px sans-serif'; c.fillText(`no reply from ${hex2(0xF0|e.ad)}: loss_of_com after 256 passes`, X(Math.max(t0,e.t))+4, y+h-3); } }); }},
    {label:'POD23 replies (address +8 activity, level1, level2, disctl1)', h:30, draw(c,X,t0,t1,y,h){ linkSched(t0,t1).forEach(e=>{ if(!e.S) return; const d=BYTE_T+0.0006;
        drawBytes(c,X,t0,t1,y,h,e.S.map((v,i)=>({start:e.t+i*PAIR+d, end:e.t+i*PAIR+d+BYTE_T, b:v, why:['address','level1','level2','disctl1'][i]})), e.me?css('--accent'):css('--ink2')); }); }},
  ];
}

/* ---------------- views ---------------- */
function card(title, body, cls){ return `<div class="card ${cls||''}"><h2>${title}</h2>${body}</div>`; }
function variantBar(){
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
    <span class="small muted">Model</span>
    <button data-v="a" class="${D.variant==='a'?'on':''}">POD23A v100 (${Y(2004)}, six knobs → DA305A)</button>
    <button data-v="two" class="${D.variant==='two'?'on':''}">POD23 #554265 (${Y(2003)}, two knobs → POD22)</button></div>`;
}
function bindVariant(m){ m.querySelectorAll('button[data-v]').forEach(b=>b.onclick=()=>{ D.variant=b.dataset.v; D.sel = D.variant==='two'?2:3; SIM.openTab('sim'); }); }
function inspectorHTML(t){
  if (D.variant==='two'){ const b=D.B; return `<table class="kv"><tr><th>Mode</th><td class="mono">${b.address_mode?'address_mode,0 = 1':b.disctl1?'disctl1 = 1 (STEREO)':'disctl1 = 0 (L/R)'}</td></tr>
    <tr><th>level1 / level2</th><td class="mono">${b.level1} / ${b.level2} (${dbTxt(b.level1)} / ${dbTxt(b.level2)} dB)</td></tr><tr><th>address</th><td class="mono">${b.address}</td></tr>
    <tr><th>aes_lock / tx,1</th><td class="mono">${b.aes_lock} / ${b.err}</td></tr><tr><th>Displays</th><td class="mono">“${B_.disp().join('” “')}”</td></tr>
    <tr><th>Link</th><td class="mono">POD22 polls ${hex2(0xF0|b.address)}${b.other?' and '+hex2(0xF0|(b.address^1))+' alternately':' (the other address times out)'} · one exchange ≈ ${SIM.fmtDur(EXCH)}</td></tr></table>
    <p class="small muted">The 2003 panel is modelled at the state level; the link follows the POD22 master <span class="mono">pod22v1.asm</span> (#554265, Nov 2004). Pass times are ${inf}.</p>`; }
  const st=stateAt(t); if (!st) return '<p class="muted">Before power-on or during start-up.</p>';
  const S=st.S, sp=stepAt(t), a=S.address_2temp, r=ramAt(t);
  const da=S.da.regs;
  return `<table class="kv">
    <tr><th>Pass / step</th><td class="mono">${sp.p?'#'+sp.p.n+' · '+STEPS[sp.k][0]:'—'}</td></tr>
    <tr><th>Row (disctl1)</th><td class="mono">${S.disctl1&1?'1 lower: PUSH · OUTPUT 1 · OUTPUT 2 · THRESHOLD · PEAK':'0 upper: SELECT · LEVEL · TARGET · RATIO · RANGE'}</td></tr>
    <tr><th>Displays 1–6</th><td class="mono">${[1,2,3,4,5,6].map(k=>'“'+(r[k]||'    ').replace(/ /g,'&nbsp;')+'”').join(' ')}</td></tr>
    <tr><th>address_2temp</th><td class="mono">${a} (A${a+1}) → address byte ${S.address_2}</td></tr>
    <tr><th>level1 · target1 · ratio1 · range1</th><td class="mono">${S.level1} (${dbTxt(S.level1)} dB) · ${S.target1} · ${S.ratio1} · ${S.range1}</td></tr>
    <tr><th>threshold1 · peak1 · output1/2</th><td class="mono">${S.threshold1} · ${S.peak1} · ${S.output1}/${S.output2} (output_mode ${S.output_mode}, level_enable ${S.level_enable})</td></tr>
    <tr><th>command1 · tx · txflags · tx_flags</th><td class="mono">${S.command1} (${CMDN[S.command1]}) · ${S.tx.toString(2).padStart(8,'0')} · ${S.txflags.toString(2).padStart(8,'0')} · ${S.tx_flags.toString(2).padStart(8,'0')}</td></tr>
    <tr><th>pole / comout</th><td class="mono">polecount1:0 = ${S.polecount1}:${S.polecount0} · comout3:2 = ${S.comout3}:${S.comout2} · com_counter ${S.com_counter}</td></tr>
    <tr><th>Debounce</th><td class="mono">input2 ${S.input2} · bounce_count ${S.bounce_count} · bounce_flag ${S.bounce_flag}</td></tr>
    <tr><th>Encoder states</th><td class="mono">${[2,3,4,5,6].map(k=>`E${k}:${(S.st[k][0]>>2)&7}/${(S.st[k][1]>>2)&7}`).join(' ')}</td></tr>
    <tr><th>${D.partner==='pod22'?'POD22':'DA305A'} @${D.daAddr} (A${D.daAddr+1}) holds</th><td class="mono">${S.da.frames} frames · ${['Level','','Target','Ratio','Range','Threshold','Peak'].map((n,i)=>n&&da[i]!==undefined?`${n} ${da[i]}`:'').filter(x=>x).join(' · ')}${da.out1!==undefined?` · Out ${da.out1}/${da.out2}`:''}</td></tr>
  </table>`;
}
function viewSim(m){
  window.__pod23Active = true;
  m.innerHTML = variantBar() + `
  <div class="grid2"><div>
    ${card(D.variant==='a'?'Front panel at the playhead — POD23A, six cells on the 2004 silkscreen':'Front panel — POD23 (2003), on the 2003 silkscreen', `<div id="fp"></div>${controlsHTML()}
      ${D.variant==='a'?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center">
        <label class="small">Scenario <select id="scn">${Object.keys(SCEN).map(k=>`<option value="${k}" ${k===D.scenario&&!D.snap?'selected':''}>${SCEN[k].name}</option>`).join('')}${D.snap?'<option selected>— continued from an earlier second —</option>':''}</select></label>
        <label class="small">On CONTROL <select id="ptn">${Object.keys(PARTNERS).map(k=>`<option value="${k}" ${k===D.partner?'selected':''}>${PARTNERS[k]}</option>`).join('')}</select></label>
        <label class="small">its address <select id="dad">${[0,1,2,3,4,5,6,7,8,9].map(k=>`<option value="${k}" ${k===D.daAddr?'selected':''}>${k} (A${k+1})</option>`).join('')}</select></label>
        <button id="nxt">Continue ▶▶ next second</button><button id="clr">Clear my actions</button>
        <label class="small"><input type="checkbox" id="jmp" ${D.jump?'checked':''}> jump to result</label></div>`:''}`)}
    ${card('Rear panel — click CONTROL to plug or unplug, the inlet for power', `<div id="rp"></div>`)}
  </div><div>
    ${card('What the firmware did (last action)', `<div id="trace" class="log"></div>`)}
    ${card('State at the playhead', `<div id="insp"></div>`)}
  </div></div>
  ${card('Timeline — one second, zoomable (click to seek)', `<canvas id="tl"></canvas>
    <p class="small muted">${D.variant==='a'?`The pass length is counted by hand from <span class="mono">pod23.asm</span> (${inf}, ±20 %). Everything else follows from it and from the 4.9152 MHz crystal: one UART byte = 1.042 ms, one byte every 20 passes ≈ 15.8 ms, one frame ≈ 95 ms, a data-refresh cycle every 2048 quiet passes ≈ 1.6 s.`:`Two-knob panel (${Y(2003)}): the link lanes follow the POD22 master pod22v1.asm — one byte pair every 5 POD22 passes (pass ≈ 1.32 ms, ${inf}), F0/F1 alternating when both panels answer, a 256-pass loss_of_com wait for a missing one.`}</p>`)}
  <div class="grid2">${card('Firmware notes in view (newest last)', `<div id="notes" class="log"></div>`)}${card('Action log', `<div id="log" class="log"></div>`)}</div>`;
  bindVariant(m);
  const draw=()=>{
    const t=SIM.t; if (D.variant==='a') emulate();
    m.querySelector('#fp').innerHTML = D.variant==='a' ? frontA(t) : frontB(); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(t); bindPanel(m.querySelector('#rp'));
    m.querySelector('#insp').innerHTML = inspectorHTML(t);
    const L0=D.log[0]; m.querySelector('#trace').innerHTML = L0 ? `<div><b>${L0.name}</b> at ${SIM.fmtT(L0.t)}</div>`+L0.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Turn or press a knob. Each step the firmware takes is listed here and on the timeline.</div>';
    m.querySelector('#log').innerHTML = D.log.map(e=>`<div><b>${e.name}</b> <span class="muted">@ ${SIM.fmtT(e.t)}</span></div>`).join('') || '<div class="muted">No actions yet.</div>';
    if (D.variant==='a'){ const [a,b]=SIM.window(); const ns=EMU.notes.filter(n=>n.t>=a&&n.t<=b).slice(-80);
      m.querySelector('#notes').innerHTML = ns.map(n=>`<div><span class="muted">${SIM.fmtT(n.t)}</span> ${n.cls==='warn'?'<b style="color:var(--warn)">!</b> ':''}${n.txt}</div>`).join('') || '<div class="muted">Nothing happens in this window except refresh passes.</div>'; }
    else m.querySelector('#notes').innerHTML = '<div class="muted">State-level model: see the trace.</div>';
    SIM.drawLanes(m.querySelector('#tl'), lanes(), {labelW:200});
  };
  bindControls(m);
  const q=s=>m.querySelector(s);
  if (q('#scn')) q('#scn').onchange=e=>{ if (SCEN[e.target.value]) A.scenario(e.target.value); };
  if (q('#ptn')) q('#ptn').onchange=e=>{ D.partner=e.target.value; EMU_KEY=''; SIM.refresh(); };
  if (q('#dad')) q('#dad').onchange=e=>{ D.daAddr=+e.target.value; EMU_KEY=''; SIM.refresh(); };
  if (q('#nxt')) q('#nxt').onclick=()=>A.next();
  if (q('#clr')) q('#clr').onclick=()=>A.clear();
  if (q('#jmp')) q('#jmp').onchange=e=>{ D.jump=e.target.checked; };
  SIM.on('time', draw);
}

/* ---------------- tutorial ---------------- */
const cur = () => { const st=stateAt(SIM.t); return st && st.S.phase==='loop' ? st.S : null; };
const LESSONS = [
  {title:'Meet the POD23A', body:`<p>The POD23A is a half-rack <b>remote control panel</b>. It has no audio inside. It sends settings down a 9600-baud RS-485 line to a <b>DA305A</b> audio-processing DA (or a POD22 meter), up to ten of them, numbered A1…A10.</p>
    <p>It has six cells. Each has a knob and a 4-character green display. The silkscreen labels each knob twice: the <b>upper row</b> (SELECT, LEVEL, TARGET, RATIO, RANGE) and the <b>lower row</b> (PUSH, OUTPUT 1, OUTPUT 2, THRESHOLD, PEAK LIMIT). Pressing SELECT swaps rows.</p>
    <p class="muted">No manual survives. This tutorial is built from the silk labels, the protocol document (12 Mar ${Y(2004)}) and the v100 firmware. The leftmost cell has no label: v100 never reads its knob.</p>`, check:()=>true, auto:true},
  {title:'1 · Read the displays', body:`<p>Out of the box the panel shows <span class="mono">A1</span> (the DA305A it is talking to), <span class="mono">0</span> (LEVEL trim, dB), and <span class="mono">----</span> on TARGET, RATIO and RANGE. The dashes mean the <b>leveller is off</b>, so those three knobs do nothing yet.</p><p><b>Goal:</b> be on the upper row at A1.</p>`, check:()=>{ const S=cur(); return S && !(S.disctl1&1) && S.address_2temp===0; }, hint:'Pick scenario “Running …” on the Simulator tab, or press SELECT to return to the upper row.'},
  {title:'2 · Trim the level', body:`<p>Turn <b>LEVEL</b> (knob 3). Each click is 1 dB, from −15 to +15. The firmware stores 2 codes per dB (165…225, 195 = 0 dB) and sends <span class="mono">FF 00 00 01 &lt;level&gt; AA</span> to the DA305A — after the click, on the next free frame.</p><p><b>Goal:</b> +3 dB.</p>`, check:()=>{ const S=cur(); return S && S.slot.lv[S.address_2temp]===201; }, hint:'Select knob 3 and press → three times (or click the right half of the LEVEL knob).'},
  {title:'3 · Swap to the lower row', body:`<p><b>Press SELECT</b> (knob 2). After 16 steady loop passes (≈13 ms) the firmware flips <span class="mono">disctl1</span>. Display 2 shows <span class="mono">****</span>, LEVEL's display becomes OUTPUT 1 and TARGET's becomes OUTPUT 2.</p><p><b>Goal:</b> lower row.</p>`, check:()=>{ const S=cur(); return S && (S.disctl1&1); }, hint:'Select knob 2 and press Enter (or click the centre of the SELECT knob).'},
  {title:'4 · Turn the leveller on', body:`<p>OUTPUT 1 steps <span class="mono">ST → MN → TN → LV</span> (stereo, mono, tone, leveller) and wraps. Choose <b>LV</b>. Now TARGET, RATIO, RANGE, THRESHOLD and PEAK LIMIT come alive.</p><p><b>Goal:</b> OUTPUT 1 = LV.</p>`, check:()=>{ const S=cur(); return S && (S.slot.lev[S.address_2temp]&1); }, hint:'Turn knob 3 clockwise three clicks (ST → MN → TN → LV).'},
  {title:'5 · Threshold and peak limit', body:`<p>On the lower row, knob 5 is <b>THRESHOLD</b> (−70 … −40 dB in 5 dB steps) and knob 6 is <b>PEAK LIMIT</b> (−12 … 0 dB).</p><p><b>Goal:</b> THRESHOLD −50, PEAK LIMIT −3.</p>`, check:()=>{ const S=cur(); return S && S.slot.th[S.address_2temp]===20 && S.slot.pk[S.address_2temp]===9; }, hint:'Knob 5 clockwise two clicks (−60 → −55 → −50). Knob 6 counter-clockwise three clicks (0 → −3).'},
  {title:'6 · Back up: target, ratio, range', body:`<p>Press SELECT to go back to the upper row. (If you leave the lower row alone for 11.6 s it goes back by itself.) Set <b>TARGET −24</b>, <b>RATIO 1:3</b> and <b>RANGE 12</b>.</p><p class="muted">The ratio display reads “1:3”. The protocol document writes ratios the same way. The byte sent is 170 = 256 × (1 − 1/3).</p>`, check:()=>{ const S=cur(); if(!S) return false; const a=S.address_2temp; return !(S.disctl1&1) && S.slot.tg[a]===16 && S.slot.ra[a]===2 && S.slot.rg[a]===11; }, hint:'Knob 3 is LEVEL again. TARGET (knob 4) default −20: four clicks counter-clockwise. RATIO (knob 5) default 1:4: one click counter-clockwise. RANGE stays 12.'},
  {title:'7 · Talk to another DA305A', body:`<p>Turn <b>SELECT</b> to <span class="mono">A2</span>. Every display now shows A2's own settings: the panel keeps a set for each of A1…A10. Turn back to A1 and your settings return.</p><p class="muted">Watch the address byte on the timeline: A1 is sent as 0, A2 as 1. The protocol document says addresses are 1–10 (see Findings).</p><p><b>Goal:</b> A2, then back to A1.</p>`, check:()=>{ const S=cur(); return S && S.address_2temp===0 && D.log.some(e=>/Turn SELECT/.test(e.name)); }, hint:'Knob 2 clockwise once, then counter-clockwise once.'},
  {title:'8 · Lose the link', body:`<p>Click <b>CONTROL</b> on the rear panel to unplug the DA305A, then press <b>Continue ▶▶</b> on the Simulator tab a few times. About every 1.6 s the panel asks the DA305A to reply. With no reply it waits 2 × 2816 passes (≈4.4 s), then shows <span class="mono">**** COMM ERR  ****</span>.</p><p>Turning any knob clears the message, but the change is not sent while the panel is still waiting for a reply.</p>`, check:()=>{ const S=cur(); return S && (S.tx&2); }, hint:'Unplug CONTROL, then Continue ▶▶ about five times.'},
  {title:'Done', body:`<p>You've used every knob the v100 firmware reads. <b>Software</b> shows the loop, the encoder state machine and the frame, <b>One second</b> breaks the timing down, and <b>Findings</b> lists what the firmware is really up to — including the leftmost display that is written by accident.</p>`, check:()=>true, auto:true},
];
let lessonIdx=0;
function viewTutorial(m){
  window.__pod23Active = true;
  if (D.variant!=='a'){ D.variant='a'; D.sel=3; }
  m.innerHTML = `<div class="grid2"><div>${card('Tutorial — how an operator used the POD23A', `<ol id="lessons" class="small" style="list-style:none;padding-left:4px;margin:0"></ol>`)}<div class="card" id="lesson"></div></div>
    <div>${card('The unit', `<div id="fp"></div>${controlsHTML()}<div style="margin-top:6px"><button id="nxt2">Continue ▶▶ next second</button></div><div id="rp" style="margin-top:8px"></div>`)}${card('What the firmware did', `<div id="trace" class="log"></div>`)}</div></div>`;
  const draw=()=>{
    emulate();
    m.querySelector('#fp').innerHTML = frontA(SIM.t); bindPanel(m.querySelector('#fp'));
    m.querySelector('#rp').innerHTML = rearSVG(SIM.t); bindPanel(m.querySelector('#rp'));
    const L0=D.log[0]; m.querySelector('#trace').innerHTML = L0 ? `<div><b>${L0.name}</b></div>`+L0.trace.map(s=>`<div>→ ${s}</div>`).join('') : '<div class="muted">Nothing yet.</div>';
    m.querySelector('#lessons').innerHTML = LESSONS.map((l,i)=>`<li style="cursor:pointer;${i===lessonIdx?'font-weight:700;color:var(--accent)':''}" data-i="${i}">${l.title}${i<lessonIdx?' ✓':''}</li>`).join('');
    m.querySelectorAll('#lessons li').forEach(li=> li.onclick=()=>{ lessonIdx=+li.dataset.i; draw(); });
    const L=LESSONS[lessonIdx], ok=L.check();
    m.querySelector('#lesson').innerHTML = `<h2>${L.title}</h2>${L.body}
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${ok?'color-mix(in srgb,var(--accent) 16%,transparent)':'var(--chip)'}">${ok?(L.auto?'Ready.':'✓ Goal reached.'):'◻ Not yet. <span class="muted">Hint: '+(L.hint||'')+'</span>'}</div>
      <div style="display:flex;gap:6px;margin-top:10px"><button id="prv" ${lessonIdx?'':'disabled'}>◀ Back</button><button id="nx" class="${ok?'on':''}" ${lessonIdx<LESSONS.length-1?'':'disabled'}>Next ▶</button><button id="rs">Start over</button></div>`;
    m.querySelector('#prv').onclick=()=>{ lessonIdx=Math.max(0,lessonIdx-1); draw(); };
    m.querySelector('#nx').onclick=()=>{ lessonIdx=Math.min(LESSONS.length-1,lessonIdx+1); draw(); };
    m.querySelector('#rs').onclick=()=>{ D.partner='da305'; D.daAddr=0; loadScenario('idle'); D.log=[]; lessonIdx=0; SIM.seek(0.05); SIM.refresh(); };
  };
  bindControls(m); m.querySelector('#nxt2').onclick=()=>A.next();
  SIM.on('time', draw);
}

/* ---------------- one second, broken down ---------------- */
function viewSecond(m){
  window.__pod23Active = false;
  const up=passTcy({up:true}), lo=passTcy({up:false});
  const rows=[
    ['X1 crystal', 1/FOSC, '4.9152 MHz (nab04 ctl pnl2.bom X1). PIC16F877 executes one instruction per 4 clocks.'],
    ['Instruction (Tcy)', TCY, '813.8 ns'],
    ['Display strobe pulse', TCY, 'One bsf/bcf on RC1–RC3 moves the 74HC138; a ~WR pulse lasts 4 instructions (3 nops)'],
    ['One SLG2016 character write', 13*TCY, 'address macro (2) + movf/movwf (2) + writeN macro (9)'],
    ['UART bit', BIT_T, `9600 Bd: ${FOSC/1e6} MHz / (64 × (SPBRG 7 + 1)) — exact`],
    ['Main-loop pass (lower row)', lo*TCY, `${lo} Tcy, counted by hand (inferred)`],
    ['Main-loop pass (upper row)', up*TCY, `${up} Tcy, counted by hand (inferred)`],
    ['UART byte', BYTE_T, 'start + 8 data + stop'],
    ['One click of a knob', 4*C.EDGE_T, '4 quadrature edges (turning speed inferred); the NEXT table emits one step per click'],
    ['Press accepted', 16*up*TCY, 'debounce: 16 passes with the same non-zero input2'],
    ['Byte pacing', 20*up*TCY, 'timer_uart: time_uart = 20 passes between bytes'],
    ['TMR2IF', C.T2_TICK, 'T2CON = 0x7F: 16 × 16 × 256 Tcy'],
    ['One frame FF ADDR CMD RESP DATA [DATA2] AA', 122*up*TCY, '7 byte slots × 20 passes + the release pass'],
    ['Data-refresh cycle', 2048*up*TCY, 'pole: polecount0 (256) × polecount1 (8) quiet passes, then cycle_data picks the next command'],
    ['Banner', C.BANNER_IT*C.BANNER_IT_TCY*TCY, 'display_version × 256 × 40'],
    ['Time-out to COMM ERR', 2*2816*up*TCY, 'loss_of_com: 2 × 256 × 11 passes waiting for a reply'],
    ['Lower row → upper row', 218*C.T2_TICK, 'display_reset: counter200 = 218 TMR2 ticks with no parameter change (the comment says 5 minutes)'],
    ['All seven parameters re-sent', 7*(2048+122)*up*TCY, 'cycle_data walks Level → Target → Ratio → Range → Threshold → Peak → Output (Delay skipped)'],
  ];
  m.innerHTML = card('One second, broken down — POD23A v100', `<table class="kv"><tr><th>Event</th><th>Duration</th><th>Where it comes from</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td class="mono">${SIM.fmtDur(r[1])}</td><td class="small">${r[2]}</td></tr>`).join('')}</table>`)
   + `<div class="grid2">${card('The frame on the wire at the playhead', `<div id="frm"></div>`)}${card('The main-loop pass, step by step (Tcy, inferred)', `<div id="stp"></div>`)}</div>`
   + card('Encoder decoding: what NEXT does with each sample', `<div id="enc"></div>`);
  const draw=()=>{
    const E=emulate(), t=SIM.t;
    const tx=E.items.filter(i=>i.dir==='tx'); let k=-1; for (let i=0;i<tx.length;i++) if (tx[i].start<=t+0.2) k=i;
    let s=-1; for (let i=k;i>=0;i--) if (tx[i].b===0xFF && tx[i].why==='framing'){ s=i; break; }
    if (s<0) for (let i=0;i<tx.length;i++) if (tx[i].why==='framing'){ s=i; break; }
    if (s<0) m.querySelector('#frm').innerHTML='<p class="muted">No frame in this second. Pick a scenario with a knob turn.</p>';
    else { const fr=[]; for (let i=s;i<tx.length;i++){ fr.push(tx[i]); if (tx[i].b===0xAA && tx[i].why==='termination') break; }
      const rx=E.items.filter(i=>i.dir==='rx' && i.start>fr[fr.length-1].start && i.start<fr[fr.length-1].end+0.02);
      m.querySelector('#frm').innerHTML = `<table class="kv"><tr><th>Byte</th><th>Value</th><th>Sent at</th><th>Meaning</th></tr>${fr.map(b=>`<tr><td class="mono">TX</td><td class="mono">${hex2(b.b)} (${b.b})</td><td class="mono">${SIM.fmtT(b.start)}</td><td class="small">${b.why}</td></tr>`).join('')}
        ${rx.map(b=>`<tr><td class="mono">RX</td><td class="mono">${hex2(b.b)}</td><td class="mono">${SIM.fmtT(b.start)}</td><td class="small">${b.b&0x80?'product ID ('+(b.b===0xC1?'DA305A':'POD22')+')':'address echo'}${b.lost?' — <b style="color:var(--bad)">lost: '+b.lost+'</b>':''}</td></tr>`).join('')}</table>
        <p class="small muted">Seven bytes take ${SIM.fmtDur(fr[fr.length-1].end-fr[0].start)} on a link that could carry them in 7.3 ms: <span class="mono">timer_uart</span> lets one byte out every 20 passes.</p>`; }
    const sp=stepAt(t); const tc=stepTcy({up:sp.p?sp.p.up:true, err:sp.p?sp.p.err:false});
    m.querySelector('#stp').innerHTML = `<table class="kv">${STEPS.map((x,j)=>`<tr class="${j===sp.k?'hl':''}"><td class="mono small">${x[0]}</td><td class="mono">${tc[j]}</td></tr>`).join('')}<tr><th>Total</th><th class="mono">${tc.reduce((a,b)=>a+b,0)} Tcy = ${SIM.fmtDur(tc.reduce((a,b)=>a+b,0)*TCY)}</th></tr></table>`;
    // encoder walk
    const walk=(seq)=>{ let a=0,b=0; return seq.map(code=>{ a&=0xDC; b&=0xDC; const tmp=N5[(code|a)&0x1F]; a=(tmp|(a&0xC0))&255; b=N6[((a&3)|b)&0x1F]; return {code, s5:(a>>2)&7, s6:(b>>2)&7, ev:a&1?'DOWN':a&2?'UP':''}; }); };
    const w=walk([0,2,3,1,0,2,3,1,0,1,3,2,0,1,3,2,0,1,3,2,0]);
    m.querySelector('#enc').innerHTML = `<p class="small">Two clicks clockwise, then three counter-clockwise, sampled once per change. Columns: A/B code → STATE (NEXT5 table) → event.</p>
      <div class="scroll"><table class="kv"><tr><th>AB</th>${w.map(x=>`<td class="mono">${x.code.toString(2).padStart(2,'0')}</td>`).join('')}</tr><tr><th>state</th>${w.map(x=>`<td class="mono">${x.s5}</td>`).join('')}</tr><tr><th>event</th>${w.map(x=>`<td class="mono" style="color:${x.ev?'var(--accent)':'inherit'}">${x.ev||'·'}</td>`).join('')}</tr></table></div>
      <p class="small muted">The first click after a change of direction produces nothing: the table has to pass through its other half first. So turning back costs one click. NEXT6 (the second table) counts steps 0…28 but its result is never used.</p>`;
  };
  SIM.on('time', draw);
}

/* ---------------- block diagram ---------------- */
const BLOCKS = {
  enc:  {x:20, y:30, w:170, h:86, t:'6 encoders E1–E6', s:['CUI, A/B + push','E1 unused in v100'], d:'Six CUI encoders on 1.250 in centres. A/B go straight to the PIC (E2 RA2/RA3, E3 RA0/RA1, E4 RB4/RB5, E5 RC4/RC5, E6 RB0/RB1; E1 RA4/RA5 is wired but its routine is commented out). Each A/B line has a 1 k pull-up and 0.1 µF to ground (R15–R42, C9–C26).'},
  sw:   {x:20, y:150, w:170, h:86, t:'74HC165 U20', s:['6 push switches','read_switches unused'], d:'The six push switches go to a parallel-in shift register clocked by RB6 (CLK) with RB3 as SH/LD and RB7 as data. In v100 read_switches is commented out and SELECT is read directly on RB3 (“Make the modification for switch2 to portb,3”).'},
  mcu:  {x:260, y:100, w:180, h:120, t:'PIC16F877 U5', s:['QFP44, X1 4.9152 MHz','MPASM, 8K words','pages 7–28 used'], d:'All the logic. One main loop: read knobs, update values, rewrite displays 2–6, run the link. No interrupts (the vector at 4 is a bare RETFIE). No EEPROM use in v100: settings are lost at power-off.'},
  dec:  {x:520, y:30, w:180, h:86, t:'74HC138 U1', s:['RC3/RC2/RC1 → Y0…Y5','~WR6 … ~WR1'], d:'Decodes three port bits into six write strobes. G1 is tied high and G2A/G2B low, so one output is always low: whichever display the bits point at is being written. See Findings for what this does to display 1.'},
  disp: {x:520, y:150, w:180, h:86, t:'6 × SLG2016 U6–U11', s:['4 chars 5×7, green','D0–D6 = RD0–RD6','A0/A1 = RE1/RE2'], d:'Intelligent 4-character displays behind a .032 grey chroma filter. Data and address are latched on the rising edge of ~WR. BL and CLR are tied high (nets +5V-D).'},
  rs:   {x:260, y:270, w:180, h:86, t:'75176 U3 (COM1)', s:['half duplex, RC0 = DE/RE','RX → RC7, TX ← RC6'], d:'COM1 transceiver. txuart raises RC0 for the frame and drops it after the last byte so the reply can come back.'},
  rs2:  {x:20, y:270, w:170, h:86, t:'75176 U4 (COM2)', s:['transmit only','DE = RB2, always high'], d:'Second driver on the same TX line. Its receiver output is not connected and RB2 is left high from init, so COM2 is a permanently driven copy of COM1’s transmitter.'},
  con:  {x:520, y:270, w:180, h:86, t:'P2 → CONTROL DB9', s:['COM1 ±, COM2 ±, GND','to DA305A / POD22'], d:'PAN500 header P2 on the board, a DB9 on the rear panel (POD23-M2.dwg). R5/R7 bias COM1. The DB9 pin-out is not in the archive.'},
  pwr:  {x:760, y:100, w:150, h:86, t:'Power', s:['115 VAC, ½ A slow-blow','P1 +5 V, F1 RXE050'], d:'Mains inlet and fuse on the rear (silk text). The internal supply is not in the archive; the board takes +5 V on P1 through polyfuse F1.'},
  icsp: {x:760, y:220, w:150, h:86, t:'H1 ICSP', s:['MCLR, RB6, RB7, RB3','RD7 → P3 (330 Ω)'], d:'2×3 programming header (MPLAB ICD 2 per the workspace). RB3 is also the low-voltage-programming pin. RD7 goes through R2 to P3; the commented “in programming mode?” test used it.'},
};
const WIRES=[['enc','mcu','A/B ×5'],['sw','mcu','SH/CLK/DATA'],['mcu','dec','RC1–RC3'],['dec','disp','~WR1–6'],['mcu','disp','RD0–6, RE1/2'],['mcu','rs','RC6/RC7/RC0'],['mcu','rs2','RC6, RB2'],['rs','con','A/B'],['rs2','con',''],['pwr','mcu','+5 V'],['icsp','mcu','']];
function viewBlock(m){
  window.__pod23Active=false; let sel='mcu';
  m.innerHTML = `<div class="grid2"><div>${card('Block diagram — POD23A (nab04 ctl pnl2, click a block)', `<div id="bd"></div>`)}</div><div>${card('Block', `<div id="bdi"></div>`)}${card('In one sentence', `<p>The <b>PIC</b> reads five knobs and one push button, keeps a set of leveller settings for each of ten addresses, writes them to five displays through a <b>3-to-8 decoder</b>, and trickles them out on <b>RS-485</b> one byte every 20 loop passes.</p><p class="small muted">The ${Y(2003)} POD23 board (POD23iss1) is simpler: PIC16F874, two encoders, two PDSP1884 8-character displays with their own CE lines, two 75176s.</p>`)}</div></div>`;
  const draw=()=>{ const ctr=b=>[b.x+b.w/2,b.y+b.h/2];
    let s=`<svg viewBox="0 0 930 380" style="width:100%"><defs><marker id="p23ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>`;
    WIRES.forEach(([a,b,l])=>{ const A_=BLOCKS[a],B__=BLOCKS[b]; let [x1,y1]=ctr(A_),[x2,y2]=ctr(B__); const clip=(bx,x,y,tx,ty)=>{ const dx=tx-x,dy=ty-y; const sx=dx?(bx.w/2)/Math.abs(dx):1e9, sy=dy?(bx.h/2)/Math.abs(dy):1e9; const k=Math.min(sx,sy); return [x+dx*k,y+dy*k]; };
      [x1,y1]=clip(A_,x1,y1,x2,y2); [x2,y2]=clip(B__,x2,y2,x1,y1); const hot=sel===a||sel===b;
      s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hot?'var(--accent)':'var(--ink2)'}" stroke-width="${hot?2.5:1.3}" marker-end="url(#p23ar)"/>${l?`<text x="${(x1+x2)/2+4}" y="${(y1+y2)/2-4}" font-size="10.5" fill="var(--ink2)">${l}</text>`:''}`; });
    for (const k in BLOCKS){ const b=BLOCKS[k]; s+=`<g data-b="${k}" style="cursor:pointer"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="var(--panel2)" stroke="${sel===k?'var(--accent)':'var(--line)'}" stroke-width="${sel===k?2.5:1.2}"/><text x="${b.x+10}" y="${b.y+20}" font-size="13" font-weight="700" fill="var(--ink)">${b.t}</text>${b.s.map((l,i)=>`<text x="${b.x+10}" y="${b.y+38+i*15}" font-size="11" fill="var(--ink2)">${l}</text>`).join('')}</g>`; }
    m.querySelector('#bd').innerHTML=s+'</svg>'; m.querySelectorAll('[data-b]').forEach(g=>g.onclick=()=>{ sel=g.dataset.b; draw(); });
    const b=BLOCKS[sel]; m.querySelector('#bdi').innerHTML=`<h3>${b.t}</h3><p>${b.d}</p>`; };
  draw();
}

/* ---------------- schematics (redrawn from the netlists) ---------------- */
function chip(x,y,w,name,left,right,sub){
  const n=Math.max(left.length,right.length), h=26+n*18; let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--panel2)" stroke="var(--ink)" stroke-width="1.4"/><text x="${x+w/2}" y="${sub?y-20:y-8}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)">${name}</text>${sub?`<text x="${x+w/2}" y="${y-6}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">${sub}</text>`:''}`;
  left.forEach((p,i)=>{ const yy=y+22+i*18; s+=`<line x1="${x-34}" y1="${yy}" x2="${x}" y2="${yy}" stroke="var(--ink)"/><text x="${x+5}" y="${yy+4}" font-size="10.5" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x-38}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  right.forEach((p,i)=>{ const yy=y+22+i*18; s+=`<line x1="${x+w}" y1="${yy}" x2="${x+w+34}" y2="${yy}" stroke="var(--ink)"/><text x="${x+w-5}" y="${yy+4}" font-size="10.5" text-anchor="end" fill="var(--ink)">${p[0]}</text>${p[1]?`<text x="${x+w+38}" y="${yy+4}" font-size="10.5" fill="var(--accent2)">${p[1]}</text>`:''}`; });
  return s;
}
const SHEETS=[
  {name:'1 · PIC16F877 (POD23A)', note:'Pin numbers are the QFP44 package pins from nab04 ctl pnl2.net (U5). Port names are the PIC16F877 QFP44 pin-out; the firmware names match (input_routine, init.asm).', svg:()=>
    chip(330,40,200,'U5 PIC16F877',[['19 RA0','ENCODER3A'],['20 RA1','ENCODER3B'],['21 RA2','ENCODER2A'],['22 RA3','ENCODER2B'],['23 RA4','ENCODER1A'],['24 RA5','ENCODER1B'],['8 RB0','ENCODER6A'],['9 RB1','ENCODER6B'],['10 RB2','U4_TX/RX'],['11 RB3','SH (+SELECT mod)'],['14 RB4','ENCODER4A'],['15 RB5','ENCODER4B'],['16 RB6','CLK'],['17 RB7','DATA'],['18 MCLR','H1-3, D1'],['30/31 OSC','X1 4.9152'] ],
      [['38–41 RD0–3','D0-M…D3-M'],['2–4 RD4–6','D4-M…D6-M'],['5 RD7','R2 330R → P3'],['26 RE1','A0-M'],['27 RE2','A1-M'],['35 RC1','SWITCHER_C'],['36 RC2','SWITCHER_B'],['37 RC3','SWITCHER_A'],['32 RC0','U3 DE/RE'],['42 RC4','ENCODER5A'],['43 RC5','ENCODER5B'],['44 RC6/TX','U3-4, U4-4'],['1 RC7/RX','U3-1'],['7/28 VDD','+5V'],['6/29 VSS','GNDD']],'QFP44 · MPASM v100 · 4.9152 MHz') },
  {name:'2 · Display bus (74HC138 + SLG2016)', note:'From nab04 ctl pnl2.net: U1 A/B/C = SWITCHER_A/B/C (RC3/RC2/RC1), Y0…Y5 → ~WR6-M…~WR1-M → H4/H3 → U11…U6 pin 1. The ~WR1 rising edges marked red are the ones v100 causes by accident (inferred from the SLG2016 latching on ~WR rising).', svg:()=>{
    let s=chip(90,60,150,'U1 74HC138',[['1 A','RC3'],['2 B','RC2'],['3 C','RC1'],['6 G1','+5V'],['4 G2A','GNDD'],['5 G2B','GNDD']],[['15 Y0','~WR6'],['14 Y1','~WR5'],['13 Y2','~WR4'],['12 Y3','~WR3'],['11 Y4','~WR2'],['10 Y5','~WR1'],['9 Y6','—'],['7 Y7','—']],'3-to-8 decoder');
    for (let k=1;k<=6;k++){ const y=40+(k-1)*62; s+=`<rect x="560" y="${y}" width="150" height="48" fill="var(--panel2)" stroke="var(--ink)"/><text x="635" y="${y+20}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">U${5+k} SLG2016 #${k}</text><text x="635" y="${y+37}" text-anchor="middle" font-size="10.5" fill="var(--ink2)">1 ~WR${k} · 2/3 A · 5–11 D0–D6</text><line x1="520" y1="${y+24}" x2="560" y2="${y+24}" stroke="${k===1?'var(--bad)':'var(--ink)'}"/><text x="515" y="${y+28}" text-anchor="end" font-size="10.5" fill="var(--accent2)">~WR${k}</text>`; }
    s+=`<text x="90" y="300" font-size="11" fill="var(--ink)">writeN macros (init.asm), RC3 RC2 RC1 → Y:</text>`;
    [1,2,3,4,5,6].forEach((k,i)=>{ s+=`<text x="90" y="${320+i*16}" font-size="10.5" font-family="var(--mono)" fill="${k===2||k===5?'var(--bad)':'var(--ink2)'}">write${k}: strobe Y${[5,4,3,2,1,0][i]} → rest on Y${[7,5,7,6,5,7][i]}${k===2||k===5?'  (= ~WR1 low)':''}</text>`; });
    return s; } },
  {name:'3 · Knobs and switches', note:'Each encoder line: 1 k to +5 V and 0.1 µF to ground (R15–R42, C9–C26). The switches go to U20 74HC165 inputs D, C, B, A, G, H (SWITCH1…SWITCH6).', svg:()=>
    chip(120,60,150,'U20 74HC165',[['14 D','SWITCH1'],['13 C','SWITCH2'],['12 B','SWITCH3'],['11 A','SWITCH4'],['5 G','SWITCH5'],['6 H','SWITCH6'],['3/4 E/F','n.c.']],[['1 SH/LD','SH → RB3'],['2 CLK','CLK → RB6'],['9 QH','DATA → RB7'],['15 INH','GNDD']],'shift order H, G, F, E, D, C, B, A')
    + chip(560,60,150,'E1…E6 CUI',[['A','ENCODERnA'],['B','ENCODERnB'],['C','GNDD']],[['SW','SWITCHn'],['SW','GNDD']],'encoder + push')
    + `<text x="120" y="330" font-size="11.5" fill="var(--ink)">v100: read_switches is never called. SELECT (SWITCH2) is wired to RB3 instead, which is also U20's SH/LD net and the</text><text x="120" y="348" font-size="11.5" fill="var(--ink)">PIC's low-voltage-programming pin: it only works with LVP = 0 in the (unrecorded) configuration bits ${'(inferred)'}.</text>` },
  {name:'4 · RS-485 and connectors', note:'U3 is the COM1 transceiver (RE/DE together on RC0). U4 drives COM2 only: its RE/DE net U4_TX/RX goes to RB2 and its RO pin is unconnected. Bias: R7 (+5 V) on A, R5 (GND) on B.', svg:()=>
    chip(140,60,150,'U3 75176 (COM1)',[['1 RO','RC7/RX'],['2 ~RE','RC0'],['3 DE','RC0'],['4 DI','RC6/TX']],[['6 A','P2-1, R7↑'],['7 B','P2-2, R5↓'],['8 VCC','+5V'],['5 GND','GNDD']],'half duplex')
    + chip(140,240,150,'U4 75176 (COM2)',[['1 RO','n.c.'],['2/3 RE/DE','RB2 (high)'],['4 DI','RC6/TX']],[['6 A','P2-3, R8↑'],['7 B','P2-4, R6↓']],'transmit only')
    + chip(580,60,140,'P2 PAN500',[['1','COM1 A'],['2','COM1 B'],['3','COM2 A'],['4','COM2 B'],['5','GNDD']],[['→','rear DB9']],'CONTROL')
    + chip(580,240,140,'H1 ICSP / P1 / P3',[['H1-1','+5V'],['H1-2','RB7'],['H1-3','MCLR'],['H1-4','RB6'],['H1-6','RB3'],['P1-1','F1 → +5V'],['P3-1','R2 → RD7']],[],'') },
  {name:'5 · POD23 (2003) board', note:'POD23iss1.net: PIC16F874 (QFP44), two PDSP1884 8-character displays with separate ~CE and ~FL lines, A0–A4 on RC1–RC5, ~WR = RE2, ~RD = RE1. Both 75176 receivers drive RX; U4 DE = RE0.', svg:()=>
    chip(330,40,200,'U5 PIC16F874',[['19/20 RA0/1','ENCODER1A/B'],['21 RA2','SWITCH1'],['22/23 RA3/4','ENCODER2A/B'],['24 RA5','SWITCH2'],['8 RB0','~RST'],['9 RB1','~CE1'],['10 RB2','~CE2'],['15 RB5','~FL1'],['14 RB4','~FL2']],[['38–41,2–5 RD0–7','D0–D7'],['35–37 RC1–3','A0–A2'],['42/43 RC4/5','A3/A4'],['27 RE2','~WR'],['26 RE1','~RD'],['32 RC0','U3 DE/RE'],['25 RE0','U4 DE/RE'],['44/1','TX / RX']],'POD23iss1, 4.9152 MHz')
    + `<rect x="40" y="300" width="200" height="50" fill="var(--panel2)" stroke="var(--ink)"/><text x="140" y="322" text-anchor="middle" font-size="12" fill="var(--ink)">U1, U2 PDSP1884</text><text x="140" y="338" text-anchor="middle" font-size="10.5" fill="var(--ink2)">8 × 5×7, CE1 / CE2</text>` },
];
function viewSchem(m){
  window.__pod23Active=false; let i=0;
  m.innerHTML = card('Schematic set (redrawn from the P-CAD netlists — not the original drawings)', `<div id="tabs2" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div id="sh" class="scroll"></div><p id="shn" class="small muted"></p>
    <p class="small muted">Originals: <span class="mono">POD23 - #NAB 2004/nab04 ctl pnl2.sch</span> (POD23A) and <span class="mono">POD23 - #PCB/POD23iss1.sch</span> (POD23), both binary P-CAD. These sheets use the net names from the matching <span class="mono">.net</span> files. Blue labels are nets.</p>`);
  const draw=()=>{ m.querySelector('#tabs2').innerHTML = SHEETS.map((s,k)=>`<button class="${k===i?'on':''}" data-i="${k}">${s.name}</button>`).join('');
    m.querySelectorAll('#tabs2 button').forEach(b=>b.onclick=()=>{ i=+b.dataset.i; draw(); });
    m.querySelector('#sh').innerHTML = `<svg viewBox="0 0 900 480" style="width:100%;min-width:680px;background:var(--lane);border:1px solid var(--line);border-radius:8px"><rect x="6" y="6" width="888" height="468" fill="none" stroke="var(--line)"/><text x="884" y="466" text-anchor="end" font-size="10" fill="var(--ink2)">POD23 · sheet ${i+1}/${SHEETS.length} · redrawn ${Y(2026)}</text>${SHEETS[i].svg()}</svg>`;
    m.querySelector('#shn').textContent = SHEETS[i].note; };
  draw();
}

/* ---------------- software ---------------- */
function viewSoft(m){
  window.__pod23Active=true;
  m.innerHTML = `<div class="grid2">${card('Main loop (pod23.asm) — the step running at the playhead is lit', `<div id="flow"></div>`)}
    <div>${card('Menu map: which routine each knob reaches', `<div id="menu"></div>`)}${card('Link state machine (txflags / tx_flags)', `<div id="fsm"></div>`)}</div></div>
    <div class="grid2">${card('The protocol (POD23 PROTOCOLv2.wpd vs. uart.asm)', `<div id="proto"></div>`)}${card('How the knobs did things — knob → code → wire', `<div id="btn"></div>`)}</div>
    ${card('Display bus at the playhead: what each SLG2016 holds', `<div id="bus"></div>`)}`;
  const draw=()=>{
    const t=SIM.t; emulate(); const sp=stepAt(t); const st=stateAt(t); const S=st&&st.S;
    let s=`<svg viewBox="0 0 560 ${STEPS.length*40+70}" style="width:100%"><defs><marker id="p23a2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--ink2)"/></marker></defs>
      <rect x="140" y="6" width="280" height="24" rx="12" fill="var(--chip)" stroke="var(--line)"/><text x="280" y="23" text-anchor="middle" font-size="12" fill="var(--ink)">init → pre_main: display_version (banner)</text>`;
    STEPS.forEach((p,j)=>{ const y=40+j*40, on=sp.k===j;
      s+=`<line x1="280" y1="${y-10}" x2="280" y2="${y}" stroke="var(--ink2)" marker-end="url(#p23a2)"/><rect x="20" y="${y}" width="510" height="30" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/>
        <text x="30" y="${y+13}" font-size="11" font-family="var(--mono)" fill="${on?'#fff':'var(--ink)'}">${p[0].length>70?p[0].slice(0,68)+'…':p[0]}</text><text x="30" y="${y+25}" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${p[2]}</text>`; });
    const yb=40+STEPS.length*40; s+=`<path d="M530 ${yb-24} h18 V36 h-18" fill="none" stroke="var(--ink2)" marker-end="url(#p23a2)"/><text x="20" y="${yb+18}" font-size="11" fill="var(--ink2)">goto main · clrwdt in four places · ${sp.p?'pass #'+sp.p.n:'(not running)'}</text></svg>`;
    m.querySelector('#flow').innerHTML=s;
    const lowr = S && (S.disctl1&1);
    const box=(x,y,t1,t2,on)=>`<rect x="${x}" y="${y}" width="96" height="40" rx="6" fill="${on?'var(--accent)':'var(--panel2)'}" stroke="var(--line)"/><text x="${x+48}" y="${y+16}" text-anchor="middle" font-size="11" font-weight="700" fill="${on?'#fff':'var(--ink)'}">${t1}</text><text x="${x+48}" y="${y+31}" text-anchor="middle" font-size="9.5" fill="${on?'#eef':'var(--ink2)'}">${t2}</text>`;
    let u=`<svg viewBox="0 0 560 170" style="width:100%"><text x="6" y="14" font-size="11" fill="var(--ink2)">upper row (disctl1 = 0)</text>`;
    [['SELECT','address_mode2'],['LEVEL','level_mode1'],['TARGET','target_mode1'],['RATIO','ratio_mode1'],['RANGE','range_mode1']].forEach((b,i)=>u+=box(6+i*110,20,b[0],b[1],S&&!lowr));
    u+=`<text x="6" y="88" font-size="11" fill="var(--ink2)">lower row (disctl1 = 1) — press SELECT</text>`;
    [['PUSH ****','(SELECT ignored)'],['OUTPUT 1','output_mode_dis1'],['OUTPUT 2','output_mode_dis2'],['THRESHOLD','threshold_mode1'],['PEAK LIMIT','peak_mode1']].forEach((b,i)=>u+=box(6+i*110,94,b[0],b[1],S&&lowr));
    u+=`<text x="6" y="160" font-size="10.5" fill="var(--ink2)">TARGET, RATIO, RANGE, THRESHOLD, PEAK need level_enable ≠ 0 (an output set to LV); otherwise “----”.</text></svg>`;
    m.querySelector('#menu').innerHTML=u;
    const fl = S ? [['busy (txflags,3)',S.txflags&8],['waiting (txflags,4)',S.txflags&0x10],['start (txflags,6)',S.txflags&0x40],['re-transmit (txflags,7)',S.txflags&0x80],['COMM ERR (tx,1)',S.tx&2],['handshake (tx,6)',S.tx&0x40]] : [];
    m.querySelector('#fsm').innerHTML = `<svg viewBox="0 0 560 140" style="width:100%">${[['IDLE','pole counts 2048',S&&!(S.txflags&0x18)],['SENDING','7 slots × 20 passes',S&&(S.txflags&8)],['WAIT REPLY','≤ 2 × 2816 passes',S&&(S.txflags&0x10)&&!(S.tx&2)],['COMM ERR','re-send, keep waiting',S&&(S.tx&2)]].map((n,i)=>`<g><circle cx="${70+i*140}" cy="60" r="44" fill="${n[2]?'var(--accent)':'var(--panel2)'}" stroke="var(--line)" stroke-width="2"/><text x="${70+i*140}" y="58" text-anchor="middle" font-size="11.5" font-weight="700" fill="${n[2]?'#fff':'var(--ink)'}">${n[0]}</text><text x="${70+i*140}" y="74" text-anchor="middle" font-size="9" fill="${n[2]?'#fff':'var(--ink2)'}">${n[1]}</text></g>`).join('')}
      ${[0,1,2].map(i=>`<line x1="${114+i*140}" y1="60" x2="${166+i*140}" y2="60" stroke="var(--ink2)" marker-end="url(#p23a2)"/>`).join('')}
      <text x="10" y="128" font-size="10.5" fill="var(--ink2)">A knob click → SENDING with RESP = 01 (no reply) → IDLE. A cycle_data refresh → RESP = 00 → WAIT REPLY.</text></svg>
      <div class="small mono">${fl.map(f=>`<span class="chip" style="${f[1]?'background:var(--accent);color:#fff':''}">${f[0]}</span>`).join('')}</div>`;
    m.querySelector('#proto').innerHTML = `<table class="kv"><tr><th>Slot</th><th>Document (Mar ${Y(2004)})</th><th>v100 code</th></tr>
      <tr><td>1</td><td>Framing FF</td><td class="mono">txuart: movlw 255</td></tr>
      <tr><td>2</td><td>Address 1–10, 129 = all</td><td class="mono">address_2 = 0…9 <span style="color:var(--bad)">(A1 sends 0)</span>; the all-call entry b'10000001' is unreachable</td></tr>
      <tr><td>3</td><td>Command 0 Level, 1 Delay, 2 Target, 3 Ratio, 4 Range, 5 Threshold, 6 Peak, 7 Output</td><td class="mono">command1; Delay (1) is skipped by cycle_data and delay_byte is commented out</td></tr>
      <tr><td>4</td><td>Response 1 = none, 0 = handshake</td><td class="mono">tx,6 ? 00 : 01</td></tr>
      <tr><td>5</td><td>Data 1</td><td class="mono">level 165–225 · target 86–30 · ratio 0…234 · range 4–48 · threshold 140–80 · peak 24–0 · output1 0–3</td></tr>
      <tr><td>6</td><td>Data 2 (output only)</td><td class="mono">output2, only when tx_command = 7 (else the slot passes empty)</td></tr>
      <tr><td>7</td><td>Termination AA</td><td class="mono">movlw 0xAA — the same value as ratio 1:3 (170)</td></tr>
      <tr><td>reply</td><td>Product ID (POD22 81, DA305A C1), then address</td><td class="mono">scanuart: bit 7 set → uart0; clear → uart1; processdata compares uart1 with address_2</td></tr></table>`;
    m.querySelector('#btn').innerHTML = `<table class="kv"><tr><th>Operator</th><th>Firmware path</th><th>On the wire</th></tr>
      <tr><td>Turn SELECT</td><td class="mono small">encoder_routine2 → address_mode2 → address_table</td><td class="small">Next frame carries the new address byte with the same command</td></tr>
      <tr><td>Press SELECT</td><td class="mono small">RB3 → debounce (16 passes) → knob_setup → disctl1 ^= 1</td><td class="small">txflags,0: a frame is sent; whether it asks for a reply depends on tx,6 left by the last frame</td></tr>
      <tr><td>Turn LEVEL / TARGET / RATIO / RANGE</td><td class="mono small">encoder_routine3–6 → *_mode1 → *_address (store per A-number) → *_dis1</td><td class="small">command1 = 0/2/3/4, RESP 01, data byte from the table</td></tr>
      <tr><td>Turn OUTPUT 1 / 2</td><td class="mono small">output_mode_dis1/2 → source_set → pb_st/mn/tn/lv → source1/2_address</td><td class="small">command 7 with output1 and output2</td></tr>
      <tr><td>Turn THRESHOLD / PEAK</td><td class="mono small">threshold_mode1 / peak_mode1</td><td class="small">command 5 / 6</td></tr>
      <tr><td>Leave it alone</td><td class="mono small">pole → cycle_data → settxdata</td><td class="small">every ≈1.6 s the next command, RESP 00, reply expected</td></tr></table>`;
    const r=ramAt(t);
    m.querySelector('#bus').innerHTML = S ? `<table class="kv"><tr><th>Display</th>${[1,2,3,4,5,6].map(k=>`<th>${k}</th>`).join('')}</tr><tr><td>dis registers (firmware)</td><td class="mono">— (display1 never called)</td>${[2,3,4,5,6].map(k=>`<td class="mono">“${S.dis[k].map(c=>String.fromCharCode(c)).join('').replace(/ /g,'&nbsp;')}”</td>`).join('')}</tr>
      <tr><td>SLG2016 RAM (what you see)</td>${[1,2,3,4,5,6].map(k=>`<td class="mono" style="${k===1?'color:var(--bad)':''}">“${(r[k]||'').replace(/ /g,'&nbsp;')}”</td>`).join('')}</tr></table>
      <p class="small muted">Display 1 is filled by ~WR1 rising edges that happen when write2 and write5 leave the decoder on Y5 and the next bit change moves it off. With the emulated bus it ends up holding display 5's first three characters and display 6's last one (${inf}: assumes the SLG2016 latches on the rising edge of ~WR, as its data sheet describes).</p>` : '<p class="muted">Not running at the playhead.</p>';
  };
  SIM.on('time', draw);
}

/* ---------------- findings ---------------- */
function viewNotes(m){
  window.__pod23Active=false;
  m.innerHTML = card('What the POD23 / POD23A firmware is up to — findings', `<ol>
    <li><b>Artwork 2026|59: front/rear panels now from ${SIM.src(ART_V2,'POD23-SilkV2.cdr')} (15 Mar 2004|37, POD23A) and ${SIM.src(ART_V1,'POD23-Silk.cdr')} (17 Mar 2003|36, POD23), as vectors.</b> Neither has a 2014 curve redraw or a photo. V2 draws the six display windows (96 × 39 px at 96 dpi = 25.5 × 10.3 mm) and Ø 16 mm knob holes, now shown as cut-outs with the SLG2016s and encoders sitting in them, plus six 120 × 147 px cell outlines (31.8 × 38.9 mm, one per 1.250 in pitch, matching “5 PITCHES @ 1.250 CENTRES”) left out here as they look like the chroma-filter sections rather than ink (${inf}). V2 has two identical copies of the front and only the green top bar of a third, parked below the sheet; it is used as the POD23A green plate (${inf}). The leftmost cell has a window and a knob hole but no legend, which fits display 1 never being driven. Text is live Arial that libcdr anchors wrongly, so every legend was re-centred on its cell; the rear copies in both files are identical.</li>
    <li><b>The leftmost display is written by accident.</b> v100 comments out <span class="mono">encoder_routine1</span> and never calls <span class="mono">display1</span>, but cell 1 still has an SLG2016 (U6) and a knob (E1) on the board and the silk. The <span class="mono">write2</span> and <span class="mono">write5</span> macros (init.asm) end with RC3/RC2/RC1 = 1/0/1, which the 74HC138 decodes as Y5 = <span class="mono">~WR1</span>. The next bit change pulls ~WR1 high and latches whatever is on PORTD into display 1. In the emulated bus, display 1 ends every pass holding display 5's first three characters and display 6's last one: “ 230” during the banner, “----” with the leveller off, “1:4 ” or “ -6 ” later, “ERR*” with COMM ERR ${inf}.</li>
    <li><b>The serial link is throttled to about 11 frames a second.</b> <span class="mono">timer_uart</span> lets <span class="mono">txuart</span> send one byte every 20 main-loop passes (≈15.8 ms), so a 6- or 7-byte frame takes ≈95 ms on a 9600-baud line that could carry it in 7 ms. Several clicks made while a frame is going out are merged: the next frame carries only the latest value.</li>
    <li><b>The address on the wire is one less than on the display.</b> <span class="mono">address_2</span> = 0…9 for A1…A10 (<span class="mono">address_table</span>). The protocol document says addresses run 1–10 with 129 as an all-call. The all-call value (b'10000001') is the 11th table entry and cannot be reached: <span class="mono">address_mode2</span> wraps at 9.</li>
    <li><b>The frame is not the “2-byte protocol” the READMEs mention.</b> v100 sends <span class="mono">FF ADDR CMD RESP DATA [DATA2] AA</span> (POD23 PROTOCOLv2.wpd); only the reply is 2 bytes. The <i>preliminary</i> document has no RESP byte.</li>
    <li><b>The archived receivers do not speak this protocol.</b> <span class="mono">POD23Com/Da305rev/uart305.asm</span> (Jan ${Y(2003)}) and <span class="mono">POD23Com/POD22/uart.asm</span> expect <span class="mono">FF ADDR CMD DATA</span> with 0 = stereo level, 1 = left, 2 = right, 3 = delay, 4 = target …. Fed a v100 frame, the DA305 would take the RESP byte as the level. The DA305A firmware that matches POD23A v100 is not in the archive; this simulator's DA305A follows the protocol document (${inf}).</li>
    <li><b>The 2003 POD23 is the other way round, and its master is archived.</b> Corrected 2026|59: the POD22 poller this plugin could not find is <span class="mono">XXX - POD22 - #Master # Obsolte/POD22 - #Engineering/Software/554265/pod22v1.asm</span> (+ <span class="mono">uart.asm</span>; “Pod 22 communicating with 2 POD23s”, Nov ${Y(2004)}) (see pod22.js). It fits the #554265 POD23 byte for byte: the POD22 sends <span class="mono">F0</span>/<span class="mono">F1</span> (+2 AES lock, +8 update), then the placeholders 0, 1, 2; the POD23 checks for exactly those and answers each with its address (+8 if a knob moved), level1, level2 and disctl1. The POD22 clamps the levels to 165–225 and copies them to the SHARC trims. The 2003 link lanes now follow that code. The archived <span class="mono">pod22v2.asm</span> (Mar ${Y(2003)}) is a slave that waits for <span class="mono">FF</span> frames, so the README's guess that it is the partner does not hold.</li>
    <li><b>The two 2003 panels mirror each other.</b> When one POD23 reports a change (header +8), <span class="mono">txuart4</span> sets <span class="mono">activity_flag,0</span> and the POD22's next exchange — with the <i>other</i> POD23 — is an update frame carrying the new levels and display mode. A missing panel costs a 256-pass <span class="mono">loss_of_com</span> wait (≈${SIM.fmtDur(TO22)}, ${inf}) on every cycle and is flagged for an update when it returns.</li>
    <li><b>The 2003 link only works with a different POD22 crystal.</b> pod22v1 changes SPBRG from 13 to 12. On the standard POD22 clock (8.6016 MHz, where 13 gives 9600) that is 10,338 baud, 7.7 % fast against the POD23's exact 9600 (4.9152 MHz, SPBRG 7): too far for a UART. With an 8 MHz crystal SPBRG 12 gives 9615 baud, so the custom POD22 probably had one (${inf}).</li>
    <li><b>Wrong output byte for “TN / ST”.</b> In <span class="mono">output.asm</span>, <span class="mono">tone_1_stereo_2</span> sets <span class="mono">output2 = 1</span> (mono) while the display shows OUTPUT 2 = ST. Every other combination sends what it shows.</li>
    <li><b>Values sent for the wrong unit.</b> <span class="mono">threshold1</span>, <span class="mono">peak1</span>, <span class="mono">output1</span> and <span class="mono">output2</span> are only recalculated while the lower row is on screen; <span class="mono">level1</span>, <span class="mono">target1</span>, <span class="mono">ratio1</span> and <span class="mono">range1</span> only while the upper row is. Change SELECT to another A-number on the upper row and the background refresh (<span class="mono">cycle_data</span>) sends that unit the previous unit's threshold, peak limit and output modes until you visit the lower row.</li>
    <li><b>OUTPUT knobs remember the wrong position.</b> <span class="mono">source_mode</span> / <span class="mono">source_mode2</span> are stored per address (<span class="mono">source1_temp1…10</span>) but never recalled. After changing address, the next OUTPUT click steps from the last unit's position, not from what the display shows.</li>
    <li><b>“5 minutes” is 11.6 seconds.</b> The comment over <span class="mono">display_reset</span> says the lower row returns after five minutes. <span class="mono">counter_5min = 100</span> is defined but unused; the code counts <span class="mono">counter_200 = 218</span> TMR2 periods of 53.3 ms with <span class="mono">counter_5 = 1</span>. Only parameter changes reset it, not the push, so pressing SELECT more than ~11 s after the last change drops you back almost at once (scenario “Lower row times out”).</li>
    <li><b>COMM ERR, not NO COM.</b> The header comment of <span class="mono">pod23.asm</span> describes COM1/COM2 scanning every address and showing “NO COM”. v100 talks only to the selected address and shows <span class="mono">**** COMM ERR  ****</span> after two 2816-pass time-outs. While it waits, knob changes are shown but not sent.</li>
    <li><b>COM2 is always transmitting.</b> U4's driver enable is RB2, set high by <span class="mono">init</span> and never cleared (the <span class="mono">bsf/bcf portb,2</span> lines in txuart are commented out), and its receiver is unconnected. COM2 is a permanent copy of the TX line.</li>
    <li><b>A hardware bodge on RB3.</b> “Make the modification for switch2 to portb,3”: <span class="mono">read_switches</span> (74HC165) is commented out and only SELECT is read, from RB3 — the 165's SH/LD net and the PIC's LVP pin. The other five push switches are wired but dead, so the silk's “PUSH” works on one knob only. It also needs LVP = 0 in configuration bits nobody recorded.</li>
    <li><b>The project file has the wrong clock.</b> <span class="mono">encpbb-88.pjt</span> says 4 MHz; the board has a 4.9152 MHz crystal, which is what makes <span class="mono">SPBRG = 7</span> come out at exactly 9600 baud (at 4 MHz it would be 7812 baud).</li>
    <li><b>Leftovers.</b> <span class="mono">mode.asm</span> (2363 lines) and <span class="mono">delay.asm</span> are in the v100 folder but not included. The include for the threshold module uses the 8.3 name <span class="mono">thresh~1.asm</span>. <span class="mono">init</span>'s PORTB comment (“rs, ce1, ce2, com, fl2, fl1”) describes the 2003 PDSP1884 board. <span class="mono">pod23.err</span> holds only “Crossing page boundary” messages. Encoder 6 alone does not clear <span class="mono">tx,7</span>. The R&amp;D Nov 09 copy differs only in the banner.</li>
    <li><b>Turning back costs a click.</b> The NEXT state table emits one step per quadrature cycle, but the first cycle after a change of direction is swallowed (scenario “LEVEL up 3, then down 3”). The second table (NEXT6) is computed every pass and never used.</li>
    <li><b>Ratio 1:3 is sent as AA.</b> <span class="mono">ratio_table1</span> gives 170 = 0xAA for 1:3, the same value as the terminator. A receiver that scans for AA instead of counting bytes would cut that frame short (${inf}: the matching DA305A parser is not archived).</li>
    <li><b>Two silks, two products.</b> <span class="mono">POD23-Silk.cdr</span> (17 Mar ${Y(2003)}) is the two-window “POD-23 CONTROL PANEL” with the green bar; <span class="mono">POD23-SilkV2.cdr</span> (15 Mar ${Y(2004)}) is the six-cell POD23A with white ink only. Both share one rear: CONTROL, 115 VAC ½ A.S.B., DISCONNECT POWER BEFORE SERVICING.</li>
  </ol>`) + card('Assumptions in this simulation', `<ul class="small">
    <li>Main-loop pass ≈ ${(passTcy({up:true})*TCY*1e3).toFixed(2)} ms (upper row) / ${(passTcy({up:false})*TCY*1e3).toFixed(2)} ms (lower row): counted by hand from the source, ±20 % (${inf}). Every link and time-out figure scales with it.</li>
    <li>A click = 4 quadrature edges 5 ms apart; detent rest at A = B = 0; clockwise = A leads (${inf}).</li>
    <li>DA305A / POD22 reply 3 ms after AA, per the v2 protocol document (${inf}: their firmware for this frame is not archived).</li>
    <li>Configuration bits are not in the source: no power-up timer, LVP off (${inf}). SLG2016 RAM starts blank (it really powers up random; CLR is tied high).</li>
    <li>Panel colours: black (“EXTRA FINE TEXTURED WBS BLACK”), green and white inks as on the other POD panels; there is no photo of a POD23 (${inf}). Display and knob positions on the 2003 panel and the rear connectors are placed under their silk labels (${inf}).</li>
    <li>The 2003 POD23 (#554265) is modelled at the state level. Its link follows pod22v1.asm: one byte pair every 5 POD22 passes, POD22 pass ≈ 1.32 ms (pod22.js estimate), POD23 reply ≈ 0.6 ms after each byte (${inf}).</li></ul>`)
  + card('Sources', `<ul class="small mono">
    <li>#POD #SERIES/POD23 - #Engineering/POD23 - #Software/POD23A - #SOFTWARE #POD23A/POD23 - #SOFTWARE #POD23A #v100/*.asm, encpbb-88.pjt, pod23.err</li>
    <li>…/POD23 - #SOFTWARE #554265/*.asm, Project 554265 Instructions.doc · …/POD23 - #SOFTWARE #working/POD23Com/Da305rev, POD22</li>
    <li>../XXX - POD22 - #Master # Obsolte/POD22 - #Engineering/Software/554265/pod22v1.asm, uart.asm, init.asm (the POD22 master for #554265)</li>
    <li>…/POD23 PROTOCOLv2.wpd, POD23 PROTOCOL.wpd · …/POD23 - #NAB 2004/nab04 ctl pnl2.net, .bom · …/POD23 - #PCB/POD23iss1.net, .bom</li>
    <li>${SIM.src(ART_V1,'POD23-Silk.cdr')}, ${SIM.src(ART_V2,'POD23-SilkV2.cdr')} → assets/pod23-front.svg, pod23-a-front.svg, pod23-rear.svg · …/POD23 - #MECHANICAL, #Poduction Assembly (.dwg text)</li></ul>`);
}

/* ---------------- register ---------------- */
SIM.register({
  footnotes:[{"text": "POD23-SilkV2.cdr draws six display windows of 25.5 × 10.3 mm and six Ø 16 mm knob holes for the POD23A.", "src": "#POD #SERIES/POD23 - #Engineering/POD23 - #SILK/POD23-SilkV2.cdr"}, {"text": "V2 also draws six 31.8 × 38.9 mm cell outlines on a 1.250 in pitch, matching “5 PITCHES @ 1.250 CENTRES”; they look like chroma-filter sections, not ink (inferred).", "src": "#POD #SERIES/POD23 - #Engineering/POD23 - #SILK/POD23-SilkV2.cdr"}, {"text": "The leftmost POD23A cell has a window and a knob hole but no legend, which fits display 1 never being driven by v100.", "src": "#POD #SERIES/POD23 - #Engineering/POD23 - #SILK/POD23-SilkV2.cdr"}, {"text": "V2 holds two identical copies of the front and only the green top bar of a third, parked below the sheet.", "src": "#POD #SERIES/POD23 - #Engineering/POD23 - #SILK/POD23-SilkV2.cdr"}, {"text": "The rear copies in POD23-Silk.cdr (2003) and POD23-SilkV2.cdr (2004) are identical.", "src": "#POD #SERIES/POD23 - #Engineering/POD23 - #SILK/POD23-Silk.cdr"}, {"text": "Both files use live Arial text that libcdr anchors wrongly; every legend was re-centred on its cell.", "src": "#POD #SERIES/POD23 - #Engineering/POD23 - #SILK/POD23-Silk.cdr"}, {"text": "On the 2003 front the green window frames leave a gap at the bottom edge where the white “CONTROL 1” / “CONTROL 2” legends sit.", "src": "#POD #SERIES/POD23 - #Engineering/POD23 - #SILK/POD23-Silk.cdr"}],
  id:'pod23', name:'POD23 · leveller remote control panel for DA305A / POD22 ('+Y(2004)+')', duration:1,
  product:'POD23', year:2004, family:'POD series',
  folder:'#POD #SERIES/POD23 - #Engineering',
  summary:'Half-rack remote panel with no audio inside: six push-and-turn knobs and 4-character SLG2016 displays set level, target, ratio, range, threshold, peak limit and output modes on up to ten DA305A leveller DAs over RS-485. The POD23A v100 firmware (PIC16F877) is emulated pass by pass, with its display bus, its 9600-baud frames and a replying DA305A; the 2003 two-knob POD23 for the POD22 meter is modelled too.',
  highlights:['PIC16F877 firmware emulated pass by pass with its own variables and encoder state tables','Real 2003 and 2004 silkscreens, converted from CorelDRAW','Frames on the wire byte by byte, down to the bit','A display written by decoder glitches, and seven other firmware bugs','8-step operator tutorial built from the silk and the protocol document'],
  depth:'Full model',
  stepUnits:[
    {label:'1 main-loop pass (≈0.79 ms)', period:()=>passTcy({up:true})*TCY},
    {label:'1 UART bit (104.2 µs)', period:()=>BIT_T},
    {label:'1 UART byte (1.042 ms)', period:()=>BYTE_T},
    {label:'1 byte slot (20 passes)', period:()=>20*passTcy({up:true})*TCY},
    {label:'1 TMR2 tick (53.3 ms)', period:()=>C.T2_TICK},
    {label:'1 Tcy (813.8 ns)', period:()=>TCY},
    {label:'10 ms', period:()=>0.01},
    {label:'100 ms', period:()=>0.1},
  ],
  zooms:[[1,'1 s (whole second)'],[0.2,'200 ms (two frames)'],[0.1,'100 ms (one frame)'],[0.02,'20 ms (one byte slot)'],[0.004,'4 ms (a few passes)'],[0.0012,'1.2 ms (one byte, bit level)'],[0.0008,'800 µs (one pass)'],[0.00006,'60 µs (display strobes)']],
  defaultZoom:0,
  init(){ EMU_KEY=''; },
  tabs:[
    {id:'sim', label:'Simulator', render:viewSim},
    {id:'tutorial', label:'Tutorial: using the POD23A', render:viewTutorial},
    {id:'second', label:'One second, broken down', render:viewSecond},
    {id:'block', label:'Block diagram', render:viewBlock},
    {id:'schematic', label:'Schematics', render:viewSchem},
    {id:'software', label:'Software', render:viewSoft},
    {id:'findings', label:'Findings', render:viewNotes},
  ],
});
})();
